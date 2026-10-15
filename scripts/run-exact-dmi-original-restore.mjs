#!/usr/bin/env node
// One fixed historical-original acquisition. This is neither weather-main nor
// a command executor, and a process exit by itself is never a SAVE receipt.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import rawFs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { acquireWeatherAcquisitionWriter, assertWeatherAcquisitionWriter,
  retainWeatherAcquisitionWriter, releaseWeatherAcquisitionWriter }
  from './lib/weather-acquisition-writer.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN = path.join(ROOT, '.cache/dmi-grib/.original-recovery-plan.json');
const SUPERVISOR = path.join(ROOT, 'scripts/run-dmi-bulk-supervised.py');
const SHA256 = /^[a-f0-9]{64}$/;
const HEAD = /^[a-f0-9]{40}$/;
// Exact producer constructor/catch codes only. Never forward an arbitrary
// uppercase library message just because it resembles an operational code.
const PYTHON_DMI_EXACT_ORIGINAL_CODES = new Set(['UNCLASSIFIED', ...[
  'CAPTURE_INVALID', 'URL_REJECTED', 'NETWORK_DISABLED', 'REDIRECT_REJECTED', 'UNAVAILABLE',
  'HTTP_REJECTED', 'STAC_ROOT_REJECTED', 'METADATA_BOUND', 'METADATA_INVALID', 'REVISION_MISMATCH',
  'RAW_DIRECTORY_REJECTED', 'RAW_ENTRY_REJECTED', 'MANIFEST_REJECTED', 'HEADER_BOUND', 'HEADER_MISMATCH',
  'CONTENT_MISMATCH', 'COLLISION', 'CACHE_BUDGET', 'DOWNLOAD_BUDGET', 'LENGTH_MISMATCH', 'PLAN_REJECTED',
  'ASSET_BOUND', 'HEADER_REJECTED', 'MANIFEST_CHANGED', 'TRANSPORT_FAILED',
  'RUNTIME_BUDGET', 'CLEANUP_UNPROVED', 'IO_REJECTED',
].map(code => `DMI_EXACT_ORIGINAL_${code}`)]);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_key, item) =>
  item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, fields) => object(value) && Object.keys(value).length === fields.length
  && fields.every(key => Object.hasOwn(value, key));
const failure = code => Object.assign(new Error(code), { code });
const fail = code => { throw failure(code); };

// Pure validation only: this export grants no path, writer, download or runner.
export function validateExactDmiOriginalRestorePlan(bytes, environment) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > 16 * 1024 * 1024
    || !SHA256.test(environment?.DMI_EXACT_ORIGINAL_PLAN_SHA256 ?? '')
    || sha(bytes) !== environment.DMI_EXACT_ORIGINAL_PLAN_SHA256
    || !HEAD.test(environment?.GITHUB_SHA ?? '')) fail('DMI_EXACT_ORIGINAL_PLAN_REJECTED');
  let plan;
  try { plan = JSON.parse(bytes.toString('utf8')); }
  catch { fail('DMI_EXACT_ORIGINAL_PLAN_REJECTED'); }
  // The preparation entry writes this exact representation. Reject duplicate
  // fields, alternate JSON spellings and trailing payload before any child.
  if (Buffer.compare(bytes, Buffer.from(canonical(plan) + '\n')) !== 0
    || !exactKeys(plan, ['schemaVersion', 'contractId', 'binding', 'originals'])
    || plan.schemaVersion !== 1 || plan.contractId !== 'dmi-exact-original-restore-v1'
    || !Array.isArray(plan.originals) || plan.originals.length < 1 || plan.originals.length > 4096) {
    fail('DMI_EXACT_ORIGINAL_PLAN_REJECTED');
  }
  const b = plan.binding;
  if (!exactKeys(b, ['progressSource', 'progressCacheKey', 'targetReferenceAt',
    'sourceHead', 'executionHead', 'protectedBundleSha256', 'protectedDatasetId',
    'protectedProductionReferenceAt', 'protectedGeneratedAt', 'modelBindingSha256',
    'historyDemandSha256', 'originalsSha256', 'nonce'])
    || b.progressSource !== '38692413809-1'
    || b.progressCacheKey !== 'weather-private-progress-encrypted-v2-Linux-main-38692413809-1'
    || b.targetReferenceAt !== '2026-10-14T18:00:00.000Z'
    || !HEAD.test(b.sourceHead) || b.executionHead !== environment.GITHUB_SHA
    || !['protectedBundleSha256', 'modelBindingSha256', 'historyDemandSha256', 'originalsSha256']
      .every(key => typeof b[key] === 'string' && SHA256.test(b[key]))
    || b.originalsSha256 !== sha(canonical(plan.originals))
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(b.protectedDatasetId ?? '')
    || !/^[a-f0-9]{32}$/.test(b.nonce ?? '')
    || !['protectedProductionReferenceAt', 'protectedGeneratedAt'].every(key =>
      typeof b[key] === 'string' && Number.isFinite(Date.parse(b[key]))
      && new Date(b[key]).toISOString() === b[key])) fail('DMI_EXACT_ORIGINAL_PLAN_REJECTED');
  return { planSha256: sha(bytes), originalCount: plan.originals.length };
}

async function readFixedPlan() {
  // The acquisition claim guards cooperative writers. The fixed path also
  // rejects symlinked directories, hard links and replacement while reading.
  for (const dir of [ROOT, path.join(ROOT, '.cache'), path.join(ROOT, '.cache/dmi-grib')]) {
    const st = await fs.lstat(dir);
    if (!st.isDirectory() || st.isSymbolicLink() || await fs.realpath(dir) !== dir) {
      fail('DMI_EXACT_ORIGINAL_PLAN_PATH_REJECTED');
    }
  }
  const st = await fs.lstat(PLAN, { bigint: true });
  if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1n || st.size <= 0n
    || st.size > 16n * 1024n * 1024n) fail('DMI_EXACT_ORIGINAL_PLAN_PATH_REJECTED');
  const same = other => st.dev === other.dev && st.ino === other.ino && st.size === other.size
    && st.mtimeNs === other.mtimeNs && other.nlink === 1n;
  const handle = await fs.open(PLAN, rawFs.constants.O_RDONLY | (rawFs.constants.O_NOFOLLOW ?? 0));
  try {
    if (!same(await handle.stat({ bigint: true }))) fail('DMI_EXACT_ORIGINAL_PLAN_PATH_REJECTED');
    const bytes = await handle.readFile();
    if (!same(await handle.stat({ bigint: true })) || !same(await fs.lstat(PLAN, { bigint: true }))) {
      fail('DMI_EXACT_ORIGINAL_PLAN_PATH_REJECTED');
    }
    return { ...validateExactDmiOriginalRestorePlan(bytes, process.env), identity: st };
  } finally { await handle.close(); }
}

function childEnvironment() {
  // Original preparation needs private backend credentials; acquisition does
  // not. Do not pass Supabase/R2/GitHub tokens or caller-controlled paths/modes.
  const allow = ['PATH', 'LANG', 'LC_ALL', 'LD_LIBRARY_PATH', 'DMI_API_KEY',
    'GITHUB_SHA', 'DMI_EXACT_ORIGINAL_PLAN_SHA256', 'DMI_BULK_MAX_RUNTIME_SECONDS',
    'DMI_BULK_FINALIZE_RESERVE_SECONDS', 'DMI_BULK_MAX_DOWNLOAD_MB',
    'DMI_BULK_RAW_CACHE_MAX_MB', 'DMI_BULK_REQUEST_TIMEOUT_SECONDS',
    'DMI_BULK_MAX_ASSETS_PER_COLLECTION'];
  return Object.fromEntries(allow.filter(key => Object.hasOwn(process.env, key))
    .map(key => [key, process.env[key]]));
}

function collect(pipe) {
  const chunks = [];
  let length = 0, broken = false;
  pipe.on('data', chunk => {
    length += chunk.length;
    if (length > 8192) { broken = true; chunks.length = 0; }
    else if (!broken) chunks.push(chunk);
  });
  pipe.on('error', () => { broken = true; chunks.length = 0; });
  return () => {
    if (broken) fail('DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID');
    return Buffer.concat(chunks).toString('utf8');
  };
}

function validateClosure(text, exit) {
  let closure;
  try { closure = JSON.parse(text); }
  catch { fail('DMI_EXACT_ORIGINAL_RESTORE_COHORT_UNPROVED'); }
  if (!exactKeys(closure, ['schemaVersion', 'kind', 'contractId', 'workerExitCode',
    'physicalGroupClosed', 'outputClosed', 'result']) || closure.schemaVersion !== 1
    || closure.kind !== 'DMI_EXACT_ORIGINAL_RESTORE_COHORT_CLOSED'
    || closure.contractId !== 'dmi-exact-original-restore-supervisor-v1'
    || closure.physicalGroupClosed !== true || closure.outputClosed !== true
    || exit.signal !== null || ![0, 2].includes(exit.code) || closure.workerExitCode !== exit.code) {
    fail('DMI_EXACT_ORIGINAL_RESTORE_COHORT_UNPROVED');
  }
  const result = closure.result;
  if (!exactKeys(result, ['schemaVersion', 'contractId', 'status', 'code', 'originalCount',
    'uniqueAssetCount', 'downloadedAssetCount', 'reusedAssetCount', 'downloadedBytes',
    'pruningPerformed', 'replayPerformed', 'scorePerformed']) || result.schemaVersion !== 1
    || result.contractId !== 'dmi-exact-original-restore-result-v1'
    || result.status !== (exit.code === 0 ? 'RESTORED' : 'REJECTED')
    || (result.status === 'RESTORED' && result.code !== 'EXACT_ORIGINALS_RESTORED')
    || (result.status === 'REJECTED' && !PYTHON_DMI_EXACT_ORIGINAL_CODES.has(result.code))
    || !/^[A-Z][A-Z0-9_]{2,95}$/.test(result.code ?? '')
    || !['originalCount', 'uniqueAssetCount', 'downloadedAssetCount', 'reusedAssetCount', 'downloadedBytes']
      .every(key => Number.isSafeInteger(result[key]) && result[key] >= 0)
    || !['pruningPerformed', 'replayPerformed', 'scorePerformed'].every(key => result[key] === false)) {
    fail('DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID');
  }
  return result;
}

export async function runExactDmiOriginalRestore() {
  if (arguments.length !== 0 || process.argv.slice(2).length !== 0) fail('DMI_EXACT_ORIGINAL_RESTORE_ARGUMENTS_INVALID');
  let lease, child, physicallyClosed = false, firstFailure = null, interrupted = false, result;
  const interrupt = () => { interrupted = true; try { child?.kill('SIGTERM'); } catch {} };
  process.on('SIGTERM', interrupt); process.on('SIGINT', interrupt);
  try {
    // Inputs are checked again under the actual cooperative writer claim.
    const before = await readFixedPlan();
    if (process.platform !== 'linux') fail('DMI_EXACT_ORIGINAL_RESTORE_PLATFORM_REFUSED');
    lease = await acquireWeatherAcquisitionWriter();
    await assertWeatherAcquisitionWriter(lease);
    const after = await readFixedPlan();
    if (before.planSha256 !== after.planSha256) fail('DMI_EXACT_ORIGINAL_PLAN_REJECTED');
    if (interrupted) fail('DMI_EXACT_ORIGINAL_RESTORE_INTERRUPTED');
    child = spawn('python3', ['-B', SUPERVISOR, '--restore-exact-originals'], {
      cwd: ROOT, env: childEnvironment(), shell: false, stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = collect(child.stdout), diagnostics = collect(child.stderr);
    const exit = await new Promise((resolve, reject) => {
      child.once('error', () => reject(failure('DMI_EXACT_ORIGINAL_RESTORE_CHILD_FAILED')));
      child.once('close', (code, signal) => resolve({ code, signal }));
    });
    result = validateClosure(output(), exit);
    diagnostics(); // Drain without ever forwarding raw producer/library output.
    physicallyClosed = true;
    if (interrupted) fail('DMI_EXACT_ORIGINAL_RESTORE_INTERRUPTED');
    if (result.status !== 'RESTORED') fail(result.code);
    if (result.originalCount !== after.originalCount
      || result.uniqueAssetCount !== result.downloadedAssetCount + result.reusedAssetCount) {
      fail('DMI_EXACT_ORIGINAL_RESTORE_OUTPUT_INVALID');
    }
    await assertWeatherAcquisitionWriter(lease);
    const finalPlan = await readFixedPlan();
    if (finalPlan.identity.dev !== after.identity.dev || finalPlan.identity.ino !== after.identity.ino
      || finalPlan.identity.mtimeNs !== after.identity.mtimeNs || finalPlan.identity.size !== after.identity.size) {
      fail('DMI_EXACT_ORIGINAL_PLAN_REJECTED');
    }
    // Only the exact private plan this operation actually consumed, after
    // physical producer/reader cessation and before any separate RAW SAVE.
    await fs.unlink(PLAN);
    try { await fs.lstat(PLAN); fail('DMI_EXACT_ORIGINAL_PLAN_REMOVAL_UNPROVED'); }
    catch (error) { if (error?.code !== 'ENOENT') throw error; }
  } catch (error) { firstFailure = error; }
  finally {
    if (lease) {
      try {
        if (child && !physicallyClosed) retainWeatherAcquisitionWriter(lease);
        else await releaseWeatherAcquisitionWriter(lease);
      } catch (error) { firstFailure ??= error; }
    }
    process.removeListener('SIGTERM', interrupt); process.removeListener('SIGINT', interrupt);
  }
  if (firstFailure) throw firstFailure;
  if (interrupted) fail('DMI_EXACT_ORIGINAL_RESTORE_INTERRUPTED');
  return { ...result, physicalGroupClosed: true, writerClaimReleased: true,
    planRemoved: true, remoteWrites: false, cacheSaved: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runExactDmiOriginalRestore();
    if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, 'originals_restored=true\n');
    console.log(JSON.stringify(result));
  }
  catch (error) {
    console.error((PYTHON_DMI_EXACT_ORIGINAL_CODES.has(error?.code)
      || /^DMI_EXACT_ORIGINAL_[A-Z_]{1,90}$/.test(error?.code ?? ''))
      ? error.code : 'DMI_EXACT_ORIGINAL_RESTORE_REFUSED'); process.exitCode = 1;
  }
}
