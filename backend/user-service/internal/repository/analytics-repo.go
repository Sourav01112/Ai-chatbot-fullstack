package repository

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/Sourav01112/user-service/internal/models"
)

type AnalyticsRepository interface {
	RecordActivityRepo(ctx context.Context, activity *models.UserAnalytics) error
	GetUserStats(ctx context.Context, userID string, fromDate, toDate time.Time) (*models.UserStats, error)
	GetActivities(ctx context.Context, userID string, limit, offset int) ([]*models.UserAnalytics, error)
	DeleteUserActivities(ctx context.Context, userID string) error
}

type analyticsRepository struct {
	db  *gorm.DB
	log *zap.Logger
}

func NewAnalyticsRepository(db *gorm.DB, log *zap.Logger) AnalyticsRepository {
	return &analyticsRepository{
		db:  db,
		log: log,
	}
}

func (r *analyticsRepository) RecordActivityRepo(ctx context.Context, activity *models.UserAnalytics) error {
	if err := r.db.WithContext(ctx).Create(activity).Error; err != nil {
		r.log.Error("Failed to record user activity",
			zap.Error(err),
			zap.String("user_id", activity.UserID),
			zap.String("activity_type", string(activity.ActivityType)))
		return fmt.Errorf("------failed to record activity: %w", err)
	}

	return nil
}

func (r *analyticsRepository) GetUserStats(ctx context.Context, userID string, fromDate, toDate time.Time) (*models.UserStats, error) {
	stats := &models.UserStats{
		UserID:       userID,
		FeatureUsage: make(map[string]int64),
	}

	// Get total sessions
	err := r.db.WithContext(ctx).
		Model(&models.UserAnalytics{}).
		Where("user_id = ? AND activity_type = ? AND created_at BETWEEN ? AND ?",
			userID, models.ActivitySessionStart, fromDate, toDate).
		Count(&stats.TotalSessions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to count sessions: %w", err)
	}

	// Get total messages
	err = r.db.WithContext(ctx).
		Model(&models.UserAnalytics{}).
		Where("user_id = ? AND activity_type = ? AND created_at BETWEEN ? AND ?",
			userID, models.ActivityMessageSent, fromDate, toDate).
		Count(&stats.TotalMessages).Error
	if err != nil {
		return nil, fmt.Errorf("failed to count messages: %w", err)
	}

	// Get last activity
	var lastActivity models.UserAnalytics
	err = r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		First(&lastActivity).Error
	if err == nil {
		stats.LastActivity = lastActivity.CreatedAt
	}

	// Get feature usage counts
	var featureUsage []struct {
		ActivityType string `json:"activity_type"`
		Count        int64  `json:"count"`
	}

	err = r.db.WithContext(ctx).
		Model(&models.UserAnalytics{}).
		Select("activity_type, COUNT(*) as count").
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, fromDate, toDate).
		Group("activity_type").
		Scan(&featureUsage).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get feature usage: %w", err)
	}

	for _, usage := range featureUsage {
		stats.FeatureUsage[usage.ActivityType] = usage.Count
	}

	return stats, nil
}

func (r *analyticsRepository) GetActivities(ctx context.Context, userID string, limit, offset int) ([]*models.UserAnalytics, error) {
	var activities []*models.UserAnalytics

	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&activities).Error

	if err != nil {
		r.log.Error("Failed to get user activities", zap.Error(err), zap.String("user_id", userID))
		return nil, fmt.Errorf("failed to get activities: %w", err)
	}

	return activities, nil
}

func (r *analyticsRepository) DeleteUserActivities(ctx context.Context, userID string) error {
	result := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&models.UserAnalytics{})

	if result.Error != nil {
		r.log.Error("Failed to delete user activities", zap.Error(result.Error), zap.String("user_id", userID))
		return fmt.Errorf("failed to delete activities: %w", result.Error)
	}

	r.log.Info("User activities deleted successfully",
		zap.String("user_id", userID),
		zap.Int64("deleted_count", result.RowsAffected))
	return nil
}
