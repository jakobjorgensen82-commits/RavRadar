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

assert.deepEqual(CANDIDATE_G_WEIGHTS, { huntability: 0.20, transportAndDelivery: 0.50, mobilisation: 0.30 });
assert.deepEqual(CANDIDATE_G_HISTORY_MIX, { current: 0.55, wave: 0.35, directWind: 0.10 });
assert.deepEqual(Object.keys(CANDIDATE_G_VARIANTS), [
  'G-24H-LIN',
  'G-50-50-LIN',
  'G-48H-LIN',
  'G-50-50-NO-DIRECT-WIND',
  'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT',
  'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED',
  'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
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
assert.deepEqual(neutral.researchExplanation.componentOrder, [
  'transportAndDelivery', 'mobilisation', 'huntability',
]);
assert.equal(neutral.researchExplanation.currentArrow.timeMeaning, 'NOW');
assert.equal(neutral.researchExplanation.directionalHistory.meaning,
  'CAUSAL_DIRECTIONAL_CONTEXT_BEFORE_NOW');
assert.equal(neutral.researchExplanation.directionalHistory.effect,
  'NEUTRAL_FOR_EXISTING_TRANSPORT_PATH');
assert.equal(neutral.researchExplanation.directionalHistory.canCreateTransportFromZeroCapacity, false);
assert.equal(neutral.researchExplanation.siteSuitabilityIncluded, false);
assert.equal(neutral.researchExplanation.safetyAdviceIncluded, false);
assert.equal(neutral.researchExplanation.publicActivationAllowed, false);

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
  { variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED' },
);
assert.equal(approvedBeach.score, withoutDirect.score, 'Den nye waders-kontrakt må ikke ændre strandscoren');
assert.equal(approvedBeach.scoreCalculation.modeHuntabilityPolicy, 'UNCHANGED');
assert.equal(approvedBeach.diagnostics.candidateGWadersHuntabilityMaximum, null);
assert.equal(approvedBeach.researchExplanation.modeHuntability.applied, false);
assert.equal(approvedBeach.researchExplanation.scoreMeaning, 'AMBER_OPPORTUNITY_FOR_BEACH_SEARCH');

const wadersWindCases = [
  [3, 100],
  [5.9, 100],
  [6, 100],
  [7, 80],
  [8, 60],
  [10, 35],
  [13, 10],
  [15, 0],
];
const approvedWaders = wadersWindCases.map(([windSpeedMps, expectedWindScore]) => {
  const huntability = evaluatePhaseDHuntability('waders', { windSpeedMps, waveHeightM: 0.4 }, {
    profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
  });
  assert.equal(huntability.windScore, expectedWindScore);
  const result = evaluate(
    { current: 0, wave: 0, directWind: 1 },
    { variantId: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED' },
    { mode: 'waders', weather: { windSpeedMps, waveHeightM: 0.4 } },
  );
  assert.equal(result.scoreCalculation.modeHuntabilityPolicy, 'VISIBLE_WADERS_HUNTABILITY_MAXIMUM');
  assert.ok(result.score <= result.components.huntability);
  assert.equal(result.diagnostics.candidateGHuntabilityWindScore, expectedWindScore);
  assert.equal(result.researchExplanation.modeHuntability.maximum, result.components.huntability);
  assert.equal(result.researchExplanation.scoreMeaning,
    'AMBER_OPPORTUNITY_FOR_WADERS_METHOD_LIMITED_BY_CURRENT_HUNTABILITY');
  return result;
});
assert.ok(approvedWaders.every((result, index) => index === 0 || result.score <= approvedWaders[index - 1].score));
assert.ok(approvedWaders.every((result, index) => index === 0
  || wadersWindCases[index][0] <= 6
  || result.diagnostics.candidateGHuntabilityWindScore < approvedWaders[index - 1].diagnostics.candidateGHuntabilityWindScore));
assert.equal(approvedWaders.at(-1).researchExplanation.modeHuntability.applied, true);
assert.equal(approvedWaders.at(-1).components.huntability, 0);
assert.equal(approvedWaders.at(-1).diagnostics.candidateGHuntabilityWindHardStopApplied, true);

const currentLedBaseMemory = {
  transportPotential: 100,
  outboundEpisodeEffectiveHours: 0,
  outboundEpisodeLossPoints: 0,
  actualOutboundTransport: false,
};
const currentLedFull = evaluate(currentLedBaseMemory, {
  variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
});
assert.equal(currentLedFull.available, true);
assert.equal(currentLedFull.components.transport, 100);
assert.equal(currentLedFull.diagnostics.candidateGCurrentLedTransportPotential, 100);
assert.equal(currentLedFull.diagnostics.candidateGHistoryFactor, 1);
assert.equal(currentLedFull.diagnostics.candidateGDirectionalHistorySignal, null);
assert.equal(currentLedFull.researchExplanation.currentLedTransport.waveCanCreateTransport, false);
assert.equal(currentLedFull.researchExplanation.currentLedTransport.waveLandingMaximumShare, 0.15);

const currentLedHourly = [100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4, 0]
  .map((transportPotential, hour) => evaluate({
    transportPotential,
    outboundEpisodeEffectiveHours: hour,
    outboundEpisodeLossPoints: hour >= 13 ? 100 : Math.min(96, hour * 8),
    actualOutboundTransport: hour >= 13,
  }, {
    variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
  }));
assert.ok(currentLedHourly.every(result => result.available));
assert.deepEqual(
  currentLedHourly.map(result => result.diagnostics.candidateGCurrentLedTransportPotential),
  [100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4, 0],
);
assert.ok(currentLedHourly.every((result, index) => index === 0
  || result.components.transportAndDelivery <= currentLedHourly[index - 1].components.transportAndDelivery));
assert.equal(currentLedHourly.at(-1).components.transportAndDelivery, 0);
assert.equal(currentLedHourly.at(-1).diagnostics.candidateGActualOutboundTransport, true);

const noCurrentHighWave = evaluate({
  transportPotential: 0,
  outboundEpisodeEffectiveHours: 13,
  outboundEpisodeLossPoints: 100,
  actualOutboundTransport: true,
}, {
  variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
}, {
  weather: {
    waveHeightM: 4,
    wavePeriodS: 10,
    waveDirectionDeg: 270,
  },
});
assert.equal(noCurrentHighWave.components.transport, 0);
assert.equal(noCurrentHighWave.components.delivery, 0);
assert.equal(noCurrentHighWave.components.transportAndDelivery, 0,
  'Bølger må ikke skabe transport eller levering uden et strømopbygget transportpotentiale');

const lowWaveLanding = evaluate(currentLedBaseMemory, {
  variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
}, {
  weather: { waveHeightM: 0, wavePeriodS: 0, waveDirectionDeg: 270 },
});
const highWaveLanding = evaluate(currentLedBaseMemory, {
  variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
}, {
  weather: { waveHeightM: 3, wavePeriodS: 8, waveDirectionDeg: 270 },
});
assert.ok(highWaveLanding.components.delivery >= lowWaveLanding.components.delivery);
assert.ok(highWaveLanding.components.transportAndDelivery - lowWaveLanding.components.transportAndDelivery <= 3,
  'Bølgernes afhængige landingsbidrag skal forblive lille i forhold til strømtransporten');
assert.equal(evaluate({}, {
  variantId: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
}).reason, 'MISSING_REQUIRED_CURRENT_LED_TRANSPORT_POTENTIAL');

const waveMobilisationMemory = {
  ...currentLedBaseMemory,
  mobilisationPotential: 70,
  waveEnergyProxy: 7,
  waveEnergyScore: 75,
  waveMobilisationTransition: 'decay',
  waveMobilisationBuildHalfLifeHours: 4,
  waveMobilisationDecayHalfLifeHours: 48,
};
const waveMobilisation = evaluate(waveMobilisationMemory, {
  variantId: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
});
assert.equal(waveMobilisation.available, true);
assert.equal(waveMobilisation.components.mobilisation, 70);
assert.equal(waveMobilisation.diagnostics.candidateGWaveMobilisationMemoryIncluded, true);
assert.equal(waveMobilisation.researchExplanation.mobilisationMemory.directWindScoreIncluded, false);
assert.equal(waveMobilisation.researchExplanation.mobilisationMemory.currentSpeedScoreIncluded, false);
const waveMobilisationOtherWindAndCurrent = evaluate(waveMobilisationMemory, {
  variantId: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
}, {
  weather: { windSpeedMps: 14, currentSpeedMps: 1.2 },
});
assert.equal(waveMobilisationOtherWindAndCurrent.components.mobilisation, 70,
  'Direkte vind og aktuel strøm må ikke give ekstra mobiliseringspoint');
assert.equal(evaluate(currentLedBaseMemory, {
  variantId: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
}).reason, 'MISSING_REQUIRED_WAVE_MOBILISATION_STATE');

const nativeCadenceContext = {
  weather: {
    currentUMps: null,
    currentVMps: null,
    currentSpeedMps: null,
    currentDirectionDeg: null,
    currentAlignment: null,
  },
  history: {
    stateModelMode: null,
    verifiedCurrentCoverageHours: null,
    maxWave24hM: null,
    maxWind24hMps: null,
    strongEventDurationHours: null,
    hoursSinceStrongEventEnd: null,
  },
};
const nativeCadenceHold = {
  transition: 'NATIVE_CADENCE_HOLD',
  evaluatedAt: '2026-08-26T17:00:00.000Z',
  referenceAt: '2026-08-26T15:00:00.000Z',
  maximumHoldHours: 3,
  transportMemoryReady: true,
  transportMemoryStatus: 'READY',
};
for (const mode of ['waders', 'beach']) {
  const held = evaluate(waveMobilisationMemory, {
    variantId: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
    nativeCadenceHold,
  }, {
    ...nativeCadenceContext,
    mode,
  });
  assert.equal(held.available, true, `${mode} must use ready bounded memory during the approved hold`);
  assert.ok(Number.isFinite(held.score));
  assert.equal(held.diagnostics.candidateGNativeCadenceHoldUsed, true);
  assert.equal(held.reason, null);
  assert.equal(held.researchExplanation.currentArrow.meaning,
    'NO_CURRENT_VECTOR_DURING_APPROVED_NATIVE_CADENCE_HOLD');
  assert.ok(Number.isFinite(held.components.transportAndDelivery));
  assert.ok(Number.isFinite(held.components.mobilisation));
}
const noNativeCadencePermission = evaluate(waveMobilisationMemory, {
  variantId: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
}, nativeCadenceContext);
assert.equal(noNativeCadencePermission.available, false,
  'ordinary unverified current must remain fail-closed even with derived memory');
assert.equal(noNativeCadencePermission.reason, 'MISSING_REQUIRED_PHASE_D_COMPONENT');
for (const invalidHold of [
  { ...nativeCadenceHold, evaluatedAt: '2026-08-26T18:00:01.000Z' },
  { ...nativeCadenceHold, maximumHoldHours: 0 },
  { ...nativeCadenceHold, transportMemoryReady: false },
  { ...nativeCadenceHold, transportMemoryStatus: 'WINDOW_INCOMPLETE' },
]) {
  const rejected = evaluate(waveMobilisationMemory, {
    variantId: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
    nativeCadenceHold: invalidHold,
  }, nativeCadenceContext);
  assert.equal(rejected.available, false, 'stale, non-allowlisted or non-ready holds must fail closed');
  assert.equal(rejected.reason, 'MISSING_REQUIRED_PHASE_D_COMPONENT');
}

const wavePenaltyCases = [
  { windSpeedMps: 6, waveHeightM: 0.7, expected: 93 },
  { windSpeedMps: 6, waveHeightM: 1.2, expected: 85 },
  { windSpeedMps: 8, waveHeightM: 0.7, expected: 60 },
  { windSpeedMps: 8, waveHeightM: 1.2, expected: 53 },
  { windSpeedMps: 15, waveHeightM: 0, expected: 0 },
];
for (const item of wavePenaltyCases) {
  const huntability = evaluatePhaseDHuntability('waders', item, {
    profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
  });
  assert.equal(Math.round(huntability.value), item.expected);
  assert.ok(huntability.value <= huntability.windScore);
  assert.ok(huntability.wavePenalty <= huntability.windScore * 0.20);
}

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
  ...approvedWaders, currentLedFull, ...currentLedHourly, noCurrentHighWave,
  lowWaveLanding, highWaveLanding, waveMobilisation, waveMobilisationOtherWindAndCurrent,
  zeroCapacity, staticA, staticB]) {
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(result.candidateScores.candidateG, result.score);
}

console.log('OK: Candidate G is capacity-preserving, bounded, score-neutral and supports the mandatory no-direct-wind control.');
