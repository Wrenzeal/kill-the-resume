package httpx

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var (
	anchoredYearMonthPattern = regexp.MustCompile(`^(\d{4})(?:[-./年\s]?)(\d{1,2})?`)
	looseYearMonthPattern    = regexp.MustCompile(`(\d{4})(?:[-./年\s]?)(\d{1,2})?`)
)

type normalizedPeriod struct {
	Start     string `json:"start"`
	End       string `json:"end"`
	IsPresent bool   `json:"isPresent"`
}

func normalizeResumeContentJSON(raw json.RawMessage) (json.RawMessage, error) {
	if len(raw) == 0 || strings.TrimSpace(string(raw)) == "null" {
		return json.RawMessage(`{}`), nil
	}
	if !json.Valid(raw) {
		return nil, fmt.Errorf("resume content must be valid JSON")
	}

	var root map[string]any
	if err := json.Unmarshal(raw, &root); err != nil {
		return append(json.RawMessage(nil), raw...), nil
	}

	for _, key := range []string{"projects", "work", "education"} {
		normalizePeriodCollection(root, key)
	}

	normalized, err := json.Marshal(root)
	if err != nil {
		return nil, fmt.Errorf("normalize resume content: %w", err)
	}
	return normalized, nil
}

func normalizePeriodCollection(root map[string]any, key string) {
	items, ok := root[key].([]any)
	if !ok {
		return
	}
	for _, rawItem := range items {
		item, ok := rawItem.(map[string]any)
		if !ok {
			continue
		}
		if rawPeriod, exists := item["period"]; exists {
			item["period"] = normalizePeriodValue(rawPeriod)
		}
	}
}

func normalizePeriodValue(value any) normalizedPeriod {
	switch typed := value.(type) {
	case map[string]any:
		present := boolValue(typed["isPresent"])
		end := ""
		if !present {
			end = normalizeMonthValue(stringValue(typed["end"]))
		}
		return normalizedPeriod{
			Start:     normalizeMonthValue(stringValue(typed["start"])),
			End:       end,
			IsPresent: present,
		}
	case string:
		return parsePeriodString(typed)
	default:
		return normalizedPeriod{}
	}
}

func parsePeriodString(raw string) normalizedPeriod {
	text := strings.TrimSpace(raw)
	if text == "" {
		return normalizedPeriod{}
	}

	lower := strings.ToLower(text)
	present := strings.Contains(text, "至今") || strings.Contains(lower, "present") || strings.Contains(lower, "current") || strings.Contains(lower, "now")
	matches := looseYearMonthPattern.FindAllStringSubmatch(text, -1)
	start := ""
	end := ""
	if len(matches) > 0 {
		start = normalizeMonthParts(matches[0][1], matches[0][2])
	}
	if !present && len(matches) > 1 {
		end = normalizeMonthParts(matches[1][1], matches[1][2])
	}

	return normalizedPeriod{Start: start, End: end, IsPresent: present}
}

func normalizeMonthValue(value string) string {
	match := anchoredYearMonthPattern.FindStringSubmatch(strings.TrimSpace(value))
	if len(match) == 0 {
		return ""
	}
	return normalizeMonthParts(match[1], match[2])
}

func normalizeMonthParts(yearRaw string, monthRaw string) string {
	year, err := strconv.Atoi(yearRaw)
	if err != nil || year < 1900 || year > 2100 {
		return ""
	}
	month := 1
	if monthRaw != "" {
		parsedMonth, err := strconv.Atoi(monthRaw)
		if err != nil || parsedMonth < 1 || parsedMonth > 12 {
			return ""
		}
		month = parsedMonth
	}
	return fmt.Sprintf("%04d-%02d", year, month)
}

func stringValue(value any) string {
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func boolValue(value any) bool {
	if typed, ok := value.(bool); ok {
		return typed
	}
	return false
}
