import asyncHandler from '../utils/asyncHandler.js';
import * as reviewService from '../services/review.service.js';

/**
 * POST /api/v1/reviews
 */
export const createReview = asyncHandler(async (req, res) => {
  const review = await reviewService.createReview(req.user._id, req.body);

  res.status(201).json({
    status: 'success',
    message: 'Review submitted!',
    data: { review },
  });
});

/**
 * GET /api/v1/reviews/kitchen/:kitchenId
 */
export const getKitchenReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await reviewService.getKitchenReviews(req.params.kitchenId, {
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * GET /api/v1/reviews/can-review/:orderId
 */
export const canReview = asyncHandler(async (req, res) => {
  const canReview = await reviewService.canReviewOrder(
    req.user._id,
    req.params.orderId
  );

  res.status(200).json({
    status: 'success',
    data: { canReview },
  });
});
