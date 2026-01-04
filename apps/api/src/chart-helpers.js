/**
 * Chart Data Processing Module
 *
 * Centralizes all chart data processing logic for the hybrid approach.
 * Backend processes raw FHIR data and returns Chart.js-ready formats.
 *
 * Supports both:
 * - New merged format (from deduplication): { merged, sources, sourceCount, originals }
 * - Legacy flat format (single source or dedup disabled): direct FHIR objects
 */

/**
 * Helper: Extract lab data from either merged or flat format
 */
function extractLabData(lab) {
  // Check if this is a merged format (has sources array and merged data)
  if (lab.sources && Array.isArray(lab.sources)) {
    // Merged format - data is flattened from merged object
    return {
      name: lab.name || 'Unknown',
      date: lab.date ? new Date(lab.date) : null,
      value: lab.value,
      unit: lab.unit,
      loincCode: lab.loincCode,
      sources: lab.sources,
      sourceCount: lab.sourceCount || lab.sources.length
    };
  }
  // Legacy FHIR format
  return {
    name: lab.code?.text || lab.code?.coding?.[0]?.display || lab.name || 'Unknown',
    date: lab.effectiveDateTime ? new Date(lab.effectiveDateTime) : (lab.date ? new Date(lab.date) : null),
    value: lab.valueQuantity?.value ?? lab.value,
    unit: lab.valueQuantity?.unit || lab.unit,
    loincCode: lab.code?.coding?.find(c => c.system?.includes('loinc'))?.code || lab.loincCode,
    sources: lab._source?.source ? [lab._source.source] : ['Unknown'],
    sourceCount: 1
  };
}

/**
 * Process lab results for trend visualization
 * Groups labs by test name and returns Chart.js line chart format
 * Works with both merged and raw FHIR data
 */
function processLabTrendsData(labs, options = {}) {
  const { limit = 5, mode = 'top' } = options;

  if (!labs || labs.length === 0) {
    return {
      datasets: [],
      stats: { totalLabs: 0, uniqueTests: 0, dateRange: null }
    };
  }

  // Group labs by test name (or LOINC code for better matching)
  const labsByName = {};
  labs.forEach(lab => {
    const extracted = extractLabData(lab);
    const key = extracted.loincCode || extracted.name; // Use LOINC code if available for grouping

    if (!labsByName[key]) {
      labsByName[key] = {
        displayName: extracted.name,
        unit: extracted.unit,
        dataPoints: []
      };
    }

    if (extracted.value != null && extracted.date) {
      labsByName[key].dataPoints.push({
        date: extracted.date,
        value: extracted.value,
        sources: extracted.sources,
        sourceCount: extracted.sourceCount
      });
    }
  });

  // Filter to labs with multiple data points (for trend analysis)
  const trendableLabs = Object.entries(labsByName)
    .filter(([key, labData]) => labData.dataPoints.length > 1)
    .map(([key, labData]) => ({
      name: labData.displayName,
      data: labData.dataPoints.sort((a, b) => a.date - b.date),
      unit: labData.unit
    }))
    .sort((a, b) => b.data.length - a.data.length);

  // Apply limit based on mode
  const selectedLabs = mode === 'all' ? trendableLabs : trendableLabs.slice(0, limit);

  // Convert to Chart.js format
  const datasets = selectedLabs.map((lab, index) => {
    const colors = [
      '#667eea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#3b82f6'
    ];
    const color = colors[index % colors.length];

    return {
      label: `${lab.name} (${lab.unit || ''})`.trim(),
      data: lab.data.map(point => ({
        x: point.date.toISOString(),
        y: point.value,
        sources: point.sources,
        sourceCount: point.sourceCount
      })),
      borderColor: color,
      backgroundColor: color + '20',
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7
    };
  });

  // Calculate stats
  const allDates = selectedLabs.flatMap(lab => lab.data.map(d => d.date));
  const totalSourceCount = labs.reduce((sum, lab) => {
    const extracted = extractLabData(lab);
    return sum + (extracted.sourceCount || 1);
  }, 0);

  const stats = {
    totalLabs: labs.length,
    totalFromSources: totalSourceCount,
    uniqueTests: Object.keys(labsByName).length,
    trendableTests: trendableLabs.length,
    displayedTests: selectedLabs.length,
    dateRange: allDates.length > 0 ? {
      start: new Date(Math.min(...allDates)).toLocaleDateString(),
      end: new Date(Math.max(...allDates)).toLocaleDateString()
    } : null
  };

  return { datasets, stats };
}

/**
 * Helper: Extract medication data from either merged or flat format
 */
function extractMedicationData(med) {
  // Check if this is a merged format (has sources array)
  if (med.sources && Array.isArray(med.sources)) {
    return {
      name: med.name || 'Unknown medication',
      prescribedDate: med.prescribedDate ? new Date(med.prescribedDate) : null,
      status: med.status || 'unknown',
      dosage: med.dosage,
      rxnormCode: med.rxnormCode,
      sources: med.sources,
      sourceCount: med.sourceCount || med.sources.length
    };
  }
  // Legacy FHIR format
  return {
    name: med.medicationCodeableConcept?.text ||
          med.medicationCodeableConcept?.coding?.[0]?.display ||
          med.name || 'Unknown medication',
    prescribedDate: med.authoredOn ? new Date(med.authoredOn) : (med.prescribedDate ? new Date(med.prescribedDate) : null),
    status: med.status || 'unknown',
    dosage: med.dosageInstruction?.[0]?.text || med.dosage,
    rxnormCode: med.medicationCodeableConcept?.coding?.find(c => c.system?.includes('rxnorm'))?.code || med.rxnormCode,
    sources: med._source?.source ? [med._source.source] : ['Unknown'],
    sourceCount: 1
  };
}

/**
 * Process medications for timeline visualization
 * Returns data for stacked bar chart showing active/inactive meds over time
 * Works with both merged and raw FHIR data
 */
function processMedicationTimelineData(medications) {
  if (!medications || medications.length === 0) {
    return {
      labels: [],
      datasets: [],
      stats: { totalMedications: 0, activeCount: 0, inactiveCount: 0 }
    };
  }

  // Group medications by month
  const medsByMonth = {};
  let totalFromSources = 0;

  medications.forEach(med => {
    const extracted = extractMedicationData(med);
    totalFromSources += extracted.sourceCount;

    if (extracted.prescribedDate) {
      const date = extracted.prescribedDate;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!medsByMonth[monthKey]) {
        medsByMonth[monthKey] = { active: 0, inactive: 0, sources: new Set(), date: date };
      }

      if (extracted.status === 'active') {
        medsByMonth[monthKey].active++;
      } else {
        medsByMonth[monthKey].inactive++;
      }

      extracted.sources.forEach(s => medsByMonth[monthKey].sources.add(s));
    }
  });

  // Sort months chronologically
  const sortedMonths = Object.keys(medsByMonth).sort();

  // Format month labels
  const labels = sortedMonths.map(month => {
    const [year, monthNum] = month.split('-');
    const date = new Date(year, parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  });

  // Create datasets
  const datasets = [
    {
      label: 'Active Medications',
      data: sortedMonths.map(month => medsByMonth[month].active),
      backgroundColor: '#10b981',
      borderColor: '#059669',
      borderWidth: 1
    },
    {
      label: 'Inactive Medications',
      data: sortedMonths.map(month => medsByMonth[month].inactive),
      backgroundColor: '#9ca3af',
      borderColor: '#6b7280',
      borderWidth: 1
    }
  ];

  // Calculate stats
  const activeCount = medications.filter(med => {
    const extracted = extractMedicationData(med);
    return extracted.status === 'active';
  }).length;

  const stats = {
    totalMedications: medications.length,
    totalFromSources,
    activeCount,
    inactiveCount: medications.length - activeCount,
    monthsTracked: sortedMonths.length
  };

  return { labels, datasets, stats };
}

/**
 * Helper: Extract condition data from either merged or flat format
 */
function extractConditionData(cond) {
  if (cond.sources && Array.isArray(cond.sources)) {
    return {
      name: cond.name || 'Unknown condition',
      onsetDate: cond.onsetDate ? new Date(cond.onsetDate) : null,
      clinicalStatus: cond.clinicalStatus || 'unknown',
      icd10Code: cond.icd10Code,
      sources: cond.sources,
      sourceCount: cond.sourceCount || cond.sources.length
    };
  }
  return {
    name: cond.code?.text || cond.code?.coding?.[0]?.display || cond.name || 'Unknown condition',
    onsetDate: cond.onsetDateTime ? new Date(cond.onsetDateTime) : (cond.onsetDate ? new Date(cond.onsetDate) : null),
    clinicalStatus: cond.clinicalStatus?.coding?.[0]?.code || cond.clinicalStatus || 'unknown',
    icd10Code: cond.code?.coding?.find(c => c.system?.includes('icd'))?.code || cond.icd10Code,
    sources: cond._source?.source ? [cond._source.source] : ['Unknown'],
    sourceCount: 1
  };
}

/**
 * Helper: Extract encounter data from either merged or flat format
 */
function extractEncounterData(enc) {
  if (enc.sources && Array.isArray(enc.sources)) {
    return {
      type: enc.type || 'Unknown encounter',
      startDate: enc.startDate ? new Date(enc.startDate) : null,
      location: enc.location || 'Location not specified',
      status: enc.status || 'unknown',
      sources: enc.sources,
      sourceCount: enc.sourceCount || enc.sources.length
    };
  }
  return {
    type: enc.type?.[0]?.text || enc.type?.[0]?.coding?.[0]?.display || enc.type || 'Unknown encounter',
    startDate: enc.period?.start ? new Date(enc.period.start) : (enc.startDate ? new Date(enc.startDate) : null),
    location: enc.location?.[0]?.location?.display || enc.location || 'Location not specified',
    status: enc.status || 'unknown',
    sources: enc._source?.source ? [enc._source.source] : ['Unknown'],
    sourceCount: 1
  };
}

/**
 * Process all health data for unified timeline
 * Combines medications, conditions, and encounters into chronological timeline
 * Works with both merged and raw FHIR data
 */
function processHealthTimelineData(medications, conditions, encounters, options = {}) {
  const { limit = 50 } = options;
  const timeline = [];
  const allSources = new Set();

  // Add medications
  (medications || []).forEach(med => {
    const extracted = extractMedicationData(med);
    if (extracted.prescribedDate) {
      timeline.push({
        date: extracted.prescribedDate,
        type: 'medication',
        icon: '💊',
        title: extracted.name,
        description: extracted.dosage || 'No dosage information',
        status: extracted.status,
        sources: extracted.sources,
        sourceCount: extracted.sourceCount,
        id: med.id
      });
      extracted.sources.forEach(s => allSources.add(s));
    }
  });

  // Add conditions
  (conditions || []).forEach(cond => {
    const extracted = extractConditionData(cond);
    if (extracted.onsetDate) {
      timeline.push({
        date: extracted.onsetDate,
        type: 'condition',
        icon: '🩺',
        title: extracted.name,
        description: `Clinical status: ${extracted.clinicalStatus}`,
        status: extracted.clinicalStatus,
        sources: extracted.sources,
        sourceCount: extracted.sourceCount,
        id: cond.id
      });
      extracted.sources.forEach(s => allSources.add(s));
    }
  });

  // Add encounters
  (encounters || []).forEach(enc => {
    const extracted = extractEncounterData(enc);
    if (extracted.startDate) {
      timeline.push({
        date: extracted.startDate,
        type: 'encounter',
        icon: '🏥',
        title: extracted.type,
        description: extracted.location,
        status: extracted.status,
        sources: extracted.sources,
        sourceCount: extracted.sourceCount,
        id: enc.id
      });
      extracted.sources.forEach(s => allSources.add(s));
    }
  });

  // Sort by date (most recent first)
  timeline.sort((a, b) => b.date - a.date);

  // Apply limit
  const limitedTimeline = timeline.slice(0, limit);

  // Calculate stats
  const stats = {
    totalEvents: timeline.length,
    medications: timeline.filter(e => e.type === 'medication').length,
    conditions: timeline.filter(e => e.type === 'condition').length,
    encounters: timeline.filter(e => e.type === 'encounter').length,
    dateRange: timeline.length > 0 ? {
      start: timeline[timeline.length - 1].date.toLocaleDateString(),
      end: timeline[0].date.toLocaleDateString()
    } : null,
    sources: [...allSources]
  };

  return {
    events: limitedTimeline.map(event => ({
      ...event,
      date: event.date.toISOString()
    })),
    stats
  };
}

/**
 * Process conditions for statistics visualization
 * Returns condition counts and categories
 * Works with both merged and raw FHIR data
 */
function processConditionStats(conditions) {
  if (!conditions || conditions.length === 0) {
    return {
      activeCount: 0,
      inactiveCount: 0,
      topConditions: [],
      conditionsByCategory: {}
    };
  }

  let activeCount = 0;
  let totalFromSources = 0;
  const conditionCounts = {};

  conditions.forEach(cond => {
    const extracted = extractConditionData(cond);
    totalFromSources += extracted.sourceCount;

    if (extracted.clinicalStatus === 'active') {
      activeCount++;
    }

    // Count conditions by name (using ICD-10 code as key if available for better grouping)
    const key = extracted.icd10Code || extracted.name;
    if (!conditionCounts[key]) {
      conditionCounts[key] = {
        name: extracted.name,
        count: 0,
        sources: new Set()
      };
    }
    conditionCounts[key].count++;
    extracted.sources.forEach(s => conditionCounts[key].sources.add(s));
  });

  // Get top 10 conditions
  const topConditions = Object.entries(conditionCounts)
    .map(([key, data]) => ({
      name: data.name,
      count: data.count,
      sources: [...data.sources]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalConditions: conditions.length,
    totalFromSources,
    activeCount,
    inactiveCount: conditions.length - activeCount,
    topConditions,
    uniqueConditions: Object.keys(conditionCounts).length
  };
}

/**
 * Generate overview statistics across all health data
 * Includes deduplication metrics if applicable
 * Works with both merged and raw FHIR data
 */
function processOverviewStats(data, deduplicated = null) {
  // Helper to count active medications from either format
  const countActiveMeds = (meds) => {
    if (!meds) return 0;
    return meds.filter(m => {
      const extracted = extractMedicationData(m);
      return extracted.status === 'active';
    }).length;
  };

  // Helper to count active conditions from either format
  const countActiveConditions = (conditions) => {
    if (!conditions) return 0;
    return conditions.filter(c => {
      const extracted = extractConditionData(c);
      return extracted.clinicalStatus === 'active';
    }).length;
  };

  // Helper to extract all sources from data
  const extractSources = (items, extractFn) => {
    if (!items) return [];
    const sources = new Set();
    items.forEach(item => {
      const extracted = extractFn(item);
      extracted.sources.forEach(s => sources.add(s));
    });
    return [...sources];
  };

  const allSources = new Set([
    ...extractSources(data.medications, extractMedicationData),
    ...extractSources(data.conditions, extractConditionData),
    ...extractSources(data.labs, extractLabData),
    ...extractSources(data.encounters, extractEncounterData)
  ]);

  const overview = {
    medications: {
      total: data.medications?.length || 0,
      active: countActiveMeds(data.medications)
    },
    conditions: {
      total: data.conditions?.length || 0,
      active: countActiveConditions(data.conditions)
    },
    labs: {
      total: data.labs?.length || 0
    },
    encounters: {
      total: data.encounters?.length || 0
    },
    sources: [...allSources].filter(Boolean)
  };

  // Add deduplication metrics if available
  if (deduplicated) {
    overview.deduplication = {
      medications: {
        raw: data.medications?.length || 0,
        unique: deduplicated.medications?.length || 0,
        duplicatesRemoved: (data.medications?.length || 0) - (deduplicated.medications?.length || 0)
      },
      conditions: {
        raw: data.conditions?.length || 0,
        unique: deduplicated.conditions?.length || 0,
        duplicatesRemoved: (data.conditions?.length || 0) - (deduplicated.conditions?.length || 0)
      },
      labs: {
        raw: data.labs?.length || 0,
        unique: deduplicated.labs?.length || 0,
        duplicatesRemoved: (data.labs?.length || 0) - (deduplicated.labs?.length || 0)
      },
      encounters: {
        raw: data.encounters?.length || 0,
        unique: deduplicated.encounters?.length || 0,
        duplicatesRemoved: (data.encounters?.length || 0) - (deduplicated.encounters?.length || 0)
      }
    };
  }

  return overview;
}

module.exports = {
  processLabTrendsData,
  processMedicationTimelineData,
  processHealthTimelineData,
  processConditionStats,
  processOverviewStats
};
