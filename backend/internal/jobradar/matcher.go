package jobradar

import (
	"sort"
	"strings"
	"time"

	"kill-the-resume/backend/internal/models"
)

var freshnessRanks = map[string]int{
	FreshnessHot:     4,
	FreshnessNormal:  3,
	FreshnessStale:   2,
	FreshnessExpired: 0,
}

func PreparePostingForStorage(job models.JobPosting, now time.Time) models.JobPosting {
	job.SourceName = strings.TrimSpace(job.SourceName)
	job.SourceJobID = strings.TrimSpace(job.SourceJobID)
	job.SourceURL = strings.TrimSpace(job.SourceURL)
	job.Title = strings.TrimSpace(job.Title)
	job.CompanyName = strings.TrimSpace(job.CompanyName)
	job.CompanyNature = strings.TrimSpace(job.CompanyNature)
	job.Location = strings.TrimSpace(job.Location)
	job.Salary = strings.TrimSpace(job.Salary)
	job.ResponsibilitiesText = normalizeLines(job.ResponsibilitiesText)
	job.RequirementsText = normalizeLines(job.RequirementsText)
	job.Description = strings.TrimSpace(job.Description)
	job.RawText = strings.TrimSpace(job.RawText)

	if now.IsZero() {
		now = time.Now().UTC()
	}
	if job.PostedAt.IsZero() {
		job.PostedAt = now
	}
	if job.FirstSeenAt.IsZero() {
		job.FirstSeenAt = now
	}
	if job.LastSeenAt.IsZero() {
		job.LastSeenAt = now
	}
	job.FetchedAt = now
	job.ExpiresAt = DisplayExpiresAt(job)
	job.FreshnessStatus = FreshnessStatus(job, now)

	return job
}

func FreshnessStatus(job models.JobPosting, now time.Time) string {
	ageDays := JobAgeDays(job, now)
	if ageDays <= FreshnessPolicy.HotWithinDays {
		return FreshnessHot
	}
	if ageDays <= FreshnessPolicy.NormalWithinDays {
		return FreshnessNormal
	}
	if ageDays <= FreshnessPolicy.StaleWithinDays {
		return FreshnessStale
	}
	return FreshnessExpired
}

func JobAgeDays(job models.JobPosting, now time.Time) int {
	if now.IsZero() {
		now = time.Now().UTC()
	}
	age := now.Sub(SignalTime(job))
	if age < 0 {
		return 0
	}
	return int(age / day)
}

func DisplayExpiresAt(job models.JobPosting) time.Time {
	return SignalTime(job).Add(time.Duration(FreshnessPolicy.StaleWithinDays) * day)
}

func DeleteAfterAt(job models.JobPosting) time.Time {
	return SignalTime(job).Add(time.Duration(FreshnessPolicy.DeleteAfterDays) * day)
}

func SignalTime(job models.JobPosting) time.Time {
	if !job.PostedAt.IsZero() {
		return job.PostedAt
	}
	if !job.FirstSeenAt.IsZero() {
		return job.FirstSeenAt
	}
	return time.Now().UTC()
}

func ScorePosting(job models.JobPosting, rawCriteria SearchCriteria, now time.Time) MatchResult {
	criteria := NormalizeCriteria(rawCriteria)
	text := buildSearchText(job)
	riskText := buildRiskText(job)
	freshnessStatus := FreshnessStatus(job, now)
	freshnessRank := freshnessRanks[freshnessStatus]

	keywordMatches := collectMatches(criteria.Keywords, text)
	skillMatches := collectMatches(criteria.RequiredSkills, text)
	locationMatches := collectMatches(criteria.Locations, job.Location)
	natureMatches := collectMatches(criteria.CompanyNatures, strings.Join([]string{job.CompanyNature, job.CompanyName, job.Description}, "\n"))
	excludeMatches := collectMatches(criteria.ExcludeKeywords, riskText)

	activeBuckets := []struct {
		weight int
		active bool
		ratio  float64
	}{
		{weight: 38, active: len(criteria.Keywords) > 0, ratio: ratio(len(keywordMatches), len(criteria.Keywords))},
		{weight: 32, active: len(criteria.RequiredSkills) > 0, ratio: ratio(len(skillMatches), len(criteria.RequiredSkills))},
		{weight: 16, active: len(criteria.Locations) > 0, ratio: boolRatio(len(locationMatches) > 0)},
		{weight: 14, active: len(criteria.CompanyNatures) > 0, ratio: boolRatio(len(natureMatches) > 0)},
	}
	activeWeight := 0
	weighted := 0.0
	for _, bucket := range activeBuckets {
		if !bucket.active {
			continue
		}
		activeWeight += bucket.weight
		weighted += float64(bucket.weight) * bucket.ratio
	}

	weightedScore := 100.0
	if activeWeight > 0 {
		weightedScore = weighted / float64(activeWeight) * 100
	}
	titleBonus := 0
	for _, token := range keywordMatches {
		if includesToken(job.Title, token) {
			titleBonus = 5
			break
		}
	}
	penalty := min(45, len(excludeMatches)*18)
	matchPercent := int(clampFloat(weightedScore+float64(titleBonus)-float64(penalty), 0, 100) + 0.5)

	matchTags := uniqueTags(append(append(append(append([]MatchTag{},
		createTags("keyword", keywordMatches)...),
		createTags("skill", skillMatches)...),
		createTags("location", locationMatches)...),
		createTags("company", natureMatches)...))
	warningTags := append([]MatchTag{}, createTags("risk", excludeMatches)...)
	if len(criteria.Locations) > 0 && len(locationMatches) == 0 {
		warningTags = append(warningTags, MatchTag{Kind: "gap", Label: "Location Missing", Code: "location-missing"})
	}
	if len(criteria.RequiredSkills) > 0 && len(skillMatches) == 0 {
		warningTags = append(warningTags, MatchTag{Kind: "gap", Label: "Weak Skill Match", Code: "skill-weak"})
	}
	if strings.TrimSpace(job.Salary) == "" {
		warningTags = append(warningTags, MatchTag{Kind: "gap", Label: "Salary Unknown", Code: "salary-missing"})
	}
	warningTags = uniqueTags(warningTags)

	return MatchResult{
		ID:               job.ID.String(),
		SourceName:       job.SourceName,
		SourceJobID:      job.SourceJobID,
		SourceURL:        job.SourceURL,
		Title:            job.Title,
		CompanyName:      job.CompanyName,
		CompanyNature:    job.CompanyNature,
		Location:         job.Location,
		Salary:           job.Salary,
		Responsibilities: splitLines(job.ResponsibilitiesText),
		Requirements:     splitLines(job.RequirementsText),
		Description:      job.Description,
		RawText:          job.RawText,
		PostedAt:         job.PostedAt,
		FirstSeenAt:      job.FirstSeenAt,
		LastSeenAt:       job.LastSeenAt,
		FetchedAt:        job.FetchedAt,
		ExpiresAt:        job.ExpiresAt,
		MatchPercent:     matchPercent,
		MatchTags:        matchTags,
		WarningTags:      warningTags,
		FreshnessStatus:  freshnessStatus,
		FreshnessLabel:   freshnessStatus,
		FreshnessRank:    freshnessRank,
		SortScore:        matchPercent + freshnessRank*2,
	}
}

func SearchPostings(jobs []models.JobPosting, rawCriteria SearchCriteria, now time.Time, limit int) []MatchResult {
	criteria := NormalizeCriteria(rawCriteria)
	results := make([]MatchResult, 0, len(jobs))
	for _, job := range jobs {
		result := ScorePosting(job, criteria, now)
		if result.FreshnessStatus == FreshnessExpired || result.MatchPercent < criteria.MinScore {
			continue
		}
		results = append(results, result)
	}

	sort.SliceStable(results, func(i, j int) bool {
		left, right := results[i], results[j]
		if left.SortScore != right.SortScore {
			return left.SortScore > right.SortScore
		}
		if left.MatchPercent != right.MatchPercent {
			return left.MatchPercent > right.MatchPercent
		}
		return left.PostedAt.After(right.PostedAt)
	})

	if limit > 0 && len(results) > limit {
		return results[:limit]
	}
	return results
}

func buildSearchText(job models.JobPosting) string {
	return strings.Join([]string{
		job.Title,
		job.CompanyName,
		job.CompanyNature,
		job.Location,
		job.Salary,
		job.Description,
		job.ResponsibilitiesText,
		job.RequirementsText,
		job.RawText,
	}, "\n")
}

func buildRiskText(job models.JobPosting) string {
	return strings.NewReplacer(
		"非外包", "",
		"不外包", "",
		"无外包", "",
		"不是外包", "",
		"non-outsourcing", "",
		"non outsourcing", "",
		"not outsourcing", "",
	).Replace(normalizeText(buildSearchText(job)))
}

func collectMatches(tokens []string, text string) []string {
	matches := []string{}
	for _, token := range tokens {
		if includesToken(text, token) {
			matches = append(matches, token)
		}
	}
	return matches
}

func includesToken(text string, token string) bool {
	normalizedText := normalizeText(text)
	for _, variant := range tokenSearchVariants(token) {
		normalizedToken := normalizeText(variant)
		if normalizedToken != "" && strings.Contains(normalizedText, normalizedToken) {
			return true
		}
	}
	return false
}

func normalizeText(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func createTags(kind string, labels []string) []MatchTag {
	tags := make([]MatchTag, 0, len(labels))
	for _, label := range labels {
		tags = append(tags, MatchTag{Kind: kind, Label: label})
	}
	return tags
}

func uniqueTags(tags []MatchTag) []MatchTag {
	seen := map[string]struct{}{}
	result := make([]MatchTag, 0, len(tags))
	for _, tag := range tags {
		label := strings.TrimSpace(tag.Label)
		if tag.Kind == "" || label == "" {
			continue
		}
		key := tag.Kind + ":" + normalizeText(label) + ":" + tag.Code
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		tag.Label = label
		result = append(result, tag)
	}
	return result
}

func normalizeLines(value string) string {
	return strings.Join(splitLines(value), "\n")
}

func splitLines(value string) []string {
	lines := strings.FieldsFunc(value, func(r rune) bool { return r == '\n' || r == '\r' })
	result := make([]string, 0, len(lines))
	for _, line := range lines {
		line = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "-"))
		if line != "" {
			result = append(result, line)
		}
	}
	return result
}

func ratio(hitCount int, totalCount int) float64 {
	if totalCount <= 0 {
		return 1
	}
	return clampFloat(float64(hitCount)/float64(totalCount), 0, 1)
}

func boolRatio(value bool) float64 {
	if value {
		return 1
	}
	return 0
}

func clamp(value int, minValue int, maxValue int) int {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}

func clampFloat(value float64, minValue float64, maxValue float64) float64 {
	if value < minValue {
		return minValue
	}
	if value > maxValue {
		return maxValue
	}
	return value
}
