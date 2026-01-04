# Plaid for Healthcare API v1

## Overview

The v1 API provides **normalized, consistent health data** regardless of which EMR or payer the data comes from. This is the "Plaid-style" API that abstracts away the complexity of different FHIR implementations.

**Base URL:** `https://your-domain.com/api/v1`

## Authentication

All endpoints support two authentication methods:

### 1. API Key Authentication (Recommended for B2B)

Include your API key in the request headers:

```bash
# Using Authorization header (preferred)
curl -H "Authorization: Bearer pfh_live_abc123..." https://api.example.com/api/v1/patient

# Using X-API-Key header (alternative)
curl -H "X-API-Key: pfh_live_abc123..." https://api.example.com/api/v1/patient
```

API keys follow the format: `pfh_live_xxx` (production) or `pfh_test_xxx` (sandbox).

### 2. Session Authentication (Web UI)

For the web dashboard, authentication is handled via Google OAuth session cookies.

---

## API Key Management

Manage your API keys through the `/api/keys` endpoints (requires session auth).

### POST /api/keys

Create a new API key.

**Request:**
```json
{
  "name": "My Production App",
  "scopes": ["read"]
}
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "My Production App",
    "key": "pfh_live_abc123...",
    "prefix": "pfh_live_abc...",
    "scopes": ["read"],
    "createdAt": "2024-12-15T10:00:00Z"
  },
  "warning": "This is the only time the full key will be shown."
}
```

### GET /api/keys

List all your API keys (without the actual key values).

### PATCH /api/keys/:keyId

Update a key's name or scopes.

### POST /api/keys/:keyId/revoke

Revoke a key (soft delete, keeps audit trail).

### DELETE /api/keys/:keyId

Permanently delete a key.

### Scopes

| Scope | Description |
|-------|-------------|
| `read` | Read health data (default) |
| `write` | Modify connections |
| `admin` | Manage API keys |

## Response Format

All responses follow this structure:

```json
{
  "data": { ... },
  "meta": {
    "sources": [...],
    "normalizedAt": "2024-12-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

---

## Endpoints

### GET /api/v1/health-records

Get all health data from all connected providers, normalized and aggregated.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `include_raw` | boolean | Include raw FHIR data in `_raw` field (default: false) |

**Response:**
```json
{
  "data": {
    "patient": {
      "id": "abc123",
      "firstName": "John",
      "lastName": "Smith",
      "dateOfBirth": "1980-05-15",
      "gender": "male",
      "email": "john@example.com",
      "phone": "+1-555-123-4567",
      "address": {
        "line1": "123 Main St",
        "city": "Dallas",
        "state": "TX",
        "postalCode": "75001"
      },
      "source": "epic"
    },
    "patients": [...],
    "labs": [...],
    "medications": [...],
    "conditions": [...],
    "encounters": [...]
  },
  "meta": {
    "sources": [
      { "id": 1, "provider": "epic", "displayName": "Epic MyChart", "lastSynced": "..." }
    ],
    "counts": {
      "labs": 45,
      "medications": 8,
      "conditions": 5,
      "encounters": 12
    },
    "normalizedAt": "2024-12-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

---

### GET /api/v1/patient

Get normalized patient demographics.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `include_raw` | boolean | Include raw FHIR data (default: false) |

**Response:**
```json
{
  "data": {
    "id": "abc123",
    "firstName": "John",
    "lastName": "Smith",
    "fullName": "John Smith",
    "dateOfBirth": "1980-05-15",
    "gender": "male",
    "email": "john@example.com",
    "phone": "+1-555-123-4567",
    "address": {
      "line1": "123 Main St",
      "line2": null,
      "city": "Dallas",
      "state": "TX",
      "postalCode": "75001",
      "country": "US"
    },
    "source": "epic"
  },
  "all": [...],
  "meta": { "sources": ["epic"], "normalizedAt": "..." }
}
```

---

### GET /api/v1/labs

Get normalized laboratory results.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Maximum results (default: 100) |
| `include_raw` | boolean | Include raw FHIR data (default: false) |

**Response:**
```json
{
  "data": [
    {
      "id": "obs-123",
      "name": "Hemoglobin A1c",
      "code": "4548-4",
      "codeSystem": "LOINC",
      "value": 7.2,
      "unit": "%",
      "valueType": "quantity",
      "date": "2024-12-15T10:30:00Z",
      "status": "final",
      "referenceRange": {
        "low": 4.0,
        "high": 5.6,
        "unit": "%"
      },
      "isAbnormal": true,
      "source": "epic"
    }
  ],
  "meta": { "total": 45, "sources": ["epic", "humana"], "normalizedAt": "..." }
}
```

---

### GET /api/v1/medications

Get normalized medication list.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `active`, `completed`, `stopped` |
| `include_raw` | boolean | Include raw FHIR data (default: false) |

**Response:**
```json
{
  "data": [
    {
      "id": "med-789",
      "name": "Metformin 500mg",
      "code": "860975",
      "codeSystem": "RxNorm",
      "status": "active",
      "dosage": "Take 1 tablet twice daily with meals",
      "dosageDetails": {
        "text": "Take 1 tablet twice daily with meals",
        "dose": 500,
        "doseUnit": "mg",
        "frequency": "twice daily",
        "route": null
      },
      "prescribedDate": "2024-01-15",
      "prescriber": {
        "name": "Dr. Sarah Johnson"
      },
      "refillsAllowed": 3,
      "quantity": 60,
      "daysSupply": 30,
      "source": "epic"
    }
  ],
  "meta": { "total": 8, "sources": ["epic"], "normalizedAt": "..." }
}
```

---

### GET /api/v1/conditions

Get normalized diagnoses/conditions.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `active`, `inactive`, `resolved` |
| `include_raw` | boolean | Include raw FHIR data (default: false) |

**Response:**
```json
{
  "data": [
    {
      "id": "cond-001",
      "name": "Type 2 Diabetes",
      "code": "E11.9",
      "codeSystem": "ICD-10",
      "clinicalStatus": "active",
      "verificationStatus": "confirmed",
      "category": "problem",
      "severity": null,
      "onsetDate": "2020-03-15",
      "recordedDate": "2020-03-15",
      "source": "epic"
    }
  ],
  "meta": { "total": 5, "sources": ["epic", "humana"], "normalizedAt": "..." }
}
```

---

### GET /api/v1/encounters

Get normalized visits/encounters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Maximum results (default: 50) |
| `include_raw` | boolean | Include raw FHIR data (default: false) |

**Response:**
```json
{
  "data": [
    {
      "id": "enc-001",
      "type": "Office Visit",
      "class": "outpatient",
      "status": "completed",
      "startDate": "2024-12-15T09:00:00Z",
      "endDate": "2024-12-15T09:30:00Z",
      "duration": "30 minutes",
      "location": null,
      "participants": [
        {
          "role": "Primary Physician",
          "name": "Dr. Sarah Johnson"
        }
      ],
      "reasons": ["Diabetes follow-up"],
      "serviceProvider": {
        "name": "Dallas Family Medicine"
      },
      "source": "epic"
    }
  ],
  "meta": { "total": 12, "sources": ["epic"], "normalizedAt": "..." }
}
```

---

### GET /api/v1/connection/:connectionId

Get normalized data from a specific connected provider.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `connectionId` | number | The connection ID |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `include_raw` | boolean | Include raw FHIR data (default: false) |

**Response:**
```json
{
  "data": {
    "patient": { ... },
    "labs": [...],
    "medications": [...],
    "conditions": [...],
    "encounters": [...]
  },
  "meta": {
    "connectionId": 1,
    "provider": "epic",
    "displayName": "Epic MyChart",
    "lastSynced": "2024-12-15T10:00:00Z",
    "normalizedAt": "2024-12-15T10:30:00Z"
  }
}
```

---

## Data Models

### Patient
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Patient ID from source |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `fullName` | string | Full name combined |
| `dateOfBirth` | string | Date of birth (YYYY-MM-DD) |
| `gender` | string | `male`, `female`, `other`, `unknown` |
| `email` | string | Email address |
| `phone` | string | Phone number |
| `address` | object | Address object |
| `source` | string | Source provider |

### Lab
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Observation ID |
| `name` | string | Test name |
| `code` | string | LOINC code |
| `codeSystem` | string | Always "LOINC" |
| `value` | number/string | Result value |
| `unit` | string | Unit of measure |
| `date` | string | Test date (ISO 8601) |
| `status` | string | `final`, `preliminary`, etc. |
| `referenceRange` | object | Normal range |
| `isAbnormal` | boolean | Whether result is abnormal |
| `source` | string | Source provider |

### Medication
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Medication request ID |
| `name` | string | Medication name |
| `code` | string | RxNorm code |
| `codeSystem` | string | Always "RxNorm" |
| `status` | string | `active`, `completed`, `stopped` |
| `dosage` | string | Dosage instructions |
| `prescribedDate` | string | Date prescribed |
| `prescriber` | object | Prescriber info |
| `refillsAllowed` | number | Number of refills |
| `source` | string | Source provider |

### Condition
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Condition ID |
| `name` | string | Condition name |
| `code` | string | ICD-10 code |
| `codeSystem` | string | "ICD-10" or "SNOMED" |
| `clinicalStatus` | string | `active`, `inactive`, `resolved` |
| `verificationStatus` | string | `confirmed`, `provisional` |
| `onsetDate` | string | When condition started |
| `source` | string | Source provider |

### Encounter
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Encounter ID |
| `type` | string | Visit type |
| `class` | string | `outpatient`, `inpatient`, `emergency` |
| `status` | string | `completed`, `in-progress`, `scheduled` |
| `startDate` | string | Visit start (ISO 8601) |
| `endDate` | string | Visit end |
| `duration` | string | Human-readable duration |
| `participants` | array | Providers involved |
| `reasons` | array | Reasons for visit |
| `source` | string | Source provider |

---

## Code Systems

The v1 API normalizes all codes to standard systems:

| Data Type | Standard | Example |
|-----------|----------|---------|
| Labs | LOINC | `4548-4` (A1c) |
| Medications | RxNorm | `860975` (Metformin) |
| Conditions | ICD-10 | `E11.9` (Diabetes) |

When source data uses proprietary codes, the API attempts to map them. If mapping fails, the original code is returned with `codeSystem` indicating the source system.

---

## Error Handling

```json
{
  "error": "Error message",
  "details": "Additional details"
}
```

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Not found |
| 500 | Server error |

---

## Rate Limits

Currently no rate limits. In production:
- 100 requests/minute per user
- 1000 requests/day per user
