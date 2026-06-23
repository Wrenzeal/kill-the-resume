package jobradar

import (
	"context"
	"encoding/json"
	"fmt"
	"html"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"

	"kill-the-resume/backend/internal/models"
)

var htmlTagPattern = regexp.MustCompile(`<[^>]+>`)
var whitespacePattern = regexp.MustCompile(`\s+`)

type RemotiveClient struct {
	endpoint   string
	httpClient *http.Client
}

func NewRemotiveClient(endpoint string, timeout time.Duration) *RemotiveClient {
	if strings.TrimSpace(endpoint) == "" {
		endpoint = "https://remotive.com/api/remote-jobs"
	}
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	return &RemotiveClient{
		endpoint:   strings.TrimSpace(endpoint),
		httpClient: &http.Client{Timeout: timeout},
	}
}

type remotiveResponse struct {
	JobCount int           `json:"job-count"`
	Jobs     []remotiveJob `json:"jobs"`
}

type remotiveJob struct {
	ID                        int64    `json:"id"`
	URL                       string   `json:"url"`
	Title                     string   `json:"title"`
	CompanyName               string   `json:"company_name"`
	Category                  string   `json:"category"`
	Tags                      []string `json:"tags"`
	JobType                   string   `json:"job_type"`
	PublicationDate           string   `json:"publication_date"`
	CandidateRequiredLocation string   `json:"candidate_required_location"`
	Salary                    string   `json:"salary"`
	Description               string   `json:"description"`
}

func (c *RemotiveClient) Fetch(ctx context.Context, query SourceQuery) ([]models.JobPosting, error) {
	requestURL, err := c.requestURL(query)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, requestURL, nil)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("User-Agent", "kill-the-resume-job-radar/0.1 (+https://killer.wrenzeal.top)")
	if query.ForceRefresh {
		request.Header.Set("Cache-Control", "no-cache")
		request.Header.Set("Pragma", "no-cache")
	}

	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("fetch Remotive jobs: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("fetch Remotive jobs: unexpected status %d", response.StatusCode)
	}

	var payload remotiveResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode Remotive response: %w", err)
	}

	now := time.Now().UTC()
	jobs := make([]models.JobPosting, 0, len(payload.Jobs))
	for _, item := range payload.Jobs {
		job, ok := mapRemotiveJob(item, now)
		if ok {
			jobs = append(jobs, job)
		}
	}
	return jobs, nil
}

func (c *RemotiveClient) requestURL(query SourceQuery) (string, error) {
	parsed, err := url.Parse(c.endpoint)
	if err != nil {
		return "", err
	}
	values := parsed.Query()
	search := strings.Join(DedupeTokens(query.Terms), " ")
	if search == "" {
		search = strings.Join(DedupeTokens(append(query.Criteria.Keywords, query.Criteria.RequiredSkills...)), " ")
	}
	if search != "" {
		values.Set("search", search)
	}
	if query.Limit > 0 {
		values.Set("limit", strconv.Itoa(query.Limit))
	}
	if query.ForceRefresh {
		values.Set("_ktr_refresh", strconv.FormatInt(time.Now().UnixNano(), 10))
	}
	parsed.RawQuery = values.Encode()
	return parsed.String(), nil
}

func mapRemotiveJob(item remotiveJob, now time.Time) (models.JobPosting, bool) {
	sourceID := strconv.FormatInt(item.ID, 10)
	if sourceID == "0" || strings.TrimSpace(item.URL) == "" || strings.TrimSpace(item.Title) == "" {
		return models.JobPosting{}, false
	}
	postedAt := parseRemotiveTime(item.PublicationDate, now)
	plainDescription := cleanHTML(item.Description)
	responsibilities := firstSentences(plainDescription, 4)
	if len(responsibilities) == 0 {
		responsibilities = []string{strings.TrimSpace(item.Title)}
	}
	requirements := tagsAsRequirements(item.Tags)
	if len(requirements) == 0 && item.Category != "" {
		requirements = []string{item.Category}
	}

	companyNature := strings.Join(DedupeTokens([]string{item.Category, humanizeJobType(item.JobType), "Remote"}), " / ")
	location := strings.TrimSpace(item.CandidateRequiredLocation)
	if location == "" {
		location = "Remote"
	}

	job := models.JobPosting{
		SourceName:           SourceRemotive,
		SourceJobID:          sourceID,
		SourceURL:            strings.TrimSpace(item.URL),
		Title:                strings.TrimSpace(item.Title),
		CompanyName:          strings.TrimSpace(item.CompanyName),
		CompanyNature:        companyNature,
		Location:             location,
		Salary:               strings.TrimSpace(item.Salary),
		ResponsibilitiesText: strings.Join(responsibilities, "\n"),
		RequirementsText:     strings.Join(requirements, "\n"),
		Description:          truncate(plainDescription, 1200),
		RawText:              truncate(strings.Join(append([]string{item.Title, item.CompanyName, item.Category, item.JobType, item.CandidateRequiredLocation, item.Salary, plainDescription}, item.Tags...), "\n"), 5000),
		PostedAt:             postedAt,
		FirstSeenAt:          now,
		LastSeenAt:           now,
	}
	return PreparePostingForStorage(job, now), true
}

func parseRemotiveTime(value string, fallback time.Time) time.Time {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02 15:04:05"} {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed.UTC()
		}
	}
	return fallback
}

func cleanHTML(value string) string {
	text := htmlTagPattern.ReplaceAllString(value, " ")
	text = html.UnescapeString(text)
	text = whitespacePattern.ReplaceAllString(text, " ")
	return strings.TrimSpace(text)
}

func firstSentences(text string, maxCount int) []string {
	parts := regexp.MustCompile(`[.!?。！？]+\s+`).Split(text, -1)
	result := make([]string, 0, maxCount)
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" || len([]rune(part)) < 12 {
			continue
		}
		result = append(result, truncate(part, 220))
		if len(result) >= maxCount {
			break
		}
	}
	return result
}

func tagsAsRequirements(tags []string) []string {
	tags = DedupeTokens(tags)
	if len(tags) > 12 {
		tags = tags[:12]
	}
	requirements := make([]string, 0, len(tags))
	for _, tag := range tags {
		requirements = append(requirements, tag)
	}
	return requirements
}

func humanizeJobType(value string) string {
	value = strings.TrimSpace(strings.ReplaceAll(value, "_", " "))
	if value == "" {
		return ""
	}
	return strings.Title(value)
}

func truncate(value string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	runes := []rune(strings.TrimSpace(value))
	if len(runes) <= maxRunes {
		return string(runes)
	}
	return string(runes[:maxRunes]) + "…"
}
