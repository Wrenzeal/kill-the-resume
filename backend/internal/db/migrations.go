package db

import (
	"fmt"

	"gorm.io/gorm"
)

type appMigration struct {
	version     string
	description string
	run         func(*gorm.DB) error
}

var appMigrations = []appMigration{
	{
		version:     "2026061101",
		description: "mark resume content schema version",
		run: func(tx *gorm.DB) error {
			return tx.Exec(`
				UPDATE resumes
				SET content = jsonb_set(
					jsonb_set(
						CASE
							WHEN jsonb_typeof(content) = 'object' THEN content
							ELSE '{}'::jsonb
						END,
						'{schema}',
						to_jsonb(?::text),
						true
					),
					'{version}', to_jsonb(?::int),
					true
				)
				WHERE content->>'schema' IS NULL OR content->>'version' IS NULL
			`, "kill-the-resume.resume.v1", 1).Error
		},
	},
	{
		version:     "2026062201",
		description: "ensure job radar cache query indexes",
		run: func(tx *gorm.DB) error {
			return tx.Exec(`
				CREATE INDEX IF NOT EXISTS idx_job_postings_visible_feed
				ON job_postings (expires_at, posted_at DESC, last_seen_at DESC);

				CREATE INDEX IF NOT EXISTS idx_job_postings_sync_state
				ON job_postings (fetched_at DESC);
			`).Error
		},
	},
	{
		version:     "2026062202",
		description: "scope job radar cache sync by search fingerprint",
		run: func(tx *gorm.DB) error {
			return tx.Exec(`
				CREATE INDEX IF NOT EXISTS idx_job_search_caches_last_synced
				ON job_search_caches (last_synced_at DESC);

				CREATE INDEX IF NOT EXISTS idx_job_search_results_scope_seen
				ON job_search_results (search_fingerprint, last_seen_at DESC);

				CREATE INDEX IF NOT EXISTS idx_job_search_results_job
				ON job_search_results (job_posting_id);

				CREATE INDEX IF NOT EXISTS idx_job_search_results_source
				ON job_search_results (source_name, source_job_id);
			`).Error
		},
	},
	{
		version:     "2026062203",
		description: "persist user job radar search preferences",
		run: func(tx *gorm.DB) error {
			return tx.Exec(`
				CREATE UNIQUE INDEX IF NOT EXISTS idx_job_radar_preferences_user_id
				ON job_radar_preferences (user_id);

				CREATE INDEX IF NOT EXISTS idx_job_radar_preferences_updated
				ON job_radar_preferences (updated_at DESC);
			`).Error
		},
	},
}

func runMigrations(database *gorm.DB) error {
	if err := database.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version varchar(64) PRIMARY KEY,
			description text NOT NULL DEFAULT '',
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`).Error; err != nil {
		return fmt.Errorf("ensure schema_migrations table: %w", err)
	}

	for _, migration := range appMigrations {
		var count int64
		if err := database.Table("schema_migrations").Where("version = ?", migration.version).Count(&count).Error; err != nil {
			return fmt.Errorf("check migration %s: %w", migration.version, err)
		}
		if count > 0 {
			continue
		}

		if err := database.Transaction(func(tx *gorm.DB) error {
			if err := migration.run(tx); err != nil {
				return err
			}
			if err := tx.Exec(
				"INSERT INTO schema_migrations (version, description) VALUES (?, ?)",
				migration.version,
				migration.description,
			).Error; err != nil {
				return err
			}
			return nil
		}); err != nil {
			return fmt.Errorf("run migration %s: %w", migration.version, err)
		}
	}

	return nil
}
