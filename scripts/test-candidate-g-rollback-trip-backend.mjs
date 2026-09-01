import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ravScoreModelBinding as integratedModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  expectedCalibrationEligibility,
  projectTripLogDto,
  submittedCalibrationEligibilityMatches,
  tripEvidenceIntegrityIssues,
} from '../js/services/calibration-eligibility.js';
import {
  externalTripPayload,
  externalTripRecord,
} from '../supabase/functions/_shared/trip-storage.js';
import {
  activeRavScoreTripAdmissionBody,
  storeObservation,
} from '../supabase/functions/_shared/trip-store.ts';
import { ravScoreModelBinding as candidateModelBinding } from './rollback-assets/ravscore-model-contract.js';
import {
  projectReadyCandidateGRollbackScoreQuality,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';

const repositoryRoot = process.cwd();
const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-candidate-trip-'));
const stagedRoot = path.join(temporaryRoot, 'candidate-pages');
const candidateBinding = candidateModelBinding();
const datasetId = 'rr-20260829120000-candidate-trip';
const startedAt = '2026-08-29T12:00:00.000Z';
const verifiedEvidenceTrust = Object.freeze({
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  incidentId: null,
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null,
});
const candidateScoreAvailability = Object.freeze({
  schemaVersion: 2,
  policy: 'candidate-g-local-fail-closed',
  allZonesActive: true,
  activeZoneCount: 210,
  unavailableZoneCount: 0,
  totalZoneCount: 210,
  allCurrentScoresFullHistory: true,
  fullHistoryModeCount: 420,
  historyIncompleteModeCount: 0,
  historyIncompleteZoneCount: 0,
  evaluatedAt: '2026-08-29T11:05:00.000Z',
  unavailableZones: [],
  historyIncompleteZones: [],
});

try {
  await fs.mkdir(stagedRoot, { recursive: true });
  await Promise.all([
    fs.cp(path.join(repositoryRoot, 'js'), path.join(stagedRoot, 'js'), { recursive: true }),
    fs.copyFile(path.join(repositoryRoot, 'package.json'), path.join(stagedRoot, 'package.json')),
  ]);
  await Promise.all([
    fs.copyFile(path.join(repositoryRoot, 'scripts', 'rollback-assets',
      'ravscore-model-contract.js'), path.join(stagedRoot, 'js', 'core',
      'ravscore-model-contract.js')),
    fs.copyFile(path.join(repositoryRoot, 'scripts', 'rollback-assets',
      'ravscore-model-bundle.generated.js'), path.join(stagedRoot, 'js', 'core',
      'ravscore-model-bundle.generated.js')),
  ]);

  const stagedUrl = relative => `${pathToFileURL(path.join(stagedRoot, relative)).href}?candidate-trip-test=1`;
  const [
    { ravScoreModelBinding: stagedModelBinding },
    tripContract,
    publicAdapter,
    stagedCalibration,
    stagedPublicRuntime,
  ] =
    await Promise.all([
      import(stagedUrl('js/core/ravscore-model-contract.js')),
      import(stagedUrl('js/services/trip-evidence-contract.js')),
      import(stagedUrl('js/services/trip-evidence-public-adapter.js')),
      import(stagedUrl('js/services/calibration-eligibility.js')),
      import(stagedUrl('js/core/ravscore-public-runtime-contract.js')),
    ]);
  assert.deepEqual(stagedModelBinding(), candidateBinding,
    'Candidate Pages overlay must replace the canonical client contract');

  const candidateManifest = {
    datasetId,
    complete: true,
    generatedAt: '2026-08-29T11:05:00.000Z',
    productionReferenceAt: '2026-08-29T11:00:00.000Z',
    validUntil: stagedPublicRuntime.ravScorePublicHorizonValidUntil(
      '2026-08-29T11:00:00.000Z',
    ),
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: candidateBinding,
    ravScoreEvidenceTrust: verifiedEvidenceTrust,
    ravScoreAvailability: candidateScoreAvailability,
    publicConditionsSha256: 'a'.repeat(64),
    publicConditionsBytes: 1,
    publicConditionDetailsSha256: 'b'.repeat(64),
    publicConditionDetailsBytes: 1,
    ravScoreRuntime: {
      schemaVersion: '1.0.0',
      modelBinding: candidateBinding,
      startup: {
        kind: 'RAVSCORE_PUBLIC_STARTUP',
        payloadBodySha256: 'c'.repeat(64),
        fileSha256: 'a'.repeat(64),
        bytes: 1,
      },
      details: {
        kind: 'RAVSCORE_PUBLIC_DETAILS',
        payloadBodySha256: 'd'.repeat(64),
        fileSha256: 'b'.repeat(64),
        bytes: 1,
      },
    },
  };
  const candidateReadyState = {
    transportMemoryReady: true,
    transportMemoryStatus: 'READY',
    transportMemoryWindowHours: 48,
    transportMemoryCoverageHours: 48,
  };
  const candidateReadyMode = projectReadyCandidateGRollbackScoreQuality({
    available: true,
    score: 64,
    scoreProfileId: candidateBinding.modelId,
    components: { huntability: 71, transport: 66, release: 55 },
    modelBinding: candidateBinding,
    explanation: {
      transportDiagnostics: { ...candidateReadyState },
    },
  }, candidateReadyState);
  assert.deepEqual(candidateReadyMode.scoreBounds, {
    lower: 64,
    upper: 64,
    modelUncertaintyPoints: 0,
    rawLower: 64,
    rawUpper: 64,
  });
  assert.equal(candidateReadyMode.scoreQuality, 'FULL_HISTORY');
  assert.equal(candidateReadyMode.calibrationEligible, false);
  assert.throws(() => projectReadyCandidateGRollbackScoreQuality(
    candidateReadyMode,
    { ...candidateReadyState, transportMemoryStatus: 'WINDOW_INCOMPLETE' },
  ), /exact READY 48-hour state/);
  assert.throws(() => projectReadyCandidateGRollbackScoreQuality({
    ...candidateReadyMode,
    modelBinding: { ...candidateBinding, modelBundleSha256: 'f'.repeat(64) },
  }, candidateReadyState), /incompatible modelBundleSha256/);
  const publicState = {
    manifest: candidateManifest,
    conditions: {
      available: true,
      datasetId,
      productionReferenceAt: '2026-08-29T11:00:00.000Z',
      generatedAt: '2026-08-29T11:05:00.000Z',
      ravScoreRuntime: { modelBinding: candidateBinding },
      ravScoreEvidenceTrust: verifiedEvidenceTrust,
      coastalParts: {
        modelBinding: candidateBinding,
        evidenceTrust: verifiedEvidenceTrust,
        scoreAvailability: candidateScoreAvailability,
      },
      publicRuntimeAvailability: stagedPublicRuntime.selectPublicRuntimeAvailability(
        candidateManifest,
        { now: Date.parse(startedAt), modelBinding: candidateBinding },
      ),
      zones: {
        'zone-rollback': {
          current: {
            windSpeedMps: 7.2,
            windDirectionDeg: 260,
            waveHeightM: 1.1,
            wavePeriodS: 6.2,
            waveDirectionDeg: 270,
            currentSpeedMps: 0.2,
            currentDirectionDeg: 255,
            waterLevelCm: -12,
            waterLevelTrendCm3h: -7,
          },
          history: { maxWave24hM: 1.8, hoursSinceHighEnergy: 6 },
        },
      },
    },
    coastalPart: {
      zoneId: 'zone-rollback',
      ravScoreEvidenceTrust: verifiedEvidenceTrust,
      current: {
        time: '2026-08-29T12:00:00.000Z',
        waders: candidateReadyMode,
      },
    },
  };
  const start = publicAdapter.createTripStartFromPublicState({
    tripId: '11111111-1111-4111-8111-111111111111',
    startedAt,
    mode: 'waders',
    zoneId: 'zone-rollback',
    coastalPartId: 'part-rollback',
    ...publicState,
    appVersion: '4.0.309',
    modelVersion: candidateBinding.modelId,
    modelBinding: candidateBinding,
  });
  const evidence = tripContract.completeTripEvidence(start, {
    endedAt: '2026-08-29T12:50:00.000Z',
    zoneId: 'zone-rollback',
    coastalPartId: 'part-rollback',
    searchCoverage: 'normal',
    found: false,
  });
  assert.equal(evidence.calibrationEligible, false,
    'Candidate G trips must be ineligible at their canonical client source');
  assert.equal(evidence.calibrationFeatures.modelContractSha256,
    candidateBinding.modelContractSha256);
  assert.equal(evidence.calibrationFeatures.modelBundleSha256,
    candidateBinding.modelBundleSha256);

  const columns = tripContract.toObservationTripColumns(evidence);
  const payload = {
    ...columns,
    zone_name: 'Rollback test zone',
    submitted_at: '2026-08-29T12:51:00.000Z',
    anonymous_id: '22222222-2222-4222-8222-222222222222',
    user_id: null,
    client_observation_id: '33333333-3333-4333-8333-333333333333',
    gps: null,
  };
  assert.deepEqual(tripEvidenceIntegrityIssues(payload), []);
  assert.equal(expectedCalibrationEligibility(payload, integratedModelBinding()), false,
    'Integrated backend binding must never classify Candidate G evidence as eligible');
  assert.equal(submittedCalibrationEligibilityMatches(payload, integratedModelBinding(), {
    ineligibleBindings: [candidateBinding],
  }), true,
    'The actual submit validator contract must accept exact Candidate G false eligibility');
  assert.equal(submittedCalibrationEligibilityMatches({
    ...payload,
    calibration_eligible: true,
  }, integratedModelBinding(), { ineligibleBindings: [candidateBinding] }), false,
  'The actual submit validator contract must reject Candidate G true eligibility');

  const forgedBinding = Object.freeze({
    ...candidateBinding,
    modelId: 'RRS-FORGED-STRUCTURALLY-VALID-1',
    modelContractSha256: 'e'.repeat(64),
    modelBundleSha256: 'f'.repeat(64),
  });
  const forgedFeatures = {
    ...payload.calibration_features,
    modelVersion: forgedBinding.modelId,
    modelContractSha256: forgedBinding.modelContractSha256,
    modelBundleSha256: forgedBinding.modelBundleSha256,
    scoreCalibrationEligible: true,
  };
  const forgedPayload = {
    ...payload,
    model_version: forgedBinding.modelId,
    calibration_features: forgedFeatures,
    weather_snapshot: {
      ...payload.weather_snapshot,
      calibrationFeatures: forgedFeatures,
    },
    calibration_eligible: false,
  };
  assert.deepEqual(tripEvidenceIntegrityIssues(forgedPayload), [],
    'The forged negative fixture must be structurally valid to exercise the allowlist');
  assert.equal(submittedCalibrationEligibilityMatches(forgedPayload, integratedModelBinding(), {
    ineligibleBindings: [candidateBinding],
  }), false, 'A structurally valid unknown model binding must fail closed');
  assert.equal(submittedCalibrationEligibilityMatches(payload, integratedModelBinding(), {
    ineligibleBindings: [{ ...candidateBinding, unexpected: 'field' }],
  }), false, 'An ineligible-binding allowlist entry with extra fields must fail closed');

  const candidateServerDto = projectTripLogDto(payload, integratedModelBinding());
  assert.equal(candidateServerDto.calibration_binding_status, 'historical-model-bound',
    'The integrated backend must not present Candidate G as its current calibration cohort');
  assert.deepEqual(candidateServerDto.model_binding, candidateBinding,
    'The private trip-log DTO must carry the exact privacy-safe binding, not raw features');
  assert.equal(stagedCalibration.accountTripBindingStatus(
    candidateServerDto,
    candidateBinding,
    { allowCalibration: false },
  ), 'current-ineligible',
  'Candidate Pages must reclassify its exact Candidate trip as current but ineligible');
  assert.equal(stagedCalibration.accountTripBindingStatus({
    ...candidateServerDto,
    model_binding: integratedModelBinding(),
    calibration_binding_status: 'current-eligible',
    calibration_eligible: true,
  }, candidateBinding, { allowCalibration: false }), 'historical-model-bound',
  'Candidate Pages must reclassify integrated trips as historical even if the server called them current');
  assert.equal(stagedCalibration.accountTripBindingStatus({
    ...candidateServerDto,
    model_binding: { modelId: 'partial-binding' },
    calibration_binding_status: 'current-eligible',
  }, candidateBinding, { allowCalibration: false }), 'unbound',
  'A partial server binding must fail closed as unbound');
  assert.equal(stagedCalibration.accountTripBindingStatus({
    ...candidateServerDto,
    model_binding: forgedBinding,
    calibration_binding_status: 'current-eligible',
  }, candidateBinding, { allowCalibration: false }), 'historical-model-bound',
  'An exact but unknown binding must remain historical and must not trust server status');

  const external = externalTripPayload(payload);
  assert.equal(external.schema_version, 3);
  assert.equal(external.calibration_eligible, false);
  assert.equal(external.model_version, candidateBinding.modelId);
  assert.equal(external.calibration_features.modelContractSha256,
    candidateBinding.modelContractSha256);
  assert.equal(external.calibration_features.modelBundleSha256,
    candidateBinding.modelBundleSha256);
  assert.equal('anonymous_id' in external, false);
  assert.equal('user_id' in external, false);
  assert.equal('gps' in external, false);
  const missingFeaturePayload = structuredClone(payload);
  delete missingFeaturePayload.calibration_features.modelBundleSha256;
  assert.throws(() => externalTripPayload(missingFeaturePayload), /TRIP_CALIBRATION_FEATURES_INVALID/,
    'Schema-3 Edge projection must reject a missing calibration key');
  const extraFeaturePayload = structuredClone(payload);
  extraFeaturePayload.calibration_features.unexpected = true;
  assert.throws(() => externalTripPayload(extraFeaturePayload), /TRIP_CALIBRATION_FEATURES_INVALID/,
    'Schema-3 Edge projection must reject an extra calibration key');
  const nestedMissingFeaturePayload = structuredClone(payload);
  delete nestedMissingFeaturePayload.weather_snapshot.calibrationFeatures.modelContractSha256;
  assert.throws(() => externalTripPayload(nestedMissingFeaturePayload), /TRIP_CALIBRATION_FEATURES_INVALID/,
    'Schema-3 nested snapshot must reject a missing binding key');
  const integratedBinding = integratedModelBinding();
  const integratedFeatures = {
    ...payload.calibration_features,
    modelVersion: integratedBinding.modelId,
    modelStateVersion: integratedBinding.stateSchemaVersion,
    modelVariantId: integratedBinding.variantId,
    modelProfileId: integratedBinding.profileId,
    modelComponentSchemaId: integratedBinding.componentSchemaId,
    modelExplanationSchemaId: integratedBinding.explanationSchemaId,
    modelRankingPolicyId: integratedBinding.rankingPolicyId,
    modelBestTimePolicyId: integratedBinding.bestTimePolicyId,
    modelPresentationPolicyId: integratedBinding.presentationPolicyId,
    modelContractSha256: integratedBinding.modelContractSha256,
    modelBundleSha256: integratedBinding.modelBundleSha256,
    scoreCalibrationEligible: true,
  };
  const integratedEligiblePayload = {
    ...payload,
    model_version: integratedBinding.modelId,
    calibration_eligible: true,
    calibration_features: integratedFeatures,
    weather_snapshot: {
      ...payload.weather_snapshot,
      calibrationFeatures: integratedFeatures,
    },
  };
  for (const historicalMigration of [false, true]) {
    const d1FailSafe = externalTripPayload(integratedEligiblePayload, { historicalMigration });
    assert.equal(d1FailSafe.calibration_eligible, false,
      'D1 must preserve schema-3 evidence but never persist it as calibration eligible');
    assert.equal(d1FailSafe.model_version, integratedBinding.modelId);
    assert.equal(d1FailSafe.calibration_features.modelContractSha256,
      integratedBinding.modelContractSha256);
    assert.equal(d1FailSafe.calibration_features.modelBundleSha256,
      integratedBinding.modelBundleSha256);
  }
  const d1Record = await externalTripRecord({
    owner: { kind: 'anonymous', subject: `anon_v1_${'a'.repeat(43)}` },
    payload,
  });
  const d1Payload = JSON.parse(d1Record.payload_json);
  assert.equal(d1Payload.calibration_eligible, false);
  assert.equal(d1Payload.calibration_features.modelContractSha256,
    candidateBinding.modelContractSha256);
  assert.equal(d1Payload.calibration_features.modelBundleSha256,
    candidateBinding.modelBundleSha256);
  assert.doesNotMatch(d1Record.payload_json,
    /(?:anonymous_id|user_id|gps|latitude|longitude|currentUMps|currentVMps)/i);

  const admissionBody = activeRavScoreTripAdmissionBody(payload);
  assert.deepEqual(admissionBody, {
    p_model_id: candidateBinding.modelId,
    p_state_schema_version: candidateBinding.stateSchemaVersion,
    p_variant_id: candidateBinding.variantId,
    p_profile_id: candidateBinding.profileId,
    p_component_schema_id: candidateBinding.componentSchemaId,
    p_explanation_schema_id: candidateBinding.explanationSchemaId,
    p_ranking_policy_id: candidateBinding.rankingPolicyId,
    p_best_time_policy_id: candidateBinding.bestTimePolicyId,
    p_presentation_policy_id: candidateBinding.presentationPolicyId,
    p_model_contract_sha256: candidateBinding.modelContractSha256,
    p_model_bundle_sha256: candidateBinding.modelBundleSha256,
    p_reason_codes: [],
    p_calibration_eligible: false,
    p_actual_zone_id: payload.actual_zone_id,
    p_actual_coastal_part_id: payload.actual_coastal_part_id,
    p_forecast_zone_id: payload.forecast_zone_id,
    p_forecast_coastal_part_id: payload.forecast_coastal_part_id,
  }, 'Edge admission must send only exact model identity and public zone/part ids');
  assert.doesNotMatch(JSON.stringify(admissionBody),
    /(?:anonymous_id|user_id|gps|latitude|longitude|currentUMps|currentVMps|weather_snapshot)/i);

  const originalDeno = globalThis.Deno;
  const originalFetch = globalThis.fetch;
  const admissionRequests = [];
  const tripStoreEnvironment = {
    TRIP_STORAGE_MODE: 'supabase',
    SUPABASE_URL: 'https://trip-admission-test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-key',
  };
  globalThis.Deno = { env: { get: name => tripStoreEnvironment[name] ?? null } };
  try {
    globalThis.fetch = async (input, init = {}) => {
      admissionRequests.push({ url: String(input), init });
      return new Response('false', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    await assert.rejects(
      storeObservation(payload, null),
      error => error?.status === 409 && error?.code === 'RAVSCORE_MODEL_NOT_ACTIVE',
      'A non-active exact binding must remain retryable and must not reach storage',
    );
    assert.equal(admissionRequests.length, 1);
    assert.match(admissionRequests[0].url, /\/rpc\/ravradar_trip_v3_active_binding_admitted$/);
    assert.doesNotMatch(String(admissionRequests[0].init.body),
      /(?:anonymous_id|user_id|gps|latitude|longitude|currentUMps|currentVMps|weather_snapshot)/i);

    admissionRequests.length = 0;
    globalThis.fetch = async (input, init = {}) => {
      admissionRequests.push({ url: String(input), init });
      if (String(input).includes('/rpc/')) {
        return new Response('true', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('RAVSCORE_MODEL_NOT_ACTIVE', { status: 409 });
    };
    await assert.rejects(
      storeObservation(payload, null),
      error => error?.status === 409 && error?.code === 'RAVSCORE_MODEL_NOT_ACTIVE',
      'The database trigger race sentinel must map to the same bounded retryable 409',
    );
    assert.equal(admissionRequests.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalDeno === undefined) delete globalThis.Deno;
    else globalThis.Deno = originalDeno;
  }

  const emergencyReason = 'public-emergency-last-complete';
  const emergencyFeatures = {
    ...integratedFeatures,
    reasonCodes: [emergencyReason],
  };
  const integratedEmergencyPayload = {
    ...integratedEligiblePayload,
    calibration_eligible: false,
    data_quality_flags: [emergencyReason],
    calibration_features: emergencyFeatures,
    weather_snapshot: {
      ...integratedEligiblePayload.weather_snapshot,
      calibrationFeatures: emergencyFeatures,
    },
  };
  assert.deepEqual(tripEvidenceIntegrityIssues(integratedEmergencyPayload), []);
  assert.equal(submittedCalibrationEligibilityMatches(
    integratedEmergencyPayload,
    integratedBinding,
    { ineligibleBindings: [candidateBinding] },
  ), true, 'Exact integrated emergency evidence must remain storable but ineligible');
  assert.equal(submittedCalibrationEligibilityMatches({
    ...integratedEmergencyPayload,
    calibration_eligible: true,
  }, integratedBinding, { ineligibleBindings: [candidateBinding] }), false,
  'Integrated emergency evidence must never be calibration eligible');
  const emergencyAdmissionBody = activeRavScoreTripAdmissionBody(integratedEmergencyPayload);
  assert.deepEqual(emergencyAdmissionBody.p_reason_codes,
    [emergencyReason],
    'Edge admission must pass the exact bounded reason array to the SQL gate');

  const historyIncompleteReason = 'ravscore-history-incomplete';
  const historyIncompleteFeatures = {
    ...integratedFeatures,
    scoreBoundUpper: 78,
    scoreBoundModelUncertaintyPoints: 14,
    scoreBoundRawUpper: 78,
    scoreQuality: 'HISTORY_INCOMPLETE',
    scoreSemantics: 'CONSERVATIVE_ENCLOSING_LOWER_BOUND',
    scoreCalibrationEligible: false,
    conservativeTailResetApplied: false,
    historyCoverageHours: 19,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
    reasonCodes: [historyIncompleteReason],
  };
  const integratedHistoryIncompletePayload = {
    ...integratedEligiblePayload,
    calibration_eligible: false,
    data_quality_flags: [historyIncompleteReason],
    calibration_features: historyIncompleteFeatures,
    weather_snapshot: {
      ...integratedEligiblePayload.weather_snapshot,
      calibrationFeatures: historyIncompleteFeatures,
    },
  };
  assert.deepEqual(tripEvidenceIntegrityIssues(integratedHistoryIncompletePayload), []);
  assert.deepEqual(
    externalTripPayload(integratedHistoryIncompletePayload).data_quality_flags,
    [historyIncompleteReason],
  );
  assert.equal(submittedCalibrationEligibilityMatches(
    integratedHistoryIncompletePayload,
    integratedBinding,
    { ineligibleBindings: [candidateBinding] },
  ), true, 'Exact integrated HISTORY_INCOMPLETE evidence must remain storable but ineligible');
  assert.equal(submittedCalibrationEligibilityMatches({
    ...integratedHistoryIncompletePayload,
    calibration_eligible: true,
  }, integratedBinding, { ineligibleBindings: [candidateBinding] }), false,
  'Integrated HISTORY_INCOMPLETE evidence must never be calibration eligible');
  assert.deepEqual(
    activeRavScoreTripAdmissionBody(integratedHistoryIncompletePayload).p_reason_codes,
    [historyIncompleteReason],
    'Edge admission must pass the exact HISTORY_INCOMPLETE reason to SQL',
  );

  const globalWarmupReason = 'ravscore-global-warmup-calibration-lock';
  const globalWarmupFeatures = {
    ...integratedFeatures,
    reasonCodes: [globalWarmupReason],
  };
  const integratedGlobalWarmupPayload = {
    ...integratedEligiblePayload,
    calibration_eligible: false,
    data_quality_flags: [],
    calibration_features: globalWarmupFeatures,
    weather_snapshot: {
      ...integratedEligiblePayload.weather_snapshot,
      calibrationFeatures: globalWarmupFeatures,
    },
  };
  assert.deepEqual(tripEvidenceIntegrityIssues(integratedGlobalWarmupPayload), []);
  assert.equal(externalTripPayload(integratedGlobalWarmupPayload).calibration_eligible, false);
  assert.equal(submittedCalibrationEligibilityMatches(
    integratedGlobalWarmupPayload,
    integratedBinding,
    { ineligibleBindings: [candidateBinding] },
  ), true, 'Integrated FULL_HISTORY captured under the global lock remains storable as false');
  assert.deepEqual(
    activeRavScoreTripAdmissionBody(integratedGlobalWarmupPayload).p_reason_codes,
    [globalWarmupReason],
    'Edge admission must pass the immutable global warmup reason to SQL',
  );
  assert.throws(() => externalTripPayload({
    ...integratedGlobalWarmupPayload,
    calibration_eligible: true,
  }), /TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID/);
  assert.throws(() => externalTripPayload({
    ...integratedEligiblePayload,
    calibration_eligible: false,
  }), /TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID/,
  'Integrated FULL_HISTORY false without the immutable lock reason must fail closed');
  const movedLocationPayload = {
    ...integratedEligiblePayload,
    actual_coastal_part_id: 'part-other-than-forecast',
    calibration_eligible: false,
  };
  assert.equal(externalTripPayload(movedLocationPayload).calibration_eligible, false,
    'FULL_HISTORY without a warmup reason must retain SQL location-parity false');
  const duplicateWarmupFeatures = {
    ...globalWarmupFeatures,
    reasonCodes: [globalWarmupReason, globalWarmupReason],
  };
  assert.throws(() => externalTripPayload({
    ...integratedGlobalWarmupPayload,
    calibration_features: duplicateWarmupFeatures,
    weather_snapshot: {
      ...integratedGlobalWarmupPayload.weather_snapshot,
      calibrationFeatures: duplicateWarmupFeatures,
    },
  }), /TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID/);
  const historyWarmupFeatures = {
    ...historyIncompleteFeatures,
    reasonCodes: [historyIncompleteReason, globalWarmupReason],
  };
  assert.throws(() => externalTripPayload({
    ...integratedHistoryIncompletePayload,
    calibration_features: historyWarmupFeatures,
    weather_snapshot: {
      ...integratedHistoryIncompletePayload.weather_snapshot,
      calibrationFeatures: historyWarmupFeatures,
    },
  }), /TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID/);
  const candidateWarmupFeatures = {
    ...payload.calibration_features,
    reasonCodes: [globalWarmupReason],
  };
  assert.throws(() => externalTripPayload({
    ...payload,
    calibration_features: candidateWarmupFeatures,
    weather_snapshot: {
      ...payload.weather_snapshot,
      calibrationFeatures: candidateWarmupFeatures,
    },
  }), /TRIP_GLOBAL_WARMUP_LOCK_BINDING_INVALID/);

  const forgedEmergencyPayload = {
    ...forgedPayload,
    calibration_features: {
      ...forgedPayload.calibration_features,
      reasonCodes: [emergencyReason],
    },
    weather_snapshot: {
      ...forgedPayload.weather_snapshot,
      calibrationFeatures: {
        ...forgedPayload.weather_snapshot.calibrationFeatures,
        reasonCodes: [emergencyReason],
      },
    },
  };
  assert.equal(submittedCalibrationEligibilityMatches(
    forgedEmergencyPayload,
    integratedBinding,
    { ineligibleBindings: [candidateBinding] },
  ), false, 'The emergency reason must not admit a forged exact model binding');

  const [submitSource, tripStoreSource, observationServiceSource, migrationSql,
    stableTripMigrationSql, operationalMigrationSql] = await Promise.all([
    fs.readFile('supabase/functions/submit-observation/index.ts', 'utf8'),
    fs.readFile('supabase/functions/_shared/trip-store.ts', 'utf8'),
    fs.readFile('js/services/observation-service.js', 'utf8'),
    fs.readFile('supabase/migrations/20260901010000_integrated_trip_measured_warmup_admission.sql',
      'utf8'),
    fs.readFile('supabase/migrations/20260829020000_integrated_trip_calibration_binding.sql',
      'utf8'),
    fs.readFile('supabase/migrations/20260829010000_ravscore_operational_documents_no_history.sql',
      'utf8'),
  ]);
  assert.match(submitSource,
    /!submittedCalibrationEligibilityMatches\(payload, ravScoreModelBinding\(\), \{[\s\S]{0,160}ineligibleBindings: \[candidateGRollbackModelBinding\(\)\]/,
    'Supabase submit must invoke the shared eligibility validator used above');
  assert.match(submitSource,
    /import \{ ravScoreModelBinding as candidateGRollbackModelBinding \} from "\.\.\/\.\.\/\.\.\/scripts\/rollback-assets\/ravscore-model-contract\.js"/,
    'Supabase submit must import the single sealed Candidate G rollback binding source');
  assert.match(submitSource,
    /tripEvidenceIntegrityIssues\(payload\)\.length[\s\S]{0,400}!submittedCalibrationEligibilityMatches/,
    'Supabase submit must validate schema-3 integrity before eligibility');
  assert.match(tripStoreSource,
    /const safePayload = projectLegacyExternalTripPayload\(payload\);[\s\S]{0,120}await assertActiveRavScoreTripBinding\(safePayload\)[\s\S]{0,180}activeTripStorageMode\(\)/,
    'Every Supabase and D1 schema-3 write must pass the active-model admission gate');
  assert.match(tripStoreSource,
    /ravradar_trip_v3_active_binding_admitted[\s\S]*admitted !== true[\s\S]*GatewayError\(409, RAVSCORE_MODEL_NOT_ACTIVE\)/,
    'PENDING or mismatched central model truth must produce a retryable 409');
  assert.match(tripStoreSource,
    /errorText\.includes\(RAVSCORE_MODEL_NOT_ACTIVE\)[\s\S]*GatewayError\(409, RAVSCORE_MODEL_NOT_ACTIVE\)/,
    'The database race-trigger sentinel must remain a retryable 409');
  assert.match(observationServiceSource,
    /for\(const row of queue\)[\s\S]*catch\(error\)\{remaining\.push\([\s\S]*write\(OUTBOX_KEY,remaining\)/,
    'A 409 transition rejection must leave the immutable observation in the retry outbox');
  assert.ok(stableTripMigrationSql.includes("'modelVersion'"),
    'Stable schema-3 constraint must retain the modelVersion field');
  for (const key of [
    'modelStateVersion', 'modelVariantId', 'modelProfileId',
    'modelComponentSchemaId', 'modelExplanationSchemaId', 'modelRankingPolicyId',
    'modelBestTimePolicyId', 'modelPresentationPolicyId', 'modelContractSha256',
    'modelBundleSha256',
  ]) assert.ok(migrationSql.includes(`'${key}'`), `SQL lacks Candidate-compatible ${key}`);
  for (const value of Object.values(integratedBinding)) {
    assert.ok(migrationSql.includes(`'${value}'`), `SQL lacks current integrated binding value ${value}`);
  }
  const operationalKeysMatch = migrationSql.match(/operational \?& array\[([\s\S]*?)\]\s*and operational - array\[/);
  assert.ok(operationalKeysMatch, 'SQL lacks the exact operational required-key gate');
  const operationalKeys = [...operationalKeysMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  assert.equal(operationalKeys.length, 30, 'Operational activation v4 must contain exactly 30 keys');
  assert.equal(new Set(operationalKeys).size, 30, 'Operational activation v4 keys must be unique');
  assert.ok(operationalKeys.includes('sourceImplementationClosureSha256'));
  assert.ok(operationalKeys.includes('requestedImplementationClosureSha256'));
  assert.match(migrationSql, /operational ->> 'schemaVersion' = 'ravscore-operational-model-activation-v4'/);
  assert.match(migrationSql, /operational - array\[[\s\S]*?\] = '\{\}'::jsonb/,
    'Unknown operational keys must fail closed');
  assert.match(migrationSql, /sourceImplementationClosureSha256' ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.match(migrationSql, /requestedImplementationClosureSha256' ~ '\^\[a-f0-9\]\{64\}\$'/);
  assert.match(stableTripMigrationSql,
    /normalized ~ '\(lat\(itude\)\?\|lon\(gitude\)\?\|lng\|gps\|coord\|position\|route\|track\|location\)'/,
    'SQL nested privacy must reject the same location aliases as browser and Edge');
  assert.match(migrationSql,
    /RAVSCORE_INTEGRATED_BINDING_BEGIN[\s\S]*p_model_version = 'RRS-COASTAL-PROCESS-INTEGRATED-1\.1\.0'[\s\S]*RAVSCORE_INTEGRATED_BINDING_END[\s\S]*then public\.ravradar_trip_v3_calibration_truth_allowed/,
    'SQL exact integrated binding must delegate to the immutable truth table');
  assert.match(migrationSql,
    /quality_reasons not in \([\s\S]{0,800}public-emergency-last-complete[\s\S]{0,800}return p_calibration_eligible = false/,
    'SQL truth must retain bounded public emergency evidence as false');
  assert.match(migrationSql,
    /ravscore-history-incomplete[\s\S]{0,400}return warmup_reason_count = 0 and p_calibration_eligible = false/,
    'SQL truth must retain HISTORY_INCOMPLETE as false and forbid the redundant warmup marker');
  assert.match(migrationSql,
    /warmup_reason_count = 1 or quality_reasons <> '\[\]'::jsonb[\s\S]{0,120}return p_calibration_eligible = false/,
    'SQL truth must retain FULL_HISTORY captured under global warmup as false');
  const candidateReasonBlock = migrationSql.slice(
    migrationSql.indexOf('-- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END'),
    migrationSql.indexOf('else false\n  end;', migrationSql.indexOf('-- RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END')),
  );
  assert.doesNotMatch(candidateReasonBlock, /'\["ravscore-history-incomplete"\]'::jsonb/,
    'Candidate G rollback must not accept the new integrated-only history quality');
  assert.match(migrationSql,
    /ravradar_trip_v3_active_binding_admitted\([\s\S]{0,900}p_reason_codes jsonb[\s\S]{0,5000}'reasonCodes', p_reason_codes/,
    'The active SQL admission gate must receive and validate the exact reason array');
  assert.match(stableTripMigrationSql,
    /new\.calibration_features -> 'reasonCodes',[\s\S]{0,200}new\.calibration_eligible/,
    'The database trigger must pass immutable trip reason codes to the active gate');
  assert.match(stableTripMigrationSql,
    /ravradar_trip_v3_score_quality_allowed\([\s\S]*scoreBoundModelUncertaintyPoints[\s\S]*FULL_HISTORY[\s\S]*HISTORY_INCOMPLETE[\s\S]*CONSERVATIVE_ENCLOSING_LOWER_BOUND/i,
    'SQL must revalidate immutable score bounds and quality semantics');
  assert.match(migrationSql,
    /RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_BEGIN[\s\S]*p_model_version = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'[\s\S]*modelContractSha256' = '[a-f0-9]{64}'[\s\S]*modelBundleSha256' = '[a-f0-9]{64}'[\s\S]*RAVSCORE_CANDIDATE_G_ROLLBACK_BINDING_END[\s\S]*then public\.ravradar_trip_v3_calibration_truth_allowed/,
    'SQL must allow only the exact sealed Candidate G binding and delegate to truth');
  assert.match(migrationSql,
    /if p_model_version = 'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3'[\s\S]{0,200}return warmup_reason_count = 0[\s\S]{0,120}p_calibration_eligible = false/,
    'Candidate G truth must remain false and must reject the integrated warmup marker');
  assert.doesNotMatch(migrationSql, /RRS-FORGED-STRUCTURALLY-VALID-1/,
    'The SQL allowlist must not contain the forged structurally valid binding');
  assert.match(migrationSql,
    /create or replace function public\.ravradar_trip_v3_active_binding_admitted\([\s\S]*INTEGRATED_ACTIVE[\s\S]*CANDIDATE_G_ACTIVE[\s\S]*end;\s*\$\$;/i,
    'SQL admission must require one of the two exact ACTIVE operational statuses');
  assert.doesNotMatch(
    migrationSql.slice(
      migrationSql.indexOf('create or replace function public.ravradar_trip_v3_active_binding_admitted('),
      migrationSql.indexOf('revoke all on function public.ravradar_trip_v3_active_binding_admitted('),
    ),
    /(?:INTEGRATED_PENDING|CANDIDATE_G_PENDING)/,
    'No PENDING operational status may admit a schema-3 write');
  assert.match(stableTripMigrationSql,
    /create trigger ravradar_observations_active_v3_binding_trigger[\s\S]*before insert or update[\s\S]*ravradar_observation_require_active_v3_binding\(\)/i,
    'The database must close the Edge preflight/write race with a row trigger');
  assert.match(stableTripMigrationSql,
    /message = 'RAVSCORE_MODEL_NOT_ACTIVE'/,
    'The database race gate must return only the bounded transition sentinel');
  const activeAdmissionSql = migrationSql.slice(
    migrationSql.indexOf('create or replace function public.ravradar_trip_v3_active_binding_admitted('),
    migrationSql.indexOf('revoke all on function public.ravradar_trip_v3_active_binding_admitted('),
  );
  const normalizedActiveAdmissionSql = activeAdmissionSql.replace(/\r\n?/g, '\n');
  assert.match(normalizedActiveAdmissionSql, /language plpgsql\s+volatile\s+security definer/i,
    'The row-locking admission gate must not be declared stable or immutable');
  const admissionOperationalLock = normalizedActiveAdmissionSql.indexOf(
    "where document_key = 'ravscore-operational-model-activation'\n  for share",
  );
  const admissionProfileLock = normalizedActiveAdmissionSql.indexOf(
    "where document_key = 'ravscore-profile-selection'\n  for share",
  );
  assert.ok(admissionOperationalLock >= 0 && admissionProfileLock > admissionOperationalLock,
    'Admission must lock operation then profile FOR SHARE in the fixed CAS order');
  const normalizedOperationalMigrationSql = operationalMigrationSql.replace(/\r\n?/g, '\n');
  const casOperationalLock = normalizedOperationalMigrationSql.indexOf(
    "where document_key='ravscore-operational-model-activation'\n  for update",
  );
  const casProfileLock = normalizedOperationalMigrationSql.indexOf(
    "where document_key='ravscore-profile-selection'\n  for update",
  );
  assert.ok(casOperationalLock >= 0 && casProfileLock > casOperationalLock,
    'Activation CAS must lock operation then profile FOR UPDATE in the same fixed order');
  assert.notEqual(candidateBinding.modelId, integratedModelBinding().modelId);
  assert.notEqual(candidateBinding.modelContractSha256,
    integratedModelBinding().modelContractSha256);
  assert.notEqual(candidateBinding.modelBundleSha256,
    integratedModelBinding().modelBundleSha256);
} finally {
  await fs.rm(temporaryRoot, { recursive: true, force: true });
}

console.log('Candidate Pages overlay binds schema-3 trips; Supabase and D1 accept them only with calibration_eligible=false.');
