import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  placeOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
} from '../validators/order.validator.js';

const router = Router();

// All order routes require authentication
router.use(protect);

// ====================================
// Fixed routes (before /:id)
// ====================================

// Buyer: get my orders
router.get('/my-orders', authorize('buyer'), orderController.getMyOrders);

// Kitchen: get kitchen orders
router.get(
  '/kitchen-orders',
  authorize('kitchen'),
  orderController.getKitchenOrders
);

// Buyer: place new order
router.post(
  '/',
  authorize('buyer'),
  validate(placeOrderSchema),
  orderController.placeOrder
);

// ====================================
// Parameterized routes
// ====================================

// Get single order
router.get('/:id', orderController.getOrderById);

// Verify payment
router.post('/:id/verify-payment', orderController.verifyPayment);

// Kitchen: update status
router.patch(
  '/:id/status',
  authorize('kitchen'),
  validate(updateOrderStatusSchema),
  orderController.updateStatus
);

// Cancel order (buyer or kitchen)
router.post(
  '/:id/cancel',
  validate(cancelOrderSchema),
  orderController.cancelOrder
);

export default router;
