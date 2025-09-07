package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/Sourav01112/user-service/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, userID string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, userID string) error
	UpdateLastLogin(ctx context.Context, userID string) error
	IncrementFailedLogins(ctx context.Context, userID string) error
	ResetFailedLogins(ctx context.Context, userID string) error
	LockAccount(ctx context.Context, userID string, duration time.Duration) error
	EmailExists(ctx context.Context, email string) (bool, error)
	UsernameExists(ctx context.Context, username string) (bool, error)
	GetUsers(ctx context.Context, limit, offset int) ([]*models.User, int64, error)
}

type userRepository struct {
	db  *gorm.DB
	log *zap.Logger
}

func NewUserRepository(db *gorm.DB, log *zap.Logger) UserRepository {
	return &userRepository{
		db:  db,
		log: log,
	}
}

func (r *userRepository) Create(ctx context.Context, user *models.User) error {
	if err := r.db.WithContext(ctx).Create(user).Error; err != nil {
		r.log.Error("Failed to create user", zap.Error(err), zap.String("email", user.Email))
		return fmt.Errorf("failed to create user: %w", err)
	}

	r.log.Info("User created successfully", zap.String("user_id", user.ID), zap.String("email", user.Email))
	return nil
}

func (r *userRepository) GetByID(ctx context.Context, userID string) (*models.User, error) {
	var user models.User

	err := r.db.WithContext(ctx).
		Preload("Preferences").
		Where("id = ? AND status != ?", userID, models.StatusDeleted).
		First(&user).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		r.log.Error("Failed to get user by ID", zap.Error(err), zap.String("user_id", userID))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User

	err := r.db.WithContext(ctx).
		Preload("Preferences").
		Where("email = ? AND status != ?", email, models.StatusDeleted).
		First(&user).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		r.log.Error("Failed to get user by email", zap.Error(err), zap.String("email", email))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (r *userRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User

	err := r.db.WithContext(ctx).
		Preload("Preferences").
		Where("username = ? AND status != ?", username, models.StatusDeleted).
		First(&user).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("user not found")
		}
		r.log.Error("Failed to get user by username", zap.Error(err), zap.String("username", username))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return &user, nil
}

func (r *userRepository) Update(ctx context.Context, user *models.User) error {
	result := r.db.WithContext(ctx).Save(user)
	if result.Error != nil {
		r.log.Error("Failed to update user", zap.Error(result.Error), zap.String("user_id", user.ID))
		return fmt.Errorf("failed to update user: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	r.log.Info("User updated successfully", zap.String("user_id", user.ID))
	return nil
}

func (r *userRepository) Delete(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		Update("status", models.StatusDeleted)

	if result.Error != nil {
		r.log.Error("Failed to delete user", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to delete user: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	r.log.Info("User deleted successfully", zap.String("user_id", userID))
	return nil
}

func (r *userRepository) UpdateLastLogin(ctx context.Context, userID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		Update("last_login", now)

	if result.Error != nil {
		r.log.Error("Failed to update last login", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to update last login: %w", result.Error)
	}

	return nil
}

func (r *userRepository) IncrementFailedLogins(ctx context.Context, userID string) error {
	now := time.Now()
	result := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"failed_login_attempts": gorm.Expr("failed_login_attempts + 1"),
			"last_failed_login_at":  now,
		})

	if result.Error != nil {
		r.log.Error("Failed to increment failed logins", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to increment failed logins: %w", result.Error)
	}

	return nil
}

func (r *userRepository) ResetFailedLogins(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		Updates(map[string]interface{}{
			"failed_login_attempts": 0,
			"last_failed_login_at":  nil,
			"locked_until":          nil,
		})

	if result.Error != nil {
		r.log.Error("Failed to reset failed logins", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to reset failed logins: %w", result.Error)
	}

	return nil
}

func (r *userRepository) LockAccount(ctx context.Context, userID string, duration time.Duration) error {
	lockUntil := time.Now().Add(duration)
	result := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("id = ?", userID).
		Update("locked_until", lockUntil)

	if result.Error != nil {
		r.log.Error("Failed to lock account", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to lock account: %w", result.Error)
	}

	r.log.Warn("Account locked", zap.String("user_id", userID), zap.Time("locked_until", lockUntil))
	return nil
}

func (r *userRepository) EmailExists(ctx context.Context, email string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("email = ? AND status != ?", email, models.StatusDeleted).
		Count(&count).Error

	if err != nil {
		r.log.Error("Failed to check email existence", zap.Error(err), zap.String("email", email))
		return false, fmt.Errorf("failed to check email existence: %w", err)
	}

	return count > 0, nil
}

func (r *userRepository) UsernameExists(ctx context.Context, username string) (bool, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("username = ? AND status != ?", username, models.StatusDeleted).
		Count(&count).Error

	if err != nil {
		r.log.Error("Failed to check username existence", zap.Error(err), zap.String("username", username))
		return false, fmt.Errorf("failed to check username existence: %w", err)
	}

	return count > 0, nil
}

func (r *userRepository) GetUsers(ctx context.Context, limit, offset int) ([]*models.User, int64, error) {
	var users []*models.User
	var total int64

	if err := r.db.WithContext(ctx).
		Model(&models.User{}).
		Where("status != ?", models.StatusDeleted).
		Count(&total).Error; err != nil {
		r.log.Error("Failed to count users", zap.Error(err))
		return nil, 0, fmt.Errorf("failed to count users: %w", err)
	}

	err := r.db.WithContext(ctx).
		Where("status != ?", models.StatusDeleted).
		Limit(limit).
		Offset(offset).
		Find(&users).Error

	if err != nil {
		r.log.Error("Failed to get users", zap.Error(err))
		return nil, 0, fmt.Errorf("failed to get users: %w", err)
	}

	return users, total, nil
}
