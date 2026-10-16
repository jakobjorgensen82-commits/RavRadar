import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { privateRuntimeBundleContentSha256 } from './private-production-runtime-bundle.mjs';
import { installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { installComponents, weatherComponentProgressCache } from './weather-component-progress-cache.mjs';
import { assertUsableDmiProgressRecovery } from './lib/verified-dmi-progress-inputs.mjs';
import * as inventory from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './lib/private-weather-progress-files.mjs';
import { NATIVE_IDENTITY_PREDECESSOR, NATIVE_IDENTITY_BINDING_REVIEW } from './lib/native-sampling-identity-successor-source.mjs';
import { NATIVE_IDENTITY_ORIGINAL_PROGRESS } from './native-sampling-identity-recovery-prewrite.mjs';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function kernel(root) {
  const source = await fs.readFile(new URL('./install-native-identity-checkpoint-runtime.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('const SHA = '), end = source.indexOf('export async function installNativeIdentityCheckpointRuntime(', start);
  assert(start > 0 && end > start);
  return Function('assert', 'crypto', 'fs', 'nativeFs', 'path', 'ROOT', 'NATIVE_IDENTITY_ORIGINAL_PROGRESS',
    'privateRuntimeBundleContentSha256', 'assertUsableDmiProgressRecovery', 'PRIVATE_RUNTIME_BASE_FILES',
    'PRIVATE_WEATHER_COMPONENT_PACK_FILE', 'PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE', 'PRIVATE_WEATHER_COMPONENT_FILES',
    'assertPrivateRuntimeInventory', 'PRIVATE_WEATHER_PROGRESS_ONLY_FILES', 'NATIVE_IDENTITY_PREDECESSOR', 'NATIVE_IDENTITY_BINDING_REVIEW',
    source.slice(start, end) + ';return {verifyCatalog,verifyBaseline,verifyCaptureReport,originalSnapshot,measured,checkedJson,writeExclusive,closeOwned,phase,refusal};')(
      assert, crypto, fs, nativeFs, path, root, NATIVE_IDENTITY_ORIGINAL_PROGRESS, privateRuntimeBundleContentSha256,
      assertUsableDmiProgressRecovery, inventory.PRIVATE_RUNTIME_BASE_FILES, inventory.PRIVATE_WEATHER_COMPONENT_PACK_FILE,
      inventory.PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE, inventory.PRIVATE_WEATHER_COMPONENT_FILES,
      inventory.assertPrivateRuntimeInventory, PRIVATE_WEATHER_PROGRESS_ONLY_FILES, NATIVE_IDENTITY_PREDECESSOR, NATIVE_IDENTITY_BINDING_REVIEW);
}

test('actual exclusive report writer rejects a no-op close rather than inventing physical persistence', async () => {
  const source = await fs.readFile(new URL('./install-native-identity-checkpoint-runtime.mjs', import.meta.url), 'utf8');
  const start = source.indexOf('async function writeExclusive('), end = source.indexOf('export async function installNativeIdentityCheckpointRuntime(', start);
  assert(start > 0 && end > start);
  const parent = await fs.realpath(os.tmpdir()), temporary = await fs.mkdtemp(path.join(parent, 'rr-native-install-close-'));
  const open = fs.open; let owned;
  const fakeFs = Object.create(fs);
  fakeFs.open = async (...args) => { owned = await open(...args); return { fd: owned.fd,
    writeFile: owned.writeFile.bind(owned), sync: owned.sync.bind(owned), async close() {} }; };
  const closeStart = source.indexOf('async function closeOwned('), closeEnd = source.indexOf('async function measured(', closeStart);
  const writer = Function('fs', 'nativeFs', source.slice(closeStart, closeEnd) + source.slice(start, end) + ';return writeExclusive;')(fakeFs, nativeFs);
  try { await assert.rejects(writer(path.join(temporary, 'report.json'), { controlled: true }), /PHYSICAL_CLOSE_UNPROVED/); }
  finally {
    await owned?.close(); assert.equal(path.dirname(temporary), parent);
    assert(path.basename(temporary).startsWith('rr-native-install-close-')); await fs.rm(temporary, { recursive: true });
  }
});

test('owned close preserves the first actual Error even when its close subsequently fails', async () => {
  const parent = await fs.realpath(os.tmpdir()), temporary = await fs.mkdtemp(path.join(parent, 'rr-native-install-first-'));
  try {
    const k = await kernel(temporary), handle = await fs.open(path.join(temporary, 'owned'), 'wx'), fd = handle.fd;
    const first = new Error('PRIVATE_FIRST_ERROR'), later = new Error('PRIVATE_CLOSE_ERROR');
    await assert.rejects(k.closeOwned({ fd, async close() { await handle.close(); throw later; } }, first), error => error === first);
    assert.throws(() => nativeFs.fstatSync(fd), { code: 'EBADF' });
  } finally {
    assert.equal(path.dirname(temporary), parent); assert(path.basename(temporary).startsWith('rr-native-install-first-'));
    await fs.rm(temporary, { recursive: true });
  }
});

// Controlled persistence-kernel fixture ONLY. No fabricated GCM plaintext or
// report can enter the public installer: it invokes the real prewrite itself.
async function fixture(temporary) {
  const root = path.join(temporary, 'workspace'), privateRoot = path.join(temporary, 'private'), workRoot = path.join(privateRoot, 'prepare-build');
  await fs.mkdir(root); await fs.mkdir(workRoot, { recursive: true });
  const selected = { privateRoot, workRoot, baselinePath: path.join(temporary, 'weather-progress-base.json'),
    baselineReportPath: path.join(temporary, 'weather-progress-base-report.json') };
  const prepared = { status: 'NATIVE_IDENTITY_RECOVERY_PREWRITE_PASSED', stage: 'prepare-build', databasePhase: 'after-binding',
    partCount: 673, originalBytesUnchanged: true, oldI71ProgressAuthenticated: true, numericAdmissionClaimed: false,
    installationPerformed: false, privatePayloadIncluded: false, originalProgressSource: NATIVE_IDENTITY_ORIGINAL_PROGRESS.source,
    originalProgressCacheMatchedKey: NATIVE_IDENTITY_ORIGINAL_PROGRESS.key };
  for (const [key, relative] of Object.entries({ workingRoot: 'new-working-runtime', ownedBundlePath: 'owned-i71-working-bundle',
    inputCatalogPath: 'working-input-catalog.json', oldGcmReportPath: 'old-gcm-report.json', workingPreservationReportPath: 'owned-i71-working-rebind.json',
    newWorkingBaselinePath: 'new-working-baseline.json', stagingWorkingRoot: 'native-identity-staging-working',
    stagingWorkingPreservationReportPath: 'staging-working-preservation.json' })) prepared[key] = path.join(workRoot, relative);
  for (const [key, relative] of Object.entries({ originalBundlePath: 'original-bundle', originalContextPath: 'original-context.json',
    originalCheckpointPath: 'original-S.json', originalCipherPath: 'original-progress.encrypted' })) prepared[key] = path.join(privateRoot, relative);
  const progressRoot = path.join(workRoot, 'normal-progress-baseline');
  const put = async (file, value) => { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value) + '\n');
    await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, bytes); return { bytes: bytes.length, sha256: sha(bytes) }; };
  const proof = async (at, relativePath) => ({ relativePath, ...await put(path.join(at, relativePath), { controlledPersistenceOnly: relativePath }) });
  const runtimeFiles = [], oldFiles = [];
  for (const descriptor of inventory.PRIVATE_RUNTIME_BASE_FILES) {
    const value = descriptor.id === 'full-conditions' ? { datasetId: 'rr-controlled-persistence-only', zones: {}, hourly: [] }
      : { controlledPersistenceOnly: descriptor.id };
    runtimeFiles.push({ relativePath: descriptor.relativePath, ...await put(path.join(prepared.workingRoot, descriptor.relativePath), value) });
    const old = { ...descriptor, ...await put(path.join(progressRoot, descriptor.relativePath), value), privacyClass: 'PRIVATE_PRODUCTION_RUNTIME' };
    oldFiles.push(old);
    for (const bundle of [prepared.ownedBundlePath, prepared.originalBundlePath]) await put(path.join(bundle, 'payload', descriptor.relativePath), value);
  }
  const manifest = { schemaVersion: '1.0.0', kind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_BUNDLE', privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
    fileCount: oldFiles.length, files: oldFiles, datasetId: 'rr-controlled-persistence-only' };
  manifest.bundleContentSha256 = privateRuntimeBundleContentSha256(manifest); prepared.protectedBundleContentSha256 = manifest.bundleContentSha256;
  await put(path.join(prepared.originalBundlePath, 'manifest.json'), manifest); await put(path.join(prepared.ownedBundlePath, 'manifest.json'), manifest);
  const cipher = await put(prepared.originalCipherPath, Buffer.from('CONTROLLED NON-AUTHENTICATED CIPHER BYTES'));
  await put(path.join(progressRoot, '.cache/weather-private-progress.encrypted'), Buffer.from('CONTROLLED NON-AUTHENTICATED CIPHER BYTES'));
  await put(prepared.originalContextPath, { identity: { bundleContentSha256: manifest.bundleContentSha256 }, cipher });
  await put(prepared.originalCheckpointPath, { controlledPersistenceOnly: 'not an authenticated S' });
  const adminInputs = [], stagingAdminInputs = [];
  for (const relative of ['data/live/coastal-parts-v2.json', 'data/zones.geojson', 'data/admin/direction-reviews.json']) {
    const item = await proof(root, relative);
    if (relative !== 'data/admin/direction-reviews.json') { adminInputs.push(item); await put(path.join(progressRoot, relative), { controlledPersistenceOnly: relative }); }
    if (relative !== 'data/zones.geojson') stagingAdminInputs.push(item);
  }
  const oldState = inventory.PRIVATE_WEATHER_COMPONENT_FILES.coastalPointState;
  const original = await proof(progressRoot, oldState), changed = await proof(prepared.stagingWorkingRoot, oldState);
  const stagePaths = ['coastalPointDmi', 'coastalPointState', 'coastalPointStatus', 'coastalPointActivationState', 'coastalPointPendingPromotion']
    .map(key => inventory.PRIVATE_WEATHER_COMPONENT_FILES[key]);
  const staging = { kind: 'NATIVE_IDENTITY_STAGING_WORKING_COPY', admission: 'NO_ADMISSION', originalsUnchanged: true,
    installationPerformed: false, files: [{ ...changed, sourcePath: path.join(prepared.stagingWorkingRoot, oldState),
      originalBytes: original.bytes, originalSha256: original.sha256 }], absentPaths: stagePaths.filter(file => file !== oldState), adminInputs: stagingAdminInputs };
  const stagingProof = await put(prepared.stagingWorkingPreservationReportPath, staging);
  prepared.stagingWorkingPreservationReportSha256 = stagingProof.sha256;
  const oldGcm = { status: 'RESTORED', restored: true, fileCount: 2, restoredProductionReferenceAt: NATIVE_IDENTITY_ORIGINAL_PROGRESS.target,
    dmiProgress: { forecast: { status: 'NOT_PRESENT', recoveredComponents: 0, rejectedRecords: 0, runtimeRecovered: false } } };
  prepared.oldGcmReportSha256 = (await put(prepared.oldGcmReportPath, oldGcm)).sha256;
  const preservation = { kind: 'RAVRADAR_OWNED_I71_NATIVE_IDENTITY_WORKING_REBIND', admission: 'NO_ADMISSION', protectedSourceClaimed: false,
    sourceKind: 'RAVRADAR_NATIVE_IDENTITY_OWNED_I71_WORKING_SOURCE', predecessorSourceHead: '37e657867ff0f8c31f8e8489e5c9a1cf235192f9',
    transitionKind: 'MODEL_BINDING_METADATA_ONLY', migratedPartCount: 673, measurementsChanged: false, candidateStatesChanged: false,
    previousIntegratedBundleSha256: NATIVE_IDENTITY_PREDECESSOR.integrated, previousCandidateBundleSha256: NATIVE_IDENTITY_PREDECESSOR.candidate,
    currentIntegratedBundleSha256: NATIVE_IDENTITY_BINDING_REVIEW.integrated, currentCandidateBundleSha256: NATIVE_IDENTITY_BINDING_REVIEW.candidate,
    sourceBundleContentSha256: manifest.bundleContentSha256, copiedPrivateFileCount: runtimeFiles.length,
    migratedConditionsBytes: runtimeFiles[0].bytes, migratedConditionsSha256: runtimeFiles[0].sha256 };
  const preservationProof = await put(prepared.workingPreservationReportPath, preservation);
  const progress = await proof(progressRoot, inventory.PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate);
  const catalog = { schemaVersion: 1, kind: 'NATIVE_IDENTITY_OWNED_WORKING_INPUT_CATALOG', admission: 'NO_ADMISSION',
    workingRoot: prepared.workingRoot, progressRoot, stagingWorkingRoot: prepared.stagingWorkingRoot, adminInputs, stagingAdminInputs,
    runtimeFiles, progressFiles: [{ ...progress, sourcePath: path.join(progressRoot, progress.relativePath) },
      { ...changed, sourcePath: path.join(prepared.stagingWorkingRoot, oldState) }], oldGcmReportSha256: prepared.oldGcmReportSha256,
    preservationReportSha256: preservationProof.sha256, stagingPreservationReportSha256: stagingProof.sha256 };
  const sealCatalog = async () => { prepared.inputCatalogSha256 = (await put(prepared.inputCatalogPath, catalog)).sha256; };
  await sealCatalog();
  const base = { schemaVersion: 1, kind: 'RAVRADAR_WEATHER_PRIVATE_PROGRESS_ONLY', repository: 'controlled/persistence',
    baselineSha256: runtimeFiles[0].sha256, protectedBundleContentSha256: manifest.bundleContentSha256 };
  prepared.newWorkingBaselineSha256 = (await put(prepared.newWorkingBaselinePath, base)).sha256;
  return { root, selected, prepared, catalog, put, sealCatalog, progressRoot, base };
}

test('actual fs catalog and normal local installers preserve sources; persistence is NO_ADMISSION, not cloud proof', async () => {
  const parent = await fs.realpath(os.tmpdir()), temporary = await fs.mkdtemp(path.join(parent, 'rr-native-install-kernel-'));
  const oldKey = process.env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY;
  const oldRepository = process.env.GITHUB_REPOSITORY;
  process.env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY = NATIVE_IDENTITY_ORIGINAL_PROGRESS.key;
  process.env.GITHUB_REPOSITORY = 'controlled/persistence';
  try {
    const f = await fixture(temporary), k = await kernel(f.root);
    await k.verifyCatalog(f.prepared, f.selected);
    const before = await k.originalSnapshot(f.prepared);
    assert.equal((await installRestoredPrivateRuntime({ restoredRoot: f.prepared.workingRoot, repositoryRoot: f.root })).installed, true);
    await installComponents(f.root, f.catalog.progressFiles);
    await k.verifyCatalog(f.prepared, f.selected, true);
    assert.deepEqual(await k.originalSnapshot(f.prepared), before);
    const capture = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: f.root,
      repository: 'controlled/persistence', basePath: f.selected.baselinePath, protectedBundleSha256: f.prepared.protectedBundleContentSha256 });
    assert.equal(capture.captured, true); await k.verifyBaseline(f.prepared, f.selected);
    await k.writeExclusive(f.selected.baselineReportPath, capture); await k.verifyCaptureReport(f.selected, capture);
    const captureBytes = await fs.readFile(f.selected.baselineReportPath);
    await f.put(f.selected.baselineReportPath, { ...capture, captured: false });
    await assert.rejects(k.verifyCaptureReport(f.selected, capture)); await fs.writeFile(f.selected.baselineReportPath, captureBytes);
    const rejectsChanged = async file => { const bytes = await fs.readFile(file); await fs.appendFile(file, '\nchanged');
      try { await assert.rejects(k.verifyCatalog(f.prepared, f.selected, true)); } finally { await fs.writeFile(file, bytes); } };
    for (const file of [path.join(f.prepared.workingRoot, 'data/live/conditions.json'), f.catalog.progressFiles[0].sourcePath,
      f.catalog.progressFiles[1].sourcePath, path.join(f.progressRoot, inventory.PRIVATE_WEATHER_COMPONENT_FILES.coastalPointState),
      path.join(f.prepared.originalBundlePath, 'payload/data/live/conditions.json'), path.join(f.root, 'data/zones.geojson')]) await rejectsChanged(file);
    await rejectsChanged(path.join(f.progressRoot, '.cache/weather-private-progress.encrypted'));
    const extra = path.join(f.progressRoot, '.cache/UNKNOWN.json'); await fs.writeFile(extra, '{}');
    await assert.rejects(k.verifyCatalog(f.prepared, f.selected), /Unknown source file/); await fs.unlink(extra);
    const unknown = path.join(f.prepared.workingRoot, 'UNKNOWN'); await fs.mkdir(unknown);
    await assert.rejects(k.verifyCatalog(f.prepared, f.selected), /Unknown source directory/); await fs.rmdir(unknown);
    const oldSource = f.catalog.progressFiles[1].sourcePath;
    f.catalog.progressFiles[1].sourcePath = path.join(f.progressRoot, f.catalog.progressFiles[1].relativePath); await f.sealCatalog();
    await assert.rejects(k.verifyCatalog(f.prepared, f.selected)); f.catalog.progressFiles[1].sourcePath = oldSource; await f.sealCatalog();
    const expectedCatalogSha256 = f.prepared.inputCatalogSha256; delete f.prepared.inputCatalogSha256;
    await assert.rejects(k.verifyCatalog(f.prepared, f.selected)); f.prepared.inputCatalogSha256 = expectedCatalogSha256;
    const adminPath = f.catalog.stagingAdminInputs[0].relativePath;
    f.catalog.stagingAdminInputs[0].relativePath = 'data/live/conditions.json'; await f.sealCatalog();
    await assert.rejects(k.verifyCatalog(f.prepared, f.selected)); f.catalog.stagingAdminInputs[0].relativePath = adminPath; await f.sealCatalog();
    const linked = path.join(temporary, 'hardlink'); await fs.link(path.join(f.prepared.workingRoot, 'data/live/conditions.json'), linked);
    try { await assert.rejects(k.measured(linked), { code: 'ERR_ASSERTION' }); } finally { await fs.unlink(linked); }
    const baseline = await fs.readFile(f.selected.baselinePath);
    await f.put(f.selected.baselinePath, { ...f.base, baselineSha256: '0'.repeat(64) });
    await assert.rejects(k.verifyBaseline(f.prepared, f.selected)); await fs.writeFile(f.selected.baselinePath, baseline);
    const error = Object.assign(new Error('PRIVATE_MUST_NEVER_BE_LOGGED'), { code: 'EACCES', secret: 'PRIVATE_MUST_NEVER_BE_LOGGED' });
    await assert.rejects(k.phase('REPORT', () => k.phase('SOURCES', async () => { throw error; })), value => value === error);
    assert.deepEqual(k.refusal(error), { kind: 'NATIVE_IDENTITY_CHECKPOINT_RUNTIME_REFUSAL', phase: 'SOURCES', cause: 'IO_DENIED' });
    assert(!JSON.stringify(k.refusal(error)).includes('PRIVATE_MUST_NEVER_BE_LOGGED'));
  } finally {
    if (oldKey === undefined) delete process.env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY; else process.env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY = oldKey;
    if (oldRepository === undefined) delete process.env.GITHUB_REPOSITORY; else process.env.GITHUB_REPOSITORY = oldRepository;
    assert.equal(path.dirname(temporary), parent); assert(path.basename(temporary).startsWith('rr-native-install-kernel-'));
    await fs.rm(temporary, { recursive: true });
  }
});

test('public installation never accepts a prepared JSON report or injected callback as admission', async () => {
  const { installNativeIdentityCheckpointRuntime } = await import('./install-native-identity-checkpoint-runtime.mjs');
  await assert.rejects(installNativeIdentityCheckpointRuntime({ prepared: { installed: true }, runPrewrite: () => true }), /No reports/);
  const source = await fs.readFile(new URL('./install-native-identity-checkpoint-runtime.mjs', import.meta.url), 'utf8');
  assert(source.includes("phase('PREWRITE', () => runNativeSamplingIdentityRecoveryPrewrite('prepare-build'))"));
  const privateValue = 'PRIVATE_INSTALL_ERROR_MUST_NOT_BE_LOGGED';
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./install-native-identity-checkpoint-runtime.mjs', import.meta.url)), privateValue],
    { encoding: 'utf8', env: {} });
  assert.equal(result.status, 1); assert.equal(result.stdout, '');
  assert.deepEqual(JSON.parse(result.stderr), { kind: 'NATIVE_IDENTITY_CHECKPOINT_RUNTIME_REFUSAL', phase: 'SOURCE', cause: 'CONTRACT_REJECTED' });
  assert(!result.stderr.includes(privateValue));
});
