import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { generateOTP, sanitizeUser } from '../utils/helpers.js';
import { PLATFORM_CONFIG } from '../utils/constants.js';
import { sendOTP } from './sms.service.js';

/**
 * Register a new user with email and password.
 */
export const signup = async ({ name, email, password, role, phone }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  if (phone) {
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      throw new AppError('An account with this phone number already exists.', 409);
    }
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'buyer',
    phone: phone || undefined,
  });

  const token = user.generateAuthToken();

  return { user: sanitizeUser(user), token };
};

/**
 * Login with email and password.
 */
export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (!user.password) {
    throw new AppError(
      'This account uses OTP login. Please use Send OTP.',
      401
    );
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  const token = user.generateAuthToken();

  return { user: sanitizeUser(user), token };
};

/**
 * Send OTP to phone number.
 * Creates a temporary user record if phone doesn't exist yet.
 */
export const sendOtp = async ({ phone }) => {
  let user = await User.findOne({ phone });

  const otp = generateOTP(6);
  const expiresAt = new Date(
    Date.now() + PLATFORM_CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000
  );

  if (user) {
    user.otp = { code: otp, expiresAt };
    await user.save({ validateBeforeSave: false });
  } else {
    // We don't create a user here — OTP login requires existing account
    // For signup, user must first create account with email/password
    throw new AppError(
      'No account found with this phone number. Please sign up first.',
      404
    );
  }

  await sendOTP(phone, otp);

  return { message: 'OTP sent successfully' };
};

/**
 * Verify OTP and authenticate.
 */
export const verifyOtp = async ({ phone, code }) => {
  const user = await User.findOne({ phone }).select('+otp');

  if (!user) {
    throw new AppError('No account found with this phone number.', 404);
  }

  if (!user.otp || !user.otp.code) {
    throw new AppError('No OTP was requested. Please request a new one.', 400);
  }

  if (new Date() > user.otp.expiresAt) {
    user.otp = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  if (user.otp.code !== code) {
    throw new AppError('Invalid OTP.', 400);
  }

  // Clear OTP and mark phone as verified
  user.otp = undefined;
  user.isPhoneVerified = true;
  await user.save({ validateBeforeSave: false });

  const token = user.generateAuthToken();

  return { user: sanitizeUser(user), token };
};

/**
 * Get user profile by ID.
 */
export const getProfile = async (userId) => {
  const user = await User.findById(userId).select('-password -otp -__v');

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return sanitizeUser(user);
};
