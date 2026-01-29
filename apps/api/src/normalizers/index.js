/**
 * VerziHealth - Data Normalization Layer
 *
 * Transforms raw FHIR data from various EMRs/payers into a consistent,
 * developer-friendly format. This is the core value proposition.
 *
 * Supports both sync (local mappings only) and async (with API fallback) modes.
 */

const normalizePatient = require('./patient');
const normalizeLabs = require('./labs');
const { normalizeLabsSync } = require('./labs');
const normalizeMedications = require('./medications');
const { normalizeMedicationsSync } = require('./medications');
const normalizeConditions = require('./conditions');
const normalizeEncounters = require('./encounters');
const normalizeClaims = require('./claims');

/**
 * Normalize all health records from a connection (async with API enrichment)
 * @param {Object} rawData - Raw FHIR bundle data
 * @param {string} provider - Provider name (epic, cerner, humana, etc.)
 * @param {Object} options - Options { enableApiLookup: boolean }
 * @returns {Promise<Object>} Normalized health record
 */
async function normalizeHealthRecord(rawData, provider, options = {}) {
  const { enableApiLookup = true } = options;

  const [labs, medications] = await Promise.all([
    normalizeLabs(rawData.observations, provider, { enableApiLookup }),
    normalizeMedications(rawData.medications, provider, { enableApiLookup })
  ]);

  return {
    patient: normalizePatient(rawData.patient, provider),
    labs,
    medications,
    conditions: normalizeConditions(rawData.conditions, provider),
    encounters: normalizeEncounters(rawData.encounters, provider),
    claims: normalizeClaims(rawData.claims, provider),
    _meta: {
      normalizedAt: new Date().toISOString(),
      provider,
      version: '1.0.0',
      apiEnriched: enableApiLookup
    }
  };
}

/**
 * Synchronous version - uses local mappings only (faster, no API calls)
 * @param {Object} rawData - Raw FHIR bundle data
 * @param {string} provider - Provider name
 * @returns {Object} Normalized health record
 */
function normalizeHealthRecordSync(rawData, provider) {
  return {
    patient: normalizePatient(rawData.patient, provider),
    labs: normalizeLabsSync(rawData.observations, provider),
    medications: normalizeMedicationsSync(rawData.medications, provider),
    conditions: normalizeConditions(rawData.conditions, provider),
    encounters: normalizeEncounters(rawData.encounters, provider),
    claims: normalizeClaims(rawData.claims, provider),
    _meta: {
      normalizedAt: new Date().toISOString(),
      provider,
      version: '1.0.0',
      apiEnriched: false
    }
  };
}

module.exports = {
  normalizeHealthRecord,
  normalizeHealthRecordSync,
  normalizePatient,
  normalizeLabs,
  normalizeLabsSync,
  normalizeMedications,
  normalizeMedicationsSync,
  normalizeConditions,
  normalizeEncounters,
  normalizeClaims
};
