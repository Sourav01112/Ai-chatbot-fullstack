package config

import (
    "context"
    "fmt"
    
    "github.com/redis/go-redis/v9"
    "go.uber.org/zap"
)

func SetupRedis(cfg *Config, log *zap.Logger) (*redis.Client, error) {
    rdb := redis.NewClient(&redis.Options{
        Addr:     cfg.RedisURL[8:], // Remove "redis://" prefix
        Password: cfg.RedisPassword,
        DB:       cfg.RedisDB,
    })
    
    ctx := context.Background()
    _, err := rdb.Ping(ctx).Result()
    if err != nil {
        return nil, fmt.Errorf("failed to connect to Redis: %w", err)
    }
    
    log.Info("Redis connection established successfully")
    return rdb, nil
}