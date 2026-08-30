import assert from 'node:assert/strict';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_RECOVERY_POLICY,
} from '../js/core/ravscore-model-contract.js';

const HOUR_MS = 3_600_000;
const targetMs = Date.parse('2026-08-29T12:00:00.000Z');
const time = offset => new Date(targetMs + offset * HOUR_MS).toISOString();
const samplingContextKey = `sha256:${'b'.repeat(64)}`;
const candidateGStateKey = 'sha256:candidate-g-last-mile-migration-test';
const evidence = Array.from({ length: 49 }, (_, index) => ({
  time: time(index - 48),
  strength: 0.5,
}));
const legacy = buildBoundedCurrentTransportMemory(evidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: time(0),
  restartAfterVerifiedTimeGap: true,
});
const legacyState = {
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: candidateGStateKey,
  time: time(0),
  transportReferenceAt: time(0),
  transportPotential: legacy.result.transportPotential,
  outboundEpisodeEffectiveHours: legacy.result.outboundEpisodeEffectiveHours,
  transportMemoryReady: true,
  transportMemoryStatus: 'READY',
  transportMemoryWindowHours: 48,
  transportMemoryCoverageHours: 48,
  transportEvidence: legacy.evidence,
  mobilisationPotential: 64,
};
const currentBootstrap = {
  migrationId: RAVSCORE_MIGRATION_ID,
  source: RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
  samplingContextKey,
  sourceStateTime: time(0),
  currentReferenceAt: time(0),
  currentEvidence: legacy.evidence,
  currentNativeHoldAuthorization: null,
};
const waveRows = Array.from({
  length: RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
}, (_, index) => ({
  time: time(
    index - RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
  ),
  waveHeightM: 4,
  wavePeriodS: 10,
  waveDirectionDeg: 270,
}));
const waveBootstrap = {
  migrationId: RAVSCORE_MIGRATION_ID,
  source: 'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY',
  samplingContextKey,
  sourceStateTime: time(0),
  targetReferenceAt: time(0),
  rows: waveRows,
};
const targetSample = {
  time: time(0),
  currentCoastNormalSpeedMps: 0.09,
  currentVerified: true,
  waveHeightM: 4,
  wavePeriodS: 10,
  waveDirectionDeg: 270,
};

const migrated = buildIntegratedRavScoreStateSeries([targetSample], {
  samplingContextKey,
  onshoreDirectionDeg: 90,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap: currentBootstrap,
  candidateGWaveApproachBootstrap: waveBootstrap,
});
assert.equal(migrated.migrationApplied, true);
assert.equal(migrated.rows[0].lastMileMemoryReady, true);
assert.equal(migrated.rows[0].lastMileFactor, 1);
assert.equal(JSON.stringify(migrated.continuationState).includes('waveDirectionDeg'), false);

assert.throws(() => buildIntegratedRavScoreStateSeries([targetSample], {
  samplingContextKey,
  onshoreDirectionDeg: 90,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap: currentBootstrap,
  candidateGWaveApproachBootstrap: { ...waveBootstrap, rows: waveRows.slice(1) },
}), /bounded wave-approach migration bootstrap is incompatible|canonical bounded bridge/);

assert.throws(() => buildIntegratedRavScoreStateSeries([targetSample], {
  samplingContextKey,
  onshoreDirectionDeg: 90,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap: currentBootstrap,
  candidateGWaveApproachBootstrap: {
    ...waveBootstrap,
    rows: waveRows.map((row, index) => index === 20
      ? { ...row, waveDirectionDeg: null }
      : row),
  },
}), /canonical bounded bridge|did not build a READY state/,
'active missing direction in private migration history must fail closed');

assert.throws(() => buildIntegratedRavScoreStateSeries([targetSample], {
  samplingContextKey,
  onshoreDirectionDeg: 90,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap: currentBootstrap,
  candidateGWaveApproachBootstrap: {
    ...waveBootstrap,
    rows: waveRows.map((row, index) => index === 20
      ? { ...row, wavePeriodS: 0, waveDirectionDeg: null }
      : row),
  },
}), /canonical bounded bridge/,
'positive height with zero period must not enter migration as directionless calm');

assert.throws(() => buildIntegratedRavScoreStateSeries([targetSample], {
  samplingContextKey,
  onshoreDirectionDeg: 90,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap: {
    ...currentBootstrap,
    currentEvidence: currentBootstrap.currentEvidence.map((row, index) =>
      index === 20 ? { ...row, strength: 0.4 } : row),
  },
  candidateGWaveApproachBootstrap: waveBootstrap,
}), /signed-evidence migration bootstrap is not canonical/,
'Candidate G migration must reweight the exact sealed evidence, not a raw-current substitute');

assert.equal(
  migrated.continuationState.lineage.waveApproachMaximumOmittedMomentShare,
  1 / 1024,
);
assert.equal(
  migrated.continuationState.lineage.waveApproachMaximumScoreErrorBeforeRounding,
  0.01171875,
);

console.log('RavScore Candidate G bounded wave-direction migration scenarios passed.');
