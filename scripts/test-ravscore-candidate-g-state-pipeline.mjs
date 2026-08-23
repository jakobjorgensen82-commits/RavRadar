import assert from 'node:assert/strict';
import {
  buildCandidateGDerivedStateSeries,
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';

const hour = index => new Date(Date.UTC(2026, 7, 23, index)).toISOString();
const sample = (index, overrides = {}) => ({
  time: hour(index),
  currentSpeedMps: 0.15,
  currentAlignment: 1,
  currentVerified: true,
  waveHeightM: 1,
  wavePeriodS: 7,
  ...overrides,
});

const stateKey = 'sha256:test-part-context';
const sequence = [
  sample(0),
  sample(1),
  sample(2, { currentAlignment: -1, waveHeightM: 2, wavePeriodS: 8 }),
  sample(3, { currentAlignment: -1, waveHeightM: 2, wavePeriodS: 8 }),
];

const continuous = buildCandidateGDerivedStateSeries(sequence, { stateKey });
const firstHalf = buildCandidateGDerivedStateSeries(sequence.slice(0, 2), { stateKey });
const secondHalf = buildCandidateGDerivedStateSeries(sequence.slice(2), {
  stateKey,
  initialState: firstHalf.continuationState,
});
assert.equal(secondHalf.initialStateAccepted, true);
assert.deepEqual(secondHalf.rows, continuous.rows.slice(2), 'split and continuous runs must be identical');
assert.deepEqual(secondHalf.continuationState, continuous.continuationState);

const sameHour = buildCandidateGDerivedStateSeries([sequence[1]], {
  stateKey,
  initialState: firstHalf.continuationState,
});
assert.equal(sameHour.initialStateAccepted, true);
assert.equal(sameHour.rows[0].transportPotential, firstHalf.continuationState.transportPotential);
assert.equal(sameHour.rows[0].mobilisationPotential, firstHalf.continuationState.mobilisationPotential);
assert.equal(sameHour.rows[0].waveMobilisationTransition, 'same-time-hold');
assert.equal(sameHour.rows[0].currentTransition, 'SAME_TIME_HOLD');

const sameHourReversal = buildCandidateGDerivedStateSeries([
  sample(3, { currentAlignment: 1 }),
], {
  stateKey,
  initialState: secondHalf.continuationState,
});
assert.equal(sameHourReversal.rows[0].outboundEpisodeEffectiveHours, secondHalf.continuationState.outboundEpisodeEffectiveHours);
assert.equal(sameHourReversal.rows[0].transportPotential, secondHalf.continuationState.transportPotential);
assert.equal(sameHourReversal.rows[0].currentTransition, 'SAME_TIME_HOLD');

const changedContext = buildCandidateGDerivedStateSeries([sample(4)], {
  stateKey: 'sha256:changed-part-context',
  initialState: secondHalf.continuationState,
});
assert.equal(changedContext.initialStateAccepted, false);
assert.equal(changedContext.initialStateResetReason, 'COASTAL_PART_CONTEXT_CHANGED');
assert.equal(changedContext.rows[0].transportPotential, 0);

const changedVariant = buildCandidateGDerivedStateSeries([sample(4)], {
  stateKey,
  initialState: {
    ...secondHalf.continuationState,
    variantId: 'G-RETIRED-VARIANT',
  },
});
assert.equal(changedVariant.initialStateAccepted, false);
assert.equal(changedVariant.initialStateResetReason, 'VARIANT_CHANGED');
assert.equal(changedVariant.rows[0].transportPotential, 0);

const missing = buildCandidateGDerivedStateSeries([
  sample(4, {
    currentSpeedMps: null,
    currentAlignment: null,
    currentVerified: false,
    waveHeightM: null,
    wavePeriodS: null,
  }),
], {
  stateKey,
  initialState: secondHalf.continuationState,
});
assert.equal(missing.rows[0].transportPotential, secondHalf.continuationState.transportPotential);
assert.equal(missing.rows[0].mobilisationPotential, secondHalf.continuationState.mobilisationPotential);
assert.equal(missing.rows[0].currentTransition, 'UNVERIFIED_PAUSE');
assert.equal(missing.rows[0].waveMobilisationTransition, 'missing-hold');

const threshold = buildCandidateGDerivedStateSeries([
  sample(0, { currentSpeedMps: 0.03 }),
  sample(1, { currentSpeedMps: 0.03 }),
  sample(2, { currentSpeedMps: 0.15 }),
], { stateKey: 'sha256:threshold-profile' });
assert.equal(threshold.rows[1].transportPotential, 0, '0.03 m/s is the neutral deadband');
assert.equal(threshold.rows[2].transportPotential, 10, '0.15 m/s gives ten inbound points per hour');

const fullInboundWindow = buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => sample(index)),
  { stateKey: 'sha256:full-inbound-window' },
);
assert.equal(fullInboundWindow.rows.at(-1).transportMemoryReady, true);
assert.equal(fullInboundWindow.rows.at(-1).transportMemoryStatus, 'READY');
assert.equal(fullInboundWindow.rows.at(-1).transportMemoryCoverageHours, 48);
assert.equal(fullInboundWindow.rows.at(-1).transportPotential, 100);
assert.equal(fullInboundWindow.continuationState.transportEvidence.length, 49);

const neutralWindow = buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => sample(index, {
    currentSpeedMps: 0,
    currentAlignment: 0,
  })),
  { stateKey: 'sha256:full-neutral-window' },
);
assert.equal(neutralWindow.rows.at(-1).transportMemoryReady, true);
assert.equal(neutralWindow.rows.at(-1).transportPotential, 0);

const continuedFromAlteredOutputs = [0, 50, 100].map(transportPotential =>
  buildCandidateGDerivedStateSeries([sample(49, {
    currentSpeedMps: 0,
    currentAlignment: 0,
  })], {
    stateKey: 'sha256:full-inbound-window',
    initialState: {
      ...fullInboundWindow.continuationState,
      transportPotential,
      outboundEpisodeEffectiveHours: transportPotential === 100 ? 12 : 0,
    },
  }));
assert.ok(continuedFromAlteredOutputs.every(result => result.initialStateAccepted));
assert.equal(new Set(continuedFromAlteredOutputs.map(result =>
  result.rows[0].transportPotential)).size, 1,
'a complete bounded window must ignore persisted transport output and replay only its evidence');
assert.equal(new Set(continuedFromAlteredOutputs.map(result =>
  result.rows[0].outboundEpisodeEffectiveHours)).size, 1,
'a complete bounded window must rebuild the outbound episode from evidence');

const missingInsideWindow = buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => sample(index, index === 24 ? {
    currentSpeedMps: null,
    currentAlignment: null,
    currentVerified: false,
  } : {})),
  { stateKey: 'sha256:missing-inside-window' },
);
assert.equal(missingInsideWindow.rows.at(-1).transportMemoryReady, false);
assert.equal(missingInsideWindow.rows.at(-1).transportMemoryStatus, 'WINDOW_HAS_MISSING_EVIDENCE');

const twelveHourOutbound = buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => sample(index, index >= 37
    ? { currentAlignment: -1 }
    : { currentAlignment: 1 })),
  { stateKey: 'sha256:twelve-hour-outbound' },
);
assert.equal(twelveHourOutbound.rows.at(-1).transportMemoryReady, true);
assert.equal(twelveHourOutbound.rows.at(-1).transportPotential, 4);
assert.equal(twelveHourOutbound.rows.at(-1).actualOutboundTransport, false);

const thirteenHourOutbound = buildCandidateGDerivedStateSeries(
  Array.from({ length: 49 }, (_, index) => sample(index, index >= 36
    ? { currentAlignment: -1 }
    : { currentAlignment: 1 })),
  { stateKey: 'sha256:thirteen-hour-outbound' },
);
assert.equal(thirteenHourOutbound.rows.at(-1).transportMemoryReady, true);
assert.equal(thirteenHourOutbound.rows.at(-1).transportPotential, 0);
assert.equal(thirteenHourOutbound.rows.at(-1).actualOutboundTransport, true);

const compact = secondHalf.continuationState;
assert.equal(compact.schemaVersion, CANDIDATE_G_STATE_SCHEMA_VERSION);
assert.equal(compact.modelId, CANDIDATE_G_STATE_MODEL_ID);
assert.equal(compact.profileId, CANDIDATE_G_STATE_PROFILE_ID);
assert.deepEqual(Object.keys(compact).sort(), [
  'mobilisationPotential',
  'modelId',
  'outboundEpisodeEffectiveHours',
  'profileId',
  'schemaVersion',
  'stateKey',
  'time',
  'transportEvidence',
  'transportMemoryCoverageHours',
  'transportMemoryReady',
  'transportMemoryStatus',
  'transportMemoryWindowHours',
  'transportPotential',
  'variantId',
].sort());
assert.ok(compact.transportEvidence.every(item => Object.keys(item).sort().join(',') === 'strength,time'));
const serialized = JSON.stringify(compact).toLowerCase();
for (const forbidden of [
  'currentu', 'currentv', 'windspeed', 'waveheight', 'waveperiod',
  'latitude', 'longitude', 'waterpoint', 'landpoint', 'coordinates',
]) {
  assert.equal(serialized.includes(forbidden), false, `compact state must not contain ${forbidden}`);
}

console.log('Candidate G central state-pipeline test: OK');
