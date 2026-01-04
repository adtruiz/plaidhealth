# Support Requests & Follow-ups

**Last Updated**: January 17, 2025

This document tracks all pending support requests and follow-ups needed with healthcare providers.

---

## Pending Support Requests

### 1. Healow (eClinicalWorks)
**Status**: ⏳ Need to Contact Support
**Priority**: Medium
**Issue**: OAuth 403 error during authorization flow

**What to Ask**:
- Correct OAuth endpoints for patient-facing standalone apps
- Our Client ID: `OnmJr0u1k-17215Cu_-LcYnLWy8acjKCyJ1q0WY9UkI`
- Getting 403 error with scope: `launch/patient patient/*.read offline_access`
- Are there additional approval steps needed?
- Do we need practice-specific FHIR URLs?

**Contact Method**:
- Portal: https://connect4.healow.com/apps/jsp/dev/signIn.jsp
- Look for "Support" or "Help" section in developer portal
- Email: Check developer portal for support email

**Expected Response Time**: 1-3 business days

---

### 2. Cigna Healthcare
**Status**: ⏳ Need to Contact Support
**Priority**: High (you have historical data access)
**Issue**: Sandbox OAuth endpoints not publicly accessible (`r-hi2.cigna.com` times out)

**What to Ask**:
- How to access sandbox OAuth endpoints (`r-hi2.cigna.com`)
- Our Client ID: `32d6dea7-372e-403e-8d34-8249468e5ca2`
- Is VPN or IP whitelisting required?
- Are there publicly accessible test endpoints?
- Can we test with production endpoints for former members?
- Process for accessing historical claims data (former member since ~2023)

**Contact Method**:
- Portal: https://developer.cigna.com
- Click "Need Help" link in developer portal
- Create support ticket explaining sandbox access issue

**Expected Response Time**: 1-3 business days

---

### 3. UnitedHealthcare (FLEX)
**Status**: ⏳ Awaiting Organization Approval
**Priority**: Medium
**Issue**: Organization registration under review

**What to Ask** (if approved):
- Confirm sandbox access credentials
- Test patient information
- Transition plan to production

**What to Ask** (if not approved in 5 days):
- Status of organization approval
- Any additional information needed
- Expected timeline

**Contact Method**:
- Portal: https://portal.flex.optum.com/
- Email: flexvendorsupport@optum.com
- Support tab in FLEX Vendor Admin Portal

**Expected Response Time**: 3-5 business days (currently day 0)

---

### 4. Quest Diagnostics
**Status**: ⏳ Awaiting Access Request Response
**Priority**: Low
**Issue**: Waiting for developer access approval

**What to Ask** (after 1 week):
- Status of access request
- Expected timeline for approval
- Documentation access

**Contact Method**:
- Portal: https://api.questdiagnostics.com/
- Check for support/contact information in portal

**Expected Response Time**: 1-2 weeks

---

### 5. Aetna (CVS Health)
**Status**: ⏳ Awaiting Developer Access Approval
**Priority**: High (major insurance provider)
**Issue**: Submitted developer access request, awaiting approval

**What to Ask** (if approved):
- Confirm sandbox access credentials
- Test patient information and sample data
- OAuth endpoint URLs and FHIR base URL
- Scope requirements for patient data access

**What to Ask** (if not approved in 1 week):
- Status of developer access request
- Any additional information or documentation needed
- Expected timeline for approval

**Contact Method**:
- Developer Portal: Check portal for support/contact information
- Look for "Support" or "Help" section after approval

**Expected Response Time**: 3-7 business days

---

### 6. Meditech
**Status**: ⏳ Awaiting Developer Access Approval
**Priority**: High (large EHR vendor)
**Issue**: Submitted developer access request, awaiting approval

**What to Ask** (if approved):
- Confirm sandbox access credentials
- Test patient information and sample data
- OAuth endpoint URLs and FHIR base URL
- Documentation for standalone patient launch

**What to Ask** (if not approved in 1 week):
- Status of developer access request
- Any additional information or documentation needed
- Expected timeline for approval

**Contact Method**:
- Developer Portal: Check portal for support/contact information
- Look for "Support" or "Help" section after approval

**Expected Response Time**: 3-7 business days

---

### 7. Humana
**Status**: ⚠️ OAuth Working, But Test Patients Have No Data
**Priority**: Medium
**Issue**: OAuth integration successful, but sandbox test patients (HUser00001, HUser00002) return 404 for all FHIR resources

**What to Ask**:
- Do sandbox test patients have any FHIR data populated?
- Our Client ID: `0702e799-b30a-4627-b110-802a0a1a3e97`
- OAuth works correctly, but all FHIR queries return 404 Not Found
- Patient IDs being used: HUser00001, HUser00002
- Are there specific test patients with populated data?
- Or is the sandbox only for OAuth testing (no actual FHIR data)?

**Contact Method**:
- Developer Portal: https://developers.humana.com/
- Look for "Support" or "Contact Us" section
- Check documentation for test patient information

**Expected Response Time**: 1-3 business days

**Technical Details**:
- OAuth flow: Basic Auth (not PKCE) - ✅ Working
- Scopes requested: `patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read patient/MedicationRequest.read patient/Condition.read patient/Observation.read patient/Encounter.read`
- Token exchange: ✅ Success
- FHIR base URL: `https://sandbox-fhir.humana.com/fhir/r4`
- All FHIR API calls return 404 Not Found

---

## Completed / Working Integrations

### ✅ Epic MyChart
**Status**: Fully functional
**Sandbox Access**: Public with test credentials
**No action needed**

### ✅ Oracle Health (Cerner)
**Status**: OAuth integration complete, production-ready
**Note**: Sandbox test credentials not publicly available (expected)
**No action needed** - Will test with real users in production

---

## Action Plan for This Week

**Immediate Priority**:
1. ☐ Contact **Cigna Support** (highest priority - you have historical data)
2. ☐ Contact **Healow Support** (blocking OAuth implementation)
3. ☐ Contact **Humana Support** (OAuth working but no test data)

**Check Daily for Approval Notifications**:
4. ☐ Check **Aetna** portal for approval email (submitted today)
5. ☐ Check **Meditech** portal for approval email (submitted today)
6. ☐ Check **UnitedHealthcare** portal for approval status
7. ☐ Check **Quest Diagnostics** for any response (if 1 week has passed)

**Next Steps When Approved**:
- Aetna: Implement OAuth integration (likely SMART on FHIR with PKCE)
- Meditech: Implement OAuth integration (likely SMART on FHIR with PKCE)
- UnitedHealthcare: Implement OAuth integration
- Quest Diagnostics: Review API documentation and implement

---

## Email Template for Support Requests

### Template: OAuth Sandbox Access Issues

```
Subject: Sandbox OAuth Endpoint Access - Client ID: [YOUR_CLIENT_ID]

Hello [Provider] Support Team,

I'm developing a patient-facing application that integrates with your FHIR Patient Access API. I've successfully registered my application and received my Client ID, but I'm experiencing issues accessing the sandbox OAuth endpoints for testing.

**Application Details**:
- Client ID: [YOUR_CLIENT_ID]
- Redirect URI: https://stripe-healthcare-production.up.railway.app/callback
- Application Type: Patient-facing standalone app

**Issue**:
[Describe specific issue - e.g., "The OAuth authorization endpoint at [URL] is not accessible/times out" or "Receiving 403 error during authorization"]

**Questions**:
1. Are there additional steps required to access sandbox OAuth endpoints?
2. Do I need VPN access or IP whitelisting?
3. Are there publicly accessible test endpoints available?
4. What are the correct OAuth endpoint URLs for testing?

**Technical Details**:
- OAuth Flow: SMART on FHIR Standalone Launch with PKCE
- Scopes: [list scopes you're requesting]
- Error: [paste any error messages]

I'm ready to test the integration and would appreciate guidance on how to properly access your sandbox environment.

Thank you for your assistance!

Best regards,
[Your Name]
```

---

## Notes & Patterns Observed

### Common Healthcare FHIR Sandbox Limitations:
1. **Epic**: ✅ Public sandbox with test credentials (exception, not the rule)
2. **Most Providers**: Sandboxes are internal/restricted
3. **Insurance Companies**: Often require business approval before sandbox access
4. **EHR Vendors**: Production testing is more common than sandbox testing

### Workaround Strategy:
- Build integration code following SMART on FHIR standards
- Test with Epic (which works)
- Deploy production-ready code
- Test with real users when approved
- Architecture is consistent across all providers

---

## Success Metrics

**Current Status**:
- ✅ 1 fully working integration (Epic)
- ✅ 1 OAuth-only integration (Cerner - production ready)
- ⚠️ 1 OAuth working but no test data (Humana - needs support ticket)
- ⚠️ 2 integrations awaiting sandbox access (Healow, Cigna - expected)
- ⏳ 4 integrations awaiting approval (UnitedHealthcare, Quest, Aetna, Meditech)

**Providers by Category**:
- **EHR Vendors**: Epic ✅, Cerner ✅, Meditech ⏳
- **Insurance Payers**: Humana ⚠️, Cigna ⚠️, UnitedHealthcare ⏳, Aetna ⏳
- **Other**: Healow (eClinicalWorks) ⚠️, Quest Diagnostics ⏳

**Goal**:
- Test with at least 2 insurance providers (goal: UnitedHealthcare + Aetna or Cigna)
- Demonstrate multi-provider aggregation with Epic + insurance data
- Show unified health timeline across EHR and insurance data

**Lesson Learned**:
- Many insurance provider sandboxes have OAuth working but test patients have NO FHIR data
- This is a common pattern - sandboxes are for testing OAuth flow only
- Real data testing requires production environment or special sandbox access
- Approval process for insurance providers typically takes 3-7 days
