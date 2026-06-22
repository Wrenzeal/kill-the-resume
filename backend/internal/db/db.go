package db

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"

	"kill-the-resume/backend/internal/config"
	"kill-the-resume/backend/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var schemaPattern = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]*$`)

func Connect(cfg config.Config) (*gorm.DB, error) {
	if !schemaPattern.MatchString(cfg.DBSchema) {
		return nil, fmt.Errorf("invalid database schema: %q", cfg.DBSchema)
	}

	baseDSN := cfg.DatabaseURL
	if baseDSN == "" {
		baseDSN = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName)
	}

	bootstrapDB, err := gorm.Open(postgres.Open(baseDSN), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect bootstrap database: %w", err)
	}
	if err := bootstrapDB.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", cfg.DBSchema)).Error; err != nil {
		return nil, fmt.Errorf("create schema %s: %w", cfg.DBSchema, err)
	}

	if sqlDB, err := bootstrapDB.DB(); err == nil {
		sqlDB.Close()
	}

	dsn := withSearchPath(cfg.DatabaseURL, cfg.DBSchema)
	if dsn == "" {
		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable options=-csearch_path=%s,public", cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBSchema)
	}

	gormDB, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect application database: %w", err)
	}

	sqlDB, err := gormDB.DB()
	if err != nil {
		return nil, fmt.Errorf("unwrap database handle: %w", err)
	}
	sqlDB.SetMaxOpenConns(20)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := gormDB.AutoMigrate(&models.User{}, &models.Resume{}, &models.JobPosting{}, &models.JobSearchCache{}, &models.JobSearchResult{}, &models.JobRadarPreference{}); err != nil {
		return nil, fmt.Errorf("auto migrate: %w", err)
	}
	if err := runMigrations(gormDB); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	return gormDB, nil
}

func withSearchPath(dsn, schema string) string {
	dsn = strings.TrimSpace(dsn)
	if dsn == "" {
		return ""
	}
	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		parsed, err := url.Parse(dsn)
		if err != nil {
			return dsn
		}
		query := parsed.Query()
		if query.Get("options") == "" {
			query.Set("options", "-csearch_path="+schema+",public")
		}
		parsed.RawQuery = query.Encode()
		return parsed.String()
	}
	if strings.Contains(dsn, "options=") {
		return dsn
	}
	return dsn + " options=-csearch_path=" + schema + ",public"
}
