import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createReviewSchema } from '../validators/review.validator.js';

const router = Router();

// Public: get kitchen reviews
router.get('/kitchen/:kitchenId', reviewController.getKitchenReviews);

// Authenticated routes
router.use(protect);

// Check if user can review an order
router.get('/can-review/:orderId', reviewController.canReview);

// Create review (buyers only)
router.post(
  '/',
  authorize('buyer'),
  validate(createReviewSchema),
  reviewController.createReview
);

export default router;
