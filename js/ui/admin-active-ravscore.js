import {
  RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS as MODEL_BINDING_FIELDS,
  assertExactPublicRavScoreProfile,
  assertSameExactPublicRavScoreProfile,
} from '../core/ravscore-public-profile-contract.js?v=4.0.317';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

const ACTIVE_MODEL_MODES = Object.freeze({
  'integrated-model-only-local-fail-closed': Object.freeze({
    kind: 'integrated',
    labelDa: 'Integreret kystprocesmodel',
    switchVersion: 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0',
    availabilityPolicy: 'integrated-model-local-fail-closed',
    observationCalibrationEligible: true,
    completeReadinessRequired: true,
    historyIncompleteAllowed: true,
    rollbackTarget: 'required-distinct',
    statusDa: 'Den integrerede kystprocesmodel er den ene offentlige model.',
  }),
  'manual-candidate-g-only-local-fail-closed': Object.freeze({
    kind: 'candidate-g-rollback',
    labelDa: 'Candidate G · manuel driftsrollback',
    switchVersion: 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2',
    availabilityPolicy: 'candidate-g-local-fail-closed',
    observationCalibrationEligible: false,
    completeReadinessRequired: true,
    historyIncompleteAllowed: false,
    rollbackTarget: 'none',
    statusDa: 'Candidate G er den ene offentlige model under en verificeret manuel driftsrollback.',
  }),
});

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, fields) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  return actual.length === expected.length
    && actual.every((field, index) => field === expected[index]);
}

function assertBindingShape(binding, label) {
  if (!exactKeys(binding, MODEL_BINDING_FIELDS)) {
    throw new Error(`${label} har ikke den eksakte offentlige modelbinding.`);
  }
  for (const field of MODEL_BINDING_FIELDS) {
    const value = binding[field];
    const valid = field === 'modelContractSha256' || field === 'modelBundleSha256'
      ? typeof value === 'string' && SHA256_PATTERN.test(value)
      : typeof value === 'string' && SAFE_ID_PATTERN.test(value);
    if (!valid) throw new Error(`${label} har et ugyldigt ${field}.`);
  }
  return true;
}

function sameBinding(left, right) {
  return MODEL_BINDING_FIELDS.every(field => left?.[field] === right?.[field]);
}

function requireSameBinding(binding, expected, label) {
  assertBindingShape(binding, label);
  if (!sameBinding(binding, expected)) {
    throw new Error(`${label} tilhører en anden offentlig RavScore-model eller bundle.`);
  }
}

function frozenCopy(value) {
  return Object.freeze({ ...value });
}

/**
 * Resolves the active public model exclusively from a manifest-bound runtime
 * that data-service has already hash- and bundle-verified. This consumer does
 * not import or evaluate Candidate G as a second public model.
 */
export function resolveAdminActivePublicRavScore({ manifest, conditions } = {}) {
  const runtimeBinding = conditions?.ravScoreRuntime?.modelBinding;
  assertBindingShape(runtimeBinding, 'Startpakkens runtimebinding');

  const bindingSources = [
    ['Manifestets modelbinding', manifest?.ravScoreModelBinding],
    ['Manifestets runtimebinding', manifest?.ravScoreRuntime?.modelBinding],
    ['Startpakkens kystdelsbinding', conditions?.coastalParts?.modelBinding],
  ];
  if (conditions?.nationalForecast?.modelBinding) {
    bindingSources.push(['Startpakkens prognosebinding', conditions.nationalForecast.modelBinding]);
  }
  for (const [label, binding] of bindingSources) {
    requireSameBinding(binding, runtimeBinding, label);
  }

  const profile = conditions?.coastalParts?.scoreProfile;
  if (!isRecord(profile)) throw new Error('Startpakken mangler den aktive offentlige scoreprofil.');
  assertExactPublicRavScoreProfile(profile, runtimeBinding, 'Startpakkens scoreprofil');
  assertSameExactPublicRavScoreProfile(manifest?.ravScoreProfile, profile, runtimeBinding,
    'Manifestets scoreprofil');

  const mode = ACTIVE_MODEL_MODES[profile.activationState];
  if (!mode) throw new Error('Den offentlige RavScore-model har en ukendt aktiveringstilstand.');
  const availability = conditions?.coastalParts?.scoreAvailability;
  const manifestAvailability = manifest?.ravScoreAvailability;
  if (!isRecord(availability) || availability.policy !== mode.availabilityPolicy
    || !isRecord(manifestAvailability)
    || manifestAvailability.policy !== mode.availabilityPolicy) {
    throw new Error('Scoretilgængelighed og aktiv RavScore-profil bruger ikke samme policy.');
  }
  const historyIncompleteZones = Array.isArray(availability.historyIncompleteZones)
    ? availability.historyIncompleteZones : [];
  const historyIncompleteReady = mode.historyIncompleteAllowed === true
    && availability.allZonesActive === true
    && Number.isSafeInteger(availability.historyIncompleteModeCount)
    && availability.historyIncompleteModeCount > 0
    && Number.isSafeInteger(availability.historyIncompleteZoneCount)
    && availability.historyIncompleteZoneCount === historyIncompleteZones.length
    && historyIncompleteZones.every(zone => Number.isFinite(zone?.historyCoverageHours)
      && zone.historyCoverageHours >= 0
      && zone.historyCoverageHours <= 48
      && Array.isArray(zone.historyReasonCodes)
      && zone.historyReasonCodes.length > 0
      && zone.historyReasonCodes.every(code => typeof code === 'string'
        && /^[A-Z][A-Z0-9_]{0,127}$/.test(code)))
    && manifestAvailability.historyIncompleteModeCount === availability.historyIncompleteModeCount
    && manifestAvailability.historyIncompleteZoneCount === availability.historyIncompleteZoneCount
    && manifestAvailability.allCurrentScoresFullHistory === false;
  const rollbackTargetValid = mode.rollbackTarget === 'none'
    ? profile.rollbackModelId === null
    : typeof profile.rollbackModelId === 'string'
      && SAFE_ID_PATTERN.test(profile.rollbackModelId)
      && profile.rollbackModelId !== runtimeBinding.modelId;
  const readinessFieldsValid = ['modelCoverageReady', 'modelMemoryReady', 'modelMigrationReady']
    .every(field => typeof profile[field] === 'boolean');
  const readinessValid = readinessFieldsValid && (mode.completeReadinessRequired !== true
    || (profile.modelCoverageReady === true
      && profile.modelMigrationReady === true
      && (profile.modelMemoryReady === true || historyIncompleteReady)));
  const historyQualityMatchesProfile = mode.historyIncompleteAllowed !== true
    || (profile.modelMemoryReady === true
      ? availability.allCurrentScoresFullHistory === true
        && availability.historyIncompleteModeCount === 0
      : historyIncompleteReady);
  if (typeof profile.schemaVersion !== 'string'
    || !SAFE_ID_PATTERN.test(profile.schemaVersion)
    || profile.switchVersion !== mode.switchVersion
    || profile.memoryReferenceScope !== 'CURRENT_COMMON_ZONE_REFERENCE'
    || !rollbackTargetValid
    || !readinessValid
    || !historyQualityMatchesProfile
    || profile.publicAvailabilityPolicy !== mode.availabilityPolicy
    || profile.runtimeFallbackModelId !== null
    || profile.crossModelRuntimeFallbackAllowed !== false
    || profile.automaticActivationAllowed !== false) {
    throw new Error('Den offentlige RavScore-profil tillader en ukendt eller blandet driftsvej.');
  }
  const binding = frozenCopy(runtimeBinding);
  const scoreProfile = Object.freeze({
    schemaVersion: profile.schemaVersion,
    switchVersion: profile.switchVersion,
    activationState: profile.activationState,
    publicAvailabilityPolicy: profile.publicAvailabilityPolicy,
    modelCoverageReady: profile.modelCoverageReady === true,
    modelMemoryReady: profile.modelMemoryReady === true,
    modelMigrationReady: profile.modelMigrationReady === true,
  });
  const diagnosticScoreProfile = Object.freeze({
    ...binding,
    activeModelKind: mode.kind,
    activeModelLabelDa: mode.labelDa,
    activationState: profile.activationState,
    publicAvailabilityPolicy: profile.publicAvailabilityPolicy,
    weights: Object.freeze({ huntability: 20, transport: 50, mobilisation: 30 }),
    observationCalibrationEligible: mode.observationCalibrationEligible,
    adminRules: false,
    publicShadow: false,
    crossModelFallback: false,
  });
  const historyQuality = Object.freeze({
    allCurrentScoresFullHistory: availability.allCurrentScoresFullHistory === true,
    fullHistoryModeCount: availability.fullHistoryModeCount ?? null,
    historyIncompleteModeCount: availability.historyIncompleteModeCount ?? null,
    historyIncompleteZoneCount: availability.historyIncompleteZoneCount ?? null,
    calibrationEligible: availability.allCurrentScoresFullHistory === true,
  });

  return Object.freeze({
    kind: mode.kind,
    labelDa: mode.labelDa,
    statusDa: mode.statusDa,
    observationCalibrationEligible: mode.observationCalibrationEligible,
    binding,
    scoreProfile,
    diagnosticScoreProfile,
    historyQuality,
  });
}

export function applyAdminObservationModelPolicy(dto, activeModel) {
  if (!isRecord(dto) || !isRecord(activeModel) || !isRecord(activeModel.binding)) {
    throw new Error('Observationen mangler en verificeret aktiv offentlig modelbinding.');
  }
  assertBindingShape(activeModel.binding, 'Observationens aktive modelbinding');
  if (activeModel.observationCalibrationEligible !== false) return dto;
  return Object.freeze({
    ...dto,
    calibration_eligible: false,
    calibration_binding_status: dto.calibration_binding_status === 'current-eligible'
      ? 'current-ineligible'
      : dto.calibration_binding_status,
  });
}

export { MODEL_BINDING_FIELDS };
