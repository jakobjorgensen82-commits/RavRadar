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

const { remoteObservationPayload } = await import('../js/services/observation-service.js?production-mapping-test=1');
const clientId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const payload = remoteObservationPayload({
  id: clientId,
  zone_id: 'DK-B01-01',
  actual_coastal_part_id: 'dk-b01-01-national-part-01',
  gps: { latitude: 55, longitude: 8 },
  route: [{ latitude: 55, longitude: 8 }],
  track: [{ latitude: 55, longitude: 8 }],
  sync_status: 'pending',
  weather_snapshot: { schemaVersion: 4 }
});

assert.equal(payload.client_observation_id, clientId);
assert.equal(payload.actual_zone_id, 'DK-B01-01');
assert.equal(payload.zone_id, null);
assert.equal(payload.gps, null);
for (const key of ['id', 'route', 'track', 'sync_status']) assert.equal(key in payload, false);

const legacyNumeric = remoteObservationPayload({ id: clientId, zone_id: 42, gps: null });
assert.equal(legacyNumeric.zone_id, 42);
assert.equal(legacyNumeric.actual_zone_id, null);

console.log('Observation production mapping: OK');
