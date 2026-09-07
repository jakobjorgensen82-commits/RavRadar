export const RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_SCHEMA_VERSION = 1;
export const RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_CONTRACT_ID =
  'ravscore-public-weather-source-age-v1';
export const RAVSCORE_PUBLIC_WEATHER_SOURCE_COMPONENTS = Object.freeze([
  'windProvenance',
  'waveProvenance',
  'currentProvenance',
  'waterLevelProvenance',
]);
export const RAVSCORE_PUBLIC_WEATHER_SOURCE_PART_COUNT = 673;
export const RAVSCORE_PUBLIC_WEATHER_SOURCE_TOTAL_COUNT =
  RAVSCORE_PUBLIC_WEATHER_SOURCE_PART_COUNT
  * RAVSCORE_PUBLIC_WEATHER_SOURCE_COMPONENTS.length;

export const RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_FIELDS = Object.freeze([
  'schemaVersion',
  'contractId',
  'productionReferenceAt',
  'oldestKnownSourceReferenceAt',
  'knownCount',
  'unknownComparableAgeCount',
  'totalCount',
]);

function exactKeys(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

function canonicalTimestamp(value) {
  if (typeof value !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function exactUtcHour(value) {
  const canonical = canonicalTimestamp(value);
  if (!canonical) return null;
  const date = new Date(canonical);
  return date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
    ? canonical
    : null;
}

function comparableSourceReference(provenance, selectedReferenceAt) {
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)
    || !['verified', 'verified-derived'].includes(provenance.status)) return null;
  const isDirectDmi = provenance.provider === 'dmi';
  const isDerivedDmi = provenance.provider === 'ravradar-derived'
    && provenance.upstreamProvider === 'dmi';
  if (!isDirectDmi && !isDerivedDmi) return null;
  const modelRun = canonicalTimestamp(provenance.modelRun);
  if (!modelRun || Date.parse(modelRun) > Date.parse(selectedReferenceAt)) return null;
  return modelRun;
}

export function assertPublicWeatherSourceAge(value, {
  productionReferenceAt = null,
} = {}) {
  if (!exactKeys(value, RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_FIELDS)
    || value.schemaVersion !== RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_SCHEMA_VERSION
    || value.contractId !== RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_CONTRACT_ID) {
    throw new Error('Public weather source-age aggregate has an inexact contract');
  }
  const reference = exactUtcHour(value.productionReferenceAt);
  const expectedReference = productionReferenceAt === null
    ? reference
    : exactUtcHour(productionReferenceAt);
  const oldest = value.oldestKnownSourceReferenceAt === null
    ? null
    : canonicalTimestamp(value.oldestKnownSourceReferenceAt);
  if (!reference || value.productionReferenceAt !== reference
    || !expectedReference || reference !== expectedReference
    || !Number.isSafeInteger(value.knownCount) || value.knownCount < 0
    || !Number.isSafeInteger(value.unknownComparableAgeCount)
    || value.unknownComparableAgeCount < 0
    || value.totalCount !== RAVSCORE_PUBLIC_WEATHER_SOURCE_TOTAL_COUNT
    || value.knownCount + value.unknownComparableAgeCount !== value.totalCount
    || (value.knownCount === 0) !== (oldest === null)
    || (oldest !== null && (oldest !== value.oldestKnownSourceReferenceAt
      || Date.parse(oldest) > Date.parse(reference)))) {
    throw new Error('Public weather source-age aggregate does not close conservatively');
  }
  return true;
}

export function conservativeUnknownPublicWeatherSourceAge(productionReferenceAt) {
  const reference = exactUtcHour(productionReferenceAt);
  if (!reference) throw new Error('Public weather source age requires one exact production hour');
  return Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_SCHEMA_VERSION,
    contractId: RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_CONTRACT_ID,
    productionReferenceAt: reference,
    oldestKnownSourceReferenceAt: null,
    knownCount: 0,
    unknownComparableAgeCount: RAVSCORE_PUBLIC_WEATHER_SOURCE_TOTAL_COUNT,
    totalCount: RAVSCORE_PUBLIC_WEATHER_SOURCE_TOTAL_COUNT,
  });
}

export function buildPublicWeatherSourceAge({
  productionReferenceAt,
  partSourceRows,
} = {}) {
  const reference = exactUtcHour(productionReferenceAt);
  if (!reference || !Array.isArray(partSourceRows)
    || partSourceRows.length !== RAVSCORE_PUBLIC_WEATHER_SOURCE_PART_COUNT) {
    throw new Error('Public weather source age requires exact 673-part H0 coverage');
  }
  const partIds = partSourceRows.map(row => row?.partId);
  if (partIds.some(partId => typeof partId !== 'string' || !partId)
    || new Set(partIds).size !== RAVSCORE_PUBLIC_WEATHER_SOURCE_PART_COUNT) {
    throw new Error('Public weather source age requires unique coastal-part identities');
  }
  const knownReferences = [];
  let unknownComparableAgeCount = 0;
  for (const row of partSourceRows) {
    if (exactUtcHour(row?.selectedReferenceAt) !== reference) {
      throw new Error('Public weather source age mixed different selected forecast hours');
    }
    for (const field of RAVSCORE_PUBLIC_WEATHER_SOURCE_COMPONENTS) {
      const sourceReference = comparableSourceReference(row?.[field], reference);
      if (sourceReference) knownReferences.push(sourceReference);
      else unknownComparableAgeCount += 1;
    }
  }
  const value = Object.freeze({
    schemaVersion: RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_SCHEMA_VERSION,
    contractId: RAVSCORE_PUBLIC_WEATHER_SOURCE_AGE_CONTRACT_ID,
    productionReferenceAt: reference,
    oldestKnownSourceReferenceAt: knownReferences.length
      ? knownReferences.sort((left, right) => Date.parse(left) - Date.parse(right))[0]
      : null,
    knownCount: knownReferences.length,
    unknownComparableAgeCount,
    totalCount: RAVSCORE_PUBLIC_WEATHER_SOURCE_TOTAL_COUNT,
  });
  assertPublicWeatherSourceAge(value, { productionReferenceAt: reference });
  return value;
}

export function publicWeatherAgeReferenceAt(value) {
  assertPublicWeatherSourceAge(value);
  const candidates = [value.productionReferenceAt, value.oldestKnownSourceReferenceAt]
    .filter(Boolean)
    .sort((left, right) => Date.parse(left) - Date.parse(right));
  return candidates[0];
}
