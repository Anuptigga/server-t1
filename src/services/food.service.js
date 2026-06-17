import Food from '../models/Food.js';
import Kitchen from '../models/Kitchen.js';
import AppError from '../utils/AppError.js';

/**
 * Create a new food item.
 */
export const createFood = async (kitchenId, data) => {
  const food = await Food.create({
    kitchen: kitchenId,
    name: data.name,
    description: data.description || '',
    price: data.price,
    image: data.image || '',
    category: data.category,
    isVeg: data.isVeg !== undefined ? data.isVeg : true,
    totalQuantity: data.totalQuantity,
    availableQuantity: data.totalQuantity, // starts fully stocked
    preparationTime: data.preparationTime || 30,
  });

  return food;
};

/**
 * Get all food items for a kitchen.
 */
export const getKitchenFoods = async (kitchenId, { includeUnavailable = false } = {}) => {
  const query = { kitchen: kitchenId };

  if (!includeUnavailable) {
    query.isAvailable = true;
  }

  const foods = await Food.find(query)
    .sort({ category: 1, name: 1 })
    .lean();

  return foods;
};

/**
 * Get a single food item by ID.
 */
export const getFoodById = async (foodId) => {
  const food = await Food.findById(foodId);

  if (!food) {
    throw new AppError('Food item not found.', 404);
  }

  return food;
};

/**
 * Update a food item (only by the kitchen that owns it).
 */
export const updateFood = async (foodId, kitchenId, data) => {
  const food = await Food.findOne({ _id: foodId, kitchen: kitchenId });

  if (!food) {
    throw new AppError('Food item not found or you don\'t have permission.', 404);
  }

  // Update fields
  const fields = [
    'name', 'description', 'price', 'image', 'category',
    'isVeg', 'totalQuantity', 'isAvailable', 'preparationTime',
  ];
  fields.forEach((field) => {
    if (data[field] !== undefined) food[field] = data[field];
  });

  // If totalQuantity changed, adjust availableQuantity
  if (data.totalQuantity !== undefined) {
    food.availableQuantity = Math.min(food.availableQuantity, data.totalQuantity);
  }

  // If explicitly setting availableQuantity
  if (data.availableQuantity !== undefined) {
    food.availableQuantity = Math.min(data.availableQuantity, food.totalQuantity);
  }

  await food.save(); // triggers pre-save hook for isSoldOut sync

  return food;
};

/**
 * Delete a food item.
 */
export const deleteFood = async (foodId, kitchenId) => {
  const food = await Food.findOneAndDelete({
    _id: foodId,
    kitchen: kitchenId,
  });

  if (!food) {
    throw new AppError('Food item not found or you don\'t have permission.', 404);
  }

  return food;
};

/**
 * Decrement quantity atomically when an order is placed.
 * Returns the updated food or throws if not enough stock.
 *
 * Uses findOneAndUpdate with $inc to ensure atomicity
 * under concurrent requests (race-condition safe).
 */
export const decrementQuantity = async (foodId, quantity = 1) => {
  const food = await Food.findOneAndUpdate(
    {
      _id: foodId,
      availableQuantity: { $gte: quantity }, // only if enough stock
      isAvailable: true,
      isSoldOut: false,
    },
    {
      $inc: { availableQuantity: -quantity },
    },
    { new: true }
  );

  if (!food) {
    throw new AppError('Item is sold out or unavailable.', 409);
  }

  // Check if sold out after decrement
  if (food.availableQuantity <= 0) {
    food.isSoldOut = true;
    await food.save();

    // Check if ALL items in this kitchen are sold out → auto-pause
    await checkAndAutoPauseKitchen(food.kitchen);
  }

  return food;
};

/**
 * Increment quantity (e.g., when an order is cancelled).
 */
export const incrementQuantity = async (foodId, quantity = 1) => {
  const food = await Food.findByIdAndUpdate(
    foodId,
    {
      $inc: { availableQuantity: quantity },
      $set: { isSoldOut: false },
    },
    { new: true }
  );

  if (!food) {
    throw new AppError('Food item not found.', 404);
  }

  // Ensure we don't exceed totalQuantity
  if (food.availableQuantity > food.totalQuantity) {
    food.availableQuantity = food.totalQuantity;
    await food.save();
  }

  // Un-pause kitchen if it was auto-paused
  await Kitchen.findByIdAndUpdate(food.kitchen, { isAutoPaused: false });

  return food;
};

/**
 * Reset all quantities for a kitchen (daily stock refresh).
 * Kitchen owners call this at the start of each day.
 */
export const resetDailyQuantities = async (kitchenId, items) => {
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.foodId, kitchen: kitchenId },
      update: {
        $set: {
          totalQuantity: item.totalQuantity,
          availableQuantity: item.totalQuantity,
          isSoldOut: false,
        },
      },
    },
  }));

  const result = await Food.bulkWrite(bulkOps);

  // Un-pause kitchen
  await Kitchen.findByIdAndUpdate(kitchenId, { isAutoPaused: false });

  return result;
};

/**
 * Check if all available food items in a kitchen are sold out.
 * If so, auto-pause the kitchen to remove it from buyer search.
 */
const checkAndAutoPauseKitchen = async (kitchenId) => {
  const availableItems = await Food.countDocuments({
    kitchen: kitchenId,
    isAvailable: true,
    isSoldOut: false,
  });

  if (availableItems === 0) {
    await Kitchen.findByIdAndUpdate(kitchenId, { isAutoPaused: true });
    return true; // kitchen was auto-paused
  }

  return false;
};

/**
 * Get kitchen food stats (for dashboard).
 */
export const getKitchenFoodStats = async (kitchenId) => {
  const [totalItems, availableItems, soldOutItems] = await Promise.all([
    Food.countDocuments({ kitchen: kitchenId }),
    Food.countDocuments({ kitchen: kitchenId, isAvailable: true, isSoldOut: false }),
    Food.countDocuments({ kitchen: kitchenId, isAvailable: true, isSoldOut: true }),
  ]);

  return {
    totalItems,
    availableItems,
    soldOutItems,
    unavailableItems: totalItems - availableItems - soldOutItems,
  };
};
