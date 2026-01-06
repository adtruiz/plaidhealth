/**
 * Routes Index
 *
 * Exports all route modules for easy importing in server.js
 */

module.exports = {
  authRoutes: require('./auth'),
  healthRoutes: require('./health'),
  fhirRoutes: require('./fhir'),
  widgetRoutes: require('./widget'),
  webhookRoutes: require('./webhooks'),
  apiKeyRoutes: require('./api-keys'),
  developerRoutes: require('./developer'),
  contactRoutes: require('./contact')
};
