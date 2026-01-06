/**
 * FHIR Client Tests
 */

const axios = require('axios');

// Mock axios
jest.mock('axios');

// Mock the logger
jest.mock('../../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Mock providers module
jest.mock('../../src/lib/providers', () => ({
  getFhirBaseUrl: jest.fn()
}));

const {
  fetchFhirResource,
  fetchConnectionData,
  fetchPaginatedResource
} = require('../../src/lib/fhir-client');

const { getFhirBaseUrl } = require('../../src/lib/providers');
const logger = require('../../src/logger');

describe('FHIR Client Module', () => {
  const mockConnection = {
    provider: 'epic',
    access_token: 'test_access_token_123',
    patient_id: 'patient-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getFhirBaseUrl.mockReturnValue('https://fhir.epic.com/api/FHIR/R4');
  });

  describe('fetchFhirResource', () => {
    it('should fetch a FHIR resource with correct headers', async () => {
      const mockResponse = {
        data: {
          resourceType: 'Patient',
          id: 'patient-123'
        }
      };
      axios.get.mockResolvedValue(mockResponse);

      const result = await fetchFhirResource(mockConnection, 'Patient/patient-123');

      expect(axios.get).toHaveBeenCalledWith(
        'https://fhir.epic.com/api/FHIR/R4/Patient/patient-123',
        {
          params: {},
          headers: {
            'Authorization': 'Bearer test_access_token_123',
            'Accept': 'application/fhir+json'
          }
        }
      );
      expect(result.data.resourceType).toBe('Patient');
    });

    it('should pass query parameters to the request', async () => {
      axios.get.mockResolvedValue({ data: { entry: [] } });

      await fetchFhirResource(mockConnection, 'MedicationRequest', {
        patient: 'patient-123',
        status: 'active'
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: {
            patient: 'patient-123',
            status: 'active'
          }
        })
      );
    });

    it('should use provider-specific FHIR base URL', async () => {
      getFhirBaseUrl.mockReturnValue('https://fhir.cerner.com/api');
      axios.get.mockResolvedValue({ data: {} });

      const cernerConnection = { ...mockConnection, provider: 'cerner' };
      await fetchFhirResource(cernerConnection, 'Patient/123');

      expect(getFhirBaseUrl).toHaveBeenCalledWith('cerner');
      expect(axios.get).toHaveBeenCalledWith(
        'https://fhir.cerner.com/api/Patient/123',
        expect.any(Object)
      );
    });

    it('should propagate axios errors', async () => {
      const error = new Error('Network Error');
      axios.get.mockRejectedValue(error);

      await expect(fetchFhirResource(mockConnection, 'Patient/123'))
        .rejects.toThrow('Network Error');
    });
  });

  describe('fetchConnectionData', () => {
    it('should fetch all resource types for a connection', async () => {
      const mockPatient = { resourceType: 'Patient', id: 'patient-123' };
      const mockMeds = { entry: [{ resource: { resourceType: 'MedicationRequest' } }] };
      const mockLabs = { entry: [{ resource: { resourceType: 'Observation' } }] };
      const mockConditions = { entry: [{ resource: { resourceType: 'Condition' } }] };
      const mockEncounters = { entry: [{ resource: { resourceType: 'Encounter' } }] };
      const mockClaims = { entry: [{ resource: { resourceType: 'ExplanationOfBenefit' } }] };

      axios.get
        .mockResolvedValueOnce({ data: mockPatient })        // Patient
        .mockResolvedValueOnce({ data: mockMeds })           // Medications
        .mockResolvedValueOnce({ data: mockLabs })           // Labs
        .mockResolvedValueOnce({ data: mockConditions })     // Conditions
        .mockResolvedValueOnce({ data: mockEncounters })     // Encounters
        .mockResolvedValueOnce({ data: mockClaims });        // Claims

      const results = await fetchConnectionData(mockConnection);

      expect(results.patient).toEqual(mockPatient);
      expect(results.medications).toHaveLength(1);
      expect(results.labs).toHaveLength(1);
      expect(results.conditions).toHaveLength(1);
      expect(results.encounters).toHaveLength(1);
      expect(results.claims).toHaveLength(1);
      expect(results.errors).toHaveLength(0);
    });

    it('should handle empty bundles gracefully', async () => {
      axios.get
        .mockResolvedValueOnce({ data: { resourceType: 'Patient' } })
        .mockResolvedValueOnce({ data: {} })  // No entry field
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} });

      const results = await fetchConnectionData(mockConnection);

      expect(results.medications).toEqual([]);
      expect(results.labs).toEqual([]);
      expect(results.conditions).toEqual([]);
      expect(results.encounters).toEqual([]);
      expect(results.claims).toEqual([]);
    });

    it('should record patient fetch errors', async () => {
      axios.get.mockRejectedValueOnce(new Error('Patient not found'));
      // Other calls succeed
      axios.get.mockResolvedValue({ data: {} });

      const results = await fetchConnectionData(mockConnection);

      expect(results.patient).toBeNull();
      expect(results.errors).toContainEqual({
        resource: 'Patient',
        error: 'Patient not found'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to fetch patient',
        expect.any(Object)
      );
    });

    it('should record medication fetch errors', async () => {
      axios.get
        .mockResolvedValueOnce({ data: { resourceType: 'Patient' } }) // Patient succeeds
        .mockRejectedValueOnce(new Error('Medications error'))         // Medications fail
        .mockResolvedValue({ data: {} });                              // Others succeed

      const results = await fetchConnectionData(mockConnection);

      expect(results.errors).toContainEqual({
        resource: 'MedicationRequest',
        error: 'Medications error'
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to fetch medications',
        expect.any(Object)
      );
    });

    it('should silently handle claims errors (debug level)', async () => {
      axios.get
        .mockResolvedValueOnce({ data: { resourceType: 'Patient' } })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockResolvedValueOnce({ data: {} })
        .mockRejectedValueOnce(new Error('Claims not supported'));

      const results = await fetchConnectionData(mockConnection);

      // Claims errors should not be in the errors array
      expect(results.errors).toHaveLength(0);
      expect(logger.debug).toHaveBeenCalledWith(
        'Claims not available',
        expect.any(Object)
      );
    });

    it('should continue fetching even if some resources fail', async () => {
      axios.get
        .mockResolvedValueOnce({ data: { resourceType: 'Patient' } })
        .mockRejectedValueOnce(new Error('Medications error'))
        .mockRejectedValueOnce(new Error('Labs error'))
        .mockResolvedValueOnce({ data: { entry: [{ id: 1 }] } })  // Conditions succeed
        .mockResolvedValue({ data: {} });

      const results = await fetchConnectionData(mockConnection);

      expect(results.patient).not.toBeNull();
      expect(results.conditions).toHaveLength(1);
      expect(results.errors).toHaveLength(2);
    });
  });

  describe('fetchPaginatedResource', () => {
    it('should fetch a single page when no next link', async () => {
      const mockBundle = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '1' } }, { resource: { id: '2' } }]
      };
      axios.get.mockResolvedValue({ data: mockBundle });

      const entries = await fetchPaginatedResource(mockConnection, 'Observation', {
        patient: 'patient-123'
      });

      expect(entries).toHaveLength(2);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('should follow pagination links', async () => {
      const page1 = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '1' } }],
        link: [{ relation: 'next', url: 'https://fhir.epic.com/page2' }]
      };
      const page2 = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '2' } }],
        link: [{ relation: 'next', url: 'https://fhir.epic.com/page3' }]
      };
      const page3 = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '3' } }]
        // No next link
      };

      axios.get
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 })
        .mockResolvedValueOnce({ data: page3 });

      const entries = await fetchPaginatedResource(mockConnection, 'Observation');

      expect(entries).toHaveLength(3);
      expect(axios.get).toHaveBeenCalledTimes(3);
    });

    it('should respect maxPages limit', async () => {
      const pageWithNext = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '1' } }],
        link: [{ relation: 'next', url: 'https://fhir.epic.com/next' }]
      };

      // Always return a page with next link
      axios.get.mockResolvedValue({ data: pageWithNext });

      const entries = await fetchPaginatedResource(mockConnection, 'Observation', {}, 3);

      // Should stop at maxPages (3)
      expect(axios.get).toHaveBeenCalledTimes(3);
      expect(entries).toHaveLength(3);
    });

    it('should handle empty bundles', async () => {
      const emptyBundle = {
        resourceType: 'Bundle'
        // No entry field
      };
      axios.get.mockResolvedValue({ data: emptyBundle });

      const entries = await fetchPaginatedResource(mockConnection, 'Observation');

      expect(entries).toEqual([]);
    });

    it('should stop pagination on error', async () => {
      const page1 = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '1' } }],
        link: [{ relation: 'next', url: 'https://fhir.epic.com/page2' }]
      };

      axios.get
        .mockResolvedValueOnce({ data: page1 })
        .mockRejectedValueOnce(new Error('Network error'));

      const entries = await fetchPaginatedResource(mockConnection, 'Observation');

      expect(entries).toHaveLength(1);
      expect(logger.error).toHaveBeenCalledWith(
        'Pagination error',
        expect.objectContaining({ resourceType: 'Observation' })
      );
    });

    it('should not pass params on subsequent pages', async () => {
      const page1 = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '1' } }],
        link: [{ relation: 'next', url: 'https://fhir.epic.com/page2?_page=2' }]
      };
      const page2 = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '2' } }]
      };

      axios.get
        .mockResolvedValueOnce({ data: page1 })
        .mockResolvedValueOnce({ data: page2 });

      await fetchPaginatedResource(mockConnection, 'Observation', { category: 'laboratory' });

      // First call should have params
      expect(axios.get.mock.calls[0][1].params).toEqual({ category: 'laboratory' });
      // Second call should have empty params (URL already contains page info)
      expect(axios.get.mock.calls[1][1].params).toEqual({});
    });

    it('should handle bundles with other link types', async () => {
      const bundle = {
        resourceType: 'Bundle',
        entry: [{ resource: { id: '1' } }],
        link: [
          { relation: 'self', url: 'https://fhir.epic.com/current' },
          { relation: 'first', url: 'https://fhir.epic.com/first' }
          // No 'next' link
        ]
      };
      axios.get.mockResolvedValue({ data: bundle });

      const entries = await fetchPaginatedResource(mockConnection, 'Observation');

      expect(entries).toHaveLength(1);
      expect(axios.get).toHaveBeenCalledTimes(1);
    });
  });
});
