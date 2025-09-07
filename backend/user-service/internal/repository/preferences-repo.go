package repository

import (
	"context"
	"errors"
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/Sourav01112/user-service/internal/models"
)

type PreferencesRepository interface {
	Create(ctx context.Context, preferences *models.UserPreferences) error
	GetByUserID(ctx context.Context, userID string) (*models.UserPreferences, error)
	Update(ctx context.Context, preferences *models.UserPreferences) error
	Delete(ctx context.Context, userID string) error
}

type preferencesRepository struct {
	db  *gorm.DB
	log *zap.Logger
}

func NewPreferencesRepository(db *gorm.DB, log *zap.Logger) PreferencesRepository {
	return &preferencesRepository{
		db:  db,
		log: log,
	}
}

// func (r *preferencesRepository) Create(ctx context.Context, preferences *models.UserPreferences) error {
// 	fmt.Printf("preferencesRepository: %+v\n", preferences)
// 	// if err := r.db.WithContext(ctx).Create(preferences).Error; err != nil {
// 	if err := r.db.Debug().WithContext(ctx).Create(preferences).Error; err != nil {

// 		r.log.Error("Failed to create user preferences", zap.Error(err), zap.String("user_id", preferences.UserID))
// 		return fmt.Errorf("failed to create user preferences: %w", err)
// 	}

// 	r.log.Info("User preferences created successfully", zap.String("user_id", preferences.UserID))
// 	return nil
// }

func (r *preferencesRepository) Create(ctx context.Context, preferences *models.UserPreferences) error {
	fmt.Printf("preferencesRepository: %+v\n", preferences)

	db := r.db.Debug().WithContext(ctx)
	// Log the prepared SQL statement if you want to intercept it before execution
	stmt := db.Session(&gorm.Session{DryRun: true}).Create(preferences).Statement.SQL.String()
	fmt.Printf("Prepared SQL: %s\n", stmt)

	if err := db.Create(preferences).Error; err != nil {
		r.log.Error("Failed to create user preferences",
			zap.Error(err),
			zap.String("user_id", preferences.UserID),
			zap.String("prepared_sql", stmt),
		)
		return fmt.Errorf("failed to create user preferences: %w", err)
	}

	r.log.Info("User preferences created successfully", zap.String("user_id", preferences.UserID))
	return nil
}

func (r *preferencesRepository) GetByUserID(ctx context.Context, userID string) (*models.UserPreferences, error) {
	var preferences models.UserPreferences

	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		First(&preferences).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Return default preferences if none exist
			return &models.UserPreferences{
				UserID:               userID,
				Theme:                "system",
				Language:             "en",
				Timezone:             "UTC",
				NotificationsEnabled: true,
				EmailNotifications:   true,
				PushNotifications:    true,
				AIPreferences: models.AIPreferences{
					DefaultPersona:  "assistant",
					Temperature:     0.7,
					MaxTokens:       2048,
					EnableRAG:       true,
					PreferredModels: []string{"gpt-3.5-turbo"},
				},
				ProfileVisibility: "public",
				DataSharing:       false,
			}, nil
		}
		r.log.Error("Failed to get user preferences", zap.Error(err), zap.String("user_id", userID))
		return nil, fmt.Errorf("failed to get user preferences: %w", err)
	}

	return &preferences, nil
}

func (r *preferencesRepository) Update(ctx context.Context, preferences *models.UserPreferences) error {
	result := r.db.WithContext(ctx).Save(preferences)
	if result.Error != nil {
		r.log.Error("Failed to update user preferences", zap.Error(result.Error), zap.String("user_id", preferences.UserID))
		return fmt.Errorf("failed to update user preferences: %w", result.Error)
	}

	r.log.Info("User preferences updated successfully", zap.String("user_id", preferences.UserID))
	return nil
}

func (r *preferencesRepository) Delete(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.UserPreferences{})

	if result.Error != nil {
		r.log.Error("Failed to delete user preferences", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to delete user preferences: %w", result.Error)
	}

	r.log.Info("User preferences deleted successfully", zap.String("user_id", userID))
	return nil
}
