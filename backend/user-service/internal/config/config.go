package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server Configuration
	GRPCPort string `json:"grpc_port"`
	HTTPPort string `json:"http_port"`
	Host     string `json:"host"`
	Env      string `json:"environment"`

	// Database
	DatabaseURL            string `json:"database_url"`
	DatabaseMaxConnections int    `json:"database_max_connections"`
	DatabaseMaxIdle        int    `json:"database_max_idle"`

	// JWT
	JWTSecret           string        `json:"jwt_secret"`
	JWTAccessExpiresIn  time.Duration `json:"jwt_access_expires_in"`
	JWTRefreshExpiresIn time.Duration `json:"jwt_refresh_expires_in"`

	// Redis (optional - not in your env but keeping for future)
	RedisURL      string `json:"redis_url"`
	RedisPassword string `json:"redis_password"`
	RedisDB       int    `json:"redis_db"`

	// Security
	BCryptCost             int           `json:"bcrypt_cost"`
	MaxLoginAttempts       int           `json:"max_login_attempts"`
	AccountLockoutDuration time.Duration `json:"account_lockout_duration"`
	PasswordMinLength      int           `json:"password_min_length"`

	// Logging
	Logging LoggingConfig `json:"logging"`
}

type LoggingConfig struct {
	Level  string `json:"level"`
	Format string `json:"format"`
}

func Load() (*Config, error) {
	// Load .env file in development
	if os.Getenv("ENVIRONMENT") != "production" {
		if err := godotenv.Load(); err != nil {
			// Not fatal in production
		}
	}

	// Build database URL from individual components
	dbURL := buildDatabaseURL()

	config := &Config{
		// Server Configuration
		GRPCPort: getEnv("GRPC_PORT", "50052"),
		HTTPPort: getEnv("HTTP_PORT", "8080"),
		Host:     getEnv("HOST", "0.0.0.0"),
		Env:      getEnv("ENVIRONMENT", "development"),

		// Database
		DatabaseURL:            dbURL,
		DatabaseMaxConnections: getEnvInt("DATABASE_MAX_CONNECTIONS", 100),
		DatabaseMaxIdle:        getEnvInt("DATABASE_MAX_IDLE_CONNECTIONS", 10),

		// JWT
		JWTSecret:           getEnv("JWT_SECRET", ""),
		JWTAccessExpiresIn:  getEnvDuration("JWT_ACCESS_EXPIRES_IN", 15*time.Minute),
		JWTRefreshExpiresIn: getEnvDuration("JWT_REFRESH_EXPIRES_IN", 7*24*time.Hour),

		// Redis (optional)
		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		// Security
		BCryptCost:             getEnvInt("BCRYPT_ROUNDS", 12),
		MaxLoginAttempts:       getEnvInt("MAX_LOGIN_ATTEMPTS", 5),
		AccountLockoutDuration: getEnvDuration("LOGIN_LOCKOUT_DURATION", 15*time.Minute),
		PasswordMinLength:      getEnvInt("PASSWORD_MIN_LENGTH", 8),

		// Logging
		Logging: LoggingConfig{
			Level:  getEnv("LOG_LEVEL", "info"),
			Format: getEnv("LOG_FORMAT", "json"),
		},
	}

	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}

// Build database URL from individual environment variables
func buildDatabaseURL() string {
	host := getEnv("DB_HOST", "localhost")
	port := getEnv("DB_PORT", "5432")
	user := getEnv("DB_USER", "postgres")
	password := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "chatapp")
	sslMode := getEnv("DB_SSL_MODE", "disable")

	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s",
		user, password, host, port, dbName, sslMode)
}

func (c *Config) validate() error {
	required := map[string]string{
		"JWT_SECRET": c.JWTSecret,
	}

	for key, value := range required {
		if value == "" {
			return fmt.Errorf("required environment variable %s is not set", key)
		}
	}

	if len(c.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters long")
	}

	// Validate database components
	dbHost := getEnv("DB_HOST", "")
	dbUser := getEnv("DB_USER", "")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "")

	if dbHost == "" || dbUser == "" || dbPassword == "" || dbName == "" {
		return fmt.Errorf("database configuration incomplete: DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME are required")
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}
