package service

import (
    "context"
    "time"
    
    "github.com/Sourav01112/chat-service/internal/models"
)

type ChatService interface {
    // Session operations
    CreateSession(ctx context.Context, req *CreateSessionRequest) (*models.Session, error)
    GetSession(ctx context.Context, sessionID string, userID string) (*models.Session, error)
    GetUserSessions(ctx context.Context, userID string, limit, offset int) (*GetUserSessionsResponse, error)
    UpdateSession(ctx context.Context, req *UpdateSessionRequest) (*models.Session, error)
    DeleteSession(ctx context.Context, sessionID string, userID string) error
    
    // Message operations
    SendMessage(ctx context.Context, req *SendMessageRequest) (*models.Message, error)
    GetChatHistory(ctx context.Context, req *GetChatHistoryRequest) (*GetChatHistoryResponse, error)
    DeleteMessage(ctx context.Context, messageID string, userID string) error
    SearchMessages(ctx context.Context, req *SearchMessagesRequest) (*SearchMessagesResponse, error)
    
    // Real-time operations
    UpdateTypingStatus(ctx context.Context, req *UpdateTypingStatusRequest) error
    GetTypingUsers(ctx context.Context, sessionID string) ([]string, error)
}

// Request/Response DTOs
type CreateSessionRequest struct {
    UserID   string                   `json:"user_id" validate:"required"`
    Title    string                   `json:"title" validate:"required,max=200"`
    Settings models.SessionSettings  `json:"settings"`
}

type GetUserSessionsResponse struct {
    Sessions   []*models.Session `json:"sessions"`
    TotalCount int64            `json:"total_count"`
    HasMore    bool             `json:"has_more"`
}

type UpdateSessionRequest struct {
    SessionID string                   `json:"session_id" validate:"required"`
    UserID    string                   `json:"user_id" validate:"required"`
    Title     *string                  `json:"title,omitempty"`
    Status    *models.SessionStatus    `json:"status,omitempty"`
    Settings  *models.SessionSettings  `json:"settings,omitempty"`
}

type SendMessageRequest struct {
    SessionID       string                   `json:"session_id" validate:"required"`
    UserID          string                   `json:"user_id" validate:"required"`
    Content         string                   `json:"content" validate:"required"`
    Type            models.MessageType       `json:"type" validate:"required"`
    Metadata        models.MessageMetadata   `json:"metadata"`
    ParentMessageID *string                  `json:"parent_message_id,omitempty"`
}

type GetChatHistoryRequest struct {
    SessionID string    `json:"session_id" validate:"required"`
    UserID    string    `json:"user_id" validate:"required"`
    Limit     int       `json:"limit" validate:"min=1,max=100"`
    Offset    int       `json:"offset" validate:"min=0"`
    FromDate  *time.Time `json:"from_date,omitempty"`
    ToDate    *time.Time `json:"to_date,omitempty"`
}

type GetChatHistoryResponse struct {
    Messages   []*models.Message `json:"messages"`
    TotalCount int64            `json:"total_count"`
    HasMore    bool             `json:"has_more"`
}

type SearchMessagesRequest struct {
    SessionID string `json:"session_id" validate:"required"`
    UserID    string `json:"user_id" validate:"required"`
    Query     string `json:"query" validate:"required,min=1"`
    Limit     int    `json:"limit" validate:"min=1,max=100"`
    Offset    int    `json:"offset" validate:"min=0"`
}

type SearchMessagesResponse struct {
    Messages   []*models.Message `json:"messages"`
    TotalCount int64            `json:"total_count"`
    HasMore    bool             `json:"has_more"`
}

type UpdateTypingStatusRequest struct {
    SessionID string `json:"session_id" validate:"required"`
    UserID    string `json:"user_id" validate:"required"`
    IsTyping  bool   `json:"is_typing"`
}