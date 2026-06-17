import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication routes.
 * 20 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: 'fail',
    message: 'Too many attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter.
 * 100 requests per 15-minute window.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'fail',
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
