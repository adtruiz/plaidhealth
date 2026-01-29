# VerziHealth Live Test Guide

This guide is a step‑by‑step checklist to test the full product experience from a client’s perspective.

## 0) Prerequisites
- Production API base URL: `https://verzihealth-production.up.railway.app`
- Developer Portal URL: (your deployed portal URL)
- Marketing Site URL: (your deployed marketing URL)
- Valid provider sandbox credentials (e.g., Epic sandbox)

## 1) Marketing Site (First Impression)
1. Open the Marketing Site URL in an incognito window.
2. Verify the homepage loads and the core value prop is clear.
3. Click Pricing and confirm tiers/labels are correct.
4. Submit the Contact form and confirm success.
5. Check the footer links (Privacy, Terms) open and render.

## 2) Developer Portal (Onboarding)
1. Open the Developer Portal URL.
2. Register a new developer account.
3. Confirm you land on the dashboard after signup.
4. Create an API key; copy and save it.
5. Revoke the key and confirm it disappears or is marked revoked.
6. Log out and log back in to confirm session persistence.

## 3) Connect Widget Flow (Client Integration)
1. From the portal, open the Connect Widget demo (if available).
2. Select a provider (e.g., Epic).
3. Complete OAuth with sandbox credentials.
4. Confirm success and that a connection appears in the dashboard.

## 4) Core API Calls (Client Use Case)
Using the API key from step 2:
1. Call `/api/v1/health-records` and verify non‑empty data (after a connection is established).
2. Call `/api/v1/patient` and confirm a valid patient object.
3. Call `/api/v1/medications`, `/api/v1/conditions`, `/api/v1/labs`, `/api/v1/encounters`.
4. Confirm responses are consistent and timestamps look valid.

## 5) Webhooks (Real‑Time Updates)
1. Create a webhook endpoint (use a request bin if needed).
2. Trigger a new connection (Connect Widget).
3. Verify webhook delivery and payload format.

## 6) Health & Readiness (Ops Check)
1. `GET /health` → should be `status: ok`
2. `GET /health/redis` → should be `status: ok`
3. `GET /ready` → should be `status: ready`

## 7) CSRF Protection (Session Flows)
1. Log in via the web UI.
2. Request `GET /api/csrf` (should return `csrf_token`).
3. Perform a DELETE (e.g., disconnect a connection) with `X‑CSRF‑Token`.
4. Verify the request is accepted with token and rejected without it.

## 8) Demo Script (Client Walkthrough)
1. Marketing site: “Here’s what we do.”
2. Developer portal: “Sign up, get keys, integrate.”
3. Connect Widget: “Patient authorization flow.”
4. API calls: “Here’s the normalized data.”

## 9) Pass/Fail Criteria
- All flows complete without errors or broken links.
- Data returned is consistent and non‑empty after connecting.
- Health endpoints are green.
- Webhooks fire and deliver correctly.

## 10) Notes / Issues
Use this space to track anything unexpected:
- 
- 

