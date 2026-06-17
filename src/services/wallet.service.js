import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';

/**
 * Add funds to user wallet (mock top-up).
 */
export const addFunds = async (userId, amount, referenceId = null) => {
  if (amount <= 0) throw new AppError('Amount must be greater than 0', 400);

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true, runValidators: true }
  );

  if (!user) throw new AppError('User not found', 404);

  const transaction = await Transaction.create({
    user: userId,
    type: 'credit',
    amount,
    purpose: 'add_funds',
    description: 'Added funds to wallet',
    referenceId,
    status: 'completed',
  });

  return { balance: user.walletBalance, transaction };
};

/**
 * Withdraw funds from user wallet (mock payout).
 */
export const withdrawFunds = async (userId, amount) => {
  if (amount < 500) throw new AppError('Minimum withdrawal amount is ₹500', 400);

  const userCheck = await User.findById(userId);
  if (!userCheck) throw new AppError('User not found', 404);

  if (
    !userCheck.bankDetails ||
    !userCheck.bankDetails.accountNumber ||
    !userCheck.bankDetails.ifscCode
  ) {
    throw new AppError('Please add your bank details before withdrawing funds', 400);
  }

  // We use findOneAndUpdate with condition to prevent race conditions (withdrawing more than available)
  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true }
  );

  if (!user) {
    throw new AppError('Insufficient wallet balance', 400);
  }

  const transaction = await Transaction.create({
    user: userId,
    type: 'debit',
    amount,
    purpose: 'withdraw',
    description: 'Withdrawal to bank account',
    status: 'completed', // Mocking instant completion
  });

  return { balance: user.walletBalance, transaction };
};

/**
 * Get wallet balance and recent transactions.
 */
export const getWalletData = async (userId, { page = 1, limit = 10 }) => {
  const user = await User.findById(userId).select('walletBalance');
  if (!user) throw new AppError('User not found', 404);

  const query = { user: userId };
  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  return {
    balance: user.walletBalance,
    transactions,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

/**
 * Internal method: debit user for an order (buyer side).
 */
export const debitForOrder = async (userId, amount, orderId) => {
  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true }
  );

  if (!user) {
    throw new AppError('Insufficient wallet balance to place order', 400);
  }

  await Transaction.create({
    user: userId,
    type: 'debit',
    amount,
    purpose: 'order_payment',
    description: `Payment for order`,
    order: orderId,
  });

  return user;
};

/**
 * Internal method: credit user for earnings (kitchen or delivery side).
 */
export const creditEarnings = async (userId, amount, purpose, description, orderId, kitchenId = null) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: amount } },
    { new: true }
  );

  if (!user) return null;

  await Transaction.create({
    user: userId,
    kitchen: kitchenId,
    type: 'credit',
    amount,
    purpose,
    description,
    order: orderId,
  });

  return user;
};
