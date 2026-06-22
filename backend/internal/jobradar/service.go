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

type SearchOptions struct {
	ForceRefresh bool
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
	return s.SearchWithOptions(ctx, criteria, SearchOptions{})
}

func (s *Service) SearchWithOptions(ctx context.Context, criteria SearchCriteria, options SearchOptions) (SearchResponse, error) {
	if s == nil || s.repo == nil {
		return SearchResponse{}, fmt.Errorf("job radar service is unavailable")
	}

	now := time.Now().UTC()
	scope := BuildSearchScope(criteria)
	meta := SearchMeta{
		SourceName:        SourceRemotive,
		SearchFingerprint: scope.Fingerprint,
		SearchQuery:       scope.Query,
	}

	cache, err := s.repo.EnsureSearchCache(ctx, scope)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("ensure job search cache: %w", err)
	}
	meta.LastSyncedAt = cache.LastSyncedAt

	deleted, err := s.repo.CleanupExpired(ctx, now)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("cleanup expired jobs: %w", err)
	}
	meta.ExpiredDeleted = deleted

	if s.syncEnabled && s.source != nil {
		cache, needsSync, err := s.repo.NeedsSearchSync(ctx, scope, now, s.syncInterval, options.ForceRefresh)
		if err != nil {
			return SearchResponse{}, fmt.Errorf("check job search sync state: %w", err)
		}
		meta.LastSyncedAt = cache.LastSyncedAt
		meta.CacheHit = !needsSync && cache.LastSyncedAt != nil
		if needsSync {
			result, err := s.Sync(ctx, scope)
			if err != nil {
				meta.SyncError = err.Error()
			} else {
				meta.SyncedAt = &result.SyncedAt
				meta.LastSyncedAt = &result.SyncedAt
				meta.CacheHit = false
				meta.ExpiredDeleted += result.ExpiredDeleted
			}
		}
	}

	count, err := s.repo.CachedCountForScope(ctx, scope)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("count cached jobs for search: %w", err)
	}
	meta.CachedCount = count

	expiredCount, err := s.repo.ExpiredCountForScope(ctx, scope, now)
	if err != nil {
		return SearchResponse{}, fmt.Errorf("count expired jobs for search: %w", err)
	}
	meta.ExpiredCount = expiredCount

	jobs, err := s.repo.ListVisibleForScope(ctx, scope, now, max(s.maxResults*4, 200))
	if err != nil {
		return SearchResponse{}, fmt.Errorf("list cached jobs for search: %w", err)
	}

	return SearchResponse{
		Jobs:   SearchPostings(jobs, scope.Criteria, now, s.maxResults),
		Policy: FreshnessPolicy,
		Meta:   meta,
	}, nil
}

func (s *Service) Sync(ctx context.Context, scope SearchScope) (SyncResult, error) {
	if s == nil || s.repo == nil || s.source == nil {
		return SyncResult{}, fmt.Errorf("job radar sync is unavailable")
	}
	if scope.Fingerprint == "" {
		scope = BuildSearchScope(scope.Criteria)
	}
	now := time.Now().UTC()
	sourceJobs, err := s.source.Fetch(ctx, SourceQuery{Criteria: scope.Criteria, Terms: scope.Terms, Limit: max(s.maxResults, 30)})
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
	upserted, linked, err := s.repo.UpsertManyForScope(ctx, scope, jobs, now)
	if err != nil {
		return SyncResult{}, err
	}
	if err := s.repo.MarkSearchSynced(ctx, scope, now); err != nil {
		return SyncResult{}, err
	}
	deleted, err := s.repo.CleanupExpired(ctx, now)
	if err != nil {
		return SyncResult{}, err
	}
	return SyncResult{
		Fetched:        len(sourceJobs),
		Upserted:       upserted,
		Linked:         linked,
		ExpiredDeleted: deleted,
		SyncedAt:       now,
	}, nil
}
