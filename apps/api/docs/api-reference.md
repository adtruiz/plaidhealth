# PlaidHealth API Reference

## Overview

PlaidHealth provides a unified API for accessing patient health records from multiple EHR providers. Our API normalizes FHIR R4 data from Epic, Cerner, Meditech, and 20+ other healthcare providers into a consistent, developer-friendly format.

## Base URL

```
Production: https://stripe-healthcare-production.up.railway.app
Sandbox:    https://stripe-healthcare-production.up.railway.app (same endpoint, use test API keys)
```

## Authentication

### API Key Authentication

Include your API key in the request header:

```bash
# Option 1: Authorization header (recommended)
Authorization: Bearer pfh_live_your_api_key_here

# Option 2: X-API-Key header
X-API-Key: pfh_live_your_api_key_here
```

### API Key Formats

- **Production:** `pfh_live_` prefix
- **Sandbox:** `pfh_test_` prefix

### Scopes

API keys can have different permission levels:

| Scope | Description |
|-------|-------------|
| `read` | Read patient data, connections |
| `write` | Create widget tokens, exchange tokens |
| `admin` | Full access including key management |

---

## Quick Start

### 1. Get an API Key

Register at our developer portal and create an API key.

### 2. Create a Widget Token

```bash
curl -X POST https://stripe-healthcare-production.up.railway.app/api/v1/widget/token \
  -H "Authorization: Bearer pfh_test_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "client_user_id": "user_12345",
    "products": ["health_records"]
  }'
```

Response:
```json
{
  "widget_token": "wt_abc123...",
  "expiration": "2025-01-06T12:30:00.000Z",
  "request_id": "req_xyz789"
}
```

### 3. Open Connect Widget

Direct the user to:
```
/api/v1/widget/initiate/{provider}?widget_token={widget_token}
```

### 4. Exchange Public Token

After the user completes authorization, exchange the public token:

```bash
curl -X POST https://stripe-healthcare-production.up.railway.app/api/v1/widget/exchange \
  -H "Authorization: Bearer pfh_test_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"public_token": "pt_abc123..."}'
```

### 5. Fetch Health Records

```bash
curl https://stripe-healthcare-production.up.railway.app/api/v1/health-records \
  -H "Authorization: Bearer pfh_test_your_api_key"
```

---

## API Endpoints

### Health Check

#### GET /health
Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-06T10:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

#### GET /ready
Readiness check including database and Redis status.

---

### Widget API

#### POST /api/v1/widget/token
Create a widget token for initiating the Connect Widget.

**Headers:**
- `Authorization: Bearer pfh_xxx` (required)

**Request Body:**
```json
{
  "client_user_id": "your_user_id",
  "redirect_uri": "https://your-app.com/callback",
  "products": ["health_records"],
  "metadata": {}
}
```

**Response:**
```json
{
  "widget_token": "wt_...",
  "expiration": "2025-01-06T12:30:00.000Z",
  "request_id": "..."
}
```

#### GET /api/v1/widget/providers
List available healthcare providers.

**Response:**
```json
{
  "providers": [
    {
      "id": "epic",
      "name": "Epic MyChart",
      "type": "ehr",
      "logo": "/images/providers/epic.png",
      "available": true
    }
  ]
}
```

#### GET /api/v1/widget/initiate/:provider
Initiate OAuth flow for a specific provider.

**Query Parameters:**
- `widget_token` (required) - Widget token from /token endpoint

#### POST /api/v1/widget/exchange
Exchange a public token for permanent access.

**Request Body:**
```json
{
  "public_token": "pt_..."
}
```

**Response:**
```json
{
  "connection_id": 123,
  "provider": "epic",
  "patient_id": "abc123",
  "client_user_id": "your_user_id"
}
```

---

### Health Records API

#### GET /api/v1/health-records
Get all normalized health data for the authenticated user.

**Query Parameters:**
- `include_raw` - Include raw FHIR data (default: false)

**Response:**
```json
{
  "data": {
    "patient": {...},
    "labs": [...],
    "medications": [...],
    "conditions": [...],
    "encounters": [...]
  },
  "meta": {
    "sources": [...],
    "counts": {...},
    "normalizedAt": "2025-01-06T10:00:00.000Z",
    "version": "1.0.0"
  }
}
```

#### GET /api/v1/patient
Get normalized patient demographics.

**Response:**
```json
{
  "data": {
    "id": "patient-123",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1980-01-15",
    "gender": "male",
    "address": {...},
    "phone": [...],
    "email": "john@example.com",
    "source": "epic"
  },
  "meta": {...}
}
```

#### GET /api/v1/medications
Get normalized medication list.

**Query Parameters:**
- `deduplicate` - Deduplicate across sources (default: true)
- `status` - Filter by status (active, completed, stopped)
- `include_originals` - Include original records in dedup

**Response:**
```json
{
  "data": [
    {
      "id": "med-123",
      "name": "Lisinopril 10 MG Oral Tablet",
      "code": "197361",
      "codeSystem": "RxNorm",
      "status": "active",
      "prescribedDate": "2024-06-15",
      "dosage": "Take 1 tablet daily",
      "dosageDetails": {
        "dose": 10,
        "doseUnit": "mg",
        "frequency": "Daily",
        "route": "Oral"
      },
      "prescriber": {
        "name": "Dr. Smith"
      },
      "source": "epic"
    }
  ],
  "meta": {
    "total": 5,
    "totalBeforeDedup": 7,
    "deduplicated": true
  }
}
```

#### GET /api/v1/labs
Get normalized lab results.

**Query Parameters:**
- `deduplicate` - Deduplicate across sources (default: true)
- `limit` - Max results to return (default: 100)
- `include_originals` - Include original records

**Response:**
```json
{
  "data": [
    {
      "id": "lab-123",
      "name": "Hemoglobin A1c",
      "code": "4548-4",
      "codeSystem": "LOINC",
      "value": 6.5,
      "unit": "%",
      "referenceRange": {
        "low": 4.0,
        "high": 5.6,
        "text": "4.0-5.6 %"
      },
      "interpretation": "high",
      "date": "2024-12-15",
      "source": "epic"
    }
  ],
  "meta": {...}
}
```

#### GET /api/v1/conditions
Get normalized conditions/diagnoses.

**Query Parameters:**
- `deduplicate` - Deduplicate across sources
- `status` - Filter by clinical status (active, inactive, resolved)

**Response:**
```json
{
  "data": [
    {
      "id": "cond-123",
      "name": "Type 2 Diabetes Mellitus",
      "code": "E11.9",
      "codeSystem": "ICD-10",
      "clinicalStatus": "active",
      "verificationStatus": "confirmed",
      "category": "problem",
      "onsetDate": "2020-03-15",
      "recordedDate": "2020-03-15",
      "source": "epic"
    }
  ],
  "meta": {...}
}
```

#### GET /api/v1/encounters
Get normalized encounters/visits.

**Query Parameters:**
- `deduplicate` - Deduplicate across sources
- `limit` - Max results (default: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "enc-123",
      "type": "Office Visit",
      "status": "finished",
      "class": "ambulatory",
      "startDate": "2024-12-01T09:00:00Z",
      "endDate": "2024-12-01T09:30:00Z",
      "location": "Primary Care Clinic",
      "provider": "Dr. Smith",
      "reason": "Annual checkup",
      "source": "epic"
    }
  ],
  "meta": {...}
}
```

#### GET /api/v1/connection/:connectionId
Get data from a specific connection.

---

### Developer Portal API

#### POST /api/v1/developer/register
Register a new developer account.

**Request Body:**
```json
{
  "email": "dev@company.com",
  "password": "SecurePassword123",
  "name": "Developer Name",
  "company": "Company Inc"
}
```

#### POST /api/v1/developer/login
Login to developer account.

**Request Body:**
```json
{
  "email": "dev@company.com",
  "password": "SecurePassword123"
}
```

**Response:**
```json
{
  "user": {...},
  "token": "session_token_here",
  "expiresIn": 86400
}
```

#### GET /api/v1/developer/keys
List your API keys.

#### POST /api/v1/developer/keys
Create a new API key.

**Request Body:**
```json
{
  "name": "Production Key",
  "scopes": ["read", "write"],
  "environment": "production"
}
```

---

## Webhooks

Subscribe to real-time events for connection updates.

### Event Types

| Event | Description |
|-------|-------------|
| `connection.created` | New EHR connection established |
| `connection.updated` | Connection tokens refreshed |
| `connection.deleted` | Connection removed |
| `data.synced` | New health data available |

### Webhook Payload

```json
{
  "event": "connection.created",
  "timestamp": "2025-01-06T10:00:00.000Z",
  "data": {
    "connectionId": 123,
    "provider": "epic",
    "patientId": "abc123"
  }
}
```

### Webhook Signature

Webhooks include an `X-Webhook-Signature` header for verification:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": "Additional information"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_REQUIRED` | 401 | No authentication provided |
| `INVALID_API_KEY` | 401 | API key is invalid or revoked |
| `INSUFFICIENT_SCOPES` | 403 | API key lacks required permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `PROVIDER_NOT_CONFIGURED` | 400 | Healthcare provider not available |
| `CONNECTION_NOT_FOUND` | 404 | EHR connection not found |

---

## Rate Limits

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Default | 1000 requests | 1 minute |
| Widget | 100 requests | 1 minute |
| OAuth | 50 requests | 1 minute |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

---

## Supported Providers

| Provider | Type | PKCE | Status |
|----------|------|------|--------|
| Epic MyChart | EHR | Yes | Available |
| Cerner | EHR | Yes | Available |
| Meditech | EHR | No | Available |
| Kaiser Permanente | EHR | Yes | Available |
| Humana | Payer | No | Available |
| Aetna | Payer | No | Available |
| Cigna | Payer | Yes | Available |
| Anthem BCBS | Payer | Yes | Available |
| UnitedHealthcare | Payer | Yes | Available |
| BCBS MA | Payer | No | Available |
| BCBS MN | Payer | No | Available |
| BCBS TN | Payer | Yes | Available |
| Molina | Payer | No | Available |
| Medicare (CMS Blue Button) | Government | Yes | Available |

---

## Code Examples

### Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://stripe-healthcare-production.up.railway.app',
  headers: {
    'Authorization': 'Bearer pfh_live_your_api_key'
  }
});

// Get health records
const { data } = await client.get('/api/v1/health-records');
console.log(data.data.medications);
```

### Python

```python
import requests

headers = {'Authorization': 'Bearer pfh_live_your_api_key'}
response = requests.get(
    'https://stripe-healthcare-production.up.railway.app/api/v1/health-records',
    headers=headers
)
data = response.json()
print(data['data']['medications'])
```

### cURL

```bash
curl https://stripe-healthcare-production.up.railway.app/api/v1/health-records \
  -H "Authorization: Bearer pfh_live_your_api_key"
```

---

## Support

- GitHub Issues: [github.com/adtruiz/willow-and-co/issues](https://github.com/adtruiz/willow-and-co/issues)
- Email: support@plaidhealth.com

---

*API Version: 1.0.0*
*Last Updated: January 2025*
