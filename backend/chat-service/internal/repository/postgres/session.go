package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Sourav01112/chat-service/internal/models"
	"github.com/Sourav01112/chat-service/internal/repository"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type sessionRepository struct {
	db  *gorm.DB
	log *zap.Logger
}

func NewSessionRepository(db *gorm.DB, log *zap.Logger) repository.SessionRepository {
	return &sessionRepository{
		db:  db,
		log: log,
	}
}

func (r *sessionRepository) Create(ctx context.Context, session *models.Session) error {
	if err := r.db.WithContext(ctx).Create(session).Error; err != nil {
		r.log.Error("Failed to create session",
			zap.Error(err),
			zap.String("user_id", session.UserID))
		return fmt.Errorf("failed to create session: %w", err)
	}

	r.log.Info("Session created successfully",
		zap.String("session_id", session.ID),
		zap.String("user_id", session.UserID))
	return nil
}

func (r *sessionRepository) GetByID(ctx context.Context, sessionID string, userID string) (*models.Session, error) {
	var session models.Session

	query := r.db.WithContext(ctx).Where("id = ?", sessionID)
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	err := query.First(&session).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("session not found")
		}
		r.log.Error("Failed to get session",
			zap.Error(err),
			zap.String("session_id", sessionID),
			zap.String("user_id", userID))
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	return &session, nil
}

func (r *sessionRepository) GetByUserID(ctx context.Context, userID string, limit, offset int) ([]*models.Session, int64, error) {
	var sessions []*models.Session
	var total int64

	if err := r.db.WithContext(ctx).
		Model(&models.Session{}).
		Where("user_id = ? AND status != ?", userID, models.SessionStatusArchived).
		Count(&total).Error; err != nil {
		r.log.Error("Failed to count user sessions", zap.Error(err), zap.String("user_id", userID))
		return nil, 0, fmt.Errorf("failed to count sessions: %w", err)
	}

	err := r.db.WithContext(ctx).
		Where("user_id = ? AND status != ?", userID, models.SessionStatusArchived).
		Order("last_activity DESC").
		Limit(limit).
		Offset(offset).
		Find(&sessions).Error

	if err != nil {
		r.log.Error("Failed to get user sessions", zap.Error(err), zap.String("user_id", userID))
		return nil, 0, fmt.Errorf("failed to get sessions: %w", err)
	}

	return sessions, total, nil
}

func (r *sessionRepository) Update(ctx context.Context, session *models.Session) error {
	result := r.db.WithContext(ctx).Save(session)
	if result.Error != nil {
		r.log.Error("Failed to update session",
			zap.Error(result.Error),
			zap.String("session_id", session.ID))
		return fmt.Errorf("failed to update session: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("session not found")
	}

	r.log.Info("Session updated successfully", zap.String("session_id", session.ID))
	return nil
}

func (r *sessionRepository) Delete(ctx context.Context, sessionID string, userID string) error {
	result := r.db.WithContext(ctx).
		Model(&models.Session{}).
		Where("id = ? AND user_id = ?", sessionID, userID).
		Update("status", models.SessionStatusArchived)

	if result.Error != nil {
		r.log.Error("Failed to delete session",
			zap.Error(result.Error),
			zap.String("session_id", sessionID))
		return fmt.Errorf("failed to delete session: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("session not found or not owned by user")
	}

	r.log.Info("Session deleted successfully",
		zap.String("session_id", sessionID),
		zap.String("user_id", userID))
	return nil
}

func (r *sessionRepository) UpdateLastActivity(ctx context.Context, sessionID string) error {
	result := r.db.WithContext(ctx).
		Model(&models.Session{}).
		Where("id = ?", sessionID).
		Update("last_activity", time.Now())

	if result.Error != nil {
		r.log.Error("Failed to update last activity",
			zap.Error(result.Error),
			zap.String("session_id", sessionID))
		return fmt.Errorf("failed to update last activity: %w", result.Error)
	}

	return nil
}

func (r *sessionRepository) GetActiveSessionsCount(ctx context.Context, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Session{}).
		Where("user_id = ? AND status = ?", userID, models.SessionStatusActive).
		Count(&count).Error

	if err != nil {
		r.log.Error("Failed to count active sessions", zap.Error(err), zap.String("user_id", userID))
		return 0, fmt.Errorf("failed to count active sessions: %w", err)
	}

	return count, nil
}
