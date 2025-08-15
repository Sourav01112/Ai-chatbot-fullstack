import { config } from '../config/environment';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

let redis: Redis;

if (process.env.REDIS_URL === "production") {
  // --> this is for k8s part
  redis = new Redis({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy(times: number): number | null {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error): boolean {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      return targetErrors.includes((err as any).code);
    }
  });

  redis.on('connect', () => console.log(`Connected to Redis -> ${config.REDIS_HOST}`));
  redis.on('error', (err: Error) => console.error('Redis error:', err.message));
} else {
  console.log('Local Redis Host:', config.REDIS_HOST || 'localhost:6379');

  redis = new Redis(config.REDIS_HOST || 'redis://localhost:6379', {
    retryStrategy(times: number): number | null {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError(err: Error): boolean {
      const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
      return targetErrors.includes((err as any).code);
    }
  });
  redis.on('connect', () => console.log(`Connected to Redis - ${config.REDIS_HOST}`));
  redis.on('error', (err: Error) => console.error('Redis error:', config.REDIS_HOST));
}

export const redisClient = redis;

export const getRedisClient = (): Redis => redis;

export async function connectRedis(): Promise<void> {
  try {
    await redis.ping();
    console.log('Redis connection verified');
  } catch (error) {
    console.warn('Redis connection failed', (error as Error).message);
  }
}
