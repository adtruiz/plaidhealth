# Blue Cross Blue Shield Minnesota - Implementation Notes

**Last Updated:** January 19, 2025

## Registration & Setup

**Developer Portal:** https://fhir-developer.bluecrossmn.com/
**Registration:** https://bluecrossmn3.okta.com/signin/register

## API Overview

BCBS-MN offers Patient Access API providing:
- Medical and Prescription costs
- Medical Clinical information
- Drug Formulary data

## Base URLs

| Environment | URL |
|-------------|-----|
| **Pre-Production (Sandbox)** | `https://preview-api.bluecrossmn.com/fhir/` |
| **Production** | `https://api.bluecrossmn.com/fhir/` |

## OAuth Endpoints

| Endpoint | URL |
|----------|-----|
| **Authorization** | `https://interop-preview.bluecrossmn.com/fhir/authorize` |
| **Token** | `https://interop-preview.bluecrossmn.com/fhir/token` |

## Authentication

- **Method:** SMART on FHIR with Basic Auth
- **Auth Header:** `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`
- **Required Scopes:**
  - `launch/patient` - Patient selection at launch
  - `patient/*.read` - Read any resource for current patient
  - `openid` - OpenID Connect
  - `profile` - User profile information
  - `fhirUser` - Current user details
  - `offline_access` - Refresh token support

## Test Credentials (Sandbox)

| Username | Password | Type | Notes |
|----------|----------|------|-------|
| `MNDEPT1234` | `Minnesota@12345` | Medicare | Primary test user |
| `PASSWORDMN123` | `Minnesota@123` | Medicare | Secondary test user |

## Implementation Guides

BCBS-MN's Patient Access API follows these standards:

### 1. **Claims & Encounter Data**
- **Standard:** [CARIN Consumer Directed Payer Data Exchange](https://build.fhir.org/ig/HL7/carin-bb/)
- **Compliance:** Implements all SHALL requirements
- **Resources:** ExplanationOfBenefit, Coverage
- **Use Case:** Claims history, cost information

### 2. **Clinical Data**
- **Standards:**
  - [Da Vinci Payer Data Exchange](https://build.fhir.org/ig/HL7/davinci-pdex/)
  - [US Core Implementation Guide](http://hl7.org/fhir/us/core/)
- **Compliance:** Implements all SHALL requirements
- **Resources:** Patient, Condition, Observation, MedicationRequest, Encounter, etc.
- **Use Case:** Clinical information from claims

### 3. **Drug Formulary Data**
- **Standard:** [DaVinci PDex US Drug Formulary](https://build.fhir.org/ig/HL7/davinci-pdex-formulary/)
- **Vendor:** Prime Therapeutics (PBM)
- **Implementation Guide:** [BCBS-MN US Drug Formulary IG (PDF)](https://fhir-developer.bluecrossmn.com/)
- **Resources:** MedicationKnowledge, InsurancePlan, List
- **Note:** System URLs in resources may not be reachable; codes documented in IG

## Important Implementation Notes

### ⚠️ `_lastUpdated` Query Parameter
**CRITICAL:** When using `_lastUpdated`, you MUST use the full timestamp format:

**✅ Correct:**
```
_lastUpdated=2021-06-21T09:57:43.133-04:00
```

**❌ Incorrect (will produce incorrect results):**
```
_lastUpdated=2021-06-21
```

### Drug Formulary Base URL
- Always communicate with BCBS-MN FHIR server (NOT Prime Therapeutics directly)
- The `[base URL]` in the Drug Formulary IG maps to:
  - Pre-Production: `https://preview-api.bluecrossmn.com/fhir/`
  - Production: `https://api.bluecrossmn.com/fhir/`

## Capability Statements

| Environment | Capability Statement |
|-------------|---------------------|
| **Sandbox** | [Patient Access Capability Statement (Sandbox)](https://preview-api.bluecrossmn.com/fhir/metadata) |
| **Production** | [Patient Access Capability Statement (Production)](https://api.bluecrossmn.com/fhir/metadata) |

## Data Domains

### 1. Claims & Encounter Data (CARIN)
**What you get:**
- Medical claims (hospital, physician visits, procedures)
- Prescription drug claims
- Cost information (patient responsibility, insurance paid)
- Coverage details
- Provider information

**Key Resources:**
- `ExplanationOfBenefit` - Individual claims
- `Coverage` - Insurance coverage details

### 2. Clinical Data (DaVinci PDex + US Core)
**What you get:**
- Patient demographics
- Diagnoses (conditions)
- Lab results (observations)
- Medications
- Procedures
- Encounters (visits)

**Key Resources:**
- `Patient`
- `Condition`
- `Observation`
- `MedicationRequest`
- `Procedure`
- `Encounter`
- `AllergyIntolerance`
- `Immunization`

### 3. Drug Formulary (DaVinci PDex Formulary)
**What you get:**
- Drug coverage information
- Formulary tiers (preferred, non-preferred, etc.)
- Prior authorization requirements
- Quantity limits
- Step therapy requirements

**Key Resources:**
- `MedicationKnowledge` - Drug details
- `InsurancePlan` - Plan coverage details
- `List` - Formulary lists

## Technical Support

**Phone:** (651) 662-1758 or 1-800-333-1758
**Hours:** Monday-Friday, 6 a.m. to 8 p.m. CT

## Strategic Value

### Market Coverage
- **Minnesota:** Major payer in Minnesota
- **Members:** Millions of members in Minnesota
- **Network:** Part of Blue Cross Blue Shield Association (100+ million members nationally)

### Data Completeness
BCBS-MN provides **THREE types of data**:
1. **Claims data** - What care was provided and what it cost
2. **Clinical data** - Health conditions, lab results, medications
3. **Formulary data** - What drugs are covered and at what cost

This makes BCBS-MN one of the **most comprehensive payer APIs** available.

### Competitive Advantage
Unlike competitors (Arcadia, Aledade) who only get:
- Claims data with 30-90 day lag
- In-network care only

With BCBS-MN you get:
- ✅ Claims + Clinical + Formulary data
- ✅ Real-time access via FHIR
- ✅ All care (in and out of network)
- ✅ Medication coverage details

## Integration Checklist

- [ ] Register for developer access at Okta portal
- [ ] Obtain Client ID and Client Secret
- [ ] Add credentials to `.env` or Railway environment variables
- [ ] Test with sandbox credentials (MNDEPT1234/Minnesota@12345)
- [ ] Verify data retrieval for all three domains:
  - [ ] Claims data (ExplanationOfBenefit)
  - [ ] Clinical data (Patient, Condition, Observation, etc.)
  - [ ] Formulary data (MedicationKnowledge, InsurancePlan)
- [ ] Test `_lastUpdated` with full timestamp format
- [ ] Review capability statement for supported resources
- [ ] Apply for production credentials
- [ ] Update redirect URIs for production

## Example Queries

### Get Patient Demographics
```
GET https://preview-api.bluecrossmn.com/fhir/Patient/{id}
Authorization: Bearer {access_token}
```

### Get Claims (ExplanationOfBenefit)
```
GET https://preview-api.bluecrossmn.com/fhir/ExplanationOfBenefit?patient={patient_id}
Authorization: Bearer {access_token}
```

### Get Conditions
```
GET https://preview-api.bluecrossmn.com/fhir/Condition?patient={patient_id}
Authorization: Bearer {access_token}
```

### Get Medications
```
GET https://preview-api.bluecrossmn.com/fhir/MedicationRequest?patient={patient_id}
Authorization: Bearer {access_token}
```

### Get Lab Results
```
GET https://preview-api.bluecrossmn.com/fhir/Observation?patient={patient_id}&category=laboratory
Authorization: Bearer {access_token}
```

### Get Drug Formulary
```
GET https://preview-api.bluecrossmn.com/fhir/MedicationKnowledge
Authorization: Bearer {access_token}
```

## Notes for Future Development

1. **Scaling to Other BCBS Plans:**
   - BCBS has 35+ independent state plans
   - Each has their own FHIR API implementation
   - Most follow similar CARIN/DaVinci standards
   - Priority states: CA, TX, FL, NY, PA (largest populations)

2. **Drug Formulary Integration:**
   - Unique value proposition for patients
   - Show medication costs BEFORE they get prescribed
   - Alert patients about cheaper alternatives
   - Highlight prior authorization requirements

3. **Claims Data Use Cases:**
   - Show total healthcare spending
   - Identify care gaps (missed screenings, follow-ups)
   - Compare costs across providers
   - Track out-of-pocket spending vs. deductible

4. **Multi-Payer Aggregation:**
   - Patient may have multiple BCBS plans over time
   - Aggregate historical data across plans
   - Maintain continuous health timeline

## References

- **CARIN Consumer Directed Payer Data Exchange:** https://build.fhir.org/ig/HL7/carin-bb/
- **Da Vinci Payer Data Exchange:** https://build.fhir.org/ig/HL7/davinci-pdex/
- **US Core Implementation Guide:** http://hl7.org/fhir/us/core/
- **DaVinci PDex US Drug Formulary:** https://build.fhir.org/ig/HL7/davinci-pdex-formulary/
- **BCBS-MN Developer Portal:** https://fhir-developer.bluecrossmn.com/
- **SMART on FHIR:** http://hl7.org/fhir/smart-app-launch/

---

**Last Review Date:** January 19, 2025
**Next Review:** When BCBS-MN updates their API or implementation guides
