/**
 * FHIR Routes Tests
 */

const express = require('express');
const request = require('supertest');

// Mock dependencies
jest.mock('../../src/db', () => ({
  epicDb: {
    getConnections: jest.fn(),
    getConnectionById: jest.fn(),
    deleteConnection: jest.fn()
  },
  auditDb: {
    log: jest.fn()
  }
}));

jest.mock('../../src/lib/providers', () => ({
  getFhirBaseUrl: jest.fn(() => 'https://fhir.epic.com/api/FHIR/R4'),
  getProviderDisplayName: jest.fn(() => 'Epic MyChart')
}));

jest.mock('../../src/normalizers', () => ({
  normalizePatient: jest.fn(p => ({ id: p?.id, firstName: 'Test', lastName: 'User' })),
  normalizeLabs: jest.fn(async () => []),
  normalizeMedications: jest.fn(async () => []),
  normalizeConditions: jest.fn(() => []),
  normalizeEncounters: jest.fn(() => [])
}));

jest.mock('../../src/deduplication', () => ({
  deduplicateMedications: jest.fn(m => m),
  deduplicateConditions: jest.fn(c => c),
  deduplicateLabs: jest.fn(l => l),
  deduplicateEncounters: jest.fn(e => e)
}));

jest.mock('../../src/chart-helpers', () => ({
  processLabTrendsData: jest.fn(() => []),
  processMedicationTimelineData: jest.fn(() => []),
  processHealthTimelineData: jest.fn(() => []),
  processConditionStats: jest.fn(() => ({})),
  processOverviewStats: jest.fn(() => ({}))
}));

jest.mock('../../src/middleware/auth', () => ({
  authenticate: jest.fn(() => (req, res, next) => {
    req.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
    next();
  })
}));

jest.mock('axios');

const { epicDb, auditDb } = require('../../src/db');
const axios = require('axios');

describe('FHIR Routes', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock isAuthenticated for session auth
    app.use((req, res, next) => {
      req.isAuthenticated = () => true;
      req.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      req.ip = '127.0.0.1';
      req.get = jest.fn((header) => {
        if (header === 'user-agent') return 'test-agent';
        return null;
      });
      next();
    });

    const fhirRoutes = require('../../src/routes/fhir');
    app.use('/api', fhirRoutes);
  });

  describe('GET /api/user', () => {
    it('should return current user info when authenticated', async () => {
      const res = await request(app).get('/api/user');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        profile_picture: undefined
      });
    });

    it('should return 401 when not authenticated', async () => {
      // Override isAuthenticated
      app = express();
      app.use((req, res, next) => {
        req.isAuthenticated = () => false;
        next();
      });
      const fhirRoutes = require('../../src/routes/fhir');
      app.use('/api', fhirRoutes);

      const res = await request(app).get('/api/user');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not logged in');
    });
  });

  describe('GET /api/epic-connections', () => {
    it('should return user connections', async () => {
      epicDb.getConnections.mockResolvedValue([
        { id: 1, provider: 'epic', patient_id: 'patient-123' },
        { id: 2, provider: 'cerner', patient_id: 'patient-456' }
      ]);

      const res = await request(app).get('/api/epic-connections');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(epicDb.getConnections).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no connections', async () => {
      epicDb.getConnections.mockResolvedValue([]);

      const res = await request(app).get('/api/epic-connections');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      epicDb.getConnections.mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/api/epic-connections');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch connections');
    });
  });

  describe('DELETE /api/epic-connections/:id', () => {
    it('should delete connection and log audit', async () => {
      epicDb.deleteConnection.mockResolvedValue();
      auditDb.log.mockResolvedValue();

      const res = await request(app).delete('/api/epic-connections/123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(epicDb.deleteConnection).toHaveBeenCalledWith('user-123', '123');
      expect(auditDb.log).toHaveBeenCalledWith(
        'user-123',
        'epic_disconnect',
        'epic_connection',
        '123',
        expect.any(String),  // IP can be IPv4 or IPv6-mapped
        'test-agent'
      );
    });

    it('should handle delete errors', async () => {
      epicDb.deleteConnection.mockRejectedValue(new Error('Delete error'));

      const res = await request(app).delete('/api/epic-connections/123');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to delete connection');
    });
  });

  describe('GET /api/health-records/unified', () => {
    it('should return empty data when no connections', async () => {
      epicDb.getConnections.mockResolvedValue([]);

      const res = await request(app).get('/api/health-records/unified');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        connections: [],
        patients: [],
        medications: [],
        conditions: [],
        labs: [],
        encounters: []
      });
    });

    it('should aggregate data from multiple connections', async () => {
      epicDb.getConnections.mockResolvedValue([
        { id: 1, provider: 'epic', patient_id: 'patient-123', access_token: 'token1' }
      ]);

      // Mock axios responses
      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Patient',
          id: 'patient-123'
        }
      });

      const res = await request(app).get('/api/health-records/unified');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('connections');
      expect(res.body).toHaveProperty('patients');
      expect(res.body).toHaveProperty('medications');
    });
  });

  describe('GET /api/v1/patient', () => {
    it('should return normalized patient data', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Patient',
          id: 'patient-123',
          name: [{ given: ['John'], family: 'Doe' }]
        }
      });

      const res = await request(app).get('/api/v1/patient?connection_id=1');

      expect(res.status).toBe(200);
      // Response has 'data' wrapper with patient info
      expect(res.body).toHaveProperty('data');
    });

    it('should return data structure with meta', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Patient',
          id: 'patient-123'
        }
      });

      const res = await request(app).get('/api/v1/patient?connection_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /api/v1/medications', () => {
    it('should return normalized medications with data wrapper', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            { resource: { resourceType: 'MedicationRequest', id: 'med-1' } }
          ]
        }
      });

      const res = await request(app).get('/api/v1/medications?connection_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /api/v1/labs', () => {
    it('should return normalized lab results with data wrapper', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            { resource: { resourceType: 'Observation', id: 'lab-1' } }
          ]
        }
      });

      const res = await request(app).get('/api/v1/labs?connection_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /api/v1/conditions', () => {
    it('should return normalized conditions with data wrapper', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            { resource: { resourceType: 'Condition', id: 'cond-1' } }
          ]
        }
      });

      const res = await request(app).get('/api/v1/conditions?connection_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /api/v1/encounters', () => {
    it('should return normalized encounters with data wrapper', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: {
          resourceType: 'Bundle',
          entry: [
            { resource: { resourceType: 'Encounter', id: 'enc-1' } }
          ]
        }
      });

      const res = await request(app).get('/api/v1/encounters?connection_id=1');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
    });
  });

  describe('GET /api/v1/health-records', () => {
    it('should return all health records for a connection', async () => {
      epicDb.getConnectionById.mockResolvedValue({
        id: 1,
        provider: 'epic',
        patient_id: 'patient-123',
        access_token: 'valid-token'
      });

      axios.get.mockResolvedValue({
        data: { resourceType: 'Patient', id: 'patient-123' }
      });

      const res = await request(app).get('/api/v1/health-records?connection_id=1');

      expect(res.status).toBe(200);
      // Response has data wrapper containing all records
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toHaveProperty('patient');
      expect(res.body.data).toHaveProperty('medications');
      expect(res.body.data).toHaveProperty('labs');
      expect(res.body.data).toHaveProperty('conditions');
      expect(res.body.data).toHaveProperty('encounters');
    });
  });
});
