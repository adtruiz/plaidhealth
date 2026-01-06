/**
 * Widget Routes Tests
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies
jest.mock('../../src/db', () => ({
  widgetDb: {
    create: jest.fn(),
    validateToken: jest.fn(),
    createPublicToken: jest.fn(),
    getSessionsByUserId: jest.fn()
  },
  apiKeyDb: {
    validate: jest.fn()
  },
  auditDb: {
    log: jest.fn()
  }
}));

jest.mock('../../src/middleware/rate-limit', () => ({
  rateLimit: jest.fn(() => (req, res, next) => next())
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123' };
    req.apiKey = { id: 1, userId: 'user-123', scopes: ['read', 'write'] };
    next();
  })
}));

jest.mock('../../src/lib/providers', () => ({
  getAllProviders: jest.fn(() => ['epic', 'cerner', 'meditech']),
  getProviderDisplayName: jest.fn((p) => p.charAt(0).toUpperCase() + p.slice(1)),
  getProviderConfig: jest.fn((p) => ({ displayName: p.charAt(0).toUpperCase() + p.slice(1) })),
  getProviderType: jest.fn(() => 'emr'),
  isProviderConfigured: jest.fn(() => true),
  getOAuthConfig: jest.fn(() => ({
    clientId: 'test-client-id',
    authUrl: 'https://oauth.example.com/authorize',
    scope: 'openid fhirUser',
    usesPKCE: true
  })),
  getFhirBaseUrl: jest.fn(() => 'https://fhir.example.com/api/FHIR/R4')
}));

jest.mock('../../src/lib/oauth', () => ({
  generatePKCE: jest.fn(() => ({
    codeVerifier: 'test-verifier',
    codeChallenge: 'test-challenge'
  }))
}));

const { widgetDb } = require('../../src/db');

describe('Widget Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Add request metadata
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      req.ip = '127.0.0.1';
      req.get = jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        return null;
      });
      next();
    });

    const widgetRoutes = require('../../src/routes/widget');
    app.use('/api/v1/widget', widgetRoutes);
  });

  describe('GET /api/v1/widget/providers', () => {
    it('should return list of providers', async () => {
      const res = await request(app).get('/api/v1/widget/providers');

      expect(res.status).toBe(200);
      expect(res.body.providers).toBeDefined();
      expect(Array.isArray(res.body.providers)).toBe(true);
    });

    it('should include provider id, name, and type', async () => {
      const res = await request(app).get('/api/v1/widget/providers');

      if (res.body.providers && res.body.providers.length > 0) {
        const provider = res.body.providers[0];
        expect(provider).toHaveProperty('id');
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('type');
      }
    });
  });

  describe('POST /api/v1/widget/token', () => {
    beforeEach(() => {
      widgetDb.create.mockResolvedValue({
        token: 'wt_test_token_123',
        id: 1,
        expires_at: new Date(Date.now() + 3600000)
      });
    });

    it('should create widget token with valid API key', async () => {
      const res = await request(app)
        .post('/api/v1/widget/token')
        .set('X-API-Key', 'test-api-key')
        .send({ client_user_id: 'end-user-123' });

      expect(res.status).toBe(200);
      expect(res.body.widget_token).toBeDefined();
    });

    it('should require client_user_id in request body', async () => {
      const res = await request(app)
        .post('/api/v1/widget/token')
        .set('X-API-Key', 'test-api-key')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('client_user_id');
    });
  });

  describe('GET /api/v1/widget/initiate/:provider', () => {
    it('should require widget_token query parameter', async () => {
      const res = await request(app)
        .get('/api/v1/widget/initiate/epic');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('widget_token');
    });
  });

  describe('POST /api/v1/widget/exchange', () => {
    it('should require public_token', async () => {
      const res = await request(app)
        .post('/api/v1/widget/exchange')
        .set('X-API-Key', 'test-api-key')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('public_token');
    });
  });
});
