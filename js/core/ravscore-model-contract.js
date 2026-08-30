import {
  GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,
  GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256,
} from './ravscore-model-bundle.generated.js';

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
};

export const RAVSCORE_MODEL_ID = 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0';
export const RAVSCORE_STATE_SCHEMA_VERSION = '5.0.0';
export const RAVSCORE_VARIANT_ID =
  'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2';
export const RAVSCORE_PROFILE_ID =
  'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileewma4-atten15-v4';
export const RAVSCORE_COMPONENT_SCHEMA_ID =
  'ravscore-components-huntability-delivery-mobilisation-v4';
export const RAVSCORE_EXPLANATION_SCHEMA_ID = 'ravscore-explanation-integrated-v4';
export const RAVSCORE_RANKING_POLICY_ID = 'direction-broad-19-v1';
export const RAVSCORE_BEST_TIME_POLICY_ID = 'score-water-tie-earliest-v2';
export const RAVSCORE_PRESENTATION_POLICY_ID = 'score-bands-35-55-75-exceptional90-v1';
export const RAVSCORE_MIGRATION_ID =
  'candidate-g-schema2-signed-current-reweight-bounded40h-wave-approach-to-integrated-schema5-v4';
export const RAVSCORE_ROLLBACK_ID = 'integrated-schema5-to-candidate-g-schema2-v2';
export const RAVSCORE_COLD_REPLAY_ID = 'verified-private-48h-current-wave-direction-cold-replay-v2';
export const RAVSCORE_PUBLIC_FORECAST_HOURS = 118;

// Eligibility is an operational property of the currently activated model,
// not part of the eleven-field model binding. The integrated model may collect
// structurally complete, privacy-safe evidence for later calibration. A
// Candidate G rollback overlay exports this flag as false so rollback-era
// observations can never enter the integrated model's calibration cohort.
export const RAVSCORE_CALIBRATION_ELIGIBLE = true;

export const RAVSCORE_WEIGHTS = deepFreeze({
  huntability: 0.20,
  transport: 0.50,
  mobilisation: 0.30,
});

export const RAVSCORE_PRESENTATION_POLICY = deepFreeze({
  id: RAVSCORE_PRESENTATION_POLICY_ID,
  exceptionalMinimum: 90,
  levels: [
    { minimum: 75, labelDa: 'God', level: 'good' },
    { minimum: 55, labelDa: 'Middel', level: 'fair' },
    { minimum: 35, labelDa: 'Svag', level: 'weak' },
    { minimum: 0, labelDa: 'Dårlig', level: 'poor' },
  ],
});

export const RAVSCORE_BEST_TIME_POLICY = deepFreeze({
  id: RAVSCORE_BEST_TIME_POLICY_ID,
  primaryOrder: 'HIGHEST_RAVSCORE',
  wadersTieBreak: 'LOWER_WATER_LEVEL_THEN_NON_RISING_TREND_THEN_EARLIEST',
  beachTieBreak: 'EARLIEST',
  currentDayPastToleranceMinutes: 30,
  waterLevelScoreEffect: 0,
});

export const RAVSCORE_CURRENT_SUPPLY_POLICY = deepFreeze({
  id: 'current-003-015-in10-out8-full24-cos48-gap3-boundary0-v1',
  deadbandNormalSpeedMps: 0.03,
  fullStrengthNormalSpeedMps: 0.15,
  inboundPointsPerEffectiveHour: 10,
  outboundPointsPerEffectiveHour: 8,
  fullWeightHours: 24,
  windowHours: 48,
  maximumGapHours: 3,
  boundaryPotential: 0,
  maximumWindowEvidencePoints: 49,
  // Candidate G rollback accepts at most 49 signed evidence rows. A real
  // pre-boundary bridge may therefore consume one of the 49 retained slots;
  // a denser unaligned window fails closed instead of being approximated.
  maximumRetainedEvidencePoints: 49,
  ageKernel: 'FULL_24H_THEN_RAISED_COSINE_TO_48H',
  evidenceSemantics: 'SIGNED_DERIVED_COAST_NORMAL_STRENGTH_ONLY',
  missingPolicy: 'FAIL_CLOSED',
  nativeHoldPolicy: 'EXPLICIT_HOLD_WITHOUT_MOVEMENT',
  boundaryPolicy: 'ZERO_WITH_ONE_REAL_PRE_BOUNDARY_CADENCE_BRIDGE',
  readyStatuses: ['READY', 'READY_NATIVE_HOLD'],
});

export const RAVSCORE_WAVE_MOBILISATION_POLICY = deepFreeze({
  id: 'wave-energy-freshness-build4-decay48-coldrestart-v2',
  energyProfileId: 'wave-energy-state-build-4-decay-48',
  energyProxy: 'SIGNIFICANT_WAVE_HEIGHT_SQUARED_TIMES_PERIOD',
  energyPoints: [[0, 0], [0.25, 8], [1, 25], [3, 50], [7, 75], [14, 92], [25, 100]],
  buildHalfLifeHours: 4,
  decayHalfLifeHours: 48,
  coldInitialPotential: 0,
  maximumContinuousIntervalHours: 1,
  maximumFreshGapHours: 3,
  maximumBuildCreditAfterMissingOrGapHours: 1,
  missingInputPolicy: 'UNAVAILABLE_HOLD_DERIVED_STATE_WITHOUT_BUILD',
  coldStartPolicy: 'UNAVAILABLE_NO_INVENTED_DURATION',
  longGapPolicy: 'FIRST_VERIFIED_SAMPLE_COLD_RESTARTS_AT_ZERO_AND_REMAINS_UNAVAILABLE',
  rollbackPolicy: 'SEPARATE_CANDIDATE_G_BUILD4_DECAY48_TRACK_NOT_USED_BY_NEW_SCORE',
  readyStatuses: ['READY', 'MIGRATED_READY', 'RECOVERED_SHORT_GAP'],
  unavailableStatuses: ['MISSING_INPUT', 'COLD_START'],
  requiredPhysicalInputs: {
    waveHeightM: 'FINITE_NON_NEGATIVE_SCALAR',
    wavePeriodS: 'FINITE_NON_NEGATIVE_SCALAR_AND_POSITIVE_WHEN_WAVE_HEIGHT_IS_POSITIVE',
  },
});

export const RAVSCORE_RECOVERY_POLICY = deepFreeze({
  id: RAVSCORE_COLD_REPLAY_ID,
  coldReplayHours: 48,
  candidateMigrationWaveApproachReplayHours: 40,
  candidateMigrationWaveApproachMaximumOmittedMomentShare: 1 / 1024,
  candidateMigrationWaveApproachMaximumScoreErrorBeforeRounding: 0.01171875,
  candidateMigrationCurrentEvidenceSource:
    'VERIFIED_CANDIDATE_G_SIGNED_EVIDENCE_REWEIGHT',
  source: 'VERIFIED_PRIVATE_PROVENANCE_REPLAY',
  missingHistoryPolicy: 'FAIL_CLOSED_WITHOUT_PUBLIC_WARMUP',
});

export const RAVSCORE_LAST_MILE_POLICY = deepFreeze({
  id: 'last-mile-wave-approach-ewma4-attenuation15-v1',
  stateSchemaVersion: '1.0.0',
  directionSemantics: 'DMI_WAVE_FROM_ROTATED_180_TO_TOWARD_IMMUTABLE_ONSHORE_NORMAL',
  energyWeight: 'EXISTING_WAVE_ENERGY_SCORE_DIVIDED_BY_100',
  directionalHalfLifeHours: 4,
  maximumContinuousIntervalHours: 1,
  maximumFreshGapHours: 3,
  maximumRecoveryCreditHours: 1,
  approachNeutralNormalAlignment: -0.25,
  approachNeutralCalibrationStatus:
    'TRANSPARENT_CONSERVATIVE_PRIOR_NOT_CALIBRATED_TO_REPRESENTATIVE_FINDS',
  maximumAttenuationShare: 0.15,
  minimumDeliveryFactor: 0.85,
  maximumDeliveryFactor: 1,
  deliveryEquation: 'DELIVERY_EQUALS_SUPPLY_TIMES_ONE_MINUS_0_15_TIMES_W_TIMES_ONE_MINUS_APPROACH',
  scoreEffect: 'BOUNDED_SUPPLY_ATTENUATION_ONLY',
  waveCanCreateSupply: false,
  waveCanIncreaseSupply: false,
  outerGridWaveContextScoreEffect: 'BOUNDED_DIRECTIONAL_ATTENUATION_OF_EXISTING_SUPPLY',
  missingDirectionPolicy: 'ACTIVE_WAVE_FAIL_CLOSED_EXACT_CALM_NEUTRAL',
  coherenceScoreEffect: 'NONE_UNCERTAINTY_AND_EXPLANATION_ONLY',
  waterLevelTransportScoreEffect: 'NONE_CONTEXT_AND_BEST_TIME_TIE_ONLY',
  structuralUncertaintyAlways: true,
  numericPhysicalUncertaintyIntervalProvided: false,
  physicalDeliveryResolved: false,
  localBathymetryIncluded: false,
  resolvedSurfZoneIncluded: false,
  readyStatuses: ['READY', 'RECOVERED_SHORT_GAP'],
  unavailableStatuses: ['MISSING_INPUT', 'COLD_START'],
});

export const RAVSCORE_HUNTABILITY_POLICY = deepFreeze({
  id: 'strand-existing-curves-waders-wind-led-wave20-v1',
  wadersWindPoints: [[0, 100], [6, 100], [7, 80], [8, 60], [10, 35], [13, 10], [15, 0]],
  beachWindPoints: [[0, 100], [5, 100], [8, 90], [13, 60], [18, 25], [25, 0]],
  wadersWavePoints: [[0, 100], [0.25, 95], [0.7, 65], [1.2, 25], [2.5, 0]],
  beachWavePoints: [[0, 100], [0.3, 100], [0.7, 90], [1.2, 75], [2.5, 45], [4, 20], [6, 0]],
  beachWindWeight: 0.55,
  beachWaveWeight: 0.45,
  beachMinimumWeight: 0.60,
  beachWeightedAverageWeight: 0.40,
  wadersWindWeight: 0.80,
  wadersWavePenaltyMaximumShare: 0.20,
  wadersFullWindThroughMps: 6,
  wadersZeroWindAtMps: 15,
  wadersFinalScoreCap: true,
  beachFinalScoreCap: false,
  safetyAdviceIncluded: false,
  waterLevelScoreEffect: 0,
  requiredPhysicalInputs: {
    windSpeedMps: 'FINITE_NON_NEGATIVE_SCALAR',
    waveHeightM: 'FINITE_NON_NEGATIVE_SCALAR',
  },
});

export const RAVSCORE_MODEL_CONTRACT = deepFreeze({
  modelId: RAVSCORE_MODEL_ID,
  stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
  variantId: RAVSCORE_VARIANT_ID,
  profileId: RAVSCORE_PROFILE_ID,
  componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
  explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
  rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
  bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
  presentationPolicyId: RAVSCORE_PRESENTATION_POLICY_ID,
  migrationId: RAVSCORE_MIGRATION_ID,
  rollbackId: RAVSCORE_ROLLBACK_ID,
  publicForecastHours: RAVSCORE_PUBLIC_FORECAST_HOURS,
  scoreMeaning: 'MODELLED_COASTAL_AMBER_AND_SEARCH_OPPORTUNITY_INDEX_NOT_FIND_PROBABILITY',
  calibrationStatus: 'OWNER_AND_RESEARCH_PRIOR_NOT_FIND_CALIBRATED',
  weights: RAVSCORE_WEIGHTS,
  presentation: RAVSCORE_PRESENTATION_POLICY,
  bestTime: RAVSCORE_BEST_TIME_POLICY,
  currentSupply: RAVSCORE_CURRENT_SUPPLY_POLICY,
  recovery: RAVSCORE_RECOVERY_POLICY,
  waveMobilisation: RAVSCORE_WAVE_MOBILISATION_POLICY,
  lastMile: RAVSCORE_LAST_MILE_POLICY,
  huntability: RAVSCORE_HUNTABILITY_POLICY,
  uncertainty: {
    modelMaturity: 'RESEARCH_PRIOR_UNVALIDATED_AGAINST_REPRESENTATIVE_FINDS',
    localBathymetryIncluded: false,
    resolvedSurfZoneIncluded: false,
    localAmberInventoryObserved: false,
    lastMileScoreEffect: 'BOUNDED_SUPPLY_ATTENUATION_ONLY',
    structuralLastMileUncertaintyAlways: true,
  },
});

// The contract digest binds the canonical parameter object. The bundle digest
// additionally binds the normalized transitive implementation closure and is
// generated and checked by scripts/build-ravscore-model-bundle.mjs.
export const RAVSCORE_MODEL_CONTRACT_SHA256 = GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256;
export const RAVSCORE_MODEL_BUNDLE_SHA256 = GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256;

export function ravScoreModelBinding() {
  return Object.freeze({
    modelId: RAVSCORE_MODEL_ID,
    stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
    variantId: RAVSCORE_VARIANT_ID,
    profileId: RAVSCORE_PROFILE_ID,
    componentSchemaId: RAVSCORE_COMPONENT_SCHEMA_ID,
    explanationSchemaId: RAVSCORE_EXPLANATION_SCHEMA_ID,
    rankingPolicyId: RAVSCORE_RANKING_POLICY_ID,
    bestTimePolicyId: RAVSCORE_BEST_TIME_POLICY_ID,
    presentationPolicyId: RAVSCORE_PRESENTATION_POLICY_ID,
    modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
    modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
  });
}

export function assertRavScoreModelBinding(binding, label = 'RavScore model binding') {
  const expected = ravScoreModelBinding();
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) {
    throw new Error(`${label} is missing`);
  }
  const prototype = Object.getPrototypeOf(binding);
  const actualKeys = Object.keys(binding).sort();
  const expectedKeys = Object.keys(expected).sort();
  if ((prototype !== Object.prototype && prototype !== null)
    || actualKeys.length !== expectedKeys.length
    || actualKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new Error(`${label} has an incompatible exact key set`);
  }
  for (const [key, value] of Object.entries(expected)) {
    if (binding[key] !== value) throw new Error(`${label} has incompatible ${key}`);
  }
  return true;
}
