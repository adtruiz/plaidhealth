# VerziHealth - FHIR Integration Platform

A production-ready platform for aggregating patient health data from multiple EHR systems and insurance providers using SMART on FHIR standards.

## What This Platform Does

✅ **Multi-Provider Support** - Epic, Cerner, Healow, Cigna, Humana integrations
✅ **OAuth 2.0 with PKCE** - Secure patient authorization flow
✅ **Google OAuth Login** - User account management
✅ **PostgreSQL Database** - Persistent storage with encrypted tokens (AES-256-GCM)
✅ **Unified Health Records** - Aggregates data from multiple sources
✅ **Smart Deduplication** - Fuzzy matching to identify duplicate records across providers
✅ **Consumer-Grade UI** - Beautiful dashboard with health timeline and charts
✅ **Multi-Account Support** - Users can connect multiple EHR and insurance accounts
✅ **Audit Logging** - HIPAA-compliant activity tracking
✅ **Token Management** - Automatic refresh for expired tokens
✅ **Production Logging** - Winston structured logging
✅ **Chart Processing** - Backend-preprocessed data for visualization

---

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed ([download here](https://nodejs.org/))
- Epic Developer account (free, takes 5 minutes to set up)

### Step 1: Register with Epic
1. Go to: https://fhir.epic.com/Developer/Apps
2. Create account (free)
3. Create new app:
   - **Application Type:** Patient
   - **Redirect URI:** `http://localhost:3000/callback`
   - **FHIR Specification:** R4
   - **Scopes:** Select all patient/*.read
4. Copy your **Client ID**

### Step 2: Install Dependencies
```bash
cd apps/api
npm install
```

### Step 3: Configure Environment
```bash
cp .env.example .env
# Edit .env and add your Epic Client ID
```

Your `.env` should look like:
```bash
EPIC_CLIENT_ID=abc123xyz456  # Your actual Client ID from Epic
EPIC_AUTHORIZATION_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize
EPIC_TOKEN_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
EPIC_FHIR_BASE_URL=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
REDIRECT_URI=http://localhost:3000/callback
PORT=3000
```

### Step 4: Start Server
```bash
npm start
```

### Step 5: Test Integration
1. Open browser: http://localhost:3000
2. Click "Connect Epic MyChart"
3. Log in with Epic sandbox credentials:
   - **Username:** `fhirderrick`
   - **Password:** `epicepic1`
4. Authorize the app
5. View your health data!

**Success!** You just fetched real FHIR data from Epic.

---

## Project Structure

```
apps/api/
├── src/
│   ├── server.js           # Express server with multi-provider FHIR integration
│   ├── db.js               # PostgreSQL database layer with encryption
│   ├── db-setup.js         # Database schema initialization
│   ├── encryption.js       # AES-256-GCM token encryption
│   ├── logger.js           # Winston structured logging
│   ├── token-refresh.js    # Automatic token refresh service
│   ├── deduplication.js    # Fuzzy matching for duplicate detection
│   └── chart-helpers.js    # Backend chart data preprocessing
├── public/
│   ├── login.html          # Landing page with Google OAuth
│   ├── my-dashboard.html   # User dashboard with connections
│   ├── health-records.html # Individual provider health records
│   ├── all-health-records.html # Unified multi-provider view
│   └── privacy-policy.html # Privacy policy
├── docs/
│   ├── FHIR_INTEGRATION_GUIDE.md  # Provider integration documentation
│   ├── SUPPORT_REQUESTS_TODO.md   # Provider support tracking
│   └── ADDING_EHR_PROVIDERS.md    # Developer guide for adding providers
├── package.json            # Node.js dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

---

## API Endpoints

### Authentication
- `GET /auth/google` - Google OAuth login
- `GET /auth/logout` - Logout
- `GET /auth/epic` - Initiate Epic OAuth flow
- `GET /auth/cerner` - Initiate Cerner OAuth flow
- `GET /auth/healow` - Initiate Healow OAuth flow
- `GET /auth/cigna` - Initiate Cigna OAuth flow
- `GET /auth/humana` - Initiate Humana OAuth flow
- `GET /callback` - Universal OAuth callback handler

### User & Connections (requires authentication)
- `GET /api/user` - Get current user profile
- `GET /api/epic-connections` - Get all EHR connections for user
- `DELETE /api/epic-connections/:id` - Delete connection

### Health Data (requires authentication)
- `GET /api/health-records/unified` - Aggregated data from all connections
- `GET /api/connection/:id/patient` - Patient demographics for specific connection
- `GET /api/connection/:id/medications` - Medications for specific connection
- `GET /api/connection/:id/conditions` - Conditions for specific connection
- `GET /api/connection/:id/labs` - Lab results for specific connection
- `GET /api/connection/:id/encounters` - Encounters for specific connection

### Chart Data (requires authentication)
- `GET /api/charts/lab-trends` - Pre-processed lab trends for Chart.js
- `GET /api/charts/medication-timeline` - Medication timeline chart data
- `GET /api/charts/health-timeline` - Unified health events timeline
- `GET /api/charts/condition-stats` - Condition statistics
- `GET /api/charts/overview` - Overview statistics with deduplication

### Health Check
- `GET /health` - Server status

---

## How It Works

### 1. OAuth 2.0 PKCE Flow

Epic requires PKCE (Proof Key for Code Exchange) for security:

```
Patient clicks "Connect Epic"
  ↓
App generates code_verifier + code_challenge
  ↓
Redirect to Epic authorization page
  ↓
Patient logs in and authorizes
  ↓
Epic redirects back with authorization code
  ↓
App exchanges code + code_verifier for access token
  ↓
Use access token to call FHIR API
```

### 2. FHIR API Calls

All FHIR requests follow this pattern:

```javascript
GET https://fhir.epic.com/.../api/FHIR/R4/{ResourceType}?patient={id}
Headers:
  Authorization: Bearer {access_token}
  Accept: application/fhir+json
```

### 3. Data Normalization

FHIR responses are JSON with nested structures. The frontend parses and displays:
- **Patient:** Name, DOB, gender
- **Observations:** Lab results (A1C, cholesterol, etc.)
- **MedicationRequest:** Current and past prescriptions
- **Condition:** Active diagnoses
- **Encounter:** Appointment history

---

## Epic Sandbox Test Patients

Epic provides test patients with different clinical scenarios:

| Username | Password | Description |
|----------|----------|-------------|
| `fhirderrick` | `epicepic1` | Adult male with diabetes, hypertension |
| `fhircamila` | `epicepic1` | Adult female with multiple conditions |
| `fhirelizabeth` | `epicepic1` | Pediatric patient |

Full list: https://fhir.epic.com/Documentation?docId=testpatients

---

## Next Steps

### 1. Add More FHIR Resources
The current prototype fetches 5 resource types. Epic supports many more:

- **AllergyIntolerance** - Patient allergies
- **Immunization** - Vaccine history
- **DiagnosticReport** - Lab reports, imaging
- **DocumentReference** - Clinical notes, PDFs
- **Procedure** - Surgeries, procedures
- **CarePlan** - Treatment plans

See: https://fhir.epic.com/Documentation?docId=epiconfhirrequestprocess

### 2. Store Tokens Securely
**Current:** Tokens stored in-memory (lost on restart)
**Production:** Encrypt and store in PostgreSQL + AWS Secrets Manager

```javascript
// Example: Encrypt access token before storing
const encryptedToken = encryptWithKMS(accessToken);
await db.query(
  'INSERT INTO emr_connections (patient_id, access_token) VALUES ($1, $2)',
  [patientId, encryptedToken]
);
```

### 3. Implement Token Refresh
Access tokens expire after 1 hour. Use refresh token to get new access token:

```javascript
async function refreshAccessToken(refreshToken) {
  const response = await axios.post(tokenUrl, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  });
  return response.data.access_token;
}
```

### 4. Add Other EMRs
Use the same OAuth pattern for Cerner and Athena:

**Cerner:**
- Register: https://code.cerner.com/developer/smart-on-fhir
- Auth URL: `https://authorization.cerner.com/tenants/{tenant}/oauth2/authorize`
- FHIR Base: `https://fhir-myrecord.cerner.com/{tenant}/`

**Athena:**
- Register: https://docs.athenahealth.com/
- Auth URL: `https://api.platform.athenahealth.com/oauth2/v1/authorize`
- FHIR Base: `https://api.platform.athenahealth.com/fhir/r4/`

### 5. Build Data Normalization Layer
Convert FHIR's complex format to a simplified schema:

```javascript
// FHIR Observation → Simplified format
function normalizeObservation(fhirObs) {
  return {
    id: fhirObs.id,
    type: 'lab_result',
    name: fhirObs.code.coding[0].display,
    value: fhirObs.valueQuantity.value,
    unit: fhirObs.valueQuantity.unit,
    date: fhirObs.effectiveDateTime,
    source: 'epic'
  };
}
```

### 6. Deploy to Production
- Use AWS ECS/Fargate or Heroku
- Set up PostgreSQL database (AWS RDS)
- Enable HTTPS (required for OAuth)
- Get HIPAA compliance audit

---

## Troubleshooting

### "Invalid redirect_uri"
- Make sure redirect URI in code **exactly matches** what you registered with Epic
- No trailing slashes!
- Epic: `http://localhost:3000/callback`
- Code: `REDIRECT_URI=http://localhost:3000/callback`

### "Invalid client_id"
- Double-check Client ID in `.env` file
- Remove any spaces or quotes
- Copy directly from Epic developer portal

### "Token expired"
- Access tokens expire after 1 hour
- Implement token refresh (see "Next Steps" above)
- For testing, just re-authorize

### No data showing up
- Check browser console (F12 → Console) for errors
- Check server logs for API errors
- Verify FHIR scopes are correct in Epic
- Try different test patient (some have more data)

### CORS errors
- Shouldn't happen with this setup (server proxies API calls)
- If you see CORS errors, make sure you're using server-side API calls, not client-side

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** PostgreSQL with encrypted token storage
- **HTTP Client:** Axios
- **Authentication:** Google OAuth + SMART on FHIR with PKCE
- **Encryption:** AES-256-GCM (crypto module)
- **Logging:** Winston structured logging
- **FHIR Version:** R4
- **Session Management:** PostgreSQL session store
- **Frontend:** Vanilla JavaScript + Chart.js
- **Deployment:** Railway (production)
- **Styling:** CSS (no dependencies)

---

## Security Notes

### Current Implementation (Production-Ready)
- ✅ Tokens encrypted at rest (AES-256-GCM)
- ✅ PostgreSQL database with session store
- ✅ HTTPS enforced (Railway deployment)
- ✅ PKCE flow (secure OAuth)
- ✅ State parameter (CSRF protection)
- ✅ Audit logging (all data access tracked)
- ✅ Winston structured logging
- ✅ Automatic token refresh
- ✅ Security headers middleware

### Additional Production Requirements
- ⏳ Rate limiting (implement as needed)
- ⏳ HIPAA compliance audit (when handling PHI at scale)
- ⏳ Business Associate Agreements (BAAs) with vendors
- ⏳ Penetration testing
- ⏳ GDPR compliance (if serving EU users)

---

## Resources

### Official Documentation
- **Epic FHIR:** https://fhir.epic.com/Documentation
- **FHIR Spec:** https://www.hl7.org/fhir/
- **SMART on FHIR:** http://docs.smarthealthit.org/
- **OAuth 2.0 PKCE:** https://oauth.net/2/pkce/

### Healthcare Standards
- **LOINC (Lab codes):** https://loinc.org/
- **RxNorm (Drug codes):** https://www.nlm.nih.gov/research/umls/rxnorm/
- **ICD-10 (Diagnosis codes):** https://www.cdc.gov/nchs/icd/icd-10-cm.htm

### Regulatory
- **21st Century Cures Act:** https://www.healthit.gov/curesrule/
- **HIPAA:** https://www.hhs.gov/hipaa/index.html

---

## Contributing

This is a prototype for demonstration purposes. To expand it:

1. Add more FHIR resources (see Epic docs)
2. Implement database storage (PostgreSQL)
3. Add token refresh logic
4. Build data normalization layer
5. Add Cerner and Athena integrations
6. Create analytics dashboard for payers

---

## License

Proprietary - All rights reserved

---

**Questions?** Read the tutorial in `docs/FHIR_TUTORIAL.md` or check Epic's documentation.

**Ready to build?** This prototype is your foundation. Now scale it into the full "VerziHealth" platform! 🚀
