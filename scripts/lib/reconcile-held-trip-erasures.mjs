import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { assertOwnerTripErasureReadback, deleteOwnerTrips } from '../../cloudflare/trip-gateway/worker.js';
import { canonicalJson, normalizeCloudflareGatewayUrl } from '../../supabase/functions/_shared/trip-storage.js';
import {
  runWorkerCountReadProbe, verifyExistingWorkerBindings, waitForWorkerHealth, WORKER_COUNT_SIGNED_PROBE_KIND,
} from '../verify-cloudflare-trip-gateway.mjs';
import { boundedFetch } from './bounded-fetch.mjs';
import { waitForTripStorageEdgeReadiness } from './trip-storage-edge-readiness.mjs';
import { TRIP_STORAGE_REQUIRED_SHARD_NAMES } from './trip-storage-legacy-classification.mjs';
import { verifyTripErasureRecoveryCatalog } from '../verify-account-erasure-schema.mjs';

const pageSize = 100;
const subjectPattern = /^usr_v1_[A-Za-z0-9_-]{43}$/;
const digestPattern = /^[a-f0-9]{64}$/;
const databaseIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const exactUtcPattern = /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const bookmarkValid = s => typeof s === 'string' && s.length > 0 && s.length <= 1024
  && s.trim() === s && !/[\x00-\x1f\x7f]/.test(s);
const retainedTables = [
  { name: 'trip_observations', key: 'client_observation_id',
    columns: ['storage_schema_version', 'owner_subject', 'owner_kind', 'trip_id', 'client_observation_id',
      'observed_at', 'submitted_at', 'payload_json', 'payload_sha256', 'source', 'created_at'] },
  { name: 'trip_observation_registry', key: 'client_observation_id',
    columns: ['client_observation_id', 'trip_id', 'owner_subject', 'payload_sha256', 'target_database_index', 'created_at'] },
  { name: 'trip_owner_erasure_tombstones', key: 'owner_subject', columns: ['owner_subject', 'erased_at'] },
];
const retainedRowsError = () => new Error('TRIP_RESTORE_RETAINED_ROWS_UNVERIFIED');
const archiveError = () => new Error('TRIP_RESTORE_RETAINED_ARCHIVE_UNVERIFIED');
const archiveDomain = 'RavRadar/trip-d1-retained-rows/v2';
const archiveMagic = Buffer.from('RR-TRIP-D1-RETAINED-2\n');
const archiveSaltBytes = 16;
const archiveNonceBytes = 12;
const archiveTagBytes = 16;
const archivePrefixBytes = archiveMagic.length + archiveSaltBytes + archiveNonceBytes;
const maximumSnapshotBytes = 32 * 1024 * 1024;
const maximumDescriptorBytes = 16 * 1024;
const maximumArchiveBytes = maximumSnapshotBytes + 64 * 1024;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function timestampKey(time) {
  if (typeof time !== 'string' || !exactUtcPattern.test(time) || !Number.isFinite(Date.parse(time))
    || new Date(time).toISOString().slice(0, 19) !== time.slice(0, 19)) {
    throw new Error('TRIP_RESTORE_RECEIPT_TIME_INVALID');
  }
  return time.slice(0, 19) + '.' + (time.includes('.') ? time.slice(20, -1) : '').padEnd(6, '0');
}

function isTripRestoreScope(scope) {
  const { bindings, accountId, projectRef, versionId, deploymentId } = scope ?? {};
  return Array.isArray(bindings) && bindings.length === 10
    && TRIP_STORAGE_REQUIRED_SHARD_NAMES.every((name, index) => {
      const binding = bindings[index];
      return binding?.binding === `TRIP_DB_${index}`
        && binding.database_name === name
        && typeof binding.database_id === 'string' && databaseIdPattern.test(binding.database_id);
    })
    && new Set(bindings.map(binding => binding.database_id)).size === 10
    && typeof accountId === 'string' && /^[a-f0-9]{32}$/.test(accountId)
    && typeof projectRef === 'string' && /^[a-z0-9]{20}$/.test(projectRef)
    && [versionId, deploymentId].every(id => typeof id === 'string' && databaseIdPattern.test(id));
}

function requireTripDataShard(databaseId, bindings) {
  if (databaseId === bindings[0].database_id) {
    throw new Error('TRIP_RESTORE_CONTROL_STATE_UNVERIFIED');
  }
}

// Receipt inputs belong to the locked, authenticated management caller that
// captured the POSTs. The digest binds their meaning, not their authenticity.
// No restore requests are issued here.
export function identifyCloudflareTripRestore({ accountId, projectRef, bindings, versionId, deploymentId, plan, replies }) {
  const failure = () => new Error('TRIP_RESTORE_RECEIPT_UNVERIFIED');
  if (!isTripRestoreScope({ accountId, projectRef, bindings, versionId, deploymentId })
    || !plan || typeof plan.intentId !== 'string' || !databaseIdPattern.test(plan.intentId)
    || typeof plan.sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(plan.sourceSha)
    || typeof plan.retainedTripRowsSha256 !== 'string' || !digestPattern.test(plan.retainedTripRowsSha256)
    || typeof plan.retainedArchiveSha256 !== 'string' || !digestPattern.test(plan.retainedArchiveSha256)
    || typeof plan.runId !== 'string' || !/^[1-9]\d{0,19}$/.test(plan.runId) || plan.attempt !== 1
    || !Array.isArray(plan.targets) || plan.targets.length < 1 || plan.targets.length > 10
    || !Array.isArray(replies) || replies.length !== plan.targets.length) throw failure();
  const held = timestampKey(plan.heldAt);
  const snapshotAt = timestampKey(plan.snapshotAt);
  const captured = timestampKey(plan.captureAt);
  const covered = timestampKey(plan.journalCoveredFrom);
  if (covered > held || held > snapshotAt || snapshotAt >= captured) throw failure();

  function verifyBookmarkLookup(databaseId, time, receipt) {
    const lookup = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/time_travel/bookmark`);
    lookup.searchParams.set('timestamp', time);
    const bookmark = receipt?.body?.result?.bookmark;
    if (receipt?.method !== 'GET' || receipt.url !== lookup.href || receipt.status !== 200
      || receipt.body?.success !== true || !bookmarkValid(bookmark)
      || !Array.isArray(receipt.body.errors ?? []) || (receipt.body.errors ?? []).length !== 0) throw failure();
    return bookmark;
  }

  const ids = new Set();
  const restored = plan.targets.map(target => {
    const point = timestampKey(target?.at);
    requireTripDataShard(target.databaseId, bindings);
    if (!bindings.some(binding => binding.database_id === target.databaseId) || ids.has(target.databaseId)
      || point <= covered || point > held || !bookmarkValid(target.bookmark)) throw failure();
    const baselineBookmark = verifyBookmarkLookup(target.databaseId, plan.journalCoveredFrom, target.baselineLookup);
    const selectedBookmark = verifyBookmarkLookup(target.databaseId, target.at, target.lookup);
    // Cloudflare's lookup returns the last bookmark at or before its timestamp.
    // A strictly later bookmark therefore lies within covered journal history.
    if (selectedBookmark !== target.bookmark || selectedBookmark <= baselineBookmark) throw failure();
    ids.add(target.databaseId);
    const matching = replies.filter(reply => reply?.databaseId === target.databaseId);
    if (matching.length !== 1) throw failure();
    const [reply] = matching;
    const start = timestampKey(reply.startedAt), end = timestampKey(reply.completedAt);
    const requested = new URL(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${target.databaseId}/time_travel/restore`);
    requested.searchParams.set('bookmark', target.bookmark);
    if (reply.method !== 'POST' || reply.url !== requested.href || !(snapshotAt < start && start <= end && end <= captured)
      || reply.status !== 200 || reply.body?.success !== true
      || (reply.body.errors !== undefined && (!Array.isArray(reply.body.errors) || reply.body.errors.length !== 0))
      || !bookmarkValid(reply.body.result?.bookmark) || !bookmarkValid(reply.body.result?.previous_bookmark)) {
      throw failure();
    }
    return {
      databaseId: target.databaseId, at: target.at, requestedBookmark: target.bookmark, baselineBookmark,
      startedAt: reply.startedAt, completedAt: reply.completedAt,
      restoredBookmark: reply.body.result.bookmark, previousBookmark: reply.body.result.previous_bookmark,
    };
  });
  return {
    restoreFrom: plan.journalCoveredFrom, captureAt: plan.captureAt,
    epoch: sha256(canonicalJson({
      scope: 'ravradar-trip-d1-restore-v5', accountId, projectRef, versionId, deploymentId, bindings,
      intentId: plan.intentId, sourceSha: plan.sourceSha, runId: plan.runId, attempt: plan.attempt,
      retainedTripRowsSha256: plan.retainedTripRowsSha256, retainedArchiveSha256: plan.retainedArchiveSha256,
      heldAt: plan.heldAt, snapshotAt: plan.snapshotAt, captureAt: plan.captureAt, journalCoveredFrom: plan.journalCoveredFrom, restored,
    })),
  };
}

function verifyRetainedRow(row, { key, columns }, cursor) {
  const id = row?.[key];
  if (typeof id !== 'string' || id <= cursor || /[^\x21-\x7e]/.test(id)
    || typeof row.owner_subject !== 'string' || row.owner_subject.length < 20 || row.owner_subject.length > 96
    || Object.keys(row).length !== columns.length || columns.some(column => !Object.hasOwn(row, column)
      || (row[column] !== null && typeof row[column] !== 'string' && !Number.isSafeInteger(row[column])))) {
    throw retainedRowsError();
  }
  return id;
}

async function* readRetainedRows(shard, table, erased) {
  const { name, key } = table;
  let cursor = '';
  for (;;) {
    const bound = cursor === '' ? '>=' : '>';
    const sql = `select * from ${name} where ${key} collate binary ${bound} ? order by ${key} collate binary limit ${pageSize}`;
    const page = await shard.prepare(sql).bind(cursor).all();
    const rows = page?.results;
    if (page?.success !== true || !Array.isArray(rows) || rows.length > pageSize) throw retainedRowsError();
    for (const row of rows) {
      cursor = verifyRetainedRow(row, table, cursor);
      if (!erased.has(row.owner_subject)) yield row;
    }
    if (rows.length < pageSize) break;
  }
}

async function captureRetainedTripRows(shards, erasedSubjects) {
  if (!Array.isArray(shards) || shards.length !== 10) throw retainedRowsError();
  const erased = new Set(erasedSubjects);
  const snapshot = [];
  let bytes = Buffer.byteLength(canonicalJson(shards.map(() => retainedTables.map(() => []))));
  for (const shard of shards) {
    const tables = [];
    for (const table of retainedTables) {
      const rows = [];
      for await (const row of readRetainedRows(shard, table, erased)) {
        bytes += Buffer.byteLength(canonicalJson(row)) + (rows.length ? 1 : 0);
        if (bytes > maximumSnapshotBytes) throw archiveError();
        rows.push(row);
      }
      tables.push(rows);
    }
    snapshot.push(tables);
  }
  return snapshot;
}

function retainedDigest(snapshot, erased) {
  if (!Array.isArray(snapshot) || snapshot.length !== 10) throw retainedRowsError();
  const hash = createHash('sha256').update('ravradar-retained-trip-rows-v1\n');
  for (const [index, tables] of snapshot.entries()) {
    if (!Array.isArray(tables) || tables.length !== retainedTables.length) throw retainedRowsError();
    for (const [tableIndex, table] of retainedTables.entries()) {
      const rows = tables[tableIndex];
      if (!Array.isArray(rows)) throw retainedRowsError();
      hash.update(canonicalJson([index, table.name]) + '\n');
      let cursor = '';
      for (const row of rows) {
        cursor = verifyRetainedRow(row, table, cursor);
        if (erased.has(row.owner_subject)) throw retainedRowsError();
        hash.update(canonicalJson(row) + '\n');
      }
    }
  }
  return hash.digest('hex');
}

function verifyRetainedIdentities(snapshot) {
  const reserved = new Map(snapshot[0][1].map(row => [row.client_observation_id, row]));
  const erased = new Set(snapshot.flatMap(tables => tables[2].map(row => row.owner_subject)));
  const clients = new Set();
  const trips = new Set();
  for (const [index, [observations, registry]] of snapshot.entries()) {
    if (index !== 0 && registry.length) throw retainedRowsError();
    for (const row of registry) {
      if (erased.has(row.owner_subject) || !Number.isSafeInteger(row.target_database_index)
        || row.target_database_index < 0 || row.target_database_index >= snapshot.length
        || (row.trip_id !== null && (typeof row.trip_id !== 'string' || trips.has(row.trip_id)))) throw retainedRowsError();
      if (row.trip_id !== null) trips.add(row.trip_id);
    }
    for (const row of observations) {
      const identity = reserved.get(row.client_observation_id);
      if (!identity || clients.has(row.client_observation_id) || erased.has(row.owner_subject)
        || identity.target_database_index !== index || identity.owner_subject !== row.owner_subject
        || identity.trip_id !== row.trip_id || identity.payload_sha256 !== row.payload_sha256) throw retainedRowsError();
      clients.add(row.client_observation_id);
    }
  }
}

// Capture these exact rows only under the held, primary-database management
// caller. Protect the copy independently of D1 before Time Travel begins.
export async function prepareRetainedTripSnapshot(shards, erasedSubjects) {
  const rows = await captureRetainedTripRows(shards, erasedSubjects);
  const sha256 = retainedDigest(rows, new Set(erasedSubjects));
  verifyRetainedIdentities(rows);
  return { rows, sha256 };
}

function retainedPlan(scope, plan) {
  const { intentId, sourceSha, runId, attempt, heldAt, snapshotAt,
    journalCoveredFrom, retainedTripRowsSha256, targets } = plan ?? {};
  if (!isTripRestoreScope(scope) || typeof intentId !== 'string' || !databaseIdPattern.test(intentId)
    || typeof sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(sourceSha)
    || typeof runId !== 'string' || !/^[1-9]\d{0,19}$/.test(runId) || attempt !== 1
    || typeof retainedTripRowsSha256 !== 'string' || !digestPattern.test(retainedTripRowsSha256)
    || !Array.isArray(targets) || targets.length < 1 || targets.length > 10) throw archiveError();
  const held = timestampKey(heldAt);
  const covered = timestampKey(journalCoveredFrom);
  if (covered > held || held > timestampKey(snapshotAt)) throw archiveError();
  const databases = new Set(scope.bindings.map(binding => binding.database_id));
  const points = targets.map(target => {
    const { databaseId, at, bookmark } = target ?? {};
    requireTripDataShard(databaseId, scope.bindings);
    const point = timestampKey(at);
    if (!databases.delete(databaseId) || point <= covered || point > held || !bookmarkValid(bookmark)) throw archiveError();
    return { databaseId, at, bookmark };
  });
  return { intentId, sourceSha, runId, attempt, heldAt, snapshotAt, journalCoveredFrom,
    retainedTripRowsSha256, targets: points };
}

function protectedHoldTime(heldAt) {
  return timestampKey(typeof heldAt === 'string' ? heldAt.replace(/\+00:00$/, 'Z') : heldAt);
}

function recoveryServiceHeaders(serviceKey) {
  const headers = { apikey: serviceKey };
  if (!serviceKey.startsWith('sb_secret_')) headers.Authorization = `Bearer ${serviceKey}`;
  return headers;
}

// The durable SQL hold is outside the D1 databases and survives a lost runner.
export async function readTripErasureRecoveryHold({ projectRef, serviceKey, fetchImpl = fetch }) {
  const failure = () => new Error('TRIP_RESTORE_HOLD_UNVERIFIED');
  if (typeof projectRef !== 'string' || !/^[a-z0-9]{20}$/.test(projectRef)
    || typeof serviceKey !== 'string' || !serviceKey) throw failure();
  try {
    const response = await boundedFetch(`https://${projectRef}.supabase.co/rest/v1/rpc/read_trip_erasure_recovery_hold`, {
      method: 'GET', redirect: 'error', cache: 'no-store',
      headers: { ...recoveryServiceHeaders(serviceKey), Accept: 'application/json' },
    }, { fetchImpl });
    if (!response.ok || response.redirected) throw failure();
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 1) throw failure();
    const row = rows[0];
    if (!row || Object.keys(row).length !== 2 || !Object.hasOwn(row, 'hold_id') || !Object.hasOwn(row, 'held_at')) {
      throw failure();
    }
    if (row.hold_id === null && row.held_at === null) return null;
    if (typeof row.hold_id !== 'string' || !databaseIdPattern.test(row.hold_id)
      || row.hold_id === '00000000-0000-0000-0000-000000000000'
      || typeof row.held_at !== 'string' || !/\.\d{6}Z$/.test(row.held_at)) throw failure();
    timestampKey(row.held_at);
    return { intentId: row.hold_id, heldAt: row.held_at };
  } catch {
    throw failure();
  }
}

export async function verifyInstalledTripErasureRecoverySchema({accessToken, serviceKey, fetchImpl = globalThis.fetch}) {
  assert(typeof serviceKey === 'string' && serviceKey.length && !/[\r\n]/.test(serviceKey));
  await verifyTripErasureRecoveryCatalog({accessToken,fetchImpl});
  const projectRef = 'afqhhdrkjfjtpadntdzo';
  assert.equal(await readTripErasureRecoveryHold({projectRef,serviceKey,fetchImpl}),null,
    'Trip recovery installation must leave the existing journals open');
  return {kind:'TRIP_RECOVERY_SCHEMA_INSTALLED',catalogVerified:true,holdOpen:true,activationAuthority:false};
}

// Only the current authenticated hold and unchanged deployment are needed to
// open the envelope. Its authenticated plaintext carries the original plan.
function retainedArchiveContext(scope, hold) {
  if (!isTripRestoreScope(scope) || typeof hold?.intentId !== 'string' || !databaseIdPattern.test(hold.intentId)) {
    throw archiveError();
  }
  const { accountId, projectRef, bindings, versionId, deploymentId } = scope;
  return Buffer.from(canonicalJson({
    purpose: archiveDomain, accountId, projectRef, versionId, deploymentId,
    databases: bindings.map(({ database_id }) => database_id),
    intentId: hold.intentId, heldAt: protectedHoldTime(hold.heldAt),
  }));
}

function retainedArchiveKey(archiveSecret, salt) {
  if (typeof archiveSecret !== 'string' || archiveSecret.length < 32) throw archiveError();
  return Buffer.from(hkdfSync('sha256', Buffer.from(archiveSecret), salt, archiveDomain, 32));
}

export function sealRetainedTripSnapshot({ scope, plan, snapshot, archiveSecret }) {
  const descriptor = Buffer.from(canonicalJson(retainedPlan(scope, plan)));
  if (snapshot?.sha256 !== plan.retainedTripRowsSha256
    || retainedDigest(snapshot.rows, new Set()) !== snapshot.sha256) throw retainedRowsError();
  verifyRetainedIdentities(snapshot.rows);
  const rows = Buffer.from(canonicalJson(snapshot.rows));
  if (rows.length > maximumSnapshotBytes || descriptor.length > maximumDescriptorBytes) throw archiveError();
  const salt = randomBytes(archiveSaltBytes);
  const nonce = randomBytes(archiveNonceBytes);
  const prefix = Buffer.concat([archiveMagic, salt, nonce]);
  const cipher = createCipheriv('aes-256-gcm', retainedArchiveKey(archiveSecret, salt), nonce, { authTagLength: archiveTagBytes });
  cipher.setAAD(Buffer.concat([prefix, retainedArchiveContext(scope, plan)]));
  const plain = Buffer.concat([descriptor, Buffer.from('\n'), rows]);
  const archive = Buffer.concat([prefix, cipher.update(gzipSync(plain)), cipher.final(), cipher.getAuthTag()]);
  if (archive.length > maximumArchiveBytes) throw archiveError();
  return { archive, sha256: sha256(archive) };
}

// The caller supplies the hold just read from the protected service, then
// verifies live provider receipts separately before any restore or replay.
export function resumeRetainedTripSnapshot({ scope, hold, archive, archiveSecret }) {
  if (!Buffer.isBuffer(archive) || archive.length <= archivePrefixBytes + archiveTagBytes
    || archive.length > maximumArchiveBytes || !archive.subarray(0, archiveMagic.length).equals(archiveMagic)) {
    throw archiveError();
  }
  const prefix = archive.subarray(0, archivePrefixBytes);
  const salt = prefix.subarray(archiveMagic.length, archiveMagic.length + archiveSaltBytes);
  const nonce = prefix.subarray(archiveMagic.length + archiveSaltBytes);
  const end = archive.length - archiveTagBytes;
  let descriptor, rows;
  try {
    const decipher = createDecipheriv('aes-256-gcm', retainedArchiveKey(archiveSecret, salt), nonce, { authTagLength: archiveTagBytes });
    decipher.setAAD(Buffer.concat([prefix, retainedArchiveContext(scope, hold)]));
    decipher.setAuthTag(archive.subarray(end));
    const compressed = Buffer.concat([decipher.update(archive.subarray(archivePrefixBytes, end)), decipher.final()]);
    const plain = gunzipSync(compressed, { maxOutputLength: maximumSnapshotBytes + maximumDescriptorBytes + 1 });
    const separator = plain.indexOf(0x0a);
    if (separator <= 0 || separator > maximumDescriptorBytes || plain.length - separator - 1 > maximumSnapshotBytes) {
      throw archiveError();
    }
    const decode = new TextDecoder('utf-8', { fatal: true });
    const metadata = JSON.parse(decode.decode(plain.subarray(0, separator)));
    descriptor = retainedPlan(scope, metadata);
    if (descriptor.intentId !== hold.intentId || timestampKey(descriptor.heldAt) !== protectedHoldTime(hold.heldAt)
      || canonicalJson(descriptor) !== canonicalJson(metadata)) throw archiveError();
    rows = JSON.parse(decode.decode(plain.subarray(separator + 1)));
  } catch {
    throw archiveError();
  }
  if (retainedDigest(rows, new Set()) !== descriptor.retainedTripRowsSha256) throw retainedRowsError();
  verifyRetainedIdentities(rows);
  return { plan: descriptor, rows, sha256: sha256(archive) };
}

// An active caller also checks that the sealed descriptor matches its own
// original plan. The separate capture time and provider receipts remain live.
export function openRetainedTripSnapshot({ scope, plan, archive, archiveSecret }) {
  const resumed = resumeRetainedTripSnapshot({ scope, hold: plan, archive, archiveSecret });
  if (resumed.sha256 !== plan.retainedArchiveSha256
    || canonicalJson(resumed.plan) !== canonicalJson(retainedPlan(scope, plan))) throw archiveError();
  return resumed.rows;
}
async function planRetainedRows(shards, snapshot, subjects) {
  const current = await captureRetainedTripRows(shards, subjects);
  const work = [];
  // Restore earlier tombstones first, then reservations, then observations.
  for (const tableIndex of [2, 1, 0]) {
    const table = retainedTables[tableIndex];
    const { name, key, columns } = table;
    const sql = `insert into ${name} (${columns.join(', ')}) values (${columns.map(() => '?').join(', ')})`;
    const read = `select * from ${name} where ${key} = ?`;
    for (const [index, tables] of snapshot.entries()) {
      const before = new Map(tables[tableIndex].map(row => [row[key], row]));
      for (const row of current[index][tableIndex]) {
        if (canonicalJson(before.get(row[key]) ?? null) !== canonicalJson(row)) {
          throw new Error('TRIP_RESTORE_RETAINED_ROWS_MISMATCH');
        }
        before.delete(row[key]);
      }
      for (const row of before.values()) {
        work.push({ index, sql, read, keyValue: row[key], row, parameters: columns.map(column => row[column]) });
      }
    }
  }
  return work;
}

async function restoreRetainedRows(shards, work, requireHold) {
  for (let at = 0; at < work.length; at += pageSize) {
    await requireHold();
    for (const { index, sql, read, keyValue, row, parameters } of work.slice(at, at + pageSize)) {
      const result = await shards[index].prepare(sql).bind(...parameters).run();
      if (result?.success !== true || result.meta?.changes !== 1) throw retainedRowsError();
      const check = await shards[index].prepare(read).bind(keyValue).all();
      if (check?.success !== true || !Array.isArray(check.results) || check.results.length !== 1
        || canonicalJson(check.results[0]) !== canonicalJson(row)) throw retainedRowsError();
    }
  }
  return work.length;
}

// The management caller owns the production lock. It binds the epoch to the
// live hold, restored shards and journal cutoff, and uses bound D1 queries.
// This function never changes either runtime's hold configuration.
export async function reconcileHeldTripErasures({
  shards, epoch, retainedTripRowsSha256, retainedTripRows, readHoldEpoch, readJournalPage, verifyOnly = false,
}) {
  if (!Array.isArray(shards) || shards.length !== 10 || new Set(shards).size !== 10
    || shards.some(shard => typeof shard?.prepare !== 'function')
    || typeof epoch !== 'string' || !digestPattern.test(epoch)
    || typeof retainedTripRowsSha256 !== 'string' || !digestPattern.test(retainedTripRowsSha256)
    || typeof readHoldEpoch !== 'function' || typeof readJournalPage !== 'function' || typeof verifyOnly !== 'boolean') {
    throw new Error('TRIP_RESTORE_RECONCILIATION_INPUT_INVALID');
  }
  async function requireHold() {
    if (await readHoldEpoch() !== epoch) throw new Error('TRIP_RESTORE_HOLD_UNVERIFIED');
  }

  await requireHold();
  const subjects = [];
  let cursor = null;
  while (true) {
    const rows = await readJournalPage(cursor);
    if (!Array.isArray(rows) || rows.length > pageSize) throw new Error('TRIP_RESTORE_JOURNAL_UNVERIFIED');
    for (const row of rows) {
      const subject = row?.owner_subject;
      if (typeof subject !== 'string' || !subjectPattern.test(subject)
        || Object.keys(row).length !== 1 || (cursor !== null && subject <= cursor)) {
        throw new Error('TRIP_RESTORE_JOURNAL_UNVERIFIED');
      }
      subjects.push(subject);
      cursor = subject;
    }
    if (rows.length < pageSize) break;
  }
  if (retainedDigest(retainedTripRows, new Set(subjects)) !== retainedTripRowsSha256) throw retainedRowsError();
  verifyRetainedIdentities(retainedTripRows);
  const bindings = Object.fromEntries(shards.map((shard, index) => ['TRIP_DB_' + index, shard]));
  async function requireRetainedSnapshot() {
    const { sha256 } = await prepareRetainedTripSnapshot(shards, subjects);
    if (sha256 !== retainedTripRowsSha256) throw new Error('TRIP_RESTORE_RETAINED_ROWS_MISMATCH');
  }

  await requireHold();
  if (verifyOnly) {
    // Reissue proof of an already completed replay without performing any
    // recovery writes. The retained digest alone omits erased owners.
    for (let start = 0; start < subjects.length; start += pageSize) {
      for (const ownerSubject of subjects.slice(start, start + pageSize)) {
        await assertOwnerTripErasureReadback(bindings, ownerSubject);
      }
      await requireHold();
    }
    await requireRetainedSnapshot();
    await requireHold();
    return { kind: 'TRIP_RESTORE_ERASURE_JOURNAL_READBACK_VERIFIED', epoch, owners: subjects.length, retainedTripRowsSha256 };
  }

  // An unexpected retained row must stop recovery before any erasure is replayed.
  // The read ignores only the subjects already authorized by the full journal.
  const retainedWork = await planRetainedRows(shards, retainedTripRows, subjects);
  let removedRows = 0;
  for (let start = 0; start < subjects.length; start += pageSize) {
    await requireHold();
    for (const ownerSubject of subjects.slice(start, start + pageSize)) {
      removedRows += await deleteOwnerTrips(bindings, { owner_subject: ownerSubject }, { verifyTombstones: true });
      if (!Number.isSafeInteger(removedRows)) throw new Error('TRIP_RESTORE_RECONCILIATION_COUNT_INVALID');
    }
  }
  await requireHold();
  const recoveredRows = await restoreRetainedRows(shards, retainedWork, requireHold);
  await requireRetainedSnapshot();
  await requireHold();
  return { kind: 'TRIP_RESTORE_ERASURE_JOURNAL_REPLAYED', epoch, owners: subjects.length, removedRows, recoveredRows, retainedTripRowsSha256 };
}

// Bind these arguments to the verified restore receipt and live hold in the
// management workflow. This uses the providers' existing service accounts,
// and never sends recovery traffic through the held public Worker.
export async function reconcileCloudflareHeldTripErasures({
  restorePlan, restoreReplies, retainedArchive, archiveSecret, bindings, accountId, cloudflareToken, projectRef, serviceKey,
  gatewayUrl, sharedSecret, publishableKey, versionId, deploymentId, verifyOnly = false, fetchImpl = fetch,
}) {
  if (!isTripRestoreScope({ bindings, accountId, projectRef, versionId, deploymentId })
    || typeof cloudflareToken !== 'string' || !cloudflareToken
    || typeof serviceKey !== 'string' || !serviceKey
    || typeof sharedSecret !== 'string' || sharedSecret.length < 32
    || typeof publishableKey !== 'string' || !publishableKey || typeof verifyOnly !== 'boolean') {
    throw new Error('TRIP_RESTORE_PROVIDER_INPUT_INVALID');
  }
  const boundDatabases = bindings.map(({ binding, database_name, database_id }) => ({
    binding, database_name, database_id,
  }));
  const scope = { accountId, projectRef, bindings: boundDatabases, versionId, deploymentId };
  const { epoch, restoreFrom, captureAt } = identifyCloudflareTripRestore({
    ...scope, plan: restorePlan, replies: restoreReplies,
  });
  const retainedTripRows = openRetainedTripSnapshot({ scope, plan: restorePlan, archive: retainedArchive, archiveSecret });
  const gateway = normalizeCloudflareGatewayUrl(gatewayUrl);
  const baseUrl = `https://${projectRef}.supabase.co`;
  const heldAt = timestampKey(restorePlan.heldAt);
  const matchesRestoreHold = hold => hold?.intentId === restorePlan.intentId && timestampKey(hold.heldAt) === heldAt;

  async function verifyRecoveryHoldEpoch() {
    try {
      if (!matchesRestoreHold(await readTripErasureRecoveryHold({ projectRef, serviceKey, fetchImpl }))) return null;
      const deployment = await verifyExistingWorkerBindings({
        accountId, apiToken: cloudflareToken, workerName: 'ravradar-trip-gateway',
        expectedVersion: versionId, expectedBindings: boundDatabases, fetchImpl,
      });
      if (deployment.deploymentId !== deploymentId) return null;
      const [edge, worker, signed] = await Promise.all([
        waitForTripStorageEdgeReadiness({
          baseUrl, publishableKey, expectedStorageMode: 'd1', fetchImpl,
          retryDelaysMs: [0], requiredConsecutiveSuccesses: 1,
        }),
        waitForWorkerHealth({ gatewayUrl: gateway, expectedRestoreHold: true, fetchImpl, retryDelaysMs: [0] }),
        runWorkerCountReadProbe({
          gatewayUrl: gateway, sharedSecret, probeKind: WORKER_COUNT_SIGNED_PROBE_KIND, expectedRestoreHold: true, fetchImpl,
        }),
      ]);
      if (!edge.ok || !worker.verified || signed.restoreHeld !== true) return null;
      return matchesRestoreHold(await readTripErasureRecoveryHold({ projectRef, serviceKey, fetchImpl })) ? epoch : null;
    } catch {
      return null;
    }
  }

  async function request(url, headers, body, failureCode) {
    try {
      const response = await boundedFetch(url, {
        method: 'POST', redirect: 'error', cache: 'no-store',
        headers: { ...headers, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, { fetchImpl });
      if (!response.ok || response.redirected) throw new Error(failureCode);
      return await response.json();
    } catch {
      throw new Error(failureCode);
    }
  }

  const shards = boundDatabases.map(({ database_id: databaseId }) => {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
    return { prepare(sql) {
      return { bind(...params) {
        async function query() {
          const failure = 'TRIP_RESTORE_D1_QUERY_UNVERIFIED';
          const body = await request(url, { Authorization: `Bearer ${cloudflareToken}` }, { sql, params }, failure);
          const result = body?.result?.[0];
          if (body?.success !== true || !Array.isArray(body.result) || body.result.length !== 1
            || result?.success !== true || !Array.isArray(result.results)
            || result.meta?.served_by_primary !== true) throw new Error(failure);
          return result;
        }
        return { all: query, run: query };
      } };
    } };
  });
  const journalUrl = `${baseUrl}/rest/v1/rpc/read_trip_erasure_restore_subjects`;
  const journalHeaders = recoveryServiceHeaders(serviceKey);

  return reconcileHeldTripErasures({
    shards, epoch, retainedTripRowsSha256: restorePlan.retainedTripRowsSha256, retainedTripRows,
    readHoldEpoch: verifyRecoveryHoldEpoch, verifyOnly,
    readJournalPage: cursor => request(journalUrl, journalHeaders, {
      p_hold_id: restorePlan.intentId, p_restore_from: restoreFrom, p_capture_at: captureAt, p_after_subject: cursor,
    }, 'TRIP_RESTORE_JOURNAL_UNVERIFIED'),
  });
}
