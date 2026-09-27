import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { DMI_FORECAST_HOURS } from './dmi-forecast-store.mjs';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_PART_RAW_BYTES = 8 * 1024 * 1024;
const MAX_PART_COMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_RAW_BYTES = 512 * 1024 * 1024;
const MAX_TOTAL_COMPRESSED_BYTES = 96 * 1024 * 1024;
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const pointValid = point => Array.isArray(point) && point.length === 2
  && point.every(value => typeof value === 'number' && Number.isFinite(value));
const samePoint = (a, b) => pointValid(a) && pointValid(b)
  && a.every((value, index) => Math.abs(value - b[index]) <= 1e-7);
const exactHour = value => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString() === value;
const exactKeys = (value, keys) => value && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

// The DMI-only, source-attested record is stored by PART, not as one enormous
// JSON string. Each row can be decoded below V8's string ceiling, and the
// authenticated private bundle plus inner digests reject altered bytes.
export async function packDmiPartContinuity(records, parts, productionReferenceAt) {
  if (!(records instanceof Map) || !Array.isArray(parts)
    || parts.length < 1 || parts.length > 673 || !exactHour(productionReferenceAt)) {
    throw new Error('DMI_PART_CONTINUITY_INPUT_INVALID');
  }
  const seen = new Set();
  const entries = [];
  let rawBytes = 0;
  let compressedBytes = 0;
  if (parts.some(part => typeof part?.partId !== 'string' || !part.partId
    || !pointValid(part.waterPoint))) {
    throw new Error('DMI_PART_CONTINUITY_DOMAIN_INVALID');
  }
  for (const part of [...parts].sort((a, b) => a.partId.localeCompare(b.partId))) {
    const partId = part?.partId;
    const point = part?.waterPoint;
    const record = records.get(partId);
    if (typeof partId !== 'string' || !partId || seen.has(partId)
      || !samePoint(record?.point, point)
      || record?.zoneId !== `PART::${partId}`
      || !Array.isArray(record.hourly) || record.hourly.length !== DMI_FORECAST_HOURS
      || record.hourly.some((hour, index) => hour?.time !== new Date(
        Date.parse(productionReferenceAt) + index * 3_600_000,
      ).toISOString())) {
      throw new Error('DMI_PART_CONTINUITY_RECORD_INVALID');
    }
    seen.add(partId);
    const raw = Buffer.from(JSON.stringify({
      schemaVersion: 1, partId, point, hourly: record.hourly,
    }));
    if (raw.length > MAX_PART_RAW_BYTES) throw new Error('DMI_PART_CONTINUITY_PART_SIZE_LIMIT');
    const compressed = await gzipAsync(raw, { level: 6 });
    if (compressed.length > MAX_PART_COMPRESSED_BYTES) {
      throw new Error('DMI_PART_CONTINUITY_PART_COMPRESSED_SIZE_LIMIT');
    }
    rawBytes += raw.length;
    compressedBytes += compressed.length;
    if (rawBytes > MAX_TOTAL_RAW_BYTES || compressedBytes > MAX_TOTAL_COMPRESSED_BYTES) {
      throw new Error('DMI_PART_CONTINUITY_TOTAL_SIZE_LIMIT');
    }
    entries.push({
      partId, point: [...point], rawBytes: raw.length, rawSha256: digest(raw),
      compressedBytes: compressed.length, compressedSha256: digest(compressed),
      gzipBase64: compressed.toString('base64'),
    });
  }
  if (records.size !== seen.size) throw new Error('DMI_PART_CONTINUITY_DOMAIN_INVALID');
  return {
    schemaVersion: 1, kind: 'PRIVATE_DMI_PART_HOURLY_CONTINUITY',
    productionReferenceAt, partCount: entries.length,
    rawBytes, compressedBytes, entries,
  };
}

export async function unpackDmiPartContinuity(pack, parts, targetReferenceAt) {
  if (pack == null) return new Map();
  if (!Array.isArray(parts) || !exactHour(targetReferenceAt)
    || !exactKeys(pack, ['schemaVersion', 'kind', 'productionReferenceAt',
      'partCount', 'rawBytes', 'compressedBytes', 'entries'])
    || pack.schemaVersion !== 1
    || pack.kind !== 'PRIVATE_DMI_PART_HOURLY_CONTINUITY'
    || !exactHour(pack.productionReferenceAt)
    || Date.parse(pack.productionReferenceAt) > Date.parse(targetReferenceAt)
    || !Number.isSafeInteger(pack.partCount) || pack.partCount !== parts.length
    || !Array.isArray(pack.entries) || pack.entries.length !== pack.partCount
    || !Number.isSafeInteger(pack.rawBytes) || pack.rawBytes < 1
    || pack.rawBytes > MAX_TOTAL_RAW_BYTES
    || !Number.isSafeInteger(pack.compressedBytes) || pack.compressedBytes < 1
    || pack.compressedBytes > MAX_TOTAL_COMPRESSED_BYTES) {
    throw new Error('DMI_PART_CONTINUITY_MARKER_INVALID');
  }
  const active = new Map(parts.map(part => [part.partId, part]));
  if (active.size !== parts.length) throw new Error('DMI_PART_CONTINUITY_DOMAIN_INVALID');
  const result = new Map();
  let rawTotal = 0;
  let compressedTotal = 0;
  let lastId = null;
  for (const entry of pack.entries) {
    if (!exactKeys(entry, ['partId', 'point', 'rawBytes', 'rawSha256',
      'compressedBytes', 'compressedSha256', 'gzipBase64'])
      || typeof entry.partId !== 'string' || !active.has(entry.partId)
      || (lastId !== null && entry.partId.localeCompare(lastId) <= 0)
      || !pointValid(entry.point)
      || !Number.isSafeInteger(entry.rawBytes) || entry.rawBytes < 2
      || entry.rawBytes > MAX_PART_RAW_BYTES
      || !Number.isSafeInteger(entry.compressedBytes) || entry.compressedBytes < 2
      || entry.compressedBytes > MAX_PART_COMPRESSED_BYTES
      || !SHA256.test(entry.rawSha256 ?? '')
      || !SHA256.test(entry.compressedSha256 ?? '')
      || typeof entry.gzipBase64 !== 'string') {
      throw new Error('DMI_PART_CONTINUITY_ENTRY_INVALID');
    }
    lastId = entry.partId;
    rawTotal += entry.rawBytes;
    compressedTotal += entry.compressedBytes;
    const compressed = Buffer.from(entry.gzipBase64, 'base64');
    if (compressed.toString('base64') !== entry.gzipBase64
      || compressed.length !== entry.compressedBytes
      || digest(compressed) !== entry.compressedSha256) {
      throw new Error('DMI_PART_CONTINUITY_COMPRESSED_DIGEST_INVALID');
    }
    const raw = await gunzipAsync(compressed, { maxOutputLength: MAX_PART_RAW_BYTES });
    if (raw.length !== entry.rawBytes || digest(raw) !== entry.rawSha256) {
      throw new Error('DMI_PART_CONTINUITY_RAW_DIGEST_INVALID');
    }
    let document;
    try { document = JSON.parse(raw.toString('utf8')); }
    catch { throw new Error('DMI_PART_CONTINUITY_JSON_INVALID'); }
    if (!exactKeys(document, ['schemaVersion', 'partId', 'point', 'hourly'])
      || document.schemaVersion !== 1 || document.partId !== entry.partId
      || !samePoint(document.point, entry.point)
      || !Array.isArray(document.hourly)
      || document.hourly.length !== DMI_FORECAST_HOURS
      || document.hourly.some((hour, index) => hour?.time !== new Date(
        Date.parse(pack.productionReferenceAt) + index * 3_600_000,
      ).toISOString())) {
      throw new Error('DMI_PART_CONTINUITY_DOCUMENT_INVALID');
    }
    // A changed admin sampling point invalidates only that PART's old rows.
    if (samePoint(entry.point, active.get(entry.partId).waterPoint)) {
      result.set(entry.partId, { point: entry.point, hourly: document.hourly });
    }
  }
  if (rawTotal !== pack.rawBytes || compressedTotal !== pack.compressedBytes) {
    throw new Error('DMI_PART_CONTINUITY_TOTAL_SIZE_MISMATCH');
  }
  return result;
}
