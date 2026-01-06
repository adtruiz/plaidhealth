/**
 * FHIR Client Module
 *
 * Handles FHIR API requests and data fetching
 */

const axios = require('axios');
const logger = require('../logger');
const { getFhirBaseUrl } = require('./providers');

/**
 * Fetch a FHIR resource from a provider
 */
async function fetchFhirResource(connection, resourceType, params = {}) {
  const fhirBaseUrl = getFhirBaseUrl(connection.provider);
  const url = `${fhirBaseUrl}/${resourceType}`;

  return await axios.get(url, {
    params,
    headers: {
      'Authorization': `Bearer ${connection.access_token}`,
      'Accept': 'application/fhir+json'
    }
  });
}

/**
 * Fetch all data for a connection (Patient, Medications, Labs, Conditions, Encounters)
 */
async function fetchConnectionData(connection) {
  const results = {
    patient: null,
    medications: [],
    labs: [],
    conditions: [],
    encounters: [],
    claims: [],
    errors: []
  };

  // Fetch Patient
  try {
    const patientResponse = await fetchFhirResource(connection, `Patient/${connection.patient_id}`);
    results.patient = patientResponse.data;
  } catch (error) {
    logger.error('Failed to fetch patient', {
      provider: connection.provider,
      error: error.message
    });
    results.errors.push({ resource: 'Patient', error: error.message });
  }

  // Fetch Medications
  try {
    const medResponse = await fetchFhirResource(connection, 'MedicationRequest', {
      patient: connection.patient_id
    });
    results.medications = medResponse.data.entry || [];
  } catch (error) {
    logger.warn('Failed to fetch medications', {
      provider: connection.provider,
      error: error.message
    });
    results.errors.push({ resource: 'MedicationRequest', error: error.message });
  }

  // Fetch Labs (Observations with category=laboratory)
  try {
    const labResponse = await fetchFhirResource(connection, 'Observation', {
      patient: connection.patient_id,
      category: 'laboratory'
    });
    results.labs = labResponse.data.entry || [];
  } catch (error) {
    logger.warn('Failed to fetch labs', {
      provider: connection.provider,
      error: error.message
    });
    results.errors.push({ resource: 'Observation', error: error.message });
  }

  // Fetch Conditions
  try {
    const condResponse = await fetchFhirResource(connection, 'Condition', {
      patient: connection.patient_id
    });
    results.conditions = condResponse.data.entry || [];
  } catch (error) {
    logger.warn('Failed to fetch conditions', {
      provider: connection.provider,
      error: error.message
    });
    results.errors.push({ resource: 'Condition', error: error.message });
  }

  // Fetch Encounters
  try {
    const encResponse = await fetchFhirResource(connection, 'Encounter', {
      patient: connection.patient_id
    });
    results.encounters = encResponse.data.entry || [];
  } catch (error) {
    logger.warn('Failed to fetch encounters', {
      provider: connection.provider,
      error: error.message
    });
    results.errors.push({ resource: 'Encounter', error: error.message });
  }

  // Fetch Claims/EOB (for payers)
  try {
    const claimsResponse = await fetchFhirResource(connection, 'ExplanationOfBenefit', {
      patient: connection.patient_id
    });
    results.claims = claimsResponse.data.entry || [];
  } catch (error) {
    // Claims may not be available for all providers
    logger.debug('Claims not available', {
      provider: connection.provider,
      error: error.message
    });
  }

  return results;
}

/**
 * Fetch a specific FHIR resource type with pagination support
 */
async function fetchPaginatedResource(connection, resourceType, params = {}, maxPages = 10) {
  const allEntries = [];
  let nextUrl = null;
  let pageCount = 0;

  const fhirBaseUrl = getFhirBaseUrl(connection.provider);
  let url = `${fhirBaseUrl}/${resourceType}`;

  const headers = {
    'Authorization': `Bearer ${connection.access_token}`,
    'Accept': 'application/fhir+json'
  };

  do {
    try {
      const response = await axios.get(nextUrl || url, {
        params: nextUrl ? {} : params,
        headers
      });

      const bundle = response.data;

      if (bundle.entry) {
        allEntries.push(...bundle.entry);
      }

      // Find next link
      nextUrl = null;
      if (bundle.link) {
        const nextLink = bundle.link.find(l => l.relation === 'next');
        if (nextLink) {
          nextUrl = nextLink.url;
        }
      }

      pageCount++;
    } catch (error) {
      logger.error('Pagination error', {
        resourceType,
        page: pageCount,
        error: error.message
      });
      break;
    }
  } while (nextUrl && pageCount < maxPages);

  return allEntries;
}

module.exports = {
  fetchFhirResource,
  fetchConnectionData,
  fetchPaginatedResource
};
