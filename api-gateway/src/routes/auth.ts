import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

const router = Router();

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO:  actual authentication with User Service
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { id: '1', email },
        token: 'blah-blah-jwt-token=03eyyyd8'
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/register', (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: actual registration with User Service later
    res.json({
      success: true,
      message: 'Registration successful'
    });
  } catch (error) {
    next(error);
  }
});

export default router;