// Exact metadata projection; no file, transport, native proof or admission.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const RAW_MARINE_COLLECTIONS = new Set(['dkss_idw', 'dkss_nsbs', 'dkss_lf']);

// Python canonical_time keeps six fractional digits, not JavaScript's three.
// Cover the producer's ISO wire spellings, rejecting unsupported forms rather
// than coalescing distinct microsecond captures. No timestamp is reissued.
function rawCaptureTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d\d-\d\d)[T ](\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?(Z|[+-]\d\d:\d\d)$/.exec(value);
  if (!match) return null;
  const local = Date.parse(match[1] + 'T' + match[2] + '.000Z');
  if (!Number.isFinite(local) || new Date(local).toISOString().slice(0, 19) !== match[1] + 'T' + match[2]) return null;
  const zone = match[4], hours = zone === 'Z' ? 0 : Number(zone.slice(1, 3));
  const minutes = zone === 'Z' ? 0 : Number(zone.slice(4, 6));
  if (hours > 23 || minutes > 59) return null;
  const offset = (hours * 60 + minutes) * 60_000 * (zone[0] === '-' ? -1 : 1);
  const utc = new Date(local - offset).toISOString();
  if (!/^\d{4}-/.test(utc)) return null;
  const fraction = (match[3] ?? '').padEnd(6, '0').slice(0, 6);
  return utc.slice(0, 19) + (fraction === '000000' ? '' : '.' + fraction) + 'Z';
}

// Exactly the eleven identity fields in Python canonical_current_source_asset.
// This diagnostic projection is neither native proof nor RAW-byte verification.
export function canonicalSavedDmiOriginalCapture(source) {
  if (!object(source) || typeof source.collection !== 'string' || typeof source.itemId !== 'string') return null;
  const collection = source.collection.trim(), itemId = source.itemId.trim();
  const value = { collection, modelRun: rawCaptureTime(source.modelRun),
    validTime: rawCaptureTime(source.validTime ?? source.nativeValidTime), itemId,
    assetIdentitySha256: source.assetIdentitySha256, assetSizeBytes: source.assetSizeBytes ?? null,
    acquiredAt: rawCaptureTime(source.acquiredAt), contentLengthBytes: source.contentLengthBytes,
    contentSha256: source.contentSha256, itemCreatedAt: rawCaptureTime(source.itemCreatedAt),
    itemUpdatedAt: rawCaptureTime(source.itemUpdatedAt) };
  if (!RAW_MARINE_COLLECTIONS.has(collection) || !itemId || !value.modelRun || !value.validTime
    || !/^[a-f0-9]{64}$/.test(value.assetIdentitySha256 ?? '')
    || !Number.isSafeInteger(value.contentLengthBytes) || value.contentLengthBytes <= 0
    || !/^[a-f0-9]{64}$/.test(value.contentSha256 ?? '') || !value.acquiredAt
    || value.assetSizeBytes !== null && (!Number.isSafeInteger(value.assetSizeBytes)
      || value.assetSizeBytes <= 0 || value.assetSizeBytes !== value.contentLengthBytes)
    || source.itemCreatedAt != null && !value.itemCreatedAt
    || source.itemUpdatedAt != null && !value.itemUpdatedAt) return null;
  return value;
}
