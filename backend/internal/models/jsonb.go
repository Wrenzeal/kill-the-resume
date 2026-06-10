package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
)

type JSONB json.RawMessage

func NewJSONB(raw json.RawMessage) JSONB {
	if len(raw) == 0 {
		return JSONB([]byte(`{}`))
	}
	copyRaw := append([]byte(nil), raw...)
	return JSONB(copyRaw)
}

func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return `{}`, nil
	}
	if !json.Valid(j) {
		return nil, errors.New("invalid JSONB value")
	}
	return string(j), nil
}

func (j *JSONB) Scan(value any) error {
	if value == nil {
		*j = JSONB([]byte(`{}`))
		return nil
	}

	switch typed := value.(type) {
	case []byte:
		*j = JSONB(append((*j)[0:0], typed...))
	case string:
		*j = JSONB(append((*j)[0:0], typed...))
	default:
		return errors.New("unsupported JSONB scan source")
	}
	if len(*j) == 0 {
		*j = JSONB([]byte(`{}`))
	}
	if !json.Valid(*j) {
		return errors.New("invalid JSONB from database")
	}
	return nil
}

func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte(`{}`), nil
	}
	if !json.Valid(j) {
		return nil, errors.New("invalid JSONB value")
	}
	return []byte(j), nil
}

func (j *JSONB) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*j = JSONB([]byte(`{}`))
		return nil
	}
	if !json.Valid(data) {
		return errors.New("invalid JSONB value")
	}
	*j = JSONB(append((*j)[0:0], data...))
	return nil
}
