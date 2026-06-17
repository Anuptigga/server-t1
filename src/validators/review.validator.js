import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string({ required_error: 'Order ID is required' }),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(''),
});
