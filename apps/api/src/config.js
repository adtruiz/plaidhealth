/**
 * Configuration Validation Module
 *
 * Validates environment variables on startup and provides
 * typed configuration access throughout the application.
 */

const logger = require('./logger');

/**
 * Configuration schema with validation rules
 */
const CONFIG_SCHEMA = {
  // Server
  PORT: {
    type: 'number',
    default: 3000,
    required: false
  },
  NODE_ENV: {
    type: 'string',
    default: 'development',
    required: false,
    values: ['development', 'production', 'test']
  },

  // Database (at least one required)
  DATABASE_URL: {
    type: 'string',
    required: false,
    sensitive: true
  },
  DATABASE_PUBLIC_URL: {
    type: 'string',
    required: false,
    sensitive: true
  },
  PGHOST: { type: 'string', required: false },
  PGUSER: { type: 'string', required: false },
  PGPASSWORD: { type: 'string', required: false, sensitive: true },
  PGDATABASE: { type: 'string', required: false },
  PGPORT: { type: 'number', default: 5432, required: false },

  // Redis
  REDIS_URL: {
    type: 'string',
    default: 'redis://localhost:6379',
    required: false
  },

  // Security (required in production)
  SESSION_SECRET: {
    type: 'string',
    required: true,
    minLength: 32,
    sensitive: true
  },
  ENCRYPTION_KEY: {
    type: 'string',
    required: true,
    length: 64,  // 32 bytes hex-encoded
    sensitive: true
  },

  // Google OAuth (required for web auth)
  GOOGLE_CLIENT_ID: {
    type: 'string',
    required: false
  },
  GOOGLE_CLIENT_SECRET: {
    type: 'string',
    required: false,
    sensitive: true
  },

  // OAuth redirect
  REDIRECT_URI: {
    type: 'string',
    required: true
  },

  // Logging
  LOG_LEVEL: {
    type: 'string',
    default: 'info',
    required: false,
    values: ['debug', 'info', 'warn', 'error']
  }
};

/**
 * Healthcare provider configurations (all optional)
 */
const PROVIDER_CONFIGS = [
  'EPIC', 'AETNA', 'ANTHEM', 'BCBS_MN', 'BCBS_TN',
  'NEXTGEN', 'BLUEBUTTON', 'MOLINA', 'KAISER'
];

const PROVIDER_FIELDS = ['CLIENT_ID', 'CLIENT_SECRET', 'AUTHORIZATION_URL', 'TOKEN_URL', 'FHIR_BASE_URL'];

class ConfigurationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ConfigurationError';
    this.errors = errors;
  }
}

/**
 * Validate a single config value
 */
function validateValue(key, value, schema) {
  const errors = [];

  // Check required
  if (schema.required && !value) {
    errors.push(`${key} is required`);
    return errors;
  }

  if (!value && schema.default !== undefined) {
    return errors; // Will use default
  }

  if (!value) {
    return errors; // Optional and not set
  }

  // Type validation
  switch (schema.type) {
    case 'number':
      if (isNaN(Number(value))) {
        errors.push(`${key} must be a number`);
      }
      break;
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
      }
      break;
  }

  // Length validation
  if (schema.length && value.length !== schema.length) {
    errors.push(`${key} must be exactly ${schema.length} characters`);
  }

  if (schema.minLength && value.length < schema.minLength) {
    errors.push(`${key} must be at least ${schema.minLength} characters`);
  }

  // Enum validation
  if (schema.values && !schema.values.includes(value)) {
    errors.push(`${key} must be one of: ${schema.values.join(', ')}`);
  }

  return errors;
}

/**
 * Validate all configuration
 * @returns {{valid: boolean, errors: string[], warnings: string[], config: object}}
 */
function validateConfig() {
  const errors = [];
  const warnings = [];
  const config = {};

  // Validate core schema
  for (const [key, schema] of Object.entries(CONFIG_SCHEMA)) {
    const value = process.env[key];
    const fieldErrors = validateValue(key, value, schema);

    if (fieldErrors.length > 0) {
      errors.push(...fieldErrors);
    }

    // Set config value
    if (value) {
      config[key] = schema.type === 'number' ? Number(value) : value;
    } else if (schema.default !== undefined) {
      config[key] = schema.default;
    }
  }

  // Database validation (at least one method required)
  const hasConnectionString = process.env.DATABASE_URL || process.env.DATABASE_PUBLIC_URL;
  const hasIndividualConfig = process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE;

  if (!hasConnectionString && !hasIndividualConfig) {
    errors.push('Database configuration required: set DATABASE_URL or PGHOST/PGUSER/PGPASSWORD/PGDATABASE');
  }

  // Google OAuth warning
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    warnings.push('Google OAuth not configured - web authentication will be unavailable');
  }

  // Provider configuration check
  let configuredProviders = 0;
  for (const provider of PROVIDER_CONFIGS) {
    const clientId = process.env[`${provider}_CLIENT_ID`];
    if (clientId) {
      configuredProviders++;

      // Check if all required fields are present
      for (const field of ['AUTHORIZATION_URL', 'TOKEN_URL', 'FHIR_BASE_URL']) {
        if (!process.env[`${provider}_${field}`]) {
          warnings.push(`${provider} is partially configured - missing ${field}`);
        }
      }
    }
  }

  if (configuredProviders === 0) {
    warnings.push('No healthcare providers configured - API will have limited functionality');
  } else {
    config.configuredProviders = configuredProviders;
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    if (process.env.SESSION_SECRET?.length < 64) {
      warnings.push('SESSION_SECRET should be at least 64 characters in production');
    }

    if (!process.env.REDIS_URL) {
      warnings.push('REDIS_URL not set - using default localhost:6379 (not recommended for production)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

/**
 * Validate and load configuration on startup
 * Exits process if validation fails in production
 */
function loadConfig() {
  const result = validateConfig();

  // Log warnings
  for (const warning of result.warnings) {
    logger.warn(`Config warning: ${warning}`);
  }

  // Handle errors
  if (!result.valid) {
    logger.error('Configuration validation failed', { errors: result.errors });

    if (process.env.NODE_ENV === 'production') {
      console.error('\n❌ Configuration errors:');
      result.errors.forEach(e => console.error(`   - ${e}`));
      console.error('\nExiting due to invalid configuration.\n');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Configuration warnings (development mode):');
      result.errors.forEach(e => console.warn(`   - ${e}`));
      console.warn('\n');
    }
  }

  logger.info('Configuration validated', {
    environment: result.config.NODE_ENV,
    port: result.config.PORT,
    providers: result.config.configuredProviders || 0,
    warnings: result.warnings.length
  });

  return result.config;
}

/**
 * Get configuration summary (safe for logging)
 */
function getConfigSummary() {
  const result = validateConfig();

  return {
    environment: result.config.NODE_ENV,
    port: result.config.PORT,
    database: process.env.DATABASE_URL ? 'connection_string' : 'individual_vars',
    redis: process.env.REDIS_URL ? 'configured' : 'default',
    googleOAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    configuredProviders: result.config.configuredProviders || 0,
    valid: result.valid,
    warnings: result.warnings.length,
    errors: result.errors.length
  };
}

module.exports = {
  validateConfig,
  loadConfig,
  getConfigSummary,
  ConfigurationError,
  CONFIG_SCHEMA
};
