import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { verifyPrivateProductionRuntimeBundle, canonicalPrivateRuntimeJson }
  from './private-production-runtime-bundle.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { createProtectedPrivateRuntimeClients, validateProtectedPrivateRuntimePointer,
  PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { assertNativeIdentityBindingsFrozen } from './lib/native-sampling-identity-successor-source.mjs';

const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const same = (a, b) => canonicalPrivateRuntimeJson(a) === canonicalPrivateRuntimeJson(b);
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const tuple = ['datasetId', 'productionReferenceAt', 'generatedAt', 'bundleContentSha256'];
const boundaries = new Set(['request', 'pointer', 'restore', 'identity', 'ancestry',
  'installed-files', 'B-S-compare', 'active-source', 'rebuilt-B']);
export function completedRuntimeFailureCode(error) {
  return 'COMPLETED_PRIVATE_RUNTIME_REFUSED_' + (boundaries.has(error?.completedRuntimeBoundary)
    ? error.completedRuntimeBoundary.toUpperCase().replaceAll('-', '_') : 'UNKNOWN');
}
async function atBoundary(code, operation) {
  try { return await operation(); }
  catch (error) {
    if (boundaries.has(error?.completedRuntimeBoundary)) throw error;
    const failure = new Error('COMPLETED_PRIVATE_RUNTIME_BOUNDARY_REFUSED');
    failure.completedRuntimeBoundary = code;
    throw failure;
  }
}

export function assertCompletedPrivateRuntimeRequest(env = process.env) {
  assert.equal(env.COMPLETED_PRIVATE_RUNTIME, 'true');
  assert.equal(env.GITHUB_REF, 'refs/heads/main');
  assert.equal(env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(env.GITHUB_RUN_ATTEMPT, '1');
  assert.match(env.GITHUB_SHA || '', /^[a-f0-9]{40}$/);
  assert.match(env.RAVRADAR_PRODUCTION_TARGET_HOUR || '', /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/);
  for (const key of ['QUICK_CONFIRMATION', 'CHECKPOINT_ONLY', 'EPOCH_BOOTSTRAP',
    'EPOCH_REENTRY', 'NATIVE_IDENTITY_RECOVERY', 'EXTENDED_PROVIDER_BOOTSTRAP', 'PRODUCE_HANDOFF'])
    assert.equal(env[key], 'false', key);
  assert.equal(env.QUICK_PROGRESS_SOURCE, '');
  assert.equal(env.CHECKPOINT_TARGET_HOUR, '');
}

async function installedFiles(root, manifest) {
  const result = [];
  for (const entry of manifest.files) {
    const file = path.resolve(root, entry.relativePath);
    const relative = path.relative(root, file);
    assert(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
    let prefix = root;
    for (const segment of relative.split(path.sep)) {
      prefix = path.join(prefix, segment);
      assert.equal((await fs.lstat(prefix)).isSymbolicLink(), false);
    }
    const stat = await fs.lstat(file);
    assert(stat.isFile() && stat.size === entry.bytes);
    const bytes = await fs.readFile(file);
    assert.equal(digest(bytes), entry.sha256, 'INSTALLED_COMPLETED_RUNTIME_CHANGED');
    result.push({ relativePath: entry.relativePath, bytes: stat.size, sha256: entry.sha256 });
  }
  return result;
}

export function assertCompletedPrivateRuntimeIdentity({ manifest, current, restored, expected, active, target }) {
  assert(active && active.model === 'integrated' && active.status === 'INTEGRATED_ACTIVE'
    && active.pending === false && typeof active.calibrationEligible === 'boolean'
    && active.sourceRows && Number.isSafeInteger(active.sourceRows.operationalVersion)
    && Number.isSafeInteger(active.sourceRows.profileVersion));
  for (const key of tuple) {
    assert.equal(typeof manifest[key], 'string');
    assert.equal(current[key], manifest[key], key);
    assert.equal(restored[key], manifest[key], key);
  }
  assert.equal(current.sourceHead, restored.sourceHead);
  assert.match(current.sourceHead || '', /^[a-f0-9]{40}$/);
  for (const key of ['modelBinding', 'contractHashes']) {
    assert(same(manifest[key], current[key]) && same(manifest[key], restored[key])
      && same(manifest[key], expected[key]), key);
  }
  assert.equal(manifest.productionReferenceAt, new Date(target).toISOString());
  assert(Date.parse(manifest.productionReferenceAt) > Date.parse(active.productionReferenceAt));
  assert.notEqual(manifest.datasetId, active.datasetId);
  assert.equal(manifest.zoneCount, 210);
  assert.equal(manifest.partCount, 673);
}

export function assertCompletedRuntimePublicIdentity(receipt, manifest) {
  for (const key of ['datasetId', 'productionReferenceAt', 'generatedAt'])
    assert.equal(manifest[key], receipt[key], 'COMPLETED_RUNTIME_PUBLIC_IDENTITY_CHANGED');
}

export function assertCompletedRuntimeProducerAncestry(root, producer, head) {
  assert.match(producer || '', /^[a-f0-9]{40}$/);
  assert.match(head || '', /^[a-f0-9]{40}$/);
  execFileSync('git', ['merge-base', '--is-ancestor', producer, head], { cwd: root, stdio: 'pipe' });
}

export async function readCompletedPrivateRuntimePin(request = null) {
  return atBoundary('pointer', async () => {
  assertNativeIdentityBindingsFrozen();
  request ??= createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' }).documentRequest;
  const key = PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;
  const rows = await request(`?document_key=eq.${encodeURIComponent(key)}&select=document_key,payload,version&limit=2`, {}, 'read');
  assert(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key);
  const version = Number(rows[0].version);
  assert(Number.isSafeInteger(version) && version > 0);
  const pointer = validateProtectedPrivateRuntimePointer(rows[0].payload);
  return { descriptor: pointer.current, pointerVersion: version,
    pin: digest(canonicalPrivateRuntimeJson({ descriptor: pointer.current, pointerVersion: version })) };
  });
}

export async function admitCompletedPrivateRuntime({ root, privateRoot, bundle, currentPath,
  restoredPath, expectedPath, activePath, checkpointPath, receiptPath, target, head,
  readPin = readCompletedPrivateRuntimePin }) {
  const verified = await atBoundary('restore', async () => verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath: bundle,
    repositoryRoot: root, expected: await json(expectedPath) }));
  const manifest = verified.manifest;
  const [current, restored, expected, active] = await atBoundary('identity', () => Promise.all(
    [currentPath, restoredPath, expectedPath, activePath].map(json)));
  const live = await readPin();
  await atBoundary('pointer', () => {
  assert.equal(live.pin, process.env.COMPLETED_PRIVATE_RUNTIME_PIN, 'COMPLETED_RUNTIME_POINTER_CHANGED');
  for (const key of [...tuple, 'sourceHead', 'modelBinding', 'contractHashes'])
    assert(same(live.descriptor[key], current[key]), 'COMPLETED_RUNTIME_DESCRIPTOR_CHANGED');
  });
  await atBoundary('identity', () => assertCompletedPrivateRuntimeIdentity({ manifest, current, restored, expected, active, target }));
  await atBoundary('ancestry', () => assertCompletedRuntimeProducerAncestry(root, current.sourceHead, head));
  const files = await atBoundary('installed-files', () => installedFiles(root, manifest));
  const parent = await fs.realpath(os.tmpdir());
  const own = await fs.mkdtemp(path.join(parent, 'rr-completed-checkpoint-'));
  let checkpointSha256;
  try { await atBoundary('B-S-compare', async () => {
    const derivedPath = path.join(own, 'checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ repositoryRoot: root,
      sourcePath: path.join(root, 'data/live/conditions.json'), checkpointPath: derivedPath });
    const [derived, saved] = await Promise.all([derivedPath, checkpointPath].map(json));
    assert(same(derived, saved), 'COMPLETED_B_AND_CENTRAL_S_DIFFER');
    checkpointSha256 = digest(canonicalPrivateRuntimeJson(saved));
  });
  } finally {
    await fs.rm(own, { recursive: true, force: true });
  }
  const receipt = { schemaVersion: 1, kind: 'COMPLETED_PROTECTED_RUNTIME_ADMISSION',
    datasetId: manifest.datasetId, productionReferenceAt: manifest.productionReferenceAt,
    generatedAt: manifest.generatedAt, bundleContentSha256: manifest.bundleContentSha256,
    originalManifestSha256: digest(canonicalPrivateRuntimeJson(manifest)),
    activeSha256: digest(canonicalPrivateRuntimeJson(active)), checkpointSha256,
    sourceHead: current.sourceHead, consumerHead: head, pin: live.pin, files,
    providerRequestsPerformed: false, scoringPerformed: false, sourceAdmission: true };
  await fs.writeFile(receiptPath, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
  return receipt;
}

export async function verifyCompletedPrivateRuntime({ root, receiptPath, bundle, checkpointPath,
  requireRebuiltBundle = false, readPin = readCompletedPrivateRuntimePin }) {
  const receipt = await json(receiptPath);
  assert.equal(receipt.kind, 'COMPLETED_PROTECTED_RUNTIME_ADMISSION');
  assert.equal(receipt.consumerHead, process.env.GITHUB_SHA);
  const live = await readPin();
  await atBoundary('pointer', () => assert.equal(live.pin, receipt.pin, 'COMPLETED_RUNTIME_POINTER_CHANGED'));
  await atBoundary('installed-files', () => installedFiles(root, { files: receipt.files }));
  await atBoundary('B-S-compare', async () => assert.equal(digest(canonicalPrivateRuntimeJson(await json(checkpointPath))), receipt.checkpointSha256));
  if (requireRebuiltBundle) {
    await atBoundary('rebuilt-B', async () => {
    const manifest = await json(path.join(bundle, 'manifest.json'));
    assert.equal(digest(canonicalPrivateRuntimeJson(manifest)), receipt.originalManifestSha256,
      'REBUILT_COMPLETED_B_MANIFEST_CHANGED');
    assert.equal(manifest.bundleContentSha256, receipt.bundleContentSha256);
    });
  }
  return receipt;
}

async function main() {
  const env = process.env;
  const root = path.resolve(env.GITHUB_WORKSPACE);
  const bundle = env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  const temporary = env.RUNNER_TEMP;
  const receiptPath = path.join(temporary, 'completed-private-runtime-admission.json');
  const checkpointPath = path.join(root, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  const common = { root, bundle, receiptPath, checkpointPath };
  if (process.argv[2] === 'pin') {
    const pinned = await readCompletedPrivateRuntimePin();
    const target = pinned.descriptor.productionReferenceAt.replace('.000Z', 'Z');
    await atBoundary('request', () => assertCompletedPrivateRuntimeRequest({ ...env, RAVRADAR_PRODUCTION_TARGET_HOUR: target }));
    await fs.appendFile(env.GITHUB_OUTPUT, `target_hour=${target}\ncompleted_private_runtime_pin=${pinned.pin}\n`);
  } else if (process.argv[2] === 'request') await atBoundary('request', () => assertCompletedPrivateRuntimeRequest());
  else if (process.argv[2] === 'admit') {
    await admitCompletedPrivateRuntime({ ...common, privateRoot: env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
      currentPath: path.join(temporary, 'private-runtime-current-source.json'),
      restoredPath: path.join(temporary, 'private-runtime-restored-source.json'),
      expectedPath: path.join(root, '.cache/private-production-runtime-expected.json'),
      activePath: path.join(temporary, 'completed-runtime-active-source.json'),
      target: env.RAVRADAR_PRODUCTION_TARGET_HOUR, head: env.GITHUB_SHA });
  } else if (process.argv[2] === 'target') {
    const receipt = await verifyCompletedPrivateRuntime(common);
    await atBoundary('active-source', async () => {
    const active = await json(path.join(temporary, 'completed-runtime-active-source.json'));
    assert.equal(digest(canonicalPrivateRuntimeJson(active)), receipt.activeSha256, 'ACTIVE_CHANGED');
    assertCompletedRuntimePublicIdentity(receipt, await json(path.join(root, 'data/live/manifest.json')));
    });
  } else if (process.argv[2] === 'before-publish') {
    await verifyCompletedPrivateRuntime({ ...common, requireRebuiltBundle: true });
  } else throw new Error('UNKNOWN_COMPLETED_RUNTIME_OPERATION');
  console.log('COMPLETED_PRIVATE_RUNTIME_ADMISSION_PASS');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(completedRuntimeFailureCode(error)); process.exitCode = 1; });
}
