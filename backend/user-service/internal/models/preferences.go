package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type UserPreferences struct {
	ID     uint   `gorm:"primaryKey" json:"id"`
	UserID string `gorm:"type:uuid;uniqueIndex;not null" json:"user_id"`

	// UI Preferences
	Theme    string `gorm:"size:20;default:'system'" json:"theme"` // light, dark, system
	Language string `gorm:"size:10;default:'en'" json:"language"`
	Timezone string `gorm:"size:50;default:'UTC'" json:"timezone"`

	// Notification Preferences
	NotificationsEnabled bool `gorm:"default:true" json:"notifications_enabled"`
	EmailNotifications   bool `gorm:"default:true" json:"email_notifications"`
	PushNotifications    bool `gorm:"default:true" json:"push_notifications"`

	// AI Preferences
	AIPreferences AIPreferences `gorm:"type:jsonb" json:"ai_preferences"`

	// Privacy Settings
	ProfileVisibility string `gorm:"size:20;default:'public'" json:"profile_visibility"` // public, private, friends
	DataSharing       bool   `gorm:"default:false" json:"data_sharing"`

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Foreign Key
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

// Scan implements the sql.Scanner interface
func (a *AIPreferences) Scan(value interface{}) error {
	if value == nil {
		*a = AIPreferences{}
		return nil
	}
	return json.Unmarshal(value.([]byte), a)
}

// Value implements the driver.Valuer interface
func (a AIPreferences) Value() (driver.Value, error) {
	return json.Marshal(a)
}

func (UserPreferences) TableName() string {
	return "user_preferences"
}
