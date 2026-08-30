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

console.log('Observation production mapping: OK');
