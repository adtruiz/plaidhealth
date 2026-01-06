/**
 * Provider Configuration Tests
 */

// Mock the logger
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

const {
  PROVIDER_CONFIG,
  getProviderConfig,
  getFhirBaseUrl,
  getProviderDisplayName,
  getTokenUrl,
  getProviderType,
  isProviderConfigured,
  getOAuthConfig,
  getConfiguredProviders,
  getAllProviders
} = require('../../src/lib/providers');

describe('Provider Configuration Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('PROVIDER_CONFIG', () => {
    it('should contain all expected EMR providers', () => {
      const emrProviders = ['epic', 'smart', 'cerner', 'healow', 'meditech', 'nextgen', 'athenahealth'];
      emrProviders.forEach(provider => {
        expect(PROVIDER_CONFIG).toHaveProperty(provider);
        expect(PROVIDER_CONFIG[provider].type).toBe('emr');
      });
    });

    it('should contain all expected payer providers', () => {
      const payers = ['aetna', 'anthem', 'cigna', 'humana', 'uhc', 'kaiser', 'centene', 'molina', 'bcbsmn', 'bcbsma', 'bcbstn', 'hcsc', 'bluebutton'];
      payers.forEach(provider => {
        expect(PROVIDER_CONFIG).toHaveProperty(provider);
        expect(PROVIDER_CONFIG[provider].type).toBe('payer');
      });
    });

    it('should contain all expected lab providers', () => {
      const labs = ['quest', 'labcorp'];
      labs.forEach(provider => {
        expect(PROVIDER_CONFIG).toHaveProperty(provider);
        expect(PROVIDER_CONFIG[provider].type).toBe('lab');
      });
    });

    it('should have required fields for each provider', () => {
      Object.keys(PROVIDER_CONFIG).forEach(provider => {
        const config = PROVIDER_CONFIG[provider];
        expect(config).toHaveProperty('displayName');
        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('fhirBaseUrl');
        expect(config).toHaveProperty('tokenUrl');
        expect(config).toHaveProperty('clientId');
        expect(config).toHaveProperty('authUrl');
        expect(config).toHaveProperty('scope');
        expect(typeof config.requiresAud).toBe('boolean');
        expect(typeof config.usesPKCE).toBe('boolean');
      });
    });
  });

  describe('getProviderConfig', () => {
    it('should return config for valid provider', () => {
      const config = getProviderConfig('epic');

      expect(config).not.toBeNull();
      expect(config.displayName).toBe('Epic MyChart');
      expect(config.type).toBe('emr');
    });

    it('should return null for unknown provider', () => {
      const config = getProviderConfig('unknown_provider');

      expect(config).toBeNull();
    });

    it('should return config with functions for URL getters', () => {
      const config = getProviderConfig('cerner');

      expect(typeof config.fhirBaseUrl).toBe('function');
      expect(typeof config.tokenUrl).toBe('function');
      expect(typeof config.clientId).toBe('function');
      expect(typeof config.authUrl).toBe('function');
    });
  });

  describe('getFhirBaseUrl', () => {
    it('should return FHIR base URL from env var', () => {
      process.env.EPIC_FHIR_BASE_URL = 'https://fhir.epic.com/api/FHIR/R4';

      const url = getFhirBaseUrl('epic');

      expect(url).toBe('https://fhir.epic.com/api/FHIR/R4');
    });

    it('should fall back to Epic for unknown provider', () => {
      process.env.EPIC_FHIR_BASE_URL = 'https://fhir.epic.com/fallback';

      const url = getFhirBaseUrl('unknown');

      expect(url).toBe('https://fhir.epic.com/fallback');
    });

    it('should return undefined if env var not set', () => {
      delete process.env.CERNER_FHIR_BASE_URL;

      const url = getFhirBaseUrl('cerner');

      expect(url).toBeUndefined();
    });
  });

  describe('getProviderDisplayName', () => {
    it('should return correct display name for EMRs', () => {
      expect(getProviderDisplayName('epic')).toBe('Epic MyChart');
      expect(getProviderDisplayName('cerner')).toBe('Oracle Health (Cerner)');
      expect(getProviderDisplayName('athenahealth')).toBe('athenahealth');
    });

    it('should return correct display name for payers', () => {
      expect(getProviderDisplayName('aetna')).toBe('Aetna');
      expect(getProviderDisplayName('uhc')).toBe('UnitedHealthcare');
      expect(getProviderDisplayName('bluebutton')).toBe('Medicare (Blue Button 2.0)');
    });

    it('should return correct display name for labs', () => {
      expect(getProviderDisplayName('quest')).toBe('Quest Diagnostics');
      expect(getProviderDisplayName('labcorp')).toBe('LabCorp');
    });

    it('should fall back to Epic for unknown provider', () => {
      expect(getProviderDisplayName('unknown')).toBe('Epic MyChart');
    });
  });

  describe('getTokenUrl', () => {
    it('should return token URL from env var', () => {
      process.env.EPIC_TOKEN_URL = 'https://auth.epic.com/token';

      const url = getTokenUrl('epic');

      expect(url).toBe('https://auth.epic.com/token');
    });

    it('should fall back to Epic for unknown provider', () => {
      process.env.EPIC_TOKEN_URL = 'https://auth.epic.com/token/fallback';

      const url = getTokenUrl('unknown');

      expect(url).toBe('https://auth.epic.com/token/fallback');
    });
  });

  describe('getProviderType', () => {
    it('should return "emr" for EMR providers', () => {
      expect(getProviderType('epic')).toBe('emr');
      expect(getProviderType('cerner')).toBe('emr');
      expect(getProviderType('meditech')).toBe('emr');
    });

    it('should return "payer" for payer providers', () => {
      expect(getProviderType('aetna')).toBe('payer');
      expect(getProviderType('cigna')).toBe('payer');
      expect(getProviderType('bluebutton')).toBe('payer');
    });

    it('should return "lab" for lab providers', () => {
      expect(getProviderType('quest')).toBe('lab');
      expect(getProviderType('labcorp')).toBe('lab');
    });

    it('should return "unknown" for unknown provider', () => {
      expect(getProviderType('unknown')).toBe('unknown');
    });
  });

  describe('isProviderConfigured', () => {
    it('should return true when clientId and authUrl are set', () => {
      process.env.EPIC_CLIENT_ID = 'test_client_id';
      process.env.EPIC_AUTHORIZATION_URL = 'https://auth.epic.com/authorize';

      const configured = isProviderConfigured('epic');

      expect(configured).toBe(true);
    });

    it('should return false when clientId is missing', () => {
      delete process.env.EPIC_CLIENT_ID;
      process.env.EPIC_AUTHORIZATION_URL = 'https://auth.epic.com/authorize';

      const configured = isProviderConfigured('epic');

      expect(configured).toBe(false);
    });

    it('should return false when authUrl is missing', () => {
      process.env.EPIC_CLIENT_ID = 'test_client_id';
      delete process.env.EPIC_AUTHORIZATION_URL;

      const configured = isProviderConfigured('epic');

      expect(configured).toBe(false);
    });

    it('should return false for unknown provider', () => {
      const configured = isProviderConfigured('unknown');

      expect(configured).toBe(false);
    });
  });

  describe('getOAuthConfig', () => {
    it('should return OAuth config with all fields', () => {
      process.env.EPIC_CLIENT_ID = 'test_client_id';
      process.env.EPIC_AUTHORIZATION_URL = 'https://auth.epic.com/authorize';

      const config = getOAuthConfig('epic');

      expect(config).toHaveProperty('clientId', 'test_client_id');
      expect(config).toHaveProperty('authUrl', 'https://auth.epic.com/authorize');
      expect(config).toHaveProperty('scope');
      expect(config).toHaveProperty('requiresAud', true);
      expect(config).toHaveProperty('usesPKCE', true);
      expect(config).toHaveProperty('displayName', 'Epic MyChart');
    });

    it('should return null for unknown provider', () => {
      const config = getOAuthConfig('unknown');

      expect(config).toBeNull();
    });

    it('should include clientSecret when provider has one', () => {
      process.env.MEDITECH_CLIENT_ID = 'test_client';
      process.env.MEDITECH_CLIENT_SECRET = 'test_secret';
      process.env.MEDITECH_AUTHORIZATION_URL = 'https://auth.meditech.com/authorize';

      const config = getOAuthConfig('meditech');

      expect(config.clientSecret).toBe('test_secret');
      expect(config.usesPKCE).toBe(false);
    });

    it('should handle audUrl as string', () => {
      process.env.NEXTGEN_CLIENT_ID = 'test_client';
      process.env.NEXTGEN_AUTHORIZATION_URL = 'https://auth.nextgen.com/authorize';

      const config = getOAuthConfig('nextgen');

      expect(config.audUrl).toBe('https://fhir.nextgen.com/nge/prod/fhir-api-r4/fhir/r4');
    });

    it('should handle audUrl as function', () => {
      process.env.AETNA_CLIENT_ID = 'test_client';
      process.env.AETNA_AUTHORIZATION_URL = 'https://auth.aetna.com/authorize';
      process.env.AETNA_AUD = 'https://fhir.aetna.com/aud';

      const config = getOAuthConfig('aetna');

      expect(config.audUrl).toBe('https://fhir.aetna.com/aud');
    });
  });

  describe('getConfiguredProviders', () => {
    it('should return only configured providers', () => {
      // Configure only Epic
      process.env.EPIC_CLIENT_ID = 'test_client_id';
      process.env.EPIC_AUTHORIZATION_URL = 'https://auth.epic.com/authorize';

      // Ensure other providers are not configured
      delete process.env.CERNER_CLIENT_ID;
      delete process.env.AETNA_CLIENT_ID;

      const configured = getConfiguredProviders();

      expect(configured).toContain('epic');
    });

    it('should return empty array when no providers configured', () => {
      // Clear all provider env vars
      Object.keys(PROVIDER_CONFIG).forEach(provider => {
        const upperProvider = provider.toUpperCase();
        delete process.env[`${upperProvider}_CLIENT_ID`];
        delete process.env[`${upperProvider}_AUTHORIZATION_URL`];
      });

      const configured = getConfiguredProviders();

      expect(configured).toEqual([]);
    });
  });

  describe('getAllProviders', () => {
    it('should return all provider keys', () => {
      const providers = getAllProviders();

      expect(providers).toContain('epic');
      expect(providers).toContain('cerner');
      expect(providers).toContain('aetna');
      expect(providers).toContain('quest');
      expect(providers.length).toBe(Object.keys(PROVIDER_CONFIG).length);
    });

    it('should return array of strings', () => {
      const providers = getAllProviders();

      providers.forEach(p => {
        expect(typeof p).toBe('string');
      });
    });
  });

  describe('Provider-specific configurations', () => {
    it('should have correct PKCE settings for Epic', () => {
      const config = PROVIDER_CONFIG.epic;

      expect(config.usesPKCE).toBe(true);
      expect(config.requiresAud).toBe(true);
    });

    it('should have correct non-PKCE settings for Meditech', () => {
      const config = PROVIDER_CONFIG.meditech;

      expect(config.usesPKCE).toBe(false);
      expect(config.clientSecret).toBeDefined();
    });

    it('should have correct scope for Blue Button', () => {
      const config = PROVIDER_CONFIG.bluebutton;

      expect(config.scope).toContain('ExplanationOfBenefit');
      expect(config.scope).toContain('Coverage');
    });

    it('should have correct scope for Healow with granular permissions', () => {
      const config = PROVIDER_CONFIG.healow;

      expect(config.scope).toContain('patient/AllergyIntolerance.read');
      expect(config.scope).toContain('patient/MedicationRequest.read');
      expect(config.scope).toContain('patient/Observation.read');
    });
  });
});
