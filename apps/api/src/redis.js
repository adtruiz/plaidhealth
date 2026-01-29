/**
 * Redis Client Module
 *
 * Provides Redis connectivity for:
 * - Session storage
 * - Rate limiting
 * - FHIR response caching
 */

const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis client
 * @returns {Promise<object>} Redis client instance
 */
async function initializeRedis() {
  if (redisClient && isConnected) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis max reconnection attempts reached');
          return new Error('Redis max reconnection attempts reached');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      }
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
    isConnected = false;
  });

  redisClient.on('connect', () => {
    logger.info('Redis client connecting...');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client ready');
    isConnected = true;
  });

  redisClient.on('end', () => {
    logger.warn('Redis client disconnected');
    isConnected = false;
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
    throw error;
  }
}

/**
 * Get Redis client instance
 * @returns {object|null} Redis client or null if not initialized
 */
function getClient() {
  return redisClient;
}

/**
 * Check if Redis is connected
 * @returns {boolean}
 */
function isRedisConnected() {
  return isConnected && redisClient?.isReady;
}

/**
 * Health check for Redis
 * @returns {Promise<{healthy: boolean, latencyMs?: number, error?: string}>}
 */
async function healthCheck() {
  if (!redisClient || !isConnected) {
    return { healthy: false, error: 'Redis not connected' };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const latencyMs = Date.now() - start;
    return { healthy: true, latencyMs };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  if (redisClient) {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
}

// Cache helper functions
const CACHE_PREFIX = 'cache:';
const DEFAULT_TTL = 300; // 5 minutes
const EPHEMERAL_PREFIX = 'ephemeral:';

/**
 * Get cached value
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
async function cacheGet(key) {
  if (!isRedisConnected()) return null;

  try {
    const value = await redisClient.get(`${CACHE_PREFIX}${key}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn('Cache get error', { key, error: error.message });
    return null;
  }
}

/**
 * Set cached value
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (default 300)
 * @returns {Promise<boolean>} Success status
 */
async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL) {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.setEx(
      `${CACHE_PREFIX}${key}`,
      ttlSeconds,
      JSON.stringify(value)
    );
    return true;
  } catch (error) {
    logger.warn('Cache set error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
async function cacheDelete(key) {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.del(`${CACHE_PREFIX}${key}`);
    return true;
  } catch (error) {
    logger.warn('Cache delete error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete cached values by pattern
 * @param {string} pattern - Pattern to match (e.g., 'user:123:*')
 * @returns {Promise<number>} Number of keys deleted
 */
async function cacheDeletePattern(pattern) {
  if (!isRedisConnected()) return 0;

  try {
    const keys = [];
    for await (const key of redisClient.scanIterator({
      MATCH: `${CACHE_PREFIX}${pattern}`,
      COUNT: 100
    })) {
      keys.push(key);
    }

    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return keys.length;
  } catch (error) {
    logger.warn('Cache delete pattern error', { pattern, error: error.message });
    return 0;
  }
}

module.exports = {
  initializeRedis,
  getClient,
  isRedisConnected,
  healthCheck,
  shutdown,
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePattern,
  setEphemeral,
  getEphemeral,
  deleteEphemeral
};

/**
 * Store short-lived JSON value
 * @param {string} key - Ephemeral key
 * @param {any} value - JSON-serializable value
 * @param {number} ttlMs - Time to live in milliseconds
 * @returns {Promise<boolean>} Success status
 */
async function setEphemeral(key, value, ttlMs) {
  if (!isRedisConnected()) return false;
  const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));

  try {
    await redisClient.setEx(
      `${EPHEMERAL_PREFIX}${key}`,
      ttlSeconds,
      JSON.stringify(value)
    );
    return true;
  } catch (error) {
    logger.warn('Ephemeral set error', { key, error: error.message });
    return false;
  }
}

/**
 * Get short-lived JSON value
 * @param {string} key - Ephemeral key
 * @returns {Promise<any|null>} Stored value or null
 */
async function getEphemeral(key) {
  if (!isRedisConnected()) return null;

  try {
    const value = await redisClient.get(`${EPHEMERAL_PREFIX}${key}`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn('Ephemeral get error', { key, error: error.message });
    return null;
  }
}

/**
 * Delete short-lived JSON value
 * @param {string} key - Ephemeral key
 * @returns {Promise<boolean>} Success status
 */
async function deleteEphemeral(key) {
  if (!isRedisConnected()) return false;

  try {
    await redisClient.del(`${EPHEMERAL_PREFIX}${key}`);
    return true;
  } catch (error) {
    logger.warn('Ephemeral delete error', { key, error: error.message });
    return false;
  }
}
