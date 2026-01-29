/**
 * Encounters Normalizer
 *
 * Transforms FHIR Encounter resources into consistent format.
 */

/**
 * Extract encounter type
 */
function extractEncounterType(encounter) {
  const type = encounter?.type?.[0];
  if (!type) return 'unknown';

  return type.text || type.coding?.[0]?.display || type.coding?.[0]?.code || 'unknown';
}

/**
 * Extract encounter class (inpatient, outpatient, emergency, etc.)
 */
function extractEncounterClass(encounter) {
  const encounterClass = encounter?.class;
  if (!encounterClass) return 'unknown';

  const classMap = {
    'AMB': 'outpatient',
    'EMER': 'emergency',
    'IMP': 'inpatient',
    'ACUTE': 'inpatient',
    'NONAC': 'inpatient',
    'PRENC': 'pre-admission',
    'SS': 'short-stay',
    'HH': 'home-health',
    'VR': 'virtual',
    'OBSENC': 'observation'
  };

  const code = encounterClass.code;
  return classMap[code] || encounterClass.display || code || 'unknown';
}

/**
 * Normalize encounter status
 */
function normalizeStatus(fhirStatus) {
  const statusMap = {
    'planned': 'scheduled',
    'arrived': 'in-progress',
    'triaged': 'in-progress',
    'in-progress': 'in-progress',
    'onleave': 'in-progress',
    'finished': 'completed',
    'cancelled': 'cancelled',
    'entered-in-error': 'error',
    'unknown': 'unknown'
  };
  return statusMap[fhirStatus] || 'unknown';
}

/**
 * Extract period (start/end dates)
 */
function extractPeriod(encounter) {
  const period = encounter?.period;
  if (!period) return { start: null, end: null, duration: null };

  const start = period.start ? new Date(period.start) : null;
  const end = period.end ? new Date(period.end) : null;

  let duration = null;
  if (start && end) {
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) {
      duration = `${diffMins} minutes`;
    } else if (diffMins < 1440) {
      duration = `${Math.round(diffMins / 60)} hours`;
    } else {
      duration = `${Math.round(diffMins / 1440)} days`;
    }
  }

  return {
    start: period.start || null,
    end: period.end || null,
    duration
  };
}

/**
 * Extract location
 */
function extractLocation(encounter) {
  const location = encounter?.location?.[0]?.location;
  if (!location) return null;

  return {
    name: location.display || null,
    reference: location.reference || null
  };
}

/**
 * Extract providers/participants
 */
function extractParticipants(encounter) {
  const participants = encounter?.participant || [];

  return participants.map(p => ({
    role: p.type?.[0]?.text || p.type?.[0]?.coding?.[0]?.display || 'participant',
    name: p.individual?.display || null,
    reference: p.individual?.reference || null
  }));
}

/**
 * Extract reason for visit
 */
function extractReason(encounter) {
  const reasons = encounter?.reasonCode || [];

  return reasons.map(r =>
    r.text || r.coding?.[0]?.display || r.coding?.[0]?.code
  ).filter(Boolean);
}

/**
 * Extract service provider (organization)
 */
function extractServiceProvider(encounter) {
  const provider = encounter?.serviceProvider;
  if (!provider) return null;

  return {
    name: provider.display || null,
    reference: provider.reference || null
  };
}

/**
 * Main normalizer function
 * @param {Array} encounters - Array of raw FHIR Encounter resources
 * @param {string} provider - Source provider
 * @returns {Array} Normalized encounters
 */
/**
 * Main normalizer function
 * @param {Array} encounters - Array of raw FHIR Encounter resources
 * @param {string} provider - Source provider
 * @param {Object} options - Options { enableApiLookup: boolean } (unused for encounters)
 * @returns {Array} Normalized encounters
 */
function normalizeEncounters(encounters, provider, options = {}) {
  if (!encounters?.length) return [];

  return encounters.map(enc => {
    const period = extractPeriod(enc);

    return {
      id: enc.id || null,
      type: extractEncounterType(enc),
      class: extractEncounterClass(enc),
      status: normalizeStatus(enc.status),
      startDate: period.start,
      endDate: period.end,
      duration: period.duration,
      location: extractLocation(enc),
      participants: extractParticipants(enc),
      reasons: extractReason(enc),
      serviceProvider: extractServiceProvider(enc),
      source: provider,
      _raw: enc
    };
  });
}

module.exports = normalizeEncounters;
