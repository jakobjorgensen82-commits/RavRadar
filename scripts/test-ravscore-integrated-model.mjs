import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_MODEL_ID,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_SCORE_QUALITY,
  RAVSCORE_WEIGHTS,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  canonicalBundleJson,
  computeRavScoreModelBundle,
} from './build-ravscore-model-bundle.mjs';
import {
  classifyWaterLevelContext,
  evaluateIntegratedLastMile,
  evaluateRavScoreIntegrated,
} from '../js/core/ravscore-integrated.js';
import { evaluateIntegratedHuntability } from '../js/core/ravscore-huntability.js';
import {
  PHASE_D_HUNTABILITY_PROFILES,
  evaluatePhaseDHuntability,
} from '../js/core/phase-d-process-candidate.js';

const digest = crypto.createHash('sha256')
  .update(canonicalBundleJson(RAVSCORE_MODEL_CONTRACT))
  .digest('hex');
assert.equal(RAVSCORE_MODEL_CONTRACT_SHA256, digest, 'model contract digest must bind the canonical contract');
const implementationBundle = await computeRavScoreModelBundle();
assert.equal(RAVSCORE_MODEL_BUNDLE_SHA256, implementationBundle.modelBundleSha256,
  'model bundle hash must bind the transitive implementation closure');
assert.notEqual(RAVSCORE_MODEL_BUNDLE_SHA256, RAVSCORE_MODEL_CONTRACT_SHA256,
  'implementation and parameter-contract digests must remain distinct identities');
assert.equal(ravScoreModelBinding().modelId, RAVSCORE_MODEL_ID);
assert.equal(ravScoreModelBinding().modelContractSha256, RAVSCORE_MODEL_CONTRACT_SHA256);
assert.equal(ravScoreModelBinding().modelBundleSha256, RAVSCORE_MODEL_BUNDLE_SHA256);
assert.deepEqual(RAVSCORE_WEIGHTS, { huntability: 0.2, transport: 0.5, mobilisation: 0.3 });

for (const mode of ['beach', 'waders']) {
  for (const windSpeedMps of [0, 6, 7, 10, 15, 20]) {
    for (const waveHeightM of [0, 0.25, 0.7, 1.2, 2.5, 4]) {
      const current = evaluateIntegratedHuntability(mode, { windSpeedMps, waveHeightM });
      const legacy = evaluatePhaseDHuntability(mode, { windSpeedMps, waveHeightM }, {
        profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
      });
      assert.ok(current.available);
      assert.ok(Math.abs(current.value - legacy.value) < 1e-9, `${mode} huntability must be preserved`);
    }
  }
}

const requiredHuntabilityInputFailures = [
  {
    label: 'missing wind',
    weather: { waveHeightM: 0.25 },
    requiredInput: 'windSpeedMps',
    inputStatus: 'MISSING',
    reasonSuffix: 'WIND_INPUT_MISSING',
  },
  {
    label: 'blank wind',
    weather: { windSpeedMps: '   ', waveHeightM: 0.25 },
    requiredInput: 'windSpeedMps',
    inputStatus: 'MISSING',
    reasonSuffix: 'WIND_INPUT_MISSING',
  },
  {
    label: 'negative wind',
    weather: { windSpeedMps: -0.01, waveHeightM: 0.25 },
    requiredInput: 'windSpeedMps',
    inputStatus: 'INVALID',
    reasonSuffix: 'WIND_INPUT_INVALID',
  },
  {
    label: 'boolean wind',
    weather: { windSpeedMps: false, waveHeightM: 0.25 },
    requiredInput: 'windSpeedMps',
    inputStatus: 'INVALID',
    reasonSuffix: 'WIND_INPUT_INVALID',
  },
  {
    label: 'numeric-string wind',
    weather: { windSpeedMps: '3', waveHeightM: 0.25 },
    requiredInput: 'windSpeedMps',
    inputStatus: 'INVALID',
    reasonSuffix: 'WIND_INPUT_INVALID',
  },
  {
    label: 'missing wave height',
    weather: { windSpeedMps: 3 },
    requiredInput: 'waveHeightM',
    inputStatus: 'MISSING',
    reasonSuffix: 'WAVE_HEIGHT_INPUT_MISSING',
  },
  {
    label: 'negative wave height',
    weather: { windSpeedMps: 3, waveHeightM: -0.01 },
    requiredInput: 'waveHeightM',
    inputStatus: 'INVALID',
    reasonSuffix: 'WAVE_HEIGHT_INPUT_INVALID',
  },
  {
    label: 'array wave height',
    weather: { windSpeedMps: 3, waveHeightM: [] },
    requiredInput: 'waveHeightM',
    inputStatus: 'INVALID',
    reasonSuffix: 'WAVE_HEIGHT_INPUT_INVALID',
  },
];

for (const mode of ['beach', 'waders']) {
  const calm = evaluateIntegratedHuntability(mode, { windSpeedMps: 0, waveHeightM: 0 });
  assert.equal(calm.available, true, `${mode}: physical zero values must remain valid`);
  assert.equal(calm.value, 100, `${mode}: physical zero values must preserve the existing curve`);
  assert.equal(calm.inputCoverage, 1);

  for (const failure of requiredHuntabilityInputFailures) {
    const unavailable = evaluateIntegratedHuntability(mode, failure.weather);
    assert.equal(unavailable.available, false, `${mode}: ${failure.label} must fail closed`);
    assert.equal(unavailable.value, null, `${mode}: ${failure.label} must not invent a score`);
    assert.equal(unavailable.reason, `${mode.toUpperCase()}_${failure.reasonSuffix}`);
    assert.equal(unavailable.requiredInput, failure.requiredInput);
    assert.equal(unavailable.inputStatus, failure.inputStatus);
    assert.equal('inputCoverage' in unavailable, false);
  }
}

const activeOffshore = evaluateIntegratedLastMile({
  supplyPotential: 100,
  lastMileState: {
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    lastMileEvidenceStatus: 'DIRECTIONAL_WAVE_EVIDENCE_READY',
    lastMileWaveActivity: 1,
    lastMileNormalAlignment: -1,
    lastMileTangentAlignment: 0,
    lastMileCoherence: 1,
    lastMileApproach: 0,
    lastMileFactor: 0.85,
  },
});
assert.equal(activeOffshore.normalAlignment, -1);
assert.equal(activeOffshore.factor, 0.85);
assert.equal(activeOffshore.transport, 85);
assert.equal(activeOffshore.scoreEffect, 'BOUNDED_SUPPLY_ATTENUATION_ONLY');
assert.equal(activeOffshore.structuralUncertainty, true);
assert.equal(activeOffshore.physicalDeliveryResolved, false);
assert.equal(activeOffshore.plausibleTransportRange, null);
assert.equal(activeOffshore.status, 'LAST_MILE_BOUNDED_WAVE_APPROACH_READY');
assert.equal(RAVSCORE_LAST_MILE_POLICY.numericPhysicalUncertaintyIntervalProvided, false);
const noSupply = evaluateIntegratedLastMile({
  supplyPotential: 0,
  lastMileState: {
    lastMileMemoryReady: true,
    lastMileMemoryStatus: 'READY',
    lastMileEvidenceStatus: 'DIRECTIONAL_WAVE_EVIDENCE_READY',
    lastMileWaveActivity: 1,
    lastMileNormalAlignment: 1,
    lastMileTangentAlignment: 0,
    lastMileCoherence: 1,
    lastMileApproach: 1,
    lastMileFactor: 1,
  },
});
assert.equal(noSupply.transport, 0, 'waves may not create supply');
const unknownDirection = evaluateIntegratedLastMile({
  supplyPotential: 80,
  lastMileState: {
    lastMileMemoryReady: false,
    lastMileMemoryStatus: 'MISSING_INPUT',
    lastMileEvidenceStatus: 'ACTIVE_WAVE_DIRECTION_MISSING',
  },
});
assert.equal(unknownDirection.status, 'LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING');
assert.equal(unknownDirection.factor, null);
assert.equal(unknownDirection.transport, null);
assert.equal(unknownDirection.plausibleTransportRange, null);
assert.deepEqual(unknownDirection.missing, ['wave-direction']);

for (const [label, value] of [
  ['negative', -0.01],
  ['above range', 100.01],
  ['boolean', false],
  ['array', []],
  ['numeric string', '80'],
]) {
  const invalidSupply = evaluateIntegratedLastMile({
    supplyPotential: value,
    lastMileState: {
      lastMileMemoryReady: true,
      lastMileMemoryStatus: 'READY',
      lastMileWaveActivity: 0,
      lastMileApproach: 1,
      lastMileFactor: 1,
    },
  });
  assert.equal(invalidSupply.available, false, `${label} supply state must fail closed`);
  assert.equal(invalidSupply.transport, null);
}

const baseState = {
  currentMemoryReady: true,
  currentMemoryStatus: 'READY',
  currentTransition: 'VERIFIED_REPLAY',
  currentVerified: true,
  currentReferenceAt: '2026-08-29T09:00:00.000Z',
  supplyPotential: 0,
  waveMemoryReady: true,
  waveMemoryStatus: 'READY',
  waveLastVerifiedAt: '2026-08-29T09:00:00.000Z',
  mobilisationPotential: 90,
  lastMileMemoryReady: true,
  lastMileMemoryStatus: 'READY',
  lastMileEvidenceStatus: 'EXACT_CALM_DIRECTION_NEUTRAL',
  lastMileWaveActivity: 0,
  lastMileNormalAlignment: null,
  lastMileTangentAlignment: null,
  lastMileCoherence: null,
  lastMileApproach: 1,
  lastMileFactor: 1,
};

const readyZeroCurrentSupplyMaximum = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: {
    windSpeedMps: 0,
    waveHeightM: 0,
    wavePeriodS: 0,
    waveDirectionDeg: 90,
  },
}, { state: { ...baseState, supplyPotential: 0, mobilisationPotential: 100 } });
assert.equal(readyZeroCurrentSupplyMaximum.available, true,
  'a verified ready current-supply component of zero is not missing current evidence');
assert.deepEqual(readyZeroCurrentSupplyMaximum.components, {
  huntability: 100,
  transport: 0,
  mobilisation: 100,
});
assert.deepEqual(readyZeroCurrentSupplyMaximum.scoreCalculation.weightedContributions, {
  huntability: 20,
  transport: 0,
  mobilisation: 30,
});
assert.equal(readyZeroCurrentSupplyMaximum.score, 50,
  '20/50/30 must cap ready-zero-current beach opportunity at 50 before any waders cap');
const fairMinimum = RAVSCORE_MODEL_CONTRACT.presentation.levels
  .find(item => item.level === 'fair')?.minimum;
assert.equal(fairMinimum, 55);
assert.ok(readyZeroCurrentSupplyMaximum.score < fairMinimum,
  'ready-zero-current opportunity may be poor/weak but never fair/good');
assert.ok(readyZeroCurrentSupplyMaximum.explanation.limitations
  .includes('LOCAL_AMBER_INVENTORY_UNOBSERVED'));
assert.equal(readyZeroCurrentSupplyMaximum.scoreQuality, RAVSCORE_SCORE_QUALITY.FULL_HISTORY);
assert.equal(readyZeroCurrentSupplyMaximum.calibrationEligible, true);
assert.equal(readyZeroCurrentSupplyMaximum.scoreSemantics, 'EXACT_POINT_SCORE');
assert.deepEqual(readyZeroCurrentSupplyMaximum.scoreBounds, {
  lower: 50,
  upper: 50,
  modelUncertaintyPoints: 0,
  rawLower: 50,
  rawUpper: 50,
});
assert.equal(readyZeroCurrentSupplyMaximum.historyCoverageHours, 48);
assert.deepEqual(readyZeroCurrentSupplyMaximum.historyReasonCodes, []);

const degradedState = {
  ...baseState,
  currentMemoryReady: false,
  currentMemoryStatus: 'WINDOW_HAS_MISSING_EVIDENCE',
  currentDirectInputAvailable: true,
  waveMemoryReady: false,
  waveMemoryStatus: 'MISSING_INPUT',
  historyScoreView: {
    available: true,
    quality: RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE,
    calibrationEligible: false,
    coverageHours: 31,
    requiredHours: 48,
    reasonCodes: [
      'CURRENT_HISTORY_MISSING_EVIDENCE',
      'WAVE_MOBILISATION_HISTORY_INCOMPLETE',
      'LAST_MILE_HISTORY_INCOMPLETE',
    ],
    conservativeTailResetApplied: false,
    current: {
      lowerPotential: 20,
      upperPotential: 80,
    },
    waveMobilisation: {
      lowerPotential: 30,
      upperPotential: 90,
    },
    lastMile: {
      lowerFactor: 0.85,
      upperFactor: 1,
    },
  },
};
const degradedWeather = {
  windSpeedMps: 3,
  waveHeightM: 0.25,
  wavePeriodS: 4,
  waveDirectionDeg: 90,
};
const degraded = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: degradedState });
assert.equal(degraded.available, true,
  'incomplete history must not block a score when all direct score-hour inputs are valid');
assert.equal(degraded.scoreQuality, RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE);
assert.equal(degraded.calibrationEligible, false);
assert.equal(degraded.scoreSemantics, 'CONSERVATIVE_ENCLOSING_LOWER_BOUND');
assert.equal(degraded.score, degraded.scoreBounds.lower,
  'the shown degraded score must be the conservative lower bound');
assert.ok(degraded.scoreBounds.lower <= degraded.scoreBounds.upper);
assert.equal(degraded.scoreBounds.modelUncertaintyPoints,
  degraded.scoreBounds.upper - degraded.scoreBounds.lower);
assert.equal(degraded.components.transport, 17);
assert.equal(degraded.diagnostics.supplyPotential, 20);
assert.equal(degraded.diagnostics.supplyPotentialUpper, 80);
assert.equal(degraded.historyCoverageHours, 31);
assert.deepEqual(degraded.historyReasonCodes, degradedState.historyScoreView.reasonCodes);
const expectedLowerRaw = 0.2 * degraded.components.huntability + 0.5 * 17 + 0.3 * 30;
const expectedUpperRaw = 0.2 * degraded.components.huntability + 0.5 * 80 + 0.3 * 90;
assert.ok(Math.abs(degraded.scoreBounds.rawLower - expectedLowerRaw) <= 1e-6);
assert.ok(Math.abs(degraded.scoreBounds.rawUpper - expectedUpperRaw) <= 1e-6);
assert.equal(degraded.explanation.scoreQuality, RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE);

const conservativeTailReset = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: {
  ...degradedState,
  historyScoreView: {
    ...degradedState.historyScoreView,
    quality: RAVSCORE_SCORE_QUALITY.FULL_HISTORY,
    calibrationEligible: true,
    coverageHours: 48,
    reasonCodes: [],
    conservativeTailResetApplied: true,
    current: { lowerPotential: 20, upperPotential: 20 },
    waveMobilisation: { lowerPotential: 30, upperPotential: 30 },
    lastMile: { lowerFactor: 0.85, upperFactor: 0.85 },
  },
} });
assert.equal(conservativeTailReset.available, true);
assert.equal(conservativeTailReset.scoreQuality, RAVSCORE_SCORE_QUALITY.FULL_HISTORY);
assert.equal(conservativeTailReset.calibrationEligible, true);
assert.equal(conservativeTailReset.scoreSemantics, 'CONSERVATIVE_TAIL_RESET_POINT_SCORE');
assert.equal(conservativeTailReset.conservativeTailResetApplied, true);
assert.equal(conservativeTailReset.scoreBounds.lower, conservativeTailReset.scoreBounds.upper);
assert.equal(
  conservativeTailReset.diagnostics.lastMile.status,
  'LAST_MILE_CONSERVATIVE_TAIL_RESET_POINT',
);

const degradedDirectCurrentMissing = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: { ...degradedState, currentDirectInputAvailable: false } });
assert.equal(degradedDirectCurrentMissing.available, false);
assert.equal(degradedDirectCurrentMissing.reason, 'CURRENT_DIRECT_INPUT_NOT_READY');
assert.equal(degradedDirectCurrentMissing.score, null);
assert.equal(degradedDirectCurrentMissing.scoreQuality, RAVSCORE_SCORE_QUALITY.UNAVAILABLE);
assert.equal(degradedDirectCurrentMissing.calibrationEligible, false);
const explicitMissingCannotMasqueradeAsHold = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: {
  ...degradedState,
  currentDirectInputAvailable: false,
  currentTransition: 'NATIVE_CADENCE_HOLD',
} });
assert.equal(explicitMissingCannotMasqueradeAsHold.available, false);
assert.equal(explicitMissingCannotMasqueradeAsHold.reason, 'CURRENT_DIRECT_INPUT_NOT_READY');

const incompleteWithoutReason = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: {
  ...degradedState,
  historyScoreView: {
    ...degradedState.historyScoreView,
    reasonCodes: [],
  },
} });
assert.equal(incompleteWithoutReason.available, false);
assert.equal(incompleteWithoutReason.reason, 'HISTORY_SCORE_VIEW_INVALID');
const extendedHistoryView = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: {
  ...degradedState,
  historyScoreView: {
    ...degradedState.historyScoreView,
    unexpected: true,
  },
} });
assert.equal(extendedHistoryView.available, false);
assert.equal(extendedHistoryView.reason, 'HISTORY_SCORE_VIEW_INVALID');

const degradedDirectionMissing = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { ...degradedWeather, waveDirectionDeg: null },
}, { state: degradedState });
assert.equal(degradedDirectionMissing.available, false);
assert.equal(degradedDirectionMissing.reason, 'LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING');
assert.equal(degradedDirectionMissing.score, null);

const degradedWaders = evaluateRavScoreIntegrated({
  mode: 'waders',
  zone: { onshoreDirectionDeg: 270 },
  weather: degradedWeather,
}, { state: degradedState });
assert.equal(degradedWaders.available, true);
assert.ok(degradedWaders.scoreBounds.lower <= degradedWaders.scoreBounds.upper);
assert.ok(degradedWaders.scoreBounds.upper
  <= degradedWaders.scoreCalculation.wadersHuntabilityMaximum,
'waders safety cap must be applied monotonically to both degraded bounds');

const missingCurrentSupplyState = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: {
    windSpeedMps: 0,
    waveHeightM: 0,
    wavePeriodS: 0,
    waveDirectionDeg: 90,
  },
}, { state: { ...baseState, currentMemoryReady: false } });
assert.equal(missingCurrentSupplyState.available, false,
  'missing current evidence must fail closed instead of being reinterpreted as transport zero');
assert.equal(missingCurrentSupplyState.reason, 'CURRENT_SUPPLY_STATE_NOT_READY');
assert.equal(missingCurrentSupplyState.score, null);

for (const mode of ['beach', 'waders']) {
  for (const failure of requiredHuntabilityInputFailures.filter(item => item.label !== 'blank wind')) {
    const unavailable = evaluateRavScoreIntegrated({
      mode,
      zone: { onshoreDirectionDeg: 270 },
      weather: {
        wavePeriodS: 4,
        waveDirectionDeg: 90,
        ...failure.weather,
      },
    }, { state: baseState });
    assert.equal(unavailable.available, false, `${mode}: full model ${failure.label} must fail closed`);
    assert.equal(unavailable.score, null, `${mode}: full model ${failure.label} must not emit a score`);
    assert.equal(unavailable.reason, `${mode.toUpperCase()}_${failure.reasonSuffix}`);
    assert.equal('confidence' in unavailable, false, `${mode}: unavailable must not claim confidence`);
    assert.notEqual(unavailable.confidence?.dataStatus, 'READY');
    assert.equal('components' in unavailable, false, `${mode}: unavailable must not expose score components`);
    assert.equal('scoreCalculation' in unavailable, false, `${mode}: unavailable must not expose a calculation`);
  }
}
const result = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: {
    windSpeedMps: 3,
    waveHeightM: 0.25,
    wavePeriodS: 4,
    waveDirectionDeg: 90,
    currentSpeedMps: 0.12,
    currentDirectionDeg: 90,
    waterLevelCm: 20,
    waterLevelTrendCm3h: -3,
  },
}, { state: baseState });
assert.ok(result.available);
for (const [key, expected] of Object.entries(ravScoreModelBinding())) {
  assert.equal(result.explanation[key], expected,
    `evaluator explanation must carry exact ${key}`);
}
assert.ok(result.score > 0,
  'ready zero recent current-supply is not proof of no conditional local amber opportunity');
assert.equal(result.diagnostics.waterLevelContext.scoreEffectPoints, 0);
assert.equal(result.diagnostics.waterLevelContext.phase, 'FALLING');
assert.equal(result.diagnostics.waterLevelContext.currentRelation, 'OUTBOUND');
assert.equal(result.diagnostics.waterLevelContext.currentRelationDeadbandMps, 0.03);
assert.equal(result.diagnostics.waterLevelContext.trendSemantics,
  'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE');
assert.equal(result.explanation.findProbability, false);
assert.equal(result.confidence.modelConfidence, 'low');
assert.equal(result.confidence.dataStatus, 'READY_WITH_STRUCTURAL_LAST_MILE_UNCERTAINTY');
assert.equal(result.scoreCalculation.finalScore, result.score);
assert.equal(
  Math.round(Object.values(result.scoreCalculation.weightedContributions).reduce((sum, value) => sum + value, 0)),
  result.score,
);

const thirteenHourEquivalent = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { windSpeedMps: 3, waveHeightM: 0.25, wavePeriodS: 4, waveDirectionDeg: 90 },
}, { state: baseState });
assert.notEqual(thirteenHourEquivalent.score, 0, 'no separate 13-hour whole-score gate may exist');

const wadersStopped = evaluateRavScoreIntegrated({
  mode: 'waders',
  zone: { onshoreDirectionDeg: 270 },
  weather: { windSpeedMps: 15, waveHeightM: 0.7, wavePeriodS: 5, waveDirectionDeg: 90 },
}, { state: { ...baseState, supplyPotential: 100, mobilisationPotential: 100 } });
assert.equal(wadersStopped.score, 0);
assert.equal(wadersStopped.scoreCalculation.wadersHuntabilityMaximum, 0);

for (const trend of [-1, 0, 1, null]) {
  const water = classifyWaterLevelContext(
    { waterLevelCm: 5, waterLevelTrendCm3h: trend },
    { currentSupply:0.2, currentAlignment:-1, currentVerified:true },
  );
  assert.equal(water.scoreEffectPoints, 0);
  assert.equal(water.transportEffect, 'NONE');
}

const fallingCurrentCases = [
  { label:'outbound', direction:180, state:baseState, relation:'OUTBOUND' },
  { label:'inbound', direction:0, state:baseState, relation:'INBOUND' },
  { label:'along', direction:90, state:baseState, relation:'ALONG_OR_WEAK' },
  { label:'unknown', direction:180, state:{ ...baseState, currentVerified:false }, relation:'UNKNOWN_OR_NATIVE_HOLD' },
  { label:'native hold', direction:180, state:{ ...baseState, currentTransition:'NATIVE_CADENCE_HOLD' }, relation:'UNKNOWN_OR_NATIVE_HOLD' },
];
const fallingCurrentResults = fallingCurrentCases.map(({ label, direction:currentDirectionDeg, state, relation }) => {
  const evaluated = evaluateRavScoreIntegrated({
    mode:'beach',
    zone:{ onshoreDirectionDeg:0 },
    weather:{
      windSpeedMps:3,
      waveHeightM:0.5,
      wavePeriodS:5,
      waveDirectionDeg:180,
      waterLevelCm:5,
      waterLevelTrendCm3h:-2,
      currentSpeedMps:0.15,
      currentDirectionDeg,
    },
  }, { state:{ ...state, supplyPotential:0, mobilisationPotential:100 } });
  assert.equal(evaluated.available, true, `${label}: konteksten må ikke gøre scoren utilgængelig`);
  assert.equal(evaluated.components.transport, 0, `${label}: fælleskonteksten må ikke ændre transportpotentialet`);
  assert.equal(evaluated.components.mobilisation, 100, `${label}: høj mobilisering skal bevares ved nul transport`);
  assert.equal(evaluated.diagnostics.waterLevelContext.currentRelation, relation, `${label}: forkert strømklasse`);
  assert.equal(evaluated.diagnostics.waterLevelContext.scoreEffectPoints, 0);
  assert.equal(evaluated.diagnostics.waterLevelContext.transportEffect, 'NONE');
  return evaluated;
});
assert.equal(new Set(fallingCurrentResults.map(entry => entry.scoreCalculation.rawScore)).size, 1,
  'FALLING×strømklassen er forklaringskontekst og må ikke ændre score');
for (const currentAlignment of [-0.2, 0.2]) {
  assert.equal(classifyWaterLevelContext(
    { waterLevelCm:5, waterLevelTrendCm3h:-1 },
    { currentSupply:0.15, currentAlignment, currentVerified:true },
  ).currentRelation, 'ALONG_OR_WEAK', '±0,03 m/s skal høre til dødzoneklassen');
}

const contextInvariantWeather = {
  windSpeedMps: 5,
  waveHeightM: 1.2,
  wavePeriodS: 7,
  waveDirectionDeg: 180,
};
const contextInvariantScores = [
  { waterLevelCm: -40, waterLevelTrendCm3h: -12, waterTemperatureC: -1 },
  { waterLevelCm: 0, waterLevelTrendCm3h: 0, waterTemperatureC: 8 },
  { waterLevelCm: 85, waterLevelTrendCm3h: 18, waterTemperatureC: 25 },
].map(context => evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { ...contextInvariantWeather, ...context },
}, { state: { ...baseState, supplyPotential: 62, mobilisationPotential: 71 } }));
assert.ok(contextInvariantScores.every(entry => entry.available));
assert.equal(new Set(contextInvariantScores.map(entry => entry.scoreCalculation.rawScore)).size, 1,
  'vandstand og vandtemperatur er forklaringskontekst og må ikke ændre RavScore');
assert.deepEqual(
  contextInvariantScores.map(entry => entry.diagnostics.waterLevelContext.phase),
  ['FALLING', 'STABLE', 'RISING'],
  'vandstandens fase skal fortsat være synlig, selv om dens scoreeffekt er nul',
);

const missingCurrent = evaluateRavScoreIntegrated({}, { state: { ...baseState, currentMemoryReady: false } });
assert.equal(missingCurrent.available, false);
assert.equal(missingCurrent.score, null);
const missingWave = evaluateRavScoreIntegrated({}, { state: { ...baseState, waveMemoryReady: false } });
assert.equal(missingWave.available, false);
assert.equal(missingWave.score, null);

for (const malformedState of [
  { ...baseState, currentMemoryStatus: 'ARBITRARY' },
  { ...baseState, waveMemoryStatus: 'MISSING_INPUT' },
  { ...baseState, supplyPotential: -0.01 },
  { ...baseState, supplyPotential: 100.01 },
  { ...baseState, mobilisationPotential: -0.01 },
  { ...baseState, mobilisationPotential: 100.01 },
  { ...baseState, supplyPotential: '50' },
  { ...baseState, mobilisationPotential: '50' },
]) {
  const unavailable = evaluateRavScoreIntegrated({
    mode: 'beach',
    zone: { onshoreDirectionDeg: 270 },
    weather: { windSpeedMps: 3, waveHeightM: 0.4, wavePeriodS: 5 },
  }, { state: malformedState });
  assert.equal(unavailable.available, false, 'forged state must fail closed');
  assert.equal(unavailable.score, null);
}

const negativePeriod = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { windSpeedMps: 3, waveHeightM: 0.4, wavePeriodS: -0.01 },
}, { state: baseState });
assert.equal(negativePeriod.available, false,
  'negative period must not be converted to calm-wave evidence by the full evaluator');
assert.equal(negativePeriod.score, null);

const positiveHeightZeroPeriod = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { windSpeedMps: 3, waveHeightM: 0.4, wavePeriodS: 0 },
}, { state: baseState });
assert.equal(positiveHeightZeroPeriod.available, false,
  'positive wave height with zero period is invalid, not exact calm');
assert.equal(positiveHeightZeroPeriod.reason, 'WAVE_PHYSICAL_INPUT_NOT_READY');
assert.equal(positiveHeightZeroPeriod.score, null);

const numericStringWave = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { windSpeedMps: 3, waveHeightM: '0.4', wavePeriodS: 5 },
}, { state: baseState });
assert.equal(numericStringWave.available, false,
  'numeric-string weather must fail closed instead of entering the physical model');
assert.equal(numericStringWave.score, null);

const unknownWaveDirection = evaluateRavScoreIntegrated({
  mode: 'beach',
  zone: { onshoreDirectionDeg: 270 },
  weather: { windSpeedMps: 3, waveHeightM: 0.4, wavePeriodS: 5 },
}, { state: baseState });
assert.equal(unknownWaveDirection.available, false);
assert.equal(unknownWaveDirection.reason, 'LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING');
assert.equal(unknownWaveDirection.score, null,
  'active missing direction must fail closed and may not reuse a neutral factor');

console.log('Integreret RavScore-kontrakt, jagtbarhed, sidste nærkystled og score: bestået.');
