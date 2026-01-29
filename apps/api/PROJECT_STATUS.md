# VerziHealth - Project Status

**Last Updated:** January 4, 2026

## Project Overview

VerziHealth is a B2B API platform ("VerziHealth") that aggregates patient health data from EMRs and insurance payers via FHIR APIs, providing developers with a unified interface to access health records.

## Architecture

```
verzihealth/
├── apps/
│   ├── api/                 # Core FHIR API (Express.js, PostgreSQL, Redis)
│   ├── developer-portal/    # Developer dashboard (Next.js 14)
│   └── marketing-site/      # Public website (Next.js 14)
├── packages/
│   └── shared/              # Shared utilities
└── package.json             # Workspace root
```

| App | Port | Status | Description |
|-----|------|--------|-------------|
| `api` | 3000 | Production | Core FHIR aggregation API |
| `developer-portal` | 3001 | Ready | Developer dashboard, API key management |
| `marketing-site` | 3002 | Ready | Public marketing website |

---

## Integration Status

### EMR Systems

| Provider | Status | Type | Notes |
|----------|--------|------|-------|
| Epic MyChart | **Working** | Sandbox | 305M+ patients. Full FHIR R4 support |
| Oracle Health (Cerner) | Planned | - | 800+ hospitals |
| MEDITECH | Planned | - | 2,400+ hospitals |
| NextGen Healthcare | Configured | Sandbox | 16K+ practices |
| Healow (eClinicalWorks) | Planned | - | 850K+ providers |
| athenahealth | Research | - | Documentation review needed |

### Insurance Payers

| Provider | Status | Type | Notes |
|----------|--------|------|-------|
| Aetna | Configured | Sandbox | 39M+ members. OAuth configured |
| Anthem/Elevance | Configured | Sandbox | 47M+ members |
| BCBS Minnesota | Configured | Sandbox | Regional coverage |
| BCBS Massachusetts | Research | - | Developer portal access needed |
| BCBS Tennessee | Configured | Sandbox | Via 1UpHealth platform |
| HCSC (IL/TX/MT/NM/OK) | Research | - | 17M+ members |
| Cigna | Research | - | Developer documentation available |
| Centene | Research | - | 26M+ members |
| Humana | Research | - | Developer portal available |
| Kaiser Permanente | Configured | Sandbox | 12.7M members |
| Molina Healthcare | Configured | Sandbox | 5.2M+ members |
| UnitedHealthcare | Research | - | 50M+ members |
| Medicare Blue Button 2.0 | Configured | Sandbox | 64M+ enrollees. CMS API |

### Lab Networks

| Provider | Status | Type | Notes |
|----------|--------|------|-------|
| Quest Diagnostics | Planned | - | Largest US lab network |
| LabCorp | Planned | - | 2nd largest lab network |

---

## Core Features Status

### API Features

| Feature | Status | Notes |
|---------|--------|-------|
| OAuth 2.0 + PKCE | **Complete** | Multi-provider support |
| FHIR R4 Data Fetch | **Complete** | Patient, Medications, Labs, Conditions, Encounters |
| Data Normalization | **Complete** | Standard format across providers |
| Data Deduplication | **Complete** | Cross-provider record matching |
| Token Encryption | **Complete** | AES-256-GCM for stored tokens |
| Token Refresh | **Complete** | Automatic refresh before expiry |
| Rate Limiting | **Complete** | Per-API-key limits |
| Webhook Events | **Complete** | Real-time notifications |
| Connect Widget | **Complete** | Embeddable provider selection UI |
| Widget Token Flow | **Complete** | Plaid-like integration pattern |
| API Key Authentication | **Complete** | B2B auth for developers |
| Developer Auth | **Complete** | Email/password registration & login |
| Usage Tracking | **Complete** | Per-key request counting |
| HIPAA Audit Logging | **Complete** | All data access logged |

### Developer Portal Features

| Feature | Status | Notes |
|---------|--------|-------|
| User Registration | **Complete** | Email/password auth |
| User Login/Logout | **Complete** | Session-based authentication |
| Dashboard Overview | **Complete** | Key metrics display |
| API Key Management | **Complete** | Create, revoke, delete keys |
| Usage Analytics | **Complete** | Charts and metrics |
| API Documentation | UI Ready | Needs content |
| SDK Downloads | UI Ready | Needs SDKs |

### Marketing Site Features

| Feature | Status | Notes |
|---------|--------|-------|
| Home Page | **Complete** | Hero, features, CTA |
| Pricing Page | **Complete** | Tier comparison |
| About Page | **Complete** | Company info |
| Contact Form | **Complete** | Wired to API |
| Blog | UI Ready | Needs content |
| Documentation | Linked | Links to portal docs |

---

## Infrastructure

### Production (Railway)

| Component | Status | Notes |
|-----------|--------|-------|
| Node.js API | **Deployed** | verzihealth-production.up.railway.app |
| PostgreSQL | **Running** | Session, users, connections, audit logs |
| Redis | Configured | Caching, rate limiting |

### Database Tables

| Table | Status | Purpose |
|-------|--------|---------|
| users | **Created** | User accounts (Google OAuth + password auth) |
| ehr_connections | **Created** | Encrypted patient tokens per user |
| api_keys | **Created** | Developer API keys (hashed) |
| webhooks | **Created** | Webhook subscriptions |
| webhook_deliveries | **Created** | Delivery logs |
| widget_tokens | **Created** | Connect Widget sessions |
| public_tokens | **Created** | Token exchange |
| audit_logs | **Created** | HIPAA compliance logs |
| session | **Created** | Express session storage |
| contact_submissions | **Pending** | Contact form submissions |

### Migrations Pending

| Migration | Status | Description |
|-----------|--------|-------------|
| 006_add_developer_auth.sql | Ready | Password auth fields, environment column |
| 007_add_contact_submissions.sql | Ready | Contact form table |

---

## What Needs to Be Done

### High Priority

1. **Run Database Migrations**
   ```bash
   # Run on Railway
   railway run node -e "require('./src/db').pool.query(fs.readFileSync('./migrations/006_add_developer_auth.sql', 'utf8'))"
   railway run node -e "require('./src/db').pool.query(fs.readFileSync('./migrations/007_add_contact_submissions.sql', 'utf8'))"
   ```

2. **Deploy Updated Code**
   ```bash
   cd /Users/adruiz/projects/plaid-for-healthcare/apps/api
   git add -A
   git commit -m "Wire developer portal and marketing site to API"
   git push origin main
   railway up
   ```

3. **Test Full Developer Portal Flow**
   - [ ] Register new developer account
   - [ ] Login with credentials
   - [ ] Create API key
   - [ ] View usage statistics
   - [ ] Revoke/delete API key
   - [ ] Logout

4. **Test Marketing Site Contact Form**
   - [ ] Submit contact form
   - [ ] Verify database storage
   - [ ] Rate limiting works

### Medium Priority

5. **API Documentation Content**
   - Write endpoint documentation
   - Add code examples
   - Create quickstart guide

6. **SDK Development**
   - JavaScript/Node.js SDK
   - Python SDK
   - Add to developer portal downloads

7. **Production Provider Credentials**
   - Apply for production access with payers
   - Complete vendor questionnaires
   - Security assessments

### Lower Priority

8. **Additional Provider Integrations**
   - Complete Cigna integration
   - Add Humana
   - Add Centene
   - Research athenahealth
   - Add lab networks (Quest, LabCorp)

9. **Enhanced Features**
   - Email notifications for contact form
   - Billing integration (Stripe)
   - Team accounts for developers
   - Advanced analytics dashboard

---

## Environment Configuration

### Required Environment Variables

```env
# Core
PORT=3000
NODE_ENV=production
SESSION_SECRET=<64+ character secret>
ENCRYPTION_KEY=<64 hex character key>
REDIRECT_URI=https://your-domain.com/callback

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://host:6379

# Google OAuth (for web login)
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>

# Healthcare Providers (add as needed)
EPIC_CLIENT_ID=<client-id>
EPIC_AUTHORIZATION_URL=https://fhir.epic.com/...
EPIC_TOKEN_URL=https://fhir.epic.com/...
EPIC_FHIR_BASE_URL=https://fhir.epic.com/...

# Developer Portal & Marketing Site
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

---

## Test Credentials

### Epic Sandbox
- Username: `fhirderrick`
- Password: `epicepic1`

### Medicare Blue Button Sandbox
- Use test patient credentials from CMS sandbox

---

## Quick Commands

```bash
# Install all dependencies
npm install

# Run API locally
cd apps/api && npm start

# Run developer portal locally
cd apps/developer-portal && npm run dev

# Run marketing site locally
cd apps/marketing-site && npm run dev

# Deploy to Railway
railway up

# View Railway logs
railway logs

# Check Railway variables
railway variables
```

---

## Files Modified in Latest Session

| File | Change |
|------|--------|
| `apps/api/src/routes/developer.js` | Added email validation, session cleanup |
| `apps/api/src/routes/contact.js` | NEW - Contact form endpoint |
| `apps/api/src/server.js` | Added contact routes |
| `apps/api/migrations/006_add_developer_auth.sql` | NEW - Password auth migration |
| `apps/api/migrations/007_add_contact_submissions.sql` | NEW - Contact form table |
| `apps/developer-portal/src/lib/api.ts` | NEW - API client |
| `apps/developer-portal/src/lib/auth.tsx` | Wired to real API |
| `apps/developer-portal/src/app/(dashboard)/api-keys/page.tsx` | Wired to real API |
| `apps/developer-portal/src/app/(dashboard)/usage/page.tsx` | Wired to real API |
| `apps/marketing-site/src/app/contact/page.tsx` | Wired to real API |

---

## Repository

- **GitHub:** https://github.com/adtruiz/willow-and-co
- **Primary Branch:** main
- **Production URL:** https://verzihealth-production.up.railway.app/
