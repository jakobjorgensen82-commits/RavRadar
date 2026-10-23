#!/usr/bin/env node
// PRIVATE caller/workflow prototype. No new model/SQL semantics. All runtime
// authority comes from the unchanged current-family reader and archive kernel.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { prepareCurrentFamilyColdStart, reopenCurrentFamilyColdStart, loadCurrentFamilyColdStartForTarget,
  currentFamilyColdStartAcquisitionChoices, CURRENT_FAMILY_COLD_START_CONTEXT_ENV,
  CURRENT_FAMILY_COLD_START_REENTRY_SCOPE }
  from './current-family-cold-start.mjs';
import { manifestBoundedPublicDetailsBytes } from './prepare-code-only-public-runtime.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './lib/private-weather-component-pack.mjs';
import { weatherComponentProgressCache } from './weather-component-progress-cache.mjs';
import { assertUsableDmiProgressRecovery } from './lib/verified-dmi-progress-inputs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw new Error('CURRENT_FAMILY_COLD_CLI_' + code); };
const requireFlag = (condition, code) => { if (!condition) fail(code); };
const retained = new Set();
const SAFE_HELPER_CODES = new Set(["CURRENT_FAMILY_COLD_START_ACQUISITION_CHANGED","CURRENT_FAMILY_COLD_START_ACQUISITION_OUTPUT","CURRENT_FAMILY_COLD_START_ACQUISITION_PATH","CURRENT_FAMILY_COLD_START_ACTUAL_PUBLIC_CHANGED","CURRENT_FAMILY_COLD_START_ARCHIVED_B","CURRENT_FAMILY_COLD_START_ARCHIVED_S","CURRENT_FAMILY_COLD_START_ARCHIVED_SOURCE","CURRENT_FAMILY_COLD_START_B_BULK","CURRENT_FAMILY_COLD_START_B_CONDITIONS","CURRENT_FAMILY_COLD_START_B_PUBLIC_PACK","CURRENT_FAMILY_COLD_START_BULK_DOCUMENT","CURRENT_FAMILY_COLD_START_BULK_ROW","CURRENT_FAMILY_COLD_START_BULK_ZONE","CURRENT_FAMILY_COLD_START_CANDIDATE_SEED_READBACK","CURRENT_FAMILY_COLD_START_CANDIDATE_STAGE_COLLISION","CURRENT_FAMILY_COLD_START_CAPABILITY","CURRENT_FAMILY_COLD_START_CAPTURE_OBJECTS","CURRENT_FAMILY_COLD_START_CLOSE_UNPROVED","CURRENT_FAMILY_COLD_START_CONTEXT_ARGUMENTS","CURRENT_FAMILY_COLD_START_CONTEXT_IDENTITY","CURRENT_FAMILY_COLD_START_CONTEXT_SHA","CURRENT_FAMILY_COLD_START_CURRENT_CHANGED","CURRENT_FAMILY_COLD_START_CURRENT_ROWS","CURRENT_FAMILY_COLD_START_FILE_CHANGED","CURRENT_FAMILY_COLD_START_FILE_IDENTITY","CURRENT_FAMILY_COLD_START_FILE_PATH","CURRENT_FAMILY_COLD_START_FILE_SIZE","CURRENT_FAMILY_COLD_START_NORMAL_B_PATHS","CURRENT_FAMILY_COLD_START_NORMAL_B_S_PARITY","CURRENT_FAMILY_COLD_START_NORMAL_ORIGIN_UNAVAILABLE","CURRENT_FAMILY_COLD_START_NOT_CURRENT_FAMILY","CURRENT_FAMILY_COLD_START_ORIGINAL_CANDIDATE_CHANGED","CURRENT_FAMILY_COLD_START_ORIGINAL_CANDIDATE_HASH","CURRENT_FAMILY_COLD_START_ORIGINAL_CANDIDATE_MISSING","CURRENT_FAMILY_COLD_START_ORIGINAL_CANDIDATE_SIZE","CURRENT_FAMILY_COLD_START_ORIGINAL_PACK_ENTRY","CURRENT_FAMILY_COLD_START_ORIGINAL_PACK_FORMAT","CURRENT_FAMILY_COLD_START_ORIGINAL_PACK_HEADER","CURRENT_FAMILY_COLD_START_ORIGINAL_PACK_SIZE","CURRENT_FAMILY_COLD_START_PROTECTED_S_CHANGED","CURRENT_FAMILY_COLD_START_PUBLIC_BINDING_CHANGED","CURRENT_FAMILY_COLD_START_PUBLIC_IDENTITY_CHANGED","CURRENT_FAMILY_COLD_START_PUBLIC_READ","CURRENT_FAMILY_COLD_START_PUBLIC_SIZE","CURRENT_FAMILY_COLD_START_REGISTRY","CURRENT_FAMILY_COLD_START_REGISTRY_CHANGED","CURRENT_FAMILY_COLD_START_SOURCE_CHANGED","CURRENT_FAMILY_COLD_START_SYMLINK","CURRENT_FAMILY_COLD_START_TARGET","CURRENT_FAMILY_COLD_START_TARGET_CHANGED","CURRENT_FAMILY_COLD_START_TARGET_NOT_NEWER","CURRENT_FAMILY_COLD_START_UNOWNED_FIXED_CANDIDATE","CURRENT_FAMILY_COLD_START_WORK_PATHS","CURRENT_FAMILY_COLD_START_WORKING_B_CHANGED","CURRENT_FAMILY_COLD_START_WRITE_READBACK","CURRENT_FAMILY_COLD_START_PENDING_POINT_PROMOTION","DMI_FORECAST_FILE_BOUNDS_INVALID","DMI_FORECAST_FILE_CHANGED","DMI_FORECAST_FILE_DUPLICATE_KEY","DMI_FORECAST_FILE_INVALID_FILE","DMI_FORECAST_FILE_INVALID_JSON","DMI_FORECAST_FILE_INVALID_KEY","DMI_FORECAST_FILE_INVALID_SIZE","DMI_FORECAST_FILE_RECORD_DESCRIPTOR_INVALID","DMI_FORECAST_FILE_RECORD_SIZE_LIMIT","DMI_FORECAST_FILE_SHAPE_INVALID","DMI_FORECAST_FILE_STRUCTURE_LIMIT","DMI_FORECAST_FILE_MISSING","DMI_FORECAST_FILE_READ_UNAVAILABLE","DMI_PART_CONTINUITY_NATIVE_ORIGINAL_INVALID","DMI_PART_CONTINUITY_TOTAL_RAW_SIZE_LIMIT","DMI_PART_CONTINUITY_TOTAL_COMPRESSED_SIZE_LIMIT","DMI_PART_CONTINUITY_INPUT_INVALID","DMI_PART_CONTINUITY_DOMAIN_INVALID","DMI_PART_CONTINUITY_RECORD_INVALID","DMI_PART_CONTINUITY_PART_SIZE_LIMIT","DMI_PART_CONTINUITY_PART_COMPRESSED_SIZE_LIMIT","DMI_PART_CONTINUITY_MARKER_INVALID","DMI_PART_CONTINUITY_ENTRY_INVALID","DMI_PART_CONTINUITY_COMPRESSED_DIGEST_INVALID","DMI_PART_CONTINUITY_RAW_DIGEST_INVALID","DMI_PART_CONTINUITY_JSON_INVALID","DMI_PART_CONTINUITY_DOCUMENT_INVALID","DMI_PART_CONTINUITY_TOTAL_SIZE_MISMATCH","DMI_NATIVE_PROOF_BANK_BOUND","DMI_NATIVE_PROOF_BANK_INVALID","DMI_NATIVE_PROOF_CONTEXT_CONFLICT","DMI_NATIVE_PROOF_CONTEXT_DIGEST_INVALID","DMI_NATIVE_PROOF_CONTEXT_INVALID","DMI_NATIVE_PROOF_CONTEXT_REFERENCE_MISSING","DMI_NATIVE_PROOF_DOMAIN_BOUND","DMI_NATIVE_PROOF_DONOR_BOUND","DMI_NATIVE_PROOF_ENDPOINT_MISMATCH","DMI_NATIVE_PROOF_ENTRY_DUPLICATE_OR_ORDER","DMI_NATIVE_PROOF_ENTRY_INVALID","DMI_NATIVE_PROOF_GEOMETRY_MISMATCH","DMI_NATIVE_PROOF_INPUT_BOUND","DMI_NATIVE_PROOF_NATIVE_CONFLICT","DMI_NATIVE_PROOF_NATIVE_DIGEST_INVALID","DMI_NATIVE_PROOF_NATIVE_DUPLICATE_OR_ORDER","DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING","DMI_NATIVE_PROOF_NATIVE_INVALID","DMI_NATIVE_PROOF_NATIVE_RECORD_INVALID","DMI_NATIVE_PROOF_NATIVE_REFERENCE_MISSING","DMI_NATIVE_PROOF_PROJECTION_MISMATCH","DMI_NATIVE_PROOF_RECORD_BOUND","DMI_NATIVE_PROOF_RECORD_SHAPE","DMI_NATIVE_PROOF_SCOPED_ORIGINAL_CONTEXT_UNAVAILABLE","DMI_NATIVE_PROOF_SELECTION_DUPLICATE","DMI_NATIVE_PROOF_SELECTION_INVALID","DMI_NATIVE_PROOF_SELECTION_NOT_PROVED","DMI_NATIVE_PROOF_UNREFERENCED_EVIDENCE"]);

const STAGED_STOP_CODE = `
import importlib.util,json,os,pathlib,sys
# Receipt authority belongs only to this adapter, never its producer children.
receipt_nonce=os.environ.pop("RAVRADAR_COLD_STOP_NONCE")
receipt_file=os.environ.pop("RAVRADAR_COLD_STOP_FILE")
source=pathlib.Path.cwd()/"scripts"/"run-dmi-bulk-supervised.py"
spec=importlib.util.spec_from_file_location("ravradar_actual_cold_supervisor",source)
module=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=module
spec.loader.exec_module(module)
result=module.main()
if any(getattr(module,key) for key in ("_unclosed_supervised_processes","_unclosed_supervised_outputs","_unclosed_finalizer_processes")):
    raise RuntimeError("COLD_NORMAL_SUPERVISOR_CESSATION_UNPROVED")
if type(result) is not int or not 0<=result<=255:
    raise RuntimeError("COLD_NORMAL_SUPERVISOR_EXIT_INVALID")
record={"schemaVersion":1,"kind":"ACTUAL_NORMAL_SUPERVISOR_RETURN","nonce":receipt_nonce,"exitCode":result,"closed":True}
with open(receipt_file,"x",encoding="utf-8") as output:
    output.write(json.dumps(record,separators=(",",":"))+"\\n")
    output.flush()
    os.fsync(output.fileno())
sys.exit(result)
`;
function flags() {
  requireFlag(process.env.RAVRADAR_CURRENT_FAMILY_COLD_START === 'true', 'OPT_IN_REQUIRED');
  for (const name of ['RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP', 'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY',
    'COMPLETED_PRIVATE_RUNTIME', 'CHECKPOINT_ONLY', 'QUICK_CONFIRMATION', 'NATIVE_IDENTITY_RECOVERY',
    'PRODUCE_WEATHER_HANDOFF', 'RAVSCORE_INTEGRATED_FIRST_CUTOVER', 'RAVSCORE_INTEGRATED_RETURN'])
    requireFlag(!process.env[name] || process.env[name] === 'false', 'MODE_COLLISION');
  for (const name of ['RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID', 'RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_CATALOG_SHA256',
    'RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY']) requireFlag(!process.env[name], 'MODE_COLLISION');
  requireFlag(process.env.GITHUB_REF === 'refs/heads/main' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && /^[1-9][0-9]*$/.test(process.env.GITHUB_RUN_ID ?? '') && process.env.GITHUB_RUN_ATTEMPT === '1', 'FIXED_WORKFLOW');
  const value = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  requireFlag(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value), 'TARGET');
  if (process.env.QUICK_PROGRESS_SOURCE) {
    requireFlag((process.env.QUICK_PROGRESS_SOURCE === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.progressSource
      || process.env.QUICK_PROGRESS_SOURCE === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.latestProgressSource)
      && new Date(value).toISOString() === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.targetReferenceAt
      && process.env.CHECKPOINT_TARGET_HOUR === value, 'REENTRY_SCOPE');
  } else requireFlag(!process.env.CHECKPOINT_TARGET_HOUR, 'MODE_COLLISION');
  return new Date(value).toISOString();
}
async function paths() {
  const targetReferenceAt = flags();
  requireFlag(path.resolve(process.env.GITHUB_WORKSPACE ?? '') === ROOT
    && path.isAbsolute(process.env.RUNNER_TEMP ?? ''), 'FIXED_ROOTS');
  const temporary = await fs.realpath(process.env.RUNNER_TEMP), id = process.env.GITHUB_RUN_ID + '-' + process.env.GITHUB_RUN_ATTEMPT;
  return { targetReferenceAt, workRoot: path.join(temporary, 'ravradar-current-family-cold-' + id),
    publicRoot: path.join(temporary, 'ravradar-current-family-cold-public-' + id) };
}
async function closedFile(file, maximum) {
  const before = await fs.lstat(file, { bigint: true });
  requireFlag(before.isFile() && !before.isSymbolicLink() && before.nlink === 1n
    && before.size > 0n && before.size <= BigInt(maximum), 'FILE');
  const handle = await fs.open(file, 'r'), fd = handle.fd, identity = ownFileDescriptorIdentity(handle.fd);
  let bytes, first;
  try {
    bytes = await handle.readFile(); const after = await handle.stat({ bigint: true });
    requireFlag(after.dev === before.dev && after.ino === before.ino && after.size === before.size
      && after.mtimeNs === before.mtimeNs && BigInt(bytes.length) === before.size, 'FILE_CHANGED');
  } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (!await ownedFileDescriptorClosed(fd, identity)) { retained.add(handle); first ??= new Error('CURRENT_FAMILY_COLD_CLI_CLOSE_UNPROVED'); }
  if (first) throw first; return bytes;
}
async function writeNew(file, bytes) {
  const handle = await fs.open(file, 'wx', 0o600), fd = handle.fd, identity = ownFileDescriptorIdentity(handle.fd);
  let first;
  try { await handle.writeFile(bytes); await handle.sync(); } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (!await ownedFileDescriptorClosed(fd, identity)) { retained.add(handle); first ??= new Error('CURRENT_FAMILY_COLD_CLI_CLOSE_UNPROVED'); }
  if (first) throw first;
  assert.deepEqual(await closedFile(file, bytes.length), bytes);
}
async function capturePublic(root) {
  // Exact normal six-file capture seam from run-current-weather-once, without
  // the oldSource/epoch/SQL loader or unnecessary 118-hour unpacking.
  await fs.mkdir(root, { mode: 0o700 }); const signal = AbortSignal.timeout(360000);
  const read = async (remote, local, maximum) => {
    const response = await fetch('https://ravradar.dk/' + remote,
      { redirect: 'error', cache: 'no-store', credentials: 'omit', signal });
    requireFlag(response.status === 200 && !response.redirected && response.body, 'PUBLIC_READ');
    const length = response.headers.get('content-length');
    if (length !== null) requireFlag(/^[0-9]+$/.test(length) && Number(length) <= maximum, 'PUBLIC_SIZE');
    const handle = await fs.open(path.join(root, local), 'wx', 0o600), fd = handle.fd, identity = ownFileDescriptorIdentity(handle.fd);
    let total = 0, first;
    try {
      for await (const bytes of response.body) { total += bytes.byteLength; requireFlag(total <= maximum, 'PUBLIC_SIZE'); await handle.writeFile(bytes); }
      requireFlag(total > 0, 'PUBLIC_EMPTY'); await handle.sync();
    } catch (error) { first = error; }
    try { await handle.close(); } catch (error) { first ??= error; }
    if (!await ownedFileDescriptorClosed(fd, identity)) { retained.add(handle); first ??= new Error('CURRENT_FAMILY_COLD_CLI_CLOSE_UNPROVED'); }
    if (first) throw first;
  };
  await read('data/live/manifest.json', 'manifest.json', 1048576);
  const manifest = JSON.parse(await closedFile(path.join(root, 'manifest.json'), 1048576));
  for (const [remote, local, maximum] of [
    ['data/live/public-conditions.json', 'public-conditions.json', 33554432],
    ['data/live/public-condition-details.json', 'public-condition-details.json', manifestBoundedPublicDetailsBytes(manifest.publicConditionDetailsBytes)],
    ['data/live/coastal-parts-v2.json', 'coastal-parts-v2.json', 16777216],
    ['data/zones.geojson', 'zones.geojson', 33554432],
    ['data/water-level-station-routing.json', 'water-level-station-routing.json', 4194304],
  ]) await read(remote, local, maximum);
}
async function appendEnvironment(values) {
  const file = process.env.GITHUB_ENV; requireFlag(path.isAbsolute(file ?? ''), 'GITHUB_ENV');
  const handle = await fs.open(file, 'a'), fd = handle.fd, identity = ownFileDescriptorIdentity(handle.fd); let first;
  try {
    for (const [name, value] of Object.entries(values)) requireFlag(/^[A-Z][A-Z0-9_]+$/.test(name)
      && typeof value === 'string' && !/[\r\n\0]/.test(value), 'ENV_VALUE');
    await handle.writeFile(Object.entries(values).map(([key, value]) => key + '=' + value + '\n').join('')); await handle.sync();
  } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (!await ownedFileDescriptorClosed(fd, identity)) { retained.add(handle); first ??= new Error('CURRENT_FAMILY_COLD_CLI_CLOSE_UNPROVED'); }
  if (first) throw first;
}
async function githubOutputs(values) {
  const file = process.env.GITHUB_OUTPUT; requireFlag(path.isAbsolute(file ?? ''), 'GITHUB_OUTPUT');
  const handle = await fs.open(file, 'a'), fd = handle.fd, identity = ownFileDescriptorIdentity(handle.fd); let first;
  try { await handle.writeFile(Object.entries(values).map(([key, value]) => key + '=' + value + '\n').join('')); await handle.sync(); }
  catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (!await ownedFileDescriptorClosed(fd, identity)) { retained.add(handle); first ??= new Error('CURRENT_FAMILY_COLD_CLI_CLOSE_UNPROVED'); }
  if (first) throw first;
}
async function prepare() {
  requireFlag(!process.env.QUICK_PROGRESS_SOURCE, 'REENTRY_ACTION_REQUIRED');
  requireFlag(!process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path]
    && !process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256], 'CONTEXT_COLLISION');
  const selected = await paths(); await capturePublic(selected.publicRoot);
  const result = await prepareCurrentFamilyColdStart(selected);
  const choices = currentFamilyColdStartAcquisitionChoices(result.capability);
  requireFlag(choices.outputPath === path.join(ROOT, '.cache/dmi-candidate-progress.json'), 'CANONICAL_OUTPUT');
  await appendEnvironment({ [CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path]: result.contextPath,
    [CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256]: result.contextSha256,
    DMI_BULK_DEPLOYED_FALLBACK_PATH: choices.deployedFallbackPath,
    DMI_BULK_PUBLISHED_BASELINE_PATH: choices.publishedBaselinePath });
  console.log('CURRENT_FAMILY_COLD_PREPARED_ARCHIVED_SINGLE_CANONICAL_WORKING_OUTPUT');
}
async function reopen() {
  requireFlag(!process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path]
    && !process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256], 'CONTEXT_COLLISION');
  const selected = await paths();
  requireFlag((process.env.QUICK_PROGRESS_SOURCE === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.progressSource
    || process.env.QUICK_PROGRESS_SOURCE === CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.latestProgressSource)
    && process.env.RUNNER_OS === 'Linux'
    && process.env.PROGRESS_CACHE_OUTCOME === 'success'
    && process.env.PROGRESS_CACHE_MATCHED_KEY === 'weather-private-progress-encrypted-v2-Linux-main-'
      + process.env.QUICK_PROGRESS_SOURCE, 'EXACT_PROGRESS_REQUIRED');
  await capturePublic(selected.publicRoot);
  // Reopens only the independently reconstructed, byte-equal existing archive.
  // No missing-object upload or new cold-start identity is permitted here.
  const result = await reopenCurrentFamilyColdStart({ ...selected,
    archiveId: CURRENT_FAMILY_COLD_START_REENTRY_SCOPE.archiveId });
  const report = await weatherComponentProgressCache({ mode: 'restore', repositoryRoot: ROOT,
    basePath: path.join(process.env.RUNNER_TEMP, 'weather-progress-base.json'),
    productionReferenceAt: selected.targetReferenceAt, resumeOriginalTarget: true,
    currentFamilyColdStartCapability: result.capability });
  requireFlag(report.status === 'RESTORED' && report.restored === true && report.fileCount > 0
    && report.restoredProductionReferenceAt === selected.targetReferenceAt, 'PROGRESS_RESTORE_REQUIRED');
  assertUsableDmiProgressRecovery(report.dmiProgress, { allowAbsent: false });
  await writeNew(path.join(process.env.RUNNER_TEMP, 'weather-progress-restore-report.json'),
    Buffer.from(JSON.stringify(report) + '\n'));
  const choices = currentFamilyColdStartAcquisitionChoices(result.capability);
  requireFlag(choices.outputPath === path.join(ROOT, '.cache/dmi-candidate-progress.json'), 'CANONICAL_OUTPUT');
  await appendEnvironment({ [CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path]: result.contextPath,
    [CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256]: result.contextSha256,
    DMI_BULK_DEPLOYED_FALLBACK_PATH: choices.deployedFallbackPath,
    DMI_BULK_PUBLISHED_BASELINE_PATH: choices.publishedBaselinePath });
  console.log('CURRENT_FAMILY_COLD_REOPENED_SAME_ARCHIVE_AND_AUTHENTICATED_PROGRESS');
}
async function runDmi() {
  const selected = await paths(), contextPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path],
    contextSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];
  requireFlag(contextPath === path.join(selected.workRoot, 'context.json') && /^[a-f0-9]{64}$/.test(contextSha256 ?? ''), 'CONTEXT');
  const cap = await loadCurrentFamilyColdStartForTarget({ contextPath, contextSha256,
    targetReferenceAt: selected.targetReferenceAt });
  const choices = currentFamilyColdStartAcquisitionChoices(cap), nonce = crypto.randomBytes(24).toString('hex');
  const receiptPath = path.join(selected.workRoot, 'actual-supervisor-' + nonce + '.json');
  let interrupted = null, child;
  const stopped = signum => { interrupted ??= signum; try { child?.kill(signum); } catch { /* Wait for actual close. */ } };
  const term = () => stopped('SIGTERM'), interrupt = () => stopped('SIGINT');
  process.on('SIGTERM', term); process.on('SIGINT', interrupt);
  let completion;
  try {
    completion = await new Promise((resolve, reject) => {
      let error = null;
      child = spawn('python', ['-B', '-u', '-c', STAGED_STOP_CODE], { cwd: ROOT, stdio: 'inherit', windowsHide: true,
        env: { ...process.env, DMI_BULK_OUTPUT_PATH: choices.outputPath,
          DMI_BULK_DEPLOYED_FALLBACK_PATH: choices.deployedFallbackPath,
          DMI_BULK_PUBLISHED_BASELINE_PATH: choices.publishedBaselinePath,
          RAVRADAR_COLD_STOP_FILE: receiptPath, RAVRADAR_COLD_STOP_NONCE: nonce,
          // Scheduling only, after this process authenticated the real context.
          // No parent env/input, budget, native proof or numerical grant changes.
          RAVRADAR_DMI_STRICT_CURRENT_LEAD_POLICY: 'authenticated-current-family-cold-catch-up-v1' } });
      child.once('error', failure => { error ??= failure; });
      child.once('close', (code, signal) => error ? reject(error) : resolve({ code, signal }));
    });
  } finally { process.off('SIGTERM', term); process.off('SIGINT', interrupt); }
  if (interrupted || completion.signal !== null) fail('PRODUCER_INTERRUPTED');
  let receipt;
  try { receipt = JSON.parse(await closedFile(receiptPath, 2048)); }
  catch { await githubOutputs({ current_family_cold_producer_closed: 'false' }); fail('PRODUCER_STOP_UNPROVED'); }
  requireFlag(Object.keys(receipt).sort().join(',') === 'closed,exitCode,kind,nonce,schemaVersion'
    && receipt.schemaVersion === 1 && receipt.kind === 'ACTUAL_NORMAL_SUPERVISOR_RETURN'
    && receipt.nonce === nonce && receipt.closed === true && receipt.exitCode === completion.code, 'PRODUCER_STOP_UNPROVED');
  // This proves actual normal supervisor return/group and pipe closure only,
  // not READY, download/SAVE/upload, new numerical data or production success.
  await githubOutputs({ current_family_cold_producer_closed: 'true' });
  await writeNew(path.join(selected.workRoot, 'actual-producer-closed.json'), Buffer.from(JSON.stringify({
    schemaVersion: 1, kind: 'ACTUAL_COLD_PRODUCER_CLOSED', contextSha256, receiptSha256: sha(await closedFile(receiptPath, 2048)),
    exitCode: completion.code, productionReferenceAt: selected.targetReferenceAt }) + '\n'));
  process.exitCode = completion.code;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve().then(() => {
    requireFlag(process.argv.length === 3, 'ARGUMENTS');
    if (process.argv[2] === 'prepare') return prepare();
    if (process.argv[2] === 'reopen') return reopen();
    if (process.argv[2] === 'run-dmi') return runDmi();
    fail('ACTION');
  }).catch(error => {
    console.error((/^CURRENT_FAMILY_COLD_CLI_[A-Z0-9_]+$/.test(error.message ?? '')
      || SAFE_HELPER_CODES.has(error.message))
      ? error.message : 'CURRENT_FAMILY_COLD_CLI_REFUSED'); process.exitCode = 1;
  });
}
