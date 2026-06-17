import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema(
  {
    kitchen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Kitchen',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: [100, 'Food name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least ₹1'],
    },
    image: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      enum: [
        'Main Course',
        'Snacks',
        'Breakfast',
        'Lunch Thali',
        'Dinner Thali',
        'Rice & Biryani',
        'Breads',
        'Desserts',
        'Beverages',
        'Salads',
        'Other',
      ],
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total daily quantity is required'],
      min: [0, 'Quantity cannot be negative'],
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative'],
    },
    isSoldOut: {
      type: Boolean,
      default: false,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    preparationTime: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 180,
    },
  },
  {
    timestamps: true,
  }
);

// ====================================
// Indexes
// ====================================
foodSchema.index({ kitchen: 1, isAvailable: 1 });
foodSchema.index({ kitchen: 1, isSoldOut: 1 });

// ====================================
// Pre-save: sync isSoldOut with availableQuantity
// ====================================
foodSchema.pre('save', function (next) {
  if (this.isModified('availableQuantity')) {
    this.isSoldOut = this.availableQuantity <= 0;
  }
  next();
});

const Food = mongoose.model('Food', foodSchema);

export default Food;
