/**
 * Patient Normalizer
 *
 * Transforms FHIR Patient resource into consistent format.
 * Handles variations between Epic, Cerner, Athena, payers, etc.
 */

/**
 * Extract name from FHIR Patient resource
 * Handles: name[].given[], name[].family, name[].text
 */
function extractName(fhirPatient) {
  if (!fhirPatient?.name?.length) {
    return { firstName: null, lastName: null, fullName: null };
  }

  const officialName = fhirPatient.name.find(n => n.use === 'official') || fhirPatient.name[0];

  // Some providers use 'text' field (e.g., Cerner: "LASTNAME, FIRSTNAME")
  if (officialName.text && !officialName.given) {
    const text = officialName.text;

    // Handle "LASTNAME, FIRSTNAME" format (common in Cerner)
    if (text.includes(',')) {
      const [lastName, firstName] = text.split(',').map(s => s.trim());
      return {
        firstName: firstName || null,
        lastName: lastName || null,
        fullName: firstName && lastName ? `${firstName} ${lastName}` : text
      };
    }

    // Handle "FIRSTNAME LASTNAME" format
    const parts = text.split(' ');
    return {
      firstName: parts[0] || null,
      lastName: parts.slice(1).join(' ') || null,
      fullName: text
    };
  }

  const firstName = officialName.given?.[0] || null;
  const lastName = officialName.family || null;
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

  return { firstName, lastName, fullName };
}

/**
 * Extract phone number from FHIR telecom array
 */
function extractPhone(fhirPatient) {
  const phone = fhirPatient?.telecom?.find(t => t.system === 'phone');
  return phone?.value || null;
}

/**
 * Extract email from FHIR telecom array
 */
function extractEmail(fhirPatient) {
  const email = fhirPatient?.telecom?.find(t => t.system === 'email');
  return email?.value || null;
}

/**
 * Extract address from FHIR address array
 */
function extractAddress(fhirPatient) {
  if (!fhirPatient?.address?.length) {
    return null;
  }

  const homeAddress = fhirPatient.address.find(a => a.use === 'home') || fhirPatient.address[0];

  return {
    line1: homeAddress.line?.[0] || null,
    line2: homeAddress.line?.[1] || null,
    city: homeAddress.city || null,
    state: homeAddress.state || null,
    postalCode: homeAddress.postalCode || null,
    country: homeAddress.country || 'US'
  };
}

/**
 * Normalize gender to consistent values
 */
function normalizeGender(fhirGender) {
  const genderMap = {
    'male': 'male',
    'female': 'female',
    'other': 'other',
    'unknown': 'unknown',
    'M': 'male',
    'F': 'female'
  };
  return genderMap[fhirGender] || 'unknown';
}

/**
 * Main normalizer function
 * @param {Object} fhirPatient - Raw FHIR Patient resource
 * @param {string} provider - Source provider (epic, cerner, etc.)
 * @returns {Object} Normalized patient object
 */
function normalizePatient(fhirPatient, provider) {
  if (!fhirPatient) {
    return null;
  }

  const { firstName, lastName, fullName } = extractName(fhirPatient);

  return {
    id: fhirPatient.id || null,
    firstName,
    lastName,
    fullName,
    dateOfBirth: fhirPatient.birthDate || null,
    gender: normalizeGender(fhirPatient.gender),
    email: extractEmail(fhirPatient),
    phone: extractPhone(fhirPatient),
    address: extractAddress(fhirPatient),
    source: provider,
    _raw: fhirPatient  // Keep raw for debugging/advanced use
  };
}

module.exports = normalizePatient;
