# Widget Agent Context

Quick reference for Widget/B2B API work in VerziHealth.

## Architecture Overview

```
B2B Client → API Key Auth → Widget Token → Provider Selection → OAuth → Public Token → Exchange
    ↓            ↓              ↓                ↓                          ↓
X-API-Key   middleware/    widget.js       connect-widget.html          widget.js
            auth.js
```

## Key Files to Read First

1. `src/routes/widget.js` - Widget API (303 lines)
2. `src/routes/api-keys.js` - API key CRUD (199 lines)
3. `src/middleware/auth.js` - API key auth middleware
4. `public/connect-widget.html` - Widget UI

## Widget Token Flow

```
1. B2B server calls: POST /api/v1/widget/token
   Body: { client_user_id: "their-user-123" }
   Returns: { widget_token: "wt_xxx", expiration: "..." }

2. B2B client opens widget with token
   
3. User selects provider, completes OAuth

4. Widget returns: public_token to B2B client

5. B2B server calls: POST /api/v1/widget/exchange
   Body: { public_token: "pt_xxx" }
   Returns: { access_token: "at_xxx", connection_id: "..." }
```

## API Key Authentication

```javascript
// Middleware checks X-API-Key header
const apiKey = req.headers['x-api-key'];
// Validates against hashed keys in DB
// Sets req.user and req.apiKey
```

## Key Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | /api/v1/widget/providers | None | List providers |
| POST | /api/v1/widget/token | API Key | Create widget token |
| GET | /api/v1/widget/initiate/:provider | Widget Token | Start OAuth |
| POST | /api/v1/widget/exchange | API Key | Exchange token |
| GET | /api/v1/widget/sessions | API Key | List connections |

## Testing Widget Flow

```bash
# Create widget token
curl -X POST http://localhost:3000/api/v1/widget/token \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"client_user_id": "test-user"}'

# List providers
curl http://localhost:3000/api/v1/widget/providers
```

## Widget Customization Points

- Provider filtering (products parameter)
- Custom redirect URI
- Metadata storage
- Webhook notifications
