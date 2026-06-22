package jobradar

import (
	"context"
	"fmt"
	"time"

	"kill-the-resume/backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) UpsertMany(ctx context.Context, jobs []models.JobPosting) (int, error) {
	if len(jobs) == 0 {
		return 0, nil
	}

	for _, job := range jobs {
		if job.SourceName == "" || job.SourceJobID == "" || job.SourceURL == "" || job.Title == "" {
			continue
		}
		if err := r.db.WithContext(ctx).Clauses(clause.OnConflict{
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
				"updated_at":            time.Now().UTC(),
			}),
		}).Create(&job).Error; err != nil {
			return 0, fmt.Errorf("upsert %s/%s: %w", job.SourceName, job.SourceJobID, err)
		}
	}

	return len(jobs), nil
}

func (r *Repository) ListVisible(ctx context.Context, now time.Time, limit int) ([]models.JobPosting, error) {
	query := r.db.WithContext(ctx).Where("expires_at >= ?", now).Order("posted_at DESC, last_seen_at DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}
	var jobs []models.JobPosting
	if err := query.Find(&jobs).Error; err != nil {
		return nil, err
	}
	return jobs, nil
}

func (r *Repository) CachedCount(ctx context.Context) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.JobPosting{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repository) ExpiredCount(ctx context.Context, now time.Time) (int64, error) {
	var count int64
	if err := r.db.WithContext(ctx).Model(&models.JobPosting{}).Where("expires_at < ?", now).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *Repository) LatestFetchedAt(ctx context.Context) (*time.Time, error) {
	var job models.JobPosting
	if err := r.db.WithContext(ctx).Order("fetched_at DESC").First(&job).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &job.FetchedAt, nil
}

func (r *Repository) NeedsSync(ctx context.Context, now time.Time, interval time.Duration) (bool, error) {
	latest, err := r.LatestFetchedAt(ctx)
	if err != nil {
		return false, err
	}
	if latest == nil {
		return true, nil
	}
	return latest.Add(interval).Before(now), nil
}

func (r *Repository) CleanupExpired(ctx context.Context, now time.Time) (int64, error) {
	cutoff := now.Add(-time.Duration(FreshnessPolicy.DeleteAfterDays) * day)
	result := r.db.WithContext(ctx).Where("posted_at < ? AND first_seen_at < ?", cutoff, cutoff).Delete(&models.JobPosting{})
	if result.Error != nil {
		return 0, result.Error
	}
	return result.RowsAffected, nil
}
