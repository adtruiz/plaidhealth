require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const { userDb, epicDb, auditDb, apiKeyDb, webhookDb, widgetDb } = require('./db');
const { authenticate, requireSession } = require('./middleware/auth');
const { rateLimit, logApiUsage } = require('./middleware/rate-limit');
const { EVENT_TYPES, dispatchEvent, sendTestEvent } = require('./webhooks');
const { refreshExpiringTokens } = require('./token-refresh');
const { deduplicateMedications, deduplicateConditions, deduplicateLabs, deduplicateEncounters } = require('./deduplication');
const { processLabTrendsData, processMedicationTimelineData, processHealthTimelineData, processConditionStats, processOverviewStats } = require('./chart-helpers');
const logger = require('./logger');
const { normalizePatient, normalizeLabs, normalizeMedications, normalizeConditions, normalizeEncounters, normalizeClaims } = require('./normalizers');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required for Railway to properly handle cookies
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json());

// Configure session with PostgreSQL store
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./db');

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    secure: process.env.RAILWAY_ENVIRONMENT ? true : false,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.REDIRECT_URI.replace('/callback', '')}/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Find or create user
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

// Serialize user to session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userDb.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Store auth state temporarily (in production, use Redis or database)
const authSessions = {};

// Session expiration time: 1 hour (matches Epic token expiration)
const SESSION_EXPIRATION_MS = 60 * 60 * 1000;

// Maximum number of concurrent auth sessions to prevent memory exhaustion
const MAX_AUTH_SESSIONS = 10000;

// Cleanup interval constants
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Clean up expired sessions every 10 minutes to prevent memory leaks
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

  // Emergency cleanup if approaching memory limits
  const sessionCount = Object.keys(authSessions).length;
  if (sessionCount > MAX_AUTH_SESSIONS) {
    logger.warn('Auth sessions limit exceeded, forcing cleanup', {
      count: sessionCount,
      limit: MAX_AUTH_SESSIONS
    });

    // Remove oldest 20% of sessions
    const sortedSessions = Object.entries(authSessions)
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    const removeCount = Math.floor(sessionCount * 0.2);

    for (let i = 0; i < removeCount; i++) {
      delete authSessions[sortedSessions[i][0]];
    }

    logger.info('Emergency cleanup completed', {
      removed: removeCount,
      remaining: Object.keys(authSessions).length
    });
  }
}, CLEANUP_INTERVAL_MS);

// Refresh expiring Epic tokens every 5 minutes
setInterval(() => {
  logger.debug('Running token refresh check...');
  refreshExpiringTokens().catch(err => {
    logger.error('Token refresh error:', { error: err.message, stack: err.stack });
  });
}, 5 * 60 * 1000);

// Run token refresh once on startup (after 30 seconds to allow DB to initialize)
setTimeout(() => {
  logger.info('Running initial token refresh check...');
  refreshExpiringTokens().catch(err => {
    logger.error('Initial token refresh error:', { error: err.message, stack: err.stack });
  });
}, 30 * 1000);

// API usage logging middleware
app.use(logApiUsage);

// Security headers middleware
app.use((req, res, next) => {
  // Allow iframe from same origin (needed for connect-widget.html)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Enforce HTTPS in production
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Route: Root - redirect to login or dashboard (must be before static middleware)
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/my-dashboard.html');
  } else {
    res.redirect('/login.html');
  }
});

// Serve static files (frontend) - disable index.html auto-serving
app.use(express.static(path.join(__dirname, '../public'), { index: false }));

// Google OAuth routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    logger.info('OAuth callback - User authenticated', {
      email: req.user?.email,
      sessionId: req.sessionID,
      authenticated: req.isAuthenticated()
    });

    // Save session before redirect to ensure it persists
    req.session.save((err) => {
      if (err) {
        logger.error('Session save error', { error: err.message });
        return res.redirect('/login.html');
      }
      logger.debug('Session saved successfully, redirecting to dashboard');
      // Log successful login
      auditDb.log(req.user.id, 'user_login', null, null, req.ip, req.get('user-agent'));
      res.redirect('/my-dashboard.html');
    });
  }
);

// Logout route
app.get('/auth/logout', (req, res) => {
  if (req.user) {
    auditDb.log(req.user.id, 'user_logout', null, null, req.ip, req.get('user-agent'));
  }
  req.logout(() => {
    res.redirect('/login.html');
  });
});

/**
 * Generate code verifier and challenge for PKCE (Proof Key for Code Exchange)
 * @returns {{codeVerifier: string, codeChallenge: string}} - PKCE credentials for OAuth
 */
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

// Route: Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'FHIR prototype server is running' });
});

/**
 * Middleware: Require user login
 * Checks if the user is authenticated via Passport.js session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Response} - Returns 401 if not authenticated, otherwise calls next()
 */
function requireLogin(req, res, next) {
  logger.debug('requireLogin middleware', {
    sessionId: req.sessionID,
    authenticated: req.isAuthenticated(),
    user: req.user?.email || 'No user'
  });
  if (!req.isAuthenticated()) {
    logger.warn('Authentication failed - returning 401');
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

/**
 * Centralized provider configuration mapping
 * Single source of truth for ALL provider metadata (FHIR, OAuth, display names)
 * This eliminates duplication between PROVIDER_CONFIG and getOAuthConfig()
 */
const PROVIDER_CONFIG = {
  epic: {
    displayName: 'Epic MyChart',
    fhirBaseUrl: () => process.env.EPIC_FHIR_BASE_URL,
    tokenUrl: () => process.env.EPIC_TOKEN_URL,
    clientId: () => process.env.EPIC_CLIENT_ID,
    authUrl: () => process.env.EPIC_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  smart: {
    displayName: 'SMART Health IT',
    fhirBaseUrl: () => process.env.SMART_FHIR_BASE_URL,
    tokenUrl: () => process.env.SMART_TOKEN_URL,
    clientId: () => process.env.SMART_CLIENT_ID,
    authUrl: () => process.env.SMART_AUTHORIZATION_URL,
    scope: 'openid fhirUser patient/*.read',
    requiresAud: false,
    usesPKCE: true
  },
  cerner: {
    displayName: 'Oracle Health (Cerner)',
    fhirBaseUrl: () => process.env.CERNER_FHIR_BASE_URL,
    tokenUrl: () => process.env.CERNER_TOKEN_URL,
    clientId: () => process.env.CERNER_CLIENT_ID,
    authUrl: () => process.env.CERNER_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  healow: {
    displayName: 'Healow (eClinicalWorks)',
    fhirBaseUrl: () => process.env.HEALOW_FHIR_BASE_URL,
    tokenUrl: () => process.env.HEALOW_TOKEN_URL,
    clientId: () => process.env.HEALOW_CLIENT_ID,
    authUrl: () => process.env.HEALOW_AUTHORIZATION_URL,
    scope: 'openid fhirUser patient/AllergyIntolerance.read patient/CarePlan.read patient/CareTeam.read patient/Condition.read patient/Device.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Binary.read patient/Encounter.read patient/Goal.read patient/Immunization.read patient/MedicationAdministration.read patient/MedicationRequest.read patient/Observation.read patient/Organization.read patient/Patient.read patient/Practitioner.read patient/Procedure.read patient/Provenance.read patient/Medication.read patient/Location.read patient/PractitionerRole.read',
    requiresAud: false,
    usesPKCE: true
  },
  cigna: {
    displayName: 'Cigna Healthcare',
    fhirBaseUrl: () => process.env.CIGNA_FHIR_BASE_URL,
    tokenUrl: () => process.env.CIGNA_TOKEN_URL,
    clientId: () => process.env.CIGNA_CLIENT_ID,
    authUrl: () => process.env.CIGNA_AUTHORIZATION_URL,
    scope: 'openid fhirUser patient/*.read',
    requiresAud: false,
    usesPKCE: true
  },
  humana: {
    displayName: 'Humana',
    fhirBaseUrl: () => process.env.HUMANA_FHIR_BASE_URL,
    tokenUrl: () => process.env.HUMANA_TOKEN_URL,
    clientId: () => process.env.HUMANA_CLIENT_ID,
    authUrl: () => process.env.HUMANA_AUTHORIZATION_URL,
    scope: 'patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read patient/MedicationRequest.read patient/Condition.read patient/Observation.read patient/Encounter.read',
    requiresAud: false,
    usesPKCE: false, // Humana uses Basic Auth
    clientSecret: () => process.env.HUMANA_CLIENT_SECRET
  },
  aetna: {
    displayName: 'Aetna',
    fhirBaseUrl: () => process.env.AETNA_FHIR_BASE_URL,
    tokenUrl: () => process.env.AETNA_TOKEN_URL,
    clientId: () => process.env.AETNA_CLIENT_ID,
    clientSecret: () => process.env.AETNA_CLIENT_SECRET,
    authUrl: () => process.env.AETNA_AUTHORIZATION_URL,
    scope: 'launch/patient patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read patient/MedicationRequest.read patient/Condition.read patient/Observation.read patient/Encounter.read',
    requiresAud: true,
    audUrl: () => process.env.AETNA_AUD,
    usesPKCE: false // Aetna uses Basic Auth
  },
  anthem: {
    displayName: 'Anthem (Elevance Health)',
    fhirBaseUrl: () => process.env.ANTHEM_FHIR_BASE_URL,
    tokenUrl: () => process.env.ANTHEM_TOKEN_URL,
    clientId: () => process.env.ANTHEM_CLIENT_ID,
    clientSecret: () => process.env.ANTHEM_CLIENT_SECRET,
    authUrl: () => process.env.ANTHEM_AUTHORIZATION_URL,
    scope: 'launch/patient patient/*.read openid profile',
    requiresAud: true,
    audUrl: () => process.env.ANTHEM_AUD,
    usesPKCE: true
  },
  bcbsmn: {
    displayName: 'Blue Cross Blue Shield Minnesota',
    fhirBaseUrl: () => process.env.BCBS_MN_FHIR_BASE_URL,
    tokenUrl: () => process.env.BCBS_MN_TOKEN_URL,
    clientId: () => process.env.BCBS_MN_CLIENT_ID,
    clientSecret: () => process.env.BCBS_MN_CLIENT_SECRET,
    authUrl: () => process.env.BCBS_MN_AUTHORIZATION_URL,
    scope: 'launch/patient patient/*.read openid profile fhirUser offline_access',
    requiresAud: true,
    audUrl: 'https://preview-api.bluecrossmn.com/fhir',
    usesPKCE: false // BCBS MN uses Basic Auth
  },
  bcbsma: {
    displayName: 'Blue Cross Blue Shield Massachusetts',
    fhirBaseUrl: () => process.env.BCBS_MA_FHIR_BASE_URL,
    tokenUrl: () => process.env.BCBS_MA_TOKEN_URL,
    clientId: () => process.env.BCBS_MA_CLIENT_ID,
    clientSecret: () => process.env.BCBS_MA_CLIENT_SECRET,
    authUrl: () => process.env.BCBS_MA_AUTHORIZATION_URL,
    scope: 'openid patient/*.read',
    requiresAud: false,
    usesPKCE: false // BCBS MA uses Basic Auth (Client Credentials in Body)
  },
  hcsc: {
    displayName: 'HCSC (BCBS IL/TX/MT/NM/OK)',
    fhirBaseUrl: () => process.env.HCSC_FHIR_BASE_URL,
    tokenUrl: () => process.env.HCSC_TOKEN_URL,
    clientId: () => process.env.HCSC_CLIENT_ID,
    clientSecret: () => process.env.HCSC_CLIENT_SECRET,
    authUrl: () => process.env.HCSC_AUTHORIZATION_URL,
    scope: 'openid hcscinteropscope',
    requiresAud: false,
    usesPKCE: true // HCSC uses PKCE with S256
  },
  bcbstn: {
    displayName: 'Blue Cross Blue Shield Tennessee',
    fhirBaseUrl: () => process.env.BCBS_TN_FHIR_BASE_URL,
    tokenUrl: () => process.env.BCBS_TN_TOKEN_URL,
    clientId: () => process.env.BCBS_TN_CLIENT_ID,
    clientSecret: () => process.env.BCBS_TN_CLIENT_SECRET,
    authUrl: () => process.env.BCBS_TN_AUTHORIZATION_URL,
    scope: 'user/*.read',
    requiresAud: false,
    usesPKCE: false // BCBS TN uses 1UpHealth Demo Sandbox with Basic Auth
  },
  nextgen: {
    displayName: 'NextGen Healthcare',
    fhirBaseUrl: () => process.env.NEXTGEN_FHIR_BASE_URL,
    tokenUrl: () => process.env.NEXTGEN_TOKEN_URL,
    clientId: () => process.env.NEXTGEN_CLIENT_ID,
    clientSecret: () => process.env.NEXTGEN_CLIENT_SECRET,
    authUrl: () => process.env.NEXTGEN_AUTHORIZATION_URL,
    scope: 'launch/patient patient/*.read openid profile fhirUser',
    requiresAud: true,
    audUrl: 'https://fhir.nextgen.com/nge/prod/fhir-api-r4/fhir/r4',
    usesPKCE: false // NextGen uses Basic Auth
  },
  bluebutton: {
    displayName: 'Medicare (Blue Button 2.0)',
    fhirBaseUrl: () => process.env.BLUEBUTTON_FHIR_BASE_URL,
    tokenUrl: () => process.env.BLUEBUTTON_TOKEN_URL,
    clientId: () => process.env.BLUEBUTTON_CLIENT_ID,
    clientSecret: () => process.env.BLUEBUTTON_CLIENT_SECRET,
    authUrl: () => process.env.BLUEBUTTON_AUTHORIZATION_URL,
    scope: 'patient/Coverage.read patient/ExplanationOfBenefit.read patient/Patient.read profile',
    requiresAud: false,
    usesPKCE: true
  },
  uhc: {
    displayName: 'UnitedHealthcare',
    fhirBaseUrl: () => process.env.UHC_FHIR_BASE_URL,
    tokenUrl: () => process.env.UHC_TOKEN_URL,
    clientId: () => process.env.UHC_CLIENT_ID,
    clientSecret: () => process.env.UHC_CLIENT_SECRET,
    authUrl: () => process.env.UHC_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: false,
    usesPKCE: true
  },
  quest: {
    displayName: 'Quest Diagnostics',
    fhirBaseUrl: () => process.env.QUEST_FHIR_BASE_URL,
    tokenUrl: () => process.env.QUEST_TOKEN_URL,
    clientId: () => process.env.QUEST_CLIENT_ID,
    clientSecret: () => process.env.QUEST_CLIENT_SECRET,
    authUrl: () => process.env.QUEST_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  labcorp: {
    displayName: 'LabCorp',
    fhirBaseUrl: () => process.env.LABCORP_FHIR_BASE_URL,
    tokenUrl: () => process.env.LABCORP_TOKEN_URL,
    clientId: () => process.env.LABCORP_CLIENT_ID,
    clientSecret: () => process.env.LABCORP_CLIENT_SECRET,
    authUrl: () => process.env.LABCORP_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  meditech: {
    displayName: 'MEDITECH Greenfield',
    fhirBaseUrl: () => process.env.MEDITECH_FHIR_BASE_URL,
    tokenUrl: () => process.env.MEDITECH_TOKEN_URL,
    clientId: () => process.env.MEDITECH_CLIENT_ID,
    clientSecret: () => process.env.MEDITECH_CLIENT_SECRET,
    authUrl: () => process.env.MEDITECH_AUTHORIZATION_URL,
    scope: 'patient/*.read',
    requiresAud: false,
    usesPKCE: false // Postman console shows NO PKCE parameters in working authorization
  },
  kaiser: {
    displayName: 'Kaiser Permanente',
    fhirBaseUrl: () => process.env.KAISER_FHIR_BASE_URL,
    tokenUrl: () => process.env.KAISER_TOKEN_URL,
    clientId: () => process.env.KAISER_CLIENT_ID,
    clientSecret: () => process.env.KAISER_CLIENT_SECRET,
    authUrl: () => process.env.KAISER_AUTHORIZATION_URL,
    scope: 'patient/*.read',
    requiresAud: true,
    usesPKCE: true
  },
  centene: {
    displayName: 'Centene',
    fhirBaseUrl: () => process.env.CENTENE_FHIR_BASE_URL,
    tokenUrl: () => process.env.CENTENE_TOKEN_URL,
    clientId: () => process.env.CENTENE_CLIENT_ID,
    clientSecret: () => process.env.CENTENE_CLIENT_SECRET,
    authUrl: () => process.env.CENTENE_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: true,
    usesPKCE: true
  },
  molina: {
    displayName: 'Molina Healthcare',
    fhirBaseUrl: () => process.env.MOLINA_FHIR_BASE_URL,
    tokenUrl: () => process.env.MOLINA_TOKEN_URL,
    clientId: () => process.env.MOLINA_CLIENT_ID,
    clientSecret: () => process.env.MOLINA_CLIENT_SECRET,
    authUrl: () => process.env.MOLINA_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: false,
    usesPKCE: false // Molina uses Basic Auth with client secret
  }
};

/**
 * Get FHIR base URL for a provider
 * @param {string} provider - Provider name
 * @returns {string} - FHIR base URL for the specified provider
 */
function getFhirBaseUrl(provider) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.epic;
  return config.fhirBaseUrl();
}

/**
 * Get provider display name
 * @param {string} provider - Provider name
 * @returns {string} - Human-readable display name for the provider
 */
function getProviderDisplayName(provider) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.epic;
  return config.displayName;
}

/**
 * Get token URL for a provider
 * @param {string} provider - Provider name
 * @returns {string} - Token URL for the specified provider
 */
function getTokenUrl(provider) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.epic;
  return config.tokenUrl();
}

/**
 * Shared FHIR API request helper
 * @param {Object} connection - Database connection object with provider, patient_id, access_token
 * @param {string} resourceType - FHIR resource type (e.g., 'Patient', 'MedicationRequest')
 * @param {Object} params - Optional query parameters for the FHIR API request
 * @returns {Promise<Object>} - Axios response object
 */
async function fetchFhirResource(connection, resourceType, params = {}) {
  const fhirBaseUrl = getFhirBaseUrl(connection.provider);
  const url = `${fhirBaseUrl}/${resourceType}`;

  return await axios.get(url, {
    params,
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Accept': 'application/fhir+json'
    }
  });
}

/**
 * Create Basic Auth token request configuration
 * @param {string} tokenUrl - Token endpoint URL
 * @param {string} code - Authorization code
 * @param {string} clientId - Client ID
 * @param {string} clientSecret - Client secret
 * @returns {Object} - Token request configuration
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
 * @param {string} tokenUrl - Token endpoint URL
 * @param {string} code - Authorization code
 * @param {string} clientId - Client ID
 * @param {string} codeVerifier - PKCE code verifier
 * @param {string|null} clientSecret - Optional client secret (required by some providers like MEDITECH)
 * @returns {Object} - Token request configuration
 */
function createPKCETokenRequest(tokenUrl, code, clientId, codeVerifier, clientSecret = null) {
  const params = {
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.REDIRECT_URI,
    client_id: clientId,
    code_verifier: codeVerifier
  };

  // Some providers (e.g., MEDITECH) require client_secret even with PKCE
  // This is non-standard but technically valid ("confidential client with PKCE")
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
 * Get OAuth configuration for a provider (now reads from unified PROVIDER_CONFIG)
 * @param {string} provider - Provider name
 * @returns {Object} - OAuth configuration object with clientId, authUrl, scope, etc.
 */
function getOAuthConfig(provider) {
  const config = PROVIDER_CONFIG[provider];

  if (!config) {
    return null;
  }

  // Return OAuth-specific fields, calling functions to get values
  return {
    clientId: config.clientId ? config.clientId() : null,
    clientSecret: config.clientSecret ? config.clientSecret() : null,
    authUrl: config.authUrl ? config.authUrl() : null,
    audUrl: config.audUrl ? (typeof config.audUrl === 'function' ? config.audUrl() : config.audUrl) : null,
    scope: config.scope,
    requiresAud: config.requiresAud,
    usesPKCE: config.usesPKCE,
    displayName: config.displayName
  };
}

/**
 * Shared OAuth initiation handler
 * @param {string} provider - Provider name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
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
  let codeChallenge, codeVerifier;
  if (config.usesPKCE) {
    const pkce = generatePKCE();
    codeVerifier = pkce.codeVerifier;
    codeChallenge = pkce.codeChallenge;
    stateData.cv = codeVerifier;
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
    // Use specific audUrl if provided (Aetna), otherwise use FHIR base URL
    const audValue = config.audUrl || getFhirBaseUrl(provider);
    authUrl.searchParams.append('aud', audValue);
  }

  const finalUrl = authUrl.toString();
  const userEmail = req.user ? req.user.email : 'anonymous';
  logger.info(`${config.displayName} OAuth initiated - User: ${userEmail}`);

  // Log full authorization URL for MEDITECH debugging
  if (provider === 'meditech') {
    logger.info('MEDITECH Authorization URL:', { url: finalUrl });
    console.log('\n=== MEDITECH AUTHORIZATION URL ===');
    console.log(finalUrl);
    console.log('===================================\n');
  }

  res.redirect(finalUrl);
}

// Route: Debug config (only for development - DO NOT use in production)
app.get('/debug-config', (req, res) => {
  // Block this endpoint in production
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    hasClientId: !!process.env.EPIC_CLIENT_ID,
    clientIdLength: process.env.EPIC_CLIENT_ID?.length || 0,
    hasAuthUrl: !!process.env.EPIC_AUTHORIZATION_URL,
    hasRedirectUri: !!process.env.REDIRECT_URI
    // Note: No longer exposing redirect URI for security
  });
});

// Route: Get current user
app.get('/api/user', requireLogin, (req, res) => {
  logger.debug('/api/user called', {
    sessionId: req.sessionID,
    authenticated: req.isAuthenticated(),
    user: req.user?.email
  });
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    profile_picture: req.user.profile_picture
  });
});

// Route: Get user's Epic connections
app.get('/api/epic-connections', requireLogin, async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    res.json(connections);
  } catch (error) {
    logger.error('Error fetching connections', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// Route: Delete Epic connection
app.delete('/api/epic-connections/:id', requireLogin, async (req, res) => {
  try {
    // TODO: Verify connection belongs to user before deleting
    await epicDb.deleteConnection(req.user.id, req.params.id);
    await auditDb.log(req.user.id, 'epic_disconnect', 'epic_connection', req.params.id, req.ip, req.get('user-agent'));
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting connection', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// NEW UNIFIED HEALTH RECORDS API - Fetches data from database-stored connections

// Route: Get aggregated health data from ALL connections
app.get('/api/health-records/unified', requireLogin, async (req, res) => {
  try {
    // Get all connections for this user
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({
        connections: [],
        patients: [],
        medications: [],
        conditions: [],
        labs: [],
        encounters: []
      });
    }

    logger.info('Fetching unified health data', { connectionCount: connections.length });

    // Fetch data from all connections in parallel
    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          // Get provider-specific FHIR base URL
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);

          // Fetch all resource types for this connection
          const [patientRes, medsRes, conditionsRes, labsRes, encountersRes] = await Promise.allSettled([
            // Patient
            axios.get(
              `${fhirBaseUrl}/Patient/${connection.patient_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            // Medications
            axios.get(
              `${fhirBaseUrl}/MedicationRequest`,
              {
                params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            // Conditions
            axios.get(
              `${fhirBaseUrl}/Condition`,
              {
                params: { patient: connection.patient_id, _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            // Labs
            axios.get(
              `${fhirBaseUrl}/Observation`,
              {
                params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            // Encounters
            axios.get(
              `${fhirBaseUrl}/Encounter`,
              {
                params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            )
          ]);

          // Add source information to each resource
          const sourceInfo = {
            connectionId: connection.id,
            patientId: connection.patient_id,
            source: getProviderDisplayName(connection.provider),
            provider: connection.provider,
            lastSynced: connection.last_synced
          };

          return {
            connection: sourceInfo,
            patient: patientRes.status === 'fulfilled' ? patientRes.value.data : null,
            medications: medsRes.status === 'fulfilled' ? medsRes.value.data : null,
            conditions: conditionsRes.status === 'fulfilled' ? conditionsRes.value.data : null,
            labs: labsRes.status === 'fulfilled' ? labsRes.value.data : null,
            encounters: encountersRes.status === 'fulfilled' ? encountersRes.value.data : null
          };
        } catch (error) {
          logger.error('Error fetching data for connection', { connectionId: connection.id, error: error.message });
          return null;
        }
      })
    );

    // Extract successful results
    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    // Aggregate all data with source info
    const aggregated = {
      connections: successfulResults.map(r => r.connection),
      patients: successfulResults
        .filter(r => r.patient)
        .map(r => ({ ...r.patient, _source: r.connection })),
      medications: successfulResults
        .filter(r => r.medications?.entry)
        .flatMap(r => r.medications.entry.map(e => ({
          ...e.resource,
          _source: r.connection
        }))),
      conditions: successfulResults
        .filter(r => r.conditions?.entry)
        .flatMap(r => r.conditions.entry.map(e => ({
          ...e.resource,
          _source: r.connection
        }))),
      labs: successfulResults
        .filter(r => r.labs?.entry)
        .flatMap(r => r.labs.entry.map(e => ({
          ...e.resource,
          _source: r.connection
        }))),
      encounters: successfulResults
        .filter(r => r.encounters?.entry)
        .flatMap(r => r.encounters.entry.map(e => ({
          ...e.resource,
          _source: r.connection
        })))
    };

    // Log audit trail for data access
    for (const connection of successfulResults.map(r => r.connection)) {
      await auditDb.log(
        req.user.id,
        'data_access',
        'unified_view',
        connection.patientId,
        req.ip,
        req.get('user-agent')
      );
    }

    logger.info('Unified data aggregated', {
      medications: aggregated.medications.length,
      conditions: aggregated.conditions.length,
      labs: aggregated.labs.length,
      encounters: aggregated.encounters.length
    });

    // Apply deduplication if multiple connections exist
    let deduplicated = null;
    if (connections.length > 1) {
      deduplicated = {
        medications: deduplicateMedications(aggregated.medications),
        conditions: deduplicateConditions(aggregated.conditions),
        labs: deduplicateLabs(aggregated.labs),
        encounters: deduplicateEncounters(aggregated.encounters)
      };

      logger.info('Deduplication results', {
        medications: `${deduplicated.medications.length} from ${aggregated.medications.length}`,
        conditions: `${deduplicated.conditions.length} from ${aggregated.conditions.length}`,
        labs: `${deduplicated.labs.length} from ${aggregated.labs.length}`,
        encounters: `${deduplicated.encounters.length} from ${aggregated.encounters.length}`
      });
    }

    res.json({
      ...aggregated,
      deduplicated: deduplicated || {
        medications: aggregated.medications.map(m => ({ primary: m, duplicates: [], sources: [m._source] })),
        conditions: aggregated.conditions.map(c => ({ primary: c, duplicates: [], sources: [c._source] })),
        labs: aggregated.labs.map(l => ({ primary: l, duplicates: [], sources: [l._source] })),
        encounters: aggregated.encounters.map(e => ({ primary: e, duplicates: [], sources: [e._source] }))
      }
    });
  } catch (error) {
    logger.error('Error in unified health records', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: 'Failed to fetch unified health records',
      details: error.message
    });
  }
});

// ==================== NORMALIZED API v1 ENDPOINTS ====================
// These endpoints return normalized, consistent data regardless of source EMR/payer
// This is the "Plaid-style" API that B2B customers will use

/**
 * Helper function to fetch raw FHIR data from a connection
 */
async function fetchConnectionData(connection) {
  const fhirBaseUrl = getFhirBaseUrl(connection.provider);

  const [patientRes, medsRes, conditionsRes, labsRes, encountersRes] = await Promise.allSettled([
    axios.get(`${fhirBaseUrl}/Patient/${connection.patient_id}`, {
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/MedicationRequest`, {
      params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/Condition`, {
      params: { patient: connection.patient_id, _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/Observation`, {
      params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/Encounter`, {
      params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    })
  ]);

  return {
    patient: patientRes.status === 'fulfilled' ? patientRes.value.data : null,
    medications: medsRes.status === 'fulfilled' ? (medsRes.value.data.entry || []).map(e => e.resource) : [],
    conditions: conditionsRes.status === 'fulfilled' ? (conditionsRes.value.data.entry || []).map(e => e.resource) : [],
    observations: labsRes.status === 'fulfilled' ? (labsRes.value.data.entry || []).map(e => e.resource) : [],
    encounters: encountersRes.status === 'fulfilled' ? (encountersRes.value.data.entry || []).map(e => e.resource) : []
  };
}

// Route: Get all normalized health data (unified across all connections)
// Supports both session auth (web) and API key auth (B2B)
app.get('/api/v1/health-records', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const includeRaw = req.query.include_raw === 'true';

    if (!connections || connections.length === 0) {
      return res.json({
        data: { patient: null, labs: [], medications: [], conditions: [], encounters: [] },
        meta: { sources: [], normalizedAt: new Date().toISOString(), version: '1.0.0' }
      });
    }

    logger.info('Fetching normalized health data v1', { connectionCount: connections.length });

    // Fetch and normalize data from all connections
    const allData = {
      patients: [],
      labs: [],
      medications: [],
      conditions: [],
      encounters: []
    };

    for (const connection of connections) {
      try {
        const rawData = await fetchConnectionData(connection);
        const provider = connection.provider;

        // Normalize and aggregate
        if (rawData.patient) {
          const normalized = normalizePatient(rawData.patient, provider);
          if (!includeRaw) delete normalized._raw;
          allData.patients.push(normalized);
        }

        const normalizedLabs = normalizeLabs(rawData.observations, provider);
        const normalizedMeds = normalizeMedications(rawData.medications, provider);
        const normalizedConditions = normalizeConditions(rawData.conditions, provider);
        const normalizedEncounters = normalizeEncounters(rawData.encounters, provider);

        // Remove raw data if not requested
        if (!includeRaw) {
          normalizedLabs.forEach(l => delete l._raw);
          normalizedMeds.forEach(m => delete m._raw);
          normalizedConditions.forEach(c => delete c._raw);
          normalizedEncounters.forEach(e => delete e._raw);
        }

        allData.labs.push(...normalizedLabs);
        allData.medications.push(...normalizedMeds);
        allData.conditions.push(...normalizedConditions);
        allData.encounters.push(...normalizedEncounters);
      } catch (err) {
        logger.error('Error fetching connection data', { connectionId: connection.id, error: err.message });
      }
    }

    // Sort by date (most recent first)
    allData.labs.sort((a, b) => new Date(b.date) - new Date(a.date));
    allData.medications.sort((a, b) => new Date(b.prescribedDate) - new Date(a.prescribedDate));
    allData.encounters.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    res.json({
      data: {
        patient: allData.patients[0] || null, // Primary patient
        patients: allData.patients, // All patient records (for multi-source)
        labs: allData.labs,
        medications: allData.medications,
        conditions: allData.conditions,
        encounters: allData.encounters
      },
      meta: {
        sources: connections.map(c => ({
          id: c.id,
          provider: c.provider,
          displayName: getProviderDisplayName(c.provider),
          lastSynced: c.last_synced
        })),
        counts: {
          labs: allData.labs.length,
          medications: allData.medications.length,
          conditions: allData.conditions.length,
          encounters: allData.encounters.length
        },
        normalizedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    logger.error('Error in normalized health records v1', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch normalized health records', details: error.message });
  }
});

// Route: Get normalized patient data only
app.get('/api/v1/patient', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const includeRaw = req.query.include_raw === 'true';

    if (!connections || connections.length === 0) {
      return res.json({ data: null, meta: { sources: [] } });
    }

    const patients = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Patient/${connection.patient_id}`, {
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const normalized = normalizePatient(response.data, connection.provider);
        if (!includeRaw) delete normalized._raw;
        patients.push(normalized);
      } catch (err) {
        logger.error('Error fetching patient', { connectionId: connection.id, error: err.message });
      }
    }

    res.json({
      data: patients[0] || null,
      all: patients,
      meta: { sources: connections.map(c => c.provider), normalizedAt: new Date().toISOString() }
    });
  } catch (error) {
    logger.error('Error in v1/patient', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch patient data', details: error.message });
  }
});

// Route: Get normalized labs only
// Query params:
//   - deduplicate: 'true' (default) or 'false' - merge duplicates from multiple sources
//   - include_originals: 'true' or 'false' (default) - include original records in response
//   - limit: number (default 100)
app.get('/api/v1/labs', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false'; // default true
    const includeOriginals = req.query.include_originals === 'true';
    const limit = parseInt(req.query.limit) || 100;

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allLabs = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Observation`, {
          params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: limit },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const observations = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeLabs(observations, connection.provider);
        allLabs.push(...normalized);
      } catch (err) {
        logger.error('Error fetching labs', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      // Deduplicate and return merged structure
      const deduped = deduplicateLabs(allLabs);
      // Sort by merged date descending
      deduped.sort((a, b) => new Date(b.merged.date) - new Date(a.merged.date));

      responseData = deduped.slice(0, limit).map(item => {
        const result = {
          ...item.merged,
          sources: item.sources,
          sourceCount: item.sources.length
        };
        if (includeOriginals) {
          result.originals = item.originals;
        }
        return result;
      });
    } else {
      // No deduplication - sort and return directly
      allLabs.sort((a, b) => new Date(b.date) - new Date(a.date));
      responseData = allLabs.slice(0, limit);
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allLabs.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/labs', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch labs', details: error.message });
  }
});

// Route: Get normalized medications only
// Query params:
//   - deduplicate: 'true' (default) or 'false' - merge duplicates from multiple sources
//   - include_originals: 'true' or 'false' (default) - include original records in response
//   - status: filter by medication status ('active', 'completed', etc.)
app.get('/api/v1/medications', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false'; // default true
    const includeOriginals = req.query.include_originals === 'true';
    const status = req.query.status; // 'active', 'completed', etc.

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allMeds = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/MedicationRequest`, {
          params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const medications = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeMedications(medications, connection.provider);
        allMeds.push(...normalized);
      } catch (err) {
        logger.error('Error fetching medications', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      // Deduplicate and return merged structure
      const deduped = deduplicateMedications(allMeds);
      // Sort by merged date descending
      deduped.sort((a, b) => new Date(b.merged.prescribedDate) - new Date(a.merged.prescribedDate));

      responseData = deduped.map(item => {
        const result = {
          ...item.merged,
          sources: item.sources,
          sourceCount: item.sources.length
        };
        if (includeOriginals) {
          result.originals = item.originals;
        }
        return result;
      });

      // Filter by status after dedup (using merged status)
      if (status) {
        responseData = responseData.filter(m => m.status === status);
      }
    } else {
      // No deduplication - filter and sort
      let filteredMeds = allMeds;
      if (status) {
        filteredMeds = allMeds.filter(m => m.status === status);
      }
      filteredMeds.sort((a, b) => new Date(b.prescribedDate) - new Date(a.prescribedDate));
      responseData = filteredMeds;
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allMeds.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/medications', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch medications', details: error.message });
  }
});

// Route: Get normalized conditions only
// Query params:
//   - deduplicate: 'true' (default) or 'false' - merge duplicates from multiple sources
//   - include_originals: 'true' or 'false' (default) - include original records in response
//   - status: filter by clinical status ('active', 'inactive', 'resolved')
app.get('/api/v1/conditions', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false'; // default true
    const includeOriginals = req.query.include_originals === 'true';
    const status = req.query.status; // 'active', 'inactive', 'resolved'

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allConditions = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Condition`, {
          params: { patient: connection.patient_id, _count: 100 },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const conditions = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeConditions(conditions, connection.provider);
        allConditions.push(...normalized);
      } catch (err) {
        logger.error('Error fetching conditions', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      // Deduplicate and return merged structure
      const deduped = deduplicateConditions(allConditions);

      responseData = deduped.map(item => {
        const result = {
          ...item.merged,
          sources: item.sources,
          sourceCount: item.sources.length
        };
        if (includeOriginals) {
          result.originals = item.originals;
        }
        return result;
      });

      // Filter by status after dedup (using merged clinicalStatus)
      if (status) {
        responseData = responseData.filter(c => c.clinicalStatus === status);
      }
    } else {
      // No deduplication - filter directly
      let filteredConditions = allConditions;
      if (status) {
        filteredConditions = allConditions.filter(c => c.clinicalStatus === status);
      }
      responseData = filteredConditions;
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allConditions.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/conditions', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch conditions', details: error.message });
  }
});

// Route: Get normalized encounters only
// Query params:
//   - deduplicate: 'true' (default) or 'false' - merge duplicates from multiple sources
//   - include_originals: 'true' or 'false' (default) - include original records in response
//   - limit: number (default 50)
app.get('/api/v1/encounters', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false'; // default true
    const includeOriginals = req.query.include_originals === 'true';
    const limit = parseInt(req.query.limit) || 50;

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allEncounters = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Encounter`, {
          params: { patient: connection.patient_id, _sort: '-date', _count: limit },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const encounters = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeEncounters(encounters, connection.provider);
        allEncounters.push(...normalized);
      } catch (err) {
        logger.error('Error fetching encounters', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      // Deduplicate and return merged structure
      const deduped = deduplicateEncounters(allEncounters);
      // Sort by merged date descending
      deduped.sort((a, b) => new Date(b.merged.startDate) - new Date(a.merged.startDate));

      responseData = deduped.slice(0, limit).map(item => {
        const result = {
          ...item.merged,
          sources: item.sources,
          sourceCount: item.sources.length
        };
        if (includeOriginals) {
          result.originals = item.originals;
        }
        return result;
      });
    } else {
      // No deduplication - sort and return directly
      allEncounters.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      responseData = allEncounters.slice(0, limit);
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allEncounters.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/encounters', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch encounters', details: error.message });
  }
});

// Route: Get data from a specific connection (normalized)
app.get('/api/v1/connection/:connectionId', authenticate(['read']), async (req, res) => {
  try {
    const { connectionId } = req.params;
    const includeRaw = req.query.include_raw === 'true';

    const connection = await epicDb.getConnectionById(connectionId, req.user.id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const rawData = await fetchConnectionData(connection);
    const provider = connection.provider;

    const patient = rawData.patient ? normalizePatient(rawData.patient, provider) : null;
    const labs = normalizeLabs(rawData.observations, provider);
    const medications = normalizeMedications(rawData.medications, provider);
    const conditions = normalizeConditions(rawData.conditions, provider);
    const encounters = normalizeEncounters(rawData.encounters, provider);

    if (!includeRaw) {
      if (patient) delete patient._raw;
      labs.forEach(l => delete l._raw);
      medications.forEach(m => delete m._raw);
      conditions.forEach(c => delete c._raw);
      encounters.forEach(e => delete e._raw);
    }

    res.json({
      data: { patient, labs, medications, conditions, encounters },
      meta: {
        connectionId: connection.id,
        provider: connection.provider,
        displayName: getProviderDisplayName(connection.provider),
        lastSynced: connection.last_synced,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/connection/:id', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch connection data', details: error.message });
  }
});

// ==================== API KEY MANAGEMENT ====================
// Endpoints for creating and managing API keys (B2B authentication)

// Route: List all API keys for current user
app.get('/api/keys', requireLogin, async (req, res) => {
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

// Route: Create a new API key
app.post('/api/keys', requireLogin, async (req, res) => {
  try {
    const { name, scopes = ['read'] } = req.body;

    if (!name || typeof name !== 'string' || name.length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Validate scopes
    const validScopes = ['read', 'write', 'admin'];
    const requestedScopes = Array.isArray(scopes) ? scopes : [scopes];
    const invalidScopes = requestedScopes.filter(s => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        error: `Invalid scopes: ${invalidScopes.join(', ')}`,
        validScopes
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

// Route: Update an API key (name or scopes)
app.patch('/api/keys/:keyId', requireLogin, async (req, res) => {
  try {
    const { keyId } = req.params;
    const { name, scopes } = req.body;

    if (!name && !scopes) {
      return res.status(400).json({ error: 'Nothing to update. Provide name or scopes.' });
    }

    // Validate scopes if provided
    if (scopes) {
      const validScopes = ['read', 'write', 'admin'];
      const requestedScopes = Array.isArray(scopes) ? scopes : [scopes];
      const invalidScopes = requestedScopes.filter(s => !validScopes.includes(s));
      if (invalidScopes.length > 0) {
        return res.status(400).json({
          error: `Invalid scopes: ${invalidScopes.join(', ')}`,
          validScopes
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

// Route: Revoke an API key (soft delete - keeps audit trail)
app.post('/api/keys/:keyId/revoke', requireLogin, async (req, res) => {
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

// Route: Delete an API key permanently
app.delete('/api/keys/:keyId', requireLogin, async (req, res) => {
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

// ==================== WEBHOOK MANAGEMENT ====================
// Endpoints for creating and managing webhooks (real-time notifications)

// Route: List all webhooks for current user
app.get('/api/webhooks', requireLogin, async (req, res) => {
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

// Route: Get available event types
app.get('/api/webhooks/events', requireLogin, (req, res) => {
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

// Route: Create a new webhook
app.post('/api/webhooks', requireLogin, async (req, res) => {
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

// Route: Update a webhook
app.patch('/api/webhooks/:webhookId', requireLogin, async (req, res) => {
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

// Route: Delete a webhook
app.delete('/api/webhooks/:webhookId', requireLogin, async (req, res) => {
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

// Route: Regenerate webhook secret
app.post('/api/webhooks/:webhookId/regenerate-secret', requireLogin, async (req, res) => {
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

// Route: Send test webhook
app.post('/api/webhooks/:webhookId/test', requireLogin, async (req, res) => {
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

// Route: Get webhook delivery history
app.get('/api/webhooks/:webhookId/deliveries', requireLogin, async (req, res) => {
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

// ==================== CONNECT WIDGET API ====================
// Embeddable widget for patient health data authorization (like Plaid Link)

// Widget sessions storage (for tracking OAuth state back to widget)
const widgetSessions = {};

/**
 * Route: Create widget token
 * POST /api/v1/widget/token
 * Creates a token for initializing the Connect Widget
 */
app.post('/api/v1/widget/token', rateLimit('widget'), authenticate(['write']), async (req, res) => {
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

/**
 * Route: List available providers
 * GET /api/v1/widget/providers
 * Returns list of available health data providers
 */
app.get('/api/v1/widget/providers', (req, res) => {
  // Build provider list from PROVIDER_CONFIG
  const providers = Object.entries(PROVIDER_CONFIG).map(([key, config]) => ({
    id: key,
    name: config.displayName,
    type: getProviderType(key),
    logo: `/images/providers/${key}.png`,
    available: isProviderConfigured(key)
  }));

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

/**
 * Determine provider type
 */
function getProviderType(provider) {
  const emrProviders = ['epic', 'cerner', 'smart', 'meditech', 'healow', 'nextgen', 'athena'];
  const payerProviders = ['humana', 'aetna', 'anthem', 'cigna', 'uhc', 'bcbsmn', 'bcbsma', 'hcsc', 'bcbstn', 'centene', 'molina', 'bluebutton'];
  const labProviders = ['quest', 'labcorp'];

  if (emrProviders.includes(provider)) return 'emr';
  if (payerProviders.includes(provider)) return 'payer';
  if (labProviders.includes(provider)) return 'lab';
  return 'other';
}

/**
 * Check if provider is configured (has required env vars)
 */
function isProviderConfigured(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return false;

  const clientId = config.clientId ? config.clientId() : null;
  const authUrl = config.authUrl ? config.authUrl() : null;

  return !!(clientId && authUrl);
}

/**
 * Route: Initiate OAuth via Widget
 * GET /api/v1/widget/initiate/:provider
 * Starts OAuth flow for a specific provider from the widget
 */
app.get('/api/v1/widget/initiate/:provider', rateLimit('oauth'), async (req, res) => {
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

    // Add PKCE if provider requires it
    if (config.usesPKCE) {
      const pkce = generatePKCE();
      stateData.cv = pkce.codeVerifier;
    }

    const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

    // Store widget session
    widgetSessions[state] = {
      ...stateData,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_EXPIRATION_MS
    };

    // Build authorization URL
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', config.scope);
    authUrl.searchParams.append('state', state);

    if (config.usesPKCE) {
      const pkce = generatePKCE();
      stateData.cv = pkce.codeVerifier;
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

/**
 * Route: Exchange public token
 * POST /api/v1/widget/exchange
 * Exchanges a public token for permanent access credentials
 */
app.post('/api/v1/widget/exchange', authenticate(['write']), async (req, res) => {
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

/**
 * Route: Get widget sessions (for debugging)
 * GET /api/v1/widget/sessions
 */
app.get('/api/v1/widget/sessions', authenticate(['read']), async (req, res) => {
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

// ==================== CHART API ENDPOINTS ====================
// These endpoints provide pre-processed data optimized for Chart.js

// Route: Get lab trends chart data
app.get('/api/charts/lab-trends', requireLogin, async (req, res) => {
  try {
    const { limit = 5, mode = 'top' } = req.query;

    // Get all connections for this user
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ datasets: [], stats: { totalLabs: 0, uniqueTests: 0 } });
    }

    // Fetch all lab data from all connections
    const labResults = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const response = await axios.get(
            `${fhirBaseUrl}/Observation`,
            {
              params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Accept': 'application/fhir+json'
              }
            }
          );

          // Add source info to each lab
          return response.data.entry?.map(e => ({
            ...e.resource,
            _source: { source: getProviderDisplayName(connection.provider), connectionId: connection.id }
          })) || [];
        } catch (error) {
          logger.error('Error fetching labs for connection', { connectionId: connection.id, error: error.message });
          return [];
        }
      })
    );

    // Flatten all labs
    const allLabs = labResults
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Process data for charts
    const chartData = processLabTrendsData(allLabs, { limit: parseInt(limit), mode });

    res.json(chartData);
  } catch (error) {
    logger.error('Error in lab trends chart', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate lab trends', details: error.message });
  }
});

// Route: Get medication timeline chart data
app.get('/api/charts/medication-timeline', requireLogin, async (req, res) => {
  try {
    // Get all connections for this user
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ labels: [], datasets: [], stats: { totalMedications: 0 } });
    }

    // Fetch all medication data from all connections
    const medResults = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const response = await axios.get(
            `${fhirBaseUrl}/MedicationRequest`,
            {
              params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Accept': 'application/fhir+json'
              }
            }
          );

          return response.data.entry?.map(e => e.resource) || [];
        } catch (error) {
          logger.error('Error fetching medications for connection', { connectionId: connection.id, error: error.message });
          return [];
        }
      })
    );

    // Flatten all medications
    const allMedications = medResults
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Process data for timeline chart
    const chartData = processMedicationTimelineData(allMedications);

    res.json(chartData);
  } catch (error) {
    logger.error('Error in medication timeline chart', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate medication timeline', details: error.message });
  }
});

// Route: Get health timeline data
app.get('/api/charts/health-timeline', requireLogin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // Get all connections for this user
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ events: [], stats: { totalEvents: 0 } });
    }

    // Fetch all health data from all connections
    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const [medsRes, conditionsRes, encountersRes] = await Promise.allSettled([
            axios.get(
              `${fhirBaseUrl}/MedicationRequest`,
              {
                params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            axios.get(
              `${fhirBaseUrl}/Condition`,
              {
                params: { patient: connection.patient_id, _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            axios.get(
              `${fhirBaseUrl}/Encounter`,
              {
                params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            )
          ]);

          const sourceInfo = { source: getProviderDisplayName(connection.provider), connectionId: connection.id };

          return {
            medications: medsRes.status === 'fulfilled' ?
              (medsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            conditions: conditionsRes.status === 'fulfilled' ?
              (conditionsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            encounters: encountersRes.status === 'fulfilled' ?
              (encountersRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : []
          };
        } catch (error) {
          logger.error('Error fetching timeline data for connection', { connectionId: connection.id, error: error.message });
          return { medications: [], conditions: [], encounters: [] };
        }
      })
    );

    // Flatten all data
    const allMedications = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.medications);
    const allConditions = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.conditions);
    const allEncounters = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.encounters);

    // Process data for timeline
    const timelineData = processHealthTimelineData(
      allMedications,
      allConditions,
      allEncounters,
      { limit: parseInt(limit) }
    );

    res.json(timelineData);
  } catch (error) {
    logger.error('Error in health timeline', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate health timeline', details: error.message });
  }
});

// Route: Get condition statistics
app.get('/api/charts/condition-stats', requireLogin, async (req, res) => {
  try {
    // Get all connections for this user
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ activeCount: 0, inactiveCount: 0, topConditions: [] });
    }

    // Fetch all condition data from all connections
    const conditionResults = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const response = await axios.get(
            `${fhirBaseUrl}/Condition`,
            {
              params: { patient: connection.patient_id, _count: 100 },
              headers: {
                'Authorization': `Bearer ${connection.access_token}`,
                'Accept': 'application/fhir+json'
              }
            }
          );

          return response.data.entry?.map(e => e.resource) || [];
        } catch (error) {
          logger.error('Error fetching conditions for connection', { connectionId: connection.id, error: error.message });
          return [];
        }
      })
    );

    // Flatten all conditions
    const allConditions = conditionResults
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Process data for statistics
    const stats = processConditionStats(allConditions);

    res.json(stats);
  } catch (error) {
    logger.error('Error in condition stats', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate condition statistics', details: error.message });
  }
});

// Route: Get overview statistics across all health data
app.get('/api/charts/overview', requireLogin, async (req, res) => {
  try {
    // Get all connections for this user
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({
        medications: { total: 0, active: 0 },
        conditions: { total: 0, active: 0 },
        labs: { total: 0 },
        encounters: { total: 0 },
        sources: []
      });
    }

    // Fetch data from all connections (reuse unified health records logic)
    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const [medsRes, conditionsRes, labsRes, encountersRes] = await Promise.allSettled([
            axios.get(
              `${fhirBaseUrl}/MedicationRequest`,
              {
                params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            axios.get(
              `${fhirBaseUrl}/Condition`,
              {
                params: { patient: connection.patient_id, _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            axios.get(
              `${fhirBaseUrl}/Observation`,
              {
                params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            ),
            axios.get(
              `${fhirBaseUrl}/Encounter`,
              {
                params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
                headers: {
                  'Authorization': `Bearer ${connection.access_token}`,
                  'Accept': 'application/fhir+json'
                }
              }
            )
          ]);

          const sourceInfo = { source: getProviderDisplayName(connection.provider), connectionId: connection.id };

          return {
            medications: medsRes.status === 'fulfilled' ?
              (medsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            conditions: conditionsRes.status === 'fulfilled' ?
              (conditionsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            labs: labsRes.status === 'fulfilled' ?
              (labsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            encounters: encountersRes.status === 'fulfilled' ?
              (encountersRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : []
          };
        } catch (error) {
          logger.error('Error fetching overview data for connection', { connectionId: connection.id, error: error.message });
          return { medications: [], conditions: [], labs: [], encounters: [] };
        }
      })
    );

    // Flatten all data
    const aggregated = {
      medications: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.medications),
      conditions: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.conditions),
      labs: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.labs),
      encounters: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.encounters)
    };

    // Apply deduplication if multiple connections
    let deduplicated = null;
    if (connections.length > 1) {
      deduplicated = {
        medications: deduplicateMedications(aggregated.medications),
        conditions: deduplicateConditions(aggregated.conditions),
        labs: deduplicateLabs(aggregated.labs),
        encounters: deduplicateEncounters(aggregated.encounters)
      };
    }

    // Generate overview statistics
    const overview = processOverviewStats(aggregated, deduplicated);

    res.json(overview);
  } catch (error) {
    logger.error('Error in overview stats', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate overview statistics', details: error.message });
  }
});

// ==================== END CHART API ENDPOINTS ====================

// Route: Get patient data for a specific connection
app.get('/api/connection/:connectionId/patient', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    logger.info('Fetching patient data', { provider: connection.provider, patientId: connection.patient_id });

    const response = await fetchFhirResource(connection, `Patient/${connection.patient_id}`);

    await auditDb.log(req.user.id, 'data_access', 'patient', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Patient)', {
      provider: connection?.provider,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch patient data',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get medications for a specific connection
app.get('/api/connection/:connectionId/medications', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'MedicationRequest', {
      patient: connection.patient_id,
      _sort: '-authoredon',
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'medications', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Medications)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch medications',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get conditions for a specific connection
app.get('/api/connection/:connectionId/conditions', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'Condition', {
      patient: connection.patient_id,
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'conditions', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Conditions)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch conditions',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get lab results (observations) for a specific connection
app.get('/api/connection/:connectionId/labs', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'Observation', {
      patient: connection.patient_id,
      category: 'laboratory',
      _sort: '-date',
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'labs', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Labs)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch lab results',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get encounters for a specific connection
app.get('/api/connection/:connectionId/encounters', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'Encounter', {
      patient: connection.patient_id,
      _sort: '-date',
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'encounters', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Encounters)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch encounters',
      details: error.response?.data || error.message
    });
  }
});

// Dynamically register OAuth routes for all providers
// This eliminates the need for 17+ individual route definitions
Object.keys(PROVIDER_CONFIG).forEach(provider => {
  // Temporarily remove requireLogin for MEDITECH testing
  if (provider === 'meditech') {
    app.get(`/auth/${provider}`, (req, res) => initiateOAuth(provider, req, res));
  } else {
    app.get(`/auth/${provider}`, requireLogin, (req, res) => initiateOAuth(provider, req, res));
  }
});

// Route: Test MEDITECH OAuth directly (no login required - TESTING ONLY)
app.get('/test-meditech-direct', (req, res) => {
  const config = getOAuthConfig('meditech');
  
  if (!config || !config.clientId) {
    return res.status(500).send('Missing MEDITECH configuration');
  }

  // Generate state parameter
  const randomId = crypto.randomBytes(16).toString('hex');
  const stateData = { id: randomId, provider: 'meditech' };

  // Add PKCE (enabled for testing)
  const pkce = generatePKCE();
  const codeVerifier = pkce.codeVerifier;
  const codeChallenge = pkce.codeChallenge;
  stateData.cv = codeVerifier;

  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  // Build authorization URL with PKCE
  const authUrl = new URL(config.authUrl);
  authUrl.searchParams.append('client_id', config.clientId);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', config.scope);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  const finalUrl = authUrl.toString();
  console.log('\n=== MEDITECH DIRECT TEST (WITH PKCE) ===');
  console.log('URL:', finalUrl);
  console.log('=====================================\n');

  res.redirect(finalUrl);
});

// Route: Initiate Epic OAuth flow (demo mode - no login required)
app.get('/auth/epic-demo', (req, res) => {
  // Check if required env vars exist
  if (!process.env.EPIC_CLIENT_ID) {
    return res.status(500).send('Missing EPIC_CLIENT_ID environment variable');
  }
  if (!process.env.REDIRECT_URI) {
    return res.status(500).send('Missing REDIRECT_URI environment variable');
  }

  const { codeVerifier, codeChallenge } = generatePKCE();

  // Encode the code verifier AND provider in the state parameter
  // This allows stateless OAuth flow without requiring session storage during authorization
  const randomId = crypto.randomBytes(16).toString('hex'); // Increased to 16 bytes for better security
  const stateData = JSON.stringify({ id: randomId, cv: codeVerifier, provider: 'epic' });
  const state = Buffer.from(stateData).toString('base64url');

  // Build authorization URL
  const authUrl = new URL(process.env.EPIC_AUTHORIZATION_URL);
  authUrl.searchParams.append('client_id', process.env.EPIC_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'patient/*.read launch/patient');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('aud', process.env.EPIC_FHIR_BASE_URL);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  logger.info('Demo OAuth initiated successfully', { redirectUri: process.env.REDIRECT_URI });

  res.redirect(authUrl.toString());
});

// Route: OAuth callback (handles all providers dynamically)
app.get('/callback', async (req, res) => {
  // Log all query parameters for debugging
  logger.debug('Callback received', {
    hasCode: !!req.query.code,
    hasState: !!req.query.state,
    hasError: !!req.query.error
  });

  const { code, state, error } = req.query;

  if (error) {
    logger.error('EHR authorization error', { error });
    return res.status(400).send(`Authorization error: ${error}`);
  }

  if (!code || !state) {
    logger.error('Missing required parameters', { hasCode: !!code, hasState: !!state });
    return res.status(400).send('Missing code or state parameter');
  }

  // Decode the state parameter to get the code verifier, provider, and widget context
  let codeVerifier;
  let provider = 'epic'; // Default to epic for backward compatibility
  let isWidgetFlow = false;
  let widgetData = null;
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
    codeVerifier = stateData.cv;
    provider = stateData.provider || 'epic'; // Use provider from state if available

    // Check if this is a widget-initiated OAuth flow
    if (stateData.widget) {
      isWidgetFlow = true;
      widgetData = {
        widgetToken: stateData.widgetToken,
        widgetTokenId: stateData.widgetTokenId,
        apiUserId: stateData.apiUserId
      };
      logger.info('Widget OAuth callback', { provider, widgetTokenId: widgetData.widgetTokenId });
    }

    // MEDITECH, Humana, Aetna, BCBS MN, BCBS MA, BCBS TN, NextGen, and Molina don't use PKCE, so code verifier is optional
    if (!codeVerifier && provider !== 'meditech' && provider !== 'humana' && provider !== 'aetna' && provider !== 'bcbsmn' && provider !== 'bcbsma' && provider !== 'bcbstn' && provider !== 'nextgen' && provider !== 'molina') {
      throw new Error('Code verifier not found in state');
    }

    logger.info('OAuth callback for provider', { provider, isWidgetFlow });
  } catch (err) {
    logger.error('Failed to decode state', { error: err.message });
    return res.status(400).send('Invalid state parameter. Please try connecting again.');
  }

  // Use centralized config for provider metadata
  const oauthConfig = getOAuthConfig(provider);
  const tokenUrl = getTokenUrl(provider);
  const clientId = oauthConfig.clientId;
  const fhirBaseUrl = getFhirBaseUrl(provider);

  try {
    logger.info('Exchanging authorization code for access token', { provider });

    // Prepare token exchange request based on auth method
    const tokenRequestConfig = oauthConfig.usesPKCE
      ? createPKCETokenRequest(tokenUrl, code, clientId, codeVerifier, oauthConfig.clientSecret)
      : createBasicAuthTokenRequest(tokenUrl, code, clientId, oauthConfig.clientSecret);

    // MEDITECH: Simplified Confidential Client configuration (No PKCE)
    // MEDITECH support confirmed: "Confidential clients (e.g., backend servers) are not required to use PKCE"
    // We're a backend server with secure client_secret storage - PKCE is optional
    if (provider === 'meditech') {
      logger.info('MEDITECH: Starting token exchange with Confidential Client configuration (no PKCE)');

      // MEDITECH uses standard "Confidential Client" authentication
      // This means: client_id + client_secret in request body (no PKCE parameters)
      const tokenData = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
        client_id: clientId,
        client_secret: oauthConfig.clientSecret  // Confidential client secret only
      });

      logger.info('MEDITECH: Token request parameters', {
        hasCode: !!code,
        hasRedirectUri: !!process.env.REDIRECT_URI,
        hasClientId: !!clientId,
        hasClientSecret: !!oauthConfig.clientSecret
      });

      try {
        const tokenResponse = await axios.post(tokenUrl, tokenData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        // Log full response to understand MEDITECH's token structure
        logger.info('MEDITECH: Full token response', {
          responseData: JSON.stringify(tokenResponse.data),
          hasPatient: !!tokenResponse.data.patient,
          hasInfo: !!tokenResponse.data.info,
          patientValue: tokenResponse.data.patient,
          infoValue: JSON.stringify(tokenResponse.data.info)
        });

        const { access_token, patient, expires_in, refresh_token, info } = tokenResponse.data;

        // MEDITECH Greenfield sandbox uses test patient data
        // The test patient is Sarai Mccall (from documentation page 5)
        let patientId;

        if (patient) {
          // Standard FHIR patient ID in token response
          patientId = patient;
          logger.info('MEDITECH: Using patient ID from token response', { patientId });
        } else {
          // MEDITECH Greenfield: Use the documented test patient
          // Test Patient: Sarai Mccall, DOB: 08/14/1959
          // Patient ID: 0218f2d0-968b-5888-976f-68a554670f6e
          patientId = '0218f2d0-968b-5888-976f-68a554670f6e';
          logger.info('MEDITECH: Using Greenfield test patient (Sarai Mccall)', { patientId });
        }

        logger.info('MEDITECH: Access token received successfully', { patientId, provider, isWidgetFlow });

        // Store tokens and redirect
        const expiresAt = new Date(Date.now() + (expires_in * 1000));

        // Handle widget-initiated OAuth flow for MEDITECH
        if (isWidgetFlow && widgetData) {
          const connection = await epicDb.upsertConnection(
            widgetData.apiUserId,
            provider,
            patientId,
            access_token,
            refresh_token,
            expiresAt
          );

          await widgetDb.markUsed(widgetData.widgetToken, connection.id);

          const publicTokenData = await widgetDb.createPublicToken(
            widgetData.widgetTokenId,
            connection.id,
            provider
          );

          await auditDb.log(
            widgetData.apiUserId,
            'widget_connect',
            'ehr_connection',
            connection.id.toString(),
            req.ip,
            req.get('user-agent')
          );

          logger.info('MEDITECH Widget OAuth completed', {
            connectionId: connection.id,
            publicToken: publicTokenData.token.substring(0, 10) + '...',
            provider
          });

          res.redirect(`/connect-widget-result.html?public_token=${publicTokenData.token}&provider=${provider}`);
          return;
        }

        // Normal (non-widget) MEDITECH flow
        const connection = await epicDb.upsertConnection(
          req.user.id,
          provider,
          patientId,
          access_token,
          refresh_token,
          expiresAt
        );

        await auditDb.log(
          req.user.id,
          'provider_connected',
          'ehr_connection',
          connection.id.toString(),
          req.ip,
          req.get('user-agent')
        );

        res.redirect('/my-dashboard.html?success=true');
        return;
      } catch (error) {
        logger.error('MEDITECH: Token exchange failed', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.response?.data,
          message: error.message
        });
        throw error;  // Let the main error handler deal with it
      }
    }

    // Normal flow for all other providers
    const tokenResponse = await axios.post(
      tokenRequestConfig.url,
      tokenRequestConfig.data,
      {
        headers: tokenRequestConfig.headers
      }
    );

    const { access_token, patient, expires_in, refresh_token } = tokenResponse.data;

    logger.info('Access token received successfully', { patient, provider, isWidgetFlow });

    // Handle widget-initiated OAuth flow
    if (isWidgetFlow && widgetData) {
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Create connection using the API user's ID (developer account)
      const connection = await epicDb.upsertConnection(
        widgetData.apiUserId,
        provider,
        patient,
        access_token,
        refresh_token,
        expiresAt
      );

      // Mark widget token as used
      await widgetDb.markUsed(widgetData.widgetToken, connection.id);

      // Create public token for exchange
      const publicTokenData = await widgetDb.createPublicToken(
        widgetData.widgetTokenId,
        connection.id,
        provider
      );

      // Log audit
      await auditDb.log(
        widgetData.apiUserId,
        'widget_connect',
        'ehr_connection',
        connection.id.toString(),
        req.ip,
        req.get('user-agent')
      );

      logger.info('Widget OAuth completed', {
        connectionId: connection.id,
        publicToken: publicTokenData.token.substring(0, 10) + '...',
        provider
      });

      // Redirect to widget result page with public token
      res.redirect(`/connect-widget-result.html?public_token=${publicTokenData.token}&provider=${provider}`);
      return;
    }

    // Store EHR connection in database (requires user to be logged in)
    if (req.user) {
      const expiresAt = new Date(Date.now() + (expires_in * 1000));
      // Run database operations in parallel for better performance
      await Promise.all([
        epicDb.upsertConnection(
          req.user.id,
          provider,  // provider (epic or smart)
          patient,
          access_token,
          refresh_token,
          expiresAt
        ),
        auditDb.log(req.user.id, 'ehr_connect', 'ehr_connection', patient, req.ip, req.get('user-agent'))
      ]);
      res.redirect('/my-dashboard.html');
    } else {
      // Fallback for demo mode (no user login required)
      authSessions[state] = {
        accessToken: access_token,
        patientId: patient,
        expiresAt: Date.now() + (expires_in * 1000),
        provider: provider,
        createdAt: Date.now() // For emergency cleanup tracking
      };
      if (refresh_token) {
        authSessions[state].refreshToken = refresh_token;
      }
      res.redirect(`/dashboard.html?state=${state}`);
    }

  } catch (error) {
    logger.error('Token exchange error', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    res.status(500).send(`Authentication failed: ${error.response?.data?.error || error.message}`);
  }
});

/**
 * Middleware: Check authentication for demo mode
 * Validates demo OAuth session using state parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void|Response} - Returns 401 if not authenticated, otherwise calls next()
 */
function requireAuth(req, res, next) {
  const { state } = req.query;

  if (!state) {
    return res.status(401).json({ error: 'Missing authentication state' });
  }

  const session = authSessions[state];

  if (!session || !session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated. Please log in again.' });
  }

  // Check if token expired (strictly enforce expiration)
  if (!session.expiresAt || Date.now() > session.expiresAt) {
    delete authSessions[state]; // Clean up expired session
    return res.status(401).json({ error: 'Access token expired. Please log in again.' });
  }

  req.session = session;
  next();
}

// Route: Get patient demographics
app.get('/api/patient', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.EPIC_FHIR_BASE_URL}/Patient/${req.session.patientId}`,
      {
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`,
          'Accept': 'application/fhir+json'
        }
      }
    );

    logger.debug('Patient data fetched successfully');
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Patient)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch patient data',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get observations (labs, vitals)
app.get('/api/observations', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.EPIC_FHIR_BASE_URL}/Observation`,
      {
        params: {
          patient: req.session.patientId,
          category: 'laboratory',
          _sort: '-date',
          _count: 20
        },
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`,
          'Accept': 'application/fhir+json'
        }
      }
    );

    logger.debug('Fetched observations', { count: response.data.entry?.length || 0 });
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Observations)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch observations',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get medications
app.get('/api/medications', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.EPIC_FHIR_BASE_URL}/MedicationRequest`,
      {
        params: {
          patient: req.session.patientId,
          _sort: '-authoredon',
          _count: 20
        },
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`,
          'Accept': 'application/fhir+json'
        }
      }
    );

    logger.debug('Fetched medications', { count: response.data.entry?.length || 0 });
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Medications)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch medications',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get conditions (diagnoses)
app.get('/api/conditions', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.EPIC_FHIR_BASE_URL}/Condition`,
      {
        params: {
          patient: req.session.patientId,
          _count: 20
        },
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`,
          'Accept': 'application/fhir+json'
        }
      }
    );

    logger.debug('Fetched conditions', { count: response.data.entry?.length || 0 });
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Conditions)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch conditions',
      details: error.response?.data || error.message
    });
  }
});

// Route: Get encounters (appointments, visits)
app.get('/api/encounters', requireAuth, async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.EPIC_FHIR_BASE_URL}/Encounter`,
      {
        params: {
          patient: req.session.patientId,
          _sort: '-date',
          _count: 20
        },
        headers: {
          'Authorization': `Bearer ${req.session.accessToken}`,
          'Accept': 'application/fhir+json'
        }
      }
    );

    logger.debug('Fetched encounters', { count: response.data.entry?.length || 0 });
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Encounters)', { error: error.response?.data || error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch encounters',
      details: error.response?.data || error.message
    });
  }
});

// Global error handler (must be last middleware)
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Don't leak error details in production
  const isDevelopment = !process.env.RAILWAY_ENVIRONMENT && process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: 'Internal server error',
    ...(isDevelopment && { message: err.message, stack: err.stack })
  });
});

// Start server (only for local development)
if (require.main === module) {
  const HOST = process.env.RAILWAY_ENVIRONMENT ? '0.0.0.0' : 'localhost';
  app.listen(PORT, HOST, () => {
    logger.info('🏥 FHIR Prototype Server Started', {
      port: PORT,
      host: HOST,
      environment: process.env.RAILWAY_ENVIRONMENT || 'local',
      healthCheck: '/health'
    });

    if (!process.env.RAILWAY_ENVIRONMENT) {
      logger.info('To test Epic integration:', {
        step1: 'Click "Connect Epic MyChart"',
        step2: 'Log in with Epic sandbox credentials',
        username: 'fhirderrick',
        password: 'epicepic1'
      });
    }
  });
}

// Export for other uses
module.exports = app;
