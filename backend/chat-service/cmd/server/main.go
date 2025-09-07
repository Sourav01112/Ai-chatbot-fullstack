package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"go.uber.org/zap"

	"github.com/Sourav01112/chat-service/internal/config"
	"github.com/Sourav01112/chat-service/internal/grpc"
	"github.com/Sourav01112/chat-service/internal/repository/cache"
	"github.com/Sourav01112/chat-service/internal/repository/postgres"
	"github.com/Sourav01112/chat-service/internal/service"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Printf("Failed to load configuration: %v\n", err)
		os.Exit(1)
	}

	logger, err := setupLogger(cfg)
	if err != nil {
		fmt.Printf("Failed to setup logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	logger.Info("Starting Chat Service",
		zap.String("version", "1.0.0"),
		zap.String("environment", cfg.Env))

	// Setup database
	db, err := config.SetupDatabase(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to setup database", zap.Error(err))
	}

	// Setup Redis
	rdb, err := config.SetupRedis(cfg, logger)
	if err != nil {
		logger.Fatal("Failed to setup Redis", zap.Error(err))
	}

	// Initialize repositories
	sessionRepo := postgres.NewSessionRepository(db, logger)
	messageRepo := postgres.NewMessageRepository(db, logger)
	cacheRepo := cache.NewCacheRepository(rdb, logger)

	// Initialize service
	chatService := service.NewChatService(
		sessionRepo,
		messageRepo,
		cacheRepo,
		cfg,
		logger,
	)

	// Initialize gRPC server
	grpcServer := grpc.NewServer(chatService, cfg, logger)

	// Setup context for graceful shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start gRPC server in goroutine
	go func() {
		if err := grpcServer.Start(ctx); err != nil {
			logger.Error("gRPC server failed", zap.Error(err))
			cancel()
		}
	}()

	logger.Info("Chat Service started successfully",
		zap.String("grpc_port", cfg.GRPCPort),
		zap.String("environment", cfg.Env),
		zap.String("http_port", cfg.HTTPPort))

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigChan:
		logger.Info("Received shutdown signal", zap.String("signal", sig.String()))
	case <-ctx.Done():
		logger.Info("Context cancelled, shutting down")
	}

	// Graceful shutdown
	logger.Info("Shutting down Chat Service...")

	grpcServer.Stop()

	if err := config.CloseDatabase(db, logger); err != nil {
		logger.Error("Error closing database", zap.Error(err))
	}

	logger.Info("Chat Service shutdown complete")
}

func setupLogger(cfg *config.Config) (*zap.Logger, error) {
	var zapConfig zap.Config

	if cfg.Env == "production" {
		zapConfig = zap.NewProductionConfig()
	} else {
		zapConfig = zap.NewDevelopmentConfig()
	}

	switch cfg.LogLevel {
	case "debug":
		zapConfig.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	case "info":
		zapConfig.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	case "warn":
		zapConfig.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
	case "error":
		zapConfig.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
	default:
		zapConfig.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	}

	logger, err := zapConfig.Build()
	if err != nil {
		return nil, fmt.Errorf("failed to build logger: %w", err)
	}

	return logger, nil
}
