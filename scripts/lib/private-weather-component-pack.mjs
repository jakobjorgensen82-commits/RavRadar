import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream, fstat, constants } from 'node:fs';
import { types } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openMeteoPartSha256 } from './open-meteo-part-bank.mjs';
import {
  PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, privateWeatherComponentMarker,
} from './private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './private-weather-progress-files.mjs';
import { copernicusOfflineEnvironment } from './copernicus-offline-environment.mjs';

const MAGIC = Buffer.from('RR-WEATHER-COMPONENT-PACK-1\n');
const MAX_PACK_BYTES = 768 * 1024 * 1024; // existing private-runtime per-file bound
const MAX_JSON_BYTES = 256 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 32 * 1024 * 1024;
const MAX_FILES = 65536;
const CP_PREFIX = '.cache/copernicus-components/';
const CP_OBJECT = /^objects\/([0-9a-f]{64})\.nc$/;
const CP_RECEIPT = /^receipts\/[0-9a-f]{64}-[0-9a-f]{64}\.json$/;
const CP_STATIC = /^static\/[0-9a-f]{64}\.json$/;
const COMPONENT_FILE_KEYS = new Set([
  'openMeteoBank',
  'copernicusBank',
  'copernicusProgress',
  'fallbackCursor',
  'selectedComponents',
]);
const BASE_DUPLICATE_PROGRESS_KEYS = new Set([
  'copernicusCurrentShadow',
  'openMeteoCurrentFallback',
]);
const RUNNER = fileURLToPath(new URL('../run-copernicus-weather-components.py', import.meta.url));
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const same = (a, b) => openMeteoPartSha256(a) === openMeteoPartSha256(b);
const fail = code => { throw new Error(code); };
const safePath = (relative, includeOperationalProgress = false) => Object.values(PRIVATE_WEATHER_COMPONENT_FILES).includes(relative)
  || includeOperationalProgress === true && Object.values(PRIVATE_WEATHER_PROGRESS_ONLY_FILES).includes(relative)
  || relative.startsWith(CP_PREFIX) && [CP_OBJECT, CP_RECEIPT, CP_STATIC].some(pattern => pattern.test(relative.slice(CP_PREFIX.length)));

async function checkedFile(root, relative, { optional = false, maximumBytes = MAX_PACK_BYTES, includeOperationalProgress = false } = {}) {
  if (!safePath(relative, includeOperationalProgress) && relative !== PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath) fail('WEATHER_PACK_PATH_NOT_ALLOWLISTED');
  let current = path.resolve(root);
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const stat = await fs.lstat(current).catch(error => {
      if (error.code === 'ENOENT' && optional) return null;
      throw error;
    });
    if (!stat) return null;
    if (stat.isSymbolicLink()) fail('WEATHER_PACK_SYMLINK_REJECTED');
  }
  const stat = await fs.stat(current);
  if (!stat.isFile() || stat.size < 1 || stat.size > maximumBytes) fail('WEATHER_PACK_FILE_SIZE_INVALID');
  return { absolute: current, bytes: stat.size };
}
async function* readPackChunks(absolute, readState) {
  const stream = createReadStream(absolute);
  let fd, failure;
  stream.once('open', number => { fd = number; });
  const completion = new Promise(resolve => stream.once('close', resolve));
  stream.once('error', error => { failure ??= { error }; });
  try {
    for await (const chunk of stream) yield chunk;
  } catch (error) { failure ??= { error }; }
  finally {
    await completion;
    let closed = false;
    try {
      const probe = await new Promise(resolve => fstat(fd, (error, stat) => resolve({ error, stat })));
      closed = probe.error !== null && typeof probe.error === 'object' && !types.isProxy(probe.error)
        && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
    } catch { /* Unknown closure cannot authorize success or staging cleanup. */ }
    if (!closed) {
      readState.closed = false;
      retainedJsonReaders.add(stream);
      failure ??= { error: new Error('WEATHER_PACK_STREAM_CLOSE_UNPROVED') };
    }
    if (failure) throw failure.error;
  }
}
async function digestFile(absolute, readState) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of readPackChunks(absolute, readState)) {
    bytes += chunk.length;
    if (bytes > MAX_PACK_BYTES) fail('WEATHER_PACK_FILE_SIZE_INVALID');
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}
const retainedJsonReaders = new Set();
const packJsonReadLifetimes = new WeakMap();

// Closure of this pack's owned handles plus proved build publication/cleanup.
// Not other caller I/O, authenticity, ownership, or permission.
// A missing, copied, foreign, or pending invocation supplies no close evidence.
export function privateWeatherPackJsonReadsClosed(invocation) {
  const state = packJsonReadLifetimes.get(invocation);
  return state?.settled === true && state.closed === true;
}
async function readSmallJson(file, maximumBytes = MAX_JSON_BYTES, readState) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) fail('WEATHER_PACK_JSON_SIZE_INVALID');
  let handle, fd, value, failure;
  try {
    handle = await fs.open(file, 'r');
    fd = handle.fd; // Capture this own descriptor before the next await.
    value = JSON.parse(await handle.readFile('utf8'));
  } catch { failure = { error: new Error('WEATHER_PACK_JSON_INVALID') }; }
  if (handle) {
    try { await handle.close(); }
    catch { failure ??= { error: new Error('WEATHER_PACK_JSON_INVALID') }; }
    let closed = false;
    try {
      const probe = await new Promise(resolve => fstat(fd, (error, stat) => resolve({ error, stat })));
      closed = probe.error !== null && typeof probe.error === 'object' && !types.isProxy(probe.error)
        && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
    } catch { /* An unknown raw probe is not evidence of closure. */ }
    if (!closed) {
      readState.closed = false;
      retainedJsonReaders.add(handle);
      failure ??= { error: new Error('WEATHER_PACK_JSON_CLOSE_UNPROVED') };
    }
  }
  if (failure) throw failure.error;
  return value;
}
async function cpStorageInventory(root, bank, pythonExecutable, readState) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cp-storage-inventory-'));
  let inventoryFailed = false;
  try {
    const output = path.join(temporary, 'inventory.json');
    await new Promise((resolve, reject) => {
      const child = spawn(pythonExecutable, [RUNNER, '--bank', path.join(root, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank),
        '--cache-directory', path.join(root, CP_PREFIX), '--storage-inventory', output],
      { windowsHide: true, stdio: 'ignore', env: copernicusOfflineEnvironment() });
      let fault = null, stopRequested = false, closed = false;
      const stop = code => {
        if (closed) return;
        fault ??= new Error(code);
        clearTimeout(timer);
        if (stopRequested) return;
        stopRequested = true;
        // Only signal this retained child, never a PID/group. kill returning
        // or throwing does not release the directories it may still access.
        try { if (child.pid) child.kill('SIGKILL'); } catch { /* Await close. */ }
      };
      const timer = setTimeout(() => stop('WEATHER_PACK_CP_INVENTORY_TIMEOUT'), 120_000);
      child.on('error', () => stop('WEATHER_PACK_CP_INVENTORY_UNAVAILABLE'));
      child.once('close', code => {
        closed = true;
        clearTimeout(timer);
        // No close => no settlement/outer cleanup. The existing caller/job
        // deadline remains the outer bound; this is not descendant isolation.
        if (fault) reject(fault);
        else code === 0 ? resolve() : reject(new Error('WEATHER_PACK_CP_ORIGINALS_INVALID'));
      });
    });
    const inventory = await readSmallJson(output, MAX_MANIFEST_BYTES, readState);
    if (inventory.kind !== 'CP_COMPONENT_STORAGE_INVENTORY' || inventory.schemaVersion !== 1
      || inventory.bankSha256 !== bank.bankSha256 || !Array.isArray(inventory.files) || inventory.files.length > MAX_FILES) {
      fail('WEATHER_PACK_CP_INVENTORY_INVALID');
    }
    return inventory.files;
  } catch (error) {
    inventoryFailed = true;
    throw error;
  } finally {
    // Only this exact newly created private temporary directory is removed.
    // Cleanup must not replace the primary inventory/launch failure. Cleanup
    // alone still fails the pack, before its previous generation is replaced.
    if (readState.closed) {
      try { await fs.rm(temporary, { recursive: true, force: true }); }
      catch (error) { if (!inventoryFailed) throw error; }
    }
  }
}

// This is a persistence verifier, not scientific input admission. CP's own
// credential-free verifier derives references; every returned path is narrowed
// again here and every original file is hashed, never recursively swept in.
async function sourceInventory(root, conditions, {
  pythonExecutable = process.env.PYTHON ?? 'python',
  includeOperationalProgress = null,
  readState,
} = {}) {
  const marker = privateWeatherComponentMarker(conditions);
  const operationalScope = includeOperationalProgress === true
    ? 'all'
    : includeOperationalProgress === false
      ? 'none'
      : marker
        ? 'extension'
        : 'none';
  const files = [];
  const presence = {};
  const banks = {};
  for (const [key, relativePath] of Object.entries(PRIVATE_WEATHER_COMPONENT_FILES)) {
    if (!COMPONENT_FILE_KEYS.has(key)
      && (operationalScope === 'none'
        || operationalScope === 'extension' && BASE_DUPLICATE_PROGRESS_KEYS.has(key))) continue;
    // Acquisition snapshots are hashed/streamed, never parsed here. A full
    // DMI rotation can legitimately exceed the smaller parsed-bank cap.
    // The cumulative raw pack and encrypted-cache budgets remain bounded.
    const maximumBytes = key === 'copernicusBank' || key === 'dmiActive' || key === 'dmiCandidate'
      ? MAX_PACK_BYTES : MAX_JSON_BYTES;
    const source = await checkedFile(root, relativePath, { optional: true, maximumBytes });
    presence[key] = Boolean(source);
    if (!source) continue;
    const digest = await digestFile(source.absolute, readState);
    files.push({ relativePath, ...digest });
    if (key.endsWith('Bank')) banks[key] = await readSmallJson(source.absolute, maximumBytes, readState);
  }
  if (includeOperationalProgress === true) {
    for (const [key, relativePath] of Object.entries(PRIVATE_WEATHER_PROGRESS_ONLY_FILES)) {
      const source = await checkedFile(root, relativePath, {
        optional: true, maximumBytes: MAX_PACK_BYTES, includeOperationalProgress: true,
      });
      // Old authenticated snapshots must reproduce their exact old manifest.
      // Do not introduce false presence keys for absent progress-only files.
      if (!source) continue;
      presence[key] = true;
      files.push({ relativePath, ...await digestFile(source.absolute, readState) });
    }
  }
  if (banks.openMeteoBank) {
    const { bankSha256, ...body } = banks.openMeteoBank;
    if (banks.openMeteoBank.kind !== 'RAVRADAR_PRIVATE_OPEN_METEO_PART_COMPONENT_BANK'
      || !/^[0-9a-f]{64}$/.test(bankSha256) || bankSha256 !== openMeteoPartSha256(body)) fail('WEATHER_PACK_OM_BANK_HASH_INVALID');
  }
  if (marker && (marker.openMeteoBankSha256 !== null && marker.openMeteoBankSha256 !== banks.openMeteoBank?.bankSha256
    || marker.copernicusBankSha256 !== null && marker.copernicusBankSha256 !== banks.copernicusBank?.bankSha256
    || marker.selectedComponentsSha256 !== files.find(file => file.relativePath === PRIVATE_WEATHER_COMPONENT_FILES.selectedComponents)?.sha256)) {
    fail('WEATHER_PACK_REQUIRED_INPUT_MISSING_OR_CHANGED');
  }
  if (presence.copernicusProgress && !presence.copernicusBank) fail('WEATHER_PACK_CP_PROGRESS_WITHOUT_BANK');
  if (banks.copernicusBank) {
    const originals = await cpStorageInventory(root, banks.copernicusBank, pythonExecutable, readState);
    const seen = new Set();
    for (const original of originals) {
      const relativePath = `${CP_PREFIX}${original.relativePath}`;
      const expectedSha = String(original.sha256 ?? '').replace(/^sha256:/, '');
      if (!safePath(relativePath) || seen.has(relativePath) || !/^[0-9a-f]{64}$/.test(expectedSha)
        || !Number.isSafeInteger(original.bytes) || original.bytes < 1 || original.bytes > 16 * 1024 * 1024) {
        fail('WEATHER_PACK_CP_REFERENCE_INVALID');
      }
      seen.add(relativePath);
      const source = await checkedFile(root, relativePath, { maximumBytes: 16 * 1024 * 1024 });
      const digest = await digestFile(source.absolute, readState);
      if (digest.sha256 !== expectedSha || digest.bytes !== original.bytes) fail('WEATHER_PACK_CP_ORIGINAL_CHANGED');
      files.push({ relativePath, ...digest });
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'));
  if (files.length > MAX_FILES || files.reduce((total, file) => total + file.bytes, 0) > MAX_PACK_BYTES) fail('WEATHER_PACK_SIZE_LIMIT');
  return { kind: 'PRIVATE_WEATHER_COMPONENT_PACK', schemaVersion: 1, marker, presence, files };
}

export function buildPrivateWeatherComponentPack(options = {}) {
  const state = { settled: false, closed: true };
  const invocation = buildPackWithJsonReadLifetime(options, state);
  packJsonReadLifetimes.set(invocation, state);
  invocation.then(() => { state.settled = true; }, () => { state.settled = true; });
  return invocation;
}
async function buildPackWithJsonReadLifetime({
  repositoryRoot,
  outputRoot = repositoryRoot,
  conditions,
  pythonExecutable,
  includeOperationalProgress = null,
} = {}, readState) {
  const root = path.resolve(repositoryRoot);
  const packRoot = path.resolve(outputRoot);
  const manifest = await sourceInventory(root, conditions, {
    pythonExecutable,
    includeOperationalProgress,
    readState,
  });
  if (!manifest.marker && !manifest.files.length) return null;
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  const size = MAGIC.length + 4 + manifestBytes.length + manifest.files.reduce((total, file) => total + file.bytes, 0);
  if (manifestBytes.length > MAX_MANIFEST_BYTES || size > MAX_PACK_BYTES) fail('WEATHER_PACK_SIZE_LIMIT');
  const destination = path.join(packRoot, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  // A cache parent must not escape through a pre-existing symlink.
  const parent = await fs.realpath(path.dirname(destination));
  if (parent !== path.join(await fs.realpath(packRoot), '.cache')) fail('WEATHER_PACK_PARENT_INVALID');
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomUUID()}`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  let outputFd, closeAttempted = false;
  const expectedHash = crypto.createHash('sha256');
  let expectedBytes = 0;
  const writeOutput = async bytes => {
    expectedBytes += bytes.length;
    if (expectedBytes > size) fail('WEATHER_PACK_OUTPUT_SIZE_INVALID');
    expectedHash.update(bytes); // Exact own bytes before the existing write.
    await handle.writeFile(bytes);
  };
  let outputIdentity, identityAttempted = false, publicationComplete = false;
  const retainOutput = () => { readState.closed = false; retainedJsonReaders.add(handle); };
  const entry = async file => {
    try { return await fs.lstat(file, { bigint: true }); }
    catch (error) {
      if (error !== null && typeof error === 'object' && !types.isProxy(error)
        && Object.getOwnPropertyDescriptor(error, 'code')?.value === 'ENOENT') return null;
      throw error;
    }
  };
  const sameFile = (left, right) => Boolean(left && right && left.isFile() && right.isFile()
    && !left.isSymbolicLink() && !right.isSymbolicLink() && left.dev === right.dev && left.ino === right.ino
    && left.size === right.size && left.mtimeNs === right.mtimeNs);
  const rememberOutput = async () => {
    identityAttempted = true;
    try {
      outputIdentity = await handle.stat({ bigint: true });
      if (!outputIdentity.isFile()) fail('WEATHER_PACK_OUTPUT_IDENTITY_UNPROVED');
    } catch (error) { retainOutput(); throw error; }
  };
  const requireOwnStage = async () => {
    try {
      if (!sameFile(await entry(temporary), outputIdentity)) fail('WEATHER_PACK_OUTPUT_IDENTITY_UNPROVED');
    } catch (error) { retainOutput(); throw error; }
  };
  const cleanupOwnOutput = async () => {
    if (!readState.closed || publicationComplete) return;
    try {
      await requireOwnStage();
      try { await fs.unlink(temporary); } catch { /* Actual absence below decides cleanup, not this return. */ }
      if (await entry(temporary) !== null) fail('WEATHER_PACK_OUTPUT_CLEANUP_UNPROVED');
    } catch { retainOutput(); } // The caller's first raw failure remains primary.
  };
  const closeOutput = async () => {
    closeAttempted = true;
    let failure;
    try { await handle.close(); }
    catch (error) { failure = { error }; }
    let closed = false;
    try {
      const probe = await new Promise(resolve => fstat(outputFd, (error, stat) => resolve({ error, stat })));
      closed = probe.error !== null && typeof probe.error === 'object' && !types.isProxy(probe.error)
        && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
    } catch { /* Unknown output closure cannot authorize publication or cleanup. */ }
    if (!closed) {
      readState.closed = false;
      retainedJsonReaders.add(handle);
      failure ??= { error: new Error('WEATHER_PACK_BUILD_OUTPUT_CLOSE_UNPROVED') };
    }
    if (failure) throw failure.error;
  };
  const verifyOutputBytes = async () => {
    if (expectedBytes !== size || outputIdentity.size !== BigInt(expectedBytes)) fail('WEATHER_PACK_OUTPUT_SIZE_INVALID');
    let reader, readerFd, failure;
    const unchanged = async () => {
      try {
        if (!sameFile(await reader.stat({ bigint: true }), outputIdentity)) fail('WEATHER_PACK_OUTPUT_IDENTITY_UNPROVED');
        await requireOwnStage();
      } catch (error) { retainOutput(); throw error; }
    };
    try {
      await requireOwnStage();
      reader = await fs.open(temporary, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      readerFd = reader.fd; // Actual own scan descriptor before another await.
      await unchanged();
      const buffer = Buffer.allocUnsafe(256 * 1024), actualHash = crypto.createHash('sha256');
      let offset = 0;
      while (offset < expectedBytes) {
        const count = Math.min(buffer.length, expectedBytes - offset);
        const { bytesRead } = await reader.read(buffer, 0, count, offset);
        if (!Number.isSafeInteger(bytesRead) || bytesRead < 1 || bytesRead > count) fail('WEATHER_PACK_OUTPUT_READ_INCOMPLETE');
        actualHash.update(buffer.subarray(0, bytesRead)); offset += bytesRead;
      }
      await unchanged();
      if (actualHash.digest('hex') !== expectedHash.digest('hex')) fail('WEATHER_PACK_OUTPUT_BYTES_CHANGED');
    } catch (error) { failure = { error }; }
    if (reader) {
      try { await reader.close(); } catch (error) { failure ??= { error }; }
      let closed = false;
      try {
        const probe = await new Promise(resolve => fstat(readerFd, (error, stat) => resolve({ error, stat })));
        closed = probe.error !== null && typeof probe.error === 'object' && !types.isProxy(probe.error)
          && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
      } catch { /* Unknown scan closure cannot authorize publication or cleanup. */ }
      if (!closed) {
        readState.closed = false;
        retainedJsonReaders.add(reader);
        failure ??= { error: new Error('WEATHER_PACK_OUTPUT_READ_CLOSE_UNPROVED') };
      }
    }
    if (failure) throw failure.error;
  };
  try {
    outputFd = handle.fd; // Actual own wx descriptor before another await.
    const length = Buffer.alloc(4);
    length.writeUInt32BE(manifestBytes.length);
    await writeOutput(Buffer.concat([MAGIC, length, manifestBytes]));
    for (const descriptor of manifest.files) {
      const hash = crypto.createHash('sha256');
      let bytes = 0;
      for await (const chunk of readPackChunks(path.join(root, descriptor.relativePath), readState)) {
        bytes += chunk.length;
        if (bytes > descriptor.bytes) fail('WEATHER_PACK_SOURCE_CHANGED');
        hash.update(chunk);
        await writeOutput(chunk);
      }
      if (bytes !== descriptor.bytes || hash.digest('hex') !== descriptor.sha256) fail('WEATHER_PACK_SOURCE_CHANGED');
    }
    await handle.sync();
    await rememberOutput();
    await closeOutput();
    await verifyOutputBytes();
    await requireOwnStage();
    let previousDestination;
    try {
      previousDestination = await entry(destination);
      if (previousDestination && (!previousDestination.isFile() || previousDestination.isSymbolicLink())) {
        fail('WEATHER_PACK_DESTINATION_IDENTITY_UNPROVED');
      }
    } catch (error) { retainOutput(); throw error; }
    let publicationFailure;
    try { await fs.rename(temporary, destination); }
    catch (error) { publicationFailure = { error }; }
    try {
      const stage = await entry(temporary), live = await entry(destination);
      if (stage === null && sameFile(live, outputIdentity)) publicationComplete = true;
      else if (!(publicationFailure && sameFile(stage, outputIdentity)
        && (live === null && previousDestination === null || sameFile(live, previousDestination)))) {
        retainOutput();
        publicationFailure ??= { error: new Error('WEATHER_PACK_OUTPUT_PUBLICATION_UNPROVED') };
      }
    } catch (error) { retainOutput(); publicationFailure ??= { error }; }
    if (publicationFailure) throw publicationFailure.error;
  } catch (error) {
    if (!closeAttempted) {
      if (!identityAttempted) { try { await rememberOutput(); } catch { /* Keep the first raw failure. */ } }
      try { await closeOutput(); } catch { /* Preserve the first raw error. */ }
    }
    await cleanupOwnOutput();
    throw error;
  }
  return { ...PRIVATE_WEATHER_COMPONENT_PACK_FILE, sourcePath: destination };
}

export function unpackPrivateWeatherComponentPack(options = {}) {
  const state = { settled: false, closed: true };
  const invocation = unpackPackWithJsonReadLifetime(options, state);
  packJsonReadLifetimes.set(invocation, state);
  invocation.then(() => { state.settled = true; }, () => { state.settled = true; });
  return invocation;
}
async function unpackPackWithJsonReadLifetime({
  restoredRoot,
  outputRoot,
  conditions,
  pythonExecutable,
  includeOperationalProgress = null,
} = {}, readState) {
  const source = await checkedFile(restoredRoot, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  const output = path.resolve(outputRoot);
  const handle = await fs.open(source.absolute, 'r');
  let inputFd;
  let unpackFailed = false;
  let position = 0;
  const read = async bytes => {
    const buffer = Buffer.alloc(bytes);
    let offset = 0;
    while (offset < bytes) {
      const result = await handle.read(buffer, offset, bytes - offset, position);
      if (!result.bytesRead) fail('WEATHER_PACK_TRUNCATED');
      offset += result.bytesRead;
      position += result.bytesRead;
    }
    return buffer;
  };
  try {
    inputFd = handle.fd; // Own archive descriptor, captured before another await.
    await fs.mkdir(output, { mode: 0o700 }); // caller passes a new private stage
    if (!(await read(MAGIC.length)).equals(MAGIC)) fail('WEATHER_PACK_FORMAT_INVALID');
    const length = (await read(4)).readUInt32BE();
    if (length < 2 || length > MAX_MANIFEST_BYTES) fail('WEATHER_PACK_MANIFEST_SIZE_INVALID');
    let manifest;
    try { manifest = JSON.parse((await read(length)).toString('utf8')); } catch { fail('WEATHER_PACK_MANIFEST_INVALID'); }
    if (!manifest || manifest.kind !== 'PRIVATE_WEATHER_COMPONENT_PACK' || manifest.schemaVersion !== 1
      || !same(manifest.marker, privateWeatherComponentMarker(conditions)) || !Array.isArray(manifest.files)
      || manifest.files.length > MAX_FILES) fail('WEATHER_PACK_MANIFEST_INVALID');
    const seen = new Set();
    let total = position;
    for (const file of manifest.files) {
      if (!safePath(file.relativePath, includeOperationalProgress) || seen.has(file.relativePath) || !Number.isSafeInteger(file.bytes)
        || file.bytes < 1 || !/^[0-9a-f]{64}$/.test(file.sha256)) fail('WEATHER_PACK_ENTRY_INVALID');
      seen.add(file.relativePath);
      total += file.bytes;
      if (total > MAX_PACK_BYTES) fail('WEATHER_PACK_SIZE_LIMIT');
    }
    if (total !== source.bytes) fail('WEATHER_PACK_SIZE_INVALID');
    for (const file of manifest.files) {
      const destination = path.join(output, file.relativePath);
      await fs.mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
      const hash = crypto.createHash('sha256');
      const destinationHandle = await fs.open(destination, 'wx', 0o600);
      let destinationFd;
      let copyFailed = false;
      try {
        destinationFd = destinationHandle.fd; // Own output, before another await.
        for (let remaining = file.bytes; remaining > 0;) {
          const chunk = await read(Math.min(64 * 1024, remaining));
          remaining -= chunk.length;
          hash.update(chunk);
          await destinationHandle.writeFile(chunk);
        }
      } catch (error) {
        copyFailed = true;
        throw error;
      } finally {
        let closeFailure;
        try { await destinationHandle.close(); }
        catch (error) { closeFailure = { error }; }
        let closed = false;
        try {
          const probe = await new Promise(resolve => fstat(destinationFd, (error, stat) => resolve({ error, stat })));
          closed = probe.error !== null && typeof probe.error === 'object' && !types.isProxy(probe.error)
            && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
        } catch { /* Unknown output closure retains this exact invocation's work. */ }
        if (!closed) {
          readState.closed = false;
          retainedJsonReaders.add(destinationHandle);
          closeFailure ??= { error: new Error('WEATHER_PACK_OUTPUT_CLOSE_UNPROVED') };
        }
        if (!copyFailed && closeFailure) throw closeFailure.error;
      }
      if (hash.digest('hex') !== file.sha256) fail('WEATHER_PACK_ENTRY_HASH_INVALID');
    }
    const actual = await sourceInventory(output, conditions, {
      pythonExecutable,
      includeOperationalProgress,
      readState,
    });
    if (!same(actual, manifest)) fail('WEATHER_PACK_REFERENCE_INVENTORY_MISMATCH');
    return manifest.files.map(file => ({ ...file, sourcePath: path.join(output, file.relativePath) }));
  } catch (error) {
    unpackFailed = true;
    throw error;
  } finally {
    // Always attempt the owned input close, including a failed stage mkdir.
    // A close failure alone stays fatal, but must not mask the first error.
    let closeFailure;
    try { await handle.close(); }
    catch (error) { closeFailure = { error }; }
    let closed = false;
    try {
      const probe = await new Promise(resolve => fstat(inputFd, (error, stat) => resolve({ error, stat })));
      closed = probe.error !== null && typeof probe.error === 'object' && !types.isProxy(probe.error)
        && Object.getOwnPropertyDescriptor(probe.error, 'code')?.value === 'EBADF';
    } catch { /* Preserve the primary failure and the actual unknown handle. */ }
    if (!closed) {
      readState.closed = false;
      retainedJsonReaders.add(handle);
      closeFailure ??= { error: new Error('WEATHER_PACK_ARCHIVE_CLOSE_UNPROVED') };
    }
    if (!unpackFailed && closeFailure) throw closeFailure.error;
  }
}
