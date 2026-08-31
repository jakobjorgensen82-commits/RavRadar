import assert from 'node:assert/strict';
import {
  buildRavScoreWaveApproachStateSeries,
  waveApproachDeliveryContext,
} from '../js/core/ravscore-wave-approach-state.js';
import { evaluateIntegratedLastMile } from '../js/core/ravscore-integrated.js';

const start = Date.parse('2026-08-01T00:00:00.000Z');
const time = hour => new Date(start + hour * 3_600_000).toISOString();
const waves = ({ direction = 180, height = 4, period = 10, count = 49 } = {}) =>
  Array.from({ length: count }, (_, hour) => ({
    time: time(hour),
    waveHeightM: height,
    wavePeriodS: period,
    waveDirectionDeg: direction,
  }));
const build = rows => buildRavScoreWaveApproachStateSeries(rows, {
  onshoreDirectionDeg: 0,
});

for (const malformedTime of ['2026-02-30T00:00:00Z', '2026-08-01T24:00:00Z']) {
  assert.throws(() => build([{
    ...waves({ count: 1 })[0],
    time: malformedTime,
  }]), /valid time/,
  `${malformedTime} must not be moved into another directional-evidence hour`);
}

const onshore = build(waves({ direction: 180 })).rows.at(-1);
const offshore = build(waves({ direction: 0 })).rows.at(-1);
const alongshore = build(waves({ direction: 90 })).rows.at(-1);
assert.equal(onshore.available, true);
assert.equal(onshore.normalAlignment, 1, 'DMI from 180 must rotate toward immutable onshore 0');
assert.equal(onshore.factor, 1);
assert.ok(offshore.normalAlignment < -0.999999);
assert.ok(offshore.factor >= 0.85 && offshore.factor < 0.851);
assert.ok(alongshore.factor > 0.879 && alongshore.factor < 0.881);
assert.ok(onshore.factor >= alongshore.factor && alongshore.factor >= offshore.factor);

for (const row of [onshore, offshore, alongshore]) {
  assert.ok(row.factor >= 0.85 && row.factor <= 1);
  assert.equal(/waveDirectionDeg|onshoreDirectionDeg|raw/i.test(
    JSON.stringify(row.continuationState),
  ), false, 'compact state must retain derived W/N/T only');
}

const offshoreDelivery = evaluateIntegratedLastMile({
  supplyPotential: 60,
  lastMileState: {
    lastMileMemoryReady: offshore.readiness,
    lastMileMemoryStatus: offshore.status,
    lastMileEvidenceStatus: offshore.evidenceStatus,
    lastMileWaveActivity: offshore.activity,
    lastMileNormalAlignment: offshore.normalAlignment,
    lastMileTangentAlignment: offshore.tangentAlignment,
    lastMileCoherence: offshore.coherence,
    lastMileApproach: offshore.approach,
    lastMileFactor: offshore.factor,
  },
});
assert.equal(offshoreDelivery.available, true);
assert.deepEqual(offshoreDelivery.directionConventions, {
  waveDirectionDeg: 'FROM',
  towardConversionDegrees: 180,
  onshoreDirectionDeg: 'IMMUTABLE_COAST_NORMAL_TOWARD_LAND',
  appliedRotationCount: 1,
});
assert.ok(offshoreDelivery.transport <= 60 && offshoreDelivery.transport >= 51);
assert.equal(evaluateIntegratedLastMile({
  supplyPotential: 0,
  lastMileState: {
    lastMileMemoryReady: offshore.readiness,
    lastMileMemoryStatus: offshore.status,
    lastMileEvidenceStatus: offshore.evidenceStatus,
    lastMileWaveActivity: offshore.activity,
    lastMileNormalAlignment: offshore.normalAlignment,
    lastMileTangentAlignment: offshore.tangentAlignment,
    lastMileCoherence: offshore.coherence,
    lastMileApproach: offshore.approach,
    lastMileFactor: offshore.factor,
  },
}).transport, 0, 'waves must never create supply');
for (const supplyPotential of [0, 25, 60, 100]) {
  for (const activity of [0.25, 0.5, 1]) {
    for (const normalAlignment of [-1, -0.25, 0, 1]) {
      const approach = Math.max(0, Math.min(1, (normalAlignment + 0.25) / 1.25));
      const factor = Math.max(0.85, Math.min(
        1,
        1 - 0.15 * activity * (1 - approach),
      ));
      const bounded = evaluateIntegratedLastMile({
        supplyPotential,
        lastMileState: {
          lastMileMemoryReady: true,
          lastMileMemoryStatus: 'READY',
          lastMileEvidenceStatus: 'DIRECTIONAL_WAVE_EVIDENCE_READY',
          lastMileWaveActivity: activity,
          lastMileNormalAlignment: normalAlignment,
          lastMileTangentAlignment: 0,
          lastMileCoherence: Math.abs(normalAlignment),
          lastMileApproach: approach,
          lastMileFactor: factor,
        },
      });
      assert.equal(bounded.available, true);
      assert.ok(Math.abs(bounded.transport - supplyPotential * factor) <= 1e-9,
        'the bounded last-mile factor must multiply existing supply exactly once');
      assert.ok(bounded.transport <= supplyPotential + 1e-9,
        'wave approach must never increase supply');
      assert.ok(0.5 * (supplyPotential - bounded.transport) <= 7.5 + 1e-9,
        'the raw 50%-component effect must stay within 7.5 score points');
    }
  }
}
assert.equal(evaluateIntegratedLastMile({
  supplyPotential: 60,
  lastMileState: {
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    lastMileWaveActivity: 1,
    lastMileApproach: 0,
    lastMileFactor: 1,
  },
}).available, false, 'a factor inconsistent with W and approach must fail closed');
assert.equal(evaluateIntegratedLastMile({
  supplyPotential: 60,
  lastMileState: {
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    lastMileWaveActivity: 1,
    lastMileNormalAlignment: -1,
    lastMileTangentAlignment: 0,
    lastMileCoherence: 1,
    lastMileApproach: 1,
    lastMileFactor: 1,
  },
}).available, false,
'a forged approach/factor pair must not contradict the retained directional moments');
assert.equal(evaluateIntegratedLastMile({
  supplyPotential: 60,
  lastMileState: {
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    lastMileWaveActivity: 0,
    lastMileNormalAlignment: 0,
    lastMileTangentAlignment: 0,
    lastMileCoherence: 0,
    lastMileApproach: 1,
    lastMileFactor: 1,
  },
}).available, false,
'an exact-calm projection must retain null direction diagnostics, not a forged vector');

const calm = build(waves({ height: 0, period: 0, direction: null }));
assert.equal(calm.rows.at(-1).available, true);
assert.equal(calm.rows.at(-1).factor, 1);
assert.equal(calm.rows.at(-1).calm, true);

const microscopicActive = build(waves({
  height: 1e-8,
  period: 1,
  direction: 180,
  count: 2,
}));
assert.equal(microscopicActive.rows.at(-1).available, true);
assert.equal(microscopicActive.rows.at(-1).evidenceStatus,
  'DIRECTIONAL_WAVE_EVIDENCE_READY');
assert.equal(microscopicActive.rows.at(-1).calm, false,
  'a positive, however small, wave height must never be relabelled exact calm');
assert.ok(microscopicActive.rows.at(-1).activity > 0);
assert.ok(microscopicActive.rows.at(-1).normalAlignment > 0.999999);

const calmWithRetainedTail = build([
  ...waves({ direction: 0, count: 2 }),
  { time: time(2), waveHeightM: 0, wavePeriodS: 0, waveDirectionDeg: null },
]).rows.at(-1);
assert.equal(calmWithRetainedTail.evidenceStatus, 'EXACT_CALM_DIRECTION_NEUTRAL');
assert.equal(calmWithRetainedTail.calm, false,
  'a calm current sample must not erase a causal older directional tail');
assert.ok(calmWithRetainedTail.activity > 0);
assert.equal(evaluateIntegratedLastMile({
  supplyPotential: 60,
  lastMileState: {
    lastMileMemoryReady: calmWithRetainedTail.readiness,
    lastMileMemoryStatus: calmWithRetainedTail.status,
    lastMileEvidenceStatus: calmWithRetainedTail.evidenceStatus,
    lastMileWaveActivity: calmWithRetainedTail.activity,
    lastMileNormalAlignment: calmWithRetainedTail.normalAlignment,
    lastMileTangentAlignment: calmWithRetainedTail.tangentAlignment,
    lastMileCoherence: calmWithRetainedTail.coherence,
    lastMileApproach: calmWithRetainedTail.approach,
    lastMileFactor: calmWithRetainedTail.factor,
  },
}).available, true,
'exact-calm evidence with a valid retained tail must remain scoreable');

const invalidPositiveHeightZeroPeriod = build([{
  time: time(0), waveHeightM: 4, wavePeriodS: 0, waveDirectionDeg: null,
}]);
assert.equal(invalidPositiveHeightZeroPeriod.rows[0].readiness, false);
assert.equal(invalidPositiveHeightZeroPeriod.rows[0].status, 'MISSING_INPUT');
assert.equal(invalidPositiveHeightZeroPeriod.rows[0].evidenceStatus,
  'WAVE_PHYSICS_INVALID');
assert.equal(invalidPositiveHeightZeroPeriod.rows[0].waveReferenceAt, null,
  'an invalid positive-height/zero-period tuple must not become calm evidence');

const activeMissing = build([
  ...waves({ count: 3 }),
  { time: time(3), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: null },
]);
assert.equal(activeMissing.rows.at(-1).readiness, false);
assert.equal(activeMissing.rows.at(-1).status, 'MISSING_INPUT');
assert.equal(activeMissing.rows.at(-1).evidenceStatus, 'ACTIVE_WAVE_DIRECTION_MISSING');

assert.throws(() => waveApproachDeliveryContext({
  ...onshore.continuationState,
  readiness: false,
  status: 'COLD_START',
}), /internally inconsistent/,
'COLD_START may not relabel and retain accumulated directional moments');
assert.throws(() => waveApproachDeliveryContext({
  ...onshore.continuationState,
  readiness: false,
  status: 'MISSING_INPUT',
}), /internally inconsistent/,
'MISSING_INPUT may not self-reference the same hour as verified evidence');
assert.throws(() => waveApproachDeliveryContext({
  ...invalidPositiveHeightZeroPeriod.continuationState,
  waveActivityMoment: 0.2,
}), /internally inconsistent/,
'a no-reference MISSING_INPUT state may not retain hidden moments');
assert.throws(() => waveApproachDeliveryContext({
  ...invalidPositiveHeightZeroPeriod.continuationState,
  latestWaveEnergyWeight: 0,
}), /internally inconsistent/,
'latest wave fields must be an all-null or all-present triplet bound to the reference');
assert.throws(() => waveApproachDeliveryContext({
  ...onshore.continuationState,
  latestWaveNormalAlignment: 0.5,
  latestWaveTangentAlignment: 0.5,
}), /internally inconsistent/,
'a persisted latest directional alignment must remain a canonical unit vector');
assert.throws(() => waveApproachDeliveryContext({
  ...invalidPositiveHeightZeroPeriod.continuationState,
  waveActivityMoment: Number.EPSILON,
}), /internally inconsistent/,
'a no-reference missing state may not retain even an epsilon of invented activity');

const recovered = buildRavScoreWaveApproachStateSeries([{
  time: time(4), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: 180,
}], {
  onshoreDirectionDeg: 0,
  initialState: activeMissing.continuationState,
});
assert.equal(recovered.rows[0].status, 'RECOVERED_SHORT_GAP');
assert.equal(recovered.rows[0].creditedDurationHours, 1);

const longGap = buildRavScoreWaveApproachStateSeries([{
  time: time(8), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: 180,
}], {
  onshoreDirectionDeg: 0,
  initialState: recovered.continuationState,
});
assert.equal(longGap.rows[0].status, 'COLD_START');
assert.equal(longGap.rows[0].readiness, false);
assert.equal(longGap.rows[0].activity, 0, 'long gap must not invent directional duration');

const coherenceBase = {
  ...onshore.continuationState,
  waveActivityMoment: 1,
  waveNormalMoment: 0,
  waveTangentMoment: 0,
};
const incoherent = waveApproachDeliveryContext(coherenceBase);
const coherentAlong = waveApproachDeliveryContext({
  ...coherenceBase,
  waveTangentMoment: 0.8,
});
assert.equal(incoherent.factor, coherentAlong.factor,
  'coherence must affect uncertainty/explanation only');
assert.notEqual(incoherent.coherence, coherentAlong.coherence);

for (const momentKey of [
  'waveActivityMoment',
  'waveNormalMoment',
  'waveTangentMoment',
]) {
  for (const invalidValue of [String(coherenceBase[momentKey]), true, []]) {
    assert.throws(() => waveApproachDeliveryContext({
      ...coherenceBase,
      [momentKey]: invalidValue,
    }), /internally inconsistent/,
    `${momentKey} must reject strings, booleans and arrays without coercion`);
  }
}

const sensitivity = [-1, -0.25, 0, 0.5, 1].map(normalAlignment => ({
  normalAlignment,
  ...waveApproachDeliveryContext({
    ...coherenceBase,
    waveNormalMoment: normalAlignment,
    waveTangentMoment: 0,
  }),
}));
assert.deepEqual(sensitivity.map(row => row.factor), [0.85, 0.85, 0.88, 0.94, 1]);
assert.equal(sensitivity.find(row => row.normalAlignment === 0).approach, 0.2,
  'the transparent -0.25 prior maps a full-energy alongshore wave to approach 0.2');
assert.ok((1 - Math.min(...sensitivity.map(row => row.factor))) * 100 * 0.5
  <= 7.5 + 1e-9,
  'bounded last-mile attenuation may change the 50%-weighted total by at most 7.5 points');

const splitSamples = [
  ...waves({ count: 6 }),
  { time: time(6), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: null },
  { time: time(7), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: 0 },
  { time: time(12), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: 180 },
  { time: time(13), waveHeightM: 4, wavePeriodS: 10, waveDirectionDeg: 180 },
];
const uninterrupted = build(splitSamples);
const firstSplit = build(splitSamples.slice(0, 7));
const secondSplit = buildRavScoreWaveApproachStateSeries(splitSamples.slice(7), {
  onshoreDirectionDeg: 0,
  initialState: firstSplit.continuationState,
});
assert.deepEqual(secondSplit.continuationState, uninterrupted.continuationState,
  'missing recovery and long-gap restart must be split-run identical');
const sameTime = buildRavScoreWaveApproachStateSeries([splitSamples.at(-1)], {
  onshoreDirectionDeg: 0,
  initialState: uninterrupted.continuationState,
});
assert.deepEqual(sameTime.continuationState, uninterrupted.continuationState,
  'same-time replay must be exactly idempotent');

console.log('RavScore wave-approach state scenarios passed.');
