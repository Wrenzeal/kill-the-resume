package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Email        string         `gorm:"type:varchar(255);not null;uniqueIndex" json:"email"`
	DisplayName  string         `gorm:"type:varchar(120);not null" json:"displayName"`
	PasswordHash string         `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Resumes      []Resume       `gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"-"`
}

func (u *User) BeforeCreate(*gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type Resume struct {
	ID         uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	UserID     uuid.UUID      `gorm:"type:uuid;not null;index:idx_resumes_user_updated" json:"userId"`
	Title      string         `gorm:"type:varchar(180);not null" json:"title"`
	TargetRole string         `gorm:"type:varchar(180);not null;default:''" json:"targetRole"`
	Content    JSONB          `gorm:"type:jsonb;not null" json:"content"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `gorm:"index:idx_resumes_user_updated,sort:desc" json:"updatedAt"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (r *Resume) BeforeCreate(*gorm.DB) error {
	if r.ID == uuid.Nil {
		r.ID = uuid.New()
	}
	return nil
}

type JobPosting struct {
	ID                   uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	SourceName           string    `gorm:"type:varchar(80);not null;uniqueIndex:idx_job_postings_source" json:"sourceName"`
	SourceJobID          string    `gorm:"type:varchar(255);not null;uniqueIndex:idx_job_postings_source" json:"sourceJobId"`
	SourceURL            string    `gorm:"type:text;not null" json:"sourceUrl"`
	Title                string    `gorm:"type:text;not null" json:"title"`
	CompanyName          string    `gorm:"type:text;not null;default:''" json:"companyName"`
	CompanyNature        string    `gorm:"type:text;not null;default:''" json:"companyNature"`
	Location             string    `gorm:"type:text;not null;default:''" json:"location"`
	Salary               string    `gorm:"type:text;not null;default:''" json:"salary"`
	ResponsibilitiesText string    `gorm:"type:text;not null;default:''" json:"-"`
	RequirementsText     string    `gorm:"type:text;not null;default:''" json:"-"`
	Description          string    `gorm:"type:text;not null;default:''" json:"description"`
	RawText              string    `gorm:"type:text;not null;default:''" json:"rawText"`
	PostedAt             time.Time `gorm:"not null;index" json:"postedAt"`
	FirstSeenAt          time.Time `gorm:"not null;index" json:"firstSeenAt"`
	LastSeenAt           time.Time `gorm:"not null;index" json:"lastSeenAt"`
	FetchedAt            time.Time `gorm:"not null;index" json:"fetchedAt"`
	ExpiresAt            time.Time `gorm:"not null;index" json:"expiresAt"`
	FreshnessStatus      string    `gorm:"type:varchar(24);not null;index" json:"freshnessStatus"`
	CreatedAt            time.Time `json:"createdAt"`
	UpdatedAt            time.Time `json:"updatedAt"`
}

func (j *JobPosting) BeforeCreate(*gorm.DB) error {
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	return nil
}

type JobSearchCache struct {
	ID                uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	SearchFingerprint string     `gorm:"type:varchar(80);not null;uniqueIndex" json:"searchFingerprint"`
	SearchQuery       string     `gorm:"type:text;not null;default:''" json:"searchQuery"`
	Criteria          JSONB      `gorm:"type:jsonb;not null" json:"criteria"`
	SourceName        string     `gorm:"type:varchar(80);not null;default:''" json:"sourceName"`
	LastSyncedAt      *time.Time `gorm:"index" json:"lastSyncedAt,omitempty"`
	CreatedAt         time.Time  `json:"createdAt"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

func (j *JobSearchCache) BeforeCreate(*gorm.DB) error {
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	return nil
}

type JobSearchResult struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	SearchFingerprint string    `gorm:"type:varchar(80);not null;uniqueIndex:idx_job_search_result_scope;index" json:"searchFingerprint"`
	JobPostingID      uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_job_search_result_scope;index" json:"jobPostingId"`
	SourceName        string    `gorm:"type:varchar(80);not null;default:''" json:"sourceName"`
	SourceJobID       string    `gorm:"type:varchar(255);not null;default:''" json:"sourceJobId"`
	FirstSeenAt       time.Time `gorm:"not null;index" json:"firstSeenAt"`
	LastSeenAt        time.Time `gorm:"not null;index" json:"lastSeenAt"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

func (j *JobSearchResult) BeforeCreate(*gorm.DB) error {
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	return nil
}

type JobRadarPreference struct {
	ID                uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID            uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"userId"`
	Criteria          JSONB     `gorm:"type:jsonb;not null" json:"criteria"`
	SearchFingerprint string    `gorm:"type:varchar(80);not null;default:''" json:"searchFingerprint"`
	SearchQuery       string    `gorm:"type:text;not null;default:''" json:"searchQuery"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

func (j *JobRadarPreference) BeforeCreate(*gorm.DB) error {
	if j.ID == uuid.Nil {
		j.ID = uuid.New()
	}
	return nil
}
