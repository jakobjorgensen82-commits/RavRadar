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
import { LAST_MILE_ENCLOSURE_BINDING as NEXT_FAMILY }
  from './lib/last-mile-enclosure-successor-source.mjs';
import { withFrozenLastMileEnclosurePredecessorSource }
  from './check-last-mile-enclosure-predecessor-source.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_BINDING as METADATA_FAMILY}
  from './lib/account-statistics-assistant-successor-source.mjs';
import {withAuthenticated584PredecessorSource} from './check-account-statistics-assistant-predecessor-source.mjs';
import {assertEstablishedNativeCurrent584MetadataCheckpoint} from './lib/established-native-current-origin.mjs';
import {assertAccountStatisticsAssistantPrewriteCaller} from './account-statistics-assistant-prewrite.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_BINDING as NATIVE_METADATA_FAMILY,requireNativeOriginalContinuityOutput}
  from './lib/native-original-continuity-successor-source.mjs';
import {withAuthenticated585PredecessorSource} from './check-native-original-continuity-predecessor-source.mjs';
import {assertEstablishedNativeCurrent585MetadataCheckpoint} from './lib/established-native-current-origin.mjs';
import {assertNativeOriginalContinuityCodeOnlyCaller} from './select-native-original-continuity-code-only-source.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';

import {withAuthenticated591PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {ASSISTANT_LATER_H0_BINDING as ASSISTANT_LATER_FAMILY,
  ASSISTANT_PUBLIC587_SUCCESSOR_BINDING as ASSISTANT_PUBLIC587_FAMILY,
  ASSISTANT_PUBLIC588_SUCCESSOR_BINDING as ASSISTANT_PUBLIC588_FAMILY,
  ASSISTANT_PUBLIC590_SUCCESSOR_BINDING as ASSISTANT_PUBLIC590_FAMILY,
  ASSISTANT_PUBLIC591_SUCCESSOR_BINDING as ASSISTANT_PUBLIC591_FAMILY}
  from './lib/assistant-later-h0-successor-source.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const need = (condition, code) => assert(condition, 'PAIRED_PUBLICATION_' + code);
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const identityKeys = ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
  'bundleContentSha256', 'modelBinding', 'contractHashes'];
function reconcileFamily(descriptor) {
  return [FAMILY, NEXT_FAMILY, METADATA_FAMILY, NATIVE_METADATA_FAMILY,
    ASSISTANT_LATER_FAMILY, ASSISTANT_PUBLIC587_FAMILY,
    ASSISTANT_PUBLIC588_FAMILY,ASSISTANT_PUBLIC590_FAMILY,ASSISTANT_PUBLIC591_FAMILY].filter(Boolean).find(family =>
    descriptor?.modelBinding?.modelBundleSha256 === family.I
    && descriptor?.contractHashes?.continuationStateContractSha256 === family.T) ?? null;
}
export function requiresPrivateRuntimeCheckpointReconcile(descriptor) {
  return reconcileFamily(descriptor) !== null;
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
export function assertSavedPrivateRuntimeCheckpointReconcileRequest(env = process.env) {
  need(['integrated', 'integrated-historical-maintenance'].includes(env.OPERATIONAL_ACTION), 'SAVED_OPERATIONAL_ACTION');
  need(env.GITHUB_WORKFLOW === 'Deploy RavRadar code-only repair'
    && env.CONFIRMATION === 'DEPLOY-SAVED-WEATHER-REPAIR'
    && env.PUBLISH_NEWEST_SAVED_WEATHER === 'true', 'SAVED_REQUEST');
  for (const key of ['RESTART_ARCHIVED_WEATHER', 'COMPLETED_PRIVATE_RUNTIME', 'CHECKPOINT_ONLY',
    'QUICK_CONFIRMATION', 'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY', 'NATIVE_IDENTITY_RECOVERY',
    'UPGRADE_LAST_MILE_ENCLOSURE', 'UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',
    'UPGRADE_EXISTING_OWNER_EXPORT', 'UPGRADE_ACCOUNT_ASSISTANT', 'UPGRADE_STATISTICS_REVISION',
    'UPGRADE_ACCOUNT_STATISTICS_ASSISTANT', 'UPGRADE_NATIVE_ORIGINAL_CONTINUITY'])
    need(env[key] === 'false', 'SAVED_MODE_COLLISION');
  for (const key of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH',
    'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256']) need(env[key] === undefined, 'SAVED_MODE_COLLISION');
}
const checkpointQuery = '?document_key=eq.ravscore-continuation-checkpoint&select=document_key,payload,version&limit=2';
async function readCheckpointRows(request) {
  const rows = await request(checkpointQuery, {}, 'read');
  need(Array.isArray(rows) && rows.length <= 1 && rows.every(row =>
    row?.document_key === 'ravscore-continuation-checkpoint'
    && Number.isSafeInteger(Number(row.version)) && Number(row.version) > 0
    && row.payload && typeof row.payload === 'object'), 'S_ROW');
  return rows;
}
async function restoreReconcilePredecessor({ family, checkpointPath, targetReference, request }) {
  const rows = await readCheckpointRows(request);
  // Reader selection is NOT numerical admission. Normal current validation
  // remains unchanged; only an exact older140000 S gets its genuine old reader.
  const old591 = family === ASSISTANT_PUBLIC591_FAMILY && rows.length === 1
    && rows[0].payload.modelBinding?.modelBundleSha256 === ASSISTANT_PUBLIC590_FAMILY.I
    && rows[0].payload.continuationStateContractSha256 === ASSISTANT_PUBLIC590_FAMILY.T;
  if(old591) need(Number.isFinite(Date.parse(rows[0].payload.productionReferenceAt))
    && Date.parse(rows[0].payload.productionReferenceAt) < Date.parse(targetReference), 'GENUINE591_STRICTLY_OLDER');
  const old585 = family === NATIVE_METADATA_FAMILY && rows.length === 1
    && rows[0].payload.modelBinding?.modelBundleSha256 === METADATA_FAMILY.I
    && rows[0].payload.continuationStateContractSha256 === METADATA_FAMILY.T;
  const old584 = family === METADATA_FAMILY && rows.length === 1
    && rows[0].payload.modelBinding?.modelBundleSha256 === NEXT_FAMILY.I
    && rows[0].payload.continuationStateContractSha256 === NEXT_FAMILY.T;
  const old = family === NEXT_FAMILY && rows.length === 1
    && rows[0].payload.modelBinding?.modelBundleSha256 === FAMILY.I
    && rows[0].payload.continuationStateContractSha256 === FAMILY.T;
  const checkedRequest = async (...args) => {
    const fresh = await request(...args); need(same(fresh, rows), 'S_CHANGED_BEFORE_READ'); return fresh;
  };
  const options = { checkpointPath, targetReference, request: checkedRequest };
  let restored;
  if(old591) restored = await withAuthenticated591PredecessorSource(async sourceRoot=>{
    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);
  });
  else if(old585) restored = await withAuthenticated585PredecessorSource(async sourceRoot=>{
    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);
  });
  else if(old584) restored = await withAuthenticated584PredecessorSource(async sourceRoot=>{
    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);
  });
  else if (old) restored = await withFrozenLastMileEnclosurePredecessorSource(async sourceRoot => {
    const reader = await import(pathToFileURL(path.join(sourceRoot,
      'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);
  });
  else restored = await restoreProtectedRavScoreContinuationCheckpoint(options);
  return { restored, rows, predecessorFamily: old591 ? ASSISTANT_PUBLIC590_FAMILY : old585 ? METADATA_FAMILY : old584 ? NEXT_FAMILY : old ? FAMILY : family };
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
export async function reconcilePrivateRuntimeCheckpoint(options = {}) {
  need((options.operationalAction ?? process.env.OPERATIONAL_ACTION) === 'integrated', 'OPERATIONAL_ACTION');
  return reconcileAuthenticatedPrivateRuntimeCheckpoint(options);
}
export async function reconcileSavedPrivateRuntimeCheckpoint(options = {}) {
  assertSavedPrivateRuntimeCheckpointReconcileRequest();
  need((options.operationalAction ?? process.env.OPERATIONAL_ACTION) === process.env.OPERATIONAL_ACTION,
    'SAVED_OPERATIONAL_ACTION');
  return reconcileAuthenticatedPrivateRuntimeCheckpoint(options);
}
export async function reconcileAccountStatisticsAssistantPrivateRuntimeCheckpoint(options = {}) {
  assertAccountStatisticsAssistantPrewriteCaller(process.env);
  need(process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_SOURCE_ACTIVE === 'true'
    && process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_PHASE === 'installed'
    && process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN === 'false'
    && process.env.RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_CURRENT_FAMILY === 'current', 'METADATA_INSTALLED_CURRENT_REQUEST');
  need(['integrated','integrated-historical-maintenance'].includes(process.env.OPERATIONAL_ACTION), 'METADATA_OPERATIONAL_ACTION');
  need(options.operationalAction === undefined || options.operationalAction === process.env.OPERATIONAL_ACTION,
    'METADATA_OPERATIONAL_ACTION');
  const request=options.request ?? createProtectedPrivateRuntimeClients({storageBackend:'supabase'}).documentRequest;
  const source=await describeCurrentProtectedPrivateProductionRuntime({request});
  need(METADATA_FAMILY !== null && source.modelBinding?.modelBundleSha256 === METADATA_FAMILY.I
    && source.contractHashes?.continuationStateContractSha256 === METADATA_FAMILY.T, 'METADATA_CURRENT_FAMILY');
  return reconcileAuthenticatedPrivateRuntimeCheckpoint({...options,request});
}
export async function reconcileNativeOriginalContinuityPrivateRuntimeCheckpoint(options = {}) {
  requireNativeOriginalContinuityOutput();
  assertNativeOriginalContinuityCodeOnlyCaller(process.env);
  need(process.env.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SOURCE_ACTIVE === 'true'
    && process.env.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_PHASE === 'installed'
    && process.env.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN === 'false'
    && process.env.RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_CURRENT_FAMILY === 'current', 'NATIVE_METADATA_INSTALLED_CURRENT_REQUEST');
  need(['integrated','integrated-historical-maintenance'].includes(process.env.OPERATIONAL_ACTION), 'NATIVE_METADATA_OPERATIONAL_ACTION');
  need(options.operationalAction === undefined || options.operationalAction === process.env.OPERATIONAL_ACTION,
    'NATIVE_METADATA_OPERATIONAL_ACTION');
  const request=options.request ?? createProtectedPrivateRuntimeClients({storageBackend:'supabase'}).documentRequest;
  const source=await describeCurrentProtectedPrivateProductionRuntime({request});
  need(NATIVE_METADATA_FAMILY !== null && source.modelBinding?.modelBundleSha256 === NATIVE_METADATA_FAMILY.I
    && source.contractHashes?.continuationStateContractSha256 === NATIVE_METADATA_FAMILY.T, 'NATIVE_METADATA_CURRENT_FAMILY');
  return reconcileAuthenticatedPrivateRuntimeCheckpoint({...options,request});
}
async function reconcileAuthenticatedPrivateRuntimeCheckpoint({ repositoryRoot = ROOT, privateRoot, bundlePath,
  checkpointPath = path.join(repositoryRoot, '.cache/ravscore-continuation-checkpoint/checkpoint.json'),
  expected, now = new Date().toISOString(), operationalAction = process.env.OPERATIONAL_ACTION,
  request, checkpointRequest, checkpointVersionRequest, rpcRequest } = {}) {
  // Both public entry points have their distinct fixed request guard above.
  request ??= createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' }).documentRequest;
  checkpointRequest ??= createProtectedRavScoreCheckpointRequester();
  checkpointVersionRequest ??= createProtectedRavScoreCheckpointVersionRequester();
  rpcRequest ??= createProtectedRavScoreCheckpointRpcRequester();
  const counts = { pointerReads: 0, checkpointReads: 0, checkpointVersionReads: 0, checkpointPublishCalls: 0, storageDownloads: 0 };
  const pointerRequest = (...args) => { counts.pointerReads++; return request(...args); };
  const Srequest = (...args) => { counts.checkpointReads++; return checkpointRequest(...args); };
  const Sversion = (...args) => { counts.checkpointVersionReads++; return checkpointVersionRequest(...args); };
  const before = await readPointer(pointerRequest), current = before.pointer.current;
  const family = reconcileFamily(current); need(family !== null, 'UNSUPPORTED_FAMILY');
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
    const predecessor = await restoreReconcilePredecessor({ family, checkpointPath: restoredPath,
      targetReference: current.productionReferenceAt, request: Srequest });
    let saved = predecessor.restored.restored ? await json(restoredPath) : null;
    let publishError = null;
    if (!same(derived, saved)) {
      // Missing/older SAME-family S alone can advance. Same-time conflict and
      // S-ahead-B are hard stops. A newer S may already be refused by restore.
      let exact584MetadataOnly = false;
      if(family === METADATA_FAMILY && saved !== null
        && predecessor.predecessorFamily === NEXT_FAMILY && saved.productionReferenceAt === current.productionReferenceAt){
        exact584MetadataOnly = await assertEstablishedNativeCurrent584MetadataCheckpoint({
          descriptor:current,conditions:JSON.parse(original.raw.toString('utf8')),
          centralContract:JSON.parse(registry.raw.toString('utf8')),previousCheckpoint:saved,incomingCheckpoint:derived});
        need(exact584MetadataOnly === true,'SAME_H0_METADATA_ORIGINALS');
      }
      let exact585MetadataOnly = false;
      if(family === NATIVE_METADATA_FAMILY && saved !== null
        && predecessor.predecessorFamily === METADATA_FAMILY && saved.productionReferenceAt === current.productionReferenceAt){
        exact585MetadataOnly = await assertEstablishedNativeCurrent585MetadataCheckpoint({
          descriptor:current,conditions:JSON.parse(original.raw.toString('utf8')),
          centralContract:JSON.parse(registry.raw.toString('utf8')),previousCheckpoint:saved,incomingCheckpoint:derived});
        need(exact585MetadataOnly === true,'SAME_H0_NATIVE_METADATA_ORIGINALS');
      }
      need(exact584MetadataOnly || exact585MetadataOnly || saved === null || (saved.modelBinding.modelBundleSha256 === predecessor.predecessorFamily.I
        && saved.continuationStateContractSha256 === predecessor.predecessorFamily.T
        && Date.parse(saved.productionReferenceAt) < Date.parse(current.productionReferenceAt)), 'S_NOT_BEHIND');
      await stable();
      need(same(await readCheckpointRows(Srequest), predecessor.rows), 'S_CHANGED_BEFORE_PUBLISH');
      counts.checkpointPublishCalls++;
      try { await publishProtectedRavScoreContinuationCheckpoint({ checkpointPath: derivedPath,
        targetReference: current.productionReferenceAt, request: async (...args) => {
          const rows = await Sversion(...args);
          const expected = predecessor.rows.map(row => ({ document_key: row.document_key, version: row.version }));
          need(same(rows, expected), 'S_VERSION_CHANGED_BEFORE_PUBLISH'); return rows;
        }, rpcRequest }); }
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
  const command = process.argv[2];
  const savedWeather = ['select-saved', 'reconcile-saved'].includes(command);
  const metadata = command === 'reconcile-account-statistics-assistant';
  const nativeMetadata = command === 'reconcile-native-original-continuity';
  if (nativeMetadata) { requireNativeOriginalContinuityOutput(); assertNativeOriginalContinuityCodeOnlyCaller(process.env); }
  else if (metadata) assertAccountStatisticsAssistantPrewriteCaller(process.env);
  else if (savedWeather) assertSavedPrivateRuntimeCheckpointReconcileRequest();
  else assertOrdinaryPrivateRuntimeCheckpointReconcileRequest();
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const main = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim();
  need(head === process.env.GITHUB_SHA && head === main, 'MAIN');
  if (command === 'select' || command === 'select-saved') {
    if (savedWeather) need(path.isAbsolute(process.env.RAVRADAR_OPERATIONAL_WORK ?? ''), 'SAVED_WORK_PATH');
    const source = await json(savedWeather
      ? path.join(process.env.RAVRADAR_OPERATIONAL_WORK, 'current-private-runtime-source.json')
      : path.join(process.env.RUNNER_TEMP, 'private-runtime-current-source.json'));
    await fs.appendFile(process.env.GITHUB_OUTPUT, `required=${requiresPrivateRuntimeCheckpointReconcile(source)}\n`);
  } else {
    need(command === 'reconcile' || command === 'reconcile-saved' || metadata || nativeMetadata, 'COMMAND');
    const reconcile = nativeMetadata ? reconcileNativeOriginalContinuityPrivateRuntimeCheckpoint : metadata ? reconcileAccountStatisticsAssistantPrivateRuntimeCheckpoint
      : savedWeather ? reconcileSavedPrivateRuntimeCheckpoint : reconcilePrivateRuntimeCheckpoint;
    const result = await reconcile({ privateRoot: process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
      bundlePath: process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE });
    await fs.appendFile(process.env.GITHUB_OUTPUT, `paired=${result.paired}\n`);
    console.log(JSON.stringify({ kind: 'PRIVATE_B_S_RECONCILE', ...result }));
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => {
  console.error('PRIVATE_B_S_RECONCILE_REFUSED'); process.exitCode = 1;
});
