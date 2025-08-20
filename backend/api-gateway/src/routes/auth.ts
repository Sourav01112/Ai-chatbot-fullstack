import { Router, Request, Response, NextFunction } from 'express';
import { userServiceMethods } from '../grpc/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import * as Types from '../types/grpc';
import {registerSchema} from '../utils/helper';
import { loginSchema } from '../utils/helper';

const router = Router();



router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {

    console.log('Register request body:', req.body);
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const { email, password, username, first_name, last_name } = value;

    const response: Types.RegisterResponse = await userServiceMethods.register({
      email,
      password,
      username,
      firstName: first_name || '',
      lastName: last_name || '',
    });

    if (!response.success) {
      throw new ApiError(400, response.error || 'Registration failed');
    }

    logger.info('User registered successfully', {
      userId: response.user?.id,
      email: response.user?.email,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: response.user?.id,
          email: response.user?.email,
          username: response.user?.username,
          first_name: response.user?.firstName,
          last_name: response.user?.lastName,
          role: response.user?.role,
          created_at: response.user?.createdAt,
        },
        token: response.tokens?.accessToken,
        refresh_token: response.tokens?.refreshToken,
        expires_at: response.tokens?.expiresAt,
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new ApiError(400, error.details[0].message);
    }

    const { email, password, remember_me } = value;

    const response: Types.LoginResponse = await userServiceMethods.login({
      email,
      password,
      rememberMe: remember_me,
      ipAddress: req.ip || '',
      userAgent: req.headers['user-agent'] || '',
    });

    if (!response.success) {
      throw new ApiError(401, response.error || 'Invalid credentials');
    }

    logger.info('User logged in successfully', {
      userId: response.user?.id,
      email: response.user?.email,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: response.user?.id,
          email: response.user?.email,
          username: response.user?.username,
          first_name: response.user?.firstName,
          last_name: response.user?.lastName,
          role: response.user?.role,
          last_login: response.user?.lastLogin,
        },
        token: response.tokens?.accessToken,
        refresh_token: response.tokens?.refreshToken,
        expires_at: response.tokens?.expiresAt,
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      throw new ApiError(400, 'Refresh token is required');
    }

    const response: Types.RefreshTokenResponse = await userServiceMethods.refreshToken({
      refreshToken: refresh_token,
    });

    if (!response.success) {
      throw new ApiError(401, response.error || 'Invalid refresh token');
    }

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: response.tokens?.accessToken,
        refresh_token: response.tokens?.refreshToken,
        expires_at: response.tokens?.expiresAt,
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access token is required');
    }

    const token = authHeader.split(' ')[1];
    
    await userServiceMethods.logout({
      userId: '', 
      accessToken: token,
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new ApiError(400, 'Token is required');
    }

    const response: Types.VerifyTokenResponse = await userServiceMethods.verifyToken({
      accessToken: token,
    });

    if (!response.valid) {
      throw new ApiError(401, response.error || 'Invalid token');
    }

    res.json({
      success: true,
      data: {
        valid: true,
        user: {
          id: response.user?.id,
          email: response.user?.email,
          username: response.user?.username,
          role: response.user?.role,
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;