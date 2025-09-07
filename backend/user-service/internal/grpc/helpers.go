package grpc

import (
	"google.golang.org/protobuf/types/known/timestamppb"

	"github.com/Sourav01112/user-service/internal/models"
	"github.com/Sourav01112/user-service/internal/utils"
	pb "github.com/Sourav01112/user-service/proto"
)

func userToProto(user *models.User) *pb.User {
	pbUser := &pb.User{
		Id:            user.ID,
		Email:         user.Email,
		Username:      user.Username,
		FirstName:     user.FirstName,
		LastName:      user.LastName,
		AvatarUrl:     user.AvatarURL,
		Role:          string(user.Role),
		Status:        string(user.Status),
		EmailVerified: user.EmailVerified,
		CreatedAt:     timestamppb.New(user.CreatedAt),
		UpdatedAt:     timestamppb.New(user.UpdatedAt),
	}

	if user.LastLogin != nil {
		pbUser.LastLogin = timestamppb.New(*user.LastLogin)
	}

	return pbUser
}

func tokensToProto(tokens *utils.TokenPair) *pb.TokenPair {
	return &pb.TokenPair{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    timestamppb.New(tokens.ExpiresAt),
	}
}

func preferencesToProto(prefs *models.UserPreferences) *pb.UserPreferences {
	aiPrefs := &pb.AIPreferences{
		DefaultPersona:     prefs.AIPreferences.DefaultPersona,
		Temperature:        prefs.AIPreferences.Temperature,
		MaxTokens:          int32(prefs.AIPreferences.MaxTokens),
		EnableRag:          prefs.AIPreferences.EnableRAG,
		PreferredModels:    prefs.AIPreferences.PreferredModels,
		CustomInstructions: prefs.AIPreferences.CustomInstructions,
	}

	return &pb.UserPreferences{
		UserId:               prefs.UserID,
		Theme:                prefs.Theme,
		Language:             prefs.Language,
		Timezone:             prefs.Timezone,
		NotificationsEnabled: prefs.NotificationsEnabled,
		EmailNotifications:   prefs.EmailNotifications,
		PushNotifications:    prefs.PushNotifications,
		AiPreferences:        aiPrefs,
		ProfileVisibility:    prefs.ProfileVisibility,
		DataSharing:          prefs.DataSharing,
		CreatedAt:            timestamppb.New(prefs.CreatedAt),
		UpdatedAt:            timestamppb.New(prefs.UpdatedAt),
	}
}

func statsToProto(stats *models.UserStats) *pb.UserStats {
	return &pb.UserStats{
		UserId:             stats.UserID,
		TotalSessions:      stats.TotalSessions,
		TotalMessages:      stats.TotalMessages,
		AvgSessionDuration: stats.AvgSessionDuration,
		LastActivity:       timestamppb.New(stats.LastActivity),
		TokensUsed:         stats.TokensUsed,
		FeatureUsage:       stats.FeatureUsage,
		LoginStreak:        int32(stats.LoginStreak),
		TotalLoginDays:     int32(stats.TotalLoginDays),
	}
}
