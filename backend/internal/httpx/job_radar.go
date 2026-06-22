package httpx

import (
	"net/http"
	"strconv"
	"strings"

	"kill-the-resume/backend/internal/jobradar"

	"github.com/gin-gonic/gin"
)

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
