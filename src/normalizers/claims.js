/**
 * Claims Normalizer
 *
 * Transforms FHIR ExplanationOfBenefit resources (from payers) into consistent format.
 * This is primarily for payer integrations (Humana, Aetna, BCBS, etc.)
 */

/**
 * Extract claim type
 */
function extractClaimType(eob) {
  const type = eob?.type?.coding?.[0];
  if (!type) return 'unknown';

  const typeMap = {
    'professional': 'professional',
    'institutional': 'institutional',
    'oral': 'dental',
    'pharmacy': 'pharmacy',
    'vision': 'vision'
  };

  return typeMap[type.code] || type.display || type.code || 'unknown';
}

/**
 * Extract claim status
 */
function normalizeStatus(fhirStatus) {
  const statusMap = {
    'active': 'processing',
    'cancelled': 'cancelled',
    'draft': 'draft',
    'entered-in-error': 'error'
  };
  return statusMap[fhirStatus] || fhirStatus || 'unknown';
}

/**
 * Extract outcome
 */
function extractOutcome(eob) {
  const outcomeMap = {
    'queued': 'pending',
    'complete': 'processed',
    'error': 'error',
    'partial': 'partial'
  };
  return outcomeMap[eob?.outcome] || eob?.outcome || 'unknown';
}

/**
 * Extract provider information
 */
function extractProvider(eob) {
  const provider = eob?.provider;
  if (!provider) return null;

  return {
    name: provider.display || null,
    reference: provider.reference || null,
    npi: null // Would need to extract from identifier
  };
}

/**
 * Extract facility information
 */
function extractFacility(eob) {
  const facility = eob?.facility;
  if (!facility) return null;

  return {
    name: facility.display || null,
    reference: facility.reference || null
  };
}

/**
 * Extract service period
 */
function extractServicePeriod(eob) {
  const period = eob?.billablePeriod;
  if (!period) return { start: null, end: null };

  return {
    start: period.start || null,
    end: period.end || null
  };
}

/**
 * Extract diagnosis codes
 */
function extractDiagnoses(eob) {
  const diagnoses = eob?.diagnosis || [];

  return diagnoses.map(d => {
    const coding = d.diagnosisCodeableConcept?.coding?.[0];
    return {
      sequence: d.sequence,
      code: coding?.code || null,
      display: coding?.display || d.diagnosisCodeableConcept?.text || null,
      type: d.type?.[0]?.coding?.[0]?.code || 'unknown'
    };
  });
}

/**
 * Extract procedure codes
 */
function extractProcedures(eob) {
  const procedures = eob?.procedure || [];

  return procedures.map(p => {
    const coding = p.procedureCodeableConcept?.coding?.[0];
    return {
      sequence: p.sequence,
      code: coding?.code || null,
      display: coding?.display || p.procedureCodeableConcept?.text || null,
      date: p.date || null
    };
  });
}

/**
 * Extract financial totals
 */
function extractTotals(eob) {
  const totals = eob?.total || [];

  const result = {
    billed: null,
    allowed: null,
    paid: null,
    patientResponsibility: null
  };

  for (const total of totals) {
    const category = total.category?.coding?.[0]?.code;
    const amount = total.amount?.value;

    switch (category) {
      case 'submitted':
      case 'billedamount':
        result.billed = amount;
        break;
      case 'eligible':
      case 'allowed':
        result.allowed = amount;
        break;
      case 'benefit':
      case 'paid':
        result.paid = amount;
        break;
      case 'patientpay':
      case 'copay':
      case 'deductible':
        result.patientResponsibility = (result.patientResponsibility || 0) + (amount || 0);
        break;
    }
  }

  return result;
}

/**
 * Extract line items
 */
function extractLineItems(eob) {
  const items = eob?.item || [];

  return items.map(item => {
    const coding = item.productOrService?.coding?.[0];
    const adjudication = item.adjudication || [];

    // Extract adjudication amounts
    const amounts = {};
    for (const adj of adjudication) {
      const category = adj.category?.coding?.[0]?.code;
      if (adj.amount?.value !== undefined) {
        amounts[category] = adj.amount.value;
      }
    }

    return {
      sequence: item.sequence,
      code: coding?.code || null,
      display: coding?.display || item.productOrService?.text || null,
      serviceDate: item.servicedDate || item.servicedPeriod?.start || null,
      quantity: item.quantity?.value || 1,
      billed: amounts.submitted || amounts.billedamount || null,
      allowed: amounts.eligible || amounts.allowed || null,
      paid: amounts.benefit || amounts.paid || null
    };
  });
}

/**
 * Main normalizer function
 * @param {Array} claims - Array of raw FHIR ExplanationOfBenefit resources
 * @param {string} provider - Source provider (payer)
 * @returns {Array} Normalized claims
 */
function normalizeClaims(claims, provider) {
  if (!claims?.length) return [];

  return claims.map(eob => {
    const servicePeriod = extractServicePeriod(eob);
    const totals = extractTotals(eob);

    return {
      id: eob.id || null,
      claimId: eob.claim?.reference?.split('/')?.[1] || null,
      type: extractClaimType(eob),
      status: normalizeStatus(eob.status),
      outcome: extractOutcome(eob),
      serviceStartDate: servicePeriod.start,
      serviceEndDate: servicePeriod.end,
      provider: extractProvider(eob),
      facility: extractFacility(eob),
      diagnoses: extractDiagnoses(eob),
      procedures: extractProcedures(eob),
      totals: {
        billed: totals.billed,
        allowed: totals.allowed,
        paid: totals.paid,
        patientResponsibility: totals.patientResponsibility,
        currency: 'USD'
      },
      lineItems: extractLineItems(eob),
      createdDate: eob.created || null,
      source: provider,
      _raw: eob
    };
  });
}

module.exports = normalizeClaims;
