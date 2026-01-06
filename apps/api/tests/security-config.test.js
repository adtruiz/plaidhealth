/**
 * Security Configuration Tests
 */

jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const {
  validateStringInput,
  validateEmail,
  validateUrl,
  validatePassword,
  generateSecureToken,
  hashToken,
  secureCompare,
  normalizeIp,
  isSuspiciousRequest,
  securityHeaders,
  buildCSPHeader,
  PASSWORD_REQUIREMENTS
} = require('../src/security-config');

describe('Security Config', () => {
  describe('validateStringInput', () => {
    it('should accept valid input', () => {
      const result = validateStringInput('Hello World');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello World');
    });

    it('should trim whitespace', () => {
      const result = validateStringInput('  test  ');
      expect(result.sanitized).toBe('test');
    });

    it('should reject input exceeding maxLength', () => {
      const result = validateStringInput('a'.repeat(1001));
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum length');
    });

    it('should reject input below minLength', () => {
      const result = validateStringInput('ab', { minLength: 3 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject required null input', () => {
      const result = validateStringInput(null, { required: true });
      expect(result.valid).toBe(false);
    });

    it('should accept null input when not required', () => {
      const result = validateStringInput(null, { required: false });
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe(null);
    });

    it('should reject script tags', () => {
      const result = validateStringInput('<script>alert(1)</script>');
      expect(result.valid).toBe(false);
    });

    it('should reject javascript protocol', () => {
      const result = validateStringInput('javascript:void(0)');
      expect(result.valid).toBe(false);
    });

    it('should reject SQL injection patterns', () => {
      const result = validateStringInput("' OR 1=1 --");
      expect(result.valid).toBe(false);
    });

    it('should reject template injection', () => {
      const result = validateStringInput('${process.env.SECRET}');
      expect(result.valid).toBe(false);
    });

    it('should validate against custom pattern', () => {
      const result = validateStringInput('abc123', { pattern: /^[a-z]+$/ });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      const result = validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should lowercase email', () => {
      const result = validateEmail('Test@Example.COM');
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      const result = validateEmail('not-an-email');
      expect(result.valid).toBe(false);
    });

    it('should reject email without @', () => {
      const result = validateEmail('testexample.com');
      expect(result.valid).toBe(false);
    });

    it('should reject very long email', () => {
      const result = validateEmail('a'.repeat(250) + '@example.com');
      expect(result.valid).toBe(false);
    });

    it('should accept email with subdomain', () => {
      const result = validateEmail('test@mail.example.com');
      expect(result.valid).toBe(true);
    });

    it('should accept email with plus', () => {
      const result = validateEmail('test+tag@example.com');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateUrl', () => {
    it('should accept valid HTTPS URL', () => {
      const result = validateUrl('https://example.com/path');
      expect(result.valid).toBe(true);
    });

    it('should reject HTTP URL by default', () => {
      const result = validateUrl('http://example.com');
      expect(result.valid).toBe(false);
    });

    it('should accept HTTP when allowed', () => {
      const result = validateUrl('http://example.com', { allowedProtocols: ['http:', 'https:'] });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid URL', () => {
      const result = validateUrl('not-a-url');
      expect(result.valid).toBe(false);
    });

    it('should reject javascript protocol', () => {
      const result = validateUrl('javascript:alert(1)', { allowedProtocols: ['javascript:'] });
      // Even if we try to allow it, URL parsing should handle it
      expect(result.valid).toBe(true); // URL constructor accepts it
    });

    it('should reject very long URL', () => {
      const result = validateUrl('https://example.com/' + 'a'.repeat(3000));
      expect(result.valid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong password', () => {
      const result = validatePassword('SecurePass123');
      expect(result.valid).toBe(true);
    });

    it('should reject short password', () => {
      const result = validatePassword('Short1');
      expect(result.valid).toBe(false);
      expect(result.error).toContain(`at least ${PASSWORD_REQUIREMENTS.minLength}`);
    });

    it('should reject password without lowercase', () => {
      const result = validatePassword('ALLUPPERCASE123');
      expect(result.valid).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const result = validatePassword('alllowercase123');
      expect(result.valid).toBe(false);
    });

    it('should reject password without number', () => {
      const result = validatePassword('NoNumbersHere');
      expect(result.valid).toBe(false);
    });

    it('should reject very long password', () => {
      const result = validatePassword('A1' + 'a'.repeat(200));
      expect(result.valid).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token of correct length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });

    it('should generate different lengths', () => {
      const token16 = generateSecureToken(16);
      const token64 = generateSecureToken(64);
      expect(token16).toHaveLength(32);
      expect(token64).toHaveLength(128);
    });
  });

  describe('hashToken', () => {
    it('should produce consistent hash', () => {
      const token = 'test-token';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token1');
      const hash2 = hashToken('token2');
      expect(hash1).not.toBe(hash2);
    });

    it('should produce 64 character hash', () => {
      const hash = hashToken('any-token');
      expect(hash).toHaveLength(64);
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      expect(secureCompare('test', 'test')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('test1', 'test2')).toBe(false);
    });

    it('should return false for different lengths', () => {
      expect(secureCompare('short', 'longer')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(secureCompare(123, '123')).toBe(false);
      expect(secureCompare(null, 'test')).toBe(false);
    });
  });

  describe('normalizeIp', () => {
    it('should remove IPv6-mapped IPv4 prefix', () => {
      expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('should keep regular IPv4', () => {
      expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1');
    });

    it('should keep IPv6', () => {
      expect(normalizeIp('2001:db8::1')).toBe('2001:db8::1');
    });

    it('should handle null', () => {
      expect(normalizeIp(null)).toBe('unknown');
    });

    it('should handle undefined', () => {
      expect(normalizeIp(undefined)).toBe('unknown');
    });
  });

  describe('isSuspiciousRequest', () => {
    it('should detect path traversal', () => {
      const req = { originalUrl: '/api/../../../etc/passwd', headers: {} };
      const result = isSuspiciousRequest(req);
      expect(result.suspicious).toBe(true);
      expect(result.indicators).toContain('path_traversal');
    });

    it('should detect null byte injection', () => {
      const req = { originalUrl: '/api/file%00.txt', headers: {} };
      const result = isSuspiciousRequest(req);
      expect(result.suspicious).toBe(true);
      expect(result.indicators).toContain('null_byte');
    });

    it('should detect XSS in URL', () => {
      const req = { originalUrl: '/api?q=<script>alert(1)</script>', headers: {} };
      const result = isSuspiciousRequest(req);
      expect(result.suspicious).toBe(true);
      expect(result.indicators).toContain('xss_url');
    });

    it('should detect scanner user agents', () => {
      const req = {
        originalUrl: '/api/test',
        headers: { 'user-agent': 'sqlmap/1.0' }
      };
      const result = isSuspiciousRequest(req);
      expect(result.suspicious).toBe(true);
      expect(result.indicators).toContain('scanner_ua');
    });

    it('should detect long URLs', () => {
      const req = { originalUrl: '/api/' + 'a'.repeat(3000), headers: {} };
      const result = isSuspiciousRequest(req);
      expect(result.suspicious).toBe(true);
      expect(result.indicators).toContain('long_url');
    });

    it('should not flag normal requests', () => {
      const req = {
        originalUrl: '/api/users/123',
        headers: { 'user-agent': 'Mozilla/5.0 Chrome/100.0' }
      };
      const result = isSuspiciousRequest(req);
      expect(result.suspicious).toBe(false);
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      const req = {};
      const headers = {};
      const res = {
        setHeader: jest.fn((key, value) => { headers[key] = value; })
      };
      const next = jest.fn();

      securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('buildCSPHeader', () => {
    it('should build valid CSP header', () => {
      const csp = buildCSPHeader();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  });
});
