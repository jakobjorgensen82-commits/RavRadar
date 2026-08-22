import assert from 'node:assert/strict';

import {
  CANDIDATE_G_HISTORY_MIX,
  CANDIDATE_G_VARIANTS,
  CANDIDATE_G_WEIGHTS,
  evaluateRavScoreCandidateG,
} from '../js/core/ravscore-candidate-g.js';
import {
  PHASE_D_HUNTABILITY_PROFILES,
  evaluatePhaseDHuntability,
} from '../js/core/phase-d-process-candidate.js';

const context = {
  mode: 'beach',
  weather: {
    windSpeedMps: 6,
    waveHeightM: 1,
    wavePeriodS: 7,
    waveDirectionDeg: 270,
    currentSpeedMps: 0.3,
    currentAlignment: 0.7,
  },
  history: {
    maxWave24hM: 2,
    maxWind24hMps: 12,
    strongEventDurationHours: 10,
    hoursSinceStrongEventEnd: 8,
  },
  zone: { onshoreDirectionDeg: 90 },
};

const evaluate = (memory, options = {}, overrides = {}) => evaluateRavScoreCandidateG({
  ...context,
  ...overrides,
  weather: { ...context.weather, ...(overrides.weather || {}) },
  history: { ...context.history, ...(overrides.history || {}) },
  zone: { ...context.zone, ...(overrides.zone || {}) },
}, { memory, ...options });

assert.deepEqual(CANDIDATE_G_WEIGHTS, { huntability: 0.20, transportAndDelivery: 0.45, mobilisation: 0.35 });
assert.deepEqual(CANDIDATE_G_HISTORY_MIX, { current: 0.55, wave: 0.35, directWind: 0.10 });
assert.deepEqual(Object.keys(CANDIDATE_G_VARIANTS), [
  'G-24H-LIN',
  'G-50-50-LIN',
  'G-48H-LIN',
  'G-50-50-NO-DIRECT-WIND',
  'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT',
]);

const neutral = evaluate({ current: 0, wave: 0, directWind: 0 });
const inbound = evaluate({ current: 1, wave: 1, directWind: 1 });
const outbound = evaluate({ current: -1, wave: -1, directWind: -1 });
assert.equal(neutral.available, true);
assert.ok(inbound.score > neutral.score && neutral.score > outbound.score);
assert.equal(neutral.diagnostics.candidateGHistoryFactor, 1);
assert.equal(neutral.scoreCalculation.roundedScore, neutral.score);
assert.equal(
  Math.round(neutral.scoreCalculation.additiveScore * neutral.scoreCalculation.gateFactor),
  neutral.score,
);
assert.ok(Math.abs(
  Object.values(neutral.scoreCalculation.weightedContributions).reduce((sum, value) => sum + value, 0)
  - neutral.scoreCalculation.additiveScore,
) < 1e-9);
assert.equal(neutral.scoreImpact, 'diagnostic-only');
assert.equal(neutral.diagnostics.automaticActivationAllowed, false);
assert.equal(neutral.diagnostics.scoreIsSafetyAdvice, false);

const withDirect = evaluate({ current: 0, wave: 0, directWind: 1 });
const withoutDirect = evaluate(
  { current: 0, wave: 0, directWind: 1 },
  { variantId: 'G-50-50-NO-DIRECT-WIND' },
);
assert.ok(withDirect.score >= withoutDirect.score);
assert.ok(withDirect.diagnostics.candidateGHistoryFactor - withoutDirect.diagnostics.candidateGHistoryFactor <= 0.041);
assert.equal(withoutDirect.diagnostics.candidateGDirectWindIncluded, false);

const approvedBeach = evaluate(
  { current: 0, wave: 0, directWind: 1 },
  { variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT' },
);
assert.equal(approvedBeach.score, withoutDirect.score, 'Den nye waders-kontrakt må ikke ændre strandscoren');
assert.equal(approvedBeach.scoreCalculation.modeHuntabilityPolicy, 'UNCHANGED');
assert.equal(approvedBeach.diagnostics.candidateGWadersHuntabilityMaximum, null);

const wadersWindCases = [
  [3, 100],
  [5.9, 100],
  [6, 100],
  [7, 80],
  [8, 60],
  [10, 35],
  [13, 10],
  [18, 0],
];
const approvedWaders = wadersWindCases.map(([windSpeedMps, expectedWindScore]) => {
  const huntability = evaluatePhaseDHuntability('waders', { windSpeedMps, waveHeightM: 0.4 }, {
    profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_UNDER_6_PROGRESSIVE,
  });
  assert.equal(huntability.windScore, expectedWindScore);
  const result = evaluate(
    { current: 0, wave: 0, directWind: 1 },
    { variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT' },
    { mode: 'waders', weather: { windSpeedMps, waveHeightM: 0.4 } },
  );
  assert.equal(result.scoreCalculation.modeHuntabilityPolicy, 'VISIBLE_WADERS_HUNTABILITY_MAXIMUM');
  assert.ok(result.score <= result.components.huntability);
  assert.equal(result.diagnostics.candidateGHuntabilityWindScore, expectedWindScore);
  return result;
});
assert.ok(approvedWaders.every((result, index) => index === 0 || result.score <= approvedWaders[index - 1].score));
assert.ok(approvedWaders.every((result, index) => index === 0
  || wadersWindCases[index][0] <= 6
  || result.diagnostics.candidateGHuntabilityWindScore < approvedWaders[index - 1].diagnostics.candidateGHuntabilityWindScore));

const zeroCapacity = evaluate(
  { current: 1, wave: 1, directWind: 1 },
  {},
  {
    weather: {
      currentSpeedMps: 0,
      currentAlignment: -1,
      waveHeightM: 0,
      wavePeriodS: 0,
      waveDirectionDeg: 90,
    },
  },
);
assert.equal(zeroCapacity.diagnostics.candidateGBaseTransportAndDelivery, 0);
assert.equal(zeroCapacity.components.transportAndDelivery, 0, 'History must not create a transport path from zero capacity');

const staticA = evaluate({ current: 0.5, wave: 0.5, directWind: 0 }, {}, {
  zone: { reefs: false, shallowWater: false, seagrass: false },
});
const staticB = evaluate({ current: 0.5, wave: 0.5, directWind: 0 }, {}, {
  zone: { reefs: true, shallowWater: true, seagrass: true },
});
assert.equal(staticA.score, staticB.score, 'Undocumented static coast features must remain score-neutral');

assert.equal(evaluate({ current: null, wave: 0, directWind: 0 }).available, false);
assert.throws(() => evaluate({ current: 0, wave: 0, directWind: 0 }, { variantId: 'G-UNKNOWN' }));
assert.throws(() => evaluate({ current: 0, wave: 0, directWind: 0 }, { historyGain: 1.1 }));
assert.throws(() => evaluate(
  { current: 0, wave: 0, directWind: 0 },
  { historyMix: { current: 0.5, wave: 0.5, directWind: 0.5 } },
));

for (const result of [neutral, inbound, outbound, withDirect, withoutDirect, approvedBeach,
  ...approvedWaders, zeroCapacity, staticA, staticB]) {
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(result.candidateScores.candidateG, result.score);
}

console.log('OK: Candidate G is capacity-preserving, bounded, score-neutral and supports the mandatory no-direct-wind control.');
