/**
 * Health Routes Tests
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies before requiring the routes
jest.mock('../../src/db', () => ({
  pool: {
    query: jest.fn()
  }
}));

jest.mock('../../src/redis', () => ({
  healthCheck: jest.fn()
}));

jest.mock('../../src/config', () => ({
  getConfigSummary: jest.fn(() => ({
    environment: 'test',
    providers: { configured: 5 }
  }))
}));

jest.mock('../../src/fhir-cache', () => ({
  getCacheStats: jest.fn(() => ({
    hits: 100,
    misses: 20,
    size: 50
  }))
}));

const { pool } = require('../../src/db');
const { healthCheck: redisHealthCheck } = require('../../src/redis');

describe('Health Routes', () => {
  let app;
  let healthRoutes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create fresh app for each test
    app = express();
    app.use(express.json());

    // Re-require routes to get fresh instance
    jest.resetModules();
    jest.doMock('../../src/db', () => ({
      pool: { query: jest.fn() }
    }));
    jest.doMock('../../src/redis', () => ({
      healthCheck: jest.fn()
    }));

    healthRoutes = require('../../src/routes/health');
    app.use('/', healthRoutes);
  });

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.uptime).toBeDefined();
      expect(res.body.version).toBeDefined();
    });

    it('should include uptime in seconds', async () => {
      const res = await request(app).get('/health');

      expect(typeof res.body.uptime).toBe('number');
      expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /ready', () => {
    beforeEach(() => {
      // Get fresh mocks
      const db = require('../../src/db');
      const redis = require('../../src/redis');

      db.pool.query = jest.fn().mockResolvedValue({ rows: [{ now: new Date() }] });
      redis.healthCheck = jest.fn().mockResolvedValue({ connected: true });
    });

    it('should return ready when all services are healthy', async () => {
      const res = await request(app).get('/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
      expect(res.body.checks).toBeDefined();
    });

    it('should return 503 when database is down', async () => {
      const db = require('../../src/db');
      db.pool.query = jest.fn().mockRejectedValue(new Error('Connection refused'));

      const res = await request(app).get('/ready');

      expect(res.status).toBe(503);
      expect(res.body.status).toBe('not_ready');
    });
  });

  describe('GET /debug-config', () => {
    it('should return configuration summary', async () => {
      const res = await request(app).get('/debug-config');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
    });
  });
});
