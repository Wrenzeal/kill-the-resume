package jobradar

import (
	"context"
	"fmt"
	"time"

	"kill-the-resume/backend/internal/models"
)

type Service struct {
	repo         *Repository
	source       SourceClient
	syncEnabled  bool
	syncInterval time.Duration
	maxResults   int
}

type ServiceConfig struct {
	SyncEnabled  bool
	SyncInterval time.Duration
	MaxResults   int
}

func NewService(repo *Repository, source SourceClient, cfg ServiceConfig) *Service {
	if cfg.SyncInterval <= 0 {
		cfg.SyncInterval = 6 * time.Hour
	}
	if cfg.MaxResults <= 0 {
		cfg.MaxResults = 80
	}
	return &Service{
		repo:         repo,
		source:       source,
		syncEnabled:  cfg.SyncEnabled,
		syncInterval: cfg.SyncInterval,
		maxResults:   cfg.MaxResults,
	}
}

func (s *Service) Search(ctx context.Context, criteria SearchCriteria) (SearchResponse, error) {
	if s == nil || s.repo == nil {
		return SearchResponse{}, fmt.Errorf("job radar service is unavailable")
	}

	now := time.Now().UTC()
	criteria = NormalizeCriteria(criteria)
	meta := SearchMeta{SourceName: SourceRemotive}

	deleted, err := s.repo.CleanupExpired(ctx, now)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("cleanup expired jobs: %w", err)
	}
	meta.ExpiredDeleted = deleted

	if s.syncEnabled && s.source != nil {
		needsSync, err := s.repo.NeedsSync(ctx, now, s.syncInterval)
		if err != nil {
			return SearchResponse{}, fmt.Errorf("check job sync state: %w", err)
		}
		if needsSync {
			result, err := s.Sync(ctx, criteria)
			if err != nil {
				meta.SyncError = err.Error()
			} else {
				meta.SyncedAt = &result.SyncedAt
				meta.ExpiredDeleted += result.ExpiredDeleted
			}
		}
	}

	count, err := s.repo.CachedCount(ctx)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("count cached jobs: %w", err)
	}
	meta.CachedCount = count

	expiredCount, err := s.repo.ExpiredCount(ctx, now)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("count expired jobs: %w", err)
	}
	meta.ExpiredCount = expiredCount

	jobs, err := s.repo.ListVisible(ctx, now, max(s.maxResults*4, 200))
	if err != nil {
		return SearchResponse{}, fmt.Errorf("list cached jobs: %w", err)
	}

	return SearchResponse{
		Jobs:   SearchPostings(jobs, criteria, now, s.maxResults),
		Policy: FreshnessPolicy,
		Meta:   meta,
	}, nil
}

func (s *Service) Sync(ctx context.Context, criteria SearchCriteria) (SyncResult, error) {
	if s == nil || s.repo == nil || s.source == nil {
		return SyncResult{}, fmt.Errorf("job radar sync is unavailable")
	}
	now := time.Now().UTC()
	sourceJobs, err := s.source.Fetch(ctx, SourceQuery{Criteria: NormalizeCriteria(criteria), Limit: max(s.maxResults, 30)})
	if err != nil {
		return SyncResult{}, err
	}
	jobs := make([]models.JobPosting, 0, len(sourceJobs))
	for _, job := range sourceJobs {
		prepared := PreparePostingForStorage(job, now)
		if prepared.SourceName == "" || prepared.SourceJobID == "" || prepared.SourceURL == "" || prepared.Title == "" {
			continue
		}
		jobs = append(jobs, prepared)
	}
	upserted, err := s.repo.UpsertMany(ctx, jobs)
	if err != nil {
		return SyncResult{}, err
	}
	deleted, err := s.repo.CleanupExpired(ctx, now)
	if err != nil {
		return SyncResult{}, err
	}
	return SyncResult{
		Fetched:        len(sourceJobs),
		Upserted:       upserted,
		ExpiredDeleted: deleted,
		SyncedAt:       now,
	}, nil
}
