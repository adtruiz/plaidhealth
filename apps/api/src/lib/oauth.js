/**
 * OAuth Helper Module
 *
 * Handles PKCE generation, token requests, and OAuth flow helpers
 */

const crypto = require('crypto');
const logger = require('../logger');
const { getOAuthConfig, getFhirBaseUrl } = require('./providers');

/**
 * Generate PKCE code verifier and challenge
 */
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Create Basic Auth token request configuration
 */
function createBasicAuthTokenRequest(tokenUrl, code, clientId, clientSecret) {
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  return {
    url: tokenUrl,
    data: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: process.env.REDIRECT_URI
    }),
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
}

/**
 * Create PKCE token request configuration
 */
function createPKCETokenRequest(tokenUrl, code, clientId, codeVerifier, clientSecret = null) {
  const params = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier
  };

  // Some providers require client_secret even with PKCE
  if (clientSecret) {
    params.client_secret = clientSecret;
  }

  return {
    url: tokenUrl,
    data: new URLSearchParams(params),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
}

/**
 * Initiate OAuth flow for a provider
 */
function initiateOAuth(provider, req, res) {
  const config = getOAuthConfig(provider);

  if (!config || !config.clientId) {
    logger.error(`Missing OAuth configuration for provider: ${provider}`);
    return res.status(500).send(`Missing ${provider.toUpperCase()}_CLIENT_ID environment variable`);
  }

  if (!process.env.REDIRECT_URI) {
    return res.status(500).send('Missing REDIRECT_URI environment variable');
  }

  // Generate state parameter
  const randomId = crypto.randomBytes(16).toString('hex');
  const stateData = { id: randomId, provider };

  // Add PKCE if provider requires it
  let codeChallenge;
  if (config.usesPKCE) {
    const pkce = generatePKCE();
    stateData.cv = pkce.codeVerifier;
    codeChallenge = pkce.codeChallenge;
  }

  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  // Build authorization URL
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.append('client_id', config.clientId);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', config.scope);
  authUrl.searchParams.append('state', state);

  // Add PKCE parameters if required
  if (config.usesPKCE) {
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
  }

  // Add aud parameter if required
  if (config.requiresAud) {
    const audValue = config.audUrl || getFhirBaseUrl(provider);
    authUrl.searchParams.append('aud', audValue);
  }

  const finalUrl = authUrl.toString();
  const userEmail = req.user ? req.user.email : 'anonymous';
  logger.info(`${config.displayName} OAuth initiated - User: ${userEmail}`);

  // Log full authorization URL for debugging specific providers
  if (provider === 'meditech') {
    logger.info('MEDITECH Authorization URL:', { url: finalUrl });
  }

  res.redirect(finalUrl);
}

/**
 * Parse OAuth state parameter
 */
function parseState(state) {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString());
  } catch (error) {
    logger.error('Failed to parse OAuth state', { error: error.message });
    return null;
  }
}

module.exports = {
  generatePKCE,
  createBasicAuthTokenRequest,
  createPKCETokenRequest,
  initiateOAuth,
  parseState
};
