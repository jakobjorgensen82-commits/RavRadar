import assert from 'node:assert/strict';
import {
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  evaluateNextGenerationRavScore,
} from '../js/core/ravscore-next-generation.js';

const context = ({
  mode = 'beach',
  windSpeedMps = 4,
  waveHeightM = 1,
  wavePeriodS = 8,
  waveDirectionDeg = 270,
  waterLevelCm = 10,
  waterLevelTrendCm3h = 3,
} = {}) => ({
  mode,
  zone: { onshoreDirectionDeg: 90 },
  weather: {
    windSpeedMps,
    waveHeightM,
    wavePeriodS,
    waveDirectionDeg,
    waterLevelCm,
    waterLevelTrendCm3h,
  },
});

const memory = ({ transportPotential = 70, mobilisationPotential = 60, ...rest } = {}) => ({
  transportPotential,
  mobilisationPotential,
  ...rest,
});

function score(inputContext = context(), inputMemory = memory()) {
  const result = evaluateNextGenerationRavScore(inputContext, { memory: inputMemory });
  assert.equal(result.available, true);
  assert.equal(result.modelId, NEXT_RAVSCORE_MODEL_ID);
  assert.equal(result.stateSchemaVersion, NEXT_RAVSCORE_STATE_SCHEMA_VERSION);
  return result;
}

const baseline = score();
assert.equal(baseline.explanation.physicalCoupling.supplyCountedOnce, true);
assert.equal(baseline.explanation.physicalCoupling.mobilisationCanCreateSupply, false);
assert.equal(baseline.explanation.empiricalFindAccuracyClaimed, false);
assert.equal(baseline.explanation.nearshoreSupport.surfZoneResolved, false);
assert.equal(baseline.explanation.waterLevel.scoreImpact.coastalSupply, 0);
assert.equal(baseline.explanation.waterLevel.gridCurrentVectorAdded, false);
assert.equal(baseline.explanation.waterLevel.localBarOrTroughObserved, false);

const supplyCurve = [0, 10, 30, 60, 100].map(transportPotential =>
  score(context(), memory({ transportPotential, mobilisationPotential: 70 })).score);
assert.deepEqual([...supplyCurve].sort((a, b) => a - b), supplyCurve,
  'Scoren skal være monoton i dokumenteret kystnær tilførsel');
assert.equal(supplyCurve[0], 0, 'Jagtbarhed eller bølger må ikke skabe score uden supply');

const mobilisationCurve = [0, 10, 30, 60, 100].map(mobilisationPotential =>
  score(context(), memory({ transportPotential: 70, mobilisationPotential })).score);
assert.deepEqual([...mobilisationCurve].sort((a, b) => a - b), mobilisationCurve,
  'Scoren skal være monoton i mobilisering');
assert.equal(mobilisationCurve[0], 0, 'Supply må ikke skabe score uden mobilisering');

const onshore = score(context({ waveDirectionDeg: 270 }));
const alongshore = score(context({ waveDirectionDeg: 0 }));
const offshore = score(context({ waveDirectionDeg: 90 }));
assert.ok(onshore.score >= alongshore.score && alongshore.score >= offshore.score,
  'Bølgers nærkyststøtte skal være retningsmonoton');
assert.ok(onshore.diagnostics.nearshoreDeliveryFactor <= 1);
assert.ok(offshore.diagnostics.nearshoreDeliveryFactor >= 0.8);

const noDirection = score(context({ waveDirectionDeg: null }));
assert.equal(noDirection.diagnostics.waveApproachAvailable, false);
assert.ok(noDirection.confidence.limitations.includes('wave-approach-direction-missing-neutral-midpoint-used'));
assert.ok(noDirection.score >= offshore.score && noDirection.score <= onshore.score,
  'Ukendt bølgeretning skal bruge eksplicit neutralt midtpunkt, ikke fysisk nul');

const rising = score(context({ waterLevelCm: 20, waterLevelTrendCm3h: 8 }));
const falling = score(context({ waterLevelCm: -20, waterLevelTrendCm3h: -8 }));
assert.ok(falling.score >= rising.score,
  'Faldende vand skal kunne give den afgrænsede ejerprior for søgefokus');
assert.ok(falling.score - rising.score <= 2,
  'Vandstand må ikke dominere score uden lokal bathymetri/runup-model');
assert.equal(rising.explanation.waterLevel.phase, 'RISING');
assert.equal(falling.explanation.waterLevel.phase, 'FALLING');
assert.ok(falling.explanation.waterLevel.huntabilityBonusPoints > 0);
assert.equal(falling.explanation.waterLevel.scoreImpact.coastalSupply, 0);
assert.equal(falling.explanation.waterLevel.seawardLossBeyondSurfZoneClaimed, false);

const calmWaders = score(context({ mode: 'waders', windSpeedMps: 2, waveHeightM: 0.2 }));
const roughWaders = score(context({ mode: 'waders', windSpeedMps: 15, waveHeightM: 1.2 }));
assert.ok(calmWaders.score > roughWaders.score);
assert.ok(roughWaders.score <= roughWaders.components.huntability);
assert.equal(roughWaders.explanation.huntability.meaning,
  'METHOD_EFFECTIVENESS_NOT_AMBER_PRESENCE_OR_SAFETY_APPROVAL');

const gridOutflowEvidence = score(context(), memory({
  transportPotential: 0,
  mobilisationPotential: 100,
  gridOutflowEvidenceActive: true,
  outboundEpisodeEffectiveHours: 13,
}));
assert.equal(gridOutflowEvidence.score, 0);
assert.equal(gridOutflowEvidence.explanation.coastalSupply.gridOutflowEvidenceActive, true);
assert.equal(gridOutflowEvidence.explanation.coastalSupply.beachOrSurfZoneDepletionClaimed, false);
assert.equal(Object.hasOwn(gridOutflowEvidence.diagnostics, 'outflowExhaustionGateApplied'), false,
  'Den nye model må ikke have en særskilt alt-eller-intet eftergate');

assert.equal(evaluateNextGenerationRavScore(context(), {
  memory: memory({ transportPotential: null }),
}).reason, 'MISSING_REQUIRED_COASTAL_SUPPLY_STATE');
assert.equal(evaluateNextGenerationRavScore(context(), {
  memory: memory({ mobilisationPotential: null }),
}).reason, 'MISSING_REQUIRED_WAVE_MOBILISATION_STATE');
assert.equal(evaluateNextGenerationRavScore(context({ windSpeedMps: null, waveHeightM: null }), {
  memory: memory(),
}).reason, 'MISSING_REQUIRED_HUNTABILITY');

console.log('OK: næste RavScore-models kausale kerne, missing, grænser og usikkerhed er låst.');
