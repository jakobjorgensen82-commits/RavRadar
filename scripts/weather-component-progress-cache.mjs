#!/usr/bin/env node
// Optional, encrypted acquisition progress only. Never production/state authority.
import crypto from 'node:crypto';
import { bindSourceOriginalProgress, assertSourceOriginalProgress, retainSourceOriginalProgressFailure, beginSourceWorkingInstall, finishSourceWorkingInstall, sourceDmiWorkingInstallInput, assertSourceDmiWorkingInstallInput, sourceNormalWorkingInstallInput, assertSourceNormalWorkingInstallInput, sourceOriginalProgressResumeRequest, runSourceOriginalTargetRegistry, sourceNormalDeployedCopyInput, assertSourceNormalDeployedCopyInput, sourceFinalOwnerCloseInput, assertSourceFinalPackClosure, prepareSourceProgressTemporaryCleanup, sourceFinalProgressRetainedReader, prepareSourceProgressUnionFinalInput, sourceProgressUnionFinalCleanupInput, issueSourceProgressCpInventoryContext, retainSourceProgressPackInvocation, assertSourceProgressPackClosure } from './source-normal-producer-tail.mjs';
import fs from 'node:fs/promises';
import { ReadStream as SourceProgressReadStream, WriteStream as SourceProgressWriteStream, fstatSync as sourceProgressFstatSync, fsyncSync as sourceProgressFsyncSync, lstatSync as sourceProgressLstatSync } from 'node:fs';
import { createReadStream, createWriteStream, constants as sourceProgressFsConstants } from 'node:fs';
import { fstat as sourceWorkingFstat } from 'node:fs';
import { types as sourceWorkingTypes } from 'node:util';
import { constants as fsConstants } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGzip, createGunzip } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { copernicusOfflineEnvironment } from './lib/copernicus-offline-environment.mjs';
import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';
import { buildPrivateWeatherComponentPack, unpackPrivateWeatherComponentPack, privateWeatherPackJsonReadsClosed, sourcePackOutputCatalog,
  ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_RUNTIME_BASE_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, PRIVATE_WEATHER_COMPONENT_FILES } from './lib/private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './lib/private-weather-progress-files.mjs';
import { mergeVerifiedProtectedProgressComponents, protectedProgressUnionFailureCode, protectedProgressPackJsonReadsClosed, ownProtectedProgressUnionOutputs, assertProtectedProgressUnionOutput, assertSourceProgressUnionCopernicusOriginalOutput, sourceProgressUnionFactoryInput, finishSourceProgressUnionFinalReaders } from './lib/verified-protected-progress-components.mjs';

export const WEATHER_PROGRESS_CIPHER_PATH = '.cache/weather-private-progress.encrypted';
const PURPOSE = 'RAVRADAR_WEATHER_PRIVATE_PROGRESS_ONLY';
const MAGIC = Buffer.from('RR-WEATHER-PRIVATE-PROGRESS-2\n');
const MAX_PACK_BYTES = 768 * 1024 * 1024;
// Best-effort progress shares GitHub's cache with the larger GRIB cache.
// This is a storage budget, not an estimate of real provider-bank sizes.
export const WEATHER_PROGRESS_MAX_CIPHER_BYTES = 384 * 1024 * 1024;
const MAX_CIPHER_BYTES = WEATHER_PROGRESS_MAX_CIPHER_BYTES;
const CONDITIONS_PATH = 'data/live/conditions.json';
const SHA = /^[0-9a-f]{64}$/;
// Only fixed, payload-free pack error codes may appear in Actions logs.
const SAFE_PACK_ERROR_CODES = new Set([
  'WEATHER_PACK_SIZE_LIMIT', 'WEATHER_PACK_FILE_SIZE_INVALID',
  'WEATHER_PACK_JSON_SIZE_INVALID', 'WEATHER_PACK_JSON_INVALID',
  'WEATHER_PACK_CP_INVENTORY_TIMEOUT', 'WEATHER_PACK_CP_INVENTORY_UNAVAILABLE',
  'WEATHER_PACK_CP_ORIGINALS_INVALID', 'WEATHER_PACK_CP_INVENTORY_INVALID',
  'WEATHER_PACK_CP_REFERENCE_INVALID', 'WEATHER_PACK_CP_ORIGINAL_CHANGED',
  'WEATHER_PACK_OM_BANK_HASH_INVALID', 'WEATHER_PACK_REQUIRED_INPUT_MISSING_OR_CHANGED',
  'WEATHER_PACK_CP_PROGRESS_WITHOUT_BANK', 'WEATHER_PACK_SOURCE_CHANGED',
]);
const fail = code => { const error = new Error(code); error.progressCode = code; throw error; };
const status = (value, code, extra = {}) => ({
  schemaVersion: 1, kind: 'WEATHER_COMPONENT_PROGRESS_CACHE_RESULT', status: value, code,
  captured: false, restored: false, saved: false, requiresProtectedRestore: false,
  productionAuthority: false, privatePayloadIncluded: false, ...extra,
});

function repoIdentity(repository) {
  if (typeof repository !== 'string' || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) fail('REPOSITORY_INVALID');
  return repository;
}
function keyBytes(value, { masterSecret, repository } = {}) {
  if ((typeof value !== 'string' || !value.trim())
    && typeof masterSecret === 'string'
    && masterSecret.trim().length >= 32) {
    return Buffer.from(crypto.hkdfSync(
      'sha256',
      Buffer.from(masterSecret.trim(), 'utf8'),
      Buffer.from(`RavRadar/${repository}`, 'utf8'),
      Buffer.from(`${PURPOSE}/AES-256-GCM/v1`, 'utf8'),
      32,
    ));
  }
  if (typeof value !== 'string' || !value.trim()) fail('ENCRYPTION_KEY_UNAVAILABLE');
  const text = value.trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(text)) fail('ENCRYPTION_KEY_INVALID');
  const result = Buffer.from(text, 'base64');
  if (result.length !== 32 || result.toString('base64') !== text) fail('ENCRYPTION_KEY_INVALID');
  return result;
}
function boundedStream(maximum) {
  let bytes = 0;
  return new Transform({ transform(chunk, encoding, callback) {
    bytes += chunk.length;
    if (bytes > maximum) { const error = new Error('SIZE_LIMIT'); error.progressCode = 'SIZE_LIMIT'; callback(error); }
    else callback(null, chunk);
  } });
}
async function rootPath(repositoryRoot) {
  const requested = path.resolve(repositoryRoot);
  const stat = await fs.lstat(requested);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('ROOT_INVALID');
  return fs.realpath(requested);
}
async function checkedPath(root, relative, { optional = false, maximum = MAX_PACK_BYTES } = {}) {
  const destination = path.resolve(root, relative);
  const rel = path.relative(root, destination);
  if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) fail('PATH_INVALID');
  let current = root;
  const segments = rel.split(path.sep);
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const stat = await fs.lstat(current).catch(error => {
      if (error.code === 'ENOENT' && optional) return null;
      throw error;
    });
    if (!stat) return null;
    if (stat.isSymbolicLink()) fail('SYMLINK_REJECTED');
    if (index < segments.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.size < 1 || stat.size > maximum) fail('FILE_INVALID');
  }
  return destination;
}
async function conditionsDigest(root) {
  const source = await checkedPath(root, CONDITIONS_PATH);
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(source)) {
    bytes += chunk.length;
    if (bytes > MAX_PACK_BYTES) fail('SIZE_LIMIT');
    hash.update(chunk);
  }
  return hash.digest('hex');
}
async function readBase(basePath, repository) {
  const stat = await fs.lstat(basePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4096) fail('BASE_INVALID');
  let base;
  try { base = JSON.parse(await fs.readFile(basePath, 'utf8')); } catch { fail('BASE_INVALID'); }
  if (Object.keys(base ?? {}).sort().join(',') !== 'baselineSha256,kind,protectedBundleContentSha256,repository,schemaVersion'
    || base.kind !== PURPOSE || base.schemaVersion !== 1 || base.repository !== repository
    || !SHA.test(base.baselineSha256) || !SHA.test(base.protectedBundleContentSha256)) fail('BASE_INVALID');
  return base;
}
async function temporaryRoot(sourceOwner = null) {
  const parent = await fs.realpath(os.tmpdir());
  const folder = await fs.mkdtemp(path.join(parent, 'rr-encrypted-progress-'));
  const temporary = { folder, async cleanup() {
    const resolved = path.resolve(folder);
    if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('rr-encrypted-progress-')) fail('CLEANUP_PATH_INVALID');
    await fs.rm(resolved, { recursive: true, force: true });
  } };
  if (sourceOwner) {
    // Retain the born directory even if its immediate identity read fails.
    sourceOwner.temporary = temporary;
    const born = await fs.lstat(folder, { bigint: true });
    if (!born.isDirectory() || born.isSymbolicLink()) fail('SOURCE_PROGRESS_CP_BIRTH_CHANGED');
    temporary.identity = Object.freeze({ dev: born.dev, ino: born.ino, mode: born.mode, nlink: born.nlink });
    Object.freeze(temporary);
  }
  return temporary;
}
async function readExactly(handle, length, position) {
  const buffer = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const read = await handle.read(buffer, offset, length - offset, position + offset);
    if (!read.bytesRead) fail('SNAPSHOT_INVALID');
    offset += read.bytesRead;
  }
  return buffer;
}

// Private SOURCE preparation; no public owner/token/release API. Audit callers
// below keep their old cleanup policy. This set retains real I/O, never a receipt.
const retainedSourceProgressOwners = new Set();
function retainSourceProgressFailure(owner, error) {
  if (owner.failure === null) owner.failure = [error];
  retainedSourceProgressOwners.add(owner);
  return owner.failure[0];
}
function sameSourceProgressFile(a, b) {
  return ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
}
async function checkSourceProgressHandle(row) {
  for (const directory of row.directories) {
    const current = await fs.lstat(directory.path, { bigint: true });
    if (!current.isDirectory() || current.isSymbolicLink()
      || ['dev', 'ino', 'mode'].some(key => current[key] !== directory.identity[key])) {
      fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
    }
  }
  const opened = await row.handle.stat({ bigint: true });
  const named = await fs.lstat(row.path, { bigint: true });
  if (!opened.isFile() || !named.isFile() || named.isSymbolicLink() || opened.nlink !== 1n
    || !sameSourceProgressFile(row.identity, opened) || !sameSourceProgressFile(row.identity, named)) {
    fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  }
}
async function ownSourceProgressHandle(owner, file, expected = null) {
  const inside = parent => { const relative = path.relative(parent, file); return relative && !relative.startsWith('..') && !path.isAbsolute(relative); };
  const root = owner.temporary && inside(owner.temporary.folder) ? owner.temporary.folder : owner.root;
  if (!root || !inside(root)) fail('SOURCE_PROGRESS_ORIGINAL_INVALID');
  const directories = [];
  let directory = root;
  for (const segment of ['', ...path.relative(root, file).split(path.sep).slice(0, -1)]) {
    if (segment) directory = path.join(directory, segment);
    const identity = await fs.lstat(directory, { bigint: true });
    if (!identity.isDirectory() || identity.isSymbolicLink()) fail('SOURCE_PROGRESS_ORIGINAL_INVALID');
    directories.push({ path: directory, identity });
  }
  const identity = await fs.lstat(file, { bigint: true });
  if (!identity.isFile() || identity.isSymbolicLink() || identity.nlink !== 1n) fail('SOURCE_PROGRESS_ORIGINAL_INVALID');
  const handle = await fs.open(file, sourceProgressFsConstants.O_RDONLY | (sourceProgressFsConstants.O_NOFOLLOW ?? 0));
  const row = { handle, path: file, identity, expected, directories };
  owner.handles.push(row); // Before stat/read can fail; never discard an uncertain fd.
  await checkSourceProgressHandle(row);
  if (expected) {
    const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
    let position = 0;
    for (;;) {
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      position += bytesRead;
      if (position > expected.bytes) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
      digest.update(buffer.subarray(0, bytesRead));
    }
    await checkSourceProgressHandle(row);
    if (position !== expected.bytes || digest.digest('hex') !== expected.sha256) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  }
  return row;
}
async function checkSourceProgressOriginals(owner) {
  if (owner.failure !== null) throw owner.failure[0];
  if (owner.holder) await assertSourceOriginalProgress(owner.holder);
  for (const row of owner.handles) await checkSourceProgressHandle(row);
}
const sourceProgressFileStreamOwners = new WeakMap();
function sourceProgressFileStreamFailure(owner, error) {
  return retainSourceProgressFailure(owner, error);
}
function sourceProgressFileStreamRecord(owner, state, stream) {
  if (!(stream instanceof SourceProgressReadStream) && !(stream instanceof SourceProgressWriteStream)) return;
  if (state.rows.some(row => row.stream === stream)) fail('SOURCE_PROGRESS_STREAM_REUSED');
  const row = { stream, fd: null, identity: null, file: null, borrowed: null,
    closeObserved: false, closed: false, firstFailure: null, outputStat: null,
    descriptorIdentity: null, closeProof: null };
  state.rows.push(row); // The actual stream is retained before any asynchronous open.
  const reject = error => {
    if (row.firstFailure === null) row.firstFailure = [error];
    sourceProgressFileStreamFailure(owner, row.firstFailure[0]);
  };
  const opened = fd => {
    try {
      if (row.fd !== null || !Number.isSafeInteger(fd) || fd < 0) fail('SOURCE_PROGRESS_STREAM_FD_INVALID');
      row.fd = fd; // Before fstat/lstat can throw, including a raw null.
      row.descriptorIdentity = ownFileDescriptorIdentity(fd);
      if (row.descriptorIdentity === null) fail('SOURCE_PROGRESS_STREAM_FD_INVALID');
      row.identity = sourceProgressFstatSync(fd, { bigint: true });
      if (stream.autoClose === false) {
        row.borrowed = owner.handles.find(input => input.handle.fd === fd);
        if (!(stream instanceof SourceProgressReadStream) || !row.borrowed
          || !sameSourceProgressFile(row.identity, row.borrowed.identity)) fail('SOURCE_PROGRESS_STREAM_BORROW_UNPROVED');
        row.file = row.borrowed.path;
      } else {
        if (typeof stream.path !== 'string') fail('SOURCE_PROGRESS_STREAM_PATH_INVALID');
        row.file = path.resolve(stream.path);
        const inside = root => root && path.relative(root, row.file)
          && !path.relative(root, row.file).startsWith('..') && !path.isAbsolute(path.relative(root, row.file));
        if (!inside(owner.root) && !inside(owner.temporary?.folder)) fail('SOURCE_PROGRESS_STREAM_PATH_INVALID');
        const named = sourceProgressLstatSync(row.file, { bigint: true });
        if (!row.identity.isFile() || !named.isFile() || named.isSymbolicLink()
          || row.identity.nlink !== 1n || !sameSourceProgressFile(row.identity, named)) fail('SOURCE_PROGRESS_STREAM_IDENTITY_CHANGED');
      }
    } catch (error) { reject(error); }
  };
  stream.once('error', reject);
  stream.once('open', opened);
  if (stream instanceof SourceProgressWriteStream) stream.once('finish', () => {
    try {
      if (row.fd === null || !row.identity || stream.flags !== 'wx' || row.identity.size !== 0n
        || row.borrowed || row.closeObserved) fail('SOURCE_PROGRESS_OUTPUT_BIRTH_UNPROVED');
      sourceProgressFsyncSync(row.fd);
      const written = sourceProgressFstatSync(row.fd, { bigint: true });
      if (!written.isFile() || written.nlink !== 1n
        || ['dev', 'ino', 'mode'].some(key => written[key] !== row.identity[key])) fail('SOURCE_PROGRESS_OUTPUT_CHANGED');
      row.outputStat = written; // Actual writer FD, before its close; never adopted from a later path read.
    } catch (error) { reject(error); }
  });
  stream.once('close', () => {
    row.closeObserved = true;
    // Retain the real asynchronous kernel probe before yielding. A pipeline's
    // close event is NOT itself its descriptor-close acknowledgement.
    row.closeProof = (async () => {
      try {
        if (row.fd === null || row.identity === null || row.descriptorIdentity === null
          || row.borrowed && !sourceProgressBorrowedFinalClose(owner, row)) fail('SOURCE_PROGRESS_STREAM_CLOSE_UNPROVED');
        if (!await ownedFileDescriptorClosed(row.fd, row.descriptorIdentity)) fail('SOURCE_PROGRESS_STREAM_CLOSE_UNPROVED');
        const named = sourceProgressLstatSync(row.file, { bigint: true });
        if (!named.isFile() || named.isSymbolicLink()
          || ['dev', 'ino', 'mode', 'nlink'].some(key => named[key] !== row.identity[key])) fail('SOURCE_PROGRESS_STREAM_IDENTITY_CHANGED');
        row.closed = true;
      } catch (error) { reject(error); }
      finally { row.finalOwnerCloseResolve?.(); }
    })();
  });
  if (Number.isSafeInteger(stream.fd) && stream.fd >= 0) opened(stream.fd);
}
// Internal S boundary only: no release, cleanup, admission or caller receipt.
// autoClose:false readers BORROW their genuine S FileHandle; never destroy or
// close them here. Their actual owner remains live for the later global gate.
async function closeSourceProgressOwnerFileStreams(owner) {
  if (!retainedSourceProgressOwners.has(owner) || !owner.holder) fail('SOURCE_PROGRESS_OWNER_REQUIRED');
  try {
    if (owner.failure !== null) throw owner.failure[0];
    const state = sourceProgressFileStreamOwners.get(owner);
    if (!state || state.active !== 0) fail('SOURCE_PROGRESS_STREAM_STOP_UNPROVED');
    await checkSourceProgressOriginals(owner);
    if (state.active !== 0 || sourceProgressFileStreamOwners.get(owner) !== state) fail('SOURCE_PROGRESS_STREAM_STOP_UNPROVED');
    for (const row of state.rows) {
      if (row.closeProof !== null) await row.closeProof;
      if (row.firstFailure !== null) throw row.firstFailure[0];
      if (row.fd === null || row.identity === null) fail('SOURCE_PROGRESS_STREAM_OPEN_UNPROVED');
      if (row.borrowed) {
        if (!row.stream.readableEnded || row.closeObserved || row.stream.destroyed
          || row.borrowed.handle.fd !== row.fd) fail('SOURCE_PROGRESS_STREAM_BORROW_UNPROVED');
        await checkSourceProgressHandle(row.borrowed);
      } else if (!row.closeObserved || !row.closed) fail('SOURCE_PROGRESS_STREAM_CLOSE_UNPROVED');
    }
    if (state.active !== 0) fail('SOURCE_PROGRESS_STREAM_STOP_UNPROVED');
    if (owner.failure !== null) throw owner.failure[0];
  } catch (error) { throw sourceProgressFileStreamFailure(owner, error); }
}
// Final-only lookup from the actual completed S factory, never the old
// pre-union CP lookup or a caller-supplied owner/array/Promise.
export async function sourceProgressUnionFinalContextInput(holder,token,invocation,receipt) {
  const final=sourceFinalOwnerCloseInput(holder,token),bound=sourceProgressUnionInvocations.get(invocation);
  const completed=bound?.completed,owner=completed?.owner;
  if(owner?.failure!==null && owner?.failure!==undefined)throw owner.failure[0];
  if(completed?.firstFailure!==null && completed?.firstFailure!==undefined)throw completed.firstFailure[0];
  if(final.phase!=='ARMED' || !bound || !owner || !retainedSourceProgressOwners.has(owner)
    || owner.holder!==holder || owner.failure!==null || completed.firstFailure!==null
    || receipt!==owner.completedPackReceipt || receipt!==bound.input.receipt || owner.unionInvocation!==invocation
    || owner.result!==await invocation || owner.input!==completed.value.input || !owner.installStarted
    || !owner.operation || !owner.workingGeneration || sourceWorkingCompletions.get(owner.operation)?.input!==owner
    || sourceWorkingCompletions.get(owner.operation)?.invocation!==invocation
    || sourceWorkingCompletions.get(owner.operation)?.actual!==owner.result
    || sourceProgressUnionFactoryInput(invocation)!==bound.options
    || sourceProgressCpInputs.get(owner.cpInput)!==completed.cp || owner.packInvocation!==completed.value.packInvocation
    || owner.temporary!==completed.value.temporary || owner.binding!==completed.value.binding
    || owner.resume!==completed.value.resume || sourcePackOutputCatalog(owner.packInvocation)!==completed.value.catalog) fail('FINAL_NESTED_PACK_CLOSURE_UNAVAILABLE');
  await sourceProgressFinalOriginals(owner,token);
  await closeSourceProgressOwnerFileStreams(owner);
  for(let index=0;index<completed.cp.rows.length;index++) {
    const row=await sourceProgressFinalRow(owner,completed.cp.rows[index],token);
    const actual=await sourceProgressCpDigest(row),expected=completed.cp.expected[index];
    if(actual.bytes!==expected.bytes||actual.sha256!==expected.sha256)fail('SOURCE_PROGRESS_UNION_PACK_CHANGED');
  }
  return Object.freeze({source:bound.input,owner,result:owner.result,receipt,operation:owner.operation,
    workingGeneration:owner.workingGeneration,installedReference:completed.value.installedReference});
}
async function sourceProgressFinalRow(owner,row,token) {
  const retained=await sourceFinalProgressRetainedReader(owner.holder,token,row.handle);
  if(retained===null) return row;
  if(retained.handle!==row.handle || ['dev','ino','mode','nlink','size','mtimeNs'].some(key=>retained.stat[key]!==row.identity[key])
    || row.expected && (retained.bytes!==row.expected.bytes||retained.sha256!==row.expected.sha256)) fail('SOURCE_PROGRESS_FINAL_READER_CHANGED');
  // A genuine later rename may change ctime and path. The actual P-preserved
  // same-handle view alone supplies them; original S metadata is never mutated.
  return {...row,path:retained.path,identity:retained.stat,expected:{bytes:retained.bytes,sha256:retained.sha256},
    directories:retained.directories.map(directory=>({path:directory.path,identity:directory.stat}))};
}
async function sourceProgressFinalOriginals(owner,token) {
  if(owner.failure!==null)throw owner.failure[0];
  if(owner.holder)await assertSourceOriginalProgress(owner.holder);
  for(const row of owner.handles)await checkSourceProgressHandle(await sourceProgressFinalRow(owner,row,token));
}

const sourceProgressTemporaryCatalogs = new WeakMap();
async function prepareSourceProgressTemporaryReference(owner, token, result) {
  const input = sourceFinalOwnerCloseInput(owner.holder, token);
  const cp = sourceProgressCpInputs.get(owner.cpInput);
  if (input.phase !== 'ARMED' || sourceProgressFinalOwnerCloses.get(token) !== result
    || !cp || cp.owner !== owner || cp.input.temporary !== owner.temporary
    || !owner.packDirectory?.birth || !owner.packInvocation
    || owner.failure !== null) fail('FINAL_PROGRESS_TEMP_CATALOG_UNAVAILABLE');
  const output = sourcePackOutputCatalog(owner.packInvocation);
  if (output.invocation !== owner.packInvocation || output.context !== owner.cpInventoryContext
    || output.root !== cp.input.stage || output.root !== path.join(owner.temporary.folder, 'verified')) fail('FINAL_PROGRESS_TEMP_SOURCE_CHANGED');
  const pick = handle => {
    const rows = result.rows.filter(row => row.handle === handle);
    if (rows.length !== 1) fail('FINAL_PROGRESS_TEMP_READER_UNPROVED');
    return rows[0];
  };
  const streams = sourceProgressFileStreamOwners.get(owner), rows = [];
  for (let index = 1; index < cp.rows.length; index++) {
    const reader = pick(cp.rows[index].handle), expected = cp.expected[index];
    const writers = streams.rows.filter(row => row.stream instanceof SourceProgressWriteStream && row.file === reader.path);
    if (writers.length !== 1 || !writers[0].outputStat || !writers[0].closeObserved || !writers[0].closed
      || writers[0].firstFailure !== null || !sameSourceProgressFile(writers[0].outputStat, reader.stat)
      || reader.bytes !== expected.bytes || reader.sha256 !== expected.sha256) fail('FINAL_PROGRESS_TEMP_WRITER_UNPROVED');
    rows.push(reader);
  }
  if (cp.rows.length !== 3 || rows[0].path !== path.join(owner.temporary.folder, 'authenticated-pack.gz')
    || rows[1].path !== path.join(owner.temporary.folder, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath)) fail('FINAL_PROGRESS_TEMP_SOURCE_CHANGED');
  for (const file of output.files) {
    const handles = owner.handles.filter(row => row.path === file.path);
    if (handles.length !== 1 || file.path !== path.join(output.root, file.relativePath)) fail('FINAL_PROGRESS_TEMP_READER_UNPROVED');
    const reader = pick(handles[0].handle);
    if (!sameSourceProgressFile(reader.stat, file.stat) || reader.bytes !== file.bytes || reader.sha256 !== file.sha256
      || ['dev', 'ino', 'mode', 'nlink'].some(key => file.birth[key] !== file.stat[key])) fail('FINAL_PROGRESS_TEMP_OUTPUT_CHANGED');
    rows.push(reader);
  }
  let unionReference=null,unionValue=null;
  if(owner.unionInvocation) {
    unionReference=await prepareSourceProgressUnionFinalInput(owner.holder,token,owner.unionInvocation,owner.completedPackReceipt);
    unionValue=await sourceProgressUnionFinalCleanupInput(owner.holder,token,unionReference);
    if(unionValue.source.receipt!==owner.completedPackReceipt || unionValue.source.invocation!==owner.unionInvocation
      || unionValue.source.temporary!==owner.temporary || unionValue.source.catalog!==output)fail("FINAL_NESTED_PACK_CLOSURE_UNAVAILABLE");
    rows.push(...unionValue.rows);
  }
  const reference = Object.freeze({});
  const value = Object.freeze({ invocation: owner.packInvocation, context: owner.cpInventoryContext,
    root: owner.temporary.folder, rootIdentity: owner.temporary.identity, output,
    directories: Object.freeze([{ path: owner.temporary.folder, birth: owner.temporary.identity },
      { path: owner.packDirectory.path, birth: owner.packDirectory.birth }, ...output.directories,
      ...(unionValue?.directories??[])].map(row => Object.freeze(row))),
    rows: Object.freeze(rows) });
  sourceProgressTemporaryCatalogs.set(reference, { holder: owner.holder, token, result, owner, value, unionReference });
  return reference;
}
export async function sourceProgressTemporaryCleanupInput(holder, token, reference) {
  const input = sourceFinalOwnerCloseInput(holder, token), stored = sourceProgressTemporaryCatalogs.get(reference);
  if (input.phase !== 'ARMED' || !stored || stored.holder !== holder || stored.token !== token
    || sourceProgressFinalOwnerCloses.get(token) !== stored.result || stored.result.firstFailure !== null
    || !retainedSourceProgressOwners.has(stored.owner) || stored.owner.holder !== holder
    || stored.owner.failure !== null || Boolean(stored.owner.unionInvocation)!==Boolean(stored.unionReference)
    || stored.value.rootIdentity !== stored.owner.temporary?.identity
    || stored.value.invocation !== stored.owner.packInvocation
    || stored.value.output !== sourcePackOutputCatalog(stored.owner.packInvocation)) fail('FINAL_PROGRESS_TEMP_NOT_OWNED');
  if(stored.unionReference) {
    const union=await sourceProgressUnionFinalCleanupInput(holder,token,stored.unionReference);
    if(union.invocation!==stored.owner.unionInvocation || union.receipt!==stored.owner.completedPackReceipt)fail("FINAL_NESTED_PACK_CLOSURE_UNAVAILABLE");
  }
  await sourceProgressFinalOriginals(stored.owner,token);
  await closeSourceProgressOwnerFileStreams(stored.owner);
  return stored.value;
}
const sourceProgressFinalOwnerCloses = new WeakMap();
async function sourceProgressFinalReader(owner, row, input) {
  await checkSourceProgressHandle(row);
  const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024); let position = 0;
  for (;;) {
    if (performance.now() >= input.deadline) fail('SOURCE_PROGRESS_FINAL_DEADLINE');
    const actual = await row.handle.read(buffer, 0, buffer.length, position);
    if (!actual.bytesRead) break;
    position += actual.bytesRead; digest.update(buffer.subarray(0, actual.bytesRead));
    if (BigInt(position) > row.identity.size) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  }
  await checkSourceProgressHandle(row);
  const sha256 = digest.digest('hex');
  if (BigInt(position) !== row.identity.size || row.expected
    && (row.expected.bytes !== position || row.expected.sha256 !== sha256)) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  return Object.freeze({ path: row.path, handle: row.handle, stat: row.identity,
    directories: row.directories.map(directory => ({ path: directory.path, stat: directory.identity })),
    bytes: position, sha256 });
}
export async function prepareSourceProgressFinalOwnerClose(holder, token) {
  const input = sourceFinalOwnerCloseInput(holder, token);
  if (input.phase !== 'ARMED' || sourceProgressFinalOwnerCloses.has(token)) fail('SOURCE_PROGRESS_FINAL_NOT_ISSUED');
  const result = { holder, token, owners: [], rows: [], borrowed: [], cleanup: [], firstFailure: null, completed: false };
  sourceProgressFinalOwnerCloses.set(token, result);
  try {
    for (const owner of retainedSourceProgressOwners) {
      if (owner.holder !== holder) continue;
      result.owners.push(owner);
      if (owner.failure !== null) throw owner.failure[0];
      if (owner.installUncertain || owner.renamePending || owner.rollbackFailure
        || owner.writers?.some(writer => writer.closed !== true)) fail('SOURCE_PROGRESS_FINAL_STOP_UNPROVED');
      if (owner.unionInvocation && (!owner.temporary || !owner.completedPackReceipt
        || !sourceProgressUnionInvocations.has(owner.unionInvocation))) fail('FINAL_NESTED_PACK_CLOSURE_UNAVAILABLE');
      if (owner.packInvocation) await assertSourceFinalPackClosure(holder, token, owner.packInvocation);
      const streams = sourceProgressFileStreamOwners.get(owner);
      if (streams) {
        await closeSourceProgressOwnerFileStreams(owner);
        for (const row of streams.rows) if (row.borrowed) result.borrowed.push({ owner, row });
      }
      for (const row of owner.handles) result.rows.push(await sourceProgressFinalReader(owner, await sourceProgressFinalRow(owner,row,token), input));
      if (owner.temporary) {
        const reference = await prepareSourceProgressTemporaryReference(owner, token, result);
        result.cleanup.push(await prepareSourceProgressTemporaryCleanup(holder, token, reference));
      }
    }
    await assertSourceProgressFinalOwnerClose(holder, token, result);
    return result;
  } catch (error) { result.firstFailure = [error]; throw error; }
}
export async function assertSourceProgressFinalOwnerClose(holder, token, result) {
  const input = sourceFinalOwnerCloseInput(holder, token);
  if (input.phase !== 'ARMED' || sourceProgressFinalOwnerCloses.get(token) !== result
    || result.holder !== holder || result.token !== token || result.completed) fail('SOURCE_PROGRESS_FINAL_NOT_OWNED');
  if (result.firstFailure !== null) throw result.firstFailure[0];
  for (const owner of result.owners) {
    if (!retainedSourceProgressOwners.has(owner) || owner.holder !== holder) fail('SOURCE_PROGRESS_FINAL_OWNER_CHANGED');
    if (owner.failure !== null) throw owner.failure[0];
    await sourceProgressFinalOriginals(owner,token);
    if (sourceProgressFileStreamOwners.has(owner)) await closeSourceProgressOwnerFileStreams(owner);
  }
  for (const { row } of result.borrowed) {
    if (!row.finalOwnerCloseToken) {
      row.finalOwnerCloseToken = token; // Opaque, checked again at the actual close event.
      row.finalOwnerCloseObserved = new Promise(resolve => { row.finalOwnerCloseResolve = resolve; });
    } else if (row.finalOwnerCloseToken !== token) fail('SOURCE_PROGRESS_FINAL_NOT_OWNED');
  }
}
function sourceProgressBorrowedFinalClose(owner, row) {
  if (!row.borrowed || !row.finalOwnerCloseToken) return false;
  const input = sourceFinalOwnerCloseInput(owner.holder, row.finalOwnerCloseToken);
  return input.phase === 'CLOSING';
}
export async function finishSourceProgressFinalReaders(holder, token, result) {
  const input = sourceFinalOwnerCloseInput(holder, token);
  if (input.phase !== 'CLOSING' || sourceProgressFinalOwnerCloses.get(token) !== result) fail('SOURCE_PROGRESS_FINAL_NOT_OWNED');
  if (result.firstFailure !== null) throw result.firstFailure[0];
  for (const { owner, row } of result.borrowed) {
    let timer;
    try {
      await Promise.race([row.finalOwnerCloseObserved, new Promise((resolve, reject) => {
        timer = setTimeout(() => { try { fail('SOURCE_PROGRESS_FINAL_READER_UNCLOSED'); } catch (error) { reject(error); } },
          Math.max(0, Math.ceil(input.deadline - performance.now())));
      })]);
    } finally { clearTimeout(timer); }
    if (owner.failure !== null) throw owner.failure[0];
    if (!row.closeObserved || !row.closed) fail('SOURCE_PROGRESS_FINAL_READER_UNCLOSED');
  }
  for (const owner of result.owners) if (owner.failure !== null) throw owner.failure[0];
}
export async function finishSourceProgressFinalOwnerClose(holder, token, result) {
  const input = sourceFinalOwnerCloseInput(holder, token);
  if (input.phase !== 'CLEANUP' || sourceProgressFinalOwnerCloses.get(token) !== result || result.completed
    || input.closedReaders.some(row => !row.closed || row.firstFailure !== null)
    || input.cleanup.some(catalog => !catalog.completed || catalog.firstFailure !== null)) fail('SOURCE_PROGRESS_FINAL_RELEASE_UNPROVED');
  if (result.firstFailure !== null) throw result.firstFailure[0];
  for (const owner of result.owners) {
    if (owner.failure !== null) throw owner.failure[0];
    if (!retainedSourceProgressOwners.has(owner)) fail('SOURCE_PROGRESS_FINAL_OWNER_CHANGED');
  }
  for (const owner of result.owners) if(owner.unionInvocation)await finishSourceProgressUnionFinalReaders(holder,token,owner.unionInvocation,owner.result);
  for (const owner of result.owners) retainedSourceProgressOwners.delete(owner);
  result.completed = true; sourceProgressFinalOwnerCloses.delete(token);
}

async function sourceProgressPipeline(owner, ...streams) {
  if (!owner) return pipeline(...streams); // Existing isolated/audit behavior.
  if (!retainedSourceProgressOwners.has(owner) || !owner.holder) fail('SOURCE_PROGRESS_OWNER_REQUIRED');
  if (owner.failure !== null) throw owner.failure[0];
  const state = sourceProgressFileStreamOwners.get(owner);
  if (!state) fail('SOURCE_PROGRESS_OWNER_REQUIRED');
  owner.streams.push(...streams);
  try {
    for (const stream of streams) sourceProgressFileStreamRecord(owner, state, stream);
    state.active++;
    try { await pipeline(...streams); }
    catch (error) { throw sourceProgressFileStreamFailure(owner, error); }
    finally { state.active--; }
    await closeSourceProgressOwnerFileStreams(owner);
  } catch (error) { throw sourceProgressFileStreamFailure(owner, error); }
}
// Narrow internal operation: no caller root, callback, limits or deadline. The
// binding is issued by the SAME A2 holder only after consumed B/working bytes.
export async function inspectSourceOriginalProgress(holder, result, installedComponents = null) {
  const binding = await bindSourceOriginalProgress(holder, result);
  if (binding === null) return { progressInspected: false, reason: 'protected-original-absent' };
  try {
    const resume = await sourceOriginalProgressResumeRequest(holder, result);
    return await inspectOwnedSourceProgress({ repositoryRoot: binding.repositoryRoot,
      repository: binding.repository, productionReferenceAt: resume.target }, holder, resume, installedComponents);
  } catch (error) { throw retainSourceOriginalProgressFailure(holder, error); }
}


const sourceProgressResults = new WeakMap();
async function finishSourceProgressMiss(owner, code) {
  if (!owner?.holder || !retainedSourceProgressOwners.has(owner)
    || !['SNAPSHOT_ABSENT', 'SNAPSHOT_SCOPE_MISMATCH', 'BASELINE_MISMATCH'].includes(code)
    || owner.temporary !== null || owner.packInvocation !== null || owner.unionInvocation !== null
    || owner.streams.length || owner.failure !== null || owner.miss) fail('SOURCE_PROGRESS_MISS_UNPROVED');
  await checkSourceProgressOriginals(owner);
  const installRoot = await fs.lstat(owner.root, { bigint: true });
  if (!installRoot.isDirectory() || installRoot.isSymbolicLink()) fail('SOURCE_PROGRESS_ORIGINAL_INVALID');
  if (code === 'SNAPSHOT_ABSENT') {
    // No original S is fabricated. This is a repeated absence observation at
    // the normal fixed path under the existing exclusive-writer contract.
    if (await checkedPath(owner.root, WEATHER_PROGRESS_CIPHER_PATH,
      { optional: true, maximum: MAX_CIPHER_BYTES })) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  } else if (owner.handles.length !== 1 || !owner.inputHeaderRead) {
    fail('SOURCE_PROGRESS_MISS_UNPROVED');
  }
  await checkSourceProgressOriginals(owner);
  const after = await fs.lstat(owner.root, { bigint: true });
  if (!after.isDirectory() || after.isSymbolicLink()
    || ['dev', 'ino', 'mode'].some(key => after[key] !== installRoot[key])) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  const actual = Object.freeze({ progressInspected: false, status: 'CACHE_MISS', code,
    applied: false, workingUnchanged: true });
  owner.installRoot = installRoot;
  owner.miss = actual;
  return actual;
}
export async function sourceBaselineWorkingInput(holder, actual) {
  const owner = sourceProgressResults.get(actual);
  if (!owner || owner.holder !== holder || owner.miss !== actual || owner.result !== null
    || owner.packInvocation !== null || owner.unionInvocation !== null || owner.temporary !== null
    || owner.streams.length || owner.failure !== null || owner.installStarted) fail('SOURCE_PROGRESS_MISS_UNPROVED');
  await assertSourceBaselineWorkingInput(holder, actual, owner);
  return owner;
}
export async function assertSourceBaselineWorkingInput(holder, actual, owner) {
  if (sourceProgressResults.get(actual) !== owner || owner.holder !== holder || owner.miss !== actual
    || owner.result !== null || owner.failure !== null || owner.packInvocation !== null
    || owner.unionInvocation !== null || owner.temporary !== null || owner.streams.length
    || owner.installStarted) fail('SOURCE_PROGRESS_MISS_UNPROVED');
  await checkSourceProgressOriginals(owner);
  const root = await fs.lstat(owner.root, { bigint: true });
  if (!root.isDirectory() || root.isSymbolicLink()
    || ['dev', 'ino', 'mode'].some(key => root[key] !== owner.installRoot[key])) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  if (actual.code === 'SNAPSHOT_ABSENT' && await checkedPath(owner.root, WEATHER_PROGRESS_CIPHER_PATH,
    { optional: true, maximum: MAX_CIPHER_BYTES })) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  return owner;
}
const sourceWorkingCompletions = new WeakMap();
// Internal consumer lookup, not a caller-supplied plan or an issuer.
export async function sourceWorkingInstallInput(holder, invocation, actual) {
  const owner = sourceProgressResults.get(actual);
  if (!owner || owner.holder !== holder || owner.unionInvocation !== invocation
    || owner.result !== actual || owner.installStarted) fail('SOURCE_PROGRESS_INVOCATION_REQUIRED');
  await checkSourceProgressOriginals(owner);
  if (!owner.outputs) fail('SOURCE_PROGRESS_OUTPUT_HANDLES_REQUIRED');
  return owner;
}
export function sourceWorkingInstallCompletion(operation) {
  const actual = sourceWorkingCompletions.get(operation);
  if (!actual) fail('SOURCE_PROGRESS_INSTALL_COMPLETION_REQUIRED');
  return actual;
}
export async function installSourceOriginalProgress(holder, result, installedComponents = null) {
  const actual = await inspectSourceOriginalProgress(holder, result, installedComponents);
  const owner = sourceProgressResults.get(actual);
  if (!owner) return actual; // Honest B/S absence, never a working completion.
  try {
    if (owner.miss === actual) {
      await assertSourceBaselineWorkingInput(holder, actual, owner);
      const { completeSourceInstalledBaselineMiss } = await import('./source-normal-producer-tail.mjs');
      return await completeSourceInstalledBaselineMiss(holder, actual);
    }
    const { assertUsableDmiProgressRecovery } = await import('./lib/verified-dmi-progress-inputs.mjs');
    assertUsableDmiProgressRecovery(actual.dmiProgress, { allowAbsent: true });
    owner.outputs = await ownProtectedProgressUnionOutputs(owner.unionInvocation, actual);
    const operation = await beginSourceWorkingInstall(holder, owner.unionInvocation, actual);
    owner.installStarted = true;
    owner.operation = operation;
    await installOwnedSourceWorking(owner);
    const completion = Object.freeze({ input: owner, invocation: owner.unionInvocation, actual,
      preserved: Object.freeze(owner.staged.filter(row => row.previousRow).map(row => Object.freeze({
        originalPath: row.destination, path: row.previous, handle: row.previousRow.handle,
        fd: row.previousRow.handle.fd, identity: row.previousRow.identity,
        bytes: row.previousRow.expected.bytes, sha256: row.previousRow.expected.sha256 }))),
      rows: Object.freeze(owner.staged.map(row => Object.freeze({ handle: row.output.handle,
        path: row.destination, stat: row.output.identity,
        directories: row.output.directories.map(d => ({ path: d.path, stat: d.identity })),
        bytes: row.output.expected.bytes, sha256: row.output.expected.sha256 }))) });
    sourceWorkingCompletions.set(operation, completion);
    const generation = await finishSourceWorkingInstall(holder, operation);
    owner.workingGeneration = generation;
    if (owner.originalTarget) {
      await assertOriginalProgressInputs(owner.originalTarget);
      await checkSourceProgressOriginals(owner);
    }
    return Object.freeze({ workingInstalled: true, fileCount: completion.rows.length, dmiProgress: actual.dmiProgress,
      ...(owner.originalTarget ? { restoredProductionReferenceAt: owner.originalTarget.report.productionReferenceAt,
        restoredOriginalTargetSha256: owner.originalTarget.report.selectionSha256 } : {}) });
  } catch (error) {
    // No cleanup/release or producer entry on either a known or uncertain error.
    throw retainSourceOriginalProgressFailure(holder, retainSourceProgressFailure(owner, error));
  }
}
const sourceDmiWorkingOwners = new WeakMap();
const sourceDmiWorkingCompletions = new WeakMap();
export function sourceDmiWorkingPreservationCompletion(operation) {
  const result = sourceDmiWorkingCompletions.get(operation);
  if (!result) fail('SOURCE_DMI_WORKING_COMPLETION_REQUIRED');
  return result;
}
export async function preserveSourceDmiWorkingInputs(holder, operation) {
  const input = await sourceDmiWorkingInstallInput(holder, operation);
  const owner = { holder, root: input.root, handles: [], writers: [], failure: null,
    outputs: input.inputs, unionInvocation: null };
  sourceDmiWorkingOwners.set(owner, { holder, operation, input });
  retainedSourceProgressOwners.add(owner);
  try {
    // Same normal exclusive staging, own copy fd, physical close, rename and
    // rollback machinery as S installation. No new root or copyFile shortcut.
    await installOwnedSourceWorking(owner);
    const completion = Object.freeze({ input,
      preserved: Object.freeze(owner.staged.map(row => {
        if (!row.previousRow || !row.backedUp || !row.installed) fail('SOURCE_DMI_WORKING_PRESERVATION_REQUIRED');
        return Object.freeze({ input: row.input, path: row.previous,
          handle: row.previousRow.handle, fd: row.previousRow.handle.fd,
          identity: row.previousRow.identity, bytes: row.previousRow.expected.bytes,
          sha256: row.previousRow.expected.sha256 });
      })),
      rows: Object.freeze(owner.staged.map(row => Object.freeze({ handle: row.output.handle,
        path: row.destination, stat: row.output.identity,
        directories: row.output.directories.map(d => ({ path: d.path, stat: d.identity })),
        bytes: row.output.expected.bytes, sha256: row.output.expected.sha256 }))),
    });
    sourceDmiWorkingCompletions.set(operation, completion);
  } catch (error) {
    throw retainSourceOriginalProgressFailure(holder, retainSourceProgressFailure(owner, error));
  }
}

async function closeSourceProgressRegularWriter(writer, code) {
  if (writer.closeAttempted) fail(code);
  writer.closeAttempted = true;
  const before = writer.descriptorIdentity, current = ownFileDescriptorIdentity(writer.fd);
  if (!before || !current || writer.handle.fd !== writer.fd || before.dev !== current.dev
    || before.ino !== current.ino || before.prototype !== current.prototype) fail(code);
  let first = null;
  try { await writer.handle.close(); } catch (error) { first = [error]; }
  writer.closed = writer.handle.fd === -1 && await ownedFileDescriptorClosed(writer.fd, before);
  if (!writer.closed) first ??= [new Error(code)];
  if (first !== null) throw first[0];
}
const sourceNormalDeployedCopyResults = new WeakMap();
export function sourceNormalDeployedCopyCompletion(holder) {
  const result = sourceNormalDeployedCopyResults.get(holder);
  if (!result) fail('SOURCE_DEPLOYED_COPY_REQUIRED');
  return result;
}
export async function copySourceNormalDeployedBulk(holder) {
  const input = await sourceNormalDeployedCopyInput(holder);
  if (sourceNormalDeployedCopyResults.has(holder)) fail('SOURCE_DEPLOYED_COPY_REUSED');
  const owner = { holder, root: input.root, handles: [], writers: [], failure: null };
  retainedSourceProgressOwners.add(owner);
  let writer = null, first = null;
  try {
    await assertSourceNormalDeployedCopyInput(holder, input);
    // A fixed absent regular leaf only; never copyFile/overwrite/rename B or S.
    writer = { handle: null, fd: null, closed: false, path: input.destination };
    owner.writers.push(writer);
    writer.handle = await fs.open(input.destination, sourceProgressFsConstants.O_RDWR
      | sourceProgressFsConstants.O_CREAT | sourceProgressFsConstants.O_EXCL
      | (sourceProgressFsConstants.O_NOFOLLOW ?? 0), 0o600);
    writer.fd = writer.handle.fd;
    writer.descriptorIdentity = ownFileDescriptorIdentity(writer.fd);
    writer.identity = await writer.handle.stat({ bigint: true });
    if (!writer.identity.isFile() || writer.identity.nlink !== 1n || writer.identity.size !== 0n) fail('SOURCE_DEPLOYED_COPY_INVALID');
    const buffer = Buffer.alloc(64 * 1024), hash = crypto.createHash('sha256');
    let position = 0;
    for (;;) {
      await assertSourceNormalDeployedCopyInput(holder, input);
      const actual = await input.handle.read(buffer, 0, buffer.length, position);
      if (!actual.bytesRead) break;
      if (position + actual.bytesRead > input.bytes) fail('SOURCE_DEPLOYED_COPY_CHANGED');
      hash.update(buffer.subarray(0, actual.bytesRead));
      let written = 0;
      while (written < actual.bytesRead) {
        await assertSourceNormalDeployedCopyInput(holder, input);
        const out = await writer.handle.write(buffer, written, actual.bytesRead - written, position + written);
        if (!out.bytesWritten) fail('SOURCE_DEPLOYED_COPY_SHORT_WRITE');
        written += out.bytesWritten;
      }
      position += actual.bytesRead;
    }
    if (position !== input.bytes || hash.digest('hex') !== input.sha256) fail('SOURCE_DEPLOYED_COPY_CHANGED');
    await writer.handle.sync();
    await assertSourceNormalDeployedCopyInput(holder, input);
    const after = await writer.handle.stat({ bigint: true });
    if (after.dev !== writer.identity.dev || after.ino !== writer.identity.ino
      || after.mode !== writer.identity.mode || after.nlink !== 1n
      || after.size !== BigInt(input.bytes)) fail('SOURCE_DEPLOYED_COPY_CHANGED');
  } catch (error) { first = [error]; }
  if (writer?.handle) {
    try { await closeSourceProgressRegularWriter(writer, 'SOURCE_DEPLOYED_COPY_CLOSE_UNPROVED'); }
    catch (error) { first ??= [error]; }
    if (!writer.closed) first ??= [new Error('SOURCE_DEPLOYED_COPY_CLOSE_UNPROVED')];
  }
  if (first !== null) throw retainSourceOriginalProgressFailure(holder, retainSourceProgressFailure(owner, first[0]));
  try {
    await assertSourceNormalDeployedCopyInput(holder, input);
    // Writer closure only. P alone opens/adopts and fully reads back the new
    // working row before copy.completed; S must not create an orphan reader.
    sourceNormalDeployedCopyResults.set(holder, Object.freeze({ input,
      closed: writer.closed, bytes: input.bytes, sha256: input.sha256 }));
  } catch (error) {
    throw retainSourceOriginalProgressFailure(holder, retainSourceProgressFailure(owner, error));
  }
}

const sourceNormalWorkingOwners = new WeakMap();
const sourceNormalWorkingCompletions = new WeakMap();
export function sourceNormalWorkingPreservationCompletion(phaseOperation) {
  const completion = sourceNormalWorkingCompletions.get(phaseOperation);
  if (!completion) fail('SOURCE_NORMAL_PRESERVATION_REQUIRED');
  return completion;
}
export async function preserveSourceNormalWorkingInputs(holder, operation, phaseOperation) {
  const input = await sourceNormalWorkingInstallInput(holder, operation, phaseOperation);
  const owner = { holder, root: input.root, handles: [], writers: [], failure: null,
    outputs: input.inputs, unionInvocation: null };
  sourceNormalWorkingOwners.set(owner, { holder, operation, phaseOperation, input });
  retainedSourceProgressOwners.add(owner);
  try {
    await installOwnedSourceWorking(owner);
    const completion = Object.freeze({ input,
      preserved: Object.freeze(owner.staged.map(row => {
        if (!row.previousRow || !row.backedUp || !row.installed) fail('SOURCE_NORMAL_PRESERVATION_REQUIRED');
        return Object.freeze({ input: row.input, path: row.previous, handle: row.previousRow.handle,
          fd: row.previousRow.handle.fd, identity: row.previousRow.identity,
          bytes: row.previousRow.expected.bytes, sha256: row.previousRow.expected.sha256 });
      })),
      rows: Object.freeze(owner.staged.map(row => Object.freeze({ handle: row.output.handle,
        path: row.destination, stat: row.output.identity,
        directories: row.output.directories.map(row => ({ path: row.path, stat: row.identity })),
        bytes: row.output.expected.bytes, sha256: row.output.expected.sha256 }))),
    });
    sourceNormalWorkingCompletions.set(phaseOperation, completion);
  } catch (error) {
    throw retainSourceOriginalProgressFailure(holder, retainSourceProgressFailure(owner, error));
  }
}

async function assertSourceWorkingCopyInput(owner, input) {
  const normal = sourceNormalWorkingOwners.get(owner);
  if (normal) return assertSourceNormalWorkingInstallInput(normal.holder, normal.operation, normal.phaseOperation, input);
  const dmi = sourceDmiWorkingOwners.get(owner);
  if (dmi) return assertSourceDmiWorkingInstallInput(dmi.holder, dmi.operation, input);
  return assertProtectedProgressUnionOutput(owner.unionInvocation, input);
}

// Only the actual authenticated S -> U claim, after P began this INSTALL,
// may install its existing DMI progress names or concrete CP originals from
// that same H/native catalog. No path prefix or output-shaped object is authority.
async function sourceUnionBoundWorkingPath(owner, relative) {
  if (sourceNormalWorkingOwners.has(owner) || sourceDmiWorkingOwners.has(owner)
    || !retainedSourceProgressOwners.has(owner) || owner.failure !== null
    || !owner.installStarted || !owner.operation || !owner.outputs || !owner.unionInvocation) return false;
  const bound = sourceProgressUnionInvocations.get(owner.unionInvocation), completed = bound?.completed;
  if (!bound || completed.owner !== owner || completed.firstFailure !== null
    || owner.completedPackReceipt !== bound.input.receipt || owner.input !== completed.value.input
    || owner.binding !== completed.value.binding || owner.resume !== completed.value.resume
    || owner.temporary !== completed.value.temporary || owner.packInvocation !== completed.value.packInvocation
    || sourceProgressUnionFactoryInput(owner.unionInvocation) !== bound.options) return false;
  const actual = await owner.result;
  if (sourceProgressResults.get(actual) !== owner) return false;
  const rows = owner.outputs.filter(row => row.relativePath === relative);
  if (rows.length !== 1) return false;
  if (Object.values(PRIVATE_WEATHER_PROGRESS_ONLY_FILES).includes(relative)) {
    await assertProtectedProgressUnionOutput(owner.unionInvocation, rows[0]);
  } else {
    await assertSourceProgressUnionCopernicusOriginalOutput(owner.unionInvocation, rows[0]);
  }
  return true;
}

async function sourceWorkingDirectories(owner, relative, create = false) {
  const normal = sourceNormalWorkingOwners.get(owner);
  const normalPath = normal?.input.inputs.some(input => input.relativePath === relative);
  if (!normalPath && !Object.values(PRIVATE_WEATHER_COMPONENT_FILES).includes(relative)
    && !(sourceDmiWorkingOwners.has(owner) && relative === PRIVATE_RUNTIME_BASE_FILES.find(file => file.id === 'dmi-bulk-cache').relativePath)
    && !await sourceUnionBoundWorkingPath(owner, relative)) fail('SOURCE_PROGRESS_INSTALL_PATH_INVALID');
  const destination = path.join(owner.root, ...relative.split('/'));
  const directories = [];
  let directory = owner.root;
  for (const segment of ['', ...relative.split('/').slice(0, -1)]) {
    if (segment) directory = path.join(directory, segment);
    let stat = await fs.lstat(directory, { bigint: true }).catch(error => { if (error?.code === 'ENOENT') return null; throw error; });
    if (!stat && create && directory !== owner.root) {
      await fs.mkdir(directory, { mode: 0o700 });
      stat = await fs.lstat(directory, { bigint: true });
    }
    if (!stat?.isDirectory() || stat.isSymbolicLink()
      || directory === owner.root && ['dev', 'ino', 'mode'].some(key => stat[key] !== owner.installRoot[key])) fail('SOURCE_PROGRESS_INSTALL_DIRECTORY_CHANGED');
    directories.push({ path: directory, identity: stat });
  }
  return { destination, directories };
}
async function pinSourceWorkingPrevious(owner, file) {
  const row = await ownSourceProgressHandle(owner, file);
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
  let bytes = 0;
  for (;;) {
    const read = await row.handle.read(buffer, 0, buffer.length, bytes);
    if (!read.bytesRead) break;
    bytes += read.bytesRead;
    if (BigInt(bytes) > row.identity.size) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
    hash.update(buffer.subarray(0, read.bytesRead));
  }
  await checkSourceProgressHandle(row);
  if (BigInt(bytes) !== row.identity.size) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
  row.expected = Object.freeze({ bytes, sha256: hash.digest('hex') });
  return row;
}
async function checkSourceWorkingBytes(row) {
  await checkSourceProgressHandle(row);
  const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
  let position = 0;
  for (;;) {
    const { bytesRead } = await row.handle.read(buffer, 0, buffer.length, position);
    if (!bytesRead) break;
    position += bytesRead;
    if (position > row.expected.bytes) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
    hash.update(buffer.subarray(0, bytesRead));
  }
  await checkSourceProgressHandle(row);
  if (position !== row.expected.bytes || hash.digest('hex') !== row.expected.sha256) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
}
function sourceWorkingPreviousPath(owner, destination) {
  // Only these two SOURCE normal working files enter directory cacheSAVE.
  // Keep their actual old inode outside the archive, never delete it or move B/S.
  if (sourceNormalWorkingOwners.has(owner)) {
    for (const [relative, backup] of [
      ['.cache/ravscore-continuation-checkpoint/checkpoint.json', 'ravscore-continuation-checkpoint'],
      ['.cache/weather-preflight-state/state.json', 'weather-preflight-state'],
    ]) if (destination === path.join(owner.root, ...relative.split('/'))) {
      return path.join(owner.root, '.cache', `${backup}.progress-previous-${owner.transaction}.json`);
    }
  }
  return `${destination}.progress-previous-${owner.transaction}`;
}
async function copySourceWorkingOutput(owner, staged) {
  const input = staged.input;
  await assertSourceWorkingCopyInput(owner, input);
  // Exact destinations and own exclusive staging names are checked before open.
  const mapping = await sourceWorkingDirectories(owner, input.relativePath);
  if (mapping.destination !== staged.destination
    || staged.temporary !== `${staged.destination}.progress-new-${owner.transaction}`
    || staged.previous !== sourceWorkingPreviousPath(owner, staged.destination)) fail('SOURCE_PROGRESS_INSTALL_PATH_INVALID');
  let writer = null, failure = null;
  try {
    const handle = await fs.open(staged.temporary, sourceProgressFsConstants.O_RDWR
      | sourceProgressFsConstants.O_CREAT | sourceProgressFsConstants.O_EXCL
      | (sourceProgressFsConstants.O_NOFOLLOW ?? 0), 0o600);
    writer = { handle, fd: handle.fd, path: staged.temporary, closed: false, identity: null,
      descriptorIdentity: ownFileDescriptorIdentity(handle.fd) };
    owner.writers.push(writer);
    const created = await handle.stat({ bigint: true });
    if (!created.isFile() || created.nlink !== 1n || created.size !== 0n) fail('SOURCE_PROGRESS_INSTALL_OUTPUT_INVALID');
    const buffer = Buffer.alloc(64 * 1024);
    let position = 0;
    for (;;) {
      const { bytesRead } = await input.handle.read(buffer, 0, buffer.length, position);
      if (!bytesRead) break;
      if (position + bytesRead > input.bytes) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
      let offset = 0;
      while (offset < bytesRead) {
        const written = await handle.write(buffer, offset, bytesRead - offset, position + offset);
        if (!written.bytesWritten) fail('SOURCE_PROGRESS_INSTALL_SHORT_WRITE');
        offset += written.bytesWritten;
      }
      position += bytesRead;
    }
    if (position !== input.bytes) fail('SOURCE_PROGRESS_ORIGINAL_CHANGED');
    await assertSourceWorkingCopyInput(owner, input);
    writer.identity = await handle.stat({ bigint: true });
    if (writer.identity.dev !== created.dev || writer.identity.ino !== created.ino
      || writer.identity.nlink !== 1n || writer.identity.size !== BigInt(input.bytes)) fail('SOURCE_PROGRESS_INSTALL_OUTPUT_CHANGED');
  } catch (error) { failure = [error]; }
  if (writer) {
    try { await closeSourceProgressRegularWriter(writer, 'SOURCE_PROGRESS_INSTALL_CLOSE_UNPROVED'); }
    catch (error) { failure ??= [error]; }
    if (!writer.closed) { owner.installUncertain = true; failure ??= [new Error('SOURCE_PROGRESS_INSTALL_CLOSE_UNPROVED')]; }
  }
  if (failure !== null) throw failure[0];
  staged.output = await ownSourceProgressHandle(owner, staged.temporary, { bytes: input.bytes, sha256: input.sha256 });
  if (!sameSourceProgressFile(writer.identity, staged.output.identity)) fail('SOURCE_PROGRESS_INSTALL_OUTPUT_CHANGED');
}
async function moveSourceWorkingRow(row, destination) {
  await checkSourceWorkingBytes(row);
  const before = row.identity;
  await fs.rename(row.path, destination);
  // A rename rejection is not assumed to mean no mutation. On rejection the
  // enclosing transaction retains both paths/handles without speculative cleanup.
  const opened = await row.handle.stat({ bigint: true }), named = await fs.lstat(destination, { bigint: true });
  if (['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs'].some(key => opened[key] !== before[key])
    || !sameSourceProgressFile(opened, named) || named.isSymbolicLink()) fail('SOURCE_PROGRESS_INSTALL_RENAME_UNPROVED');
  row.path = destination;
  row.identity = opened;
  await checkSourceWorkingBytes(row);
}
async function installOwnedSourceWorking(owner) {
  owner.transaction = crypto.randomUUID();
  owner.staged = []; owner.writers = []; owner.installUncertain = false;
  owner.installRoot = await fs.lstat(owner.root, { bigint: true });
  let failure = null;
  try {
    for (const input of owner.outputs) {
      const { destination } = await sourceWorkingDirectories(owner, input.relativePath, true);
      const staged = { input, destination, temporary: `${destination}.progress-new-${owner.transaction}`,
        previous: sourceWorkingPreviousPath(owner, destination), output: null, previousRow: null,
        backedUp: false, installed: false };
      owner.staged.push(staged);
      for (const reserved of [staged.temporary, staged.previous]) {
        if (await fs.lstat(reserved).catch(error => { if (error?.code === 'ENOENT') return null; throw error; })) fail('SOURCE_PROGRESS_INSTALL_STAGE_EXISTS');
      }
      const previous = await fs.lstat(destination).catch(error => { if (error?.code === 'ENOENT') return null; throw error; });
      if (previous) staged.previousRow = await pinSourceWorkingPrevious(owner, destination);
      await copySourceWorkingOutput(owner, staged);
    }
    await checkSourceProgressOriginals(owner);
    for (const staged of owner.staged) {
      await sourceWorkingDirectories(owner, staged.input.relativePath);
      // Keep the actual pre-S inode under the normal backup name, not a copy
      // that leaves the pinned original unlinked. Backups are never deleted here.
      owner.renamePending = staged;
      if (staged.previousRow) {
        await moveSourceWorkingRow(staged.previousRow, staged.previous);
        staged.backedUp = true;
      } else if (await fs.lstat(staged.destination).catch(error => { if (error?.code === 'ENOENT') return null; throw error; })) fail('SOURCE_PROGRESS_INSTALL_DESTINATION_CHANGED');
      await moveSourceWorkingRow(staged.output, staged.destination);
      staged.installed = true;
      owner.renamePending = null;
    }
    for (const staged of owner.staged) {
      await checkSourceWorkingBytes(staged.output);
      if (staged.previousRow) await checkSourceWorkingBytes(staged.previousRow);
    }
  } catch (error) {
    failure = [error];
    if (!owner.installUncertain && !owner.renamePending) {
      // Only own, fully observed renames may be rolled back. First raw cause is
      // preserved; uncertain rename/close retains all surviving copies instead.
      try {
        for (const staged of [...owner.staged].reverse()) {
          if (staged.installed) await moveSourceWorkingRow(staged.output, staged.temporary);
          if (staged.backedUp) await moveSourceWorkingRow(staged.previousRow, staged.destination);
        }
        owner.rollbackSettled = true;
      } catch (rollbackError) { owner.rollbackFailure = [rollbackError]; owner.installUncertain = true; }
    }
  }
  if (failure !== null) throw failure[0];
}

// Only this module's completed authenticated S factory can create a token.
// Neither a caller object nor a fulfilled promise can attest the decrypted pack.
const sourceProgressCpInputs = new WeakMap();
async function prepareSourceProgressCpInput(owner, sourceCipher, compressed, packPath) {
  if (!retainedSourceProgressOwners.has(owner) || !owner.holder || owner.failure !== null
    || owner.cpInput || owner.packInvocation || owner.unionInvocation || !owner.temporary?.identity
    || !owner.inputHeaderRead || !owner.handles.includes(sourceCipher)
    || sourceCipher.path !== path.join(owner.root, WEATHER_PROGRESS_CIPHER_PATH)) fail('SOURCE_PROGRESS_CP_NOT_AVAILABLE');
  await closeSourceProgressOwnerFileStreams(owner);
  const streams = sourceProgressFileStreamOwners.get(owner);
  // The real decrypt and gunzip pipelines each retain their own file readers/writers.
  if (!streams || streams.active !== 0 || streams.rows.length !== 4
    || streams.rows.filter(row => row.file === sourceCipher.path && row.borrowed === sourceCipher).length !== 1
    || streams.rows.filter(row => row.file === compressed).length !== 2
    || streams.rows.filter(row => row.file === packPath).length !== 1) fail('SOURCE_PROGRESS_CP_AUTH_UNPROVED');
  await checkSourceProgressOriginals(owner);
  const compressedRow = await ownSourceProgressHandle(owner, compressed);
  const packRow = await ownSourceProgressHandle(owner, packPath);
  const rows = [sourceCipher, compressedRow, packRow];
  const expected = [];
  for (const row of rows) expected.push(await sourceProgressCpDigest(row));
  const token = Object.freeze({});
  const input = Object.freeze({ holder: owner.holder, binding: owner.binding, resume: owner.resume,
    root: owner.root, temporary: owner.temporary, stage: path.join(owner.temporary.folder, 'verified') });
  sourceProgressCpInputs.set(token, { owner, input, rows, expected });
  owner.cpInput = token;
  return token;
}
async function sourceProgressCpDigest(row) {
  await checkSourceProgressHandle(row);
  const digest = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024); let bytes = 0;
  for (;;) {
    const actual = await row.handle.read(buffer, 0, buffer.length, bytes);
    if (!actual.bytesRead) break;
    bytes += actual.bytesRead;
    if (bytes > Number(row.identity.size)) fail('SOURCE_PROGRESS_CP_BYTES_CHANGED');
    digest.update(buffer.subarray(0, actual.bytesRead));
  }
  await checkSourceProgressHandle(row);
  if (bytes !== Number(row.identity.size)) fail('SOURCE_PROGRESS_CP_BYTES_CHANGED');
  return Object.freeze({ bytes, sha256: digest.digest('hex') });
}
export async function sourceProgressCpContextInput(holder, token) {
  const state = sourceProgressCpInputs.get(token), owner = state?.owner;
  if (!state || !retainedSourceProgressOwners.has(owner) || owner.holder !== holder
    || owner.cpInput !== token || owner.failure !== null || owner.unionInvocation
    || owner.binding !== state.input.binding || owner.resume !== state.input.resume
    || owner.temporary !== state.input.temporary) fail('SOURCE_PROGRESS_CP_INPUT_NOT_OWNED');
  try {
    await checkSourceProgressOriginals(owner);
    await closeSourceProgressOwnerFileStreams(owner);
    if (await assertSourceOriginalProgress(holder) !== state.input.binding) fail('SOURCE_PROGRESS_BINDING_CHANGED');
    const born = state.input.temporary.identity;
    const named = await fs.lstat(state.input.temporary.folder, { bigint: true });
    if (!Object.isFrozen(born) || !named.isDirectory() || named.isSymbolicLink()
      || await fs.realpath(state.input.temporary.folder) !== state.input.temporary.folder
      || ['dev', 'ino', 'mode'].some(key => born[key] !== named[key])) fail('SOURCE_PROGRESS_CP_BIRTH_CHANGED');
    for (let index = 0; index < state.rows.length; index++) {
      const actual = await sourceProgressCpDigest(state.rows[index]);
      if (actual.bytes !== state.expected[index].bytes || actual.sha256 !== state.expected[index].sha256) fail('SOURCE_PROGRESS_CP_BYTES_CHANGED');
    }
    return state.input;
  } catch (error) { throw retainSourceProgressFailure(owner, error); }
}
export function assertSourceProgressCpInvocation(holder, token, context, invocation) {
  const state = sourceProgressCpInputs.get(token), owner = state?.owner;
  if (!state || !retainedSourceProgressOwners.has(owner) || owner.holder !== holder
    || owner.cpInput !== token || owner.cpInventoryContext !== context || owner.packInvocation !== invocation
    || owner.failure !== null || owner.unionInvocation || !sourceWorkingTypes.isPromise(invocation)
    || sourceWorkingTypes.isProxy(invocation)) fail('SOURCE_PROGRESS_CP_INVOCATION_NOT_OWNED');
}

// A separate completed GCM/pack receipt. The earlier CP context deliberately
// continues to reject owner.unionInvocation; it is never reopened by a flag.
const sourceCompletedProgressPacks = new WeakMap();
const sourceProgressUnionInvocations = new WeakMap();
async function completeSourceProgressPackForUnion(owner, installedReference) {
  const cp = sourceProgressCpInputs.get(owner.cpInput);
  if (!cp || cp.owner !== owner || owner.unionInvocation || owner.completedPackReceipt
    || owner.failure !== null || !owner.packInvocation || !owner.input
    || cp.input.temporary !== owner.temporary || owner.input.files !== await owner.packInvocation) {
    fail('SOURCE_PROGRESS_UNION_PACK_NOT_COMPLETE');
  }
  await sourceProgressCpContextInput(owner.holder, owner.cpInput);
  const catalog = sourcePackOutputCatalog(owner.packInvocation);
  if (catalog.invocation !== owner.packInvocation || catalog.context !== owner.cpInventoryContext
    || catalog.root !== owner.input.verifiedRoot || catalog.rootIdentity === null
    || owner.input.temporaryDirectory !== owner.temporary.folder) fail('SOURCE_PROGRESS_UNION_PACK_NOT_COMPLETE');
  const receipt = Object.freeze({});
  const value = Object.freeze({ holder:owner.holder, binding:owner.binding, resume:owner.resume,
    root:owner.root, temporary:owner.temporary, input:owner.input, installedReference,
    packInvocation:owner.packInvocation, packContext:owner.cpInventoryContext, catalog,
    files:Object.freeze(owner.input.files.map(file=>Object.freeze({...file}))) });
  sourceCompletedProgressPacks.set(receipt,{owner,cp,value,firstFailure:null});
  owner.completedPackReceipt = receipt;
}
function bindSourceProgressUnionInvocation(owner, invocation, options) {
  const completed = sourceCompletedProgressPacks.get(owner.completedPackReceipt);
  if (!completed || completed.owner !== owner || completed.firstFailure !== null
    || owner.unionInvocation !== invocation || owner.failure !== null
    || sourceProgressUnionInvocations.has(invocation)
    || sourceProgressUnionFactoryInput(invocation) !== options
    || options.root !== owner.input.root || options.progressFiles !== owner.input.files
    || options.progressVerifiedRoot !== owner.input.verifiedRoot
    || options.temporaryDirectory !== owner.input.temporaryDirectory
    || options.sourceInstalledComponents !== completed.value.installedReference) fail('SOURCE_PROGRESS_UNION_INVOCATION_NOT_OWNED');
  sourceProgressUnionInvocations.set(invocation,Object.freeze({completed,options,
    input:Object.freeze({...completed.value,receipt:owner.completedPackReceipt,invocation,options})}));
}
export async function sourceProgressUnionContextInput(holder, invocation) {
  const bound = sourceProgressUnionInvocations.get(invocation), completed = bound?.completed, owner = completed?.owner;
  if (completed?.firstFailure !== null && completed?.firstFailure !== undefined) throw completed.firstFailure[0];
  if (owner?.failure !== null && owner?.failure !== undefined) throw owner.failure[0];
  if (!bound || !retainedSourceProgressOwners.has(owner) || owner.holder !== holder
    || owner.completedPackReceipt !== bound.input.receipt || owner.unionInvocation !== invocation
    || owner.failure !== null || completed.firstFailure !== null || owner.input !== completed.value.input
    || owner.binding !== completed.value.binding || owner.resume !== completed.value.resume
    || owner.temporary !== completed.value.temporary || owner.packInvocation !== completed.value.packInvocation
    || sourceProgressUnionFactoryInput(invocation) !== bound.options) fail('SOURCE_PROGRESS_UNION_INVOCATION_NOT_OWNED');
  try {
    await checkSourceProgressOriginals(owner);
    await closeSourceProgressOwnerFileStreams(owner);
    if (await assertSourceOriginalProgress(holder) !== completed.value.binding
      || sourcePackOutputCatalog(owner.packInvocation) !== completed.value.catalog) fail('SOURCE_PROGRESS_UNION_PACK_CHANGED');
    const named = await fs.lstat(owner.temporary.folder,{bigint:true}), born = owner.temporary.identity;
    if (!named.isDirectory() || named.isSymbolicLink() || await fs.realpath(owner.temporary.folder) !== owner.temporary.folder
      || ['dev','ino','mode'].some(k=>named[k] !== born[k])) fail('SOURCE_PROGRESS_UNION_BIRTH_CHANGED');
    if (owner.input.files.length !== completed.value.files.length) fail('SOURCE_PROGRESS_UNION_PACK_CHANGED');
    for (let i=0;i<owner.input.files.length;i++) {
      const file=owner.input.files[i], expected=completed.value.files[i];
      if (Object.keys(expected).some(k=>file[k] !== expected[k])) fail('SOURCE_PROGRESS_UNION_PACK_CHANGED');
    }
    for (let i=0;i<completed.cp.rows.length;i++) {
      const actual = await sourceProgressCpDigest(completed.cp.rows[i]), expected = completed.cp.expected[i];
      if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256) fail('SOURCE_PROGRESS_UNION_PACK_CHANGED');
    }
    return bound.input;
  } catch(error) { completed.firstFailure ??= [error]; throw retainSourceProgressFailure(owner,completed.firstFailure[0]); }
}

async function inspectOwnedSourceProgress(options = {}, holder = null, resume = null, installedComponents = null) {
  // Existing isolated inspection remains unchanged. The internal fixed
  // caller alone supplies a genuine issuer-checked B holder.
  const binding = holder === null ? null : await assertSourceOriginalProgress(holder);
  const owner = { holder, binding, root: null, temporary: null, handles: [], streams: [], packInvocation: null, unionInvocation: null,
    input: null, result: null, failure: null, resume, originalTarget: null, targetDirectories: [] };
  retainedSourceProgressOwners.add(owner);
  sourceProgressFileStreamOwners.set(owner, { rows: [], active: 0 });
  try {
    const actual = await withAuthenticatedWeatherProgressOwned(options, async input => {
      owner.input = input;
      for (const file of input.files) {
        if (!Number.isSafeInteger(file.bytes) || file.bytes < 0 || !SHA.test(file.sha256 ?? '')) {
          fail('SOURCE_PROGRESS_INVENTORY_INVALID');
        }
        await ownSourceProgressHandle(owner, file.sourcePath, file);
      }
      await checkSourceProgressOriginals(owner);
      if (owner.resume?.checkpointOnly === true) {
        owner.originalTarget = await selectOriginalProgressTarget({
          root: input.root, files: input.files, verifiedRoot: input.verifiedRoot,
          temporaryDirectory: input.temporaryDirectory, baselineSha256: input.baselineSha256,
          productionReferenceAt: owner.resume.target, pythonExecutable: options.pythonExecutable, sourceOwner: owner,
        });
      }
      // Reuse the ACTUAL normal merge, with all native/DMI/OM/CP admission rules.
      // Its returned promise and actual owned readers/children remain retained.
      if (installedComponents !== null) await completeSourceProgressPackForUnion(owner,installedComponents);
      const unionOptions = {
        root: input.root, progressFiles: input.files, progressVerifiedRoot: input.verifiedRoot,
        temporaryDirectory: input.temporaryDirectory,
        productionReferenceAt: options.productionReferenceAt, pythonExecutable: options.pythonExecutable,
        sourceInstalledComponents: installedComponents,
      };
      owner.unionInvocation = mergeVerifiedProtectedProgressComponents(unionOptions);
      if (installedComponents !== null) bindSourceProgressUnionInvocation(owner,owner.unionInvocation,unionOptions);
      owner.result = await owner.unionInvocation;
      await checkSourceProgressOriginals(owner);
      return owner.result;
    }, owner);
    sourceProgressResults.set(actual, owner);
    return actual;
  } catch (error) { throw retainSourceProgressFailure(owner, error); }
}
// No release even on success: own read completion is not producer/cohort stop.
// Inspection stays read-only. The separate fixed owned installer binds a distinct working generation.


// The callback can inspect authenticated, allowlisted private inputs only for
// its awaited lifetime. This boundary never merges, installs or saves them.
// Audit-only entry point; the existing normal restore path is intentionally unchanged.
export async function withAuthenticatedWeatherProgress(options = {}, inspect) {
  return withAuthenticatedWeatherProgressOwned(options, inspect);
}
async function withAuthenticatedWeatherProgressOwned({
  repositoryRoot = process.cwd(), basePath,
  repository = process.env.GITHUB_REPOSITORY,
  encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET,
  pythonExecutable,
  // Optional callers may tighten the production limits, never widen them.
  maximumEncryptedBytes = MAX_CIPHER_BYTES, maximumPackBytes = MAX_PACK_BYTES,
} = {}, inspect, sourceOwner = null) {
  if (sourceOwner && !retainedSourceProgressOwners.has(sourceOwner)) fail('SOURCE_PROGRESS_OWNER_REQUIRED');
  let temporary = null;
  let packInvocation = null;
  try {
    if (typeof inspect !== 'function') fail('INSPECTION_CALLBACK_REQUIRED');
    if (!Number.isSafeInteger(maximumEncryptedBytes) || maximumEncryptedBytes < 1024
      || maximumEncryptedBytes > MAX_CIPHER_BYTES
      || !Number.isSafeInteger(maximumPackBytes) || maximumPackBytes < 1024
      || maximumPackBytes > MAX_PACK_BYTES) fail('SIZE_BUDGET_INVALID');
    repoIdentity(repository);
    const root = await rootPath(repositoryRoot);
    if (sourceOwner) sourceOwner.root = root;
    if (!sourceOwner?.holder && (typeof basePath !== 'string' || !basePath)) fail('BASE_INVALID');
    const baselineFile = sourceOwner?.holder ? null : path.resolve(basePath);
    if (baselineFile === path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) fail('BASE_INVALID');
    const key = keyBytes(encryptionKey, { masterSecret, repository });
    const issued = sourceOwner?.holder ? await assertSourceOriginalProgress(sourceOwner.holder) : null;
    if (issued && (issued !== sourceOwner.binding || issued.repositoryRoot !== root || issued.repository !== repository)) fail('SOURCE_PROGRESS_BINDING_CHANGED');
    const base = issued ?? await readBase(baselineFile, repository);
    if ((sourceOwner?.holder ? (await assertSourceOriginalProgress(sourceOwner.holder)).baselineSha256 : await conditionsDigest(root)) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const checkedCipher = await checkedPath(root, WEATHER_PROGRESS_CIPHER_PATH,
      { optional: true, maximum: maximumEncryptedBytes });
    if (!checkedCipher) {
      if (sourceOwner?.holder) return await finishSourceProgressMiss(sourceOwner, 'SNAPSHOT_ABSENT');
      fail('SNAPSHOT_ABSENT');
    }
    const sourceCipher = sourceOwner ? await ownSourceProgressHandle(sourceOwner, checkedCipher) : null;
    const handle = sourceCipher ? sourceCipher.handle : await fs.open(checkedCipher, 'r');
    let aad;
    let iv;
    let tag;
    let start;
    let end;
    let encryptedBytes;
    try {
      const stat = await handle.stat();
      const size = stat.size;
      if (!stat.isFile() || size > maximumEncryptedBytes) fail('FILE_INVALID');
      encryptedBytes = size;
      if (!(await readExactly(handle, MAGIC.length, 0)).equals(MAGIC)) fail('SNAPSHOT_INVALID');
      const length = await readExactly(handle, 4, MAGIC.length);
      const count = length.readUInt32BE();
      if (count < 2 || count > 4096 || size <= MAGIC.length + 4 + count + 12 + 16) fail('SNAPSHOT_INVALID');
      const header = await readExactly(handle, count, MAGIC.length + 4);
      let parsed;
      try { parsed = JSON.parse(header.toString('utf8')); } catch { fail('SNAPSHOT_INVALID'); }
      if (sourceOwner) sourceOwner.inputHeaderRead = true;
      if (Object.keys(parsed ?? {}).sort().join(',') !== 'baselineSha256,kind,protectedBundleContentSha256,repository,schemaVersion'
        || parsed.kind !== PURPOSE || parsed.schemaVersion !== 1 || parsed.repository !== repository) {
        if (sourceOwner?.holder) return await finishSourceProgressMiss(sourceOwner, 'SNAPSHOT_SCOPE_MISMATCH');
        fail('SNAPSHOT_SCOPE_MISMATCH');
      }
      if (parsed.baselineSha256 !== base.baselineSha256
        || parsed.protectedBundleContentSha256 !== base.protectedBundleContentSha256) {
        if (sourceOwner?.holder) return await finishSourceProgressMiss(sourceOwner, 'BASELINE_MISMATCH');
        fail('BASELINE_MISMATCH');
      }
      aad = Buffer.concat([MAGIC, length, header]);
      iv = await readExactly(handle, 12, aad.length);
      tag = await readExactly(handle, 16, size - 16);
      start = aad.length + 12;
      end = size - 17;
    } finally { if (!sourceOwner) await handle.close(); }
    temporary = await temporaryRoot(sourceOwner);
    if (sourceOwner) sourceOwner.temporary = temporary;
    const compressed = path.join(temporary.folder, 'authenticated-pack.gz');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    try {
      // Do not gunzip, unpack or inspect emitted plaintext until final() has
      // authenticated the WHOLE message at successful pipeline completion.
      if (sourceCipher) await checkSourceProgressHandle(sourceCipher);
      await sourceProgressPipeline(sourceOwner, sourceCipher ? handle.createReadStream({ start, end, autoClose: false })
        : createReadStream(checkedCipher, { start, end }), boundedStream(maximumEncryptedBytes),
        decipher, boundedStream(maximumEncryptedBytes), createWriteStream(compressed, { flags: 'wx', mode: 0o600 }));
      if (sourceCipher) await checkSourceProgressHandle(sourceCipher);
    } catch (error) {
      if (sourceOwner) throw retainSourceProgressFailure(sourceOwner, error);
      fail('SNAPSHOT_AUTHENTICATION_FAILED');
    }
    const packPath = path.join(temporary.folder, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    if (sourceOwner) {
      const directory = path.dirname(packPath);
      if (directory !== path.join(temporary.folder, '.cache')) fail('SOURCE_PROGRESS_TEMP_PATH_INVALID');
      sourceOwner.packDirectory = { path: directory, birth: null };
      await fs.mkdir(directory, { mode: 0o700 });
      const born = await fs.lstat(directory, { bigint: true });
      if (!born.isDirectory() || born.isSymbolicLink()) fail('SOURCE_PROGRESS_TEMP_BIRTH_UNPROVED');
      sourceOwner.packDirectory.birth = Object.freeze({ dev: born.dev, ino: born.ino, mode: born.mode, nlink: born.nlink });
    } else await fs.mkdir(path.dirname(packPath), { recursive: true, mode: 0o700 });
    await sourceProgressPipeline(sourceOwner, createReadStream(compressed), createGunzip(), boundedStream(maximumPackBytes),
      createWriteStream(packPath, { flags: 'wx', mode: 0o600 }));
    const verifiedRoot = path.join(temporary.folder, 'verified');
    let sourceInventoryContext = null;
    if (sourceOwner) {
      const token = await prepareSourceProgressCpInput(sourceOwner, sourceCipher, compressed, packPath);
      sourceInventoryContext = await issueSourceProgressCpInventoryContext(sourceOwner.holder, token);
      sourceOwner.cpInventoryContext = sourceInventoryContext;
    }
    packInvocation = unpackPrivateWeatherComponentPack({ restoredRoot: temporary.folder,
      outputRoot: verifiedRoot, conditions: {}, pythonExecutable, includeOperationalProgress: true,
      ...(sourceOwner ? { sourceInventoryContext } : {}) });
    if (sourceOwner) {
      sourceOwner.packInvocation = packInvocation;
      retainSourceProgressPackInvocation(sourceOwner.holder, sourceInventoryContext, packInvocation);
    }
    const files = await packInvocation;
    if (sourceOwner) await assertSourceProgressPackClosure(sourceOwner.holder, sourceInventoryContext, packInvocation);
    // Reconfirm after the potentially slower CP-original validation and again
    // after the consumer. Private paths/content must never enter a public log.
    if ((sourceOwner?.holder ? (await assertSourceOriginalProgress(sourceOwner.holder)).baselineSha256 : await conditionsDigest(root)) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const result = await inspect({ root, files, verifiedRoot, temporaryDirectory: temporary.folder,
      baselineSha256: base.baselineSha256,
      protectedBundleContentSha256: base.protectedBundleContentSha256,
      capacity: Object.freeze({ encryptedBytes, compressedBytes: (await fs.stat(compressed)).size,
        rawPackBytes: (await fs.stat(packPath)).size, fileCount: files.length }) });
    if ((sourceOwner?.holder ? (await assertSourceOriginalProgress(sourceOwner.holder)).baselineSha256 : await conditionsDigest(root)) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    return result;
  } catch (error) {
    if (sourceOwner) throw retainSourceProgressFailure(sourceOwner, error);
    throw error;
  } finally {
    if (!sourceOwner && temporary && (packInvocation === null || privateWeatherPackJsonReadsClosed(packInvocation))) {
      try { await temporary.cleanup(); }
      catch { fail('TEMPORARY_CLEANUP_FAILED'); }
    }
  }
}

export async function installComponents(root, files, { renameImpl = fs.rename, rollbackRenameImpl = fs.rename } = {}) {
  const transaction = crypto.randomUUID();
  const staged = [];
  let committed = false;
  let rollbackFailed = false;
  try {
    // All files are already authenticated, unpacked, allowlisted and hashed.
    for (const file of files) {
      await checkedPath(root, file.relativePath, { optional: true });
      const destination = path.join(root, file.relativePath);
      await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
      await checkedPath(root, file.relativePath, { optional: true });
      const previousExists = Boolean(await fs.lstat(destination).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      }));
      const row = { destination, temporary: `${destination}.progress-new-${transaction}`,
        previous: `${destination}.progress-previous-${transaction}`, previousExists, installed: false };
      staged.push(row);
      await fs.copyFile(file.sourcePath, row.temporary, fs.constants.COPYFILE_EXCL);
      if (previousExists) await fs.copyFile(destination, row.previous, fs.constants.COPYFILE_EXCL);
    }
    for (const row of staged) {
      await renameImpl(row.temporary, row.destination);
      row.installed = true;
    }
    committed = true;
  } catch {
    for (const row of [...staged].reverse()) {
      if (!row.installed) continue;
      try {
        if (row.previousExists) await rollbackRenameImpl(row.previous, row.destination);
        else await fs.unlink(row.destination);
      } catch { rollbackFailed = true; }
    }
    if (rollbackFailed) fail('ROLLBACK_FAILED');
    fail('INSTALL_REJECTED');
  } finally {
    for (const row of staged) {
      await fs.unlink(row.temporary).catch(() => {});
      // Never delete the only backup if restoring originals failed.
      if (committed || !rollbackFailed) await fs.unlink(row.previous).catch(() => {});
    }
  }
}

async function originalProgressInputSha256(file) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(file)) {
    bytes += chunk.length;
    if (bytes > MAX_PACK_BYTES) fail('ORIGINAL_TARGET_INPUT_TOO_LARGE');
    hash.update(chunk);
  }
  return hash.digest('hex');
}

function originalProgressFreshness(report) {
  try {
    return classifyProductionTargetFreshness({
      target: report.productionReferenceAt,
      operationalRangeEnd: report.operationalRangeEndAt,
      maximumAgeMinutes: 90,
    });
  } catch { fail('ORIGINAL_TARGET_TIME_REJECTED'); }
}

async function assertOriginalProgressInputs(selection) {
  if (await originalProgressInputSha256(selection.candidatePath) !== selection.report.dmiCandidateSha256
    || await originalProgressInputSha256(selection.registryPath) !== selection.report.coastalPartsSha256
    || await conditionsDigest(selection.root) !== selection.report.baselineSha256) {
    fail('ORIGINAL_TARGET_INPUT_CHANGED');
  }
  originalProgressFreshness(selection.report);
}

const sourceOriginalTargetInputs = new WeakMap();
async function runOwnedSourceOriginalTargetRegistry(owner, selection) {
  if (!owner.holder || owner.originalTargetPending || owner.failure !== null
    || selection.root !== owner.root || owner.temporary?.folder === undefined) fail('SOURCE_ORIGINAL_TARGET_SCOPE_INVALID');
  const candidate = owner.handles.find(row => row.path === selection.candidatePath);
  if (!candidate) fail('SOURCE_ORIGINAL_TARGET_INPUT_REQUIRED');
  const registryStat = await fs.lstat(selection.registryPath, { bigint: true });
  const registry = await ownSourceProgressHandle(owner, selection.registryPath,
    { bytes: Number(registryStat.size), sha256: selection.report.coastalPartsSha256 });
  const directoryPath = owner.temporary.folder;
  for (const name of ['original-target-dmi-input.json', 'original-target-registry.json', 'original-target-registry.json.tmp']) {
    try { await fs.lstat(path.join(directoryPath, name)); }
    catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
    fail('SOURCE_ORIGINAL_TARGET_OUTPUT_EXISTS');
  }
  const directoryStat = await fs.lstat(directoryPath, { bigint: true });
  if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()
    || await fs.realpath(directoryPath) !== directoryPath) fail('SOURCE_ORIGINAL_TARGET_DIRECTORY_INVALID');
  const directory = { path: directoryPath, identity: directoryStat, handle: null };
  owner.targetDirectories.push(directory);
  directory.handle = await fs.open(directoryPath, sourceProgressFsConstants.O_RDONLY
    | sourceProgressFsConstants.O_DIRECTORY | sourceProgressFsConstants.O_NOFOLLOW);
  const token = Object.freeze({});
  const input = { owner, selection, candidate, registry, directory, regularInput: null, pending: true, phase: null };
  sourceOriginalTargetInputs.set(token, input);
  owner.originalTargetPending = input;
  await assertSourceOriginalTargetRegistryInput(owner.holder, token, input);
  const phase = await runSourceOriginalTargetRegistry(owner.holder, token);
  // H has closed its exclusive copy writer and real registry child. Keep a
  // separately opened, hash-exact own regular input until this S owner closes.
  input.regularInput = await ownSourceProgressHandle(owner,
    path.join(directoryPath, 'original-target-dmi-input.json'),
    { bytes: Number(candidate.identity.size), sha256: selection.report.dmiCandidateSha256 });
  await assertSourceOriginalTargetRegistryInput(owner.holder, token, input);
  input.phase = phase; input.pending = false;
}
export async function sourceOriginalTargetRegistryInput(holder, token) {
  const input = sourceOriginalTargetInputs.get(token);
  if (!input || input.owner.holder !== holder || input.owner.originalTargetPending !== input
    || input.pending !== true || input.phase !== null) fail('SOURCE_ORIGINAL_TARGET_INPUT_REQUIRED');
  await assertSourceOriginalTargetRegistryInput(holder, token, input);
  return input;
}
export async function assertSourceOriginalTargetRegistryInput(holder, token, input) {
  if (sourceOriginalTargetInputs.get(token) !== input || input.owner.holder !== holder
    || input.owner.originalTargetPending !== input || input.owner.failure !== null) fail('SOURCE_ORIGINAL_TARGET_INPUT_CHANGED');
  await checkSourceProgressOriginals(input.owner);
  for (const row of [input.candidate, input.registry, ...(input.regularInput ? [input.regularInput] : [])]) {
    await checkSourceProgressHandle(row);
  }
  const opened = await input.directory.handle.stat({ bigint: true });
  const named = await fs.lstat(input.directory.path, { bigint: true });
  for (const actual of [opened, named]) {
    if (!actual.isDirectory() || actual.isSymbolicLink()
      || ['dev', 'ino', 'mode'].some(key => actual[key] !== input.directory.identity[key])) {
      fail('SOURCE_ORIGINAL_TARGET_DIRECTORY_CHANGED');
    }
  }
  await assertOriginalProgressInputs(input.selection);
  return input;
}

async function selectOriginalProgressTarget({ root, files, verifiedRoot, temporaryDirectory, baselineSha256,
  productionReferenceAt,
  pythonExecutable = process.env.PYTHON ?? 'python', sourceOwner = null }) {
  const candidates = files.filter(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate);
  if (candidates.length !== 1) fail('ORIGINAL_TARGET_CANDIDATE_REQUIRED');
  const candidate = candidates[0];
  const candidatePath = await checkedPath(verifiedRoot, PRIVATE_WEATHER_COMPONENT_FILES.dmiCandidate);
  if (candidate.sourcePath !== candidatePath
    || await originalProgressInputSha256(candidatePath) !== candidate.sha256) {
    fail('ORIGINAL_TARGET_INPUT_CHANGED');
  }
  const registryPath = await checkedPath(root, 'data/live/coastal-parts-v2.json');
  const coastalPartsSha256 = await originalProgressInputSha256(registryPath);
  // Use the normal bounded decoder, including dictionary validation. Python
  // independently expands and validates the same authenticated whole file.
  const document = await readDmiBulkDocument(candidatePath, { expandSources: false });
  const ledger = document?.diagnostics?.currentOperationalLedger;
  const exactHour = value => typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z');
  if (!exactHour(ledger?.productionReferenceAt) || !exactHour(ledger?.operationalRangeEndAt)
    || !/^sha256:[0-9a-f]{64}$/.test(ledger?.targetRegistrySha256 ?? '')) {
    fail('ORIGINAL_TARGET_LEDGER_REQUIRED');
  }
  if (!exactHour(productionReferenceAt)
    || Date.parse(productionReferenceAt) !== Date.parse(ledger.productionReferenceAt)) {
    fail('ORIGINAL_TARGET_REFERENCE_MISMATCH');
  }
  const baselinePath = await checkedPath(root, CONDITIONS_PATH);
  const baselineConditions = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  if (!exactHour(baselineConditions?.productionReferenceAt)
    || Date.parse(ledger.productionReferenceAt) < Date.parse(baselineConditions.productionReferenceAt)) {
    fail('ORIGINAL_TARGET_BEFORE_BASELINE');
  }
  const report = {
    schemaVersion: 1, kind: 'AUTHENTICATED_DMI_PROGRESS_ORIGINAL_TARGET',
    productionReferenceAt: new Date(ledger.productionReferenceAt).toISOString(),
    operationalRangeEndAt: new Date(ledger.operationalRangeEndAt).toISOString(),
    baselineSha256, dmiCandidateSha256: candidate.sha256, coastalPartsSha256,
    targetRegistrySha256: ledger.targetRegistrySha256,
    productionAuthority: false, privatePayloadIncluded: false,
  };
  originalProgressFreshness(report);
  // Normal registry CLI re-derives the actual attestation and verifies the
  // complete availability ledger against current central targets. Never pass
  // --full-coast or substitute a caller's boolean/JSON validation result.
  if (sourceOwner) {
    await runOwnedSourceOriginalTargetRegistry(sourceOwner, { report, candidatePath, registryPath, root });
  } else {
    await new Promise((resolve, reject) => {
      const child = spawn(pythonExecutable, [
        fileURLToPath(new URL('./build-copernicus-target-registry.py', import.meta.url)),
        '--targets', registryPath, '--dmi', candidatePath,
        '--at', report.productionReferenceAt,
        '--output', path.join(temporaryDirectory, 'original-target-registry.json'),
      ], { windowsHide: true, stdio: 'ignore', env: copernicusOfflineEnvironment() });
      let fault = null, closed = false, stopRequested = false;
      const stop = code => {
        if (closed) return;
        fault ??= code;
        clearTimeout(timer);
        if (!stopRequested) {
          stopRequested = true;
          try { if (child.pid) child.kill('SIGKILL'); } catch { /* Await close. */ }
        }
      };
      const timer = setTimeout(() => stop('ORIGINAL_TARGET_VALIDATION_TIMEOUT'), 180_000);
      child.once('error', () => stop('ORIGINAL_TARGET_VALIDATOR_UNAVAILABLE'));
      child.once('close', (code, signal) => {
        closed = true;
        clearTimeout(timer);
        if (fault || code !== 0 || signal !== null) {
          const error = new Error('ORIGINAL_TARGET_LEDGER_REJECTED');
          error.progressCode = fault ?? 'ORIGINAL_TARGET_LEDGER_REJECTED';
          reject(error);
        } else resolve();
      });
    });
  }
  // The owned stage stays alive until the real child close event. No new
  // registry/ledger replaces an original, and nothing has been installed.
  const selection = { report, candidatePath, registryPath, root };
  await assertOriginalProgressInputs(selection);
  report.selectionSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
  return selection;
}

const retainedEpochOriginalReaders = new Set();
async function epochActiveAbsent(root) {
  if (await checkedPath(root, PRIVATE_WEATHER_COMPONENT_FILES.dmiActive, { optional: true })) fail('EPOCH_ACTIVE_DESTINATION_EXISTS');
}
async function epochProgressView(view, root, productionReferenceAt) {
  const { assertWeatherStateEpochInputViewForTarget } = await import('./lib/weather-state-epoch-input-view.mjs');
  const file = await checkedPath(root, 'data/live/coastal-parts-v2.json', { maximum: 32 * 1024 * 1024 });
  return assertWeatherStateEpochInputViewForTarget(view, {
    registry: JSON.parse(await fs.readFile(file, 'utf8')), targetReferenceAt: new Date(productionReferenceAt).toISOString() });
}
async function epochProgressFiles({ view, root, productionReferenceAt, originalRoot, files }) {
  const verified = await epochProgressView(view, root, productionReferenceAt);
  await epochActiveAbsent(root);
  const proof = verified.facts.originalFileDigests.find(row => row.relativePath === PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  if (!proof || !Number.isSafeInteger(proof.bytes) || proof.bytes < 1 || proof.bytes > MAX_PACK_BYTES
    || !SHA.test(proof.sha256)) fail('EPOCH_ORIGINAL_PACK_REQUIRED');
  const original = await rootPath(originalRoot);
  const file = await checkedPath(original, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  const named = await fs.lstat(file);
  const handle = await fs.open(file, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)), fd = handle.fd;
  const descriptorIdentity = ownFileDescriptorIdentity(fd);
  let first = null, descriptor;
  try {
    const start = await handle.stat();
    if (!start.isFile() || start.nlink !== 1 || start.size !== proof.bytes) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    for (const key of ['dev','ino','mode','nlink','size','mtimeMs','ctimeMs'])
      if (start[key] !== named[key]) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    const magic = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
    const prefix = await readExactly(handle, magic.length + 4, 0);
    if (!prefix.subarray(0, magic.length).equals(magic)) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    const length = prefix.readUInt32BE(magic.length);
    if (length < 2 || length > 32 * 1024 * 1024 || magic.length + 4 + length > proof.bytes) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    const manifest = JSON.parse((await readExactly(handle, length, prefix.length)).toString('utf8'));
    if (manifest.kind !== 'PRIVATE_WEATHER_COMPONENT_PACK' || manifest.schemaVersion !== 1 || !Array.isArray(manifest.files)) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    const rows = manifest.files.filter(row => row.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiActive);
    if (rows.length > 1) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    descriptor = rows[0] ?? null;
    if (descriptor && (!Number.isSafeInteger(descriptor.bytes) || descriptor.bytes < 1 || !SHA.test(descriptor.sha256))) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    const hash = crypto.createHash('sha256');
    for (let position = 0; position < proof.bytes;) {
      const chunk = await readExactly(handle, Math.min(64 * 1024, proof.bytes - position), position);
      position += chunk.length; hash.update(chunk);
    }
    if (hash.digest('hex') !== proof.sha256) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    if ((await handle.read(Buffer.alloc(1), 0, 1, proof.bytes)).bytesRead !== 0) fail('EPOCH_ORIGINAL_PACK_CHANGED');
    for (const current of [await handle.stat(), await fs.lstat(file)])
      for (const key of ['dev','ino','mode','nlink','size','mtimeMs','ctimeMs'])
        if (current[key] !== start[key]) fail('EPOCH_ORIGINAL_PACK_CHANGED');
  } catch (error) { first = { error }; }
  try { await handle.close(); } catch (error) { first ??= { error }; }
  if (!await ownedFileDescriptorClosed(fd, descriptorIdentity)) {
    retainedEpochOriginalReaders.add(handle);
    first ??= { error: Object.assign(new Error('EPOCH_ORIGINAL_PACK_CLOSE_UNPROVED'), { progressCode:'EPOCH_ORIGINAL_PACK_CLOSE_UNPROVED' }) };
  }
  if (first !== null) throw first.error;
  await epochProgressView(view, root, productionReferenceAt);
  for (const row of files) if (row.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.dmiActive
    && (descriptor === null || row.bytes !== descriptor.bytes || row.sha256 !== descriptor.sha256))
    fail('EPOCH_ACTIVE_PROGRESS_REQUIRES_SEPARATE_ADMISSION');
  return files.filter(row => row.relativePath !== PRIVATE_WEATHER_COMPONENT_FILES.dmiActive);
}

// Typed cold-reentry scope only: no CLI flag, caller file list or JSON grant.
const retainedColdProgressReaders = new Set();
async function coldProgressFile(root, relativePath, {
  expected = null, maximum = MAX_PACK_BYTES, json = false, copyTo = null,
} = {}, lifetime) {
  if (![CONDITIONS_PATH, 'data/live/coastal-parts-v2.json', PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath].includes(relativePath)
    || (expected !== null && (expected.relativePath !== relativePath
      || !Number.isSafeInteger(expected.bytes) || expected.bytes < 1 || expected.bytes > maximum
      || !SHA.test(expected.sha256)))) fail('COLD_PROGRESS_ORIGINAL_INVALID');
  const file = await checkedPath(root, relativePath, { maximum });
  const named = await fs.lstat(file, { bigint: true });
  const opened = [];
  const own = handle => {
    const row = { handle, fd: handle.fd, identity: ownFileDescriptorIdentity(handle.fd) };
    opened.push(row); return handle;
  };
  let first = null, result;
  try {
    const input = own(await fs.open(file, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0)));
    const start = await input.stat({ bigint: true });
    const fields = ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'];
    if (!start.isFile() || start.nlink !== 1n || start.size < 1n || start.size > BigInt(maximum)
      || fields.some(key => start[key] !== named[key])
      || (expected !== null && start.size !== BigInt(expected.bytes))) fail('COLD_PROGRESS_ORIGINAL_CHANGED');
    const bytes = Number(start.size), chunks = json ? [] : null;
    const output = copyTo === null ? null : own(await fs.open(copyTo, 'wx', 0o600));
    const hash = crypto.createHash('sha256');
    for (let position = 0; position < bytes;) {
      const chunk = await readExactly(input, Math.min(64 * 1024, bytes - position), position);
      position += chunk.length; hash.update(chunk);
      if (chunks) chunks.push(chunk);
      if (output) await output.writeFile(chunk);
    }
    if ((await input.read(Buffer.alloc(1), 0, 1, bytes)).bytesRead !== 0) fail('COLD_PROGRESS_ORIGINAL_CHANGED');
    const sha256 = hash.digest('hex');
    if (expected !== null && sha256 !== expected.sha256) fail('COLD_PROGRESS_ORIGINAL_CHANGED');
    await checkedPath(root, relativePath, { maximum });
    for (const current of [await input.stat({ bigint: true }), await fs.lstat(file, { bigint: true })])
      if (fields.some(key => current[key] !== start[key])) fail('COLD_PROGRESS_ORIGINAL_CHANGED');
    if (output) {
      await output.sync();
      const actual = await output.stat({ bigint: true });
      if (!actual.isFile() || actual.nlink !== 1n || actual.size !== start.size) fail('COLD_PROGRESS_COPY_CHANGED');
      const destination = await fs.lstat(copyTo, { bigint: true });
      if (fields.some(key => destination[key] !== actual[key])) fail('COLD_PROGRESS_COPY_CHANGED');
    }
    result = { bytes, sha256, ...(json ? { value: JSON.parse(Buffer.concat(chunks, bytes).toString('utf8')) } : {}) };
  } catch (error) { first = { error }; }
  for (const row of opened.reverse()) {
    try { await row.handle.close(); } catch (error) { first ??= { error }; }
    if (!await ownedFileDescriptorClosed(row.fd, row.identity)) {
      lifetime.closed = false;
      retainedColdProgressReaders.add(row.handle);
      first ??= { error: Object.assign(new Error('COLD_PROGRESS_CLOSE_UNPROVED'), { progressCode: 'COLD_PROGRESS_CLOSE_UNPROVED' }) };
    }
  }
  if (first !== null) throw first.error;
  return result;
}
async function coldProgressScope(capability, root, base, productionReferenceAt, lifetime) {
  const registry = await coldProgressFile(root, 'data/live/coastal-parts-v2.json',
    { maximum: 16 * 1024 * 1024, json: true }, lifetime);
  const { currentFamilyColdStartProgressUnionScope } = await import('./current-family-cold-start.mjs');
  const scope = currentFamilyColdStartProgressUnionScope(capability, {
    registry: registry.value, targetReferenceAt: new Date(productionReferenceAt).toISOString(),
  });
  if (!Object.isFrozen(scope) || scope.repositoryRoot !== root
    || scope.protectedBundleContentSha256 !== base.protectedBundleContentSha256
    || scope.registrySha256 !== 'sha256:' + registry.sha256
    || scope.targetReferenceAt !== new Date(productionReferenceAt).toISOString()
    || scope.conditionsFile?.relativePath !== CONDITIONS_PATH
    || scope.conditionsFile?.sha256 !== base.baselineSha256
    || scope.componentPackFile?.relativePath !== PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath) {
    fail('COLD_PROGRESS_SCOPE_MISMATCH');
  }
  const conditions = await coldProgressFile(root, CONDITIONS_PATH,
    { expected: scope.conditionsFile, json: true }, lifetime);
  return { scope, conditions: conditions.value };
}

export async function weatherComponentProgressCache({
  mode, repositoryRoot = process.cwd(), basePath,
  protectedBundleSha256,
  repository = process.env.GITHUB_REPOSITORY,
  encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET,
  productionReferenceAt = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,
  resumeOriginalTarget = false,
  stateEpochInputView = null, epochOriginalRoot = null,
  currentFamilyColdStartCapability = null,
  pythonExecutable, renameImpl, rollbackRenameImpl,
  maximumEncryptedBytes = MAX_CIPHER_BYTES,
} = {}) {
  let temporary = null;
  let packInvocation = null;
  let unionInvocation = null;
  const coldLifetime = { closed: true };
  let coldPackInvocation = null;
  let cipherTemporary = null;
  let restoreInstalled = false;
  try {
    if (!['capture-base', 'save', 'restore'].includes(mode)) fail('MODE_INVALID');
    if (typeof resumeOriginalTarget !== 'boolean' || (resumeOriginalTarget && mode !== 'restore')) fail('ARGUMENT_INVALID');
    if (currentFamilyColdStartCapability !== null
      && (mode !== 'restore' || !resumeOriginalTarget || stateEpochInputView !== null || epochOriginalRoot !== null)) fail('ARGUMENT_INVALID');
    if (stateEpochInputView !== null) {
      if (mode !== 'restore' || !resumeOriginalTarget || typeof epochOriginalRoot !== 'string') fail('ARGUMENT_INVALID');
      const { assertWeatherStateEpochInputView } = await import('./lib/weather-state-epoch-input-view.mjs');
      const view = assertWeatherStateEpochInputView(stateEpochInputView);
      if (view.targetReferenceAt !== new Date(productionReferenceAt).toISOString()) fail('ORIGINAL_TARGET_MISMATCH');
    } else if (epochOriginalRoot !== null) fail('ARGUMENT_INVALID');
    repoIdentity(repository);
    const root = await rootPath(repositoryRoot);
    if (typeof basePath !== 'string' || !basePath) fail('BASE_INVALID');
    const baselineFile = path.resolve(basePath);
    if (baselineFile === path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) fail('BASE_INVALID');
    if (mode === 'capture-base') {
      // Caller MUST invoke only after a successful protected-runtime install.
      if (!SHA.test(protectedBundleSha256 ?? '')) fail('PROTECTED_BUNDLE_IDENTITY_REQUIRED');
      const baselineSha256 = await conditionsDigest(root);
      await fs.writeFile(baselineFile, `${JSON.stringify({ kind: PURPOSE, schemaVersion: 1, repository, baselineSha256,
        protectedBundleContentSha256: protectedBundleSha256 })}\n`, { flag: 'wx', mode: 0o600 });
      return status('BASE_CAPTURED', 'BASE_CAPTURED', { captured: true });
    }
    const key = keyBytes(encryptionKey, { masterSecret, repository });
    const base = await readBase(baselineFile, repository);
    const coldBinding = currentFamilyColdStartCapability === null ? null
      : await coldProgressScope(currentFamilyColdStartCapability, root, base, productionReferenceAt, coldLifetime);
    const cipherPath = path.join(root, WEATHER_PROGRESS_CIPHER_PATH);
    if (mode === 'save') {
      if (!Number.isSafeInteger(maximumEncryptedBytes) || maximumEncryptedBytes < 1024
        || maximumEncryptedBytes > MAX_CIPHER_BYTES) fail('SIZE_BUDGET_INVALID');
      temporary = await temporaryRoot();
      packInvocation = buildPrivateWeatherComponentPack({
        repositoryRoot: root, outputRoot: temporary.folder, conditions: {}, pythonExecutable,
        includeOperationalProgress: true,
      });
      const pack = await packInvocation;
      if (!pack) return status('SKIPPED', 'NO_COMPONENT_PROGRESS');
      await checkedPath(root, WEATHER_PROGRESS_CIPHER_PATH, { optional: true, maximum: MAX_CIPHER_BYTES });
      await fs.mkdir(path.dirname(cipherPath), { recursive: true, mode: 0o700 });
      await checkedPath(root, WEATHER_PROGRESS_CIPHER_PATH, { optional: true, maximum: MAX_CIPHER_BYTES });
      const header = Buffer.from(JSON.stringify({ kind: PURPOSE, schemaVersion: 1, repository,
        baselineSha256: base.baselineSha256, protectedBundleContentSha256: base.protectedBundleContentSha256 }));
      const length = Buffer.alloc(4);
      length.writeUInt32BE(header.length);
      const aad = Buffer.concat([MAGIC, length, header]);
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
      cipher.setAAD(aad);
      cipherTemporary = `${cipherPath}.new-${crypto.randomUUID()}`;
      const prefix = Buffer.concat([aad, iv]);
      await fs.writeFile(cipherTemporary, prefix, { flag: 'wx', mode: 0o600 });
      await pipeline(createReadStream(pack.sourcePath), boundedStream(MAX_PACK_BYTES), createGzip(),
        boundedStream(maximumEncryptedBytes - prefix.length - 16), cipher,
        createWriteStream(cipherTemporary, { flags: 'a', mode: 0o600 }));
      await fs.appendFile(cipherTemporary, cipher.getAuthTag());
      const encryptedBytes = (await fs.stat(cipherTemporary)).size;
      if (encryptedBytes > maximumEncryptedBytes) fail('SIZE_LIMIT');
      // Flush the complete owned ciphertext (including the authentication tag)
      // before replacing the previous snapshot. This does not prove directory
      // crash durability, Actions upload, or survival of a lost runner.
      const cipherHandle = await fs.open(cipherTemporary, 'r+');
      let flushFailure = null;
      try { await cipherHandle.sync(); }
      catch { flushFailure = 'CIPHER_SYNC_FAILED'; }
      try { await cipherHandle.close(); }
      catch { flushFailure ??= 'CIPHER_CLOSE_FAILED'; }
      if (flushFailure !== null) fail(flushFailure);
      await fs.rename(cipherTemporary, cipherPath);
      cipherTemporary = null;
      return status('SAVED', 'ENCRYPTED_PROGRESS_SAVED', { saved: true, encryptedBytes });
    }

    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const checkedCipher = await checkedPath(root, WEATHER_PROGRESS_CIPHER_PATH, { optional: true, maximum: MAX_CIPHER_BYTES });
    if (!checkedCipher) return status('CACHE_MISS', 'SNAPSHOT_ABSENT');
    const handle = await fs.open(checkedCipher, 'r');
    let aad;
    let iv;
    let tag;
    let start;
    let end;
    try {
      const size = (await handle.stat()).size;
      if (!(await readExactly(handle, MAGIC.length, 0)).equals(MAGIC)) fail('SNAPSHOT_INVALID');
      const length = await readExactly(handle, 4, MAGIC.length);
      const count = length.readUInt32BE();
      if (count < 2 || count > 4096 || size <= MAGIC.length + 4 + count + 12 + 16) fail('SNAPSHOT_INVALID');
      const header = await readExactly(handle, count, MAGIC.length + 4);
      let parsed;
      try { parsed = JSON.parse(header.toString('utf8')); } catch { fail('SNAPSHOT_INVALID'); }
      if (Object.keys(parsed ?? {}).sort().join(',') !== 'baselineSha256,kind,protectedBundleContentSha256,repository,schemaVersion'
        || parsed.kind !== PURPOSE || parsed.schemaVersion !== 1 || parsed.repository !== repository) fail('SNAPSHOT_SCOPE_MISMATCH');
      if (parsed.baselineSha256 !== base.baselineSha256
        || parsed.protectedBundleContentSha256 !== base.protectedBundleContentSha256) fail('BASELINE_MISMATCH');
      aad = Buffer.concat([MAGIC, length, header]);
      iv = await readExactly(handle, 12, aad.length);
      tag = await readExactly(handle, 16, size - 16);
      start = aad.length + 12;
      end = size - 17;
    } finally { await handle.close(); }
    temporary = await temporaryRoot();
    const compressed = path.join(temporary.folder, 'authenticated-pack.gz');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, { authTagLength: 16 });
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    try {
      // Do not gunzip, unpack or inspect emitted plaintext until final() has
      // authenticated the WHOLE message at successful pipeline completion.
      await pipeline(createReadStream(checkedCipher, { start, end }), boundedStream(MAX_CIPHER_BYTES),
        decipher, boundedStream(MAX_CIPHER_BYTES), createWriteStream(compressed, { flags: 'wx', mode: 0o600 }));
    } catch { fail('SNAPSHOT_AUTHENTICATION_FAILED'); }
    const packPath = path.join(temporary.folder, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    await fs.mkdir(path.dirname(packPath), { recursive: true, mode: 0o700 });
    await pipeline(createReadStream(compressed), createGunzip(), boundedStream(MAX_PACK_BYTES),
      createWriteStream(packPath, { flags: 'wx', mode: 0o600 }));
    packInvocation = unpackPrivateWeatherComponentPack({ restoredRoot: temporary.folder,
      outputRoot: path.join(temporary.folder, 'verified'), conditions: {}, pythonExecutable,
      includeOperationalProgress: true });
    const authenticatedFiles = await packInvocation;
    const files = stateEpochInputView === null ? authenticatedFiles : await epochProgressFiles({
      view: stateEpochInputView, root, productionReferenceAt, originalRoot: epochOriginalRoot, files: authenticatedFiles });
    // Reconfirm after the potentially slower CP-original validation.
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const originalTarget = resumeOriginalTarget ? await selectOriginalProgressTarget({
      root, files, verifiedRoot: path.join(temporary.folder, 'verified'),
      temporaryDirectory: temporary.folder, baselineSha256: base.baselineSha256,
      productionReferenceAt, pythonExecutable,
    }) : null;
    if (stateEpochInputView !== null) await epochActiveAbsent(root);
    let coldCompleteFiles = null;
    if (coldBinding !== null) {
      // Verify/copy the WHOLE original pack before the normal unpack. Only its
      // two OLD CURRENT donor descriptors are omitted from the later union.
      const originalRoot = path.join(temporary.folder, 'cold-protected-original');
      const originalPack = path.join(originalRoot, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
      await fs.mkdir(originalRoot, { mode: 0o700 });
      await fs.mkdir(path.dirname(originalPack), { mode: 0o700 });
      await coldProgressFile(root, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath,
        { expected: coldBinding.scope.componentPackFile, copyTo: originalPack }, coldLifetime);
      coldPackInvocation = unpackPrivateWeatherComponentPack({ restoredRoot: originalRoot,
        outputRoot: path.join(temporary.folder, 'cold-protected-verified'),
        conditions: coldBinding.conditions, pythonExecutable });
      const complete = await coldPackInvocation;
      await coldProgressFile(originalRoot, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath,
        { expected: coldBinding.scope.componentPackFile }, coldLifetime);
      coldCompleteFiles = complete.filter(file =>
        file.relativePath !== PRIVATE_WEATHER_COMPONENT_FILES.copernicusCurrentDonorBank
        && file.relativePath !== PRIVATE_WEATHER_COMPONENT_FILES.openMeteoCurrentDonorBank);
    }
    let reconciled;
    try {
      unionInvocation = mergeVerifiedProtectedProgressComponents({
        root, progressFiles: files, progressVerifiedRoot: path.join(temporary.folder, 'verified'),
        temporaryDirectory: temporary.folder,
        productionReferenceAt, pythonExecutable,
        ...(coldCompleteFiles === null ? {} : { completeFiles: coldCompleteFiles }),
      });
      reconciled = await unionInvocation;
    } catch (error) {
      return status('RESTORE_REPAIR_REQUIRED', 'PROTECTED_PROGRESS_UNION_FAILED', {
        requiresProtectedRestore: true, unionFailureCode: protectedProgressUnionFailureCode(error),
      });
    }
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    if (originalTarget) await assertOriginalProgressInputs(originalTarget);
    if (stateEpochInputView !== null) {
      await epochProgressView(stateEpochInputView, root, productionReferenceAt);
      await epochActiveAbsent(root);
    }
    if (coldBinding !== null) {
      await coldProgressScope(currentFamilyColdStartCapability, root, base, productionReferenceAt, coldLifetime);
      await coldProgressFile(root, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath,
        { expected: coldBinding.scope.componentPackFile }, coldLifetime);
    }
    await installComponents(root, reconciled.files, { renameImpl, rollbackRenameImpl });
    restoreInstalled = true;
    if (stateEpochInputView !== null) await epochActiveAbsent(root);
    // Installation has changed working inputs. Finish baseline verification
    // and cleanup before success; a late failure is no untouched cache miss.
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const installedTemporary = temporary;
    temporary = null; // One cleanup attempt; failure is reported below.
    try { await installedTemporary.cleanup(); }
    catch { fail('TEMPORARY_CLEANUP_FAILED'); }
    return status('RESTORED', 'ENCRYPTED_PROGRESS_RESTORED', {
      restored: true, fileCount: reconciled.files.length,
      protectedOpenMeteoRecordsRecovered: reconciled.openMeteoAdded,
      protectedCopernicusBankMerged: reconciled.copernicusMerged,
      protectedCurrentDonorBanksMerged: reconciled.currentDonorMerged,
      dmiProgress: reconciled.dmiProgress,
      ...(originalTarget ? {
        restoredProductionReferenceAt: originalTarget.report.productionReferenceAt,
        restoredOriginalTargetSha256: originalTarget.report.selectionSha256,
      } : {}),
    });
  } catch (error) {
    const code = error?.progressCode
      ?? (mode === 'save' && SAFE_PACK_ERROR_CODES.has(error?.message) ? error.message : null)
      ?? (mode === 'capture-base' ? 'BASE_UNAVAILABLE' : 'PROGRESS_UNAVAILABLE');
    return restoreInstalled || ['ROLLBACK_FAILED', 'PROTECTED_PROGRESS_UNION_FAILED'].includes(code)
      ? status('RESTORE_REPAIR_REQUIRED', code, { requiresProtectedRestore: true })
      : status('CACHE_MISS', code);
  } finally {
    if (cipherTemporary) await fs.unlink(cipherTemporary).catch(() => {});
    // Preserve earlier primary errors, especially failed rollback/union,
    // even when their best-effort temporary cleanup also fails.
    if (temporary && coldLifetime.closed
      && (coldPackInvocation === null || privateWeatherPackJsonReadsClosed(coldPackInvocation))
      && (packInvocation === null || privateWeatherPackJsonReadsClosed(packInvocation))
      && (unionInvocation === null || protectedProgressPackJsonReadsClosed(unionInvocation))) {
      await temporary.cleanup().catch(() => {});
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const mode = args.shift();
    const values = {};
    while (args.length) {
      const key = args.shift();
      if (!['--root', '--base', '--report', '--protected-bundle-sha256', '--resume-original-target'].includes(key) || !args.length || values[key]) fail('ARGUMENT_INVALID');
      values[key] = args.shift();
    }
    if (!values['--base'] || !values['--report']) fail('ARGUMENT_INVALID');
    if (mode !== 'capture-base' && values['--protected-bundle-sha256']) fail('ARGUMENT_INVALID');
    if (Object.hasOwn(values, '--resume-original-target')
      && (mode !== 'restore' || !['true', 'false'].includes(values['--resume-original-target']))) fail('ARGUMENT_INVALID');
    const resumeOriginalTarget = values['--resume-original-target'] === 'true';
    const result = await weatherComponentProgressCache({ mode, repositoryRoot: values['--root'], basePath: values['--base'],
      protectedBundleSha256: values['--protected-bundle-sha256'], resumeOriginalTarget });
    await fs.writeFile(path.resolve(values['--report']), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(result));
    // Ordinary misses never fail a deployment. A failed rollback requires
    // reinstalling the protected baseline before weather files are consumed.
    if (result.requiresProtectedRestore) process.exitCode = 2;
    else if (resumeOriginalTarget && result.restored !== true) process.exitCode = 1;
  } catch {
    console.error('WEATHER_PROGRESS_CACHE_REPORT_UNAVAILABLE');
    process.exitCode = 1;
  }
}
