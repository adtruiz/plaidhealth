/**
 * Medical Code Lookup Service
 *
 * Provides code lookups for LOINC, RxNorm, ICD-10, and SNOMED.
 * Uses local mappings first, then falls back to external APIs.
 * Caches API results for improved performance.
 */

const logger = require('./logger');

// Load local mappings
const loincMappings = require('./mappings/loinc.json');
const rxnormMappings = require('./mappings/rxnorm.json');
const icd10Mappings = require('./mappings/icd10.json');

// In-memory cache for API lookups (in production, use Redis)
const cache = {
  loinc: new Map(),
  rxnorm: new Map(),
  icd10: new Map(),
  snomed: new Map()
};

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Get cached value if not expired
 */
function getCached(cacheMap, key) {
  const entry = cacheMap.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.value;
  }
  return null;
}

/**
 * Set cache value with timestamp
 */
function setCache(cacheMap, key, value) {
  cacheMap.set(key, { value, timestamp: Date.now() });
}

// ============== RxNorm API ==============
// Free API, no key required: https://rxnav.nlm.nih.gov/RxNormAPIs.html

/**
 * Look up medication by RxNorm code using RxNav API
 */
async function lookupRxNorm(rxcui) {
  // Check local mappings first
  if (rxnormMappings[rxcui]) {
    return rxnormMappings[rxcui];
  }

  // Check cache
  const cached = getCached(cache.rxnorm, rxcui);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${rxcui}/properties.json`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      logger.debug('RxNorm API returned non-OK status', { rxcui, status: response.status });
      return null;
    }

    const data = await response.json();
    const props = data?.propConceptGroup?.propConcept?.[0];

    if (!props) {
      return null;
    }

    const result = {
      name: props.propValue || `RxNorm ${rxcui}`,
      rxnorm: rxcui,
      category: 'unknown'
    };

    setCache(cache.rxnorm, rxcui, result);
    logger.debug('RxNorm API lookup successful', { rxcui, name: result.name });

    return result;
  } catch (error) {
    logger.error('RxNorm API lookup failed', { rxcui, error: error.message });
    return null;
  }
}

/**
 * Search RxNorm by drug name
 */
async function searchRxNorm(drugName) {
  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(drugName)}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const concepts = data?.drugGroup?.conceptGroup || [];

    const results = [];
    for (const group of concepts) {
      for (const concept of group.conceptProperties || []) {
        results.push({
          rxcui: concept.rxcui,
          name: concept.name,
          synonym: concept.synonym,
          tty: concept.tty // Term type (SCD, SBD, etc.)
        });
      }
    }

    return results.slice(0, 10); // Limit results
  } catch (error) {
    logger.error('RxNorm search failed', { drugName, error: error.message });
    return [];
  }
}

/**
 * Get RxNorm drug class
 */
async function getRxNormClass(rxcui) {
  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${rxcui}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const classes = data?.rxclassDrugInfoList?.rxclassDrugInfo || [];

    if (classes.length > 0) {
      return {
        className: classes[0].rxclassMinConceptItem?.className,
        classId: classes[0].rxclassMinConceptItem?.classId,
        classType: classes[0].rxclassMinConceptItem?.classType
      };
    }

    return null;
  } catch (error) {
    logger.error('RxNorm class lookup failed', { rxcui, error: error.message });
    return null;
  }
}

// ============== LOINC API ==============
// FHIR Terminology Server: https://fhir.loinc.org

/**
 * Look up lab test by LOINC code using LOINC FHIR server
 */
async function lookupLOINC(loincCode) {
  // Check local mappings first
  if (loincMappings[loincCode]) {
    return loincMappings[loincCode];
  }

  // Check cache
  const cached = getCached(cache.loinc, loincCode);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://fhir.loinc.org/CodeSystem/$lookup?system=http://loinc.org&code=${loincCode}`,
      {
        headers: {
          'Accept': 'application/fhir+json'
        }
      }
    );

    if (!response.ok) {
      logger.debug('LOINC API returned non-OK status', { loincCode, status: response.status });
      return null;
    }

    const data = await response.json();
    const parameters = data?.parameter || [];

    let name = null;
    let category = 'unknown';

    for (const param of parameters) {
      if (param.name === 'display') {
        name = param.valueString;
      }
      if (param.name === 'property' && param.part) {
        const codePart = param.part.find(p => p.name === 'code');
        const valuePart = param.part.find(p => p.name === 'value');
        if (codePart?.valueCode === 'CLASS' && valuePart?.valueString) {
          category = valuePart.valueString.toLowerCase();
        }
      }
    }

    if (!name) {
      return null;
    }

    const result = {
      name,
      loinc: loincCode,
      category
    };

    setCache(cache.loinc, loincCode, result);
    logger.debug('LOINC API lookup successful', { loincCode, name });

    return result;
  } catch (error) {
    logger.error('LOINC API lookup failed', { loincCode, error: error.message });
    return null;
  }
}

/**
 * Search LOINC by test name
 */
async function searchLOINC(testName) {
  try {
    const response = await fetch(
      `https://fhir.loinc.org/CodeSystem/$lookup?system=http://loinc.org&_filter=display co "${encodeURIComponent(testName)}"&_count=10`,
      {
        headers: {
          'Accept': 'application/fhir+json'
        }
      }
    );

    if (!response.ok) {
      // LOINC FHIR server search is limited, fall back to simple approach
      return [];
    }

    const data = await response.json();
    // Parse FHIR response...
    return [];
  } catch (error) {
    logger.error('LOINC search failed', { testName, error: error.message });
    return [];
  }
}

// ============== ICD-10 ==============
// Using local mappings + SNOMED->ICD-10 mapping

/**
 * Look up condition by ICD-10 code
 */
function lookupICD10(icd10Code) {
  // Check local mappings
  if (icd10Mappings[icd10Code]) {
    return icd10Mappings[icd10Code];
  }

  // Check cache (for dynamically added codes)
  const cached = getCached(cache.icd10, icd10Code);
  if (cached) {
    return cached;
  }

  return null;
}

/**
 * Map SNOMED code to ICD-10
 */
function snomedToICD10(snomedCode) {
  const mappings = icd10Mappings._snomed_mappings || {};

  if (mappings[snomedCode]) {
    const mapping = mappings[snomedCode];
    return {
      icd10: mapping.icd10,
      name: mapping.name,
      source: 'snomed_mapping'
    };
  }

  // Check cache
  const cached = getCached(cache.snomed, snomedCode);
  if (cached) {
    return cached;
  }

  return null;
}

// ============== Unified Code Lookup ==============

/**
 * Look up any medical code
 * @param {string} code - The code value
 * @param {string} system - The code system (loinc, rxnorm, icd10, snomed)
 * @returns {Promise<Object|null>} Code information or null
 */
async function lookupCode(code, system) {
  const normalizedSystem = normalizeCodeSystem(system);

  switch (normalizedSystem) {
    case 'loinc':
      return await lookupLOINC(code);
    case 'rxnorm':
      return await lookupRxNorm(code);
    case 'icd10':
      return lookupICD10(code);
    case 'snomed':
      return snomedToICD10(code);
    default:
      logger.debug('Unknown code system', { system, code });
      return null;
  }
}

/**
 * Normalize code system URI to short name
 */
function normalizeCodeSystem(system) {
  if (!system) return null;

  const systemLower = system.toLowerCase();

  if (systemLower.includes('loinc')) return 'loinc';
  if (systemLower.includes('rxnorm')) return 'rxnorm';
  if (systemLower.includes('icd-10') || systemLower.includes('icd10')) return 'icd10';
  if (systemLower.includes('snomed') || systemLower.includes('sct')) return 'snomed';
  if (systemLower.includes('cpt')) return 'cpt';
  if (systemLower.includes('ndc')) return 'ndc';

  return systemLower;
}

/**
 * Enrich a code with full information
 * @param {Object} coding - FHIR coding object { system, code, display }
 * @returns {Promise<Object>} Enriched coding with name and category
 */
async function enrichCode(coding) {
  if (!coding || !coding.code) {
    return coding;
  }

  const system = normalizeCodeSystem(coding.system);
  const lookup = await lookupCode(coding.code, system);

  if (lookup) {
    return {
      ...coding,
      display: coding.display || lookup.name,
      name: lookup.name,
      category: lookup.category,
      codeSystem: system?.toUpperCase() || 'UNKNOWN',
      _enriched: true
    };
  }

  return {
    ...coding,
    codeSystem: system?.toUpperCase() || 'UNKNOWN',
    _enriched: false
  };
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    loinc: cache.loinc.size,
    rxnorm: cache.rxnorm.size,
    icd10: cache.icd10.size,
    snomed: cache.snomed.size
  };
}

/**
 * Clear all caches
 */
function clearCache() {
  cache.loinc.clear();
  cache.rxnorm.clear();
  cache.icd10.clear();
  cache.snomed.clear();
}

module.exports = {
  // Individual lookups
  lookupLOINC,
  lookupRxNorm,
  lookupICD10,
  snomedToICD10,

  // Search functions
  searchRxNorm,
  searchLOINC,

  // RxNorm extras
  getRxNormClass,

  // Unified interface
  lookupCode,
  enrichCode,
  normalizeCodeSystem,

  // Cache management
  getCacheStats,
  clearCache
};
