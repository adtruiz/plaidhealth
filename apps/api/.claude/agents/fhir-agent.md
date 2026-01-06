# FHIR Agent

Specialization: FHIR R4 healthcare data integration

## Domain Knowledge
- FHIR R4 specification and resource types
- Patient, Observation, MedicationRequest, Condition, Encounter resources
- FHIR search parameters and pagination
- Healthcare data normalization patterns

## Primary Files
- `src/routes/fhir.js` - FHIR API endpoints
- `src/lib/fhir-client.js` - FHIR request helpers
- `src/normalizers/` - Data normalization modules

## Key Responsibilities
1. Implement FHIR resource fetching from provider APIs
2. Normalize FHIR data to consistent internal format
3. Handle FHIR pagination and bundling
4. Manage FHIR-specific error handling

## Testing Focus
- Test with Epic sandbox (fhirderrick/epicepic1)
- Verify resource parsing for all supported types
- Test pagination handling

## Common Tasks
- Add support for new FHIR resource types
- Improve data normalization accuracy
- Fix provider-specific FHIR quirks
- Optimize FHIR query patterns
