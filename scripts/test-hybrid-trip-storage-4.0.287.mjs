import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handleRequest } from '../cloudflare/trip-gateway/worker.js';
import {
  D1_TRIP_SCHEMA_STATEMENTS,
  canonicalJson,
  countCloudflareTrips,
  deleteCloudflareTrips,
  externalOwnerSubject,
  externalTripPayload,
  listCloudflareTrips,
  normalizeCloudflareGatewayUrl,
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
assert.throws(() => externalTripPayload({ ...payload, weather_snapshot: { email: 'forbidden@example.test' } }), /DIRECT_IDENTITY_NOT_ALLOWED/);
assert.equal(canonicalJson({ z: 1, nested: { b: 2, a: 1 } }), canonicalJson({ nested: { a: 1, b: 2 }, z: 1 }));
assert.equal(normalizeCloudflareGatewayUrl(gatewayUrl), gatewayUrl);
assert.throws(() => normalizeCloudflareGatewayUrl('https://example.com'), /TRIP_GATEWAY_URL_INVALID/);
assert.throws(() => normalizeCloudflareGatewayUrl(`${gatewayUrl}/other`), /TRIP_GATEWAY_URL_INVALID/);

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
  }

  prepare(sql) {
    const database = this;
    return {
      bind(...args) {
        return {
          async run() {
            if (sql.toLowerCase().includes('delete from trip_observations')) {
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
            if (!sql.toLowerCase().includes('insert into trip_observations')) throw new Error('Unexpected run query');
            const [storageSchemaVersion, ownerSubject, ownerKind, storedTripId, storedClientId, observedAt, submittedAt, payloadJson, payloadSha256, source] = args;
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
            if (normalized.includes('select owner_subject, payload_sha256')) {
              const [storedClientId, , storedTripId] = args;
              return {
                success: true,
                results: [...database.rows.values()]
                  .filter(row => row.clientId === storedClientId || (storedTripId && row.tripId === storedTripId))
                  .map(row => ({ owner_subject: row.ownerSubject, payload_sha256: row.payloadSha256 })),
              };
            }
            if (normalized.includes('select payload_json, observed_at')) {
              const [ownerSubject, limit] = args;
              return {
                success: true,
                results: [...database.rows.values()]
                  .filter(row => row.ownerSubject === ownerSubject)
                  .sort((left, right) => right.observedAt.localeCompare(left.observedAt))
                  .slice(0, limit)
                  .map(row => ({ payload_json: row.payloadJson, observed_at: row.observedAt })),
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
assert.deepEqual(await health.json(), { ok: true, service: 'ravradar-trip-gateway', storage_schema_version: 1, shards: 10 });
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
assert.equal(await deleteCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject }), 1);
assert.equal((await listCloudflareTrips({ ...configuration, ownerSubject: userOwner.subject, limit: 1 })).length, 0);
assert.equal(await countCloudflareTrips(configuration), 0);

const schemaSql = fs.readFileSync('cloudflare/trip-gateway/migrations/001_trip_observations.sql', 'utf8');
for (const marker of ['owner_subject', 'payload_sha256', 'client_observation_id', 'trip_observations_owner_time']) {
  assert.match(schemaSql, new RegExp(marker));
  assert.ok(D1_TRIP_SCHEMA_STATEMENTS.some(statement => statement.includes(marker)));
}
assert.doesNotMatch(schemaSql, /\b(?:user_id|anonymous_id|email|gps|route)\b/i);

const worker = fs.readFileSync('cloudflare/trip-gateway/worker.js', 'utf8');
const tripStore = fs.readFileSync('supabase/functions/_shared/trip-store.ts', 'utf8');
const submitFunction = fs.readFileSync('supabase/functions/submit-observation/index.ts', 'utf8');
const tripLogFunction = fs.readFileSync('supabase/functions/trip-log/index.ts', 'utf8');
const preparation = fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs', 'utf8');
assert.match(worker, /Array\.from\(\{ length: 10 \}/);
assert.match(worker, /verifyTripGatewaySignature/);
assert.match(worker, /deleteOwnerTrips/);
assert.match(preparation, /jurisdiction: 'eu'/);
assert.match(tripStore, /TRIP_STORAGE_MODE/);
assert.match(tripStore, /value !== "d1" && value !== "supabase"/);
assert.match(tripStore, /TRIP_PSEUDONYM_SECRET_V1/);
assert.match(tripStore, /TRIP_GATEWAY_SHARED_SECRET/);
assert.match(tripStore, /storeInSupabase/);
assert.match(submitFunction, /storeObservation/);
assert.match(submitFunction, /const boundUserId = userId && payload\.user_id === userId \? userId : null/);
assert.match(tripLogFunction, /requireAuthenticatedUserId/);
assert.match(tripLogFunction, /listOwnTripObservations/);
console.log('Hybrid turlagring: EU-D1-sharding, pseudonymisering, HMAC, idempotens, privat turlæsning og Supabase-rollback består.');
