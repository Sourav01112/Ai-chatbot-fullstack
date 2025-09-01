package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/Sourav01112/chat-service/internal/models"
	"github.com/Sourav01112/chat-service/internal/repository"
)

type cacheRepository struct {
	rdb *redis.Client
	log *zap.Logger
}

func NewCacheRepository(rdb *redis.Client, log *zap.Logger) repository.CacheRepository {
	return &cacheRepository{
		rdb: rdb,
		log: log,
	}
}

func (r *cacheRepository) SetSession(ctx context.Context, session *models.Session, ttl time.Duration) error {
	key := fmt.Sprintf("session:%s", session.ID)

	data, err := json.Marshal(session)
	if err != nil {
		r.log.Error("Failed to marshal session", zap.Error(err), zap.String("session_id", session.ID))
		return fmt.Errorf("failed to marshal session: %w", err)
	}

	err = r.rdb.Set(ctx, key, data, ttl).Err()
	if err != nil {
		r.log.Error("Failed to cache session", zap.Error(err), zap.String("session_id", session.ID))
		return fmt.Errorf("failed to cache session: %w", err)
	}

	return nil
}

func (r *cacheRepository) GetSession(ctx context.Context, sessionID string) (*models.Session, error) {
	key := fmt.Sprintf("session:%s", sessionID)

	fmt.Println("callled redis cache")

	data, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("session not found in cache")
		}
		r.log.Error("Failed to get cached session", zap.Error(err), zap.String("session_id", sessionID))
		return nil, fmt.Errorf("failed to get cached session: %w", err)
	}

	var session models.Session
	if err := json.Unmarshal([]byte(data), &session); err != nil {
		r.log.Error("Failed to unmarshal cached session", zap.Error(err), zap.String("session_id", sessionID))
		return nil, fmt.Errorf("failed to unmarshal cached session: %w", err)
	}

	return &session, nil
}

func (r *cacheRepository) DeleteSession(ctx context.Context, sessionID string) error {
	key := fmt.Sprintf("session:%s", sessionID)

	err := r.rdb.Del(ctx, key).Err()
	if err != nil {
		r.log.Error("Failed to delete cached session", zap.Error(err), zap.String("session_id", sessionID))
		return fmt.Errorf("failed to delete cached session: %w", err)
	}

	return nil
}

func (r *cacheRepository) SetRecentMessages(ctx context.Context, sessionID string, messages []*models.Message, ttl time.Duration) error {
	key := fmt.Sprintf("messages:%s", sessionID)

	fmt.Println("called messages REDISSS")
	data, err := json.Marshal(messages)
	if err != nil {
		r.log.Error("Failed to marshal messages", zap.Error(err), zap.String("session_id", sessionID))
		return fmt.Errorf("failed to marshal messages: %w", err)
	}

	err = r.rdb.Set(ctx, key, data, ttl).Err()
	if err != nil {
		r.log.Error("Failed to cache messages", zap.Error(err), zap.String("session_id", sessionID))
		return fmt.Errorf("failed to cache messages: %w", err)
	}

	return nil
}

func (r *cacheRepository) GetRecentMessages(ctx context.Context, sessionID string) ([]*models.Message, error) {
	key := fmt.Sprintf("messages:%s", sessionID)

	data, err := r.rdb.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("messages not found in cache")
		}
		r.log.Error("Failed to get cached messages", zap.Error(err), zap.String("session_id", sessionID))
		return nil, fmt.Errorf("failed to get cached messages: %w", err)
	}

	var messages []*models.Message
	if err := json.Unmarshal([]byte(data), &messages); err != nil {
		r.log.Error("Failed to unmarshal cached messages", zap.Error(err), zap.String("session_id", sessionID))
		return nil, fmt.Errorf("failed to unmarshal cached messages: %w", err)
	}

	return messages, nil
}

func (r *cacheRepository) SetTypingStatus(ctx context.Context, sessionID, userID string, isTyping bool, ttl time.Duration) error {
	key := fmt.Sprintf("typing:%s", sessionID)

	if isTyping {
		err := r.rdb.SAdd(ctx, key, userID).Err()
		if err != nil {
			r.log.Error("Failed to set typing status", zap.Error(err), zap.String("session_id", sessionID), zap.String("user_id", userID))
			return fmt.Errorf("failed to set typing status: %w", err)
		}

		// Set TTL
		r.rdb.Expire(ctx, key, ttl)
	} else {
		err := r.rdb.SRem(ctx, key, userID).Err()
		if err != nil {
			r.log.Error("Failed to remove typing status", zap.Error(err), zap.String("session_id", sessionID), zap.String("user_id", userID))
			return fmt.Errorf("failed to remove typing status: %w", err)
		}
	}

	return nil
}

func (r *cacheRepository) GetTypingUsers(ctx context.Context, sessionID string) ([]string, error) {
	key := fmt.Sprintf("typing:%s", sessionID)

	users, err := r.rdb.SMembers(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return []string{}, nil
		}
		r.log.Error("Failed to get typing users", zap.Error(err), zap.String("session_id", sessionID))
		return nil, fmt.Errorf("failed to get typing users: %w", err)
	}

	return users, nil
}

func (r *cacheRepository) InvalidateSessionCache(ctx context.Context, sessionID string) error {
	keys := []string{
		fmt.Sprintf("session:%s", sessionID),
		fmt.Sprintf("messages:%s", sessionID),
		fmt.Sprintf("typing:%s", sessionID),
	}

	err := r.rdb.Del(ctx, keys...).Err()
	if err != nil {
		r.log.Error("Failed to invalidate session cache", zap.Error(err), zap.String("session_id", sessionID))
		return fmt.Errorf("failed to invalidate session cache: %w", err)
	}

	return nil
}
