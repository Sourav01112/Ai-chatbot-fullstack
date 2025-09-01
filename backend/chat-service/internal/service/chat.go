package service

import (
	"context"
	"fmt"

	"github.com/go-playground/validator/v10"
	"go.uber.org/zap"

	"github.com/Sourav01112/chat-service/internal/config"
	"github.com/Sourav01112/chat-service/internal/models"
	"github.com/Sourav01112/chat-service/internal/repository"
)

type chatService struct {
	sessionRepo repository.SessionRepository
	messageRepo repository.MessageRepository
	cacheRepo   repository.CacheRepository
	config      *config.Config
	validator   *validator.Validate
	log         *zap.Logger
}

func NewChatService(
	sessionRepo repository.SessionRepository,
	messageRepo repository.MessageRepository,
	cacheRepo repository.CacheRepository,
	config *config.Config,
	log *zap.Logger,
) ChatService {
	return &chatService{
		sessionRepo: sessionRepo,
		messageRepo: messageRepo,
		cacheRepo:   cacheRepo,
		config:      config,
		validator:   validator.New(),
		log:         log,
	}
}

func (s *chatService) CreateSession(ctx context.Context, req *CreateSessionRequest) (*models.Session, error) {
	if err := s.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	activeCount, err := s.sessionRepo.GetActiveSessionsCount(ctx, req.UserID)
	if err != nil {
		s.log.Error("Failed to check active sessions count", zap.Error(err))
	} else if activeCount > 50 {
		return nil, fmt.Errorf("maximum active sessions limit exceeded")
	}

	settings := req.Settings
	if settings.AIPersona == "" {
		settings = models.GetDefaultSettings()
	}

	session := &models.Session{
		UserID:   req.UserID,
		Title:    req.Title,
		Status:   models.SessionStatusActive,
		Settings: settings,
	}

	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to create session: %w", err)
	}

	_ = s.cacheRepo.SetSession(ctx, session, s.config.CacheTTLSessions)

	s.log.Info("Session created successfully",
		zap.String("session_id", session.ID),
		zap.String("user_id", req.UserID))

	return session, nil
}

func (s *chatService) GetSession(ctx context.Context, sessionID string, userID string) (*models.Session, error) {
	if session, err := s.cacheRepo.GetSession(ctx, sessionID); err == nil {
		if session.UserID == userID {
			return session, nil
		}
		return nil, fmt.Errorf("session not found or access denied")
	}

	session, err := s.sessionRepo.GetByID(ctx, sessionID, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	_ = s.cacheRepo.SetSession(ctx, session, s.config.CacheTTLSessions)

	return session, nil
}

func (s *chatService) GetUserSessions(ctx context.Context, userID string, limit, offset int) (*GetUserSessionsResponse, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	sessions, total, err := s.sessionRepo.GetByUserID(ctx, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get user sessions: %w", err)
	}

	return &GetUserSessionsResponse{
		Sessions:   sessions,
		TotalCount: total,
		HasMore:    int64(offset+len(sessions)) < total,
	}, nil
}

func (s *chatService) UpdateSession(ctx context.Context, req *UpdateSessionRequest) (*models.Session, error) {
	if err := s.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	session, err := s.GetSession(ctx, req.SessionID, req.UserID)
	if err != nil {
		return nil, err
	}

	if req.Title != nil {
		session.Title = *req.Title
	}
	if req.Status != nil {
		session.Status = *req.Status
	}
	if req.Settings != nil {
		session.Settings = *req.Settings
	}

	if err := s.sessionRepo.Update(ctx, session); err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	_ = s.cacheRepo.SetSession(ctx, session, s.config.CacheTTLSessions)

	s.log.Info("Session updated successfully", zap.String("session_id", session.ID))

	return session, nil
}

func (s *chatService) DeleteSession(ctx context.Context, sessionID string, userID string) error {
	if err := s.sessionRepo.Delete(ctx, sessionID, userID); err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}

	_ = s.cacheRepo.InvalidateSessionCache(ctx, sessionID)

	s.log.Info("Session deleted successfully",
		zap.String("session_id", sessionID),
		zap.String("user_id", userID))

	return nil
}

func (s *chatService) SendMessage(ctx context.Context, req *SendMessageRequest) (*models.Message, error) {
	if err := s.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	if !req.Type.IsValid() {
		return nil, fmt.Errorf("invalid message type: %s", req.Type)
	}

	if len(req.Content) > s.config.MaxMessageLength {
		return nil, fmt.Errorf("message too long: max %d characters", s.config.MaxMessageLength)
	}

	session, err := s.GetSession(ctx, req.SessionID, req.UserID)
	if err != nil {
		return nil, err
	}

	if !session.IsActive() {
		return nil, fmt.Errorf("cannot send message to inactive session")
	}

	messageCount, err := s.messageRepo.GetMessageCount(ctx, req.SessionID)
	if err != nil {
		s.log.Error("Failed to check message count", zap.Error(err))
	} else if messageCount >= int64(s.config.MaxMessagesPerSession) {
		return nil, fmt.Errorf("maximum messages per session limit exceeded")
	}

	message := &models.Message{
		SessionID:       req.SessionID,
		UserID:          req.UserID,
		Content:         req.Content,
		Type:            req.Type,
		Metadata:        req.Metadata,
		ParentMessageID: req.ParentMessageID,
	}

	if err := s.messageRepo.Create(ctx, message); err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	_ = s.sessionRepo.UpdateLastActivity(ctx, req.SessionID)

	_ = s.cacheRepo.InvalidateSessionCache(ctx, req.SessionID)

	s.log.Info("Message sent successfully",
		zap.String("message_id", message.ID),
		zap.String("session_id", req.SessionID),
		zap.String("type", req.Type.String()))

	return message, nil
}

func (s *chatService) GetChatHistory(ctx context.Context, req *GetChatHistoryRequest) (*GetChatHistoryResponse, error) {
	if err := s.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	_, err := s.GetSession(ctx, req.SessionID, req.UserID)
	if err != nil {
		return nil, err
	}

	if req.Limit <= 0 {
		req.Limit = 50
	}
	if req.Limit > 100 {
		req.Limit = 100
	}

	if req.Offset == 0 && req.FromDate == nil && req.ToDate == nil {
		if cachedMessages, err := s.cacheRepo.GetRecentMessages(ctx, req.SessionID); err == nil {
			if len(cachedMessages) >= req.Limit {
				return &GetChatHistoryResponse{
					Messages:   cachedMessages[:req.Limit],
					TotalCount: int64(len(cachedMessages)),
					HasMore:    len(cachedMessages) > req.Limit,
				}, nil
			}
		}
	}

	messages, total, err := s.messageRepo.GetBySessionID(ctx, req.SessionID, req.Limit, req.Offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get chat history: %w", err)
	}

	if req.Offset == 0 && len(messages) > 0 {
		_ = s.cacheRepo.SetRecentMessages(ctx, req.SessionID, messages, s.config.CacheTTLMessages)
	}

	return &GetChatHistoryResponse{
		Messages:   messages,
		TotalCount: total,
		HasMore:    int64(req.Offset+len(messages)) < total,
	}, nil
}

func (s *chatService) DeleteMessage(ctx context.Context, messageID string, userID string) error {
	if err := s.messageRepo.Delete(ctx, messageID, userID); err != nil {
		return fmt.Errorf("failed to delete message: %w", err)
	}

	s.log.Info("Message deleted successfully",
		zap.String("message_id", messageID),
		zap.String("user_id", userID))

	return nil
}

func (s *chatService) SearchMessages(ctx context.Context, req *SearchMessagesRequest) (*SearchMessagesResponse, error) {
	if err := s.validator.Struct(req); err != nil {
		return nil, fmt.Errorf("validation error: %w", err)
	}

	_, err := s.GetSession(ctx, req.SessionID, req.UserID)
	if err != nil {
		return nil, err
	}

	if req.Limit <= 0 {
		req.Limit = 20
	}
	if req.Limit > 100 {
		req.Limit = 100
	}

	messages, total, err := s.messageRepo.SearchInSession(ctx, req.SessionID, req.Query, req.Limit, req.Offset)
	if err != nil {
		return nil, fmt.Errorf("failed to search messages: %w", err)
	}

	return &SearchMessagesResponse{
		Messages:   messages,
		TotalCount: total,
		HasMore:    int64(req.Offset+len(messages)) < total,
	}, nil
}

func (s *chatService) UpdateTypingStatus(ctx context.Context, req *UpdateTypingStatusRequest) error {
	if err := s.validator.Struct(req); err != nil {
		return fmt.Errorf("validation error: %w", err)
	}

	_, err := s.GetSession(ctx, req.SessionID, req.UserID)
	if err != nil {
		return err
	}

	err = s.cacheRepo.SetTypingStatus(ctx, req.SessionID, req.UserID, req.IsTyping, s.config.CacheTTLTyping)
	if err != nil {
		return fmt.Errorf("failed to update typing status: %w", err)
	}

	return nil
}

func (s *chatService) GetTypingUsers(ctx context.Context, sessionID string) ([]string, error) {
	users, err := s.cacheRepo.GetTypingUsers(ctx, sessionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get typing users: %w", err)
	}

	return users, nil
}
