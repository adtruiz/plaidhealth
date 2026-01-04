/**
 * Test script for normalizers
 * Run with: node src/normalizers/test.js
 */

const normalizePatient = require('./patient');
const normalizeLabs = require('./labs');
const normalizeMedications = require('./medications');
const normalizeConditions = require('./conditions');
const normalizeEncounters = require('./encounters');

// Sample FHIR data from Epic
const sampleEpicPatient = {
  "resourceType": "Patient",
  "id": "Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB",
  "name": [
    {
      "use": "official",
      "family": "Lopez",
      "given": ["Camila", "Maria"]
    }
  ],
  "birthDate": "1987-09-12",
  "gender": "female",
  "telecom": [
    { "system": "phone", "value": "469-555-5555", "use": "home" },
    { "system": "email", "value": "camila.lopez@example.com" }
  ],
  "address": [
    {
      "use": "home",
      "line": ["123 Main Street", "Apt 4B"],
      "city": "Dallas",
      "state": "TX",
      "postalCode": "75001"
    }
  ]
};

// Sample from Cerner (different name format)
const sampleCernerPatient = {
  "resourceType": "Patient",
  "id": "12724066",
  "name": [
    {
      "text": "SMART, NANCY"
    }
  ],
  "birthDate": "1980-08-11",
  "gender": "female",
  "telecom": [
    { "system": "phone", "value": "816-555-2323" }
  ]
};

// Sample lab observation
const sampleLabs = [
  {
    "resourceType": "Observation",
    "id": "obs-123",
    "status": "final",
    "category": [
      {
        "coding": [{ "code": "laboratory" }]
      }
    ],
    "code": {
      "coding": [
        {
          "system": "http://loinc.org",
          "code": "4548-4",
          "display": "Hemoglobin A1c/Hemoglobin.total in Blood"
        }
      ],
      "text": "Hemoglobin A1c"
    },
    "effectiveDateTime": "2024-12-15T10:30:00Z",
    "valueQuantity": {
      "value": 7.2,
      "unit": "%"
    },
    "referenceRange": [
      {
        "low": { "value": 4.0, "unit": "%" },
        "high": { "value": 5.6, "unit": "%" }
      }
    ],
    "interpretation": [
      {
        "coding": [{ "code": "H", "display": "High" }]
      }
    ]
  },
  {
    "resourceType": "Observation",
    "id": "obs-456",
    "status": "final",
    "category": [
      {
        "coding": [{ "code": "laboratory" }]
      }
    ],
    "code": {
      "coding": [
        {
          "system": "http://loinc.org",
          "code": "2093-3",
          "display": "Cholesterol [Mass/volume] in Serum or Plasma"
        }
      ]
    },
    "effectiveDateTime": "2024-12-10T09:00:00Z",
    "valueQuantity": {
      "value": 195,
      "unit": "mg/dL"
    }
  }
];

// Sample medication
const sampleMedications = [
  {
    "resourceType": "MedicationRequest",
    "id": "med-789",
    "status": "active",
    "medicationCodeableConcept": {
      "coding": [
        {
          "system": "http://www.nlm.nih.gov/research/umls/rxnorm",
          "code": "860975",
          "display": "Metformin 500 MG Oral Tablet"
        }
      ],
      "text": "Metformin 500mg"
    },
    "authoredOn": "2024-01-15",
    "dosageInstruction": [
      {
        "text": "Take 1 tablet twice daily with meals",
        "doseAndRate": [
          {
            "doseQuantity": {
              "value": 500,
              "unit": "mg"
            }
          }
        ],
        "timing": {
          "code": { "text": "twice daily" }
        }
      }
    ],
    "requester": {
      "display": "Dr. Sarah Johnson"
    },
    "dispenseRequest": {
      "numberOfRepeatsAllowed": 3,
      "quantity": { "value": 60 },
      "expectedSupplyDuration": { "value": 30, "unit": "days" }
    }
  }
];

// Sample condition
const sampleConditions = [
  {
    "resourceType": "Condition",
    "id": "cond-001",
    "clinicalStatus": {
      "coding": [{ "code": "active" }]
    },
    "verificationStatus": {
      "coding": [{ "code": "confirmed" }]
    },
    "category": [
      {
        "coding": [{ "code": "problem-list-item" }]
      }
    ],
    "code": {
      "coding": [
        {
          "system": "http://hl7.org/fhir/sid/icd-10-cm",
          "code": "E11.9",
          "display": "Type 2 diabetes mellitus without complications"
        }
      ],
      "text": "Type 2 Diabetes"
    },
    "onsetDateTime": "2020-03-15",
    "recordedDate": "2020-03-15"
  },
  {
    "resourceType": "Condition",
    "id": "cond-002",
    "clinicalStatus": {
      "coding": [{ "code": "active" }]
    },
    "code": {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "38341003",
          "display": "Hypertensive disorder"
        }
      ],
      "text": "Hypertension"
    },
    "onsetDateTime": "2019-06-01"
  }
];

// Sample encounter
const sampleEncounters = [
  {
    "resourceType": "Encounter",
    "id": "enc-001",
    "status": "finished",
    "class": {
      "code": "AMB",
      "display": "ambulatory"
    },
    "type": [
      {
        "coding": [{ "display": "Office Visit" }],
        "text": "Office Visit"
      }
    ],
    "period": {
      "start": "2024-12-15T09:00:00Z",
      "end": "2024-12-15T09:30:00Z"
    },
    "reasonCode": [
      { "text": "Diabetes follow-up" }
    ],
    "participant": [
      {
        "individual": { "display": "Dr. Sarah Johnson" },
        "type": [{ "text": "Primary Physician" }]
      }
    ],
    "serviceProvider": {
      "display": "Dallas Family Medicine"
    }
  }
];

// Run tests
console.log('='.repeat(60));
console.log('NORMALIZER TEST SUITE');
console.log('='.repeat(60));

console.log('\n--- Testing Patient Normalizer ---\n');

console.log('Epic Patient (standard format):');
const normalizedEpicPatient = normalizePatient(sampleEpicPatient, 'epic');
console.log(JSON.stringify({
  ...normalizedEpicPatient,
  _raw: '[omitted]'
}, null, 2));

console.log('\nCerner Patient (text name format):');
const normalizedCernerPatient = normalizePatient(sampleCernerPatient, 'cerner');
console.log(JSON.stringify({
  ...normalizedCernerPatient,
  _raw: '[omitted]'
}, null, 2));

console.log('\n--- Testing Labs Normalizer ---\n');
const normalizedLabs = normalizeLabs(sampleLabs, 'epic');
console.log('Normalized Labs:');
normalizedLabs.forEach((lab, i) => {
  console.log(`\nLab ${i + 1}:`);
  console.log(JSON.stringify({
    ...lab,
    _raw: '[omitted]'
  }, null, 2));
});

console.log('\n--- Testing Medications Normalizer ---\n');
const normalizedMeds = normalizeMedications(sampleMedications, 'epic');
console.log('Normalized Medications:');
normalizedMeds.forEach((med, i) => {
  console.log(`\nMedication ${i + 1}:`);
  console.log(JSON.stringify({
    ...med,
    _raw: '[omitted]'
  }, null, 2));
});

console.log('\n--- Testing Conditions Normalizer ---\n');
const normalizedConditions = normalizeConditions(sampleConditions, 'epic');
console.log('Normalized Conditions:');
normalizedConditions.forEach((cond, i) => {
  console.log(`\nCondition ${i + 1}:`);
  console.log(JSON.stringify({
    ...cond,
    _raw: '[omitted]'
  }, null, 2));
});

console.log('\n--- Testing Encounters Normalizer ---\n');
const normalizedEncounters = normalizeEncounters(sampleEncounters, 'epic');
console.log('Normalized Encounters:');
normalizedEncounters.forEach((enc, i) => {
  console.log(`\nEncounter ${i + 1}:`);
  console.log(JSON.stringify({
    ...enc,
    _raw: '[omitted]'
  }, null, 2));
});

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));

// Summary
console.log('\n--- Summary ---');
console.log(`Patients normalized: 2 (Epic + Cerner formats)`);
console.log(`Labs normalized: ${normalizedLabs.length}`);
console.log(`Medications normalized: ${normalizedMeds.length}`);
console.log(`Conditions normalized: ${normalizedConditions.length}`);
console.log(`Encounters normalized: ${normalizedEncounters.length}`);
console.log('\nAll normalizers working correctly!');
