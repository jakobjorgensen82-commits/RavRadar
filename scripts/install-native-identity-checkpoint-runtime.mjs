#!/usr/bin/env node
// The only installation entry runs the genuine same-run B/S/GCM prewrite
// itself. Catalog/installed reports are persistence evidence, not admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import nativeFs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNativeSamplingIdentityRecoveryPrewrite, NATIVE_IDENTITY_ORIGINAL_PROGRESS }
  from './native-sampling-identity-recovery-prewrite.mjs';
import { assertNativeIdentityRecoveryFrozen, NATIVE_IDENTITY_PREDECESSOR, NATIVE_IDENTITY_BINDING_REVIEW }
  from './lib/native-sampling-identity-successor-source.mjs';
import { installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { installComponents, weatherComponentProgressCache } from './weather-component-progress-cache.mjs';
import { privateRuntimeBundleContentSha256 } from './private-production-runtime-bundle.mjs';
import { assertUsableDmiProgressRecovery } from './lib/verified-dmi-progress-inputs.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,
  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE, PRIVATE_WEATHER_COMPONENT_FILES,
  assertPrivateRuntimeInventory } from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './lib/private-weather-progress-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHA = /^[a-f0-9]{64}$/;
const PHASES = new Set(['SOURCE', 'LOCATIONS', 'PREWRITE', 'CATALOG', 'SOURCES', 'ORIGINALS',
  'RUNTIME_INSTALL', 'PROGRESS_INSTALL', 'INSTALLED', 'BASELINE', 'REPORT', 'VERIFY']);
const firstPhases = new WeakMap();
async function phase(name, operation) {
  assert(PHASES.has(name));
  try { return await operation(); }
  catch (error) { if (error && typeof error === 'object' && !firstPhases.has(error)) firstPhases.set(error, name); throw error; }
}
function refusal(error) {
  const code = error && typeof error === 'object' ? Object.getOwnPropertyDescriptor(error, 'code')?.value : null;
  const causes = { ENOENT: 'MISSING_FILE', ENOTDIR: 'MISSING_DIRECTORY', EEXIST: 'EXISTING_DESTINATION',
    EACCES: 'IO_DENIED', EPERM: 'IO_DENIED', EBADF: 'CLOSE_FAILURE', ERR_ASSERTION: 'CONTRACT_REJECTED',
    NATIVE_SAMPLING_IDENTITY_BINDING_UNFROZEN: 'UNFROZEN' };
  return { kind: 'NATIVE_IDENTITY_CHECKPOINT_RUNTIME_REFUSAL',
    phase: error && typeof error === 'object' ? firstPhases.get(error) ?? 'SOURCE' : 'SOURCE',
    cause: Object.hasOwn(causes, code) ? causes[code] : 'UNKNOWN' };
}
const STAGING = new Set(['coastalPointDmi', 'coastalPointState', 'coastalPointStatus',
  'coastalPointActivationState', 'coastalPointPendingPromotion'].map(key => PRIVATE_WEATHER_COMPONENT_FILES[key]));
const PROGRESS = new Set([...Object.values(PRIVATE_WEATHER_COMPONENT_FILES), ...Object.values(PRIVATE_WEATHER_PROGRESS_ONLY_FILES)]);
const progressPath = value => PROGRESS.has(value)
  || /^\.cache\/copernicus-components\/(?:objects\/[a-f0-9]{64}\.nc|receipts\/[a-f0-9]{64}-[a-f0-9]{64}\.json|static\/[a-f0-9]{64}\.json)$/.test(value);
const runtimeDescriptors = [...PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE];
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
};
async function noLinks(file) {
  let at = path.parse(file).root;
  for (const segment of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment);
    assert(!(await fs.lstat(at)).isSymbolicLink(), 'Native identity install rejects links');
  }
}
async function closeOwned(handle, first) {
  const fd = handle.fd;
  try { await handle.close(); } catch (error) { first ??= error; }
  try { nativeFs.fstatSync(fd); first ??= new Error('NATIVE_IDENTITY_INSTALL_PHYSICAL_CLOSE_UNPROVED'); }
  catch (error) { if (error.code !== 'EBADF') first ??= error; }
  if (first) throw first;
}
async function measured(file, maximumBytes = 768 * 1024 * 1024, retainBytes = false) {
  await noLinks(file);
  const before = await fs.lstat(file);
  assert(before.isFile() && before.nlink === 1 && before.size > 0 && before.size <= maximumBytes);
  const handle = await fs.open(file, 'r'), hash = crypto.createHash('sha256'), chunks = [];
  let first, total = 0;
  try {
    const opened = await handle.stat();
    assert.equal(opened.dev, before.dev); assert.equal(opened.ino, before.ino); assert.equal(opened.size, before.size);
    assert.equal(opened.nlink, 1); assert.equal(opened.mode, before.mode);
    const buffer = Buffer.alloc(1024 * 1024);
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      total += bytesRead; assert(total <= before.size); hash.update(buffer.subarray(0, bytesRead));
      if (retainBytes) chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
    }
    const after = await fs.lstat(file), final = await handle.stat();
    assert.equal(total, before.size);
    for (const item of [after, final]) {
      assert.equal(item.dev, before.dev); assert.equal(item.ino, before.ino);
      assert.equal(item.size, before.size); assert.equal(item.mtimeMs, before.mtimeMs);
      assert.equal(item.nlink, 1); assert.equal(item.mode, before.mode);
    }
    assert.equal(after.ctimeMs, before.ctimeMs); assert.equal(final.ctimeMs, opened.ctimeMs);
  } catch (error) { first = error; }
  await closeOwned(handle, first);
  return { bytes: total, sha256: hash.digest('hex'), ...(retainBytes ? { data: Buffer.concat(chunks, total) } : {}) };
}
async function checkedJson(file, maximumBytes, expectedSha256) {
  const { data, ...proof } = await measured(file, maximumBytes, true);
  if (expectedSha256 !== undefined) { assert(SHA.test(expectedSha256)); assert.equal(proof.sha256, expectedSha256); }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
}
async function locations(mode) {
  assertNativeIdentityRecoveryFrozen();
  assert.equal(process.env.RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN, 'true');
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
  assert.equal(process.env.GITHUB_RUN_ATTEMPT, '1');
  assert.match(String(process.env.GITHUB_RUN_ID), /^[1-9][0-9]*$/);
  await noLinks(path.resolve(process.env.GITHUB_WORKSPACE));
  assert.equal(await fs.realpath(process.env.GITHUB_WORKSPACE), ROOT);
  const temporary = await fs.realpath(process.env.RUNNER_TEMP); await noLinks(temporary);
  const privateRoot = path.join(temporary, 'ravradar-native-identity-prewrite-' + process.env.GITHUB_RUN_ID + '-1');
  const workRoot = path.join(privateRoot, 'prepare-build');
  assert(!inside(ROOT, privateRoot) && !inside(privateRoot, ROOT));
  const selected = { temporary, privateRoot, workRoot, reportPath: path.join(temporary, 'native-identity-working-installed.json'),
    baselinePath: path.join(temporary, 'weather-progress-base.json'),
    baselineReportPath: path.join(temporary, 'weather-progress-base-report.json') };
  if (mode === 'install') for (const file of [selected.reportPath, selected.baselinePath, selected.baselineReportPath]) {
    let exists; try { exists = await fs.lstat(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    assert(!exists, 'An existing installation receipt/baseline must never authorize replay');
  }
  return selected;
}
async function equalFile(root, descriptor) {
  assert.equal(typeof descriptor.relativePath, 'string');
  assert(Number.isSafeInteger(descriptor.bytes) && descriptor.bytes > 0 && SHA.test(descriptor.sha256));
  const file = path.resolve(root, descriptor.relativePath); assert(inside(root, file));
  assert.deepEqual(await measured(file, descriptor.bytes), { bytes: descriptor.bytes, sha256: descriptor.sha256 });
}
async function exactInventory(root, relativePaths) {
  await noLinks(root); assert.equal(await fs.realpath(root), root);
  const expected = [...relativePaths].sort(), directories = new Set(), actual = [];
  assert.equal(new Set(expected).size, expected.length);
  for (const file of expected) {
    assert.equal(typeof file, 'string'); assert(inside(root, path.resolve(root, file)));
    const parts = file.split('/'); for (let i = 1; i < parts.length; i += 1) directories.add(parts.slice(0, i).join('/'));
  }
  async function walk(relative = '') {
    for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
      const child = relative ? relative + '/' + entry.name : entry.name, stat = await fs.lstat(path.join(root, child));
      assert(!stat.isSymbolicLink());
      if (stat.isDirectory()) { assert(directories.has(child), 'Unknown source directory'); await walk(child); }
      else { assert(stat.isFile() && expected.includes(child), 'Unknown source file'); actual.push(child); }
    }
  }
  await walk(); assert.deepEqual(actual.sort(), expected);
}
async function originalSnapshot(prepared) {
  const manifest = await checkedJson(path.join(prepared.originalBundlePath, 'manifest.json'), 1024 * 1024);
  assert.equal(privateRuntimeBundleContentSha256(manifest), prepared.protectedBundleContentSha256);
  assert.equal(manifest.bundleContentSha256, prepared.protectedBundleContentSha256);
  assertPrivateRuntimeInventory(manifest.files);
  await exactInventory(prepared.originalBundlePath, ['manifest.json', ...manifest.files.map(file => 'payload/' + file.relativePath)]);
  await exactInventory(path.join(prepared.originalBundlePath, 'payload'), manifest.files.map(file => file.relativePath));
  for (const file of manifest.files) await equalFile(path.join(prepared.originalBundlePath, 'payload'), file);
  const context = await checkedJson(prepared.originalContextPath, 128 * 1024);
  assert.equal(context.identity.bundleContentSha256, prepared.protectedBundleContentSha256);
  assert.deepEqual(await measured(prepared.originalCipherPath, 384 * 1024 * 1024), context.cipher);
  const proofs = [];
  for (const file of [path.join(prepared.originalBundlePath, 'manifest.json'), prepared.originalContextPath,
    prepared.originalCheckpointPath, prepared.originalCipherPath]) proofs.push({ file, ...await measured(file) });
  return proofs;
}
async function verifyCatalog(prepared, selected, installed = false) {
  for (const key of ['inputCatalogSha256', 'oldGcmReportSha256', 'stagingWorkingPreservationReportSha256',
    'newWorkingBaselineSha256', 'protectedBundleContentSha256']) assert(SHA.test(prepared[key]));
  assert.equal(prepared.status, 'NATIVE_IDENTITY_RECOVERY_PREWRITE_PASSED');
  assert.equal(prepared.stage, 'prepare-build'); assert.equal(prepared.databasePhase, 'after-binding');
  assert.equal(prepared.partCount, 673); assert.equal(prepared.originalBytesUnchanged, true);
  assert.equal(prepared.oldI71ProgressAuthenticated, true); assert.equal(prepared.numericAdmissionClaimed, false);
  assert.equal(prepared.installationPerformed, false); assert.equal(prepared.privatePayloadIncluded, false);
  assert.equal(prepared.originalProgressSource, NATIVE_IDENTITY_ORIGINAL_PROGRESS.source);
  assert.equal(prepared.originalProgressCacheMatchedKey, NATIVE_IDENTITY_ORIGINAL_PROGRESS.key);
  assert.equal(process.env.NATIVE_IDENTITY_PROGRESS_CACHE_MATCHED_KEY, prepared.originalProgressCacheMatchedKey);
  for (const [key, relative] of Object.entries({ workingRoot: 'new-working-runtime', ownedBundlePath: 'owned-i71-working-bundle',
    inputCatalogPath: 'working-input-catalog.json', oldGcmReportPath: 'old-gcm-report.json',
    workingPreservationReportPath: 'owned-i71-working-rebind.json', newWorkingBaselinePath: 'new-working-baseline.json',
    stagingWorkingRoot: 'native-identity-staging-working', stagingWorkingPreservationReportPath: 'staging-working-preservation.json' })) {
    assert.equal(prepared[key], path.join(selected.workRoot, relative));
  }
  for (const [key, relative] of Object.entries({ originalBundlePath: 'original-bundle', originalContextPath: 'original-context.json',
    originalCheckpointPath: 'original-S.json', originalCipherPath: 'original-progress.encrypted' })) {
    assert.equal(prepared[key], path.join(selected.privateRoot, relative));
  }
  const catalog = await checkedJson(prepared.inputCatalogPath, 16 * 1024 * 1024, prepared.inputCatalogSha256);
  for (const key of ['oldGcmReportSha256', 'preservationReportSha256', 'stagingPreservationReportSha256']) assert(SHA.test(catalog[key]));
  assert.equal(catalog.schemaVersion, 1); assert.equal(catalog.kind, 'NATIVE_IDENTITY_OWNED_WORKING_INPUT_CATALOG');
  assert.equal(catalog.admission, 'NO_ADMISSION'); assert.equal(catalog.workingRoot, prepared.workingRoot);
  assert.equal(catalog.progressRoot, path.join(selected.workRoot, 'normal-progress-baseline'));
  assert.equal(catalog.stagingWorkingRoot, prepared.stagingWorkingRoot);
  for (const root of [catalog.workingRoot, catalog.progressRoot, catalog.stagingWorkingRoot]) {
    assert.equal(typeof root, 'string'); assert(inside(selected.workRoot, root));
    assert.equal(await fs.realpath(root), root); await noLinks(root);
  }
  assert.equal(prepared.stagingWorkingRoot, catalog.stagingWorkingRoot);
  assert.equal(catalog.oldGcmReportSha256, prepared.oldGcmReportSha256);
  assert.equal(catalog.stagingPreservationReportSha256, prepared.stagingWorkingPreservationReportSha256);
  const preservation = await checkedJson(prepared.workingPreservationReportPath, 1024 * 1024, catalog.preservationReportSha256);
  assert.equal(preservation.kind, 'RAVRADAR_OWNED_I71_NATIVE_IDENTITY_WORKING_REBIND');
  assert.equal(preservation.admission, 'NO_ADMISSION'); assert.equal(preservation.protectedSourceClaimed, false);
  assert.equal(preservation.sourceKind, 'RAVRADAR_NATIVE_IDENTITY_OWNED_I71_WORKING_SOURCE');
  assert.equal(preservation.predecessorSourceHead, '37e657867ff0f8c31f8e8489e5c9a1cf235192f9');
  assert.equal(preservation.transitionKind, 'MODEL_BINDING_METADATA_ONLY'); assert.equal(preservation.migratedPartCount, 673);
  assert.equal(preservation.measurementsChanged, false); assert.equal(preservation.candidateStatesChanged, false);
  assert.equal(preservation.previousIntegratedBundleSha256, NATIVE_IDENTITY_PREDECESSOR.integrated);
  assert.equal(preservation.previousCandidateBundleSha256, NATIVE_IDENTITY_PREDECESSOR.candidate);
  assert.equal(preservation.currentIntegratedBundleSha256, NATIVE_IDENTITY_BINDING_REVIEW.integrated);
  assert.equal(preservation.currentCandidateBundleSha256, NATIVE_IDENTITY_BINDING_REVIEW.candidate);
  const staging = await checkedJson(prepared.stagingWorkingPreservationReportPath, 1024 * 1024, catalog.stagingPreservationReportSha256);
  assert.equal(staging.kind, 'NATIVE_IDENTITY_STAGING_WORKING_COPY'); assert.equal(staging.admission, 'NO_ADMISSION');
  assert.equal(staging.originalsUnchanged, true); assert.equal(staging.installationPerformed, false);
  assert.deepEqual([...staging.files.map(file => file.relativePath), ...staging.absentPaths].sort(), [...STAGING].sort());
  assert.deepEqual(catalog.stagingAdminInputs, staging.adminInputs);
  const oldGcm = await checkedJson(prepared.oldGcmReportPath, 1024 * 1024, prepared.oldGcmReportSha256);
  assert.equal(oldGcm.status, 'RESTORED'); assert.equal(oldGcm.restored, true);
  assert(Number.isSafeInteger(oldGcm.fileCount) && oldGcm.fileCount > 0);
  assert.equal(oldGcm.restoredProductionReferenceAt, NATIVE_IDENTITY_ORIGINAL_PROGRESS.target);
  assertUsableDmiProgressRecovery(oldGcm.dmiProgress, { allowAbsent: true });
  await originalSnapshot(prepared);
  const owned = await checkedJson(path.join(prepared.ownedBundlePath, 'manifest.json'), 1024 * 1024);
  assert.equal(privateRuntimeBundleContentSha256(owned), preservation.sourceBundleContentSha256);
  assert.equal(owned.bundleContentSha256, preservation.sourceBundleContentSha256);
  assertPrivateRuntimeInventory(owned.files);
  await exactInventory(prepared.ownedBundlePath, ['manifest.json', ...owned.files.map(file => 'payload/' + file.relativePath)]);
  await exactInventory(path.join(prepared.ownedBundlePath, 'payload'), owned.files.map(file => file.relativePath));
  for (const file of owned.files) { await equalFile(path.join(prepared.ownedBundlePath, 'payload'), file); await equalFile(catalog.progressRoot, file); }
  assert.deepEqual(await measured(path.join(catalog.progressRoot, '.cache/weather-private-progress.encrypted'), 384 * 1024 * 1024),
    await measured(prepared.originalCipherPath, 384 * 1024 * 1024));
  assert(Array.isArray(catalog.runtimeFiles) && Array.isArray(catalog.progressFiles));
  assertPrivateRuntimeInventory(catalog.runtimeFiles.map(file => {
    const descriptor = runtimeDescriptors.find(value => value.relativePath === file.relativePath);
    assert(descriptor, 'No new runtime inventory via a catalog'); return descriptor;
  }));
  assert.equal(new Set(catalog.runtimeFiles.map(file => file.relativePath)).size, catalog.runtimeFiles.length);
  const runtimePaths = new Set(catalog.runtimeFiles.map(file => file.relativePath));
  assert.equal(preservation.copiedPrivateFileCount, catalog.runtimeFiles.length);
  const conditionsProof = catalog.runtimeFiles.find(file => file.relativePath === 'data/live/conditions.json');
  assert.deepEqual({ bytes: preservation.migratedConditionsBytes, sha256: preservation.migratedConditionsSha256 },
    { bytes: conditionsProof.bytes, sha256: conditionsProof.sha256 });
  await exactInventory(catalog.workingRoot, [...runtimePaths]);
  await exactInventory(catalog.stagingWorkingRoot, staging.files.map(file => file.relativePath));
  for (const file of catalog.runtimeFiles) { await equalFile(catalog.workingRoot, file); if (installed) await equalFile(ROOT, file); }
  assert.equal(new Set(catalog.progressFiles.map(file => file.relativePath)).size, catalog.progressFiles.length);
  for (const file of catalog.progressFiles) {
    assert(progressPath(file.relativePath) && !runtimePaths.has(file.relativePath), 'Only normal operational progress is installable');
    const old = path.join(catalog.progressRoot, file.relativePath), staging = path.join(catalog.stagingWorkingRoot, file.relativePath);
    assert(file.sourcePath === old || STAGING.has(file.relativePath) && file.sourcePath === staging);
    await equalFile(file.sourcePath === old ? catalog.progressRoot : catalog.stagingWorkingRoot, file);
    if (installed) await equalFile(ROOT, file);
  }
  for (const file of staging.files) {
    assert(STAGING.has(file.relativePath)); assert.equal(file.sourcePath, path.join(catalog.stagingWorkingRoot, file.relativePath));
    const row = catalog.progressFiles.find(value => value.relativePath === file.relativePath);
    assert(row, 'No staging output may be dropped');
    assert.deepEqual(row, { relativePath: file.relativePath, sourcePath: file.sourcePath, bytes: file.bytes, sha256: file.sha256 });
    await equalFile(catalog.progressRoot, { relativePath: file.relativePath, bytes: file.originalBytes, sha256: file.originalSha256 });
  }
  for (const relative of staging.absentPaths) {
    assert(!catalog.progressFiles.some(file => file.relativePath === relative));
    if (installed) { let stat; try { stat = await fs.lstat(path.join(ROOT, relative)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      assert(!stat, 'Absent staging may not silently inherit an unbound installed input'); }
  }
  assert.deepEqual(catalog.adminInputs.map(row => row.relativePath).sort(),
    ['data/live/coastal-parts-v2.json', 'data/zones.geojson']);
  assert.deepEqual(catalog.stagingAdminInputs.map(row => row.relativePath).sort(),
    ['data/admin/direction-reviews.json', 'data/live/coastal-parts-v2.json']);
  await exactInventory(catalog.progressRoot, [...owned.files.map(file => file.relativePath),
    ...catalog.progressFiles.map(file => file.relativePath), ...catalog.adminInputs.map(file => file.relativePath),
    '.cache/weather-private-progress.encrypted']);
  for (const file of [...catalog.adminInputs, ...catalog.stagingAdminInputs]) await equalFile(ROOT, file);
  for (const file of catalog.adminInputs) await equalFile(catalog.progressRoot, file);
  const workingBase = await checkedJson(prepared.newWorkingBaselinePath, 4096, prepared.newWorkingBaselineSha256);
  validBaseline(workingBase, prepared.protectedBundleContentSha256);
  assert.equal(workingBase.baselineSha256, (await measured(path.join(catalog.workingRoot, 'data/live/conditions.json'))).sha256);
  return catalog;
}
function validBaseline(baseline, originalBundleSha256) {
  assert.deepEqual(Object.keys(baseline).sort(), ['baselineSha256', 'kind', 'protectedBundleContentSha256', 'repository', 'schemaVersion']);
  assert.equal(baseline.schemaVersion, 1); assert.equal(baseline.kind, 'RAVRADAR_WEATHER_PRIVATE_PROGRESS_ONLY');
  assert.equal(baseline.repository, process.env.GITHUB_REPOSITORY); assert(SHA.test(baseline.baselineSha256));
  assert.equal(baseline.protectedBundleContentSha256, originalBundleSha256);
}
async function verifyBaseline(prepared, selected, expectedSha256) {
  const baseline = await checkedJson(selected.baselinePath, 4096, expectedSha256);
  validBaseline(baseline, prepared.protectedBundleContentSha256);
  assert.equal(baseline.baselineSha256, (await measured(path.join(ROOT, 'data/live/conditions.json'))).sha256);
  assert.deepEqual(baseline, await checkedJson(prepared.newWorkingBaselinePath, 4096, prepared.newWorkingBaselineSha256));
}
async function verifyCaptureReport(selected, capture) {
  assert.equal(capture.status, 'BASE_CAPTURED'); assert.equal(capture.captured, true);
  assert.deepEqual(await checkedJson(selected.baselineReportPath, 64 * 1024), capture);
}
async function writeExclusive(file, value) {
  const bytes = Buffer.from(JSON.stringify(value) + '\n');
  const handle = await fs.open(file, 'wx', 0o600); let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  await closeOwned(handle, first);
  assert.deepEqual(await measured(file, bytes.length), { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
}
export async function installNativeIdentityCheckpointRuntime() {
  assert.equal(arguments.length, 0, 'No reports, paths, validators or bindings can authorize an installation');
  await phase('SOURCE', async () => assertNativeIdentityRecoveryFrozen());
  const selected = await phase('LOCATIONS', () => locations('install'));
  const prepared = await phase('PREWRITE', () => runNativeSamplingIdentityRecoveryPrewrite('prepare-build'));
  const catalog = await phase('CATALOG', () => verifyCatalog(prepared, selected));
  const originals = await phase('ORIGINALS', () => originalSnapshot(prepared));
  await phase('RUNTIME_INSTALL', async () => {
    const installed = await installRestoredPrivateRuntime({ restoredRoot: prepared.workingRoot, repositoryRoot: ROOT });
    assert.equal(installed.installed, true);
  });
  await phase('PROGRESS_INSTALL', () => installComponents(ROOT, catalog.progressFiles));
  await phase('INSTALLED', () => verifyCatalog(prepared, selected, true));
  const capture = await phase('BASELINE', async () => {
    const result = await weatherComponentProgressCache({ mode: 'capture-base', repositoryRoot: ROOT,
      basePath: selected.baselinePath, protectedBundleSha256: prepared.protectedBundleContentSha256 });
    assert.equal(result.captured, true); await verifyBaseline(prepared, selected); return result;
  });
  await phase('INSTALLED', () => verifyCatalog(prepared, selected, true));
  await phase('ORIGINALS', async () => assert.deepEqual(await originalSnapshot(prepared), originals));
  await phase('REPORT', () => writeExclusive(selected.baselineReportPath, capture));
  const baselineSha256 = await phase('BASELINE', async () => (await measured(selected.baselinePath, 4096)).sha256);
  const report = { ...prepared, installed: true, capture, baselineSha256 };
  report.originals = originals;
  await phase('REPORT', () => writeExclusive(selected.reportPath, report));
  return report;
}
export async function verifyInstalledNativeIdentityCheckpointRuntime() {
  assert.equal(arguments.length, 0, 'Only the fixed current job persistence evidence');
  await phase('SOURCE', async () => assertNativeIdentityRecoveryFrozen());
  const selected = await phase('LOCATIONS', () => locations('verify'));
  const report = await phase('VERIFY', () => checkedJson(selected.reportPath, 64 * 1024));
  await phase('VERIFY', async () => {
    assert.equal(report.installed, true); assert.equal(report.capture?.captured, true);
    assert(SHA.test(report.baselineSha256));
    await verifyCatalog(report, selected, true);
  });
  await phase('ORIGINALS', async () => assert.deepEqual(await originalSnapshot(report), report.originals));
  await phase('BASELINE', () => verifyBaseline(report, selected, report.baselineSha256));
  await phase('BASELINE', () => verifyCaptureReport(selected, report.capture));
  return Object.freeze({ persistedInputsVerified: true, admission: 'NO_ADMISSION', oldGcmReportPath: report.oldGcmReportPath,
    originalBundlePath: report.originalBundlePath, protectedBundleContentSha256: report.protectedBundleContentSha256,
    captured: true });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await phase('SOURCE', async () => { assert.equal(process.argv.length, 3); assert(['install', 'verify'].includes(process.argv[2])); });
    const result = await (process.argv[2] === 'install'
      ? installNativeIdentityCheckpointRuntime() : verifyInstalledNativeIdentityCheckpointRuntime());
    // Full report stays private; no numeric values, user data or raw errors.
    console.log(JSON.stringify({ installed: process.argv[2] === 'install', persistedInputsVerified: true,
      captured: result.captured ?? result.capture.captured, admission: 'NO_ADMISSION' }));
  } catch (error) { console.error(JSON.stringify(refusal(error))); process.exitCode = 1; }
}
