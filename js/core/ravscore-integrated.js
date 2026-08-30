import {
  RAVSCORE_COMPONENT_SCHEMA_ID,
  RAVSCORE_EXPLANATION_SCHEMA_ID,
  RAVSCORE_HISTORY_UNCERTAINTY_POLICY,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MODEL_ID,
  RAVSCORE_MODEL_CONTRACT,
  RAVSCORE_SCORE_QUALITY,
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
const hasExactKeys = (value, keys) => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
  && Object.keys(value).sort().join('|') === [...keys].sort().join('|');

const HISTORY_SCORE_VIEW_KEYS = Object.freeze([
  'available',
  'quality',
  'calibrationEligible',
  'coverageHours',
  'requiredHours',
  'reasonCodes',
  'conservativeTailResetApplied',
  'current',
  'waveMobilisation',
  'lastMile',
]);
const POTENTIAL_BOUND_KEYS = Object.freeze(['lowerPotential', 'upperPotential']);
const FACTOR_BOUND_KEYS = Object.freeze(['lowerFactor', 'upperFactor']);

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
  lastMileState = {},
} = {}) {
  const supply = potential(supplyPotential);
  if (supply === null) return {
    available: false,
    status: finite(supplyPotential) ? 'SUPPLY_POTENTIAL_INVALID' : 'SUPPLY_POTENTIAL_MISSING',
    transportPotential: null,
    factor: null,
    transport: null,
  };
  if (lastMileState?.lastMileMemoryReady !== true
    || !RAVSCORE_LAST_MILE_POLICY.readyStatuses
      .includes(lastMileState?.lastMileMemoryStatus)) return {
    available: false,
    status: lastMileState?.lastMileEvidenceStatus === 'ACTIVE_WAVE_DIRECTION_MISSING'
      ? 'LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING'
      : 'LAST_MILE_WAVE_APPROACH_STATE_NOT_READY',
    transportPotential: supply,
    factor: null,
    transport: null,
    scoreEffect: RAVSCORE_LAST_MILE_POLICY.scoreEffect,
    physicalDeliveryResolved: false,
    plausibleTransportRange: null,
    structuralUncertainty: true,
    missing: lastMileState?.lastMileEvidenceStatus === 'ACTIVE_WAVE_DIRECTION_MISSING'
      ? ['wave-direction']
      : ['wave-approach-state'],
  };
  const activity = number(lastMileState.lastMileWaveActivity);
  const normalAlignment = number(lastMileState.lastMileNormalAlignment);
  const tangentAlignment = number(lastMileState.lastMileTangentAlignment);
  const coherence = number(lastMileState.lastMileCoherence);
  const approach = number(lastMileState.lastMileApproach);
  const factor = number(lastMileState.lastMileFactor);
  const evidenceStatus = lastMileState.lastMileEvidenceStatus;
  const exactCalmEvidence = evidenceStatus === 'EXACT_CALM_DIRECTION_NEUTRAL';
  const directionalEvidence = evidenceStatus === 'DIRECTIONAL_WAVE_EVIDENCE_READY';
  const zeroActivity = activity === 0;
  const calm = zeroActivity && exactCalmEvidence;
  const expectedApproach = zeroActivity
    ? 1
    : normalAlignment === null
      ? null
      : clamp(
        (normalAlignment
          - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment)
          / (1 - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment),
      );
  const directionalMagnitude = normalAlignment === null || tangentAlignment === null
    ? null
    : Math.hypot(normalAlignment, tangentAlignment);
  const expectedCoherence = directionalMagnitude === null
    ? null
    : clamp(directionalMagnitude);
  const directionalStateValid = zeroActivity
    ? normalAlignment === null
      && tangentAlignment === null
      && coherence === null
      && approach === 1
    : normalAlignment !== null
      && normalAlignment >= -1 && normalAlignment <= 1
      && tangentAlignment !== null
      && tangentAlignment >= -1 && tangentAlignment <= 1
      && directionalMagnitude <= 1 + 1e-9
      && coherence !== null
      && coherence >= 0 && coherence <= 1
      && expectedCoherence !== null
      && Math.abs(coherence - expectedCoherence) <= 1e-9
      && expectedApproach !== null
      && approach !== null
      && Math.abs(approach - expectedApproach) <= 1e-9;
  const expectedFactor = activity === null || expectedApproach === null
    ? null
    : clamp(
      1 - RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare
        * activity * (1 - expectedApproach),
      RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor,
      RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor,
    );
  if (activity === null || activity < 0 || activity > 1
    || (!exactCalmEvidence && !directionalEvidence)
    || approach === null || approach < 0 || approach > 1
    || !directionalStateValid
    || factor === null
    || factor < RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor
    || factor > RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor
    || expectedFactor === null || Math.abs(factor - expectedFactor) > 1e-9) return {
    available: false,
    status: 'LAST_MILE_WAVE_APPROACH_STATE_INVALID',
    transportPotential: supply,
    factor: null,
    transport: null,
    scoreEffect: RAVSCORE_LAST_MILE_POLICY.scoreEffect,
    physicalDeliveryResolved: false,
    plausibleTransportRange: null,
    structuralUncertainty: true,
    missing: ['wave-approach-state'],
  };
  const delivery = supply * factor;
  return {
    available: true,
    status: calm
      ? 'LAST_MILE_BOUNDED_WAVE_APPROACH_CALM_NEUTRAL'
      : 'LAST_MILE_BOUNDED_WAVE_APPROACH_READY',
    transportPotential: supply,
    factor,
    transport: delivery,
    deliveryPotential: delivery,
    scoreEffect: RAVSCORE_LAST_MILE_POLICY.scoreEffect,
    physicalDeliveryResolved: false,
    activity,
    approach,
    normalAlignment,
    tangentAlignment,
    coherence,
    directionConventions: Object.freeze({
      waveDirectionDeg: 'FROM',
      towardConversionDegrees: 180,
      onshoreDirectionDeg: 'IMMUTABLE_COAST_NORMAL_TOWARD_LAND',
      appliedRotationCount: 1,
    }),
    plausibleTransportRange: null,
    structuralUncertainty: true,
    missing: [],
  };
}

function canonicalHistoryScoreView(state = {}) {
  const supplied = state?.historyScoreView;
  if (supplied === null || supplied === undefined) {
    const exactLastMileFactor = number(state?.lastMileFactor);
    if (state?.currentMemoryReady !== true
      || !RAVSCORE_MODEL_CONTRACT.currentSupply.readyStatuses
        .includes(state?.currentMemoryStatus)
      || potential(state?.supplyPotential) === null
      || state?.waveMemoryReady !== true
      || !RAVSCORE_MODEL_CONTRACT.waveMobilisation.readyStatuses
        .includes(state?.waveMemoryStatus)
      || potential(state?.mobilisationPotential) === null
      || state?.lastMileMemoryReady !== true
      || !RAVSCORE_LAST_MILE_POLICY.readyStatuses
        .includes(state?.lastMileMemoryStatus)
      || exactLastMileFactor === null
      || exactLastMileFactor < RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor
      || exactLastMileFactor > RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor) {
      return null;
    }
    return {
      available: true,
      quality: RAVSCORE_SCORE_QUALITY.FULL_HISTORY,
      calibrationEligible: true,
      coverageHours: RAVSCORE_MODEL_CONTRACT.currentSupply.windowHours,
      requiredHours: RAVSCORE_MODEL_CONTRACT.currentSupply.windowHours,
      reasonCodes: [],
      conservativeTailResetApplied: false,
      current: {
        lowerPotential: state.supplyPotential,
        upperPotential: state.supplyPotential,
      },
      waveMobilisation: {
        lowerPotential: state.mobilisationPotential,
        upperPotential: state.mobilisationPotential,
      },
      lastMile: {
        lowerFactor: exactLastMileFactor,
        upperFactor: exactLastMileFactor,
      },
    };
  }
  if (!hasExactKeys(supplied, HISTORY_SCORE_VIEW_KEYS)
    || !hasExactKeys(supplied.current, POTENTIAL_BOUND_KEYS)
    || !hasExactKeys(supplied.waveMobilisation, POTENTIAL_BOUND_KEYS)
    || !hasExactKeys(supplied.lastMile, FACTOR_BOUND_KEYS)) {
    return null;
  }
  const quality = supplied?.quality;
  const currentLower = potential(supplied?.current?.lowerPotential);
  const currentUpper = potential(supplied?.current?.upperPotential);
  const waveLower = potential(supplied?.waveMobilisation?.lowerPotential);
  const waveUpper = potential(supplied?.waveMobilisation?.upperPotential);
  const factorLower = number(supplied?.lastMile?.lowerFactor);
  const factorUpper = number(supplied?.lastMile?.upperFactor);
  const coverageHours = number(supplied?.coverageHours);
  const requiredHours = number(supplied?.requiredHours);
  const reasonCodes = Array.isArray(supplied?.reasonCodes)
    && supplied.reasonCodes.every(value => typeof value === 'string' && value)
    ? [...new Set(supplied.reasonCodes)]
    : null;
  const conservativeTailResetApplied = supplied?.conservativeTailResetApplied;
  const availableQuality = quality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY
    || quality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE;
  const collapsed = currentLower !== null && currentUpper !== null
    && waveLower !== null && waveUpper !== null
    && factorLower !== null && factorUpper !== null
    && Math.abs(currentUpper - currentLower) <= 1e-9
    && Math.abs(waveUpper - waveLower) <= 1e-9
    && Math.abs(factorUpper - factorLower) <= 1e-9;
  if (supplied?.available !== true
    || !availableQuality
    || supplied.calibrationEligible !== (quality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY)
    || currentLower === null || currentUpper === null || currentLower > currentUpper
    || waveLower === null || waveUpper === null || waveLower > waveUpper
    || factorLower === null || factorUpper === null || factorLower > factorUpper
    || factorLower < RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor
    || factorUpper > RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor
    || coverageHours === null || coverageHours < 0
    || requiredHours !== RAVSCORE_MODEL_CONTRACT.currentSupply.windowHours
    || coverageHours > requiredHours
    || reasonCodes === null
    || typeof conservativeTailResetApplied !== 'boolean'
    || (quality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY
      && (!collapsed || reasonCodes.length))
    || (quality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
      && reasonCodes.length === 0)) {
    return null;
  }
  return {
    available: true,
    quality,
    calibrationEligible: supplied.calibrationEligible,
    coverageHours,
    requiredHours,
    reasonCodes,
    conservativeTailResetApplied,
    current: {
      lowerPotential: currentLower,
      upperPotential: currentUpper,
    },
    waveMobilisation: {
      lowerPotential: waveLower,
      upperPotential: waveUpper,
    },
    lastMile: {
      lowerFactor: factorLower,
      upperFactor: factorUpper,
    },
  };
}

function unavailable(reason, state = {}) {
  return {
    available: false,
    score: null,
    reason,
    scoreQuality: RAVSCORE_SCORE_QUALITY.UNAVAILABLE,
    calibrationEligible: false,
    scoreSemantics: null,
    scoreBounds: null,
    historyCoverageHours: null,
    historyReasonCodes: [],
    conservativeTailResetApplied: false,
    history: null,
    modelVersion: RAVSCORE_MODEL_ID,
    modelBinding: ravScoreModelBinding(),
    readiness: {
      current: state?.currentMemoryStatus ?? null,
      wave: state?.waveMemoryStatus ?? null,
      lastMile: state?.lastMileMemoryStatus ?? null,
    },
  };
}

export function evaluateRavScoreIntegrated(
  { mode = 'beach', weather = {}, zone = {} } = {},
  { state = null } = {},
) {
  if (!['beach', 'waders'].includes(mode)) throw new Error(`Unknown hunting mode: ${mode}`);
  if (state?.currentDirectInputAvailable === false) {
    return unavailable('CURRENT_DIRECT_INPUT_NOT_READY', state);
  }
  const historyScoreView = canonicalHistoryScoreView(state);
  if (historyScoreView === null) {
    if (state?.historyScoreView === undefined
      && (state?.currentMemoryReady !== true
        || !RAVSCORE_MODEL_CONTRACT.currentSupply.readyStatuses
          .includes(state?.currentMemoryStatus)
        || potential(state?.supplyPotential) === null)) {
      return unavailable('CURRENT_SUPPLY_STATE_NOT_READY', state);
    }
    if (state?.historyScoreView === undefined
      && (state?.waveMemoryReady !== true
        || !RAVSCORE_MODEL_CONTRACT.waveMobilisation.readyStatuses
          .includes(state?.waveMemoryStatus)
        || potential(state?.mobilisationPotential) === null)) {
      return unavailable('WAVE_MOBILISATION_STATE_NOT_READY', state);
    }
    return unavailable('HISTORY_SCORE_VIEW_INVALID', state);
  }
  const directCurrentAvailable = state?.currentDirectInputAvailable === true
    || (state?.currentDirectInputAvailable === undefined
      && state?.currentMemoryReady === true
      && RAVSCORE_MODEL_CONTRACT.currentSupply.readyStatuses
        .includes(state?.currentMemoryStatus));
  if (!directCurrentAvailable) return unavailable('CURRENT_DIRECT_INPUT_NOT_READY', state);

  const huntability = evaluateIntegratedHuntability(mode, weather);
  if (!huntability.available || !finite(huntability.value)) {
    return unavailable(huntability.reason ?? 'HUNTABILITY_NOT_READY', state);
  }
  const currentWaveHeight = nonNegative(weather?.waveHeightM);
  const currentWavePeriod = nonNegative(weather?.wavePeriodS);
  if (currentWaveHeight === null || currentWavePeriod === null) {
    return unavailable('WAVE_PHYSICAL_INPUT_NOT_READY', state);
  }
  const currentWaveEnergy = waveMobilisationEnergy({
    waveHeightM: currentWaveHeight,
    wavePeriodS: currentWavePeriod,
  });
  if (!currentWaveEnergy.available) {
    return unavailable('WAVE_PHYSICAL_INPUT_NOT_READY', state);
  }
  if (currentWaveEnergy.active
    && direction(weather?.waveDirectionDeg) === null) {
    return unavailable('LAST_MILE_ACTIVE_WAVE_DIRECTION_MISSING', state);
  }

  const lowerDelivery = historyScoreView.current.lowerPotential
    * historyScoreView.lastMile.lowerFactor;
  const upperDelivery = historyScoreView.current.upperPotential
    * historyScoreView.lastMile.upperFactor;
  const pointLastMile = historyScoreView.quality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY
    && historyScoreView.conservativeTailResetApplied !== true
    ? evaluateIntegratedLastMile({
      supplyPotential: historyScoreView.current.lowerPotential,
      lastMileState: state,
    })
    : null;
  if (pointLastMile !== null
    && (!pointLastMile.available
      || !finite(pointLastMile.transport)
      || Math.abs(pointLastMile.factor - historyScoreView.lastMile.lowerFactor) > 1e-9)) {
    return unavailable('LAST_MILE_TRANSPORT_NOT_READY', state);
  }
  const lastMile = pointLastMile ?? {
    available: true,
    status: historyScoreView.quality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
      ? 'LAST_MILE_HISTORY_INCOMPLETE_ENCLOSING_BOUND'
      : 'LAST_MILE_CONSERVATIVE_TAIL_RESET_POINT',
    transportPotential: historyScoreView.current.lowerPotential,
    factor: historyScoreView.lastMile.lowerFactor,
    transport: lowerDelivery,
    deliveryPotential: lowerDelivery,
    factorBounds: {
      lower: historyScoreView.lastMile.lowerFactor,
      upper: historyScoreView.lastMile.upperFactor,
    },
    deliveryBounds: {
      lower: lowerDelivery,
      upper: upperDelivery,
    },
    scoreEffect: RAVSCORE_LAST_MILE_POLICY.scoreEffect,
    physicalDeliveryResolved: false,
    plausibleTransportRange: null,
    structuralUncertainty: true,
    missing: ['historical-wave-approach'],
  };

  const components = {
    huntability: clamp(huntability.value),
    transport: clamp(lowerDelivery),
    mobilisation: clamp(historyScoreView.waveMobilisation.lowerPotential),
  };
  const upperComponents = {
    huntability: components.huntability,
    transport: clamp(upperDelivery),
    mobilisation: clamp(historyScoreView.waveMobilisation.upperPotential),
  };
  const weightedContributions = {
    huntability: components.huntability * RAVSCORE_WEIGHTS.huntability,
    transport: components.transport * RAVSCORE_WEIGHTS.transport,
    mobilisation: components.mobilisation * RAVSCORE_WEIGHTS.mobilisation,
  };
  const upperWeightedContributions = {
    huntability: upperComponents.huntability * RAVSCORE_WEIGHTS.huntability,
    transport: upperComponents.transport * RAVSCORE_WEIGHTS.transport,
    mobilisation: upperComponents.mobilisation * RAVSCORE_WEIGHTS.mobilisation,
  };
  const rawScore = Object.values(weightedContributions).reduce((sum, value) => sum + value, 0);
  const upperRawScore = Object.values(upperWeightedContributions)
    .reduce((sum, value) => sum + value, 0);
  const roundedScore = Math.round(clamp(rawScore));
  const upperRoundedScore = Math.round(clamp(upperRawScore));
  const wadersHuntabilityMaximum = mode === 'waders'
    ? Math.round(clamp(components.huntability))
    : null;
  const finalScore = wadersHuntabilityMaximum === null
    ? roundedScore
    : Math.min(roundedScore, wadersHuntabilityMaximum);
  const upperFinalScore = wadersHuntabilityMaximum === null
    ? upperRoundedScore
    : Math.min(upperRoundedScore, wadersHuntabilityMaximum);
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
  if (historyScoreView.quality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE) {
    limitations.push('HISTORICAL_WEATHER_INPUT_INCOMPLETE');
  }
  if (historyScoreView.conservativeTailResetApplied === true) {
    limitations.push('CONSERVATIVE_HISTORY_TAIL_RESET_APPLIED');
  }
  if (finite(lastMile.coherence) && lastMile.coherence < 0.5) {
    limitations.push('LAST_MILE_DIRECTIONAL_COHERENCE_LOW');
  }

  const scoreCalculation = {
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    weights: RAVSCORE_WEIGHTS,
    weightedContributions: Object.fromEntries(
      Object.entries(weightedContributions).map(([key, value]) => [key, rounded(value)]),
    ),
    upperWeightedContributions: Object.fromEntries(
      Object.entries(upperWeightedContributions)
        .map(([key, value]) => [key, rounded(value)]),
    ),
    rawScore: rounded(rawScore),
    upperRawScore: rounded(upperRawScore),
    roundedScore,
    upperRoundedScore,
    roundingDelta: rounded(roundedScore - rawScore),
    wadersHuntabilityMaximum,
    wadersHuntabilityLimitApplied: wadersLimitApplied,
    finalScore,
    upperFinalScore,
  };

  const scoreSemantics = historyScoreView.quality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
    ? RAVSCORE_HISTORY_UNCERTAINTY_POLICY.incompleteHistoryScoreSemantics
    : historyScoreView.conservativeTailResetApplied === true
      ? RAVSCORE_HISTORY_UNCERTAINTY_POLICY.fullHistoryTailResetScoreSemantics
      : RAVSCORE_HISTORY_UNCERTAINTY_POLICY.fullHistoryExactScoreSemantics;
  const scoreBounds = {
    lower: finalScore,
    upper: upperFinalScore,
    modelUncertaintyPoints: upperFinalScore - finalScore,
    rawLower: rounded(rawScore),
    rawUpper: rounded(upperRawScore),
  };
  const history = {
    quality: historyScoreView.quality,
    coverageHours: historyScoreView.coverageHours,
    requiredHours: historyScoreView.requiredHours,
    reasonCodes: historyScoreView.reasonCodes,
    conservativeTailResetApplied: historyScoreView.conservativeTailResetApplied,
  };

  return {
    available: true,
    score: finalScore,
    scoreQuality: historyScoreView.quality,
    calibrationEligible: historyScoreView.calibrationEligible,
    scoreSemantics,
    scoreBounds,
    historyCoverageHours: history.coverageHours,
    historyReasonCodes: history.reasonCodes,
    conservativeTailResetApplied: history.conservativeTailResetApplied,
    history,
    modelVersion: RAVSCORE_MODEL_ID,
    modelBinding: ravScoreModelBinding(),
    components,
    scoreCalculation,
    diagnostics: {
      supplyPotential: historyScoreView.current.lowerPotential,
      supplyPotentialUpper: historyScoreView.current.upperPotential,
      currentReferenceAt: state.currentReferenceAt ?? null,
      currentMemoryStatus: state.currentMemoryStatus ?? null,
      waveLastVerifiedAt: state.waveLastVerifiedAt ?? null,
      waveMemoryStatus: state.waveMemoryStatus ?? null,
      mobilisationPotentialUpper: historyScoreView.waveMobilisation.upperPotential,
      lastMile,
      history,
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
          meaning: 'RECENT_VERIFIED_GRID_CURRENT_SUPPLY_TIMES_BOUNDED_WAVE_APPROACH_FACTOR',
        },
        mobilisation: {
          value: rounded(components.mobilisation),
          weight: RAVSCORE_WEIGHTS.mobilisation,
          weightedContribution: scoreCalculation.weightedContributions.mobilisation,
          meaning: 'RELATIVE_WAVE_ENERGY_MOBILISATION_MEMORY',
        },
      },
      scoreCalculation,
      scoreQuality: historyScoreView.quality,
      scoreSemantics,
      scoreBounds,
      calibrationEligible: historyScoreView.calibrationEligible,
      conservativeTailResetApplied: historyScoreView.conservativeTailResetApplied,
      currentSemantics: 'VERIFIED_MODEL_GRID_CURRENT_NOT_SURF_ZONE_UNDERTOW_OR_RIP_CURRENT',
      lastMileSemantics: lastMile.status,
      waterLevelContext,
      limitations,
      safetyAdviceIncluded: false,
      findProbability: false,
    },
    confidence: {
      dataStatus: historyScoreView.quality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
        ? 'HISTORY_INCOMPLETE_WITH_CONSERVATIVE_ENCLOSING_BOUND'
        : historyScoreView.conservativeTailResetApplied === true
          ? 'READY_WITH_CONSERVATIVE_TAIL_RESET_AND_STRUCTURAL_LAST_MILE_UNCERTAINTY'
        : finite(lastMile.coherence) && lastMile.coherence < 0.5
          ? 'READY_WITH_STRUCTURAL_AND_DIRECTIONAL_COHERENCE_UNCERTAINTY'
          : 'READY_WITH_STRUCTURAL_LAST_MILE_UNCERTAINTY',
      modelMaturity: RAVSCORE_MODEL_CONTRACT.uncertainty.modelMaturity,
      modelConfidence: 'low',
      limitations,
    },
  };
}
