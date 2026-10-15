#!/usr/bin/env node
// Optional, encrypted acquisition progress only. Never production/state authority.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
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
import { buildPrivateWeatherComponentPack, unpackPrivateWeatherComponentPack, privateWeatherPackJsonReadsClosed } from './lib/private-weather-component-pack.mjs';
import { PRIVATE_WEATHER_COMPONENT_FILES, PRIVATE_WEATHER_COMPONENT_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { mergeVerifiedProtectedProgressComponents, protectedProgressUnionFailureCode, protectedProgressPackJsonReadsClosed } from './lib/verified-protected-progress-components.mjs';

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
async function temporaryRoot() {
  const parent = await fs.realpath(os.tmpdir());
  const folder = await fs.mkdtemp(path.join(parent, 'rr-encrypted-progress-'));
  return { folder, async cleanup() {
    const resolved = path.resolve(folder);
    if (path.dirname(resolved) !== parent || !path.basename(resolved).startsWith('rr-encrypted-progress-')) fail('CLEANUP_PATH_INVALID');
    await fs.rm(resolved, { recursive: true, force: true });
  } };
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

// The callback can inspect authenticated, allowlisted private inputs only for
// its awaited lifetime. This boundary never merges, installs or saves them.
// Audit-only entry point; the existing normal restore path is intentionally unchanged.
export async function withAuthenticatedWeatherProgress({
  repositoryRoot = process.cwd(), basePath,
  repository = process.env.GITHUB_REPOSITORY,
  encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET,
  pythonExecutable,
  // Optional callers may tighten the production limits, never widen them.
  maximumEncryptedBytes = MAX_CIPHER_BYTES, maximumPackBytes = MAX_PACK_BYTES,
} = {}, inspect) {
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
    if (typeof basePath !== 'string' || !basePath) fail('BASE_INVALID');
    const baselineFile = path.resolve(basePath);
    if (baselineFile === path.join(root, WEATHER_PROGRESS_CIPHER_PATH)) fail('BASE_INVALID');
    const key = keyBytes(encryptionKey, { masterSecret, repository });
    const base = await readBase(baselineFile, repository);
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const checkedCipher = await checkedPath(root, WEATHER_PROGRESS_CIPHER_PATH,
      { optional: true, maximum: maximumEncryptedBytes });
    if (!checkedCipher) fail('SNAPSHOT_ABSENT');
    const handle = await fs.open(checkedCipher, 'r');
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
      await pipeline(createReadStream(checkedCipher, { start, end }), boundedStream(maximumEncryptedBytes),
        decipher, boundedStream(maximumEncryptedBytes), createWriteStream(compressed, { flags: 'wx', mode: 0o600 }));
    } catch { fail('SNAPSHOT_AUTHENTICATION_FAILED'); }
    const packPath = path.join(temporary.folder, PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath);
    await fs.mkdir(path.dirname(packPath), { recursive: true, mode: 0o700 });
    await pipeline(createReadStream(compressed), createGunzip(), boundedStream(maximumPackBytes),
      createWriteStream(packPath, { flags: 'wx', mode: 0o600 }));
    const verifiedRoot = path.join(temporary.folder, 'verified');
    packInvocation = unpackPrivateWeatherComponentPack({ restoredRoot: temporary.folder,
      outputRoot: verifiedRoot, conditions: {}, pythonExecutable, includeOperationalProgress: true });
    const files = await packInvocation;
    // Reconfirm after the potentially slower CP-original validation and again
    // after the consumer. Private paths/content must never enter a public log.
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const result = await inspect({ root, files, verifiedRoot, temporaryDirectory: temporary.folder,
      baselineSha256: base.baselineSha256,
      protectedBundleContentSha256: base.protectedBundleContentSha256,
      capacity: Object.freeze({ encryptedBytes, compressedBytes: (await fs.stat(compressed)).size,
        rawPackBytes: (await fs.stat(packPath)).size, fileCount: files.length }) });
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    return result;
  } finally {
    if (temporary && (packInvocation === null || privateWeatherPackJsonReadsClosed(packInvocation))) {
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

async function selectOriginalProgressTarget({ root, files, verifiedRoot, temporaryDirectory, baselineSha256,
  productionReferenceAt,
  pythonExecutable = process.env.PYTHON ?? 'python' }) {
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
  // The owned stage stays alive until the real child close event. No new
  // registry/ledger replaces an original, and nothing has been installed.
  const selection = { report, candidatePath, registryPath, root };
  await assertOriginalProgressInputs(selection);
  report.selectionSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
  return selection;
}

export async function weatherComponentProgressCache({
  mode, repositoryRoot = process.cwd(), basePath,
  protectedBundleSha256,
  repository = process.env.GITHUB_REPOSITORY,
  encryptionKey = process.env.WEATHER_PROGRESS_ENCRYPTION_KEY,
  masterSecret = process.env.WEATHER_PROGRESS_MASTER_SECRET,
  productionReferenceAt = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR,
  resumeOriginalTarget = false,
  pythonExecutable, renameImpl, rollbackRenameImpl,
  maximumEncryptedBytes = MAX_CIPHER_BYTES,
} = {}) {
  let temporary = null;
  let packInvocation = null;
  let unionInvocation = null;
  let cipherTemporary = null;
  let restoreInstalled = false;
  try {
    if (!['capture-base', 'save', 'restore'].includes(mode)) fail('MODE_INVALID');
    if (typeof resumeOriginalTarget !== 'boolean' || (resumeOriginalTarget && mode !== 'restore')) fail('ARGUMENT_INVALID');
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
    const files = await packInvocation;
    // Reconfirm after the potentially slower CP-original validation.
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    const originalTarget = resumeOriginalTarget ? await selectOriginalProgressTarget({
      root, files, verifiedRoot: path.join(temporary.folder, 'verified'),
      temporaryDirectory: temporary.folder, baselineSha256: base.baselineSha256,
      productionReferenceAt, pythonExecutable,
    }) : null;
    let reconciled;
    try {
      unionInvocation = mergeVerifiedProtectedProgressComponents({
        root, progressFiles: files, progressVerifiedRoot: path.join(temporary.folder, 'verified'),
        temporaryDirectory: temporary.folder,
        productionReferenceAt, pythonExecutable,
      });
      reconciled = await unionInvocation;
    } catch (error) {
      return status('RESTORE_REPAIR_REQUIRED', 'PROTECTED_PROGRESS_UNION_FAILED', {
        requiresProtectedRestore: true, unionFailureCode: protectedProgressUnionFailureCode(error),
      });
    }
    if (await conditionsDigest(root) !== base.baselineSha256) fail('BASELINE_MISMATCH');
    if (originalTarget) await assertOriginalProgressInputs(originalTarget);
    await installComponents(root, reconciled.files, { renameImpl, rollbackRenameImpl });
    restoreInstalled = true;
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
    if (temporary && (packInvocation === null || privateWeatherPackJsonReadsClosed(packInvocation))
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
