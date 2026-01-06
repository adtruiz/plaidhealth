// Database helper module
const { Pool } = require('pg');
const { encrypt, decrypt } = require('./encryption');
const logger = require('./logger');

// Create database connection pool
const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;

// Optimized pool configuration
const poolConfig = {
  // Connection pooling settings
  max: parseInt(process.env.PG_POOL_MAX) || 20,           // Maximum connections
  min: parseInt(process.env.PG_POOL_MIN) || 2,            // Minimum connections to keep
  idleTimeoutMillis: 30000,                               // Close idle connections after 30s
  connectionTimeoutMillis: 5000,                          // Fail if connection takes > 5s
  allowExitOnIdle: false,                                 // Keep pool alive

  // Statement timeout to prevent long-running queries
  statement_timeout: 30000,                               // 30 second query timeout

  ssl: { rejectUnauthorized: false }
};

if (databaseUrl) {
  poolConfig.connectionString = databaseUrl;
} else if (process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  poolConfig.host = process.env.PGHOST;
  poolConfig.port = process.env.PGPORT || 5432;
  poolConfig.user = process.env.PGUSER;
  poolConfig.password = process.env.PGPASSWORD;
  poolConfig.database = process.env.PGDATABASE;
} else {
  logger.error('Database connection variables not configured');
  process.exit(1);
}

const pool = new Pool(poolConfig);

// Test connection on startup
pool.on('connect', () => {
  logger.info('Database connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message, stack: err.stack });
});

/**
 * Get pool statistics for monitoring
 * @returns {object} Pool stats
 */
function getPoolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: poolConfig.max,
    min: poolConfig.min
  };
}

// User operations
const userDb = {
  // Find user by Google ID
  findByGoogleId: async (googleId) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0];
  },

  // Find user by email
  findByEmail: async (email) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  // Find user by ID
  findById: async (id) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Create new user
  create: async (googleId, email, name, profilePicture) => {
    const result = await pool.query(
      `INSERT INTO users (google_id, email, name, profile_picture, created_at, last_login)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [googleId, email, name, profilePicture]
    );
    return result.rows[0];
  },

  // Update last login
  updateLastLogin: async (id) => {
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [id]
    );
  },

  // Create new user with password (for developer portal)
  createWithPassword: async (email, name, passwordHash, passwordSalt, company = null) => {
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash, password_salt, company, created_at, last_login)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, name, company, created_at`,
      [email, name, passwordHash, passwordSalt, company]
    );
    return result.rows[0];
  },

  // Update user profile
  updateProfile: async (id, { name, company }) => {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (company !== undefined) {
      updates.push(`company = $${paramIndex++}`);
      values.push(company);
    }

    if (updates.length === 0) return null;

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING id, email, name, company`,
      values
    );
    return result.rows[0];
  }
};

// EHR connection operations (supports multiple providers: Epic, SMART Health IT, etc.)
const ehrDb = {
  // Get user's EHR connections (decrypts tokens)
  // Can filter by provider (e.g., 'epic', 'smart') or get all if provider is null
  getConnections: async (userId, provider = null) => {
    let query = `SELECT * FROM ehr_connections
       WHERE user_id = $1
       AND token_expires_at > NOW()`;
    const params = [userId];

    if (provider) {
      query += ` AND provider = $2`;
      params.push(provider);
    }

    query += ` ORDER BY last_synced DESC`;

    const result = await pool.query(query, params);

    // Decrypt tokens before returning
    return result.rows.map(row => ({
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null
    }));
  },

  // Get specific connection by patient ID (decrypts tokens)
  getConnection: async (userId, patientId, provider = 'epic') => {
    const result = await pool.query(
      `SELECT * FROM ehr_connections
       WHERE user_id = $1 AND patient_id = $2 AND provider = $3`,
      [userId, patientId, provider]
    );

    const row = result.rows[0];
    if (!row) return null;

    // Decrypt tokens before returning
    return {
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null
    };
  },

  // Get connection by ID (decrypts tokens)
  getConnectionById: async (userId, connectionId) => {
    const result = await pool.query(
      `SELECT * FROM ehr_connections
       WHERE user_id = $1 AND id = $2`,
      [userId, connectionId]
    );

    const row = result.rows[0];
    if (!row) return null;

    // Decrypt tokens before returning
    return {
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null
    };
  },

  // Create or update EHR connection (encrypts tokens before saving)
  upsertConnection: async (userId, provider, patientId, accessToken, refreshToken, expiresAt) => {
    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;

    const result = await pool.query(
      `INSERT INTO ehr_connections (user_id, provider, patient_id, access_token, refresh_token, token_expires_at, created_at, last_synced)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       ON CONFLICT (user_id, provider, patient_id)
       DO UPDATE SET
         access_token = $4,
         refresh_token = $5,
         token_expires_at = $6,
         last_synced = NOW()
       RETURNING *`,
      [userId, provider, patientId, encryptedAccessToken, encryptedRefreshToken, expiresAt]
    );
    return result.rows[0];
  },

  // Delete connection
  deleteConnection: async (userId, connectionId) => {
    await pool.query(
      'DELETE FROM ehr_connections WHERE user_id = $1 AND id = $2',
      [userId, connectionId]
    );
  },

  // Check if token needs refresh (expires in less than 5 minutes)
  needsRefresh: (connection) => {
    if (!connection || !connection.token_expires_at) return false;
    const expiresAt = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiresAt < fiveMinutesFromNow;
  },

  // Get connections that need token refresh
  getConnectionsNeedingRefresh: async () => {
    const result = await pool.query(
      `SELECT * FROM ehr_connections
       WHERE token_expires_at < NOW() + INTERVAL '5 minutes'
       AND refresh_token IS NOT NULL
       ORDER BY token_expires_at ASC`
    );

    // Decrypt tokens before returning
    return result.rows.map(row => ({
      ...row,
      access_token: decrypt(row.access_token),
      refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null
    }));
  }
};

// Audit log operations
const auditDb = {
  log: async (userId, action, resourceType, resourceId, ipAddress, userAgent) => {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, action, resourceType, resourceId, ipAddress, userAgent]
    );
  }
};

// API Key operations for B2B authentication
const apiKeyDb = {
  // Generate a new API key
  create: async (userId, name, scopes = ['read'], environment = 'sandbox') => {
    const crypto = require('crypto');
    // Generate a secure random key: pfh_live_xxxx or pfh_test_xxxx
    const prefix = environment === 'production' ? 'pfh_live_' : 'pfh_test_';
    const keyValue = prefix + crypto.randomBytes(24).toString('hex');
    // Store hash of the key, not the key itself
    const keyHash = crypto.createHash('sha256').update(keyValue).digest('hex');

    const result = await pool.query(
      `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, environment, created_at, last_used_at, request_count)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NULL, 0)
       RETURNING id, name, key_prefix, scopes, environment, created_at`,
      [userId, name, keyHash, keyValue.substring(0, 12) + '...', scopes, environment]
    );

    // Return the full key only on creation (won't be retrievable later)
    return {
      ...result.rows[0],
      key: keyValue
    };
  },

  // Validate an API key and return associated user
  validate: async (apiKey) => {
    const crypto = require('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await pool.query(
      `SELECT ak.*, u.id as user_id, u.email, u.name as user_name
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1
       AND ak.revoked_at IS NULL
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows[0]) {
      // Update last used timestamp
      await pool.query(
        'UPDATE api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = $1',
        [result.rows[0].id]
      );
    }

    return result.rows[0] || null;
  },

  // Get all API keys for a user (without the actual key values)
  getByUserId: async (userId) => {
    const result = await pool.query(
      `SELECT id, name, key_prefix, scopes, created_at, last_used_at, expires_at, revoked_at, request_count
       FROM api_keys
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Revoke an API key
  revoke: async (userId, keyId) => {
    const result = await pool.query(
      `UPDATE api_keys
       SET revoked_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [keyId, userId]
    );
    return result.rows[0] || null;
  },

  // Delete an API key permanently
  delete: async (userId, keyId) => {
    const result = await pool.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [keyId, userId]
    );
    return result.rows[0] || null;
  },

  // Update API key name or scopes
  update: async (userId, keyId, { name, scopes }) => {
    const updates = [];
    const values = [keyId, userId];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (scopes !== undefined) {
      updates.push(`scopes = $${paramIndex++}`);
      values.push(scopes);
    }

    if (updates.length === 0) return null;

    const result = await pool.query(
      `UPDATE api_keys
       SET ${updates.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING id, name, key_prefix, scopes, created_at, last_used_at`,
      values
    );
    return result.rows[0] || null;
  }
};

// Webhook operations for real-time notifications
const webhookDb = {
  // Create a new webhook
  create: async (userId, url, events = ['*'], description = null) => {
    const crypto = require('crypto');
    const secret = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `INSERT INTO webhooks (user_id, url, secret, events, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [userId, url, secret, events, description]
    );
    return result.rows[0];
  },

  // Get all webhooks for a user
  getByUserId: async (userId) => {
    const result = await pool.query(
      `SELECT id, url, events, description, enabled, created_at, updated_at
       FROM webhooks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Get webhook by ID (including secret for delivery)
  getById: async (userId, webhookId) => {
    const result = await pool.query(
      `SELECT * FROM webhooks WHERE id = $1 AND user_id = $2`,
      [webhookId, userId]
    );
    return result.rows[0] || null;
  },

  // Get all enabled webhooks subscribed to an event
  getSubscribers: async (eventType) => {
    const result = await pool.query(
      `SELECT * FROM webhooks
       WHERE enabled = true
       AND ($1 = ANY(events) OR '*' = ANY(events))`,
      [eventType]
    );
    return result.rows;
  },

  // Update webhook
  update: async (userId, webhookId, { url, events, description, enabled }) => {
    const updates = [];
    const values = [webhookId, userId];
    let paramIndex = 3;

    if (url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(url);
    }
    if (events !== undefined) {
      updates.push(`events = $${paramIndex++}`);
      values.push(events);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(enabled);
    }

    if (updates.length === 0) return null;
    updates.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE webhooks
       SET ${updates.join(', ')}
       WHERE id = $1 AND user_id = $2
       RETURNING id, url, events, description, enabled, created_at, updated_at`,
      values
    );
    return result.rows[0] || null;
  },

  // Delete webhook
  delete: async (userId, webhookId) => {
    const result = await pool.query(
      'DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id',
      [webhookId, userId]
    );
    return result.rows[0] || null;
  },

  // Regenerate webhook secret
  regenerateSecret: async (userId, webhookId) => {
    const crypto = require('crypto');
    const newSecret = crypto.randomBytes(32).toString('hex');

    const result = await pool.query(
      `UPDATE webhooks
       SET secret = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, secret`,
      [webhookId, userId, newSecret]
    );
    return result.rows[0] || null;
  },

  // Log a delivery attempt
  logDelivery: async (webhookId, eventType, payload, status, httpStatus = null, responseBody = null) => {
    const result = await pool.query(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, status, http_status, response_body, attempt_count, last_attempt_at, delivered_at)
       VALUES ($1, $2, $3, $4, $5, $6, 1, NOW(), $7)
       RETURNING *`,
      [webhookId, eventType, payload, status, httpStatus, responseBody, status === 'delivered' ? new Date() : null]
    );
    return result.rows[0];
  },

  // Update delivery status (for retries)
  updateDelivery: async (deliveryId, status, httpStatus, responseBody, nextRetryAt = null) => {
    const result = await pool.query(
      `UPDATE webhook_deliveries
       SET status = $2, http_status = $3, response_body = $4, attempt_count = attempt_count + 1,
           last_attempt_at = NOW(), delivered_at = $5, next_retry_at = $6
       WHERE id = $1
       RETURNING *`,
      [deliveryId, status, httpStatus, responseBody, status === 'delivered' ? new Date() : null, nextRetryAt]
    );
    return result.rows[0] || null;
  },

  // Get deliveries pending retry
  getPendingRetries: async (limit = 100) => {
    const result = await pool.query(
      `SELECT d.*, w.url, w.secret
       FROM webhook_deliveries d
       JOIN webhooks w ON d.webhook_id = w.id
       WHERE d.status IN ('pending', 'failed')
       AND d.attempt_count < 5
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())
       AND w.enabled = true
       ORDER BY d.next_retry_at ASC NULLS FIRST
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  // Get recent deliveries for a webhook
  getDeliveries: async (webhookId, limit = 50) => {
    const result = await pool.query(
      `SELECT id, event_type, status, http_status, attempt_count, created_at, delivered_at, last_attempt_at
       FROM webhook_deliveries
       WHERE webhook_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [webhookId, limit]
    );
    return result.rows;
  }
};

// Widget token operations for Connect Widget (like Plaid Link)
const widgetDb = {
  // Create a widget token for initiating OAuth flow
  create: async (userId, clientUserId, redirectUri = null, products = ['health_records'], metadata = {}) => {
    const crypto = require('crypto');
    // Generate a widget token: wt_xxxx (short-lived)
    const token = 'wt_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const result = await pool.query(
      `INSERT INTO widget_tokens (user_id, token, client_user_id, redirect_uri, products, metadata, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [userId, token, clientUserId, redirectUri, products, JSON.stringify(metadata), expiresAt]
    );
    return result.rows[0];
  },

  // Validate a widget token
  validate: async (token) => {
    const result = await pool.query(
      `SELECT wt.*, u.id as api_user_id, u.email as api_user_email
       FROM widget_tokens wt
       JOIN users u ON wt.user_id = u.id
       WHERE wt.token = $1
       AND wt.expires_at > NOW()
       AND wt.used_at IS NULL`,
      [token]
    );
    return result.rows[0] || null;
  },

  // Mark widget token as used (after successful OAuth)
  markUsed: async (token, connectionId) => {
    const result = await pool.query(
      `UPDATE widget_tokens
       SET used_at = NOW(), connection_id = $2
       WHERE token = $1
       RETURNING *`,
      [token, connectionId]
    );
    return result.rows[0] || null;
  },

  // Create a public token after successful OAuth (exchangeable for access)
  createPublicToken: async (widgetTokenId, connectionId, provider) => {
    const crypto = require('crypto');
    // Generate a public token: pt_xxxx (short-lived, exchangeable)
    const publicToken = 'pt_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const result = await pool.query(
      `INSERT INTO public_tokens (widget_token_id, connection_id, token, provider, expires_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [widgetTokenId, connectionId, publicToken, provider, expiresAt]
    );
    return result.rows[0];
  },

  // Exchange public token for access (returns connection info)
  exchangePublicToken: async (publicToken) => {
    // Get the public token and associated data
    const result = await pool.query(
      `SELECT pt.*, wt.user_id as api_user_id, wt.client_user_id, ec.patient_id, ec.provider
       FROM public_tokens pt
       JOIN widget_tokens wt ON pt.widget_token_id = wt.id
       JOIN ehr_connections ec ON pt.connection_id = ec.id
       WHERE pt.token = $1
       AND pt.expires_at > NOW()
       AND pt.exchanged_at IS NULL`,
      [publicToken]
    );

    if (!result.rows[0]) {
      return null;
    }

    const data = result.rows[0];

    // Mark as exchanged
    await pool.query(
      `UPDATE public_tokens SET exchanged_at = NOW() WHERE id = $1`,
      [data.id]
    );

    return {
      connectionId: data.connection_id,
      apiUserId: data.api_user_id,
      clientUserId: data.client_user_id,
      patientId: data.patient_id,
      provider: data.provider
    };
  },

  // Get widget sessions for a user (for debugging/management)
  getByUserId: async (userId) => {
    const result = await pool.query(
      `SELECT id, client_user_id, products, created_at, expires_at, used_at
       FROM widget_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId]
    );
    return result.rows;
  },

  // Clean up expired tokens
  cleanupExpired: async () => {
    const result = await pool.query(
      `DELETE FROM widget_tokens WHERE expires_at < NOW() - INTERVAL '1 hour' RETURNING id`
    );
    await pool.query(
      `DELETE FROM public_tokens WHERE expires_at < NOW() - INTERVAL '1 hour'`
    );
    return result.rowCount;
  }
};

module.exports = {
  pool,
  getPoolStats,
  userDb,
  ehrDb,
  epicDb: ehrDb, // Backward compatibility alias
  auditDb,
  apiKeyDb,
  webhookDb,
  widgetDb
};
