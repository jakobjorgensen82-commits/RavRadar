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

const nativeThreeHourlyWindow = buildCandidateGDerivedStateSeries(
  Array.from({ length: 17 }, (_, index) => sample(index * 3)),
  { stateKey: 'sha256:native-three-hour-window' },
);
assert.equal(nativeThreeHourlyWindow.rows[1].transportPotential, 30,
  'the native three-hour continuation must not collapse to a zero-duration sample');
assert.equal(nativeThreeHourlyWindow.rows.at(-1).transportMemoryReady, true);
assert.equal(nativeThreeHourlyWindow.rows.at(-1).transportMemoryStatus, 'READY');
assert.equal(nativeThreeHourlyWindow.rows.at(-1).transportMemoryCoverageHours, 48);
assert.equal(nativeThreeHourlyWindow.rows.at(-1).transportPotential, 100);
assert.equal(nativeThreeHourlyWindow.continuationState.transportEvidence.length, 17);

const nativeFirstRun = buildCandidateGDerivedStateSeries(
  Array.from({ length: 9 }, (_, index) => sample(index * 3)),
  { stateKey: 'sha256:native-three-hour-window' },
);
const nativeSecondRun = buildCandidateGDerivedStateSeries(
  Array.from({ length: 9 }, (_, index) => sample((index + 8) * 3)),
  {
    stateKey: 'sha256:native-three-hour-window',
    initialState: nativeFirstRun.continuationState,
  },
);
assert.equal(nativeSecondRun.initialStateAccepted, true);
assert.deepEqual(nativeSecondRun.continuationState, nativeThreeHourlyWindow.continuationState,
  'split and continuous native-cadence replays must be identical');

const nativeReferencePhaseShift = buildCandidateGDerivedStateSeries([
  sample(49),
], {
  stateKey: 'sha256:native-three-hour-window',
  initialState: nativeThreeHourlyWindow.continuationState,
});
assert.equal(nativeReferencePhaseShift.initialStateAccepted, true);
assert.equal(nativeReferencePhaseShift.rows[0].transportMemoryReady, true,
  'a verified reference between native three-hour boundaries must retain READY memory');
assert.equal(nativeReferencePhaseShift.rows[0].transportMemoryStatus, 'READY');
assert.equal(nativeReferencePhaseShift.rows[0].transportMemoryCoverageHours, 48);
assert.equal(nativeReferencePhaseShift.rows[0].transportEvidence.length, 17);
assert.equal(nativeReferencePhaseShift.rows[0].transportEvidence[0].time, hour(3),
  'the phase shift must retain only real compact evidence');

const nativeReferenceBootstrap = buildCandidateGDerivedStateSeries([
  sample(52, { currentSpeedMps: null, currentAlignment: null, currentVerified: false }),
], {
  stateKey: 'sha256:native-three-hour-window',
  initialState: nativeThreeHourlyWindow.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: sample(51),
});
assert.equal(nativeReferenceBootstrap.initialStateAccepted, true);
assert.equal(nativeReferenceBootstrap.rows[0].currentTransition, 'NATIVE_CADENCE_HOLD');
assert.equal(nativeReferenceBootstrap.rows[0].transportReferenceAt, hour(51));
assert.equal(nativeReferenceBootstrap.rows[0].transportMemoryReady, true);
assert.equal(nativeReferenceBootstrap.rows[0].transportPotential, 100);
assert.equal(nativeReferenceBootstrap.rows[0].transportEvidence.at(-1).time, hour(51));
assert.ok(nativeReferenceBootstrap.rows[0].transportEvidence.every(item =>
  Object.keys(item).sort().join(',') === 'strength,time'),
'the exact native reference must immediately be reduced to data-minimised transport evidence');
assert.throws(() => buildCandidateGDerivedStateSeries([
  sample(56, { currentSpeedMps: null, currentAlignment: null, currentVerified: false }),
], {
  stateKey: 'sha256:native-three-hour-window',
  initialState: nativeThreeHourlyWindow.continuationState,
  nativeCadenceHoldHours: 3,
  nativeCadenceReferenceSample: sample(51),
}), /one exact verified sample within the allowed hold/,
'a reference older than one native step must fail closed');

const nativeCadenceHourlySamples = Array.from({ length: 52 }, (_, index) => sample(index, index % 3 === 0
  ? {
    currentSpeedMps: index === 51 ? 0.15 : 0,
    currentAlignment: index === 51 ? 1 : 0,
  }
  : { currentSpeedMps: null, currentAlignment: null, currentVerified: false }));
const nativeCadenceHourly = buildCandidateGDerivedStateSeries(nativeCadenceHourlySamples, {
  stateKey: 'sha256:native-cadence-hourly',
  nativeCadenceHoldHours: 3,
});
assert.equal(nativeCadenceHourly.rows[48].transportMemoryReady, true);
assert.equal(nativeCadenceHourly.rows[49].currentTransition, 'NATIVE_CADENCE_HOLD');
assert.equal(nativeCadenceHourly.rows[50].currentTransition, 'NATIVE_CADENCE_HOLD');
assert.equal(nativeCadenceHourly.rows[50].transportReferenceAt, hour(48));
assert.equal(nativeCadenceHourly.rows[50].transportPotential, 0,
  'native-cadence hold must add no invented transport');
assert.equal(nativeCadenceHourly.rows[51].transportPotential, 30,
  'the next native sample must integrate its actual three-hour elapsed time');
assert.equal(nativeCadenceHourly.rows[51].transportEvidence.length, 17,
  'hourly placeholders must not enter the native three-hour evidence window');

const nativeCadenceFirstRun = buildCandidateGDerivedStateSeries(nativeCadenceHourlySamples.slice(0, 50), {
  stateKey: 'sha256:native-cadence-hourly',
  nativeCadenceHoldHours: 3,
});
const nativeCadenceSecondRun = buildCandidateGDerivedStateSeries(nativeCadenceHourlySamples.slice(50), {
  stateKey: 'sha256:native-cadence-hourly',
  initialState: nativeCadenceFirstRun.continuationState,
  nativeCadenceHoldHours: 3,
});
assert.equal(nativeCadenceSecondRun.initialStateAccepted, true);
assert.deepEqual(nativeCadenceSecondRun.rows, nativeCadenceHourly.rows.slice(50),
  'a held transport reference must survive a production-run boundary');

const missedNativeStep = buildCandidateGDerivedStateSeries([
  ...nativeCadenceHourlySamples.slice(0, 49),
  ...[49, 50, 51, 52].map(index => sample(index, {
    currentSpeedMps: null,
    currentAlignment: null,
    currentVerified: false,
  })),
], {
  stateKey: 'sha256:missed-native-step',
  nativeCadenceHoldHours: 3,
});
assert.equal(missedNativeStep.rows[52].currentTransition, 'UNVERIFIED_PAUSE');
assert.equal(missedNativeStep.rows[52].transportMemoryReady, false,
  'a real gap beyond one native step must fail closed');

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
  'transportReferenceAt',
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
