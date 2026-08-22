import assert from "node:assert/strict";

import {
  buildBlendedRegimeMemory,
  buildExponentialRegimeMemory,
  extractReversalEpisodes,
  normalizeMemoryTrackCausally,
  signedDirectionalForce,
  simulateReversalScenario,
  summarizeRegimeReversals,
  summarizeReversalEpisodes,
} from "../js/core/ravscore-regime-memory.js";

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
assert.throws(() => buildBlendedRegimeMemory(trackSamples, { activeWeight: 1.1 }));
assert.throws(() => normalizeMemoryTrackCausally(balanced, { initialScale: 0 }));

console.log("OK: regime memory preserves prior transport through weak reversals and responds to sustained strong reversals.");
