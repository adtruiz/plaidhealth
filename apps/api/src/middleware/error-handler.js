/**
 * Error Handling Middleware
 *
 * Centralized error handling for the API
 */

const logger = require('../logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Not Found handler (404)
 */
function notFoundHandler(req, res, next) {
  const error = new ApiError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'NOT_FOUND'
  );
  next(error);
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, _next) {
  // Default values
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';

  // Log the error
  if (statusCode >= 500) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      requestId: req.id
    });
  } else {
    logger.warn('Client error:', {
      message: err.message,
      statusCode,
      url: req.url,
      method: req.method,
      requestId: req.id
    });
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    code = 'UNAUTHORIZED';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    code = 'SERVICE_UNAVAILABLE';
    message = 'External service unavailable';
  }

  // Don't leak error details in production
  const isDevelopment = !process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV !== 'production';

  const errorResponse = {
    error: message,
    code,
    requestId: req.id
  };

  // Add details in development
  if (isDevelopment) {
    errorResponse.stack = err.stack;
    if (err.details) {
      errorResponse.details = err.details;
    }
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * Async route wrapper to catch errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
