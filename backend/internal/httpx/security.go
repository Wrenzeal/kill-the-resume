package httpx

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"mime"
	"net/http"
	"strings"
	"time"

	"kill-the-resume/backend/internal/config"

	"github.com/gin-gonic/gin"
)

const (
	dummyPasswordHash   = "$2a$10$Sg1B84kI.R7UHNLHS5WeoOUfunxO1jE1VEpidNLEzLwb1t15acjHy"
	dummyPasswordProbe  = "invalid-password-sentinel"
	loginFailureMessage = "email or password is incorrect"
	maxEmailBytes       = 255
	minPasswordBytes    = 8
	maxPasswordBytes    = 72
)

func securityHeadersMiddleware(cfg config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Content-Security-Policy", "frame-ancestors 'none'")
		c.Header("Referrer-Policy", "no-referrer")
		if cfg.Env == "production" {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		}
		c.Next()
	}
}

func requestBodyGuardMiddleware(maxBytes int64) gin.HandlerFunc {
	if maxBytes <= 0 {
		maxBytes = 1 << 20
	}

	return func(c *gin.Context) {
		method := c.Request.Method
		if method != http.MethodPost && method != http.MethodPut && method != http.MethodPatch {
			c.Next()
			return
		}

		if c.Request.ContentLength > maxBytes {
			writeError(c, http.StatusRequestEntityTooLarge, "request body is too large")
			c.Abort()
			return
		}

		if c.Request.ContentLength != 0 {
			contentType := strings.TrimSpace(c.GetHeader("Content-Type"))
			mediaType, _, err := mime.ParseMediaType(contentType)
			if err != nil || mediaType != "application/json" {
				writeError(c, http.StatusUnsupportedMediaType, "content type must be application/json")
				c.Abort()
				return
			}
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		c.Next()
	}
}

func validationErrorStatus(err error) int {
	var maxBytesError *http.MaxBytesError
	if errors.As(err, &maxBytesError) {
		return http.StatusRequestEntityTooLarge
	}
	if strings.Contains(err.Error(), "request body too large") {
		return http.StatusRequestEntityTooLarge
	}
	return http.StatusBadRequest
}

func authRateLimitKeys(prefix string, c *gin.Context, email string) []string {
	ip := c.ClientIP()
	return []string{
		fmt.Sprintf("%s:ip:%s", prefix, ip),
		fmt.Sprintf("%s:pair:%s:%s", prefix, ip, hashForLog(normalizeEmail(email))),
	}
}

func allowAuthAttempt(limiter *rateLimiter, keys []string) (bool, time.Duration) {
	return limiter.allowMany(keys)
}

func resetAuthIdentityAttempts(limiter *rateLimiter, keys []string) {
	for index, key := range keys {
		if index == 0 {
			continue
		}
		limiter.reset(key)
	}
}

func hashForLog(value string) string {
	sum := sha256.Sum256([]byte(strings.ToLower(strings.TrimSpace(value))))
	return hex.EncodeToString(sum[:])[:16]
}

func auditAuth(event string, c *gin.Context, email string, outcome string) {
	log.Printf("security auth_event=%s outcome=%s ip=%s email_hash=%s", event, outcome, c.ClientIP(), hashForLog(email))
}

func validateEmailForAuth(email string) bool {
	email = normalizeEmail(email)
	return email != "" && len(email) <= maxEmailBytes && strings.Count(email, "@") == 1 && !strings.ContainsAny(email, "\r\n\x00")
}

func validatePasswordForStorage(password string) error {
	byteLen := len([]byte(password))
	if byteLen < minPasswordBytes {
		return fmt.Errorf("password must be at least %d bytes", minPasswordBytes)
	}
	if byteLen > maxPasswordBytes {
		return fmt.Errorf("password must be at most %d bytes", maxPasswordBytes)
	}
	if strings.TrimSpace(password) == "" {
		return fmt.Errorf("password cannot be blank")
	}
	return nil
}

func retryAfterSeconds(duration time.Duration) string {
	seconds := int(duration.Seconds())
	if seconds < 1 {
		seconds = 1
	}
	return fmt.Sprintf("%d", seconds)
}
