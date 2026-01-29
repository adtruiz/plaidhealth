/**
 * Conditions Normalizer
 *
 * Transforms FHIR Condition resources into consistent format.
 * Maps various code systems to ICD-10 where possible.
 * Uses SNOMED API lookup for enriched tier.
 */

const icd10Mappings = require('../mappings/icd10.json');
const { lookupSNOMED } = require('../code-lookup');

/**
 * Extract condition name
 * Priority: code.text > coding[].display
 */
function extractConditionName(condition) {
  const code = condition?.code;
  if (!code) return 'Unknown Condition';

  if (code.text) return code.text;

  const coding = code.coding?.[0];
  if (coding?.display) return coding.display;

  // Try ICD-10 lookup
  if (coding?.code && icd10Mappings[coding.code]) {
    return icd10Mappings[coding.code].name;
  }

  return coding?.code || 'Unknown Condition';
}

/**
 * Extract ICD-10 code, mapping SNOMED if possible
 */
function extractIcd10Code(condition) {
  const codings = condition?.code?.coding || [];

  // First, look for ICD-10 code
  const icd10Coding = codings.find(c =>
    c.system === 'http://hl7.org/fhir/sid/icd-10-cm' ||
    c.system?.includes('icd-10') ||
    c.system?.includes('icd10')
  );
  if (icd10Coding?.code) return { code: icd10Coding.code, system: 'ICD-10' };

  // Look for SNOMED code
  const snomedCoding = codings.find(c =>
    c.system === 'http://snomed.info/sct' ||
    c.system?.includes('snomed')
  );
  if (snomedCoding?.code) {
    // Try to map SNOMED to ICD-10
    if (icd10Mappings[snomedCoding.code]) {
      return { code: icd10Mappings[snomedCoding.code].icd10, system: 'ICD-10' };
    }
    return { code: snomedCoding.code, system: 'SNOMED' };
  }

  return { code: codings[0]?.code || null, system: 'unknown' };
}

/**
 * Normalize clinical status
 */
function normalizeClinicalStatus(condition) {
  const status = condition?.clinicalStatus?.coding?.[0]?.code;
  const statusMap = {
    'active': 'active',
    'recurrence': 'active',
    'relapse': 'active',
    'inactive': 'inactive',
    'remission': 'inactive',
    'resolved': 'resolved'
  };
  return statusMap[status] || 'unknown';
}

/**
 * Normalize verification status
 */
function normalizeVerificationStatus(condition) {
  const status = condition?.verificationStatus?.coding?.[0]?.code;
  const statusMap = {
    'confirmed': 'confirmed',
    'provisional': 'provisional',
    'differential': 'provisional',
    'unconfirmed': 'unconfirmed',
    'refuted': 'refuted',
    'entered-in-error': 'error'
  };
  return statusMap[status] || 'unknown';
}

/**
 * Extract onset date
 */
function extractOnsetDate(condition) {
  if (condition.onsetDateTime) return condition.onsetDateTime;
  if (condition.onsetPeriod?.start) return condition.onsetPeriod.start;
  if (condition.onsetAge?.value) return `Age ${condition.onsetAge.value}`;
  if (condition.onsetString) return condition.onsetString;
  return null;
}

/**
 * Extract category (problem-list-item, encounter-diagnosis, etc.)
 */
function extractCategory(condition) {
  const category = condition?.category?.[0];
  if (!category) return 'unknown';

  const code = category.coding?.[0]?.code;
  const categoryMap = {
    'problem-list-item': 'problem',
    'encounter-diagnosis': 'diagnosis',
    'health-concern': 'concern'
  };
  return categoryMap[code] || code || 'unknown';
}

/**
 * Extract severity
 */
function extractSeverity(condition) {
  const severity = condition?.severity?.coding?.[0];
  if (!severity) return null;

  return {
    code: severity.code,
    display: severity.display || severity.code
  };
}

/**
 * Main normalizer function
 * @param {Array} conditions - Array of raw FHIR Condition resources
 * @param {string} provider - Source provider
 * @param {Object} options - Options { enableApiLookup: boolean }
 * @returns {Promise<Array>} Normalized conditions
 */
async function normalizeConditions(conditions, provider, options = {}) {
  const { enableApiLookup = true } = options;

  if (!conditions?.length) return [];

  const results = await Promise.all(conditions.map(async (cond) => {
    const { code, system } = extractIcd10Code(cond);

    // Try SNOMED API lookup for enriched tier
    let snomedLookup = null;
    if (enableApiLookup && system === 'SNOMED') {
      try {
        snomedLookup = await lookupSNOMED(code);
      } catch (e) {
        // Silently fail API lookups
      }
    }

    return {
      id: cond.id || null,
      name: snomedLookup?.name || extractConditionName(cond),
      code,
      codeSystem: system,
      clinicalStatus: normalizeClinicalStatus(cond),
      verificationStatus: normalizeVerificationStatus(cond),
      category: extractCategory(cond),
      severity: extractSeverity(cond),
      onsetDate: extractOnsetDate(cond),
      recordedDate: cond.recordedDate || null,
      source: provider,
      _enriched: !!snomedLookup,
      _raw: cond
    };
  }));

  return results;
}

/**
 * Synchronous version for backwards compatibility (no API lookups)
 */
function normalizeConditionsSync(conditions, provider) {
  if (!conditions?.length) return [];

  return conditions.map(cond => {
    const { code, system } = extractIcd10Code(cond);

    return {
      id: cond.id || null,
      name: extractConditionName(cond),
      code,
      codeSystem: system,
      clinicalStatus: normalizeClinicalStatus(cond),
      verificationStatus: normalizeVerificationStatus(cond),
      category: extractCategory(cond),
      severity: extractSeverity(cond),
      onsetDate: extractOnsetDate(cond),
      recordedDate: cond.recordedDate || null,
      source: provider,
      _enriched: false,
      _raw: cond
    };
  });
}

module.exports = normalizeConditions;
module.exports.normalizeConditionsSync = normalizeConditionsSync;
