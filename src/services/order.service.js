import Order from '../models/Order.js';
import Food from '../models/Food.js';
import Kitchen from '../models/Kitchen.js';
import AppError from '../utils/AppError.js';
import { ORDER_STATUS, PAYMENT_STATUS, PLATFORM_CONFIG } from '../utils/constants.js';
import { decrementQuantity, incrementQuantity } from './food.service.js';
import {
  createPaymentOrder,
  verifyPaymentSignature,
  fetchPayment,
  capturePayment,
  createRefund,
} from './payment.service.js';
import { geocodeAddress } from './geocoding.service.js';
import { settleOrderEarnings } from './wallet.service.js';

// Calculate distance in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Valid status transitions
const VALID_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.ACCEPTED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ACCEPTED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.PICKED_UP],
  [ORDER_STATUS.PICKED_UP]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.COMPLETED],
};

/**
 * Place a new order.
 * - Validates food items exist and are available
 * - Atomically decrements quantities
 * - Calculates pricing
 * - Creates Razorpay payment order (or mock)
 */
export const placeOrder = async (buyerId, data) => {
  const { kitchenId, items, deliveryAddress, buyerNote, paymentMethod, deliveryType } = data;

  // Verify kitchen exists and is active
  const kitchen = await Kitchen.findById(kitchenId);
  if (!kitchen) throw new AppError('Kitchen not found.', 404);
  if (!kitchen.isApproved || !kitchen.isOpen || kitchen.isAutoPaused) {
    throw new AppError('This kitchen is currently not accepting orders.', 400);
  }

  // Fetch and validate all food items
  const foodIds = items.map((i) => i.foodId);
  const foods = await Food.find({
    _id: { $in: foodIds },
    kitchen: kitchenId,
    isAvailable: true,
  });

  if (foods.length !== items.length) {
    throw new AppError('One or more items are unavailable.', 400);
  }

  const foodMap = new Map(foods.map((f) => [f._id.toString(), f]));

  // Build order items and calculate subtotal
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const food = foodMap.get(item.foodId);
    if (!food) throw new AppError(`Item ${item.foodId} not found.`, 400);

    // Atomic decrement (throws if not enough stock)
    await decrementQuantity(food._id, item.quantity);

    const itemTotal = food.price * item.quantity;
    subtotal += itemTotal;

    orderItems.push({
      food: food._id,
      name: food.name,
      price: food.price,
      quantity: item.quantity,
      image: food.image,
      isVeg: food.isVeg,
    });
  }

  // Calculate fees
  let deliveryFee = PLATFORM_CONFIG.DEFAULT_DELIVERY_FEE; // fallback

  if (deliveryType === 'pickup') {
    deliveryFee = 0;
  } else {
    // Use buyer's GPS coordinates directly if provided (preferred over geocoding address text)
    if (deliveryAddress?.latitude && deliveryAddress?.longitude) {
      const kitchenCoords = kitchen.location.coordinates; // [lng, lat]
      const distanceKm = calculateDistance(
        deliveryAddress.latitude, deliveryAddress.longitude,
        kitchenCoords[1], kitchenCoords[0]
      );
      // ₹5 per kilometer
      deliveryFee = Math.max(10, Math.round(distanceKm * 5)); // minimum ₹10
    } else {
      // Fallback: try geocoding the address text
      try {
        const buyerCoords = await geocodeAddress(deliveryAddress);
        const kitchenCoords = kitchen.location.coordinates; // [lng, lat]
        const distanceKm = calculateDistance(
          buyerCoords[1], buyerCoords[0],
          kitchenCoords[1], kitchenCoords[0]
        );
        deliveryFee = Math.max(10, Math.round(distanceKm * 5));
      } catch (err) {
        // If geocoding fails, fallback to default fee.
      }
    }
  }

  const platformFee = Math.round(subtotal * 0.02); // 2% platform fee
  const total = subtotal + deliveryFee + platformFee;

  // Create payment order
  const order = new Order({
    buyer: buyerId,
    kitchen: kitchenId,
    items: orderItems,
    subtotal,
    deliveryFee,
    platformFee,
    total,
    deliveryType: deliveryType || 'delivery',
    deliveryAddress: deliveryAddress || {},
    buyerNote: buyerNote || '',
    deliveryOtp: Math.floor(1000 + Math.random() * 9000).toString(),
    payment: {
      method: paymentMethod || 'razorpay',
      status: PAYMENT_STATUS.PENDING,
    },
  });

  // Save first so the generated order number is a stable Razorpay receipt.
  await order.save();

  let paymentOrder;
  try {
    paymentOrder = await createPaymentOrder(
      total * 100,
      order.orderNumber,
      { local_order_id: order._id.toString() }
    );
    order.payment.razorpayOrderId = paymentOrder.id;
    await order.save();
  } catch (error) {
    // Do not leave stock reserved when payment initialization fails.
    for (const item of orderItems) {
      await incrementQuantity(item.food, item.quantity);
    }
    await Order.findByIdAndDelete(order._id);
    throw error;
  }

  return {
    order,
    paymentOrder: {
      id: paymentOrder.id,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency || 'INR',
    },
  };
};

/**
 * Verify payment after Razorpay checkout.
 */
export const verifyOrderPayment = async (orderId, buyerId, paymentId, signature) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);
  if (order.buyer.toString() !== buyerId.toString()) {
    throw new AppError('Unauthorized.', 403);
  }

  if (order.payment.status === PAYMENT_STATUS.COMPLETED) {
    return order; // Already verified
  }

  const isValid = verifyPaymentSignature(
    order.payment.razorpayOrderId,
    paymentId,
    signature
  );

  if (!isValid) {
    throw new AppError('Payment verification failed.', 400);
  }

  let payment = await fetchPayment(paymentId);
  if (
    payment.order_id !== order.payment.razorpayOrderId ||
    payment.amount !== Math.round(order.total * 100) ||
    payment.currency !== 'INR'
  ) {
    throw new AppError('Payment details do not match this order.', 400);
  }

  if (payment.status === 'authorized') {
    payment = await capturePayment(paymentId, Math.round(order.total * 100));
  }

  if (payment.status !== 'captured') {
    throw new AppError('Payment has not been captured.', 409);
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    const refund = await createRefund(
      paymentId,
      Math.round(order.total * 100),
      `refund_${order.orderNumber}`
    );
    order.payment.razorpayPaymentId = paymentId;
    order.payment.razorpayRefundId = refund.id;
    order.payment.refundStatus = refund.status;
    order.payment.status =
      refund.status === 'processed'
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.REFUND_PENDING;
    await order.save();
    throw new AppError(
      'This order was cancelled. Your payment is being refunded.',
      409
    );
  }

  order.payment.status = PAYMENT_STATUS.COMPLETED;
  order.payment.razorpayPaymentId = paymentId;
  order.payment.paidAt = new Date();
  await order.save();

  return order;
};

/**
 * Update order status (kitchen or delivery partner).
 */
export const updateOrderStatus = async (orderId, newStatus, userId, note) => {
  const order = await Order.findById(orderId).populate('kitchen');
  if (!order) throw new AppError('Order not found.', 404);
  if (order.kitchen.owner.toString() !== userId.toString()) {
    throw new AppError('Unauthorized.', 403);
  }
  if (order.payment.status !== PAYMENT_STATUS.COMPLETED) {
    throw new AppError('This order has not been paid.', 409);
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new AppError(
      `Cannot change status from "${order.status}" to "${newStatus}".`,
      400
    );
  }

  order.status = newStatus;

  // Set timestamp
  const timestampMap = {
    [ORDER_STATUS.ACCEPTED]: 'acceptedAt',
    [ORDER_STATUS.PREPARING]: 'preparingAt',
    [ORDER_STATUS.READY]: 'readyAt',
    [ORDER_STATUS.PICKED_UP]: 'pickedUpAt',
    [ORDER_STATUS.DELIVERED]: 'deliveredAt',
    [ORDER_STATUS.COMPLETED]: 'completedAt',
  };

  if (timestampMap[newStatus]) {
    order[timestampMap[newStatus]] = new Date();
  }

  if (note) order.kitchenNote = note;

  await order.save();
  if (newStatus === ORDER_STATUS.COMPLETED) {
    await settleOrderEarnings(order);
  }
  return order;
};

/**
 * Cancel an order.
 * - Buyer can cancel if status is pending
 * - Kitchen can cancel if status is pending or accepted
 * - Restores item quantities
 */
export const cancelOrder = async (orderId, userId, role, reason) => {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);

  // Check permissions
  const isBuyer = order.buyer.toString() === userId.toString();

  if (isBuyer && order.status !== ORDER_STATUS.PENDING) {
    throw new AppError('You can only cancel a pending order.', 400);
  }

  if (role === 'kitchen') {
    const kitchen = await Kitchen.findOne({ owner: userId });
    if (!kitchen || kitchen._id.toString() !== order.kitchen.toString()) {
      throw new AppError('Unauthorized.', 403);
    }
    if (![ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED].includes(order.status)) {
      throw new AppError('Order cannot be cancelled at this stage.', 400);
    }
  } else if (!isBuyer) {
    throw new AppError('Unauthorized.', 403);
  }

  // Initiate the real refund before reporting the order as cancelled.
  if (order.payment.status === PAYMENT_STATUS.COMPLETED) {
    if (!order.payment.razorpayPaymentId) {
      throw new AppError('Paid order is missing its payment reference.', 409);
    }

    const refund = await createRefund(
      order.payment.razorpayPaymentId,
      Math.round(order.total * 100),
      `refund_${order.orderNumber}`
    );
    order.payment.razorpayRefundId = refund.id;
    order.payment.refundStatus = refund.status;
    order.payment.status =
      refund.status === 'processed'
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.REFUND_PENDING;
  }

  // Restore quantities only after cancellation/refund initiation succeeds.
  for (const item of order.items) {
    await incrementQuantity(item.food, item.quantity);
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.cancelledAt = new Date();
  order.cancelReason = reason || '';
  order.cancelledBy = isBuyer ? 'buyer' : role;

  await order.save();
  return order;
};

/**
 * Get orders for a buyer (paginated).
 */
export const getBuyerOrders = async (buyerId, { page = 1, limit = 10, status }) => {
  const query = { buyer: buyerId };
  if (status) query.status = status;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('kitchen', 'name coverImage address')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { orders, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

/**
 * Get orders for a kitchen (paginated, with filters).
 */
export const getKitchenOrders = async (kitchenId, { page = 1, limit = 20, status }) => {
  const query = { kitchen: kitchenId };
  if (status) query.status = status;

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('buyer', 'name phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return { orders, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
};

/**
 * Get a single order by ID.
 */
export const getOrderById = async (orderId, userId, role) => {
  const order = await Order.findById(orderId)
    .populate('buyer', 'name email phone')
    .populate('kitchen', 'name phone address coverImage');

  if (!order) throw new AppError('Order not found.', 404);

  // Auth check: buyer, kitchen owner, delivery partner, or admin
  const isAdmin = role === 'admin';
  const isBuyer = order.buyer._id.toString() === userId.toString();
  const kitchen = await Kitchen.findById(order.kitchen._id);
  const isKitchenOwner = kitchen?.owner.toString() === userId.toString();
  const isDeliveryPartner = order.deliveryPartner?.toString() === userId.toString();

  if (!isBuyer && !isKitchenOwner && !isAdmin && !isDeliveryPartner) {
    throw new AppError('Unauthorized.', 403);
  }

  return order;
};

/**
 * Get active orders count for kitchen dashboard.
 */
export const getKitchenActiveOrderCount = async (kitchenId) => {
  const count = await Order.countDocuments({
    kitchen: kitchenId,
    status: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.ACCEPTED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY] },
  });
  return count;
};
