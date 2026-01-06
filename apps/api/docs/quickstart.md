# PlaidHealth Quick Start Guide

Get started with PlaidHealth API in under 5 minutes.

## Prerequisites

- API key from the developer portal
- Node.js 16+ or Python 3.8+ (for code examples)

## Step 1: Get Your API Key

1. Register at the developer portal
2. Create a new API key with `read` and `write` scopes
3. Save your key securely - it won't be shown again

## Step 2: Test Your Connection

```bash
curl https://stripe-healthcare-production.up.railway.app/health \
  -H "Authorization: Bearer pfh_test_your_api_key"
```

You should see:
```json
{"status": "ok", "timestamp": "...", "uptime": 12345}
```

## Step 3: Create a Widget Token

The widget token initiates the patient authorization flow:

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
  "widget_token": "wt_abc123def456...",
  "expiration": "2025-01-06T12:30:00.000Z"
}
```

## Step 4: Open the Connect Widget

Redirect your user to the provider authorization page:

```
GET /api/v1/widget/initiate/epic?widget_token=wt_abc123def456
```

The user will:
1. See the Epic MyChart login page
2. Authenticate with their Epic credentials
3. Grant permission to share their health data
4. Be redirected back with a public token

## Step 5: Exchange the Public Token

After authorization, exchange the public token for permanent access:

```bash
curl -X POST https://stripe-healthcare-production.up.railway.app/api/v1/widget/exchange \
  -H "Authorization: Bearer pfh_test_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"public_token": "pt_xyz789..."}'
```

Response:
```json
{
  "connection_id": 123,
  "provider": "epic",
  "patient_id": "abc123",
  "client_user_id": "user_12345"
}
```

## Step 6: Fetch Health Records

Now you can fetch the patient's health data:

```bash
# Get all health records
curl https://stripe-healthcare-production.up.railway.app/api/v1/health-records \
  -H "Authorization: Bearer pfh_test_your_api_key"

# Get medications
curl https://stripe-healthcare-production.up.railway.app/api/v1/medications \
  -H "Authorization: Bearer pfh_test_your_api_key"

# Get lab results
curl https://stripe-healthcare-production.up.railway.app/api/v1/labs \
  -H "Authorization: Bearer pfh_test_your_api_key"
```

## Complete Node.js Example

```javascript
const axios = require('axios');

const API_KEY = 'pfh_test_your_api_key';
const BASE_URL = 'https://stripe-healthcare-production.up.railway.app';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Authorization': `Bearer ${API_KEY}` }
});

async function connectPatient(clientUserId) {
  // Step 1: Create widget token
  const { data: widget } = await client.post('/api/v1/widget/token', {
    client_user_id: clientUserId,
    products: ['health_records']
  });

  console.log('Widget Token:', widget.widget_token);
  console.log('Direct user to:', `${BASE_URL}/api/v1/widget/initiate/epic?widget_token=${widget.widget_token}`);

  return widget;
}

async function exchangeToken(publicToken) {
  // Step 2: Exchange public token
  const { data } = await client.post('/api/v1/widget/exchange', {
    public_token: publicToken
  });

  console.log('Connection ID:', data.connection_id);
  return data;
}

async function getHealthRecords() {
  // Step 3: Fetch health data
  const { data } = await client.get('/api/v1/health-records');

  console.log('Patient:', data.data.patient);
  console.log('Medications:', data.data.medications.length);
  console.log('Lab Results:', data.data.labs.length);
  console.log('Conditions:', data.data.conditions.length);

  return data;
}

// Example usage
(async () => {
  // For new patients
  const widget = await connectPatient('user_12345');

  // After OAuth callback (you'll receive publicToken from redirect)
  // const connection = await exchangeToken('pt_received_token');

  // For existing connections
  const records = await getHealthRecords();
})();
```

## Complete Python Example

```python
import requests

API_KEY = 'pfh_test_your_api_key'
BASE_URL = 'https://stripe-healthcare-production.up.railway.app'

headers = {'Authorization': f'Bearer {API_KEY}'}

def connect_patient(client_user_id):
    """Step 1: Create widget token"""
    response = requests.post(
        f'{BASE_URL}/api/v1/widget/token',
        headers=headers,
        json={
            'client_user_id': client_user_id,
            'products': ['health_records']
        }
    )
    widget = response.json()
    print(f"Widget Token: {widget['widget_token']}")
    print(f"Direct user to: {BASE_URL}/api/v1/widget/initiate/epic?widget_token={widget['widget_token']}")
    return widget

def exchange_token(public_token):
    """Step 2: Exchange public token"""
    response = requests.post(
        f'{BASE_URL}/api/v1/widget/exchange',
        headers=headers,
        json={'public_token': public_token}
    )
    data = response.json()
    print(f"Connection ID: {data['connection_id']}")
    return data

def get_health_records():
    """Step 3: Fetch health data"""
    response = requests.get(
        f'{BASE_URL}/api/v1/health-records',
        headers=headers
    )
    data = response.json()

    print(f"Patient: {data['data']['patient']}")
    print(f"Medications: {len(data['data']['medications'])}")
    print(f"Lab Results: {len(data['data']['labs'])}")
    print(f"Conditions: {len(data['data']['conditions'])}")

    return data

if __name__ == '__main__':
    # For new patients
    widget = connect_patient('user_12345')

    # After OAuth callback
    # connection = exchange_token('pt_received_token')

    # For existing connections
    records = get_health_records()
```

## What's Next?

- **API Reference**: See [api-reference.md](./api-reference.md) for all endpoints
- **Webhooks**: Set up webhooks to receive real-time updates
- **Provider List**: Check available providers at `/api/v1/widget/providers`
- **Error Handling**: Implement proper error handling for production

## Common Issues

### 401 Unauthorized
- Check that your API key is correct
- Ensure the key hasn't been revoked
- Verify the Authorization header format

### 403 Insufficient Scopes
- Your API key needs `write` scope to create widget tokens
- Create a new key with the required scopes

### 429 Rate Limited
- You've exceeded the rate limit
- Wait for the `Retry-After` header duration
- Consider implementing exponential backoff

### Provider Not Configured
- The provider may not be available yet
- Check `/api/v1/widget/providers` for available providers

## Support

Need help? Contact us at support@plaidhealth.com
