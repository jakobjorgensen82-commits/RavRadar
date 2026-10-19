// Once-only, provider-free restart from genuine, separately preserved originals.
// A context file is a locator, never an archive capability or numerical proof.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal } from 'node:util';
import { createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime,
  validateProtectedPrivateRuntimePointer } from './protected-private-production-runtime.mjs';
import { createProtectedRavScoreCheckpointRequester } from './protected-ravscore-continuation-checkpoint.mjs';
import { installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { withFrozenLastMileEnclosurePredecessorSource } from './check-last-mile-enclosure-predecessor-source.mjs';
import { requireLastMileEnclosureOutput, LAST_MILE_ENCLOSURE_BEFORE } from './lib/last-mile-enclosure-successor-source.mjs';
import { createWeatherStateEpochCaptureStorage, saveUnpairedWeatherRestartArchive,
  rehydrateLocalUnpairedWeatherRestartArchive, assertVerifiedUnpairedWeatherRestartArchive,
  WEATHER_STATE_EPOCH_PUBLIC_FILES } from './lib/weather-state-epoch-archive.mjs';
import { createArchivedWeatherRestartInputView } from './lib/archived-weather-restart-input-view.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MB = 1024 * 1024, SHA = /^[a-f0-9]{64}$/, retainedHandles = new Set();
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const plain = value => value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
const jsonBytes = value => Buffer.from(JSON.stringify(value) + '\n');
export const ARCHIVED_WEATHER_RESTART_CONTEXT_ENV = Object.freeze({
  path: 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH',
  sha256: 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
});
function fail(code) {
  const name = 'ARCHIVED_WEATHER_RESTART_' + code;
  throw Object.assign(new Error(name), { code: name });
}
function need(condition, code) { if (!condition) fail(code); }
function same(a, b, code) { need(equal(a, b), code); }
function exact(value, keys) { need(plain(value) && equal(Object.keys(value).sort(), [...keys].sort()), 'ARGUMENTS'); }
function hour(value) {
  need(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value, 'TARGET');
  return value;
}
function inside(root, child) {
  const relative = path.relative(root, child);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}
async function noLinks(file) {
  need(path.isAbsolute(file), 'PATH');
  let at = path.parse(file).root;
  for (const segment of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment);
    need(!(await fs.lstat(at)).isSymbolicLink(), 'SYMLINK');
  }
}
async function close(handle, descriptor, identity, first) {
  try { await handle.close(); } catch (error) { first ??= error; }
  if (await ownedFileDescriptorClosed(descriptor, identity)) retainedHandles.delete(handle);
  else first ??= new Error('ARCHIVED_WEATHER_RESTART_CLOSE_UNPROVED');
  if (first) throw first;
}
async function bytes(file, maximum = 256 * MB) {
  await noLinks(file);
  const before = await fs.lstat(file, { bigint: true });
  need(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= BigInt(maximum), 'FILE_SIZE');
  const identity = value => ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].map(key => value[key]);
  const handle = await fs.open(file, 'r'), descriptor = handle.fd, owned = ownFileDescriptorIdentity(descriptor);
  retainedHandles.add(handle); let first, result;
  try {
    const opened = await handle.stat({ bigint: true });
    same(identity(before).slice(0, -1), identity(opened).slice(0, -1), 'FILE_CHANGED');
    if (process.platform !== 'win32') same(identity(before), identity(opened), 'FILE_CHANGED');
    result = await handle.readFile();
    need(BigInt(result.length) === before.size && result.length <= maximum, 'FILE_SIZE');
    same(identity(await handle.stat({ bigint: true })), identity(opened), 'FILE_CHANGED');
    same(identity(await fs.lstat(file, { bigint: true })), identity(before), 'FILE_CHANGED');
  } catch (error) { first = error; }
  await close(handle, descriptor, owned, first); return result;
}
async function writeNew(file, value) {
  await noLinks(path.dirname(file));
  const handle = await fs.open(file, 'wx', 0o600), descriptor = handle.fd, owned = ownFileDescriptorIdentity(descriptor);
  retainedHandles.add(handle); let first;
  try { await handle.writeFile(value); await handle.sync(); } catch (error) { first = error; }
  await close(handle, descriptor, owned, first);
  same(await bytes(file, Math.max(value.length, MB)), value, 'WRITE_READBACK');
}
async function preserveOnce(file, value) {
  const exists = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (exists === null) await writeNew(file, value);
  else same(await bytes(file, Math.max(value.length, MB)), value, 'PRESERVED_ORIGINAL_CHANGED');
}
function privatePaths({ workRoot, publicRoot }) {
  need(path.isAbsolute(workRoot ?? '') && path.isAbsolute(publicRoot ?? ''), 'PRIVATE_PATH');
  for (const selected of [workRoot, publicRoot]) need(path.resolve(selected) === selected
    && selected !== path.parse(selected).root && selected !== ROOT && !inside(ROOT, selected), 'PRIVATE_PATH');
  need(workRoot !== publicRoot && !inside(workRoot, publicRoot) && !inside(publicRoot, workRoot), 'PRIVATE_PATH');
}
function normalBundlePaths() {
  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT;
  const bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  need(path.isAbsolute(privateRoot ?? '') && path.isAbsolute(bundlePath ?? '')
    && path.dirname(bundlePath) === privateRoot && privateRoot !== ROOT && !inside(ROOT, privateRoot), 'NORMAL_B_PATH');
  return { privateRoot, bundlePath };
}
async function liveRows() {
  const clients = createProtectedPrivateRuntimeClients();
  const checkpointRequest = createProtectedRavScoreCheckpointRequester();
  async function read(request, key) {
    const rows = await request('?document_key=eq.' + encodeURIComponent(key) + '&select=document_key,payload,version&limit=2', {}, 'read');
    need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
      && Number.isSafeInteger(Number(rows[0].version)) && Number(rows[0].version) > 0, 'REMOTE_ROW');
    return { ...rows[0], version: Number(rows[0].version) };
  }
  const pointer = await read(clients.documentRequest, 'ravscore-private-production-runtime-pointer');
  validateProtectedPrivateRuntimePointer(pointer.payload, { allowHistoricalCurrentModelBinding: true });
  const checkpoint = await read(checkpointRequest, 'ravscore-continuation-checkpoint');
  const d = pointer.payload.current;
  need(d.sourceHead === 'd8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7'
    && d.modelBinding.modelBundleSha256 === LAST_MILE_ENCLOSURE_BEFORE.I
    && d.contractHashes.continuationStateContractSha256 === LAST_MILE_ENCLOSURE_BEFORE.T
    && checkpoint.payload.modelBinding?.modelBundleSha256 === LAST_MILE_ENCLOSURE_BEFORE.I
    && checkpoint.payload.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256 === LAST_MILE_ENCLOSURE_BEFORE.C
    && Date.parse(hour(checkpoint.payload.productionReferenceAt)) < Date.parse(hour(d.productionReferenceAt)), 'FIXED_UNPAIRED_FAMILY');
  return { clients, checkpointRequest, pointer, checkpoint };
}
function boundary(state) {
  // Bind complete JSON payload values without duplicating the potentially
  // 16-MiB checkpoint in the bounded locator. JSONB member order is not data.
  const canonical = value => JSON.stringify(value, (_key, item) =>
    item !== null && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
  const row = value => ({ documentKey: value.document_key, version: value.version,
    payloadSha256: sha(Buffer.from(canonical(value.payload))) });
  return { pointer: row(state.pointer), checkpoint: row(state.checkpoint) };
}
// Pure identity summary only: possession of it never supplies archive authority.
export { boundary as summarizeArchivedWeatherRestartOriginalIdentity };
function objectsOf(descriptor) {
  return descriptor.objects ?? [{ index: 0, objectPath: descriptor.objectPath,
    objectBytes: descriptor.objectBytes, objectSha256: descriptor.objectSha256 }];
}
function expectation(description, targetReferenceAt) {
  return { ...Object.fromEntries(['modelBinding', 'contractHashes', 'datasetId', 'productionReferenceAt',
    'generatedAt', 'bundleContentSha256'].map(key => [key, description[key]])),
  targetReferenceAt, minimumReferenceAt: description.productionReferenceAt, minimumGeneratedAt: description.generatedAt };
}
async function actualPublicManifest(publicRoot) {
  const local = await bytes(path.join(publicRoot, 'manifest.json'), MB);
  const response = await fetch('https://ravradar.dk/data/live/manifest.json', { redirect: 'error',
    cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20000) });
  need(response.status === 200 && !response.redirected && response.body?.getReader, 'PUBLIC_READ');
  const reader = response.body.getReader(), parts = []; let total = 0, first;
  try {
    for (;;) {
      const row = await reader.read(); if (row.done) break;
      total += row.value.byteLength; need(total <= MB, 'PUBLIC_SIZE'); parts.push(Buffer.from(row.value));
    }
  } catch (error) { first = error; }
  finally {
    if (first) { try { await reader.cancel(); } catch { /* Preserve the first cause. */ } }
    reader.releaseLock();
  }
  if (first) throw first;
  same(Buffer.concat(parts, total), local, 'PUBLIC_CHANGED');
  return JSON.parse(local);
}
async function authenticate({ workRoot, publicRoot, targetReferenceAt, expectedBoundary = null }) {
  const state = await liveRows();
  if (expectedBoundary !== null) same(boundary(state), expectedBoundary, 'REMOTE_CHANGED');
  const description = await describeCurrentProtectedPrivateProductionRuntime({ request: state.clients.documentRequest });
  need(Date.parse(hour(targetReferenceAt)) > Date.parse(hour(description.productionReferenceAt)), 'TARGET_NOT_NEWER');
  const registryBytes = await bytes(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 16 * MB);
  const registry = JSON.parse(registryBytes);
  need(registry.zoneCount === 210 && registry.partCount === 673, 'REGISTRY');
  await actualPublicManifest(publicRoot);
  const { privateRoot, bundlePath } = normalBundlePaths();
  const verified = await withFrozenLastMileEnclosurePredecessorSource(async sourceRoot => {
    const load = relative => import(pathToFileURL(path.join(sourceRoot, relative)).href);
    const bundle = await load('scripts/private-production-runtime-bundle.mjs');
    const protectedS = await load('scripts/protected-ravscore-continuation-checkpoint.mjs');
    const original = await bundle.verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot: sourceRoot,
      expected: expectation(description, targetReferenceAt) });
    // Validate the ACTUAL older central S through its unchanged old normal
    // reader. Do not derive a replacement S from the rejected newer B.
    const checkpointPath = path.join(workRoot, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
    const restored = await protectedS.restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath,
      targetReference: state.checkpoint.payload.productionReferenceAt, request: state.checkpointRequest });
    need(restored.restored === true || restored.reason === 'protected-checkpoint-equivalent', 'OLD_S_VALIDATION');
    same(JSON.parse(await bytes(checkpointPath, 16 * MB)), state.checkpoint.payload, 'OLD_S_CHANGED');
    return original;
  });
  const conditionFile = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  need(conditionFile, 'B_CONDITIONS');
  const conditionBytes = await bytes(path.join(bundlePath, 'payload/data/live/conditions.json'));
  same({ bytes: conditionBytes.length, sha256: sha(conditionBytes) },
    { bytes: conditionFile.bytes, sha256: conditionFile.sha256 }, 'B_CONDITIONS_CHANGED');
  await preserveOnce(path.join(workRoot, 'original-S.json'), jsonBytes(state.checkpoint.payload));
  await preserveOnce(path.join(workRoot, 'registry.json'), registryBytes);
  same(boundary(await liveRows()), boundary(state), 'REMOTE_CHANGED');
  const files = [{ role: 'checkpoint', relativePath: 'original-S.json', sourcePath: path.join(workRoot, 'original-S.json') },
    { role: 'registry', relativePath: 'registry.json', sourcePath: path.join(workRoot, 'registry.json') },
    ...WEATHER_STATE_EPOCH_PUBLIC_FILES.map(relativePath => ({ role: 'public-snapshot', relativePath,
      sourcePath: path.join(publicRoot, relativePath) }))];
  return { ...state, registry, description, verified, snapshot: {
    originalConditions: JSON.parse(conditionBytes), originalDescription: description, registry,
    originalPointerRow: state.pointer, originalCheckpointRow: state.checkpoint,
    originalCheckpointPayload: state.checkpoint.payload, checkpointVersion: state.checkpoint.version,
    originalFileDigests: verified.files.map(({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 })), files } };
}
function verifier(context, expected) {
  return async ({ captureFiles, archivedFiles }) => {
    const state = await authenticate({ ...context, expectedBoundary: expected });
    same(captureFiles.map(({ index, objectPath, objectBytes, objectSha256 }) => ({ index, objectPath, objectBytes, objectSha256 })),
      objectsOf(state.pointer.payload.current), 'CAPTURE_CHANGED');
    return { ...state.snapshot, files: archivedFiles ?? state.snapshot.files };
  };
}
export async function prepareArchivedWeatherRestart(options) {
  requireLastMileEnclosureOutput();
  need(arguments.length === 1, 'ARGUMENTS'); exact(options, ['workRoot', 'publicRoot', 'targetReferenceAt']);
  const { workRoot, publicRoot, targetReferenceAt } = options;
  hour(targetReferenceAt); privatePaths(options);
  await noLinks(path.dirname(workRoot)); await noLinks(publicRoot);
  await fs.mkdir(workRoot, { mode: 0o700 }); // Exclusive new destination, never erase/reuse another attempt.
  const selected = await liveRows(), originalBoundary = boundary(selected);
  const descriptor = selected.pointer.payload.current;
  need(Date.parse(targetReferenceAt) > Date.parse(descriptor.productionReferenceAt), 'TARGET_NOT_NEWER');
  const { privateRoot, bundlePath } = normalBundlePaths();
  await noLinks(privateRoot);
  need(await fs.lstat(bundlePath).then(() => false, error => { if (error.code === 'ENOENT') return true; throw error; }), 'B_DESTINATION_EXISTS');
  const archiveRoot = path.join(workRoot, 'archive');
  const capture = await createWeatherStateEpochCaptureStorage({ storage: selected.clients.storage,
    captureRoot: archiveRoot, objects: objectsOf(descriptor) });
  await withFrozenLastMileEnclosurePredecessorSource(async sourceRoot => {
    const old = await import(pathToFileURL(path.join(sourceRoot, 'scripts/protected-private-production-runtime.mjs')).href);
    const result = await old.restoreProtectedPrivateProductionRuntime({ privateRoot, bundlePath, repositoryRoot: sourceRoot,
      expected: expectation(descriptor, targetReferenceAt), request: selected.clients.documentRequest, storage: capture.storage });
    need(result.restored === true && result.bundleContentSha256 === descriptor.bundleContentSha256
      && result.centralVersion === selected.pointer.version && result.rollbackSelected === false, 'ORIGINAL_RESTORE');
  });
  const context = { workRoot, publicRoot, targetReferenceAt };
  const archive = await saveUnpairedWeatherRestartArchive({ capture: capture.capture, storage: selected.clients.storage,
    targetReferenceAt, verifyOriginalSnapshot: verifier(context, originalBoundary) });
  const facts = assertVerifiedUnpairedWeatherRestartArchive(archive);
  // The archived old payload is now durable. Reuse the existing atomic normal
  // installer for the authentic weather/component inputs, not a new migration
  // or a numerical metadata rebind. The opaque input view subsequently denies
  // all old I/G states to the normal scorer before any state admission.
  await installRestoredPrivateRuntime({ restoredRoot: path.join(bundlePath, 'payload'), repositoryRoot: ROOT });
  const locator = { schemaVersion: 1, kind: 'ARCHIVED_WEATHER_RESTART_LOCATOR', ...context, archiveRoot,
    archiveId: facts.archiveId, archiveCatalogSha256: facts.archiveCatalogSha256, originalBoundary };
  const contextPath = path.join(workRoot, 'context.json'), contextBytes = jsonBytes(locator);
  await writeNew(contextPath, contextBytes);
  return Object.freeze({ archive, contextPath, contextSha256: sha(contextBytes) });
}
export async function loadArchivedWeatherRestartArchiveForTarget(options) {
  requireLastMileEnclosureOutput();
  need(arguments.length === 1, 'ARGUMENTS'); exact(options, ['contextPath', 'contextSha256', 'targetReferenceAt']);
  const { contextPath, contextSha256, targetReferenceAt } = options;
  hour(targetReferenceAt); need(path.isAbsolute(contextPath ?? '') && SHA.test(contextSha256 ?? ''), 'CONTEXT_ARGUMENTS');
  const raw = await bytes(contextPath, 4 * MB); need(sha(raw) === contextSha256, 'CONTEXT_SHA');
  const context = JSON.parse(raw);
  exact(context, ['schemaVersion', 'kind', 'workRoot', 'publicRoot', 'targetReferenceAt', 'archiveRoot',
    'archiveId', 'archiveCatalogSha256', 'originalBoundary']);
  need(context.schemaVersion === 1 && context.kind === 'ARCHIVED_WEATHER_RESTART_LOCATOR'
    && context.targetReferenceAt === targetReferenceAt && path.dirname(contextPath) === context.workRoot
    && context.archiveRoot === path.join(context.workRoot, 'archive')
    && SHA.test(context.archiveId ?? '') && SHA.test(context.archiveCatalogSha256 ?? ''), 'CONTEXT_IDENTITY');
  privatePaths(context);
  return rehydrateLocalUnpairedWeatherRestartArchive({ archiveRoot: context.archiveRoot,
    archiveId: context.archiveId, archiveCatalogSha256: context.archiveCatalogSha256, targetReferenceAt,
    verifyOriginalSnapshot: verifier({ workRoot: context.workRoot, publicRoot: context.publicRoot, targetReferenceAt },
      context.originalBoundary) });
}
export async function loadArchivedWeatherRestartInputViewForTarget(options) {
  need(arguments.length === 1, 'ARGUMENTS'); exact(options, ['registry', 'targetReferenceAt']);
  const contextPath = process.env[ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.path];
  const contextSha256 = process.env[ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.sha256];
  if (contextPath === undefined && contextSha256 === undefined) return null;
  requireLastMileEnclosureOutput();
  need(contextPath !== undefined && contextSha256 !== undefined && process.env.RAVRADAR_WEATHER_CACHE_ONLY === 'true', 'CONTEXT_ENV');
  const archive = await loadArchivedWeatherRestartArchiveForTarget({ contextPath, contextSha256,
    targetReferenceAt: options.targetReferenceAt });
  return createArchivedWeatherRestartInputView({ archive, registry: options.registry, targetReferenceAt: options.targetReferenceAt });
}
