// PRIVATE CALLER-ONLY PROTOTYPE. No installer, CLI, metadata transition or
// model authority is introduced here. The unchanged current-family origin
// reader remains the sole origin issuer. A JSON context is only a locator.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';
import { createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime,
  validateProtectedPrivateRuntimePointer } from './protected-private-production-runtime.mjs';
import { createProtectedRavScoreCheckpointRequester, restoreProtectedRavScoreContinuationCheckpoint }
  from './protected-ravscore-continuation-checkpoint.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { privateRuntimeContractHashes } from './private-production-runtime-workflow.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';
import { readEstablishedNativeCurrentOrigin } from './lib/established-native-current-origin.mjs';
import { createWeatherStateEpochCaptureStorage, saveWeatherStateEpochArchive,
  rehydrateLocalWeatherStateEpochArchive, assertVerifiedWeatherStateEpochArchive,
  WEATHER_STATE_EPOCH_PUBLIC_FILES } from './lib/weather-state-epoch-archive.mjs';
import { hydratePrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { inspectPrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { withoutCurrent } from './lib/private-dmi-recovery-record.mjs';
import { readDmiBulkDocument, writeDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAPABILITIES = new WeakMap(), FAILED_CLOSES = new Map();
const SHA = /^[a-f0-9]{64}$/, MB = 1024 * 1024;
export const CURRENT_FAMILY_COLD_START_CONTEXT_ENV = Object.freeze({
  path: 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH',
  sha256: 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256',
});
const SCALARS = Object.freeze(['wind-speed-10m', 'wind-dir-10m', 'wind-tail-u-10m',
  'wind-tail-v-10m', 'wind-tail-speed-10m', 'wind-tail-dir-10m', 'significant-wave-height',
  'dominant-wave-period', 'mean-wave-dir', 'sea-mean-deviation', 'water-temperature']);
const SCALAR_COMPONENTS = Object.freeze(['wind', 'windTail', 'wave', 'waterLevel', 'waterTemperature']);
const FIXED_CANDIDATE = path.join(ROOT, '.cache/dmi-candidate-progress.json');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b, code) => { if (!equal(a, b)) fail(code); };
const fail = code => { throw Object.assign(new Error('CURRENT_FAMILY_COLD_START_' + code),
  { code: 'CURRENT_FAMILY_COLD_START_' + code }); };
const need = (condition, code) => { if (!condition) fail(code); };
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const jsonBytes = value => Buffer.from(JSON.stringify(value) + '\n');
const digest = value => sha(jsonBytes(value));
function hour(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'TARGET');
  return value;
}
function inside(root, file) {
  const relative = path.relative(root, file);
  return relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
async function noLinks(file) {
  let at = path.parse(file).root;
  for (const segment of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); need(!(await fs.lstat(at)).isSymbolicLink(), 'SYMLINK');
  }
}
async function exactBytes(file, expected = null, maximum = 768 * MB) {
  need(path.isAbsolute(file) && !FAILED_CLOSES.has(file), 'FILE_PATH'); await noLinks(file);
  const before = await fs.lstat(file, { bigint: true });
  need(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(maximum), 'FILE_SIZE');
  const identity = stat => [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs];
  let handle, fd, owned, bytes, first;
  try {
    handle = await fs.open(file, 'r'); fd = handle.fd; owned = ownFileDescriptorIdentity(fd);
    same(identity(await handle.stat({ bigint: true })), identity(before), 'FILE_CHANGED');
    bytes = await handle.readFile(); need(bytes.length <= maximum && BigInt(bytes.length) === before.size, 'FILE_SIZE');
    same(identity(await handle.stat({ bigint: true })), identity(before), 'FILE_CHANGED');
    same(identity(await fs.lstat(file, { bigint: true })), identity(before), 'FILE_CHANGED');
    if (expected) same({ bytes: bytes.length, sha256: sha(bytes) },
      { bytes: expected.bytes, sha256: expected.sha256 }, 'FILE_IDENTITY');
  } catch (error) { first = error; }
  if (handle) {
    try { await handle.close(); } catch (error) { first ??= error; }
    if (!await ownedFileDescriptorClosed(fd, owned)) {
      FAILED_CLOSES.set(file, handle); first ??= new Error('CURRENT_FAMILY_COLD_START_CLOSE_UNPROVED');
    }
  }
  if (first) throw first; return bytes;
}
async function writeNew(file, bytes) {
  await noLinks(path.dirname(file));
  const handle = await fs.open(file, 'wx', 0o600), fd = handle.fd, owned = ownFileDescriptorIdentity(handle.fd);
  let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (!await ownedFileDescriptorClosed(fd, owned)) {
    FAILED_CLOSES.set(file, handle); first ??= new Error('CURRENT_FAMILY_COLD_START_CLOSE_UNPROVED');
  }
  if (first) throw first;
  same(await exactBytes(file), bytes, 'WRITE_READBACK');
}
async function sourceTuple() {
  return { integrated: ravScoreModelBinding().modelBundleSha256,
    candidate: candidateBinding().modelBundleSha256,
    contracts: await privateRuntimeContractHashes() };
}
async function currentRows(clients, checkpointRequest) {
  const read = async (request, key) => {
    const rows = await request(`?document_key=eq.${key}&select=document_key,payload,version&limit=2`, {}, 'read');
    need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
      && Number.isSafeInteger(Number(rows[0].version)) && Number(rows[0].version) > 0, 'CURRENT_ROWS');
    return { ...rows[0], version: Number(rows[0].version) };
  };
  const pointer = await read(clients.documentRequest, 'ravscore-private-production-runtime-pointer');
  validateProtectedPrivateRuntimePointer(pointer.payload, { allowHistoricalCurrentModelBinding: true });
  return { pointer, checkpoint: await read(checkpointRequest, 'ravscore-continuation-checkpoint') };
}
function objectsOf(descriptor) {
  return descriptor.objects ?? [{ index: 0, objectPath: descriptor.objectPath,
    objectBytes: descriptor.objectBytes, objectSha256: descriptor.objectSha256 }];
}
function rowIdentity(rows) {
  return { pointer: rows.pointer, checkpoint: { document_key: rows.checkpoint.document_key,
    version: rows.checkpoint.version, generationSha256: rows.checkpoint.payload.generationSha256,
    payloadSha256: digest(rows.checkpoint.payload) } };
}
async function assertActualPublicManifest(publicRoot, description) {
  const local = await exactBytes(path.join(publicRoot, 'manifest.json'), null, MB);
  const value = JSON.parse(local);
  need(value.datasetId === description.datasetId && value.productionReferenceAt === description.productionReferenceAt,
    'PUBLIC_IDENTITY_CHANGED');
  same(value.ravScoreModelBinding, description.modelBinding, 'PUBLIC_BINDING_CHANGED');
  const response = await fetch('https://ravradar.dk/data/live/manifest.json', {
    redirect: 'error', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20000) });
  need(response.status === 200 && !response.redirected && response.body?.getReader, 'PUBLIC_READ');
  const reader = response.body.getReader(), chunks = []; let size = 0, first;
  try {
    for (;;) {
      const row = await reader.read(); if (row.done) break;
      size += row.value.byteLength; need(size <= MB, 'PUBLIC_SIZE'); chunks.push(Buffer.from(row.value));
    }
  } catch (error) { first = error; }
  finally {
    if (first) { try { await reader.cancel(); } catch { /* Keep first failure. */ } }
    reader.releaseLock();
  }
  if (first) throw first;
  same(Buffer.concat(chunks, size), local, 'ACTUAL_PUBLIC_CHANGED');
}
async function authenticate({ workRoot, publicRoot, expectedRows = null, expectedIdentity = null,
  expectedTuple = null, expectedRegistry = null }) {
  const clients = createProtectedPrivateRuntimeClients(), checkpointRequest = createProtectedRavScoreCheckpointRequester();
  const tuple = await sourceTuple(); if (expectedTuple) same(tuple, expectedTuple, 'SOURCE_CHANGED');
  const registryBytes = await exactBytes(path.join(ROOT, 'data/live/coastal-parts-v2.json'), null, 16 * MB);
  const registry = JSON.parse(registryBytes), registrySha256 = 'sha256:' + sha(registryBytes);
  need(registry.zoneCount === 210 && registry.partCount === 673, 'REGISTRY');
  if (expectedRegistry) same(registry, expectedRegistry, 'REGISTRY_CHANGED');
  const rows = await currentRows(clients, checkpointRequest);
  if (expectedRows) same(rows, expectedRows, 'CURRENT_CHANGED');
  if (expectedIdentity) same(rowIdentity(rows), expectedIdentity, 'CURRENT_CHANGED');
  const descriptor = rows.pointer.payload.current;
  need(descriptor.modelBinding.modelBundleSha256 === tuple.integrated
    && rows.checkpoint.payload.modelBinding.modelBundleSha256 === tuple.integrated
    && rows.checkpoint.payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256 === tuple.candidate,
  'NOT_CURRENT_FAMILY');
  const description = await describeCurrentProtectedPrivateProductionRuntime({ request: clients.documentRequest });
  await assertActualPublicManifest(publicRoot, description);
  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT, bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  need(path.isAbsolute(privateRoot ?? '') && path.isAbsolute(bundlePath ?? '')
    && path.dirname(bundlePath) === privateRoot, 'NORMAL_B_PATHS');
  const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot: ROOT,
    expected: { modelBinding: description.modelBinding, contractHashes: description.contractHashes,
      datasetId: description.datasetId, productionReferenceAt: description.productionReferenceAt,
      generatedAt: description.generatedAt, bundleContentSha256: description.bundleContentSha256 } });
  const payload = path.join(bundlePath, 'payload'), conditionsPath = path.join(payload, 'data/live/conditions.json');
  const conditionFile = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  need(conditionFile, 'B_CONDITIONS');
  const conditionBytes = await exactBytes(conditionsPath, conditionFile, 256 * MB), compact = JSON.parse(conditionBytes);
  same(await exactBytes(path.join(ROOT, 'data/live/conditions.json'), conditionFile, 256 * MB), conditionBytes, 'WORKING_B_CHANGED');
  const origin = await readEstablishedNativeCurrentOrigin(registry); need(origin, 'NORMAL_ORIGIN_UNAVAILABLE');
  const derivedPath = path.join(workRoot, 'b-derived-S-' + crypto.randomUUID() + '.json');
  // The ordinary protected-S reader deliberately accepts only this dedicated
  // .cache suffix; give each immutable authentication pass its own owned root.
  const protectedPath = path.join(workRoot, 'protected-S-' + crypto.randomUUID(),
    '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  await saveRavScoreContinuationCheckpoint({ sourcePath: conditionsPath, checkpointPath: derivedPath, repositoryRoot: ROOT });
  await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: protectedPath,
    targetReference: description.productionReferenceAt, request: checkpointRequest });
  const checkpointBytes = await exactBytes(derivedPath, null, 16 * MB), checkpoint = JSON.parse(checkpointBytes);
  same(checkpoint, JSON.parse(await exactBytes(protectedPath, null, 16 * MB)), 'NORMAL_B_S_PARITY');
  same(checkpoint, rows.checkpoint.payload, 'PROTECTED_S_CHANGED');
  const publicPack = verified.files.find(row => row.relativePath === '.cache/public-hour-delivery.pack');
  need(publicPack, 'B_PUBLIC_PACK');
  await inspectPrivatePublicHourDeliveryPack({ packPath: path.join(payload, publicPack.relativePath), conditions: compact });
  same(await currentRows(clients, checkpointRequest), rows, 'CURRENT_CHANGED');
  const originalFiles = [{ role: 'checkpoint', relativePath: 'original-S.json', sourcePath: derivedPath },
    ...WEATHER_STATE_EPOCH_PUBLIC_FILES.map(relativePath => ({ role: 'public-snapshot', relativePath,
      sourcePath: path.join(publicRoot, relativePath) }))];
  return { clients, checkpointRequest, rows, tuple, registry, registrySha256, descriptor, origin, payload, verified,
    snapshot: { originalConditions: hydratePrivateConditionsHourly(compact), originalCheckpointPayload: checkpoint,
      originalDescription: description, checkpointVersion: rows.checkpoint.version,
      originalPointerRow: rows.pointer, originalCheckpointRow: rows.checkpoint,
      originalFileDigests: verified.files.map(({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 })),
      publicPackReference: { archivedWithinOriginalBundle: true, relativePath: publicPack.relativePath,
        fileSha256: publicPack.sha256, bytes: publicPack.bytes, marker: compact.publicHourDelivery }, files: originalFiles } };
}
function scalarBulk(document) {
  need(plain(document) && plain(document.zones), 'BULK_DOCUMENT');
  const zones = Object.fromEntries(Object.entries(document.zones).map(([zoneId, zone]) => {
    need(plain(zone) && plain(zone.hourly), 'BULK_ZONE');
    const hourly = Object.fromEntries(Object.entries(zone.hourly).map(([time, row]) => {
      need(plain(row), 'BULK_ROW');
      const selected = Object.fromEntries(['time', ...SCALARS].filter(key => Object.hasOwn(row, key))
        .map(key => [key, structuredClone(row[key])]));
      selected.sources = Object.fromEntries(SCALAR_COMPONENTS.filter(key => Object.hasOwn(row.sources ?? {}, key))
        .map(key => [key, structuredClone(row.sources[key])]));
      return [time, selected];
    }));
    const selected = { hourly };
    for (const key of ['point', 'name', 'lon', 'lat', 'entityId', 'parentZoneId', 'entityType',
      'samplingContext', 'samplingPoint']) if (Object.hasOwn(zone, key)) selected[key] = structuredClone(zone[key]);
    for (const container of ['gridPoints', 'collections']) if (plain(zone[container])) {
      selected[container] = Object.fromEntries(SCALARS.filter(key => Object.hasOwn(zone[container], key))
        .map(key => [key, structuredClone(zone[container][key])]));
    }
    return [zoneId, selected];
  }));
  const result = { zones };
  for (const key of ['schemaVersion', 'provider', 'generatedAt', 'zoneRegistrySignature', 'sourceUpdatedAt',
    'method', 'hours', 'timeStrideHours', 'spatialProvenanceVersion', 'privateReplayRetentionHours',
    'currentVectorSemanticsVersion', 'currentVectorSelection', 'currentPreferredDistanceKm', 'currentMaxDistanceKm'])
    if (Object.hasOwn(document, key)) result[key] = structuredClone(document[key]);
  return result;
}
async function acquisitions(state, workRoot) {
  const descriptor = state.verified.files.find(row => row.relativePath === 'data/live/dmi-bulk-cache.json');
  need(descriptor, 'B_BULK'); const file = path.join(state.payload, descriptor.relativePath);
  await exactBytes(file, descriptor, 256 * MB);
  const document = scalarBulk(await readDmiBulkDocument(file));
  await exactBytes(file, descriptor, 256 * MB);
  const rows = {}, seedPath = path.join(workRoot, 'acquisition-output-seed.json'), seedBytes = jsonBytes(document);
  await writeNew(seedPath, seedBytes);
  for (const [role, name] of Object.entries({
    deployedFallbackPath: 'acquisition-fallback.json', publishedBaselinePath: 'acquisition-published-baseline.json' })) {
    const destination = path.join(workRoot, name), bytes = jsonBytes(document);
    await writeNew(destination, bytes); rows[role] = { path: destination, bytes: bytes.length, sha256: sha(bytes) };
  }
  // Exactly one normal working-output exception. No caller chooses a path.
  // B (including its whole component pack) is already durably archived above.
  // Before replacing the normal installed working copy, identify its exact
  // original packed bytes or require its authentic absence, and retain them.
  const original = await originalFixedCandidate(state);
  const before = await fs.lstat(FIXED_CANDIDATE).catch(error => {
    if (error.code === 'ENOENT') return null; throw error;
  });
  let predecessor = null;
  if (original !== null) {
    need(before !== null, 'ORIGINAL_CANDIDATE_MISSING');
    const bytes = await exactBytes(FIXED_CANDIDATE, original.descriptor, 256 * MB);
    same(bytes, original.bytes, 'ORIGINAL_CANDIDATE_CHANGED');
    const preservedPath = path.join(workRoot, 'original-working-candidate.json');
    await writeNew(preservedPath, bytes);
    predecessor = { path: preservedPath, ...original.descriptor, packSha256: original.packSha256 };
  } else need(before === null, 'UNOWNED_FIXED_CANDIDATE');
  await noLinks(path.dirname(FIXED_CANDIDATE));
  need(await fs.lstat(FIXED_CANDIDATE + '.tmp').then(() => false, error => {
    if (error.code === 'ENOENT') return true; throw error;
  }), 'CANDIDATE_STAGE_COLLISION');
  if (predecessor) await exactBytes(FIXED_CANDIDATE, predecessor, 256 * MB);
  else need(await fs.lstat(FIXED_CANDIDATE).then(() => false, error => {
    if (error.code === 'ENOENT') return true; throw error;
  }), 'UNOWNED_FIXED_CANDIDATE');
  await writeDmiBulkDocument(FIXED_CANDIDATE, document);
  same(await readDmiBulkDocument(FIXED_CANDIDATE), document, 'CANDIDATE_SEED_READBACK');
  const installed = await exactBytes(FIXED_CANDIDATE, null, 256 * MB);
  rows.outputPath = { path: FIXED_CANDIDATE, bytes: installed.length, sha256: sha(installed) };
  return { rows, predecessor, outputSeed: { path: seedPath, bytes: seedBytes.length, sha256: sha(seedBytes) } };
}
// Same bounded v1 pack header used by the ordinary protected-quick caller.
// This selects preservation identity only, NEVER current provenance/admission.
// The whole pack is independently authenticated by the unchanged normal B
// verifier, and its original bytes stay inside the generic immutable archive.
async function originalFixedCandidate(state) {
  const descriptor = state.verified.files.find(row => row.relativePath === '.cache/weather-component-inputs.pack');
  if (!descriptor) return null;
  const bytes = await exactBytes(path.join(state.payload, descriptor.relativePath), descriptor, 768 * MB);
  const magic = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
  need(bytes.subarray(0, magic.length).equals(magic) && bytes.length >= magic.length + 4, 'ORIGINAL_PACK_FORMAT');
  const size = bytes.readUInt32BE(magic.length);
  need(size >= 2 && size <= 32 * MB && magic.length + 4 + size <= bytes.length, 'ORIGINAL_PACK_HEADER');
  const manifest = JSON.parse(bytes.subarray(magic.length + 4, magic.length + 4 + size));
  need(manifest.kind === 'PRIVATE_WEATHER_COMPONENT_PACK' && manifest.schemaVersion === 1
    && Array.isArray(manifest.files) && manifest.files.length <= 65536, 'ORIGINAL_PACK_HEADER');
  let at = magic.length + 4 + size, selected = null; const paths = new Set();
  for (const row of manifest.files) {
    need(typeof row.relativePath === 'string' && !paths.has(row.relativePath)
      && Number.isSafeInteger(row.bytes) && row.bytes > 0 && SHA.test(row.sha256 ?? '')
      && at + row.bytes <= bytes.length, 'ORIGINAL_PACK_ENTRY');
    paths.add(row.relativePath);
    if (row.relativePath === '.cache/dmi-candidate-progress.json') {
      need(row.bytes <= 256 * MB, 'ORIGINAL_CANDIDATE_SIZE');
      const actual = Buffer.from(bytes.subarray(at, at + row.bytes));
      need(sha(actual) === row.sha256, 'ORIGINAL_CANDIDATE_HASH');
      selected = { descriptor: { bytes: row.bytes, sha256: row.sha256 }, bytes: actual,
        packSha256: descriptor.sha256 };
    }
    at += row.bytes;
  }
  need(at === bytes.length, 'ORIGINAL_PACK_SIZE'); return selected;
}
function mint(state, archive, context) {
  const archived = assertVerifiedWeatherStateEpochArchive(archive);
  same(archived.originalDescription, state.snapshot.originalDescription, 'ARCHIVED_SOURCE');
  same(archived.originalCheckpointPayload, state.snapshot.originalCheckpointPayload, 'ARCHIVED_S');
  same(archived.originalConditions, state.snapshot.originalConditions, 'ARCHIVED_B');
  const capability = Object.freeze({}); CAPABILITIES.set(capability, { state, archive, archived, context });
  return capability;
}
export async function prepareCurrentFamilyColdStart({ workRoot, publicRoot, targetReferenceAt } = {}) {
  targetReferenceAt = hour(targetReferenceAt);
  need(path.isAbsolute(workRoot ?? '') && path.isAbsolute(publicRoot ?? ''), 'WORK_PATHS');
  workRoot = path.resolve(workRoot); publicRoot = path.resolve(publicRoot);
  need(workRoot !== ROOT && !inside(ROOT, workRoot) && publicRoot !== ROOT && !inside(ROOT, publicRoot)
    && workRoot !== publicRoot && !inside(workRoot, publicRoot) && !inside(publicRoot, workRoot), 'WORK_PATHS');
  await noLinks(path.dirname(workRoot)); await noLinks(publicRoot);
  await fs.mkdir(workRoot, { mode: 0o700 });
  const state = await authenticate({ workRoot, publicRoot });
  need(Date.parse(targetReferenceAt) > Date.parse(state.descriptor.productionReferenceAt), 'TARGET_NOT_NEWER');
  const archiveRoot = path.join(workRoot, 'archive'), objects = objectsOf(state.descriptor);
  const capture = await createWeatherStateEpochCaptureStorage({ storage: state.clients.storage, captureRoot: archiveRoot, objects });
  for (const object of objects) await capture.storage.download(object.objectPath);
  const verifyOriginalSnapshot = async ({ captureFiles, archivedFiles }) => {
    same(captureFiles.map(({ index, objectPath, objectBytes, objectSha256 }) => ({ index, objectPath, objectBytes, objectSha256 })),
      objects, 'CAPTURE_OBJECTS');
    const fresh = await authenticate({ workRoot, publicRoot, expectedRows: state.rows,
      expectedTuple: state.tuple, expectedRegistry: state.registry });
    return { ...fresh.snapshot, files: archivedFiles ?? state.snapshot.files };
  };
  const archive = await saveWeatherStateEpochArchive({ capture: capture.capture, storage: state.clients.storage,
    targetReferenceAt, verifyOriginalSnapshot });
  const archived = assertVerifiedWeatherStateEpochArchive(archive), acquired = await acquisitions(state, workRoot);
  const context = { schemaVersion: 1, kind: 'CURRENT_FAMILY_CALLER_ONLY_COLD_START_LOCATOR',
    targetReferenceAt, workRoot, publicRoot, archiveRoot, archiveId: archived.archiveId,
    archiveCatalogSha256: archived.archiveCatalogSha256, originalBoundary: rowIdentity(state.rows),
    sourceTuple: state.tuple, registrySha256: state.registrySha256,
    acquisition: acquired.rows, outputSeed: acquired.outputSeed, fixedPredecessor: acquired.predecessor };
  const contextPath = path.join(workRoot, 'context.json'), bytes = jsonBytes(context);
  await writeNew(contextPath, bytes);
  return Object.freeze({ capability: mint(state, archive, context), contextPath, contextSha256: sha(bytes) });
}
export async function loadCurrentFamilyColdStartForTarget({ contextPath, contextSha256, targetReferenceAt } = {}) {
  hour(targetReferenceAt); need(path.isAbsolute(contextPath ?? '') && SHA.test(contextSha256 ?? ''), 'CONTEXT_ARGUMENTS');
  const bytes = await exactBytes(contextPath, null, 4 * MB); need(sha(bytes) === contextSha256, 'CONTEXT_SHA');
  const context = JSON.parse(bytes);
  need(context.schemaVersion === 1 && context.kind === 'CURRENT_FAMILY_CALLER_ONLY_COLD_START_LOCATOR'
    && context.targetReferenceAt === targetReferenceAt && path.dirname(contextPath) === context.workRoot
    && context.archiveRoot === path.join(context.workRoot, 'archive')
    && context.workRoot !== ROOT && !inside(ROOT, context.workRoot), 'CONTEXT_IDENTITY');
  const state = await authenticate({ workRoot: context.workRoot, publicRoot: context.publicRoot,
    expectedIdentity: context.originalBoundary, expectedTuple: context.sourceTuple });
  need(state.registrySha256 === context.registrySha256, 'REGISTRY_CHANGED');
  const verifyOriginalSnapshot = async ({ captureFiles, archivedFiles }) => {
    same(captureFiles.map(({ index, objectPath, objectBytes, objectSha256 }) => ({ index, objectPath, objectBytes, objectSha256 })),
      objectsOf(state.descriptor), 'CAPTURE_OBJECTS');
    const fresh = await authenticate({ workRoot: context.workRoot, publicRoot: context.publicRoot,
      expectedRows: state.rows, expectedTuple: state.tuple, expectedRegistry: state.registry });
    return { ...fresh.snapshot, files: archivedFiles };
  };
  const archive = await rehydrateLocalWeatherStateEpochArchive({ archiveRoot: context.archiveRoot,
    archiveId: context.archiveId, archiveCatalogSha256: context.archiveCatalogSha256,
    targetReferenceAt, verifyOriginalSnapshot });
  const originalBulk = scalarBulk(await readDmiBulkDocument(path.join(state.payload, 'data/live/dmi-bulk-cache.json')));
  need(context.outputSeed?.path === path.join(context.workRoot, 'acquisition-output-seed.json'), 'ACQUISITION_PATH');
  same(await exactBytes(context.outputSeed.path, context.outputSeed, 256 * MB), jsonBytes(originalBulk), 'ACQUISITION_CHANGED');
  const original = await originalFixedCandidate(state);
  if (original === null) need(context.fixedPredecessor === null, 'ORIGINAL_CANDIDATE_CHANGED');
  else {
    const row = context.fixedPredecessor;
    need(row?.path === path.join(context.workRoot, 'original-working-candidate.json')
      && row.packSha256 === original.packSha256, 'ORIGINAL_CANDIDATE_CHANGED');
    same(await exactBytes(row.path, original.descriptor, 256 * MB), original.bytes, 'ORIGINAL_CANDIDATE_CHANGED');
  }
  for (const [role, name] of Object.entries({ outputPath: 'acquisition-output.json',
    deployedFallbackPath: 'acquisition-fallback.json', publishedBaselinePath: 'acquisition-published-baseline.json' })) {
    const row = context.acquisition?.[role];
    need(row?.path === (role === 'outputPath' ? FIXED_CANDIDATE : path.join(context.workRoot, name)), 'ACQUISITION_PATH');
    if (role === 'outputPath') {
      // The normal producer owns this mutable output after the immutable seed
      // was supplied. Its new rows still need the unchanged native/proof gates;
      // this capability never authenticates or admits those numeric rows.
      await noLinks(row.path); const info = await fs.lstat(row.path);
      need(info.isFile() && info.nlink === 1 && info.size >= 2 && info.size <= 256 * MB, 'ACQUISITION_OUTPUT');
    } else same(await exactBytes(row.path, row, 256 * MB), jsonBytes(originalBulk), 'ACQUISITION_CHANGED');
  }
  return mint(state, archive, context);
}
function scoped(capability, { registry, targetReferenceAt } = {}) {
  const value = CAPABILITIES.get(capability); need(value, 'CAPABILITY');
  same(registry, value.state.registry, 'REGISTRY_CHANGED');
  need(targetReferenceAt === value.context.targetReferenceAt, 'TARGET_CHANGED'); return value;
}
export function currentFamilyColdStartScoreInputs(capability, scope) {
  const value = scoped(capability, scope);
  return Object.freeze({ previousCoastalParts: null, previousCandidateGRollbackRuntime: null,
    pointStateInjections: Object.freeze({}), checkpointStates: Object.freeze({}),
    checkpointCandidateGRollbackStates: Object.freeze({}), deployedBulkCache: null,
    historicalDmiBulkCache: null, persistedDmiPartRows: new Map(), previousCurrentSourceDomainTransitions: null,
    candidateGBootstrapMode: 'integrated-state-less-recovery', candidateGSourceValidated: false,
    stateLessRecovery: true, establishedNativeCurrentOrigin: value.state.origin });
}
export function currentFamilyColdStartScalarRecord(capability, record) {
  need(CAPABILITIES.has(capability), 'CAPABILITY'); const selected = withoutCurrent(record);
  if (selected) selected.hourly = selected.hourly.map(row => {
    const { currentStateOnlyHold: _hold, currentCoastNormalSpeedMps: _normal, ...rest } = row; return rest;
  });
  return selected;
}
export function currentFamilyColdStartAcquisitionChoices(capability) {
  const value = CAPABILITIES.get(capability); need(value, 'CAPABILITY');
  return Object.freeze(Object.fromEntries(Object.entries(value.context.acquisition).map(([role, row]) => [role, row.path])));
}
export function currentFamilyColdStartBoundary(capability, scope) {
  const value = scoped(capability, scope);
  return Object.freeze({ schemaVersion: 1, kind: 'ARCHIVE_BACKED_CALLER_ONLY_CURRENT_COLD_BOUNDARY',
    selection: 'MEASURED_COLD_WITHOUT_OLD_CURRENT_STATE', targetReferenceAt: value.context.targetReferenceAt,
    archiveId: value.archived.archiveId, archiveCatalogSha256: value.archived.archiveCatalogSha256,
    bundleContentSha256: value.state.descriptor.bundleContentSha256,
    generationSha256: value.state.rows.checkpoint.payload.generationSha256,
    pointerVersion: value.state.rows.pointer.version, checkpointVersion: value.state.rows.checkpoint.version,
    registrySha256: value.context.registrySha256, sourceTuple: structuredClone(value.state.tuple) });
}
// Eviction scope only. This is NOT a committed-old-S retention assertion and
// grants no CURRENT admission. The normal caller must bind its complete input
// hashes separately. Python remeasures the actual catalog and old S bytes.
export function currentFamilyColdStartRawRetention(capability, scope) {
  const value = scoped(capability, scope), old = value.state.descriptor;
  const conditions = value.state.verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  return Object.freeze({ schemaVersion: 1, kind: 'ARCHIVE_ISOLATED_COLD_RAW_RETENTION',
    boundary: Object.freeze({ datasetId: old.datasetId, productionReferenceAt: old.productionReferenceAt,
      bundleContentSha256: old.bundleContentSha256,
      checkpointGenerationSha256: value.state.rows.checkpoint.payload.generationSha256,
      conditionsSha256: conditions.sha256 }),
    archive: Object.freeze({ archiveId: value.archived.archiveId,
      archiveCatalogSha256: value.archived.archiveCatalogSha256,
      catalogPath: path.join(value.context.archiveRoot, 'catalog.json.gz'),
      pointerVersion: value.state.rows.pointer.version, checkpointVersion: value.state.rows.checkpoint.version,
      targetReferenceAt: value.context.targetReferenceAt, registrySha256: value.context.registrySha256,
      selection: 'MEASURED_COLD_WITHOUT_OLD_CURRENT_STATE' }), captures: Object.freeze([]) });
}
