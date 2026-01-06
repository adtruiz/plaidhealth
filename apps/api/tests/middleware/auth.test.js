/**
 * Authentication Middleware Tests
 */

// Mock the logger
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock the database
jest.mock('../../src/db', () => ({
  apiKeyDb: {
    validate: jest.fn()
  }
}));

const { authenticate, requireScopes, requireSession, extractApiKey } = require('../../src/middleware/auth');
const { apiKeyDb } = require('../../src/db');
const logger = require('../../src/logger');

describe('Auth Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      isAuthenticated: jest.fn(() => false)
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    mockNext = jest.fn();
  });

  describe('extractApiKey', () => {
    it('should extract API key from Authorization Bearer header', () => {
      mockReq.headers.authorization = 'Bearer pfh_live_abc123';

      const key = extractApiKey(mockReq);

      expect(key).toBe('pfh_live_abc123');
    });

    it('should extract API key from X-API-Key header', () => {
      mockReq.headers['x-api-key'] = 'pfh_test_xyz789';

      const key = extractApiKey(mockReq);

      expect(key).toBe('pfh_test_xyz789');
    });

    it('should prefer Authorization header over X-API-Key', () => {
      mockReq.headers.authorization = 'Bearer pfh_live_auth';
      mockReq.headers['x-api-key'] = 'pfh_test_xapi';

      const key = extractApiKey(mockReq);

      expect(key).toBe('pfh_live_auth');
    });

    it('should return null for non-pfh Authorization Bearer', () => {
      mockReq.headers.authorization = 'Bearer some_other_token';

      const key = extractApiKey(mockReq);

      expect(key).toBeNull();
    });

    it('should return null for non-pfh X-API-Key', () => {
      mockReq.headers['x-api-key'] = 'other_api_key';

      const key = extractApiKey(mockReq);

      expect(key).toBeNull();
    });

    it('should return null when no headers present', () => {
      const key = extractApiKey(mockReq);

      expect(key).toBeNull();
    });
  });

  describe('authenticate', () => {
    describe('API Key Authentication', () => {
      it('should authenticate valid API key with required scopes', async () => {
        mockReq.headers['x-api-key'] = 'pfh_live_valid123';
        apiKeyDb.validate.mockResolvedValue({
          id: 1,
          user_id: 'user-123',
          email: 'test@example.com',
          user_name: 'Test User',
          scopes: ['read', 'write']
        });

        const middleware = authenticate(['read']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toEqual({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        });
        expect(mockReq.authMethod).toBe('api_key');
        expect(mockReq.apiKeyId).toBe(1);
        expect(mockReq.apiKeyScopes).toEqual(['read', 'write']);
      });

      it('should reject invalid API key', async () => {
        mockReq.headers['x-api-key'] = 'pfh_live_invalid';
        apiKeyDb.validate.mockResolvedValue(null);

        const middleware = authenticate(['read']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        });
        expect(logger.warn).toHaveBeenCalledWith(
          'Invalid API key attempted',
          expect.any(Object)
        );
      });

      it('should reject API key with insufficient scopes', async () => {
        mockReq.headers['x-api-key'] = 'pfh_live_limited';
        apiKeyDb.validate.mockResolvedValue({
          id: 1,
          user_id: 'user-123',
          scopes: ['read']
        });

        const middleware = authenticate(['write']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_SCOPES',
          required: ['write']
        });
      });

      it('should allow admin scope to bypass other scope requirements', async () => {
        mockReq.headers['x-api-key'] = 'pfh_live_admin';
        apiKeyDb.validate.mockResolvedValue({
          id: 1,
          user_id: 'user-123',
          email: 'admin@example.com',
          user_name: 'Admin',
          scopes: ['admin']
        });

        const middleware = authenticate(['read', 'write', 'delete']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle database errors gracefully', async () => {
        mockReq.headers['x-api-key'] = 'pfh_live_error';
        apiKeyDb.validate.mockRejectedValue(new Error('Database error'));

        const middleware = authenticate(['read']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('Session Authentication', () => {
      it('should authenticate valid session when no API key', async () => {
        mockReq.isAuthenticated = jest.fn(() => true);
        mockReq.user = { id: 'session-user' };

        const middleware = authenticate(['read']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.authMethod).toBe('session');
      });

      it('should reject unauthenticated requests', async () => {
        mockReq.isAuthenticated = jest.fn(() => false);

        const middleware = authenticate(['read']);
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          hint: expect.any(String)
        });
      });
    });

    describe('Default scopes', () => {
      it('should default to read scope', async () => {
        mockReq.headers['x-api-key'] = 'pfh_live_readonly';
        apiKeyDb.validate.mockResolvedValue({
          id: 1,
          user_id: 'user-123',
          email: 'test@example.com',
          user_name: 'Test',
          scopes: ['read']
        });

        const middleware = authenticate(); // No scopes specified
        await middleware(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('requireScopes', () => {
    it('should pass for session auth (full access)', () => {
      mockReq.authMethod = 'session';

      const middleware = requireScopes('admin', 'write', 'delete');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when API key has required scopes', () => {
      mockReq.authMethod = 'api_key';
      mockReq.apiKeyScopes = ['read', 'write'];

      const middleware = requireScopes('read', 'write');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should pass when API key has admin scope', () => {
      mockReq.authMethod = 'api_key';
      mockReq.apiKeyScopes = ['admin'];

      const middleware = requireScopes('read', 'write', 'delete');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject when API key missing required scopes', () => {
      mockReq.authMethod = 'api_key';
      mockReq.apiKeyScopes = ['read'];

      const middleware = requireScopes('write');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_SCOPES',
        required: ['write']
      });
    });

    it('should handle undefined apiKeyScopes', () => {
      mockReq.authMethod = 'api_key';
      mockReq.apiKeyScopes = undefined;

      const middleware = requireScopes('read');
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireSession', () => {
    it('should pass for authenticated session', () => {
      mockReq.isAuthenticated = jest.fn(() => true);

      requireSession(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.authMethod).toBe('session');
    });

    it('should reject non-session requests', () => {
      mockReq.isAuthenticated = jest.fn(() => false);

      requireSession(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Session required',
        code: 'SESSION_REQUIRED'
      });
    });

    it('should handle missing isAuthenticated function', () => {
      mockReq.isAuthenticated = undefined;

      requireSession(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
