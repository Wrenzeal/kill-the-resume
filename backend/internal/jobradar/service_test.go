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

func TestForceRefreshPreservesImportedJobsInScope(t *testing.T) {
	now := time.Now().UTC()
	imported := serviceTestPosting("imported", "Imported Boss Backend Engineer", now)
	imported.SourceName = "Boss直聘"
	imported.SourceJobID = "import:boss"
	oldOnline := serviceTestPosting("old-online", "Old Online Backend Engineer", now.Add(-2*day))
	freshOnline := serviceTestPosting("fresh-online", "Fresh Online Backend Engineer", now.Add(-1*day))
	repo := &memoryRadarRepo{visible: []models.JobPosting{imported, oldOnline}}
	source := &recordingSource{jobs: []models.JobPosting{freshOnline}}
	service := &Service{
		repo:         repo,
		source:       source,
		syncEnabled:  true,
		syncInterval: 6 * time.Hour,
		maxResults:   20,
	}

	response, err := service.SearchWithOptions(context.Background(), SearchCriteria{
		Keywords:       []string{"Backend"},
		RequiredSkills: []string{"Golang"},
	}, SearchOptions{ForceRefresh: true})
	if err != nil {
		t.Fatalf("force refresh should succeed: %v", err)
	}

	ids := make(map[string]bool)
	for _, job := range response.Jobs {
		ids[job.SourceJobID] = true
	}
	if !ids["import:boss"] {
		t.Fatalf("force refresh should preserve imported job link, jobs=%#v", response.Jobs)
	}
	if !ids["fresh-online"] {
		t.Fatalf("force refresh should include fresh online job, jobs=%#v", response.Jobs)
	}
	if ids["old-online"] {
		t.Fatalf("force refresh should replace old online job link, jobs=%#v", response.Jobs)
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

func TestHasSearchScopeTermsIgnoresDisplayOnlyFilters(t *testing.T) {
	if HasSearchScopeTerms(SearchCriteria{ExcludeKeywords: []string{"外包"}, MinScore: 90}) {
		t.Fatal("exclude keywords and min score must not create a search scope")
	}
	if !HasSearchScopeTerms(SearchCriteria{Keywords: []string{"后端"}}) {
		t.Fatal("job keywords should create a search scope")
	}
	if !HasSearchScopeTerms(SearchCriteria{RequiredSkills: []string{"Golang"}, Locations: []string{"天津"}}) {
		t.Fatal("skills and locations should create a search scope")
	}
}

func TestImportPostingLinksImportedJobToCurrentScope(t *testing.T) {
	repo := &memoryRadarRepo{}
	service := &Service{repo: repo, maxResults: 20}
	criteria := SearchCriteria{
		Keywords:        []string{"Backend"},
		Locations:       []string{"Tianjin"},
		RequiredSkills:  []string{"Go", "Java"},
		ExcludeKeywords: []string{"Outsourcing"},
		MinScore:        95,
	}

	response, err := service.ImportPosting(context.Background(), ImportPostingInput{
		SourceName:    "Boss直聘",
		SourceURL:     "https://www.zhipin.com/job_detail/example.html?sid=abc#ignore",
		Title:         "后端开发工程师",
		CompanyName:   "天津示例科技",
		CompanyNature: "产品团队",
		Location:      "天津",
		Salary:        "20-30K",
		RawText:       "负责后端系统建设，要求 Golang、Java、PostgreSQL，非外包。",
		Criteria:      criteria,
	})
	if err != nil {
		t.Fatalf("import posting should succeed: %v", err)
	}

	if repo.importCalls != 1 {
		t.Fatalf("expected one import call, got %d", repo.importCalls)
	}
	if len(repo.visible) != 1 {
		t.Fatalf("expected imported job to be visible in repo, got %d", len(repo.visible))
	}
	if response.Meta.SearchFingerprint != BuildSearchScope(criteria).Fingerprint {
		t.Fatalf("unexpected search fingerprint: %#v", response.Meta)
	}
	if response.Job.SourceName != "Boss直聘" || response.Job.Title != "后端开发工程师" {
		t.Fatalf("unexpected imported job result: %#v", response.Job)
	}
	if response.Job.MatchPercent == 0 {
		t.Fatalf("expected imported job to be scored, got %#v", response.Job)
	}
	if response.Job.SourceJobID == "" || !strings.HasPrefix(response.Job.SourceJobID, "import:") {
		t.Fatalf("expected stable generated source job id, got %q", response.Job.SourceJobID)
	}
}

func TestImportPostingReturnsScoreEvenBelowMinimumThreshold(t *testing.T) {
	repo := &memoryRadarRepo{}
	service := &Service{repo: repo, maxResults: 20}

	response, err := service.ImportPosting(context.Background(), ImportPostingInput{
		SourceURL: "https://jobs.example.com/weak-match",
		Title:     "Office Administrator",
		RawText:   "General office support and scheduling.",
		Criteria: SearchCriteria{
			Locations: []string{"Tianjin"},
			MinScore:  100,
		},
	})
	if err != nil {
		t.Fatalf("import should not be rejected by minScore: %v", err)
	}
	if response.Job.SourceName != SourceUserImport {
		t.Fatalf("expected default import source, got %q", response.Job.SourceName)
	}
	if response.Job.MatchPercent >= 100 {
		t.Fatalf("test setup should produce a below-threshold score, got %#v", response.Job)
	}
}

func TestSearchWithOptionsAttachesUserWorkflowState(t *testing.T) {
	postedAt := time.Now().UTC()
	job := serviceTestPosting("stateful", "Stateful Backend Engineer", postedAt)
	userID := uuid.New()
	nextActionAt := postedAt.Add(24 * time.Hour)
	repo := &memoryRadarRepo{
		visible: []models.JobPosting{job},
		states: map[uuid.UUID]models.JobRadarJobState{
			job.ID: {
				UserID:       userID,
				JobPostingID: job.ID,
				Status:       "applying",
				Note:         "tailor resume",
				Priority:     2,
				NextActionAt: &nextActionAt,
				UpdatedAt:    postedAt,
			},
		},
	}
	service := &Service{repo: repo, maxResults: 20}

	response, err := service.SearchWithOptions(context.Background(), SearchCriteria{Keywords: []string{"Backend"}}, SearchOptions{UserID: userID})
	if err != nil {
		t.Fatalf("search should attach state: %v", err)
	}
	if len(response.Jobs) != 1 || response.Jobs[0].State == nil {
		t.Fatalf("expected state on result, got %#v", response.Jobs)
	}
	if response.Jobs[0].State.Status != "applying" || response.Jobs[0].State.Note != "tailor resume" || response.Jobs[0].State.Priority != 2 {
		t.Fatalf("unexpected attached state: %#v", response.Jobs[0].State)
	}
}

func TestSaveJobStatePersistsWorkflowState(t *testing.T) {
	repo := &memoryRadarRepo{}
	service := &Service{repo: repo, maxResults: 20}
	userID := uuid.New()
	jobID := uuid.New()
	nextActionAt := time.Now().UTC().Add(48 * time.Hour)

	state, err := service.SaveJobState(context.Background(), userID, jobID, StateUpdateInput{
		Status:       "saved",
		Note:         "good fit",
		Priority:     3,
		NextActionAt: &nextActionAt,
	})
	if err != nil {
		t.Fatalf("save state should succeed: %v", err)
	}
	if state.Status != "saved" || state.Note != "good fit" || state.Priority != 3 || state.NextActionAt == nil {
		t.Fatalf("unexpected state response: %#v", state)
	}
	if repo.states[jobID].UserID != userID {
		t.Fatalf("state was not stored for user/job: %#v", repo.states[jobID])
	}
}

type memoryRadarRepo struct {
	cache          models.JobSearchCache
	visible        []models.JobPosting
	states         map[uuid.UUID]models.JobRadarJobState
	lastNeedsForce bool
	replaceCalls   int
	importCalls    int
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
	preserved := make([]models.JobPosting, 0, len(r.visible))
	for _, job := range r.visible {
		if job.SourceName != SourceRemotive {
			preserved = append(preserved, job)
		}
	}
	r.visible = append(preserved, jobs...)
	return len(jobs), len(jobs), nil
}

func (r *memoryRadarRepo) ImportPostingForScope(_ context.Context, scope SearchScope, job models.JobPosting, seenAt time.Time) (models.JobPosting, error) {
	r.importCalls++
	stored := PreparePostingForStorage(job, seenAt)
	if stored.ID == uuid.Nil {
		stored.ID = uuid.New()
	}
	r.cache.SearchFingerprint = scope.Fingerprint
	r.cache.SearchQuery = scope.Query
	r.cache.Criteria = CriteriaJSON(scope.Criteria)
	r.cache.LastSyncedAt = &seenAt
	r.visible = append([]models.JobPosting{stored}, r.visible...)
	return stored, nil
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

func (r *memoryRadarRepo) ListStatesForJobs(_ context.Context, _ uuid.UUID, jobIDs []uuid.UUID) (map[uuid.UUID]models.JobRadarJobState, error) {
	result := make(map[uuid.UUID]models.JobRadarJobState)
	for _, jobID := range jobIDs {
		if state, ok := r.states[jobID]; ok {
			result[jobID] = state
		}
	}
	return result, nil
}

func (r *memoryRadarRepo) SaveJobState(_ context.Context, userID uuid.UUID, jobID uuid.UUID, input StateUpdateInput) (models.JobRadarJobState, error) {
	if r.states == nil {
		r.states = make(map[uuid.UUID]models.JobRadarJobState)
	}
	stored := models.JobRadarJobState{
		UserID:       userID,
		JobPostingID: jobID,
		Status:       input.Status,
		Note:         input.Note,
		Priority:     input.Priority,
		NextActionAt: input.NextActionAt,
		UpdatedAt:    time.Now().UTC(),
	}
	r.states[jobID] = stored
	return stored, nil
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
