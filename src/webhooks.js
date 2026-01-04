/**
 * Webhook Service
 *
 * Handles dispatching webhook events to subscriber endpoints.
 * Includes signing, delivery, and retry logic.
 */

const crypto = require('crypto');
const { webhookDb } = require('./db');
const logger = require('./logger');

// Available webhook event types
const EVENT_TYPES = {
  // Connection events
  CONNECTION_CREATED: 'connection.created',
  CONNECTION_UPDATED: 'connection.updated',
  CONNECTION_DELETED: 'connection.deleted',
  CONNECTION_EXPIRED: 'connection.expired',

  // Data sync events
  DATA_SYNCED: 'data.synced',
  DATA_UPDATED: 'data.updated',

  // Test event
  TEST: 'test'
};

// Retry delays in milliseconds (exponential backoff)
const RETRY_DELAYS = [
  0,            // Attempt 1: immediate
  60000,        // Attempt 2: 1 minute
  300000,       // Attempt 3: 5 minutes
  3600000,      // Attempt 4: 1 hour
  86400000      // Attempt 5: 24 hours
];

/**
 * Sign a webhook payload
 * @param {Object} payload - The payload to sign
 * @param {string} secret - The webhook secret
 * @param {number} timestamp - Unix timestamp
 * @returns {string} The signature
 */
function signPayload(payload, secret, timestamp) {
  const data = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Deliver a webhook to an endpoint
 * @param {string} url - The endpoint URL
 * @param {Object} payload - The payload to send
 * @param {string} secret - The webhook secret for signing
 * @returns {Promise<{success: boolean, status?: number, body?: string, error?: string}>}
 */
async function deliverWebhook(url, payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(payload, secret, timestamp);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `v1=${signature}`,
        'X-Webhook-Timestamp': timestamp.toString(),
        'User-Agent': 'PlaidForHealthcare-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const responseBody = await response.text().catch(() => '');

    return {
      success: response.ok,
      status: response.status,
      body: responseBody.substring(0, 1000) // Truncate long responses
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Dispatch a webhook event to all subscribers
 * @param {string} eventType - The event type (e.g., 'connection.created')
 * @param {Object} data - The event data
 * @param {number} userId - Optional: only send to webhooks owned by this user
 */
async function dispatchEvent(eventType, data, userId = null) {
  try {
    // Get all webhooks subscribed to this event
    let webhooks = await webhookDb.getSubscribers(eventType);

    // Filter by user if specified
    if (userId) {
      webhooks = webhooks.filter(w => w.user_id === userId);
    }

    if (webhooks.length === 0) {
      logger.debug('No webhooks subscribed to event', { eventType });
      return;
    }

    logger.info('Dispatching webhook event', { eventType, subscriberCount: webhooks.length });

    // Build the payload
    const payload = {
      id: crypto.randomUUID(),
      type: eventType,
      created: new Date().toISOString(),
      data
    };

    // Deliver to all subscribers (in parallel)
    const deliveryPromises = webhooks.map(async (webhook) => {
      const result = await deliverWebhook(webhook.url, payload, webhook.secret);

      // Log the delivery
      const status = result.success ? 'delivered' : 'failed';
      await webhookDb.logDelivery(
        webhook.id,
        eventType,
        payload,
        status,
        result.status || null,
        result.body || result.error || null
      );

      if (!result.success) {
        logger.warn('Webhook delivery failed', {
          webhookId: webhook.id,
          url: webhook.url,
          status: result.status,
          error: result.error
        });
      } else {
        logger.debug('Webhook delivered successfully', {
          webhookId: webhook.id,
          url: webhook.url
        });
      }

      return result;
    });

    await Promise.allSettled(deliveryPromises);
  } catch (error) {
    logger.error('Error dispatching webhook event', { eventType, error: error.message });
  }
}

/**
 * Process pending webhook retries
 * Should be called periodically (e.g., every minute)
 */
async function processRetries() {
  try {
    const pendingDeliveries = await webhookDb.getPendingRetries(50);

    if (pendingDeliveries.length === 0) {
      return;
    }

    logger.info('Processing webhook retries', { count: pendingDeliveries.length });

    for (const delivery of pendingDeliveries) {
      const result = await deliverWebhook(delivery.url, delivery.payload, delivery.secret);

      let status = result.success ? 'delivered' : 'failed';
      let nextRetryAt = null;

      // Schedule next retry if still failing and under retry limit
      if (!result.success && delivery.attempt_count < 5) {
        const retryDelay = RETRY_DELAYS[delivery.attempt_count] || RETRY_DELAYS[4];
        nextRetryAt = new Date(Date.now() + retryDelay);
      }

      await webhookDb.updateDelivery(
        delivery.id,
        status,
        result.status || null,
        result.body || result.error || null,
        nextRetryAt
      );

      logger.debug('Webhook retry processed', {
        deliveryId: delivery.id,
        attempt: delivery.attempt_count + 1,
        success: result.success,
        nextRetry: nextRetryAt
      });
    }
  } catch (error) {
    logger.error('Error processing webhook retries', { error: error.message });
  }
}

/**
 * Send a test webhook to verify configuration
 * @param {number} userId - The user ID
 * @param {number} webhookId - The webhook ID
 * @returns {Promise<{success: boolean, status?: number, error?: string}>}
 */
async function sendTestEvent(userId, webhookId) {
  const webhook = await webhookDb.getById(userId, webhookId);
  if (!webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  const payload = {
    id: crypto.randomUUID(),
    type: EVENT_TYPES.TEST,
    created: new Date().toISOString(),
    data: {
      message: 'This is a test webhook from Plaid for Healthcare',
      webhook_id: webhookId
    }
  };

  const result = await deliverWebhook(webhook.url, payload, webhook.secret);

  // Log the test delivery
  await webhookDb.logDelivery(
    webhookId,
    EVENT_TYPES.TEST,
    payload,
    result.success ? 'delivered' : 'failed',
    result.status || null,
    result.body || result.error || null
  );

  return result;
}

/**
 * Verify a webhook signature (for use by receiving applications)
 * @param {string} payload - The raw request body as string
 * @param {string} signature - The X-Webhook-Signature header value
 * @param {string} timestamp - The X-Webhook-Timestamp header value
 * @param {string} secret - Your webhook secret
 * @returns {boolean} Whether the signature is valid
 */
function verifySignature(payload, signature, timestamp, secret) {
  const expectedSignature = signPayload(JSON.parse(payload), secret, parseInt(timestamp));
  const providedSignature = signature.replace('v1=', '');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(providedSignature)
    );
  } catch {
    return false;
  }
}

module.exports = {
  EVENT_TYPES,
  dispatchEvent,
  processRetries,
  sendTestEvent,
  verifySignature,
  signPayload
};
