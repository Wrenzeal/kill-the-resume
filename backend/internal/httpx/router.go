package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"kill-the-resume/backend/internal/auth"
	"kill-the-resume/backend/internal/config"
	"kill-the-resume/backend/internal/jobradar"
	"kill-the-resume/backend/internal/models"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const userIDContextKey = "userID"

type Server struct {
	db              *gorm.DB
	auth            auth.Service
	loginLimiter    *rateLimiter
	registerLimiter *rateLimiter
	jobRadar        *jobradar.Service
}

type publicUser struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type authResponse struct {
	Token string     `json:"token"`
	User  publicUser `json:"user"`
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type resumeRequest struct {
	Title      string          `json:"title"`
	TargetRole string          `json:"targetRole"`
	Content    json.RawMessage `json:"content"`
}

type updateResumeRequest struct {
	Title      *string         `json:"title"`
	TargetRole *string         `json:"targetRole"`
	Content    json.RawMessage `json:"content"`
}

type resumeListItem struct {
	ID         uuid.UUID `json:"id"`
	Title      string    `json:"title"`
	TargetRole string    `json:"targetRole"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func NewRouter(cfg config.Config, database *gorm.DB) *gin.Engine {
	if cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	_ = router.SetTrustedProxies(nil)
	router.Use(gin.Logger(), gin.Recovery(), securityHeadersMiddleware(cfg), requestBodyGuardMiddleware(cfg.MaxBodyBytes))
	router.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowWildcard:    true,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	var radarService *jobradar.Service
	if database != nil {
		radarService = jobradar.NewService(
			jobradar.NewRepository(database),
			jobradar.NewRemotiveClient(cfg.JobRadarSourceURL, cfg.JobRadarHTTPTimeout),
			jobradar.ServiceConfig{
				SyncEnabled:  cfg.JobRadarSyncEnabled,
				SyncInterval: cfg.JobRadarSyncInterval,
				MaxResults:   cfg.JobRadarMaxResults,
			},
		)
	}

	server := &Server{
		db:              database,
		auth:            auth.NewService(cfg.JWTSecret, cfg.JWTTTL, cfg.JWTIssuer, cfg.JWTAudience),
		loginLimiter:    newRateLimiter(cfg.AuthRateLimitMax, cfg.AuthRateLimitWindow),
		registerLimiter: newRateLimiter(cfg.AuthRateLimitMax, cfg.AuthRateLimitWindow),
		jobRadar:        radarService,
	}

	router.GET("/healthz", server.healthz)
	router.GET("/assets/fonts/:name", server.fontAsset)
	router.HEAD("/assets/fonts/:name", server.fontAsset)

	api := router.Group("/api/v1")
	api.POST("/auth/register", server.register)
	api.POST("/auth/login", server.login)
	api.GET("/job-radar/jobs", server.listJobRadarJobs)

	authed := api.Group("")
	authed.Use(server.authMiddleware)
	authed.GET("/me", server.me)
	authed.GET("/job-radar/preferences", server.getJobRadarPreference)
	authed.PUT("/job-radar/preferences", server.saveJobRadarPreference)
	authed.GET("/resumes", server.listResumes)
	authed.POST("/resumes", server.createResume)
	authed.GET("/resumes/:id", server.getResume)
	authed.PUT("/resumes/:id", server.updateResume)
	authed.DELETE("/resumes/:id", server.deleteResume)

	return router
}

var allowedFontFiles = map[string]struct{}{
	"ktr-paper-sans.ttf":      {},
	"ktr-paper-sans-bold.ttf": {},
	"ktr-paper-mono.ttf":      {},
	"ktr-paper-mono-bold.ttf": {},
	"ktr-paper-cjk.ttf":       {},
}

func (s *Server) fontAsset(c *gin.Context) {
	name := filepath.Base(c.Param("name"))
	if _, ok := allowedFontFiles[name]; !ok {
		writeError(c, http.StatusNotFound, "font not found")
		return
	}

	for _, dir := range fontSearchDirs() {
		bytes, err := os.ReadFile(filepath.Join(dir, name))
		if err == nil {
			c.Header("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
			c.Data(http.StatusOK, "font/ttf", bytes)
			return
		}
	}

	writeError(c, http.StatusNotFound, "font not found")
}

func fontSearchDirs() []string {
	dirs := []string{}
	if fontDir := strings.TrimSpace(os.Getenv("FONT_DIR")); fontDir != "" {
		dirs = append(dirs, fontDir)
	}
	cwd, err := os.Getwd()
	if err != nil {
		return dirs
	}
	return append(dirs,
		filepath.Join(cwd, "web", "public", "fonts"),
		filepath.Join(cwd, "..", "web", "public", "fonts"),
	)
}

func (s *Server) healthz(c *gin.Context) {
	sqlDB, err := s.db.DB()
	if err != nil || sqlDB.PingContext(c.Request.Context()) != nil {
		writeError(c, http.StatusServiceUnavailable, "database unavailable")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (s *Server) register(c *gin.Context) {
	var req registerRequest
	if !bindJSON(c, &req) {
		return
	}

	email := normalizeEmail(req.Email)
	password := req.Password
	displayName := strings.TrimSpace(req.DisplayName)
	limitKeys := authRateLimitKeys("register", c, email)
	if allowed, retryAfter := allowAuthAttempt(s.registerLimiter, limitKeys); !allowed {
		c.Header("Retry-After", retryAfterSeconds(retryAfter))
		auditAuth("register", c, email, "rate_limited")
		writeError(c, http.StatusTooManyRequests, "too many authentication attempts")
		return
	}
	if !validateEmailForAuth(email) {
		auditAuth("register", c, email, "invalid_email")
		writeError(c, http.StatusBadRequest, "email is invalid")
		return
	}
	if err := validatePasswordForStorage(password); err != nil {
		auditAuth("register", c, email, "weak_password")
		writeError(c, http.StatusBadRequest, err.Error())
		return
	}
	if displayName == "" {
		displayName = strings.Split(email, "@")[0]
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to protect password")
		return
	}

	user := models.User{Email: email, DisplayName: displayName, PasswordHash: hash}
	if err := s.db.Create(&user).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			auditAuth("register", c, email, "duplicate")
			writeError(c, http.StatusConflict, "email already registered")
			return
		}
		writeError(c, http.StatusInternalServerError, "failed to create user")
		return
	}

	resetAuthIdentityAttempts(s.registerLimiter, limitKeys)
	auditAuth("register", c, email, "success")
	s.respondWithToken(c, http.StatusCreated, user)
}

func (s *Server) login(c *gin.Context) {
	var req loginRequest
	if !bindJSON(c, &req) {
		return
	}

	email := normalizeEmail(req.Email)
	limitKeys := authRateLimitKeys("login", c, email)
	if allowed, retryAfter := allowAuthAttempt(s.loginLimiter, limitKeys); !allowed {
		c.Header("Retry-After", retryAfterSeconds(retryAfter))
		auditAuth("login", c, email, "rate_limited")
		writeError(c, http.StatusTooManyRequests, "too many authentication attempts")
		return
	}

	if !validateEmailForAuth(email) || req.Password == "" || len([]byte(req.Password)) > maxPasswordBytes {
		auth.CheckPassword(dummyPasswordHash, dummyPasswordProbe)
		auditAuth("login", c, email, "invalid")
		writeError(c, http.StatusUnauthorized, loginFailureMessage)
		return
	}

	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			auth.CheckPassword(dummyPasswordHash, dummyPasswordProbe)
			auditAuth("login", c, email, "failure")
			writeError(c, http.StatusUnauthorized, loginFailureMessage)
			return
		}
		writeError(c, http.StatusInternalServerError, "failed to load user")
		return
	}
	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		auditAuth("login", c, email, "failure")
		writeError(c, http.StatusUnauthorized, loginFailureMessage)
		return
	}

	resetAuthIdentityAttempts(s.loginLimiter, limitKeys)
	auditAuth("login", c, email, "success")
	s.respondWithToken(c, http.StatusOK, user)
}

func (s *Server) me(c *gin.Context) {
	user, ok := s.loadCurrentUser(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toPublicUser(user)})
}

func (s *Server) listResumes(c *gin.Context) {
	userID := currentUserID(c)
	var resumes []models.Resume
	if err := s.db.Where("user_id = ?", userID).Order("updated_at DESC").Find(&resumes).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to list resumes")
		return
	}

	items := make([]resumeListItem, 0, len(resumes))
	for _, resume := range resumes {
		items = append(items, resumeListItem{
			ID:         resume.ID,
			Title:      resume.Title,
			TargetRole: resume.TargetRole,
			CreatedAt:  resume.CreatedAt,
			UpdatedAt:  resume.UpdatedAt,
		})
	}
	c.JSON(http.StatusOK, gin.H{"resumes": items})
}

func (s *Server) createResume(c *gin.Context) {
	var req resumeRequest
	if !bindJSON(c, &req) {
		return
	}

	content, ok := normalizeContent(c, req.Content)
	if !ok {
		return
	}

	resume := models.Resume{
		UserID:     currentUserID(c),
		Title:      normalizeTitle(req.Title),
		TargetRole: strings.TrimSpace(req.TargetRole),
		Content:    content,
	}
	if err := s.db.Create(&resume).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to create resume")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"resume": resume})
}

func (s *Server) getResume(c *gin.Context) {
	resume, ok := s.loadCurrentUserResume(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"resume": resume})
}

func (s *Server) updateResume(c *gin.Context) {
	resume, ok := s.loadCurrentUserResume(c)
	if !ok {
		return
	}

	var req updateResumeRequest
	if !bindJSON(c, &req) {
		return
	}

	updates := map[string]any{}
	if req.Title != nil {
		updates["title"] = normalizeTitle(*req.Title)
	}
	if req.TargetRole != nil {
		updates["target_role"] = strings.TrimSpace(*req.TargetRole)
	}
	if len(req.Content) > 0 {
		content, ok := normalizeContent(c, req.Content)
		if !ok {
			return
		}
		updates["content"] = content
	}
	if len(updates) == 0 {
		c.JSON(http.StatusOK, gin.H{"resume": resume})
		return
	}

	if err := s.db.Model(&resume).Updates(updates).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to update resume")
		return
	}
	if err := s.db.First(&resume, "id = ? AND user_id = ?", resume.ID, currentUserID(c)).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to reload resume")
		return
	}
	c.JSON(http.StatusOK, gin.H{"resume": resume})
}

func (s *Server) deleteResume(c *gin.Context) {
	resume, ok := s.loadCurrentUserResume(c)
	if !ok {
		return
	}
	if err := s.db.Delete(&resume).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to delete resume")
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *Server) respondWithToken(c *gin.Context, status int, user models.User) {
	token, err := s.auth.Issue(user.ID)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to issue token")
		return
	}
	c.JSON(status, authResponse{Token: token, User: toPublicUser(user)})
}

func (s *Server) authMiddleware(c *gin.Context) {
	header := strings.TrimSpace(c.GetHeader("Authorization"))
	prefix := "Bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		auditAuth("bearer", c, "", "missing")
		c.Header("WWW-Authenticate", `Bearer realm="kill-the-resume"`)
		writeError(c, http.StatusUnauthorized, "authentication required")
		c.Abort()
		return
	}
	token := strings.TrimSpace(header[len(prefix):])
	userID, err := s.auth.Parse(token)
	if err != nil {
		auditAuth("bearer", c, "", "invalid")
		c.Header("WWW-Authenticate", `Bearer realm="kill-the-resume", error="invalid_token"`)
		writeError(c, http.StatusUnauthorized, "authentication required")
		c.Abort()
		return
	}
	c.Set(userIDContextKey, userID)
	c.Next()
}

func (s *Server) loadCurrentUser(c *gin.Context) (models.User, bool) {
	var user models.User
	if err := s.db.First(&user, "id = ?", currentUserID(c)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(c, http.StatusUnauthorized, "user no longer exists")
			return user, false
		}
		writeError(c, http.StatusInternalServerError, "failed to load user")
		return user, false
	}
	return user, true
}

func (s *Server) loadCurrentUserResume(c *gin.Context) (models.Resume, bool) {
	resumeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		writeError(c, http.StatusBadRequest, "resume id is invalid")
		return models.Resume{}, false
	}

	var resume models.Resume
	if err := s.db.First(&resume, "id = ? AND user_id = ?", resumeID, currentUserID(c)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			writeError(c, http.StatusNotFound, "resume not found")
			return resume, false
		}
		writeError(c, http.StatusInternalServerError, "failed to load resume")
		return resume, false
	}
	return resume, true
}

func bindJSON(c *gin.Context, target any) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		writeError(c, validationErrorStatus(err), "request body is invalid JSON")
		return false
	}
	return true
}

func normalizeContent(c *gin.Context, raw json.RawMessage) (models.JSONB, bool) {
	normalized, err := normalizeResumeContentJSON(raw)
	if err != nil {
		writeError(c, http.StatusBadRequest, "resume content must be valid JSON")
		return nil, false
	}
	return models.NewJSONB(normalized), true
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func normalizeTitle(title string) string {
	title = strings.TrimSpace(title)
	if title == "" {
		return "未命名简历"
	}
	return title
}

func currentUserID(c *gin.Context) uuid.UUID {
	value, ok := c.Get(userIDContextKey)
	if !ok {
		return uuid.Nil
	}
	id, ok := value.(uuid.UUID)
	if !ok {
		return uuid.Nil
	}
	return id
}

func toPublicUser(user models.User) publicUser {
	return publicUser{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		CreatedAt:   user.CreatedAt,
		UpdatedAt:   user.UpdatedAt,
	}
}

func writeError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": gin.H{"message": message}})
}
