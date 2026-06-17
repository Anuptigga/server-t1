import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kitchen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kitchen', // Populated if the transaction belongs to a kitchen owner's kitchen wallet
      index: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    purpose: {
      type: String,
      enum: ['add_funds', 'withdraw', 'order_payment', 'order_earnings', 'delivery_earnings', 'refund'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order', // Reference to the related order, if any
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    referenceId: {
      type: String, // E.g., payment gateway transaction ID
    },
  },
  {
    timestamps: true,
  }
);

// Index for getting a user's/kitchen's transactions efficiently sorted by latest
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ kitchen: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;
