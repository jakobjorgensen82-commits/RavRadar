import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { gzip, gunzip } from 'node:zlib';
import { DMI_FORECAST_HOURS, inspectDmiForecastGridSampling } from './dmi-forecast-store.mjs';
import { isDeepStrictEqual, types } from 'node:util';
import { dmiExpectedIdentityForPart, dmiOriginalWireIdentityMatchesCentralIdentity }
  from './ravscore-production-adapters.mjs';
import { buildProtectedDmiNativeCurrentProofs, validateProtectedDmiNativeCurrentProofs,
  PROTECTED_DMI_NATIVE_PROOF_LIMITS as NATIVE_LIMIT }
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
// Verification never replaces the saved original bank, admits a score input,
// infers native evidence or repairs stored rows.
const ORIGINAL_SCOPE = 'EXACT_SAVED_PART_121_CURRENT_ROWS';
const originalFailure = () => { throw new Error('DMI_PART_CONTINUITY_NATIVE_ORIGINAL_INVALID'); };
const finite = value => typeof value === 'number' && Number.isFinite(value);
const originalPlain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
// Byte-identical to the normal kernel's canonical/encoded framing, including
// its complete record-domain refusals. No JSON coercion, toJSON/getter invocation
// or permissive hash is substituted for the stored selection identity.
function originalCanonical(value, depth = 0, budget = { bytes: 0, nodes: 0 }) {
  const fail = code => { throw new Error('DMI_NATIVE_PROOF_' + code); };
  if (depth > 32) fail('RECORD_BOUND');
  if (++budget.nodes > 4096) fail('RECORD_BOUND');
  const charge = text => {
    budget.bytes += Buffer.byteLength(text);
    if (budget.bytes > NATIVE_LIMIT.recordBytes) fail('RECORD_BOUND');
    return text;
  };
  if (value === null || typeof value === 'boolean' || typeof value === 'string'
    || finite(value)) {
    if (typeof value === 'string' && value.length > NATIVE_LIMIT.recordBytes) fail('RECORD_BOUND');
    return charge(JSON.stringify(value));
  }
  if (Array.isArray(value)) {
    if (value.length > 4096) fail('RECORD_BOUND');
    charge('[]' + ','.repeat(value.length));
    return `[${Array.from(value, item => originalCanonical(item, depth + 1, budget)).join(',')}]`;
  }
  if (!originalPlain(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Object.getOwnPropertySymbols(value).length) fail('RECORD_SHAPE');
  const fields = Object.keys(value).sort();
  if (fields.length > 256) fail('RECORD_BOUND');
  charge('{}' + ','.repeat(fields.length));
  return `{${fields.map(key => {
    if (key.length > NATIVE_LIMIT.recordBytes) fail('RECORD_BOUND');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail('RECORD_SHAPE');
    return `${charge(JSON.stringify(key) + ':')}${originalCanonical(descriptor.value, depth + 1, budget)}`;
  }).join(',')}}`;
}
function originalHash(value) {
  const text = originalCanonical(value);
  if (Buffer.byteLength(text) > NATIVE_LIMIT.recordBytes) throw new Error('DMI_NATIVE_PROOF_RECORD_BOUND');
  return digest(text);
}
// Only the ordinary JSON data domain can use a shortcut. These predicates are
// work selection, NEVER proof/admission. Unknown/exotic/cyclic/bounded-out data
// goes to the old builder; no getter or proxy is invoked by these probes.
function originalWorkArray(value) {
  if (!Array.isArray(value) || types.isProxy(value)
    || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const length = Object.getOwnPropertyDescriptor(value, 'length');
  if (!length || !Object.hasOwn(length, 'value') || length.value > 4096
    || Reflect.ownKeys(value).length !== length.value + 1) return false;
  for (let index = 0; index < length.value; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return false;
  }
  return true;
}
function originalWorkRecord(value) {
  const active = new Set(); let nodes = 0;
  const visit = (item, depth) => {
    if (depth > 32 || ++nodes > 4096) return false;
    if (item === null || typeof item === 'boolean' || finite(item)) return true;
    if (typeof item === 'string') return item.length <= NATIVE_LIMIT.recordBytes;
    if (typeof item !== 'object' || types.isProxy(item) || active.has(item)) return false;
    const array = Array.isArray(item);
    if (array ? !originalWorkArray(item) : Object.getPrototypeOf(item) !== Object.prototype) return false;
    const keys = Reflect.ownKeys(item);
    if (!array && keys.length > 256) return false;
    active.add(item);
    for (const key of keys) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== 'string' || key.length > NATIVE_LIMIT.recordBytes || !descriptor
        || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')
        || !visit(descriptor.value, depth + 1)) return false;
    }
    active.delete(item); return true;
  };
  return visit(value, 0);
}
function originalWorkData(object, key) {
  if (object === null || typeof object !== 'object' || types.isProxy(object)) return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  return descriptor && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined;
}
function originalUniqueNativeWork(bank, identity) {
  // No top-level getter may swap the checked arrays during normal validation.
  // Exact kernel root shape as own enumerable DATA only; otherwise old path.
  const rootKeys = ['schemaVersion', 'kind', 'scope', 'contexts', 'nativeRows', 'selections', 'bankSha256'];
  if (bank === null || typeof bank !== 'object' || types.isProxy(bank)
    || Object.getPrototypeOf(bank) !== Object.prototype
    || Reflect.ownKeys(bank).length !== rootKeys.length
    || rootKeys.some(key => {
      const descriptor = Object.getOwnPropertyDescriptor(bank, key);
      return !descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value');
    })) return false;
  const data = originalWorkData;
  const contexts = data(bank, 'contexts'), natives = data(bank, 'nativeRows'), stored = data(bank, 'selections');
  if (![contexts, natives, stored].every(originalWorkArray)
    || ![contexts, natives, stored].every(records => records.every(originalWorkRecord))
    || !dmiOriginalWireIdentityMatchesCentralIdentity(identity, identity)) return false;
  const keys = Object.keys(identity), times = new Set();
  for (let index = 0; index < contexts.length; index++) {
    const zone = data(data(data(contexts, String(index)), 'value'), 'zone');
    if (!zone || typeof zone !== 'object' || types.isProxy(zone)
      || Reflect.ownKeys(zone).length !== keys.length
      || keys.some(key => data(zone, key) === undefined)) return false;
    const point = data(zone, 'samplingPoint');
    if (!Array.isArray(point) || types.isProxy(point)
      || Reflect.ownKeys(point).length !== 3 || data(point, 'length') !== 2
      || !finite(data(point, '0')) || !finite(data(point, '1'))
      || keys.some(key => key !== 'samplingPoint' && typeof data(zone, key) !== 'string')
      || !isDeepStrictEqual(zone, identity)) return false;
  }
  for (let index = 0; index < natives.length; index++) {
    const time = data(data(data(natives, String(index)), 'value'), 'time');
    if (typeof time !== 'string') return false;
    const instant = Date.parse(time);
    if (!Number.isFinite(instant) || times.has(instant)) return false;
    times.add(instant);
  }
  return true;
}
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
    const selectedIdentity = ({ partId, time, forecastAgeHours, sourceSha256, tupleSha256 }) =>
      ({ partId, time, forecastAgeHours, sourceSha256, tupleSha256 });
    let sameValidatedSelection = false;
    if (originalUniqueNativeWork(bank, expectedIdentity) && selections.every(({ row }) => {
      const source = originalWorkData(originalWorkData(row, 'sources'), 'current');
      return typeof originalWorkData(row, 'time') === 'string' && originalWorkRecord(source)
        && originalWorkRecord([originalWorkData(row, 'currentUMps'), originalWorkData(row, 'currentVMps')]);
    })) {
      // This normal validator reprojects EVERY stored entry from its actual
      // nativeIds and binds the entire source/tuple/age before any fast accept.
      validateProtectedDmiNativeCurrentProofs(bank);
      const actual = selections.map(({ part, row }) => {
        const sourceSha256 = originalHash(row.sources.current);
        return { partId: part.partId, time: row.time,
          forecastAgeHours: row.sources.current.forecastAgeHours, sourceSha256,
          tupleSha256: originalHash([row.currentUMps, row.currentVMps]) };
      });
      sameValidatedSelection = isDeepStrictEqual(actual, bank.selections.map(selectedIdentity));
    }
    if (!sameValidatedSelection) {
      // EXACT prior normal path for duplicate instants, alternate geometry,
      // uncertain metadata shape or ANY changed row identity. No cheaper new
      // refusal substitutes for the original projection/endpoint/age outcome.
      const rebuilt = buildProtectedDmiNativeCurrentProofs({
        selections, contexts: [], previousBank: bank,
      });
      if (!isDeepStrictEqual(rebuilt.selections.map(selectedIdentity),
        bank.selections.map(selectedIdentity))) originalFailure();
    }
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
