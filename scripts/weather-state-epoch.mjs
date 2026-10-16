#!/usr/bin/env node
// Explicit one-off FRESH history epoch. Original B/S/public bytes are archived
// first; old decoder/progress/GCM and the fixed checkpoint route are not used.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify, isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withFrozenI71Source } from './check-native-identity-frozen-i71-source.mjs';
import { assertNativeIdentityBindingsFrozen, assertNativeIdentityOutputFrozen }
  from './lib/native-sampling-identity-successor-source.mjs';
import { selectNativeSamplingIdentityRecoveryPhase, verifyNativeSamplingIdentitySuccessorPlan }
  from './verify-native-sampling-identity-successor-plan.mjs';
import { verifyNativeSamplingIdentitySuccessorReadiness,
  verifyNativeSamplingIdentityInstalledMigrationMetadata } from './native-sampling-identity-successor-readiness.mjs';
import { createWeatherStateEpochCaptureStorage, saveWeatherStateEpochArchive,
  materializeWeatherStateEpochArchive, rehydrateLocalWeatherStateEpochArchive,
  assertVerifiedWeatherStateEpochArchive, WEATHER_STATE_EPOCH_PUBLIC_FILES }
  from './lib/weather-state-epoch-archive.mjs';
import { assertWeatherStateEpochCheckpointRequest } from './weather-state-epoch-budget.mjs';
import { createWeatherStateEpochInputView } from './lib/weather-state-epoch-input-view.mjs';
import { migrateOwnedI71NativeIdentityWorkingRuntime } from './migrate-post-cutover-private-runtime.mjs';
import { rebindNativeIdentityStagingWorkingCopy } from './lib/native-identity-staging-working-copy.mjs';
import { installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { installComponents, weatherComponentProgressCache } from './weather-component-progress-cache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const exec = promisify(execFile), SHA = /^[a-f0-9]{64}$/;
const OLD_DATASET = 'rr-20261013181135-210';
export const WEATHER_STATE_EPOCH_MAX_START_AGE_MINUTES = 90;
export const WEATHER_STATE_EPOCH_STAGES = Object.freeze(['prepare', 'verify-230-plan',
  'verify-230-installed', 'verify-binding-plan', 'verify-binding-installed', 'install', 'verify']);
const stages = new WeakMap();
const PHASES = new Set(['SOURCE', 'LOCATIONS', 'ORIGINALS', 'PUBLIC', 'ARCHIVE', 'DATABASE',
  'METADATA_BASELINE', 'WORKING_MIGRATION', 'STAGING', 'NORMAL_INSTALL', 'CAPTURE_BASE', 'CONTEXT_READ', 'INSTALL']);
const CODES = new Set(['ARGUMENTS_INVALID', 'EPOCH_NOT_ENABLED', 'TARGET_INVALID', 'TARGET_START_TOO_OLD',
  'TARGET_FROM_FUTURE', 'TARGET_NOT_NEWER', 'SOURCE_HEAD_MISMATCH', 'OLD_GENERATION_REQUIRED',
  'ORIGINAL_POINTER_CHANGED', 'ORIGINAL_CHECKPOINT_CHANGED', 'PUBLIC_MANIFEST_CHANGED', 'ARCHIVE_REQUIRED',
  'CHECKPOINT_RESTORE_REQUIRED', 'WORKING_CHANGED', 'REGISTRY_CHANGED', 'STAGING_CHANGED', 'CONTEXT_INVALID', 'VIEW_CHANGED', 'PUBLIC_READ_FAILED']);
const ARCHIVE_CODES = new Set(['ANONYMOUS_ACCESS', 'ARCHIVE_ID_COLLISION', 'CAPTURE_CLOSED', 'CAPTURE_INCOMPLETE',
  'CAPTURE_INVALID', 'CAPTURE_CHANGED', 'CAPTURE_READBACK', 'CATALOG_CHANGED', 'CATALOG_CHUNK_INVALID',
  'CATALOG_DIGEST_MISMATCH', 'CATALOG_FILE_INVALID', 'CATALOG_IDENTITY_MISMATCH', 'CATALOG_INVALID',
  'CATALOG_INVENTORY_INVALID', 'CATALOG_OBJECT_MISMATCH', 'CATALOG_SIZE_LIMIT', 'DUPLICATE_SOURCE_DOWNLOAD',
  'FILE_INVALID', 'HANDLE_INVALID', 'INPUT_CHANGED', 'LOCAL_B_CHANGED', 'LOCAL_COPY_MISMATCH',
  'LOCAL_ORIGINAL_CHANGED', 'LOCAL_TRANSPORT_CHANGED', 'MATERIALIZE_DEADLINE', 'OBJECTS_INVALID',
  'ORIGINAL_DIGEST_INVALID', 'ORIGINAL_IDENTITY_MISMATCH', 'ORIGINALS_CHANGED', 'PATH_INVALID',
  'PRIVATE_ROOT_INVALID', 'PUBLIC_IDENTITY_MISMATCH', 'PUBLIC_MANIFEST_MISMATCH', 'PUBLIC_PACK_INVALID',
  'PUBLIC_PACK_NOT_IN_B', 'PUBLIC_PACK_SOURCE_MISMATCH', 'PUBLIC_PACK_MODEL_MISMATCH', 'PUBLIC_PACK_MARKER_MISMATCH',
  'PUBLIC_SNAPSHOT_INCOMPLETE', 'REHYDRATE_INVALID', 'REHYDRATE_ORIGINALS_MISMATCH', 'SNAPSHOT_FILE_INVALID',
  'SNAPSHOT_INVALID', 'SOURCE_FILE_CHANGED', 'SOURCE_OBJECT_MISMATCH', 'STORAGE_INVALID',
  'STORAGE_READBACK_MISMATCH', 'STORED_OBJECT_INVALID', 'TARGET_NOT_NEWER', 'TIME_INVALID', 'TOTAL_SIZE_LIMIT',
  'UNSELECTED_OBJECT', 'CHECKPOINT_BYTES_MISMATCH', 'CHECKPOINT_ROW_MISMATCH', 'POINTER_DESCRIPTION_MISMATCH', 'POINTER_OBJECTS_MISMATCH']);
function requireCode(condition, code) {
  assert(CODES.has(code));
  if (!condition) throw Object.assign(new Error('WEATHER_STATE_EPOCH_' + code), { code: 'WEATHER_STATE_EPOCH_' + code });
}
const sameCode = (left, right, code) => requireCode(isDeepStrictEqual(left, right), code);
export function weatherStateEpochRefusal(error) {
  const raw = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'code')?.value : null;
  let code = raw === 'ENOENT' ? 'MISSING_FILE' : raw === 'EEXIST' ? 'EXISTING_DESTINATION'
    : raw === 'EACCES' || raw === 'EPERM' ? 'IO_DENIED' : raw === 'EBADF' ? 'CLOSE_FAILURE' : null;
  if (typeof raw === 'string' && raw.startsWith('WEATHER_STATE_EPOCH_ARCHIVE_')
    && ARCHIVE_CODES.has(raw.slice('WEATHER_STATE_EPOCH_ARCHIVE_'.length))) code = raw;
  if (typeof raw === 'string' && raw.startsWith('WEATHER_STATE_EPOCH_')
    && CODES.has(raw.slice('WEATHER_STATE_EPOCH_'.length))) code = raw;
  // The archive kernel's own fixed Error messages predate typed codes. Accept
  // only the WHOLE known constant, never a prefix hit or raw upstream detail.
  if (raw == null && error && typeof error === 'object') {
    const message = Object.getOwnPropertyDescriptor(error, 'message')?.value;
    const prefix = 'WEATHER_STATE_EPOCH_ARCHIVE_';
    if (typeof message === 'string' && message.startsWith(prefix)
      && ARCHIVE_CODES.has(message.slice(prefix.length))) code = message;
  }
  const selectedPhase = error && typeof error === 'object' ? stages.get(error) ?? 'SOURCE' : 'SOURCE';
  return { kind: 'WEATHER_STATE_EPOCH_REFUSAL', phase: selectedPhase,
    cause: code ?? selectedPhase + '_CONTRACT_REJECTED' };
}
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => assert.deepEqual(a, b, 'WEATHER_STATE_EPOCH_ORIGINAL_CHANGED');
const inside = (parent, child) => { const rel = path.relative(parent, child);
  return rel && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
async function phase(name, operation) {
  assert(PHASES.has(name));
  try { return await operation(); }
  catch (error) { if (error && typeof error === 'object' && !stages.has(error)) stages.set(error, name); throw error; }
}
async function noLinks(filename) {
  let at = path.parse(filename).root;
  for (const segment of path.relative(at, filename).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); assert(!(await fs.lstat(at)).isSymbolicLink());
  }
}
async function close(handle, first) {
  const fd = handle.fd;
  try { await handle.close(); } catch (error) { first ??= error; }
  try { nativeFs.fstatSync(fd); first ??= new Error('WEATHER_STATE_EPOCH_CLOSE_UNPROVED'); }
  catch (error) { if (error.code !== 'EBADF') first ??= error; }
  if (first) throw first;
}
async function measured(file, maximum = 768 * 1024 * 1024, retain = false) {
  await noLinks(file); const before = await fs.lstat(file);
  assert(before.isFile() && before.nlink === 1 && before.size > 0 && before.size <= maximum);
  const handle = await fs.open(file, nativeFs.constants.O_RDONLY | (nativeFs.constants.O_NOFOLLOW ?? 0));
  let first, result;
  try {
    const opened = await handle.stat();
    for (const key of ['dev', 'ino', 'mode', 'size', 'mtimeMs']) assert.equal(opened[key], before[key]);
    const hash = crypto.createHash('sha256'), chunks = []; let bytes = 0;
    for (;;) {
      const buffer = Buffer.allocUnsafe(1024 * 1024), read = await handle.read(buffer, 0, buffer.length, null);
      if (!read.bytesRead) break;
      bytes += read.bytesRead; assert(bytes <= maximum && bytes <= before.size);
      const chunk = buffer.subarray(0, read.bytesRead); hash.update(chunk); if (retain) chunks.push(Buffer.from(chunk));
    }
    assert.equal(bytes, before.size);
    const after = await fs.lstat(file), end = await handle.stat();
    for (const key of ['dev', 'ino', 'mode', 'size', 'mtimeMs', 'nlink']) {
      assert.equal(after[key], before[key]); assert.equal(end[key], opened[key]);
    }
    assert.equal(after.ctimeMs, before.ctimeMs); assert.equal(end.ctimeMs, opened.ctimeMs);
    result = { bytes, sha256: hash.digest('hex'), ...(retain ? { data: Buffer.concat(chunks, bytes) } : {}) };
  } catch (error) { first = error; }
  await close(handle, first); return result;
}
async function json(file, maximum, expectedSha) {
  const { data, ...proof } = await measured(file, maximum, true);
  if (expectedSha !== undefined) { assert(SHA.test(expectedSha)); assert.equal(proof.sha256, expectedSha); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
}
async function write(file, value) {
  await noLinks(path.dirname(file));
  const bytes = Buffer.from(JSON.stringify(value) + '\n'), handle = await fs.open(file, 'wx', 0o600); let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  await close(handle, first); same(await measured(file, bytes.length), { bytes: bytes.length, sha256: sha(bytes) });
}
function target(value) {
  requireCode(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)
    && Number.isFinite(Date.parse(value)), 'TARGET_INVALID');
  const canonical = new Date(value).toISOString(); assert.equal(canonical.replace('.000Z', 'Z'), value.replace('.000Z', 'Z'));
  return canonical;
}
export function weatherStateEpochStartFreshness(value, now = Date.now()) {
  const canonical = target(value), ageMs = now - Date.parse(canonical);
  requireCode(Number.isFinite(now) && ageMs >= 0, 'TARGET_FROM_FUTURE');
  requireCode(ageMs <= WEATHER_STATE_EPOCH_MAX_START_AGE_MINUTES * 60_000, 'TARGET_START_TOO_OLD');
  return Object.freeze({ targetReferenceAt: canonical, maximumStartAgeMinutes: WEATHER_STATE_EPOCH_MAX_START_AGE_MINUTES,
    ageMinutes: ageMs / 60_000 });
}
export function weatherStateEpochEnvironment(environment = process.env) {
  requireCode(environment.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP === 'true', 'EPOCH_NOT_ENABLED');
  assert.equal(environment.GITHUB_EVENT_NAME, 'workflow_dispatch'); assert.equal(environment.GITHUB_REF, 'refs/heads/main');
  for (const name of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) assert(/^[1-9][0-9]*$/.test(environment[name] ?? ''));
  assert(/^[a-f0-9]{40}$/.test(environment.GITHUB_SHA ?? ''));
  assert.notEqual(environment.RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN, 'true');
  if (environment.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY === 'true') {
    assertWeatherStateEpochCheckpointRequest(environment);
  } else {
    assert.notEqual(environment.QUICK_CONFIRMATION, 'true'); assert(!environment.QUICK_PROGRESS_SOURCE);
    assert(!environment.CHECKPOINT_TARGET_HOUR); assert.notEqual(environment.CHECKPOINT_ONLY, 'true');
    assert.notEqual(environment.RAVRADAR_WEATHER_CACHE_ONLY, 'true');
  }
  const targetReferenceAt = target(environment.RAVRADAR_PRODUCTION_TARGET_HOUR);
  return Object.freeze({ runId: environment.GITHUB_RUN_ID, attempt: environment.GITHUB_RUN_ATTEMPT,
    sourceHead: environment.GITHUB_SHA, targetReferenceAt });
}
async function locations(create = false) {
  const environment = weatherStateEpochEnvironment();
  const parent = await fs.realpath(process.env.RUNNER_TEMP); await noLinks(parent);
  const root = path.join(parent, `ravradar-weather-state-epoch-${environment.runId}-${environment.attempt}`);
  assert(inside(parent, root) && !inside(ROOT, root) && !inside(root, ROOT));
  if (create) await fs.mkdir(root, { mode: 0o700 });
  await noLinks(root); assert((await fs.lstat(root)).isDirectory());
  return { ...environment, root, archiveRoot: path.join(root, 'archive'),
    bundlePath: path.join(root, 'original-bundle'), restoredRoot: path.join(root, 'original-restored'),
    checkpointPath: path.join(root, 'original-S.json'), preparedPath: path.join(root, 'prepared.json'),
    installedPath: path.join(root, 'installed.json'), baselinePath: path.join(parent, 'weather-progress-base.json'),
    publicRoot: path.join(parent, 'ravradar-weather-state-epoch-public-snapshot') };
}
async function source() {
  assertNativeIdentityBindingsFrozen(); assertNativeIdentityOutputFrozen();
  const current = (await exec('git', ['rev-parse', 'HEAD'], { cwd: ROOT, windowsHide: true })).stdout.trim();
  requireCode(current === process.env.GITHUB_SHA, 'SOURCE_HEAD_MISMATCH');
}
async function oldSource(use) {
  return withFrozenI71Source(async oldRoot => {
    const load = name => import(pathToFileURL(path.join(oldRoot, name)).href);
    const [runtime, bundle, checkpoint, prewrite, bounded, audit, readiness, schema, hourly, hourPack] = await Promise.all([
      load('scripts/protected-private-production-runtime.mjs'), load('scripts/private-production-runtime-bundle.mjs'),
      load('scripts/protected-ravscore-continuation-checkpoint.mjs'), load('scripts/current-grid-binding-prewrite.mjs'),
      load('scripts/lib/bounded-conditions-predecessor-transition.mjs'), load('scripts/audit-saved-weather-inputs.mjs'),
      load('scripts/integrated-cutover-readiness.mjs'), load('scripts/verify-account-assistant-schema.mjs'),
      load('scripts/lib/private-conditions-hourly.mjs'), load('scripts/lib/public-hour-delivery-pack.mjs'),
    ]);
    return use({ oldRoot, runtime, bundle, checkpoint, prewrite, bounded, audit, readiness, schema, hourly, hourPack });
  });
}
async function currentOriginal(old, clients) {
  const request = clients.documentRequest;
  const identity = await old.runtime.describeCurrentProtectedPrivateProductionRuntime({ request });
  requireCode(identity.datasetId === OLD_DATASET, 'OLD_GENERATION_REQUIRED');
  const pointerRows = await request('?document_key=eq.ravscore-private-production-runtime-pointer&select=document_key,payload,version&limit=2', {}, 'epoch original pointer');
  assert(Array.isArray(pointerRows) && pointerRows.length === 1);
  const pointer = pointerRows[0];
  old.runtime.validateProtectedPrivateRuntimePointer(pointer.payload, { allowHistoricalCurrentModelBinding: true });
  const rows = await old.checkpoint.createProtectedRavScoreCheckpointRequester()(
    '?document_key=eq.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2', {}, 'epoch original S');
  const row = old.prewrite.assertOriginalCheckpointRow(rows, identity);
  const expected = await old.bounded.buildCurrentGridSamplingOriginalRestoreExpectation({
    sourceDescription: identity, targetReferenceAt: identity.productionReferenceAt, now: new Date().toISOString() });
  assert(expected, 'Only the authentic fixed original receiver');
  return { identity, pointer, row, expected };
}
async function liveManifest() {
  // Fixed small public identity read, not an additional public details download.
  const response = await fetch('https://ravradar.dk/data/live/manifest.json', {
    redirect: 'error', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok || response.redirected || !response.body?.getReader) {
    try { await response.body?.cancel?.(); }
    finally { requireCode(false, 'PUBLIC_READ_FAILED'); }
  }
  const reader = response.body.getReader(), chunks = []; let size = 0, first;
  try {
    for (;;) { const read = await reader.read(); if (read.done) break;
      size += read.value.length; assert(size <= 1024 * 1024); chunks.push(Buffer.from(read.value)); }
  } catch (error) { first = error; }
  finally { if (first) { try { await reader.cancel(); } catch { /* Preserve the first refusal. */ } } reader.releaseLock(); }
  if (first) throw first;
  const bytes = Buffer.concat(chunks, size), value = JSON.parse(bytes.toString('utf8'));
  assert.equal(value.datasetId, OLD_DATASET); return { value, bytes: bytes.length, sha256: sha(bytes) };
}
async function restoreOriginal(old, clients, files, original, localCaptureFiles = null) {
  if (!await fs.lstat(files.bundlePath).catch(() => null)) {
    const storage = localCaptureFiles ? { ...clients.storage, async download(objectPath) {
      const row = localCaptureFiles.find(item => item.objectPath === objectPath);
      assert(row, 'No fallback from exact archive B copies to remote B');
      const { data, ...proof } = await measured(row.sourcePath, row.objectBytes, true);
      same(proof, { bytes: row.objectBytes, sha256: row.objectSha256 }); return data;
    } } : clients.storage;
    const result = await old.runtime.restoreProtectedPrivateProductionRuntime({ privateRoot: files.root,
      bundlePath: files.bundlePath, expected: original.expected, request: clients.documentRequest,
      storage, now: new Date().toISOString() }); assert.equal(result.restored, true);
    await old.bundle.restorePrivateProductionRuntimeBundle({ privateRoot: files.root, bundlePath: files.bundlePath,
      outputPath: files.restoredRoot, expected: original.expected, targetReferenceAt: original.identity.productionReferenceAt,
      minimumReferenceAt: original.identity.productionReferenceAt, minimumGeneratedAt: original.identity.generatedAt,
      now: new Date().toISOString() });
  }
}
function originalVerifier(old, clients, files, original, publicProof) {
  return async ({ captureFiles, archivedFiles }) => {
    await restoreOriginal(old, clients, files, original, captureFiles);
    const sFile = archivedFiles?.find(row => row.role === 'checkpoint');
    const checkpointPath = sFile?.sourcePath ?? files.checkpointPath;
    await old.prewrite.verifyCurrentGridPrewriteOriginals({ privateRoot: files.root,
      bundlePath: files.bundlePath, restoredRoot: files.restoredRoot, expected: original.expected,
      identity: original.identity, checkpointPath, checkpointVersion: original.row.version,
      request: clients.documentRequest, checkpointVersionRequest: old.checkpoint.createProtectedRavScoreCheckpointVersionRequester(),
      now: new Date().toISOString() });
    const fresh = await currentOriginal(old, clients);
    sameCode(fresh.identity, original.identity, 'ORIGINAL_POINTER_CHANGED');
    sameCode(fresh.pointer, original.pointer, 'ORIGINAL_POINTER_CHANGED');
    sameCode(fresh.row, original.row, 'ORIGINAL_CHECKPOINT_CHANGED');
    const manifest = await liveManifest();
    requireCode(manifest.bytes === publicProof.bytes && manifest.sha256 === publicProof.sha256, 'PUBLIC_MANIFEST_CHANGED');
    const verified = await old.bundle.verifyPrivateProductionRuntimeBundle({ privateRoot: files.root,
      bundlePath: files.bundlePath, repositoryRoot: old.oldRoot, expected: original.expected, now: new Date().toISOString() });
    const compact = await json(path.join(files.restoredRoot, 'data/live/conditions.json'), 768 * 1024 * 1024);
    const originalConditions = await old.hourly.hydratePrivateConditionsHourly(compact);
    const descriptor = verified.files.find(row => row.relativePath === '.cache/public-hour-delivery.pack'); assert(descriptor);
    await old.hourPack.inspectPrivatePublicHourDeliveryPack({
      packPath: path.join(files.restoredRoot, descriptor.relativePath), conditions: compact });
    const originalCheckpointPayload = await json(checkpointPath, 16 * 1024 * 1024);
    same(originalCheckpointPayload, original.row.payload);
    return { originalConditions, originalCheckpointPayload, originalDescription: original.identity,
      checkpointVersion: original.row.version, originalPointerRow: original.pointer, originalCheckpointRow: original.row,
      publicPackReference: { archivedWithinOriginalBundle: true, relativePath: descriptor.relativePath,
        fileSha256: descriptor.sha256, bytes: descriptor.bytes, marker: compact.publicHourDelivery },
      originalFileDigests: verified.files.map(({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 })),
      files: archivedFiles ?? [{ role: 'checkpoint', relativePath: 'original-S.json', sourcePath: checkpointPath },
        ...WEATHER_STATE_EPOCH_PUBLIC_FILES.map(relativePath => ({ role: 'public-snapshot', relativePath,
          sourcePath: path.join(files.publicRoot, relativePath) }))] };
  };
}
async function preparedContext(files) {
  const result = await json(files.preparedPath, 256 * 1024);
  assert.equal(result.kind, 'WEATHER_STATE_EPOCH_PREPARED'); assert.equal(result.sourceHead, files.sourceHead);
  assert.equal(result.targetReferenceAt, files.targetReferenceAt); assert(SHA.test(result.archiveId) && SHA.test(result.archiveCatalogSha256));
  assert.equal(result.archiveRoot, files.archiveRoot); return result;
}
async function database(old, stage) {
  if (stage === 'install' || stage === 'verify-binding-installed' || stage === 'verify') {
    await verifyNativeSamplingIdentitySuccessorReadiness();
    await verifyNativeSamplingIdentityInstalledMigrationMetadata({ accessToken: process.env.SUPABASE_ACCESS_TOKEN });
  } else {
    if (stage === 'verify-230-installed' || stage === 'verify-binding-plan') {
      await old.schema.verifyInstalledStatisticsPreferenceRevisionSchema({ accessToken: process.env.SUPABASE_ACCESS_TOKEN });
    } else await old.schema.verifyInstalledAccountAssistantSchema({ accessToken: process.env.SUPABASE_ACCESS_TOKEN });
    await old.readiness.verifyIntegratedDatabaseReadback({ url: process.env.SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY });
  }
}
async function output(values) {
  const allowed = new Set(['archive_key', 'archive_catalog_sha256', 'database_phase', 'context_sha256']);
  requireCode(values && Object.getPrototypeOf(values) === Object.prototype
    && Object.keys(values).length > 0 && Object.keys(values).every(key => allowed.has(key)), 'ARGUMENTS_INVALID');
  for (const [key, value] of Object.entries(values)) {
    requireCode(key === 'database_phase' ? ['before-230', 'before-binding', 'after-binding'].includes(value)
      : typeof value === 'string' && SHA.test(value), 'ARGUMENTS_INVALID');
  }
  if (process.env.GITHUB_OUTPUT) {
    await noLinks(process.env.GITHUB_OUTPUT);
    for (const [key, value] of Object.entries(values)) {
      await fs.appendFile(process.env.GITHUB_OUTPUT, key + '=' + value + '\n');
    }
  }
}
export { output as writeWeatherStateEpochOutputs };
export async function runWeatherStateEpoch(stage) {
  requireCode(arguments.length === 1 && WEATHER_STATE_EPOCH_STAGES.includes(stage), 'ARGUMENTS_INVALID');
  if (process.env.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY === 'true') {
    assertWeatherStateEpochCheckpointRequest();
    requireCode(stage === 'install' || stage === 'verify', 'ARGUMENTS_INVALID');
  }
  await phase('SOURCE', source);
  if (stage === 'verify') {
    const context = await installedContext();
    const registry = await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 32 * 1024 * 1024);
    await loadInstalledWeatherStateEpochInputView({ targetReferenceAt: context.targetReferenceAt, registry });
    return { stage, verified: true, admission: 'NO_ADMISSION' };
  }
  const files = await phase('LOCATIONS', () => locations(stage === 'prepare' || stage === 'install'));
  return oldSource(async old => {
    const clients = old.runtime.createProtectedPrivateRuntimeClients();
    const original = await phase('ORIGINALS', () => currentOriginal(old, clients));
    requireCode(Date.parse(files.targetReferenceAt) > Date.parse(original.identity.productionReferenceAt), 'TARGET_NOT_NEWER');
    if (stage === 'prepare') {
      // Keep the real caller-locked UTC hour across source/hydration rollover.
      // This is an explicit start window, not a new timestamp or gate waiver.
      weatherStateEpochStartFreshness(files.targetReferenceAt);
      const manifest = await phase('PUBLIC', liveManifest);
      const localManifest = await measured(path.join(files.publicRoot, 'manifest.json'), 1024 * 1024);
      same(localManifest, { bytes: manifest.bytes, sha256: manifest.sha256 });
      const selected = original.pointer.payload.current;
      const objects = selected.objects ?? [{ index: 0, objectPath: selected.objectPath,
        objectSha256: selected.objectSha256, objectBytes: selected.objectBytes }];
      const captured = await createWeatherStateEpochCaptureStorage({ storage: clients.storage,
        captureRoot: files.archiveRoot, objects });
      await phase('ORIGINALS', () => restoreOriginal(old, { ...clients, storage: captured.storage }, files, original));
      await write(files.checkpointPath, original.row.payload);
      const publicProof = { bytes: manifest.bytes, sha256: manifest.sha256 };
      const archive = await phase('ARCHIVE', () => saveWeatherStateEpochArchive({ capture: captured.capture,
        storage: clients.storage, targetReferenceAt: files.targetReferenceAt,
        verifyOriginalSnapshot: originalVerifier(old, clients, files, original, publicProof) }));
      const sealed = assertVerifiedWeatherStateEpochArchive(archive);
      const migrationListText = await fs.readFile(path.join(process.env.RUNNER_TEMP, 'weather-state-epoch-migrations-list.txt'), 'utf8');
      const selectedPhase = await selectNativeSamplingIdentityRecoveryPhase({ migrationListText });
      await database(old, selectedPhase.phase === 'after-binding' ? 'verify-binding-installed'
        : selectedPhase.phase === 'before-binding' ? 'verify-binding-plan' : 'prepare');
      const prepared = { kind: 'WEATHER_STATE_EPOCH_PREPARED', admission: 'NO_ADMISSION',
        sourceHead: files.sourceHead, targetReferenceAt: files.targetReferenceAt, archiveRoot: files.archiveRoot,
        archiveId: sealed.archiveId, archiveCatalogSha256: sealed.archiveCatalogSha256,
        originalDescription: original.identity, pointerVersion: original.pointer.version,
        checkpointVersion: original.row.version, publicProof, databasePhase: selectedPhase.phase };
      await write(files.preparedPath, prepared);
      await output({ archive_key: sealed.archiveId, archive_catalog_sha256: sealed.archiveCatalogSha256,
        database_phase: selectedPhase.phase });
      return { stage, archived: true, databasePhase: selectedPhase.phase, admission: 'NO_ADMISSION' };
    }
    if (stage !== 'install') {
      const saved = await preparedContext(files);
      same(original.identity, saved.originalDescription); assert.equal(original.pointer.version, saved.pointerVersion);
      assert.equal(original.row.version, saved.checkpointVersion);
      await rehydrateLocalWeatherStateEpochArchive({ archiveRoot: files.archiveRoot,
        archiveId: saved.archiveId, archiveCatalogSha256: saved.archiveCatalogSha256,
        targetReferenceAt: files.targetReferenceAt,
        verifyOriginalSnapshot: originalVerifier(old, clients, files, original, saved.publicProof) });
      await phase('DATABASE', () => database(old, stage));
      const planPhase = { 'verify-230-plan': 'before-230', 'verify-230-installed': 'after-230',
        'verify-binding-plan': 'before-binding', 'verify-binding-installed': 'after-binding' }[stage];
      await verifyNativeSamplingIdentitySuccessorPlan({ phase: planPhase,
        migrationListText: await fs.readFile(path.join(process.env.RUNNER_TEMP, 'weather-state-epoch-migrations-list.txt'), 'utf8'),
        dryRunText: await fs.readFile(path.join(process.env.RUNNER_TEMP, 'weather-state-epoch-migrations-dry-run.txt'), 'utf8') });
      return { stage, verified: true, admission: 'NO_ADMISSION' };
    }
    return phase('INSTALL', () => installEpoch(old, clients, files, original));
  });
}

async function installEpoch(old, clients, files, original) {
  const archiveId = process.env.RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID,
    archiveCatalogSha256 = process.env.RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_CATALOG_SHA256;
  requireCode(SHA.test(archiveId ?? '') && SHA.test(archiveCatalogSha256 ?? ''), 'ARCHIVE_REQUIRED');
  await phase('DATABASE', () => database(old, 'install'));
  const publicManifest = await liveManifest(), publicProof = { bytes: publicManifest.bytes, sha256: publicManifest.sha256 };
  const archive = await phase('ARCHIVE', () => materializeWeatherStateEpochArchive({ storage: clients.storage,
    archiveRoot: files.archiveRoot, archiveId, archiveCatalogSha256, targetReferenceAt: files.targetReferenceAt,
    verifyOriginalSnapshot: originalVerifier(old, clients, files, original, publicProof) }));
  const sealed = assertVerifiedWeatherStateEpochArchive(archive);
  const descriptionPath = path.join(files.root, 'original-description.json'); await write(descriptionPath, original.identity);
  const baseline = await phase('METADATA_BASELINE', () => old.audit.prepareSavedAuditProgressBaseline({ privateRoot: files.root,
    workRoot: files.root, bundlePath: files.bundlePath, descriptorPath: descriptionPath,
    repositoryRoot: old.oldRoot, progressBaselineTargetHour: files.targetReferenceAt }));
  assert.equal(baseline.normalProgressBaselineUsed, true);
  const workingRoot = path.join(files.root, 'new-working-runtime'), preservationPath = path.join(files.root, 'working-preservation.json');
  const migrated = await phase('WORKING_MIGRATION', () => migrateOwnedI71NativeIdentityWorkingRuntime({ sourceRoot: baseline.repositoryRoot,
    outputRoot: workingRoot, privateRoot: files.root, reportPath: preservationPath }));
  assert.equal(migrated.admission, 'NO_ADMISSION');
  const stagingRoot = path.join(files.root, 'staging-working');
  const staging = await phase('STAGING', () => rebindNativeIdentityStagingWorkingCopy({ sourceRoot: baseline.repositoryRoot,
    outputRoot: stagingRoot, privateRoot: files.root, adminRoot: ROOT }));
  assert.equal(staging.admission, 'NO_ADMISSION'); assert.equal(staging.originalsUnchanged, true);
  const registry = await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 32 * 1024 * 1024);
  const view = await createWeatherStateEpochInputView({ archive, registry, targetReferenceAt: files.targetReferenceAt });
  const installed = await phase('NORMAL_INSTALL', () => installRestoredPrivateRuntime({
    restoredRoot: workingRoot, repositoryRoot: ROOT, stateEpochInputView: view }));
  assert.equal(installed.installed, true); await phase('STAGING', () => installComponents(ROOT, staging.files));
  for (const row of staging.files) same(await measured(path.join(ROOT, row.relativePath), row.bytes), { bytes: row.bytes, sha256: row.sha256 });
  const capture = await phase('CAPTURE_BASE', () => weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: ROOT,
    basePath: files.baselinePath, protectedBundleSha256: original.identity.bundleContentSha256 }));
  assert.equal(capture.captured, true);
  const catalogBytes = await measured(path.join(files.archiveRoot, 'catalog.json.gz'), 1024 * 1024, true);
  const { gunzipSync } = await import('node:zlib');
  const catalog = JSON.parse(gunzipSync(catalogBytes.data, { maxOutputLength: 1024 * 1024 }).toString('utf8'));
  assert.equal(catalogBytes.sha256, sealed.archiveCatalogSha256);
  const checkpointFile = catalog.files.find(row => row.role === 'checkpoint'); assert(checkpointFile);
  const stagingReportPath = path.join(files.root, 'staging-preservation.json'); await write(stagingReportPath, staging);
  const context = { schemaVersion: 1, kind: 'WEATHER_STATE_EPOCH_INSTALLED_CONTEXT', admission: 'NO_ADMISSION',
    sourceHead: files.sourceHead, targetReferenceAt: files.targetReferenceAt, root: files.root,
    archiveRoot: files.archiveRoot, archiveId: sealed.archiveId, archiveCatalogSha256: sealed.archiveCatalogSha256,
    originalDescription: original.identity, pointerVersion: original.pointer.version, checkpointVersion: original.row.version,
    publicProof, bundlePath: files.bundlePath, restoredRoot: files.restoredRoot,
    checkpointPath: path.join(files.archiveRoot, checkpointFile.localFile),
    workingConditions: await measured(path.join(ROOT, 'data/live/conditions.json')),
    baseline: await measured(files.baselinePath, 4096),
    registry: await measured(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 32 * 1024 * 1024),
    preservation: { path: preservationPath, ...await measured(preservationPath, 1024 * 1024) },
    stagingPreservation: { path: stagingReportPath, ...await measured(stagingReportPath, 1024 * 1024) },
    stagingFiles: staging.files.map(({ relativePath, bytes, sha256 }) => ({ relativePath, bytes, sha256 })),
    viewSha256: view.viewSha256 };
  const final = await currentOriginal(old, clients);
  same(final.identity, original.identity); same(final.pointer, original.pointer); same(final.row, original.row);
  await write(files.installedPath, context);
  const contextSha256 = (await measured(files.installedPath, 256 * 1024)).sha256;
  if (process.env.GITHUB_ENV) {
    await noLinks(process.env.GITHUB_ENV);
    await fs.appendFile(process.env.GITHUB_ENV, 'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT=' + files.installedPath + '\n'
      + 'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_SHA256=' + contextSha256 + '\n'
      + 'RAVRADAR_WEATHER_STATE_EPOCH_ORIGINAL_BUNDLE=' + files.bundlePath + '\n');
  }
  await output({ archive_key: archiveId, archive_catalog_sha256: archiveCatalogSha256,
    context_sha256: contextSha256 });
  return { stage: 'install', installed: true, archived: true, admission: 'NO_ADMISSION' };
}

async function installedContext() {
  await source(); const files = await locations(false);
  requireCode(process.env.RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT === files.installedPath
    && SHA.test(process.env.RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_SHA256 ?? ''), 'CONTEXT_INVALID');
  const context = await phase('CONTEXT_READ', () => json(files.installedPath, 256 * 1024, process.env.RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_SHA256));
  assert.equal(context.kind, 'WEATHER_STATE_EPOCH_INSTALLED_CONTEXT'); assert.equal(context.admission, 'NO_ADMISSION');
  assert.equal(context.sourceHead, files.sourceHead); assert.equal(context.targetReferenceAt, files.targetReferenceAt);
  assert.equal(context.root, files.root); assert.equal(context.archiveRoot, files.archiveRoot);
  assert.equal(context.bundlePath, files.bundlePath); assert.equal(context.restoredRoot, files.restoredRoot);
  assert(SHA.test(context.archiveId) && SHA.test(context.archiveCatalogSha256)); return context;
}
export async function restoreInstalledWeatherStateEpochCheckpoint() {
  assertWeatherStateEpochCheckpointRequest();
  const context = await installedContext();
  const registry = await json(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 32 * 1024 * 1024);
  const view = await loadInstalledWeatherStateEpochInputView({ registry, targetReferenceAt: context.targetReferenceAt });
  const report = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: ROOT,
    basePath: path.join(process.env.RUNNER_TEMP, 'weather-progress-base.json'),
    productionReferenceAt: context.targetReferenceAt, resumeOriginalTarget: true,
    stateEpochInputView: view, epochOriginalRoot: context.restoredRoot });
  if (report.status !== 'RESTORED' || report.restored !== true) {
    const safeCodes = new Set(['BASELINE_MISMATCH','SNAPSHOT_ABSENT','SNAPSHOT_INVALID',
      'SNAPSHOT_SCOPE_MISMATCH','SNAPSHOT_AUTHENTICATION_FAILED','PROGRESS_UNAVAILABLE',
      'BASE_UNAVAILABLE','ROLLBACK_FAILED','INSTALL_REJECTED','PROTECTED_PROGRESS_UNION_FAILED',
      'TEMPORARY_CLEANUP_FAILED','ORIGINAL_TARGET_CANDIDATE_REQUIRED','ORIGINAL_TARGET_LEDGER_REQUIRED',
      'ORIGINAL_TARGET_REFERENCE_MISMATCH','ORIGINAL_TARGET_BEFORE_BASELINE','ORIGINAL_TARGET_INPUT_CHANGED',
      'ORIGINAL_TARGET_TIME_REJECTED','ORIGINAL_TARGET_INPUT_TOO_LARGE','ORIGINAL_TARGET_LEDGER_REJECTED',
      'ORIGINAL_TARGET_VALIDATION_TIMEOUT','ORIGINAL_TARGET_VALIDATOR_UNAVAILABLE',
      'EPOCH_ORIGINAL_PACK_REQUIRED','EPOCH_ORIGINAL_PACK_CHANGED','EPOCH_ORIGINAL_PACK_CLOSE_UNPROVED',
      'EPOCH_ACTIVE_DESTINATION_EXISTS','EPOCH_ACTIVE_PROGRESS_REQUIRES_SEPARATE_ADMISSION']);
    const { protectedProgressUnionFailureCode } = await import('./lib/verified-protected-progress-components.mjs');
    console.error(JSON.stringify({ kind: 'WEATHER_STATE_EPOCH_CHECKPOINT_PROGRESS_REFUSAL',
      status: ['CACHE_MISS','RESTORE_REPAIR_REQUIRED'].includes(report.status) ? report.status : 'UNKNOWN',
      code: safeCodes.has(report.code) ? report.code : 'UNKNOWN',
      unionFailureCode: protectedProgressUnionFailureCode({ message: report.unionFailureCode }) }));
  }
  requireCode(report.status === 'RESTORED' && report.restored === true
    && report.restoredProductionReferenceAt === context.targetReferenceAt, 'CHECKPOINT_RESTORE_REQUIRED');
  await loadInstalledWeatherStateEpochInputView({ registry, targetReferenceAt: context.targetReferenceAt });
  return report;
}

export async function loadInstalledWeatherStateEpochInputView(options) {
  requireCode(arguments.length === 1 && options && Object.keys(options).sort().join(',') === 'registry,targetReferenceAt', 'ARGUMENTS_INVALID');
  const context = await installedContext();
  assert.equal(target(options.targetReferenceAt), context.targetReferenceAt);
  const registryPath = path.join(ROOT, 'data/live/coastal-parts-v2.json');
  sameCode(await json(registryPath, 32 * 1024 * 1024), options.registry, 'REGISTRY_CHANGED');
  return oldSource(async old => {
    const clients = old.runtime.createProtectedPrivateRuntimeClients(), original = await currentOriginal(old, clients);
    sameCode(original.identity, context.originalDescription, 'ORIGINAL_POINTER_CHANGED');
    requireCode(original.pointer.version === context.pointerVersion, 'ORIGINAL_POINTER_CHANGED');
    requireCode(original.row.version === context.checkpointVersion, 'ORIGINAL_CHECKPOINT_CHANGED');
    sameCode(await measured(path.join(ROOT, 'data/live/conditions.json')), context.workingConditions, 'WORKING_CHANGED');
    sameCode(await measured(path.join(process.env.RUNNER_TEMP, 'weather-progress-base.json'), 4096), context.baseline, 'WORKING_CHANGED');
    sameCode(await measured(registryPath, 32 * 1024 * 1024), context.registry, 'REGISTRY_CHANGED');
    for (const record of [context.preservation, context.stagingPreservation]) {
      assert(inside(context.root, record.path));
      same(await measured(record.path, 1024 * 1024), { bytes: record.bytes, sha256: record.sha256 });
    }
    // Staging originals are preserved separately; no pending activation is run.
    for (const record of context.stagingFiles) {
      assert(/^\.cache\/coastal-point-staging\/[a-z-]+\.json$/.test(record.relativePath));
      sameCode(await measured(path.join(ROOT, record.relativePath), record.bytes),
        { bytes: record.bytes, sha256: record.sha256 }, 'STAGING_CHANGED');
    }
    const archive = await rehydrateLocalWeatherStateEpochArchive({ archiveRoot: context.archiveRoot,
      archiveId: context.archiveId, archiveCatalogSha256: context.archiveCatalogSha256,
      targetReferenceAt: context.targetReferenceAt,
      verifyOriginalSnapshot: originalVerifier(old, clients, context, original, context.publicProof) });
    const view = await createWeatherStateEpochInputView({ archive, registry: options.registry, targetReferenceAt: context.targetReferenceAt });
    requireCode(view.viewSha256 === context.viewSha256, 'VIEW_CHANGED'); return view;
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireCode(process.argv.length === 3, 'ARGUMENTS_INVALID');
    console.log(JSON.stringify(await runWeatherStateEpoch(process.argv[2])));
  } catch (error) {
    console.error(JSON.stringify(weatherStateEpochRefusal(error)));
    process.exitCode = 1;
  }
}
