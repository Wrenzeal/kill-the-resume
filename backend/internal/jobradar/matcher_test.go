package jobradar

import (
	"testing"
	"time"

	"kill-the-resume/backend/internal/models"
)

func TestSearchPostingsRanksFiltersAndKeepsSourceMetadata(t *testing.T) {
	now := time.Date(2026, 6, 22, 0, 0, 0, 0, time.UTC)
	jobs := []models.JobPosting{
		makePosting("strong", "Senior Frontend Engineer React Next.js", "Foreign Company / Non-outsourcing", "Shanghai · Remote", "TypeScript\nNode.js\nPostgreSQL", now.Add(-2*day)),
		makePosting("weak", "Java Backend Engineer", "Private Company", "Shenzhen", "Java\nMySQL", now.Add(-1*day)),
		makePosting("expired", "React Frontend Engineer", "Foreign Company", "Shanghai", "React\nTypeScript", now.Add(-50*day)),
	}
	jobs[1].ResponsibilitiesText = "Maintain Java services."
	jobs[1].Description = "Backend platform role with Java and MySQL."

	results := SearchPostings(jobs, SearchCriteria{
		Keywords:        []string{"Frontend", "React", "Next.js"},
		Locations:       []string{"Shanghai", "Remote"},
		CompanyNatures:  []string{"Foreign Company", "Non-outsourcing"},
		RequiredSkills:  []string{"TypeScript", "Node.js", "PostgreSQL"},
		ExcludeKeywords: []string{"Outsourcing", "Onsite"},
		MinScore:        10,
	}, now, 10)

	if len(results) != 1 {
		t.Fatalf("expected one visible match, got %d: %#v", len(results), results)
	}
	if results[0].SourceName != SourceRemotive || results[0].SourceJobID != "strong" || results[0].SourceURL != "https://example.com/jobs/strong" {
		t.Fatalf("source metadata was not preserved: %#v", results[0])
	}
	if results[0].FreshnessStatus != FreshnessHot {
		t.Fatalf("expected hot freshness, got %q", results[0].FreshnessStatus)
	}
	if results[0].MatchPercent < 80 {
		t.Fatalf("expected strong match >=80, got %d", results[0].MatchPercent)
	}
}

func TestPreparePostingForStorageAppliesFreshnessAndExpiryPolicy(t *testing.T) {
	now := time.Date(2026, 6, 22, 0, 0, 0, 0, time.UTC)
	posted := now.Add(-31 * day)
	posting := PreparePostingForStorage(models.JobPosting{
		SourceName:  SourceRemotive,
		SourceJobID: "cache-1",
		SourceURL:   "https://example.com/jobs/cache-1",
		Title:       "Frontend Engineer",
		PostedAt:    posted,
	}, now)

	if posting.FreshnessStatus != FreshnessStale {
		t.Fatalf("expected stale status, got %q", posting.FreshnessStatus)
	}
	if !posting.ExpiresAt.Equal(posted.Add(time.Duration(FreshnessPolicy.StaleWithinDays) * day)) {
		t.Fatalf("unexpected expiresAt: %s", posting.ExpiresAt)
	}
	if posting.FetchedAt.IsZero() || posting.LastSeenAt.IsZero() || posting.FirstSeenAt.IsZero() {
		t.Fatalf("expected lifecycle timestamps to be populated: %#v", posting)
	}
}

func TestRiskTextDoesNotPenalizeNonOutsourcing(t *testing.T) {
	now := time.Date(2026, 6, 22, 0, 0, 0, 0, time.UTC)
	safe := makePosting("safe", "React Frontend Engineer", "Product Team / Non-outsourcing", "Shanghai", "React\nTypeScript", now.Add(-1*day))
	risky := makePosting("risky", "React Frontend Engineer Onsite", "Outsourcing Vendor", "Shanghai", "React\nTypeScript", now.Add(-1*day))
	risky.RequirementsText = "Accepts outsourcing delivery and client onsite support."
	criteria := SearchCriteria{
		Keywords:        []string{"React", "Frontend"},
		Locations:       []string{"Shanghai"},
		CompanyNatures:  []string{"Product Team"},
		RequiredSkills:  []string{"TypeScript"},
		ExcludeKeywords: []string{"Outsourcing", "Onsite"},
	}

	safeScore := ScorePosting(safe, criteria, now)
	riskyScore := ScorePosting(risky, criteria, now)

	for _, tag := range safeScore.WarningTags {
		if tag.Kind == "risk" {
			t.Fatalf("safe non-outsourcing posting should not have risk tags: %#v", safeScore.WarningTags)
		}
	}
	if riskyScore.MatchPercent >= safeScore.MatchPercent {
		t.Fatalf("expected risky score below safe score, got safe=%d risky=%d", safeScore.MatchPercent, riskyScore.MatchPercent)
	}
}

func makePosting(id, title, nature, location, requirements string, postedAt time.Time) models.JobPosting {
	return PreparePostingForStorage(models.JobPosting{
		SourceName:           SourceRemotive,
		SourceJobID:          id,
		SourceURL:            "https://example.com/jobs/" + id,
		Title:                title,
		CompanyName:          "Example Co",
		CompanyNature:        nature,
		Location:             location,
		Salary:               "USD 80k-120k",
		ResponsibilitiesText: "Build React and Next.js product consoles.",
		RequirementsText:     requirements,
		Description:          "Frontend platform role with React, Next.js and TypeScript.",
		PostedAt:             postedAt,
		FirstSeenAt:          postedAt,
		LastSeenAt:           postedAt,
	}, time.Date(2026, 6, 22, 0, 0, 0, 0, time.UTC))
}
