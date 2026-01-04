/**
 * Medications Normalizer
 *
 * Transforms FHIR MedicationRequest resources into consistent format.
 * Maps various code systems to RxNorm where possible.
 * Falls back to RxNorm API for unknown codes.
 */

const rxnormMappings = require('../mappings/rxnorm.json');
const { lookupRxNorm, getRxNormClass } = require('../code-lookup');

/**
 * Extract medication name
 * Priority: medicationCodeableConcept.text > coding[].display > lookup
 */
function extractMedicationName(medRequest, rxnormLookup = null) {
  const medConcept = medRequest?.medicationCodeableConcept;

  if (medConcept?.text) return medConcept.text;

  const coding = medConcept?.coding?.[0];
  if (coding?.display) return coding.display;

  // Try local RxNorm lookup
  if (coding?.code && rxnormMappings[coding.code]) {
    return rxnormMappings[coding.code].name;
  }

  // Use API lookup result if available
  if (rxnormLookup?.name) {
    return rxnormLookup.name;
  }

  return coding?.code || 'Unknown Medication';
}

/**
 * Extract RxNorm code, mapping proprietary codes if possible
 */
function extractRxNormCode(medRequest) {
  const codings = medRequest?.medicationCodeableConcept?.coding || [];

  // First, look for RxNorm code
  const rxnormCoding = codings.find(c =>
    c.system === 'http://www.nlm.nih.gov/research/umls/rxnorm' ||
    c.system?.includes('rxnorm')
  );
  if (rxnormCoding?.code) return rxnormCoding.code;

  // Try NDC code mapping
  const ndcCoding = codings.find(c => c.system?.includes('ndc'));
  if (ndcCoding?.code && rxnormMappings[ndcCoding.code]) {
    return rxnormMappings[ndcCoding.code].rxnorm;
  }

  return codings[0]?.code || null;
}

/**
 * Extract dosage instructions
 */
function extractDosage(medRequest) {
  const dosageInstruction = medRequest?.dosageInstruction?.[0];
  if (!dosageInstruction) return null;

  // Try to build human-readable dosage
  const parts = [];

  // Dose quantity
  if (dosageInstruction.doseAndRate?.[0]?.doseQuantity) {
    const dose = dosageInstruction.doseAndRate[0].doseQuantity;
    parts.push(`${dose.value} ${dose.unit || ''}`);
  }

  // Frequency
  if (dosageInstruction.timing?.code?.text) {
    parts.push(dosageInstruction.timing.code.text);
  } else if (dosageInstruction.timing?.repeat) {
    const repeat = dosageInstruction.timing.repeat;
    if (repeat.frequency && repeat.period) {
      parts.push(`${repeat.frequency}x per ${repeat.period} ${repeat.periodUnit || ''}`);
    }
  }

  // Route
  if (dosageInstruction.route?.text) {
    parts.push(dosageInstruction.route.text);
  }

  return {
    text: dosageInstruction.text || parts.join(' ') || null,
    dose: dosageInstruction.doseAndRate?.[0]?.doseQuantity?.value || null,
    doseUnit: dosageInstruction.doseAndRate?.[0]?.doseQuantity?.unit || null,
    frequency: dosageInstruction.timing?.code?.text || null,
    route: dosageInstruction.route?.text || null,
    instructions: dosageInstruction.patientInstruction || null
  };
}

/**
 * Extract prescriber information
 */
function extractPrescriber(medRequest) {
  const requester = medRequest?.requester;
  if (!requester) return null;

  return {
    name: requester.display || null,
    reference: requester.reference || null
  };
}

/**
 * Normalize medication status
 */
function normalizeStatus(fhirStatus) {
  const statusMap = {
    'active': 'active',
    'completed': 'completed',
    'stopped': 'stopped',
    'on-hold': 'on-hold',
    'cancelled': 'cancelled',
    'entered-in-error': 'error',
    'draft': 'draft',
    'unknown': 'unknown'
  };
  return statusMap[fhirStatus] || 'unknown';
}

/**
 * Main normalizer function
 * @param {Array} medications - Array of raw FHIR MedicationRequest resources
 * @param {string} provider - Source provider
 * @param {Object} options - Options { enableApiLookup: boolean }
 * @returns {Promise<Array>} Normalized medications
 */
async function normalizeMedications(medications, provider, options = {}) {
  const { enableApiLookup = true } = options;

  if (!medications?.length) return [];

  const results = await Promise.all(medications.map(async (med) => {
    const dosage = extractDosage(med);
    const rxnormCode = extractRxNormCode(med);

    // Try API lookup for codes not in local mappings
    let rxnormLookup = null;
    let drugClass = null;
    if (enableApiLookup && rxnormCode && !rxnormMappings[rxnormCode]) {
      try {
        rxnormLookup = await lookupRxNorm(rxnormCode);
        // Also try to get drug class for categorization
        if (rxnormLookup) {
          drugClass = await getRxNormClass(rxnormCode);
        }
      } catch (e) {
        // Silently fail API lookups
      }
    }

    return {
      id: med.id || null,
      name: extractMedicationName(med, rxnormLookup),
      code: rxnormCode,
      codeSystem: 'RxNorm',
      category: drugClass?.className || rxnormMappings[rxnormCode]?.category || null,
      status: normalizeStatus(med.status),
      dosage: dosage?.text || null,
      dosageDetails: dosage,
      prescribedDate: med.authoredOn || null,
      prescriber: extractPrescriber(med),
      refillsAllowed: med.dispenseRequest?.numberOfRepeatsAllowed || null,
      quantity: med.dispenseRequest?.quantity?.value || null,
      daysSupply: med.dispenseRequest?.expectedSupplyDuration?.value || null,
      source: provider,
      _enriched: !!rxnormLookup,
      _raw: med
    };
  }));

  return results;
}

/**
 * Synchronous version for backwards compatibility (no API lookups)
 */
function normalizeMedicationsSync(medications, provider) {
  if (!medications?.length) return [];

  return medications.map(med => {
    const dosage = extractDosage(med);
    const rxnormCode = extractRxNormCode(med);

    return {
      id: med.id || null,
      name: extractMedicationName(med),
      code: rxnormCode,
      codeSystem: 'RxNorm',
      category: rxnormMappings[rxnormCode]?.category || null,
      status: normalizeStatus(med.status),
      dosage: dosage?.text || null,
      dosageDetails: dosage,
      prescribedDate: med.authoredOn || null,
      prescriber: extractPrescriber(med),
      refillsAllowed: med.dispenseRequest?.numberOfRepeatsAllowed || null,
      quantity: med.dispenseRequest?.quantity?.value || null,
      daysSupply: med.dispenseRequest?.expectedSupplyDuration?.value || null,
      source: provider,
      _raw: med
    };
  });
}

module.exports = normalizeMedications;
module.exports.normalizeMedicationsSync = normalizeMedicationsSync;
