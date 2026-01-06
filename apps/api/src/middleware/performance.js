/**
 * Performance Monitoring Middleware
 *
 * Tracks request/response timing and logs slow requests
 */

const logger = require('../logger');

// Threshold for slow request warning (ms)
const SLOW_REQUEST_THRESHOLD = parseInt(process.env.SLOW_REQUEST_MS) || 1000;

/**
 * Request timing middleware
 * Adds timing headers and logs slow requests
 */
function requestTiming(req, res, next) {
  const startTime = process.hrtime.bigint();
  const startTimestamp = Date.now();

  // Store start time for later use
  req.startTime = startTimestamp;

  // Override res.end to capture timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationMs = Math.round(durationNs / 1e6);

    // Add timing header
    res.setHeader('X-Response-Time', `${durationMs}ms`);

    // Log slow requests
    if (durationMs > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        durationMs,
        requestId: req.id,
        userAgent: req.get('user-agent'),
        ip: req.ip
      });
    }

    // Log all requests in debug mode
    logger.debug('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      durationMs,
      requestId: req.id
    });

    return originalEnd.apply(this, args);
  };

  next();
}

/**
 * Database query wrapper with timing
 * @param {Function} queryFn - The query function to wrap
 * @param {string} queryName - Name for logging
 * @returns {Function} Wrapped function with timing
 */
function timedQuery(queryFn, queryName) {
  return async (...args) => {
    const startTime = process.hrtime.bigint();

    try {
      const result = await queryFn(...args);

      const endTime = process.hrtime.bigint();
      const durationMs = Math.round(Number(endTime - startTime) / 1e6);

      // Log slow queries
      if (durationMs > 100) {
        logger.warn('Slow database query', {
          query: queryName,
          durationMs
        });
      }

      return result;
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const durationMs = Math.round(Number(endTime - startTime) / 1e6);

      logger.error('Database query failed', {
        query: queryName,
        durationMs,
        error: error.message
      });

      throw error;
    }
  };
}

/**
 * Memory usage logger
 * Call periodically to track memory trends
 */
function logMemoryUsage() {
  const usage = process.memoryUsage();
  const formatMB = (bytes) => Math.round(bytes / 1024 / 1024);

  logger.debug('Memory usage', {
    heapUsed: `${formatMB(usage.heapUsed)}MB`,
    heapTotal: `${formatMB(usage.heapTotal)}MB`,
    external: `${formatMB(usage.external)}MB`,
    rss: `${formatMB(usage.rss)}MB`
  });
}

/**
 * Get performance metrics
 * @returns {object} Current performance stats
 */
function getPerformanceMetrics() {
  const usage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  return {
    memory: {
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      rssMB: Math.round(usage.rss / 1024 / 1024)
    },
    cpu: {
      userMs: Math.round(cpuUsage.user / 1000),
      systemMs: Math.round(cpuUsage.system / 1000)
    },
    uptime: Math.round(process.uptime())
  };
}

module.exports = {
  requestTiming,
  timedQuery,
  logMemoryUsage,
  getPerformanceMetrics,
  SLOW_REQUEST_THRESHOLD
};
