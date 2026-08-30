#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import { evaluateRavScoreIntegrated } from '../js/core/ravscore-integrated.js';
import { waveApproachDeliveryContext } from '../js/core/ravscore-wave-approach-state.js';
import { buildIntegratedRavScoreStateSeries }
  from '../js/core/ravscore-integrated-state-pipeline.js';
import {
  RAVSCORE_COLD_REPLAY_ID,
  RAVSCORE_CURRENT_SUPPLY_POLICY,
  RAVSCORE_LAST_MILE_POLICY,
  RAVSCORE_MIGRATION_ID,
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_PROFILE_ID,
  RAVSCORE_PUBLIC_FORECAST_HOURS,
  RAVSCORE_RECOVERY_POLICY,
  RAVSCORE_SCORE_QUALITY,
  RAVSCORE_STATE_SCHEMA_VERSION,
  RAVSCORE_VARIANT_ID,
  RAVSCORE_WEIGHTS,
  RAVSCORE_WAVE_MOBILISATION_POLICY,
  assertRavScoreModelBinding,
  ravScoreModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  CANDIDATE_G_ROLLBACK_MODEL_ID,
  RAVSCORE_MEMORY_REFERENCE_SCOPE,
} from '../js/core/ravscore-public-model.js';
import {
  RAVSCORE_PUBLIC_DETAILS_KIND,
  RAVSCORE_PUBLIC_STARTUP_KIND,
  assertPublicRuntimeEnvelope,
  assertPublicRuntimeManifest,
  canonicalPublicRuntimeJson,
  publicRuntimeDocumentBody,
} from '../js/core/ravscore-public-runtime-contract.js';
import {
  assertExactPublicRavScoreProfile,
  assertSameExactPublicRavScoreProfile,
} from '../js/core/ravscore-public-profile-contract.js';
import { compactIntegratedRavScoreMode } from './lib/ravscore-integrated-runtime.mjs';
import {
  CANDIDATE_G_CONTINUATION_FIELDS,
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
  assertCandidateGRollbackContinuation,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  assertRavScoreModelBinding as assertCandidateGRollbackModelBinding,
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import { ravScoreSamplingContextKey } from './lib/ravscore-sampling-context.mjs';
import {
  assertPublicRuntimePrivacy,
  buildPublicConditionDetails,
  buildPublicConditions,
  buildPublicManifest,
  compactJson,
  sha256Text,
} from './public-conditions-lib.mjs';

const DEFAULT_INPUT = 'data/live/conditions.json';
const DEFAULT_STARTUP = 'data/live/public-conditions.json';
const DEFAULT_DETAILS = 'data/live/public-condition-details.json';
const DEFAULT_MANIFEST = 'data/live/manifest.json';
const DEFAULT_COASTAL_PARTS = 'data/live/coastal-parts-v2.json';
const DEFAULT_ZONE_REGISTRY = 'data/zones.geojson';
const DEFAULT_OUTPUT = '.geometry-v2-work/ravscore-integrated-public-runtime-audit.json';
const EXPECTED_ZONES = 210;
const EXPECTED_PARTS = 673;
const MODES = Object.freeze(['waders', 'beach']);
const HOUR_MS = 3_600_000;
const SHA256_KEY_PATTERN = /^sha256:[a-f0-9]{64}$/;
const HISTORY_REASON_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;
const EPSILON = 1e-6;
const scoreQualityRank = value => value === RAVSCORE_SCORE_QUALITY.FULL_HISTORY ? 0
  : value === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE ? 1
    : 2;

const INTEGRATED_STATE_FIELDS = Object.freeze([
  'schemaVersion',
  'modelId',
  'variantId',
  'profileId',
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
  'modelContractSha256',
  'modelBundleSha256',
  'samplingContextKey',
  'time',
  'currentReferenceAt',
  'currentMemoryReady',
  'currentMemoryStatus',
  'currentMemoryWindowHours',
  'currentMemoryCoverageHours',
  'currentEvidence',
  'currentNativeHoldAuthorization',
  'currentNativeHoldIntervalEnds',
  'supplyPotential',
  'historyBounds',
  'waveStateSchemaVersion',
  'wavePolicyId',
  'waveLastVerifiedAt',
  'waveMigrationSeedAt',
  'waveMemoryReady',
  'waveMemoryStatus',
  'waveEnergyScore',
  'waveMigrationSeedAwaitingReference',
  'mobilisationPotential',
  'rollbackCandidateGMobilisationPotential',
  'waveApproachState',
  'lineage',
]);

const INTEGRATED_PART_MODEL_FIELDS = Object.freeze([
  ...Object.keys(ravScoreModelBinding()),
  'weights',
  'scoreImpact',
  'automaticActivationAllowed',
  'publicScoreChanged',
  'referenceAt',
  'currentReferenceAt',
  'currentTransition',
  'currentMemoryReady',
  'currentMemoryStatus',
  'currentMemoryCoverageHours',
  'currentMemoryWindowHours',
  'waveLastVerifiedAt',
  'waveMemoryReady',
  'waveMemoryStatus',
  'lastMileWaveReferenceAt',
  'lastMileMemoryReady',
  'lastMileMemoryStatus',
  'migrationApplied',
  'migrationId',
  'initialStateAccepted',
  'initialStateSource',
  'currentState',
  'modes',
]);

const INTEGRATED_READY_MODE_FIELDS = Object.freeze([
  'available',
  'score',
  'scoreQuality',
  'calibrationEligible',
  'scoreSemantics',
  'conservativeTailResetApplied',
  'scoreBounds',
  'historyCoverageHours',
  'historyReasonCodes',
  'modelVersion',
  'modelId',
  'modelContractSha256',
  'modelBundleSha256',
  'modelBinding',
  'components',
  'scoreCalculation',
  'diagnostics',
  'explanation',
  'confidence',
]);

const finite = value => typeof value === 'number' && Number.isFinite(value);
const safeNonNegativeInteger = value => Number.isSafeInteger(value) && value >= 0;
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const close = (left, right) => finite(left) && finite(right)
  && Math.abs(left - right) <= EPSILON;
const sameKeys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
const sameCanonical = (left, right) => canonicalPublicRuntimeJson(left)
  === canonicalPublicRuntimeJson(right);
const exactRegionalHoldAuthorization = value => sameKeys(value, [
  'sourceClass',
  'source',
  'collection',
  'distanceKm',
])
  && value.sourceClass === 'owner-approved-regional-proxy'
  && value.source === 'dmi-dkss-lf-regional-proxy'
  && value.collection === 'dkss_lf'
  && finite(value.distanceKm)
  && value.distanceKm >= 0
  && value.distanceKm <= 15;

function exactHistoryReasonCodes(value, { required = false } = {}) {
  return Array.isArray(value)
    && (!required || value.length > 0)
    && value.every(code => typeof code === 'string'
      && HISTORY_REASON_CODE_PATTERN.test(code))
    && new Set(value).size === value.length;
}

function exactPublicScoreQuality(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !exactHistoryReasonCodes(value.historyReasonCodes)) return false;
  if (value.available === false) {
    return value.score === null
      && value.scoreQuality === RAVSCORE_SCORE_QUALITY.UNAVAILABLE
      && value.calibrationEligible === false
      && value.scoreSemantics === null
      && value.conservativeTailResetApplied === false
      && value.scoreBounds === null
      && value.historyCoverageHours === null
      && value.historyReasonCodes.length === 0;
  }
  const bounds=value.scoreBounds;
  if (value.available !== true || !finite(value.score)
    || !finite(value.historyCoverageHours)
    || value.historyCoverageHours < 0
    || value.historyCoverageHours > RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
    || !sameKeys(bounds,['lower','upper','modelUncertaintyPoints','rawLower','rawUpper'])
    || !['lower','upper','modelUncertaintyPoints','rawLower','rawUpper']
      .every(field=>finite(bounds[field]))
    || bounds.lower<0||bounds.upper>100||bounds.lower>bounds.upper
    || bounds.rawLower<0||bounds.rawUpper>100||bounds.rawLower>bounds.rawUpper
    || !close(bounds.modelUncertaintyPoints,bounds.upper-bounds.lower)
    || value.score!==bounds.lower
    || typeof value.conservativeTailResetApplied!=='boolean') return false;
  if (value.scoreQuality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY) {
    return value.calibrationEligible === true
      && value.historyCoverageHours === RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
      && value.historyReasonCodes.length === 0
      && bounds.lower===bounds.upper&&bounds.rawLower===bounds.rawUpper
      && ['EXACT_POINT_SCORE','CONSERVATIVE_TAIL_RESET_POINT_SCORE']
        .includes(value.scoreSemantics)
      && value.conservativeTailResetApplied
        ===(value.scoreSemantics==='CONSERVATIVE_TAIL_RESET_POINT_SCORE');
  }
  return value.scoreQuality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
    && value.calibrationEligible === false
    && value.scoreSemantics==='CONSERVATIVE_ENCLOSING_LOWER_BOUND'
    && exactHistoryReasonCodes(value.historyReasonCodes, { required:true });
}

function exactHistoryIncompleteZoneSummary(value) {
  return sameKeys(value, [
    'zoneId', 'zoneName', 'modes', 'historyCoverageHours', 'historyReasonCodes',
  ])
    && typeof value.zoneId === 'string'
    && value.zoneId.length > 0
    && typeof value.zoneName === 'string'
    && value.zoneName.length > 0
    && Array.isArray(value.modes)
    && value.modes.length > 0
    && value.modes.every(mode => MODES.includes(mode))
    && new Set(value.modes).size === value.modes.length
    && finite(value.historyCoverageHours)
    && value.historyCoverageHours >= 0
    && value.historyCoverageHours <= RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
    && exactHistoryReasonCodes(value.historyReasonCodes, { required:true });
}

function lastMileFactorFromTrack(track) {
  const activity = track.activityMoment;
  const penalty = Math.max(0, Math.min(
    activity,
    (activity - track.normalMoment)
      / (1 - RAVSCORE_LAST_MILE_POLICY.approachNeutralNormalAlignment),
  ));
  return Math.max(
    RAVSCORE_LAST_MILE_POLICY.minimumDeliveryFactor,
    Math.min(
      RAVSCORE_LAST_MILE_POLICY.maximumDeliveryFactor,
      1 - RAVSCORE_LAST_MILE_POLICY.maximumAttenuationShare * penalty,
    ),
  );
}

function historyScoreViewFromContinuation(state, persisted) {
  const bounds = state?.historyBounds;
  const current = bounds?.current;
  const wave = bounds?.waveMobilisation;
  const lastMile = bounds?.lastMile;
  if (![current?.lowerPotential, current?.upperPotential,
    wave?.lowerPotential, wave?.upperPotential,
    lastMile?.minimumFactorTrack?.activityMoment,
    lastMile?.minimumFactorTrack?.normalMoment,
    lastMile?.maximumFactorTrack?.activityMoment,
    lastMile?.maximumFactorTrack?.normalMoment].every(finite)) {
    throw new Error('Schema-6 continuation lacks finite history bounds');
  }
  const waveOpen = wave.lastUnknownAt !== null && wave.conservativeResetAt === null;
  const lastMileOpen = lastMile.lastUnknownAt !== null
    && lastMile.conservativeResetAt === null;
  const currentReasonCodes = (persisted?.historyReasonCodes ?? [])
    .filter(code => [
      'CURRENT_HISTORY_MISSING_EVIDENCE',
      'CURRENT_HISTORY_BOUNDARY_UNCOVERED',
      'CURRENT_HISTORY_TIME_GAP',
      'CURRENT_HISTORY_TAIL_UNCOVERED',
    ].includes(code));
  const currentIncomplete = !RAVSCORE_CURRENT_SUPPLY_POLICY.readyStatuses
    .includes(state.currentMemoryStatus)
    || state.currentMemoryCoverageHours < RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
    || Math.abs(current.upperPotential - current.lowerPotential) > EPSILON;
  const expectedTailReasonCodes = [
    ...(waveOpen ? ['WAVE_MOBILISATION_HISTORY_INCOMPLETE'] : []),
    ...(lastMileOpen ? ['LAST_MILE_HISTORY_INCOMPLETE'] : []),
  ];
  const expectedReasonCodes = [...currentReasonCodes, ...expectedTailReasonCodes];
  const incomplete = currentIncomplete || waveOpen || lastMileOpen;
  const quality = incomplete
    ? RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
    : RAVSCORE_SCORE_QUALITY.FULL_HISTORY;
  const conservativeTailResetApplied = wave.conservativeResetAt !== null
    || lastMile.conservativeResetAt !== null;
  const persistedUnavailable = persisted?.scoreQuality
    === RAVSCORE_SCORE_QUALITY.UNAVAILABLE;
  if (persistedUnavailable && (persisted?.available !== false
    || persisted?.score !== null
    || persisted?.scoreBounds !== null
    || persisted?.scoreSemantics !== null
    || persisted?.calibrationEligible !== false
    || persisted?.historyCoverageHours !== null
    || !Array.isArray(persisted?.historyReasonCodes)
    || persisted.historyReasonCodes.length !== 0
    || persisted?.conservativeTailResetApplied !== false)) {
    throw new Error('Persisted UNAVAILABLE history envelope is not clean');
  }
  if (!persistedUnavailable && (persisted?.scoreQuality !== quality
    || persisted?.calibrationEligible !== !incomplete
    || persisted?.historyCoverageHours !== state.currentMemoryCoverageHours
    || persisted?.conservativeTailResetApplied !== conservativeTailResetApplied
    || sameCanonical(
      [...(persisted?.historyReasonCodes ?? [])].sort(),
      [...expectedReasonCodes].sort(),
    ) !== true
    || (currentIncomplete !== (currentReasonCodes.length > 0)))) {
    throw new Error('Persisted history quality is not derivable from schema-6 continuation');
  }
  return {
    available: true,
    quality,
    calibrationEligible: !incomplete,
    coverageHours: state.currentMemoryCoverageHours,
    requiredHours: RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours,
    reasonCodes: expectedReasonCodes,
    conservativeTailResetApplied,
    current: {
      lowerPotential: current.lowerPotential,
      upperPotential: current.upperPotential,
    },
    waveMobilisation: {
      lowerPotential: wave.lowerPotential,
      upperPotential: wave.upperPotential,
    },
    lastMile: {
      lowerFactor: lastMileFactorFromTrack(lastMile.minimumFactorTrack),
      upperFactor: lastMileFactorFromTrack(lastMile.maximumFactorTrack),
    },
  };
}

function integratedEvaluationState(state, model, weather, persisted) {
  const lastMile = waveApproachDeliveryContext(state?.waveApproachState);
  return {
    ...state,
    historyScoreView: historyScoreViewFromContinuation(state, persisted),
    currentVerified: weather?.currentProvenance?.status === 'verified',
    currentTransition: model?.currentTransition ?? null,
    lastMileWaveReferenceAt: state?.waveApproachState?.waveReferenceAt ?? null,
    lastMileMemoryReady: state?.waveApproachState?.readiness === true,
    lastMileMemoryStatus: state?.waveApproachState?.status ?? null,
    lastMileEvidenceStatus: lastMile.available
      ? 'DIRECTIONAL_WAVE_EVIDENCE_READY'
      : 'WAVE_APPROACH_STATE_NOT_READY',
    lastMileWaveActivity: lastMile.activity,
    lastMileNormalAlignment: lastMile.normalAlignment,
    lastMileTangentAlignment: lastMile.tangentAlignment,
    lastMileCoherence: lastMile.coherence,
    lastMileApproach: lastMile.approach,
    lastMileFactor: lastMile.factor,
  };
}

function createCollector() {
  const counts = new Map();
  return {
    add(condition, code, amount = 1) {
      if (condition) return;
      counts.set(code, (counts.get(code) ?? 0) + amount);
    },
    fail(code, amount = 1) {
      counts.set(code, (counts.get(code) ?? 0) + amount);
    },
    result() {
      return {
        errors: [...counts.keys()].sort(),
        errorCounts: Object.fromEntries([...counts.entries()].sort(([left], [right]) =>
          left.localeCompare(right))),
      };
    },
  };
}

function assertCanonicalBinding(binding) {
  const source = binding?.modelBinding ?? binding;
  const projected = Object.fromEntries(Object.keys(ravScoreModelBinding()).map(key => [
    key,
    key === 'stateSchemaVersion' && source?.stateSchemaVersion === undefined
      ? source?.schemaVersion
      : source?.[key],
  ]));
  assertRavScoreModelBinding(projected);
  return true;
}

function publicModeFormulaIsConsistent(mode, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (value.available !== true) {
    return exactPublicScoreQuality(value)
      && value.score === null
      && typeof value?.unavailability?.code === 'string'
      && Array.isArray(value.reasons)
      && value.reasons.length > 0;
  }
  const explanation = value.explanation;
  const components = value.components;
  const contributions = explanation?.contributions;
  if (!exactPublicScoreQuality(value)
    || !finite(value.score) || value.score < 0 || value.score > 100
    || (value.scoreProfileId !== undefined && value.scoreProfileId !== RAVSCORE_MODEL_ID)
    || !assertCanonicalBinding(value.modelBinding ?? explanation)
    || !assertCanonicalBinding(explanation)
    || !components || !contributions
    || !['huntability', 'transport', 'release'].every(key => finite(components[key]))
    || !['huntability', 'transport', 'release'].every(key => finite(contributions[key]))
    || explanation?.weights?.huntability !== RAVSCORE_WEIGHTS.huntability
    || explanation?.weights?.transport !== RAVSCORE_WEIGHTS.transport
    || explanation?.weights?.release !== RAVSCORE_WEIGHTS.mobilisation) {
    return false;
  }
  const rawScore = contributions.huntability + contributions.transport + contributions.release;
  const roundedScore = Math.round(Math.max(0, Math.min(100, rawScore)));
  if (mode === 'waders'
    && (!finite(explanation.wadersHuntabilityMaximum)
      || explanation.wadersHuntabilityMaximum < 0
      || explanation.wadersHuntabilityMaximum > 100)) return false;
  const expectedFinal = mode === 'waders'
    ? Math.min(roundedScore, explanation.wadersHuntabilityMaximum)
    : roundedScore;
  return close(rawScore, explanation.rawScore)
    && explanation.roundedScore === roundedScore
    && explanation.finalScore === expectedFinal
    && value.score === expectedFinal
    && (value.baseScore === undefined || value.baseScore === expectedFinal)
    && explanation.scoreIsSafetyAdvice === false
    && explanation.scoreIsFindProbability === false
    && explanation?.transportDiagnostics?.engine === 'INTEGRATED_COASTAL_PROCESS'
    && explanation?.transportDiagnostics?.outflowWholeScoreGateApplied === false
    && explanation?.transportDiagnostics?.resolvedSurfZoneIncluded === false
    && explanation?.waterLevelContext?.scoreEffectPoints === 0;
}

function containsRetiredPublicModelField(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsRetiredPublicModelField);
  return Object.entries(value).some(([key, nested]) =>
    (/^candidateG/i.test(key) || /shadow/i.test(key))
      || containsRetiredPublicModelField(nested));
}

function containsForbiddenStateMaterial(value) {
  if (Array.isArray(value)) {
    if (value.length === 2 && value.every(finite)) return true;
    return value.some(containsForbiddenStateMaterial);
  }
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) =>
    (/^(?:current)?[uv](?:mps)?$/i.test(key)
      || /^(?:current|wind|wave)(?:speed|direction|height|period)/i.test(key)
      || /^(?:waterPoint|landPoint|gridPoint|samplingPoint|coordinates?|latitude|longitude|lat|lon|lng)$/i.test(key)
      || containsForbiddenStateMaterial(nested)));
}

function containsForbiddenPublicDestinationMaterial(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenPublicDestinationMaterial);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, nested]) =>
    (/^(?:current)?[uv](?:mps)?$/i.test(key)
      || /^(?:rawPayload|privatePayload|privateDiagnostic|gridPoint|samplingPoint|coordinates?|latitude|longitude|lat|lon|lng)$/i.test(key)
      || /^(?:currentEvidence|transportEvidence|waveEvidence|currentState|continuationState|stateKey|samplingContextKey)$/i.test(key)
      || containsForbiddenPublicDestinationMaterial(nested)));
}

function addPublicPackageChecks({
  full,
  startup,
  startupText,
  details,
  detailsText,
  coastalPartsText,
  zoneRegistryText,
  manifest,
  collector,
  expectedZoneCount,
  expectedPartCount,
}) {
  let expectedStartup;
  let expectedDetails;
  try {
    expectedStartup = buildPublicConditions(full);
    expectedDetails = buildPublicConditionDetails(full);
    const expectedStartupText = compactJson(expectedStartup);
    const expectedDetailsText = compactJson(expectedDetails);
    collector.add(sameCanonical(startup, expectedStartup), 'PUBLIC_STARTUP_NOT_CANONICAL');
    collector.add(sameCanonical(details, expectedDetails), 'PUBLIC_DETAILS_NOT_CANONICAL');
    // The production CLI always uses the fixed 210/673 defaults and therefore
    // verifies the exact canonical production manifest. Smaller expected counts
    // are retained solely for deterministic unit audits of individual score and
    // state contracts; the public manifest producer itself remains national-only.
    if (expectedZoneCount === EXPECTED_ZONES && expectedPartCount === EXPECTED_PARTS) {
      const expectedManifest = buildPublicManifest(
        full,
        expectedStartupText,
        expectedDetailsText,
        coastalPartsText,
        zoneRegistryText,
      );
      collector.add(sameCanonical(manifest, expectedManifest), 'PUBLIC_MANIFEST_NOT_CANONICAL');
    }
  } catch {
    collector.fail('PUBLIC_PROJECTION_FAILED');
    return { startupBytes: 0, detailsBytes: 0 };
  }

  collector.add(startupText === compactJson(startup), 'PUBLIC_STARTUP_NOT_COMPACT');
  collector.add(detailsText === compactJson(details), 'PUBLIC_DETAILS_NOT_COMPACT');
  collector.add(Object.keys(startup?.zones ?? {}).length === expectedZoneCount,
    'PUBLIC_STARTUP_ZONE_COUNT_MISMATCH');
  collector.add(Object.keys(details?.zones ?? {}).length === expectedZoneCount,
    'PUBLIC_DETAILS_ZONE_COUNT_MISMATCH');
  collector.add(Object.keys(startup?.coastalParts?.zones ?? {}).length === expectedZoneCount,
    'PUBLIC_STARTUP_COASTAL_ZONE_COUNT_MISMATCH');
  collector.add(Object.keys(details?.coastalParts?.zones ?? {}).length === expectedZoneCount,
    'PUBLIC_DETAILS_COASTAL_ZONE_COUNT_MISMATCH');
  collector.add(Object.keys(details?.coastalParts?.parts ?? {}).length === expectedPartCount,
    'PUBLIC_DETAILS_PART_COUNT_MISMATCH');
  const startupPartCount = Object.keys(startup?.coastalParts?.parts ?? {}).length;
  collector.add(startupPartCount > 0 && startupPartCount <= expectedZoneCount * MODES.length,
    'PUBLIC_STARTUP_WINNER_PART_SET_NOT_COMPACT');
  collector.add(Object.values(startup?.coastalParts?.parts ?? {})
    .every(part => part?.current === undefined && part?.ravScoreModel === undefined),
  'PUBLIC_STARTUP_CONTAINS_DETAIL_OR_STATE');

  try {
    assertPublicRuntimeEnvelope(startup, {
      kind: RAVSCORE_PUBLIC_STARTUP_KIND,
      datasetId: full.datasetId,
      productionReferenceAt: full.productionReferenceAt,
      label: 'startup payload',
    });
  } catch {
    collector.fail('PUBLIC_STARTUP_ENVELOPE_INVALID');
  }
  try {
    assertPublicRuntimeEnvelope(details, {
      kind: RAVSCORE_PUBLIC_DETAILS_KIND,
      datasetId: full.datasetId,
      productionReferenceAt: full.productionReferenceAt,
      label: 'details payload',
    });
  } catch {
    collector.fail('PUBLIC_DETAILS_ENVELOPE_INVALID');
  }
  try {
    const expectedBinding = ravScoreModelBinding();
    assertExactPublicRavScoreProfile(startup?.coastalParts?.scoreProfile, expectedBinding,
      'integrated startup score profile');
    assertSameExactPublicRavScoreProfile(details?.coastalParts?.scoreProfile,
      startup?.coastalParts?.scoreProfile, expectedBinding, 'integrated detail score profile');
    assertSameExactPublicRavScoreProfile(manifest?.ravScoreProfile,
      startup?.coastalParts?.scoreProfile, expectedBinding, 'integrated manifest score profile');
  } catch {
    collector.fail('PUBLIC_PROFILE_BINDING_INVALID');
  }
  try {
    assertPublicRuntimeManifest(manifest?.ravScoreRuntime, {
      modelBinding: ravScoreModelBinding(),
      startup: {
        payloadBodySha256: startup?.ravScoreRuntime?.payloadBodySha256,
        fileSha256: manifest?.publicConditionsSha256,
        bytes: manifest?.publicConditionsBytes,
      },
      details: {
        payloadBodySha256: details?.ravScoreRuntime?.payloadBodySha256,
        fileSha256: manifest?.publicConditionDetailsSha256,
        bytes: manifest?.publicConditionDetailsBytes,
      },
      label: 'integrated public manifest runtime',
    });
  } catch {
    collector.fail('PUBLIC_MANIFEST_RUNTIME_INVALID');
  }
  try {
    assertPublicRuntimePrivacy(startup, 'startup');
    assertPublicRuntimePrivacy(details, 'details');
    assertPublicRuntimePrivacy(manifest, 'manifest');
  } catch {
    collector.fail('PUBLIC_PRIVACY_CONTRACT_FAILED');
  }
  collector.add(!containsRetiredPublicModelField(startup)
    && !containsRetiredPublicModelField(details)
    && !containsRetiredPublicModelField(manifest),
  'PUBLIC_SHADOW_FIELD_PRESENT');

  const startupBodyDigest = sha256Text(canonicalPublicRuntimeJson(
    publicRuntimeDocumentBody(startup),
  ));
  const detailsBodyDigest = sha256Text(canonicalPublicRuntimeJson(
    publicRuntimeDocumentBody(details),
  ));
  collector.add(startup?.ravScoreRuntime?.payloadBodySha256 === startupBodyDigest,
    'PUBLIC_STARTUP_BODY_HASH_MISMATCH');
  collector.add(details?.ravScoreRuntime?.payloadBodySha256 === detailsBodyDigest,
    'PUBLIC_DETAILS_BODY_HASH_MISMATCH');
  collector.add(manifest?.publicConditionsSha256 === sha256Text(startupText),
    'PUBLIC_STARTUP_FILE_HASH_MISMATCH');
  collector.add(manifest?.publicConditionDetailsSha256 === sha256Text(detailsText),
    'PUBLIC_DETAILS_FILE_HASH_MISMATCH');
  collector.add(manifest?.publicConditionsBytes === Buffer.byteLength(startupText),
    'PUBLIC_STARTUP_BYTE_COUNT_MISMATCH');
  collector.add(manifest?.publicConditionDetailsBytes === Buffer.byteLength(detailsText),
    'PUBLIC_DETAILS_BYTE_COUNT_MISMATCH');
  collector.add(manifest?.ravScoreRuntime?.startup?.payloadBodySha256 === startupBodyDigest,
    'PUBLIC_MANIFEST_STARTUP_BODY_HASH_MISMATCH');
  collector.add(manifest?.ravScoreRuntime?.details?.payloadBodySha256 === detailsBodyDigest,
    'PUBLIC_MANIFEST_DETAILS_BODY_HASH_MISMATCH');
  collector.add(manifest?.complete === true
    && manifest?.zoneCount === expectedZoneCount
    && manifest?.coastalPartCount === expectedPartCount,
  'PUBLIC_MANIFEST_COVERAGE_INCOMPLETE');
  collector.add(manifest?.recoveryFallback === undefined
    && manifest?.ravScoreRecoveryFallback === undefined,
  'PUBLIC_CROSS_MODEL_FALLBACK_PRESENT');

  const dates = startup?.nationalForecast?.dates;
  collector.add(Array.isArray(dates) && dates.length === 5
    && new Set(dates).size === dates.length,
  'PUBLIC_FIVE_DAY_DATE_CONTRACT_INVALID');
  for (const mode of MODES) {
    const days = startup?.nationalForecast?.modes?.[mode];
    collector.add(Array.isArray(days) && days.length === 5,
      'PUBLIC_FIVE_DAY_MODE_CONTRACT_INVALID');
    for (const day of Array.isArray(days) ? days : []) {
      collector.add(dates?.includes(day?.date)
        && Array.isArray(day?.rows)
        && day.rows.length === Math.min(5, expectedZoneCount)
        && new Set(day.rows.map(row => row?.zoneId)).size === day.rows.length,
      'PUBLIC_FIVE_DAY_RANKING_CONTRACT_INVALID');
    }
  }

  return {
    startupBytes: Buffer.byteLength(startupText),
    detailsBytes: Buffer.byteLength(detailsText),
  };
}

export function auditIntegratedRavScorePublicRuntime(full, {
  startup,
  startupText = startup ? compactJson(startup) : '',
  details,
  detailsText = details ? compactJson(details) : '',
  coastalPartsText = null,
  zoneRegistryText = null,
  manifest,
  expectedZoneCount = EXPECTED_ZONES,
  expectedPartCount = EXPECTED_PARTS,
} = {}) {
  const collector = createCollector();
  const coastal = full?.coastalParts;
  const zones = Object.entries(coastal?.zones ?? {});
  const parts = Object.entries(coastal?.parts ?? {});
  const rootZones = Object.entries(full?.zones ?? {});

  collector.add(typeof full?.datasetId === 'string' && full.datasetId.length > 0,
    'MISSING_DATASET_ID');
  collector.add(validTime(full?.generatedAt), 'INVALID_GENERATED_AT');
  collector.add(validTime(full?.productionReferenceAt), 'INVALID_PRODUCTION_REFERENCE');
  collector.add(coastal?.enabled === true, 'COASTAL_PARTS_NOT_ENABLED');
  collector.add(rootZones.length === expectedZoneCount, 'ROOT_ZONE_COUNT_MISMATCH');
  collector.add(zones.length === expectedZoneCount, 'ZONE_COUNT_MISMATCH');
  collector.add(parts.length === expectedPartCount, 'PART_COUNT_MISMATCH');
  collector.add(safeNonNegativeInteger(coastal?.expectedPartCount)
    && coastal.expectedPartCount === expectedPartCount,
    'EXPECTED_PART_COUNT_MISMATCH');
  collector.add(safeNonNegativeInteger(coastal?.scoredPartCount)
    && coastal.scoredPartCount === expectedPartCount,
    'SCORED_PART_COUNT_MISMATCH');
  collector.add(!containsRetiredPublicModelField(coastal), 'PUBLIC_SHADOW_FIELD_PRESENT');

  try {
    collector.add(assertCanonicalBinding(coastal?.modelBinding), 'ROOT_MODEL_BINDING_MISMATCH');
  } catch {
    collector.fail('ROOT_MODEL_BINDING_MISMATCH');
  }
  const profile = coastal?.scoreProfile;
  try {
    collector.add(assertExactPublicRavScoreProfile(profile, ravScoreModelBinding(),
      'integrated private/public score profile'), 'PUBLIC_PROFILE_NOT_INTEGRATED');
  } catch {
    collector.fail('PUBLIC_PROFILE_NOT_INTEGRATED');
  }
  collector.add(profile?.rollbackModelId === CANDIDATE_G_ROLLBACK_MODEL_ID,
    'EXPLICIT_ROLLBACK_MODEL_MISMATCH');
  collector.add(profile?.runtimeFallbackModelId === null
    && profile?.crossModelRuntimeFallbackAllowed === false,
  'CROSS_MODEL_RUNTIME_FALLBACK_PRESENT');
  collector.add(profile?.activationState === 'integrated-model-only-local-fail-closed'
    && profile?.publicAvailabilityPolicy === 'integrated-model-local-fail-closed'
    && profile?.automaticActivationAllowed === false,
  'INTEGRATED_ACTIVATION_POLICY_MISMATCH');
  collector.add(profile?.memoryReferenceScope === RAVSCORE_MEMORY_REFERENCE_SCOPE,
    'MEMORY_REFERENCE_SCOPE_MISMATCH');
  const profileCoverageAndMigrationReady = profile?.modelCoverageReady === true
    && profile?.modelMigrationReady === true;

  // Candidate G is a separate, private rollback companion. It must be
  // complete and independently bound; schema 6 is never a reconstruction
  // source for Candidate G rollback readiness.
  const rollbackDescriptor = full?.ravScoreCandidateGRollback;
  const rollbackRuntime = rollbackDescriptor?.runtime;
  const rollbackRuntimeParts = rollbackRuntime?.parts
    && typeof rollbackRuntime.parts === 'object'
    && !Array.isArray(rollbackRuntime.parts)
    ? rollbackRuntime.parts : {};
  const integratedPartIds = parts.map(([partId]) => partId).sort();
  const rollbackPartIds = Object.keys(rollbackRuntimeParts).sort();
  const rollbackDescriptorShapeValid = sameKeys(rollbackDescriptor, [
    'schemaVersion',
    'kind',
    'privacyClass',
    'sourceModelBinding',
    'rollbackModelBinding',
    'rollbackId',
    'automaticActivationAllowed',
    'publicDuringNormalOperation',
    'runtime',
  ])
    && rollbackDescriptor.schemaVersion === '1.0.0'
    && rollbackDescriptor.kind === 'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME'
    && rollbackDescriptor.privacyClass === 'PRIVATE_PRODUCTION_RUNTIME'
    && rollbackDescriptor.rollbackId === CANDIDATE_G_OPERATIONAL_ROLLBACK_ID
    && rollbackDescriptor.automaticActivationAllowed === false
    && rollbackDescriptor.publicDuringNormalOperation === false;
  collector.add(rollbackDescriptorShapeValid,
    'ROLLBACK_COMPANION_DESCRIPTOR_INVALID');
  let rollbackBindingsValid = false;
  try {
    assertRavScoreModelBinding(rollbackDescriptor?.sourceModelBinding);
    assertCandidateGRollbackModelBinding(rollbackDescriptor?.rollbackModelBinding);
    assertCandidateGRollbackModelBinding(rollbackRuntime?.modelBinding);
    rollbackBindingsValid = sameCanonical(
      rollbackDescriptor.rollbackModelBinding,
      candidateGRollbackModelBinding(),
    );
  } catch {
    rollbackBindingsValid = false;
  }
  collector.add(rollbackBindingsValid, 'ROLLBACK_COMPANION_BINDING_MISMATCH');
  const rollbackRuntimeReady = rollbackRuntime?.schemaVersion === 1
    && rollbackRuntime?.enabled === true
    && rollbackRuntime?.generatedAt === full?.productionReferenceAt
    && safeNonNegativeInteger(rollbackRuntime?.expectedPartCount)
    && rollbackRuntime.expectedPartCount === expectedPartCount
    && safeNonNegativeInteger(rollbackRuntime?.scoredPartCount)
    && rollbackRuntime.scoredPartCount === expectedPartCount
    && rollbackRuntime?.scoreProfile?.modelCoverageReady === true
    && rollbackRuntime?.scoreProfile?.modelMemoryReady === true
    && rollbackRuntime?.scoreProfile?.modelMigrationReady === true;
  collector.add(rollbackRuntimeReady, 'ROLLBACK_COMPANION_RUNTIME_NOT_READY');
  collector.add(sameCanonical(rollbackPartIds, integratedPartIds),
    'ROLLBACK_COMPANION_PART_COVERAGE_MISMATCH');

  const availability = coastal?.scoreAvailability;
  const availabilityBaseReady = availability?.schemaVersion === 2
    && availability?.policy === 'integrated-model-local-fail-closed'
    && availability?.allZonesActive === true
    && safeNonNegativeInteger(availability?.activeZoneCount)
    && availability.activeZoneCount === expectedZoneCount
    && safeNonNegativeInteger(availability?.unavailableZoneCount)
    && availability.unavailableZoneCount === 0
    && safeNonNegativeInteger(availability?.totalZoneCount)
    && availability.totalZoneCount === expectedZoneCount
    && Array.isArray(availability?.unavailableZones)
    && availability.unavailableZones.length === 0;
  collector.add(availabilityBaseReady, 'PUBLIC_CURRENT_AVAILABILITY_INCOMPLETE');
  const declaredHistoryIncompleteZones = Array.isArray(availability?.historyIncompleteZones)
    ? availability.historyIncompleteZones : [];
  const availabilityQualityShapeReady = typeof availability?.allCurrentScoresFullHistory === 'boolean'
    && safeNonNegativeInteger(availability?.fullHistoryModeCount)
    && safeNonNegativeInteger(availability?.historyIncompleteModeCount)
    && safeNonNegativeInteger(availability?.historyIncompleteZoneCount)
    && availability.historyIncompleteZoneCount === declaredHistoryIncompleteZones.length
    && declaredHistoryIncompleteZones.every(exactHistoryIncompleteZoneSummary)
    && new Set(declaredHistoryIncompleteZones.map(zone => zone.zoneId)).size
      === declaredHistoryIncompleteZones.length;

  const partCountByZone = new Map();
  for (const [, part] of parts) {
    partCountByZone.set(part?.zoneId, (partCountByZone.get(part?.zoneId) ?? 0) + 1);
  }
  let zoneModeCount = 0;
  let unavailableZoneModeCount = 0;
  let currentFullHistoryModeCount = 0;
  let currentHistoryIncompleteModeCount = 0;
  const expectedHistoryIncompleteZones = [];
  const currentRowsByZone = new Map();
  const publicReferenceMs = Date.parse(full?.productionReferenceAt ?? '');
  for (const [zoneId, zone] of zones) {
    const hourly = Array.isArray(zone?.hourly) ? zone.hourly : [];
    const exactPublicAxis = Number.isFinite(publicReferenceMs)
      && hourly.length === RAVSCORE_PUBLIC_FORECAST_HOURS
      && hourly.every((row, index) => Date.parse(row?.time ?? '')
        === publicReferenceMs + index * HOUR_MS);
    collector.add(exactPublicAxis, 'ZONE_PUBLIC_FORECAST_AXIS_INCOMPLETE');
    collector.add(validTime(zone?.currentReferenceAt), 'ZONE_REFERENCE_TIME_INVALID');
    collector.add(zone?.currentReferenceAt === full?.productionReferenceAt,
      'ZONE_REFERENCE_NOT_PUBLIC_FORECAST_START');
    collector.add(safeNonNegativeInteger(zone?.expectedPartCount)
      && safeNonNegativeInteger(zone?.scoredPartCount)
      && zone.expectedPartCount === (partCountByZone.get(zoneId) ?? 0)
      && zone.scoredPartCount === zone.expectedPartCount,
    'ZONE_PART_COVERAGE_MISMATCH');
    const current = hourly.find(row => row?.time === zone.currentReferenceAt);
    collector.add(Boolean(current), 'ZONE_CURRENT_ROW_MISSING');
    if (current) currentRowsByZone.set(zoneId, current);
    const usableDatesByMode = Object.fromEntries(MODES.map(mode => [mode, new Set()]));
    for (const row of hourly) {
      collector.add(validTime(row?.time), 'ZONE_SCORE_TIME_INVALID');
      for (const mode of MODES) {
        zoneModeCount += 1;
        let consistent = false;
        try {
          consistent = publicModeFormulaIsConsistent(mode, row?.[mode]);
        } catch {
          consistent = false;
        }
        collector.add(consistent, 'PUBLIC_ZONE_MODE_CONTRACT_INVALID');
        if (row?.[mode]?.available !== true) unavailableZoneModeCount += 1;
        else usableDatesByMode[mode].add(String(row?.time ?? '').slice(0, 10));
      }
    }
    collector.add(MODES.every(mode => usableDatesByMode[mode].size >= 5),
      'ZONE_FIVE_DAY_MODE_COVERAGE_INCOMPLETE');
    collector.add(hourly.every(row => MODES.every(mode => row?.[mode]?.available === true
      && finite(row?.[mode]?.score))),
    'ZONE_PUBLIC_FORECAST_MODE_UNAVAILABLE');
    collector.add(MODES.every(mode => current?.[mode]?.available === true
      && finite(current?.[mode]?.score)),
    'ZONE_CURRENT_MODE_UNAVAILABLE');
    const historyIncompleteModes = [];
    const historyCoverageHours = [];
    const historyReasonCodes = new Set();
    for (const mode of MODES) {
      const result = current?.[mode];
      if (result?.available !== true || !finite(result.score)) continue;
      if (result.scoreQuality === RAVSCORE_SCORE_QUALITY.FULL_HISTORY) {
        currentFullHistoryModeCount += 1;
      } else if (result.scoreQuality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE) {
        currentHistoryIncompleteModeCount += 1;
        historyIncompleteModes.push(mode);
        historyCoverageHours.push(result.historyCoverageHours);
        for (const code of result.historyReasonCodes ?? []) historyReasonCodes.add(code);
      }
    }
    if (historyIncompleteModes.length > 0) {
      expectedHistoryIncompleteZones.push({
        zoneId,
        modes: historyIncompleteModes,
        historyCoverageHours: Math.min(...historyCoverageHours),
        historyReasonCodes: [...historyReasonCodes].sort(),
      });
    }
  }
  collector.add(unavailableZoneModeCount === 0,
    'PUBLIC_FORECAST_CONTAINS_UNAVAILABLE_ZONE_MODES');
  const normalizedDeclaredHistoryIncompleteZones = declaredHistoryIncompleteZones
    .map(zone => ({
      zoneId: zone.zoneId,
      modes: Array.isArray(zone.modes) ? [...zone.modes].sort() : [],
      historyCoverageHours: zone.historyCoverageHours,
      historyReasonCodes: Array.isArray(zone.historyReasonCodes)
        ? [...zone.historyReasonCodes].sort() : [],
    }))
    .sort((left, right) => left.zoneId.localeCompare(right.zoneId));
  const normalizedExpectedHistoryIncompleteZones = expectedHistoryIncompleteZones
    .map(zone => ({ ...zone, modes:[...zone.modes].sort() }))
    .sort((left, right) => left.zoneId.localeCompare(right.zoneId));
  const currentHistoryQualitySummaryReady = availabilityBaseReady
    && availabilityQualityShapeReady
    && availability.fullHistoryModeCount === currentFullHistoryModeCount
    && availability.historyIncompleteModeCount === currentHistoryIncompleteModeCount
    && availability.historyIncompleteZoneCount === expectedHistoryIncompleteZones.length
    && availability.allCurrentScoresFullHistory
      === (currentHistoryIncompleteModeCount === 0)
    && currentFullHistoryModeCount + currentHistoryIncompleteModeCount
      === expectedZoneCount * MODES.length
    && sameCanonical(
      normalizedDeclaredHistoryIncompleteZones,
      normalizedExpectedHistoryIncompleteZones,
    );
  collector.add(currentHistoryQualitySummaryReady,
    'PUBLIC_CURRENT_HISTORY_QUALITY_INVALID');
  const fullHistoryProfileReady = profile?.modelMemoryReady === true
    && currentHistoryQualitySummaryReady
    && currentHistoryIncompleteModeCount === 0;
  const historyIncompleteProfileReady = profile?.modelMemoryReady === false
    && currentHistoryQualitySummaryReady
    && currentHistoryIncompleteModeCount > 0
    && expectedHistoryIncompleteZones.length > 0;
  collector.add(profileCoverageAndMigrationReady
    && (fullHistoryProfileReady || historyIncompleteProfileReady),
  'PUBLIC_PROFILE_NOT_READY');

  let reconstructedModeCount = 0;
  let stateReplayCount = 0;
  let rollbackReadyPartCount = 0;
  let rollbackEvidenceLimitExceededPartCount = 0;
  let rollbackReconstructionFailurePartCount = 0;
  let rollbackStateContractMismatchPartCount = 0;
  let rollbackOracleMismatchPartCount = 0;
  let migratedStateCount = 0;
  let continuedStateCount = 0;
  let coldReplayStateCount = 0;
  const stateKeys = new Set();
  const initialStateSources = new Set();
  const lineageSources = new Set();
  for (const [partId, part] of parts) {
    const zone = coastal?.zones?.[part?.zoneId];
    const model = part?.ravScoreModel;
    const state = model?.currentState;
    const persistedModesHaveExactQuality = MODES.every(mode =>
      exactPublicScoreQuality(model?.modes?.[mode]));
    const persistedHistoryIncomplete = persistedModesHaveExactQuality
      && MODES.some(mode =>
        model?.modes?.[mode]?.scoreQuality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE);
    collector.add(Boolean(zone), 'PART_ZONE_MISSING');
    collector.add(part?.current?.time === zone?.currentReferenceAt,
      'PART_ZONE_REFERENCE_MISMATCH');
    collector.add(sameKeys(model, INTEGRATED_PART_MODEL_FIELDS),
      'PART_MODEL_FIELD_SET_MISMATCH');
    try {
      collector.add(assertCanonicalBinding(model), 'PART_MODEL_BINDING_MISMATCH');
    } catch {
      collector.fail('PART_MODEL_BINDING_MISMATCH');
    }
    collector.add(model?.scoreImpact === 'active-public'
      && model?.publicScoreChanged === true
      && model?.automaticActivationAllowed === false,
    'PART_MODEL_NOT_ACTIVE_INTEGRATED_ONLY');
    collector.add(sameCanonical(model?.weights, RAVSCORE_WEIGHTS),
      'PART_MODEL_WEIGHT_MISMATCH');
    collector.add(model?.referenceAt === part?.current?.time
      && model?.referenceAt === state?.time
      && model?.currentReferenceAt === state?.currentReferenceAt,
    'PART_STATE_REFERENCE_MISMATCH');
    collector.add((model?.currentMemoryReady === true || persistedHistoryIncomplete)
      && model?.currentMemoryReady === state?.currentMemoryReady
      && model?.currentMemoryStatus === state?.currentMemoryStatus
      && model?.currentMemoryCoverageHours === state?.currentMemoryCoverageHours
      && model?.currentMemoryWindowHours === state?.currentMemoryWindowHours,
    'PART_CURRENT_STATE_METADATA_MISMATCH');
    collector.add((model?.waveMemoryReady === true || persistedHistoryIncomplete)
      && model?.waveMemoryReady === state?.waveMemoryReady
      && model?.waveMemoryStatus === state?.waveMemoryStatus
      && model?.waveLastVerifiedAt === state?.waveLastVerifiedAt,
    'PART_WAVE_STATE_METADATA_MISMATCH');
    let evaluationState = null;
    try {
      evaluationState = integratedEvaluationState(
        state,
        model,
        part?.current?.weather ?? {},
        model?.modes?.waders,
      );
      collector.add((model?.lastMileMemoryReady === true || persistedHistoryIncomplete)
        && model?.lastMileMemoryReady === state?.waveApproachState?.readiness
        && model?.lastMileMemoryStatus === state?.waveApproachState?.status
        && model?.lastMileWaveReferenceAt === state?.waveApproachState?.waveReferenceAt,
      'PART_LAST_MILE_STATE_METADATA_MISMATCH');
    } catch {
      collector.fail('PART_LAST_MILE_STATE_METADATA_MISMATCH');
    }
    collector.add(!containsForbiddenPublicDestinationMaterial(part?.current),
      'PART_CURRENT_CONTAINS_PRIVATE_MATERIAL');
    const migratedTransition = model?.migrationApplied === true
      && model?.initialStateAccepted !== true;
    const continuedTransition = model?.initialStateAccepted === true
      && model?.migrationApplied !== true;
    const coldReplayTransition = model?.initialStateAccepted === false
      && model?.migrationApplied === false
      && [
        'VERIFIED_PRIVATE_48H_COLD_REPLAY',
        'BOUNDED_PRIVATE_PARTIAL_HISTORY_COLD_REPLAY',
      ].includes(model?.initialStateSource);
    collector.add([migratedTransition, continuedTransition, coldReplayTransition]
      .filter(Boolean).length === 1, 'PART_STATE_TRANSITION_AMBIGUOUS');
    if (migratedTransition) {
      migratedStateCount += 1;
      initialStateSources.add(model?.initialStateSource);
      collector.add(model?.migrationId === RAVSCORE_MIGRATION_ID
        && model?.initialStateSource === 'CANDIDATE_G_SCHEMA2_MIGRATION',
      'PART_MIGRATION_METADATA_INVALID');
    } else if (continuedTransition) {
      continuedStateCount += 1;
      initialStateSources.add(model?.initialStateSource);
      collector.add(model?.migrationId === null
        && model?.initialStateSource === 'INTEGRATED_CONTINUATION',
      'PART_CONTINUATION_METADATA_INVALID');
    } else if (coldReplayTransition) {
      coldReplayStateCount += 1;
      initialStateSources.add(model.initialStateSource);
      collector.add(model?.migrationId === null,
        'PART_COLD_REPLAY_METADATA_INVALID');
    }

    collector.add(sameKeys(state, INTEGRATED_STATE_FIELDS), 'STATE_FIELD_SET_MISMATCH');
    try {
      collector.add(assertCanonicalBinding(state), 'STATE_MODEL_BINDING_MISMATCH');
    } catch {
      collector.fail('STATE_MODEL_BINDING_MISMATCH');
    }
    collector.add(SHA256_KEY_PATTERN.test(String(state?.samplingContextKey ?? '')),
      'STATE_SAMPLING_CONTEXT_KEY_INVALID');
    collector.add(!stateKeys.has(state?.samplingContextKey), 'STATE_SAMPLING_CONTEXT_KEY_REUSED');
    if (typeof state?.samplingContextKey === 'string') stateKeys.add(state.samplingContextKey);
    let expectedSamplingContextKey = null;
    try {
      expectedSamplingContextKey = ravScoreSamplingContextKey({ ...part, partId });
    } catch {
      collector.fail('PART_SAMPLING_CONTEXT_INCOMPLETE');
    }
    collector.add(state?.samplingContextKey === expectedSamplingContextKey,
      'STATE_SAMPLING_CONTEXT_MISMATCH');
    collector.add((state?.currentMemoryReady === true || persistedHistoryIncomplete)
      && finite(state?.supplyPotential)
      && state.supplyPotential >= 0
      && state.supplyPotential <= 100,
    'STATE_CURRENT_MEMORY_NOT_READY');
    collector.add((state?.waveMemoryReady === true || persistedHistoryIncomplete)
      && (RAVSCORE_WAVE_MOBILISATION_POLICY.readyStatuses.includes(state?.waveMemoryStatus)
        || persistedHistoryIncomplete)
      && finite(state?.mobilisationPotential)
      && state.mobilisationPotential >= 0
      && state.mobilisationPotential <= 100,
    'STATE_WAVE_MEMORY_NOT_READY');
    const migrationLineage = sameKeys(state?.lineage, [
      'currentEvidenceSource',
      'migratedAt',
      'migrationId',
      'sourceModelId',
      'sourceStateSchemaVersion',
      'waveApproachBootstrapHours',
      'waveApproachMaximumOmittedMomentShare',
      'waveApproachMaximumScoreErrorBeforeRounding',
    ])
      && state.lineage.migrationId === RAVSCORE_MIGRATION_ID
      && state?.lineage?.sourceModelId === CANDIDATE_G_STATE_MODEL_ID
      && state?.lineage?.sourceStateSchemaVersion === CANDIDATE_G_STATE_SCHEMA_VERSION
      && state.lineage.currentEvidenceSource
        === RAVSCORE_RECOVERY_POLICY.candidateMigrationCurrentEvidenceSource
      && state.lineage.waveApproachBootstrapHours
        === RAVSCORE_RECOVERY_POLICY.candidateMigrationWaveApproachReplayHours
      && close(
        state.lineage.waveApproachMaximumOmittedMomentShare,
        RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachMaximumOmittedMomentShare,
      )
      && close(
        state.lineage.waveApproachMaximumScoreErrorBeforeRounding,
        RAVSCORE_RECOVERY_POLICY
          .candidateMigrationWaveApproachMaximumScoreErrorBeforeRounding,
      )
      && validTime(state.lineage.migratedAt)
      && Date.parse(state.lineage.migratedAt) <= Date.parse(state.time);
    const coldReplayLineage = sameKeys(state?.lineage, [
      'boundedUnknownPositionCount',
      'completeCausalPositionCount',
      'expectedCausalPositionCount',
      'historyTransition',
      'recoveryId',
      'source',
      'targetReferenceAt',
    ])
      && state.lineage.recoveryId === RAVSCORE_COLD_REPLAY_ID
      && state.lineage.source === RAVSCORE_RECOVERY_POLICY.source
      && state.lineage.expectedCausalPositionCount
        === RAVSCORE_RECOVERY_POLICY.coldReplayHours
      && safeNonNegativeInteger(state.lineage.completeCausalPositionCount)
      && safeNonNegativeInteger(state.lineage.boundedUnknownPositionCount)
      && state.lineage.completeCausalPositionCount
        + state.lineage.boundedUnknownPositionCount
          === RAVSCORE_RECOVERY_POLICY.coldReplayHours
      && state.lineage.historyTransition
        === (state.lineage.boundedUnknownPositionCount > 0
          ? RAVSCORE_RECOVERY_POLICY.unknownHistoryTransition
          : RAVSCORE_RECOVERY_POLICY.completeHistoryTransition)
      && validTime(state.lineage.targetReferenceAt)
      && Date.parse(state.lineage.targetReferenceAt) <= Date.parse(state.time);
    collector.add(migrationLineage !== coldReplayLineage,
      'STATE_LINEAGE_MISSING_OR_AMBIGUOUS');
    if (migrationLineage) lineageSources.add('CANDIDATE_G_MIGRATION');
    if (coldReplayLineage) lineageSources.add(model?.initialStateSource);
    if (migratedTransition) {
      collector.add(migrationLineage, 'STATE_MIGRATION_LINEAGE_MISSING');
    }
    if (coldReplayTransition) {
      collector.add(coldReplayLineage, 'STATE_COLD_REPLAY_LINEAGE_MISSING');
    }
    collector.add(Array.isArray(state?.currentEvidence)
      && state.currentEvidence.length >= 1
      && state.currentEvidence.length <= 50
      && state.currentEvidence.every((item, index, rows) =>
        sameKeys(item, ['time', 'strength'])
          && validTime(item.time)
          && (item.strength === null
            || (finite(item.strength)
              && item.strength >= -1
              && item.strength <= 1))
          && (index === 0 || Date.parse(item.time) > Date.parse(rows[index - 1].time))),
    'STATE_CURRENT_EVIDENCE_NOT_COMPACT');
    collector.add(state?.currentMemoryStatus === 'READY_NATIVE_HOLD'
      ? exactRegionalHoldAuthorization(state?.currentNativeHoldAuthorization)
      : state?.currentNativeHoldAuthorization === null
        || exactRegionalHoldAuthorization(state?.currentNativeHoldAuthorization),
    'STATE_NATIVE_HOLD_AUTHORIZATION_INVALID');
    collector.add(!containsForbiddenStateMaterial(state), 'STATE_CONTAINS_RAW_OR_COORDINATE_DATA');
    try {
      const replayed = buildIntegratedRavScoreStateSeries([], {
        initialState: state,
        samplingContextKey: expectedSamplingContextKey,
      });
      collector.add(replayed.initialStateAccepted === true
        && sameCanonical(replayed.continuationState, state),
      'STATE_REPLAY_MISMATCH');
      stateReplayCount += 1;
    } catch {
      collector.fail('STATE_REPLAY_FAILED');
    }

    const rollbackState = rollbackRuntimeParts?.[partId]?.ravScoreModel?.currentState;
    const rollbackEvidenceCompatible = Array.isArray(rollbackState?.transportEvidence)
      && rollbackState.transportEvidence.length >= 1
      && rollbackState.transportEvidence.length <= 49;
    collector.add(rollbackEvidenceCompatible, 'ROLLBACK_EVIDENCE_LIMIT_EXCEEDED');
    if (!rollbackEvidenceCompatible) {
      rollbackEvidenceLimitExceededPartCount += 1;
    }
    const rollbackShapeValid = rollbackEvidenceCompatible
      && sameKeys(rollbackState, CANDIDATE_G_CONTINUATION_FIELDS)
      && rollbackState?.transportMemoryReady === true
      && rollbackState?.transportMemoryStatus === 'READY'
      && rollbackState?.transportMemoryWindowHours === 48
      && close(rollbackState?.transportMemoryCoverageHours, 48)
      && rollbackState?.time === full?.productionReferenceAt
      && rollbackState?.transportReferenceAt === full?.productionReferenceAt
      && !containsForbiddenStateMaterial(rollbackState);
    collector.add(rollbackShapeValid, 'ROLLBACK_STATE_CONTRACT_MISMATCH');
    if (!rollbackShapeValid) rollbackStateContractMismatchPartCount += 1;
    let rollbackOracleMatches = false;
    if (rollbackShapeValid) {
      try {
        rollbackOracleMatches = assertCandidateGRollbackContinuation(
          rollbackState,
          { ...part, partId },
          `Public-runtime Candidate G rollback companion ${partId}`,
        );
      } catch {
        rollbackOracleMatches = false;
      }
    }
    collector.add(rollbackOracleMatches, 'ROLLBACK_ORACLE_MISMATCH');
    if (!rollbackOracleMatches) rollbackOracleMismatchPartCount += 1;
    if (rollbackShapeValid && rollbackOracleMatches) rollbackReadyPartCount += 1;

    collector.add(sameKeys(model?.modes, MODES), 'PART_MODE_SET_MISMATCH');
    const weather = part?.current?.weather ?? {};
    for (const mode of MODES) {
      const persisted = model?.modes?.[mode];
      collector.add(!containsForbiddenPublicDestinationMaterial(persisted),
        'PART_MODE_CONTAINS_PRIVATE_MATERIAL');
      collector.add(sameKeys(persisted, INTEGRATED_READY_MODE_FIELDS),
        'PART_MODE_FIELD_SET_MISMATCH');
      try {
        const expected = compactIntegratedRavScoreMode(evaluateRavScoreIntegrated({
          mode,
          weather,
          zone: { onshoreDirectionDeg: part?.onshoreDirectionDeg },
        }, { state: evaluationState }));
        collector.add(sameCanonical(persisted, expected), 'MODE_RECONSTRUCTION_MISMATCH');
        reconstructedModeCount += 1;
      } catch {
        collector.fail('MODE_RECONSTRUCTION_FAILED');
      }
      let publicModeConsistent = false;
      try {
        publicModeConsistent = publicModeFormulaIsConsistent(mode, part?.current?.[mode]);
      } catch {
        publicModeConsistent = false;
      }
      collector.add(publicModeConsistent, 'PUBLIC_PART_MODE_CONTRACT_INVALID');
      collector.add(part?.current?.[mode]?.score === persisted?.score
        && part?.current?.[mode]?.scoreQuality === persisted?.scoreQuality
        && part?.current?.[mode]?.calibrationEligible === persisted?.calibrationEligible
        && part?.current?.[mode]?.scoreSemantics === persisted?.scoreSemantics
        && part?.current?.[mode]?.conservativeTailResetApplied
          === persisted?.conservativeTailResetApplied
        && sameCanonical(part?.current?.[mode]?.scoreBounds,persisted?.scoreBounds)
        && part?.current?.[mode]?.historyCoverageHours === persisted?.historyCoverageHours
        && sameCanonical(
          part?.current?.[mode]?.historyReasonCodes,
          persisted?.historyReasonCodes,
        ),
        'PUBLIC_PART_MODE_SCORE_MISMATCH');
    }

    const zoneCurrent = currentRowsByZone.get(part?.zoneId);
    for (const mode of MODES) {
      if (zoneCurrent?.[mode]?.winningPartId !== partId) continue;
      collector.add(zoneCurrent[mode].score === part?.current?.[mode]?.score,
        'ZONE_WINNER_SCORE_MISMATCH');
    }
  }
  collector.add(stateKeys.size === expectedPartCount, 'STATE_SAMPLING_CONTEXT_COVERAGE_MISMATCH');
  collector.add(initialStateSources.size === 1, 'MIXED_STATE_TRANSITION_COHORT');
  collector.add(lineageSources.size === 1, 'MIXED_STATE_LINEAGE_COHORT');

  for (const [zoneId, current] of currentRowsByZone) {
    const zoneParts = parts.filter(([, part]) => part?.zoneId === zoneId);
    for (const mode of MODES) {
      const available = zoneParts.map(([partId, part]) => ({
        partId,
        name: part?.name,
        detail: part?.current?.[mode],
      })).filter(row => row.detail?.available === true
        && finite(row.detail.score)
        && exactPublicScoreQuality(row.detail));
      available.sort((left, right) => right.detail.score - left.detail.score
        || scoreQualityRank(left.detail.scoreQuality)
          - scoreQualityRank(right.detail.scoreQuality)
        || left.partId.localeCompare(right.partId));
      const expectedWinner = available[0] ?? null;
      const scores = available.map(row => row.detail.score);
      const maximum = scores.length ? Math.max(...scores) : null;
      const minimum = scores.length ? Math.min(...scores) : null;
      const winnerId = current?.[mode]?.winningPartId;
      const winner = coastal?.parts?.[winnerId];
      collector.add(available.length === zoneParts.length
        && Boolean(winner)
        && winnerId === expectedWinner?.partId
        && winner?.zoneId === zoneId
        && current?.[mode]?.score === expectedWinner?.detail?.scoreBounds?.lower
        && winner?.current?.[mode]?.score === expectedWinner?.detail?.score
        && current?.[mode]?.winningPartName === winner?.name
        && safeNonNegativeInteger(current?.[mode]?.comparisonPartCount)
        && current[mode].comparisonPartCount === zoneParts.length,
      'ZONE_CURRENT_WINNER_RECONSTRUCTION_MISMATCH');
      const nearCount = scores.filter(score => maximum - score <= 7).length;
      const expectedStatus = maximum - minimum <= 7 ? 'whole-zone'
        : nearCount === 1 ? 'only-part' : 'several-parts';
      collector.add(current?.[mode]?.scoreSpread === maximum - minimum
        && current?.[mode]?.status === expectedStatus,
      'ZONE_CURRENT_COVERAGE_CLASSIFICATION_MISMATCH');
      if (!available.length) {
        collector.fail('ZONE_CURRENT_QUALITY_RECONSTRUCTION_MISMATCH');
        continue;
      }
      const lower = Math.max(...available.map(row => row.detail.scoreBounds.lower));
      const upper = Math.max(...available.map(row => row.detail.scoreBounds.upper));
      const rawLower = Math.max(...available.map(row => row.detail.scoreBounds.rawLower));
      const rawUpper = Math.max(...available.map(row => row.detail.scoreBounds.rawUpper));
      const historyIncomplete = available.some(row =>
        row.detail.scoreQuality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE);
      const conservativeTailResetApplied = available.some(row =>
        row.detail.conservativeTailResetApplied === true);
      const expectedBounds = {
        lower,
        upper,
        modelUncertaintyPoints: upper - lower,
        rawLower,
        rawUpper,
      };
      const expectedReasonCodes = [...new Set(available.flatMap(row =>
        row.detail.scoreQuality === RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
          ? row.detail.historyReasonCodes : []))].sort();
      const expectedPossibleWinningParts = available
        .filter(row => row.detail.scoreBounds.upper >= lower)
        .sort((left, right) => left.partId.localeCompare(right.partId))
        .map(row => ({
          partId: row.partId,
          name: row.name,
          score: row.detail.score,
          scoreBounds: { ...row.detail.scoreBounds },
        }));
      const expectedWinningPartUncertain = historyIncomplete
        && expectedPossibleWinningParts.some(part =>
          part.partId !== expectedWinner.partId);
      collector.add(current?.[mode]?.score === lower
        && sameCanonical(current?.[mode]?.scoreBounds, expectedBounds)
        && current?.[mode]?.scoreQuality === (historyIncomplete
          ? RAVSCORE_SCORE_QUALITY.HISTORY_INCOMPLETE
          : RAVSCORE_SCORE_QUALITY.FULL_HISTORY)
        && current?.[mode]?.calibrationEligible === !historyIncomplete
        && current?.[mode]?.scoreSemantics === (historyIncomplete
          ? 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
          : conservativeTailResetApplied
            ? 'CONSERVATIVE_TAIL_RESET_POINT_SCORE'
            : 'EXACT_POINT_SCORE')
        && current?.[mode]?.conservativeTailResetApplied
          === conservativeTailResetApplied
        && current?.[mode]?.historyCoverageHours === Math.min(...available
          .map(row => row.detail.historyCoverageHours))
        && sameCanonical(current?.[mode]?.historyReasonCodes, expectedReasonCodes)
        && current?.[mode]?.winningPartUncertain === expectedWinningPartUncertain
        && current?.[mode]?.possibleWinningPartCount
          === expectedPossibleWinningParts.length
        && sameCanonical(
          current?.[mode]?.possibleWinningParts,
          expectedPossibleWinningParts,
        ), 'ZONE_CURRENT_QUALITY_RECONSTRUCTION_MISMATCH');
    }
  }

  const payload = addPublicPackageChecks({
    full,
    startup,
    startupText,
    details,
    detailsText,
    coastalPartsText,
    zoneRegistryText,
    manifest,
    collector,
    expectedZoneCount,
    expectedPartCount,
  });
  const result = collector.result();
  const publicPrivacyContractPassed = !result.errors.includes('PUBLIC_PRIVACY_CONTRACT_FAILED');
  return {
    schemaVersion: 1,
    status: result.errors.length ? 'failed' : 'passed',
    model: {
      modelId: RAVSCORE_MODEL_ID,
      stateSchemaVersion: RAVSCORE_STATE_SCHEMA_VERSION,
      modelContractSha256: RAVSCORE_MODEL_CONTRACT_SHA256,
      modelBundleSha256: RAVSCORE_MODEL_BUNDLE_SHA256,
    },
    coverage: {
      expectedZoneCount,
      zoneCount: zones.length,
      expectedPartCount,
      partCount: parts.length,
      publicForecastHours: RAVSCORE_PUBLIC_FORECAST_HOURS,
      expectedZoneModeCount: expectedZoneCount * RAVSCORE_PUBLIC_FORECAST_HOURS * MODES.length,
      stateReplayCount,
      reconstructedModeCount,
      zoneModeCount,
      unavailableZoneModeCount,
    },
    continuation: {
      migratedStateCount,
      continuedStateCount,
      coldReplayStateCount,
      uniqueSamplingContextCount: stateKeys.size,
    },
    rollback: {
      companionPresent: rollbackDescriptor !== null
        && rollbackDescriptor !== undefined,
      descriptorValid: rollbackDescriptorShapeValid && rollbackBindingsValid,
      generationReferenceBound: rollbackRuntime?.generatedAt
        === full?.productionReferenceAt,
      runtimePartCount: rollbackPartIds.length,
      readyPartCount: rollbackReadyPartCount,
      evidenceLimitExceededPartCount: rollbackEvidenceLimitExceededPartCount,
      reconstructionFailurePartCount: rollbackReconstructionFailurePartCount,
      stateContractMismatchPartCount: rollbackStateContractMismatchPartCount,
      oracleMismatchPartCount: rollbackOracleMismatchPartCount,
      reconstructedFromIntegratedState: false,
    },
    payload: {
      startupBytes: payload.startupBytes,
      detailsBytes: payload.detailsBytes,
      privacyContractPassed: publicPrivacyContractPassed,
      publicStateOrEvidenceIncluded: publicPrivacyContractPassed ? false : null,
      publicRawVectorIncluded: publicPrivacyContractPassed ? false : null,
      publicUnapprovedCoordinateIncluded: publicPrivacyContractPassed ? false : null,
      publicShadowIncluded: result.errors.includes('PUBLIC_SHADOW_FIELD_PRESENT'),
    },
    errors: result.errors,
    errorCounts: result.errorCounts,
  };
}

function argumentValue(arguments_, name, fallback) {
  const index = arguments_.indexOf(name);
  if (index < 0) return fallback;
  const value = arguments_[index + 1];
  if (!value || value.startsWith('--')) throw new Error('INVALID_ARGUMENT');
  return value;
}

async function main() {
  const arguments_ = process.argv.slice(2);
  const inputPath = argumentValue(arguments_, '--input', DEFAULT_INPUT);
  const startupPath = argumentValue(arguments_, '--startup', DEFAULT_STARTUP);
  const detailsPath = argumentValue(arguments_, '--details', DEFAULT_DETAILS);
  const manifestPath = argumentValue(arguments_, '--manifest', DEFAULT_MANIFEST);
  const coastalPartsPath = argumentValue(arguments_, '--coastal-parts', DEFAULT_COASTAL_PARTS);
  const zoneRegistryPath = argumentValue(arguments_, '--zones', DEFAULT_ZONE_REGISTRY);
  const outputPath = argumentValue(arguments_, '--output', DEFAULT_OUTPUT);
  const [fullText, startupText, detailsText, manifestText, coastalPartsText, zoneRegistryText] = await Promise.all([
    fs.readFile(inputPath, 'utf8'),
    fs.readFile(startupPath, 'utf8'),
    fs.readFile(detailsPath, 'utf8'),
    fs.readFile(manifestPath, 'utf8'),
    fs.readFile(coastalPartsPath, 'utf8'),
    fs.readFile(zoneRegistryPath, 'utf8'),
  ]);
  const report = auditIntegratedRavScorePublicRuntime(JSON.parse(fullText), {
    startup: JSON.parse(startupText),
    startupText,
    details: JSON.parse(detailsText),
    detailsText,
    coastalPartsText,
    zoneRegistryText,
    manifest: JSON.parse(manifestText),
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log([
    `Integreret RavScore public runtime: ${report.status}`,
    `${report.coverage.zoneCount}/${report.coverage.expectedZoneCount} zoner`,
    `${report.coverage.partCount}/${report.coverage.expectedPartCount} kystdele`,
    `${report.coverage.reconstructedModeCount} rekonstruerede aktuelle modes`,
  ].join('; '));
  if (report.status !== 'passed') {
    console.error(`Integreret RavScore public runtime fejlkoder: ${report.errors.join(', ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch {
    console.error('Integreret RavScore public runtime kunne ikke auditeres uden at bryde fail-closed-kontrakten.');
    process.exitCode = 1;
  }
}
