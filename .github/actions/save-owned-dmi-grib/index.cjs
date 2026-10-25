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

// CLI-local observation only: never an input, owner, closure or SAVE receipt.
let cliPhase = 'UNKNOWN';
// Observation only; never read by a closure/lease/SAVE admission guard.
const rawCohortRefusalObservations = new WeakMap();
const COHORT_DIAGNOSTIC_STAGES = new Set(['UNKNOWN','PLATFORM','PARENT_GUARD','API_FD_GUARD','PARENT_PIDFD','PARENT_LIVE','SIGNAL_SETUP','WORKER_SPAWN','WORKER_WAIT','OWNED_GROUP_SIGNAL','GROUP_ABSENCE','SIGNAL_RESTORE','PARENT_FD_CLOSE','API_FD_CLOSE','CLOSURE_WRITE']);
const COHORT_DIAGNOSTIC_REASONS = new Set(['UNKNOWN','OS_ERROR','DMI_RAW_SAVE_PLATFORM_REFUSED','DMI_RAW_SAVE_PARENT_UNPROVED','DMI_RAW_SAVE_PARENT_LOST','DMI_RAW_SAVE_GROUP_UNPROVED','DMI_RAW_SAVE_INTERRUPTED','DMI_RAW_SAVE_PARENT_FD_NOT_CLOSED','DMI_RAW_SAVE_PIPE_NOT_CLOSED']);
const COHORT_DIAGNOSTIC_ERRNOS = new Set(['NONE','UNKNOWN','ENOENT','ESRCH','EINTR','EIO','EBADF','ECHILD','ENOMEM','EACCES','EINVAL','EMFILE','EPIPE']);
const COHORT_DIAGNOSTIC_SIGNALS = new Set(['SIGTERM','SIGKILL','SIGINT','SIGPIPE','SIGABRT','SIGSEGV','SIGBUS','SIGHUP','SIGQUIT']);
function rememberRawCohortRefusal(error, exit, closureBody, closureReader, errorReader) {
  // The first raw refusal stays the thrown object; observation is best effort.
  try {
    let stdoutClass = closureBody.trim() === '' ? 'EMPTY' : 'INVALID_JSON';
    if (stdoutClass !== 'EMPTY') {
      try { const value = JSON.parse(closureBody); stdoutClass = value && typeof value === 'object' && !Array.isArray(value) ? 'OBJECT' : 'NON_OBJECT'; } catch {}
    }
    let stage='UNKNOWN', reason='UNKNOWN', number='UNKNOWN';
    const rows=[];
    try {
      for (const line of errorReader().split(/\r?\n/)) {
        const match=/^DMI_RAW_SAVE_COHORT_DIAGNOSTIC stage=([A-Z_]+) reason=([A-Z_]+) errno=([A-Z_]+)$/.exec(line);
        if (match && COHORT_DIAGNOSTIC_STAGES.has(match[1]) && COHORT_DIAGNOSTIC_REASONS.has(match[2]) && COHORT_DIAGNOSTIC_ERRNOS.has(match[3])) rows.push(match);
      }
    } catch {} // Never replace the original stdout refusal with diagnostics I/O.
    if(rows.length===1)[,stage,reason,number]=rows[0];
    const bytes=closureReader.observedBytes;
    if(!Number.isInteger(bytes)||bytes<0||bytes>MAX_RECEIPT_BYTES)return;
    rawCohortRefusalObservations.set(error,Object.freeze({
      exit: Number.isInteger(exit.code)&&exit.code>=0&&exit.code<=255?String(exit.code):'NONE',
      signal: exit.signal===null?'NONE':COHORT_DIAGNOSTIC_SIGNALS.has(exit.signal)?exit.signal:'UNKNOWN',
      stdoutClass,bytes,stage,reason,errno:number}));
  } catch {} // No diagnostic failure may replace or authorize the first refusal.
}
function rawCohortRefusalDiagnosticLine(error) {
  const value=rawCohortRefusalObservations.get(error);
  return value ? `DMI_RAW_SAVE_COHORT_OBSERVATION exit=${value.exit} signal=${value.signal} stdout=${value.stdoutClass} bytes=${value.bytes} stage=${value.stage} reason=${value.reason} errno=${value.errno}\n` : '';
}

const REFUSAL_REASONS = new Set([
  'DMI_RAW_SAVE_INPUT_REFUSED', 'DMI_RAW_SAVE_V2_REQUIRED', 'DMI_RAW_SAVE_ARGUMENT_REFUSED',
  'DMI_RAW_DISTRIBUTION_INPUT_REFUSED', 'WEATHER_CIPHER_UPLOAD_INPUT_REFUSED',
  'WEATHER_ACQUISITION_WRITER_ARGUMENTS_INVALID', 'WEATHER_ACQUISITION_WRITER_OWNER_INVALID',
  'WEATHER_ACQUISITION_WRITER_BUSY', 'WEATHER_ACQUISITION_WRITER_UNPROVED',
  'WEATHER_ACQUISITION_WRITER_CLOSE_UNPROVED', 'WEATHER_ACQUISITION_WRITER_RELEASE_UNPROVED',
  'DMI_RAW_SAVE_CHILD_FAILED', 'DMI_RAW_SAVE_COHORT_UNPROVED', 'DMI_RAW_SAVE_INTERRUPTED',
  'DMI_RAW_SAVE_RECEIPT_BOUND', 'DMI_RAW_SAVE_PIPE_FAILED', 'DMI_RAW_SAVE_PIPE_NOT_CLOSED',
  'DMI_RAW_SAVE_RECEIPT_INVALID', 'DMI_RAW_SAVE_API_FAILED', 'DMI_RAW_SAVE_NOT_FINALIZED',
  'WEATHER_CIPHER_UPLOAD_NOT_FINALIZED', 'DMI_RAW_DISTRIBUTION_NOT_READY',
  'SOURCE_WORKFLOW_OBSERVATION_INVALID', 'SOURCE_WORKFLOW_OUTPUT_UNAVAILABLE',
  'SOURCE_CACHE_API_REFUSED',
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

// SOURCE_ACTION_DIAGNOSTIC_BEGIN: extra fixed observation, never admission.
let sourceFailureDiagnosticReader = null;
let sourceFailureImportError = null;
const SOURCE_ACTION_DIAGNOSTIC_STAGES = new Set(['UNKNOWN','SOURCE_IMPORT','SOURCE_GUARD','ROUTE','PRELUDE','PREFLIGHT','ADMIN','HANDOFF','ORIGINAL_SELECTION','CHECKPOINT_PROTECTED','ARCHIVED_READERS','PRIVATE_ROOT','PROGRESS_CACHE','ORIGINAL_INSTALL','POST_INSTALL','PROGRESS_BASE','PROGRESS_UNION','PRODUCER_CHAIN']);
const SOURCE_ACTION_DIAGNOSTIC_NODE_CODES = new Set(['ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND','ERR_REQUIRE_ASYNC_MODULE','ERR_REQUIRE_ESM','ERR_UNKNOWN_FILE_EXTENSION','ERR_UNSUPPORTED_DIR_IMPORT','ERR_INVALID_ARG_TYPE','ERR_INVALID_ARG_VALUE','ERR_INVALID_URL']);
const SOURCE_ACTION_DIAGNOSTIC_PRIVATE_CODES = new Set(['UNKNOWN','PROTECTED_PRIVATE_RUNTIME_INELIGIBLE','PROTECTED_PRIVATE_RUNTIME_EXPIRED','PROTECTED_PRIVATE_RUNTIME_REMOTE_ERROR','PROTECTED_PRIVATE_RUNTIME_NO_COMPATIBLE_GENERATION']);
const SOURCE_ACTION_DIAGNOSTIC_NODE_CLASSES = new Set(['UNKNOWN','ERROR','TYPE_ERROR','REFERENCE_ERROR','SYNTAX_ERROR','RANGE_ERROR','AGGREGATE_ERROR']);
const SOURCE_ACTION_DIAGNOSTIC_REJECTIONS = new Set(['NONE','UNKNOWN','EXPIRED','FILESYSTEM_CAPACITY','FILESYSTEM_PERMISSION','FILESYSTEM_READ_ONLY','FILESYSTEM_RESOURCE_LIMIT','STORAGE_OR_OBJECT_INTEGRITY','ARCHIVE_OR_PAYLOAD_INTEGRITY','MODEL_BINDING','CONTRACT_HASHES','DATASET_IDENTITY','TIME_BOUNDS','DESCRIPTOR_BUNDLE_MISMATCH','BUNDLE_STRUCTURE_OR_CONTENT','MODEL_OR_CONTRACT_INELIGIBLE','ARCHIVE_ENVELOPE_DECODE','ARCHIVE_STAGE_CREATE','ARCHIVE_FILE_PATH','ARCHIVE_FILE_PARENT','ARCHIVE_FILE_WRITE','ARCHIVE_STAGE_COMMIT']);
function sourceFailureDiagnosticLine(error) {
  let report = {stage:'UNKNOWN',reason:'UNKNOWN',nodeClass:'UNKNOWN',rejection:'UNKNOWN'};
  try {
    if (typeof sourceFailureDiagnosticReader === 'function') report = sourceFailureDiagnosticReader(error);
    else if (error === sourceFailureImportError && error !== null && typeof error === 'object'
      && !types.isProxy(error) && types.isNativeError(error)) {
      const code = Object.getOwnPropertyDescriptor(error,'code');
      if (code && Object.hasOwn(code,'value') && SOURCE_ACTION_DIAGNOSTIC_NODE_CODES.has(code.value)) {
        report = {stage:'SOURCE_IMPORT',reason:code.value,nodeClass:'ERROR',rejection:'NONE'};
      }
    }
    if (report === null || typeof report !== 'object' || types.isProxy(report)
      || Object.getOwnPropertyNames(report).sort().join(',') !== 'nodeClass,reason,rejection,stage') throw null;
    const fields = {};
    for (const key of ['stage','reason','nodeClass','rejection']) {
      const descriptor = Object.getOwnPropertyDescriptor(report,key);
      if (!descriptor || !Object.hasOwn(descriptor,'value') || typeof descriptor.value !== 'string') throw null;
      fields[key] = descriptor.value;
    }
    if (!SOURCE_ACTION_DIAGNOSTIC_STAGES.has(fields.stage)
      || !(SOURCE_ACTION_DIAGNOSTIC_NODE_CODES.has(fields.reason)
        || SOURCE_ACTION_DIAGNOSTIC_PRIVATE_CODES.has(fields.reason)
        || /^SOURCE_[A-Z0-9_]{1,100}$/.test(fields.reason))
      || !SOURCE_ACTION_DIAGNOSTIC_NODE_CLASSES.has(fields.nodeClass)
      || !SOURCE_ACTION_DIAGNOSTIC_REJECTIONS.has(fields.rejection)) throw null;
    return 'SOURCE_RUN_DIAGNOSTIC stage=' + fields.stage + ' reason=' + fields.reason
      + ' node_class=' + fields.nodeClass + ' rejection=' + fields.rejection + '\n';
  } catch {
    return 'SOURCE_RUN_DIAGNOSTIC stage=UNKNOWN reason=UNKNOWN node_class=UNKNOWN rejection=UNKNOWN\n';
  }
}
// SOURCE_ACTION_DIAGNOSTIC_END

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

const POST_WEATHER_CACHES = Object.freeze({
  checkpoint: Object.freeze({ operation: 'source-checkpoint-cache-save', code: 4,
    path: '.cache/ravscore-continuation-checkpoint', file: 'checkpoint.json',
    prefix: 'ravscore-continuation-schema6-v2-', maximum: 16 * 1024 * 1024,
    kind: 'SOURCE_CHECKPOINT_CACHE_V2_FINALIZED' }),
  preflight: Object.freeze({ operation: 'source-preflight-cache-save', code: 5,
    path: '.cache/weather-preflight-state', file: 'state.json',
    prefix: 'weather-preflight-state-v1-Linux-', maximum: 64 * 1024,
    kind: 'SOURCE_PREFLIGHT_CACHE_V2_FINALIZED' }),
});
function fixedPostWeatherCacheInputs(selection) {
  fixedDistributionInputs();
  const spec = POST_WEATHER_CACHES[selection], env = process.env;
  if (!spec || env.INPUT_OPERATION !== spec.operation || env.INPUT_PATH !== spec.path
    || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || '')
    || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT || '')
    || env.INPUT_KEY !== `${spec.prefix}${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`
    || !env.ACTIONS_CACHE_SERVICE_V2) throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
  return { ...spec, key: env.INPUT_KEY };
}

const retainedPostWeatherCacheReaders = new Set();
const retainedPostWeatherCacheApiFailures = [];
// Fixed-path value inspection only, NOT an owner, source/SAVE or admission.
function inspectFixedPostWeatherCache(selection) {
  if (arguments.length !== 1 || !Object.hasOwn(POST_WEATHER_CACHES, selection)) {
    throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
  }
  const spec = POST_WEATHER_CACHES[selection], directory = path.join(ROOT, spec.path);
  const parents = [ROOT, path.join(ROOT, '.cache'), directory].map(name => {
    const identity = fs.lstatSync(name, { bigint: true });
    if (!identity.isDirectory() || identity.isSymbolicLink() || fs.realpathSync(name) !== name) {
      throw refused('SOURCE_CACHE_INVENTORY_CHANGED');
    }
    return { name, identity };
  });
  const file = path.join(directory, spec.file), original = fs.lstatSync(file, { bigint: true });
  if (!original.isFile() || original.isSymbolicLink() || original.nlink !== 1n
    || original.size < 2n || original.size > BigInt(spec.maximum)) throw refused('SOURCE_CACHE_INVENTORY_CHANGED');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  const reader = { fd, closeAttempted: false, closed: false };
  retainedPostWeatherCacheReaders.add(reader);
  const same = value => value.isFile() && !value.isSymbolicLink()
    && ['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].every(key => value[key] === original[key]);
  const inventory = () => {
    for (const {name, identity} of parents) {
      const named = fs.lstatSync(name, { bigint: true });
      if (!named.isDirectory() || named.isSymbolicLink() || fs.realpathSync(name) !== name
        || ['dev','ino','mode'].some(key => named[key] !== identity[key])) throw refused('SOURCE_CACHE_INVENTORY_CHANGED');
    }
    if (fs.readdirSync(directory).sort().join('\n') !== spec.file
      || !same(fs.fstatSync(fd, { bigint: true })) || !same(fs.lstatSync(file, { bigint: true }))) {
      throw refused('SOURCE_CACHE_INVENTORY_CHANGED');
    }
  };
  const digest = () => {
    inventory();
    const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(64 * 1024);
    let position = 0;
    while (position < Number(original.size)) {
      const count = fs.readSync(fd, buffer, 0, Math.min(buffer.length, Number(original.size) - position), position);
      if (!Number.isInteger(count) || count <= 0) throw refused('SOURCE_CACHE_INVENTORY_CHANGED');
      position += count; hash.update(buffer.subarray(0, count));
    }
    if (fs.readSync(fd, buffer, 0, 1, position) !== 0) throw refused('SOURCE_CACHE_INVENTORY_CHANGED');
    inventory(); return hash.digest('hex');
  };
  const close = () => {
    if (reader.closeAttempted) throw refused('SOURCE_CACHE_CLOSE_UNPROVED');
    reader.closeAttempted = true;
    fs.closeSync(fd);
    try { fs.fstatSync(fd); }
    catch (error) {
      if (error?.code === 'EBADF') { reader.closed = true; retainedPostWeatherCacheReaders.delete(reader); return; }
      throw error;
    }
    throw refused('SOURCE_CACHE_CLOSE_UNPROVED');
  };
  let sha256;
  try { sha256 = digest(); }
  catch (error) { try { close(); } catch {} throw error; }
  return Object.freeze({ bytes: Number(original.size), sha256,
    assertUnchanged() { if (reader.closeAttempted || digest() !== sha256) throw refused('SOURCE_CACHE_INVENTORY_CHANGED'); }, close });
}

async function runPostWeatherCacheApiWorker(selection) {
  const input = fixedPostWeatherCacheInputs(selection);
  assertFixedWorkerParent();
  assertAdmittedDistributionLock();
  process.chdir(ROOT);
  const packageFile = findPackageJSON('@actions/cache', pathToFileURL(__filename));
  if (!packageFile || JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== API_VERSION) throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  const cache = await import('@actions/cache');
  if (typeof cache.isFeatureAvailable !== 'function' || typeof cache.saveCache !== 'function'
    || !cache.isFeatureAvailable()) throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  const reader = inspectFixedPostWeatherCache(selection);
  let first = null, receipt, apiFailure = null;
  try {
    let cacheId;
    try { cacheId = await cache.saveCache([input.path], input.key, undefined, false); }
    catch (error) { apiFailure = { value: error }; }
    if (apiFailure === null && (!Number.isSafeInteger(cacheId) || cacheId <= 0)) {
      apiFailure = { value: refused('DMI_RAW_SAVE_NOT_FINALIZED') };
    }
    if (apiFailure !== null) retainedPostWeatherCacheApiFailures.push(apiFailure);
    // A real input mutation/unknown close is NEVER downgraded to an API refusal.
    reader.assertUnchanged();
    receipt = apiFailure === null
      ? { schemaVersion: 1, kind: input.kind, apiVersion: API_VERSION,
          path: input.path, key: input.key, cacheId, bytes: reader.bytes, sha256: reader.sha256 }
      : { schemaVersion: 1, kind: 'SOURCE_CACHE_API_REFUSED', operation: selection, apiVersion: API_VERSION,
          path: input.path, key: input.key, bytes: reader.bytes, sha256: reader.sha256 };
  } catch (error) { first = apiFailure ?? { value: error }; }
  try { reader.close(); } catch (error) { first ??= apiFailure ?? { value: error }; }
  if (first !== null) throw first.value;
  fs.writeSync(3, JSON.stringify(receipt));
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

// Explicit SDK successor; the historical assertDistributionLock above remains
// unchanged and does not admit this distribution. No environment/caller flag.
const SOURCE_ARTIFACT_PACKAGE_SHA256 = '27ec4c37add8a4fb54de05e6ceb797b42c95ff15dd84526b4aa326f64c073d99';
const SOURCE_ARTIFACT_LOCK_SHA256 = '920ad50fc3b7084879c1257d5b11e0e3ce52367b42f05871ffc68f8a66f66c47';
function assertArtifactDistributionSuccessor() {
  const action = path.join(ROOT, '.github/actions/save-owned-dmi-grib');
  const texts = ['package.json', 'package-lock.json'].map(name =>
    fs.readFileSync(path.join(action, name), 'utf8').replace(/\r\n/g, '\n'));
  const hash = text => crypto.createHash('sha256').update(text).digest('hex');
  if (texts.some(text => text.includes('\r'))
    || hash(texts[0]) !== SOURCE_ARTIFACT_PACKAGE_SHA256
    || hash(texts[1]) !== SOURCE_ARTIFACT_LOCK_SHA256) throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
  // The exact npm-generated file is canonical. Its old cache-only subgraph must
  // reproduce the complete historical lock, not merely49 names or versions.
  const lock = JSON.parse(texts[1]);
  if (JSON.stringify(lock, null, 2) + '\n' !== texts[1]) throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
  const resolve = (from, name) => {
    for (let base = from;;) {
      const key = `${base ? `${base}/` : ''}node_modules/${name}`;
      if (Object.hasOwn(lock.packages, key)) return key;
      if (!base) return null;
      const index = base.lastIndexOf('/node_modules/'); base = index < 0 ? '' : base.slice(0, index);
    }
  };
  const reachable = first => {
    const seen = new Set(), pending = [first];
    while (pending.length) {
      const key = pending.pop(); if (seen.has(key)) continue; seen.add(key);
      const row = lock.packages[key];
      if (!row) throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
      for (const kind of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        for (const name of Object.keys(row[kind] || {})) {
          const selected = resolve(key, name);
          if (selected) pending.push(selected);
          else if (kind !== 'optionalDependencies' && row.peerDependenciesMeta?.[name]?.optional !== true) {
            throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
          }
        }
      }
    }
    return seen;
  };
  const legacy = reachable('node_modules/@actions/cache');
  const artifact = reachable('node_modules/@actions/artifact');
  const added = Object.keys(lock.packages).filter(key => key && !legacy.has(key));
  if (legacy.size !== 49 || added.length !== 210 || added.some(key => !artifact.has(key))
    || lock.packages['node_modules/@actions/artifact'].version !== '6.3.1') {
    throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
  }
  delete lock.packages[''].dependencies['@actions/artifact'];
  for (const key of added) delete lock.packages[key];
  if (hash(JSON.stringify(lock, null, 2) + '\n') !== LOCK_SHA256
    || hash(texts[0].replace(', "@actions/artifact": "6.3.1"', ''))
      !== '111ef6137410cce15e90ddfea3fbbb70b04285a2e0c1fc04cb221c04cc3b61d8') {
    throw refused('DMI_RAW_DISTRIBUTION_LOCK_REFUSED');
  }
  return action;
}

function assertAdmittedDistributionLock() {
  const action = path.join(ROOT, '.github/actions/save-owned-dmi-grib');
  const packageText = fs.readFileSync(path.join(action, 'package.json'), 'utf8').replace(/\r\n/g, '\n');
  if (crypto.createHash('sha256').update(packageText).digest('hex') === SOURCE_ARTIFACT_PACKAGE_SHA256) {
    return { action: assertArtifactDistributionSuccessor(), lockSha256: SOURCE_ARTIFACT_LOCK_SHA256 };
  }
  return { action: assertDistributionLock(), lockSha256: LOCK_SHA256 };
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
  const distribution = assertAdmittedDistributionLock();
  const action = distribution.action;
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
  if (assertAdmittedDistributionLock().lockSha256 !== distribution.lockSha256) throw refused('DMI_RAW_DISTRIBUTION_NOT_READY');
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
    apiVersion: API_VERSION, lockSha256: distribution.lockSha256 }));
  // Worker completion/this IPC alone is not physical closure or SAVE.
}

async function runApiWorker() {
  const input = fixedInputs();
  assertFixedWorkerParent();
  assertAdmittedDistributionLock(); // Fresh exact legacy/successor check; no earlier receipt is admission.
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
  assertAdmittedDistributionLock();
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
  const read = () => {
    if (failure) throw failure;
    if (!ended) throw refused('DMI_RAW_SAVE_PIPE_NOT_CLOSED');
    return Buffer.concat(chunks).toString('utf8');
  };
  Object.defineProperty(read, 'observedBytes', { get: () => size }); // Observation only.
  return read;
}

function parseReceipt(text) {
  try {
    const value = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch {}
  throw refused('DMI_RAW_SAVE_RECEIPT_INVALID');
}

// Only results of this actual invocation acquire an entry. Neither a boolean
// result nor parsed caller JSON can issue the already validated API receipt.
const sourceOwnedOperationReceipts = new WeakMap();
let activeSourceSaveInvocation = null;
const retainedSourceSaveChannels = new Set();

async function runOwnedOperation(operation) {
  const sourceInvocation = activeSourceSaveInvocation;
  if (require.main === module) cliPhase = 'INPUT';
  const postWeather = Object.hasOwn(POST_WEATHER_CACHES, operation);
  const input = operation === 'save' ? fixedInputs()
    : operation === 'cipher' ? fixedCipherInputs()
      : postWeather ? fixedPostWeatherCacheInputs(operation) : fixedDistributionInputs();
  if (require.main === module) cliPhase = 'LOAD';
  const owner = require('../../../scripts/lib/weather-acquisition-writer.mjs');
  let lease;
  let child;
  let physicalClosed = false;
  let leaseReleased = false;
  let cohortInterrupted = false;
  let firstFailure = null;
  let finalizedReceipt;
  let distribution;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    // Request only. The Python owner must still prove its entire group absent.
    try { child?.kill('SIGTERM'); } catch {}
  };
  process.on('SIGTERM', interrupt);
  process.on('SIGINT', interrupt);
  try {
    if (require.main === module) cliPhase = 'LEASE';
    lease = await owner.acquireWeatherAcquisitionWriter();
    await owner.assertWeatherAcquisitionWriter(lease);
    if (interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
    if (operation === 'distribution') distribution = assertAdmittedDistributionLock();
    if (require.main === module) cliPhase = 'SPAWN';
    child = spawn('python3', ['-B', path.join(ROOT, 'scripts/run-owned-dmi-grib-save.py'),
      ...(operation === 'distribution' ? ['--prepare-distribution']
        : operation === 'cipher' ? ['--upload-encrypted-progress']
          : postWeather ? [`--source-${operation}-cache-save`] : [])], {
      cwd: ROOT, env: process.env, shell: false,
      stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
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
    const closureBody = closureText();
    let closure;
    try { closure = parseReceipt(closureBody); }
    catch (error) {
      rememberRawCohortRefusal(error, exit, closureBody, closureText, errorText);
      throw error;
    }
    errorText();
    if (exit.signal !== null || exit.code !== 0
        || closure.schemaVersion !== 1 || closure.kind !== 'DMI_RAW_SAVE_COHORT_CLOSED'
        || !Number.isInteger(closure.workerExitCode) || typeof closure.interrupted !== 'boolean') {
      throw refused('DMI_RAW_SAVE_COHORT_UNPROVED');
    }
    physicalClosed = true;
    cohortInterrupted = closure.interrupted;
    if (interrupted || closure.interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
    if (require.main === module) cliPhase = 'API';
    if (closure.workerExitCode !== 0) throw refused('DMI_RAW_SAVE_API_FAILED');
    const receipt = parseReceipt(apiText());
    if (operation === 'distribution') {
      if (receipt.schemaVersion !== 1 || receipt.kind !== 'DMI_RAW_DISTRIBUTION_READY'
          || receipt.apiVersion !== API_VERSION || receipt.lockSha256 !== distribution.lockSha256
          || assertAdmittedDistributionLock().lockSha256 !== distribution.lockSha256) {
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
    } else if (postWeather) {
      if (receipt.kind === 'SOURCE_CACHE_API_REFUSED') {
        if (Object.keys(receipt).sort().join(',') !== 'apiVersion,bytes,key,kind,operation,path,schemaVersion,sha256'
          || receipt.schemaVersion !== 1 || receipt.operation !== operation || receipt.apiVersion !== API_VERSION
          || receipt.path !== input.path || receipt.key !== input.key
          || !Number.isSafeInteger(receipt.bytes) || receipt.bytes < 2 || receipt.bytes > input.maximum
          || !/^[a-f0-9]{64}$/.test(receipt.sha256 ?? '')) throw refused('DMI_RAW_SAVE_RECEIPT_INVALID');
        throw refused('SOURCE_CACHE_API_REFUSED');
      }
      if (Object.keys(receipt).sort().join(',') !== 'apiVersion,bytes,cacheId,key,kind,path,schemaVersion,sha256'
        || receipt.schemaVersion !== 1 || receipt.kind !== input.kind || receipt.apiVersion !== API_VERSION
        || receipt.path !== input.path || receipt.key !== input.key
        || !Number.isSafeInteger(receipt.cacheId) || receipt.cacheId <= 0
        || !Number.isSafeInteger(receipt.bytes) || receipt.bytes < 2 || receipt.bytes > input.maximum
        || !/^[a-f0-9]{64}$/.test(receipt.sha256 ?? '')) throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
    } else if (receipt.schemaVersion !== 1 || receipt.kind !== 'DMI_RAW_SAVE_V2_FINALIZED'
        || receipt.apiVersion !== API_VERSION || receipt.path !== input.path
        || receipt.key !== input.key || !Number.isSafeInteger(receipt.cacheId) || receipt.cacheId <= 0) {
      throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
    }
    finalizedReceipt = Object.freeze({ ...receipt });
    if (require.main === module) cliPhase = 'LEASE';
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
        if (firstFailure === null && require.main === module) cliPhase = 'LEASE_RELEASE';
        try { await owner.releaseWeatherAcquisitionWriter(lease); leaseReleased = true; }
        catch (error) { firstFailure ??= { value: error }; }
      }
    }
    process.removeListener('SIGTERM', interrupt);
    process.removeListener('SIGINT', interrupt);
  }
  if (sourceInvocation !== null) {
    // Values come from THIS invocation's existing actual closure/release path.
    // No public option, receipt JSON or phase caller can set these fields.
    sourceInvocation.physicalClosed = physicalClosed;
    sourceInvocation.leaseReleased = leaseReleased;
    sourceInvocation.interrupted = interrupted || cohortInterrupted;
    sourceInvocation.firstFailure = firstFailure;
  }
  if (firstFailure !== null) throw firstFailure.value;
  if (interrupted) throw refused('DMI_RAW_SAVE_INTERRUPTED');
  if (require.main === module) cliPhase = 'OUTPUT';
  if (operation === 'distribution') {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'distribution_ready=true\n');
    const result = { distributionReady: true };
    sourceOwnedOperationReceipts.set(result, finalizedReceipt);
    return result;
  }
  if (operation === 'cipher') {
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'uploaded=true\n');
    const result = { uploaded: true };
    sourceOwnedOperationReceipts.set(result, finalizedReceipt);
    return result;
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'saved=true\n');
  const result = { saved: true };
  sourceOwnedOperationReceipts.set(result, finalizedReceipt);
  return result;
}

async function runOwnedSave() { return runOwnedOperation('save'); }
async function runOwnedDistribution() { return runOwnedOperation('distribution'); }
async function runOwnedCipherUpload() { return runOwnedOperation('cipher'); }
function sourceSaveChannel(operation) {
  const guardian = path.join(ROOT, 'scripts/lib/copernicus_component_process.py');
  const parent = process.ppid;
  const command = fs.readFileSync(`/proc/${parent}/cmdline`);
  const fields = command.toString('utf8').split('\0');
  if (fields.pop() !== '' || command.length > 16384 || process.ppid !== parent
      || fields.length !== 5 || fields[1] !== '-I' || fields[2] !== '-B'
      || fields[3] !== guardian || fields[4] !== '--source-normal-phase-cohort'
      || process.platform !== 'linux' || process.versions.node.split('.')[0] !== '24') {
    throw refused('DMI_RAW_SAVE_PARENT_UNPROVED');
  }
  const stat = fs.fstatSync(0, { bigint: true });
  if (!stat.isSocket()) throw refused('DMI_RAW_SAVE_PARENT_UNPROVED');
  const channel = { fd: 0, stat, closeAttempted: false, closed: false,
    parent, operation, nonce: null, firstFailure: null };
  retainedSourceSaveChannels.add(channel);
  try {
    // The actual guardian has written the complete bounded frame before Popen.
    // A short/closed/invalid channel refuses before acquiring a cache lease.
    const frame = Buffer.alloc(89);
    let position = 0;
    while (position < frame.length) {
      const count = fs.readSync(channel.fd, frame, position, frame.length - position, null);
      if (count <= 0) throw refused('DMI_RAW_SAVE_PARENT_UNPROVED');
      position += count;
    }
    const code = operation === 'save' ? 1 : operation === 'cipher' ? 2 : POST_WEATHER_CACHES[operation]?.code;
    if (frame.subarray(0, 8).toString('ascii') !== 'RRSSG401'
        || frame.readUInt32BE(8) !== parent
        || frame.readBigUInt64BE(12).toString() !== process.env.GITHUB_RUN_ID
        || frame.readBigUInt64BE(20).toString() !== process.env.GITHUB_RUN_ATTEMPT
        || frame.subarray(60, 80).toString('hex') !== process.env.GITHUB_SHA
        || frame[80] !== code || frame.readBigUInt64BE(81) === 0n
        || process.ppid !== parent) throw refused('DMI_RAW_SAVE_PARENT_UNPROVED');
    channel.nonce = frame.subarray(28, 60);
    // Opaque here: Python owns and compares this same already issued cutoff.
    channel.cutoff = frame.readBigUInt64BE(81);
    return channel;
  } catch (error) {
    channel.firstFailure = { value: error };
    throw error;
  }
}

function closeSourceSaveChannel(channel) {
  if (channel.closeAttempted) throw refused('DMI_RAW_SAVE_COHORT_UNPROVED');
  const stat = fs.fstatSync(channel.fd, { bigint: true });
  if (!stat.isSocket() || stat.dev !== channel.stat.dev || stat.ino !== channel.stat.ino) {
    throw refused('DMI_RAW_SAVE_COHORT_UNPROVED');
  }
  channel.closeAttempted = true;
  fs.closeSync(channel.fd);
  try { fs.fstatSync(channel.fd); }
  catch (error) {
    if (error?.code === 'EBADF') { channel.closed = true; return; }
    throw error;
  }
  throw refused('DMI_RAW_SAVE_COHORT_UNPROVED');
}

async function runSourceSavePhase(operation) {
  const channel = sourceSaveChannel(operation);
  if (activeSourceSaveInvocation !== null) throw refused('DMI_RAW_SAVE_COHORT_UNPROVED');
  const invocation = { physicalClosed: false, leaseReleased: false,
    interrupted: false, firstFailure: null, actualError: null };
  channel.invocation = invocation; // actual raw error/refs survive any uncertainty
  activeSourceSaveInvocation = invocation;
  let primary = null, receipt;
  try {
    try {
      const result = await runOwnedOperation(operation);
      receipt = sourceOwnedOperationReceipts.get(result);
      if (!receipt || (operation === 'save' && receipt.kind !== 'DMI_RAW_SAVE_V2_FINALIZED')
          || (operation === 'cipher' && receipt.kind !== 'WEATHER_CIPHER_V2_FINALIZED')
          || (Object.hasOwn(POST_WEATHER_CACHES, operation) && receipt.kind !== POST_WEATHER_CACHES[operation].kind)) {
        throw refused('DMI_RAW_SAVE_NOT_FINALIZED');
      }
    } catch (error) {
      invocation.actualError = { value: error }; // false/null/0 are not absence
      if (!invocation.physicalClosed || !invocation.leaseReleased) throw error;
      const safe = /^DMI_RAW_SAVE_DIAGNOSTIC stage=([A-Z_]+) reason=([A-Z0-9_]+)\n$/
        .exec(refusalDiagnostic(error));
      if (!safe) throw error;
      // This reports a failed SAVE after the actual normal owned operation
      // closed. It is NOT an API ACK or cryptographic/durable SAVE report.
      receipt = Object.freeze({ schemaVersion: 1, kind: 'SOURCE_SAVE_CLOSED_FAILURE',
        operation, stage: safe[1], reason: safe[2], interrupted: invocation.interrupted });
    } finally {
      activeSourceSaveInvocation = null;
    }
    const body = Buffer.from(JSON.stringify(receipt), 'utf8');
    if (body.length > 4096) throw refused('DMI_RAW_SAVE_RECEIPT_INVALID');
    const header = Buffer.alloc(44);
    header.write('RRSSG4A1', 0, 'ascii'); channel.nonce.copy(header, 8);
    header.writeUInt32BE(body.length, 40);
    const bytes = Buffer.concat([header, body]);
    let offset = 0;
    while (offset < bytes.length) {
      const count = fs.writeSync(channel.fd, bytes, offset, bytes.length - offset);
      if (count <= 0) throw refused('DMI_RAW_SAVE_RECEIPT_INVALID');
      offset += count;
    }
  } catch (error) { primary = { value: error }; }
  try { closeSourceSaveChannel(channel); }
  catch (error) { primary ??= { value: error }; }
  if (primary !== null) {
    // A channel/cleanup error after a known failed SAVE may not replace the
    // earlier raw failure, including null. Nothing is successfully published.
    channel.firstFailure ??= invocation.actualError ?? primary;
    throw channel.firstFailure.value;
  }
  retainedSourceSaveChannels.delete(channel);
}

async function runSourcePreflightCacheRead() { return runSourceFixedCacheRead('preflight'); }
async function runSourceFixedCacheRead(selection) {
  if (!['preflight', 'progress', 'raw'].includes(selection)) throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
  fixedDistributionInputs();
  if (process.env.INPUT_OPERATION !== 'source' || !process.env.ACTIONS_CACHE_SERVICE_V2
    || !/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID || '')
    || !/^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ATTEMPT || '')) throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
  const parent = process.ppid;
  const argv = fs.readFileSync(`/proc/${parent}/cmdline`), fields = argv.toString('utf8').split('\0');
  if (argv.length > 16384 || fields.length !== 6 || fields[1] !== '-I' || fields[2] !== '-B'
    || fields[3] !== path.join(ROOT, 'scripts/lib/copernicus_component_process.py')
    || fields[4] !== '--source-normal-program-cohort' || fields[5] !== ''
    || process.ppid !== parent) throw refused('DMI_RAW_SAVE_WORKER_PARENT_UNPROVED');
  const action = assertAdmittedDistributionLock().action;
  const packageFile = findPackageJSON('@actions/cache', pathToFileURL(__filename));
  if (!packageFile || fs.realpathSync(packageFile)
      !== fs.realpathSync(path.join(action, 'node_modules/@actions/cache/package.json'))
    || JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== API_VERSION) throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  const cache = await import('@actions/cache');
  if (typeof cache.restoreCache !== 'function' || typeof cache.isFeatureAvailable !== 'function'
    || !cache.isFeatureAvailable()) throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  const quick = process.env.INPUT_QUICK_CONFIRMATION ?? 'false';
  const progress = process.env.INPUT_QUICK_PROGRESS_SOURCE ?? '';
  if (!['true', 'false'].includes(quick)) throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
  const suffix = `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
  let paths, key, restoreKeys, accepted;
  if (selection === 'preflight') {
    const prefix = 'weather-preflight-state-v1-Linux-';
    paths = ['.cache/weather-preflight-state']; key = prefix + suffix; restoreKeys = [prefix];
    accepted = /^weather-preflight-state-v1-Linux-[1-9][0-9]*-[1-9][0-9]*$/;
  } else if (selection === 'progress') {
    const prefix = 'weather-private-progress-encrypted-v2-Linux-main-';
    if ((quick === 'true' || progress !== '')
      && (!/^[0-9]+-[1-9][0-9]*$/.test(progress) || /[\r\n]/.test(progress))) throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
    paths = ['.cache/weather-private-progress.encrypted'];
    key = prefix + (progress || suffix);
    restoreKeys = quick === 'false' && progress === '' ? [prefix] : [];
    accepted = /^weather-private-progress-encrypted-v2-Linux-main-[0-9]+-[1-9][0-9]*$/;
  } else {
    key = process.env.INPUT_KEY;
    const match = /^dmi-grib-v4-Linux-([0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3]))-([1-9][0-9]*)-([1-9][0-9]*)$/.exec(key ?? '');
    if (!match || `${match[2]}-${match[3]}` !== suffix) throw refused('DMI_RAW_SAVE_INPUT_REFUSED');
    paths = ['.cache/dmi-grib'];
    restoreKeys = [`dmi-grib-v4-Linux-${match[1]}-`, 'dmi-grib-v4-Linux-', 'dmi-grib-v3-Linux-'];
    accepted = /^dmi-grib-v[34]-Linux-[0-9]{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])-[1-9][0-9]*-[1-9][0-9]*$/;
  }
  process.chdir(ROOT);
  const matched = await cache.restoreCache(paths, key, restoreKeys, undefined, false);
  if (matched !== undefined && (typeof matched !== 'string' || matched.length > 512
    || !accepted.test(matched))) throw refused('DMI_RAW_SAVE_API_UNAVAILABLE');
  const output = process.env.GITHUB_OUTPUT;
  if (typeof output !== 'string' || !output.startsWith(`/proc/${parent}/fd/`)
    || !/^\/proc\/[1-9][0-9]*\/fd\/[0-9]+$/.test(output)) throw refused('DMI_RAW_SAVE_PIPE_FAILED');
  // This is a normal semantic cache-hit result only. The parent accepts it
  // after H's real drain and still validates the entire state+public manifest.
  fs.appendFileSync(output, `cache_hit=${matched === undefined ? 'false' : 'true'}\ncache_exact=${matched === key ? 'true' : 'false'}\n`);
}

// This fixed in-process bridge keeps the genuine holder in P. It accepts no
// paths, commands, deadline, synthetic outcome or caller-selected next consumer.
async function runSourceGeneration() {
  fixedDistributionInputs();
  if (process.argv.length !== 2 || process.env.INPUT_OPERATION !== 'source') {
    throw refused('DMI_RAW_SAVE_ARGUMENT_REFUSED');
  }
  let normal;
  try {
    normal = await import(pathToFileURL(path.join(ROOT,
      'scripts/source-normal-producer-tail.mjs')).href);
  } catch (error) { sourceFailureImportError = error; throw error; }
  sourceFailureDiagnosticReader = normal.sourceFailureDiagnostic;
  // P awaits the fixed artifact/T consumer under the SAME issuer. A Set or
  // an exit code is never used to replace those actual awaited operations.
  // This action still emits no SOURCE-complete/READY/hosted-publication flag.
  try {
    const result=await normal.runSourceNormalProducerTail();
    writeSourceWorkflowObservation(normal.sourceNormalWorkflowObservation(result));
    return result;
  }
  finally {
    // Observation after the actual same-session result/refusal. No additional
    // provider, SAVE, clock, owner or completion flag can be issued here.
    try { writeSourceOperationalControlObservation(normal.sourceNormalActionOperationalControlReport()); }
    catch { try { process.stderr.write('SOURCE_OPERATIONAL_CONTROL_REPORT_UNAVAILABLE\n'); } catch {} }
  }
}


// Only called with the genuine accessor result after the actual tail returns.
// This finite DTO is observation, not a Pages decision or a serialized owner.
function writeSourceWorkflowObservation(report) {
  const base=['source_preflight_should_run','source_preflight_dmi_changed','source_preflight_result','source_operational_action',
    'source_operational_model','source_operational_binding_current','source_central_version',
    'source_active_deployment_id','source_initial_cutover_required','source_legacy_source_required'];
  const prepared=['source_weather_outcome','source_full_validation_outcome','source_release_gate_outcome',
    'source_checkpoint_disposition_outcome','source_private_runtime_bundle_spec_outcome','source_private_runtime_write_authority_outcome',
    'source_checkpoint_save_outcome','source_weather_preflight_state_build_outcome','source_weather_preflight_state_save_outcome',
    'source_integrated_runtime_audit_outcome','source_checkpoint_build_outcome','source_private_runtime_bundle_create_outcome',
    'source_private_build_stage_seal_outcome','source_private_build_stage_upload_outcome','source_private_runtime_publish_outcome',
    'source_checkpoint_publish_outcome','source_private_runtime_anonymous_denied','source_integrated_implementation_closure_sha256',
    'source_checkpoint_disposition','source_checkpoint_disposition_sha256','source_checkpoint_dataset_id','source_checkpoint_runtime_audit_sha256'];
  if(!report||typeof report!=='object'||types.isProxy(report)||!Object.isFrozen(report)
    ||Object.keys(report).sort().join(',')!=='kind,outputs,privatePayloadIncluded,runAttempt,runId,schemaVersion,sourceHead,targetReferenceAt'
    ||report.schemaVersion!=='SOURCE_NORMAL_WORKFLOW_OBSERVATION_V1'||!['NO_WORK','PREPARED_WEATHER'].includes(report.kind)
    ||report.sourceHead!==process.env.GITHUB_SHA||report.runId!==process.env.GITHUB_RUN_ID
    ||report.runAttempt!==process.env.GITHUB_RUN_ATTEMPT||report.privatePayloadIncluded!==false
    ||!/^\d{4}-\d\d-\d\dT\d\d:00:00\.000Z$/.test(report.targetReferenceAt??'')
    ||!report.outputs||typeof report.outputs!=='object'||types.isProxy(report.outputs)||!Object.isFrozen(report.outputs))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  const expected=report.kind==='NO_WORK'?base:[...base,...prepared],outputs=report.outputs;
  if(Object.keys(outputs).sort().join(',')!==[...expected].sort().join(',')
    ||outputs.source_preflight_should_run!==(report.kind==='NO_WORK'?'false':'true'))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  for(const [key,value]of Object.entries(outputs)){
    if(typeof value!=='string'||value.length>256||/[^\x20-\x7e]/.test(value))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
    if(key.endsWith('_outcome')&&!(key==='source_weather_preflight_state_save_outcome'
      ? ['success','failure','skipped'] : ['success','failure']).includes(value))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
    if(key.endsWith('_sha256')&&!/^[a-f0-9]{64}$/.test(value))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  }
  for(const key of ['source_preflight_should_run','source_preflight_dmi_changed','source_operational_binding_current',
    'source_initial_cutover_required','source_legacy_source_required',...(report.kind==='PREPARED_WEATHER'?['source_private_runtime_anonymous_denied']:[])]){
    if(!['true','false'].includes(outputs[key]))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  }
  if(!['PROBE_RESULT','UNAVAILABLE_CONTINUE'].includes(outputs.source_preflight_result)
    ||(outputs.source_preflight_result==='UNAVAILABLE_CONTINUE'
      &&(report.kind!=='PREPARED_WEATHER'||outputs.source_preflight_dmi_changed!=='false'))
    ||!['integrated','integrated-historical-maintenance'].includes(outputs.source_operational_action)
    ||outputs.source_operational_model!=='integrated'
    ||outputs.source_operational_binding_current!==(outputs.source_operational_action==='integrated'?'true':'false')
    ||outputs.source_initial_cutover_required!=='false'||outputs.source_legacy_source_required!=='false'
    ||!/^[1-9][0-9]*$/.test(outputs.source_central_version)||!Number.isSafeInteger(Number(outputs.source_central_version)))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  if(report.kind==='PREPARED_WEATHER'&&(!['READY_PUBLISHED','MEASURED_WARMUP_PUBLISHED'].includes(outputs.source_checkpoint_disposition)
    ||!outputs.source_checkpoint_dataset_id.startsWith('rr-')||outputs.source_private_runtime_anonymous_denied!=='true'
    ||outputs.source_checkpoint_save_outcome!=='success'
    ||(outputs.source_weather_preflight_state_build_outcome==='failure'
      ? outputs.source_weather_preflight_state_save_outcome!=='skipped'
      : !['success','failure'].includes(outputs.source_weather_preflight_state_save_outcome))))throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  const lines='source_result_kind='+report.kind+'\n'+expected.map(key=>key+'='+outputs[key]+'\n').join('');
  if(Buffer.byteLength(lines)>16384)throw refused('SOURCE_WORKFLOW_OBSERVATION_INVALID');
  const output=process.env.GITHUB_OUTPUT;
  if(typeof output!=='string'||output==='')throw refused('SOURCE_WORKFLOW_OUTPUT_UNAVAILABLE');
  fs.appendFileSync(output,lines);
}

// Fixed payload-free diagnostics only; none of these fields is an admission input.
function writeSourceOperationalControlObservation(report) {
  if(report===null)return; // Early failure/no-work is not a fabricated PASSED report.
  if(report===null||typeof report!=='object'||types.isProxy(report)
    ||report.schemaVersion!=='ravradar-weather-operational-control-summary-v1'
    ||!['PASSED','DEGRADED'].includes(report.status)
    ||!['BLOCK_UNSAFE_ARTIFACT','CONTINUE_WITH_VALID_WEATHER'].includes(report.deploymentDisposition)
    ||report.sourceHead!==process.env.GITHUB_SHA||report.runId!==process.env.GITHUB_RUN_ID
    ||report.runAttempt!==process.env.GITHUB_RUN_ATTEMPT||report.privatePayloadIncluded!==false
    ||!Array.isArray(report.checks)||report.checks.length!==11)throw refused('SOURCE_CONTROL_REPORT_INVALID');
  const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');
  if(bytes.length>16384)throw refused('SOURCE_CONTROL_REPORT_INVALID');
  const parent=path.join(ROOT,'.geometry-v2-work');
  const stat=fs.lstatSync(parent);
  if(!stat.isDirectory()||stat.isSymbolicLink()||fs.realpathSync(parent)!==parent)throw refused('SOURCE_CONTROL_REPORT_INVALID');
  // One diagnostic file, separate from the ordinary collector. No overwrite,
  // working candidate, installed original or private payload is a target.
  fs.writeFileSync(path.join(parent,'weather-source-operational-control-summary.json'),bytes,{flag:'wx',mode:0o600});
  // Only fixed observation values, never should_run/should_deploy/closed/SAVE.
  const output=process.env.GITHUB_OUTPUT;
  if(typeof output==='string'&&output!=='')fs.appendFileSync(output,
    'source_operational_control_report=observed\n'
    +'source_operational_control_status='+report.status+'\n'
    +'source_operational_control_disposition='+report.deploymentDisposition+'\n');
}

// Proposed additions inside the existing fixed action; no new public export.
const retainedSourcePublicationWorkers = new Set();
function sourcePublicationContext() {
  fixedDistributionInputs();
  const env = process.env, parent = process.ppid;
  if (env.INPUT_OPERATION !== 'source' || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ID || '')
    || !/^[1-9][0-9]*$/.test(env.GITHUB_RUN_ATTEMPT || '')
    || !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '')
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || '')) {
    throw refused('SOURCE_PUBLICATION_IDENTITY_INVALID');
  }
  const command = fs.readFileSync(`/proc/${parent}/cmdline`);
  const fields = command.toString('utf8').split('\0');
  if (command.length > 16384 || fields.length !== 6 || fields[1] !== '-I'
    || fields[2] !== '-B' || fields[3] !== path.join(ROOT, 'scripts/lib/copernicus_component_process.py')
    || fields[4] !== '--source-normal-program-cohort' || fields[5] !== ''
    || process.ppid !== parent) throw refused('SOURCE_PUBLICATION_PARENT_UNPROVED');
  const output = env.GITHUB_OUTPUT;
  if (typeof output !== 'string' || !new RegExp(`^/proc/${parent}/fd/[0-9]+$`).test(output)) {
    throw refused('SOURCE_PUBLICATION_OUTPUT_UNPROVED');
  }
  const target = env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(target || '')
    || !Number.isFinite(Date.parse(target))) throw refused('SOURCE_PUBLICATION_TARGET_INVALID');
  return { parent, output, target: new Date(target).toISOString(),
    runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT, head: env.GITHUB_SHA,
    repository: env.GITHUB_REPOSITORY };
}
function sourcePublicationOwn(value, key) {
  if (value === null || typeof value !== 'object' || types.isProxy(value)) {
    throw refused('SOURCE_PUBLICATION_RESULT_INVALID');
  }
  const property = Object.getOwnPropertyDescriptor(value, key);
  if (!property || !Object.hasOwn(property, 'value')) throw refused('SOURCE_PUBLICATION_RESULT_INVALID');
  return property.value;
}
function sourcePublicationInteger(value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw refused('SOURCE_PUBLICATION_RESULT_INVALID');
  return String(value);
}
function sourcePublicationHash(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/.test(value)) throw refused('SOURCE_PUBLICATION_RESULT_INVALID');
  return value;
}
function writeSourcePublicationOutput(context, fields) {
  if (process.ppid !== context.parent) throw refused('SOURCE_PUBLICATION_PARENT_UNPROVED');
  const text = Object.entries(fields).map(([key, value]) => {
    if (!/^[a-z_]+$/.test(key) || typeof value !== 'string' || value.length > 256
      || /[\r\n\0]/.test(value)) throw refused('SOURCE_PUBLICATION_RESULT_INVALID');
    return `${key}=${value}\n`;
  }).join('');
  if (Buffer.byteLength(text) > 4096) throw refused('SOURCE_PUBLICATION_RESULT_INVALID');
  // H owns this already-open memfd. No file creation and no public workflow ACK.
  const fd = fs.openSync(context.output, fs.constants.O_WRONLY | fs.constants.O_APPEND);
  const row = { context, fields, fd, stat: null, closeAttempted: false, closed: false, first: null };
  retainedSourcePublicationWorkers.add(row);
  try {
    row.stat = fs.fstatSync(fd, { bigint: true });
    if (!row.stat.isFile() || row.stat.nlink !== 0n) throw refused('SOURCE_PUBLICATION_OUTPUT_UNPROVED');
    fs.writeFileSync(fd, text);
  } catch (error) { row.first = { value: error }; }
  try { row.closeAttempted = true; fs.closeSync(fd); }
  catch (error) { row.first ??= { value: error }; }
  try { fs.fstatSync(fd); }
  catch (error) {
    if (error !== null && typeof error === 'object' && !types.isProxy(error)
      && Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') row.closed = true;
    else row.first ??= { value: error };
  }
  if (!row.closed) row.first ??= { value: refused('SOURCE_PUBLICATION_OUTPUT_CLOSE_UNPROVED') };
  if (row.first !== null) throw row.first.value;
  retainedSourcePublicationWorkers.delete(row);
}

async function runSourceCheckpointPublish() {
  const context = sourcePublicationContext();
  const row = { context, result: null, first: null };
  retainedSourcePublicationWorkers.add(row);
  try {
    const normal = await import(pathToFileURL(path.join(ROOT,
      'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
    // The same normal CLI request factories, no request callback/credential/root
    // supplied by this worker's caller; existing RPC retry/55s contract remains.
    row.result = await normal.publishProtectedRavScoreContinuationCheckpoint({
      targetReference: context.target,
      request: normal.createProtectedRavScoreCheckpointVersionRequester(),
      rpcRequest: normal.createProtectedRavScoreCheckpointRpcRequester(),
      diagnosticRequest: normal.createProtectedRavScoreCheckpointDiagnosticRequester(),
    });
    const r = row.result;
    const published = sourcePublicationOwn(r, 'published');
    const reason = sourcePublicationOwn(r, 'reason');
    if (typeof published !== 'boolean'
      || (published ? !['protected-checkpoint-inserted', 'protected-checkpoint-updated'].includes(reason)
        : reason !== 'protected-checkpoint-already-current')
      || sourcePublicationOwn(r, 'checkpointAt') !== context.target
      || sourcePublicationOwn(r, 'targetReferenceAt') !== context.target
      || sourcePublicationOwn(r, 'continuationAvailable') !== true
      || sourcePublicationOwn(r, 'partCount') !== 673
      || sourcePublicationOwn(r, 'payloadLogged') !== false
      || sourcePublicationOwn(r, 'preexistingHistoricalVersionsPreserved') !== true
      || sourcePublicationOwn(r, 'newHistoricalVersionsRetained') !== false) {
      throw refused('SOURCE_CHECKPOINT_PUBLISH_UNPROVED');
    }
    writeSourcePublicationOutput(context, {
      checkpoint_version: sourcePublicationInteger(sourcePublicationOwn(r, 'centralVersion')),
      checkpoint_reference: context.target,
      checkpoint_reason: reason,
      checkpoint_bundle: sourcePublicationHash(sourcePublicationOwn(r, 'modelBundleSha256')),
      checkpoint_contract: sourcePublicationHash(sourcePublicationOwn(r, 'modelContractSha256')),
      checkpoint_continuation: sourcePublicationHash(sourcePublicationOwn(r, 'continuationStateContractSha256')),
    });
    retainedSourcePublicationWorkers.delete(row);
  } catch (error) { row.first ??= { value: error }; throw row.first.value; }
}

async function runSourcePrivatePublish() {
  const context = sourcePublicationContext();
  const row = { context, result: null, first: null };
  retainedSourcePublicationWorkers.add(row);
  try {
    const normal = await import(pathToFileURL(path.join(ROOT,
      'scripts/protected-private-production-runtime.mjs')).href);
    const expectedPath = path.join(ROOT, '.cache/private-production-runtime-expected.json');
    // Parent retains this exact input before launch and rechecks it after drain.
    // Normal bundle verification and publisher validation remain mandatory.
    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    const clients = normal.createProtectedPrivateRuntimeClients();
    row.result = await normal.publishProtectedPrivateProductionRuntime({
      privateRoot: '/tmp/ravradar-private-production-runtime',
      bundlePath: '/tmp/ravradar-private-production-runtime/bundle-source-successor',
      repositoryRoot: ROOT, expected, sourceHead: context.head,
      request: clients.documentRequest, storage: clients.storage,
    });
    const r = row.result, published = sourcePublicationOwn(r, 'published');
    const reason = sourcePublicationOwn(r, 'reason');
    if (typeof published !== 'boolean'
      || (published ? !['protected-private-runtime-inserted', 'protected-private-runtime-updated'].includes(reason)
        : !['protected-private-runtime-already-current', 'protected-private-runtime-content-already-current'].includes(reason))
      || sourcePublicationOwn(r, 'productionReferenceAt') !== context.target
      || sourcePublicationOwn(r, 'privatePayloadLogged') !== false
      || typeof sourcePublicationOwn(r, 'rollbackAvailable') !== 'boolean') {
      throw refused('SOURCE_PRIVATE_PUBLISH_UNPROVED');
    }
    // No same-reference migration evidence is manufactured for this normal
    // generation. The normal publisher itself rejects conflicting contents.
    const outputs = {
      private_version: sourcePublicationInteger(sourcePublicationOwn(r, 'centralVersion')),
      private_reference: context.target, private_reason: reason,
      private_bundle: sourcePublicationHash(sourcePublicationOwn(r, 'bundleContentSha256')),
      private_object: sourcePublicationHash(sourcePublicationOwn(r, 'objectSha256')),
      private_count: sourcePublicationInteger(sourcePublicationOwn(r, 'objectCount')),
      private_rollback: String(sourcePublicationOwn(r, 'rollbackAvailable')),
    };
    if (published) {
      const complete = sourcePublicationOwn(r, 'retentionCleanupComplete');
      const failures = sourcePublicationOwn(r, 'retentionCleanupFailureCount');
      if (typeof complete !== 'boolean' || !Number.isSafeInteger(failures) || failures < 0
        || complete !== (failures === 0)) throw refused('SOURCE_PRIVATE_PUBLISH_UNPROVED');
      outputs.private_retention_failures = String(failures);
    } else outputs.private_retention_failures = 'not-run';
    // Same fixed worker, same clients and same unrenewed H cutoff. The normal
    // anonymous audit must inspect THIS publisher ACK, not some later CURRENT.
    // This wrapper only narrows the normal read; its full pointer validator and
    // storage denial checks still execute inside the existing normal audit.
    row.clients = clients;
    row.auditPointer = null;
    row.auditReadStarted = false;
    row.auditFirst = null;
    row.auditRequest = async (suffix, options, operation) => {
      try {
        if (row.auditReadStarted || operation !== 'read'
          || suffix !== '?document_key=eq.' + encodeURIComponent(normal.PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey)
            + '&select=document_key,payload,version&limit=2'
          || options === null || typeof options !== 'object' || types.isProxy(options)
          || Object.keys(options).length !== 0) throw refused('SOURCE_PRIVATE_AUDIT_READ_UNPROVED');
        row.auditReadStarted = true;
        const rows = await clients.documentRequest(suffix, options, operation);
        if (!Array.isArray(rows) || types.isProxy(rows) || rows.length !== 1) {
          throw refused('SOURCE_PRIVATE_AUDIT_GENERATION_UNPROVED');
        }
        const pointer = sourcePublicationOwn(rows, '0');
        const version = sourcePublicationOwn(pointer, 'version');
        if (!(Number.isSafeInteger(version) && version > 0)
          && !(typeof version === 'string' && /^[1-9][0-9]*$/.test(version)
            && Number.isSafeInteger(Number(version)))) throw refused('SOURCE_PRIVATE_AUDIT_GENERATION_UNPROVED');
        const current = sourcePublicationOwn(sourcePublicationOwn(pointer, 'payload'), 'current');
        if (String(version) !== outputs.private_version
          || sourcePublicationOwn(current, 'productionReferenceAt') !== outputs.private_reference
          || sourcePublicationOwn(current, 'bundleContentSha256') !== outputs.private_bundle
          || sourcePublicationOwn(current, 'objectSha256') !== outputs.private_object
          || sourcePublicationInteger(sourcePublicationOwn(current, 'objectCount')) !== outputs.private_count) {
          throw refused('SOURCE_PRIVATE_AUDIT_GENERATION_UNPROVED');
        }
        row.auditPointer = pointer; // retain the exact returned input; never rewrite it
        return rows;
      } catch (error) { row.auditFirst ??= { value: error }; throw row.auditFirst.value; }
    };
    try {
      row.audit = await normal.auditProtectedPrivateRuntimeAnonymousDenial({
        request: row.auditRequest, storage: clients.storage,
      });
    } catch (error) { throw row.auditFirst !== null ? row.auditFirst.value : error; }
    const classes = sourcePublicationOwn(row.audit, 'statusClasses');
    if (row.auditPointer === null || sourcePublicationOwn(row.audit, 'anonymousReadDenied') !== true
      || sourcePublicationInteger(sourcePublicationOwn(row.audit, 'objectCount')) !== outputs.private_count
      || sourcePublicationOwn(row.audit, 'privatePayloadLogged') !== false
      || !Array.isArray(classes) || types.isProxy(classes) || classes.length !== 1
      || sourcePublicationOwn(classes, '0') !== '4xx') throw refused('SOURCE_PRIVATE_AUDIT_UNPROVED');
    outputs.private_anonymous_denied = 'true';
    writeSourcePublicationOutput(context, outputs);
    retainedSourcePublicationWorkers.delete(row);
  } catch (error) { row.first ??= { value: error }; throw row.first.value; }
}

// Proposed internal worker, appended to the fixed existing action. It depends
// on the reviewed V33 sourcePublication* guards; no exported caller API.
async function runSourceArtifactUpload() {
  const context = sourcePublicationContext();
  const action = assertArtifactDistributionSuccessor(); // Artifact requires the separately admitted SDK distribution.
  const packageFile = findPackageJSON('@actions/artifact', pathToFileURL(__filename));
  if (!packageFile || fs.realpathSync(packageFile)
    !== fs.realpathSync(path.join(action, 'node_modules/@actions/artifact/package.json'))
    || JSON.parse(fs.readFileSync(packageFile, 'utf8')).version !== '6.3.1') {
    throw refused('SOURCE_ARTIFACT_SDK_UNAVAILABLE');
  }
  const temporary = process.env.RUNNER_TEMP;
  if (typeof temporary !== 'string' || !path.isAbsolute(temporary)
    || fs.realpathSync(temporary) !== temporary) throw refused('SOURCE_ARTIFACT_PATH_UNPROVED');
  const directory = path.join(temporary, 'ravradar-private-build-stage');
  const file = path.join(directory, 'sealed.bin');
  const parents = [ROOT, temporary, directory].map(directory => {
    const stat = fs.lstatSync(directory, { bigint: true });
    if (!stat.isDirectory() || stat.isSymbolicLink() || fs.realpathSync(directory) !== directory) {
      throw refused('SOURCE_ARTIFACT_PATH_UNPROVED');
    }
    return { directory, stat };
  });
  const original = fs.lstatSync(file, { bigint: true });
  if (!original.isFile() || original.isSymbolicLink() || original.nlink !== 1n
    || original.size <= 0n || original.size > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw refused('SOURCE_ARTIFACT_FILE_UNPROVED');
  }
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  const row = { context, parents, file, fd, original, uploaded: null, readback: null,
    closeAttempted: false, closed: false, first: null };
  retainedSourcePublicationWorkers.add(row);
  let outputs;
  try {
    const same = actual => actual.isFile() && !actual.isSymbolicLink()
      && ['dev', 'ino', 'mode', 'nlink', 'size', 'mtimeNs', 'ctimeNs'].every(key => actual[key] === original[key]);
    const identity = () => {
      if (process.ppid !== context.parent) throw refused('SOURCE_PUBLICATION_PARENT_UNPROVED');
      for (const parent of parents) {
        const stat = fs.lstatSync(parent.directory, { bigint: true });
        if (!stat.isDirectory() || stat.isSymbolicLink()
          || !['dev', 'ino', 'mode'].every(key => stat[key] === parent.stat[key])
          || fs.realpathSync(parent.directory) !== parent.directory) throw refused('SOURCE_ARTIFACT_PATH_CHANGED');
      }
      if (!same(fs.fstatSync(fd, { bigint: true })) || !same(fs.lstatSync(file, { bigint: true }))) {
        throw refused('SOURCE_ARTIFACT_FILE_CHANGED');
      }
    };
    const digest = () => {
      identity();
      const hash = crypto.createHash('sha256'), buffer = Buffer.alloc(256 * 1024);
      let position = 0;
      while (position < Number(original.size)) {
        const count = fs.readSync(fd, buffer, 0, Math.min(buffer.length, Number(original.size) - position), position);
        if (!Number.isInteger(count) || count <= 0) throw refused('SOURCE_ARTIFACT_FILE_CHANGED');
        hash.update(buffer.subarray(0, count)); position += count;
      }
      if (fs.readSync(fd, buffer, 0, 1, position) !== 0) throw refused('SOURCE_ARTIFACT_FILE_CHANGED');
      identity();
      return hash.digest('hex');
    };
    const sealedSha256 = digest();
    const normal = await import('@actions/artifact');
    if (typeof normal.DefaultArtifactClient !== 'function') throw refused('SOURCE_ARTIFACT_SDK_UNAVAILABLE');
    const client = new normal.DefaultArtifactClient();
    const name = `ravradar-private-build-stage-${context.runId}-${context.attempt}`;
    // Exactly one normal upload invocation, ZIP mode and existing artifact name.
    // A failed/ambiguous finalize is not retried/adopted by this wrapper.
    row.uploaded = await client.uploadArtifact(name, [file], directory,
      { retentionDays: 1, compressionLevel: 0 });
    const id = sourcePublicationInteger(sourcePublicationOwn(row.uploaded, 'id'));
    const bytes = sourcePublicationInteger(sourcePublicationOwn(row.uploaded, 'size'));
    const zipSha256 = sourcePublicationHash(sourcePublicationOwn(row.uploaded, 'digest'));
    if (digest() !== sealedSha256) throw refused('SOURCE_ARTIFACT_FILE_CHANGED');
    row.readback = await client.getArtifact(name);
    const remote = sourcePublicationOwn(row.readback, 'artifact');
    if (sourcePublicationOwn(remote, 'name') !== name
      || sourcePublicationInteger(sourcePublicationOwn(remote, 'id')) !== id
      || sourcePublicationInteger(sourcePublicationOwn(remote, 'size')) !== bytes
      || sourcePublicationOwn(remote, 'digest') !== `sha256:${zipSha256}`) {
      throw refused('SOURCE_ARTIFACT_FINALIZATION_UNPROVED');
    }
    if (digest() !== sealedSha256) throw refused('SOURCE_ARTIFACT_FILE_CHANGED');
    outputs = { artifact_id: id, artifact_name: name, archive_bytes: bytes,
      archive_sha: zipSha256, sealed_bytes: String(original.size), sealed_sha: sealedSha256 };
  } catch (error) { row.first = { value: error }; }
  try { row.closeAttempted = true; fs.closeSync(fd); }
  catch (error) { row.first ??= { value: error }; }
  try { fs.fstatSync(fd); }
  catch (error) {
    if (error !== null && typeof error === 'object' && !types.isProxy(error)
      && Object.getOwnPropertyDescriptor(error, 'code')?.value === 'EBADF') row.closed = true;
    else row.first ??= { value: error };
  }
  if (!row.closed) row.first ??= { value: refused('SOURCE_ARTIFACT_CLOSE_UNPROVED') };
  if (row.first !== null) throw row.first.value;
  try { writeSourcePublicationOutput(context, outputs); }
  catch (error) { row.first = { value: error }; throw error; }
  retainedSourcePublicationWorkers.delete(row);
  // H must still drain the actual child/subtree and seal/close its output fd.
  // This is not a standalone SAVE/closure/SOURCE-completion receipt.
}

module.exports = { runApiWorker, runOwnedSave, runOwnedDistribution, inspectFixedPostWeatherCache };
if (require.main === module) {
  cliPhase = 'INPUT';
  const selectedSave = process.env.INPUT_OPERATION === 'source' ? runSourceGeneration
    : process.env.INPUT_OPERATION === 'upload-encrypted-progress' ? runOwnedCipherUpload
    : !process.env.INPUT_OPERATION || process.env.INPUT_OPERATION === 'save' ? runOwnedSave : null;
  const operation = process.argv.length === 2 ? selectedSave
    : process.argv.length === 3 && process.argv[2] === '--source-artifact-upload' ? runSourceArtifactUpload
    : process.argv.length === 3 && process.argv[2] === '--source-checkpoint-publish' ? runSourceCheckpointPublish
    : process.argv.length === 3 && process.argv[2] === '--source-private-publish' ? runSourcePrivatePublish
    : process.argv.length === 3 && process.argv[2] === '--fixed-api-worker' ? runApiWorker
    : process.argv.length === 3 && process.argv[2] === '--fixed-cipher-worker' ? runCipherApiWorker
    : process.argv.length === 3 && process.argv[2] === '--fixed-checkpoint-worker' ? () => runPostWeatherCacheApiWorker('checkpoint')
    : process.argv.length === 3 && process.argv[2] === '--fixed-preflight-worker' ? () => runPostWeatherCacheApiWorker('preflight')
    : process.argv.length === 3 && process.argv[2] === '--prepare-distribution' ? runOwnedDistribution
    : process.argv.length === 3 && process.argv[2] === '--fixed-distribution-worker' ? runDistributionWorker
    : process.argv.length === 3 && process.argv[2] === '--source-fixed-raw-save' ? () => runSourceSavePhase('save')
    : process.argv.length === 3 && process.argv[2] === '--source-fixed-cipher-upload' ? () => runSourceSavePhase('cipher')
    : process.argv.length === 3 && process.argv[2] === '--source-fixed-checkpoint-save' ? () => runSourceSavePhase('checkpoint')
    : process.argv.length === 3 && process.argv[2] === '--source-fixed-preflight-save' ? () => runSourceSavePhase('preflight')
    : process.argv.length === 3 && process.argv[2] === '--source-preflight-cache-read' ? runSourcePreflightCacheRead
    : process.argv.length === 3 && process.argv[2] === '--source-progress-cache-read' ? () => runSourceFixedCacheRead('progress')
    : process.argv.length === 3 && process.argv[2] === '--source-raw-cache-read' ? () => runSourceFixedCacheRead('raw') : null;
  Promise.resolve().then(() => {
    if (!operation) throw refused('DMI_RAW_SAVE_ARGUMENT_REFUSED');
    return operation();
  }).catch(error => {
    process.stderr.write('DMI_RAW_SAVE_REFUSED\n');
    process.stderr.write(refusalDiagnostic(error));
    process.stderr.write(rawCohortRefusalDiagnosticLine(error));
    if (process.env.INPUT_OPERATION === 'source') process.stderr.write(sourceFailureDiagnosticLine(error));
    process.exitCode = 1;
  });
}
