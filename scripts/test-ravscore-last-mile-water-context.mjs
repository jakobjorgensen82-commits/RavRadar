import assert from 'node:assert/strict';

import {
  classifyWaterLevelContext,
  evaluateRavScoreIntegrated,
} from '../js/core/ravscore-integrated.js';

const baseState = Object.freeze({
  currentMemoryReady: true,
  currentMemoryStatus: 'READY',
  currentTransition: 'VERIFIED_REPLAY',
  currentVerified: true,
  currentReferenceAt: '2026-08-29T09:00:00.000Z',
  supplyPotential: 0,
  waveMemoryReady: true,
  waveMemoryStatus: 'READY',
  waveLastVerifiedAt: '2026-08-29T09:00:00.000Z',
  mobilisationPotential: 100,
});

function evaluateFalling({ currentDirectionDeg, state = baseState } = {}) {
  return evaluateRavScoreIntegrated({
    mode: 'beach',
    zone: { onshoreDirectionDeg: 0 },
    weather: {
      windSpeedMps: 3,
      waveHeightM: 0.5,
      wavePeriodS: 5,
      waveDirectionDeg: 180,
      waterLevelCm: 5,
      waterLevelTrendCm3h: -2,
      currentSpeedMps: 0.15,
      ...(currentDirectionDeg === undefined ? {} : { currentDirectionDeg }),
    },
  }, { state });
}

const cases = [
  { label: 'outbound', currentDirectionDeg: 180, relation: 'OUTBOUND' },
  { label: 'inbound', currentDirectionDeg: 0, relation: 'INBOUND' },
  { label: 'along', currentDirectionDeg: 90, relation: 'ALONG_OR_WEAK' },
  {
    label: 'unverified',
    currentDirectionDeg: 180,
    state: { ...baseState, currentVerified: false },
    relation: 'UNKNOWN_OR_NATIVE_HOLD',
  },
  {
    label: 'native hold',
    currentDirectionDeg: 180,
    state: { ...baseState, currentTransition: 'NATIVE_CADENCE_HOLD' },
    relation: 'UNKNOWN_OR_NATIVE_HOLD',
  },
];

const results = cases.map(testCase => {
  const result = evaluateFalling(testCase);
  const context = result.diagnostics.waterLevelContext;
  assert.equal(result.available, true, `${testCase.label}: context must not make score unavailable`);
  assert.equal(result.components.transport, 0, `${testCase.label}: transport=0 must be preserved`);
  assert.equal(result.components.mobilisation, 100, `${testCase.label}: high mobilisation must be preserved`);
  assert.equal(context.phase, 'FALLING');
  assert.equal(context.currentRelation, testCase.relation, `${testCase.label}: wrong current class`);
  assert.equal(context.jointContextCode, `FALLING_WITH_${testCase.relation}_CURRENT_CONTEXT`);
  assert.equal(context.currentRelationDeadbandMps, 0.03);
  assert.equal(context.trendSemantics, 'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE');
  assert.equal(context.scoreEffectPoints, 0);
  assert.equal(context.transportEffect, 'NONE');
  return result;
});

assert.equal(new Set(results.map(result => result.score)).size, 1,
  'FALLING × current class must not change final score');
assert.equal(new Set(results.map(result => result.scoreCalculation.rawScore)).size, 1,
  'FALLING × current class must not change raw score');
assert.equal(new Set(results.map(result => result.diagnostics.lastMile.transport)).size, 1,
  'FALLING × current class must not change transportPotential');

for (const [normalSpeedMps, expected] of [
  [-0.030001, 'OUTBOUND'],
  [-0.03, 'ALONG_OR_WEAK'],
  [0, 'ALONG_OR_WEAK'],
  [0.03, 'ALONG_OR_WEAK'],
  [0.030001, 'INBOUND'],
]) {
  const context = classifyWaterLevelContext(
    { waterLevelCm: 5, waterLevelTrendCm3h: -1 },
    {
      currentSupply: Math.abs(normalSpeedMps),
      currentAlignment: normalSpeedMps === 0 ? 0 : Math.sign(normalSpeedMps),
      currentVerified: true,
      currentTransition: 'VERIFIED_REPLAY',
    },
  );
  assert.equal(context.currentRelation, expected, `${normalSpeedMps}: deadband boundary mismatch`);
}

const nativeHold = classifyWaterLevelContext(
  { waterLevelCm: 5, waterLevelTrendCm3h: -1 },
  {
    currentSupply: 0.15,
    currentAlignment: -1,
    currentVerified: true,
    currentTransition: 'NATIVE_CADENCE_HOLD',
  },
);
assert.equal(nativeHold.currentRelation, 'UNKNOWN_OR_NATIVE_HOLD');
assert.equal(nativeHold.scoreEffectPoints, 0);

console.log('RavScore last-mile water/current context invariants: OK');
