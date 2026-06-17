import { z } from 'zod';

export const registerKitchenSchema = z.object({
  name: z
    .string({ required_error: 'Kitchen name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .default(''),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number'),
  address: z.object({
    street: z.string({ required_error: 'Street is required' }).trim().min(1),
    city: z.string({ required_error: 'City is required' }).trim().min(1),
    state: z.string({ required_error: 'State is required' }).trim().min(1),
    pincode: z
      .string({ required_error: 'Pincode is required' })
      .regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  }),
  // Location can be provided directly or geocoded from address
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  operatingHours: z
    .object({
      open: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
      close: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
    })
    .optional(),
  cuisineTypes: z.array(z.string().trim()).optional().default([]),
});

export const updateKitchenSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-()]{7,20}$/, 'Please enter a valid phone number')
    .optional(),
  address: z
    .object({
      street: z.string().trim().min(1),
      city: z.string().trim().min(1),
      state: z.string().trim().min(1),
      pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    })
    .optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  operatingHours: z
    .object({
      open: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      close: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    })
    .optional(),
  cuisineTypes: z.array(z.string().trim()).optional(),
  isOpen: z.boolean().optional(),
});

export const nearbyKitchensSchema = z.object({
  latitude: z.coerce.number({ required_error: 'Latitude is required' }).min(-90).max(90),
  longitude: z.coerce.number({ required_error: 'Longitude is required' }).min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).optional(), // km
});
