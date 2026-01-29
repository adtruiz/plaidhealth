/**
 * Developer Portal API Routes
 *
 * Endpoints for developer registration, authentication, API key management,
 * and usage tracking. Used by the developer portal frontend.
 */

const express = require('express');
const crypto = require('crypto');
const { userDb, apiKeyDb } = require('../db');
const { setEphemeral, getEphemeral, deleteEphemeral } = require('../redis');
const logger = require('../logger');

const router = express.Router();

// Simple in-memory rate limiting for auth endpoints
const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 5;

function checkAuthRateLimit(email) {
  const now = Date.now();
  const attempts = authAttempts.get(email) || { count: 0, firstAttempt: now };

  if (now - attempts.firstAttempt > AUTH_WINDOW_MS) {
    authAttempts.set(email, { count: 1, firstAttempt: now });
    return true;
  }

  if (attempts.count >= MAX_AUTH_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  authAttempts.set(email, attempts);
  return true;
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Cleanup expired sessions and auth attempts periodically
setInterval(() => {
  const now = Date.now();

  // Cleanup expired sessions
  for (const [token, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }

  // Cleanup old auth attempts
  for (const [email, attempts] of authAttempts.entries()) {
    if (now - attempts.firstAttempt > AUTH_WINDOW_MS) {
      authAttempts.delete(email);
    }
  }
}, 60 * 60 * 1000); // Run every hour

/**
 * Hash password with salt
 */
function hashPassword(password, salt = null) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify password against stored hash
 */
function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

/**
 * Generate session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// In-memory session store (use Redis in production)
const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEV_SESSION_KEY_PREFIX = 'dev_session:';

/**
 * Middleware: Authenticate developer via session token
 */
async function authenticateDeveloper(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  const token = authHeader.substring(7);
  const session = await getEphemeral(`${DEV_SESSION_KEY_PREFIX}${token}`) || sessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    await deleteEphemeral(`${DEV_SESSION_KEY_PREFIX}${token}`);
    sessions.delete(token);
    return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
  }

  req.developer = session.user;
  req.sessionToken = token;
  next();
}

// ============== AUTH ENDPOINTS ==============

/**
 * POST /api/v1/developer/register
 * Register a new developer account
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Email, password, and name are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if email already exists
    const existing = await userDb.findByEmail(email);
    if (existing) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const { hash, salt } = hashPassword(password);

    // Create user with password auth (google_id will be null)
    const result = await userDb.createWithPassword(email, name, hash, salt, company);

    logger.info('Developer registered', { userId: result.id, email });

    // Auto-login: create session
    const token = generateSessionToken();
    const sessionPayload = {
      user: { id: result.id, email: result.email, name: result.name, company: result.company },
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    const storedInRedis = await setEphemeral(`${DEV_SESSION_KEY_PREFIX}${token}`, sessionPayload, SESSION_TTL_MS);
    if (!storedInRedis) {
      sessions.set(token, sessionPayload);
    }

    res.status(201).json({
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        company: result.company
      },
      token,
      expiresIn: SESSION_TTL_MS / 1000
    });
  } catch (error) {
    logger.error('Registration error', { error: error.message });
    res.status(500).json({ error: 'Registration failed', code: 'REGISTRATION_ERROR' });
  }
});

/**
 * POST /api/v1/developer/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Rate limiting
    if (!checkAuthRateLimit(email)) {
      return res.status(429).json({
        error: 'Too many login attempts. Try again later.',
        code: 'RATE_LIMITED'
      });
    }

    // Find user
    const user = await userDb.findByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    await userDb.updateLastLogin(user.id);

    // Create session
    const token = generateSessionToken();
    const sessionPayload = {
      user: { id: user.id, email: user.email, name: user.name, company: user.company },
      expiresAt: Date.now() + SESSION_TTL_MS
    };
    const storedInRedis = await setEphemeral(`${DEV_SESSION_KEY_PREFIX}${token}`, sessionPayload, SESSION_TTL_MS);
    if (!storedInRedis) {
      sessions.set(token, sessionPayload);
    }

    logger.info('Developer logged in', { userId: user.id, email });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company
      },
      token,
      expiresIn: SESSION_TTL_MS / 1000
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_ERROR' });
  }
});

/**
 * POST /api/v1/developer/logout
 * Invalidate session
 */
router.post('/logout', authenticateDeveloper, async (req, res) => {
  await deleteEphemeral(`${DEV_SESSION_KEY_PREFIX}${req.sessionToken}`);
  sessions.delete(req.sessionToken);
  res.json({ success: true });
});

/**
 * GET /api/v1/developer/me
 * Get current developer profile
 */
router.get('/me', authenticateDeveloper, async (req, res) => {
  try {
    const user = await userDb.findById(req.developer.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
  } catch (error) {
    logger.error('Profile fetch error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch profile', code: 'PROFILE_ERROR' });
  }
});

// ============== API KEY ENDPOINTS ==============

/**
 * GET /api/v1/developer/keys
 * List all API keys for the authenticated developer
 */
router.get('/keys', authenticateDeveloper, async (req, res) => {
  try {
    const keys = await apiKeyDb.getByUserId(req.developer.id);

    res.json({
      keys: keys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.key_prefix,
        scopes: key.scopes,
        createdAt: key.created_at,
        lastUsedAt: key.last_used_at,
        expiresAt: key.expires_at,
        revokedAt: key.revoked_at,
        requestCount: key.request_count,
        status: key.revoked_at ? 'revoked' : 'active'
      }))
    });
  } catch (error) {
    logger.error('List keys error', { error: error.message });
    res.status(500).json({ error: 'Failed to list API keys', code: 'LIST_KEYS_ERROR' });
  }
});

/**
 * POST /api/v1/developer/keys
 * Create a new API key
 */
router.post('/keys', authenticateDeveloper, async (req, res) => {
  try {
    const { name, scopes = ['read'], environment = 'sandbox' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Key name is required', code: 'MISSING_NAME' });
    }

    // Validate scopes
    const validScopes = ['read', 'write', 'admin'];
    const invalidScopes = scopes.filter(s => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        error: `Invalid scopes: ${invalidScopes.join(', ')}`,
        code: 'INVALID_SCOPES'
      });
    }

    const result = await apiKeyDb.create(req.developer.id, name, scopes, environment);

    logger.info('API key created', { userId: req.developer.id, keyId: result.id });

    res.status(201).json({
      id: result.id,
      name: result.name,
      key: result.key, // Only returned on creation
      keyPrefix: result.key_prefix,
      scopes: result.scopes,
      environment,
      createdAt: result.created_at,
      message: 'Store this key securely. It will not be shown again.'
    });
  } catch (error) {
    logger.error('Create key error', { error: error.message });
    res.status(500).json({ error: 'Failed to create API key', code: 'CREATE_KEY_ERROR' });
  }
});

/**
 * PATCH /api/v1/developer/keys/:keyId
 * Update an API key (name or scopes)
 */
router.patch('/keys/:keyId', authenticateDeveloper, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { name, scopes } = req.body;

    const result = await apiKeyDb.update(req.developer.id, keyId, { name, scopes });

    if (!result) {
      return res.status(404).json({ error: 'API key not found', code: 'KEY_NOT_FOUND' });
    }

    logger.info('API key updated', { userId: req.developer.id, keyId });

    res.json({
      id: result.id,
      name: result.name,
      keyPrefix: result.key_prefix,
      scopes: result.scopes
    });
  } catch (error) {
    logger.error('Update key error', { error: error.message });
    res.status(500).json({ error: 'Failed to update API key', code: 'UPDATE_KEY_ERROR' });
  }
});

/**
 * POST /api/v1/developer/keys/:keyId/revoke
 * Revoke an API key (can't be undone)
 */
router.post('/keys/:keyId/revoke', authenticateDeveloper, async (req, res) => {
  try {
    const { keyId } = req.params;

    const result = await apiKeyDb.revoke(req.developer.id, keyId);

    if (!result) {
      return res.status(404).json({ error: 'API key not found', code: 'KEY_NOT_FOUND' });
    }

    logger.info('API key revoked', { userId: req.developer.id, keyId });

    res.json({ success: true, message: 'API key has been revoked' });
  } catch (error) {
    logger.error('Revoke key error', { error: error.message });
    res.status(500).json({ error: 'Failed to revoke API key', code: 'REVOKE_KEY_ERROR' });
  }
});

/**
 * DELETE /api/v1/developer/keys/:keyId
 * Permanently delete an API key
 */
router.delete('/keys/:keyId', authenticateDeveloper, async (req, res) => {
  try {
    const { keyId } = req.params;

    const result = await apiKeyDb.delete(req.developer.id, keyId);

    if (!result) {
      return res.status(404).json({ error: 'API key not found', code: 'KEY_NOT_FOUND' });
    }

    logger.info('API key deleted', { userId: req.developer.id, keyId });

    res.json({ success: true, message: 'API key has been deleted' });
  } catch (error) {
    logger.error('Delete key error', { error: error.message });
    res.status(500).json({ error: 'Failed to delete API key', code: 'DELETE_KEY_ERROR' });
  }
});

// ============== USAGE ENDPOINTS ==============

/**
 * GET /api/v1/developer/usage
 * Get API usage statistics
 */
router.get('/usage', authenticateDeveloper, async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    // Get all keys for the user
    const keys = await apiKeyDb.getByUserId(req.developer.id);

    // Calculate totals
    const totalRequests = keys.reduce((sum, key) => sum + (key.request_count || 0), 0);
    const activeKeys = keys.filter(k => !k.revoked_at).length;

    // Generate mock daily data (in production, this would come from a usage tracking table)
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const dailyUsage = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dailyUsage.push({
        date: date.toISOString().split('T')[0],
        requests: Math.floor(Math.random() * 1000) + 100, // Mock data
        errors: Math.floor(Math.random() * 10)
      });
    }

    res.json({
      summary: {
        totalRequests,
        activeKeys,
        totalKeys: keys.length,
        period
      },
      dailyUsage,
      byKey: keys.map(key => ({
        id: key.id,
        name: key.name,
        requestCount: key.request_count || 0,
        lastUsedAt: key.last_used_at
      }))
    });
  } catch (error) {
    logger.error('Usage fetch error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch usage data', code: 'USAGE_ERROR' });
  }
});

module.exports = router;
