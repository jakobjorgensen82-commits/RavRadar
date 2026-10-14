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
import { withCurrentGridPrewriteStage as prewriteStage, currentGridPrewriteGuard as prewriteGuard,
  emitCurrentGridPrewriteRefusal } from './lib/current-grid-prewrite-diagnostic.mjs';
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
  prewriteGuard('ORIGINAL_S_ROW', 'ROW_SHAPE', () => assert(Array.isArray(rows) && rows.length === 1, 'One authenticated original checkpoint required'));
  const row = rows[0];
  prewriteGuard('ORIGINAL_S_ROW', 'ROW_SHAPE', () => assert(object(row)));
  prewriteGuard('ORIGINAL_S_ROW', 'ROW_KEYS', () => same(Object.keys(row).sort(), ['document_key','payload','version'], 'Exact original checkpoint row'));
  prewriteGuard('ORIGINAL_S_ROW', 'KEY_VERSION', () => assert(row.document_key === key && Number.isSafeInteger(row.version) && row.version > 0));
  const payload = row.payload, policy = CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
  prewriteGuard('ORIGINAL_S_ROW', 'PAYLOAD_SHAPE', () => assert(object(payload), 'Whole original checkpoint payload required'));
  prewriteGuard('ORIGINAL_S_ROW', 'DATASET', () => assert.equal(payload.datasetId, identity.datasetId));
  prewriteGuard('ORIGINAL_S_ROW', 'REFERENCE', () => assert.equal(payload.productionReferenceAt, identity.productionReferenceAt));
  prewriteGuard('ORIGINAL_S_ROW', 'CONTINUATION_BINDING', () => assert.equal(payload.continuationStateContractSha256, policy.sourceContractHashes.continuationStateContractSha256));
  prewriteGuard('ORIGINAL_S_ROW', 'ACTIVE_BINDING', () => same(payload.modelBinding, policy.sourceModelBinding, 'Active S must be the exact selected c1ac family'));
  prewriteGuard('ORIGINAL_S_ROW', 'COMPANION_BINDING', () => same(payload.candidateGRollbackCompanion?.modelBinding, policy.sourceCandidateModelBinding,
    'Active S companion must be the exact selected 2fd family'));
  return row;
}
export async function assertFreshOriginalIdentities({ identity, checkpointVersion, request, checkpointVersionRequest }) {
  const fresh = await prewriteStage('FINAL_POINTER', 'CURRENT_B_READ', () => describeCurrentProtectedPrivateProductionRuntime({ request }));
  prewriteGuard('FINAL_POINTER', 'CURRENT_B_MATCH', () => same(fresh, identity, 'Protected current B pointer changed before SQL'));
  const rows = await prewriteStage('FINAL_VERSION', 'CURRENT_S_READ', () => checkpointVersionRequest(versionSuffix, {}, 'version read'));
  prewriteGuard('FINAL_VERSION', 'CURRENT_S_MATCH', () => {
  assert(Array.isArray(rows) && rows.length === 1 && object(rows[0]));
  same(Object.keys(rows[0]).sort(), ['document_key','version'], 'Exact checkpoint version readback');
  assert.equal(rows[0].document_key, key);
  assert.equal(rows[0].version, checkpointVersion, 'Protected S version changed before SQL');
  });
}
// Real normal bundle/full-file checks plus the genuine historical S producer
// and loader. No new-T migration, family retag or caller-supplied validator.
export async function verifyCurrentGridPrewriteOriginals({ privateRoot, bundlePath, restoredRoot,
  expected, identity, checkpointPath, checkpointVersion, request, checkpointVersionRequest, now }) {
  prewriteGuard('RESTORE_EXPECTATION', 'EXACT_FAMILY', () => assertCurrentGridSamplingOriginalExpectation(expected));
  prewriteGuard('RESTORE_EXPECTATION', 'SAME_REFERENCE', () => assert.equal(expected.targetReferenceAt, identity.productionReferenceAt,
    'Binding-only prewrite verifies same-T originals, not a new-T migrated proxy'));
  const root = await prewriteStage('PRIVATE_ROOT', 'OWNED_DESTINATION', () => privateDirectory(privateRoot, privateRoot));
  const restored = await prewriteStage('PRIVATE_ROOT', 'RESTORED_DIRECTORY', () => privateDirectory(root, restoredRoot));
  const canonicalBundlePath = await prewriteStage('PRIVATE_ROOT', 'BUNDLE_DIRECTORY', () => privateDirectory(root, bundlePath));
  // Windows may expose one directory through both long and 8.3 names. Compare
  // the existing file's physical canonical path only after rejecting links.
  await prewriteStage('PRIVATE_ROOT', 'CHECKPOINT_PATH', async () => {
  await noLinks(path.resolve(checkpointPath));
  const canonicalCheckpointPath = await fs.realpath(checkpointPath);
  assert(inside(root, canonicalCheckpointPath), 'Original checkpoint path must remain inside its private proof root');
  assert(Number.isSafeInteger(checkpointVersion) && checkpointVersion > 0,
    'Original checkpoint version must be a positive safe integer');
  });
  const verified = await prewriteStage('WHOLE_ORIGINAL_ARCHIVE', 'AUTHENTIC_BUNDLE', () => verifyPrivateProductionRuntimeBundle({ privateRoot: root, bundlePath: canonicalBundlePath,
    repositoryRoot: ROOT, expected, now }));
  const manifest = await prewriteStage('WHOLE_ORIGINAL_ARCHIVE', 'MANIFEST', () => json(path.join(canonicalBundlePath, 'manifest.json'), 128 * 1024));
  await prewriteStage('WHOLE_ORIGINAL_ARCHIVE', 'RESTORED_INVENTORY', () => assertRestoredOriginalInventory(restored, manifest));
  const sourcePath = path.join(restored, 'data/live/conditions.json');
  const original = await prewriteStage('WHOLE_ORIGINAL_ARCHIVE', 'CONDITIONS', async () => hydratePrivateConditionsHourly(await json(sourcePath, Number.MAX_SAFE_INTEGER)));
  prewriteGuard('WHOLE_ORIGINAL_ARCHIVE', 'EXACT_IDENTITY', () => assert.equal(original.datasetId, identity.datasetId));
  prewriteGuard('WHOLE_ORIGINAL_ARCHIVE', 'EXACT_IDENTITY', () => assert.equal(original.productionReferenceAt, identity.productionReferenceAt));
  const { activeParts } = prewriteGuard('WHOLE_ORIGINAL_ARCHIVE', 'PARTS_AND_ARCHIVE', () => validateCurrentGridOriginalPairGeneration(original));
  const archived = prewriteGuard('WHOLE_ORIGINAL_ARCHIVE', 'PARTS_AND_ARCHIVE', () => readOwnerCurrentTransitionArchive(original.ravScoreCurrentSourceDomainTransitions,
    activeParts, { targetReferenceAt: identity.productionReferenceAt }));
  // Normal archive validation above also retains valid earlier families. The
  // three exact grid families are counted separately, never generic aliases.
  const archiveFamilies = Object.fromEntries(['ffc','249','c1ac'].map(name => [name, 0]));
  for (const record of Object.values(archived)) {
    const index = families.findIndex(policy => policy.sourceModelBinding.modelBundleSha256
      === record.originalIntegratedState.modelBundleSha256);
    if (index >= 0) archiveFamilies[['ffc','249','c1ac'][index]] += 1;
  }
  const checkpointDigest = await prewriteStage('ORIGINAL_S_BYTES', 'FULL_DIGEST', () => digestPrivateRuntimeFile(checkpointPath));
  const payload = await prewriteStage('ORIGINAL_S_BYTES', 'BOUNDED_JSON', () => json(checkpointPath, PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES));
  assertOriginalCheckpointRow([{ document_key: key, version: checkpointVersion, payload }], identity);
  await prewriteStage('OLD_ISSUED_SOURCE', 'FIXED_SOURCE_CALLBACK', () => withIssuedAccountAssistantSource(async issuedRoot => {
    const old = await prewriteStage('OLD_ISSUED_LOADER', 'MODULE', () => import(pathToFileURL(path.join(issuedRoot, 'scripts/ravscore-continuation-checkpoint.mjs')).href));
    // Even an unexpectedly legacy S must not let the normal loader reattest
    // the preserved original file. Validate only an owned byte-exact copy.
    const validationCopy = path.join(issuedRoot, 'original-validation-checkpoint.json');
    await prewriteStage('OLD_ISSUED_LOADER', 'EXCLUSIVE_VALIDATION_COPY', () => fs.copyFile(checkpointPath, validationCopy, fs.constants.COPYFILE_EXCL));
    await prewriteStage('OLD_ISSUED_LOADER', 'COPY_DIGEST', async () => same(await digestPrivateRuntimeFile(validationCopy), checkpointDigest, 'Exact validation-only S copy'));
    // Authenticated jsonb S preserves values, not object-key serialization order.
    // Reproduce every original B pair with the unchanged issued producer first;
    // full S equality is required before its raw producer bytes reach the loader.
    const calculated = path.join(issuedRoot, 'same-original-checkpoint.json');
    await prewriteStage('OLD_RECOMPUTE', 'SAVE_673', () => old.saveRavScoreContinuationCheckpoint({ sourcePath, checkpointPath: calculated,
      repositoryRoot: issuedRoot }));
    const calculatedDigest = await prewriteStage('OLD_ISSUED_LOADER', 'COPY_DIGEST', () => digestPrivateRuntimeFile(calculated));
    await prewriteStage('OLD_RECOMPUTE', 'EXACT_ORIGINAL_S', async () => same(await json(calculated, PROTECTED_RAVSCORE_CHECKPOINT_RESTORE_MAXIMUM_RESPONSE_BYTES), payload,
      'Authenticated original S must equal the normal old producer of all 673 B pairs'));
    const loaded = await prewriteStage('OLD_ISSUED_LOADER', 'LOAD_TARGET', () => old.loadRavScoreContinuationCheckpointForTarget({ checkpointPath: calculated,
      targetReference: identity.productionReferenceAt, repositoryRoot: issuedRoot }));
    prewriteGuard('OLD_ISSUED_LOADER', 'LOADED', () => assert.equal(loaded.loaded, true)); prewriteGuard('OLD_ISSUED_LOADER', 'PART_COUNT', () => assert.equal(loaded.partCount, 673));
    prewriteGuard('OLD_ISSUED_LOADER', 'NO_REATTEST', () => assert.equal(loaded.continuationReattestedFromImplementationSha256, null));
    await prewriteStage('OLD_ISSUED_LOADER', 'UNCHANGED_COPY', async () => same(await digestPrivateRuntimeFile(calculated), calculatedDigest,
      'Historical validation must leave its fully S-matched normal producer bytes untouched'));
    await prewriteStage('OLD_ISSUED_LOADER', 'UNCHANGED_COPY', async () => same(await digestPrivateRuntimeFile(validationCopy), checkpointDigest,
      'Historical validation must leave every restored original S byte untouched'));
  }));
  await prewriteStage('FINAL_ORIGINAL_BYTES', 'RESTORED_INVENTORY', () => assertRestoredOriginalInventory(restored, manifest));
  await prewriteStage('FINAL_ORIGINAL_BYTES', 'UNCHANGED_S', async () => same(await digestPrivateRuntimeFile(checkpointPath), checkpointDigest, 'Original S bytes changed'));
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
  prewriteGuard('CLI', 'FIXED_OPERATION', () => assert.equal(process.argv.length, 3, 'Only the fixed prepare or verify-plan operation is accepted'));
  const mode = process.argv[2]; prewriteGuard('CLI', 'FIXED_OPERATION', () => assert(['prepare','verify-plan'].includes(mode)));
  await prewriteStage('CURRENT220_SOURCE', 'FROZEN_SOURCE', () => readCurrentGridCanonicalSource()); // Actual immutable 220 and all predecessor source guards.
  const files = await prewriteStage('PRIVATE_ROOT', 'OWNED_DESTINATION', () => locations(mode)), clients = prewriteGuard('CLIENT_SETUP', 'EXISTING_AUTH', () => createProtectedPrivateRuntimeClients());
  const request = clients.documentRequest, checkpointVersionRequest = prewriteGuard('CLIENT_SETUP', 'EXISTING_AUTH', () => createProtectedRavScoreCheckpointVersionRequester());
  let saved;
  if (mode === 'prepare') {
    const identity = await prewriteStage('CURRENT_POINTER', 'AUTHENTICATED_B_READ', () => describeCurrentProtectedPrivateProductionRuntime({ request }));
    const now = new Date().toISOString();
    const expected = await prewriteStage('RESTORE_EXPECTATION', 'EXACT_FAMILY', () => buildCurrentGridSamplingOriginalRestoreExpectation({ sourceDescription: identity,
      targetReferenceAt: identity.productionReferenceAt, now }));
    prewriteGuard('RESTORE_EXPECTATION', 'EXACT_FAMILY', () => assert(expected, 'Only the reviewed selected original family can be restored'));
    const restored = await prewriteStage('AUTHENTICATED_B_RESTORE', 'NORMAL_RESTORE', () => restoreProtectedPrivateProductionRuntime({ privateRoot: files.privateRoot,
      bundlePath: files.bundlePath, expected, request, storage: clients.storage, now }));
    prewriteGuard('AUTHENTICATED_B_RESTORE', 'RESTORE_DISPOSITION', () => assert.equal(restored.restored, true));
    await prewriteStage('ORIGINAL_B_UNPACK', 'NORMAL_UNPACK', () => restorePrivateProductionRuntimeBundle({ privateRoot: files.privateRoot, bundlePath: files.bundlePath,
      outputPath: files.restoredRoot, expected, targetReferenceAt: identity.productionReferenceAt,
      minimumReferenceAt: identity.productionReferenceAt, minimumGeneratedAt: identity.generatedAt, now }));
    const row = await prewriteStage('AUTHENTICATED_S_READ', 'WHOLE_ROW', async () => assertOriginalCheckpointRow(await createProtectedRavScoreCheckpointRequester()(fullSuffix, {}, 'read'), identity));
    await prewriteStage('PRESERVE_ORIGINAL_S', 'EXCLUSIVE_CHECKPOINT_FILE', () => fs.writeFile(files.checkpointPath, JSON.stringify(row.payload) + '\n', { flag: 'wx', mode: 0o600 }));
    saved = { identity, expected, checkpointVersion: row.version, now };
    await prewriteStage('ORIGINAL_IDENTITIES', 'EXCLUSIVE_IDENTITY_FILE', () => fs.writeFile(files.saved, JSON.stringify(saved) + '\n', { flag: 'wx', mode: 0o600 }));
  } else saved = await prewriteStage('ORIGINAL_IDENTITIES', 'BOUNDED_IDENTITY_FILE', () => json(files.saved, 128 * 1024));
  const receipt = await verifyCurrentGridPrewriteOriginals({ ...files, ...saved, request, checkpointVersionRequest });
  if (mode === 'prepare') await prewriteStage('PRESERVATION_RECEIPT', 'EXCLUSIVE_FILE', () => fs.writeFile(files.receipt, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 }));
  else {
    // Receipts are only preservation comparisons. Fresh authenticated checks
    // above must run again; no JSON boolean or inherited VERIFIED env is used.
    await prewriteStage('PRESERVATION_RECEIPT', 'UNCHANGED', async () => same(await json(files.receipt, 128 * 1024), receipt, 'Same original receipt changed'));
    const args = [path.join(ROOT, 'scripts/verify-code-only-migration-plan.mjs'),
      '--migration-list', path.join(process.env.RUNNER_TEMP, 'weather-binding-migrations-plan.txt'),
      '--dry-run', path.join(process.env.RUNNER_TEMP, 'weather-binding-migrations-dry-run.txt'),
      '--migrations-directory', path.join(process.env.RAVRADAR_BINDING_MIGRATION_WORKDIR, 'supabase/migrations'),
      '--current-grid-prewrite-plan', '--require-prewrite-gate', '--expected-pending-version', CURRENT_GRID_MIGRATION.version];
    await prewriteStage('EXACT_MIGRATION_PLAN', 'NORMAL_CLI', () => execFile(process.execPath, args, { cwd: ROOT, timeout: 30_000, maxBuffer: 128 * 1024,
      env: { ...process.env, RAVRADAR_CURRENT_GRID_PREWRITE_REQUIRED: 'true',
        RAVRADAR_CURRENT_GRID_PREWRITE_VERIFIED: 'true' } }));
  }
  console.log(JSON.stringify({ status: mode === 'prepare' ? 'originals-preserved' : 'same-original-exact-plan-verified',
    partCount: receipt.partCount, fileCount: receipt.fileCount, privatePayloadIncluded: false,
    newGridEvidenceClaimed: false }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  emitCurrentGridPrewriteRefusal(error); process.exitCode = 1;
});
