import { buildCandidateGRollbackPartScoreSeries } from './ravscore-candidate-g-rollback-runtime.mjs';
import { buildIntegratedPartScoreSeries } from './ravscore-integrated-runtime.mjs';
import {
  RAVSCORE_COLD_REPLAY_ID,
} from '../../js/core/ravscore-model-contract.js';
import {
  buildRavScoreRecoveryReplay,
  ravScoreRecoveryReplayStartAt,
  selectRavScoreInitialState,
} from './ravscore-recovery-replay.mjs';

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
  if (candidateContinuationCount !== 1) {
    throw new Error(
      'RavScore production requires exactly one protected Candidate G continuation',
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
  const resolvedNativeCadenceReferenceSample = resolveNativeCadenceReferenceSample
    ? resolveNativeCadenceReferenceSample(replayStartAt)
    : nativeCadenceReferenceSample;
  const resolvedCandidateGNativeCadenceReferenceSample =
    resolveCandidateGNativeCadenceReferenceSample
      ? resolveCandidateGNativeCadenceReferenceSample(replayStartAt)
      : candidateGNativeCadenceReferenceSample;
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
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample: resolvedNativeCadenceReferenceSample,
    coldReplayBootstrap: recovery.coldStartBootstrapApplied ? {
      recoveryId: RAVSCORE_COLD_REPLAY_ID,
      replayedHourCount: recovery.replayedHourCount,
      targetReferenceAt: recovery.scoreStartAt,
    } : null,
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
