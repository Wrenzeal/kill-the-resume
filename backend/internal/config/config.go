package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultCORSOrigins = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3301,http://127.0.0.1:3301,http://localhost:3302,http://127.0.0.1:3302,https://*.vercel.app"

type Config struct {
	Env                  string
	ServerAddr           string
	DatabaseURL          string
	DBHost               string
	DBPort               string
	DBUser               string
	DBPassword           string
	DBName               string
	DBSchema             string
	JWTSecret            string
	JWTIssuer            string
	JWTAudience          string
	JWTTTL               time.Duration
	CORSOrigins          []string
	MaxBodyBytes         int64
	AuthRateLimitMax     int
	AuthRateLimitWindow  time.Duration
	JobRadarSyncEnabled  bool
	JobRadarSyncInterval time.Duration
	JobRadarHTTPTimeout  time.Duration
	JobRadarMaxResults   int
	JobRadarSourceURL    string
}

func Load() Config {
	jwtHours := envInt("JWT_TTL_HOURS", 168)
	rateLimitMinutes := envInt("AUTH_RATE_LIMIT_WINDOW_MINUTES", 15)
	radarSyncMinutes := envInt("JOB_RADAR_SYNC_INTERVAL_MINUTES", 360)
	radarTimeoutSeconds := envInt("JOB_RADAR_HTTP_TIMEOUT_SECONDS", 10)
	return Config{
		Env:                  env("APP_ENV", "development"),
		ServerAddr:           env("SERVER_ADDR", ":19304"),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		DBHost:               env("DB_HOST", "127.0.0.1"),
		DBPort:               env("DB_PORT", "5432"),
		DBUser:               env("DB_USER", "postgres"),
		DBPassword:           env("DB_PASSWORD", "postgres"),
		DBName:               env("DB_NAME", "postgres"),
		DBSchema:             env("DB_SCHEMA", "kill_the_resume"),
		JWTSecret:            env("JWT_SECRET", "dev-change-me-kill-the-resume"),
		JWTIssuer:            env("JWT_ISSUER", "kill-the-resume"),
		JWTAudience:          env("JWT_AUDIENCE", "kill-the-resume-web"),
		JWTTTL:               time.Duration(jwtHours) * time.Hour,
		CORSOrigins:          envCSV("CORS_ORIGINS", defaultCORSOrigins),
		MaxBodyBytes:         envInt64("MAX_BODY_BYTES", 1<<20),
		AuthRateLimitMax:     envInt("AUTH_RATE_LIMIT_MAX", 8),
		AuthRateLimitWindow:  time.Duration(rateLimitMinutes) * time.Minute,
		JobRadarSyncEnabled:  envBool("JOB_RADAR_SYNC_ENABLED", true),
		JobRadarSyncInterval: time.Duration(radarSyncMinutes) * time.Minute,
		JobRadarHTTPTimeout:  time.Duration(radarTimeoutSeconds) * time.Second,
		JobRadarMaxResults:   envInt("JOB_RADAR_MAX_RESULTS", 80),
		JobRadarSourceURL:    env("JOB_RADAR_REMOTIVE_URL", "https://remotive.com/api/remote-jobs"),
	}
}

func env(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func envCSV(key, fallback string) []string {
	raw := env(key, fallback)
	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func (c Config) Validate() error {
	if strings.TrimSpace(c.JWTSecret) == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if c.Env == "production" {
		if c.JWTSecret == "dev-change-me-kill-the-resume" || strings.Contains(strings.ToLower(c.JWTSecret), "change-me") {
			return fmt.Errorf("JWT_SECRET must be replaced in production")
		}
		if len([]byte(c.JWTSecret)) < 32 {
			return fmt.Errorf("JWT_SECRET must be at least 32 bytes in production")
		}
	}
	if strings.TrimSpace(c.JWTIssuer) == "" || strings.TrimSpace(c.JWTAudience) == "" {
		return fmt.Errorf("JWT_ISSUER and JWT_AUDIENCE are required")
	}
	if c.JWTTTL <= 0 {
		return fmt.Errorf("JWT_TTL_HOURS must be positive")
	}
	return nil
}

func envInt64(key string, fallback int64) int64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
