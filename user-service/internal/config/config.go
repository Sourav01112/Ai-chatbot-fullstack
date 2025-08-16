package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Security SecurityConfig
	Logging  LoggingConfig
}

type ServerConfig struct {
	GRPCPort    string
	HTTPPort    string
	Host        string
	Environment string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	Secret           string
	AccessExpiresIn  time.Duration
	RefreshExpiresIn time.Duration
}

type SecurityConfig struct {
	BcryptRounds         int
	PasswordMinLength    int
	MaxLoginAttempts     int
	LoginLockoutDuration time.Duration
}

type LoggingConfig struct {
	Level  string
	Format string
}

func Load() (*Config, error) {
	if os.Getenv("ENVIRONMENT") != "production" {
		if err := godotenv.Load(); err != nil {
			zap.L().Warn("Could not load .env file", zap.Error(err))
		}
	}

	cfg := &Config{
		Server: ServerConfig{
			GRPCPort:    getEnv("GRPC_PORT", "50052"),
			HTTPPort:    getEnv("HTTP_PORT", "8080"),
			Host:        getEnv("HOST", "0.0.0.0"),
			Environment: getEnv("ENVIRONMENT", "development"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "password"),
			Name:     getEnv("DB_NAME", "chatapp"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:           getEnv("JWT_SECRET", ""),
			AccessExpiresIn:  parseDuration("JWT_ACCESS_EXPIRES_IN", "15m"),
			RefreshExpiresIn: parseDuration("JWT_REFRESH_EXPIRES_IN", "7d"),
		},
		Security: SecurityConfig{
			BcryptRounds:         parseInt("BCRYPT_ROUNDS", 12),
			PasswordMinLength:    parseInt("PASSWORD_MIN_LENGTH", 8),
			MaxLoginAttempts:     parseInt("MAX_LOGIN_ATTEMPTS", 5),
			LoginLockoutDuration: parseDuration("LOGIN_LOCKOUT_DURATION", "15m"),
		},
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

func (c *Config) Validate() error {
	if c.JWT.Secret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if len(c.JWT.Secret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters long")
	}
	if c.Database.Host == "" {
		return fmt.Errorf("DB_HOST is required")
	}
	return nil
}

func (c *Config) DatabaseDSN() string {
	return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func parseDuration(key, defaultValue string) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	duration, _ := time.ParseDuration(defaultValue)
	return duration
}
