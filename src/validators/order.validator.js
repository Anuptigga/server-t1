import { z } from 'zod';

export const placeOrderSchema = z.object({
  kitchenId: z.string({ required_error: 'Kitchen ID is required' }),
  items: z
    .array(
      z.object({
        foodId: z.string({ required_error: 'Food ID is required' }),
        quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'Order must have at least one item'),
  deliveryAddress: z.object({
    street: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    pincode: z.string().optional().default(''),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  }).optional(),
  buyerNote: z.string().max(200).optional().default(''),
  paymentMethod: z.enum(['razorpay', 'cod']).optional().default('razorpay'),
  deliveryType: z.enum(['delivery', 'pickup']).optional().default('delivery'),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'completed']),
  kitchenNote: z.string().max(200).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(200).optional().default(''),
});
