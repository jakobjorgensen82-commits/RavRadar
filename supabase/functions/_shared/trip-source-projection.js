// Shared, deployment-safe projection for historical Supabase observations.
// Keep this module free of Node- and Deno-specific APIs: both the offline
// Supabase→D1 migration and the live Supabase idempotency readback import it.

export const SAFE_MIGRATION_PAYLOAD_COLUMNS = Object.freeze([
  'zone_id', 'zone_name', 'coast_type', 'observed_at', 'submitted_at', 'hunt_mode', 'result', 'grams',
  'trip_id', 'rav_score', 'score_level', 'ai_probability', 'ai_confidence', 'model_version',
  'wind_speed_mps', 'wind_direction_deg', 'wave_height_m', 'wave_period_s', 'water_level_cm',
  'current_speed_mps', 'current_direction_deg', 'water_temperature_c', 'client_observation_id',
  'schema_version', 'trip_started_at', 'trip_ended_at', 'search_minutes', 'search_coverage',
  'actual_zone_id', 'actual_coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id',
  'calibration_eligible', 'found', 'forecast_snapshot_id', 'forecast_issued_at', 'forecast_valid_at',
  'forecast_captured_at', 'data_quality_flags', 'forecast_target_at', 'report_accuracy',
]);

export const SAFE_MIGRATION_SOURCE_COLUMNS = Object.freeze([
  'id', 'user_id', 'anonymous_id', 'created_at',
  ...SAFE_MIGRATION_PAYLOAD_COLUMNS,
]);
export const SAFE_IDEMPOTENCY_SOURCE_COLUMNS = Object.freeze([
  'user_id', 'anonymous_id',
  ...SAFE_MIGRATION_PAYLOAD_COLUMNS,
]);

const CALIBRATION_FEATURE_PATHS = Object.freeze([
  'modelVersion', 'appVersion', 'totalScore', 'huntabilityScore', 'transportScore',
  'mobilisationScore', 'windSpeedMs', 'windDirectionDeg', 'waveHeightM',
  'wavePeriodS', 'waveDirectionDeg', 'currentSpeedMs', 'currentDirectionDeg',
  'waterLevelM', 'waterLevelTrendM3h', 'maxWaveHeight24hM',
  'hoursSinceEnergyPeak', 'sustainedOnshoreHours', 'reasonCodes',
].map(key => [key]));

const WEATHER_SNAPSHOT_PATHS = Object.freeze([
  ['schemaVersion'], ['capturedAt'], ['sourceGeneratedAt'], ['forecastTime'], ['provider'],
  ['forecastSnapshotId'], ['forecastIssuedAt'], ['forecastValidAt'], ['reportSource'],
  ['selectedAt'], ['historicalSnapshotStatus'],
  ...[
    'generatedAt', 'time', 'provider', 'providerLabel', 'windSpeedMps', 'windDirectionDeg',
    'waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'currentSpeedMps', 'currentDirectionDeg',
    'waterLevelCm', 'waterLevelTrendCm3h', 'waterTemperatureC',
  ].map(key => ['current', key]),
  ...['baseScore', 'finalScore', 'level'].map(key => ['score', key]),
  ...['probability', 'confidence', 'modelVersion'].map(key => ['prediction', key]),
  ['matchedRuleIds'],
  ...CALIBRATION_FEATURE_PATHS.map(path => ['calibrationFeatures', ...path]),
]);

function leafProjection(column, alias, targetRoot, path) {
  return Object.freeze({
    alias,
    column,
    path: Object.freeze([...path]),
    target: Object.freeze([targetRoot, ...path]),
  });
}

export const SUPABASE_OBSERVATION_LEAF_PROJECTIONS = Object.freeze([
  ...WEATHER_SNAPSHOT_PATHS.map((path, index) =>
    leafProjection('weather_snapshot', `w${index}`, 'weather_snapshot', path)),
  ...CALIBRATION_FEATURE_PATHS.map((path, index) =>
    leafProjection('calibration_features', `c${index}`, 'calibration_features', path)),
]);

function postgrestLeaf(projection) {
  return `${projection.alias}:${projection.column}${projection.path.map(key => `->${key}`).join('')}`;
}

export const SUPABASE_OBSERVATION_SELECT = Object.freeze([
  ...SAFE_MIGRATION_SOURCE_COLUMNS,
  ...SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(postgrestLeaf),
].join(','));
export const SUPABASE_IDEMPOTENCY_SELECT = Object.freeze([
  ...SAFE_IDEMPOTENCY_SOURCE_COLUMNS,
  ...SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(postgrestLeaf),
].join(','));

const SAFE_MIGRATION_RESPONSE_KEYS = new Set([
  ...SAFE_MIGRATION_SOURCE_COLUMNS,
  ...SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(projection => projection.alias),
]);
const SAFE_IDEMPOTENCY_RESPONSE_KEYS = new Set([
  ...SAFE_IDEMPOTENCY_SOURCE_COLUMNS,
  ...SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(projection => projection.alias),
]);

function setProjectedLeaf(target, path, value) {
  if (value === null || value === undefined) return false;
  let current = target;
  for (const key of path.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== 'object' || Array.isArray(current[key])) current[key] = {};
    current = current[key];
  }
  current[path.at(-1)] = value;
  return true;
}

export function projectSupabaseObservationRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('Supabase returnerede en ugyldig migrationsrække.');
  }
  const payload = {};
  for (const column of SAFE_MIGRATION_PAYLOAD_COLUMNS) {
    const value = row[column];
    if (value !== null && value !== undefined) payload[column] = value;
  }

  // weather_snapshot is NOT NULL in the source schema. Rebuild even an empty
  // object so legacy idempotency remains stable without ever selecting the
  // original free-form JSON document.
  payload.weather_snapshot = {};
  const calibrationFeatures = {};
  let hasCalibrationFeatures = false;
  for (const projection of SUPABASE_OBSERVATION_LEAF_PROJECTIONS) {
    const value = row[projection.alias];
    if (projection.target[0] === 'weather_snapshot') {
      setProjectedLeaf(payload, projection.target, value);
    } else if (setProjectedLeaf({ calibration_features: calibrationFeatures }, projection.target, value)) {
      hasCalibrationFeatures = true;
    }
  }
  if (hasCalibrationFeatures) payload.calibration_features = calibrationFeatures;
  return payload;
}

export function assertProjectedSourceRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)
    || Object.keys(row).some(key => !SAFE_MIGRATION_RESPONSE_KEYS.has(key))) {
    throw new Error('Supabase returnerede en uventet migrationsprojektion.');
  }
}

export function assertIdempotencySourceRow(row) {
  if (!row || typeof row !== 'object' || Array.isArray(row)
    || Object.keys(row).some(key => !SAFE_IDEMPOTENCY_RESPONSE_KEYS.has(key))) {
    throw new Error('Supabase returnerede en uventet idempotensprojektion.');
  }
}
