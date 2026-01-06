/**
 * Conditions Normalizer Tests
 */

// Mock the icd10 mappings
jest.mock('../../src/mappings/icd10.json', () => ({
  '44054006': { name: 'Type 2 Diabetes', icd10: 'E11.9' },
  'J06.9': { name: 'Acute upper respiratory infection' }
}));

const normalizeConditions = require('../../src/normalizers/conditions');

describe('Conditions Normalizer', () => {
  describe('normalizeConditions', () => {
    it('should return empty array for null input', () => {
      expect(normalizeConditions(null, 'epic')).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(normalizeConditions(undefined, 'epic')).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      expect(normalizeConditions([], 'epic')).toEqual([]);
    });

    it('should normalize basic condition with text name', () => {
      const conditions = [{
        id: 'condition-123',
        code: {
          text: 'Type 2 Diabetes Mellitus',
          coding: [{
            system: 'http://hl7.org/fhir/sid/icd-10-cm',
            code: 'E11.9'
          }]
        },
        clinicalStatus: {
          coding: [{ code: 'active' }]
        },
        verificationStatus: {
          coding: [{ code: 'confirmed' }]
        },
        recordedDate: '2023-06-15'
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('condition-123');
      expect(result[0].name).toBe('Type 2 Diabetes Mellitus');
      expect(result[0].code).toBe('E11.9');
      expect(result[0].codeSystem).toBe('ICD-10');
      expect(result[0].clinicalStatus).toBe('active');
      expect(result[0].verificationStatus).toBe('confirmed');
      expect(result[0].recordedDate).toBe('2023-06-15');
      expect(result[0].source).toBe('epic');
    });

    it('should extract name from coding display when text is missing', () => {
      const conditions = [{
        id: 'condition-123',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '73211009',
            display: 'Diabetes mellitus'
          }]
        }
      }];

      const result = normalizeConditions(conditions, 'cerner');

      expect(result[0].name).toBe('Diabetes mellitus');
    });

    it('should map SNOMED code to ICD-10 when mapping exists', () => {
      const conditions = [{
        id: 'condition-123',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '44054006',
            display: 'Diabetes'
          }]
        }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].code).toBe('E11.9');
      expect(result[0].codeSystem).toBe('ICD-10');
    });

    it('should keep SNOMED code when no ICD-10 mapping exists', () => {
      const conditions = [{
        id: 'condition-123',
        code: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '999999999',
            display: 'Some condition'
          }]
        }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].code).toBe('999999999');
      expect(result[0].codeSystem).toBe('SNOMED');
    });

    it('should normalize clinical status correctly', () => {
      const testCases = [
        { input: 'active', expected: 'active' },
        { input: 'recurrence', expected: 'active' },
        { input: 'relapse', expected: 'active' },
        { input: 'inactive', expected: 'inactive' },
        { input: 'remission', expected: 'inactive' },
        { input: 'resolved', expected: 'resolved' },
        { input: 'unknown_status', expected: 'unknown' }
      ];

      testCases.forEach(({ input, expected }) => {
        const conditions = [{
          id: 'condition-123',
          code: { text: 'Test' },
          clinicalStatus: {
            coding: [{ code: input }]
          }
        }];

        const result = normalizeConditions(conditions, 'epic');
        expect(result[0].clinicalStatus).toBe(expected);
      });
    });

    it('should normalize verification status correctly', () => {
      const testCases = [
        { input: 'confirmed', expected: 'confirmed' },
        { input: 'provisional', expected: 'provisional' },
        { input: 'differential', expected: 'provisional' },
        { input: 'unconfirmed', expected: 'unconfirmed' },
        { input: 'refuted', expected: 'refuted' },
        { input: 'entered-in-error', expected: 'error' }
      ];

      testCases.forEach(({ input, expected }) => {
        const conditions = [{
          id: 'condition-123',
          code: { text: 'Test' },
          verificationStatus: {
            coding: [{ code: input }]
          }
        }];

        const result = normalizeConditions(conditions, 'epic');
        expect(result[0].verificationStatus).toBe(expected);
      });
    });

    it('should extract onset date from onsetDateTime', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' },
        onsetDateTime: '2022-01-15T10:30:00Z'
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].onsetDate).toBe('2022-01-15T10:30:00Z');
    });

    it('should extract onset date from onsetPeriod', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' },
        onsetPeriod: {
          start: '2022-01-01',
          end: '2022-12-31'
        }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].onsetDate).toBe('2022-01-01');
    });

    it('should extract onset date from onsetAge', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' },
        onsetAge: { value: 45, unit: 'years' }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].onsetDate).toBe('Age 45');
    });

    it('should extract onset date from onsetString', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' },
        onsetString: 'Childhood'
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].onsetDate).toBe('Childhood');
    });

    it('should extract category correctly', () => {
      const testCases = [
        { input: 'problem-list-item', expected: 'problem' },
        { input: 'encounter-diagnosis', expected: 'diagnosis' },
        { input: 'health-concern', expected: 'concern' }
      ];

      testCases.forEach(({ input, expected }) => {
        const conditions = [{
          id: 'condition-123',
          code: { text: 'Test' },
          category: [{
            coding: [{ code: input }]
          }]
        }];

        const result = normalizeConditions(conditions, 'epic');
        expect(result[0].category).toBe(expected);
      });
    });

    it('should extract severity when present', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' },
        severity: {
          coding: [{
            code: '24484000',
            display: 'Severe'
          }]
        }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].severity).toEqual({
        code: '24484000',
        display: 'Severe'
      });
    });

    it('should handle missing severity', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].severity).toBeNull();
    });

    it('should handle missing code gracefully', () => {
      const conditions = [{
        id: 'condition-123'
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0].name).toBe('Unknown Condition');
      expect(result[0].code).toBeNull();
    });

    it('should preserve raw FHIR data', () => {
      const conditions = [{
        id: 'condition-123',
        code: { text: 'Test' },
        meta: { versionId: '1' }
      }];

      const result = normalizeConditions(conditions, 'epic');

      expect(result[0]._raw).toEqual(conditions[0]);
    });

    it('should process multiple conditions', () => {
      const conditions = [
        { id: 'cond-1', code: { text: 'Hypertension' } },
        { id: 'cond-2', code: { text: 'Diabetes' } },
        { id: 'cond-3', code: { text: 'Asthma' } }
      ];

      const result = normalizeConditions(conditions, 'epic');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Hypertension');
      expect(result[1].name).toBe('Diabetes');
      expect(result[2].name).toBe('Asthma');
    });
  });
});
