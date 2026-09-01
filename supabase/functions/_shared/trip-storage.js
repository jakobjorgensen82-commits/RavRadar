const CLOUDFLARE_WORKER_SUFFIX = '.workers.dev';
const CANDIDATE_G_ROLLBACK_MODEL_ID =
  'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
const OWNER_PREFIX = Object.freeze({ user: 'usr_v1_', anonymous: 'anon_v1_' });
const DIRECT_IDENTITY_KEYS = new Set([
  'anonymousid', 'displayname', 'email', 'fullname', 'phonenumber', 'profile', 'userid'
]);
// Keep the remote storage boundary at least as strict as the browser-side
// trip-evidence privacy contract. Every nested key is examined so aliases such
// as lat, lng, geoCoordinates and gpsTrack cannot carry precise position.
const PRIVATE_LOCATION_KEY_PATTERN = /(lat(?:itude)?|lon(?:gitude)?|lng|gps|coord|position|route|track|location)/i;
const CALIBRATION_FEATURE_KEYS = new Set([
  'modelVersion', 'appVersion', 'modelStateVersion', 'modelVariantId', 'modelProfileId',
  'modelComponentSchemaId', 'modelExplanationSchemaId', 'modelRankingPolicyId',
  'modelBestTimePolicyId', 'modelPresentationPolicyId', 'modelContractSha256',
  'modelBundleSha256', 'totalScore', 'huntabilityScore', 'transportScore',
  'scoreBoundLower', 'scoreBoundUpper', 'scoreBoundModelUncertaintyPoints',
  'scoreBoundRawLower', 'scoreBoundRawUpper', 'historyCoverageHours',
  'scoreQuality', 'scoreSemantics', 'scoreCalibrationEligible',
  'conservativeTailResetApplied', 'historyReasonCodes',
  'mobilisationScore', 'windSpeedMs', 'windDirectionDeg', 'waveHeightM',
  'wavePeriodS', 'waveDirectionDeg', 'currentSpeedMs', 'currentDirectionDeg',
  'waterLevelM', 'waterLevelTrendM3h', 'maxWaveHeight24hM',
  'hoursSinceEnergyPeak', 'sustainedOnshoreHours', 'reasonCodes',
]);
const CALIBRATION_REQUIRED_TEXT_KEYS = Object.freeze([
  'modelVersion', 'appVersion', 'modelStateVersion', 'modelVariantId', 'modelProfileId',
  'modelComponentSchemaId', 'modelExplanationSchemaId', 'modelRankingPolicyId',
  'modelBestTimePolicyId', 'modelPresentationPolicyId', 'modelContractSha256',
  'modelBundleSha256', 'scoreQuality', 'scoreSemantics',
]);
const CALIBRATION_REQUIRED_SCORE_KEYS = Object.freeze([
  'totalScore', 'scoreBoundLower', 'scoreBoundUpper',
  'scoreBoundModelUncertaintyPoints', 'scoreBoundRawLower', 'scoreBoundRawUpper',
  'historyCoverageHours', 'huntabilityScore', 'transportScore', 'mobilisationScore',
]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const WEATHER_SNAPSHOT_KEYS = new Set([
  'schemaVersion', 'capturedAt', 'sourceGeneratedAt', 'forecastTime', 'provider',
  'current', 'score', 'prediction', 'matchedRuleIds', 'forecastSnapshotId',
  'forecastIssuedAt', 'forecastValidAt', 'calibrationFeatures', 'reportSource',
  'selectedAt', 'historicalSnapshotStatus',
]);
const WEATHER_CURRENT_KEYS = new Set([
  'generatedAt', 'time', 'provider', 'providerLabel', 'windSpeedMps',
  'windDirectionDeg', 'waveHeightM', 'wavePeriodS', 'waveDirectionDeg',
  'currentSpeedMps', 'currentDirectionDeg', 'waterLevelCm',
  'waterLevelTrendCm3h', 'waterTemperatureC',
]);
const WEATHER_SCORE_KEYS = new Set(['baseScore', 'finalScore', 'level']);
const WEATHER_PREDICTION_KEYS = new Set(['probability', 'confidence', 'modelVersion']);
const CALIBRATION_FEATURE_RANGES = Object.freeze({
  totalScore: [0, 100], huntabilityScore: [0, 100], transportScore: [0, 100],
  scoreBoundLower:[0,100],scoreBoundUpper:[0,100],
  scoreBoundModelUncertaintyPoints:[0,100],scoreBoundRawLower:[0,100],
  scoreBoundRawUpper:[0,100],historyCoverageHours:[0,48],
  mobilisationScore: [0, 100], windSpeedMs: [0, 100], windDirectionDeg: [0, 360],
  waveHeightM: [0, 30], wavePeriodS: [0, 40], waveDirectionDeg: [0, 360],
  currentSpeedMs: [0, 10], currentDirectionDeg: [0, 360], waterLevelM: [-20, 20],
  waterLevelTrendM3h: [-10, 10], maxWaveHeight24hM: [0, 30],
  hoursSinceEnergyPeak: [0, 168], sustainedOnshoreHours: [0, 168],
});
const SNAPSHOT_CURRENT_RANGES = Object.freeze({
  windSpeedMps: [0, 100], windDirectionDeg: [0, 360], waveHeightM: [0, 30],
  wavePeriodS: [0, 40], waveDirectionDeg: [0, 360], currentSpeedMps: [0, 10],
  currentDirectionDeg: [0, 360], waterLevelCm: [-2000, 2000],
  waterLevelTrendCm3h: [-1000, 1000], waterTemperatureC: [-10, 50],
});
export const RECONSTRUCTED_RAVSCORE_QUALITY_FLAG = 'ravscore-reconstructed-derived-evidence';
export const PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG = 'public-emergency-last-complete';
export const HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG = 'ravscore-history-incomplete';
export const UNATTESTED_RAVSCORE_QUALITY_FLAG = 'ravscore-evidence-trust-unattested';
export const GLOBAL_WARMUP_CALIBRATION_LOCK_REASON =
  'ravscore-global-warmup-calibration-lock';
export const TRIP_NON_CALIBRATION_QUALITY_FLAGS = Object.freeze([
  PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG,
  HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG,
  RECONSTRUCTED_RAVSCORE_QUALITY_FLAG,
  UNATTESTED_RAVSCORE_QUALITY_FLAG,
]);
const LEGACY_TRIP_QUALITY_FLAG_COMBINATIONS = new Set([
  '[]',
  JSON.stringify([PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG]),
  JSON.stringify([RECONSTRUCTED_RAVSCORE_QUALITY_FLAG]),
  JSON.stringify([PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG, RECONSTRUCTED_RAVSCORE_QUALITY_FLAG]),
  JSON.stringify([UNATTESTED_RAVSCORE_QUALITY_FLAG]),
]);
const TRIP_QUALITY_FLAG_COMBINATIONS = new Set([
  ...LEGACY_TRIP_QUALITY_FLAG_COMBINATIONS,
  JSON.stringify([HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG]),
  JSON.stringify([PUBLIC_EMERGENCY_LAST_COMPLETE_QUALITY_FLAG, HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG]),
]);

export const TRIP_INPUT_FIELD_NAMES = Object.freeze([
  'zone_id', 'zone_name', 'coast_type', 'observed_at', 'submitted_at', 'hunt_mode', 'result', 'grams',
  'anonymous_id', 'user_id', 'trip_id', 'gps', 'rav_score', 'score_level', 'ai_probability', 'ai_confidence',
  'model_version', 'weather_snapshot', 'wind_speed_mps', 'wind_direction_deg', 'wave_height_m', 'wave_period_s',
  'water_level_cm', 'current_speed_mps', 'current_direction_deg', 'water_temperature_c', 'client_observation_id',
  'schema_version', 'trip_started_at', 'trip_ended_at', 'search_minutes', 'search_coverage', 'actual_zone_id',
  'actual_coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id', 'calibration_eligible', 'found',
  'forecast_snapshot_id', 'forecast_issued_at', 'forecast_valid_at', 'forecast_captured_at', 'calibration_features',
  'data_quality_flags', 'forecast_target_at', 'report_accuracy',
]);
const STORED_EXTERNAL_TRIP_FIELD_NAMES = new Set(
  TRIP_INPUT_FIELD_NAMES.filter(key =>
    key !== 'user_id' && key !== 'anonymous_id' && key !== 'gps'),
);

export const D1_TRIP_SCHEMA_STATEMENTS = Object.freeze([
  `create table if not exists trip_observations (
    storage_schema_version integer not null default 1 check (storage_schema_version = 1),
    owner_subject text not null check (length(owner_subject) between 20 and 96),
    owner_kind text not null check (owner_kind in ('user', 'anonymous')),
    trip_id text,
    client_observation_id text not null,
    observed_at text not null,
    submitted_at text not null,
    payload_json text not null check (json_valid(payload_json)),
    payload_sha256 text not null check (length(payload_sha256) = 64),
    source text not null check (source in ('live', 'supabase-migration')),
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    primary key (client_observation_id)
  )`,
  `create unique index if not exists trip_observations_trip_id_unique
    on trip_observations(trip_id) where trip_id is not null`,
  `create index if not exists trip_observations_owner_time
    on trip_observations(owner_subject, observed_at desc)`,
  `create table if not exists trip_observation_registry (
    client_observation_id text not null primary key,
    trip_id text,
    owner_subject text not null check (length(owner_subject) between 20 and 96),
    payload_sha256 text not null check (length(payload_sha256) = 64),
    target_database_index integer not null check (target_database_index between 0 and 9),
    created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `create unique index if not exists trip_observation_registry_trip_unique
    on trip_observation_registry(trip_id) where trip_id is not null`,
  `create unique index if not exists trip_observation_registry_owner_client_unique
    on trip_observation_registry(owner_subject, client_observation_id)`,
  `create unique index if not exists trip_observation_registry_owner_trip_unique
    on trip_observation_registry(owner_subject, trip_id) where trip_id is not null`,
  `create table if not exists trip_owner_erasure_tombstones (
    owner_subject text not null primary key check (length(owner_subject) between 20 and 96),
    erased_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `create table if not exists trip_storage_control (
    control_key text not null primary key check (control_key = 'd1_activation_attempted'),
    control_value text not null check (control_value = 'true'),
    updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
]);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertScalarOrNull(value, errorCode) {
  if (value === null || value === undefined) return;
  if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error(errorCode);
}

function assertBoundedNumberOrNull(value, range, errorCode) {
  if (value === null || value === undefined) return;
  if (typeof value !== 'number' || !Number.isFinite(value)
    || value < range[0] || value > range[1]) throw new Error(errorCode);
}

function assertBoundedTextOrNull(value, maximum, errorCode) {
  if (value === null || value === undefined) return;
  if (typeof value !== 'string' || value.length > maximum) throw new Error(errorCode);
}

function assertAllowedRecord(value, allowedKeys, errorCode) {
  if (!isRecord(value)) throw new Error(errorCode);
  if (Object.keys(value).some(key => !allowedKeys.has(key))) throw new Error(errorCode);
}

function assertExactRecord(value, allowedKeys, errorCode) {
  assertAllowedRecord(value, allowedKeys, errorCode);
  if (Object.keys(value).length !== allowedKeys.size
    || [...allowedKeys].some(key => !Object.hasOwn(value, key))) throw new Error(errorCode);
}

function assignProjected(output, key, value) {
  if (value !== undefined) output[key] = value;
}

function projectedTextOrNull(value, maximum) {
  if (value === null) return null;
  return typeof value === 'string' && value.length <= maximum ? value : undefined;
}

function projectedNumberOrNull(value, range) {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value)
    && value >= range[0] && value <= range[1] ? value : undefined;
}

function projectLegacyCalibrationFeatures(value) {
  if (!isRecord(value)) return undefined;
  const projected = {};
  for (const key of CALIBRATION_FEATURE_KEYS) {
    const nested = value[key];
    if (key === 'reasonCodes' || key === 'historyReasonCodes') {
      if (Array.isArray(nested)) {
        projected[key] = nested
          .filter(item => typeof item === 'string' && item.length <= 128)
          .slice(0, 12);
      }
    } else if (key === 'scoreCalibrationEligible'
      || key === 'conservativeTailResetApplied') {
      if (typeof nested === 'boolean') projected[key]=nested;
    } else if (Object.hasOwn(CALIBRATION_FEATURE_RANGES, key)) {
      assignProjected(projected, key, projectedNumberOrNull(nested, CALIBRATION_FEATURE_RANGES[key]));
    } else assignProjected(projected, key, projectedTextOrNull(nested, 128));
  }
  return projected;
}

function projectLegacyCurrentSnapshot(value) {
  if (!isRecord(value)) return undefined;
  const projected = {};
  for (const key of WEATHER_CURRENT_KEYS) {
    const nested = value[key];
    if (Object.hasOwn(SNAPSHOT_CURRENT_RANGES, key)) {
      assignProjected(projected, key, projectedNumberOrNull(nested, SNAPSHOT_CURRENT_RANGES[key]));
    } else assignProjected(projected, key, projectedTextOrNull(nested, 160));
  }
  return projected;
}

function projectLegacyScoreSnapshot(value) {
  if (!isRecord(value)) return undefined;
  const projected = {};
  assignProjected(projected, 'baseScore', projectedNumberOrNull(value.baseScore, [0, 100]));
  assignProjected(projected, 'finalScore', projectedNumberOrNull(value.finalScore, [0, 100]));
  assignProjected(projected, 'level', projectedTextOrNull(value.level, 40));
  return projected;
}

function projectLegacyPredictionSnapshot(value) {
  if (!isRecord(value)) return undefined;
  const projected = {};
  assignProjected(projected, 'probability', projectedNumberOrNull(value.probability, [0, 1]));
  assignProjected(projected, 'confidence', projectedNumberOrNull(value.confidence, [0, 1]));
  assignProjected(projected, 'modelVersion', projectedTextOrNull(value.modelVersion, 128));
  return projected;
}

function projectLegacyMatchedRuleIds(value) {
  const sources = [];
  if (Array.isArray(value.matchedRuleIds)) sources.push(...value.matchedRuleIds);
  if (Array.isArray(value.matchedRules)) sources.push(...value.matchedRules.map(rule => {
    if (typeof rule === 'string') return rule;
    if (!isRecord(rule)) return null;
    return rule.id ?? rule.ruleId ?? null;
  }));
  if (!Array.isArray(value.matchedRuleIds) && !Array.isArray(value.matchedRules)) return undefined;
  return [...new Set(sources.filter(item => typeof item === 'string' && item.length <= 120))].slice(0, 40);
}

// Schema-1 observations predate the bounded nested contract. Preserve only the
// documented public snapshot scalars and derive IDs from the old matchedRules
// objects. Unknown nested values are deliberately discarded before storage.
export function projectLegacyWeatherSnapshot(value) {
  if (!isRecord(value)) return undefined;
  const projected = {};
  if (value.schemaVersion === null
    || (Number.isSafeInteger(value.schemaVersion) && [2, 3, 4, 5].includes(value.schemaVersion))) {
    projected.schemaVersion = value.schemaVersion;
  }
  for (const key of [
    'capturedAt', 'sourceGeneratedAt', 'forecastTime', 'provider',
    'forecastSnapshotId', 'forecastIssuedAt', 'forecastValidAt', 'reportSource',
    'selectedAt', 'historicalSnapshotStatus',
  ]) assignProjected(projected, key, projectedTextOrNull(value[key], 200));
  assignProjected(projected, 'current', projectLegacyCurrentSnapshot(value.current));
  assignProjected(projected, 'score', projectLegacyScoreSnapshot(value.score));
  assignProjected(projected, 'prediction', projectLegacyPredictionSnapshot(value.prediction));
  assignProjected(projected, 'matchedRuleIds', projectLegacyMatchedRuleIds(value));
  assignProjected(projected, 'calibrationFeatures', projectLegacyCalibrationFeatures(value.calibrationFeatures));
  return projected;
}

export function projectLegacyExternalTripPayload(payload) {
  if (!isRecord(payload) || Number(payload.schema_version ?? 1) !== 1) return payload;
  const hasWeatherSnapshot = Object.hasOwn(payload, 'weather_snapshot');
  const hasCalibrationFeatures = Object.hasOwn(payload, 'calibration_features');
  if (!hasWeatherSnapshot && !hasCalibrationFeatures) return payload;
  const projected = { ...payload };
  if (hasWeatherSnapshot) {
    const projectedSnapshot = projectLegacyWeatherSnapshot(payload.weather_snapshot);
    if (projectedSnapshot === undefined) delete projected.weather_snapshot;
    else projected.weather_snapshot = projectedSnapshot;
  }
  if (hasCalibrationFeatures) {
    const projectedFeatures = projectLegacyCalibrationFeatures(payload.calibration_features);
    if (projectedFeatures === undefined) delete projected.calibration_features;
    else projected.calibration_features = projectedFeatures;
  }
  return projected;
}

function compactReplayProjection(value, { keepEmptyRecord = false } = {}) {
  if (value === null || value === undefined) return undefined;
  if (!isRecord(value)) return value;
  const compacted = {};
  for (const [key, nested] of Object.entries(value)) {
    const projected = compactReplayProjection(nested);
    if (projected !== undefined) compacted[key] = projected;
  }
  return keepEmptyRecord || Object.keys(compacted).length > 0 ? compacted : undefined;
}

// The bounded PostgREST leaf projection never receives JSON null leaves. Old
// D1 rows were produced from the complete 4.0.310 JSON documents and can still
// contain those nulls plus fields that the privacy projection now discards.
// Reproduce only that exact, documented projection for idempotency comparison;
// never mutate the stored row or weaken the normal live-payload boundary.
function projectStoredLegacyReplayPayload(payload) {
  const schemaVersion = Number(payload.schema_version ?? 1);
  if (schemaVersion === 2) {
    // Schema-v2 was already a bounded public contract. Validate its original
    // key/value shape before null compaction so an unknown null-valued alias
    // cannot disappear and become an accepted replay difference.
    assertStoredExternalTripContract(payload);
  }
  const projected = { ...payload };
  if (Object.hasOwn(payload, 'weather_snapshot')) {
    const sourceSnapshot = schemaVersion === 1
      ? projectLegacyWeatherSnapshot(payload.weather_snapshot)
      : payload.weather_snapshot;
    const snapshot = compactReplayProjection(
      sourceSnapshot,
      { keepEmptyRecord: true },
    );
    if (snapshot === undefined) delete projected.weather_snapshot;
    else projected.weather_snapshot = snapshot;
  }
  if (Object.hasOwn(payload, 'calibration_features')) {
    const sourceFeatures = schemaVersion === 1
      ? projectLegacyCalibrationFeatures(payload.calibration_features)
      : payload.calibration_features;
    const features = compactReplayProjection(sourceFeatures);
    if (features === undefined) delete projected.calibration_features;
    else projected.calibration_features = features;
  }
  return projected;
}

export function assertStoredExternalTripContract(payload) {
  if (!isRecord(payload)) throw new Error('TRIP_PAYLOAD_REQUIRED');
  if (![2, 3].includes(Number(payload.schema_version ?? 1))) return true;
  assertNoDirectIdentity(payload);
  assertNoPrivateLocation(payload);
  if (Object.keys(payload).some(key => !STORED_EXTERNAL_TRIP_FIELD_NAMES.has(key))) {
    throw new Error('TRIP_PAYLOAD_FIELDS_INVALID');
  }
  assertExternalTripNestedContract(payload);
  return true;
}

function assertCalibrationFeatureContract(value, exact = false) {
  if (value === null || value === undefined) {
    if (exact) throw new Error('TRIP_CALIBRATION_FEATURES_INVALID');
    return;
  }
  if (exact) assertExactRecord(value, CALIBRATION_FEATURE_KEYS, 'TRIP_CALIBRATION_FEATURES_INVALID');
  else assertAllowedRecord(value, CALIBRATION_FEATURE_KEYS, 'TRIP_CALIBRATION_FEATURES_INVALID');
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'reasonCodes' || key === 'historyReasonCodes') {
      if (!Array.isArray(nested) || nested.length > 12
        || nested.some(item => typeof item !== 'string' || item.length > 128)) {
        throw new Error('TRIP_CALIBRATION_FEATURES_INVALID');
      }
    } else if (key === 'scoreCalibrationEligible'
      || key === 'conservativeTailResetApplied') {
      if(typeof nested!=='boolean')throw new Error('TRIP_CALIBRATION_FEATURES_INVALID');
    } else if (Object.hasOwn(CALIBRATION_FEATURE_RANGES, key)) {
      assertBoundedNumberOrNull(nested, CALIBRATION_FEATURE_RANGES[key], 'TRIP_CALIBRATION_FEATURES_INVALID');
    } else assertBoundedTextOrNull(nested, 128, 'TRIP_CALIBRATION_FEATURES_INVALID');
  }
  if (exact && (CALIBRATION_REQUIRED_TEXT_KEYS.some(key => (
    typeof value[key] !== 'string' || !ID_PATTERN.test(value[key])
  ))
    || !SHA256_PATTERN.test(value.modelContractSha256)
    || !SHA256_PATTERN.test(value.modelBundleSha256)
    || CALIBRATION_REQUIRED_SCORE_KEYS.some(key => (
      typeof value[key] !== 'number' || !Number.isFinite(value[key])
    ))
    || !Number.isInteger(value.totalScore)
    || value.reasonCodes.some(code => !ID_PATTERN.test(code)))) {
    throw new Error('TRIP_CALIBRATION_FEATURES_INVALID');
  }
  if(exact){
    const historyReasons=value.historyReasonCodes;
    const boundsValid=value.totalScore===value.scoreBoundLower
      &&value.scoreBoundLower<=value.scoreBoundUpper
      &&value.scoreBoundRawLower<=value.scoreBoundRawUpper
      &&Math.abs(value.scoreBoundModelUncertaintyPoints
        -(value.scoreBoundUpper-value.scoreBoundLower))<=1e-9;
    const reasonsValid=Array.isArray(historyReasons)
      &&new Set(historyReasons).size===historyReasons.length
      &&historyReasons.every(code=>/^[A-Z][A-Z0-9_]{0,127}$/.test(code));
    const candidateGRollback=value.modelVersion===CANDIDATE_G_ROLLBACK_MODEL_ID;
    const full=value.scoreQuality==='FULL_HISTORY'
      &&value.scoreCalibrationEligible===!candidateGRollback
      &&value.historyCoverageHours===48&&historyReasons.length===0
      &&value.scoreBoundLower===value.scoreBoundUpper
      &&value.scoreBoundRawLower===value.scoreBoundRawUpper
      &&['EXACT_POINT_SCORE','CONSERVATIVE_TAIL_RESET_POINT_SCORE']
        .includes(value.scoreSemantics)
      &&value.conservativeTailResetApplied
        ===(value.scoreSemantics==='CONSERVATIVE_TAIL_RESET_POINT_SCORE');
    const exactCandidateGRollback=!candidateGRollback
      ||(value.scoreSemantics==='EXACT_POINT_SCORE'
        &&value.conservativeTailResetApplied===false);
    const incomplete=value.scoreQuality==='HISTORY_INCOMPLETE'
      &&value.scoreCalibrationEligible===false
      &&historyReasons.length>0
      &&value.scoreSemantics==='CONSERVATIVE_ENCLOSING_LOWER_BOUND'
      &&typeof value.conservativeTailResetApplied==='boolean';
    if(!boundsValid||!reasonsValid||!exactCandidateGRollback||(!full&&!incomplete)){
      throw new Error('TRIP_CALIBRATION_SCORE_QUALITY_INVALID');
    }
  }
}

function assertFlatSnapshotRecord(value, allowedKeys) {
  assertAllowedRecord(value, allowedKeys, 'TRIP_WEATHER_SNAPSHOT_INVALID');
  for (const nested of Object.values(value)) {
    assertScalarOrNull(nested, 'TRIP_WEATHER_SNAPSHOT_INVALID');
  }
}

function assertWeatherSnapshotContract(value, allowLegacySchemaTwo = false, exactCurrent = false) {
  if (value === null || value === undefined) {
    if (exactCurrent) throw new Error('TRIP_WEATHER_SNAPSHOT_INVALID');
    return;
  }
  if (exactCurrent) {
    assertExactRecord(value, new Set([
      'schemaVersion', 'capturedAt', 'forecastSnapshotId', 'forecastIssuedAt',
      'forecastValidAt', 'calibrationFeatures',
    ]), 'TRIP_WEATHER_SNAPSHOT_INVALID');
  } else assertAllowedRecord(value, WEATHER_SNAPSHOT_KEYS, 'TRIP_WEATHER_SNAPSHOT_INVALID');
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'current') {
      assertFlatSnapshotRecord(nested, WEATHER_CURRENT_KEYS);
      for (const [currentKey, currentValue] of Object.entries(nested)) {
        if (Object.hasOwn(SNAPSHOT_CURRENT_RANGES, currentKey)) {
          assertBoundedNumberOrNull(currentValue, SNAPSHOT_CURRENT_RANGES[currentKey], 'TRIP_WEATHER_SNAPSHOT_INVALID');
        } else assertBoundedTextOrNull(currentValue, 160, 'TRIP_WEATHER_SNAPSHOT_INVALID');
      }
    }
    else if (key === 'score') {
      assertFlatSnapshotRecord(nested, WEATHER_SCORE_KEYS);
      assertBoundedNumberOrNull(nested.baseScore, [0, 100], 'TRIP_WEATHER_SNAPSHOT_INVALID');
      assertBoundedNumberOrNull(nested.finalScore, [0, 100], 'TRIP_WEATHER_SNAPSHOT_INVALID');
      assertBoundedTextOrNull(nested.level, 40, 'TRIP_WEATHER_SNAPSHOT_INVALID');
    }
    else if (key === 'prediction') {
      assertFlatSnapshotRecord(nested, WEATHER_PREDICTION_KEYS);
      assertBoundedNumberOrNull(nested.probability, [0, 1], 'TRIP_WEATHER_SNAPSHOT_INVALID');
      assertBoundedNumberOrNull(nested.confidence, [0, 1], 'TRIP_WEATHER_SNAPSHOT_INVALID');
      assertBoundedTextOrNull(nested.modelVersion, 128, 'TRIP_WEATHER_SNAPSHOT_INVALID');
    }
    else if (key === 'calibrationFeatures') assertCalibrationFeatureContract(nested, exactCurrent);
    else if (key === 'matchedRuleIds') {
      if (!Array.isArray(nested) || nested.length > 40
        || nested.some(item => typeof item !== 'string' || item.length > 120)) {
        throw new Error('TRIP_WEATHER_SNAPSHOT_INVALID');
      }
    } else if (key === 'schemaVersion') {
      const allowedVersions = allowLegacySchemaTwo ? [2, 3, 4, 5] : [3, 4, 5];
      if (nested !== null && (!Number.isSafeInteger(nested) || !allowedVersions.includes(nested))) {
        throw new Error('TRIP_WEATHER_SNAPSHOT_INVALID');
      }
    } else assertBoundedTextOrNull(nested, 200, 'TRIP_WEATHER_SNAPSHOT_INVALID');
  }
}

export function assertExternalTripNestedContract(payload) {
  if (!isRecord(payload)) throw new Error('TRIP_PAYLOAD_REQUIRED');
  const schemaVersion = Number(payload.schema_version ?? 1);
  assertCalibrationFeatureContract(payload.calibration_features, schemaVersion === 3);
  assertWeatherSnapshotContract(payload.weather_snapshot, schemaVersion === 1, schemaVersion === 3);
  if (schemaVersion === 3) {
    const snapshot = payload.weather_snapshot;
    if (snapshot.schemaVersion !== 4
      || typeof snapshot.forecastSnapshotId !== 'string'
      || snapshot.forecastSnapshotId !== payload.forecast_snapshot_id
      || !['capturedAt', 'forecastIssuedAt', 'forecastValidAt'].every(key => (
        typeof snapshot[key] === 'string' && Number.isFinite(Date.parse(snapshot[key]))
      ))
      || snapshot.capturedAt !== payload.forecast_captured_at
      || snapshot.forecastIssuedAt !== payload.forecast_issued_at
      || snapshot.forecastValidAt !== payload.forecast_valid_at
      || canonicalJson(snapshot.calibrationFeatures) !== canonicalJson(payload.calibration_features)) {
      throw new Error('TRIP_WEATHER_SNAPSHOT_INVALID');
    }
  }
  return true;
}

function attestedTripRelease(value) {
  const match = String(value || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const [major, minor, patch] = match.slice(1).map(Number);
  return major > 4 || (major === 4 && (minor > 0 || (minor === 0 && patch >= 311)));
}

function appendUnattestedReason(features) {
  const source = isRecord(features) ? features : {};
  const reasons = Array.isArray(source.reasonCodes)
    ? source.reasonCodes.filter(reason => reason !== UNATTESTED_RAVSCORE_QUALITY_FLAG).slice(0, 11)
    : [];
  return { ...source, reasonCodes: [...reasons, UNATTESTED_RAVSCORE_QUALITY_FLAG] };
}

export function normalizeExternalTripQualityBinding(payload) {
  if (!isRecord(payload) || Number(payload.schema_version) !== 2) return payload;
  const flags = payload.data_quality_flags;
  if (flags !== undefined && !Array.isArray(flags)) throw new Error('TRIP_DATA_QUALITY_FLAGS_INVALID');
  const appVersion = payload.calibration_features?.appVersion;
  if (Array.isArray(flags) && (flags.length > 0 || attestedTripRelease(appVersion))) return payload;
  const calibrationFeatures = appendUnattestedReason(payload.calibration_features);
  const weatherSnapshot = isRecord(payload.weather_snapshot)
    ? { ...payload.weather_snapshot, calibrationFeatures }
    : payload.weather_snapshot;
  return {
    ...payload,
    calibration_eligible: false,
    data_quality_flags: [UNATTESTED_RAVSCORE_QUALITY_FLAG],
    calibration_features: calibrationFeatures,
    weather_snapshot: weatherSnapshot,
  };
}

export function assertExternalTripQualityBinding(payload) {
  if (!isRecord(payload) || ![2, 3].includes(Number(payload.schema_version))) return;
  const schemaVersion = Number(payload.schema_version);
  const combinations = schemaVersion === 3
    ? TRIP_QUALITY_FLAG_COMBINATIONS
    : LEGACY_TRIP_QUALITY_FLAG_COMBINATIONS;
  const flags = payload.data_quality_flags;
  if (!Array.isArray(flags)
    || !combinations.has(JSON.stringify(flags))) {
    throw new Error('TRIP_DATA_QUALITY_FLAGS_INVALID');
  }
  const reasonCodes = payload.calibration_features?.reasonCodes;
  if (!Array.isArray(reasonCodes)
    || reasonCodes.some(code => typeof code !== 'string')) throw new Error('TRIP_QUALITY_REASON_CODES_INVALID');
  const qualityReasons = reasonCodes.filter(code => TRIP_NON_CALIBRATION_QUALITY_FLAGS.includes(code));
  if (JSON.stringify(qualityReasons) !== JSON.stringify(flags)) {
    throw new Error('TRIP_QUALITY_REASON_BINDING_INVALID');
  }
  const features=payload.calibration_features;
  const globalWarmupReasonCount = reasonCodes.filter(reason =>
    reason === GLOBAL_WARMUP_CALIBRATION_LOCK_REASON).length;
  const sameForecastContext = payload.actual_zone_id === payload.forecast_zone_id
    && payload.actual_coastal_part_id === payload.forecast_coastal_part_id;
  if(schemaVersion===3){
    const historyFlag=flags.includes(HISTORY_INCOMPLETE_RAVSCORE_QUALITY_FLAG);
    if((features?.scoreQuality==='HISTORY_INCOMPLETE')!==historyFlag
      ||(historyFlag&&features?.scoreCalibrationEligible!==false)
      ||(!historyFlag&&features?.scoreQuality!=='FULL_HISTORY')){
      throw new Error('TRIP_SCORE_QUALITY_FLAG_BINDING_INVALID');
    }
    if(globalWarmupReasonCount > 1
      ||(globalWarmupReasonCount === 1 && (historyFlag
        ||features?.scoreCalibrationEligible!==true
        ||payload.calibration_eligible!==false))){
      throw new Error('TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID');
    }
    if(!historyFlag
      &&features?.scoreCalibrationEligible===true
      &&flags.length===0
      &&payload.calibration_eligible
        !==(globalWarmupReasonCount===1?false:sameForecastContext)){
      throw new Error('TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID');
    }
  }
  const eligibilityValid = schemaVersion === 3
    ? typeof payload.calibration_eligible === 'boolean'
      && (flags.length === 0 || payload.calibration_eligible === false)
      && (payload.calibration_eligible !== true
        || features?.scoreCalibrationEligible === true)
    : payload.calibration_eligible === (sameForecastContext && flags.length === 0);
  if (!eligibilityValid) {
    throw new Error('TRIP_CALIBRATION_ELIGIBILITY_INVALID');
  }
}

function utf8(value) {
  return new TextEncoder().encode(String(value));
}

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = typeof btoa === 'function'
    ? btoa(binary)
    : globalThis.Buffer.from(bytes).toString('base64');
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacHex(secret, value) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('TRIP_GATEWAY_SECRET_INVALID');
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, utf8(value));
  return bytesToHex(new Uint8Array(signature));
}

export async function sha256Hex(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(value))));
}

export async function externalOwnerSubject({ userId = null, anonymousId = null, secret }) {
  const kind = userId ? 'user' : 'anonymous';
  const rawId = userId || anonymousId;
  if (typeof rawId !== 'string' || !rawId.trim()) throw new Error('TRIP_OWNER_REQUIRED');
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('TRIP_PSEUDONYM_SECRET_INVALID');
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, utf8(`ravradar-trip-owner:v1:${kind}:${rawId}`));
  return { kind, subject: `${OWNER_PREFIX[kind]}${bytesToBase64Url(new Uint8Array(signature))}` };
}

function normalizedKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function assertNoDirectIdentity(value, depth = 0) {
  if (depth > 8) throw new Error('TRIP_PAYLOAD_TOO_DEEP');
  if (Array.isArray(value)) {
    value.forEach(entry => assertNoDirectIdentity(entry, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (DIRECT_IDENTITY_KEYS.has(normalizedKey(key))) throw new Error('DIRECT_IDENTITY_NOT_ALLOWED');
    assertNoDirectIdentity(nested, depth + 1);
  }
}

export function assertNoPrivateLocation(value, depth = 0) {
  if (depth > 8) throw new Error('TRIP_PAYLOAD_TOO_DEEP');
  if (Array.isArray(value)) {
    value.forEach(entry => assertNoPrivateLocation(entry, depth + 1));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    if (PRIVATE_LOCATION_KEY_PATTERN.test(String(key)) && nested !== null) {
      throw new Error('PRECISE_LOCATION_NOT_ALLOWED');
    }
    assertNoPrivateLocation(nested, depth + 1);
  }
}

export function externalTripPayload(payload) {
  if (!isRecord(payload)) throw new Error('TRIP_PAYLOAD_REQUIRED');
  const cloned = typeof structuredClone === 'function'
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload));
  const source = projectLegacyExternalTripPayload(cloned);
  const normalized = normalizeExternalTripQualityBinding(source);
  const schemaVersion = Number(normalized.schema_version ?? 1);
  if (schemaVersion === 3) assertExternalTripQualityBinding(normalized);
  const clone = schemaVersion === 3
    ? { ...normalized, calibration_eligible: false, gps: null }
    : normalized;
  const external = {};
  for (const key of TRIP_INPUT_FIELD_NAMES) {
    if (key === 'user_id' || key === 'anonymous_id' || key === 'gps') continue;
    const value = clone[key];
    if (value === null || value === undefined) continue;
    external[key] = value;
  }
  external.schema_version = schemaVersion;
  if (![1, 2, 3].includes(external.schema_version)) throw new Error('TRIP_SCHEMA_VERSION_INVALID');
  assertNoDirectIdentity(external);
  assertNoPrivateLocation(external);
  assertExternalTripNestedContract(external);
  if (schemaVersion !== 3) assertExternalTripQualityBinding(external);
  return external;
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalValue(value[key])]));
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function tripPayloadDigestValue(payload) {
  const value = isRecord(payload) ? { ...payload } : payload;
  if (isRecord(value)) delete value.submitted_at;
  return value;
}

export function isLegacyUnattestedTripReplay(storedPayload, incomingPayload, {
  allowMissingDerivedMatchedRuleIds = false,
} = {}) {
  if (!isRecord(storedPayload) || !isRecord(incomingPayload)
    || Number(storedPayload.schema_version) !== 2
    || Number(incomingPayload.schema_version) !== 2) return false;
  const storedFlags = storedPayload.data_quality_flags;
  const legacyFlags = storedFlags === undefined
    || (Array.isArray(storedFlags) && storedFlags.length === 0);
  if (!legacyFlags || attestedTripRelease(storedPayload.calibration_features?.appVersion)) return false;
  let normalized;
  try {
    normalized = externalTripPayload(projectStoredLegacyReplayPayload(storedPayload));
  } catch {
    return false;
  }
  if (canonicalJson(tripPayloadDigestValue(normalized))
      === canonicalJson(tripPayloadDigestValue(storedPayload))) return false;
  if (!Array.isArray(incomingPayload.data_quality_flags)
    || canonicalJson(incomingPayload.data_quality_flags)
      !== canonicalJson([UNATTESTED_RAVSCORE_QUALITY_FLAG])
    || incomingPayload.calibration_eligible !== false) return false;
  if (canonicalJson(tripPayloadDigestValue(normalized))
      === canonicalJson(tripPayloadDigestValue(incomingPayload))) return true;
  return allowMissingDerivedMatchedRuleIds
    && isLegacyMatchedRulesOnlyProjectionReplay(storedPayload, normalized, incomingPayload);
}

function isLegacyMatchedRulesOnlyProjectionReplay(storedPayload, projectedPayload, incomingPayload) {
  const storedSnapshot = storedPayload.weather_snapshot;
  const projectedSnapshot = projectedPayload.weather_snapshot;
  const incomingSnapshot = incomingPayload.weather_snapshot;
  if (!isRecord(storedSnapshot)
    || !Array.isArray(storedSnapshot.matchedRules)
    || Object.hasOwn(storedSnapshot, 'matchedRuleIds')
    || !isRecord(projectedSnapshot)
    || !Array.isArray(projectedSnapshot.matchedRuleIds)
    || !isRecord(incomingSnapshot)
    || Object.hasOwn(incomingSnapshot, 'matchedRuleIds')) return false;
  const withoutDerivedRuleIds = {
    ...projectedPayload,
    weather_snapshot: { ...projectedSnapshot },
  };
  delete withoutDerivedRuleIds.weather_snapshot.matchedRuleIds;
  return canonicalJson(tripPayloadDigestValue(withoutDerivedRuleIds))
    === canonicalJson(tripPayloadDigestValue(incomingPayload));
}

export function isLegacyProjectedTripReplay(storedPayload, incomingPayload, {
  allowMissingDerivedMatchedRuleIds = false,
} = {}) {
  if (!isRecord(storedPayload) || !isRecord(incomingPayload)
    || Number(storedPayload.schema_version ?? 1) !== 1
    || Number(incomingPayload.schema_version ?? 1) !== 1) return false;
  let projected;
  try {
    projected = externalTripPayload(projectStoredLegacyReplayPayload(storedPayload));
  } catch {
    return false;
  }
  const storedDigest = canonicalJson(tripPayloadDigestValue(storedPayload));
  const projectedDigest = canonicalJson(tripPayloadDigestValue(projected));
  if (storedDigest === projectedDigest) return false;
  if (projectedDigest === canonicalJson(tripPayloadDigestValue(incomingPayload))) return true;
  return allowMissingDerivedMatchedRuleIds
    && isLegacyMatchedRulesOnlyProjectionReplay(storedPayload, projected, incomingPayload);
}

export function isLegacyCompatibleTripReplay(storedPayload, incomingPayload, options = {}) {
  return isLegacyProjectedTripReplay(storedPayload, incomingPayload, options)
    || isLegacyUnattestedTripReplay(storedPayload, incomingPayload, options);
}

export async function externalTripRecord({ owner, payload, source = 'live' }) {
  if (!owner || !['user', 'anonymous'].includes(owner.kind) || typeof owner.subject !== 'string') {
    throw new Error('TRIP_OWNER_INVALID');
  }
  if (!['live', 'supabase-migration'].includes(source)) throw new Error('TRIP_SOURCE_INVALID');
  const externalPayload = externalTripPayload(payload);
  const clientObservationId = externalPayload.client_observation_id;
  if (typeof clientObservationId !== 'string' || !clientObservationId) throw new Error('TRIP_CLIENT_ID_REQUIRED');
  if (typeof externalPayload.observed_at !== 'string' || typeof externalPayload.submitted_at !== 'string') {
    throw new Error('TRIP_TIMESTAMPS_REQUIRED');
  }
  const digestPayload = { ...externalPayload };
  delete digestPayload.submitted_at;
  return {
    storage_schema_version: 1,
    owner_subject: owner.subject,
    owner_kind: owner.kind,
    trip_id: externalPayload.trip_id ?? null,
    client_observation_id: clientObservationId,
    observed_at: externalPayload.observed_at,
    submitted_at: externalPayload.submitted_at,
    payload_json: canonicalJson(externalPayload),
    payload_sha256: await sha256Hex(canonicalJson(digestPayload)),
    source,
  };
}

export function normalizeCloudflareGatewayUrl(gatewayUrl) {
  if (typeof gatewayUrl !== 'string' || !gatewayUrl.trim()) throw new Error('TRIP_GATEWAY_URL_REQUIRED');
  const url = new URL(gatewayUrl.trim());
  if (
    url.protocol !== 'https:' || !url.hostname.endsWith(CLOUDFLARE_WORKER_SUFFIX) ||
    url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error('TRIP_GATEWAY_URL_INVALID');
  }
  return url.origin;
}

function timingSafeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function tripGatewaySignature({ secret, timestamp, method, pathname, bodyText = '' }) {
  const bodyDigest = await sha256Hex(bodyText);
  const canonical = `ravradar-trip-gateway:v1:${timestamp}:${String(method).toUpperCase()}:${pathname}:${bodyDigest}`;
  return hmacHex(secret, canonical);
}

export async function verifyTripGatewaySignature({ secret, timestamp, signature, method, pathname, bodyText = '', now = Date.now() }) {
  if (!/^\d{13}$/.test(String(timestamp || '')) || !/^[a-f0-9]{64}$/.test(String(signature || ''))) return false;
  if (Math.abs(Number(timestamp) - now) > 300_000) return false;
  const expected = await tripGatewaySignature({ secret, timestamp, method, pathname, bodyText });
  return timingSafeEqual(expected, signature);
}

async function callTripGateway({ gatewayUrl, sharedSecret, pathname, body, fetchImpl = fetch, now = Date.now() }) {
  const origin = normalizeCloudflareGatewayUrl(gatewayUrl);
  const bodyText = JSON.stringify(body);
  const timestamp = String(now);
  const signature = await tripGatewaySignature({
    secret: sharedSecret,
    timestamp,
    method: 'POST',
    pathname,
    bodyText,
  });
  const response = await fetchImpl(`${origin}${pathname}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RavRadar-Signature': signature,
      'X-RavRadar-Timestamp': timestamp,
    },
    body: bodyText,
  });
  if (!response?.ok) {
    let failure = {};
    if (response && typeof response.json === 'function') {
      failure = await response.json().catch(() => ({}));
    }
    let category = 'HTTP_ERROR';
    if (response?.status === 409 && failure?.error === 'TRIP_IDEMPOTENCY_CONFLICT') {
      category = 'IDEMPOTENCY_CONFLICT';
    } else if (response?.status === 400 && failure?.error === 'INVALID_REQUEST') {
      category = 'REQUEST_REJECTED';
    } else if (response?.status === 401 && failure?.error === 'UNAUTHORIZED') {
      category = 'AUTH';
    } else if (response?.status === 429) {
      category = 'RATE_LIMITED';
    } else if (Number(response?.status) >= 500) {
      category = 'UNAVAILABLE';
    }
    throw new Error(`TRIP_GATEWAY_UNAVAILABLE:${category}`);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  }
  if (!isRecord(result) || result.ok !== true) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result;
}

export async function storeCloudflareTrip({ gatewayUrl, sharedSecret, owner, payload, source = 'live', fetchImpl = fetch, now }) {
  const record = await externalTripRecord({ owner, payload, source });
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/store',
    body: { record },
    fetchImpl,
    now,
  });
  if (typeof result.duplicate !== 'boolean') throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return { stored: true, duplicate: result.duplicate };
}

export async function listCloudflareTrips({ gatewayUrl, sharedSecret, ownerSubject, limit = 100, fetchImpl = fetch, now }) {
  if (typeof ownerSubject !== 'string' || !ownerSubject) throw new Error('TRIP_OWNER_INVALID');
  const safeLimit = Math.max(1, Math.min(200, Math.round(Number(limit) || 100)));
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/list',
    body: { owner_subject: ownerSubject, limit: safeLimit },
    fetchImpl,
    now,
  });
  if (!Array.isArray(result.rows)) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result.rows.map(row => {
    assertNoDirectIdentity(row);
    return row;
  });
}

export async function countCloudflareTrips({ gatewayUrl, sharedSecret, fetchImpl = fetch, now }) {
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/count',
    body: {},
    fetchImpl,
    now,
  });
  if (!Number.isSafeInteger(result.trip_count) || result.trip_count < 0) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result.trip_count;
}

export async function deleteCloudflareTrips({ gatewayUrl, sharedSecret, ownerSubject, fetchImpl = fetch, now }) {
  if (typeof ownerSubject !== 'string' || !ownerSubject) throw new Error('TRIP_OWNER_INVALID');
  const result = await callTripGateway({
    gatewayUrl,
    sharedSecret,
    pathname: '/v1/trips/delete-owner',
    body: { owner_subject: ownerSubject },
    fetchImpl,
    now,
  });
  if (!Number.isSafeInteger(result.deleted) || result.deleted < 0) throw new Error('TRIP_GATEWAY_INVALID_RESPONSE');
  return result.deleted;
}
