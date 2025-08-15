import { Router, Request, Response } from 'express';
import { redisClient } from '../utils/redis';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      redis: 'unknown',
      grpc: ''
    }
  };

  try {
    if (redisClient.status === 'ready') {
      await redisClient.ping();
      healthCheck.services.redis = 'connected';
    } else {
      healthCheck.services.redis = 'disconnected';
    }
  } catch (error) {
    healthCheck.services.redis = 'error';
  }

  const httpStatus = Object.values(healthCheck.services).every(status => 
    status === 'connected' || status === 'not_connected'
  ) ? 200 : 503;

  res.status(httpStatus).json(healthCheck);
});

export default router;