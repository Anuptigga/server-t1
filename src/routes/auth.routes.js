import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import validate from '../middleware/validate.middleware.js';
import protect from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  signupSchema,
  loginSchema,
  sendOtpSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Public routes (rate limited)
router.post('/signup', authLimiter, validate(signupSchema), authController.signup);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/send-otp', authLimiter, validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyOtp);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);

export default router;
