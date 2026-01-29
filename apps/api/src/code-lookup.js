/**
 * Medical Code Lookup Service
 *
 * Provides code lookups for all major medical code systems:
 * - RxNorm (medications) - NIH RxNav API
 * - LOINC (lab tests) - LOINC FHIR server
 * - ICD-10 (diagnoses) - Local mappings + API
 * - SNOMED CT (clinical terms) - NLM Browser API
 * - NDC (drug identifiers) - openFDA API
 * - CPT (procedures) - Local mappings (AMA-owned)
 * - HCPCS (healthcare services) - Local mappings
 * - DRG (diagnosis groups) - Local mappings
 *
 * Uses local mappings first, then falls back to external APIs.
 * Caches API results for improved performance.
 */

const logger = require('./logger');

// Load local mappings
const loincMappings = require('./mappings/loinc.json');
const rxnormMappings = require('./mappings/rxnorm.json');
const icd10Mappings = require('./mappings/icd10.json');
const cptHcpcsMappings = require('./mappings/cpt-hcpcs.json');

// In-memory cache for API lookups
// Note: For high-volume production, consider migrating to Redis using the existing redis.js module
const cache = {
  loinc: new Map(),
  rxnorm: new Map(),
  icd10: new Map(),
  snomed: new Map(),
  ndc: new Map()
};

// Cache configuration
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_MAX_SIZE = 10000; // Max entries per code system to prevent memory issues
const API_TIMEOUT = 5000; // 5 seconds

/**
 * Get cached value if not expired
 */
function getCached(cacheMap, key) {
  const entry = cacheMap.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.value;
  }
  // Remove expired entry
  if (entry) {
    cacheMap.delete(key);
  }
  return null;
}

/**
 * Set cache value with timestamp, enforcing max size
 */
function setCache(cacheMap, key, value) {
  // Evict oldest entries if cache is full
  if (cacheMap.size >= CACHE_MAX_SIZE) {
    // Delete first 10% of entries (oldest, since Map maintains insertion order)
    const toDelete = Math.floor(CACHE_MAX_SIZE * 0.1);
    const keys = Array.from(cacheMap.keys()).slice(0, toDelete);
    keys.forEach(k => cacheMap.delete(k));
    logger.debug('Cache eviction triggered', { cacheSize: cacheMap.size, evicted: toDelete });
  }
  cacheMap.set(key, { value, timestamp: Date.now() });
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
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
    const response = await fetchWithTimeout(
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
    if (error.name === 'AbortError') {
      logger.debug('RxNorm API timeout', { rxcui });
    } else {
      logger.error('RxNorm API lookup failed', { rxcui, error: error.message });
    }
    return null;
  }
}

/**
 * Search RxNorm by drug name
 */
async function searchRxNorm(drugName) {
  try {
    const response = await fetchWithTimeout(
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
          tty: concept.tty
        });
      }
    }

    return results.slice(0, 10);
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
    const response = await fetchWithTimeout(
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

/**
 * Check for drug interactions between medications
 * @param {Array} rxcuis - Array of RxNorm codes
 * @returns {Promise<Array>} Interactions found
 */
async function checkDrugInteractions(rxcuis) {
  if (!rxcuis || rxcuis.length < 2) {
    return [];
  }

  try {
    const rxcuiList = rxcuis.join('+');
    const response = await fetchWithTimeout(
      `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcuiList}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const interactions = [];

    const interactionGroups = data?.fullInteractionTypeGroup || [];
    for (const group of interactionGroups) {
      for (const interactionType of group.fullInteractionType || []) {
        for (const pair of interactionType.interactionPair || []) {
          interactions.push({
            severity: pair.severity || 'unknown',
            description: pair.description,
            drugs: pair.interactionConcept?.map(c => ({
              name: c.minConceptItem?.name,
              rxcui: c.minConceptItem?.rxcui
            })) || []
          });
        }
      }
    }

    return interactions;
  } catch (error) {
    logger.error('Drug interaction check failed', { error: error.message });
    return [];
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
    const response = await fetchWithTimeout(
      `https://fhir.loinc.org/CodeSystem/$lookup?system=http://loinc.org&code=${loincCode}`,
      { headers: { 'Accept': 'application/fhir+json' } }
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
    if (error.name === 'AbortError') {
      logger.debug('LOINC API timeout', { loincCode });
    } else {
      logger.error('LOINC API lookup failed', { loincCode, error: error.message });
    }
    return null;
  }
}

// ============== NDC (openFDA) ==============
// Free API: https://open.fda.gov/apis/drug/ndc/

/**
 * Look up drug by NDC code using openFDA
 */
async function lookupNDC(ndcCode) {
  // Normalize NDC (remove dashes)
  const normalizedNdc = ndcCode.replace(/-/g, '');

  // Check cache
  const cached = getCached(cache.ndc, normalizedNdc);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetchWithTimeout(
      `https://api.fda.gov/drug/ndc.json?search=product_ndc:"${ndcCode}"+package_ndc:"${ndcCode}"&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const drug = data?.results?.[0];

    if (!drug) {
      return null;
    }

    const result = {
      name: drug.brand_name || drug.generic_name || `NDC ${ndcCode}`,
      genericName: drug.generic_name,
      brandName: drug.brand_name,
      manufacturer: drug.labeler_name,
      dosageForm: drug.dosage_form,
      route: drug.route?.[0],
      ndc: ndcCode,
      category: drug.pharm_class?.[0] || 'unknown'
    };

    setCache(cache.ndc, normalizedNdc, result);
    logger.debug('NDC lookup successful', { ndcCode, name: result.name });

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.debug('openFDA API timeout', { ndcCode });
    } else {
      logger.error('NDC lookup failed', { ndcCode, error: error.message });
    }
    return null;
  }
}

// ============== ICD-10 ==============

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

// ============== SNOMED CT ==============
// Using NLM Browser API

/**
 * Look up clinical term by SNOMED code
 */
async function lookupSNOMED(snomedCode) {
  // Check SNOMED->ICD-10 mappings first
  const mappings = icd10Mappings._snomed_mappings || {};
  if (mappings[snomedCode]) {
    return {
      name: mappings[snomedCode].name,
      snomed: snomedCode,
      icd10: mappings[snomedCode].icd10,
      category: 'diagnosis'
    };
  }

  // Check cache
  const cached = getCached(cache.snomed, snomedCode);
  if (cached) {
    return cached;
  }

  try {
    // Using the SNOMED CT Browser API (no auth needed for basic lookups)
    const response = await fetchWithTimeout(
      `https://browser.ihtsdotools.org/snowstorm/snomed-ct/browser/MAIN/concepts/${snomedCode}`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data?.fsn?.term) {
      return null;
    }

    const result = {
      name: data.pt?.term || data.fsn.term, // Preferred term or Fully Specified Name
      snomed: snomedCode,
      fsn: data.fsn.term,
      category: data.definitionStatus?.toLowerCase() || 'unknown'
    };

    setCache(cache.snomed, snomedCode, result);
    logger.debug('SNOMED lookup successful', { snomedCode, name: result.name });

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.debug('SNOMED API timeout', { snomedCode });
    } else {
      logger.error('SNOMED lookup failed', { snomedCode, error: error.message });
    }
    return null;
  }
}

/**
 * Map SNOMED code to ICD-10 (sync, local only)
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

  return null;
}

// ============== CPT / HCPCS / DRG ==============
// Using local mappings (CPT is AMA-owned, no free API)

/**
 * Look up procedure by CPT code
 */
function lookupCPT(cptCode) {
  const mapping = cptHcpcsMappings.cpt?.[cptCode];
  if (mapping) {
    return {
      name: mapping.name,
      cpt: cptCode,
      category: mapping.category
    };
  }
  return null;
}

/**
 * Look up service by HCPCS code
 */
function lookupHCPCS(hcpcsCode) {
  const mapping = cptHcpcsMappings.hcpcs?.[hcpcsCode];
  if (mapping) {
    return {
      name: mapping.name,
      hcpcs: hcpcsCode,
      category: mapping.category
    };
  }
  return null;
}

/**
 * Look up diagnosis group by DRG code
 */
function lookupDRG(drgCode) {
  const mapping = cptHcpcsMappings.drg?.[drgCode];
  if (mapping) {
    return {
      name: mapping.name,
      drg: drgCode,
      category: mapping.category
    };
  }
  return null;
}

// ============== Unified Code Lookup ==============

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
  if (systemLower.includes('cpt') || systemLower.includes('ama-assn')) return 'cpt';
  if (systemLower.includes('hcpcs') || systemLower.includes('hcfa')) return 'hcpcs';
  if (systemLower.includes('ndc')) return 'ndc';
  if (systemLower.includes('drg') || systemLower.includes('ms-drg')) return 'drg';

  return systemLower;
}

/**
 * Look up any medical code
 * @param {string} code - The code value
 * @param {string} system - The code system (loinc, rxnorm, icd10, snomed, cpt, hcpcs, ndc, drg)
 * @param {boolean} useApi - Whether to use external APIs (for enriched tier)
 * @returns {Promise<Object|null>} Code information or null
 */
async function lookupCode(code, system, useApi = true) {
  const normalizedSystem = normalizeCodeSystem(system);

  switch (normalizedSystem) {
    case 'loinc':
      return useApi ? await lookupLOINC(code) : (loincMappings[code] || null);
    case 'rxnorm':
      return useApi ? await lookupRxNorm(code) : (rxnormMappings[code] || null);
    case 'icd10':
      return lookupICD10(code);
    case 'snomed':
      return useApi ? await lookupSNOMED(code) : snomedToICD10(code);
    case 'ndc':
      return useApi ? await lookupNDC(code) : null;
    case 'cpt':
      return lookupCPT(code);
    case 'hcpcs':
      return lookupHCPCS(code);
    case 'drg':
      return lookupDRG(code);
    default:
      logger.debug('Unknown code system', { system, code });
      return null;
  }
}

/**
 * Enrich a code with full information
 * @param {Object} coding - FHIR coding object { system, code, display }
 * @param {boolean} useApi - Whether to use external APIs (for enriched tier)
 * @returns {Promise<Object>} Enriched coding with name and category
 */
async function enrichCode(coding, useApi = true) {
  if (!coding || !coding.code) {
    return coding;
  }

  const system = normalizeCodeSystem(coding.system);
  const lookup = await lookupCode(coding.code, system, useApi);

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
 * Batch enrich multiple codes
 * @param {Array} codings - Array of FHIR coding objects
 * @param {boolean} useApi - Whether to use external APIs
 * @returns {Promise<Array>} Enriched codings
 */
async function enrichCodes(codings, useApi = true) {
  if (!codings || !Array.isArray(codings)) {
    return [];
  }

  return Promise.all(codings.map(coding => enrichCode(coding, useApi)));
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    loinc: cache.loinc.size,
    rxnorm: cache.rxnorm.size,
    icd10: cache.icd10.size,
    snomed: cache.snomed.size,
    ndc: cache.ndc.size
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
  cache.ndc.clear();
}

module.exports = {
  // Individual lookups (async where API is involved)
  lookupLOINC,
  lookupRxNorm,
  lookupICD10,
  lookupSNOMED,
  lookupNDC,
  lookupCPT,
  lookupHCPCS,
  lookupDRG,
  snomedToICD10,

  // Search functions
  searchRxNorm,

  // RxNorm extras
  getRxNormClass,
  checkDrugInteractions,

  // Unified interface
  lookupCode,
  enrichCode,
  enrichCodes,
  normalizeCodeSystem,

  // Cache management
  getCacheStats,
  clearCache
};
