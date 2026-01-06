/**
 * Authentication Routes
 *
 * Handles Google OAuth, provider OAuth initiation, and session management
 */

const express = require('express');
const passport = require('passport');
const { auditDb } = require('../db');
const logger = require('../logger');
const { initiateOAuth } = require('../lib/oauth');
const { getAllProviders, isProviderConfigured } = require('../lib/providers');

const router = express.Router();

// ============== Google OAuth ==============

/**
 * GET /auth/google
 * Initiate Google OAuth flow
 */
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * GET /auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    logger.info('OAuth callback - User authenticated', {
      email: req.user?.email,
      sessionId: req.sessionID,
      authenticated: req.isAuthenticated()
    });

    req.session.save((err) => {
      if (err) {
        logger.error('Session save error', { error: err.message });
        return res.redirect('/login.html');
      }
      logger.debug('Session saved successfully, redirecting to dashboard');
      auditDb.log(req.user.id, 'user_login', null, null, req.ip, req.get('user-agent'));
      res.redirect('/my-dashboard.html');
    });
  }
);

/**
 * GET /auth/logout
 * Log out and destroy session
 */
router.get('/logout', (req, res) => {
  if (req.user) {
    auditDb.log(req.user.id, 'user_logout', null, null, req.ip, req.get('user-agent'));
  }
  req.logout(() => {
    res.redirect('/login.html');
  });
});

// ============== Provider OAuth Initiation ==============

/**
 * GET /auth/:provider
 * Initiate OAuth flow for any configured provider
 */
router.get('/:provider', (req, res, next) => {
  const { provider } = req.params;

  // Skip if it's a known route
  if (['google', 'logout'].includes(provider)) {
    return next();
  }

  // Check if provider exists
  const allProviders = getAllProviders();
  if (!allProviders.includes(provider)) {
    return res.status(404).json({
      error: 'Provider not found',
      availableProviders: allProviders
    });
  }

  // Check if provider is configured
  if (!isProviderConfigured(provider)) {
    return res.status(503).json({
      error: `Provider ${provider} is not configured`,
      message: 'Missing required environment variables'
    });
  }

  // Initiate OAuth
  initiateOAuth(provider, req, res);
});

// ============== Demo Routes (Development Only) ==============

/**
 * GET /auth/epic-demo
 * Demo route for testing Epic OAuth (development only)
 */
router.get('/epic-demo', (req, res) => {
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  initiateOAuth('epic', req, res);
});

module.exports = router;
