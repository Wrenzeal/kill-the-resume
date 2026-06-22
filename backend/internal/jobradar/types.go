package jobradar

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
	"strings"
	"time"
	"unicode"

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

type SearchScope struct {
	Fingerprint string
	Query       string
	Terms       []string
	Criteria    SearchCriteria
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
	SourceName        string     `json:"sourceName"`
	SearchFingerprint string     `json:"searchFingerprint"`
	SearchQuery       string     `json:"searchQuery"`
	CachedCount       int64      `json:"cachedCount"`
	ExpiredCount      int64      `json:"expiredCount"`
	ExpiredDeleted    int64      `json:"expiredDeleted"`
	CacheHit          bool       `json:"cacheHit"`
	SyncedAt          *time.Time `json:"syncedAt,omitempty"`
	LastSyncedAt      *time.Time `json:"lastSyncedAt,omitempty"`
	SyncError         string     `json:"syncError,omitempty"`
}

type SearchResponse struct {
	Jobs   []MatchResult `json:"jobs"`
	Policy any           `json:"policy"`
	Meta   SearchMeta    `json:"meta"`
}

type SyncResult struct {
	Fetched        int
	Upserted       int
	Linked         int
	ExpiredDeleted int64
	SyncedAt       time.Time
}

type SourceClient interface {
	Fetch(ctx context.Context, query SourceQuery) ([]models.JobPosting, error)
}

type SourceQuery struct {
	Criteria SearchCriteria
	Terms    []string
	Limit    int
}

func BuildSearchScope(criteria SearchCriteria) SearchScope {
	criteria = NormalizeCriteria(criteria)
	scopeTerms := SearchScopeTerms(criteria)
	sourceTerms := SourceSearchTerms(criteria)
	fingerprintTerms := make([]string, 0, len(scopeTerms))
	for _, term := range scopeTerms {
		fingerprintTerms = append(fingerprintTerms, normalizeText(term))
	}
	sort.Strings(fingerprintTerms)
	if len(fingerprintTerms) == 0 {
		fingerprintTerms = []string{"all"}
	}
	payload := SourceRemotive + ":" + strings.Join(fingerprintTerms, "\x00")
	sum := sha256.Sum256([]byte(payload))
	fingerprint := "remotive:" + hex.EncodeToString(sum[:])[:24]
	query := strings.Join(scopeTerms, " ")
	if query == "" {
		query = "all"
	}
	return SearchScope{Fingerprint: fingerprint, Query: query, Terms: sourceTerms, Criteria: criteria}
}

func SearchScopeTerms(criteria SearchCriteria) []string {
	terms := append([]string{}, criteria.Keywords...)
	terms = append(terms, criteria.RequiredSkills...)
	terms = append(terms, criteria.Locations...)
	terms = append(terms, criteria.CompanyNatures...)
	return DedupeTokens(terms)
}

func SourceSearchTerms(criteria SearchCriteria) []string {
	terms := []string{}
	for _, token := range append(append([]string{}, criteria.Keywords...), criteria.RequiredSkills...) {
		terms = append(terms, sourceQueryTerms(token)...)
	}
	terms = DedupeTokens(terms)
	if len(terms) > 0 {
		return terms
	}

	for _, token := range append(append([]string{}, criteria.Locations...), criteria.CompanyNatures...) {
		terms = append(terms, sourceQueryTerms(token)...)
	}
	return DedupeTokens(terms)
}

func sourceQueryTerms(token string) []string {
	token = strings.TrimSpace(token)
	if token == "" {
		return nil
	}
	expansions := sourceTermExpansionsForToken(token)
	if containsHan(token) && len(expansions) > 0 {
		return expansions
	}
	return append([]string{token}, expansions...)
}

type sourceTermExpansion struct {
	contains string
	terms    []string
}

var sourceTermExpansions = []sourceTermExpansion{
	{contains: "前端", terms: []string{"Frontend"}},
	{contains: "后端", terms: []string{"Backend"}},
	{contains: "服务端", terms: []string{"Backend"}},
	{contains: "全栈", terms: []string{"Full Stack", "Fullstack"}},
	{contains: "架构", terms: []string{"Architect"}},
	{contains: "远程", terms: []string{"Remote"}},
	{contains: "上海", terms: []string{"Shanghai"}},
	{contains: "北京", terms: []string{"Beijing"}},
	{contains: "深圳", terms: []string{"Shenzhen"}},
	{contains: "杭州", terms: []string{"Hangzhou"}},
	{contains: "广州", terms: []string{"Guangzhou"}},
	{contains: "外企", terms: []string{"International"}},
	{contains: "创业", terms: []string{"Startup"}},
	{contains: "非外包", terms: []string{"Product"}},
	{contains: "不外包", terms: []string{"Product"}},
	{contains: "外包", terms: []string{"Outsourcing"}},
	{contains: "驻场", terms: []string{"Onsite"}},
	{contains: "销售", terms: []string{"Sales"}},
	{contains: "人工智能", terms: []string{"AI", "Machine Learning"}},
	{contains: "机器学习", terms: []string{"Machine Learning"}},
	{contains: "数据", terms: []string{"Data"}},
}

func sourceTermExpansionsForToken(token string) []string {
	normalized := normalizeText(token)
	terms := []string{}
	for _, expansion := range sourceTermExpansions {
		if expansion.contains == "外包" && strings.Contains(normalized, "非外包") {
			continue
		}
		if expansion.contains == "外包" && strings.Contains(normalized, "不外包") {
			continue
		}
		if strings.Contains(normalized, expansion.contains) {
			terms = append(terms, expansion.terms...)
		}
	}
	return DedupeTokens(terms)
}

func tokenSearchVariants(token string) []string {
	return DedupeTokens(append([]string{token}, sourceTermExpansionsForToken(token)...))
}

func containsHan(value string) bool {
	for _, r := range value {
		if unicode.Is(unicode.Han, r) {
			return true
		}
	}
	return false
}

func CriteriaJSON(criteria SearchCriteria) models.JSONB {
	raw, err := json.Marshal(NormalizeCriteria(criteria))
	if err != nil {
		return models.NewJSONB([]byte(`{}`))
	}
	return models.NewJSONB(raw)
}

func CriteriaFromJSON(raw models.JSONB) (SearchCriteria, error) {
	if len(raw) == 0 {
		return NormalizeCriteria(SearchCriteria{}), nil
	}
	var criteria SearchCriteria
	if err := json.Unmarshal(raw, &criteria); err != nil {
		return SearchCriteria{}, err
	}
	return NormalizeCriteria(criteria), nil
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
