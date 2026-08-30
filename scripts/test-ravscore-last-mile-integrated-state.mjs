import assert from 'node:assert/strict';
import { buildIntegratedRavScoreStateSeries } from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-model-contract.js';

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
    replayedHourCount: 48,
    targetReferenceAt: time(0),
  },
});
const target = built.rows.at(-1);
assert.equal(built.modelId, RAVSCORE_MODEL_ID);
assert.equal(built.schemaVersion, RAVSCORE_STATE_SCHEMA_VERSION);
assert.equal(RAVSCORE_STATE_SCHEMA_VERSION, '5.0.0');
assert.equal(target.currentMemoryReady, true);
assert.equal(target.waveMemoryReady, true);
assert.equal(target.lastMileMemoryReady, true);
assert.ok(target.lastMileFactor >= 0.85 && target.lastMileFactor < 0.851);
assert.ok(target.lastMileNormalAlignment < -0.999999);
assert.equal(/waveDirectionDeg|onshoreDirectionDeg|raw/i.test(
  JSON.stringify(target.continuationState),
), false, 'schema-5 continuation must contain only compact derived directional moments');

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
'schema-5 continuation must never silently cold-start a missing nested wave-approach state');

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
    `schema-5 ${momentKey} must reject strings, booleans and arrays`);
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
  'schema-5 must reject a READY directional state relabelled as non-ready');
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
'retired neutral schema-4 state must never be accepted as schema-5 continuation');

console.log('RavScore integrated schema-5 last-mile state scenarios passed.');
