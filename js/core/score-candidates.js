const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const finite = value => Number.isFinite(Number(value));
const rounded = value => Math.round(Number(value));

export const SCORE_CANDIDATE_WEIGHTS = Object.freeze({
  legacyAdditive: Object.freeze({ huntability: 40, transport: 35, mobilisation: 25 }),
  phaseDAdditive: Object.freeze({ huntability: 25, transport: 40, mobilisation: 35 }),
  equalAdditive: Object.freeze({ huntability: 34, transport: 33, mobilisation: 33 }),
});

export const SCORE_MODEL_IDS = Object.freeze({
  legacy: 'RRS-LEGACY-WEIGHTS-4.0.241',
  current: 'RRS-CURRENT-B0-4.0.247',
  candidateA: 'RRS-CAND-A-SMOOTH-EVENT',
  candidateB: 'RRS-CAND-B-DELIVERY-RETENTION',
  candidateC: 'RRS-CAND-C-WEAKEST-LINK',
  candidateD: 'RRS-CAND-D-WAVE-DELIVERY-PATH',
  candidateE: 'RRS-CAND-E-PHYSICAL-BOTTLENECK',
  candidateG24: 'RRS-CANDIDATE-G-24H-LIN-4.0.252',
  candidateG5050: 'RRS-CANDIDATE-G-50-50-LIN-4.0.252',
  candidateG48: 'RRS-CANDIDATE-G-48H-LIN-4.0.252',
  candidateGNoDirectWind: 'RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-4.0.252',
});

function normaliseComponents(result) {
  const components = result?.components || {};
  const values = {
    huntability: components.huntability,
    transport: components.transport,
    mobilisation: components.release ?? components.mobilisation,
  };
  if (!Object.values(values).every(finite)) return null;
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, clamp(value)]));
}

function additiveScore(components, weights) {
  const weightTotal = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (weightTotal <= 0) return null;
  return rounded(Object.entries(weights).reduce((sum, [key, weight]) => sum + components[key] * weight, 0) / weightTotal);
}

function weightedHarmonic(components, weights) {
  const entries = Object.entries(weights);
  if (entries.some(([key]) => components[key] <= 0)) return 0;
  const weightTotal = entries.reduce((sum, [, weight]) => sum + weight, 0);
  return weightTotal / entries.reduce((sum, [key, weight]) => sum + weight / components[key], 0);
}

export function compareScoreCandidates(result) {
  const components = normaliseComponents(result);
  if (!result?.available || !finite(result.score) || !components) {
    return { available: false, reason: 'MISSING_BASE_SCORE_OR_COMPONENTS' };
  }

  const b0 = rounded(clamp(result.score));
  const legacyAdditive = additiveScore(components, SCORE_CANDIDATE_WEIGHTS.legacyAdditive);
  const phaseDAdditive = additiveScore(components, SCORE_CANDIDATE_WEIGHTS.phaseDAdditive);
  const equalAdditive = additiveScore(components, SCORE_CANDIDATE_WEIGHTS.equalAdditive);
  const weakestStage = Math.min(components.huntability, components.transport, components.mobilisation);
  const softGateFactor = 0.75 + 0.25 * Math.min(1, weakestStage / 50);
  const phaseDSoftGate = rounded(phaseDAdditive * softGateFactor);
  const physicalChain = weightedHarmonic(components, { transport: 40, mobilisation: 35 });
  const phaseDChain = rounded(components.huntability * 0.25 + physicalChain * 0.75);
  const phaseDFullChain = rounded(weightedHarmonic(components, SCORE_CANDIDATE_WEIGHTS.phaseDAdditive));
  const scores = { b0, legacyAdditive, phaseDAdditive, equalAdditive, phaseDSoftGate, phaseDChain, phaseDFullChain };

  return {
    available: true,
    scoreImpact: 'diagnostic-only',
    components,
    scores,
    deltasFromB0: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, value - b0])),
    physicalChainScore: Number(physicalChain.toFixed(3)),
    weakestStage,
    softGateFactor: Number(softGateFactor.toFixed(3)),
    definitions: {
      phaseDAdditive: SCORE_CANDIDATE_WEIGHTS.phaseDAdditive,
      equalAdditive: SCORE_CANDIDATE_WEIGHTS.equalAdditive,
      phaseDSoftGate: {
        base: 'phaseDAdditive',
        weakestStageFullCreditAt: 50,
        maximumReductionPercent: 25,
      },
      phaseDChain: {
        huntabilityShare: 25,
        physicalShare: 75,
        physicalMethod: 'weighted-harmonic-transport-40-mobilisation-35',
      },
      phaseDFullChain: {
        method: 'weighted-harmonic-huntability-25-transport-40-mobilisation-35',
      },
    },
  };
}
