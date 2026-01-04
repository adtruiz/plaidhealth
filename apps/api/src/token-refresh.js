const axios = require('axios');
const { epicDb, auditDb } = require('./db');
const logger = require('./logger');

// Import provider helper functions from server.js
// Note: We'll need to access getTokenUrl and getOAuthConfig from server
// For now, we'll duplicate the minimal logic needed

/**
 * Get token URL for a provider
 * @param {string} provider - Provider name
 * @returns {string} - Token URL for the specified provider
 */
function getTokenUrl(provider) {
  const tokenUrls = {
    epic: process.env.EPIC_TOKEN_URL,
    smart: process.env.SMART_TOKEN_URL,
    cerner: process.env.CERNER_TOKEN_URL,
    healow: process.env.HEALOW_TOKEN_URL,
    cigna: process.env.CIGNA_TOKEN_URL,
    humana: process.env.HUMANA_TOKEN_URL,
    aetna: process.env.AETNA_TOKEN_URL,
    anthem: process.env.ANTHEM_TOKEN_URL,
    bcbsmn: process.env.BCBS_MN_TOKEN_URL,
    nextgen: process.env.NEXTGEN_TOKEN_URL,
    bluebutton: process.env.BLUEBUTTON_TOKEN_URL,
    meditech: process.env.MEDITECH_TOKEN_URL,
    uhc: process.env.UHC_TOKEN_URL,
    quest: process.env.QUEST_TOKEN_URL,
    labcorp: process.env.LABCORP_TOKEN_URL,
    kaiser: process.env.KAISER_TOKEN_URL,
    centene: process.env.CENTENE_TOKEN_URL
  };
  return tokenUrls[provider] || tokenUrls.epic;
}

/**
 * Get client ID for a provider
 * @param {string} provider - Provider name
 * @returns {string} - Client ID for the specified provider
 */
function getClientId(provider) {
  const clientIds = {
    epic: process.env.EPIC_CLIENT_ID,
    smart: process.env.SMART_CLIENT_ID,
    cerner: process.env.CERNER_CLIENT_ID,
    healow: process.env.HEALOW_CLIENT_ID,
    cigna: process.env.CIGNA_CLIENT_ID,
    humana: process.env.HUMANA_CLIENT_ID,
    aetna: process.env.AETNA_CLIENT_ID,
    anthem: process.env.ANTHEM_CLIENT_ID,
    bcbsmn: process.env.BCBS_MN_CLIENT_ID,
    nextgen: process.env.NEXTGEN_CLIENT_ID,
    bluebutton: process.env.BLUEBUTTON_CLIENT_ID,
    meditech: process.env.MEDITECH_CLIENT_ID,
    uhc: process.env.UHC_CLIENT_ID,
    quest: process.env.QUEST_CLIENT_ID,
    labcorp: process.env.LABCORP_CLIENT_ID,
    kaiser: process.env.KAISER_CLIENT_ID,
    centene: process.env.CENTENE_CLIENT_ID
  };
  return clientIds[provider] || clientIds.epic;
}

/**
 * Refresh an access token using the refresh token (provider-agnostic)
 * @param {Object} connection - The ehr_connections row with decrypted tokens
 * @returns {Object} - New tokens and expiration
 */
async function refreshProviderToken(connection) {
  if (!connection.refresh_token) {
    throw new Error('No refresh token available');
  }

  try {
    logger.info('Refreshing token for patient', {
      patientId: connection.patient_id,
      provider: connection.provider
    });

    const tokenUrl = getTokenUrl(connection.provider);
    const clientId = getClientId(connection.provider);

    if (!tokenUrl || !clientId) {
      throw new Error(`Missing token URL or client ID for provider: ${connection.provider}`);
    }

    const response = await axios.post(
      tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
        client_id: clientId
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;
    const expiresAt = new Date(Date.now() + (expires_in * 1000));

    // Update the connection with new tokens (correct parameter order)
    await epicDb.upsertConnection(
      connection.user_id,
      connection.provider, // Fixed: added provider parameter
      connection.patient_id,
      access_token,
      refresh_token || connection.refresh_token, // Use new refresh token if provided, else keep old one
      expiresAt
    );

    logger.info('Token refreshed successfully', {
      patientId: connection.patient_id,
      provider: connection.provider
    });

    // Log the token refresh
    await auditDb.log(
      connection.user_id,
      'token_refresh',
      'ehr_connection',
      connection.patient_id,
      null,
      'token-refresh-service'
    );

    return {
      access_token,
      refresh_token: refresh_token || connection.refresh_token,
      expires_at: expiresAt
    };
  } catch (error) {
    logger.error('Token refresh failed', {
      patientId: connection.patient_id,
      provider: connection.provider,
      error: error.response?.data || error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Check all connections and refresh tokens that are about to expire
 * This should be run periodically (e.g., every 5 minutes)
 */
async function refreshExpiringTokens() {
  try {
    const connections = await epicDb.getConnectionsNeedingRefresh();

    if (connections.length === 0) {
      logger.debug('No tokens need refreshing');
      return;
    }

    logger.info('Found tokens that need refreshing', { count: connections.length });

    // Refresh all tokens in parallel using Promise.allSettled to handle failures gracefully
    const results = await Promise.allSettled(
      connections.map(connection => refreshProviderToken(connection))
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn('Failed to refresh token, will retry later', {
          patientId: connections[index].patient_id,
          provider: connections[index].provider
        });
      }
    });
  } catch (error) {
    logger.error('Error in refreshExpiringTokens', { error: error.message, stack: error.stack });
  }
}

// Export both the old name for backwards compatibility and the new name
module.exports = {
  refreshEpicToken: refreshProviderToken, // Backwards compatibility alias
  refreshProviderToken, // New provider-agnostic name
  refreshExpiringTokens
};
