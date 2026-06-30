package jobradar

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"strings"
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
	ImportPostingForScope(ctx context.Context, scope SearchScope, job models.JobPosting, seenAt time.Time) (models.JobPosting, error)
	ListVisibleForScope(ctx context.Context, scope SearchScope, now time.Time, limit int) ([]models.JobPosting, error)
	CachedCountForScope(ctx context.Context, scope SearchScope) (int64, error)
	ExpiredCountForScope(ctx context.Context, scope SearchScope, now time.Time) (int64, error)
	CleanupExpired(ctx context.Context, now time.Time) (int64, error)
	SavePreference(ctx context.Context, userID uuid.UUID, criteria SearchCriteria) (models.JobRadarPreference, error)
	GetPreference(ctx context.Context, userID uuid.UUID) (models.JobRadarPreference, bool, error)
	ListStatesForJobs(ctx context.Context, userID uuid.UUID, jobIDs []uuid.UUID) (map[uuid.UUID]models.JobRadarJobState, error)
	SaveJobState(ctx context.Context, userID uuid.UUID, jobID uuid.UUID, input StateUpdateInput) (models.JobRadarJobState, error)
}

type ServiceConfig struct {
	SyncEnabled  bool
	SyncInterval time.Duration
	MaxResults   int
}

type SearchOptions struct {
	ForceRefresh bool
	UserID       uuid.UUID
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

	results := SearchPostings(jobs, scope.Criteria, now, s.maxResults)
	if options.UserID != uuid.Nil {
		if err := s.attachStates(ctx, options.UserID, results); err != nil {
			return SearchResponse{}, err
		}
	}

	return SearchResponse{
		Jobs:   results,
		Policy: FreshnessPolicy,
		Meta:   meta,
	}, nil
}

func (s *Service) ImportPosting(ctx context.Context, input ImportPostingInput) (ImportResponse, error) {
	if s == nil || s.repo == nil {
		return ImportResponse{}, fmt.Errorf("job radar service is unavailable")
	}

	now := time.Now().UTC()
	scope := BuildSearchScope(input.Criteria)
	job, err := postingFromImportInput(input, now)
	if err != nil {
		return ImportResponse{}, err
	}
	stored, err := s.repo.ImportPostingForScope(ctx, scope, job, now)
	if err != nil {
		return ImportResponse{}, err
	}
	return ImportResponse{
		Job: ScorePosting(stored, scope.Criteria, now),
		Meta: ImportMeta{
			SourceName:        stored.SourceName,
			SourceJobID:       stored.SourceJobID,
			SearchFingerprint: scope.Fingerprint,
			SearchQuery:       scope.Query,
			ImportedAt:        now,
		},
	}, nil
}

func (s *Service) SaveJobState(ctx context.Context, userID uuid.UUID, jobID uuid.UUID, input StateUpdateInput) (JobState, error) {
	if s == nil || s.repo == nil {
		return JobState{}, fmt.Errorf("job radar service is unavailable")
	}
	stored, err := s.repo.SaveJobState(ctx, userID, jobID, input)
	if err != nil {
		return JobState{}, err
	}
	return stateFromModel(stored), nil
}

func (s *Service) attachStates(ctx context.Context, userID uuid.UUID, results []MatchResult) error {
	jobIDs := make([]uuid.UUID, 0, len(results))
	for _, result := range results {
		jobID, err := uuid.Parse(result.ID)
		if err == nil {
			jobIDs = append(jobIDs, jobID)
		}
	}
	states, err := s.repo.ListStatesForJobs(ctx, userID, jobIDs)
	if err != nil {
		return fmt.Errorf("load job radar states: %w", err)
	}
	for index := range results {
		jobID, err := uuid.Parse(results[index].ID)
		if err != nil {
			continue
		}
		if state, ok := states[jobID]; ok {
			publicState := stateFromModel(state)
			results[index].State = &publicState
		}
	}
	return nil
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

func postingFromImportInput(input ImportPostingInput, now time.Time) (models.JobPosting, error) {
	sourceName := strings.TrimSpace(input.SourceName)
	if sourceName == "" {
		sourceName = SourceUserImport
	}
	sourceURL := strings.TrimSpace(input.SourceURL)
	if sourceURL == "" {
		return models.JobPosting{}, fmt.Errorf("job source url is required")
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		title = inferTitleFromRawText(input.RawText)
	}
	if title == "" {
		return models.JobPosting{}, fmt.Errorf("job title is required")
	}
	description := strings.TrimSpace(input.Description)
	rawText := strings.TrimSpace(input.RawText)
	if rawText == "" {
		rawText = description
	}
	if description == "" {
		description = rawText
	}

	job := models.JobPosting{
		SourceName:           sourceName,
		SourceJobID:          stableImportJobID(sourceName, strings.TrimSpace(input.SourceJobID), sourceURL, title, input.CompanyName, input.Location),
		SourceURL:            sourceURL,
		Title:                title,
		CompanyName:          strings.TrimSpace(input.CompanyName),
		CompanyNature:        strings.TrimSpace(input.CompanyNature),
		Location:             strings.TrimSpace(input.Location),
		Salary:               strings.TrimSpace(input.Salary),
		ResponsibilitiesText: strings.Join(DedupeTokens(input.Responsibilities), "\n"),
		RequirementsText:     strings.Join(DedupeTokens(input.Requirements), "\n"),
		Description:          truncateImportText(description, 2400),
		RawText:              truncateImportText(rawText, 8000),
		PostedAt:             now,
		FirstSeenAt:          now,
		LastSeenAt:           now,
	}
	if job.ResponsibilitiesText == "" && description != "" {
		job.ResponsibilitiesText = truncateImportText(description, 600)
	}
	if job.RequirementsText == "" {
		job.RequirementsText = strings.Join(DedupeTokens(append(input.Criteria.RequiredSkills, input.Criteria.Keywords...)), "\n")
	}
	return PreparePostingForStorage(job, now), nil
}

func stableImportJobID(sourceName, explicitID, sourceURL, title, companyName, location string) string {
	if strings.TrimSpace(explicitID) != "" {
		return strings.TrimSpace(explicitID)
	}
	canonicalURL := sourceURL
	if parsed, err := url.Parse(sourceURL); err == nil {
		parsed.Fragment = ""
		canonicalURL = parsed.String()
	}
	payload := strings.Join([]string{sourceName, canonicalURL, title, companyName, location}, "\x00")
	sum := sha256.Sum256([]byte(strings.ToLower(payload)))
	return "import:" + hex.EncodeToString(sum[:])[:24]
}

func inferTitleFromRawText(rawText string) string {
	for _, line := range strings.FieldsFunc(rawText, func(r rune) bool { return r == '\n' || r == '\r' }) {
		line = strings.TrimSpace(line)
		if line != "" {
			return truncateImportText(line, 120)
		}
	}
	return ""
}

func truncateImportText(value string, maxRunes int) string {
	value = strings.TrimSpace(value)
	if maxRunes <= 0 {
		return value
	}
	runes := []rune(value)
	if len(runes) <= maxRunes {
		return value
	}
	return string(runes[:maxRunes])
}

func stateFromModel(stored models.JobRadarJobState) JobState {
	return JobState{
		Status:       stored.Status,
		Note:         stored.Note,
		Priority:     stored.Priority,
		NextActionAt: stored.NextActionAt,
		UpdatedAt:    stored.UpdatedAt,
	}
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
