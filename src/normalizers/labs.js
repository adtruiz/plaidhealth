/**
 * Labs Normalizer
 *
 * Transforms FHIR Observation resources (laboratory results) into consistent format.
 * Maps various code systems to LOINC where possible.
 * Falls back to LOINC API for unknown codes.
 */

const loincMappings = require('../mappings/loinc.json');
const { lookupLOINC } = require('../code-lookup');

/**
 * Extract lab name from Observation (sync version for initial processing)
 * Priority: code.text > coding[].display > local mapping
 */
function extractLabName(observation, loincLookup = null) {
  const code = observation?.code;
  if (!code) return 'Unknown Test';

  // Prefer human-readable text
  if (code.text) return code.text;

  // Fall back to coding display
  const coding = code.coding?.[0];
  if (coding?.display) return coding.display;

  // Check local mappings
  if (coding?.code && loincMappings[coding.code]) {
    return loincMappings[coding.code].name;
  }

  // Use API lookup result if available
  if (loincLookup?.name) {
    return loincLookup.name;
  }

  return coding?.code || 'Unknown Test';
}

/**
 * Extract LOINC code, mapping proprietary codes if possible
 */
function extractLoincCode(observation) {
  const codings = observation?.code?.coding || [];

  // First, look for LOINC code
  const loincCoding = codings.find(c =>
    c.system === 'http://loinc.org' ||
    c.system?.includes('loinc')
  );
  if (loincCoding?.code) return loincCoding.code;

  // Try to map proprietary code to LOINC
  for (const coding of codings) {
    if (coding.code && loincMappings[coding.code]) {
      return loincMappings[coding.code].loinc;
    }
  }

  // Return first code as fallback
  return codings[0]?.code || null;
}

/**
 * Extract numeric value and unit
 */
function extractValue(observation) {
  // Quantity value (most common for labs)
  if (observation.valueQuantity) {
    return {
      value: observation.valueQuantity.value,
      unit: observation.valueQuantity.unit || observation.valueQuantity.code,
      type: 'quantity'
    };
  }

  // String value
  if (observation.valueString) {
    return {
      value: observation.valueString,
      unit: null,
      type: 'string'
    };
  }

  // Codeable concept (e.g., positive/negative)
  if (observation.valueCodeableConcept) {
    return {
      value: observation.valueCodeableConcept.text ||
             observation.valueCodeableConcept.coding?.[0]?.display,
      unit: null,
      type: 'coded'
    };
  }

  return { value: null, unit: null, type: null };
}

/**
 * Extract reference range
 */
function extractReferenceRange(observation) {
  const range = observation.referenceRange?.[0];
  if (!range) return null;

  return {
    low: range.low?.value || null,
    high: range.high?.value || null,
    unit: range.low?.unit || range.high?.unit || null,
    text: range.text || null
  };
}

/**
 * Determine if result is abnormal
 */
function isAbnormal(observation) {
  const interpretation = observation.interpretation?.[0];
  if (!interpretation) return null;

  const code = interpretation.coding?.[0]?.code;
  const abnormalCodes = ['H', 'HH', 'L', 'LL', 'A', 'AA', 'HU', 'LU'];
  return abnormalCodes.includes(code);
}

/**
 * Main normalizer function
 * @param {Array} observations - Array of raw FHIR Observation resources
 * @param {string} provider - Source provider
 * @param {Object} options - Options { enableApiLookup: boolean }
 * @returns {Promise<Array>} Normalized lab results
 */
async function normalizeLabs(observations, provider, options = {}) {
  const { enableApiLookup = true } = options;

  if (!observations?.length) return [];

  // Filter to only laboratory results
  const labObservations = observations.filter(obs => {
    const categories = obs.category || [];
    return categories.some(cat =>
      cat.coding?.some(c => c.code === 'laboratory')
    );
  });

  // Process labs, enriching with API data where needed
  const results = await Promise.all(labObservations.map(async (obs) => {
    const { value, unit, type } = extractValue(obs);
    const loincCode = extractLoincCode(obs);

    // Try API lookup for codes not in local mappings
    let loincLookup = null;
    if (enableApiLookup && loincCode && !loincMappings[loincCode]) {
      try {
        loincLookup = await lookupLOINC(loincCode);
      } catch (e) {
        // Silently fail API lookups
      }
    }

    return {
      id: obs.id || null,
      name: extractLabName(obs, loincLookup),
      code: loincCode,
      codeSystem: 'LOINC',
      category: loincLookup?.category || loincMappings[loincCode]?.category || null,
      value,
      unit,
      valueType: type,
      date: obs.effectiveDateTime || obs.issued || null,
      status: obs.status || 'unknown',
      referenceRange: extractReferenceRange(obs),
      isAbnormal: isAbnormal(obs),
      source: provider,
      _enriched: !!loincLookup,
      _raw: obs
    };
  }));

  return results;
}

/**
 * Synchronous version for backwards compatibility (no API lookups)
 */
function normalizeLabsSync(observations, provider) {
  if (!observations?.length) return [];

  const labObservations = observations.filter(obs => {
    const categories = obs.category || [];
    return categories.some(cat =>
      cat.coding?.some(c => c.code === 'laboratory')
    );
  });

  return labObservations.map(obs => {
    const { value, unit, type } = extractValue(obs);
    const loincCode = extractLoincCode(obs);

    return {
      id: obs.id || null,
      name: extractLabName(obs),
      code: loincCode,
      codeSystem: 'LOINC',
      category: loincMappings[loincCode]?.category || null,
      value,
      unit,
      valueType: type,
      date: obs.effectiveDateTime || obs.issued || null,
      status: obs.status || 'unknown',
      referenceRange: extractReferenceRange(obs),
      isAbnormal: isAbnormal(obs),
      source: provider,
      _raw: obs
    };
  });
}

module.exports = normalizeLabs;
module.exports.normalizeLabsSync = normalizeLabsSync;
