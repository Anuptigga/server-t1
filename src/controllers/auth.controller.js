import asyncHandler from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { setTokenCookie, clearTokenCookie } from '../utils/helpers.js';

/**
 * POST /api/v1/auth/signup
 * Register a new user.
 */
export const signup = asyncHandler(async (req, res) => {
  const { user, token } = await authService.signup(req.body);

  setTokenCookie(res, token);

  res.status(201).json({
    status: 'success',
    message: 'Account created successfully',
    data: { user },
  });
});

/**
 * POST /api/v1/auth/login
 * Login with email and password.
 */
export const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);

  setTokenCookie(res, token);

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    data: { user },
  });
});

/**
 * POST /api/v1/auth/logout
 * Clear authentication cookie.
 */
export const logout = asyncHandler(async (req, res) => {
  clearTokenCookie(res);

  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

/**
 * POST /api/v1/auth/send-otp
 * Send OTP to phone number.
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const result = await authService.sendOtp(req.body);

  res.status(200).json({
    status: 'success',
    message: result.message,
  });
});

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and authenticate.
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { user, token } = await authService.verifyOtp(req.body);

  setTokenCookie(res, token);

  res.status(200).json({
    status: 'success',
    message: 'OTP verified successfully',
    data: { user },
  });
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user profile.
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});
