import { Router } from 'express';
import * as kitchenController from '../controllers/kitchen.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  registerKitchenSchema,
  updateKitchenSchema,
} from '../validators/kitchen.validator.js';

const router = Router();

// Nearby kitchens (buyer browsing)
router.get('/nearby', kitchenController.getNearbyKitchens);

// Kitchen owner routes
router.post(
  '/register',
  protect,
  authorize('kitchen'),
  validate(registerKitchenSchema),
  kitchenController.registerKitchen
);

router.get(
  '/me',
  protect,
  authorize('kitchen'),
  kitchenController.getMyKitchen
);

router.put(
  '/me',
  protect,
  authorize('kitchen'),
  validate(updateKitchenSchema),
  kitchenController.updateMyKitchen
);

router.patch(
  '/me/toggle',
  protect,
  authorize('kitchen'),
  kitchenController.toggleStatus
);

// Admin routes
router.get(
  '/',
  protect,
  authorize('admin'),
  kitchenController.getAllKitchens
);

router.patch(
  '/:id/approve',
  protect,
  authorize('admin'),
  kitchenController.approveKitchen
);

router.patch(
  '/:id/reject',
  protect,
  authorize('admin'),
  kitchenController.rejectKitchen
);

// Public
router.get('/:id', kitchenController.getKitchenById);

export default router;
