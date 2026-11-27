import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { handleRequest } from '../cloudflare/trip-gateway/worker.js';
import {
  deleteCloudflareTrips, externalOwnerSubject, listCloudflareTrips, storeCloudflareTrip,
} from '../supabase/functions/_shared/trip-storage.js';
import {
  identifyCloudflareTripRestore, openRetainedTripSnapshot, prepareRetainedTripSnapshot,
  reconcileCloudflareHeldTripErasures, reconcileHeldTripErasures,
  resumeRetainedTripSnapshot, sealRetainedTripSnapshot,
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

test('recovery replays a pending erasure on a rolled-back data shard while ordinary access stays held', async t => {
  const live = fixture(t);
  const snapshot = fixture(t);
  const erased = await externalOwnerSubject({ userId: '11111111-1111-4111-8111-111111111111', secret: sharedSecret });
  const other = await externalOwnerSubject({ userId: '22222222-2222-4222-8222-222222222222', secret: sharedSecret });
  const erasedRow = observation('33333333-3333-4333-8333-333333333333');
  const otherRow = observation('44444444-4444-4444-8444-444444444444');
  const pendingId = '99999999-9999-4999-8999-999999999999';
  for (const { config, active } of [live, snapshot]) {
    await storeCloudflareTrip({ ...config, owner: erased, payload: erasedRow });
    await storeCloudflareTrip({ ...config, owner: other, payload: otherRow });
    for (const db of active) {
      db.prepare('update trip_observations set created_at = ?').run(time);
      db.prepare('update trip_observation_registry set created_at = ?').run(time);
    }
  }
  live.active[0].prepare(`insert into trip_observation_registry
    (client_observation_id,trip_id,owner_subject,payload_sha256,target_database_index,created_at)
    values (?,null,?,?,1,?)`).run(pendingId, other.subject, 'a'.repeat(64), time);
  const list = owner => listCloudflareTrips({ ...live.config, ownerSubject: owner.subject });
  const count = (table, owner) => live.active.reduce((total, db) => total
    + db.prepare(`select count(*) as n from ${table} where owner_subject = ?`).get(owner.subject).n, 0);
  live.interrupt(true);
  await assert.rejects(deleteCloudflareTrips({ ...live.config, ownerSubject: erased.subject }));
  assert.equal(count('trip_owner_erasure_tombstones', erased), 1);
  assert.deepEqual(await list(erased), []);
  live.interrupt(false);
  live.hold('true');
  const saved = await prepareRetainedTripSnapshot(live.shards, [erased.subject]);
  const retainedTripRowsSha256 = saved.sha256;

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
  const targetIndex = snapshot.active.findIndex(database => database.prepare(
    'select 1 from trip_observations where client_observation_id = ?',).get(erasedRow.client_observation_id));
  assert.ok(targetIndex > 0, 'This fixture models a data shard and keeps control state intact');
  const databaseId = bindings[targetIndex].database_id;
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
    heldAt: '2026-08-26T11:55:00.123456Z', snapshotAt: '2026-08-26T11:55:30.000Z', captureAt, journalCoveredFrom, retainedTripRowsSha256,
    targets: [{
      databaseId, at: restoreFrom, bookmark: providerBookmark, baselineLookup,
      lookup: { method: 'GET', url: baseRestoreUrl + 'bookmark?timestamp=' + encodeURIComponent(restoreFrom), status: 200,
        body: { success: true, result: { bookmark: providerBookmark } } },
    }],
  };
  const archiveSecret = 'synthetic-local-trip-before-image-encryption-secret';
  const unverifiedControlPlan = { ...restorePlan,
    targets: [{ ...restorePlan.targets[0], databaseId: bindings[0].database_id }],
  };
  assert.throws(() => sealRetainedTripSnapshot({ scope, plan: unverifiedControlPlan, snapshot: saved, archiveSecret }),
    /TRIP_RESTORE_CONTROL_STATE_UNVERIFIED/);
  const sealed = sealRetainedTripSnapshot({ scope, plan: restorePlan, snapshot: saved, archiveSecret });
  restorePlan.retainedArchiveSha256 = sealed.sha256;
  assert.equal(sealed.archive.includes(otherRow.client_observation_id), false);
  assert.notEqual(sealRetainedTripSnapshot({ scope, plan: restorePlan, snapshot: saved, archiveSecret }).sha256, sealed.sha256);
  const directory = mkdtempSync(join(tmpdir(), 'ravradar-test-d1-restore-'));
  const filename = join(directory, 'retained-trips.enc');
  t.after(() => {
    unlinkSync(filename);
    rmdirSync(directory);
  });
  writeFileSync(filename, sealed.archive, { flag: 'wx', mode: 0o600 });
  const reopened = openRetainedTripSnapshot({
    scope, plan: restorePlan, archive: readFileSync(filename), archiveSecret,
  });
  assert.deepEqual(reopened, JSON.parse(JSON.stringify(saved.rows)));
  const hold = { intentId: restorePlan.intentId, heldAt: restorePlan.heldAt };
  const savedEnvelope = readFileSync(filename);
  const resumed = resumeRetainedTripSnapshot({ scope, hold, archive: savedEnvelope, archiveSecret });
  assert.equal(savedEnvelope.includes(providerBookmark), false);
  assert.equal(savedEnvelope.includes(otherRow.client_observation_id), false);
  assert.equal(resumed.plan.runId, '1234');
  assert.equal(resumed.plan.attempt, 1);
  assert.equal(resumed.sha256, sealed.sha256);
  assert.deepEqual(resumed.rows, reopened);
  assert.deepEqual(resumed.plan.targets, [{ databaseId, at: restoreFrom, bookmark: providerBookmark }]);
  assert.equal(Object.hasOwn(resumed.plan, 'captureAt'), false);
  assert.deepEqual(resumeRetainedTripSnapshot({ scope, hold: { ...hold, heldAt: '2026-08-26T11:55:00.123456+00:00' },
    archive: savedEnvelope, archiveSecret }), resumed);
  const reversedBindings = { ...scope, bindings: [...bindings.slice(1), bindings[0]] };
  const alteredEnvelope = Buffer.from(savedEnvelope);
  alteredEnvelope[alteredEnvelope.length - 1] ^= 1;
  for (const override of [{ archive: alteredEnvelope },
    { hold: { ...hold, heldAt: '2026-08-26T11:55:00.123457+00:00' } },
    { hold: { ...hold, intentId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' } },
    { scope: { ...scope, deploymentId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' } },
    { scope: reversedBindings }]) {
    assert.throws(() => resumeRetainedTripSnapshot({ scope, hold, archive: savedEnvelope, archiveSecret, ...override }),
      /TRIP_RESTORE_RETAINED_ARCHIVE_UNVERIFIED/);
  }
  const resumedPlan = { ...resumed.plan, captureAt, retainedArchiveSha256: resumed.sha256,
    targets: [{ ...resumed.plan.targets[0], baselineLookup, lookup: restorePlan.targets[0].lookup }] };

  live.active[targetIndex] = snapshot.active[targetIndex];
  assert.equal(count('trip_owner_erasure_tombstones', erased), 1);
  assert.equal(count('trip_observations', erased), 1);
  await assert.rejects(list(erased));

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
  let providerRequests = 0;
  let d1Requests = 0;
  let d1Writes = 0;
  const activeHold = [{ hold_id: restorePlan.intentId, held_at: restorePlan.heldAt }];
  let holdReadbacks = [];
  const reinsertedTables = [];
  const provider = {
    bindings, projectRef, accountId, serviceKey, cloudflareToken, restorePlan: resumedPlan, restoreReplies,
    retainedArchive: readFileSync(filename), archiveSecret,
    gatewayUrl, sharedSecret, publishableKey, versionId, deploymentId,
    async fetchImpl(input, init) {
      providerRequests += 1;
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
        if (url.pathname === '/rest/v1/rpc/read_trip_erasure_recovery_hold') {
          assert.equal(request.method, 'GET');
          assert.equal(request.redirect, 'error');
          assert.equal(request.headers.get('apikey'), serviceKey);
          assert.equal(request.headers.get('authorization'), null);
          assert.equal(request.body, null);
          return Response.json(holdReadbacks.shift() ?? activeHold);
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
      if (body.sql.startsWith('select *')) {
        if (body.sql.includes(' collate binary ')) assert.deepEqual(body.params, ['']);
        else assert.ok(body.params.length === 1 && [otherRow.client_observation_id, pendingId].includes(body.params[0]));
      } else if (/^insert into trip_(observations|observation_registry) /.test(body.sql)) {
        assert.ok(body.params.includes(other.subject));
        reinsertedTables.push(body.sql.split(' ')[2]);
      } else assert.deepEqual(body.params, [erased.subject]);
      assert.equal(body.sql.includes(erased.subject), false);
      const read = body.sql.startsWith('select');
      if (!read) d1Writes += 1;
      const statement = live.shards[index].prepare(body.sql).bind(...body.params);
      const result = read ? await statement.all() : await statement.run();
      return Response.json({ success: true, result: [{
        ...result, results: result.results ?? [], meta: { ...result.meta, served_by_primary: !read || primaryRead },
      }] });
    },
  };
  await assert.rejects(reconcileCloudflareHeldTripErasures({
    ...provider, restorePlan: { ...unverifiedControlPlan, retainedArchiveSha256: sealed.sha256 },
  }), /TRIP_RESTORE_CONTROL_STATE_UNVERIFIED/);
  assert.equal(providerRequests, 0);
  await assert.rejects(reconcileCloudflareHeldTripErasures({
    ...provider, restoreReplies: [{ ...restoreReplies[0], method: 'GET' }],
  }), /TRIP_RESTORE_RECEIPT_UNVERIFIED/);
  await assert.rejects(reconcileCloudflareHeldTripErasures({
    ...provider, restorePlan: { ...restorePlan, snapshotAt: restoreReplies[0].startedAt },
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
  const changedArchive = Buffer.from(sealed.archive);
  changedArchive[changedArchive.length - 1] ^= 1;
  const changedArchiveDigest = createHash('sha256').update(changedArchive).digest('hex');
  for (const overrides of [
    { retainedArchive: undefined, retainedTripRows: saved.rows },
    { retainedArchive: changedArchive },
    { retainedArchive: changedArchive, restorePlan: { ...restorePlan, retainedArchiveSha256: changedArchiveDigest } },
    { archiveSecret: archiveSecret + '-incorrect' },
    { restorePlan: { ...restorePlan, runId: '5678' } },
    { restorePlan: { ...restorePlan, snapshotAt: '2026-08-26T11:55:31.000Z' } },
    { restorePlan: { ...restorePlan, retainedTripRowsSha256: 'a'.repeat(64) } },
  ]) {
    await assert.rejects(reconcileCloudflareHeldTripErasures({ ...provider, ...overrides }), /TRIP_RESTORE_RETAINED_ARCHIVE_UNVERIFIED/);
  }
  assert.equal(providerRequests, 0);
  for (const readbacks of [
    [[]],
    [[{ hold_id: null, held_at: null }]],
    [[{ hold_id: restorePlan.intentId, held_at: '2026-08-26T11:55:00.123457Z' }]],
    [activeHold, [{ hold_id: null, held_at: null }]],
    [activeHold, [{ hold_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', held_at: restorePlan.heldAt }]],
  ]) {
    holdReadbacks = [...readbacks];
    await assert.rejects(reconcileCloudflareHeldTripErasures(provider), /TRIP_RESTORE_HOLD_UNVERIFIED/);
    assert.equal(d1Requests, 0);
    assert.equal(holdReadbacks.length, 0);
  }
  edgeMode = 'd1';
  await assert.rejects(reconcileCloudflareHeldTripErasures(provider), /TRIP_RESTORE_HOLD_UNVERIFIED/);
  assert.equal(d1Requests, 0);
  edgeMode = 'restore-hold';
  const verifyOnly = () => reconcileCloudflareHeldTripErasures({ ...provider, verifyOnly: true });
  await assert.rejects(verifyOnly(), /TRIP_DELETE_INVALID/);
  assert.equal(d1Writes, 0, 'A remaining trip must not turn a readback into a replay');
  const otherDb = live.active.find(db => db.prepare('select 1 from trip_observations where owner_subject = ?').get(other.subject));
  const original = otherDb.prepare('select * from trip_observations where owner_subject = ?').get(other.subject);
  otherDb.prepare('update trip_observations set payload_json = ? where owner_subject = ?').run('{}', other.subject);
  await assert.rejects(reconcileCloudflareHeldTripErasures(provider), /TRIP_RESTORE_RETAINED_ROWS_MISMATCH/);
  assert.equal(d1Writes, 0, 'Retained row conflicts must be found before erasure replay can write');
  assert.equal(count('trip_observations', erased), 1);
  otherDb.prepare('update trip_observations set payload_json = ? where owner_subject = ?').run(original.payload_json, other.subject);
  const result = await reconcileCloudflareHeldTripErasures(provider);
  assert.deepEqual(result, {
    kind: 'TRIP_RESTORE_ERASURE_JOURNAL_REPLAYED', epoch: restoreIdentity.epoch, owners: 1, removedRows: 1, recoveredRows: 0, retainedTripRowsSha256,
  });
  assert.deepEqual(reinsertedTables.splice(0), []);
  assert.equal(live.active[0].prepare('select created_at from trip_observation_registry where client_observation_id = ?').get(pendingId).created_at, time);
  assert.ok(live.active.every(db => !db.prepare('select 1 from trip_observations where client_observation_id = ?').get(pendingId)));
  assert.equal(count('trip_observations', erased), 0);
  assert.equal(count('trip_observation_registry', erased), 0);
  assert.equal(count('trip_owner_erasure_tombstones', erased), 10);
  await assert.rejects(list(erased));
  const writesAfterReplay = d1Writes;
  assert.deepEqual(await verifyOnly(), {
    kind: 'TRIP_RESTORE_ERASURE_JOURNAL_READBACK_VERIFIED', epoch: restoreIdentity.epoch, owners: 1, retainedTripRowsSha256,
  });
  const erasedInTarget = live.active[targetIndex].prepare(
    'select * from trip_owner_erasure_tombstones where owner_subject = ?'
  ).get(erased.subject);
  live.active[targetIndex].prepare('delete from trip_owner_erasure_tombstones where owner_subject = ?').run(erased.subject);
  await assert.rejects(verifyOnly(), /TRIP_DELETE_INVALID/);
  live.active[targetIndex].prepare('insert into trip_owner_erasure_tombstones (owner_subject, erased_at) values (?, ?)').run(
    erasedInTarget.owner_subject, erasedInTarget.erased_at,
  );
  const control = live.active[0];
  const originalReservation = control.prepare(
    'select * from trip_observation_registry where client_observation_id = ?'
  ).get(otherRow.client_observation_id);
  control.prepare(`insert into trip_observation_registry
    (client_observation_id, trip_id, owner_subject, payload_sha256, target_database_index, created_at)
    values (?, ?, ?, ?, ?, ?)`).run(
    erasedRow.client_observation_id, null, erased.subject, originalReservation.payload_sha256, targetIndex, time,
  );
  await assert.rejects(verifyOnly(), /TRIP_DELETE_INVALID/);
  control.prepare('delete from trip_observation_registry where client_observation_id = ?').run(erasedRow.client_observation_id);
  otherDb.prepare('update trip_observations set payload_json = ? where owner_subject = ?').run('{}', other.subject);
  await assert.rejects(verifyOnly(), /TRIP_RESTORE_RETAINED_ROWS_MISMATCH/);
  otherDb.prepare('update trip_observations set payload_json = ? where owner_subject = ?').run(original.payload_json, other.subject);
  await assert.rejects(reconcileCloudflareHeldTripErasures({ ...provider, verifyOnly: true, restoreReplies: [] }),
    /TRIP_RESTORE_RECEIPT_UNVERIFIED/);
  assert.equal(d1Writes, writesAfterReplay, 'Readback must use only primary SELECT queries');
  otherDb.prepare('delete from trip_observations where owner_subject = ?').run(other.subject);
  live.active[0].prepare('delete from trip_observation_registry where client_observation_id = ?').run(otherRow.client_observation_id);
  assert.equal((await reconcileCloudflareHeldTripErasures(provider)).recoveredRows, 2);
  assert.deepEqual(reinsertedTables, ['trip_observation_registry', 'trip_observations']);
  assert.deepEqual(otherDb.prepare('select * from trip_observations where owner_subject = ?').get(other.subject), original);
  assert.deepEqual(live.active[0].prepare('select * from trip_observation_registry where client_observation_id = ?').get(otherRow.client_observation_id), originalReservation);
  assert.equal((await reconcileCloudflareHeldTripErasures(provider)).recoveredRows, 0);
  const priorWrites = d1Writes;
  primaryRead = false;
  await assert.rejects(reconcileCloudflareHeldTripErasures(provider), /TRIP_RESTORE_D1_QUERY_UNVERIFIED/);
  assert.equal(d1Writes, priorWrites, 'Unconfirmed primary reads must stop replay before writes');
  await assert.rejects(list(erased));

  live.hold('false');
  assert.deepEqual(await list(erased), []);
  await assert.rejects(storeCloudflareTrip({ ...live.config, owner: erased, payload: erasedRow }));
  assert.equal((await list(other)).length, 1);
});

test('retained snapshots stop collecting rows at the archive budget', async () => {
  const oversizedPayload = 'x'.repeat(360_000);
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    storage_schema_version: 1, owner_subject: 'usr_v1_' + 'a'.repeat(43), owner_kind: 'user', trip_id: null,
    client_observation_id: String(index).padStart(4, '0'), observed_at: time, submitted_at: time,
    payload_json: oversizedPayload, payload_sha256: 'a'.repeat(64), source: 'fixture', created_at: time,
  }));
  let requests = 0;
  const shards = Array.from({ length: 10 }, () => ({ prepare: () => ({ bind: () => ({ all: async () => {
    assert.equal(++requests, 1);
    return { success: true, results: firstPage };
  } }) }) }));
  await assert.rejects(prepareRetainedTripSnapshot(shards, []), /TRIP_RESTORE_RETAINED_ARCHIVE_UNVERIFIED/);
  assert.equal(requests, 1);
});

test('a changed hold or incomplete journal cannot authorize restoration writes', async t => {
  let requests = 0;
  const shards = Array.from({ length: 10 }, () => ({ prepare() { requests += 1; } }));
  const rows = Array.from({ length: 100 }, (_, i) => ({ owner_subject: 'usr_v1_' + String(i).padStart(43, '0') }));
  await assert.rejects(reconcileHeldTripErasures({
    shards, epoch, retainedTripRowsSha256: epoch, readHoldEpoch: async () => epoch,
    readJournalPage: async cursor => cursor === null ? rows : [rows.at(-1)],
  }), /TRIP_RESTORE_JOURNAL_UNVERIFIED/);
  const snapshot = await prepareRetainedTripSnapshot(fixture(t).shards, []);
  let checks = 0;
  await assert.rejects(reconcileHeldTripErasures({
    shards, epoch, retainedTripRowsSha256: snapshot.sha256, retainedTripRows: snapshot.rows,
    readHoldEpoch: async () => checks++ === 0 ? epoch : null,
    readJournalPage: async () => [rows[0]],
  }), /TRIP_RESTORE_HOLD_UNVERIFIED/);
  assert.equal(requests, 0);
});
