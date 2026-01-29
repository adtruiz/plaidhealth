# Welcome to VerziHealth - New Engineer Onboarding

**Your Mission:** You're the last line of defense before we demo to clients. Review everything. Question everything. Fix what needs fixing. Make this production-ready.

---

## Part 1: Understand What We're Building

### The Vision (Read This First)

VerziHealth is **"VerziHealth"** - a B2B API platform that does for health data what Plaid did for financial data.

**The Problem:** Healthcare data is fragmented across thousands of EMRs (Epic, Cerner, etc.), insurance payers (Aetna, Humana, etc.), and lab systems. Each has different APIs, authentication flows, and data formats. Building healthcare apps means integrating with dozens of systems individually.

**Our Solution:** One API. Developers integrate once with VerziHealth, and we handle:
- OAuth flows with 50+ healthcare providers
- FHIR R4 data normalization (consistent format regardless of source)
- Data deduplication across providers
- HIPAA compliance, encryption, audit logging
- Webhook notifications for real-time updates

**Business Model:** We follow Plaid's model exactly:
- We're a **data pipe**, not a clinical intelligence platform
- Developers pay per API call / connected patient
- We offer Basic (raw normalized data) and Enriched (with code lookups, deduplication) tiers

### Documentation Reading Order

Read these in order to build mental context:

1. **`README.md`** - Technical overview, quick start, architecture
2. **`PROJECT_STATUS.md`** - Current state, what's complete, what's pending
3. **`DESIGN_SYSTEM.md`** - Brand guidelines (teal/mint color palette)
4. **`apps/api/README.md`** - API-specific documentation
5. **`apps/api/docs/FHIR_INTEGRATION_GUIDE.md`** - How we integrate with healthcare providers
6. **`apps/api/docs/ADDING_EHR_PROVIDERS.md`** - Provider integration patterns

---

## Part 2: Architecture Overview

```
plaid-for-healthcare/
├── apps/
│   ├── api/                    # Core backend (Express.js + PostgreSQL)
│   │   ├── src/
│   │   │   ├── server.js       # Main Express server
│   │   │   ├── db.js           # PostgreSQL connection pool
│   │   │   ├── routes/         # API endpoints
│   │   │   │   ├── fhir.js     # /v1/patients/* endpoints (THE CORE)
│   │   │   │   ├── auth.js     # OAuth flows with providers
│   │   │   │   ├── developer.js # Developer portal auth
│   │   │   │   ├── api-keys.js # API key management
│   │   │   │   ├── webhooks.js # Webhook subscriptions
│   │   │   │   └── widget.js   # Plaid Link-style connect widget
│   │   │   ├── normalizers/    # FHIR data transformers
│   │   │   ├── middleware/     # Auth, rate limiting, logging
│   │   │   ├── providers/      # Provider-specific OAuth configs
│   │   │   └── code-lookup.js  # Medical code enrichment (RxNorm, LOINC, etc.)
│   │   └── tests/              # Jest test suite
│   │
│   ├── developer-portal/       # Next.js 14 - Developer dashboard
│   │   └── src/
│   │       ├── app/(dashboard)/ # Dashboard pages
│   │       ├── components/      # UI components (shadcn/ui)
│   │       └── lib/             # API client, auth context
│   │
│   └── marketing-site/         # Next.js 14 - Public website
│       └── src/
│           ├── app/            # Marketing pages
│           ├── components/     # Reusable components
│           └── lib/            # Constants, utilities
│
├── packages/                   # Shared packages (future SDKs)
└── docs/                       # Additional documentation
```

### Key Data Flows to Understand

**Flow 1: Developer Onboarding**
```
Developer visits marketing site → Signs up in developer portal →
Creates API key → Embeds Connect Widget in their app
```

**Flow 2: Patient Connection (The Core)**
```
Patient clicks "Connect Health Records" in developer's app →
VerziHealth Connect Widget loads →
Patient selects provider (Epic, etc.) →
OAuth flow with provider →
We store encrypted access token →
Developer receives public_token via webhook →
Developer exchanges for access_token →
Developer calls /v1/patients/* endpoints
```

**Flow 3: Data Retrieval**
```
Developer calls GET /v1/patients/{id}/medications →
We fetch from provider's FHIR API →
Normalize to standard format →
Optionally enrich with RxNorm lookups →
Return clean JSON
```

---

## Part 3: Critical Review Checklist

### 3.1 Security Audit (PRIORITY: CRITICAL)

This is healthcare data. HIPAA violations can bankrupt a company.

**Authentication & Authorization**
- [ ] Review `apps/api/src/middleware/auth.js` - How are API keys validated?
- [ ] Check session handling in `apps/api/src/routes/developer.js`
- [ ] Verify OAuth state parameter is checked (CSRF protection)
- [ ] Audit PKCE implementation in OAuth flows
- [ ] Check for authorization bypass vulnerabilities (can user A access user B's data?)

**Encryption**
- [ ] Review `apps/api/src/encryption.js` - Is AES-256-GCM implemented correctly?
- [ ] Verify tokens are encrypted before database storage
- [ ] Check encryption key rotation capability
- [ ] Ensure no sensitive data logged in plaintext

**Input Validation**
- [ ] SQL injection in database queries (use parameterized queries)
- [ ] XSS in any rendered content
- [ ] Path traversal in file operations
- [ ] Request body size limits
- [ ] Rate limiting per API key AND per IP

**HIPAA Compliance**
- [ ] Audit logging captures all PHI access (`apps/api/src/db.js` - `auditDb`)
- [ ] Logs don't contain PHI
- [ ] Data retention policies implemented
- [ ] Access controls enforce minimum necessary

**Questions to Answer:**
1. If an API key is compromised, what's the blast radius?
2. Can we revoke a key and immediately stop all access?
3. Are there any endpoints that bypass authentication?
4. What happens if the encryption key is rotated?

### 3.2 API Design Review (PRIORITY: HIGH)

Our API is our product. It must be flawless.

**RESTful Consistency**
- [ ] Review all routes in `apps/api/src/routes/fhir.js`
- [ ] Verify consistent error response format
- [ ] Check HTTP status codes are correct (don't return 200 for errors)
- [ ] Ensure pagination is implemented consistently
- [ ] Verify rate limit headers are returned

**Error Handling**
- [ ] No stack traces in production error responses
- [ ] Errors have unique codes for debugging
- [ ] Error messages are helpful but don't leak implementation details
- [ ] All async operations have proper error handling

**Performance**
- [ ] Check for N+1 query problems
- [ ] Review database indexes (check `apps/api/src/db-setup.js`)
- [ ] Evaluate caching strategy (`apps/api/src/code-lookup.js` has in-memory cache)
- [ ] Check for memory leaks (cache eviction was recently added)
- [ ] Review connection pooling configuration

**Data Contracts**
- [ ] Response schemas are documented and consistent
- [ ] Breaking changes would be versioned (v1 → v2)
- [ ] Optional fields have sensible defaults
- [ ] Timestamps use ISO 8601 format consistently

### 3.3 Code Quality Review (PRIORITY: HIGH)

**Normalizers (`apps/api/src/normalizers/`)**

These transform messy FHIR data into our clean format. They're critical.

- [ ] `medications.js` - Handle edge cases (missing fields, null values)
- [ ] `conditions.js` - Recently made async for SNOMED lookups, verify correctness
- [ ] `labs.js` - LOINC code handling
- [ ] `patient.js` - PII handling, date formats
- [ ] Check for defensive coding (what if provider returns unexpected format?)

**Test Coverage**
- [ ] Run `cd apps/api && npm test` - currently 281 tests passing
- [ ] Review test coverage report - what's NOT tested?
- [ ] Are edge cases tested? Empty arrays, null values, malformed data
- [ ] Are error paths tested?
- [ ] Add integration tests if missing

**Code Patterns to Check**
- [ ] Promises properly awaited (no floating promises)
- [ ] Try/catch blocks with meaningful error handling
- [ ] No console.log in production code (use logger)
- [ ] Environment variables validated at startup
- [ ] Graceful shutdown handling

### 3.4 Frontend Review (PRIORITY: MEDIUM)

**Developer Portal (`apps/developer-portal/`)**

- [ ] Authentication flow (`src/lib/auth.tsx`)
- [ ] API client error handling (`src/lib/api.ts`)
- [ ] Loading states (skeleton components added recently)
- [ ] Mobile responsiveness
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Form validation (API key creation, webhook URLs)

**Marketing Site (`apps/marketing-site/`)**

- [ ] SEO meta tags (recently added Open Graph)
- [ ] Performance (Lighthouse score)
- [ ] All links work (no 404s)
- [ ] Contact form wired correctly
- [ ] Mobile menu functionality

### 3.5 Infrastructure Review (PRIORITY: MEDIUM)

**Database**
- [ ] Review schema in `apps/api/src/db-setup.js`
- [ ] Check migration files in `apps/api/migrations/`
- [ ] Are foreign keys properly indexed?
- [ ] Is there a backup strategy?

**Environment Configuration**
- [ ] `.env.example` is complete and documented
- [ ] No secrets in code or git history
- [ ] Different configs for dev/staging/prod

**Deployment**
- [ ] Review Railway configuration (if applicable)
- [ ] Health check endpoint works (`/health`)
- [ ] Graceful degradation if Redis unavailable
- [ ] Zero-downtime deployment possible?

---

## Part 4: Specific Files to Deep-Dive

These files are the most critical. Read them line by line.

### Must Review (Security/Core Logic)
1. `apps/api/src/middleware/auth.js` - All authentication logic
2. `apps/api/src/routes/fhir.js` - The entire core API
3. `apps/api/src/encryption.js` - Token encryption
4. `apps/api/src/db.js` - HIPAA audit logging (`auditDb`)
5. `apps/api/src/code-lookup.js` - External API calls, caching

### Should Review (Quality/UX)
6. `apps/api/src/normalizers/*.js` - Data transformation logic
7. `apps/api/src/routes/widget.js` - Connect widget flow
8. `apps/developer-portal/src/lib/auth.tsx` - Frontend auth
9. `apps/developer-portal/src/lib/api.ts` - API client

### Quick Review (UI/Polish)
10. `apps/marketing-site/src/app/page.tsx` - Landing page
11. `apps/developer-portal/src/app/(dashboard)/page.tsx` - Dashboard

---

## Part 5: Known Issues & Technical Debt

Be aware of these when reviewing:

1. **Mock Data in Frontend** - Dashboard shows mock activity/errors (not wired to real data yet)
2. **Environment Switcher** - UI exists but doesn't actually switch API endpoints
3. **Search** - Global search in portal header is UI-only, not functional
4. **Webhook Retries** - UI shows retry button but backend retry logic may be incomplete
5. **Team Management** - UI complete, but API endpoints may need review
6. **API Documentation** - `/docs` page exists but content is placeholder

---

## Part 6: Pre-Demo Checklist

Before the demo, ensure:

### API
- [ ] All tests pass (`cd apps/api && npm test`)
- [ ] No TypeScript errors (`cd apps/developer-portal && npx tsc --noEmit`)
- [ ] Health endpoint returns 200 (`curl localhost:3000/health`)
- [ ] Can create API key and make authenticated request
- [ ] Connect widget flow works end-to-end
- [ ] Error responses are clean (no stack traces)

### Developer Portal
- [ ] Can register new account
- [ ] Can login/logout
- [ ] Can create/revoke API key
- [ ] Usage stats display (even if mocked)
- [ ] Dark mode toggle works
- [ ] Mobile responsive

### Marketing Site
- [ ] All pages load without errors
- [ ] Contact form submits
- [ ] Pricing page accurate
- [ ] No broken links
- [ ] API playground code examples are correct

### Demo Script Dry Run
- [ ] Walkthrough marketing site → "Here's what we do"
- [ ] Developer portal signup → "Here's how developers onboard"
- [ ] API key creation → "Credentials in 30 seconds"
- [ ] Connect widget demo → "Patient authorization flow"
- [ ] API call demo → "Here's the data they get"

---

## Part 7: How to Run Everything

```bash
# Install dependencies (from repo root)
npm install

# Run API (port 3000)
cd apps/api && npm start

# Run Developer Portal (port 3001) - separate terminal
cd apps/developer-portal && npm run dev

# Run Marketing Site (port 3002) - separate terminal
cd apps/marketing-site && npm run dev

# Run API tests
cd apps/api && npm test

# TypeScript check frontends
cd apps/developer-portal && npx tsc --noEmit
cd apps/marketing-site && npx tsc --noEmit
```

### Test Credentials

**Epic Sandbox:**
- Username: `fhirderrick`
- Password: `epicepic1`

**Developer Portal (local):**
- Create your own account via registration

---

## Part 8: Your Deliverables

After your review, please document:

1. **CRITICAL Issues** - Security vulnerabilities, data integrity risks (fix immediately)
2. **HIGH Issues** - Bugs that would embarrass us in a demo (fix before demo)
3. **MEDIUM Issues** - Code quality, performance concerns (fix soon)
4. **LOW Issues** - Nice-to-haves, refactoring opportunities (backlog)

For each issue:
- File and line number
- Description of the problem
- Recommended fix
- Level of effort (S/M/L)

---

## Part 9: Questions You Should Be Asking

As you review, think about:

1. **What happens when things fail?** - Provider down, database timeout, Redis unavailable
2. **What happens at scale?** - 1000 concurrent requests, 1M patients
3. **What happens with bad actors?** - Malicious input, stolen API keys, DDoS
4. **What's the debugging experience?** - Can we trace a request end-to-end?
5. **What's the developer experience?** - Is our API intuitive? Error messages helpful?
6. **What would a security auditor flag?** - Think like a pentester
7. **What would a customer complain about?** - Think like a developer using our API

---

## Part 10: Contact & Resources

**Repository:** https://github.com/adtruiz/verzihealth

**Key Reference Sites:**
- FHIR R4 Spec: https://www.hl7.org/fhir/
- Epic FHIR Docs: https://fhir.epic.com/
- SMART on FHIR: http://docs.smarthealthit.org/

**If you find something critical:**
Don't wait. Fix it and document it. We trust your judgment.

---

*Welcome aboard. Make us proud.* 🚀
