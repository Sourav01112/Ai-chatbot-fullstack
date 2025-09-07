package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type UserPreferences struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	UserID string `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`

	Theme    string `gorm:"size:20;default:'system'" json:"theme"` // light, dark, system
	Language string `gorm:"size:10;default:'en'" json:"language"`
	Timezone string `gorm:"size:50;default:'UTC'" json:"timezone"`

	NotificationsEnabled bool `gorm:"default:true" json:"notifications_enabled"`
	EmailNotifications   bool `gorm:"default:true" json:"email_notifications"`
	PushNotifications    bool `gorm:"default:true" json:"push_notifications"`

	// AIPreferences AIPreferences `gorm:"type:jsonb" json:"ai_preferences"`
	AIPreferences AIPreferences `gorm:"column:ai_preferences;type:jsonb" json:"ai_preferences"`

	ProfileVisibility string `gorm:"size:20;default:'public'" json:"profile_visibility"` // public, private, friends
	DataSharing       bool   `gorm:"default:false" json:"data_sharing"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID;references:ID" json:"-"`
}

type AIPreferences struct {
	DefaultPersona     string   `json:"default_persona"`
	Temperature        float64  `json:"temperature"`
	MaxTokens          int      `json:"max_tokens"`
	EnableRAG          bool     `json:"enable_rag"`
	PreferredModels    []string `json:"preferred_models"`
	CustomInstructions string   `json:"custom_instructions"`
}

func (a *AIPreferences) Scan(value interface{}) error {
	if value == nil {
		*a = AIPreferences{}
		return nil
	}
	return json.Unmarshal(value.([]byte), a)
}

func (a AIPreferences) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (UserPreferences) TableName() string {
	return "user_preferences"
}
