#!/usr/bin/env node
// SOURCE PREPARATION ONLY until the fixed restore destination and hosted
// B/S read are separately authorized. A report/boolean is never admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withIssuedAccountAssistantSource } from './check-account-assistant-issued-source.mjs';
import { createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime,
  restoreProtectedPrivateProductionRuntime } from './protected-private-production-runtime.mjs';
import { verifyPrivateProductionRuntimeBundle, restorePrivateProductionRuntimeBundle }
  from './private-production-runtime-bundle.mjs';
import { createProtectedRavScoreCheckpointRequester, createProtectedRavScoreCheckpointVersionRequester,
  PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY, PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES }
  from './protected-ravscore-continuation-checkpoint.mjs';
import { buildCurrentGridSamplingOriginalRestoreExpectation,
  assertCurrentGridSamplingOriginalExpectation, CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY,
  CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY, CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY }
  from './lib/bounded-conditions-predecessor-transition.mjs';
import { assertRestoredOriginalInventory,
  validateCurrentGridOriginalPairGeneration, sameStructuredValue }
  from './migrate-post-cutover-private-runtime.mjs';
import { hydratePrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { readOwnerCurrentTransitionArchive } from './lib/ravscore-production-part-pipeline.mjs';
import { CURRENT_GRID_MIGRATION, readCurrentGridCanonicalSource } from './lib/current-grid-successor-source.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const execFile = promisify(execFileCallback);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const key = PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
const fullSuffix = `?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2`;
const versionSuffix = `?document_key=eq.${encodeURIComponent(key)}&select=document_key,version&limit=2`;
const families = [CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY,
  CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY, CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
function same(left, right, label) { assert(sameStructuredValue(left, right), label); }
function inside(parent, child) {
  const rel = path.relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel);
}
async function digestPrivateRuntimeFile(file) {
  await noLinks(path.resolve(file));
  const before = await fs.lstat(file);
  assert(before.isFile() && !before.isSymbolicLink(), 'Regular original file required');
  const hash = crypto.createHash('sha256'); let bytes = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  const after = await fs.lstat(file);
  assert(after.isFile() && !after.isSymbolicLink() && before.dev === after.dev
    && before.ino === after.ino && before.size === after.size && bytes === before.size
    && before.mtimeMs === after.mtimeMs, 'Original file changed during full verification');
  return { bytes, sha256: hash.digest('hex') };
}
async function noLinks(absolute) {
  let at = path.parse(absolute).root;
  for (const item of path.relative(at, absolute).split(path.sep).filter(Boolean)) {
    at = path.join(at, item);
    const stat = await fs.lstat(at);
    assert(!stat.isSymbolicLink(), 'Original proof path must not traverse a symlink');
  }
}
async function privateDirectory(privateRoot, directory) {
  const root = await fs.realpath(privateRoot), actual = await fs.realpath(directory);
  await noLinks(path.resolve(privateRoot)); await noLinks(path.resolve(directory));
  assert((root === actual || inside(root, actual)) && !inside(ROOT, root) && root !== ROOT
    && !inside(root, ROOT), 'Original proof directory must remain outside the checkout');
  assert((await fs.lstat(actual)).isDirectory());
  return actual;
}
async function json(file, maximumBytes) {
  await noLinks(path.resolve(file));
  const before = await digestPrivateRuntimeFile(file);
  assert(before.bytes > 1 && before.bytes <= maximumBytes, 'Bounded original JSON required');
  const bytes = await fs.readFile(file);
  assert.equal(bytes.length, before.bytes); assert.equal(sha(bytes), before.sha256);
  return JSON.parse(bytes.toString('utf8'));
}
export function assertOriginalCheckpointRow(rows, identity) {
  assert(Array.isArray(rows) && rows.length === 1, 'One authenticated original checkpoint required');
  const row = rows[0];
  assert(object(row));
  same(Object.keys(row).sort(), ['document_key','payload','version'], 'Exact original checkpoint row');
  assert(row.document_key === key && Number.isSafeInteger(row.version) && row.version > 0);
  const payload = row.payload, policy = CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
  assert(object(payload), 'Whole original checkpoint payload required');
  assert.equal(payload.datasetId, identity.datasetId);
  assert.equal(payload.productionReferenceAt, identity.productionReferenceAt);
  assert.equal(payload.continuationStateContractSha256, policy.sourceContractHashes.continuationStateContractSha256);
  same(payload.modelBinding, policy.sourceModelBinding, 'Active S must be the exact selected c1ac family');
  same(payload.candidateGRollbackCompanion?.modelBinding, policy.sourceCandidateModelBinding,
    'Active S companion must be the exact selected 2fd family');
  return row;
}
export async function assertFreshOriginalIdentities({ identity, checkpointVersion, request, checkpointVersionRequest }) {
  const fresh = await describeCurrentProtectedPrivateProductionRuntime({ request });
  same(fresh, identity, 'Protected current B pointer changed before SQL');
  const rows = await checkpointVersionRequest(versionSuffix, {}, 'version read');
  assert(Array.isArray(rows) && rows.length === 1 && object(rows[0]));
  same(Object.keys(rows[0]).sort(), ['document_key','version'], 'Exact checkpoint version readback');
  assert.equal(rows[0].document_key, key);
  assert.equal(rows[0].version, checkpointVersion, 'Protected S version changed before SQL');
}
// Real normal bundle/full-file checks plus the genuine historical S producer
// and loader. No new-T migration, family retag or caller-supplied validator.
export async function verifyCurrentGridPrewriteOriginals({ privateRoot, bundlePath, restoredRoot,
  expected, identity, checkpointPath, checkpointVersion, request, checkpointVersionRequest, now }) {
  assertCurrentGridSamplingOriginalExpectation(expected);
  assert.equal(expected.targetReferenceAt, identity.productionReferenceAt,
    'Binding-only prewrite verifies same-T originals, not a new-T migrated proxy');
  const root = await privateDirectory(privateRoot, privateRoot);
  const restored = await privateDirectory(root, restoredRoot);
  const canonicalBundlePath = await privateDirectory(root, bundlePath);
  // Windows may expose one directory through both long and 8.3 names. Compare
  // the existing file's physical canonical path only after rejecting links.
  await noLinks(path.resolve(checkpointPath));
  const canonicalCheckpointPath = await fs.realpath(checkpointPath);
  assert(inside(root, canonicalCheckpointPath), 'Original checkpoint path must remain inside its private proof root');
  assert(Number.isSafeInteger(checkpointVersion) && checkpointVersion > 0,
    'Original checkpoint version must be a positive safe integer');
  const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot: root, bundlePath: canonicalBundlePath,
    repositoryRoot: ROOT, expected, now });
  const manifest = await json(path.join(canonicalBundlePath, 'manifest.json'), 128 * 1024);
  await assertRestoredOriginalInventory(restored, manifest);
  const sourcePath = path.join(restored, 'data/live/conditions.json');
  const original = hydratePrivateConditionsHourly(await json(sourcePath, Number.MAX_SAFE_INTEGER));
  assert.equal(original.datasetId, identity.datasetId);
  assert.equal(original.productionReferenceAt, identity.productionReferenceAt);
  const { activeParts } = validateCurrentGridOriginalPairGeneration(original);
  const archived = readOwnerCurrentTransitionArchive(original.ravScoreCurrentSourceDomainTransitions,
    activeParts, { targetReferenceAt: identity.productionReferenceAt });
  // Normal archive validation above also retains valid earlier families. The
  // three exact grid families are counted separately, never generic aliases.
  const archiveFamilies = Object.fromEntries(['ffc','249','c1ac'].map(name => [name, 0]));
  for (const record of Object.values(archived)) {
    const index = families.findIndex(policy => policy.sourceModelBinding.modelBundleSha256
      === record.originalIntegratedState.modelBundleSha256);
    if (index >= 0) archiveFamilies[['ffc','249','c1ac'][index]] += 1;
  }
  const checkpointDigest = await digestPrivateRuntimeFile(checkpointPath);
  const payload = await json(checkpointPath, PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES);
  assertOriginalCheckpointRow([{ document_key: key, version: checkpointVersion, payload }], identity);
  await withIssuedAccountAssistantSource(async issuedRoot => {
    const old = await import(pathToFileURL(path.join(issuedRoot, 'scripts/ravscore-continuation-checkpoint.mjs')).href);
    // Even an unexpectedly legacy S must not let the normal loader reattest
    // the preserved original file. Validate only an owned byte-exact copy.
    const validationCopy = path.join(issuedRoot, 'original-validation-checkpoint.json');
    await fs.copyFile(checkpointPath, validationCopy, fs.constants.COPYFILE_EXCL);
    same(await digestPrivateRuntimeFile(validationCopy), checkpointDigest, 'Exact validation-only S copy');
    const loaded = await old.loadRavScoreContinuationCheckpointForTarget({ checkpointPath: validationCopy,
      targetReference: identity.productionReferenceAt, repositoryRoot: issuedRoot });
    assert.equal(loaded.loaded, true); assert.equal(loaded.partCount, 673);
    assert.equal(loaded.continuationReattestedFromImplementationSha256, null);
    same(await digestPrivateRuntimeFile(validationCopy), checkpointDigest,
      'Historical validation must leave every restored original S byte untouched');
    const calculated = path.join(issuedRoot, 'same-original-checkpoint.json');
    await old.saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath: calculated,
      repositoryRoot: issuedRoot });
    same(await json(calculated, PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES), payload,
      'Authenticated original S must equal the normal old producer of all 673 B pairs');
  });
  await assertRestoredOriginalInventory(restored, manifest);
  same(await digestPrivateRuntimeFile(checkpointPath), checkpointDigest, 'Original S bytes changed');
  await assertFreshOriginalIdentities({ identity, checkpointVersion, request, checkpointVersionRequest });
  return Object.freeze({ kind: 'CURRENT_GRID_ORIGINAL_PREWRITE', sourceHead: identity.sourceHead,
    datasetId: identity.datasetId, productionReferenceAt: identity.productionReferenceAt,
    bundleContentSha256: verified.bundleContentSha256, fileCount: verified.fileCount,
    partCount: 673, checkpointVersion, checkpointSha256: checkpointDigest.sha256,
    checkpointBytes: checkpointDigest.bytes, archiveFamilies, privatePayloadIncluded: false,
    originalBytesUnchanged: true, newGridEvidenceClaimed: false });
}
async function locations(mode) {
  assert.equal(process.env.RAVRADAR_CURRENT_GRID_UPGRADE_OPT_IN, 'true');
  assert.match(String(process.env.GITHUB_RUN_ID), /^[1-9][0-9]*$/);
  assert.match(String(process.env.GITHUB_RUN_ATTEMPT), /^[1-9][0-9]*$/);
  const parent = await fs.realpath(process.env.RUNNER_TEMP);
  await noLinks(path.resolve(process.env.RUNNER_TEMP));
  const root = path.join(parent, `ravradar-current-grid-binding-prewrite-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`);
  assert(!inside(ROOT, root) && !inside(root, ROOT) && root !== ROOT);
  if (mode === 'prepare') await fs.mkdir(root, { mode: 0o700 }); // Existing target refuses.
  await privateDirectory(root, root);
  return { privateRoot: root, bundlePath: path.join(root, 'bundle'), restoredRoot: path.join(root, 'restored'),
    checkpointPath: path.join(root, 'original-checkpoint.json'), saved: path.join(root, 'identity.json'),
    receipt: path.join(root, 'receipt.json') };
}
async function main() {
  assert.equal(process.argv.length, 3, 'Only the fixed prepare or verify-plan operation is accepted');
  const mode = process.argv[2]; assert(['prepare','verify-plan'].includes(mode));
  await readCurrentGridCanonicalSource(); // Actual immutable 220 and all predecessor source guards.
  const files = await locations(mode), clients = createProtectedPrivateRuntimeClients();
  const request = clients.documentRequest, checkpointVersionRequest = createProtectedRavScoreCheckpointVersionRequester();
  let saved;
  if (mode === 'prepare') {
    const identity = await describeCurrentProtectedPrivateProductionRuntime({ request });
    const now = new Date().toISOString();
    const expected = await buildCurrentGridSamplingOriginalRestoreExpectation({ sourceDescription: identity,
      targetReferenceAt: identity.productionReferenceAt, now });
    assert(expected, 'Only the reviewed selected original family can be restored');
    const restored = await restoreProtectedPrivateProductionRuntime({ privateRoot: files.privateRoot,
      bundlePath: files.bundlePath, expected, request, storage: clients.storage, now });
    assert.equal(restored.restored, true);
    await restorePrivateProductionRuntimeBundle({ privateRoot: files.privateRoot, bundlePath: files.bundlePath,
      outputPath: files.restoredRoot, expected, targetReferenceAt: identity.productionReferenceAt,
      minimumReferenceAt: identity.productionReferenceAt, minimumGeneratedAt: identity.generatedAt, now });
    const row = assertOriginalCheckpointRow(await createProtectedRavScoreCheckpointRequester()(fullSuffix, {}, 'read'), identity);
    await fs.writeFile(files.checkpointPath, JSON.stringify(row.payload) + '\n', { flag: 'wx', mode: 0o600 });
    saved = { identity, expected, checkpointVersion: row.version, now };
    await fs.writeFile(files.saved, JSON.stringify(saved) + '\n', { flag: 'wx', mode: 0o600 });
  } else saved = await json(files.saved, 128 * 1024);
  const receipt = await verifyCurrentGridPrewriteOriginals({ ...files, ...saved, request, checkpointVersionRequest });
  if (mode === 'prepare') await fs.writeFile(files.receipt, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
  else {
    // Receipts are only preservation comparisons. Fresh authenticated checks
    // above must run again; no JSON boolean or inherited VERIFIED env is used.
    same(await json(files.receipt, 128 * 1024), receipt, 'Same original receipt changed');
    const args = [path.join(ROOT, 'scripts/verify-code-only-migration-plan.mjs'),
      '--migration-list', path.join(process.env.RUNNER_TEMP, 'weather-binding-migrations-plan.txt'),
      '--dry-run', path.join(process.env.RUNNER_TEMP, 'weather-binding-migrations-dry-run.txt'),
      '--migrations-directory', path.join(process.env.RAVRADAR_BINDING_MIGRATION_WORKDIR, 'supabase/migrations'),
      '--current-grid-prewrite-plan', '--require-prewrite-gate', '--expected-pending-version', CURRENT_GRID_MIGRATION.version];
    await execFile(process.execPath, args, { cwd: ROOT, timeout: 30_000, maxBuffer: 128 * 1024,
      env: { ...process.env, RAVRADAR_CURRENT_GRID_PREWRITE_REQUIRED: 'true',
        RAVRADAR_CURRENT_GRID_PREWRITE_VERIFIED: 'true' } });
  }
  console.log(JSON.stringify({ status: mode === 'prepare' ? 'originals-preserved' : 'same-original-exact-plan-verified',
    partCount: receipt.partCount, fileCount: receipt.fileCount, privatePayloadIncluded: false,
    newGridEvidenceClaimed: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('CURRENT_GRID_ORIGINAL_PREWRITE_REFUSED'); process.exitCode = 1;
});
