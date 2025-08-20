package models

import (
	"fmt"
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
	ID        string `gorm:"type:uuid;primary_key" json:"id"`
	Email     string `gorm:"uniqueIndex;not null" json:"email"`
	Username  string `gorm:"uniqueIndex;not null" json:"username"`
	FirstName string `gorm:"size:100" json:"first_name"`
	LastName  string `gorm:"size:100" json:"last_name"`
	AvatarURL string `gorm:"size:500" json:"avatar_url"`

	// Authentication
	PasswordHash  string `gorm:"not null" json:"-"`
	EmailVerified bool   `gorm:"default:false" json:"email_verified"`

	// Status and Role
	Role   UserRole   `gorm:"type:varchar(20);default:'user'" json:"role"`
	Status UserStatus `gorm:"type:varchar(20);default:'active'" json:"status"`

	// Security
	FailedLoginAttempts int        `gorm:"default:0" json:"-"`
	LastFailedLoginAt   *time.Time `json:"-"`
	LockedUntil         *time.Time `json:"-"`

	// Timestamps
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
	DeletedAt *gorm.DeletedAt `gorm:"index" json:"-"`
	LastLogin *time.Time      `json:"last_login"`

	// Relationships
	Preferences *UserPreferences `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"preferences,omitempty"`
	Analytics   []*UserAnalytics `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"analytics,omitempty"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return nil
}

func (User) TableName() string {
	return "users"
}

func (u *User) IsLocked() bool {
	if u.LockedUntil == nil {
		return false
	}
	fmt.Println("Checking if user is locked:", u.LockedUntil)
	return time.Now().Before(*u.LockedUntil)
}

func (u *User) CanLogin() bool {
	fmt.Println("Checking if user can login:", u.Status, u.IsLocked())
	return u.Status == StatusActive && !u.IsLocked()
}

func (u *User) Sanitize() *User {
	u.PasswordHash = ""
	u.FailedLoginAttempts = 0
	u.LastFailedLoginAt = nil
	u.LockedUntil = nil
	return u
}
