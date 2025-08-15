import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

interface JWTPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Access token is required');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    
    req.user = decoded;
    
    logger.debug('User authenticated', { 
      userId: decoded.userId,
      requestId: req.headers['x-request-id']
    });
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Invalid JWT token', { 
        error: error.message,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(new ApiError(401, 'Invalid access token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Expired JWT token', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(new ApiError(401, 'Access token has expired'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    next();
  }
};