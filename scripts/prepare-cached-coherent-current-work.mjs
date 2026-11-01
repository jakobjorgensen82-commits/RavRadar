// Default-OFF ordinary working derivation. No B/S write, provider, score,
// selection, model issuance or production/publication authority is created.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual as equal, types } from 'node:util';
import { discoverCommittedCoherentOriginalBootstrap, SAVED_FORECAST_121_ROLE }
  from './lib/coherent-current-original-bootstrap.mjs';
import { saved121DirectSelection } from './lib/coherent-original-source-views.mjs';
import { decodeCommittedCoherentOriginalRequests, cachedCoherentOriginalFailureCode }
  from './lib/prove-cached-coherent-current-originals.mjs';
import { reprojectCommittedCoherentCurrentOriginals, validatedCommittedCoherentCurrentOriginals,
  COHERENT_DISTINCT_READ_CAPTURE_MODE }
  from './lib/reproject-coherent-current-originals.mjs';
import { PROTECTED_DMI_NATIVE_PROOF_LIMITS as LIMIT } from './lib/protected-dmi-native-current-proofs.mjs';
import { packDmiPartContinuity, unpackDmiPartContinuity,
  assertDmiPartContinuityTotalSize } from './lib/dmi-part-continuity.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord, writeDmiForecastRecords }
  from './lib/dmi-forecast-file.mjs';
import { buildRavScoreRawCurrentRetention } from './plan-ravscore-current-history.mjs';
import { ownFileDescriptorIdentity, ownedFileDescriptorClosed }
  from './lib/private-weather-component-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORECAST = path.join(ROOT, 'data/live/dmi-forecast-cache.json');
const STAGE = path.join(ROOT, '.cache/coherent-current-national-work.json');
const preparedStages = new WeakMap(); // Local owned stage, NOT native proof/PASS cache.
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const WORK_REFUSALS = Object.freeze(["CACHE_ROOT","CAPTURE_BOUND","CLOSE_UNPROVED","INPUT_FILE_CHANGED","INPUT_FILE_INVALID","METADATA_RUNTIME_BOUND","METADATA_UNRESOLVED","METADATA_WORK_BOUND","NATIONAL_INVENTORY","OUTPUT_BYTES_BOUND","OWNED_STAGE_REQUIRED","PART_INVENTORY","PROJECTION_RUNTIME_BOUND","REFERENCE_BOUND","REQUEST_BYTES_BOUND","REQUEST_INVENTORY","RETENTION_CAPTURE_BOUND","ROUNDTRIP_CHANGED","SAVED_BANK_INVENTORY","STAGE_CHANGED","STAGE_EXISTS"]);
const workFailures = new WeakMap(); // Exact own Error identity, never a persisted PASS/error token.
function workFailure(code) {
  const error = new Error('COHERENT_CURRENT_WORK_' + code);
  if (WORK_REFUSALS.includes(code)) workFailures.set(error, error.message);
  return error;
}
const refuse = code => { throw workFailure(code); };
// Diagnostic only: the normal seven-field reader also requires the actual
// phase + qualified pinned source frame. Unknown/foreign WORK errors stay unknown.
export function coherentCurrentWorkFailureCode(error) {
  const own = workFailures.get(error);
  if (own !== undefined) return own;
  if (types.isProxy(error) || !types.isNativeError(error)) return 'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED';
  const message = Object.getOwnPropertyDescriptor(error, 'message');
  if (!message || !Object.hasOwn(message, 'value') || typeof message.value !== 'string') {
    return 'COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED';
  }
  return cachedCoherentOriginalFailureCode(error); // Existing closed decoder/reprojection catalogs only.
}
const sameObject = (a, b) => ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => a[key] === b[key]);
const identity = stat => Object.fromEntries(['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].map(key => [key, String(stat[key])]));
const elapsedMilliseconds = started => Number((process.hrtime.bigint() - started) / 1_000_000n);
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

async function measuredFile(file, optional = false) {
  const absolute = path.resolve(file);
  let before;
  try { before = await fs.lstat(absolute, { bigint: true }); }
  catch (error) { if (optional && error?.code === 'ENOENT') return null; throw error; }
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1n
    || await fs.realpath(absolute) !== absolute) refuse('INPUT_FILE_INVALID');
  const handle = await fs.open(absolute, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const fd = handle.fd, descriptorIdentity = ownFileDescriptorIdentity(fd);
  // A truthy container preserves the exact first thrown value, even null,
  // undefined, false, zero or an empty string.
  let failure, hash, bytes = 0;
  try {
    hash = crypto.createHash('sha256');
    const buffer = Buffer.alloc(256 * 1024);
    if (!sameObject(before, await handle.stat({ bigint: true }))) refuse('INPUT_FILE_CHANGED');
    for (;;) {
      const read = await handle.read(buffer, 0, buffer.length, bytes);
      if (!read.bytesRead) break;
      bytes += read.bytesRead;
      if (BigInt(bytes) > before.size) refuse('INPUT_FILE_CHANGED');
      hash.update(buffer.subarray(0, read.bytesRead));
    }
    if (BigInt(bytes) !== before.size || !sameObject(before, await handle.stat({ bigint: true }))
      || !sameObject(before, await fs.lstat(absolute, { bigint: true }))) refuse('INPUT_FILE_CHANGED');
  } catch (error) { failure = { error }; }
  try { await handle.close(); } catch (error) { failure ??= { error }; }
  try {
    if (!await ownedFileDescriptorClosed(fd, descriptorIdentity)) {
      failure ??= { error: workFailure('CLOSE_UNPROVED') };
    }
  } catch (error) { failure ??= { error }; }
  // EBADF or a normally qualified DIFFERENT descriptor identity proves only
  // our original is gone. Never close a reused fd or retry an uncertain close.
  if (failure) throw failure.error;
  return { file: absolute, ...identity(before), sha256: hash.digest('hex') };
}

export async function snapshotCoherentCurrentWorkInputs() {
  // Exact ordinary mutable inputs. The authentic original B/S are separately
  // verified by the existing caller before/after; never relabel these as B.
  const files = [[FORECAST, false],
    [path.join(ROOT, '.cache/deployed-dmi-bulk-cache.json'), false],
    [path.join(ROOT, '.cache/dmi-candidate-progress.json'), true],
    [path.join(ROOT, '.cache/dmi-active-complete.json'), true]];
  const historical = process.env.DMI_PART_CONTINUITY_DONOR_PATH;
  if (historical !== undefined) {
    if (!path.isAbsolute(historical)) refuse('INPUT_FILE_INVALID');
    files.push([historical, false]); // SAME existing optional historical input.
  }
  return Promise.all(files.map(async ([file, optional]) => ({ file: path.resolve(file), optional,
    measured: await measuredFile(file, optional) })));
}
export async function assertCoherentCurrentWorkInputs(before) {
  if (!equal(before, await snapshotCoherentCurrentWorkInputs())) refuse('INPUT_FILE_CHANGED');
}

function partInput(base, part, persisted) {
  return { registry: { ...base.registry, partCount: 1, zones: { [part.zoneId]: [part] } },
    conditions: { ...base.conditions, coastalParts: { ...base.conditions.coastalParts,
      parts: { [part.partId]: base.conditions.coastalParts.parts[part.partId] } } },
    checkpoint: { ...base.checkpoint, states: { [part.partId]: base.checkpoint.states[part.partId] } },
    boundary: base.boundary, zones: base.zones, productionReferenceAt: base.productionReferenceAt,
    protectedBulk: base.protectedBulk, progressCandidate: base.progressCandidate,
    progressActive: base.progressActive, historicalBulk: base.historicalBulk,
    protectedCompanionContexts: base.protectedCompanionContexts, liveCurrentPilot: base.liveCurrentPilot,
    persistedHourlyByPart: persisted, includeSavedForecast121: true };
}
async function readPart(index, descriptor, part, target) {
  const entry = await readDmiForecastRecord(index, descriptor);
  if (entry.partId !== part.partId) refuse('PART_INVENTORY');
  return unpackDmiPartContinuity({ ...index.continuity.metadata, partCount: 1,
    rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes, entries: [entry] }, [part], target);
}

// BEGIN national coherent work capacity accounting
function chargeNationalMetadataRequests(budget, metadata) {
  // Charge the exact request-array wire bytes BEFORE retaining this PART.
  // The complete final envelope is still checked independently below.
  for (const request of metadata.privateRequests) {
    const bytes = Buffer.byteLength(JSON.stringify(request));
    const next = budget.bytes + bytes + (budget.requests ? 1 : 0);
    if (!Number.isSafeInteger(next) || next > LIMIT.bankBytes) refuse('REQUEST_BYTES_BOUND');
    budget.bytes = next; budget.requests++;
  }
}
function proofBankBytes(bank) {
  let bytes = 512;
  for (const records of [bank.contexts, bank.nativeRows, bank.selections]) for (const record of records) {
    bytes += Buffer.byteLength(canonical(record)) + 2;
    if (!Number.isSafeInteger(bytes) || bytes > LIMIT.bankBytes) refuse('OUTPUT_BYTES_BOUND');
  }
  return bytes;
}
// END national coherent work capacity accounting

function capacityStage(phase, counters = {}) {
  const memory = process.memoryUsage();
  console.log(JSON.stringify({ kind: 'COHERENT_CURRENT_WORK_CAPACITY', phase,
    memoryBytes: { rss: memory.rss, heapUsed: memory.heapUsed,
      external: memory.external, arrayBuffers: memory.arrayBuffers },
    maximumRssBytes: process.resourceUsage().maxRSS * 1024,
    ...counters, privatePayloadIncluded: false }));
}

// BEGIN validated coherent RAW transport retention
// ONLY the already globally validated decoder objects enter here. These pins
// protect exact measured bytes from eviction; they are never native admission.
function validatedTransportRetentionCaptures(originals) {
  const captures = new Map();
  for (const original of originals?.values() ?? []) {
    // Strict mode read the original capture itself. Explicit distinct-read
    // mode retains its truthful measured transport, never the old acquisition.
    const capture = original.transportCapture ?? original.capture;
    const key = canonical(capture);
    captures.set(key, Object.freeze({ ...capture }));
    if (captures.size > 4096) refuse('RETENTION_CAPTURE_BOUND');
  }
  return Object.freeze([...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([, capture]) => capture));
}
// END validated coherent RAW transport retention

function combineMetadata(metas, boundary, started, requestBudget) {
  const counts = {}, requests = [], ids = new Set(), captures = new Set();
  let workUnits = 0;
  let historyReferences = 0, savedReferences = 0;
  for (const metadata of metas.values()) {
    if (!['METADATA_BOUND', 'NO_BOOTSTRAP_REQUIRED'].includes(metadata.summary.status)
      || !equal(metadata.privateBinding, boundary)) refuse('METADATA_UNRESOLVED');
    workUnits += metadata.summary.timing.workUnits;
    if (!Number.isSafeInteger(workUnits) || workUnits < 0) refuse('METADATA_UNRESOLVED');
    if (workUnits > LIMIT.parts * (LIMIT.donorDocuments * LIMIT.donorRowsPerPart
      + (124 + LIMIT.hoursPerPart) * 2 * LIMIT.candidatesPerPart)) refuse('METADATA_WORK_BOUND');
    for (const [key, value] of Object.entries(metadata.summary.counts)) {
      if (!Number.isSafeInteger(value) || value < 0) refuse('METADATA_UNRESOLVED');
      counts[key] = (counts[key] ?? 0) + value;
    }
    for (const request of metadata.privateRequests) {
      if (ids.has(request.requestId)) refuse('REQUEST_INVENTORY');
      ids.add(request.requestId); requests.push(request);
      captures.add(canonical(request.capture));
      if (captures.size > 4096) refuse('CAPTURE_BOUND');
      if (request.sourceRole === SAVED_FORECAST_121_ROLE) savedReferences += request.selectionReferences.length;
      else historyReferences += request.selectionReferences.length;
      if (historyReferences > 2 * LIMIT.parts * 124
        || savedReferences > 2 * LIMIT.parts * LIMIT.hoursPerPart) refuse('REFERENCE_BOUND');
    }
  }
  requests.sort((a, b) => a.requestId.localeCompare(b.requestId));
  const first = metas.values().next().value;
  const metadata = { summary: { ...first.summary, status: requests.length ? 'METADATA_BOUND' : 'NO_BOOTSTRAP_REQUIRED',
    counts, timing: { workUnits, runtimeMilliseconds: elapsedMilliseconds(started) }, requestCount: requests.length },
    privateBinding: boundary, privateRequests: requests };
  // Aggregate counts are not authentication. The normal worker validates the
  // whole exact request graph/cohort; no per-PART decoder budget is multiplied.
  if (requests.length !== requestBudget.requests) refuse('REQUEST_INVENTORY');
  const envelopeBytes = Buffer.byteLength(JSON.stringify(metadata) + '\n');
  if (envelopeBytes > LIMIT.bankBytes) refuse('REQUEST_BYTES_BOUND');
  return { metadata, envelopeBytes };
}

export async function prepareCachedCoherentCurrentWork(base) {
  const { registry, forecast, workingInputs } = base;
  const cache = await fs.lstat(path.join(ROOT, '.cache'));
  if (!cache.isDirectory() || cache.isSymbolicLink() || await fs.realpath(path.join(ROOT, '.cache')) !== path.join(ROOT, '.cache')) refuse('CACHE_ROOT');
  if (registry?.partCount !== LIMIT.parts || forecast?.file !== FORECAST || !forecast.continuity
    || forecast.continuity.metadata.partCount !== LIMIT.parts
    || forecast.continuity.entries.length !== LIMIT.parts) refuse('NATIONAL_INVENTORY');
  await assertCoherentCurrentWorkInputs(workingInputs);
  if (await fs.lstat(STAGE).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) refuse('STAGE_EXISTS');
  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) =>
    entries.map(part => ({ ...part, zoneId }))).sort((a, b) => a.partId.localeCompare(b.partId));
  const descriptors = new Map(), partIds = new Set(parts.map(part => part.partId));
  if (parts.length !== LIMIT.parts || partIds.size !== LIMIT.parts) refuse('NATIONAL_INVENTORY');
  const originalMeta = forecast.continuity.metadata;
  assertDmiPartContinuityTotalSize(originalMeta.rawBytes, originalMeta.compressedBytes);
  let oldRaw = 0, oldCompressed = 0;
  // Indexed descriptors deliberately have no partId; qualify their actual
  // bounded compressed records, without inflating or keeping national rows.
  for (const descriptor of forecast.continuity.entries) {
    const entry = await readDmiForecastRecord(forecast, descriptor);
    if (!partIds.has(entry.partId) || descriptors.has(entry.partId)) refuse('NATIONAL_INVENTORY');
    descriptors.set(entry.partId, descriptor);
    oldRaw += entry.rawBytes; oldCompressed += entry.compressedBytes;
  }
  if (descriptors.size !== LIMIT.parts || oldRaw !== originalMeta.rawBytes
    || oldCompressed !== originalMeta.compressedBytes) refuse('NATIONAL_INVENTORY');
  const metas = new Map(), started = process.hrtime.bigint();
  const requestBudget = { bytes: 2, requests: 0 };
  capacityStage('metadata-start');
  for (const part of parts) {
    if (elapsedMilliseconds(started) > 600_000) refuse('METADATA_RUNTIME_BOUND');
    const persisted = await readPart(forecast, descriptors.get(part.partId), part, base.productionReferenceAt);
    const metadata = discoverCommittedCoherentOriginalBootstrap(partInput(base, part, persisted));
    if (!['METADATA_BOUND', 'NO_BOOTSTRAP_REQUIRED'].includes(metadata.summary.status)) refuse('METADATA_UNRESOLVED');
    chargeNationalMetadataRequests(requestBudget, metadata);
    metas.set(part.partId, metadata);
  }
  if (elapsedMilliseconds(started) > 600_000) refuse('METADATA_RUNTIME_BOUND');
  const { metadata, envelopeBytes } = combineMetadata(metas, metas.values().next().value.privateBinding, started, requestBudget);
  capacityStage('metadata-bound', { elapsedMilliseconds: elapsedMilliseconds(started),
    metadataRequestArrayBytes: requestBudget.bytes, metadataEnvelopeBytes: envelopeBytes,
    requests: requestBudget.requests });
  const decoded = await decodeCommittedCoherentOriginalRequests({ metadata, pythonExecutable: base.pythonExecutable,
    captureMode: metadata.privateRequests.length ? COHERENT_DISTINCT_READ_CAPTURE_MODE : null });
  const originals = decoded.decoderReceipt === null ? null
    : validatedCommittedCoherentCurrentOriginals({ metadata, requestSha256: decoded.requestSha256,
      decodedEnvelope: decoded.decodedEnvelope, captureMode: decoded.captureMode ?? null });
  const transportCaptures = validatedTransportRetentionCaptures(originals);
  await assertCoherentCurrentWorkInputs(workingInputs);
  capacityStage('decode-closed', { decodedBytes: decoded.decoderReceipt?.bytes ?? 0,
    decodedRequests: decoded.decoderReceipt?.requestCount ?? 0 });
  const entries = [], captureKeys = new Set(transportCaptures.map(canonical));
  let rawBytes = 0, compressedBytes = 0, savedBankBytes = 2, checkedParts = 0;
  let historyRoleBankPeakBytes = 0, perPartProofBankPeakBytes = 0;
  const projectionStarted = process.hrtime.bigint();
  for (const part of parts) {
    if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');
    const persisted = await readPart(forecast, descriptors.get(part.partId), part, base.productionReferenceAt);
    const input = partInput(base, part, persisted), localMetadata = metas.get(part.partId);
    const localDecoded = localMetadata.privateRequests.length === 0 ? {}
      : { requestSha256: decoded.requestSha256, decodedEnvelope: {
        ...decoded.decodedEnvelope,
        privateOriginals: localMetadata.privateRequests.map(request => originals.get(request.requestId)),
        captureCount: new Set(localMetadata.privateRequests.map(request => canonical(request.capture))).size } };
    // A byte-/request-bound SUBVIEW of the already globally validated decode,
    // not a newly issued decoder receipt. Fresh normal discovery revalidates it.
    const projection = reprojectCommittedCoherentCurrentOriginals({ input, metadata: localMetadata, ...localDecoded,
      captureMode: localMetadata.privateRequests.length ? decoded.captureMode ?? null : null });
    const saved = projection.privateProofBanks.filter(bank => bank.sourceRole === SAVED_FORECAST_121_ROLE);
    let localSavedBytes = 0, localHistoryBytes = 0;
    for (const proof of projection.privateProofBanks) {
      const bytes = proofBankBytes(proof.bank); // SAME strict per-bank ceiling.
      if (proof.sourceRole === SAVED_FORECAST_121_ROLE) localSavedBytes += bytes;
      else localHistoryBytes += bytes;
    }
    if (projection.summary.counts.bankBytes !== 2 + localSavedBytes + localHistoryBytes) refuse('OUTPUT_BYTES_BOUND');
    // Only saved121 banks survive in the output. History banks remain live
    // through normal retention below, then die with this PART; no role relabel.
    if (savedBankBytes + localSavedBytes > LIMIT.bankBytes) refuse('OUTPUT_BYTES_BOUND');
    const record = persisted.get(part.partId);
    if (!record || saved.length > 1 || (!saved.length && record.hourly.some(saved121DirectSelection))) refuse('SAVED_BANK_INVENTORY');
    const bank = saved[0]?.bank ?? null;
    const packed = await packDmiPartContinuity(new Map([[part.partId, {
      zoneId: 'PART::' + part.partId, point: record.point, hourly: record.hourly }]]), [part],
    base.boundary.productionReferenceAt, { nativeCurrentProofsByPart: new Map([[part.partId, bank]]) });
    const restored = await unpackDmiPartContinuity(packed, [part], base.productionReferenceAt);
    const after = restored.get(part.partId);
    if (!equal(after?.hourly, record.hourly) || !equal(after?.point, record.point)) refuse('ROUNDTRIP_CHANGED');
    // REQUIRED: no transient history bank is relabelled saved121 or admitted.
    // All forward-history roles must pass the ORIGINAL collector using only
    // the genuine inputs plus the normally packed saved121 original wrapper.
    const retention = buildRavScoreRawCurrentRetention({ ...input, persistedHourlyByPart: restored });
    for (const capture of retention.captures) captureKeys.add(canonical(capture));
    if (captureKeys.size > 4096) refuse('RETENTION_CAPTURE_BOUND');
    entries.push(packed.entries[0]); rawBytes += packed.rawBytes; compressedBytes += packed.compressedBytes;
    assertDmiPartContinuityTotalSize(rawBytes, compressedBytes); checkedParts++;
    savedBankBytes += localSavedBytes;
    historyRoleBankPeakBytes = Math.max(historyRoleBankPeakBytes, localHistoryBytes);
    perPartProofBankPeakBytes = Math.max(perPartProofBankPeakBytes, localSavedBytes + localHistoryBytes);
    if (checkedParts % 100 === 0) capacityStage('projection-progress', {
      checkedParts, elapsedMilliseconds: elapsedMilliseconds(projectionStarted), savedBankBytes,
      historyRoleBankPeakBytes, perPartProofBankPeakBytes, rawBytes, compressedBytes });
    // Only independently compressed entries survive this iteration; neither
    // inflated records nor a national proof bank are copied into every PART.
  }
  if (checkedParts !== LIMIT.parts) refuse('NATIONAL_INVENTORY');
  if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');
  const replacement = { schemaVersion: 2, kind: 'PRIVATE_DMI_PART_HOURLY_CONTINUITY',
    productionReferenceAt: base.boundary.productionReferenceAt, partCount: LIMIT.parts,
    rawBytes, compressedBytes, entries };
  const zones = (async function* () {
    for (const [id, descriptor] of forecast.zones) yield [id, await readDmiForecastRecord(forecast, descriptor)];
  })();
  await writeDmiForecastRecords(STAGE, forecast, zones, { ...forecast.metadata, partContinuity: replacement });
  if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');
  const staged = await inspectDmiForecastFile(STAGE);
  const { entries: _entries, ...expectedMetadata } = replacement;
  if (!equal(staged.continuity?.metadata, expectedMetadata)
    || staged.zones.size !== forecast.zones.size || staged.continuity.entries.length !== entries.length
    || staged.continuity.entries.some((descriptor, index) => descriptor.sha256 !== sha(JSON.stringify(entries[index])))) refuse('STAGE_CHANGED');
  // JSON whitespace is not a value/source change; compare each normal decoded
  // zone record, never require a newly serialized working record's old bytes.
  for (const [id, descriptor] of forecast.zones) {
    const next = staged.zones.get(id);
    if (!next || !equal(await readDmiForecastRecord(forecast, descriptor),
      await readDmiForecastRecord(staged, next))) refuse('STAGE_CHANGED');
    if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');
  }
  // Other top metadata/water-source records are preserved by the normal indexed
  // writer; compare every decoded record too, not just the current bank.
  const { partContinuity: _partContinuity, ...stagedMetadata } = staged.metadata;
  if (!equal(stagedMetadata, forecast.metadata)
    || !equal(staged.waterSourceContinuity?.metadata, forecast.waterSourceContinuity?.metadata)
    || staged.waterSourceContinuity?.entries.length !== forecast.waterSourceContinuity?.entries.length) refuse('STAGE_CHANGED');
  for (let i = 0; i < (forecast.waterSourceContinuity?.entries.length ?? 0); i++) {
    if (!equal(await readDmiForecastRecord(forecast, forecast.waterSourceContinuity.entries[i]),
      await readDmiForecastRecord(staged, staged.waterSourceContinuity.entries[i]))) refuse('STAGE_CHANGED');
    if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');
  }
  await assertCoherentCurrentWorkInputs(workingInputs);
  const stageIdentity = await measuredFile(STAGE);
  // The SAME projection budget includes the awaited writer/readback and both
  // final input/stage hashes. Expiry cannot issue an installable capability.
  if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');
  const capacity = { savedBankBytes, historyRoleBankPeakBytes, perPartProofBankPeakBytes,
    metadataRequestArrayBytes: requestBudget.bytes, metadataEnvelopeBytes: envelopeBytes,
    decodedBytes: decoded.decoderReceipt?.bytes ?? 0, rawBytes, compressedBytes,
    metadataMilliseconds: metadata.summary.timing.runtimeMilliseconds,
    projectionMilliseconds: elapsedMilliseconds(projectionStarted) };
  capacityStage('stage-verified', { ...capacity, stageBytes: Number(stageIdentity.size) });
  const receipt = { schemaVersion: 1, kind: 'COHERENT_CURRENT_NATIONAL_WORK_PREPARED',
    status: 'WORK_DERIVATION_PREPARED_NOT_INSTALLED', partCount: checkedParts,
    savedHoursPerPart: 121, retentionCaptureCount: captureKeys.size, capacity,
    decodedRequests: decoded.decoderReceipt?.requestCount ?? 0,
    decodedCaptures: decoded.decoderReceipt?.captureCount ?? 0,
    decoderPhysicalGroupClosed: decoded.decoderReceipt !== null,
    originalBSChanged: false, selectedRowsChanged: false, oldH0Preserved: true,
    modelBindingIssued: false, productionActivated: false, privatePayloadIncluded: false };
  preparedStages.set(receipt, { workingInputs, stageIdentity, capacity: Object.freeze({ ...capacity }), transportCaptures });
  return receipt;
}

export async function installPreparedCoherentCurrentWork(receipt) {
  const prepared = preparedStages.get(receipt);
  if (!prepared) refuse('OWNED_STAGE_REQUIRED');
  await assertCoherentCurrentWorkInputs(prepared.workingInputs);
  if (!equal(prepared.stageIdentity, await measuredFile(STAGE))) refuse('STAGE_CHANGED');
  // Caller has just reverified ORIGINAL B/S. Only the ordinary mutable forecast
  // is atomically replaced. Unknown rename outcome stops without repeat.
  preparedStages.delete(receipt);
  await fs.rename(STAGE, FORECAST);
  capacityStage('installed', prepared.capacity);
  return prepared.transportCaptures; // Available only after successful owned install.
}
