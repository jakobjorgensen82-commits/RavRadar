import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { buildAccountTripReport, toAccountObservationColumns } from '../js/services/account-trip-report-contract.js';
import { applySchema } from './prepare-cloudflare-trip-storage.mjs';
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
  exportCloudflareTripPage,
  createTripExportCursor,
  readTripExportCursor,
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
// Explicit test-only selection; no flag still runs every historical case below.
if (process.argv.includes('--real-sqlite-export-only')) {
  await checkRealSqliteSignedExport({ payload, userOwner, secret, gatewaySecret, gatewayUrl });
} else if (process.argv.includes('--service-key-headers-only')) {
  await checkServiceKeyHeadersOnly();
} else {
await checkServiceKeyHeadersOnly();
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
assert.deepEqual(TRIP_INPUT_FIELD_NAMES, [...tripInputFieldNames4010, 'observation_origin']);
assert.equal(Object.hasOwn(external, 'observation_origin'), false, 'Legacy absence is not retagged as new provenance.');
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
  calibration_eligible: false,
  calibration_features: { reasonCodes: ['ravscore-history-incomplete'] },
  data_quality_flags: ['ravscore-history-incomplete'],
}), /TRIP_DATA_QUALITY_FLAGS_INVALID/,
'HISTORY_INCOMPLETE belongs only to the integrated schema-3 contract, never historical schema 2');
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
          trip_export_version: 1,
          shards: 10,
        }
      : { ok: false }), { status: healthy ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
  },
});
assert.equal(healthAttempts, 3);
assert.equal(eventualHealth.body?.ok, true);
assert.ok(WORKER_HEALTH_RETRY_DELAYS_MS.length >= 2);
assert.ok(WORKER_HEALTH_RETRY_DELAYS_MS.reduce((sum, delay) => sum + delay, 0) <= 60_000);

// The old healthy Worker receipt must not admit a new export installation.
let exportHealthAttempts = 0;
const exportHealth = await waitForWorkerHealth({
  gatewayUrl, retryDelaysMs: [0, 0],
  fetchImpl: async () => {
    exportHealthAttempts += 1;
    return Response.json({ ...eventualHealth.body,
      trip_export_version: exportHealthAttempts === 1 ? undefined : 1 });
  },
});
assert.equal(exportHealthAttempts, 2, 'Old 4.0.311 health without export capability must not pass');
assert.equal(exportHealth.body.trip_export_version, 1);
assert.equal(exportHealth.verified, true);
for (const version of [undefined, 0, 2, '1']) {
  const unavailableExport = await waitForWorkerHealth({
    gatewayUrl, retryDelaysMs: [0, 0],
    fetchImpl: async () => Response.json({ ...eventualHealth.body, trip_export_version: version }),
  });
  assert.equal(unavailableExport.verified, false, 'A retained old/mismatched health body is not a verified receipt');
}

function edgeAttestationResponse(mode) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://ravradar.dk',
      'X-RavRadar-Trip-Contract-Version': '4.0.311',
      'X-RavRadar-Trip-Storage-Mode': mode,
      'X-RavRadar-Trip-Export-Version': '1',
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

for (const version of [null, '0', '2', '01']) {
  const oldEdge = await waitForTripStorageEdgeReadiness({
    baseUrl: 'https://example.supabase.co', publishableKey: 'synthetic-publishable-key',
    expectedStorageMode: 'd1', retryDelaysMs: [0, 0],
    fetchImpl: async input => {
      const response = edgeAttestationResponse('d1');
      if (String(input).includes('/trip-log?')) {
        if (version === null) response.headers.delete('X-RavRadar-Trip-Export-Version');
        else response.headers.set('X-RavRadar-Trip-Export-Version', version);
      }
      return response;
    },
  });
  assert.equal(oldEdge.ok, false, 'Old/absent/wrong Edge export capability cannot become ready');
  assert.deepEqual(oldEdge.functionStatus, { 'submit-observation': true, 'trip-log': false });
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
    this.countFailure = false;
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
                createdAt: new Date().toISOString(),
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
            if (normalized.includes('select client_observation_id, owner_subject, created_at')) {
              const [ownerSubject, after, cutoff, limit] = args;
              const result = {
                success: true,
                results: [...database.rows.values()]
                  .filter(row => row.ownerSubject === ownerSubject && row.clientId > after && row.createdAt <= cutoff)
                  .sort((a, b) => a.clientId < b.clientId ? -1 : 1)
                  .slice(0, limit)
                  .map(row => ({ client_observation_id: row.clientId, owner_subject: row.ownerSubject,
                    created_at: row.createdAt, payload_json: row.payloadJson, payload_sha256: row.payloadSha256 })),
              };
              return database.exportQueryBarrier ? database.exportQueryBarrier(result) : result;
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
        if (database.countFailure) throw new Error('PRIVATE_SYNTHETIC_COUNT_FAILURE');
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
  trip_export_version: 1,
  shards: 10,
});
assert.equal((await waitForWorkerHealth({ gatewayUrl, retryDelaysMs: [0],
  fetchImpl: (input, init) => handleRequest(new Request(input, init), {}),
})).verified, true, 'Actual Worker capability verifies without reading any owner or database');
const unsigned = await handleRequest(new Request(`${gatewayUrl}/v1/trips/count`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
}), env);
assert.equal(unsigned.status, 401);

env.TRIP_DB_4.countFailure = true;
const failingCountTimestamp = String(Date.now());
const failingCountBody = '{}';
const failingCountSignature = await tripGatewaySignature({
  secret: gatewaySecret,
  timestamp: failingCountTimestamp,
  method: 'POST',
  pathname: '/v1/trips/count',
  bodyText: failingCountBody,
});
const unavailableCount = await handleRequest(new Request(`${gatewayUrl}/v1/trips/count`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-RavRadar-Signature': failingCountSignature,
    'X-RavRadar-Timestamp': failingCountTimestamp,
  },
  body: failingCountBody,
}), env);
assert.equal(unavailableCount.status, 503);
assert.deepEqual(await unavailableCount.json(), { ok: false, error: 'COUNT_UNAVAILABLE' });
env.TRIP_DB_4.countFailure = false;

const configuration = { gatewayUrl, sharedSecret: gatewaySecret, fetchImpl: workerFetch, now: Date.now() };
for (const [status, body, category] of [
  [401, { ok: false, error: 'UNAUTHORIZED', detail: 'untrusted-detail' }, 'AUTH'],
  [400, { ok: false, error: 'INVALID_REQUEST', detail: 'untrusted-detail' }, 'REQUEST_REJECTED'],
  [409, { ok: false, error: 'TRIP_IDEMPOTENCY_CONFLICT', detail: 'untrusted-detail' }, 'IDEMPOTENCY_CONFLICT'],
  [429, { ok: false, error: 'RATE_LIMITED', detail: 'untrusted-detail' }, 'RATE_LIMITED'],
  [503, { ok: false, error: 'TEMPORARY', detail: 'untrusted-detail' }, 'UNAVAILABLE'],
]) {
  await assert.rejects(
    storeCloudflareTrip({
      ...configuration,
      owner: userOwner,
      payload,
      fetchImpl: async () => new Response(JSON.stringify(body), { status }),
    }),
    error => error?.message === `TRIP_GATEWAY_UNAVAILABLE:${category}`,
  );
}
for (const [status, errorCode] of [
  [401, 'NOT_THE_AUTH_CODE'],
  [400, 'NOT_THE_REQUEST_CODE'],
  [409, 'NOT_THE_CONFLICT_CODE'],
]) {
  await assert.rejects(
    storeCloudflareTrip({
      ...configuration,
      owner: userOwner,
      payload,
      fetchImpl: async () => new Response(JSON.stringify({
        ok: false,
        error: errorCode,
        detail: 'untrusted-detail',
      }), { status }),
    }),
    error => error?.message === 'TRIP_GATEWAY_UNAVAILABLE:HTTP_ERROR',
  );
}
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload,
    fetchImpl: async () => new Response('untrusted-malformed-5xx-detail', { status: 503 }),
  }),
  error => error?.message === 'TRIP_GATEWAY_UNAVAILABLE:UNAVAILABLE',
);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload,
    fetchImpl: async () => new Response(JSON.stringify({
      ok: false,
      error: 'synthetic-unallowlisted-detail-must-not-escape',
    }), { status: 418 }),
  }),
  error => error?.message === 'TRIP_GATEWAY_UNAVAILABLE:HTTP_ERROR',
);
for (const response of [
  new Response('untrusted-success-body-sentinel', { status: 200 }),
  new Response(JSON.stringify({
    ok: false,
    error: 'untrusted-success-json-sentinel',
  }), { status: 200 }),
]) {
  await assert.rejects(
    storeCloudflareTrip({
      ...configuration,
      owner: userOwner,
      payload,
      fetchImpl: async () => response,
    }),
    error => (
      error?.message === 'TRIP_GATEWAY_INVALID_RESPONSE'
      && !error.message.includes('sentinel')
    ),
  );
}
const gatewayDeadlineController = new AbortController();
const timedGatewayStore = storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload,
  fetchImpl: createBoundedFetch({
    fetchImpl: pendingUntilAbort,
    timeoutMs: 1_234,
    timeoutSignalFactory: () => gatewayDeadlineController.signal,
  }),
});
gatewayDeadlineController.abort(new DOMException('synthetic gateway deadline', 'TimeoutError'));
await assert.rejects(timedGatewayStore, error => (
  error?.code === TRIP_STORAGE_NETWORK_TIMEOUT_CODE
  && error?.cause?.name === 'TimeoutError'
));
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
  /TRIP_GATEWAY_UNAVAILABLE:IDEMPOTENCY_CONFLICT/,
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
  calibration_features: {
    appVersion: '4.0.310',
    totalScore: 50,
    reasonCodes: [],
  },
  weather_snapshot: {
    schemaVersion: 4,
    provider: 'DMI',
    current: { windSpeedMps: 7.5 },
    score: { finalScore: 50 },
    prediction: { modelVersion: 'candidate-g' },
    matchedRuleIds: ['rule-safe'],
    calibrationFeatures: {
      appVersion: '4.0.310',
      totalScore: 50,
      reasonCodes: [],
    },
  },
  data_quality_flags: [],
};
const normalizedReplayPayload = externalTripPayload(legacyReplaySource);
const legacyStoredPayload = {
  ...normalizedReplayPayload,
  calibration_eligible: true,
  calibration_features: {
    ...legacyReplaySource.calibration_features,
    waveHeightM: null,
  },
  weather_snapshot: {
    ...legacyReplaySource.weather_snapshot,
    current: {
      ...legacyReplaySource.weather_snapshot.current,
      waveHeightM: null,
    },
    score: {
      ...legacyReplaySource.weather_snapshot.score,
      baseScore: null,
    },
    prediction: {
      ...legacyReplaySource.weather_snapshot.prediction,
      probability: null,
    },
    calibrationFeatures: {
      ...legacyReplaySource.weather_snapshot.calibrationFeatures,
      waveHeightM: null,
    },
  },
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
const incomingLegacyRecord = await externalTripRecord({
  owner: userOwner,
  payload: legacyReplaySource,
  source: 'supabase-migration',
});
assert.notEqual(
  legacyPayloadSha256,
  incomingLegacyRecord.payload_sha256,
  'Regressionen skal ramme kompatibilitetsgrenen, ikke den almindelige hash-lige dubletvej.',
);
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
env.TRIP_DB_0.registryRows.set(legacyReplayClientId, {
  clientId: legacyReplayClientId,
  tripId: legacyReplayTripId,
  ownerSubject: userOwner.subject,
  payloadSha256: legacyPayloadSha256,
  targetDatabaseIndex: legacyShardIndex,
});
const legacyPayloadBeforeReplay = legacyDatabase.rows.get(legacyReplayClientId).payloadJson;
const legacyHashBeforeReplay = legacyDatabase.rows.get(legacyReplayClientId).payloadSha256;
const legacyRowBeforeReplay = structuredClone(
  legacyDatabase.rows.get(legacyReplayClientId),
);
const legacyRegistryBeforeReplay = structuredClone(
  env.TRIP_DB_0.registryRows.get(legacyReplayClientId),
);
const legacyRegistrySizeBeforeReplay = env.TRIP_DB_0.registryRows.size;
const legacyReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: legacyReplaySource,
  source: 'supabase-migration',
});
assert.equal(legacyReplay.duplicate, true);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadJson, legacyPayloadBeforeReplay);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadSha256, legacyHashBeforeReplay);
assert.deepEqual(
  env.TRIP_DB_0.registryRows.get(legacyReplayClientId),
  legacyRegistryBeforeReplay,
);
assert.deepEqual(legacyDatabase.rows.get(legacyReplayClientId), legacyRowBeforeReplay);
assert.equal(env.TRIP_DB_0.registryRows.size, legacyRegistrySizeBeforeReplay);
const repeatedLegacyReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: legacyReplaySource,
  source: 'supabase-migration',
});
assert.equal(repeatedLegacyReplay.duplicate, true);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadJson, legacyPayloadBeforeReplay);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadSha256, legacyHashBeforeReplay);
assert.deepEqual(
  env.TRIP_DB_0.registryRows.get(legacyReplayClientId),
  legacyRegistryBeforeReplay,
);
assert.deepEqual(legacyDatabase.rows.get(legacyReplayClientId), legacyRowBeforeReplay);
assert.equal(env.TRIP_DB_0.registryRows.size, legacyRegistrySizeBeforeReplay);
env.TRIP_DB_0.registryRows.get(legacyReplayClientId).payloadSha256 = 'f'.repeat(64);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: legacyReplaySource,
    source: 'supabase-migration',
  }),
  /TRIP_GATEWAY_UNAVAILABLE:IDEMPOTENCY_CONFLICT/,
);
assert.deepEqual(legacyDatabase.rows.get(legacyReplayClientId), legacyRowBeforeReplay);
assert.equal(env.TRIP_DB_0.registryRows.size, legacyRegistrySizeBeforeReplay);
env.TRIP_DB_0.registryRows.set(
  legacyReplayClientId,
  structuredClone(legacyRegistryBeforeReplay),
);
await assert.rejects(
  storeCloudflareTrip({
    ...configuration,
    owner: userOwner,
    payload: legacyReplaySource,
    source: 'live',
  }),
  /TRIP_GATEWAY_UNAVAILABLE:IDEMPOTENCY_CONFLICT/,
);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadJson, legacyPayloadBeforeReplay);
assert.equal(legacyDatabase.rows.get(legacyReplayClientId).payloadSha256, legacyHashBeforeReplay);
assert.deepEqual(
  env.TRIP_DB_0.registryRows.get(legacyReplayClientId),
  legacyRegistryBeforeReplay,
);
assert.deepEqual(legacyDatabase.rows.get(legacyReplayClientId), legacyRowBeforeReplay);
assert.equal(env.TRIP_DB_0.registryRows.size, legacyRegistrySizeBeforeReplay);
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
  calibration_features: {
    appVersion: '4.0.310',
    totalScore: 50,
  },
};
const safeLegacyMigrationPayload = externalTripPayload(rawLegacySource);
assert.deepEqual(safeLegacyMigrationPayload.weather_snapshot, projectedLegacySnapshot);
const rawLegacyStoredPayload = externalTripPayload({ ...rawLegacySource, weather_snapshot: null });
rawLegacyStoredPayload.weather_snapshot = structuredClone(legacyFreeformSnapshot);
rawLegacyStoredPayload.calibration_features = {
  ...rawLegacySource.calibration_features,
  waveHeightM: null,
  legacyDiagnostic: 'discarded-by-bounded-projection',
  geohash: 'discarded-private-location-alias',
};
assert.equal(isLegacyProjectedTripReplay(rawLegacyStoredPayload, safeLegacyMigrationPayload), true);
assert.equal(isLegacyCompatibleTripReplay(rawLegacyStoredPayload, safeLegacyMigrationPayload), true);
assert.equal(isLegacyProjectedTripReplay(safeLegacyMigrationPayload, safeLegacyMigrationPayload), false);
assert.equal(isLegacyProjectedTripReplay(rawLegacyStoredPayload, {
  ...safeLegacyMigrationPayload,
  result: 'good',
  found: true,
}), false);
assert.equal(isLegacyProjectedTripReplay(rawLegacyStoredPayload, {
  ...safeLegacyMigrationPayload,
  calibration_features: {
    ...safeLegacyMigrationPayload.calibration_features,
    totalScore: 51,
  },
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
const rawLegacyRowBeforeReplay = structuredClone(
  rawLegacyDatabase.rows.get(rawLegacyClientId),
);
const rawLegacyRegistrySizeBeforeReplay = env.TRIP_DB_0.registryRows.size;
const rawLegacyReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: rawLegacySource,
  source: 'supabase-migration',
});
assert.equal(rawLegacyReplay.duplicate, true);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadJson, rawLegacyPayloadBeforeReplay);
assert.equal(rawLegacyDatabase.rows.get(rawLegacyClientId).payloadSha256, rawLegacyHashBeforeReplay);
assert.deepEqual(rawLegacyDatabase.rows.get(rawLegacyClientId), rawLegacyRowBeforeReplay);
assert.equal(env.TRIP_DB_0.registryRows.size, rawLegacyRegistrySizeBeforeReplay + 1);
const repairedRawLegacyRegistry = structuredClone(
  env.TRIP_DB_0.registryRows.get(rawLegacyClientId),
);
assert.deepEqual(repairedRawLegacyRegistry, {
  clientId: rawLegacyClientId,
  tripId: rawLegacyTripId,
  ownerSubject: userOwner.subject,
  payloadSha256: rawLegacyPayloadSha256,
  targetDatabaseIndex: rawLegacyShardIndex,
});
const repeatedRawLegacyReplay = await storeCloudflareTrip({
  ...configuration,
  owner: userOwner,
  payload: rawLegacySource,
  source: 'supabase-migration',
});
assert.equal(repeatedRawLegacyReplay.duplicate, true);
assert.deepEqual(rawLegacyDatabase.rows.get(rawLegacyClientId), rawLegacyRowBeforeReplay);
assert.equal(env.TRIP_DB_0.registryRows.size, rawLegacyRegistrySizeBeforeReplay + 1);
assert.deepEqual(
  env.TRIP_DB_0.registryRows.get(rawLegacyClientId),
  repairedRawLegacyRegistry,
);

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
for (const unknownValue of [null, 'unexpected-stored-value']) {
  const unknownTopLevelSchemaTwoPayload = {
    ...JSON.parse(schemaTwoPayloadBeforeReadAudit),
    unknown_stored_field: unknownValue,
  };
  const unknownTopLevelSchemaTwoDigest = { ...unknownTopLevelSchemaTwoPayload };
  delete unknownTopLevelSchemaTwoDigest.submitted_at;
  legacyDatabase.rows.get(legacyReplayClientId).payloadJson =
    canonicalJson(unknownTopLevelSchemaTwoPayload);
  legacyDatabase.rows.get(legacyReplayClientId).payloadSha256 =
    await sha256Hex(canonicalJson(unknownTopLevelSchemaTwoDigest));
  await assert.rejects(
    listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 100 }),
    /TRIP_GATEWAY_UNAVAILABLE:REQUEST_REJECTED/,
  );
}
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
// Real SQLite planning of the ACTUAL normal export query, not FakeD1's JS
// sort. Only artificial SQL rows in memory; not real D1/Worker CPU capacity.
const exportKeysetSql = worker.match(/`(select client_observation_id, owner_subject, created_at, payload_json, payload_sha256 from trip_observations[\s\S]*?limit \?)`/)?.[1];
assert.ok(exportKeysetSql);
const exportIndexSql = D1_TRIP_SCHEMA_STATEMENTS.find(sql => sql.includes('trip_observations_owner_export'));
const exportIndexMigration = fs.readFileSync('cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql', 'utf8');
const normalizedSql = sql => sql.replace(/^--[^\n]*\r?\n/gm, '').trim().replace(/;$/, '').replace(/\s+/g, ' ');
assert.equal(normalizedSql(exportIndexMigration), normalizedSql(exportIndexSql));
assert.match(normalizedSql(exportIndexSql), /^create index if not exists trip_observations_owner_export on trip_observations\(owner_subject, client_observation_id, created_at\)$/);
const exportSqlite = new DatabaseSync(':memory:');
try {
  // The historical migration stays untouched; the additive candidate is then
  // applied twice in memory through the same statement as normal preparation.
  exportSqlite.exec(schemaSql);
  const insert = exportSqlite.prepare(`insert into trip_observations
    (owner_subject,owner_kind,client_observation_id,observed_at,submitted_at,payload_json,payload_sha256,source,created_at)
    values(?,?,?,?,?,?,?,?,?)`);
  const sqlOwner = 'usr_v1_' + 'A'.repeat(43), sqlOtherOwner = 'usr_v1_' + 'B'.repeat(43);
  const cutoff = '2026-10-01T00:00:00.000Z', oldAt = '2026-08-01T00:00:00.000Z';
  const sqlId = index => `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
  exportSqlite.exec('begin');
  for (let index = 0; index < 10400; index++) insert.run(
    index < 10200 ? sqlOwner : sqlOtherOwner, 'user', sqlId(index),
    new Date(Date.parse(oldAt) + (10400 - index) * 1000).toISOString(), oldAt,
    '{}', '0'.repeat(64), 'live', index >= 10000 && index < 10200 ? '2026-10-02T00:00:00.000Z' : oldAt,
  );
  exportSqlite.exec('commit');
  const allOriginals = exportSqlite.prepare('select * from trip_observations order by client_observation_id');
  const originalRows = canonicalJson(allOriginals.all());
  const oldPlan = exportSqlite.prepare('explain query plan ' + exportKeysetSql).all(sqlOwner, '', cutoff, 201);
  assert.ok(oldPlan.some(row => row.detail.includes('TEMP B-TREE')),
    'The original display index requires a separate export sort.');
  exportSqlite.exec(exportIndexSql); exportSqlite.exec(exportIndexSql);
  for (const afterOrdinal of [0, 8000]) {
    const after = afterOrdinal === 0 ? '' : sqlId(afterOrdinal - 1);
    const plan = exportSqlite.prepare('explain query plan ' + exportKeysetSql).all(sqlOwner, after, cutoff, 201);
    assert.ok(plan.some(row => row.detail.includes('trip_observations_owner_export')));
    assert.equal(plan.some(row => row.detail.includes('TEMP B-TREE')), false);
    const selected = exportSqlite.prepare(exportKeysetSql).all(sqlOwner, after, cutoff, 201);
    assert.deepEqual(selected.map(row => row.client_observation_id),
      Array.from({ length: 201 }, (_, index) => sqlId(afterOrdinal + index)));
    assert.ok(selected.every(row => row.owner_subject === sqlOwner && row.created_at === oldAt));
  }
  assert.equal(canonicalJson(allOriginals.all()), originalRows, 'All 10400 original SQL rows remain exactly unchanged.');
  const displayPlan = exportSqlite.prepare(`explain query plan
    select payload_json, payload_sha256, observed_at from trip_observations
    where owner_subject = ? order by observed_at desc limit ?`).all(sqlOwner, 100);
  assert.ok(displayPlan.some(row => row.detail.includes('trip_observations_owner_time')),
    'The existing display-list index is preserved.');
  assert.equal(displayPlan.some(row => row.detail.includes('TEMP B-TREE')), false);
} finally { exportSqlite.close(); }

// Exercise the normal installer's schema writes AND metadata readback against
// real, empty in-memory SQLite shards. No D1 account or private row is queried.
async function checkInstalledExportIndex({ existingIndex = '', removeIndex = false, invalidReadback = false } = {}) {
  const shards = Array.from({ length: 10 }, (_, index) => ({ name: `synthetic-shard-${index}`, uuid: `synthetic-${index}` }));
  const sqliteShards = shards.map(() => new DatabaseSync(':memory:'));
  const metadataReads = [];
  let altered = false;
  try {
    for (const database of sqliteShards) database.exec(schemaSql);
    if (existingIndex) sqliteShards[0].exec(existingIndex);
    await applySchema(shards, { query: async (pathname, init) => {
      const index = Number(pathname.match(/^\/d1\/database\/synthetic-(\d)\/query$/)?.[1]);
      assert.ok(Number.isInteger(index) && index >= 0 && index < 10);
      assert.equal(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body), ['sql']);
      const database = sqliteShards[index];
      if (/^pragma /i.test(body.sql)) {
        metadataReads.push([index, body.sql]);
        if (index === 0 && removeIndex && !altered) {
          database.exec('drop index trip_observations_owner_export'); altered = true;
        }
        const results = database.prepare(body.sql).all().map(row => ({ ...row }));
        return { success: true, result: invalidReadback ? [] : [{ success: true, results }] };
      }
      assert.ok(D1_TRIP_SCHEMA_STATEMENTS.includes(body.sql), 'Only the normal additive schema statements may be executed');
      database.exec(body.sql);
      return { success: true, result: [{ success: true, results: [] }] };
    } });
    return metadataReads;
  } finally { for (const database of sqliteShards) database.close(); }
}
const wrongOrderIndex = 'create index trip_observations_owner_export on trip_observations(owner_subject, created_at, client_observation_id)';
await assert.rejects(checkInstalledExportIndex({ existingIndex: wrongOrderIndex }), /TRIP_EXPORT_INDEX_READBACK_INVALID/,
  'CREATE IF NOT EXISTS success must not acknowledge an existing same-name wrong index');
const indexMetadataReads = await checkInstalledExportIndex();
assert.equal(indexMetadataReads.length, 20, 'Every one of ten normal shards requires both metadata readbacks');
assert.deepEqual([...new Set(indexMetadataReads.map(([index]) => index))], Array.from({ length: 10 }, (_, index) => index));
for (const existingIndex of [
  'create index trip_observations_owner_export on trip_observations(owner_subject, client_observation_id)',
  'create index trip_observations_owner_export on trip_observations(owner_subject, client_observation_id, created_at, observed_at)',
  'create index trip_observations_owner_export on trip_observations(owner_subject collate nocase, client_observation_id, created_at)',
  'create index trip_observations_owner_export on trip_observations(owner_subject desc, client_observation_id, created_at)',
  'create unique index trip_observations_owner_export on trip_observations(owner_subject, client_observation_id, created_at)',
  'create index trip_observations_owner_export on trip_observations(owner_subject, client_observation_id, created_at) where owner_subject is not null',
  'create table other(owner_subject, client_observation_id, created_at); create index trip_observations_owner_export on other(owner_subject, client_observation_id, created_at)',
]) await assert.rejects(checkInstalledExportIndex({ existingIndex }), /TRIP_EXPORT_INDEX_READBACK_INVALID/);
await assert.rejects(checkInstalledExportIndex({ removeIndex: true }), /TRIP_EXPORT_INDEX_READBACK_INVALID/);
await assert.rejects(checkInstalledExportIndex({ invalidReadback: true }), /TRIP_EXPORT_INDEX_READBACK_INVALID/);
const tripStore = fs.readFileSync('supabase/functions/_shared/trip-store.ts', 'utf8');
const submitFunction = fs.readFileSync('supabase/functions/submit-observation/index.ts', 'utf8');
const tripLogFunction = fs.readFileSync('supabase/functions/trip-log/index.ts', 'utf8');
const preparation = fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs', 'utf8');
const legacyClassification = fs.readFileSync('scripts/lib/trip-storage-legacy-classification.mjs', 'utf8');
const activationMarker = fs.readFileSync('scripts/mark-cloudflare-trip-storage-activation.mjs', 'utf8');
const capacityAudit = fs.readFileSync('scripts/audit-cloudflare-trip-storage.mjs', 'utf8');
assert.match(worker, /Array\.from\(\{ length: 10 \}/);
assert.match(worker, /verifyTripGatewaySignature/);
const workerCountFunction = worker.match(/async function countTrips\(env\) \{[\s\S]*?(?=\nasync function deleteOwnerTrips)/)?.[0] || '';
assert.match(workerCountFunction, /select count\(\*\) as trip_count from trip_observations/i);
assert.doesNotMatch(workerCountFunction, /\b(?:insert|update|delete|replace|upsert|run)\b/i);
assert.match(
  worker,
  /if \(url\.pathname === '\/v1\/trips\/count'\) \{[\s\S]*?return json\(503, \{ ok: false, error: 'COUNT_UNAVAILABLE' \}\);/,
);
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
// Read-only export exercises the real worker and signed client across all ten
// synthetic shards. No live account, credential, database or user row is used.
const exportEnv = { TRIP_GATEWAY_SHARED_SECRET: gatewaySecret };
for (let index = 0; index < 10; index += 1) exportEnv[`TRIP_DB_${index}`] = new FakeD1Database();
const exportIds = Array.from({ length: 501 }, (_, index) => `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
async function exportFixture(id, owner = userOwner, createdAt = '2000-01-01T00:00:00.000Z') {
  const record = await externalTripRecord({ owner, payload: { ...payload, client_observation_id: id, trip_id: null } });
  return { ownerSubject: owner.subject, clientId: id, createdAt,
    payloadJson: record.payload_json, payloadSha256: record.payload_sha256, observedAt: record.observed_at };
}
for (let index = 0; index < exportIds.length; index += 1) {
  exportEnv[`TRIP_DB_${index % 10}`].rows.set(exportIds[index], await exportFixture(exportIds[index]));
}
const otherOwner = await externalOwnerSubject({ userId: anonymousId, secret });
const otherId = 'b0000000-0000-4000-8000-000000000001';
exportEnv.TRIP_DB_1.rows.set(otherId, await exportFixture(otherId, otherOwner));
const futureId = 'c0000000-0000-4000-8000-000000000001';
exportEnv.TRIP_DB_2.rows.set(futureId, await exportFixture(futureId, userOwner, new Date(Date.now() + 3_600_000).toISOString()));
const exportFetch = (input, init) => handleRequest(new Request(input, init), exportEnv);
const exportRead = cursor => exportCloudflareTripPage({ gatewayUrl, sharedSecret: gatewaySecret,
  ownerSubject: userOwner.subject, cursor, fetchImpl: exportFetch });
const initialExportState = canonicalJson([...Array(10)].map((_, i) => [...exportEnv[`TRIP_DB_${i}`].rows]));
const exportFirst = await exportRead(null);
const exportSecond = await exportRead(exportFirst.next_cursor);
const exportThird = await exportRead(exportSecond.next_cursor);
assert.deepEqual([exportFirst.rows.length, exportSecond.rows.length, exportThird.rows.length], [200, 200, 101]);
assert.equal(exportThird.next_cursor, null);
assert.equal(exportFirst.snapshot_at, exportThird.snapshot_at);
assert.deepEqual([...exportFirst.rows, ...exportSecond.rows, ...exportThird.rows].map(row => row.client_observation_id), exportIds);
assert.deepEqual(exportFirst.rows[0], JSON.parse(exportEnv.TRIP_DB_0.rows.get(exportIds[0]).payloadJson),
  'Eksporten bevarer den gemte historiske payload i stedet for visningens modelprojektion.');
assert.equal(canonicalJson([...Array(10)].map((_, i) => [...exportEnv[`TRIP_DB_${i}`].rows])), initialExportState,
  'Alle gemte syntetiske rækker er byteidentiske efter eksport.');
assert.equal(JSON.stringify(exportFirst).includes(userOwner.subject), false);
assert.equal(JSON.stringify(exportFirst).includes(userId), false);
assert.equal(JSON.stringify(exportFirst).includes('user_id'), false);
await assert.rejects(exportCloudflareTripPage({ gatewayUrl, sharedSecret: gatewaySecret,
  ownerSubject: otherOwner.subject, cursor: exportFirst.next_cursor, fetchImpl: exportFetch }), /REQUEST_REJECTED/);
const tamperedCursor = JSON.stringify({ ...JSON.parse(exportFirst.next_cursor), after: exportIds[0] });
await assert.rejects(exportRead(tamperedCursor), /REQUEST_REJECTED/);
await assert.rejects(exportRead('not-json'), /REQUEST_REJECTED/);
const fixedCursorTime = Date.now();
const fixedCursor = await createTripExportCursor({ sharedSecret: gatewaySecret, ownerSubject: userOwner.subject,
  after: exportIds[0], snapshotAt: exportFirst.snapshot_at, now: fixedCursorTime });
await assert.rejects(readTripExportCursor({ sharedSecret: gatewaySecret, ownerSubject: userOwner.subject,
  cursor: fixedCursor, now: fixedCursorTime + 300_001 }), /CURSOR_INVALID/);
const forgedStored = exportEnv.TRIP_DB_0.rows.get(exportIds[0]);
const oldPayloadJson = forgedStored.payloadJson;
forgedStored.payloadJson = JSON.stringify({ ...JSON.parse(oldPayloadJson), grams: 999 });
await assert.rejects(exportRead(null), /REQUEST_REJECTED/);
forgedStored.payloadJson = oldPayloadJson;
exportEnv.TRIP_DB_1.rows.set(exportIds[0], structuredClone(forgedStored));
await assert.rejects(exportRead(null), /REQUEST_REJECTED/);
exportEnv.TRIP_DB_1.rows.delete(exportIds[0]);
exportEnv.TRIP_DB_0.tombstoneRows.add(userOwner.subject);
await assert.rejects(exportRead(exportFirst.next_cursor), /REQUEST_REJECTED/,
  'Ejer-sletning mellem sider må ikke ligne en vellykket tom slutside.');
exportEnv.TRIP_DB_0.tombstoneRows.delete(userOwner.subject);
exportEnv.TRIP_DB_5.exportQueryBarrier = result => {
  exportEnv.TRIP_DB_0.tombstoneRows.add(userOwner.subject);
  return result;
};
await assert.rejects(exportRead(null), /REQUEST_REJECTED/,
  'Sletning under en side skal også afvise hele siden ved den normale efterkontrol.');

const exportFunctionBody = worker.match(/async function exportTripPage\(env, body\) \{[\s\S]*?(?=\nasync function countTrips)/)?.[0] || '';
assert.doesNotMatch(exportFunctionBody, /\.(?:run|batch|exec)\(/, 'Eksporten er ren læsning; ingen lager- eller slettekommando.');
assert.match(tripLogFunction, /exportRequested[\s\S]*\["operation", "cursor"\]/);
assert.match(tripLogFunction, /enforceRateLimits[\s\S]*requireAuthenticatedUserId[\s\S]*exportOwnTripPage\(userId/);
assert.match(tripStore, /activeTripStorageMode\(\) !== "d1"[\s\S]*TRIP_EXPORT_UNAVAILABLE/);
await checkRealSqliteSignedExport({ payload, userOwner, secret, gatewaySecret, gatewayUrl });
await checkOriginReportStorage({ payload, userOwner, secret, gatewaySecret, gatewayUrl });
console.log('Hybrid turlagring: 501 signerede eksportture/ti shards og reel 10400-rækkers SQLite-keyset uden ekstra sortering består lokalt.');
}

async function checkRealSqliteSignedExport({ payload, userOwner, secret, gatewaySecret, gatewayUrl }) {
  const migrationPaths = [
    'cloudflare/trip-gateway/migrations/001_trip_observations.sql',
    'cloudflare/trip-gateway/migrations/002_owner_export_keyset.sql',
  ];
  const migrationBytes = migrationPaths.map(filename => fs.readFileSync(filename));
  const shards = Array.from({ length: 10 }, (_, index) => ({
    name: `real-sqlite-export-${index}`, uuid: `real-sqlite-export-${index}`,
  }));
  const databases = [];
  const metadataReads = [];
  const workerReads = [];
  try {
    for (const shard of shards) {
      const database = new DatabaseSync(':memory:');
      databases.push(database);
      // Execute the actual files, including their unchanged comments/DDL.
      for (const bytes of migrationBytes) database.exec(bytes.toString('utf8'));
    }
    await applySchema(shards, { query: async (pathname, init) => {
      const index = shards.findIndex(shard => pathname === `/d1/database/${shard.uuid}/query`);
      assert.notEqual(index, -1, 'Only these ten synthetic SQLite shards may be queried');
      assert.equal(init.method, 'POST');
      const body = JSON.parse(init.body);
      assert.deepEqual(Object.keys(body), ['sql']);
      if (/^pragma\b/i.test(body.sql)) metadataReads.push([index, body.sql]);
      // Both DDL and metadata execute as received from the normal installer.
      const results = databases[index].prepare(body.sql).all().map(row => ({ ...row }));
      return { success: true, result: [{ success: true, results }] };
    } });
    assert.equal(metadataReads.length, 20);
    assert.deepEqual([...new Set(metadataReads.map(([index]) => index))], shards.map((_, index) => index));

    const sameCreatedAt = '2000-01-01T00:00:00.000Z';
    const ownIds = Array.from({ length: 501 }, (_, index) => `a0000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
    const otherOwner = await externalOwnerSubject({ userId: '55555555-5555-4555-8555-555555555555', secret });
    async function insertFixture(index, id, owner = userOwner, createdAt = sameCreatedAt) {
      const record = await externalTripRecord({ owner, payload: { ...payload, client_observation_id: id, trip_id: null } });
      const columns = [...Object.keys(record), 'created_at'];
      databases[index].prepare(`insert into trip_observations (${columns.join(',')}) values (${columns.map(() => '?').join(',')})`)
        .run(...Object.values(record), createdAt);
      return record;
    }
    for (let index = 0; index < ownIds.length; index += 1) await insertFixture(index % 10, ownIds[index]);
    await insertFixture(1, 'b0000000-0000-4000-8000-000000000001', otherOwner);
    await insertFixture(2, 'c0000000-0000-4000-8000-000000000001', userOwner, '9999-12-31T23:59:59.999Z');
    const originalTables = ['trip_observations', 'trip_observation_registry', 'trip_owner_erasure_tombstones', 'trip_storage_control'];
    const storedRows = () => canonicalJson(databases.map(database => originalTables.map(table =>
      database.prepare(`select * from ${table} order by rowid`).all().map(row => ({ ...row })))));
    const beforeFirstPage = storedRows();
    for (const database of databases) database.exec('pragma query_only = on');

    const environment = { TRIP_GATEWAY_SHARED_SECRET: gatewaySecret };
    databases.forEach((database, index) => {
      environment[`TRIP_DB_${index}`] = { prepare(sql) {
        const statement = database.prepare(sql);
        return { bind(...parameters) { return { async all() {
          workerReads.push({ index, sql, parameters });
          // No SQL emulation, ordering or filtering: SQLite supplies every row.
          return { success: true, results: statement.all(...parameters).map(row => ({ ...row })) };
        } }; } };
      } };
    });
    let signedRequests = 0;
    const fetchImpl = async (input, init) => {
      const request = new Request(input, init);
      assert.equal(request.method, 'POST');
      assert.equal(new URL(request.url).pathname, '/v1/trips/export-page');
      assert.ok(request.headers.get('X-RavRadar-Signature'));
      signedRequests += 1;
      return handleRequest(request, environment);
    };
    const readPage = (cursor, ownerSubject = userOwner.subject) => exportCloudflareTripPage({
      gatewayUrl, sharedSecret: gatewaySecret, ownerSubject, cursor, fetchImpl,
    });
    const first = await readPage(null);
    assert.equal(storedRows(), beforeFirstPage, 'The first normal export page cannot mutate any fixture row');
    const firstCursor = await readTripExportCursor({ sharedSecret: gatewaySecret, ownerSubject: userOwner.subject, cursor: first.next_cursor });
    assert.equal(firstCursor.after, ownIds[199], 'Equal observation/storage timestamps must still advance by identity');
    assert.equal(firstCursor.snapshotAt, first.snapshot_at);

    // A later stored row has an old observation time but must not enter this
    // existing cursor's storage snapshot. This is fixture setup, not a write
    // through the read-only export route.
    databases[3].exec('pragma query_only = off');
    await insertFixture(3, 'd0000000-0000-4000-8000-000000000001', userOwner,
      new Date(Date.parse(first.snapshot_at) + 1).toISOString());
    databases[3].exec('pragma query_only = on');
    const beforeRemainingPages = storedRows();
    assert.equal(databases.reduce((count, database) => count + database.prepare('select count(*) as n from trip_observations').get().n, 0), 504);
    const second = await readPage(first.next_cursor);
    const third = await readPage(second.next_cursor);
    assert.deepEqual([first.rows.length, second.rows.length, third.rows.length], [200, 200, 101]);
    assert.equal(third.next_cursor, null);
    assert.equal(second.snapshot_at, first.snapshot_at);
    assert.equal(third.snapshot_at, first.snapshot_at);
    assert.deepEqual([...first.rows, ...second.rows, ...third.rows].map(row => row.client_observation_id), ownIds);
    const secondCursor = await readTripExportCursor({ sharedSecret: gatewaySecret, ownerSubject: userOwner.subject, cursor: second.next_cursor });
    assert.equal(secondCursor.after, ownIds[399]);
    assert.equal(signedRequests, 3);
    assert.equal(workerReads.length, 36, 'Each page runs two real tombstone reads and ten real shard queries');
    assert.deepEqual([...new Set(workerReads.map(({ index }) => index))], shards.map((_, index) => index));
    const keysetReads = workerReads.filter(({ parameters }) => parameters.length === 4);
    assert.equal(keysetReads.length, 30);
    keysetReads.forEach(({ parameters }, index) => assert.deepEqual(parameters,
      [userOwner.subject, ['', ownIds[199], ownIds[399]][Math.floor(index / 10)], first.snapshot_at, 201]));
    const firstStoredPayload = databases[0].prepare('select payload_json from trip_observations where client_observation_id = ?').get(ownIds[0]).payload_json;
    assert.deepEqual(first.rows[0], JSON.parse(firstStoredPayload));
    assert.equal(JSON.stringify([first, second, third]).includes(userOwner.subject), false);
    assert.equal(JSON.stringify([first, second, third]).includes('user_id'), false);
    const readsBeforeRejectedCursors = workerReads.length;
    await assert.rejects(readPage(first.next_cursor, otherOwner.subject), /REQUEST_REJECTED/);
    const tampered = JSON.stringify({ ...JSON.parse(first.next_cursor), after: ownIds[0] });
    await assert.rejects(readPage(tampered), /REQUEST_REJECTED/);
    assert.equal(workerReads.length, readsBeforeRejectedCursors, 'Invalid owner/cursor must fail before any SQLite read');
    assert.equal(signedRequests, 5);
    assert.equal(storedRows(), beforeRemainingPages, 'All 504 synthetic rows and control tables remain unchanged');
    migrationPaths.forEach((filename, index) => assert.deepEqual(fs.readFileSync(filename), migrationBytes[index]));
  } finally {
    for (const database of databases) database.close();
  }
  console.log('Real SQLite signed export: 10 shards, 20 index readbacks, 3 pages/501 own rows, 2 rejected cursors; 504 fixture rows unchanged; all databases closed.');
}


// Optional negative provenance is not proof of genuine data, consent or anonymity.
// Use the normal manual-report projection and signed Worker routes, with actual
// unchanged 001/002 SQL on ten private in-memory SQLite databases.
async function checkOriginReportStorage({ payload, userOwner, secret, gatewaySecret, gatewayUrl }) {
  const databases = [];
  const environment = { TRIP_GATEWAY_SHARED_SECRET: gatewaySecret };
  const requests = [];
  try {
    for (let index = 0; index < 10; index += 1) {
      const database = new DatabaseSync(':memory:');
      databases.push(database);
      for (const migration of ['001_trip_observations.sql', '002_owner_export_keyset.sql']) {
        database.exec(fs.readFileSync('cloudflare/trip-gateway/migrations/' + migration, 'utf8'));
      }
      environment['TRIP_DB_' + index] = { prepare(sql) { return { bind(...parameters) { return {
        async all() { return { success: true, results: database.prepare(sql).all(...parameters).map(row => ({ ...row })) }; },
        async run() { return { success: true, meta: { changes: Number(database.prepare(sql).run(...parameters).changes) } }; },
      }; } }; } };
    }
    const fetchImpl = async (input, init) => {
      const request = new Request(input, init);
      assert.ok(request.headers.get('X-RavRadar-Signature'));
      requests.push(new URL(request.url).pathname);
      return handleRequest(request, environment);
    };
    const configuration = { gatewayUrl, sharedSecret: gatewaySecret, fetchImpl };
    const rows = [];
    for (const [index, origin] of ['unknown', 'synthetic-test'].entries()) {
      const report = buildAccountTripReport({
        observationOrigin: origin, tripId: 'e0000000-0000-4000-8000-00000000000' + index,
        startedAt: payload.observed_at, searchMinutes: 30, searchCoverage: 'normal',
        mode: 'beach', zoneId: payload.actual_zone_id, coastalPartId: payload.actual_coastal_part_id, found: false,
      }, { now: Date.parse(payload.submitted_at) });
      const row = { ...payload, ...toAccountObservationColumns(report),
        client_observation_id: 'f0000000-0000-4000-8000-00000000000' + index };
      rows.push(row);
      assert.equal(row.schema_version, 1);
      assert.equal(row.calibration_eligible, false);
      assert.deepEqual(row.data_quality_flags, ['account-manual', 'historical-snapshot-unavailable', 'not-calibration-eligible']);
      assert.deepEqual(await storeCloudflareTrip({ ...configuration, owner: userOwner, payload: row }), { stored: true, duplicate: false });
    }
    const storedRows = () => canonicalJson(databases.map(database =>
      ['trip_observations', 'trip_observation_registry', 'trip_owner_erasure_tombstones', 'trip_storage_control']
        .map(table => database.prepare('select * from ' + table + ' order by rowid').all().map(row => ({ ...row })))));
    const storedBeforeRead = storedRows();
    assert.equal(databases.reduce((sum, database) => sum + database.prepare('select count(*) as n from trip_observations').get().n, 0), 2);
    // Normal export excludes the current millisecond; no fixture timestamp rewrite.
    await new Promise(resolve => setTimeout(resolve, 2));
    const listed = await listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 10 });
    const exported = await exportCloudflareTripPage({ ...configuration, ownerSubject: userOwner.subject, cursor: null });
    const expected = rows.map(row => externalTripPayload(row));
    assert.deepEqual(listed.toSorted((a, b) => a.client_observation_id.localeCompare(b.client_observation_id)), expected);
    assert.deepEqual(exported.rows, expected);
    assert.equal(exported.next_cursor, null);
    for (const row of [...listed, ...exported.rows]) {
      for (const privateKey of ['user_id', 'anonymous_id', 'gps', 'owner_subject']) assert.equal(Object.hasOwn(row, privateKey), false);
      assert.equal(row.calibration_eligible, false);
    }
    const otherOwner = await externalOwnerSubject({ userId: '55555555-5555-4555-8555-555555555555', secret });
    assert.deepEqual(await listCloudflareTrips({ ...configuration, ownerSubject: otherOwner.subject, limit: 10 }), []);
    assert.deepEqual((await exportCloudflareTripPage({ ...configuration, ownerSubject: otherOwner.subject, cursor: null })).rows, []);
    const requestsBeforeInvalid = requests.length;
    for (const origin of [null, undefined, true, 'real', 'consented', {}, []]) {
      await assert.rejects(storeCloudflareTrip({ ...configuration, owner: userOwner,
        payload: { ...rows[0], observation_origin: origin } }), /TRIP_OBSERVATION_ORIGIN_INVALID/);
    }
    assert.equal(requests.length, requestsBeforeInvalid, 'Invalid provenance fails before any gateway request.');
    await assert.rejects(storeCloudflareTrip({ ...configuration, owner: userOwner,
      payload: { ...rows[1], observation_origin: 'unknown' } }), /IDEMPOTENCY_CONFLICT/);
    assert.equal(storedRows(), storedBeforeRead, 'Readback, other-owner reads and a relabel attempt cannot change either report or its registry.');
  } finally {
    for (const database of databases) database.close();
  }
  console.log('Origin report storage: 2 report-only origins, signed STORE/LIST/EXPORT, other owner empty, 7 invalid origins/no transport, immutable replay; SQLite closed.');
}

// Uses the real normal trip-store and gateway timeout helper. Only transport
// responses and Deno configuration are synthetic; no request leaves this test.
async function checkServiceKeyHeadersOnly() {
  const originalDeno = globalThis.Deno, originalFetch = globalThis.fetch;
  const environment = { TRIP_STORAGE_MODE: 'd1', SUPABASE_URL: 'https://service-key-test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'TEST.ONLY.INVALID' };
  const { storeObservation, listOwnTripObservations, activeRavScoreTripAdmissionBody } =
    await import('../supabase/functions/_shared/trip-store.ts');
  const { SAFE_IDEMPOTENCY_SOURCE_COLUMNS } = await import('../supabase/functions/_shared/trip-source-projection.js');
  const binding = (await import('../js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const features = { modelVersion: binding.modelId, modelStateVersion: binding.stateSchemaVersion,
    modelVariantId: binding.variantId, modelProfileId: binding.profileId,
    modelComponentSchemaId: binding.componentSchemaId, modelExplanationSchemaId: binding.explanationSchemaId,
    modelRankingPolicyId: binding.rankingPolicyId, modelBestTimePolicyId: binding.bestTimePolicyId,
    modelPresentationPolicyId: binding.presentationPolicyId, modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256, reasonCodes: [] };
  const input = { ...payload, schema_version: 3, calibration_eligible: false,
    forecast_zone_id: payload.actual_zone_id, forecast_coastal_part_id: payload.actual_coastal_part_id,
    calibration_features: features };
  const inputBefore = canonicalJson(input), expectedBody = activeRavScoreTripAdmissionBody(input);
  const requests = [];
  let responseFor;
  globalThis.Deno = { env: { get: name => environment[name] ?? null } };
  globalThis.fetch = async (input, init = {}) => {
    const request = new Request(input, init);
    assert.equal(new URL(request.url).origin, environment.SUPABASE_URL);
    assert.ok(init.signal instanceof AbortSignal, 'Genuine normal timeout/cancellation remains attached');
    const row = { url: request.url, method: request.method, headers: request.headers,
      body: request.method === 'POST' ? await request.json() : null };
    requests.push(row);
    assert.equal(row.headers.get('apikey'), environment.SUPABASE_SERVICE_ROLE_KEY);
    // Model only the known opaque-as-JWT boundary, not a hosted auth diagnosis.
    if (environment.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_') && row.headers.has('authorization'))
      return new Response(null, { status: 401 });
    return responseFor(row);
  };
  try {
    for (const [family,key] of [['legacy-jwt','TEST.ONLY.INVALID'],['opaque-secret','sb_secret_TEST']]) {
      environment.SUPABASE_SERVICE_ROLE_KEY = key; environment.TRIP_STORAGE_MODE = 'd1'; requests.length = 0;
      responseFor = row => {
        assert.match(row.url, /\/rest\/v1\/rpc\/ravradar_trip_v3_active_binding_admitted$/);
        assert.equal(row.method, 'POST'); assert.deepEqual(row.body, expectedBody);
        assert.equal(row.headers.get('content-type'), 'application/json');
        return Response.json(false);
      };
      await assert.rejects(storeObservation(input, userId), error => error?.status === 409
        && error?.code === 'RAVSCORE_MODEL_NOT_ACTIVE', family + ': active-model refusal is preserved');
      assert.equal(requests.length,1,'D1 uses the same admission RPC before any storage; no retry/write');
      assert.equal(canonicalJson(input),inputBefore);
      responseFor = () => new Response(null,{status:401}); requests.length = 0;
      await assert.rejects(storeObservation(input,userId),error => error?.status === 503
        && error?.code === 'RAVSCORE_ADMISSION_UNAVAILABLE');
      assert.equal(requests.length,1,'Auth failure remains503; no retry or D1 storage fallback');

      environment.TRIP_STORAGE_MODE = 'supabase'; requests.length = 0;
      const legacy = { ...payload, schema_version:1 };
      const stored = Object.fromEntries(Object.entries(legacy).filter(([name]) => SAFE_IDEMPOTENCY_SOURCE_COLUMNS.includes(name)));
      responseFor = row => {
        const url = new URL(row.url);
        assert.equal(url.pathname,'/rest/v1/observations');
        if(row.method==='POST') {
          assert.deepEqual(row.body,legacy); assert.equal(row.headers.get('prefer'),'resolution=ignore-duplicates,return=minimal');
          return new Response(null,{status:201});
        }
        return Response.json(url.searchParams.has('client_observation_id')?[stored]:[]);
      };
      await storeObservation(legacy,userId);
      assert.deepEqual(await listOwnTripObservations(userId,1),[]);
      assert.equal(requests.length,3,'One insert, exact idempotency readback, and one owner list; no retry');
      for(const row of requests) assert.equal(row.headers.get('authorization'),family==='opaque-secret'?null:'Bearer '+key);
    }
    console.log('Service-key headers: both synthetic families; genuine v3/D1 admission and unchanged409/503; legacy insert/readback/list; no real network or retry.');
  } finally {
    globalThis.fetch=originalFetch;
    if(originalDeno===undefined)delete globalThis.Deno;else globalThis.Deno=originalDeno;
  }
}
