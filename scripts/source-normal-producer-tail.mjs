// Private current SOURCE tail. The session is minted only by the actual normal
// entry. Installation ownership is I/O-only until that same session is admitted.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { fstat as sourcePreludeFstat, fstatSync, lstatSync, Stats as SourceActualStats, constants as sourceOriginalFsConstants } from 'node:fs';
import path from 'node:path';
import { spawn as sourceCohortSpawn } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { types as sourcePreludeTypes, isDeepStrictEqual as same } from 'node:util';
import { PRIVATE_RUNTIME_REPOSITORY_ROOT, PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY,
  verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from './protected-private-production-runtime.mjs';
import { constants as bufferConstants } from 'node:buffer';
import { assertRavScoreModelBinding, ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,
  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE, assertPrivateRuntimeInventory } from './lib/private-weather-component-inventory.mjs';
import { privateRuntimeInstallationPack, privateRuntimeInstallationFiles } from './private-production-runtime-workflow.mjs';
import { sourcePackInvocationContext, sourceCpInventoryObservation, sourcePackOutputCatalog,
  privateWeatherPackJsonReadsClosed, ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
import { sourceNormalProducerInstallationInput, sourceNormalProducerInstallationClock,
  sourceNormalProducerTailContext, assertSourceNormalProducerTailClock, consumeSourceNormalProducerSession,
  prepareSourceNormalProducerSession, reconfirmSourceNormalProducerMain, retainSourceNormalProducerTailFailure }
  from './source-normal-producer-entry.mjs';

import { resolveOperationalRavScoreModel, operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY, RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY }
  from './ravscore-operational-activation.mjs';

const installationContexts = new WeakMap(), installationSessions = new WeakMap(), creatingSessions = new WeakSet();
const sourceOriginalCpContexts = new WeakMap(), sourceOriginalCpInvocations = new WeakMap();
const sourceOriginalCpResults = new WeakMap(), sourceOriginalOperations = new WeakMap();
const sourceProgressCpContexts = new WeakMap();
const retainedSourceOriginalOwners = new Set();
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function sourceOriginalFailure(code) {
  throw sourceGuardError('SOURCE_ORIGINAL_' + code);
}
function keepSourceOriginalFailure(owner, error) {
  owner.firstFailure ??= Object.freeze([error]);
  owner.phase = 'RETAINED'; retainedSourceOriginalOwners.add(owner);
  return owner.firstFailure[0];
}
function sourceOwnerRecord(session) {
  const state = installationSessions.get(session);
  if (!state || state.input.session !== session || state.owner.holder !== session) {
    sourceOriginalFailure('SAME_ENTRY_SESSION_REQUIRED');
  }
  return state;
}
function sourceOriginalOwner(session) {
  const state = sourceOwnerRecord(session), owner = state.owner;
  if (owner.firstFailure !== null) throw owner.firstFailure[0];
  if (owner.phase === 'RELEASED') sourceOriginalFailure('OWNER_REQUIRED');
  assertPrivateSourceJobDeadline(session);
  const failureWorker=owner.dmiCohort?.failureWorker;
  if(failureWorker&&!(failureWorker.cutoff>performance.now()))throw failureWorker.firstFailure[0];
  return owner;
}
function assertPrivateSourceJobDeadline(session) {
  const state = sourceOwnerRecord(session);
  // The entry, not this module or an environment receipt, supplies the original
  // absolute job clock. Changing phase cannot renew its allowance.
  const clock = state.admitted
    ? assertSourceNormalProducerTailClock(session) : sourceNormalProducerInstallationClock(session);
  state.issued.deadline = Math.min(state.issued.deadline, clock.deadline);
  if (!(state.issued.deadline > performance.now())) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
  return state.issued;
}
function assertInitialInstallationRows(state) {
  for (const row of state.input.immutableRows) {
    for (const original of row.parents) {
      const actual = lstatSync(original.path, { bigint: true });
      if (!actual.isDirectory() || actual.isSymbolicLink()
        || !['dev', 'ino', 'mode'].every(key => actual[key] === original[key])) {
        sourceOriginalFailure('INSTALL_ORIGINAL_PARENT_CHANGED');
      }
    }
    const identity = ownFileDescriptorIdentity(row.fd);
    const opened = fstatSync(row.fd, { bigint: true }), named = lstatSync(row.path, { bigint: true });
    if (!row.qualified || row.handle.fd !== row.fd || !identity || !row.descriptorIdentity
      || identity.dev !== row.descriptorIdentity.dev || identity.ino !== row.descriptorIdentity.ino
      || !opened.isFile() || !named.isFile() || named.isSymbolicLink() || named.nlink !== 1n
      || !sameSourceOriginalStat(row.stat, opened, true) || !sameSourceOriginalStat(opened, named, true)) {
      sourceOriginalFailure('INSTALL_ORIGINAL_CHANGED');
    }
  }
}

export async function createSourceNormalInstallationContext(session) {
  if (arguments.length !== 1 || (typeof session !== 'object' || session === null)
    || installationSessions.has(session) || creatingSessions.has(session)) sourceOriginalFailure('INSTALL_CONTEXT_REUSED');
  creatingSessions.add(session); // one attempt, including an unknown preparation outcome
  const input = await sourceNormalProducerInstallationInput(session);
  if (input.session !== session || input.repositoryRoot !== PRIVATE_RUNTIME_REPOSITORY_ROOT
    || input.privateRoot !== '/tmp/ravradar-private-production-runtime'
    || input.restoredPath !== path.join(input.privateRoot, 'restored')) sourceOriginalFailure('INSTALL_INPUT_CHANGED');
  const clock = sourceNormalProducerInstallationClock(session), context = Object.freeze({});
  const owner = { holder: session, phase: 'INSTALL_PENDING', firstFailure: null,
    activeOperation: context, cpInventoryPhases: [], operationReaders: [],
    context: { root: input.privateRoot, repository: input.repositoryRoot } };
  const operation = { kind: 'install', owner, source: input.restoredPath,
    completed: false, packInvocation: null, componentStage: null, cpInventoryContext: context };
  const cpContext = { holder: session, operation: context, owner, state: operation,
    context, stage: null, invocation: null, phase: null, result: null,
    parentStat: await fs.lstat(path.dirname(input.restoredPath), { bigint: true }),
    stageIdentity: null, firstFailure: null };
  const state = { input, context, owner, operation, cpContext, admitted: false,
    phase: 'CREATED', firstFailure: null, invocation: null, result: null, catalog: null,
    issued: { identity: input.identity, deadline: clock.deadline,
      normalRoute: { request: { quick: false, checkpointOnly: false,
        extended: input.identity.EXTENDED_PROVIDER_BOOTSTRAP === 'true' } },
      normalPrelude: { productionTarget: input.target } } };
  // Register actual identity before any subsequent I/O can fail. This is the
  // SAME entry session, never a second issuer or an admission to production.
  installationSessions.set(session, state); installationContexts.set(context, state);
  sourceJobDeadlineBrands.set(session,state.issued); // SAME actual entry session, no new issuer
  sourceOriginalOperations.set(context, operation); sourceOriginalCpContexts.set(context, cpContext);
  retainedSourceOriginalOwners.add(owner);
  try {
    if (!cpContext.parentStat.isDirectory() || cpContext.parentStat.isSymbolicLink()
      || await fs.realpath(path.dirname(input.restoredPath)) !== path.dirname(input.restoredPath)) {
      sourceOriginalFailure('CP_INVENTORY_STAGE_PARENT_CHANGED');
    }
    assertSourceNormalInstallationContext(context);
    return context;
  } catch (error) { state.firstFailure ??= [error]; throw keepSourceOriginalFailure(owner, state.firstFailure[0]); }
}

// Deliberately synchronous: installer checks these actual roots and reserves
// its sole invocation BEFORE its first I/O. Caller-supplied roots grant nothing.
export function assertSourceNormalInstallationContext(context) {
  const state = installationContexts.get(context);
  if (arguments.length !== 1 || !state || state.context !== context || state.phase !== 'CREATED') {
    sourceOriginalFailure('INSTALL_CONTEXT_NOT_AVAILABLE');
  }
  if (state.firstFailure !== null) throw state.firstFailure[0];
  sourceOriginalOwner(state.input.session); assertInitialInstallationRows(state);
  return Object.freeze({ repositoryRoot: state.input.repositoryRoot, restoredRoot: state.input.restoredPath });
}
export function beginSourceNormalInstallation(context) {
  const state = installationContexts.get(context);
  if (arguments.length !== 1 || !state || state.context !== context || state.phase !== 'CREATED') {
    sourceOriginalFailure('INSTALL_INVOCATION_REUSED');
  }
  assertSourceNormalInstallationContext(context);
  state.phase = 'INSTALLING'; // synchronous one-shot reservation; no await gap
}
export function attachSourceNormalInstallationInvocation(context, invocation) {
  const state = installationContexts.get(context);
  if (arguments.length !== 2 || !state || state.phase !== 'INSTALLING' || state.invocation !== null
    || !sourcePreludeTypes.isPromise(invocation) || sourcePreludeTypes.isProxy(invocation)
    || sourceOriginalCpInvocations.has(invocation) || sourcePackInvocationContext(invocation) !== context) {
    sourceOriginalFailure('INSTALL_PACK_INVOCATION_NOT_OWNED');
  }
  // Retain the already real factory invocation BEFORE a falling clock check.
  // A rejection here must not lose a pending unpack/subtree operation.
  state.invocation = invocation; state.operation.packInvocation = invocation;
  state.cpContext.invocation = invocation; sourceOriginalCpInvocations.set(invocation, state.cpContext);
  try { sourceOriginalOwner(state.input.session); }
  catch (error) { state.firstFailure ??= [error]; throw keepSourceOriginalFailure(state.owner, state.firstFailure[0]); }
  // The actual factory has not necessarily created its stage yet. Do not adopt
  // a named directory or infer settlement/closure from attaching this Promise.
}
export async function finishSourceNormalInstallationContext(session, context, result) {
  const state = installationContexts.get(context);
  if (arguments.length !== 3 || !state || state.input.session !== session
    || installationSessions.get(session) !== state || state.phase !== 'INSTALLING' || state.result !== null) {
    sourceOriginalFailure('INSTALL_RESULT_NOT_OWNED');
  }
  try {
    sourceOriginalOwner(session); assertInitialInstallationRows(state);
    const actual = privateRuntimeInstallationPack(result), files = privateRuntimeInstallationFiles(result);
    if (result?.installed !== true || !Object.isFrozen(actual) || actual.sourceInventoryContext !== context
      || actual.invocation !== state.invocation || files.length !== result.fileCount) sourceOriginalFailure('INSTALL_RESULT_CHANGED');
    const extension = state.input.verification.files.filter(row => row.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    if (extension.length > 1) sourceOriginalFailure('INSTALL_PACK_INVENTORY_CHANGED');
    if (extension.length === 0) {
      if (actual.invocation !== null || actual.componentStage !== null || state.invocation !== null) {
        sourceOriginalFailure('INSTALL_NO_PACK_DESCRIPTOR_CHANGED');
      }
      state.noPack = actual; // Genuine installer observation, NOT a child ACK.
    } else {
      if (typeof actual.componentStage !== 'string' || !actual.componentStage.startsWith(state.input.restoredPath + '.weather-components-')
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(actual.componentStage.slice((state.input.restoredPath + '.weather-components-').length))
        || actual.invocation === null || sourcePackInvocationContext(actual.invocation) !== context
        || !privateWeatherPackJsonReadsClosed(actual.invocation)) sourceOriginalFailure('INSTALL_PACK_CLOSURE_UNPROVED');
      const observed = sourceCpInventoryObservation(actual.invocation), catalog = sourcePackOutputCatalog(actual.invocation);
      if (observed.invocation !== actual.invocation || observed.context !== context || observed.root !== actual.componentStage
        || catalog.invocation !== actual.invocation || catalog.context !== context || catalog.root !== actual.componentStage
        || catalog.rootIdentity !== observed.rootIdentity || catalog.manifest !== observed.manifest) sourceOriginalFailure('INSTALL_PACK_CATALOG_CHANGED');
      state.operation.componentStage = actual.componentStage; state.cpContext.stage = actual.componentStage;
      await assertSourceOriginalCpStage(state.cpContext, observed.rootIdentity);
      if (observed.visited === true) {
        if (observed.result !== state.cpContext.result || observed.input !== state.cpContext.phase?.input) {
          sourceOriginalFailure('INSTALL_CP_OBSERVATION_CHANGED');
        }
        assertSourceOriginalCpInventoryResult(actual.invocation, observed.result);
      } else if (observed.visited !== false || observed.manifest.files.some(row => row.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank)) {
        sourceOriginalFailure('INSTALL_CP_ABSENCE_UNPROVED');
      }
      state.catalog = catalog;
    }
    state.result = result; state.operation.completed = true; state.owner.activeOperation = null;
    state.phase = 'INSTALLED';
    return context; // Still opaque I/O-only context, not COLD/SAVE/release.
  } catch (error) { state.firstFailure ??= [error]; throw keepSourceOriginalFailure(state.owner, state.firstFailure[0]); }
}

// Failure-only physical drain. Its inputs are the already retained child/fds
// and original monotonic cutoff, NOT a new entry/admission call. No result from
// this function is a SAVE ACK, ECHILD proof, producer input or release token.
export async function retainAndDrainSourceNormalInstallationFailure(context, error) {
  const state = installationContexts.get(context);
  if (arguments.length !== 2 || !state || state.context !== context) sourceOriginalFailure('INSTALL_CONTEXT_NOT_AVAILABLE');
  state.firstFailure ??= state.owner.firstFailure ?? Object.freeze([error]);
  keepSourceOriginalFailure(state.owner, state.firstFailure[0]);
  state.failureCaughtAt ??= state.cpContext.phase?.firstFailureCaughtAt ?? performance.now();
  state.failureCutoff ??= Math.min(state.issued.deadline, state.failureCaughtAt + 240000,
    state.cpContext.phase?.failureCutoff ?? Infinity, state.cpContext.phase?.cutoff ?? Infinity);
  state.phase = 'FAILED_RETAINED';
  const phase = state.cpContext.phase;
  if (!phase) return; // No CP phase means no duplicate FD or launched child.
  if (state.drainAttempted) sourceOriginalFailure('INSTALL_DRAIN_REUSED');
  state.drainAttempted = true;
  if (phase.control && !phase.controlCloseRequested && !phase.controlCloseObserved) {
    phase.controlCloseRequested = true;
    try { phase.control.destroy(); }
    catch (closeError) { (state.stopFailures ??= []).push([closeError]); }
  }
  const wait = async promise => {
    if (!promise || !(state.failureCutoff > performance.now())) sourceOriginalFailure('INSTALL_DRAIN_UNPROVED');
    let timer;
    try {
      await Promise.race([promise, new Promise((_, reject) => {
        timer=setTimeout(() => reject(new Error('SOURCE_ORIGINAL_INSTALL_DRAIN_UNPROVED')),
          Math.max(0,Math.floor(state.failureCutoff-performance.now())));
      })]);
    } finally { clearTimeout(timer); }
  };
  try {
    if (phase.child && !phase.childClose) await wait(phase.childClosePromise);
    if (phase.control && !phase.controlCloseObserved) await wait(phase.controlClosePromise);
    // Child/control close observations remain separate from guardian E1 and
    // kernel descendant closure. Missing/invalid E1 continues to poison owner.
    if (phase.child && !phase.childClose || phase.control && !phase.controlCloseObserved) sourceOriginalFailure('INSTALL_DRAIN_UNPROVED');
    for (const row of phase.fdRows) {
      if (row.closed || row.closeAttempted) continue;
      const actual=await row.handle.stat({bigint:true});
      if (row.handle.fd!==row.fd || !row.identity || actual.dev!==row.identity.dev || actual.ino!==row.identity.ino
        || row.stat && actual.mode!==row.stat.mode) sourceOriginalFailure('INSTALL_DRAIN_DESCRIPTOR_CHANGED');
      const closeRow={...row,stat:actual};
      // Closing one's actual descriptor does not qualify changed bytes. The
      // original row/hash stay unchanged; this journal grants no content proof.
      await closeSourceFinalReader(closeRow,row);
    }
  } catch (stopError) { (state.stopFailures ??= []).push([stopError]); throw stopError; }
}

function freezeSourceOriginalMetadata(value) {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freezeSourceOriginalMetadata(item);
    Object.freeze(value);
  }
  return value;
}
function sameSourceOriginalStat(left, right, file = false) {
  const fields = file ? ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs']
    : ['dev', 'ino', 'mode'];
  return fields.every(key => left[key] === right[key]);
}
function sourceChildAbsoluteCutoff(cutoff, after, anchor) {
  if (!Number.isFinite(cutoff) || !Number.isFinite(after) || after < 0
    || !Number.isSafeInteger(Math.floor(cutoff)) || !Number.isSafeInteger(Math.ceil(after))
    || typeof anchor !== 'bigint' || anchor < 0n) sourceOriginalFailure('CHILD_CLOCK_INVALID');
  // Independent outward rounding cannot give more time than floor(cutoff-after).
  const milliseconds = Math.floor(cutoff) - Math.ceil(after);
  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
  const result = anchor + BigInt(milliseconds) * 1_000_000n;
  if (result > 0x7fffffffffffffffn) sourceOriginalFailure('CHILD_CLOCK_INVALID');
  return result;
}
// Directory capture is deliberately separate from the regular-file helper.
// It comes only from a genuine current kernel stat, not from a supplied row or
// regular-helper null. The normal close probe validates all seven OS types.
function ownSourceDirectoryDescriptorIdentity(fd) {
  try {
    const stat=fstatSync(fd,{bigint:true});
    if(stat===null||typeof stat!=='object'||sourcePreludeTypes.isProxy(stat))return null;
    const prototype=Object.getPrototypeOf(stat);
    if(!prototype||sourcePreludeTypes.isProxy(prototype)
      ||Object.getPrototypeOf(prototype)!==Object.getPrototypeOf(SourceActualStats.prototype))return null;
    const dev=Object.getOwnPropertyDescriptor(stat,'dev')?.value;
    const ino=Object.getOwnPropertyDescriptor(stat,'ino')?.value;
    const mode=Object.getOwnPropertyDescriptor(stat,'mode')?.value;
    if(typeof dev!=='bigint'||dev<0n||typeof ino!=='bigint'||ino<0n
      ||typeof mode!=='bigint'||(mode&0o170000n)!==0o040000n)return null;
    return Object.freeze({dev,ino,prototype});
  } catch { return null; }
}

async function closeSourceFinalReader(row, journal) {
  if (journal.firstFailure !== null) throw journal.firstFailure[0];
  if (journal.closeAttempted || journal.closed) sourceOriginalFailure('FINAL_READER_CLOSE_REUSED');
  journal.row = row;
  journal.fd = row.handle.fd; // Retain the actual descriptor before any await.
  if (!Number.isSafeInteger(journal.fd) || journal.fd < 0) sourceOriginalFailure('FINAL_READER_FD_INVALID');
  journal.descriptorIdentity = row.directory
    ? ownSourceDirectoryDescriptorIdentity(journal.fd) : ownFileDescriptorIdentity(journal.fd);
  try {
    if (journal.descriptorIdentity === null) sourceOriginalFailure('FINAL_READER_FD_INVALID');
    const actual = await row.handle.stat({ bigint: true });
    if (!sameSourceOriginalStat(actual, row.stat, !row.directory)
      || actual.dev !== journal.descriptorIdentity.dev || actual.ino !== journal.descriptorIdentity.ino) sourceOriginalFailure('FINAL_READER_CHANGED');
    journal.closeAttempted = true;
    try { await row.handle.close(); }
    catch (error) { journal.firstFailure = [error]; }
    try {
      journal.closed = row.handle.fd === -1
        && await ownedFileDescriptorClosed(journal.fd, journal.descriptorIdentity);
      // A validated different kernel object can now occupy the same number.
      // Never close or adopt that replacement; same/unknown identity refuses.
      if (!journal.closed) sourceOriginalFailure('FINAL_READER_CLOSE_UNPROVED');
    } catch (error) { if (journal.firstFailure === null) journal.firstFailure = [error]; }
    if (journal.firstFailure !== null) throw journal.firstFailure[0];
  } catch (error) {
    if (journal.firstFailure === null) journal.firstFailure = [error];
    throw journal.firstFailure[0];
  }
}
async function assertSourceOriginalCpStage(context, born) {
  // The caller obtained this SAME frozen object only from the actual pack
  // invocation's own mkdir->lstat; never adopt a later named-directory stat.
  if (!born || !Object.isFrozen(born) || ['dev', 'ino', 'mode', 'nlink'].some(key => typeof born[key] !== 'bigint')
    || context.stageIdentity && context.stageIdentity !== born
    || await fs.realpath(context.stage) !== context.stage) sourceOriginalFailure('CP_INVENTORY_STAGE_BIRTH_UNPROVED');
  const named = await fs.lstat(context.stage, { bigint: true });
  // Own manifest subdirectories legitimately change directory nlink; dev/ino/
  // mode remain the birth identity, and the final exact catalog rejects extras.
  if (!named.isDirectory() || named.isSymbolicLink() || !sameSourceOriginalStat(born, named)) sourceOriginalFailure('CP_INVENTORY_STAGE_BIRTH_CHANGED');
  context.stageIdentity = born;
}
async function openSourceCpInventoryDescriptor(phase, file, directory) {
  file = path.resolve(file);
  if (await fs.realpath(file) !== file) sourceOriginalFailure('CP_INVENTORY_PATH_ALIAS');
  const handle = await fs.open(file, sourceOriginalFsConstants.O_RDONLY
    | (sourceOriginalFsConstants.O_NOFOLLOW ?? 0) | (directory ? sourceOriginalFsConstants.O_DIRECTORY ?? 0 : 0));
  const row = { path: file, handle, fd: handle.fd, stat: null, directory,
    closeAttempted: false, closed: false, firstFailure: null };
  phase.fdRows.push(row);
  row.identity = directory ? ownSourceDirectoryDescriptorIdentity(row.fd)
    : ownFileDescriptorIdentity(row.fd); // retain before any awaited stat can fail
  if (row.identity === null) sourceOriginalFailure('CP_INVENTORY_FD_CHANGED');
  const opened = await handle.stat({ bigint: true }), named = await fs.lstat(file, { bigint: true });
  if (!(directory ? opened.isDirectory() && named.isDirectory() : opened.isFile() && named.isFile())
    || named.isSymbolicLink() || !sameSourceOriginalStat(opened, named, !directory)
    || !directory && opened.nlink !== 1n) sourceOriginalFailure('CP_INVENTORY_FD_CHANGED');
  row.stat = opened;
  return row;
}
async function sourceCpInventoryRowBytes(phase, row, maximum, retainBytes = true) {
  const owner = phase.owner;
  const opened = await row.handle.stat({ bigint: true }), named = await fs.lstat(row.path, { bigint: true });
  if (!opened.isFile() || named.isSymbolicLink() || !sameSourceOriginalStat(opened, row.stat, true)
    || !sameSourceOriginalStat(opened, named, true) || opened.size < 1n || opened.size > BigInt(maximum)) {
    sourceOriginalFailure('CP_INVENTORY_FILE_CHANGED');
  }
  sourceOriginalOwner(owner.holder);
  const bytes = retainBytes ? Buffer.alloc(Number(opened.size)) : null;
  const buffer = bytes ?? Buffer.alloc(64 * 1024), digest = crypto.createHash('sha256'); let position = 0;
  while (position < Number(opened.size)) {
    if (performance.now() >= phase.cutoff) sourceOriginalFailure('CP_INVENTORY_DEADLINE_EXPIRED');
    const offset = bytes ? position : 0;
    const actual = await row.handle.read(buffer, offset, Math.min(65536, Number(opened.size) - position), position);
    if (!actual.bytesRead) sourceOriginalFailure('CP_INVENTORY_FILE_TRUNCATED');
    digest.update(buffer.subarray(offset, offset + actual.bytesRead));
    position += actual.bytesRead;
  }
  if ((await row.handle.read(Buffer.alloc(1), 0, 1, position)).bytesRead
    || !sameSourceOriginalStat(opened, await row.handle.stat({ bigint: true }), true)
    || !sameSourceOriginalStat(opened, await fs.lstat(row.path, { bigint: true }), true)) sourceOriginalFailure('CP_INVENTORY_FILE_CHANGED');
  sourceOriginalOwner(owner.holder);
  return bytes ?? { bytes: position, sha256: digest.digest('hex') };
}
async function beginSourceOriginalCpInventoryPhase(holder, invocation) {
  const context = sourceOriginalCpInvocations.get(invocation), owner = sourceOriginalOwner(holder);
  const issued = assertPrivateSourceJobDeadline(holder), state = context?.state;
  const progressContext = sourceProgressCpContexts.get(context?.context);
  if (progressContext) await assertSourceProgressCpContext(progressContext);
  if (!context || context.holder !== holder || context.owner !== owner || context.invocation !== invocation
    || context.firstFailure !== null || context.phase
    || (progressContext ? progressContext !== context : state.kind !== 'install' || state.completed || owner.activeOperation !== context.operation)
    || state.packInvocation !== invocation || state.componentStage !== context.stage || !issued.normalPrelude
    || process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24') sourceOriginalFailure('CP_INVENTORY_INSTALL_NOT_OWNED');
  const phase = { holder, owner, context, state, invocation, name: 'cpInventory', firstFailure: null,
    result: null, completed: false, fdRows: [], input: null,
    cutoff: Math.min(issued.deadline, performance.now() + 120_000) };
  context.phase = phase; (owner.cpInventoryPhases ??= []).push(phase);
  try {
    const pack = await import('./lib/private-weather-component-pack.mjs');
    const input = pack.sourceCpInventoryInput(invocation);
    phase.input = input;
    const bank = path.join(context.stage, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
    const cache = path.join(context.stage, '.cache/copernicus-components/');
    const temporaryParent = await fs.realpath((await import('node:os')).tmpdir());
    if (input.invocation !== invocation || input.context !== context.context || !Object.isFrozen(input)
      || !input.token || input.root !== context.stage || input.bankPath !== bank || input.cacheDirectory !== cache
      || path.dirname(input.outputDirectory) !== temporaryParent
      || !/^rr-cp-storage-inventory-[A-Za-z0-9_-]+$/.test(path.basename(input.outputDirectory))
      || await fs.realpath(input.outputDirectory) !== input.outputDirectory
      || !sameSourceOriginalStat(context.parentStat, await fs.lstat(path.dirname(context.stage), { bigint: true }))) {
      sourceOriginalFailure('CP_INVENTORY_SOURCE_BINDING_CHANGED');
    }
    await assertSourceOriginalCpStage(context, input.rootIdentity);
    const manifest = input.manifest;
    const entries = manifest?.files?.filter(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
    if (manifest?.kind !== 'PRIVATE_WEATHER_COMPONENT_PACK' || manifest.schemaVersion !== 1
      || entries?.length !== 1 || !Number.isSafeInteger(entries[0].bytes) || entries[0].bytes < 1
      || !/^[0-9a-f]{64}$/.test(entries[0].sha256 ?? '') || !/^sha256:[0-9a-f]{64}$/.test(input.bank?.bankSha256 ?? '')) {
      sourceOriginalFailure('CP_INVENTORY_MANIFEST_UNPROVED');
    }
    phase.bankExpected = entries[0];
    phase.bank = await openSourceCpInventoryDescriptor(phase, bank, false);
    phase.cache = await openSourceCpInventoryDescriptor(phase, cache, true);
    phase.outputDirectory = await openSourceCpInventoryDescriptor(phase, input.outputDirectory, true);
    if (!input.outputDirectoryIdentity || ['dev', 'ino', 'mode', 'nlink'].some(key =>
      typeof input.outputDirectoryIdentity[key] !== 'bigint' || input.outputDirectoryIdentity[key] !== phase.outputDirectory.stat[key])) {
      sourceOriginalFailure('CP_INVENTORY_OUTPUT_BIRTH_CHANGED');
    }
    if ((await fs.readdir(input.outputDirectory)).length) sourceOriginalFailure('CP_INVENTORY_OUTPUT_EXISTS');
    const raw = await sourceCpInventoryRowBytes(phase, phase.bank, 768 * 1024 * 1024, false);
    if (raw.bytes !== phase.bankExpected.bytes || raw.sha256 !== phase.bankExpected.sha256) sourceOriginalFailure('CP_INVENTORY_BANK_CHANGED');
    return phase;
  } catch (error) { if (phase.firstFailure === null) {
    phase.firstFailure = [error]; phase.firstFailureCaughtAt = performance.now();
    phase.failureCutoff = Math.min(phase.cutoff, phase.firstFailureCaughtAt + 240000);
  } throw keepSourceOriginalFailure(owner, phase.firstFailure[0]); }
}
export async function runSourceOriginalCpInventory(invocation) {
  const context = sourceOriginalCpInvocations.get(invocation);
  if (!context) sourceOriginalFailure('CP_INVENTORY_INVOCATION_NOT_OWNED');
  const state = installationContexts.get(context.context);
  if (state && context.stage === null) {
    const pack = await import('./lib/private-weather-component-pack.mjs');
    const actual = pack.sourceCpInventoryInput(invocation), prefix = state.input.restoredPath + '.weather-components-';
    if (actual.context !== context.context || typeof actual.root !== 'string' || !actual.root.startsWith(prefix)
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(actual.root.slice(prefix.length))) {
      sourceOriginalFailure('CP_INVENTORY_SOURCE_BINDING_CHANGED');
    }
    context.stage = actual.root; context.state.componentStage = actual.root;
  }
  const progress=sourceProgressCpContexts.get(context.context);
  if(!state&&progress!==context)sourceOriginalFailure('CP_INVENTORY_INVOCATION_NOT_OWNED');
  const phase = state ? await runSourceCpInventoryProgram(context.holder, invocation)
    : await runSourceNormalProgram(context.holder,invocation,'cpInventory');
  if (context.phase !== phase || !phase.completed || !context.result) sourceOriginalFailure('CP_INVENTORY_CLOSURE_UNPROVED');
  return context.result;
}
async function finishSourceOriginalCpInventoryPhase(holder, phase) {
  const context = phase.context, owner = sourceOriginalOwner(holder), input = phase.input;
  try {
    const pack = await import('./lib/private-weather-component-pack.mjs');
    const progressContext = sourceProgressCpContexts.get(context.context);
    if (progressContext) await assertSourceProgressCpContext(progressContext);
    if (context.owner !== owner || context.phase !== phase || context.state.packInvocation !== phase.invocation
      || (progressContext ? progressContext !== context : owner.activeOperation !== context.operation || context.state.completed) || !phase.transportClosed
      || !phase.controlCloseObserved || phase.controlCloseFailure !== null || phase.firstFailure !== null
      || phase.completed || phase.result?.exitCode !== 0 || pack.sourceCpInventoryInput(phase.invocation) !== input) {
      sourceOriginalFailure('CP_INVENTORY_CLOSURE_UNPROVED');
    }
    await assertSourceOriginalCpStage(context, input.rootIdentity);
    const outputs = phase.result.outputs;
    if (JSON.stringify(Object.keys(outputs).sort()) !== JSON.stringify(['cp_bank_sha256', 'cp_inventory_bytes', 'cp_inventory_sha256'])
      || outputs.cp_bank_sha256 !== phase.bankExpected.sha256
      || !/^[0-9a-f]{64}$/.test(outputs.cp_inventory_sha256 ?? '')
      || !/^[1-9][0-9]*$/.test(outputs.cp_inventory_bytes ?? '')
      || !Number.isSafeInteger(Number(outputs.cp_inventory_bytes)) || Number(outputs.cp_inventory_bytes) > 32 * 1024 * 1024) {
      sourceOriginalFailure('CP_INVENTORY_ACK_INVALID');
    }
    const bankBytes = await sourceCpInventoryRowBytes(phase, phase.bank, 768 * 1024 * 1024, false);
    if (bankBytes.bytes !== phase.bankExpected.bytes || bankBytes.sha256 !== phase.bankExpected.sha256) sourceOriginalFailure('CP_INVENTORY_BANK_CHANGED');
    if (!same(await fs.readdir(input.outputDirectory), ['inventory.json'])) sourceOriginalFailure('CP_INVENTORY_OUTPUT_INVENTORY_CHANGED');
    phase.output = await openSourceCpInventoryDescriptor(phase, path.join(input.outputDirectory, 'inventory.json'), false);
    const raw = await sourceCpInventoryRowBytes(phase, phase.output, 32 * 1024 * 1024);
    if (raw.length !== Number(outputs.cp_inventory_bytes) || sha256(raw) !== outputs.cp_inventory_sha256) sourceOriginalFailure('CP_INVENTORY_READBACK_CHANGED');
    const inventory = JSON.parse(raw.toString('utf8'));
    if (inventory?.kind !== 'CP_COMPONENT_STORAGE_INVENTORY' || inventory.schemaVersion !== 1
      || inventory.bankSha256 !== input.bank.bankSha256 || !Array.isArray(inventory.files) || inventory.files.length > 65536) {
      sourceOriginalFailure('CP_INVENTORY_JSON_INVALID');
    }
    phase.inventory = inventory; phase.rawSha256 = sha256(raw); phase.rawBytes = raw.length;
    for (const row of phase.fdRows) {
      const actual = await row.handle.stat({ bigint: true }), named = await fs.lstat(row.path, { bigint: true });
      if (!sameSourceOriginalStat(row.stat, actual, !row.directory)
        || !sameSourceOriginalStat(actual, named, !row.directory) || named.isSymbolicLink()) sourceOriginalFailure('CP_INVENTORY_FD_CHANGED');
      row.stat = actual;
      await closeSourceFinalReader(row, row); // Close duplicate bank/cache/output fds only, never original B.
    }
    sourceOriginalOwner(holder);
    const result = Object.freeze({ inventory: freezeSourceOriginalMetadata(inventory) });
    sourceOriginalCpResults.set(result, phase); context.result = result;
    phase.completed = true;
  } catch (error) { if (phase.firstFailure === null) {
    phase.firstFailure = [error]; phase.firstFailureCaughtAt = performance.now();
    phase.failureCutoff = Math.min(phase.cutoff, phase.firstFailureCaughtAt + 240000);
  } throw keepSourceOriginalFailure(owner, phase.firstFailure[0]); }
}
export function assertSourceOriginalCpInventoryResult(invocation, result) {
  const context = sourceOriginalCpInvocations.get(invocation), phase = sourceOriginalCpResults.get(result);
  if (!context || context.result !== result || context.phase !== phase || phase.invocation !== invocation
    || phase.context !== context || !phase.completed || !phase.transportClosed || phase.firstFailure !== null
    || phase.fdRows.some(row => !row.closed || !row.closeAttempted || row.firstFailure !== null)) sourceOriginalFailure('CP_INVENTORY_RESULT_NOT_OWNED');
  sourceOriginalOwner(context.holder);
  return result;
}
async function runSourceCpInventoryProgram(holder, invocation) {
  const context = sourceOriginalCpInvocations.get(invocation);
  const state = context?.state, owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (!context || context.holder !== holder || context.owner !== owner || state?.kind !== 'install'
    || process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24') sourceOriginalFailure('CP_INVENTORY_INSTALL_NOT_OWNED');
  const phase = await beginSourceOriginalCpInventoryPhase(holder, invocation), code = 70;
  phase.control = null; phase.received = Buffer.alloc(0); phase.transportClosed = false;
  phase.controlCloseRequested = false; phase.controlCloseObserved = false; phase.controlCloseFailure = null;
  const fail = error => {
    if (phase.firstFailure === null) {
      phase.firstFailure = [error]; phase.firstFailureCaughtAt = performance.now();
      phase.failureCutoff = Math.min(phase.cutoff, issued.deadline, phase.firstFailureCaughtAt + 240000);
    }
    // Early installation is not a producer. Unknown control/child closure is
    // retained and cannot authorize SAVE, cleanup, or a later producer.
    if (phase.control && !phase.controlCloseRequested) {
      phase.controlCloseRequested = true;
      try { phase.control.destroy(); } catch (closeError) { phase.controlCloseFailure ??= [closeError]; }
    }
    return keepSourceOriginalFailure(owner, phase.firstFailure[0]);
  };
  try {
    const fresh = assertPrivateSourceJobDeadline(holder);
    const parentCutoff = Math.min(phase.cutoff, fresh.deadline);
    if (!(parentCutoff > performance.now())) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
    const options = { target: issued.normalPrelude.productionTarget, quick: issued.normalRoute.request.quick,
      extended: issued.normalRoute.request.extended, checkpointOnly: issued.normalRoute.request.checkpointOnly };
    const selected = Buffer.from(JSON.stringify(options), 'utf8');
    if (selected.length < 2 || selected.length > 4096) sourceOriginalFailure('NORMAL_SELECTION_INVALID');
    const selector = Buffer.alloc(5 + selected.length);
    selector[0] = code; selector.writeUInt32BE(selected.length, 1); selected.copy(selector, 5);
    const nonce = crypto.randomBytes(32), challenge = Buffer.alloc(80);
    challenge.write('RRSCG4C1', 0, 'ascii'); nonce.copy(challenge, 8);
    challenge.writeUInt32BE(process.pid, 40);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ID), 44);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ATTEMPT), 52);
    Buffer.from(issued.identity.GITHUB_SHA, 'hex').copy(challenge, 60);
    const offline = (await import('./lib/copernicus-offline-environment.mjs')).copernicusOfflineEnvironment();
    const environment = Object.freeze({ ...offline, INPUT_OPERATION: 'source',
      GITHUB_RUN_ID: issued.identity.GITHUB_RUN_ID, GITHUB_RUN_ATTEMPT: issued.identity.GITHUB_RUN_ATTEMPT,
      GITHUB_SHA: issued.identity.GITHUB_SHA });
    const child = sourceCohortSpawn('python', ['-I', '-B',
      path.join(PRIVATE_RUNTIME_REPOSITORY_ROOT, 'scripts/lib/copernicus_component_process.py'),
      '--source-normal-program-cohort'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT, env: environment,
      stdio: ['ignore', 'ignore', 'ignore', 'pipe', phase.bank.handle.fd, phase.cache.handle.fd, phase.outputDirectory.handle.fd] });
    phase.child = child; phase.control = child.stdio[3];
    phase.childClosePromise = new Promise(resolve => child.once('close', (exitCode, signal) => {
      phase.childClose = Object.freeze({ exitCode, signal }); resolve();
    }));
    if (!phase.control) sourceOriginalFailure('CHILD_CLOCK_PIPE_REQUIRED');
    phase.controlClosePromise = new Promise(resolve => phase.control.once('close', () => {
      phase.controlCloseObserved = true; resolve();
    }));
    const control = phase.control;
    control.once('close', () => { phase.controlCloseObserved = true; });
    await new Promise((resolve, reject) => {
      let step = 'anchor', timer;
      const rejectOwned = error => { clearTimeout(timer); reject(fail(error)); };
      child.on('error', rejectOwned); control.on('error', rejectOwned);
      control.on('data', chunk => {
        if (phase.firstFailure !== null) return;
        try {
          phase.received = Buffer.concat([phase.received, chunk]);
          if (phase.received.length > 56 + 48 + 45 + 4096) sourceOriginalFailure('NORMAL_FRAME_INVALID');
          for (;;) {
            const pending = phase.received;
            let length = step === 'anchor' ? 56 : step === 'bounded' ? 48 : 45;
            if (pending.length < length) return;
            if (!pending.subarray(8, 40).equals(nonce)) sourceOriginalFailure('NORMAL_FRAME_INVALID');
            if (step === 'anchor') {
              if (pending.length !== 56 || pending.toString('ascii', 0, 8) !== 'RRSCG4A1'
                || pending.readUInt32BE(40) !== child.pid || pending.readUInt32BE(44) !== process.pid) sourceOriginalFailure('CHILD_CLOCK_IDENTITY_CHANGED');
              const current = assertPrivateSourceJobDeadline(holder);
              phase.after = performance.now(); phase.anchor = pending.readBigUInt64BE(48);
              if (phase.before > phase.after || phase.after >= parentCutoff) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
              phase.childCutoff = sourceChildAbsoluteCutoff(Math.min(parentCutoff, current.deadline), phase.after, phase.anchor);
              phase.failureClock = Object.freeze({ nonce, phase: code, after: phase.after,
                anchor: phase.anchor, parentCutoff: Math.min(parentCutoff, current.deadline) });
              const frame = Buffer.alloc(56);
              frame.write('RRSCG4D1', 0, 'ascii'); nonce.copy(frame, 8);
              frame.writeBigUInt64BE(phase.childCutoff, 40); frame.writeBigUInt64BE(phase.childCutoff, 48);
              phase.received = pending.subarray(length); step = 'bounded';
              control.write(frame, error => { if (error) rejectOwned(error); });
            } else if (step === 'bounded') {
              if (pending.toString('ascii', 0, 8) !== 'RRSCG4B1'
                || pending.readBigUInt64BE(40) !== phase.childCutoff) sourceOriginalFailure('NORMAL_FRAME_INVALID');
              phase.received = pending.subarray(length); step = 'receipt';
              control.write(selector, error => { if (error) rejectOwned(error); });
            } else if (step === 'receipt') {
              if (pending.toString('ascii', 0, 8) !== 'RRSPG4E1' || pending[40] !== code) sourceOriginalFailure('NORMAL_FRAME_INVALID');
              const bodyLength = pending.readUInt32BE(41);
              if (bodyLength < 2 || bodyLength > 4096) sourceOriginalFailure('NORMAL_FRAME_INVALID');
              length += bodyLength;
              if (pending.length < length) return;
              phase.result = JSON.parse(pending.subarray(45, length).toString('utf8'));
              phase.received = pending.subarray(length); step = 'closing';
            } else sourceOriginalFailure('NORMAL_FRAME_INVALID');
          }
        } catch (error) { rejectOwned(error); }
      });
      control.on('end', () => {
        if (step !== 'closing' || phase.received.length) rejectOwned(new Error('SOURCE_NORMAL_PIPE_LOST'));
      });
      child.once('close', (exitCode, signal) => {
        clearTimeout(timer);
        if (phase.firstFailure !== null) { reject(phase.firstFailure[0]); return; }
        if (step !== 'closing' || phase.received.length || !phase.controlCloseObserved
          || exitCode !== 0 || signal !== null || performance.now() >= parentCutoff) {
          rejectOwned(new Error('SOURCE_NORMAL_COHORT_UNPROVED')); return;
        }
        resolve();
      });
      timer = setTimeout(() => rejectOwned(new Error('SOURCE_NORMAL_COHORT_UNPROVED')),
        Math.max(0, Math.ceil(parentCutoff - performance.now())));
      phase.before = performance.now();
      control.write(challenge, error => { if (error) rejectOwned(error); });
    });
    const result = phase.result;
    if (result?.schemaVersion !== 1 || result.kind !== 'SOURCE_NORMAL_PHASE_CLOSED' || result.phase !== code
      || !Number.isInteger(result.exitCode) || result.exitCode < 0 || result.exitCode > 255
      || !Number.isSafeInteger(result.outputBytes) || result.outputBytes < 0 || result.outputBytes > 131072
      || !/^[0-9a-f]{64}$/.test(result.outputSha256 ?? '') || !result.outputs
      || Array.isArray(result.outputs) || Object.values(result.outputs).some(value => typeof value !== 'string' || value.length > 256)) {
      sourceOriginalFailure('NORMAL_RECEIPT_INVALID');
    }
    phase.transportClosed = true;
    await finishSourceOriginalCpInventoryPhase(holder, phase);
    return phase;
  } catch (error) { throw fail(error); }
}


// PRIVATE same-session adapters. All authority is in the actual entry/install
// WeakMaps; none of these records can be supplied by a caller or JSON.
const sourceJobDeadlineBrands = new WeakMap();
const sourceOriginalResultOwners = new WeakMap();
const sourceImmutableEntryRows = new WeakMap();
const isPlainObject=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
  &&Object.getPrototypeOf(value)===Object.prototype;
const sourcePreludeProgramCodes=Object.freeze({preflightProbe:23,preflightCache:29,
  distribution:30,publicManifest:31,progressCache:43});
const sourceRejectedPreviousRoutes=new Set(['originalTargetRegistry','legacyCurrentRequests',
  'handoffInstall','handoffClosure','protectedQuickPrepare']);

async function hashSourceOriginalBundleRow(owner,row) {
  // The actual entry already performed the full read/hash on this same live
  // descriptor. Reuse only that exact immutable admission with every identity
  // field unchanged. The finalizer still performs its FULL read before close.
  const original=sourceImmutableEntryRows.get(row);
  if(!original||!original.qualified||original.handle!==row.handle||original.fd!==row.handle.fd
    ||original.path!==row.path||original.bytes!==row.bytes||original.sha256!==row.sha256
    ||original.stat!==row.stat||!owner.bundles.some(bundle=>[...bundle.rows.values()].includes(row))) {
    sourceOriginalFailure('ENTRY_ORIGINAL_DIGEST_NOT_OWNED');
  }
  await checkSourceOriginalRow(owner,row);
  const identity=ownFileDescriptorIdentity(row.handle.fd);
  if(!identity||!original.descriptorIdentity||identity.dev!==original.descriptorIdentity.dev
    ||identity.ino!==original.descriptorIdentity.ino)sourceOriginalFailure('ENTRY_ORIGINAL_DIGEST_CHANGED');
  sourceOriginalOwner(owner.holder);
}

function sourceNormalPreludeState(holder) {
  const issued=assertPrivateSourceJobDeadline(holder),actual=sourceOwnerRecord(holder),state=issued.normalPrelude;
  if(!actual.admitted||state?.holder!==holder||state.firstFailure!==null
    ||state.root!==actual.tailContext.repositoryRoot) {
    if(state?.firstFailure!=null)throw state.firstFailure[0];
    sourceDeadlineFailure('SOURCE_PRELUDE_NOT_AVAILABLE');
  }
  assertActualSourceEntryInstallation(actual.owner);
  if((process.env.INPUT_FORCE??'false')!==state.requestForce
    ||process.env.RAVRADAR_PRODUCTION_TARGET_HOUR!==state.requestTarget)sourceDeadlineFailure('SOURCE_PRELUDE_REQUEST_CHANGED');
  return state;
}
async function prepareSourceCurrentNormalPrelude(holder) {
  const actual=sourceOwnerRecord(holder),context=actual.tailContext,issued=assertPrivateSourceJobDeadline(holder);
  assertActualSourceEntryInstallation(actual.owner);
  if(issued.normalPrelude.holder||!actual.admitted||context.session!==holder)sourceDeadlineFailure('SOURCE_PRELUDE_REUSED');
  const identity=context.identity,rootStat=await fs.lstat(context.repositoryRoot,{bigint:true});
  if(!rootStat.isDirectory()||rootStat.isSymbolicLink()||await fs.realpath(context.repositoryRoot)!==context.repositoryRoot
    ||!['integrated','integrated-historical-maintenance'].includes(identity.OPERATIONAL_ACTION)
    ||identity.QUICK_CONFIRMATION!=='false'||identity.CHECKPOINT_ONLY!=='false'
    ||identity.QUICK_PROGRESS_SOURCE!==''||identity.CHECKPOINT_TARGET_HOUR!=='')sourceDeadlineFailure('SOURCE_NORMAL_REQUEST_CHANGED');
  // Exact captured normal flags only. This is not a route issuer/override.
  issued.normalRoute=Object.freeze({action:identity.OPERATIONAL_ACTION,request:Object.freeze({
    quick:identity.QUICK_CONFIRMATION==='true',checkpointOnly:identity.CHECKPOINT_ONLY==='true',
    extended:identity.EXTENDED_PROVIDER_BOOTSTRAP==='true',quickProgressSource:identity.QUICK_PROGRESS_SOURCE,
    checkpointTargetHour:identity.CHECKPOINT_TARGET_HOUR,handoffRunId:'',produceHandoff:false,firstCutover:false,
  })});
  issued.normalPrelude={holder,root:context.repositoryRoot,rootStat,productionTarget:context.target,
    lockedTarget:context.target,requestForce:identity.INPUT_FORCE??'false',
    requestTarget:identity.RAVRADAR_PRODUCTION_TARGET_HOUR,firstFailure:null,phases:[],readers:[],
    inFlight:null,preflight:null,handoff:null,historicalTransition:Object.freeze({required:false}),
    legacyBootstrap:null,waveBootstrap:null,
    // These bookkeeping identities come from genuine entry/install results.
    // Every use also passes assertActualSourceEntryInstallation above.
    originalInstall:{result:context.restored,pending:false},originalPostInstall:null};
  return sourceNormalPreludeState(holder);
}
async function prepareSourceCurrentNormalPostInstall(holder) {
  const owner=sourceOriginalOwner(holder),state=sourceNormalPreludeState(holder),actual=sourceOwnerRecord(holder);
  if(state.originalPostInstall||owner.activeOperation||owner.workingGeneration)sourceOriginalFailure('NORMAL_POSTINSTALL_NOT_AVAILABLE');
  const record={pending:true,firstFailure:null,inspection:null};state.originalPostInstall=record;
  try {
    assertActualSourceEntryInstallation(owner);
    const forecast=owner.workingReaders.find(row=>row.path===path.join(owner.context.repository,'data/live/dmi-forecast-cache.json'));
    if(!forecast)sourceOriginalFailure('NORMAL_FORECAST_INPUT_REQUIRED');
    await hashSourceOriginalHandle(owner,forecast);
    const {inspectDmiForecastFile}=await import('./lib/dmi-forecast-file.mjs');
    record.inspection=await inspectDmiForecastFile(forecast.path);
    await hashSourceOriginalHandle(owner,forecast);
    // No old dated donor or transition is selected by this ordinary current
    // family entry. The genuine current forecast/state guards stay unchanged.
    for(const [name,relative] of [['previousConditions','data/live/conditions.json'],['previousHours','.cache/public-hour-delivery.pack']]) {
      const row=owner.workingReaders.find(item=>item.path===path.join(owner.context.repository,relative));
      if(!row)sourceOriginalFailure('NORMAL_COMPARISON_INPUT_NOT_OWNED');
      await preserveSourceNormalComparison(holder,name,row);
    }
    assertActualSourceEntryInstallation(owner);
    if(actual.tailContext.restored!==state.originalInstall.result)sourceOriginalFailure('ENTRY_INSTALL_BRAND_CHANGED');
    record.pending=false;
  }catch(error){record.firstFailure??=[error];throw keepSourceOriginalFailure(owner,record.firstFailure[0]);}
}
async function reconfirmSourceNormalMain(holder) {
  const issued=assertPrivateSourceJobDeadline(holder),context=sourceOwnerRecord(holder).tailContext;
  if(await reconfirmSourceNormalProducerMain(holder)!==context)sourceOriginalFailure('NORMAL_MAIN_CHANGED');
  assertPrivateSourceJobDeadline(holder);return issued;
}
export async function bindSourceOriginalProgress(holder,result) {
  const owner=sourceOriginalOwner(holder),actual=sourceOwnerRecord(holder);
  if(!actual.admitted||result!==actual.tailContext.restored||sourceOriginalResultOwners.get(result)!==owner
    ||owner.preparedInstall?.genuineResult!==actual.tailContext.installed)sourceOriginalFailure('RESULT_IDENTITY_REQUIRED');
  assertActualSourceEntryInstallation(owner);return assertSourceOriginalProgress(holder);
}

async function finalizeSourceCurrentNoWork(holder,decision) {
  const actual=sourceOwnerRecord(holder),owner=sourceOriginalOwner(holder),issued=assertPrivateSourceJobDeadline(holder);
  const prelude=sourceNormalPreludeState(holder),phase=decision?.phase,proof=sourcePreludePhases.get(phase);
  if(decision!==prelude.preflight||decision.shouldRun!==false||proof?.holder!==holder||proof.state!==prelude
    ||phase.name!=='preflightProbe'||phase.result?.outputs?.should_run!=='false'
    ||!phase.completed||!phase.transportClosed||phase.firstFailure!==null
    ||owner.activeOperation||owner.workingGeneration||owner.normalBase||owner.finalOwnerRelease
    ||prelude.progressCache||prelude.normalProgress||issued.normalDriver?.operation!==null
    ||issued.normalDriver?.tail!==null||actual.firstFailure!==null)sourceDeadlineFailure('SOURCE_PREFLIGHT_SKIP_NOT_OWNED');
  const closing={holder,owner,kind:'verified-normal-no-work',phase:'CHECKING',firstFailure:null,
    rows:[],closedReaders:[],cleanup:[]};owner.finalOwnerRelease=closing;
  try {
    const check=async()=>{
      assertActualSourceEntryInstallation(owner);await assertSourceOriginalProgress(holder);
      if(prelude.inFlight!==null||(prelude.writers??[]).some(row=>row.closed!==true))sourceOriginalFailure('FINAL_WRITER_STOP_UNPROVED');
      for(const observed of prelude.phases) {
        if(sourcePreludePhases.get(observed)?.state!==prelude||!observed.completed||!observed.transportClosed
          ||!observed.controlCloseObserved||observed.firstFailure!==null||observed.controlCloseFailure!==null
          ||observed.received.length)sourceOriginalFailure('FINAL_PRELUDE_STOP_UNPROVED');
      }
      await assertSourceCpPackClosureForFinalOwner(holder,owner.preparedInstall.packInvocation);
      await reconfirmSourceNormalMain(holder);
    };
    await check();closing.cleanup=await sourceOriginalInstallCleanupCatalog(holder);
    closing.rows=sourceFinalOwnedPReaderRows(owner,{},prelude);
    await check();for(const row of closing.rows)await hashSourceOriginalHandle(owner,row);
    const workflowObservation=freezeSourceOriginalMetadata(sourceWorkflowBaseObservation(holder));
    closing.phase='CLOSING';
    for(const row of closing.rows){const journal={row,fd:null,closeAttempted:false,closed:false,firstFailure:null};
      closing.closedReaders.push(journal);await closeSourceFinalReader(row,journal);}
    closing.phase='CLEANUP';for(const catalog of closing.cleanup)await removeSourceFinalOwnedCatalog(catalog);
    // A real no-change result only. No provider/output/B/S/SAVE/Pages claim.
    closing.phase='RELEASED';owner.phase='RELEASED';retainedSourceOriginalOwners.delete(owner);
    sourceNormalWorkflowObservations.set(decision,workflowObservation);
    return decision;
  }catch(error){closing.firstFailure??=[error];closing.phase='RETAINED';throw keepSourceOriginalFailure(owner,closing.firstFailure[0]);}
}

export function sourceNormalOperationalControlReport(operation) {
  const report=sourceCurrentControlReports.get(operation);
  if(arguments.length!==1||!report)sourceOriginalFailure('CURRENT_CONTROLS_NOT_AVAILABLE');
  return report; // Fixed diagnostic projection only; never owner/SAVE/closure.
}

// Private constructor fragment: actual entry/install results -> the SAME
// reviewed lifetime kernel. No old restore, origin, model or tuple issuer.
const sourceEntrySnapshotRows = new WeakMap();
function sourceEntryRowView(entryRow, immutableOriginal = false) {
  if (!entryRow || !entryRow.qualified || entryRow.handle.fd !== entryRow.fd
    || entryRow.descriptorIdentity === null) sourceOriginalFailure('ENTRY_ROW_NOT_OWNED');
  let view=sourceEntrySnapshotRows.get(entryRow);
  if(!view) {
    view={path:entryRow.path,handle:entryRow.handle,fd:entryRow.fd,stat:entryRow.stat,
      bytes:entryRow.bytes,sha256:entryRow.sha256,
      directories:entryRow.parents.map(parent=>({path:parent.path,stat:parent}))};
    sourceEntrySnapshotRows.set(entryRow,view);
  }
  if(immutableOriginal)sourceImmutableEntryRows.set(view,entryRow);
  return view;
}
async function adoptSourceNormalAdmittedSession(session) {
  const installation=sourceOwnerRecord(session);
  if(installation.phase!=='INSTALLED'||installation.admitted||installation.tailContext
    ||installation.firstFailure!==null||installation.owner.firstFailure!==null) sourceOriginalFailure('ENTRY_TAIL_ADOPTION_REUSED');
  // This is the actual entry's last whole B/S/current-admin validation. The
  // exact same identity is consumed; no supplied report or snapshot issues it.
  await consumeSourceNormalProducerSession(session);
  const context=sourceNormalProducerTailContext(session);
  if(context.session!==session||context.sourceInstallation!==installation.context
    ||context.installed!==installation.result||context.restored!==installation.input.restored
    ||context.repositoryRoot!==installation.input.repositoryRoot
    ||context.bundlePath!==installation.input.bundlePath
    ||context.bundleVerification!==installation.input.verification) sourceOriginalFailure('ENTRY_TAIL_ADOPTION_CHANGED');
  const actualPack=privateRuntimeInstallationPack(context.installed),actualFiles=privateRuntimeInstallationFiles(context.installed);
  if(actualPack.sourceInventoryContext!==installation.context||actualPack.invocation!==installation.invocation
    ||actualFiles!==context.installedFiles) sourceOriginalFailure('ENTRY_INSTALL_BRAND_CHANGED');
  installation.tailContext=context;installation.admitted=true;
  installation.installDescriptor=actualPack;installation.installedFiles=actualFiles;
  const owner=installation.owner,issued=assertPrivateSourceJobDeadline(session);
  issued.originalOwner=owner;owner.phase='READY';owner.kind='single';
  owner.activeReads=new Set();owner.activeOperation=null;owner.requiresSourceTransform=false;
  owner.workingReaders=context.workingRows.map(row=>sourceEntryRowView(row));
  owner.operationReaders??=[];
  const originals=new Map();
  for(const entryRow of context.immutableRows) {
    const row=sourceEntryRowView(entryRow,true),relative=path.relative(context.bundlePath,row.path).split(path.sep).join('/');
    if(relative==='manifest.json'||relative.startsWith('payload/'))originals.set(relative,row);
    else owner.operationReaders.push(row); // e.g. actual centrally hydrated registry
  }
  const descriptor=context.originalPointer.pointer.current;
  const bundle={descriptor,manifest:context.bundleVerification.manifest,rows:originals,
    selected:{finalBundle:context.bundlePath}};
  if(descriptor.bundleContentSha256!==context.bundleVerification.bundleContentSha256
    ||!originals.has('manifest.json')||context.bundleVerification.files.some(file=>{
      const row=originals.get('payload/'+file.relativePath);
      return !row||row.bytes!==file.bytes||row.sha256!==file.sha256;
    }))sourceOriginalFailure('ENTRY_ORIGINAL_INVENTORY_CHANGED');
  owner.bundles=[bundle];
  const checkpoint=sourceEntryRowView(context.checkpointRow);
  // S is a retained original input, not an extra normal INSTALL output.
  // The genuine install inventory/order remains byte-for-byte authoritative.
  if(!owner.operationReaders.some(row=>row.handle===checkpoint.handle))owner.operationReaders.push(checkpoint);
  owner.initialOperationalRows=new Map([[checkpoint.path,checkpoint]]);
  const installed={genuineResult:context.installed,genuineDescriptor:actualPack,genuineFiles:actualFiles,
    repository:context.repositoryRoot,source:context.restoredPath,completed:false,
    packInvocation:actualPack.invocation,componentStage:actualPack.componentStage,
    cpInventoryContext:installation.context,rows:new Map(),files:[]};
  owner.preparedInstall=installed; // retain all partial stage readers on failure
  try {
    const packed=actualPack.invocation===null?[]:await actualPack.invocation;
    if(actualPack.invocation!==null)await assertSourceCpPackClosureForFinalOwner(session,actualPack.invocation);
    const byPacked=new Map(packed.map(file=>[file.relativePath,file]));
    for(const file of actualFiles) {
      const destination=path.join(context.repositoryRoot,file.relativePath);
      const output=owner.workingReaders.find(row=>row.path===destination);
      if(!output||output.bytes!==file.bytes||output.sha256!==file.sha256)sourceOriginalFailure('ENTRY_INSTALLED_OUTPUT_CHANGED');
      let input=originals.get('payload/'+file.relativePath);
      if(!input) {
        const entry=byPacked.get(file.relativePath),catalog=installation.catalog?.files.find(row=>row.relativePath===file.relativePath);
        if(!entry||!catalog||catalog.path!==entry.sourcePath||catalog.bytes!==file.bytes||catalog.sha256!==file.sha256
          ||entry.sourcePath!==path.join(actualPack.componentStage,file.relativePath))sourceOriginalFailure('ENTRY_COMPONENT_SOURCE_CHANGED');
        input=await openSourceOutputRow(owner,actualPack.componentStage,entry.sourcePath,file);
        if(!sameSourceOriginalStat(input.stat,catalog.stat,true))sourceOriginalFailure('ENTRY_COMPONENT_BIRTH_CHANGED');
      }
      if(input.bytes!==output.bytes||input.sha256!==output.sha256)sourceOriginalFailure('ENTRY_INSTALL_BYTES_CHANGED');
      installed.rows.set(file.relativePath,input);installed.files.push({input,output,destination});
    }
    const conditions=originals.get('payload/data/live/conditions.json');
    if(!conditions)sourceOriginalFailure('ENTRY_CONDITIONS_REQUIRED');
    owner.progressBinding=Object.freeze({repositoryRoot:context.repositoryRoot,
      repository:context.identity.GITHUB_REPOSITORY,baselineSha256:conditions.sha256,
      protectedBundleContentSha256:descriptor.bundleContentSha256,
      productionReferenceAt:descriptor.productionReferenceAt});
    sourceOriginalResultOwners.set(context.restored,owner);
    installed.completed=true; // bookkeeping only; actual WeakMaps remain required
    sourceOriginalOwner(session);await assertSourceOriginalProgress(session);
    return session;
  }catch(error){throw keepSourceOriginalFailure(owner,error);}
}
function assertActualSourceEntryInstallation(owner) {
  const actual=sourceOwnerRecord(owner.holder),context=actual.tailContext;
  if(!actual.admitted||context!==sourceNormalProducerTailContext(owner.holder)
    ||owner.preparedInstall?.genuineResult!==context.installed
    ||privateRuntimeInstallationPack(context.installed)!==actual.installDescriptor
    ||privateRuntimeInstallationFiles(context.installed)!==actual.installedFiles
    ||owner.preparedInstall.genuineDescriptor!==actual.installDescriptor
    ||owner.preparedInstall.genuineFiles!==actual.installedFiles)sourceOriginalFailure('ENTRY_INSTALL_BRAND_CHANGED');
}

const SOURCE_LEGACY_REQUEST = '.cache/dmi-legacy-current-original-requests.json';
const SOURCE_LEGACY_OUTPUT = '.cache/dmi-legacy-current-originals.json';
const SOURCE_DEPLOYED_COPY = '.cache/deployed-dmi-bulk-cache.json';
const SOURCE_LEGACY_INPUTS = Object.freeze({ zones: 'data/zones.geojson',
  deployedBulk: SOURCE_DEPLOYED_COPY, forecast: 'data/live/dmi-forecast-cache.json',
  candidate: '.cache/dmi-candidate-progress.json', active: '.cache/dmi-active-complete.json' });
const SOURCE_LEGACY_BINDING_KEYS = Object.freeze(Object.keys(ravScoreModelBinding()));
function sourceLegacyExpectationMetadata(plan, requestsSha256, target) {
  const sha = value => typeof value === 'string' && /^sha256:[a-f0-9]{64}$/.test(value);
  const version2 = isPlainObject(plan) && plan.schemaVersion === 2;
  const fields = 'documentContexts,historyDemandSha256,kind,modelBinding,productionReferenceAt,projectionWitnesses,reconstructionRequests,registrySha256,schemaVersion,sourceHashes,sourcePaths';
  const exactFields = version2 ? 'documentContexts,existingNativeOriginals,' + fields.slice('documentContexts,'.length) : fields;
  if (!isPlainObject(plan) || ![1, 2].includes(plan.schemaVersion)
    || plan.kind !== 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS'
    || Object.keys(plan).sort().join(',') !== exactFields
    || plan.productionReferenceAt !== sourceNormalUtcHour(target) || !sha(requestsSha256)
    || !sha(plan.historyDemandSha256) || !sha(plan.registrySha256)
    || !isPlainObject(plan.sourceHashes) || !same(plan.sourcePaths, SOURCE_LEGACY_INPUTS)
    || Object.keys(plan.sourceHashes).sort().join(',') !== 'active,candidate,deployedBulk,forecast,zones'
    || Object.entries(plan.sourceHashes).some(([role, value]) =>
      !sha(value) && !(value === null && ['candidate', 'active'].includes(role)))
    || !Array.isArray(plan.reconstructionRequests) || plan.reconstructionRequests.length > 2 * 673 * 124
    || version2 && (!Array.isArray(plan.existingNativeOriginals) || !plan.existingNativeOriginals.length
      || plan.reconstructionRequests.length + plan.existingNativeOriginals.length > 2 * 673 * 124)
    || !Array.isArray(plan.projectionWitnesses) || plan.projectionWitnesses.length > 673 * 124
    || !Array.isArray(plan.documentContexts) || plan.documentContexts.length > 3) sourceOriginalFailure('LEGACY_REQUEST_METADATA_INVALID');
  assertRavScoreModelBinding(plan.modelBinding, 'SOURCE legacy current issuer binding');
  // Bound ENCODED strings, not ASCII/code-point counts: JSON escaping can grow.
  // The exact issuer fixes all eleven values; its current maximum encoded
  // string is 98 bytes. This deliberately separate metadata bound also admits
  // every nine-string combination <=256 encoded bytes, plus the two hex64s.
  if (SOURCE_LEGACY_BINDING_KEYS.some(key => typeof plan.modelBinding[key] !== 'string'
    || Buffer.byteLength(JSON.stringify(plan.modelBinding[key]), 'utf8') > 256)) {
    sourceOriginalFailure('LEGACY_BINDING_METADATA_BOUND');
  }
  const expectation = { productionReferenceAt: plan.productionReferenceAt,
    modelBinding: plan.modelBinding, historyDemandSha256: plan.historyDemandSha256,
    registrySha256: plan.registrySha256, sourceHashes: plan.sourceHashes, requestsSha256 };
  const serialized = JSON.stringify(expectation);
  // Symbolic compact maximum =3435 bytes: nine encoded strings256, two
  // hex64 strings66, fixed keys, a UTC24 and eight SHA71s. Null is shorter.
  if (Buffer.byteLength(serialized, 'utf8') > 4096) sourceOriginalFailure('LEGACY_EXPECTATION_METADATA_BOUND');
  return freezeSourceOriginalMetadata({ expectation, serialized,
    requestCount: plan.reconstructionRequests.length });
}
export async function sourceNormalDeployedCopyInput(holder) {
  const owner = sourceOriginalOwner(holder), copy = owner.normalDeployedCopy;
  if (!copy || copy.completed || owner.activeOperation !== copy.operation
    || !owner.workingOperation?.completed || copy.input.holder !== holder) {
    sourceOriginalFailure('NORMAL_DEPLOYED_COPY_NOT_OWNED');
  }
  await hashSourceOriginalHandle(owner, copy.input.original);
  return copy.input;
}
export async function assertSourceNormalDeployedCopyInput(holder, input) {
  const owner = sourceOriginalOwner(holder), copy = owner.normalDeployedCopy;
  if (!copy || copy.completed || copy.input !== input || owner.activeOperation !== copy.operation) {
    sourceOriginalFailure('NORMAL_DEPLOYED_COPY_NOT_OWNED');
  }
  await checkSourceOriginalRow(owner, input.original);
  for (const directory of input.directories) {
    const now = await fs.lstat(directory.path, { bigint: true });
    if (!now.isDirectory() || now.isSymbolicLink()
      || !sameSourceOriginalStat(directory.stat, now, false)) sourceOriginalFailure('NORMAL_DEPLOYED_DIRECTORY_CHANGED');
  }
  sourceOriginalOwner(holder); // includes the same issued absolute deadline
}
async function runSourceNormalDeployedBulkCopy(holder) {
  const owner = sourceOriginalOwner(holder);
  if (owner.activeOperation || owner.normalDeployedCopy || !owner.workingOperation?.completed) {
    sourceOriginalFailure('NORMAL_DEPLOYED_COPY_REUSED');
  }
  const operation = Object.freeze({});
  const copy = { operation, input: null, completed: false, row: null };
  owner.normalDeployedCopy = copy; owner.activeOperation = operation;
  try {
    await assertSourceOriginalProgress(holder);
    const source = currentSourceWorkingRows(owner).get(path.join(owner.context.repository, 'data/live/dmi-bulk-cache.json'));
    if (!source) sourceOriginalFailure('NORMAL_DEPLOYED_SOURCE_REQUIRED');
    await hashSourceOriginalHandle(owner, source);
    const located = await locateSourceNormalOutput(owner, { name: 'deployedBulkCopy' }, SOURCE_DEPLOYED_COPY);
    if (!located.absent) sourceOriginalFailure('NORMAL_DEPLOYED_DESTINATION_EXISTS');
    copy.input = Object.freeze({ holder, root: owner.context.repository, original: source,
      handle: source.handle, bytes: source.bytes, sha256: source.sha256,
      destination: located.path, directories: Object.freeze(located.directories) });
    const progress = await import('./weather-component-progress-cache.mjs');
    await progress.copySourceNormalDeployedBulk(holder);
    const result = progress.sourceNormalDeployedCopyCompletion(holder);
    if (result.input !== copy.input || !result.closed || result.bytes !== source.bytes
      || result.sha256 !== source.sha256) sourceOriginalFailure('NORMAL_DEPLOYED_COPY_UNPROVED');
    const row = await openSourceOutputRow(owner, owner.context.repository, located.path, source);
    copy.row = row;
    await hashSourceOriginalHandle(owner, source);
    await hashSourceOriginalHandle(owner, row);
    await assertSourceOriginalProgress(holder);
    sourceOriginalOwner(holder);
    if (owner.activeOperation !== operation) sourceOriginalFailure('NORMAL_DEPLOYED_COPY_CHANGED');
    copy.completed = true; owner.activeOperation = null;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}
async function runSourceNormalLegacyCurrentRequests(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), issued = assertPrivateSourceJobDeadline(holder);
  const prelude = issued.normalPrelude;
  if (state.dmiStarted || prelude.legacyCurrentRequests || !prelude.generationPreparation
    || prelude.handoff?.reused || !state.owner.normalDeployedCopy?.completed) {
    sourceOriginalFailure('NORMAL_LEGACY_REQUEST_PHASE_REUSED');
  }
  for (const relative of [SOURCE_LEGACY_REQUEST, SOURCE_LEGACY_OUTPUT]) {
    const stat = await fs.lstat(path.join(state.owner.context.repository, relative)).catch(error => {
      if (error?.code === 'ENOENT') return null; throw error;
    });
    if (stat !== null) sourceOriginalFailure('NORMAL_LEGACY_UNOWNED_FILE');
  }
  if (!issued.normalRoute.request.checkpointOnly || prelude.currentHistoryPlan?.required !== true) {
    prelude.legacyCurrentRequests = Object.freeze({ required: false });
    return;
  }
  const phase = await runSourceRequiredProgram(holder, operation, 'legacyCurrentRequests');
  const generation = await assertSourceNormalGeneration(holder, operation);
  const row = generation.rows.find(item => item.path === path.join(state.owner.context.repository, SOURCE_LEGACY_REQUEST));
  if (!row || !phase.outputRows.includes(row) || !phase.completed || !phase.transportClosed
    || phase.result.exitCode !== 0 || phase.result.outputs.requests_sha256 !== 'sha256:' + row.sha256) {
    sourceOriginalFailure('NORMAL_LEGACY_REQUEST_PHASE_UNPROVED');
  }
  const plan = JSON.parse((await sourceNormalRowBytes(holder, row, 192 * 1024 * 1024)).toString('utf8'));
  const metadata = sourceLegacyExpectationMetadata(plan, 'sha256:' + row.sha256, state.lockedTarget);
  const inputs = new Map(), expectation = metadata.expectation;
  for (const [role, relative] of Object.entries(SOURCE_LEGACY_INPUTS)) {
    const file = path.join(state.owner.context.repository, relative);
    const stat = await fs.lstat(file, { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null; throw error;
    });
    if (stat === null) {
      if (!['candidate', 'active'].includes(role) || expectation.sourceHashes[role] !== null) {
        sourceOriginalFailure('NORMAL_LEGACY_INPUT_MISSING');
      }
      inputs.set(role, null); continue;
    }
    const input = generation.rows.find(item => item.path === file)
      ?? await openSourceOutputRow(state.owner, state.owner.context.repository, file);
    await hashSourceOriginalHandle(state.owner, input);
    if (expectation.sourceHashes[role] !== 'sha256:' + input.sha256) sourceOriginalFailure('NORMAL_LEGACY_INPUT_CHANGED');
    inputs.set(role, input);
  }
  const registry = await openSourceOutputRow(state.owner, state.owner.context.repository,
    path.join(state.owner.context.repository, 'data/live/coastal-parts-v2.json'));
  if (expectation.registrySha256 !== 'sha256:' + registry.sha256
    || expectation.historyDemandSha256 !== 'sha256:' + prelude.currentHistoryPlan.row.sha256
    || inputs.get('deployedBulk')?.sha256 !== state.owner.normalDeployedCopy.row.sha256) {
    sourceOriginalFailure('NORMAL_LEGACY_INPUT_CHANGED');
  }
  inputs.set('registry', registry);
  inputs.set('history', prelude.currentHistoryPlan.row);
  await assertSourceNormalGeneration(holder, operation);
  sourceDmiWorkingState(holder, operation);
  prelude.legacyCurrentRequests = Object.freeze({ required: true, phase, row,
    requestsSha256: 'sha256:' + row.sha256, expectation: metadata.expectation,
    expectationJson: metadata.serialized, requestCount: metadata.requestCount, inputs });
}
async function assertSourceNormalLegacyCurrentRequests(holder, operation, beforeDmi) {
  const state = sourceDmiWorkingState(holder, operation), prelude = assertPrivateSourceJobDeadline(holder).normalPrelude;
  const selected = prelude.legacyCurrentRequests;
  if (!selected || typeof selected.required !== 'boolean') sourceOriginalFailure('NORMAL_LEGACY_REQUEST_REQUIRED');
  if (!selected.required) {
    for (const relative of [SOURCE_LEGACY_REQUEST, SOURCE_LEGACY_OUTPUT]) {
      if (await fs.lstat(path.join(state.owner.context.repository, relative)).catch(error => {
        if (error?.code === 'ENOENT') return null; throw error;
      })) sourceOriginalFailure('NORMAL_LEGACY_UNOWNED_FILE');
    }
    return;
  }
  await hashSourceOriginalHandle(state.owner, selected.row);
  if ('sha256:' + selected.row.sha256 !== selected.requestsSha256
    || !selected.phase.completed || !selected.phase.transportClosed) sourceOriginalFailure('NORMAL_LEGACY_REQUEST_CHANGED');
  for (const [role, original] of selected.inputs) {
    if (!beforeDmi && ['candidate', 'active'].includes(role)) continue;
    if (original) await hashSourceOriginalHandle(state.owner, original);
    else if (await fs.lstat(path.join(state.owner.context.repository, SOURCE_LEGACY_INPUTS[role])).catch(error => {
      if (error?.code === 'ENOENT') return null; throw error;
    })) sourceOriginalFailure('NORMAL_LEGACY_ABSENCE_CHANGED');
  }
  if (!beforeDmi) {
    const output = await fs.lstat(path.join(state.owner.context.repository, SOURCE_LEGACY_OUTPUT), { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null; throw error;
    });
    const generation = await assertSourceNormalGeneration(holder, operation);
    const row = generation.rows.find(item => item.path === path.join(state.owner.context.repository, SOURCE_LEGACY_OUTPUT));
    if (selected.requestCount > 0 ? !output || !row || !state.outputRows.includes(row) : output !== null) {
      sourceOriginalFailure('NORMAL_LEGACY_OUTPUT_UNPROVED');
    }
    if (row) await hashSourceOriginalHandle(state.owner, row);
  }
  sourceDmiWorkingState(holder, operation);
}

// Private preparation only: a validated deadline never authorizes a restore.

const SOURCE_DIAGNOSTIC_GUARD_CODES = new Set(["SOURCE_ARCHIVED_BINDING_CHANGED","SOURCE_ARCHIVED_DESTINATION_INVALID","SOURCE_ARCHIVED_HEAD_REFUSED","SOURCE_ARCHIVED_PREPARATION_REUSED","SOURCE_ARCHIVED_READER_CHANGED","SOURCE_ARCHIVED_READER_INVALID","SOURCE_ARCHIVED_READER_REQUIRED","SOURCE_ARCHIVED_READER_REUSED","SOURCE_CHECKPOINT_CACHE_FAILED","SOURCE_CHECKPOINT_REQUEST_INVALID","SOURCE_CHECKPOINT_ROUTE_NOT_AVAILABLE","SOURCE_COMPLETE_ACCEPTS_NO_CALLER_OPTIONS","SOURCE_CURRENT_ORIGINAL_NEW_HOUR_REQUIRED","SOURCE_DISTRIBUTION_NOT_READY","SOURCE_FIXED_ACTION_ENTRY_REQUIRED","SOURCE_HANDOFF_EXACT_CACHE_REQUIRED","SOURCE_HANDOFF_REQUEST_INVALID","SOURCE_HANDOFF_REQUIRED","SOURCE_HANDOFF_ROOT_CHANGED","SOURCE_HANDOFF_SELECTION_REUSED","SOURCE_HANDOFF_TARGET_CHANGED","SOURCE_JOB_CLOCK_INCONSISTENT","SOURCE_JOB_CLOCK_INVALID","SOURCE_JOB_DEADLINE_EXPIRED","SOURCE_JOB_DEADLINE_NOT_ISSUED","SOURCE_JOB_HTTP_DATE_INVALID","SOURCE_JOB_IDENTITY_INVALID","SOURCE_JOB_LIST_INCOMPLETE","SOURCE_JOB_METADATA_BODY_DEADLINE","SOURCE_JOB_PROCESS_IDENTITY_CHANGED","SOURCE_JOB_PROCESS_IDENTITY_INVALID","SOURCE_JOB_RUN_IDENTITY_INVALID","SOURCE_JOB_STARTED_AT_INVALID","SOURCE_NORMAL_CACHE_SAVE_FAILED","SOURCE_NORMAL_CENTRAL_CREDENTIALS_REQUIRED","SOURCE_NORMAL_CENTRAL_PROFILE_REQUIRED","SOURCE_NORMAL_CENTRAL_ROWS_INVALID","SOURCE_NORMAL_COHORT_UNPROVED","SOURCE_NORMAL_DRIVER_REUSED","SOURCE_NORMAL_EVENT_INVALID","SOURCE_NORMAL_OPERATIONAL_ACTION_REFUSED","SOURCE_NORMAL_PHASE_FAILED","SOURCE_NORMAL_PIPE_LOST","SOURCE_NORMAL_REQUEST_CHANGED","SOURCE_NORMAL_REQUEST_INVALID","SOURCE_NORMAL_ROUTE_ALREADY_SELECTED","SOURCE_ORIGINAL_ADMISSION_INCOMPLETE","SOURCE_ORIGINAL_ADMISSION_REUSED","SOURCE_ORIGINAL_ARTIFACT_BUNDLE_CHANGED","SOURCE_ORIGINAL_ARTIFACT_CHECKPOINT_ACK_INVALID","SOURCE_ORIGINAL_ARTIFACT_CHECKPOINT_NOT_OWNED","SOURCE_ORIGINAL_ARTIFACT_DESTINATION_IS_ORIGINAL","SOURCE_ORIGINAL_ARTIFACT_DISPOSITION_CHANGED","SOURCE_ORIGINAL_ARTIFACT_DISPOSITION_CLOSE_UNPROVED","SOURCE_ORIGINAL_ARTIFACT_DISPOSITION_DIRECTORY_CHANGED","SOURCE_ORIGINAL_ARTIFACT_DISPOSITION_INVALID","SOURCE_ORIGINAL_ARTIFACT_DISPOSITION_OUTPUT_CHANGED","SOURCE_ORIGINAL_ARTIFACT_GENERATION_CHANGED","SOURCE_ORIGINAL_ARTIFACT_INPUT_BYTES_CHANGED","SOURCE_ORIGINAL_ARTIFACT_INPUT_NOT_OWNED","SOURCE_ORIGINAL_ARTIFACT_INPUT_NOT_SETTLED","SOURCE_ORIGINAL_ARTIFACT_MANIFEST_CHANGED","SOURCE_ORIGINAL_ARTIFACT_PRIVATE_ACK_INVALID","SOURCE_ORIGINAL_ARTIFACT_PUBLICATION_NOT_AVAILABLE","SOURCE_ORIGINAL_ARTIFACT_PUBLISH_NOT_CLOSED","SOURCE_ORIGINAL_ARTIFACT_ROOT_NOT_FIXED","SOURCE_ORIGINAL_ARTIFACT_SPEC_INVALID","SOURCE_ORIGINAL_ARTIFACT_SPEC_PATH_INVALID","SOURCE_ORIGINAL_ARTIFACT_STAGE_ALREADY_EXISTS","SOURCE_ORIGINAL_ARTIFACT_STAGE_DIRECTORY_CHANGED","SOURCE_ORIGINAL_ARTIFACT_STAGE_DIRECTORY_INVALID","SOURCE_ORIGINAL_ARTIFACT_STAGE_NOT_AVAILABLE","SOURCE_ORIGINAL_ARTIFACT_STAGE_NOT_CLOSED","SOURCE_ORIGINAL_ARTIFACT_UPLOAD_ACK_INVALID","SOURCE_ORIGINAL_BASELINE_REQUIRED","SOURCE_ORIGINAL_BYTES_CHANGED","SOURCE_ORIGINAL_CACHE_GENERATION_INVALID","SOURCE_ORIGINAL_CHILD_CLOCK_EXPIRED","SOURCE_ORIGINAL_CHILD_CLOCK_FRAME_INVALID","SOURCE_ORIGINAL_CHILD_CLOCK_IDENTITY_CHANGED","SOURCE_ORIGINAL_CHILD_CLOCK_INVALID","SOURCE_ORIGINAL_CHILD_CLOCK_PIPE_LOST","SOURCE_ORIGINAL_CHILD_CLOCK_PIPE_REQUIRED","SOURCE_ORIGINAL_COMPONENT_MATERIALIZER_UNAVAILABLE","SOURCE_ORIGINAL_CONDITIONS_OUTPUT_REQUIRED","SOURCE_ORIGINAL_CP_INVENTORY_ACK_INVALID","SOURCE_ORIGINAL_CP_INVENTORY_BANK_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_CLOSURE_UNPROVED","SOURCE_ORIGINAL_CP_INVENTORY_CONTEXT_NOT_AVAILABLE","SOURCE_ORIGINAL_CP_INVENTORY_DEADLINE_EXPIRED","SOURCE_ORIGINAL_CP_INVENTORY_FD_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_FILE_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_FILE_TRUNCATED","SOURCE_ORIGINAL_CP_INVENTORY_INSTALL_NOT_OWNED","SOURCE_ORIGINAL_CP_INVENTORY_INVOCATION_NOT_OWNED","SOURCE_ORIGINAL_CP_INVENTORY_JSON_INVALID","SOURCE_ORIGINAL_CP_INVENTORY_MANIFEST_UNPROVED","SOURCE_ORIGINAL_CP_INVENTORY_OUTPUT_BIRTH_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_OUTPUT_EXISTS","SOURCE_ORIGINAL_CP_INVENTORY_OUTPUT_INVENTORY_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_PATH_ALIAS","SOURCE_ORIGINAL_CP_INVENTORY_READBACK_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_RESULT_NOT_OWNED","SOURCE_ORIGINAL_CP_INVENTORY_SOURCE_BINDING_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_STAGE_BIRTH_CHANGED","SOURCE_ORIGINAL_CP_INVENTORY_STAGE_BIRTH_UNPROVED","SOURCE_ORIGINAL_CP_INVENTORY_STAGE_EXISTS","SOURCE_ORIGINAL_CP_INVENTORY_STAGE_PARENT_CHANGED","SOURCE_ORIGINAL_CP_PROGRESS_INVOCATION_NOT_OWNED","SOURCE_ORIGINAL_CP_PROGRESS_NOT_AVAILABLE","SOURCE_ORIGINAL_CP_PROGRESS_OWNER_CHANGED","SOURCE_ORIGINAL_CP_PROGRESS_SOURCE_CHANGED","SOURCE_ORIGINAL_DECLARED_FILE_REQUIRED","SOURCE_ORIGINAL_DIRECTORY_CHANGED","SOURCE_ORIGINAL_DIRECTORY_INVALID","SOURCE_ORIGINAL_DMI_COHORT_CHANGED","SOURCE_ORIGINAL_DMI_COHORT_NOT_AVAILABLE","SOURCE_ORIGINAL_DMI_COHORT_UNPROVED","SOURCE_ORIGINAL_DMI_OUTCOME_NOT_OBSERVED","SOURCE_ORIGINAL_DMI_OUTPUT_FRAME_INVALID","SOURCE_ORIGINAL_DMI_STAGE_BUDGET_NOT_NORMAL","SOURCE_ORIGINAL_DMI_WORKING_ABSENCE_CHANGED","SOURCE_ORIGINAL_DMI_WORKING_COMPLETION_UNPROVED","SOURCE_ORIGINAL_DMI_WORKING_DIRECTORY_CHANGED","SOURCE_ORIGINAL_DMI_WORKING_FILE_INVALID","SOURCE_ORIGINAL_DMI_WORKING_INPUT_CHANGED","SOURCE_ORIGINAL_DMI_WORKING_INPUT_NOT_ADMITTED","SOURCE_ORIGINAL_DMI_WORKING_INSTALL_REUSED","SOURCE_ORIGINAL_DMI_WORKING_OPERATION_REQUIRED","SOURCE_ORIGINAL_DMI_WORKING_ORIGINAL_CHANGED","SOURCE_ORIGINAL_DMI_WORKING_OUTPUT_LOST","SOURCE_ORIGINAL_DMI_WORKING_PATH_AMBIGUOUS","SOURCE_ORIGINAL_DMI_WORKING_PATH_INVALID","SOURCE_ORIGINAL_DMI_WORKING_PRESERVATION_CHANGED","SOURCE_ORIGINAL_DMI_WORKING_ROUTE_NOT_NORMAL","SOURCE_ORIGINAL_FILE_CHANGED","SOURCE_ORIGINAL_FILE_INVALID","SOURCE_ORIGINAL_FINAL_CLEANUP_DIRECTORY_CHANGED","SOURCE_ORIGINAL_FINAL_CLEANUP_FILE_CHANGED","SOURCE_ORIGINAL_FINAL_CLEANUP_FILE_CONFLICT","SOURCE_ORIGINAL_FINAL_CLEANUP_INVENTORY_CHANGED","SOURCE_ORIGINAL_FINAL_CLEANUP_PATH_INVALID","SOURCE_ORIGINAL_FINAL_CLEANUP_REUSED","SOURCE_ORIGINAL_FINAL_CLEANUP_ROOT_CHANGED","SOURCE_ORIGINAL_FINAL_CLEANUP_UNKNOWN_ENTRY","SOURCE_ORIGINAL_FINAL_CP_OUTPUT_CHANGED","SOURCE_ORIGINAL_FINAL_CP_SUBTREE_ACK_UNAVAILABLE","SOURCE_ORIGINAL_FINAL_DURABLE_ACK_CHANGED","SOURCE_ORIGINAL_FINAL_DURABLE_PUBLICATION_UNPROVED","SOURCE_ORIGINAL_FINAL_INSTALL_NOT_COMPLETE","SOURCE_ORIGINAL_FINAL_INSTALL_STAGE_IDENTITY_UNPROVED","SOURCE_ORIGINAL_FINAL_INSTALL_STAGE_INVENTORY_CHANGED","SOURCE_ORIGINAL_FINAL_INSTALL_STAGE_NOT_OWNED","SOURCE_ORIGINAL_FINAL_NORMAL_STOP_UNPROVED","SOURCE_ORIGINAL_FINAL_OWNER_CLOSE_NOT_ISSUED","SOURCE_ORIGINAL_FINAL_OWNER_RELEASE_REUSED","SOURCE_ORIGINAL_FINAL_PACK_CLOSURE_UNAVAILABLE","SOURCE_ORIGINAL_FINAL_PACK_CP_ABSENCE_UNPROVED","SOURCE_ORIGINAL_FINAL_PACK_OWNER_UNAVAILABLE","SOURCE_ORIGINAL_FINAL_PRELUDE_STOP_UNPROVED","SOURCE_ORIGINAL_FINAL_PRODUCER_STOP_UNPROVED","SOURCE_ORIGINAL_FINAL_PROGRESS_READER_CONFLICT","SOURCE_ORIGINAL_FINAL_PROGRESS_READER_NOT_ARMED","SOURCE_ORIGINAL_FINAL_PROGRESS_TEMP_BIRTH_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_TEMP_BIRTH_UNPROVED","SOURCE_ORIGINAL_FINAL_PROGRESS_TEMP_NOT_ARMED","SOURCE_ORIGINAL_FINAL_PROGRESS_TEMP_OWNER_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_BIRTH_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_BIRTH_UNPROVED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_CHAIN_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_FILE_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_NOT_OWNED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_READERS_INCOMPLETE","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_READER_CHANGED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_REFERENCE_REQUIRED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_TRUNCATED","SOURCE_ORIGINAL_FINAL_PROGRESS_UNION_WRITER_UNCLOSED","SOURCE_ORIGINAL_FINAL_READER_CHANGED","SOURCE_ORIGINAL_FINAL_READER_CLOSE_REUSED","SOURCE_ORIGINAL_FINAL_READER_CLOSE_UNPROVED","SOURCE_ORIGINAL_FINAL_READER_FD_INVALID","SOURCE_ORIGINAL_FINAL_READER_IDENTITY_CONFLICT","SOURCE_ORIGINAL_FINAL_READER_NOT_OWNED","SOURCE_ORIGINAL_FINAL_SAVE_STOP_UNPROVED","SOURCE_ORIGINAL_FINAL_WRITER_STOP_UNPROVED","SOURCE_ORIGINAL_FIXED_ROOT_CHANGED","SOURCE_ORIGINAL_FIXED_ROOT_REQUIRED","SOURCE_ORIGINAL_INSTALL_CALLBACK_FORBIDDEN","SOURCE_ORIGINAL_INSTALL_COMPLETION_CHANGED","SOURCE_ORIGINAL_INSTALL_COMPONENT_CONTEXT_CHANGED","SOURCE_ORIGINAL_INSTALL_COMPONENT_MANIFEST_CHANGED","SOURCE_ORIGINAL_INSTALL_COMPONENT_NOT_ALLOWLISTED","SOURCE_ORIGINAL_INSTALL_COMPONENT_NOT_OWNED","SOURCE_ORIGINAL_INSTALL_CP_ORIGINAL_NOT_BOUND","SOURCE_ORIGINAL_INSTALL_DESTINATION_INVALID","SOURCE_ORIGINAL_INSTALL_INPUT_CHANGED","SOURCE_ORIGINAL_INSTALL_INPUT_NOT_DECLARED","SOURCE_ORIGINAL_INSTALL_NOT_AVAILABLE","SOURCE_ORIGINAL_INSTALL_NOT_OWNED","SOURCE_ORIGINAL_INSTALL_OUTPUT_CHANGED","SOURCE_ORIGINAL_INSTALL_OUTPUT_INVALID","SOURCE_ORIGINAL_INSTALL_OUTPUT_REPLACED","SOURCE_ORIGINAL_INSTALL_SHORT_WRITE","SOURCE_ORIGINAL_INVENTORY_INVALID","SOURCE_ORIGINAL_LEGACY_BINDING_METADATA_BOUND","SOURCE_ORIGINAL_LEGACY_EXPECTATION_METADATA_BOUND","SOURCE_ORIGINAL_LEGACY_REQUEST_METADATA_INVALID","SOURCE_ORIGINAL_LENGTH_CHANGED","SOURCE_ORIGINAL_MIGRATION_IDENTITY_CHANGED","SOURCE_ORIGINAL_MIGRATION_NOT_OWNED","SOURCE_ORIGINAL_MIGRATION_ORIGINAL_CHANGED","SOURCE_ORIGINAL_MIGRATION_OUTPUT_CHANGED","SOURCE_ORIGINAL_MIGRATION_OUTPUT_EXISTS","SOURCE_ORIGINAL_NORMAL_ABSENCE_CHANGED","SOURCE_ORIGINAL_NORMAL_BASELINE_ADMISSION_CHANGED","SOURCE_ORIGINAL_NORMAL_BASELINE_INSTALL_CHANGED","SOURCE_ORIGINAL_NORMAL_BASELINE_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_BASELINE_ROOT_CHANGED","SOURCE_ORIGINAL_NORMAL_BASELINE_ROOT_INVALID","SOURCE_ORIGINAL_NORMAL_BASELINE_SCOPE_CHANGED","SOURCE_ORIGINAL_NORMAL_BASELINE_SKIP_NOT_SELECTED","SOURCE_ORIGINAL_NORMAL_BASE_CHANGED","SOURCE_ORIGINAL_NORMAL_BASE_INVALID","SOURCE_ORIGINAL_NORMAL_BASE_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_BASE_NOT_CAPTURED","SOURCE_ORIGINAL_NORMAL_BASE_SHORT_WRITE","SOURCE_ORIGINAL_NORMAL_COMPARISON_INCOMPLETE","SOURCE_ORIGINAL_NORMAL_COMPARISON_INPUT_CHANGED","SOURCE_ORIGINAL_NORMAL_COMPARISON_INPUT_NOT_OWNED","SOURCE_ORIGINAL_NORMAL_COMPARISON_NOT_FIXED","SOURCE_ORIGINAL_NORMAL_COMPARISON_OUTPUT_CHANGED","SOURCE_ORIGINAL_NORMAL_COMPARISON_OUTPUT_INVALID","SOURCE_ORIGINAL_NORMAL_COMPARISON_SHORT_WRITE","SOURCE_ORIGINAL_NORMAL_CONTINUITY_DONOR_REQUIRED","SOURCE_ORIGINAL_NORMAL_CONTINUITY_PREDECESSOR_UNKNOWN","SOURCE_ORIGINAL_NORMAL_DEPLOYED_COPY_CHANGED","SOURCE_ORIGINAL_NORMAL_DEPLOYED_COPY_NOT_OWNED","SOURCE_ORIGINAL_NORMAL_DEPLOYED_COPY_REUSED","SOURCE_ORIGINAL_NORMAL_DEPLOYED_COPY_UNPROVED","SOURCE_ORIGINAL_NORMAL_DEPLOYED_DESTINATION_EXISTS","SOURCE_ORIGINAL_NORMAL_DEPLOYED_DIRECTORY_CHANGED","SOURCE_ORIGINAL_NORMAL_DEPLOYED_SOURCE_REQUIRED","SOURCE_ORIGINAL_NORMAL_DIRECTORY_CHANGED","SOURCE_ORIGINAL_NORMAL_DMI_PRELUDE_REQUIRED","SOURCE_ORIGINAL_NORMAL_DMI_RECOVERY_INVALID","SOURCE_ORIGINAL_NORMAL_DMI_TAIL_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_FORECAST_INPUT_REQUIRED","SOURCE_ORIGINAL_NORMAL_FRAME_INVALID","SOURCE_ORIGINAL_NORMAL_GENERATION_PREPARE_REUSED","SOURCE_ORIGINAL_NORMAL_GENERATION_REQUIRED","SOURCE_ORIGINAL_NORMAL_HANDOFF_NOT_SELECTED","SOURCE_ORIGINAL_NORMAL_HANDOFF_OUTPUT_CHANGED","SOURCE_ORIGINAL_NORMAL_HISTORICAL_OUTPUT_CHANGED","SOURCE_ORIGINAL_NORMAL_HISTORICAL_OUTPUT_INVALID","SOURCE_ORIGINAL_NORMAL_HISTORICAL_SHORT_WRITE","SOURCE_ORIGINAL_NORMAL_HISTORY_PLAN_CHANGED","SOURCE_ORIGINAL_NORMAL_HISTORY_PLAN_INPUT_CHANGED","SOURCE_ORIGINAL_NORMAL_HISTORY_PLAN_INVALID","SOURCE_ORIGINAL_NORMAL_HISTORY_PLAN_REQUIRED","SOURCE_ORIGINAL_NORMAL_HISTORY_PLAN_REUSED","SOURCE_ORIGINAL_NORMAL_HISTORY_PLAN_UNPROVED","SOURCE_ORIGINAL_NORMAL_HOUR_INVALID","SOURCE_ORIGINAL_NORMAL_INPUT_LOST","SOURCE_ORIGINAL_NORMAL_INSTALL_INCOMPLETE","SOURCE_ORIGINAL_NORMAL_LEGACY_ABSENCE_CHANGED","SOURCE_ORIGINAL_NORMAL_LEGACY_INPUT_CHANGED","SOURCE_ORIGINAL_NORMAL_LEGACY_INPUT_MISSING","SOURCE_ORIGINAL_NORMAL_LEGACY_OUTPUT_UNPROVED","SOURCE_ORIGINAL_NORMAL_LEGACY_REQUEST_CHANGED","SOURCE_ORIGINAL_NORMAL_LEGACY_REQUEST_PHASE_REUSED","SOURCE_ORIGINAL_NORMAL_LEGACY_REQUEST_PHASE_UNPROVED","SOURCE_ORIGINAL_NORMAL_LEGACY_REQUEST_REQUIRED","SOURCE_ORIGINAL_NORMAL_LEGACY_UNOWNED_FILE","SOURCE_ORIGINAL_NORMAL_MAIN_CHANGED","SOURCE_ORIGINAL_NORMAL_METADATA_CLIENT_REQUIRED","SOURCE_ORIGINAL_NORMAL_MIGRATION_INCOMPLETE","SOURCE_ORIGINAL_NORMAL_OUTPUT_INVALID","SOURCE_ORIGINAL_NORMAL_OUTPUT_LOST","SOURCE_ORIGINAL_NORMAL_OUTPUT_NOT_FIXED","SOURCE_ORIGINAL_NORMAL_PHASE_CLOSURE_UNPROVED","SOURCE_ORIGINAL_NORMAL_PHASE_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_PHASE_NOT_OWNED","SOURCE_ORIGINAL_NORMAL_POSTINSTALL_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_PRELUDE_REQUIRED","SOURCE_ORIGINAL_NORMAL_PRESERVATION_CHANGED","SOURCE_ORIGINAL_NORMAL_PRESERVATION_INPUT_INVALID","SOURCE_ORIGINAL_NORMAL_PRESERVATION_REUSED","SOURCE_ORIGINAL_NORMAL_PRODUCER_SESSION_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_PROGRAM_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_PROGRESS_INSTALL_UNPROVED","SOURCE_ORIGINAL_NORMAL_PROGRESS_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_PROTECTED_BASELINE_REQUIRED","SOURCE_ORIGINAL_NORMAL_PROTECTED_BOOTSTRAP_NOT_AVAILABLE","SOURCE_ORIGINAL_NORMAL_PROTECTED_BOOTSTRAP_REUSED","SOURCE_ORIGINAL_NORMAL_PROTECTED_DRIVER_NOT_SETTLED","SOURCE_ORIGINAL_NORMAL_QUICK_CANDIDATE_REQUIRED","SOURCE_ORIGINAL_NORMAL_QUICK_PROGRESS_REQUIRED","SOURCE_ORIGINAL_NORMAL_QUICK_REUSED","SOURCE_ORIGINAL_NORMAL_RAW_CACHE_RESULT_INVALID","SOURCE_ORIGINAL_NORMAL_RAW_CACHE_ROUTE_INVALID","SOURCE_ORIGINAL_NORMAL_READ_CHANGED","SOURCE_ORIGINAL_NORMAL_READ_SIZE_INVALID","SOURCE_ORIGINAL_NORMAL_READ_TRUNCATED","SOURCE_ORIGINAL_NORMAL_RECEIPT_INVALID","SOURCE_ORIGINAL_NORMAL_RECOVERY_RESULT_INVALID","SOURCE_ORIGINAL_NORMAL_SEAL_BYTES_CHANGED","SOURCE_ORIGINAL_NORMAL_SEAL_NOT_SAVED","SOURCE_ORIGINAL_NORMAL_SELECTION_INVALID","SOURCE_ORIGINAL_NORMAL_TEMP_CHANGED","SOURCE_ORIGINAL_NORMAL_TEMP_INVALID","SOURCE_ORIGINAL_NORMAL_WAM_ACK_INVALID","SOURCE_ORIGINAL_NORMAL_WAM_CANDIDATE_NOT_OWNED","SOURCE_ORIGINAL_NORMAL_WAM_NOT_SELECTED","SOURCE_ORIGINAL_NORMAL_WAM_SELECTION_INVALID","SOURCE_ORIGINAL_NORMAL_WEATHER_PRELUDE_REQUIRED","SOURCE_ORIGINAL_OPERATION_NOT_AVAILABLE","SOURCE_ORIGINAL_OPERATION_ROOT_CHANGED","SOURCE_ORIGINAL_ORIGINAL_TARGET_AUTHENTICATION_REQUIRED","SOURCE_ORIGINAL_ORIGINAL_TARGET_CLOSURE_UNPROVED","SOURCE_ORIGINAL_ORIGINAL_TARGET_NOT_AVAILABLE","SOURCE_ORIGINAL_ORIGINAL_TARGET_REQUEST_CHANGED","SOURCE_ORIGINAL_OUTPUT_BYTES_CHANGED","SOURCE_ORIGINAL_OUTPUT_DIRECTORY_INVALID","SOURCE_ORIGINAL_OUTPUT_FILE_INVALID","SOURCE_ORIGINAL_OUTPUT_LENGTH_CHANGED","SOURCE_ORIGINAL_OUTPUT_PATH_INVALID","SOURCE_ORIGINAL_OWNER_REQUIRED","SOURCE_ORIGINAL_PATH_INVALID","SOURCE_ORIGINAL_PREPARED_OUTPUT_REQUIRED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_BASE_CHANGED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_INSTALL_CHANGED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_MANIFEST_CHANGED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_OWNER_CHANGED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_REFERENCE_NOT_AVAILABLE","SOURCE_ORIGINAL_PROGRESS_COMPONENT_REFERENCE_REQUIRED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_ROWS_CHANGED","SOURCE_ORIGINAL_PROGRESS_COMPONENT_SCOPE_CHANGED","SOURCE_ORIGINAL_PROGRESS_NOT_AVAILABLE","SOURCE_ORIGINAL_PROGRESS_NOT_BOUND","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_ACTOR_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_CATALOG_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_CHILD_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_CHILD_REUSED","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_CHILD_UNPROVED","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_CLOSE_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_DIRECTORY_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_EVENT_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_FILE_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_FORMAT_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_INCOMPLETE","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_PATH_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_SCHEMA_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_UNPROVED","SOURCE_ORIGINAL_PROGRESS_UNION_BIRTH_WORKER_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_CAPSULE_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_CAPSULE_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_CAPSULE_SHORT_WRITE","SOURCE_ORIGINAL_PROGRESS_UNION_CATALOG_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_CATALOG_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_CLOSURE_UNPROVED","SOURCE_ORIGINAL_PROGRESS_UNION_DIRECTORY_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_FD_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_FILE_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_FILE_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_H_BIRTH_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_INPUT_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_INPUT_TOO_LARGE","SOURCE_ORIGINAL_PROGRESS_UNION_NOT_AVAILABLE","SOURCE_ORIGINAL_PROGRESS_UNION_OUTPUT_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_OUTPUT_DUPLICATE","SOURCE_ORIGINAL_PROGRESS_UNION_OUTPUT_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_OWNER_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_PACK_NOT_OWNED","SOURCE_ORIGINAL_PROGRESS_UNION_REFERENCE_REQUIRED","SOURCE_ORIGINAL_PROGRESS_UNION_RESULT_CHANGED","SOURCE_ORIGINAL_PROGRESS_UNION_RESULT_INVALID","SOURCE_ORIGINAL_PROGRESS_UNION_RESULT_NOT_OWNED","SOURCE_ORIGINAL_PROGRESS_UNION_SOURCE_CHANGED","SOURCE_ORIGINAL_PROTECTED_QUICK_BASELINE_REQUIRED","SOURCE_ORIGINAL_PROTECTED_QUICK_CANDIDATE_CHANGED","SOURCE_ORIGINAL_PROTECTED_QUICK_PACK_HEADER_INVALID","SOURCE_ORIGINAL_PROTECTED_QUICK_UNOWNED_COMPANION","SOURCE_ORIGINAL_READ_INCOMPLETE","SOURCE_ORIGINAL_READ_NOT_AVAILABLE","SOURCE_ORIGINAL_READ_OVERLAP_OR_CLOSED","SOURCE_ORIGINAL_REPOSITORY_CHANGED","SOURCE_ORIGINAL_REQUIRED_BASELINE_ABSENT","SOURCE_ORIGINAL_RESTORED_DESCRIPTION_CHANGED","SOURCE_ORIGINAL_RESTORED_DESCRIPTION_INVALID","SOURCE_ORIGINAL_RESTORED_DESCRIPTION_SHORT_WRITE","SOURCE_ORIGINAL_RESULT_IDENTITY_REQUIRED","SOURCE_ORIGINAL_ROUTE_CONFLICT","SOURCE_ORIGINAL_SAVE_COHORT_UNPROVED","SOURCE_ORIGINAL_SAVE_PHASE_ACK_INVALID","SOURCE_ORIGINAL_SAVE_PHASE_FAILURE_INVALID","SOURCE_ORIGINAL_SAVE_PHASE_FRAME_INVALID","SOURCE_ORIGINAL_SAVE_PHASE_NOT_AVAILABLE","SOURCE_ORIGINAL_SAVE_PHASE_SEAL_CHANGED","SOURCE_ORIGINAL_SAVE_PIPE_LOST","SOURCE_ORIGINAL_SELECTION_NOT_AVAILABLE","SOURCE_ORIGINAL_SELECTION_REQUIRED","SOURCE_ORIGINAL_TRANSFORM_CALLER_UNAVAILABLE","SOURCE_ORIGINAL_WORKING_BYTES_CHANGED","SOURCE_ORIGINAL_WORKING_DIRECTORY_INVALID","SOURCE_ORIGINAL_WORKING_FILE_INVALID","SOURCE_ORIGINAL_WORKING_INSTALL_COMPLETION_CHANGED","SOURCE_ORIGINAL_WORKING_INSTALL_NOT_AVAILABLE","SOURCE_ORIGINAL_WORKING_INSTALL_NOT_OWNED","SOURCE_ORIGINAL_WORKING_INSTALL_SCOPE_CHANGED","SOURCE_ORIGINAL_WORKING_ORIGINAL_CHANGED","SOURCE_PREFLIGHT_CLOSE_UNPROVED","SOURCE_PREFLIGHT_DIRECTORY_CHANGED","SOURCE_PREFLIGHT_DIRECTORY_NOT_FIXED","SOURCE_PREFLIGHT_INPUT_CHANGED","SOURCE_PREFLIGHT_INPUT_INVALID","SOURCE_PREFLIGHT_INPUT_NOT_FIXED","SOURCE_PREFLIGHT_MANIFEST_INVALID","SOURCE_PREFLIGHT_PROGRAM_NOT_FIXED","SOURCE_PREFLIGHT_READER_REQUIRED","SOURCE_PREFLIGHT_REUSED","SOURCE_PREFLIGHT_SHORT_WRITE","SOURCE_PREFLIGHT_SKIP_NOT_OWNED","SOURCE_PRELUDE_ADMIN_NOT_AVAILABLE","SOURCE_PRELUDE_CLOSE_UNPROVED","SOURCE_PRELUDE_NOT_AVAILABLE","SOURCE_PRELUDE_OPERATION_INVALID","SOURCE_PRELUDE_OWNER_REQUIRED","SOURCE_PRELUDE_PHASE_INVALID","SOURCE_PRELUDE_PROGRAM_FAILED","SOURCE_PRELUDE_REQUEST_CHANGED","SOURCE_PRELUDE_REQUEST_INVALID","SOURCE_PRELUDE_REUSED","SOURCE_PRELUDE_ROOT_CHANGED","SOURCE_PRELUDE_ROOT_INVALID","SOURCE_PROGRESS_CACHE_ROUTE_INVALID","SOURCE_PROTECTED_DRIVER_ROUTE_REQUIRED","SOURCE_QUICK_PROGRESS_CACHE_REQUIRED","SOURCE_QUICK_PROGRESS_SOURCE_INVALID","SOURCE_SELECTION_METADATA_CHANGED","SOURCE_SELECTION_METADATA_INCOMPLETE","SOURCE_SELECTION_METADATA_INVALID","SOURCE_SELECTION_METADATA_REUSED","SOURCE_SELECTION_METADATA_SHORT_WRITE","SOURCE_SELECTION_METADATA_SIZE"]);
const SOURCE_DIAGNOSTIC_STAGES = new Set(['UNKNOWN','SOURCE_GUARD','ROUTE','PRELUDE','PREFLIGHT','ADMIN','HANDOFF','ORIGINAL_SELECTION','CHECKPOINT_PROTECTED','ARCHIVED_READERS','PRIVATE_ROOT','PROGRESS_CACHE','ORIGINAL_INSTALL','POST_INSTALL','PROGRESS_BASE','PROGRESS_UNION','PRODUCER_CHAIN']);
const SOURCE_DIAGNOSTIC_NODE_CODES = new Set(['ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND','ERR_REQUIRE_ASYNC_MODULE','ERR_REQUIRE_ESM','ERR_UNKNOWN_FILE_EXTENSION','ERR_UNSUPPORTED_DIR_IMPORT','ERR_INVALID_ARG_TYPE','ERR_INVALID_ARG_VALUE','ERR_INVALID_URL']);
const SOURCE_DIAGNOSTIC_PRIVATE_CODES = new Set(['PROTECTED_PRIVATE_RUNTIME_INELIGIBLE','PROTECTED_PRIVATE_RUNTIME_EXPIRED','PROTECTED_PRIVATE_RUNTIME_REMOTE_ERROR','PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION']);
const SOURCE_DIAGNOSTIC_REJECTIONS = new Set(['NONE','UNKNOWN','EXPIRED','FILESYSTEM_CAPACITY','FILESYSTEM_PERMISSION','FILESYSTEM_READ_ONLY','FILESYSTEM_RESOURCE_LIMIT','STORAGE_OR_OBJECT_INTEGRITY','ARCHIVE_OR_PAYLOAD_INTEGRITY','MODEL_BINDING','CONTRACT_HASHES','DATASET_IDENTITY','TIME_BOUNDS','DESCRIPTOR_BUNDLE_MISMATCH','BUNDLE_STRUCTURE_OR_CONTENT','MODEL_OR_CONTRACT_INELIGIBLE','ARCHIVE_ENVELOPE_DECODE','ARCHIVE_STAGE_CREATE','ARCHIVE_FILE_PATH','ARCHIVE_FILE_PARENT','ARCHIVE_FILE_WRITE','ARCHIVE_STAGE_COMMIT']);
const sourceGuardDiagnosticReasons = new WeakMap();
const sourceDriverDiagnosticStages = new WeakMap();
const sourceDriverDiagnosticFailures = new WeakMap();
const sourceUnknownDiagnostic = Object.freeze({stage:'UNKNOWN',reason:'UNKNOWN',nodeClass:'UNKNOWN',rejection:'UNKNOWN'});
function sourceGuardError(code) {
  const error = new Error(code);
  // Only existing fixed literal codes are observable. Unknown strings are not.
  if (SOURCE_DIAGNOSTIC_GUARD_CODES.has(code)) sourceGuardDiagnosticReasons.set(error, code);
  return error;
}
function sourceDiagnosticOwnString(error, key) {
  const descriptor = Object.getOwnPropertyDescriptor(error, key);
  return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string'
    ? descriptor.value : null;
}
function rememberSourceDriverFailure(driver, error) {
  // Never replace the first failure if observation itself is unavailable.
  try {
    const stage = sourceDriverDiagnosticStages.get(driver);
    if (!SOURCE_DIAGNOSTIC_STAGES.has(stage) || error === null || typeof error !== 'object'
      || sourcePreludeTypes.isProxy(error) || !sourcePreludeTypes.isNativeError(error)
      || sourceDriverDiagnosticFailures.has(error)) return;
    for (const key of ['code','message','rejectionCodes']) {
      const descriptor = Object.getOwnPropertyDescriptor(error, key);
      if (descriptor && !Object.hasOwn(descriptor, 'value')) return;
    }
    const ownCode = sourceDiagnosticOwnString(error, 'code');
    const ownMessage = sourceDiagnosticOwnString(error, 'message');
    const reason = sourceGuardDiagnosticReasons.get(error)
      ?? (SOURCE_DIAGNOSTIC_GUARD_CODES.has(ownMessage) ? ownMessage
        : SOURCE_DIAGNOSTIC_NODE_CODES.has(ownCode) || SOURCE_DIAGNOSTIC_PRIVATE_CODES.has(ownCode)
          ? ownCode : 'UNKNOWN');
    const prototypes = [[Error.prototype,'ERROR'],[TypeError.prototype,'TYPE_ERROR'],
      [ReferenceError.prototype,'REFERENCE_ERROR'],[SyntaxError.prototype,'SYNTAX_ERROR'],
      [RangeError.prototype,'RANGE_ERROR'],[AggregateError.prototype,'AGGREGATE_ERROR']];
    const nodeClass = prototypes.find(([prototype]) => Object.getPrototypeOf(error) === prototype)?.[1] ?? 'UNKNOWN';
    let rejection = 'NONE';
    const descriptor = Object.getOwnPropertyDescriptor(error, 'rejectionCodes');
    if (descriptor) {
      rejection = 'UNKNOWN';
      const codes = descriptor.value;
      if (Array.isArray(codes) && !sourcePreludeTypes.isProxy(codes)) {
        const length = Object.getOwnPropertyDescriptor(codes, 'length');
        const first = Object.getOwnPropertyDescriptor(codes, '0');
        if (length && Object.hasOwn(length,'value') && Number.isSafeInteger(length.value)
          && length.value > 0 && length.value <= 8 && first && Object.hasOwn(first,'value')
          && SOURCE_DIAGNOSTIC_REJECTIONS.has(first.value)) rejection = first.value;
      }
    }
    sourceDriverDiagnosticFailures.set(error,Object.freeze({stage,reason,nodeClass,rejection}));
  } catch {}
}
export function sourceFailureDiagnostic(error) {
  // Read-only observation of the actual private error identity; not an issuer.
  if (error === null || typeof error !== 'object' || sourcePreludeTypes.isProxy(error)) return sourceUnknownDiagnostic;
  const recorded = sourceDriverDiagnosticFailures.get(error);
  if (recorded) return recorded;
  const reason = sourceGuardDiagnosticReasons.get(error);
  return reason ? Object.freeze({stage:'SOURCE_GUARD',reason,nodeClass:'ERROR',rejection:'NONE'}) : sourceUnknownDiagnostic;
}
// SOURCE_DIAGNOSTIC_END


const sourceDeadlineFailure = code => { throw sourceGuardError(code); };

function retainSourceNormalDriverFailure(driver, state, error) {
  driver.firstFailure ??= state?.childTerminalFailure?.firstFailure
    ?? state?.firstNormalFailure ?? [error];
  driver.caughtFailure ??= [error]; // Retain a later physical/transport error too.
  return driver.firstFailure[0];
}


function sourceFailureWorkerRecord(previous, jobCutoff, error, caughtAt) {
  return previous ?? Object.freeze({ kind: 'PARENT_FIRST_FAILURE', caughtAt,
    cutoff: Math.min(jobCutoff, caughtAt + 4 * 60_000), firstFailure: Object.freeze([error]) });
}

// Failure-only work consumes the SAME clock, leaving a small part of that
// existing240s for its local forensic disposition. No success/provider budget
// is changed, and neither this remainder nor a file grants stop/SAVE authority.
// Diagnostic projection of an already validated first-failure clock only.
function sourceFailureDispositionClock(clock) {
  return { kind: clock.kind, caughtAt: clock.caughtAt, cutoff: clock.cutoff,
    ...(clock.kind === 'CHILD_FIRST_FAILURE' ? { child: { reason: clock.child.reason,
      caughtNs: clock.child.caughtNs, cutoffNs: clock.child.cutoffNs } } : {}) };
}
function sourceFailureWorkCutoff(state, issued) {
  return state.failureWorker ? Math.min(issued.deadline, state.failureWorker.cutoff - 2000) : issued.deadline;
}
// Physical I/O only, not an issuer, owner or SAVE/restore receipt. Every
// handle is retained before the first awaited operation; failed checks still
// close each provably same owned descriptor once, without replacing raw error.
async function writeSourceFailureDispositionRecord(record, { root, rootPin, contents, checkRoot }) {
  const pack = await import('./lib/private-weather-component-pack.mjs');
  const constants = sourceOriginalFsConstants;
  const retain = (handle, directory = false) => ({ path: directory ? root : record.file,
    handle, fd: handle.fd, directory, stat: directory ? rootPin : null,
    identity: directory ? null : pack.ownFileDescriptorIdentity(handle.fd),
    closeAttempted: false, closed: false,
    journal: { firstFailure: null, closeAttempted: false, closed: false } });
  const close = async row => {
    if (!row || row.closed) return;
    // The existing writer closes on its successful path. A rejected close is
    // never retried; its original handle and journal remain strongly retained.
    if (row.handle.fd === -1) {
      row.closed = row.journal.closed || !row.directory
        && await pack.ownedFileDescriptorClosed(row.fd, row.identity);
      if (!row.closed) sourceOriginalFailure('FAILURE_DISPOSITION_CLOSE_UNPROVED');
      return;
    }
    if (row.closeAttempted || row.journal.closeAttempted || row.handle.fd !== row.fd) {
      sourceOriginalFailure('FAILURE_DISPOSITION_CLOSE_UNPROVED');
    }
    const current = await row.handle.stat({ bigint: true });
    if (row.directory ? !current.isDirectory() || !sameSourceOriginalStat(rootPin, current)
      : !row.identity || !current.isFile() || current.dev !== row.identity.dev || current.ino !== row.identity.ino) {
      sourceOriginalFailure('FAILURE_DISPOSITION_CLOSE_UNPROVED');
    }
    row.stat = current;
    try { await closeSourceFinalReader(row, row.journal); }
    finally { row.closeAttempted = row.journal.closeAttempted; row.closed = row.journal.closed; }
  };
  try {
    const handle = await fs.open(record.file,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
    record.writer = retain(handle);
    const created = await handle.stat({ bigint: true });
    if (!record.writer.identity || !created.isFile() || created.nlink !== 1n || created.size !== 0n
      || !sameSourceOriginalStat(created, await fs.lstat(record.file, { bigint: true }), true)) {
      sourceOriginalFailure('FAILURE_DISPOSITION_FILE_CHANGED');
    }
    await checkRoot();
    await writeSourceArtifactDispositionFile(record.writer, contents);
    await checkRoot();
    const reader = await fs.open(record.file, constants.O_RDONLY | constants.O_NOFOLLOW);
    record.reader = retain(reader);
    const opened = await reader.stat({ bigint: true });
    if (!record.reader.identity || !opened.isFile() || opened.nlink !== 1n
      || opened.dev !== created.dev || opened.ino !== created.ino
      || opened.size !== BigInt(Buffer.byteLength(contents))
      || !sameSourceOriginalStat(opened, await fs.lstat(record.file, { bigint: true }), true)) {
      sourceOriginalFailure('FAILURE_DISPOSITION_FILE_CHANGED');
    }
    await checkRoot();
    const actual = await reader.readFile('utf8');
    if (actual !== contents || !sameSourceOriginalStat(opened, await reader.stat({ bigint: true }), true)) {
      sourceOriginalFailure('FAILURE_DISPOSITION_READBACK');
    }
    await checkRoot();
    const directory = await fs.open(root, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    record.directory = retain(directory, true);
    const directoryStat = await directory.stat({ bigint: true });
    if (!directoryStat.isDirectory() || !sameSourceOriginalStat(rootPin, directoryStat)) {
      sourceOriginalFailure('FAILURE_DISPOSITION_ROOT_CHANGED');
    }
    await checkRoot();
    await directory.sync();
    await checkRoot();
  } catch (error) { record.firstFailure ??= [error]; }
  finally {
    for (const row of [record.directory, record.reader, record.writer]) {
      try { await close(row); }
      catch (error) {
        (record.closeFailures ??= []).push({ row, error });
        record.firstFailure ??= [error];
      }
    }
  }
  if (record.firstFailure !== null && record.firstFailure !== undefined) throw record.firstFailure[0];
  await checkRoot();
  record.complete = true; // Only own local fsync/readback, never cloud durability.
}

async function writeSourceNormalFailureDisposition(holder, operation, error) {
  // Lookup only. In particular, a poisoned owner must not pass a normal
  // sourceOriginalOwner/admission guard just to record its failure. This tiny
  // private forensic output cannot resume, release, publish or transfer it.
  const issued = sourceJobDeadlineBrands.get(holder), owner = issued?.originalOwner;
  const state = sourceDmiCohorts.get(operation);
  if (!issued || !owner || owner.holder !== holder || state?.owner !== owner
    || state.kind !== 'source-normal-producer' || owner.activeOperation !== operation
    || sourceOriginalOperations.get(operation) !== state || state.completed
    || issued.normalDriver?.operation !== operation || issued.normalDriver.firstFailure?.[0] !== error
    || state.failureDispositionWrite) sourceOriginalFailure('FAILURE_DISPOSITION_NOT_AVAILABLE');
  state.failureWorker = sourceFailureWorkerRecord(state.failureWorker, issued.deadline, error, performance.now());
  const clock = state.failureWorker, checkClock = () => {
    if (!(performance.now() < clock.cutoff)) sourceOriginalFailure('FAILURE_DISPOSITION_EXPIRED');
  };
  checkClock();
  const root = owner.context?.root;
  const rootPin = owner.bundles.flatMap(bundle => [...bundle.rows.values()])
    .flatMap(row => row.directories).find(row => row.path === root)?.stat;
  if (root !== '/tmp/ravradar-private-production-runtime' || !rootPin) {
    sourceOriginalFailure('FAILURE_DISPOSITION_ROOT_REQUIRED');
  }
  const checkRoot = async () => {
    const current = await fs.lstat(root, { bigint: true });
    if (!current.isDirectory() || current.isSymbolicLink()
      || !sameSourceOriginalStat(rootPin, current)) sourceOriginalFailure('FAILURE_DISPOSITION_ROOT_CHANGED');
    checkClock();
  };
  await checkRoot();
  const cipher = state.savedPhases?.get('cipher');
  const cloudFinalized = cipher?.completed === true && cipher.semanticFailure == null
    && cipher.receipt?.kind === 'WEATHER_CIPHER_V2_FINALIZED'
    && Number.isSafeInteger(cipher.receipt.cacheId) && cipher.receipt.cacheId > 0;
  // Only the existing ordinary phase paths clear these after actual closure.
  // Any poisoned/unsettled owner is conservative STOP_UNPROVEN, never FAILED
  // with a fabricated closed bit. This is observation, not a new stop issuer.
  const stopUnproved = owner.firstFailure !== null || state.firstFailure !== null
    || state.normalPhase != null || state.saveInFlight != null
    || (state.dmiStarted && (!state.outputGeneration || !state.controlCloseObserved));
  const value = {
    schemaVersion: 1, kind: 'SOURCE_PRIVATE_FAILURE_DISPOSITION',
    status: stopUnproved ? 'STOP_UNPROVEN' : cloudFinalized ? 'FAILED' : 'DURABILITY_UNCONFIRMED',
    runId: issued.identity.GITHUB_RUN_ID, runAttempt: issued.identity.GITHUB_RUN_ATTEMPT,
    sourceHead: issued.identity.GITHUB_SHA, targetReferenceAt: state.lockedTarget,
    firstFailure: sourceFailureDiagnostic(error),
    originalBundles: owner.bundles.map(bundle => ({
      bundleContentSha256: bundle.descriptor.bundleContentSha256,
      datasetId: bundle.descriptor.datasetId, productionReferenceAt: bundle.descriptor.productionReferenceAt })),
    localCipherSealed: Boolean(state.sealedCipher && (state.normalPhases ?? []).some(phase =>
      phase.name === 'seal' && phase.completed === true && phase.transportClosed === true
      && phase.firstFailure === null && phase.result?.exitCode === 0 && phase.result.outputs.saved === 'true'
      && phase.outputGeneration?.rows.includes(state.sealedCipher.row)
      && Number(phase.result.outputs.encrypted_bytes) === state.sealedCipher.bytes
      && state.sealedCipher.row.bytes === state.sealedCipher.bytes
      && state.sealedCipher.row.sha256 === state.sealedCipher.sha256)), cloudFinalized,
    physicalStopProven: !stopUnproved, productionAuthority: false,
    sourceComplete: false, saved: false, uploaded: false,
    clock: sourceFailureDispositionClock(clock),
    privatePayloadIncluded: false,
  };
  const contents = JSON.stringify(value) + '\n';
  if (Buffer.byteLength(contents) > 16384) sourceOriginalFailure('FAILURE_DISPOSITION_BOUND');
  const file = path.join(root, 'source-failure-disposition-' + issued.identity.GITHUB_RUN_ID
    + '-' + issued.identity.GITHUB_RUN_ATTEMPT + '.json');
  const record = { file, value, writer: null, reader: null, directory: null, complete: false };
  state.failureDispositionWrite = record; // Never retry/adopt a partial result.
  try { await writeSourceFailureDispositionRecord(record, { root, rootPin, contents, checkRoot }); }
  catch (error) {
    // Closing a diagnostic must not unpoison the owner or replace its original
    // raw failure. A retained, unproved close is its own explicit poison.
    if (record.closeFailures?.length) {
      state.failureDispositionCloseFailure ??= [record.closeFailures[0].error];
      keepSourceOriginalFailure(owner, state.failureDispositionCloseFailure[0]);
    }
    throw error;
  }
  return Object.freeze({ kind: 'SOURCE_PRIVATE_FAILURE_DISPOSITION_LOCAL', status: value.status,
    localSyncedAndReadBack: true, productionAuthority: false, sourceComplete: false, saved: false, uploaded: false });
}

function sourceFailureTightenFrame(clock, cutoff) {
  const frame = Buffer.alloc(49);
  frame.write('RRSCG4F1', 0, 'ascii'); clock.nonce.copy(frame, 8);
  frame[40] = clock.phase; frame.writeBigUInt64BE(cutoff, 41);
  return frame;
}
function requestSourceFailureTighten(state, phase, jobCutoff, error) {
  const worker = state.kind === 'source-normal-producer'
    ? state.failureWorker = sourceFailureWorkerRecord(state.failureWorker, jobCutoff, error, performance.now()) : null;
  if (!phase.control || phase.controlCloseRequested) return;
  phase.controlCloseRequested = true;
  const destroy = () => {
    try { phase.control.destroy(); }
    catch (closeError) { phase.controlCloseFailure ??= [closeError]; }
  };
  try {
    const clock = phase.failureClock;
    if (!worker || !clock) { destroy(); return; } // No issued child clock/child work.
    const cutoff = sourceChildAbsoluteCutoff(Math.min(sourceFailureWorkCutoff(state, { deadline: jobCutoff }), clock.parentCutoff), clock.after, clock.anchor);
    const frame = sourceFailureTightenFrame(clock, cutoff);
    phase.failureTighten = Object.freeze({ worker, cutoff });
    // Half-close only after the fixed failure frame. No ACK or extra reaping.
    phase.control.end(frame, closeError => {
      if (closeError) { phase.controlCloseFailure ??= [closeError]; destroy(); }
    });
  } catch (closeError) { phase.controlCloseFailure ??= [closeError]; destroy(); }
}

async function checkSourceOriginalRow(owner, row) {
  sourceOriginalOwner(owner.holder);
  for (const directory of row.directories) {
    const current = await fs.lstat(directory.path, { bigint: true });
    if (!current.isDirectory() || current.isSymbolicLink()
      || !sameSourceOriginalStat(directory.stat, current)) sourceOriginalFailure('DIRECTORY_CHANGED');
  }
  const opened = await row.handle.stat({ bigint: true });
  const current = await fs.lstat(row.path, { bigint: true });
  if (!opened.isFile() || !current.isFile() || current.isSymbolicLink()
    || opened.nlink !== 1n || !sameSourceOriginalStat(row.stat, opened, true)
    || !sameSourceOriginalStat(row.stat, current, true)) sourceOriginalFailure('FILE_CHANGED');
}
async function hashSourceOriginalHandle(owner, row) {
  await checkSourceOriginalRow(owner, row);
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
  let position = 0;
  for (;;) {
    sourceOriginalOwner(owner.holder);
    const { bytesRead } = await row.handle.read(buffer, 0, buffer.length, position);
    if (bytesRead === 0) break;
    position += bytesRead;
    if (position > row.bytes) sourceOriginalFailure('LENGTH_CHANGED');
    hash.update(buffer.subarray(0, bytesRead));
  }
  await checkSourceOriginalRow(owner, row);
  if (position !== row.bytes || hash.digest('hex') !== row.sha256) sourceOriginalFailure('BYTES_CHANGED');
}
// Private reuse of an actually completed immutable B digest, never a new read.
// Existing owned handles only; no marker, public issuer or added FD lifetime.

async function openSourceOutputRow(owner, root, file, expected = null) {
  const relative = path.relative(root, file);
  if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) sourceOriginalFailure('OUTPUT_PATH_INVALID');
  const directories = [];
  let directory = root;
  for (const segment of ['', ...relative.split(path.sep).slice(0, -1)]) {
    if (segment) directory = path.join(directory, segment);
    const stat = await fs.lstat(directory, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink()) sourceOriginalFailure('OUTPUT_DIRECTORY_INVALID');
    directories.push({ path: directory, stat });
  }
  const stat = await fs.lstat(file, { bigint: true });
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size > BigInt(Number.MAX_SAFE_INTEGER)) sourceOriginalFailure('OUTPUT_FILE_INVALID');
  const handle = await fs.open(file, sourceOriginalFsConstants.O_RDONLY | (sourceOriginalFsConstants.O_NOFOLLOW ?? 0));
  const row = { path: file, handle, stat, directories, bytes: Number(stat.size), sha256: null };
  (owner.operationReaders ??= []).push(row); // retain before any further await
  await checkSourceOriginalRow(owner, row);
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
  let position = 0;
  for (;;) {
    sourceOriginalOwner(owner.holder);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
    if (!bytesRead) break;
    position += bytesRead; hash.update(buffer.subarray(0, bytesRead));
    if (position > row.bytes) sourceOriginalFailure('OUTPUT_LENGTH_CHANGED');
  }
  row.sha256 = hash.digest('hex');
  await checkSourceOriginalRow(owner, row);
  if (position !== row.bytes || expected && (row.bytes !== expected.bytes || row.sha256 !== expected.sha256)) sourceOriginalFailure('OUTPUT_BYTES_CHANGED');
  return row;
}

export async function beginSourceWorkingInstall(holder, invocation, actual) {
  const owner = sourceOriginalOwner(holder);
  try {
    await assertSourceOriginalProgress(holder);
    if (owner.activeOperation || owner.workingGeneration) sourceOriginalFailure('WORKING_INSTALL_NOT_AVAILABLE');
    const { sourceWorkingInstallInput } = await import('./weather-component-progress-cache.mjs');
    const input = await sourceWorkingInstallInput(holder, invocation, actual);
    if (input.binding !== owner.progressBinding || input.root !== owner.context.repository) sourceOriginalFailure('WORKING_INSTALL_SCOPE_CHANGED');
    const operation = Object.freeze({});
    const state = { owner, input, invocation, actual, kind: 'working-install', completed: false };
    sourceOriginalOperations.set(operation, state);
    owner.activeOperation = operation;
    owner.workingOperation = state; // retains the exact S operation even on failure
    return operation;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}
export async function finishSourceWorkingInstall(holder, operation) {
  const owner = sourceOriginalOwner(holder), state = sourceOriginalOperations.get(operation);
  if (!state || state.owner !== owner || state.kind !== 'working-install'
    || owner.activeOperation !== operation || state.completed) sourceOriginalFailure('WORKING_INSTALL_NOT_OWNED');
  try {
    const { sourceWorkingInstallCompletion } = await import('./weather-component-progress-cache.mjs');
    const completion = sourceWorkingInstallCompletion(operation);
    if (completion.invocation !== state.invocation || completion.actual !== state.actual
      || completion.input !== state.input) sourceOriginalFailure('WORKING_INSTALL_COMPLETION_CHANGED');
    const preserved = new Map();
    for (const original of owner.workingReaders) {
      const moved = completion.preserved.find(row => row.originalPath === original.path);
      if (!moved) { await hashSourceOriginalHandle(owner, original); continue; }
      if (moved.handle.fd !== moved.fd || moved.identity.dev !== original.stat.dev
        || moved.identity.ino !== original.stat.ino || moved.bytes !== original.bytes
        || moved.sha256 !== original.sha256) sourceOriginalFailure('WORKING_ORIGINAL_CHANGED');
      // Do not update original.path/stat/hash or pretend the new generation is B.
      const view = { ...original, path: moved.path, stat: moved.identity };
      await hashSourceOriginalHandle(owner, view);
      preserved.set(original, view);
    }
    for (const bundle of owner.bundles) for (const row of bundle.rows.values()) await hashSourceOriginalHandle(owner, row);
    // Retention bookkeeping is not producer admission. Keep the operation busy
    // and the new generation invisible throughout every real final recheck.
    owner.workingPreservation = preserved;
    await assertSourceOriginalProgress(holder);
    for (const row of completion.rows) await hashSourceOriginalHandle(owner, row);
    sourceOriginalOwner(holder);
    // No await between publishing these three admission fields.
    owner.workingGeneration = Object.freeze({ operation, rows: completion.rows,
      originalBinding: owner.progressBinding });
    state.completed = true;
    owner.activeOperation = null;
    return owner.workingGeneration;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}

// Fixed normal DMI outputs. These are data paths, never a caller-owned plan.
const sourceDmiWorkingRoutes = Object.freeze([
  ['DMI_BULK_OUTPUT_PATH', PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate],
  ['DMI_BULK_PROMOTION_PATH', PRIVATE_RUNTIME_BASE_FILES.find(file => file.id === 'dmi-bulk-cache').relativePath],
  ['CURRENT_FIELD_SHADOW_PATH', PRIVATE_WEATHER_COMPONENT_FILES.currentFieldShadow],
  ['COASTAL_POINT_STAGE_PATH', PRIVATE_WEATHER_COMPONENT_FILES.coastalPointDmi],
  [null, SOURCE_LEGACY_OUTPUT],
].map(Object.freeze));
function sourceDmiWorkingState(holder, operation) {
  const owner = sourceOriginalOwner(holder), state = sourceDmiCohorts.get(operation);
  if (!state || state.owner !== owner || sourceOriginalOperations.get(operation) !== state
    || owner.activeOperation !== operation || state.completed || state.firstFailure !== null) {
    sourceOriginalFailure('DMI_WORKING_OPERATION_REQUIRED');
  }
  return state;
}
function currentSourceWorkingRows(owner) {
  const rows = new Map();
  for (const row of owner.workingReaders) {
    // A preserved pre-S inode is not the current named working input.
    if (owner.workingPreservation?.has(row)) continue;
    rows.set(row.path, row);
  }
  // Separately retained current S is an operational input, not an INSTALL row.
  // This exact original object is later preserved before planner mutation.
  for (const row of owner.initialOperationalRows?.values() ?? []) {
    if (rows.has(row.path) && rows.get(row.path) !== row) sourceOriginalFailure('DMI_WORKING_PATH_AMBIGUOUS');
    rows.set(row.path, row);
  }
  for (const row of owner.workingGeneration.rows) {
    if (rows.has(row.path) && rows.get(row.path) !== row) sourceOriginalFailure('DMI_WORKING_PATH_AMBIGUOUS');
    rows.set(row.path, row);
  }
  if (owner.normalDeployedCopy?.completed) rows.set(owner.normalDeployedCopy.row.path, owner.normalDeployedCopy.row);
  return rows;
}
async function sourceDmiWorkingPath(owner, relative) {
  if (!sourceDmiWorkingRoutes.some(([, route]) => route === relative)) sourceOriginalFailure('DMI_WORKING_PATH_INVALID');
  const root = owner.context.repository;
  const prior = owner.dmiCohort?.workingRoutes?.find(route => route.relativePath === relative);
  let directory = root;
  const directories = [];
  for (const segment of ['', ...relative.split('/').slice(0, -1)]) {
    if (segment) directory = path.join(directory, segment);
    const stat = await fs.lstat(directory, { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    const pinned = prior?.directories.find(row => row.path === directory);
    if (stat === null) {
      if (pinned) sourceOriginalFailure('DMI_WORKING_DIRECTORY_CHANGED');
      return { path: path.join(root, ...relative.split('/')), absent: true, directories };
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()
      || pinned && !sameSourceOriginalStat(pinned.stat, stat)
      || directory === root && !sameSourceOriginalStat(owner.workingOperation.input.installRoot, stat)) {
      sourceOriginalFailure('DMI_WORKING_DIRECTORY_CHANGED');
    }
    directories.push({ path: directory, stat });
  }
  const file = path.join(root, ...relative.split('/'));
  const stat = await fs.lstat(file, { bigint: true }).catch(error => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (stat !== null && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n)) sourceOriginalFailure('DMI_WORKING_FILE_INVALID');
  return { path: file, absent: stat === null, directories };
}
// The internal cache adapter can only consume the real active G4 operation.
// Neither this lookup nor a returned row issues a holder or a stop receipt.
export async function sourceDmiWorkingInstallInput(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  if (state.preservationRequested || state.child || owner.dmiOutputGeneration) sourceOriginalFailure('DMI_WORKING_INSTALL_REUSED');
  state.preservationRequested = true;
  await assertSourceOriginalProgress(holder);
  if (state.dmiInputGeneration !== await assertSourceNormalGeneration(holder, operation)) sourceOriginalFailure('DMI_WORKING_INPUT_CHANGED');
  const current = new Map(state.dmiInputGeneration.rows.map(row => [row.path, row])), inputs = [], routes = [];
  state.workingBefore = current;
  for (const [, relativePath] of sourceDmiWorkingRoutes) {
    const located = await sourceDmiWorkingPath(owner, relativePath);
    const original = current.get(located.path);
    if (located.absent !== !original) sourceOriginalFailure('DMI_WORKING_INPUT_NOT_ADMITTED');
    routes.push(Object.freeze({ relativePath, ...located, original: original ?? null }));
    if (original) {
      await hashSourceOriginalHandle(owner, original);
      inputs.push(Object.freeze({ relativePath, original, handle: original.handle,
        bytes: original.bytes, sha256: original.sha256 }));
    }
  }
  sourceDmiWorkingState(holder, operation);
  state.workingRoutes = Object.freeze(routes);
  state.preservationInput = Object.freeze({ root: owner.context.repository, inputs: Object.freeze(inputs) });
  return state.preservationInput;
}
export async function assertSourceDmiWorkingInstallInput(holder, operation, input) {
  const state = sourceDmiWorkingState(holder, operation);
  if (!state.preservationInput?.inputs.includes(input) || state.child || state.preservation) sourceOriginalFailure('DMI_WORKING_INPUT_NOT_ADMITTED');
  await hashSourceOriginalHandle(state.owner, input.original);
}
async function finishSourceDmiWorkingPreservation(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const { sourceDmiWorkingPreservationCompletion } = await import('./weather-component-progress-cache.mjs');
  const completion = sourceDmiWorkingPreservationCompletion(operation);
  if (completion.input !== state.preservationInput || state.preservation || state.child
    || completion.preserved.length !== state.preservationInput.inputs.length) sourceOriginalFailure('DMI_WORKING_PRESERVATION_CHANGED');
  const preserved = new Map();
  for (const input of state.preservationInput.inputs) {
    const moved = completion.preserved.find(row => row.input === input);
    const original = input.original;
    if (!moved || moved.fd !== moved.handle.fd || moved.identity.dev !== original.stat.dev
      || moved.identity.ino !== original.stat.ino || moved.bytes !== original.bytes
      || moved.sha256 !== original.sha256) sourceOriginalFailure('DMI_WORKING_ORIGINAL_CHANGED');
    const view = { ...original, path: moved.path, stat: moved.identity };
    await hashSourceOriginalHandle(owner, view);
    preserved.set(original, view);
  }
  // Retention-only relocation views; the original objects/pins never change.
  owner.dmiWorkingPreservation = preserved;
  state.preservation = completion;
  await assertSourceOriginalProgress(holder);
  for (const row of completion.rows) await hashSourceOriginalHandle(owner, row);
  for (const route of state.workingRoutes) {
    const now = await sourceDmiWorkingPath(owner, route.relativePath);
    if (!route.original && !now.absent) sourceOriginalFailure('DMI_WORKING_ABSENCE_CHANGED');
  }
  sourceDmiWorkingState(holder, operation);
}
async function finishSourceDmiWorkingGeneration(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  // This entry is private and called only after the actual fixed child promise.
  // It never accepts a caller report, boolean stop flag or replacement executor.
  if (!state.preservation || !state.child || !state.controlCloseObserved
    || !Number.isInteger(state.result?.returncode) || state.result.returncode < 0
    || state.result.returncode > 255 || state.outputGeneration || owner.dmiOutputGeneration) {
    sourceOriginalFailure('DMI_WORKING_COMPLETION_UNPROVED');
  }
  const rows = new Map(state.workingBefore), absent = [];
  state.outputRows = [];
  await assertSourceOriginalProgress(holder);
  for (const route of state.workingRoutes) {
    const located = await sourceDmiWorkingPath(owner, route.relativePath);
    if (located.absent) {
      if (route.original) sourceOriginalFailure('DMI_WORKING_OUTPUT_LOST');
      absent.push(route.relativePath);
      continue;
    }
    const row = await openSourceOutputRow(owner, owner.context.repository, located.path);
    state.outputRows.push(row);
    rows.set(row.path, row);
  }
  await assertSourceOriginalProgress(holder);
  for (const row of rows.values()) await hashSourceOriginalHandle(owner, row);
  sourceDmiWorkingState(holder, operation);
  const generation = Object.freeze({ operation, inputGeneration: state.dmiInputGeneration,
    originalBinding: owner.progressBinding, producerExitCode: state.result.returncode,
    rows: Object.freeze([...rows.values()]),
    absent: Object.freeze(absent) });
  // Publish only after every awaited check. Still no T/session completion or
  // release: the same operation remains active for its next genuine consumer.
  state.outputGeneration = generation;
  state.normalGeneration = generation;
  owner.dmiOutputGeneration = generation;
}

// Private fixed DMI invocation. Clock data is NOT SOURCE completion or a stop receipt.
const sourceDmiCohorts = new WeakMap();
function sourceDmiStageMilliseconds(environment) {
  const runtime = environment.DMI_BULK_MAX_RUNTIME_SECONDS;
  const minutes = { '900': 24, '1500': 55, '3000': 55, '3600': 70 }[runtime];
  const reserve = runtime === '900' || runtime === '1500' ? '120' : '180';
  if (!Number.isSafeInteger(minutes) || environment.DMI_BULK_FINALIZE_RESERVE_SECONDS !== reserve
    || environment.DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS !== '420') {
    sourceOriginalFailure('DMI_STAGE_BUDGET_NOT_NORMAL');
  }
  return minutes * 60_000;
}
function sourceChildFirstFailureRecord(frame, clock, jobCutoff, observedAt, previous = null) {
  if (!Buffer.isBuffer(frame) || frame.length !== 60 || frame.toString('ascii', 0, 8) !== 'RRSCG4F2'
    || !clock || !Buffer.isBuffer(clock.nonce) || clock.nonce.length !== 32
    || !frame.subarray(8, 40).equals(clock.nonce) || frame.readUInt32BE(56) !== 1
    || typeof clock.anchor !== 'bigint' || typeof clock.stage !== 'bigint'
    || !Number.isFinite(clock.before) || !Number.isFinite(observedAt) || observedAt < clock.before) {
    sourceOriginalFailure('CHILD_FIRST_FAILURE_INVALID');
  }
  const caught = frame.readBigUInt64BE(40), cutoff = frame.readBigUInt64BE(48);
  if (caught < clock.anchor || caught >= clock.stage
    || cutoff !== (caught + 240_000_000_000n < clock.stage ? caught + 240_000_000_000n : clock.stage)
    || cutoff > 0x7fffffffffffffffn) sourceOriginalFailure('CHILD_FIRST_FAILURE_INVALID');
  const caughtAt = Math.floor(clock.before) + Number((caught - clock.anchor) / 1_000_000n);
  const mappedCutoff = Math.min(jobCutoff, Math.floor(clock.before) + Number((cutoff - clock.anchor) / 1_000_000n));
  if (!Number.isSafeInteger(caughtAt) || !Number.isSafeInteger(mappedCutoff)
    || caughtAt > observedAt || mappedCutoff <= observedAt) sourceOriginalFailure('CHILD_FIRST_FAILURE_INVALID');
  if (previous !== null) {
    if (previous.frameHex !== frame.toString('hex')) sourceOriginalFailure('CHILD_FIRST_FAILURE_CHANGED');
    return previous;
  }
  const error = new Error('SOURCE_ORIGINAL_DMI_TERMINAL_ASSET_WATCHDOG_LIMIT');
  return Object.freeze({ kind: 'CHILD_FIRST_FAILURE', caughtAt, cutoff: mappedCutoff,
    firstFailure: Object.freeze([error]), frameHex: frame.toString('hex'),
    child: Object.freeze({ reason: 1, caughtNs: String(caught), cutoffNs: String(cutoff) }) });
}
function assertSourceChildFailureEnd(record, output) {
  const reported = output?.terminalFailure;
  if (record == null && reported === undefined) return;
  if (!record || !isPlainObject(reported)
    || Object.keys(reported).sort().join(',') !== 'caughtNs,cutoffNs,reason'
    || reported.reason !== record.child.reason || reported.caughtNs !== record.child.caughtNs
    || reported.cutoffNs !== record.child.cutoffNs) sourceOriginalFailure('CHILD_FIRST_FAILURE_END_MISMATCH');
}


async function beginSourceNormalProducerSession(holder) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24'
    || owner.context.repository !== PRIVATE_RUNTIME_REPOSITORY_ROOT || owner.activeOperation
    || !owner.workingOperation?.completed || !issued.normalPrelude
    || issued.normalPrelude.normalProgress?.pending !== false
    || sourceOriginalOperations.get(owner.workingGeneration?.operation) !== owner.workingOperation) {
    sourceOriginalFailure('NORMAL_PRODUCER_SESSION_NOT_AVAILABLE');
  }
  const operation = Object.freeze({});
  const state = { owner, kind: 'source-normal-producer', lockedTarget: issued.normalPrelude.productionTarget,
    completed: false, child: null, control: null, before: null, after: null, childAnchor: null,
    firstFailure: null, firstNormalFailure: null, finalSaveFailure: null, result: null, controlCloseRequested: false,
    controlCloseObserved: false, controlCloseFailure: null, dmiStarted: false,
    inputGeneration: owner.workingGeneration, initialRows: null, normalGeneration: null, failureWorker: null };
  sourceOriginalOperations.set(operation, state);
  sourceDmiCohorts.set(operation, state);
  owner.activeOperation = operation;
  owner.dmiCohort = state;
  try {
    await assertSourceOriginalProgress(holder);
    const rows = Object.freeze([...currentSourceWorkingRows(owner).values()]);
    state.initialRows = rows; // retain actual handles before subsequent awaits
    for (const row of rows) await hashSourceOriginalHandle(owner, row);
    sourceDmiWorkingState(holder, operation);
    state.normalGeneration = Object.freeze({ operation, rows, inputGeneration: state.inputGeneration,
      originalBinding: owner.progressBinding, inputKind: 'verified-installed-working-generation' });
    // Only admission of the already installed generation. No phase was run,
    // no DMI output/frame exists and neither operation nor owner is released.
    return operation;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}

async function runSourceDmiCohort(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const issuedFailureClock = assertPrivateSourceJobDeadline(holder);
  const progressRequest = issuedFailureClock.normalRoute.request;
  if ((progressRequest.quick || progressRequest.quickProgressSource !== '')
    && assertPrivateSourceJobDeadline(holder).normalPrelude.quickAdmission?.required !== true) {
    sourceOriginalFailure('NORMAL_QUICK_PROGRESS_REQUIRED');
  }
  if (state.kind !== 'source-normal-producer' || state.normalPreparation?.completed !== true
    || !state.normalPreparation.registry || state.dmiStarted || state.normalPhase
    || state.saveInFlight || state.child || state.result || state.outputGeneration) {
    sourceOriginalFailure('DMI_COHORT_NOT_AVAILABLE');
  }
  await assertSourceNormalCurrentHistoryPlan(holder, operation);
  await assertSourceNormalLegacyCurrentRequests(holder, operation, true);
  const childEnvironment = Object.freeze({ ...process.env, ...sourceNormalDmiEnvironment(holder) });
  const stageStarted = performance.now();
  const stageEnd = stageStarted + sourceDmiStageMilliseconds(childEnvironment);
  state.dmiStarted = true;
  const retainFailure = error => {
    if (state.firstFailure === null) state.firstFailure = [error];
    const first = keepSourceOriginalFailure(owner, state.firstFailure[0]);
    requestSourceFailureTighten(state, state, issuedFailureClock.deadline, state.firstFailure[0]);
    // Wake only our control endpoint. Neither a request nor its close event
    // proves child/descendant stop or permits releasing this retained owner.
    return first;
  };
  try {
    await assertSourceOriginalProgress(holder);
    state.dmiInputGeneration = await assertSourceNormalGeneration(holder, operation);
    for (const [key, relative] of sourceDmiWorkingRoutes) {
      if (key !== null && childEnvironment[key] !== relative) sourceOriginalFailure('DMI_WORKING_ROUTE_NOT_NORMAL');
    }
    const { preserveSourceDmiWorkingInputs } = await import('./weather-component-progress-cache.mjs');
    await preserveSourceDmiWorkingInputs(holder, operation);
    await finishSourceDmiWorkingPreservation(holder, operation);
    const issued = assertPrivateSourceJobDeadline(holder);
    if (owner.activeOperation !== operation || sourceOriginalOwner(holder) !== owner) sourceOriginalFailure('DMI_COHORT_CHANGED');
    const parentCutoff = Math.min(stageEnd, issued.deadline);
    if (!(parentCutoff > performance.now())) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
    const nonce = crypto.randomBytes(32);
    const challenge = Buffer.alloc(80);
    challenge.write('RRSCG4C1', 0, 'ascii'); nonce.copy(challenge, 8);
    challenge.writeUInt32BE(process.pid, 40);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ID), 44);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ATTEMPT), 52);
    Buffer.from(issued.identity.GITHUB_SHA, 'hex').copy(challenge, 60);
    const child = sourceCohortSpawn('python', ['-I', '-B',
      path.join(PRIVATE_RUNTIME_REPOSITORY_ROOT, 'scripts/lib/copernicus_component_process.py'),
      '--source-dmi-cohort'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT,
      env: childEnvironment, stdio: ['ignore', 'inherit', 'inherit', 'pipe'] });
    state.child = child; state.control = child.stdio[3];
    const control = state.control;
    if (!control) sourceOriginalFailure('CHILD_CLOCK_PIPE_REQUIRED');
    control.once('close', () => { state.controlCloseObserved = true; });
    await new Promise((resolve, reject) => {
      let phase = 'anchor', pending = Buffer.alloc(0), timer;
      const fail = error => {
        clearTimeout(timer);
        reject(retainFailure(error));
        // Never kill the guardian, release its owner or delete its work here.
      };
      child.on('error', fail); control.on('error', fail);
      control.on('data', chunk => {
        if (state.firstFailure !== null) return;
        try {
          pending = Buffer.concat([pending, chunk]);
          if (pending.length > 56 + 48 + 48 + 4096 + 120) sourceOriginalFailure('CHILD_CLOCK_FRAME_INVALID');
          while (pending.length) {
          if (phase === 'ended' && pending.length >= 8 && pending.toString('ascii', 0, 8) === 'RRSCG4F2') {
            if (pending.length < 60) return;
            const first = sourceChildFirstFailureRecord(pending.subarray(0, 60),
              { nonce, before: state.before, anchor: state.childAnchor, stage: state.cutoffs.stage },
              issued.deadline, performance.now(), state.childTerminalFailure ?? null);
            state.childTerminalFailure = first;
            state.failureWorker ??= first;
            state.firstNormalFailure ??= first.firstFailure;
            pending = pending.subarray(60);
            clearTimeout(timer);
            timer = setTimeout(() => fail(state.failureWorker.firstFailure[0]),
              Math.max(0, Math.ceil(sourceFailureWorkCutoff(state, issued) - performance.now())));
            continue;
          }
          let length = phase === 'anchor' ? 56 : 48;
          if (pending.length < length) return;
          if (phase === 'ended') {
            const count = pending.readUInt32BE(44);
            if (count < 2 || count > 4096) sourceOriginalFailure('DMI_OUTPUT_FRAME_INVALID');
            length += count;
            if (pending.length < length) return;
          }
          const frameBytes = pending.subarray(0, length);
          pending = pending.subarray(length);
          if (!frameBytes.subarray(8, 40).equals(nonce)) sourceOriginalFailure('CHILD_CLOCK_FRAME_INVALID');
          if (phase === 'anchor') {
            if (pending.length || frameBytes.toString('ascii', 0, 8) !== 'RRSCG4A1'
              || frameBytes.readUInt32BE(40) !== child.pid || frameBytes.readUInt32BE(44) !== process.pid) sourceOriginalFailure('CHILD_CLOCK_IDENTITY_CHANGED');
            // Sample AFTER the entire reply AND the same issuer's fresh recheck.
            const current = assertPrivateSourceJobDeadline(holder);
            state.after = performance.now(); state.childAnchor = frameBytes.readBigUInt64BE(48);
            if (!Number.isFinite(state.before) || state.before > state.after || state.after >= parentCutoff) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
            const job = sourceChildAbsoluteCutoff(current.deadline, state.after, state.childAnchor);
            const stage = sourceChildAbsoluteCutoff(Math.min(stageEnd, current.deadline), state.after, state.childAnchor);
            state.failureClock = Object.freeze({ nonce, phase: 0, after: state.after,
              anchor: state.childAnchor, parentCutoff: Math.min(stageEnd, current.deadline) });
            state.cutoffs = Object.freeze({ job, stage });
            const frame = Buffer.alloc(56); frame.write('RRSCG4D1', 0, 'ascii'); nonce.copy(frame, 8);
            frame.writeBigUInt64BE(job, 40); frame.writeBigUInt64BE(stage, 48);
            phase = 'bounded';
            control.write(frame, error => { if (error) fail(error); });
          } else if (phase === 'bounded') {
            if (frameBytes.toString('ascii', 0, 8) !== 'RRSCG4B1'
              || frameBytes.readBigUInt64BE(40) !== state.cutoffs.stage
              || performance.now() >= parentCutoff) sourceOriginalFailure('CHILD_CLOCK_FRAME_INVALID');
            phase = 'ended';
          } else if (phase === 'ended') {
            if (frameBytes.toString('ascii', 0, 8) !== 'RRSCG4E1') sourceOriginalFailure('CHILD_CLOCK_FRAME_INVALID');
            const output = JSON.parse(frameBytes.subarray(48).toString('utf8'));
            if (output?.schemaVersion !== 1 || output.kind !== 'SOURCE_DMI_PHASE_CLOSED'
              || !Number.isSafeInteger(output.outputBytes) || output.outputBytes < 0 || output.outputBytes > 131072
              || !/^[0-9a-f]{64}$/.test(output.outputSha256 ?? '') || !isPlainObject(output.outputs)
              || Object.keys(output.outputs).some(key => !['status', 'terminal_code', 'strict_current_anchor_ready', 'candidate_promoted'].includes(key))
              || Object.values(output.outputs).some(value => typeof value !== 'string' || value.length > 256)) sourceOriginalFailure('DMI_OUTPUT_FRAME_INVALID');
            assertSourceChildFailureEnd(state.childTerminalFailure, output);
            state.result = freezeSourceOriginalMetadata({ returncode: frameBytes.readInt32BE(40), output });
            phase = 'closing';
          } else sourceOriginalFailure('CHILD_CLOCK_FRAME_INVALID');
          }
        } catch (error) { fail(error); }
      });
      control.on('end', () => {
        if (phase !== 'closing' || pending.length) fail(new Error('SOURCE_ORIGINAL_CHILD_CLOCK_PIPE_LOST'));
      });
      child.once('close', (code, signal) => {
        clearTimeout(timer);
        if (state.firstFailure !== null) { reject(state.firstFailure[0]); return; }
        if (phase !== 'closing' || pending.length || code !== 0 || signal !== null
          || performance.now() >= parentCutoff) { fail(new Error('SOURCE_ORIGINAL_DMI_COHORT_UNPROVED')); return; }
        resolve();
      });
      timer = setTimeout(() => fail(new Error('SOURCE_ORIGINAL_DMI_COHORT_UNPROVED')),
        Math.max(0, Math.ceil(parentCutoff - performance.now())));
      state.before = performance.now();
      control.write(challenge, error => { if (error) fail(error); });
    });
    await finishSourceDmiWorkingGeneration(holder, operation);
    // Byte-owned outputs are not scientific readiness, T or session completion.
    // The same operation remains active for its next genuine consumer.
    return operation;
  } catch (error) { throw retainFailure(error); }
}

function sourceIsoCacheGeneration(date) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) sourceOriginalFailure('CACHE_GENERATION_INVALID');
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  value.setUTCDate(value.getUTCDate() + 4 - (value.getUTCDay() || 7));
  const year = value.getUTCFullYear();
  const week = Math.ceil((((value - Date.UTC(year, 0, 1)) / 86400000) + 1) / 7);
  const result = `${year}-W${String(week).padStart(2, '0')}`;
  if (!/^[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])$/.test(result)) sourceOriginalFailure('CACHE_GENERATION_INVALID');
  return result;
}

const sourceNormalPhases = new WeakMap();

function sourceNormalPhaseState(holder, operation, phaseOperation) {
  const state = sourceDmiWorkingState(holder, operation);
  const phase = sourceNormalPhases.get(phaseOperation);
  if (!phase || phase.state !== state || phase.holder !== holder || phase.operation !== operation
    || state.normalPhase !== phase || phase.completed || phase.firstFailure !== null) {
    sourceOriginalFailure('NORMAL_PHASE_NOT_OWNED');
  }
  return phase;
}
function sourceRetainedWorkingRow(owner, row) {
  return owner.normalWorkingPreservation?.get(row)
    ?? owner.dmiWorkingPreservation?.get(row) ?? owner.workingPreservation?.get(row) ?? row;
}
async function assertSourceNormalGeneration(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation);
  await assertSourceOriginalProgress(holder);
  const generation = state.normalGeneration ?? state.outputGeneration;
  if (!generation || generation.operation !== operation) sourceOriginalFailure('NORMAL_GENERATION_REQUIRED');
  for (const row of generation.rows) {
    await hashSourceOriginalHandle(state.owner, sourceRetainedWorkingRow(state.owner, row));
  }
  sourceDmiWorkingState(holder, operation);
  return generation;
}
async function locateSourceNormalOutput(owner, phase, relative) {
  if (!sourceNormalMutablePaths[phase.name]?.includes(relative)) sourceOriginalFailure('NORMAL_OUTPUT_NOT_FIXED');
  const root = owner.context.repository;
  let directory = root;
  const directories = [];
  const prior = phase.routes?.find(row => row.relativePath === relative);
  for (const segment of ['', ...relative.split('/').slice(0, -1)]) {
    if (segment) directory = path.join(directory, segment);
    const stat = await fs.lstat(directory, { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    const pinned = prior?.directories.find(row => row.path === directory);
    if (stat === null) {
      if (pinned) sourceOriginalFailure('NORMAL_DIRECTORY_CHANGED');
      return { path: path.join(root, ...relative.split('/')), absent: true, directories };
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()
      || (pinned && !sameSourceOriginalStat(pinned.stat, stat))
      || (directory === root && !sameSourceOriginalStat(owner.workingOperation.input.installRoot, stat))) {
      sourceOriginalFailure('NORMAL_DIRECTORY_CHANGED');
    }
    directories.push({ path: directory, stat });
  }
  const file = path.join(root, ...relative.split('/'));
  const stat = await fs.lstat(file, { bigint: true }).catch(error => {
    if (error?.code === 'ENOENT') return null;
    throw error;
  });
  if (stat !== null && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n)) sourceOriginalFailure('NORMAL_OUTPUT_INVALID');
  return { path: file, absent: stat === null, directories };
}
async function beginSourceNormalPhase(holder, operation, name) {
  const state = sourceDmiWorkingState(holder, operation);
  if (!Object.hasOwn(sourceNormalMutablePaths, name) || state.normalPhase || state.saveInFlight) {
    sourceOriginalFailure('NORMAL_PHASE_NOT_AVAILABLE');
  }
  const started = performance.now();
  const issued = assertPrivateSourceJobDeadline(holder);
  const stageCutoff = name === 'weather' ? started + 80 * 60_000
    : name === 'quality' ? started + 7 * 60_000
      : name === 'seal' ? started + 4 * 60_000
        : name === 'artifactStageSeal' ? started + 30 * 60_000 : issued.deadline;
  const inputGeneration = await assertSourceNormalGeneration(holder, operation);
  const phaseOperation = Object.freeze({});
  const phase = { holder, operation, state, name, inputGeneration, firstFailure: null,
    child: null, completed: false, requested: false, outputRows: [], routes: null,
    phaseOperation, started, cutoff: Math.min(stageCutoff, issued.deadline, state.failureWorker?.cutoff ?? issued.deadline, sourceFailureWorkCutoff(state, issued)) };
  sourceNormalPhases.set(phaseOperation, phase);
  (state.normalPhases ??= []).push(phase);
  state.normalPhase = phase;
  return phaseOperation;
}
export async function sourceNormalWorkingInstallInput(holder, operation, phaseOperation) {
  const phase = sourceNormalPhaseState(holder, operation, phaseOperation);
  const owner = phase.state.owner;
  if (phase.requested || phase.child || phase.preservation) sourceOriginalFailure('NORMAL_PRESERVATION_REUSED');
  phase.requested = true;
  await assertSourceNormalGeneration(holder, operation);
  const current = new Map(phase.inputGeneration.rows.map(row => [row.path, row]));
  const inputs = [], routes = [];
  for (const relativePath of sourceNormalMutablePaths[phase.name]) {
    const located = await locateSourceNormalOutput(owner, phase, relativePath);
    let original = current.get(located.path) ?? null;
    if (!original && !located.absent && phase.name === 'pointRegistry'
      && relativePath === 'data/live/coastal-parts-v2.json') {
      // Reuse ONLY this entry's actual old central-registry FD. The existing
      // normal preserver retains that original inode before the fixed rebuild;
      // the rebuilt registry is a DISTINCT normal output generation, not a
      // rehash/retag of the immutable entry snapshot or a second B install.
      const originals = owner.operationReaders.filter(row => row.path === located.path
        && sourceImmutableEntryRows.has(row));
      if (originals.length !== 1) sourceOriginalFailure('NORMAL_INPUT_LOST');
      original = originals[0];
      await hashSourceOriginalHandle(owner, original);
      current.set(located.path, original);
    }
    if (!original && !located.absent && phase.name === 'preflightState'
      && relativePath === sourcePreludeInputRoutes.cachedState) {
      const prelude = assertPrivateSourceJobDeadline(holder).normalPrelude;
      const previous = prelude.readers.filter(row => row.path === located.path);
      if (previous.length) {
        if (previous.length !== 1 || previous[0] !== prelude.cachedStateInputRow
          || !/^[a-f0-9]{64}$/.test(previous[0].sha256 ?? '')) sourceOriginalFailure('NORMAL_INPUT_LOST');
        original = previous[0];
        await checkSourcePreludeInput(holder, original);
        current.set(located.path, original);
      }
    }
    if (original && located.absent) sourceOriginalFailure('NORMAL_INPUT_LOST');
    if (!original && !located.absent) {
      // An existing operational output absent from B is still preserved as an
      // owned working file. It is never added to B/S inventories or provenance.
      original = await openSourceOutputRow(owner, owner.context.repository, located.path);
      phase.outputRows.push(original); // retain before any subsequent await
      current.set(located.path, original);
    }
    routes.push(Object.freeze({ relativePath, ...located, original }));
    if (original) {
      await hashSourceOriginalHandle(owner, original);
      inputs.push(Object.freeze({ relativePath, original, handle: original.handle,
        bytes: original.bytes, sha256: original.sha256 }));
    }
  }
  sourceNormalPhaseState(holder, operation, phaseOperation);
  phase.workingBefore = current;
  phase.routes = Object.freeze(routes);
  phase.preservationInput = Object.freeze({ root: owner.context.repository, inputs: Object.freeze(inputs) });
  return phase.preservationInput;
}
export async function assertSourceNormalWorkingInstallInput(holder, operation, phaseOperation, input) {
  const phase = sourceNormalPhaseState(holder, operation, phaseOperation);
  if (!phase.preservationInput?.inputs.includes(input) || phase.child || phase.preservation) {
    sourceOriginalFailure('NORMAL_PRESERVATION_INPUT_INVALID');
  }
  await hashSourceOriginalHandle(phase.state.owner, input.original);
}
async function preserveSourceNormalPhase(holder, operation, phaseOperation) {
  const phase = sourceNormalPhaseState(holder, operation, phaseOperation), owner = phase.state.owner;
  const { preserveSourceNormalWorkingInputs, sourceNormalWorkingPreservationCompletion }
    = await import('./weather-component-progress-cache.mjs');
  await preserveSourceNormalWorkingInputs(holder, operation, phaseOperation);
  const completion = sourceNormalWorkingPreservationCompletion(phaseOperation);
  if (completion.input !== phase.preservationInput || phase.child || phase.preservation
    || completion.preserved.length !== phase.preservationInput.inputs.length) sourceOriginalFailure('NORMAL_PRESERVATION_CHANGED');
  const additions = new Map();
  for (const input of phase.preservationInput.inputs) {
    const moved = completion.preserved.find(row => row.input === input), original = input.original;
    if (!moved || moved.fd !== moved.handle.fd || moved.identity.dev !== original.stat.dev
      || moved.identity.ino !== original.stat.ino || moved.bytes !== original.bytes
      || moved.sha256 !== original.sha256) sourceOriginalFailure('NORMAL_PRESERVATION_CHANGED');
    const view = { ...original, path: moved.path, stat: moved.identity };
    await hashSourceOriginalHandle(owner, view);
    additions.set(original, view);
  }
  // All moves verified before exposing even retention-only views. These do
  // not replace original objects and do not admit a producer/output generation.
  const retained = new Map(owner.normalWorkingPreservation ?? []);
  for (const [original, view] of additions) {
    if (retained.has(original)) sourceOriginalFailure('NORMAL_PRESERVATION_REUSED');
    retained.set(original, view);
  }
  owner.normalWorkingPreservation = retained;
  phase.preservation = completion;
  await assertSourceNormalGeneration(holder, operation);
  for (const row of completion.rows) await hashSourceOriginalHandle(owner, row);
  for (const route of phase.routes) {
    const now = await locateSourceNormalOutput(owner, phase, route.relativePath);
    if (!route.original && !now.absent) sourceOriginalFailure('NORMAL_ABSENCE_CHANGED');
  }
  sourceNormalPhaseState(holder, operation, phaseOperation);
}
async function finishSourceNormalGeneration(holder, operation, phaseOperation) {
  const phase = sourceNormalPhaseState(holder, operation, phaseOperation), owner = phase.state.owner;
  // Set only by the private transport after actual H close/drain and its exact
  // response. A child exit/stdout boolean supplied by a caller cannot enter here.
  if (!phase.preservation || !phase.child || !phase.controlCloseObserved || !phase.transportClosed
    || !Number.isInteger(phase.result?.exitCode) || phase.result.exitCode < 0 || phase.result.exitCode > 255) {
    sourceOriginalFailure('NORMAL_PHASE_CLOSURE_UNPROVED');
  }
  const rows = new Map(phase.workingBefore), absent = [];
  await assertSourceNormalGeneration(holder, operation);
  for (const route of phase.routes) {
    const located = await locateSourceNormalOutput(owner, phase, route.relativePath);
    if (located.absent) {
      // updateStaging always writes these three canonical outputs, even when
      // its actual DMI candidate set is empty. A zero exit cannot admit an
      // absent output; a safely closed nonzero keeps its real old semantics.
      if (phase.result.exitCode === 0 && ((phase.name === 'point'
        && [PRIVATE_WEATHER_COMPONENT_FILES.coastalPointState, PRIVATE_WEATHER_COMPONENT_FILES.coastalPointStatus,
          'data/live/coastal-point-staging-status.json'].includes(route.relativePath))
        || phase.name === 'preflightState' && route.relativePath === sourcePreludeInputRoutes.cachedState)) {
        sourceOriginalFailure('NORMAL_OUTPUT_LOST');
      }
      const expectedRemoval = phase.result.exitCode === 0
        && ((phase.name === 'activePromote' && route.relativePath === '.cache/dmi-active-complete.json.tmp')
          || (phase.name === 'advisoryRemove' && route.relativePath === '.cache/weather-current-acquisition-plan.json')
          || (phase.name === 'pointPrepare' && [PRIVATE_WEATHER_COMPONENT_FILES.coastalPointActivationState,
            PRIVATE_WEATHER_COMPONENT_FILES.coastalPointPendingPromotion].includes(route.relativePath)));
      if (route.original && !expectedRemoval) sourceOriginalFailure('NORMAL_OUTPUT_LOST');
      // Earlier bytes remain in the verified preservation view; the current
      // normal generation must not advertise a pathname deliberately consumed.
      rows.delete(located.path);
      absent.push(route.relativePath);
    } else {
      const row = await openSourceOutputRow(owner, owner.context.repository, located.path);
      phase.outputRows.push(row);
      rows.set(row.path, row);
    }
  }
  await assertSourceOriginalProgress(holder);
  for (const row of rows.values()) await hashSourceOriginalHandle(owner, row);
  sourceNormalPhaseState(holder, operation, phaseOperation);
  const generation = Object.freeze({ operation, phaseOperation, inputGeneration: phase.inputGeneration,
    originalBinding: owner.progressBinding, rows: Object.freeze([...rows.values()]),
    absent: Object.freeze(absent), exitCode: phase.result.exitCode });
  // Synchronous publication only after all awaited original and output checks.
  phase.outputGeneration = generation;
  phase.completed = true;
  phase.state.normalGeneration = generation;
  phase.state.normalPhase = null;
  return generation;
}

const sourcePreludeInputRoutes = Object.freeze({
  cachedState: '.cache/weather-preflight-state/state.json',
  publicManifest: '.cache/weather-preflight-work/public-manifest.json',
  preflightScript: 'scripts/check-weather-update.py',
  preflightStorage: 'scripts/lib/dmi_bulk_storage.py',
});
async function sourcePreludeDirectory(holder, relative, create = false) {
  const state = sourceNormalPreludeState(holder);
  if (!['.cache', '.cache/weather-preflight-work', '.cache/weather-preflight-work/input',
    '.cache/weather-preflight-work/input/scripts', '.cache/weather-preflight-work/input/scripts/lib']
    .includes(relative)) sourceDeadlineFailure('SOURCE_PREFLIGHT_DIRECTORY_NOT_FIXED');
  let named = state.root;
  for (const segment of ['', ...relative.split('/')]) {
    if (segment) named = path.join(named, segment);
    let stat = await fs.lstat(named, { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null; throw error;
    });
    if (stat === null && create && named !== state.root) {
      await fs.mkdir(named, { mode: 0o700 });
      stat = await fs.lstat(named, { bigint: true });
    }
    if (!stat?.isDirectory() || stat.isSymbolicLink() || await fs.realpath(named) !== named
      || named === state.root && !sameSourceOriginalStat(stat, state.rootStat)) {
      sourceDeadlineFailure('SOURCE_PREFLIGHT_DIRECTORY_CHANGED');
    }
  }
  return named;
}
async function checkSourcePreludeInput(holder, row) {
  const state = sourceNormalPreludeState(holder);
  if (!state.readers.includes(row)) sourceDeadlineFailure('SOURCE_PREFLIGHT_READER_REQUIRED');
  for (const directory of row.directories) {
    const actual = await fs.lstat(directory.path, { bigint: true });
    if (!actual.isDirectory() || actual.isSymbolicLink() || !sameSourceOriginalStat(actual, directory.stat)) {
      sourceDeadlineFailure('SOURCE_PREFLIGHT_DIRECTORY_CHANGED');
    }
  }
  const opened = await row.handle.stat({ bigint: true }), named = await fs.lstat(row.path, { bigint: true });
  if (!opened.isFile() || !named.isFile() || named.isSymbolicLink() || opened.nlink !== 1n
    || !sameSourceOriginalStat(row.stat, opened, true) || !sameSourceOriginalStat(row.stat, named, true)) {
    sourceDeadlineFailure('SOURCE_PREFLIGHT_INPUT_CHANGED');
  }
}
async function readSourcePreludeInput(holder, name) {
  const state = sourceNormalPreludeState(holder), relative = sourcePreludeInputRoutes[name];
  if (!relative) sourceDeadlineFailure('SOURCE_PREFLIGHT_INPUT_NOT_FIXED');
  const directories = []; let directory = state.root;
  for (const segment of ['', ...relative.split('/').slice(0, -1)]) {
    if (segment) directory = path.join(directory, segment);
    const stat = await fs.lstat(directory, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink()
      || directory === state.root && !sameSourceOriginalStat(stat, state.rootStat)) sourceDeadlineFailure('SOURCE_PREFLIGHT_DIRECTORY_CHANGED');
    directories.push({ path: directory, stat });
  }
  const named = path.join(state.root, relative), stat = await fs.lstat(named, { bigint: true });
  // Same normal dataminimized bound. Source files are smaller than this bound
  // too; they are copied whole, never edited or substituted with a shim.
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1n || stat.size < 2n || stat.size > 131072n) {
    sourceDeadlineFailure('SOURCE_PREFLIGHT_INPUT_INVALID');
  }
  const handle = await fs.open(named, sourceOriginalFsConstants.O_RDONLY | sourceOriginalFsConstants.O_NOFOLLOW);
  const row = { path: named, handle, stat, directories, bytes: Number(stat.size), sha256: null };
  state.readers.push(row);
  await checkSourcePreludeInput(holder, row);
  const buffer = Buffer.alloc(row.bytes); let position = 0;
  while (position < buffer.length) {
    sourceNormalPreludeState(holder);
    const result = await handle.read(buffer, position, buffer.length - position, position);
    if (!result.bytesRead) sourceDeadlineFailure('SOURCE_PREFLIGHT_INPUT_CHANGED');
    position += result.bytesRead;
  }
  if ((await handle.read(Buffer.alloc(1), 0, 1, position)).bytesRead) sourceDeadlineFailure('SOURCE_PREFLIGHT_INPUT_CHANGED');
  row.sha256 = sha256(buffer);
  await checkSourcePreludeInput(holder, row);
  if (name === 'cachedState') {
    if (state.cachedStateInputRow) sourceDeadlineFailure('SOURCE_PREFLIGHT_REUSED');
    state.cachedStateInputRow = row; // Only the actual completed original read.
  }
  return { row, bytes: buffer };
}
async function copySourcePreludeProgram(holder, name) {
  if (!['preflightScript', 'preflightStorage'].includes(name)) sourceDeadlineFailure('SOURCE_PREFLIGHT_PROGRAM_NOT_FIXED');
  const input = await readSourcePreludeInput(holder, name);
  const directory = await sourcePreludeDirectory(holder,
    name === 'preflightScript' ? '.cache/weather-preflight-work/input/scripts'
      : '.cache/weather-preflight-work/input/scripts/lib', true);
  const destination = path.join(directory, name === 'preflightScript' ? 'check-weather-update.py' : 'dmi_bulk_storage.py');
  // The normal copied module needs this exact local stdlib-only import. No
  // patched ROOT, sys.path shim or fake provider/codec implementation is used.
  const handle = await fs.open(destination, sourceOriginalFsConstants.O_WRONLY
    | sourceOriginalFsConstants.O_CREAT | sourceOriginalFsConstants.O_EXCL | sourceOriginalFsConstants.O_NOFOLLOW, 0o600);
  const state = sourceNormalPreludeState(holder);
  const writer = { handle, fd: handle.fd, path: destination, closed: false,
    descriptorIdentity: ownFileDescriptorIdentity(handle.fd), closeJournal: null };
  (state.writers ??= []).push(writer);
  let first = null;
  try {
    if (writer.descriptorIdentity === null) sourceDeadlineFailure('SOURCE_PREFLIGHT_CLOSE_UNPROVED');
    let position = 0;
    while (position < input.bytes.length) {
      sourceNormalPreludeState(holder);
      const result = await handle.write(input.bytes, position, input.bytes.length - position, position);
      if (!result.bytesWritten) sourceDeadlineFailure('SOURCE_PREFLIGHT_SHORT_WRITE');
      position += result.bytesWritten;
    }
    await handle.sync();
    await checkSourcePreludeInput(holder, input.row);
  } catch (error) { first = [error]; }
  try {
    const identity = ownFileDescriptorIdentity(writer.fd);
    if (!identity || !writer.descriptorIdentity || handle.fd !== writer.fd
      || identity.dev !== writer.descriptorIdentity.dev || identity.ino !== writer.descriptorIdentity.ino
      || identity.prototype !== writer.descriptorIdentity.prototype) sourceDeadlineFailure('SOURCE_PREFLIGHT_CLOSE_UNPROVED');
    writer.stat = await handle.stat({ bigint: true });
    if (!writer.stat.isFile() || writer.stat.dev !== identity.dev || writer.stat.ino !== identity.ino) {
      sourceDeadlineFailure('SOURCE_PREFLIGHT_CLOSE_UNPROVED');
    }
    const journal = { firstFailure: null, closeAttempted: false, closed: false };
    writer.closeJournal = journal;
    try { await closeSourceFinalReader(writer, journal); }
    finally { writer.closed = journal.closed; }
  } catch (error) { first ??= [error]; }
  if (!writer.closed) first ??= [new Error('SOURCE_PREFLIGHT_CLOSE_UNPROVED')];
  if (first !== null) throw first[0];
}
async function runSourceNormalPreflight(holder) {
  const state = sourceNormalPreludeState(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (state.preflight !== null || state.inFlight) sourceDeadlineFailure('SOURCE_PREFLIGHT_REUSED');
  const distribution = await runSourceNormalPreludeRequired(holder, 'distribution');
  if (distribution.result.outputs.distribution_ready !== 'true') {
    throw retainSourcePreludeFailure(holder, distribution, new Error('SOURCE_DISTRIBUTION_NOT_READY'));
  }
  issued.normalDistribution = distribution;
  const cache = await runSourceNormalPreludeProgram(holder, 'preflightCache');
  await sourcePreludeDirectory(holder, '.cache/weather-preflight-work', true);
  const manifestPath = path.join(state.root, sourcePreludeInputRoutes.publicManifest);
  const manifestBefore = await fs.lstat(manifestPath).catch(error => { if (error?.code === 'ENOENT') return null; throw error; });
  if (manifestBefore && (!manifestBefore.isFile() || manifestBefore.isSymbolicLink())) {
    sourceDeadlineFailure('SOURCE_PREFLIGHT_MANIFEST_INVALID');
  }
  const manifest = await runSourceNormalPreludeProgram(holder, 'publicManifest');
  let decision = null;
  if (cache.result.exitCode === 0 && cache.result.outputs.cache_hit === 'true' && manifest.result.exitCode === 0) {
    try {
      const metadata = await readSourcePreludeInput(holder, 'cachedState');
      const publicInput = await readSourcePreludeInput(holder, 'publicManifest');
      const normal = await import('./private-production-runtime-workflow.mjs');
      await normal.validatePrivateRuntimePreflightState(JSON.parse(metadata.bytes.toString('utf8')),
        { publicManifest: JSON.parse(publicInput.bytes.toString('utf8')) });
      await normal.materializePrivateRuntimePreflight({ statePath: metadata.row.path,
        publicManifestPath: publicInput.row.path,
        outputRoot: path.join(state.root, '.cache/weather-preflight-work/input') });
      await checkSourcePreludeInput(holder, metadata.row);
      await checkSourcePreludeInput(holder, publicInput.row);
      await copySourcePreludeProgram(holder, 'preflightScript');
      await copySourcePreludeProgram(holder, 'preflightStorage');
      const probe = await runSourceNormalPreludeProgram(holder, 'preflightProbe');
      if (probe.result.exitCode === 0 && ['true', 'false'].includes(probe.result.outputs.should_run)
        && ['true', 'false'].includes(probe.result.outputs.dmi_changed)) {
        decision = Object.freeze({ shouldRun: probe.result.outputs.should_run === 'true',
          dmiChanged: probe.result.outputs.dmi_changed === 'true', reason: probe.result.outputs.reason,
          phase: probe });
      }
    } catch (error) {
      // Exact normal fallback for an unavailable minimal preflight, not for an
      // unknown guardian or writer lifetime. An active/uncertain operation is
      // retained and cannot be turned into a build decision.
      sourceNormalPreludeState(holder);
      if (state.inFlight || state.writers?.some(row => !row.closed)) throw error;
      state.preflightUnavailable = [error];
    }
  }
  sourceNormalPreludeState(holder);
  state.preflight = decision ?? Object.freeze({ shouldRun: true, dmiChanged: false,
    reason: 'verified-light-preflight-unavailable' });
  return state.preflight;
}


async function runSourceNormalGenerationPreparation(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), issued = assertPrivateSourceJobDeadline(holder);
  const prelude = issued.normalPrelude;
  if (state.dmiStarted || prelude.recovery || prelude.handoff?.reused === true) sourceOriginalFailure('NORMAL_GENERATION_PREPARE_REUSED');
  const phase = await runSourceRequiredProgram(holder, operation, 'generationPrepare');
  const values = phase.result.outputs;
  if (!['true', 'false'].includes(values.strict_active_ready)
    || values.candidate_seeded !== (values.strict_active_ready === 'true' ? 'false' : 'true')
    || !['true', 'false'].includes(values.extended)) sourceOriginalFailure('NORMAL_RECOVERY_RESULT_INVALID');
  const counts = JSON.parse(values.missing_pair_counts_json);
  if (!isPlainObject(counts) || Object.keys(counts).sort().join(',') !== 'current,waterLevel,waterTemperature,wave,wind'
    || Object.values(counts).some(value => !Number.isSafeInteger(value) || value < 0)) {
    sourceOriginalFailure('NORMAL_RECOVERY_RESULT_INVALID');
  }
  await assertSourceNormalGeneration(holder, operation);
  sourceDmiWorkingState(holder, operation);
  prelude.generationPreparation = phase;
  prelude.recovery = Object.freeze({ extended: values.extended === 'true',
    missingPairCountsJson: values.missing_pair_counts_json });
}

async function acquireSourceNormalProgressCipher(holder) {
  const issued = assertPrivateSourceJobDeadline(holder), prelude = sourceNormalPreludeState(holder);
  assertActualSourceEntryInstallation(sourceOriginalOwner(holder));
  if (!prelude.originalInstall || prelude.originalInstall.pending || prelude.progressCache) {
    sourceDeadlineFailure('SOURCE_PROGRESS_CACHE_ROUTE_INVALID');
  }
  const route = issued.normalRoute;
  if (route.request.quick && route.request.quickProgressSource === 'protected-current'
    || prelude.handoff?.selected === true) {
    prelude.progressCache = Object.freeze({ selected: false });
    return;
  }
  const phase = await runSourceNormalPreludeProgram(holder, 'progressCache');
  // Cache API errors have the normal continue-on-error meaning only AFTER H
  // proves actual drain. The existing C reader still authenticates any file;
  // truncated/auth/unknown-I/O never becomes an admitted cache miss here.
  prelude.progressCache = Object.freeze({ selected: true, phase });
  if ((route.request.quick || route.request.quickProgressSource !== '')
    && (phase.result.exitCode !== 0 || phase.result.outputs.cache_hit !== 'true'
      || phase.result.outputs.cache_exact !== 'true')) sourceDeadlineFailure('SOURCE_QUICK_PROGRESS_CACHE_REQUIRED');
}
async function acquireSourceNormalRawCache(holder, operation) {
  const issued = assertPrivateSourceJobDeadline(holder), state = sourceDmiWorkingState(holder, operation);
  if (state.dmiStarted || state.rawCache || issued.normalPrelude.handoff?.reused === true) {
    sourceOriginalFailure('NORMAL_RAW_CACHE_ROUTE_INVALID');
  }
  if (!issued.normalCacheGeneration) issued.normalCacheGeneration = sourceIsoCacheGeneration(new Date());
  const phase = await runSourceRequiredProgram(holder, operation, 'rawCache');
  if (!['true', 'false'].includes(phase.result.outputs.cache_hit)) sourceOriginalFailure('NORMAL_RAW_CACHE_RESULT_INVALID');
  state.rawCache = phase;
}


const sourceNormalAuxiliaryNames = Object.freeze({
  previousConditions: 'previous-weather-conditions.json',
  previousHours: 'previous-public-hour-delivery.pack',
  pairedConditions: 'paired-15z-conditions.json',
  pairedHours: 'paired-15z-public-hour-delivery.pack',
  historicalTransition: 'historical-wave-input-transition.json',
});
async function sourceNormalRowBytes(holder, row, maximum) {
  const owner = sourceOriginalOwner(holder);
  if (!Number.isSafeInteger(maximum) || maximum < 1 || row.bytes < 1 || row.bytes > maximum) sourceOriginalFailure('NORMAL_READ_SIZE_INVALID');
  await hashSourceOriginalHandle(owner, row);
  const bytes = Buffer.alloc(row.bytes);
  let position = 0;
  while (position < bytes.length) {
    sourceOriginalOwner(holder);
    const actual = await row.handle.read(bytes, position, bytes.length - position, position);
    if (!actual.bytesRead) sourceOriginalFailure('NORMAL_READ_TRUNCATED');
    position += actual.bytesRead;
  }
  if ((await row.handle.read(Buffer.alloc(1), 0, 1, position)).bytesRead || sha256(bytes) !== row.sha256) {
    sourceOriginalFailure('NORMAL_READ_CHANGED');
  }
  await hashSourceOriginalHandle(owner, row);
  return bytes;
}
async function preserveSourceNormalComparison(holder, name, input) {
  const owner = sourceOriginalOwner(holder), temporary = await sourceNormalTemporary(holder);
  if (!Object.hasOwn(sourceNormalAuxiliaryNames, name) || name === 'historicalTransition'
    || (owner.normalAuxiliary ??= new Map()).has(name)) sourceOriginalFailure('NORMAL_COMPARISON_NOT_FIXED');
  const fixedSource = name.endsWith('Conditions') ? 'data/live/conditions.json' : '.cache/public-hour-delivery.pack';
  const actual = name.startsWith('paired')
    ? owner.kind === 'pair' && owner.bundles[0].rows.get('payload/' + fixedSource)
    : owner.workingReaders.find(row => row.path === path.join(owner.context.repository, fixedSource));
  if (input !== actual || !actual) sourceOriginalFailure('NORMAL_COMPARISON_INPUT_NOT_OWNED');
  await hashSourceOriginalHandle(owner, input);
  const row = { path: path.join(temporary.path, sourceNormalAuxiliaryNames[name]),
    handle: null, stat: null, directories: [{ path: temporary.path, stat: temporary.stat }],
    bytes: input.bytes, sha256: input.sha256, complete: false, source: input };
  owner.normalAuxiliary.set(name, row); // retain even open/write/sync failure
  try {
    row.handle = await fs.open(row.path, sourceOriginalFsConstants.O_RDWR | sourceOriginalFsConstants.O_CREAT
      | sourceOriginalFsConstants.O_EXCL | sourceOriginalFsConstants.O_NOFOLLOW, 0o600);
    const created = await row.handle.stat({ bigint: true });
    if (!created.isFile() || created.nlink !== 1n || created.size !== 0n) sourceOriginalFailure('NORMAL_COMPARISON_OUTPUT_INVALID');
    let position = 0;
    const buffer = Buffer.alloc(64 * 1024);
    for (;;) {
      sourceOriginalOwner(holder);
      const actual = await input.handle.read(buffer, 0, buffer.length, position);
      if (!actual.bytesRead) break;
      if (position + actual.bytesRead > row.bytes) sourceOriginalFailure('NORMAL_COMPARISON_INPUT_CHANGED');
      let written = 0;
      while (written < actual.bytesRead) {
        const result = await row.handle.write(buffer, written, actual.bytesRead - written, position + written);
        if (!result.bytesWritten) sourceOriginalFailure('NORMAL_COMPARISON_SHORT_WRITE');
        written += result.bytesWritten;
      }
      position += actual.bytesRead;
    }
    if (position !== input.bytes) sourceOriginalFailure('NORMAL_COMPARISON_INPUT_CHANGED');
    await row.handle.sync();
    row.stat = await row.handle.stat({ bigint: true });
    if (created.dev !== row.stat.dev || created.ino !== row.stat.ino || created.mode !== row.stat.mode) sourceOriginalFailure('NORMAL_COMPARISON_OUTPUT_CHANGED');
    await hashSourceOriginalHandle(owner, input);
    await hashSourceOriginalHandle(owner, row);
    await sourceNormalTemporary(holder);
    sourceOriginalOwner(holder);
    row.complete = true;
    return row;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}

const sourcePreludePhases = new WeakMap();

const retainedSourcePreludePhases = new Set();

function retainSourcePreludeFailure(holder, phase, error) {
  const issued = sourceJobDeadlineBrands.get(holder), state = issued?.normalPrelude;
  if (!state || state.holder !== holder || sourcePreludePhases.get(phase)?.holder !== holder) {
    sourceDeadlineFailure('SOURCE_PRELUDE_OWNER_REQUIRED');
  }
  if (state.firstFailure === null) state.firstFailure = [error];
  retainedSourcePreludePhases.add(phase);
  return state.firstFailure[0];
}

async function beginSourcePreludePhase(holder, name) {
  const state = sourceNormalPreludeState(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (!Object.hasOwn(sourcePreludeProgramCodes, name) || state.inFlight) sourceDeadlineFailure('SOURCE_PRELUDE_PHASE_INVALID');
  const root = await fs.lstat(state.root, { bigint: true });
  if (!root.isDirectory() || root.isSymbolicLink() || !sameSourceOriginalStat(state.rootStat, root)) {
    sourceDeadlineFailure('SOURCE_PRELUDE_ROOT_CHANGED');
  }
  const phase = { name, holder, firstFailure: null, completed: false,
    cutoff: issued.deadline, transportClosed: false, result: null };
  sourcePreludePhases.set(phase, { holder, state });
  state.phases.push(phase);
  state.inFlight = phase;
  return phase;
}
async function finishSourcePreludePhase(holder, phase) {
  const state = sourceNormalPreludeState(holder);
  if (sourcePreludePhases.get(phase)?.state !== state || state.inFlight !== phase
    || !phase.transportClosed || phase.firstFailure !== null || phase.completed) sourceDeadlineFailure('SOURCE_PRELUDE_CLOSE_UNPROVED');
  const root = await fs.lstat(state.root, { bigint: true });
  if (!root.isDirectory() || root.isSymbolicLink() || !sameSourceOriginalStat(state.rootStat, root)) {
    sourceDeadlineFailure('SOURCE_PRELUDE_ROOT_CHANGED');
  }
  sourceNormalPreludeState(holder);
  phase.completed = true; state.inFlight = null;
  return phase;
}
function sourcePreludeEnvironment(holder, name) {
  const state = sourceNormalPreludeState(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (!Object.hasOwn(sourcePreludeProgramCodes, name)) sourceDeadlineFailure('SOURCE_PRELUDE_PHASE_INVALID');
  if (name === 'progressCache') return Object.freeze({ INPUT_QUICK_CONFIRMATION: issued.normalRoute.request.quick ? 'true' : 'false',
    INPUT_QUICK_PROGRESS_SOURCE: issued.normalRoute.request.quickProgressSource });
  if (name !== 'preflightProbe') return Object.freeze({});
  return Object.freeze({ RAVRADAR_FORCE_UPDATE: state.requestForce === 'true'
      || issued.normalRoute.action !== 'integrated' ? 'true' : 'false',
    RAVRADAR_MAX_STALE_MINUTES: '30', RAVRADAR_PREFLIGHT_TIMEOUT_SECONDS: '20' });
}
async function runSourceNormalPreludeProgram(holder, name) {
  // Private names come only from this fixed driver. They cannot be supplied as
  // an external executor, argv list, completed step result or deadline value.
  return runSourceNormalProgram(holder, null, name);
}
async function runSourceNormalPreludeRequired(holder, name) {
  const phase = await runSourceNormalPreludeProgram(holder, name);
  if (phase.result.exitCode !== 0) {
    throw retainSourcePreludeFailure(holder, phase, new Error('SOURCE_PRELUDE_PROGRAM_FAILED'));
  }
  return phase;
}

export async function issueSourceProgressCpInventoryContext(holder, token) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  const progress = issued.normalPrelude?.normalProgress, install = owner.preparedInstall;
  if (!install?.completed || owner.activeOperation || owner.workingGeneration
    || progress?.pending !== true || progress.firstFailure !== null || progress.cpInventoryContext
    || issued.normalPrelude.originalInstall?.pending !== false
    || issued.normalPrelude.originalPostInstall?.pending !== false) sourceOriginalFailure('CP_PROGRESS_NOT_AVAILABLE');
  try {
    const source = await import('./weather-component-progress-cache.mjs');
    const input = await source.sourceProgressCpContextInput(holder, token);
    const restored = issued.normalPrelude.originalInstall.result;
    const resume = await sourceOriginalProgressResumeRequest(holder, restored);
    if (sourceOriginalResultOwners.get(restored) !== owner || input.holder !== holder
      || input.binding !== owner.progressBinding || input.root !== owner.progressBinding.repositoryRoot
      || input.resume.target !== resume.target || input.resume.checkpointOnly !== resume.checkpointOnly
      || input.stage !== path.join(input.temporary.folder, 'verified')) sourceOriginalFailure('CP_PROGRESS_SOURCE_CHANGED');
    const context = Object.freeze({});
    const state = { kind: 'progress', packInvocation: null, componentStage: input.stage };
    const value = { holder, owner, state, stage: input.stage, context, token, source, input,
      progress, install, restored, binding: owner.progressBinding, lockedTarget: issued.normalPrelude.productionTarget,
      invocation: null, phase: null, result: null, parentStat: input.temporary.identity,
      stageIdentity: null, firstFailure: null };
    const present = await fs.lstat(value.stage).catch(error => { if (error?.code === 'ENOENT') return null; throw error; });
    if (present) sourceOriginalFailure('CP_INVENTORY_STAGE_EXISTS');
    sourceProgressCpContexts.set(context, value); sourceOriginalCpContexts.set(context, value);
    progress.cpInventoryContext = context;
    await assertSourceProgressCpContext(value);
    return context;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}
async function assertSourceProgressCpContext(context) {
  const owner = sourceOriginalOwner(context.holder), issued = assertPrivateSourceJobDeadline(context.holder);
  if (sourceProgressCpContexts.get(context.context) !== context || context.owner !== owner
    || context.firstFailure !== null || context.state.kind !== 'progress'
    || owner.preparedInstall !== context.install || !context.install.completed
    || owner.activeOperation || owner.workingGeneration || owner.progressBinding !== context.binding
    || issued.normalPrelude?.normalProgress !== context.progress || context.progress.pending !== true
    || context.progress.firstFailure !== null || context.progress.cpInventoryContext !== context.context
    || issued.normalPrelude.originalInstall?.result !== context.restored
    || issued.normalPrelude.originalInstall.pending !== false || issued.normalPrelude.originalPostInstall?.pending !== false
    || issued.normalPrelude.productionTarget !== context.lockedTarget) sourceOriginalFailure('CP_PROGRESS_OWNER_CHANGED');
  const input = await context.source.sourceProgressCpContextInput(context.holder, context.token);
  if (input !== context.input || input.temporary.identity !== context.parentStat
    || context.state.componentStage !== context.stage
    || context.state.packInvocation !== context.invocation) sourceOriginalFailure('CP_PROGRESS_SOURCE_CHANGED');
  await assertSourceOriginalProgress(context.holder);
  return context;
}
export function retainSourceProgressPackInvocation(holder, context, invocation) {
  const value = sourceProgressCpContexts.get(context), owner = sourceOriginalOwner(holder);
  if (!value || value.holder !== holder || value.owner !== owner || value.invocation
    || value.firstFailure !== null || !sourcePreludeTypes.isPromise(invocation) || sourcePreludeTypes.isProxy(invocation)
    || sourceOriginalCpInvocations.has(invocation)) sourceOriginalFailure('CP_PROGRESS_INVOCATION_NOT_OWNED');
  try {
    // S checks the actual factory result synchronously, before pack I/O can reach H70.
    value.source.assertSourceProgressCpInvocation(holder, value.token, context, invocation);
    value.invocation = invocation; value.state.packInvocation = invocation;
    sourceOriginalCpInvocations.set(invocation, value);
  } catch (error) { value.firstFailure ??= [error]; throw keepSourceOriginalFailure(owner, value.firstFailure[0]); }
}
export async function assertSourceProgressPackClosure(holder, context, invocation) {
  const value = sourceProgressCpContexts.get(context), owner = sourceOriginalOwner(holder);
  if (!value || value.holder !== holder || value.owner !== owner || value.invocation !== invocation) {
    sourceOriginalFailure('CP_PROGRESS_INVOCATION_NOT_OWNED');
  }
  try {
    await assertSourceProgressCpContext(value);
    value.source.assertSourceProgressCpInvocation(holder, value.token, context, invocation);
    await assertSourceCpPackClosureForFinalOwner(holder, invocation);
  } catch (error) { value.firstFailure ??= [error]; throw keepSourceOriginalFailure(owner, value.firstFailure[0]); }
}


async function assertSourceCpPackClosureForFinalOwner(holder, invocation) {
  const owner = sourceOriginalOwner(holder);
  if (!invocation) {
    const installed = owner.preparedInstall;
    if (!installed?.completed || installed.packInvocation || installed.rows.has(PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath)) {
      sourceOriginalFailure('FINAL_PACK_CLOSURE_UNAVAILABLE');
    }
    return;
  }
  const pack = await import('./lib/private-weather-component-pack.mjs');
  const observed = pack.sourceCpInventoryObservation(invocation);
  if (!pack.privateWeatherPackJsonReadsClosed(invocation) || observed.invocation !== invocation
    || !observed.manifest || observed.manifest.kind !== 'PRIVATE_WEATHER_COMPONENT_PACK') sourceOriginalFailure('FINAL_PACK_CLOSURE_UNAVAILABLE');
  const context = sourceOriginalCpInvocations.get(invocation);
  if (!context || context.owner !== owner || observed.context !== context.context
    || context.state.packInvocation !== invocation || observed.root !== context.stage) sourceOriginalFailure('FINAL_PACK_OWNER_UNAVAILABLE');
  await assertSourceOriginalCpStage(context, observed.rootIdentity);
  if (observed.visited === false) {
    if (observed.manifest.files.some(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank)) sourceOriginalFailure('FINAL_PACK_CP_ABSENCE_UNPROVED');
    return; // Actual observed no-bank path, NOT a substitute for an ECHILD ACK.
  }
  if (observed.visited !== true
    || observed.result !== context.result || observed.input !== context.phase?.input) sourceOriginalFailure('FINAL_CP_SUBTREE_ACK_UNAVAILABLE');
  assertSourceOriginalCpInventoryResult(invocation, observed.result);
}
export async function assertSourceFinalPackClosure(holder, token, invocation) {
  sourceFinalOwnerCloseInput(holder, token);
  return assertSourceCpPackClosureForFinalOwner(holder, invocation);
}
async function sourceOriginalInstallCleanupCatalog(holder) {
  const owner = sourceOriginalOwner(holder), state = owner.preparedInstall;
  if (!state?.completed) sourceOriginalFailure('FINAL_INSTALL_NOT_COMPLETE');
  if (!state.componentStage) return [];
  const context = sourceOriginalCpContexts.get(state.cpInventoryContext);
  if (!context || context.owner !== owner || context.stage !== state.componentStage
    || context.invocation !== state.packInvocation || context.firstFailure !== null
    || !sameSourceOriginalStat(context.parentStat, await fs.lstat(path.dirname(context.stage), { bigint: true }))) sourceOriginalFailure('FINAL_INSTALL_STAGE_NOT_OWNED');
  await assertSourceCpPackClosureForFinalOwner(holder, state.packInvocation);
  const files = await state.packInvocation;
  const rows = files.map(file => {
    const row = owner.operationReaders.find(candidate => candidate.path === file.sourcePath
      && candidate.bytes === file.bytes && candidate.sha256 === file.sha256);
    if (!row || file.sourcePath !== path.join(context.stage, file.relativePath)) sourceOriginalFailure('FINAL_INSTALL_STAGE_INVENTORY_CHANGED');
    return row;
  });
  if (!context.stageIdentity) sourceOriginalFailure('FINAL_INSTALL_STAGE_IDENTITY_UNPROVED');
  const catalogs = [await sourceFinalOwnedCatalog(context.stage, context.stageIdentity, rows)];
  for (const phase of owner.cpInventoryPhases ?? []) {
    if (!phase.completed || phase.firstFailure !== null || phase.context.owner !== owner
      || phase.fdRows.some(row => !row.closed || row.firstFailure !== null)) sourceOriginalFailure('FINAL_CP_SUBTREE_ACK_UNAVAILABLE');
    const row = await openSourceOutputRow(owner, phase.input.outputDirectory,
      path.join(phase.input.outputDirectory, 'inventory.json'), { bytes: phase.rawBytes, sha256: phase.rawSha256 });
    if (!sameSourceOriginalStat(row.stat, phase.output.stat, true)) sourceOriginalFailure('FINAL_CP_OUTPUT_CHANGED');
    catalogs.push(await sourceFinalOwnedCatalog(phase.input.outputDirectory, phase.outputDirectory.stat, [row]));
  }
  return catalogs;
}

// Fixed normal S -> U -> H71 consumer. The INSTALL reference derives holder;
// neither U's transport JSON nor its Promise can issue a SOURCE owner.
const sourceProgressUnionPhases = new WeakMap();
const sourceProgressUnionResults = new WeakMap();
async function assertSourceProgressUnionState(phase) {
  const reference = sourceProgressInstalledComponentReferences.get(phase.reference);
  const owner = sourceOriginalOwner(phase.holder), issued = assertPrivateSourceJobDeadline(phase.holder);
  if (!reference || reference.owner !== owner || reference.holder !== phase.holder || !reference.claimed
    || owner !== phase.owner || phase.firstFailure !== null || owner.workingGeneration
    || issued.normalPrelude?.normalProgress !== reference.progress || reference.progress.pending !== true
    || sourceProgressUnionPhases.get(phase.invocation) !== phase) sourceOriginalFailure('PROGRESS_UNION_OWNER_CHANGED');
  await assertSourceProgressInstalledComponentReference(phase.reference);
  const source = await import('./weather-component-progress-cache.mjs');
  const union = await import('./lib/verified-protected-progress-components.mjs');
  const input = await source.sourceProgressUnionContextInput(phase.holder,phase.invocation);
  const consumer = union.sourceProgressUnionConsumerInput(phase.invocation);
  if (input.installedReference !== phase.reference || input.binding !== owner.progressBinding
    || input.root !== reference.binding.repositoryRoot || input.invocation !== phase.invocation
    || input.packInvocation !== input.catalog.invocation || input.packContext !== input.catalog.context
    || input.catalog.root !== input.input.verifiedRoot || input.temporary.folder !== input.input.temporaryDirectory
    || consumer.installedReference !== phase.reference || consumer.progressFiles !== input.input.files
    || consumer.completeFiles !== reference.files || consumer.root !== input.root
    || consumer.progressVerifiedRoot !== input.catalog.root || consumer.temporaryDirectory !== input.temporary.folder
    || sourceNormalUtcHour(consumer.productionReferenceAt) !== reference.target
    || sourceNormalUtcHour(input.resume.target) !== reference.target
    || reference.lockedTarget !== issued.normalPrelude.productionTarget
    || phase.sourceInput && phase.sourceInput !== input || phase.consumerInput && phase.consumerInput !== consumer) {
    sourceOriginalFailure('PROGRESS_UNION_SOURCE_CHANGED');
  }
  await assertSourceCpPackClosureForFinalOwner(phase.holder,input.packInvocation);
  const cp = sourceOriginalCpInvocations.get(input.packInvocation);
  if (!cp || cp.owner !== owner || sourceProgressCpContexts.get(input.packContext) !== cp
    || cp.state.kind !== 'progress' || cp.input.temporary !== input.temporary
    || cp.state.packInvocation !== input.packInvocation || cp.stageIdentity !== input.catalog.rootIdentity) {
    sourceOriginalFailure('PROGRESS_UNION_PACK_NOT_OWNED');
  }
  phase.sourceInput = input; phase.consumerInput = consumer;
  return reference;
}
async function beginSourceProgressUnionPhase(holder, invocation) {
  const phase = sourceProgressUnionPhases.get(invocation);
  if (!phase || phase.holder !== holder || phase.started || process.platform !== 'linux'
    || process.versions.node.split('.')[0] !== '24') sourceOriginalFailure('PROGRESS_UNION_NOT_AVAILABLE');
  phase.started = true;
  try {
    const reference = await assertSourceProgressUnionState(phase), input = phase.sourceInput;
    const project = file => ({relativePath:file.relativePath,bytes:file.bytes,sha256:file.sha256});
    const capsule = Buffer.from(JSON.stringify({schemaVersion:1,kind:'SOURCE_PROGRESS_UNION_INPUT',
      target:reference.lockedTarget,productionReferenceAt:reference.target,
      progress:input.files.map(project),complete:reference.files.map(project)})+'\n');
    if (capsule.length > 32*1024*1024) sourceOriginalFailure('PROGRESS_UNION_INPUT_TOO_LARGE');
    phase.capsuleBytes = capsule.length; phase.capsuleSha256 = sha256(capsule);
    phase.outputPath = path.join(input.temporary.folder,'source-union');
    phase.capsulePath = path.join(input.temporary.folder,'source-union-input.json');
    phase.outputBirth = null; // Retain a failed/uncertain mkdir; never adopt an existing target.
    await fs.mkdir(phase.outputPath,{mode:0o700});
    const born = await fs.lstat(phase.outputPath,{bigint:true});
    if (!born.isDirectory() || born.isSymbolicLink() || await fs.realpath(phase.outputPath) !== phase.outputPath) sourceOriginalFailure('PROGRESS_UNION_BIRTH_UNPROVED');
    phase.outputBirth = Object.freeze({dev:born.dev,ino:born.ino,mode:born.mode,nlink:born.nlink});
    const writer = {handle:null,stat:null,directory:false,firstFailure:null,closeAttempted:false,closed:false};
    phase.capsuleWriter = writer;
    writer.handle = await fs.open(phase.capsulePath,sourceOriginalFsConstants.O_RDWR | sourceOriginalFsConstants.O_CREAT
      | sourceOriginalFsConstants.O_EXCL | sourceOriginalFsConstants.O_NOFOLLOW,0o600);
    const created = await writer.handle.stat({bigint:true});
    writer.birth=Object.freeze({dev:created.dev,ino:created.ino,mode:created.mode,nlink:created.nlink,size:created.size});
    if (!created.isFile() || created.nlink !== 1n || created.size !== 0n) sourceOriginalFailure('PROGRESS_UNION_CAPSULE_INVALID');
    let position = 0;
    while(position<capsule.length) { sourceOriginalOwner(holder); const r=await writer.handle.write(capsule,position,capsule.length-position,position);
      if(!r.bytesWritten) sourceOriginalFailure('PROGRESS_UNION_CAPSULE_SHORT_WRITE'); position+=r.bytesWritten; }
    await writer.handle.sync(); writer.stat=await writer.handle.stat({bigint:true});
    if (!sameSourceOriginalStat(created,writer.stat) || writer.stat.nlink !== 1n
      || writer.stat.size !== BigInt(capsule.length)) sourceOriginalFailure('PROGRESS_UNION_CAPSULE_CHANGED');
    await closeSourceFinalReader(writer,writer);
    phase.capsule = await openSourceCpInventoryDescriptor(phase,phase.capsulePath,false);
    phase.repository = await openSourceCpInventoryDescriptor(phase,input.root,true);
    phase.outputDirectory = await openSourceCpInventoryDescriptor(phase,phase.outputPath,true);
    phase.progressDirectory = await openSourceCpInventoryDescriptor(phase,input.catalog.root,true);
    if (!sameSourceOriginalStat(phase.outputBirth,phase.outputDirectory.stat)
      || !sameSourceOriginalStat(input.catalog.rootIdentity,phase.progressDirectory.stat)
      || (await fs.readdir(phase.outputPath)).length) sourceOriginalFailure('PROGRESS_UNION_FD_CHANGED');
    const raw=await sourceCpInventoryRowBytes(phase,phase.capsule,32*1024*1024);
    if(raw.length!==capsule.length || sha256(raw)!==phase.capsuleSha256) sourceOriginalFailure('PROGRESS_UNION_CAPSULE_CHANGED');
    return phase;
  } catch(error) { phase.firstFailure ??= [error]; throw keepSourceOriginalFailure(phase.owner,phase.firstFailure[0]); }
}
function sourceProgressUnionRelative(value) {
  return typeof value==='string' && value.length>0 && !value.includes('\\') && !value.includes('\0')
    && value.split('/').every(part=>part && part!=='.' && part!=='..') && !path.isAbsolute(value);
}
async function sourceProgressUnionBirthCatalog(phase, raw, value) {
  if(!raw.length || raw.at(-1)!==10 || raw.length>32*1024*1024) sourceOriginalFailure('PROGRESS_UNION_BIRTH_FORMAT_INVALID');
  const lines=raw.toString('utf8').split('\n'); lines.pop();
  if(lines.length<2 || lines.length>393216 || lines.some(line=>!line || Buffer.byteLength(line)>8192)) sourceOriginalFailure('PROGRESS_UNION_BIRTH_FORMAT_INVALID');
  const records=lines.map(line=>JSON.parse(line)), bornFiles=new Map(), closedFiles=new Map(), directories=new Map(), children=new Map();
  const header=records[0], terminal=records.at(-1), exact=(row,fields)=>Object.keys(row).sort().join(',')===fields.split(',').sort().join(',');
  if(!exact(header,'schemaVersion,actor,pid,event,parent,root,journal') || header.event!=='header' || header.actor!=='node'
    || !Number.isSafeInteger(header.pid) || header.pid<1 || header.parent!==phase.child?.pid
    || !exact(terminal,'schemaVersion,actor,pid,event') || terminal.event!=='worker-complete'
    || terminal.actor!=='node' || terminal.pid!==header.pid) sourceOriginalFailure('PROGRESS_UNION_BIRTH_WORKER_INVALID');
  const id=(value,directory=false)=>value && exact(value,'dev,ino,mode,nlink,size,mtimeNs,ctimeNs')
    && Object.values(value).every(v=>typeof v==='string' && /^(?:0|[1-9][0-9]*)$/.test(v))
    && (BigInt(value.mode)&0o170000n)===(directory?0o040000n:0o100000n)
    && (directory || value.nlink==='1');
  if(!id(header.journal) || header.journal.size!=='0' || !id(header.root,true)
    || ['dev','ino','mode'].some(k=>header.root[k]!==String(phase.outputBirth[k]))
    || ['dev','ino','mode','nlink','size'].some(k=>header.journal[k]!==String(phase.hJournalBirth[k]))) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHANGED');
  for(const row of records) if(row.schemaVersion!==1) sourceOriginalFailure('PROGRESS_UNION_BIRTH_SCHEMA_INVALID');
  for(const row of records.slice(1,-1)) {
    if(!['node','python'].includes(row.actor) || !Number.isSafeInteger(row.pid) || row.pid<1) sourceOriginalFailure('PROGRESS_UNION_BIRTH_ACTOR_INVALID');
    if(row.actor==='node' && row.pid!==header.pid) sourceOriginalFailure('PROGRESS_UNION_BIRTH_ACTOR_INVALID');
    if(row.event==='child-start' || row.event==='child-complete') {
      if(!exact(row,'schemaVersion,actor,pid,event') || row.actor!=='python') sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHILD_INVALID');
      const child=children.get(row.pid);
      if(row.event==='child-start') { if(child) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHILD_REUSED'); children.set(row.pid,{closed:false}); }
      else { if(!child || child.closed) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHILD_UNPROVED'); child.closed=true; }
      continue;
    }
    if(row.actor==='python' && (!children.has(row.pid) || children.get(row.pid).closed)) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHILD_UNPROVED');
    if(!sourceProgressUnionRelative(row.relative) || ['union-result.json','union-birth.jsonl'].includes(row.relative)) sourceOriginalFailure('PROGRESS_UNION_BIRTH_PATH_INVALID');
    if(row.event==='directory-born') {
      if(!exact(row,'schemaVersion,actor,pid,event,relative,identity') || !id(row.identity,true)
        || directories.has(row.relative) || bornFiles.has(row.relative)) sourceOriginalFailure('PROGRESS_UNION_BIRTH_DIRECTORY_INVALID');
      directories.set(row.relative,row); continue;
    }
    if(row.event==='file-born') {
      if(!exact(row,'schemaVersion,actor,pid,event,relative,identity') || !id(row.identity) || row.identity.size!=='0'
        || bornFiles.has(row.relative) || directories.has(row.relative)) sourceOriginalFailure('PROGRESS_UNION_BIRTH_FILE_INVALID');
      bornFiles.set(row.relative,row); continue;
    }
    if(row.event==='file-closed') {
      const born=bornFiles.get(row.relative);
      if(!exact(row,'schemaVersion,actor,pid,event,relative,identity,bytes,sha256') || !id(row.identity)
        || !born || closedFiles.has(row.relative) || born.actor!==row.actor || born.pid!==row.pid
        || ['dev','ino','mode','nlink'].some(k=>born.identity[k]!==row.identity[k])
        || !Number.isSafeInteger(row.bytes) || row.bytes<0 || String(row.bytes)!==row.identity.size
        || !/^[0-9a-f]{64}$/.test(row.sha256)) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CLOSE_INVALID');
      closedFiles.set(row.relative,row); continue;
    }
    sourceOriginalFailure('PROGRESS_UNION_BIRTH_EVENT_INVALID');
  }
  if([...children.values()].some(row=>!row.closed) || bornFiles.size!==closedFiles.size
    || !value?.catalog || closedFiles.size!==value.catalog.files.length
    || directories.size!==value.catalog.directories.length-1) sourceOriginalFailure('PROGRESS_UNION_BIRTH_INCOMPLETE');
  for(const row of value.catalog.files) {
    const closed=closedFiles.get(row.relative);
    if(!closed || closed.bytes!==row.bytes || closed.sha256!==row.sha256
      || Object.keys(closed.identity).some(k=>closed.identity[k]!==row.identity?.[k])) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CATALOG_CHANGED');
  }
  for(const row of value.catalog.directories) {
    const born=row.relative===''?{identity:header.root}:directories.get(row.relative);
    if(!born || ['dev','ino','mode'].some(k=>born.identity[k]!==row.identity?.[k])) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CATALOG_CHANGED');
  }
  // These records are admitted only after H's actual cohort/FD/nonce result;
  // they are never a caller-supplied issuer or an independent stop receipt.
  phase.birthCatalog=Object.freeze({files:closedFiles,directories,bornFiles,header});
}

async function sourceProgressUnionCatalog(phase, value) {
  if (!value || !Array.isArray(value.files) || !Array.isArray(value.directories)
    || value.files.length>131072 || value.directories.length>131072) sourceOriginalFailure('PROGRESS_UNION_CATALOG_INVALID');
  const files = new Map(value.files.map(row=>[row.relative,row])), directories=new Map(value.directories.map(row=>[row.relative,row]));
  if(files.size!==value.files.length || directories.size!==value.directories.length || !directories.has('')
    || files.has('union-result.json') || files.has('union-birth.jsonl') || files.keys().some(relative=>!sourceProgressUnionRelative(relative))) sourceOriginalFailure('PROGRESS_UNION_CATALOG_INVALID');
  const seenFiles=new Set(),seenDirectories=new Set();
  async function visit(relative) {
    const target=path.join(phase.outputPath,relative), actual=await fs.lstat(target,{bigint:true}), row=directories.get(relative);
    if (!row || !actual.isDirectory() || actual.isSymbolicLink() || await fs.realpath(target)!==target
      || ['dev','ino','mode'].some(k=>String(actual[k])!==row.identity?.[k])) sourceOriginalFailure('PROGRESS_UNION_DIRECTORY_CHANGED');
    seenDirectories.add(relative);
    for(const item of await fs.readdir(target,{withFileTypes:true})) {
      const child=relative?relative+'/'+item.name:item.name;
      if(child==='union-result.json' || child==='union-birth.jsonl') continue;
      if(item.isDirectory()) await visit(child);
      else if(item.isFile()) { if(!files.has(child)) sourceOriginalFailure('PROGRESS_UNION_CATALOG_CHANGED'); seenFiles.add(child); }
      else sourceOriginalFailure('PROGRESS_UNION_CATALOG_CHANGED');
    }
  }
  if(!sameSourceOriginalStat(phase.outputBirth,await fs.lstat(phase.outputPath,{bigint:true}))) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHANGED');
  await visit('');
  if(seenFiles.size!==files.size || seenDirectories.size!==directories.size) sourceOriginalFailure('PROGRESS_UNION_CATALOG_CHANGED');
  const owned=new Map();
  for(const [relative,expected] of files) {
    if(!Number.isSafeInteger(expected.bytes) || expected.bytes<0 || !/^[0-9a-f]{64}$/.test(expected.sha256??'')) sourceOriginalFailure('PROGRESS_UNION_FILE_INVALID');
    const row=await openSourceCpInventoryDescriptor(phase,path.join(phase.outputPath,relative),false);
    const actual=await sourceCpInventoryRowBytes(phase,row,Number.MAX_SAFE_INTEGER,false);
    if(actual.bytes!==expected.bytes || actual.sha256!==expected.sha256
      || ['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].some(k=>String(row.stat[k])!==expected.identity?.[k])) sourceOriginalFailure('PROGRESS_UNION_FILE_CHANGED');
    owned.set(relative,Object.freeze({path:row.path,bytes:actual.bytes,sha256:actual.sha256,
      identity:Object.freeze(Object.fromEntries(['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].map(k=>[k,row.stat[k]])))}));
    await closeSourceFinalReader(row,row);
  }
  return owned;
}
async function finishSourceProgressUnionPhase(holder,phase) {
  try {
    const reference=await assertSourceProgressUnionState(phase), out=phase.result?.outputs;
    if(!phase.transportClosed || !phase.controlCloseObserved || phase.controlCloseFailure!==null
      || phase.completed || phase.result?.exitCode!==0
      || !out || Object.keys(out).sort().join(',')!==['union_catalog_count','union_input_sha256','union_output_count',
        'union_result_bytes','union_result_sha256','union_result_birth_dev','union_result_birth_ino',
        'union_result_birth_mode','union_result_birth_nlink','union_result_birth_size','union_birth_sha256',
        'union_birth_bytes','union_birth_dev','union_birth_ino','union_birth_mode','union_birth_nlink','union_birth_size'].sort().join(',')
      || out.union_input_sha256!==phase.capsuleSha256 || !/^[0-9a-f]{64}$/.test(out.union_result_sha256??'')
      || !/^[1-9][0-9]*$/.test(out.union_result_bytes??'') || Number(out.union_result_bytes)>32*1024*1024) sourceOriginalFailure('PROGRESS_UNION_CLOSURE_UNPROVED');
    const capsule=await sourceCpInventoryRowBytes(phase,phase.capsule,32*1024*1024);
    if(capsule.length!==phase.capsuleBytes || sha256(capsule)!==phase.capsuleSha256) sourceOriginalFailure('PROGRESS_UNION_INPUT_CHANGED');
    phase.report=await openSourceCpInventoryDescriptor(phase,path.join(phase.outputPath,'union-result.json'),false);
    const raw=await sourceCpInventoryRowBytes(phase,phase.report,32*1024*1024);
    if(out.union_result_birth_size!=='0' || ['dev','ino','mode','nlink'].some(key=>String(phase.report.stat[key])!==out['union_result_birth_'+key])) sourceOriginalFailure('PROGRESS_UNION_H_BIRTH_CHANGED');
    phase.hResultBirth=Object.freeze({creator:'H71',dev:phase.report.stat.dev,ino:phase.report.stat.ino,
      mode:phase.report.stat.mode,nlink:phase.report.stat.nlink,size:0n});
    if(raw.length!==Number(out.union_result_bytes) || sha256(raw)!==out.union_result_sha256) sourceOriginalFailure('PROGRESS_UNION_RESULT_CHANGED');
    const value=JSON.parse(raw);
    if(value?.kind!=='SOURCE_PROGRESS_UNION_RESULT' || value.schemaVersion!==1 || value.target!==reference.lockedTarget
      || !Array.isArray(value.outputs) || String(value.outputs.length)!==out.union_output_count
      || String(value.catalog?.files?.length)!==out.union_catalog_count || !value.result || Array.isArray(value.result)
      || Object.hasOwn(value.result,'files')) sourceOriginalFailure('PROGRESS_UNION_RESULT_INVALID');
    phase.journal=await openSourceCpInventoryDescriptor(phase,path.join(phase.outputPath,'union-birth.jsonl'),false);
    const journalRaw=await sourceCpInventoryRowBytes(phase,phase.journal,32*1024*1024);
    if(out.union_birth_size!=='0' || !/^[1-9][0-9]*$/.test(out.union_birth_bytes??'')
      || journalRaw.length!==Number(out.union_birth_bytes) || sha256(journalRaw)!==out.union_birth_sha256
      || ['dev','ino','mode','nlink'].some(key=>String(phase.journal.stat[key])!==out['union_birth_'+key])) sourceOriginalFailure('PROGRESS_UNION_H_BIRTH_CHANGED');
    phase.hJournalBirth=Object.freeze({creator:'H71',dev:phase.journal.stat.dev,ino:phase.journal.stat.ino,mode:phase.journal.stat.mode,nlink:phase.journal.stat.nlink,size:0n});
    await sourceProgressUnionBirthCatalog(phase,journalRaw,value);
    phase.journalDigest=sha256(journalRaw); phase.journalBytes=journalRaw.length;
    const catalog=await sourceProgressUnionCatalog(phase,value.catalog), outputs=[], files=[];
    const extras=Object.values((await import('./lib/private-weather-progress-files.mjs')).PRIVATE_WEATHER_PROGRESS_ONLY_FILES);
    for(const file of value.outputs) {
      if(!file || Object.keys(file).sort().join(',')!=='bytes,relative,relativePath,root,sha256'
        || !(Object.values(PRIVATE_WEATHER_COMPONENT_FILES).includes(file.relativePath) || extras.includes(file.relativePath)
          || sourceCpOriginalPath(file.relativePath)) || !sourceProgressUnionRelative(file.relative)
        || !['progress','output'].includes(file.root)) sourceOriginalFailure('PROGRESS_UNION_OUTPUT_INVALID');
      let expected;
      if(file.root==='progress') {
        expected=phase.sourceInput.files.find(row=>row.relativePath===file.relativePath
          && row.sourcePath===path.join(phase.sourceInput.catalog.root,file.relative));
        if(expected) expected={...expected,path:expected.sourcePath};
      } else expected=catalog.get(file.relative);
      if(!expected || expected.bytes!==file.bytes || expected.sha256!==file.sha256) sourceOriginalFailure('PROGRESS_UNION_OUTPUT_CHANGED');
      outputs.push(Object.freeze({path:expected.path,bytes:file.bytes,sha256:file.sha256,...(expected.identity?{identity:expected.identity}:{})}));
      files.push(Object.freeze({relativePath:file.relativePath,sourcePath:expected.path,bytes:file.bytes,sha256:file.sha256}));
    }
    if(new Set(files.map(f=>f.relativePath)).size!==files.length || new Set(outputs.map(f=>f.path)).size!==outputs.length) sourceOriginalFailure('PROGRESS_UNION_OUTPUT_DUPLICATE');
    phase.owned=Object.freeze({outputs:Object.freeze(outputs),result:freezeSourceOriginalMetadata({...value.result,files:Object.freeze(files)})});
    phase.catalog=value.catalog; phase.resultDigest=sha256(raw); phase.resultBytes=raw.length;
    for(const row of phase.fdRows) if(!row.closed) {
      const actual=await row.handle.stat({bigint:true}),named=await fs.lstat(row.path,{bigint:true});
      if(!sameSourceOriginalStat(row.stat,actual,!row.directory) || !sameSourceOriginalStat(actual,named,!row.directory)
        || named.isSymbolicLink()) sourceOriginalFailure('PROGRESS_UNION_FD_CHANGED');
      row.stat=actual; await closeSourceFinalReader(row,row);
    }
    await assertSourceProgressUnionState(phase);
    const result=Object.freeze({}); sourceProgressUnionResults.set(result,phase);
    phase.proof=result; phase.completed=true;
  } catch(error) { phase.firstFailure ??= [error]; throw keepSourceOriginalFailure(phase.owner,phase.firstFailure[0]); }
}
export async function runSourceProgressUnionConsumer(reference,invocation) {
  const installed=sourceProgressInstalledComponentReferences.get(reference);
  const previous=sourceProgressUnionPhases.get(invocation);
  if(previous?.firstFailure!==null && previous?.firstFailure!==undefined) throw previous.firstFailure[0];
  if(!installed || sourceProgressUnionPhases.has(invocation)) sourceOriginalFailure('PROGRESS_UNION_REFERENCE_REQUIRED');
  const phase={holder:installed.holder,owner:installed.owner,reference,invocation,name:'progressUnion',firstFailure:null,
    started:false,completed:false,fdRows:[],sourceInput:null,consumerInput:null,cutoff:assertPrivateSourceJobDeadline(installed.holder).deadline};
  sourceProgressUnionPhases.set(invocation,phase);
  (installed.owner.progressUnionPhases??=[]).push(phase);
  try {
    await runSourceNormalProgram(installed.holder,invocation,'progressUnion');
    if(!phase.completed || !phase.proof) sourceOriginalFailure('PROGRESS_UNION_CLOSURE_UNPROVED');
    return phase.proof;
  } catch(error) { phase.firstFailure ??= [error]; throw keepSourceOriginalFailure(phase.owner,phase.firstFailure[0]); }
}
export async function assertSourceProgressUnionConsumerResult(invocation,result) {
  const phase=sourceProgressUnionResults.get(result);
  if(phase?.firstFailure!==null && phase?.firstFailure!==undefined) throw phase.firstFailure[0];
  if(!phase || sourceProgressUnionPhases.get(invocation)!==phase || phase.invocation!==invocation
    || phase.proof!==result || !phase.completed || phase.firstFailure!==null
    || !phase.transportClosed || !phase.controlCloseObserved || phase.controlCloseFailure!==null
    || phase.fdRows.some(row=>!row.closed || !row.closeAttempted || row.firstFailure!==null)) sourceOriginalFailure('PROGRESS_UNION_RESULT_NOT_OWNED');
  try {
    await assertSourceProgressUnionState(phase);
    const report=await openSourceCpInventoryDescriptor(phase,path.join(phase.outputPath,'union-result.json'),false);
    const raw=await sourceCpInventoryRowBytes(phase,report,32*1024*1024);
    if(raw.length!==phase.resultBytes || sha256(raw)!==phase.resultDigest) sourceOriginalFailure('PROGRESS_UNION_RESULT_CHANGED');
    await closeSourceFinalReader(report,report);
    const journal=await openSourceCpInventoryDescriptor(phase,path.join(phase.outputPath,'union-birth.jsonl'),false);
    const journalRaw=await sourceCpInventoryRowBytes(phase,journal,32*1024*1024);
    if(journalRaw.length!==phase.journalBytes || sha256(journalRaw)!==phase.journalDigest) sourceOriginalFailure('PROGRESS_UNION_BIRTH_CHANGED');
    await closeSourceFinalReader(journal,journal);
    const checked=await sourceProgressUnionCatalog(phase,phase.catalog);
    if(checked.size!==phase.catalog.files.length) sourceOriginalFailure('PROGRESS_UNION_CATALOG_CHANGED');
    return phase.owned;
  } catch(error) { phase.firstFailure ??= [error]; throw keepSourceOriginalFailure(phase.owner,phase.firstFailure[0]); }
}


async function beginSourceOriginalTargetRegistryPhase(holder, token) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (!issued.normalRoute?.request.checkpointOnly || issued.normalPrelude?.normalProgress?.pending !== true
    || owner.originalTargetRegistryPhase || owner.activeOperation || owner.workingGeneration) {
    sourceOriginalFailure('ORIGINAL_TARGET_NOT_AVAILABLE');
  }
  // Claim synchronously before any I/O. The normal validator's 180-second
  // bound is only tightened by this same job's already issued absolute cutoff.
  const phase = { holder, token, owner, name: 'originalTargetRegistry', firstFailure: null,
    completed: false, result: null, cutoff: Math.min(issued.deadline, performance.now() + 180_000) };
  owner.originalTargetRegistryPhase = phase;
  const progress = await import('./weather-component-progress-cache.mjs');
  phase.input = await progress.sourceOriginalTargetRegistryInput(holder, token);
  if (phase.input.selection.report.productionReferenceAt !== issued.normalPrelude.productionTarget
    || sourceNormalUtcHour(phase.input.selection.report.productionReferenceAt)
      !== sourceNormalUtcHour(issued.normalRoute.request.checkpointTargetHour)) {
    sourceOriginalFailure('ORIGINAL_TARGET_REQUEST_CHANGED');
  }
  await assertSourceOriginalProgress(holder);
  return phase;
}
export async function runSourceOriginalTargetRegistry(holder, token) {
  return runSourceNormalProgram(holder, token, 'originalTargetRegistry');
}
async function finishSourceOriginalTargetRegistryPhase(holder, phase) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (owner.originalTargetRegistryPhase !== phase || phase.holder !== holder || phase.completed
    || !phase.transportClosed || phase.firstFailure !== null || phase.result.exitCode !== 0
    || !issued.normalRoute.request.checkpointOnly || owner.activeOperation || owner.workingGeneration) {
    sourceOriginalFailure('ORIGINAL_TARGET_CLOSURE_UNPROVED');
  }
  const progress = await import('./weather-component-progress-cache.mjs');
  await progress.assertSourceOriginalTargetRegistryInput(holder, phase.token, phase.input);
  await assertSourceOriginalProgress(holder);
  phase.completed = true;
  return phase;
}

async function runSourceNormalProgram(holder, operation, name) {
  if(sourceRejectedPreviousRoutes.has(name))sourceOriginalFailure('ENTRY_PHASE_NOT_ADMITTED');
  const prelude = Object.hasOwn(sourcePreludeProgramCodes, name);
  if (prelude && operation !== null) sourceDeadlineFailure('SOURCE_PRELUDE_OPERATION_INVALID');
  const originalTarget = name === 'originalTargetRegistry', cpInventory = name === 'cpInventory';
  const progressUnion = name === 'progressUnion';
  const unionPhase = progressUnion ? await beginSourceProgressUnionPhase(holder,operation) : null;
  const cpPhase = cpInventory ? await beginSourceOriginalCpInventoryPhase(holder, operation) : null;
  const targetPhase = originalTarget ? await beginSourceOriginalTargetRegistryPhase(holder, operation) : null;
  const state = originalTarget ? { owner: targetPhase.owner,
    lockedTarget: targetPhase.input.selection.report.productionReferenceAt }
    : progressUnion ? {owner:unionPhase.owner,lockedTarget:assertPrivateSourceJobDeadline(holder).normalPrelude.productionTarget}
    : cpInventory ? { owner: cpPhase.owner, lockedTarget: assertPrivateSourceJobDeadline(holder).normalPrelude.productionTarget }
      : prelude ? sourceNormalPreludeState(holder) : sourceDmiWorkingState(holder, operation);
  const owner = prelude ? null : state.owner;
  const issued = assertPrivateSourceJobDeadline(holder);
  const code = prelude ? sourcePreludeProgramCodes[name] : sourceNormalProgramCodes[name];
  // These private fields must be set by the actual prelude/target producer,
  // not from environment step-completion strings or a supplied options object.
  if (!Number.isInteger(code) || !issued.normalRoute || !issued.normalPrelude
    || !state.lockedTarget || state.lockedTarget !== issued.normalPrelude.productionTarget
    || process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24') {
    sourceOriginalFailure('NORMAL_PROGRAM_NOT_AVAILABLE');
  }
  const phaseOperation = progressUnion ? unionPhase : cpInventory ? cpPhase : originalTarget ? targetPhase : prelude ? await beginSourcePreludePhase(holder, name)
    : await beginSourceNormalPhase(holder, operation, name);
  const phase = originalTarget || cpInventory || progressUnion || prelude ? phaseOperation : sourceNormalPhaseState(holder, operation, phaseOperation);
  phase.control = null; phase.received = Buffer.alloc(0); phase.transportClosed = false;
  phase.controlCloseRequested = false; phase.controlCloseObserved = false; phase.controlCloseFailure = null;
  const fail = error => {
    if (phase.firstFailure === null) phase.firstFailure = [error];
    requestSourceFailureTighten(state, phase, issued.deadline, phase.firstFailure[0]);
    return prelude ? retainSourcePreludeFailure(holder, phase, phase.firstFailure[0])
      : keepSourceOriginalFailure(owner, phase.firstFailure[0]);
  };
  try {
    if (!prelude && !originalTarget && !cpInventory && !progressUnion) await preserveSourceNormalPhase(holder, operation, phaseOperation);
    const fresh = assertPrivateSourceJobDeadline(holder);
    const parentCutoff = Math.min(phase.cutoff, fresh.deadline);
    if (!(parentCutoff > performance.now())) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
    const options = { target: state.lockedTarget, quick: issued.normalRoute.request.quick,
      extended: issued.normalRoute.request.extended, checkpointOnly: issued.normalRoute.request.checkpointOnly };
    const selected = Buffer.from(JSON.stringify(options), 'utf8');
    if (selected.length < 2 || selected.length > 4096) sourceOriginalFailure('NORMAL_SELECTION_INVALID');
    const selector = Buffer.alloc(5 + selected.length);
    selector[0] = code; selector.writeUInt32BE(selected.length, 1); selected.copy(selector, 5);
    const nonce = crypto.randomBytes(32), challenge = Buffer.alloc(80);
    challenge.write('RRSCG4C1', 0, 'ascii'); nonce.copy(challenge, 8);
    challenge.writeUInt32BE(process.pid, 40);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ID), 44);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ATTEMPT), 52);
    Buffer.from(issued.identity.GITHUB_SHA, 'hex').copy(challenge, 60);
    const targetEnvironment = originalTarget || cpInventory || progressUnion ? (await import('./lib/copernicus-offline-environment.mjs')).copernicusOfflineEnvironment() : process.env;
    const environment = Object.freeze({ ...targetEnvironment,
      ...(name === 'currentHistoryPlan' ? {
        RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: 'true',
        RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED: issued.normalPrelude.legacyBootstrap.statelessIntegratedRecovery ? 'true' : 'false',
      } : {}),
      ...(originalTarget || cpInventory || progressUnion ? { INPUT_OPERATION: 'source', GITHUB_RUN_ID: issued.identity.GITHUB_RUN_ID,
        GITHUB_RUN_ATTEMPT: issued.identity.GITHUB_RUN_ATTEMPT, GITHUB_SHA: issued.identity.GITHUB_SHA }
        : prelude ? sourcePreludeEnvironment(holder, name)
          : name === 'weather' ? sourceNormalWeatherEnvironment(holder)
          : name === 'rawCache' ? { INPUT_KEY: `dmi-grib-v4-Linux-${issued.normalCacheGeneration}-${issued.identity.GITHUB_RUN_ID}-${issued.identity.GITHUB_RUN_ATTEMPT}` } : {}) });
    const child = sourceCohortSpawn('python', ['-I', '-B',
      path.join(PRIVATE_RUNTIME_REPOSITORY_ROOT, 'scripts/lib/copernicus_component_process.py'),
      '--source-normal-program-cohort'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT,
      env: environment, stdio: progressUnion
        ? ['ignore','ignore','ignore','pipe',unionPhase.capsule.handle.fd,unionPhase.repository.handle.fd,
          unionPhase.outputDirectory.handle.fd,unionPhase.progressDirectory.handle.fd]
        : cpInventory
        ? ['ignore', 'ignore', 'ignore', 'pipe', phase.bank.handle.fd, phase.cache.handle.fd, phase.outputDirectory.handle.fd]
        : originalTarget
        ? ['ignore', 'ignore', 'ignore', 'pipe', phase.input.candidate.handle.fd,
          phase.input.registry.handle.fd, phase.input.directory.handle.fd]
        : ['ignore', 'inherit', 'inherit', 'pipe'] });
    phase.child = child; phase.control = child.stdio[3];
    if (!phase.control) sourceOriginalFailure('CHILD_CLOCK_PIPE_REQUIRED');
    const control = phase.control;
    control.once('close', () => { phase.controlCloseObserved = true; });
    await new Promise((resolve, reject) => {
      let step = 'anchor', timer;
      const rejectOwned = error => { clearTimeout(timer); reject(fail(error)); };
      child.on('error', rejectOwned); control.on('error', rejectOwned);
      control.on('data', chunk => {
        if (phase.firstFailure !== null) return;
        try {
          phase.received = Buffer.concat([phase.received, chunk]);
          if (phase.received.length > 56 + 48 + 45 + 4096) sourceOriginalFailure('NORMAL_FRAME_INVALID');
          for (;;) {
            const pending = phase.received;
            let length = step === 'anchor' ? 56 : step === 'bounded' ? 48 : 45;
            if (pending.length < length) return;
            if (!pending.subarray(8, 40).equals(nonce)) sourceOriginalFailure('NORMAL_FRAME_INVALID');
            if (step === 'anchor') {
              if (pending.length !== 56 || pending.toString('ascii', 0, 8) !== 'RRSCG4A1'
                || pending.readUInt32BE(40) !== child.pid || pending.readUInt32BE(44) !== process.pid) sourceOriginalFailure('CHILD_CLOCK_IDENTITY_CHANGED');
              const current = assertPrivateSourceJobDeadline(holder);
              phase.after = performance.now(); phase.anchor = pending.readBigUInt64BE(48);
              if (phase.before > phase.after || phase.after >= parentCutoff) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
              phase.childCutoff = sourceChildAbsoluteCutoff(Math.min(parentCutoff, current.deadline), phase.after, phase.anchor);
              phase.failureClock = Object.freeze({ nonce, phase: code, after: phase.after,
                anchor: phase.anchor, parentCutoff: Math.min(parentCutoff, current.deadline) });
              const frame = Buffer.alloc(56);
              frame.write('RRSCG4D1', 0, 'ascii'); nonce.copy(frame, 8);
              frame.writeBigUInt64BE(phase.childCutoff, 40); frame.writeBigUInt64BE(phase.childCutoff, 48);
              phase.received = pending.subarray(length); step = 'bounded';
              control.write(frame, error => { if (error) rejectOwned(error); });
            } else if (step === 'bounded') {
              if (pending.toString('ascii', 0, 8) !== 'RRSCG4B1'
                || pending.readBigUInt64BE(40) !== phase.childCutoff) sourceOriginalFailure('NORMAL_FRAME_INVALID');
              phase.received = pending.subarray(length); step = 'receipt';
              control.write(selector, error => { if (error) rejectOwned(error); });
            } else if (step === 'receipt') {
              if (pending.toString('ascii', 0, 8) !== 'RRSPG4E1' || pending[40] !== code) sourceOriginalFailure('NORMAL_FRAME_INVALID');
              const bodyLength = pending.readUInt32BE(41);
              if (bodyLength < 2 || bodyLength > 4096) sourceOriginalFailure('NORMAL_FRAME_INVALID');
              length += bodyLength;
              if (pending.length < length) return;
              phase.result = JSON.parse(pending.subarray(45, length).toString('utf8'));
              phase.received = pending.subarray(length); step = 'closing';
            } else sourceOriginalFailure('NORMAL_FRAME_INVALID');
          }
        } catch (error) { rejectOwned(error); }
      });
      control.on('end', () => {
        if (step !== 'closing' || phase.received.length) rejectOwned(new Error('SOURCE_NORMAL_PIPE_LOST'));
      });
      child.once('close', (exitCode, signal) => {
        clearTimeout(timer);
        if (phase.firstFailure !== null) { reject(phase.firstFailure[0]); return; }
        if (step !== 'closing' || phase.received.length || !phase.controlCloseObserved
          || exitCode !== 0 || signal !== null || performance.now() >= parentCutoff) {
          rejectOwned(new Error('SOURCE_NORMAL_COHORT_UNPROVED')); return;
        }
        resolve();
      });
      timer = setTimeout(() => rejectOwned(new Error('SOURCE_NORMAL_COHORT_UNPROVED')),
        Math.max(0, Math.ceil(parentCutoff - performance.now())));
      phase.before = performance.now();
      control.write(challenge, error => { if (error) rejectOwned(error); });
    });
    const result = phase.result;
    if (result?.schemaVersion !== 1 || result.kind !== 'SOURCE_NORMAL_PHASE_CLOSED' || result.phase !== code
      || !Number.isInteger(result.exitCode) || result.exitCode < 0 || result.exitCode > 255
      || !Number.isSafeInteger(result.outputBytes) || result.outputBytes < 0 || result.outputBytes > 131072
      || !/^[0-9a-f]{64}$/.test(result.outputSha256 ?? '') || !result.outputs
      || Array.isArray(result.outputs) || Object.values(result.outputs).some(value => typeof value !== 'string' || value.length > 256)) {
      sourceOriginalFailure('NORMAL_RECEIPT_INVALID');
    }
    phase.transportClosed = true;
    if (progressUnion) await finishSourceProgressUnionPhase(holder,phase);
    else if (cpInventory) await finishSourceOriginalCpInventoryPhase(holder, phase);
    else if (originalTarget) await finishSourceOriginalTargetRegistryPhase(holder, phase);
    else if (prelude) await finishSourcePreludePhase(holder, phase);
    else await finishSourceNormalGeneration(holder, operation, phaseOperation);
    return phase;
  } catch (error) { throw fail(error); }
}


function sourceNormalWeatherEnvironment(holder) {
  const issued = assertPrivateSourceJobDeadline(holder), owner = sourceOriginalOwner(holder);
  const route = issued.normalRoute, prelude = issued.normalPrelude;
  if (!route || !prelude || !owner.preparedInstall?.completed
    || !owner.workingOperation?.completed || !prelude.legacyBootstrap || !prelude.waveBootstrap) {
    sourceOriginalFailure('NORMAL_WEATHER_PRELUDE_REQUIRED');
  }
  const bootstrap = route.action === 'integrated-cutover' && prelude.legacyBootstrap.required;
  const historical = prelude.historicalTransition;
  return Object.freeze({
    DMI_PART_CONTINUITY_DONOR_PATH: prelude.continuityDonor?.path ?? '',
    RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION: prelude.legacyCurrentRequests?.required === true
      ? prelude.legacyCurrentRequests.expectationJson : '',
    NODE_OPTIONS: '--max-old-space-size=8192',
    RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE: 'true',
    DMI_BULK_CACHE_PATH: '.cache/dmi-candidate-progress.json',
    RAVRADAR_WEATHER_CACHE_ONLY: route.request.checkpointOnly ? 'true' : 'false',
    DMI_MAX_RETRIES: '0', DMI_REQUEST_GAP_MS: '12000', DMI_REQUEST_CONCURRENCY: '1',
    DMI_LIVE_ZONE_BUDGET: '4', DMI_REQUEST_BUDGET: '6', DMI_CACHE_REFRESH_BELOW_HOURS: '24',
    DMI_SCHEDULE_INTERVAL_MINUTES: '240', DMI_RETRY_JITTER_MIN_MS: '30000',
    DMI_RETRY_JITTER_MAX_MS: '180000', DMI_OBSERVATION_INTERVAL_MINUTES: '60',
    WEATHER_REQUEST_TIMEOUT_MS: '25000', DMI_OCEAN_REQUEST_TIMEOUT_MS: '60000',
    RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE: bootstrap ? prelude.waveBootstrap.mode : 'auto',
    RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED: bootstrap && prelude.waveBootstrap.sourceValidated ? 'true' : 'false',
    RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED:
      ['integrated', 'integrated-historical-maintenance'].includes(route.action)
        && prelude.legacyBootstrap.statelessIntegratedRecovery ? 'true' : 'false',
    RAVSCORE_HISTORICAL_WAVE_TRANSITION_PATH: historical?.required ? historical.path : '',
    RAVSCORE_CURRENT_TRACE_PATH: 'data/diagnostics/ravscore-current-input-stage-trace.json',
    RAVSCORE_CURRENT_TRACE_PART_IDS: 'dk-b04-07-national-part-02,dk-b04-07-national-part-05,dk-b05-12-national-part-01,dk-b05-17-national-part-03,dk-b05-17-national-part-02,dk-b05-17-national-part-04,dk-b05-18-national-part-02,dk-b05-18-national-part-03,dk-b05-18-national-part-05,dk-b05-20-owner-approved-01,dk-b09-06-national-part-06,dk-b10-23-national-part-01,dk-b12-03-national-part-05,dk-b12-06-national-part-02',
    RAVRADAR_COMPONENT_COPERNICUS_BUDGET_MS: route.request.quick ? '45000' : '90000',
    RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: route.request.quick ? '60000' : '90000',
  });
}

function sourceNormalUtcHour(value) {
  // Existing JS ISO and Python utc_iso spellings of the same whole UTC hour.
  // No shifted hour, permissive Date rollover or timezone alternative.
  if (typeof value !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:00:00(?:\.000)?Z$/.test(value)) {
    sourceOriginalFailure('NORMAL_HOUR_INVALID');
  }
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime()) || instant.toISOString().replace('.000Z', 'Z') !== value.replace('.000Z', 'Z')) {
    sourceOriginalFailure('NORMAL_HOUR_INVALID');
  }
  return instant.toISOString();
}
function sourceNormalWamSelection(holder) {
  const issued = assertPrivateSourceJobDeadline(holder), prelude = issued.normalPrelude;
  if (!issued.normalRoute || !prelude) sourceOriginalFailure('NORMAL_PRELUDE_REQUIRED');
  const historical = prelude.historicalTransition;
  const bootstrap = issued.normalRoute.action === 'integrated-cutover'
    && prelude.legacyBootstrap?.required === true && prelude.waveBootstrap;
  if (!historical?.required && !bootstrap) return null;
  const actual = historical?.required ? historical : prelude.waveBootstrap;
  if (!['candidate-g-migration', 'genuine-cold-start'].includes(actual.mode)) {
    sourceOriginalFailure('NORMAL_WAM_SELECTION_INVALID');
  }
  return Object.freeze({ mode: actual.mode, targetHour: sourceNormalUtcHour(actual.targetHour),
    productionTargetHour: sourceNormalUtcHour(prelude.productionTarget) });
}
async function prepareSourceNormalWam(holder, operation, phase) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const selection = sourceNormalWamSelection(holder);
  if (!selection || phase.selection !== 'wam' || phase.child || phase.wamRows) {
    sourceOriginalFailure('NORMAL_WAM_NOT_SELECTED');
  }
  const generation = await assertSourceNormalGeneration(holder, operation);
  const relative = [PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,
    'data/live/coastal-parts-v2.json', 'data/zones.geojson'];
  phase.wamRows = [];
  for (let index = 0; index < relative.length; index += 1) {
    const named = path.join(owner.context.repository, ...relative[index].split('/'));
    let row = generation.rows.find(value => value.path === named);
    if (index === 0 && !row) sourceOriginalFailure('NORMAL_WAM_CANDIDATE_NOT_OWNED');
    if (!row) row = await openSourceOutputRow(owner, owner.context.repository, named);
    phase.wamRows.push(row); // strong retention before the following read
    await hashSourceOriginalHandle(owner, row);
  }
  const inputs = phase.wamRows.map(row => Object.freeze({
    identity: Object.freeze([row.stat.dev, row.stat.ino, row.stat.size,
      row.stat.mtimeNs, row.stat.ctimeNs].map(value => String(value))), sha256: row.sha256,
  }));
  phase.wamSelection = Object.freeze({ ...selection, inputs: Object.freeze(inputs) });
  const bytes = Buffer.from(JSON.stringify(phase.wamSelection), 'utf8');
  if (bytes.length < 2 || bytes.length > 4096) sourceOriginalFailure('NORMAL_WAM_SELECTION_INVALID');
  const frame = Buffer.alloc(4 + bytes.length);
  frame.writeUInt32BE(bytes.length, 0); bytes.copy(frame, 4);
  phase.wamFrame = frame;
  await assertSourceNormalGeneration(holder, operation);
  sourceDmiWorkingState(holder, operation);
}
async function finishSourceNormalWam(holder, operation, phase) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const receipt = phase.receipt;
  if (receipt?.schemaVersion !== 1 || receipt.kind !== 'SOURCE_WAM_CONSUMED_INPUTS'
    || Object.keys(receipt).sort().join(',') !== 'attestation,inputs,kind,schemaVersion'
    || !phase.wamSelection || !same(receipt.inputs, phase.wamSelection.inputs)
    || !isPlainObject(receipt.attestation)) sourceOriginalFailure('NORMAL_WAM_ACK_INVALID');
  // This branch is reached only AFTER the normal transport's genuine H close,
  // drain and inherited-fd close. JSON alone cannot enter this function.
  for (const row of phase.wamRows) await hashSourceOriginalHandle(owner, row);
  await assertSourceNormalGeneration(holder, operation);
  sourceDmiWorkingState(holder, operation);
  const attestation = receipt.attestation;
  const valid = attestation.status === 'ok';
  if (!valid && (attestation.status !== 'invalid'
    || !/^[A-Z][A-Z0-9_]{2,63}$/.test(attestation.code ?? ''))) {
    sourceOriginalFailure('NORMAL_WAM_ACK_INVALID');
  }
  phase.receipt = freezeSourceOriginalMetadata(receipt);
  phase.wamOutcome = Object.freeze({ code: valid ? 'NONE' : attestation.code,
    historyIncomplete: valid && attestation.historyIncomplete === true,
    validatorSucceeded: valid });
  phase.completed = true;
  (state.savedPhases ??= new Map()).set('wam', phase);
  state.saveInFlight = null;
  return phase;
}

function sourceNormalDmiEnvironment(holder) {
  const issued = assertPrivateSourceJobDeadline(holder), route = issued.normalRoute;
  const prelude = issued.normalPrelude;
  if (!route || !prelude || prelude.preflight?.shouldRun !== true
    || prelude.handoff?.reused === true || !prelude.legacyBootstrap
    || !prelude.recovery || !prelude.historicalTransition) sourceOriginalFailure('NORMAL_DMI_PRELUDE_REQUIRED');
  const historical = prelude.historicalTransition.required === true;
  const bootstrap = route.action === 'integrated-cutover' && prelude.legacyBootstrap.required === true;
  const recovery = prelude.recovery.extended === true;
  const extended = route.request.extended || historical || recovery;
  const large = extended || bootstrap;
  const wave = sourceNormalWamSelection(holder);
  const counts = prelude.recovery.missingPairCountsJson;
  if (typeof counts !== 'string' || counts.length > 4096) sourceOriginalFailure('NORMAL_DMI_RECOVERY_INVALID');
  return Object.freeze({
    DMI_BULK_OUTPUT_PATH: '.cache/dmi-candidate-progress.json',
    DMI_BULK_PROMOTION_PATH: 'data/live/dmi-bulk-cache.json',
    DMI_BULK_PREFER_OUTPUT_CACHE: 'true', DMI_BULK_RETAIN_PREFERRED_NATIVE_RUN: 'false',
    DMI_BULK_CACHE_ONLY: route.request.checkpointOnly ? 'true' : 'false',
    DMI_BULK_CURRENT_HISTORY_DEMAND_PATH: prelude.currentHistoryPlan?.required === true
      ? '.cache/ravscore-current-history-demand.json' : '',
    DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH: prelude.legacyCurrentRequests?.required === true ? SOURCE_LEGACY_REQUEST : '',
    DMI_BULK_LEGACY_CURRENT_ORIGINAL_REQUEST_SHA256: prelude.legacyCurrentRequests?.required === true
      ? prelude.legacyCurrentRequests.requestsSha256 : '',
    DMI_BULK_DKSS_PRIMARY_MODE: 'true',
    DMI_BULK_CURRENT_ACQUISITION_PLAN_PATH: '.cache/weather-current-acquisition-plan.json',
    DMI_BULK_ADAPTIVE_RECOVERY: !route.request.quick && recovery ? 'true' : 'false',
    DMI_BULK_RECOVERY_BEFORE_COUNTS: counts,
    DMI_BULK_HOURS: '118', DMI_BULK_MAX_DOWNLOAD_MB: large ? '4096' : '2048',
    DMI_BULK_RAW_CACHE_MAX_MB: '4096',
    DMI_BULK_MAX_RUNTIME_SECONDS: route.request.quick ? '900' : extended ? '3600' : bootstrap ? '3000' : '1500',
    DMI_BULK_FINALIZE_RESERVE_SECONDS: route.request.quick ? '120' : large ? '180' : '120',
    DMI_BULK_MAX_ASSETS_PER_COLLECTION: '130', DMI_BULK_TIME_STRIDE_HOURS: '3',
    DMI_BULK_COLLECTIONS_PER_RUN: large ? '6' : '3', DMI_BULK_REQUEST_TIMEOUT_SECONDS: '90',
    DMI_BULK_ASSET_PROCESSING_TIMEOUT_SECONDS: '180', DMI_BULK_HARMONIE_ASSET_TIMEOUT_SECONDS: '180',
    DMI_BULK_SUPERVISED_FINALIZE_TIMEOUT_SECONDS: '420', DMI_BULK_REFRESH_MINUTES: '60',
    DMI_BULK_COMPLETE_HORIZON_HOURS: '96',
    DMI_BULK_FORCE_REFRESH: prelude.preflight.dmiChanged === true || historical || recovery || bootstrap ? 'true' : 'false',
    DMI_BULK_RAW_DIR: '.cache/dmi-grib', DMI_BULK_DEPLOYED_FALLBACK_PATH: '.cache/dmi-active-complete.json',
    DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE: bootstrap ? prelude.waveBootstrap.mode
      : historical ? prelude.historicalTransition.mode : 'none',
    DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR: wave?.targetHour
      ?? prelude.waveBootstrap?.targetHour ?? prelude.productionTarget,
    COASTAL_POINT_STAGE_PATH: '.cache/coastal-point-staging/dmi.json',
    CURRENT_FIELD_SHADOW_PATH: '.cache/current-field-shadow.json',
    CURRENT_FIELD_SHADOW_PARTS_PER_RUN: '15', CURRENT_FIELD_SHADOW_REPLAY_ASSETS_PER_COLLECTION: '5',
    CURRENT_FIELD_SHADOW_BOOTSTRAP_DOWNLOADS_PER_RUN: '3',
  });
}
function classifySourceNormalDmi(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), observed = state.result;
  if (!state.outputGeneration || !state.controlCloseObserved || !observed
    || observed.output?.kind !== 'SOURCE_DMI_PHASE_CLOSED') sourceOriginalFailure('DMI_OUTCOME_NOT_OBSERVED');
  const values = observed.output.outputs;
  const code = /^[A-Z][A-Z0-9_]{2,63}$/.test(values.terminal_code ?? '')
    ? values.terminal_code : 'DMI_UNCLASSIFIED';
  return Object.freeze({ code, ready: observed.returncode === 0 && code === 'DMI_READY'
    && values.strict_current_anchor_ready === 'true'
    && ['ok', 'partial', 'fresh-bulk-cache'].includes(values.status),
    candidatePromoted: values.candidate_promoted === 'true',
    strictCurrentAnchorReady: values.strict_current_anchor_ready === 'true' });
}

function sourceNormalClosedFailure(state, name, code) {
  const failure = new Error('SOURCE_NORMAL_PHASE_FAILED');
  Object.defineProperties(failure, { sourcePhase: { value: name }, sourceCode: { value: code } });
  state.firstNormalFailure ??= [failure];
  return state.firstNormalFailure[0];
}
async function runSourceRequiredProgram(holder, operation, name) {
  const phase = await runSourceNormalProgram(holder, operation, name);
  if (phase.result.exitCode !== 0) throw sourceNormalClosedFailure(
    sourceDmiWorkingState(holder, operation), name, phase.result.exitCode);
  return phase;
}
async function runSourceNormalAdvisory(holder, operation) {
  const phase = await runSourceNormalProgram(holder, operation, 'advisory');
  if (phase.result.exitCode !== 0) {
    // Exactly the normal optional-plan fallback: remove only the fixed working
    // advisory copy, AFTER preserving its old inode and actual child drain.
    await runSourceRequiredProgram(holder, operation, 'advisoryRemove');
  }
}
async function runSourceMaintainedActiveSnapshot(holder, operation, terminal) {
  if (!terminal.ready || !terminal.candidatePromoted) return;
  await runSourceRequiredProgram(holder, operation, 'activeReady');
  await runSourceRequiredProgram(holder, operation, 'activePairs');
  await runSourceRequiredProgram(holder, operation, 'activeCopy');
  await runSourceRequiredProgram(holder, operation, 'activePromote');
}
async function bindSourceNormalSealedCipher(holder, operation, phase) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  if (!phase.completed || phase.name !== 'seal' || phase.result.exitCode !== 0
    || phase.result.outputs.saved !== 'true' || phase.outputGeneration !== state.normalGeneration) {
    sourceOriginalFailure('NORMAL_SEAL_NOT_SAVED');
  }
  const named = path.join(owner.context.repository, '.cache/weather-private-progress.encrypted');
  const row = phase.outputGeneration.rows.find(item => item.path === named);
  const bytes = Number(phase.result.outputs.encrypted_bytes);
  if (!row || !Number.isSafeInteger(bytes) || bytes <= 0 || bytes !== row.bytes) {
    sourceOriginalFailure('NORMAL_SEAL_BYTES_CHANGED');
  }
  await hashSourceOriginalHandle(owner, row);
  await assertSourceNormalGeneration(holder, operation);
  sourceDmiWorkingState(holder, operation);
  // Actual normal seal result + exact same final ciphertext row; the later
  // fixed upload ACK must report precisely these bytes/hash. Not remote SAVE.
  state.sealedCipher = Object.freeze({ row, bytes: row.bytes, sha256: row.sha256 });
}
async function sourceNormalTemporary(holder) {
  const issued = assertPrivateSourceJobDeadline(holder);
  const named = process.env.RUNNER_TEMP;
  if (typeof named !== 'string' || !path.isAbsolute(named) || path.resolve(named) !== named
    || await fs.realpath(named) !== named) sourceOriginalFailure('NORMAL_TEMP_INVALID');
  const stat = await fs.lstat(named, { bigint: true });
  if (!stat.isDirectory() || stat.isSymbolicLink()) sourceOriginalFailure('NORMAL_TEMP_INVALID');
  if (issued.normalTemporary) {
    if (issued.normalTemporary.path !== named || !sameSourceOriginalStat(issued.normalTemporary.stat, stat)) {
      sourceOriginalFailure('NORMAL_TEMP_CHANGED');
    }
  } else issued.normalTemporary = Object.freeze({ path: named, stat });
  assertPrivateSourceJobDeadline(holder);
  return issued.normalTemporary;
}
async function captureSourceNormalProgressBase(holder) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (!issued.normalPrelude || owner.activeOperation || owner.normalBase
    || !owner.preparedInstall?.completed) sourceOriginalFailure('NORMAL_BASE_NOT_AVAILABLE');
  const binding = await assertSourceOriginalProgress(holder);
  const conditions = owner.workingReaders.find(row => row.path
    === path.join(owner.context.repository, 'data/live/conditions.json'));
  if (!conditions || conditions.sha256 !== binding.baselineSha256) sourceOriginalFailure('NORMAL_BASE_CHANGED');
  await hashSourceOriginalHandle(owner, conditions);
  const temporary = await sourceNormalTemporary(holder);
  const named = path.join(temporary.path, 'weather-progress-base.json');
  // This is precisely the existing normal base schema, not a completion,
  // attestation or a relabelled original. No caller can supply any field.
  const bytes = Buffer.from(JSON.stringify({ kind: 'RAVRADAR_WEATHER_PRIVATE_PROGRESS_ONLY',
    schemaVersion: 1, repository: binding.repository, baselineSha256: binding.baselineSha256,
    protectedBundleContentSha256: binding.protectedBundleContentSha256 }) + '\n', 'utf8');
  const state = { path: named, handle: null, stat: null, bytes: bytes.length,
    sha256: sha256(bytes), directories: [{ path: temporary.path, stat: temporary.stat }],
    complete: false };
  owner.normalBase = state; // retain before open/stat/write may fail
  try {
    state.handle = await fs.open(named, sourceOriginalFsConstants.O_RDWR | sourceOriginalFsConstants.O_CREAT
      | sourceOriginalFsConstants.O_EXCL | (sourceOriginalFsConstants.O_NOFOLLOW ?? 0), 0o600);
    const before = await state.handle.stat({ bigint: true });
    if (!before.isFile() || before.nlink !== 1n || before.size !== 0n) sourceOriginalFailure('NORMAL_BASE_INVALID');
    let position = 0;
    while (position < bytes.length) {
      sourceOriginalOwner(holder);
      const result = await state.handle.write(bytes, position, bytes.length - position, position);
      if (!result.bytesWritten) sourceOriginalFailure('NORMAL_BASE_SHORT_WRITE');
      position += result.bytesWritten;
    }
    await state.handle.sync();
    state.stat = await state.handle.stat({ bigint: true });
    if (state.stat.dev !== before.dev || state.stat.ino !== before.ino || state.stat.mode !== before.mode) {
      sourceOriginalFailure('NORMAL_BASE_CHANGED');
    }
    await hashSourceOriginalHandle(owner, state);
    await assertSourceOriginalProgress(holder);
    await sourceNormalTemporary(holder);
    sourceOriginalOwner(holder);
    // Publish only after actual write/sync/EOF and original checks finish.
    state.complete = true;
    issued.normalProgressBase = state;
    return state;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}
async function assertSourceNormalProgressBase(holder) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  const row = owner.normalBase;
  if (!row?.complete || issued.normalProgressBase !== row) sourceOriginalFailure('NORMAL_BASE_NOT_CAPTURED');
  await sourceNormalTemporary(holder);
  await hashSourceOriginalHandle(owner, row);
  await assertSourceOriginalProgress(holder);
  return row;
}

// Internal A3/C handoff: only the same owner's real, pre-decrypt safe miss may
// admit already installed B bytes. This does not issue a route, S or T receipt.
export async function completeSourceInstalledBaselineMiss(holder, actual) {
  const owner = sourceOriginalOwner(holder);
  try {
    if (!owner.preparedInstall?.completed || owner.activeOperation || owner.workingGeneration
      || !owner.progressBinding) sourceOriginalFailure('NORMAL_BASELINE_NOT_AVAILABLE');
    const progress = await import('./weather-component-progress-cache.mjs');
    const input = await progress.sourceBaselineWorkingInput(holder, actual);
    if (input.binding !== owner.progressBinding || input.root !== owner.context.repository
      || input.holder !== holder) sourceOriginalFailure('NORMAL_BASELINE_SCOPE_CHANGED');
    const operation = Object.freeze({});
    const state = { owner, input, actual, kind: 'baseline-working-read', completed: false };
    sourceOriginalOperations.set(operation, state);
    owner.activeOperation = operation;
    owner.workingOperation = state;
    const rows = Object.freeze([...owner.workingReaders]);
    if (!rows.length || rows.length !== owner.preparedInstall.files.length
      || owner.preparedInstall.files.some((item, index) => item.output !== rows[index])) {
      sourceOriginalFailure('NORMAL_BASELINE_INSTALL_CHANGED');
    }
    await assertSourceOriginalProgress(holder);
    for (const row of rows) await hashSourceOriginalHandle(owner, row);
    await progress.assertSourceBaselineWorkingInput(holder, actual, input);
    const root = await fs.lstat(input.root, { bigint: true });
    if (!root.isDirectory() || root.isSymbolicLink()
      || !sameSourceOriginalStat(root, input.installRoot, false)) sourceOriginalFailure('NORMAL_BASELINE_ROOT_CHANGED');
    sourceOriginalOwner(holder);
    if (owner.activeOperation !== operation || state.completed || owner.workingGeneration) {
      sourceOriginalFailure('NORMAL_BASELINE_ADMISSION_CHANGED');
    }
    owner.workingGeneration = Object.freeze({ operation, rows,
      originalBinding: owner.progressBinding, inputKind: 'installed-protected-baseline' });
    state.completed = true;
    owner.activeOperation = null;
    return actual;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}

async function completeSourceInstalledBaselineWorking(holder, restored, actual = null) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  const prelude = issued.normalPrelude, selected = prelude?.originalSelection;
  if (!owner.preparedInstall?.completed || owner.activeOperation || owner.workingGeneration
    || sourceOriginalResultOwners.get(restored) !== owner || restored.restored !== true
    || prelude.originalInstall?.result !== restored || prelude.originalInstall.pending
    || prelude.originalPostInstall?.pending !== false) sourceOriginalFailure('NORMAL_BASELINE_NOT_AVAILABLE');
  const progress = await import('./weather-component-progress-cache.mjs');
  let input;
  if (actual !== null) {
    input = await progress.sourceBaselineWorkingInput(holder, actual);
    if (issued.normalRoute.request.quick || issued.normalRoute.request.quickProgressSource !== '') {
      sourceOriginalFailure('NORMAL_QUICK_PROGRESS_REQUIRED');
    }
  } else {
    // These are the TWO existing normal reasons not to decrypt S after B.
    // They come from the genuine route and earlier actual cache selection.
    if (!(issued.normalRoute.request.quick && issued.normalRoute.request.quickProgressSource === 'protected-current'
        || prelude.handoff?.selected === true) || prelude.progressCache?.selected !== false
      || selected?.pair || selected?.legacyCold) sourceOriginalFailure('NORMAL_BASELINE_SKIP_NOT_SELECTED');
    const installRoot = await fs.lstat(owner.context.repository, { bigint: true });
    if (!installRoot.isDirectory() || installRoot.isSymbolicLink()) sourceOriginalFailure('NORMAL_BASELINE_ROOT_INVALID');
    input = Object.freeze({ holder, root: owner.context.repository, binding: owner.progressBinding, installRoot });
  }
  if (input.binding !== owner.progressBinding || input.root !== owner.context.repository
    || input.holder !== holder) sourceOriginalFailure('NORMAL_BASELINE_SCOPE_CHANGED');
  const operation = Object.freeze({});
  const state = { owner, input, actual, kind: 'baseline-working-read', completed: false };
  sourceOriginalOperations.set(operation, state);
  owner.activeOperation = operation;
  owner.workingOperation = state;
  try {
    const rows = Object.freeze([...owner.workingReaders]);
    if (!rows.length || rows.length !== owner.preparedInstall.files.length
      || owner.preparedInstall.files.some((item, index) => item.output !== rows[index])) {
      sourceOriginalFailure('NORMAL_BASELINE_INSTALL_CHANGED');
    }
    await assertSourceOriginalProgress(holder);
    for (const row of rows) await hashSourceOriginalHandle(owner, row);
    if (actual !== null) await progress.assertSourceBaselineWorkingInput(holder, actual, input);
    await assertSourceNormalProgressBase(holder);
    const root = await fs.lstat(input.root, { bigint: true });
    if (!root.isDirectory() || root.isSymbolicLink() || !sameSourceOriginalStat(root, input.installRoot)) {
      sourceOriginalFailure('NORMAL_BASELINE_ROOT_CHANGED');
    }
    sourceOriginalOwner(holder);
    if (owner.activeOperation !== operation || state.completed || owner.workingGeneration) {
      sourceOriginalFailure('NORMAL_BASELINE_ADMISSION_CHANGED');
    }
    owner.workingGeneration = Object.freeze({ operation, rows,
      originalBinding: owner.progressBinding, inputKind: 'installed-protected-baseline' });
    state.completed = true;
    owner.activeOperation = null;
    return actual;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}
// An opaque read reference to THIS normal INSTALL's already verified pack rows.
// It owns no unpack, native stop, working installation or temporary cleanup.
const sourceProgressInstalledComponentReferences = new WeakMap();
async function issueSourceProgressInstalledComponents(holder, restored) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  const install = owner.preparedInstall, progress = issued.normalPrelude?.normalProgress;
  if (!install?.completed || owner.activeOperation || owner.workingGeneration
    || sourceOriginalResultOwners.get(restored) !== owner
    || issued.normalPrelude.originalInstall?.result !== restored
    || issued.normalPrelude.originalInstall.pending !== false
    || issued.normalPrelude.originalPostInstall?.pending !== false
    || progress?.pending !== true || progress.firstFailure !== null || progress.installedComponents) {
    sourceOriginalFailure('PROGRESS_COMPONENT_REFERENCE_NOT_AVAILABLE');
  }
  await assertSourceOriginalProgress(holder);
  await assertSourceCpPackClosureForFinalOwner(holder, install.packInvocation);
  if (!install.packInvocation) return null; // Genuine absence retains the old normal path.
  const resume = await sourceOriginalProgressResumeRequest(holder, restored);
  const pack = await import('./lib/private-weather-component-pack.mjs');
  const observed = pack.sourceCpInventoryObservation(install.packInvocation);
  const actualFiles = await install.packInvocation;
  const reference = Object.freeze({});
  const state = { holder, owner, restored, install, progress, binding: owner.progressBinding,
    invocation: install.packInvocation, manifest: observed.manifest,
    manifestSha256: sha256(JSON.stringify(observed.manifest)), rootIdentity: observed.rootIdentity,
    actualFiles, files: Object.freeze(actualFiles.map(file => Object.freeze({ ...file }))),
    target: sourceNormalUtcHour(resume.target), lockedTarget: issued.normalPrelude.productionTarget,
    claimed: false, firstFailure: null };
  sourceProgressInstalledComponentReferences.set(reference, state);
  progress.installedComponents = reference;
  await assertSourceProgressInstalledComponentReference(reference);
  return reference;
}
async function assertSourceProgressInstalledComponentReference(reference) {
  const state = sourceProgressInstalledComponentReferences.get(reference);
  if (!state) sourceOriginalFailure('PROGRESS_COMPONENT_REFERENCE_REQUIRED');
  if (state.firstFailure !== null) throw state.firstFailure[0];
  try {
    const { holder, owner, install, progress } = state;
    const issued = assertPrivateSourceJobDeadline(holder), prelude = issued.normalPrelude;
    if (sourceOriginalOwner(holder) !== owner || owner.preparedInstall !== install || !install.completed
      || owner.activeOperation || owner.workingGeneration || owner.progressBinding !== state.binding
      || sourceOriginalResultOwners.get(state.restored) !== owner
      || prelude?.originalInstall?.result !== state.restored || prelude.originalInstall.pending !== false
      || prelude.originalPostInstall?.pending !== false || prelude.normalProgress !== progress
      || progress.pending !== true || progress.firstFailure !== null || progress.installedComponents !== reference
      || prelude.productionTarget !== state.lockedTarget || install.packInvocation !== state.invocation) {
      sourceOriginalFailure('PROGRESS_COMPONENT_OWNER_CHANGED');
    }
    await assertSourceOriginalProgress(holder);
    await assertSourceCpPackClosureForFinalOwner(holder, state.invocation);
    const pack = await import('./lib/private-weather-component-pack.mjs');
    const observed = pack.sourceCpInventoryObservation(state.invocation);
    const actualFiles = await state.invocation;
    if (observed.manifest !== state.manifest || observed.rootIdentity !== state.rootIdentity
      || observed.root !== install.componentStage || sha256(JSON.stringify(observed.manifest)) !== state.manifestSha256
      || actualFiles !== state.actualFiles || !Array.isArray(actualFiles)
      || actualFiles.length !== state.files.length || actualFiles.length !== observed.manifest.files.length) {
      sourceOriginalFailure('PROGRESS_COMPONENT_MANIFEST_CHANGED');
    }
    // Whole working pack and conditions are the actual installed copies of the
    // same source rows whose manifest/marker were checked by the genuine unpack.
    for (const relative of [PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath, 'data/live/conditions.json']) {
      const original = install.rows.get(relative);
      const matches = install.files.filter(item => item.input === original
        && item.destination === path.join(install.repository, relative));
      if (!original || matches.length !== 1 || !owner.workingReaders.includes(matches[0].output)
        || matches[0].output.path !== matches[0].destination
        || original.bytes !== matches[0].output.bytes || original.sha256 !== matches[0].output.sha256) {
        sourceOriginalFailure('PROGRESS_COMPONENT_BASE_CHANGED');
      }
      await hashSourceOriginalHandle(owner, original);
      await hashSourceOriginalHandle(owner, matches[0].output);
      if (relative === 'data/live/conditions.json' && original.sha256 !== state.binding.baselineSha256) {
        sourceOriginalFailure('PROGRESS_COMPONENT_BASE_CHANGED');
      }
    }
    for (let index = 0; index < actualFiles.length; index++) {
      const file = actualFiles[index], frozen = state.files[index], entry = observed.manifest.files[index];
      if (!same(file, frozen) || file.relativePath !== entry.relativePath
        || file.bytes !== entry.bytes || file.sha256 !== entry.sha256
        || file.sourcePath !== path.join(install.componentStage, file.relativePath)) {
        sourceOriginalFailure('PROGRESS_COMPONENT_ROWS_CHANGED');
      }
      const matches = install.files.filter(item => item.input.path === file.sourcePath
        && item.destination === path.join(install.repository, file.relativePath));
      if (matches.length !== 1 || !owner.operationReaders.includes(matches[0].input)
        || !owner.workingReaders.includes(matches[0].output)
        || matches[0].output.path !== matches[0].destination
        || [matches[0].input, matches[0].output].some(row => row.bytes !== file.bytes || row.sha256 !== file.sha256)) {
        sourceOriginalFailure('PROGRESS_COMPONENT_INSTALL_CHANGED');
      }
      await hashSourceOriginalHandle(owner, matches[0].input);
      await hashSourceOriginalHandle(owner, matches[0].output);
    }
    sourceOriginalOwner(holder);
    return state;
  } catch (error) {
    state.firstFailure ??= [error];
    throw keepSourceOriginalFailure(state.owner, state.firstFailure[0]);
  }
}
export async function consumeSourceProgressInstalledComponents(reference, root, target) {
  const state = sourceProgressInstalledComponentReferences.get(reference);
  if (!state || state.claimed) sourceOriginalFailure('PROGRESS_COMPONENT_REFERENCE_REQUIRED');
  state.claimed = true; // A single real union consumption, synchronously claimed.
  return assertSourceProgressInstalledComponents(reference, state.files, root, target);
}
export async function assertSourceProgressInstalledComponents(reference, files, root, target) {
  const state = sourceProgressInstalledComponentReferences.get(reference);
  if (!state || !state.claimed || files !== state.files) sourceOriginalFailure('PROGRESS_COMPONENT_REFERENCE_REQUIRED');
  try {
    if (root !== state.binding.repositoryRoot || sourceNormalUtcHour(target) !== state.target) {
      sourceOriginalFailure('PROGRESS_COMPONENT_SCOPE_CHANGED');
    }
    await assertSourceProgressInstalledComponentReference(reference);
    return state.files;
  } catch (error) {
    state.firstFailure ??= [error];
    throw keepSourceOriginalFailure(state.owner, state.firstFailure[0]);
  }
}

async function runSourceNormalProgress(holder, restored) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  const prelude = issued.normalPrelude;
  if (!owner.preparedInstall?.completed || owner.activeOperation || owner.workingGeneration
    || sourceOriginalResultOwners.get(restored) !== owner || prelude.normalProgress) {
    sourceOriginalFailure('NORMAL_PROGRESS_NOT_AVAILABLE');
  }
  const state = { pending: true, firstFailure: null, actual: null, skipped: false, installed: false };
  prelude.normalProgress = state;
  try {
    await assertSourceNormalProgressBase(holder);
    const skip = issued.normalRoute.request.quick && issued.normalRoute.request.quickProgressSource === 'protected-current'
      || prelude.handoff?.selected === true;
    if (skip) {
      await completeSourceInstalledBaselineWorking(holder, restored);
      state.skipped = true; // NOT RESTORED, CACHE_MISS, S authentication or SAVE.
    } else {
      const progress = await import('./weather-component-progress-cache.mjs');
      const installedComponents = await issueSourceProgressInstalledComponents(holder, restored);
      state.actual = await progress.installSourceOriginalProgress(holder, restored, installedComponents);
      if (issued.normalRoute.request.checkpointOnly
        && (state.actual.workingInstalled !== true
          || sourceNormalUtcHour(state.actual.restoredProductionReferenceAt) !== issued.normalPrelude.productionTarget
          || !/^[0-9a-f]{64}$/.test(state.actual.restoredOriginalTargetSha256 ?? ''))) {
        sourceOriginalFailure('ORIGINAL_TARGET_AUTHENTICATION_REQUIRED');
      }
      if (owner.workingGeneration) {
        if (!owner.workingOperation?.completed || owner.activeOperation
          || sourceOriginalOperations.get(owner.workingGeneration.operation) !== owner.workingOperation) {
          sourceOriginalFailure('NORMAL_PROGRESS_INSTALL_UNPROVED');
        }
        if (owner.workingOperation.kind === 'baseline-working-read') {
          if (issued.normalRoute.request.quick || issued.normalRoute.request.quickProgressSource !== ''
            || owner.workingOperation.actual !== state.actual) {
            sourceOriginalFailure('NORMAL_QUICK_PROGRESS_REQUIRED');
          }
          await progress.assertSourceBaselineWorkingInput(holder, state.actual, owner.workingOperation.input);
        } else {
          if (state.actual.workingInstalled !== true || !Number.isSafeInteger(state.actual.fileCount)
            || state.actual.fileCount < 1) sourceOriginalFailure('NORMAL_PROGRESS_INSTALL_UNPROVED');
          const { assertUsableDmiProgressRecovery } = await import('./lib/verified-dmi-progress-inputs.mjs');
          assertUsableDmiProgressRecovery(state.actual.dmiProgress, { allowAbsent: true });
          state.installed = true;
        }
      } else await completeSourceInstalledBaselineWorking(holder, restored, state.actual);
    }
    await assertSourceOriginalProgress(holder);
    await assertSourceNormalProgressBase(holder);
    sourceOriginalOwner(holder);
    state.pending = false;
    return state.actual;
  } catch (error) {
    state.firstFailure ??= [error];
    throw keepSourceOriginalFailure(owner, state.firstFailure[0]);
  }
}


async function runSourceNormalAfterDmi(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation);
  const issued = assertPrivateSourceJobDeadline(holder), prelude = issued.normalPrelude;
  if (!issued.normalRoute || !prelude || prelude.handoff?.reused === true
    || !state.outputGeneration || state.normalTailStarted) sourceOriginalFailure('NORMAL_DMI_TAIL_NOT_AVAILABLE');
  state.normalTailStarted = true;
  let first = null;
  try {
    if (state.result.returncode === 0) await runSourceNormalProgram(holder, operation, 'point');
    await reconfirmSourceNormalMain(holder);
    const raw = await runSourceSaveCohort(holder, operation, 'raw');
    if (raw.semanticFailure) throw raw.semanticFailure[0];
    if (state.childTerminalFailure) throw state.childTerminalFailure.firstFailure[0];
    const terminal = classifySourceNormalDmi(holder, operation);
    state.normalTerminal = terminal;
    await runSourceMaintainedActiveSnapshot(holder, operation, terminal);
    let wam = null;
    if (sourceNormalWamSelection(holder)) wam = await runSourceSaveCohort(holder, operation, 'wam');
    const targets = await runSourceRequiredProgram(holder, operation, 'cpTargets');
    if (sourceNormalUtcHour(targets.result.outputs.target_hour) !== sourceNormalUtcHour(state.lockedTarget)
      || sourceNormalUtcHour(targets.result.outputs.production_reference_at) !== sourceNormalUtcHour(state.lockedTarget)) {
      throw sourceNormalClosedFailure(state, 'cpTargets', 'PRODUCTION_TARGET_CHANGED');
    }
    const inspected = await runSourceNormalProgram(holder, operation, 'cpInspect');
    await runSourceNormalAdvisory(holder, operation);
    // Same normal shortcut, derived only from the actual range-checker's output
    // under this guardian. A strict checker still follows both branches.
    if (!issued.normalRoute.request.checkpointOnly
      && (inspected.result.exitCode !== 0 || inspected.result.outputs.source_stage_ready !== 'true')) {
      await runSourceNormalProgram(holder, operation, 'cp');
    }
    await runSourceRequiredProgram(holder, operation, 'cpStrict');
    const om = await runSourceRequiredProgram(holder, operation, 'om');
    if (om.result.outputs.checkpoint_written !== 'true'
      || !/^(0|[1-9][0-9]*)$/.test(om.result.outputs.missing_pair_count ?? '')) {
      throw sourceNormalClosedFailure(state, 'om', 'CHECKPOINT_NOT_WRITTEN');
    }
    if (sourceNormalWamSelection(holder) && (!wam?.wamOutcome.validatorSucceeded || wam.wamOutcome.code !== 'NONE')) {
      throw sourceNormalClosedFailure(state, 'wam', wam?.wamOutcome.code ?? 'UNCLASSIFIED');
    }
    await runSourceRequiredProgram(holder, operation, 'freshness');
    await runSourceRequiredProgram(holder, operation, 'closure');
    await runSourceRequiredProgram(holder, operation, 'pilot');
    await assertSourceNormalLegacyCurrentRequests(holder, operation, false);
    const weather = await runSourceRequiredProgram(holder, operation, 'weather');
    state.weatherPhase = weather;
    if (!issued.normalRoute.request.quick && !issued.normalRoute.request.checkpointOnly) {
      await runSourceNormalProgram(holder, operation, 'quality');
    }
    await runSourceRequiredProgram(holder, operation, 'qualityStrict');
  } catch (error) {
    first = state.childTerminalFailure?.firstFailure ?? [error];
    state.failureWorker = sourceFailureWorkerRecord(state.failureWorker, issued.deadline, first[0], performance.now());
  }
  try {
    await runSourceNormalAlwaysSeal(holder, operation);
  } catch (error) {
    // In-process raw first values, including null/0, are never replaced by
    // cleanup or final-save errors. Unknown stop retains its own full refs too.
    if (first === null) first = [error];
    else state.finalSaveFailure = [error];
  }
  if (first !== null) throw first[0];
  if (state.firstNormalFailure) throw state.firstNormalFailure[0];
  await assertSourceNormalGeneration(holder, operation);
  // This returns the still-owned operation only. No activeOperation clear,
  // original release, public handoff, T or SOURCE-complete is issued here.
  state.normalTailSettled = true;
  return operation;
}

// PRIVATE P ADDITION: fixed post-Weather artifact consumer, never a new issuer.
// This consumes the SAME operation after real child/drain and typed SAVE ACKs.
// T is a verified local bundle, not a hosted publication or SOURCE-complete.
async function sourceArtifactJson(holder, operation, relative) {
  const state = sourceDmiWorkingState(holder, operation);
  const file = path.join(state.owner.context.repository, ...relative.split('/'));
  const generation = await assertSourceNormalGeneration(holder, operation);
  let row = generation.rows.find(value => value.path === file);
  if (!row) row = await openSourceOutputRow(state.owner, state.owner.context.repository, file);
  state.artifact.readers.push(row);
  const bytes = await sourceNormalRowBytes(holder, row, bufferConstants.MAX_LENGTH);
  return { row, value: JSON.parse(bytes.toString('utf8')) };
}

async function writeSourceArtifactDispositionFile(writer, contents) {
  const pack = await import('./lib/private-weather-component-pack.mjs');
  const identity = pack.ownFileDescriptorIdentity(writer.fd);
  if (identity === null || writer.handle.fd !== writer.fd) {
    sourceOriginalFailure('ARTIFACT_DISPOSITION_CLOSE_UNPROVED');
  }
  await writer.handle.writeFile(contents);
  await writer.handle.sync();
  writer.closeAttempted = true; // A rejected close must never be retried by cleanup.
  await writer.handle.close();
  writer.closed = writer.handle.fd === -1 && await pack.ownedFileDescriptorClosed(writer.fd, identity);
  if (!writer.closed) sourceOriginalFailure('ARTIFACT_DISPOSITION_CLOSE_UNPROVED');
}

async function writeSourceNormalCheckpointDisposition(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), artifact = state.artifact;
  const issued = assertPrivateSourceJobDeadline(holder);
  const audit = await sourceArtifactJson(holder, operation,
    '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json');
  const manifest = await sourceArtifactJson(holder, operation, 'data/live/manifest.json');
  const status = audit.value.rollback?.status, ready = audit.value.rollback?.activationReady;
  if (!((status === 'READY' && ready === true)
      || (status === 'BUILDING_MEASURED_ONLY' && ready === false))
    || typeof manifest.value.datasetId !== 'string' || !manifest.value.datasetId
    || audit.value.datasetId !== manifest.value.datasetId) sourceOriginalFailure('ARTIFACT_DISPOSITION_INVALID');
  const { sha256CanonicalJson } = await import('./ravscore-operational-pages-recovery.mjs');
  const binding = { schemaVersion: 'ravscore-continuation-checkpoint-disposition-v1',
    disposition: ready ? 'READY_PUBLISHED' : 'MEASURED_WARMUP_PUBLISHED',
    sourceHead: issued.identity.GITHUB_SHA, datasetId: manifest.value.datasetId,
    runtimeAuditSha256: sha256CanonicalJson(audit.value), rollbackStatus: status,
    rollbackActivationReady: ready, checkpointRequired: true, privatePayloadIncluded: false };
  const value = { ...binding, bindingSha256: sha256CanonicalJson(binding) };
  const file = path.join(state.owner.context.repository,
    '.geometry-v2-work/ravscore-continuation-checkpoint-disposition.json');
  const rootStat = await fs.lstat(state.owner.context.repository, { bigint: true });
  const directory = path.dirname(file), directoryStat = await fs.lstat(directory, { bigint: true });
  if (!sameSourceOriginalStat(state.owner.workingOperation.input.installRoot, rootStat)
    || !rootStat.isDirectory() || rootStat.isSymbolicLink()
    || !directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
    sourceOriginalFailure('ARTIFACT_DISPOSITION_DIRECTORY_CHANGED');
  }
  // Existing fixed normal output. No overwrite/adoption of a prior run's plan.
  const handle = await fs.open(file, sourceOriginalFsConstants.O_WRONLY
    | sourceOriginalFsConstants.O_CREAT | sourceOriginalFsConstants.O_EXCL
    | sourceOriginalFsConstants.O_NOFOLLOW, 0o600);
  artifact.dispositionWrite = { file, handle, fd: handle.fd, closed: false, directory, directoryStat };
  const created = await handle.stat({ bigint: true });
  const named = await fs.lstat(file, { bigint: true });
  if (!created.isFile() || created.nlink !== 1n || created.size !== 0n
    || !sameSourceOriginalStat(created, named, true)
    || !sameSourceOriginalStat(directoryStat, await fs.lstat(directory, { bigint: true }))) {
    sourceOriginalFailure('ARTIFACT_DISPOSITION_OUTPUT_CHANGED');
  }
  await writeSourceArtifactDispositionFile(artifact.dispositionWrite, JSON.stringify(value) + '\n');
  const checked = await sourceArtifactJson(holder, operation,
    '.geometry-v2-work/ravscore-continuation-checkpoint-disposition.json');
  if (!same(checked.value, value)) sourceOriginalFailure('ARTIFACT_DISPOSITION_CHANGED');
  for (const row of [audit.row, manifest.row, checked.row]) await hashSourceOriginalHandle(state.owner, row);
  artifact.disposition = freezeSourceOriginalMetadata(value);
  // Read-only observation after the real writer close, readback and hashes.
  artifact.dispositionObserved = artifact.dispositionWrite.closed === true;
  if (!artifact.dispositionObserved) sourceOriginalFailure('ARTIFACT_DISPOSITION_CLOSE_UNPROVED');
}

async function bindSourceNormalArtifactInputs(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), artifact = state.artifact;
  const { value: spec, row: specRow } = await sourceArtifactJson(holder, operation,
    '.cache/private-production-runtime-create-spec.json');
  if (!isPlainObject(spec) || !isPlainObject(spec.metadata) || !Array.isArray(spec.files)) {
    sourceOriginalFailure('ARTIFACT_SPEC_INVALID');
  }
  assertPrivateRuntimeInventory(spec.files);
  const generation = await assertSourceNormalGeneration(holder, operation);
  const allowed = new Map([...PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE,
    PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE].map(row => [row.id, row.relativePath]));
  const inputs = new Map();
  for (const file of spec.files) {
    if (!isPlainObject(file) || Object.keys(file).sort().join(',') !== 'id,privacyClass,relativePath,sourcePath'
      || allowed.get(file.id) !== file.relativePath
      || file.privacyClass !== PRIVATE_PRODUCTION_RUNTIME_BUNDLE_POLICY.privacyClass) {
      sourceOriginalFailure('ARTIFACT_SPEC_PATH_INVALID');
    }
    const selected = file.id === 'dmi-bulk-cache' ? PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate : file.relativePath;
    const expected = path.join(state.owner.context.repository, ...selected.split('/'));
    if (file.sourcePath !== expected || inputs.has(file.relativePath)) sourceOriginalFailure('ARTIFACT_SPEC_PATH_INVALID');
    const row = generation.rows.find(value => value.path === expected);
    if (!row) sourceOriginalFailure('ARTIFACT_INPUT_NOT_OWNED');
    await hashSourceOriginalHandle(state.owner, row);
    inputs.set(file.relativePath, row);
  }
  if (spec.metadata.datasetId !== artifact.disposition.datasetId
    || sourceNormalUtcHour(spec.metadata.productionReferenceAt) !== sourceNormalUtcHour(state.lockedTarget)) {
    sourceOriginalFailure('ARTIFACT_GENERATION_CHANGED');
  }
  artifact.spec = freezeSourceOriginalMetadata(spec);
  artifact.specRow = specRow;
  artifact.inputs = inputs;
}

function assertSourceNormalArtifactBinding(spec, inputs, verified) {
  // This is a byte/metadata comparison, NOT an issuer or a completion receipt.
  // The caller must keep its existing same-owner lifetime and final fd checks.
  const keys = ['datasetId', 'productionReferenceAt', 'generatedAt', 'generationId',
    'zoneCount', 'partCount', 'modelBinding', 'contractHashes', 'privacyClass'];
  if (!isPlainObject(spec?.metadata) || !isPlainObject(verified)
    || !(inputs instanceof Map) || !Array.isArray(spec.files) || !Array.isArray(verified.files)
    || !same(Object.keys(spec.metadata).sort(), keys.slice().sort())
    || keys.some(key => !same(spec.metadata[key], verified[key]))
    || verified.verified !== true || verified.fileCount !== inputs.size
    || verified.files.length !== inputs.size || spec.files.length !== inputs.size) {
    sourceOriginalFailure('ARTIFACT_BUNDLE_CHANGED');
  }
  const remaining = new Map(spec.files.map(file => [file.relativePath, file]));
  if (remaining.size !== inputs.size) sourceOriginalFailure('ARTIFACT_SPEC_PATH_INVALID');
  for (const descriptor of verified.files) {
    const file = remaining.get(descriptor.relativePath), input = inputs.get(descriptor.relativePath);
    if (!file || !input || descriptor.id !== file.id || descriptor.privacyClass !== file.privacyClass
      || descriptor.bytes !== input.bytes || descriptor.sha256 !== input.sha256) {
      sourceOriginalFailure('ARTIFACT_INPUT_BYTES_CHANGED');
    }
    remaining.delete(descriptor.relativePath);
  }
  if (remaining.size !== 0) sourceOriginalFailure('ARTIFACT_INPUT_BYTES_CHANGED');
}

function sourceNormalArtifactBundlePath(holder) {
  const owner = sourceOriginalOwner(holder);
  if (owner.context.root !== '/tmp/ravradar-private-production-runtime') {
    sourceOriginalFailure('ARTIFACT_ROOT_NOT_FIXED');
  }
  // The named successor is distinct from every retained B. Never move,
  // overwrite, rebind or delete original B/S paths or handles for T.
  const bundlePath = path.join(owner.context.root, 'bundle-source-successor');
  if (owner.bundles.some(bundle => bundle.selected.finalBundle === bundlePath)) {
    sourceOriginalFailure('ARTIFACT_DESTINATION_IS_ORIGINAL');
  }
  return bundlePath; // a name only; never completion or artifact admission
}



// Read-only workflow observations. Only the two genuine finalizers may store
// a result after their actual close/cleanup commit; JSON never issues a result.
const sourceNormalWorkflowObservations = new WeakMap();
export function sourceNormalWorkflowObservation(result) {
  const observed = arguments.length === 1 && sourceNormalWorkflowObservations.get(result);
  if (!observed) sourceOriginalFailure('WORKFLOW_RESULT_NOT_ISSUED');
  return observed; // No owner, admission, SAVE, Pages or retry capability.
}
function sourceWorkflowClosedOutcome(phase) {
  if (!phase?.completed || !phase.transportClosed || !phase.controlCloseObserved
    || phase.firstFailure !== null || phase.controlCloseFailure !== null
    || !Number.isInteger(phase.result?.exitCode) || phase.result.exitCode < 0 || phase.result.exitCode > 255) {
    sourceOriginalFailure('WORKFLOW_PHASE_NOT_CLOSED');
  }
  return phase.result.exitCode === 0 ? 'success' : 'failure';
}
function sourceWorkflowBaseObservation(holder) {
  const actual=sourceOwnerRecord(holder),owner=sourceOriginalOwner(holder),issued=assertPrivateSourceJobDeadline(holder);
  const prelude=sourceNormalPreludeState(holder),decision=prelude.preflight,phase=decision?.phase;
  if(actual.tailContext.session!==holder || owner!==actual.owner || issued.normalPrelude!==prelude
    ||!decision||!Object.isFrozen(decision)||typeof decision.shouldRun!=='boolean'
    ||typeof decision.dmiChanged!=='boolean')sourceOriginalFailure('WORKFLOW_PREFLIGHT_NOT_OWNED');
  let preflightResult;
  if(phase!==undefined){
    const proof=sourcePreludePhases.get(phase);
    if(proof?.holder!==holder||proof.state!==prelude||phase.name!=='preflightProbe'
      ||!['true','false'].includes(phase.result?.outputs?.should_run)
      ||!['true','false'].includes(phase.result?.outputs?.dmi_changed)
      ||decision.shouldRun!==(phase.result.outputs.should_run==='true')
      ||decision.dmiChanged!==(phase.result.outputs.dmi_changed==='true')
      ||sourceWorkflowClosedOutcome(phase)!=='success')sourceOriginalFailure('WORKFLOW_PREFLIGHT_NOT_OWNED');
    preflightResult='PROBE_RESULT';
  }else{
    // The existing normal preflight may genuinely be unavailable. Its own
    // retained decision means continue, not a fabricated successful probe.
    if(Object.keys(decision).sort().join(',')!=='dmiChanged,reason,shouldRun'
      ||decision.shouldRun!==true||decision.dmiChanged!==false
      ||decision.reason!=='verified-light-preflight-unavailable')sourceOriginalFailure('WORKFLOW_PREFLIGHT_NOT_OWNED');
    preflightResult='UNAVAILABLE_CONTINUE';
  }
  const rows=actual.tailContext.activeRows;
  const resolved=resolveOperationalRavScoreModel(rows.find(row=>row.document_key===RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY),
    {profileRow:rows.find(row=>row.document_key===RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY)});
  const bindingCurrent=operationalResolvedBindingCurrent(resolved);
  const expectedAction=bindingCurrent?'integrated':'integrated-historical-maintenance';
  if(resolved.model!=='integrated'||resolved.pending!==false
    ||resolved.initialCutoverRequired!==false||resolved.legacySourceRequired!==false
    ||!Number.isSafeInteger(resolved.centralVersion)||resolved.centralVersion<=0
    ||issued.normalRoute?.action!==expectedAction)sourceOriginalFailure('WORKFLOW_PROFILE_NOT_CURRENT');
  const deploymentId=resolved.deploymentId??'';
  if(typeof deploymentId!=='string'||deploymentId.length>256||/[^\x20-\x7e]/.test(deploymentId))sourceOriginalFailure('WORKFLOW_PROFILE_OUTPUT_INVALID');
  return {schemaVersion:'SOURCE_NORMAL_WORKFLOW_OBSERVATION_V1',
    kind:decision.shouldRun?'PREPARED_WEATHER':'NO_WORK',sourceHead:issued.identity.GITHUB_SHA,
    runId:issued.identity.GITHUB_RUN_ID,runAttempt:issued.identity.GITHUB_RUN_ATTEMPT,
    targetReferenceAt:actual.tailContext.target,privatePayloadIncluded:false,
    outputs:{source_preflight_should_run:String(decision.shouldRun),
      source_preflight_dmi_changed:String(decision.dmiChanged),source_preflight_result:preflightResult,
      source_operational_action:issued.normalRoute.action,source_operational_model:resolved.model,
      source_operational_binding_current:String(operationalResolvedBindingCurrent(resolved)),
      source_central_version:String(resolved.centralVersion),source_active_deployment_id:deploymentId,
      source_initial_cutover_required:String(resolved.initialCutoverRequired),
      source_legacy_source_required:String(resolved.legacySourceRequired)}};
}
function captureSourcePreparedWorkflowObservation(holder,operation) {
  const state=sourceDmiWorkingState(holder,operation),artifact=state.artifact,publication=artifact?.publication;
  const observation=sourceWorkflowBaseObservation(holder),disposition=artifact?.disposition;
  if(observation.kind!=='PREPARED_WEATHER'||!artifact?.completed||!artifact.currentControls?.completed
    ||artifact.currentControls.firstSafetyFailure!==null||!publication?.privateAck||!publication.checkpointAck
    ||!publication.uploadAck||publication.privateAck.private_anonymous_denied!=='true'
    ||artifact.dispositionObserved!==true||artifact.dispositionWrite?.closed!==true
    ||publication.privateWriteAuthority?.sourceHead!==observation.sourceHead
    ||publication.privateWriteAuthority?.runId!==observation.runId
    ||publication.privateWriteAuthority?.runAttempt!==observation.runAttempt
    ||!['READY_PUBLISHED','MEASURED_WARMUP_PUBLISHED'].includes(disposition?.disposition)
    ||disposition.sourceHead!==observation.sourceHead||disposition.privatePayloadIncluded!==false
    ||!/^[a-f0-9]{64}$/.test(state.currentImplementationOutput?.implementationClosureSha256??'')
    ||![disposition.bindingSha256,disposition.runtimeAuditSha256].every(value=>/^[a-f0-9]{64}$/.test(value??''))
    ||typeof disposition.datasetId!=='string'||!disposition.datasetId.startsWith('rr-')
    ||disposition.datasetId.length>256||/[^\x20-\x7e]/.test(disposition.datasetId))sourceOriginalFailure('WORKFLOW_PREPARED_OUTPUT_UNPROVED');
  const cacheOutcomes = sourcePostWeatherCacheOutcomes(state);
  Object.assign(observation.outputs,{
    source_checkpoint_save_outcome:cacheOutcomes.checkpoint,
    source_weather_preflight_state_build_outcome:cacheOutcomes.preflightBuild,
    source_weather_preflight_state_save_outcome:cacheOutcomes.preflightSave,
    source_weather_outcome:sourceWorkflowClosedOutcome(state.weatherPhase),
    source_full_validation_outcome:sourceWorkflowClosedOutcome(artifact.validationPhase),
    source_release_gate_outcome:sourceWorkflowClosedOutcome(artifact.releasePhase),
    source_integrated_runtime_audit_outcome:sourceWorkflowClosedOutcome(artifact.auditPhase),
    source_checkpoint_build_outcome:sourceWorkflowClosedOutcome(artifact.checkpointPhase),
    source_checkpoint_disposition_outcome:artifact.dispositionObserved?'success':sourceOriginalFailure('WORKFLOW_PREPARED_OUTPUT_UNPROVED'),
    source_private_runtime_bundle_spec_outcome:sourceWorkflowClosedOutcome(artifact.specPhase),
    source_private_runtime_write_authority_outcome:'success', // actual retained recheck required above
    source_private_runtime_bundle_create_outcome:sourceWorkflowClosedOutcome(artifact.createPhase),
    source_private_build_stage_seal_outcome:sourceWorkflowClosedOutcome(artifact.staging.phase),
    source_private_build_stage_upload_outcome:sourceWorkflowClosedOutcome(publication.upload),
    source_private_runtime_publish_outcome:sourceWorkflowClosedOutcome(publication.private),
    source_checkpoint_publish_outcome:sourceWorkflowClosedOutcome(publication.checkpoint),
    source_private_runtime_anonymous_denied:publication.privateAck.private_anonymous_denied,
    source_integrated_implementation_closure_sha256:state.currentImplementationOutput.implementationClosureSha256,
    source_checkpoint_disposition:disposition.disposition,
    source_checkpoint_disposition_sha256:disposition.bindingSha256,
    source_checkpoint_dataset_id:disposition.datasetId,
    source_checkpoint_runtime_audit_sha256:disposition.runtimeAuditSha256});
  return freezeSourceOriginalMetadata(observation);
}

const sourceFinalOwnerCloseTokens = new WeakMap();
function sourceFinalDistinctReaderRows(rows) {
  const byHandle = new Map();
  for (const row of rows) {
    if (!row?.handle || sourcePreludeTypes.isProxy(row.handle)) sourceOriginalFailure('FINAL_READER_NOT_OWNED');
    const previous = byHandle.get(row.handle);
    if (previous && (previous.bytes !== row.bytes || previous.sha256 !== row.sha256
      || previous.stat.dev !== row.stat.dev || previous.stat.ino !== row.stat.ino)) sourceOriginalFailure('FINAL_READER_IDENTITY_CONFLICT');
    if (!previous) byHandle.set(row.handle, row);
  }
  return [...byHandle.values()];
}
// Physical helper only. The fixed finalizer supplies its registered rows;
// neither a resolved close Promise nor a recycled numeric fd is a receipt.

export async function sourceFinalProgressRetainedReader(holder, token, handle) {
  const input=sourceFinalOwnerCloseInput(holder,token), owner=sourceOriginalOwner(holder);
  if(input.phase!=='ARMED' || input.owner!==owner) sourceOriginalFailure('FINAL_PROGRESS_READER_NOT_ARMED');
  const state=sourceDmiWorkingState(holder,input.operation),prelude=assertPrivateSourceJobDeadline(holder).normalPrelude;
  const found=sourceFinalOwnedPReaderRows(owner,state,prelude).filter(row=>row.handle===handle);
  if(found.length>1) sourceOriginalFailure('FINAL_PROGRESS_READER_CONFLICT');
  if(!found.length) return null;
  await hashSourceOriginalHandle(owner,found[0]);
  return found[0];
}
const sourceFinalProgressUnionInputs=new WeakMap();
export async function prepareSourceProgressUnionFinalInput(holder,token,invocation,receipt) {
  const input=sourceFinalOwnerCloseInput(holder,token),owner=sourceOriginalOwner(holder);
  const phase=sourceProgressUnionPhases.get(invocation),reference=sourceProgressInstalledComponentReferences.get(phase?.reference);
  try {
    if(input.phase!=='ARMED' || input.owner!==owner || !phase || phase.holder!==holder || phase.owner!==owner
      || phase.invocation!==invocation || !phase.completed || phase.firstFailure!==null
      || sourceProgressUnionResults.get(phase.proof)!==phase || !phase.transportClosed || !phase.controlCloseObserved
      || phase.controlCloseFailure!==null || phase.fdRows.some(row=>!row.closed||!row.closeAttempted||row.firstFailure!==null)
      || !phase.birthCatalog || !phase.hResultBirth || !phase.hJournalBirth
      || !reference || reference.owner!==owner || reference.holder!==holder || !reference.claimed
      || reference.firstFailure!==null || reference.install!==owner.preparedInstall || !reference.install.completed
      || reference.invocation!==reference.install.packInvocation || owner.progressBinding!==reference.binding) sourceOriginalFailure('FINAL_PROGRESS_UNION_NOT_OWNED');
    const issued=assertPrivateSourceJobDeadline(holder),progress=issued.normalPrelude?.normalProgress;
    const source=await import('./weather-component-progress-cache.mjs');
    const bound=await source.sourceProgressUnionFinalContextInput(holder,token,invocation,receipt);
    if(progress!==reference.progress || progress?.pending!==false || progress.firstFailure!==null
      || progress.installedComponents!==phase.reference || reference.lockedTarget!==issued.normalPrelude.productionTarget
      || sourceOriginalResultOwners.get(reference.restored)!==owner
      || issued.normalPrelude.originalInstall?.result!==reference.restored
      || issued.normalPrelude.originalInstall.pending!==false || issued.normalPrelude.originalPostInstall?.pending!==false
      || bound.source!==phase.sourceInput || bound.receipt!==receipt || bound.result!==phase.owned.result
      || bound.installedReference!==phase.reference || bound.operation!==owner.workingGeneration?.operation
      || bound.workingGeneration!==owner.workingGeneration || owner.workingOperation?.input!==bound.owner
      || owner.workingOperation.invocation!==invocation || owner.workingOperation.actual!==bound.result
      || !owner.workingOperation.completed) sourceOriginalFailure('FINAL_PROGRESS_UNION_CHAIN_CHANGED');
    await assertSourceOriginalProgress(holder);
    await assertSourceCpPackClosureForFinalOwner(holder,reference.invocation);
    await assertSourceCpPackClosureForFinalOwner(holder,bound.source.packInvocation);
    const union=await import('./lib/verified-protected-progress-components.mjs');
    const unionReaders=await union.sourceProgressUnionFinalOutputReaders(holder,token,invocation,bound.result,phase.proof);
    if(unionReaders.length!==phase.owned.outputs.length)sourceOriginalFailure('FINAL_PROGRESS_UNION_READERS_INCOMPLETE');
    for(const row of unionReaders) {
      const expected=phase.owned.outputs.find(candidate=>candidate.path===row.path);
      if(!expected || expected.bytes!==row.bytes || expected.sha256!==row.sha256)sourceOriginalFailure('FINAL_PROGRESS_UNION_READER_CHANGED');
      const view={path:row.path,handle:row.handle,stat:row.identity,bytes:row.bytes,sha256:row.sha256,
        directories:row.directories.map(directory=>({path:directory.path,stat:directory.identity}))};
      (owner.operationReaders??=[]).push(view);
      await hashSourceOriginalHandle(owner,view);
    }
    const actualReport=await openSourceOutputRow(owner,phase.outputPath,path.join(phase.outputPath,'union-result.json'),
      {bytes:phase.resultBytes,sha256:phase.resultDigest});
    const actualJournal=await openSourceOutputRow(owner,phase.outputPath,path.join(phase.outputPath,'union-birth.jsonl'),
      {bytes:phase.journalBytes,sha256:phase.journalDigest});
    const capsule=await openSourceOutputRow(owner,bound.source.temporary.folder,phase.capsulePath,
      {bytes:phase.capsuleBytes,sha256:phase.capsuleSha256});
    for(const[row,birth]of [[actualReport,phase.hResultBirth],[actualJournal,phase.hJournalBirth],[capsule,phase.capsuleWriter.birth]]) {
      if(!birth || birth.size!==0n || ['dev','ino','mode','nlink'].some(key=>birth[key]!==row.stat[key])) sourceOriginalFailure('FINAL_PROGRESS_UNION_BIRTH_CHANGED');
    }
    for(const[row,previous]of [[actualReport,phase.report.stat],[actualJournal,phase.journal.stat],[capsule,phase.capsule.stat]]) {
      if(!sameSourceOriginalStat(row.stat,previous,true))sourceOriginalFailure('FINAL_PROGRESS_UNION_FILE_CHANGED');
    }
    if(!phase.capsuleWriter.closed || phase.capsuleWriter.firstFailure!==null) sourceOriginalFailure('FINAL_PROGRESS_UNION_WRITER_UNCLOSED');
    const bytes=Buffer.alloc(actualJournal.bytes);let offset=0;
    while(offset<bytes.length){const result=await actualJournal.handle.read(bytes,offset,bytes.length-offset,offset);if(!result.bytesRead)sourceOriginalFailure('FINAL_PROGRESS_UNION_TRUNCATED');offset+=result.bytesRead;}
    if(sha256(bytes)!==phase.journalDigest) sourceOriginalFailure('FINAL_PROGRESS_UNION_CHANGED');
    await sourceProgressUnionBirthCatalog(phase,bytes,{catalog:phase.catalog});
    const rows=[actualReport,actualJournal,capsule],directories=[{path:phase.outputPath,birth:phase.outputBirth}];
    for(const file of phase.catalog.files) {
      const born=phase.birthCatalog.bornFiles.get(file.relative),closed=phase.birthCatalog.files.get(file.relative);
      if(!born||!closed) sourceOriginalFailure('FINAL_PROGRESS_UNION_BIRTH_UNPROVED');
      const row=await openSourceOutputRow(owner,phase.outputPath,path.join(phase.outputPath,file.relative),{bytes:file.bytes,sha256:file.sha256});
      if(['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].some(key=>String(row.stat[key])!==closed.identity[key])) sourceOriginalFailure('FINAL_PROGRESS_UNION_CHANGED');
      rows.push(row);
    }
    for(const[relative,row]of phase.birthCatalog.directories) directories.push(Object.freeze({path:path.join(phase.outputPath,relative),
      birth:Object.freeze(Object.fromEntries(['dev','ino','mode','nlink'].map(key=>[key,BigInt(row.identity[key])])))}));
    for(const row of rows) await hashSourceOriginalHandle(owner,row);
    const value=Object.freeze({source:bound.source,invocation,receipt,rows:Object.freeze(rows),directories:Object.freeze(directories)});
    const result=Object.freeze({});sourceFinalProgressUnionInputs.set(result,{holder,token,phase,bound,value});
    return result;
  } catch(error) {if(phase)phase.firstFailure??=[error];throw keepSourceOriginalFailure(owner,phase&&phase.firstFailure!==null?phase.firstFailure[0]:error);}
}
export async function sourceProgressUnionFinalCleanupInput(holder,token,reference) {
  const input=sourceFinalOwnerCloseInput(holder,token),stored=sourceFinalProgressUnionInputs.get(reference);
  if(input.phase!=='ARMED' || !stored || stored.holder!==holder || stored.token!==token
    || stored.phase.owner!==input.owner || stored.phase.firstFailure!==null
    || sourceProgressUnionPhases.get(stored.value.invocation)!==stored.phase
    || sourceProgressUnionResults.get(stored.phase.proof)!==stored.phase) sourceOriginalFailure('FINAL_PROGRESS_UNION_REFERENCE_REQUIRED');
  for(const row of stored.value.rows)await hashSourceOriginalHandle(input.owner,row);
  return stored.value;
}

export async function prepareSourceProgressTemporaryCleanup(holder, token, reference) {
  // P final token + S opaque actual-factory reference + K born journal only.
  const input = sourceFinalOwnerCloseInput(holder, token), owner = sourceOriginalOwner(holder);
  if (input.phase !== 'ARMED') sourceOriginalFailure('FINAL_PROGRESS_TEMP_NOT_ARMED');
  const source = await import('./weather-component-progress-cache.mjs');
  const value = await source.sourceProgressTemporaryCleanupInput(holder, token, reference);
  const context = sourceOriginalCpInvocations.get(value.invocation);
  if (!context || context.owner !== owner || sourceProgressCpContexts.get(value.context) !== context
    || context.context !== value.context || context.state.kind !== 'progress'
    || context.token === undefined || context.state.packInvocation !== value.invocation
    || context.input.temporary.folder !== value.root || context.parentStat !== value.rootIdentity
    || context.stage !== value.output.root || context.stageIdentity !== value.output.rootIdentity) sourceOriginalFailure('FINAL_PROGRESS_TEMP_OWNER_CHANGED');
  await assertSourceCpPackClosureForFinalOwner(holder, value.invocation);
  const born = new Map();
  for (const row of value.directories) {
    const relative = path.relative(value.root, row.path);
    if (born.has(row.path) || !row.birth || relative.startsWith('..') || path.isAbsolute(relative)) sourceOriginalFailure('FINAL_PROGRESS_TEMP_BIRTH_UNPROVED');
    born.set(row.path, row.birth);
  }
  const catalog = await sourceFinalOwnedCatalog(value.root, value.rootIdentity, value.rows, value.directories);
  if (catalog.directories.length !== born.size || catalog.directories.some(([name, stat]) =>
    !born.has(name) || !sameSourceOriginalStat(stat, born.get(name)))) sourceOriginalFailure('FINAL_PROGRESS_TEMP_BIRTH_CHANGED');
  // Union entries can arrive only through the separate genuine H/P receipt;
  // ordinary unissued/native outputs are never adopted by this S reference.
  return catalog;
}
async function sourceFinalOwnedCatalog(root, rootStat, rows, ownedDirectories = null) {
  if (await fs.realpath(root) !== root) sourceOriginalFailure('FINAL_CLEANUP_ROOT_CHANGED');
  const named = await fs.lstat(root, { bigint: true });
  if (!named.isDirectory() || named.isSymbolicLink() || !sameSourceOriginalStat(rootStat, named)) {
    sourceOriginalFailure('FINAL_CLEANUP_ROOT_CHANGED');
  }
  const files = new Map(), directories = new Map([[root, named]]);
  for (const row of rows) {
    const relative = path.relative(root, row.path);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) sourceOriginalFailure('FINAL_CLEANUP_PATH_INVALID');
    if (files.has(row.path) && (files.get(row.path).sha256 !== row.sha256 || files.get(row.path).bytes !== row.bytes)) {
      sourceOriginalFailure('FINAL_CLEANUP_FILE_CONFLICT');
    }
    files.set(row.path, row);
    let directory = path.dirname(row.path);
    while (directory !== root) {
      const stat = await fs.lstat(directory, { bigint: true });
      if (!stat.isDirectory() || stat.isSymbolicLink()) sourceOriginalFailure('FINAL_CLEANUP_DIRECTORY_CHANGED');
      directories.set(directory, stat); directory = path.dirname(directory);
    }
  }
  if(ownedDirectories!==null) for(const row of ownedDirectories) {
    const relative=path.relative(root,row.path);
    if(!row.birth || relative.startsWith("..") || path.isAbsolute(relative))sourceOriginalFailure("FINAL_CLEANUP_PATH_INVALID");
    const actual=await fs.lstat(row.path,{bigint:true});
    if(!actual.isDirectory() || actual.isSymbolicLink() || !sameSourceOriginalStat(actual,row.birth))sourceOriginalFailure("FINAL_CLEANUP_DIRECTORY_CHANGED");
    directories.set(row.path,actual);
  }
  const observed = new Set();
  async function inspect(directory) {
    for (const name of await fs.readdir(directory)) {
      const file = path.join(directory, name), stat = await fs.lstat(file, { bigint: true });
      if (stat.isSymbolicLink()) sourceOriginalFailure('FINAL_CLEANUP_UNKNOWN_ENTRY');
      if (stat.isDirectory()) {
        if (!directories.has(file) || !sameSourceOriginalStat(stat, directories.get(file))) sourceOriginalFailure('FINAL_CLEANUP_UNKNOWN_ENTRY');
        await inspect(file);
      } else {
        const expected = files.get(file);
        if (!expected || !stat.isFile() || !sameSourceOriginalStat(stat, expected.stat, true)) sourceOriginalFailure('FINAL_CLEANUP_UNKNOWN_ENTRY');
        observed.add(file);
      }
    }
  }
  await inspect(root);
  if (observed.size !== files.size) sourceOriginalFailure('FINAL_CLEANUP_INVENTORY_CHANGED');
  return { root, rootStat: named, files: [...files.values()],
    directories: [...directories].sort((a, b) => b[0].length - a[0].length),
    removed: [], pending: null, firstFailure: null, completed: false };
}
async function removeSourceFinalOwnedCatalog(catalog) {
  if (catalog.firstFailure !== null) throw catalog.firstFailure[0];
  if (catalog.completed || catalog.pending) sourceOriginalFailure('FINAL_CLEANUP_REUSED');
  try {
    for (const row of catalog.files) {
      for (const [directory, stat] of catalog.directories) {
        const actual = await fs.lstat(directory, { bigint: true });
        if (!actual.isDirectory() || actual.isSymbolicLink() || !sameSourceOriginalStat(actual, stat)) sourceOriginalFailure('FINAL_CLEANUP_DIRECTORY_CHANGED');
      }
      const named = await fs.lstat(row.path, { bigint: true });
      if (!named.isFile() || named.isSymbolicLink() || !sameSourceOriginalStat(named, row.stat, true)) sourceOriginalFailure('FINAL_CLEANUP_FILE_CHANGED');
      catalog.pending = row.path;
      await fs.unlink(row.path);
      catalog.removed.push(row.path); catalog.pending = null;
    }
    for (const [directory, stat] of catalog.directories) {
      const named = await fs.lstat(directory, { bigint: true });
      if (!named.isDirectory() || named.isSymbolicLink() || !sameSourceOriginalStat(named, stat)) sourceOriginalFailure('FINAL_CLEANUP_DIRECTORY_CHANGED');
      catalog.pending = directory;
      await fs.rmdir(directory); // Never recursive: any unexpected entry stops cleanup.
      catalog.removed.push(directory); catalog.pending = null;
    }
    catalog.completed = true;
  } catch (error) {
    if (catalog.firstFailure === null) catalog.firstFailure = [error];
    throw catalog.firstFailure[0]; // Unknown unlink/rmdir outcome is never retried.
  }
}
export function sourceFinalOwnerCloseInput(holder, token) {
  const input = sourceFinalOwnerCloseTokens.get(token), owner = sourceOriginalOwner(holder);
  if (!input || input.holder !== holder || input.owner !== owner || owner.finalOwnerRelease !== input
    || !['ARMED', 'CLOSING', 'CLEANUP'].includes(input.phase) || input.firstFailure !== null) {
    sourceOriginalFailure('FINAL_OWNER_CLOSE_NOT_ISSUED');
  }
  input.deadline = Math.min(input.deadline, assertPrivateSourceJobDeadline(holder).deadline);
  return input;
}
function sourceFinalOwnedPReaderRows(owner, state, prelude) {
  const rows = [...owner.bundles.flatMap(bundle => [...bundle.rows.values()]),
    ...(owner.operationReaders ?? []), ...(owner.workingReaders ?? []),
    ...(owner.workingGeneration?.rows ?? []), ...(state.initialRows ?? []),
    ...(state.normalGeneration?.rows ?? []), ...(prelude.readers ?? []),
    ...(prelude.handoff?.readers ?? []), ...(state.artifact?.inputs?.values() ?? []),
    ...(state.artifact?.readers ?? []), ...(state.artifact?.outputRows ?? [])];
  for (const mapping of [owner.workingPreservation, owner.dmiWorkingPreservation, owner.normalWorkingPreservation, owner.normalAuxiliary]) {
    if (mapping) rows.push(...mapping.values());
  }
  for (const row of [owner.normalBase, owner.normalRestoredDescription,
    owner.normalDeployedCopy?.row, state.artifact?.staging?.expectedRow,
    state.artifact?.staging?.checkpointRow, state.artifact?.staging?.outputRow]) if (row?.handle) rows.push(row);
  return sourceFinalDistinctReaderRows(rows.map(row => sourceRetainedWorkingRow(owner, row)));
}
async function assertSourceFinalPublication(holder, operation, input) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const issued = assertPrivateSourceJobDeadline(holder), prelude = issued.normalPrelude;
  const artifact = state.artifact, staging = artifact?.staging, publication = artifact?.publication;
  if (owner !== input.owner || owner.phase !== 'READY' || owner.activeReads.size
    || issued.normalDriver?.operation !== operation || issued.normalDriver.tail !== operation
    || issued.normalDriver.firstFailure !== null || !prelude || prelude.holder !== holder
    || prelude.firstFailure !== null || prelude.inFlight !== null
    || state.firstFailure !== null || state.firstNormalFailure !== null || state.finalSaveFailure !== null
    || state.normalPhase || state.saveInFlight || !state.normalTailSettled
    || !artifact?.completed || artifact.owner !== owner || artifact.operation !== operation
    || artifact.firstFailure !== null || artifact.verified?.verified !== true
    || !staging?.outputRow || staging.firstFailure !== null || !publication
    || publication.firstFailure !== null || !publication.uploadAck || !publication.checkpointAck || !publication.privateAck) {
    sourceOriginalFailure('FINAL_DURABLE_PUBLICATION_UNPROVED');
  }
  sourcePostWeatherCacheOutcomes(state);
  for (const phase of prelude.phases) {
    if (sourcePreludePhases.get(phase)?.holder !== holder || phase.firstFailure !== null
      || !phase.completed || !phase.transportClosed || !phase.controlCloseObserved
      || phase.controlCloseFailure !== null || phase.received.length) sourceOriginalFailure('FINAL_PRELUDE_STOP_UNPROVED');
  }
  for (const phase of state.normalPhases ?? []) {
    if (sourceNormalPhases.get(phase.phaseOperation) !== phase || phase.holder !== holder
      || phase.firstFailure !== null || !phase.completed || !phase.transportClosed
      || !phase.controlCloseObserved || phase.controlCloseFailure !== null || phase.received.length) {
      sourceOriginalFailure('FINAL_NORMAL_STOP_UNPROVED');
    }
  }
  for (const phase of state.savePhases ?? []) {
    if (!phase.completed || phase.firstFailure !== null || phase.controlCloseFailure !== null
      || !phase.controlCloseObserved || phase.received.length
      || state.savedPhases?.get(phase.selection) !== phase) sourceOriginalFailure('FINAL_SAVE_STOP_UNPROVED');
  }
  if (!state.controlCloseObserved || state.controlCloseFailure !== null
    || owner.originalTargetRegistryPhase && (!owner.originalTargetRegistryPhase.completed
      || !owner.originalTargetRegistryPhase.transportClosed)) sourceOriginalFailure('FINAL_PRODUCER_STOP_UNPROVED');
  for (const [phase, ack] of [[publication.upload, publication.uploadAck],
    [publication.checkpoint, publication.checkpointAck], [publication.private, publication.privateAck]]) {
    if (!phase?.completed || !phase.transportClosed || phase.result?.exitCode !== 0
      || phase.firstFailure !== null || !same(phase.result.outputs, ack)) sourceOriginalFailure('FINAL_DURABLE_ACK_CHANGED');
  }
  // Keep the exact normal successful-publication bindings, never regenerate an ACK.
  if (publication.uploadAck.sealed_sha !== staging.outputRow.sha256
    || publication.uploadAck.sealed_bytes !== String(staging.outputRow.bytes)
    || publication.checkpointAck.checkpoint_reference !== state.lockedTarget
    || publication.checkpointAck.checkpoint_bundle !== artifact.verified.modelBinding.modelBundleSha256
    || publication.checkpointAck.checkpoint_contract !== artifact.verified.modelBinding.modelContractSha256
    || publication.privateAck.private_bundle !== artifact.verified.bundleContentSha256
    || publication.privateAck.private_reference !== state.lockedTarget
    || publication.privateAck.private_anonymous_denied !== 'true') sourceOriginalFailure('FINAL_DURABLE_ACK_CHANGED');
  if ((prelude.writers ?? []).some(row => row.closed !== true)
    || artifact.dispositionWrite?.closed !== true) sourceOriginalFailure('FINAL_WRITER_STOP_UNPROVED');
  await assertSourceOriginalProgress(holder);
  await assertSourceNormalGeneration(holder, operation);
  for (const row of input.pRows) await hashSourceOriginalHandle(owner, row);
  await assertSourceCpPackClosureForFinalOwner(holder, owner.preparedInstall?.packInvocation);
  await reconfirmSourceNormalMain(holder);
  return state;
}
async function finalizeSourceNormalOwner(holder, operation) {
  const owner = sourceOriginalOwner(holder);
  if (owner.finalOwnerRelease) sourceOriginalFailure('FINAL_OWNER_RELEASE_REUSED');
  const input = { holder, operation, owner, phase: 'CHECKING', firstFailure: null,
    deadline: assertPrivateSourceJobDeadline(holder).deadline,
    pRows: [], rows: [], closedReaders: [], progress: null, cleanup: [] };
  owner.finalOwnerRelease = input; // Retain before any failed gate or awaited work.
  try {
    const state = sourceDmiWorkingState(holder, operation), issued = assertPrivateSourceJobDeadline(holder);
    input.pRows = sourceFinalOwnedPReaderRows(owner, state, issued.normalPrelude);
    await assertSourceFinalPublication(holder, operation, input);
    const token = Object.freeze({});
    input.phase = 'ARMED'; sourceFinalOwnerCloseTokens.set(token, input);
    const progress = await import('./weather-component-progress-cache.mjs');
    input.progress = await progress.prepareSourceProgressFinalOwnerClose(holder, token);
    input.rows = sourceFinalDistinctReaderRows([...input.pRows, ...input.progress.rows]);
    input.cleanup = [...input.progress.cleanup, ...await sourceOriginalInstallCleanupCatalog(holder)];
    input.pRows = sourceFinalOwnedPReaderRows(owner, state, issued.normalPrelude);
    input.rows = sourceFinalDistinctReaderRows([...input.pRows, ...input.progress.rows]);
    // The final full input hash pass precedes the FIRST physical reader close.
    await assertSourceFinalPublication(holder, operation, input);
    for (const row of input.rows) await hashSourceOriginalHandle(owner, row);
    await progress.assertSourceProgressFinalOwnerClose(holder, token, input.progress);
    const workflowObservation=captureSourcePreparedWorkflowObservation(holder,operation);
    input.phase = 'CLOSING';
    for (const row of input.rows) {
      const journal = { row, fd: null, closeAttempted: false, closed: false, firstFailure: null };
      input.closedReaders.push(journal);
      await closeSourceFinalReader(row, journal);
    }
    await progress.finishSourceProgressFinalReaders(holder, token, input.progress);
    input.phase = 'CLEANUP';
    for (const catalog of input.cleanup) await removeSourceFinalOwnedCatalog(catalog);
    await progress.finishSourceProgressFinalOwnerClose(holder, token, input.progress);
    // No awaited work can follow this last private commit. Original B/S and
    // working runtime files were never cleanup targets. No public T/Pages ACK.
    input.phase = 'RELEASED'; state.completed = true; owner.activeOperation = null;
    owner.phase = 'RELEASED'; retainedSourceOriginalOwners.delete(owner);
    sourceFinalOwnerCloseTokens.delete(token);
    sourceNormalWorkflowObservations.set(operation,workflowObservation);
    return operation;
  } catch (error) {
    if (input.firstFailure === null) input.firstFailure = [error];
    input.phase = 'RETAINED';
    throw keepSourceOriginalFailure(owner, input.firstFailure[0]);
  }
}

async function runSourceSaveCohort(holder, operation, selection) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const issued = assertPrivateSourceJobDeadline(holder);
  if (!['raw', 'cipher', 'wam', 'checkpoint', 'preflight'].includes(selection) || !state.outputGeneration
    || owner.dmiOutputGeneration !== state.outputGeneration
    || !state.controlCloseObserved || !state.result
    || process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24'
    || !issued.normalRoute || !issued.normalCacheGeneration
    || state.normalPhase || state.saveInFlight || state.savedPhases?.has(selection)) sourceOriginalFailure('SAVE_PHASE_NOT_AVAILABLE');
  const phase = { selection, child: null, control: null, received: Buffer.alloc(0),
    firstFailure: null, controlCloseRequested: false, controlCloseObserved: false,
    controlCloseFailure: null, receipt: null, completed: false };
  (state.savePhases ??= []).push(phase); // retain actual references before launch
  state.saveInFlight = phase;
  const fail = error => {
    if (phase.firstFailure === null) phase.firstFailure = [error];
    requestSourceFailureTighten(state, phase, issued.deadline, phase.firstFailure[0]);
    return keepSourceOriginalFailure(owner, phase.firstFailure[0]);
  };
  try {
    await assertSourceOriginalProgress(holder);
    const generation = await assertSourceNormalGeneration(holder, operation);
    if (selection === 'checkpoint' || selection === 'preflight') {
      const relative = selection === 'checkpoint' ? '.cache/ravscore-continuation-checkpoint/checkpoint.json'
        : '.cache/weather-preflight-state/state.json';
      const rows = generation.rows.filter(row => row.path === path.join(owner.context.repository, relative));
      if (rows.length !== 1 || rows[0].bytes < 2
        || rows[0].bytes > (selection === 'checkpoint' ? 16 * 1024 * 1024 : 64 * 1024)) sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
      phase.cacheRow = rows[0];
      await hashSourceOriginalHandle(owner, phase.cacheRow);
    }
    if (selection === 'wam') await prepareSourceNormalWam(holder, operation, phase);
    const code = selection === 'raw' ? 1 : selection === 'cipher' ? 2 : selection === 'wam' ? 3 : selection === 'checkpoint' ? 4 : 5;
    // Normal success keeps the job cutoff. Failure seal and upload share ONE
    // already latched cutoff; upload receives only its remainder, never now+D.
    const parentCutoff = Math.min(assertPrivateSourceJobDeadline(holder).deadline,
      state.failureWorker?.cutoff ?? issued.deadline, sourceFailureWorkCutoff(state, issued));
    if (!(parentCutoff > performance.now())) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
    const nonce = crypto.randomBytes(32), challenge = Buffer.alloc(80);
    challenge.write('RRSCG4C1', 0, 'ascii'); nonce.copy(challenge, 8);
    challenge.writeUInt32BE(process.pid, 40);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ID), 44);
    challenge.writeBigUInt64BE(BigInt(issued.identity.GITHUB_RUN_ATTEMPT), 52);
    Buffer.from(issued.identity.GITHUB_SHA, 'hex').copy(challenge, 60);
    const child = sourceCohortSpawn('python', ['-I', '-B',
      path.join(PRIVATE_RUNTIME_REPOSITORY_ROOT, 'scripts/lib/copernicus_component_process.py'),
      '--source-normal-phase-cohort'], { cwd: PRIVATE_RUNTIME_REPOSITORY_ROOT,
      env: Object.freeze({ ...process.env }), stdio: ['ignore', 'inherit', 'inherit', 'pipe',
        ...(selection === 'wam' ? phase.wamRows.map(row => row.handle.fd) : [])] });
    phase.child = child; phase.control = child.stdio[3];
    if (!phase.control) sourceOriginalFailure('CHILD_CLOCK_PIPE_REQUIRED');
    const control = phase.control;
    control.once('close', () => { phase.controlCloseObserved = true; });
    await new Promise((resolve, reject) => {
      let step = 'anchor', timer;
      const rejectOwned = error => { clearTimeout(timer); reject(fail(error)); };
      child.on('error', rejectOwned); control.on('error', rejectOwned);
      control.on('data', chunk => {
        if (phase.firstFailure !== null) return;
        try {
          phase.received = Buffer.concat([phase.received, chunk]);
          if (phase.received.length > 56 + 48 + 45 + 4096) sourceOriginalFailure('SAVE_PHASE_FRAME_INVALID');
          for (;;) {
            const pending = phase.received;
            let length = step === 'anchor' ? 56 : step === 'bounded' ? 48 : 45;
            if (pending.length < length) return;
            if (!pending.subarray(8, 40).equals(nonce)) sourceOriginalFailure('SAVE_PHASE_FRAME_INVALID');
            if (step === 'anchor') {
              if (pending.length !== 56 || pending.toString('ascii', 0, 8) !== 'RRSCG4A1'
                || pending.readUInt32BE(40) !== child.pid || pending.readUInt32BE(44) !== process.pid) sourceOriginalFailure('CHILD_CLOCK_IDENTITY_CHANGED');
              const fresh = assertPrivateSourceJobDeadline(holder);
              phase.after = performance.now(); phase.anchor = pending.readBigUInt64BE(48);
              if (phase.before > phase.after || phase.after >= parentCutoff) sourceOriginalFailure('CHILD_CLOCK_EXPIRED');
              phase.cutoff = sourceChildAbsoluteCutoff(Math.min(parentCutoff, fresh.deadline), phase.after, phase.anchor);
              phase.failureClock = Object.freeze({ nonce, phase: code, after: phase.after,
                anchor: phase.anchor, parentCutoff: Math.min(parentCutoff, fresh.deadline) });
              const frame = Buffer.alloc(56);
              frame.write('RRSCG4D1', 0, 'ascii'); nonce.copy(frame, 8);
              frame.writeBigUInt64BE(phase.cutoff, 40); frame.writeBigUInt64BE(phase.cutoff, 48);
              phase.received = pending.subarray(length); step = 'bounded';
              control.write(frame, error => { if (error) rejectOwned(error); });
            } else if (step === 'bounded') {
              if (pending.toString('ascii', 0, 8) !== 'RRSCG4B1'
                || pending.readBigUInt64BE(40) !== phase.cutoff) sourceOriginalFailure('SAVE_PHASE_FRAME_INVALID');
              phase.received = pending.subarray(length); step = 'receipt';
              const selector = Buffer.concat([Buffer.from([code]), Buffer.from(issued.normalCacheGeneration, 'ascii')]);
              if (selector.length !== 9) sourceOriginalFailure('CACHE_GENERATION_INVALID');
              const selected = selection === 'wam' ? Buffer.concat([selector, phase.wamFrame]) : selector;
              control.write(selected, error => { if (error) rejectOwned(error); });
            } else if (step === 'receipt') {
              if (pending.toString('ascii', 0, 8) !== 'RRSPG4E1' || pending[40] !== code) sourceOriginalFailure('SAVE_PHASE_FRAME_INVALID');
              const bodyLength = pending.readUInt32BE(41);
              if (bodyLength < 2 || bodyLength > 4096) sourceOriginalFailure('SAVE_PHASE_FRAME_INVALID');
              length += bodyLength;
              if (pending.length < length) return;
              phase.receipt = JSON.parse(pending.subarray(45, length).toString('utf8'));
              phase.received = pending.subarray(length); step = 'closing';
            } else sourceOriginalFailure('SAVE_PHASE_FRAME_INVALID');
          }
        } catch (error) { rejectOwned(error); }
      });
      control.on('end', () => {
        if (step !== 'closing' || phase.received.length) rejectOwned(new Error('SOURCE_ORIGINAL_SAVE_PIPE_LOST'));
      });
      child.once('close', (exitCode, signal) => {
        clearTimeout(timer);
        if (phase.firstFailure !== null) { reject(phase.firstFailure[0]); return; }
        if (step !== 'closing' || phase.received.length || !phase.controlCloseObserved
          || exitCode !== 0 || signal !== null || performance.now() >= parentCutoff) {
          rejectOwned(new Error('SOURCE_ORIGINAL_SAVE_COHORT_UNPROVED')); return;
        }
        resolve();
      });
      timer = setTimeout(() => rejectOwned(new Error('SOURCE_ORIGINAL_SAVE_COHORT_UNPROVED')),
        Math.max(0, Math.ceil(parentCutoff - performance.now())));
      phase.before = performance.now();
      control.write(challenge, error => { if (error) rejectOwned(error); });
    });
    if (selection === 'wam') return await finishSourceNormalWam(holder, operation, phase);
    const expectedKey = selection === 'raw'
      ? `dmi-grib-v4-Linux-${issued.normalCacheGeneration}-${issued.identity.GITHUB_RUN_ID}-${issued.identity.GITHUB_RUN_ATTEMPT}`
      : selection === 'checkpoint' ? `ravscore-continuation-schema6-v2-${issued.identity.GITHUB_RUN_ID}-${issued.identity.GITHUB_RUN_ATTEMPT}`
        : selection === 'preflight' ? `weather-preflight-state-v1-Linux-${issued.identity.GITHUB_RUN_ID}-${issued.identity.GITHUB_RUN_ATTEMPT}`
          : `weather-private-progress-encrypted-v2-Linux-main-${issued.identity.GITHUB_RUN_ID}-${issued.identity.GITHUB_RUN_ATTEMPT}`;
    const receipt = phase.receipt;
    const closedFailure = receipt?.schemaVersion === 1 && receipt.kind === 'SOURCE_SAVE_CLOSED_FAILURE';
    if (closedFailure) {
      if (Object.keys(receipt).sort().join(',') !== 'interrupted,kind,operation,reason,schemaVersion,stage'
        || receipt.operation !== (selection === 'raw' ? 'save' : selection === 'cipher' ? 'cipher' : selection)
        || typeof receipt.interrupted !== 'boolean' || !/^[A-Z_]{1,32}$/.test(receipt.stage)
        || !/^[A-Z0-9_]{1,96}$/.test(receipt.reason)) sourceOriginalFailure('SAVE_PHASE_FAILURE_INVALID');
      await assertSourceOriginalProgress(holder);
      await assertSourceNormalGeneration(holder, operation);
      sourceDmiWorkingState(holder, operation);
      const failure = new Error('SOURCE_NORMAL_CACHE_SAVE_FAILED');
      // New parent error identifies its observed failed child phase. It does
      // not pretend to transport the child's raw JS object across processes.
      failure.phase = selection; failure.sourceReason = receipt.reason;
      phase.receipt = freezeSourceOriginalMetadata(receipt);
      phase.semanticFailure = [failure]; phase.completed = true;
      const diagnosticPreflight = selection === 'preflight' && receipt.interrupted === false
        && receipt.reason === 'SOURCE_CACHE_API_REFUSED';
      if (!diagnosticPreflight) state.firstNormalFailure ??= phase.semanticFailure;
      (state.savedPhases ??= new Map()).set(selection, phase);
      state.saveInFlight = null;
      // An actual interrupt is not an ordinary API refusal/always-save licence.
      if (receipt.interrupted || selection === 'preflight' && !diagnosticPreflight) throw failure;
      return phase;
    }
    if (receipt?.schemaVersion !== 1 || receipt.apiVersion !== '6.1.0' || receipt.key !== expectedKey
      || receipt.kind !== (selection === 'raw' ? 'DMI_RAW_SAVE_V2_FINALIZED' : selection === 'cipher' ? 'WEATHER_CIPHER_V2_FINALIZED'
        : selection === 'checkpoint' ? 'SOURCE_CHECKPOINT_CACHE_V2_FINALIZED' : 'SOURCE_PREFLIGHT_CACHE_V2_FINALIZED')
      || receipt.path !== (selection === 'raw' ? '.cache/dmi-grib' : selection === 'cipher' ? '.cache/weather-private-progress.encrypted'
        : selection === 'checkpoint' ? '.cache/ravscore-continuation-checkpoint' : '.cache/weather-preflight-state')
      || !Number.isSafeInteger(receipt.cacheId) || receipt.cacheId <= 0) sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
    if (selection === 'cipher' && (!Number.isSafeInteger(receipt.bytes) || receipt.bytes <= 0
      || !/^[0-9a-f]{64}$/.test(receipt.sha256 ?? '') || !state.sealedCipher
      || receipt.bytes !== state.sealedCipher.bytes || receipt.sha256 !== state.sealedCipher.sha256)) sourceOriginalFailure('SAVE_PHASE_SEAL_CHANGED');
    if ((selection === 'checkpoint' || selection === 'preflight')
      && (Object.keys(receipt).sort().join(',') !== 'apiVersion,bytes,cacheId,key,kind,path,schemaVersion,sha256'
        || receipt.bytes !== phase.cacheRow.bytes || receipt.sha256 !== phase.cacheRow.sha256)) sourceOriginalFailure('SAVE_PHASE_SEAL_CHANGED');
    await assertSourceOriginalProgress(holder);
    await assertSourceNormalGeneration(holder, operation);
    sourceDmiWorkingState(holder, operation);
    // No await between final provenance checks and local phase publication.
    phase.receipt = freezeSourceOriginalMetadata(receipt);
    phase.completed = true;
    (state.savedPhases ??= new Map()).set(selection, phase);
    state.saveInFlight = null;
    return phase;
  } catch (error) { throw fail(error); }
}

function sourcePostWeatherCacheOutcomes(state) {
  const cache = state.artifact?.cacheState;
  const outcome = selection => {
    const phase = cache?.[selection];
    if (!phase?.completed || phase.firstFailure !== null || !phase.controlCloseObserved
      || phase.controlCloseFailure !== null || phase.received.length
      || state.savedPhases?.get(selection) !== phase) sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
    if (phase.semanticFailure) {
      if (selection !== 'preflight' || phase.receipt?.kind !== 'SOURCE_SAVE_CLOSED_FAILURE'
        || phase.receipt.operation !== 'preflight' || phase.receipt.interrupted !== false
        || phase.receipt.reason !== 'SOURCE_CACHE_API_REFUSED') sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
      return 'failure';
    }
    if (phase.receipt?.kind !== (selection === 'checkpoint' ? 'SOURCE_CHECKPOINT_CACHE_V2_FINALIZED'
      : 'SOURCE_PREFLIGHT_CACHE_V2_FINALIZED') || phase.receipt.cacheId <= 0
      || phase.receipt.bytes !== phase.cacheRow.bytes || phase.receipt.sha256 !== phase.cacheRow.sha256) sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
    return 'success';
  };
  if (!cache?.completed || outcome('checkpoint') !== 'success') sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
  const built = sourceWorkflowClosedOutcome(cache.preflightBuild);
  if (built === 'failure' && cache.preflight !== null || built === 'success' && cache.preflight === null) sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
  return { checkpoint: 'success', preflightBuild: built,
    preflightSave: built === 'success' ? outcome('preflight') : 'skipped' };
}

async function runSourceNormalPostWeatherCaches(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), artifact = state.artifact;
  if (!artifact?.currentControls?.completed || artifact.currentControls.firstSafetyFailure !== null
    || artifact.cacheState || !artifact.publication?.uploadAck || artifact.publication.private !== null
    || artifact.publication.checkpoint !== null || state.normalPhase || state.saveInFlight) sourceOriginalFailure('SAVE_PHASE_NOT_AVAILABLE');
  const cache = { checkpoint: null, preflightBuild: null, preflight: null, completed: false };
  artifact.cacheState = cache; // Single actual attempt retained before any work.
  cache.checkpoint = await runSourceSaveCohort(holder, operation, 'checkpoint');
  if (cache.checkpoint.semanticFailure) throw cache.checkpoint.semanticFailure[0];
  cache.preflightBuild = await runSourceNormalProgram(holder, operation, 'preflightState');
  if (cache.preflightBuild.result.exitCode === 0) {
    const generation = await assertSourceNormalGeneration(holder, operation);
    const row = generation.rows.find(value => value.path === path.join(state.owner.context.repository, sourcePreludeInputRoutes.cachedState));
    if (!row || row.bytes > 64 * 1024) sourceOriginalFailure('SAVE_PHASE_ACK_INVALID');
    const document = JSON.parse((await sourceNormalRowBytes(holder, row, 64 * 1024)).toString('utf8'));
    const publicManifest = await sourceArtifactJson(holder, operation, 'data/live/manifest.json');
    const { validatePrivateRuntimePreflightState } = await import('./private-production-runtime-workflow.mjs');
    await validatePrivateRuntimePreflightState(document, { repositoryRoot: state.owner.context.repository,
      publicManifest: publicManifest.value });
    cache.preflight = await runSourceSaveCohort(holder, operation, 'preflight');
  }
  await assertSourceNormalGeneration(holder, operation);
  cache.completed = true;
  sourcePostWeatherCacheOutcomes(state);
}

// INTERNAL SOURCE adapter. The only issuer is the lexical A2 WeakMap above.
// The normal installer is not replaced: its working bytes must match the SAME
// authenticated B handles before S is allowed to read or merge anything.
export async function sourceOriginalProgressResumeRequest(holder, result) {
  const owner = sourceOriginalOwner(holder), issued = assertPrivateSourceJobDeadline(holder);
  if (sourceOriginalResultOwners.get(result) !== owner || !owner.preparedInstall?.completed
    || !owner.progressBinding || owner.activeOperation || owner.workingGeneration
    ) sourceOriginalFailure('ORIGINAL_TARGET_NOT_AVAILABLE');
  await assertSourceOriginalProgress(holder);
  if (!issued.normalRoute) return Object.freeze({ checkpointOnly: false,
    target: owner.progressBinding.productionReferenceAt });
  if (issued.normalPrelude?.normalProgress?.pending !== true) sourceOriginalFailure('ORIGINAL_TARGET_NOT_AVAILABLE');
  const request = issued.normalRoute.request;
  if (request.checkpointOnly && (request.quick
    || sourceNormalUtcHour(request.checkpointTargetHour) !== issued.normalPrelude.productionTarget)) {
    sourceOriginalFailure('ORIGINAL_TARGET_REQUEST_CHANGED');
  }
  return Object.freeze({ checkpointOnly: request.checkpointOnly,
    target: request.checkpointOnly ? issued.normalPrelude.productionTarget : owner.progressBinding.productionReferenceAt });
}


export async function assertSourceOriginalProgress(holder) {
  const owner = sourceOriginalOwner(holder);
  if (owner.phase !== 'READY' || !owner.progressBinding || owner.activeReads.size) sourceOriginalFailure('PROGRESS_NOT_BOUND');
  try {
    // Revalidate both originals in a pair, including the complete historical B.
    // Never replace them or reread a moving pointer to repair a late failure.
    for (const bundle of owner.bundles) for (const row of bundle.rows.values()) await hashSourceOriginalBundleRow(owner, row);
    for (const row of owner.workingReaders) await hashSourceOriginalHandle(owner, sourceRetainedWorkingRow(owner, row));
    if (owner.workingGeneration) for (const row of owner.workingGeneration.rows) await hashSourceOriginalHandle(owner, sourceRetainedWorkingRow(owner, row));
    if (owner.normalDeployedCopy?.completed) await hashSourceOriginalHandle(owner, owner.normalDeployedCopy.row);
    for (const row of owner.normalDonorRows ?? []) await hashSourceOriginalHandle(owner, row);
    for (const row of owner.normalAuxiliary?.values() ?? []) {
      if (!row.complete) sourceOriginalFailure('NORMAL_COMPARISON_INCOMPLETE');
      await hashSourceOriginalHandle(owner, row);
    }
    return owner.progressBinding;
  } catch (error) { throw keepSourceOriginalFailure(owner, error); }
}
export function retainSourceOriginalProgressFailure(holder, error) {
  const state = sourceJobDeadlineBrands.get(holder);
  if (!state?.originalOwner || state.originalOwner.holder !== holder) sourceOriginalFailure('OWNER_REQUIRED');
  return keepSourceOriginalFailure(state.originalOwner, error);
}


// Deliberately NO release/exported retained flag. Same-handle EOF proves this
// read only, not a future producer/cohort's cessation. S/cohort admission must
// supply its own reviewed physical closure before originals may be released.


// 4.0.478 changed only DMI's time-sharing, not the persisted weather format.
// That producer file is included in the broad full-runtime source fingerprint,
// so the last 4.0.477 generation needs one exact, expiring transition. Never
// extend this to a model, continuation, public projection or arbitrary cache.
export const DMI_SCHEDULER_ONLY_PREDECESSOR = Object.freeze({
  sourceHead: '2bafe6c6e92f3531b802785b3fc8d3237c88d4e8',
  datasetId: 'rr-20260923170622-210',
  productionReferenceAt: '2026-09-23T16:00:00.000Z',
  fullRuntimeContractSha256: 'cf7517e3ed5c5dc7cf4894a434809ea796dffb32a09ed9c9eb49aebeffbb115c',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.480 changes only derivation across adjacent DKSS-LF model runs. The
// 4.0.479 production generation remains a valid native-weather donor. Admit
// that one immutable generation, never a general version/hash mismatch.
export const DMI_MARINE_SEAM_PREDECESSOR = Object.freeze({
  sourceHead: '888d3c045e0a567db2d348f26837451b2118a9df',
  datasetId: 'rr-20260923215727-210',
  productionReferenceAt: '2026-09-23T21:00:00.000Z',
  fullRuntimeContractSha256: 'ba83fcc2049f3ec8ef624f86f9651fc96372de0cc556f80f6e72cddaef313c0a',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.481 changes only native DMI acquisition order and adds an optional
// Copernicus next-run cache refresh. The already deployed 4.0.480 weather
// package is the sole approved predecessor, with unchanged model/state and
// public projection contracts. This is not a general source-hash bypass.
export const WEATHER_ROTATION_PREDECESSOR = Object.freeze({
  sourceHead: '38fa4c27d8ac6b1c942b807f8a36886fa0a87a8a',
  datasetId: 'rr-20260924012618-210',
  productionReferenceAt: '2026-09-24T00:00:00.000Z',
  fullRuntimeContractSha256: '2c9025dd13bed8dfd575ce09f354df579f3e9834dc82688691daf66f5bcd48f1',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.485 changes only the hourly selection of already verified marine
// components. The last deployed 4.0.484 generation is the sole approved
// donor; its immutable archive and payload hashes are still checked in full.
export const MARINE_COMPONENT_PREDECESSOR = Object.freeze({
  sourceHead: 'eec1f0d8d56cc00d74c75a087efcb36191a56832',
  datasetId: 'rr-20260924084821-210',
  productionReferenceAt: '2026-09-24T07:00:00.000Z',
  fullRuntimeContractSha256: 'd86a0b1b9e18ee1b3dc9cff56d85b5939f37dadc33b6c57a8fcca65491160640',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.487 changed the weather builder without changing the persisted model,
// continuation or public projection. Its first run could not restore this
// complete 4.0.485 generation and published a thinner stateless replacement.
// Only the exact, still-protected complete generation may bridge that mistake.
export const COMPLETE_WEATHER_PREDECESSOR = Object.freeze({
  sourceHead: 'cc45e97178a64406bdf3ab5401d8a3ae0f618891',
  datasetId: 'rr-20260924122409-210',
  productionReferenceAt: '2026-09-24T11:00:00.000Z',
  fullRuntimeContractSha256: '70fbfd0722ae1cee58340b0112b51d2f661c1c4493a4e778ad8729edab525e9c',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// This newer generation is not interchangeable with the 11Z predecessor:
// both contain independently useful weather values. The bounded recovery
// verifies both original private payloads, continues from the stronger 11Z
// baseline and checks the new artifact against both generations before
// publishing. A public Pages pack is never a native-data donor.
export const LATEST_WEATHER_PREDECESSOR = Object.freeze({
  sourceHead: 'b1b88e0f61b751cc91bdb09120dc895abc99cb65',
  datasetId: 'rr-20260924163002-210',
  productionReferenceAt: '2026-09-24T15:00:00.000Z',
  fullRuntimeContractSha256: '110c1451730a6dcae1d43451197f0886292a9ddb60b1a0ed59aa4fb24ddbaba0',
  continuationStateContractSha256: 'd2227fe5e5d5a157099d05bdbbc42cbb4b0d3535b7b45fefa4260a27e81d4587',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// 4.0.501 changes only the private on-disk representation of zone-hour rows.
// The last public 4.0.500 generation is the sole v1 donor. Its encrypted
// archive, file hashes, identity, model and unaffected contracts must still
// verify; this bridge does not authorize arbitrary old or incomplete caches.
export const PRIVATE_HOURLY_V1_PREDECESSOR = Object.freeze({
  sourceHead: 'd1a8f99051d3d5ede3bf6d3da0d756e5802944ae',
  datasetId: 'rr-20260927025504-210',
  productionReferenceAt: '2026-09-27T02:00:00.000Z',
  fullRuntimeContractSha256: '5f3fe27c06ea13433c5d9cf02f02a145b19742e4aef149e4bcb6041349b39de9',
  continuationStateContractSha256: '46683362ec6b69835695db375f7de976a8dd0a75b7367a27e2854b653d73e0ab',
  publicProjectionContractSha256: 'be153999db9d196727800ff41a05b6929137392f7bb3a1fdafd19fc13eff37fe',
});

// These two sealed generations use the previous model closure.  Their only
// permitted model-binding difference from the current integrated model is
// the implementation bundle digest; the predecessor source is checked before
// its reader is used to verify the original bytes.
export const EXACT_WEATHER_PAIR_READER_HEAD =
  'b1b88e0f61b751cc91bdb09120dc895abc99cb65';
export const EXACT_WEATHER_PAIR_MODEL_BUNDLE_SHA256 =
  '61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1';

export function isExactHistoricalWeatherPairGeneration(descriptor, expected, approved) {
  const oldBinding = { ...expected?.modelBinding,
    modelBundleSha256: EXACT_WEATHER_PAIR_MODEL_BUNDLE_SHA256 };
  const hashes = descriptor?.contractHashes;
  return descriptor?.sourceHead === approved.sourceHead
    && descriptor?.datasetId === approved.datasetId
    && descriptor?.productionReferenceAt === approved.productionReferenceAt
    && hashes?.fullRuntimeContractSha256 === approved.fullRuntimeContractSha256
    && hashes?.continuationStateContractSha256 === approved.continuationStateContractSha256
    && hashes?.publicProjectionContractSha256 === approved.publicProjectionContractSha256
    && same(descriptor?.modelBinding, oldBinding);
}

function isExactDmiPredecessor(descriptor, expected, approved) {
  const contracts = descriptor?.contractHashes;
  const current = expected?.contractHashes;
  return descriptor?.sourceHead === approved.sourceHead
    && descriptor?.datasetId === approved.datasetId
    && descriptor?.productionReferenceAt === approved.productionReferenceAt
    && contracts?.fullRuntimeContractSha256 === approved.fullRuntimeContractSha256
    && contracts?.continuationStateContractSha256 === approved.continuationStateContractSha256
    && contracts?.publicProjectionContractSha256 === approved.publicProjectionContractSha256
    && contracts?.continuationStateContractSha256 === current?.continuationStateContractSha256
    && contracts?.publicProjectionContractSha256 === current?.publicProjectionContractSha256
    && same(descriptor?.modelBinding, expected?.modelBinding);
}

export function isExactDmiSchedulerPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, DMI_SCHEDULER_ONLY_PREDECESSOR);
}

export function isExactDmiMarineSeamPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, DMI_MARINE_SEAM_PREDECESSOR);
}

export function isExactWeatherRotationPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, WEATHER_ROTATION_PREDECESSOR);
}

export function isExactMarineComponentPredecessor(descriptor, expected) {
  return isExactDmiPredecessor(descriptor, expected, MARINE_COMPONENT_PREDECESSOR);
}

export function isApprovedExactWeatherPredecessor(descriptor, expected) {
  return isExactDmiSchedulerPredecessor(descriptor, expected)
    || isExactDmiMarineSeamPredecessor(descriptor, expected)
    || isExactWeatherRotationPredecessor(descriptor, expected)
    || isExactMarineComponentPredecessor(descriptor, expected)
    || isExactDmiPredecessor(descriptor, expected, COMPLETE_WEATHER_PREDECESSOR)
    || isExactDmiPredecessor(descriptor, expected, PRIVATE_HOURLY_V1_PREDECESSOR);
}

export function isLatestUnpairedWeatherGeneration(descriptor) {
  return descriptor?.sourceHead === LATEST_WEATHER_PREDECESSOR.sourceHead
    && descriptor?.datasetId === LATEST_WEATHER_PREDECESSOR.datasetId
    && descriptor?.productionReferenceAt === LATEST_WEATHER_PREDECESSOR.productionReferenceAt
    && descriptor?.contractHashes?.fullRuntimeContractSha256
      === LATEST_WEATHER_PREDECESSOR.fullRuntimeContractSha256;
}


const sourceNormalMutablePaths = Object.freeze({
  deployedBulkCopy: Object.freeze([SOURCE_DEPLOYED_COPY]),
  legacyCurrentRequests: Object.freeze([SOURCE_LEGACY_REQUEST]),
  protectedQuickPrepare: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate]),
  handoffClosure: Object.freeze([]),
  handoffInstall: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentShadow, PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentSourceStage,
    PRIVATE_WEATHER_COMPONENT_FILES.currentFieldShadow, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentFallback]),
  rawCache: Object.freeze([]),
  currentHistoryPlan: Object.freeze(['.cache/ravscore-continuation-checkpoint/checkpoint.json',
    '.cache/ravscore-current-history-demand.json']),
  generationPrepare: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate,
    PRIVATE_WEATHER_COMPONENT_FILES.dmiActive, 'data/live/dmi-bulk-cache.json']),
  point: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.coastalPointDmi,
    PRIVATE_WEATHER_COMPONENT_FILES.coastalPointState, PRIVATE_WEATHER_COMPONENT_FILES.coastalPointStatus,
    'data/live/coastal-point-staging-status.json']),
  // Actual prepareActivation effects, including its canonical legacy migration.
  // The private staging DMI is a retained READ input, not an extra provider run.
  pointPrepare: Object.freeze(['data/admin/direction-reviews.json', 'data/live/dmi-bulk-cache.json',
    PRIVATE_WEATHER_COMPONENT_FILES.coastalPointState, PRIVATE_WEATHER_COMPONENT_FILES.coastalPointStatus,
    'data/live/coastal-point-staging-status.json', PRIVATE_WEATHER_COMPONENT_FILES.coastalPointActivationState,
    PRIVATE_WEATHER_COMPONENT_FILES.coastalPointPendingPromotion]),
  pointRegistry: Object.freeze(['data/live/coastal-parts-v2.json']),
  waterRegistry: Object.freeze(['data/live/dmi-water-stations.json']),
  active: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.dmiActive]),
  cpTargets: Object.freeze(['.cache/copernicus-current-targets.json']),
  cpInspect: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentSourceStage]),
  cp: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentShadow,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentSourceStage,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentDonorBank,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentSegmentJournal]),
  quality: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentShadow,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentSourceStage,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentDonorBank,
    PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentSegmentJournal]),
  om: Object.freeze([PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentFallback,
    PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentDonorBank]),
  cpStrict: Object.freeze([]),
  qualityStrict: Object.freeze([]),
  advisory: Object.freeze(['.cache/weather-current-acquisition-plan.json']),
  closure: Object.freeze(['.cache/current-operational-closure.json']),
  pilot: Object.freeze(['data/live/current-pilot-history.json']),
  // Weather's normal atomic conditions/hour-pack pair and its existing input
  // banks/cursors are covered together. Unchanged paths remain unchanged rows.
  weather: Object.freeze([...new Set([...PRIVATE_RUNTIME_BASE_FILES.map(row => row.relativePath),
    ...Object.values(PRIVATE_WEATHER_COMPONENT_FILES), '.cache/public-hour-delivery.pack',
    'data/live/public-conditions.json', 'data/live/public-condition-details.json', 'data/live/manifest.json'])]),
  seal: Object.freeze(['.cache/weather-private-progress.encrypted']),
  freshness: Object.freeze([]), activeReady: Object.freeze([]), activePairs: Object.freeze([]),
  activeCopy: Object.freeze(['.cache/dmi-active-complete.json.tmp']),
  activePromote: Object.freeze(['.cache/dmi-active-complete.json.tmp', PRIVATE_WEATHER_COMPONENT_FILES.dmiActive]),
  advisoryRemove: Object.freeze(['.cache/weather-current-acquisition-plan.json']),
  artifactProvenance: Object.freeze(['data/live/conditions.json', 'data/live/dmi-forecast-cache.json']),
  artifactPublic: Object.freeze(['data/live/public-conditions.json', 'data/live/public-condition-details.json', 'data/live/manifest.json']),
  artifactContinuity: Object.freeze([]), artifactPairedContinuity: Object.freeze([]),
  artifactAudit: Object.freeze(['.geometry-v2-work/ravscore-integrated-public-runtime-audit.json']),
  artifactValidate: Object.freeze(['.geometry-v2-work/production-artifact-validation-report.json']),
  artifactRelease: Object.freeze(['.geometry-v2-work/production-release-validation-report.json']), artifactBundle: Object.freeze([]),
  artifactSpec: Object.freeze([PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath, '.cache/private-production-runtime-create-spec.json']),
  artifactCheckpoint: Object.freeze(['.cache/ravscore-continuation-checkpoint/checkpoint.json']),
  artifactFreshness: Object.freeze([]),
  // External RUNNER_TEMP output is explicitly retained by stageSourceNormalArtifact.
  artifactStageSeal: Object.freeze([]),
  artifactUpload: Object.freeze([]), artifactCheckpointPublish: Object.freeze([]), artifactPrivatePublish: Object.freeze([]),
  referenceZones: Object.freeze(['data/diagnostics/state-reference-zones.json']),
  // Fixed operational-root outputs of73/74 use the separately authenticated
  // phase73 birth/FD/hash catalog, never arbitrary repository-relative paths.
  currentImplementation: Object.freeze([]), integratedReadiness: Object.freeze([]),
  updatedWeatherValidation: Object.freeze([]), tripStorageEdge: Object.freeze([]), tripGateway: Object.freeze([]),
  pointPromotion: Object.freeze([]), // Central CAS only; no local working-file mutation.
  preflightState: Object.freeze(['.cache/weather-preflight-state/state.json']),
});
const sourceNormalProgramCodes = Object.freeze({ point: 4, cpTargets: 5, cpInspect: 6,
  cp: 7, cpStrict: 8, om: 9, closure: 10, pilot: 11, weather: 12,
  quality: 13, qualityStrict: 14, advisory: 15, seal: 16, freshness: 17,
  currentHistoryPlan: 78, originalTargetRegistry: 68, legacyCurrentRequests: 69, cpInventory: 70, progressUnion: 71,
  activeReady: 18, activePairs: 19, activeCopy: 20, activePromote: 21, advisoryRemove: 22, generationPrepare: 42, rawCache: 44, handoffInstall: 49, handoffClosure: 50, protectedQuickPrepare: 51,
  artifactProvenance: 52, artifactPublic: 53, artifactContinuity: 54, artifactPairedContinuity: 55,
  artifactAudit: 56, artifactValidate: 57, artifactRelease: 58, artifactSpec: 59,
  artifactBundle: 60, artifactCheckpoint: 61, artifactFreshness: 62, artifactStageSeal: 63, artifactUpload: 64, artifactCheckpointPublish: 65, artifactPrivatePublish: 66,
  referenceZones:72, currentImplementation:73, integratedReadiness:74, updatedWeatherValidation:75, tripStorageEdge:76, tripGateway:77, pointPromotion:79, pointPrepare:80, pointRegistry:81, waterRegistry:82, preflightState:83 });

async function runSourceNormalReadyRegistryPreparation(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const issued = assertPrivateSourceJobDeadline(holder);
  if (state.dmiStarted || state.normalPreparation || state.normalPhase || state.saveInFlight
    || issued.normalPrelude.currentHistoryPlan) sourceOriginalFailure('NORMAL_PHASE_NOT_AVAILABLE');
  const preparation = { phases: [], registry: null, completed: false };
  state.normalPreparation = preparation; // retain every actual phase before later work
  for (const name of ['pointPrepare', 'pointRegistry', 'waterRegistry']) {
    const phase = await runSourceRequiredProgram(holder, operation, name);
    preparation.phases.push(phase);
  }
  const generation = await assertSourceNormalGeneration(holder, operation);
  const registry = preparation.phases[1].outputRows.find(row =>
    row.path === path.join(owner.context.repository, 'data/live/coastal-parts-v2.json'));
  if (!registry || !generation.rows.includes(registry)) sourceOriginalFailure('NORMAL_INPUT_LOST');
  await hashSourceOriginalHandle(owner, registry);
  // This FD belongs to the actual fixed rebuild AFTER authenticated B/S install.
  // The earlier entry-registry FD remains a separately preserved baseline.
  preparation.registry = registry;
  preparation.generation = generation;
  preparation.completed = true;
  return operation; // no new owner/origin, provider result, SAVE or release
}

async function runSourceNormalCurrentHistoryPlan(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), issued = assertPrivateSourceJobDeadline(holder);
  const prelude = issued.normalPrelude;
  if (state.dmiStarted || prelude.currentHistoryPlan || prelude.generationPreparation
    || prelude.handoff?.reused === true) sourceOriginalFailure('NORMAL_HISTORY_PLAN_REUSED');
  // Same normal selector: historical-wave bootstrap has its separate history.
  if (prelude.historicalTransition?.required === true) {
    prelude.currentHistoryPlan = Object.freeze({ required: false });
    return;
  }
  const phase = await runSourceRequiredProgram(holder, operation, 'currentHistoryPlan');
  const generation = await assertSourceNormalGeneration(holder, operation);
  const file = path.join(state.owner.context.repository, '.cache/ravscore-current-history-demand.json');
  const row = generation.rows.find(value => value.path === file);
  if (!phase.completed || !phase.transportClosed || phase.result.exitCode !== 0 || !row
    || !phase.outputRows.includes(row)) sourceOriginalFailure('NORMAL_HISTORY_PLAN_UNPROVED');
  const plan = JSON.parse((await sourceNormalRowBytes(holder, row,
    PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes)).toString('utf8'));
  if (!isPlainObject(plan)
    || Object.keys(plan).sort().join(',') !== (plan.schemaVersion === 2
      ? 'demands,kind,modelBinding,productionReferenceAt,rawRetention,registrySha256,schemaVersion,sourceHashes'
      : 'demands,kind,modelBinding,productionReferenceAt,registrySha256,schemaVersion,sourceHashes')
    || ![1, 2].includes(plan.schemaVersion) || plan.kind !== 'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND'
    || sourceNormalUtcHour(plan.productionReferenceAt) !== state.lockedTarget
    || !Array.isArray(plan.demands) || !plan.demands.length
    || !/^sha256:[0-9a-f]{64}$/.test(plan.registrySha256 ?? '')
    || !isPlainObject(plan.sourceHashes)) sourceOriginalFailure('NORMAL_HISTORY_PLAN_INVALID');
  // The planner may legitimately reattest its WORKING checkpoint. The phase
  // preserves its predecessor before launch and admits this distinct output.
  // No original B/S row, binding or hash is overwritten or repinned here.
  const checkpointPath = path.join(state.owner.context.repository,
    '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  const checkpoint = generation.rows.find(value => value.path === checkpointPath);
  if (plan.sourceHashes.checkpoint !== (checkpoint ? 'sha256:' + checkpoint.sha256 : null)) {
    sourceOriginalFailure('NORMAL_HISTORY_PLAN_INPUT_CHANGED');
  }
  // The CURRENT ordinary selector executes the actual normal planner with
  // --retain-committed-raw. Its transport is schema2, never an omitted policy
  // relabelled as an empty historical dependency set or a cold-start policy.
  // Both genuine normal schemas remain accepted. A missing/null retention
  // means the unchanged Python no-eviction path, NOT a fabricated empty set.
  if (plan.schemaVersion === 2 && plan.rawRetention !== null) {
  const retention = plan.rawRetention, original = state.owner.bundles[0];
  const conditions = original?.rows.get('payload/data/live/conditions.json');
  const checkpointValue = checkpoint && JSON.parse((await sourceNormalRowBytes(holder,
    checkpoint, 16 * 1024 * 1024)).toString('utf8'));
  const boundary = retention?.boundary;
  if (!conditions || !checkpointValue || state.owner.kind !== 'single'
    || !isPlainObject(retention) || Object.keys(retention).sort().join(',') !== 'boundary,captures,kind,schemaVersion'
    || retention.schemaVersion !== 1 || retention.kind !== 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION'
    || !isPlainObject(boundary) || Object.keys(boundary).sort().join(',') !==
      'bundleContentSha256,checkpointGenerationSha256,conditionsSha256,datasetId,productionReferenceAt'
    || boundary.bundleContentSha256 !== original.descriptor.bundleContentSha256
    || boundary.conditionsSha256 !== conditions.sha256 || boundary.datasetId !== original.descriptor.datasetId
    || boundary.productionReferenceAt !== original.descriptor.productionReferenceAt
    || boundary.checkpointGenerationSha256 !== checkpointValue.generationSha256
    || checkpointValue.datasetId !== boundary.datasetId
    || checkpointValue.productionReferenceAt !== boundary.productionReferenceAt
    || !Array.isArray(retention.captures) || retention.captures.length > 4096) {
    sourceOriginalFailure('NORMAL_HISTORY_RAW_BOUNDARY_CHANGED');
  }
  const { canonicalSavedDmiOriginalCapture } = await import('./lib/saved-dmi-original-capture.mjs');
  const captures = new Set();
  for (const capture of retention.captures) {
    const canonical = canonicalSavedDmiOriginalCapture(capture);
    if (!same(canonical, capture)) sourceOriginalFailure('NORMAL_HISTORY_RAW_CAPTURE_CHANGED');
    const identity = JSON.stringify(canonical);
    if (captures.has(identity)) sourceOriginalFailure('NORMAL_HISTORY_RAW_CAPTURE_DUPLICATE');
    captures.add(identity);
  }
  }
  // This authenticates the produced transport and its original B/S boundary.
  // It is not native numeric admission or an eviction/producer/SAVE capability;
  // the unchanged normal Python reader still validates it before RAW policy.
  await assertSourceOriginalProgress(holder);
  await hashSourceOriginalHandle(state.owner, row);
  sourceDmiWorkingState(holder, operation);
  prelude.currentHistoryPlan = Object.freeze({ required: true, phase, row,
    target: state.lockedTarget, sha256: row.sha256, bytes: row.bytes });
}
async function assertSourceNormalCurrentHistoryPlan(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), prelude = assertPrivateSourceJobDeadline(holder).normalPrelude;
  const selected = prelude.currentHistoryPlan;
  if (!selected || typeof selected.required !== 'boolean') sourceOriginalFailure('NORMAL_HISTORY_PLAN_REQUIRED');
  if (selected.required === false) {
    if (prelude.historicalTransition?.required !== true) sourceOriginalFailure('NORMAL_HISTORY_PLAN_REQUIRED');
    return;
  }
  const generation = await assertSourceNormalGeneration(holder, operation);
  if (!selected.phase.completed || !selected.phase.transportClosed
    || selected.target !== state.lockedTarget
    || !generation.rows.includes(selected.row) || selected.row.sha256 !== selected.sha256
    || selected.row.bytes !== selected.bytes) sourceOriginalFailure('NORMAL_HISTORY_PLAN_CHANGED');
  await hashSourceOriginalHandle(state.owner, selected.row);
}


async function runSourceNormalAlwaysSeal(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation);
  const issued = assertPrivateSourceJobDeadline(holder), prelude = issued.normalPrelude;
  if (issued.identity.GITHUB_REF !== 'refs/heads/main' || prelude?.preflight?.shouldRun !== true
    || !issued.normalProgressBase || !state.outputGeneration) return;
  // Unknown I/O, child stop or provenance has already poisoned sourceOriginalOwner
  // and refuses above. A safely closed semantic failure may still reach here.
  if (state.cipherFinalizationAttempt !== undefined) {
    const prior = state.cipherFinalizationAttempt;
    if (prior.firstFailure !== null) throw prior.firstFailure[0];
    const actual = state.savedPhases?.get('cipher');
    if (!prior.completed || actual !== prior.save || actual?.completed !== true
      || actual.semanticFailure != null || actual.receipt?.kind !== 'WEATHER_CIPHER_V2_FINALIZED') {
      sourceOriginalFailure('CIPHER_FINALIZATION_ALREADY_ATTEMPTED');
    }
    return; // Same real finalized ACK only; never a second immutable-key SAVE.
  }
  const attempt = { firstFailure: null, completed: false, save: null };
  state.cipherFinalizationAttempt = attempt;
  try {
  await assertSourceNormalProgressBase(holder);
  const phase = await runSourceNormalProgram(holder, operation, 'seal');
  await assertSourceNormalProgressBase(holder);
  if (phase.result.exitCode !== 0) throw sourceNormalClosedFailure(state, 'seal', phase.result.exitCode);
  if (phase.result.outputs.saved !== 'true') {
    attempt.noCipher = true; return; // Not a SAVE ACK and no re-attempt authority.
  }
  await bindSourceNormalSealedCipher(holder, operation, phase);
  attempt.save = await runSourceSaveCohort(holder, operation, 'cipher');
  if (attempt.save.semanticFailure != null) throw attempt.save.semanticFailure[0];
  if (attempt.save.receipt?.kind !== 'WEATHER_CIPHER_V2_FINALIZED') sourceOriginalFailure('CIPHER_FINALIZATION_NOT_ACKNOWLEDGED');
  attempt.completed = true;
  } catch (error) { attempt.firstFailure ??= [error]; throw attempt.firstFailure[0]; }
}

async function consumeSourceNormalArtifact(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const issued = assertPrivateSourceJobDeadline(holder);
  const raw = state.savedPhases?.get('raw'), cipher = state.savedPhases?.get('cipher');
  if (!state.normalTailSettled || state.artifact || state.firstNormalFailure
    || state.finalSaveFailure || state.saveInFlight || state.normalPhase
    || !state.weatherPhase?.completed || state.weatherPhase.result.exitCode !== 0
    || !raw?.completed || raw.semanticFailure || !cipher?.completed || cipher.semanticFailure
    || !issued.normalProgressBase || !['integrated', 'integrated-historical-maintenance'].includes(issued.normalRoute?.action)) {
    sourceOriginalFailure('ARTIFACT_INPUT_NOT_SETTLED');
  }
  const artifact = { holder, operation, owner, readers: [], outputRows: [], completed: false,
    inputGeneration: await assertSourceNormalGeneration(holder, operation), firstFailure: null };
  state.artifact = artifact; // retain actual inputs and partial outputs throughout failure
  try {
    await runSourceRequiredProgram(holder, operation, 'artifactProvenance');
    await runSourceRequiredProgram(holder, operation, 'artifactPublic');
    await runSourceRequiredProgram(holder, operation, 'artifactContinuity');
    if (owner.kind === 'pair') await runSourceRequiredProgram(holder, operation, 'artifactPairedContinuity');
    // The normal runtime audit reports scientific failures; only its actual
    // typed disposition is an admission input, never a fabricated success bit.
    artifact.auditPhase = await runSourceNormalProgram(holder, operation, 'artifactAudit');
    await writeSourceNormalCheckpointDisposition(holder, operation);
    // Keep the normal workflow's advisory outcomes visible. These do not waive
    // the independently enforced no-loss, bundle/schema/privacy/identity gates.
    await runSourceRequiredProgram(holder, operation, 'artifactFreshness');
    await reconfirmSourceNormalMain(holder);
    artifact.checkpointPhase = await runSourceRequiredProgram(holder, operation, 'artifactCheckpoint');
    artifact.specPhase = await runSourceRequiredProgram(holder, operation, 'artifactSpec');
    await bindSourceNormalArtifactInputs(holder, operation);
    const bundlePath = sourceNormalArtifactBundlePath(holder);
    // Normal create refuses an existing destination. Retain the exact fixed
    // output name before the child; unknown copy/drain never admits it.
    artifact.bundlePath = bundlePath;
    artifact.createPhase = await runSourceRequiredProgram(holder, operation, 'artifactBundle');
    const { buildPrivateRuntimeExpectation } = await import('./private-production-runtime-workflow.mjs');
    const expected = await buildPrivateRuntimeExpectation({ repositoryRoot: owner.context.repository,
      targetReferenceAt: state.lockedTarget });
    const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot: owner.context.root,
      bundlePath, repositoryRoot: owner.context.repository, expected });
    assertSourceNormalArtifactBinding(artifact.spec, artifact.inputs, verified);
    for (const descriptor of verified.files) {
      const input = artifact.inputs.get(descriptor.relativePath);
      const row = await openSourceOutputRow(owner, owner.context.root,
        path.join(bundlePath, 'payload', ...descriptor.relativePath.split('/')), input);
      artifact.outputRows.push(row);
      await hashSourceOriginalHandle(owner, input);
    }
    const manifest = await openSourceOutputRow(owner, owner.context.root, path.join(bundlePath, 'manifest.json'));
    artifact.outputRows.push(manifest);
    const actualManifest = JSON.parse((await sourceNormalRowBytes(holder, manifest, bufferConstants.MAX_LENGTH)).toString('utf8'));
    if (!same(actualManifest, verified.manifest)) sourceOriginalFailure('ARTIFACT_MANIFEST_CHANGED');
    await assertSourceNormalGeneration(holder, operation);
    for (const row of [...artifact.inputs.values(), ...artifact.readers, ...artifact.outputRows]) {
      await hashSourceOriginalHandle(owner, row);
    }
    sourceDmiWorkingState(holder, operation);
    assertPrivateSourceJobDeadline(holder);
    // Synchronous last publication after ALL awaited checks. The original
    // operation stays active/retained; this is local T, not hosted completion.
    artifact.verified = freezeSourceOriginalMetadata(verified);
    artifact.completed = true;
    return operation;
  } catch (error) {
    if (artifact.firstFailure === null) artifact.firstFailure = [error];
    throw keepSourceOriginalFailure(owner, artifact.firstFailure[0]);
  }
}


async function stageSourceNormalArtifact(holder, operation) {
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const artifact = state.artifact;
  if (!artifact || artifact.holder !== holder || artifact.operation !== operation
    || artifact.owner !== owner || artifact.completed !== true || artifact.firstFailure !== null
    || artifact.staging || !state.normalTailSettled || state.firstNormalFailure !== null
    || state.finalSaveFailure !== null || state.saveInFlight || state.normalPhase
    || artifact.bundlePath !== sourceNormalArtifactBundlePath(holder)
    || artifact.verified?.verified !== true) {
    sourceOriginalFailure('ARTIFACT_STAGE_NOT_AVAILABLE');
  }
  // This is an actual local seal attempt, not a hosted-upload/publish receipt.
  // Keep its inputs and any subsequently opened output even on a late failure.
  const staging = { phase: null, expectedRow: null, checkpointRow: null,
    outputRow: null, directory: null, directoryStat: null, firstFailure: null };
  artifact.staging = staging;
  try {
    await assertSourceNormalGeneration(holder, operation);
    for (const row of [...artifact.inputs.values(), ...artifact.readers, ...artifact.outputRows]) {
      await hashSourceOriginalHandle(owner, row);
    }
    const expected = await sourceArtifactJson(holder, operation, '.cache/private-production-runtime-expected.json');
    staging.expectedRow = expected.row;
    const checkpointPath = path.join(owner.context.repository,
      '.cache/ravscore-continuation-checkpoint/checkpoint.json');
    staging.checkpointRow = (await assertSourceNormalGeneration(holder, operation)).rows
      .find(row => row.path === checkpointPath);
    if (!staging.checkpointRow || artifact.checkpointPhase?.completed !== true
      || artifact.checkpointPhase.transportClosed !== true || artifact.checkpointPhase.result?.exitCode !== 0) {
      sourceOriginalFailure('ARTIFACT_CHECKPOINT_NOT_OWNED');
    }
    await hashSourceOriginalHandle(owner, sourceRetainedWorkingRow(owner, staging.checkpointRow));
    const temporary = await sourceNormalTemporary(holder);
    staging.directory = path.join(temporary.path, 'ravradar-private-build-stage');
    staging.directoryStat = await fs.lstat(staging.directory, { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (staging.directoryStat && (!staging.directoryStat.isDirectory() || staging.directoryStat.isSymbolicLink())) {
      sourceOriginalFailure('ARTIFACT_STAGE_DIRECTORY_INVALID');
    }
    const outputPath = path.join(staging.directory, 'sealed.bin');
    const existing = await fs.lstat(outputPath, { bigint: true }).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (existing !== null) sourceOriginalFailure('ARTIFACT_STAGE_ALREADY_EXISTS');
    await reconfirmSourceNormalMain(holder);
    await assertSourceOriginalProgress(holder);
    staging.phase = await runSourceRequiredProgram(holder, operation, 'artifactStageSeal');
    if (staging.phase.completed !== true || staging.phase.transportClosed !== true
      || staging.phase.result?.exitCode !== 0) sourceOriginalFailure('ARTIFACT_STAGE_NOT_CLOSED');
    await sourceNormalTemporary(holder);
    const directory = await fs.lstat(staging.directory, { bigint: true });
    if (!directory.isDirectory() || directory.isSymbolicLink()
      || (staging.directoryStat && !sameSourceOriginalStat(staging.directoryStat, directory))) {
      sourceOriginalFailure('ARTIFACT_STAGE_DIRECTORY_CHANGED');
    }
    // openSourceOutputRow retains the real fd before its awaited stat/hash work.
    // The normal seal CLI and its guardian actually finished; stdout is not an ACK.
    staging.outputRow = await openSourceOutputRow(owner, temporary.path, outputPath);
    await hashSourceOriginalHandle(owner, staging.expectedRow);
    await hashSourceOriginalHandle(owner, sourceRetainedWorkingRow(owner, staging.checkpointRow));
    for (const row of [...artifact.inputs.values(), ...artifact.readers, ...artifact.outputRows]) {
      await hashSourceOriginalHandle(owner, row);
    }
    await hashSourceOriginalHandle(owner, staging.outputRow);
    await assertSourceNormalGeneration(holder, operation);
    sourceDmiWorkingState(holder, operation);
    assertPrivateSourceJobDeadline(holder);
    // No hosted receipt, owner release, SOURCE completion or new B is issued.
    return operation;
  } catch (error) {
    if (staging.firstFailure === null) staging.firstFailure = [error];
    throw keepSourceOriginalFailure(owner, staging.firstFailure[0]);
  }
}


async function publishSourceNormalArtifact(holder, operation, mode) {
  if (!['early-upload', 'publish-b-before-s'].includes(mode)) sourceOriginalFailure('ARTIFACT_PUBLICATION_STAGE_INVALID');
  const state = sourceDmiWorkingState(holder, operation), owner = state.owner;
  const artifact = state.artifact, staging = artifact?.staging;
  if (!artifact || artifact.owner !== owner || artifact.holder !== holder
    || artifact.operation !== operation || artifact.completed !== true
    || artifact.firstFailure !== null || !staging || staging.firstFailure !== null
    || !staging.outputRow || staging.phase?.completed !== true
    || staging.phase.transportClosed !== true || staging.phase.result?.exitCode !== 0
    || (mode === 'early-upload' ? artifact.publication !== undefined : !artifact.publication?.uploadAck)
    || state.saveInFlight || state.normalPhase
    || state.firstNormalFailure !== null || state.finalSaveFailure !== null
    || !state.normalTailSettled || artifact.bundlePath !== sourceNormalArtifactBundlePath(holder)) {
    sourceOriginalFailure('ARTIFACT_PUBLICATION_NOT_AVAILABLE');
  }
  const publication = mode === 'early-upload' ? { upload: null, checkpoint: null, private: null,
    uploadAck: null, checkpointAck: null, privateAck: null, firstFailure: null } : artifact.publication;
  if (mode === 'publish-b-before-s' && (publication.firstFailure !== null || publication.private !== null
    || publication.checkpoint !== null || publication.publishAttempted)) sourceOriginalFailure('ARTIFACT_PUBLICATION_REUSED');
  if (mode === 'publish-b-before-s') publication.publishAttempted = true;
  artifact.publication = publication; // retained before any awaited work
  const recheck = async () => {
    await assertSourceOriginalProgress(holder);
    await assertSourceNormalGeneration(holder, operation);
    for (const row of [...artifact.inputs.values(), ...artifact.readers, ...artifact.outputRows,
      staging.expectedRow, sourceRetainedWorkingRow(owner, staging.checkpointRow), staging.outputRow]) {
      await hashSourceOriginalHandle(owner, row);
    }
    const directory = await fs.lstat(staging.directory, { bigint: true });
    if (!directory.isDirectory() || directory.isSymbolicLink()
      || (staging.directoryStat && !sameSourceOriginalStat(staging.directoryStat, directory))) {
      sourceOriginalFailure('ARTIFACT_STAGE_DIRECTORY_CHANGED');
    }
    sourceDmiWorkingState(holder, operation);
    return reconfirmSourceNormalMain(holder);
  };
  const closed = phase => {
    if (!phase || phase.completed !== true || phase.transportClosed !== true
      || phase.result?.exitCode !== 0) sourceOriginalFailure('ARTIFACT_PUBLISH_NOT_CLOSED');
    return phase.result.outputs;
  };
  const integer = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value)
    && Number.isSafeInteger(Number(value));
  try {
    const issued = await recheck();
    if (mode === 'early-upload') publication.upload = await runSourceRequiredProgram(holder, operation, 'artifactUpload');
    const uploaded = closed(publication.upload);
    if (JSON.stringify(Object.keys(uploaded).sort()) !== JSON.stringify([
      'archive_bytes', 'archive_sha', 'artifact_id', 'artifact_name', 'sealed_bytes', 'sealed_sha'])
      || !integer(uploaded.artifact_id) || !integer(uploaded.archive_bytes)
      || !/^[0-9a-f]{64}$/.test(uploaded.archive_sha || '')
      || uploaded.artifact_name !== `ravradar-private-build-stage-${issued.identity.GITHUB_RUN_ID}-${issued.identity.GITHUB_RUN_ATTEMPT}`
      || uploaded.sealed_bytes !== String(staging.outputRow.bytes)
      || uploaded.sealed_sha !== staging.outputRow.sha256) sourceOriginalFailure('ARTIFACT_UPLOAD_ACK_INVALID');
    const actualWriteAuthority = await recheck();
    // This is the existing fresh main/input recheck, not a caller success.
    if (mode === 'publish-b-before-s') publication.privateWriteAuthority = Object.freeze({
      sourceHead: actualWriteAuthority.identity.GITHUB_SHA,
      runId: actualWriteAuthority.identity.GITHUB_RUN_ID,
      runAttempt: actualWriteAuthority.identity.GITHUB_RUN_ATTEMPT });
    if (mode === 'early-upload') {
      publication.uploadAck = freezeSourceOriginalMetadata(uploaded);
      return operation; // Actual early completed-build-stage upload, NOT B/S or owner release.
    }
    if (!same(uploaded, publication.uploadAck) || !artifact.currentControls?.completed
      || artifact.currentControls.firstSafetyFailure !== null) sourceOriginalFailure('ARTIFACT_LATE_CONTROLS_UNPROVED');
    sourcePostWeatherCacheOutcomes(state); // Actual cacheSAVE before the first B write.

    publication.private = await runSourceRequiredProgram(holder, operation, 'artifactPrivatePublish');
    const published = closed(publication.private);
    if (JSON.stringify(Object.keys(published).sort()) !== JSON.stringify([
      'private_anonymous_denied', 'private_bundle', 'private_count', 'private_object', 'private_reason', 'private_reference',
      'private_retention_failures', 'private_rollback', 'private_version'])
      || published.private_anonymous_denied !== 'true'
      || !integer(published.private_version) || !integer(published.private_count)
      || !/^[0-9a-f]{64}$/.test(published.private_object || '')
      || published.private_bundle !== artifact.verified.bundleContentSha256
      || published.private_reference !== state.lockedTarget
      || !['protected-private-runtime-inserted', 'protected-private-runtime-updated',
        'protected-private-runtime-already-current', 'protected-private-runtime-content-already-current'].includes(published.private_reason)
      || !['true', 'false'].includes(published.private_rollback)
      || !/^(?:0|[1-9][0-9]*|not-run)$/.test(published.private_retention_failures || '')) {
      sourceOriginalFailure('ARTIFACT_PRIVATE_ACK_INVALID');
    }
    await recheck();
    publication.privateAck = freezeSourceOriginalMetadata(published);

    publication.checkpoint = await runSourceRequiredProgram(holder, operation, 'artifactCheckpointPublish');
    const checkpoint = closed(publication.checkpoint);
    if (JSON.stringify(Object.keys(checkpoint).sort()) !== JSON.stringify([
      'checkpoint_bundle', 'checkpoint_continuation', 'checkpoint_contract',
      'checkpoint_reason', 'checkpoint_reference', 'checkpoint_version'])
      || !integer(checkpoint.checkpoint_version) || checkpoint.checkpoint_reference !== state.lockedTarget
      || !['protected-checkpoint-inserted', 'protected-checkpoint-updated', 'protected-checkpoint-already-current'].includes(checkpoint.checkpoint_reason)
      || checkpoint.checkpoint_bundle !== artifact.verified.modelBinding.modelBundleSha256
      || checkpoint.checkpoint_contract !== artifact.verified.modelBinding.modelContractSha256
      || !/^[0-9a-f]{64}$/.test(checkpoint.checkpoint_continuation || '')) {
      sourceOriginalFailure('ARTIFACT_CHECKPOINT_ACK_INVALID');
    }
    // The same retained S input remains byte-exact; no fabricated B/S alias.
    await recheck();
    const checkpointBytes = await sourceNormalRowBytes(holder,
      sourceRetainedWorkingRow(owner, staging.checkpointRow), bufferConstants.MAX_LENGTH);
    const localCheckpoint = JSON.parse(checkpointBytes.toString('utf8'));
    if (checkpoint.checkpoint_continuation !== localCheckpoint.continuationStateContractSha256) {
      sourceOriginalFailure('ARTIFACT_CHECKPOINT_ACK_INVALID');
    }
    publication.checkpointAck = freezeSourceOriginalMetadata(checkpoint);
    // Actual hosted metadata is now held locally, but no Pages, SOURCE-complete,
    // writer release, T admission or subsequent-process owner transfer is issued.
    return operation;
  } catch (error) {
    if (publication.firstFailure === null) publication.firstFailure = [error];
    throw keepSourceOriginalFailure(owner, publication.firstFailure[0]);
  }
}


// Private function fragment for the SAME owned operation; not a second entry.
// All function dependencies are selected reviewed kernel functions, never
// caller-supplied executables or JSON owner/completion claims.
const sourceCurrentControlReports = new WeakMap();
// Fixed diagnostics only. The single entry already forbids another invocation.
// Null means no complete control report was observed, including no-work/early failure.
let sourceCurrentActionControlReport = null;
export function sourceNormalActionOperationalControlReport() {
  if(arguments.length!==0)sourceOriginalFailure('CURRENT_CONTROLS_ACCEPT_NO_OPTIONS');
  return sourceCurrentActionControlReport; // Never owner, closure, SAVE or publication authority.
}
const sourceCurrentOperationalPaths = Object.freeze({
  root: '/tmp/ravradar-operational-model',
  closure: '/tmp/ravradar-operational-model/integrated-public-closure.json',
  identity: '/tmp/ravradar-operational-model/integrated-implementation-identity.json',
  readiness: '/tmp/ravradar-operational-model/integrated-readiness.json',
});
async function beginSourceCurrentImplementationOutput(holder, operation) {
  const state=sourceDmiWorkingState(holder,operation), owner=state.owner;
  if(state.currentImplementationOutput) sourceOriginalFailure('CURRENT_IMPLEMENTATION_OUTPUT_REUSED');
  const actual={root:sourceCurrentOperationalPaths.root,rootStat:null,rows:[],phase:null,firstFailure:null};
  state.currentImplementationOutput=actual;
  // These two outputs are first produced at this point in the ordinary job.
  // An unexpected existing file is retained/refused, never overwritten/adopted.
  const parent=path.dirname(actual.root),parentStat=await fs.lstat(parent,{bigint:true});
  if(!parentStat.isDirectory()||parentStat.isSymbolicLink()||await fs.realpath(parent)!==parent) {
    sourceOriginalFailure('CURRENT_IMPLEMENTATION_ROOT_CHANGED');
  }
  actual.parentStat=parentStat;
  let stat=await fs.lstat(actual.root,{bigint:true}).catch(error=>{if(error?.code==='ENOENT')return null;throw error;});
  if(stat===null) {
    await fs.mkdir(actual.root,{mode:0o700}); // Exclusive fixed one-level birth; never recursive/adopt-on-conflict.
    actual.rootCreated=true;
    stat=await fs.lstat(actual.root,{bigint:true});
  }
  actual.rootStat=stat;
  if(!sameSourceOriginalStat(parentStat,await fs.lstat(parent,{bigint:true}))
    ||!stat.isDirectory()||stat.isSymbolicLink()||await fs.realpath(actual.root)!==actual.root) {
    sourceOriginalFailure('CURRENT_IMPLEMENTATION_ROOT_CHANGED');
  }
  for(const file of [sourceCurrentOperationalPaths.closure,sourceCurrentOperationalPaths.identity]) {
    const found=await fs.lstat(file,{bigint:true}).catch(error=>{if(error?.code==='ENOENT')return null;throw error;});
    if(found!==null) sourceOriginalFailure('CURRENT_IMPLEMENTATION_OUTPUT_EXISTS');
  }
  sourceOriginalOwner(holder); return actual;
}
async function retainSourceCurrentImplementationOutput(holder,operation,phase) {
  const state=sourceDmiWorkingState(holder,operation), owner=state.owner, actual=state.currentImplementationOutput;
  if(!actual||actual.phase!==null||phase?.name!=='currentImplementation'||!phase.completed
    ||!phase.transportClosed||phase.result?.exitCode!==0) sourceOriginalFailure('CURRENT_IMPLEMENTATION_NOT_CLOSED');
  actual.phase=phase;
  const root=await fs.lstat(actual.root,{bigint:true});
  if(!root.isDirectory()||root.isSymbolicLink()||!sameSourceOriginalStat(actual.rootStat,root)) sourceOriginalFailure('CURRENT_IMPLEMENTATION_ROOT_CHANGED');
  for(const file of [sourceCurrentOperationalPaths.closure,sourceCurrentOperationalPaths.identity]) {
    const row=await openSourceOutputRow(owner,actual.root,file);actual.rows.push(row);
    await hashSourceOriginalHandle(owner,row);
  }
  const identity=actual.rows.find(row=>row.path===sourceCurrentOperationalPaths.identity);
  const value=JSON.parse((await sourceNormalRowBytes(holder,identity,131072)).toString('utf8'));
  if(!value||typeof value!=='object'||Array.isArray(value)
    ||!/^[a-f0-9]{64}$/.test(value.implementationClosureSha256??'')) sourceOriginalFailure('CURRENT_IMPLEMENTATION_IDENTITY_INVALID');
  actual.implementationClosureSha256=value.implementationClosureSha256;
  return actual;
}
async function assertSourceCurrentImplementationOutput(holder,operation) {
  const state=sourceDmiWorkingState(holder,operation), actual=state.currentImplementationOutput;
  if(!actual||!actual.phase?.completed||actual.rows.length!==2
    ||!/^[a-f0-9]{64}$/.test(actual.implementationClosureSha256??'')) sourceOriginalFailure('CURRENT_IMPLEMENTATION_NOT_OWNED');
  const root=await fs.lstat(actual.root,{bigint:true});
  if(!root.isDirectory()||root.isSymbolicLink()||!sameSourceOriginalStat(actual.rootStat,root)) sourceOriginalFailure('CURRENT_IMPLEMENTATION_ROOT_CHANGED');
  for(const row of actual.rows) await hashSourceOriginalHandle(state.owner,row);
  return actual;
}
async function runSourceNormalCurrentArtifactControls(holder,operation) {
  const state=sourceDmiWorkingState(holder,operation), artifact=state.artifact;
  const issued=assertPrivateSourceJobDeadline(holder);
  if(!artifact?.completed||!artifact.publication?.uploadAck||artifact.currentControls) sourceOriginalFailure('CURRENT_CONTROLS_NOT_AVAILABLE');
  const controls={phases:new Map(),checks:[],firstSafetyFailure:null,completed:false};artifact.currentControls=controls;
  const observed=(id,kind,phase)=>{
    if(!phase?.completed||!phase.transportClosed||!phase.controlCloseObserved||phase.firstFailure!==null
      ||!Number.isInteger(phase.result?.exitCode)) sourceOriginalFailure('CURRENT_CONTROL_CLOSURE_UNPROVED');
    if(controls.phases.has(id))sourceOriginalFailure('CURRENT_CONTROL_REUSED');
    controls.phases.set(id,phase);controls.checks.push(`${id}|${kind}|${phase.result.exitCode===0?'success':'failure'}`);
    return phase.result.exitCode===0;
  };
  const diagnostic=async(id,name)=>observed(id,'diagnostic',await runSourceNormalProgram(holder,operation,name));
  // DEC-0193: a real safely closed diagnostic nonzero is a finding. It never
  // becomes success and does not suppress independent controls or safe B/S.
  await diagnostic('reference-zones','referenceZones');
  artifact.validationPhase=await runSourceNormalProgram(holder,operation,'artifactValidate');
  observed('full-validation','diagnostic',artifact.validationPhase);
  artifact.releasePhase=await runSourceNormalProgram(holder,operation,'artifactRelease');
  observed('release-gate','diagnostic',artifact.releasePhase);
  await beginSourceCurrentImplementationOutput(holder,operation);
  const implementation=await runSourceNormalProgram(holder,operation,'currentImplementation');
  const implementationOk=observed('integrated-implementation-seal','safety',implementation);
  if(implementationOk) {
    await retainSourceCurrentImplementationOutput(holder,operation,implementation);
    await assertSourceCurrentImplementationOutput(holder,operation);
    const readiness=await runSourceNormalProgram(holder,operation,'integratedReadiness');
    observed('integrated-backend-readiness','diagnostic',readiness);
    await assertSourceCurrentImplementationOutput(holder,operation);
  } else {
    // No fabricated identity/SHA or transport request for the dependent read.
    controls.checks.push('integrated-backend-readiness|diagnostic|failure');
    controls.readinessDependencyFailure='CURRENT_IMPLEMENTATION_UNAVAILABLE';
    controls.firstSafetyFailure=[sourceNormalClosedFailure(state,'currentImplementation',implementation.result.exitCode)];
    state.failureWorker=sourceFailureWorkerRecord(state.failureWorker,issued.deadline,controls.firstSafetyFailure[0],performance.now());
  }
  await diagnostic('updated-weather-validation','updatedWeatherValidation');
  await diagnostic('trip-storage-edge','tripStorageEdge');
  await diagnostic('trip-gateway','tripGateway');
  const freshness=await runSourceNormalProgram(holder,operation,'artifactFreshness');
  if(!observed('prewrite-target-freshness','safety',freshness)) {
    controls.firstSafetyFailure??=[sourceNormalClosedFailure(state,'artifactFreshness',freshness.result.exitCode)];
    state.failureWorker=sourceFailureWorkerRecord(state.failureWorker,issued.deadline,controls.firstSafetyFailure[0],performance.now());
  }
  await reconfirmSourceNormalMain(holder);
  controls.checks.push('prewrite-main-authority|safety|success');
  // Preserve the existing normal admin CAS BEFORE new B publication. It may
  // run only after the actual target/main and other hard controls succeeded.
  // A safely closed nonzero remains diagnostic; unknown close still throws
  // through the existing same-owner transport and keeps its first raw error.
  if(controls.firstSafetyFailure===null) {
    await diagnostic('point-candidate-promotion','pointPromotion');
  } else {
    controls.checks.push('point-candidate-promotion|diagnostic|skipped');
  }
  const {buildWeatherOperationalControlSummary}=await import('./weather-operational-control-summary.mjs');
  controls.report=freezeSourceOriginalMetadata(buildWeatherOperationalControlSummary({
    sourceHead:issued.identity.GITHUB_SHA,runId:issued.identity.GITHUB_RUN_ID,
    runAttempt:issued.identity.GITHUB_RUN_ATTEMPT,checks:controls.checks,
  }));
  sourceCurrentControlReports.set(operation,controls.report);
  sourceCurrentActionControlReport=controls.report;
  controls.completed=true;
  if(controls.firstSafetyFailure!==null)throw controls.firstSafetyFailure[0];
  return operation; // Not publication, owner release, Pages or remote durability.
}

function sourceCpOriginalPath(relative) {
  const prefix = '.cache/copernicus-components/';
  return relative.startsWith(prefix) && [/^objects\/[0-9a-f]{64}\.nc$/,
    /^receipts\/[0-9a-f]{64}-[0-9a-f]{64}\.json$/, /^static\/[0-9a-f]{64}\.json$/]
    .some(pattern => pattern.test(relative.slice(prefix.length)));
}
async function resolveSourceNormalProtectedBootstrap(holder, restored) {
  const issued = assertPrivateSourceJobDeadline(holder), owner = sourceOriginalOwner(holder);
  const prelude = issued.normalPrelude;
  if (!prelude || !issued.normalRoute || prelude.root !== owner.context.repository
    || sourceOriginalResultOwners.get(restored) !== owner || restored.restored !== true
    || prelude.originalInstall?.result !== restored || prelude.originalInstall.pending
    || prelude.originalPostInstall?.pending !== false || !owner.preparedInstall?.completed
    || owner.activeOperation || prelude.normalProgress?.pending !== false
    || prelude.legacyBootstrap || prelude.waveBootstrap) {
    sourceOriginalFailure('NORMAL_PROTECTED_BOOTSTRAP_NOT_AVAILABLE');
  }
  await assertSourceOriginalProgress(holder);
  await assertSourceNormalProgressBase(holder);
  const bundle = owner.bundles[owner.kind === 'pair' ? 1 : 0];
  if (!bundle || !bundle.manifest || !bundle.rows.size) sourceOriginalFailure('NORMAL_PROTECTED_BASELINE_REQUIRED');
  // This is the existing normal PRIVATE_RUNTIME_AVAILABLE branch. Its input is
  // the actual verified B/install, never an environment boolean or S alias.
  for (const row of bundle.rows.values()) await hashSourceOriginalHandle(owner, row);
  sourceOriginalOwner(holder);
  if (prelude.legacyBootstrap || prelude.waveBootstrap || owner.activeOperation) {
    sourceOriginalFailure('NORMAL_PROTECTED_BOOTSTRAP_REUSED');
  }
  prelude.legacyBootstrap = Object.freeze({ required: false, statelessIntegratedRecovery: false });
  prelude.waveBootstrap = Object.freeze({ required: false, sourceValidated: false });
}


// The sole fixed action entry. It retains ONE actual session all the way to
// real B-before-S and physical finalization, or an authenticated no-work close.
export async function runSourceNormalProducerTail() {
  if(arguments.length!==0)sourceDeadlineFailure('SOURCE_COMPLETE_ACCEPTS_NO_CALLER_OPTIONS');
  let holder=null,driver=null;
  try {
    holder=await prepareSourceNormalProducerSession();
    await adoptSourceNormalAdmittedSession(holder);
    const issued=assertPrivateSourceJobDeadline(holder);
    if(issued.normalDriver)sourceDeadlineFailure('SOURCE_NORMAL_DRIVER_REUSED');
    driver={firstFailure:null,caughtFailure:null,original:sourceOwnerRecord(holder).tailContext.restored,
      operation:null,tail:null};issued.normalDriver=driver;
    sourceDriverDiagnosticStages.set(driver,'PREFLIGHT');
    await prepareSourceCurrentNormalPrelude(holder);
    const preflight=await runSourceNormalPreflight(holder);
    if(preflight.shouldRun===false)return await finalizeSourceCurrentNoWork(holder,preflight);
    sourceDriverDiagnosticStages.set(driver,'POST_INSTALL');
    await prepareSourceCurrentNormalPostInstall(holder);
    sourceDriverDiagnosticStages.set(driver,'PROGRESS_BASE');
    await captureSourceNormalProgressBase(holder);
    sourceDriverDiagnosticStages.set(driver,'PROGRESS_CACHE');
    await acquireSourceNormalProgressCipher(holder);
    sourceDriverDiagnosticStages.set(driver,'PROGRESS_UNION');
    await runSourceNormalProgress(holder,driver.original);
    sourceDriverDiagnosticStages.set(driver,'PRODUCER_CHAIN');
    await resolveSourceNormalProtectedBootstrap(holder,driver.original);
    await runSourceNormalDeployedBulkCopy(holder);
    driver.operation=await beginSourceNormalProducerSession(holder);
    await runSourceNormalReadyRegistryPreparation(holder,driver.operation);
    await runSourceNormalCurrentHistoryPlan(holder,driver.operation);
    await runSourceNormalGenerationPreparation(holder,driver.operation);
    await runSourceNormalLegacyCurrentRequests(holder,driver.operation);
    await acquireSourceNormalRawCache(holder,driver.operation);
    await runSourceDmiCohort(holder,driver.operation);
    driver.tail=await runSourceNormalAfterDmi(holder,driver.operation);
    const state=sourceDmiWorkingState(holder,driver.operation);
    if(driver.tail!==driver.operation||!state.normalTailSettled||state.saveInFlight||state.normalPhase
      ||state.firstFailure!==null)sourceOriginalFailure('NORMAL_PROTECTED_DRIVER_NOT_SETTLED');
    await consumeSourceNormalArtifact(holder,driver.operation);
    await stageSourceNormalArtifact(holder,driver.operation);
    await publishSourceNormalArtifact(holder,driver.operation,'early-upload');
    await runSourceNormalCurrentArtifactControls(holder,driver.operation);
    await runSourceNormalPostWeatherCaches(holder,driver.operation);
    await publishSourceNormalArtifact(holder,driver.operation,'publish-b-before-s');
    return await finalizeSourceNormalOwner(holder,driver.operation);
  }catch(error){
    // An entry/installation failure already retains and drains its actual
    // original handles; it must not be turned into a second issuer here.
    if(!driver)throw error;
    const issued=sourceJobDeadlineBrands.get(holder),owner=issued?.originalOwner;
    const state=sourceDmiCohorts.get(driver.operation);
    retainSourceNormalDriverFailure(driver,state,error);
    rememberSourceDriverFailure(driver,driver.firstFailure[0]);
    if(state&&owner&&owner.firstFailure===null&&state.outputGeneration&&state.controlCloseObserved
      &&!state.normalPhase&&!state.saveInFlight) {
      try{await runSourceNormalAlwaysSeal(holder,driver.operation);}
      catch(saveError){state.finalSaveFailure??=[saveError];}
    }
    if(state&&owner){
      try{await writeSourceNormalFailureDisposition(holder,driver.operation,driver.firstFailure[0]);}
      catch(outcomeError){state.failureDispositionFailure??=[outcomeError];}
    }
    if(owner)keepSourceOriginalFailure(owner,driver.caughtFailure[0]);
    // The original value (including null/false/0/undefined) survives later
    // transport/close/SAVE failures. Those remain separate retained poison.
    try{retainSourceNormalProducerTailFailure(holder,driver.firstFailure[0]);}
    catch(retainError){driver.entryRetainFailure??=[retainError];}
    throw driver.firstFailure[0];
  }
}
