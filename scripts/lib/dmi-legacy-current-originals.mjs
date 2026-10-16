// OLD-only native reconstruction, never an authentication/sampling receipt.
// The normal Python caller owns actual RAW verification, legacy decoding, EOF
// and physical close before publishing this derived, current-only document.
// Requests/locked input hashes belong to the authenticated pre-producer caller;
// this reader never rehashes a candidate which DMI has since legitimately moved.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { constants, fstatSync } from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { assertRavScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';
import { dmiExpectedIdentityForPart, verifiedDmiNativeComponentSource,
  verifiedBulkCurrent } from './ravscore-production-adapters.mjs';
import { createProtectedDmiNativeCurrentInspector,
  PROTECTED_DMI_NATIVE_PROOF_LIMITS as LIMIT } from './protected-dmi-native-current-proofs.mjs';

export const DMI_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH = '.cache/dmi-legacy-current-original-requests.json';
export const DMI_LEGACY_CURRENT_ORIGINAL_PATH = '.cache/dmi-legacy-current-originals.json';
const SOURCE_PATHS = Object.freeze({ zones: 'data/zones.geojson',
  deployedBulk: '.cache/deployed-dmi-bulk-cache.json', forecast: 'data/live/dmi-forecast-cache.json',
  candidate: '.cache/dmi-candidate-progress.json', active: '.cache/dmi-active-complete.json' });
const ROLES = ['deployedBulk', 'candidate', 'active'];
const HEADER = ['generatedAt', 'currentVectorSemanticsVersion', 'currentVectorSelection',
  'currentMaxDistanceKm', 'timeStrideHours'];
const CONTRACT = HEADER.filter(key => key !== 'generatedAt');
// Private replay may span state-72h plus the owner's 51h history, including
// both endpoints: 124 selected hours, each with at most two causal natives.
// This is not the unchanged PUBLIC_PART_FORECAST_121 evidence-bank contract.
const PRIVATE_REQUEST_COUNTS = Object.freeze({ selections: 673 * 124, nativeRows: 2 * 673 * 124 });
const DERIVED = ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours'];
const SHA = /^sha256:[a-f0-9]{64}$/;
const SIGNATURE = /^parser:20\|params:4\|grid:9\|eccodes-api:2\.48\.(?:0|2)\|eccodes-binding:2\.48\.0\|zones:[a-f0-9]{16}$/;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const fail = code => { throw new Error('DMI_LEGACY_CURRENT_' + code); };
const keys = (value, fields) => plain(value)
  && Object.keys(value).sort().join(',') === [...fields].sort().join(',');
const digest = bytes => 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
function canonical(value, depth = 0) {
  if (depth > 32) fail('RECORD_BOUND');
  if (value === null || typeof value === 'boolean' || typeof value === 'string' || finite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(item => canonical(item, depth + 1)).join(',') + ']';
  if (!plain(value) || Object.getPrototypeOf(value) !== Object.prototype
    || Object.getOwnPropertySymbols(value).length) fail('RECORD_INVALID');
  return '{' + Object.keys(value).sort().map(key => {
    if (!Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), 'value')) fail('RECORD_INVALID');
    return JSON.stringify(key) + ':' + canonical(value[key], depth + 1);
  }).join(',') + '}';
}
function encoded(value) {
  const text = canonical(value);
  if (Buffer.byteLength(text) > LIMIT.recordBytes) fail('RECORD_BOUND');
  return text;
}
const hash = value => digest(encoded(value));
const equal = (left, right) => encoded(left) === encoded(right);
const instant = value => typeof value === 'string' && value.length <= 64
  && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const hour = value => instant(value) && Date.parse(value) % 3_600_000 === 0;
const contract = header => Object.fromEntries(CONTRACT.map(key => [key,
  Object.hasOwn(header, key) ? { value: header[key] } : { absent: true }]));
function partIndex(parts) {
  if (!Array.isArray(parts) || parts.length > LIMIT.parts) fail('PARTS_INVALID');
  const result = new Map();
  for (const part of parts) {
    const identity = dmiExpectedIdentityForPart(part);
    if (!identity || typeof part?.partId !== 'string' || !part.partId
      || result.has(part.partId)) fail('PARTS_INVALID');
    result.set(part.partId, { part, identity });
  }
  return result;
}
function processingEvidence(evidence, collection) {
  if (!keys(evidence, ['kind', 'path', 'sha256']) || !SHA.test(evidence.sha256 ?? '')
    || !Array.isArray(evidence.path)) fail('PROCESSING_EVIDENCE_INVALID');
  const p = evidence.path, index = value => Number.isSafeInteger(value) && value >= 0;
  const valid = evidence.kind === 'RUN_PROCESSED_STEP'
    ? p.length === 4 && p[0] === 'runs' && p[1] === collection && p[2] === 'processedSteps' && hour(p[3])
    : evidence.kind === 'LEDGER_COLLECTION_ASSET'
      ? p.length === 6 && p[0] === 'diagnostics' && p[1] === 'currentOperationalLedger'
        && p[2] === 'collections' && index(p[3]) && p[4] === 'validTimes' && index(p[5])
      : evidence.kind === 'RETAINED_CURRENT_ASSET_PROOF'
        && p.length === 4 && p[0] === 'diagnostics' && p[1] === 'currentOperationalLedger'
        && p[2] === 'retainedCurrentAssetProofs' && index(p[3]);
  if (!valid) fail('PROCESSING_EVIDENCE_INVALID');
}

function validateRequests(requests, parts, expected) {
  const fields = ['schemaVersion', 'kind', 'productionReferenceAt', 'modelBinding', 'historyDemandSha256',
    'registrySha256', 'sourceHashes', 'sourcePaths', 'documentContexts', 'projectionWitnesses', 'reconstructionRequests'];
  if (!keys(requests, fields) || requests.schemaVersion !== 1
    || requests.kind !== 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS'
    || !hour(requests.productionReferenceAt) || !plain(expected)) fail('REQUESTS_INVALID');
  try { assertRavScoreModelBinding(requests.modelBinding); assertRavScoreModelBinding(expected.modelBinding); }
  catch { fail('MODEL_BINDING_MISMATCH'); }
  for (const key of ['productionReferenceAt', 'modelBinding', 'historyDemandSha256', 'registrySha256', 'sourceHashes']) {
    if (!Object.hasOwn(expected, key) || !equal(requests[key], expected[key])) fail('EXPECTED_INPUT_MISMATCH');
  }
  if (!SHA.test(requests.historyDemandSha256 ?? '') || !SHA.test(requests.registrySha256 ?? '')
    || !equal(requests.sourcePaths, SOURCE_PATHS) || !keys(requests.sourceHashes, Object.keys(SOURCE_PATHS))) fail('INPUT_BINDING_INVALID');
  for (const [role, value] of Object.entries(requests.sourceHashes)) {
    if (!SHA.test(value ?? '') && !(value === null && ROLES.includes(role))) fail('INPUT_BINDING_INVALID');
  }
  if (!Array.isArray(requests.documentContexts) || requests.documentContexts.length > ROLES.length
    || !Array.isArray(requests.projectionWitnesses) || requests.projectionWitnesses.length > PRIVATE_REQUEST_COUNTS.selections
    || !Array.isArray(requests.reconstructionRequests) || requests.reconstructionRequests.length > PRIVATE_REQUEST_COUNTS.nativeRows) fail('REQUEST_BOUND');
  const byPart = partIndex(parts), contexts = new Map(), witnesses = new Map(), native = new Map();
  for (const context of requests.documentContexts) {
    if (!keys(context, ['documentRole', 'header', 'zones']) || !ROLES.includes(context.documentRole)
      || contexts.has(context.documentRole) || !SHA.test(requests.sourceHashes[context.documentRole] ?? '')
      || !plain(context.header) || Object.keys(context.header).some(key => !HEADER.includes(key))
      || Object.hasOwn(context.header, 'generatedAt') && !instant(context.header.generatedAt)
      || !Array.isArray(context.zones) || context.zones.length > LIMIT.parts) fail('CONTEXT_INVALID');
    encoded(context.header);
    const zones = new Map();
    for (const selected of context.zones) {
      if (!keys(selected, ['partId', 'zone']) || zones.has(selected.partId)
        || !byPart.has(selected.partId) || !equal(selected.zone, byPart.get(selected.partId).identity)) fail('CONTEXT_ZONE_INVALID');
      zones.set(selected.partId, selected.zone);
    }
    contexts.set(context.documentRole, { ...context, zones });
  }
  const contextFor = (role, partId) => {
    const context = contexts.get(role);
    if (!context?.zones.has(partId)) fail('CONTEXT_REQUIRED');
    return context;
  };
  for (const witness of requests.projectionWitnesses) {
    if (!keys(witness, ['witnessId', 'partId', 'documentRole', 'row', 'sourceSha256', 'tupleSha256'])
      || !SHA.test(witness.witnessId ?? '') || witnesses.has(witness.witnessId)
      || !keys(witness.row, ['time', 'currentUMps', 'currentVMps', 'sources'])
      || !keys(witness.row.sources, ['current']) || !hour(witness.row.time)
      || !finite(witness.row.currentUMps) || !finite(witness.row.currentVMps)
      || hash({ partId: witness.partId, documentRole: witness.documentRole, row: witness.row }) !== witness.witnessId
      || hash(witness.row.sources.current) !== witness.sourceSha256
      || hash([witness.row.currentUMps, witness.row.currentVMps]) !== witness.tupleSha256) fail('WITNESS_INVALID');
    contextFor(witness.documentRole, witness.partId);
    witnesses.set(witness.witnessId, witness);
  }
  const semantics = new Set(), witnessReferences = new Set(), usedContexts = new Set();
  const requestsByWitness = new Map(), partByEntity = new Map();
  for (const request of requests.reconstructionRequests) {
    if (!keys(request, ['requestId', 'partId', 'entityId', 'documentRole', 'nativeValidTime',
      'reconstructionRequest', 'processingEvidence', 'projectionWitnessRefs'])
      || !SHA.test(request.requestId ?? '') || native.has(request.requestId)
      || !Array.isArray(request.projectionWitnessRefs) || !request.projectionWitnessRefs.length
      || request.projectionWitnessRefs.length > PRIVATE_REQUEST_COUNTS.selections
      || new Set(request.projectionWitnessRefs).size !== request.projectionWitnessRefs.length) fail('REQUEST_INVALID');
    const fields = Object.fromEntries(Object.entries(request)
      .filter(([key]) => !['requestId', 'projectionWitnessRefs'].includes(key)));
    if (hash(fields) !== request.requestId) fail('REQUEST_ID_MISMATCH');
    const selected = byPart.get(request.partId), inner = request.reconstructionRequest;
    const context = contextFor(request.documentRole, request.partId);
    if (!selected || request.entityId !== selected.identity.entityId || !hour(request.nativeValidTime)
      || !keys(inner, ['zone', 'expectedSource', 'capture', 'processingSignature'])
      || !plain(inner.zone) || inner.zone.id !== request.entityId
      || inner.zone.lat !== selected.part.waterPoint[1] || inner.zone.lon !== selected.part.waterPoint[0]
      || !SIGNATURE.test(inner.processingSignature ?? '') || !plain(inner.expectedSource)
      || DERIVED.some(key => Object.hasOwn(inner.expectedSource, key))
      || inner.expectedSource.nativeGridSampling != null
      || Date.parse(inner.expectedSource.nativeValidTime) !== Date.parse(request.nativeValidTime)
      || !verifiedDmiNativeComponentSource(inner.expectedSource, inner.expectedSource.nativeValidTime, 'current', selected.identity)
      || !verifiedBulkCurrent(context.header, selected.identity, selected.part.waterPoint,
        inner.expectedSource, inner.expectedSource.nativeValidTime, selected.identity)) fail('REQUEST_NATIVE_INVALID');
    const capture = canonicalSavedDmiOriginalCapture(inner.expectedSource);
    if (!capture || !equal(capture, inner.capture)
      || !equal(canonicalSavedDmiOriginalCapture(inner.capture), inner.capture)) fail('CAPTURE_INVALID');
    processingEvidence(request.processingEvidence, inner.expectedSource.collection);
    const semantic = encoded({ documentRole: request.documentRole, partId: request.partId, source: inner.expectedSource });
    if (semantics.has(semantic)) fail('REQUEST_DUPLICATE');
    semantics.add(semantic);
    for (const ref of request.projectionWitnessRefs) {
      const witness = witnesses.get(ref);
      if (!witness || witness.partId !== request.partId || witness.documentRole !== request.documentRole) fail('WITNESS_REFERENCE_INVALID');
      witnessReferences.add(ref);
      const referenced = requestsByWitness.get(ref) ?? [];
      referenced.push(request); requestsByWitness.set(ref, referenced);
    }
    native.set(request.requestId, request); usedContexts.add(request.documentRole);
    partByEntity.set(request.entityId, selected);
  }
  if (witnessReferences.size !== witnesses.size || contexts.size !== usedContexts.size) fail('UNREFERENCED_REQUEST_EVIDENCE');
  const ordered = ROLES.filter(role => usedContexts.has(role)).map(role => contexts.get(role));
  if (ordered.some(context => !equal(contract(context.header), contract(ordered[0].header)))) fail('CONTEXT_CONTRACT_COLLISION');
  return { byPart, contexts, witnesses, native, requestsByWitness, partByEntity, header: ordered[0]?.header ?? null };
}

export function verifyDmiLegacyCurrentOriginalReconstruction({ requests, requestsSha256,
  reconstruction, parts, expected } = {}) {
  const index = validateRequests(requests, parts, expected);
  if (!index.native.size) fail('EMPTY_REQUESTS_NOT_DECODED');
  if (!SHA.test(requestsSha256 ?? '') || !SHA.test(expected.requestsSha256 ?? '')
    || requestsSha256 !== expected.requestsSha256
    || !keys(reconstruction, ['schemaVersion', 'kind', 'requestsSha256', 'document'])
    || reconstruction.schemaVersion !== 1 || reconstruction.kind !== 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION'
    || reconstruction.requestsSha256 !== requestsSha256) fail('REQUESTS_HASH_MISMATCH');
  const document = reconstruction.document;
  if (!keys(document, [...Object.keys(index.header), 'zones']) || !plain(document.zones)
    || !equal(Object.fromEntries(Object.keys(index.header).map(key => [key, document[key]])), index.header)
    || Object.keys(document.zones).length > LIMIT.parts) fail('DOCUMENT_INVALID');
  const seen = new Set();
  for (const [entityId, zone] of Object.entries(document.zones)) {
    const selected = index.partByEntity.get(entityId);
    if (!selected || !keys(zone, [...Object.keys(selected.identity), 'hourly'])
      || !equal(Object.fromEntries(Object.keys(selected.identity).map(key => [key, zone[key]])), selected.identity)
      || !plain(zone.hourly) || Object.keys(zone.hourly).length > LIMIT.donorRowsPerPart) fail('DOCUMENT_ZONE_INVALID');
    for (const [requestId, row] of Object.entries(zone.hourly)) {
      const actual = index.native.get(requestId);
      if (!actual || seen.has(requestId) || actual.entityId !== entityId
        || !keys(row, ['time', 'current-u', 'current-v', 'sources']) || !keys(row.sources, ['current'])
        || !finite(row['current-u']) || !finite(row['current-v'])
        || row.time !== actual.reconstructionRequest.expectedSource.nativeValidTime
        || !equal(row.sources.current, actual.reconstructionRequest.expectedSource)) fail('DOCUMENT_ROW_INVALID');
      seen.add(requestId);
    }
  }
  if (seen.size !== index.native.size) fail('NATIVE_ROWS_MISSING');
  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [document] }), used = new Set();
  for (const witness of index.witnesses.values()) {
    const original = inspector.inspectOriginals({ part: index.byPart.get(witness.partId).part, row: witness.row });
    if (!original.ok) fail('PROJECTION_REJECTED');
    for (const request of index.requestsByWitness.get(witness.witnessId) ?? []) {
      if (!original.nativeRows.some(row => equal(row.source, request.reconstructionRequest.expectedSource)
        && row.time === request.reconstructionRequest.expectedSource.nativeValidTime)) fail('NATIVE_REFERENCE_UNUSED');
      used.add(request.requestId);
    }
  }
  if (used.size !== index.native.size) fail('NATIVE_REFERENCE_UNUSED');
  // This is the same genuine produced document, not proof metadata or a
  // numerically inverted forecast. Its normal historical mapper remains owner.
  return document;
}

// JSON.parse checks grammar; an independent bounded pass rejects duplicate
// keys, including escaped aliases. No record is silently replaced by a later key.
function parse(bytes) {
  let text, value;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); value = JSON.parse(text); }
  catch { fail('INVALID_JSON'); }
  const stack = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      const start = i;
      for (i++; i < text.length; i++) { if (text[i] === '\\') i++; else if (text[i] === '"') break; }
      const frame = stack.at(-1);
      if (frame?.keys && frame.expectKey) {
        const key = JSON.parse(text.slice(start, i + 1));
        if (frame.keys.has(key)) fail('DUPLICATE_KEY');
        frame.keys.add(key); frame.expectKey = false;
      }
    } else if (c === '{' || c === '[') {
      stack.push(c === '{' ? { keys: new Set(), expectKey: true } : {});
      if (stack.length > 64) fail('STRUCTURE_LIMIT');
    } else if (c === '}' || c === ']') stack.pop();
    else if (c === ',' && stack.at(-1)?.keys) stack.at(-1).expectKey = true;
  }
  return value;
}
const sameStat = (a, b) => ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
const uncertainReaders = new Map();
async function optionalStat(file) {
  try { return await fs.lstat(file, { bigint: true }); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}
async function closeOwnedLegacyCurrentReader(row, primary) {
  if (row.closeAttempted) fail('CLOSE_REPEATED');
  row.closeAttempted = true;
  try { await row.handle.close(); }
  catch (error) { primary ??= error; }
  // A fulfilled/no-op close is not closure proof. A valid/reused descriptor or
  // unknown probe result retains the exact reader and first failure; never
  // close that integer again and risk somebody else's now-reused descriptor.
  try { fstatSync(row.fd); }
  catch (error) {
    if (error?.code === 'EBADF') row.closed = true;
    else primary ??= error;
  }
  if (!row.closed) primary ??= new Error('DMI_LEGACY_CURRENT_CLOSE_UNPROVED');
  if (row.closed) uncertainReaders.delete(row.handle);
  return primary;
}
async function readFixed(root, relative) {
  const file = path.join(root, relative), before = await optionalStat(file);
  if (before === null) return null;
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || before.size < 2n || before.size > BigInt(LIMIT.bankBytes)) fail('INVALID_FILE');
  const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const row = { handle, fd: handle.fd, file, before, closeAttempted: false, closed: false };
  uncertainReaders.set(handle, row);
  let primary = null, result;
  try {
    if (!sameStat(before, await handle.stat({ bigint: true }))) fail('FILE_CHANGED');
    const bytes = Buffer.alloc(Number(before.size));
    let position = 0;
    while (position < bytes.length) {
      const read = await handle.read(bytes, position, bytes.length - position, position);
      if (!read.bytesRead) fail('FILE_TRUNCATED');
      position += read.bytesRead;
    }
    if ((await handle.read(Buffer.alloc(1), 0, 1, position)).bytesRead
      || !sameStat(before, await handle.stat({ bigint: true }))
      || !sameStat(before, await fs.lstat(file, { bigint: true }))) fail('FILE_CHANGED');
    result = { value: parse(bytes), sha256: digest(bytes), file, before };
  } catch (error) { primary = error; }
  primary = await closeOwnedLegacyCurrentReader(row, primary);
  if (primary !== null) throw primary;
  return result;
}
export async function readDmiLegacyCurrentOriginals({ repositoryRoot, parts, expected, required = false } = {}) {
  if (typeof required !== 'boolean' || typeof repositoryRoot !== 'string' || !path.isAbsolute(repositoryRoot)) fail('READER_SCOPE_INVALID');
  const requestedRoot = path.resolve(repositoryRoot), rootStat = await fs.lstat(requestedRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail('READER_SCOPE_INVALID');
  // Windows' genuine temp root may have an 8.3 spelling. Resolve that real
  // directory once, then bind its identity; never follow a symlinked root.
  const root = await fs.realpath(requestedRoot), canonicalRoot = await fs.lstat(root);
  if (!canonicalRoot.isDirectory() || canonicalRoot.isSymbolicLink()
    || canonicalRoot.dev !== rootStat.dev || canonicalRoot.ino !== rootStat.ino) fail('READER_SCOPE_INVALID');
  const cache = path.join(root, '.cache'), cacheStat = await optionalStat(cache);
  if (cacheStat && (!cacheStat.isDirectory() || cacheStat.isSymbolicLink() || await fs.realpath(cache) !== cache)) fail('READER_SCOPE_INVALID');
  const request = await readFixed(root, DMI_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH);
  if (!request) {
    if (await optionalStat(path.join(root, DMI_LEGACY_CURRENT_ORIGINAL_PATH))) fail('OUTPUT_WITHOUT_REQUESTS');
    if (required) fail('REQUESTS_REQUIRED');
    return null;
  }
  if (!SHA.test(expected?.requestsSha256 ?? '') || request.sha256 !== expected.requestsSha256) fail('REQUESTS_HASH_MISMATCH');
  const index = validateRequests(request.value, parts, expected);
  if (!index.native.size) {
    if (await optionalStat(path.join(root, DMI_LEGACY_CURRENT_ORIGINAL_PATH))) fail('EMPTY_REQUESTS_NOT_DECODED');
    return null;
  }
  const output = await readFixed(root, DMI_LEGACY_CURRENT_ORIGINAL_PATH);
  if (!output) fail('ORIGINALS_REQUIRED');
  if (!sameStat(request.before, await fs.lstat(request.file, { bigint: true }))
    || !sameStat(output.before, await fs.lstat(output.file, { bigint: true }))) fail('FILE_CHANGED');
  const afterRoot = await fs.lstat(root), afterCache = await optionalStat(cache);
  if (!afterRoot.isDirectory() || afterRoot.isSymbolicLink() || afterRoot.dev !== rootStat.dev || afterRoot.ino !== rootStat.ino
    || !afterCache?.isDirectory() || afterCache.isSymbolicLink()
    || afterCache.dev !== cacheStat?.dev || afterCache.ino !== cacheStat?.ino) fail('READER_SCOPE_CHANGED');
  return verifyDmiLegacyCurrentOriginalReconstruction({ requests: request.value,
    requestsSha256: request.sha256, reconstruction: output.value, parts, expected });
}
