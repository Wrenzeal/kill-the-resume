package httpx

import (
	"encoding/json"
	"testing"
)

type periodDoc struct {
	Projects  []periodItem `json:"projects"`
	Work      []periodItem `json:"work"`
	Education []periodItem `json:"education"`
	Schema    string       `json:"schema"`
	Version   int          `json:"version"`
}

type periodItem struct {
	Period normalizedPeriod `json:"period"`
}

func TestNormalizeResumeContentJSONPeriodFields(t *testing.T) {
	raw := json.RawMessage(`{
		"projects":[{"period":"2023-03 — 至今"}],
		"work":[{"period":"2024.05 — 2026.06"}],
		"education":[{"period":{"start":"2018年09","end":"2022/06","isPresent":false}}]
	}`)

	normalized, err := normalizeResumeContentJSON(raw)
	if err != nil {
		t.Fatalf("normalize content: %v", err)
	}

	var doc periodDoc
	if err := json.Unmarshal(normalized, &doc); err != nil {
		t.Fatalf("unmarshal normalized content: %v", err)
	}

	assertPeriod(t, doc.Projects[0].Period, normalizedPeriod{Start: "2023-03", End: "", IsPresent: true})
	assertPeriod(t, doc.Work[0].Period, normalizedPeriod{Start: "2024-05", End: "2026-06", IsPresent: false})
	assertPeriod(t, doc.Education[0].Period, normalizedPeriod{Start: "2018-09", End: "2022-06", IsPresent: false})
	assertSchemaVersion(t, doc.Schema, doc.Version)
}

func TestNormalizeResumeContentJSONPresentObjectClearsEnd(t *testing.T) {
	raw := json.RawMessage(`{"work":[{"period":{"start":"2024-01","end":"2026-06","isPresent":true}}]}`)

	normalized, err := normalizeResumeContentJSON(raw)
	if err != nil {
		t.Fatalf("normalize content: %v", err)
	}

	var doc periodDoc
	if err := json.Unmarshal(normalized, &doc); err != nil {
		t.Fatalf("unmarshal normalized content: %v", err)
	}

	assertPeriod(t, doc.Work[0].Period, normalizedPeriod{Start: "2024-01", End: "", IsPresent: true})
	assertSchemaVersion(t, doc.Schema, doc.Version)
}

func TestNormalizeResumeContentJSONRejectsInvalidJSON(t *testing.T) {
	if _, err := normalizeResumeContentJSON(json.RawMessage(`{"projects":[`)); err == nil {
		t.Fatal("expected invalid JSON error")
	}
}

func TestNormalizeResumeContentJSONRejectsNonObjectJSON(t *testing.T) {
	if _, err := normalizeResumeContentJSON(json.RawMessage(`[]`)); err == nil {
		t.Fatal("expected non-object JSON error")
	}
}

func TestNormalizeResumeContentJSONAddsSchemaVersion(t *testing.T) {
	normalized, err := normalizeResumeContentJSON(json.RawMessage(`{"schema":"legacy","version":0}`))
	if err != nil {
		t.Fatalf("normalize content: %v", err)
	}

	var doc periodDoc
	if err := json.Unmarshal(normalized, &doc); err != nil {
		t.Fatalf("unmarshal normalized content: %v", err)
	}
	assertSchemaVersion(t, doc.Schema, doc.Version)
}

func assertPeriod(t *testing.T, got normalizedPeriod, want normalizedPeriod) {
	t.Helper()
	if got != want {
		t.Fatalf("period mismatch: got %+v want %+v", got, want)
	}
}

func assertSchemaVersion(t *testing.T, schema string, version int) {
	t.Helper()
	if schema != resumeContentSchema || version != resumeContentVersion {
		t.Fatalf("schema/version mismatch: got %q/%d want %q/%d", schema, version, resumeContentSchema, resumeContentVersion)
	}
}
