import { z } from 'zod';
import { ALL_ROLES } from '../utils/constants.js';

export const signupSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  role: z
    .enum(ALL_ROLES, { message: `Role must be one of: ${ALL_ROLES.join(', ')}` })
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Please enter a valid email')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const sendOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number'),
});

export const verifyOtpSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number'),
  code: z
    .string({ required_error: 'OTP is required' })
    .length(6, 'OTP must be 6 digits'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  avatar: z.string().url().optional().or(z.literal('')),
});
