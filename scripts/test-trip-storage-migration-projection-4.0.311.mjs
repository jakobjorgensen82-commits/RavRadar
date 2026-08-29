import assert from 'node:assert/strict';

import {
  SAFE_MIGRATION_PAYLOAD_COLUMNS,
  SUPABASE_OBSERVATION_LEAF_PROJECTIONS,
  SUPABASE_OBSERVATION_SELECT,
  fetchSupabaseObservations,
  migrateRow,
  projectSupabaseObservationRow,
  runMigration,
} from './migrate-trip-storage-to-cloudflare.mjs';

const expectedPayloadColumns = [
  'zone_id', 'zone_name', 'coast_type', 'observed_at', 'submitted_at', 'hunt_mode', 'result', 'grams',
  'trip_id', 'rav_score', 'score_level', 'ai_probability', 'ai_confidence', 'model_version',
  'wind_speed_mps', 'wind_direction_deg', 'wave_height_m', 'wave_period_s', 'water_level_cm',
  'current_speed_mps', 'current_direction_deg', 'water_temperature_c', 'client_observation_id',
  'schema_version', 'trip_started_at', 'trip_ended_at', 'search_minutes', 'search_coverage',
  'actual_zone_id', 'actual_coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id',
  'calibration_eligible', 'found', 'forecast_snapshot_id', 'forecast_issued_at', 'forecast_valid_at',
  'forecast_captured_at', 'data_quality_flags', 'forecast_target_at', 'report_accuracy',
];
assert.deepEqual(SAFE_MIGRATION_PAYLOAD_COLUMNS, expectedPayloadColumns);

const calibrationPaths = [
  'modelVersion', 'appVersion', 'totalScore', 'huntabilityScore', 'transportScore',
  'mobilisationScore', 'windSpeedMs', 'windDirectionDeg', 'waveHeightM',
  'wavePeriodS', 'waveDirectionDeg', 'currentSpeedMs', 'currentDirectionDeg',
  'waterLevelM', 'waterLevelTrendM3h', 'maxWaveHeight24hM',
  'hoursSinceEnergyPeak', 'sustainedOnshoreHours', 'reasonCodes',
];
const weatherPaths = [
  'schemaVersion', 'capturedAt', 'sourceGeneratedAt', 'forecastTime', 'provider',
  'forecastSnapshotId', 'forecastIssuedAt', 'forecastValidAt', 'reportSource',
  'selectedAt', 'historicalSnapshotStatus',
  ...[
    'generatedAt', 'time', 'provider', 'providerLabel', 'windSpeedMps', 'windDirectionDeg',
    'waveHeightM', 'wavePeriodS', 'waveDirectionDeg', 'currentSpeedMps', 'currentDirectionDeg',
    'waterLevelCm', 'waterLevelTrendCm3h', 'waterTemperatureC',
  ].map(key => `current.${key}`),
  ...['baseScore', 'finalScore', 'level'].map(key => `score.${key}`),
  ...['probability', 'confidence', 'modelVersion'].map(key => `prediction.${key}`),
  'matchedRuleIds',
  ...calibrationPaths.map(key => `calibrationFeatures.${key}`),
];
assert.deepEqual(
  SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(projection =>
    `${projection.column}:${projection.path.join('.')}`),
  [
    ...weatherPaths.map(path => `weather_snapshot:${path}`),
    ...calibrationPaths.map(path => `calibration_features:${path}`),
  ],
);

const selectParts = SUPABASE_OBSERVATION_SELECT.split(',');
assert.deepEqual(
  selectParts.filter(part => !part.includes(':')),
  ['id', 'user_id', 'anonymous_id', 'created_at', ...expectedPayloadColumns],
);
assert.ok(!SUPABASE_OBSERVATION_SELECT.includes('*'));
for (const forbidden of [
  'gps', 'latitude', 'longitude', 'coordinates', 'eastward', 'northward',
  'matchedRules', 'notes', 'comment', 'description', 'image', 'photo', 'attachment',
]) {
  assert.ok(!selectParts.some(part => part === forbidden || part.startsWith(`${forbidden}:`)),
    `Supabase-projektionen må ikke hente ${forbidden}.`);
  assert.ok(!SUPABASE_OBSERVATION_SELECT.toLowerCase().includes(`->${forbidden.toLowerCase()}`),
    `Supabase-bladprojektionen må ikke hente nested ${forbidden}.`);
}
assert.ok(!selectParts.includes('weather_snapshot'));
assert.ok(!selectParts.includes('calibration_features'));
const encodedSelectUrl = new URL('https://example.supabase.co/rest/v1/observations');
encodedSelectUrl.searchParams.set('select', SUPABASE_OBSERVATION_SELECT);
encodedSelectUrl.searchParams.set('order', 'id.asc');
assert.ok(encodedSelectUrl.href.length < 8_000,
  `Den eksplicitte PostgREST-projektion er for lang til en konservativ request-line-grænse (${encodedSelectUrl.href.length}).`);
assert.ok(selectParts.includes('user_id') && selectParts.includes('anonymous_id'));
assert.ok(SAFE_MIGRATION_PAYLOAD_COLUMNS.includes('client_observation_id'));
assert.ok(SUPABASE_OBSERVATION_LEAF_PROJECTIONS.every(projection =>
  selectParts.includes(`${projection.alias}:${projection.column}${projection.path.map(key => `->${key}`).join('')}`)
));

function alias(column, ...path) {
  const projection = SUPABASE_OBSERVATION_LEAF_PROJECTIONS.find(candidate =>
    candidate.column === column && JSON.stringify(candidate.path) === JSON.stringify(path));
  assert.ok(projection, `Mangler bladprojektion for ${column}.${path.join('.')}`);
  return projection.alias;
}

const sourceRow = {
  id: 41,
  user_id: '11111111-1111-4111-8111-111111111111',
  anonymous_id: '22222222-2222-4222-8222-222222222222',
  client_observation_id: '33333333-3333-4333-8333-333333333333',
  trip_id: '44444444-4444-4444-8444-444444444444',
  schema_version: 2,
  zone_id: 'DK-B01-01',
  zone_name: 'Dokumenteret zone',
  observed_at: '2026-08-29T08:30:00.000Z',
  submitted_at: '2026-08-29T09:00:00.000Z',
  hunt_mode: 'beach',
  result: 'none',
  found: false,
  calibration_eligible: false,
  data_quality_flags: ['ravscore-evidence-trust-unattested'],
  [alias('calibration_features', 'appVersion')]: '4.0.310',
  [alias('calibration_features', 'totalScore')]: 50,
  [alias('calibration_features', 'reasonCodes')]: ['ravscore-evidence-trust-unattested'],
  [alias('weather_snapshot', 'schemaVersion')]: 4,
  [alias('weather_snapshot', 'provider')]: 'DMI',
  [alias('weather_snapshot', 'current', 'windSpeedMps')]: 7.5,
  [alias('weather_snapshot', 'score', 'finalScore')]: 50,
  [alias('weather_snapshot', 'prediction', 'modelVersion')]: 'candidate-g',
  [alias('weather_snapshot', 'matchedRuleIds')]: ['rule-safe'],
  [alias('weather_snapshot', 'calibrationFeatures', 'appVersion')]: '4.0.310',
  [alias('weather_snapshot', 'calibrationFeatures', 'reasonCodes')]: ['ravscore-evidence-trust-unattested'],
  gps: { latitude: 55.1, longitude: 8.1 },
  latitude: 55.1,
  raw_u: 0.42,
  raw_v: -0.19,
  notes: 'synthetic private text that must never cross the projection',
  image: 'synthetic-private-image',
  unknown_private_column: 'synthetic-private-extra',
  weather_snapshot: { coordinates: [55.1, 8.1], metadata: 'synthetic-private-weather' },
  calibration_features: { geohash: 'synthetic-private-geohash' },
};

const projected = projectSupabaseObservationRow(sourceRow);
assert.equal(projected.user_id, undefined);
assert.equal(projected.anonymous_id, undefined);
assert.equal(projected.id, undefined);
assert.equal(projected.gps, undefined);
assert.equal(projected.notes, undefined);
assert.equal(projected.image, undefined);
assert.equal(projected.unknown_private_column, undefined);
assert.deepEqual(projected.calibration_features, {
  appVersion: '4.0.310',
  totalScore: 50,
  reasonCodes: ['ravscore-evidence-trust-unattested'],
});
assert.deepEqual(projected.weather_snapshot, {
  schemaVersion: 4,
  provider: 'DMI',
  current: { windSpeedMps: 7.5 },
  score: { finalScore: 50 },
  prediction: { modelVersion: 'candidate-g' },
  matchedRuleIds: ['rule-safe'],
  calibrationFeatures: {
    appVersion: '4.0.310',
    reasonCodes: ['ravscore-evidence-trust-unattested'],
  },
});
const serializedProjection = JSON.stringify(projected);
for (const forbiddenValue of [
  'synthetic private text', 'synthetic-private-image', 'synthetic-private-extra',
  'synthetic-private-weather', 'synthetic-private-geohash', '55.1',
]) assert.ok(!serializedProjection.includes(forbiddenValue));

let fetchCall;
const selectedResponseKeys = new Set([
  ...selectParts.filter(part => !part.includes(':')),
  ...SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(projection => projection.alias),
]);
const selectedSourceRow = Object.fromEntries(
  Object.entries(sourceRow).filter(([key]) => selectedResponseKeys.has(key)),
);
const fetched = await fetchSupabaseObservations({
  url: 'https://example.supabase.co',
  serviceKey: 'synthetic-service-key',
  fetchImpl: async (input, init) => {
    fetchCall = { url: new URL(String(input)), init };
    return new Response(JSON.stringify([selectedSourceRow]), { status: 200 });
  },
});
assert.equal(fetched.length, 1);
assert.equal(fetchCall.url.pathname, '/rest/v1/observations');
assert.equal(fetchCall.url.searchParams.get('select'), SUPABASE_OBSERVATION_SELECT);
assert.equal(fetchCall.url.searchParams.get('order'), 'id.asc');
assert.equal(fetchCall.init.headers.Range, '0-199');
assert.equal(fetchCall.init.headers['Range-Unit'], 'items');
assert.ok(fetchCall.init.signal instanceof AbortSignal);
await assert.rejects(
  fetchSupabaseObservations({
    url: 'https://example.supabase.co',
    serviceKey: 'synthetic-service-key',
    fetchImpl: async () => new Response(JSON.stringify([{ ...selectedSourceRow, gps: { synthetic: true } }]), {
      status: 200,
    }),
  }),
  /uventet migrationsprojektion/,
);

let ownerInput;
let storedInput;
const migrationResult = await migrateRow(sourceRow, {
  gatewayUrl: 'https://gateway.example.invalid',
  sharedSecret: 's'.repeat(32),
}, {
  pseudonymSecret: 'p'.repeat(32),
  ownerSubjectImpl: async input => {
    ownerInput = input;
    return { kind: 'user', subject: `usr_v1_${'a'.repeat(43)}` };
  },
  storeImpl: async input => {
    storedInput = input;
    return { duplicate: false };
  },
});
assert.deepEqual(migrationResult, { duplicate: false });
assert.equal(ownerInput.userId, sourceRow.user_id);
assert.equal(ownerInput.anonymousId, null);
assert.equal(ownerInput.secret, 'p'.repeat(32));
assert.equal(storedInput.source, 'supabase-migration');
assert.equal(typeof storedInput.fetchImpl, 'function');
assert.equal(storedInput.payload.user_id, undefined);
assert.equal(storedInput.payload.anonymous_id, undefined);
assert.equal(storedInput.payload.gps, undefined);
assert.equal(storedInput.payload.client_observation_id, sourceRow.client_observation_id);
assert.deepEqual(storedInput.payload.weather_snapshot, projected.weather_snapshot);
assert.deepEqual(storedInput.payload.calibration_features, projected.calibration_features);

let countConfiguration;
let countFetchInit;
const verifyOnlyResult = await runMigration({
  args: ['--verify-only'],
  environment: {
    CLOUDFLARE_TRIP_GATEWAY_URL: 'https://gateway.example.invalid',
    TRIP_GATEWAY_SHARED_SECRET: 's'.repeat(32),
    TRIP_PSEUDONYM_SECRET_V1: 'p'.repeat(32),
  },
  fetchImpl: async (_input, init) => {
    countFetchInit = init;
    return new Response('{}', { status: 200 });
  },
  countImpl: async configuration => {
    countConfiguration = configuration;
    await configuration.fetchImpl('https://gateway.example.invalid/v1/trips/count');
    return 0;
  },
  log: () => {},
});
assert.equal(typeof countConfiguration.fetchImpl, 'function');
assert.ok(countFetchInit.signal instanceof AbortSignal);
assert.deepEqual(verifyOnlyResult, { sourceRows: 0, inserted: 0, duplicates: 0, tripCount: 0 });

const emptyLegacySnapshot = projectSupabaseObservationRow({
  schema_version: 1,
  client_observation_id: '55555555-5555-4555-8555-555555555555',
});
assert.deepEqual(emptyLegacySnapshot.weather_snapshot, {},
  'Et NOT NULL legacy-weather_snapshot={} skal bevares idempotent uden at hente dokumentet.');

console.log('Trip-storage migration projection: eksplicit PostgREST-bladvalg og dataminimeret payload består.');
