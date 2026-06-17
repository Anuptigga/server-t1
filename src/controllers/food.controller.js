import asyncHandler from '../utils/asyncHandler.js';
import Kitchen from '../models/Kitchen.js';
import * as foodService from '../services/food.service.js';
import AppError from '../utils/AppError.js';

/**
 * Helper: Get the kitchen for the authenticated user.
 */
const getAuthKitchen = async (userId) => {
  const kitchen = await Kitchen.findOne({ owner: userId });
  if (!kitchen) {
    throw new AppError('No kitchen found. Please register first.', 404);
  }
  return kitchen;
};

/**
 * POST /api/v1/foods
 * Create a food item (kitchen owner only).
 */
export const createFood = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  const food = await foodService.createFood(kitchen._id, req.body);

  // Emit socket event for real-time update
  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${kitchen._id}`).emit('food:created', food);
  }

  res.status(201).json({
    status: 'success',
    message: 'Food item created.',
    data: { food },
  });
});

/**
 * GET /api/v1/foods/kitchen/:kitchenId
 * Get all food items for a kitchen (public).
 */
export const getKitchenFoods = asyncHandler(async (req, res) => {
  const foods = await foodService.getKitchenFoods(req.params.kitchenId);

  res.status(200).json({
    status: 'success',
    results: foods.length,
    data: { foods },
  });
});

/**
 * GET /api/v1/foods/my-menu
 * Get all food items for the authenticated kitchen owner.
 */
export const getMyMenu = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  const foods = await foodService.getKitchenFoods(kitchen._id, {
    includeUnavailable: true,
  });

  res.status(200).json({
    status: 'success',
    results: foods.length,
    data: { foods },
  });
});

/**
 * GET /api/v1/foods/my-stats
 * Get food stats for the kitchen dashboard.
 */
export const getMyStats = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  const stats = await foodService.getKitchenFoodStats(kitchen._id);

  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

/**
 * PUT /api/v1/foods/:id
 * Update a food item.
 */
export const updateFood = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  const food = await foodService.updateFood(req.params.id, kitchen._id, req.body);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${kitchen._id}`).emit('food:updated', food);
  }

  res.status(200).json({
    status: 'success',
    message: 'Food item updated.',
    data: { food },
  });
});

/**
 * DELETE /api/v1/foods/:id
 * Delete a food item.
 */
export const deleteFood = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  const food = await foodService.deleteFood(req.params.id, kitchen._id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${kitchen._id}`).emit('food:deleted', { foodId: food._id });
  }

  res.status(200).json({
    status: 'success',
    message: 'Food item deleted.',
  });
});

/**
 * PATCH /api/v1/foods/:id/quantity
 * Update available quantity for a food item.
 */
export const updateQuantity = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  const food = await foodService.updateFood(req.params.id, kitchen._id, {
    availableQuantity: req.body.availableQuantity,
  });

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${kitchen._id}`).emit('food:quantity', {
      foodId: food._id,
      availableQuantity: food.availableQuantity,
      isSoldOut: food.isSoldOut,
    });
  }

  res.status(200).json({
    status: 'success',
    message: `Quantity updated to ${food.availableQuantity}.`,
    data: { food },
  });
});

/**
 * POST /api/v1/foods/reset-quantities
 * Reset all quantities for the day (kitchen owner).
 */
export const resetDailyQuantities = asyncHandler(async (req, res) => {
  const kitchen = await getAuthKitchen(req.user._id);
  await foodService.resetDailyQuantities(kitchen._id, req.body.items);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(`kitchen:${kitchen._id}`).emit('food:reset');
  }

  res.status(200).json({
    status: 'success',
    message: 'Daily quantities reset.',
  });
});
