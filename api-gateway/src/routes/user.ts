import { Router, Request, Response, NextFunction } from 'express';

const router = Router();

router.get('/profile', (req: Request, res: Response, next: NextFunction) => {
  try {
    // TODO: Connect to User Service via gRPC
    res.json({
      success: true,
      message: 'User profile retrieved',
      data: { id: 'blah-blah-blah-id' }
    });
  } catch (error) {
    next(error);
  }
});

export default router;