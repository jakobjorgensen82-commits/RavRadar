import {
  PHASE_D_HUNTABILITY_PROFILES,
  evaluatePhaseDHuntability,
} from './phase-d-process-candidate.js';
import { evaluateWaveApproachSupport } from './wave-approach.js?v=4.0.306';
import {
  NEXT_RAVSCORE_CONTRACT_VERSION,
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  NEXT_RAVSCORE_VARIANT_ID,
} from './ravscore-next-generation-contract.js';
export {
  NEXT_RAVSCORE_CONTRACT_VERSION,
  NEXT_RAVSCORE_MODEL_ID,
  NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
  NEXT_RAVSCORE_VARIANT_ID,
} from './ravscore-next-generation-contract.js';

export const NEXT_RAVSCORE_PRIORS = Object.freeze({
  huntabilityMaximumShare: 0.20,
  waveDirectionMaximumReduction: 0.20,
  missingWaveDirectionPolicy: 'NEUTRAL_MIDPOINT_WITH_EXPLICIT_UNCERTAINTY',
  waterLevelPolicy: 'BOUNDED_FALLING_WATER_SEARCH_FOCUS_WITHOUT_FLOW_VECTOR',
  surfZonePolicy: 'UNRESOLVED_WITHOUT_LOCAL_BATHYMETRY',
  coastalSupplyBuildHalfLifeHours: 6.578813,
  coastalSupplyOutflowAttenuationHalfLifeHours: 8.312951,
  categoricalOutflowExhaustionGate: false,
  tidePhaseSupplyImpact: 0,
  fallingWaterSearchFocusStartCm3h: -3,
  fallingWaterSearchFocusFullCm3h: -15,
  fallingWaterSearchFocusMaximumHuntabilityPoints: 10,
});

const finite = value => value !== null
  && value !== undefined
  && value !== ''
  && typeof value !== 'boolean'
  && Number.isFinite(Number(value));
const clamp = (value, minimum = 0, maximum = 100) => Math.max(minimum, Math.min(maximum, Number(value)));
const round = value => Math.round(clamp(value));

function unavailable(reason, limitations = []) {
  return {
    available: false,
    score: null,
    reason,
    modelVersion: NEXT_RAVSCORE_MODEL_ID,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    variantId: NEXT_RAVSCORE_VARIANT_ID,
    contractVersion: NEXT_RAVSCORE_CONTRACT_VERSION,
    stateSchemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
    confidence: {
      modelMaturity: 'physics-informed-not-find-calibrated',
      modelConfidence: 'bounded-structural-prior',
      limitations: [...new Set(limitations)],
    },
  };
}

function waterLevelContext(weather = {}) {
  const levelCm = finite(weather.waterLevelCm) ? Number(weather.waterLevelCm) : null;
  const trendCm3h = finite(weather.waterLevelTrendCm3h) ? Number(weather.waterLevelTrendCm3h) : null;
  let phase = 'UNKNOWN';
  if (trendCm3h !== null) {
    if (trendCm3h >= 3) phase = 'RISING';
    else if (trendCm3h <= -3) phase = 'FALLING';
    else phase = 'NEAR_STEADY';
  }
  const start = Math.abs(NEXT_RAVSCORE_PRIORS.fallingWaterSearchFocusStartCm3h);
  const full = Math.abs(NEXT_RAVSCORE_PRIORS.fallingWaterSearchFocusFullCm3h);
  const fallingMagnitude = trendCm3h !== null && trendCm3h < 0 ? Math.abs(trendCm3h) : 0;
  const fallingSearchFocusFactor = fallingMagnitude <= start
    ? 0
    : clamp((fallingMagnitude - start) / (full - start), 0, 1);
  const huntabilityBonusPoints = NEXT_RAVSCORE_PRIORS.fallingWaterSearchFocusMaximumHuntabilityPoints
    * fallingSearchFocusFactor;
  return {
    levelCm,
    trendCm3h,
    phase,
    fallingSearchFocusPotential: Number((fallingSearchFocusFactor * 100).toFixed(6)),
    huntabilityBonusPoints: Number(huntabilityBonusPoints.toFixed(6)),
    scoreImpact: {
      coastalSupply: 0,
      mobilisation: 0,
      nearshoreSupport: 0,
      huntabilityBonusPoints: Number(huntabilityBonusPoints.toFixed(6)),
    },
    meaning: 'BOUNDED_CONDITIONAL_SEARCH_FOCUS_FROM_EXPOSURE_OR_BAR_TROUGH_CONCENTRATION',
    gridCurrentVectorAdded: false,
    localBarOrTroughObserved: false,
    seawardLossBeyondSurfZoneClaimed: false,
    empiricalCalibrationClaimed: false,
  };
}

function nearshoreDelivery({ context, mobilisationPotential }) {
  const wave = evaluateWaveApproachSupport({
    weather: context?.weather,
    onshoreDirectionDeg: context?.zone?.onshoreDirectionDeg,
  });
  const mobilisationFraction = clamp(mobilisationPotential) / 100;
  const directionalFactor = wave.available ? clamp(wave.directionalFactor, 0, 1) : 0.5;
  // Wave energy is already represented by the mobilisation state. Direction can
  // only reduce the unresolved last-delivery support and can never add a second
  // energy bonus. Missing direction uses the midpoint and is exposed below.
  const maximumReduction = NEXT_RAVSCORE_PRIORS.waveDirectionMaximumReduction * mobilisationFraction;
  const factor = 1 - maximumReduction * (1 - directionalFactor);
  return {
    factor,
    supportScore: factor * 100,
    directionalFactor,
    waveApproachAvailable: wave.available,
    waveApproachMissing: wave.missing || [],
    waveDirectionFromDeg: wave.waveDirectionFromDeg ?? null,
    waveDirectionTowardDeg: wave.waveDirectionTowardDeg ?? null,
    waveOnshoreDifferenceDeg: wave.differenceDeg ?? null,
    meaning: 'BOUNDED_NEARSHORE_SUPPORT_NOT_SURF_ZONE_FLOW_OR_BEACHING_PROBABILITY',
    surfZoneResolved: false,
  };
}

/**
 * One causal public-model candidate built from RavRadar's compact derived state.
 *
 * `transportPotential` is interpreted as documented coastal supply potential,
 * not an observed amber inventory. `mobilisationPotential` is a relative wave-
 * energy state. Their geometric mean makes both physical stages necessary.
 * Huntability modulates the physical opportunity afterwards and cannot create
 * a positive RavScore on its own.
 */
export function evaluateNextGenerationRavScore(
  context = {},
  { memory = {}, nativeCadenceHold = null } = {},
) {
  if (!finite(memory.transportPotential)) {
    return unavailable('MISSING_REQUIRED_COASTAL_SUPPLY_STATE', [
      'coastal-supply-state-missing',
    ]);
  }
  if (!finite(memory.mobilisationPotential)) {
    return unavailable('MISSING_REQUIRED_WAVE_MOBILISATION_STATE', [
      'wave-mobilisation-state-missing',
    ]);
  }

  const mode = context.mode === 'waders' ? 'waders' : 'beach';
  const huntabilityResult = evaluatePhaseDHuntability(mode, context.weather || {}, {
    profile: PHASE_D_HUNTABILITY_PROFILES.WADERS_WIND_LED_WAVE_20,
  });
  if (!finite(huntabilityResult.value)) {
    return unavailable('MISSING_REQUIRED_HUNTABILITY', ['huntability-input-missing']);
  }

  const coastalSupplyPotential = clamp(memory.transportPotential);
  const mobilisationPotential = clamp(memory.mobilisationPotential);
  const delivery = nearshoreDelivery({ context, mobilisationPotential });
  const coupledPhysicalPotential = 100 * Math.sqrt(
    (coastalSupplyPotential / 100) * (mobilisationPotential / 100),
  );
  const nearshoreOpportunity = coupledPhysicalPotential * delivery.factor;
  const waterLevel = waterLevelContext(context.weather);
  const baseHuntability = clamp(huntabilityResult.value);
  const huntability = clamp(baseHuntability + waterLevel.huntabilityBonusPoints);
  const huntabilityFactor = (1 - NEXT_RAVSCORE_PRIORS.huntabilityMaximumShare)
    + NEXT_RAVSCORE_PRIORS.huntabilityMaximumShare * huntability / 100;
  const scoreBeforeModeLimit = round(nearshoreOpportunity * huntabilityFactor);
  const wadersHuntabilityMaximum = mode === 'waders' ? round(huntability) : null;
  const score = wadersHuntabilityMaximum === null
    ? scoreBeforeModeLimit
    : Math.min(scoreBeforeModeLimit, wadersHuntabilityMaximum);
  const limitations = new Set([
    'no-find-outcome-calibration',
    'local-amber-inventory-unobserved',
    'current-normal-speed-thresholds-are-versioned-priors',
    'transport-build-and-attenuation-half-lives-are-versioned-priors',
    'wave-mobilisation-build-decay-are-versioned-priors',
    'wave-energy-is-relative-proxy-not-bed-shear-stress',
    'local-bathymetry-unavailable',
    'surf-zone-undertow-rip-longshore-flow-unresolved',
    'retention-and-beaching-unresolved',
    'falling-water-search-focus-is-versioned-owner-prior-not-local-bar-observation',
  ]);
  if (!delivery.waveApproachAvailable) limitations.add('wave-approach-direction-missing-neutral-midpoint-used');
  if (nativeCadenceHold?.transition === 'NATIVE_CADENCE_HOLD') {
    limitations.add('native-cadence-hold-uses-last-derived-supply-without-current-vector');
  }

  const components = {
    coastalSupply: round(coastalSupplyPotential),
    mobilisation: round(mobilisationPotential),
    nearshoreSupport: round(delivery.supportScore),
    physicalOpportunity: round(nearshoreOpportunity),
    huntability: round(huntability),
  };
  const explanation = {
    contractVersion: NEXT_RAVSCORE_CONTRACT_VERSION,
    causalOrder: ['coastalSupply', 'mobilisation', 'nearshoreSupport', 'huntability'],
    scoreMeaning: 'PHYSICS_INFORMED_AMBER_SEARCH_OPPORTUNITY_INDEX_NOT_FIND_PROBABILITY',
    coastalSupply: {
      value: components.coastalSupply,
      meaning: 'DOCUMENTED_COASTAL_TRANSPORT_PATH_NOT_OBSERVED_AMBER_INVENTORY',
      gridOutflowEvidenceActive: memory.gridOutflowEvidenceActive === true,
      outboundEpisodeEffectiveHours: finite(memory.outboundEpisodeEffectiveHours)
        ? Math.max(0, Number(memory.outboundEpisodeEffectiveHours))
        : 0,
      beachOrSurfZoneDepletionClaimed: false,
    },
    mobilisation: {
      value: components.mobilisation,
      meaning: 'CAUSAL_RELATIVE_WAVE_ENERGY_STATE_FOR_ALREADY_AVAILABLE_LIGHT_MATERIAL',
      directWindScoreIncluded: false,
      currentSpeedScoreIncluded: false,
    },
    nearshoreSupport: {
      value: components.nearshoreSupport,
      factor: Number(delivery.factor.toFixed(6)),
      meaning: delivery.meaning,
      surfZoneResolved: false,
      waveDirectionAvailable: delivery.waveApproachAvailable,
    },
    waterLevel,
    huntability: {
      value: components.huntability,
      weatherOnlyValue: round(baseHuntability),
      fallingWaterSearchFocusBonusPoints: waterLevel.huntabilityBonusPoints,
      maximumShare: NEXT_RAVSCORE_PRIORS.huntabilityMaximumShare,
      meaning: 'METHOD_EFFECTIVENESS_NOT_AMBER_PRESENCE_OR_SAFETY_APPROVAL',
    },
    physicalCoupling: {
      formula: 'GEOMETRIC_MEAN_OF_COASTAL_SUPPLY_AND_MOBILISATION_THEN_BOUNDED_NEARSHORE_SUPPORT',
      supplyCountedOnce: true,
      mobilisationCanCreateSupply: false,
      huntabilityCanCreatePhysicalOpportunity: false,
      coupledPhysicalPotential: Number(coupledPhysicalPotential.toFixed(6)),
      nearshoreOpportunity: Number(nearshoreOpportunity.toFixed(6)),
    },
    modeLimit: {
      policy: mode === 'waders' ? 'VISIBLE_WADERS_HUNTABILITY_MAXIMUM' : 'UNCHANGED',
      maximum: wadersHuntabilityMaximum,
      applied: wadersHuntabilityMaximum !== null && score < scoreBeforeModeLimit,
    },
    finalScore: score,
    empiricalFindAccuracyClaimed: false,
    safetyAdviceIncluded: false,
  };

  return {
    available: true,
    reason: null,
    score,
    scoreImpact: 'active-public',
    modelVersion: NEXT_RAVSCORE_MODEL_ID,
    modelId: NEXT_RAVSCORE_MODEL_ID,
    variantId: NEXT_RAVSCORE_VARIANT_ID,
    contractVersion: NEXT_RAVSCORE_CONTRACT_VERSION,
    stateSchemaVersion: NEXT_RAVSCORE_STATE_SCHEMA_VERSION,
    components,
    explanation,
    confidence: {
      modelMaturity: 'physics-informed-not-find-calibrated',
      modelConfidence: 'bounded-structural-prior',
      limitations: [...limitations],
    },
    diagnostics: {
      coastalSupplyPotential,
      mobilisationPotential,
      coupledPhysicalPotential,
      nearshoreDeliveryFactor: delivery.factor,
      waveDirectionalFactor: delivery.directionalFactor,
      waveApproachAvailable: delivery.waveApproachAvailable,
      waveApproachMissing: delivery.waveApproachMissing,
      waterLevelContext: waterLevel,
      huntabilityFactor,
      scoreBeforeModeLimit,
      wadersHuntabilityMaximum,
      automaticActivationAllowed: false,
      publicActivationAllowed: true,
      publicActivationAuthority: 'DEC-0103-coastal-causal-ravscore-2026-08-28',
    },
  };
}
