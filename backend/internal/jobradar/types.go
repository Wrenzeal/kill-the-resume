package jobradar

import (
	"context"
	"strings"
	"time"

	"kill-the-resume/backend/internal/models"
)

const day = 24 * time.Hour

const (
	FreshnessHot     = "hot"
	FreshnessNormal  = "normal"
	FreshnessStale   = "stale"
	FreshnessExpired = "expired"
)

const SourceRemotive = "Remotive"

var FreshnessPolicy = struct {
	HotWithinDays    int `json:"hotWithinDays"`
	NormalWithinDays int `json:"normalWithinDays"`
	StaleWithinDays  int `json:"staleWithinDays"`
	DeleteAfterDays  int `json:"deleteAfterDays"`
}{
	HotWithinDays:    7,
	NormalWithinDays: 30,
	StaleWithinDays:  45,
	DeleteAfterDays:  60,
}

type SearchCriteria struct {
	Keywords        []string `json:"keywords"`
	Locations       []string `json:"locations"`
	CompanyNatures  []string `json:"companyNatures"`
	RequiredSkills  []string `json:"requiredSkills"`
	ExcludeKeywords []string `json:"excludeKeywords"`
	MinScore        int      `json:"minScore"`
}

type MatchTag struct {
	Kind  string `json:"kind"`
	Label string `json:"label"`
	Code  string `json:"code,omitempty"`
}

type MatchResult struct {
	ID               string     `json:"id"`
	SourceName       string     `json:"sourceName"`
	SourceJobID      string     `json:"sourceJobId"`
	SourceURL        string     `json:"sourceUrl"`
	Title            string     `json:"title"`
	CompanyName      string     `json:"companyName"`
	CompanyNature    string     `json:"companyNature"`
	Location         string     `json:"location"`
	Salary           string     `json:"salary"`
	Responsibilities []string   `json:"responsibilities"`
	Requirements     []string   `json:"requirements"`
	Description      string     `json:"description"`
	RawText          string     `json:"rawText,omitempty"`
	PostedAt         time.Time  `json:"postedAt"`
	FirstSeenAt      time.Time  `json:"firstSeenAt"`
	LastSeenAt       time.Time  `json:"lastSeenAt"`
	FetchedAt        time.Time  `json:"fetchedAt"`
	ExpiresAt        time.Time  `json:"expiresAt"`
	MatchPercent     int        `json:"matchPercent"`
	MatchTags        []MatchTag `json:"matchTags"`
	WarningTags      []MatchTag `json:"warningTags"`
	FreshnessStatus  string     `json:"freshnessStatus"`
	FreshnessLabel   string     `json:"freshnessLabel"`
	FreshnessRank    int        `json:"freshnessRank"`
	SortScore        int        `json:"sortScore"`
}

type SearchMeta struct {
	SourceName     string     `json:"sourceName"`
	CachedCount    int64      `json:"cachedCount"`
	ExpiredCount   int64      `json:"expiredCount"`
	ExpiredDeleted int64      `json:"expiredDeleted"`
	SyncedAt       *time.Time `json:"syncedAt,omitempty"`
	SyncError      string     `json:"syncError,omitempty"`
}

type SearchResponse struct {
	Jobs   []MatchResult `json:"jobs"`
	Policy any           `json:"policy"`
	Meta   SearchMeta    `json:"meta"`
}

type SyncResult struct {
	Fetched        int
	Upserted       int
	ExpiredDeleted int64
	SyncedAt       time.Time
}

type SourceClient interface {
	Fetch(ctx context.Context, query SourceQuery) ([]models.JobPosting, error)
}

type SourceQuery struct {
	Criteria SearchCriteria
	Limit    int
}

func NormalizeCriteria(criteria SearchCriteria) SearchCriteria {
	return SearchCriteria{
		Keywords:        DedupeTokens(criteria.Keywords),
		Locations:       DedupeTokens(criteria.Locations),
		CompanyNatures:  DedupeTokens(criteria.CompanyNatures),
		RequiredSkills:  DedupeTokens(criteria.RequiredSkills),
		ExcludeKeywords: DedupeTokens(criteria.ExcludeKeywords),
		MinScore:        clamp(criteria.MinScore, 0, 100),
	}
}

func DedupeTokens(tokens []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(tokens))
	for _, token := range tokens {
		trimmed := strings.TrimSpace(token)
		key := normalizeText(trimmed)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}
