/**
 * Authentication Middleware
 *
 * Supports both session-based auth (for web UI) and API key auth (for B2B).
 * API keys take the format: pfh_live_xxxx or pfh_test_xxxx
 */

const { apiKeyDb } = require('../db');
const logger = require('../logger');

/**
 * Extract API key from request
 * Supports: Authorization: Bearer pfh_xxx or X-API-Key: pfh_xxx
 */
function extractApiKey(req) {
  // Check Authorization header (preferred)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer pfh_')) {
    return authHeader.substring(7); // Remove 'Bearer '
  }

  // Check X-API-Key header (alternative)
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader?.startsWith('pfh_')) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Authenticate via API key or session
 * Sets req.user and req.authMethod on success
 *
 * @param {Array} requiredScopes - Scopes needed for this endpoint (e.g., ['read'])
 */
function authenticate(requiredScopes = ['read']) {
  return async (req, res, next) => {
    const apiKey = extractApiKey(req);

    // Try API key authentication first
    if (apiKey) {
      try {
        const keyData = await apiKeyDb.validate(apiKey);

        if (!keyData) {
          logger.warn('Invalid API key attempted', {
            prefix: apiKey.substring(0, 12) + '...',
            ip: req.ip
          });
          return res.status(401).json({
            error: 'Invalid API key',
            code: 'INVALID_API_KEY'
          });
        }

        // Check scopes
        const hasRequiredScopes = requiredScopes.every(
          scope => keyData.scopes.includes(scope) || keyData.scopes.includes('admin')
        );

        if (!hasRequiredScopes) {
          logger.warn('API key missing required scopes', {
            keyId: keyData.id,
            required: requiredScopes,
            actual: keyData.scopes
          });
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_SCOPES',
            required: requiredScopes
          });
        }

        // Set user context
        req.user = {
          id: keyData.user_id,
          email: keyData.email,
          name: keyData.user_name
        };
        req.authMethod = 'api_key';
        req.apiKeyId = keyData.id;
        req.apiKeyScopes = keyData.scopes;

        logger.debug('API key authentication successful', {
          userId: keyData.user_id,
          keyId: keyData.id
        });

        return next();
      } catch (err) {
        logger.error('API key validation error', { error: err.message });
        return res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    }

    // Fall back to session authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      req.authMethod = 'session';
      return next();
    }

    // No valid authentication
    logger.debug('Authentication required - no valid credentials');
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
      hint: 'Use Bearer token (Authorization: Bearer pfh_xxx) or login via web'
    });
  };
}

/**
 * Require specific scopes (use after authenticate middleware)
 */
function requireScopes(...scopes) {
  return (req, res, next) => {
    // Session auth has full access
    if (req.authMethod === 'session') {
      return next();
    }

    // Check API key scopes
    const hasRequiredScopes = scopes.every(
      scope => req.apiKeyScopes?.includes(scope) || req.apiKeyScopes?.includes('admin')
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_SCOPES',
        required: scopes
      });
    }

    next();
  };
}

/**
 * Session-only authentication (for web UI routes that shouldn't allow API keys)
 */
function requireSession(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    req.authMethod = 'session';
    return next();
  }

  return res.status(401).json({
    error: 'Session required',
    code: 'SESSION_REQUIRED'
  });
}

module.exports = {
  authenticate,
  requireScopes,
  requireSession,
  extractApiKey
};
