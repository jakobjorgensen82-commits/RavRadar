import { evaluatePhaseDWaveProcessCandidate } from './phase-d-wave-process-candidate.js';
import {
  PHASE_D_HUNTABILITY_PROFILES,
  evaluatePhaseDHuntability,
} from './phase-d-process-candidate.js';
import { evaluateWaveApproachSupport } from './wave-approach.js?v=4.0.323';

export const CANDIDATE_G_WEIGHTS = Object.freeze({
  huntability: 0.20,
  transportAndDelivery: 0.50,
  mobilisation: 0.30,
});

export const CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA =
  'På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed';

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
  'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT': Object.freeze({
    id: 'G-50-50-NO-DIRECT-WIND-WADERS-LIMIT',
    modelId: 'RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-WADERS-LIMIT-4.0.254',
    memoryTrack: '24h-48h-50-50',
    directWindPower: null,
    directWindIncluded: false,
    huntabilityProfile: PHASE_D_HUNTABILITY_PROFILES.WADERS_UNDER_6_PROGRESSIVE,
    wadersHuntabilityLimit: true,
  }),
  'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED': Object.freeze({
    id: 'G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED',
    modelId: 'RRS-CANDIDATE-G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED-4.0.258',
    memoryTrack: '24h-48h-50-50',
    directWindPower: null,
    directWindIncluded: false,
    huntabilityProfile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
    wadersHuntabilityLimit: true,
  }),
  'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED': Object.freeze({
    id: 'G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED',
    modelId: 'RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2',
    memoryTrack: 'current-led-transport-potential-with-event-context',
    directWindPower: null,
    directWindIncluded: false,
    huntabilityProfile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
    wadersHuntabilityLimit: true,
    currentLedTransportPotential: true,
    waveLandingMaximumShare: 0.15,
  }),
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED': Object.freeze({
    id: 'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED',
    modelId: 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3',
    memoryTrack: 'current-led-transport-plus-wave-energy-mobilisation-state',
    directWindPower: null,
    directWindIncluded: false,
    huntabilityProfile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
    wadersHuntabilityLimit: true,
    currentLedTransportPotential: true,
    waveLandingMaximumShare: 0.15,
    waveMobilisationMemory: true,
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

function directionalHistoryEffect(signal) {
  if (signal > 0) return 'SUPPORTS_EXISTING_TRANSPORT_PATH';
  if (signal < 0) return 'LIMITS_EXISTING_TRANSPORT_PATH';
  return 'NEUTRAL_FOR_EXISTING_TRANSPORT_PATH';
}

function buildResearchExplanation({
  mode,
  components,
  weightedContributions,
  additiveScore,
  gateFactor,
  directionalHistorySignal,
  historyFactor,
  uncoupledScore,
  finalScore,
  modeHuntabilityPolicy,
  modeHuntabilityMaximum,
  modeHuntabilityApplied,
  currentLedTransport,
  scoreBeforeOutflowExhaustionGate,
  outflowExhaustionGateApplied,
  mobilisationMemory,
  nativeCadenceHoldUsed,
}) {
  return {
    contractVersion: '1.1.0',
    scoreMeaning: mode === 'waders'
      ? 'AMBER_OPPORTUNITY_FOR_WADERS_METHOD_LIMITED_BY_CURRENT_HUNTABILITY'
      : 'AMBER_OPPORTUNITY_FOR_BEACH_SEARCH',
    componentOrder: ['transportAndDelivery', 'mobilisation', 'huntability'],
    components: {
      transportAndDelivery: {
        value: components.transportAndDelivery,
        weight: CANDIDATE_G_WEIGHTS.transportAndDelivery,
        weightedContribution: weightedContributions.transportAndDelivery,
        meaning: 'PHYSICAL_TRANSPORT_DELIVERY_AND_RETENTION_PATH',
      },
      mobilisation: {
        value: components.mobilisation,
        weight: CANDIDATE_G_WEIGHTS.mobilisation,
        weightedContribution: weightedContributions.mobilisation,
        meaning: 'RECENT_MOBILISATION_AND_AVAILABILITY',
      },
      huntability: {
        value: components.huntability,
        weight: CANDIDATE_G_WEIGHTS.huntability,
        weightedContribution: weightedContributions.huntability,
        meaning: 'CURRENT_SEARCH_EFFECTIVENESS_FOR_SELECTED_MODE',
      },
    },
    additiveScore,
    currentArrow: {
      meaning: nativeCadenceHoldUsed
        ? 'NO_CURRENT_VECTOR_DURING_APPROVED_NATIVE_CADENCE_HOLD'
        : 'CURRENT_LOCAL_CURRENT_VECTOR_AT_SELECTED_CONTEXT',
      timeMeaning: nativeCadenceHoldUsed ? 'HELD_TRANSPORT_STATE_ONLY' : 'NOW',
    },
    directionalHistory: {
      meaning: currentLedTransport
        ? 'CURRENT_LED_TRANSPORT_POTENTIAL_BEFORE_NOW'
        : 'CAUSAL_DIRECTIONAL_CONTEXT_BEFORE_NOW',
      effect: directionalHistoryEffect(directionalHistorySignal),
      signal: directionalHistorySignal,
      factor: historyFactor,
      canCreateTransportFromZeroCapacity: false,
    },
    currentLedTransport: currentLedTransport ? {
      meaning: 'CURRENT_MOVES_AMBER_WAVES_ONLY_MODULATE_DEPENDENT_LANDING',
      transportPotential: currentLedTransport.transportPotential,
      delivery: currentLedTransport.delivery,
      transportAndDelivery: currentLedTransport.transportAndDelivery,
      eventTimingReadiness: currentLedTransport.eventTimingReadiness,
      waveLandingReadiness: currentLedTransport.waveLandingReadiness,
      waveLandingMaximumShare: currentLedTransport.waveLandingMaximumShare,
      waveCanCreateTransport: false,
      outboundEpisodeEffectiveHours: currentLedTransport.outboundEpisodeEffectiveHours,
      outboundEpisodeLossPoints: currentLedTransport.outboundEpisodeLossPoints,
      actualOutboundTransport: currentLedTransport.actualOutboundTransport,
    } : null,
    mobilisationMemory: mobilisationMemory ? {
      meaning: 'CAUSAL_WAVE_ENERGY_EVENT_STATE_WITHOUT_ADDITIVE_DIRECT_WIND_OR_CURRENT_SCORE',
      mobilisationPotential: mobilisationMemory.mobilisationPotential,
      waveEnergyProxy: mobilisationMemory.waveEnergyProxy,
      waveEnergyScore: mobilisationMemory.waveEnergyScore,
      transition: mobilisationMemory.transition,
      buildHalfLifeHours: mobilisationMemory.buildHalfLifeHours,
      decayHalfLifeHours: mobilisationMemory.decayHalfLifeHours,
      directWindScoreIncluded: false,
      currentSpeedScoreIncluded: false,
    } : null,
    physicalBottleneck: {
      meaning: 'MILD_TRANSPORT_MOBILISATION_BOTTLENECK',
      factor: gateFactor,
      applied: gateFactor < 1,
    },
    modeHuntability: {
      policy: modeHuntabilityPolicy,
      maximum: modeHuntabilityMaximum,
      applied: modeHuntabilityApplied,
    },
    outflowExhaustion: {
      meaning: 'ACTUAL_STRONG_OUTBOUND_CURRENT_EXHAUSTS_TRANSPORT_AND_FORCES_FINAL_SCORE_TO_ZERO',
      trigger: 'ACTUAL_OUTBOUND_TRANSPORT_WITH_ZERO_TRANSPORT_POTENTIAL',
      applied: outflowExhaustionGateApplied,
      scoreBeforeGate: scoreBeforeOutflowExhaustionGate,
      scoreAfterGate: finalScore,
      explanationDa: outflowExhaustionGateApplied
        ? CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA
        : null,
    },
    uncoupledScore,
    finalScore,
    siteSuitabilityIncluded: false,
    safetyAdviceIncluded: false,
    publicActivationAllowed: false,
  };
}

function currentLedTransportAndDelivery(base, memory, variant, context) {
  if (!variant.currentLedTransportPotential) return null;
  if (!finite(memory?.transportPotential)) return null;
  const transportPotential = clamp(memory.transportPotential);
  const eventTimingReadiness = finite(base.diagnostics?.eventTimingScore)
    ? clamp(base.diagnostics.eventTimingScore) / 100
    : 0.5;
  const waveApproach = evaluateWaveApproachSupport({
    weather: context?.weather,
    onshoreDirectionDeg: context?.zone?.onshoreDirectionDeg,
  });
  const waveLandingSupport = finite(base.diagnostics?.waveApproachSupportScore)
    ? base.diagnostics.waveApproachSupportScore
    : waveApproach.available
      ? waveApproach.supportScore
      : null;
  const waveLandingReadiness = finite(waveLandingSupport)
    ? clamp(waveLandingSupport) / 100
    : 0.5;
  const landingReadiness = 0.60 * eventTimingReadiness + 0.40 * waveLandingReadiness;
  const waveLandingMaximumShare = clamp(variant.waveLandingMaximumShare, 0, 1);
  const deliveryFactor = (1 - waveLandingMaximumShare)
    + waveLandingMaximumShare * landingReadiness;
  const delivery = transportPotential * deliveryFactor;
  const transportAndDelivery = 0.65 * transportPotential + 0.35 * delivery;
  return {
    transportPotential,
    delivery,
    transportAndDelivery,
    eventTimingReadiness,
    waveLandingReadiness,
    landingReadiness,
    deliveryFactor,
    waveLandingMaximumShare,
    outboundEpisodeEffectiveHours: finite(memory.outboundEpisodeEffectiveHours)
      ? Math.max(0, Number(memory.outboundEpisodeEffectiveHours))
      : 0,
    outboundEpisodeLossPoints: finite(memory.outboundEpisodeLossPoints)
      ? clamp(memory.outboundEpisodeLossPoints)
      : 0,
    actualOutboundTransport: memory.actualOutboundTransport === true,
  };
}

function approvedNativeCadenceHold(context, hold, variant) {
  if (!variant.currentLedTransportPotential
    || hold?.transition !== 'NATIVE_CADENCE_HOLD'
    || hold?.transportMemoryReady !== true
    || hold?.transportMemoryStatus !== 'READY'
    || Number(hold?.maximumHoldHours) !== 3) return false;
  const evaluatedAt = Date.parse(hold?.evaluatedAt ?? '');
  const referenceAt = Date.parse(hold?.referenceAt ?? '');
  const ageHours = (evaluatedAt - referenceAt) / 3_600_000;
  if (!(Number.isFinite(ageHours) && ageHours > 0 && ageHours <= 3)) return false;
  const weather = context?.weather ?? {};
  return [
    weather.currentUMps,
    weather.currentVMps,
    weather.currentSpeedMps,
    weather.currentDirectionDeg,
    weather.currentAlignment,
    weather.currentAlignmentScore,
  ].every(value => !finite(value));
}

/**
 * Score-neutral Candidate G research evaluator.
 *
 * Legacy variants modulate Candidate E's existing physical path. The newer
 * current-led revision instead receives a causal 0-100 transport reservoir:
 * current builds or erodes it, while waves can only modulate dependent landing.
 * All variants remain diagnostic-only. The current-led RESEARCH-2 revision
 * distinguishes unknown/start-zero potential from documented outbound
 * exhaustion and only the latter forces the final candidate score to zero.
 */
export function evaluateRavScoreCandidateG(
  context = {},
  {
    variantId = 'G-50-50-LIN',
    memory = {},
    includeDirectWind = true,
    historyGain = 0.40,
    historyMix = CANDIDATE_G_HISTORY_MIX,
    nativeCadenceHold = null,
  } = {},
) {
  const variant = CANDIDATE_G_VARIANTS[variantId];
  if (!variant) throw new Error(`Unknown Candidate G variant: ${variantId}`);
  const base = evaluatePhaseDWaveProcessCandidate(context);
  const nativeCadenceHoldUsed = !base.available
    && base.reason === 'MISSING_REQUIRED_PHASE_D_COMPONENT'
    && approvedNativeCadenceHold(context, nativeCadenceHold, variant);
  if (!base.available && !nativeCadenceHoldUsed) return base;
  if (!(finite(historyGain) && Number(historyGain) >= 0 && Number(historyGain) <= 1)) {
    throw new Error('Candidate G historyGain must be between zero and one');
  }
  const mix = normalizeHistoryMix(historyMix);
  const resolvedIncludeDirectWind = variant.directWindIncluded === false ? false : includeDirectWind;
  const currentState = memoryState(memory.current);
  const waveState = memoryState(memory.wave);
  const directWindState = resolvedIncludeDirectWind ? memoryState(memory.directWind) : null;
  if (!variant.currentLedTransportPotential && (currentState === null || waveState === null)) {
    return {
      ...base,
      available: false,
      score: null,
      scoreImpact: 'diagnostic-only',
      reason: 'MISSING_REQUIRED_CANDIDATE_G_MEMORY',
    };
  }

  const directWindContribution = directWindState === null ? 0 : mix.directWind * directWindState;
  const currentLedTransport = currentLedTransportAndDelivery(base, memory, variant, context);
  if (variant.currentLedTransportPotential && currentLedTransport === null) {
    return {
      ...base,
      available: false,
      score: null,
      scoreImpact: 'diagnostic-only',
      reason: 'MISSING_REQUIRED_CURRENT_LED_TRANSPORT_POTENTIAL',
    };
  }
  const mobilisationMemory = variant.waveMobilisationMemory ? {
    mobilisationPotential: finite(memory.mobilisationPotential)
      ? clamp(memory.mobilisationPotential)
      : null,
    waveEnergyProxy: finite(memory.waveEnergyProxy) ? Math.max(0, Number(memory.waveEnergyProxy)) : null,
    waveEnergyScore: finite(memory.waveEnergyScore) ? clamp(memory.waveEnergyScore) : null,
    transition: memory.waveMobilisationTransition || null,
    buildHalfLifeHours: finite(memory.waveMobilisationBuildHalfLifeHours)
      ? Number(memory.waveMobilisationBuildHalfLifeHours)
      : null,
    decayHalfLifeHours: finite(memory.waveMobilisationDecayHalfLifeHours)
      ? Number(memory.waveMobilisationDecayHalfLifeHours)
      : null,
  } : null;
  if (variant.waveMobilisationMemory && mobilisationMemory.mobilisationPotential === null) {
    return {
      ...base,
      available: false,
      score: null,
      scoreImpact: 'diagnostic-only',
      reason: 'MISSING_REQUIRED_WAVE_MOBILISATION_STATE',
    };
  }
  const directionalHistorySignal = currentLedTransport === null
    ? clamp(mix.current * currentState + mix.wave * waveState + directWindContribution, -1, 1)
    : null;
  const historyFactor = currentLedTransport === null
    ? clamp(1 + Number(historyGain) * directionalHistorySignal, 0, 2)
    : 1;
  const baseTransportAndDelivery = finite(base.components?.transportAndDelivery)
    ? Number(base.components.transportAndDelivery)
    : null;
  const transportAndDelivery = currentLedTransport === null
    ? clamp(baseTransportAndDelivery * historyFactor)
    : currentLedTransport.transportAndDelivery;
  const huntabilityResult = variant.huntabilityProfile
    ? evaluatePhaseDHuntability(context.mode || 'beach', context.weather || {}, {
      profile: variant.huntabilityProfile,
    })
    : null;
  if (nativeCadenceHoldUsed && !finite(huntabilityResult?.value)) {
    return {
      ...base,
      available: false,
      score: null,
      scoreImpact: 'diagnostic-only',
      reason: 'MISSING_REQUIRED_NATIVE_CADENCE_HUNTABILITY',
    };
  }
  const huntability = round(huntabilityResult?.value ?? base.components?.huntability);
  const mobilisation = mobilisationMemory === null
    ? Number(base.components.mobilisation)
    : mobilisationMemory.mobilisationPotential;
  const additiveScore = huntability * CANDIDATE_G_WEIGHTS.huntability
    + transportAndDelivery * CANDIDATE_G_WEIGHTS.transportAndDelivery
    + mobilisation * CANDIDATE_G_WEIGHTS.mobilisation;
  const weakestPhysicalStage = Math.min(transportAndDelivery, mobilisation);
  const gateFactor = physicalBottleneckGate(weakestPhysicalStage);
  const uncoupledCandidateG = round(additiveScore * gateFactor);
  const wadersHuntabilityMaximum = variant.wadersHuntabilityLimit && context.mode === 'waders'
    ? huntability
    : null;
  const scoreBeforeOutflowExhaustionGate = wadersHuntabilityMaximum === null
    ? uncoupledCandidateG
    : Math.min(uncoupledCandidateG, wadersHuntabilityMaximum);
  const outflowExhaustionGateApplied = currentLedTransport?.actualOutboundTransport === true
    && currentLedTransport.transportPotential === 0;
  const candidateG = outflowExhaustionGateApplied
    ? 0
    : scoreBeforeOutflowExhaustionGate;
  const modeHuntabilityApplied = wadersHuntabilityMaximum !== null
    && scoreBeforeOutflowExhaustionGate < uncoupledCandidateG;
  const scoreCalculation = {
    components: {
      huntability,
      transportAndDelivery,
      mobilisation,
    },
    weights: CANDIDATE_G_WEIGHTS,
    weightedContributions: {
      huntability: huntability * CANDIDATE_G_WEIGHTS.huntability,
      transportAndDelivery: transportAndDelivery * CANDIDATE_G_WEIGHTS.transportAndDelivery,
      mobilisation: mobilisation * CANDIDATE_G_WEIGHTS.mobilisation,
    },
    additiveScore,
    gateFactor,
    gatedScore: additiveScore * gateFactor,
    uncoupledRoundedScore: uncoupledCandidateG,
    modeHuntabilityPolicy: wadersHuntabilityMaximum === null
      ? 'UNCHANGED'
      : 'VISIBLE_WADERS_HUNTABILITY_MAXIMUM',
    modeHuntabilityMaximum: wadersHuntabilityMaximum,
    modeHuntabilityApplied,
    scoreBeforeOutflowExhaustionGate,
    outflowExhaustionGateApplied,
    outflowExhaustionExplanationDa: outflowExhaustionGateApplied
      ? CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA
      : null,
    roundedScore: candidateG,
  };
  const researchExplanation = buildResearchExplanation({
    mode: context.mode || 'beach',
    components: scoreCalculation.components,
    weightedContributions: scoreCalculation.weightedContributions,
    additiveScore,
    gateFactor,
    directionalHistorySignal,
    historyFactor,
    uncoupledScore: uncoupledCandidateG,
    finalScore: candidateG,
    modeHuntabilityPolicy: scoreCalculation.modeHuntabilityPolicy,
    modeHuntabilityMaximum: wadersHuntabilityMaximum,
    modeHuntabilityApplied,
    currentLedTransport,
    scoreBeforeOutflowExhaustionGate,
    outflowExhaustionGateApplied,
    mobilisationMemory,
    nativeCadenceHoldUsed,
  });
  const limitations = new Set(base.confidence?.limitations || []);
  limitations.add('directional-history-is-research-prior');
  limitations.add('history-gain-is-uncalibrated');
  limitations.add('no-find-outcome-calibration');
  if (directWindState === null) limitations.add('direct-wind-history-omitted');
  if (variant.huntabilityProfile) limitations.add('waders-wind-curve-is-owner-prior');
  if (variant.wadersHuntabilityLimit) limitations.add('waders-huntability-limit-is-owner-prior');
  if (variant.currentLedTransportPotential) {
    limitations.add('current-led-transport-potential-is-owner-prior');
    limitations.add('outbound-eight-points-per-effective-hour-is-owner-prior');
    limitations.add('inbound-ten-points-per-effective-hour-follows-shadow-state-requirement');
    limitations.add('current-normal-speed-thresholds-are-uncalibrated-research-priors');
    limitations.add('initial-transport-potential-is-unobserved-at-replay-boundary');
    limitations.add('wave-landing-share-is-uncalibrated-secondary-prior');
    limitations.add('actual-outbound-exhaustion-zero-gate-is-owner-prior');
  }
  if (variant.waveMobilisationMemory) {
    limitations.add('wave-mobilisation-energy-is-relative-proxy');
    limitations.add('wave-mobilisation-build-and-decay-are-uncalibrated-research-priors');
    limitations.add('nearshore-wave-transformation-unmodelled');
    limitations.add('direct-wind-and-current-speed-are-excluded-from-mobilisation-score');
    limitations.add('initial-mobilisation-potential-is-unobserved-at-replay-boundary');
  }
  if (nativeCadenceHoldUsed) {
    limitations.add('native-cadence-hold-uses-last-derived-transport-without-current-vector');
  }

  return {
    ...base,
    available: true,
    reason: null,
    score: candidateG,
    scoreImpact: 'diagnostic-only',
    modelVersion: variant.modelId,
    components: {
      ...base.components,
      huntability,
      ...(currentLedTransport ? {
        transport: round(currentLedTransport.transportPotential),
        delivery: round(currentLedTransport.delivery),
      } : {}),
      transportAndDelivery: round(transportAndDelivery),
      ...(mobilisationMemory ? { mobilisation: round(mobilisation) } : {}),
    },
    candidateScores: {
      ...base.candidateScores,
      candidateG,
    },
    candidateDefinitions: {
      ...base.candidateDefinitions,
      candidateG: currentLedTransport
        ? variant.waveMobilisationMemory
          ? 'Current-led transport plus a causal wave-energy mobilisation state without additive wind/current points, an actual-outbound-exhaustion final-score gate, 20/50/30 weights and the same mild physical bottleneck'
          : 'Current-led transport potential with immediate strength-scaled outbound loss, an actual-outbound-exhaustion final-score gate, secondary dependent wave landing, 20/50/30 weights and the same mild physical bottleneck'
        : 'Candidate E process path with capacity-preserving causal direction memory, 20/50/30 weights and the same mild physical bottleneck',
    },
    additiveScore: Number(additiveScore.toFixed(3)),
    scoreCalculation,
    researchExplanation,
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
      candidateGHuntabilityProfile: variant.huntabilityProfile || PHASE_D_HUNTABILITY_PROFILES.BASELINE,
      candidateGWadersHuntabilityLimit: variant.wadersHuntabilityLimit === true,
      candidateGUncoupledScore: uncoupledCandidateG,
      candidateGScoreBeforeOutflowExhaustionGate: scoreBeforeOutflowExhaustionGate,
      candidateGOutflowExhaustionGateApplied: outflowExhaustionGateApplied,
      candidateGOutflowExhaustionExplanationDa: outflowExhaustionGateApplied
        ? CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA
        : null,
      candidateGWadersHuntabilityMaximum: wadersHuntabilityMaximum,
      candidateGHuntabilityWindScore: huntabilityResult?.windScore ?? null,
      candidateGHuntabilityWaveScore: huntabilityResult?.waveScore ?? null,
      candidateGHuntabilityWavePenalty: huntabilityResult?.wavePenalty ?? null,
      candidateGHuntabilityWindHardStopApplied: huntabilityResult?.windHardStopApplied ?? false,
      candidateGDirectionalHistorySignal: directionalHistorySignal === null
        ? null
        : Number(directionalHistorySignal.toFixed(6)),
      candidateGHistoryFactor: Number(historyFactor.toFixed(6)),
      candidateGCurrentLedTransportPotential: currentLedTransport?.transportPotential ?? null,
      candidateGCurrentLedDelivery: currentLedTransport?.delivery ?? null,
      candidateGWaveLandingMaximumShare: currentLedTransport?.waveLandingMaximumShare ?? null,
      candidateGOutboundEpisodeEffectiveHours: currentLedTransport?.outboundEpisodeEffectiveHours ?? null,
      candidateGOutboundEpisodeLossPoints: currentLedTransport?.outboundEpisodeLossPoints ?? null,
      candidateGActualOutboundTransport: currentLedTransport?.actualOutboundTransport ?? false,
      candidateGNativeCadenceHoldUsed: nativeCadenceHoldUsed,
      candidateGWaveMobilisationMemoryIncluded: mobilisationMemory !== null,
      candidateGWaveMobilisationPotential: mobilisationMemory?.mobilisationPotential ?? null,
      candidateGWaveMobilisationEnergyProxy: mobilisationMemory?.waveEnergyProxy ?? null,
      candidateGWaveMobilisationEnergyScore: mobilisationMemory?.waveEnergyScore ?? null,
      candidateGWaveMobilisationTransition: mobilisationMemory?.transition ?? null,
      candidateGWaveMobilisationBuildHalfLifeHours: mobilisationMemory?.buildHalfLifeHours ?? null,
      candidateGWaveMobilisationDecayHalfLifeHours: mobilisationMemory?.decayHalfLifeHours ?? null,
      candidateGBaseTransportAndDelivery: baseTransportAndDelivery,
      scoreIsSafetyAdvice: false,
      automaticActivationAllowed: false,
    },
  };
}
