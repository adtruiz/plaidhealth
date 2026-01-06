/**
 * FHIR Health Records Routes
 *
 * Handles all FHIR health data endpoints including:
 * - Unified health records API
 * - Normalized v1 API endpoints
 * - Connection-specific data fetching
 * - Chart data endpoints
 */

const express = require('express');
const axios = require('axios');
const { epicDb, auditDb } = require('../db');
const { authenticate } = require('../middleware/auth');
const logger = require('../logger');
const { recordFhirCall } = require('../monitoring');
const { getFhirBaseUrl, getProviderDisplayName } = require('../lib/providers');
const {
  normalizePatient,
  normalizeLabs,
  normalizeMedications,
  normalizeConditions,
  normalizeEncounters
} = require('../normalizers');
const {
  deduplicateMedications,
  deduplicateConditions,
  deduplicateLabs,
  deduplicateEncounters
} = require('../deduplication');
const {
  processLabTrendsData,
  processMedicationTimelineData,
  processHealthTimelineData,
  processConditionStats,
  processOverviewStats
} = require('../chart-helpers');

const router = express.Router();

// ==================== Helper Functions ====================

/**
 * Middleware: Require user login
 */
function requireLogin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  next();
}

/**
 * Fetch FHIR resource from provider
 */
async function fetchFhirResource(connection, resourceType, params = {}) {
  const fhirBaseUrl = getFhirBaseUrl(connection.provider);
  const url = `${fhirBaseUrl}/${resourceType}`;
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Bearer ${connection.access_token}`,
        'Accept': 'application/fhir+json'
      }
    });
    recordFhirCall(connection.provider, true, Date.now() - startTime);
    return response;
  } catch (error) {
    recordFhirCall(connection.provider, false, Date.now() - startTime);
    throw error;
  }
}

/**
 * Fetch all data for a connection
 */
async function fetchConnectionData(connection) {
  const fhirBaseUrl = getFhirBaseUrl(connection.provider);

  const [patientRes, medsRes, conditionsRes, labsRes, encountersRes] = await Promise.allSettled([
    axios.get(`${fhirBaseUrl}/Patient/${connection.patient_id}`, {
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/MedicationRequest`, {
      params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/Condition`, {
      params: { patient: connection.patient_id, _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/Observation`, {
      params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    }),
    axios.get(`${fhirBaseUrl}/Encounter`, {
      params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
      headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
    })
  ]);

  return {
    patient: patientRes.status === 'fulfilled' ? patientRes.value.data : null,
    medications: medsRes.status === 'fulfilled' ? (medsRes.value.data.entry || []).map(e => e.resource) : [],
    conditions: conditionsRes.status === 'fulfilled' ? (conditionsRes.value.data.entry || []).map(e => e.resource) : [],
    observations: labsRes.status === 'fulfilled' ? (labsRes.value.data.entry || []).map(e => e.resource) : [],
    encounters: encountersRes.status === 'fulfilled' ? (encountersRes.value.data.entry || []).map(e => e.resource) : []
  };
}

// ==================== User & Connection Routes ====================

/**
 * GET /api/user
 * Get current user info
 */
router.get('/user', requireLogin, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    profile_picture: req.user.profile_picture
  });
});

/**
 * GET /api/epic-connections
 * Get user's Epic connections
 */
router.get('/epic-connections', requireLogin, async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    res.json(connections);
  } catch (error) {
    logger.error('Error fetching connections', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

/**
 * DELETE /api/epic-connections/:id
 * Delete Epic connection
 */
router.delete('/epic-connections/:id', requireLogin, async (req, res) => {
  try {
    await epicDb.deleteConnection(req.user.id, req.params.id);
    await auditDb.log(req.user.id, 'epic_disconnect', 'epic_connection', req.params.id, req.ip, req.get('user-agent'));
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting connection', { error: error.message });
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

// ==================== Unified Health Records ====================

/**
 * GET /api/health-records/unified
 * Get aggregated health data from ALL connections
 */
router.get('/health-records/unified', requireLogin, async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({
        connections: [],
        patients: [],
        medications: [],
        conditions: [],
        labs: [],
        encounters: []
      });
    }

    logger.info('Fetching unified health data', { connectionCount: connections.length });

    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);

          const [patientRes, medsRes, conditionsRes, labsRes, encountersRes] = await Promise.allSettled([
            axios.get(`${fhirBaseUrl}/Patient/${connection.patient_id}`, {
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/MedicationRequest`, {
              params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Condition`, {
              params: { patient: connection.patient_id, _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Observation`, {
              params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Encounter`, {
              params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            })
          ]);

          const sourceInfo = {
            connectionId: connection.id,
            patientId: connection.patient_id,
            source: getProviderDisplayName(connection.provider),
            provider: connection.provider,
            lastSynced: connection.last_synced
          };

          return {
            connection: sourceInfo,
            patient: patientRes.status === 'fulfilled' ? patientRes.value.data : null,
            medications: medsRes.status === 'fulfilled' ? medsRes.value.data : null,
            conditions: conditionsRes.status === 'fulfilled' ? conditionsRes.value.data : null,
            labs: labsRes.status === 'fulfilled' ? labsRes.value.data : null,
            encounters: encountersRes.status === 'fulfilled' ? encountersRes.value.data : null
          };
        } catch (error) {
          logger.error('Error fetching data for connection', { connectionId: connection.id, error: error.message });
          return null;
        }
      })
    );

    const successfulResults = results
      .filter(r => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value);

    const aggregated = {
      connections: successfulResults.map(r => r.connection),
      patients: successfulResults
        .filter(r => r.patient)
        .map(r => ({ ...r.patient, _source: r.connection })),
      medications: successfulResults
        .filter(r => r.medications?.entry)
        .flatMap(r => r.medications.entry.map(e => ({ ...e.resource, _source: r.connection }))),
      conditions: successfulResults
        .filter(r => r.conditions?.entry)
        .flatMap(r => r.conditions.entry.map(e => ({ ...e.resource, _source: r.connection }))),
      labs: successfulResults
        .filter(r => r.labs?.entry)
        .flatMap(r => r.labs.entry.map(e => ({ ...e.resource, _source: r.connection }))),
      encounters: successfulResults
        .filter(r => r.encounters?.entry)
        .flatMap(r => r.encounters.entry.map(e => ({ ...e.resource, _source: r.connection })))
    };

    // Log audit trail
    for (const connection of successfulResults.map(r => r.connection)) {
      await auditDb.log(req.user.id, 'data_access', 'unified_view', connection.patientId, req.ip, req.get('user-agent'));
    }

    // Apply deduplication if multiple connections
    let deduplicated = null;
    if (connections.length > 1) {
      deduplicated = {
        medications: deduplicateMedications(aggregated.medications),
        conditions: deduplicateConditions(aggregated.conditions),
        labs: deduplicateLabs(aggregated.labs),
        encounters: deduplicateEncounters(aggregated.encounters)
      };
    }

    res.json({
      ...aggregated,
      deduplicated: deduplicated || {
        medications: aggregated.medications.map(m => ({ primary: m, duplicates: [], sources: [m._source] })),
        conditions: aggregated.conditions.map(c => ({ primary: c, duplicates: [], sources: [c._source] })),
        labs: aggregated.labs.map(l => ({ primary: l, duplicates: [], sources: [l._source] })),
        encounters: aggregated.encounters.map(e => ({ primary: e, duplicates: [], sources: [e._source] }))
      }
    });
  } catch (error) {
    logger.error('Error in unified health records', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch unified health records', details: error.message });
  }
});

// ==================== Normalized API v1 Endpoints ====================

/**
 * GET /api/v1/health-records
 * Get all normalized health data
 */
router.get('/v1/health-records', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const includeRaw = req.query.include_raw === 'true';

    if (!connections || connections.length === 0) {
      return res.json({
        data: { patient: null, labs: [], medications: [], conditions: [], encounters: [] },
        meta: { sources: [], normalizedAt: new Date().toISOString(), version: '1.0.0' }
      });
    }

    const allData = { patients: [], labs: [], medications: [], conditions: [], encounters: [] };

    for (const connection of connections) {
      try {
        const rawData = await fetchConnectionData(connection);
        const provider = connection.provider;

        if (rawData.patient) {
          const normalized = normalizePatient(rawData.patient, provider);
          if (!includeRaw) delete normalized._raw;
          allData.patients.push(normalized);
        }

        const normalizedLabs = normalizeLabs(rawData.observations, provider);
        const normalizedMeds = normalizeMedications(rawData.medications, provider);
        const normalizedConditions = normalizeConditions(rawData.conditions, provider);
        const normalizedEncounters = normalizeEncounters(rawData.encounters, provider);

        if (!includeRaw) {
          normalizedLabs.forEach(l => delete l._raw);
          normalizedMeds.forEach(m => delete m._raw);
          normalizedConditions.forEach(c => delete c._raw);
          normalizedEncounters.forEach(e => delete e._raw);
        }

        allData.labs.push(...normalizedLabs);
        allData.medications.push(...normalizedMeds);
        allData.conditions.push(...normalizedConditions);
        allData.encounters.push(...normalizedEncounters);
      } catch (err) {
        logger.error('Error fetching connection data', { connectionId: connection.id, error: err.message });
      }
    }

    // Sort by date
    allData.labs.sort((a, b) => new Date(b.date) - new Date(a.date));
    allData.medications.sort((a, b) => new Date(b.prescribedDate) - new Date(a.prescribedDate));
    allData.encounters.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    res.json({
      data: {
        patient: allData.patients[0] || null,
        patients: allData.patients,
        labs: allData.labs,
        medications: allData.medications,
        conditions: allData.conditions,
        encounters: allData.encounters
      },
      meta: {
        sources: connections.map(c => ({
          id: c.id,
          provider: c.provider,
          displayName: getProviderDisplayName(c.provider),
          lastSynced: c.last_synced
        })),
        counts: {
          labs: allData.labs.length,
          medications: allData.medications.length,
          conditions: allData.conditions.length,
          encounters: allData.encounters.length
        },
        normalizedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error) {
    logger.error('Error in normalized health records v1', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch normalized health records', details: error.message });
  }
});

/**
 * GET /api/v1/patient
 * Get normalized patient data
 */
router.get('/v1/patient', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const includeRaw = req.query.include_raw === 'true';

    if (!connections || connections.length === 0) {
      return res.json({ data: null, meta: { sources: [] } });
    }

    const patients = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Patient/${connection.patient_id}`, {
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const normalized = normalizePatient(response.data, connection.provider);
        if (!includeRaw) delete normalized._raw;
        patients.push(normalized);
      } catch (err) {
        logger.error('Error fetching patient', { connectionId: connection.id, error: err.message });
      }
    }

    res.json({
      data: patients[0] || null,
      all: patients,
      meta: { sources: connections.map(c => c.provider), normalizedAt: new Date().toISOString() }
    });
  } catch (error) {
    logger.error('Error in v1/patient', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch patient data', details: error.message });
  }
});

/**
 * GET /api/v1/labs
 * Get normalized labs with optional deduplication
 */
router.get('/v1/labs', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false';
    const includeOriginals = req.query.include_originals === 'true';
    const limit = parseInt(req.query.limit) || 100;

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allLabs = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Observation`, {
          params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: limit },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const observations = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeLabs(observations, connection.provider);
        allLabs.push(...normalized);
      } catch (err) {
        logger.error('Error fetching labs', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      const deduped = deduplicateLabs(allLabs);
      deduped.sort((a, b) => new Date(b.merged.date) - new Date(a.merged.date));

      responseData = deduped.slice(0, limit).map(item => {
        const result = { ...item.merged, sources: item.sources, sourceCount: item.sources.length };
        if (includeOriginals) result.originals = item.originals;
        return result;
      });
    } else {
      allLabs.sort((a, b) => new Date(b.date) - new Date(a.date));
      responseData = allLabs.slice(0, limit);
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allLabs.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/labs', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch labs', details: error.message });
  }
});

/**
 * GET /api/v1/medications
 * Get normalized medications with optional deduplication
 */
router.get('/v1/medications', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false';
    const includeOriginals = req.query.include_originals === 'true';
    const status = req.query.status;

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allMeds = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/MedicationRequest`, {
          params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const medications = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeMedications(medications, connection.provider);
        allMeds.push(...normalized);
      } catch (err) {
        logger.error('Error fetching medications', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      const deduped = deduplicateMedications(allMeds);
      deduped.sort((a, b) => new Date(b.merged.prescribedDate) - new Date(a.merged.prescribedDate));

      responseData = deduped.map(item => {
        const result = { ...item.merged, sources: item.sources, sourceCount: item.sources.length };
        if (includeOriginals) result.originals = item.originals;
        return result;
      });

      if (status) responseData = responseData.filter(m => m.status === status);
    } else {
      let filteredMeds = status ? allMeds.filter(m => m.status === status) : allMeds;
      filteredMeds.sort((a, b) => new Date(b.prescribedDate) - new Date(a.prescribedDate));
      responseData = filteredMeds;
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allMeds.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/medications', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch medications', details: error.message });
  }
});

/**
 * GET /api/v1/conditions
 * Get normalized conditions with optional deduplication
 */
router.get('/v1/conditions', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false';
    const includeOriginals = req.query.include_originals === 'true';
    const status = req.query.status;

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allConditions = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Condition`, {
          params: { patient: connection.patient_id, _count: 100 },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const conditions = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeConditions(conditions, connection.provider);
        allConditions.push(...normalized);
      } catch (err) {
        logger.error('Error fetching conditions', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      const deduped = deduplicateConditions(allConditions);

      responseData = deduped.map(item => {
        const result = { ...item.merged, sources: item.sources, sourceCount: item.sources.length };
        if (includeOriginals) result.originals = item.originals;
        return result;
      });

      if (status) responseData = responseData.filter(c => c.clinicalStatus === status);
    } else {
      responseData = status ? allConditions.filter(c => c.clinicalStatus === status) : allConditions;
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allConditions.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/conditions', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch conditions', details: error.message });
  }
});

/**
 * GET /api/v1/encounters
 * Get normalized encounters with optional deduplication
 */
router.get('/v1/encounters', authenticate(['read']), async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);
    const deduplicate = req.query.deduplicate !== 'false';
    const includeOriginals = req.query.include_originals === 'true';
    const limit = parseInt(req.query.limit) || 50;

    if (!connections || connections.length === 0) {
      return res.json({ data: [], meta: { total: 0, sources: [], deduplicated: false } });
    }

    const allEncounters = [];
    for (const connection of connections) {
      try {
        const fhirBaseUrl = getFhirBaseUrl(connection.provider);
        const response = await axios.get(`${fhirBaseUrl}/Encounter`, {
          params: { patient: connection.patient_id, _sort: '-date', _count: limit },
          headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
        });
        const encounters = (response.data.entry || []).map(e => e.resource);
        const normalized = normalizeEncounters(encounters, connection.provider);
        allEncounters.push(...normalized);
      } catch (err) {
        logger.error('Error fetching encounters', { connectionId: connection.id, error: err.message });
      }
    }

    let responseData;
    if (deduplicate && connections.length > 1) {
      const deduped = deduplicateEncounters(allEncounters);
      deduped.sort((a, b) => new Date(b.merged.startDate) - new Date(a.merged.startDate));

      responseData = deduped.slice(0, limit).map(item => {
        const result = { ...item.merged, sources: item.sources, sourceCount: item.sources.length };
        if (includeOriginals) result.originals = item.originals;
        return result;
      });
    } else {
      allEncounters.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
      responseData = allEncounters.slice(0, limit);
    }

    res.json({
      data: responseData,
      meta: {
        total: responseData.length,
        totalBeforeDedup: allEncounters.length,
        sources: connections.map(c => c.provider),
        deduplicated: deduplicate && connections.length > 1,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/encounters', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch encounters', details: error.message });
  }
});

/**
 * GET /api/v1/connection/:connectionId
 * Get data from a specific connection
 */
router.get('/v1/connection/:connectionId', authenticate(['read']), async (req, res) => {
  try {
    const { connectionId } = req.params;
    const includeRaw = req.query.include_raw === 'true';

    const connection = await epicDb.getConnectionById(connectionId, req.user.id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const rawData = await fetchConnectionData(connection);
    const provider = connection.provider;

    const patient = rawData.patient ? normalizePatient(rawData.patient, provider) : null;
    const labs = normalizeLabs(rawData.observations, provider);
    const medications = normalizeMedications(rawData.medications, provider);
    const conditions = normalizeConditions(rawData.conditions, provider);
    const encounters = normalizeEncounters(rawData.encounters, provider);

    if (!includeRaw) {
      if (patient) delete patient._raw;
      labs.forEach(l => delete l._raw);
      medications.forEach(m => delete m._raw);
      conditions.forEach(c => delete c._raw);
      encounters.forEach(e => delete e._raw);
    }

    res.json({
      data: { patient, labs, medications, conditions, encounters },
      meta: {
        connectionId: connection.id,
        provider: connection.provider,
        displayName: getProviderDisplayName(connection.provider),
        lastSynced: connection.last_synced,
        normalizedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in v1/connection/:id', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch connection data', details: error.message });
  }
});

// ==================== Connection-Specific Data Routes ====================

/**
 * GET /api/connection/:connectionId/patient
 * Get patient data for specific connection
 */
router.get('/connection/:connectionId/patient', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, `Patient/${connection.patient_id}`);
    await auditDb.log(req.user.id, 'data_access', 'patient', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Patient)', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch patient data',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/connection/:connectionId/medications
 * Get medications for specific connection
 */
router.get('/connection/:connectionId/medications', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'MedicationRequest', {
      patient: connection.patient_id,
      _sort: '-authoredon',
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'medications', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Medications)', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch medications',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/connection/:connectionId/conditions
 * Get conditions for specific connection
 */
router.get('/connection/:connectionId/conditions', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'Condition', {
      patient: connection.patient_id,
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'conditions', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Conditions)', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch conditions',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/connection/:connectionId/labs
 * Get labs for specific connection
 */
router.get('/connection/:connectionId/labs', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'Observation', {
      patient: connection.patient_id,
      category: 'laboratory',
      _sort: '-date',
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'labs', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Labs)', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch lab results',
      details: error.response?.data || error.message
    });
  }
});

/**
 * GET /api/connection/:connectionId/encounters
 * Get encounters for specific connection
 */
router.get('/connection/:connectionId/encounters', requireLogin, async (req, res) => {
  try {
    const connection = await epicDb.getConnectionById(req.user.id, req.params.connectionId);

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const response = await fetchFhirResource(connection, 'Encounter', {
      patient: connection.patient_id,
      _sort: '-date',
      _count: 50
    });

    await auditDb.log(req.user.id, 'data_access', 'encounters', connection.patient_id, req.ip, req.get('user-agent'));
    res.json(response.data);
  } catch (error) {
    logger.error('FHIR API error (Encounters)', { error: error.message });
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch encounters',
      details: error.response?.data || error.message
    });
  }
});

// ==================== Chart API Endpoints ====================

/**
 * GET /api/charts/lab-trends
 * Get lab trends chart data
 */
router.get('/charts/lab-trends', requireLogin, async (req, res) => {
  try {
    const { limit = 5, mode = 'top' } = req.query;
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ datasets: [], stats: { totalLabs: 0, uniqueTests: 0 } });
    }

    const labResults = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const response = await axios.get(`${fhirBaseUrl}/Observation`, {
            params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
            headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
          });
          return response.data.entry?.map(e => ({
            ...e.resource,
            _source: { source: getProviderDisplayName(connection.provider), connectionId: connection.id }
          })) || [];
        } catch (error) {
          logger.error('Error fetching labs for connection', { connectionId: connection.id, error: error.message });
          return [];
        }
      })
    );

    const allLabs = labResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    const chartData = processLabTrendsData(allLabs, { limit: parseInt(limit), mode });

    res.json(chartData);
  } catch (error) {
    logger.error('Error in lab trends chart', { error: error.message });
    res.status(500).json({ error: 'Failed to generate lab trends', details: error.message });
  }
});

/**
 * GET /api/charts/medication-timeline
 * Get medication timeline chart data
 */
router.get('/charts/medication-timeline', requireLogin, async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ labels: [], datasets: [], stats: { totalMedications: 0 } });
    }

    const medResults = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const response = await axios.get(`${fhirBaseUrl}/MedicationRequest`, {
            params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
            headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
          });
          return response.data.entry?.map(e => e.resource) || [];
        } catch (error) {
          logger.error('Error fetching medications for connection', { connectionId: connection.id, error: error.message });
          return [];
        }
      })
    );

    const allMedications = medResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    const chartData = processMedicationTimelineData(allMedications);

    res.json(chartData);
  } catch (error) {
    logger.error('Error in medication timeline chart', { error: error.message });
    res.status(500).json({ error: 'Failed to generate medication timeline', details: error.message });
  }
});

/**
 * GET /api/charts/health-timeline
 * Get health timeline data
 */
router.get('/charts/health-timeline', requireLogin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ events: [], stats: { totalEvents: 0 } });
    }

    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const [medsRes, conditionsRes, encountersRes] = await Promise.allSettled([
            axios.get(`${fhirBaseUrl}/MedicationRequest`, {
              params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Condition`, {
              params: { patient: connection.patient_id, _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Encounter`, {
              params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            })
          ]);

          const sourceInfo = { source: getProviderDisplayName(connection.provider), connectionId: connection.id };

          return {
            medications: medsRes.status === 'fulfilled' ?
              (medsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            conditions: conditionsRes.status === 'fulfilled' ?
              (conditionsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            encounters: encountersRes.status === 'fulfilled' ?
              (encountersRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : []
          };
        } catch (error) {
          logger.error('Error fetching timeline data', { connectionId: connection.id, error: error.message });
          return { medications: [], conditions: [], encounters: [] };
        }
      })
    );

    const allMedications = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.medications);
    const allConditions = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.conditions);
    const allEncounters = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.encounters);

    const timelineData = processHealthTimelineData(allMedications, allConditions, allEncounters, { limit: parseInt(limit) });

    res.json(timelineData);
  } catch (error) {
    logger.error('Error in health timeline', { error: error.message });
    res.status(500).json({ error: 'Failed to generate health timeline', details: error.message });
  }
});

/**
 * GET /api/charts/condition-stats
 * Get condition statistics
 */
router.get('/charts/condition-stats', requireLogin, async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({ activeCount: 0, inactiveCount: 0, topConditions: [] });
    }

    const conditionResults = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const response = await axios.get(`${fhirBaseUrl}/Condition`, {
            params: { patient: connection.patient_id, _count: 100 },
            headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
          });
          return response.data.entry?.map(e => e.resource) || [];
        } catch (error) {
          logger.error('Error fetching conditions', { connectionId: connection.id, error: error.message });
          return [];
        }
      })
    );

    const allConditions = conditionResults.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    const stats = processConditionStats(allConditions);

    res.json(stats);
  } catch (error) {
    logger.error('Error in condition stats', { error: error.message });
    res.status(500).json({ error: 'Failed to generate condition statistics', details: error.message });
  }
});

/**
 * GET /api/charts/overview
 * Get overview statistics
 */
router.get('/charts/overview', requireLogin, async (req, res) => {
  try {
    const connections = await epicDb.getConnections(req.user.id);

    if (!connections || connections.length === 0) {
      return res.json({
        medications: { total: 0, active: 0 },
        conditions: { total: 0, active: 0 },
        labs: { total: 0 },
        encounters: { total: 0 },
        sources: []
      });
    }

    const results = await Promise.allSettled(
      connections.map(async (connection) => {
        try {
          const fhirBaseUrl = getFhirBaseUrl(connection.provider);
          const [medsRes, conditionsRes, labsRes, encountersRes] = await Promise.allSettled([
            axios.get(`${fhirBaseUrl}/MedicationRequest`, {
              params: { patient: connection.patient_id, _sort: '-authoredon', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Condition`, {
              params: { patient: connection.patient_id, _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Observation`, {
              params: { patient: connection.patient_id, category: 'laboratory', _sort: '-date', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            }),
            axios.get(`${fhirBaseUrl}/Encounter`, {
              params: { patient: connection.patient_id, _sort: '-date', _count: 100 },
              headers: { 'Authorization': `Bearer ${connection.access_token}`, 'Accept': 'application/fhir+json' }
            })
          ]);

          const sourceInfo = { source: getProviderDisplayName(connection.provider), connectionId: connection.id };

          return {
            medications: medsRes.status === 'fulfilled' ?
              (medsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            conditions: conditionsRes.status === 'fulfilled' ?
              (conditionsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            labs: labsRes.status === 'fulfilled' ?
              (labsRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : [],
            encounters: encountersRes.status === 'fulfilled' ?
              (encountersRes.value.data.entry?.map(e => ({ ...e.resource, _source: sourceInfo })) || []) : []
          };
        } catch (error) {
          logger.error('Error fetching overview data', { connectionId: connection.id, error: error.message });
          return { medications: [], conditions: [], labs: [], encounters: [] };
        }
      })
    );

    const aggregated = {
      medications: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.medications),
      conditions: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.conditions),
      labs: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.labs),
      encounters: results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.encounters)
    };

    let deduplicated = null;
    if (connections.length > 1) {
      deduplicated = {
        medications: deduplicateMedications(aggregated.medications),
        conditions: deduplicateConditions(aggregated.conditions),
        labs: deduplicateLabs(aggregated.labs),
        encounters: deduplicateEncounters(aggregated.encounters)
      };
    }

    const overview = processOverviewStats(aggregated, deduplicated);

    res.json(overview);
  } catch (error) {
    logger.error('Error in overview stats', { error: error.message });
    res.status(500).json({ error: 'Failed to generate overview statistics', details: error.message });
  }
});

module.exports = router;
