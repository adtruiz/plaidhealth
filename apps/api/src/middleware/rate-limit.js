/**
 * Rate Limiting Middleware
 *
 * Production-ready rate limiting using Redis for distributed systems.
 * Falls back to in-memory tracking when Redis is unavailable.
 *
 * Features:
 * - Sliding window rate limiting
 * - Per-API key and per-IP tracking
 * - Configurable limits by endpoint type
 * - Redis-based for distributed deployments
 */

const logger = require('../logger');
const { getClient, isRedisConnected } = require('../redis');

// In-memory fallback for development or Redis failures
const memoryStore = new Map();

// Clean up in-memory entries every minute
setInterval(() => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  for (const [key, data] of memoryStore.entries()) {
    if (data.windowStart < oneMinuteAgo) {
      memoryStore.delete(key);
    }
  }
}, 60000);

/**
 * Rate limit configuration by endpoint type
 */
const RATE_LIMITS = {
  default: {
    windowMs: 60 * 1000,  // 1 minute
    max: 1000,            // 1000 requests per minute
    message: 'Too many requests, please try again later'
  },
  widget: {
    windowMs: 60 * 1000,
    max: 100,
    message: 'Widget token rate limit exceeded'
  },
  oauth: {
    windowMs: 60 * 1000,
    max: 50,
    message: 'OAuth rate limit exceeded'
  },
  sensitive: {
    windowMs: 60 * 1000,
    max: 20,
    message: 'Rate limit exceeded for sensitive operation'
  }
};

const RATE_LIMIT_PREFIX = 'ratelimit:';

/**
 * Get rate limit key for request
 * Uses API key ID if present, otherwise IP address
 */
function getRateLimitKey(req, type) {
  const identifier = req.apiKeyId || req.ip || 'unknown';
  return `${type}:${identifier}`;
}

/**
 * Check rate limit using Redis (sliding window)
 * @param {string} key - Rate limit key
 * @param {object} limit - Rate limit config
 * @returns {Promise<{allowed: boolean, remaining: number, retryAfter?: number}>}
 */
async function checkRateLimitRedis(key, limit) {
  const redis = getClient();
  const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
  const now = Date.now();
  const windowStart = now - limit.windowMs;

  try {
    // Use Redis transaction for atomic operations
    const multi = redis.multi();

    // Remove old entries outside the window
    multi.zRemRangeByScore(redisKey, 0, windowStart);

    // Count requests in current window
    multi.zCard(redisKey);

    // Add current request
    multi.zAdd(redisKey, { score: now, value: `${now}:${Math.random()}` });

    // Set key expiration
    multi.expire(redisKey, Math.ceil(limit.windowMs / 1000));

    const results = await multi.exec();
    const count = results[1]; // zCard result

    if (count >= limit.max) {
      // Get oldest entry to calculate retry time
      const oldest = await redis.zRange(redisKey, 0, 0, { BY: 'SCORE' });
      let retryAfter = limit.windowMs / 1000;

      if (oldest.length > 0) {
        const oldestTime = parseInt(oldest[0].split(':')[0], 10);
        retryAfter = Math.ceil((oldestTime + limit.windowMs - now) / 1000);
      }

      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(1, retryAfter)
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit.max - count - 1)
    };
  } catch (error) {
    logger.warn('Redis rate limit error, falling back to memory', { error: error.message });
    return checkRateLimitMemory(key, limit);
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 */
function checkRateLimitMemory(key, limit) {
  const now = Date.now();
  const data = memoryStore.get(key);

  if (!data || data.windowStart < now - limit.windowMs) {
    // New window
    memoryStore.set(key, {
      count: 1,
      windowStart: now
    });
    return { allowed: true, remaining: limit.max - 1 };
  }

  if (data.count >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((data.windowStart + limit.windowMs - now) / 1000)
    };
  }

  data.count++;
  return { allowed: true, remaining: limit.max - data.count };
}

/**
 * Create rate limit middleware
 * @param {string} type - Rate limit type: 'default', 'widget', 'oauth', 'sensitive'
 * @param {object} options - Override options
 * @param {boolean} options.enforce - Whether to enforce limits (default: true in production)
 */
function rateLimit(type = 'default', options = {}) {
  const limit = { ...RATE_LIMITS[type] || RATE_LIMITS.default };
  const enforce = options.enforce ?? process.env.NODE_ENV === 'production';

  return async (req, res, next) => {
    const key = getRateLimitKey(req, type);

    let result;
    if (isRedisConnected()) {
      result = await checkRateLimitRedis(key, limit);
    } else {
      result = checkRateLimitMemory(key, limit);
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Window', limit.windowMs / 1000);

    if (result.retryAfter) {
      res.setHeader('X-RateLimit-Reset', Math.floor((Date.now() + result.retryAfter * 1000) / 1000));
      res.setHeader('Retry-After', result.retryAfter);
    }

    if (!result.allowed) {
      logger.warn('Rate limit exceeded', {
        key,
        type,
        ip: req.ip,
        apiKeyId: req.apiKeyId,
        path: req.path,
        enforced: enforce
      });

      if (enforce) {
        return res.status(429).json({
          error: limit.message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: result.retryAfter
        });
      }
    }

    next();
  };
}

/**
 * Middleware to log API usage (always active)
 */
function logApiUsage(req, res, next) {
  const startTime = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'debug';

    logger[level]('API request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      apiKeyId: req.apiKeyId,
      authMethod: req.authMethod,
      requestId: req.id
    });
  });

  next();
}

/**
 * Get current rate limit status for an identifier
 */
async function getRateLimitStatus(identifier, type = 'default') {
  const key = `${type}:${identifier}`;
  const limit = RATE_LIMITS[type] || RATE_LIMITS.default;

  if (isRedisConnected()) {
    const redis = getClient();
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    try {
      // Clean and count
      await redis.zRemRangeByScore(redisKey, 0, windowStart);
      const count = await redis.zCard(redisKey);

      return {
        limit: limit.max,
        remaining: Math.max(0, limit.max - count),
        windowMs: limit.windowMs,
        enforced: process.env.NODE_ENV === 'production',
        backend: 'redis'
      };
    } catch (error) {
      logger.warn('Failed to get Redis rate limit status', { error: error.message });
    }
  }

  // Memory fallback
  const data = memoryStore.get(key);

  if (!data) {
    return {
      limit: limit.max,
      remaining: limit.max,
      windowMs: limit.windowMs,
      enforced: process.env.NODE_ENV === 'production',
      backend: 'memory'
    };
  }

  const now = Date.now();
  if (data.windowStart < now - limit.windowMs) {
    return {
      limit: limit.max,
      remaining: limit.max,
      windowMs: limit.windowMs,
      enforced: process.env.NODE_ENV === 'production',
      backend: 'memory'
    };
  }

  return {
    limit: limit.max,
    remaining: Math.max(0, limit.max - data.count),
    windowMs: limit.windowMs,
    resetAt: new Date(data.windowStart + limit.windowMs).toISOString(),
    enforced: process.env.NODE_ENV === 'production',
    backend: 'memory'
  };
}

module.exports = {
  rateLimit,
  logApiUsage,
  getRateLimitStatus,
  RATE_LIMITS
};
