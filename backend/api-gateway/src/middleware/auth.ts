import { Request, Response, NextFunction } from 'express';
import { userServiceMethods } from '../grpc/client';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import * as Types from '../types/grpc';

interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, 'Access token is required');
    }

    const response: Types.VerifyTokenResponse = await userServiceMethods.verifyToken({
      accessToken: token,
    });

    if (!response.valid || !response.user) {
      throw new ApiError(401, response.error || 'Invalid access token');
    }

    req.user = {
      id: response.user.id,
      email: response.user.email,
      username: response.user.username,
      role: response.user.role,
    };
    
    logger.debug('User authenticated', { 
      userId: response.user.id,
      requestId: req.headers['x-request-id']
    });
    
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.warn('Token verification failed', { 
        error: (error as Error).message,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      next(new ApiError(401, 'Invalid access token'));
    }
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const response: Types.VerifyTokenResponse = await userServiceMethods.verifyToken({
          accessToken: token,
        });

        if (response.valid && response.user) {
          req.user = {
            id: response.user.id,
            email: response.user.email,
            username: response.user.username,
            role: response.user.role,
          };
        }
      } catch (error) {
        logger.debug('Optional auth failed', { error: (error as Error).message });
      }
    }
    
    next();
  } catch (error) {
    logger.debug('Optional auth failed', { error: (error as Error).message });
    next();
  }
};