const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const MAX_EXPORT_BYTES = 20 * 1024 * 1024;

// Uses the normal authenticated service seam. No network, identity lookup,
// write, projection, deletion or download occurs inside this collector.
export async function collectOwnTripExport({ userId, assertOwner, readPage, readLocal, readPending, now = () => new Date() }) {
  if (!userId || typeof assertOwner !== 'function') throw new Error('TRIP_EXPORT_OWNER_REQUIRED');
  const rows = [], identities = new Set(), cursors = new Set();
  const encoder = new TextEncoder();
  let cursor = null, snapshotAt = null, bytes = 0, complete = false;
  for (let page = 0; page < 1000; page += 1) {
    await assertOwner();
    const result = await readPage(cursor);
    await assertOwner();
    if (!result || Object.keys(result).sort().join(',') !== 'next_cursor,rows,snapshot_at'
      || !Array.isArray(result.rows) || result.rows.length > 200
      || typeof result.snapshot_at !== 'string' || !Number.isFinite(Date.parse(result.snapshot_at))
      || new Date(result.snapshot_at).toISOString() !== result.snapshot_at
      || !(result.next_cursor === null || (typeof result.next_cursor === 'string' && result.next_cursor.length <= 512))
      || (result.next_cursor !== null && result.rows.length !== 200)) throw new Error('TRIP_EXPORT_INVALID');
    snapshotAt ??= result.snapshot_at;
    if (snapshotAt !== result.snapshot_at) throw new Error('TRIP_EXPORT_SNAPSHOT_CHANGED');
    for (const row of result.rows) {
      const id = row?.client_observation_id;
      if (!UUID.test(String(id || '')) || identities.has(id)
        || (rows.length && rows.at(-1).client_observation_id >= id)
        || Object.hasOwn(row, 'user_id') || Object.hasOwn(row, 'anonymous_id') || Object.hasOwn(row, 'owner_subject')) {
        throw new Error('TRIP_EXPORT_INVALID');
      }
      bytes += encoder.encode(JSON.stringify(row)).byteLength;
      if (bytes > MAX_EXPORT_BYTES) throw new Error('TRIP_EXPORT_TOO_LARGE');
      identities.add(id);
      rows.push(structuredClone(row));
    }
    if (result.next_cursor === null) { complete = true; break; }
    if (cursors.has(result.next_cursor)) throw new Error('TRIP_EXPORT_CURSOR_REPEATED');
    cursors.add(result.next_cursor);
    cursor = result.next_cursor;
  }
  // Limits always fail: never save a truncated file with a success label.
  if (!complete) throw new Error('TRIP_EXPORT_TOO_LARGE');
  await assertOwner();
  const deviceRows = readLocal(), pendingRows = readPending();
  if (!Array.isArray(deviceRows) || !Array.isArray(pendingRows)) throw new Error('TRIP_EXPORT_LOCAL_INVALID');
  const own = list => structuredClone(list.filter(row => row?.user_id === userId));
  const result = {
    format: 'ravradar-own-trips-v1', exported_at: now().toISOString(), snapshot_at: snapshotAt,
    scope: 'stored-trip-payloads-and-this-device',
    stored_trips: rows, device_trips: own(deviceRows), pending_trips: own(pendingRows),
  };
  if (encoder.encode(JSON.stringify(result)).byteLength > MAX_EXPORT_BYTES) throw new Error('TRIP_EXPORT_TOO_LARGE');
  await assertOwner();
  return result;
}
