'use strict';

// Fixed raw SAVE, ciphertext upload and distribution operations only; never a
// caller-selected path/command runner. Each needs its own actual cohort closure.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { findPackageJSON } = require('node:module');
const { pathToFileURL } = require('node:url');
const { types } = require('node:util');
const ROOT = path.resolve(__dirname, '../../..');
const CACHE_PATH = '.cache/dmi-grib';
const CIPHER_PATH = '.cache/weather-private-progress.encrypted';
const MAX_CIPHER_BYTES = 384 * 1024 * 1024; // Same existing local SAVE/RESTORE cap.
const API_VERSION = '6.1.0';
const MAX_RECEIPT_BYTES = 4096;
const LOCK_SHA256 = '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5';

function refused(code) { return new Error(code); }

function fixedInputs() {
  const env = process.env;
  const key = env.INPUT_KEY;
  if (process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24'
      || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME === 'pull_request_target'
      || env.RUNNER_OS !== 'Linux' || env.INPUT_PATH !== CACHE_PATH
      || typeof key !== 'string' || key.length > 512
      || !/^dmi-grib-v4-Linux-[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])-[1-9][0-9]*-[1-9][0-9]*$/.test(key)
      || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || '')
      || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT || '')
      || !key.endsWith(`-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`)) {
    throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
  }
  // The official selector must already select v2. Do not manufacture runtime
  // credentials or force a different service mode to obtain a positive receipt.
  let github;
  try { github = new URL(env.GITHUB_SERVER_URL || 'https://github.com'); } catch {}
  if (!github || github.origin !== 'https://github.com' || github.username || github.password
      || !env.ACTIONS_CACHE_SERVICE_V2) throw refused('DMI_RAW_SAVE_V2_REQUIRED');
  return { key, path: CACHE_PATH };
}

function fixedDistributionInputs() {
  if (process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24'
      || process.env.GITHUB_REF !== 'refs/heads/main'
      || process.env.GITHUB_EVENT_NAME === 'pull_request_target'
      || process.env.RUNNER_OS !== 'Linux'
      || process.env.GITHUB_SERVER_URL !== 'https://github.com') {
    throw refused('DMI_RAW_DISTRIBUTION_INPUT_REFUSED');
  }
  return null;
}

function fixedCipherInputs() {
  fixedDistributionInputs();
  const env = process.env;
  if (env.INPUT_OPERATION !== 'upload-encrypted-progress' || (env.INPUT_PATH || '') !== ''
      || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || '')
      || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT || '')
      || env.INPUT_KEY !== `weather-private-progress-encrypted-v2-Linux-main-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`
      || !env.ACTIONS_CACHE_SERVICE_V2) {
    throw refused('WEATHER_CIPHER_UPLOAD_INPUT_REFUSED');
  }
  return { key: env.INPUT_KEY, path: CIPHER_PATH };
}

function assertFixedWorkerParent() {
  // Internal modes are fixed cohort workers, never unowned normal entrypoints.
  // This is process provenance, not a serialized claim token.
  const ipc = fs.fstatSync(3);
  const parentCommand = fs.readFileSync(`/proc/${process.ppid}/cmdline`);
  if ((!ipc.isFIFO() && !ipc.isSocket()) || parentCommand.length > 16384
      || !parentCommand.toString('utf8').split('\0').includes(path.join(ROOT, 'scripts/run-owned-dmi-grib-save.py'))) {
    throw refused('DMI_RAW_SAVE_WORKER_PARENT_UNPROVED');
  }
}

function assertDistributionLock() {
  const action = path.join(ROOT, '.github/actions/save-owned-dmi-grib');
  for (const [name, expected] of [
    ['package.json', '111ef6137410cce15e90ddfea3fbbb70b04285a2e0c1fc04cb221c04cc3b61d8'],
    ['package-lock.json', LOCK_SHA256],
  ]) {
    const text = fs.readFileSync(path.join(action, name), 'utf8').replace(/\r\n/g, '\n');
    if (text.includes('\r') || crypto.createHash('sha256').update(text).digest('hex') !== expected) {
      throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
    }
  }
  return action;
}

function createDistributionConfigFiles(action, npmCache) {
  const identity = value => ({ dev: value.dev, ino: value.ino });
  const same = (left, right) => left.dev === right.dev && left.ino === right.ino;
  const directory = file => {
    const entry = fs.lstatSync(file, { bigint: true });
    if (!entry.isDirectory() || entry.isSymbolicLink() || fs.realpathSync(file) !== file) {
      throw refused('DMI_RAW_DISTRIBUTION_CONFIG_ROOT_REFUSED');
    }
    return identity(entry);
  };
  const actionIdentity = directory(action);
  try { fs.mkdirSync(npmCache, { mode: 0o700 }); }
  catch (error) { if (error?.code !== 'EEXIST') throw error; }
  const cacheIdentity = directory(npmCache);
  const assertRoots = () => {
    if (!same(directory(action), actionIdentity) || !same(directory(npmCache), cacheIdentity)) {
      throw refused('DMI_RAW_DISTRIBUTION_CONFIG_ROOT_CHANGED');
    }
  };
  const rows = [];
  for (const name of ['.ravradar-user.npmrc', '.ravradar-global.npmrc']) {
    assertRoots();
    const file = path.join(npmCache, name);
    let fd;
    let entry;
    let first;
    try {
      fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT
        | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o400);
      entry = fs.fstatSync(fd, { bigint: true });
      if (!entry.isFile() || entry.size !== 0n || entry.nlink !== 1n) {
        throw refused('DMI_RAW_DISTRIBUTION_CONFIG_REFUSED');
      }
    } catch (error) { first = { error }; }
    finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
          try { fs.fstatSync(fd); throw refused('DMI_RAW_DISTRIBUTION_CONFIG_CLOSE_UNPROVED'); }
          catch (error) {
            if (!Object.hasOwn(error ?? {}, 'code') || error.code !== 'EBADF') throw error;
          }
        } catch (error) { first ??= { error }; }
      }
    }
    if (first) throw first.error;
    rows.push({ file, entry });
  }
  if (same(rows[0].entry, rows[1].entry)) throw refused('DMI_RAW_DISTRIBUTION_CONFIG_REFUSED');
  const assertFile = ({ file, entry }) => {
    const current = fs.lstatSync(file, { bigint: true });
    if (!current.isFile() || current.isSymbolicLink() || !same(current, entry)
        || current.size !== 0n || current.nlink !== 1n || current.mode !== entry.mode
        || current.mtimeNs !== entry.mtimeNs || current.ctimeNs !== entry.ctimeNs) {
      throw refused('DMI_RAW_DISTRIBUTION_CONFIG_CHANGED');
    }
  };
  const assertFiles = () => {
    assertRoots();
    for (const row of rows) assertFile(row);
  };
  assertFiles();
  return { user: rows[0].file, global: rows[1].file, assertFiles,
    removeAfterInstallerClose() {
      assertFiles();
      for (const row of rows) {
        assertRoots();
        assertFile(row);
        const { file } = row;
        fs.unlinkSync(file);
        try { fs.lstatSync(file); throw refused('DMI_RAW_DISTRIBUTION_CONFIG_CLEANUP_UNPROVED'); }
        catch (error) { if (error?.code !== 'ENOENT') throw error; }
      }
    },
  };
}

async function runDistributionWorker() {
  fixedDistributionInputs();
  assertFixedWorkerParent();
  const action = assertDistributionLock();
  const actionIdentity = fs.statSync(action);
  if (fs.realpathSync(action) !== action) throw refused('DMI_RAW_DISTRIBUTION_ROOT_REFUSED');
  const npmCache = path.join(action, '.npm-cache');
  for (const directory of [path.join(action, 'node_modules'), npmCache]) {
    try {
      const entry = fs.lstatSync(directory);
      if (!entry.isDirectory() || entry.isSymbolicLink() || fs.realpathSync(directory) !== directory) {
        throw refused('DMI_RAW_DISTRIBUTION_PATH_REFUSED');
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  try {
    fs.lstatSync(path.join(action, '.npmrc'));
    throw refused('DMI_RAW_DISTRIBUTION_CONFIG_REFUSED');
  } catch (error) { if (error?.code !== 'ENOENT') throw error; }
  // The normal setup-node selection supplies this actual Node24 distribution.
  // Never guess an Actions runner bundle, or execute a caller-supplied command.
  const runtimePrefix = fs.realpathSync(path.resolve(path.dirname(process.execPath), '..'));
  const npmCli = fs.realpathSync(path.join(path.dirname(process.execPath), 'npm'));
  const npmRelative = path.relative(runtimePrefix, npmCli);
  if (npmRelative.startsWith('..') || path.isAbsolute(npmRelative)
      || path.basename(npmCli) !== 'npm-cli.js'
      || path.basename(path.dirname(npmCli)) !== 'bin'
      || path.basename(path.dirname(path.dirname(npmCli))) !== 'npm'
      || JSON.parse(fs.readFileSync(path.join(path.dirname(npmCli), '../package.json'), 'utf8')).name !== 'npm') {
    throw refused('DMI_RAW_DISTRIBUTION_NPM_REFUSED');
  }
  const npmEnvironment = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    ['PATH', 'HOME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'RUNNER_TRACKING_ID'].includes(name)));
  npmEnvironment.npm_config_cache = npmCache;
  const configs = createDistributionConfigFiles(action, npmCache);
  npmEnvironment.npm_config_userconfig = configs.user;
  npmEnvironment.npm_config_globalconfig = configs.global;
  // The existing npm offline setting may restrict transport, never qualify
  // completion. This permits a genuine locked-cache source-CI fixture.
  if (process.env.npm_config_offline === 'true' || process.env.NPM_CONFIG_OFFLINE === 'true') {
    npmEnvironment.npm_config_offline = 'true';
  }
  let installerClosed = false;
  let first;
  try {
    configs.assertFiles();
    const installer = spawn(process.execPath,
      [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'],
      { cwd: action, env: npmEnvironment, shell: false, stdio: 'ignore' });
    const exit = await new Promise(resolve => {
      installer.once('error', error => { first ??= { error }; });
      installer.once('close', (code, signal) => {
        installerClosed = true;
        resolve({ code, signal });
      });
    });
    if (first) throw first.error;
    configs.assertFiles();
    if (exit.code !== 0 || exit.signal !== null) throw refused('DMI_RAW_DISTRIBUTION_INSTALL_FAILED');
  } catch (error) { first ??= { error }; }
  finally {
    if (installerClosed) {
      try { configs.removeAfterInstallerClose(); }
      catch (error) { first ??= { error }; }
    }
  }
  if (first) throw first.error;
  assertDistributionLock();
  const afterAction = fs.statSync(action);
  if (fs.realpathSync(action) !== action || afterAction.dev !== actionIdentity.dev
      || afterAction.ino !== actionIdentity.ino) throw refused('DMI_RAW_DISTRIBUTION_ROOT_CHANGED');
  const packageFile = findPackageJSON('@actions/cache', pathToFileURL(__filename));
  if (!packageFile || fs.realpathSync(packageFile)
      !== fs.realpathSync(path.join(action, 'node_modules/@actions/cache/package.json'))) {
    throw refused('DMI_RAW_DISTRIBUTION_RESOLUTION_REFUSED');
  }
  const metadata = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
  if (metadata.name !== '@actions/cache' || metadata.version !== API_VERSION
      || metadata.type !== 'module' || metadata.exports?.['.']?.import !== './lib/cache.js'
      || metadata.exports?.['.']?.require !== undefined) {
    throw refused('DMI_RAW_DISTRIBUTION_API_REFUSED');
  }
  fs.writeSync(3, JSON.stringify({ schemaVersion: 1, kind: 'DMI_RAW_DISTRIBUTION_READY',
    apiVersion: API_VERSION, lockSha256: LOCK_SHA256 }));
  // Worker completion/this IPC alone is not physical closure or SAVE.
}

async function runApiWorker() {
  const input = fixedInputs();
  assertFixedWorkerParent();
  assertDistributionLock(); // Fresh check; an earlier prepare receipt is not admission.
  process.chdir(ROOT);
  // Official 6.1.0 is import-only ESM. Its package.json is not an exported
  // subpath; resolve that metadata through Node24's normal package resolver.
  const packageFile = findPackageJSON('@actions/cache', pathToFileURL(__filename));
  if (!packageFile || JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== API_VERSION) {
    throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  }
  const cache = await import('@actions/cache');
  if (typeof cache.isFeatureAvailable !== 'function'
      || typeof cache.saveCache !== 'function' || !cache.isFeatureAvailable()) {
    throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  }
  // Same default options/cross-OS behavior as the existing save action. Only
  // the reviewed v2 API's returned positive ID is a finalization candidate.
  const cacheId = await cache.saveCache([CACHE_PATH], input.key, undefined, false);
  if (!Number.isSafeInteger(cacheId) || cacheId <= 0) {
    throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
  }
  fs.writeSync(3, JSON.stringify({ schemaVersion: 1, kind: 'DMI_RAW_SAVE_V2_FINALIZED',
    apiVersion: API_VERSION, path: input.path, key: input.key, cacheId }));
  // This private IPC is NOT physical closure and is never a workflow output.
}

async function runCipherApiWorker() {
  const input = fixedCipherInputs();
  assertFixedWorkerParent();
  assertDistributionLock();
  process.chdir(ROOT);
  const packageFile = findPackageJSON('@actions/cache', pathToFileURL(__filename));
  if (!packageFile || JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== API_VERSION) {
    throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  }
  const cache = await import('@actions/cache');
  if (typeof cache.isFeatureAvailable !== 'function'
      || typeof cache.saveCache !== 'function' || !cache.isFeatureAvailable()) {
    throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  }
  // This is byte selection for the existing successful seal caller, not GCM
  // authentication, a seal-report binding, or proof that other writers stopped.
  const absolute = path.join(ROOT, CIPHER_PATH);
  const parents = [ROOT, path.join(ROOT, '.cache')].map(directory => {
    const stat = fs.lstatSync(directory, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(directory) !== directory) {
      throw refused('WEATHER_CIPHER_UPLOAD_PATH_REFUSED');
    }
    return { directory, dev: stat.dev, ino: stat.ino };
  });
  const same = (a, b) => a.isFile() && b.isFile() && !a.isSymbolicLink() && !b.isSymbolicLink()
    && a.dev === b.dev && a.ino === b.ino && a.size === b.size
    && a.mtimeNs === b.mtimeNs && a.ctimeNs === b.ctimeNs;
  const original = fs.lstatSync(absolute, { bigint: true });
  if (!original.isFile() || original.isSymbolicLink()
      || original.size <= 0n || original.size > BigInt(MAX_CIPHER_BYTES)) {
    throw refused('WEATHER_CIPHER_UPLOAD_FILE_REFUSED');
  }
  const fd = fs.openSync(absolute, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  let first = null;
  let receipt;
  try {
    const assertIdentity = () => {
      for (const expected of parents) {
        const actual = fs.lstatSync(expected.directory, { bigint: true });
        if (!actual.isDirectory() || actual.isSymbolicLink()
            || actual.dev !== expected.dev || actual.ino !== expected.ino
            || fs.realpathSync(expected.directory) !== expected.directory) {
          throw refused('WEATHER_CIPHER_UPLOAD_PATH_CHANGED');
        }
      }
      if (!same(original, fs.fstatSync(fd, { bigint: true }))
          || !same(original, fs.lstatSync(absolute, { bigint: true }))) {
        throw refused('WEATHER_CIPHER_UPLOAD_FILE_CHANGED');
      }
    };
    const digest = () => {
      assertIdentity();
      const hash = crypto.createHash('sha256');
      const buffer = Buffer.alloc(256 * 1024);
      let position = 0;
      while (position < Number(original.size)) {
        const requested = Math.min(buffer.length, Number(original.size) - position);
        const count = fs.readSync(fd, buffer, 0, requested, position);
        if (!Number.isInteger(count) || count <= 0 || count > requested) {
          throw refused('WEATHER_CIPHER_UPLOAD_READ_FAILED');
        }
        hash.update(buffer.subarray(0, count));
        position += count;
      }
      assertIdentity();
      return hash.digest('hex');
    };
    const sha256 = digest();
    const cacheId = await cache.saveCache([CIPHER_PATH], input.key, undefined, false);
    if (!Number.isSafeInteger(cacheId) || cacheId <= 0) throw refused('WEATHER_CIPHER_UPLOAD_NOT_FINALIZED');
    if (digest() !== sha256) throw refused('WEATHER_CIPHER_UPLOAD_FILE_CHANGED');
    receipt = { schemaVersion: 1, kind: 'WEATHER_CIPHER_V2_FINALIZED',
      apiVersion: API_VERSION, path: input.path, key: input.key, cacheId,
      bytes: Number(original.size), sha256 };
  } catch (error) { first = { error }; }
  // Exactly one close of the actual owned descriptor. If this cannot qualify,
  // emit no API receipt; the parent still requires actual process/group closure
  // before releasing its lease, so even a failed worker cannot authorize SAVE.
  try { fs.closeSync(fd); } catch (error) { first ??= { error }; }
  let closed = false;
  try { fs.fstatSync(fd); }
  catch (error) {
    if (error !== null && typeof error === 'object' && !types.isProxy(error)) {
      const code = Object.getOwnPropertyDescriptor(error, 'code');
      closed = !!code && Object.hasOwn(code, 'value') && code.value === 'EBADF';
    }
    if (!closed) first ??= { error };
  }
  if (!closed) first ??= { error: refused('WEATHER_CIPHER_UPLOAD_CLOSE_UNPROVED') };
  if (first !== null) throw first.error;
  fs.writeSync(3, JSON.stringify(receipt));
}

function collectReceipt(stream) {
  const chunks = [];
  let size = 0;
  let failure;
  let ended = false;
  stream.on('data', chunk => {
    size += chunk.length;
    if (size > MAX_RECEIPT_BYTES) failure ||= refused('DMI_RAW_SAVE_RECEIPT_BOUND');
    else chunks.push(Buffer.from(chunk));
  });
  stream.on('error', () => { failure ||= refused('DMI_RAW_SAVE_PIPE_FAILED'); });
  stream.on('end', () => { ended = true; });
  return () => {
    if (failure) throw failure;
    if (!ended) throw refused('DMI_RAW_SAVE_PIPE_NOT_CLOSED');
    return Buffer.concat(chunks).toString('utf8');
  };
}

function parseReceipt(text) {
  try {
    const value = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  throw refused('DMI_RAW_SAVE_RECEIPT_INVALID');
}

async function runOwnedOperation(operation) {
  const input = operation === 'save' ? fixedInputs()
    : operation === 'cipher' ? fixedCipherInputs() : fixedDistributionInputs();
  const owner = require('../../../scripts/lib/weather-acquisition-writer.mjs');
  let lease;
  let child;
  let physicalClosed = false;
  let firstFailure = null;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    // Request only. The Python owner must still prove its entire group absent.
    try { child?.kill('SIGTERM'); } catch {}
  };
  process.on('SIGTERM', interrupt);
  process.on('SIGINT', interrupt);
  try {
    lease = await owner.acquireWeatherAcquisitionWriter();
    await owner.assertWeatherAcquisitionWriter(lease);
    if (interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
    child = spawn('python3', ['-B', path.join(ROOT, 'scripts/run-owned-dmi-grib-save.py'),
      ...(operation === 'distribution' ? ['--prepare-distribution']
        : operation === 'cipher' ? ['--upload-encrypted-progress'] : [])], {
      cwd: ROOT, env: process.env, shell: false,
      stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
    });
    const closureText = collectReceipt(child.stdout);
    const errorText = collectReceipt(child.stderr);
    const apiText = collectReceipt(child.stdio[3]);
    const exit = await new Promise((resolve, reject) => {
      child.once('error', () => reject(refused('DMI_RAW_SAVE_CHILD_FAILED')));
      child.once('close', (code, signal) => resolve({ code, signal }));
    });
    // Drain all own pipes; never relay raw provider/library output or credentials.
    const closure = parseReceipt(closureText());
    errorText();
    if (exit.signal !== null || exit.code !== 0
        || closure.schemaVersion !== 1 || closure.kind !== 'DMI_RAW_SAVE_COHORT_CLOSED'
        || !Number.isInteger(closure.workerExitCode) || typeof closure.interrupted !== 'boolean') {
      throw refused('DMI_RAW_SAVE_COHORT_UNPROVED');
    }
    physicalClosed = true;
    if (interrupted || closure.interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
    if (closure.workerExitCode !== 0) throw refused('DMI_RAW_SAVE_API_FAILED');
    const receipt = parseReceipt(apiText());
    if (operation === 'distribution') {
      if (receipt.schemaVersion !== 1 || receipt.kind !== 'DMI_RAW_DISTRIBUTION_READY'
          || receipt.apiVersion !== API_VERSION || receipt.lockSha256 !== LOCK_SHA256) {
        throw refused('DMI_RAW_DISTRIBUTION_NOT_READY');
      }
    } else if (operation === 'cipher') {
      if (receipt.schemaVersion !== 1 || receipt.kind !== 'WEATHER_CIPHER_V2_FINALIZED'
          || receipt.apiVersion !== API_VERSION || receipt.path !== CIPHER_PATH
          || receipt.key !== input.key || !Number.isSafeInteger(receipt.cacheId) || receipt.cacheId <= 0
          || !Number.isSafeInteger(receipt.bytes) || receipt.bytes <= 0 || receipt.bytes > MAX_CIPHER_BYTES
          || typeof receipt.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(receipt.sha256)) {
        throw refused('WEATHER_CIPHER_UPLOAD_NOT_FINALIZED');
      }
    } else if (receipt.schemaVersion !== 1 || receipt.kind !== 'DMI_RAW_SAVE_V2_FINALIZED'
        || receipt.apiVersion !== API_VERSION || receipt.path !== input.path
        || receipt.key !== input.key || !Number.isSafeInteger(receipt.cacheId) || receipt.cacheId <= 0) {
      throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
    }
    await owner.assertWeatherAcquisitionWriter(lease);
  } catch (error) {
    firstFailure = { value: error };
  } finally {
    if (lease) {
      if (child && !physicalClosed) {
        try { owner.retainWeatherAcquisitionWriter(lease); }
        catch (error) { firstFailure ??= { value: error }; }
      }
      else {
        try { await owner.releaseWeatherAcquisitionWriter(lease); }
        catch (error) { firstFailure ??= { value: error }; }
      }
    }
    process.removeListener('SIGTERM', interrupt);
    process.removeListener('SIGINT', interrupt);
  }
  if (firstFailure !== null) throw firstFailure.value;
  if (interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
  if (operation === 'distribution') {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'distribution_ready=true\n');
    return { distributionReady: true };
  }
  if (operation === 'cipher') {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'uploaded=true\n');
    return { uploaded: true };
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'saved=true\n');
  return { saved: true };
}

async function runOwnedSave() { return runOwnedOperation('save'); }
async function runOwnedDistribution() { return runOwnedOperation('distribution'); }
async function runOwnedCipherUpload() { return runOwnedOperation('cipher'); }
module.exports = { runApiWorker, runOwnedSave, runOwnedDistribution };
if (require.main === module) {
  const selectedSave = process.env.INPUT_OPERATION === 'upload-encrypted-progress' ? runOwnedCipherUpload
    : !process.env.INPUT_OPERATION || process.env.INPUT_OPERATION === 'save' ? runOwnedSave : null;
  const operation = process.argv.length === 2 ? selectedSave
    : process.argv.length === 3 && process.argv[2] === '--fixed-api-worker' ? runApiWorker
    : process.argv.length === 3 && process.argv[2] === '--fixed-cipher-worker' ? runCipherApiWorker
    : process.argv.length === 3 && process.argv[2] === '--prepare-distribution' ? runOwnedDistribution
    : process.argv.length === 3 && process.argv[2] === '--fixed-distribution-worker' ? runDistributionWorker : null;
  Promise.resolve().then(() => {
    if (!operation) throw refused('DMI_RAW_SAVE_ARGUMENT_REFUSED');
    return operation();
  }).catch(() => {
    process.stderr.write('DMI_RAW_SAVE_REFUSED\n');
    process.exitCode = 1;
  });
}
