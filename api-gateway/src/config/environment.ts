require('dotenv').config()
import { logger } from "../utils/logger"

interface Config {
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  POSTGRES_URL: string;
  REDIS_HOST: string;
  REDIS_URL: string;
  CHAT_SERVICE_URL: string;
  USER_SERVICE_URL: string;
  AI_SERVICE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  ALLOWED_ORIGINS: string;
  LOG_LEVEL: string;
  ENABLE_REQUEST_LOGGING: boolean;
}

const requiredEnvVars = [
  'JWT_SECRET',
  'POSTGRES_URL',
  'REDIS_URL',
  "REDIS_HOST",
  'CHAT_SERVICE_URL',
  'USER_SERVICE_URL',
  'AI_SERVICE_URL'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error(`Required environment variable ${envVar} is not set`);
    process.exit(1);
  }
}
function validateConfig(): void {
  const required = ['JWT_SECRET'];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

validateConfig();

export const config: Config = {

  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000'),
  HOST: process.env.HOST || '0.0.0.0',
  POSTGRES_URL: process.env.POSTGRES_URL!,
  REDIS_URL: process.env.REDIS_URL!,
  REDIS_HOST: process.env.REDIS_HOST!,
  CHAT_SERVICE_URL: process.env.CHAT_SERVICE_URL!,
  USER_SERVICE_URL: process.env.USER_SERVICE_URL!,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3001',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING === 'true',
};
