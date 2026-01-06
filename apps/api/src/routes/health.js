/**
 * Health Check Routes
 *
 * Endpoints for monitoring service health and readiness
 */

const express = require('express');
const { pool, getPoolStats } = require('../db');
const { healthCheck: redisHealthCheck } = require('../redis');
const { getPerformanceMetrics } = require('../middleware/performance');
const { getConfigSummary } = require('../config');
const { getCacheStats } = require('../fhir-cache');
const { getMetrics, getRecentErrors } = require('../monitoring');
const logger = require('../logger');

const router = express.Router();

/**
 * GET /health
 * Basic health check - returns immediately
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * GET /ready
 * Readiness check - verifies database and Redis connections
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString()
  };

  // Check database
  try {
    await pool.query('SELECT 1');
    checks.database = true;
  } catch (error) {
    logger.error('Database health check failed', { error: error.message });
  }

  // Check Redis
  try {
    const redisStatus = await redisHealthCheck();
    checks.redis = redisStatus.healthy;
  } catch (error) {
    logger.warn('Redis health check failed', { error: error.message });
  }

  const isReady = checks.database; // Redis is optional
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    checks
  });
});

/**
 * GET /health/details
 * Detailed health information (protected in production)
 */
router.get('/health/details', async (req, res) => {
  // In production, require API key for detailed health info
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
  }

  const details = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0',
    node: process.version,
    environment: process.env.NODE_ENV || 'development'
  };

  // Database check
  try {
    const dbStart = Date.now();
    await pool.query('SELECT 1');
    details.database = {
      status: 'connected',
      latencyMs: Date.now() - dbStart
    };
  } catch (error) {
    details.database = {
      status: 'error',
      error: error.message
    };
  }

  // Redis check
  try {
    const redisStatus = await redisHealthCheck();
    details.redis = redisStatus;
  } catch (error) {
    details.redis = {
      healthy: false,
      error: error.message
    };
  }

  // Cache stats
  try {
    details.cache = getCacheStats();
  } catch (error) {
    details.cache = { error: error.message };
  }

  // Config summary (without secrets)
  try {
    details.config = getConfigSummary();
  } catch (error) {
    details.config = { error: error.message };
  }

  // Database pool stats
  try {
    details.dbPool = getPoolStats();
  } catch (error) {
    details.dbPool = { error: error.message };
  }

  // Performance metrics
  try {
    details.performance = getPerformanceMetrics();
  } catch (error) {
    details.performance = { error: error.message };
  }

  res.json(details);
});

/**
 * GET /metrics
 * Application metrics for monitoring dashboards
 */
router.get('/metrics', (req, res) => {
  // In production, require API key for metrics
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
  }

  try {
    const metrics = getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Error fetching metrics', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /metrics/errors
 * Recent errors for debugging
 */
router.get('/metrics/errors', (req, res) => {
  // In production, require API key
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }
  }

  try {
    const limit = parseInt(req.query.limit) || 20;
    const errors = getRecentErrors(limit);
    res.json({ errors, count: errors.length });
  } catch (error) {
    logger.error('Error fetching recent errors', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

/**
 * GET /debug-config
 * Debug endpoint (development only)
 */
router.get('/debug-config', (req, res) => {
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    hasClientId: !!process.env.EPIC_CLIENT_ID,
    clientIdLength: process.env.EPIC_CLIENT_ID?.length || 0,
    hasAuthUrl: !!process.env.EPIC_AUTHORIZATION_URL,
    hasRedirectUri: !!process.env.REDIRECT_URI
  });
});

module.exports = router;
