import {
  buildCandidateGRollbackPartScoreSeries,
  assertCandidateGRollbackContinuation,
} from './ravscore-candidate-g-rollback-runtime.mjs';
import { buildIntegratedPartScoreSeries } from './ravscore-integrated-runtime.mjs';
import { dmiMarineCollectionAllowedForZone } from './dmi-marine-zone-exclusions.mjs';
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
import { assertIntegratedCoastalPointContinuation, assertArchivedOwnerCurrentIntegratedOriginal }
  from './coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';
import { buildCurrentSupplyMemory, buildCurrentSupplyScoreBounds,
  deriveCurrentSupplyEvidence } from '../../js/core/ravscore-current-supply-memory.js';
import { buildBoundedCurrentTransportMemory, deriveCurrentTransportEvidence,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE }
  from '../../js/core/ravscore-regime-memory.js';

// This changes ONLY the consumer's current substate. Original model/state
// schemas, geometry/context binding, wave, last-mile and lineage stay intact.
// Rebuild on every affected continuation; a saved marker is never substituted
// for authentic permitted input. Original pair is returned PRIVATE for the
// real caller to retain in its encrypted conditions transaction.
function transitionOwnerCurrentHistory({ part, initialSelection,
  previousCandidateGContinuation, recoverySources }) {
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
    referenceAt: originalIntegratedState.time, sourceRecords: recoverySources });
  const supplyEvidence = hourly.map(row => deriveCurrentSupplyEvidence(row, {
    getNormalSpeed: value => value.currentCoastNormalSpeedMps,
    isVerified: value => value.currentProvenance?.status === 'verified',
  }));
  const transportEvidence = hourly.map(row => deriveCurrentTransportEvidence(row, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    getSpeed: value => value.currentSpeedMps,
    getAlignment: value => Number.isFinite(value.currentDirectionDeg)
      ? Math.cos((value.currentDirectionDeg - part.onshoreDirectionDeg) * Math.PI / 180) : null,
    isVerified: value => value.currentProvenance?.status === 'verified',
  }));
  const memory = buildCurrentSupplyMemory(supplyEvidence, {
    referenceTime: originalIntegratedState.time,
  });
  const bounds = buildCurrentSupplyScoreBounds(supplyEvidence, {
    referenceTime: originalIntegratedState.time,
  });
  const transport = buildBoundedCurrentTransportMemory(transportEvidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime: originalCandidateGState.time,
    restartAfterVerifiedTimeGap: false,
  });
  const integratedState = { ...structuredClone(originalIntegratedState),
    currentReferenceAt: originalIntegratedState.time,
    currentMemoryReady: memory.memoryReady, currentMemoryStatus: memory.status,
    currentMemoryWindowHours: memory.windowHours,
    currentMemoryCoverageHours: memory.coverageHours,
    currentEvidence: memory.evidence, currentNativeHoldAuthorization: null,
    currentNativeHoldIntervalEnds: memory.nativeHoldIntervalEnds,
    supplyPotential: memory.supplyPotential,
    historyBounds: { ...structuredClone(originalIntegratedState.historyBounds), current: {
      lowerPotential: bounds.available ? bounds.lowerPotential : null,
      upperPotential: bounds.available ? bounds.upperPotential : null,
    } },
  };
  const candidateGState = { ...structuredClone(originalCandidateGState),
    transportReferenceAt: originalCandidateGState.time,
    transportMemoryReady: transport.memoryReady, transportMemoryStatus: transport.status,
    transportMemoryWindowHours: transport.windowHours,
    transportMemoryCoverageHours: transport.coverageHours,
    transportEvidence: transport.evidence,
    // Existing normal unverified-pause contract retains a private finite
    // point if no permitted suffix exists. It is NOT a safe/public estimate:
    // measured warmup availability below remains hard unavailable until ready.
    transportPotential: transport.result?.transportPotential ?? originalCandidateGState.transportPotential,
    outboundEpisodeEffectiveHours: transport.result?.outboundEpisodeEffectiveHours
      ?? originalCandidateGState.outboundEpisodeEffectiveHours,
  };
  const integratedCurrentFields = new Set(['currentReferenceAt', 'currentMemoryReady',
    'currentMemoryStatus', 'currentMemoryWindowHours', 'currentMemoryCoverageHours',
    'currentEvidence', 'currentNativeHoldAuthorization', 'currentNativeHoldIntervalEnds',
    'supplyPotential', 'historyBounds']);
  const candidateCurrentFields = new Set(['transportReferenceAt', 'transportMemoryReady',
    'transportMemoryStatus', 'transportMemoryWindowHours', 'transportMemoryCoverageHours',
    'transportEvidence', 'transportPotential', 'outboundEpisodeEffectiveHours']);
  for (const [before, after, allowed] of [[originalIntegratedState, integratedState, integratedCurrentFields],
    [originalCandidateGState, candidateGState, candidateCurrentFields]]) {
    if (Object.keys(before).some(key => !allowed.has(key)
      && JSON.stringify(before[key]) !== JSON.stringify(after[key]))) {
      throw new Error('Current source transition changed non-current state history');
    }
  }
  if (['waveMobilisation', 'lastMile'].some(key =>
    JSON.stringify(originalIntegratedState.historyBounds[key])
      !== JSON.stringify(integratedState.historyBounds[key]))) {
    throw new Error('Current source transition changed non-current history bounds');
  }
  assertIntegratedCoastalPointContinuation(integratedState, {
    samplingContextKey: ravScoreSamplingContextKey(part),
  });
  assertCandidateGRollbackContinuation(candidateGState, part);
  return { integratedState, candidateGState,
    privateRecord: { schemaVersion: 1, kind: 'PRIVATE_OWNER_CURRENT_SOURCE_TRANSITION',
      parentZoneId, partId: part.partId, excludedCollection: 'dkss_lf',
      referenceAt: originalIntegratedState.time,
      provedCurrentHours: supplyEvidence.filter(row => Number.isFinite(row.strength)).length,
      unknownCurrentHours: supplyEvidence.filter(row => row.strength === null).length,
      originalIntegratedState: structuredClone(originalIntegratedState),
      originalCandidateGState: structuredClone(originalCandidateGState),
    } };
}

export function ravScoreOwnerCurrentHistoryStartAt(part, initialState, replaySourceStartAt) {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  if (dmiMarineCollectionAllowedForZone('dkss_lf', parentZoneId) || !initialState) {
    return replaySourceStartAt;
  }
  const stateMs = Date.parse(initialState.time);
  const startMs = Date.parse(replaySourceStartAt);
  if (!Number.isFinite(stateMs) || !Number.isFinite(startMs)) {
    throw new Error('Current source transition requires a valid private history boundary');
  }
  return new Date(Math.min(startMs, stateMs - 48 * 3_600_000)).toISOString();
}

export function retainOwnerCurrentTransitionOriginal(next, previous, part) {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  const recordKeys = ['schemaVersion', 'kind', 'parentZoneId', 'partId',
    'excludedCollection', 'referenceAt', 'provedCurrentHours', 'unknownCurrentHours',
    'originalIntegratedState', 'originalCandidateGState'];
  for (const record of [next, previous]) {
    if (record === null || record === undefined) continue;
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
      assertArchivedOwnerCurrentIntegratedOriginal(record.originalIntegratedState, {
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

/**
 * Model-bundled producer priority. Point activation is exact-context only;
 * otherwise integrated continuation outranks protected checkpoint, which
 * outranks the one-time Candidate G migration seed.
 */
export function selectRavScoreProductionInitialState(options = {}) {
  return selectRavScoreInitialState(options);
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
  if (!dmiMarineCollectionAllowedForZone('dkss_lf', part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId)
    && initialSelection.source === 'CANDIDATE_G_MIGRATION') {
    const error = new Error('Current source transition cannot relabel a legacy-only model state as a two-model pair');
    error.code = 'RAVSCORE_CURRENT_SOURCE_DOMAIN_LEGACY_UNSUPPORTED';
    throw error;
  }
  const currentTransition = transitionOwnerCurrentHistory({ part, initialSelection,
    previousCandidateGContinuation, recoverySources });
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
  );
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
  const {
    ravScoreState,
    scores,
  } = buildIntegratedPartScoreSeries({
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
  });
  const {
    candidateGState,
    scores: candidateGRollbackScores,
  } = buildCandidateGRollbackPartScoreSeries({
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
  });
  if (scores.length !== candidateGRollbackScores.length
    || scores.some((score, index) => score.time !== candidateGRollbackScores[index]?.time)) {
    throw new Error('Integrated and Candidate G rollback forecast times diverged');
  }
  return {
    recovery,
    ravScoreState,
    scores,
    candidateGState,
    candidateGRollbackScores,
    currentSourceDomainTransition: currentTransition?.privateRecord ?? null,
  };
}
