package httpx

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"kill-the-resume/backend/internal/config"
)

func TestCORSAllowsVercelPreviewWildcard(t *testing.T) {
	origin := "https://kill-the-resume-git-main-example.vercel.app"
	router := NewRouter(config.Config{
		Env:                 "test",
		JWTSecret:           "test-secret-test-secret-test-secret",
		JWTIssuer:           "kill-the-resume",
		JWTAudience:         "kill-the-resume-web",
		JWTTTL:              time.Hour,
		CORSOrigins:         []string{"https://*.vercel.app"},
		MaxBodyBytes:        1 << 20,
		AuthRateLimitMax:    8,
		AuthRateLimitWindow: time.Minute,
	}, nil)

	request := httptest.NewRequest(http.MethodOptions, "/api/v1/auth/login", nil)
	request.Header.Set("Origin", origin)
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected preflight 204, got %d", response.Code)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != origin {
		t.Fatalf("unexpected allow-origin header: got %q want %q", got, origin)
	}
}

func TestCORSAllowsBrowserExtensionForJobRadarImportOnly(t *testing.T) {
	origin := "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
	router := NewRouter(config.Config{
		Env:                 "test",
		JWTSecret:           "test-secret-test-secret-test-secret",
		JWTIssuer:           "kill-the-resume",
		JWTAudience:         "kill-the-resume-web",
		JWTTTL:              time.Hour,
		CORSOrigins:         []string{"https://*.vercel.app"},
		MaxBodyBytes:        1 << 20,
		AuthRateLimitMax:    8,
		AuthRateLimitWindow: time.Minute,
	}, nil)

	allowed := httptest.NewRequest(http.MethodOptions, "/api/v1/job-radar/import", nil)
	allowed.Header.Set("Origin", origin)
	allowed.Header.Set("Access-Control-Request-Method", http.MethodPost)
	allowed.Header.Set("Access-Control-Request-Headers", "authorization,content-type")
	allowedResponse := httptest.NewRecorder()
	router.ServeHTTP(allowedResponse, allowed)

	if allowedResponse.Code != http.StatusNoContent {
		t.Fatalf("expected extension import preflight 204, got %d", allowedResponse.Code)
	}
	if got := allowedResponse.Header().Get("Access-Control-Allow-Origin"); got != origin {
		t.Fatalf("unexpected import allow-origin header: got %q want %q", got, origin)
	}

	blocked := httptest.NewRequest(http.MethodOptions, "/api/v1/job-radar/plugin-tokens", nil)
	blocked.Header.Set("Origin", origin)
	blocked.Header.Set("Access-Control-Request-Method", http.MethodGet)
	blockedResponse := httptest.NewRecorder()
	router.ServeHTTP(blockedResponse, blocked)

	if blockedResponse.Code != http.StatusForbidden {
		t.Fatalf("expected extension preflight for non-import route to stay forbidden, got %d", blockedResponse.Code)
	}
}
