import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import env from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.middleware.js';
import errorHandler from './middleware/error.middleware.js';
import AppError from './utils/AppError.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import kitchenRoutes from './routes/kitchen.routes.js';
import userRoutes from './routes/user.routes.js';
import foodRoutes from './routes/food.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import orderRoutes from './routes/order.routes.js';
import deliveryRoutes from './routes/delivery.routes.js';
import reviewRoutes from './routes/review.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { handleRazorpayWebhook } from './controllers/webhook.controller.js';
import mongoose from 'mongoose';

const app = express();

// Trust the first proxy (Render's load balancer) for rate limiting and IP detection
app.set('trust proxy', 1);
app.get('/api/v1/build-indexes', async (req, res) => {
  try {
    const Kitchen = mongoose.model('Kitchen');
    await Kitchen.createIndexes();
    res.json({ message: 'Indexes built successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ====================================
// Security middleware
// ====================================
app.use(helmet());
app.use(
  cors({
    // Setting origin to true reflects the request origin, allowing all domains 
    // while still supporting credentials (cookies/sessions)
    origin: true,
    credentials: true,
  })
);

// Razorpay signatures must be verified against the untouched request bytes.
app.post(
  '/api/v1/webhooks/razorpay',
  express.raw({ type: 'application/json', limit: '1mb' }),
  handleRazorpayWebhook
);

// ====================================
// Body parsing
// ====================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ====================================
// Logging
// ====================================
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ====================================
// Rate limiting (general)
// ====================================
app.use('/api', generalLimiter);

// ====================================
// Health check
// ====================================
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Rajabhoj API is running',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ====================================
// API routes
// ====================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/kitchens', kitchenRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/foods', foodRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/admin', adminRoutes);

// ====================================
// 404 handler
// ====================================
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

// ====================================
// Global error handler
// ====================================
app.use(errorHandler);

export default app;
