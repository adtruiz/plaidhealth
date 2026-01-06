/**
 * Error Handling Middleware
 *
 * Centralized error handling for the API
 */

const logger = require('../logger');

/**
 * Custom API Error class for operational errors
 * @extends Error
 * @example
 * throw new ApiError('User not found', 404, 'USER_NOT_FOUND');
 * throw new ApiError('Validation failed', 400, 'VALIDATION_ERROR', { field: 'email' });
 */
class ApiError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} [statusCode=500] - HTTP status code
   * @param {string} [code='INTERNAL_ERROR'] - Machine-readable error code
   * @param {Object|null} [details=null] - Additional error details
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Express middleware that catches unmatched routes and creates a 404 error
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} next - Express next function
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
 * Global Express error handler middleware
 * Logs errors, normalizes error responses, and hides sensitive details in production
 * @param {Error} err - Error object (can be ApiError or standard Error)
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @param {import('express').NextFunction} _next - Express next function (required for Express error handler signature)
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
 * Wraps async route handlers to automatically catch and forward errors
 * @param {Function} fn - Async route handler function (req, res, next) => Promise
 * @returns {Function} Express middleware that catches promise rejections
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
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
