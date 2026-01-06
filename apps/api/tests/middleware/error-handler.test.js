/**
 * Error Handler Middleware Tests
 */

const express = require('express');
const request = require('supertest');
const { ApiError, notFoundHandler, errorHandler, asyncHandler } = require('../../src/middleware/error-handler');

describe('Error Handler Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Add request ID middleware (simulates production setup)
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });
  });

  describe('ApiError class', () => {
    it('should create error with default values', () => {
      const error = new ApiError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new ApiError('Not found', 404, 'NOT_FOUND', { id: 123 });

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.details).toEqual({ id: 123 });
    });

    it('should be instanceof Error', () => {
      const error = new ApiError('Test');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('notFoundHandler', () => {
    beforeEach(() => {
      app.get('/exists', (req, res) => res.json({ ok: true }));
      app.use(notFoundHandler);
      app.use(errorHandler);
    });

    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.error).toContain('Route not found');
    });

    it('should include method and path in error message', async () => {
      const res = await request(app).post('/some/path');

      expect(res.body.error).toContain('POST');
      expect(res.body.error).toContain('/some/path');
    });

    it('should not affect existing routes', async () => {
      const res = await request(app).get('/exists');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('errorHandler', () => {
    it('should handle ApiError correctly', async () => {
      app.get('/test', (req, res, next) => {
        next(new ApiError('Custom error', 400, 'CUSTOM_CODE'));
      });
      app.use(errorHandler);

      const res = await request(app).get('/test');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Custom error');
      expect(res.body.code).toBe('CUSTOM_CODE');
      expect(res.body.requestId).toBe('test-request-id');
    });

    it('should handle generic Error with 500 status', async () => {
      app.get('/test', (req, res, next) => {
        next(new Error('Something went wrong'));
      });
      app.use(errorHandler);

      const res = await request(app).get('/test');

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('INTERNAL_ERROR');
    });

    it('should handle ValidationError', async () => {
      const validationError = new Error('Invalid input');
      validationError.name = 'ValidationError';

      app.get('/test', (req, res, next) => {
        next(validationError);
      });
      app.use(errorHandler);

      const res = await request(app).get('/test');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle UnauthorizedError', async () => {
      const authError = new Error('Not authorized');
      authError.name = 'UnauthorizedError';

      app.get('/test', (req, res, next) => {
        next(authError);
      });
      app.use(errorHandler);

      const res = await request(app).get('/test');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should handle ECONNREFUSED error', async () => {
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';

      app.get('/test', (req, res, next) => {
        next(connError);
      });
      app.use(errorHandler);

      const res = await request(app).get('/test');

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should not include stack trace in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test', (req, res, next) => {
        next(new Error('Server error'));
      });
      app.use(errorHandler);

      const res = await request(app).get('/test');

      expect(res.body.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should catch async errors and pass to error handler', async () => {
      app.get('/async', asyncHandler(async (req, res) => {
        throw new ApiError('Async error', 400, 'ASYNC_ERROR');
      }));
      app.use(errorHandler);

      const res = await request(app).get('/async');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('ASYNC_ERROR');
    });

    it('should allow successful async responses', async () => {
      app.get('/async', asyncHandler(async (req, res) => {
        await Promise.resolve();
        res.json({ success: true });
      }));
      app.use(errorHandler);

      const res = await request(app).get('/async');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should catch rejected promises', async () => {
      app.get('/async', asyncHandler(async (req, res) => {
        await Promise.reject(new Error('Promise rejected'));
      }));
      app.use(errorHandler);

      const res = await request(app).get('/async');

      expect(res.status).toBe(500);
    });
  });
});
