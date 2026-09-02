import assert from 'node:assert/strict';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
  buildCandidateGDerivedStateSeries,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
} from '../js/core/ravscore-regime-memory.js';
import {
  buildCurrentSupplyMemory,
  currentSupplyStrength,
} from '../js/core/ravscore-current-supply-memory.js';
import {
  buildIntegratedRavScoreStateSeries as buildIntegratedRavScoreStateSeriesRaw,
  reconstructCandidateGRollbackState,
} from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  ravScoreModelBinding,
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_ROLLBACK_ID,
  RAVSCORE_PREVIOUS_STATE_SCHEMA_VERSION,
  RAVSCORE_STATE_V5_MIGRATION_ID,
  RAVSCORE_STATE_V5_MODEL_BUNDLE_SHA256,
  RAVSCORE_STATE_V5_MODEL_CONTRACT_SHA256,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-model-contract.js';
import {
  assertIntegratedCoastalPointContinuation,
} from './lib/coastal-point-staging-contract.mjs';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';

const HOUR_MS = 3_600_000;
const close = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};
const IMMUTABLE_ONSHORE_DIRECTION_DEG = 90;
const buildIntegratedRavScoreStateSeries = (samples = [], options = {}) =>
  buildIntegratedRavScoreStateSeriesRaw(samples, {
    onshoreDirectionDeg: IMMUTABLE_ONSHORE_DIRECTION_DEG,
    ...options,
  });
const referenceMs = Date.parse('2026-08-29T12:00:00.000Z');
const time = offsetHours => new Date(referenceMs + offsetHours * HOUR_MS).toISOString();
const candidateGStateKey = 'sha256:legacy-candidate-g-test-context';
const samplingContextKey = ravScoreSamplingContextKey({
  partId: 'TEST-PART',
  waterPoint: [8, 55],
  onshoreDirectionDeg: 90,
});

const evidence = Array.from({ length: 49 }, (_, index) => ({
  time: time(index - 48),
  strength: index >= 38 ? 0.5 : 0,
}));
const oracle = buildBoundedCurrentTransportMemory(evidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: time(0),
  restartAfterVerifiedTimeGap: true,
});
assert.equal(oracle.memoryReady, true);
const legacyState = {
  schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
  modelId: CANDIDATE_G_STATE_MODEL_ID,
  variantId: CANDIDATE_G_STATE_VARIANT_ID,
  profileId: CANDIDATE_G_STATE_PROFILE_ID,
  stateKey: candidateGStateKey,
  time: time(0),
  transportReferenceAt: time(0),
  transportPotential: oracle.result.transportPotential,
  outboundEpisodeEffectiveHours: oracle.result.outboundEpisodeEffectiveHours,
  transportMemoryReady: oracle.memoryReady,
  transportMemoryStatus: oracle.status,
  transportMemoryWindowHours: oracle.windowHours,
  transportMemoryCoverageHours: oracle.coverageHours,
  transportEvidence: oracle.evidence,
  mobilisationPotential: 64,
};
const currentSample = {
  time: time(0),
  currentSpeedMps: 0.09,
  currentAlignment: 1,
  currentVerified: true,
  waveHeightM: 1,
  wavePeriodS: 6,
  waveDirectionDeg: 270,
};
for (const malformedTime of ['2026-02-30T12:00:00Z', '2026-08-29T24:00:00Z']) {
  assert.throws(() => buildIntegratedRavScoreStateSeries([{
    ...currentSample,
    time: malformedTime,
  }], { samplingContextKey }), /invalid time/,
  `${malformedTime} must not be normalized into another integrated state hour`);
}
const privateExactCurrentEvidence =
  legacyState.transportEvidence.map(item => ({ ...item }));
const candidateGCurrentBootstrap = {
  migrationId: RAVSCORE_MIGRATION_ID,
  source: RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource,
  samplingContextKey,
  sourceStateTime: legacyState.time,
  currentReferenceAt: legacyState.transportReferenceAt,
  currentEvidence: privateExactCurrentEvidence,
  currentNativeHoldAuthorization: null,
};
const candidateGWaveApproachBootstrap = {
  migrationId: RAVSCORE_MIGRATION_ID,
  source: 'VERIFIED_PRIVATE_DMI_WAVE_DIRECTION_REPLAY',
  samplingContextKey,
  sourceStateTime: legacyState.time,
  targetReferenceAt: currentSample.time,
  rows: Array.from({
    length: RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
  }, (_, index) => ({
    time: time(
      index - RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours,
    ),
    waveHeightM: currentSample.waveHeightM,
    wavePeriodS: currentSample.wavePeriodS,
    waveDirectionDeg: currentSample.waveDirectionDeg,
  })),
};

const coldReplaySamples = Array.from({ length: 49 }, (_, index) => ({
  ...currentSample,
  time: time(index - 48),
}));
const coldReplayProof = ({ complete = 48, targetReferenceAt = time(0) } = {}) => ({
  recoveryId: RAVSCORE_COLD_REPLAY_ID,
  expectedCausalPositionCount: 48,
  completeCausalPositionCount: complete,
  boundedUnknownPositionCount: 48 - complete,
  historyTransition: complete === 48
    ? RAVSCORE_RECOVERY_POLICY.completeHistoryTransition
    : RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition,
  targetReferenceAt,
});
const coldReplay = buildIntegratedRavScoreStateSeries(coldReplaySamples, {
  samplingContextKey,
  coldReplayBootstrap: coldReplayProof(),
});
assert.throws(() => ravScoreSamplingContextKey({
  partId: 'TEST-PART',
  waterPoint: ['8', 55],
  onshoreDirectionDeg: 90,
}), /incomplete/,
'sampling identity must reject coercible coordinate strings');
assert.throws(() => ravScoreSamplingContextKey({
  partId: 'TEST-PART',
  waterPoint: [8, 55],
  onshoreDirectionDeg: 360,
}), /incomplete/,
'sampling identity must use one canonical [0, 360) bearing');
assert.equal(coldReplay.initialStateAccepted, false);
assert.equal(coldReplay.migrationApplied, false);
assert.equal(coldReplay.initialStateSource, 'VERIFIED_PRIVATE_48H_COLD_REPLAY');
assert.equal(coldReplay.rows.at(-1).currentMemoryReady, true);
assert.equal(coldReplay.rows.at(-1).waveMemoryReady, true);

const quantizedBoundarySamples = coldReplaySamples.map(sample => ({
  ...sample,
  currentSpeedMps: 0.03,
  currentAlignment: 1,
}));
const quantizedBoundary = buildIntegratedRavScoreStateSeries(quantizedBoundarySamples, {
  samplingContextKey,
});
assert.equal(quantizedBoundary.rows.at(-1).supplyPotential, 0,
  'the two-decimal display speed is exactly on the configured deadband');
const preciseBoundary = buildIntegratedRavScoreStateSeries(
  quantizedBoundarySamples.map(sample => ({
    ...sample,
    currentCoastNormalSpeedMps: 0.031,
  })),
  { samplingContextKey },
);
assert.ok(preciseBoundary.rows.at(-1).supplyPotential > 0,
  'the state path must use the precise verified coast-normal signal above 0.030 m/s');
for (const exactNormalSpeedMps of [0.0349, 0.035]) {
  const exactBoundary = buildIntegratedRavScoreStateSeries(
    quantizedBoundarySamples.map(sample => ({
      ...sample,
      currentCoastNormalSpeedMps: exactNormalSpeedMps,
    })),
    { samplingContextKey },
  );
  assert.equal(
    exactBoundary.continuationState.currentEvidence.at(-1).strength,
    currentSupplyStrength(exactNormalSpeedMps),
    `exact ${exactNormalSpeedMps} m/s must cross state without display quantisation`,
  );
  assert.ok(exactBoundary.rows.at(-1).supplyPotential > 0);
}
assert.throws(() => buildIntegratedRavScoreStateSeries(
  quantizedBoundarySamples.map(sample => ({
    ...sample,
    currentCoastNormalSpeedMps: '0.031',
  })),
  { samplingContextKey },
), /verified current sample lacks exact signed evidence/,
'a coercible exact-signal field must fail closed instead of falling back to display values');
assert.deepEqual(coldReplay.continuationState.lineage, {
  boundedUnknownPositionCount: 0,
  completeCausalPositionCount: 48,
  expectedCausalPositionCount: 48,
  historyTransition: RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
  recoveryId: RAVSCORE_COLD_REPLAY_ID,
  source: 'VERIFIED_PRIVATE_PROVENANCE_REPLAY',
  targetReferenceAt: time(0),
});
assert.equal(coldReplay.rows[0].continuationState.lineage, null,
  'pre-target private replay states must not contain future target lineage');
assert.equal(buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: coldReplay.continuationState,
}).initialStateAccepted, true, 'a sealed cold-replay lineage must continue exactly');
assert.equal(assertIntegratedCoastalPointContinuation(coldReplay.continuationState, {
  samplingContextKey,
  requireReady: true,
}), coldReplay.continuationState,
'a verified cold-replay continuation must pass the production checkpoint boundary');
assert.deepEqual(Object.keys(coldReplay.continuationState.historyBounds).sort(), [
  'current', 'lastMile', 'schemaVersion', 'waveMobilisation',
], 'schema-6 continuation must expose only the canonical data-minimised history-bound groups');
assert.throws(() => assertIntegratedCoastalPointContinuation({
  ...coldReplay.continuationState,
  historyBounds: {
    ...coldReplay.continuationState.historyBounds,
    current: {
      ...coldReplay.continuationState.historyBounds.current,
      unexpectedRawCurrent: 0.1,
    },
  },
}, {
  samplingContextKey,
}), /historyBounds\.current.*canonical field-allowlist/,
'schema-6 checkpoint boundary must fail closed on unknown nested history fields');
assert.throws(() => assertIntegratedCoastalPointContinuation({
  ...coldReplay.continuationState,
  lineage: {
    ...coldReplay.continuationState.lineage,
    migrationId: 'mixed-lineage-is-forbidden',
  },
}, {
  samplingContextKey,
}), /canonical field-allowlist/,
'mixed or extended cold-replay lineage must fail closed at the checkpoint boundary');
const {
  historyBounds: omittedSchema6HistoryBounds,
  currentNativeHoldIntervalEnds: omittedSchema6NativeHoldIntervals,
  ...schema5ReadyBody
} = coldReplay.continuationState;
assert.ok(omittedSchema6HistoryBounds, 'schema-6 fixture must contain history bounds');
assert.deepEqual(omittedSchema6NativeHoldIntervals, [],
  'schema-6 fixture must carry an explicit empty native-hold interval proof');
const schema5ReadyState = {
  ...schema5ReadyBody,
  schemaVersion: RAVSCORE_PREVIOUS_STATE_SCHEMA_VERSION,
  profileId:
    'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4',
  componentSchemaId: 'ravscore-components-huntability-delivery-mobilisation-v4',
  explanationSchemaId: 'ravscore-explanation-integrated-v4',
  rankingPolicyId: 'direction-broad-19-v1',
  bestTimePolicyId: 'score-water-tie-earliest-v2',
  modelContractSha256: RAVSCORE_STATE_V5_MODEL_CONTRACT_SHA256,
  modelBundleSha256: RAVSCORE_STATE_V5_MODEL_BUNDLE_SHA256,
};
const schema5Upgrade = buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: schema5ReadyState,
});
assert.equal(schema5Upgrade.initialStateAccepted, true);
assert.equal(schema5Upgrade.initialStateSource, 'INTEGRATED_SCHEMA5_READY_POINT_MIGRATION');
assert.equal(schema5Upgrade.stateV5MigrationApplied, true);
assert.equal(schema5Upgrade.stateV5MigrationId, RAVSCORE_STATE_V5_MIGRATION_ID);
assert.equal(schema5Upgrade.continuationState.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
assert.deepEqual(schema5Upgrade.continuationState.historyBounds.current, {
  lowerPotential: schema5ReadyState.supplyPotential,
  upperPotential: schema5ReadyState.supplyPotential,
});
assert.deepEqual(schema5Upgrade.continuationState.historyBounds.waveMobilisation, {
  lowerPotential: schema5ReadyState.mobilisationPotential,
  upperPotential: schema5ReadyState.mobilisationPotential,
  lastUnknownAt: null,
  conservativeResetAt: null,
});
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...schema5ReadyState,
    historyBounds: omittedSchema6HistoryBounds,
  },
}), /not eligible for deterministic migration/,
'schema-5 migration must fail closed on an extra schema-6 field');
const partialColdReplay = buildIntegratedRavScoreStateSeries(coldReplaySamples.slice(1), {
  samplingContextKey,
  coldReplayBootstrap: coldReplayProof({ complete: 47 }),
});
assert.equal(partialColdReplay.initialStateSource,
  'BOUNDED_PRIVATE_PARTIAL_HISTORY_COLD_REPLAY');
assert.equal(partialColdReplay.continuationState.lineage.historyTransition,
  'UNKNOWN_HISTORY_INTERVAL');
const nonPlainColdReplayProof = Object.assign(
  Object.create({ inherited: true }),
  coldReplayProof(),
);
assert.throws(() => buildIntegratedRavScoreStateSeries(coldReplaySamples, {
  samplingContextKey,
  coldReplayBootstrap: nonPlainColdReplayProof,
}), /bootstrap proof is invalid/,
'cold-replay proof must be one exact plain object, not a prototype-bearing lookalike');
assert.throws(() => buildIntegratedRavScoreStateSeries(coldReplaySamples, {
  samplingContextKey,
  coldReplayBootstrap: coldReplayProof({
    targetReferenceAt: time(0).replace('.000Z', 'Z'),
  }),
}), /target is invalid/,
'cold-replay target proof must use the exact canonical UTC representation');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  coldReplayBootstrap: coldReplayProof(),
}), /cannot combine continuation and cold replay/);

const migrated = buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap,
});
assert.equal(migrated.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(migrated.modelId, RAVSCORE_MODEL_ID);
assert.equal(migrated.migrationApplied, true);
assert.equal(migrated.initialStateAccepted, false);
assert.equal(migrated.rows[0].currentMemoryReady, true);
assert.equal(migrated.rows[0].waveMemoryReady, true);
assert.equal(migrated.rows[0].mobilisationPotential, 64);
assert.ok(Number.isFinite(migrated.rows[0].supplyPotential));
assert.equal(migrated.continuationState.currentEvidence.length, 49);
assert.deepEqual(migrated.continuationState.currentEvidence, privateExactCurrentEvidence,
  'migration must reweight the sealed Candidate G signed evidence through the new kernel');
assert.equal(migrated.migrationId, RAVSCORE_MIGRATION_ID);
assert.equal(migrated.rows[0].waveTransition, 'MIGRATED_FROM_CANDIDATE_G',
  'Candidate G mobilisation must seed the first verified integrated wave transition');
assert.equal(migrated.continuationState.waveMigrationSeedAt, null,
  'the consumed wave seed must not remain pending after same-time verified waves');
assert.equal(
  migrated.continuationState.rollbackCandidateGMobilisationPotential,
  legacyState.mobilisationPotential,
);
assert.equal(migrated.continuationState.samplingContextKey, samplingContextKey);
const binding = ravScoreModelBinding();
for (const [key, expected] of Object.entries(binding)) {
  const stateKey = key === 'stateSchemaVersion' ? 'schemaVersion' : key;
  assert.equal(migrated.continuationState[stateKey], expected,
    `continuation state must carry exact ${key}`);
}

assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  currentSpeedMps: -0.15,
  waveHeightM: 4,
}], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap,
}), /Same-time current evidence conflicts/,
'same-time source revisions may not score new current against migrated old evidence');

const continuedSameTime = buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: migrated.continuationState,
});
assert.deepEqual(
  continuedSameTime.continuationState,
  migrated.continuationState,
  'same-time continuation must be idempotent',
);
assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  currentSpeedMps: -0.15,
  waveHeightM: 4,
}], {
  samplingContextKey,
  initialState: migrated.continuationState,
}), /Same-time current evidence conflicts|Same-time wave evidence conflicts/,
'same-time changed inputs must fail closed instead of mixing old state with revised weather');

const continued = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(1),
  currentSpeedMps: 0,
  waveHeightM: 0.5,
}], {
  samplingContextKey,
  initialState: migrated.continuationState,
});
assert.equal(continued.initialStateAccepted, true);
assert.equal(continued.migrationApplied, false);
assert.equal(continued.rows[0].currentMemoryReady, true);
assert.equal(continued.rows[0].waveMemoryReady, true);

const uninterrupted = buildIntegratedRavScoreStateSeries([
  currentSample,
  { ...currentSample, time: time(1), currentSpeedMps: 0, waveHeightM: 0.5 },
], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap,
});
assert.deepEqual(continued.continuationState, uninterrupted.continuationState);

const missingWave = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(1),
  waveHeightM: null,
  wavePeriodS: null,
}], {
  samplingContextKey,
  initialState: migrated.continuationState,
});
assert.equal(missingWave.rows[0].waveMemoryReady, false);
assert.equal(missingWave.rows[0].waveMemoryStatus, 'MISSING_INPUT');

const currentHistoryHoleThenValid = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(1),
  currentSpeedMps: null,
  currentAlignment: null,
  currentVerified: false,
}, {
  ...currentSample,
  time: time(2),
}], {
  samplingContextKey,
  initialState: migrated.continuationState,
});
assert.equal(currentHistoryHoleThenValid.rows[0].currentDirectInputAvailable, false);
assert.equal(currentHistoryHoleThenValid.rows[0].historyScoreView.quality, 'UNAVAILABLE');
assert.equal(currentHistoryHoleThenValid.rows[1].currentDirectInputAvailable, true);
assert.equal(currentHistoryHoleThenValid.rows[1].historyScoreView.quality, 'HISTORY_INCOMPLETE');
assert.equal(currentHistoryHoleThenValid.rows[1].historyScoreView.calibrationEligible, false);
assert.ok(currentHistoryHoleThenValid.rows[1].historyScoreView.reasonCodes
  .includes('CURRENT_HISTORY_MISSING_EVIDENCE'));
assert.ok(currentHistoryHoleThenValid.rows[1].supplyPotential
  <= currentHistoryHoleThenValid.rows[1].supplyPotentialUpper);

const knownEnergyUnknownDirection = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(1),
  waveDirectionDeg: null,
}], {
  samplingContextKey,
  initialState: migrated.continuationState,
});
const unknownDirectionBounds = knownEnergyUnknownDirection.continuationState.historyBounds.lastMile;
assert.equal(knownEnergyUnknownDirection.rows[0].historyScoreView.quality, 'HISTORY_INCOMPLETE');
assert.deepEqual(knownEnergyUnknownDirection.rows[0].historyScoreView.reasonCodes, [
  'LAST_MILE_HISTORY_INCOMPLETE',
]);
assert.ok(unknownDirectionBounds.minimumFactorTrack.normalMoment
  < unknownDirectionBounds.maximumFactorTrack.normalMoment);
close(
  unknownDirectionBounds.minimumFactorTrack.activityMoment,
  unknownDirectionBounds.maximumFactorTrack.activityMoment,
);

const historyClosureSamples = [{
  ...currentSample,
  time: time(1),
  waveHeightM: null,
  wavePeriodS: null,
  waveDirectionDeg: null,
}, ...Array.from({ length: 288 }, (_, index) => ({
  ...currentSample,
  time: time(index + 2),
}))];
const historyClosure = buildIntegratedRavScoreStateSeries(historyClosureSamples, {
  samplingContextKey,
  initialState: migrated.continuationState,
});
const beforeLastMileClosure = historyClosure.rows.find(row => row.time === time(40));
const atLastMileClosure = historyClosure.rows.find(row => row.time === time(41));
assert.notEqual(beforeLastMileClosure.continuationState.historyBounds.lastMile.lastUnknownAt, null,
  'last-mile uncertainty must remain explicit before the exact 40-hour tail boundary');
assert.equal(
  atLastMileClosure.continuationState.historyBounds.lastMile.lastUnknownAt,
  time(1),
  'last-mile closure must retain the causal unknown-tail origin',
);
assert.equal(
  atLastMileClosure.continuationState.historyBounds.lastMile.conservativeResetAt,
  time(41),
  'last-mile closure must be marked as a conservative scoring-track reset',
);
assert.deepEqual(
  atLastMileClosure.continuationState.historyBounds.lastMile.maximumFactorTrack,
  atLastMileClosure.continuationState.historyBounds.lastMile.minimumFactorTrack,
  'last-mile closure must continue the already shown minimum-factor track',
);
const beforeWaveClosure = historyClosure.rows.find(row => row.time === time(288));
const atWaveClosure = historyClosure.rows.find(row => row.time === time(289));
assert.notEqual(beforeWaveClosure.continuationState.historyBounds.waveMobilisation.lastUnknownAt, null,
  'mobilisation uncertainty must remain explicit before the exact 12-day boundary');
assert.ok(0.3 * (
  beforeWaveClosure.mobilisationPotentialUpper
    - beforeWaveClosure.mobilisationPotentialLower
) <= 0.46875 + 1e-9,
'the remaining mobilisation-only raw-score width must be below half a point before truncation');
assert.equal(
  atWaveClosure.continuationState.historyBounds.waveMobilisation.lastUnknownAt,
  time(1),
  'mobilisation closure must retain the causal unknown-tail origin',
);
assert.equal(
  atWaveClosure.continuationState.historyBounds.waveMobilisation.conservativeResetAt,
  time(289),
  'wave closure must be marked as a conservative scoring-track reset',
);
assert.equal(atWaveClosure.historyScoreView.quality, 'FULL_HISTORY');
assert.equal(atWaveClosure.historyScoreView.calibrationEligible, true);
assert.deepEqual(atWaveClosure.historyScoreView.reasonCodes, []);
assert.equal(atWaveClosure.historyScoreView.conservativeTailResetApplied, true);
close(atWaveClosure.mobilisationPotentialLower, atWaveClosure.mobilisationPotentialUpper);
assert.ok(atWaveClosure.mobilisationPotentialLower <= atWaveClosure.mobilisationPotential,
  'tail closure must never replace the shown lower trajectory with a higher point state');
const afterWaveClosure = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(290),
}], {
  samplingContextKey,
  initialState: atWaveClosure.continuationState,
});
assert.equal(afterWaveClosure.initialStateAccepted, true,
  'a serialized conservative tail reset must resume as exact schema-6 continuation');
assert.equal(afterWaveClosure.rows[0].historyScoreView.quality, 'FULL_HISTORY');
assert.equal(afterWaveClosure.rows[0].historyScoreView.conservativeTailResetApplied, true);
close(
  afterWaveClosure.rows[0].mobilisationPotentialLower,
  afterWaveClosure.rows[0].mobilisationPotentialUpper,
);
assert.ok(
  afterWaveClosure.rows[0].mobilisationPotentialLower
    <= afterWaveClosure.rows[0].mobilisationPotential,
  'the conservative scoring trajectory must remain ordered after resume',
);
const resumedLastMileClosure = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(42),
}], {
  samplingContextKey,
  initialState: atLastMileClosure.continuationState,
});
assert.equal(resumedLastMileClosure.initialStateAccepted, true,
  'a serialized 40-hour last-mile reset must resume exactly');
assert.equal(
  resumedLastMileClosure.rows[0].continuationState.historyBounds.lastMile.conservativeResetAt,
  time(41),
  'resuming must not move or repeatedly reapply the last-mile reset marker',
);
const gapAfterReset = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(290),
  waveHeightM: null,
  wavePeriodS: null,
  waveDirectionDeg: null,
}], {
  samplingContextKey,
  initialState: atWaveClosure.continuationState,
});
assert.equal(gapAfterReset.rows[0].historyScoreView.quality, 'HISTORY_INCOMPLETE',
  'a new verified-history gap after reset must reopen bounded scoring');
assert.equal(
  gapAfterReset.rows[0].continuationState.historyBounds.waveMobilisation.conservativeResetAt,
  null,
  'a new wave gap must clear the superseded wave reset marker',
);
assert.equal(
  gapAfterReset.rows[0].continuationState.historyBounds.waveMobilisation.lastUnknownAt,
  time(290),
);
assert.equal(
  gapAfterReset.rows[0].continuationState.historyBounds.lastMile.conservativeResetAt,
  null,
  'a new last-mile gap must clear the superseded last-mile reset marker',
);
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...atWaveClosure.continuationState,
    historyBounds: {
      ...atWaveClosure.continuationState.historyBounds,
      waveMobilisation: {
        ...atWaveClosure.continuationState.historyBounds.waveMobilisation,
        conservativeResetAt: null,
      },
    },
  },
}), /missing its required conservativeResetAt marker/,
'removing an authentic expired-tail reset marker must fail closed');
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...schema5Upgrade.continuationState,
    historyBounds: {
      ...schema5Upgrade.continuationState.historyBounds,
      waveMobilisation: {
        ...schema5Upgrade.continuationState.historyBounds.waveMobilisation,
        lastUnknownAt: null,
        conservativeResetAt: schema5Upgrade.continuationState.time,
      },
    },
  },
}), /not bound to an expired unknown tail/,
'forging a conservative reset marker onto attested exact history must fail closed');
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...atWaveClosure.continuationState,
    historyBounds: {
      ...atWaveClosure.continuationState.historyBounds,
      waveMobilisation: {
        ...atWaveClosure.continuationState.historyBounds.waveMobilisation,
        conservativeResetAt: time(290),
      },
    },
  },
}), /conservativeResetAt.*invalid/,
'a future conservative reset marker must fail closed');

const missingCurrentAt = hour => ({
  ...currentSample,
  time: time(hour),
  currentSpeedMps: null,
  currentAlignment: null,
  currentVerified: false,
});
const dmiThenMissing = buildIntegratedRavScoreStateSeries([
  missingCurrentAt(2),
], {
  samplingContextKey,
  initialState: migrated.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(dmiThenMissing.rows[0].currentMemoryReady, false,
  'DMI/non-regional current cannot authorize a native cadence hold');
assert.equal(dmiThenMissing.rows[0].currentTransition, 'UNVERIFIED_MISSING');

const unattestedOneHourHole = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(2),
}], {
  samplingContextKey,
  initialState: migrated.continuationState,
});
const unattestedGapRow = unattestedOneHourHole.rows[0];
assert.equal(unattestedGapRow.currentMemoryReady, false);
assert.equal(unattestedGapRow.currentMemoryStatus, 'WINDOW_HAS_TIME_GAP');
assert.equal(unattestedGapRow.historyScoreView.quality, 'HISTORY_INCOMPLETE');
assert.equal(unattestedGapRow.historyScoreView.coverageHours, 47);
assert.deepEqual(
  unattestedGapRow.continuationState.currentNativeHoldIntervalEnds,
  [],
  'a sparse jump must never manufacture native cadence attestation',
);
for (let index = 0; index <= 40; index += 1) {
  const hiddenStrength = -1 + index / 20;
  const hiddenNormalSpeed = Math.abs(hiddenStrength) <= 1e-12
    ? 0
    : Math.sign(hiddenStrength) * (0.03 + 0.12 * Math.abs(hiddenStrength));
  const completion = buildIntegratedRavScoreStateSeries([{
    ...currentSample,
    time: time(1),
    currentSpeedMps: Math.abs(hiddenNormalSpeed),
    currentAlignment: Math.sign(hiddenNormalSpeed),
  }, {
    ...currentSample,
    time: time(2),
  }], {
    samplingContextKey,
    initialState: migrated.continuationState,
  }).rows.at(-1);
  assert.equal(completion.currentMemoryReady, true);
  assert.ok(
    completion.supplyPotential
      >= unattestedGapRow.historyScoreView.current.lowerPotential - 1e-9
      && completion.supplyPotential
        <= unattestedGapRow.historyScoreView.current.upperPotential + 1e-9,
    `state completion ${hiddenStrength} escaped its sparse-history current bounds`,
  );
}

const regionalAuthorization = {
  sourceClass: 'owner-approved-regional-proxy',
  source: 'dmi-dkss-lf-regional-proxy',
  collection: 'dkss_lf',
  distanceKm: 6.2,
};
const regionalHoldSha256 = `sha256:${'b'.repeat(64)}`;
const regionalStateOnlyHold = (validHour, sourceHour = 0) => ({
  contractId: 'regional-dmi-exact-state-only-hold-v1',
  status: 'verified-derived-state-only',
  classification: 'REGIONAL_DMI_DERIVED_HOLD',
  stateOnly: true,
  partId: 'TEST-PART',
  parentZoneId: 'TEST-ZONE',
  targetIdentityFingerprint: samplingContextKey,
  validTime: time(validHour),
  sourceValidTime: time(sourceHour),
  holdAgeHours: validHour - sourceHour,
  provider: 'dmi',
  sourceClass: regionalAuthorization.sourceClass,
  source: regionalAuthorization.source,
  collection: regionalAuthorization.collection,
  modelRun: time(-48),
  closureContractId: 'current-operational-673x118-closure-ready-v1',
  closureId: regionalHoldSha256,
  closureAssignmentSha256: regionalHoldSha256,
  sourceAssetSha256: regionalHoldSha256,
  sourceProofSha256: regionalHoldSha256,
  vectorCommitmentSha256: regionalHoldSha256,
});
const regionalCurrentSample = {
  ...currentSample,
  currentProvenance: { status: 'verified', ...regionalAuthorization },
};
const regionalMigrated = buildIntegratedRavScoreStateSeries([regionalCurrentSample], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap: {
    ...candidateGCurrentBootstrap,
    currentNativeHoldAuthorization: null,
  },
  candidateGWaveApproachBootstrap,
});
const nativeHold = buildIntegratedRavScoreStateSeries([{
  ...missingCurrentAt(2),
  currentStateOnlyHold: regionalStateOnlyHold(2),
}], {
  samplingContextKey,
  initialState: regionalMigrated.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(nativeHold.rows[0].currentMemoryReady, true);
assert.equal(nativeHold.rows[0].currentMemoryStatus, 'READY_NATIVE_HOLD');
assert.equal(nativeHold.rows[0].currentTransition, 'NATIVE_CADENCE_HOLD');
assert.equal(nativeHold.rows[0].supplyPotential, regionalMigrated.rows[0].supplyPotential);
assert.deepEqual(nativeHold.rows[0].currentReferenceProvenance, {
  status: 'verified',
  ...regionalAuthorization,
}, 'regional hold must retain its bounded source class and exact verified distance');

const verifiedAfterNativeHold = buildIntegratedRavScoreStateSeries([{
  ...regionalCurrentSample,
  time: time(3),
}], {
  samplingContextKey,
  initialState: nativeHold.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(verifiedAfterNativeHold.rows[0].currentMemoryReady, true);
assert.equal(verifiedAfterNativeHold.rows[0].historyScoreView.current.lowerPotential,
  verifiedAfterNativeHold.rows[0].historyScoreView.current.upperPotential);
assert.deepEqual(
  verifiedAfterNativeHold.continuationState.currentNativeHoldIntervalEnds,
  [time(3)],
  'only a provenance-matched hold through the preceding expected hour may attest a 3h interval',
);
const resumedAttestedInterval = buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: verifiedAfterNativeHold.continuationState,
});
assert.equal(resumedAttestedInterval.initialStateAccepted, true,
  'native cadence interval attestation must survive exact checkpoint continuation');

const unobservedRegionalJump = buildIntegratedRavScoreStateSeries([{
  ...regionalCurrentSample,
  time: time(3),
}], {
  samplingContextKey,
  initialState: regionalMigrated.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(unobservedRegionalJump.rows[0].currentMemoryReady, false);
assert.equal(unobservedRegionalJump.rows[0].currentMemoryStatus, 'WINDOW_HAS_TIME_GAP');
assert.deepEqual(unobservedRegionalJump.continuationState.currentNativeHoldIntervalEnds, [],
  'matching endpoint provenance alone must not attest absent hold coverage');
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...verifiedAfterNativeHold.continuationState,
    currentNativeHoldIntervalEnds: [],
  },
}), /signed current evidence/,
'removing a persisted native-hold interval proof must fail closed');

const continuedFromNativeHold = buildIntegratedRavScoreStateSeries([{
  ...missingCurrentAt(3),
  currentStateOnlyHold: regionalStateOnlyHold(3),
}], {
  samplingContextKey,
  initialState: nativeHold.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(continuedFromNativeHold.initialStateAccepted, true);
assert.equal(continuedFromNativeHold.rows[0].currentMemoryReady, true);
assert.equal(continuedFromNativeHold.rows[0].currentMemoryStatus, 'READY_NATIVE_HOLD');
assert.equal(continuedFromNativeHold.rows[0].currentReferenceAt, time(0),
  'source-bound native hold must continue only with its own exact-time marker');
const expiredNativeHold = buildIntegratedRavScoreStateSeries([missingCurrentAt(4)], {
  samplingContextKey,
  initialState: continuedFromNativeHold.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(expiredNativeHold.rows[0].currentMemoryReady, false,
  'a regional native hold must fail after its exact three-hour distance-bound horizon');

for (const provider of ['dmi', 'copernicus']) {
  const providerThenMissing = buildIntegratedRavScoreStateSeries([{
    ...currentSample,
    time: time(1),
    currentProvenance: {
      status: 'verified',
      provider,
      sourceClass: provider === 'copernicus'
        ? 'supplemental-local-current'
        : 'local-current',
    },
  }, missingCurrentAt(2)], {
    samplingContextKey,
    initialState: regionalMigrated.continuationState,
    nativeCadenceHoldHours: 3,
  });
  assert.equal(providerThenMissing.rows[0].currentMemoryReady, true);
  assert.equal(providerThenMissing.rows[1].currentMemoryReady, false,
    `${provider} must revoke a preceding regional hold authorization`);
  assert.equal(providerThenMissing.rows[1].currentTransition, 'UNVERIFIED_MISSING');
}

assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(3),
}], {
  samplingContextKey,
  initialState: {
    ...migrated.continuationState,
    lineage: {
      ...migrated.continuationState.lineage,
      currentUMps: 0.1,
    },
  },
}), /lineage/);

const nonPlainLineage = Object.assign(
  Object.create({ inherited: 'not-a-state-contract' }),
  migrated.continuationState.lineage,
);
assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(3),
}], {
  samplingContextKey,
  initialState: {
    ...migrated.continuationState,
    lineage: nonPlainLineage,
  },
}), /lineage/,
'migration lineage must use the same exact plain-object boundary as the parent state');

assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: 'sha256:wrong',
}), /sampling context/);
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: { ...legacyState, transportPotential: legacyState.transportPotential + 1 },
  expectedCandidateGStateKey: candidateGStateKey,
}), /contradicts/);
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: { ...migrated.continuationState, modelBundleSha256: 'wrong' },
}), /incompatible model metadata/);
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...migrated.continuationState,
    historyBounds: {
      ...migrated.continuationState.historyBounds,
      current: {
        ...migrated.continuationState.historyBounds.current,
        upperPotential: migrated.continuationState.historyBounds.current.upperPotential + 1,
      },
    },
  },
}), /current bounds contradict signed evidence/,
'schema-6 continuation must reject a plausible but unbound current upper bound');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: { ...migrated.continuationState, modelContractSha256: 'wrong' },
}), /incompatible model metadata/);
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: {
    ...migrated.continuationState,
    supplyPotential: String(migrated.continuationState.supplyPotential),
  },
}), /inconsistent|contradicts/,
'numeric-string schema-5 potential must not be repaired into a valid continuation');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: {
    ...migrated.continuationState,
    currentEvidence: migrated.continuationState.currentEvidence.map((item, index) => (
      index === 0 ? { ...item, strength: String(item.strength) } : item
    )),
  },
}), /invalid signed current evidence/,
'numeric-string signed evidence must invalidate schema-5 continuation');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: {
    ...legacyState,
    mobilisationPotential: String(legacyState.mobilisationPotential),
  },
  expectedCandidateGStateKey: candidateGStateKey,
}), /complete READY schema-2 state/,
'numeric-string Candidate G state must not seed the integrated migration');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: {
    ...legacyState,
    transportMemoryWindowHours: String(legacyState.transportMemoryWindowHours),
  },
  expectedCandidateGStateKey: candidateGStateKey,
}), /complete READY schema-2 state/,
'numeric-string Candidate G window metadata must not cross the migration trust boundary');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: { ...legacyState, unexpected: true },
  expectedCandidateGStateKey: candidateGStateKey,
}), /non-canonical field set/,
'Candidate G migration must reject unbound extra fields');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: legacyState,
  expectedCandidateGStateKey: candidateGStateKey,
}), /signed-evidence migration bootstrap is incompatible/,
'valid Candidate metadata cannot migrate without the exact sealed-evidence bootstrap');
assert.equal(buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: { ...legacyState, rollbackId: RAVSCORE_ROLLBACK_ID },
  expectedCandidateGStateKey: candidateGStateKey,
  candidateGCurrentBootstrap,
  candidateGWaveApproachBootstrap,
}).migrationApplied, true,
'an exact model-produced rollback state must remain a valid round-trip migration source');
assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
  samplingContextKey,
  initialState: { ...migrated.continuationState, unexpected: true },
}), /non-canonical field set/,
'schema-5 continuation must reject unbound extra fields');
for (const key of [
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
]) {
  assert.throws(() => buildIntegratedRavScoreStateSeries([currentSample], {
    samplingContextKey,
    initialState: { ...migrated.continuationState, [key]: `wrong-${key}` },
  }), /incompatible model metadata/, `continuation must reject incompatible ${key}`);
}

const rollback = reconstructCandidateGRollbackState(migrated.continuationState, {
  candidateGStateKey,
});
assert.equal(rollback.modelId, CANDIDATE_G_STATE_MODEL_ID);
assert.equal(rollback.schemaVersion, CANDIDATE_G_STATE_SCHEMA_VERSION);
assert.equal(rollback.stateKey, candidateGStateKey);
assert.ok(rollback.transportEvidence.length <= 49,
  'rollbackadapteren må aldrig udskrive en state, som Candidate G afviser');
assert.equal(buildCandidateGDerivedStateSeries([], {
  stateKey: candidateGStateKey,
  initialState: rollback,
}).initialStateAccepted, true, 'rollback-state skal accepteres byte-for-byte af Candidate G-pipelinen');
assert.equal(
  rollback.mobilisationPotential,
  migrated.continuationState.rollbackCandidateGMobilisationPotential,
);
const rollbackOracle = buildBoundedCurrentTransportMemory(rollback.transportEvidence, {
  ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  referenceTime: rollback.transportReferenceAt,
  restartAfterVerifiedTimeGap: true,
});
assert.equal(rollback.transportPotential, rollbackOracle.result.transportPotential);
assert.equal(
  rollback.outboundEpisodeEffectiveHours,
  rollbackOracle.result.outboundEpisodeEffectiveHours,
);

const boundaryMs = referenceMs - 48 * HOUR_MS;
const bridgedFortyNineEvidence = [
  { time: new Date(boundaryMs - HOUR_MS).toISOString(), strength: 0.2 },
  ...Array.from({ length: 48 }, (_, index) => ({
    time: new Date(boundaryMs + (index + 1) * HOUR_MS).toISOString(),
    strength: 0.2,
  })),
];
const bridgedFortyNineMemory = buildCurrentSupplyMemory(bridgedFortyNineEvidence, {
  referenceTime: time(0),
});
assert.equal(bridgedFortyNineMemory.memoryReady, true);
assert.equal(bridgedFortyNineMemory.evidence.length, 49);
const bridgedFortyNineRollback = reconstructCandidateGRollbackState({
  ...migrated.continuationState,
  currentReferenceAt: bridgedFortyNineMemory.referenceTime,
  currentMemoryReady: bridgedFortyNineMemory.memoryReady,
  currentMemoryStatus: bridgedFortyNineMemory.status,
  currentMemoryWindowHours: bridgedFortyNineMemory.windowHours,
  currentMemoryCoverageHours: bridgedFortyNineMemory.coverageHours,
  currentEvidence: bridgedFortyNineMemory.evidence,
  supplyPotential: bridgedFortyNineMemory.supplyPotential,
  historyBounds: {
    ...migrated.continuationState.historyBounds,
    current: {
      lowerPotential: bridgedFortyNineMemory.supplyPotential,
      upperPotential: bridgedFortyNineMemory.supplyPotential,
    },
  },
}, { candidateGStateKey });
assert.deepEqual(bridgedFortyNineRollback.transportEvidence, bridgedFortyNineMemory.evidence,
  'a real bridge plus 48 in-window rows remains exactly rollback-compatible');
assert.equal(buildCandidateGDerivedStateSeries([], {
  stateKey: candidateGStateKey,
  initialState: bridgedFortyNineRollback,
}).initialStateAccepted, true);

const fiftyPointEvidence = [
  { time: new Date(boundaryMs - 0.5 * HOUR_MS).toISOString(), strength: 0.2 },
  ...Array.from({ length: 48 }, (_, index) => ({
    time: new Date(boundaryMs + (index + 0.5) * HOUR_MS).toISOString(),
    strength: 0.2,
  })),
  { time: time(0), strength: 0.2 },
];
const diagnosticFiftyPointMemory = buildCurrentSupplyMemory(fiftyPointEvidence, {
  referenceTime: time(0),
  maximumRetainedEvidencePoints: 50,
});
assert.equal(diagnosticFiftyPointMemory.memoryReady, true);
assert.equal(diagnosticFiftyPointMemory.evidence.length, 50);
const fiftyPointMemory = buildCurrentSupplyMemory(fiftyPointEvidence, {
  referenceTime: time(0),
});
assert.equal(fiftyPointMemory.memoryReady, false);
assert.equal(fiftyPointMemory.status, 'EVIDENCE_LIMIT_EXCEEDED');
assert.equal(fiftyPointMemory.supplyPotential, null);
assert.throws(() => reconstructCandidateGRollbackState({
  ...migrated.continuationState,
  currentReferenceAt: diagnosticFiftyPointMemory.referenceTime,
  currentMemoryReady: diagnosticFiftyPointMemory.memoryReady,
  currentMemoryStatus: diagnosticFiftyPointMemory.status,
  currentMemoryWindowHours: diagnosticFiftyPointMemory.windowHours,
  currentMemoryCoverageHours: diagnosticFiftyPointMemory.coverageHours,
  currentEvidence: diagnosticFiftyPointMemory.evidence,
  supplyPotential: diagnosticFiftyPointMemory.supplyPotential,
}, { candidateGStateKey }), /lacks compact current evidence/,
'en indsprøjtet 50-punkts state skal afvises allerede af schema-5-kontrakten');

const fiftyPointProduced = buildIntegratedRavScoreStateSeries(
  fiftyPointEvidence.map(item => ({
    time: item.time,
    currentSpeedMps: 0.054,
    currentAlignment: 1,
    currentVerified: true,
    waveHeightM: 1,
    wavePeriodS: 6,
  })),
  { samplingContextKey },
);
assert.equal(fiftyPointProduced.rows.at(-1).currentMemoryReady, false);
assert.equal(fiftyPointProduced.rows.at(-1).currentMemoryStatus, 'EVIDENCE_LIMIT_EXCEEDED');
assert.equal(fiftyPointProduced.rows.at(-1).supplyPotential, null,
  'schema-5-producenten må ikke approksimere et rollback-inkompatibelt integral');

assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(4),
  currentSpeedMps: '0.09',
  waveHeightM: '1',
}], { samplingContextKey }), /verified current sample lacks exact signed evidence/,
'a verified numeric-string current must fail closed at the state boundary');
const numericStringSamples = buildIntegratedRavScoreStateSeries([{
  ...currentSample,
  time: time(4),
  currentSpeedMps: '0.09',
  currentAlignment: null,
  currentVerified: false,
  waveHeightM: '1',
}], { samplingContextKey });
assert.equal(numericStringSamples.rows[0].currentMemoryReady, false,
  'numeric-string current sample must be missing, not verified physical evidence');
assert.equal(numericStringSamples.rows[0].waveMemoryReady, false,
  'numeric-string wave sample must be missing, not verified physical evidence');
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...numericStringSamples.continuationState,
    currentMemoryCoverageHours:
      numericStringSamples.continuationState.currentMemoryCoverageHours + 1,
  },
}), /contradicts its signed current evidence/,
'unavailable schema-5 current metadata must be rebuilt, not trusted');
assert.throws(() => buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  initialState: {
    ...migrated.continuationState,
    time: '2026-08-29T12:00:00',
  },
}), /invalid causal time/,
'persisted schema-5 times without an explicit timezone must fail closed');

const compactText = JSON.stringify(migrated.continuationState).toLowerCase();
for (const forbidden of [
  'currentumps', 'currentvmps', 'currentspeedmps', 'currentdirectiondeg',
  'waveheightm', 'waveperiods', 'wavedirectiondeg', 'waterpoint', 'landpoint',
  'coordinates', 'latitude', 'longitude',
]) {
  assert.equal(compactText.includes(forbidden), false, `compact state contains ${forbidden}`);
}

console.log('Integreret RavScore schema-6 state, Candidate G/schema-5-migration og rollback: bestået.');
