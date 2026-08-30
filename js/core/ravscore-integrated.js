import {
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MODEL_ID,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_WEIGHTS,
  ravScoreModelBinding,
} from './ravscore-model-contract.js';
import { evaluateIntegratedHuntability } from './ravscore-huntability.js';
import { waveMobilisationEnergy } from './ravscore-mobilisation-memory.js';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const number = value => finite(value) ? value : null;
const potential = value => finite(value) && value >= 0 && value <= 100
  ? value
  : null;
const nonNegative = value => finite(value) && value >= 0 ? value : null;
const direction = value => finite(value) && value >= 0 && value < 360
  ? value
  : null;
const clamp = (value, minimum = 0, maximum = 100) =>
  Math.max(minimum, Math.min(maximum, Number(value)));
const rounded = (value, digits = 6) => Number(Number(value).toFixed(digits));

function angularDifference(left, right) {
  const difference = Math.abs((((left - right) % 360) + 360) % 360);
  return Math.min(difference, 360 - difference);
}

const FALLING_CURRENT_RELATIONS = Object.freeze({
  OUTBOUND: 'OUTBOUND',
  INBOUND: 'INBOUND',
  ALONG_OR_WEAK: 'ALONG_OR_WEAK',
  UNKNOWN_OR_NATIVE_HOLD: 'UNKNOWN_OR_NATIVE_HOLD',
});

function fallingCurrentRelation({
  currentCoastNormalSpeedMps = null,
  currentSupply = null,
  currentAlignment = null,
  currentVerified = false,
  currentTransition = null,
} = {}) {
  if (currentTransition === 'NATIVE_CADENCE_HOLD' || currentVerified !== true) {
    return FALLING_CURRENT_RELATIONS.UNKNOWN_OR_NATIVE_HOLD;
  }
  const exactCoastNormalSpeed = number(currentCoastNormalSpeedMps);
  const coastNormalSupplyMps = exactCoastNormalSpeed !== null
    ? exactCoastNormalSpeed
    : nonNegative(currentSupply) !== null
      && number(currentAlignment) !== null
      && currentAlignment >= -1
      && currentAlignment <= 1
      ? currentSupply * currentAlignment
      : null;
  if (coastNormalSupplyMps === null) {
    return FALLING_CURRENT_RELATIONS.UNKNOWN_OR_NATIVE_HOLD;
  }
  const deadbandMps = RAVSCORE_MODEL_CONTRACT.currentSupply.deadbandNormalSpeedMps;
  if (coastNormalSupplyMps < -deadbandMps) return FALLING_CURRENT_RELATIONS.OUTBOUND;
  if (coastNormalSupplyMps > deadbandMps) return FALLING_CURRENT_RELATIONS.INBOUND;
  return FALLING_CURRENT_RELATIONS.ALONG_OR_WEAK;
}

export function classifyWaterLevelContext(weather = {}, currentContext = {}) {
  const level = number(weather?.waterLevelCm);
  const trend = number(weather?.waterLevelTrendCm3h);
  const currentRelation = fallingCurrentRelation(currentContext);
  if (level === null && trend === null) return Object.freeze({
    available: false,
    phase: 'UNKNOWN',
    interpretationCode: 'WATER_CONTEXT_UNKNOWN',
    jointContextCode: 'WATER_UNKNOWN_CURRENT_NOT_INTERPRETED',
    currentRelation,
    currentRelationDeadbandMps: RAVSCORE_MODEL_CONTRACT.currentSupply.deadbandNormalSpeedMps,
    trendSemantics: 'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE',
    scoreEffectPoints: 0,
    transportEffect: 'NONE',
  });
  const phase = trend === null ? 'UNKNOWN'
    : trend < 0 ? 'FALLING'
      : trend > 0 ? 'RISING'
        : 'STABLE';
  return Object.freeze({
    available: true,
    phase,
    interpretationCode: phase === 'FALLING'
      ? 'FALLING_CAN_EXPOSE_RETAINED_AMBER_AND_CAN_COINCIDE_WITH_SEAWARD_FLOW'
      : phase === 'RISING'
        ? 'RISING_CHANGES_ACCESS_WITHOUT_PROVING_INWARD_TRANSPORT'
        : phase === 'STABLE'
          ? 'STABLE_WATER_CONTEXT_ONLY'
          : 'LEVEL_KNOWN_TREND_UNKNOWN',
    jointContextCode: phase === 'FALLING'
      ? `FALLING_WITH_${currentRelation}_CURRENT_CONTEXT`
      : `${phase}_CURRENT_NOT_INTERPRETED_AS_TIDAL_PHASE`,
    currentRelation,
    currentRelationDeadbandMps: RAVSCORE_MODEL_CONTRACT.currentSupply.deadbandNormalSpeedMps,
    trendSemantics: 'FORWARD_3H_MODEL_CHANGE_NOT_TIDAL_PHASE',
    scoreEffectPoints: 0,
    transportEffect: 'NONE',
  });
}

export function evaluateIntegratedLastMile({
  supplyPotential,
  weather = {},
  onshoreDirectionDeg = null,
} = {}) {
  const supply = potential(supplyPotential);
  if (supply === null) return {
    available: false,
    status: finite(supplyPotential) ? 'SUPPLY_POTENTIAL_INVALID' : 'SUPPLY_POTENTIAL_MISSING',
    transportPotential: null,
    factor: null,
    transport: null,
  };
  const waveHeightM = nonNegative(weather?.waveHeightM);
  const wavePeriodS = nonNegative(weather?.wavePeriodS);
  if (waveHeightM === null || wavePeriodS === null) return {
    available: false,
    status: 'LAST_MILE_WAVE_CONTEXT_NOT_READY',
    transportPotential: supply,
    factor: null,
    transport: null,
    scoreEffect: RAVSCORE_LAST_MILE_POLICY.scoreEffect,
    physicalDeliveryResolved: false,
    plausibleTransportRange: null,
    structuralUncertainty: true,
    missing: [
      ...(waveHeightM === null ? ['wave-height'] : []),
      ...(wavePeriodS === null ? ['wave-period'] : []),
    ],
  };
  const energy = waveMobilisationEnergy({ waveHeightM, wavePeriodS });
  const directionFrom = direction(weather?.waveDirectionDeg);
  const onshore = direction(onshoreDirectionDeg);
  const directionKnown = directionFrom !== null && onshore !== null;
  const waveToward = directionKnown ? (directionFrom + 180) % 360 : null;
  const differenceDeg = directionKnown ? angularDifference(waveToward, onshore) : null;
  const alignment = differenceDeg === null
    ? null
    : Math.cos(differenceDeg * Math.PI / 180);
  return {
    available: true,
    status: directionKnown
      ? 'LAST_MILE_UNRESOLVED_SCORE_NEUTRAL'
      : 'LAST_MILE_UNRESOLVED_SCORE_NEUTRAL_DIRECTION_UNKNOWN',
    transportPotential: supply,
    factor: RAVSCORE_LAST_MILE_POLICY.deliveryFactor,
    transport: supply,
    scoreEffect: RAVSCORE_LAST_MILE_POLICY.scoreEffect,
    physicalDeliveryResolved: false,
    waveEnergyScore: energy.energyScore,
    alignment,
    directionDifferenceDeg: differenceDeg,
    plausibleTransportRange: null,
    structuralUncertainty: true,
    missing: [
      ...(directionFrom === null ? ['wave-direction'] : []),
      ...(onshore === null ? ['onshore-direction'] : []),
    ],
  };
}

function unavailable(reason, state = {}) {
  return {
    available: false,
    score: null,
    reason,
    modelVersion: RAVSCORE_MODEL_ID,
    modelBinding: ravScoreModelBinding(),
    readiness: {
      current: state?.currentMemoryStatus ?? null,
      wave: state?.waveMemoryStatus ?? null,
    },
  };
}

export function evaluateRavScoreIntegrated(
  { mode = 'beach', weather = {}, zone = {} } = {},
  { state = null } = {},
) {
  if (!['beach', 'waders'].includes(mode)) throw new Error(`Unknown hunting mode: ${mode}`);
  if (state?.currentMemoryReady !== true
    || !RAVSCORE_MODEL_CONTRACT.currentSupply.readyStatuses
      .includes(state?.currentMemoryStatus)
    || potential(state?.supplyPotential) === null) {
    return unavailable('CURRENT_SUPPLY_STATE_NOT_READY', state);
  }
  if (state?.waveMemoryReady !== true
    || !RAVSCORE_MODEL_CONTRACT.waveMobilisation.readyStatuses
      .includes(state?.waveMemoryStatus)
    || potential(state?.mobilisationPotential) === null) {
    return unavailable('WAVE_MOBILISATION_STATE_NOT_READY', state);
  }

  const huntability = evaluateIntegratedHuntability(mode, weather);
  if (!huntability.available || !finite(huntability.value)) {
    return unavailable(huntability.reason ?? 'HUNTABILITY_NOT_READY', state);
  }
  const lastMile = evaluateIntegratedLastMile({
    supplyPotential: state.supplyPotential,
    weather,
    onshoreDirectionDeg: zone?.onshoreDirectionDeg,
  });
  if (!lastMile.available || !finite(lastMile.transport)) {
    return unavailable('LAST_MILE_TRANSPORT_NOT_READY', state);
  }

  const components = {
    huntability: clamp(huntability.value),
    transport: clamp(lastMile.transport),
    mobilisation: clamp(state.mobilisationPotential),
  };
  const weightedContributions = {
    huntability: components.huntability * RAVSCORE_WEIGHTS.huntability,
    transport: components.transport * RAVSCORE_WEIGHTS.transport,
    mobilisation: components.mobilisation * RAVSCORE_WEIGHTS.mobilisation,
  };
  const rawScore = Object.values(weightedContributions).reduce((sum, value) => sum + value, 0);
  const roundedScore = Math.round(clamp(rawScore));
  const wadersHuntabilityMaximum = mode === 'waders'
    ? Math.round(clamp(components.huntability))
    : null;
  const finalScore = wadersHuntabilityMaximum === null
    ? roundedScore
    : Math.min(roundedScore, wadersHuntabilityMaximum);
  const wadersLimitApplied = wadersHuntabilityMaximum !== null && finalScore < roundedScore;
  const currentSpeedMps = nonNegative(weather?.currentSpeedMps);
  const currentDirectionDeg = direction(weather?.currentDirectionDeg);
  const onshoreDirectionDeg = direction(zone?.onshoreDirectionDeg);
  const currentAlignment = currentDirectionDeg === null || onshoreDirectionDeg === null
    ? null
    : Math.cos(angularDifference(currentDirectionDeg, onshoreDirectionDeg) * Math.PI / 180);
  const waterLevelContext = classifyWaterLevelContext(weather, {
    currentCoastNormalSpeedMps: state?.currentCoastNormalSpeedMps ?? null,
    currentSupply: currentSpeedMps,
    currentAlignment,
    currentVerified: state?.currentVerified === true,
    currentTransition: state?.currentTransition ?? null,
  });
  const limitations = [
    'LOCAL_AMBER_INVENTORY_UNOBSERVED',
    'LOCAL_BATHYMETRY_NOT_INCLUDED',
    'SURF_ZONE_UNRESOLVED',
    'NOT_CALIBRATED_TO_REPRESENTATIVE_FINDS',
  ];
  limitations.push('LAST_MILE_STRUCTURAL_UNCERTAINTY');
  if (lastMile.status === 'LAST_MILE_UNRESOLVED_SCORE_NEUTRAL_DIRECTION_UNKNOWN') {
    limitations.push('LAST_MILE_DIRECTION_UNKNOWN');
  }

  const scoreCalculation = {
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    weights: RAVSCORE_WEIGHTS,
    weightedContributions: Object.fromEntries(
      Object.entries(weightedContributions).map(([key, value]) => [key, rounded(value)]),
    ),
    rawScore: rounded(rawScore),
    roundedScore,
    roundingDelta: rounded(roundedScore - rawScore),
    wadersHuntabilityMaximum,
    wadersHuntabilityLimitApplied: wadersLimitApplied,
    finalScore,
  };

  return {
    available: true,
    score: finalScore,
    modelVersion: RAVSCORE_MODEL_ID,
    modelBinding: ravScoreModelBinding(),
    components,
    scoreCalculation,
    diagnostics: {
      supplyPotential: state.supplyPotential,
      currentReferenceAt: state.currentReferenceAt ?? null,
      currentMemoryStatus: state.currentMemoryStatus ?? null,
      waveLastVerifiedAt: state.waveLastVerifiedAt ?? null,
      waveMemoryStatus: state.waveMemoryStatus ?? null,
      lastMile,
      huntability,
      waterLevelContext,
    },
    explanation: {
      ...ravScoreModelBinding(),
      schemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
      scoreMeaning: mode === 'waders'
        ? 'MODELLED_AMBER_OPPORTUNITY_FOR_WADERS_LIMITED_BY_CURRENT_METHOD_HUNTABILITY'
        : 'MODELLED_AMBER_OPPORTUNITY_FOR_BEACH_SEARCH',
      componentOrder: ['transport', 'mobilisation', 'huntability'],
      components: {
        huntability: {
          value: rounded(components.huntability),
          weight: RAVSCORE_WEIGHTS.huntability,
          weightedContribution: scoreCalculation.weightedContributions.huntability,
          meaning: 'CURRENT_SEARCH_EFFECTIVENESS_FOR_SELECTED_METHOD_NOT_SAFETY_ADVICE',
        },
        transport: {
          value: rounded(components.transport),
          weight: RAVSCORE_WEIGHTS.transport,
          weightedContribution: scoreCalculation.weightedContributions.transport,
          meaning: 'RECENT_VERIFIED_GRID_CURRENT_SUPPLY_EVIDENCE_LAST_MILE_UNRESOLVED_SCORE_NEUTRAL',
        },
        mobilisation: {
          value: rounded(components.mobilisation),
          weight: RAVSCORE_WEIGHTS.mobilisation,
          weightedContribution: scoreCalculation.weightedContributions.mobilisation,
          meaning: 'RELATIVE_WAVE_ENERGY_MOBILISATION_MEMORY',
        },
      },
      scoreCalculation,
      currentSemantics: 'VERIFIED_MODEL_GRID_CURRENT_NOT_SURF_ZONE_UNDERTOW_OR_RIP_CURRENT',
      lastMileSemantics: lastMile.status,
      waterLevelContext,
      limitations,
      safetyAdviceIncluded: false,
      findProbability: false,
    },
    confidence: {
      dataStatus: lastMile.missing.includes('wave-direction')
        || lastMile.missing.includes('onshore-direction')
        ? 'READY_WITH_STRUCTURAL_AND_DIRECTION_UNCERTAINTY'
        : 'READY_WITH_STRUCTURAL_LAST_MILE_UNCERTAINTY',
      modelMaturity: RAVSCORE_MODEL_CONTRACT.uncertainty.modelMaturity,
      modelConfidence: 'low',
      limitations,
    },
  };
}
