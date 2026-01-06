/**
 * PlaidHealth API Server
 *
 * Main Express server with modular route architecture.
 * Routes are organized in /routes directory, helpers in /lib directory.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

// Database modules
const { pool, userDb, epicDb, auditDb, widgetDb } = require('./db');

// Middleware
const { logApiUsage } = require('./middleware/rate-limit');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// Background jobs
const { refreshExpiringTokens } = require('./token-refresh');

// Logger
const logger = require('./logger');

// Redis
const { initializeRedis, isRedisConnected, shutdown: shutdownRedis } = require('./redis');

// Config
const { loadConfig } = require('./config');

// Lib modules (centralized helpers)
const { getOAuthConfig, getFhirBaseUrl, getTokenUrl, getAllProviders } = require('./lib/providers');
const { generatePKCE, createBasicAuthTokenRequest, createPKCETokenRequest } = require('./lib/oauth');

// Route modules
const healthRoutes = require('./routes/health');
const fhirRoutes = require('./routes/fhir');
const widgetRoutes = require('./routes/widget');
const webhookRoutes = require('./routes/webhooks');
const apiKeyRoutes = require('./routes/api-keys');
const developerRoutes = require('./routes/developer');
const contactRoutes = require('./routes/contact');

// ==================== Express App Setup ====================

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for Railway to properly handle cookies
app.set('trust proxy', 1);

// Request ID middleware for distributed tracing
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req_${crypto.randomBytes(12).toString('hex')}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Parse JSON bodies
app.use(express.json());

// ==================== CORS Configuration ====================

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://developer-portal-alpha.vercel.app',
  'https://marketing-site-eight-tau.vercel.app',
  /\.vercel\.app$/
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID']
}));

// ==================== Session Configuration ====================

const pgSession = require('connect-pg-simple')(session);

const sessionMiddleware = session({
  store: new pgSession({ pool: pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'plaidhealth.sid',
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.RAILWAY_ENVIRONMENT ? true : false,
    httpOnly: true,
    sameSite: 'lax'
  }
});

app.use(sessionMiddleware);

// ==================== Passport Configuration ====================

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.REDIRECT_URI.replace('/callback', '')}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await userDb.findByGoogleId(profile.id);
      if (!user) {
        user = await userDb.create(
          profile.id,
          profile.emails[0].value,
          profile.displayName,
          profile.photos[0]?.value
        );
        logger.info('Created new user', { email: user.email });
      } else {
        await userDb.updateLastLogin(user.id);
        logger.info('User logged in', { email: user.email });
      }
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await userDb.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ==================== Auth Session Management ====================

// Demo mode auth sessions (for OAuth flows without user login)
const authSessions = {};
const MAX_AUTH_SESSIONS = 10000;
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Clean up expired sessions
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [state, session] of Object.entries(authSessions)) {
    if (session.expiresAt && now > session.expiresAt) {
      delete authSessions[state];
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug('Cleaned up expired sessions', { count: cleanedCount });
  }

  // Emergency cleanup if approaching limits
  const sessionCount = Object.keys(authSessions).length;
  if (sessionCount > MAX_AUTH_SESSIONS) {
    logger.warn('Auth sessions limit exceeded, forcing cleanup', { count: sessionCount });
    const sortedSessions = Object.entries(authSessions).sort((a, b) => a[1].createdAt - b[1].createdAt);
    const removeCount = Math.floor(sessionCount * 0.2);
    for (let i = 0; i < removeCount; i++) {
      delete authSessions[sortedSessions[i][0]];
    }
  }
}, CLEANUP_INTERVAL_MS);

// ==================== Background Jobs ====================

// Refresh expiring tokens every 5 minutes
setInterval(() => {
  logger.debug('Running token refresh check...');
  refreshExpiringTokens().catch(err => {
    logger.error('Token refresh error:', { error: err.message });
  });
}, 5 * 60 * 1000);

// Initial token refresh after startup
setTimeout(() => {
  logger.info('Running initial token refresh check...');
  refreshExpiringTokens().catch(err => {
    logger.error('Initial token refresh error:', { error: err.message });
  });
}, 30 * 1000);

// ==================== Middleware ====================

app.use(logApiUsage);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ==================== Route Registration ====================

// Health check routes (no auth)
app.use('/', healthRoutes);

// Developer Portal API
app.use('/api/v1/developer', developerRoutes);
app.use('/api/v1/contact', contactRoutes);

// Root redirect
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/my-dashboard.html');
  } else {
    res.redirect('/login.html');
  }
});

// Static files
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    logger.info('OAuth callback - User authenticated', { email: req.user?.email });
    req.session.save((err) => {
      if (err) {
        logger.error('Session save error', { error: err.message });
        return res.redirect('/login.html');
      }
      auditDb.log(req.user.id, 'user_login', null, null, req.ip, req.get('user-agent'));
      res.redirect('/my-dashboard.html');
    });
  }
);

// Logout
app.get('/auth/logout', (req, res) => {
  if (req.user) {
    auditDb.log(req.user.id, 'user_logout', null, null, req.ip, req.get('user-agent'));
  }
  req.logout(() => res.redirect('/login.html'));
});

// Provider OAuth initiation (dynamic for all providers)
function requireLogin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

function initiateOAuth(provider, req, res) {
  const config = getOAuthConfig(provider);

  if (!config || !config.clientId) {
    logger.error(`Missing OAuth configuration for provider: ${provider}`);
    return res.status(500).send(`Missing ${provider.toUpperCase()}_CLIENT_ID environment variable`);
  }

  if (!process.env.REDIRECT_URI) {
    return res.status(500).send('Missing REDIRECT_URI environment variable');
  }

  const randomId = crypto.randomBytes(16).toString('hex');
  const stateData = { id: randomId, provider };

  let codeChallenge;
  if (config.usesPKCE) {
    const pkce = generatePKCE();
    stateData.cv = pkce.codeVerifier;
    codeChallenge = pkce.codeChallenge;
  }

  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.append('client_id', config.clientId);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', config.scope);
  authUrl.searchParams.append('state', state);

  if (config.usesPKCE) {
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
  }

  if (config.requiresAud) {
    const audValue = config.audUrl || getFhirBaseUrl(provider);
    authUrl.searchParams.append('aud', audValue);
  }

  logger.info(`${config.displayName} OAuth initiated`, { user: req.user?.email || 'anonymous' });
  res.redirect(authUrl.toString());
}

// Register OAuth routes for all providers
getAllProviders().forEach(provider => {
  if (provider === 'meditech') {
    app.get(`/auth/${provider}`, (req, res) => initiateOAuth(provider, req, res));
  } else {
    app.get(`/auth/${provider}`, requireLogin, (req, res) => initiateOAuth(provider, req, res));
  }
});

// Demo Epic OAuth (no login required)
app.get('/auth/epic-demo', (req, res) => {
  if (!process.env.EPIC_CLIENT_ID || !process.env.REDIRECT_URI) {
    return res.status(500).send('Missing required environment variables');
  }
  initiateOAuth('epic', req, res);
});

// ==================== OAuth Callback Handler ====================

app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    logger.error('EHR authorization error', { error });
    return res.status(400).send(`Authorization error: ${error}`);
  }

  if (!code || !state) {
    return res.status(400).send('Missing code or state parameter');
  }

  let codeVerifier;
  let provider = 'epic';
  let isWidgetFlow = false;
  let widgetData = null;

  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    codeVerifier = stateData.cv;
    provider = stateData.provider || 'epic';

    if (stateData.widget) {
      isWidgetFlow = true;
      widgetData = {
        widgetToken: stateData.widgetToken,
        widgetTokenId: stateData.widgetTokenId,
        apiUserId: stateData.apiUserId
      };
    }

    // Non-PKCE providers don't need code verifier
    const nonPkceProviders = ['meditech', 'humana', 'aetna', 'bcbsmn', 'bcbsma', 'bcbstn', 'nextgen', 'molina'];
    if (!codeVerifier && !nonPkceProviders.includes(provider)) {
      throw new Error('Code verifier not found in state');
    }

    logger.info('OAuth callback', { provider, isWidgetFlow });
  } catch (err) {
    logger.error('Failed to decode state', { error: err.message });
    return res.status(400).send('Invalid state parameter. Please try connecting again.');
  }

  const oauthConfig = getOAuthConfig(provider);
  const tokenUrl = getTokenUrl(provider);
  const clientId = oauthConfig.clientId;

  try {
    logger.info('Exchanging authorization code', { provider });

    // MEDITECH special handling
    if (provider === 'meditech') {
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        client_id: clientId,
        client_secret: oauthConfig.clientSecret
      });

      const tokenResponse = await axios.post(tokenUrl, tokenData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token, patient, expires_in, refresh_token } = tokenResponse.data;
      const patientId = patient || '0218f2d0-968b-5888-976f-68a554670f6e'; // Greenfield test patient
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      if (isWidgetFlow && widgetData) {
        const connection = await epicDb.upsertConnection(
          widgetData.apiUserId, provider, patientId, access_token, refresh_token, expiresAt
        );
        await widgetDb.markUsed(widgetData.widgetToken, connection.id);
        const publicTokenData = await widgetDb.createPublicToken(widgetData.widgetTokenId, connection.id, provider);
        await auditDb.log(widgetData.apiUserId, 'widget_connect', 'ehr_connection', connection.id.toString(), req.ip, req.get('user-agent'));
        return res.redirect(`/connect-widget-result.html?public_token=${publicTokenData.token}&provider=${provider}`);
      }

      const connection = await epicDb.upsertConnection(req.user.id, provider, patientId, access_token, refresh_token, expiresAt);
      await auditDb.log(req.user.id, 'provider_connected', 'ehr_connection', connection.id.toString(), req.ip, req.get('user-agent'));
      return res.redirect('/my-dashboard.html?success=true');
    }

    // Standard OAuth flow for other providers
    const tokenRequestConfig = oauthConfig.usesPKCE
      ? createPKCETokenRequest(tokenUrl, code, clientId, codeVerifier, oauthConfig.clientSecret)
      : createBasicAuthTokenRequest(tokenUrl, code, clientId, oauthConfig.clientSecret);

    const tokenResponse = await axios.post(tokenRequestConfig.url, tokenRequestConfig.data, {
      headers: tokenRequestConfig.headers
    });

    const { access_token, patient, expires_in, refresh_token } = tokenResponse.data;
    logger.info('Access token received', { patient, provider });

    // Widget flow
    if (isWidgetFlow && widgetData) {
      const expiresAt = new Date(Date.now() + (expires_in * 1000));
      const connection = await epicDb.upsertConnection(widgetData.apiUserId, provider, patient, access_token, refresh_token, expiresAt);
      await widgetDb.markUsed(widgetData.widgetToken, connection.id);
      const publicTokenData = await widgetDb.createPublicToken(widgetData.widgetTokenId, connection.id, provider);
      await auditDb.log(widgetData.apiUserId, 'widget_connect', 'ehr_connection', connection.id.toString(), req.ip, req.get('user-agent'));
      logger.info('Widget OAuth completed', { connectionId: connection.id, provider });
      return res.redirect(`/connect-widget-result.html?public_token=${publicTokenData.token}&provider=${provider}`);
    }

    // Logged-in user flow
    if (req.user) {
      const expiresAt = new Date(Date.now() + (expires_in * 1000));
      await Promise.all([
        epicDb.upsertConnection(req.user.id, provider, patient, access_token, refresh_token, expiresAt),
        auditDb.log(req.user.id, 'ehr_connect', 'ehr_connection', patient, req.ip, req.get('user-agent'))
      ]);
      return res.redirect('/my-dashboard.html');
    }

    // Demo mode (no user)
    authSessions[state] = {
      accessToken: access_token,
      patientId: patient,
      expiresAt: Date.now() + (expires_in * 1000),
      provider: provider,
      createdAt: Date.now()
    };
    if (refresh_token) authSessions[state].refreshToken = refresh_token;
    res.redirect(`/dashboard.html?state=${state}`);

  } catch (error) {
    logger.error('Token exchange error', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(500).send(`Authentication failed: ${error.response?.data?.error || error.message}`);
  }
});

// ==================== API Routes (Modular) ====================

// FHIR health records API
app.use('/api', fhirRoutes);

// Widget API
app.use('/api/v1/widget', widgetRoutes);

// Webhooks API
app.use('/api/webhooks', webhookRoutes);

// API Keys
app.use('/api/keys', apiKeyRoutes);

// ==================== Demo Mode Routes ====================
// These use authSessions for OAuth flows without user login

function requireAuth(req, res, next) {
  const { state } = req.query;
  if (!state) return res.status(401).json({ error: 'Missing authentication state' });

  const session = authSessions[state];
  if (!session || !session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please log in again.' });
  }

  if (!session.expiresAt || Date.now() > session.expiresAt) {
    delete authSessions[state];
    return res.status(401).json({ error: 'Access token expired. Please log in again.' });
  }

  req.session = session;
  next();
}

app.get('/api/patient', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.EPIC_FHIR_BASE_URL}/Patient/${req.session.patientId}`,
      { headers: { 'Authorization': `Bearer ${req.session.accessToken}`, 'Accept': 'application/fhir+json' } }
    );
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch patient data' });
  }
});

app.get('/api/observations', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${process.env.EPIC_FHIR_BASE_URL}/Observation`, {
      params: { patient: req.session.patientId, category: 'laboratory', _sort: '-date', _count: 20 },
      headers: { 'Authorization': `Bearer ${req.session.accessToken}`, 'Accept': 'application/fhir+json' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch observations' });
  }
});

app.get('/api/medications', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${process.env.EPIC_FHIR_BASE_URL}/MedicationRequest`, {
      params: { patient: req.session.patientId, _sort: '-authoredon', _count: 20 },
      headers: { 'Authorization': `Bearer ${req.session.accessToken}`, 'Accept': 'application/fhir+json' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch medications' });
  }
});

app.get('/api/conditions', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${process.env.EPIC_FHIR_BASE_URL}/Condition`, {
      params: { patient: req.session.patientId, _count: 20 },
      headers: { 'Authorization': `Bearer ${req.session.accessToken}`, 'Accept': 'application/fhir+json' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch conditions' });
  }
});

app.get('/api/encounters', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(`${process.env.EPIC_FHIR_BASE_URL}/Encounter`, {
      params: { patient: req.session.patientId, _sort: '-date', _count: 20 },
      headers: { 'Authorization': `Bearer ${req.session.accessToken}`, 'Accept': 'application/fhir+json' }
    });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch encounters' });
  }
});

// ==================== Error Handling ====================

// 404 handler - catches unmatched routes
app.use(notFoundHandler);

// Global error handler - catches all errors
app.use(errorHandler);

// ==================== Server Startup ====================

let server;

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  if (server) {
    server.close(() => logger.info('HTTP server closed'));
  }

  try {
    await shutdownRedis();
    logger.info('Redis connection closed');
  } catch (error) {
    logger.warn('Error closing Redis', { error: error.message });
  }

  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.warn('Error closing database pool', { error: error.message });
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

async function startServer() {
  loadConfig();

  try {
    await initializeRedis();
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.warn('Redis initialization failed - continuing without Redis', { error: error.message });
  }

  const HOST = process.env.RAILWAY_ENVIRONMENT ? '0.0.0.0' : 'localhost';

  server = app.listen(PORT, HOST, () => {
    logger.info('PlaidHealth API Server Started', {
      port: PORT,
      host: HOST,
      environment: process.env.NODE_ENV || 'development',
      redis: isRedisConnected() ? 'connected' : 'disconnected'
    });

    if (!process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV !== 'production') {
      logger.info('Development mode - Epic sandbox credentials:', {
        username: 'fhirderrick',
        password: 'epicepic1'
      });
    }
  });

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

if (require.main === module) {
  startServer().catch(error => {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
}

module.exports = app;
