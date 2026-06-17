import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PLATFORM_CONFIG } from '../utils/constants.js';

const orderItemSchema = new mongoose.Schema(
  {
    food: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    isVeg: { type: Boolean, default: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kitchen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kitchen',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: 'Order must have at least one item.',
      },
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
      index: true,
    },
    // Pricing
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryFee: {
      type: Number,
      default: PLATFORM_CONFIG.DEFAULT_DELIVERY_FEE,
      min: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    // Payment
    payment: {
      status: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING,
      },
      method: {
        type: String,
        enum: ['razorpay', 'cod'],
        default: 'razorpay',
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
      paidAt: Date,
    },
    // Delivery
    deliveryType: {
      type: String,
      enum: ['delivery', 'pickup'],
      default: 'delivery',
    },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      latitude: Number,
      longitude: Number,
    },
    deliveryPartner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deliveryOtp: {
      type: String,
      default: '',
    },
    // Notes
    buyerNote: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    kitchenNote: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    cancelReason: {
      type: String,
      default: '',
    },
    cancelledBy: {
      type: String,
      enum: ['buyer', 'kitchen', 'admin', ''],
      default: '',
    },
    // Timestamps for status transitions
    acceptedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
  }
);

// ====================================
// Indexes
// ====================================
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ kitchen: 1, status: 1, createdAt: -1 });

// ====================================
// Pre-save: Generate order number
// ====================================
orderSchema.pre('save', async function (next) {
  if (this.isNew && !this.orderNumber) {
    const prefix = 'RJ';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `${prefix}${timestamp}${random}`;
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
