import { deleteOwnerTrips } from '../../cloudflare/trip-gateway/worker.js';
import { boundedFetch } from './bounded-fetch.mjs';
import { TRIP_STORAGE_REQUIRED_SHARD_NAMES } from './trip-storage-legacy-classification.mjs';

const pageSize = 100;
const subjectPattern = /^usr_v1_[A-Za-z0-9_-]{43}$/;
const databaseIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const exactUtcPattern = /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

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
  epoch, readHoldEpoch, bindings, accountId, cloudflareToken, projectRef, serviceKey,
  restoreFrom, captureAt, fetchImpl = fetch,
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
    || ![restoreFrom, captureAt].every(time => typeof time === 'string' && exactUtcPattern.test(time))) {
    throw new Error('TRIP_RESTORE_PROVIDER_INPUT_INVALID');
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

  const shards = bindings.map(({ database_id: databaseId }) => {
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
  const journalUrl = `https://${projectRef}.supabase.co/rest/v1/rpc/read_trip_erasure_restore_subjects`;
  const journalHeaders = { apikey: serviceKey };
  if (!serviceKey.startsWith('sb_secret_')) journalHeaders.Authorization = `Bearer ${serviceKey}`;

  return reconcileHeldTripErasures({
    shards, epoch, readHoldEpoch,
    readJournalPage: cursor => request(journalUrl, journalHeaders, {
      p_restore_from: restoreFrom, p_capture_at: captureAt, p_after_subject: cursor,
    }, 'TRIP_RESTORE_JOURNAL_UNVERIFIED'),
  });
}
