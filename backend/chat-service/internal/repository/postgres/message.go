package postgres

import (
	"context"
	"errors"
	"fmt"

	"go.uber.org/zap"
	"gorm.io/gorm"

	"github.com/Sourav01112/chat-service/internal/models"
	"github.com/Sourav01112/chat-service/internal/repository"
)

type messageRepository struct {
	db  *gorm.DB
	log *zap.Logger
}

func NewMessageRepository(db *gorm.DB, log *zap.Logger) repository.MessageRepository {
	return &messageRepository{
		db:  db,
		log: log,
	}
}

func (r *messageRepository) Create(ctx context.Context, message *models.Message) error {
	if err := r.db.WithContext(ctx).Create(message).Error; err != nil {
		r.log.Error("Failed to create message",
			zap.Error(err),
			zap.String("session_id", message.SessionID))
		return fmt.Errorf("failed to create message: %w", err)
	}

	r.log.Info("Message created successfully",
		zap.String("message_id", message.ID),
		zap.String("session_id", message.SessionID),
		zap.String("type", message.Type.String()))
	return nil
}

func (r *messageRepository) GetByID(ctx context.Context, messageID string) (*models.Message, error) {
	var message models.Message

	err := r.db.WithContext(ctx).
		Where("id = ?", messageID).
		First(&message).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("message not found")
		}
		r.log.Error("Failed to get message",
			zap.Error(err),
			zap.String("message_id", messageID))
		return nil, fmt.Errorf("failed to get message: %w", err)
	}

	return &message, nil
}

func (r *messageRepository) GetBySessionID(ctx context.Context, sessionID string, limit, offset int) ([]*models.Message, int64, error) {
	var messages []*models.Message
	var total int64

	if err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("session_id = ?", sessionID).
		Count(&total).Error; err != nil {
		r.log.Error("Failed to count messages",
			zap.Error(err),
			zap.String("session_id", sessionID))
		return nil, 0, fmt.Errorf("failed to count messages: %w", err)
	}

	err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Order("order_index ASC, created_at ASC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error

	if err != nil {
		r.log.Error("Failed to get session messages",
			zap.Error(err),
			zap.String("session_id", sessionID))
		return nil, 0, fmt.Errorf("failed to get messages: %w", err)
	}

	return messages, total, nil
}

func (r *messageRepository) Update(ctx context.Context, message *models.Message) error {
	result := r.db.WithContext(ctx).Save(message)
	if result.Error != nil {
		r.log.Error("Failed to update message",
			zap.Error(result.Error),
			zap.String("message_id", message.ID))
		return fmt.Errorf("failed to update message: %w", result.Error)
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("message not found")
	}

	r.log.Info("Message updated successfully", zap.String("message_id", message.ID))
	return nil
}

func (r *messageRepository) Delete(ctx context.Context, messageID string, userID string) error {
	var message models.Message
	err := r.db.WithContext(ctx).
		Joins("JOIN sessions ON messages.session_id = sessions.id").
		Where("messages.id = ? AND sessions.user_id = ?", messageID, userID).
		First(&message).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("message not found or not owned by user")
		}
		return fmt.Errorf("failed to verify message ownership: %w", err)
	}

	result := r.db.WithContext(ctx).Delete(&models.Message{}, messageID)
	if result.Error != nil {
		r.log.Error("Failed to delete message",
			zap.Error(result.Error),
			zap.String("message_id", messageID))
		return fmt.Errorf("failed to delete message: %w", result.Error)
	}

	r.log.Info("Message deleted successfully",
		zap.String("message_id", messageID),
		zap.String("user_id", userID))
	return nil
}

func (r *messageRepository) GetLastMessages(ctx context.Context, sessionID string, count int) ([]*models.Message, error) {
	var messages []*models.Message

	err := r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Order("order_index DESC, created_at DESC").
		Limit(count).
		Find(&messages).Error

	if err != nil {
		r.log.Error("Failed to get last messages",
			zap.Error(err),
			zap.String("session_id", sessionID))
		return nil, fmt.Errorf("failed to get last messages: %w", err)
	}

	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

func (r *messageRepository) SearchInSession(ctx context.Context, sessionID string, query string, limit, offset int) ([]*models.Message, int64, error) {
	var messages []*models.Message
	var total int64

	searchQuery := "%" + query + "%"

	if err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("session_id = ? AND content ILIKE ?", sessionID, searchQuery).
		Count(&total).Error; err != nil {
		r.log.Error("Failed to count search results",
			zap.Error(err),
			zap.String("session_id", sessionID),
			zap.String("query", query))
		return nil, 0, fmt.Errorf("failed to count search results: %w", err)
	}

	err := r.db.WithContext(ctx).
		Where("session_id = ? AND content ILIKE ?", sessionID, searchQuery).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error

	if err != nil {
		r.log.Error("Failed to search messages",
			zap.Error(err),
			zap.String("session_id", sessionID),
			zap.String("query", query))
		return nil, 0, fmt.Errorf("failed to search messages: %w", err)
	}

	return messages, total, nil
}

func (r *messageRepository) GetMessageCount(ctx context.Context, sessionID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&models.Message{}).
		Where("session_id = ?", sessionID).
		Count(&count).Error

	if err != nil {
		r.log.Error("Failed to count session messages",
			zap.Error(err),
			zap.String("session_id", sessionID))
		return 0, fmt.Errorf("failed to count messages: %w", err)
	}

	return count, nil
}
