/**
 * Connect Widget Routes
 *
 * Embeddable widget API for patient health data authorization (like Plaid Link)
 */

const express = require('express');
const crypto = require('crypto');
const { widgetDb } = require('../db');
const { setEphemeral, getEphemeral, deleteEphemeral } = require('../redis');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rate-limit');
const { EVENT_TYPES, dispatchEvent } = require('../webhooks');
const logger = require('../logger');
const {
  getOAuthConfig,
  getFhirBaseUrl,
  getProviderType,
  isProviderConfigured,
  getAllProviders,
  getProviderConfig
} = require('../lib/providers');
const { generatePKCE } = require('../lib/oauth');

const router = express.Router();

// Widget sessions storage (for tracking OAuth state back to widget)
const widgetSessions = {};
const WIDGET_SESSION_KEY_PREFIX = 'widget_session:';

// Session expiration time: 1 hour
const SESSION_EXPIRATION_MS = 60 * 60 * 1000;

// Cleanup interval: 10 minutes
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

// ==================== Widget Token Management ====================

/**
 * POST /api/v1/widget/token
 * Create a widget token for initializing the Connect Widget
 */
router.post('/token', rateLimit('widget'), authenticate(['write']), async (req, res) => {
  try {
    const { client_user_id, redirect_uri, products, metadata } = req.body;

    if (!client_user_id) {
      return res.status(400).json({
        error: 'client_user_id is required',
        code: 'MISSING_CLIENT_USER_ID'
      });
    }

    const widgetToken = await widgetDb.create(
      req.user.id,
      client_user_id,
      redirect_uri,
      products || ['health_records'],
      metadata || {}
    );

    logger.info('Widget token created', {
      userId: req.user.id,
      clientUserId: client_user_id,
      tokenId: widgetToken.id
    });

    res.json({
      widget_token: widgetToken.token,
      expiration: widgetToken.expires_at,
      request_id: crypto.randomUUID()
    });
  } catch (error) {
    logger.error('Error creating widget token', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create widget token' });
  }
});

// ==================== Provider Discovery ====================

/**
 * GET /api/v1/widget/providers
 * List available health data providers
 */
router.get('/providers', (req, res) => {
  const allProviderKeys = getAllProviders();

  const providers = allProviderKeys.map(key => {
    const config = getProviderConfig(key);
    return {
      id: key,
      name: config?.displayName || key,
      type: getProviderType(key),
      logo: `/images/providers/${key}.png`,
      available: isProviderConfigured(key)
    };
  });

  // Sort: configured providers first, then alphabetically
  providers.sort((a, b) => {
    if (a.available !== b.available) return b.available ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  res.json({
    providers,
    request_id: crypto.randomUUID()
  });
});

// ==================== OAuth Initiation ====================

/**
 * GET /api/v1/widget/initiate/:provider
 * Start OAuth flow for a specific provider from the widget
 */
router.get('/initiate/:provider', rateLimit('oauth'), async (req, res) => {
  try {
    const { provider } = req.params;
    const { widget_token } = req.query;

    if (!widget_token) {
      return res.status(400).json({
        error: 'widget_token is required',
        code: 'MISSING_WIDGET_TOKEN'
      });
    }

    // Validate widget token
    const tokenData = await widgetDb.validate(widget_token);
    if (!tokenData) {
      return res.status(401).json({
        error: 'Invalid or expired widget token',
        code: 'INVALID_WIDGET_TOKEN'
      });
    }

    // Get provider config
    const config = getOAuthConfig(provider);
    if (!config || !config.clientId) {
      return res.status(400).json({
        error: `Provider ${provider} is not configured`,
        code: 'PROVIDER_NOT_CONFIGURED'
      });
    }

    // Generate state parameter with widget context
    const randomId = crypto.randomBytes(16).toString('hex');
    const stateData = {
      id: randomId,
      provider,
      widget: true,
      widgetToken: widget_token,
      widgetTokenId: tokenData.id,
      apiUserId: tokenData.api_user_id
    };

    // Add PKCE if provider requires it (generate once)
    let pkce = null;
    if (config.usesPKCE) {
      pkce = generatePKCE();
      stateData.cv = pkce.codeVerifier;
    }

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Store widget session (Redis first, in-memory fallback)
    const widgetSession = {
      ...stateData,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRATION_MS
    };
    const storedInRedis = await setEphemeral(
      `${WIDGET_SESSION_KEY_PREFIX}${state}`,
      widgetSession,
      SESSION_EXPIRATION_MS
    );
    if (!storedInRedis) {
      widgetSessions[state] = widgetSession;
    }

    // Build authorization URL
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', config.scope);
    authUrl.searchParams.append('state', state);

    if (config.usesPKCE && pkce) {
      widgetSessions[state].cv = pkce.codeVerifier;
      authUrl.searchParams.append('code_challenge', pkce.codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
    }

    if (config.requiresAud) {
      const audValue = config.audUrl || getFhirBaseUrl(provider);
      authUrl.searchParams.append('aud', audValue);
    }

    logger.info('Widget OAuth initiated', {
      provider,
      widgetTokenId: tokenData.id,
      apiUserId: tokenData.api_user_id
    });

    res.redirect(authUrl.toString());
  } catch (error) {
    logger.error('Error initiating widget OAuth', { error: error.message });
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

// ==================== Token Exchange ====================

/**
 * POST /api/v1/widget/exchange
 * Exchange a public token for permanent access credentials
 */
router.post('/exchange', authenticate(['write']), async (req, res) => {
  try {
    const { public_token } = req.body;

    if (!public_token) {
      return res.status(400).json({
        error: 'public_token is required',
        code: 'MISSING_PUBLIC_TOKEN'
      });
    }

    const exchangeResult = await widgetDb.exchangePublicToken(public_token);

    if (!exchangeResult) {
      return res.status(401).json({
        error: 'Invalid or expired public token',
        code: 'INVALID_PUBLIC_TOKEN'
      });
    }

    logger.info('Public token exchanged', {
      connectionId: exchangeResult.connectionId,
      provider: exchangeResult.provider,
      apiUserId: exchangeResult.apiUserId
    });

    // Dispatch webhook event
    dispatchEvent(exchangeResult.apiUserId, EVENT_TYPES.CONNECTION_CREATED, {
      connectionId: exchangeResult.connectionId,
      provider: exchangeResult.provider,
      patientId: exchangeResult.patientId,
      clientUserId: exchangeResult.clientUserId
    });

    res.json({
      connection_id: exchangeResult.connectionId,
      provider: exchangeResult.provider,
      patient_id: exchangeResult.patientId,
      client_user_id: exchangeResult.clientUserId,
      request_id: crypto.randomUUID()
    });
  } catch (error) {
    logger.error('Error exchanging public token', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// ==================== Widget Sessions ====================

/**
 * GET /api/v1/widget/sessions
 * Get widget sessions (for debugging)
 */
router.get('/sessions', authenticate(['read']), async (req, res) => {
  try {
    const sessions = await widgetDb.getByUserId(req.user.id);
    res.json({
      data: sessions,
      meta: { total: sessions.length }
    });
  } catch (error) {
    logger.error('Error getting widget sessions', { error: error.message, userId: req.user.id });
    res.status(500).json({ error: 'Failed to get widget sessions' });
  }
});

// ==================== Session Cleanup ====================

// Clean up expired widget sessions periodically
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [state, session] of Object.entries(widgetSessions)) {
    if (session.expiresAt && now > session.expiresAt) {
      delete widgetSessions[state];
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug('Cleaned up expired widget sessions', { count: cleanedCount });
  }

  // Also clean up expired tokens in database
  widgetDb.cleanupExpired().catch(err => {
    logger.error('Widget token cleanup error', { error: err.message });
  });
}, CLEANUP_INTERVAL_MS);

// Export widget sessions for use in callback handler
module.exports = router;
module.exports.widgetSessions = widgetSessions;
module.exports.getWidgetSession = async (state) => {
  const fromRedis = await getEphemeral(`${WIDGET_SESSION_KEY_PREFIX}${state}`);
  if (fromRedis) return fromRedis;
  return widgetSessions[state] || null;
};
module.exports.deleteWidgetSession = async (state) => {
  await deleteEphemeral(`${WIDGET_SESSION_KEY_PREFIX}${state}`);
  delete widgetSessions[state];
};
