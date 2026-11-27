import { createHash } from 'node:crypto';
import { deleteOwnerTrips } from '../../cloudflare/trip-gateway/worker.js';
import { canonicalJson, normalizeCloudflareGatewayUrl } from '../../supabase/functions/_shared/trip-storage.js';
import {
  runWorkerCountReadProbe, verifyExistingWorkerBindings, waitForWorkerHealth, WORKER_COUNT_SIGNED_PROBE_KIND,
} from '../verify-cloudflare-trip-gateway.mjs';
import { boundedFetch } from './bounded-fetch.mjs';
import { waitForTripStorageEdgeReadiness } from './trip-storage-edge-readiness.mjs';
import { TRIP_STORAGE_REQUIRED_SHARD_NAMES } from './trip-storage-legacy-classification.mjs';

const pageSize = 100;
const subjectPattern = /^usr_v1_[A-Za-z0-9_-]{43}$/;
const databaseIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const exactUtcPattern = /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;
const bookmarkValid = s => typeof s === 'string' && s.length > 0 && s.length <= 1024
  && s.trim() === s && !/[\x00-\x1f\x7f]/.test(s);

function timestampKey(time) {
  if (typeof time !== 'string' || !exactUtcPattern.test(time) || !Number.isFinite(Date.parse(time))
    || new Date(time).toISOString().slice(0, 19) !== time.slice(0, 19)) {
    throw new Error('TRIP_RESTORE_RECEIPT_TIME_INVALID');
  }
  return time.slice(0, 19) + '.' + (time.includes('.') ? time.slice(20, -1) : '').padEnd(6, '0');
}

// Receipt inputs belong to the locked, authenticated management caller that
// captured the POSTs. The digest binds their meaning, not their authenticity.
// No restore requests are issued here.
export function identifyCloudflareTripRestore({ accountId, projectRef, bindings, versionId, deploymentId, plan, replies }) {
  const failure = () => new Error('TRIP_RESTORE_RECEIPT_UNVERIFIED');
  if (!plan || typeof plan.intentId !== 'string' || !databaseIdPattern.test(plan.intentId)
    || typeof plan.sourceSha !== 'string' || !/^[a-f0-9]{40}$/.test(plan.sourceSha)
    || typeof plan.runId !== 'string' || !/^[1-9]\d{0,19}$/.test(plan.runId) || plan.attempt !== 1
    || !Array.isArray(plan.targets) || plan.targets.length < 1 || plan.targets.length > 10
    || !Array.isArray(replies) || replies.length !== plan.targets.length) throw failure();
  const held = timestampKey(plan.heldAt);
  const captured = timestampKey(plan.captureAt);
  const covered = timestampKey(plan.journalCoveredFrom);
  if (covered > held || held > captured) throw failure();

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
    if (reply.method !== 'POST' || reply.url !== requested.href || !(held <= start && start <= end && end <= captured)
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
    epoch: createHash('sha256').update(canonicalJson({
      scope: 'ravradar-trip-d1-restore-v2', accountId, projectRef, versionId, deploymentId, bindings,
      intentId: plan.intentId, sourceSha: plan.sourceSha, runId: plan.runId, attempt: plan.attempt,
      heldAt: plan.heldAt, captureAt: plan.captureAt, journalCoveredFrom: plan.journalCoveredFrom, restored,
    })).digest('hex'),
  };
}

// The management caller owns the production lock. It binds the epoch to the
// live hold, restored shards and journal cutoff, and uses bound D1 queries.
// This function never changes either runtime's hold configuration.
export async function reconcileHeldTripErasures({ shards, epoch, readHoldEpoch, readJournalPage }) {
  if (!Array.isArray(shards) || shards.length !== 10 || new Set(shards).size !== 10
    || shards.some(shard => typeof shard?.prepare !== 'function')
    || typeof epoch !== 'string' || !/^[a-f0-9]{64}$/.test(epoch)
    || typeof readHoldEpoch !== 'function' || typeof readJournalPage !== 'function') {
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

  const bindings = Object.fromEntries(shards.map((shard, index) => ['TRIP_DB_' + index, shard]));
  let removedRows = 0;
  for (let start = 0; start < subjects.length; start += pageSize) {
    await requireHold();
    for (const ownerSubject of subjects.slice(start, start + pageSize)) {
      removedRows += await deleteOwnerTrips(bindings, { owner_subject: ownerSubject }, { verifyTombstones: true });
      if (!Number.isSafeInteger(removedRows)) throw new Error('TRIP_RESTORE_RECONCILIATION_COUNT_INVALID');
    }
  }
  await requireHold();
  return { kind: 'TRIP_RESTORE_ERASURE_JOURNAL_REPLAYED', epoch, owners: subjects.length, removedRows };
}

// Bind these arguments to the verified restore receipt and live hold in the
// management workflow. This uses the providers' existing service accounts,
// and never sends recovery traffic through the held public Worker.
export async function reconcileCloudflareHeldTripErasures({
  restorePlan, restoreReplies, readHoldEpoch, bindings, accountId, cloudflareToken, projectRef, serviceKey,
  gatewayUrl, sharedSecret, publishableKey, versionId, deploymentId, fetchImpl = fetch,
}) {
  if (!Array.isArray(bindings) || bindings.length !== 10
    || bindings.some((binding, index) => binding?.binding !== `TRIP_DB_${index}`
      || binding.database_name !== TRIP_STORAGE_REQUIRED_SHARD_NAMES[index]
      || typeof binding.database_id !== 'string' || !databaseIdPattern.test(binding.database_id))
    || new Set(bindings.map(binding => binding.database_id)).size !== 10
    || typeof accountId !== 'string' || !/^[a-f0-9]{32}$/.test(accountId)
    || typeof projectRef !== 'string' || !/^[a-z0-9]{20}$/.test(projectRef)
    || typeof cloudflareToken !== 'string' || !cloudflareToken
    || typeof serviceKey !== 'string' || !serviceKey
    || typeof sharedSecret !== 'string' || sharedSecret.length < 32
    || typeof publishableKey !== 'string' || !publishableKey
    || ![versionId, deploymentId].every(id => typeof id === 'string' && databaseIdPattern.test(id))
    || typeof readHoldEpoch !== 'function') {
    throw new Error('TRIP_RESTORE_PROVIDER_INPUT_INVALID');
  }
  const boundDatabases = bindings.map(({ binding, database_name, database_id }) => ({
    binding, database_name, database_id,
  }));
  const { epoch, restoreFrom, captureAt } = identifyCloudflareTripRestore({
    accountId, projectRef, bindings: boundDatabases, versionId, deploymentId, plan: restorePlan, replies: restoreReplies,
  });
  const gateway = normalizeCloudflareGatewayUrl(gatewayUrl);
  const baseUrl = `https://${projectRef}.supabase.co`;

  async function verifyRecoveryHoldEpoch() {
    if (await readHoldEpoch() !== epoch) return null;
    try {
      const deployment = await verifyExistingWorkerBindings({
        accountId, apiToken: cloudflareToken, workerName: 'ravradar-trip-gateway',
        expectedVersion: versionId, expectedBindings: boundDatabases, fetchImpl,
      });
      if (deployment.deploymentId !== deploymentId) return null;
      const [edge, worker, signed] = await Promise.all([
        waitForTripStorageEdgeReadiness({
          baseUrl, publishableKey, expectedStorageMode: 'restore-hold', fetchImpl,
          retryDelaysMs: [0], requiredConsecutiveSuccesses: 1,
        }),
        waitForWorkerHealth({ gatewayUrl: gateway, expectedRestoreHold: true, fetchImpl, retryDelaysMs: [0] }),
        runWorkerCountReadProbe({
          gatewayUrl: gateway, sharedSecret, probeKind: WORKER_COUNT_SIGNED_PROBE_KIND, expectedRestoreHold: true, fetchImpl,
        }),
      ]);
      return edge.ok && worker.verified && signed.restoreHeld === true ? epoch : null;
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
  const journalHeaders = { apikey: serviceKey };
  if (!serviceKey.startsWith('sb_secret_')) journalHeaders.Authorization = `Bearer ${serviceKey}`;

  return reconcileHeldTripErasures({
    shards, epoch, readHoldEpoch: verifyRecoveryHoldEpoch,
    readJournalPage: cursor => request(journalUrl, journalHeaders, {
      p_hold_id: restorePlan.intentId, p_restore_from: restoreFrom, p_capture_at: captureAt, p_after_subject: cursor,
    }, 'TRIP_RESTORE_JOURNAL_UNVERIFIED'),
  });
}
