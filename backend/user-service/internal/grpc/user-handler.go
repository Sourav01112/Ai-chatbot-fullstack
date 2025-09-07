package grpc

import (
	"context"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"

	"github.com/Sourav01112/user-service/internal/models"
	"github.com/Sourav01112/user-service/internal/service"
	pb "github.com/Sourav01112/user-service/proto"
)

func (s *Server) Register(ctx context.Context, req *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	serviceReq := &service.RegisterRequest{
		Email:     req.Email,
		Password:  req.Password,
		Username:  req.Username,
		FirstName: req.FirstName,
		LastName:  req.LastName,
	}

	resp, err := s.userService.Register(ctx, serviceReq)
	if err != nil {
		return &pb.RegisterResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.RegisterResponse{
		User:    userToProto(resp.User),
		Tokens:  tokensToProto(resp.Tokens),
		Success: true,
	}, nil
}

func (s *Server) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginResponse, error) {
	serviceReq := &service.LoginRequest{
		Email:      req.Email,
		Password:   req.Password,
		RememberMe: req.RememberMe,
		IPAddress:  req.IpAddress,
		UserAgent:  req.UserAgent,
	}

	resp, err := s.userService.Login(ctx, serviceReq)
	if err != nil {
		return &pb.LoginResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.LoginResponse{
		User:    userToProto(resp.User),
		Tokens:  tokensToProto(resp.Tokens),
		Success: true,
	}, nil
}

func (s *Server) RefreshToken(ctx context.Context, req *pb.RefreshTokenRequest) (*pb.RefreshTokenResponse, error) {
	tokens, err := s.userService.RefreshToken(ctx, req.RefreshToken)
	if err != nil {
		return &pb.RefreshTokenResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.RefreshTokenResponse{
		Tokens:  tokensToProto(tokens),
		Success: true,
	}, nil
}

func (s *Server) Logout(ctx context.Context, req *pb.LogoutRequest) (*emptypb.Empty, error) {
	_ = s.userService.RecordActivity(ctx, &service.RecordActivityRequest{
		UserID:       req.UserId,
		ActivityType: "logout",
	})

	return &emptypb.Empty{}, nil
}

func (s *Server) VerifyToken(ctx context.Context, req *pb.VerifyTokenRequest) (*pb.VerifyTokenResponse, error) {
	claims, err := s.userService.VerifyToken(ctx, req.AccessToken)
	if err != nil {
		return &pb.VerifyTokenResponse{
			Valid: false,
			Error: err.Error(),
		}, nil
	}

	user, err := s.userService.GetUser(ctx, claims.UserID)
	if err != nil {
		return &pb.VerifyTokenResponse{
			Valid: false,
			Error: err.Error(),
		}, nil
	}

	return &pb.VerifyTokenResponse{
		User:  userToProto(user),
		Valid: true,
	}, nil
}

func (s *Server) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	user, err := s.userService.GetUser(ctx, req.UserId)
	if err != nil {
		return &pb.GetUserResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.GetUserResponse{
		User:    userToProto(user),
		Success: true,
	}, nil
}

func (s *Server) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	serviceReq := &service.UpdateUserRequest{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Username:  req.Username,
		AvatarURL: req.AvatarUrl,
	}

	user, err := s.userService.UpdateUser(ctx, req.UserId, serviceReq)
	if err != nil {
		return &pb.UpdateUserResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.UpdateUserResponse{
		User:    userToProto(user),
		Success: true,
	}, nil
}

func (s *Server) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*emptypb.Empty, error) {
	err := s.userService.DeleteUser(ctx, req.UserId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to delete user: %v", err)
	}

	return &emptypb.Empty{}, nil
}

func (s *Server) GetPreferences(ctx context.Context, req *pb.GetPreferencesRequest) (*pb.GetPreferencesResponse, error) {
	preferences, err := s.userService.GetPreferences(ctx, req.UserId)
	if err != nil {
		return &pb.GetPreferencesResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.GetPreferencesResponse{
		Preferences: preferencesToProto(preferences),
		Success:     true,
	}, nil
}

func (s *Server) UpdatePreferences(ctx context.Context, req *pb.UpdatePreferencesRequest) (*pb.UpdatePreferencesResponse, error) {
	serviceReq := &service.UpdatePreferencesRequest{
		UserID:               req.Preferences.UserId,
		Theme:                req.Preferences.Theme,
		Language:             req.Preferences.Language,
		Timezone:             req.Preferences.Timezone,
		NotificationsEnabled: req.Preferences.NotificationsEnabled,
		EmailNotifications:   req.Preferences.EmailNotifications,
		PushNotifications:    req.Preferences.PushNotifications,
		ProfileVisibility:    req.Preferences.ProfileVisibility,
		DataSharing:          req.Preferences.DataSharing,
	}

	if req.Preferences.AiPreferences != nil {
		serviceReq.AIPreferences = models.AIPreferences{
			DefaultPersona:     req.Preferences.AiPreferences.DefaultPersona,
			Temperature:        req.Preferences.AiPreferences.Temperature,
			MaxTokens:          int(req.Preferences.AiPreferences.MaxTokens),
			EnableRAG:          req.Preferences.AiPreferences.EnableRag,
			PreferredModels:    req.Preferences.AiPreferences.PreferredModels,
			CustomInstructions: req.Preferences.AiPreferences.CustomInstructions,
		}
	}

	preferences, err := s.userService.UpdatePreferences(ctx, serviceReq)
	if err != nil {
		return &pb.UpdatePreferencesResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.UpdatePreferencesResponse{
		Preferences: preferencesToProto(preferences),
		Success:     true,
	}, nil
}

func (s *Server) GetUserStats(ctx context.Context, req *pb.GetUserStatsRequest) (*pb.GetUserStatsResponse, error) {
	fromDate := time.Now().AddDate(0, -1, 0) // Default to last month
	toDate := time.Now()

	if req.FromDate != nil {
		fromDate = req.FromDate.AsTime()
	}
	if req.ToDate != nil {
		toDate = req.ToDate.AsTime()
	}

	stats, err := s.userService.GetUserStats(ctx, req.UserId, fromDate, toDate)
	if err != nil {
		return &pb.GetUserStatsResponse{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	return &pb.GetUserStatsResponse{
		Stats:   statsToProto(stats),
		Success: true,
	}, nil
}

func (s *Server) RecordActivity(ctx context.Context, req *pb.RecordActivityRequest) (*emptypb.Empty, error) {
	serviceReq := &service.RecordActivityRequest{
		UserID:       req.UserId,
		ActivityType: req.ActivityType,
		Metadata:     req.Metadata,
		IPAddress:    req.IpAddress,
		UserAgent:    req.UserAgent,
		SessionID:    req.SessionId,
	}

	err := s.userService.RecordActivity(ctx, serviceReq)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "Failed to record activity: %v", err)
	}

	return &emptypb.Empty{}, nil
}
