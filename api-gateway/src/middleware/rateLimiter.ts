import { Request, Response, NextFunction } from 'express';

const requests = new Map<string, number[]>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; 
  const maxRequests = 100;

  if (!requests.has(ip)) {
    requests.set(ip, []);
  }

  const timestamps = requests.get(ip)!;
  
  const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
  
  if (validTimestamps.length >= maxRequests) {
     res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
    return
  }

  validTimestamps.push(now);
  requests.set(ip, validTimestamps);
  
  next();
};
