import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

/**
 * Protect routes — verifies JWT from Authorization header or HTTP-only cookie.
 * Checks Bearer token first (needed for cross-origin deployments), then falls
 * back to the HTTP-only cookie (works for same-origin / local dev with proxy).
 * Attaches the authenticated user to `req.user`.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Check Authorization header (Bearer token) — works cross-origin
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // 2. Fallback to HTTP-only cookie — works same-origin / local dev
  if (!token) {
    token = req.cookies?.token;
  }

  if (!token) {
    throw new AppError('Not authenticated. Please log in.', 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password -otp -__v');

    if (!user) {
      throw new AppError('User belonging to this token no longer exists.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token. Please log in again.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token expired. Please log in again.', 401);
    }
    throw error;
  }
});

export default protect;
