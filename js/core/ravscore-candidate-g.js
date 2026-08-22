import { evaluatePhaseDWaveProcessCandidate } from './phase-d-wave-process-candidate.js';

export const CANDIDATE_G_WEIGHTS = Object.freeze({
  huntability: 0.20,
  transportAndDelivery: 0.45,
  mobilisation: 0.35,
});

export const CANDIDATE_G_HISTORY_MIX = Object.freeze({
  current: 0.55,
  wave: 0.35,
  directWind: 0.10,
});

export const CANDIDATE_G_VARIANTS = Object.freeze({
  'G-24H-LIN': Object.freeze({
    id: 'G-24H-LIN',
    modelId: 'RRS-CANDIDATE-G-24H-LIN-4.0.252',
    memoryTrack: '24h',
    directWindPower: 1,
  }),
  'G-50-50-LIN': Object.freeze({
    id: 'G-50-50-LIN',
    modelId: 'RRS-CANDIDATE-G-50-50-LIN-4.0.252',
    memoryTrack: '24h-48h-50-50',
    directWindPower: 1,
  }),
  'G-48H-LIN': Object.freeze({
    id: 'G-48H-LIN',
    modelId: 'RRS-CANDIDATE-G-48H-LIN-4.0.252',
    memoryTrack: '48h',
    directWindPower: 1,
  }),
  'G-50-50-NO-DIRECT-WIND': Object.freeze({
    id: 'G-50-50-NO-DIRECT-WIND',
    modelId: 'RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-4.0.252',
    memoryTrack: '24h-48h-50-50',
    directWindPower: null,
    directWindIncluded: false,
  }),
});

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const round = value => Math.round(clamp(value));

function memoryState(value) {
  if (!finite(value)) return null;
  return clamp(Number(value), -1, 1);
}

function normalizeHistoryMix(mix = {}) {
  const resolved = {
    current: finite(mix.current) ? Number(mix.current) : CANDIDATE_G_HISTORY_MIX.current,
    wave: finite(mix.wave) ? Number(mix.wave) : CANDIDATE_G_HISTORY_MIX.wave,
    directWind: finite(mix.directWind) ? Number(mix.directWind) : CANDIDATE_G_HISTORY_MIX.directWind,
  };
  const values = Object.values(resolved);
  if (values.some(value => value < 0) || Math.abs(values.reduce((sum, value) => sum + value, 0) - 1) > 1e-9) {
    throw new Error('Candidate G history weights must be non-negative and sum to one');
  }
  return resolved;
}

function physicalBottleneckGate(weakestPhysicalStage) {
  if (weakestPhysicalStage >= 35) return 1;
  return 0.85 + 0.15 * clamp(weakestPhysicalStage / 35, 0, 1);
}

/**
 * Score-neutral Candidate G research evaluator.
 *
 * Directional history can only modulate an already available physical
 * transport-and-delivery path. A neutral history leaves that path unchanged,
 * and history can never create transport from a zero-capacity base. Direct
 * wind is deliberately capped at ten percent of the history signal and can be
 * removed without redistributing its weight, so the mandatory no-direct-wind
 * comparison has a neutral, interpretable reference.
 */
export function evaluateRavScoreCandidateG(
  context = {},
  {
    variantId = 'G-50-50-LIN',
    memory = {},
    includeDirectWind = true,
    historyGain = 0.40,
    historyMix = CANDIDATE_G_HISTORY_MIX,
  } = {},
) {
  const base = evaluatePhaseDWaveProcessCandidate(context);
  if (!base.available) return base;

  const variant = CANDIDATE_G_VARIANTS[variantId];
  if (!variant) throw new Error(`Unknown Candidate G variant: ${variantId}`);
  if (!(finite(historyGain) && Number(historyGain) >= 0 && Number(historyGain) <= 1)) {
    throw new Error('Candidate G historyGain must be between zero and one');
  }
  const mix = normalizeHistoryMix(historyMix);
  const resolvedIncludeDirectWind = variant.directWindIncluded === false ? false : includeDirectWind;
  const currentState = memoryState(memory.current);
  const waveState = memoryState(memory.wave);
  const directWindState = resolvedIncludeDirectWind ? memoryState(memory.directWind) : null;
  if (currentState === null || waveState === null) {
    return {
      ...base,
      available: false,
      score: null,
      scoreImpact: 'diagnostic-only',
      reason: 'MISSING_REQUIRED_CANDIDATE_G_MEMORY',
    };
  }

  const directWindContribution = directWindState === null ? 0 : mix.directWind * directWindState;
  const directionalHistorySignal = clamp(
    mix.current * currentState + mix.wave * waveState + directWindContribution,
    -1,
    1,
  );
  const historyFactor = clamp(1 + Number(historyGain) * directionalHistorySignal, 0, 2);
  const baseTransportAndDelivery = Number(base.components.transportAndDelivery);
  const transportAndDelivery = clamp(baseTransportAndDelivery * historyFactor);
  const huntability = Number(base.components.huntability);
  const mobilisation = Number(base.components.mobilisation);
  const additiveScore = huntability * CANDIDATE_G_WEIGHTS.huntability
    + transportAndDelivery * CANDIDATE_G_WEIGHTS.transportAndDelivery
    + mobilisation * CANDIDATE_G_WEIGHTS.mobilisation;
  const weakestPhysicalStage = Math.min(transportAndDelivery, mobilisation);
  const gateFactor = physicalBottleneckGate(weakestPhysicalStage);
  const candidateG = round(additiveScore * gateFactor);
  const limitations = new Set(base.confidence?.limitations || []);
  limitations.add('directional-history-is-research-prior');
  limitations.add('history-gain-is-uncalibrated');
  limitations.add('no-find-outcome-calibration');
  if (directWindState === null) limitations.add('direct-wind-history-omitted');

  return {
    ...base,
    score: candidateG,
    scoreImpact: 'diagnostic-only',
    modelVersion: variant.modelId,
    components: {
      ...base.components,
      transportAndDelivery: round(transportAndDelivery),
    },
    candidateScores: {
      ...base.candidateScores,
      candidateG,
    },
    candidateDefinitions: {
      ...base.candidateDefinitions,
      candidateG: 'Candidate E process path with capacity-preserving causal direction memory, 20/45/35 weights and the same mild physical bottleneck',
    },
    additiveScore: Number(additiveScore.toFixed(3)),
    weakestStage: Number(weakestPhysicalStage.toFixed(3)),
    weakestPhysicalStage: Number(weakestPhysicalStage.toFixed(3)),
    gateFactor: Number(gateFactor.toFixed(3)),
    confidence: {
      ...base.confidence,
      modelMaturity: 'research-prior-unvalidated',
      modelConfidence: 'low',
      limitations: [...limitations],
    },
    diagnostics: {
      ...base.diagnostics,
      candidateGVariant: variant.id,
      candidateGMemoryTrack: variant.memoryTrack,
      candidateGWeights: CANDIDATE_G_WEIGHTS,
      candidateGHistoryMix: mix,
      candidateGHistoryGain: Number(historyGain),
      candidateGDirectWindIncluded: directWindState !== null,
      candidateGDirectionalHistorySignal: Number(directionalHistorySignal.toFixed(6)),
      candidateGHistoryFactor: Number(historyFactor.toFixed(6)),
      candidateGBaseTransportAndDelivery: baseTransportAndDelivery,
      scoreIsSafetyAdvice: false,
      automaticActivationAllowed: false,
    },
  };
}
