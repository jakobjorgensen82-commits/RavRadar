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

import {ASSISTANT_LATER_H0_BINDING as ASSISTANT_LATER_FAMILY,
  ASSISTANT_PUBLIC587_SUCCESSOR_BINDING as ASSISTANT_PUBLIC587_FAMILY,
  ASSISTANT_PUBLIC588_SUCCESSOR_BINDING as ASSISTANT_PUBLIC588_FAMILY,
  ASSISTANT_PUBLIC590_SUCCESSOR_BINDING as ASSISTANT_PUBLIC590_FAMILY}
  from './lib/assistant-later-h0-successor-source.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const need = (condition, code) => assert(condition, 'PAIRED_PUBLICATION_' + code);
// Diagnostics never grant admission or alter the original thrown failure.
const DIRECT_RECONCILE_CLI = Boolean(process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url));
const RECONCILE_DIAGNOSTIC_PHASES = new Set(["UNCLASSIFIED","CLI_REQUEST","CLI_MAIN_IDENTITY","CLI_COMMAND","CLI_SOURCE_SELECTION","CLI_OUTPUT","CURRENT_POINTER","CURRENT_IDENTITY","B_PATH","B_VERIFY","INSTALLED_SOURCE","LOCAL_S_ABSENT","DERIVE_S","RESTORE_S","S_RELATION_GUARD","CAS_STABILITY","CAS_PUBLISH","CAS_READBACK","FINAL_STABILITY","LOCAL_S_INSTALL","TEMP_CLEANUP"]);
const RECONCILE_DIAGNOSTIC_MESSAGES = new Map([["PAIRED_PUBLICATION_B_IDENTITY","B_IDENTITY"],["PAIRED_PUBLICATION_B_PATH","B_PATH"],["PAIRED_PUBLICATION_B_S_DIFFER","B_S_DIFFER"],["PAIRED_PUBLICATION_CLOSE_UNPROVED","CLOSE_UNPROVED"],["PAIRED_PUBLICATION_COMMAND","COMMAND"],["PAIRED_PUBLICATION_CURRENT_IDENTITY","CURRENT_IDENTITY"],["PAIRED_PUBLICATION_DERIVED_REFERENCE","DERIVED_REFERENCE"],["PAIRED_PUBLICATION_FILE","FILE"],["PAIRED_PUBLICATION_FILE_CHANGED","FILE_CHANGED"],["PAIRED_PUBLICATION_INSTALLED_B_CHANGED","INSTALLED_B_CHANGED"],["PAIRED_PUBLICATION_INSTALLED_SOURCE_CHANGED","INSTALLED_SOURCE_CHANGED"],["PAIRED_PUBLICATION_LINK","LINK"],["PAIRED_PUBLICATION_MAIN","MAIN"],["PAIRED_PUBLICATION_METADATA_CURRENT_FAMILY","METADATA_CURRENT_FAMILY"],["PAIRED_PUBLICATION_METADATA_INSTALLED_CURRENT_REQUEST","METADATA_INSTALLED_CURRENT_REQUEST"],["PAIRED_PUBLICATION_METADATA_OPERATIONAL_ACTION","METADATA_OPERATIONAL_ACTION"],["PAIRED_PUBLICATION_NATIVE_METADATA_CURRENT_FAMILY","NATIVE_METADATA_CURRENT_FAMILY"],["PAIRED_PUBLICATION_NATIVE_METADATA_INSTALLED_CURRENT_REQUEST","NATIVE_METADATA_INSTALLED_CURRENT_REQUEST"],["PAIRED_PUBLICATION_NATIVE_METADATA_OPERATIONAL_ACTION","NATIVE_METADATA_OPERATIONAL_ACTION"],["PAIRED_PUBLICATION_NON_ORDINARY_REQUEST","NON_ORDINARY_REQUEST"],["PAIRED_PUBLICATION_OPERATIONAL_ACTION","OPERATIONAL_ACTION"],["PAIRED_PUBLICATION_PARENT","PARENT"],["PAIRED_PUBLICATION_PARENT_CHANGED","PARENT_CHANGED"],["PAIRED_PUBLICATION_POINTER","POINTER"],["PAIRED_PUBLICATION_POINTER_CHANGED","POINTER_CHANGED"],["PAIRED_PUBLICATION_SAME_H0_METADATA_ORIGINALS","SAME_H0_METADATA_ORIGINALS"],["PAIRED_PUBLICATION_SAME_H0_NATIVE_METADATA_ORIGINALS","SAME_H0_NATIVE_METADATA_ORIGINALS"],["PAIRED_PUBLICATION_SAVED_MODE_COLLISION","SAVED_MODE_COLLISION"],["PAIRED_PUBLICATION_SAVED_OPERATIONAL_ACTION","SAVED_OPERATIONAL_ACTION"],["PAIRED_PUBLICATION_SAVED_REQUEST","SAVED_REQUEST"],["PAIRED_PUBLICATION_SAVED_WORK_PATH","SAVED_WORK_PATH"],["PAIRED_PUBLICATION_S_CHANGED_BEFORE_PUBLISH","S_CHANGED_BEFORE_PUBLISH"],["PAIRED_PUBLICATION_S_CHANGED_BEFORE_READ","S_CHANGED_BEFORE_READ"],["PAIRED_PUBLICATION_S_DISPOSITION","S_DISPOSITION"],["PAIRED_PUBLICATION_S_NOT_BEHIND","S_NOT_BEHIND"],["PAIRED_PUBLICATION_S_READBACK_DIFFER","S_READBACK_DIFFER"],["PAIRED_PUBLICATION_S_READBACK_MISSING","S_READBACK_MISSING"],["PAIRED_PUBLICATION_S_ROW","S_ROW"],["PAIRED_PUBLICATION_S_VERSION_CHANGED_BEFORE_PUBLISH","S_VERSION_CHANGED_BEFORE_PUBLISH"],["PAIRED_PUBLICATION_UNSUPPORTED_FAMILY","UNSUPPORTED_FAMILY"],["PAIRED_PUBLICATION_WORKFLOW","WORKFLOW"],["PAIRED_PUBLICATION_WORK_CHANGED","WORK_CHANGED"]]);
const RECONCILE_DIAGNOSTIC_FIXED_ERRORS = new Map([
  ['PRODUCTION_TARGET_TIME_INVALID', 'TARGET_TIME_INVALID'],
  ['PRODUCTION_TARGET_HORIZON_INVALID', 'TARGET_HORIZON_INVALID'],
  ['PRODUCTION_TARGET_FRESHNESS_POLICY_INVALID', 'TARGET_POLICY_INVALID'],
  ['PRODUCTION_TARGET_FROM_FUTURE', 'TARGET_FROM_FUTURE'],
  ['PRODUCTION_TARGET_EXPIRED', 'TARGET_EXPIRED'],
  ['Private runtime payload integrity is invalid', 'B_PAYLOAD_INTEGRITY'],
  ['Private runtime payload inventory does not match its manifest', 'B_PAYLOAD_INVENTORY'],
  ['Private runtime bundle is missing', 'B_MISSING'],
  ['Private runtime bundle generation is from the future', 'B_FROM_FUTURE'],
]);
const RECONCILE_DIAGNOSTIC_CODES = new Map([
  ['ENOENT', 'FILE_NOT_FOUND'], ['EACCES', 'FILE_ACCESS_DENIED'],
  ['EPERM', 'FILE_PERMISSION_DENIED'], ['EEXIST', 'FILE_ALREADY_EXISTS'],
  ['ENOTDIR', 'PATH_NOT_DIRECTORY'], ['EISDIR', 'PATH_IS_DIRECTORY'],
  ['ERR_ASSERTION', 'ASSERTION_REFUSED'],
  ['PROTECTED_RAVSCORE_CHECKPOINT_REMOTE_ERROR', 'S_REMOTE_ERROR'],
]);
let reconcileCliPhase = 'UNCLASSIFIED';
const reconcileErrorPhases = new WeakMap();
function markReconcilePhase(phase) {
  if (DIRECT_RECONCILE_CLI) reconcileCliPhase = phase;
}
function rememberReconcileFailure(error) {
  if (DIRECT_RECONCILE_CLI && error !== null
    && (typeof error === 'object' || typeof error === 'function')
    && !reconcileErrorPhases.has(error)) reconcileErrorPhases.set(error, reconcileCliPhase);
}
export function privateRuntimeCheckpointReconcileFailureDiagnostic(error, phase = 'UNCLASSIFIED') {
  const result = { phase: RECONCILE_DIAGNOSTIC_PHASES.has(phase) ? phase : 'UNCLASSIFIED',
    code: 'OTHER_REFUSED', errorClass: 'OTHER_ERROR' };
  try {
    if (error === null || typeof error !== 'object') return result;
    const properties = Object.getOwnPropertyDescriptors(error);
    const ownValue = key => properties[key] && Object.hasOwn(properties[key], 'value')
      ? properties[key].value : undefined;
    const prototype = Object.getPrototypeOf(error);
    result.errorClass = prototype === SyntaxError.prototype ? 'SYNTAX_ERROR'
      : prototype === TypeError.prototype ? 'TYPE_ERROR'
      : prototype === RangeError.prototype ? 'RANGE_ERROR'
      : prototype === assert.AssertionError.prototype ? 'ASSERTION_ERROR'
      : prototype === Error.prototype ? 'ERROR' : 'OTHER_ERROR';
    result.code = RECONCILE_DIAGNOSTIC_MESSAGES.get(ownValue('message'))
      ?? RECONCILE_DIAGNOSTIC_FIXED_ERRORS.get(ownValue('message'))
      ?? RECONCILE_DIAGNOSTIC_CODES.get(ownValue('code'))
      ?? (result.errorClass === 'SYNTAX_ERROR' ? 'INPUT_JSON_INVALID' : 'OTHER_REFUSED');
    return result;
  } catch {
    return { phase: result.phase, code: 'OTHER_REFUSED', errorClass: 'OTHER_ERROR' };
  }
}
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const identityKeys = ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
  'bundleContentSha256', 'modelBinding', 'contractHashes'];
function reconcileFamily(descriptor) {
  return [FAMILY, NEXT_FAMILY, METADATA_FAMILY, NATIVE_METADATA_FAMILY,
    ASSISTANT_LATER_FAMILY, ASSISTANT_PUBLIC587_FAMILY,
    ASSISTANT_PUBLIC588_FAMILY,ASSISTANT_PUBLIC590_FAMILY].filter(Boolean).find(family =>
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
  if(old585) restored = await withAuthenticated585PredecessorSource(async sourceRoot=>{
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
  return { restored, rows, predecessorFamily: old585 ? METADATA_FAMILY : old584 ? NEXT_FAMILY : old ? FAMILY : family };
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
async function reconcileAuthenticatedPrivateRuntimeCheckpoint(options = {}) {
  try { return await reconcileAuthenticatedPrivateRuntimeCheckpointObserved(options); }
  catch (error) { rememberReconcileFailure(error); throw error; }
}
async function reconcileAuthenticatedPrivateRuntimeCheckpointObserved({ repositoryRoot = ROOT, privateRoot, bundlePath,
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
  markReconcilePhase('CURRENT_POINTER');
  const before = await readPointer(pointerRequest), current = before.pointer.current;
  const family = reconcileFamily(current); need(family !== null, 'UNSUPPORTED_FAMILY');
  classifyProductionTargetFreshness({ target: current.productionReferenceAt, now, maximumAgeMinutes: 150 });
  markReconcilePhase('B_PATH');
  need(path.isAbsolute(privateRoot) && path.isAbsolute(bundlePath) && path.dirname(bundlePath) === privateRoot, 'B_PATH');
  // No previous-generation fallback and no download: the caller already restored
  // B. Both normal descriptors and the whole versioned pointer bind that CURRENT.
  markReconcilePhase('CURRENT_IDENTITY');
  const described = await describeCurrentProtectedPrivateProductionRuntime({ request: pointerRequest });
  const target = await describeTargetProtectedPrivateProductionRuntime({ request: pointerRequest,
    targetReferenceAt: current.productionReferenceAt, datasetId: current.datasetId,
    bundleContentSha256: current.bundleContentSha256 });
  for (const key of identityKeys) need(same(described[key], current[key]) && same(target[key], current[key]), 'CURRENT_IDENTITY');
  markReconcilePhase('B_VERIFY');
  expected ??= await buildPrivateRuntimeExpectation({ repositoryRoot, targetReferenceAt: current.productionReferenceAt, now });
  const verify = () => verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath, repositoryRoot,
    expected: { ...expected, datasetId: current.datasetId, productionReferenceAt: current.productionReferenceAt,
      generatedAt: current.generatedAt, bundleContentSha256: current.bundleContentSha256 } });
  const verified = await verify();
  for (const key of ['modelBinding', 'contractHashes']) need(same(verified.manifest[key], current[key]), 'B_IDENTITY');
  markReconcilePhase('INSTALLED_SOURCE');
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
  markReconcilePhase('LOCAL_S_ABSENT');
  await assert.rejects(fs.lstat(checkpointPath), { code: 'ENOENT' });
  const parent = await fs.realpath(os.tmpdir()), work = await fs.mkdtemp(path.join(parent, 'rr-b-s-reconcile-'));
  const workIdentity = await fs.lstat(work, { bigint: true });
  let outcome, first;
  try {
    markReconcilePhase('DERIVE_S');
    const derivedPath = path.join(work, 'derived/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ repositoryRoot, sourcePath: originalPath, checkpointPath: derivedPath });
    const derived = await json(derivedPath);
    need(derived.productionReferenceAt === current.productionReferenceAt, 'DERIVED_REFERENCE');
    const restoredPath = path.join(work, 'before/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    markReconcilePhase('RESTORE_S');
    const predecessor = await restoreReconcilePredecessor({ family, checkpointPath: restoredPath,
      targetReference: current.productionReferenceAt, request: Srequest });
    let saved = predecessor.restored.restored ? await json(restoredPath) : null;
    let publishError = null;
    markReconcilePhase('S_RELATION_GUARD');
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
      markReconcilePhase('CAS_STABILITY');
      await stable();
      need(same(await readCheckpointRows(Srequest), predecessor.rows), 'S_CHANGED_BEFORE_PUBLISH');
      markReconcilePhase('CAS_PUBLISH');
      counts.checkpointPublishCalls++;
      try { await publishProtectedRavScoreContinuationCheckpoint({ checkpointPath: derivedPath,
        targetReference: current.productionReferenceAt, request: async (...args) => {
          const rows = await Sversion(...args);
          const expected = predecessor.rows.map(row => ({ document_key: row.document_key, version: row.version }));
          need(same(rows, expected), 'S_VERSION_CHANGED_BEFORE_PUBLISH'); return rows;
        }, rpcRequest }); }
      catch (error) { rememberReconcileFailure(error); publishError = error; }
      markReconcilePhase('CAS_READBACK');
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
    markReconcilePhase('FINAL_STABILITY');
    await stable(); await verify();
    // Publish only the NORMAL, freshly validated remote representation locally.
    const localSource = path.join(work, outcome === 'ALREADY_PAIRED_READBACK_PROVED' ? 'before' : 'after',
      '.cache/ravscore-continuation-checkpoint/checkpoint.json');
    markReconcilePhase('LOCAL_S_INSTALL');
    await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
    await assert.rejects(fs.lstat(checkpointPath), { code: 'ENOENT' });
    await fs.rename(localSource, checkpointPath);
    return { paired: true, outcome, ...counts, requestCountsAreLogicalCalls: true,
      nativeAdmissionIssued: false, payloadLogged: false };
  } catch (error) { rememberReconcileFailure(error); first = error; throw error; }
  finally {
    if (!first) markReconcilePhase('TEMP_CLEANUP');
    try {
      const after = await fs.lstat(work, { bigint: true });
      need(after.isDirectory() && !after.isSymbolicLink() && after.dev === workIdentity.dev && after.ino === workIdentity.ino
        && path.dirname(work) === parent, 'WORK_CHANGED');
      await fs.rm(work, { recursive: true, force: false });
    } catch (error) { if (!first) throw error; }
  }
}

async function main() {
  markReconcilePhase('CLI_REQUEST');
  need(process.env.GITHUB_REF === 'refs/heads/main' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch', 'WORKFLOW');
  const command = process.argv[2];
  const savedWeather = ['select-saved', 'reconcile-saved'].includes(command);
  const metadata = command === 'reconcile-account-statistics-assistant';
  const nativeMetadata = command === 'reconcile-native-original-continuity';
  if (nativeMetadata) { requireNativeOriginalContinuityOutput(); assertNativeOriginalContinuityCodeOnlyCaller(process.env); }
  else if (metadata) assertAccountStatisticsAssistantPrewriteCaller(process.env);
  else if (savedWeather) assertSavedPrivateRuntimeCheckpointReconcileRequest();
  else assertOrdinaryPrivateRuntimeCheckpointReconcileRequest();
  markReconcilePhase('CLI_MAIN_IDENTITY');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const main = execFileSync('git', ['rev-parse', 'origin/main'], { cwd: ROOT, encoding: 'utf8' }).trim();
  need(head === process.env.GITHUB_SHA && head === main, 'MAIN');
  markReconcilePhase('CLI_COMMAND');
  if (command === 'select' || command === 'select-saved') {
    markReconcilePhase('CLI_SOURCE_SELECTION');
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
    markReconcilePhase('CLI_OUTPUT');
    await fs.appendFile(process.env.GITHUB_OUTPUT, `paired=${result.paired}\n`);
    console.log(JSON.stringify({ kind: 'PRIVATE_B_S_RECONCILE', ...result }));
  }
}
if (DIRECT_RECONCILE_CLI) main().catch(error => {
  console.error('PRIVATE_B_S_RECONCILE_REFUSED');
  const phase = error !== null && (typeof error === 'object' || typeof error === 'function')
    ? reconcileErrorPhases.get(error) ?? reconcileCliPhase : reconcileCliPhase;
  console.error(JSON.stringify({ kind: 'PRIVATE_B_S_RECONCILE_DIAGNOSTIC',
    ...privateRuntimeCheckpointReconcileFailureDiagnostic(error, phase) }));
  process.exitCode = 1;
});
