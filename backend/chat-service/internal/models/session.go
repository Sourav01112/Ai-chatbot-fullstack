package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Session struct {
	ID           string          `gorm:"type:uuid;primary_key" json:"id"`
	UserID       string          `gorm:"type:uuid;not null;index" json:"user_id"`
	Title        string          `gorm:"size:200;not null" json:"title"`
	Status       SessionStatus   `gorm:"type:varchar(20);default:'active'" json:"status"`
	Settings     SessionSettings `gorm:"type:jsonb" json:"settings"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
	LastActivity time.Time       `gorm:"index" json:"last_activity"`

	Messages []Message `gorm:"foreignKey:SessionID;constraint:OnDelete:CASCADE" json:"messages,omitempty"`
}

type SessionSettings struct {
	AIPersona       string   `json:"ai_persona"`
	Temperature     float64  `json:"temperature"`
	MaxTokens       int      `json:"max_tokens"`
	EnableRAG       bool     `json:"enable_rag"`
	DocumentSources []string `json:"document_sources"`
	SystemPrompt    string   `json:"system_prompt"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	if s.LastActivity.IsZero() {
		s.LastActivity = time.Now()
	}
	return nil
}

func (Session) TableName() string {
	return "sessions"
}

func (s *SessionSettings) Scan(value interface{}) error {
	if value == nil {
		*s = SessionSettings{}
		return nil
	}
	return json.Unmarshal(value.([]byte), s)
}

func (s SessionSettings) Value() (driver.Value, error) {
	return json.Marshal(s)
}

func (s *Session) UpdateLastActivity() {
	s.LastActivity = time.Now()
}

func (s *Session) IsActive() bool {
	return s.Status == SessionStatusActive
}

func GetDefaultSettings() SessionSettings {
	return SessionSettings{
		AIPersona:       "assistant",
		Temperature:     0.7,
		MaxTokens:       2048,
		EnableRAG:       true,
		DocumentSources: []string{},
		SystemPrompt:    "",
	}
}
