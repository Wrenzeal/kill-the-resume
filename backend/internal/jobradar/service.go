package jobradar

import (
	"context"
	"fmt"
	"time"

	"kill-the-resume/backend/internal/models"

	"github.com/google/uuid"
)

type Service struct {
	repo         radarRepository
	source       SourceClient
	syncEnabled  bool
	syncInterval time.Duration
	maxResults   int
}

type radarRepository interface {
	EnsureSearchCache(ctx context.Context, scope SearchScope) (models.JobSearchCache, error)
	NeedsSearchSync(ctx context.Context, scope SearchScope, now time.Time, interval time.Duration, force bool) (models.JobSearchCache, bool, error)
	MarkSearchSynced(ctx context.Context, scope SearchScope, syncedAt time.Time) error
	ReplaceManyForScope(ctx context.Context, scope SearchScope, jobs []models.JobPosting, seenAt time.Time) (int, int, error)
	ListVisibleForScope(ctx context.Context, scope SearchScope, now time.Time, limit int) ([]models.JobPosting, error)
	CachedCountForScope(ctx context.Context, scope SearchScope) (int64, error)
	ExpiredCountForScope(ctx context.Context, scope SearchScope, now time.Time) (int64, error)
	CleanupExpired(ctx context.Context, now time.Time) (int64, error)
	SavePreference(ctx context.Context, userID uuid.UUID, criteria SearchCriteria) (models.JobRadarPreference, error)
	GetPreference(ctx context.Context, userID uuid.UUID) (models.JobRadarPreference, bool, error)
}

type ServiceConfig struct {
	SyncEnabled  bool
	SyncInterval time.Duration
	MaxResults   int
}

type SearchOptions struct {
	ForceRefresh bool
}

type Preference struct {
	Criteria          SearchCriteria `json:"criteria"`
	SearchFingerprint string         `json:"searchFingerprint"`
	SearchQuery       string         `json:"searchQuery"`
	UpdatedAt         time.Time      `json:"updatedAt"`
}

func NewService(repo *Repository, source SourceClient, cfg ServiceConfig) *Service {
	if cfg.SyncInterval <= 0 {
		cfg.SyncInterval = 6 * time.Hour
	}
	if cfg.MaxResults <= 0 {
		cfg.MaxResults = 80
	}
	var store radarRepository
	if repo != nil {
		store = repo
	}
	return &Service{
		repo:         store,
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
		ForceRefresh:      options.ForceRefresh,
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

	if options.ForceRefresh && (!s.syncEnabled || s.source == nil) {
		return SearchResponse{}, fmt.Errorf("online job refresh is unavailable")
	}

	if s.syncEnabled && s.source != nil {
		cache, needsSync, err := s.repo.NeedsSearchSync(ctx, scope, now, s.syncInterval, options.ForceRefresh)
		if err != nil {
			return SearchResponse{}, fmt.Errorf("check job search sync state: %w", err)
		}
		meta.LastSyncedAt = cache.LastSyncedAt
		meta.CacheHit = !needsSync && cache.LastSyncedAt != nil
		if needsSync {
			result, err := s.Sync(ctx, scope, SearchOptions{ForceRefresh: options.ForceRefresh})
			if err != nil {
				if options.ForceRefresh {
					return SearchResponse{}, fmt.Errorf("refresh online job source: %w", err)
				}
				meta.SyncError = err.Error()
			} else {
				meta.SyncedAt = &result.SyncedAt
				meta.LastSyncedAt = &result.SyncedAt
				meta.CacheHit = false
				meta.FetchedCount = result.Fetched
				meta.UpsertedCount = result.Upserted
				meta.LinkedCount = result.Linked
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

func (s *Service) SavePreference(ctx context.Context, userID uuid.UUID, criteria SearchCriteria) (Preference, error) {
	if s == nil || s.repo == nil {
		return Preference{}, fmt.Errorf("job radar service is unavailable")
	}
	stored, err := s.repo.SavePreference(ctx, userID, criteria)
	if err != nil {
		return Preference{}, err
	}
	return preferenceFromModel(stored)
}

func (s *Service) GetPreference(ctx context.Context, userID uuid.UUID) (Preference, bool, error) {
	if s == nil || s.repo == nil {
		return Preference{}, false, fmt.Errorf("job radar service is unavailable")
	}
	stored, found, err := s.repo.GetPreference(ctx, userID)
	if err != nil || !found {
		return Preference{}, found, err
	}
	preference, err := preferenceFromModel(stored)
	if err != nil {
		return Preference{}, false, err
	}
	return preference, true, nil
}

func (s *Service) Sync(ctx context.Context, scope SearchScope, options ...SearchOptions) (SyncResult, error) {
	if s == nil || s.repo == nil || s.source == nil {
		return SyncResult{}, fmt.Errorf("job radar sync is unavailable")
	}
	if scope.Fingerprint == "" {
		scope = BuildSearchScope(scope.Criteria)
	}
	syncOptions := SearchOptions{}
	if len(options) > 0 {
		syncOptions = options[0]
	}
	now := time.Now().UTC()
	sourceJobs, err := s.source.Fetch(ctx, SourceQuery{
		Criteria:     scope.Criteria,
		Terms:        scope.Terms,
		Limit:        max(s.maxResults, 30),
		ForceRefresh: syncOptions.ForceRefresh,
	})
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
	upserted, linked, err := s.repo.ReplaceManyForScope(ctx, scope, jobs, now)
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

func preferenceFromModel(stored models.JobRadarPreference) (Preference, error) {
	criteria, err := CriteriaFromJSON(stored.Criteria)
	if err != nil {
		return Preference{}, fmt.Errorf("decode job radar preference criteria: %w", err)
	}
	scope := BuildSearchScope(criteria)
	fingerprint := stored.SearchFingerprint
	if fingerprint == "" {
		fingerprint = scope.Fingerprint
	}
	query := stored.SearchQuery
	if query == "" {
		query = scope.Query
	}
	return Preference{
		Criteria:          criteria,
		SearchFingerprint: fingerprint,
		SearchQuery:       query,
		UpdatedAt:         stored.UpdatedAt,
	}, nil
}
