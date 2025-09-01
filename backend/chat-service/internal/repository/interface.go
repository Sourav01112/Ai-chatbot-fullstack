package repository

import (
    "context"
    "time"
    
    "github.com/Sourav01112/chat-service/internal/models"
)

type SessionRepository interface {
    Create(ctx context.Context, session *models.Session) error
    GetByID(ctx context.Context, sessionID string, userID string) (*models.Session, error)
    GetByUserID(ctx context.Context, userID string, limit, offset int) ([]*models.Session, int64, error)
    Update(ctx context.Context, session *models.Session) error
    Delete(ctx context.Context, sessionID string, userID string) error
    UpdateLastActivity(ctx context.Context, sessionID string) error
    GetActiveSessionsCount(ctx context.Context, userID string) (int64, error)
}

type MessageRepository interface {
    Create(ctx context.Context, message *models.Message) error
    GetByID(ctx context.Context, messageID string) (*models.Message, error)
    GetBySessionID(ctx context.Context, sessionID string, limit, offset int) ([]*models.Message, int64, error)
    Update(ctx context.Context, message *models.Message) error
    Delete(ctx context.Context, messageID string, userID string) error
    GetLastMessages(ctx context.Context, sessionID string, count int) ([]*models.Message, error)
    SearchInSession(ctx context.Context, sessionID string, query string, limit, offset int) ([]*models.Message, int64, error)
    GetMessageCount(ctx context.Context, sessionID string) (int64, error)
}

type CacheRepository interface {
    SetSession(ctx context.Context, session *models.Session, ttl time.Duration) error
    GetSession(ctx context.Context, sessionID string) (*models.Session, error)
    DeleteSession(ctx context.Context, sessionID string) error
    SetRecentMessages(ctx context.Context, sessionID string, messages []*models.Message, ttl time.Duration) error
    GetRecentMessages(ctx context.Context, sessionID string) ([]*models.Message, error)
    SetTypingStatus(ctx context.Context, sessionID, userID string, isTyping bool, ttl time.Duration) error
    GetTypingUsers(ctx context.Context, sessionID string) ([]string, error)
    InvalidateSessionCache(ctx context.Context, sessionID string) error
}