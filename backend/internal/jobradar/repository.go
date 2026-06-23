package jobradar

import (
	"context"
	"errors"
	"fmt"
	"time"

	"kill-the-resume/backend/internal/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) EnsureSearchCache(ctx context.Context, scope SearchScope) (models.JobSearchCache, error) {
	if scope.Fingerprint == "" {
		return models.JobSearchCache{}, fmt.Errorf("job radar search fingerprint is empty")
	}

	now := time.Now().UTC()
	cache := models.JobSearchCache{
		SearchFingerprint: scope.Fingerprint,
		SearchQuery:       scope.Query,
		Criteria:          CriteriaJSON(scope.Criteria),
		SourceName:        SourceRemotive,
	}
	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "search_fingerprint"}},
		DoUpdates: clause.Assignments(map[string]any{
			"search_query": scope.Query,
			"criteria":     CriteriaJSON(scope.Criteria),
			"source_name":  SourceRemotive,
			"updated_at":   now,
		}),
	}).Create(&cache).Error; err != nil {
		return models.JobSearchCache{}, fmt.Errorf("ensure job search cache %s: %w", scope.Fingerprint, err)
	}

	var stored models.JobSearchCache
	if err := r.db.WithContext(ctx).Where("search_fingerprint = ?", scope.Fingerprint).First(&stored).Error; err != nil {
		return models.JobSearchCache{}, fmt.Errorf("load job search cache %s: %w", scope.Fingerprint, err)
	}
	return stored, nil
}

func (r *Repository) NeedsSearchSync(ctx context.Context, scope SearchScope, now time.Time, interval time.Duration, force bool) (models.JobSearchCache, bool, error) {
	cache, err := r.EnsureSearchCache(ctx, scope)
	if err != nil {
		return models.JobSearchCache{}, false, err
	}
	if force {
		return cache, true, nil
	}
	if cache.LastSyncedAt == nil || cache.LastSyncedAt.IsZero() {
		return cache, true, nil
	}
	return cache, !cache.LastSyncedAt.Add(interval).After(now), nil
}

func (r *Repository) MarkSearchSynced(ctx context.Context, scope SearchScope, syncedAt time.Time) error {
	if syncedAt.IsZero() {
		syncedAt = time.Now().UTC()
	}
	result := r.db.WithContext(ctx).Model(&models.JobSearchCache{}).
		Where("search_fingerprint = ?", scope.Fingerprint).
		Updates(map[string]any{
			"search_query":   scope.Query,
			"criteria":       CriteriaJSON(scope.Criteria),
			"source_name":    SourceRemotive,
			"last_synced_at": syncedAt,
			"updated_at":     syncedAt,
		})
	if result.Error != nil {
		return fmt.Errorf("mark job search cache synced %s: %w", scope.Fingerprint, result.Error)
	}
	if result.RowsAffected == 0 {
		_, err := r.EnsureSearchCache(ctx, scope)
		if err != nil {
			return err
		}
		return r.MarkSearchSynced(ctx, scope, syncedAt)
	}
	return nil
}

func (r *Repository) UpsertManyForScope(ctx context.Context, scope SearchScope, jobs []models.JobPosting, seenAt time.Time) (int, int, error) {
	return r.storeManyForScope(ctx, scope, jobs, seenAt, false)
}

func (r *Repository) ReplaceManyForScope(ctx context.Context, scope SearchScope, jobs []models.JobPosting, seenAt time.Time) (int, int, error) {
	return r.storeManyForScope(ctx, scope, jobs, seenAt, true)
}

func (r *Repository) storeManyForScope(ctx context.Context, scope SearchScope, jobs []models.JobPosting, seenAt time.Time, replaceScope bool) (int, int, error) {
	if scope.Fingerprint == "" {
		return 0, 0, fmt.Errorf("job radar search fingerprint is empty")
	}
	if seenAt.IsZero() {
		seenAt = time.Now().UTC()
	}

	validCount := 0
	linkedCount := 0
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if replaceScope {
			if err := tx.Where("search_fingerprint = ?", scope.Fingerprint).Delete(&models.JobSearchResult{}).Error; err != nil {
				return fmt.Errorf("replace job search results for %s: %w", scope.Fingerprint, err)
			}
		}

		for _, job := range jobs {
			if job.SourceName == "" || job.SourceJobID == "" || job.SourceURL == "" || job.Title == "" {
				continue
			}
			if err := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "source_name"}, {Name: "source_job_id"}},
				DoUpdates: clause.Assignments(map[string]any{
					"source_url":            job.SourceURL,
					"title":                 job.Title,
					"company_name":          job.CompanyName,
					"company_nature":        job.CompanyNature,
					"location":              job.Location,
					"salary":                job.Salary,
					"responsibilities_text": job.ResponsibilitiesText,
					"requirements_text":     job.RequirementsText,
					"description":           job.Description,
					"raw_text":              job.RawText,
					"posted_at":             job.PostedAt,
					"last_seen_at":          job.LastSeenAt,
					"fetched_at":            job.FetchedAt,
					"expires_at":            job.ExpiresAt,
					"freshness_status":      job.FreshnessStatus,
					"updated_at":            seenAt,
				}),
			}).Create(&job).Error; err != nil {
				return fmt.Errorf("upsert %s/%s: %w", job.SourceName, job.SourceJobID, err)
			}
			validCount++

			var stored models.JobPosting
			if err := tx.Where("source_name = ? AND source_job_id = ?", job.SourceName, job.SourceJobID).First(&stored).Error; err != nil {
				return fmt.Errorf("load upserted job %s/%s: %w", job.SourceName, job.SourceJobID, err)
			}

			link := models.JobSearchResult{
				SearchFingerprint: scope.Fingerprint,
				JobPostingID:      stored.ID,
				SourceName:        stored.SourceName,
				SourceJobID:       stored.SourceJobID,
				FirstSeenAt:       seenAt,
				LastSeenAt:        seenAt,
			}
			if err := tx.Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "search_fingerprint"}, {Name: "job_posting_id"}},
				DoUpdates: clause.Assignments(map[string]any{
					"source_name":   stored.SourceName,
					"source_job_id": stored.SourceJobID,
					"last_seen_at":  seenAt,
					"updated_at":    seenAt,
				}),
			}).Create(&link).Error; err != nil {
				return fmt.Errorf("link job %s/%s to search %s: %w", stored.SourceName, stored.SourceJobID, scope.Fingerprint, err)
			}
			linkedCount++
		}
		return nil
	})
	if err != nil {
		return 0, 0, err
	}
	return validCount, linkedCount, nil
}

func (r *Repository) ListVisibleForScope(ctx context.Context, scope SearchScope, now time.Time, limit int) ([]models.JobPosting, error) {
	query := r.db.WithContext(ctx).
		Model(&models.JobPosting{}).
		Joins("JOIN job_search_results ON job_search_results.job_posting_id = job_postings.id").
		Where("job_search_results.search_fingerprint = ? AND job_postings.expires_at >= ?", scope.Fingerprint, now).
		Order("job_postings.posted_at DESC, job_search_results.last_seen_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	var jobs []models.JobPosting
	if err := query.Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *Repository) CachedCountForScope(ctx context.Context, scope SearchScope) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.JobSearchResult{}).
		Where("search_fingerprint = ?", scope.Fingerprint).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repository) SavePreference(ctx context.Context, userID uuid.UUID, criteria SearchCriteria) (models.JobRadarPreference, error) {
	if userID == uuid.Nil {
		return models.JobRadarPreference{}, fmt.Errorf("job radar preference user id is empty")
	}

	scope := BuildSearchScope(criteria)
	now := time.Now().UTC()
	preference := models.JobRadarPreference{
		UserID:            userID,
		Criteria:          CriteriaJSON(scope.Criteria),
		SearchFingerprint: scope.Fingerprint,
		SearchQuery:       scope.Query,
	}
	if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}},
		DoUpdates: clause.Assignments(map[string]any{
			"criteria":           CriteriaJSON(scope.Criteria),
			"search_fingerprint": scope.Fingerprint,
			"search_query":       scope.Query,
			"updated_at":         now,
		}),
	}).Create(&preference).Error; err != nil {
		return models.JobRadarPreference{}, fmt.Errorf("save job radar preference for user %s: %w", userID, err)
	}

	var stored models.JobRadarPreference
	if err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&stored).Error; err != nil {
		return models.JobRadarPreference{}, fmt.Errorf("load job radar preference for user %s: %w", userID, err)
	}
	return stored, nil
}

func (r *Repository) GetPreference(ctx context.Context, userID uuid.UUID) (models.JobRadarPreference, bool, error) {
	if userID == uuid.Nil {
		return models.JobRadarPreference{}, false, fmt.Errorf("job radar preference user id is empty")
	}

	var preference models.JobRadarPreference
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&preference).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.JobRadarPreference{}, false, nil
	}
	if err != nil {
		return models.JobRadarPreference{}, false, fmt.Errorf("load job radar preference for user %s: %w", userID, err)
	}
	return preference, true, nil
}

func (r *Repository) ExpiredCountForScope(ctx context.Context, scope SearchScope, now time.Time) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.JobSearchResult{}).
		Joins("JOIN job_postings ON job_postings.id = job_search_results.job_posting_id").
		Where("job_search_results.search_fingerprint = ? AND job_postings.expires_at < ?", scope.Fingerprint, now).
		Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repository) CleanupExpired(ctx context.Context, now time.Time) (int64, error) {
	cutoff := now.Add(-time.Duration(FreshnessPolicy.DeleteAfterDays) * day)
	if err := r.db.WithContext(ctx).Exec(`
		DELETE FROM job_search_results
		WHERE job_posting_id IN (
			SELECT id FROM job_postings WHERE posted_at < ? AND first_seen_at < ?
		)
	`, cutoff, cutoff).Error; err != nil {
		return 0, err
	}
	result := r.db.WithContext(ctx).Where("posted_at < ? AND first_seen_at < ?", cutoff, cutoff).Delete(&models.JobPosting{})
	if result.Error != nil {
		return 0, result.Error
	}
	if err := r.db.WithContext(ctx).Exec(`
		DELETE FROM job_search_results AS search_result
		WHERE NOT EXISTS (
			SELECT 1 FROM job_postings WHERE job_postings.id = search_result.job_posting_id
		)
	`).Error; err != nil {
		return 0, err
	}
	return result.RowsAffected, nil
}
