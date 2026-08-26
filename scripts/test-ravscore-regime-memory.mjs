import assert from "node:assert/strict";

import {
  buildBoundedCurrentTransportMemory,
  buildCurrentTransportPotential,
  buildBlendedRegimeMemory,
  buildExponentialRegimeMemory,
  CURRENT_TRANSPORT_POTENTIAL_CONTINUATION_POLICY,
  CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY,
  CURRENT_TRANSPORT_POTENTIAL_PRIOR,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  deriveCurrentTransportEvidence,
  extractReversalEpisodes,
  normalizeMemoryTrackCausally,
  signedDirectionalForce,
  simulateReversalScenario,
  summarizeRegimeReversals,
  summarizeReversalEpisodes,
} from "../js/core/ravscore-regime-memory.js";

assert.deepEqual(CURRENT_TRANSPORT_POTENTIAL_PRIOR, {
  deadbandNormalSpeedMps: 0.05,
  fullStrengthNormalSpeedMps: 0.20,
  inboundPointsPerEffectiveHour: 10,
  outboundPointsPerEffectiveHour: 8,
  exhaustedAfterEffectiveHours: 13,
  preExhaustionMaximumLossPoints: 96,
  neutralPassiveHalfLifeHours: null,
});
assert.deepEqual(CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE, {
  deadbandNormalSpeedMps: 0.03,
  fullStrengthNormalSpeedMps: 0.15,
  inboundPointsPerEffectiveHour: 10,
  outboundPointsPerEffectiveHour: 8,
  exhaustedAfterEffectiveHours: 13,
  preExhaustionMaximumLossPoints: 96,
  neutralPassiveHalfLifeHours: null,
});
assert.equal(CURRENT_TRANSPORT_POTENTIAL_CONTINUATION_POLICY,
  'CARRY_FORWARD_BOUNDED_DERIVED_CURRENT_EVIDENCE');
assert.equal(CURRENT_TRANSPORT_BOUNDED_MEMORY_POLICY.maximumGapHours, 3,
  'bounded memory must accept one native three-hour production step');
assert.deepEqual(deriveCurrentTransportEvidence({
  time: new Date(Date.UTC(2024, 0, 1)).toISOString(),
  currentSpeedMps: null,
  currentAlignment: null,
  currentVerified: true,
}), {
  time: new Date(Date.UTC(2024, 0, 1)).toISOString(),
  strength: null,
}, 'verified provenance without numeric current must remain missing rather than become neutral');

const threeHourlyInboundEvidence = Array.from({ length: 17 }, (_, index) => ({
  time: new Date(Date.UTC(2024, 0, 1) + (index * 3 * 3_600_000)).toISOString(),
  strength: 1,
}));
const threeHourlyInboundMemory = buildBoundedCurrentTransportMemory(threeHourlyInboundEvidence, {
  referenceTime: threeHourlyInboundEvidence.at(-1).time,
});
assert.equal(threeHourlyInboundMemory.memoryReady, true);
assert.equal(threeHourlyInboundMemory.coverageHours, 48);
assert.equal(threeHourlyInboundMemory.maximumObservedGapHours, 3);
assert.equal(threeHourlyInboundMemory.result.transportPotential, 100);

const firstNativeContinuation = buildBoundedCurrentTransportMemory(
  threeHourlyInboundEvidence.slice(0, 2),
  { referenceTime: threeHourlyInboundEvidence[1].time },
);
assert.equal(firstNativeContinuation.memoryReady, false);
assert.equal(firstNativeContinuation.status, 'WINDOW_INCOMPLETE');
assert.equal(firstNativeContinuation.coverageHours, 3);
assert.equal(firstNativeContinuation.result.transportPotential, 30,
  'the first native continuation must integrate its actual three elapsed hours');

const phaseShiftedNativeEvidence = [
  ...threeHourlyInboundEvidence,
  { time: new Date(Date.UTC(2024, 0, 3, 1)).toISOString(), strength: 1 },
];
const phaseShiftedNativeMemory = buildBoundedCurrentTransportMemory(phaseShiftedNativeEvidence, {
  referenceTime: phaseShiftedNativeEvidence.at(-1).time,
});
assert.equal(phaseShiftedNativeMemory.memoryReady, true,
  'a one-hour reference shift must preserve a complete native-cadence window');
assert.equal(phaseShiftedNativeMemory.status, 'READY');
assert.equal(phaseShiftedNativeMemory.coverageHours, 48);
assert.equal(phaseShiftedNativeMemory.maximumObservedGapHours, 3);
assert.equal(phaseShiftedNativeMemory.evidence.length, 18);
assert.equal(phaseShiftedNativeMemory.evidence[0].time, threeHourlyInboundEvidence[0].time,
  'the real compact predecessor must remain available for the next rolling boundary');
assert.equal(phaseShiftedNativeMemory.result.transportPotential, 100);

const rolledPhaseShiftedNativeMemory = buildBoundedCurrentTransportMemory([
  ...phaseShiftedNativeMemory.evidence,
  { time: new Date(Date.UTC(2024, 0, 3, 2)).toISOString(), strength: 1 },
], {
  referenceTime: new Date(Date.UTC(2024, 0, 3, 2)).toISOString(),
});
assert.equal(rolledPhaseShiftedNativeMemory.memoryReady, true,
  'a phase-shifted READY window must stay ready across the next production reference');
assert.equal(rolledPhaseShiftedNativeMemory.status, 'READY');
assert.equal(rolledPhaseShiftedNativeMemory.coverageHours, 48);
assert.equal(rolledPhaseShiftedNativeMemory.evidence[0].time, threeHourlyInboundEvidence[0].time,
  'the predecessor is persisted only as compact continuity evidence, not replayed as a new sample');

const fourHourGapEvidence = Array.from({ length: 49 }, (_, index) => ({
  time: new Date(Date.UTC(2024, 0, 1) + (index * 3_600_000)).toISOString(),
  strength: 1,
})).filter((_, index) => ![24, 25, 26].includes(index));
const fourHourGapMemory = buildBoundedCurrentTransportMemory(fourHourGapEvidence, {
  referenceTime: fourHourGapEvidence.at(-1).time,
});
assert.equal(fourHourGapMemory.memoryReady, false);
assert.equal(fourHourGapMemory.status, 'WINDOW_HAS_TIME_GAP');
assert.equal(fourHourGapMemory.maximumObservedGapHours, 4,
  'a missed native production step must remain a real fail-closed gap');

const strongOutbound = Array.from({ length: 14 }, (_, hour) => ({
  time: new Date(Date.UTC(2024, 0, 1, hour)).toISOString(),
  currentSpeedMps: 0.2,
  currentAlignment: -1,
  currentVerified: true,
}));
const strongOutboundTrack = buildCurrentTransportPotential(strongOutbound, {
  initialPotential: 100,
  isVerified: sample => sample.currentVerified,
});
assert.deepEqual(
  strongOutboundTrack.map(record => record.transportPotential),
  [100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4, 0],
  'Kraftig udgående strøm skal reducere transportpotentialet otte point pr. time og nå nul fra time 13',
);
assert.equal(strongOutboundTrack[1].phase, 'OUTBOUND_EROSION');
assert.equal(strongOutboundTrack[12].actualOutboundTransport, false);
assert.equal(strongOutboundTrack[13].phase, 'OUTBOUND_TRANSPORT');
assert.equal(strongOutboundTrack[13].actualOutboundTransport, true);

const outboundFirstRun = strongOutboundTrack.slice(0, 7);
const outboundContinuation = buildCurrentTransportPotential(strongOutbound.slice(7), {
  initialState: outboundFirstRun.at(-1),
  isVerified: sample => sample.currentVerified,
});
assert.deepEqual(
  outboundContinuation.map(record => record.transportPotential),
  strongOutboundTrack.slice(7).map(record => record.transportPotential),
  'En ny pipelinekørsel skal kunne fortsætte den afledte udtransportstilstand uden spring',
);
assert.deepEqual(
  outboundContinuation.map(record => record.outboundEpisodeEffectiveHours),
  strongOutboundTrack.slice(7).map(record => record.outboundEpisodeEffectiveHours),
);
assert.equal(outboundContinuation.at(-1).actualOutboundTransport, true);

const neutralContinuation = buildCurrentTransportPotential([
  {
    time: new Date(Date.UTC(2024, 0, 2, 14)).toISOString(),
    currentSpeedMps: 0,
    currentAlignment: 0,
    currentVerified: true,
  },
], {
  initialState: strongOutboundTrack[6],
  isVerified: sample => sample.currentVerified,
});
assert.equal(neutralContinuation[0].transportPotential, strongOutboundTrack[6].transportPotential);
assert.equal(neutralContinuation[0].outboundEpisodeEffectiveHours,
  strongOutboundTrack[6].outboundEpisodeEffectiveHours);
assert.throws(() => buildCurrentTransportPotential(strongOutbound, {
  initialState: { time: 'invalid', transportPotential: 50, outboundEpisodeEffectiveHours: 2 },
}));
assert.throws(() => buildCurrentTransportPotential(strongOutbound, {
  initialState: { time: strongOutbound[0].time, transportPotential: null, outboundEpisodeEffectiveHours: 2 },
}));
assert.throws(() => buildCurrentTransportPotential(strongOutbound, {
  initialState: { time: strongOutbound[1].time, transportPotential: 50, outboundEpisodeEffectiveHours: 2 },
}));

const halfStrengthOutboundTrack = buildCurrentTransportPotential(
  strongOutbound.map(sample => ({ ...sample, currentSpeedMps: 0.125 })),
  { initialPotential: 100, isVerified: sample => sample.currentVerified },
);
assert.ok(Math.abs(halfStrengthOutboundTrack[1].outboundStrength - 0.5) < 1e-12);
assert.equal(halfStrengthOutboundTrack[1].transportPotential, 96);
assert.equal(halfStrengthOutboundTrack[13].transportPotential, 48);

const deadbandOutboundTrack = buildCurrentTransportPotential(
  strongOutbound.map(sample => ({ ...sample, currentSpeedMps: 0.05 })),
  { initialPotential: 100, isVerified: sample => sample.currentVerified },
);
assert.ok(deadbandOutboundTrack.every(record => record.transportPotential === 100));

const recoveryTrack = buildCurrentTransportPotential([
  ...strongOutbound.slice(0, 4),
  ...Array.from({ length: 4 }, (_, offset) => ({
    time: new Date(Date.UTC(2024, 0, 1, 4 + offset)).toISOString(),
    currentSpeedMps: 0.2,
    currentAlignment: 1,
    currentVerified: true,
  })),
], { initialPotential: 100, isVerified: sample => sample.currentVerified });
assert.equal(recoveryTrack[3].transportPotential, 76);
assert.deepEqual(recoveryTrack.slice(4).map(record => record.transportPotential), [86, 96, 100, 100]);
assert.equal(recoveryTrack[4].outboundEpisodeEffectiveHours, 0);
assert.equal(recoveryTrack[4].phase, 'INBOUND_BUILDUP');

const tenHourInboundBuildTrack = buildCurrentTransportPotential(
  Array.from({ length: 11 }, (_, hour) => ({
    time: new Date(Date.UTC(2024, 0, 2, hour)).toISOString(),
    currentSpeedMps: 0.2,
    currentAlignment: 1,
    currentVerified: true,
  })),
  { initialPotential: 0, isVerified: sample => sample.currentVerified },
);
assert.deepEqual(
  tenHourInboundBuildTrack.map(record => record.transportPotential),
  [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
);

const unverifiedPauseTrack = buildCurrentTransportPotential([
  strongOutbound[0],
  { ...strongOutbound[1], currentVerified: false },
], { initialPotential: 100, isVerified: sample => sample.currentVerified });
assert.equal(unverifiedPauseTrack[1].transportPotential, 100);
assert.equal(unverifiedPauseTrack[1].phase, 'UNVERIFIED_PAUSE');

const neutralSamples = [0, 24, 48].map(hour => ({
  time: new Date(Date.UTC(2024, 0, 3, hour)).toISOString(),
  currentSpeedMps: 0.2,
  currentAlignment: 0,
  currentVerified: true,
}));
const neutralHalfLife24Track = buildCurrentTransportPotential(neutralSamples, {
  initialPotential: 100,
  neutralPassiveHalfLifeHours: 24,
  isVerified: sample => sample.currentVerified,
});
assert.deepEqual(neutralHalfLife24Track.map(record => record.transportPotential), [100, 50, 25]);
assert.equal(neutralHalfLife24Track[1].phase, 'PASSIVE_NEUTRAL_DECAY');
assert.equal(neutralHalfLife24Track[1].neutralPassiveDecayPoints, 50);

const neutralHalfLife48Track = buildCurrentTransportPotential(neutralSamples, {
  initialPotential: 100,
  neutralPassiveHalfLifeHours: 48,
  isVerified: sample => sample.currentVerified,
});
assert.ok(Math.abs(neutralHalfLife48Track[1].transportPotential - Math.sqrt(0.5) * 100) < 1e-9);
assert.ok(Math.abs(neutralHalfLife48Track[2].transportPotential - 50) < 1e-9);

const missingDoesNotDecayTrack = buildCurrentTransportPotential([
  neutralSamples[0],
  { ...neutralSamples[1], currentVerified: false },
], {
  initialPotential: 100,
  neutralPassiveHalfLifeHours: 24,
  isVerified: sample => sample.currentVerified,
});
assert.equal(missingDoesNotDecayTrack[1].transportPotential, 100);

const outboundWithPassiveSensitivity = buildCurrentTransportPotential(strongOutbound, {
  initialPotential: 100,
  neutralPassiveHalfLifeHours: 24,
  isVerified: sample => sample.currentVerified,
});
assert.deepEqual(
  outboundWithPassiveSensitivity.map(record => record.transportPotential),
  strongOutboundTrack.map(record => record.transportPotential),
  'Passiv neutral forældelse må ikke ændre den godkendte udtransportkurve',
);
assert.throws(() => buildCurrentTransportPotential(strongOutbound, {
  deadbandNormalSpeedMps: 0.2,
  fullStrengthNormalSpeedMps: 0.2,
}));
assert.throws(() => buildCurrentTransportPotential(strongOutbound, {
  neutralPassiveHalfLifeHours: 0,
}));

assert.equal(signedDirectionalForce({ magnitude: 0.4, alignment: 0.5 }), 0.2);
assert.equal(signedDirectionalForce({ magnitude: 10, alignment: -0.5, power: 2 }), -50);
assert.equal(signedDirectionalForce({ magnitude: -3, alignment: 2 }), 0);

const start = Date.UTC(2024, 0, 1);
const records = buildExponentialRegimeMemory([
  ...Array.from({ length: 24 }, (_, index) => ({
    time: new Date(start + (index * 3_600_000)).toISOString(),
    force: 1,
  })),
  { time: new Date(start + (24 * 3_600_000)).toISOString(), force: -0.25 },
], { halfLifeHours: 12 });

assert.ok(records[23].state > 0.7, "a sustained inbound regime must build positive memory");
assert.ok(records[24].state > 0, "one weak outbound hour must not erase the inbound regime");
assert.equal(records[24].stateFlipped, false);

const weakShort = simulateReversalScenario({
  halfLifeHours: 24,
  reversalHours: 1,
  reversalForce: 0.25,
});
const strongShort = simulateReversalScenario({
  halfLifeHours: 24,
  reversalHours: 1,
  reversalForce: 2,
});
const strongLong = simulateReversalScenario({
  halfLifeHours: 24,
  reversalHours: 24,
  reversalForce: 2,
});

assert.equal(weakShort.flipped, false);
assert.equal(strongShort.flipped, false);
assert.ok(strongShort.stateAfterReversal < weakShort.stateAfterReversal);
assert.equal(strongLong.flipped, true);
assert.ok(strongLong.hoursUntilFlip > 1);

const reversalSummary = summarizeRegimeReversals(records, { warmupSamples: 12 });
assert.equal(reversalSummary.reversalCount, 1);
assert.equal(reversalSummary.classes["weak-under-half"].count, 1);
assert.equal(reversalSummary.stateFlipCount, 0);
assert.ok(reversalSummary.classes["weak-under-half"].medianImmediateStateChangePercent > 0);
assert.ok(reversalSummary.classes["weak-under-half"].p90ImmediateStateChangePercent > 0);

const episodes = extractReversalEpisodes(records, { warmupSamples: 12 });
const episodeSummary = summarizeReversalEpisodes(episodes);
assert.equal(episodeSummary.episodeCount, 1);
assert.equal(episodeSummary.stateFlipCount, 0);
assert.equal(episodeSummary.medianDurationHours, 1);
assert.equal(episodeSummary.classes["weak-under-half"].count, 1);

const trackSamples = [
  ...Array.from({ length: 48 }, (_, index) => ({
    time: new Date(start + (index * 3_600_000)).toISOString(),
    force: 1,
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    time: new Date(start + ((48 + index) * 3_600_000)).toISOString(),
    force: -2,
  })),
];
const activeOnly = buildBlendedRegimeMemory(trackSamples, { activeWeight: 1 });
const backgroundOnly = buildBlendedRegimeMemory(trackSamples, { activeWeight: 0 });
const balanced = buildBlendedRegimeMemory(trackSamples, { activeWeight: 0.5 });
assert.equal(activeOnly.length, trackSamples.length);
assert.equal(activeOnly.at(-1).blendedState, activeOnly.at(-1).activeState);
assert.equal(backgroundOnly.at(-1).blendedState, backgroundOnly.at(-1).backgroundState);
assert.ok(
  balanced.at(-1).blendedState >= Math.min(activeOnly.at(-1).blendedState, backgroundOnly.at(-1).blendedState)
    && balanced.at(-1).blendedState <= Math.max(activeOnly.at(-1).blendedState, backgroundOnly.at(-1).blendedState),
);

const normalizedPrefix = normalizeMemoryTrackCausally(balanced);
const extended = buildBlendedRegimeMemory([
  ...trackSamples,
  { time: new Date(start + (60 * 3_600_000)).toISOString(), force: 100 },
], { activeWeight: 0.5 });
const normalizedExtended = normalizeMemoryTrackCausally(extended);
assert.deepEqual(
  normalizedExtended.slice(0, normalizedPrefix.length),
  normalizedPrefix,
  "future samples must not change earlier memory or normalization",
);
assert.ok(normalizedPrefix.every((record) => Math.abs(record.boundedState) < 1));
const floorNormalized = normalizeMemoryTrackCausally(balanced, {
  initialScale: 10,
  minimumScale: 10,
});
assert.ok(floorNormalized.every(record => record.causalScale >= 10));
assert.throws(() => buildBlendedRegimeMemory(trackSamples, { activeWeight: 1.1 }));
assert.throws(() => normalizeMemoryTrackCausally(balanced, { initialScale: 0 }));
assert.throws(() => normalizeMemoryTrackCausally(balanced, { minimumScale: 0 }));

console.log("OK: regime memory preserves prior transport through weak reversals and responds to sustained strong reversals.");
