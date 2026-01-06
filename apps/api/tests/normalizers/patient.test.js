/**
 * Patient Normalizer Tests
 */

const normalizePatient = require('../../src/normalizers/patient');

describe('Patient Normalizer', () => {
  describe('normalizePatient', () => {
    it('should return null for null input', () => {
      expect(normalizePatient(null, 'epic')).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(normalizePatient(undefined, 'epic')).toBeNull();
    });

    it('should normalize basic patient with given/family name', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{
          use: 'official',
          given: ['John', 'Robert'],
          family: 'Doe'
        }],
        birthDate: '1990-05-15',
        gender: 'male'
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.id).toBe('patient-123');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.fullName).toBe('John Doe');
      expect(result.dateOfBirth).toBe('1990-05-15');
      expect(result.gender).toBe('male');
      expect(result.source).toBe('epic');
    });

    it('should handle Cerner-style "LASTNAME, FIRSTNAME" text format', () => {
      const fhirPatient = {
        id: 'patient-456',
        name: [{
          use: 'official',
          text: 'DOE, JOHN'
        }],
        gender: 'male'
      };

      const result = normalizePatient(fhirPatient, 'cerner');

      expect(result.firstName).toBe('JOHN');
      expect(result.lastName).toBe('DOE');
      expect(result.fullName).toBe('JOHN DOE');
    });

    it('should handle "FIRSTNAME LASTNAME" text format', () => {
      const fhirPatient = {
        id: 'patient-789',
        name: [{
          text: 'John Robert Doe'
        }]
      };

      const result = normalizePatient(fhirPatient, 'athena');

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Robert Doe');
      expect(result.fullName).toBe('John Robert Doe');
    });

    it('should prefer official name over other names', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [
          { use: 'nickname', given: ['Johnny'], family: 'D' },
          { use: 'official', given: ['John'], family: 'Doe' }
        ]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should fall back to first name when no official name', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['Jane'], family: 'Smith' }]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
    });

    it('should handle missing name gracefully', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: []
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.firstName).toBeNull();
      expect(result.lastName).toBeNull();
      expect(result.fullName).toBeNull();
    });

    it('should extract phone number from telecom', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        telecom: [
          { system: 'phone', value: '555-123-4567', use: 'home' },
          { system: 'email', value: 'john@example.com' }
        ]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.phone).toBe('555-123-4567');
      expect(result.email).toBe('john@example.com');
    });

    it('should handle missing telecom', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.phone).toBeNull();
      expect(result.email).toBeNull();
    });

    it('should extract home address', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        address: [{
          use: 'home',
          line: ['123 Main St', 'Apt 4B'],
          city: 'Boston',
          state: 'MA',
          postalCode: '02101',
          country: 'USA'
        }]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.address).toEqual({
        line1: '123 Main St',
        line2: 'Apt 4B',
        city: 'Boston',
        state: 'MA',
        postalCode: '02101',
        country: 'USA'
      });
    });

    it('should prefer home address over other addresses', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        address: [
          { use: 'work', city: 'Cambridge' },
          { use: 'home', city: 'Boston' }
        ]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.address.city).toBe('Boston');
    });

    it('should default country to US', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        address: [{
          city: 'Boston',
          state: 'MA'
        }]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.address.country).toBe('US');
    });

    it('should handle missing address', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }]
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result.address).toBeNull();
    });

    it('should normalize gender correctly', () => {
      const testCases = [
        { input: 'male', expected: 'male' },
        { input: 'female', expected: 'female' },
        { input: 'other', expected: 'other' },
        { input: 'unknown', expected: 'unknown' },
        { input: 'M', expected: 'male' },
        { input: 'F', expected: 'female' },
        { input: 'invalid', expected: 'unknown' },
        { input: undefined, expected: 'unknown' }
      ];

      testCases.forEach(({ input, expected }) => {
        const fhirPatient = {
          id: 'patient-123',
          name: [{ given: ['Test'] }],
          gender: input
        };

        const result = normalizePatient(fhirPatient, 'epic');
        expect(result.gender).toBe(expected);
      });
    });

    it('should include source provider', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'] }]
      };

      const resultEpic = normalizePatient(fhirPatient, 'epic');
      const resultCerner = normalizePatient(fhirPatient, 'cerner');
      const resultAetna = normalizePatient(fhirPatient, 'aetna');

      expect(resultEpic.source).toBe('epic');
      expect(resultCerner.source).toBe('cerner');
      expect(resultAetna.source).toBe('aetna');
    });

    it('should preserve raw FHIR data in _raw field', () => {
      const fhirPatient = {
        id: 'patient-123',
        name: [{ given: ['John'], family: 'Doe' }],
        meta: { versionId: '1' }
      };

      const result = normalizePatient(fhirPatient, 'epic');

      expect(result._raw).toEqual(fhirPatient);
    });
  });
});
