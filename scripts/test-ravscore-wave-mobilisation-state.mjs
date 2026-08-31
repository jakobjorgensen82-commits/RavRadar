import assert from 'node:assert/strict';

import {
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION,
  RAVSCORE_WAVE_MOBILISATION_STATUS,
  buildRavScoreWaveMobilisationStateSeries,
} from '../js/core/ravscore-wave-mobilisation-state.js';

const HOUR_MS = 3_600_000;
const startMs = Date.parse('2026-08-29T00:00:00Z');
const hour = index => new Date(startMs + index * HOUR_MS).toISOString();
const sample = (index, overrides = {}) => ({
  time: hour(index),
  waveHeightM: 2,
  wavePeriodS: 8,
  ...overrides,
});
const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};
const afterHalfLife = (from, target, hours, halfLife) =>
  from + (target - from) * (1 - 2 ** (-hours / halfLife));

assert.equal(RAVSCORE_WAVE_MOBILISATION_STATE_SCHEMA_VERSION, '1.0.0');
assert.equal(RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours, 4);
assert.equal(RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours, 48);
assert.equal(RAVSCORE_WAVE_MOBILISATION_POLICY.maximumContinuousIntervalHours, 1);
assert.equal(RAVSCORE_WAVE_MOBILISATION_POLICY.maximumFreshGapHours, 3);
assert.equal(
  RAVSCORE_WAVE_MOBILISATION_POLICY.maximumBuildCreditAfterMissingOrGapHours,
  1,
);
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([{
  ...sample(0),
  time: '2026-08-29T00:00:00',
}]), /explicit timezone/,
'timezone-free wave samples must fail closed');
for (const malformedTime of ['2026-02-30T00:00:00Z', '2026-08-29T24:00:00Z']) {
  assert.throws(() => buildRavScoreWaveMobilisationStateSeries([{
    ...sample(0),
    time: malformedTime,
  }]), /valid time/,
  `${malformedTime} must not be moved into another mobilisation hour`);
}

const cold = buildRavScoreWaveMobilisationStateSeries([sample(0)]);
assert.equal(cold.rows[0].readiness, false);
assert.equal(cold.rows[0].status, RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START);
assert.equal(cold.rows[0].transition, 'COLD_START_NO_HISTORY');
assert.equal(cold.rows[0].mobilisationPotential, 0,
  'a cold first sample must not invent one elapsed hour');
assert.ok(cold.rows[0].rollbackCandidateGMobilisationPotential > 0,
  'the physically separate rollback track must retain Candidate G first-hour semantics');
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([], {
  initialState: {
    ...cold.continuationState,
    mobilisationPotential: 100,
  },
}), /readiness and status are inconsistent/,
'COLD_START may not retain invented mobilisation before any elapsed evidence');

const continuous = buildRavScoreWaveMobilisationStateSeries([
  sample(0),
  sample(1),
  sample(2, { waveHeightM: 0, wavePeriodS: 3 }),
  sample(3),
]);
assert.equal(continuous.rows[1].readiness, true);
assert.equal(continuous.rows[1].status, RAVSCORE_WAVE_MOBILISATION_STATUS.READY);
assert.equal(continuous.rows[1].creditedDurationHours, 1);
close(
  continuous.rows[1].mobilisationPotential,
  afterHalfLife(0, 100, 1, RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours),
);
assert.ok(continuous.rows[2].mobilisationPotential < continuous.rows[1].mobilisationPotential,
  'a continuously observed lower target must decay the state');
assert.ok(continuous.rows[3].mobilisationPotential > continuous.rows[2].mobilisationPotential,
  'a continuously observed higher target must build the state');

const fourObservedBuildHours = buildRavScoreWaveMobilisationStateSeries(
  Array.from({ length: 5 }, (_, index) => sample(index)),
);
close(fourObservedBuildHours.rows.at(-1).mobilisationPotential, 50,
  1e-9);
const fortyEightObservedDecayHours = buildRavScoreWaveMobilisationStateSeries(
  Array.from({ length: 49 }, (_, index) => sample(index + 1, {
    waveHeightM: 0,
    wavePeriodS: 3,
  })),
  {
    candidateGMigrationSeed: {
      time: hour(0),
      mobilisationPotential: 100,
    },
  },
);
close(fortyEightObservedDecayHours.rows.at(-1).mobilisationPotential, 50,
  1e-9);

const splitFirst = buildRavScoreWaveMobilisationStateSeries([
  sample(0),
  sample(1),
]);
const splitSecond = buildRavScoreWaveMobilisationStateSeries([
  sample(2, { waveHeightM: 0, wavePeriodS: 3 }),
  sample(3),
], { initialState: splitFirst.continuationState });
assert.deepEqual(splitSecond.rows, continuous.rows.slice(2),
  'split and uninterrupted runs must produce identical rows');
assert.deepEqual(splitSecond.continuationState, continuous.continuationState);

const gapSequence = [
  sample(0),
  sample(1),
  sample(2, { waveHeightM: null, wavePeriodS: null }),
  sample(3),
];
const gapContinuous = buildRavScoreWaveMobilisationStateSeries(gapSequence);
const gapFirstRun = buildRavScoreWaveMobilisationStateSeries(gapSequence.slice(0, 3));
const gapSecondRun = buildRavScoreWaveMobilisationStateSeries(gapSequence.slice(3), {
  initialState: gapFirstRun.continuationState,
});
assert.deepEqual(gapSecondRun.rows, gapContinuous.rows.slice(3),
  'missing/freshness recovery must also be split-run invariant');

const migrated = buildRavScoreWaveMobilisationStateSeries([sample(0)], {
  candidateGMigrationSeed: {
    time: hour(0),
    mobilisationPotential: 67,
    rollbackCandidateGMobilisationPotential: 66,
  },
});
assert.equal(migrated.initialStateSource, 'CANDIDATE_G_MIGRATION');
assert.equal(migrated.rows[0].readiness, true,
  'a validated Candidate G seed plus current valid waves must be immediately ready');
assert.equal(migrated.rows[0].status, RAVSCORE_WAVE_MOBILISATION_STATUS.MIGRATED_READY);
assert.equal(migrated.rows[0].mobilisationPotential, 67);
assert.equal(migrated.rows[0].rollbackCandidateGMobilisationPotential, 66);
assert.equal(migrated.rows[0].waveReferenceAt, hour(0));
assert.equal(migrated.rows[0].transition, 'MIGRATED_FROM_CANDIDATE_G');

const sameTime = buildRavScoreWaveMobilisationStateSeries([
  sample(0),
], { initialState: migrated.continuationState });
assert.equal(sameTime.rows[0].transition, 'SAME_TIME_HOLD');
assert.equal(sameTime.rows[0].creditedDurationHours, 0);
assert.deepEqual(sameTime.continuationState, migrated.continuationState,
  'reprocessing the same time must be exactly idempotent');
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([
  sample(0, { waveHeightM: 0, wavePeriodS: 0 }),
], { initialState: migrated.continuationState }), /Same-time wave evidence conflicts/,
'a revised same-time wave input must fail closed instead of scoring new weather against old state');

const readyHigh = buildRavScoreWaveMobilisationStateSeries([sample(0)], {
  candidateGMigrationSeed: { time: hour(0), mobilisationPotential: 20 },
});
const immediateMissing = buildRavScoreWaveMobilisationStateSeries([
  sample(1, { waveHeightM: null, wavePeriodS: null }),
], { initialState: readyHigh.continuationState });
assert.equal(immediateMissing.rows[0].readiness, false);
assert.equal(
  immediateMissing.rows[0].status,
  RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT,
);
assert.equal(immediateMissing.rows[0].mobilisationPotential, 20);
assert.equal(immediateMissing.rows[0].creditedDurationHours, 0);
assert.equal(immediateMissing.rows[0].waveReferenceAt, hour(0));
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([], {
  initialState: {
    ...immediateMissing.continuationState,
    waveReferenceAt: immediateMissing.continuationState.time,
  },
}), /readiness and status are inconsistent/,
'MISSING_INPUT may not claim a verified reference at its own missing hour');

for (const [label, overrides] of [
  ['negative wave height', { waveHeightM: -0.01, wavePeriodS: 4 }],
  ['negative wave period', { waveHeightM: 0.4, wavePeriodS: -0.01 }],
  ['positive wave height with zero period', { waveHeightM: 0.4, wavePeriodS: 0 }],
  ['boolean wave height', { waveHeightM: false, wavePeriodS: 4 }],
  ['array wave period', { waveHeightM: 0.4, wavePeriodS: [] }],
  ['blank wave period', { waveHeightM: 0.4, wavePeriodS: '   ' }],
]) {
  const invalid = buildRavScoreWaveMobilisationStateSeries([
    sample(1, overrides),
  ], { initialState: readyHigh.continuationState });
  assert.equal(invalid.rows[0].readiness, false, `${label} must fail closed`);
  assert.equal(
    invalid.rows[0].status,
    RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT,
    `${label} must not be converted to calm-wave evidence`,
  );
  assert.equal(invalid.rows[0].waveEnergyAvailable, false);
  assert.equal(invalid.rows[0].waveEnergyScore, null);
  assert.equal(invalid.rows[0].creditedDurationHours, 0);
  assert.equal(invalid.rows[0].mobilisationPotential, 20,
    `${label} must hold, not build or decay, the derived state`);
}

const physicalWaveZero = buildRavScoreWaveMobilisationStateSeries([
  sample(1, { waveHeightM: 0, wavePeriodS: 0 }),
], { initialState: readyHigh.continuationState });
assert.equal(physicalWaveZero.rows[0].readiness, true,
  'physical zero wave values remain valid calm-wave evidence');
assert.equal(physicalWaveZero.rows[0].waveEnergyScore, 0);

const shortHighReturn = buildRavScoreWaveMobilisationStateSeries([sample(2)], {
  initialState: immediateMissing.continuationState,
});
assert.equal(shortHighReturn.rows[0].readiness, true);
assert.equal(
  shortHighReturn.rows[0].status,
  RAVSCORE_WAVE_MOBILISATION_STATUS.RECOVERED_SHORT_GAP,
);
assert.equal(shortHighReturn.rows[0].creditedDurationHours, 1,
  'an increasing target after a short missing interval may receive at most one hour');
close(
  shortHighReturn.rows[0].mobilisationPotential,
  afterHalfLife(20, 100, 1, RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours),
);

const shortReturnWithoutPlaceholder = buildRavScoreWaveMobilisationStateSeries([sample(2)], {
  initialState: readyHigh.continuationState,
});
assert.equal(shortReturnWithoutPlaceholder.rows[0].creditedDurationHours, 1,
  'an omitted short interval must not turn into unobserved build time');
close(
  shortReturnWithoutPlaceholder.rows[0].mobilisationPotential,
  shortHighReturn.rows[0].mobilisationPotential,
);

const readyForShortDecay = buildRavScoreWaveMobilisationStateSeries([sample(0)], {
  candidateGMigrationSeed: { time: hour(0), mobilisationPotential: 80 },
});
const missingBeforeShortDecay = buildRavScoreWaveMobilisationStateSeries([
  sample(1, { waveHeightM: null, wavePeriodS: null }),
], { initialState: readyForShortDecay.continuationState });
const shortLowReturn = buildRavScoreWaveMobilisationStateSeries([
  sample(2, { waveHeightM: 0, wavePeriodS: 3 }),
], { initialState: missingBeforeShortDecay.continuationState });
assert.equal(shortLowReturn.rows[0].creditedDurationHours, 2,
  'a falling target may conservatively decay over the known short gap');
close(
  shortLowReturn.rows[0].mobilisationPotential,
  afterHalfLife(80, 0, 2, RAVSCORE_WAVE_MOBILISATION_POLICY.decayHalfLifeHours),
);
assert.ok(shortLowReturn.rows[0].mobilisationPotential < 80);

const missingLong = buildRavScoreWaveMobilisationStateSeries([
  sample(1, { waveHeightM: null, wavePeriodS: null }),
  sample(2, { waveHeightM: null, wavePeriodS: null }),
  sample(3, { waveHeightM: null, wavePeriodS: null }),
  sample(4, { waveHeightM: null, wavePeriodS: null }),
], { initialState: readyForShortDecay.continuationState });
const longHighReturn = buildRavScoreWaveMobilisationStateSeries([sample(5)], {
  initialState: missingLong.continuationState,
});
assert.equal(longHighReturn.rows[0].readiness, false);
assert.equal(
  longHighReturn.rows[0].status,
  RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START,
);
assert.equal(longHighReturn.rows[0].transition, 'LONG_GAP_COLD_RESTART');
assert.equal(longHighReturn.rows[0].creditedDurationHours, 0);
assert.equal(longHighReturn.rows[0].mobilisationPotential, 0,
  'the first high sample after a long gap must not inherit stale mobilisation');

const contiguousHighAfterColdRestart = buildRavScoreWaveMobilisationStateSeries([sample(6)], {
  initialState: longHighReturn.continuationState,
});
assert.equal(contiguousHighAfterColdRestart.rows[0].readiness, true);
assert.equal(contiguousHighAfterColdRestart.rows[0].status, RAVSCORE_WAVE_MOBILISATION_STATUS.READY);
close(
  contiguousHighAfterColdRestart.rows[0].mobilisationPotential,
  afterHalfLife(0, 100, 1, RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours),
);

const longLowReturn = buildRavScoreWaveMobilisationStateSeries([
  sample(5, { waveHeightM: 0, wavePeriodS: 3 }),
], { initialState: missingLong.continuationState });
assert.equal(longLowReturn.rows[0].readiness, false);
assert.equal(longLowReturn.rows[0].status, RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START);
assert.equal(longLowReturn.rows[0].transition, 'LONG_GAP_COLD_RESTART');
assert.equal(longLowReturn.rows[0].creditedDurationHours, 0);
assert.equal(longLowReturn.rows[0].mobilisationPotential, 0,
  'a long gap must restart from the cold prior even when the current target is calm');

const noPlaceholderGap = buildRavScoreWaveMobilisationStateSeries([sample(5)], {
  initialState: readyHigh.continuationState,
});
assert.equal(noPlaceholderGap.rows[0].readiness, false);
assert.equal(noPlaceholderGap.rows[0].creditedDurationHours, 0);
assert.equal(noPlaceholderGap.rows[0].mobilisationPotential, 0);
assert.ok(
  noPlaceholderGap.rows[0].rollbackCandidateGMobilisationPotential
    > noPlaceholderGap.rows[0].mobilisationPotential,
  'the isolated rollback field must preserve Candidate G full-gap build semantics',
);

const migrationWithoutTime = buildRavScoreWaveMobilisationStateSeries([sample(0)], {
  candidateGMigrationSeed: { mobilisationPotential: 73 },
});
assert.equal(migrationWithoutTime.rows[0].readiness, true);
assert.equal(migrationWithoutTime.rows[0].transition, 'MIGRATED_FROM_CANDIDATE_G');
assert.equal(migrationWithoutTime.rows[0].mobilisationPotential, 73);
assert.equal(buildRavScoreWaveMobilisationStateSeries([], {
  candidateGMigrationSeed: { mobilisationPotential: 73 },
}).continuationState, null,
'a migration seed alone must not manufacture a ready state without current valid waves');

const migrationMissingFirst = buildRavScoreWaveMobilisationStateSeries([
  sample(0, { waveHeightM: null, wavePeriodS: null }),
], { candidateGMigrationSeed: { mobilisationPotential: 61 } });
assert.equal(migrationMissingFirst.rows[0].readiness, false);
assert.equal(migrationMissingFirst.rows[0].status, RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT);
const migrationFirstValid = buildRavScoreWaveMobilisationStateSeries([sample(1)], {
  initialState: migrationMissingFirst.continuationState,
});
assert.equal(migrationFirstValid.rows[0].readiness, true);
assert.equal(migrationFirstValid.rows[0].transition, 'MIGRATED_FROM_CANDIDATE_G_BUILD');
assert.equal(migrationFirstValid.rows[0].creditedDurationHours, 1);
close(
  migrationFirstValid.rows[0].mobilisationPotential,
  afterHalfLife(61, 100, 1, RAVSCORE_WAVE_MOBILISATION_POLICY.buildHalfLifeHours),
);

const longMissingAfterMigrationSeed = buildRavScoreWaveMobilisationStateSeries([
  sample(24, { waveHeightM: null, wavePeriodS: null }),
], {
  candidateGMigrationSeed: {
    time: hour(0),
    mobilisationPotential: 100,
  },
});
assert.equal(longMissingAfterMigrationSeed.continuationState.migrationSeedAt, hour(0),
  'the original migration time must survive missing rows');
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([
  sample(48, { waveHeightM: 0, wavePeriodS: 3 }),
], {
  initialState: {
    ...longMissingAfterMigrationSeed.continuationState,
    migrationSeedAt: null,
  },
}), /readiness and status are inconsistent/,
'a pending migration continuation may not erase seed age and bypass long-gap cold restart');
const calmAfterLongMigrationGap = buildRavScoreWaveMobilisationStateSeries([
  sample(48, { waveHeightM: 0, wavePeriodS: 3 }),
], { initialState: longMissingAfterMigrationSeed.continuationState });
assert.equal(
  calmAfterLongMigrationGap.rows[0].status,
  RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START,
);
assert.equal(calmAfterLongMigrationGap.rows[0].readiness, false);
assert.equal(calmAfterLongMigrationGap.rows[0].transition, 'MIGRATION_LONG_GAP_COLD_RESTART');
assert.equal(calmAfterLongMigrationGap.rows[0].mobilisationPotential, 0,
  'an old migrated high state must not reappear after an arbitrarily long missing gap');
assert.equal(calmAfterLongMigrationGap.rows[0].creditedDurationHours, 0);

const highAfterLongMigrationGap = buildRavScoreWaveMobilisationStateSeries([
  sample(48),
], { initialState: longMissingAfterMigrationSeed.continuationState });
assert.equal(highAfterLongMigrationGap.rows[0].creditedDurationHours, 0,
  'a seed already at the current target receives no invented build credit');
assert.equal(highAfterLongMigrationGap.rows[0].readiness, false);
assert.equal(highAfterLongMigrationGap.rows[0].status, RAVSCORE_WAVE_MOBILISATION_STATUS.COLD_START);
assert.equal(highAfterLongMigrationGap.rows[0].mobilisationPotential, 0,
  'a matching stale seed must not make the first post-gap sample look causally accumulated');

const lowSeedBeforeLongHighReturn = buildRavScoreWaveMobilisationStateSeries([
  sample(24, { waveHeightM: null, wavePeriodS: null }),
], {
  candidateGMigrationSeed: {
    time: hour(0),
    mobilisationPotential: 20,
  },
});
const boundedHighAfterLongMigrationGap = buildRavScoreWaveMobilisationStateSeries([
  sample(48),
], { initialState: lowSeedBeforeLongHighReturn.continuationState });
assert.equal(boundedHighAfterLongMigrationGap.rows[0].readiness, false);
assert.equal(boundedHighAfterLongMigrationGap.rows[0].creditedDurationHours, 0);
assert.equal(boundedHighAfterLongMigrationGap.rows[0].mobilisationPotential, 0,
  'a long unobserved interval must discard either a low or a high stale seed');

assert.throws(() => buildRavScoreWaveMobilisationStateSeries([sample(0)], {
  initialState: continuous.continuationState,
}), /backwards/);
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([sample(0)], {
  initialState: migrated.continuationState,
  candidateGMigrationSeed: { mobilisationPotential: 50 },
}), /either initialState or candidateGMigrationSeed/);
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([], {
  initialState: { ...continuous.continuationState, unexpected: true },
}), /incompatible exact schema/,
'compact wave continuation must reject unbound extra fields');
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([], {
  initialState: {
    ...continuous.continuationState,
    time: continuous.continuationState.time.replace('.000Z', 'Z'),
    waveReferenceAt: continuous.continuationState.waveReferenceAt.replace('.000Z', 'Z'),
  },
}), /times are not canonical/,
'equivalent but non-canonical wave continuation times must fail closed');
assert.throws(() => buildRavScoreWaveMobilisationStateSeries([sample(1)], {
  initialState: {
    ...migrated.continuationState,
    status: RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT,
  },
}), /readiness and status are inconsistent/);
for (const invalidReadyState of [
  { ...continuous.continuationState, waveReferenceAt: hour(2) },
  { ...continuous.continuationState, waveReferenceAt: hour(0) },
  { ...continuous.continuationState, waveEnergyScore: null },
]) {
  assert.throws(
    () => buildRavScoreWaveMobilisationStateSeries([], { initialState: invalidReadyState }),
    /readiness and status are inconsistent/,
  );
}
const heldMissingContinuation = buildRavScoreWaveMobilisationStateSeries([], {
  initialState: immediateMissing.continuationState,
});
assert.equal(heldMissingContinuation.initialStateSource, 'CONTINUATION');
assert.equal(
  heldMissingContinuation.continuationState.status,
  RAVSCORE_WAVE_MOBILISATION_STATUS.MISSING_INPUT,
);

const compactJson = JSON.stringify(continuous.continuationState).toLowerCase();
for (const forbidden of [
  'waveheight', 'waveperiod', 'currentu', 'currentv', 'latitude', 'longitude',
  'coordinates', 'waterpoint', 'landpoint',
]) {
  assert.equal(compactJson.includes(forbidden), false,
    `compact wave state must not contain ${forbidden}`);
}

console.log('Integrated RavScore wave mobilisation freshness-state test: OK');
