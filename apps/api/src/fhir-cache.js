/**
 * FHIR Response Caching Layer
 *
 * Caches FHIR API responses to reduce load on healthcare providers
 * and improve response times. Uses Redis for distributed caching.
 *
 * Cache strategies:
 * - Patient demographics: 24 hours (rarely changes)
 * - Lab results: 15 minutes (may update frequently)
 * - Medications: 30 minutes
 * - Conditions: 1 hour
 * - Encounters: 1 hour
 */

const { cacheGet, cacheSet, cacheDeletePattern, isRedisConnected } = require('./redis');
const logger = require('./logger');

// Cache TTLs in seconds
const CACHE_TTL = {
  patient: 24 * 60 * 60,      // 24 hours
  labs: 15 * 60,               // 15 minutes
  medications: 30 * 60,        // 30 minutes
  conditions: 60 * 60,         // 1 hour
  encounters: 60 * 60,         // 1 hour
  claims: 60 * 60,             // 1 hour
  default: 5 * 60              // 5 minutes
};

/**
 * Generate cache key for FHIR resource
 * @param {string} connectionId - EHR connection ID
 * @param {string} resourceType - FHIR resource type
 * @param {object} params - Additional query parameters
 */
function generateCacheKey(connectionId, resourceType, params = {}) {
  const paramStr = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');

  return `fhir:${connectionId}:${resourceType}${paramStr ? `:${paramStr}` : ''}`;
}

/**
 * Get cached FHIR response
 * @param {string} connectionId - EHR connection ID
 * @param {string} resourceType - FHIR resource type (patient, labs, etc.)
 * @param {object} params - Additional query parameters
 * @returns {Promise<any|null>} Cached data or null
 */
async function getCachedFhirResponse(connectionId, resourceType, params = {}) {
  if (!isRedisConnected()) {
    return null;
  }

  const key = generateCacheKey(connectionId, resourceType, params);

  try {
    const cached = await cacheGet(key);

    if (cached) {
      logger.debug('FHIR cache hit', { connectionId, resourceType, key });
      return cached;
    }

    logger.debug('FHIR cache miss', { connectionId, resourceType, key });
    return null;
  } catch (error) {
    logger.warn('FHIR cache get error', { error: error.message, key });
    return null;
  }
}

/**
 * Cache FHIR response
 * @param {string} connectionId - EHR connection ID
 * @param {string} resourceType - FHIR resource type
 * @param {any} data - Data to cache
 * @param {object} params - Additional query parameters
 * @returns {Promise<boolean>} Success status
 */
async function cacheFhirResponse(connectionId, resourceType, data, params = {}) {
  if (!isRedisConnected()) {
    return false;
  }

  const key = generateCacheKey(connectionId, resourceType, params);
  const ttl = CACHE_TTL[resourceType] || CACHE_TTL.default;

  try {
    await cacheSet(key, data, ttl);
    logger.debug('FHIR response cached', { connectionId, resourceType, ttl, key });
    return true;
  } catch (error) {
    logger.warn('FHIR cache set error', { error: error.message, key });
    return false;
  }
}

/**
 * Invalidate cache for a connection
 * Call this when data is known to have changed (e.g., after token refresh)
 * @param {string} connectionId - EHR connection ID
 * @param {string} resourceType - Optional specific resource type
 * @returns {Promise<number>} Number of keys invalidated
 */
async function invalidateFhirCache(connectionId, resourceType = null) {
  if (!isRedisConnected()) {
    return 0;
  }

  const pattern = resourceType
    ? `fhir:${connectionId}:${resourceType}*`
    : `fhir:${connectionId}:*`;

  try {
    const count = await cacheDeletePattern(pattern);
    logger.info('FHIR cache invalidated', { connectionId, resourceType, keysDeleted: count });
    return count;
  } catch (error) {
    logger.warn('FHIR cache invalidation error', { error: error.message, connectionId });
    return 0;
  }
}

/**
 * Express middleware to cache FHIR responses
 * Use on routes that fetch FHIR data
 * @param {string} resourceType - FHIR resource type
 * @param {function} getConnectionId - Function to extract connection ID from request
 */
function fhirCacheMiddleware(resourceType, getConnectionId = req => req.params.connectionId) {
  return async (req, res, next) => {
    if (!isRedisConnected()) {
      return next();
    }

    const connectionId = getConnectionId(req);
    if (!connectionId) {
      return next();
    }

    // Check cache
    const cached = await getCachedFhirResponse(connectionId, resourceType, req.query);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-TTL', CACHE_TTL[resourceType] || CACHE_TTL.default);
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to cache successful responses
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Cache in background (don't await)
        cacheFhirResponse(connectionId, resourceType, data, req.query).catch(() => {});
        res.setHeader('X-Cache', 'MISS');
      }
      return originalJson(data);
    };

    next();
  };
}

/**
 * Get cache statistics
 * @returns {Promise<object>} Cache stats
 */
async function getCacheStats() {
  const { getClient } = require('./redis');

  if (!isRedisConnected()) {
    return { enabled: false, reason: 'Redis not connected' };
  }

  const redis = getClient();

  try {
    const info = await redis.info('memory');
    const dbSize = await redis.dbSize();

    // Count FHIR cache keys
    let fhirKeys = 0;
    for await (const key of redis.scanIterator({ MATCH: 'cache:fhir:*', COUNT: 100 })) {
      fhirKeys++;
    }

    return {
      enabled: true,
      totalKeys: dbSize,
      fhirCacheKeys: fhirKeys,
      ttls: CACHE_TTL
    };
  } catch (error) {
    return { enabled: true, error: error.message };
  }
}

module.exports = {
  getCachedFhirResponse,
  cacheFhirResponse,
  invalidateFhirCache,
  fhirCacheMiddleware,
  getCacheStats,
  CACHE_TTL
};
