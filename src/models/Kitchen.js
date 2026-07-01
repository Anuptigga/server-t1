import mongoose from 'mongoose';
import { KYC_STATUS, PLATFORM_CONFIG } from '../utils/constants.js';

const kitchenSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Kitchen name is required'],
      trim: true,
      maxlength: [100, 'Kitchen name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Kitchen phone number is required'],
      trim: true,
    },
    coverImage: {
      type: String,
      default: '',
    },
    images: {
      type: [String],
      default: [],
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    kycDetails: {
      documentUrl: {
        type: String,
        required: [true, 'KYC document (PDF) is required'],
      },
      status: {
        type: String,
        enum: Object.values(KYC_STATUS),
        default: KYC_STATUS.PENDING,
      },
      rejectionReason: String,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
    isAutoPaused: {
      type: Boolean,
      default: false,
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    commission: {
      type: Number,
      default: PLATFORM_CONFIG.DEFAULT_COMMISSION_PERCENT,
      min: 0,
      max: 100,
    },
    operatingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '21:00' },
    },
    cuisineTypes: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);


// Indexes
kitchenSchema.index({ location: '2dsphere' });
kitchenSchema.index({ isApproved: 1, isOpen: 1 });


// Virtual: is kitchen currently active (visible to buyers)
kitchenSchema.virtual('isActive').get(function () {
  return this.isApproved && this.isOpen && !this.isAutoPaused;
});

// Ensure virtuals are included in JSON
kitchenSchema.set('toJSON', { virtuals: true });
kitchenSchema.set('toObject', { virtuals: true });

const Kitchen = mongoose.model('Kitchen', kitchenSchema);

export default Kitchen;
