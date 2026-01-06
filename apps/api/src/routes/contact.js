/**
 * Contact Form Routes
 * Handles contact form submissions from the marketing site
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const { pool } = require('../db');

// Rate limiting for contact form (5 submissions per hour per IP)
const contactRateLimit = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  if (!contactRateLimit.has(ip)) {
    contactRateLimit.set(ip, []);
  }

  const submissions = contactRateLimit.get(ip).filter(time => time > hourAgo);
  contactRateLimit.set(ip, submissions);

  return submissions.length < 5;
}

function recordSubmission(ip) {
  const submissions = contactRateLimit.get(ip) || [];
  submissions.push(Date.now());
  contactRateLimit.set(ip, submissions);
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  for (const [ip, submissions] of contactRateLimit.entries()) {
    const recent = submissions.filter(time => time > hourAgo);
    if (recent.length === 0) {
      contactRateLimit.delete(ip);
    } else {
      contactRateLimit.set(ip, recent);
    }
  }
}, 30 * 60 * 1000); // Run every 30 minutes

/**
 * POST /api/v1/contact
 * Submit contact form
 */
router.post('/', async (req, res) => {
  try {
    const { name, email, company, inquiryType, message } = req.body;
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;

    // Validate required fields
    if (!name || !email || !company || !inquiryType || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        required: ['name', 'email', 'company', 'inquiryType', 'message'],
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    // Check rate limit
    if (!checkRateLimit(ip)) {
      logger.warn('Contact form rate limit exceeded', { ip, email });
      return res.status(429).json({
        error: 'Too many submissions. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      });
    }

    // Store submission in database
    const result = await pool.query(
      `INSERT INTO contact_submissions (name, email, company, inquiry_type, message, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, created_at`,
      [name, email, company, inquiryType, message, ip]
    );

    recordSubmission(ip);

    logger.info('Contact form submitted', {
      id: result.rows[0].id,
      email,
      company,
      inquiryType,
    });

    // TODO: In production, integrate with email service (SendGrid, etc.)
    // to send notification to sales team and confirmation to user

    res.status(201).json({
      success: true,
      message: 'Thank you for your submission. We will be in touch shortly.',
      id: result.rows[0].id,
    });
  } catch (error) {
    logger.error('Contact form submission failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to submit contact form',
      code: 'SUBMISSION_ERROR',
    });
  }
});

/**
 * GET /api/v1/contact/submissions
 * List contact submissions (admin only - future implementation)
 */
router.get('/submissions', async (req, res) => {
  // This would be protected by admin authentication in production
  res.status(501).json({
    error: 'Admin interface not implemented',
    code: 'NOT_IMPLEMENTED',
  });
});

module.exports = router;
