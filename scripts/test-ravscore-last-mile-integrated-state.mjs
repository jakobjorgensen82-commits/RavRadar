import assert from 'node:assert/strict';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import { buildCurrentSupplyScoreBounds } from '../js/core/ravscore-current-supply-memory.js';
import {
  resolvePublicRavScoreProfile,
  selectPublicRavScoreResult,
} from '../js/core/ravscore-public-model.js';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_MODEL_ID,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_STATE_SCHEMA_VERSION,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  compactIntegratedRavScoreMode,
  integratedInputCalibrationEligible,
} from './lib/ravscore-integrated-runtime.mjs';
import {
  reconstructIntegratedEvaluationState,
} from './audit-ravscore-integrated-public-runtime.mjs';
import {
  reconcileIntegratedCurrentPartProjection,
} from './migrate-post-cutover-private-runtime.mjs';

const HOUR_MS = 3_600_000;
const targetMs = Date.parse('2026-08-29T12:00:00.000Z');
const time = offset => new Date(targetMs + offset * HOUR_MS).toISOString();
const samplingContextKey = `sha256:${'a'.repeat(64)}`;
const onshoreDirectionDeg = 0;
const rows = Array.from({ length: 49 }, (_, index) => ({
  time: time(index - 48),
  currentCoastNormalSpeedMps: 0.09,
  currentVerified: true,
  waveHeightM: 4,
  wavePeriodS: 10,
  // DMI is "from": 0 degrees therefore travels offshore relative to normal 0.
  waveDirectionDeg: 0,
}));

const built = buildIntegratedRavScoreStateSeries(rows, {
  samplingContextKey,
  onshoreDirectionDeg,
  coldReplayBootstrap: {
    recoveryId: RAVSCORE_COLD_REPLAY_ID,
    expectedCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
    completeCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
    boundedUnknownPositionCount: 0,
    historyTransition: RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
    targetReferenceAt: time(0),
  },
});
const target = built.rows.at(-1);
assert.equal(built.modelId, RAVSCORE_MODEL_ID);
assert.equal(built.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(RAVSCORE_STATE_SCHEMA_VERSION, '6.0.0');
assert.equal(target.currentMemoryReady, true);
assert.equal(target.waveMemoryReady, true);
assert.equal(target.lastMileMemoryReady, true);
assert.ok(target.lastMileFactor >= 0.85 && target.lastMileFactor < 0.851);
assert.ok(target.lastMileNormalAlignment < -0.999999);
assert.equal(/waveDirectionDeg|onshoreDirectionDeg|raw/i.test(
  JSON.stringify(target.continuationState),
), false, 'schema-6 continuation must contain only compact derived directional moments');
assert.equal(
  target.continuationState.historyBounds.lastMile.lastUnknownAt,
  time(-48),
  'cold replay must retain the causal origin of its unknown pre-window tail',
);
assert.equal(
  target.continuationState.historyBounds.lastMile.conservativeResetAt,
  time(-8),
  'the 40-hour last-mile tail reset must be bound to its exact closure time',
);
assert.deepEqual(
  target.continuationState.historyBounds.lastMile.minimumFactorTrack,
  target.continuationState.historyBounds.lastMile.maximumFactorTrack,
  'the last-mile tracks may collapse after 40 hours while the 288-hour wave tail stays incomplete',
);

const continued = buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
  waveDirectionDeg: 180,
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: target.continuationState,
});
assert.equal(continued.initialStateAccepted, true);
assert.equal(continued.rows[0].lastMileMemoryReady, true);
assert.ok(continued.rows[0].lastMileFactor >= 0.85
  && continued.rows[0].lastMileFactor <= 1);

assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: {
    ...target.continuationState,
    waveApproachState: null,
  },
}), /wave-approach state is not bound to parent time/,
'schema-6 continuation must never silently cold-start a missing nested wave-approach state');

assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: {
    ...target.continuationState,
    waveApproachState: {
      ...target.continuationState.waveApproachState,
      time: time(-4),
      waveReferenceAt: time(-4),
    },
  },
}), /wave-approach state is not bound to parent time/,
'nested directional moments must be time-bound to the exact parent continuation instead of creating a hidden long-gap restart');

for (const momentKey of [
  'waveActivityMoment',
  'waveNormalMoment',
  'waveTangentMoment',
]) {
  for (const invalidValue of [
    String(target.continuationState.waveApproachState[momentKey]),
    true,
    [],
  ]) {
    assert.throws(() => buildIntegratedRavScoreStateSeries([{
      ...rows.at(-1),
      time: time(1),
    }], {
      samplingContextKey,
      onshoreDirectionDeg,
      initialState: {
        ...target.continuationState,
        waveApproachState: {
          ...target.continuationState.waveApproachState,
          [momentKey]: invalidValue,
        },
      },
    }), /internally inconsistent/,
    `schema-6 ${momentKey} must reject strings, booleans and arrays`);
  }
}

for (const statusTamper of [
  { readiness: false, status: 'COLD_START' },
  { readiness: false, status: 'MISSING_INPUT' },
]) {
  assert.throws(() => buildIntegratedRavScoreStateSeries([{
    ...rows.at(-1),
    time: time(1),
  }], {
    samplingContextKey,
    onshoreDirectionDeg,
    initialState: {
      ...target.continuationState,
      waveApproachState: {
        ...target.continuationState.waveApproachState,
        ...statusTamper,
      },
    },
  }), /internally inconsistent/,
  'schema-6 must reject a READY directional state relabelled as non-ready');
}

const missingDirection = buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
  waveDirectionDeg: null,
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: target.continuationState,
});
assert.equal(missingDirection.rows[0].lastMileMemoryReady, false);
assert.equal(missingDirection.rows[0].lastMileMemoryStatus, 'MISSING_INPUT');
assert.equal(missingDirection.rows[0].lastMileEvidenceStatus,
  'ACTIVE_WAVE_DIRECTION_MISSING');

// After the bounded 40-hour tail reset, the physical directional point keeps
// evolving while the conservative score track starts from its collapsed lower
// bound. A later missing direction reopens uncertainty. The reopened interval
// must enclose the physical point immediately, and already-saved schema-6
// states from the former producer must be repaired deterministically.
const postResetDirectionRecovery = buildIntegratedRavScoreStateSeries(
  rows.map((row, index) => index > 40 ? { ...row, waveDirectionDeg: 180 } : row),
  {
    samplingContextKey,
    onshoreDirectionDeg,
    coldReplayBootstrap: {
      recoveryId: RAVSCORE_COLD_REPLAY_ID,
      expectedCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
      completeCausalPositionCount: RAVSCORE_RECOVERY_POLICY.coldReplayHours,
      boundedUnknownPositionCount: 0,
      historyTransition: RAVSCORE_RECOVERY_POLICY.completeHistoryTransition,
      targetReferenceAt: time(0),
    },
  },
);
const postResetTarget = postResetDirectionRecovery.rows.at(-1);
assert.equal(
  postResetTarget.continuationState.historyBounds.lastMile.conservativeResetAt,
  time(-8),
);
const reopenedAfterReset = buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
  waveDirectionDeg: null,
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: postResetTarget.continuationState,
});
assert.ok(
  reopenedAfterReset.rows[0].lastMileFactor
    >= reopenedAfterReset.rows[0].lastMileFactorLower - 1e-9,
);
assert.ok(
  reopenedAfterReset.rows[0].lastMileFactor
    <= reopenedAfterReset.rows[0].lastMileFactorUpper + 1e-9,
);
assert.equal(buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: reopenedAfterReset.continuationState,
}).initialStateAccepted, true,
'a reopened post-reset envelope must be valid on the next ordinary run');

const formerlySavedInvalidState = structuredClone(reopenedAfterReset.continuationState);
formerlySavedInvalidState.historyBounds.lastMile = {
  ...formerlySavedInvalidState.historyBounds.lastMile,
  minimumFactorTrack: {
    ...postResetTarget.continuationState.historyBounds.lastMile.minimumFactorTrack,
  },
  maximumFactorTrack: {
    ...postResetTarget.continuationState.historyBounds.lastMile.maximumFactorTrack,
  },
  lastUnknownAt: time(1),
  conservativeResetAt: null,
};
const repairedFormerState = buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: formerlySavedInvalidState,
});
assert.equal(repairedFormerState.initialStateAccepted, true);
assert.notDeepEqual(
  repairedFormerState.continuationState.historyBounds.lastMile,
  formerlySavedInvalidState.historyBounds.lastMile,
  'an open schema-6 interval may only be widened enough to enclose its valid point track',
);

const directionRecoveredAfterGap = buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(2),
  waveDirectionDeg: 180,
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: reopenedAfterReset.continuationState,
});
const formerlySavedScoreState = structuredClone(
  directionRecoveredAfterGap.continuationState,
);
formerlySavedScoreState.historyBounds.lastMile.minimumFactorTrack = {
  ...postResetTarget.continuationState.historyBounds.lastMile.minimumFactorTrack,
};
formerlySavedScoreState.historyBounds.lastMile.maximumFactorTrack = {
  ...postResetTarget.continuationState.historyBounds.lastMile.maximumFactorTrack,
};
const repairedScoreState = buildIntegratedRavScoreStateSeries([], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: formerlySavedScoreState,
});
assert.equal(repairedScoreState.initialStateAccepted, true);
assert.notDeepEqual(
  repairedScoreState.continuationState.historyBounds.lastMile,
  formerlySavedScoreState.historyBounds.lastMile,
);

const repairWeather = {
  time: time(2),
  windSpeedMps: 7,
  waveHeightM: 4,
  wavePeriodS: 10,
  waveDirectionDeg: 180,
  currentSpeedMps: 0.09,
  currentDirectionDeg: 0,
  currentProvenance: { status: 'verified' },
};
const formerCurrentBounds = buildCurrentSupplyScoreBounds(
  formerlySavedScoreState.currentEvidence,
  { referenceTime: formerlySavedScoreState.time },
);
const formerHistoryReasonCodes = [
  ...(formerCurrentBounds.reasonCodes ?? []),
  ...(formerlySavedScoreState.historyBounds.waveMobilisation.lastUnknownAt !== null
      && formerlySavedScoreState.historyBounds.waveMobilisation.conservativeResetAt === null
    ? ['WAVE_MOBILISATION_HISTORY_INCOMPLETE'] : []),
  ...(formerlySavedScoreState.historyBounds.lastMile.lastUnknownAt !== null
      && formerlySavedScoreState.historyBounds.lastMile.conservativeResetAt === null
    ? ['LAST_MILE_HISTORY_INCOMPLETE'] : []),
];
const formerHistoryIncomplete = formerCurrentBounds.quality === 'HISTORY_INCOMPLETE'
  || formerHistoryReasonCodes.length > 0;
const persistedQuality = {
  available: true,
  score: 0,
  scoreBounds: {
    lower: 0,
    upper: 0,
    modelUncertaintyPoints: 0,
    rawLower: 0,
    rawUpper: 0,
  },
  scoreQuality: formerHistoryIncomplete ? 'HISTORY_INCOMPLETE' : 'FULL_HISTORY',
  calibrationEligible: !formerHistoryIncomplete,
  scoreSemantics: formerHistoryIncomplete
    ? 'CONSERVATIVE_ENCLOSING_LOWER_BOUND' : 'EXACT_POINT_SCORE',
  conservativeTailResetApplied:
    formerlySavedScoreState.historyBounds.waveMobilisation.conservativeResetAt !== null
    || formerlySavedScoreState.historyBounds.lastMile.conservativeResetAt !== null,
  historyCoverageHours: formerCurrentBounds.coverageHours,
  historyReasonCodes: formerHistoryReasonCodes,
};
const wrapperMetadata = state => ({
  ...ravScoreModelBinding(),
  referenceAt: state.time,
  currentReferenceAt: state.currentReferenceAt,
  currentTransition: null,
  currentMemoryReady: state.currentMemoryReady,
  currentMemoryStatus: state.currentMemoryStatus,
  currentMemoryCoverageHours: state.currentMemoryCoverageHours,
  currentMemoryWindowHours: state.currentMemoryWindowHours,
  waveLastVerifiedAt: state.waveLastVerifiedAt,
  waveMemoryReady: state.waveMemoryReady,
  waveMemoryStatus: state.waveMemoryStatus,
  lastMileWaveReferenceAt: state.waveApproachState.waveReferenceAt,
  lastMileMemoryReady: state.waveApproachState.readiness,
  lastMileMemoryStatus: state.waveApproachState.status,
  currentState: state,
});
const formerWrapper = wrapperMetadata(formerlySavedScoreState);
const formerEvaluationState = reconstructIntegratedEvaluationState(
  formerlySavedScoreState,
  formerWrapper,
  repairWeather,
  persistedQuality,
  onshoreDirectionDeg,
);
formerWrapper.modes = Object.fromEntries(['waders', 'beach'].map(mode => [
  mode,
  compactIntegratedRavScoreMode(evaluateRavScoreIntegrated({
    mode,
    weather: repairWeather,
    zone: { onshoreDirectionDeg },
  }, { state: formerEvaluationState }), {
    inputCalibrationEligible: integratedInputCalibrationEligible(repairWeather),
  }),
]));
const scoreProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: false,
  modelMigrationReady: true,
});
const formerContext = {
  windSpeedMps: repairWeather.windSpeedMps,
  waveHeightM: repairWeather.waveHeightM,
  currentSpeedMps: repairWeather.currentSpeedMps,
  currentCoastNormalSpeedMps: formerEvaluationState.currentCoastNormalSpeedMps,
  currentAlignment: 1,
  currentVerified: true,
  currentTransition: null,
  currentReferenceAt: formerWrapper.currentReferenceAt,
  currentReferenceProvenance: repairWeather.currentProvenance,
  currentMemoryReady: formerWrapper.currentMemoryReady,
  currentMemoryStatus: formerWrapper.currentMemoryStatus,
  currentMemoryCoverageHours: formerWrapper.currentMemoryCoverageHours,
  currentMemoryWindowHours: formerWrapper.currentMemoryWindowHours,
  waveLastVerifiedAt: formerWrapper.waveLastVerifiedAt,
  waveMemoryReady: formerWrapper.waveMemoryReady,
  waveMemoryStatus: formerWrapper.waveMemoryStatus,
  lastMileWaveReferenceAt: formerEvaluationState.lastMileWaveReferenceAt,
  lastMileMemoryReady: formerEvaluationState.lastMileMemoryReady,
  lastMileMemoryStatus: formerEvaluationState.lastMileMemoryStatus,
};
const repairedPart = {
  partId: 'repair-test',
  zoneId: 'zone-repair-test',
  name: 'Repair test',
  onshoreDirectionDeg,
  ravScoreModel: {
    ...formerWrapper,
    currentState: repairedScoreState.continuationState,
  },
  current: {
    time: repairWeather.time,
    weather: structuredClone(repairWeather),
    ...Object.fromEntries(['waders', 'beach'].map(mode => [mode,
      selectPublicRavScoreResult({
        profile: scoreProfile,
        modelResult: formerWrapper.modes[mode],
        modelState: formerWrapper,
        mode,
        context: formerContext,
      }),
    ])),
  },
};
const weatherBeforeProjectionRepair = structuredClone(repairedPart.current.weather);
const repairedProjection = reconcileIntegratedCurrentPartProjection({
  part: repairedPart,
  scoreProfile,
});
assert.deepEqual(repairedPart.current.weather, weatherBeforeProjectionRepair,
  'same-time score repair must not mutate weather input');
assert.notDeepEqual(repairedProjection.modes, formerWrapper.modes,
  'repairing last-mile bounds must recompute the stored current model modes');
for (const mode of ['waders', 'beach']) {
  assert.equal(repairedProjection.modes[mode].available, formerWrapper.modes[mode].available);
  assert.equal(repairedProjection.modes[mode].scoreQuality,
    formerWrapper.modes[mode].scoreQuality);
  assert.equal(repairedProjection.current[mode].score,
    repairedProjection.modes[mode].score);
  assert.deepEqual(repairedProjection.current[mode].scoreBounds,
    repairedProjection.modes[mode].scoreBounds);
}

const calmDirectionless = buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
  waveHeightM: 0,
  wavePeriodS: 0,
  waveDirectionDeg: null,
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: target.continuationState,
});
assert.equal(calmDirectionless.rows[0].lastMileMemoryReady, true);
assert.ok(calmDirectionless.rows[0].lastMileFactor >= target.lastMileFactor,
  'calm must decay attenuation toward neutral, never add supply');

const retiredNeutralSchema4 = {
  ...target.continuationState,
  schemaVersion: '4.0.0',
  modelId: 'RRS-COASTAL-PROCESS-INTEGRATED-1.0.0',
};
assert.throws(() => buildIntegratedRavScoreStateSeries([{
  ...rows.at(-1),
  time: time(1),
}], {
  samplingContextKey,
  onshoreDirectionDeg,
  initialState: retiredNeutralSchema4,
}), /cannot be continued or migrated|incompatible model metadata/,
'retired neutral schema-4 state must never be accepted as schema-6 continuation');

console.log('RavScore integrated schema-6 last-mile state scenarios passed.');
