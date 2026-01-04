/**
 * Deduplication Module
 *
 * Identifies and merges duplicate health records from multiple sources.
 * Uses standardized codes (RxNorm, LOINC, ICD-10) as primary matching keys,
 * with fuzzy string matching as fallback when codes are missing.
 *
 * Output structure for each deduplicated item:
 * {
 *   merged: { ... },           // Canonical merged record
 *   sources: ['Epic', 'Humana'], // Display names of sources
 *   sourceDetails: [{ ... }],  // Full source metadata
 *   originals: [{ ... }]       // Original records for drill-down
 * }
 */

// ============== UTILITY FUNCTIONS ==============

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity ratio between two strings (0-1)
 */
function similarityRatio(str1, str2) {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1.0 - (distance / maxLen);
}

/**
 * Check if two dates are within N days of each other
 */
function datesWithinDays(date1, date2, days) {
  if (!date1 || !date2) return false;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
  return diffDays <= days;
}

/**
 * Check if two dates are the same day
 */
function sameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return new Date(date1).toDateString() === new Date(date2).toDateString();
}

/**
 * Get the most recent date from an array of dates
 */
function getMostRecent(dates) {
  const validDates = dates.filter(d => d).map(d => new Date(d));
  if (validDates.length === 0) return null;
  return new Date(Math.max(...validDates)).toISOString();
}

/**
 * Get the first non-null value from an array
 */
function firstNonNull(...values) {
  return values.find(v => v != null && v !== '' && v !== 'Unknown');
}

/**
 * Extract unique source display names
 */
function getSourceNames(items) {
  const sources = new Set();
  items.forEach(item => {
    const source = item._source?.source || item._source?.provider || item.source;
    if (source) sources.add(source);
  });
  return Array.from(sources);
}

// ============== EXTRACTION FUNCTIONS ==============

/**
 * Extract standardized code from FHIR coding array
 */
function extractCode(codingArray, preferredSystem) {
  if (!codingArray || !Array.isArray(codingArray)) return null;

  // Try to find preferred system first (e.g., RxNorm, LOINC, ICD-10)
  if (preferredSystem) {
    const preferred = codingArray.find(c =>
      c.system?.toLowerCase().includes(preferredSystem.toLowerCase())
    );
    if (preferred?.code) return preferred.code;
  }

  // Fall back to first code
  return codingArray[0]?.code || null;
}

/**
 * Extract medication details from FHIR MedicationRequest
 */
function extractMedicationDetails(med) {
  const coding = med.medicationCodeableConcept?.coding || [];
  return {
    name: med.medicationCodeableConcept?.text || coding[0]?.display || 'Unknown',
    rxnormCode: extractCode(coding, 'rxnorm'),
    ndcCode: extractCode(coding, 'ndc'),
    prescribedDate: med.authoredOn,
    status: med.status,
    quantity: med.dispenseRequest?.quantity?.value,
    daysSupply: med.dispenseRequest?.expectedSupplyDuration?.value,
    refills: med.dispenseRequest?.numberOfRepeatsAllowed,
    dosage: med.dosageInstruction?.[0]?.text ||
            med.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value,
    dosageUnit: med.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit,
    prescriber: med.requester?.display,
    _source: med._source,
    _raw: med
  };
}

/**
 * Extract lab details from FHIR Observation
 */
function extractLabDetails(lab) {
  const coding = lab.code?.coding || [];
  return {
    name: lab.code?.text || coding[0]?.display || 'Unknown',
    loincCode: extractCode(coding, 'loinc'),
    date: lab.effectiveDateTime || lab.issued,
    status: lab.status,
    value: lab.valueQuantity?.value ?? lab.valueString ?? lab.valueCodeableConcept?.text,
    unit: lab.valueQuantity?.unit || lab.valueQuantity?.code,
    referenceRangeLow: lab.referenceRange?.[0]?.low?.value,
    referenceRangeHigh: lab.referenceRange?.[0]?.high?.value,
    interpretation: lab.interpretation?.[0]?.coding?.[0]?.code,
    performer: lab.performer?.[0]?.display,
    _source: lab._source,
    _raw: lab
  };
}

/**
 * Extract condition details from FHIR Condition
 */
function extractConditionDetails(cond) {
  const coding = cond.code?.coding || [];
  return {
    name: cond.code?.text || coding[0]?.display || 'Unknown',
    icd10Code: extractCode(coding, 'icd-10') || extractCode(coding, 'icd10'),
    snomedCode: extractCode(coding, 'snomed') || extractCode(coding, 'sct'),
    onsetDate: cond.onsetDateTime || cond.onsetPeriod?.start,
    recordedDate: cond.recordedDate,
    clinicalStatus: cond.clinicalStatus?.coding?.[0]?.code,
    verificationStatus: cond.verificationStatus?.coding?.[0]?.code,
    category: cond.category?.[0]?.coding?.[0]?.code,
    severity: cond.severity?.coding?.[0]?.display,
    recorder: cond.recorder?.display,
    _source: cond._source,
    _raw: cond
  };
}

/**
 * Extract encounter details from FHIR Encounter
 */
function extractEncounterDetails(enc) {
  const typeCoding = enc.type?.[0]?.coding || [];
  return {
    type: enc.type?.[0]?.text || typeCoding[0]?.display || 'Unknown',
    typeCode: typeCoding[0]?.code,
    class: enc.class?.code || enc.class?.display,
    status: enc.status,
    startDate: enc.period?.start,
    endDate: enc.period?.end,
    location: enc.location?.[0]?.location?.display,
    serviceProvider: enc.serviceProvider?.display,
    participant: enc.participant?.[0]?.individual?.display,
    reasonCode: enc.reasonCode?.[0]?.coding?.[0]?.code,
    reasonText: enc.reasonCode?.[0]?.text,
    _source: enc._source,
    _raw: enc
  };
}

// ============== MATCHING FUNCTIONS ==============

/**
 * Check if two medications are duplicates
 * Priority: RxNorm code > NDC code > Name + Date
 */
function areMedicationsDuplicates(med1, med2) {
  const m1 = extractMedicationDetails(med1);
  const m2 = extractMedicationDetails(med2);

  // 1. Exact RxNorm code match = definite duplicate
  if (m1.rxnormCode && m2.rxnormCode && m1.rxnormCode === m2.rxnormCode) {
    // Same drug - check if same prescription (date + quantity)
    if (sameDay(m1.prescribedDate, m2.prescribedDate)) return true;
    if (datesWithinDays(m1.prescribedDate, m2.prescribedDate, 7) &&
        m1.quantity === m2.quantity) return true;
    // Same active medication from different sources
    if (m1.status === 'active' && m2.status === 'active') return true;
  }

  // 2. NDC code match with date confirmation
  if (m1.ndcCode && m2.ndcCode && m1.ndcCode === m2.ndcCode) {
    if (datesWithinDays(m1.prescribedDate, m2.prescribedDate, 30)) return true;
  }

  // 3. Fuzzy name match (fallback when no codes)
  if (!m1.rxnormCode && !m2.rxnormCode) {
    const nameSimilarity = similarityRatio(m1.name, m2.name);
    if (nameSimilarity >= 0.90) {
      // High name similarity + same date range = duplicate
      if (datesWithinDays(m1.prescribedDate, m2.prescribedDate, 14)) return true;
      // High name similarity + same status + same dosage
      if (m1.status === m2.status && m1.dosage === m2.dosage) return true;
    }
  }

  return false;
}

/**
 * Check if two labs are duplicates
 * Priority: LOINC code + Date > Name + Date + Value
 */
function areLabsDuplicates(lab1, lab2) {
  const l1 = extractLabDetails(lab1);
  const l2 = extractLabDetails(lab2);

  // Skip Unknown labs
  if (l1.name === 'Unknown' || l2.name === 'Unknown') return false;

  // 1. Exact LOINC code + same day = definite duplicate
  if (l1.loincCode && l2.loincCode && l1.loincCode === l2.loincCode) {
    if (sameDay(l1.date, l2.date)) return true;
  }

  // 2. Same name + same day + similar value = duplicate
  const nameSimilarity = similarityRatio(l1.name, l2.name);
  if (nameSimilarity >= 0.95 && sameDay(l1.date, l2.date)) {
    // If both have numeric values, check if within 5%
    if (typeof l1.value === 'number' && typeof l2.value === 'number') {
      const avg = (l1.value + l2.value) / 2;
      const diff = Math.abs(l1.value - l2.value);
      if (avg > 0 && diff / avg <= 0.05) return true;
    }
    // Same string value
    if (l1.value === l2.value) return true;
    // Both final status on same day with same test name
    if (l1.status === 'final' && l2.status === 'final') return true;
  }

  return false;
}

/**
 * Check if two conditions are duplicates
 * Priority: ICD-10/SNOMED code > Name + Status
 */
function areConditionsDuplicates(cond1, cond2) {
  const c1 = extractConditionDetails(cond1);
  const c2 = extractConditionDetails(cond2);

  // Skip Unknown conditions
  if (c1.name === 'Unknown' || c2.name === 'Unknown') return false;

  // 1. Exact ICD-10 code match = definite duplicate
  if (c1.icd10Code && c2.icd10Code && c1.icd10Code === c2.icd10Code) {
    return true;
  }

  // 2. Exact SNOMED code match = definite duplicate
  if (c1.snomedCode && c2.snomedCode && c1.snomedCode === c2.snomedCode) {
    return true;
  }

  // 3. ICD-10 and SNOMED with same name (cross-system match)
  if ((c1.icd10Code || c1.snomedCode) && (c2.icd10Code || c2.snomedCode)) {
    const nameSimilarity = similarityRatio(c1.name, c2.name);
    if (nameSimilarity >= 0.95) return true;
  }

  // 4. Fuzzy name match (fallback when no codes)
  if (!c1.icd10Code && !c1.snomedCode && !c2.icd10Code && !c2.snomedCode) {
    const nameSimilarity = similarityRatio(c1.name, c2.name);
    if (nameSimilarity >= 0.92) {
      // Same clinical status strengthens match
      if (c1.clinicalStatus === c2.clinicalStatus) return true;
      // Onset dates within 90 days
      if (datesWithinDays(c1.onsetDate, c2.onsetDate, 90)) return true;
    }
  }

  return false;
}

/**
 * Check if two encounters are duplicates
 * Priority: Type + Date + Location
 */
function areEncountersDuplicates(enc1, enc2) {
  const e1 = extractEncounterDetails(enc1);
  const e2 = extractEncounterDetails(enc2);

  // 1. Same type code + same day = likely duplicate
  if (e1.typeCode && e2.typeCode && e1.typeCode === e2.typeCode) {
    if (sameDay(e1.startDate, e2.startDate)) return true;
  }

  // 2. Same class + same day + same location = duplicate
  if (e1.class && e2.class && e1.class === e2.class) {
    if (sameDay(e1.startDate, e2.startDate)) {
      // Same location or both unknown
      if (e1.location === e2.location) return true;
      if (!e1.location && !e2.location) return true;
    }
  }

  // 3. High type name similarity + same day
  const typeSimilarity = similarityRatio(e1.type, e2.type);
  if (typeSimilarity >= 0.95 && sameDay(e1.startDate, e2.startDate)) {
    return true;
  }

  // 4. Inpatient stays: overlapping dates
  if ((e1.class === 'IMP' || e1.class === 'inpatient') &&
      (e2.class === 'IMP' || e2.class === 'inpatient')) {
    // Check if stays overlap
    const start1 = new Date(e1.startDate);
    const end1 = e1.endDate ? new Date(e1.endDate) : start1;
    const start2 = new Date(e2.startDate);
    const end2 = e2.endDate ? new Date(e2.endDate) : start2;

    if (start1 <= end2 && start2 <= end1) {
      // Overlapping inpatient stays at same location = duplicate
      if (e1.location === e2.location || e1.serviceProvider === e2.serviceProvider) {
        return true;
      }
    }
  }

  return false;
}

// ============== MERGE FUNCTIONS ==============

/**
 * Merge multiple medication records into one canonical record
 */
function mergeMedications(meds) {
  if (meds.length === 0) return null;
  if (meds.length === 1) {
    const details = extractMedicationDetails(meds[0]);
    return {
      merged: details,
      sources: getSourceNames(meds),
      sourceDetails: meds.map(m => m._source).filter(Boolean),
      originals: meds
    };
  }

  const details = meds.map(extractMedicationDetails);

  // Pick best value for each field
  const merged = {
    name: firstNonNull(...details.map(d => d.name)),
    rxnormCode: firstNonNull(...details.map(d => d.rxnormCode)),
    ndcCode: firstNonNull(...details.map(d => d.ndcCode)),
    prescribedDate: getMostRecent(details.map(d => d.prescribedDate)),
    status: firstNonNull(...details.map(d => d.status)),
    quantity: firstNonNull(...details.map(d => d.quantity)),
    daysSupply: firstNonNull(...details.map(d => d.daysSupply)),
    refills: Math.max(...details.map(d => d.refills || 0)),
    dosage: firstNonNull(...details.map(d => d.dosage)),
    dosageUnit: firstNonNull(...details.map(d => d.dosageUnit)),
    prescriber: firstNonNull(...details.map(d => d.prescriber))
  };

  return {
    merged,
    sources: getSourceNames(meds),
    sourceDetails: meds.map(m => m._source).filter(Boolean),
    originals: meds
  };
}

/**
 * Merge multiple lab records into one canonical record
 */
function mergeLabs(labs) {
  if (labs.length === 0) return null;
  if (labs.length === 1) {
    const details = extractLabDetails(labs[0]);
    return {
      merged: details,
      sources: getSourceNames(labs),
      sourceDetails: labs.map(l => l._source).filter(Boolean),
      originals: labs
    };
  }

  const details = labs.map(extractLabDetails);

  // For labs, prefer the 'final' status record
  const finalRecord = details.find(d => d.status === 'final') || details[0];

  const merged = {
    name: firstNonNull(...details.map(d => d.name)),
    loincCode: firstNonNull(...details.map(d => d.loincCode)),
    date: finalRecord.date || getMostRecent(details.map(d => d.date)),
    status: finalRecord.status || firstNonNull(...details.map(d => d.status)),
    value: finalRecord.value ?? firstNonNull(...details.map(d => d.value)),
    unit: firstNonNull(...details.map(d => d.unit)),
    referenceRangeLow: firstNonNull(...details.map(d => d.referenceRangeLow)),
    referenceRangeHigh: firstNonNull(...details.map(d => d.referenceRangeHigh)),
    interpretation: firstNonNull(...details.map(d => d.interpretation)),
    performer: firstNonNull(...details.map(d => d.performer))
  };

  return {
    merged,
    sources: getSourceNames(labs),
    sourceDetails: labs.map(l => l._source).filter(Boolean),
    originals: labs
  };
}

/**
 * Merge multiple condition records into one canonical record
 */
function mergeConditions(conditions) {
  if (conditions.length === 0) return null;
  if (conditions.length === 1) {
    const details = extractConditionDetails(conditions[0]);
    return {
      merged: details,
      sources: getSourceNames(conditions),
      sourceDetails: conditions.map(c => c._source).filter(Boolean),
      originals: conditions
    };
  }

  const details = conditions.map(extractConditionDetails);

  // Prefer confirmed over provisional
  const confirmedRecord = details.find(d => d.verificationStatus === 'confirmed') || details[0];

  const merged = {
    name: firstNonNull(...details.map(d => d.name)),
    icd10Code: firstNonNull(...details.map(d => d.icd10Code)),
    snomedCode: firstNonNull(...details.map(d => d.snomedCode)),
    onsetDate: firstNonNull(...details.map(d => d.onsetDate)),
    recordedDate: getMostRecent(details.map(d => d.recordedDate)),
    clinicalStatus: confirmedRecord.clinicalStatus || firstNonNull(...details.map(d => d.clinicalStatus)),
    verificationStatus: confirmedRecord.verificationStatus || firstNonNull(...details.map(d => d.verificationStatus)),
    category: firstNonNull(...details.map(d => d.category)),
    severity: firstNonNull(...details.map(d => d.severity)),
    recorder: firstNonNull(...details.map(d => d.recorder))
  };

  return {
    merged,
    sources: getSourceNames(conditions),
    sourceDetails: conditions.map(c => c._source).filter(Boolean),
    originals: conditions
  };
}

/**
 * Merge multiple encounter records into one canonical record
 */
function mergeEncounters(encounters) {
  if (encounters.length === 0) return null;
  if (encounters.length === 1) {
    const details = extractEncounterDetails(encounters[0]);
    return {
      merged: details,
      sources: getSourceNames(encounters),
      sourceDetails: encounters.map(e => e._source).filter(Boolean),
      originals: encounters
    };
  }

  const details = encounters.map(extractEncounterDetails);

  // For encounters, prefer the completed one with most detail
  const completedRecord = details.find(d => d.status === 'finished') || details[0];

  const merged = {
    type: firstNonNull(...details.map(d => d.type)),
    typeCode: firstNonNull(...details.map(d => d.typeCode)),
    class: firstNonNull(...details.map(d => d.class)),
    status: completedRecord.status || firstNonNull(...details.map(d => d.status)),
    startDate: firstNonNull(...details.map(d => d.startDate)),
    endDate: firstNonNull(...details.map(d => d.endDate)),
    location: firstNonNull(...details.map(d => d.location)),
    serviceProvider: firstNonNull(...details.map(d => d.serviceProvider)),
    participant: firstNonNull(...details.map(d => d.participant)),
    reasonCode: firstNonNull(...details.map(d => d.reasonCode)),
    reasonText: firstNonNull(...details.map(d => d.reasonText))
  };

  return {
    merged,
    sources: getSourceNames(encounters),
    sourceDetails: encounters.map(e => e._source).filter(Boolean),
    originals: encounters
  };
}

// ============== MAIN DEDUPLICATION FUNCTIONS ==============

/**
 * Deduplicate and merge medications from multiple sources
 * @param {Array} medications - Array of FHIR MedicationRequest resources
 * @returns {Array} Array of deduplicated medication groups with merged data
 */
function deduplicateMedications(medications) {
  if (!medications || medications.length === 0) return [];

  const groups = [];
  const processed = new Set();

  for (let i = 0; i < medications.length; i++) {
    if (processed.has(i)) continue;

    const group = [medications[i]];
    processed.add(i);

    // Find all duplicates
    for (let j = i + 1; j < medications.length; j++) {
      if (processed.has(j)) continue;

      if (areMedicationsDuplicates(medications[i], medications[j])) {
        group.push(medications[j]);
        processed.add(j);
      }
    }

    groups.push(mergeMedications(group));
  }

  return groups;
}

/**
 * Deduplicate and merge labs from multiple sources
 * @param {Array} labs - Array of FHIR Observation resources
 * @returns {Array} Array of deduplicated lab groups with merged data
 */
function deduplicateLabs(labs) {
  if (!labs || labs.length === 0) return [];

  const groups = [];
  const processed = new Set();

  for (let i = 0; i < labs.length; i++) {
    if (processed.has(i)) continue;

    const group = [labs[i]];
    processed.add(i);

    for (let j = i + 1; j < labs.length; j++) {
      if (processed.has(j)) continue;

      if (areLabsDuplicates(labs[i], labs[j])) {
        group.push(labs[j]);
        processed.add(j);
      }
    }

    groups.push(mergeLabs(group));
  }

  return groups;
}

/**
 * Deduplicate and merge conditions from multiple sources
 * @param {Array} conditions - Array of FHIR Condition resources
 * @returns {Array} Array of deduplicated condition groups with merged data
 */
function deduplicateConditions(conditions) {
  if (!conditions || conditions.length === 0) return [];

  const groups = [];
  const processed = new Set();

  for (let i = 0; i < conditions.length; i++) {
    if (processed.has(i)) continue;

    const group = [conditions[i]];
    processed.add(i);

    for (let j = i + 1; j < conditions.length; j++) {
      if (processed.has(j)) continue;

      if (areConditionsDuplicates(conditions[i], conditions[j])) {
        group.push(conditions[j]);
        processed.add(j);
      }
    }

    groups.push(mergeConditions(group));
  }

  return groups;
}

/**
 * Deduplicate and merge encounters from multiple sources
 * @param {Array} encounters - Array of FHIR Encounter resources
 * @returns {Array} Array of deduplicated encounter groups with merged data
 */
function deduplicateEncounters(encounters) {
  if (!encounters || encounters.length === 0) return [];

  const groups = [];
  const processed = new Set();

  for (let i = 0; i < encounters.length; i++) {
    if (processed.has(i)) continue;

    const group = [encounters[i]];
    processed.add(i);

    for (let j = i + 1; j < encounters.length; j++) {
      if (processed.has(j)) continue;

      if (areEncountersDuplicates(encounters[i], encounters[j])) {
        group.push(encounters[j]);
        processed.add(j);
      }
    }

    groups.push(mergeEncounters(group));
  }

  return groups;
}

// ============== EXPORTS ==============

module.exports = {
  // Main deduplication functions
  deduplicateMedications,
  deduplicateConditions,
  deduplicateLabs,
  deduplicateEncounters,

  // Individual matching functions (for testing)
  areMedicationsDuplicates,
  areConditionsDuplicates,
  areLabsDuplicates,
  areEncountersDuplicates,

  // Utility functions
  similarityRatio,
  datesWithinDays,
  sameDay,

  // Extraction functions (for use in normalizers)
  extractMedicationDetails,
  extractLabDetails,
  extractConditionDetails,
  extractEncounterDetails
};
