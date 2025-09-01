package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	GRPCPort string `json:"grpc_port"`
	HTTPPort string `json:"http_port"`
	Host     string `json:"host"`
	Env      string `json:"environment"`

	DatabaseURL            string `json:"database_url"`
	DatabaseMaxConnections int    `json:"database_max_connections"`
	DatabaseMaxIdle        int    `json:"database_max_idle"`

	RedisURL      string `json:"redis_url"`
	RedisPassword string `json:"redis_password"`
	RedisDB       int    `json:"redis_db"`

	CacheTTLMessages time.Duration
	CacheTTLSessions time.Duration
	CacheTTLTyping   time.Duration

	MaxMessageLength      int
	MaxMessagesPerSession int

	LogLevel  string
	LogFormat string
}

func Load() (*Config, error) {
	if os.Getenv("ENV") != "production" {
		if err := godotenv.Load(); err != nil {
		}
	}
	dbURL := buildDatabaseURL()

	config := &Config{
		GRPCPort: getEnv("GRPC_PORT", "50052"),
		HTTPPort: getEnv("HTTP_PORT", "8080"),
		Host:     getEnv("HOST", "0.0.0.0"),
		Env:      getEnv("ENVIRONMENT", "development"),

		DatabaseURL:            dbURL,
		DatabaseMaxConnections: getEnvInt("DATABASE_MAX_CONNECTIONS", 100),
		DatabaseMaxIdle:        getEnvInt("DATABASE_MAX_IDLE_CONNECTIONS", 10),

		RedisURL:      getEnv("REDIS_URL", "redis://localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		CacheTTLMessages: getEnvDuration("CACHE_TTL_MESSAGES", time.Hour),
		CacheTTLSessions: getEnvDuration("CACHE_TTL_SESSIONS", 24*time.Hour),
		CacheTTLTyping:   getEnvDuration("CACHE_TTL_TYPING", 30*time.Second),

		MaxMessageLength:      getEnvInt("MAX_MESSAGE_LENGTH", 10000),
		MaxMessagesPerSession: getEnvInt("MAX_MESSAGES_PER_SESSION", 10000),

		LogLevel:  getEnv("LOG_LEVEL", "info"),
		LogFormat: getEnv("LOG_FORMAT", "json"),
	}

	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}

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
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
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
