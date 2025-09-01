package grpc

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/Sourav01112/chat-service/internal/models"
	"github.com/Sourav01112/chat-service/internal/service"
	pb "github.com/Sourav01112/chat-service/proto"
)

func (s *Server) CreateSession(ctx context.Context, req *pb.CreateSessionRequest) (*pb.CreateSessionResponse, error) {
	serviceReq := &service.CreateSessionRequest{
		UserID: req.UserId,
		Title:  req.Title,
	}

	if req.Settings != nil {
		serviceReq.Settings = models.SessionSettings{
			AIPersona:       req.Settings.AiPersona,
			Temperature:     req.Settings.Temperature,
			MaxTokens:       int(req.Settings.MaxTokens),
			EnableRAG:       req.Settings.EnableRag,
			DocumentSources: req.Settings.DocumentSources,
			SystemPrompt:    req.Settings.SystemPrompt,
		}
	}

	session, err := s.chatService.CreateSession(ctx, serviceReq)
	if err != nil {
		return &pb.CreateSessionResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.CreateSessionResponse{
		Session: sessionToProto(session),
		Success: true,
	}, nil
}

func (s *Server) GetSession(ctx context.Context, req *pb.GetSessionRequest) (*pb.GetSessionResponse, error) {
	session, err := s.chatService.GetSession(ctx, req.SessionId, req.UserId)
	if err != nil {
		return &pb.GetSessionResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.GetSessionResponse{
		Session: sessionToProto(session),
		Success: true,
	}, nil
}

func (s *Server) GetUserSessions(ctx context.Context, req *pb.GetUserSessionsRequest) (*pb.GetUserSessionsResponse, error) {
	limit := int(req.Limit)
	if limit <= 0 {
		limit = 20
	}

	response, err := s.chatService.GetUserSessions(ctx, req.UserId, limit, int(req.Offset))
	if err != nil {
		return &pb.GetUserSessionsResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	sessions := make([]*pb.Session, len(response.Sessions))
	for i, session := range response.Sessions {
		sessions[i] = sessionToProto(session)
	}

	return &pb.GetUserSessionsResponse{
		Sessions:   sessions,
		TotalCount: response.TotalCount,
		HasMore:    response.HasMore,
		Success:    true,
	}, nil
}

func (s *Server) UpdateSession(ctx context.Context, req *pb.UpdateSessionRequest) (*pb.UpdateSessionResponse, error) {
	serviceReq := &service.UpdateSessionRequest{
		SessionID: req.SessionId,
		UserID:    req.UserId,
	}

	if req.Title != "" {
		serviceReq.Title = &req.Title
	}

	if req.Status != "" {
		status := models.SessionStatus(req.Status)
		serviceReq.Status = &status
	}

	if req.Settings != nil {
		settings := models.SessionSettings{
			AIPersona:       req.Settings.AiPersona,
			Temperature:     req.Settings.Temperature,
			MaxTokens:       int(req.Settings.MaxTokens),
			EnableRAG:       req.Settings.EnableRag,
			DocumentSources: req.Settings.DocumentSources,
			SystemPrompt:    req.Settings.SystemPrompt,
		}
		serviceReq.Settings = &settings
	}

	session, err := s.chatService.UpdateSession(ctx, serviceReq)
	if err != nil {
		return &pb.UpdateSessionResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.UpdateSessionResponse{
		Session: sessionToProto(session),
		Success: true,
	}, nil
}

func (s *Server) DeleteSession(ctx context.Context, req *pb.DeleteSessionRequest) (*emptypb.Empty, error) {
	err := s.chatService.DeleteSession(ctx, req.SessionId, req.UserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to delete session: %v", err)
	}

	return &emptypb.Empty{}, nil
}

func (s *Server) SendMessage(ctx context.Context, req *pb.SendMessageRequest) (*pb.SendMessageResponse, error) {
	serviceReq := &service.SendMessageRequest{
		SessionID: req.SessionId,
		UserID:    req.UserId,
		Content:   req.Content,
		Type:      models.MessageType(req.Type),
	}

	if req.Metadata != nil {
		serviceReq.Metadata = models.MessageMetadata{
			SourceCitations: req.Metadata.SourceCitations,
			RelevanceScore:  req.Metadata.RelevanceScore,
			Tags:            req.Metadata.Tags,
			ModelUsed:       req.Metadata.ModelUsed,
			TokenCount:      int(req.Metadata.TokenCount),
			ResponseTimeMs:  req.Metadata.ResponseTimeMs,
			ProcessingSteps: req.Metadata.ProcessingSteps,
		}
	}

	if req.ParentMessageId != "" {
		serviceReq.ParentMessageID = &req.ParentMessageId
	}

	message, err := s.chatService.SendMessage(ctx, serviceReq)
	if err != nil {
		return &pb.SendMessageResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.SendMessageResponse{
		Message: messageToProto(message),
		Success: true,
	}, nil
}

func (s *Server) GetChatHistory(ctx context.Context, req *pb.GetChatHistoryRequest) (*pb.GetChatHistoryResponse, error) {
	serviceReq := &service.GetChatHistoryRequest{
		SessionID: req.SessionId,
		UserID:    req.UserId,
		Limit:     int(req.Limit),
		Offset:    int(req.Offset),
	}

	if req.FromDate != nil {
		fromTime := req.FromDate.AsTime()
		serviceReq.FromDate = &fromTime
	}

	if req.ToDate != nil {
		toTime := req.ToDate.AsTime()
		serviceReq.ToDate = &toTime
	}

	response, err := s.chatService.GetChatHistory(ctx, serviceReq)
	if err != nil {
		return &pb.GetChatHistoryResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	messages := make([]*pb.Message, len(response.Messages))
	for i, message := range response.Messages {
		messages[i] = messageToProto(message)
	}

	return &pb.GetChatHistoryResponse{
		Messages:   messages,
		TotalCount: response.TotalCount,
		HasMore:    response.HasMore,
		Success:    true,
	}, nil
}

func (s *Server) DeleteMessage(ctx context.Context, req *pb.DeleteMessageRequest) (*emptypb.Empty, error) {
	err := s.chatService.DeleteMessage(ctx, req.MessageId, req.UserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to delete message: %v", err)
	}

	return &emptypb.Empty{}, nil
}

func (s *Server) SearchMessages(ctx context.Context, req *pb.SearchMessagesRequest) (*pb.SearchMessagesResponse, error) {
	serviceReq := &service.SearchMessagesRequest{
		SessionID: req.SessionId,
		UserID:    req.UserId,
		Query:     req.Query,
		Limit:     int(req.Limit),
		Offset:    int(req.Offset),
	}

	response, err := s.chatService.SearchMessages(ctx, serviceReq)
	if err != nil {
		return &pb.SearchMessagesResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	messages := make([]*pb.Message, len(response.Messages))
	for i, message := range response.Messages {
		messages[i] = messageToProto(message)
	}

	return &pb.SearchMessagesResponse{
		Messages:   messages,
		TotalCount: response.TotalCount,
		HasMore:    response.HasMore,
		Success:    true,
	}, nil
}

func (s *Server) UpdateTypingStatus(ctx context.Context, req *pb.UpdateTypingStatusRequest) (*emptypb.Empty, error) {
	serviceReq := &service.UpdateTypingStatusRequest{
		SessionID: req.SessionId,
		UserID:    req.UserId,
		IsTyping:  req.IsTyping,
	}

	err := s.chatService.UpdateTypingStatus(ctx, serviceReq)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to update typing status: %v", err)
	}

	return &emptypb.Empty{}, nil
}

func (s *Server) GetTypingUsers(ctx context.Context, req *pb.GetTypingUsersRequest) (*pb.GetTypingUsersResponse, error) {
	users, err := s.chatService.GetTypingUsers(ctx, req.SessionId)
	if err != nil {
		return &pb.GetTypingUsersResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.GetTypingUsersResponse{
		UserIds: users,
		Success: true,
	}, nil
}

func sessionToProto(session *models.Session) *pb.Session {
	return &pb.Session{
		Id:           session.ID,
		UserId:       session.UserID,
		Title:        session.Title,
		Status:       session.Status.String(),
		Settings:     sessionSettingsToProto(session.Settings),
		CreatedAt:    timestamppb.New(session.CreatedAt),
		UpdatedAt:    timestamppb.New(session.UpdatedAt),
		LastActivity: timestamppb.New(session.LastActivity),
	}
}

func sessionSettingsToProto(settings models.SessionSettings) *pb.SessionSettings {
	return &pb.SessionSettings{
		AiPersona:       settings.AIPersona,
		Temperature:     settings.Temperature,
		MaxTokens:       int32(settings.MaxTokens),
		EnableRag:       settings.EnableRAG,
		DocumentSources: settings.DocumentSources,
		SystemPrompt:    settings.SystemPrompt,
	}
}

func messageToProto(message *models.Message) *pb.Message {
	pbMessage := &pb.Message{
		Id:         message.ID,
		SessionId:  message.SessionID,
		UserId:     message.UserID,
		Content:    message.Content,
		Type:       message.Type.String(),
		Metadata:   messageMetadataToProto(message.Metadata),
		CreatedAt:  timestamppb.New(message.CreatedAt),
		OrderIndex: int32(message.OrderIndex),
	}

	if message.ParentMessageID != nil {
		pbMessage.ParentMessageId = *message.ParentMessageID
	}

	return pbMessage
}

func messageMetadataToProto(metadata models.MessageMetadata) *pb.MessageMetadata {
	return &pb.MessageMetadata{
		SourceCitations: metadata.SourceCitations,
		RelevanceScore:  metadata.RelevanceScore,
		Tags:            metadata.Tags,
		ModelUsed:       metadata.ModelUsed,
		TokenCount:      int32(metadata.TokenCount),
		ResponseTimeMs:  metadata.ResponseTimeMs,
		ProcessingSteps: metadata.ProcessingSteps,
	}
}
