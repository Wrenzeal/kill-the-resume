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
