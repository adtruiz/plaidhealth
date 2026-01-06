# OAuth Agent

Specialization: Healthcare provider OAuth 2.0 authentication

## Domain Knowledge
- OAuth 2.0 authorization code flow
- PKCE (Proof Key for Code Exchange)
- SMART on FHIR launch contexts
- Provider-specific OAuth quirks

## Primary Files
- `src/lib/oauth.js` - PKCE and token request helpers
- `src/lib/providers.js` - Provider OAuth configurations
- `src/server.js` - OAuth callback handler (lines 346-483)
- `src/routes/widget.js` - Widget OAuth initiation

## Key Responsibilities
1. Manage OAuth flows for 22+ healthcare providers
2. Handle PKCE generation and verification
3. Exchange authorization codes for access tokens
4. Refresh expiring tokens

## Provider Categories
- **EMRs**: Epic, Cerner, MEDITECH, NextGen, athenahealth, Healow
- **Payers**: Aetna, Anthem, Humana, Cigna, UHC, Kaiser, BCBS variants
- **Labs**: Quest, Labcorp (via EMR integrations)

## Testing Focus
- Test OAuth flows in sandbox environments
- Verify token refresh logic
- Test error handling for expired/invalid tokens

## Common Tasks
- Add new healthcare provider integrations
- Fix provider-specific OAuth issues
- Update token refresh logic
- Handle OAuth error scenarios
