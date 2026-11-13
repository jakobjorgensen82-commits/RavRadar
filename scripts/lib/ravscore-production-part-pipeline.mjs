import { CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA } from '../../js/core/ravscore-candidate-g.js';
import { isDeepStrictEqual } from 'node:util';
import { assertEstablishedNativeCurrentOriginForPart }
  from './established-native-current-origin.mjs';
import {
  assertCandidateGRollbackContinuation,
} from './ravscore-candidate-g-rollback-runtime.mjs';
import { calculateRavScoreProductionPartSeries, calculateRavScoreOwnerCurrentHistory,
  calculateRavScoreNewInitialCurrentApplication, completeRavScoreNewInitialCurrentApplication } from './ravscore-production-part-calculation.mjs';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
import { originalCurrentDecoderHistory } from './ravscore-recovery-source-priority.mjs';
import {
  canonicalRavScoreStateOnlyCurrentHold,
} from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildRavScoreRecoveryReplay,
  buildRavScorePermittedCurrentHistory,
  RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
  ravScoreRecoveryReplayStartAt,
  selectRavScoreInitialState,
} from './ravscore-recovery-replay.mjs';
import { assertIntegratedCoastalPointContinuation, assertArchivedOwnerCurrentIntegratedOriginal,
  assertCurrentGridSamplingFamilyOriginal }
  from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import { assertDmiPartHourlyGridSamplingApplicable, dmiExpectedIdentityForPart }
  from './ravscore-production-adapters.mjs';

// This changes ONLY the consumer's current substate. Original model/state
// schemas, geometry/context binding, wave, last-mile and lineage stay intact.
// Rebuild on every affected continuation; a saved marker is never substituted
// for authentic permitted input. Original pair is returned PRIVATE for the
// real caller to retain in its encrypted conditions transaction.
function transitionOwnerCurrentHistory({ part, initialSelection,
  previousCandidateGContinuation, recoverySources, requireNativeGridSampling, liveCurrentPilot }) {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  if (dmiMarineCollectionAllowedForZone('dkss_lf', parentZoneId)
    || initialSelection.state === null) return null;
  const originalIntegratedState = initialSelection.state;
  const originalCandidateGState = previousCandidateGContinuation;
  if (!originalCandidateGState || originalCandidateGState.time !== originalIntegratedState.time) {
    throw new Error('Current source transition requires the exact two-model continuation pair');
  }
  assertIntegratedCoastalPointContinuation(originalIntegratedState, {
    samplingContextKey: ravScoreSamplingContextKey(part),
  });
  assertCandidateGRollbackContinuation(originalCandidateGState, part);
  const hourly = buildRavScorePermittedCurrentHistory({ part,
    referenceAt: originalIntegratedState.time, sourceRecords: recoverySources,
    requireNativeGridSampling, liveCurrentPilot });
  const { integratedState, candidateGState, provedCurrentHours, unknownCurrentHours } =
    calculateRavScoreOwnerCurrentHistory({
      part, originalIntegratedState, originalCandidateGState, hourly,
    });
  assertIntegratedCoastalPointContinuation(integratedState, {
    samplingContextKey: ravScoreSamplingContextKey(part),
  });
  assertCandidateGRollbackContinuation(candidateGState, part);
  return { integratedState, candidateGState,
    privateRecord: { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
      parentZoneId, partId: part.partId, excludedCollection: 'dkss_lf',
      referenceAt: originalIntegratedState.time,
      provedCurrentHours,
      unknownCurrentHours,
      originalIntegratedState: structuredClone(originalIntegratedState),
      originalCandidateGState: structuredClone(originalCandidateGState),
    } };
}

export { ravScoreOwnerCurrentHistoryStartAt } from './ravscore-production-part-calculation.mjs';

function assertDecoderTransitionOriginal(record, part) {
  const keys = ['schemaVersion', 'kind', 'parentZoneId', 'partId', 'coordinateInterpretation',
    'referenceAt', 'originalIntegratedState', 'originalCandidateGState'];
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  if (!record || Object.keys(record).length !== keys.length
    || keys.some(key => !Object.hasOwn(record, key))
    || record.schemaVersion !== 1 || record.kind !== 'PRIVATE_CURRENT_DECODER_TRANSITION'
    || record.parentZoneId !== parentZoneId || record.partId !== part?.partId
    || !dmiMarineCollectionAllowedForZone('dkss_lf', parentZoneId)
    || record.coordinateInterpretation !== 'dmi-dkss-grib1-header-endpoints-v1'
    || typeof record.referenceAt !== 'string' || !Number.isFinite(Date.parse(record.referenceAt))
    || Date.parse(record.referenceAt) % 3_600_000 !== 0
    || new Date(record.referenceAt).toISOString() !== record.referenceAt) {
    throw new Error('Private decoder transition archive has an incompatible target or envelope');
  }
  assertCurrentGridSamplingFamilyOriginal(record.originalIntegratedState, {
    samplingContextKey: ravScoreSamplingContextKey(part),
  });
  assertCandidateGRollbackContinuation(record.originalCandidateGState, part);
  if (record.originalIntegratedState.time !== record.originalCandidateGState.time
    || Date.parse(record.originalIntegratedState.time) > Date.parse(record.referenceAt)) {
    throw new Error('Private decoder transition archive has an incompatible original time');
  }
}

export function retainOwnerCurrentTransitionOriginal(next, previous, part) {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  const recordKeys = ['schemaVersion', 'kind', 'parentZoneId', 'partId',
    'excludedCollection', 'referenceAt', 'provedCurrentHours', 'unknownCurrentHours',
    'originalIntegratedState', 'originalCandidateGState'];
  for (const record of [next, previous]) {
    if (record === null || record === undefined) continue;
    if (record.kind === 'PRIVATE_CURRENT_DECODER_TRANSITION') {
      assertDecoderTransitionOriginal(record, part);
      continue;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || Object.keys(record).length !== recordKeys.length
      || recordKeys.some(key => !Object.hasOwn(record, key))
      || record.schemaVersion !== 1 || record.kind !== 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION'
      || record.parentZoneId !== parentZoneId || record.partId !== part?.partId
      || record.excludedCollection !== 'dkss_lf'
      || dmiMarineCollectionAllowedForZone('dkss_lf', parentZoneId)
      || !Number.isInteger(record.provedCurrentHours) || record.provedCurrentHours < 0
      || !Number.isInteger(record.unknownCurrentHours) || record.unknownCurrentHours < 0
      || record.provedCurrentHours + record.unknownCurrentHours !== 49
      || typeof record.referenceAt !== 'string'
      || !Number.isFinite(Date.parse(record.referenceAt))
      || Date.parse(record.referenceAt) % 3_600_000 !== 0
      || new Date(record.referenceAt).toISOString() !== record.referenceAt) {
      throw new Error('Private current source transition archive has an incompatible target or envelope');
    }
    try {
      assertCurrentGridSamplingFamilyOriginal(record.originalIntegratedState, {
        samplingContextKey: ravScoreSamplingContextKey(part),
      });
      assertCandidateGRollbackContinuation(record.originalCandidateGState, part);
    } catch {
      throw new Error('Private current source transition archive has an invalid original pair');
    }
    if (record.originalIntegratedState.time !== record.originalCandidateGState.time
      || Date.parse(record.originalIntegratedState.time) > Date.parse(record.referenceAt)) {
      throw new Error('Private current source transition archive has an incompatible original time');
    }
  }
  // A cold recovery/empty transition must not delete the first preserved pair.
  // It remains control material, never a source of initialization or evidence.
  if (next === null || next === undefined) return previous == null ? null : structuredClone(previous);
  const result = structuredClone(next);
  if (previous === null || previous === undefined) return result;
  if (previous.kind !== next.kind) throw new Error('Private current transition cannot relabel an original archive');
  // The archive is never an initialization source or proof of permitted input.
  // Validate the preserved original pair structurally without pretending it
  // has the new source policy; keep its original model/context/time untouched.
  if (Date.parse(previous.originalIntegratedState.time)
      > Date.parse(next.originalIntegratedState.time)) {
    throw new Error('Private current source transition archive has an incompatible original time');
  }
  result.originalIntegratedState = structuredClone(previous.originalIntegratedState);
  result.originalCandidateGState = structuredClone(previous.originalCandidateGState);
  return result;
}

export function readOwnerCurrentTransitionArchive(archive, activeParts, {
  targetReferenceAt = null,
} = {}) {
  if (archive === null || archive === undefined) return {};
  const keys = ['schemaVersion', 'kind', 'privacyClass', 'parts'];
  if (!archive || typeof archive !== 'object' || Array.isArray(archive)
    || Object.keys(archive).length !== keys.length || keys.some(key => !Object.hasOwn(archive, key))
    || archive.schemaVersion !== 1 || archive.kind !== 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION_ARCHIVE'
    || archive.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME'
    || !archive.parts || typeof archive.parts !== 'object' || Array.isArray(archive.parts)
    || !Array.isArray(activeParts)) {
    throw new Error('Private current source transition archive has an invalid private envelope');
  }
  const targetMs = targetReferenceAt === null ? null : Date.parse(targetReferenceAt);
  if (targetReferenceAt !== null && (typeof targetReferenceAt !== 'string'
    || !Number.isFinite(targetMs) || targetMs % 3_600_000 !== 0
    || new Date(targetMs).toISOString() !== targetReferenceAt)) {
    throw new Error('Private current source transition archive has an invalid locked reference');
  }
  const byId = new Map(activeParts.map(part => [part?.partId, part]));
  const result = {};
  for (const [partId, record] of Object.entries(archive.parts)) {
    if (!byId.has(partId) || !record || record.partId !== partId) {
      throw new Error('Private current source transition archive has an incompatible active part');
    }
    result[partId] = retainOwnerCurrentTransitionOriginal(null, record, byId.get(partId));
    if (targetMs !== null && Date.parse(record.referenceAt) > targetMs) {
      throw new Error('Private current source transition archive is newer than the locked reference');
    }
  }
  return result;
}

// This is the actual shared producer boundary for BOTH model states. Public
// target rows are already selected by the caller and are not reauthenticated
// by recovery's private-history admission. Do not let that path bypass the
// separate owner source-domain rule. Original input/proofs stay untouched.
function assertSelectedCurrentSourceDomain(row, part, zone) {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId ?? zone?.id;
  const sources = [
    row?.currentProvenance?.status === 'verified' || row?.currentVerified === true
      ? row?.currentProvenance : null,
    row?.currentStateOnlyHold,
  ];
  if (sources.some(source => source
    && !dmiMarineCollectionAllowedForZone(source.collection, parentZoneId))) {
    const error = new Error('RavScore selected current source is excluded for its target zone');
    error.code = 'RAVSCORE_CURRENT_SOURCE_DOMAIN_EXCLUDED';
    throw error;
  }
}

function exactPublicStateOnlyHoldAt(publicHourly, exactAt, part) {
  const replayRows = publicHourly.filter(row => {
    const parsed = Date.parse(row?.time ?? '');
    return Number.isFinite(parsed) && parsed === Date.parse(exactAt);
  });
  if (replayRows.length > 1) {
    throw new Error('RavScore production has duplicate rows at the replay boundary');
  }
  if (!replayRows.length) return null;
  const rawMarker = replayRows[0].currentStateOnlyHold;
  const marker = canonicalRavScoreStateOnlyCurrentHold(
    rawMarker,
    exactAt,
  );
  if (rawMarker !== null && rawMarker !== undefined && marker === null) {
    throw new Error('RavScore production replay-boundary hold marker is invalid');
  }
  if (marker === null) return null;
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId ?? null;
  if (marker.partId !== part?.partId || marker.parentZoneId !== parentZoneId) {
    throw new Error('RavScore production replay-boundary hold has a different part context');
  }
  return marker;
}

function exactReplayBoundaryReference({
  marker,
  resolver,
  provided,
  replayStartAt,
  label,
}) {
  if (marker === null) {
    if (provided !== null && provided !== undefined) {
      throw new Error(`${label} cannot exist without an exact replay-boundary hold marker`);
    }
    return null;
  }
  const reference = resolver
    ? resolver(marker.sourceValidTime, {
      partId: marker.partId,
      replayStartAt,
      validTime: marker.validTime,
      sourceValidTime: marker.sourceValidTime,
      holdAgeHours: marker.holdAgeHours,
      expectedHold: marker,
    })
    : provided;
  if (reference === null || reference === undefined) return null;
  const referenceTime = typeof reference?.time === 'string'
    && Number.isFinite(Date.parse(reference.time))
    ? new Date(reference.time).toISOString()
    : null;
  if (referenceTime !== marker.sourceValidTime) {
    throw new Error(`${label} did not resolve the exact hold source time`);
  }
  return reference;
}

function exactRecoveryBoundaryHoldExpectation(sourceRecords, exactAt, part) {
  let marker = null, hasCurrent = false;
  for (const source of sourceRecords) {
    if (!Array.isArray(source?.record?.hourly)) continue;
    for (const row of source.record.hourly) {
      if (Date.parse(row?.time) !== Date.parse(exactAt)) continue;
      const candidate = exactPublicStateOnlyHoldAt([row], exactAt, part);
      hasCurrent ||= [row.currentSpeedMps, row.currentDirectionDeg, row.currentUMps, row.currentVMps]
        .some(value => typeof value === 'number' && Number.isFinite(value));
      if (!candidate) continue;
      if (marker && JSON.stringify(marker) !== JSON.stringify(candidate)) {
        throw new Error('RavScore production has conflicting historical replay-boundary holds');
      }
      marker = candidate;
    }
  }
  if (marker && hasCurrent) throw new Error('RavScore production replay boundary cannot select both current and hold');
  // Resolver expectation only. The strict replay still qualifies the selected
  // original and exact document scope before either model may consume it.
  return marker;
}

/**
 * Model-bundled producer priority. Point activation is exact-context only;
 * otherwise integrated continuation outranks protected checkpoint, which
 * outranks the one-time Candidate G migration seed.
 */

function transitionNewInitialCurrentApplication({ part, zone, initialSelection,
  previousCandidateGContinuation, recoverySources, liveCurrentPilot, nativeCadenceHoldHours }) {
  const state = initialSelection.state, other = previousCandidateGContinuation;
  const fail = () => { const error = new Error('RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY');
    error.code = 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY'; throw error; };
  if (state === null && other === null) return null;
  if (!state || !other || state.time !== other.time) fail();
  assertIntegratedCoastalPointContinuation(state, { samplingContextKey: ravScoreSamplingContextKey(part) });
  assertCandidateGRollbackContinuation(other, part);
  const history = buildRavScorePermittedCurrentHistory({ part, referenceAt: state.time,
    sourceRecords: recoverySources, requireNativeGridSampling: true, liveCurrentPilot,
    preserveNativeCadenceHolds: true });
  const calculation = calculateRavScoreNewInitialCurrentApplication({
    part, zone, state, other, history, nativeCadenceHoldHours,
  });
  if (calculation === null) return null;
  const originalHourly = originalCurrentDecoderHistory(recoverySources, calculation.hourly, part);
  const { integratedState, candidateGState } = completeRavScoreNewInitialCurrentApplication({
    part, zone, state, other, originalHourly, nativeCadenceHoldHours, calculation,
  });
  const privateRecord = { schemaVersion: 1, kind: 'PRIVATE_CURRENT_DECODER_TRANSITION',
    parentZoneId: part.zoneId ?? part.parentZoneId ?? part.sourceZoneId, partId: part.partId,
    coordinateInterpretation: 'dmi-dkss-grib1-header-endpoints-v1', referenceAt: state.time,
    originalIntegratedState: structuredClone(state), originalCandidateGState: structuredClone(other) };
  assertIntegratedCoastalPointContinuation(integratedState, { samplingContextKey: ravScoreSamplingContextKey(part) });
  assertCandidateGRollbackContinuation(candidateGState, part);
  return { integratedState, candidateGState, privateRecord };
}

export function selectRavScoreProductionInitialState(options = {}) {
  return selectRavScoreInitialState(options);
}

// The producer alone records successful strict production results. This is not
// an origin issuer: the fixed origin reader/finalizer still authenticates the
// handle and the national registry. No JSON, clone or caller receipt can enter
// this WeakMap. Only the exact H0 score pair is retained, never forecast T+117.
const establishedNativeCurrentProductionResults = new WeakMap();

function establishedProductionContext(part) {
  return {
    partId: part?.partId,
    parentZoneId: part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId,
    samplingContextKey: ravScoreSamplingContextKey(part),
    onshoreDirectionDeg: part?.onshoreDirectionDeg,
  };
}

function establishedProductionFailure() {
  const error = new Error('RAVSCORE_ESTABLISHED_NATIVE_CURRENT_RESULT_INVALID');
  error.code = 'RAVSCORE_ESTABLISHED_NATIVE_CURRENT_RESULT_INVALID';
  throw error;
}

function exactEstablishedProductionH0(result, part, targetReferenceAt) {
  const targetMs = Date.parse(targetReferenceAt);
  if (typeof targetReferenceAt !== 'string' || !Number.isFinite(targetMs)
    || targetMs % 3_600_000 !== 0
    || new Date(targetMs).toISOString() !== targetReferenceAt
    || !Array.isArray(result?.scores) || !Array.isArray(result?.candidateGRollbackScores)) {
    establishedProductionFailure();
  }
  const integratedRows = result.scores.filter(row => row?.time === targetReferenceAt);
  const candidateRows = result.candidateGRollbackScores.filter(row => row?.time === targetReferenceAt);
  if (integratedRows.length !== 1 || candidateRows.length !== 1) establishedProductionFailure();
  const integrated = integratedRows[0]?.ravScoreModel?.continuationState;
  const candidate = candidateRows[0]?.candidateG?.continuationState;
  if (!integrated || !candidate || integrated.time !== targetReferenceAt
    || candidate.time !== targetReferenceAt) establishedProductionFailure();
  assertIntegratedCoastalPointContinuation(integrated, {
    samplingContextKey: ravScoreSamplingContextKey(part),
  });
  assertCandidateGRollbackContinuation(candidate, part);
  return { integrated, candidate };
}

// Assert-only collector seam for the fixed national origin finalizer. The
// returned states are detached data, not a new origin handle or native grant.
export function assertEstablishedNativeCurrentProductionResult(result, {
  originHandle, part, targetReferenceAt, requireMeasuredColdStart = false,
} = {}) {
  const record = result && typeof result === 'object'
    ? establishedNativeCurrentProductionResults.get(result) : null;
  if (typeof requireMeasuredColdStart !== 'boolean'
    || (requireMeasuredColdStart && record?.measuredColdStart !== true)
    || !record || !originHandle || record.originHandle !== originHandle
    || record.targetReferenceAt !== targetReferenceAt
    || !isDeepStrictEqual(record.context, establishedProductionContext(part))) {
    establishedProductionFailure();
  }
  const pair = exactEstablishedProductionH0(result, part, targetReferenceAt);
  if (!isDeepStrictEqual(pair, record.pair)) establishedProductionFailure();
  return { integrated: structuredClone(pair.integrated),
    candidate: structuredClone(pair.candidate) };
}

/**
 * One atomic per-part production path. It replays only verified bridge rows,
 * exposes scores only from the target hour, evaluates the integrated model,
 * and keeps the private Candidate G rollback oracle on the exact same times.
 */
export function buildRavScoreProductionPartSeries({
  part,
  zone,
  initialSelection,
  previousCandidateGContinuation = null,
  legacyCandidateGMigrationState = null,
  candidateGRollbackMeasuredColdStart = false,
  candidateGRollbackMeasuredWarmupContinuation = false,
  targetReferenceAt,
  recoverySources = [],
  publicHourly = [],
  nativeCadenceHoldHours = 0,
  nativeCadenceReferenceSample = null,
  candidateGNativeCadenceReferenceSample = null,
  resolveNativeCadenceReferenceSample = null,
  resolveCandidateGNativeCadenceReferenceSample = null,
  requireNativeGridSampling = false,
  assertRoutedWaterLevelApplicable = null,
  liveCurrentPilot = null,
  establishedNativeCurrentOrigin = null,
} = {}) {
  if (!part || !zone || !initialSelection
    || typeof initialSelection.source !== 'string'
    || !Array.isArray(recoverySources)
    || !Array.isArray(publicHourly)) {
    throw new Error('RavScore production part pipeline input is incomplete');
  }
  const candidateContinuationCount = [
    previousCandidateGContinuation,
    legacyCandidateGMigrationState,
  ].filter(value => value !== null && value !== undefined).length;
  const measuredColdStartAttested = initialSelection.source === 'COLD_START'
    && initialSelection.candidateGSourceDisposition
      === RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION;
  if (typeof candidateGRollbackMeasuredColdStart !== 'boolean'
    || typeof candidateGRollbackMeasuredWarmupContinuation !== 'boolean'
    || candidateGRollbackMeasuredColdStart !== measuredColdStartAttested
    || (candidateGRollbackMeasuredColdStart && candidateContinuationCount !== 0)
    || (candidateGRollbackMeasuredWarmupContinuation
      && (candidateGRollbackMeasuredColdStart
        || previousCandidateGContinuation === null
        || previousCandidateGContinuation === undefined
        || legacyCandidateGMigrationState !== null
          && legacyCandidateGMigrationState !== undefined))
    || (!candidateGRollbackMeasuredColdStart && candidateContinuationCount !== 1)) {
    throw new Error(
      'RavScore production requires one exclusive Candidate G rollback initialization path',
    );
  }
  if (resolveNativeCadenceReferenceSample !== null
    && typeof resolveNativeCadenceReferenceSample !== 'function') {
    throw new Error('RavScore native-cadence reference resolver must be a function');
  }
  if (resolveCandidateGNativeCadenceReferenceSample !== null
    && typeof resolveCandidateGNativeCadenceReferenceSample !== 'function') {
    throw new Error('Candidate G native-cadence reference resolver must be a function');
  }
  for (const row of publicHourly) assertSelectedCurrentSourceDomain(row, part, zone);
  if (requireNativeGridSampling) {
    assertDmiPartHourlyGridSamplingApplicable(publicHourly,
      dmiExpectedIdentityForPart(part).entityId, part, { assertRoutedWaterLevelApplicable, liveCurrentPilot });
  }
  if (!dmiMarineCollectionAllowedForZone('dkss_lf', part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId)
    && initialSelection.source === 'CANDIDATE_G_MIGRATION') {
    const error = new Error('Current source transition cannot relabel a legacy-only model state as a two-model pair');
    error.code = 'RAVSCORE_CURRENT_SOURCE_DOMAIN_LEGACY_UNSUPPORTED';
    throw error;
  }
  if (establishedNativeCurrentOrigin !== null
    && (typeof establishedNativeCurrentOrigin !== 'object'
      || Array.isArray(establishedNativeCurrentOrigin) || requireNativeGridSampling !== true)) {
    establishedProductionFailure();
  }
  const establishedContext = establishedNativeCurrentOrigin === null
    ? null : establishedProductionContext(part);
  let establishedInitialPair = null;
  if (establishedNativeCurrentOrigin !== null
    && ['EXISTING_INTEGRATED', 'INTEGRATED_CHECKPOINT'].includes(initialSelection.source)) {
    // Exact pair/context qualification comes from the authenticated fixed B/S
    // origin reader, including clean owner-domain and corrected-grid origin.
    // A model hash, lineage label or equality of compact evidence is not proof.
    assertEstablishedNativeCurrentOriginForPart(establishedNativeCurrentOrigin, {
      part, integrated: initialSelection.state, candidate: previousCandidateGContinuation,
    });
    establishedInitialPair = { integrated: structuredClone(initialSelection.state),
      candidate: structuredClone(previousCandidateGContinuation) };
  }
  const normallyReestablished = establishedNativeCurrentOrigin !== null
    && (initialSelection.source === 'POINT_ACTIVATION'
      || (initialSelection.source === 'COLD_START' && initialSelection.state === null
        && measuredColdStartAttested));
  let currentTransition = null;
  if (establishedInitialPair === null) {
    // All unqualified/legacy, point-activation and cold paths retain their
    // complete pre-existing transitions and strict native admission below.
    currentTransition = transitionOwnerCurrentHistory({ part, initialSelection,
      previousCandidateGContinuation, recoverySources, requireNativeGridSampling, liveCurrentPilot });
    if (requireNativeGridSampling && currentTransition === null) currentTransition = transitionNewInitialCurrentApplication({
      part, zone, initialSelection, previousCandidateGContinuation,
      recoverySources, liveCurrentPilot, nativeCadenceHoldHours });
  }
  if (currentTransition) {
    initialSelection = { ...initialSelection, state: currentTransition.integratedState };
    previousCandidateGContinuation = currentTransition.candidateGState;
    candidateGRollbackMeasuredWarmupContinuation =
      candidateGRollbackMeasuredWarmupContinuation
      || currentTransition.candidateGState.transportMemoryReady !== true;
  }
  const replayStartAt = ravScoreRecoveryReplayStartAt(
    initialSelection.state,
    targetReferenceAt,
  );
  const replayStartHold = exactPublicStateOnlyHoldAt(
    publicHourly,
    replayStartAt,
    part,
  ) ?? (requireNativeGridSampling && !publicHourly.some(row => Date.parse(row?.time) === Date.parse(replayStartAt))
    ? exactRecoveryBoundaryHoldExpectation(recoverySources, replayStartAt, part) : null);
  const resolvedNativeCadenceReferenceSample = exactReplayBoundaryReference({
    marker: replayStartHold,
    resolver: resolveNativeCadenceReferenceSample,
    provided: nativeCadenceReferenceSample,
    replayStartAt,
    label: 'RavScore native-cadence reference',
  });
  assertSelectedCurrentSourceDomain(resolvedNativeCadenceReferenceSample, part, zone);
  const recovery = buildRavScoreRecoveryReplay({
    part,
    initialState: initialSelection.state,
    targetReferenceAt,
    sourceRecords: recoverySources,
    publicHourly,
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample: resolvedNativeCadenceReferenceSample,
    requireNativeGridSampling,
    liveCurrentPilot,
  });
  for (const row of recovery.hourly) assertSelectedCurrentSourceDomain(row, part, zone);
  const targetHold = exactPublicStateOnlyHoldAt(
    publicHourly,
    recovery.scoreStartAt,
    part,
  );
  const resolvedScoreTargetNativeCadenceReferenceSample = targetHold?.validTime
    === replayStartHold?.validTime
    ? null
    : exactReplayBoundaryReference({
      marker: targetHold,
      resolver: resolveNativeCadenceReferenceSample,
      provided: null,
      replayStartAt,
      label: 'RavScore score-target native-cadence reference',
    });
  assertSelectedCurrentSourceDomain(resolvedScoreTargetNativeCadenceReferenceSample, part, zone);
  const resolvedCandidateGNativeCadenceReferenceSample =
    exactReplayBoundaryReference({
      marker: replayStartHold,
      resolver: resolveCandidateGNativeCadenceReferenceSample,
      provided: candidateGNativeCadenceReferenceSample,
      replayStartAt,
      label: 'Candidate G native-cadence reference',
    });
  assertSelectedCurrentSourceDomain(resolvedCandidateGNativeCadenceReferenceSample, part, zone);
  const resolvedCandidateGScoreTargetNativeCadenceReferenceSample = targetHold?.validTime
    === replayStartHold?.validTime
    ? null
    : exactReplayBoundaryReference({
      marker: targetHold,
      resolver: resolveCandidateGNativeCadenceReferenceSample,
      provided: null,
      replayStartAt,
      label: 'Candidate G score-target native-cadence reference',
    });
  assertSelectedCurrentSourceDomain(resolvedCandidateGScoreTargetNativeCadenceReferenceSample, part, zone);
  const { ravScoreState, scores, candidateGState, candidateGRollbackScores } =
    calculateRavScoreProductionPartSeries({
      integrated: {
        part,
        zone,
        hourly: recovery.hourly,
        initialState: initialSelection.state,
        candidateGCurrentBootstrap: recovery.candidateGCurrentBootstrap,
        candidateGWaveApproachBootstrap: recovery.candidateGWaveApproachBootstrap,
        nativeCadenceHoldHours,
        nativeCadenceReferenceSample: resolvedNativeCadenceReferenceSample,
        scoreTargetNativeCadenceReferenceSample:
          resolvedScoreTargetNativeCadenceReferenceSample,
        coldReplayBootstrap: recovery.coldStartHistoryLineage,
        scoreStartAt: recovery.scoreStartAt,
      },
      candidate: {
        part,
        zone,
        hourly: recovery.hourly,
        previousCandidateGContinuation,
        legacyCandidateGMigrationState,
        measuredColdStart: candidateGRollbackMeasuredColdStart,
        measuredWarmupContinuation: candidateGRollbackMeasuredWarmupContinuation,
        nativeCadenceHoldHours,
        nativeCadenceReferenceSample: resolvedCandidateGNativeCadenceReferenceSample,
        scoreTargetNativeCadenceReferenceSample:
          resolvedCandidateGScoreTargetNativeCadenceReferenceSample,
        scoreStartAt: recovery.scoreStartAt,
      },
    }, { outflowZeroExplanationDa: CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA });
  const result = {
    recovery,
    ravScoreState,
    scores,
    candidateGState,
    candidateGRollbackScores,
    currentSourceDomainTransition: currentTransition?.privateRecord ?? null,
  };
  if (establishedInitialPair !== null || normallyReestablished) {
    if (!isDeepStrictEqual(establishedContext, establishedProductionContext(part))
      || (establishedInitialPair !== null
        && !isDeepStrictEqual(establishedInitialPair, {
          integrated: initialSelection.state, candidate: previousCandidateGContinuation,
        }))) establishedProductionFailure();
    // Point/cold results are branded only AFTER the entire unchanged strict
    // route succeeds. Their global origin/registry authority remains the
    // fixed finalizer's responsibility; they never bypass either OLD rebuild.
    establishedNativeCurrentProductionResults.set(result, {
      originHandle: establishedNativeCurrentOrigin,
      measuredColdStart: measuredColdStartAttested && initialSelection.state === null
        && candidateContinuationCount === 0 && initialSelection.source === 'COLD_START',
      context: structuredClone(establishedContext),
      targetReferenceAt,
      pair: structuredClone(exactEstablishedProductionH0(result, part, targetReferenceAt)),
    });
  }
  return result;
}
