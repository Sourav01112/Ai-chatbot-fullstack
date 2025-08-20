package config

import (
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func SetupDatabase(cfg *Config, log *zap.Logger) (*gorm.DB, error) {
	var gormLogger logger.Interface
	if cfg.Env == "development" {
		gormLogger = logger.Default.LogMode(logger.Info)
	} else {
		gormLogger = logger.Default.LogMode(logger.Silent)
	}

	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	//  ----- connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	sqlDB.SetMaxOpenConns(cfg.DatabaseMaxConnections)
	sqlDB.SetMaxIdleConns(cfg.DatabaseMaxIdle)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// if err := db.AutoMigrate(
	// 	&models.User{},
	// 	&models.UserPreferences{},
	// 	&models.UserAnalytics{},
	// ); err != nil {
	// 	return nil, fmt.Errorf("failed to migrate database: %w", err)
	// }

	log.Info("Database connection established and migrated successfully")
	return db, nil
}

func CloseDatabase(db *gorm.DB, log *zap.Logger) error {
	sqlDB, err := db.DB()
	if err != nil {
		return err
	}

	if err := sqlDB.Close(); err != nil {
		log.Error("Error closing database connection", zap.Error(err))
		return err
	}

	log.Info("Database connection closed")
	return nil
}
