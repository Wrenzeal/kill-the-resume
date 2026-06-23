package httpx

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"

	"kill-the-resume/backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	jobRadarPluginTokenPrefix       = "ktrp_"
	defaultPluginTokenName          = "Job Radar Collector"
	defaultPluginTokenExpiresInDays = 90
	maximumPluginTokenExpiresInDays = 365
)

type jobRadarPluginTokenCreateRequest struct {
	Name          string `json:"name"`
	ExpiresInDays int    `json:"expiresInDays"`
}

type jobRadarPluginTokenMeta struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	LastUsedAt *time.Time `json:"lastUsedAt,omitempty"`
	ExpiresAt  *time.Time `json:"expiresAt,omitempty"`
	RevokedAt  *time.Time `json:"revokedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type jobRadarPluginTokenCreateResponse struct {
	Token string                  `json:"token"`
	Meta  jobRadarPluginTokenMeta `json:"meta"`
}

func (s *Server) listJobRadarPluginTokens(c *gin.Context) {
	if s.db == nil {
		writeError(c, http.StatusServiceUnavailable, "database unavailable")
		return
	}

	var tokens []models.JobRadarPluginToken
	if err := s.db.WithContext(c.Request.Context()).
		Where("user_id = ?", currentUserID(c)).
		Order("created_at DESC").
		Find(&tokens).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to list plugin tokens")
		return
	}

	items := make([]jobRadarPluginTokenMeta, 0, len(tokens))
	for _, token := range tokens {
		items = append(items, pluginTokenMeta(token))
	}
	c.JSON(http.StatusOK, gin.H{"tokens": items})
}

func (s *Server) createJobRadarPluginToken(c *gin.Context) {
	if s.db == nil {
		writeError(c, http.StatusServiceUnavailable, "database unavailable")
		return
	}

	var req jobRadarPluginTokenCreateRequest
	if !bindJSON(c, &req) {
		return
	}

	secret, err := newJobRadarPluginTokenSecret()
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to create plugin token")
		return
	}
	expiresAt := pluginTokenExpiresAt(req.ExpiresInDays, time.Now().UTC())
	token := models.JobRadarPluginToken{
		UserID:    currentUserID(c),
		Name:      normalizePluginTokenName(req.Name),
		TokenHash: hashJobRadarPluginToken(secret),
		ExpiresAt: expiresAt,
	}
	if err := s.db.WithContext(c.Request.Context()).Create(&token).Error; err != nil {
		writeError(c, http.StatusInternalServerError, "failed to store plugin token")
		return
	}

	c.JSON(http.StatusCreated, jobRadarPluginTokenCreateResponse{Token: secret, Meta: pluginTokenMeta(token)})
}

func (s *Server) revokeJobRadarPluginToken(c *gin.Context) {
	if s.db == nil {
		writeError(c, http.StatusServiceUnavailable, "database unavailable")
		return
	}

	tokenID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		writeError(c, http.StatusBadRequest, "plugin token id is invalid")
		return
	}

	now := time.Now().UTC()
	result := s.db.WithContext(c.Request.Context()).
		Model(&models.JobRadarPluginToken{}).
		Where("id = ? AND user_id = ?", tokenID, currentUserID(c)).
		Updates(map[string]any{"revoked_at": now, "updated_at": now})
	if result.Error != nil {
		writeError(c, http.StatusInternalServerError, "failed to revoke plugin token")
		return
	}
	if result.RowsAffected == 0 {
		writeError(c, http.StatusNotFound, "plugin token not found")
		return
	}
	c.Status(http.StatusNoContent)
}

func (s *Server) jobRadarImportAuthMiddleware(c *gin.Context) {
	token, ok := bearerTokenFromHeader(c.GetHeader("Authorization"))
	if !ok {
		c.Header("WWW-Authenticate", `Bearer realm="kill-the-resume-job-radar"`)
		writeError(c, http.StatusUnauthorized, "authentication required")
		c.Abort()
		return
	}

	if userID, err := s.auth.Parse(token); err == nil {
		c.Set(userIDContextKey, userID)
		c.Next()
		return
	}

	userID, authenticated, err := s.authenticateJobRadarPluginToken(c, token)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to authenticate plugin token")
		c.Abort()
		return
	}
	if !authenticated {
		c.Header("WWW-Authenticate", `Bearer realm="kill-the-resume-job-radar", error="invalid_token"`)
		writeError(c, http.StatusUnauthorized, "authentication required")
		c.Abort()
		return
	}

	c.Set(userIDContextKey, userID)
	c.Next()
}

func (s *Server) authenticateJobRadarPluginToken(c *gin.Context, rawToken string) (uuid.UUID, bool, error) {
	if s.db == nil || !strings.HasPrefix(rawToken, jobRadarPluginTokenPrefix) {
		return uuid.Nil, false, nil
	}

	now := time.Now().UTC()
	var stored models.JobRadarPluginToken
	err := s.db.WithContext(c.Request.Context()).
		Where("token_hash = ? AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > ?)", hashJobRadarPluginToken(rawToken), now).
		First(&stored).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return uuid.Nil, false, nil
		}
		return uuid.Nil, false, err
	}

	if err := s.db.WithContext(c.Request.Context()).Model(&stored).Updates(map[string]any{
		"last_used_at": now,
		"updated_at":   now,
	}).Error; err != nil {
		return uuid.Nil, false, err
	}
	return stored.UserID, true, nil
}

func newJobRadarPluginTokenSecret() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return jobRadarPluginTokenPrefix + base64.RawURLEncoding.EncodeToString(bytes), nil
}

func hashJobRadarPluginToken(rawToken string) string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(rawToken)))
	return hex.EncodeToString(sum[:])
}

func normalizePluginTokenName(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return defaultPluginTokenName
	}
	if len([]rune(name)) <= 120 {
		return name
	}
	return string([]rune(name)[:120])
}

func pluginTokenExpiresAt(days int, now time.Time) *time.Time {
	if days <= 0 {
		days = defaultPluginTokenExpiresInDays
	}
	if days > maximumPluginTokenExpiresInDays {
		days = maximumPluginTokenExpiresInDays
	}
	expiresAt := now.Add(time.Duration(days) * 24 * time.Hour)
	return &expiresAt
}

func pluginTokenMeta(token models.JobRadarPluginToken) jobRadarPluginTokenMeta {
	return jobRadarPluginTokenMeta{
		ID:         token.ID,
		Name:       token.Name,
		LastUsedAt: token.LastUsedAt,
		ExpiresAt:  token.ExpiresAt,
		RevokedAt:  token.RevokedAt,
		CreatedAt:  token.CreatedAt,
		UpdatedAt:  token.UpdatedAt,
	}
}
