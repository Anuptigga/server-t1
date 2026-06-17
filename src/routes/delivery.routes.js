import { Router } from 'express';
import * as deliveryController from '../controllers/delivery.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';

const router = Router();

// All delivery routes require auth + delivery role
router.use(protect, authorize('delivery'));

// Availability
router.patch('/availability', deliveryController.toggleAvailability);

// Location
router.patch('/location', deliveryController.updateLocation);

// Available orders
router.get('/available-orders', deliveryController.getAvailableOrders);

// Active delivery
router.get('/active', deliveryController.getActiveDelivery);

// Accept order
router.post('/accept/:orderId', deliveryController.acceptDelivery);

// Mark delivered
router.post('/deliver/:orderId', deliveryController.markDelivered);

// History
router.get('/history', deliveryController.getDeliveryHistory);

export default router;
