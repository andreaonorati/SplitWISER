import { Request, Response, NextFunction } from 'express';

/**
 * Simple in-memory rate limiter.
 * For production, replace with Redis-backed solution (e.g., express-rate-limit + rate-limit-redis).
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Use IP + path prefix as key
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path.split('/').slice(0, 3).join('/')}`;
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > maxRequests) {
      res.status(429).json({
        error: message || 'Too many requests, please try again later.',
      });
      return;
    }

    next();
  };
}

/**
 * Stricter rate limiter for auth endpoints.
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 20,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/**
 * General API rate limiter.
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100,
  message: 'Too many requests. Please slow down.',
});

/**
 * Upload rate limiter (stricter due to heavy processing).
 */
export const uploadRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10,
  message: 'Too many uploads. Please wait before uploading again.',
});
