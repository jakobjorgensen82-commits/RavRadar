#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { AssertionError } from 'node:assert';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, types } from 'node:util';
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
import { buildNewestValidRavScoreRecoverySources, nativeCurrentOriginalBankForPart } from './lib/ravscore-recovery-source-priority.mjs';
import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';
import { verifiedProtectedDmiPartHourly } from './lib/protected-dmi-current-context.mjs';
import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling, sameNativeIdentity } from './lib/dmi-forecast-store.mjs';
import { dmiMarineCollectionAllowedForZone } from './lib/dmi-marine-zone-exclusions.mjs';
import { collectPostH0DmiOriginalDependencies, POST_H0_DMI_ENDPOINT_DIAGNOSTICS } from './lib/post-h0-dmi-original-dependencies.mjs';
import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';
import { unpackDmiPartContinuity, assertDmiPartContinuityTotalSize } from './lib/dmi-part-continuity.mjs';
import { inspectDmiForecastFile, readDmiForecastRecord } from './lib/dmi-forecast-file.mjs';
import { localPartRuntimeProperties } from './lib/local-part-runtime.mjs';
import { readLiveCurrentPilot } from './lib/live-current-pilot.mjs';
import { mergeProtectedLiveCurrentPilotIntoRecord } from './lib/protected-live-current-assembly.mjs';
import { originalContextForProtectedDmiCurrent } from './lib/protected-dmi-current-context.mjs';
import { readCurrentPrivateRuntimeCompanionInput, readAuthenticatedCurrentCompanions }
  from './read-authenticated-dmi-current-companions.mjs';
import { CURRENT_FAMILY_COLD_START_CONTEXT_ENV,
  loadCurrentFamilyColdStartForTarget, currentFamilyColdStartScoreInputs,
  currentFamilyColdStartRawRetention } from './current-family-cold-start.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILTIN_ERROR_STACK=Object.getOwnPropertyDescriptor(new Error(),'stack');
const BUILTIN_ERROR_PREPARE_STACK=Object.getOwnPropertyDescriptor(Error,'prepareStackTrace');
const CURRENT_HISTORY_FAILURE_PHASES=new Set(['INPUTS','BASELINE_FILES','PACKED_BASELINE','CHECKPOINT',
  'DEMAND','COMMITTED_RAW_RETENTION','SAVE','UNKNOWN']);
let currentHistoryFailurePhase='INPUTS';
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

function assertCommittedRawRetentionInputs({ registry, conditions, checkpoint, boundary,
  zones, persistedHourlyByPart, protectedCompanionContexts }) {
  if (!object(boundary) || boundary.datasetId !== conditions?.datasetId
    || boundary.productionReferenceAt !== conditions?.productionReferenceAt
    || boundary.datasetId !== checkpoint?.datasetId || boundary.productionReferenceAt !== checkpoint?.productionReferenceAt
    || boundary.checkpointGenerationSha256 !== checkpoint?.generationSha256
    || !/^[a-f0-9]{64}$/.test(boundary.bundleContentSha256 ?? '')
    || !/^[a-f0-9]{64}$/.test(boundary.conditionsSha256 ?? '')
    || !object(registry?.zones) || !object(conditions?.coastalParts?.parts)
    || !object(checkpoint?.states) || !Array.isArray(zones?.features)
    || !(persistedHourlyByPart instanceof Map) || !Array.isArray(protectedCompanionContexts)
    || protectedCompanionContexts.length > 2) refuse('RETENTION_INPUT_INVALID');
}

// One private per-PART source projection, shared by ordinary retention and the
// fixed observational diagnostic. No callback, route override or proof admission.
function projectCommittedRawRetentionPart({ part, expected, target, conditions, checkpoint, boundary,
  zones, protectedBulk, progressCandidate, historicalBulk, protectedCompanionContexts,
  persistedHourlyByPart, liveCurrentPilot }) {
  const selected = selectRavScoreProductionInitialState({ part,
    existingPart: conditions.coastalParts.parts[part.partId], targetReferenceAt: target });
  // Never release an OLD point's dependencies by a local point/cold rewrite.
  // A changed context must first use a separately reviewed normal transition.
  if (selected.source !== 'EXISTING_INTEGRATED' || selected.state.time !== boundary.productionReferenceAt
    || !isDeepStrictEqual(selected.state, checkpoint.states[part.partId])) {
    refuse('RETENTION_COMMITTED_STATE_REQUIRED');
  }
  const startAt = ravScoreOwnerCurrentHistoryStartAt(part, selected.state,
    ravScoreRecoverySourceStartAt(selected.state, target), { requireNativeGridSampling: true });
  const feature = { properties: localPartRuntimeProperties(
    zones.features.find(row => row?.properties?.id === part.zoneId)?.properties ?? {}, part, expected.entityId) };
  const protectedContexts = [protectedBulk, historicalBulk];
  const persisted = persistedHourlyByPart.get(part.partId);
  const records = [];
  for (const [document, previous] of [[protectedBulk, true], [progressCandidate, false]]) {
    let record = buildPrivateDmiRecoveryRecord(feature, document, target, { startAt, expectedIdentity: expected,
      ...(previous ? { persistedHourly: persisted?.hourly ?? [],
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
      // Original B companions support only proof of the protected selection;
      // they never become mapper inputs, new candidates or source priority.
      nativeCurrentContexts: previous ? [...contexts, ...protectedCompanionContexts] : contexts,
      ...(previous && persisted?.nativeCurrentOriginals != null
        ? { nativeCurrentOriginals: persisted.nativeCurrentOriginals } : {}),
      record: { ...record, hourly } });
  }
  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource: records[0],
    preferredSource: records[1], protectedPreviousSource: records[0], productionReferenceAt: target, part });
  return { selected, recoverySources };
}

export { assertCommittedRawRetentionInputs, projectCommittedRawRetentionPart };

// Retention only: normal immutable-B verification and actual S parity happen
// in the fixed caller below. This pure projection never authenticates/admit rows.
export function buildRavScoreRawCurrentRetention({ registry, conditions, checkpoint,
  productionReferenceAt, boundary, protectedBulk, progressCandidate = null,
  progressActive = null, historicalBulk = null, protectedCompanionContexts = [],
  persistedHourlyByPart = new Map(), liveCurrentPilot = null, zones } = {}) {
  const target = exactHour(productionReferenceAt), captures = new Map();
  assertCommittedRawRetentionInputs({ registry, conditions, checkpoint, boundary,
    zones, persistedHourlyByPart, protectedCompanionContexts });
  let partCount = 0;
  for (const [zoneId, entries] of Object.entries(registry.zones)) for (const entry of entries) {
    const part = { ...entry, zoneId }, expected = dmiExpectedIdentityForPart(part);
    const { selected, recoverySources } = projectCommittedRawRetentionPart({
      part, expected, target, conditions, checkpoint, boundary, zones, protectedBulk, progressCandidate,
      historicalBulk, protectedCompanionContexts, persistedHourlyByPart, liveCurrentPilot });
    partCount++;
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

// RAW eviction protection only: the normal reader/collector has already
// completed with authentic B/S. No capture here selects or admits a numeric row.
export function withInstalledCoherentRawTransportRetention(retention, transportCaptures) {
  if (!object(retention) || retention.schemaVersion !== 1
    || retention.kind !== 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION'
    || !Array.isArray(retention.captures) || !Array.isArray(transportCaptures)) refuse('RETENTION_CAPTURE_REQUIRED');
  if (retention.captures.length > 4096 || transportCaptures.length > 4096) refuse('RETENTION_BOUND');
  const captures = new Map();
  for (const raw of [...retention.captures, ...transportCaptures]) {
    const capture = canonicalSavedDmiOriginalCapture(raw);
    if (!capture || !isDeepStrictEqual(capture, raw)) refuse('RETENTION_CAPTURE_REQUIRED');
    captures.set(canonical(capture), capture);
    if (captures.size > 4096) refuse('RETENTION_BOUND');
  }
  return { ...retention,
    captures: [...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value) };
}

// Fixed diagnostic-only identity decomposition. Detached probes are observations,
// never source rows, endpoint evidence, admission or a replacement comparator.
function current586IdentityDifferenceDetails(nativeSource, wireIdentity, forecastSource, expected) {
  const native = structuredClone(nativeSource), forecast = structuredClone(forecastSource);
  const groups = {
    collectionFamily: ['collection', 'collectionFamily'], modelRun: ['modelRun'],
    entity: ['component', 'componentKind', 'entityId', 'parentZoneId', 'entityType', 'samplingContext'],
    gridDefinition: ['gridDefinitionSha256'], gridLocation: ['gridPoint'],
    samplingLocation: ['samplingPoint'], distance: ['distanceKm'],
    vector: ['vectorSelection', 'vectorSemanticsVersion'],
    spatial: ['spatialSelection', 'spatialSemanticsVersion'],
    layer: ['verticalLayer', 'verticalLayerRankM'], fieldSet: ['fieldSet'],
  };
  const nativeMismatch = !sameNativeIdentity(native, forecast, 'current'), nativeGroups = {};
  for (const [group] of Object.entries(groups)) {
    const probe = structuredClone(forecast);
    // Isolate one actual field group; all other comparator inputs are exact
    // detached native copies. Canonical tolerances remain in sameNativeIdentity.
    for (const [other, fields] of Object.entries(groups)) if (other !== group) for (const key of fields) {
      if (Object.hasOwn(native, key)) probe[key] = structuredClone(native[key]);
      else delete probe[key];
    }
    nativeGroups[group] = !sameNativeIdentity(structuredClone(native), probe, 'current');
  }
  const wireShape = wireIdentity !== null && typeof wireIdentity === 'object'
    && !Array.isArray(wireIdentity)
    && Object.keys(wireIdentity).sort().join(',') === Object.keys(expected).sort().join(',');
  const wire = wireShape ? structuredClone(wireIdentity) : null;
  const wireMismatch = !dmiOriginalWireIdentityMatchesCentralIdentity(wire, expected);
  const wireStringsMatch = wireShape && dmiOriginalWireIdentityMatchesCentralIdentity({
    ...wire, samplingPoint: structuredClone(expected.samplingPoint) }, expected);
  const wirePointMatches = wireShape && dmiOriginalWireIdentityMatchesCentralIdentity({
    ...structuredClone(expected), samplingPoint: structuredClone(wire.samplingPoint) }, expected);
  return {
    wireMismatch, wireShapeMismatch: !wireShape,
    wireStringMismatch: wireShape && !wireStringsMatch,
    wirePointMismatch: wireShape && !wirePointMatches,
    wireUnclassifiedMismatch: wireMismatch && wireShape && wireStringsMatch && wirePointMatches,
    nativeMismatch, nativeGroups,
    nativeUnclassifiedMismatch: nativeMismatch && !Object.values(nativeGroups).some(Boolean),
  };
}

// Fixed observational follow-up to the ordinary 39666991481/1 failure.
// This entry cannot change the ordinary source projection or return evidence,
// captures, selected rows, state, identities or an admission capability.
export function diagnoseCurrent586SelectedEndpoints(options = {}) {
  const { registry, conditions, checkpoint, boundary, zones, protectedBulk,
    progressCandidate = null, progressActive = null, historicalBulk = null,
    protectedCompanionContexts = [], persistedHourlyByPart = new Map(), liveCurrentPilot = null } = options;
  const target = exactHour(options.productionReferenceAt);
  if (target !== '2026-10-21T20:00:00.000Z') refuse('FIXED_ENDPOINT_DIAGNOSTIC_SCOPE');
  assertCommittedRawRetentionInputs({ registry, conditions, checkpoint, boundary,
    zones, persistedHourlyByPart, protectedCompanionContexts });
  if (!Number.isSafeInteger(registry.partCount) || registry.partCount < 1 || registry.partCount > 673) {
    refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');
  }
  const roleNames = ['deployed-private-runtime', 'progressive-private-dmi'];
  const scopeCounts = () => ({ selectionsProved: 0, selectionsRejected: 0,
    nativeStepsRequested: 0, exactNativeStepsFound: 0, endpointProbeRejected: 0 });
  const roleCounts = () => ({ partsPresent: 0, originalWrapperAbsent: 0,
    originalBankExplicitNull: 0, originalBankPresent: 0, directForwardRows: 0,
    unknownSamplingRows: 0, coherentSamplingRows: 0, invalidSamplingRows: 0,
    firstNativeEndpointMissingParts: 0,
    own: scopeCounts(), bank: scopeCounts(), companions: scopeCounts(), all: scopeCounts(),
    contextMismatch: { timeNotObserved: 0, onlyDerivedNativeAtTime: 0,
      nativeValidationRejected: 0, identityMismatch: 0, samplingPresenceMismatch: 0,
      stepFieldsMismatch: 0, exactNativeObserved: 0 },
    identityMismatchDetails: {
      countingUnit: 'ELIGIBLE_CANDIDATE_OCCURRENCES_PER_ENDPOINT',
      countsMayOverlap: true, uniqueOriginalsClaimed: false, singularCauseClaimed: false,
      endpointSteps: 0, candidateOccurrences: 0,
      wireMismatch: 0, wireShapeMismatch: 0, wireStringMismatch: 0, wirePointMismatch: 0,
      wireUnclassifiedMismatch: 0, nativeMismatch: 0, nativeUnclassifiedMismatch: 0,
      nativeGroups: { collectionFamily: 0, modelRun: 0, entity: 0, gridDefinition: 0,
        gridLocation: 0, samplingLocation: 0, distance: 0, vector: 0, spatial: 0,
        layer: 0, fieldSet: 0 },
    } });
  const result = { schemaVersion: 1, kind: 'CURRENT586_SELECTED_ENDPOINT_DIAGNOSTIC',
    fixedScope: 'CURRENT586_ENDPOINTS_39666991481_1',
    geometryScope: 'AUTHENTICATED_ORIGINAL_B_PARTS_ONLY',
    selectionScope: 'NORMAL_PRIORITY_PROJECTED_CANDIDATES_NOT_FINAL_REPLAY_UNION',
    scope: 'FIRST_NORMAL_COLLECTOR_FAILURE_ONLY', visitedParts: 0, normalCollectorCompletedParts: 0, normalCollectorEndpointMissingParts: 0,
    normalCollectorOtherRefusedParts: 0, firstMissingRoleNotLocatedParts: 0,
    roles: Object.fromEntries(roleNames.map(role => [role, roleCounts()])),
    sourcePriorityChanged: false, nativeAdmissionPerformed: false, rawVectorsIncluded: false,
    identityIncluded: false, actualSParityProved: false, providerRequestsPerformed: false,
    firstFailureCategory: 'NO_NORMAL_COLLECTOR_REFUSAL', firstFailureCode: null };
  const begun = Date.now();
  for (const [zoneId, entries] of Object.entries(registry.zones)) for (const entry of entries) {
    if (Date.now() - begun > 600_000 || result.visitedParts >= 673) refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');
    const part = { ...entry, zoneId }, expected = dmiExpectedIdentityForPart(part);
    const { selected, recoverySources } = projectCommittedRawRetentionPart({
      part, expected, target, conditions, checkpoint, boundary, zones, protectedBulk,
      progressCandidate, historicalBulk, protectedCompanionContexts, persistedHourlyByPart, liveCurrentPilot });
    result.visitedParts++;
    let nativeEndpointMissing = false;
    try {
      // Exact unchanged normal collector; no evidence/admission is returned.
      collectPostH0DmiOriginalDependencies({ part, initialSelection: selected,
        targetReferenceAt: target, recoverySources, liveCurrentPilot });
      result.normalCollectorCompletedParts++;
      continue; // Observe only the first refusal, not a national proof matrix.
    } catch (error) {
      nativeEndpointMissing = error?.originalDependencyCode ===
        'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING';
      result[nativeEndpointMissing ? 'normalCollectorEndpointMissingParts' : 'normalCollectorOtherRefusedParts']++;
      result.firstFailureCategory = nativeEndpointMissing ? 'NATIVE_ENDPOINT_MISSING' : 'OTHER_NORMAL_COLLECTOR_REFUSAL';
      const known = [...POST_H0_DMI_ENDPOINT_DIAGNOSTICS,
        'INPUT_INVALID', 'INPUT_BOUND', 'WINDOW_INVALID', 'INITIAL_SELECTION_INVALID', 'INITIAL_STATE_INVALID',
        'SAMPLING_MISMATCH', 'HOLD_SUPPORT_REQUIRED', 'SOURCE_DOMAIN_EXCLUDED', 'SELECTED_CURRENT_INVALID',
        'REGIONAL_SUPPORT_REQUIRED', 'CAPTURE_INCOMPLETE', 'PLAN_BOUND'];
      result.firstFailureCode = known.map(code => 'POST_H0_DMI_ORIGINAL_' + code).includes(error?.originalDependencyCode)
        ? error.originalDependencyCode : 'OTHER_NORMAL_COLLECTOR_REFUSAL';
      if (!nativeEndpointMissing) return result;
    }
    const allBanks = [];
    for (const candidate of recoverySources) {
      const bank = nativeCurrentOriginalBankForPart(candidate, part);
      if (bank === null) continue;
      // Validate each actual wrapper/bank independently; never merge evidence.
      createProtectedDmiNativeCurrentInspector({ contexts: [], previousBank: bank });
      if (!allBanks.some(value => isDeepStrictEqual(value, bank))) allBanks.push(bank);
    }
    if (allBanks.length > 1) {
      result.allBankProbeStatus = 'REFUSED_MULTIPLE_DISTINCT_BANKS';
      return result;
    }
    const allBank = allBanks[0] ?? null;
    result.allBankProbeStatus = allBank === null ? 'NO_PROVIDED_BANK' : 'ONE_EXISTING_PROVIDED_BANK';
    let firstMissingLocated = false;
    for (const source of recoverySources) {
      const count = result.roles[source.source];
      if (!count) refuse('FIXED_ENDPOINT_DIAGNOSTIC_ROLE');
      count.partsPresent++;
      const bank = nativeCurrentOriginalBankForPart(source, part);
      count[source.nativeCurrentOriginals == null ? 'originalWrapperAbsent'
        : bank === null ? 'originalBankExplicitNull' : 'originalBankPresent']++;
      const contexts = source.nativeCurrentContexts ?? [];
      const allContexts = [...new Set([...contexts, protectedBulk, historicalBulk,
        progressCandidate, progressActive, ...protectedCompanionContexts].filter(Boolean))];
      const probes = {
        own: createProtectedDmiNativeCurrentInspector({ contexts, previousBank: bank }),
        bank: createProtectedDmiNativeCurrentInspector({ contexts: [], previousBank: bank }),
        companions: createProtectedDmiNativeCurrentInspector({ contexts: protectedCompanionContexts }),
        all: createProtectedDmiNativeCurrentInspector({ contexts: allContexts, previousBank: allBank }),
      };
      const candidatesAt = new Map();
      const add = (row, document, zone) => {
        if (!row || !Number.isFinite(Date.parse(row.time))) return;
        const key = Date.parse(row.time), values = candidatesAt.get(key) ?? [];
        if (values.length >= 10_000) refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');
        // Match the normal inspector's contextFrom: copy only existing wire
        // identity fields, never desired central values or the whole hourly zone.
        const wireIdentity = object(zone) ? Object.fromEntries(Object.keys(expected)
          .filter(key => Object.hasOwn(zone, key)).map(key => [key, zone[key]])) : null;
        values.push({ row, document, zone, wireIdentity }); candidatesAt.set(key, values);
      };
      for (const document of allContexts) {
        const zone = document?.zones?.[expected.entityId];
        const rows = zone?.hourly;
        if (!rows) continue;
        if (!object(rows) || Object.keys(rows).length > 10_000) refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');
        for (const row of Object.values(rows)) add(row, document, zone);
      }
      if (allBank) {
        const contextById = new Map(allBank.contexts.map(value => [value.id, value.value]));
        for (const value of allBank.nativeRows) {
          const native = value.value, context = contextById.get(native.contextId);
          add({ time: native.time, 'current-u': native.uMps, 'current-v': native.vMps,
            sources: { current: native.source } }, context?.header, context?.zone);
        }
      }
      for (const row of source.record.hourly) {
        const at = Date.parse(row.time);
        if (at <= Date.parse(selected.state.time) || at >= Date.parse(target)) continue;
        const provenance = row.currentProvenance?.status === 'verified'
          ? row.currentProvenance : row.sources?.current;
        if (provenance?.provider !== 'dmi' || provenance.vectorSemanticsVersion === 4
          || !['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']
            .every(key => Number.isFinite(row[key]))) continue;
        const direct = { part, row: { time: row.time, currentUMps: row.currentUMps,
          currentVMps: row.currentVMps, sources: { current: row.sources?.current } } };
        if (probes.own.inspect(direct).code !== 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING') continue;
        count.directForwardRows++;
        const sampling = inspectDmiForecastGridSampling(provenance, 'current', row.time, expected).status;
        count[sampling === 'unknown' ? 'unknownSamplingRows'
          : sampling === 'coherent' ? 'coherentSamplingRows' : 'invalidSamplingRows']++;
        const original = row.sources?.current;
        const selection = { part, row: { time: row.time, currentUMps: row.currentUMps,
          currentVMps: row.currentVMps, sources: { current: original } } };
        let ownMissing = false;
        for (const [scope, inspector] of Object.entries(probes)) {
          const proof = inspector.inspect(selection);
          const endpoints = inspector.inspectEndpointOriginals(selection);
          const observed = count[scope];
          observed[proof.ok ? 'selectionsProved' : 'selectionsRejected']++;
          observed.nativeStepsRequested += Array.isArray(original?.nativeSteps) ? original.nativeSteps.length : 0;
          if (endpoints.ok) observed.exactNativeStepsFound += endpoints.endpoints.filter(Boolean).length;
          else observed.endpointProbeRejected++;
          if (scope === 'own' && proof.code === 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING') ownMissing = true;
        }
        if (nativeEndpointMissing && ownMissing && !firstMissingLocated) {
          count.firstNativeEndpointMissingParts++; firstMissingLocated = true;
        }
        // Diagnostic stages are only observations of provided contexts/bank.
        // Pure/native validator requirements are NOT relaxed to make a match.
        for (const step of original?.nativeSteps ?? []) {
          const candidates = candidatesAt.get(Date.parse(step.nativeValidTime)) ?? [];
          const pure = candidates.filter(({ row: native }) =>
            !['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours']
              .some(key => Object.hasOwn(native.sources?.current ?? {}, key)));
          const eligible = pure.filter(({ row: native, document, zone }) =>
            Number.isFinite(native['current-u']) && Number.isFinite(native['current-v'])
            && verifiedDmiNativeComponentSource(native.sources?.current, native.time, 'current', expected)
            && verifiedBulkCurrent(document, zone, part.waterPoint, native.sources.current, native.time, expected));
          const identity = eligible.filter(({ row: native, wireIdentity }) =>
            dmiOriginalWireIdentityMatchesCentralIdentity(wireIdentity, expected)
            && sameNativeIdentity(native.sources.current, original, 'current'));
          const presence = identity.filter(({ row: native }) =>
            Object.hasOwn(step, 'nativeGridSampling') === Object.hasOwn(native.sources.current, 'nativeGridSampling'));
          const exact = presence.filter(({ row: native }) => Object.entries(step).every(([key, value]) =>
            key === 'nativeValidTime' ? Date.parse(native.sources.current[key]) === Date.parse(value)
              : isDeepStrictEqual(native.sources.current[key], value)));
          const category = !candidates.length ? 'timeNotObserved' : !pure.length ? 'onlyDerivedNativeAtTime'
            : !eligible.length ? 'nativeValidationRejected' : !identity.length ? 'identityMismatch'
            : !presence.length ? 'samplingPresenceMismatch' : !exact.length ? 'stepFieldsMismatch' : 'exactNativeObserved';
          count.contextMismatch[category]++;
          if (category === 'identityMismatch') {
            const detail = count.identityMismatchDetails;
            detail.endpointSteps++;
            // One occurrence may fail several groups, and repeated provided
            // contexts are not deduplicated into invented unique originals.
            for (const candidate of eligible) {
              const observedIdentity = current586IdentityDifferenceDetails(
                candidate.row.sources.current, candidate.wireIdentity, original, expected);
              detail.candidateOccurrences++;
              for (const key of ['wireMismatch', 'wireShapeMismatch', 'wireStringMismatch',
                'wirePointMismatch', 'wireUnclassifiedMismatch', 'nativeMismatch', 'nativeUnclassifiedMismatch'])
                detail[key] += Number(observedIdentity[key]);
              for (const [group, mismatch] of Object.entries(observedIdentity.nativeGroups))
                detail.nativeGroups[group] += Number(mismatch);
            }
          }
        }
        return result; // Exact first missing row/role only; no later source scan.
      }
    }
    if (nativeEndpointMissing && !firstMissingLocated) result.firstMissingRoleNotLocatedParts++;
    return result;
  }
  if (result.visitedParts !== registry.partCount || Object.keys(checkpoint.states).length !== result.visitedParts) refuse('RETENTION_INVENTORY');
  return result;
}

async function readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt,
  prepareCachedNativeOriginals = false) {
  const { verified, conditions, conditionsPath: file, conditionsSha256, verify } =
    await readCurrentPrivateRuntimeCompanionInput(productionReferenceAt);
  if (!checkpointFile) refuse('RETENTION_B_CHANGED');
  const work = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-raw-retention-'));
  let checkpoint;
  try {
    const output = path.join(work, 'checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ sourcePath: file, checkpointPath: output,
      expectedPartCount: registry.partCount, repositoryRoot: ROOT });
    checkpoint = JSON.parse(await fs.readFile(output, 'utf8'));
    if (!isDeepStrictEqual(checkpoint, checkpointFile.json)) refuse('RETENTION_B_S_DIFFER');
  } finally { await fs.rm(work, { recursive: true }); }
  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, conditions);
  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));
  const preamble = prepareCachedNativeOriginals
    ? await import('./prepare-cached-coherent-current-work.mjs') : null;
  const workingInputs = preamble === null ? null : await preamble.snapshotCoherentCurrentWorkInputs();
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
  if (preamble !== null) {
    await preamble.assertCoherentCurrentWorkInputs(workingInputs);
    const prepared = await preamble.prepareCachedCoherentCurrentWork({
      registry, conditions, checkpoint, boundary, zones, productionReferenceAt,
      protectedBulk, progressCandidate: candidate ?? active, progressActive: active,
      historicalBulk, protectedCompanionContexts, liveCurrentPilot, forecast,
      workingInputs, pythonExecutable: process.env.PYTHON ?? 'python' });
    await verify(); // ORIGINAL authenticated B/S, never the derived work file.
    const transportCaptures = await preamble.installPreparedCoherentCurrentWork(prepared);
    // Re-enter the UNCHANGED normal reader/collector from the actual new bytes.
    const retention = await readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt);
    // Keep measured RAW alive until normal RAW-SAVE/new durable B/S. This union
    // happens only after the complete recursive reader and BEFORE demand SAVE.
    return withInstalledCoherentRawTransportRetention(retention, transportCaptures);
  }
  const all = new Map(), byPart = new Map(parts.map(part => [part.partId, part]));
  const collect = (part, persistedHourlyByPart) => {
    const result = buildRavScoreRawCurrentRetention({
      registry: { ...registry, partCount: 1, zones: { [part.zoneId]: [part] } },
      conditions: { ...conditions, coastalParts: { ...conditions.coastalParts,
        parts: { [part.partId]: conditions.coastalParts.parts[part.partId] } } },
      checkpoint: { ...checkpoint, states: { [part.partId]: checkpoint.states[part.partId] } },
      productionReferenceAt, boundary, protectedBulk, progressCandidate: candidate ?? active, progressActive: active,
      historicalBulk, protectedCompanionContexts, persistedHourlyByPart, liveCurrentPilot, zones });
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
  const prepareCachedNativeOriginals = process.argv.length === 4
    && process.argv[2] === '--retain-committed-raw' && process.argv[3] === '--prepare-cached-native-originals';
  const retainCommittedRaw = prepareCachedNativeOriginals
    || process.argv.length === 3 && process.argv[2] === '--retain-committed-raw';
  if (process.argv.length !== 2 && !retainCommittedRaw) refuse('ARGUMENTS_INVALID');
  const productionReferenceAt = workflowTargetHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);
  const baselineRequired = environmentBoolean('RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE');
  const stateLessRecovery = environmentBoolean('RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED');
  const epochRequested = environmentBoolean('RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP');
  const checkpointOnly = environmentBoolean('CHECKPOINT_ONLY');
  const coldPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path];
  const coldSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];
  const coldRequested = coldPath !== undefined || coldSha256 !== undefined;
  // Explicit default-OFF ordinary work derivation only. No isolated/cold/
  // checkpoint/quick view may borrow current B/native evidence through this.
  if (prepareCachedNativeOriginals && (!baselineRequired || stateLessRecovery || epochRequested
    || checkpointOnly || coldRequested || environmentBoolean('QUICK_CONFIRMATION'))) {
    refuse('CACHED_NATIVE_ORIGINAL_MODE_COLLISION');
  }
  if (coldRequested && (!coldPath || !coldSha256 || epochRequested || checkpointOnly
    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {
    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');
  }
  currentHistoryFailurePhase='BASELINE_FILES';
  const registry = await readFixed(SOURCE_PATHS.registry);
  const baseline = await readFixed(SOURCE_PATHS.conditions, !baselineRequired);
  const conditions = baseline?.json ?? { zones: {} };
  if (baselineRequired && (!object(conditions.zones) || !object(conditions.coastalParts?.parts))) {
    refuse('BASELINE_REQUIRED');
  }
  // The compact part states are not inside the compressed zone-hour arrays.
  // Validate the existing lossless pack without materializing another hour copy.
  currentHistoryFailurePhase='PACKED_BASELINE';
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
  currentHistoryFailurePhase='CHECKPOINT';
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
  currentHistoryFailurePhase='DEMAND';
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
    currentHistoryFailurePhase='COMMITTED_RAW_RETENTION';
    demand.schemaVersion = 2;
    demand.rawRetention = await readCommittedRawCurrentRetention(registry.json, checkpointFile, productionReferenceAt,
      prepareCachedNativeOriginals);
  }
  // Existing private .cache only; no directory creation, original rewrite,
  // provider operation, public artifact, checkpoint save or state promotion.
  currentHistoryFailurePhase='SAVE';
  await fs.writeFile(path.join(ROOT, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH),
    `${JSON.stringify(demand)}\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ kind: demand.kind, partCount: demand.demands.length,
    maximumSpanHours: Math.max(...demand.demands.map(row =>
      (Date.parse(row.endAt) - Date.parse(row.startAt)) / HOUR)) }));
}

// CLI observation only. Never expose messages, assertion values or raw stacks,
// and never change the original stop, state, inputs or selected sources.
export async function describeRavScoreCurrentHistoryFailure(error,phase='UNKNOWN') {
  const result={kind:'RAVSCORE_CURRENT_HISTORY_FIRST_FAILURE',code:'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED',
    phase:CURRENT_HISTORY_FAILURE_PHASES.has(phase)?phase:'UNKNOWN',
    exceptionType:'UNKNOWN',operator:null,frame:null,privatePayloadIncluded:false};
  try{
    if(types.isProxy(error)||!types.isNativeError(error))return result;
    const prototype=Object.getPrototypeOf(error);
    result.exceptionType=new Map([[Error.prototype,'ERROR'],[AssertionError.prototype,'ASSERTION_ERROR'],
      [TypeError.prototype,'TYPE_ERROR'],[RangeError.prototype,'RANGE_ERROR'],[SyntaxError.prototype,'SYNTAX_ERROR'],
      [ReferenceError.prototype,'REFERENCE_ERROR']]).get(prototype)??'UNKNOWN';
    if(result.exceptionType==='UNKNOWN')return result;
    const message=Object.getOwnPropertyDescriptor(error,'message');
    const name=Object.getOwnPropertyDescriptor(error,'name')??Object.getOwnPropertyDescriptor(prototype,'name');
    // Node22 can format its lazy data stack during descriptor collection too.
    // Inspect only safe descriptors before either runtime can format anything.
    if(!isDeepStrictEqual(Object.getOwnPropertyDescriptor(Error,'prepareStackTrace'),BUILTIN_ERROR_PREPARE_STACK)
      ||!message||!Object.hasOwn(message,'value')||typeof message.value!=='string'
      ||!name||!Object.hasOwn(name,'value')||typeof name.value!=='string')return result;
    const own=Object.getOwnPropertyDescriptors(error),data=key=>own[key]&&Object.hasOwn(own[key],'value')?own[key].value:undefined;
    const reasons=new Set(['ARGUMENTS_INVALID','BASELINE_INVALID','BASELINE_REQUIRED','CHECKPOINT_CHANGED','CHECKPOINT_INVALID',
      'CURRENT_FAMILY_COLD_START_MODE_COLLISION','ENVELOPE_INVALID','ENVIRONMENT_INVALID','IDENTITY_INVALID',
      'LEGACY_CAPTURE_UNAVAILABLE','LEGACY_CONTEXT_UNAVAILABLE','LEGACY_DEMAND_INVALID','LEGACY_DONOR_INVALID',
      'LEGACY_EXISTING_ORIGINAL_UNAVAILABLE','LEGACY_HOLD_SUPPORT_UNAVAILABLE','LEGACY_INPUTS_INVALID',
      'LEGACY_NEW_ENDPOINT_UNAVAILABLE','LEGACY_PLAN_BOUND','LEGACY_PROCESSING_CONTEXT_UNAVAILABLE','LEGACY_SELECTED_ENDPOINT_UNAVAILABLE',
      'MODE_INVALID','NON_INTEGRATED_ROUTE','NONCANONICAL_TIME','RANGE_INVALID','REGISTRY_INVALID','REGISTRY_INVENTORY_MISMATCH',
      'RETENTION_B_CHANGED','RETENTION_B_PATH','RETENTION_B_S_DIFFER','RETENTION_BOUND','RETENTION_CAPTURE_REQUIRED',
      'RETENTION_COMMITTED_STATE_REQUIRED','RETENTION_DONOR_INVALID','RETENTION_INPUT_INVALID','RETENTION_INVENTORY',
      'RETENTION_NATIVE_INVALID','RETENTION_NATIVE_REQUIRED','STATE_SOURCE_MISMATCH','STATE_TIME_INVALID','TARGET_REQUIRED']);
    const code=data('code'),prefix='RAVSCORE_CURRENT_HISTORY_DEMAND_';
    if(typeof code==='string'&&code.startsWith(prefix)&&reasons.has(code.slice(prefix.length)))result.code=code;
    else if(['ERR_ASSERTION','ENOENT','EEXIST','EACCES','EPERM','EIO','ENOSPC','ENOMEM'].includes(code))result.code=code;
    const originalDependencyCode=data('originalDependencyCode');
    const operator=data('operator');
    if(['strictEqual','deepStrictEqual','equal','deepEqual','ok','match','throws','rejects'].includes(operator))result.operator=operator;
    let stack=data('stack');
    // Node24 exposes the VM's own stack accessor rather than a data property.
    // Never invoke a caller getter or a replaced formatter to recover a frame.
    if(stack===undefined&&own.stack?.get===BUILTIN_ERROR_STACK?.get&&own.stack?.get!==undefined){
      if(Reflect.ownKeys(own).some(key=>!Object.hasOwn(own[key],'value')
        &&!(key==='stack'&&own.stack.get===BUILTIN_ERROR_STACK.get&&own.stack.set===BUILTIN_ERROR_STACK.set)))return result;
      stack=Reflect.apply(BUILTIN_ERROR_STACK.get,error,[]);
    }
    if(typeof stack!=='string'||stack.length>2*1024*1024)return result;
    for(const line of stack.split(/\r?\n/)){
      const match=/^\s+at (?:[^\r\n()]* \()?((?:file:\/\/\/)[^\r\n()]+):(\d+):(\d+)\)?$/.exec(line);
      if(!match)continue;
      try{
        const url=new URL(match[1]);if(url.host||url.search||url.hash)continue;
        const file=fileURLToPath(url),relative=path.relative(ROOT,file).split(path.sep).join('/');
        if(!/^(?:scripts|js\/core)\/[A-Za-z0-9_./-]+\.(?:mjs|js)$/.test(relative)
          ||relative.split('/').includes('..')||await fs.realpath(file)!==file)continue;
        const before=await fs.lstat(file,{bigint:true});
        if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>2n*1024n*1024n)continue;
        const body=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
        if(!['dev','ino','size','mtimeNs','ctimeNs'].every(key=>before[key]===after[key])||BigInt(body.length)!==before.size)continue;
        const at=Number(match[2]),column=Number(match[3]);
        if(!Number.isSafeInteger(at)||at<1||at>body.toString('utf8').split(/\r?\n/).length
          ||!Number.isSafeInteger(column)||column<1||column>100000)continue;
        result.frame={module:relative,sha256:crypto.createHash('sha256').update(body).digest('hex'),line:at,column};
        // This fixed diagnostic family is not replay/publication authority.
        // A code attached to another error/frame is not its original failure.
        const originalDependencyReasons=new Set(['CAPTURE_INCOMPLETE','HOLD_SUPPORT_REQUIRED',
          'INITIAL_SELECTION_INVALID','INITIAL_STATE_INVALID','INPUT_BOUND','INPUT_INVALID','PLAN_BOUND',
          'REGIONAL_SUPPORT_REQUIRED','SAMPLING_MISMATCH','SELECTED_CURRENT_INVALID',
          'SELECTED_ENDPOINT_UNAVAILABLE','SOURCE_DOMAIN_EXCLUDED','WINDOW_INVALID']);
        const endpointDependencyReasons=new Set(POST_H0_DMI_ENDPOINT_DIAGNOSTICS);
        const originalPrefix='POST_H0_DMI_ORIGINAL_';
        if(result.code==='RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'&&prototype===Error.prototype
          &&typeof originalDependencyCode==='string'&&originalDependencyCode.startsWith(originalPrefix)
          &&(originalDependencyReasons.has(originalDependencyCode.slice(originalPrefix.length))
            ||endpointDependencyReasons.has(originalDependencyCode.slice(originalPrefix.length))
              &&message.value==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE')
          &&relative==='scripts/lib/post-h0-dmi-original-dependencies.mjs'
          &&result.frame.sha256==='a49ea641f76af721c43a13a091aa102e0904a3730803859d7c5f5e29e7c516bc'
          &&at===18)result.code=originalDependencyCode;
        // Diagnostic-only closed work/decode/reprojection codes. The first
        // qualified frame and original Error remain intact if classification fails.
        try {
          const coherentFrames=new Map([
            ['scripts/prepare-cached-coherent-current-work.mjs','1bdab356610e089958d1408f7d68acc1518005f27c1012116c05dd1c857cab9b'],
            ['scripts/lib/prove-cached-coherent-current-originals.mjs','eea3a889a2ae3140a406735b5e7fe4a174c62b7ee72ab425834c1baf2588e26f'],
            ['scripts/lib/reproject-coherent-current-originals.mjs','616d5fae83eefe561b52b0b5ecb8e0b0691beda356f8819d7bfab283cc77cb65'],
          ]);
          if(result.code==='RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'
            &&result.phase==='COMMITTED_RAW_RETENTION'&&prototype===Error.prototype
            &&coherentFrames.get(relative)===result.frame.sha256){
            const {coherentCurrentWorkFailureCode}=await import('./prepare-cached-coherent-current-work.mjs');
            const code=coherentCurrentWorkFailureCode(error);
            if(code!=='COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED')result.code=code;
          }
        }catch{} // An unknown classifier never hides/replaces the actual first frame.
        break;
      }catch{} // Unknown frame stays unknown; diagnostic I/O cannot replace the failure.
    }
  }catch{}
  return result;
}
export async function reportRavScoreCurrentHistoryFailure(error){
  try{console.error(JSON.stringify(await describeRavScoreCurrentHistoryFailure(error,currentHistoryFailurePhase)));}
  catch{try{console.error('RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');}catch{}}
  process.exitCode=1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(reportRavScoreCurrentHistoryFailure);
}
