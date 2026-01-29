# OAuth Agent Context

Quick reference for OAuth-related work in VerziHealth.

## Architecture Overview

```
Widget/Login → OAuth Init → Provider Auth → Callback → Token Exchange → DB Storage
     ↓              ↓             ↓            ↓              ↓
widget.js    lib/oauth.js   Provider    server.js      db.js
             lib/providers.js
```

## Key Files to Read First

1. `src/lib/providers.js` - All 22 provider configs (372 lines)
2. `src/lib/oauth.js` - PKCE and token helpers (149 lines)
3. `src/server.js:283-483` - OAuth callback handler

## Provider Configuration Pattern

```javascript
// In lib/providers.js
epic: {
  displayName: 'Epic MyChart',
  type: 'emr',
  fhirBaseUrl: () => process.env.EPIC_FHIR_BASE_URL,
  tokenUrl: () => process.env.EPIC_TOKEN_URL,
  clientId: () => process.env.EPIC_CLIENT_ID,
  authUrl: () => process.env.EPIC_AUTHORIZATION_URL,
  scope: 'patient/*.read launch/patient',
  requiresAud: true,
  usesPKCE: true
}
```

## OAuth Flow Types

### PKCE Flow (Most EMRs)
1. Generate code_verifier and code_challenge
2. Include code_challenge in auth URL
3. Include code_verifier in token exchange

### Basic Auth Flow (Some Payers)
1. No PKCE required
2. Use client_id + client_secret
3. Basic Auth header for token exchange

## Environment Variables Per Provider

```
{PROVIDER}_CLIENT_ID
{PROVIDER}_CLIENT_SECRET (if needed)
{PROVIDER}_AUTHORIZATION_URL
{PROVIDER}_TOKEN_URL
{PROVIDER}_FHIR_BASE_URL
```

## Testing OAuth Flows

```bash
# Epic sandbox credentials
Username: fhirderrick
Password: epicepic1

# Test OAuth initiation
open "http://localhost:3000/auth/epic"
```

## Adding New Provider Checklist

1. [ ] Add config to `lib/providers.js`
2. [ ] Set environment variables
3. [ ] Test OAuth flow end-to-end
4. [ ] Add logo to `public/images/providers/`
5. [ ] Update widget provider list
