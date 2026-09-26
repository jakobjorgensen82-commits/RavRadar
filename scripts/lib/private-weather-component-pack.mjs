import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openMeteoPartSha256 } from './open-meteo-part-bank.mjs';
import {
  PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE, privateWeatherComponentMarker,
} from './private-weather-component-inventory.mjs';
import { PRIVATE_WEATHER_PROGRESS_ONLY_FILES } from './private-weather-progress-files.mjs';

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
async function digestFile(absolute) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of createReadStream(absolute)) {
    bytes += chunk.length;
    if (bytes > MAX_PACK_BYTES) fail('WEATHER_PACK_FILE_SIZE_INVALID');
    hash.update(chunk);
  }
  return { bytes, sha256: hash.digest('hex') };
}
async function readSmallJson(file, maximumBytes = MAX_JSON_BYTES) {
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumBytes) fail('WEATHER_PACK_JSON_SIZE_INVALID');
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { fail('WEATHER_PACK_JSON_INVALID'); }
}
async function cpStorageInventory(root, bank, pythonExecutable) {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cp-storage-inventory-'));
  try {
    const output = path.join(temporary, 'inventory.json');
    await new Promise((resolve, reject) => {
      const child = spawn(pythonExecutable, [RUNNER, '--bank', path.join(root, PRIVATE_WEATHER_COMPONENT_FILES.copernicusBank),
        '--cache-directory', path.join(root, CP_PREFIX), '--storage-inventory', output],
      { windowsHide: true, stdio: 'ignore', env: { ...process.env, PYTHONUTF8: '1' } });
      const timer = setTimeout(() => { child.kill(); reject(new Error('WEATHER_PACK_CP_INVENTORY_TIMEOUT')); }, 120_000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('WEATHER_PACK_CP_INVENTORY_UNAVAILABLE')); });
      child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('WEATHER_PACK_CP_ORIGINALS_INVALID')); });
    });
    const inventory = await readSmallJson(output, MAX_MANIFEST_BYTES);
    if (inventory.kind !== 'CP_COMPONENT_STORAGE_INVENTORY' || inventory.schemaVersion !== 1
      || inventory.bankSha256 !== bank.bankSha256 || !Array.isArray(inventory.files) || inventory.files.length > MAX_FILES) {
      fail('WEATHER_PACK_CP_INVENTORY_INVALID');
    }
    return inventory.files;
  } finally {
    // Only this exact newly created private temporary directory is removed.
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

// This is a persistence verifier, not scientific input admission. CP's own
// credential-free verifier derives references; every returned path is narrowed
// again here and every original file is hashed, never recursively swept in.
async function sourceInventory(root, conditions, {
  pythonExecutable = process.env.PYTHON ?? 'python',
  includeOperationalProgress = null,
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
    const maximumBytes = key === 'copernicusBank' ? MAX_PACK_BYTES : MAX_JSON_BYTES;
    const source = await checkedFile(root, relativePath, { optional: true, maximumBytes });
    presence[key] = Boolean(source);
    if (!source) continue;
    const digest = await digestFile(source.absolute);
    files.push({ relativePath, ...digest });
    if (key.endsWith('Bank')) banks[key] = await readSmallJson(source.absolute, maximumBytes);
  }
  if (includeOperationalProgress === true) {
    for (const [key, relativePath] of Object.entries(PRIVATE_WEATHER_PROGRESS_ONLY_FILES)) {
      const source = await checkedFile(root, relativePath, {
        optional: true, maximumBytes: MAX_JSON_BYTES, includeOperationalProgress: true,
      });
      // Old authenticated snapshots must reproduce their exact old manifest.
      // Do not introduce false presence keys for absent progress-only files.
      if (!source) continue;
      presence[key] = true;
      files.push({ relativePath, ...await digestFile(source.absolute) });
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
    const originals = await cpStorageInventory(root, banks.copernicusBank, pythonExecutable);
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
      const digest = await digestFile(source.absolute);
      if (digest.sha256 !== expectedSha || digest.bytes !== original.bytes) fail('WEATHER_PACK_CP_ORIGINAL_CHANGED');
      files.push({ relativePath, ...digest });
    }
  }
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, 'en'));
  if (files.length > MAX_FILES || files.reduce((total, file) => total + file.bytes, 0) > MAX_PACK_BYTES) fail('WEATHER_PACK_SIZE_LIMIT');
  return { kind: 'PRIVATE_WEATHER_COMPONENT_PACK', schemaVersion: 1, marker, presence, files };
}

export async function buildPrivateWeatherComponentPack({
  repositoryRoot,
  outputRoot = repositoryRoot,
  conditions,
  pythonExecutable,
  includeOperationalProgress = null,
} = {}) {
  const root = path.resolve(repositoryRoot);
  const packRoot = path.resolve(outputRoot);
  const manifest = await sourceInventory(root, conditions, {
    pythonExecutable,
    includeOperationalProgress,
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
  try {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(manifestBytes.length);
    await handle.writeFile(Buffer.concat([MAGIC, length, manifestBytes]));
    for (const descriptor of manifest.files) {
      const hash = crypto.createHash('sha256');
      let bytes = 0;
      for await (const chunk of createReadStream(path.join(root, descriptor.relativePath))) {
        bytes += chunk.length;
        if (bytes > descriptor.bytes) fail('WEATHER_PACK_SOURCE_CHANGED');
        hash.update(chunk);
        await handle.writeFile(chunk);
      }
      if (bytes !== descriptor.bytes || hash.digest('hex') !== descriptor.sha256) fail('WEATHER_PACK_SOURCE_CHANGED');
    }
    await handle.sync();
    await handle.close();
    await fs.rename(temporary, destination);
  } catch (error) {
    await handle.close().catch(() => {});
    await fs.unlink(temporary).catch(() => {});
    throw error;
  }
  return { ...PRIVATE_WEATHER_COMPONENT_PACK_FILE, sourcePath: destination };
}

export async function unpackPrivateWeatherComponentPack({
  restoredRoot,
  outputRoot,
  conditions,
  pythonExecutable,
  includeOperationalProgress = null,
} = {}) {
  const source = await checkedFile(restoredRoot, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
  const handle = await fs.open(source.absolute, 'r');
  const output = path.resolve(outputRoot);
  await fs.mkdir(output, { mode: 0o700 }); // caller passes a new private stage
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
      const destinationHandle = await fs.open(destination, 'wx', 0o600);
      const hash = crypto.createHash('sha256');
      try {
        for (let remaining = file.bytes; remaining > 0;) {
          const chunk = await read(Math.min(64 * 1024, remaining));
          remaining -= chunk.length;
          hash.update(chunk);
          await destinationHandle.writeFile(chunk);
        }
      } finally { await destinationHandle.close(); }
      if (hash.digest('hex') !== file.sha256) fail('WEATHER_PACK_ENTRY_HASH_INVALID');
    }
    const actual = await sourceInventory(output, conditions, {
      pythonExecutable,
      includeOperationalProgress,
    });
    if (!same(actual, manifest)) fail('WEATHER_PACK_REFERENCE_INVENTORY_MISMATCH');
    return manifest.files.map(file => ({ ...file, sourcePath: path.join(output, file.relativePath) }));
  } finally { await handle.close(); }
}
