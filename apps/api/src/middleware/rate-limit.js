/**
 * Rate Limiting Middleware (Placeholder)
 *
 * This is a placeholder for rate limiting functionality.
 * In production, implement actual rate limiting using Redis or similar.
 *
 * Suggested approach:
 * 1. Use Redis for distributed rate limiting
 * 2. Implement sliding window algorithm
 * 3. Different limits for different endpoints:
 *    - API endpoints: 1000 requests/minute
 *    - Widget token creation: 100 requests/minute
 *    - OAuth initiation: 50 requests/minute
 *
 * Popular packages:
 * - express-rate-limit (simple, in-memory)
 * - rate-limiter-flexible (Redis-based, more robust)
 */

const logger = require('../logger');

// In-memory request tracking (for development/demo only)
// In production, use Redis: https://github.com/animir/node-rate-limiter-flexible
const requestCounts = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  for (const [key, data] of requestCounts.entries()) {
    if (data.windowStart < oneMinuteAgo) {
      requestCounts.delete(key);
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

/**
 * Get rate limit key for request
 * Uses API key ID if present, otherwise IP address
 */
function getRateLimitKey(req, type) {
  const identifier = req.apiKeyId || req.ip || 'unknown';
  return `${type}:${identifier}`;
}

/**
 * Check if request is within rate limit (placeholder - always allows)
 * TODO: Implement actual rate limiting with Redis
 */
function checkRateLimit(key, limit) {
  const now = Date.now();
  const data = requestCounts.get(key);

  if (!data || data.windowStart < now - limit.windowMs) {
    // New window
    requestCounts.set(key, {
      count: 1,
      windowStart: now
    });
    return { allowed: true, remaining: limit.max - 1 };
  }

  if (data.count >= limit.max) {
    // Rate limited - but currently just logging, not blocking
    return {
      allowed: true, // Change to false when enabling rate limiting
      remaining: 0,
      retryAfter: Math.ceil((data.windowStart + limit.windowMs - now) / 1000)
    };
  }

  data.count++;
  return { allowed: true, remaining: limit.max - data.count };
}

/**
 * Create rate limit middleware (placeholder)
 * @param {string} type - Rate limit type: 'default', 'widget', 'oauth', 'sensitive'
 */
function rateLimit(type = 'default') {
  const limit = RATE_LIMITS[type] || RATE_LIMITS.default;

  return (req, res, next) => {
    const key = getRateLimitKey(req, type);
    const result = checkRateLimit(key, limit);

    // Add rate limit headers (even though not enforcing)
    res.setHeader('X-RateLimit-Limit', limit.max);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (result.retryAfter) {
      res.setHeader('X-RateLimit-Reset', Math.floor((Date.now() + result.retryAfter * 1000) / 1000));
    }

    // Log rate limit status
    if (result.remaining <= 0) {
      logger.warn('Rate limit would be exceeded (not enforcing)', {
        key,
        type,
        ip: req.ip,
        apiKeyId: req.apiKeyId,
        path: req.path
      });
    }

    // TODO: When enabling rate limiting, uncomment this block:
    // if (!result.allowed) {
    //   return res.status(429).json({
    //     error: limit.message,
    //     code: 'RATE_LIMIT_EXCEEDED',
    //     retryAfter: result.retryAfter
    //   });
    // }

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
      authMethod: req.authMethod
    });
  });

  next();
}

/**
 * Get current rate limit status for an identifier
 */
function getRateLimitStatus(identifier, type = 'default') {
  const key = `${type}:${identifier}`;
  const limit = RATE_LIMITS[type] || RATE_LIMITS.default;
  const data = requestCounts.get(key);

  if (!data) {
    return {
      limit: limit.max,
      remaining: limit.max,
      windowMs: limit.windowMs,
      enforced: false // Rate limiting not yet enforced
    };
  }

  const now = Date.now();
  if (data.windowStart < now - limit.windowMs) {
    return {
      limit: limit.max,
      remaining: limit.max,
      windowMs: limit.windowMs,
      enforced: false
    };
  }

  return {
    limit: limit.max,
    remaining: Math.max(0, limit.max - data.count),
    windowMs: limit.windowMs,
    resetAt: new Date(data.windowStart + limit.windowMs).toISOString(),
    enforced: false
  };
}

module.exports = {
  rateLimit,
  logApiUsage,
  getRateLimitStatus,
  RATE_LIMITS
};
