// Reconcile an authenticated acquisition snapshot with its still-protected
// production baseline before either generation becomes the next working set.
// Both sides are re-admitted from original provider bytes, never public JSON.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { constants as unionFsConstants, fstat as unionFstat } from 'node:fs';
import { types as unionTypes } from 'node:util';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { unpackPrivateWeatherComponentPack, privateWeatherPackJsonReadsClosed } from './private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './private-weather-component-inventory.mjs';
import { OPEN_METEO_NATIVE_NEAREST_POLICIES, OPEN_METEO_PART_COMPONENTS } from './open-meteo-part-bank.mjs';
import { mergeVerifiedOpenMeteoGenerations } from './verified-open-meteo-generation-union.mjs';
import { hasValue } from './weather-component-needs.mjs';
import { reconcileDmiProgressFiles } from './verified-dmi-progress-inputs.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './private-weather-progress-files.mjs';
import { RESEARCH_HISTORY_HOURS } from './weather-history-retention.mjs';
import { OPEN_METEO_FUTURE_HOURS } from './open-meteo-forecast-window.mjs';
import { copernicusOfflineEnvironment } from './copernicus-offline-environment.mjs';
import {sourceUnionBirthChildTransport,sourceUnionBirthFileOpened,sourceUnionBirthFileClosed} from './source-union-birth-journal.mjs';

const CP_RUNNER = fileURLToPath(new URL('../run-copernicus-weather-components.py', import.meta.url));
const CURRENT_DONOR_RUNNER = fileURLToPath(new URL('../merge-verified-current-donor-banks.py', import.meta.url));
const CP_ORIGINAL = /^(?:objects\/[0-9a-f]{64}\.nc|receipts\/[0-9a-f]{64}-[0-9a-f]{64}\.json|static\/[0-9a-f]{64}\.json)$/;
const HOUR = 3_600_000;
const exactHour = value => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)
  && Number.isFinite(Date.parse(value))
  && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
// Report only these static codes. Provider responses, private paths and other
// exception messages must never escape into a public Actions log.
const SAFE_FAILURE_CODES = new Set([
  'PROTECTED_PROGRESS_ARGUMENTS_INVALID', 'PROTECTED_PROGRESS_BASE_INVALID',
  'PROTECTED_PROGRESS_TARGET_HOUR_INVALID', 'PROTECTED_PROGRESS_TARGETS_INVALID',
  'PROTECTED_PROGRESS_BASE_UNPACK_FAILED', 'PROTECTED_PROGRESS_OPEN_METEO_MERGE_FAILED',
  'PROTECTED_PROGRESS_CP_MERGE_TIMEOUT', 'PROTECTED_PROGRESS_CP_MERGE_UNAVAILABLE',
  'PROTECTED_PROGRESS_CP_MERGE_REJECTED', 'PROTECTED_PROGRESS_CP_MERGE_FILE_INVALID',
  'PROTECTED_PROGRESS_CP_MERGE_REPORT_INVALID', 'PROTECTED_PROGRESS_DUPLICATE_OUTPUT',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_TIMEOUT',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_UNAVAILABLE',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REJECTED',
  'PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REPORT_INVALID',
]);
export const protectedProgressUnionFailureCode = error => SAFE_FAILURE_CODES.has(error?.message)
  ? error.message : 'PROTECTED_PROGRESS_UNCLASSIFIED';
const fileOf = (files, relativePath) => files.find(file => file.relativePath === relativePath) ?? null;

// A lookup of the real normal factory invocation; not a stop issuer.
export function sourceProgressUnionFactoryInput(invocation) {
  const state = unionJsonReadLifetimes.get(invocation);
  if (!state || state.invocation !== invocation) throw new Error('PROTECTED_PROGRESS_SOURCE_INVOCATION_REQUIRED');
  return state.factoryOptions;
}
export function sourceProgressUnionConsumerInput(invocation) {
  const state = unionJsonReadLifetimes.get(invocation);
  if (!state || state.invocation !== invocation || !state.sourceInput || state.firstFailure !== null) {
    if (state?.firstFailure !== null && state?.firstFailure !== undefined) throw state.firstFailure[0];
    throw new Error('PROTECTED_PROGRESS_SOURCE_INVOCATION_REQUIRED');
  }
  return state.sourceInput;
}
async function runSourceOwnedProgressUnion(options, state, sourceComponents) {
  // S supplies these same references at its actual merge call. P independently
  // checks them against its installed B token and S's completed GCM/pack receipt.
  state.sourceInput = Object.freeze({ invocation: state.invocation,
    root: options.root, progressFiles: options.progressFiles,
    progressVerifiedRoot: options.progressVerifiedRoot,
    temporaryDirectory: options.temporaryDirectory,
    productionReferenceAt: options.productionReferenceAt,
    completeFiles: options.completeFiles, installedReference: options.sourceInstalledComponents });
  if (typeof sourceComponents.runSourceProgressUnionConsumer !== 'function'
    || typeof sourceComponents.assertSourceProgressUnionConsumerResult !== 'function') {
    throw new Error('PROTECTED_PROGRESS_SOURCE_CONSUMER_OWNER_UNAVAILABLE');
  }
  const proof = await sourceComponents.runSourceProgressUnionConsumer(
    options.sourceInstalledComponents, state.invocation);
  const owned = await sourceComponents.assertSourceProgressUnionConsumerResult(state.invocation, proof);
  if (!owned || !Array.isArray(owned.outputs) || !owned.result || !Array.isArray(owned.result.files)) {
    throw new Error('PROTECTED_PROGRESS_SOURCE_CONSUMER_RESULT_INVALID');
  }
  state.sourceConsumer = Object.freeze({ module: sourceComponents, proof, owned });
  state.sourceOutputInventory = new Map(owned.outputs.map(row => [row.path, row]));
  if (state.sourceOutputInventory.size !== owned.outputs.length
    || owned.result.files.some(file => !state.sourceOutputInventory.has(file.sourcePath))) {
    throw new Error('PROTECTED_PROGRESS_SOURCE_CONSUMER_RESULT_INVALID');
  }
  return owned.result;
}
async function assertSourceOwnedProgressUnion(state) {
  const consumer = state.sourceConsumer;
  if (!consumer || await consumer.module.assertSourceProgressUnionConsumerResult(
    state.invocation, consumer.proof) !== consumer.owned
    || state.result !== consumer.owned.result) throw new Error('PROTECTED_PROGRESS_CONSUMER_STOP_UNPROVED');
}


async function runPython(pythonExecutable, args, readState) {
  await new Promise((resolve, reject) => {
    const transport=readState.birthJournal===null?null:sourceUnionBirthChildTransport(readState.birthJournal,readState.temporaryDirectory);
    const child = spawn(pythonExecutable, [CP_RUNNER, ...args, ...(transport?.args??[])], {
      windowsHide: true, stdio: transport?.stdio??'ignore', env: copernicusOfflineEnvironment(),
    });
    readState.children.push(child);
    let fault = null, stopRequested = false, closed = false;
    const stop = code => {
      if (closed) return;
      fault ??= new Error(code);
      clearTimeout(timer);
      if (stopRequested) return;
      stopRequested = true;
      try { if (child.pid) child.kill('SIGKILL'); } catch { /* Await close. */ }
    };
    const timer = setTimeout(() => stop('PROTECTED_PROGRESS_CP_MERGE_TIMEOUT'), 180_000);
    child.on('error', () => stop('PROTECTED_PROGRESS_CP_MERGE_UNAVAILABLE'));
    child.once('close', code => {
      closed = true;
      clearTimeout(timer);
      // Keep enclosing authenticated stages alive until this child closes.
      // If close is unproved, the outer caller/job deadline must stop the run.
      if (fault) reject(fault);
      else code === 0 ? resolve() : reject(new Error('PROTECTED_PROGRESS_CP_MERGE_REJECTED'));
    });
  });
}

async function cpOriginalFiles(directory, prefix = '') {
  const result = [];
  for (const item of await fs.readdir(path.join(directory, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) result.push(...await cpOriginalFiles(directory, relative));
    else if (item.isFile() && CP_ORIGINAL.test(relative)) result.push({
      relativePath: `.cache/copernicus-components/${relative}`,
      sourcePath: path.join(directory, relative),
    });
    else throw new Error('PROTECTED_PROGRESS_CP_MERGE_FILE_INVALID');
  }
  return result;
}

// Normal union reader lifetime. Not a SOURCE owner or a child/descendant seal.
const retainedUnionReaders = new Set();
async function readUnionJson(file, state) {
  let row = null, value, failure = null;
  try {
    const named = await fs.lstat(file, { bigint: true });
    if (!named.isFile() || named.isSymbolicLink() || named.nlink !== 1n) throw new Error('PROTECTED_PROGRESS_JSON_FILE_INVALID');
    const handle = await fs.open(file, unionFsConstants.O_RDONLY | (unionFsConstants.O_NOFOLLOW ?? 0));
    row = { handle, fd: handle.fd, file, identity: named, closed: false };
    state.readers.push(row);
    const same = stat => ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => stat[key] === named[key]);
    if (!same(await handle.stat({ bigint: true }))) throw new Error('PROTECTED_PROGRESS_JSON_FILE_CHANGED');
    const body = await handle.readFile();
    if (!same(await handle.stat({ bigint: true })) || !same(await fs.lstat(file, { bigint: true }))) {
      throw new Error('PROTECTED_PROGRESS_JSON_FILE_CHANGED');
    }
    const expected = state.progressInventory.get(file);
    if (expected && (body.length !== expected.bytes || crypto.createHash('sha256').update(body).digest('hex') !== expected.sha256)) {
      throw new Error('PROTECTED_PROGRESS_JSON_FILE_CHANGED');
    }
    value = JSON.parse(body.toString('utf8'));
  } catch (error) { failure = [error]; }
  if (row) {
    try { await row.handle.close(); } catch (error) { failure ??= [error]; }
    try {
      const probe = await new Promise(resolve => unionFstat(row.fd, (error, stat) => resolve({ error, stat })));
      row.closed = probe.error !== null && typeof probe.error === 'object' && !unionTypes.isProxy(probe.error)
        && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
    } catch { /* Unknown raw fd closure is not a successful read. */ }
    if (!row.closed) {
      retainedUnionReaders.add(state);
      failure ??= [new Error('PROTECTED_PROGRESS_JSON_CLOSE_UNPROVED')];
    }
  }
  if (failure !== null) throw failure[0];
  return value;
}


// Exact invocation outputs, not a SOURCE authority or a descendant-stop token.
// Native/DMI branches keep their normal merge semantics but cannot be installed
// through SOURCE until their actual consumers have a separately proved lifetime.
async function writeUnionOutput(file, body, state) {
  let row = null, failure = null;
  try {
    const handle = await fs.open(file, unionFsConstants.O_RDWR | unionFsConstants.O_CREAT
      | unionFsConstants.O_EXCL | (unionFsConstants.O_NOFOLLOW ?? 0), 0o600);
    row = { handle, fd: handle.fd, file, closed: false, identity: null,
      bytes: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex') };
    state.writers.push(row);
    const initial = await handle.stat({ bigint: true });
    if (!initial.isFile() || initial.nlink !== 1n || initial.size !== 0n) throw new Error('PROTECTED_PROGRESS_OUTPUT_INVALID');
    if(state.birthJournal!==null) await sourceUnionBirthFileOpened(state.birthJournal,file,handle);
    const bytes = Buffer.from(body);
    let offset = 0;
    while (offset < bytes.length) {
      const written = await handle.write(bytes, offset, bytes.length - offset, offset);
      if (!written.bytesWritten) throw new Error('PROTECTED_PROGRESS_OUTPUT_SHORT_WRITE');
      offset += written.bytesWritten;
    }
    if(state.birthJournal!==null) await handle.sync();
    row.identity = await handle.stat({ bigint: true });
    if (row.identity.dev !== initial.dev || row.identity.ino !== initial.ino
      || row.identity.nlink !== 1n || row.identity.size !== BigInt(bytes.length)) throw new Error('PROTECTED_PROGRESS_OUTPUT_CHANGED');
  } catch (error) { failure = [error]; }
  if (row) {
    try { await row.handle.close(); } catch (error) { failure ??= [error]; }
    const probe = await new Promise(resolve => unionFstat(row.fd, (error, stat) => resolve({ error, stat })));
    row.closed = probe.error !== null && typeof probe.error === 'object' && !unionTypes.isProxy(probe.error)
      && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
    if (!row.closed) failure ??= [new Error('PROTECTED_PROGRESS_OUTPUT_CLOSE_UNPROVED')];
  }
  if (failure !== null) { retainedUnionReaders.add(state); throw failure[0]; }
  if(state.birthJournal!==null) await sourceUnionBirthFileClosed(state.birthJournal,file,row.handle,row.identity,row.bytes,row.sha256);
}
function sameUnionOutput(a, b) {
  return ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
}
export async function assertProtectedProgressUnionOutput(invocation, row) {
  const state = unionJsonReadLifetimes.get(invocation);
  if (!state || !state.outputs.includes(row) || state.firstFailure !== null) {
    if (state?.firstFailure !== null && state?.firstFailure !== undefined) throw state.firstFailure[0];
    throw new Error('PROTECTED_PROGRESS_OUTPUT_NOT_OWNED');
  }
  for (const directory of row.directories) {
    const named = await fs.lstat(directory.path, { bigint: true });
    if (!named.isDirectory() || named.isSymbolicLink()
      || ['dev', 'ino', 'mode'].some(key => named[key] !== directory.identity[key])) throw new Error('PROTECTED_PROGRESS_OUTPUT_DIRECTORY_CHANGED');
  }
  const opened = await row.handle.stat({ bigint: true }), named = await fs.lstat(row.path, { bigint: true });
  if (!opened.isFile() || !named.isFile() || named.isSymbolicLink() || opened.nlink !== 1n
    || !sameUnionOutput(row.identity, opened) || !sameUnionOutput(row.identity, named)) throw new Error('PROTECTED_PROGRESS_OUTPUT_CHANGED');
  const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
  let position = 0;
  for (;;) {
    const { bytesRead } = await row.handle.read(buffer, 0, buffer.length, position);
    if (!bytesRead) break;
    position += bytesRead;
    if (position > row.bytes) throw new Error('PROTECTED_PROGRESS_OUTPUT_CHANGED');
    digest.update(buffer.subarray(0, bytesRead));
  }
  if (position !== row.bytes || digest.digest('hex') !== row.sha256
    || !sameUnionOutput(row.identity, await row.handle.stat({ bigint: true }))
    || !sameUnionOutput(row.identity, await fs.lstat(row.path, { bigint: true }))) throw new Error('PROTECTED_PROGRESS_OUTPUT_CHANGED');
  return row;
}
// Only a concrete original from this actual H71/native-or-verified-pack
// catalog can widen S's copy destination. CP_ORIGINAL is the existing normal
// union schema, not a prefix granting authority to a caller-provided file.
export async function assertSourceProgressUnionCopernicusOriginalOutput(invocation, row) {
  const state = unionJsonReadLifetimes.get(invocation), consumer = state?.sourceConsumer;
  if (state?.firstFailure !== null && state?.firstFailure !== undefined) throw state.firstFailure[0];
  if (!state || !consumer || state.invocation !== invocation || !state.sourceInput
    || state.temporaryDirectory !== state.sourceInput.temporaryDirectory
    || !state.settled || !state.claimed || !state.outputs.includes(row)
    || state.result !== consumer.owned.result || !consumer.proof
    || !consumer.owned.outputs.includes(state.sourceOutputInventory.get(row.path))
    || !protectedProgressPackJsonReadsClosed(invocation) || state.writers.some(writer => !writer.closed)) {
    throw new Error('PROTECTED_PROGRESS_CP_ORIGINAL_NOT_OWNED');
  }
  const relative = path.posix.relative('.cache/copernicus-components', row.relativePath);
  if (!CP_ORIGINAL.test(relative)
    || path.posix.join('.cache/copernicus-components', relative) !== row.relativePath) {
    throw new Error('PROTECTED_PROGRESS_CP_ORIGINAL_PATH_INVALID');
  }
  const file = state.result.files.find(file => file.relativePath === row.relativePath && file.sourcePath === row.path);
  const bank = state.result.files.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
  const expected = state.sourceOutputInventory.get(row.path);
  if (!file || !bank || file.bytes !== row.bytes || file.sha256 !== row.sha256
    || expected.bytes !== row.bytes || expected.sha256 !== row.sha256
    || relative.split('/')[0] === 'objects' && path.posix.basename(relative, '.nc') !== row.sha256) {
    throw new Error('PROTECTED_PROGRESS_CP_ORIGINAL_CATALOG_CHANGED');
  }
  if (state.result.copernicusMerged === true) {
    // Actual normal CP merger already re-read both banks/receipts/NetCDF and
    // called its semantic storage_inventory before its H71 result was issued.
    const merged = path.join(state.sourceInput.temporaryDirectory, 'source-union', 'merged-copernicus');
    if (bank.sourcePath !== path.join(merged, 'bank.json') || row.path !== path.join(merged, 'cache', ...relative.split('/'))) {
      throw new Error('PROTECTED_PROGRESS_CP_ORIGINAL_CATALOG_CHANGED');
    }
  } else {
    // With no complete CP bank, preserve only exact originals in this same
    // authenticated S manifest/native pack inventory, never an arbitrary row.
    const root = state.sourceInput.progressVerifiedRoot, original = state.progressInventory.get(row.path);
    if (state.result.copernicusMerged !== false || !original || original.bytes !== row.bytes || original.sha256 !== row.sha256
      || bank.sourcePath !== path.join(root, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank)
      || row.path !== path.join(root, ...row.relativePath.split('/'))) {
      throw new Error('PROTECTED_PROGRESS_CP_ORIGINAL_CATALOG_CHANGED');
    }
  }
  await assertProtectedProgressUnionOutput(invocation, row);
  return row;
}


export async function ownProtectedProgressUnionOutputs(invocation, actual) {
  const state = unionJsonReadLifetimes.get(invocation);
  if (!state || !state.settled || state.result !== actual || state.claimed) throw new Error('PROTECTED_PROGRESS_INVOCATION_REQUIRED');
  state.claimed = true;
  retainedUnionReaders.add(state);
  try {
    if (state.firstFailure !== null) throw state.firstFailure[0];
    // These are actual call/input observations, never caller-supplied flags.
    if (state.children.length || state.nativeInputs || state.dmiInputs) {
      await assertSourceOwnedProgressUnion(state);
    }
    if (state.sourceConsumer !== null) await assertSourceOwnedProgressUnion(state);
    if (!protectedProgressPackJsonReadsClosed(invocation) || state.writers.some(row => !row.closed)) throw new Error('PROTECTED_PROGRESS_IO_STOP_UNPROVED');
    for (const file of state.outputPlan) {
      const expected = state.sourceOutputInventory.get(file.sourcePath)
        ?? state.writers.find(row => row.file === file.sourcePath) ?? state.progressInventory.get(file.sourcePath);
      if (!expected || !Number.isSafeInteger(expected.bytes) || !/^[0-9a-f]{64}$/.test(expected.sha256 ?? '')) throw new Error('PROTECTED_PROGRESS_OUTPUT_NOT_BOUND');
      const relative = path.relative(state.temporaryDirectory, file.sourcePath);
      if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('PROTECTED_PROGRESS_OUTPUT_PATH_INVALID');
      const directories = [];
      let directory = state.temporaryDirectory;
      for (const segment of ['', ...relative.split(path.sep).slice(0, -1)]) {
        if (segment) directory = path.join(directory, segment);
        const identity = await fs.lstat(directory, { bigint: true });
        if (!identity.isDirectory() || identity.isSymbolicLink()) throw new Error('PROTECTED_PROGRESS_OUTPUT_DIRECTORY_INVALID');
        directories.push({ path: directory, identity });
      }
      const identity = await fs.lstat(file.sourcePath, { bigint: true });
      if (!identity.isFile() || identity.isSymbolicLink() || identity.nlink !== 1n) throw new Error('PROTECTED_PROGRESS_OUTPUT_INVALID');
      if (expected.identity && !sameUnionOutput(expected.identity, identity)) throw new Error('PROTECTED_PROGRESS_OUTPUT_CHANGED');
      const handle = await fs.open(file.sourcePath, unionFsConstants.O_RDONLY | (unionFsConstants.O_NOFOLLOW ?? 0));
      const row = Object.freeze({ handle, fd: handle.fd, path: file.sourcePath, relativePath: file.relativePath,
        identity, directories, bytes: expected.bytes, sha256: expected.sha256 });
      state.outputs.push(row);
      await assertProtectedProgressUnionOutput(invocation, row);
    }
    return Object.freeze([...state.outputs]);
  } catch (error) { state.firstFailure ??= [error]; throw state.firstFailure[0]; }
}

// Exact readers opened by the actual normal U output claim. A final P token
// plus that same opaque H proof binds the lookup; arrays never issue ownership.
export async function sourceProgressUnionFinalOutputReaders(holder,token,invocation,actual,proof) {
  const state=unionJsonReadLifetimes.get(invocation);
  if(state?.firstFailure!==null && state?.firstFailure!==undefined)throw state.firstFailure[0];
  if(!state || state.invocation!==invocation || !state.settled || !state.claimed || state.result!==actual
    || !state.sourceConsumer || state.sourceConsumer.proof!==proof || state.sourceConsumer.owned.result!==actual
    || !protectedProgressPackJsonReadsClosed(invocation) || state.writers.some(row=>!row.closed)
    || state.children.length || state.finalOwner)throw new Error('PROTECTED_PROGRESS_FINAL_READERS_NOT_OWNED');
  const {sourceFinalOwnerCloseInput}=await import('../protected-private-production-runtime.mjs');
  const final=sourceFinalOwnerCloseInput(holder,token);
  if(final.phase!=='ARMED')throw new Error('PROTECTED_PROGRESS_FINAL_READERS_NOT_ARMED');
  state.finalOwner={holder,token,actual,proof,rows:Object.freeze([...state.outputs]),firstFailure:null,completed:false};
  try {
    if(state.outputs.length!==state.outputPlan.length)throw new Error('PROTECTED_PROGRESS_FINAL_READERS_INCOMPLETE');
    for(const row of state.outputs)await assertProtectedProgressUnionOutput(invocation,row);
    return state.finalOwner.rows;
  }catch(error){state.finalOwner.firstFailure??=[error];throw state.finalOwner.firstFailure[0];}
}
export async function finishSourceProgressUnionFinalReaders(holder,token,invocation,actual) {
  const state=unionJsonReadLifetimes.get(invocation),finalOwner=state?.finalOwner;
  if(state?.firstFailure!==null && state?.firstFailure!==undefined)throw state.firstFailure[0];
  if(finalOwner?.firstFailure!==null && finalOwner?.firstFailure!==undefined)throw finalOwner.firstFailure[0];
  if(!state || !finalOwner || finalOwner.holder!==holder || finalOwner.token!==token || finalOwner.actual!==actual
    || finalOwner.completed || state.sourceConsumer?.proof!==finalOwner.proof || state.result!==actual
    || finalOwner.rows.length!==state.outputs.length || finalOwner.rows.some((row,index)=>row!==state.outputs[index])) {
    throw new Error('PROTECTED_PROGRESS_FINAL_READERS_NOT_OWNED');
  }
  try {
    const {sourceFinalOwnerCloseInput}=await import('../protected-private-production-runtime.mjs');
    if(sourceFinalOwnerCloseInput(holder,token).phase!=='CLEANUP')throw new Error('PROTECTED_PROGRESS_FINAL_READERS_NOT_CLEANUP');
    for(const row of finalOwner.rows) {
      const probe=await new Promise(resolve=>unionFstat(row.fd,(error,stat)=>resolve({error,stat})));
      if(row.handle.fd!==-1 || !probe.error || unionTypes.isProxy(probe.error)
        || Object.getOwnPropertyDescriptor(probe.error,'code')?.value!=='EBADF')throw new Error('PROTECTED_PROGRESS_FINAL_READER_UNCLOSED');
    }
    finalOwner.completed=true;retainedUnionReaders.delete(state);
  }catch(error){finalOwner.firstFailure??=[error];throw finalOwner.firstFailure[0];}
}

const unionJsonReadLifetimes = new WeakMap();
// Only the actual nested pack read lifetime; never an owner or admission.
export function protectedProgressPackJsonReadsClosed(invocation) {
  const state = unionJsonReadLifetimes.get(invocation);
  return state?.settled === true && state.readers.every(row => row.closed)
    && (state.packInvocation === null || privateWeatherPackJsonReadsClosed(state.packInvocation));
}
export function mergeVerifiedProtectedProgressComponents(options = {}, sourceUnionBirthJournal = null) {
  const state = { settled: false, packInvocation: null, readers: [], children: [],
    progressInventory: new Map(), firstFailure: null, writers: [], outputs: [], result: null, outputPlan: [],
    claimed: false, nativeInputs: false, dmiInputs: false, temporaryDirectory: null,
    invocation: null, factoryOptions: options, sourceInput: null, sourceConsumer: null, sourceOutputInventory: new Map() };
  state.birthJournal=sourceUnionBirthJournal;
  const invocation = mergeWithPackJsonReadLifetime(options, state);
  state.invocation = invocation;
  unionJsonReadLifetimes.set(invocation, state);
  invocation.then(result => { state.result = result; state.outputPlan = result.files.map(file => Object.freeze({ ...file })); state.settled = true; }, error => {
    state.settled = true; state.firstFailure = [error]; retainedUnionReaders.add(state);
  });
  return invocation;
}
async function mergeWithPackJsonReadLifetime({
  root, progressFiles, progressVerifiedRoot, temporaryDirectory, productionReferenceAt,
  completeFiles = null, completeIsNewer = false, sourceInstalledComponents = null,
  pythonExecutable = process.env.PYTHON ?? 'python',
} = {}, readState) {
  if (!Array.isArray(progressFiles) || typeof root !== 'string' || typeof progressVerifiedRoot !== 'string'
    || typeof temporaryDirectory !== 'string' || typeof completeIsNewer !== 'boolean'
    || (completeIsNewer && completeFiles === null)) {
    throw new Error('PROTECTED_PROGRESS_ARGUMENTS_INVALID');
  }
  let sourceComponents = null;
  if (sourceInstalledComponents !== null) {
    if (completeFiles !== null || completeIsNewer) throw new Error('PROTECTED_PROGRESS_BASE_INVALID');
    sourceComponents = await import('../protected-private-production-runtime.mjs');
    completeFiles = await sourceComponents.consumeSourceProgressInstalledComponents(sourceInstalledComponents, root, productionReferenceAt);
  }
  readState.temporaryDirectory = path.resolve(temporaryDirectory);
  readState.dmiInputs = progressFiles.some(file => Object.values(PRIVATE_WEATHER_PROGRESS_ONLY_FILES).includes(file.relativePath));
  readState.nativeInputs = progressFiles.some(file => /copernicus|current-donor/.test(file.relativePath));
  readState.progressInventory = new Map(progressFiles
    .filter(file => file && typeof file.sourcePath === 'string' && Number.isSafeInteger(file.bytes) && /^[0-9a-f]{64}$/.test(file.sha256 ?? ''))
    .map(file => [file.sourcePath, file]));
  if (sourceComponents !== null) {
    return runSourceOwnedProgressUnion({ root, progressFiles, progressVerifiedRoot, temporaryDirectory,
      productionReferenceAt, completeFiles, sourceInstalledComponents }, readState, sourceComponents);
  }
  const dmi = await reconcileDmiProgressFiles({ root, files: progressFiles, temporaryDirectory, productionReferenceAt,
    sourceUnionBirthJournal:readState.birthJournal });
  progressFiles = dmi.files;
  let protectedFiles = completeFiles;
  if (protectedFiles !== null && !Array.isArray(protectedFiles)) throw new Error('PROTECTED_PROGRESS_BASE_INVALID');
  if (protectedFiles === null) {
    const protectedPack = path.join(root, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    const stat = await fs.lstat(protectedPack).catch(error => {
      if (error?.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return { files: progressFiles, openMeteoAdded: 0, copernicusMerged: false,
      currentDonorMerged: { copernicus: false, openMeteo: false }, dmiProgress: dmi.summary };
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('PROTECTED_PROGRESS_BASE_INVALID');
  }
  // GitHub's production-hour lock uses seconds; component records use .000Z.
  // Accept both spellings of the same exact UTC hour, without rounding times.
  if (!exactHour(productionReferenceAt)) throw new Error('PROTECTED_PROGRESS_TARGET_HOUR_INVALID');
  productionReferenceAt = new Date(productionReferenceAt).toISOString();
  if (protectedFiles === null) {
    const conditions = await readUnionJson(path.join(root, 'data/live/conditions.json'), readState);
    readState.packInvocation = unpackPrivateWeatherComponentPack({
      restoredRoot: root,
      outputRoot: path.join(temporaryDirectory, 'protected-verified'),
      conditions, pythonExecutable,
    });
    protectedFiles = await readState.packInvocation.catch(() => { throw new Error('PROTECTED_PROGRESS_BASE_UNPACK_FAILED'); });
  }
  readState.nativeInputs ||= protectedFiles.some(file => /copernicus|current-donor/.test(file.relativePath));
  const registry = await readUnionJson(path.join(root, 'data/live/coastal-parts-v2.json'), readState);
  const parts = Object.entries(registry.zones ?? {}).flatMap(([zoneId, rows]) =>
    rows.map(part => ({ ...part, zoneId })));
  if (parts.length !== registry.partCount || parts.length < 1) {
    throw new Error('PROTECTED_PROGRESS_TARGETS_INVALID');
  }
  let files = [...progressFiles];
  let openMeteoAdded = 0;
  const latestOm = fileOf(files, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank);
  const protectedOm = fileOf(protectedFiles, PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank);
  if (protectedOm && (latestOm || completeIsNewer)) {
    const latest = latestOm ? await readUnionJson(latestOm.sourcePath, readState) : null;
    const complete = await readUnionJson(protectedOm.sourcePath, readState);
    const reference = Date.parse(productionReferenceAt);
    let merged;
    try {
      merged = mergeVerifiedOpenMeteoGenerations(
        completeIsNewer ? complete : latest, completeIsNewer ? latest : complete, {
        parts, spatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,
        retentionStartAt: new Date(reference - RESEARCH_HISTORY_HOURS * HOUR).toISOString(),
        retentionEndAt: new Date(reference + (OPEN_METEO_FUTURE_HOURS - 1) * HOUR).toISOString(),
      });
    } catch { throw new Error('PROTECTED_PROGRESS_OPEN_METEO_MERGE_FAILED'); }
    // Both inputs have now passed original-byte admission. Count newly usable
    // exact slots, not a net record delta: retiring an unusable tuple is not
    // lost valid weather, and replacing an already usable slot is not a gain.
    const slotKey = row => JSON.stringify([row.partId, row.validTime, row.component]);
    const usable = row => OPEN_METEO_PART_COMPONENTS.includes(row.component)
      && hasValue(row.values, row.component);
    const previousUsable = new Set((latest?.records ?? []).filter(row => usable(row)
      && row.validTime >= merged.retention.startAt && row.validTime <= merged.retention.endAt).map(slotKey));
    openMeteoAdded = merged.records.filter(row => usable(row) && !previousUsable.has(slotKey(row))).length;
    const destination = path.join(temporaryDirectory, 'merged-open-meteo-bank.json');
    await writeUnionOutput(destination, `${JSON.stringify(merged)}\n`, readState);
    if (latestOm) files = files.map(file => file === latestOm ? { ...file, sourcePath: destination } : file);
    else files.push({ relativePath: PRIVATE_WEATHER_COMPONENT_FILES.openMeteoBank, sourcePath: destination });
  }
  let copernicusMerged = false;
  const latestCp = fileOf(files, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
  const protectedCp = fileOf(protectedFiles, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank);
  if (protectedCp && (latestCp || completeIsNewer)) {
    const outputRoot = path.join(temporaryDirectory, 'merged-copernicus');
    const summary = path.join(temporaryDirectory, 'merged-copernicus-summary.json');
    await runPython(pythonExecutable, [
      '--merge-generations', '--bank', completeIsNewer ? protectedCp.sourcePath : latestCp.sourcePath,
      '--cache-directory', completeIsNewer
        ? path.join(path.dirname(protectedCp.sourcePath), 'copernicus-components')
        : path.join(progressVerifiedRoot, '.cache/copernicus-components'),
      '--complete-bank', completeIsNewer ? (latestCp ?? protectedCp).sourcePath : protectedCp.sourcePath,
      '--complete-cache-directory', completeIsNewer
        ? latestCp
          ? path.join(progressVerifiedRoot, '.cache/copernicus-components')
          : path.join(path.dirname(protectedCp.sourcePath), 'copernicus-components')
        : path.join(path.dirname(protectedCp.sourcePath), 'copernicus-components'),
      '--merge-output-root', outputRoot,
      '--target-registry', path.join(root, 'data/live/coastal-parts-v2.json'),
      '--target-reference', productionReferenceAt,
      '--output', summary,
    ], readState);
    const report = await readUnionJson(summary, readState);
    if (report.kind !== 'CP_COMPONENT_DUAL_GENERATION_STAGE' || !/^sha256:[0-9a-f]{64}$/.test(report.bankSha256)) {
      throw new Error('PROTECTED_PROGRESS_CP_MERGE_REPORT_INVALID');
    }
    files = files.filter(file => file.relativePath !== PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank
      && !file.relativePath.startsWith('.cache/copernicus-components/'));
    files.push({ relativePath: PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank,
      sourcePath: path.join(outputRoot, 'bank.json') });
    files.push(...await cpOriginalFiles(path.join(outputRoot, 'cache')));
    copernicusMerged = true;
  }
  const currentDonorMerged = { copernicus: false, openMeteo: false };
  for (const [name, relativePath, kind, reportKind] of [
    ['copernicus', PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentDonorBank,
      'copernicus', 'COPERNICUS_CURRENT_DONOR_GENERATION_UNION'],
    ['openMeteo', PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentDonorBank,
      'open-meteo', 'OPEN_METEO_CURRENT_DONOR_GENERATION_UNION'],
  ]) {
    const latest = fileOf(files, relativePath);
    const complete = fileOf(protectedFiles, relativePath);
    if (!complete || (!latest && !completeIsNewer)) continue;
    const output = path.join(temporaryDirectory, `merged-${name}-current-donor.json`);
    const reportPath = path.join(temporaryDirectory, `merged-${name}-current-donor-report.json`);
    await runCurrentDonorPython(pythonExecutable, [
      '--kind', kind,
      '--latest', completeIsNewer ? complete.sourcePath : latest.sourcePath,
      '--complete', completeIsNewer ? (latest ?? complete).sourcePath : complete.sourcePath,
      '--targets', path.join(root, 'data/live/coastal-parts-v2.json'),
      '--target-reference', productionReferenceAt, '--output', output, '--report', reportPath,
    ], readState);
    const report = await readUnionJson(reportPath, readState);
    if (report.schemaVersion !== 1 || report.kind !== reportKind
      || !Number.isSafeInteger(report.recordCount) || report.recordCount < 0) {
      throw new Error('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REPORT_INVALID');
    }
    if (latest) files = files.map(file => file === latest ? { ...file, sourcePath: output } : file);
    else files.push({ relativePath, sourcePath: output });
    currentDonorMerged[name] = true;
  }
  const names = files.map(file => file.relativePath);
  if (new Set(names).size !== names.length) throw new Error('PROTECTED_PROGRESS_DUPLICATE_OUTPUT');
  if (sourceComponents !== null) await sourceComponents.assertSourceProgressInstalledComponents(
    sourceInstalledComponents, completeFiles, root, productionReferenceAt);
  return { files, openMeteoAdded, copernicusMerged, currentDonorMerged, dmiProgress: dmi.summary };
}

async function runCurrentDonorPython(pythonExecutable, args, readState) {
  await new Promise((resolve, reject) => {
    const transport=readState.birthJournal===null?null:sourceUnionBirthChildTransport(readState.birthJournal,readState.temporaryDirectory);
    const child = spawn(pythonExecutable, [CURRENT_DONOR_RUNNER, ...args, ...(transport?.args??[])], {
      windowsHide: true, stdio: transport?.stdio??'ignore', env: copernicusOfflineEnvironment(),
    });
    readState.children.push(child);
    let fault = null, stopRequested = false, closed = false;
    const stop = code => {
      if (closed) return;
      fault ??= new Error(code);
      clearTimeout(timer);
      if (stopRequested) return;
      stopRequested = true;
      try { if (child.pid) child.kill('SIGKILL'); } catch { /* Await close. */ }
    };
    const timer = setTimeout(() => stop('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_TIMEOUT'), 180_000);
    child.on('error', () => stop('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_UNAVAILABLE'));
    child.once('close', code => {
      closed = true;
      clearTimeout(timer);
      if (fault) reject(fault);
      else code === 0 ? resolve() : reject(new Error('PROTECTED_PROGRESS_CURRENT_DONOR_MERGE_REJECTED'));
    });
  });
}
