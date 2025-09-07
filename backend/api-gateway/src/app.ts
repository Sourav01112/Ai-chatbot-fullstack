import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config/environment';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import userRoutes from './routes/user';
import healthRoutes from './routes/health';

export function createApp(): express.Application {
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production' ? undefined : false,
  }));

  app.use(cors({
    origin: config.ALLOWED_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  app.use(compression());

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.set('trust proxy', 1);

  if (config.ENABLE_REQUEST_LOGGING) {
    app.use(requestLogger);
  }

  app.use(rateLimiter);

  app.use('/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/user', userRoutes);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'AIChatOps API Gateway',
      version: '1.0.0',
    });
  });

  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      message: 'Route not found',
      path: req.originalUrl,
    });
  });
  
  app.use(errorHandler);
  return app;
}