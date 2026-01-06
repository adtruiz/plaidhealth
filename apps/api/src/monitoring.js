/**
 * Monitoring & Alerting Module
 *
 * Tracks application metrics, error rates, and sends alerts for critical issues.
 * Designed for healthcare API reliability requirements.
 */

const logger = require('./logger');

// ==================== Metrics Storage ====================

const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byEndpoint: {},
    byStatusCode: {}
  },
  latency: {
    samples: [],
    maxSamples: 1000
  },
  errors: {
    recent: [],
    maxRecent: 100,
    byType: {}
  },
  fhir: {
    requests: 0,
    failures: 0,
    byProvider: {}
  },
  auth: {
    success: 0,
    failures: 0,
    invalidKeys: 0
  },
  startTime: Date.now()
};

// Alert thresholds
const ALERT_THRESHOLDS = {
  errorRatePercent: parseFloat(process.env.ALERT_ERROR_RATE) || 5,      // Alert if >5% error rate
  latencyMs: parseInt(process.env.ALERT_LATENCY_MS) || 5000,            // Alert if avg latency >5s
  consecutiveErrors: parseInt(process.env.ALERT_CONSECUTIVE_ERRORS) || 10,
  fhirFailureRate: parseFloat(process.env.ALERT_FHIR_FAILURE_RATE) || 20  // Alert if >20% FHIR failures
};

// Alert state
const alertState = {
  lastAlertTime: {},
  alertCooldownMs: 5 * 60 * 1000,  // 5 minute cooldown between same alerts
  consecutiveErrors: 0
};

// ==================== Metric Recording ====================

/**
 * Record an HTTP request
 */
function recordRequest(req, res, durationMs) {
  metrics.requests.total++;

  const statusCode = res.statusCode;
  const isError = statusCode >= 400;

  if (isError) {
    metrics.requests.errors++;
    alertState.consecutiveErrors++;
  } else {
    metrics.requests.success++;
    alertState.consecutiveErrors = 0;
  }

  // Track by endpoint
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  metrics.requests.byEndpoint[endpoint] = (metrics.requests.byEndpoint[endpoint] || 0) + 1;

  // Track by status code
  metrics.requests.byStatusCode[statusCode] = (metrics.requests.byStatusCode[statusCode] || 0) + 1;

  // Track latency
  metrics.latency.samples.push(durationMs);
  if (metrics.latency.samples.length > metrics.latency.maxSamples) {
    metrics.latency.samples.shift();
  }

  // Check for alerts
  checkAlerts();
}

/**
 * Record an error
 */
function recordError(error, context = {}) {
  const errorRecord = {
    message: error.message,
    type: error.name || 'Error',
    code: error.code,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  };

  metrics.errors.recent.unshift(errorRecord);
  if (metrics.errors.recent.length > metrics.errors.maxRecent) {
    metrics.errors.recent.pop();
  }

  // Track by type
  const errorType = error.code || error.name || 'Unknown';
  metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;

  // Log the error
  logger.error('Error recorded', {
    error: error.message,
    type: errorType,
    ...context
  });
}

/**
 * Record FHIR API call
 */
function recordFhirCall(provider, success, durationMs = 0) {
  metrics.fhir.requests++;

  if (!success) {
    metrics.fhir.failures++;
  }

  if (!metrics.fhir.byProvider[provider]) {
    metrics.fhir.byProvider[provider] = { requests: 0, failures: 0, totalLatency: 0 };
  }

  metrics.fhir.byProvider[provider].requests++;
  metrics.fhir.byProvider[provider].totalLatency += durationMs;

  if (!success) {
    metrics.fhir.byProvider[provider].failures++;
  }
}

/**
 * Record authentication attempt
 */
function recordAuthAttempt(success, reason = null) {
  if (success) {
    metrics.auth.success++;
  } else {
    metrics.auth.failures++;
    if (reason === 'invalid_key') {
      metrics.auth.invalidKeys++;
    }
  }
}

// ==================== Alert System ====================

/**
 * Check if any alert thresholds are exceeded
 */
function checkAlerts() {
  const now = Date.now();

  // Check error rate
  if (metrics.requests.total >= 100) {
    const errorRate = (metrics.requests.errors / metrics.requests.total) * 100;
    if (errorRate > ALERT_THRESHOLDS.errorRatePercent) {
      sendAlert('high_error_rate', {
        errorRate: errorRate.toFixed(2),
        threshold: ALERT_THRESHOLDS.errorRatePercent,
        totalRequests: metrics.requests.total,
        totalErrors: metrics.requests.errors
      });
    }
  }

  // Check consecutive errors
  if (alertState.consecutiveErrors >= ALERT_THRESHOLDS.consecutiveErrors) {
    sendAlert('consecutive_errors', {
      count: alertState.consecutiveErrors,
      threshold: ALERT_THRESHOLDS.consecutiveErrors,
      recentErrors: metrics.errors.recent.slice(0, 5)
    });
  }

  // Check average latency
  if (metrics.latency.samples.length >= 50) {
    const avgLatency = metrics.latency.samples.reduce((a, b) => a + b, 0) / metrics.latency.samples.length;
    if (avgLatency > ALERT_THRESHOLDS.latencyMs) {
      sendAlert('high_latency', {
        avgLatencyMs: avgLatency.toFixed(0),
        threshold: ALERT_THRESHOLDS.latencyMs,
        sampleCount: metrics.latency.samples.length
      });
    }
  }

  // Check FHIR failure rate
  if (metrics.fhir.requests >= 20) {
    const fhirFailureRate = (metrics.fhir.failures / metrics.fhir.requests) * 100;
    if (fhirFailureRate > ALERT_THRESHOLDS.fhirFailureRate) {
      sendAlert('fhir_failures', {
        failureRate: fhirFailureRate.toFixed(2),
        threshold: ALERT_THRESHOLDS.fhirFailureRate,
        totalRequests: metrics.fhir.requests,
        totalFailures: metrics.fhir.failures
      });
    }
  }
}

/**
 * Send an alert (with cooldown to prevent spam)
 */
function sendAlert(alertType, data) {
  const now = Date.now();
  const lastAlert = alertState.lastAlertTime[alertType] || 0;

  // Check cooldown
  if (now - lastAlert < alertState.alertCooldownMs) {
    return;
  }

  alertState.lastAlertTime[alertType] = now;

  const alert = {
    type: alertType,
    severity: getSeverity(alertType),
    timestamp: new Date().toISOString(),
    data,
    environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || 'development'
  };

  // Log the alert
  logger.warn(`ALERT: ${alertType}`, alert);

  // Send to configured webhook if available
  if (process.env.ALERT_WEBHOOK_URL) {
    sendWebhookAlert(alert).catch(err => {
      logger.error('Failed to send webhook alert', { error: err.message });
    });
  }

  // Send email alert if configured
  if (process.env.ALERT_EMAIL) {
    // Would integrate with email service here
    logger.info('Email alert would be sent', { to: process.env.ALERT_EMAIL, alert });
  }
}

/**
 * Get severity level for alert type
 */
function getSeverity(alertType) {
  const severities = {
    high_error_rate: 'critical',
    consecutive_errors: 'critical',
    high_latency: 'warning',
    fhir_failures: 'warning',
    auth_failures: 'warning'
  };
  return severities[alertType] || 'info';
}

/**
 * Send alert to webhook
 */
async function sendWebhookAlert(alert) {
  const axios = require('axios');

  await axios.post(process.env.ALERT_WEBHOOK_URL, {
    text: `🚨 *${alert.severity.toUpperCase()}*: ${alert.type}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Alert: ${alert.type}` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Environment:* ${alert.environment}\n*Time:* ${alert.timestamp}` }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '```' + JSON.stringify(alert.data, null, 2) + '```' }
      }
    ]
  }, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 5000
  });
}

// ==================== Metrics Retrieval ====================

/**
 * Get current metrics summary
 */
function getMetrics() {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const avgLatency = metrics.latency.samples.length > 0
    ? metrics.latency.samples.reduce((a, b) => a + b, 0) / metrics.latency.samples.length
    : 0;

  const errorRate = metrics.requests.total > 0
    ? (metrics.requests.errors / metrics.requests.total) * 100
    : 0;

  const fhirFailureRate = metrics.fhir.requests > 0
    ? (metrics.fhir.failures / metrics.fhir.requests) * 100
    : 0;

  return {
    uptime: {
      seconds: uptimeSeconds,
      formatted: formatUptime(uptimeSeconds)
    },
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      errorRate: errorRate.toFixed(2) + '%',
      topEndpoints: getTopEndpoints(5)
    },
    latency: {
      avgMs: Math.round(avgLatency),
      p50Ms: getPercentile(50),
      p95Ms: getPercentile(95),
      p99Ms: getPercentile(99)
    },
    fhir: {
      requests: metrics.fhir.requests,
      failures: metrics.fhir.failures,
      failureRate: fhirFailureRate.toFixed(2) + '%',
      byProvider: metrics.fhir.byProvider
    },
    auth: {
      success: metrics.auth.success,
      failures: metrics.auth.failures,
      invalidKeys: metrics.auth.invalidKeys
    },
    errors: {
      recentCount: metrics.errors.recent.length,
      byType: metrics.errors.byType
    },
    alerts: {
      thresholds: ALERT_THRESHOLDS,
      lastAlerts: alertState.lastAlertTime
    }
  };
}

/**
 * Get recent errors for debugging
 */
function getRecentErrors(limit = 20) {
  return metrics.errors.recent.slice(0, limit);
}

/**
 * Get top endpoints by request count
 */
function getTopEndpoints(limit = 10) {
  return Object.entries(metrics.requests.byEndpoint)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([endpoint, count]) => ({ endpoint, count }));
}

/**
 * Get latency percentile
 */
function getPercentile(percentile) {
  if (metrics.latency.samples.length === 0) return 0;

  const sorted = [...metrics.latency.samples].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.max(0, index)]);
}

/**
 * Format uptime for display
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

/**
 * Reset metrics (useful for testing)
 */
function resetMetrics() {
  metrics.requests = { total: 0, success: 0, errors: 0, byEndpoint: {}, byStatusCode: {} };
  metrics.latency = { samples: [], maxSamples: 1000 };
  metrics.errors = { recent: [], maxRecent: 100, byType: {} };
  metrics.fhir = { requests: 0, failures: 0, byProvider: {} };
  metrics.auth = { success: 0, failures: 0, invalidKeys: 0 };
  metrics.startTime = Date.now();
  alertState.consecutiveErrors = 0;
  alertState.lastAlertTime = {};
}

// ==================== Monitoring Middleware ====================

/**
 * Express middleware to track requests
 */
function monitoringMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();

  // Override res.end to capture timing
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1e6;

    recordRequest(req, res, durationMs);

    return originalEnd.apply(this, args);
  };

  next();
}

module.exports = {
  recordRequest,
  recordError,
  recordFhirCall,
  recordAuthAttempt,
  getMetrics,
  getRecentErrors,
  resetMetrics,
  monitoringMiddleware,
  ALERT_THRESHOLDS
};
