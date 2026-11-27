import { deleteOwnerTrips } from '../../cloudflare/trip-gateway/worker.js';

const pageSize = 100;
const subjectPattern = /^usr_v1_[A-Za-z0-9_-]{43}$/;

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
