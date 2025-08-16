package utils

import (
	"errors"
	"time"

	"github.com/Sourav01112/user-service/internal/config"
	"github.com/Sourav01112/user-service/internal/models"
	"github.com/golang-jwt/jwt/v5"
)

type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

type Claims struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	TokenType TokenType `json:"token_type"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}

type JWTManager struct {
	config *config.Config
}

func NewJWTManager(cfg *config.Config) *JWTManager {
	return &JWTManager{
		config: cfg,
	}
}

func (j *JWTManager) GenerateTokenPair(user *models.User) (*TokenPair, error) {
	now := time.Now()

	accessClaims := &Claims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      string(user.Role),
		TokenType: AccessToken,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.config.JWT.AccessExpiresIn)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "user-service",
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString([]byte(j.config.JWT.Secret))
	if err != nil {
		return nil, err
	}

	refreshClaims := &Claims{
		UserID:    user.ID,
		Email:     user.Email,
		Role:      string(user.Role),
		TokenType: RefreshToken,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(j.config.JWT.RefreshExpiresIn)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "user-service",
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString([]byte(j.config.JWT.Secret))
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessTokenString,
		RefreshToken: refreshTokenString,
		ExpiresAt:    now.Add(j.config.JWT.AccessExpiresIn),
	}, nil
}

func (j *JWTManager) ValidateToken(tokenString string, expectedType TokenType) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(j.config.JWT.Secret), nil
	})

	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	if claims.TokenType != expectedType {
		return nil, errors.New("invalid token type")
	}

	return claims, nil
}

func (j *JWTManager) RefreshToken(refreshTokenString string) (*TokenPair, error) {
	claims, err := j.ValidateToken(refreshTokenString, RefreshToken)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:    claims.UserID,
		Email: claims.Email,
		Role:  models.UserRole(claims.Role),
	}

	return j.GenerateTokenPair(user)
}

func (j *JWTManager) ExtractUserID(tokenString string) (string, error) {
	claims, err := j.ValidateToken(tokenString, AccessToken)
	if err != nil {
		return "", err
	}
	return claims.UserID, nil
}
