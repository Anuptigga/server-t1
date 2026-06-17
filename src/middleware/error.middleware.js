import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Global error handling middleware.
 * Handles Mongoose, JWT, and custom operational errors.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  // Mongoose: bad ObjectId
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // Mongoose: duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = new AppError(
      `An account with this ${field} already exists.`,
      409
    );
  }

  // Mongoose: validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = new AppError(messages.join('. '), 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired. Please log in again.', 401);
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';

  // Log server errors
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${error.message}`, {
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    status,
    message: error.message || 'Internal server error',
    ...(env.NODE_ENV === 'development' && { stack: error.stack }),
  });
};

export default errorHandler;
