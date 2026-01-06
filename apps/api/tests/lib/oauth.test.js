/**
 * OAuth Helper Tests
 */

const crypto = require('crypto');

// Mock the logger
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock providers module
jest.mock('../../src/lib/providers', () => ({
  getOAuthConfig: jest.fn(),
  getFhirBaseUrl: jest.fn()
}));

const {
  generatePKCE,
  createBasicAuthTokenRequest,
  createPKCETokenRequest,
  initiateOAuth,
  parseState
} = require('../../src/lib/oauth');

const { getOAuthConfig, getFhirBaseUrl } = require('../../src/lib/providers');

describe('OAuth Helper Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.REDIRECT_URI = 'https://example.com/callback';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generatePKCE', () => {
    it('should generate code verifier and challenge', () => {
      const pkce = generatePKCE();

      expect(pkce).toHaveProperty('codeVerifier');
      expect(pkce).toHaveProperty('codeChallenge');
      expect(typeof pkce.codeVerifier).toBe('string');
      expect(typeof pkce.codeChallenge).toBe('string');
    });

    it('should generate unique values each time', () => {
      const pkce1 = generatePKCE();
      const pkce2 = generatePKCE();

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });

    it('should generate valid base64url encoded code verifier', () => {
      const pkce = generatePKCE();

      // Base64url should only contain these characters
      const base64urlRegex = /^[A-Za-z0-9_-]+$/;
      expect(pkce.codeVerifier).toMatch(base64urlRegex);
    });

    it('should generate code challenge that matches S256 algorithm', () => {
      const pkce = generatePKCE();

      // Manually compute expected challenge
      const expectedChallenge = crypto
        .createHash('sha256')
        .update(pkce.codeVerifier)
        .digest('base64url');

      expect(pkce.codeChallenge).toBe(expectedChallenge);
    });

    it('should generate code verifier of sufficient length for security', () => {
      const pkce = generatePKCE();

      // 32 bytes in base64url is approximately 43 characters
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(40);
    });
  });

  describe('createBasicAuthTokenRequest', () => {
    it('should create valid Basic Auth token request', () => {
      const tokenUrl = 'https://auth.example.com/token';
      const code = 'auth_code_123';
      const clientId = 'client_id_abc';
      const clientSecret = 'client_secret_xyz';

      const request = createBasicAuthTokenRequest(tokenUrl, code, clientId, clientSecret);

      expect(request.url).toBe(tokenUrl);
      expect(request.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
    });

    it('should include correct Authorization header', () => {
      const clientId = 'test_client';
      const clientSecret = 'test_secret';
      const expectedAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const request = createBasicAuthTokenRequest(
        'https://auth.example.com/token',
        'code123',
        clientId,
        clientSecret
      );

      expect(request.headers['Authorization']).toBe(`Basic ${expectedAuth}`);
    });

    it('should include grant_type, code, and redirect_uri in data', () => {
      const request = createBasicAuthTokenRequest(
        'https://auth.example.com/token',
        'auth_code_123',
        'client_id',
        'client_secret'
      );

      const params = Object.fromEntries(request.data);
      expect(params.grant_type).toBe('authorization_code');
      expect(params.code).toBe('auth_code_123');
      expect(params.redirect_uri).toBe('https://example.com/callback');
    });
  });

  describe('createPKCETokenRequest', () => {
    it('should create valid PKCE token request without client secret', () => {
      const tokenUrl = 'https://auth.example.com/token';
      const code = 'auth_code_123';
      const clientId = 'client_id_abc';
      const codeVerifier = 'code_verifier_xyz';

      const request = createPKCETokenRequest(tokenUrl, code, clientId, codeVerifier);

      expect(request.url).toBe(tokenUrl);
      expect(request.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
      expect(request.headers['Authorization']).toBeUndefined();
    });

    it('should include code_verifier and client_id in data', () => {
      const request = createPKCETokenRequest(
        'https://auth.example.com/token',
        'auth_code_123',
        'client_id_abc',
        'code_verifier_xyz'
      );

      const params = Object.fromEntries(request.data);
      expect(params.grant_type).toBe('authorization_code');
      expect(params.code).toBe('auth_code_123');
      expect(params.client_id).toBe('client_id_abc');
      expect(params.code_verifier).toBe('code_verifier_xyz');
      expect(params.redirect_uri).toBe('https://example.com/callback');
    });

    it('should include client_secret when provided', () => {
      const request = createPKCETokenRequest(
        'https://auth.example.com/token',
        'auth_code_123',
        'client_id_abc',
        'code_verifier_xyz',
        'client_secret_123'
      );

      const params = Object.fromEntries(request.data);
      expect(params.client_secret).toBe('client_secret_123');
    });

    it('should not include client_secret when not provided', () => {
      const request = createPKCETokenRequest(
        'https://auth.example.com/token',
        'auth_code_123',
        'client_id_abc',
        'code_verifier_xyz'
      );

      const params = Object.fromEntries(request.data);
      expect(params.client_secret).toBeUndefined();
    });
  });

  describe('parseState', () => {
    it('should parse valid base64url encoded state', () => {
      const stateData = { id: 'abc123', provider: 'epic' };
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const parsed = parseState(encodedState);

      expect(parsed).toEqual(stateData);
    });

    it('should handle state with PKCE code verifier', () => {
      const stateData = { id: 'abc123', provider: 'epic', cv: 'code_verifier_here' };
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const parsed = parseState(encodedState);

      expect(parsed).toEqual(stateData);
      expect(parsed.cv).toBe('code_verifier_here');
    });

    it('should return null for invalid base64url', () => {
      const parsed = parseState('invalid!!!base64');

      expect(parsed).toBeNull();
    });

    it('should return null for valid base64 but invalid JSON', () => {
      const invalidJson = Buffer.from('not valid json').toString('base64url');

      const parsed = parseState(invalidJson);

      expect(parsed).toBeNull();
    });

    it('should return null for empty state', () => {
      const parsed = parseState('');

      expect(parsed).toBeNull();
    });
  });

  describe('initiateOAuth', () => {
    let mockReq, mockRes;

    beforeEach(() => {
      mockReq = {
        user: { email: 'test@example.com' }
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
        redirect: jest.fn()
      };
    });

    it('should return 500 if OAuth config is missing', () => {
      getOAuthConfig.mockReturnValue(null);

      initiateOAuth('unknown', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('UNKNOWN_CLIENT_ID'));
    });

    it('should return 500 if client ID is missing', () => {
      getOAuthConfig.mockReturnValue({
        clientId: null,
        authUrl: 'https://auth.example.com/authorize'
      });

      initiateOAuth('epic', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('EPIC_CLIENT_ID'));
    });

    it('should return 500 if REDIRECT_URI is missing', () => {
      delete process.env.REDIRECT_URI;
      getOAuthConfig.mockReturnValue({
        clientId: 'test_client_id',
        authUrl: 'https://auth.example.com/authorize',
        scope: 'patient/*.read'
      });

      initiateOAuth('epic', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Missing REDIRECT_URI environment variable');
    });

    it('should redirect to authorization URL for non-PKCE provider', () => {
      getOAuthConfig.mockReturnValue({
        clientId: 'test_client_id',
        authUrl: 'https://auth.example.com/authorize',
        scope: 'patient/*.read',
        usesPKCE: false,
        requiresAud: false,
        displayName: 'Test Provider'
      });

      initiateOAuth('test', mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('https://auth.example.com/authorize');
      expect(redirectUrl).toContain('client_id=test_client_id');
      expect(redirectUrl).toContain('response_type=code');
      expect(redirectUrl).not.toContain('code_challenge');
    });

    it('should include PKCE parameters for PKCE-enabled provider', () => {
      getOAuthConfig.mockReturnValue({
        clientId: 'test_client_id',
        authUrl: 'https://auth.example.com/authorize',
        scope: 'patient/*.read',
        usesPKCE: true,
        requiresAud: false,
        displayName: 'Epic'
      });

      initiateOAuth('epic', mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('code_challenge=');
      expect(redirectUrl).toContain('code_challenge_method=S256');
    });

    it('should include aud parameter when required', () => {
      getOAuthConfig.mockReturnValue({
        clientId: 'test_client_id',
        authUrl: 'https://auth.example.com/authorize',
        scope: 'patient/*.read',
        usesPKCE: false,
        requiresAud: true,
        audUrl: 'https://fhir.example.com/r4',
        displayName: 'Test Provider'
      });

      initiateOAuth('test', mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('aud=');
    });

    it('should use FHIR base URL as aud when audUrl is not provided', () => {
      getOAuthConfig.mockReturnValue({
        clientId: 'test_client_id',
        authUrl: 'https://auth.example.com/authorize',
        scope: 'patient/*.read',
        usesPKCE: false,
        requiresAud: true,
        audUrl: null,
        displayName: 'Test Provider'
      });
      getFhirBaseUrl.mockReturnValue('https://fhir.fallback.com/r4');

      initiateOAuth('test', mockReq, mockRes);

      expect(getFhirBaseUrl).toHaveBeenCalledWith('test');
      const redirectUrl = mockRes.redirect.mock.calls[0][0];
      expect(redirectUrl).toContain('aud=https%3A%2F%2Ffhir.fallback.com%2Fr4');
    });

    it('should handle anonymous users', () => {
      mockReq.user = null;
      getOAuthConfig.mockReturnValue({
        clientId: 'test_client_id',
        authUrl: 'https://auth.example.com/authorize',
        scope: 'patient/*.read',
        usesPKCE: false,
        requiresAud: false,
        displayName: 'Test Provider'
      });

      initiateOAuth('test', mockReq, mockRes);

      expect(mockRes.redirect).toHaveBeenCalled();
    });
  });
});
