// Private, read-only first-PART qualification, not production activation.
// Input ownership/authentication is the existing fixed saved-input caller's.
import fs from 'node:fs/promises';
import { fstatSync, constants } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { discoverCommittedCoherentOriginalBootstrap, SAVED_FORECAST_121_ROLE }
  from './coherent-current-original-bootstrap.mjs';
import { reprojectCommittedCoherentCurrentOriginals } from './reproject-coherent-current-originals.mjs';
import { packDmiPartContinuity, unpackDmiPartContinuity } from './dmi-part-continuity.mjs';
import { writeDmiForecastFileAtomic, readDmiForecastFile } from './dmi-forecast-file.mjs';
import { buildRavScoreRawCurrentRetention } from '../plan-ravscore-current-history.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAX_BYTES = 192 * 1024 * 1024;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const refuse = code => { throw new Error('COHERENT_CURRENT_CACHED_PROOF_' + code); };
const sameStat = (a, b) => ['dev', 'ino', 'size', 'mtimeMs'].every(key => a[key] === b[key]);
const ownedHandles = new Set();
const workerRefusals = new Set(['RAW_CAPTURE_UNAVAILABLE', 'RAW_ACQUISITION_UNRESOLVED',
  'RAW_CAPTURE_AMBIGUOUS', 'RAW_MANIFEST_BINDING_INVALID', 'RAW_FILE_INVALID', 'RAW_FILE_BOUND',
  'RAW_INVENTORY_INVALID', 'MANIFEST_INVALID', 'REQUEST_INVALID', 'REQUEST_CHANGED', 'MANIFEST_CHANGED',
  'OWNED_CAPTURE_MISMATCH', 'CAPTURE_INVALID', 'STEP_CAPTURE_MISMATCH', 'IDENTITY_MISMATCH',
  'IDENTITY_AMBIGUOUS', 'RUNTIME_BOUND', 'WORK_BUDGET_BOUND', 'REFERENCE_BOUND', 'CAPTURE_BOUND',
  'PART_BOUND', 'CACHE_ONLY_REQUIRED', 'LINUX_OWNED_READER_REQUIRED', 'EOF_UNPROVED', 'CLOSE_UNPROVED',
  'OWNERSHIP_UNPROVED', 'DECODE_CHANGED', 'DECODE_FAILED', 'DECODE_MISMATCH',
  'PRODUCER_PATH_INVALID', 'RAW_PATH_INVALID', 'OUTPUT_PATH_INVALID', 'OUTPUT_BOUND',
  'OUTPUT_WRITE_FAILED', 'OUTPUT_CLOSE_UNPROVED', 'ARGUMENT_INVALID',
  'SUPERVISOR_ARGUMENT_INVALID', 'SUPERVISOR_SOURCE_INVALID', 'SUPERVISOR_OUTPUT_BOUND',
  'SUPERVISOR_OUTPUT_INVALID', 'SUPERVISOR_FAILED', 'WORKER_REFUSED']);
const proofRefusals = new Set(['FILE_BOUND', 'FD_CLOSE_UNPROVED', 'FILE_INVALID', 'FILE_CHANGED',
  'WORKER_ARGUMENT', 'WORKER_REFUSED', 'WORKER_RECEIPT', 'CACHE_ROOT', 'FIRST_PART_ONLY',
  'METADATA_UNRESOLVED', 'DECODE_CHANGED', 'DECODE_SHAPE', 'SAVED_BANK_INVENTORY',
  'ROUNDTRIP_EXISTS', 'ROUNDTRIP_CHANGED']);
const projectionRefusals = new Set(['WORK_OR_RUNTIME_BOUND', 'ENVELOPE_BINDING', 'REQUEST_DUPLICATE',
  'DECODE_REQUEST_INVENTORY', 'DECODE_BYTES_BOUND', 'DECODE_NATIVE_IDENTITY', 'DECODE_NATIVE_STEP',
  'CONTEXT_DOCUMENT_BOUND', 'CONTEXT_ROW_BOUND', 'METADATA_REQUIRED', 'UNEXPECTED_DECODE',
  'METADATA_CHANGED', 'PART_INVENTORY', 'SELECTION_STATE_CHANGED', 'SELECTION_ROLE_CHANGED',
  'INPUT_BOUND', 'SELECTION_CHANGED', 'SELECTION_DOMAIN_BOUND', 'OUTPUT_BYTES_BOUND', 'RECORD_BOUND']);
export function cachedCoherentOriginalFailureCode(error) {
  for (const [prefix, known] of [['COHERENT_CURRENT_ORIGINAL_', workerRefusals],
    ['COHERENT_CURRENT_CACHED_PROOF_', proofRefusals], ['COHERENT_CURRENT_REPROJECTION_', projectionRefusals]]) {
    if (typeof error?.message === 'string' && error.message.startsWith(prefix)
      && known.has(error.message.slice(prefix.length))) return error.message;
  }
  return 'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED';
}

async function closeOwned(handle, fd, primary) {
  try { await handle.close(); } catch (error) { primary ??= error; }
  let closed = false;
  try { fstatSync(fd); }
  catch (error) { if (error?.code === 'EBADF') closed = true; else primary ??= error; }
  if (closed) ownedHandles.delete(handle);
  else primary ??= new Error('COHERENT_CURRENT_CACHED_PROOF_FD_CLOSE_UNPROVED');
  if (primary) throw primary;
}

async function writeExclusive(file, bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 2 || bytes.length > MAX_BYTES) refuse('FILE_BOUND');
  const handle = await fs.open(file, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL
    | (constants.O_NOFOLLOW ?? 0), 0o600);
  ownedHandles.add(handle); const fd = handle.fd;
  let primary = null;
  try { await handle.writeFile(bytes); await handle.sync(); }
  catch (error) { primary = error; }
  await closeOwned(handle, fd, primary);
}

async function readClosed(file, maximumBytes = MAX_BYTES, minimumBytes = 2) {
  const before = await fs.lstat(file);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1
    || before.size < minimumBytes || before.size > maximumBytes) refuse('FILE_INVALID');
  const handle = await fs.open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  ownedHandles.add(handle); const fd = handle.fd;
  let primary = null, bytes = null;
  try {
    if (!sameStat(before, await handle.stat())) refuse('FILE_CHANGED');
    bytes = await handle.readFile();
    if (bytes.length !== before.size || !sameStat(before, await handle.stat())
      || !sameStat(before, await fs.lstat(file))) refuse('FILE_CHANGED');
  } catch (error) { primary = error; }
  await closeOwned(handle, fd, primary);
  return bytes;
}

async function closedWorker(pythonExecutable, requestSha256) {
  if (typeof pythonExecutable !== 'string' || !pythonExecutable || !/^[a-f0-9]{64}$/.test(requestSha256)) refuse('WORKER_ARGUMENT');
  const logs = path.join(ROOT, '.cache/coherent-current-original-worker');
  await fs.mkdir(logs, { recursive: false, mode: 0o700 });
  const stdout = await fs.open(path.join(logs, 'whole.stdout'), 'wx', 0o600);
  ownedHandles.add(stdout);
  const stderr = await fs.open(path.join(logs, 'whole.stderr'), 'wx', 0o600);
  ownedHandles.add(stderr);
  const stdoutFd = stdout.fd, stderrFd = stderr.fd;
  let primary = null, code = null, signal = null;
  try {
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
      !/(?:SECRET|TOKEN|PASSWORD|API_KEY|ACCESS_KEY)/i.test(key)
      && !/^(?:SUPABASE_|RAVRADAR_R2_|WEATHER_PROGRESS_|DMI_|COPERNICUS|CMEMS_|OPEN_METEO_|MET_NORWAY_)/i.test(key)));
    // The fixed normal owner handles timeout/interruption and proves its group
    // stopped. Do not kill/restart it here merely because observation expires.
    const child = spawn(pythonExecutable, ['-I', '-B', '-u',
      path.join(ROOT, 'scripts/run-coherent-current-originals-supervised.py'),
      '--request-sha256', requestSha256], { cwd: ROOT, env: environment,
      windowsHide: true, stdio: ['ignore', stdoutFd, stderrFd] });
    const terminal = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (exitCode, exitSignal) => resolve({ code: exitCode, signal: exitSignal }));
    });
    code = terminal.code; signal = terminal.signal;
  } catch (error) { primary = error; }
  // Both descriptors were inherited by the specific child. Only actual close
  // above, never a timeout or marker, permits reading this closed transcript.
  try { await closeOwned(stdout, stdoutFd, primary); } catch (error) { primary ??= error; }
  try { await closeOwned(stderr, stderrFd, primary); } catch (error) { primary ??= error; }
  if (primary) throw primary;
  const stdoutBytes = await readClosed(path.join(logs, 'whole.stdout'), 32 * 1024, 0);
  const stderrBytes = await readClosed(path.join(logs, 'whole.stderr'), 32 * 1024, 0);
  // Preserve whole transcripts privately on every failure. Never expose them.
  if (code !== 0 || signal !== null || stderrBytes.length !== 0) {
    try {
      const rejected = JSON.parse(stderrBytes);
      const known = cachedCoherentOriginalFailureCode({ message: rejected?.code });
      if (rejected?.status === 'UNRESOLVED' && rejected.nativeAdmissionPerformed === false
        && known !== 'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED') throw new Error(known);
    } catch (error) {
      if (cachedCoherentOriginalFailureCode(error) !== 'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED') throw error;
    }
    refuse('WORKER_REFUSED');
  }
  let receipt;
  try { receipt = JSON.parse(stdoutBytes); } catch { refuse('WORKER_RECEIPT'); }
  if (receipt?.schemaVersion !== 1 || receipt.kind !== 'COHERENT_CURRENT_ORIGINAL_COHORT_CLOSED'
    || receipt.workerExitCode !== 0 || receipt.physicalGroupClosed !== true
    || receipt.outputClosed !== true || receipt.result?.status !== 'DECODED_PRIVATE_NOT_ADMITTED'
    || receipt.result.nativeAdmissionPerformed !== false) refuse('WORKER_RECEIPT');
  return receipt.result;
}

export async function proveCachedCoherentCurrentOriginals({ input: normalInput, pythonExecutable } = {}) {
  const cache = await fs.lstat(path.join(ROOT, '.cache'));
  if (!cache.isDirectory() || cache.isSymbolicLink()) refuse('CACHE_ROOT');
  const input = { ...normalInput, includeSavedForecast121: true };
  if (input.registry?.partCount !== 1 || input.persistedHourlyByPart?.size !== 1) refuse('FIRST_PART_ONLY');
  const metadata = discoverCommittedCoherentOriginalBootstrap(input);
  if (!['METADATA_BOUND', 'NO_BOOTSTRAP_REQUIRED'].includes(metadata.summary.status)) refuse('METADATA_UNRESOLVED');
  let projection, decoderReceipt = null;
  if (metadata.summary.status === 'METADATA_BOUND') {
    const requestFile = path.join(ROOT, '.cache/coherent-current-original-requests.json');
    const requestBytes = Buffer.from(JSON.stringify(metadata) + '\n');
    await writeExclusive(requestFile, requestBytes);
    const requestSha256 = sha(requestBytes);
    decoderReceipt = await closedWorker(pythonExecutable, requestSha256);
    const output = await readClosed(path.join(ROOT, '.cache/coherent-current-native-originals.json'));
    if (decoderReceipt.bytes !== output.length || decoderReceipt.sha256 !== sha(output)
      || !requestBytes.equals(await readClosed(requestFile))) refuse('DECODE_CHANGED');
    let decodedEnvelope;
    try { decodedEnvelope = JSON.parse(output); } catch { refuse('DECODE_SHAPE'); }
    projection = reprojectCommittedCoherentCurrentOriginals({ input, metadata,
      requestSha256, decodedEnvelope });
  } else projection = reprojectCommittedCoherentCurrentOriginals({ input, metadata });
  const saved = projection.privateProofBanks.filter(bank => bank.sourceRole === SAVED_FORECAST_121_ROLE);
  if (saved.length !== 1) refuse('SAVED_BANK_INVENTORY');
  const [[partId, persisted]] = input.persistedHourlyByPart;
  const parts = Object.entries(input.registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));
  if (parts.length !== 1 || parts[0].partId !== partId || saved[0].partId !== partId) refuse('SAVED_BANK_INVENTORY');
  const record = { zoneId: 'PART::' + partId, point: persisted.point, hourly: persisted.hourly };
  const before = JSON.stringify(record);
  const packed = await packDmiPartContinuity(new Map([[partId, record]]), parts,
    input.boundary.productionReferenceAt, { nativeCurrentProofsByPart: new Map([[partId, saved[0].bank]]) });
  const roundtripFile = path.join(ROOT, '.cache/coherent-current-first-part-forecast.json');
  // A proof-only one-PART normal codec/IO roundtrip, NOT a replacement for the
  // authentic national B file. No copied payload is labelled an original B.
  if (await fs.lstat(roundtripFile).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) refuse('ROUNDTRIP_EXISTS');
  await writeDmiForecastFileAtomic(roundtripFile, { schemaVersion: 2, zones: {}, partContinuity: packed });
  const readback = await readDmiForecastFile(roundtripFile);
  const restored = await unpackDmiPartContinuity(readback.partContinuity, parts, input.productionReferenceAt);
  const after = restored.get(partId);
  if (restored.size !== 1 || !isDeepStrictEqual(after?.hourly, persisted.hourly)
    || !isDeepStrictEqual(after?.point, persisted.point) || JSON.stringify(record) !== before) refuse('ROUNDTRIP_CHANGED');
  const retention = buildRavScoreRawCurrentRetention({ ...input, persistedHourlyByPart: restored });
  if (ownedHandles.size) refuse('FD_CLOSE_UNPROVED');
  return { schemaVersion: 1, kind: 'CURRENT586_CACHED_ORIGINAL_PROJECTION',
    status: 'FIRST_PART_PROVED_PRIVATE_ONLY', scope: 'FIRST_FAILED_PART_SAVED_121_AND_FORWARD_HISTORY',
    metadataCounts: metadata.summary.counts, reprojectedCounts: projection.summary.counts,
    decodedRequests: decoderReceipt?.requestCount ?? 0, decodedCaptures: decoderReceipt?.captureCount ?? 0,
    savedHours: persisted.hourly.length, bankSelections: saved[0].bank?.selections.length ?? 0,
    normalCodecRoundtripProved: true, normalRetentionAfterRoundtripProved: true,
    retentionCaptureCount: retention.captures.length, originalRowsChanged: false,
    oldProductionReferencePreserved: true, decoderPhysicalGroupClosed: decoderReceipt !== null,
    rawReadPerformed: decoderReceipt !== null, nativeAdmissionPerformed: false,
    productionActivated: false, publicDeploymentProved: false, nationalCoverageProved: false,
    privatePayloadIncluded: false };
}
