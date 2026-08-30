export const CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION = 3;

export const CALIBRATION_BINDING_FEATURE_FIELDS = Object.freeze({
  modelId: 'modelVersion',
  stateSchemaVersion: 'modelStateVersion',
  variantId: 'modelVariantId',
  profileId: 'modelProfileId',
  componentSchemaId: 'modelComponentSchemaId',
  explanationSchemaId: 'modelExplanationSchemaId',
  rankingPolicyId: 'modelRankingPolicyId',
  bestTimePolicyId: 'modelBestTimePolicyId',
  presentationPolicyId: 'modelPresentationPolicyId',
  modelContractSha256: 'modelContractSha256',
  modelBundleSha256: 'modelBundleSha256',
});

export const CALIBRATION_NUMERIC_RANGES = Object.freeze({
  totalScore: [0, 100],
  huntabilityScore: [0, 100],
  transportScore: [0, 100],
  mobilisationScore: [0, 100],
  windSpeedMs: [0, 100],
  windDirectionDeg: [0, 360],
  waveHeightM: [0, 30],
  wavePeriodS: [0, 40],
  waveDirectionDeg: [0, 360],
  currentSpeedMs: [0, 10],
  currentDirectionDeg: [0, 360],
  waterLevelM: [-20, 20],
  waterLevelTrendM3h: [-10, 10],
  maxWaveHeight24hM: [0, 30],
  hoursSinceEnergyPeak: [0, 168],
  sustainedOnshoreHours: [0, 168],
});

export const CALIBRATION_FEATURE_FIELD_NAMES = Object.freeze([
  'modelVersion',
  'appVersion',
  ...Object.values(CALIBRATION_BINDING_FEATURE_FIELDS).filter(value => value !== 'modelVersion'),
  ...Object.keys(CALIBRATION_NUMERIC_RANGES),
  'reasonCodes',
]);
export const CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY = 'public-emergency-last-complete';
export const CALIBRATION_INELIGIBLE_REASON_RECONSTRUCTED =
  'ravscore-reconstructed-derived-evidence';
export const CALIBRATION_INELIGIBLE_REASON_UNATTESTED =
  'ravscore-evidence-trust-unattested';
export const TRIP_NON_CALIBRATION_QUALITY_FLAGS = Object.freeze([
  CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY,
  CALIBRATION_INELIGIBLE_REASON_RECONSTRUCTED,
  CALIBRATION_INELIGIBLE_REASON_UNATTESTED,
]);

export function isPublicEmergencyCalibrationFeatures(value) {
  return isRecord(value)
    && Array.isArray(value.reasonCodes)
    && value.reasonCodes.includes(CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY);
}

export const CURRENT_WEATHER_SNAPSHOT_FIELD_NAMES = Object.freeze([
  'schemaVersion',
  'capturedAt',
  'forecastSnapshotId',
  'forecastIssuedAt',
  'forecastValidAt',
  'calibrationFeatures',
]);

export const TRIP_LOG_DTO_FIELD_NAMES = Object.freeze([
  'client_observation_id',
  'trip_id',
  'observed_at',
  'trip_started_at',
  'trip_ended_at',
  'search_minutes',
  'hunt_mode',
  'found',
  'result',
  'grams',
  'actual_zone_id',
  'actual_coastal_part_id',
  'zone_name',
  'schema_version',
  'data_quality_flags',
  'model_version',
  'model_binding',
  'calibration_eligible',
  'calibration_binding_status',
  'forecast_snapshot_id',
]);

export const TRIP_STORAGE_INPUT_FIELD_NAMES = Object.freeze([
  'zone_id', 'zone_name', 'coast_type', 'observed_at', 'submitted_at', 'hunt_mode', 'result', 'grams',
  'anonymous_id', 'user_id', 'trip_id', 'gps', 'rav_score', 'score_level', 'ai_probability', 'ai_confidence',
  'model_version', 'weather_snapshot', 'wind_speed_mps', 'wind_direction_deg', 'wave_height_m', 'wave_period_s',
  'water_level_cm', 'current_speed_mps', 'current_direction_deg', 'water_temperature_c', 'client_observation_id',
  'schema_version', 'trip_started_at', 'trip_ended_at', 'search_minutes', 'search_coverage', 'actual_zone_id',
  'actual_coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id', 'calibration_eligible', 'found',
  'forecast_snapshot_id', 'forecast_issued_at', 'forecast_valid_at', 'forecast_captured_at', 'calibration_features',
  'data_quality_flags', 'forecast_target_at', 'report_accuracy',
]);

export const TRIP_DATA_QUALITY_FLAG_NAMES = Object.freeze([
  ...TRIP_NON_CALIBRATION_QUALITY_FLAGS,
  'account-manual',
  'historical-snapshot-unavailable',
  'not-calibration-eligible',
]);

const SEARCH_COVERAGE = new Set(['partial', 'normal', 'thorough']);
const SEARCH_MODES = new Set(['waders', 'beach']);
const RESULTS = new Set(['none', 'small', 'medium', 'good']);
const POSITIVE_RESULTS = new Set(['small', 'medium', 'good']);
const DATA_QUALITY_FLAGS = new Set(TRIP_DATA_QUALITY_FLAG_NAMES);
const TRIP_DATA_QUALITY_FLAG_COMBINATIONS = new Set([
  '[]',
  JSON.stringify([CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY]),
  JSON.stringify([CALIBRATION_INELIGIBLE_REASON_RECONSTRUCTED]),
  JSON.stringify([
    CALIBRATION_INELIGIBLE_REASON_PUBLIC_EMERGENCY,
    CALIBRATION_INELIGIBLE_REASON_RECONSTRUCTED,
  ]),
  JSON.stringify([CALIBRATION_INELIGIBLE_REASON_UNATTESTED]),
  JSON.stringify(['account-manual', 'historical-snapshot-unavailable', 'not-calibration-eligible']),
]);
const SCORE_FIELDS = Object.freeze([
  'totalScore',
  'huntabilityScore',
  'transportScore',
  'mobilisationScore',
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LEGACY_CALIBRATION_FIELDS = new Set([
  'modelVersion', 'appVersion', ...Object.values(CALIBRATION_BINDING_FEATURE_FIELDS),
  ...Object.keys(CALIBRATION_NUMERIC_RANGES), 'reasonCodes',
]);
const LEGACY_WEATHER_SNAPSHOT_FIELDS = new Set([
  'schemaVersion', 'capturedAt', 'sourceGeneratedAt', 'forecastTime', 'provider',
  'current', 'score', 'matchedRuleIds',
]);
const LEGACY_WEATHER_CURRENT_FIELDS = new Set([
  'generatedAt', 'time', 'provider', 'providerLabel', 'windSpeedMps', 'windDirectionDeg',
  'waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'currentSpeedMps',
  'currentDirectionDeg', 'waterLevelCm', 'waterLevelTrendCm3h', 'waterTemperatureC',
]);
const LEGACY_WEATHER_SCORE_FIELDS = new Set(['modelId', 'baseScore', 'finalScore', 'level']);
const ACCOUNT_REPORT_SNAPSHOT_FIELDS = new Set([
  'schemaVersion', 'capturedAt', 'reportSource', 'selectedAt', 'historicalSnapshotStatus',
]);
const ROOT_OWNER_FIELDS = new Set(['userid', 'anonymousid', 'gps']);
const SAFE_SENSITIVE_ALIASES = new Set(['modelprofileid']);
// Keep this pattern byte-identical to the Edge storage boundary. The browser
// additionally normalizes punctuation and keeps an explicit allowlist for
// modelProfileId, but neither boundary may miss a nested location alias.
const PRIVATE_LOCATION_KEY_PATTERN = /(lat(?:itude)?|lon(?:gitude)?|lng|gps|coord|position|route|track|location)/i;

const isRecord = value => Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value);
const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());
const validId = value => nonEmpty(value) && ID_PATTERN.test(value);
const validUuid = value => typeof value === 'string' && UUID_PATTERN.test(value);
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const strictFinite = value => typeof value === 'number' && Number.isFinite(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function sensitiveKeyKind(key) {
  const normalized = normalizedKey(key);
  if (SAFE_SENSITIVE_ALIASES.has(normalized)) return null;
  const location = PRIVATE_LOCATION_KEY_PATTERN.test(normalized)
    || normalized === 'lat' || normalized === 'lon' || normalized === 'lng'
    || normalized.startsWith('lat') || normalized.endsWith('lat')
    || normalized.startsWith('lon') || normalized.endsWith('lon')
    || normalized.startsWith('lng') || normalized.endsWith('lng')
    || ['gps', 'geolocation', 'latitude', 'longitude', 'coordinate', 'coord', 'position', 'route', 'track', 'waypoint', 'polyline']
      .some(token => normalized.includes(token));
  if (location) return 'location';
  const identity = ['email', 'userid', 'accountid', 'accountuser', 'contact', 'displayname', 'fullname', 'phonenumber', 'phone', 'profile', 'username']
    .some(token => normalized.includes(token));
  return identity ? 'identity' : null;
}

function exactKeys(value, names) {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value).sort();
  const expected = [...names].sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function allowedKeys(value, names) {
  return isRecord(value) && Object.keys(value).every(key => names.has(key));
}

function sameValue(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => sameValue(value, right[index]));
  }
  if (isRecord(left) || isRecord(right)) {
    return isRecord(left) && isRecord(right)
      && exactKeys(left, Object.keys(right))
      && Object.keys(left).every(key => sameValue(left[key], right[key]));
  }
  return Object.is(left, right);
}

function rowValue(row, snake, camel) {
  return row?.[snake] ?? row?.[camel];
}

function strictNullableNumber(value, range) {
  if (value === null) return true;
  return strictFinite(value) && value >= range[0] && value <= range[1];
}

function currentFeatureIssues(features) {
  const issues = [];
  if (!exactKeys(features, CALIBRATION_FEATURE_FIELD_NAMES)) {
    issues.push('CALIBRATION_FEATURE_SHAPE_INVALID');
    return issues;
  }
  if (!validId(features.modelVersion) || !validId(features.appVersion)) {
    issues.push('CALIBRATION_FEATURE_VERSION_INVALID');
  }
  for (const featureField of Object.values(CALIBRATION_BINDING_FEATURE_FIELDS)) {
    if (!validId(features[featureField])) issues.push('MODEL_BINDING_INCOMPLETE');
  }
  if (!SHA256_PATTERN.test(features.modelContractSha256)
    || !SHA256_PATTERN.test(features.modelBundleSha256)) {
    issues.push('MODEL_BINDING_INCOMPLETE');
  }
  for (const [field, range] of Object.entries(CALIBRATION_NUMERIC_RANGES)) {
    const required = SCORE_FIELDS.includes(field);
    if ((required && !strictFinite(features[field]))
      || (!required && !strictNullableNumber(features[field], range))
      || (field === 'totalScore' && !Number.isInteger(features[field]))
      || (strictFinite(features[field]) && (features[field] < range[0] || features[field] > range[1]))) {
      issues.push('SCORE_FEATURES_INCOMPLETE');
    }
  }
  if (!Array.isArray(features.reasonCodes)
    || features.reasonCodes.length > 12
    || features.reasonCodes.some(value => !validId(value))) {
    issues.push('CALIBRATION_REASON_CODES_INVALID');
  }
  return [...new Set(issues)];
}

export function assertTripDataQualityFlags(value) {
  if (value === null || value === undefined) return true;
  if (!Array.isArray(value)
    || value.length > TRIP_DATA_QUALITY_FLAG_NAMES.length
    || new Set(value).size !== value.length
    || value.some(flag => typeof flag !== 'string' || !DATA_QUALITY_FLAGS.has(flag))
    || !TRIP_DATA_QUALITY_FLAG_COMBINATIONS.has(JSON.stringify(value))) {
    throw new Error('TRIP_DATA_QUALITY_FLAGS_INVALID');
  }
  return true;
}

function assertAllowedObject(value, fields, code) {
  if (!allowedKeys(value, fields)) throw new Error(code);
}

function assertLegacyWeatherSnapshot(snapshot) {
  if (!isRecord(snapshot)) throw new Error('TRIP_WEATHER_SNAPSHOT_INVALID');
  if (snapshot.schemaVersion === 5) {
    if (!exactKeys(snapshot, ACCOUNT_REPORT_SNAPSHOT_FIELDS)) throw new Error('TRIP_WEATHER_SNAPSHOT_FIELDS_INVALID');
    return;
  }
  if (snapshot.schemaVersion !== 4) throw new Error('TRIP_WEATHER_SNAPSHOT_SCHEMA_INVALID');
  if (own(snapshot, 'forecastSnapshotId')) {
    if (!exactKeys(snapshot, CURRENT_WEATHER_SNAPSHOT_FIELD_NAMES)) throw new Error('TRIP_WEATHER_SNAPSHOT_FIELDS_INVALID');
    assertAllowedObject(snapshot.calibrationFeatures, LEGACY_CALIBRATION_FIELDS, 'TRIP_CALIBRATION_FIELDS_INVALID');
    return;
  }
  if (!exactKeys(snapshot, LEGACY_WEATHER_SNAPSHOT_FIELDS)) throw new Error('TRIP_WEATHER_SNAPSHOT_FIELDS_INVALID');
  assertAllowedObject(snapshot.current, LEGACY_WEATHER_CURRENT_FIELDS, 'TRIP_WEATHER_CURRENT_FIELDS_INVALID');
  assertAllowedObject(snapshot.score, LEGACY_WEATHER_SCORE_FIELDS, 'TRIP_WEATHER_SCORE_FIELDS_INVALID');
  if (!Array.isArray(snapshot.matchedRuleIds) || snapshot.matchedRuleIds.some(value => typeof value !== 'string')) {
    throw new Error('TRIP_WEATHER_RULE_IDS_INVALID');
  }
}

export function assertNoSensitiveTripData(value, { allowRootOwnerFields = false } = {}, path = 'trip', depth = 0) {
  if (depth > 8) throw new Error('TRIP_PAYLOAD_TOO_DEEP');
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('TRIP_PAYLOAD_LIST_TOO_LONG');
    value.forEach((entry, index) => assertNoSensitiveTripData(entry, { allowRootOwnerFields: false }, `${path}[${index}]`, depth + 1));
    return true;
  }
  if (!isRecord(value)) return true;
  const entries = Object.entries(value);
  if (entries.length > 80) throw new Error('TRIP_PAYLOAD_OBJECT_TOO_LARGE');
  for (const [key, nested] of entries) {
    const normalized = normalizedKey(key);
    const kind = sensitiveKeyKind(key);
    const permittedRootOwnerField = depth === 0 && allowRootOwnerFields && ROOT_OWNER_FIELDS.has(normalized);
    const permittedNullLocation = kind === 'location' && nested === null;
    if (kind && !permittedRootOwnerField && !permittedNullLocation) {
      throw new Error(kind === 'location' ? 'PRECISE_LOCATION_NOT_ALLOWED' : 'DIRECT_IDENTITY_NOT_ALLOWED');
    }
    if (key.length > 80 || ['__proto__', 'constructor', 'prototype'].includes(key.toLowerCase())) {
      throw new Error('INVALID_NESTED_KEY');
    }
    if (typeof nested === 'string' && nested.length > 2_000) throw new Error('TRIP_PAYLOAD_TEXT_TOO_LONG');
    assertNoSensitiveTripData(nested, { allowRootOwnerFields: false }, `${path}.${key}`, depth + 1);
  }
  return true;
}

export function assertTripObservationNestedPrivacy(row) {
  if (!isRecord(row)) throw new Error('TRIP_PAYLOAD_REQUIRED');
  const schemaVersion = rowValue(row, 'schema_version', 'schemaVersion') ?? 1;
  if (!Number.isInteger(schemaVersion) || ![1, 2, CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION].includes(schemaVersion)) {
    throw new Error('TRIP_SCHEMA_VERSION_INVALID');
  }
  if (row.gps !== null && row.gps !== undefined) throw new Error('PRECISE_LOCATION_NOT_ALLOWED');
  assertNoSensitiveTripData(row, { allowRootOwnerFields: true });
  assertTripDataQualityFlags(rowValue(row, 'data_quality_flags', 'dataQualityFlags'));
  const weatherSnapshot = rowValue(row, 'weather_snapshot', 'weatherSnapshot');
  const features = rowValue(row, 'calibration_features', 'calibrationFeatures');
  if (schemaVersion === CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION) {
    if (!exactKeys(weatherSnapshot, CURRENT_WEATHER_SNAPSHOT_FIELD_NAMES)) throw new Error('TRIP_WEATHER_SNAPSHOT_FIELDS_INVALID');
    if (!exactKeys(features, CALIBRATION_FEATURE_FIELD_NAMES)) throw new Error('TRIP_CALIBRATION_FIELDS_INVALID');
  } else {
    if (weatherSnapshot != null) assertLegacyWeatherSnapshot(weatherSnapshot);
    if (features != null) assertAllowedObject(features, LEGACY_CALIBRATION_FIELDS, 'TRIP_CALIBRATION_FIELDS_INVALID');
  }
  return true;
}

export function calibrationFeatureBinding(features) {
  if (!isRecord(features)) return null;
  const binding = {};
  for (const [bindingField, featureField] of Object.entries(CALIBRATION_BINDING_FEATURE_FIELDS)) {
    const value = features[featureField];
    if (!validId(value)) return null;
    binding[bindingField] = value;
  }
  return binding;
}

export function isExactCalibrationModelBinding(value) {
  const fields = Object.keys(CALIBRATION_BINDING_FEATURE_FIELDS);
  if (!exactKeys(value, fields)) return false;
  if (fields.some(field => !validId(value[field]))) return false;
  return SHA256_PATTERN.test(value.modelContractSha256)
    && SHA256_PATTERN.test(value.modelBundleSha256);
}

export function sameCalibrationModelBinding(left, right) {
  if (!isExactCalibrationModelBinding(left) || !isExactCalibrationModelBinding(right)) return false;
  return Object.keys(CALIBRATION_BINDING_FEATURE_FIELDS)
    .every(key => left[key] === right[key]);
}

export function tripEvidenceIntegrityIssues(row) {
  const issues = [];
  const schemaVersion = rowValue(row, 'schema_version', 'schemaVersion');
  const tripId = rowValue(row, 'trip_id', 'tripId');
  const clientId = rowValue(row, 'client_observation_id', 'clientObservationId') ?? row?.id ?? tripId;
  const actualZone = rowValue(row, 'actual_zone_id', 'zoneId');
  const actualPart = rowValue(row, 'actual_coastal_part_id', 'coastalPartId');
  const forecastZone = rowValue(row, 'forecast_zone_id', 'forecastZoneId');
  const forecastPart = rowValue(row, 'forecast_coastal_part_id', 'forecastCoastalPartId');
  const searchMinutes = rowValue(row, 'search_minutes', 'searchMinutes');
  const searchCoverage = rowValue(row, 'search_coverage', 'searchCoverage');
  const mode = rowValue(row, 'hunt_mode', 'mode');
  const startedAt = rowValue(row, 'trip_started_at', 'tripStartedAt');
  const endedAt = rowValue(row, 'trip_ended_at', 'tripEndedAt');
  const observedAt = rowValue(row, 'observed_at', 'observedAt');
  const snapshotId = rowValue(row, 'forecast_snapshot_id', 'forecastSnapshotId');
  const issuedAt = rowValue(row, 'forecast_issued_at', 'forecastIssuedAt');
  const validAt = rowValue(row, 'forecast_valid_at', 'forecastValidAt');
  const capturedAt = rowValue(row, 'forecast_captured_at', 'forecastCapturedAt');
  const features = rowValue(row, 'calibration_features', 'calibrationFeatures');
  const weatherSnapshot = rowValue(row, 'weather_snapshot', 'weatherSnapshot');
  const dataQualityFlags = rowValue(row, 'data_quality_flags', 'dataQualityFlags');
  const binding = calibrationFeatureBinding(features);

  if (schemaVersion !== CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION) issues.push('SCHEMA_NOT_CURRENT_TRIP');
  if (!validUuid(tripId) || !validUuid(clientId)) issues.push('TRIP_IDENTIFIER_INVALID');
  if (![actualZone, actualPart, forecastZone, forecastPart].every(validId)) issues.push('LOCATION_REFERENCE_INCOMPLETE');
  if (!Number.isInteger(searchMinutes) || searchMinutes < 1 || searchMinutes > 1440
    || !SEARCH_COVERAGE.has(searchCoverage)) issues.push('SEARCH_EFFORT_INCOMPLETE');
  if (!SEARCH_MODES.has(mode)) issues.push('SEARCH_MODE_INVALID');
  if (typeof row?.found !== 'boolean' || !RESULTS.has(row?.result)) issues.push('RESULT_INCOMPLETE');
  if (row?.found === false && (row?.result !== 'none' || row?.grams !== null)) issues.push('RESULT_INCONSISTENT');
  if (row?.found === true && (!POSITIVE_RESULTS.has(row?.result)
    || !(row?.grams === null || (strictFinite(row?.grams) && row.grams >= 0 && row.grams <= 10000)))) {
    issues.push('RESULT_INCONSISTENT');
  }
  if (![startedAt, endedAt, observedAt, issuedAt, validAt, capturedAt].every(validTime)
    || !validId(snapshotId)) {
    issues.push('FORECAST_REFERENCE_INCOMPLETE');
  } else {
    const startMs = Date.parse(startedAt);
    const endMs = Date.parse(endedAt);
    const durationMs = endMs - startMs;
    if (durationMs <= 0 || durationMs > 24 * 60 * 60_000
      || Date.parse(observedAt) !== startMs + durationMs / 2
      || searchMinutes !== Math.max(1, Math.round(durationMs / 60_000))
      || Date.parse(issuedAt) > Date.parse(capturedAt)
      || Date.parse(capturedAt) > startMs + 5 * 60_000) {
      issues.push('FORECAST_REFERENCE_INCONSISTENT');
    }
  }
  issues.push(...currentFeatureIssues(features));
  try {
    assertTripDataQualityFlags(dataQualityFlags);
  } catch {
    issues.push('DATA_QUALITY_FLAGS_INVALID');
  }
  const qualityReasons = Array.isArray(features?.reasonCodes)
    ? features.reasonCodes.filter(reason => TRIP_NON_CALIBRATION_QUALITY_FLAGS.includes(reason))
    : null;
  if (!Array.isArray(dataQualityFlags)
    || !Array.isArray(qualityReasons)
    || !sameValue(dataQualityFlags, qualityReasons)) {
    issues.push('DATA_QUALITY_REASON_BINDING_INVALID');
  }
  if (!binding) issues.push('MODEL_BINDING_INCOMPLETE');
  const topModelVersion = rowValue(row, 'model_version', 'modelVersion');
  if (!binding || topModelVersion !== binding.modelId) issues.push('TOP_LEVEL_MODEL_MISMATCH');
  const topRavScore = rowValue(row, 'rav_score', 'ravScore');
  if (!strictFinite(topRavScore) || !isRecord(features) || topRavScore !== features.totalScore) {
    issues.push('TOP_LEVEL_SCORE_MISMATCH');
  }
  if (!exactKeys(weatherSnapshot, CURRENT_WEATHER_SNAPSHOT_FIELD_NAMES)
    || weatherSnapshot.schemaVersion !== 4
    || weatherSnapshot.forecastSnapshotId !== snapshotId
    || weatherSnapshot.forecastIssuedAt !== issuedAt
    || weatherSnapshot.forecastValidAt !== validAt
    || weatherSnapshot.capturedAt !== capturedAt
    || !sameValue(weatherSnapshot.calibrationFeatures, features)) {
    issues.push('IMMUTABLE_SNAPSHOT_MISMATCH');
  }
  const scalarParity = [
    ['wind_speed_mps', 'windSpeedMs', 1],
    ['wind_direction_deg', 'windDirectionDeg', 1],
    ['wave_height_m', 'waveHeightM', 1],
    ['wave_period_s', 'wavePeriodS', 1],
    ['water_level_cm', 'waterLevelM', 100],
    ['current_speed_mps', 'currentSpeedMs', 1],
    ['current_direction_deg', 'currentDirectionDeg', 1],
  ];
  if (!isRecord(features) || scalarParity.some(([column, feature, factor]) => {
    if (!own(row, column)) return true;
    const expected = features[feature] === null
      ? null
      : Number((features[feature] * factor).toFixed(9));
    return !Object.is(row[column], expected);
  })) issues.push('STORED_FEATURE_PARITY_MISMATCH');
  try {
    assertTripObservationNestedPrivacy(row);
  } catch {
    issues.push('PRIVACY_CONTRACT_INVALID');
  }
  return Object.freeze([...new Set(issues)]);
}

export function expectedCalibrationEligibility(row, expectedBinding) {
  if (tripEvidenceIntegrityIssues(row).length) return false;
  const features = rowValue(row, 'calibration_features', 'calibrationFeatures');
  if (Array.isArray(features?.reasonCodes)
    && features.reasonCodes.some(reason => TRIP_NON_CALIBRATION_QUALITY_FLAGS.includes(reason))) return false;
  const actualZone = rowValue(row, 'actual_zone_id', 'zoneId');
  const actualPart = rowValue(row, 'actual_coastal_part_id', 'coastalPartId');
  const forecastZone = rowValue(row, 'forecast_zone_id', 'forecastZoneId');
  const forecastPart = rowValue(row, 'forecast_coastal_part_id', 'forecastCoastalPartId');
  return actualZone === forecastZone
    && actualPart === forecastPart
    && sameCalibrationModelBinding(
      calibrationFeatureBinding(rowValue(row, 'calibration_features', 'calibrationFeatures')),
      expectedBinding,
    );
}

// Only the exact integrated binding and explicitly sealed rollback bindings may
// cross the write boundary. An unknown, merely well-formed model must never be
// smuggled into schema 3 by setting calibration_eligible=false.
export function submittedCalibrationEligibilityMatches(row, expectedBinding, {
  ineligibleBindings = [],
} = {}) {
  const submitted = rowValue(row, 'calibration_eligible', 'calibrationEligible');
  if (typeof submitted !== 'boolean' || tripEvidenceIntegrityIssues(row).length) return false;
  if (!isExactCalibrationModelBinding(expectedBinding)
    || !Array.isArray(ineligibleBindings)
    || ineligibleBindings.some(binding => !isExactCalibrationModelBinding(binding))) return false;
  const actualBinding = calibrationFeatureBinding(
    rowValue(row, 'calibration_features', 'calibrationFeatures'),
  );
  if (sameCalibrationModelBinding(actualBinding, expectedBinding)) {
    return submitted === expectedCalibrationEligibility(row, expectedBinding);
  }
  return submitted === false
    && ineligibleBindings.some(binding => sameCalibrationModelBinding(actualBinding, binding));
}

export function calibrationEligibilityIssues(row, expectedBinding) {
  const issues = [...tripEvidenceIntegrityIssues(row)];
  if (rowValue(row, 'calibration_eligible', 'calibrationEligible') !== true) {
    issues.push('NOT_MARKED_CALIBRATION_ELIGIBLE');
  }
  const actualZone = rowValue(row, 'actual_zone_id', 'zoneId');
  const actualPart = rowValue(row, 'actual_coastal_part_id', 'coastalPartId');
  const forecastZone = rowValue(row, 'forecast_zone_id', 'forecastZoneId');
  const forecastPart = rowValue(row, 'forecast_coastal_part_id', 'forecastCoastalPartId');
  if (actualZone !== forecastZone || actualPart !== forecastPart) issues.push('ACTUAL_FORECAST_LOCATION_MISMATCH');
  if (!sameCalibrationModelBinding(
    calibrationFeatureBinding(rowValue(row, 'calibration_features', 'calibrationFeatures')),
    expectedBinding,
  )) issues.push('MODEL_BINDING_INCOMPATIBLE');
  return Object.freeze([...new Set(issues)]);
}

export function isCalibrationEligibleForBinding(row, expectedBinding) {
  return calibrationEligibilityIssues(row, expectedBinding).length === 0;
}

export function calibrationBindingStatus(row, expectedBinding) {
  const schemaVersion = rowValue(row, 'schema_version', 'schemaVersion');
  const binding = calibrationFeatureBinding(rowValue(row, 'calibration_features', 'calibrationFeatures'));
  if (!binding) return 'unbound';
  if (schemaVersion !== CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION
    || !sameCalibrationModelBinding(binding, expectedBinding)) return 'historical-model-bound';
  return isCalibrationEligibleForBinding(row, expectedBinding) ? 'current-eligible' : 'current-ineligible';
}

export function accountTripBindingStatus(row, expectedBinding, {
  allowCalibration = true,
} = {}) {
  if (own(row, 'model_binding')) {
    const binding = row?.model_binding;
    if (!isExactCalibrationModelBinding(binding)) return 'unbound';
    if (rowValue(row, 'schema_version', 'schemaVersion') !== CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION
      || !sameCalibrationModelBinding(binding, expectedBinding)) return 'historical-model-bound';
    return allowCalibration && rowValue(row, 'calibration_eligible', 'calibrationEligible') === true
      ? 'current-eligible'
      : 'current-ineligible';
  }
  return calibrationBindingStatus(row, expectedBinding);
}

export function projectTripLogDto(row, expectedBinding) {
  const status = calibrationBindingStatus(row, expectedBinding);
  const binding = calibrationFeatureBinding(row?.calibration_features);
  const schemaVersion = Number.isInteger(row?.schema_version) ? row.schema_version : 1;
  const flags = Array.isArray(row?.data_quality_flags)
    ? [...new Set(row.data_quality_flags.filter(value => typeof value === 'string' && DATA_QUALITY_FLAGS.has(value)))]
    : [];
  const found = typeof row?.found === 'boolean' ? row.found : null;
  const result = RESULTS.has(row?.result) ? row.result : null;
  const consistentResult = found === false
    ? (result === 'none' ? result : null)
    : found === true
      ? (POSITIVE_RESULTS.has(result) ? result : null)
      : result;
  const grams = consistentResult !== 'none'
    && (row?.grams === null || (strictFinite(row?.grams) && row.grams >= 0 && row.grams <= 10000))
    ? row.grams
    : null;
  return Object.freeze({
    client_observation_id: typeof row?.client_observation_id === 'string' ? row.client_observation_id : null,
    trip_id: typeof row?.trip_id === 'string' ? row.trip_id : null,
    observed_at: validTime(row?.observed_at) ? row.observed_at : null,
    trip_started_at: validTime(row?.trip_started_at) ? row.trip_started_at : null,
    trip_ended_at: validTime(row?.trip_ended_at) ? row.trip_ended_at : null,
    search_minutes: Number.isInteger(row?.search_minutes) && row.search_minutes >= 1 && row.search_minutes <= 1440 ? row.search_minutes : null,
    hunt_mode: SEARCH_MODES.has(row?.hunt_mode) ? row.hunt_mode : null,
    found,
    result: consistentResult,
    grams,
    actual_zone_id: validId(row?.actual_zone_id) ? row.actual_zone_id : null,
    actual_coastal_part_id: validId(row?.actual_coastal_part_id) ? row.actual_coastal_part_id : null,
    zone_name: typeof row?.zone_name === 'string' ? row.zone_name.slice(0, 160) : null,
    schema_version: schemaVersion,
    data_quality_flags: flags,
    model_version: validId(row?.model_version) ? row.model_version : null,
    model_binding: isExactCalibrationModelBinding(binding) ? Object.freeze({ ...binding }) : null,
    calibration_eligible: status === 'current-eligible',
    calibration_binding_status: status,
    forecast_snapshot_id: validId(row?.forecast_snapshot_id) ? row.forecast_snapshot_id : null,
  });
}

export function projectTripStoragePayload(row, {
  includeOwnerIdentifiers = true,
  omitNull = false,
  historicalMigration = false,
} = {}) {
  if (!isRecord(row)) throw new Error('TRIP_PAYLOAD_REQUIRED');
  const output = {};
  for (const key of TRIP_STORAGE_INPUT_FIELD_NAMES) {
    if (!includeOwnerIdentifiers && ['user_id', 'anonymous_id', 'gps'].includes(key)) continue;
    if (!own(row, key)) continue;
    const value = row[key];
    if (omitNull && (value === null || value === undefined)) continue;
    if (key === 'data_quality_flags' && Array.isArray(value) && value.length === 0
      && Number(row.schema_version ?? 1) !== CURRENT_TRIP_EVIDENCE_SCHEMA_VERSION) continue;
    output[key] = typeof structuredClone === 'function'
      ? structuredClone(value)
      : JSON.parse(JSON.stringify(value));
  }
  if (!includeOwnerIdentifiers) delete output.gps;
  if (historicalMigration) {
    if (output.gps !== null && output.gps !== undefined) throw new Error('PRECISE_LOCATION_NOT_ALLOWED');
    assertNoSensitiveTripData(output, { allowRootOwnerFields: includeOwnerIdentifiers });
  } else {
    assertTripObservationNestedPrivacy(output);
  }
  return output;
}

export function projectAdminObservationDto(row, expectedBinding) {
  const trip = projectTripLogDto(row, expectedBinding);
  const safeNumber = (value, minimum, maximum) => strictFinite(value) && value >= minimum && value <= maximum ? value : null;
  return Object.freeze({
    ...trip,
    rav_score: safeNumber(row?.rav_score, 0, 100),
    water_level_cm: safeNumber(row?.water_level_cm, -2000, 2000),
    wind_speed_mps: safeNumber(row?.wind_speed_mps, 0, 100),
    wave_height_m: safeNumber(row?.wave_height_m, 0, 30),
  });
}
