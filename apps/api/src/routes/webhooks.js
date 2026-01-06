/**
 * Webhook Management Routes
 *
 * Endpoints for creating and managing webhooks (real-time notifications)
 */

const express = require('express');
const { webhookDb, auditDb } = require('../db');
const { EVENT_TYPES, sendTestEvent } = require('../webhooks');
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

// ==================== Webhook CRUD ====================

/**
 * GET /api/webhooks
 * List all webhooks for current user
 */
router.get('/', requireLogin, async (req, res) => {
  try {
    const webhooks = await webhookDb.getByUserId(req.user.id);
    res.json({
      data: webhooks,
      meta: { total: webhooks.length }
    });
  } catch (error) {
    logger.error('Error listing webhooks', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

/**
 * GET /api/webhooks/events
 * Get available event types
 */
router.get('/events', requireLogin, (req, res) => {
  res.json({
    events: Object.values(EVENT_TYPES),
    descriptions: {
      'connection.created': 'Fired when a new provider connection is established',
      'connection.updated': 'Fired when connection tokens are refreshed',
      'connection.deleted': 'Fired when a connection is removed',
      'connection.expired': 'Fired when connection tokens expire',
      'data.synced': 'Fired when new data is synced from a provider',
      'data.updated': 'Fired when existing data is updated',
      'test': 'Test event for verifying webhook configuration'
    }
  });
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', requireLogin, async (req, res) => {
  try {
    const { url, events = ['*'], description } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Validate events
    const validEvents = ['*', ...Object.values(EVENT_TYPES)];
    const invalidEvents = events.filter(e => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: `Invalid events: ${invalidEvents.join(', ')}`,
        validEvents
      });
    }

    const webhook = await webhookDb.create(req.user.id, url, events, description);

    await auditDb.log(req.user.id, 'webhook_created', 'webhook', webhook.id, req.ip, req.get('user-agent'));
    logger.info('Webhook created', { userId: req.user.id, webhookId: webhook.id });

    res.status(201).json({
      data: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret, // Only shown once at creation
        events: webhook.events,
        description: webhook.description,
        enabled: webhook.enabled,
        createdAt: webhook.created_at
      },
      message: 'Webhook created. Save the secret now - it cannot be retrieved later.',
      warning: 'This is the only time the full secret will be shown.'
    });
  } catch (error) {
    logger.error('Error creating webhook', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

/**
 * PATCH /api/webhooks/:webhookId
 * Update a webhook
 */
router.patch('/:webhookId', requireLogin, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { url, events, description, enabled } = req.body;

    if (url !== undefined) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }

    if (events !== undefined) {
      const validEvents = ['*', ...Object.values(EVENT_TYPES)];
      const invalidEvents = events.filter(e => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: `Invalid events: ${invalidEvents.join(', ')}`,
          validEvents
        });
      }
    }

    const updated = await webhookDb.update(req.user.id, webhookId, { url, events, description, enabled });

    if (!updated) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    logger.info('Webhook updated', { userId: req.user.id, webhookId });

    res.json({ data: updated });
  } catch (error) {
    logger.error('Error updating webhook', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

/**
 * DELETE /api/webhooks/:webhookId
 * Delete a webhook
 */
router.delete('/:webhookId', requireLogin, async (req, res) => {
  try {
    const { webhookId } = req.params;

    const deleted = await webhookDb.delete(req.user.id, webhookId);

    if (!deleted) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    await auditDb.log(req.user.id, 'webhook_deleted', 'webhook', webhookId, req.ip, req.get('user-agent'));
    logger.info('Webhook deleted', { userId: req.user.id, webhookId });

    res.json({ message: 'Webhook deleted successfully', webhookId });
  } catch (error) {
    logger.error('Error deleting webhook', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// ==================== Webhook Secret Management ====================

/**
 * POST /api/webhooks/:webhookId/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:webhookId/regenerate-secret', requireLogin, async (req, res) => {
  try {
    const { webhookId } = req.params;

    const result = await webhookDb.regenerateSecret(req.user.id, webhookId);

    if (!result) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    logger.info('Webhook secret regenerated', { userId: req.user.id, webhookId });

    res.json({
      data: { id: result.id, secret: result.secret },
      message: 'Secret regenerated. Save the new secret now.',
      warning: 'This is the only time the new secret will be shown.'
    });
  } catch (error) {
    logger.error('Error regenerating webhook secret', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to regenerate secret' });
  }
});

// ==================== Webhook Testing ====================

/**
 * POST /api/webhooks/:webhookId/test
 * Send test webhook
 */
router.post('/:webhookId/test', requireLogin, async (req, res) => {
  try {
    const { webhookId } = req.params;

    const result = await sendTestEvent(req.user.id, webhookId);

    if (result.error === 'Webhook not found') {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json({
      success: result.success,
      status: result.status,
      message: result.success
        ? 'Test webhook delivered successfully'
        : `Test webhook failed: ${result.error || `HTTP ${result.status}`}`
    });
  } catch (error) {
    logger.error('Error sending test webhook', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to send test webhook' });
  }
});

// ==================== Webhook Delivery History ====================

/**
 * GET /api/webhooks/:webhookId/deliveries
 * Get webhook delivery history
 */
router.get('/:webhookId/deliveries', requireLogin, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    // Verify webhook belongs to user
    const webhook = await webhookDb.getById(req.user.id, webhookId);
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const deliveries = await webhookDb.getDeliveries(webhookId, limit);

    res.json({
      data: deliveries,
      meta: { total: deliveries.length, webhookId: parseInt(webhookId) }
    });
  } catch (error) {
    logger.error('Error getting webhook deliveries', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to get deliveries' });
  }
});

module.exports = router;
