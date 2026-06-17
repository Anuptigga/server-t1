import Review from '../models/Review.js';
import Order from '../models/Order.js';
import Kitchen from '../models/Kitchen.js';
import AppError from '../utils/AppError.js';
import { ORDER_STATUS } from '../utils/constants.js';

/**
 * Create a review for a completed order.
 */
export const createReview = async (userId, data) => {
  const { orderId, rating, comment } = data;

  // Verify order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);
  if (order.buyer.toString() !== userId) {
    throw new AppError('You can only review your own orders.', 403);
  }
  if (![ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(order.status)) {
    throw new AppError('You can only review delivered/completed orders.', 400);
  }

  // Check for duplicate review
  const existing = await Review.findOne({ order: orderId, reviewer: userId });
  if (existing) {
    throw new AppError('You have already reviewed this order.', 409);
  }

  const review = await Review.create({
    order: orderId,
    kitchen: order.kitchen,
    reviewer: userId,
    rating,
    comment: comment || '',
  });

  // Update kitchen aggregate rating
  await recalculateKitchenRating(order.kitchen);

  return review;
};

/**
 * Get reviews for a kitchen (paginated).
 */
export const getKitchenReviews = async (kitchenId, { page = 1, limit = 10 }) => {
  const query = { kitchen: kitchenId };

  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query)
    .populate('reviewer', 'name avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    reviews,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

/**
 * Check if user can review an order.
 */
export const canReviewOrder = async (userId, orderId) => {
  const order = await Order.findById(orderId);
  if (!order) return false;
  if (order.buyer.toString() !== userId) return false;
  if (![ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED].includes(order.status)) return false;

  const existing = await Review.findOne({ order: orderId, reviewer: userId });
  return !existing;
};

/**
 * Recalculate kitchen aggregate rating from all reviews.
 */
const recalculateKitchenRating = async (kitchenId) => {
  const result = await Review.aggregate([
    { $match: { kitchen: kitchenId } },
    {
      $group: {
        _id: null,
        average: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const stats = result[0] || { average: 0, count: 0 };

  await Kitchen.findByIdAndUpdate(kitchenId, {
    'rating.average': Math.round(stats.average * 10) / 10,
    'rating.count': stats.count,
  });
};
