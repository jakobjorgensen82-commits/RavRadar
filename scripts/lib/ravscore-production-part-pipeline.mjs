import {
  buildCandidateGRollbackPartScoreSeries,
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
} from './ravscore-candidate-g-rollback-runtime.mjs';
import { buildIntegratedPartScoreSeries } from './ravscore-integrated-runtime.mjs';
import { reconstructCandidateGRollbackState } from '../../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_COLD_REPLAY_ID,
} from '../../js/core/ravscore-model-contract.js';
import {
  RAVSCORE_COLD_START_REPLAY_HOURS,
  buildRavScoreRecoveryReplay,
  ravScoreRecoveryReplayStartAt,
  selectRavScoreInitialState,
} from './ravscore-recovery-replay.mjs';
import { candidateGStateKey } from './coastal-point-staging-contract.mjs';

function coldStartRollbackError() {
  const error = new Error(
    'RavScore genuine cold start could not reconstruct its private Candidate G rollback state',
  );
  error.code = 'RAVSCORE_COLD_START_ROLLBACK_BOOTSTRAP_INVALID';
  return error;
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
  const genuineColdStart = initialSelection.source === 'COLD_START'
    && initialSelection.state === null;
  if (candidateContinuationCount > 1
    || (candidateContinuationCount === 0 && !genuineColdStart)
    || (candidateContinuationCount === 1 && genuineColdStart)) {
    throw new Error(
      'RavScore production Candidate G continuation does not match its selected initial-state source',
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
    coldReplayBootstrap: recovery.coldStartBootstrapApplied ? {
      recoveryId: RAVSCORE_COLD_REPLAY_ID,
      replayedHourCount: recovery.replayedHourCount,
      targetReferenceAt: recovery.scoreStartAt,
    } : null,
    scoreStartAt: recovery.scoreStartAt,
  });
  let rollbackPrevious = previousCandidateGContinuation;
  let rollbackLegacy = legacyCandidateGMigrationState;
  let rollbackHourly = recovery.hourly;
  if (genuineColdStart) {
    if (recovery.coldStartBootstrapApplied !== true
      || recovery.replayedHourCount !== RAVSCORE_COLD_START_REPLAY_HOURS) {
      throw coldStartRollbackError();
    }
    // Candidate G's 48-hour transport window becomes READY only after the
    // target-hour sample closes the exact target-48h..target interval. Build
    // the rollback seed from that causally complete integrated state, then
    // replay the same target row. Candidate G treats its already-signed
    // evidence as SAME_TIME_HOLD, so neither current nor mobilisation history
    // is invented or applied twice.
    const rollbackBootstrapState = ravScoreState.rows
      .find(row => row.time === recovery.scoreStartAt)?.continuationState ?? null;
    try {
      const reconstructed = reconstructCandidateGRollbackState(
        rollbackBootstrapState,
        { candidateGStateKey: candidateGStateKey(part) },
      );
      const { rollbackId: _verifiedRollbackId, ...candidateSeed } = reconstructed;
      if (_verifiedRollbackId !== CANDIDATE_G_OPERATIONAL_ROLLBACK_ID) {
        throw coldStartRollbackError();
      }
      rollbackPrevious = candidateSeed;
      rollbackLegacy = null;
      rollbackHourly = recovery.hourly.filter(
        row => Date.parse(row.time) >= Date.parse(recovery.scoreStartAt),
      );
    } catch {
      throw coldStartRollbackError();
    }
  }
  const resolvedCandidateGNativeCadenceReferenceSample =
    resolveCandidateGNativeCadenceReferenceSample
      ? resolveCandidateGNativeCadenceReferenceSample(
        genuineColdStart ? recovery.scoreStartAt : replayStartAt,
      )
      : candidateGNativeCadenceReferenceSample;
  const {
    candidateGState,
    scores: candidateGRollbackScores,
  } = buildCandidateGRollbackPartScoreSeries({
    part,
    zone,
    hourly: rollbackHourly,
    previousCandidateGContinuation: rollbackPrevious,
    legacyCandidateGMigrationState: rollbackLegacy,
    nativeCadenceHoldHours,
    nativeCadenceReferenceSample: resolvedCandidateGNativeCadenceReferenceSample,
    scoreStartAt: recovery.scoreStartAt,
  });
  if (genuineColdStart) {
    candidateGState.initialStateSource = 'VERIFIED_PRIVATE_48H_COLD_REPLAY';
  }
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
