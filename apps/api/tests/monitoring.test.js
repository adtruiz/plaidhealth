/**
 * Monitoring Module Tests
 */

// Mock dependencies
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

jest.mock('axios');

const {
  recordRequest,
  recordError,
  recordFhirCall,
  recordAuthAttempt,
  getMetrics,
  getRecentErrors,
  resetMetrics,
  ALERT_THRESHOLDS
} = require('../src/monitoring');
const logger = require('../src/logger');
const axios = require('axios');

describe('Monitoring Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMetrics();
  });

  describe('recordRequest', () => {
    it('should record successful request', () => {
      const req = { method: 'GET', path: '/api/test', route: { path: '/test' } };
      const res = { statusCode: 200 };

      recordRequest(req, res, 50);

      const metrics = getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.success).toBe(1);
      expect(metrics.requests.errors).toBe(0);
    });

    it('should record failed request', () => {
      const req = { method: 'GET', path: '/api/test', route: { path: '/test' } };
      const res = { statusCode: 500 };

      recordRequest(req, res, 100);

      const metrics = getMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.success).toBe(0);
      expect(metrics.requests.errors).toBe(1);
    });

    it('should count 4xx as errors', () => {
      const req = { method: 'GET', path: '/api/test' };
      const res = { statusCode: 404 };

      recordRequest(req, res, 25);

      const metrics = getMetrics();
      expect(metrics.requests.errors).toBe(1);
    });

    it('should track requests by endpoint', () => {
      const req1 = { method: 'GET', path: '/api/users', route: { path: '/users' } };
      const req2 = { method: 'POST', path: '/api/users', route: { path: '/users' } };
      const res = { statusCode: 200 };

      recordRequest(req1, res, 50);
      recordRequest(req1, res, 50);
      recordRequest(req2, res, 50);

      const metrics = getMetrics();
      expect(metrics.requests.topEndpoints).toContainEqual({ endpoint: 'GET /users', count: 2 });
      expect(metrics.requests.topEndpoints).toContainEqual({ endpoint: 'POST /users', count: 1 });
    });

    it('should track latency samples', () => {
      const req = { method: 'GET', path: '/api/test' };
      const res = { statusCode: 200 };

      recordRequest(req, res, 100);
      recordRequest(req, res, 200);
      recordRequest(req, res, 150);

      const metrics = getMetrics();
      expect(metrics.latency.avgMs).toBe(150);
    });

    it('should reset consecutive errors on success', () => {
      const req = { method: 'GET', path: '/api/test' };
      const errorRes = { statusCode: 500 };
      const successRes = { statusCode: 200 };

      recordRequest(req, errorRes, 50);
      recordRequest(req, errorRes, 50);
      recordRequest(req, successRes, 50);

      const metrics = getMetrics();
      expect(metrics.requests.errors).toBe(2);
      expect(metrics.requests.success).toBe(1);
    });
  });

  describe('recordError', () => {
    it('should record error with context', () => {
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';

      recordError(error, { userId: 'user-123' });

      const recentErrors = getRecentErrors();
      expect(recentErrors).toHaveLength(1);
      expect(recentErrors[0].message).toBe('Test error');
      expect(recentErrors[0].code).toBe('TEST_ERROR');
      expect(recentErrors[0].context.userId).toBe('user-123');
    });

    it('should track errors by type', () => {
      recordError(new Error('Error 1'));
      recordError(new Error('Error 2'));
      recordError({ message: 'Error 3', name: 'ValidationError' });

      const metrics = getMetrics();
      expect(metrics.errors.byType['Error']).toBe(2);
      expect(metrics.errors.byType['ValidationError']).toBe(1);
    });

    it('should limit recent errors', () => {
      for (let i = 0; i < 150; i++) {
        recordError(new Error(`Error ${i}`));
      }

      const recentErrors = getRecentErrors(100);
      expect(recentErrors.length).toBeLessThanOrEqual(100);
    });

    it('should log the error', () => {
      recordError(new Error('Logged error'));

      expect(logger.error).toHaveBeenCalledWith('Error recorded', expect.any(Object));
    });
  });

  describe('recordFhirCall', () => {
    it('should record successful FHIR call', () => {
      recordFhirCall('epic', true, 500);

      const metrics = getMetrics();
      expect(metrics.fhir.requests).toBe(1);
      expect(metrics.fhir.failures).toBe(0);
    });

    it('should record failed FHIR call', () => {
      recordFhirCall('cerner', false, 1000);

      const metrics = getMetrics();
      expect(metrics.fhir.requests).toBe(1);
      expect(metrics.fhir.failures).toBe(1);
    });

    it('should track by provider', () => {
      recordFhirCall('epic', true, 100);
      recordFhirCall('epic', true, 200);
      recordFhirCall('cerner', true, 150);
      recordFhirCall('epic', false, 500);

      const metrics = getMetrics();
      expect(metrics.fhir.byProvider['epic'].requests).toBe(3);
      expect(metrics.fhir.byProvider['epic'].failures).toBe(1);
      expect(metrics.fhir.byProvider['cerner'].requests).toBe(1);
      expect(metrics.fhir.byProvider['cerner'].failures).toBe(0);
    });

    it('should track total latency', () => {
      recordFhirCall('epic', true, 100);
      recordFhirCall('epic', true, 200);

      const metrics = getMetrics();
      expect(metrics.fhir.byProvider['epic'].totalLatency).toBe(300);
    });
  });

  describe('recordAuthAttempt', () => {
    it('should record successful auth', () => {
      recordAuthAttempt(true);

      const metrics = getMetrics();
      expect(metrics.auth.success).toBe(1);
      expect(metrics.auth.failures).toBe(0);
    });

    it('should record failed auth', () => {
      recordAuthAttempt(false);

      const metrics = getMetrics();
      expect(metrics.auth.success).toBe(0);
      expect(metrics.auth.failures).toBe(1);
    });

    it('should track invalid API keys', () => {
      recordAuthAttempt(false, 'invalid_key');
      recordAuthAttempt(false, 'invalid_key');
      recordAuthAttempt(false, 'other_reason');

      const metrics = getMetrics();
      expect(metrics.auth.invalidKeys).toBe(2);
      expect(metrics.auth.failures).toBe(3);
    });
  });

  describe('getMetrics', () => {
    it('should return comprehensive metrics summary', () => {
      const metrics = getMetrics();

      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('requests');
      expect(metrics).toHaveProperty('latency');
      expect(metrics).toHaveProperty('fhir');
      expect(metrics).toHaveProperty('auth');
      expect(metrics).toHaveProperty('errors');
      expect(metrics).toHaveProperty('alerts');
    });

    it('should include uptime information', () => {
      const metrics = getMetrics();

      expect(metrics.uptime.seconds).toBeGreaterThanOrEqual(0);
      expect(metrics.uptime.formatted).toBeDefined();
    });

    it('should calculate error rate', () => {
      const req = { method: 'GET', path: '/test' };

      // 8 successes, 2 errors = 20% error rate
      for (let i = 0; i < 8; i++) {
        recordRequest(req, { statusCode: 200 }, 50);
      }
      for (let i = 0; i < 2; i++) {
        recordRequest(req, { statusCode: 500 }, 50);
      }

      const metrics = getMetrics();
      expect(metrics.requests.errorRate).toBe('20.00%');
    });

    it('should calculate FHIR failure rate', () => {
      // 4 successes, 1 failure = 20% failure rate
      for (let i = 0; i < 4; i++) {
        recordFhirCall('epic', true, 100);
      }
      recordFhirCall('epic', false, 100);

      const metrics = getMetrics();
      expect(metrics.fhir.failureRate).toBe('20.00%');
    });

    it('should calculate latency percentiles', () => {
      const req = { method: 'GET', path: '/test' };
      const res = { statusCode: 200 };

      // Add 100 samples with values 1-100
      for (let i = 1; i <= 100; i++) {
        recordRequest(req, res, i);
      }

      const metrics = getMetrics();
      expect(metrics.latency.p50Ms).toBe(50);
      expect(metrics.latency.p95Ms).toBe(95);
      expect(metrics.latency.p99Ms).toBe(99);
    });

    it('should include alert thresholds', () => {
      const metrics = getMetrics();

      expect(metrics.alerts.thresholds).toEqual(ALERT_THRESHOLDS);
    });
  });

  describe('getRecentErrors', () => {
    it('should return recent errors', () => {
      recordError(new Error('Error 1'));
      recordError(new Error('Error 2'));
      recordError(new Error('Error 3'));

      const errors = getRecentErrors(2);
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('Error 3'); // Most recent first
      expect(errors[1].message).toBe('Error 2');
    });

    it('should default to 20 errors', () => {
      for (let i = 0; i < 30; i++) {
        recordError(new Error(`Error ${i}`));
      }

      const errors = getRecentErrors();
      expect(errors).toHaveLength(20);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics', () => {
      const req = { method: 'GET', path: '/test' };
      const res = { statusCode: 200 };

      recordRequest(req, res, 100);
      recordError(new Error('Test'));
      recordFhirCall('epic', true, 50);
      recordAuthAttempt(true);

      resetMetrics();

      const metrics = getMetrics();
      expect(metrics.requests.total).toBe(0);
      expect(metrics.fhir.requests).toBe(0);
      expect(metrics.auth.success).toBe(0);
      expect(metrics.errors.recentCount).toBe(0);
    });
  });

  describe('Alert Thresholds', () => {
    it('should have default thresholds', () => {
      expect(ALERT_THRESHOLDS.errorRatePercent).toBeDefined();
      expect(ALERT_THRESHOLDS.latencyMs).toBeDefined();
      expect(ALERT_THRESHOLDS.consecutiveErrors).toBeDefined();
      expect(ALERT_THRESHOLDS.fhirFailureRate).toBeDefined();
    });
  });
});
