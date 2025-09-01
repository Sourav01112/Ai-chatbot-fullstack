package models

import (
	"database/sql/driver"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Message struct {
	ID              string          `gorm:"type:uuid;primary_key" json:"id"`
	SessionID       string          `gorm:"type:uuid;not null;index" json:"session_id"`
	UserID          string          `gorm:"type:uuid;not null;index" json:"user_id"`
	Content         string          `gorm:"type:text;not null" json:"content"`
	Type            MessageType     `gorm:"type:varchar(20);not null" json:"type"`
	Metadata        MessageMetadata `gorm:"type:jsonb" json:"metadata"`
	CreatedAt       time.Time       `gorm:"index" json:"created_at"`
	ParentMessageID *string         `gorm:"type:uuid;index" json:"parent_message_id,omitempty"`
	OrderIndex      int             `gorm:"not null;index" json:"order_index"`

	Session       Session   `gorm:"foreignKey:SessionID;references:ID" json:"session,omitempty"`
	ParentMessage *Message  `gorm:"foreignKey:ParentMessageID;references:ID" json:"parent_message,omitempty"`
	ChildMessages []Message `gorm:"foreignKey:ParentMessageID;references:ID" json:"child_messages,omitempty"`
}

type MessageMetadata struct {
	SourceCitations map[string]string `json:"source_citations"`
	RelevanceScore  float64           `json:"relevance_score"`
	Tags            []string          `json:"tags"`
	ModelUsed       string            `json:"model_used"`
	TokenCount      int               `json:"token_count"`
	ResponseTimeMs  float64           `json:"response_time_ms"`
	ProcessingSteps []string          `json:"processing_steps"`
}

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}

	if m.OrderIndex == 0 {
		var maxOrder int
		tx.Model(&Message{}).
			Where("session_id = ?", m.SessionID).
			Select("COALESCE(MAX(order_index), 0)").
			Scan(&maxOrder)
		m.OrderIndex = maxOrder + 1
	}

	return nil
}

func (Message) TableName() string {
	return "messages"
}

func (m *MessageMetadata) Scan(value interface{}) error {
	if value == nil {
		*m = MessageMetadata{
			SourceCitations: make(map[string]string),
			Tags:            []string{},
			ProcessingSteps: []string{},
		}
		return nil
	}
	return json.Unmarshal(value.([]byte), m)
}

func (m MessageMetadata) Value() (driver.Value, error) {
	if m.SourceCitations == nil {
		m.SourceCitations = make(map[string]string)
	}
	if m.Tags == nil {
		m.Tags = []string{}
	}
	if m.ProcessingSteps == nil {
		m.ProcessingSteps = []string{}
	}
	return json.Marshal(m)
}

func (m *Message) IsUserMessage() bool {
	return m.Type == MessageTypeUser
}

func (m *Message) IsAssistantMessage() bool {
	return m.Type == MessageTypeAssistant
}

func (m *Message) IsSystemMessage() bool {
	return m.Type == MessageTypeSystem
}

func (m *Message) GetWordCount() int {
	if m.Content == "" {
		return 0
	}
	return len(strings.Fields(m.Content))
}
