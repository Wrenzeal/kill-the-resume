package jobradar

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRemotiveClientMapsPublicAPIResponseToJobPostings(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("search"); !strings.Contains(got, "React") || !strings.Contains(got, "TypeScript") {
			t.Fatalf("expected search query to include criteria tokens, got %q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"job-count": 1,
			"jobs": [{
				"id": 2090887,
				"url": "https://remotive.com/remote-jobs/software-dev/react-engineer-2090887",
				"title": "React Engineer",
				"company_name": "Remote Co",
				"category": "Software Development",
				"tags": ["React", "TypeScript", "PostgreSQL"],
				"job_type": "full_time",
				"publication_date": "2026-06-19T19:46:09",
				"candidate_required_location": "Worldwide",
				"salary": "USD 80k-100k",
				"description": "<p>Build product dashboards.</p><p>Own frontend quality gates.</p>"
			}]
		}`))
	}))
	defer server.Close()

	client := NewRemotiveClient(server.URL, time.Second)
	jobs, err := client.Fetch(context.Background(), SourceQuery{Criteria: SearchCriteria{Keywords: []string{"React"}, RequiredSkills: []string{"TypeScript"}}, Terms: []string{"React", "TypeScript"}, Limit: 1})
	if err != nil {
		t.Fatalf("fetch failed: %v", err)
	}
	if len(jobs) != 1 {
		t.Fatalf("expected one job, got %d", len(jobs))
	}
	job := jobs[0]
	if job.SourceName != SourceRemotive || job.SourceJobID != "2090887" || job.SourceURL == "" {
		t.Fatalf("unexpected source mapping: %#v", job)
	}
	if strings.Contains(job.Description, "<p>") || !strings.Contains(job.RequirementsText, "TypeScript") {
		t.Fatalf("expected cleaned description and tags in requirements: %#v", job)
	}
	if job.ExpiresAt.IsZero() || job.FreshnessStatus == "" {
		t.Fatalf("expected lifecycle fields: %#v", job)
	}
}

func TestRemotiveClientForceRefreshBypassesIntermediaryCaches(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Cache-Control"); got != "no-cache" {
			t.Fatalf("expected no-cache Cache-Control header, got %q", got)
		}
		if got := r.Header.Get("Pragma"); got != "no-cache" {
			t.Fatalf("expected no-cache Pragma header, got %q", got)
		}
		if got := r.URL.Query().Get("_ktr_refresh"); got == "" {
			t.Fatal("expected refresh cache-buster query parameter")
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"job-count": 0, "jobs": []}`))
	}))
	defer server.Close()

	client := NewRemotiveClient(server.URL, time.Second)
	if _, err := client.Fetch(context.Background(), SourceQuery{Terms: []string{"Backend"}, Limit: 1, ForceRefresh: true}); err != nil {
		t.Fatalf("force refresh fetch failed: %v", err)
	}
}
