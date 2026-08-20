const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const finite = value => Number.isFinite(Number(value));
const rounded = value => Math.round(Number(value));

export const SCORE_CANDIDATE_WEIGHTS = Object.freeze({
  phaseDAdditive: Object.freeze({ huntability: 25, transport: 40, mobilisation: 35 }),
  equalAdditive: Object.freeze({ huntability: 34, transport: 33, mobilisation: 33 }),
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

function weightedPhysicalChain(components) {
  const transport = components.transport;
  const mobilisation = components.mobilisation;
  if (transport <= 0 || mobilisation <= 0) return 0;
  return (40 + 35) / (40 / transport + 35 / mobilisation);
}

export function compareScoreCandidates(result) {
  const components = normaliseComponents(result);
  if (!result?.available || !finite(result.score) || !components) {
    return { available: false, reason: 'MISSING_BASE_SCORE_OR_COMPONENTS' };
  }

  const b0 = rounded(clamp(result.score));
  const phaseDAdditive = additiveScore(components, SCORE_CANDIDATE_WEIGHTS.phaseDAdditive);
  const equalAdditive = additiveScore(components, SCORE_CANDIDATE_WEIGHTS.equalAdditive);
  const physicalChain = weightedPhysicalChain(components);
  const phaseDChain = rounded(components.huntability * 0.25 + physicalChain * 0.75);
  const scores = { b0, phaseDAdditive, equalAdditive, phaseDChain };

  return {
    available: true,
    scoreImpact: 'diagnostic-only',
    components,
    scores,
    deltasFromB0: Object.fromEntries(Object.entries(scores).map(([key, value]) => [key, value - b0])),
    physicalChainScore: Number(physicalChain.toFixed(3)),
    definitions: {
      phaseDAdditive: SCORE_CANDIDATE_WEIGHTS.phaseDAdditive,
      equalAdditive: SCORE_CANDIDATE_WEIGHTS.equalAdditive,
      phaseDChain: {
        huntabilityShare: 25,
        physicalShare: 75,
        physicalMethod: 'weighted-harmonic-transport-40-mobilisation-35',
      },
    },
  };
}
