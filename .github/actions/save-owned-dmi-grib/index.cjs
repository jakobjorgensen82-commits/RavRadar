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
const TERMINAL_CIPHER_BUDGET_MS = 240_000;
const TERMINAL_CIPHER_STOP_RESERVE_MS = 2_000;
const API_VERSION = '6.1.0';
const MAX_RECEIPT_BYTES = 4096;
const LOCK_SHA256 = '9bd935a0c94f605ab28b4cc1ea543173bb06e213ba779e6e9855e31a4dd6a9a5';

function refused(code) { return new Error(code); }

// CLI-local observation only: never an input, owner, closure or SAVE receipt.
let cliPhase = 'UNKNOWN';
const REFUSAL_REASONS = new Set([
  'DMI_RAW_SAVE_INPUT_REFUSED', 'DMI_RAW_SAVE_V2_REQUIRED', 'DMI_RAW_SAVE_ARGUMENT_REFUSED',
  'DMI_RAW_SAVE_ARCHIVE_LIMIT_REFUSED',
  'DMI_RAW_DISTRIBUTION_INPUT_REFUSED', 'WEATHER_CIPHER_UPLOAD_INPUT_REFUSED',
  'WEATHER_ACQUISITION_WRITER_ARGUMENTS_INVALID', 'WEATHER_ACQUISITION_WRITER_OWNER_INVALID',
  'WEATHER_ACQUISITION_WRITER_BUSY', 'WEATHER_ACQUISITION_WRITER_UNPROVED',
  'WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED', 'WEATHER_ACQUISITION_WRITER_RELEASE_UNPROVED',
  'DMI_RAW_SAVE_CHILD_FAILED', 'DMI_RAW_SAVE_COHORT_UNPROVED', 'DMI_RAW_SAVE_INTERRUPTED',
  'DMI_RAW_SAVE_RECEIPT_BOUND', 'DMI_RAW_SAVE_PIPE_FAILED', 'DMI_RAW_SAVE_PIPE_NOT_CLOSED',
  'DMI_RAW_SAVE_RECEIPT_INVALID', 'DMI_RAW_SAVE_API_FAILED', 'DMI_RAW_SAVE_NOT_FINALIZED',
  'WEATHER_CIPHER_UPLOAD_NOT_FINALIZED', 'DMI_RAW_DISTRIBUTION_NOT_READY',
  'WEATHER_CIPHER_TERMINAL_HANDOFF_REFUSED', 'WEATHER_CIPHER_TERMINAL_WINDOW_EXPIRED',
  'EEXIST', 'EACCES', 'ENOENT',
]);
function refusalDiagnostic(error) {
  let reason = 'UNKNOWN';
  if (error !== null && (typeof error === 'object' || typeof error === 'function')
      && !types.isProxy(error)) {
    for (const key of ['code', 'message']) {
      const descriptor = Object.getOwnPropertyDescriptor(error, key);
      if (descriptor && Object.hasOwn(descriptor, 'value')
          && typeof descriptor.value === 'string' && REFUSAL_REASONS.has(descriptor.value)) {
        reason = descriptor.value;
        break;
      }
    }
  }
  return `DMI_RAW_SAVE_DIAGNOSTIC stage=${cliPhase} reason=${reason}\n`;
}

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
  const archiveLimit = env.INPUT_ARCHIVE_LIMIT || env.RAVRADAR_DMI_RAW_ARCHIVE_MAX_BYTES;
  if (archiveLimit !== undefined && (!/^[1-9][0-9]{0,15}$/.test(archiveLimit)
      || !Number.isSafeInteger(Number(archiveLimit)) || Number(archiveLimit) < 1024)) {
    throw refused('DMI_RAW_SAVE_ARCHIVE_LIMIT_REFUSED');
  }
  // The official selector must already select v2. Do not manufacture runtime
  // credentials or force a different service mode to obtain a positive receipt.
  let github;
  try { github = new URL(env.GITHUB_SERVER_URL || 'https://github.com'); } catch {}
  if (!github || github.origin !== 'https://github.com' || github.username || github.password
      || !env.ACTIONS_CACHE_SERVICE_V2) throw refused('DMI_RAW_SAVE_V2_REQUIRED');
  return { key, path: CACHE_PATH, archiveLimit };
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

function terminalCipherClock() {
  // Linux /proc/uptime is CLOCK_BOOTTIME, including machine suspend. Treat
  // its two decimal places conservatively at the upper end of the tick.
  const match = /^([0-9]{1,12})\.([0-9]{2}) /.exec(fs.readFileSync('/proc/uptime', 'ascii'));
  if (!match) throw refused('WEATHER_CIPHER_TERMINAL_HANDOFF_REFUSED');
  return Number(match[1]) * 1000 + Number(match[2]) * 10 + 9;
}

function fixedTerminalCipherStage(env) {
  const input = env.RAVRADAR_TERMINAL_CIPHER_HANDOFF;
  if (input === undefined) return null;
  const invalid = () => refused('WEATHER_CIPHER_TERMINAL_HANDOFF_REFUSED');
  if (input.length > 2048 || !env.RUNNER_TEMP || !path.isAbsolute(env.RUNNER_TEMP)
      || !/^[1-9]\d{0,18}$/.test(env.GITHUB_RUN_ID ?? '') || !/^[1-9]\d{0,9}$/.test(env.GITHUB_RUN_ATTEMPT ?? '')
      || env.GITHUB_WORKSPACE !== ROOT) throw invalid();
  let handoff;
  try { handoff = JSON.parse(input); } catch { throw invalid(); }
  const unsigned = /^(?:0|[1-9][0-9]{0,23})$/;
  const fields = ['device', 'inode', 'mtimeNs', 'ctimeNs', 'stageDevice',
    'stageInode', 'cacheDevice', 'cacheInode'];
  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)
      || Object.keys(handoff).length !== fields.length + 8
      || handoff.schemaVersion !== 1 || handoff.runId !== env.GITHUB_RUN_ID
      || handoff.runAttempt !== env.GITHUB_RUN_ATTEMPT
      || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(handoff.bootId ?? '')
      || handoff.bootId !== fs.readFileSync('/proc/sys/kernel/random/boot_id', 'ascii').trim()
      || !Number.isSafeInteger(handoff.startedAt) || handoff.startedAt < 0
      || !Number.isSafeInteger(handoff.deadline)
      || handoff.deadline - handoff.startedAt !== TERMINAL_CIPHER_BUDGET_MS
      || !Number.isSafeInteger(handoff.bytes) || handoff.bytes < 1 || handoff.bytes > MAX_CIPHER_BYTES
      || typeof handoff.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(handoff.sha256)
      || fields.some(key => typeof handoff[key] !== 'string' || !unsigned.test(handoff[key]))) throw invalid();
  if (terminalCipherClock() < handoff.startedAt) throw invalid();
  const temp = env.RUNNER_TEMP;
  if (fs.realpathSync(temp) !== temp) throw invalid();
  const root = path.join(temp, `ravradar-terminal-weather-progress-${handoff.runId}-${handoff.runAttempt}`);
  const cache = path.join(root, '.cache');
  const absolute = path.join(root, CIPHER_PATH);
  const euid = BigInt(process.geteuid());
  const same = (stat, device, inode) => stat.dev.toString() === device && stat.ino > 0n
    && stat.ino.toString() === inode && stat.uid === euid;
  function assertIdentity() {
    for (const [directory, device, inode] of [[root, handoff.stageDevice, handoff.stageInode],
      [cache, handoff.cacheDevice, handoff.cacheInode]]) {
      const stat = fs.lstatSync(directory, { bigint: true });
      if (!stat.isDirectory() || (stat.mode & 0o777n) !== 0o700n
          || !same(stat, device, inode) || fs.realpathSync(directory) !== directory) throw invalid();
    }
    const stat = fs.lstatSync(absolute, { bigint: true });
    if (!stat.isFile() || stat.nlink !== 1n || (stat.mode & 0o777n) !== 0o600n
        || !same(stat, handoff.device, handoff.inode) || stat.size !== BigInt(handoff.bytes)
        || stat.mtimeNs.toString() !== handoff.mtimeNs || stat.ctimeNs.toString() !== handoff.ctimeNs) throw invalid();
  }
  function requireTime(reserve = 0) {
    if (terminalCipherClock() >= handoff.deadline - reserve) {
      throw refused('WEATHER_CIPHER_TERMINAL_WINDOW_EXPIRED');
    }
  }
  requireTime(TERMINAL_CIPHER_STOP_RESERVE_MS);
  assertIdentity();
  return { root, bytes: handoff.bytes, sha256: handoff.sha256, requireTime, assertIdentity };
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
  return { key: env.INPUT_KEY, path: CIPHER_PATH, stage: fixedTerminalCipherStage(env) };
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
  const archiveRefusal = input.archiveLimit !== undefined
      && process.env.RAVRADAR_DMI_RAW_ARCHIVE_OBSERVER === '1'
    ? fs.lstatSync(path.join(process.env.RUNNER_TEMP, 'raw-archive-budget-exceeded'),
      { throwIfNoEntry: false }) : undefined;
  if (archiveRefusal) {
    if (cacheId !== -1 || !archiveRefusal.isFile() || archiveRefusal.size !== 0) {
      throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
    }
    fs.writeSync(3, JSON.stringify({ schemaVersion: 1, kind: 'DMI_RAW_ARCHIVE_BUDGET_EXCEEDED',
      apiVersion: API_VERSION, path: input.path, key: input.key, archiveLimit: input.archiveLimit }));
    return;
  }
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
  const cipherRoot = input.stage?.root ?? ROOT;
  process.chdir(cipherRoot);
  // Only the already owned SDK child changes its workspace. Cache path, key
  // and SDK version remain the same as the ordinary authenticated restore.
  if (input.stage) process.env.GITHUB_WORKSPACE = cipherRoot;
  const packageFile = findPackageJSON('@actions/cache', pathToFileURL(__filename));
  if (!packageFile || JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== API_VERSION) {
    throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  }
  const cache = await import('@actions/cache');
  if (typeof cache.isFeatureAvailable !== 'function'
      || typeof cache.saveCache !== 'function' || !cache.isFeatureAvailable()) {
    throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  }
  // Validate the selected bytes on the owned descriptor. The existing seal
  // and terminal caller retain authority for plaintext and source closure.
  const absolute = path.join(cipherRoot, CIPHER_PATH);
  const parents = [cipherRoot, path.join(cipherRoot, '.cache')].map(directory => {
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
      input.stage?.assertIdentity();
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
    if (input.stage) {
      input.stage.requireTime(TERMINAL_CIPHER_STOP_RESERVE_MS);
      if (sha256 !== input.stage.sha256) throw refused('WEATHER_CIPHER_TERMINAL_HANDOFF_REFUSED');
    }
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
  input.stage?.requireTime();
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

function rawMembershipIdentity(stat) {
  return [stat.dev, stat.ino, stat.mode, stat.size, stat.mtimeNs, stat.ctimeNs].map(String);
}

// The owner snapshots the fixed archive input on both sides of SAVE. A later
// byte check can use this inventory to tie local originals to that exact SAVE.
function rawInventorySha256() {
  const raw = path.join(ROOT, CACHE_PATH);
  try {
    if (fs.realpathSync(raw) !== raw) return null;
    const directory = fs.lstatSync(raw, { bigint: true });
    if (!directory.isDirectory()) return null;
    const names = fs.readdirSync(raw).sort();
    if (names.length > 4097 || !names.includes('asset-manifest.json')) return null;
    const members = [];
    for (const name of names) {
      const file = fs.lstatSync(path.join(raw, name), { bigint: true });
      if (!file.isFile() || file.nlink !== 1n) return null;
      members.push([name, rawMembershipIdentity(file)]);
    }
    const identity = rawMembershipIdentity(directory);
    if (rawMembershipIdentity(fs.lstatSync(raw, { bigint: true }))
      .some((value, index) => value !== identity[index])) return null;
    return crypto.createHash('sha256').update(JSON.stringify([identity, members])).digest('hex');
  } catch {
    return null;
  }
}

async function runOwnedOperation(operation) {
  if (require.main === module) cliPhase = 'INPUT';
  const input = operation === 'save' ? fixedInputs()
    : operation === 'cipher' ? fixedCipherInputs() : fixedDistributionInputs();
  if (require.main === module) cliPhase = 'LOAD';
  const owner = require('../../../scripts/lib/weather-acquisition-writer.mjs');
  let lease;
  let child;
  let physicalClosed = false;
  let firstFailure = null;
  let interrupted = false;
  let archiveCapacitySkipped = false;
  let finalizedInventory;
  let terminalStop;
  const interrupt = () => {
    interrupted = true;
    // Request only. The Python owner must still prove its entire group absent.
    try { child?.kill('SIGTERM'); } catch {}
  };
  process.on('SIGTERM', interrupt);
  process.on('SIGINT', interrupt);
  try {
    if (input?.stage) {
      terminalStop = setInterval(() => {
        try { input.stage.requireTime(TERMINAL_CIPHER_STOP_RESERVE_MS); }
        catch { if (!interrupted) interrupt(); }
      }, 100);
    }
    if (require.main === module) cliPhase = 'LEASE';
    lease = await owner.acquireWeatherAcquisitionWriter();
    await owner.assertWeatherAcquisitionWriter(lease);
    if (interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
    if (input?.stage) {
      input.stage.requireTime(TERMINAL_CIPHER_STOP_RESERVE_MS);
      input.stage.assertIdentity();
    }
    const inventoryBefore = operation === 'save'
      && (input.archiveLimit !== undefined || process.env.RAVRADAR_MEASURE_RAW_SAVE_INVENTORY === 'true')
      ? rawInventorySha256() : null;
    if (require.main === module) cliPhase = 'SPAWN';
    child = spawn('python3', ['-B', path.join(ROOT, 'scripts/run-owned-dmi-grib-save.py'),
      ...(operation === 'distribution' ? ['--prepare-distribution']
        : operation === 'cipher' ? ['--upload-encrypted-progress'] : [])], {
      cwd: ROOT,
      env: input?.archiveLimit === undefined ? process.env
        : {...process.env, RAVRADAR_DMI_RAW_ARCHIVE_MAX_BYTES: input.archiveLimit},
      shell: false, stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
    });
    if (require.main === module) cliPhase = 'CLOSURE';
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
    if (require.main === module) cliPhase = 'API';
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
      if (input.stage) {
        input.stage.requireTime();
        input.stage.assertIdentity();
        if (receipt.sha256 !== input.stage.sha256 || receipt.bytes !== input.stage.bytes) {
          throw refused('WEATHER_CIPHER_UPLOAD_NOT_FINALIZED');
        }
      }
    } else {
      if (receipt.schemaVersion !== 1 || receipt.apiVersion !== API_VERSION
          || receipt.path !== input.path || receipt.key !== input.key) {
        throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
      }
      archiveCapacitySkipped = receipt.kind === 'DMI_RAW_ARCHIVE_BUDGET_EXCEEDED'
        && input.archiveLimit !== undefined && receipt.archiveLimit === input.archiveLimit;
      if (!archiveCapacitySkipped && (receipt.kind !== 'DMI_RAW_SAVE_V2_FINALIZED'
          || !Number.isSafeInteger(receipt.cacheId) || receipt.cacheId <= 0)) {
        throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
      }
    }
    if (require.main === module) cliPhase = 'LEASE';
    await owner.assertWeatherAcquisitionWriter(lease);
    if (inventoryBefore !== null && !archiveCapacitySkipped && rawInventorySha256() === inventoryBefore) {
      finalizedInventory = { cacheId: receipt.cacheId, inventorySha256: inventoryBefore };
    }
  } catch (error) {
    firstFailure = { value: error };
  } finally {
    if (lease) {
      if (child && !physicalClosed) {
        try { owner.retainWeatherAcquisitionWriter(lease); }
        catch (error) { firstFailure ??= { value: error }; }
      }
      else {
        if (firstFailure === null && require.main === module) cliPhase = 'LEASE_RELEASE';
        try { await owner.releaseWeatherAcquisitionWriter(lease); }
        catch (error) { firstFailure ??= { value: error }; }
      }
    }
    if (terminalStop !== undefined) clearInterval(terminalStop);
    process.removeListener('SIGTERM', interrupt);
    process.removeListener('SIGINT', interrupt);
  }
  if (firstFailure !== null) throw firstFailure.value;
  if (interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
  if (require.main === module) cliPhase = 'OUTPUT';
  if (operation === 'distribution') {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'distribution_ready=true\n');
    return { distributionReady: true };
  }
  if (operation === 'cipher') {
    input.stage?.requireTime();
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'uploaded=true\n');
    input.stage?.requireTime();
    return { uploaded: true };
  }
  if (archiveCapacitySkipped) {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'archive_capacity_skipped=true\n');
    return { archiveCapacitySkipped: true };
  }
  if (process.env.GITHUB_OUTPUT) {
    let output = 'saved=true\n';
    if (finalizedInventory) {
      output += 'saved_inventory=' + JSON.stringify(finalizedInventory) + '\n';
    }
    fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
  }
  return { saved: true };
}

async function runOwnedSave() { return runOwnedOperation('save'); }
async function runOwnedDistribution() { return runOwnedOperation('distribution'); }
async function runOwnedCipherUpload() { return runOwnedOperation('cipher'); }
module.exports = { rawInventorySha256, runApiWorker, runOwnedSave, runOwnedDistribution };
if (require.main === module) {
  cliPhase = 'INPUT';
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
  }).catch(error => {
    process.stderr.write('DMI_RAW_SAVE_REFUSED\n');
    process.stderr.write(refusalDiagnostic(error));
    process.exitCode = 1;
  });
}
