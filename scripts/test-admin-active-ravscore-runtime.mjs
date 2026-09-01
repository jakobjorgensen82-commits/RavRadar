import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { resolvePublicRavScoreProfile } from '../js/core/ravscore-public-model.js';
import { summarizeHistoricalRows } from '../js/services/historical-analysis.js';
import { ravScoreModelBinding as candidateRollbackModelBinding } from './rollback-assets/ravscore-model-contract.js';
import {
  MODEL_BINDING_FIELDS,
  applyAdminObservationModelPolicy,
  resolveAdminActivePublicRavScore,
} from '../js/ui/admin-active-ravscore.js';

const integratedBinding = { ...ravScoreModelBinding() };
const candidateBinding = { ...candidateRollbackModelBinding() };

assert.equal(MODEL_BINDING_FIELDS.length, 11);
assert.ok(MODEL_BINDING_FIELDS.includes('modelContractSha256'));
assert.deepEqual(Object.keys(integratedBinding).sort(), [...MODEL_BINDING_FIELDS].sort());
assert.deepEqual(Object.keys(candidateBinding).sort(), [...MODEL_BINDING_FIELDS].sort());

function profileFor(binding, kind) {
  const candidate = kind === 'candidate-g-rollback';
  return {
    schemaVersion: candidate ? 'candidate-g-state-v2' : 'integrated-state-v4',
    switchVersion: candidate
      ? 'RAVSCORE-OPERATIONAL-ROLLBACK-DEC-0110-V2'
      : 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0',
    requestedProfileId: binding.modelId,
    activeProfileId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    variantId: binding.variantId,
    profileId: binding.profileId,
    componentSchemaId: binding.componentSchemaId,
    explanationSchemaId: binding.explanationSchemaId,
    rankingPolicyId: binding.rankingPolicyId,
    bestTimePolicyId: binding.bestTimePolicyId,
    presentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
    rollbackModelId: candidate ? null : 'RRS-CANDIDATE-G-ROLLBACK',
    runtimeFallbackModelId: null,
    modelCoverageReady: true,
    modelMemoryReady: true,
    modelMigrationReady: true,
    memoryReferenceScope: 'CURRENT_COMMON_ZONE_REFERENCE',
    activationState: candidate
      ? 'manual-candidate-g-only-local-fail-closed'
      : 'integrated-model-only-local-fail-closed',
    advisories: [],
    publicAvailabilityPolicy: candidate
      ? 'candidate-g-local-fail-closed'
      : 'integrated-model-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    automaticActivationAllowed: false,
  };
}

function runtimeFor(binding, kind) {
  const scoreProfile = profileFor(binding, kind);
  const scoreAvailability = {
    schemaVersion: 2,
    policy: scoreProfile.publicAvailabilityPolicy,
    allZonesActive: true,
    activeZoneCount: 210,
    unavailableZoneCount: 0,
    totalZoneCount: 210,
    allCurrentScoresFullHistory: true,
    fullHistoryModeCount: 420,
    historyIncompleteModeCount: 0,
    historyIncompleteZoneCount: 0,
    historyIncompleteZones: [],
  };
  return {
    manifest: {
      ravScoreModelBinding: { ...binding },
      ravScoreRuntime: { modelBinding: { ...binding } },
      ravScoreProfile: { ...scoreProfile },
      ravScoreAvailability: { ...scoreAvailability },
    },
    conditions: {
      ravScoreRuntime: { modelBinding: { ...binding } },
      nationalForecast: { modelBinding: { ...binding } },
      coastalParts: {
        modelBinding: { ...binding },
        scoreProfile: { ...scoreProfile },
        scoreAvailability: { ...scoreAvailability },
      },
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function mutateBothProfiles(runtime, mutate) {
  mutate(runtime.manifest.ravScoreProfile);
  mutate(runtime.conditions.coastalParts.scoreProfile);
  return runtime;
}

const integratedRuntime = runtimeFor(integratedBinding, 'integrated');
const producedIntegratedProfile = resolvePublicRavScoreProfile({
  modelCoverageReady: true,
  modelMemoryReady: true,
  modelMigrationReady: true,
});
integratedRuntime.manifest.ravScoreProfile = { ...producedIntegratedProfile };
integratedRuntime.conditions.coastalParts.scoreProfile = { ...producedIntegratedProfile };
const integrated = resolveAdminActivePublicRavScore(integratedRuntime);
assert.equal(integrated.kind, 'integrated');
assert.equal(integrated.labelDa, 'Integreret kystprocesmodel');
assert.equal(integrated.observationCalibrationEligible, true);
assert.deepEqual(integrated.binding, integratedBinding);
assert.equal(integrated.diagnosticScoreProfile.modelContractSha256,
  integratedBinding.modelContractSha256);
assert.equal(integrated.diagnosticScoreProfile.publicShadow, false);
assert.equal(integrated.diagnosticScoreProfile.crossModelFallback, false);
assert.equal(integrated.historyQuality.allCurrentScoresFullHistory, true);
assert.deepEqual(integrated.diagnosticScoreProfile.weights,
  { huntability: 20, transport: 50, mobilisation: 30 });

const candidateRuntime = runtimeFor(candidateBinding, 'candidate-g-rollback');
const candidateWithSentinel = clone(candidateRuntime);
candidateWithSentinel.conditions.coastalParts.scoreProfile.forbiddenSentinel = 'must-not-export';
candidateWithSentinel.manifest.ravScoreProfile.forbiddenSentinel = 'must-not-export';
assert.throws(() => resolveAdminActivePublicRavScore(candidateWithSentinel),
  /exact public score-profile field set/,
  'Unknown profile fields must fail closed instead of being silently projected away.');
const candidate = resolveAdminActivePublicRavScore(candidateRuntime);
assert.equal(candidate.kind, 'candidate-g-rollback');
assert.equal(candidate.labelDa, 'Candidate G · manuel driftsrollback');
assert.equal(candidate.observationCalibrationEligible, false);
assert.deepEqual(candidate.binding, candidateBinding);

const candidateDto = applyAdminObservationModelPolicy({
  calibration_eligible: true,
  calibration_binding_status: 'current-eligible',
  model_version: candidateBinding.modelId,
}, candidate);
assert.equal(candidateDto.calibration_eligible, false);
assert.equal(candidateDto.calibration_binding_status, 'current-ineligible');
const historicalDto = applyAdminObservationModelPolicy({
  calibration_eligible: false,
  calibration_binding_status: 'historical-model-bound',
}, candidate);
assert.equal(historicalDto.calibration_binding_status, 'historical-model-bound');
const integratedDto = Object.freeze({
  calibration_eligible: true,
  calibration_binding_status: 'current-eligible',
});
assert.equal(applyAdminObservationModelPolicy(integratedDto, integrated), integratedDto);

const rollbackSummary = summarizeHistoricalRows([{
  model_version: candidateBinding.modelId,
  found: true,
  rav_score: 100,
}], candidateBinding, { allowCalibration: false });
assert.equal(rollbackSummary.count, 0);
assert.equal(rollbackSummary.totalCount, 1);
assert.equal(rollbackSummary.excludedCount, 1);
assert.equal(rollbackSummary.observationCalibrationEligible, false);
assert.deepEqual(rollbackSummary.modelBinding, candidateBinding);

for (const [label, mutate, pattern] of [
  ['mixed coastal binding', runtime => {
    runtime.conditions.coastalParts.modelBinding.modelBundleSha256 = 'c'.repeat(64);
  }, /anden offentlig RavScore-model eller bundle/],
  ['mixed national forecast binding', runtime => {
    runtime.conditions.nationalForecast.modelBinding.modelId = 'RRS-OTHER';
  }, /anden offentlig RavScore-model eller bundle/],
  ['mixed manifest profile', runtime => {
    runtime.manifest.ravScoreProfile.modelBundleSha256 = 'c'.repeat(64);
  }, /does not match|matcher ikke/],
  ['mixed startup profile', runtime => {
    runtime.conditions.coastalParts.scoreProfile.modelContractSha256 = 'c'.repeat(64);
  }, /does not match|anden offentlig RavScore-model eller bundle/],
  ['extra profile field', runtime => mutateBothProfiles(runtime,
    profile => { profile.unexpectedShadowBinding = 'forbidden'; }),
  /exact public score-profile field set/],
  ['missing ranking policy', runtime => mutateBothProfiles(runtime,
    profile => { delete profile.rankingPolicyId; }),
  /exact public score-profile field set/],
  ['forged best-time policy', runtime => mutateBothProfiles(runtime,
    profile => { profile.bestTimePolicyId = 'forged-best-time'; }),
  /does not match bestTimePolicyId/],
  ['extra binding field', runtime => {
    for (const binding of [
      runtime.manifest.ravScoreModelBinding,
      runtime.manifest.ravScoreRuntime.modelBinding,
      runtime.conditions.ravScoreRuntime.modelBinding,
      runtime.conditions.nationalForecast.modelBinding,
      runtime.conditions.coastalParts.modelBinding,
    ]) binding.unexpected = 'not-allowed';
  }, /eksakte offentlige modelbinding/],
  ['missing model contract digest', runtime => {
    for (const binding of [
      runtime.manifest.ravScoreModelBinding,
      runtime.manifest.ravScoreRuntime.modelBinding,
      runtime.conditions.ravScoreRuntime.modelBinding,
      runtime.conditions.nationalForecast.modelBinding,
      runtime.conditions.coastalParts.modelBinding,
    ]) delete binding.modelContractSha256;
    delete runtime.manifest.ravScoreProfile.modelContractSha256;
    delete runtime.conditions.coastalParts.scoreProfile.modelContractSha256;
  }, /eksakte offentlige modelbinding/],
  ['unknown activation', runtime => mutateBothProfiles(runtime,
    profile => { profile.activationState = 'unknown-public-mode'; }), /ukendt aktiveringstilstand/],
  ['mixed activation contract', runtime => mutateBothProfiles(runtime, profile => {
    profile.activationState = 'manual-candidate-g-only-local-fail-closed';
    profile.publicAvailabilityPolicy = 'candidate-g-local-fail-closed';
  }), /ukendt eller blandet driftsvej|Scoretilgængelighed/],
  ['cross-model fallback', runtime => mutateBothProfiles(runtime,
    profile => { profile.crossModelRuntimeFallbackAllowed = true; }), /invalid or unsafe|ukendt eller blandet/],
  ['runtime fallback model', runtime => mutateBothProfiles(runtime,
    profile => { profile.runtimeFallbackModelId = 'RRS-OTHER'; }), /invalid or unsafe|ukendt eller blandet/],
  ['automatic activation', runtime => mutateBothProfiles(runtime,
    profile => { profile.automaticActivationAllowed = true; }), /invalid or unsafe|ukendt eller blandet/],
  ['availability mismatch', runtime => {
    runtime.conditions.coastalParts.scoreAvailability.policy = 'other-policy';
  }, /Scoretilgængelighed/],
  ['manifest availability mismatch', runtime => {
    runtime.manifest.ravScoreAvailability.policy = 'other-policy';
  }, /Scoretilgængelighed/],
  ['requested profile mismatch', runtime => mutateBothProfiles(runtime,
    profile => { profile.requestedProfileId = 'RRS-OTHER'; }), /requests or activates another model/],
]) {
  const runtime = clone(integratedRuntime);
  mutate(runtime);
  assert.throws(() => resolveAdminActivePublicRavScore(runtime), pattern, label);
}

const incompleteCandidateRuntime = clone(candidateRuntime);
mutateBothProfiles(incompleteCandidateRuntime,
  profile => { profile.modelMemoryReady = false; });
assert.throws(() => resolveAdminActivePublicRavScore(incompleteCandidateRuntime),
  /ukendt eller blandet driftsvej/);

const incompleteIntegratedRuntime = clone(integratedRuntime);
mutateBothProfiles(incompleteIntegratedRuntime,
  profile => { profile.modelMigrationReady = false; });
assert.throws(() => resolveAdminActivePublicRavScore(incompleteIntegratedRuntime),
  /ukendt eller blandet driftsvej/,
  'Admin må ikke legitimere en integreret aktiv profil før alle cutover-readinessflags er sande.');

const historyIncompleteIntegratedRuntime = clone(integratedRuntime);
mutateBothProfiles(historyIncompleteIntegratedRuntime, profile => {
  profile.modelMemoryReady = false;
  profile.advisories = ['LOCAL_MODEL_MEMORY_INCOMPLETE'];
});
for (const availability of [
  historyIncompleteIntegratedRuntime.manifest.ravScoreAvailability,
  historyIncompleteIntegratedRuntime.conditions.coastalParts.scoreAvailability,
]) {
  availability.allCurrentScoresFullHistory = false;
  availability.fullHistoryModeCount = 418;
  availability.historyIncompleteModeCount = 2;
  availability.historyIncompleteZoneCount = 1;
  availability.historyIncompleteZones = [{
    zoneId: 'ZONE-1',
    modes: ['waders', 'beach'],
    historyCoverageHours: 24,
    historyReasonCodes: ['CURRENT_HISTORY_INCOMPLETE'],
  }];
}
const historyIncompleteIntegrated = resolveAdminActivePublicRavScore(
  historyIncompleteIntegratedRuntime,
);
assert.equal(historyIncompleteIntegrated.kind, 'integrated');
assert.equal(historyIncompleteIntegrated.scoreProfile.modelMemoryReady, false);
assert.equal(historyIncompleteIntegrated.historyQuality.allCurrentScoresFullHistory, false);
assert.equal(historyIncompleteIntegrated.historyQuality.calibrationEligible, false);
assert.equal(historyIncompleteIntegrated.observationCalibrationEligible, false);
assert.equal(historyIncompleteIntegrated.diagnosticScoreProfile.observationCalibrationEligible, false);
const historyIncompleteDto = applyAdminObservationModelPolicy({
  calibration_eligible: true,
  calibration_binding_status: 'current-eligible',
}, historyIncompleteIntegrated);
assert.equal(historyIncompleteDto.calibration_eligible, false);
assert.equal(historyIncompleteDto.calibration_binding_status, 'current-ineligible');

const malformedHistoryRuntime = clone(historyIncompleteIntegratedRuntime);
malformedHistoryRuntime.conditions.coastalParts.scoreAvailability
  .historyIncompleteZones[0].historyReasonCodes = [];
assert.throws(() => resolveAdminActivePublicRavScore(malformedHistoryRuntime),
  /ukendt eller blandet driftsvej/,
  'Admin must reject an incomplete-history readiness bypass without safe reason codes.');

assert.throws(() => resolveAdminActivePublicRavScore({
  manifest: null,
  conditions: clone(integratedRuntime.conditions),
}), /Manifestets modelbinding/);
assert.throws(() => resolveAdminActivePublicRavScore({
  manifest: clone(integratedRuntime.manifest),
  conditions: {},
}), /runtimebinding/);

const dashboardSource = fs.readFileSync(
  new URL('../js/ui/admin-dashboard.js', import.meta.url), 'utf8');
const resolverSource = fs.readFileSync(
  new URL('../js/ui/admin-active-ravscore.js', import.meta.url), 'utf8');
const historySource = fs.readFileSync(
  new URL('../js/services/historical-analysis.js', import.meta.url), 'utf8');

assert.match(dashboardSource, /resolveAdminActivePublicRavScore/);
assert.match(dashboardSource, /activeAdminObservationDto\(row,active\.value\)/);
assert.match(dashboardSource, /activePublicModel:\{/);
assert.match(dashboardSource, /diagnosticScoreProfile/);
assert.match(dashboardSource,
  /allowCalibration:active\.value\.observationCalibrationEligible/);
assert.match(dashboardSource,
  /Den aktive offentlige modeltilstand er udtrykkeligt ikke kalibreringsegnet\./);
assert.doesNotMatch(dashboardSource,
  /Observationer fra den manuelle Candidate G-driftsrollback/);
assert.doesNotMatch(dashboardSource, /ravscore-model-contract/);
assert.doesNotMatch(dashboardSource, /RAVSCORE_MODEL_CONTRACT|ravScoreModelBinding\s*\(/);
assert.doesNotMatch(dashboardSource,
  /Den integrerede kystprocesmodel er den eneste offentlige scoreprofil/);
assert.doesNotMatch(dashboardSource, /versionsstyrede integrerede modelkæde/);
assert.doesNotMatch(resolverSource,
  /from\s+['"][^'"]*(candidate|rollback-assets|ravscore-profile-switch)[^'"]*['"]/i);
assert.match(historySource, /allowCalibration===true\?source\.filter/);

const adminUiDirectory = new URL('../js/ui/', import.meta.url);
for (const file of fs.readdirSync(adminUiDirectory)
  .filter(name => /^admin.*\.js$/i.test(name))) {
  const source = fs.readFileSync(new URL(file, adminUiDirectory), 'utf8');
  assert.doesNotMatch(source,
    /(?:from\s+|import\s*\(\s*)['"][^'"]*(?:candidate|rollback-assets|ravscore-profile-switch|ravscore-candidate-g-rollback-runtime)[^'"]*['"]/i,
    `${file} må ikke importere Candidate-/rollback-runtimekode`);
}

console.log('Admin active RavScore runtime/export contract tests passed.');
