// Fixed ordinary-workflow repair of CURRENT B -> central S. This is data
// reconciliation, NEVER an origin/native grant or an alternative B restore.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual as same } from 'node:util';
import { createProtectedPrivateRuntimeClients, validateProtectedPrivateRuntimePointer,
  PROTECTED_PRIVATE_RUNTIME_POLICY, describeCurrentProtectedPrivateProductionRuntime,
  describeTargetProtectedPrivateProductionRuntime } from './protected-private-production-runtime.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { buildPrivateRuntimeExpectation } from './private-production-runtime-workflow.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { createProtectedRavScoreCheckpointRequester, createProtectedRavScoreCheckpointVersionRequester,
  createProtectedRavScoreCheckpointRpcRequester,
  publishProtectedRavScoreContinuationCheckpoint, restoreProtectedRavScoreContinuationCheckpoint }
  from './protected-ravscore-continuation-checkpoint.mjs';
import { ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING as FAMILY }
  from './lib/established-native-current-origin-successor-source.mjs';
import { ASSISTANT_SAME_H0_BINDING as NEXT_FAMILY } from './lib/assistant-same-h0-successor-source.mjs';
import { withEstablishedNativeCurrentOrigin140000PredecessorSource }
  from './check-established-native-current-origin-predecessor-source.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const need = (condition, code) => assert(condition, 'PAIRED_PUBLICATION_' + code);
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const identityKeys = ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
  'bundleContentSha256', 'modelBinding', 'contractHashes'];
function checkpointReconcileFamily(descriptor) {
  // Only the two source-issued fixed families; null NEXT is deliberately inert.
  return [FAMILY, NEXT_FAMILY].find(family => family !== null
    && descriptor?.modelBinding?.modelBundleSha256 === family.I
    && descriptor?.contractHashes?.continuationStateContractSha256 === family.T) ?? null;
}
export function requiresPrivateRuntimeCheckpointReconcile(descriptor) {
  return checkpointReconcileFamily(descriptor) !== null;
}
export function assertPrivateRuntimeCheckpointPublicationDisposition(descriptor, disposition) {
  if (requiresPrivateRuntimeCheckpointReconcile(descriptor)) need(
    ['READY_PUBLISHED', 'MEASURED_WARMUP_PUBLISHED'].includes(disposition), 'S_DISPOSITION');
}
export function assertOrdinaryPrivateRuntimeCheckpointReconcileRequest(env = process.env) {
  need(env.OPERATIONAL_ACTION === 'integrated', 'OPERATIONAL_ACTION');
  for (const key of ['COMPLETED_PRIVATE_RUNTIME', 'CHECKPOINT_ONLY', 'QUICK_CONFIRMATION',
    'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP', 'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY',
    'NATIVE_IDENTITY_RECOVERY']) need(env[key] === 'false', 'NON_ORDINARY_REQUEST');
}
// Only the source-issued NEXT family's same-H0 metadata handoff can load an
// otherwise incompatible S through the whole immutable140000 normal loader.
// This is a data equality check, never origin/ForPart authority or a T allowlist.
function assertSameH0CheckpointMetadataInverse(original, prepared, current) {
  need(NEXT_FAMILY !== null && checkpointReconcileFamily(current) === NEXT_FAMILY, 'SAME_H0_FAMILY');
  need(original.datasetId === prepared.datasetId && prepared.datasetId === current.datasetId
    && original.productionReferenceAt === prepared.productionReferenceAt
    && prepared.productionReferenceAt === current.productionReferenceAt, 'SAME_H0_IDENTITY');
  need(original.modelBinding.modelBundleSha256 === FAMILY.I
    && original.candidateGRollbackCompanion.modelBinding.modelBundleSha256 === FAMILY.C
    && original.continuationStateContractSha256 === FAMILY.T, 'SAME_H0_PREDECESSOR');
  const inverse = structuredClone(prepared);
  need(inverse.modelBinding.modelBundleSha256 === NEXT_FAMILY.I
    && inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256 === NEXT_FAMILY.C
    && inverse.continuationStateContractSha256 === NEXT_FAMILY.T, 'SAME_H0_CURRENT');
  inverse.modelBinding.modelBundleSha256 = original.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256
    = original.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256 = original.continuationStateContractSha256;
  need(same(Object.keys(inverse.states).sort(), Object.keys(original.states).sort()), 'SAME_H0_PARTS');
  for (const [id, state] of Object.entries(inverse.states)) {
    need(state.modelBundleSha256 === NEXT_FAMILY.I && original.states[id].modelBundleSha256 === FAMILY.I,
      'SAME_H0_STATE_BINDING');
    state.modelBundleSha256 = original.states[id].modelBundleSha256;
  }
  for (const key of ['generationSha256', 'stateSha256']) inverse[key] = original[key];
  inverse.candidateGRollbackCompanion.generationSha256 = original.candidateGRollbackCompanion.generationSha256;
  need(same(inverse, original), 'SAME_H0_WHOLE_METADATA_INVERSE');
}
async function restoreCheckpointForReconcile({ current, derived, checkpointPath, request }) {
  try {
    const restored = await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath,
      targetReference: current.productionReferenceAt, request });
    return { saved: restored.restored ? await json(checkpointPath) : null, sameH0Metadata: false };
  } catch (error) {
    if (NEXT_FAMILY === null || checkpointReconcileFamily(current) !== NEXT_FAMILY
      || error.message !== 'RavScore checkpoint continuation implementation is incompatible') throw error;
    // The failed current loader leaves no destination. Do not replace a local S
    // or reuse its failed temporary representation as a qualified predecessor.
    await assert.rejects(fs.lstat(checkpointPath), { code: 'ENOENT' });
    return withEstablishedNativeCurrentOrigin140000PredecessorSource(async frozenRoot => {
      const frozen = await import(pathToFileURL(path.join(frozenRoot,
        'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
      const restored = await frozen.restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath,
        targetReference: current.productionReferenceAt, request });
      need(restored.restored, 'SAME_H0_PREDECESSOR_MISSING');
      const saved = await json(checkpointPath);
      assertSameH0CheckpointMetadataInverse(saved, derived, current);
      return { saved, sameH0Metadata: true };
    });
  }
}

async function readPointer(request) {
  const key = PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;
  const rows = await request(`?document_key=eq.${key}&select=document_key,payload,version&limit=2`, {}, 'read');
  need(Array.isArray(rows) && rows.length === 1 && rows[0].document_key === key
    && Number.isSafeInteger(Number(rows[0].version)) && Number(rows[0].version) > 0, 'POINTER');
  return { version: Number(rows[0].version), pointer: validateProtectedPrivateRuntimePointer(rows[0].payload,
    { allowHistoricalCurrentModelBinding: true }) };
}
async function stableFile(file, maximum) {
  let at = path.parse(path.resolve(file)).root;
  const parents = [];
  for (const piece of path.relative(at, path.resolve(file)).split(path.sep)) {
    at = path.join(at, piece); const stat = await fs.lstat(at, { bigint: true });
    need(!stat.isSymbolicLink(), 'LINK');
    if (at !== file) { need(stat.isDirectory(), 'PARENT'); parents.push([at, stat.dev, stat.ino, stat.mode]); }
  }
  const before = await fs.lstat(file, { bigint: true });
  need(before.isFile() && before.nlink === 1n && before.size >= 2n && before.size <= BigInt(maximum), 'FILE');
  let handle, fd, identity, raw, first;
  try {
    handle = await fs.open(file, 'r'); fd = handle.fd; identity = ownFileDescriptorIdentity(fd);
    const opened = await handle.stat({ bigint: true });
    need(['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].every(key => opened[key] === before[key]), 'FILE_CHANGED');
    raw = await handle.readFile(); need(BigInt(raw.length) === before.size, 'FILE_CHANGED');
    for (const after of [await handle.stat({ bigint: true }), await fs.lstat(file, { bigint: true })])
      need(['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].every(key => after[key] === before[key]), 'FILE_CHANGED');
    for (const [parent, dev, ino, mode] of parents) {
      const after = await fs.lstat(parent, { bigint: true });
      need(!after.isSymbolicLink() && after.dev === dev && after.ino === ino && after.mode === mode, 'PARENT_CHANGED');
    }
  } catch (error) { first = error; }
  if (handle) {
    try { await handle.close(); } catch (error) { first ??= error; }
    if (!await ownedFileDescriptorClosed(fd, identity)) first ??= new Error('PAIRED_PUBLICATION_CLOSE_UNPROVED');
  }
  if (first) throw first;
  return { raw, pin: { dev: before.dev, ino: before.ino, mode: before.mode, size: before.size,
    mtimeNs: before.mtimeNs, ctimeNs: before.ctimeNs, sha256: sha(raw), parents } };
}

// Like the normal protected publishers, injected requesters are transport seams,
// not authority. Production is ONLY the fixed CLI inside the shared serialized
// weather writer, after a fresh main check and actual verify/install of CURRENT B.
export async function reconcilePrivateRuntimeCheckpoint({ repositoryRoot = ROOT, privateRoot, bundlePath,
  checkpointPath = path.join(repositoryRoot, '.cache/ravscore-continuation-checkpoint/checkpoint.json'),
  expected, now = new Date().toISOString(), operationalAction = process.env.OPERATIONAL_ACTION,
  request, checkpointRequest, checkpointVersionRequest, rpcRequest } = {}) {
  need(operationalAction === 'integrated', 'OPERATIONAL_ACTION');
  request ??= createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' }).documentRequest;
  checkpointRequest ??= createProtectedRavScoreCheckpointRequester();
  checkpointVersionRequest ??= createProtectedRavScoreCheckpointVersionRequester();
  rpcRequest ??= createProtectedRavScoreCheckpointRpcRequester();
  const counts = { pointerReads: 0, checkpointReads: 0, checkpointVersionReads: 0, checkpointPublishCalls: 0, storageDownloads: 0 };
  const pointerRequest = (...args) => { counts.pointerReads++; return request(...args); };
  const Srequest = (...args) => { counts.checkpointReads++; return checkpointRequest(...args); };
  const Sversion = (...args) => { counts.checkpointVersionReads++; return checkpointVersionRequest(...args); };
  const before = await readPointer(pointerRequest), current = before.pointer.current;
  const family = checkpointReconcileFamily(current);
  need(family !== null, 'UNSUPPORTED_FAMILY');
  classifyProductionTargetFreshness({ target: current.productionReferenceAt, now, maximumAgeMinutes: 150 });
  need(path.isAbsolute(privateRoot) && path.isAbsolute(bundlePath) && path.dirname(bundlePath) === privateRoot, 'B_PATH');
  // No previous-generation fallback and no download: the caller already restored
  // B. Both normal descriptors and the whole versioned pointer bind that CURRENT.
  const described = await describeCurrentProtectedPrivateProductionRuntime({ request: pointerRequest });
  const target = await describeTargetProtectedPrivateProductionRuntime({ request: pointerRequest,
    targetReferenceAt: current.productionReferenceAt, datasetId: current.datasetId,
    bundleContentSha256: current.bundleContentSha256 });
  for (const key of identityKeys) need(same(described[key], current[key]) && same(target[key], current[key]), 'CURRENT_IDENTITY');
  expected ??= await buildPrivateRuntimeExpectation({ repositoryRoot, targetReferenceAt: current.productionReferenceAt, now });
  const verify = () => verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot,
    expected: { ...expected, datasetId: current.datasetId, productionReferenceAt: current.productionReferenceAt,
      generatedAt: current.generatedAt, bundleContentSha256: current.bundleContentSha256 } });
  const verified = await verify();
  for (const key of ['modelBinding', 'contractHashes']) need(same(verified.manifest[key], current[key]), 'B_IDENTITY');
  const originalPath = path.join(bundlePath, 'payload/data/live/conditions.json');
  const workingPath = path.join(repositoryRoot, 'data/live/conditions.json');
  const registryPath = path.join(repositoryRoot, 'data/live/coastal-parts-v2.json');
  const original = await stableFile(originalPath, 256 * 1024 * 1024);
  const working = await stableFile(workingPath, 256 * 1024 * 1024);
  const registry = await stableFile(registryPath, 16 * 1024 * 1024);
  const entry = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  need(entry && entry.bytes === original.raw.length && entry.sha256 === original.pin.sha256
    && working.raw.equals(original.raw), 'INSTALLED_B_CHANGED');
  const stable = async () => {
    need(same(await readPointer(pointerRequest), before), 'POINTER_CHANGED');
    for (const [file, previous, maximum] of [[originalPath, original, 256 * 1024 * 1024],
      [workingPath, working, 256 * 1024 * 1024], [registryPath, registry, 16 * 1024 * 1024]])
      need(same((await stableFile(file, maximum)).pin, previous.pin), 'INSTALLED_SOURCE_CHANGED');
  };
  // Exclusive local destination: an old Actions cache must not overtake the
  // authenticated readback. All remote JSONB ordering restoration stays normal.
  await assert.rejects(fs.lstat(checkpointPath), { code: 'ENOENT' });
  const parent = await fs.realpath(os.tmpdir()), work = await fs.mkdtemp(path.join(parent, 'rr-b-s-reconcile-'));
  const workIdentity = await fs.lstat(work, { bigint: true });
  let outcome, first;
  try {
    const derivedPath = path.join(work, 'derived/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ repositoryRoot, sourcePath: originalPath, checkpointPath: derivedPath });
    const derived = await json(derivedPath);
    need(derived.productionReferenceAt === current.productionReferenceAt, 'DERIVED_REFERENCE');
    const restoredPath = path.join(work, 'before/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    const restored = await restoreCheckpointForReconcile({ current, derived, checkpointPath: restoredPath, request: Srequest });
    let saved = restored.saved;
    let publishError = null;
    if (!same(derived, saved)) {
      // Missing/older SAME-family S, or the exact whole-inverse metadata
      // handoff above, can advance. Other same-time conflicts and S-ahead-B stop.
      need(restored.sameH0Metadata || saved === null || (saved.modelBinding.modelBundleSha256 === family.I
        && saved.continuationStateContractSha256 === family.T
        && Date.parse(saved.productionReferenceAt) < Date.parse(current.productionReferenceAt)), 'S_NOT_BEHIND');
      await stable();
      counts.checkpointPublishCalls++;
      try { await publishProtectedRavScoreContinuationCheckpoint({ checkpointPath: derivedPath,
        targetReference: current.productionReferenceAt, request: Sversion, rpcRequest }); }
      catch (error) { publishError = error; }
      const freshPath = path.join(work, 'after/.cache/ravscore-continuation-checkpoint/checkpoint.json');
      try {
        const readback = await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: freshPath,
          targetReference: current.productionReferenceAt, request: Srequest });
        need(readback.restored, 'S_READBACK_MISSING'); saved = await json(freshPath);
        need(same(derived, saved), 'S_READBACK_DIFFER');
      } catch (error) { throw publishError ?? error; }
      outcome = publishError ? 'COMMITTED_REPLY_LOST_READBACK_PROVED' : 'ADVANCED_READBACK_PROVED';
    } else outcome = 'ALREADY_PAIRED_READBACK_PROVED';
    need(same(derived, saved), 'B_S_DIFFER');
    await stable(); await verify();
    // Publish only the NORMAL, freshly validated remote representation locally.
    const localSource = path.join(work, outcome === 'ALREADY_PAIRED_READBACK_PROVED' ? 'before' : 'after',
      '.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await assert.rejects(fs.lstat(checkpointPath), { code: 'ENOENT' });
    await fs.rename(localSource, checkpointPath);
    return { paired: true, outcome, ...counts, requestCountsAreLogicalCalls: true,
      nativeAdmissionIssued: false, payloadLogged: false };
  } catch (error) { first = error; throw error; }
  finally {
    try {
      const after = await fs.lstat(work, { bigint: true });
      need(after.isDirectory() && !after.isSymbolicLink() && after.dev === workIdentity.dev && after.ino === workIdentity.ino
        && path.dirname(work) === parent, 'WORK_CHANGED');
      await fs.rm(work, { recursive: true, force: false });
    } catch (error) { if (!first) throw error; }
  }
}

async function main() {
  need(process.env.GITHUB_REF === 'refs/heads/main' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch', 'WORKFLOW');
  assertOrdinaryPrivateRuntimeCheckpointReconcileRequest();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const main = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim();
  need(head === process.env.GITHUB_SHA && head === main, 'MAIN');
  if (process.argv[2] === 'select') {
    const source = await json(path.join(process.env.RUNNER_TEMP, 'private-runtime-current-source.json'));
    await fs.appendFile(process.env.GITHUB_OUTPUT, `required=${requiresPrivateRuntimeCheckpointReconcile(source)}\n`);
  } else {
    need(process.argv[2] === 'reconcile', 'COMMAND');
    const result = await reconcilePrivateRuntimeCheckpoint({ privateRoot: process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
      bundlePath: process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE });
    await fs.appendFile(process.env.GITHUB_OUTPUT, `paired=${result.paired}\n`);
    console.log(JSON.stringify({ kind: 'PRIVATE_B_S_RECONCILE', ...result }));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('PRIVATE_B_S_RECONCILE_REFUSED'); process.exitCode = 1;
});
