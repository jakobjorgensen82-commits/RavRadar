import assert from 'node:assert/strict';

const values = new Map();
globalThis.localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  key: index => [...values.keys()][index] ?? null,
  get length() { return values.size; }
};
globalThis.window = { addEventListener() {} };
globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });

const {
  getLocalObservations,
  getObservationSyncStatus,
  projectLegacyObservationWeatherSnapshot,
  remoteObservationPayload,
  submitObservation,
  syncPendingObservations,
} = await import('../js/services/observation-service.js?production-mapping-test=1');
const {
  RAVSCORE_MODEL_ID,
  ravScoreModelBinding,
} = await import('../js/core/ravscore-model-contract.js');
const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const payload = remoteObservationPayload({
  id: clientId,
  zone_id: 'DK-B01-01',
  actual_coastal_part_id: 'dk-b01-01-national-part-01',
  gps: { latitude: 55, longitude: 8 },
  route: [{ latitude: 55, longitude: 8 }],
  track: [{ latitude: 55, longitude: 8 }],
  sync_status: 'pending'
});

assert.equal(payload.client_observation_id, clientId);
assert.equal(payload.actual_zone_id, 'DK-B01-01');
assert.equal(payload.zone_id, null);
assert.equal(payload.gps, null);
for (const key of ['id', 'route', 'track', 'sync_status']) assert.equal(key in payload, false);

const legacyNumeric = remoteObservationPayload({ id: clientId, zone_id: 42, gps: null });
assert.equal(legacyNumeric.zone_id, 42);
assert.equal(legacyNumeric.actual_zone_id, null);

const legacySnapshot = {
  schemaVersion: 2,
  capturedAt: '2026-08-01T10:00:00.000Z',
  provider: 'dmi',
  current: {
    provider: 'dmi', windSpeedMps: 7, currentDirectionDeg: 210,
    u: 0.2, v: -0.1, geohash: 'u3butz', utm: { easting: 500000 },
    point: [55.1, 12.2], metadata: { latitude: 55.1, longitude: 12.2 },
  },
  score: { baseScore: 45, finalScore: 50, level: 'medium', metadata: { raw: true } },
  prediction: { probability: 0.4, confidence: 0.5, modelVersion: 'legacy', point: [55.1, 12.2] },
  matchedRules: [
    { id: 'legacy-rule-1', metadata: { geohash: 'u3butz' } },
    { ruleId: 'legacy-rule-2', current: { u: 0.2, v: -0.1 } },
  ],
  metadata: { raw: true },
};
const expectedSnapshot = {
  schemaVersion: 2,
  capturedAt: '2026-08-01T10:00:00.000Z',
  provider: 'dmi',
  current: { provider: 'dmi', windSpeedMps: 7, currentDirectionDeg: 210 },
  score: { baseScore: 45, finalScore: 50, level: 'medium' },
  prediction: { probability: 0.4, confidence: 0.5, modelVersion: 'legacy' },
  matchedRuleIds: ['legacy-rule-1', 'legacy-rule-2'],
};
assert.deepEqual(projectLegacyObservationWeatherSnapshot(legacySnapshot), expectedSnapshot);
const legacyRow = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  schema_version: 1,
  zone_id: 'DK-B01-01',
  weather_snapshot: legacySnapshot,
  sync_status: 'pending',
};
values.set('ravradar-observations-v2', JSON.stringify([legacyRow]));
values.set('ravradar-observation-outbox-v1', JSON.stringify([legacyRow]));
assert.deepEqual(getLocalObservations()[0].weather_snapshot, expectedSnapshot);
assert.equal(getObservationSyncStatus().pending, 1);
assert.deepEqual(JSON.parse(values.get('ravradar-observations-v2'))[0].weather_snapshot, expectedSnapshot);
assert.deepEqual(JSON.parse(values.get('ravradar-observation-outbox-v1'))[0].weather_snapshot, expectedSnapshot);
assert.deepEqual(remoteObservationPayload(legacyRow).weather_snapshot, expectedSnapshot);

const strictSchemaTwoSnapshot = { schemaVersion: 4, metadata: { mustBeRejectedRemotely: true } };
assert.deepEqual(
  remoteObservationPayload({
    id: clientId,
    schema_version: 2,
    zone_id: 'DK-B01-01',
    weather_snapshot: strictSchemaTwoSnapshot,
    calibration_eligible: false,
    calibration_features: { reasonCodes: ['ravscore-evidence-trust-unattested'] },
    data_quality_flags: ['ravscore-evidence-trust-unattested'],
  }).weather_snapshot,
  strictSchemaTwoSnapshot,
  'Browser migration must not sanitize schema-2 rows past the strict remote validator.',
);

const maliciousLegacyPrediction = {
  probability: 0.99,
  confidence: 0.98,
  modelVersion: 'retired-adaptive-model',
};
const neutralWrite = await submitObservation({
  zone: { id: 'DK-B01-01', name: 'Testzone', coastType: 'sand' },
  huntMode: 'beach',
  result: 'none',
  scoreResult: {
    score: 61,
    level: 'medium',
    prediction: maliciousLegacyPrediction,
  },
  weather: { provider: 'dmi', windSpeedMps: 7 },
  prediction: maliciousLegacyPrediction,
});
assert.equal(neutralWrite.row.ai_probability, null);
assert.equal(neutralWrite.row.ai_confidence, null);
assert.equal(neutralWrite.row.model_version, null);
assert.equal(Object.hasOwn(neutralWrite.row.weather_snapshot, 'prediction'), false);

const boundWrite = await submitObservation({
  zone: { id: 'DK-B01-01', name: 'Testzone', coastType: 'sand' },
  huntMode: 'beach',
  result: 'none',
  scoreResult: {
    score: 61,
    level: 'medium',
    modelBinding: ravScoreModelBinding(),
  },
  weather: { provider: 'dmi', windSpeedMps: 7 },
});
assert.equal(boundWrite.row.model_version, RAVSCORE_MODEL_ID);

// Exercise the normal submission/outbox path while an earlier HTTP request
// is genuinely pending. A later failed submission must remain recoverable.
values.clear();
const outboxKey = 'ravradar-observation-outbox-v1';
const localKey = 'ravradar-observations-v2';
let releaseFirstRequest, firstRequestStarted;
const firstRequestGate = new Promise(resolve => { releaseFirstRequest = resolve; });
const firstRequestReady = new Promise(resolve => { firstRequestStarted = resolve; });
const sentIds = [];
globalThis.fetch = async (_url, options) => {
  const payload = JSON.parse(options.body);
  sentIds.push(payload.client_observation_id);
  if (sentIds.length === 1) {
    firstRequestStarted();
    await firstRequestGate;
    return { ok: true };
  }
  return { ok: payload.result !== 'small' };
};
const normalSubmission = result => submitObservation({
  zone: { id: 'DK-B01-01', name: 'Testzone', coastType: 'sand' },
  huntMode: 'beach', result, weather: { provider: 'dmi' },
});
const firstSubmission = normalSubmission('none');
await firstRequestReady;
const secondSubmission = normalSubmission('small');
const pendingBeforeResponse = JSON.parse(values.get(outboxKey));
assert.equal(pendingBeforeResponse.length, 2);
const secondOriginal = pendingBeforeResponse.find(row => row.result === 'small');
await new Promise(resolve => setImmediate(resolve));
releaseFirstRequest();
const [firstSubmitted, secondSubmitted] = await Promise.all([firstSubmission, secondSubmission]);
const pendingAfterResponse = JSON.parse(values.get(outboxKey));
assert.equal(pendingAfterResponse.length, 1, 'The earlier drain must preserve the later failed trip.');
assert.equal(pendingAfterResponse[0].id, secondOriginal.id);
assert.equal(pendingAfterResponse[0].sync_status, 'pending');
assert.equal(JSON.stringify(remoteObservationPayload(pendingAfterResponse[0])), JSON.stringify(remoteObservationPayload(secondOriginal)));
assert.deepEqual(sentIds, [firstSubmitted.row.id, secondSubmitted.row.id], 'Overlapping normal submissions share one drain without duplicate HTTP writes.');
assert.equal(JSON.parse(values.get(localKey)).find(row => row.id === firstSubmitted.row.id).sync_status, 'synced');
assert.equal(JSON.parse(values.get(localKey)).find(row => row.id === secondSubmitted.row.id).sync_status, 'pending');
globalThis.fetch = async (_url, options) => {
  sentIds.push(JSON.parse(options.body).client_observation_id);
  return { ok: true };
};
const recoveredStatus = await syncPendingObservations();
assert.equal(recoveredStatus.pending, 0);
assert.equal(sentIds.filter(id => id === secondSubmitted.row.id).length, 2, 'A later explicit sync can send the retained original once.');
assert.equal(getLocalObservations().find(row => row.id === secondSubmitted.row.id).sync_status, 'synced');

// A stale completion cannot overwrite newer persisted state. The synthetic
// other actor changes only this test's storage while the normal HTTP awaits.
for (const outcome of ['changed-original', 'already-acknowledged', 'still-pending']) {
  values.clear();
  let releaseRequest, requestStarted;
  const requestGate = new Promise(resolve => { releaseRequest = resolve; });
  const requestReady = new Promise(resolve => { requestStarted = resolve; });
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    requestStarted();
    await requestGate;
    return { ok: outcome === 'changed-original' };
  };
  const submission = normalSubmission('none');
  await requestReady;
  const [original] = JSON.parse(values.get(outboxKey));
  let newer = original;
  if (outcome === 'changed-original') {
    newer = { ...original, result: 'good' };
    values.set(outboxKey, JSON.stringify([newer]));
    values.set(localKey, JSON.stringify([newer]));
  } else if (outcome === 'already-acknowledged') {
    newer = { ...original, sync_status: 'synced', synced_at: '2026-10-09T10:00:00.000Z', sync_error: null };
    values.set(outboxKey, '[]');
    values.set(localKey, JSON.stringify([newer]));
  }
  releaseRequest();
  await submission;
  assert.equal(requestCount, 1, 'A drain never retries the same id or a changed same-id payload.');
  if (outcome === 'still-pending') {
    const [retained] = JSON.parse(values.get(outboxKey));
    assert.equal(JSON.stringify(remoteObservationPayload(retained)), JSON.stringify(remoteObservationPayload(original)));
    assert.equal(retained.sync_status, 'pending');
    assert.equal(getObservationSyncStatus().pending, 1);
  } else {
    assert.equal(values.get(localKey), JSON.stringify([newer]), 'A stale result must not relabel or replace a newer local row.');
    assert.equal(values.get(outboxKey), outcome === 'already-acknowledged' ? '[]' : JSON.stringify([newer]));
  }
}

console.log('Observation production mapping: OK');
