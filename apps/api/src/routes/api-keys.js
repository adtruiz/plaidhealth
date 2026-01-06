/**
 * API Key Management Routes
 *
 * Endpoints for creating and managing API keys (B2B authentication)
 */

const express = require('express');
const { apiKeyDb, auditDb } = require('../db');
const logger = require('../logger');

const router = express.Router();

/**
 * Middleware: Require user login
 */
function requireLogin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

// Valid scopes for API keys
const VALID_SCOPES = ['read', 'write', 'admin'];

// ==================== API Key CRUD ====================

/**
 * GET /api/keys
 * List all API keys for current user
 */
router.get('/', requireLogin, async (req, res) => {
  try {
    const keys = await apiKeyDb.getByUserId(req.user.id);
    res.json({
      data: keys.map(k => ({
        id: k.id,
        name: k.name,
        prefix: k.key_prefix,
        scopes: k.scopes,
        createdAt: k.created_at,
        lastUsedAt: k.last_used_at,
        expiresAt: k.expires_at,
        revokedAt: k.revoked_at,
        requestCount: k.request_count
      })),
      meta: { total: keys.length }
    });
  } catch (error) {
    logger.error('Error listing API keys', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/', requireLogin, async (req, res) => {
  try {
    const { name, scopes = ['read'] } = req.body;

    if (!name || typeof name !== 'string' || name.length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate scopes
    const requestedScopes = Array.isArray(scopes) ? scopes : [scopes];
    const invalidScopes = requestedScopes.filter(s => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        error: `Invalid scopes: ${invalidScopes.join(', ')}`,
        validScopes: VALID_SCOPES
      });
    }

    const keyData = await apiKeyDb.create(req.user.id, name.trim(), requestedScopes);

    // Log the creation for audit
    await auditDb.log(req.user.id, 'api_key_created', 'api_key', keyData.id, req.ip, req.get('user-agent'));

    logger.info('API key created', { userId: req.user.id, keyId: keyData.id, name: name.trim() });

    res.status(201).json({
      data: {
        id: keyData.id,
        name: keyData.name,
        key: keyData.key,  // Only returned once at creation!
        prefix: keyData.key_prefix,
        scopes: keyData.scopes,
        createdAt: keyData.created_at
      },
      message: 'API key created. Save this key now - it cannot be retrieved later.',
      warning: 'This is the only time the full key will be shown.'
    });
  } catch (error) {
    logger.error('Error creating API key', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * PATCH /api/keys/:keyId
 * Update an API key (name or scopes)
 */
router.patch('/:keyId', requireLogin, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { name, scopes } = req.body;

    if (!name && !scopes) {
      return res.status(400).json({ error: 'Nothing to update. Provide name or scopes.' });
    }

    // Validate scopes if provided
    if (scopes) {
      const requestedScopes = Array.isArray(scopes) ? scopes : [scopes];
      const invalidScopes = requestedScopes.filter(s => !VALID_SCOPES.includes(s));
      if (invalidScopes.length > 0) {
        return res.status(400).json({
          error: `Invalid scopes: ${invalidScopes.join(', ')}`,
          validScopes: VALID_SCOPES
        });
      }
    }

    const updated = await apiKeyDb.update(req.user.id, keyId, { name, scopes });

    if (!updated) {
      return res.status(404).json({ error: 'API key not found' });
    }

    logger.info('API key updated', { userId: req.user.id, keyId });

    res.json({
      data: {
        id: updated.id,
        name: updated.name,
        prefix: updated.key_prefix,
        scopes: updated.scopes
      }
    });
  } catch (error) {
    logger.error('Error updating API key', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// ==================== API Key Revocation ====================

/**
 * POST /api/keys/:keyId/revoke
 * Revoke an API key (soft delete - keeps audit trail)
 */
router.post('/:keyId/revoke', requireLogin, async (req, res) => {
  try {
    const { keyId } = req.params;

    const revoked = await apiKeyDb.revoke(req.user.id, keyId);

    if (!revoked) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await auditDb.log(req.user.id, 'api_key_revoked', 'api_key', keyId, req.ip, req.get('user-agent'));
    logger.info('API key revoked', { userId: req.user.id, keyId });

    res.json({ message: 'API key revoked successfully', keyId });
  } catch (error) {
    logger.error('Error revoking API key', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

/**
 * DELETE /api/keys/:keyId
 * Delete an API key permanently
 */
router.delete('/:keyId', requireLogin, async (req, res) => {
  try {
    const { keyId } = req.params;

    const deleted = await apiKeyDb.delete(req.user.id, keyId);

    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await auditDb.log(req.user.id, 'api_key_deleted', 'api_key', keyId, req.ip, req.get('user-agent'));
    logger.info('API key deleted', { userId: req.user.id, keyId });

    res.json({ message: 'API key deleted permanently', keyId });
  } catch (error) {
    logger.error('Error deleting API key', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
