import User from '../models/User.js';
import Order from '../models/Order.js';
import Kitchen from '../models/Kitchen.js';
import AppError from '../utils/AppError.js';
import { ORDER_STATUS } from '../utils/constants.js';
import { settleOrderEarnings } from './wallet.service.js';

/**
 * Toggle delivery partner availability.
 */
export const toggleAvailability = async (userId, isActive) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found.', 404);
  return user;
};

/**
 * Update delivery partner's live location.
 */
export const updateLocation = async (userId, latitude, longitude) => {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
    },
    { new: true }
  ).select('-password');

  return user;
};

/**
 * Get orders that are ready for pickup (delivery partner can accept).
 * Only shows orders from kitchens within the specified radius of the driver.
 * @param {string} userId - delivery partner's user ID
 * @param {number|null} latitude - driver's current latitude
 * @param {number|null} longitude - driver's current longitude
 * @param {number} radiusKm - search radius in km (default 10)
 */
export const getAvailableOrders = async (userId, latitude, longitude, radiusKm = 10) => {
  let kitchenFilter = {};

  // If we have the driver's location, only show orders from nearby kitchens
  if (latitude && longitude) {
    const nearbyKitchens = await Kitchen.find({
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude], // GeoJSON: [lng, lat]
          },
          $maxDistance: radiusKm * 1000, // convert km to meters
        },
      },
    }).select('_id');

    const kitchenIds = nearbyKitchens.map((k) => k._id);
    kitchenFilter = { kitchen: { $in: kitchenIds } };
  }

  const orders = await Order.find({
    status: ORDER_STATUS.READY,
    deliveryType: 'delivery',
    deliveryPartner: null,
    ...kitchenFilter,
  })
    .populate('kitchen', 'name address phone coverImage location')
    .populate('buyer', 'name phone')
    .sort({ readyAt: 1 }) // oldest ready first
    .limit(20)
    .lean();

  return orders;
};

/**
 * Accept a delivery order.
 */
export const acceptDelivery = async (userId, orderId) => {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: ORDER_STATUS.READY,
      deliveryPartner: null, // prevent double-assignment
    },
    {
      deliveryPartner: userId,
      status: ORDER_STATUS.PICKED_UP,
      pickedUpAt: new Date(),
    },
    { new: true }
  )
    .populate('kitchen', 'name address phone')
    .populate('buyer', 'name phone');

  if (!order) {
    throw new AppError('Order is no longer available for pickup.', 409);
  }

  return order;
};

/**
 * Mark order as delivered.
 */
export const markDelivered = async (userId, orderId, otp) => {
  const order = await Order.findOne({
    _id: orderId,
    deliveryPartner: userId,
    status: ORDER_STATUS.PICKED_UP,
  });

  if (!order) {
    throw new AppError('Order not found or not assigned to you.', 404);
  }

  if (order.deliveryOtp && order.deliveryOtp !== otp) {
    throw new AppError('Invalid Delivery OTP.', 400);
  }

  order.status = ORDER_STATUS.DELIVERED;
  order.deliveredAt = new Date();

  // Auto-complete after delivery (for MVP — no buyer confirmation step)
  order.status = ORDER_STATUS.COMPLETED;
  order.completedAt = new Date();
  await order.save();

  await settleOrderEarnings(order);

  return order;
};

/**
 * Get delivery partner's active order (currently delivering).
 */
export const getActiveDelivery = async (userId) => {
  const order = await Order.findOne({
    deliveryPartner: userId,
    status: { $in: [ORDER_STATUS.PICKED_UP] },
  })
    .populate('kitchen', 'name address phone coverImage')
    .populate('buyer', 'name phone');

  return order;
};

/**
 * Get delivery history for a partner.
 */
export const getDeliveryHistory = async (userId, { page = 1, limit = 10 }) => {
  const query = {
    deliveryPartner: userId,
    status: { $in: [ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED] },
  };

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('kitchen', 'name address')
    .sort({ deliveredAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    orders,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};
