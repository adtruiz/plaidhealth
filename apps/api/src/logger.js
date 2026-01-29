const winston = require('winston');

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'verzihealth' },
  transports: [
    // Console transport with colorized output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (Object.keys(meta).length > 0 && meta.service !== 'verzihealth') {
            log += ` ${JSON.stringify(meta)}`;
          }
          return log;
        })
      )
    })
  ]
});

// Production-specific logging enhancements
if (process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === 'production') {
  logger.info('Production logging enabled', {
    environment: process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV,
    logLevel
  });
}

module.exports = logger;
