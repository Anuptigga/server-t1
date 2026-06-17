import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    kitchen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kitchen',
      required: true,
      index: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate reviews per order
reviewSchema.index({ order: 1, reviewer: 1 }, { unique: true });

// For efficient kitchen reviews listing
reviewSchema.index({ kitchen: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
