package config

import (
	"strings"
	"testing"
	"time"
)

func TestValidateRejectsWeakProductionSecret(t *testing.T) {
	cfg := Config{
		Env:         "production",
		JWTSecret:   "change-me",
		JWTIssuer:   "kill-the-resume",
		JWTAudience: "kill-the-resume-web",
		JWTTTL:      time.Hour,
	}
	if err := cfg.Validate(); err == nil || !strings.Contains(err.Error(), "JWT_SECRET") {
		t.Fatalf("expected JWT secret validation error, got %v", err)
	}
}

func TestValidateAcceptsDevelopmentDefaults(t *testing.T) {
	cfg := Config{
		Env:         "development",
		JWTSecret:   "dev-change-me-kill-the-resume",
		JWTIssuer:   "kill-the-resume",
		JWTAudience: "kill-the-resume-web",
		JWTTTL:      time.Hour,
	}
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected development defaults to validate: %v", err)
	}
}

func TestLoadDefaultCORSIncludesVercelPreviewWildcard(t *testing.T) {
	t.Setenv("CORS_ORIGINS", "")
	cfg := Load()

	found := false
	for _, origin := range cfg.CORSOrigins {
		if origin == "https://*.vercel.app" {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected default CORS origins to include Vercel preview wildcard, got %v", cfg.CORSOrigins)
	}
}
