import {
  GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,
  GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256,
} from './ravscore-model-bundle.generated.js';

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
};

// This file is a private build overlay. Normal Pages packaging excludes the
// entire scripts tree. The manual rollback workflow copies it over the one
// canonical public model contract only after the Candidate G runtime has
// passed its complete rollback gate.
export const RAVSCORE_MODEL_ID =
  'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
export const RAVSCORE_STATE_SCHEMA_VERSION = '2.0.0';
export const RAVSCORE_VARIANT_ID =
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
export const RAVSCORE_PROFILE_ID =
  'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48';
export const RAVSCORE_COMPONENT_SCHEMA_ID =
  'ravscore-components-huntability-transport-mobilisation-candidate-g-v1';
export const RAVSCORE_EXPLANATION_SCHEMA_ID = 'ravscore-explanation-candidate-g-v3';
export const RAVSCORE_RANKING_POLICY_ID = 'direction-broad-19-v1';
export const RAVSCORE_BEST_TIME_POLICY_ID = 'score-water-tie-earliest-v2';
export const RAVSCORE_PRESENTATION_POLICY_ID = 'score-bands-35-55-75-exceptional90-v1';
export const RAVSCORE_MIGRATION_ID = null;
export const RAVSCORE_ROLLBACK_ID = 'integrated-schema5-to-candidate-g-schema2-v2';
export const RAVSCORE_CALIBRATION_ELIGIBLE = false;

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
  id: 'candidate-g-current-003-015-in10-out8-exhaust13-window48-boundary0-v1',
  deadbandNormalSpeedMps: 0.03,
  fullStrengthNormalSpeedMps: 0.15,
  inboundPointsPerEffectiveHour: 10,
  outboundPointsPerEffectiveHour: 8,
  exhaustedAfterEffectiveHours: 13,
  preExhaustionMaximumLossPoints: 96,
  windowHours: 48,
  maximumGapHours: 3,
  boundaryPotential: 0,
  maximumRetainedEvidencePoints: 49,
  missingPolicy: 'FAIL_CLOSED',
  nativeHoldPolicy: 'EXPLICIT_HOLD_WITHOUT_MOVEMENT',
  readyStatuses: ['READY'],
});

export const RAVSCORE_WAVE_MOBILISATION_POLICY = deepFreeze({
  id: 'candidate-g-wave-energy-state-build-4-decay-48-v1',
  energyProfileId: 'wave-energy-state-build-4-decay-48',
  energyProxy: 'SIGNIFICANT_WAVE_HEIGHT_SQUARED_TIMES_PERIOD',
  buildHalfLifeHours: 4,
  decayHalfLifeHours: 48,
  missingInputPolicy: 'HOLD_LAST_DERIVED_STATE',
  readyStatuses: ['READY'],
  unavailableStatuses: ['WINDOW_INCOMPLETE'],
});

export const RAVSCORE_LAST_MILE_POLICY = deepFreeze({
  id: 'candidate-g-wave-landing-maximum-share-015-v1',
  scoreEffect: 'CANDIDATE_G_DELIVERY_FACTOR',
  waveLandingMaximumShare: 0.15,
  localBathymetryIncluded: false,
  resolvedSurfZoneIncluded: false,
});

export const RAVSCORE_HUNTABILITY_POLICY = deepFreeze({
  id: 'candidate-g-waders-wind-led-wave20-v1',
  wadersWindPoints: [[0, 100], [6, 100], [7, 80], [8, 60], [10, 35], [13, 10], [15, 0]],
  wadersWavePenaltyMaximumShare: 0.20,
  wadersFinalScoreCap: true,
  safetyAdviceIncluded: false,
  waterLevelScoreEffect: 0,
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
  rollbackId: RAVSCORE_ROLLBACK_ID,
  scoreMeaning: 'CANDIDATE_G_MODELLED_AMBER_AND_SEARCH_OPPORTUNITY_INDEX_NOT_FIND_PROBABILITY',
  calibrationStatus: 'ROLLBACK_MODEL_NOT_CALIBRATION_ELIGIBLE',
  weights: RAVSCORE_WEIGHTS,
  presentation: RAVSCORE_PRESENTATION_POLICY,
  bestTime: RAVSCORE_BEST_TIME_POLICY,
  currentSupply: RAVSCORE_CURRENT_SUPPLY_POLICY,
  waveMobilisation: RAVSCORE_WAVE_MOBILISATION_POLICY,
  lastMile: RAVSCORE_LAST_MILE_POLICY,
  huntability: RAVSCORE_HUNTABILITY_POLICY,
  uncertainty: {
    modelMaturity: 'HISTORICAL_OWNER_APPROVED_ROLLBACK_ORACLE_NOT_FIND_CALIBRATED',
    localBathymetryIncluded: false,
    resolvedSurfZoneIncluded: false,
    localAmberInventoryObserved: false,
  },
});

// The contract digest binds Candidate G's canonical parameter object. The
// separate bundle digest binds the normalized transitive rollback evaluator,
// state, adapter, public projection/presenter and manual controller closure.
export const RAVSCORE_MODEL_CONTRACT_SHA256 =
  GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256;
export const RAVSCORE_MODEL_BUNDLE_SHA256 =
  GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256;

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
  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(binding).sort();
  if ((prototype !== Object.prototype && prototype !== null)
    || JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error(`${label} has an incompatible exact key set`);
  }
  for (const [key, value] of Object.entries(expected)) {
    if (binding[key] !== value) throw new Error(`${label} has incompatible ${key}`);
  }
  return true;
}
