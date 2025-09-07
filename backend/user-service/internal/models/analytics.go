package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type ActivityType string

const (
	ActivityLogin          ActivityType = "login"
	ActivityLogout         ActivityType = "logout"
	ActivityPasswordChange ActivityType = "password_change"
	ActivityProfileUpdate  ActivityType = "profile_update"
	ActivitySessionStart   ActivityType = "session_start"
	ActivityMessageSent    ActivityType = "message_sent"
	ActivityFeatureUsed    ActivityType = "feature_used"
)

type UserAnalytics struct {
	ID           uint         `gorm:"primaryKey" json:"id"`
	UserID       string       `gorm:"type:uuid;index;not null" json:"user_id"`
	ActivityType ActivityType `gorm:"type:varchar(50);not null" json:"activity_type"`

	Metadata  JSON    `gorm:"type:jsonb" json:"metadata"`
	IPAddress *string `gorm:"size:45" json:"ip_address"`
	UserAgent string  `gorm:"size:500" json:"user_agent"`
	SessionID string  `gorm:"size:100" json:"session_id"`

	CreatedAt time.Time `gorm:"index" json:"created_at"`

	User User `gorm:"foreignKey:UserID;references:ID" json:"-"`
}

type UserStats struct {
	UserID             string           `json:"user_id"`
	TotalSessions      int64            `json:"total_sessions"`
	TotalMessages      int64            `json:"total_messages"`
	AvgSessionDuration float64          `json:"avg_session_duration"`
	LastActivity       time.Time        `json:"last_activity"`
	TokensUsed         int64            `json:"tokens_used"`
	FeatureUsage       map[string]int64 `json:"feature_usage"`
	LoginStreak        int              `json:"login_streak"`
	TotalLoginDays     int              `json:"total_login_days"`
}

type JSON map[string]interface{}

func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = make(JSON)
		return nil
	}
	return json.Unmarshal(value.([]byte), j)
}

func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (UserAnalytics) TableName() string {
	return "user_analytics"
}
