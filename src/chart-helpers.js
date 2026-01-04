/**
 * Chart Data Processing Module
 *
 * Centralizes all chart data processing logic for the hybrid approach.
 * Backend processes raw FHIR data and returns Chart.js-ready formats.
 */

/**
 * Process lab results for trend visualization
 * Groups labs by test name and returns Chart.js line chart format
 */
function processLabTrendsData(labs, options = {}) {
  const { limit = 5, mode = 'top' } = options;

  if (!labs || labs.length === 0) {
    return {
      datasets: [],
      stats: { totalLabs: 0, uniqueTests: 0, dateRange: null }
    };
  }

  // Group labs by test name
  const labsByName = {};
  labs.forEach(lab => {
    const labName = lab.code?.text || lab.code?.coding?.[0]?.display || 'Unknown';
    if (!labsByName[labName]) {
      labsByName[labName] = [];
    }
    if (lab.valueQuantity && lab.effectiveDateTime) {
      labsByName[labName].push({
        date: new Date(lab.effectiveDateTime),
        value: lab.valueQuantity.value,
        unit: lab.valueQuantity.unit,
        source: lab._source?.source || 'Unknown'
      });
    }
  });

  // Filter to labs with multiple data points (for trend analysis)
  const trendableLabs = Object.entries(labsByName)
    .filter(([name, data]) => data.length > 1)
    .map(([name, data]) => ({
      name,
      data: data.sort((a, b) => a.date - b.date),
      unit: data[0].unit
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
      label: `${lab.name} (${lab.unit})`,
      data: lab.data.map(point => ({
        x: point.date.toISOString(),
        y: point.value,
        source: point.source
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
  const stats = {
    totalLabs: labs.length,
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
 * Process medications for timeline visualization
 * Returns data for stacked bar chart showing active/inactive meds over time
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
  medications.forEach(med => {
    if (med.authoredOn) {
      const date = new Date(med.authoredOn);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!medsByMonth[monthKey]) {
        medsByMonth[monthKey] = { active: 0, inactive: 0, date: date };
      }

      if (med.status === 'active') {
        medsByMonth[monthKey].active++;
      } else {
        medsByMonth[monthKey].inactive++;
      }
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
  const activeCount = medications.filter(m => m.status === 'active').length;
  const stats = {
    totalMedications: medications.length,
    activeCount,
    inactiveCount: medications.length - activeCount,
    monthsTracked: sortedMonths.length
  };

  return { labels, datasets, stats };
}

/**
 * Process all health data for unified timeline
 * Combines medications, conditions, and encounters into chronological timeline
 */
function processHealthTimelineData(medications, conditions, encounters, options = {}) {
  const { limit = 50 } = options;
  const timeline = [];

  // Add medications
  medications.forEach(med => {
    if (med.authoredOn) {
      const medName = med.medicationCodeableConcept?.text ||
                     med.medicationCodeableConcept?.coding?.[0]?.display ||
                     'Unknown medication';

      timeline.push({
        date: new Date(med.authoredOn),
        type: 'medication',
        icon: '💊',
        title: medName,
        description: med.dosageInstruction?.[0]?.text || 'No dosage information',
        status: med.status || 'unknown',
        source: med._source?.source || 'Unknown',
        id: med.id
      });
    }
  });

  // Add conditions
  conditions.forEach(condition => {
    if (condition.onsetDateTime) {
      const conditionName = condition.code?.text ||
                           condition.code?.coding?.[0]?.display ||
                           'Unknown condition';

      timeline.push({
        date: new Date(condition.onsetDateTime),
        type: 'condition',
        icon: '🩺',
        title: conditionName,
        description: `Clinical status: ${condition.clinicalStatus?.coding?.[0]?.code || 'unknown'}`,
        status: condition.clinicalStatus?.coding?.[0]?.code || 'unknown',
        source: condition._source?.source || 'Unknown',
        id: condition.id
      });
    }
  });

  // Add encounters
  encounters.forEach(encounter => {
    if (encounter.period?.start) {
      const encounterType = encounter.type?.[0]?.text ||
                           encounter.type?.[0]?.coding?.[0]?.display ||
                           'Unknown encounter';

      timeline.push({
        date: new Date(encounter.period.start),
        type: 'encounter',
        icon: '🏥',
        title: encounterType,
        description: encounter.location?.[0]?.location?.display || 'Location not specified',
        status: encounter.status || 'unknown',
        source: encounter._source?.source || 'Unknown',
        id: encounter.id
      });
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
    sources: [...new Set(timeline.map(e => e.source))]
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

  const activeCount = conditions.filter(c =>
    c.clinicalStatus?.coding?.[0]?.code === 'active'
  ).length;

  // Count conditions by name
  const conditionCounts = {};
  conditions.forEach(condition => {
    const name = condition.code?.text ||
                condition.code?.coding?.[0]?.display ||
                'Unknown';
    conditionCounts[name] = (conditionCounts[name] || 0) + 1;
  });

  // Get top 10 conditions
  const topConditions = Object.entries(conditionCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalConditions: conditions.length,
    activeCount,
    inactiveCount: conditions.length - activeCount,
    topConditions,
    uniqueConditions: Object.keys(conditionCounts).length
  };
}

/**
 * Generate overview statistics across all health data
 * Includes deduplication metrics if applicable
 */
function processOverviewStats(data, deduplicated = null) {
  const overview = {
    medications: {
      total: data.medications?.length || 0,
      active: data.medications?.filter(m => m.status === 'active').length || 0
    },
    conditions: {
      total: data.conditions?.length || 0,
      active: data.conditions?.filter(c =>
        c.clinicalStatus?.coding?.[0]?.code === 'active'
      ).length || 0
    },
    labs: {
      total: data.labs?.length || 0
    },
    encounters: {
      total: data.encounters?.length || 0
    },
    sources: [...new Set([
      ...(data.medications?.map(m => m._source?.source) || []),
      ...(data.conditions?.map(c => c._source?.source) || []),
      ...(data.labs?.map(l => l._source?.source) || []),
      ...(data.encounters?.map(e => e._source?.source) || [])
    ])].filter(Boolean)
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
