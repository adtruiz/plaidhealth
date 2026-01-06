/**
 * Provider Configuration Module
 *
 * Centralized configuration for all healthcare providers (EMRs, Payers, Labs)
 * Single source of truth for FHIR endpoints, OAuth settings, and display names
 */

const PROVIDER_CONFIG = {
  epic: {
    displayName: 'Epic MyChart',
    type: 'emr',
    fhirBaseUrl: () => process.env.EPIC_FHIR_BASE_URL,
    tokenUrl: () => process.env.EPIC_TOKEN_URL,
    clientId: () => process.env.EPIC_CLIENT_ID,
    authUrl: () => process.env.EPIC_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  smart: {
    displayName: 'SMART Health IT',
    type: 'emr',
    fhirBaseUrl: () => process.env.SMART_FHIR_BASE_URL,
    tokenUrl: () => process.env.SMART_TOKEN_URL,
    clientId: () => process.env.SMART_CLIENT_ID,
    authUrl: () => process.env.SMART_AUTHORIZATION_URL,
    scope: 'openid fhirUser patient/*.read',
    requiresAud: false,
    usesPKCE: true
  },
  cerner: {
    displayName: 'Oracle Health (Cerner)',
    type: 'emr',
    fhirBaseUrl: () => process.env.CERNER_FHIR_BASE_URL,
    tokenUrl: () => process.env.CERNER_TOKEN_URL,
    clientId: () => process.env.CERNER_CLIENT_ID,
    authUrl: () => process.env.CERNER_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  healow: {
    displayName: 'Healow (eClinicalWorks)',
    type: 'emr',
    fhirBaseUrl: () => process.env.HEALOW_FHIR_BASE_URL,
    tokenUrl: () => process.env.HEALOW_TOKEN_URL,
    clientId: () => process.env.HEALOW_CLIENT_ID,
    authUrl: () => process.env.HEALOW_AUTHORIZATION_URL,
    scope: 'openid fhirUser patient/AllergyIntolerance.read patient/CarePlan.read patient/CareTeam.read patient/Condition.read patient/Device.read patient/DiagnosticReport.read patient/DocumentReference.read patient/Binary.read patient/Encounter.read patient/Goal.read patient/Immunization.read patient/MedicationAdministration.read patient/MedicationRequest.read patient/Observation.read patient/Organization.read patient/Patient.read patient/Practitioner.read patient/Procedure.read patient/Provenance.read patient/Medication.read patient/Location.read patient/PractitionerRole.read',
    requiresAud: false,
    usesPKCE: true
  },
  meditech: {
    displayName: 'MEDITECH Greenfield',
    type: 'emr',
    fhirBaseUrl: () => process.env.MEDITECH_FHIR_BASE_URL,
    tokenUrl: () => process.env.MEDITECH_TOKEN_URL,
    clientId: () => process.env.MEDITECH_CLIENT_ID,
    clientSecret: () => process.env.MEDITECH_CLIENT_SECRET,
    authUrl: () => process.env.MEDITECH_AUTHORIZATION_URL,
    scope: 'patient/*.read',
    requiresAud: false,
    usesPKCE: false
  },
  nextgen: {
    displayName: 'NextGen Healthcare',
    type: 'emr',
    fhirBaseUrl: () => process.env.NEXTGEN_FHIR_BASE_URL,
    tokenUrl: () => process.env.NEXTGEN_TOKEN_URL,
    clientId: () => process.env.NEXTGEN_CLIENT_ID,
    clientSecret: () => process.env.NEXTGEN_CLIENT_SECRET,
    authUrl: () => process.env.NEXTGEN_AUTHORIZATION_URL,
    scope: 'launch/patient patient/*.read openid profile fhirUser',
    requiresAud: true,
    audUrl: 'https://fhir.nextgen.com/nge/prod/fhir-api-r4/fhir/r4',
    usesPKCE: false
  },
  athenahealth: {
    displayName: 'athenahealth',
    type: 'emr',
    fhirBaseUrl: () => process.env.ATHENAHEALTH_FHIR_BASE_URL,
    tokenUrl: () => process.env.ATHENAHEALTH_TOKEN_URL,
    clientId: () => process.env.ATHENAHEALTH_CLIENT_ID,
    clientSecret: () => process.env.ATHENAHEALTH_CLIENT_SECRET,
    authUrl: () => process.env.ATHENAHEALTH_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: true,
    usesPKCE: true
  },
  // Payers
  aetna: {
    displayName: 'Aetna',
    type: 'payer',
    fhirBaseUrl: () => process.env.AETNA_FHIR_BASE_URL,
    tokenUrl: () => process.env.AETNA_TOKEN_URL,
    clientId: () => process.env.AETNA_CLIENT_ID,
    clientSecret: () => process.env.AETNA_CLIENT_SECRET,
    authUrl: () => process.env.AETNA_AUTHORIZATION_URL,
    scope: 'launch/patient patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read patient/MedicationRequest.read patient/Condition.read patient/Observation.read patient/Encounter.read',
    requiresAud: true,
    audUrl: () => process.env.AETNA_AUD,
    usesPKCE: false
  },
  anthem: {
    displayName: 'Anthem (Elevance Health)',
    type: 'payer',
    fhirBaseUrl: () => process.env.ANTHEM_FHIR_BASE_URL,
    tokenUrl: () => process.env.ANTHEM_TOKEN_URL,
    clientId: () => process.env.ANTHEM_CLIENT_ID,
    clientSecret: () => process.env.ANTHEM_CLIENT_SECRET,
    authUrl: () => process.env.ANTHEM_AUTHORIZATION_URL,
    scope: 'launch/patient patient/*.read openid profile',
    requiresAud: true,
    audUrl: () => process.env.ANTHEM_AUD,
    usesPKCE: true
  },
  cigna: {
    displayName: 'Cigna Healthcare',
    type: 'payer',
    fhirBaseUrl: () => process.env.CIGNA_FHIR_BASE_URL,
    tokenUrl: () => process.env.CIGNA_TOKEN_URL,
    clientId: () => process.env.CIGNA_CLIENT_ID,
    authUrl: () => process.env.CIGNA_AUTHORIZATION_URL,
    scope: 'openid fhirUser patient/*.read',
    requiresAud: false,
    usesPKCE: true
  },
  humana: {
    displayName: 'Humana',
    type: 'payer',
    fhirBaseUrl: () => process.env.HUMANA_FHIR_BASE_URL,
    tokenUrl: () => process.env.HUMANA_TOKEN_URL,
    clientId: () => process.env.HUMANA_CLIENT_ID,
    clientSecret: () => process.env.HUMANA_CLIENT_SECRET,
    authUrl: () => process.env.HUMANA_AUTHORIZATION_URL,
    scope: 'patient/Patient.read patient/Coverage.read patient/ExplanationOfBenefit.read patient/MedicationRequest.read patient/Condition.read patient/Observation.read patient/Encounter.read',
    requiresAud: false,
    usesPKCE: false
  },
  uhc: {
    displayName: 'UnitedHealthcare',
    type: 'payer',
    fhirBaseUrl: () => process.env.UHC_FHIR_BASE_URL,
    tokenUrl: () => process.env.UHC_TOKEN_URL,
    clientId: () => process.env.UHC_CLIENT_ID,
    clientSecret: () => process.env.UHC_CLIENT_SECRET,
    authUrl: () => process.env.UHC_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: false,
    usesPKCE: true
  },
  kaiser: {
    displayName: 'Kaiser Permanente',
    type: 'payer',
    fhirBaseUrl: () => process.env.KAISER_FHIR_BASE_URL,
    tokenUrl: () => process.env.KAISER_TOKEN_URL,
    clientId: () => process.env.KAISER_CLIENT_ID,
    clientSecret: () => process.env.KAISER_CLIENT_SECRET,
    authUrl: () => process.env.KAISER_AUTHORIZATION_URL,
    scope: 'patient/*.read',
    requiresAud: true,
    usesPKCE: true
  },
  centene: {
    displayName: 'Centene',
    type: 'payer',
    fhirBaseUrl: () => process.env.CENTENE_FHIR_BASE_URL,
    tokenUrl: () => process.env.CENTENE_TOKEN_URL,
    clientId: () => process.env.CENTENE_CLIENT_ID,
    clientSecret: () => process.env.CENTENE_CLIENT_SECRET,
    authUrl: () => process.env.CENTENE_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: true,
    usesPKCE: true
  },
  molina: {
    displayName: 'Molina Healthcare',
    type: 'payer',
    fhirBaseUrl: () => process.env.MOLINA_FHIR_BASE_URL,
    tokenUrl: () => process.env.MOLINA_TOKEN_URL,
    clientId: () => process.env.MOLINA_CLIENT_ID,
    clientSecret: () => process.env.MOLINA_CLIENT_SECRET,
    authUrl: () => process.env.MOLINA_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient openid fhirUser',
    requiresAud: false,
    usesPKCE: false
  },
  bcbsmn: {
    displayName: 'Blue Cross Blue Shield Minnesota',
    type: 'payer',
    fhirBaseUrl: () => process.env.BCBS_MN_FHIR_BASE_URL,
    tokenUrl: () => process.env.BCBS_MN_TOKEN_URL,
    clientId: () => process.env.BCBS_MN_CLIENT_ID,
    clientSecret: () => process.env.BCBS_MN_CLIENT_SECRET,
    authUrl: () => process.env.BCBS_MN_AUTHORIZATION_URL,
    scope: 'launch/patient patient/*.read openid profile fhirUser offline_access',
    requiresAud: true,
    audUrl: 'https://preview-api.bluecrossmn.com/fhir',
    usesPKCE: false
  },
  bcbsma: {
    displayName: 'Blue Cross Blue Shield Massachusetts',
    type: 'payer',
    fhirBaseUrl: () => process.env.BCBS_MA_FHIR_BASE_URL,
    tokenUrl: () => process.env.BCBS_MA_TOKEN_URL,
    clientId: () => process.env.BCBS_MA_CLIENT_ID,
    clientSecret: () => process.env.BCBS_MA_CLIENT_SECRET,
    authUrl: () => process.env.BCBS_MA_AUTHORIZATION_URL,
    scope: 'openid patient/*.read',
    requiresAud: false,
    usesPKCE: false
  },
  bcbstn: {
    displayName: 'Blue Cross Blue Shield Tennessee',
    type: 'payer',
    fhirBaseUrl: () => process.env.BCBS_TN_FHIR_BASE_URL,
    tokenUrl: () => process.env.BCBS_TN_TOKEN_URL,
    clientId: () => process.env.BCBS_TN_CLIENT_ID,
    clientSecret: () => process.env.BCBS_TN_CLIENT_SECRET,
    authUrl: () => process.env.BCBS_TN_AUTHORIZATION_URL,
    scope: 'user/*.read',
    requiresAud: false,
    usesPKCE: false
  },
  hcsc: {
    displayName: 'HCSC (BCBS IL/TX/MT/NM/OK)',
    type: 'payer',
    fhirBaseUrl: () => process.env.HCSC_FHIR_BASE_URL,
    tokenUrl: () => process.env.HCSC_TOKEN_URL,
    clientId: () => process.env.HCSC_CLIENT_ID,
    clientSecret: () => process.env.HCSC_CLIENT_SECRET,
    authUrl: () => process.env.HCSC_AUTHORIZATION_URL,
    scope: 'openid hcscinteropscope',
    requiresAud: false,
    usesPKCE: true
  },
  bluebutton: {
    displayName: 'Medicare (Blue Button 2.0)',
    type: 'payer',
    fhirBaseUrl: () => process.env.BLUEBUTTON_FHIR_BASE_URL,
    tokenUrl: () => process.env.BLUEBUTTON_TOKEN_URL,
    clientId: () => process.env.BLUEBUTTON_CLIENT_ID,
    clientSecret: () => process.env.BLUEBUTTON_CLIENT_SECRET,
    authUrl: () => process.env.BLUEBUTTON_AUTHORIZATION_URL,
    scope: 'patient/Coverage.read patient/ExplanationOfBenefit.read patient/Patient.read profile',
    requiresAud: false,
    usesPKCE: true
  },
  // Labs
  quest: {
    displayName: 'Quest Diagnostics',
    type: 'lab',
    fhirBaseUrl: () => process.env.QUEST_FHIR_BASE_URL,
    tokenUrl: () => process.env.QUEST_TOKEN_URL,
    clientId: () => process.env.QUEST_CLIENT_ID,
    clientSecret: () => process.env.QUEST_CLIENT_SECRET,
    authUrl: () => process.env.QUEST_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  },
  labcorp: {
    displayName: 'LabCorp',
    type: 'lab',
    fhirBaseUrl: () => process.env.LABCORP_FHIR_BASE_URL,
    tokenUrl: () => process.env.LABCORP_TOKEN_URL,
    clientId: () => process.env.LABCORP_CLIENT_ID,
    clientSecret: () => process.env.LABCORP_CLIENT_SECRET,
    authUrl: () => process.env.LABCORP_AUTHORIZATION_URL,
    scope: 'patient/*.read launch/patient',
    requiresAud: true,
    usesPKCE: true
  }
};

/**
 * Get provider configuration
 */
function getProviderConfig(provider) {
  return PROVIDER_CONFIG[provider] || null;
}

/**
 * Get FHIR base URL for a provider
 */
function getFhirBaseUrl(provider) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.epic;
  return config.fhirBaseUrl();
}

/**
 * Get provider display name
 */
function getProviderDisplayName(provider) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.epic;
  return config.displayName;
}

/**
 * Get token URL for a provider
 */
function getTokenUrl(provider) {
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.epic;
  return config.tokenUrl();
}

/**
 * Get provider type (emr, payer, lab)
 */
function getProviderType(provider) {
  const config = PROVIDER_CONFIG[provider];
  return config ? config.type : 'unknown';
}

/**
 * Check if provider is configured (has required env vars)
 */
function isProviderConfigured(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return false;

  const clientId = config.clientId ? config.clientId() : null;
  const authUrl = config.authUrl ? config.authUrl() : null;

  return !!(clientId && authUrl);
}

/**
 * Get OAuth configuration for a provider
 */
function getOAuthConfig(provider) {
  const config = PROVIDER_CONFIG[provider];
  if (!config) return null;

  return {
    clientId: config.clientId ? config.clientId() : null,
    clientSecret: config.clientSecret ? config.clientSecret() : null,
    authUrl: config.authUrl ? config.authUrl() : null,
    audUrl: config.audUrl ? (typeof config.audUrl === 'function' ? config.audUrl() : config.audUrl) : null,
    scope: config.scope,
    requiresAud: config.requiresAud,
    usesPKCE: config.usesPKCE,
    displayName: config.displayName
  };
}

/**
 * Get all configured providers
 */
function getConfiguredProviders() {
  return Object.keys(PROVIDER_CONFIG).filter(isProviderConfigured);
}

/**
 * Get all provider names
 */
function getAllProviders() {
  return Object.keys(PROVIDER_CONFIG);
}

module.exports = {
  PROVIDER_CONFIG,
  getProviderConfig,
  getFhirBaseUrl,
  getProviderDisplayName,
  getTokenUrl,
  getProviderType,
  isProviderConfigured,
  getOAuthConfig,
  getConfiguredProviders,
  getAllProviders
};
