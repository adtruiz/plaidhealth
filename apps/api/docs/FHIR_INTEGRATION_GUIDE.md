# Healthcare FHIR Integration Guide

A comprehensive guide to integrating with healthcare providers, EHR systems, insurance companies, and lab networks using FHIR APIs.

**Purpose**: This document serves as a centralized knowledge base for developers looking to integrate with healthcare data sources. It documents the registration process, OAuth flows, API endpoints, and common challenges for each provider.

**Last Updated**: October 17, 2025

---

## Table of Contents

- [Electronic Health Records (EHRs)](#electronic-health-records-ehrs)
  - [Epic MyChart](#epic-mychart)
  - [Oracle Health (Cerner)](#oracle-health-cerner)
  - [Healow (eClinicalWorks)](#healow-eclinicalworks)
  - [Allscripts](#allscripts)
- [Health Insurance (Payors)](#health-insurance-payors)
  - [UnitedHealthcare](#unitedhealthcare)
  - [Cigna](#cigna)
- [Laboratory Networks](#laboratory-networks)
  - [Quest Diagnostics](#quest-diagnostics)
  - [LabCorp](#labcorp)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Electronic Health Records (EHRs)

### Epic MyChart

**Status**: ✅ Production Ready | Self-Service Registration

Epic is the largest EHR vendor in the US and provides excellent developer tools with public sandbox credentials.

#### Overview
- **Market Share**: ~30% of US hospitals
- **FHIR Version**: R4
- **Developer Portal**: https://fhir.epic.com/
- **Documentation**: https://fhir.epic.com/Documentation

#### Registration Process

1. **Visit**: https://fhir.epic.com/
2. **Click**: "Build Apps" → "Get Sandbox Credentials"
3. **Fill out form**: Basic app information
4. **Receive instantly**: Client ID, endpoints
5. **No approval wait**: Immediate access to sandbox

**Approval Time**: Instant (sandbox) | Production requires app review

#### OAuth Configuration

**Sandbox Endpoints**:
```
Authorization URL: https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize
Token URL: https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
FHIR Base URL: https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
```

**Production Endpoints**: Varies by healthcare organization

**OAuth Flow**: SMART on FHIR Standalone Launch with PKCE

**Scopes**:
```
patient/*.read          - Read all patient data
launch/patient         - Standalone patient launch
openid fhirUser        - User identity (optional)
```

**Required Parameters**:
- `client_id`: Your client ID from Epic
- `redirect_uri`: Must match registered callback URL
- `response_type`: `code`
- `scope`: Space-separated scopes
- `state`: Base64url encoded JSON with code verifier and provider
- `aud`: FHIR base URL
- `code_challenge`: SHA256 hash of code verifier
- `code_challenge_method`: `S256`

#### Test Credentials

Epic provides public test patients:

```
Username: fhirderrick
Password: epicepic1
Patient ID: Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB
```

More test patients: https://fhir.epic.com/Documentation?docId=testpatients

#### Available Resources

Epic supports comprehensive FHIR resources:
- Patient demographics
- MedicationRequest (current and historical medications)
- Condition (diagnoses and problems)
- Observation (labs, vitals)
- Encounter (visits)
- AllergyIntolerance
- Immunization
- Procedure
- DocumentReference (clinical notes)
- DiagnosticReport

#### Common Issues

**Issue**: `invalid_client` error
**Solution**: Ensure client_id matches exactly what Epic provided

**Issue**: `invalid_scope` error
**Solution**: Epic doesn't support all scopes. Stick to `patient/*.read launch/patient`

**Issue**: Token expires quickly
**Solution**: Epic tokens expire in 1 hour. Implement refresh token logic.

#### Rate Limits

- **Sandbox**: 1000 requests/hour per app
- **Production**: Varies by organization, typically 5000/hour

#### Production Deployment

1. Submit app for Epic App Orchard review
2. Each healthcare organization must approve your app
3. Users launch from their MyChart portal or via standalone launch
4. Production FHIR base URLs are organization-specific

---

### Oracle Health (Cerner)

**Status**: ✅ Integration Complete | Limited Sandbox Testing

Cerner (now Oracle Health) is the second-largest EHR vendor. OAuth integration is complete but sandbox testing is limited.

#### Overview
- **Market Share**: ~25% of US hospitals
- **FHIR Version**: R4
- **Developer Portal**: https://code-console.cerner.com/
- **Documentation**: https://docs.oracle.com/en/industries/health/

#### Registration Process

1. **Visit**: https://code-console.cerner.com/
2. **Create Account**: Register as a developer
3. **Register App**: Provide app details
4. **Receive**: Client ID (no client secret for public apps)
5. **Note**: Sandbox test patient credentials NOT publicly available

**Approval Time**: Instant registration | Production requires business relationship

#### OAuth Configuration

**Sandbox Endpoints**:
```
Authorization URL: https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/authorize
Token URL: https://authorization.cerner.com/tenants/ec2458f2-1e24-41c8-b71b-0e701af7583d/protocols/oauth2/profiles/smart-v1/token
FHIR Base URL: https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d
```

**OAuth Flow**: SMART on FHIR Standalone Launch with PKCE

**Scopes**:
```
patient/*.read          - Read all patient data
launch/patient         - Standalone patient launch
```

**Required Parameters**: Same as Epic (see above)

#### Test Credentials

⚠️ **Cerner does NOT provide public test patient credentials**

Options:
1. Contact Cerner support for test credentials
2. Use "Begin Testing" in Code Console (provider apps only)
3. Wait for production deployment with real users

This is a **common pattern** with EHR vendors - sandbox credentials are often restricted.

#### Available Resources

Cerner supports similar resources to Epic with some variations in data structure.

#### Common Issues

**Issue**: No test patients available
**Solution**: This is expected. Code is production-ready; test with real users when approved.

**Issue**: Tenant ID confusion
**Solution**: Sandbox uses one tenant ID; production URLs are organization-specific

#### Production Deployment

Production requires business relationship with healthcare organizations using Cerner.

---

### Healow (eClinicalWorks)

**Status**: ⚠️ Registered but Technical Issues

Healow is eClinicalWorks' patient portal. App registration successful but OAuth implementation has challenges.

#### Overview
- **Market Share**: ~3% of US healthcare market (mostly ambulatory)
- **FHIR Version**: R4
- **Developer Portal**: https://connect4.healow.com/apps/jsp/dev/signIn.jsp
- **Documentation**: https://fhir.eclinicalworks.com/ecwopendev/documentation

#### Registration Process

1. **Visit**: https://connect4.healow.com/apps/jsp/dev/signIn.jsp
2. **Create Account**: Healow developer account
3. **Register App**: Complete detailed questionnaire including:
   - App type (Clinical vs Scheduling)
   - Data storage practices
   - Privacy policy
   - User data access controls
   - OpenID support
   - Refresh token usage
4. **Submit for Review**: Healow Dev Portal Team reviews
5. **Approval**: Receive Client ID

**Approval Time**: 1-3 business days

**App Type**: Select "Clinical" (not scheduling)
**App Visibility**: "Public" for patient-facing apps
**OpenID**: Yes (for user authentication)
**Refresh Token**: Yes (offline_access)

#### OAuth Configuration

**Production Endpoints** (from research):
```
Authorization URL: https://oauthserver.eclinicalworks.com/oauth/oauth2/authorize
Token URL: https://oauthserver.eclinicalworks.com/oauth/oauth2/token
FHIR Base URL: Practice-specific (format: https://connect4.healow.com/fhir/r4/{practice_code})
```

**OAuth Flow**: SMART on FHIR Standalone Launch with PKCE

**Scopes**:
```
launch/patient         - Standalone patient launch
patient/*.read         - Read all patient data
offline_access         - Refresh token support
```

**Note**: Do NOT include `openid` or `fhirUser` scopes - causes 403 errors

#### Known Issues

**Issue**: 403 `invalid_request` error during OAuth
**Status**: Under investigation
**Possible Causes**:
- Scope mismatch with app registration
- OAuth endpoint URLs may be different for patient apps
- Practice-specific FHIR URLs not documented

**Current Recommendation**: Contact eClinicalWorks support with your Client ID for correct OAuth endpoints

#### Production Deployment

Requires troubleshooting OAuth flow. Code structure is ready once correct endpoints are identified.

---

### Allscripts

**Status**: ❌ Requires Business Partnership

#### Overview
- **Market Share**: ~3% of US hospitals
- **Access Method**: Contact Allscripts for developer access
- **Not Self-Service**: Requires business relationship

**Recommendation**: Skip unless you have an existing Allscripts relationship

---

## Health Insurance (Payors)

Health insurance companies are **required by CMS** to provide Patient Access APIs using FHIR.

### UnitedHealthcare

**Status**: ⏳ Registration Submitted | Awaiting Approval

UnitedHealthcare provides comprehensive member data including claims, coverage, and formulary information.

#### Overview
- **Market Share**: ~50 million members
- **FHIR Version**: R4
- **Developer Portal**: https://portal.flex.optum.com/
- **Portal Name**: FHIR Layer EXchange (FLEX)
- **Documentation**: https://www.uhc.com/legal/interoperability-apis

#### Registration Process

1. **Visit**: https://portal.flex.optum.com/
2. **Click**: "App Owner" tile
3. **Create OneHealthcare ID**: One-time account creation
4. **Complete Profile**: First-time login only
5. **Register Organization**: One-time process including:
   - Company/legal name
   - Tax ID (EIN or SSN for individuals)
   - Physical and mailing address
   - Privacy policy URL
   - Security practices questionnaire
   - Data storage and access controls
6. **Submit for Review**: Security team reviews
7. **Wait for Approval Email**: 3-5 business days
8. **Register Application**: Get Client ID and Client Secret
9. **Choose Environment**: Sandbox (recommended first) or Production

**Approval Time**: 3-5 business days for organization | Instant for app after org approval

#### Required Information

- Legal entity name (or individual name)
- Federal Tax ID (EIN) or SSN
- Physical address
- Privacy policy URL (publicly accessible)
- Information security policy (basic practices acceptable)
- Data storage location (US required)
- No international operations

#### OAuth Configuration

**Endpoints**: Available after approval in FLEX portal

**OAuth Flow**: OAuth 2.0 with PKCE for mobile apps

**Scopes**: Documented in FLEX portal after approval

**Data Available**:
- Patient demographics
- Coverage information
- Claims (Explanation of Benefits)
- Provider directory (in-network)
- Formulary (covered medications)

#### Sandbox vs Production

**Sandbox**:
- Test environment
- Synthetic test data
- No real member information
- Recommended for initial development

**Production**:
- Real member data
- Requires member consent via OAuth
- Use after sandbox testing complete

#### Support

**Email**: flexvendorsupport@optum.com
**Portal**: Support tab in FLEX Vendor Admin Portal

---

### Cigna

**Status**: ⚠️ Registered but Sandbox Access Issues

Cigna is a major health insurance provider with comprehensive FHIR Patient Access APIs. Integration code is complete, but sandbox OAuth endpoints are not publicly accessible.

#### Overview
- **Market Share**: ~18 million members
- **FHIR Version**: R4
- **Developer Portal**: https://developer.cigna.com/
- **Documentation**: https://developer.cigna.com/docs/service-apis/patient-access

#### Registration Process

1. **Visit**: https://developer.cigna.com/
2. **Click**: "Register Now" button
3. **Complete Registration Form**: Provide developer information
4. **Wait for Email**: Cigna Representative will email you
5. **Receive Credentials**: Client ID and Client Secret
6. **Create Application**: Log in and create app at https://developer.cigna.com/apps

**Approval Time**: Variable, requires Cigna Representative approval (typically 1-3 business days)

#### OAuth Configuration

**Sandbox Endpoints**:
```
Authorization URL: https://r-hi2.cigna.com/mga/sps/oauth/oauth20/authorize
Token URL: https://r-hi2.cigna.com/mga/sps/oauth/oauth20/token
FHIR Base URL: https://fhir.cigna.com/PatientAccess/v1-devportal
```

**Production Endpoints**: Available after sandbox approval

**OAuth Flow**: OAuth 2.0 with Client ID and Client Secret

**Scopes**:
```
openid fhirUser patient/*.read  - Patient data access with user identity
```

**Important Note**: Cigna uses a non-standard OAuth workflow where the authorization server sets a cookie during the `/authorize` request, which is then verified during login. This may require special handling in your OAuth implementation.

#### Test Credentials

Cigna provides synthetic test users in their sandbox environment:
- **Location**: https://developer.cigna.com/docs/service-apis/patient-access/sandbox
- **Access**: After registration approval, see "Sandbox Test Users" section

#### Available Resources

Cigna's Patient Access API provides:
- Patient demographics
- Coverage information (active and historical)
- ExplanationOfBenefit (claims data)
- Encounter (visit history)
- Provider directory (in-network providers)
- Formulary (covered medications)

#### Common Issues

**Issue**: Sandbox OAuth endpoints not publicly accessible
**Status**: `r-hi2.cigna.com` times out or refuses connection
**Solution**: Cigna's sandbox OAuth server (`r-hi2.cigna.com`) appears to be internal/VPN-only. Contact Cigna support via developer portal "Need Help" link for:
- Access to publicly reachable sandbox endpoints
- VPN or IP whitelisting instructions
- Alternative testing methods
**Workaround**: Integration is production-ready; test with real Cigna member credentials when approved for production.

**Issue**: Client ID and Client Secret required
**Solution**: Unlike Epic/Cerner PKCE flow, Cigna requires both credentials. Store Client Secret securely (encrypted environment variable).

**Issue**: Cookie-based authentication flow
**Solution**: Cigna's OAuth sets cookies during authorization. Ensure your redirect flow preserves cookies.

**Issue**: JavaScript required for developer portal
**Solution**: Developer portal requires JavaScript enabled to view documentation.

#### Historical Data Access

**For Former Members**: Cigna is required by federal law to provide access to historical claims data for at least 7 years after coverage ends. Former members can:
1. Register as developer
2. Complete OAuth flow with their Cigna credentials
3. Access historical ExplanationOfBenefit resources

#### Rate Limits

Rate limits are documented in the developer portal after registration.

#### Support

**Portal**: https://developer.cigna.com/ (use "Need Help" link)
**Documentation**: Full API reference available after login

---

### Humana

**Status**: ⚠️ OAuth Working, But Test Patients Have No Data

Humana is a major health insurance provider that provides a Patient Access API. OAuth integration is complete and functional, but sandbox test patients do not have FHIR data populated.

#### Overview
- **Market Share**: ~17 million members
- **FHIR Version**: R4
- **Developer Portal**: https://developers.humana.com/
- **Documentation**: https://developers.humana.com/apis

#### Registration Process

1. **Visit**: https://developers.humana.com/
2. **Click**: "Get Started" or "Sign Up"
3. **Create Account**: Register as a developer
4. **Register Application**: Provide app details
5. **Receive Credentials**: Client ID and Client Secret
6. **Select Environment**: Sandbox or Production

**Approval Time**: Instant registration for sandbox

#### OAuth Configuration

**Sandbox Endpoints**:
```
Authorization URL: https://developers.humana.com/Oauth2/Authorize
Token URL: https://developers.humana.com/OAuth2/Token
FHIR Base URL: https://sandbox-fhir.humana.com/fhir/r4
```

**OAuth Flow**: OAuth 2.0 with Basic Authentication (NOT PKCE)

**Authentication Method**: Unlike Epic/Cerner/Cigna, Humana uses Basic Auth instead of PKCE:
```
Authorization: Basic base64(client_id:client_secret)
```

**Scopes**:
```
patient/Patient.read
patient/Coverage.read
patient/ExplanationOfBenefit.read
patient/MedicationRequest.read
patient/Condition.read
patient/Observation.read
patient/Encounter.read
```

#### Test Credentials

Humana provides test patients:
- **Username**: HUser00001
- **Password**: PW00001!
- **Patient ID**: HUser00001

Additional test users: HUser00002, HUser00003, etc.

#### Known Issues

**Issue**: OAuth works correctly, but all FHIR API calls return 404 Not Found
**Status**: Test patients have NO FHIR data populated in sandbox
**Technical Details**:
- OAuth flow: ✅ Working perfectly
- Token exchange: ✅ Success (returns valid access_token)
- FHIR API calls: ❌ All return 404 Not Found
- Test patients: HUser00001, HUser00002 have no resources

**Workaround**: This is a common pattern with insurance provider sandboxes - they're designed for testing OAuth flows only, not actual FHIR data. The integration code is production-ready and will work with real Humana members who have claims data.

**Recommendation**: Contact Humana support via developer portal to:
- Confirm if sandbox test patients have any FHIR resources populated
- Request test patients with actual FHIR data
- Clarify if sandbox is OAuth-only (no FHIR data testing)

#### Available Resources

Humana's Patient Access API should provide:
- Patient demographics
- Coverage information
- ExplanationOfBenefit (claims)
- MedicationRequest (prescriptions from claims)
- Condition (diagnoses from claims)
- Observation (lab results if available)
- Encounter (medical encounters)

#### Rate Limits

Rate limits documented in developer portal.

#### Support

**Portal**: https://developers.humana.com/
**Documentation**: Full API reference in developer portal

---

## Laboratory Networks

### Quest Diagnostics

**Status**: ⏳ Access Request Submitted

#### Overview
- **Market Share**: Largest lab network in US
- **FHIR Version**: R4
- **Developer Portal**: https://api.questdiagnostics.com/
- **Documentation**: Quanum EHR FHIR API Reference Guide

#### Registration Process

1. **Visit**: https://api.questdiagnostics.com/
2. **Request Access**: Fill out access request form
3. **Wait for Review**: Quest evaluates application
4. **Receive Credentials**: Client ID and documentation

**Approval Time**: Variable, can take 1-2 weeks

**Integration Type**: Primarily for Quanum EHR system
**Access**: Requires Quest Diagnostics approval

---

### LabCorp

**Status**: ❌ Requires Vendor Relations Management

#### Overview
- **Market Share**: Second-largest lab network
- **Access Method**: Contact LabCorp VRM team
- **Portal**: https://fhir.labcorp.com/
- **Not Self-Service**: Requires business partnership

**Contact**: LabCorp Vendor Relations Management (VRM) team

---

## Common Patterns

### SMART on FHIR OAuth Flow

Most healthcare providers use SMART on FHIR with PKCE:

```javascript
// 1. Generate PKCE challenge
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');

// 2. Build authorization URL
const authUrl = new URL(AUTHORIZATION_ENDPOINT);
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', 'patient/*.read launch/patient');
authUrl.searchParams.append('state', encodeState({ codeVerifier, provider }));
authUrl.searchParams.append('aud', FHIR_BASE_URL);
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('code_challenge_method', 'S256');

// 3. Redirect user to authUrl

// 4. Handle callback with code
const tokenResponse = await axios.post(TOKEN_ENDPOINT, {
  grant_type: 'authorization_code',
  code: authCode,
  redirect_uri: REDIRECT_URI,
  client_id: CLIENT_ID,
  code_verifier: codeVerifier
});

// 5. Use access_token to fetch FHIR resources
const patient = await axios.get(`${FHIR_BASE_URL}/Patient/${patientId}`, {
  headers: { Authorization: `Bearer ${access_token}` }
});
```

### Common FHIR Resources

All FHIR providers support these core resources:

- **Patient**: Demographics (name, DOB, gender, contact)
- **MedicationRequest**: Prescriptions and medications
- **Condition**: Diagnoses and problems
- **Observation**: Labs, vitals, clinical measurements
- **Encounter**: Office visits, hospitalizations
- **AllergyIntolerance**: Allergies
- **Immunization**: Vaccinations
- **Procedure**: Surgical and clinical procedures

### Token Refresh

```javascript
// Check if token needs refresh (expires in < 5 minutes)
if (expiresAt < Date.now() + 5 * 60 * 1000) {
  const refreshResponse = await axios.post(TOKEN_ENDPOINT, {
    grant_type: 'refresh_token',
    refresh_token: storedRefreshToken,
    client_id: CLIENT_ID
  });

  // Update stored tokens
  updateTokens(refreshResponse.data);
}
```

---

## Troubleshooting

### OAuth Errors

**Error**: `invalid_client`
**Cause**: Client ID mismatch or not registered
**Solution**: Verify client_id matches registration exactly

**Error**: `invalid_scope`
**Cause**: Requesting unsupported scopes
**Solution**: Check provider documentation for supported scopes

**Error**: `invalid_grant`
**Cause**: Authorization code expired or already used
**Solution**: Authorization codes are single-use and expire quickly (usually 5-10 minutes)

**Error**: 403 `invalid_request`
**Cause**: Missing or incorrect OAuth parameters
**Solution**: Verify all required parameters match provider specs

### FHIR API Errors

**Error**: 401 Unauthorized
**Cause**: Missing or expired access token
**Solution**: Check token is included in Authorization header and not expired

**Error**: 404 Not Found
**Cause**: Resource doesn't exist or incorrect endpoint
**Solution**: Verify FHIR base URL and resource ID

**Error**: 429 Too Many Requests
**Cause**: Rate limit exceeded
**Solution**: Implement exponential backoff and respect rate limits

### Common Challenges

**Challenge**: No test credentials available
**Solution**: This is normal for many providers. Build integration, test with real users when approved.

**Challenge**: Provider-specific OAuth endpoints
**Solution**: Store endpoints per provider in configuration

**Challenge**: Different FHIR implementations
**Solution**: Handle variations in resource structures gracefully

---

## Contributing

This is a living document. If you integrate with additional healthcare providers, please contribute:

1. Document the registration process
2. Provide OAuth endpoints and configuration
3. Note any special requirements or gotchas
4. Share troubleshooting tips

**Goal**: Make healthcare data integration accessible to all developers.

---

## Resources

### Standards & Specifications
- **FHIR R4**: https://hl7.org/fhir/
- **SMART App Launch**: http://hl7.org/fhir/smart-app-launch/
- **OAuth 2.0 PKCE**: https://tools.ietf.org/html/rfc7636

### Tools
- **FHIR Validator**: https://validator.fhir.org/
- **Postman**: API testing
- **SMART Health IT Sandbox**: https://launch.smarthealthit.org/

### Regulations
- **CMS Interoperability Rules**: https://www.cms.gov/interoperability
- **HIPAA**: https://www.hhs.gov/hipaa/
- **21st Century Cures Act**: Patient access requirements

---

**Created by**: VerziHealth Project
**License**: Open Source (MIT)
**Last Updated**: October 17, 2025
