import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleRequest } from '../cloudflare/trip-gateway/worker.js';
import { WORKER_HEALTH_RETRY_DELAYS_MS, waitForWorkerHealth } from './verify-cloudflare-trip-gateway.mjs';
import {
  boundedFetch,
  createBoundedFetch,
  TRIP_STORAGE_NETWORK_TIMEOUT_CODE,
} from './lib/bounded-fetch.mjs';
import { waitForTripStorageEdgeReadiness } from './lib/trip-storage-edge-readiness.mjs';
import {
  SUPABASE_OBSERVATION_LEAF_PROJECTIONS,
  projectSupabaseObservationRow,
} from './migrate-trip-storage-to-cloudflare.mjs';
import {
  D1_TRIP_SCHEMA_STATEMENTS,
  TRIP_INPUT_FIELD_NAMES,
  canonicalJson,
  countCloudflareTrips,
  deleteCloudflareTrips,
  assertExternalTripNestedContract,
  assertNoPrivateLocation,
  externalOwnerSubject,
  externalTripPayload,
  externalTripRecord,
  isLegacyCompatibleTripReplay,
  isLegacyProjectedTripReplay,
  isLegacyUnattestedTripReplay,
  listCloudflareTrips,
  normalizeCloudflareGatewayUrl,
  projectLegacyWeatherSnapshot,
  sha256Hex,
  storeCloudflareTrip,
  tripGatewaySignature,
  verifyTripGatewaySignature,
} from '../supabase/functions/_shared/trip-storage.js';

const secret = 'ravradar-test-secret-with-at-least-thirty-two-characters';
const gatewaySecret = 'ravradar-worker-test-secret-with-at-least-thirty-two-characters';
const gatewayUrl = 'https://ravradar-trip-gateway.example.workers.dev';
const userId = '11111111-1111-4111-8111-111111111111';
const anonymousId = '22222222-2222-4222-8222-222222222222';
const userOwner = await externalOwnerSubject({ userId, secret });
const repeatedOwner = await externalOwnerSubject({ userId, secret });
const anonymousOwner = await externalOwnerSubject({ anonymousId, secret });

function pendingUntilAbort(_input, init = {}) {
  return new Promise((resolve, reject) => {
    const signal = init.signal;
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

const deadlineController = new AbortController();
let requestedDeadlineMs = null;
const deadlineFailure = boundedFetch('https://example.invalid/timeout', {}, {
  fetchImpl: pendingUntilAbort,
  timeoutMs: 1_234,
  timeoutSignalFactory: milliseconds => {
    requestedDeadlineMs = milliseconds;
    return deadlineController.signal;
  },
});
deadlineController.abort(new DOMException('synthetic deadline', 'TimeoutError'));
await assert.rejects(deadlineFailure, error => (
  error?.code === TRIP_STORAGE_NETWORK_TIMEOUT_CODE
  && error?.cause?.name === 'TimeoutError'
));
assert.equal(requestedDeadlineMs, 1_234);

const callerController = new AbortController();
const inactiveDeadlineController = new AbortController();
const callerFailureReason = new Error('SYNTHETIC_CALLER_ABORT');
const callerFailure = createBoundedFetch({
  fetchImpl: pendingUntilAbort,
  timeoutSignalFactory: () => inactiveDeadlineController.signal,
})('https://example.invalid/caller-abort', { signal: callerController.signal });
callerController.abort(callerFailureReason);
await assert.rejects(callerFailure, error => error === callerFailureReason);

assert.equal(userOwner.subject, repeatedOwner.subject);
assert.match(userOwner.subject, /^usr_v1_[A-Za-z0-9_-]{43}$/);
assert.match(anonymousOwner.subject, /^anon_v1_[A-Za-z0-9_-]{43}$/);
assert.notEqual(userOwner.subject, anonymousOwner.subject);
assert.ok(!userOwner.subject.includes(userId));

const clientId = '33333333-3333-4333-8333-333333333333';
const tripId = '44444444-4444-4444-8444-444444444444';
const payload = {
  client_observation_id: clientId,
  trip_id: tripId,
  user_id: userId,
  anonymous_id: anonymousId,
  observed_at: '2026-08-26T10:00:00.000Z',
  submitted_at: '2026-08-26T11:00:00.000Z',
  actual_zone_id: 'DK-B01-01',
  actual_coastal_part_id: 'DK-B01-01-P01',
  hunt_mode: 'beach',
  found: false,
  result: 'none',
  gps: null,
};
const external = externalTripPayload(payload);
assert.equal('user_id' in external, false);
assert.equal('anonymous_id' in external, false);
assert.equal('gps' in external, false);
assert.equal(external.schema_version, 1);
const tripV2Base = {
  ...payload,
  schema_version: 2,
  forecast_zone_id: payload.actual_zone_id,
  forecast_coastal_part_id: payload.actual_coastal_part_id,
  calibration_eligible: true,
  calibration_features: { appVersion: '4.0.311', reasonCodes: [] },
  data_quality_flags: [],
};
assert.equal(externalTripPayload(tripV2Base).calibration_eligible, true);
assert.deepEqual(externalTripPayload(tripV2Base).data_quality_flags, []);
const legacyExternal = externalTripPayload({
  ...tripV2Base,
  calibration_features: { appVersion: '4.0.310', reasonCodes: [] },
});
assert.equal(legacyExternal.calibration_eligible, false);
assert.deepEqual(legacyExternal.data_quality_flags, ['ravscore-evidence-trust-unattested']);
assert.deepEqual(legacyExternal.calibration_features.reasonCodes, ['ravscore-evidence-trust-unattested']);
const tripInputFieldNames4010 = [
  'zone_id', 'zone_name', 'coast_type', 'observed_at', 'submitted_at', 'hunt_mode', 'result', 'grams',
  'anonymous_id', 'user_id', 'trip_id', 'gps', 'rav_score', 'score_level', 'ai_probability', 'ai_confidence',
  'model_version', 'weather_snapshot', 'wind_speed_mps', 'wind_direction_deg', 'wave_height_m', 'wave_period_s',
  'water_level_cm', 'current_speed_mps', 'current_direction_deg', 'water_temperature_c', 'client_observation_id',
  'schema_version', 'trip_started_at', 'trip_ended_at', 'search_minutes', 'search_coverage', 'actual_zone_id',
  'actual_coastal_part_id', 'forecast_zone_id', 'forecast_coastal_part_id', 'calibration_eligible', 'found',
  'forecast_snapshot_id', 'forecast_issued_at', 'forecast_valid_at', 'forecast_captured_at', 'calibration_features',
  'data_quality_flags', 'forecast_target_at', 'report_accuracy',
];
assert.deepEqual(TRIP_INPUT_FIELD_NAMES, tripInputFieldNames4010);
function externalTripPayload4010(payload) {
  const external = {};
  for (const key of tripInputFieldNames4010) {
    if (key === 'user_id' || key === 'anonymous_id' || key === 'gps') continue;
    const value = payload[key];
    if (value === null || value === undefined) continue;
    if (key === 'data_quality_flags' && Array.isArray(value) && value.length === 0) continue;
    external[key] = structuredClone(value);
  }
  external.schema_version = Number(payload.schema_version ?? 1);
  return external;
}
async function externalTripRecord4010({ owner, payload, source = 'live' }) {
  const externalPayload4010 = externalTripPayload4010(payload);
  const digestPayload = { ...externalPayload4010 };
  delete digestPayload.submitted_at;
  return {
    storage_schema_version: 1,
    owner_subject: owner.subject,
    owner_kind: owner.kind,
    trip_id: externalPayload4010.trip_id ?? null,
    client_observation_id: externalPayload4010.client_observation_id,
    observed_at: externalPayload4010.observed_at,
    submitted_at: externalPayload4010.submitted_at,
    payload_json: canonicalJson(externalPayload4010),
    payload_sha256: await sha256Hex(canonicalJson(digestPayload)),
    source,
  };
}
const edge4010Source = {
  ...tripV2Base,
  calibration_features: { appVersion: '4.0.310', reasonCodes: [] },
  data_quality_flags: [],
};
const newEdgeRecordForOldWorker = await externalTripRecord({ owner: userOwner, payload: edge4010Source });
const normalizedForOldWorker = JSON.parse(newEdgeRecordForOldWorker.payload_json);
assert.equal(normalizedForOldWorker.calibration_eligible, false);
assert.deepEqual(normalizedForOldWorker.data_quality_flags, ['ravscore-evidence-trust-unattested']);
assert.deepEqual(
  newEdgeRecordForOldWorker,
  await externalTripRecord4010({ owner: userOwner, payload: normalizedForOldWorker }),
);
const legacyMissingFlags = { ...tripV2Base };
delete legacyMissingFlags.data_quality_flags;
const migratedMissingFlags = externalTripPayload(legacyMissingFlags);
assert.equal(migratedMissingFlags.calibration_eligible, false);
assert.deepEqual(migratedMissingFlags.data_quality_flags, ['ravscore-evidence-trust-unattested']);
for (const flags of [
  ['ravscore-reconstructed-derived-evidence'],
  ['public-emergency-last-complete'],
  ['public-emergency-last-complete', 'ravscore-reconstructed-derived-evidence'],
  ['ravscore-evidence-trust-unattested'],
]) {
  const bound = externalTripPayload({
    ...tripV2Base,
    calibration_eligible: false,
    calibration_features: { reasonCodes: flags },
    data_quality_flags: flags,
  });
  assert.equal(bound.calibration_eligible, false);
  assert.deepEqual(bound.data_quality_flags, flags);
}
assert.throws(() => externalTripPayload({
  ...tripV2Base,
  calibration_features: { appVersion: '4.0.311', reasonCodes: [] },
  data_quality_flags: null,
}), /TRIP_DATA_QUALITY_FLAGS_INVALID/);
assert.throws(() => externalTripPayload({
  ...tripV2Base,
  calibration_eligible: false,
  calibration_features: { reasonCodes: ['ravscore-reconstructed-derived-evidence', 'public-emergency-last-complete'] },
  data_quality_flags: ['ravscore-reconstructed-derived-evidence', 'public-emergency-last-complete'],
}), /TRIP_DATA_QUALITY_FLAGS_INVALID/);
assert.throws(() => externalTripPayload({
  ...tripV2Base,
  calibration_eligible: true,
  calibration_features: { reasonCodes: ['ravscore-reconstructed-derived-evidence'] },
  data_quality_flags: ['ravscore-reconstructed-derived-evidence'],
}), /TRIP_CALIBRATION_ELIGIBILITY_INVALID/);
assert.throws(() => externalTripPayload({
  ...tripV2Base,
  calibration_eligible: false,
  calibration_features: { reasonCodes: [] },
  data_quality_flags: ['ravscore-reconstructed-derived-evidence'],
}), /TRIP_QUALITY_REASON_BINDING_INVALID/);
assert.deepEqual(
  externalTripPayload({ ...payload, schema_version: 1, weather_snapshot: { email: 'forbidden@example.test' } }).weather_snapshot,
  {},
);
assert.throws(
  () => externalTripPayload({ ...tripV2Base, weather_snapshot: { email: 'forbidden@example.test' } }),
  /DIRECT_IDENTITY_NOT_ALLOWED/,
);
for (const privateKey of [
  'lat', 'lon', 'lng', 'coord', 'geoCoordinates', 'gpsTrack',
  'preciseLocation', 'devicePosition', 'searchRoute', 'beach_track',
]) {
  assert.throws(
    () => assertNoPrivateLocation({ safe: { [privateKey]: 55.1 } }),
    /PRECISE_LOCATION_NOT_ALLOWED/,
    `Private location alias ${privateKey} must fail closed`,
  );
  assert.throws(
    () => externalTripPayload({ ...tripV2Base, weather_snapshot: { [privateKey]: 55.1 } }),
    /PRECISE_LOCATION_NOT_ALLOWED/,
    `D1 payload boundary must reject ${privateKey}`,
  );
}
assert.doesNotThrow(() => assertNoPrivateLocation({ gps: null, nested: { location: null } }));
const calibrationFeatureFixture = {
  modelVersion: 'candidate-g', appVersion: '4.0.311', totalScore: 50,
  huntabilityScore: 50, transportScore: 50, mobilisationScore: 50,
  reasonCodes: [],
};
const legacyFreeformSnapshot = {
  schemaVersion: 3,
  capturedAt: '2026-08-29T09:00:00.000Z',
  sourceGeneratedAt: '2026-08-29T08:00:00.000Z',
  forecastTime: '2026-08-29T09:00:00.000Z',
  provider: 'dmi',
  current: {
    generatedAt: '2026-08-29T08:00:00.000Z', provider: 'dmi', windSpeedMps: 8,
    currentDirectionDeg: 210, u: 0.2, v: -0.1, geohash: 'u3butz',
    utm: { easting: 500000, northing: 6200000 }, point: [55.1, 12.2],
    metadata: { latitude: 55.1, longitude: 12.2 },
  },
  score: { baseScore: 48, finalScore: 51, level: 'medium', metadata: { private: true } },
  prediction: {
    probability: 0.45, confidence: 0.6, modelVersion: 'legacy-prediction',
    current: { eastward: 0.2, northward: -0.1 }, point: [55.1, 12.2], metadata: 'private',
  },
  matchedRules: [
    { id: 'rule-old-1', result: true, metadata: { geohash: 'u3butz' } },
    { ruleId: 'rule-old-2', current: { u: 0.2, v: -0.1 } },
    { id: 'rule-old-1' },
  ],
  geohash: 'u3butz',
  utm: { easting: 500000, northing: 6200000 },
  point: [55.1, 12.2],
  metadata: { raw: true },
};
const projectedLegacySnapshot = projectLegacyWeatherSnapshot(legacyFreeformSnapshot);
assert.deepEqual(projectedLegacySnapshot, {
  schemaVersion: 3,
  capturedAt: '2026-08-29T09:00:00.000Z',
  sourceGeneratedAt: '2026-08-29T08:00:00.000Z',
  forecastTime: '2026-08-29T09:00:00.000Z',
  provider: 'dmi',
  current: {
    generatedAt: '2026-08-29T08:00:00.000Z', provider: 'dmi', windSpeedMps: 8,
    currentDirectionDeg: 210,
  },
  score: { baseScore: 48, finalScore: 51, level: 'medium' },
  prediction: { probability: 0.45, confidence: 0.6, modelVersion: 'legacy-prediction' },
  matchedRuleIds: ['rule-old-1', 'rule-old-2'],
});
assert.equal(canonicalJson(projectLegacyWeatherSnapshot(legacyFreeformSnapshot)), canonicalJson(projectedLegacySnapshot));
const legacySchemaTwoSnapshot = projectLegacyWeatherSnapshot({
  ...legacyFreeformSnapshot,
  schemaVersion: 2,
  prediction: undefined,
});
assert.equal(legacySchemaTwoSnapshot.schemaVersion, 2);
assert.equal('prediction' in legacySchemaTwoSnapshot, false);
assert.doesNotThrow(() => assertExternalTripNestedContract({
  schema_version: 1,
  weather_snapshot: legacySchemaTwoSnapshot,
}));
assert.throws(() => externalTripPayload({
  ...tripV2Base,
  weather_snapshot: legacySchemaTwoSnapshot,
}), /TRIP_WEATHER_SNAPSHOT_INVALID/);
assert.deepEqual(projectLegacyWeatherSnapshot({
  schemaVersion: 5,
  capturedAt: '2026-08-29T09:00:00.000Z',
  reportSource: 'account-manual',
  selectedAt: '2026-08-29T08:30:00.000Z',
  historicalSnapshotStatus: 'historical-snapshot-unavailable',
  metadata: { geohash: 'u3butz' },
  point: [55.1, 12.2],
}), {
  schemaVersion: 5,
  capturedAt: '2026-08-29T09:00:00.000Z',
  reportSource: 'account-manual',
  selectedAt: '2026-08-29T08:30:00.000Z',
  historicalSnapshotStatus: 'historical-snapshot-unavailable',
});
function nestedKeys(value, keys = []) {
  if (Array.isArray(value)) value.forEach(entry => nestedKeys(entry, keys));
  else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key.toLowerCase());
      nestedKeys(nested, keys);
    }
  }
  return keys;
}
for (const forbidden of ['u', 'v', 'eastward', 'northward', 'geohash', 'utm', 'point', 'metadata', 'latitude', 'longitude']) {
  assert.equal(nestedKeys(projectedLegacySnapshot).includes(forbidden), false, `${forbidden} leaked into the legacy projection`);
}
function externalTripPayloadV40310(input) {
  const cloned = structuredClone(input);
  const output = {};
  for (const key of TRIP_INPUT_FIELD_NAMES) {
    if (key === 'user_id' || key === 'anonymous_id' || key === 'gps') continue;
    const value = cloned[key];
    if (value === null || value === undefined) continue;
    if (key === 'data_quality_flags' && Array.isArray(value) && value.length === 0) continue;
    output[key] = value;
  }
  output.schema_version = Number(cloned.schema_version ?? 1);
  return output;
}
const crossVersionLegacyPayload = externalTripPayload({
  ...payload,
  schema_version: 1,
  weather_snapshot: legacyFreeformSnapshot,
});
assert.equal(
  canonicalJson(externalTripPayloadV40310(crossVersionLegacyPayload)),
  canonicalJson(crossVersionLegacyPayload),
  'The projected schema-1 payload must remain canonical under the 4.0.310 Worker boundary.',
);

const originalDeno = globalThis.Deno;
const originalFetch = globalThis.fetch;
let capturedSupabasePayload = null;
let capturedSupabaseReadFields = [];
let capturedSupabaseReadback = null;
const fakeSupabaseRows = new Map();
function selectedSupabaseProjection(stored, selectedFields) {
  const response = {};
  const projectionsByAlias = new Map(
    SUPABASE_OBSERVATION_LEAF_PROJECTIONS.map(projection => [projection.alias, projection]),
  );
  for (const selectedField of selectedFields) {
    if (!selectedField.includes(':')) {
      if (stored[selectedField] !== null && stored[selectedField] !== undefined) {
        response[selectedField] = structuredClone(stored[selectedField]);
      }
      continue;
    }
    const alias = selectedField.slice(0, selectedField.indexOf(':'));
    const projection = projectionsByAlias.get(alias);
    if (!projection) continue;
    let value = stored[projection.column];
    for (const key of projection.path) {
      if (!value || typeof value !== 'object') {
        value = undefined;
        break;
      }
      value = value[key];
    }
    if (value !== null && value !== undefined) response[alias] = structuredClone(value);
  }
  return response;
}
try {
  const tripStoreEnvironment = {
    TRIP_STORAGE_MODE: 'supabase',
    SUPABASE_URL: 'https://legacy-projection-test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    CLOUDFLARE_TRIP_GATEWAY_URL: 'https://lease-test.workers.dev',
    TRIP_GATEWAY_SHARED_SECRET: 'synthetic-shared-secret-with-thirty-two-characters',
    TRIP_PSEUDONYM_SECRET_V1: 'synthetic-pseudonym-secret-with-thirty-two-characters',
  };
  globalThis.Deno = { env: { get: name => tripStoreEnvironment[name] ?? null } };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.hostname === 'lease-test.workers.dev') {
      assert.equal(url.pathname, '/v1/trips/list');
      return new Response(JSON.stringify({ ok: true, rows: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (String(init.method || 'GET').toUpperCase() === 'POST') {
      await Promise.resolve();
      const submitted = JSON.parse(String(init.body || '{}'));
      const sameClient = fakeSupabaseRows.get(submitted.client_observation_id);
      const sameTrip = [...fakeSupabaseRows.values()].find(row => submitted.trip_id && row.trip_id === submitted.trip_id);
      if (sameTrip && sameTrip.client_observation_id !== submitted.client_observation_id) {
        return new Response(null, { status: 409 });
      }
      if (!sameClient) {
        fakeSupabaseRows.set(submitted.client_observation_id, {
          data_quality_flags: [],
          weather_snapshot: {},
          ...structuredClone(submitted),
          observed_at: String(submitted.observed_at).replace(/\.000Z$/, '+00:00'),
        });
      }
      capturedSupabasePayload ??= structuredClone(submitted);
      return new Response(null, { status: 201 });
    }
    capturedSupabaseReadFields = String(url.searchParams.get('select') || '').split(',').filter(Boolean);
    const clientObservationId = String(url.searchParams.get('client_observation_id') || '').replace(/^eq\./, '');
    const stored = fakeSupabaseRows.get(clientObservationId);
    capturedSupabaseReadback = stored
      ? selectedSupabaseProjection(stored, capturedSupabaseReadFields)
      : null;
    return new Response(JSON.stringify(capturedSupabaseReadback ? [capturedSupabaseReadback] : []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const {
    TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS,
    listOwnTripObservations,
    storeObservation,
    tripStorageMode,
  } = await import('../supabase/functions/_shared/trip-store.ts?legacy-projection-test=1');
  assert.equal(tripStorageMode(), 'supabase');
  tripStoreEnvironment.TRIP_STORAGE_MODE = 'd1';
  assert.equal(tripStorageMode(), 'd1');
  const leaseNow = Date.now();
  tripStoreEnvironment.TRIP_STORAGE_MODE = `maintenance:${new Date(leaseNow + 60_000).toISOString()}`;
  assert.equal(tripStorageMode(leaseNow), 'maintenance');
  await assert.rejects(
    storeObservation({}, null),
    error => error?.code === 'TRIP_STORAGE_MAINTENANCE' && error?.status === 503,
  );
  tripStoreEnvironment.TRIP_STORAGE_MODE = `maintenance:${new Date(leaseNow - 1_000).toISOString()}`;
  assert.equal(tripStorageMode(leaseNow), 'd1');
  assert.deepEqual(await listOwnTripObservations(userId, 1), []);
  tripStoreEnvironment.TRIP_STORAGE_MODE = 'maintenance';
  assert.throws(() => tripStorageMode(), error => error?.code === 'TRIP_STORAGE_MODE_INVALID' && error?.status === 503);
  tripStoreEnvironment.TRIP_STORAGE_MODE = 'maintenance:not-a-date';
  assert.throws(() => tripStorageMode(), error => error?.code === 'TRIP_STORAGE_MAINTENANCE_LEASE_INVALID' && error?.status === 503);
  tripStoreEnvironment.TRIP_STORAGE_MODE = `maintenance:${new Date(Date.now() + TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS + 60_000).toISOString()}`;
  assert.throws(() => tripStorageMode(), error => error?.code === 'TRIP_STORAGE_MAINTENANCE_LEASE_INVALID' && error?.status === 503);
  delete tripStoreEnvironment.TRIP_STORAGE_MODE;
  assert.throws(() => tripStorageMode(), error => error?.code === 'TRIP_STORAGE_MODE_INVALID' && error?.status === 503);
  tripStoreEnvironment.TRIP_STORAGE_MODE = '   ';
  assert.throws(() => tripStorageMode(), error => error?.code === 'TRIP_STORAGE_MODE_INVALID' && error?.status === 503);
  tripStoreEnvironment.TRIP_STORAGE_MODE = 'unknown';
  assert.throws(() => tripStorageMode(), error => error?.code === 'TRIP_STORAGE_MODE_INVALID' && error?.status === 503);
  tripStoreEnvironment.TRIP_STORAGE_MODE = 'supabase';
  const supabaseLegacySource = {
    ...payload,
    schema_version: 1,
    weather_snapshot: legacyFreeformSnapshot,
  };
  await storeObservation(supabaseLegacySource, null);
  const storedBeforeConflict = canonicalJson(fakeSupabaseRows.get(clientId));
  await assert.rejects(
    storeObservation({ ...supabaseLegacySource, result: 'good', found: true }, null),
    error => error?.code === 'TRIP_IDEMPOTENCY_CONFLICT' && error?.status === 409,
  );
  assert.equal(canonicalJson(fakeSupabaseRows.get(clientId)), storedBeforeConflict);
  await assert.rejects(
    storeObservation({
      ...supabaseLegacySource,
      client_observation_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    }, null),
    error => error?.code === 'TRIP_IDEMPOTENCY_CONFLICT' && error?.status === 409,
  );

  const concurrentSupabaseClientId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const concurrentSupabaseResults = await Promise.allSettled([
    storeObservation({
      ...supabaseLegacySource,
      client_observation_id: concurrentSupabaseClientId,
      trip_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    }, null),
    storeObservation({
      ...supabaseLegacySource,
      client_observation_id: concurrentSupabaseClientId,
      trip_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      result: 'good',
      found: true,
    }, null),
  ]);
  assert.equal(concurrentSupabaseResults.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(concurrentSupabaseResults.filter(result => result.status === 'rejected').length, 1);
  assert.equal([...fakeSupabaseRows.values()].filter(row => row.client_observation_id === concurrentSupabaseClientId).length, 1);

  const privateLegacyClientId = '12121212-1212-4212-8212-121212121212';
  const privateLegacyTripId = '34343434-3434-4434-8434-343434343434';
  const privateLegacySource = {
    ...supabaseLegacySource,
    user_id: null,
    anonymous_id: anonymousId,
    client_observation_id: privateLegacyClientId,
    trip_id: privateLegacyTripId,
    weather_snapshot: {
      schemaVersion: 2,
      provider: 'legacy-safe-provider',
      geohash: 'synthetic-private-geohash',
      coordinates: [55.1, 8.1],
      raw_u: 0.42,
      metadata: 'synthetic-private-metadata',
    },
  };
  fakeSupabaseRows.set(privateLegacyClientId, structuredClone(privateLegacySource));
  const privateLegacyRowBefore = canonicalJson(fakeSupabaseRows.get(privateLegacyClientId));
  await storeObservation(privateLegacySource, null);
  assert.equal(canonicalJson(fakeSupabaseRows.get(privateLegacyClientId)), privateLegacyRowBefore);
  const safeReadbackJson = canonicalJson(capturedSupabaseReadback);
  assert.ok(safeReadbackJson.includes('legacy-safe-provider'));
  for (const forbiddenValue of [
    'synthetic-private-geohash', 'synthetic-private-metadata', '55.1', '8.1', '0.42',
  ]) assert.equal(safeReadbackJson.includes(forbiddenValue), false);
} finally {
  globalThis.fetch = originalFetch;
  if (originalDeno === undefined) delete globalThis.Deno;
  else globalThis.Deno = originalDeno;
}
assert.deepEqual(capturedSupabasePayload.weather_snapshot, projectedLegacySnapshot);
assert.equal(capturedSupabaseReadFields.includes('weather_snapshot'), false);
assert.equal(capturedSupabaseReadFields.includes('calibration_features'), false);
assert.ok(capturedSupabaseReadFields.some(field =>
  /^w\d+:weather_snapshot->schemaVersion$/.test(field)));
assert.ok(capturedSupabaseReadFields.some(field =>
  /^c\d+:calibration_features->appVersion$/.test(field)));
for (const forbiddenField of ['gps', 'id', 'created_at', 'sync_status', 'payload_json']) {
  assert.equal(capturedSupabaseReadFields.includes(forbiddenField), false, `${forbiddenField} must not be fetched for Supabase idempotency.`);
}
assert.ok(capturedSupabaseReadback && !Object.hasOwn(capturedSupabaseReadback, 'weather_snapshot'));
assert.ok(capturedSupabaseReadback && !Object.hasOwn(capturedSupabaseReadback, 'calibration_features'));
for (const forbidden of ['u', 'v', 'eastward', 'northward', 'geohash', 'utm', 'point', 'metadata', 'latitude', 'longitude']) {
  assert.equal(nestedKeys(capturedSupabasePayload).includes(forbidden), false, `${forbidden} leaked into Supabase-mode storage`);
}
for (const weatherSnapshot of [
  {
    schemaVersion: 3, capturedAt: '2026-08-29T09:00:00.000Z',
    sourceGeneratedAt: '2026-08-29T08:00:00.000Z', forecastTime: '2026-08-29T09:00:00.000Z',
    provider: 'dmi', current: { windSpeedMps: 8, currentDirectionDeg: 210 },
    score: { baseScore: 50, finalScore: 50, level: 'medium' },
    prediction: { probability: 0.5, confidence: 0.5, modelVersion: 'candidate-g' },
    matchedRuleIds: ['rule-1'],
  },
  {
    schemaVersion: 4, capturedAt: '2026-08-29T09:00:00.000Z',
    forecastSnapshotId: 'rr-test', forecastIssuedAt: '2026-08-29T08:00:00.000Z',
    forecastValidAt: '2026-08-29T09:00:00.000Z', calibrationFeatures: calibrationFeatureFixture,
  },
  {
    schemaVersion: 5, capturedAt: '2026-08-29T09:00:00.000Z', reportSource: 'account-manual',
    selectedAt: '2026-08-29T08:30:00.000Z', historicalSnapshotStatus: 'historical-snapshot-unavailable',
  },
]) {
  assert.doesNotThrow(() => assertExternalTripNestedContract({
    calibration_features: calibrationFeatureFixture,
    weather_snapshot: weatherSnapshot,
  }));
}
for (const unsafeNested of [
  { weather_snapshot: { geohash: 'u3butz' } },
  { weather_snapshot: { point: [55.1, 12.2] } },
  { weather_snapshot: { utm: { easting: 500000, northing: 6200000 } } },
  { weather_snapshot: { u: 0.2, v: -0.1 } },
  { weather_snapshot: { eastward: 0.2, northward: -0.1 } },
  { weather_snapshot: { metadata: '55.1,12.2' } },
  { calibration_features: { ...calibrationFeatureFixture, metadata: '55.1,12.2' } },
  { calibration_features: { ...calibrationFeatureFixture, totalScore: { value: 50 } } },
  { calibration_features: { ...calibrationFeatureFixture, currentDirectionDeg: 361 } },
  { weather_snapshot: { schemaVersion: 3, current: { currentSpeedMps: 11 } } },
]) {
  assert.throws(
    () => assertExternalTripNestedContract(unsafeNested),
    /TRIP_(?:WEATHER_SNAPSHOT|CALIBRATION_FEATURES)_INVALID/,
  );
  assert.throws(
    () => externalTripPayload({ ...tripV2Base, ...unsafeNested }),
    /TRIP_(?:WEATHER_SNAPSHOT|CALIBRATION_FEATURES)_INVALID/,
  );
}
assert.equal(canonicalJson({ z: 1, nested: { b: 2, a: 1 } }), canonicalJson({ nested: { a: 1, b: 2 }, z: 1 }));
assert.equal(normalizeCloudflareGatewayUrl(gatewayUrl), gatewayUrl);
assert.throws(() => normalizeCloudflareGatewayUrl('https://example.com'), /TRIP_GATEWAY_URL_INVALID/);
assert.throws(() => normalizeCloudflareGatewayUrl(`${gatewayUrl}/other`), /TRIP_GATEWAY_URL_INVALID/);

let healthAttempts = 0;
const eventualHealth = await waitForWorkerHealth({
  gatewayUrl,
  retryDelaysMs: [0, 0, 0],
  fetchImpl: async () => {
    healthAttempts += 1;
    const healthy = healthAttempts === 3;
    return new Response(JSON.stringify(healthy
      ? {
          ok: true,
          service: 'ravradar-trip-gateway',
          contract_version: '4.0.311',
          storage_schema_version: 1,
          idempotency_registry_schema_version: 2,
          owner_erasure_tombstone_schema_version: 1,
          shards: 10,
        }
      : { ok: false }), { status: healthy ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(healthAttempts, 3);
assert.equal(eventualHealth.body?.ok, true);
assert.ok(WORKER_HEALTH_RETRY_DELAYS_MS.length >= 2);
assert.ok(WORKER_HEALTH_RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0) <= 60_000);

function edgeAttestationResponse(mode) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://ravradar.dk',
      'X-RavRadar-Trip-Contract-Version': '4.0.311',
      'X-RavRadar-Trip-Storage-Mode': mode,
    },
  });
}
const mixedEdgeAttestation = await waitForTripStorageEdgeReadiness({
  baseUrl: 'https://example.supabase.co',
  publishableKey: 'synthetic-publishable-key',
  expectedStorageMode: 'd1',
  retryDelaysMs: [0],
  nonceFactory: () => 'mixed',
  fetchImpl: async input => edgeAttestationResponse(
    new URL(String(input)).pathname.endsWith('/trip-log') ? 'd1' : 'supabase',
  ),
});
assert.equal(mixedEdgeAttestation.ok, false);
assert.deepEqual(mixedEdgeAttestation.functionStatus, {
  'submit-observation': false,
  'trip-log': true,
});
let edgeAttestationCalls = 0;
const convergedEdgeRequests = [];
const convergedEdgeAttestation = await waitForTripStorageEdgeReadiness({
  baseUrl: 'https://example.supabase.co',
  publishableKey: 'synthetic-publishable-key',
  expectedStorageMode: 'd1',
  retryDelaysMs: [0, 0, 0],
  nonceFactory: () => 'converged',
  fetchImpl: async (input, init) => {
    edgeAttestationCalls += 1;
    convergedEdgeRequests.push({ url: new URL(String(input)), init });
    const attempt = Math.ceil(edgeAttestationCalls / 2);
    const functionName = new URL(String(input)).pathname.split('/').at(-1);
    return edgeAttestationResponse(
      attempt === 1 && functionName === 'submit-observation' ? 'supabase' : 'd1',
    );
  },
});
assert.equal(convergedEdgeAttestation.ok, true);
assert.equal(convergedEdgeAttestation.attempts, 3);
assert.equal(convergedEdgeAttestation.consecutiveSuccesses, 2);
assert.equal(convergedEdgeRequests.length, 6);
for (const request of convergedEdgeRequests) {
  assert.equal(request.init.method, 'OPTIONS');
  assert.equal(request.init.cache, 'no-store');
  assert.equal(request.init.headers['cache-control'], 'no-cache, no-store');
  assert.ok(request.url.searchParams.get('_rr_trip_attestation'));
}

const timestamp = 1_777_000_000_000;
const signedBody = '{"safe":true}';
const signature = await tripGatewaySignature({ secret: gatewaySecret, timestamp, method: 'POST', pathname: '/v1/trips/count', bodyText: signedBody });
assert.match(signature, /^[a-f0-9]{64}$/);
assert.equal(await verifyTripGatewaySignature({ secret: gatewaySecret, timestamp, signature, method: 'POST', pathname: '/v1/trips/count', bodyText: signedBody, now: timestamp }), true);
assert.equal(await verifyTripGatewaySignature({ secret: gatewaySecret, timestamp, signature, method: 'POST', pathname: '/v1/trips/count', bodyText: '{}', now: timestamp }), false);
assert.equal(await verifyTripGatewaySignature({ secret: gatewaySecret, timestamp, signature, method: 'POST', pathname: '/v1/trips/count', bodyText: signedBody, now: timestamp + 300_001 }), false);

class FakeD1Database {
  constructor() {
    this.rows = new Map();
    this.registryRows = new Map();
    this.tombstoneRows = new Set();
    this.tripQueryBarrier = null;
    this.tripInsertBarrier = null;
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...args) {
        return {
          async run() {
            const normalized = sql.toLowerCase();
            if (normalized.includes('insert into trip_owner_erasure_tombstones')) {
              const [ownerSubject] = args;
              const existed = database.tombstoneRows.has(ownerSubject);
              database.tombstoneRows.add(ownerSubject);
              return { success: true, meta: { changes: existed ? 0 : 1 } };
            }
            if (normalized.includes('delete from trip_observation_registry')) {
              const [ownerSubject] = args;
              let changes = 0;
              for (const [key, row] of database.registryRows) {
                if (row.ownerSubject === ownerSubject) {
                  database.registryRows.delete(key);
                  changes += 1;
                }
              }
              return { success: true, meta: { changes } };
            }
            if (normalized.includes('delete from trip_observations')) {
              const [ownerSubject] = args;
              let changes = 0;
              for (const [key, row] of database.rows) {
                if (row.ownerSubject === ownerSubject) {
                  database.rows.delete(key);
                  changes += 1;
                }
              }
              return { success: true, meta: { changes } };
            }
            if (normalized.includes('insert into trip_observation_registry')) {
              const [storedClientId, storedTripId, ownerSubject, payloadSha256, targetDatabaseIndex, tombstoneOwner] = args;
              const existing = database.registryRows.get(storedClientId)
                || [...database.registryRows.values()].find(row => storedTripId && row.tripId === storedTripId);
              const ownerErased = database.tombstoneRows.has(tombstoneOwner);
              if (!existing && !ownerErased) {
                database.registryRows.set(storedClientId, {
                  clientId: storedClientId, tripId: storedTripId, ownerSubject,
                  payloadSha256, targetDatabaseIndex,
                });
              }
              return { success: true, meta: { changes: existing || ownerErased ? 0 : 1 } };
            }
            if (!normalized.includes('insert into trip_observations')) throw new Error('Unexpected run query');
            const [storageSchemaVersion, ownerSubject, ownerKind, storedTripId, storedClientId, observedAt, submittedAt, payloadJson, payloadSha256, source] = args;
            if (database.tripInsertBarrier?.active) await database.tripInsertBarrier.wait();
            const existing = database.rows.get(storedClientId) || [...database.rows.values()].find(row => storedTripId && row.tripId === storedTripId);
            if (!existing) {
              database.rows.set(storedClientId, {
                storageSchemaVersion, ownerSubject, ownerKind, tripId: storedTripId, clientId: storedClientId,
                observedAt, submittedAt, payloadJson, payloadSha256, source,
              });
            }
            return { success: true, meta: { changes: existing ? 0 : 1 } };
          },
          async all() {
            const normalized = sql.toLowerCase();
            if (normalized.includes('from trip_owner_erasure_tombstones')) {
              const [ownerSubject] = args;
              return {
                success: true,
                results: database.tombstoneRows.has(ownerSubject) ? [{ owner_subject: ownerSubject }] : [],
              };
            }
            if (normalized.includes('select owner_subject, payload_sha256, payload_json')) {
              const [storedClientId, , storedTripId] = args;
              const result = {
                success: true,
                results: [...database.rows.values()]
                  .filter(row => row.clientId === storedClientId || (storedTripId && row.tripId === storedTripId))
                  .map(row => ({
                    owner_subject: row.ownerSubject,
                    payload_sha256: row.payloadSha256,
                    payload_json: row.payloadJson,
                    source: row.source,
                  })),
              };
              return database.tripQueryBarrier?.active
                ? database.tripQueryBarrier.wait(result)
                : result;
            }
            if (normalized.includes('from trip_observation_registry')) {
              const [storedClientId, , storedTripId] = args;
              return {
                success: true,
                results: [...database.registryRows.values()]
                  .filter(row => row.clientId === storedClientId || (storedTripId && row.tripId === storedTripId))
                  .map(row => ({
                    client_observation_id: row.clientId,
                    trip_id: row.tripId,
                    owner_subject: row.ownerSubject,
                    payload_sha256: row.payloadSha256,
                    target_database_index: row.targetDatabaseIndex,
                  })),
              };
            }
            if (normalized.includes('select payload_json, payload_sha256, observed_at')) {
              const [ownerSubject, limit] = args;
              return {
                success: true,
                results: [...database.rows.values()]
                  .filter(row => row.ownerSubject === ownerSubject)
                  .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
                  .slice(0, limit)
                  .map(row => ({ payload_json: row.payloadJson, payload_sha256: row.payloadSha256, observed_at: row.observedAt })),
              };
            }
            throw new Error('Unexpected all query');
          },
        };
      },
      async all() {
        if (!sql.toLowerCase().includes('select count(*)')) throw new Error('Unexpected direct all query');
        return { success: true, results: [{ trip_count: database.rows.size }] };
      },
    };
  }
}

const env = { TRIP_GATEWAY_SHARED_SECRET: gatewaySecret };
for (let index = 0; index < 10; index += 1) env[`TRIP_DB_${index}`] = new FakeD1Database();
let lastRequestText = '';
async function workerFetch(input, init) {
  lastRequestText = JSON.stringify({ input, init });
  return handleRequest(new Request(input, init), env);
}

const health = await handleRequest(new Request(`${gatewayUrl}/health`), env);
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), {
  ok: true,
  service: 'ravradar-trip-gateway',
  contract_version: '4.0.311',
  storage_schema_version: 1,
  idempotency_registry_schema_version: 2,
  owner_erasure_tombstone_schema_version: 1,
  shards: 10,
});
const unsigned = await handleRequest(new Request(`${gatewayUrl}/v1/trips/count`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
}), env);
assert.equal(unsigned.status, 401);

const configuration = { gatewayUrl, sharedSecret: gatewaySecret, fetchImpl: workerFetch, now: Date.now() };
const first = await storeCloudflareTrip({ ...configuration, owner: userOwner, payload });
assert.equal(first.duplicate, false);
assert.ok(!lastRequestText.includes(userId));
assert.ok(!lastRequestText.includes(anonymousId));
assert.ok(!lastRequestText.includes(secret));
assert.ok(!lastRequestText.includes(gatewaySecret));
const firstTripShardDigest = await sha256Hex(tripId);
const firstTripDatabase = env[`TRIP_DB_${Number.parseInt(firstTripShardDigest.slice(0, 8), 16) % 10}`];
const firstTripPayloadBeforeIntegrityTest = firstTripDatabase.rows.get(clientId).payloadJson;
firstTripDatabase.rows.get(clientId).payloadJson = canonicalJson({
  ...JSON.parse(firstTripPayloadBeforeIntegrityTest),
  result: 'good',
  found: true,
});
await assert.rejects(
  storeCloudflareTrip({ ...configuration, owner: userOwner, payload }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
firstTripDatabase.rows.get(clientId).payloadJson = firstTripPayloadBeforeIntegrityTest;
const second = await storeCloudflareTrip({ ...configuration, owner: userOwner, payload: { ...payload, submitted_at: '2026-08-26T11:05:00.000Z' } });
assert.equal(second.duplicate, true);
await assert.rejects(
  storeCloudflareTrip({ ...configuration, owner: userOwner, payload: { ...payload, result: 'good', found: true } }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
const listed = await listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 100 });
assert.equal(listed.length, 1);
assert.equal(listed[0].trip_id, tripId);
assert.equal('user_id' in listed[0], false);
assert.equal('anonymous_id' in listed[0], false);
assert.equal(await countCloudflareTrips(configuration), 1);
assert.equal(Object.values(env).filter(value => value instanceof FakeD1Database).reduce((sum, database) => sum + database.rows.size, 0), 1);

const erasedOwner = await externalOwnerSubject({
  userId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  secret,
});
const erasedPayload = {
  ...payload,
  user_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  anonymous_id: null,
  client_observation_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  trip_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
};
await storeCloudflareTrip({ ...configuration, owner: erasedOwner, payload: erasedPayload });
assert.equal(await countCloudflareTrips(configuration), 2);
assert.equal(await deleteCloudflareTrips({ ...configuration, ownerSubject: erasedOwner.subject }), 1);
assert.equal(env.TRIP_DB_0.tombstoneRows.has(erasedOwner.subject), true);
assert.equal(
  [...env.TRIP_DB_0.registryRows.values()].some(row => row.ownerSubject === erasedOwner.subject),
  false,
);
assert.equal((await listCloudflareTrips({ ...configuration, ownerSubject: erasedOwner.subject, limit: 1 })).length, 0);
await assert.rejects(
  storeCloudflareTrip({ ...configuration, owner: erasedOwner, payload: erasedPayload }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
assert.equal(await countCloudflareTrips(configuration), 1);

const legacyReplayClientId = '55555555-5555-4555-8555-555555555555';
const legacyReplayTripId = '66666666-6666-4666-8666-666666666666';
const legacyReplaySource = {
  ...tripV2Base,
  client_observation_id: legacyReplayClientId,
  trip_id: legacyReplayTripId,
  calibration_features: { appVersion: '4.0.310', reasonCodes: [] },
  data_quality_flags: [],
};
const normalizedReplayPayload = externalTripPayload(legacyReplaySource);
const legacyStoredPayload = {
  ...normalizedReplayPayload,
  calibration_eligible: true,
  calibration_features: { appVersion: '4.0.310', reasonCodes: [] },
  data_quality_flags: [],
};
assert.equal(isLegacyUnattestedTripReplay(legacyStoredPayload, normalizedReplayPayload), true);
assert.equal(isLegacyUnattestedTripReplay(legacyStoredPayload, {
  ...normalizedReplayPayload,
  result: 'good',
  found: true,
}), false);
const legacyDigestPayload = { ...legacyStoredPayload };
delete legacyDigestPayload.submitted_at;
const legacyPayloadSha256 = await sha256Hex(canonicalJson(legacyDigestPayload));
const legacyShardDigest = await sha256Hex(legacyReplayTripId);
const legacyShardIndex = Number.parseInt(legacyShardDigest.slice(0, 8), 16) % 10;
const legacyDatabase = env[`TRIP_DB_${legacyShardIndex}`];
legacyDatabase.rows.set(legacyReplayClientId, {
  storageSchemaVersion: 1,
  ownerSubject: userOwner.subject,
  ownerKind: userOwner.kind,
  tripId: legacyReplayTripId,
  clientId: legacyReplayClientId,
  observedAt: legacyStoredPayload.observed_at,
  submittedAt: legacyStoredPayload.submitted_at,
  payloadJson: canonicalJson(legacyStoredPayload),
  payloadSha256: legacyPayloadSha256,
  source: 'supabase-migration',
});
const legacyPayloadBeforeReplay = legacyDatabase.rows.get(legacyReplayClientId).payloadJson;
const legacyHashBeforeReplay = legacyDatabase.rows.get(legacyReplayClientId).payloadSha256;
const legacyReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: legacyReplaySource,
  source: 'supabase-migration',
});
assert.equal(legacyReplay.duplicate, true);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadJson, legacyPayloadBeforeReplay);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadSha256, legacyHashBeforeReplay);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: { ...legacyReplaySource, result: 'good', found: true },
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);

const rawLegacyClientId = '77777777-7777-4777-8777-777777777777';
const rawLegacyTripId = '88888888-8888-4888-8888-888888888888';
const rawLegacySource = {
  ...payload,
  client_observation_id: rawLegacyClientId,
  trip_id: rawLegacyTripId,
  schema_version: 1,
  weather_snapshot: legacyFreeformSnapshot,
};
const safeLegacyMigrationPayload = externalTripPayload(rawLegacySource);
assert.deepEqual(safeLegacyMigrationPayload.weather_snapshot, projectedLegacySnapshot);
const rawLegacyStoredPayload = externalTripPayload({ ...rawLegacySource, weather_snapshot: null });
rawLegacyStoredPayload.weather_snapshot = structuredClone(legacyFreeformSnapshot);
assert.equal(isLegacyProjectedTripReplay(rawLegacyStoredPayload, safeLegacyMigrationPayload), true);
assert.equal(isLegacyCompatibleTripReplay(rawLegacyStoredPayload, safeLegacyMigrationPayload), true);
assert.equal(isLegacyProjectedTripReplay(safeLegacyMigrationPayload, safeLegacyMigrationPayload), false);
assert.equal(isLegacyProjectedTripReplay(rawLegacyStoredPayload, {
  ...safeLegacyMigrationPayload,
  result: 'good',
  found: true,
}), false);
const rawLegacyDigestPayload = { ...rawLegacyStoredPayload };
delete rawLegacyDigestPayload.submitted_at;
const rawLegacyPayloadSha256 = await sha256Hex(canonicalJson(rawLegacyDigestPayload));
assert.equal(await sha256Hex(canonicalJson(rawLegacyDigestPayload)), rawLegacyPayloadSha256);
const rawLegacyShardDigest = await sha256Hex(rawLegacyTripId);
const rawLegacyShardIndex = Number.parseInt(rawLegacyShardDigest.slice(0, 8), 16) % 10;
const rawLegacyDatabase = env[`TRIP_DB_${rawLegacyShardIndex}`];
rawLegacyDatabase.rows.set(rawLegacyClientId, {
  storageSchemaVersion: 1,
  ownerSubject: userOwner.subject,
  ownerKind: userOwner.kind,
  tripId: rawLegacyTripId,
  clientId: rawLegacyClientId,
  observedAt: rawLegacyStoredPayload.observed_at,
  submittedAt: rawLegacyStoredPayload.submitted_at,
  payloadJson: canonicalJson(rawLegacyStoredPayload),
  payloadSha256: rawLegacyPayloadSha256,
  source: 'supabase-migration',
});
const rawLegacyPayloadBeforeReplay = rawLegacyDatabase.rows.get(rawLegacyClientId).payloadJson;
const rawLegacyHashBeforeReplay = rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256;
const rawLegacyReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: rawLegacySource,
  source: 'supabase-migration',
});
assert.equal(rawLegacyReplay.duplicate, true);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadJson, rawLegacyPayloadBeforeReplay);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256, rawLegacyHashBeforeReplay);

const matchedRulesClientId = '99999999-9999-4999-8999-999999999999';
const matchedRulesTripId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const legacySchemaVersionAlias = SUPABASE_OBSERVATION_LEAF_PROJECTIONS.find(projection =>
  projection.column === 'weather_snapshot'
  && canonicalJson(projection.path) === canonicalJson(['schemaVersion']))?.alias;
assert.ok(legacySchemaVersionAlias);
const matchedRulesMigrationRow = {
  client_observation_id: matchedRulesClientId,
  trip_id: matchedRulesTripId,
  schema_version: 1,
  observed_at: '2026-08-26T12:00:00.000Z',
  submitted_at: '2026-08-26T13:00:00.000Z',
  actual_zone_id: 'DK-B01-01',
  actual_coastal_part_id: 'DK-B01-01-P01',
  hunt_mode: 'beach',
  result: 'none',
  found: false,
  [legacySchemaVersionAlias]: 2,
};
const matchedRulesLeafPayload = projectSupabaseObservationRow(matchedRulesMigrationRow);
const matchedRulesStoredPayload = {
  ...externalTripPayload({ ...matchedRulesMigrationRow, weather_snapshot: null }),
  weather_snapshot: {
    schemaVersion: 2,
    matchedRules: [
      { id: 'safe-rule', metadata: { latitude: 55.1, raw_u: 0.42 } },
    ],
  },
};
const matchedRulesProjected = externalTripPayload(matchedRulesStoredPayload);
assert.deepEqual(matchedRulesProjected.weather_snapshot, {
  schemaVersion: 2,
  matchedRuleIds: ['safe-rule'],
});
assert.equal(isLegacyProjectedTripReplay(matchedRulesStoredPayload, matchedRulesLeafPayload), false);
assert.equal(isLegacyProjectedTripReplay(matchedRulesStoredPayload, matchedRulesLeafPayload, {
  allowMissingDerivedMatchedRuleIds: true,
}), true);
assert.equal(isLegacyProjectedTripReplay({
  ...matchedRulesStoredPayload,
  weather_snapshot: {
    ...matchedRulesStoredPayload.weather_snapshot,
    matchedRuleIds: ['safe-rule'],
  },
}, matchedRulesLeafPayload, { allowMissingDerivedMatchedRuleIds: true }), false);
assert.equal(isLegacyProjectedTripReplay(matchedRulesStoredPayload, {
  ...matchedRulesLeafPayload,
  weather_snapshot: { matchedRuleIds: [] },
}, { allowMissingDerivedMatchedRuleIds: true }), false);
assert.equal(isLegacyProjectedTripReplay(matchedRulesStoredPayload, {
  ...matchedRulesLeafPayload,
  result: 'good',
  found: true,
}, { allowMissingDerivedMatchedRuleIds: true }), false);
assert.equal(isLegacyProjectedTripReplay({
  ...matchedRulesStoredPayload,
  schema_version: 2,
}, {
  ...matchedRulesLeafPayload,
  schema_version: 2,
}, { allowMissingDerivedMatchedRuleIds: true }), false);
const matchedRulesDigestPayload = { ...matchedRulesStoredPayload };
delete matchedRulesDigestPayload.submitted_at;
const matchedRulesPayloadSha256 = await sha256Hex(canonicalJson(matchedRulesDigestPayload));
const matchedRulesShardDigest = await sha256Hex(matchedRulesTripId);
const matchedRulesShardIndex = Number.parseInt(matchedRulesShardDigest.slice(0, 8), 16) % 10;
const matchedRulesDatabase = env[`TRIP_DB_${matchedRulesShardIndex}`];
matchedRulesDatabase.rows.set(matchedRulesClientId, {
  storageSchemaVersion: 1,
  ownerSubject: userOwner.subject,
  ownerKind: userOwner.kind,
  tripId: matchedRulesTripId,
  clientId: matchedRulesClientId,
  observedAt: matchedRulesStoredPayload.observed_at,
  submittedAt: matchedRulesStoredPayload.submitted_at,
  payloadJson: canonicalJson(matchedRulesStoredPayload),
  payloadSha256: matchedRulesPayloadSha256,
  source: 'supabase-migration',
});
const matchedRulesPayloadBeforeReplay = matchedRulesDatabase.rows.get(matchedRulesClientId).payloadJson;
const matchedRulesHashBeforeReplay = matchedRulesDatabase.rows.get(matchedRulesClientId).payloadSha256;
const matchedRulesReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: matchedRulesLeafPayload,
  source: 'supabase-migration',
});
assert.equal(matchedRulesReplay.duplicate, true);
assert.equal(matchedRulesDatabase.rows.get(matchedRulesClientId).payloadJson, matchedRulesPayloadBeforeReplay);
assert.equal(matchedRulesDatabase.rows.get(matchedRulesClientId).payloadSha256, matchedRulesHashBeforeReplay);
for (const incompatibleReplay of [
  { source: 'live', owner: userOwner, payload: matchedRulesLeafPayload },
  {
    source: 'supabase-migration',
    owner: userOwner,
    payload: { ...matchedRulesLeafPayload, result: 'good', found: true },
  },
  {
    source: 'supabase-migration',
    owner: userOwner,
    payload: { ...matchedRulesLeafPayload, weather_snapshot: { matchedRuleIds: [] } },
  },
  {
    source: 'supabase-migration',
    owner: userOwner,
    payload: {
      ...matchedRulesLeafPayload,
      client_observation_id: 'abababab-abab-4bab-8bab-abababababab',
    },
  },
  {
    source: 'supabase-migration',
    owner: userOwner,
    payload: {
      ...matchedRulesLeafPayload,
      trip_id: 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd',
    },
  },
  { source: 'supabase-migration', owner: anonymousOwner, payload: matchedRulesLeafPayload },
]) {
  await assert.rejects(
    storeCloudflareTrip({ ...configuration, ...incompatibleReplay }),
    /TRIP_GATEWAY_UNAVAILABLE/,
  );
  assert.equal(matchedRulesDatabase.rows.get(matchedRulesClientId).payloadJson, matchedRulesPayloadBeforeReplay);
  assert.equal(matchedRulesDatabase.rows.get(matchedRulesClientId).payloadSha256, matchedRulesHashBeforeReplay);
}
matchedRulesDatabase.rows.get(matchedRulesClientId).payloadSha256 = '0'.repeat(64);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: matchedRulesLeafPayload,
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
assert.equal(matchedRulesDatabase.rows.get(matchedRulesClientId).payloadJson, matchedRulesPayloadBeforeReplay);
matchedRulesDatabase.rows.get(matchedRulesClientId).payloadSha256 = matchedRulesHashBeforeReplay;

function oneShotBarrier(target) {
  let arrived = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  return {
    active: true,
    get arrived() { return arrived; },
    async wait(value) {
      arrived += 1;
      if (arrived === target) {
        this.active = false;
        release();
      }
      await gate;
      return value;
    },
  };
}

function controlledOneShotBarrier() {
  let markArrived;
  let release;
  const arrived = new Promise(resolve => { markArrived = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  return {
    active: true,
    arrived,
    release() {
      this.active = false;
      release();
    },
    async wait() {
      markArrived();
      await gate;
    },
  };
}

const racingErasureOwnerId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const racingErasureOwner = await externalOwnerSubject({ userId: racingErasureOwnerId, secret });
const racingErasurePayload = {
  ...payload,
  user_id: racingErasureOwnerId,
  anonymous_id: null,
  client_observation_id: '12121212-1212-4212-8212-121212121212',
  trip_id: '13131313-1313-4313-8313-131313131313',
};
const racingErasureDigest = await sha256Hex(racingErasurePayload.trip_id);
const racingErasureDatabase = env[
  `TRIP_DB_${Number.parseInt(racingErasureDigest.slice(0, 8), 16) % 10}`
];
const racingErasureBarrier = controlledOneShotBarrier();
racingErasureDatabase.tripInsertBarrier = racingErasureBarrier;
const rowsBeforeRacingErasure = await countCloudflareTrips(configuration);
const racingStore = storeCloudflareTrip({
  ...configuration,
  owner: racingErasureOwner,
  payload: racingErasurePayload,
});
await racingErasureBarrier.arrived;
assert.equal(
  await deleteCloudflareTrips({ ...configuration, ownerSubject: racingErasureOwner.subject }),
  0,
);
racingErasureBarrier.release();
await assert.rejects(racingStore, /TRIP_GATEWAY_UNAVAILABLE/);
racingErasureDatabase.tripInsertBarrier = null;
assert.equal(env.TRIP_DB_0.tombstoneRows.has(racingErasureOwner.subject), true);
assert.equal(
  [...env.TRIP_DB_0.registryRows.values()].some(row => row.ownerSubject === racingErasureOwner.subject),
  false,
);
assert.equal(
  (await listCloudflareTrips({ ...configuration, ownerSubject: racingErasureOwner.subject, limit: 1 })).length,
  0,
);
assert.equal(await countCloudflareTrips(configuration), rowsBeforeRacingErasure);

const concurrentClientId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const concurrentTripCandidates = [
  '10000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
  '40000000-0000-4000-8000-000000000004',
];
const concurrentTripIndexes = [];
for (const id of concurrentTripCandidates) {
  const digest = await sha256Hex(id);
  concurrentTripIndexes.push(Number.parseInt(digest.slice(0, 8), 16) % 10);
}
const firstConcurrentTrip = concurrentTripCandidates[0];
const firstConcurrentIndex = concurrentTripIndexes[0];
const secondConcurrentPosition = concurrentTripIndexes.findIndex(index => index !== firstConcurrentIndex);
assert.ok(secondConcurrentPosition > 0, 'Concurrency fixture needs two different target shards.');
const secondConcurrentTrip = concurrentTripCandidates[secondConcurrentPosition];
const concurrentBarrier = oneShotBarrier(20);
for (let index = 0; index < 10; index += 1) env[`TRIP_DB_${index}`].tripQueryBarrier = concurrentBarrier;
const concurrentCountBefore = await countCloudflareTrips(configuration);
const concurrentResults = await Promise.allSettled([
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: { ...payload, client_observation_id: concurrentClientId, trip_id: firstConcurrentTrip },
  }),
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: { ...payload, client_observation_id: concurrentClientId, trip_id: secondConcurrentTrip },
  }),
]);
assert.equal(concurrentBarrier.arrived, 20);
assert.equal(concurrentResults.filter(result => result.status === 'fulfilled').length, 1);
assert.equal(concurrentResults.filter(result => result.status === 'rejected').length, 1);
assert.match(String(concurrentResults.find(result => result.status === 'rejected').reason), /TRIP_GATEWAY_UNAVAILABLE/);
assert.equal(await countCloudflareTrips(configuration), concurrentCountBefore + 1);
const concurrentRows = Object.values(env)
  .filter(value => value instanceof FakeD1Database)
  .flatMap(database => [...database.rows.values()])
  .filter(row => row.clientId === concurrentClientId);
assert.equal(concurrentRows.length, 1);
const concurrentReservations = [...env.TRIP_DB_0.registryRows.values()]
  .filter(row => row.clientId === concurrentClientId);
assert.equal(concurrentReservations.length, 1);
assert.deepEqual(
  Object.keys(concurrentReservations[0]).sort(),
  ['clientId', 'ownerSubject', 'payloadSha256', 'targetDatabaseIndex', 'tripId'].sort(),
);
assert.equal('payloadJson' in concurrentReservations[0], false);
const legacyReadback = (await listCloudflareTrips({
  ...configuration,
  ownerSubject: userOwner.subject,
  limit: 100,
})).find(row => row.client_observation_id === rawLegacyClientId);
assert.deepEqual(legacyReadback.weather_snapshot, projectedLegacySnapshot);
const schemaTwoReadback = (await listCloudflareTrips({
  ...configuration,
  ownerSubject: userOwner.subject,
  limit: 100,
})).find(row => row.client_observation_id === legacyReplayClientId);
assert.deepEqual(schemaTwoReadback.data_quality_flags, ['ravscore-evidence-trust-unattested']);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadJson, rawLegacyPayloadBeforeReplay);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256, rawLegacyHashBeforeReplay);

rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256 = '0'.repeat(64);
await assert.rejects(
  listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 100 }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256 = rawLegacyHashBeforeReplay;

const schemaTwoPayloadBeforeReadAudit = legacyDatabase.rows.get(legacyReplayClientId).payloadJson;
const schemaTwoHashBeforeReadAudit = legacyDatabase.rows.get(legacyReplayClientId).payloadSha256;
const unsafeSchemaTwoPayload = {
  ...JSON.parse(schemaTwoPayloadBeforeReadAudit),
  weather_snapshot: { schemaVersion: 4, gpsTrack: [[55.1, 12.2]] },
};
const unsafeSchemaTwoDigest = { ...unsafeSchemaTwoPayload };
delete unsafeSchemaTwoDigest.submitted_at;
legacyDatabase.rows.get(legacyReplayClientId).payloadJson = canonicalJson(unsafeSchemaTwoPayload);
legacyDatabase.rows.get(legacyReplayClientId).payloadSha256 = await sha256Hex(canonicalJson(unsafeSchemaTwoDigest));
await assert.rejects(
  listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 100 }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);

const invalidQualitySchemaTwoPayload = {
  ...JSON.parse(schemaTwoPayloadBeforeReadAudit),
  calibration_eligible: false,
  data_quality_flags: ['ravscore-reconstructed-derived-evidence'],
  calibration_features: { appVersion: '4.0.311', reasonCodes: [] },
};
const invalidQualitySchemaTwoDigest = { ...invalidQualitySchemaTwoPayload };
delete invalidQualitySchemaTwoDigest.submitted_at;
legacyDatabase.rows.get(legacyReplayClientId).payloadJson = canonicalJson(invalidQualitySchemaTwoPayload);
legacyDatabase.rows.get(legacyReplayClientId).payloadSha256 = await sha256Hex(canonicalJson(invalidQualitySchemaTwoDigest));
await assert.rejects(
  listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 100 }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
legacyDatabase.rows.get(legacyReplayClientId).payloadJson = schemaTwoPayloadBeforeReadAudit;
legacyDatabase.rows.get(legacyReplayClientId).payloadSha256 = schemaTwoHashBeforeReadAudit;
const rowsBeforeRejectedReplays = await countCloudflareTrips(configuration);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: { ...rawLegacySource, result: 'good', found: true },
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: anonymousOwner,
    payload: rawLegacySource,
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: { ...rawLegacySource, client_observation_id: '99999999-9999-4999-8999-999999999999' },
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: { ...rawLegacySource, trip_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE/,
);
assert.equal(await countCloudflareTrips(configuration), rowsBeforeRejectedReplays);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadJson, rawLegacyPayloadBeforeReplay);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256, rawLegacyHashBeforeReplay);

const schemaSql = fs.readFileSync('cloudflare/trip-gateway/migrations/001_trip_observations.sql', 'utf8');
for (const marker of [
  'owner_subject',
  'payload_sha256',
  'client_observation_id',
  'trip_observations_owner_time',
  'trip_observation_registry',
  'target_database_index',
  'trip_owner_erasure_tombstones',
  'trip_storage_control',
]) {
  assert.match(schemaSql, new RegExp(marker));
  assert.ok(D1_TRIP_SCHEMA_STATEMENTS.some(statement => statement.includes(marker)));
}
assert.doesNotMatch(schemaSql, /\b(?:user_id|anonymous_id|email|gps|route)\b/i);
assert.doesNotMatch(schemaSql.match(/create table if not exists trip_observation_registry[\s\S]*?\);/i)?.[0] || '', /payload_json|weather_snapshot|coordinates|\bu\b|\bv\b/i);
assert.doesNotMatch(schemaSql.match(/create table if not exists trip_owner_erasure_tombstones[\s\S]*?\);/i)?.[0] || '', /payload_json|weather_snapshot|coordinates|\bu\b|\bv\b/i);
assert.doesNotMatch(schemaSql.match(/create table if not exists trip_storage_control[\s\S]*?\);/i)?.[0] || '', /payload_json|weather_snapshot|coordinates|owner_subject|\bu\b|\bv\b/i);

const worker = fs.readFileSync('cloudflare/trip-gateway/worker.js', 'utf8');
const tripStore = fs.readFileSync('supabase/functions/_shared/trip-store.ts', 'utf8');
const submitFunction = fs.readFileSync('supabase/functions/submit-observation/index.ts', 'utf8');
const tripLogFunction = fs.readFileSync('supabase/functions/trip-log/index.ts', 'utf8');
const preparation = fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs', 'utf8');
const legacyClassification = fs.readFileSync('scripts/lib/trip-storage-legacy-classification.mjs', 'utf8');
const activationMarker = fs.readFileSync('scripts/mark-cloudflare-trip-storage-activation.mjs', 'utf8');
const capacityAudit = fs.readFileSync('scripts/audit-cloudflare-trip-storage.mjs', 'utf8');
assert.match(worker, /Array\.from\(\{ length: 10 \}/);
assert.match(worker, /verifyTripGatewaySignature/);
assert.match(submitFunction, /assertNoPrivateLocation\(payload\.weather_snapshot\)/);
assert.match(submitFunction, /assertNoPrivateLocation\(payload\.calibration_features\)/);
assert.match(submitFunction, /assertExternalTripNestedContract\(payload\)/);
assert.match(submitFunction, /projectLegacyExternalTripPayload/);
assert.match(worker, /deleteOwnerTrips/);
assert.match(preparation, /jurisdiction: 'eu'/);
assert.match(preparation, /d1_activation_attempted/);
assert.match(preparation, /legacy_d1_detected/);
assert.match(preparation, /classifyExistingTripStorageDatabases/);
assert.match(preparation, /verifyLegacyActivationEvidence/);
assert.match(legacyClassification, /TRIP_STORAGE_REQUIRED_SHARD_NAMES/);
assert.match(legacyClassification, /existingDatabases\.length === 0/);
assert.match(legacyClassification, /existingDatabases\.length !== TRIP_STORAGE_SHARD_COUNT/);
assert.match(legacyClassification, /33024408547/);
assert.match(legacyClassification, /5c7f774d3f09a527628d97e08c3900d49eb41a89/);
assert.match(preparation, /GITHUB_OUTPUT/);
assert.match(activationMarker, /insert into trip_storage_control/);
assert.match(activationMarker, /d1_activation_attempted=true/);
assert.doesNotMatch(activationMarker, /payload_json|weather_snapshot|owner_subject|user_id|anonymous_id/);
assert.match(capacityAudit, /Number\(database\?\.file_size\)/);
assert.doesNotMatch(capacityAudit, /file_size\s*\|\|\s*0/);
assert.match(tripStore, /TRIP_STORAGE_MODE/);
assert.match(tripStore, /value\.startsWith\("maintenance:"\)/);
assert.match(tripStore, /TRIP_STORAGE_MAINTENANCE_MAX_LEASE_MS/);
assert.match(tripStore, /now >= deadline/);
assert.match(tripStore, /TRIP_STORAGE_MAINTENANCE/);
assert.match(tripStore, /TRIP_PSEUDONYM_SECRET_V1/);
assert.match(tripStore, /TRIP_GATEWAY_SHARED_SECRET/);
assert.match(tripStore, /storeInSupabase/);
assert.match(tripStore, /storeInSupabase\(safePayload\)/);
assert.match(tripStore, /projectLegacyExternalTripPayload/);
assert.match(submitFunction, /storeObservation/);
assert.match(submitFunction, /const boundUserId = userId && payload\.user_id === userId \? userId : null/);
assert.match(tripLogFunction, /requireAuthenticatedUserId/);
assert.match(tripLogFunction, /listOwnTripObservations/);
console.log('Hybrid turlagring: EU-D1-sharding, pseudonymisering, HMAC, global idempotens og ejer-sletningstombstones består.');
