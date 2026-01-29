# FHIR Agent Context

Quick reference for FHIR-related work in VerziHealth.

## Architecture Overview

```
Provider FHIR API → src/lib/fhir-client.js → src/routes/fhir.js → Normalized JSON
                                   ↓
                         src/normalizers/*.js
```

## Key Files to Read First

1. `src/routes/fhir.js` - All FHIR endpoints (1,112 lines)
2. `src/normalizers/index.js` - Normalization entry point
3. `src/lib/fhir-client.js` - FHIR request helpers

## FHIR Resources Supported

| Resource | Endpoint | Normalizer |
|----------|----------|------------|
| Patient | /api/v1/patient | patient.js |
| Observation | /api/v1/labs | labs.js |
| MedicationRequest | /api/v1/medications | medications.js |
| Condition | /api/v1/conditions | conditions.js |
| Encounter | /api/v1/encounters | encounters.js |
| ExplanationOfBenefit | /api/v1/claims | claims.js |

## Testing Commands

```bash
# Run FHIR-related tests
npm test -- --testPathPatterns="fhir"

# Test against Epic sandbox
curl -H "Authorization: Bearer $TOKEN" \
  "https://fhir.epic.com/api/FHIR/R4/Patient/xxx"
```

## Common Patterns

### Fetching FHIR Data
```javascript
const { makeFhirRequest } = require('../lib/fhir-client');
const response = await makeFhirRequest(connection, 'Observation', {
  patient: connection.patient_id,
  category: 'laboratory'
});
```

### Normalizing Data
```javascript
const { normalizeLabs } = require('../normalizers');
const normalized = normalizeLabs(fhirBundle);
```

## Provider-Specific Quirks

- **Epic**: Requires `aud` parameter in OAuth
- **Cerner**: Different date format in some resources
- **MEDITECH**: Limited resource support
- **Payers**: Use ExplanationOfBenefit for claims
