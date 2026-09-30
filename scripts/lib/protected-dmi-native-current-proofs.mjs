// Private, selected-only native evidence. Authentication of donor files belongs
// to the caller's existing protected bundle/GCM boundary, not to these hashes.
// This kernel performs no I/O, selection/prioritisation, or closure mutation.
import crypto from 'node:crypto';
import { buildDmiForecastHourly, sameNativeIdentity } from './dmi-forecast-store.mjs';
import { dmiExpectedIdentityForPart, verifiedBulkCurrent,
  verifiedDmiForecastComponentSource, verifiedDmiNativeComponentSource } from './ravscore-production-adapters.mjs';

export const PROTECTED_DMI_NATIVE_PROOF_LIMITS = Object.freeze({
  parts: 673, hoursPerPart: 121, selections: 673 * 121,
  contexts: 673 * 16, nativeRows: 2 * 673 * 121,
  bankBytes: 192 * 1024 * 1024, recordBytes: 32 * 1024, donorDocuments: 16,
  donorRowsPerPart: 10_000, candidatesPerPart: 10_000, projectionAttempts: 4096,
  candidateBytesPerPart: 32 * 1024 * 1024,
});
const KIND = 'PRIVATE_SELECTED_DMI_NATIVE_CURRENT_PROOFS';
// This is not a 288-hour RavScore-history retention bank. Callers must keep
// the original historical donors until a separate full-history contract exists.
const SCOPE = 'PUBLIC_PART_FORECAST_121';
const LIMIT = PROTECTED_DMI_NATIVE_PROOF_LIMITS;
const SHA = /^[a-f0-9]{64}$/;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw new Error(`DMI_NATIVE_PROOF_${code}`); };
const keys = (value, expected) => plain(value)
  && Object.keys(value).sort().join(',') === [...expected].sort().join(',');
const hour = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(value)
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
// Python producers use second-resolution UTC; JS forecast selections use .000Z.
// Keep original native spellings intact rather than normalising proof fields.
const instant = value => typeof value === 'string' && value.length <= 64
  && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const point = value => Array.isArray(value) && value.length === 2 && value.every(finite)
  && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;
const id = value => typeof value === 'string' && value.length > 0 && value.length < 256;
const pair = (partId, time) => `${partId}\u0000${time}`;
const lexical = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function canonical(value, depth = 0, budget = { bytes: 0, nodes: 0 }) {
  if (depth > 32) fail('RECORD_BOUND');
  if (++budget.nodes > 4096) fail('RECORD_BOUND');
  const charge = text => {
    budget.bytes += Buffer.byteLength(text);
    if (budget.bytes > LIMIT.recordBytes) fail('RECORD_BOUND');
    return text;
  };
  if (value === null || typeof value === 'boolean' || typeof value === 'string'
    || finite(value)) {
    if (typeof value === 'string' && value.length > LIMIT.recordBytes) fail('RECORD_BOUND');
    return charge(JSON.stringify(value));
  }
  if (Array.isArray(value)) {
    if (value.length > 4096) fail('RECORD_BOUND');
    charge('[]' + ','.repeat(value.length));
    return `[${Array.from(value, item => canonical(item, depth + 1, budget)).join(',')}]`;
  }
  if (!plain(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Object.getOwnPropertySymbols(value).length) fail('RECORD_SHAPE');
  const fields = Object.keys(value).sort();
  if (fields.length > 256) fail('RECORD_BOUND');
  charge('{}' + ','.repeat(fields.length));
  return `{${fields.map(key => {
    if (key.length > LIMIT.recordBytes) fail('RECORD_BOUND');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) fail('RECORD_SHAPE');
    return `${charge(JSON.stringify(key) + ':')}${canonical(descriptor.value, depth + 1, budget)}`;
  }).join(',')}}`;
}
function encoded(value) {
  const result = canonical(value);
  if (Buffer.byteLength(result) > LIMIT.recordBytes) fail('RECORD_BOUND');
  return result;
}
const sha = value => crypto.createHash('sha256').update(encoded(value)).digest('hex');
const equal = (a, b) => a !== undefined && b !== undefined && encoded(a) === encoded(b);
const clone = value => JSON.parse(encoded(value));
function selectedSource(row) {
  // Do not silently strip/rewrite proof fields from a projected public row.
  // The caller supplies the exact original forecast selection, not UI data.
  return row?.sources?.current;
}
function selected(part, row) {
  const expected = dmiExpectedIdentityForPart(part);
  encoded(selectedSource(row));
  if (!id(part?.partId) || !point(part?.waterPoint) || !expected || !hour(row?.time)
    || !finite(row.currentUMps) || !finite(row.currentVMps)
    || !verifiedDmiForecastComponentSource(selectedSource(row), row.time, 'current', expected)) fail('SELECTION_INVALID');
  if (!finite(selectedSource(row).forecastAgeHours)) fail('SELECTION_INVALID');
  return expected;
}
function contextFrom(document, part) {
  const expected = dmiExpectedIdentityForPart(part);
  const original = document?.zones?.[expected.entityId];
  if (!plain(original)) return null;
  // Copy only original verifier inputs; never synthesise an identity/header
  // from the desired PART. The original native source is retained in full.
  const zone = {};
  for (const key of Object.keys(expected)) {
    if (!Object.hasOwn(original, key)) return null;
    zone[key] = original[key];
  }
  const header = {};
  for (const key of ['currentVectorSemanticsVersion', 'currentVectorSelection',
    'currentMaxDistanceKm', 'timeStrideHours', 'generatedAt']) {
    if (Object.hasOwn(document, key)) header[key] = document[key];
  }
  return clone({ partId: part.partId, header, zone });
}
function partFrom(context) {
  return { partId: context.partId, zoneId: context.zone.parentZoneId,
    waterPoint: context.zone.samplingPoint };
}
function validateContext(context) {
  if (!keys(context, ['partId', 'header', 'zone']) || !id(context.partId)
    || !plain(context.header) || !plain(context.zone)) fail('CONTEXT_INVALID');
  const expected = dmiExpectedIdentityForPart(partFrom(context));
  if (!expected || !equal(context.zone, expected)
    || !Object.keys(context.header).every(key => ['currentVectorSemanticsVersion',
      'currentVectorSelection', 'currentMaxDistanceKm', 'timeStrideHours', 'generatedAt'].includes(key))) fail('CONTEXT_INVALID');
  if (Object.hasOwn(context.header, 'generatedAt') && !instant(context.header.generatedAt)) fail('CONTEXT_INVALID');
  if (Object.hasOwn(context.header, 'timeStrideHours')
    && (!finite(context.header.timeStrideHours) || context.header.timeStrideHours <= 0
      || context.header.timeStrideHours > 24)) fail('CONTEXT_INVALID');
  encoded(context);
}
function validateNative(native, context) {
  encoded(native);
  if (!keys(native, ['contextId', 'time', 'uMps', 'vMps', 'source'])
    || !SHA.test(native.contextId) || !instant(native.time)
    || !finite(native.uMps) || !finite(native.vMps)) fail('NATIVE_INVALID');
  const part = partFrom(context), expected = dmiExpectedIdentityForPart(part);
  // A derived forecast must not be relabelled as a native observation.
  if (['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours']
    .some(key => Object.hasOwn(native.source ?? {}, key))
    || !verifiedDmiNativeComponentSource(native.source, native.time, 'current', expected)
    || !verifiedBulkCurrent(context.header, context.zone, part.waterPoint,
      native.source, native.time, expected)) fail('NATIVE_INVALID');
}
function project(entry, nativeById, contextById) {
  const native = entry.nativeIds.map(key => nativeById.get(key));
  if (native.some(value => !value)) fail('NATIVE_REFERENCE_MISSING');
  const contexts = native.map(value => contextById.get(value.contextId));
  if (contexts.some(value => !value || value.partId !== entry.partId)) fail('CONTEXT_REFERENCE_MISSING');
  const cadence = contexts[0].header.timeStrideHours ?? 3;
  if (contexts.some(value => (value.header.timeStrideHours ?? 3) !== cadence)) fail('CONTEXT_CONFLICT');
  const built = buildDmiForecastHourly({
    ocean: native.map(value => ({ step: value.time, 'current-u': value.uMps,
      'current-v': value.vMps, provenance: { current: value.source } })),
    // Age is formatting metadata, not evidence of native values or priority.
    // The immutable run/native timestamps below, never this diagnostic, prove
    // the selected forecast. No original generation time is inferred from age.
    generatedAt: entry.time, startAt: entry.time, hours: 1,
    sourceCadenceMinutes: cadence * 60,
  }).hourly?.[0];
  const source = built?.sources?.current
    ? { ...built.sources.current, forecastAgeHours: entry.forecastAgeHours } : null;
  const part = partFrom(contexts[0]);
  if (built?.time !== entry.time || !finite(built.currentUMps) || !finite(built.currentVMps)
    || !verifiedDmiForecastComponentSource(source, entry.time, 'current', dmiExpectedIdentityForPart(part))
    || sha(source) !== entry.sourceSha256
    || sha([built.currentUMps, built.currentVMps]) !== entry.tupleSha256) fail('PROJECTION_MISMATCH');
  if (source.nativeValidTimes.length !== native.length
    || native.some((value, index) => Date.parse(source.nativeValidTimes[index]) !== Date.parse(value.time))) fail('ENDPOINT_MISMATCH');
  return { source, currentUMps: built.currentUMps, currentVMps: built.currentVMps,
    nativeRows: native, contexts };
}
function bankDigest(bank) {
  // Fixed framing, one bounded record at a time: no national JSON string.
  const hash = crypto.createHash('sha256');
  let bytes = 512;
  hash.update(`${KIND}\n${SCOPE}\n1\n`);
  for (const [name, records] of [['contexts', bank.contexts], ['nativeRows', bank.nativeRows], ['selections', bank.selections]]) {
    hash.update(`${name}\n`);
    for (const record of records) {
      const text = encoded(record); bytes += Buffer.byteLength(text) + 2;
      if (bytes > LIMIT.bankBytes) fail('BANK_BOUND');
      hash.update(text).update('\n');
    }
  }
  return hash.digest('hex');
}
function indexBank(bank) {
  if (!keys(bank, ['schemaVersion', 'kind', 'scope', 'contexts', 'nativeRows', 'selections', 'bankSha256'])
    || bank.schemaVersion !== 1 || bank.kind !== KIND || bank.scope !== SCOPE || !SHA.test(bank.bankSha256 ?? '')
    || !Array.isArray(bank.contexts) || bank.contexts.length > LIMIT.contexts
    || !Array.isArray(bank.nativeRows) || bank.nativeRows.length > LIMIT.nativeRows
    || !Array.isArray(bank.selections) || bank.selections.length > LIMIT.selections
    || bankDigest(bank) !== bank.bankSha256) fail('BANK_INVALID');
  const contextById = new Map(), nativeById = new Map(), selectionByPair = new Map();
  let previous = '';
  for (const record of bank.contexts) {
    if (!keys(record, ['id', 'value']) || !SHA.test(record.id) || record.id <= previous
      || sha(record.value) !== record.id) fail('CONTEXT_DIGEST_INVALID');
    validateContext(record.value); contextById.set(record.id, record.value); previous = record.id;
  }
  previous = '';
  for (const record of bank.nativeRows) {
    if (!keys(record, ['id', 'value']) || !SHA.test(record.id)) fail('NATIVE_RECORD_INVALID');
    if (record.id <= previous) fail('NATIVE_DUPLICATE_OR_ORDER');
    if (sha(record.value) !== record.id) fail('NATIVE_DIGEST_INVALID');
    if (!contextById.has(record.value.contextId)) fail('CONTEXT_REFERENCE_MISSING');
    validateNative(record.value, contextById.get(record.value.contextId));
    nativeById.set(record.id, record.value); previous = record.id;
  }
  previous = ''; const partCounts = new Map(), referencedNative = new Set(), referencedContexts = new Set();
  for (const entry of bank.selections) {
    if (!keys(entry, ['partId', 'time', 'forecastAgeHours', 'sourceSha256', 'tupleSha256', 'nativeIds'])
      || !id(entry.partId) || !hour(entry.time) || !finite(entry.forecastAgeHours)
      || !SHA.test(entry.sourceSha256) || !SHA.test(entry.tupleSha256)
      || !Array.isArray(entry.nativeIds) || entry.nativeIds.length < 1 || entry.nativeIds.length > 2
      || entry.nativeIds.some(value => !SHA.test(value)) || new Set(entry.nativeIds).size !== entry.nativeIds.length) fail('ENTRY_INVALID');
    const key = pair(entry.partId, entry.time);
    if (key <= previous) fail('ENTRY_DUPLICATE_OR_ORDER');
    previous = key; partCounts.set(entry.partId, (partCounts.get(entry.partId) ?? 0) + 1);
    if (partCounts.size > LIMIT.parts || partCounts.get(entry.partId) > LIMIT.hoursPerPart) fail('DOMAIN_BOUND');
    project(entry, nativeById, contextById);
    for (const nativeId of entry.nativeIds) { referencedNative.add(nativeId); referencedContexts.add(nativeById.get(nativeId).contextId); }
    selectionByPair.set(key, entry);
  }
  if (referencedNative.size !== nativeById.size || referencedContexts.size !== contextById.size) fail('UNREFERENCED_EVIDENCE');
  return { contextById, nativeById, selectionByPair };
}
export function validateProtectedDmiNativeCurrentProofs(bank) {
  indexBank(bank); return bank;
}

export function verifyProtectedDmiNativeCurrentProof(bank, { part, row } = {}) {
  try {
    const expected = selected(part, row), index = indexBank(bank);
    const entry = index.selectionByPair.get(pair(part.partId, row.time));
    if (!entry || entry.sourceSha256 !== sha(selectedSource(row))
      || entry.tupleSha256 !== sha([row.currentUMps, row.currentVMps])) fail('SELECTION_NOT_PROVED');
    const projected = project(entry, index.nativeById, index.contextById);
    if (projected.contexts.some(context => !equal(context.zone, expected))) fail('GEOMETRY_MISMATCH');
    return { ok: true, ...projected };
  } catch (error) { return { ok: false, code: /^DMI_NATIVE_PROOF_[A-Z_]+$/.test(error?.message ?? '') ? error.message : 'DMI_NATIVE_PROOF_INVALID' }; }
}

function candidateReader(contexts, previous) {
  if (!Array.isArray(contexts) || contexts.length > LIMIT.donorDocuments) fail('INPUT_BOUND');
  const previousByPart = new Map();
  if (previous) for (const native of previous.nativeById.values()) {
    const context = previous.contextById.get(native.contextId);
    const list = previousByPart.get(context.partId) ?? [];
    list.push({ native, context }); previousByPart.set(context.partId, list);
  }
  // Audit scans one PART at a time. Keeping only the last PART index avoids
  // retaining another national copy of up to 16 authenticated donor documents.
  let cachedKey = null, cached = null;
  return part => {
    const expected = dmiExpectedIdentityForPart(part), key = sha(expected);
    if (key === cachedKey) return cached;
    const byId = new Map();
    const contextsById = new Map();
    let bytes = 0;
    const append = (native, context) => {
      const nativeId = sha(native);
      if (byId.has(nativeId)) return;
      if (byId.size >= LIMIT.candidatesPerPart) fail('DONOR_BOUND');
      const contextId = native.contextId;
      bytes += Buffer.byteLength(encoded(native)) + 128;
      if (!contextsById.has(contextId)) bytes += Buffer.byteLength(encoded(context)) + 128;
      if (bytes > LIMIT.candidateBytesPerPart) fail('DONOR_BOUND');
      if (!contextsById.has(contextId)) contextsById.set(contextId, clone(context));
      byId.set(nativeId, { id: nativeId, native: clone(native), context: contextsById.get(contextId) });
    };
    for (const document of contexts) {
      const context = contextFrom(document, part);
      if (!context) continue;
      validateContext(context);
      const contextId = sha(context), original = document.zones[expected.entityId];
      const rows = original.hourly ?? {};
      if (!plain(rows) || Object.keys(rows).length > LIMIT.donorRowsPerPart) fail('DONOR_BOUND');
      for (const raw of Object.values(rows)) {
        if (!finite(raw?.['current-u']) || !finite(raw?.['current-v'])) continue;
        const native = { contextId, time: raw.time, uMps: raw['current-u'], vMps: raw['current-v'], source: raw.sources?.current };
        try { validateNative(native, context); } catch { continue; }
        append(native, context);
      }
    }
    for (const candidate of previousByPart.get(part.partId) ?? []) append(candidate.native, candidate.context);
    const byTime = new Map();
    for (const value of byId.values()) {
      const nativeMs = Date.parse(value.native.time);
      const list = byTime.get(nativeMs) ?? [];
      list.push(value); byTime.set(nativeMs, list);
    }
    cachedKey = key; cached = byTime;
    return byTime;
  };
}

function proveSelection(selection, readCandidates) {
  const { part, row } = selection ?? {};
  const expected = selected(part, row), source = selectedSource(row);
  const entry = { partId: part.partId, time: row.time,
    forecastAgeHours: source.forecastAgeHours,
    sourceSha256: sha(source), tupleSha256: sha([row.currentUMps, row.currentVMps]), nativeIds: [] };
  const candidates = readCandidates(part);
  const endpointChoices = source.nativeSteps.map(step => {
    const matching = (candidates.get(Date.parse(step.nativeValidTime)) ?? []).filter(({ native, context }) =>
      equal(context.zone, expected) && sameNativeIdentity(native.source, source, 'current')
      && Object.entries(step).every(([name, value]) => name === 'nativeValidTime'
        ? Date.parse(native.source[name]) === Date.parse(value) : equal(native.source[name], value)));
    if (!matching.length) fail('NATIVE_ENDPOINT_MISSING');
    // Contradictory actual native values under the same immutable identity
    // cannot be resolved by matching the desired result or by donor order.
    const tuples = new Set(matching.map(({ native }) => sha([native.uMps, native.vMps])));
    if (tuples.size !== 1) fail('NATIVE_CONFLICT');
    return matching.sort((a, b) => lexical(a.id, b.id));
  });
  let attempts = 0;
  const tails = endpointChoices.length === 2 ? endpointChoices[1] : [null];
  for (const first of endpointChoices[0]) for (const second of tails) {
    if (++attempts > LIMIT.projectionAttempts) fail('DONOR_BOUND');
    const chosen = second ? [first, second] : [first];
    const contextById = new Map(chosen.map(value => [value.native.contextId, value.context]));
    const nativeById = new Map(chosen.map(value => [value.id, value.native]));
    const attempt = { ...entry, nativeIds: chosen.map(value => value.id) };
    try {
      const projected = project(attempt, nativeById, contextById);
      return { entry: attempt, chosen, projected };
    } catch (error) {
      if (!['DMI_NATIVE_PROOF_PROJECTION_MISMATCH', 'DMI_NATIVE_PROOF_CONTEXT_CONFLICT',
        'DMI_NATIVE_PROOF_ENDPOINT_MISMATCH'].includes(error?.message)) throw error;
    }
  }
  fail('PROJECTION_MISMATCH');
}

/** Read-only probe: pass ONE authenticated donor to measure single-donor proof.
 * Does not persist data, alter selection, or infer cross-donor availability.
 * Callers must not mutate a donor while its inspector is in use.
 */
export function createProtectedDmiNativeCurrentInspector({ contexts = [] } = {}) {
  const readCandidates = candidateReader(contexts, null);
  return Object.freeze({ inspect(selection) {
    try {
      const proof = proveSelection(selection, readCandidates);
      return { ok: true, code: 'DMI_NATIVE_PROOF_COMPLETE', nativeEndpointCount: proof.entry.nativeIds.length };
    } catch (error) {
      return { ok: false, code: /^DMI_NATIVE_PROOF_[A-Z_]+$/.test(error?.message ?? '')
        ? error.message : 'DMI_NATIVE_PROOF_INVALID' };
    }
  } });
}

export function buildProtectedDmiNativeCurrentProofs({ selections, contexts = [], previousBank = null } = {}) {
  if (!Array.isArray(selections) || selections.length > LIMIT.selections) fail('INPUT_BOUND');
  const previous = previousBank ? indexBank(previousBank) : null;
  const readCandidates = candidateReader(contexts, previous);
  const contextById = new Map(), nativeById = new Map(), entries = [];
  const seen = new Set(), partCounts = new Map();
  let budgetBytes = 512;
  const add = (map, value, maximum) => {
    const key = sha(value);
    if (!map.has(key)) {
      budgetBytes += Buffer.byteLength(encoded({ id: key, value })) + 2;
      if (map.size >= maximum || budgetBytes > LIMIT.bankBytes) fail('BANK_BOUND');
      map.set(key, clone(value));
    }
  };
  for (const selection of selections) {
    const { part, row } = selection ?? {};
    selected(part, row);
    const key = pair(part.partId, row.time);
    if (seen.has(key)) fail('SELECTION_DUPLICATE');
    seen.add(key); partCounts.set(part.partId, (partCounts.get(part.partId) ?? 0) + 1);
    if (partCounts.size > LIMIT.parts || partCounts.get(part.partId) > LIMIT.hoursPerPart) fail('DOMAIN_BOUND');
    const { entry, chosen } = proveSelection(selection, readCandidates);
    for (const value of chosen) {
      add(contextById, value.context, LIMIT.contexts);
      add(nativeById, value.native, LIMIT.nativeRows);
    }
    budgetBytes += Buffer.byteLength(encoded(entry)) + 2;
    if (budgetBytes > LIMIT.bankBytes) fail('BANK_BOUND');
    entries.push(entry);
  }
  const sorted = map => [...map].sort(([a], [b]) => lexical(a, b)).map(([key, value]) => ({ id: key, value }));
  const bank = { schemaVersion: 1, kind: KIND, scope: SCOPE,
    contexts: sorted(contextById), nativeRows: sorted(nativeById),
    selections: entries.sort((a, b) => pair(a.partId, a.time) < pair(b.partId, b.time) ? -1 : 1) };
  bank.bankSha256 = bankDigest(bank);
  validateProtectedDmiNativeCurrentProofs(bank);
  return bank;
}
