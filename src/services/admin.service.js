import User from '../models/User.js';
import Kitchen from '../models/Kitchen.js';
import Order from '../models/Order.js';
import AppError from '../utils/AppError.js';
import { ORDER_STATUS } from '../utils/constants.js';

/**
 * Get high-level overview stats for the admin dashboard.
 */
export const getOverviewStats = async () => {
  const [
    totalUsers,
    totalKitchens,
    totalOrders,
    completedOrdersCount,
    revenueData
  ] = await Promise.all([
    User.countDocuments({ role: 'buyer' }),
    Kitchen.countDocuments({ isApproved: true }),
    Order.countDocuments(),
    Order.countDocuments({ status: ORDER_STATUS.COMPLETED }),
    Order.aggregate([
      { $match: { status: ORDER_STATUS.COMPLETED } },
      {
        $lookup: {
          from: 'kitchens',
          localField: 'kitchen',
          foreignField: '_id',
          as: 'kitchenDoc'
        }
      },
      { $unwind: '$kitchenDoc' },
      {
        $project: {
          platformFee: 1,
          commissionAmt: {
            $divide: [
              { $multiply: ['$subtotal', { $ifNull: ['$kitchenDoc.commission', 10] }] },
              100
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $add: ['$platformFee', '$commissionAmt'] } }
        }
      }
    ])
  ]);

  const totalRevenue = revenueData[0]?.totalRevenue || 0;

  return {
    users: totalUsers,
    kitchens: totalKitchens,
    orders: totalOrders,
    completedOrders: completedOrdersCount,
    platformRevenue: totalRevenue,
  };
};

/**
 * Get kitchens (with optional filters like pending approval).
 */
export const getKitchens = async ({ page = 1, limit = 10, status }) => {
  const query = {};
  if (status === 'pending') {
    query.isApproved = false;
  } else if (status === 'approved') {
    query.isApproved = true;
  }

  const total = await Kitchen.countDocuments(query);
  const kitchens = await Kitchen.find(query)
    .populate('owner', 'name email phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    kitchens,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

/**
 * Approve or reject a kitchen.
 * On rejection: save reason on the User, delete the Kitchen + its Food items.
 */
export const moderateKitchen = async (kitchenId, { isApproved, reason }) => {
  const kitchen = await Kitchen.findById(kitchenId).populate('owner', 'name email');
  if (!kitchen) throw new AppError('Kitchen not found', 404);

  if (isApproved) {
    kitchen.isApproved = true;
    await kitchen.save();
    return kitchen;
  }

  // Rejection flow: save reason on User, then delete Kitchen + Food items
  await User.findByIdAndUpdate(kitchen.owner._id, {
    kitchenRejection: {
      reason: reason || 'No reason provided',
      rejectedAt: new Date(),
    },
  });

  // Delete all food items for this kitchen
  const Food = (await import('../models/Food.js')).default;
  await Food.deleteMany({ kitchen: kitchen._id });

  // Delete the kitchen document itself
  await Kitchen.findByIdAndDelete(kitchenId);

  return { deleted: true, name: kitchen.name, ownerEmail: kitchen.owner?.email };
};

/**
 * Get users (paginated).
 */
export const getUsers = async ({ page = 1, limit = 20, role }) => {
  const query = {};
  if (role) query.role = role;

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select('-password -otp')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    users,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

/**
 * Get all orders globally (paginated).
 */
export const getGlobalOrders = async ({ page = 1, limit = 20 }) => {
  const total = await Order.countDocuments();
  const orders = await Order.find()
    .populate('buyer', 'name phone')
    .populate('kitchen', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    orders,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};
