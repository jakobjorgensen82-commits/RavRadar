import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { DMI_FORECAST_HOURS, inspectDmiForecastGridSampling } from './dmi-forecast-store.mjs';
import { isDeepStrictEqual } from 'node:util';
import { dmiExpectedIdentityForPart } from './ravscore-production-adapters.mjs';
import { buildProtectedDmiNativeCurrentProofs }
  from './protected-dmi-native-current-proofs.mjs';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const SHA256 = /^[a-f0-9]{64}$/;
const MAX_PART_RAW_BYTES = 8 * 1024 * 1024;
const MAX_PART_COMPRESSED_BYTES = 2 * 1024 * 1024;
// The 673 independently bounded PART rows can legitimately exceed 512 MiB
// before compression as DMI fills the five forecast families. Keep a separate
// decoded-data safety ceiling and a much tighter on-disk/JSON ceiling.
export const MAX_TOTAL_RAW_BYTES = 2048 * 1024 * 1024;
// The compressed ceiling must stay below the budgets for the encrypted
// progress cache and the complete private archive, not merely below R2's
// storage allowance. Those independent budgets are checked during release.
export const MAX_TOTAL_COMPRESSED_BYTES = 160 * 1024 * 1024;
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

// Schema2 carries caller-supplied, already normally built ORIGINAL evidence.
// A normal verification-only rebuild never replaces the saved original bank,
// admits a score input, infers native evidence or repairs stored rows.
const ORIGINAL_SCOPE = 'EXACT_SAVED_PART_121_CURRENT_ROWS';
const originalFailure = () => { throw new Error('DMI_PART_CONTINUITY_NATIVE_ORIGINAL_INVALID'); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
function originalCoverage(bank, identity, partId, point, hourly) {
  const savedPart = { partId, zoneId: identity?.parentZoneId, waterPoint: point };
  const expectedIdentity = dmiExpectedIdentityForPart(savedPart);
  if (!expectedIdentity || !isDeepStrictEqual(identity, expectedIdentity)) originalFailure();
  const byTime = new Map(hourly.map(row => [row.time, row]));
  const proved = new Set();
  if (bank !== null) {
    // Cheap per-PART/reference bounds precede the full normal bank validator.
    if (!Array.isArray(bank?.contexts) || !Array.isArray(bank?.nativeRows)
      || !Array.isArray(bank?.selections)
      || bank.contexts.some(row => row?.value?.partId !== partId)
      || bank.selections.length > DMI_FORECAST_HOURS
      || bank.selections.some(row => row?.partId !== partId)
      || bank.nativeRows.length > 2 * bank.selections.length
      || bank.contexts.length > bank.nativeRows.length) originalFailure();
    const selections = bank.selections.map(selection => {
      const row = byTime.get(selection.time), source = row?.sources?.current;
      if (!row || proved.has(selection.time) || row.currentStateOnlyHold != null
        || source?.provider !== 'dmi' || source.vectorSemanticsVersion !== 3
        || !finite(row.currentUMps) || !finite(row.currentVMps)) originalFailure();
      proved.add(selection.time);
      return { part: savedPart, row };
    });
    // previousBank is fully validated/indexed by the NORMAL builder, once.
    // Reprove the whole saved selection set in one batch from its own natives.
    // No contexts, inferred originals, PASS-cache or new kernel API are used.
    const rebuilt = buildProtectedDmiNativeCurrentProofs({
      selections, contexts: [], previousBank: bank,
    });
    const selectedIdentity = ({ partId, time, forecastAgeHours, sourceSha256, tupleSha256 }) =>
      ({ partId, time, forecastAgeHours, sourceSha256, tupleSha256 });
    if (!isDeepStrictEqual(rebuilt.selections.map(selectedIdentity),
      bank.selections.map(selectedIdentity))) originalFailure();
    // Equivalent nativeIds/context choices need not be byte-identical.
    // The original, normally validated bank is stored unchanged, not rebuilt.
  }
  return hourly.map(row => {
    const source = row.sources?.current;
    const any = [row.currentUMps, row.currentVMps, row.currentSpeedMps, row.currentDirectionDeg].some(finite);
    let status = 'NO_CURRENT', sampling = null;
    if (row.currentStateOnlyHold != null) status = 'STATE_ONLY_HOLD_NOT_NATIVE_PROOF';
    else if (any && source?.vectorSemanticsVersion === 4) status = 'REGIONAL_CURRENT_NOT_NATIVE_PROOF';
    else if (any && source?.provider === 'dmi' && source.vectorSemanticsVersion === 3) {
      sampling = inspectDmiForecastGridSampling(source, 'current', row.time, identity).status;
      status = !finite(row.currentUMps) || !finite(row.currentVMps) ? 'INCOMPLETE_CURRENT'
        : proved.has(row.time) ? 'DMI_ORIGINAL_PROVED' : 'DMI_SELECTION_PROOF_NOT_STORED';
    } else if (any) status = source ? 'OTHER_CURRENT_NOT_NATIVE_PROOF' : 'CURRENT_SOURCE_UNAVAILABLE';
    return { time: row.time, status, sampling };
  });
}
function createSavedOriginals(bank, part, point, hourly) {
  const identity = dmiExpectedIdentityForPart(part);
  if (!identity) originalFailure();
  return { schemaVersion: 1, kind: 'PRIVATE_DMI_PART_NATIVE_ORIGINALS', scope: ORIGINAL_SCOPE,
    identity, bank, coverage: originalCoverage(bank, identity, part.partId, point, hourly) };
}
function verifySavedOriginals(value, partId, point, hourly) {
  if (!exactKeys(value, ['schemaVersion', 'kind', 'scope', 'identity', 'bank', 'coverage'])
    || value.schemaVersion !== 1 || value.kind !== 'PRIVATE_DMI_PART_NATIVE_ORIGINALS'
    || value.scope !== ORIGINAL_SCOPE || !(value.bank === null || typeof value.bank === 'object')
    || !isDeepStrictEqual(value.coverage, originalCoverage(value.bank, value.identity, partId, point, hourly))) {
    originalFailure();
  }
  return value;
}


export function assertDmiPartContinuityTotalSize(rawBytes, compressedBytes) {
  if (rawBytes > MAX_TOTAL_RAW_BYTES) {
    throw new Error('DMI_PART_CONTINUITY_TOTAL_RAW_SIZE_LIMIT');
  }
  if (compressedBytes > MAX_TOTAL_COMPRESSED_BYTES) {
    throw new Error('DMI_PART_CONTINUITY_TOTAL_COMPRESSED_SIZE_LIMIT');
  }
}

// The DMI-only, source-attested record is stored by PART, not as one enormous
// JSON string. Each row can be decoded below V8's string ceiling, and the
// authenticated private bundle plus inner digests reject altered bytes.
export async function packDmiPartContinuity(records, parts, productionReferenceAt, options = undefined) {
  if (!(records instanceof Map) || !Array.isArray(parts)
    || parts.length < 1 || parts.length > 673 || !exactHour(productionReferenceAt)) {
    throw new Error('DMI_PART_CONTINUITY_INPUT_INVALID');
  }
  const nativeProofs = options === undefined ? null : options?.nativeCurrentProofsByPart;
  if (options !== undefined && (!exactKeys(options, ['nativeCurrentProofsByPart'])
    || !(nativeProofs instanceof Map) || nativeProofs.size !== parts.length
    || parts.some(part => !nativeProofs.has(part?.partId)
      || nativeProofs.get(part.partId) === undefined))) {
    throw new Error('DMI_PART_CONTINUITY_INPUT_INVALID');
  }
  const schemaVersion = nativeProofs === null ? 1 : 2;
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
    const nativeCurrentOriginals = nativeProofs === null ? null
      : createSavedOriginals(nativeProofs.get(partId), part, point, record.hourly);
    const raw = Buffer.from(JSON.stringify({
      schemaVersion, partId, point, hourly: record.hourly,
      ...(nativeCurrentOriginals === null ? {} : { nativeCurrentOriginals }),
    }));
    if (raw.length > MAX_PART_RAW_BYTES) throw new Error('DMI_PART_CONTINUITY_PART_SIZE_LIMIT');
    const compressed = await gzipAsync(raw, { level: 6 });
    if (compressed.length > MAX_PART_COMPRESSED_BYTES) {
      throw new Error('DMI_PART_CONTINUITY_PART_COMPRESSED_SIZE_LIMIT');
    }
    rawBytes += raw.length;
    compressedBytes += compressed.length;
    try { assertDmiPartContinuityTotalSize(rawBytes, compressedBytes); }
    catch (error) {
      console.error(JSON.stringify({ kind: 'DMI_PART_CONTINUITY_SIZE',
        status: 'LIMIT', partCount: entries.length + 1, rawBytes, compressedBytes,
        rawLimitBytes: MAX_TOTAL_RAW_BYTES,
        compressedLimitBytes: MAX_TOTAL_COMPRESSED_BYTES }));
      throw error;
    }
    entries.push({
      partId, point: [...point], rawBytes: raw.length, rawSha256: digest(raw),
      compressedBytes: compressed.length, compressedSha256: digest(compressed),
      gzipBase64: compressed.toString('base64'),
    });
  }
  if (records.size !== seen.size) throw new Error('DMI_PART_CONTINUITY_DOMAIN_INVALID');
  console.log(JSON.stringify({ kind: 'DMI_PART_CONTINUITY_SIZE', partCount: entries.length,
    rawBytes, compressedBytes, rawLimitBytes: MAX_TOTAL_RAW_BYTES,
    compressedLimitBytes: MAX_TOTAL_COMPRESSED_BYTES }));
  return {
    schemaVersion, kind: 'PRIVATE_DMI_PART_HOURLY_CONTINUITY',
    productionReferenceAt, partCount: entries.length,
    rawBytes, compressedBytes, entries,
  };
}

export async function unpackDmiPartContinuity(pack, parts, targetReferenceAt) {
  if (pack == null) return new Map();
  if (!Array.isArray(parts) || !exactHour(targetReferenceAt)
    || !exactKeys(pack, ['schemaVersion', 'kind', 'productionReferenceAt',
      'partCount', 'rawBytes', 'compressedBytes', 'entries'])
    || ![1, 2].includes(pack.schemaVersion)
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
    if (!exactKeys(document, ['schemaVersion', 'partId', 'point', 'hourly',
      ...(pack.schemaVersion === 2 ? ['nativeCurrentOriginals'] : [])])
      || document.schemaVersion !== pack.schemaVersion || document.partId !== entry.partId
      || !samePoint(document.point, entry.point)
      || !Array.isArray(document.hourly)
      || document.hourly.length !== DMI_FORECAST_HOURS
      || document.hourly.some((hour, index) => hour?.time !== new Date(
        Date.parse(pack.productionReferenceAt) + index * 3_600_000,
      ).toISOString())) {
      throw new Error('DMI_PART_CONTINUITY_DOCUMENT_INVALID');
    }
    const nativeCurrentOriginals = pack.schemaVersion === 2
      ? verifySavedOriginals(document.nativeCurrentOriginals, entry.partId, document.point, document.hourly) : null;
    // Validate saved originals against their own immutable saved identity only.
    // Never restore that identity/point into admin or use it to admit new data.
    // Current geometry still independently decides whether this PART is returned.
    if (samePoint(entry.point, active.get(entry.partId).waterPoint)
      && (nativeCurrentOriginals === null || isDeepStrictEqual(nativeCurrentOriginals.identity,
        dmiExpectedIdentityForPart(active.get(entry.partId))))) {
      result.set(entry.partId, { point: entry.point, hourly: document.hourly,
        ...(nativeCurrentOriginals === null ? {} : { nativeCurrentOriginals }) });
    }
  }
  if (rawTotal !== pack.rawBytes || compressedTotal !== pack.compressedBytes) {
    throw new Error('DMI_PART_CONTINUITY_TOTAL_SIZE_MISMATCH');
  }
  return result;
}
