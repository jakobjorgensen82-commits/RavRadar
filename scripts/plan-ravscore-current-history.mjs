#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertRavScoreModelBinding, ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { selectRavScoreProductionInitialState, ravScoreOwnerCurrentHistoryStartAt }
  from './lib/ravscore-production-part-pipeline.mjs';
import { ravScoreRecoverySourceStartAt, RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS,
  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES } from './lib/ravscore-recovery-replay.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import { dmiExpectedIdentityForPart, dmiOriginalWireIdentityMatchesCentralIdentity, verifiedDmiForecastComponentSource,
  verifiedDmiNativeComponentSource, verifiedIntegratedPartHourly, verifiedBulkCurrent }
  from './lib/ravscore-production-adapters.mjs';
import { assertCoastalPointActivationStateInjection } from './lib/coastal-point-staging-contract.mjs';
import { assertPrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { loadRavScoreContinuationCheckpointForTarget, saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';
import { canonicalSavedDmiOriginalCapture } from './lib/saved-dmi-original-capture.mjs';
import { createSavedDmiOriginalDependencyDiscovery, assertSavedDmiOriginalDependencyDiscoveryInputs,
  resolveSavedDmiOriginalDependencyCaptures } from './lib/saved-dmi-original-dependencies.mjs';
import { buildPrivateDmiRecoveryRecord } from './lib/private-dmi-recovery-record.mjs';
import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import { verifiedProtectedDmiPartHourly } from './lib/protected-dmi-current-context.mjs';
import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling } from './lib/dmi-forecast-store.mjs';
import { dmiMarineCollectionAllowedForZone } from './lib/dmi-marine-zone-exclusions.mjs';
import { collectPostH0DmiOriginalDependencies } from './lib/post-h0-dmi-original-dependencies.mjs';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { unpackDmiPartContinuity, assertDmiPartContinuityTotalSize } from './lib/dmi-part-continuity.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord } from './lib/dmi-forecast-file.mjs';
import { localPartRuntimeProperties } from './lib/local-part-runtime.mjs';
import { readLiveCurrentPilot } from './lib/live-current-pilot.mjs';
import { mergeProtectedLiveCurrentPilotIntoRecord } from './lib/protected-live-current-assembly.mjs';
import { originalContextForProtectedDmiCurrent } from './lib/protected-dmi-current-context.mjs';
import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';
import { CURRENT_FAMILY_COLD_START_CONTEXT_ENV,
  loadCurrentFamilyColdStartForTarget, currentFamilyColdStartScoreInputs,
  currentFamilyColdStartRawRetention } from './current-family-cold-start.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOUR = 3_600_000;
const SHA = /^sha256:[a-f0-9]{64}$/;
const hash = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const SOURCE_PATHS = Object.freeze({
  registry: 'data/live/coastal-parts-v2.json',
  conditions: 'data/live/conditions.json',
  checkpoint: '.cache/ravscore-continuation-checkpoint/checkpoint.json',
  activation: '.cache/coastal-point-staging/activation-state-injection.json',
});
export const RAVSCORE_CURRENT_HISTORY_DEMAND_PATH = '.cache/ravscore-current-history-demand.json';
export const RAVSCORE_LEGACY_CURRENT_ORIGINAL_REQUEST_PATH = '.cache/dmi-legacy-current-original-requests.json';
export const RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS = Object.freeze({
  zones: 'data/zones.geojson', deployedBulk: '.cache/deployed-dmi-bulk-cache.json',
  forecast: 'data/live/dmi-forecast-cache.json', candidate: '.cache/dmi-candidate-progress.json',
  active: '.cache/dmi-active-complete.json',
});
const canonical = value => JSON.stringify(value, (_key, item) => object(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const canonicalHash = value => hash(canonical(value));

function refuse(reason) {
  const error = new Error(`RAVSCORE_CURRENT_HISTORY_DEMAND_${reason}`);
  error.code = `RAVSCORE_CURRENT_HISTORY_DEMAND_${reason}`;
  throw error;
}
function exactHour(value) {
  if (typeof value !== 'string' || !value) refuse('TARGET_REQUIRED');
  const canonical = resolveProductionReferenceTime(value);
  if (canonical !== value) refuse('NONCANONICAL_TIME');
  return canonical;
}
function workflowTargetHour(value) {
  if (typeof value !== 'string' || !value) refuse('TARGET_REQUIRED');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)) refuse('NONCANONICAL_TIME');
  // Only the normal workflow boundary has two equivalent serializations.
  // Authenticated states/endpoints below keep their exact-hour byte contract.
  return exactHour(value.length === 20 ? `${value.slice(0, -1)}.000Z` : value);
}

// Acquisition/retention only. No selected state or sampling receipt is returned,
// rewritten, upgraded or admitted here. The real two-model pipeline still owns
// pair validation and the strict NEW-current assertions after source selection.
export function planRavScoreCurrentHistoryForPart({
  part, existingPart = null, checkpointStates = {}, pointStateInjections = {},
  targetReferenceAt, stateLessRecovery = false,
} = {}) {
  const target = exactHour(targetReferenceAt);
  if (typeof stateLessRecovery !== 'boolean') refuse('MODE_INVALID');
  const identity = dmiExpectedIdentityForPart(part);
  if (!identity || typeof part?.zoneId !== 'string' || !part.zoneId) refuse('IDENTITY_INVALID');
  const samplingContextKey = ravScoreSamplingContextKey(part);
  const selected = selectRavScoreProductionInitialState({
    part, existingPart, checkpointStates, pointStateInjections, targetReferenceAt: target,
    candidateGBootstrapMode: stateLessRecovery
      ? RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.integratedStateLessRecovery
      : RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.automatic,
    candidateGSourceValidated: false,
  });
  if (!['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT', 'POINT_ACTIVATION', 'COLD_START']
    .includes(selected.source)) refuse('NON_INTEGRATED_ROUTE');
  const state = selected.state;
  if ((selected.source === 'COLD_START') !== (state === null)) refuse('STATE_SOURCE_MISMATCH');
  const initialStateAt = state === null ? null : exactHour(state.time);
  if (initialStateAt !== null) {
    const age = (Date.parse(target) - Date.parse(initialStateAt)) / HOUR;
    if (age < 0 || age > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS
      || (selected.source === 'POINT_ACTIVATION' && initialStateAt !== target)) refuse('STATE_TIME_INVALID');
  }
  const startAt = ravScoreOwnerCurrentHistoryStartAt(part, state,
    ravScoreRecoverySourceStartAt(state, target), { requireNativeGridSampling: true });
  const span = (Date.parse(target) - Date.parse(exactHour(startAt))) / HOUR;
  // 51 = the existing strict owner helper's 48h window + three endpoint-support
  // hours; 72 = the normal selector's maximum continuation age. No wall clock.
  if (!Number.isSafeInteger(span) || span < 0
    || span > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS + 51) refuse('RANGE_INVALID');
  return {
    partId: part.partId, zoneId: part.zoneId, parentZoneId: identity.parentZoneId,
    entityId: identity.entityId, samplingPoint: [...identity.samplingPoint], samplingContextKey,
    initialSource: selected.source, initialStateAt,
    initialStateSha256: state === null ? null : hash(JSON.stringify(state)),
    startAt, endAt: target,
  };
}

export function buildRavScoreCurrentHistoryDemand({
  registry, conditions, checkpoint, activationPairs = {}, productionReferenceAt,
  registrySha256, sourceHashes, stateLessRecovery = false,
} = {}) {
  const target = exactHour(productionReferenceAt);
  if (!object(registry) || registry.schemaVersion !== 2 || registry.enabled !== true
    || !object(registry.zones) || !Number.isSafeInteger(registry.partCount) || registry.partCount < 1
    || !Number.isSafeInteger(registry.zoneCount) || registry.zoneCount < 1
    || Object.keys(registry.zones).length !== registry.zoneCount || !SHA.test(registrySha256)
    || !object(conditions) || !object(activationPairs)
    || !object(sourceHashes)
    || JSON.stringify(Object.keys(sourceHashes).sort()) !== '["activation","checkpoint","conditions"]'
    || Object.values(sourceHashes).some(value => value !== null && !SHA.test(value))) refuse('ENVELOPE_INVALID');
  if (conditions.coastalParts) {
    assertRavScoreModelBinding(conditions.coastalParts.modelBinding, 'Current-history baseline binding');
    if (!object(conditions.coastalParts.parts)) refuse('BASELINE_INVALID');
  }
  if (!object(checkpoint) || typeof checkpoint.loaded !== 'boolean') refuse('CHECKPOINT_INVALID');
  const checkpointStates = checkpoint.loaded && checkpoint.continuationAvailable ? checkpoint.states : {};
  if (!object(checkpointStates)) refuse('CHECKPOINT_INVALID');
  const pointStateInjections = Object.fromEntries(Object.entries(activationPairs)
    .map(([id, pair]) => [id, pair.integratedState]));
  const seen = new Set();
  const demands = [];
  for (const [zoneId, parts] of Object.entries(registry.zones)) {
    if (!Array.isArray(parts) || !parts.length) refuse('REGISTRY_INVALID');
    for (const entry of parts) {
      if (!object(entry) || seen.has(entry.partId)) refuse('REGISTRY_INVALID');
      seen.add(entry.partId);
      const part = { ...entry, zoneId };
      demands.push(planRavScoreCurrentHistoryForPart({
        part, existingPart: conditions.coastalParts?.parts?.[part.partId] ?? null,
        checkpointStates, pointStateInjections, targetReferenceAt: target, stateLessRecovery,
      }));
    }
  }
  if (demands.length !== registry.partCount
    || Object.keys(activationPairs).some(id => !seen.has(id))) refuse('REGISTRY_INVENTORY_MISMATCH');
  demands.sort((left, right) => left.partId < right.partId ? -1 : left.partId > right.partId ? 1 : 0);
  return {
    schemaVersion: 1, kind: 'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND',
    productionReferenceAt: target, modelBinding: { ...ravScoreModelBinding() },
    registrySha256, sourceHashes: { ...sourceHashes }, demands,
  };
}

// Retention only: normal immutable-B verification and actual S parity happen
// in the fixed caller below. This pure projection never authenticates/admit rows.
export function buildRavScoreRawCurrentRetention({ registry, conditions, checkpoint,
  productionReferenceAt, boundary, protectedBulk, progressCandidate = null,
  progressActive = null, historicalBulk = null, persistedHourlyByPart = new Map(), liveCurrentPilot = null, zones } = {}) {
  const target = exactHour(productionReferenceAt), captures = new Map();
  if (!object(boundary) || boundary.datasetId !== conditions?.datasetId
    || boundary.productionReferenceAt !== conditions?.productionReferenceAt
    || boundary.datasetId !== checkpoint?.datasetId || boundary.productionReferenceAt !== checkpoint?.productionReferenceAt
    || boundary.checkpointGenerationSha256 !== checkpoint?.generationSha256
    || !/^[a-f0-9]{64}$/.test(boundary.bundleContentSha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(boundary.conditionsSha256 ?? '')
    || !object(registry?.zones) || !object(conditions?.coastalParts?.parts)
    || !object(checkpoint?.states) || !Array.isArray(zones?.features)
    || !(persistedHourlyByPart instanceof Map)) refuse('RETENTION_INPUT_INVALID');
  let partCount = 0;
  for (const [zoneId, entries] of Object.entries(registry.zones)) for (const entry of entries) {
    const part = { ...entry, zoneId }, expected = dmiExpectedIdentityForPart(part);
    const selected = selectRavScoreProductionInitialState({ part,
      existingPart: conditions.coastalParts.parts[part.partId], targetReferenceAt: target });
    // Never release an OLD point's dependencies by a local point/cold rewrite.
    // A changed context must first use a separately reviewed normal transition.
    if (selected.source !== 'EXISTING_INTEGRATED' || selected.state.time !== boundary.productionReferenceAt
      || !isDeepStrictEqual(selected.state, checkpoint.states[part.partId])) {
      refuse('RETENTION_COMMITTED_STATE_REQUIRED');
    }
    partCount++;
    const startAt = ravScoreOwnerCurrentHistoryStartAt(part, selected.state,
      ravScoreRecoverySourceStartAt(selected.state, target), { requireNativeGridSampling: true });
    const feature = { properties: localPartRuntimeProperties(
      zones.features.find(row => row?.properties?.id === zoneId)?.properties ?? {}, part, expected.entityId) };
    const protectedContexts = [protectedBulk, historicalBulk];
    const records = [];
    for (const [document, previous] of [[protectedBulk, true], [progressCandidate, false]]) {
      let record = buildPrivateDmiRecoveryRecord(feature, document, target, { startAt, expectedIdentity: expected,
        ...(previous ? { persistedHourly: persistedHourlyByPart.get(part.partId)?.hourly ?? [],
          historicalBulkCache: historicalBulk, protectPreviousDmi: true } : {}) });
      if (!record) { records.push(null); continue; }
      const contexts = previous ? protectedContexts : [document];
      record = mergeProtectedLiveCurrentPilotIntoRecord(record, part, liveCurrentPilot, {
        currentContexts: contexts, bulkId: expected.entityId, productionReferenceAt: target,
        includePrivateNativeCadenceReferences: true,
        primaryCurrentVerified: hour => previous ? Boolean(originalContextForProtectedDmiCurrent(
          hour, contexts, expected.entityId, part)) : Boolean(verifiedBulkCurrent(document,
            document?.zones?.[expected.entityId], part.waterPoint, hour?.sources?.current, hour?.time, expected)),
      });
      const hourly = previous ? verifiedProtectedDmiPartHourly(record, contexts, expected.entityId, part,
        { requireNativeGridSampling: false, liveCurrentPilot }) : verifiedIntegratedPartHourly(record,
          document, expected.entityId, part, { requireNativeGridSampling: false, liveCurrentPilot });
      records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',
        nativeCurrentContexts: contexts, record: { ...record, hourly } });
    }
    const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource: records[0],
      preferredSource: records[1], protectedPreviousSource: records[0], productionReferenceAt: target, part });
    const dependencies = collectPostH0DmiOriginalDependencies({ part, initialSelection: selected,
      targetReferenceAt: target, recoverySources, liveCurrentPilot });
    for (const capture of dependencies.captures) captures.set(canonical(capture), capture);
    // Python load_previous additionally sanitizes/merges OUTPUT, active and
    // published before decoding. Protect that bounded POSSIBLE native support
    // too, not merely a prediction of its eventual priority/replay union.
    // The ±3h are normal interpolation-bracket support, not H0-minus-51.
    for (const document of [protectedBulk, progressCandidate, progressActive]) {
      if (document === null) continue;
      if (!object(document?.zones)) refuse('RETENTION_DONOR_INVALID');
      const nativeZone = document.zones[expected.entityId];
      if (nativeZone === undefined) continue;
      if (!object(nativeZone?.hourly) || Object.keys(nativeZone.hourly).length > 10_000) refuse('RETENTION_DONOR_INVALID');
      for (const row of Object.values(nativeZone.hourly)) {
        const ms = Date.parse(row?.time), source = row?.sources?.current;
        if (!Number.isFinite(ms) || ms < Date.parse(selected.state.time) - 3 * HOUR
          || ms > Date.parse(target) + 3 * HOUR || source?.provider !== 'dmi'
          || ![row?.['current-u'], row?.['current-v']].some(Number.isFinite)) continue;
        if (!dmiMarineCollectionAllowedForZone(source.collection, expected.parentZoneId)) continue;
        if (['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours'].some(key => Object.hasOwn(source, key))) {
          refuse('RETENTION_NATIVE_REQUIRED');
        }
        if (![row['current-u'], row['current-v']].every(Number.isFinite)
          || !verifiedDmiNativeComponentSource(source, row.time, 'current', expected)
          || !verifiedBulkCurrent(document, nativeZone, part.waterPoint, source, row.time, expected)) refuse('RETENTION_NATIVE_INVALID');
        const sampling = inspectDmiNativeGridSampling(source).status;
        if (sampling === 'coherent') continue;
        if (sampling !== 'unknown' || source.nativeGridSampling != null) refuse('RETENTION_NATIVE_INVALID');
        const capture = canonicalSavedDmiOriginalCapture(source);
        if (!capture) refuse('RETENTION_CAPTURE_REQUIRED');
        captures.set(canonical(capture), capture);
      }
    }
    if (captures.size > 4096) refuse('RETENTION_BOUND');
  }
  if (partCount !== registry.partCount || Object.keys(checkpoint.states).length !== partCount) refuse('RETENTION_INVENTORY');
  return { schemaVersion: 1, kind: 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION', boundary: { ...boundary },
    captures: [...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value) };
}

async function readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt) {
  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT;
  const bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;
  if (!path.isAbsolute(privateRoot ?? '') || !path.isAbsolute(bundlePath ?? '')
    || path.dirname(bundlePath) !== privateRoot || !process.env.RUNNER_TEMP) refuse('RETENTION_B_PATH');
  // Already authenticated CURRENT from the ordinary restore/reconcile, not a
  // caller-supplied old manifest or newly calculated/local H0. No network here.
  const descriptor = JSON.parse(await fs.readFile(path.join(process.env.RUNNER_TEMP,
    'private-runtime-current-source.json'), 'utf8'));
  const verify = () => verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath,
    repositoryRoot: ROOT, expected: descriptor });
  const verified = await verify();
  if (verified.bundleContentSha256 !== descriptor.bundleContentSha256) refuse('RETENTION_B_CHANGED');
  const file = path.join(bundlePath, 'payload/data/live/conditions.json');
  const fileInfo = await fs.lstat(file);
  if (!fileInfo.isFile() || fileInfo.isSymbolicLink() || fileInfo.size > 256 * 1024 * 1024) refuse('RETENTION_B_CHANGED');
  const bytes = await fs.readFile(file);
  const conditionsSha256 = hash(bytes).slice(7);
  const listed = verified.files.find(row => row.relativePath === 'data/live/conditions.json');
  if (!listed || listed.bytes !== bytes.length || listed.sha256 !== conditionsSha256 || !checkpointFile) refuse('RETENTION_B_CHANGED');
  const conditions = JSON.parse(bytes.toString('utf8'));
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-raw-retention-'));
  let checkpoint;
  try {
    const output = path.join(work, 'checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ sourcePath: file, checkpointPath: output,
      expectedPartCount: registry.partCount, repositoryRoot: ROOT });
    checkpoint = JSON.parse(await fs.readFile(output, 'utf8'));
    if (!isDeepStrictEqual(checkpoint, checkpointFile.json)) refuse('RETENTION_B_S_DIFFER');
  } finally { await fs.rm(work, { recursive: true }); }
  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));
  const forecast = await inspectDmiForecastFile(path.join(ROOT, 'data/live/dmi-forecast-cache.json'));
  const protectedBulk = await readDmiBulkDocument(path.join(ROOT, '.cache/deployed-dmi-bulk-cache.json'));
  const candidate = await readDmiBulkDocument(path.join(ROOT, '.cache/dmi-candidate-progress.json'), { optional: true });
  const active = await readDmiBulkDocument(path.join(ROOT, '.cache/dmi-active-complete.json'), { optional: true });
  // The normal historical donor is optional; never replace a missing donor with
  // a guessed document or a freshly resealed/copy-labelled native receipt.
  const historicalBulk = process.env.DMI_PART_CONTINUITY_DONOR_PATH
    ? await readDmiBulkDocument(process.env.DMI_PART_CONTINUITY_DONOR_PATH) : null;
  const boundary = { datasetId: verified.datasetId, productionReferenceAt: verified.productionReferenceAt,
    bundleContentSha256: verified.bundleContentSha256, checkpointGenerationSha256: checkpoint.generationSha256, conditionsSha256 };
  const liveCurrentPilot = await readLiveCurrentPilot(registry), zones = (await readFixed('data/zones.geojson')).json;
  const all = new Map(), byPart = new Map(parts.map(part => [part.partId, part]));
  const collect = (part, persistedHourlyByPart) => {
    const result = buildRavScoreRawCurrentRetention({
      registry: { ...registry, partCount: 1, zones: { [part.zoneId]: [part] } },
      conditions: { ...conditions, coastalParts: { ...conditions.coastalParts,
        parts: { [part.partId]: conditions.coastalParts.parts[part.partId] } } },
      checkpoint: { ...checkpoint, states: { [part.partId]: checkpoint.states[part.partId] } },
      productionReferenceAt, boundary, protectedBulk, progressCandidate: candidate ?? active, progressActive: active,
      historicalBulk, persistedHourlyByPart, liveCurrentPilot, zones });
    for (const capture of result.captures) all.set(canonical(capture), capture);
    if (all.size > 4096) refuse('RETENTION_BOUND');
  };
  if (forecast.continuity) {
    const metadata = forecast.continuity.metadata, seen = new Set();
    if (metadata.partCount !== parts.length || forecast.continuity.entries.length !== parts.length) refuse('RETENTION_INVENTORY');
    assertDmiPartContinuityTotalSize(metadata.rawBytes, metadata.compressedBytes);
    let raw = 0, compressed = 0;
    for (const descriptor of forecast.continuity.entries) {
      const entry = await readDmiForecastRecord(forecast, descriptor), part = byPart.get(entry.partId);
      if (!part || seen.has(entry.partId)) refuse('RETENTION_INVENTORY');
      seen.add(entry.partId); raw += entry.rawBytes; compressed += entry.compressedBytes;
      const persisted = await unpackDmiPartContinuity({ ...metadata, partCount: 1,
        rawBytes: entry.rawBytes, compressedBytes: entry.compressedBytes, entries: [entry] }, [part], productionReferenceAt);
      collect(part, persisted); // Never materialize 673 inflated continuity records together.
    }
    if (raw !== metadata.rawBytes || compressed !== metadata.compressedBytes) refuse('RETENTION_INVENTORY');
  } else for (const part of parts) collect(part, new Map());
  await verify();
  return { schemaVersion: 1, kind: 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION', boundary,
    captures: [...all].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value) };
}

const LEGACY_SIGNATURE = /^parser:20\|params:4\|grid:9\|eccodes-api:2\.48\.(?:0|2)\|eccodes-binding:2\.48\.0\|zones:[a-f0-9]{16}$/;
const ORIGINAL_HEADER_FIELDS = ['generatedAt', 'currentVectorSemanticsVersion', 'currentVectorSelection',
  'currentMaxDistanceKm', 'timeStrideHours'];
const IDENTITY_FIELDS = ['entityId', 'parentZoneId', 'entityType', 'samplingContext', 'samplingPoint'];

// Source-document metadata only. No current run default can supply the old
// decoder identity of an unrelated retained capture. The original file hash
// binds the parent run/collection as well as the exact located evidence row.
function legacyProcessingIndex(document) {
  const result = new Map();
  const add = (rawCapture, signature, kind, path, record, partIds = null) => {
    const capture = canonicalSavedDmiOriginalCapture(rawCapture);
    if (!capture || !LEGACY_SIGNATURE.test(signature ?? '')) return;
    const key = canonical(capture), entries = result.get(key) ?? [];
    entries.push({ signature, partIds, evidence: { kind, path, sha256: canonicalHash(record) } });
    result.set(key, entries);
  };
  for (const [collection, run] of Object.entries(document.runs ?? {})) {
    if (!object(run) || run.parserVersion !== 20 || run.parameterMapVersion !== 4
      || run.gridLookupVersion !== 9 || !object(run.processedSteps)
      || Object.keys(run.processedSteps).length > 10_000) continue;
    for (const [time, step] of Object.entries(run.processedSteps)) {
      const capture = canonicalSavedDmiOriginalCapture(step?.sourceAsset);
      if (!capture || capture.collection !== collection || step.complete !== true || step.parserVersion !== 20
        || step.processingSignature !== run.processingSignature || !Array.isArray(step.recognizedParameters)
        || !['current-u', 'current-v'].every(field => step.recognizedParameters.includes(field))
        || !Number.isFinite(step.zonesTouched) || step.zonesTouched <= 0
        || canonicalSavedDmiOriginalCapture({ ...capture, modelRun: run.referenceTime })?.modelRun !== capture.modelRun
        || canonicalSavedDmiOriginalCapture({ ...capture, validTime: time })?.validTime !== capture.validTime) continue;
      add(capture, step.processingSignature, 'RUN_PROCESSED_STEP',
        ['runs', collection, 'processedSteps', time], step);
    }
  }
  const ledger = document.diagnostics?.currentOperationalLedger;
  if (Array.isArray(ledger?.collections) && ledger.collections.length <= 3) {
    for (const [collectionIndex, collection] of ledger.collections.entries()) {
      if (!Array.isArray(collection?.validTimes) || collection.validTimes.length > 10_000) continue;
      for (const [rowIndex, row] of collection.validTimes.entries()) {
        const capture = canonicalSavedDmiOriginalCapture(row?.sourceAsset);
        if (!capture || !['PROCESSED', 'VERIFIED'].includes(row.state) || capture.collection !== collection.collection
          || canonicalSavedDmiOriginalCapture({ ...capture, modelRun: collection.modelRun })?.modelRun !== capture.modelRun
          || canonicalSavedDmiOriginalCapture({ ...capture, validTime: row.validTime })?.validTime !== capture.validTime) continue;
        add(capture, collection.processingSignature, 'LEDGER_COLLECTION_ASSET',
          ['diagnostics', 'currentOperationalLedger', 'collections', collectionIndex, 'validTimes', rowIndex], row);
      }
    }
  }
  if (Array.isArray(ledger?.retainedCurrentAssetProofs) && ledger.retainedCurrentAssetProofs.length <= 4096) {
    for (const [index, proof] of ledger.retainedCurrentAssetProofs.entries()) {
      if (!Array.isArray(proof?.attestedPartIds) || proof.attestedPartIds.length > 673) continue;
      add(proof.sourceAsset, proof.processingSignature, 'RETAINED_CURRENT_ASSET_PROOF',
        ['diagnostics', 'currentOperationalLedger', 'retainedCurrentAssetProofs', index], proof, proof.attestedPartIds);
    }
  }
  return result;
}

function expectedLegacyNativeSource(source, step, capture, expected) {
  // Same per-step reconstruction as the normal forecast verifier, with byte
  // fields supplied ONLY by an independently complete capture for this step.
  const endpoint = { ...structuredClone(source), itemId: step.itemId,
    assetIdentitySha256: step.assetIdentitySha256, nativeValidTime: step.nativeValidTime,
    leadTimeHours: step.leadTimeHours, acquiredAt: step.acquiredAt,
    optionalFieldSet: structuredClone(step.optionalFieldSet),
    contentLengthBytes: capture.contentLengthBytes, contentSha256: capture.contentSha256 };
  for (const key of ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours']) delete endpoint[key];
  for (const key of ['gridPoint', 'distanceKm']) if (Object.hasOwn(step, key)) endpoint[key] = structuredClone(step[key]);
  for (const key of ['itemCreatedAt', 'itemUpdatedAt']) {
    if (Object.hasOwn(step, key)) endpoint[key] = step[key]; else delete endpoint[key];
  }
  if (capture.assetSizeBytes !== null) endpoint.assetSizeBytes = capture.assetSizeBytes;
  else if (Object.hasOwn(endpoint, 'assetSizeBytes')) endpoint.assetSizeBytes = null;
  // The selected top marker belongs to its own endpoint, not this bracket.
  // Missing NEW data cannot be reconstructed by the frozen OLD decoder.
  if (step.nativeGridSampling != null) refuse('LEGACY_NEW_ENDPOINT_UNAVAILABLE');
  // UNKNOWN null belongs only to this actual own step. A selected top marker
  // never supplies another endpoint's shape, and the witness stays verbatim.
  if (Object.hasOwn(step, 'nativeGridSampling') && step.nativeGridSampling === null) endpoint.nativeGridSampling = null;
  else delete endpoint.nativeGridSampling;
  if (!verifiedDmiNativeComponentSource(endpoint, step.nativeValidTime, 'current', expected)
    || canonical(canonicalSavedDmiOriginalCapture(endpoint)) !== canonical(capture)) refuse('LEGACY_CONTEXT_UNAVAILABLE');
  return endpoint;
}

/** Plan OLD-only causal reconstruction, never native proof or NEW admission.
 * Inputs are the exact authenticated/prewrite originals. This predicts no
 * future Python merge: it follows current normal private source selection.
 */
export function buildRavScoreLegacyCurrentOriginalRequests({ registry, zones, historyDemand,
  historyDemandSha256, sourceHashes, protectedBulk, progressCandidate = null, progressRole = null,
  persistedHourlyByPart = new Map(), dependencyDiscovery = null } = {}) {
  const target = exactHour(historyDemand?.productionReferenceAt);
  if (!object(registry?.zones) || registry.schemaVersion !== 2 || registry.enabled !== true
    || !Number.isSafeInteger(registry.partCount) || registry.partCount < 1 || registry.partCount > 673
    || !Array.isArray(zones?.features) || !SHA.test(historyDemandSha256 ?? '')
    || !(historyDemand.schemaVersion === 1 && !Object.hasOwn(historyDemand, 'rawRetention')
      || historyDemand.schemaVersion === 2 && (historyDemand.rawRetention === null
        || historyDemand.rawRetention?.kind === 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION'))
    || historyDemand.kind !== 'RAVSCORE_CURRENT_HISTORY_ACQUISITION_DEMAND'
    || !SHA.test(historyDemand.registrySha256 ?? '') || !Array.isArray(historyDemand.demands)
    || historyDemand.demands.length !== registry.partCount || !object(protectedBulk?.zones)
    || progressCandidate !== null && !object(progressCandidate?.zones)
    || (progressCandidate === null ? progressRole !== null : !['candidate', 'active'].includes(progressRole))
    || !(persistedHourlyByPart instanceof Map) || !object(sourceHashes)
    || canonical(Object.keys(sourceHashes).sort()) !== canonical(Object.keys(RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS).sort())
    || Object.values(sourceHashes).some(value => value !== null && !SHA.test(value))
    || ['zones', 'deployedBulk', 'forecast'].some(key => !SHA.test(sourceHashes[key] ?? ''))
    || progressRole && !SHA.test(sourceHashes[progressRole] ?? '')) refuse('LEGACY_INPUTS_INVALID');
  assertRavScoreModelBinding(historyDemand.modelBinding);
  const parts = new Map(), demands = new Map();
  for (const [zoneId, entries] of Object.entries(registry.zones)) {
    if (!Array.isArray(entries)) refuse('REGISTRY_INVALID');
    for (const entry of entries) {
      if (!entry?.partId || parts.has(entry.partId)) refuse('REGISTRY_INVALID');
      parts.set(entry.partId, { ...entry, zoneId });
    }
  }
  for (const demand of historyDemand.demands) {
    const part = parts.get(demand.partId), identity = dmiExpectedIdentityForPart(part);
    const span = (Date.parse(target) - Date.parse(demand.startAt)) / HOUR;
    const cold = demand.initialSource === 'COLD_START' && demand.initialStateAt === null;
    const initialMs = Date.parse(demand.initialStateAt), stateAge = (Date.parse(target) - initialMs) / HOUR;
    const stateWindow = ['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT', 'POINT_ACTIVATION'].includes(demand.initialSource)
      && Number.isSafeInteger(stateAge) && stateAge >= 0 && stateAge <= 72
      && Date.parse(demand.startAt) === initialMs - 51 * HOUR
      && SHA.test(demand.initialStateSha256 ?? '')
      && (demand.initialSource !== 'POINT_ACTIVATION' || demand.initialStateAt === target);
    if (!part || !identity || demands.has(demand.partId) || demand.endAt !== target
      || canonical(Object.keys(demand).sort()) !== canonical(['partId', 'zoneId', 'parentZoneId', 'entityId',
        'samplingPoint', 'samplingContextKey', 'initialSource', 'initialStateAt', 'initialStateSha256', 'startAt', 'endAt'].sort())
      || !(cold && demand.initialStateSha256 === null && span === 48 || stateWindow)
      || demand.zoneId !== part.zoneId || demand.parentZoneId !== identity.parentZoneId
      || demand.entityId !== identity.entityId || !isDeepStrictEqual(demand.samplingPoint, identity.samplingPoint)
      || demand.samplingContextKey !== ravScoreSamplingContextKey(part)
      || !Number.isSafeInteger(span) || span < 0 || span > 123) refuse('LEGACY_DEMAND_INVALID');
    exactHour(demand.startAt); demands.set(demand.partId, demand);
  }
  if (parts.size !== registry.partCount || demands.size !== parts.size
    || [...persistedHourlyByPart.keys()].some(id => !parts.has(id))) refuse('REGISTRY_INVENTORY_MISMATCH');
  const discovery = dependencyDiscovery ?? createSavedDmiOriginalDependencyDiscovery({ protectedBulk, progressCandidate });
  assertSavedDmiOriginalDependencyDiscoveryInputs(discovery, { protectedBulk, progressCandidate });
  const witnesses = new Map(), requests = new Map(), existingOriginals = new Map(), contexts = new Map(), processing = new Map();
  let planBytes = 4096;
  const charge = value => { planBytes += Buffer.byteLength(canonical(value)) + 2;
    if (planBytes > 192 * 1024 * 1024) refuse('LEGACY_PLAN_BOUND'); };
  for (const part of parts.values()) {
    const expected = dmiExpectedIdentityForPart(part), demand = demands.get(part.partId);
    const from = Date.parse(demand.startAt), until = Date.parse(target);
    const persisted = persistedHourlyByPart.get(part.partId)?.hourly ?? [];
    if (!Array.isArray(persisted) || persisted.length > 10_000) refuse('LEGACY_INPUTS_INVALID');
    const containsHold = rows => rows.some(row => {
      const source = row.currentProvenance ?? row.sources?.current;
      const collection = row.currentStateOnlyHold?.collection ?? source?.collection;
      return Date.parse(row.time) >= from && Date.parse(row.time) <= until
        && (!collection || dmiMarineCollectionAllowedForZone(collection, expected.parentZoneId))
        && (row.currentStateOnlyHold != null || source?.stateOnly === true
          || source?.status === 'verified-derived-state-only' || source?.classification === 'REGIONAL_DMI_DERIVED_HOLD');
    });
    if (containsHold(persisted)) refuse('LEGACY_HOLD_SUPPORT_UNAVAILABLE');
    const records = [], losses = new Set();
    for (const [document, previous, role] of [[protectedBulk, true, 'deployedBulk'], [progressCandidate, false, progressRole]]) {
      if (document === null) { records.push(null); continue; }
      const originalZone = document.zones[expected.entityId];
      if (originalZone !== undefined && (!object(originalZone) || !object(originalZone.hourly)
        || Object.keys(originalZone.hourly).length > 10_000)) refuse('LEGACY_DONOR_INVALID');
      const record = buildPrivateDmiRecoveryRecord({ properties: { id: expected.entityId, dataPoint: part.waterPoint } },
        document, target, { startAt: demand.startAt, expectedIdentity: expected,
          ...(previous ? { persistedHourly: persisted, protectPreviousDmi: true } : {}) });
      if (!record) { records.push(null); continue; }
      if (containsHold(record.hourly)) refuse('LEGACY_HOLD_SUPPORT_UNAVAILABLE');
      const hourly = previous ? verifiedProtectedDmiPartHourly(record, [document], expected.entityId, part,
        { requireNativeGridSampling: false }) : verifiedIntegratedPartHourly(record, document, expected.entityId, part,
        { requireNativeGridSampling: false });
      const sanitized = new Map(hourly.map(row => [row.time, row]));
      for (const row of record.hourly) {
        const source = row.currentProvenance ?? row.sources?.current, kept = sanitized.get(row.time);
        if (Date.parse(row.time) >= from && Date.parse(row.time) <= until
          && Number.isFinite(row.currentUMps) && Number.isFinite(row.currentVMps) && source?.provider === 'dmi'
          && dmiMarineCollectionAllowedForZone(source.collection, expected.parentZoneId)
          && (!Number.isFinite(kept?.currentUMps) || !Number.isFinite(kept?.currentVMps))) losses.add(Date.parse(row.time));
      }
      records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',
        nativeCurrentContexts: [document], documentRole: role, record: { ...record, hourly } });
    }
    const selected = buildNewestValidRavScoreRecoverySources({ fallbackSource: records[0], preferredSource: records[1],
      protectedPreviousSource: records[0], productionReferenceAt: target, part });
    const selectedTimes = new Set();
    for (const selectedSource of selected) {
      const document = selectedSource.nativeCurrentContexts[0];
      const role = document === protectedBulk ? 'deployedBulk' : progressRole;
      const inspector = createProtectedDmiNativeCurrentInspector({ contexts: [document] });
      for (const row of selectedSource.record.hourly) {
        const time = Date.parse(row.time), source = row.sources?.current;
        if (time < from || time > until || !Number.isFinite(row.currentUMps) || !Number.isFinite(row.currentVMps)
          || source?.provider !== 'dmi') continue;
        if (!dmiMarineCollectionAllowedForZone(source.collection, expected.parentZoneId)) continue;
        const proof = inspector.inspectOriginals({ part, row });
        if (proof.ok) { selectedTimes.add(time); continue; }
        if (proof.code !== 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING'
          || !verifiedDmiForecastComponentSource(source, row.time, 'current', expected)
          || inspectDmiForecastGridSampling(source, 'current', row.time, expected).status !== 'unknown') refuse('LEGACY_SELECTED_ENDPOINT_UNAVAILABLE');
        const captures = resolveSavedDmiOriginalDependencyCaptures(discovery, { protectedBulk, progressCandidate,
          document, part, row, ownHourly: role === 'deployedBulk' ? persisted : [] });
        if (!captures) refuse('LEGACY_CAPTURE_UNAVAILABLE');
        const endpoints = inspector.inspectEndpointOriginals({ part, row });
        if (!endpoints.ok || endpoints.endpoints.length !== source.nativeSteps.length) refuse('LEGACY_SELECTED_ENDPOINT_UNAVAILABLE');
        const originalZone = document.zones[expected.entityId];
        const originalIdentity = originalZone && Object.fromEntries(IDENTITY_FIELDS
          .filter(key => Object.hasOwn(originalZone, key)).map(key => [key, structuredClone(originalZone[key])]));
        if (!dmiOriginalWireIdentityMatchesCentralIdentity(originalIdentity, expected)
          || !verifiedBulkCurrent(document, originalZone, part.waterPoint, source, row.time, expected)) refuse('LEGACY_CONTEXT_UNAVAILABLE');
        const context = contexts.get(role) ?? { documentRole: role, header: Object.fromEntries(ORIGINAL_HEADER_FIELDS
          .filter(key => Object.hasOwn(document, key)).map(key => [key, structuredClone(document[key])])), zones: [] };
        if (!context.zones.some(value => value.partId === part.partId)) context.zones.push({ partId: part.partId, zone: originalIdentity });
        contexts.set(role, context);
        const witness = { partId: part.partId, documentRole: role, row: { time: row.time,
          currentUMps: row.currentUMps, currentVMps: row.currentVMps, sources: { current: structuredClone(source) } } };
        const witnessId = canonicalHash(witness);
        if (!witnesses.has(witnessId)) {
          const value = { witnessId, ...witness, sourceSha256: canonicalHash(source),
            tupleSha256: canonicalHash([row.currentUMps, row.currentVMps]) };
          charge(value); witnesses.set(witnessId, value);
        }
        const parent = zones.features.find(feature => feature?.properties?.id === expected.parentZoneId);
        const zone = { id: expected.entityId, lon: expected.samplingPoint[0], lat: expected.samplingPoint[1],
          coastType: parent?.properties?.coastType || 'east', coastalPart: true, parentZoneId: expected.parentZoneId };
        for (const [index, step] of source.nativeSteps.entries()) {
          const nativeMs = Date.parse(step.nativeValidTime);
          if (!Number.isFinite(nativeMs) || nativeMs < from - 3 * HOUR || nativeMs > until + 3 * HOUR) refuse('LEGACY_DEMAND_INVALID');
          const existingEndpoint = endpoints.endpoints[index];
          if (existingEndpoint) {
            const native = existingEndpoint.native;
            const matchesRaw = raw => raw?.time === native.time
              && raw['current-u'] === native.uMps && raw['current-v'] === native.vMps
              && canonical(raw.sources?.current) === canonical(native.source);
            // Normal producer keys equal their verbatim row time: O(1), not
            // a fresh own-hour scan for every interpolated witness. Preserve
            // older alternative key spellings through the bounded fallback.
            const entry = matchesRaw(originalZone.hourly[native.time]) ? [native.time, originalZone.hourly[native.time]]
              : Object.entries(originalZone.hourly).find(([, raw]) => matchesRaw(raw));
            if (!entry) refuse('LEGACY_EXISTING_ORIGINAL_UNAVAILABLE');
            const fields = { partId: part.partId, documentRole: role, documentSha256: sourceHashes[role],
              contextSha256: canonicalHash({ header: context.header, zone: originalIdentity }),
              rowPath: ['zones', expected.entityId, 'hourly', entry[0]],
              row: { time: native.time, 'current-u': native.uMps, 'current-v': native.vMps,
                sources: { current: structuredClone(native.source) } } };
            const originalId = canonicalHash(fields), retained = existingOriginals.get(originalId);
            if (retained) {
              if (!retained.projectionWitnessRefs.includes(witnessId)) { charge(witnessId); retained.projectionWitnessRefs.push(witnessId); }
            } else {
              const value = { originalId, ...fields, projectionWitnessRefs: [witnessId] };
              charge(value); existingOriginals.set(originalId, value);
            }
            if (requests.size + existingOriginals.size > 2 * 673 * 124 || witnesses.size > 673 * 124) refuse('LEGACY_PLAN_BOUND');
            continue;
          }
          if (!processing.has(document)) processing.set(document, legacyProcessingIndex(document));
          const capture = captures[index];
          const evidence = (processing.get(document).get(canonical(capture)) ?? [])
            .filter(value => value.partIds === null || value.partIds.includes(part.partId));
          if (!evidence.length || new Set(evidence.map(value => value.signature)).size !== 1) refuse('LEGACY_PROCESSING_CONTEXT_UNAVAILABLE');
          evidence.sort((a, b) => canonical(a.evidence.path).localeCompare(canonical(b.evidence.path)));
          const reconstructionRequest = { zone, expectedSource: expectedLegacyNativeSource(source, step, capture, expected),
            capture, processingSignature: evidence[0].signature };
          const request = { partId: part.partId, entityId: expected.entityId, documentRole: role,
            nativeValidTime: step.nativeValidTime, reconstructionRequest, processingEvidence: evidence[0].evidence };
          const requestId = canonicalHash(request), existing = requests.get(requestId);
          if (existing) {
            if (!existing.projectionWitnessRefs.includes(witnessId)) { charge(witnessId); existing.projectionWitnessRefs.push(witnessId); }
          } else {
            const value = { requestId, ...request, projectionWitnessRefs: [witnessId] };
            charge(value); requests.set(requestId, value);
          }
          if (requests.size + existingOriginals.size > 2 * 673 * 124 || witnesses.size > 673 * 124) refuse('LEGACY_PLAN_BOUND');
        }
        selectedTimes.add(time);
      }
    }
    if ([...losses].some(time => !selectedTimes.has(time))) refuse('LEGACY_SELECTED_ENDPOINT_UNAVAILABLE');
  }
  return { schemaVersion: existingOriginals.size ? 2 : 1, kind: 'DMI_LEGACY_CURRENT_ORIGINAL_RECONSTRUCTION_REQUESTS',
    productionReferenceAt: target, modelBinding: { ...historyDemand.modelBinding }, historyDemandSha256,
    registrySha256: historyDemand.registrySha256, sourceHashes: { ...sourceHashes },
    sourcePaths: { ...RAVSCORE_LEGACY_CURRENT_ORIGINAL_SOURCE_PATHS },
    documentContexts: [...contexts.values()].sort((a, b) => a.documentRole.localeCompare(b.documentRole)),
    projectionWitnesses: [...witnesses.values()].sort((a, b) => a.witnessId.localeCompare(b.witnessId)),
    ...(existingOriginals.size ? { existingNativeOriginals: [...existingOriginals.values()]
      .sort((a, b) => a.originalId.localeCompare(b.originalId)) } : {}),
    reconstructionRequests: [...requests.values()].sort((a, b) => a.requestId.localeCompare(b.requestId)) };
}

async function readFixed(relative, optional = false) {
  try {
    const bytes = await fs.readFile(path.join(ROOT, relative));
    return { bytes, json: JSON.parse(bytes.toString('utf8')), sha256: hash(bytes) };
  } catch (error) {
    if (optional && error?.code === 'ENOENT') return null;
    throw error;
  }
}
function environmentBoolean(name) {
  const value = process.env[name] ?? 'false';
  if (!['true', 'false'].includes(value)) refuse('ENVIRONMENT_INVALID');
  return value === 'true';
}


async function main() {
  const retainCommittedRaw = process.argv.length === 3 && process.argv[2] === '--retain-committed-raw';
  if (process.argv.length !== 2 && !retainCommittedRaw) refuse('ARGUMENTS_INVALID');
  const productionReferenceAt = workflowTargetHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);
  const baselineRequired = environmentBoolean('RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE');
  const stateLessRecovery = environmentBoolean('RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED');
  const epochRequested = environmentBoolean('RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP');
  const checkpointOnly = environmentBoolean('CHECKPOINT_ONLY');
  const coldPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path];
  const coldSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];
  const coldRequested = coldPath !== undefined || coldSha256 !== undefined;
  if (coldRequested && (!coldPath || !coldSha256 || epochRequested || checkpointOnly
    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {
    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');
  }
  const registry = await readFixed(SOURCE_PATHS.registry);
  const baseline = await readFixed(SOURCE_PATHS.conditions, !baselineRequired);
  const conditions = baseline?.json ?? { zones: {} };
  if (baselineRequired && (!object(conditions.zones) || !object(conditions.coastalParts?.parts))) {
    refuse('BASELINE_REQUIRED');
  }
  // The compact part states are not inside the compressed zone-hour arrays.
  // Validate the existing lossless pack without materializing another hour copy.
  assertPrivateConditionsHourly(conditions);
  const epochView = epochRequested
    ? await (await import('./weather-state-epoch.mjs')).loadInstalledWeatherStateEpochInputView({
      targetReferenceAt: productionReferenceAt, registry: registry.json,
    }) : null;
  const currentFamilyColdStart = coldRequested
    ? await loadCurrentFamilyColdStartForTarget({ contextPath: coldPath,
      contextSha256: coldSha256, targetReferenceAt: productionReferenceAt }) : null;
  const coldInputs = currentFamilyColdStart === null ? null
    : currentFamilyColdStartScoreInputs(currentFamilyColdStart,
      { registry: registry.json, targetReferenceAt: productionReferenceAt });
  const activation = await readFixed(SOURCE_PATHS.activation, true);
  const activationPairs = coldInputs !== null ? coldInputs.pointStateInjections
    : epochView !== null ? {}
    : activation ? assertCoastalPointActivationStateInjection(activation.json) : {};
  // This is the SAME normal cache validator/compatible-reattest operation used
  // by Weather. It may update only its usual cache checkpoint, never B/S.
  const checkpoint = coldInputs !== null ? {
    loaded: false, continuationAvailable: false, states: coldInputs.checkpointStates,
    candidateGRollbackStates: coldInputs.checkpointCandidateGRollbackStates,
  } : epochView !== null ? {
    loaded: false, continuationAvailable: false, states: epochView.checkpointStates,
    candidateGRollbackStates: epochView.checkpointCandidateGRollbackStates,
  } : await loadRavScoreContinuationCheckpointForTarget({
    checkpointPath: path.join(ROOT, SOURCE_PATHS.checkpoint),
    targetReference: productionReferenceAt, repositoryRoot: ROOT,
  });
  const checkpointFile = await readFixed(SOURCE_PATHS.checkpoint, true);
  if (epochView === null && coldInputs === null && (checkpoint.loaded !== Boolean(checkpointFile)
    || (checkpoint.loaded && (checkpointFile.json.generationSha256 !== checkpoint.generationSha256
      || checkpointFile.json.productionReferenceAt !== checkpoint.checkpointAt
      || (checkpoint.continuationAvailable
        && !isDeepStrictEqual(checkpointFile.json.states, checkpoint.states)))))) {
    refuse('CHECKPOINT_CHANGED');
  }
  // The hash describes post-validation/normal-reattest cache bytes, not a new
  // authentication token. The returned genuine states determine demand only.
  const demand = buildRavScoreCurrentHistoryDemand({
    registry: registry.json, conditions: coldInputs !== null
      ? { ...conditions, coastalParts: coldInputs.previousCoastalParts }
      : epochView?.plannerConditions ?? conditions,
    checkpoint, activationPairs, productionReferenceAt,
    registrySha256: registry.sha256,
    sourceHashes: { conditions: baseline?.sha256 ?? null,
      checkpoint: checkpointFile?.sha256 ?? null, activation: activation?.sha256 ?? null },
    // These hashes still describe the actual preserved input artifacts, not
    // fabricated empty files. Selection is separately authorized by the real
    // archived input view; acquisition grants no numeric source admission.
    stateLessRecovery: coldInputs?.stateLessRecovery ?? epochView?.stateLessRecovery ?? stateLessRecovery,
  });
  // Historic/epoch APIs keep their existing acquisition behavior. Ordinary
  // installed B cannot silently fall back to local H0 or an empty pin set.
  if (currentFamilyColdStart !== null) {
    // This separate eviction policy is minted by the real archive capability;
    // it never describes OLD committed S dependencies as an empty ordinary set.
    demand.schemaVersion = 2;
    demand.rawRetention = currentFamilyColdStartRawRetention(currentFamilyColdStart,
      { registry: registry.json, targetReferenceAt: productionReferenceAt });
  } else if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {
    demand.schemaVersion = 2;
    demand.rawRetention = await readCommittedRawCurrentRetention(registry.json, checkpointFile, productionReferenceAt);
  }
  // Existing private .cache only; no directory creation, original rewrite,
  // provider operation, public artifact, checkpoint save or state promotion.
  await fs.writeFile(path.join(ROOT, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH),
    `${JSON.stringify(demand)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ kind: demand.kind, partCount: demand.demands.length,
    maximumSpanHours: Math.max(...demand.demands.map(row =>
      (Date.parse(row.endAt) - Date.parse(row.startAt)) / HOUR)) }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.code ?? 'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'); process.exitCode = 1; });
}
