#!/usr/bin/env node
// Fixed recovery PREWRITE ONLY. No provider/RAW access, SQL execution, SAVE,
// publication, whole-revision clone or old-original/model retagging.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertNativeIdentityRecoveryFrozen, NATIVE_IDENTITY_RECOVERY_REVIEW,
  NATIVE_IDENTITY_PREDECESSOR, nativeIdentitySourceSha256,
} from './lib/native-sampling-identity-successor-source.mjs';
import { verifyNativeSamplingIdentitySuccessorPlan, selectNativeSamplingIdentityRecoveryPhase }
  from './verify-native-sampling-identity-successor-plan.mjs';
import { verifyNativeSamplingIdentitySuccessorReadiness,
  verifyNativeSamplingIdentityInstalledMigrationMetadata } from './native-sampling-identity-successor-readiness.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,
  PRIVATE_WEATHER_COMPONENT_FILES }
  from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './lib/private-weather-progress-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADAPTER = 'scripts/check-native-identity-frozen-i71-source.mjs';
export const NATIVE_IDENTITY_RECOVERY_STAGES = Object.freeze([
  'prepare', 'verify-230-plan', 'verify-230-installed', 'verify-binding-plan', 'verify-binding-installed', 'prepare-build',
]);
export const NATIVE_IDENTITY_ORIGINAL_PROGRESS = Object.freeze({
  source: '38768040429-1',
  key: 'weather-private-progress-encrypted-v2-Linux-main-38768040429-1',
  target: '2026-10-15T16:00:00.000Z',
});
// Exact existing reader budgets, not a new sampling source or geometry view.
const ORIGINAL_PROGRESS_ADMIN_INPUTS = Object.freeze([
  Object.freeze({ relativePath: 'data/live/coastal-parts-v2.json', maximumBytes: 768 * 1024 * 1024 }),
  Object.freeze({ relativePath: 'data/zones.geojson', maximumBytes: 256 * 1024 * 1024 }),
]);
const same = (left, right) => assert.deepEqual(left, right, 'Authenticated original identity/value changed');
const FAILURE_PHASES = new Set(['SOURCE', 'LOCATIONS', 'B_POINTER', 'B_RESTORE', 'S_ORIGINALS',
  'OLD_BASELINE', 'OLD_GCM', 'OWNED_BUNDLE', 'NEW_METADATA', 'DB_SCHEMA', 'DB_READBACK', 'PLAN', 'FINAL_POINTER']);
const firstFailurePhases = new WeakMap();
function rememberFailure(error, phase) {
  assert(FAILURE_PHASES.has(phase));
  if (error && typeof error === 'object' && !firstFailurePhases.has(error)) firstFailurePhases.set(error, phase);
}
async function prewriteStage(phase, operation) {
  assert(FAILURE_PHASES.has(phase));
  try { return await operation(); }
  catch (error) { rememberFailure(error, phase); throw error; }
}
function prewriteRefusal(error, stage) {
  const code = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'code')?.value : null;
  const causes = { ENOENT: 'MISSING_FILE', ENOTDIR: 'MISSING_DIRECTORY', EEXIST: 'EXISTING_DESTINATION',
    EACCES: 'IO_DENIED', EPERM: 'IO_DENIED', EBADF: 'CLOSE_FAILURE', ERR_ASSERTION: 'CONTRACT_REJECTED',
    NATIVE_SAMPLING_IDENTITY_BINDING_UNFROZEN: 'UNFROZEN' };
  return { kind: 'NATIVE_IDENTITY_RECOVERY_PREWRITE_REFUSAL',
    stage: NATIVE_IDENTITY_RECOVERY_STAGES.includes(stage) ? stage : 'CLI',
    phase: error && typeof error === 'object' ? firstFailurePhases.get(error) ?? 'SOURCE' : 'SOURCE',
    cause: Object.hasOwn(causes, code) ? causes[code] : 'UNKNOWN' };
}
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};
async function noLinks(absolute) {
  let at = path.parse(absolute).root;
  for (const segment of path.relative(at, absolute).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); assert(!(await fs.lstat(at)).isSymbolicLink(), 'Recovery paths must not traverse symlinks');
  }
}
async function closed(handle, first) {
  const fd = handle.fd;
  try { await handle.close(); } catch (error) { first ??= error; }
  try {
    await new Promise((resolve, reject) => nativeFs.fstat(fd, error => error ? reject(error) : resolve()));
    first ??= new Error('NATIVE_IDENTITY_PHYSICAL_CLOSE_UNPROVED');
  } catch (error) { if (error?.code !== 'EBADF') first ??= error; }
  if (first) throw first;
}
async function digest(file, maximumBytes) {
  await noLinks(file);
  const before = await fs.lstat(file);
  assert(before.isFile() && !before.isSymbolicLink() && before.size > 0 && before.size <= maximumBytes);
  const handle = await fs.open(file, 'r'), hash = crypto.createHash('sha256');
  let first, bytes = 0;
  try {
    const opened = await handle.stat();
    assert(opened.dev === before.dev && opened.ino === before.ino && opened.size === before.size);
    const buffer = Buffer.alloc(1024 * 1024);
    for (;;) { const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (bytesRead === 0) break; bytes += bytesRead; assert(bytes <= maximumBytes); hash.update(buffer.subarray(0, bytesRead)); }
    const after = await fs.lstat(file), final = await handle.stat();
    assert(bytes === before.size && after.dev === before.dev && after.ino === before.ino
      && after.size === before.size && after.mtimeMs === before.mtimeMs
      && final.size === before.size && final.mtimeMs === before.mtimeMs);
  } catch (error) { first = error; }
  await closed(handle, first);
  return { bytes, sha256: hash.digest('hex') };
}
async function writeJson(file, value) {
  const handle = await fs.open(file, 'wx', 0o600); let first;
  try { await handle.writeFile(JSON.stringify(value) + '\n'); await handle.sync(); }
  catch (error) { first = error; }
  await closed(handle, first);
}
async function readJson(file, limit) {
  const proof = await digest(file, limit), bytes = await fs.readFile(file);
  assert.equal(bytes.length, proof.bytes); assert.equal(nativeIdentitySourceSha256(bytes), proof.sha256);
  return JSON.parse(bytes.toString('utf8'));
}
async function copyOriginalProgressAdminInputs(baselineRoot) {
  const originals = [];
  // Read BOTH actual central inputs before copying either. Missing/changed
  // source is a hard stop, never a historical or caller-supplied replacement.
  for (const { relativePath, maximumBytes } of ORIGINAL_PROGRESS_ADMIN_INPUTS) {
    originals.push({ relativePath, ...await digest(path.join(ROOT, relativePath), maximumBytes) });
  }
  for (const [index, original] of originals.entries()) {
    const source = path.join(ROOT, original.relativePath), destination = path.join(baselineRoot, original.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
    await noLinks(path.dirname(destination));
    await fs.copyFile(source, destination, nativeFs.constants.COPYFILE_EXCL);
    const maximumBytes = ORIGINAL_PROGRESS_ADMIN_INPUTS[index].maximumBytes;
    same(await digest(source, maximumBytes), { bytes: original.bytes, sha256: original.sha256 });
    same(await digest(destination, maximumBytes), { bytes: original.bytes, sha256: original.sha256 });
  }
  return originals;
}
async function verifyOriginalProgressAdminInputs(baselineRoot, originals) {
  assert.equal(originals.length, ORIGINAL_PROGRESS_ADMIN_INPUTS.length);
  for (const [index, { relativePath, maximumBytes }] of ORIGINAL_PROGRESS_ADMIN_INPUTS.entries()) {
    const original = originals[index]; assert.equal(original.relativePath, relativePath);
    const expected = { bytes: original.bytes, sha256: original.sha256 };
    same(await digest(path.join(ROOT, relativePath), maximumBytes), expected);
    same(await digest(path.join(baselineRoot, relativePath), maximumBytes), expected);
  }
}
async function closedInputCatalog(root, excludedPaths, progressOnly = false) {
  const files = [];
  const allowed = new Set([...Object.values(PRIVATE_WEATHER_COMPONENT_FILES), ...Object.values(PRIVATE_WEATHER_PROGRESS_ONLY_FILES)]);
  const cp = /^\.cache\/copernicus-components\/(?:objects\/[0-9a-f]{64}\.nc|receipts\/[0-9a-f]{64}-[0-9a-f]{64}\.json|static\/[0-9a-f]{64}\.json)$/;
  const directories = new Set(['.cache/copernicus-components', '.cache/copernicus-components/objects',
    '.cache/copernicus-components/receipts', '.cache/copernicus-components/static']);
  for (const file of [...allowed, ...excludedPaths]) {
    const segments = file.split('/');
    for (let index = 1; index < segments.length; index += 1) directories.add(segments.slice(0, index).join('/'));
  }
  async function walk(relative = '') {
    const folder = path.join(root, relative);
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      const child = path.join(relative, entry.name), file = path.join(root, child);
      const stat = await fs.lstat(file); assert(!stat.isSymbolicLink(), 'Actual working input catalog rejects links');
      if (stat.isDirectory()) {
        if (progressOnly) assert(directories.has(child.split(path.sep).join('/')), 'Unknown working progress directory');
        await walk(child);
      }
      else {
        assert(stat.isFile());
        const relativePath = child.split(path.sep).join('/');
        if (excludedPaths.has(relativePath)) continue;
        if (progressOnly) assert(allowed.has(relativePath) || cp.test(relativePath), 'Unknown working progress file');
        assert(stat.size > 0);
        files.push({ relativePath, ...(progressOnly ? { sourcePath: file } : {}), ...await digest(file, stat.size) });
      }
    }
  }
  await walk(); files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  assert.equal(new Set(files.map(file => file.relativePath)).size, files.length);
  return files;
}
async function stagingProgressCatalog(progressFiles, staging, stagingWorkingRoot) {
  const paths = ['coastalPointDmi', 'coastalPointState', 'coastalPointStatus',
    'coastalPointActivationState', 'coastalPointPendingPromotion'].map(key => PRIVATE_WEATHER_COMPONENT_FILES[key]);
  assert.equal(staging.kind, 'NATIVE_IDENTITY_STAGING_WORKING_COPY');
  assert.equal(staging.admission, 'NO_ADMISSION'); assert.equal(staging.originalsUnchanged, true);
  assert.equal(staging.installationPerformed, false);
  assert(Array.isArray(staging.files) && Array.isArray(staging.absentPaths));
  same([...staging.files.map(file => file.relativePath), ...staging.absentPaths].sort(), [...paths].sort());
  const stagedInventory = await closedInputCatalog(stagingWorkingRoot, new Set(), true);
  same(stagedInventory.map(file => file.relativePath).sort(), staging.files.map(file => file.relativePath).sort());
  const overrides = new Map();
  for (const file of staging.files) {
    assert(paths.includes(file.relativePath) && !overrides.has(file.relativePath));
    assert.equal(file.sourcePath, path.join(stagingWorkingRoot, file.relativePath));
    const original = progressFiles.find(row => row.relativePath === file.relativePath);
    assert(original, 'A staging working copy must not create a previously absent OLD input');
    same({ bytes: original.bytes, sha256: original.sha256 }, { bytes: file.originalBytes, sha256: file.originalSha256 });
    const proof = await digest(file.sourcePath, file.bytes);
    same(proof, { bytes: file.bytes, sha256: file.sha256 });
    overrides.set(file.relativePath, { relativePath: file.relativePath, sourcePath: file.sourcePath, ...proof });
  }
  for (const absent of staging.absentPaths) assert(!progressFiles.some(file => file.relativePath === absent),
    'An existing OLD staging input must never disappear from the working catalog');
  return progressFiles.map(file => overrides.get(file.relativePath) ?? file);
}
async function locations(stage) {
  assert.equal(process.env.RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN, 'true');
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, '1');
  assert.match(String(process.env.GITHUB_RUN_ID), /^[1-9][0-9]*$/);
  assert(['2026-10-15T16:00:00Z', NATIVE_IDENTITY_ORIGINAL_PROGRESS.target]
    .includes(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR));
  assert.equal(new Date(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR).toISOString(), NATIVE_IDENTITY_ORIGINAL_PROGRESS.target);
  assert.equal(process.env.QUICK_PROGRESS_SOURCE, NATIVE_IDENTITY_ORIGINAL_PROGRESS.source);
  assert.equal(process.env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY, NATIVE_IDENTITY_ORIGINAL_PROGRESS.key);
  assert.equal(process.env.QUICK_CONFIRMATION, 'false');
  const parent = await fs.realpath(process.env.RUNNER_TEMP); await noLinks(path.resolve(process.env.RUNNER_TEMP));
  const privateRoot = path.join(parent, 'ravradar-native-identity-prewrite-' + process.env.GITHUB_RUN_ID + '-1');
  assert(inside(parent, privateRoot) && !inside(ROOT, privateRoot) && !inside(privateRoot, ROOT));
  // A build job owns a different runner. Reauthenticate/capture its own exact
  // originals rather than transporting or trusting the SQL job's scratch tree.
  if (stage === 'prepare' || stage === 'prepare-build') await fs.mkdir(privateRoot, { mode: 0o700 });
  await noLinks(privateRoot); assert((await fs.lstat(privateRoot)).isDirectory());
  const workRoot = path.join(privateRoot, stage); await fs.mkdir(workRoot, { mode: 0o700 });
  return { privateRoot, workRoot, bundlePath: path.join(privateRoot, 'original-bundle'),
    restoredRoot: path.join(privateRoot, 'original-restored'), checkpointPath: path.join(privateRoot, 'original-S.json'),
    contextPath: path.join(privateRoot, 'original-context.json'), cipherPath: path.join(privateRoot, 'original-progress.encrypted') };
}
async function withActualFrozenI71(use) {
  const review = NATIVE_IDENTITY_RECOVERY_REVIEW;
  const adapter = path.join(ROOT, ADAPTER);
  await noLinks(adapter); assert((await fs.lstat(adapter)).isFile());
  const bytes = await fs.readFile(adapter);
  assert.equal(nativeIdentitySourceSha256(bytes), review.frozenI71AdapterSha256);
  const module = await import(pathToFileURL(adapter).href);
  assert.equal(typeof module.withFrozenI71Source, 'function');
  return module.withFrozenI71Source(async verifiedRoot => {
    // The fixed adapter owns the source verification/closure and cleanup. It
    // must not expose a caller-chosen head, root, module body or validator.
    const load = relative => import(pathToFileURL(path.join(verifiedRoot, relative)).href);
    const [runtime, bundle, checkpoint, bounded, prewrite, audit, progress, readiness, schema] = await Promise.all([
      load('scripts/protected-private-production-runtime.mjs'), load('scripts/private-production-runtime-bundle.mjs'),
      load('scripts/protected-ravscore-continuation-checkpoint.mjs'), load('scripts/lib/bounded-conditions-predecessor-transition.mjs'),
      load('scripts/current-grid-binding-prewrite.mjs'), load('scripts/audit-saved-weather-inputs.mjs'),
      load('scripts/weather-component-progress-cache.mjs'), load('scripts/integrated-cutover-readiness.mjs'),
      load('scripts/verify-account-assistant-schema.mjs'),
    ]);
    const model = (await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
    assert.equal(model.modelBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated);
    return use({ verifiedRoot, runtime, bundle, checkpoint, bounded, prewrite, audit, progress, readiness, schema });
  });
}
export async function runNativeSamplingIdentityRecoveryPrewrite(stage) {
  await prewriteStage('SOURCE', async () => {
    assertNativeIdentityRecoveryFrozen(); // FIRST: no operation I/O while unfrozen.
    assert.equal(arguments.length, 1); assert(NATIVE_IDENTITY_RECOVERY_STAGES.includes(stage));
    await noLinks(fileURLToPath(import.meta.url));
    const self = await fs.readFile(fileURLToPath(import.meta.url));
    assert.equal(nativeIdentitySourceSha256(self), NATIVE_IDENTITY_RECOVERY_REVIEW.recoveryPrewriteSha256);
  });
  const files = await prewriteStage('LOCATIONS', () => locations(stage));
  // A separate build runner neither receives SQL-job scratch files nor a DB
  // password. Its after-binding metadata comes from a fixed read-only query.
  const migrationListText = stage === 'prepare-build' ? null : await prewriteStage('PLAN', () => fs.readFile(
    path.join(process.env.RUNNER_TEMP, 'native-identity-migrations-list.txt'), 'utf8'));
  const selected = stage === 'prepare' ? await prewriteStage('PLAN', () => selectNativeSamplingIdentityRecoveryPhase({ migrationListText })) : null;
  return prewriteStage('SOURCE', () => withActualFrozenI71(async old => {
    const cipherLimit = old.progress.WEATHER_PROGRESS_MAX_CIPHER_BYTES;
    assert.equal(cipherLimit, 384 * 1024 * 1024, 'Preserve the actual normal encrypted-progress storage budget');
    const clients = await prewriteStage('B_POINTER', () => old.runtime.createProtectedPrivateRuntimeClients());
    const request = clients.documentRequest;
    const identity = await prewriteStage('B_POINTER', () => old.runtime.describeCurrentProtectedPrivateProductionRuntime({ request }));
    await prewriteStage('B_POINTER', async () => {
      assert(Date.parse(NATIVE_IDENTITY_ORIGINAL_PROGRESS.target) > Date.parse(identity.productionReferenceAt),
        'Native-identity continuation requires a strictly newer original target');
    });
    const now = new Date().toISOString();
    const expected = await prewriteStage('SOURCE', async () => {
      const result = await old.bounded.buildCurrentGridSamplingOriginalRestoreExpectation({
        sourceDescription: identity, targetReferenceAt: identity.productionReferenceAt, now });
      assert(result, 'Actual selected c1ac B must pass the genuine frozen I71 original receiver');
      return result;
    });
    const key = old.checkpoint.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
    const row = await prewriteStage('S_ORIGINALS', async () => {
      const rows = await old.checkpoint.createProtectedRavScoreCheckpointRequester()(
        '?document_key=eq.' + encodeURIComponent(key) + '&select=document_key,payload,version&limit=2', {}, 'read');
      return old.prewrite.assertOriginalCheckpointRow(rows, identity);
    });
    let saved;
    if (stage === 'prepare' || stage === 'prepare-build') {
      await prewriteStage('B_RESTORE', async () => {
        const restored = await old.runtime.restoreProtectedPrivateProductionRuntime({
          privateRoot: files.privateRoot, bundlePath: files.bundlePath, expected, request, storage: clients.storage, now });
        assert.equal(restored.restored, true);
        await old.bundle.restorePrivateProductionRuntimeBundle({ privateRoot: files.privateRoot,
          bundlePath: files.bundlePath, outputPath: files.restoredRoot, expected,
          targetReferenceAt: identity.productionReferenceAt, minimumReferenceAt: identity.productionReferenceAt,
          minimumGeneratedAt: identity.generatedAt, now });
      });
      await prewriteStage('S_ORIGINALS', () => writeJson(files.checkpointPath, row.payload));
      const cipher = await prewriteStage('OLD_GCM', async () => {
        const incoming = path.join(ROOT, '.cache/weather-private-progress.encrypted');
        const proof = await digest(incoming, cipherLimit);
        await fs.copyFile(incoming, files.cipherPath, nativeFs.constants.COPYFILE_EXCL);
        same(await digest(incoming, cipherLimit), proof); same(await digest(files.cipherPath, cipherLimit), proof);
        return proof;
      });
      saved = { identity, checkpointVersion: row.version, cipher,
        originalProgressSource: NATIVE_IDENTITY_ORIGINAL_PROGRESS.source,
        originalProgressCacheMatchedKey: NATIVE_IDENTITY_ORIGINAL_PROGRESS.key,
        sourceHead: NATIVE_IDENTITY_RECOVERY_REVIEW.frozenI71SourceHead,
        sourceTree: NATIVE_IDENTITY_RECOVERY_REVIEW.frozenI71SourceTree };
      await prewriteStage('LOCATIONS', () => writeJson(files.contextPath, saved));
    } else saved = await prewriteStage('LOCATIONS', () => readJson(files.contextPath, 128 * 1024));
    await prewriteStage('S_ORIGINALS', async () => {
      same(saved.identity, identity); assert.equal(saved.checkpointVersion, row.version);
      same(await readJson(files.checkpointPath, old.checkpoint.PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES), row.payload);
      assert.equal(saved.sourceHead, NATIVE_IDENTITY_RECOVERY_REVIEW.frozenI71SourceHead);
      assert.equal(saved.sourceTree, NATIVE_IDENTITY_RECOVERY_REVIEW.frozenI71SourceTree);
      assert.equal(saved.originalProgressSource, NATIVE_IDENTITY_ORIGINAL_PROGRESS.source);
      assert.equal(saved.originalProgressCacheMatchedKey, NATIVE_IDENTITY_ORIGINAL_PROGRESS.key);
    });
    const original = await prewriteStage('S_ORIGINALS', () => old.prewrite.verifyCurrentGridPrewriteOriginals({ ...files, expected, identity,
      checkpointVersion: row.version, request,
      checkpointVersionRequest: old.checkpoint.createProtectedRavScoreCheckpointVersionRequester(), now }));
    const baseline = await prewriteStage('OLD_BASELINE', async () => {
      const descriptor = path.join(files.workRoot, 'authentic-original-description.json');
      await writeJson(descriptor, identity);
      const result = await old.audit.prepareSavedAuditProgressBaseline({ privateRoot: files.privateRoot,
        workRoot: files.workRoot, bundlePath: files.bundlePath, descriptorPath: descriptor,
        repositoryRoot: old.verifiedRoot, progressBaselineTargetHour: NATIVE_IDENTITY_ORIGINAL_PROGRESS.target });
      assert.equal(result.normalProgressBaselineUsed, true); return result;
    });
    const adminInputs = await prewriteStage('OLD_BASELINE', () => copyOriginalProgressAdminInputs(baseline.repositoryRoot));
    const oldGcmReportPath = path.join(files.workRoot, 'old-gcm-report.json');
    await prewriteStage('OLD_GCM', async () => {
      const cipher = path.join(baseline.repositoryRoot, old.progress.WEATHER_PROGRESS_CIPHER_PATH);
      await fs.mkdir(path.dirname(cipher), { recursive: true, mode: 0o700 });
      same(await digest(files.cipherPath, cipherLimit), saved.cipher);
      await fs.copyFile(files.cipherPath, cipher, nativeFs.constants.COPYFILE_EXCL);
      same(await digest(cipher, cipherLimit), saved.cipher);
      const basePath = path.join(files.workRoot, 'actual-I71-baseline.json');
      const captured = await old.progress.weatherComponentProgressCache({ mode: 'capture-base',
        repositoryRoot: baseline.repositoryRoot, basePath, protectedBundleSha256: identity.bundleContentSha256 });
      assert.equal(captured.captured, true);
      const recovered = await old.progress.weatherComponentProgressCache({ mode: 'restore',
        repositoryRoot: baseline.repositoryRoot, basePath, resumeOriginalTarget: true,
        productionReferenceAt: NATIVE_IDENTITY_ORIGINAL_PROGRESS.target });
      assert.equal(recovered.restored, true); assert.equal(recovered.status, 'RESTORED');
      assert.equal(recovered.restoredProductionReferenceAt, NATIVE_IDENTITY_ORIGINAL_PROGRESS.target);
      same(await digest(cipher, cipherLimit), saved.cipher);
      await writeJson(oldGcmReportPath, recovered);
    });
    await prewriteStage('OLD_BASELINE', () => verifyOriginalProgressAdminInputs(baseline.repositoryRoot, adminInputs));
    const databasePhase = stage === 'prepare' ? selected.phase : ({ 'verify-230-plan': 'before-230',
      'verify-230-installed': 'before-binding', 'verify-binding-plan': 'before-binding',
      'verify-binding-installed': 'after-binding', 'prepare-build': 'after-binding' })[stage];
    const schema2 = databasePhase !== 'before-230';
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    await prewriteStage('DB_SCHEMA', () => schema2 ? old.schema.verifyInstalledStatisticsPreferenceRevisionSchema({ accessToken })
      : old.schema.verifyInstalledAccountAssistantSchema({ accessToken }));
    await prewriteStage('DB_READBACK', () => databasePhase === 'after-binding' ? verifyNativeSamplingIdentitySuccessorReadiness()
      : old.readiness.verifyIntegratedDatabaseReadback({ url: process.env.SUPABASE_URL,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY }));
    if (stage === 'prepare-build') {
      await prewriteStage('PLAN', () => verifyNativeSamplingIdentityInstalledMigrationMetadata({ accessToken }));
    } else if (stage !== 'prepare') {
      const phase = ({ 'verify-230-plan': 'before-230', 'verify-230-installed': 'after-230',
        'verify-binding-plan': 'before-binding', 'verify-binding-installed': 'after-binding', 'prepare-build': 'after-binding' })[stage];
      await prewriteStage('PLAN', async () => {
        const dryRunText = await fs.readFile(path.join(process.env.RUNNER_TEMP, 'native-identity-migrations-dry-run.txt'), 'utf8');
        await verifyNativeSamplingIdentitySuccessorPlan({ phase, migrationListText, dryRunText });
      });
    }
    let build = {};
    if (stage === 'prepare-build') {
      const migrant = await prewriteStage('SOURCE', () => import('./migrate-post-cutover-private-runtime.mjs'));
      const workingPreservationReportPath = path.join(files.workRoot, 'owned-i71-working-rebind.json');
      const workingRoot = path.join(files.workRoot, 'new-working-runtime');
      const migrated = await prewriteStage('OWNED_BUNDLE', async () => {
        try {
          const result = await migrant.migrateOwnedI71NativeIdentityWorkingRuntime({ sourceRoot: baseline.repositoryRoot,
            outputRoot: workingRoot, privateRoot: files.workRoot, reportPath: workingPreservationReportPath });
          assert.equal(result.admission, 'NO_ADMISSION'); return result;
        }
        catch (error) { rememberFailure(error, migrant.ownedI71WorkingFailurePhase(error) ?? 'OWNED_BUNDLE'); throw error; }
      });
      const inputCatalogPath = path.join(files.workRoot, 'working-input-catalog.json');
      const newWorkingBaselinePath = path.join(files.workRoot, 'new-working-baseline.json');
      const stagingWorkingRoot = path.join(files.workRoot, 'native-identity-staging-working');
      const stagingWorkingPreservationReportPath = path.join(files.workRoot, 'staging-working-preservation.json');
      const workingProof = await prewriteStage('NEW_METADATA', async () => {
        const stagingModule = await import('./lib/native-identity-staging-working-copy.mjs');
        const staging = await stagingModule.rebindNativeIdentityStagingWorkingCopy({ sourceRoot: baseline.repositoryRoot,
          outputRoot: stagingWorkingRoot, privateRoot: files.workRoot, adminRoot: ROOT });
        const excluded = new Set([...PRIVATE_RUNTIME_BASE_FILES.map(file => file.relativePath),
          PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath,
          old.progress.WEATHER_PROGRESS_CIPHER_PATH, ...ORIGINAL_PROGRESS_ADMIN_INPUTS.map(file => file.relativePath)]);
        const progressFiles = await stagingProgressCatalog(await closedInputCatalog(baseline.repositoryRoot, excluded, true),
          staging, stagingWorkingRoot);
        await writeJson(stagingWorkingPreservationReportPath, staging);
        await writeJson(inputCatalogPath, { schemaVersion: 1, kind: 'NATIVE_IDENTITY_OWNED_WORKING_INPUT_CATALOG',
          admission: 'NO_ADMISSION', workingRoot, progressRoot: baseline.repositoryRoot, stagingWorkingRoot,
          adminInputs, stagingAdminInputs: staging.adminInputs,
          runtimeFiles: await closedInputCatalog(workingRoot, new Set()),
          progressFiles,
          oldGcmReportSha256: (await digest(oldGcmReportPath, 1024 * 1024)).sha256,
          preservationReportSha256: (await digest(workingPreservationReportPath, 1024 * 1024)).sha256,
          stagingPreservationReportSha256: (await digest(stagingWorkingPreservationReportPath, 1024 * 1024)).sha256 });
        const currentProgress = await import('./weather-component-progress-cache.mjs');
        const capture = await currentProgress.weatherComponentProgressCache({ mode: 'capture-base',
          repositoryRoot: workingRoot, basePath: newWorkingBaselinePath, protectedBundleSha256: identity.bundleContentSha256 });
        assert.equal(capture.captured, true);
        return { oldGcmReportSha256: (await digest(oldGcmReportPath, 1024 * 1024)).sha256,
          inputCatalogSha256: (await digest(inputCatalogPath, 16 * 1024 * 1024)).sha256,
          newWorkingBaselineSha256: (await digest(newWorkingBaselinePath, 4096)).sha256,
          stagingWorkingPreservationReportSha256: (await digest(stagingWorkingPreservationReportPath, 1024 * 1024)).sha256 };
      });
      build = { workingRoot, ownedBundlePath: migrated.ownedBundlePath, oldGcmReportPath,
        workingPreservationReportPath, inputCatalogPath, newWorkingBaselinePath, stagingWorkingRoot, stagingWorkingPreservationReportPath,
        ...workingProof,
        originalProgressSource: saved.originalProgressSource,
        originalProgressCacheMatchedKey: saved.originalProgressCacheMatchedKey,
        originalContextPath: files.contextPath, originalBundlePath: files.bundlePath,
        originalCheckpointPath: files.checkpointPath, originalCipherPath: files.cipherPath,
        protectedBundleContentSha256: identity.bundleContentSha256 };
    }
    await prewriteStage('OLD_BASELINE', () => verifyOriginalProgressAdminInputs(baseline.repositoryRoot, adminInputs));
    await prewriteStage('FINAL_POINTER', () => old.prewrite.assertFreshOriginalIdentities({ identity, checkpointVersion: row.version, request,
      checkpointVersionRequest: old.checkpoint.createProtectedRavScoreCheckpointVersionRequester() }));
    return Object.freeze({ status: 'NATIVE_IDENTITY_RECOVERY_PREWRITE_PASSED', stage, databasePhase,
      partCount: original.partCount, originalBytesUnchanged: true, oldI71ProgressAuthenticated: true,
      numericAdmissionClaimed: false, installationPerformed: false, privatePayloadIncluded: false, ...build });
  }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await prewriteStage('SOURCE', async () => { assertNativeIdentityRecoveryFrozen();
      assert.equal(process.argv.length, 3, 'Only one fixed prewrite stage, no paths or bindings'); });
    console.log(JSON.stringify(await runNativeSamplingIdentityRecoveryPrewrite(process.argv[2])));
  } catch (error) { console.error(JSON.stringify(prewriteRefusal(error, process.argv[2]))); process.exitCode = 1; }
}
