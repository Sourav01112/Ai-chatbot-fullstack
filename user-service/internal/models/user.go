package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string
type UserStatus string

const (
	RoleUser      UserRole = "user"
	RoleAdmin     UserRole = "admin"
	RoleModerator UserRole = "moderator"
)

const (
	StatusActive    UserStatus = "active"
	StatusInactive  UserStatus = "inactive"
	StatusSuspended UserStatus = "suspended"
	StatusDeleted   UserStatus = "deleted"
)

type User struct {
	ID            string         `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Email         string         `gorm:"uniqueIndex;not null" json:"email"`
	Username      string         `gorm:"uniqueIndex;not null" json:"username"`
	FirstName     string         `gorm:"not null" json:"first_name"`
	LastName      string         `gorm:"not null" json:"last_name"`
	PasswordHash  string         `gorm:"not null" json:"-"`
	AvatarURL     *string        `json:"avatar_url,omitempty"`
	Role          UserRole       `gorm:"type:varchar(20);default:'user'" json:"role"`
	Status        UserStatus     `gorm:"type:varchar(20);default:'active'" json:"status"`
	EmailVerified bool           `gorm:"default:false" json:"email_verified"`
	LastLogin     *time.Time     `json:"last_login,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Preferences   *UserPreferences `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"preferences,omitempty"`
	Analytics     []UserAnalytics  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	LoginAttempts []LoginAttempt   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

// type UserPreferences struct {
// 	UserID               string    `gorm:"type:uuid;primary_key" json:"user_id"`
// 	Theme                string    `gorm:"default:'system'" json:"theme"`
// 	Language             string    `gorm:"default:'en'" json:"language"`
// 	Timezone             string    `gorm:"default:'UTC'" json:"timezone"`
// 	NotificationsEnabled bool      `gorm:"default:true" json:"notifications_enabled"`
// 	EmailNotifications   bool      `gorm:"default:true" json:"email_notifications"`
// 	AIDefaultPersona     string    `gorm:"default:'assistant'" json:"ai_default_persona"`
// 	AITemperature        float64   `gorm:"default:0.7" json:"ai_temperature"`
// 	AIMaxTokens          int       `gorm:"default:1000" json:"ai_max_tokens"`
// 	AIEnableRAG          bool      `gorm:"default:true" json:"ai_enable_rag"`
// 	CreatedAt            time.Time `json:"created_at"`
// 	UpdatedAt            time.Time `json:"updated_at"`
// }

type UserPreferences struct {
	UserID               string    `gorm:"type:uuid;primary_key" json:"user_id"`
	Theme                string    `gorm:"column:theme;default:'system'" json:"theme"`
	Language             string    `gorm:"column:language;default:'en'" json:"language"`
	Timezone             string    `gorm:"column:timezone;default:'UTC'" json:"timezone"`
	NotificationsEnabled bool      `gorm:"column:notifications_enabled;default:true" json:"notifications_enabled"`
	EmailNotifications   bool      `gorm:"column:email_notifications;default:true" json:"email_notifications"`
	AIDefaultPersona     string    `gorm:"column:ai_default_persona;default:'assistant'" json:"ai_default_persona"`
	AITemperature        float64   `gorm:"column:ai_temperature;default:0.7" json:"ai_temperature"`
	AIMaxTokens          int       `gorm:"column:ai_max_tokens;default:1000" json:"ai_max_tokens"`
	AIEnableRAG          bool      `gorm:"column:ai_enable_rag;default:true" json:"ai_enable_rag"`
	CreatedAt            time.Time `gorm:"column:created_at" json:"created_at"`
	UpdatedAt            time.Time `gorm:"column:updated_at" json:"updated_at"`
}

type UserAnalytics struct {
	ID        uint      `gorm:"primary_key" json:"id"`
	UserID    string    `gorm:"type:uuid;not null;index" json:"user_id"`
	EventType string    `gorm:"not null;index" json:"event_type"`
	EventData string    `gorm:"type:jsonb" json:"event_data,omitempty"`
	IPAddress string    `json:"ip_address,omitempty"`
	UserAgent string    `json:"user_agent,omitempty"`
	SessionID string    `json:"session_id,omitempty"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

type LoginAttempt struct {
	ID        uint      `gorm:"primary_key" json:"id"`
	UserID    *string   `gorm:"type:uuid;index" json:"user_id,omitempty"`
	Email     string    `gorm:"not null;index" json:"email"`
	IPAddress string    `gorm:"not null" json:"ip_address"`
	UserAgent string    `json:"user_agent,omitempty"`
	Success   bool      `gorm:"not null;index" json:"success"`
	CreatedAt time.Time `gorm:"index" json:"created_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

func (u *User) AfterCreate(tx *gorm.DB) error {
	preferences := &UserPreferences{
		UserID: u.ID,
	}
	return tx.Create(preferences).Error
}

func (u *User) IsActive() bool {
	return u.Status == StatusActive
}

func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

func (u *User) CanLogin() bool {
	return u.Status == StatusActive && u.EmailVerified
}
