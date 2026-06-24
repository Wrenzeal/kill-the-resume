package httpx

import (
	"testing"

	"kill-the-resume/backend/internal/jobradar"
)

func TestSelectJobRadarImportCriteriaUsesSavedPreferenceWhenRequestHasNoScopeTerms(t *testing.T) {
	requested := jobradar.SearchCriteria{
		ExcludeKeywords: []string{"销售"},
		MinScore:        0,
	}
	preference := jobradar.SearchCriteria{
		Keywords:        []string{"后端"},
		Locations:       []string{"天津"},
		RequiredSkills:  []string{"Golang", "Java"},
		ExcludeKeywords: []string{"外包"},
		MinScore:        75,
	}

	criteria := selectJobRadarImportCriteria(requested, preference, true)
	if got := jobradar.BuildSearchScope(criteria).Fingerprint; got != jobradar.BuildSearchScope(preference).Fingerprint {
		t.Fatalf("expected saved preference scope, got %q", got)
	}
	if len(criteria.ExcludeKeywords) != 1 || criteria.ExcludeKeywords[0] != "外包" {
		t.Fatalf("expected saved preference criteria to be used wholesale, got %#v", criteria)
	}
}

func TestSelectJobRadarImportCriteriaKeepsExplicitRequestScope(t *testing.T) {
	requested := jobradar.SearchCriteria{Keywords: []string{"后端"}, Locations: []string{"天津"}}
	preference := jobradar.SearchCriteria{Keywords: []string{"前端"}, Locations: []string{"上海"}}

	criteria := selectJobRadarImportCriteria(requested, preference, true)
	if got := jobradar.BuildSearchScope(criteria).Fingerprint; got != jobradar.BuildSearchScope(requested).Fingerprint {
		t.Fatalf("expected explicit request scope to win, got %q", got)
	}
}

func TestSelectJobRadarImportCriteriaReturnsNormalizedRequestWithoutPreference(t *testing.T) {
	requested := jobradar.SearchCriteria{
		Keywords:        []string{" 后端 ", "后端"},
		ExcludeKeywords: []string{" 外包 ", "外包"},
		MinScore:        120,
	}

	criteria := selectJobRadarImportCriteria(requested, jobradar.SearchCriteria{}, false)
	if len(criteria.Keywords) != 1 || criteria.Keywords[0] != "后端" {
		t.Fatalf("expected request keywords to be normalized, got %#v", criteria.Keywords)
	}
	if criteria.MinScore != 100 {
		t.Fatalf("expected min score to be clamped, got %d", criteria.MinScore)
	}
}
