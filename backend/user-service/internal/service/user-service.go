package service

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/Sourav01112/user-service/internal/config"
	"github.com/Sourav01112/user-service/internal/models"
	"github.com/Sourav01112/user-service/internal/repository"
	"github.com/Sourav01112/user-service/internal/utils"
)

type UserService interface {
	Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error)
	Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error)
	GetUser(ctx context.Context, userID string) (*models.User, error)
	UpdateUser(ctx context.Context, userID string, req *UpdateUserRequest) (*models.User, error)
	DeleteUser(ctx context.Context, userID string) error
	GetPreferences(ctx context.Context, userID string) (*models.UserPreferences, error)
	UpdatePreferences(ctx context.Context, req *UpdatePreferencesRequest) (*models.UserPreferences, error)
	GetUserStats(ctx context.Context, userID string, fromDate, toDate time.Time) (*models.UserStats, error)
	RecordActivity(ctx context.Context, req *RecordActivityRequest) error
	RefreshToken(ctx context.Context, refreshToken string) (*utils.TokenPair, error)
	VerifyToken(ctx context.Context, token string) (*utils.JWTClaims, error)
}

type userService struct {
	userRepo        repository.UserRepository
	prefsRepo       repository.PreferencesRepository
	analyticsRepo   repository.AnalyticsRepository
	passwordManager *utils.PasswordManager
	jwtManager      *utils.JWTManager
	config          *config.Config
	log             *zap.Logger
}

type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8"`
	Username  string `json:"username" validate:"required,min=3,max=30"`
	FirstName string `json:"first_name" validate:"max=100"`
	LastName  string `json:"last_name" validate:"max=100"`
}

type RegisterResponse struct {
	User   *models.User     `json:"user"`
	Tokens *utils.TokenPair `json:"tokens"`
}

type LoginRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required"`
	RememberMe bool   `json:"remember_me"`
	IPAddress  string `json:"ip_address"`
	UserAgent  string `json:"user_agent"`
}

type LoginResponse struct {
	User   *models.User     `json:"user"`
	Tokens *utils.TokenPair `json:"tokens"`
}

type UpdateUserRequest struct {
	FirstName string `json:"first_name" validate:"max=100"`
	LastName  string `json:"last_name" validate:"max=100"`
	Username  string `json:"username" validate:"min=3,max=30"`
	AvatarURL string `json:"avatar_url" validate:"url"`
}

type UpdatePreferencesRequest struct {
	UserID               string               `json:"user_id" validate:"required"`
	Theme                string               `json:"theme" validate:"oneof=light dark system"`
	Language             string               `json:"language" validate:"len=2"`
	Timezone             string               `json:"timezone"`
	NotificationsEnabled bool                 `json:"notifications_enabled"`
	EmailNotifications   bool                 `json:"email_notifications"`
	PushNotifications    bool                 `json:"push_notifications"`
	AIPreferences        models.AIPreferences `json:"ai_preferences"`
	ProfileVisibility    string               `json:"profile_visibility" validate:"oneof=public private friends"`
	DataSharing          bool                 `json:"data_sharing"`
}

type RecordActivityRequest struct {
	UserID       string            `json:"user_id" validate:"required"`
	ActivityType string            `json:"activity_type" validate:"required"`
	Metadata     map[string]string `json:"metadata"`
	IPAddress    string            `json:"ip_address"`
	UserAgent    string            `json:"user_agent"`
	SessionID    string            `json:"session_id"`
}

func NewUserService(
	userRepo repository.UserRepository,
	prefsRepo repository.PreferencesRepository,
	analyticsRepo repository.AnalyticsRepository,
	passwordManager *utils.PasswordManager,
	jwtManager *utils.JWTManager,
	config *config.Config,
	log *zap.Logger,
) UserService {
	return &userService{
		userRepo:        userRepo,
		prefsRepo:       prefsRepo,
		analyticsRepo:   analyticsRepo,
		passwordManager: passwordManager,
		jwtManager:      jwtManager,
		config:          config,
		log:             log,
	}
}

func (s *userService) Register(ctx context.Context, req *RegisterRequest) (*RegisterResponse, error) {
	if err := utils.ValidateEmail(req.Email); err != nil {
		return nil, fmt.Errorf("invalid email: %w", err)
	}

	if err := utils.ValidateUsername(req.Username); err != nil {
		return nil, fmt.Errorf("invalid username: %w", err)
	}

	if err := s.passwordManager.ValidatePassword(req.Password); err != nil {
		return nil, fmt.Errorf("invalid password: %w", err)
	}

	emailExists, err := s.userRepo.EmailExists(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email existence: %w", err)
	}
	if emailExists {
		return nil, fmt.Errorf("email already registered")
	}

	usernameExists, err := s.userRepo.UsernameExists(ctx, req.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to check username existence: %w", err)
	}
	if usernameExists {
		return nil, fmt.Errorf("username already taken")
	}

	hashedPassword, err := s.passwordManager.HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		Email:        req.Email,
		Username:     req.Username,
		FirstName:    req.FirstName,
		LastName:     req.LastName,
		PasswordHash: hashedPassword,
		Role:         models.RoleUser,
		Status:       models.StatusActive,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	preferences := &models.UserPreferences{
		UserID:               user.ID,
		Theme:                "system",
		Language:             "en",
		Timezone:             "UTC",
		NotificationsEnabled: true,
		EmailNotifications:   true,
		PushNotifications:    true,
		AIPreferences: models.AIPreferences{
			DefaultPersona:  "assistant",
			Temperature:     0.7,
			MaxTokens:       2048,
			EnableRAG:       true,
			PreferredModels: []string{"gpt-3.5-turbo"},
		},
		ProfileVisibility: "public",
		DataSharing:       false,
	}

	// fmt.Printf("User Preferences: %+v\n", preferences)

	if err := s.prefsRepo.Create(ctx, preferences); err != nil {
		s.log.Error("Failed to create default preferences", zap.Error(err), zap.String("user_id", user.ID))
	}

	tokens, err := s.jwtManager.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	_ = s.RecordActivity(ctx, &RecordActivityRequest{
		UserID:       user.ID,
		ActivityType: "registration",
		Metadata:     map[string]string{"method": "email"},
	})

	return &RegisterResponse{
		User:   user.Sanitize(),
		Tokens: tokens,
	}, nil
}

func (s *userService) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	user, err := s.userRepo.GetByEmail(ctx, req.Email)

	if user == nil && err != nil {
		return nil, fmt.Errorf("invalid credentials")
	}

	if user != nil && err != nil {
		_ = s.RecordActivity(ctx, &RecordActivityRequest{
			UserID:       user.ID,
			ActivityType: "failed_login",
			Metadata: map[string]string{
				"email":      req.Email,
				"reason":     "some_error",
				"ip":         req.IPAddress,
				"user_agent": req.UserAgent,
			},
		})
		return nil, fmt.Errorf("invalid credentials")
	}

	if !user.CanLogin() {
		if user.IsLocked() {
			return nil, fmt.Errorf("account is temporarily locked due to too many failed login attempts")
		}
		return nil, fmt.Errorf("account is not active")
	}

	if err := s.passwordManager.ComparePassword(user.PasswordHash, req.Password); err != nil {
		_ = s.userRepo.IncrementFailedLogins(ctx, user.ID)

		if user.FailedLoginAttempts+1 >= s.config.MaxLoginAttempts {
			_ = s.userRepo.LockAccount(ctx, user.ID, s.config.AccountLockoutDuration)
		}

		_ = s.RecordActivity(ctx, &RecordActivityRequest{
			UserID:       user.ID,
			ActivityType: "failed_login",
			Metadata: map[string]string{
				"reason":     "invalid_password",
				"ip":         req.IPAddress,
				"user_agent": req.UserAgent,
			},
		})
		return nil, fmt.Errorf("invalid credentials")
	}

	_ = s.userRepo.ResetFailedLogins(ctx, user.ID)

	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	tokens, err := s.jwtManager.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	_ = s.RecordActivity(ctx, &RecordActivityRequest{
		UserID:       user.ID,
		ActivityType: string(models.ActivityLogin),
		Metadata: map[string]string{
			"ip":          req.IPAddress,
			"user_agent":  req.UserAgent,
			"remember_me": fmt.Sprintf("%t", req.RememberMe),
		},
	})

	return &LoginResponse{
		User:   user.Sanitize(),
		Tokens: tokens,
	}, nil
}

func (s *userService) GetUser(ctx context.Context, userID string) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	return user.Sanitize(), nil
}

func (s *userService) UpdateUser(ctx context.Context, userID string, req *UpdateUserRequest) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if req.Username != "" && req.Username != user.Username {
		if err := utils.ValidateUsername(req.Username); err != nil {
			return nil, fmt.Errorf("invalid username: %w", err)
		}

		usernameExists, err := s.userRepo.UsernameExists(ctx, req.Username)
		if err != nil {
			return nil, fmt.Errorf("failed to check username availability: %w", err)
		}
		if usernameExists {
			return nil, fmt.Errorf("username already taken")
		}

		user.Username = req.Username
	}

	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}

	_ = s.RecordActivity(ctx, &RecordActivityRequest{
		UserID:       userID,
		ActivityType: string(models.ActivityProfileUpdate),
		Metadata:     map[string]string{"fields_updated": "profile"},
	})

	return user.Sanitize(), nil
}

func (s *userService) DeleteUser(ctx context.Context, userID string) error {
	if err := s.userRepo.Delete(ctx, userID); err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	// Clean up related data
	_ = s.prefsRepo.Delete(ctx, userID)
	_ = s.analyticsRepo.DeleteUserActivities(ctx, userID)

	return nil
}

func (s *userService) GetPreferences(ctx context.Context, userID string) (*models.UserPreferences, error) {
	preferences, err := s.prefsRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get preferences: %w", err)
	}

	return preferences, nil
}

func (s *userService) UpdatePreferences(ctx context.Context, req *UpdatePreferencesRequest) (*models.UserPreferences, error) {
	preferences, err := s.prefsRepo.GetByUserID(ctx, req.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get existing preferences: %w", err)
	}

	preferences.Theme = req.Theme
	preferences.Language = req.Language
	preferences.Timezone = req.Timezone
	preferences.NotificationsEnabled = req.NotificationsEnabled
	preferences.EmailNotifications = req.EmailNotifications
	preferences.PushNotifications = req.PushNotifications
	preferences.AIPreferences = req.AIPreferences
	preferences.ProfileVisibility = req.ProfileVisibility
	preferences.DataSharing = req.DataSharing

	if err := s.prefsRepo.Update(ctx, preferences); err != nil {
		return nil, fmt.Errorf("failed to update preferences: %w", err)
	}

	_ = s.RecordActivity(ctx, &RecordActivityRequest{
		UserID:       req.UserID,
		ActivityType: string(models.ActivityProfileUpdate),
		Metadata:     map[string]string{"fields_updated": "preferences"},
	})

	return preferences, nil
}

func (s *userService) GetUserStats(ctx context.Context, userID string, fromDate, toDate time.Time) (*models.UserStats, error) {
	stats, err := s.analyticsRepo.GetUserStats(ctx, userID, fromDate, toDate)
	if err != nil {
		return nil, fmt.Errorf("failed to get user stats: %w", err)
	}

	return stats, nil
}

func (s *userService) RecordActivity(ctx context.Context, req *RecordActivityRequest) error {
	metadata := make(map[string]interface{})
	for key, value := range req.Metadata {
		metadata[key] = value
	}
	var ipAddress *string
	if req.IPAddress != "" {
		ipAddress = &req.IPAddress
	} else if ipStr, ok := req.Metadata["ip"]; ok && ipStr != "" {
		ipAddress = &ipStr
	} else {
		ipAddress = nil
	}

	var userAgent string
	if (req.UserAgent) != "" {
		userAgent = req.UserAgent
	} else if agentStr, ok := req.Metadata["user_agent"]; ok && agentStr != "" {
		userAgent = agentStr
	}

	activity := &models.UserAnalytics{
		UserID:       req.UserID,
		ActivityType: models.ActivityType(req.ActivityType),
		Metadata:     models.JSON(metadata),
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		SessionID:    req.SessionID,
		CreatedAt:    time.Now(),
	}

	fmt.Printf("<<<<< activity: %+v\n", activity)

	if err := s.analyticsRepo.RecordActivityRepo(ctx, activity); err != nil {
		s.log.Error("Failed to record activity", zap.Error(err))
	}

	return nil
}

func (s *userService) RefreshToken(ctx context.Context, refreshToken string) (*utils.TokenPair, error) {
	claims, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if !user.CanLogin() {
		return nil, fmt.Errorf("user account is not active")
	}

	tokens, err := s.jwtManager.GenerateTokenPair(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate tokens: %w", err)
	}

	return tokens, nil
}

func (s *userService) VerifyToken(ctx context.Context, token string) (*utils.JWTClaims, error) {
	claims, err := s.jwtManager.ValidateToken(token)
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	if !user.CanLogin() {
		return nil, fmt.Errorf("user account is not active")
	}

	return claims, nil
}
