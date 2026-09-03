import {
  buildCandidateGRollbackPartScoreSeries,
} from './ravscore-candidate-g-rollback-runtime.mjs';
import { buildIntegratedPartScoreSeries } from './ravscore-integrated-runtime.mjs';
import {
  canonicalRavScoreStateOnlyCurrentHold,
} from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  buildRavScoreRecoveryReplay,
  RAVSCORE_MEASURED_COLD_ROLLBACK_DISPOSITION,
  ravScoreRecoveryReplayStartAt,
  selectRavScoreInitialState,
} from './ravscore-recovery-replay.mjs';

function exactReplayStartStateOnlyHold(publicHourly, replayStartAt, part) {
  const replayRows = publicHourly.filter(row => {
    const parsed = Date.parse(row?.time ?? '');
    return Number.isFinite(parsed) && parsed === Date.parse(replayStartAt);
  });
  if (replayRows.length > 1) {
    throw new Error('RavScore production has duplicate rows at the replay boundary');
  }
  if (!replayRows.length) return null;
  const rawMarker = replayRows[0].currentStateOnlyHold;
  const marker = canonicalRavScoreStateOnlyCurrentHold(
    rawMarker,
    replayStartAt,
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
    || candidateGRollbackMeasuredColdStart !== measuredColdStartAttested
    || (candidateGRollbackMeasuredColdStart && candidateContinuationCount !== 0)
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
  const replayStartAt = ravScoreRecoveryReplayStartAt(
    initialSelection.state,
    targetReferenceAt,
  );
  const replayStartHold = exactReplayStartStateOnlyHold(
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
  const recovery = buildRavScoreRecoveryReplay({
    part,
    initialState: initialSelection.state,
    targetReferenceAt,
    sourceRecords: recoverySources,
    publicHourly,
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample: resolvedNativeCadenceReferenceSample,
  });
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
    coldReplayBootstrap: recovery.coldStartHistoryLineage,
    scoreStartAt: recovery.scoreStartAt,
  });
  const resolvedCandidateGNativeCadenceReferenceSample =
    exactReplayBoundaryReference({
      marker: replayStartHold,
      resolver: resolveCandidateGNativeCadenceReferenceSample,
      provided: candidateGNativeCadenceReferenceSample,
      replayStartAt,
      label: 'Candidate G native-cadence reference',
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
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample: resolvedCandidateGNativeCadenceReferenceSample,
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
  };
}
