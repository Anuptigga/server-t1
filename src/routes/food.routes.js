import { Router } from 'express';
import * as foodController from '../controllers/food.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  createFoodSchema,
  updateFoodSchema,
  updateQuantitySchema,
  resetQuantitiesSchema,
} from '../validators/food.validator.js';

const router = Router();

// ====================================
// Kitchen owner routes (must be before /:id)
// ====================================

router.get(
  '/my-menu',
  protect,
  authorize('kitchen'),
  foodController.getMyMenu
);

router.get(
  '/my-stats',
  protect,
  authorize('kitchen'),
  foodController.getMyStats
);

router.post(
  '/',
  protect,
  authorize('kitchen'),
  validate(createFoodSchema),
  foodController.createFood
);

router.post(
  '/reset-quantities',
  protect,
  authorize('kitchen'),
  validate(resetQuantitiesSchema),
  foodController.resetDailyQuantities
);

// ====================================
// Public routes
// ====================================

// Get food items for a specific kitchen
router.get('/kitchen/:kitchenId', foodController.getKitchenFoods);

// ====================================
// Kitchen owner: single item operations (must be after fixed routes)
// ====================================

router.put(
  '/:id',
  protect,
  authorize('kitchen'),
  validate(updateFoodSchema),
  foodController.updateFood
);

router.patch(
  '/:id/quantity',
  protect,
  authorize('kitchen'),
  validate(updateQuantitySchema),
  foodController.updateQuantity
);

router.delete(
  '/:id',
  protect,
  authorize('kitchen'),
  foodController.deleteFood
);

export default router;
