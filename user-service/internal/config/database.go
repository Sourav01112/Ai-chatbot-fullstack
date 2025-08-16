package config

import (
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/Sourav01112/user-service/internal/models"
)

func NewDatabase(cfg *Config, zapLogger *zap.Logger) (*gorm.DB, error) {
	gormLogLevel := logger.Silent
	if cfg.Server.Environment == "development" {
		gormLogLevel = logger.Info
	}

	db, err := gorm.Open(postgres.Open(cfg.DatabaseDSN()), &gorm.Config{
		Logger: logger.Default.LogMode(gormLogLevel),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)
	sqlDB.SetConnMaxIdleTime(30 * time.Second)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	zapLogger.Info("Database connection established successfully")

	return db, nil
}

func AutoMigrate(db *gorm.DB, logger *zap.Logger) error {
	logger.Info("Running database migrations...")

	err := db.AutoMigrate(
		&models.User{},
		&models.UserPreferences{},
		&models.UserAnalytics{},
		&models.LoginAttempt{},
	)
	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	logger.Info("Database migrations completed successfully")
	return nil
}
