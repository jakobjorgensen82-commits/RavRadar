import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { handleRequest } from '../cloudflare/trip-gateway/worker.js';
import {
  deleteCloudflareTrips, externalOwnerSubject, listCloudflareTrips, storeCloudflareTrip,
} from '../supabase/functions/_shared/trip-storage.js';
import {
  identifyCloudflareTripRestore, reconcileCloudflareHeldTripErasures, reconcileHeldTripErasures,
} from './lib/reconcile-held-trip-erasures.mjs';

const migrations = ['001_trip_observations', '002_owner_export_keyset', '003_owner_erasure_insert_guard']
  .map(name => readFileSync(new URL(`../cloudflare/trip-gateway/migrations/${name}.sql`, import.meta.url), 'utf8'));
const sharedSecret = 'synthetic-restore-hold-probe-secret';
const gatewayUrl = 'https://trip-restore-test.example.workers.dev';
const epoch = 'e'.repeat(64);
const time = '2026-08-26T10:00:00.000Z';
const observation = id => ({
  client_observation_id: id, trip_id: null, observed_at: time, submitted_at: time,
  actual_zone_id: 'DK-B01-01', actual_coastal_part_id: 'DK-B01-01-P01',
  hunt_mode: 'beach', found: false, result: 'none', gps: null,
});

function fixture(t) {
  const databases = Array.from({ length: 10 }, () => new DatabaseSync(':memory:'));
  t.after(() => databases.forEach(database => database.close()));
  for (const database of databases) for (const migration of migrations) database.exec(migration);
  const active = [...databases];
  const env = { TRIP_GATEWAY_SHARED_SECRET: sharedSecret };
  let interrupt = false;
  const shards = active.map((_, index) => ({
    prepare(sql) {
      return { bind(...parameters) {
        return {
          async all() {
            return { success: true, results: active[index].prepare(sql).all(...parameters) };
          },
          async run() {
            if (index === 1 && interrupt && sql.startsWith('insert into trip_owner_erasure_tombstones')) {
              return { success: false };
            }
            return { success: true, meta: { changes: Number(active[index].prepare(sql).run(...parameters).changes) } };
          },
        };
      } };
    },
  }));
  for (const [index, shard] of shards.entries()) env[`TRIP_DB_${index}`] = shard;
  const config = { gatewayUrl, sharedSecret, fetchImpl: (url, init) => handleRequest(new Request(url, init), env) };
  return {
    active, config, shards,
    hold(value) { env.TRIP_RESTORE_HOLD = value; },
    interrupt(value) { interrupt = value; },
  };
}

test('recovery replays a pending erasure on a rolled-back control shard while ordinary access stays held', async t => {
  const live = fixture(t);
  const snapshot = fixture(t);
  const erased = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret: sharedSecret });
  const other = await externalOwnerSubject({ userId: '22222222-2222-4222-8222-222222222222', secret: sharedSecret });
  const erasedRow = observation('33333333-3333-4333-8333-333333333333');
  const otherRow = observation('44444444-4444-4444-8444-444444444444');
  for (const { config } of [live, snapshot]) {
    await storeCloudflareTrip({ ...config, owner: erased, payload: erasedRow });
    await storeCloudflareTrip({ ...config, owner: other, payload: otherRow });
  }
  const list = owner => listCloudflareTrips({ ...live.config, ownerSubject: owner.subject });
  const count = (table, owner) => live.active.reduce((total, db) => total
    + db.prepare(`select count(*) as n from ${table} where owner_subject = ?`).get(owner.subject).n, 0);
  live.interrupt(true);
  await assert.rejects(deleteCloudflareTrips({ ...live.config, ownerSubject: erased.subject }));
  assert.equal(count('trip_owner_erasure_tombstones', erased), 1);
  assert.deepEqual(await list(erased), []);
  live.interrupt(false);
  live.hold('true');
  live.active[0] = snapshot.active[0];
  assert.equal(count('trip_owner_erasure_tombstones', erased), 0);
  assert.equal(count('trip_observations', erased), 1);
  await assert.rejects(list(erased));

  const projectRef = 'tttttttttttttttttttt';
  const accountId = 'c'.repeat(32);
  const serviceKey = 'sb_secret_SYNTHETIC_DELETE_TEST';
  const cloudflareToken = 'SYNTHETIC_LOCAL_D1_TEST_ONLY';
  const publishableKey = 'synthetic-public-readiness-key';
  const versionId = '66666666-6666-4666-8666-666666666666';
  const deploymentId = '77777777-7777-4777-8777-777777777777';
  const restoreFrom = '2026-08-26T09:00:00.000Z';
  const captureAt = '2026-08-26T12:00:00.123456Z';
  const bindings = live.shards.map((_, index) => ({
    binding: `TRIP_DB_${index}`, database_name: `ravradar-trips-${index}`,
    database_id: `55555555-5555-4555-8555-${String(index).padStart(12, '0')}`,
  }));
  const databaseId = bindings[0].database_id;
  const baseRestoreUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/time_travel/`;
  const providerBookmark = 'synthetic-selected-bookmark';
  const journalCoveredFrom = '2026-08-26T06:00:00.000Z';
  const baselineLookup = {
    method: 'GET', url: baseRestoreUrl + 'bookmark?timestamp=' + encodeURIComponent(journalCoveredFrom), status: 200,
    body: { success: true, result: { bookmark: 'synthetic-older-baseline-bookmark' } },
  };
  const scope = { accountId, projectRef, bindings, versionId, deploymentId };
  const restorePlan = {
    intentId: '88888888-8888-4888-8888-888888888888', sourceSha: 'e'.repeat(40), runId: '1234', attempt: 1,
    heldAt: '2026-08-26T11:55:00.000Z', captureAt, journalCoveredFrom,
    targets: [{
      databaseId, at: restoreFrom, bookmark: providerBookmark, baselineLookup,
      lookup: { method: 'GET', url: baseRestoreUrl + 'bookmark?timestamp=' + encodeURIComponent(restoreFrom), status: 200,
        body: { success: true, result: { bookmark: providerBookmark } } },
    }],
  };
  const restoreReplies = [{
    databaseId, method: 'POST', url: baseRestoreUrl + 'restore?bookmark=' + providerBookmark, status: 200,
    startedAt: '2026-08-26T11:56:00.000Z', completedAt: '2026-08-26T11:58:00.000Z',
    body: { success: true, result: { bookmark: 'synthetic-after-restore-bookmark', previous_bookmark: 'synthetic-before-restore-bookmark' } },
  }];
  const restoreIdentity = identifyCloudflareTripRestore({ ...scope, plan: restorePlan, replies: restoreReplies });
  assert.equal(restoreIdentity.restoreFrom, journalCoveredFrom);
  assert.equal(restoreIdentity.captureAt, captureAt);
  assert.notEqual(restoreIdentity.epoch, epoch);
  let primaryRead = true;
  let edgeMode = 'restore-hold';
  let d1Requests = 0;
  const provider = {
    bindings, projectRef, accountId, serviceKey, cloudflareToken, restorePlan, restoreReplies,
    gatewayUrl, sharedSecret, publishableKey, versionId, deploymentId,
    async readHoldEpoch() { return restoreIdentity.epoch; },
    async fetchImpl(input, init) {
      const url = new URL(input);
      const request = new Request(input, init);
      if (url.origin === gatewayUrl) return live.config.fetchImpl(input, init);
      if (url.hostname === `${projectRef}.supabase.co`) {
        if (request.method === 'OPTIONS') {
          assert.match(url.pathname, /^\/functions\/v1\/(trip-log|submit-observation)$/);
          assert.equal(request.headers.get('apikey'), publishableKey);
          return new Response(null, { status: 204, headers: {
            'access-control-allow-origin': 'https://ravradar.dk', 'x-ravradar-trip-contract-version': '4.0.311',
            'x-ravradar-trip-storage-mode': edgeMode, 'x-ravradar-trip-export-version': '1',
          } });
        }
        assert.equal(request.method, 'POST');
        assert.equal(request.redirect, 'error');
        assert.equal(url.pathname, '/rest/v1/rpc/read_trip_erasure_restore_subjects');
        assert.equal(request.headers.get('apikey'), serviceKey);
        assert.equal(request.headers.get('authorization'), null);
        assert.deepEqual(await request.json(), {
          p_hold_id: restorePlan.intentId, p_restore_from: journalCoveredFrom, p_capture_at: captureAt, p_after_subject: null,
        });
        return Response.json([{ owner_subject: erased.subject }]);
      }
      assert.equal(url.hostname, 'api.cloudflare.com');
      assert.equal(request.headers.get('authorization'), `Bearer ${cloudflareToken}`);
      const workerPath = `/client/v4/accounts/${accountId}/workers/scripts/ravradar-trip-gateway`;
      if (url.pathname === workerPath + '/deployments') {
        assert.equal(request.method, 'GET');
        return Response.json({ success: true, result: { deployments: [{
          id: deploymentId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }],
        }] } });
      }
      if (url.pathname === workerPath + '/versions/' + versionId) {
        assert.equal(request.method, 'GET');
        return Response.json({ success: true, result: { id: versionId, resources: { bindings: bindings.map(binding => ({
          type: 'd1', name: binding.binding, id: binding.database_id,
        })) } } });
      }
      assert.equal(request.method, 'POST');
      assert.equal(request.redirect, 'error');
      const index = bindings.findIndex(binding => url.pathname ===
        `/client/v4/accounts/${accountId}/d1/database/${binding.database_id}/query`);
      assert.notEqual(index, -1);
      d1Requests += 1;
      const body = await request.json();
      assert.deepEqual(body.params, [erased.subject]);
      assert.equal(body.sql.includes(erased.subject), false);
      const read = body.sql.startsWith('select');
      const statement = live.shards[index].prepare(body.sql).bind(...body.params);
      const result = read ? await statement.all() : await statement.run();
      return Response.json({ success: true, result: [{
        ...result, results: result.results ?? [], meta: { ...result.meta, served_by_primary: !read || primaryRead },
      }] });
    },
  };
  await assert.rejects(reconcileCloudflareHeldTripErasures({
    ...provider, restoreReplies: [{ ...restoreReplies[0], method: 'GET' }],
  }), /TRIP_RESTORE_RECEIPT_UNVERIFIED/);
  await assert.rejects(reconcileCloudflareHeldTripErasures({
    ...provider, restorePlan: { ...restorePlan, journalCoveredFrom: '2026-08-26T09:00:00.000001Z' },
  }), /TRIP_RESTORE_RECEIPT_UNVERIFIED/);
  await assert.rejects(reconcileCloudflareHeldTripErasures({
    ...provider, restorePlan: { ...restorePlan, targets: [{
      ...restorePlan.targets[0],
      baselineLookup: { ...baselineLookup, body: { success: true, result: { bookmark: providerBookmark } } },
    }] },
  }), /TRIP_RESTORE_RECEIPT_UNVERIFIED/);
  assert.equal(d1Requests, 0);
  edgeMode = 'd1';
  await assert.rejects(reconcileCloudflareHeldTripErasures(provider), /TRIP_RESTORE_HOLD_UNVERIFIED/);
  assert.equal(d1Requests, 0);
  edgeMode = 'restore-hold';
  const result = await reconcileCloudflareHeldTripErasures(provider);
  assert.deepEqual(result, {
    kind: 'TRIP_RESTORE_ERASURE_JOURNAL_REPLAYED', epoch: restoreIdentity.epoch, owners: 1, removedRows: 1,
  });
  assert.equal(count('trip_observations', erased), 0);
  assert.equal(count('trip_observation_registry', erased), 0);
  assert.equal(count('trip_owner_erasure_tombstones', erased), 10);
  await assert.rejects(list(erased));
  primaryRead = false;
  await assert.rejects(reconcileCloudflareHeldTripErasures(provider), /TRIP_RESTORE_D1_QUERY_UNVERIFIED/);
  await assert.rejects(list(erased));

  live.hold('false');
  assert.deepEqual(await list(erased), []);
  await assert.rejects(storeCloudflareTrip({ ...live.config, owner: erased, payload: erasedRow }));
  assert.equal((await list(other)).length, 1);
});

test('a changed hold or incomplete journal cannot authorize restoration writes', async () => {
  let requests = 0;
  const shards = Array.from({ length: 10 }, () => ({ prepare() { requests += 1; } }));
  const rows = Array.from({ length: 100 }, (_, i) => ({ owner_subject: 'usr_v1_' + String(i).padStart(43, '0') }));
  await assert.rejects(reconcileHeldTripErasures({
    shards, epoch, readHoldEpoch: async () => epoch,
    readJournalPage: async cursor => cursor === null ? rows : [rows.at(-1)],
  }), /TRIP_RESTORE_JOURNAL_UNVERIFIED/);
  let checks = 0;
  await assert.rejects(reconcileHeldTripErasures({
    shards, epoch, readHoldEpoch: async () => checks++ === 0 ? epoch : null,
    readJournalPage: async () => [rows[0]],
  }), /TRIP_RESTORE_HOLD_UNVERIFIED/);
  assert.equal(requests, 0);
});
