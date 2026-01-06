/**
 * Medications Normalizer Tests
 */

// Mock the rxnorm mappings
jest.mock('../../src/mappings/rxnorm.json', () => ({
  '197361': { name: 'Lisinopril 10 MG Oral Tablet', rxnorm: '197361', category: 'ACE Inhibitor' },
  '00071015523': { name: 'Lipitor 10mg', rxnorm: '617310', category: 'Statin' }
}));

// Mock the code lookup module
jest.mock('../../src/code-lookup', () => ({
  lookupRxNorm: jest.fn(),
  getRxNormClass: jest.fn()
}));

const normalizeMedications = require('../../src/normalizers/medications');
const { normalizeMedicationsSync } = require('../../src/normalizers/medications');
const { lookupRxNorm, getRxNormClass } = require('../../src/code-lookup');

describe('Medications Normalizer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeMedicationsSync', () => {
    it('should return empty array for null input', () => {
      expect(normalizeMedicationsSync(null, 'epic')).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(normalizeMedicationsSync(undefined, 'epic')).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      expect(normalizeMedicationsSync([], 'epic')).toEqual([]);
    });

    it('should normalize basic medication with text name', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          text: 'Lisinopril 10 MG Oral Tablet',
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'
          }]
        },
        status: 'active',
        authoredOn: '2023-06-15'
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('med-123');
      expect(result[0].name).toBe('Lisinopril 10 MG Oral Tablet');
      expect(result[0].code).toBe('197361');
      expect(result[0].codeSystem).toBe('RxNorm');
      expect(result[0].status).toBe('active');
      expect(result[0].prescribedDate).toBe('2023-06-15');
      expect(result[0].source).toBe('epic');
    });

    it('should extract name from coding display when text is missing', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '999999',
            display: 'Metformin 500 MG'
          }]
        }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].name).toBe('Metformin 500 MG');
    });

    it('should use local RxNorm mapping for name when available', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'
          }]
        }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].name).toBe('Lisinopril 10 MG Oral Tablet');
      expect(result[0].category).toBe('ACE Inhibitor');
    });

    it('should map NDC code to RxNorm', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://hl7.org/fhir/sid/ndc',
            code: '00071015523'
          }]
        }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].code).toBe('617310');
      expect(result[0].name).toBe('Lipitor 10mg');
    });

    it('should normalize medication status correctly', () => {
      const testCases = [
        { input: 'active', expected: 'active' },
        { input: 'completed', expected: 'completed' },
        { input: 'stopped', expected: 'stopped' },
        { input: 'on-hold', expected: 'on-hold' },
        { input: 'cancelled', expected: 'cancelled' },
        { input: 'entered-in-error', expected: 'error' },
        { input: 'draft', expected: 'draft' },
        { input: 'unknown_status', expected: 'unknown' }
      ];

      testCases.forEach(({ input, expected }) => {
        const medications = [{
          id: 'med-123',
          medicationCodeableConcept: { text: 'Test' },
          status: input
        }];

        const result = normalizeMedicationsSync(medications, 'epic');
        expect(result[0].status).toBe(expected);
      });
    });

    it('should extract dosage with quantity and unit', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: { text: 'Lisinopril' },
        dosageInstruction: [{
          text: 'Take 1 tablet by mouth daily',
          doseAndRate: [{
            doseQuantity: { value: 10, unit: 'mg' }
          }],
          timing: {
            code: { text: 'Daily' }
          },
          route: { text: 'Oral' }
        }]
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].dosage).toBe('Take 1 tablet by mouth daily');
      expect(result[0].dosageDetails).toEqual({
        text: 'Take 1 tablet by mouth daily',
        dose: 10,
        doseUnit: 'mg',
        frequency: 'Daily',
        route: 'Oral',
        instructions: null
      });
    });

    it('should extract dosage from timing repeat', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: { text: 'Test Med' },
        dosageInstruction: [{
          doseAndRate: [{
            doseQuantity: { value: 500, unit: 'mg' }
          }],
          timing: {
            repeat: {
              frequency: 2,
              period: 1,
              periodUnit: 'day'
            }
          }
        }]
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].dosageDetails.text).toBe('500 mg 2x per 1 day');
    });

    it('should extract prescriber information', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: { text: 'Test Med' },
        requester: {
          display: 'Dr. Smith',
          reference: 'Practitioner/123'
        }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].prescriber).toEqual({
        name: 'Dr. Smith',
        reference: 'Practitioner/123'
      });
    });

    it('should extract dispense request details', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: { text: 'Test Med' },
        dispenseRequest: {
          numberOfRepeatsAllowed: 3,
          quantity: { value: 30 },
          expectedSupplyDuration: { value: 30 }
        }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].refillsAllowed).toBe(3);
      expect(result[0].quantity).toBe(30);
      expect(result[0].daysSupply).toBe(30);
    });

    it('should handle missing optional fields', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: { text: 'Simple Med' }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0].dosage).toBeNull();
      expect(result[0].dosageDetails).toBeNull();
      expect(result[0].prescriber).toBeNull();
      expect(result[0].refillsAllowed).toBeNull();
      expect(result[0].quantity).toBeNull();
      expect(result[0].daysSupply).toBeNull();
    });

    it('should preserve raw FHIR data', () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: { text: 'Test' },
        meta: { versionId: '1' }
      }];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result[0]._raw).toEqual(medications[0]);
    });

    it('should process multiple medications', () => {
      const medications = [
        { id: 'med-1', medicationCodeableConcept: { text: 'Med A' } },
        { id: 'med-2', medicationCodeableConcept: { text: 'Med B' } },
        { id: 'med-3', medicationCodeableConcept: { text: 'Med C' } }
      ];

      const result = normalizeMedicationsSync(medications, 'epic');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Med A');
      expect(result[1].name).toBe('Med B');
      expect(result[2].name).toBe('Med C');
    });
  });

  describe('normalizeMedications (async)', () => {
    it('should return empty array for empty input', async () => {
      const result = await normalizeMedications([], 'epic');
      expect(result).toEqual([]);
    });

    it('should call API lookup for unknown codes when enabled', async () => {
      lookupRxNorm.mockResolvedValue({ name: 'API Medication Name' });
      getRxNormClass.mockResolvedValue({ className: 'Antihypertensive' });

      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '999999999'  // Not in local mappings
          }]
        }
      }];

      const result = await normalizeMedications(medications, 'epic', { enableApiLookup: true });

      expect(lookupRxNorm).toHaveBeenCalledWith('999999999');
      expect(result[0].name).toBe('API Medication Name');
      expect(result[0].category).toBe('Antihypertensive');
      expect(result[0]._enriched).toBe(true);
    });

    it('should not call API lookup when disabled', async () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '999999999'
          }]
        }
      }];

      await normalizeMedications(medications, 'epic', { enableApiLookup: false });

      expect(lookupRxNorm).not.toHaveBeenCalled();
    });

    it('should not call API for codes in local mappings', async () => {
      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '197361'  // In local mappings
          }]
        }
      }];

      const result = await normalizeMedications(medications, 'epic', { enableApiLookup: true });

      expect(lookupRxNorm).not.toHaveBeenCalled();
      expect(result[0].name).toBe('Lisinopril 10 MG Oral Tablet');
    });

    it('should handle API lookup failures gracefully', async () => {
      lookupRxNorm.mockRejectedValue(new Error('API Error'));

      const medications = [{
        id: 'med-123',
        medicationCodeableConcept: {
          coding: [{
            system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            code: '999999999',
            display: 'Fallback Name'
          }]
        }
      }];

      const result = await normalizeMedications(medications, 'epic', { enableApiLookup: true });

      // Should not throw, should use fallback
      expect(result[0].name).toBe('Fallback Name');
    });
  });
});
