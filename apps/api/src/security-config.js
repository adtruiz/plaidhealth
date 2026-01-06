/**
 * Security Configuration & Hardening
 *
 * This module centralizes security settings and provides security helpers.
 * Security Audit Date: 2025-01-06
 */

const crypto = require('crypto');
const logger = require('./logger');

// ==================== Security Configuration ====================

/**
 * Content Security Policy directives
 */
const CSP_DIRECTIVES = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:'],
  fontSrc: ["'self'"],
  connectSrc: ["'self'"],
  frameSrc: ["'none'"],
  objectSrc: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"]
};

/**
 * Build CSP header string
 */
function buildCSPHeader() {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => {
      const directive = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Suspicious patterns to block in input
 * These patterns indicate potential injection attacks
 */
const SUSPICIOUS_PATTERNS = [
  /<script[^>]*>/i,           // Script tags
  /javascript:/i,              // JavaScript protocol
  /on\w+\s*=/i,               // Event handlers
  /\bexec\s*\(/i,             // SQL exec
  /\bunion\s+select/i,        // SQL union injection
  /;\s*drop\s+table/i,        // SQL drop table
  /\bor\s+1\s*=\s*1/i,        // SQL always-true condition
  /\band\s+1\s*=\s*1/i,       // SQL always-true condition
  /<iframe[^>]*>/i,           // Iframe injection
  /data:text\/html/i,         // Data URI HTML
  /\$\{[^}]+\}/,              // Template injection
  /{{[^}]+}}/                 // Template injection
];

// ==================== Input Validation ====================

/**
 * Validate and sanitize string input
 * @param {string} input - The input to validate
 * @param {object} options - Validation options
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
function validateStringInput(input, options = {}) {
  const {
    maxLength = 1000,
    minLength = 0,
    required = false,
    allowEmpty = true,
    pattern = null,
    fieldName = 'Input'
  } = options;

  // Null/undefined check
  if (input === null || input === undefined) {
    if (required) {
      return { valid: false, error: `${fieldName} is required` };
    }
    return { valid: true, sanitized: null };
  }

  // Type check
  if (typeof input !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  // Empty check
  if (!allowEmpty && input.trim().length === 0) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }

  // Length checks
  if (input.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  if (input.length > maxLength) {
    return { valid: false, error: `${fieldName} exceeds maximum length of ${maxLength}` };
  }

  // Pattern check
  if (pattern && !pattern.test(input)) {
    return { valid: false, error: `${fieldName} has invalid format` };
  }

  // Check for suspicious patterns
  for (const suspicious of SUSPICIOUS_PATTERNS) {
    if (suspicious.test(input)) {
      logger.warn('Suspicious input pattern detected', {
        pattern: suspicious.toString(),
        fieldName
      });
      return { valid: false, error: `${fieldName} contains invalid characters` };
    }
  }

  // Basic sanitization - trim whitespace
  const sanitized = input.trim();

  return { valid: true, sanitized };
}

/**
 * Validate email address
 */
function validateEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email exceeds maximum length' };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, sanitized: email.toLowerCase().trim() };
}

/**
 * Validate URL
 */
function validateUrl(url, options = {}) {
  const { allowedProtocols = ['https:'], maxLength = 2048 } = options;

  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  if (url.length > maxLength) {
    return { valid: false, error: 'URL exceeds maximum length' };
  }

  try {
    const parsed = new URL(url);

    if (!allowedProtocols.includes(parsed.protocol)) {
      return { valid: false, error: `URL must use ${allowedProtocols.join(' or ')}` };
    }

    return { valid: true, sanitized: url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// ==================== Security Headers Middleware ====================

/**
 * Enhanced security headers middleware
 */
function securityHeaders(req, res, next) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');

  // HSTS (only in production)
  if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // CSP (be cautious - may need adjustment for specific needs)
  // Uncomment when ready to enforce:
  // res.setHeader('Content-Security-Policy', buildCSPHeader());

  next();
}

// ==================== Password Security ====================

/**
 * Password strength requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumber: true,
  requireSpecial: false // Keep disabled for better UX
};

/**
 * Validate password strength
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { valid: false, error: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters` };
  }

  if (password.length > PASSWORD_REQUIREMENTS.maxLength) {
    return { valid: false, error: 'Password exceeds maximum length' };
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain a lowercase letter' };
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain an uppercase letter' };
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain a number' };
  }

  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, error: 'Password must contain a special character' };
  }

  return { valid: true };
}

// ==================== Token Security ====================

/**
 * Generate a secure random token
 * @param {number} bytes - Number of bytes (default 32 = 256 bits)
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a token for storage (one-way)
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time comparison for tokens
 */
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ==================== IP Address Handling ====================

/**
 * Get client IP address, handling proxies
 */
function getClientIp(req) {
  // Trust X-Forwarded-For only if behind trusted proxy
  if (req.app?.get('trust proxy')) {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      // Take the first IP (client IP)
      return forwardedFor.split(',')[0].trim();
    }
  }

  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Normalize IP address (remove IPv6-mapped IPv4 prefix)
 */
function normalizeIp(ip) {
  if (!ip) return 'unknown';

  // Remove ::ffff: prefix from IPv6-mapped IPv4 addresses
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }

  return ip;
}

// ==================== Security Audit Helpers ====================

/**
 * Log security-relevant events
 */
function logSecurityEvent(event, details = {}) {
  logger.warn(`SECURITY: ${event}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Check if request looks suspicious
 */
function isSuspiciousRequest(req) {
  const suspiciousIndicators = [];

  // Check for common attack patterns in URL
  const url = req.originalUrl || req.url;
  if (/\.\.\//i.test(url)) suspiciousIndicators.push('path_traversal');
  if (/%00/.test(url)) suspiciousIndicators.push('null_byte');
  if (/<script/i.test(url)) suspiciousIndicators.push('xss_url');

  // Check for unusually long URLs
  if (url.length > 2048) suspiciousIndicators.push('long_url');

  // Check for suspicious headers
  const userAgent = req.headers['user-agent'] || '';
  if (userAgent.length > 500) suspiciousIndicators.push('long_ua');
  if (/sqlmap|nikto|burp|owasp/i.test(userAgent)) suspiciousIndicators.push('scanner_ua');

  return {
    suspicious: suspiciousIndicators.length > 0,
    indicators: suspiciousIndicators
  };
}

module.exports = {
  // Configuration
  CSP_DIRECTIVES,
  PASSWORD_REQUIREMENTS,
  SUSPICIOUS_PATTERNS,

  // Validation
  validateStringInput,
  validateEmail,
  validateUrl,
  validatePassword,

  // Security helpers
  securityHeaders,
  generateSecureToken,
  hashToken,
  secureCompare,
  getClientIp,
  normalizeIp,

  // Audit helpers
  logSecurityEvent,
  isSuspiciousRequest,
  buildCSPHeader
};
