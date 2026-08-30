import assert from 'node:assert/strict';

import {
  CURRENT_SUPPLY_MEMORY_POLICY,
  buildCurrentSupplyMemory,
  buildCurrentSupplyScoreBounds,
  currentSupplyAgePrimitive,
  currentSupplyAgeWeight,
  currentSupplyStrength,
  currentSupplyWeightedDuration,
  deriveCurrentSupplyEvidence,
  replayCurrentSupplyEvidence,
} from '../js/core/ravscore-current-supply-memory.js';
import { canonicalRavScoreTime } from '../js/core/ravscore-time.js';

const HOUR_MS = 3_600_000;
const REFERENCE_MS = Date.parse('2026-08-29T12:00:00.000Z');
const REFERENCE_TIME = new Date(REFERENCE_MS).toISOString();
const BOUNDARY_MS = REFERENCE_MS - 48 * HOUR_MS;
const atElapsedHour = hour => new Date(BOUNDARY_MS + hour * HOUR_MS).toISOString();
const close = (actual, expected, tolerance = 1e-10) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
};

function regularEvidence(stepHours, strengthForEnd = () => 0) {
  const evidence = [];
  for (let hour = 0; hour <= 48; hour += stepHours) {
    evidence.push({ time: atElapsedHour(hour), strength: strengthForEnd(hour) });
  }
  return evidence;
}

assert.equal(CURRENT_SUPPLY_MEMORY_POLICY.maximumRetainedEvidencePoints, 49);
assert.equal(CURRENT_SUPPLY_MEMORY_POLICY.expectedEvidenceIntervalHours, 1);
assert.equal(CURRENT_SUPPLY_MEMORY_POLICY.inboundPointsPerEffectiveHour, 10);
assert.equal(CURRENT_SUPPLY_MEMORY_POLICY.outboundPointsPerEffectiveHour, 8);
assert.equal(currentSupplyStrength(0.03), 0);
assert.equal(currentSupplyStrength(-0.03), 0);
assert.equal(currentSupplyStrength(0.15), 1);
assert.equal(currentSupplyStrength(-0.15), -1);
close(currentSupplyStrength(0.09), 0.5);
close(currentSupplyStrength(-0.09), -0.5);
assert.equal(currentSupplyStrength(null), null);
assert.deepEqual(
  deriveCurrentSupplyEvidence({
    time: REFERENCE_TIME,
    coastNormalSpeedMps: 0.09,
    verified: true,
  }),
  { time: REFERENCE_TIME, strength: 0.5 },
);
assert.deepEqual(
  deriveCurrentSupplyEvidence({
    time: REFERENCE_TIME,
    coastNormalSpeedMps: 0.09,
    verified: false,
  }),
  { time: REFERENCE_TIME, strength: null },
);
assert.equal(deriveCurrentSupplyEvidence({ time: null, verified: true }), null);
assert.equal(deriveCurrentSupplyEvidence({
  time: '2026-08-29T12:00:00',
  coastNormalSpeedMps: 0.09,
  verified: true,
}), null, 'timezone-free current evidence must fail closed');
for (const malformedTime of [
  '2026-02-30T12:00:00Z',
  '2026-08-29T24:00:00Z',
  '2026-08-29T12:00Z',
  '2026-08-29 12:00:00Z',
]) {
  assert.equal(canonicalRavScoreTime(malformedTime), null,
    `${malformedTime} must not be normalized into a different evidence instant`);
  assert.equal(deriveCurrentSupplyEvidence({
    time: malformedTime,
    coastNormalSpeedMps: 0.09,
    verified: true,
  }), null, `${malformedTime} current evidence must fail closed`);
}
assert.equal(
  canonicalRavScoreTime('2028-02-29T13:00:00+01:00'),
  '2028-02-29T12:00:00.000Z',
  'a valid leap-day instant with an explicit offset must remain supported',
);
assert.throws(() => buildCurrentSupplyMemory(regularEvidence(1), {
  referenceTime: '2026-08-29T12:00:00',
}), /valid referenceTime/,
'timezone-free current-memory references must fail closed');

assert.equal(currentSupplyAgeWeight(0), 1);
assert.equal(currentSupplyAgeWeight(24), 1);
close(currentSupplyAgeWeight(36), 0.5);
assert.equal(currentSupplyAgeWeight(48), 0);
assert.equal(currentSupplyAgePrimitive(0), 0);
assert.equal(currentSupplyAgePrimitive(24), 24);
close(currentSupplyAgePrimitive(36), 30 + 12 / Math.PI);
assert.equal(currentSupplyAgePrimitive(48), 36);
close(currentSupplyWeightedDuration({
  intervalStart: atElapsedHour(0),
  intervalEnd: REFERENCE_TIME,
  referenceTime: REFERENCE_TIME,
}), 36);

const oneHour = buildCurrentSupplyMemory(regularEvidence(1, () => 0.1), {
  referenceTime: REFERENCE_TIME,
});
const threeHourEvidence = regularEvidence(3, () => 0.1);
const unattestedThreeHour = buildCurrentSupplyMemory(threeHourEvidence, {
  referenceTime: REFERENCE_TIME,
});
const threeHourIntervalEnds = threeHourEvidence.slice(1).map(item => item.time);
const threeHour = buildCurrentSupplyMemory(threeHourEvidence, {
  referenceTime: REFERENCE_TIME,
  nativeHoldIntervalEnds: threeHourIntervalEnds,
});
assert.equal(oneHour.memoryReady, true);
assert.equal(unattestedThreeHour.memoryReady, false);
assert.equal(unattestedThreeHour.status, 'WINDOW_HAS_TIME_GAP');
assert.equal(threeHour.memoryReady, true);
assert.deepEqual(threeHour.nativeHoldIntervalEnds, threeHourIntervalEnds);
close(oneHour.supplyPotential, 36);
close(threeHour.supplyPotential, 36);
close(oneHour.supplyPotential, threeHour.supplyPotential);
const unattestedThreeHourBounds = buildCurrentSupplyScoreBounds(threeHourEvidence, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(unattestedThreeHourBounds.quality, 'HISTORY_INCOMPLETE');
assert.equal(unattestedThreeHourBounds.coverageHours, 16);
assert.equal(unattestedThreeHourBounds.unknownHours, 32);
const attestedThreeHourBounds = buildCurrentSupplyScoreBounds(threeHourEvidence, {
  referenceTime: REFERENCE_TIME,
  nativeHoldIntervalEnds: threeHourIntervalEnds,
});
assert.equal(attestedThreeHourBounds.quality, 'FULL_HISTORY');
close(attestedThreeHourBounds.lowerPotential, threeHour.supplyPotential);
close(attestedThreeHourBounds.upperPotential, threeHour.supplyPotential);

const exactBoundary = regularEvidence(1, () => 0.1);
const bridgedBoundary = [
  { time: atElapsedHour(-1), strength: 0.1 },
  ...Array.from({ length: 48 }, (_, index) => ({
    time: atElapsedHour(index + 1),
    strength: 0.1,
  })),
];
const exactBoundaryResult = buildCurrentSupplyMemory(exactBoundary, {
  referenceTime: REFERENCE_TIME,
});
const bridgedBoundaryResult = buildCurrentSupplyMemory(bridgedBoundary, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(bridgedBoundaryResult.memoryReady, true);
assert.equal(bridgedBoundaryResult.evidence[0].time, atElapsedHour(-1));
close(exactBoundaryResult.supplyPotential, bridgedBoundaryResult.supplyPotential);

const maximumCompactEvidence = [
  { time: new Date(BOUNDARY_MS - 0.5 * HOUR_MS).toISOString(), strength: 0 },
  ...Array.from({ length: 48 }, (_, index) => ({
    time: new Date(BOUNDARY_MS + (index + 0.5) * HOUR_MS).toISOString(),
    strength: 0,
  })),
  { time: REFERENCE_TIME, strength: 0 },
];
const diagnosticFiftyPointReference = buildCurrentSupplyMemory(maximumCompactEvidence, {
  referenceTime: REFERENCE_TIME,
  maximumRetainedEvidencePoints: 50,
});
assert.equal(diagnosticFiftyPointReference.memoryReady, true);
assert.equal(diagnosticFiftyPointReference.evidence.length, 50,
  'the boundary fixture must genuinely require 50 untouched evidence rows');
const rollbackBoundedResult = buildCurrentSupplyMemory(maximumCompactEvidence, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(rollbackBoundedResult.memoryReady, false);
assert.equal(rollbackBoundedResult.status, 'EVIDENCE_LIMIT_EXCEEDED');
assert.equal(rollbackBoundedResult.supplyPotential, null,
  'the rollback-incompatible edge must not receive an approximated integral');
assert.equal(rollbackBoundedResult.rows.length, 0);
assert.equal(exactBoundaryResult.memoryReady, true);
assert.equal(exactBoundaryResult.evidence.length, 49,
  'an aligned complete 48-hour integral remains READY at the rollback-compatible limit');

const lossSensitiveWindow = [
  ...Array.from({ length: 48 }, (_, index) => ({
    time: new Date(BOUNDARY_MS + (index + 0.5) * HOUR_MS).toISOString(),
    strength: 0.02 + index / 1000,
  })),
  { time: REFERENCE_TIME, strength: 0.069 },
];
const lossSensitiveFifty = [
  {
    time: new Date(BOUNDARY_MS - 0.5 * HOUR_MS).toISOString(),
    strength: 0.019,
  },
  ...lossSensitiveWindow,
];
const exactFiftyPointDiagnostic = buildCurrentSupplyMemory(lossSensitiveFifty, {
  referenceTime: REFERENCE_TIME,
  maximumRetainedEvidencePoints: 50,
});
assert.equal(exactFiftyPointDiagnostic.memoryReady, true);
assert.equal(exactFiftyPointDiagnostic.evidence.length, 50);
const withoutRealBridge = buildCurrentSupplyMemory(lossSensitiveWindow, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(withoutRealBridge.memoryReady, false);
assert.equal(withoutRealBridge.status, 'WINDOW_INCOMPLETE',
  'dropping the real bridge must not invent boundary continuity');
const withoutObservedWindowPoint = buildCurrentSupplyMemory(
  lossSensitiveFifty.filter((_, index) => index !== 25),
  { referenceTime: REFERENCE_TIME },
);
assert.equal(withoutObservedWindowPoint.memoryReady, false);
assert.equal(withoutObservedWindowPoint.status, 'WINDOW_HAS_TIME_GAP');
assert.equal(withoutObservedWindowPoint.evidence.length, 49);
assert.equal(withoutObservedWindowPoint.supplyPotential, null,
  'dropping an observed in-window row must not borrow the next value backwards');

const outThenIn = buildCurrentSupplyMemory(regularEvidence(1, hour => {
  if (hour >= 37 && hour <= 42) return -1;
  if (hour >= 43) return 1;
  return 0;
}), { referenceTime: REFERENCE_TIME });
const inThenOut = buildCurrentSupplyMemory(regularEvidence(1, hour => {
  if (hour >= 37 && hour <= 42) return 1;
  if (hour >= 43) return -1;
  return 0;
}), { referenceTime: REFERENCE_TIME });
assert.equal(outThenIn.memoryReady, true);
assert.equal(inThenOut.memoryReady, true);
assert.ok(outThenIn.supplyPotential > inThenOut.supplyPotential);
close(outThenIn.supplyPotential, 60);
close(inThenOut.supplyPotential, 12);
assert.equal('outboundEpisodeEffectiveHours' in inThenOut, false);

const reversedInput = buildCurrentSupplyMemory([...outThenIn.evidence].reverse(), {
  referenceTime: REFERENCE_TIME,
});
close(reversedInput.supplyPotential, outThenIn.supplyPotential);
assert.deepEqual(reversedInput.rows, outThenIn.rows);

const neutralAfterInbound = buildCurrentSupplyMemory(regularEvidence(1, hour => {
  if (hour >= 43 && hour <= 45) return 1;
  return 0;
}), { referenceTime: REFERENCE_TIME });
close(neutralAfterInbound.supplyPotential, 30);
assert.equal(neutralAfterInbound.rows.at(-1).strength, 0);
close(neutralAfterInbound.rows.at(-1).previousSupplyPotential, 30);
close(neutralAfterInbound.rows.at(-1).supplyPotential, 30);

const withMissing = regularEvidence(1, () => 0.1);
withMissing[20] = { ...withMissing[20], strength: null };
const missingResult = buildCurrentSupplyMemory(withMissing, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(missingResult.memoryReady, false);
assert.equal(missingResult.status, 'WINDOW_HAS_MISSING_EVIDENCE');
assert.equal(missingResult.supplyPotential, null);
const missingBounds = buildCurrentSupplyScoreBounds(withMissing, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(missingBounds.available, true);
assert.equal(missingBounds.quality, 'HISTORY_INCOMPLETE');
assert.equal(missingBounds.coverageHours, 47);
assert.equal(missingBounds.unknownHours, 1);
assert.deepEqual(missingBounds.reasonCodes, ['CURRENT_HISTORY_MISSING_EVIDENCE']);
const missingAsOutbound = buildCurrentSupplyMemory(withMissing.map(item => (
  item.strength === null ? { ...item, strength: -1 } : item
)), { referenceTime: REFERENCE_TIME });
const missingAsInbound = buildCurrentSupplyMemory(withMissing.map(item => (
  item.strength === null ? { ...item, strength: 1 } : item
)), { referenceTime: REFERENCE_TIME });
close(missingBounds.lowerPotential, missingAsOutbound.supplyPotential);
close(missingBounds.upperPotential, missingAsInbound.supplyPotential);
assert.ok(missingBounds.lowerPotential <= missingBounds.upperPotential);

const withGap = regularEvidence(1, () => 0.1)
  .filter((_, index) => ![20, 21, 22].includes(index));
const gapResult = buildCurrentSupplyMemory(withGap, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(gapResult.memoryReady, false);
assert.equal(gapResult.status, 'WINDOW_HAS_TIME_GAP');
assert.equal(gapResult.supplyPotential, null);
const gapBounds = buildCurrentSupplyScoreBounds(withGap, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(gapBounds.available, true);
assert.equal(gapBounds.quality, 'HISTORY_INCOMPLETE');
assert.equal(gapBounds.coverageHours, 45);
assert.equal(gapBounds.unknownHours, 3);
assert.deepEqual(gapBounds.reasonCodes, ['CURRENT_HISTORY_TIME_GAP']);

const reducedGapEvidence = regularEvidence(1, hour => {
  if (hour >= 34 && hour <= 38) return 1;
  if (hour === 40) return -1;
  if (hour === 41) return 1;
  return 0;
});
const reducedSparseEvidence = reducedGapEvidence
  .filter(item => item.time !== atElapsedHour(40));
const reducedSparseMemory = buildCurrentSupplyMemory(reducedSparseEvidence, {
  referenceTime: REFERENCE_TIME,
});
assert.throws(() => replayCurrentSupplyEvidence(reducedSparseEvidence, {
  referenceTime: REFERENCE_TIME,
}), /unattested evidence gap/,
'the low-level replay primitive must not bypass the explicit gap proof');
const reducedSparseBounds = buildCurrentSupplyScoreBounds(reducedSparseEvidence, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(reducedSparseMemory.memoryReady, false,
  'one absent expected hour must make the exact current point state unavailable');
assert.equal(reducedSparseMemory.status, 'WINDOW_HAS_TIME_GAP');
assert.equal(reducedSparseBounds.quality, 'HISTORY_INCOMPLETE');
assert.equal(reducedSparseBounds.coverageHours, 47);
assert.equal(reducedSparseBounds.unknownHours, 1);
close(reducedSparseBounds.lowerPotential, 52);
close(reducedSparseBounds.upperPotential, 70);
for (let index = 0; index <= 40; index += 1) {
  const hiddenStrength = -1 + index / 20;
  const completion = reducedGapEvidence.map(item => (
    item.time === atElapsedHour(40) ? { ...item, strength: hiddenStrength } : item
  ));
  const completeMemory = buildCurrentSupplyMemory(completion, {
    referenceTime: REFERENCE_TIME,
  });
  const completeBounds = buildCurrentSupplyScoreBounds(completion, {
    referenceTime: REFERENCE_TIME,
  });
  assert.equal(completeMemory.memoryReady, true);
  assert.equal(completeBounds.quality, 'FULL_HISTORY');
  close(completeBounds.lowerPotential, completeMemory.supplyPotential);
  close(completeBounds.upperPotential, completeMemory.supplyPotential);
  assert.ok(
    completeMemory.supplyPotential >= reducedSparseBounds.lowerPotential - 1e-10
      && completeMemory.supplyPotential <= reducedSparseBounds.upperPotential + 1e-10,
    `hidden strength ${hiddenStrength} escaped the incomplete current bounds`,
  );
  assert.ok(
    completeBounds.lowerPotential >= reducedSparseBounds.lowerPotential - 1e-10
      && completeBounds.upperPotential <= reducedSparseBounds.upperPotential + 1e-10,
    `completion ${hiddenStrength} did not nest inside the incomplete bounds`,
  );
}

const fullBounds = buildCurrentSupplyScoreBounds(oneHour.evidence, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(fullBounds.available, true);
assert.equal(fullBounds.quality, 'FULL_HISTORY');
assert.equal(fullBounds.coverageHours, 48);
assert.deepEqual(fullBounds.reasonCodes, []);
close(fullBounds.lowerPotential, oneHour.supplyPotential);
close(fullBounds.upperPotential, oneHour.supplyPotential);

const missingDirectBounds = buildCurrentSupplyScoreBounds([
  ...withMissing.slice(0, -1),
  { ...withMissing.at(-1), strength: null },
], { referenceTime: REFERENCE_TIME });
assert.equal(missingDirectBounds.available, false);
assert.equal(missingDirectBounds.quality, 'UNAVAILABLE');
assert.equal(missingDirectBounds.reason, 'CURRENT_DIRECT_INPUT_MISSING');

const holdEvidence = Array.from({ length: 49 }, (_, index) => ({
  time: atElapsedHour(index - 2),
  strength: index === 48 ? 1 : 0,
}));
const undocumentedHold = buildCurrentSupplyMemory(holdEvidence, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(undocumentedHold.memoryReady, false);
assert.equal(undocumentedHold.status, 'LATEST_SAMPLE_MISSING');
const documentedHold = buildCurrentSupplyMemory(holdEvidence, {
  referenceTime: REFERENCE_TIME,
  nativeHold: true,
});
assert.equal(documentedHold.memoryReady, true);
assert.equal(documentedHold.status, 'READY_NATIVE_HOLD');
assert.equal(documentedHold.nativeHoldHours, 2);
assert.equal(documentedHold.referenceTime, atElapsedHour(46));
assert.equal(documentedHold.requestedReferenceTime, REFERENCE_TIME);
close(documentedHold.supplyPotential, 10);
assert.equal(documentedHold.rows.at(-1).time, atElapsedHour(46));
assert.notEqual(documentedHold.rows.at(-1).time, REFERENCE_TIME);
const holdAtNativeReference = buildCurrentSupplyMemory(holdEvidence, {
  referenceTime: atElapsedHour(46),
});
assert.equal(holdAtNativeReference.memoryReady, true);
assert.equal(documentedHold.supplyPotential, holdAtNativeReference.supplyPotential);
assert.deepEqual(documentedHold.rows, holdAtNativeReference.rows);
const heldBounds = buildCurrentSupplyScoreBounds(holdEvidence, {
  referenceTime: REFERENCE_TIME,
  nativeHold: true,
});
const nativeReferenceBounds = buildCurrentSupplyScoreBounds(holdEvidence, {
  referenceTime: atElapsedHour(46),
});
assert.equal(heldBounds.available, true);
assert.equal(heldBounds.referenceTime, atElapsedHour(46));
assert.equal(heldBounds.nativeHoldHours, 2);
assert.deepEqual(heldBounds, {
  ...nativeReferenceBounds,
  requestedReferenceTime: REFERENCE_TIME,
  latestEvidenceAgeHours: 2,
  nativeHoldHours: 2,
});
assert.equal(buildCurrentSupplyScoreBounds(holdEvidence, {
  referenceTime: REFERENCE_TIME,
}).available, false, 'an undocumented native hold must never make direct input available');

const tooLongHoldEvidence = Array.from({ length: 49 }, (_, index) => ({
  time: atElapsedHour(index - 4),
  strength: 0,
}));
const tooLongHold = buildCurrentSupplyMemory(tooLongHoldEvidence, {
  referenceTime: REFERENCE_TIME,
  nativeHold: true,
});
assert.equal(tooLongHold.memoryReady, false);
assert.equal(tooLongHold.status, 'LATEST_SAMPLE_GAP');

const firstRun = buildCurrentSupplyMemory([
  { time: atElapsedHour(-2), strength: -1 },
  ...regularEvidence(1, hour => hour % 7 === 0 ? -0.25 : 0.4),
], { referenceTime: REFERENCE_TIME });
const repeatedRun = buildCurrentSupplyMemory(firstRun.evidence, {
  referenceTime: REFERENCE_TIME,
});
assert.deepEqual(repeatedRun, firstRun);
const fullComplexBounds = buildCurrentSupplyScoreBounds(firstRun.evidence, {
  referenceTime: REFERENCE_TIME,
});
assert.equal(fullComplexBounds.quality, 'FULL_HISTORY');
assert.equal(fullComplexBounds.lowerPotential, firstRun.supplyPotential,
  'collapsed full-history lower bound must preserve the existing kernel bit-for-bit');
assert.equal(fullComplexBounds.upperPotential, firstRun.supplyPotential,
  'collapsed full-history upper bound must preserve the existing kernel bit-for-bit');

console.log('RavScore current-supply memory tests passed.');
