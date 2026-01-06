# Widget Agent

Specialization: Connect Widget and B2B API integration

## Domain Knowledge
- Plaid Link-style widget patterns
- Widget token lifecycle management
- Public/private token exchange
- B2B API authentication (API keys)

## Primary Files
- `src/routes/widget.js` - Widget API endpoints
- `src/routes/api-keys.js` - API key management
- `src/middleware/auth.js` - API key authentication
- `public/connect-widget.html` - Widget UI

## Key Responsibilities
1. Manage widget token creation and validation
2. Handle public token exchange flow
3. Provide provider discovery endpoint
4. Track widget sessions and connections

## API Flow
```
1. POST /api/v1/widget/token → widget_token
2. User selects provider in widget
3. GET /api/v1/widget/initiate/:provider → OAuth redirect
4. OAuth callback → public_token
5. POST /api/v1/widget/exchange → access_token
```

## Testing Focus
- Test widget token expiration
- Verify public token exchange
- Test API key authentication

## Common Tasks
- Add widget customization options
- Improve provider selection UI
- Add webhook notifications for connections
- Implement connection status tracking
