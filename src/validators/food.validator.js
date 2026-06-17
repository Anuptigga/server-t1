import { z } from 'zod';

const FOOD_CATEGORIES = [
  'Main Course',
  'Snacks',
  'Breakfast',
  'Lunch Thali',
  'Dinner Thali',
  'Rice & Biryani',
  'Breads',
  'Desserts',
  'Beverages',
  'Salads',
  'Other',
];

export const createFoodSchema = z.object({
  name: z
    .string({ required_error: 'Food name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .default(''),
  price: z.coerce
    .number({ required_error: 'Price is required' })
    .min(1, 'Price must be at least ₹1'),
  image: z.string().url().optional().or(z.literal('')),
  category: z.enum(FOOD_CATEGORIES, {
    required_error: 'Category is required',
    invalid_type_error: `Category must be one of: ${FOOD_CATEGORIES.join(', ')}`,
  }),
  isVeg: z.boolean().optional().default(true),
  totalQuantity: z.coerce
    .number({ required_error: 'Quantity is required' })
    .int()
    .min(1, 'Quantity must be at least 1'),
  preparationTime: z.coerce
    .number()
    .int()
    .min(5, 'Prep time must be at least 5 minutes')
    .max(180, 'Prep time cannot exceed 3 hours')
    .optional()
    .default(30),
});

export const updateFoodSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number().min(1).optional(),
  image: z.string().url().optional().or(z.literal('')),
  category: z.enum(FOOD_CATEGORIES).optional(),
  isVeg: z.boolean().optional(),
  totalQuantity: z.coerce.number().int().min(0).optional(),
  availableQuantity: z.coerce.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.coerce.number().int().min(5).max(180).optional(),
});

export const updateQuantitySchema = z.object({
  availableQuantity: z.coerce
    .number({ required_error: 'Available quantity is required' })
    .int()
    .min(0, 'Quantity cannot be negative'),
});

export const resetQuantitiesSchema = z.object({
  items: z.array(
    z.object({
      foodId: z.string({ required_error: 'Food ID is required' }),
      totalQuantity: z.coerce.number().int().min(0),
    })
  ),
});

export { FOOD_CATEGORIES };
