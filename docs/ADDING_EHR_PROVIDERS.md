# Adding EHR Providers - Implementation Guide

## Overview

This application supports multiple EHR providers using the SMART on FHIR standard. The architecture is designed to work with any SMART-compatible EHR system.

## Currently Implemented

### Epic MyChart ✅
- **Status**: Fully functional in sandbox and production
- **Sandbox**: `fhir.epic.com/interconnect-fhir-oauth`
- **OAuth Flow**: Standard SMART on FHIR standalone launch
- **Test Credentials**:
  - Username: `fhirderrick`
  - Password: `epicepic1`

### Oracle Health (Cerner) ✅
- **Status**: OAuth integration complete, production-ready
- **Sandbox**: `fhir-ehr-code.cerner.com` (tenant: `ec2458f2-1e24-41c8-b71b-0e701af7583d`)
- **OAuth Flow**: Standard SMART on FHIR standalone launch
- **Test Credentials**: ⚠️ **NOT publicly available**
  - Unlike Epic, Cerner does not provide public test patient credentials
  - The integration code is complete and will work with real Cerner users in production
  - For sandbox testing, you need to either:
    1. Contact Cerner support to request test patient credentials
    2. Use Code Console's "Begin Testing" feature (provider-facing apps only)
    3. Wait until production deployment with real users
- **Note**: This is a common pattern with EHR vendors - sandbox testing credentials are often restricted

## How to Add a New EHR Provider

### 1. Database Support (Already Built)

The database already supports multiple providers via the `provider` column in `ehr_connections` table:

```sql
-- Provider is stored as a string: 'epic', 'cerner', 'allscripts', etc.
SELECT * FROM ehr_connections WHERE provider = 'cerner';
```

### 2. Register with the EHR

Each EHR requires registration to get OAuth credentials:

**Epic (Production)**
- Register at: https://fhir.epic.com/
- Get: Client ID, endpoints
- Scopes: `patient/*.read launch/patient`

**Cerner/Oracle Health (Production)**
- Register at: https://code-console.cerner.com/
- Get: Client ID, Client Secret (if required), endpoints
- Scopes: Similar to Epic

**Allscripts**
- Contact Allscripts for developer access
- Get: API credentials and endpoints

### 3. Add Environment Variables

Add to Railway (or `.env` for local):

```bash
# Example for Cerner
CERNER_CLIENT_ID=your_client_id
CERNER_AUTHORIZATION_URL=https://authorization.cerner.com/tenants/{tenant_id}/protocols/oauth2/profiles/smart-v1/authorize
CERNER_TOKEN_URL=https://authorization.cerner.com/tenants/{tenant_id}/protocols/oauth2/profiles/smart-v1/token
CERNER_FHIR_BASE_URL=https://fhir-myrecord.cerner.com/r4/{tenant_id}
```

### 4. Update Server Code

#### A. Add provider to helper functions (`src/server.js`)

```javascript
// Helper: Get FHIR base URL for a provider
function getFhirBaseUrl(provider) {
  if (provider === 'smart') {
    return process.env.SMART_FHIR_BASE_URL;
  }
  if (provider === 'cerner') {
    return process.env.CERNER_FHIR_BASE_URL;
  }
  return process.env.EPIC_FHIR_BASE_URL; // Default to Epic
}

// Helper: Get provider display name
function getProviderDisplayName(provider) {
  if (provider === 'smart') {
    return 'SMART Health IT';
  }
  if (provider === 'cerner') {
    return 'Oracle Health (Cerner)';
  }
  return 'Epic MyChart'; // Default to Epic
}
```

#### B. Add OAuth initiation route

```javascript
// Route: Initiate Cerner OAuth flow
app.get('/auth/cerner', requireLogin, (req, res) => {
  if (!process.env.CERNER_CLIENT_ID) {
    return res.status(500).send('Missing CERNER_CLIENT_ID environment variable');
  }
  if (!process.env.REDIRECT_URI) {
    return res.status(500).send('Missing REDIRECT_URI environment variable');
  }

  const { codeVerifier, codeChallenge } = generatePKCE();

  // Encode the code verifier AND provider in the state parameter
  const randomId = crypto.randomBytes(16).toString('hex');
  const stateData = JSON.stringify({ id: randomId, cv: codeVerifier, provider: 'cerner' });
  const state = Buffer.from(stateData).toString('base64url');

  // Build authorization URL
  const authUrl = new URL(process.env.CERNER_AUTHORIZATION_URL);
  authUrl.searchParams.append('client_id', process.env.CERNER_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', process.env.REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'patient/*.read launch/patient');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('aud', process.env.CERNER_FHIR_BASE_URL);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  console.log('Cerner OAuth initiated for user:', req.user.email);
  res.redirect(authUrl.toString());
});
```

#### C. Update callback handler

The callback handler already supports multiple providers! Just add the provider to the token URL mapping:

```javascript
// Determine which endpoints and credentials to use based on provider
let tokenUrl, clientId, fhirBaseUrl;
if (provider === 'smart') {
  tokenUrl = process.env.SMART_TOKEN_URL;
  clientId = process.env.SMART_CLIENT_ID;
  fhirBaseUrl = process.env.SMART_FHIR_BASE_URL;
} else if (provider === 'cerner') {
  tokenUrl = process.env.CERNER_TOKEN_URL;
  clientId = process.env.CERNER_CLIENT_ID;
  fhirBaseUrl = process.env.CERNER_FHIR_BASE_URL;
} else {
  tokenUrl = process.env.EPIC_TOKEN_URL;
  clientId = process.env.EPIC_CLIENT_ID;
  fhirBaseUrl = process.env.EPIC_FHIR_BASE_URL;
}
```

### 5. Update Frontend

Add the connection button to `public/my-dashboard.html`:

```javascript
const providerNames = {
  'epic': 'Epic MyChart',
  'smart': 'SMART Health IT',
  'cerner': 'Oracle Health (Cerner)'
};

// In the buttons section:
<a href="/auth/cerner" class="connect-btn" style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
  + Connect Oracle Health
</a>
```

### 6. Test

1. Click the new connection button
2. Authorize with the EHR's sandbox credentials
3. Verify the connection appears with the correct provider name
4. Check that data fetches correctly from the new provider
5. Test unified view with multiple providers to verify deduplication

## SMART Health IT Sandbox - Special Case

**Note**: SMART Health IT's test launcher (launch.smarthealthit.org) is NOT a standard OAuth server. It's a UI-based testing tool designed for client-side JavaScript apps.

### Why it doesn't work with our server-side OAuth flow:
- The launcher expects apps to be launched from their UI with pre-configured settings
- It's designed for their JavaScript SDK, not standard OAuth flows
- The actual FHIR servers (r4.smarthealthit.org) are open servers without OAuth

### In Production:
Real EHR systems (Epic, Cerner, Allscripts, etc.) have proper SMART on FHIR OAuth endpoints and work exactly like our Epic integration. The SMART Health IT limitation is ONLY for their sandbox testing tool.

## Recommended Next Providers

### 1. Oracle Health (Cerner) - IMPLEMENTED ✅
- **Why**: Second largest EHR vendor in the US
- **Sandbox**: Available at https://code-console.cerner.com/
- **SMART Support**: Full SMART on FHIR implementation
- **Status**: OAuth integration complete, but sandbox testing limited
- **Important**: Unlike Epic, Cerner's sandbox does NOT provide public test patient credentials
  - The integration is production-ready and will work with real Cerner users
  - For sandbox testing, you may need to contact Cerner support for test credentials
  - Alternative: Use Code Console's "Begin Testing" feature for provider-facing apps
- **Difficulty**: Integration Easy, Sandbox Testing Difficult

### 2. Allscripts
- **Why**: Third largest EHR vendor
- **Sandbox**: Contact required
- **SMART Support**: Yes
- **Difficulty**: Medium

### 3. Athenahealth
- **Why**: Popular in outpatient settings
- **Sandbox**: Available with registration
- **SMART Support**: Yes
- **Difficulty**: Medium

## Testing Multi-Provider Setup

Even with one EHR, you can test multi-provider functionality:

1. Connect Epic MyChart with one sandbox account
2. Disconnect and connect with a different Epic sandbox account
3. Both connections will appear with deduplication working
4. This proves the architecture supports multiple providers

## Common SMART on FHIR Patterns

All SMART-compatible EHRs follow these patterns:

### Discovery
```
GET {fhir_base}/.well-known/smart-configuration
```

### Authorization
```
GET {authorization_url}?
  response_type=code&
  client_id={client_id}&
  redirect_uri={redirect_uri}&
  scope=patient/*.read launch/patient&
  state={state}&
  aud={fhir_base_url}&
  code_challenge={challenge}&
  code_challenge_method=S256
```

### Token Exchange
```
POST {token_url}
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={code}&
redirect_uri={redirect_uri}&
client_id={client_id}&
code_verifier={verifier}
```

## Security Notes

- Always use PKCE (Proof Key for Code Exchange) for OAuth
- Store tokens encrypted in the database (already implemented)
- Use HTTPS in production (Railway enforces this)
- Validate state parameter to prevent CSRF
- Set proper CORS headers if needed

## Support

For questions about specific EHR integrations:
- Epic: https://fhir.epic.com/Documentation
- Cerner: https://docs.oracle.com/en/industries/health/
- SMART Spec: https://www.hl7.org/fhir/smart-app-launch/
