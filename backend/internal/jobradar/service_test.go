package jobradar

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"kill-the-resume/backend/internal/models"

	"github.com/google/uuid"
)

func TestForceRefreshReplacesScopeWithFreshSourceResults(t *testing.T) {
	now := time.Now().UTC()
	oldCached := serviceTestPosting("old-cached", "Old Cached Backend Engineer", now.Add(-2*day))
	freshOnline := serviceTestPosting("fresh-online", "Fresh Online Backend Engineer", now.Add(-1*day))
	repo := &memoryRadarRepo{visible: []models.JobPosting{oldCached}}
	source := &recordingSource{jobs: []models.JobPosting{freshOnline}}
	service := &Service{
		repo:         repo,
		source:       source,
		syncEnabled:  true,
		syncInterval: 6 * time.Hour,
		maxResults:   20,
	}

	response, err := service.SearchWithOptions(context.Background(), SearchCriteria{
		Keywords: []string{"Backend"},
		MinScore: 10,
	}, SearchOptions{ForceRefresh: true})
	if err != nil {
		t.Fatalf("force refresh should succeed: %v", err)
	}

	if source.calls != 1 || !source.query.ForceRefresh {
		t.Fatalf("expected source to be called with force refresh, calls=%d query=%#v", source.calls, source.query)
	}
	if !repo.lastNeedsForce || repo.replaceCalls != 1 {
		t.Fatalf("expected repo to force sync and replace old scope, force=%v replaceCalls=%d", repo.lastNeedsForce, repo.replaceCalls)
	}
	if response.Meta.CacheHit {
		t.Fatalf("force refresh should not be reported as cache hit: %#v", response.Meta)
	}
	if !response.Meta.ForceRefresh || response.Meta.FetchedCount != 1 || response.Meta.LinkedCount != 1 {
		t.Fatalf("expected online refresh counts in meta: %#v", response.Meta)
	}
	if response.Meta.CachedCount != 1 {
		t.Fatalf("expected cached count to reflect fresh scope links, got %d", response.Meta.CachedCount)
	}
	if len(response.Jobs) != 1 {
		t.Fatalf("expected one fresh result, got %d: %#v", len(response.Jobs), response.Jobs)
	}
	if response.Jobs[0].SourceJobID != "fresh-online" || strings.Contains(response.Jobs[0].Title, "Old Cached") {
		t.Fatalf("force refresh leaked old cached result: %#v", response.Jobs[0])
	}
}

func TestForceRefreshReturnsErrorInsteadOfCachedFallbackWhenSourceFails(t *testing.T) {
	oldCached := serviceTestPosting("old-cached", "Old Cached Backend Engineer", time.Now().UTC().Add(-2*day))
	repo := &memoryRadarRepo{visible: []models.JobPosting{oldCached}}
	source := &recordingSource{err: errors.New("source unavailable")}
	service := &Service{
		repo:         repo,
		source:       source,
		syncEnabled:  true,
		syncInterval: 6 * time.Hour,
		maxResults:   20,
	}

	_, err := service.SearchWithOptions(context.Background(), SearchCriteria{
		Keywords: []string{"Backend"},
		MinScore: 10,
	}, SearchOptions{ForceRefresh: true})
	if err == nil {
		t.Fatal("expected force refresh to fail when source fetch fails")
	}
	if !strings.Contains(err.Error(), "refresh online job source") {
		t.Fatalf("expected refresh-specific error, got %v", err)
	}
	if repo.replaceCalls != 0 {
		t.Fatalf("failed source refresh should not replace cached scope, replaceCalls=%d", repo.replaceCalls)
	}
}

type memoryRadarRepo struct {
	cache          models.JobSearchCache
	visible        []models.JobPosting
	lastNeedsForce bool
	replaceCalls   int
}

func (r *memoryRadarRepo) EnsureSearchCache(_ context.Context, scope SearchScope) (models.JobSearchCache, error) {
	r.cache.SearchFingerprint = scope.Fingerprint
	r.cache.SearchQuery = scope.Query
	r.cache.Criteria = CriteriaJSON(scope.Criteria)
	return r.cache, nil
}

func (r *memoryRadarRepo) NeedsSearchSync(ctx context.Context, scope SearchScope, _ time.Time, _ time.Duration, force bool) (models.JobSearchCache, bool, error) {
	r.lastNeedsForce = force
	cache, err := r.EnsureSearchCache(ctx, scope)
	return cache, true, err
}

func (r *memoryRadarRepo) MarkSearchSynced(_ context.Context, _ SearchScope, syncedAt time.Time) error {
	r.cache.LastSyncedAt = &syncedAt
	return nil
}

func (r *memoryRadarRepo) ReplaceManyForScope(_ context.Context, _ SearchScope, jobs []models.JobPosting, _ time.Time) (int, int, error) {
	r.replaceCalls++
	r.visible = append([]models.JobPosting(nil), jobs...)
	return len(jobs), len(jobs), nil
}

func (r *memoryRadarRepo) ListVisibleForScope(_ context.Context, _ SearchScope, _ time.Time, limit int) ([]models.JobPosting, error) {
	jobs := append([]models.JobPosting(nil), r.visible...)
	if limit > 0 && len(jobs) > limit {
		return jobs[:limit], nil
	}
	return jobs, nil
}

func (r *memoryRadarRepo) CachedCountForScope(context.Context, SearchScope) (int64, error) {
	return int64(len(r.visible)), nil
}

func (r *memoryRadarRepo) ExpiredCountForScope(context.Context, SearchScope, time.Time) (int64, error) {
	return 0, nil
}

func (r *memoryRadarRepo) CleanupExpired(context.Context, time.Time) (int64, error) {
	return 0, nil
}

func (r *memoryRadarRepo) SavePreference(context.Context, uuid.UUID, SearchCriteria) (models.JobRadarPreference, error) {
	return models.JobRadarPreference{}, nil
}

func (r *memoryRadarRepo) GetPreference(context.Context, uuid.UUID) (models.JobRadarPreference, bool, error) {
	return models.JobRadarPreference{}, false, nil
}

type recordingSource struct {
	jobs  []models.JobPosting
	err   error
	query SourceQuery
	calls int
}

func (s *recordingSource) Fetch(_ context.Context, query SourceQuery) ([]models.JobPosting, error) {
	s.calls++
	s.query = query
	if s.err != nil {
		return nil, s.err
	}
	return append([]models.JobPosting(nil), s.jobs...), nil
}

func serviceTestPosting(id, title string, postedAt time.Time) models.JobPosting {
	return PreparePostingForStorage(models.JobPosting{
		ID:                   uuid.New(),
		SourceName:           SourceRemotive,
		SourceJobID:          id,
		SourceURL:            "https://example.com/jobs/" + id,
		Title:                title,
		CompanyName:          "Example Co",
		CompanyNature:        "Product Team",
		Location:             "Remote",
		Salary:               "USD 100k",
		ResponsibilitiesText: "Build backend systems.",
		RequirementsText:     "Backend\nGo\nPostgreSQL",
		Description:          title + " with Go and PostgreSQL.",
		PostedAt:             postedAt,
		FirstSeenAt:          postedAt,
		LastSeenAt:           postedAt,
	}, time.Now().UTC())
}
