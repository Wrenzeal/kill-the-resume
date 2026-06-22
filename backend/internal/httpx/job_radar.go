package httpx

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"kill-the-resume/backend/internal/jobradar"

	"github.com/gin-gonic/gin"
)

type jobRadarPreferenceRequest struct {
	Criteria jobradar.SearchCriteria `json:"criteria"`
}

type jobRadarPreferenceMeta struct {
	SearchFingerprint string    `json:"searchFingerprint"`
	SearchQuery       string    `json:"searchQuery"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

func (s *Server) listJobRadarJobs(c *gin.Context) {
	if s.jobRadar == nil {
		writeError(c, http.StatusServiceUnavailable, "job radar service unavailable")
		return
	}

	criteria := jobradar.SearchCriteria{
		Keywords:        queryTokens(c, "keywords"),
		Locations:       queryTokens(c, "locations"),
		CompanyNatures:  queryTokens(c, "companyNatures"),
		RequiredSkills:  queryTokens(c, "requiredSkills"),
		ExcludeKeywords: queryTokens(c, "excludeKeywords"),
		MinScore:        queryInt(c, "minScore", 0),
	}
	response, err := s.jobRadar.SearchWithOptions(c.Request.Context(), criteria, jobradar.SearchOptions{
		ForceRefresh: queryBool(c, "refresh") || queryBool(c, "forceRefresh"),
	})
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to load job radar feed")
		return
	}
	c.JSON(http.StatusOK, response)
}

func (s *Server) getJobRadarPreference(c *gin.Context) {
	if s.jobRadar == nil {
		writeError(c, http.StatusServiceUnavailable, "job radar service unavailable")
		return
	}

	preference, found, err := s.jobRadar.GetPreference(c.Request.Context(), currentUserID(c))
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to load job radar preference")
		return
	}
	if !found {
		c.JSON(http.StatusOK, gin.H{"criteria": nil, "meta": nil})
		return
	}
	c.JSON(http.StatusOK, jobRadarPreferenceResponse(preference))
}

func (s *Server) saveJobRadarPreference(c *gin.Context) {
	if s.jobRadar == nil {
		writeError(c, http.StatusServiceUnavailable, "job radar service unavailable")
		return
	}

	var req jobRadarPreferenceRequest
	if !bindJSON(c, &req) {
		return
	}

	preference, err := s.jobRadar.SavePreference(c.Request.Context(), currentUserID(c), req.Criteria)
	if err != nil {
		writeError(c, http.StatusInternalServerError, "failed to save job radar preference")
		return
	}
	c.JSON(http.StatusOK, jobRadarPreferenceResponse(preference))
}

func jobRadarPreferenceResponse(preference jobradar.Preference) gin.H {
	return gin.H{
		"criteria": preference.Criteria,
		"meta": jobRadarPreferenceMeta{
			SearchFingerprint: preference.SearchFingerprint,
			SearchQuery:       preference.SearchQuery,
			UpdatedAt:         preference.UpdatedAt,
		},
	}
}

func queryTokens(c *gin.Context, key string) []string {
	rawValues := c.Request.URL.Query()[key]
	values := []string{}
	for _, raw := range rawValues {
		values = append(values, strings.FieldsFunc(raw, func(r rune) bool {
			return r == ',' || r == '，' || r == '、' || r == ';' || r == '；' || r == '|' || r == '\n' || r == '\r'
		})...)
	}
	return jobradar.DedupeTokens(values)
}

func queryInt(c *gin.Context, key string, fallback int) int {
	value := strings.TrimSpace(c.Query(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func queryBool(c *gin.Context, key string) bool {
	value := strings.ToLower(strings.TrimSpace(c.Query(key)))
	return value == "1" || value == "true" || value == "yes" || value == "y" || value == "on"
}
