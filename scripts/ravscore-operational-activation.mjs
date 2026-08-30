#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_CONFIG } from '../config.js';
import {
  assertRavScoreModelBinding as assertIntegratedBinding,
  ravScoreModelBinding as integratedModelBinding,
} from '../js/core/ravscore-model-contract.js';
import {
  assertRavScoreModelBinding as assertCandidateBinding,
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';
import {
  PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
} from '../js/core/ravscore-public-model.js';
import {
  assertIntegratedRavScoreSelection,
  isCandidateGOnlySelection,
} from './lib/ravscore-profile-transition.mjs';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY,
} from './prepare-candidate-g-operational-rollback.mjs';
import {
  CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
} from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  assertLegacyCandidateGCentralProfile,
  assertLegacyCandidateGManifest,
  LEGACY_CANDIDATE_G_RELEASE_VERSION,
  legacyCandidateGControllerBinding,
  legacyCandidateGSourceIdentity,
} from './lib/ravscore-legacy-candidate-g-source.mjs';
import {
  assertLegacyCandidateGAttestation,
  assertLegacyCandidateGVerification,
} from './verify-legacy-candidate-g-source.mjs';
import { createSupabaseAdminRequester } from './lib/supabase-admin-rest.mjs';
import {
  REQUIRED_CUTOVER_MIGRATIONS,
  TRIP_ACTIVE_ADMISSION_POLICY_ID,
  TRIP_BINDING_POLICY_ID,
  checkIntegratedCutoverReadiness,
  expectedTripActiveAdmissionPolicy,
  expectedTripBindingPolicy,
} from './integrated-cutover-readiness.mjs';

export const RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY =
  'ravscore-operational-model-activation';
export const RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY =
  'ravscore-profile-selection';
export const RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA =
  'ravscore-operational-model-activation-v4';
export const RAVSCORE_OPERATIONAL_STATUSES = Object.freeze({
  integrated: 'INTEGRATED_ACTIVE',
  candidatePending: 'CANDIDATE_G_PENDING',
  candidateActive: 'CANDIDATE_G_ACTIVE',
  integratedPending: 'INTEGRATED_PENDING',
});
export const RAVSCORE_INTEGRATED_RETURN_POLICY = Object.freeze({
  schemaVersion: '1.0.0',
  kind: 'RAVSCORE_INTEGRATED_OPERATIONAL_RETURN_PLAN',
  mode: 'execute',
  confirmation: 'EXECUTE-INTEGRATED-RAVSCORE-RETURN',
  manualEventName: 'workflow_dispatch',
  mainRef: 'refs/heads/main',
  expectedZoneCount: 210,
  expectedPartCount: 673,
});
export const RAVSCORE_OPERATIONAL_TRANSITION_KINDS = Object.freeze({
  candidateRollback: 'CANDIDATE_G_ROLLBACK',
  candidateRefresh: 'CANDIDATE_G_REFRESH',
  integratedRefresh: 'INTEGRATED_REFRESH',
  integratedReturn: 'INTEGRATED_RETURN',
  initialIntegratedCutover: 'INITIAL_INTEGRATED_CUTOVER',
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const HEAD_PATTERN = /^[a-f0-9]{40}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const DOCUMENT_FIELDS = Object.freeze([
  'schemaVersion',
  'status',
  'transitionKind',
  'sourceHead',
  'datasetId',
  'productionReferenceAt',
  'rollbackId',
  'activeModelBinding',
  'requestedModelBinding',
  'sourceModelBinding',
  'candidatePlanSha256',
  'candidateFullSha256',
  'privateBundleContentSha256',
  'publicManifestSha256',
  'sourcePublicManifestSha256',
  'requestedPublicManifestSha256',
  'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256',
  'sourceDeploymentId',
  'deploymentId',
  'automaticActivationAllowed',
  'schedulerActivationAllowed',
  'calibrationEligible',
  'requestedAt',
  'activatedAt',
  'failureCode',
  'returnPlanSha256',
  'integratedReadinessSha256',
  'integratedPublicAuditSha256',
  'integratedManifestSha256',
]);

const SERIALIZED_MODEL_BINDING_FIELDS = Object.freeze([
  'modelId',
  'stateSchemaVersion',
  'variantId',
  'profileId',
  'componentSchemaId',
  'explanationSchemaId',
  'rankingPolicyId',
  'bestTimePolicyId',
  'presentationPolicyId',
  'modelContractSha256',
  'modelBundleSha256',
]);

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => crypto.createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(canonical(value)))
  .digest('hex');
const exactKeys = (value, fields) => value && typeof value === 'object' && !Array.isArray(value)
  && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const canonicalTime = value => validTime(value)
  && new Date(value).toISOString() === value;
const sameBinding = (left, right) => exactKeys(left, Object.keys(right))
  && JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
const [EXPECTED_TRIP_BINDING_POLICY, EXPECTED_TRIP_ACTIVE_ADMISSION_POLICY] = await Promise.all([
  expectedTripBindingPolicy(),
  expectedTripActiveAdmissionPolicy(),
]);

function assertBinding(binding, expected, assertFunction, label) {
  assertFunction(binding, label);
  if (!sameBinding(binding, expected)) throw new Error(`${label} is not the expected exact model bundle`);
}

function assertSealedModelBinding(binding, label = 'Sealed operational model binding') {
  if (!exactKeys(binding, SERIALIZED_MODEL_BINDING_FIELDS)
    || SERIALIZED_MODEL_BINDING_FIELDS.slice(0, 9)
      .some(field => !SAFE_ID_PATTERN.test(String(binding?.[field] ?? '')))
    || !SHA256_PATTERN.test(String(binding?.modelContractSha256 ?? ''))
    || !SHA256_PATTERN.test(String(binding?.modelBundleSha256 ?? ''))) {
    throw new Error(`${label} is not an exact sealed 11-field model binding`);
  }
  return binding;
}

function assertSameSealedBinding(actual, expected, label) {
  assertSealedModelBinding(actual, label);
  assertSealedModelBinding(expected, `${label} expectation`);
  if (!sameBinding(actual, expected)) {
    throw new Error(`${label} differs from the sealed transition binding`);
  }
  return true;
}

function bindingKind(binding) {
  assertSealedModelBinding(binding, 'Operational model binding');
  if (sameBinding(binding, legacyCandidateGControllerBinding())) {
    return 'legacy-candidate-g';
  }
  if (sameBinding(binding, candidateModelBinding())) {
    return 'candidate-g';
  }
  if (sameBinding(binding, integratedModelBinding())) {
    return 'integrated';
  }
  throw new Error('Operational model binding is not an exact current or legacy-bootstrap binding');
}

function sealedBindingKind(binding) {
  assertSealedModelBinding(binding, 'Sealed historical operational model binding');
  if (sameBinding(binding, legacyCandidateGControllerBinding())) return 'legacy-candidate-g';
  if (binding.modelId === candidateModelBinding().modelId) return 'candidate-g';
  if (binding.modelId === integratedModelBinding().modelId) return 'integrated';
  throw new Error('Sealed historical binding has an unknown model id');
}

function candidateGOperationalProfileForBinding(integratedProfile, binding, {
  allowSealedHistoricalBinding = false,
} = {}) {
  assertIntegratedRavScoreSelection(integratedProfile, 'Integrated profile template');
  assertSealedModelBinding(binding, 'Candidate G operational profile binding');
  const classify = allowSealedHistoricalBinding ? sealedBindingKind : bindingKind;
  if (classify(binding) !== 'candidate-g') {
    throw new Error('Candidate G operational profile requires a sealed Candidate G binding');
  }
  return Object.freeze({
    schemaVersion: '3.0.0',
    sourceVersion: LEGACY_CANDIDATE_G_RELEASE_VERSION,
    switchVersion: 'RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0',
    requestedProfileId: binding.modelId,
    activeModelId: binding.modelId,
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
    rollbackModelId: integratedModelBinding().modelId,
    runtimeFallbackModelId: null,
    modelActivationEnabled: true,
    automaticActivationAllowed: false,
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    crossModelRuntimeFallbackAllowed: false,
    migrationRequiredAtFirstCutover: false,
    status: 'owner-approved-candidate-g-rollback-only-local-fail-closed',
    activationAuthority: 'DEC-0108-manual-candidate-g-rollback',
    evidence: Object.freeze({ ...PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE }),
  });
}

export function candidateGOperationalProfileDocument(integratedProfile) {
  return candidateGOperationalProfileForBinding(integratedProfile, candidateModelBinding());
}

function operationalProfileModel(profile) {
  if (profile?.schemaVersion === '2.0.0') {
    assertLegacyCandidateGCentralProfile(profile);
    return 'legacy-candidate-g';
  }
  if (isCandidateGOnlySelection(profile)) {
    return 'candidate-g';
  }
  assertIntegratedRavScoreSelection(profile, 'Central operational RavScore profile');
  return 'integrated';
}

const SEALED_OPERATIONAL_PROFILE_FIELDS = Object.freeze([
  'schemaVersion', 'sourceVersion', 'switchVersion', 'requestedProfileId',
  'activeModelId', 'stateSchemaVersion', 'variantId', 'profileId',
  'componentSchemaId', 'explanationSchemaId', 'rankingPolicyId',
  'bestTimePolicyId', 'presentationPolicyId', 'modelContractSha256',
  'modelBundleSha256', 'rollbackModelId', 'runtimeFallbackModelId',
  'modelActivationEnabled', 'automaticActivationAllowed',
  'publicAvailabilityPolicy', 'crossModelRuntimeFallbackAllowed',
  'migrationRequiredAtFirstCutover', 'status', 'activationAuthority', 'evidence',
]);

function assertProfileRowForSealedBinding(profileRow, binding) {
  if (!profileRow || !Number.isSafeInteger(Number(profileRow.version))
    || Number(profileRow.version) < 1) {
    throw new Error('Central sealed RavScore profile lacks an exact CAS version');
  }
  const kind = sealedBindingKind(binding);
  if (kind === 'legacy-candidate-g') {
    assertLegacyCandidateGCentralProfile(profileRow.payload,
      'Central legacy Candidate G profile');
    return true;
  }
  const profile = profileRow.payload;
  const evidence = profile?.evidence;
  const candidate = kind === 'candidate-g';
  if (!exactKeys(profile, SEALED_OPERATIONAL_PROFILE_FIELDS)
    || !exactKeys(evidence, [
      'decisionId', 'exactHeadValidationRequired', 'freshProductionValidationRequired',
    ])
    || profile.schemaVersion !== '3.0.0'
    || profile.requestedProfileId !== binding.modelId
    || profile.activeModelId !== binding.modelId
    || profile.stateSchemaVersion !== binding.stateSchemaVersion
    || profile.variantId !== binding.variantId
    || profile.profileId !== binding.profileId
    || profile.componentSchemaId !== binding.componentSchemaId
    || profile.explanationSchemaId !== binding.explanationSchemaId
    || profile.rankingPolicyId !== binding.rankingPolicyId
    || profile.bestTimePolicyId !== binding.bestTimePolicyId
    || profile.presentationPolicyId !== binding.presentationPolicyId
    || profile.modelContractSha256 !== binding.modelContractSha256
    || profile.modelBundleSha256 !== binding.modelBundleSha256
    || profile.runtimeFallbackModelId !== null
    || profile.modelActivationEnabled !== true
    || profile.automaticActivationAllowed !== false
    || profile.crossModelRuntimeFallbackAllowed !== false
    || !/^\d+\.\d+\.\d+$/.test(String(profile.sourceVersion ?? ''))
    || profile.switchVersion !== (candidate
      ? 'RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0'
      : 'RAVSCORE-PROFILE-SWITCH-INTEGRATED-1.0.0')
    || profile.rollbackModelId !== (candidate
      ? integratedModelBinding().modelId : candidateModelBinding().modelId)
    || profile.publicAvailabilityPolicy !== (candidate
      ? 'candidate-g-local-fail-closed' : 'integrated-model-local-fail-closed')
    || profile.migrationRequiredAtFirstCutover !== !candidate
    || profile.status !== (candidate
      ? 'owner-approved-candidate-g-rollback-only-local-fail-closed'
      : 'owner-approved-integrated-model-only-local-fail-closed')
    || profile.activationAuthority !== (candidate
      ? 'DEC-0108-manual-candidate-g-rollback'
      : 'DEC-0108-integrated-ravscore-release-decision')
    || (candidate && profile.sourceVersion !== LEGACY_CANDIDATE_G_RELEASE_VERSION)
    || evidence.decisionId !== 'DEC-0108'
    || evidence.exactHeadValidationRequired !== true
    || evidence.freshProductionValidationRequired !== true) {
    throw new Error('Central operational profile differs from the sealed PENDING binding');
  }
  return true;
}

function exactProfileForModel(model, integratedProfile, binding = null, {
  sealedTargetProfile = null,
  allowSealedHistoricalBinding = false,
} = {}) {
  assertIntegratedRavScoreSelection(integratedProfile, 'Local integrated RavScore profile');
  if (model === 'legacy-candidate-g') {
    throw new Error('Legacy Candidate G profile may only be preserved, never reconstructed');
  }
  const sealedBinding = binding ?? (model === 'candidate-g'
    ? candidateModelBinding() : integratedModelBinding());
  assertSealedModelBinding(sealedBinding, 'Operational target profile binding');
  const classify = allowSealedHistoricalBinding ? sealedBindingKind : bindingKind;
  if (classify(sealedBinding) !== model) {
    throw new Error('Operational target profile model differs from its sealed binding');
  }
  if (sealedTargetProfile !== null) {
    assertProfileRowForSealedBinding({ version: 1, payload: sealedTargetProfile }, sealedBinding);
    return Object.freeze(structuredClone(sealedTargetProfile));
  }
  if (model === 'candidate-g') {
    return candidateGOperationalProfileForBinding({
      ...integratedProfile,
    }, sealedBinding, { allowSealedHistoricalBinding });
  }
  if (allowSealedHistoricalBinding) {
    throw new Error('Historical integrated activation requires its sealed target central profile');
  }
  return Object.freeze({
    ...structuredClone(integratedProfile),
    requestedProfileId: sealedBinding.modelId,
    activeModelId: sealedBinding.modelId,
    stateSchemaVersion: sealedBinding.stateSchemaVersion,
    variantId: sealedBinding.variantId,
    profileId: sealedBinding.profileId,
    componentSchemaId: sealedBinding.componentSchemaId,
    explanationSchemaId: sealedBinding.explanationSchemaId,
    rankingPolicyId: sealedBinding.rankingPolicyId,
    bestTimePolicyId: sealedBinding.bestTimePolicyId,
    presentationPolicyId: sealedBinding.presentationPolicyId,
    modelContractSha256: sealedBinding.modelContractSha256,
    modelBundleSha256: sealedBinding.modelBundleSha256,
  });
}

function assertProfileRowForModel(profileRow, model, integratedProfile = null) {
  if (!profileRow || !Number.isSafeInteger(Number(profileRow.version))
    || Number(profileRow.version) < 1) {
    throw new Error('Central RavScore profile lacks an exact CAS version');
  }
  if (operationalProfileModel(profileRow.payload) !== model) {
    throw new Error('Central profile and operational active model are split');
  }
  if (integratedProfile !== null && model === 'legacy-candidate-g') {
    assertLegacyCandidateGCentralProfile(profileRow.payload,
      'Central legacy Candidate G profile');
  } else if (integratedProfile !== null && model === 'candidate-g'
    && !isCandidateGOnlySelection(profileRow.payload)) {
    throw new Error('Central Candidate G profile is invalid');
  }
  return true;
}

const CANDIDATE_PLAN_FIELDS = Object.freeze([
  'schemaVersion',
  'kind',
  'mode',
  'sourceHead',
  'datasetId',
  'productionReferenceAt',
  'privateBundleContentSha256',
  'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256',
  'centralExpectedVersion',
  'sourceModelBinding',
  'activeModelBinding',
  'rollbackId',
  'automaticActivationAllowed',
  'schedulerActivationAllowed',
  'calibrationEligible',
  'planSha256',
  'candidateFullSha256',
  'privatePayloadLogged',
]);

function assertCandidatePlan(plan, {
  expectedMode,
  expectedSourceModel,
  expectedSourceHead = null,
  expectedCentralVersion = null,
} = {}) {
  if (!exactKeys(plan, CANDIDATE_PLAN_FIELDS)
    || plan.schemaVersion !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.schemaVersion
    || plan.kind !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.kind
    || plan.mode !== expectedMode
    || !HEAD_PATTERN.test(String(plan.sourceHead ?? ''))
    || !SAFE_ID_PATTERN.test(String(plan.datasetId ?? ''))
    || !validTime(plan.productionReferenceAt)
    || plan.rollbackId !== CANDIDATE_G_OPERATIONAL_ROLLBACK_ID
    || !SHA256_PATTERN.test(String(plan.privateBundleContentSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.requestedImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.planSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.candidateFullSha256 ?? ''))
    || !Number.isSafeInteger(Number(plan.centralExpectedVersion))
    || Number(plan.centralExpectedVersion) < 0
    || plan.automaticActivationAllowed !== false
    || plan.schedulerActivationAllowed !== false
    || plan.calibrationEligible !== false
    || plan.privatePayloadLogged !== false) {
    throw new Error('Candidate G operational plan is incomplete or unsafe');
  }
  const {
    planSha256,
    candidateFullSha256: _candidateFullSha256,
    privatePayloadLogged: _privatePayloadLogged,
    ...activation
  } = plan;
  if (sha256(activation) !== planSha256) {
    throw new Error('Candidate G operational plan digest mismatch');
  }
  const sourceBinding = expectedSourceModel === 'candidate-g'
    ? candidateModelBinding() : integratedModelBinding();
  const assertSourceBinding = expectedSourceModel === 'candidate-g'
    ? assertCandidateBinding : assertIntegratedBinding;
  assertBinding(plan.sourceModelBinding, sourceBinding, assertSourceBinding,
    'Candidate G source binding');
  assertBinding(plan.activeModelBinding, candidateModelBinding(), assertCandidateBinding,
    'Candidate G requested binding');
  if (expectedSourceHead !== null && plan.sourceHead !== expectedSourceHead) {
    throw new Error('Candidate G operational plan belongs to another source head');
  }
  if (expectedCentralVersion !== null
    && Number(plan.centralExpectedVersion) !== Number(expectedCentralVersion)) {
    throw new Error('Candidate G operational plan belongs to another central CAS version');
  }
  return true;
}

export function assertCandidateActivationPlan(plan, {
  expectedSourceHead = null,
  expectedCentralVersion = null,
} = {}) {
  return assertCandidatePlan(plan, {
    expectedMode: CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.executeMode,
    expectedSourceModel: 'integrated',
    expectedSourceHead,
    expectedCentralVersion,
  });
}

export function assertCandidateRefreshPlan(plan, options = {}) {
  return assertCandidatePlan(plan, {
    ...options,
    expectedMode: CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.dryRunMode,
    expectedSourceModel: 'candidate-g',
  });
}

const OPERATIONAL_PAGES_VERIFICATION_FIELDS = Object.freeze([
  'schemaVersion',
  'status',
  'sourceHead',
  'datasetId',
  'productionReferenceAt',
  'model',
  'modelBinding',
  'implementationClosureSha256',
  'publicManifestSha256',
  'zoneCount',
  'coastalPartCount',
  'privatePayloadRead',
]);
const OPERATIONAL_TERMINAL_EVIDENCE_FIELDS = Object.freeze([
  'schemaVersion',
  'transitionSourceHead',
  'requestedPublicManifestSha256',
  'attemptId',
  'status',
  'pagesRequestAccepted',
  'observedSourcePublicManifestSha256',
  'checkedAt',
  'evidenceSource',
  'privatePayloadRead',
]);

function assertOperationalTerminalSourceEvidence(evidence, currentRow, sourceManifest) {
  const observedSourcePublicManifestSha256 = sha256(sourceManifest);
  if (!exactKeys(evidence, OPERATIONAL_TERMINAL_EVIDENCE_FIELDS)
    || evidence.schemaVersion !== 'ravscore-operational-pages-attempt-terminal-v1'
    || evidence.transitionSourceHead !== currentRow?.payload?.sourceHead
    || evidence.requestedPublicManifestSha256
      !== currentRow?.payload?.requestedPublicManifestSha256
    || evidence.attemptId !== currentRow?.payload?.deploymentId
    || !['NOT_STARTED', 'FAILED_BEFORE_PAGES_ACCEPTANCE'].includes(evidence.status)
    || evidence.pagesRequestAccepted !== false
    || evidence.observedSourcePublicManifestSha256
      !== observedSourcePublicManifestSha256
    || observedSourcePublicManifestSha256
      !== currentRow?.payload?.sourcePublicManifestSha256
    || !validTime(evidence.checkedAt)
    || Date.parse(evidence.checkedAt) < Date.parse(currentRow?.payload?.requestedAt)
    || evidence.evidenceSource !== 'github-actions-pages-terminal-readback'
    || evidence.privatePayloadRead !== false) {
    throw new Error('PENDING source abort lacks authoritative terminal Pages-attempt evidence');
  }
  return true;
}

function assertOperationalPagesVerification(verification, {
  model,
  binding,
  sourceHead,
  publicManifest,
  expectedImplementationClosureSha256 = null,
  assertBinding: assertExpectedBinding = null,
} = {}) {
  if (!exactKeys(verification, OPERATIONAL_PAGES_VERIFICATION_FIELDS)
    || verification.schemaVersion !== 'ravscore-operational-pages-verification-v1'
    || verification.status !== 'passed'
    || verification.sourceHead !== sourceHead
    || verification.datasetId !== publicManifest?.datasetId
    || verification.productionReferenceAt !== publicManifest?.productionReferenceAt
    || verification.model !== model
    || !SHA256_PATTERN.test(String(verification.implementationClosureSha256 ?? ''))
    || (expectedImplementationClosureSha256 !== null
      && verification.implementationClosureSha256 !== expectedImplementationClosureSha256)
    || verification.publicManifestSha256 !== sha256(publicManifest)
    || verification.zoneCount !== 210
    || verification.coastalPartCount !== 673
    || verification.privatePayloadRead !== false) {
    throw new Error('Operational activation lacks exact public Pages verification');
  }
  if (assertExpectedBinding) {
    assertBinding(verification.modelBinding, binding, assertExpectedBinding,
      'Operational Pages verification binding');
  } else {
    assertSameSealedBinding(verification.modelBinding, binding,
      'Operational Pages verification binding');
  }
  return true;
}

function assertOperationalPublicManifest(manifest, {
  binding = null,
  assertBinding: assertExpectedBinding = null,
  datasetId = null,
  productionReferenceAt = null,
  label = 'Operational public manifest',
} = {}) {
  if (!manifest || manifest.schemaVersion !== 4
    || manifest.complete !== true
    || !SAFE_ID_PATTERN.test(String(manifest.datasetId ?? ''))
    || !validTime(manifest.productionReferenceAt)
    || Number(manifest.zoneCount) !== 210
    || Number(manifest.coastalPartCount) !== 673
    || (datasetId !== null && manifest.datasetId !== datasetId)
    || (productionReferenceAt !== null
      && manifest.productionReferenceAt !== productionReferenceAt)) {
    throw new Error(`${label} lacks exact schema-4 210/673 identity`);
  }
  if (binding !== null) {
    if (assertExpectedBinding) {
      assertBinding(manifest.ravScoreModelBinding, binding, assertExpectedBinding,
        `${label} model binding`);
    } else {
      assertSameSealedBinding(manifest.ravScoreModelBinding, binding,
        `${label} model binding`);
    }
  }
  return true;
}

function assertOperationalSourceSeal({
  currentRow = null,
  sourceManifest,
  sourceVerification,
  model,
  sourceHead,
  requestedManifest = null,
  expectedImplementationClosureSha256 = null,
  allowSameBindingRefresh = false,
  label = 'Operational transition source',
} = {}) {
  const candidate = model === 'candidate-g';
  const binding = candidate ? candidateModelBinding() : integratedModelBinding();
  const assertExpected = candidate ? assertCandidateBinding : assertIntegratedBinding;
  if (requestedManifest && sha256(sourceManifest) === sha256(requestedManifest)) {
    throw new Error(`${label} is already the requested target and requires reconciliation`);
  }
  assertOperationalPublicManifest(sourceManifest, {
    binding,
    assertBinding: assertExpected,
    label,
  });
  assertOperationalPagesVerification(sourceVerification, {
    model,
    binding,
    sourceHead,
    publicManifest: sourceManifest,
    expectedImplementationClosureSha256,
    assertBinding: assertExpected,
  });
  if (currentRow !== null) {
    assertOperationalActivationDocument(currentRow.payload);
    const sameStoredPublicIdentity = sha256(sourceManifest)
      === currentRow.payload.publicManifestSha256
      && sourceManifest.datasetId === currentRow.payload.datasetId
      && sourceManifest.productionReferenceAt === currentRow.payload.productionReferenceAt;
    const sameActiveBinding = bindingKind(currentRow.payload.activeModelBinding) === model
      && sameBinding(currentRow.payload.activeModelBinding, binding);
    if ((!sameStoredPublicIdentity && !(allowSameBindingRefresh && sameActiveBinding))
      || !SAFE_ID_PATTERN.test(String(currentRow.payload.deploymentId ?? ''))) {
      throw new Error(`${label} drifted from the exact centrally ACTIVE public deployment`);
    }
    return sameStoredPublicIdentity ? currentRow.payload.deploymentId : null;
  }
  return null;
}

function assertLegacyOperationalSourceSeal({
  currentRow = null,
  sourceManifest,
  sourceAttestation,
  sourceVerification,
  sourceHead,
  requestedManifest,
  expectedImplementationClosureSha256 = null,
  label = 'Legacy Candidate G transition source',
} = {}) {
  assertLegacyCandidateGManifest(sourceManifest, label);
  assertLegacyCandidateGAttestation(sourceAttestation);
  assertLegacyCandidateGVerification(sourceVerification, {
    sourceHead,
    publicManifest: sourceManifest,
    localAttestation: sourceAttestation,
  });
  const legacyIdentity = legacyCandidateGSourceIdentity();
  const bootstrapBinding = legacyCandidateGControllerBinding();
  assertSealedModelBinding(bootstrapBinding, 'Legacy Candidate G bootstrap controller binding');
  for (const field of ['modelId', 'stateSchemaVersion', 'variantId', 'profileId']) {
    if (bootstrapBinding[field] !== legacyIdentity[field]) {
      throw new Error(`Legacy Candidate G bootstrap controller binding drifted at ${field}`);
    }
  }
  if (bootstrapBinding.modelContractSha256 !== legacyIdentity.sourceContractSha256
    || bootstrapBinding.modelBundleSha256 !== legacyIdentity.sourceBundleSha256) {
    throw new Error('Legacy Candidate G bootstrap controller binding lacks exact source digests');
  }
  if (!SHA256_PATTERN.test(String(sourceVerification?.implementationClosureSha256 ?? ''))) {
    throw new Error('Legacy Candidate G bootstrap adapter lacks the exact public implementation closure');
  }
  if (expectedImplementationClosureSha256 !== null
    && sourceVerification.implementationClosureSha256
      !== expectedImplementationClosureSha256) {
    throw new Error('Legacy Candidate G bootstrap closure differs from the sealed source');
  }
  if (sha256(sourceManifest) === sha256(requestedManifest)) {
    throw new Error(`${label} is already the requested target and requires reconciliation`);
  }
  if (currentRow !== null) {
    assertOperationalActivationDocument(currentRow.payload);
    if (bindingKind(currentRow.payload.activeModelBinding) !== 'legacy-candidate-g'
      || currentRow.payload.transitionKind
        !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
      || currentRow.payload.publicManifestSha256 !== sha256(sourceManifest)
      || currentRow.payload.datasetId !== sourceManifest.datasetId
      || currentRow.payload.productionReferenceAt !== sourceManifest.productionReferenceAt
      || !SAFE_ID_PATTERN.test(String(currentRow.payload.deploymentId ?? ''))) {
      throw new Error(`${label} drifted from the exact centrally ACTIVE legacy deployment`);
    }
    return currentRow.payload.deploymentId;
  }
  return null;
}

function assertOperationalPendingSourceRestore({
  currentRow,
  sourceManifest,
  sourceVerification,
  model,
  sourceHead,
  label = 'Operational pending source restore',
} = {}) {
  const candidate = model === 'candidate-g';
  const binding = candidate ? candidateModelBinding() : integratedModelBinding();
  const assertExpected = candidate ? assertCandidateBinding : assertIntegratedBinding;
  assertOperationalPublicManifest(sourceManifest, {
    binding,
    assertBinding: assertExpected,
    label,
  });
  assertOperationalPagesVerification(sourceVerification, {
    model,
    binding,
    sourceHead,
    publicManifest: sourceManifest,
    expectedImplementationClosureSha256:
      currentRow?.payload?.sourceImplementationClosureSha256 ?? null,
    assertBinding: assertExpected,
  });
  const observedSha256 = sha256(sourceManifest);
  if (observedSha256 !== currentRow?.payload?.sourcePublicManifestSha256
    || observedSha256 === currentRow?.payload?.requestedPublicManifestSha256
    || !SAFE_ID_PATTERN.test(String(currentRow?.payload?.sourceDeploymentId ?? ''))) {
    throw new Error(`${label} does not match the sealed source endpoint`);
  }
  return true;
}

function assertLegacyOperationalPendingSourceRestore({
  currentRow,
  sourceManifest,
  sourceAttestation,
  sourceVerification,
  sourceHead,
  label = 'Legacy Candidate G pending source restore',
} = {}) {
  assertLegacyCandidateGManifest(sourceManifest, label);
  assertLegacyCandidateGAttestation(sourceAttestation);
  assertLegacyCandidateGVerification(sourceVerification, {
    sourceHead,
    publicManifest: sourceManifest,
    localAttestation: sourceAttestation,
  });
  if (sourceVerification.implementationClosureSha256
    !== currentRow?.payload?.sourceImplementationClosureSha256) {
    throw new Error(`${label} differs from the sealed legacy source implementation closure`);
  }
  const observedSha256 = sha256(sourceManifest);
  if (observedSha256 !== currentRow?.payload?.sourcePublicManifestSha256
    || observedSha256 === currentRow?.payload?.requestedPublicManifestSha256
    || bindingKind(currentRow?.payload?.sourceModelBinding) !== 'legacy-candidate-g'
    || currentRow?.payload?.transitionKind
      !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
    || !SAFE_ID_PATTERN.test(String(currentRow?.payload?.sourceDeploymentId ?? ''))) {
    throw new Error(`${label} does not match the sealed legacy source endpoint`);
  }
  return true;
}

const INTEGRATED_RETURN_PLAN_FIELDS = Object.freeze([
  'schemaVersion',
  'kind',
  'mode',
  'transitionKind',
  'sourceHead',
  'datasetId',
  'productionReferenceAt',
  'centralExpectedVersion',
  'sourceModelBinding',
  'activeModelBinding',
  'sourceImplementationClosureSha256',
  'requestedImplementationClosureSha256',
  'candidateActivationDocumentSha256',
  'integratedReadinessSha256',
  'integratedPublicAuditSha256',
  'integratedManifestSha256',
  'automaticActivationAllowed',
  'schedulerActivationAllowed',
  'calibrationEligibleAfterVerifiedActivation',
  'privatePayloadLogged',
  'planSha256',
]);

function assertIntegratedReadiness(readiness, sourceHead) {
  if (!exactKeys(readiness, [
    'schemaVersion',
    'sourceHead',
    'modelContractSha256',
    'modelBundleSha256',
    'publicImplementationClosureSha256',
    'migrationIds',
    'tripSchemaVersion',
    'tripBindingPolicyId',
    'tripBindingPolicySha256',
    'tripActiveAdmissionPolicyId',
    'tripActiveAdmissionPolicySha256',
    'modelBinding',
    'candidateModelBinding',
    'centralProfile',
    'assistantBinding',
  ])
    || readiness.schemaVersion !== 'ravscore-integrated-cutover-readiness-v1'
    || readiness.sourceHead !== sourceHead
    || readiness.modelContractSha256 !== integratedModelBinding().modelContractSha256
    || readiness.modelBundleSha256 !== integratedModelBinding().modelBundleSha256
    || !SHA256_PATTERN.test(String(readiness.publicImplementationClosureSha256 ?? ''))
    || readiness.tripSchemaVersion !== 3
    || readiness.tripBindingPolicyId !== TRIP_BINDING_POLICY_ID
    || readiness.tripBindingPolicySha256 !== EXPECTED_TRIP_BINDING_POLICY.sha256
    || readiness.tripActiveAdmissionPolicyId !== TRIP_ACTIVE_ADMISSION_POLICY_ID
    || readiness.tripActiveAdmissionPolicySha256
      !== EXPECTED_TRIP_ACTIVE_ADMISSION_POLICY.sha256
    || JSON.stringify(readiness.migrationIds) !== JSON.stringify(
      REQUIRED_CUTOVER_MIGRATIONS.map(item => item.id))
    || !exactKeys(readiness.assistantBinding, [
      'modelId', 'stateSchemaVersion', 'modelContractSha256', 'modelBundleSha256',
      'knowledgeSchema', 'knowledgeSha256',
    ])
    || readiness.assistantBinding.modelId !== integratedModelBinding().modelId
    || readiness.assistantBinding.stateSchemaVersion
      !== integratedModelBinding().stateSchemaVersion
    || readiness.assistantBinding.modelContractSha256
      !== integratedModelBinding().modelContractSha256
    || readiness.assistantBinding.modelBundleSha256
      !== integratedModelBinding().modelBundleSha256
    || readiness.assistantBinding.knowledgeSchema
      !== 'rav-assistant-public-knowledge-v1'
    || !SHA256_PATTERN.test(String(readiness.assistantBinding.knowledgeSha256 ?? ''))) {
    throw new Error('Integrated return lacks exact backend/Edge cutover readiness');
  }
  assertBinding(readiness.modelBinding, integratedModelBinding(), assertIntegratedBinding,
    'Integrated return readiness binding');
  assertBinding(readiness.candidateModelBinding, candidateModelBinding(), assertCandidateBinding,
    'Integrated return readiness Candidate binding');
  assertIntegratedRavScoreSelection(readiness.centralProfile,
    'Integrated return readiness central profile');
  assertProfileRowForSealedBinding({ version: 1, payload: readiness.centralProfile },
    integratedModelBinding());
  return true;
}

function assertSealedIntegratedReadiness(readiness, currentDocument) {
  const expectedBinding = currentDocument?.requestedModelBinding;
  if (!exactKeys(readiness, [
    'schemaVersion', 'sourceHead', 'modelContractSha256', 'modelBundleSha256',
    'publicImplementationClosureSha256',
    'migrationIds', 'tripSchemaVersion', 'tripBindingPolicyId',
    'tripBindingPolicySha256', 'tripActiveAdmissionPolicyId',
    'tripActiveAdmissionPolicySha256', 'modelBinding', 'candidateModelBinding',
    'centralProfile', 'assistantBinding',
  ])
    || readiness.schemaVersion !== 'ravscore-integrated-cutover-readiness-v1'
    || readiness.sourceHead !== currentDocument?.sourceHead
    || readiness.modelContractSha256 !== expectedBinding?.modelContractSha256
    || readiness.modelBundleSha256 !== expectedBinding?.modelBundleSha256
    || readiness.publicImplementationClosureSha256
      !== currentDocument?.requestedImplementationClosureSha256
    || readiness.tripSchemaVersion !== 3
    || readiness.tripBindingPolicyId !== TRIP_BINDING_POLICY_ID
    || !SHA256_PATTERN.test(String(readiness.tripBindingPolicySha256 ?? ''))
    || readiness.tripActiveAdmissionPolicyId !== TRIP_ACTIVE_ADMISSION_POLICY_ID
    || !SHA256_PATTERN.test(String(readiness.tripActiveAdmissionPolicySha256 ?? ''))
    || JSON.stringify(readiness.migrationIds)
      !== JSON.stringify(REQUIRED_CUTOVER_MIGRATIONS.map(item => item.id))
    || !exactKeys(readiness.assistantBinding, [
      'modelId', 'stateSchemaVersion', 'modelContractSha256', 'modelBundleSha256',
      'knowledgeSchema', 'knowledgeSha256',
    ])
    || readiness.assistantBinding.modelId !== expectedBinding?.modelId
    || readiness.assistantBinding.stateSchemaVersion !== expectedBinding?.stateSchemaVersion
    || readiness.assistantBinding.modelContractSha256 !== expectedBinding?.modelContractSha256
    || readiness.assistantBinding.modelBundleSha256 !== expectedBinding?.modelBundleSha256
    || readiness.assistantBinding.knowledgeSchema !== 'rav-assistant-public-knowledge-v1'
    || !SHA256_PATTERN.test(String(readiness.assistantBinding.knowledgeSha256 ?? ''))
    || sha256(readiness) !== currentDocument?.integratedReadinessSha256) {
    throw new Error('Pending integrated reconciliation readiness differs from its sealed evidence');
  }
  assertSameSealedBinding(readiness.modelBinding, expectedBinding,
    'Pending integrated reconciliation readiness binding');
  assertSealedModelBinding(readiness.candidateModelBinding,
    'Pending integrated reconciliation Candidate binding');
  if (sealedBindingKind(readiness.candidateModelBinding) !== 'candidate-g') {
    throw new Error('Pending integrated reconciliation Candidate binding is incompatible');
  }
  assertProfileRowForSealedBinding({ version: 1, payload: readiness.centralProfile },
    expectedBinding);
  return true;
}

function assertSealedIntegratedPublicAudit(publicAudit, currentDocument) {
  const expectedBinding = currentDocument?.requestedModelBinding;
  if (!publicAudit || publicAudit.schemaVersion !== 1
    || publicAudit.status !== 'passed'
    || publicAudit.model?.modelId !== expectedBinding?.modelId
    || publicAudit.model?.stateSchemaVersion !== expectedBinding?.stateSchemaVersion
    || publicAudit.model?.modelContractSha256 !== expectedBinding?.modelContractSha256
    || publicAudit.model?.modelBundleSha256 !== expectedBinding?.modelBundleSha256
    || publicAudit.coverage?.expectedZoneCount !== 210
    || publicAudit.coverage?.zoneCount !== 210
    || publicAudit.coverage?.expectedPartCount !== 673
    || publicAudit.coverage?.partCount !== 673
    || publicAudit.rollback?.readyPartCount !== 673
    || publicAudit.payload?.privacyContractPassed !== true
    || publicAudit.payload?.publicStateOrEvidenceIncluded !== false
    || publicAudit.payload?.publicRawVectorIncluded !== false
    || publicAudit.payload?.publicUnapprovedCoordinateIncluded !== false
    || publicAudit.payload?.publicShadowIncluded !== false
    || !Array.isArray(publicAudit.errors)
    || publicAudit.errors.length !== 0
    || sha256(publicAudit) !== currentDocument?.integratedPublicAuditSha256) {
    throw new Error('Pending integrated reconciliation public audit differs from its sealed evidence');
  }
  return true;
}

function assertIntegratedPublicEvidence(publicManifest, publicAudit, {
  sourceHead,
  datasetId = null,
} = {}) {
  if (!publicManifest || publicManifest.schemaVersion !== 4
    || !SAFE_ID_PATTERN.test(String(publicManifest.datasetId ?? ''))
    || (datasetId !== null && publicManifest.datasetId !== datasetId)
    || !validTime(publicManifest.productionReferenceAt)
    || publicManifest.complete !== true
    || Number(publicManifest.zoneCount) !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedZoneCount
    || Number(publicManifest.coastalPartCount) !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedPartCount) {
    throw new Error('Integrated return lacks the exact local 210/673 public manifest');
  }
  assertBinding(publicManifest.ravScoreModelBinding, integratedModelBinding(),
    assertIntegratedBinding, 'Integrated return public manifest binding');
  if (!publicAudit || publicAudit.schemaVersion !== 1
    || publicAudit.status !== 'passed'
    || publicAudit.model?.modelId !== integratedModelBinding().modelId
    || publicAudit.model?.stateSchemaVersion !== integratedModelBinding().stateSchemaVersion
    || publicAudit.model?.modelContractSha256
      !== integratedModelBinding().modelContractSha256
    || publicAudit.model?.modelBundleSha256 !== integratedModelBinding().modelBundleSha256
    || publicAudit.coverage?.expectedZoneCount
      !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedZoneCount
    || publicAudit.coverage?.zoneCount !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedZoneCount
    || publicAudit.coverage?.expectedPartCount
      !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedPartCount
    || publicAudit.coverage?.partCount !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedPartCount
    || publicAudit.rollback?.readyPartCount !== RAVSCORE_INTEGRATED_RETURN_POLICY.expectedPartCount
    || publicAudit.payload?.privacyContractPassed !== true
    || publicAudit.payload?.publicStateOrEvidenceIncluded !== false
    || publicAudit.payload?.publicRawVectorIncluded !== false
    || publicAudit.payload?.publicUnapprovedCoordinateIncluded !== false
    || publicAudit.payload?.publicShadowIncluded !== false
    || !Array.isArray(publicAudit.errors)
    || publicAudit.errors.length !== 0
    || !HEAD_PATTERN.test(String(sourceHead ?? ''))) {
    throw new Error('Integrated return lacks the passed full public runtime audit');
  }
  return true;
}

export function assertIntegratedReturnPlan(plan, {
  expectedSourceHead = null,
  expectedCentralVersion = null,
  currentRow = null,
  currentProfileRow = null,
  readiness = null,
  publicManifest = null,
  publicAudit = null,
} = {}) {
  if (!exactKeys(plan, INTEGRATED_RETURN_PLAN_FIELDS)
    || plan.schemaVersion !== RAVSCORE_INTEGRATED_RETURN_POLICY.schemaVersion
    || plan.kind !== RAVSCORE_INTEGRATED_RETURN_POLICY.kind
    || plan.mode !== RAVSCORE_INTEGRATED_RETURN_POLICY.mode
    || !HEAD_PATTERN.test(String(plan.sourceHead ?? ''))
    || !SAFE_ID_PATTERN.test(String(plan.datasetId ?? ''))
    || !validTime(plan.productionReferenceAt)
    || !Number.isSafeInteger(Number(plan.centralExpectedVersion))
    || Number(plan.centralExpectedVersion) < 0
    || ![RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,
      RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover]
      .includes(plan.transitionKind)
    || !SHA256_PATTERN.test(String(plan.candidateActivationDocumentSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.requestedImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.integratedReadinessSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.integratedPublicAuditSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.integratedManifestSha256 ?? ''))
    || !SHA256_PATTERN.test(String(plan.planSha256 ?? ''))
    || plan.automaticActivationAllowed !== false
    || plan.schedulerActivationAllowed !== false
    || plan.calibrationEligibleAfterVerifiedActivation !== true
    || plan.privatePayloadLogged !== false) {
    throw new Error('Integrated operational return plan is incomplete or unsafe');
  }
  const { planSha256, ...unsealed } = plan;
  if (sha256(unsealed) !== planSha256) {
    throw new Error('Integrated operational return plan digest mismatch');
  }
  const sourceKind = bindingKind(plan.sourceModelBinding);
  if ((plan.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn
      && sourceKind !== 'candidate-g')
    || (plan.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
      && !['candidate-g', 'legacy-candidate-g'].includes(sourceKind))) {
    throw new Error('Integrated return source Candidate G binding is incompatible');
  }
  assertBinding(plan.activeModelBinding, integratedModelBinding(), assertIntegratedBinding,
    'Integrated return requested binding');
  if (expectedSourceHead !== null && plan.sourceHead !== expectedSourceHead) {
    throw new Error('Integrated return plan belongs to another source head');
  }
  if (expectedCentralVersion !== null
    && Number(plan.centralExpectedVersion) !== Number(expectedCentralVersion)) {
    throw new Error('Integrated return plan belongs to another central CAS version');
  }
  if (currentRow !== null) {
    if (Number(currentRow?.version) !== Number(plan.centralExpectedVersion)
      || sha256(currentRow?.payload) !== plan.candidateActivationDocumentSha256) {
      throw new Error('Integrated return plan belongs to another active Candidate G document');
    }
    const resolved = resolveOperationalRavScoreModel(currentRow);
    if (!['candidate-g', 'legacy-candidate-g'].includes(resolved.model)
      || bindingKind(plan.sourceModelBinding) !== resolved.model) {
      throw new Error('Integrated return may only start from active Candidate G');
    }
  } else if (currentProfileRow !== null) {
    const profileModel = operationalProfileModel(currentProfileRow.payload);
    if (!['candidate-g', 'legacy-candidate-g'].includes(profileModel)
      || bindingKind(plan.sourceModelBinding) !== profileModel) {
      throw new Error('Initial integrated cutover source profile is incompatible');
    }
    if (plan.transitionKind !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
      || Number(plan.centralExpectedVersion) !== 0
      || sha256(currentProfileRow.payload) !== plan.candidateActivationDocumentSha256) {
      throw new Error('Initial integrated cutover plan is not bound to the legacy Candidate profile');
    }
  }
  if (readiness !== null) {
    assertIntegratedReadiness(readiness, plan.sourceHead);
    if (sha256(readiness) !== plan.integratedReadinessSha256) {
      throw new Error('Integrated return readiness digest mismatch');
    }
  }
  if (publicManifest !== null || publicAudit !== null) {
    assertIntegratedPublicEvidence(publicManifest, publicAudit, {
      sourceHead: plan.sourceHead,
      datasetId: plan.datasetId,
    });
    if (sha256(publicManifest) !== plan.integratedManifestSha256
      || sha256(publicAudit) !== plan.integratedPublicAuditSha256
      || publicManifest.productionReferenceAt !== plan.productionReferenceAt) {
      throw new Error('Integrated return public evidence digest mismatch');
    }
  }
  return true;
}

export function prepareIntegratedOperationalReturn({
  currentRow,
  currentProfileRow,
  sourceHead,
  publicManifest,
  publicAudit,
  readiness,
  sourceImplementationClosureSha256,
  requestedImplementationClosureSha256 = readiness?.publicImplementationClosureSha256,
  eventName,
  ref,
  githubSha,
  confirmation,
} = {}) {
  const initialRetry = currentRow !== null
    && resolveOperationalRavScoreModel(currentRow, {
      profileRow: currentProfileRow,
    }).initialCutoverRequired === true;
  const initialCutover = currentRow === null || initialRetry;
  if (ref !== RAVSCORE_INTEGRATED_RETURN_POLICY.mainRef || githubSha !== sourceHead
    || (initialCutover
      ? eventName !== 'push'
      : eventName !== RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName
        || confirmation !== RAVSCORE_INTEGRATED_RETURN_POLICY.confirmation)) {
    throw new Error(initialCutover
      ? 'Initial integrated cutover requires the exact main push'
      : 'Integrated return requires exact manual-dispatch authorization');
  }
  if (currentRow === null) {
    const profileModel = operationalProfileModel(currentProfileRow?.payload);
    if (!['candidate-g', 'legacy-candidate-g'].includes(profileModel)) {
      throw new Error('Initial integrated cutover requires an exact Candidate G source profile');
    }
  } else {
    if (!Number.isSafeInteger(Number(currentRow.version))) {
      throw new Error('Integrated return requires the exact active central version');
    }
    const current = resolveOperationalRavScoreModel(currentRow, { profileRow: currentProfileRow });
    if (!['candidate-g', 'legacy-candidate-g'].includes(current.model)) {
      throw new Error('Integrated return may only be prepared from active Candidate G');
    }
  }
  assertIntegratedReadiness(readiness, sourceHead);
  if (!SHA256_PATTERN.test(String(sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(requestedImplementationClosureSha256 ?? ''))
    || (readiness.publicImplementationClosureSha256 !== undefined
      && readiness.publicImplementationClosureSha256
        !== requestedImplementationClosureSha256)) {
    throw new Error('Integrated return lacks exact sealed source/target implementation closures');
  }
  assertIntegratedPublicEvidence(publicManifest, publicAudit, { sourceHead });
  const unsealed = {
    schemaVersion: RAVSCORE_INTEGRATED_RETURN_POLICY.schemaVersion,
    kind: RAVSCORE_INTEGRATED_RETURN_POLICY.kind,
    mode: RAVSCORE_INTEGRATED_RETURN_POLICY.mode,
    transitionKind: initialCutover
      ? RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
      : RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,
    sourceHead,
    datasetId: publicManifest.datasetId,
    productionReferenceAt: publicManifest.productionReferenceAt,
    centralExpectedVersion: Number(currentRow?.version ?? 0),
    sourceModelBinding: currentRow === null
      ? (operationalProfileModel(currentProfileRow.payload) === 'legacy-candidate-g'
        ? legacyCandidateGControllerBinding() : candidateModelBinding())
      : structuredClone(resolveOperationalRavScoreModel(currentRow).modelBinding),
    activeModelBinding: integratedModelBinding(),
    sourceImplementationClosureSha256,
    requestedImplementationClosureSha256,
    candidateActivationDocumentSha256: sha256(
      currentRow?.payload ?? currentProfileRow.payload,
    ),
    integratedReadinessSha256: sha256(readiness),
    integratedPublicAuditSha256: sha256(publicAudit),
    integratedManifestSha256: sha256(publicManifest),
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligibleAfterVerifiedActivation: true,
    privatePayloadLogged: false,
  };
  const plan = Object.freeze({ ...unsealed, planSha256: sha256(unsealed) });
  assertIntegratedReturnPlan(plan, {
    expectedSourceHead: sourceHead,
    expectedCentralVersion: Number(currentRow?.version ?? 0),
    currentRow,
    currentProfileRow,
    readiness,
    publicManifest,
    publicAudit,
  });
  return plan;
}

export function assertOperationalActivationDocument(document, {
  allowSealedHistoricalBindings = false,
} = {}) {
  const classifyBinding = allowSealedHistoricalBindings
    ? sealedBindingKind : bindingKind;
  if (!exactKeys(document, DOCUMENT_FIELDS)
    || document.schemaVersion !== RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA
    || !Object.values(RAVSCORE_OPERATIONAL_STATUSES).includes(document.status)
    || !Object.values(RAVSCORE_OPERATIONAL_TRANSITION_KINDS).includes(document.transitionKind)
    || !HEAD_PATTERN.test(String(document.sourceHead ?? ''))
    || !SAFE_ID_PATTERN.test(String(document.datasetId ?? ''))
    || !validTime(document.productionReferenceAt)
    || document.rollbackId !== CANDIDATE_G_OPERATIONAL_ROLLBACK_ID
    || !SHA256_PATTERN.test(String(document.sourcePublicManifestSha256 ?? ''))
    || !SHA256_PATTERN.test(String(document.requestedPublicManifestSha256 ?? ''))
    || !SHA256_PATTERN.test(String(document.sourceImplementationClosureSha256 ?? ''))
    || !SHA256_PATTERN.test(String(document.requestedImplementationClosureSha256 ?? ''))
    || !SAFE_ID_PATTERN.test(String(document.sourceDeploymentId ?? ''))
    || document.automaticActivationAllowed !== false
    || document.schedulerActivationAllowed !== false
    || !validTime(document.requestedAt)) {
    throw new Error('Operational RavScore activation document is invalid');
  }
  const returnHashes = [
    document.returnPlanSha256,
    document.integratedReadinessSha256,
    document.integratedPublicAuditSha256,
    document.integratedManifestSha256,
  ];
  const noReturn = returnHashes.every(value => value === null);
  const exactReturn = returnHashes.every(value => SHA256_PATTERN.test(String(value ?? '')));
  const candidateHashes = [
    document.candidatePlanSha256,
    document.candidateFullSha256,
    document.privateBundleContentSha256,
  ];
  const exactCandidate = candidateHashes.every(value => SHA256_PATTERN.test(String(value ?? '')));
  const noCandidate = candidateHashes.every(value => value === null);
  if (document.status === RAVSCORE_OPERATIONAL_STATUSES.candidatePending) {
    const refresh = document.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh;
    const rollback = document.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRollback;
    const expectedSource = refresh ? 'candidate-g' : 'integrated';
    if (classifyBinding(document.sourceModelBinding) !== expectedSource
      || classifyBinding(document.activeModelBinding) !== expectedSource
      || classifyBinding(document.requestedModelBinding) !== 'candidate-g'
      || (!refresh && !rollback)
      || !exactCandidate
      || document.calibrationEligible !== !refresh
      || document.publicManifestSha256 !== document.sourcePublicManifestSha256
      || document.requestedPublicManifestSha256 === document.sourcePublicManifestSha256
      || !SAFE_ID_PATTERN.test(String(document.deploymentId ?? ''))
      || document.failureCode !== null
      || !noReturn) {
      throw new Error('Pending Candidate G transition must preserve its exact active source');
    }
  } else if (document.status === RAVSCORE_OPERATIONAL_STATUSES.candidateActive) {
    const activeKind = classifyBinding(document.activeModelBinding);
    const sourceKind = classifyBinding(document.sourceModelBinding);
    const requestedKind = classifyBinding(document.requestedModelBinding);
    const rollback = document.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRollback;
    const refresh = document.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh;
    const failedReturn = [RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn,
      RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover]
      .includes(document.transitionKind);
    const failedRefresh = refresh && document.failureCode !== null;
    const correctHistory = rollback
      ? sourceKind === 'integrated' && requestedKind === 'candidate-g'
      : refresh
        ? sourceKind === 'candidate-g' && requestedKind === 'candidate-g'
        : failedReturn && sourceKind === activeKind && requestedKind === 'integrated';
    const correctHashes = failedReturn
      ? exactReturn && (document.transitionKind === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn
        ? exactCandidate : noCandidate)
      : exactCandidate && noReturn;
    if (!['candidate-g', 'legacy-candidate-g'].includes(activeKind)
      || (activeKind === 'legacy-candidate-g'
        && document.transitionKind
          !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover)
      || !correctHistory
      || !correctHashes
      || document.calibrationEligible !== false
      || !SHA256_PATTERN.test(String(document.publicManifestSha256 ?? ''))
      || !SAFE_ID_PATTERN.test(String(document.deploymentId ?? ''))
      || !validTime(document.activatedAt)
      || (failedReturn || failedRefresh
        ? (!SAFE_ID_PATTERN.test(String(document.failureCode ?? ''))
          || document.publicManifestSha256 !== document.sourcePublicManifestSha256
          || document.deploymentId !== document.sourceDeploymentId)
        : document.failureCode !== null
          || document.publicManifestSha256 !== document.requestedPublicManifestSha256)) {
      throw new Error('Active Candidate G document lacks exact deployment or failed-return evidence');
    }
  } else if (document.status === RAVSCORE_OPERATIONAL_STATUSES.integratedPending) {
    const sourceKind = classifyBinding(document.sourceModelBinding);
    const initial = document.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover;
    const refresh = document.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedRefresh;
    const commonInvalid = document.calibrationEligible !== false
      || document.publicManifestSha256 !== document.sourcePublicManifestSha256
      || document.requestedPublicManifestSha256 === document.sourcePublicManifestSha256
      || !SAFE_ID_PATTERN.test(String(document.deploymentId ?? ''))
      || !validTime(document.activatedAt)
      || document.failureCode !== null
      || !exactReturn;
    if (refresh) {
      if (sourceKind !== 'integrated'
        || classifyBinding(document.activeModelBinding) !== 'integrated'
        || classifyBinding(document.requestedModelBinding) !== 'integrated'
        || !sameBinding(document.sourceModelBinding, document.activeModelBinding)
        || !sameBinding(document.activeModelBinding, document.requestedModelBinding)
        || (!noCandidate && !exactCandidate)
        || commonInvalid) {
        throw new Error('Pending integrated refresh must preserve its exact active source');
      }
    } else if (!['candidate-g', 'legacy-candidate-g'].includes(sourceKind)
      || classifyBinding(document.activeModelBinding) !== sourceKind
      || classifyBinding(document.requestedModelBinding) !== 'integrated'
      || (!initial && document.transitionKind !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn)
      || (!initial && sourceKind !== 'candidate-g')
      || (initial ? !noCandidate : !exactCandidate)
      || commonInvalid) {
      throw new Error('Pending integrated transition must preserve its exact Candidate source');
    }
  } else if (document.status === RAVSCORE_OPERATIONAL_STATUSES.integrated
    && classifyBinding(document.sourceModelBinding) === 'integrated'
    && classifyBinding(document.requestedModelBinding) === 'integrated'
    && classifyBinding(document.activeModelBinding) === 'integrated'
    && sameBinding(document.sourceModelBinding, document.requestedModelBinding)
    && sameBinding(document.requestedModelBinding, document.activeModelBinding)) {
    const refresh = document.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedRefresh;
    if (refresh) {
      const completed = document.failureCode === null
        && document.publicManifestSha256 === document.requestedPublicManifestSha256
        && SAFE_ID_PATTERN.test(String(document.deploymentId ?? ''));
      const aborted = SAFE_ID_PATTERN.test(String(document.failureCode ?? ''))
        && document.publicManifestSha256 === document.sourcePublicManifestSha256
        && document.deploymentId === document.sourceDeploymentId;
      if ((!noCandidate && !exactCandidate)
        || !exactReturn
        || document.calibrationEligible !== true
        || !validTime(document.activatedAt)
        || (!completed && !aborted)) {
        throw new Error('Integrated refresh lacks an exact completed or source-restored identity');
      }
    } else if ((!noCandidate && !exactCandidate)
      || (!noReturn && !exactReturn)
      || document.calibrationEligible !== true
      || document.publicManifestSha256 !== document.sourcePublicManifestSha256
      || document.publicManifestSha256 !== document.requestedPublicManifestSha256
      || document.sourceImplementationClosureSha256
        !== document.requestedImplementationClosureSha256
      || document.deploymentId !== document.sourceDeploymentId
      || !validTime(document.activatedAt)
      || document.failureCode !== null) {
      throw new Error('Integrated maintenance document lacks one exact active public identity');
    }
  } else if (exactReturn) {
    const sourceKind = classifyBinding(document.sourceModelBinding);
    const initial = document.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover;
    if (!['candidate-g', 'legacy-candidate-g'].includes(sourceKind)
      || classifyBinding(document.requestedModelBinding) !== 'integrated'
      || classifyBinding(document.activeModelBinding) !== 'integrated'
      || (!initial && document.transitionKind !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.integratedReturn)
      || (!initial && sourceKind !== 'candidate-g')
      || (initial ? !noCandidate : !exactCandidate)
      || document.calibrationEligible !== true
      || document.publicManifestSha256 !== document.requestedPublicManifestSha256
      || !SHA256_PATTERN.test(String(document.publicManifestSha256 ?? ''))
      || !SAFE_ID_PATTERN.test(String(document.deploymentId ?? ''))
      || !validTime(document.activatedAt)
      || document.failureCode !== null) {
      throw new Error('Returned integrated document lacks exact public activation evidence');
    }
  } else {
    if (classifyBinding(document.sourceModelBinding) !== 'integrated'
      || classifyBinding(document.requestedModelBinding) !== 'candidate-g'
      || classifyBinding(document.activeModelBinding) !== 'integrated'
      || !sameBinding(document.sourceModelBinding, document.activeModelBinding)
      || document.transitionKind !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRollback
      || !exactCandidate
      || document.calibrationEligible !== true
      || document.publicManifestSha256 !== document.sourcePublicManifestSha256
      || document.deploymentId !== document.sourceDeploymentId
      || !validTime(document.activatedAt)
      || !SAFE_ID_PATTERN.test(String(document.failureCode ?? ''))
      || !noReturn) {
      throw new Error('Aborted Candidate G document lacks a bounded failure result');
    }
  }
  return true;
}

export function resolveOperationalRavScoreModel(row, {
  profileRow = null,
  allowPending = false,
} = {}) {
  if (row === null || row === undefined) {
    if (profileRow !== null) {
      const profileModel = operationalProfileModel(profileRow.payload);
      assertProfileRowForModel(profileRow, profileModel);
      if (profileModel === 'legacy-candidate-g') return Object.freeze({
        status:RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
        model:'legacy-candidate-g',
        modelBinding:legacyCandidateGControllerBinding(),
        centralVersion:0,
        profileVersion:Number(profileRow.version),
        pending:false,
        normalizationRequired:false,
        initialCutoverRequired:true,
        legacySourceRequired:true,
      });
      if (profileModel === 'candidate-g') return Object.freeze({
        status:RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
        model:'candidate-g',
        modelBinding:candidateModelBinding(),
        centralVersion:0,
        profileVersion:Number(profileRow.version),
        pending:false,
        normalizationRequired:false,
        initialCutoverRequired:true,
        legacySourceRequired:false,
      });
    }
    return Object.freeze({
      status:RAVSCORE_OPERATIONAL_STATUSES.integrated,
      model:'integrated',
      modelBinding:integratedModelBinding(),
      centralVersion:0,
      profileVersion:Number(profileRow?.version ?? 0),
      pending:false,
      normalizationRequired:false,
      initialCutoverRequired:false,
      legacySourceRequired:false,
    });
  }
  if (!Number.isSafeInteger(Number(row.version)) || Number(row.version) < 1) {
    throw new Error('Operational RavScore row lacks a central version');
  }
  assertOperationalActivationDocument(row.payload, {
    allowSealedHistoricalBindings: true,
  });
  const pending = [RAVSCORE_OPERATIONAL_STATUSES.candidatePending,
    RAVSCORE_OPERATIONAL_STATUSES.integratedPending].includes(row.payload.status);
  if (pending && !allowPending) {
    throw new Error('Operational model activation is pending; scheduled deploy must fail closed');
  }
  const activeKind = sealedBindingKind(row.payload.activeModelBinding);
  const legacyCandidate = activeKind === 'legacy-candidate-g';
  const candidate = activeKind === 'candidate-g';
  if (profileRow !== null) {
    const legacyBootstrap = legacyCandidate
      && row.payload.transitionKind
        === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
      && operationalProfileModel(profileRow.payload) === 'legacy-candidate-g';
    if (!legacyBootstrap) {
      assertProfileRowForSealedBinding(profileRow, row.payload.activeModelBinding);
    }
  }
  const initialCutoverRequired = Boolean(
    (candidate || legacyCandidate)
    && row.payload.status === RAVSCORE_OPERATIONAL_STATUSES.candidateActive
    && row.payload.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
    && SAFE_ID_PATTERN.test(String(row.payload.failureCode ?? ''))
    && row.payload.publicManifestSha256 === row.payload.sourcePublicManifestSha256
    && row.payload.deploymentId === row.payload.sourceDeploymentId
    && row.payload.calibrationEligible === false
  );
  return Object.freeze({
    status:row.payload.status,
    model:legacyCandidate ? 'legacy-candidate-g' : candidate ? 'candidate-g' : 'integrated',
    modelBinding:structuredClone(row.payload.activeModelBinding),
    centralVersion:Number(row.version),
    profileVersion:Number(profileRow?.version ?? 0),
    pending,
    requestedModel:sealedBindingKind(row.payload.requestedModelBinding),
    normalizationRequired:false,
    initialCutoverRequired,
    legacySourceRequired: Boolean(legacyCandidate
      && row.payload.transitionKind
        === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover
      && row.payload.status === RAVSCORE_OPERATIONAL_STATUSES.candidateActive),
    datasetId:row.payload.datasetId,
    productionReferenceAt:row.payload.productionReferenceAt,
    sourceHead:row.payload.sourceHead,
    activeModelBinding:structuredClone(row.payload.activeModelBinding),
    sourceModelBinding:structuredClone(row.payload.sourceModelBinding),
    requestedModelBinding:structuredClone(row.payload.requestedModelBinding),
    candidatePlanSha256:row.payload.candidatePlanSha256,
    sourcePublicManifestSha256:row.payload.sourcePublicManifestSha256,
    requestedPublicManifestSha256:row.payload.requestedPublicManifestSha256,
    sourceImplementationClosureSha256:row.payload.sourceImplementationClosureSha256,
    requestedImplementationClosureSha256:row.payload.requestedImplementationClosureSha256,
  });
}

function baseDocument(plan, now, {
  sourceManifest,
  requestedManifest,
  sourceDeploymentId = 'public-source-observed',
  pendingDeploymentId = 'pages-target-not-requested',
} = {}) {
  assertOperationalPublicManifest(sourceManifest, {
    binding: integratedModelBinding(),
    assertBinding: assertIntegratedBinding,
    label: 'Candidate G rollback source manifest',
  });
  assertOperationalPublicManifest(requestedManifest, {
    binding: candidateModelBinding(),
    assertBinding: assertCandidateBinding,
    datasetId: plan.datasetId,
    productionReferenceAt: plan.productionReferenceAt,
    label: 'Candidate G rollback requested manifest',
  });
  if (!SAFE_ID_PATTERN.test(String(sourceDeploymentId ?? ''))) {
    throw new Error('Candidate G rollback source deployment id is invalid');
  }
  if (!SAFE_ID_PATTERN.test(String(pendingDeploymentId ?? ''))) {
    throw new Error('Candidate G rollback pending deployment attempt id is invalid');
  }
  return {
    schemaVersion:RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA,
    status:RAVSCORE_OPERATIONAL_STATUSES.candidatePending,
    transitionKind:RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRollback,
    sourceHead:plan.sourceHead,
    datasetId:plan.datasetId,
    productionReferenceAt:plan.productionReferenceAt,
    rollbackId:plan.rollbackId,
    activeModelBinding:integratedModelBinding(),
    requestedModelBinding:candidateModelBinding(),
    sourceModelBinding:integratedModelBinding(),
    candidatePlanSha256:plan.planSha256,
    candidateFullSha256:plan.candidateFullSha256,
    privateBundleContentSha256:plan.privateBundleContentSha256,
    publicManifestSha256:sha256(sourceManifest),
    sourcePublicManifestSha256:sha256(sourceManifest),
    requestedPublicManifestSha256:sha256(requestedManifest),
    sourceImplementationClosureSha256:plan.sourceImplementationClosureSha256,
    requestedImplementationClosureSha256:plan.requestedImplementationClosureSha256,
    sourceDeploymentId:String(sourceDeploymentId),
    deploymentId:String(pendingDeploymentId),
    automaticActivationAllowed:false,
    schedulerActivationAllowed:false,
    calibrationEligible:true,
    requestedAt:new Date(now).toISOString(),
    activatedAt:null,
    failureCode:null,
    returnPlanSha256:null,
    integratedReadinessSha256:null,
    integratedPublicAuditSha256:null,
    integratedManifestSha256:null,
  };
}

export function operationalActivationTransition({
  action,
  currentRow = null,
  currentProfileRow = null,
  expectedVersion,
  plan,
  now = new Date().toISOString(),
  publicManifest = null,
  publicVerification = null,
  sourceManifest = null,
  sourceVerification = null,
  requestedManifest = null,
  sourceDeploymentId = 'public-source-observed',
  deploymentId = null,
  failureCode = null,
  terminalEvidence = null,
} = {}) {
  if (!Number.isSafeInteger(Number(expectedVersion)) || Number(expectedVersion) < 0
    || Number(currentRow?.version ?? 0) !== Number(expectedVersion)) {
    throw new Error('Operational RavScore compare-and-swap version mismatch');
  }
  assertCandidateActivationPlan(plan, {
    expectedSourceHead:plan?.sourceHead,
    expectedCentralVersion:plan?.centralExpectedVersion,
  });
  if (action === 'begin') {
    const current = resolveOperationalRavScoreModel(currentRow, {
      profileRow: currentProfileRow,
    });
    if (current.model !== 'integrated') {
      throw new Error('Candidate G is already pending or active');
    }
    const activeSourceDeploymentId = assertOperationalSourceSeal({
      currentRow,
      sourceManifest,
      sourceVerification,
      model: 'integrated',
      sourceHead: plan.sourceHead,
      requestedManifest,
      expectedImplementationClosureSha256: plan.sourceImplementationClosureSha256,
      allowSameBindingRefresh: true,
      label: 'Candidate G rollback source',
    });
    const document = baseDocument(plan, now, {
      sourceManifest,
      requestedManifest,
      sourceDeploymentId: activeSourceDeploymentId ?? sourceDeploymentId,
      pendingDeploymentId: deploymentId ?? 'pages-target-not-requested',
    });
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion:Number(expectedVersion) + 1 });
  }
  if (!currentRow) throw new Error('Operational Candidate G transition lacks a central pending row');
  assertOperationalActivationDocument(currentRow.payload);
  if (currentRow.payload.status !== RAVSCORE_OPERATIONAL_STATUSES.candidatePending
    || currentRow.payload.candidatePlanSha256 !== plan.planSha256
    || currentRow.payload.sourceHead !== plan.sourceHead
    || currentRow.payload.datasetId !== plan.datasetId) {
    throw new Error('Operational Candidate G pending row does not match the sealed plan');
  }
  if (action === 'complete') {
    if (!publicManifest || publicManifest.schemaVersion !== 4
      || publicManifest.datasetId !== plan.datasetId
      || publicManifest.productionReferenceAt !== plan.productionReferenceAt
      || publicManifest.complete !== true
      || Number(publicManifest.zoneCount) !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedZoneCount
      || Number(publicManifest.coastalPartCount) !== CANDIDATE_G_OPERATIONAL_ROLLBACK_POLICY.expectedPartCount
      || !SAFE_ID_PATTERN.test(String(deploymentId ?? ''))) {
      throw new Error('Candidate G completion lacks the exact deployed 210/673 manifest');
    }
    assertBinding(publicManifest.ravScoreModelBinding, candidateModelBinding(), assertCandidateBinding,
      'Candidate G deployed manifest binding');
    if (sha256(publicManifest) !== currentRow.payload.requestedPublicManifestSha256) {
      throw new Error('Candidate G deployed manifest differs from the pending requested artifact');
    }
    assertOperationalPagesVerification(publicVerification, {
      model: 'candidate-g',
      binding: candidateModelBinding(),
      sourceHead: plan.sourceHead,
      publicManifest,
      expectedImplementationClosureSha256:
        currentRow.payload.requestedImplementationClosureSha256,
      assertBinding: assertCandidateBinding,
    });
    const document = {
      ...currentRow.payload,
      status:RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
      activeModelBinding:candidateModelBinding(),
      publicManifestSha256:sha256(publicManifest),
      deploymentId:String(deploymentId),
      calibrationEligible:false,
      activatedAt:new Date(now).toISOString(),
      failureCode:null,
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion:Number(expectedVersion) + 1 });
  }
  if (action === 'abort') {
    if (!SAFE_ID_PATTERN.test(String(failureCode ?? ''))) {
      throw new Error('Candidate G abort requires a bounded non-sensitive failure code');
    }
    assertOperationalPendingSourceRestore({
      currentRow,
      sourceManifest,
      sourceVerification,
      model: 'integrated',
      sourceHead: plan.sourceHead,
      label: 'Candidate G rollback restored integrated source',
    });
    assertOperationalTerminalSourceEvidence(terminalEvidence, currentRow, sourceManifest);
    const document = {
      ...currentRow.payload,
      status:RAVSCORE_OPERATIONAL_STATUSES.integrated,
      activeModelBinding:integratedModelBinding(),
      datasetId:sourceManifest.datasetId,
      productionReferenceAt:sourceManifest.productionReferenceAt,
      publicManifestSha256:sha256(sourceManifest),
      deploymentId:currentRow.payload.sourceDeploymentId,
      calibrationEligible:true,
      activatedAt:new Date(now).toISOString(),
      failureCode:String(failureCode),
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion:Number(expectedVersion) + 1 });
  }
  throw new Error('Unknown operational RavScore transition');
}

// A scheduler may refresh an already active Candidate G release, but may never
// create the rollback state. Refresh is the same durable two-phase protocol as
// every model transition: source H0 is sealed centrally before Pages may expose
// H1, and a crash is reconciled from the two sealed endpoint identities.
export function operationalCandidateRefreshTransition({
  action,
  currentRow,
  currentProfileRow = null,
  expectedVersion,
  plan,
  sourceManifest = null,
  sourceVerification = null,
  requestedManifest = null,
  publicVerification = null,
  sourceDeploymentId = 'public-source-observed',
  deploymentId = null,
  failureCode = null,
  terminalEvidence = null,
  now = new Date().toISOString(),
} = {}) {
  if (!Number.isSafeInteger(Number(expectedVersion)) || Number(expectedVersion) < 1
    || Number(currentRow?.version) !== Number(expectedVersion)) {
    throw new Error('Operational Candidate G refresh compare-and-swap version mismatch');
  }
  assertCandidateRefreshPlan(plan, {
    expectedSourceHead: plan?.sourceHead,
    expectedCentralVersion: action === 'refresh-begin'
      ? expectedVersion : Number(expectedVersion) - 1,
  });
  if (action === 'refresh-begin') {
    const current = resolveOperationalRavScoreModel(currentRow, {
      profileRow: currentProfileRow,
    });
    if (current.model !== 'candidate-g') {
      throw new Error('Scheduler may only refresh an already active Candidate G release');
    }
    if (!sameBinding(currentRow.payload.activeModelBinding, candidateModelBinding())) {
      throw new Error('Candidate G refresh cannot change the exact active model binding');
    }
    const activeSourceDeploymentId = assertOperationalSourceSeal({
      currentRow,
      sourceManifest,
      sourceVerification,
      model: 'candidate-g',
      sourceHead: plan.sourceHead,
      requestedManifest,
      expectedImplementationClosureSha256: plan.sourceImplementationClosureSha256,
      label: 'Candidate G refresh source',
    });
    assertOperationalPublicManifest(requestedManifest, {
      binding: candidateModelBinding(),
      assertBinding: assertCandidateBinding,
      datasetId: plan.datasetId,
      productionReferenceAt: plan.productionReferenceAt,
      label: 'Candidate G refresh requested manifest',
    });
    const document = {
      ...currentRow.payload,
      status: RAVSCORE_OPERATIONAL_STATUSES.candidatePending,
      transitionKind: RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh,
      sourceHead: plan.sourceHead,
      datasetId: plan.datasetId,
      productionReferenceAt: plan.productionReferenceAt,
      rollbackId: plan.rollbackId,
      activeModelBinding: candidateModelBinding(),
      requestedModelBinding: candidateModelBinding(),
      sourceModelBinding: candidateModelBinding(),
      candidatePlanSha256: plan.planSha256,
      candidateFullSha256: plan.candidateFullSha256,
      privateBundleContentSha256: plan.privateBundleContentSha256,
      publicManifestSha256: sha256(sourceManifest),
      sourcePublicManifestSha256: sha256(sourceManifest),
      requestedPublicManifestSha256: sha256(requestedManifest),
      sourceImplementationClosureSha256: plan.sourceImplementationClosureSha256,
      requestedImplementationClosureSha256: plan.requestedImplementationClosureSha256,
      sourceDeploymentId: String(activeSourceDeploymentId ?? sourceDeploymentId),
      deploymentId: String(deploymentId ?? 'pages-target-not-requested'),
      automaticActivationAllowed: false,
      schedulerActivationAllowed: false,
      calibrationEligible: false,
      requestedAt: new Date(now).toISOString(),
      activatedAt: currentRow.payload.activatedAt,
      failureCode: null,
      returnPlanSha256: null,
      integratedReadinessSha256: null,
      integratedPublicAuditSha256: null,
      integratedManifestSha256: null,
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion: Number(expectedVersion) + 1 });
  }
  if (currentRow.payload.status !== RAVSCORE_OPERATIONAL_STATUSES.candidatePending
    || currentRow.payload.transitionKind !== RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh
    || currentRow.payload.candidatePlanSha256 !== plan.planSha256
    || currentRow.payload.sourceHead !== plan.sourceHead) {
    throw new Error('Candidate G refresh completion differs from its sealed PENDING transition');
  }
  if (action === 'refresh-abort') {
    if (!SAFE_ID_PATTERN.test(String(failureCode ?? ''))) {
      throw new Error('Candidate G refresh abort requires a bounded failure code');
    }
    assertOperationalPendingSourceRestore({
      currentRow,
      sourceManifest,
      sourceVerification,
      model: 'candidate-g',
      sourceHead: plan.sourceHead,
      label: 'Candidate G refresh restored source',
    });
    assertOperationalTerminalSourceEvidence(terminalEvidence, currentRow, sourceManifest);
    const document = {
      ...currentRow.payload,
      status: RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
      datasetId: sourceManifest.datasetId,
      productionReferenceAt: sourceManifest.productionReferenceAt,
      publicManifestSha256: sha256(sourceManifest),
      deploymentId: currentRow.payload.sourceDeploymentId,
      calibrationEligible: false,
      activatedAt: new Date(now).toISOString(),
      failureCode: String(failureCode),
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion: Number(expectedVersion) + 1 });
  }
  if (action !== 'refresh-complete') {
    throw new Error('Unknown Candidate G refresh transition');
  }
  assertOperationalPublicManifest(requestedManifest, {
    binding: candidateModelBinding(),
    assertBinding: assertCandidateBinding,
    datasetId: plan.datasetId,
    productionReferenceAt: plan.productionReferenceAt,
    label: 'Candidate G refreshed manifest',
  });
  if (sha256(requestedManifest) !== currentRow.payload.requestedPublicManifestSha256
    || !SAFE_ID_PATTERN.test(String(deploymentId ?? ''))) {
    throw new Error('Candidate G refresh differs from its sealed deployed target');
  }
  assertOperationalPagesVerification(publicVerification, {
    model: 'candidate-g',
    binding: candidateModelBinding(),
    sourceHead: plan.sourceHead,
    publicManifest: requestedManifest,
    expectedImplementationClosureSha256:
      currentRow.payload.requestedImplementationClosureSha256,
    assertBinding: assertCandidateBinding,
  });
  const document = {
    ...currentRow.payload,
    status: RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
    publicManifestSha256: sha256(requestedManifest),
    deploymentId: String(deploymentId),
    calibrationEligible: false,
    activatedAt: new Date(now).toISOString(),
    failureCode: null,
  };
  assertOperationalActivationDocument(document);
  return Object.freeze({ document, nextVersion: Number(expectedVersion) + 1 });
}

// An ordinary integrated weather release does not switch models or profiles,
// but it still changes the exact public dataset/deployment identity. This
// verified CAS keeps ACTIVE aligned with Pages. If a runner stops after Pages,
// the next run can repeat this idempotently from the fully verified public
// artifact; no model-transition status or fifth transition kind is invented.
export function operationalIntegratedMaintenanceTransition({
  currentRow,
  currentProfileRow,
  expectedVersion,
  sourceHead,
  publicManifest,
  publicAudit,
  publicVerification,
  readiness,
  deploymentId,
  now = new Date().toISOString(),
} = {}) {
  if (!currentRow || !Number.isSafeInteger(Number(expectedVersion))
    || Number(expectedVersion) < 1
    || Number(currentRow.version) !== Number(expectedVersion)) {
    throw new Error('Integrated maintenance compare-and-swap version mismatch');
  }
  const resolved = resolveOperationalRavScoreModel(currentRow, {
    profileRow: currentProfileRow,
  });
  if (resolved.model !== 'integrated' || resolved.pending) {
    throw new Error('Integrated maintenance may only reseal an ACTIVE integrated release');
  }
  if (!sameBinding(currentRow.payload.activeModelBinding, integratedModelBinding())) {
    throw new Error('Integrated maintenance cannot change the exact active model binding');
  }
  assertIntegratedReadiness(readiness, sourceHead);
  assertIntegratedPublicEvidence(publicManifest, publicAudit, { sourceHead });
  assertOperationalPagesVerification(publicVerification, {
    model: 'integrated',
    binding: integratedModelBinding(),
    sourceHead,
    publicManifest,
    expectedImplementationClosureSha256:
      readiness.publicImplementationClosureSha256 ?? null,
    assertBinding: assertIntegratedBinding,
  });
  if (!SAFE_ID_PATTERN.test(String(deploymentId ?? ''))) {
    throw new Error('Integrated maintenance requires a bounded verified deployment id');
  }
  const publicManifestSha256 = sha256(publicManifest);
  const maintenanceSeal = {
    kind: 'RAVSCORE_INTEGRATED_ACTIVE_PUBLIC_RESEAL',
    sourceHead,
    modelBinding: integratedModelBinding(),
    publicManifestSha256,
    integratedReadinessSha256: sha256(readiness),
    integratedPublicAuditSha256: sha256(publicAudit),
  };
  const document = {
    ...currentRow.payload,
    sourceHead,
    datasetId: publicManifest.datasetId,
    productionReferenceAt: publicManifest.productionReferenceAt,
    activeModelBinding: integratedModelBinding(),
    requestedModelBinding: integratedModelBinding(),
    sourceModelBinding: integratedModelBinding(),
    publicManifestSha256,
    sourcePublicManifestSha256: publicManifestSha256,
    requestedPublicManifestSha256: publicManifestSha256,
    sourceImplementationClosureSha256: publicVerification.implementationClosureSha256,
    requestedImplementationClosureSha256: publicVerification.implementationClosureSha256,
    sourceDeploymentId: String(deploymentId),
    deploymentId: String(deploymentId),
    calibrationEligible: true,
    requestedAt: new Date(now).toISOString(),
    activatedAt: new Date(now).toISOString(),
    failureCode: null,
    returnPlanSha256: sha256(maintenanceSeal),
    integratedReadinessSha256: maintenanceSeal.integratedReadinessSha256,
    integratedPublicAuditSha256: maintenanceSeal.integratedPublicAuditSha256,
    integratedManifestSha256: publicManifestSha256,
  };
  assertOperationalActivationDocument(document);
  return Object.freeze({ document, nextVersion: Number(expectedVersion) + 1 });
}

export function operationalIntegratedReturnTransition({
  action,
  currentRow,
  currentProfileRow = null,
  expectedVersion,
  plan,
  readiness = null,
  publicManifest = null,
  publicAudit = null,
  publicVerification = null,
  sourceManifest = null,
  sourceAttestation = null,
  sourceVerification = null,
  sourceDeploymentId = 'public-source-observed',
  deploymentId = null,
  failureCode = null,
  terminalEvidence = null,
  now = new Date().toISOString(),
} = {}) {
  if (!Number.isSafeInteger(Number(expectedVersion)) || Number(expectedVersion) < 0
    || Number(currentRow?.version ?? 0) !== Number(expectedVersion)) {
    throw new Error('Operational integrated return compare-and-swap version mismatch');
  }
  if (currentRow !== null) assertOperationalActivationDocument(currentRow.payload);
  if (action === 'return-begin') {
    assertIntegratedReturnPlan(plan, {
      expectedSourceHead: plan?.sourceHead,
      expectedCentralVersion: expectedVersion,
      currentRow,
      currentProfileRow,
      readiness,
      publicManifest,
      publicAudit,
    });
    assertOperationalPublicManifest(publicManifest, {
      binding: integratedModelBinding(),
      assertBinding: assertIntegratedBinding,
      datasetId: plan.datasetId,
      productionReferenceAt: plan.productionReferenceAt,
      label: 'Integrated transition requested manifest',
    });
    if (!SAFE_ID_PATTERN.test(String(sourceDeploymentId ?? ''))) {
      throw new Error('Integrated transition source deployment id is invalid');
    }
    const initialCutover = plan.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover;
    const initialRetry = currentRow !== null
      && resolveOperationalRavScoreModel(currentRow, {
        profileRow: currentProfileRow,
      }).initialCutoverRequired === true;
    if (initialCutover !== (currentRow === null || initialRetry)) {
      throw new Error('Integrated transition source state does not match its sealed kind');
    }
    const legacyBootstrapSource = initialCutover;
    const activeSourceDeploymentId = legacyBootstrapSource
      ? assertLegacyOperationalSourceSeal({
        currentRow,
        sourceManifest,
        sourceAttestation,
        sourceVerification,
        sourceHead: plan.sourceHead,
        requestedManifest: publicManifest,
        expectedImplementationClosureSha256: plan.sourceImplementationClosureSha256,
        label: 'Integrated transition legacy Candidate G source',
      })
      : assertOperationalSourceSeal({
        currentRow,
        sourceManifest,
        sourceVerification,
        model: 'candidate-g',
        sourceHead: plan.sourceHead,
        requestedManifest: publicManifest,
        expectedImplementationClosureSha256: plan.sourceImplementationClosureSha256,
        label: 'Integrated transition Candidate G source',
      });
    const document = {
      ...(currentRow?.payload ?? {
        schemaVersion: RAVSCORE_OPERATIONAL_ACTIVATION_SCHEMA,
        rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
        candidatePlanSha256: null,
        candidateFullSha256: null,
        privateBundleContentSha256: null,
        automaticActivationAllowed: false,
        schedulerActivationAllowed: false,
      }),
      status: RAVSCORE_OPERATIONAL_STATUSES.integratedPending,
      transitionKind: plan.transitionKind,
      sourceHead: plan.sourceHead,
      datasetId: plan.datasetId,
      productionReferenceAt: plan.productionReferenceAt,
      activeModelBinding: structuredClone(plan.sourceModelBinding),
      requestedModelBinding: integratedModelBinding(),
      sourceModelBinding: structuredClone(plan.sourceModelBinding),
      candidatePlanSha256: initialCutover ? null : currentRow?.payload?.candidatePlanSha256,
      candidateFullSha256: initialCutover ? null : currentRow?.payload?.candidateFullSha256,
      privateBundleContentSha256: initialCutover
        ? null : currentRow?.payload?.privateBundleContentSha256,
      automaticActivationAllowed: false,
      schedulerActivationAllowed: false,
      calibrationEligible: false,
      requestedAt: new Date(now).toISOString(),
      activatedAt: currentRow?.payload?.activatedAt ?? new Date(now).toISOString(),
      failureCode: null,
      publicManifestSha256: sha256(sourceManifest),
      sourcePublicManifestSha256: sha256(sourceManifest),
      requestedPublicManifestSha256: sha256(publicManifest),
      sourceImplementationClosureSha256: plan.sourceImplementationClosureSha256,
      requestedImplementationClosureSha256: plan.requestedImplementationClosureSha256,
      sourceDeploymentId: String(activeSourceDeploymentId ?? sourceDeploymentId),
      deploymentId: String(deploymentId ?? 'pages-target-not-requested'),
      returnPlanSha256: plan.planSha256,
      integratedReadinessSha256: plan.integratedReadinessSha256,
      integratedPublicAuditSha256: plan.integratedPublicAuditSha256,
      integratedManifestSha256: plan.integratedManifestSha256,
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion: Number(expectedVersion) + 1 });
  }
  assertIntegratedReturnPlan(plan, { expectedSourceHead: plan?.sourceHead });
  if (currentRow.payload.status !== RAVSCORE_OPERATIONAL_STATUSES.integratedPending
    || currentRow.payload.returnPlanSha256 !== plan.planSha256
    || currentRow.payload.sourceHead !== plan.sourceHead
    || currentRow.payload.datasetId !== plan.datasetId) {
    throw new Error('Pending integrated return does not match the sealed plan');
  }
  if (action === 'return-complete') {
    assertIntegratedReturnPlan(plan, { readiness, publicManifest, publicAudit });
    assertOperationalPagesVerification(publicVerification, {
      model: 'integrated',
      binding: integratedModelBinding(),
      sourceHead: plan.sourceHead,
      publicManifest,
      expectedImplementationClosureSha256:
        currentRow.payload.requestedImplementationClosureSha256,
      assertBinding: assertIntegratedBinding,
    });
    if (!SAFE_ID_PATTERN.test(String(deploymentId ?? ''))) {
      throw new Error('Integrated return completion requires a bounded verified deployment id');
    }
    if (sha256(publicManifest) !== currentRow.payload.requestedPublicManifestSha256) {
      throw new Error('Integrated deployed manifest differs from the pending requested artifact');
    }
    const document = {
      ...currentRow.payload,
      status: RAVSCORE_OPERATIONAL_STATUSES.integrated,
      activeModelBinding: integratedModelBinding(),
      requestedModelBinding: integratedModelBinding(),
      sourceModelBinding: structuredClone(currentRow.payload.sourceModelBinding),
      publicManifestSha256: sha256(publicManifest),
      deploymentId: String(deploymentId),
      calibrationEligible: true,
      activatedAt: new Date(now).toISOString(),
      failureCode: null,
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({
      document,
      nextVersion: Number(expectedVersion) + 1,
      centralTargetProfile: Object.freeze(structuredClone(readiness.centralProfile)),
    });
  }
  if (action === 'return-abort') {
    if (!SAFE_ID_PATTERN.test(String(failureCode ?? ''))) {
      throw new Error('Integrated return abort requires a bounded non-sensitive failure code');
    }
    const legacyBootstrapSource = currentRow.payload.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover;
    if (legacyBootstrapSource) {
      assertLegacyOperationalPendingSourceRestore({
        currentRow,
        sourceManifest,
        sourceAttestation,
        sourceVerification,
        sourceHead: plan.sourceHead,
        label: 'Integrated return restored legacy Candidate G source',
      });
    } else {
      assertOperationalPendingSourceRestore({
        currentRow,
        sourceManifest,
        sourceVerification,
        model: 'candidate-g',
        sourceHead: plan.sourceHead,
        label: 'Integrated return restored Candidate G source',
      });
    }
    assertOperationalTerminalSourceEvidence(terminalEvidence, currentRow, sourceManifest);
    const document = {
      ...currentRow.payload,
      status: RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
      activeModelBinding: structuredClone(currentRow.payload.sourceModelBinding),
      requestedModelBinding: integratedModelBinding(),
      sourceModelBinding: structuredClone(currentRow.payload.sourceModelBinding),
      datasetId: sourceManifest.datasetId,
      productionReferenceAt: sourceManifest.productionReferenceAt,
      calibrationEligible: false,
      failureCode: String(failureCode),
      publicManifestSha256: sha256(sourceManifest),
      deploymentId: currentRow.payload.sourceDeploymentId,
    };
    assertOperationalActivationDocument(document);
    return Object.freeze({ document, nextVersion: Number(expectedVersion) + 1 });
  }
  throw new Error('Unknown operational integrated return transition');
}

export function operationalPendingReconciliationClassification({
  currentRow,
  publicManifest,
} = {}) {
  if (!currentRow || !Number.isSafeInteger(Number(currentRow.version))
    || Number(currentRow.version) < 1) {
    throw new Error('Pending reconciliation requires an exact central version');
  }
  assertOperationalActivationDocument(currentRow.payload, {
    allowSealedHistoricalBindings: true,
  });
  if (![RAVSCORE_OPERATIONAL_STATUSES.candidatePending,
    RAVSCORE_OPERATIONAL_STATUSES.integratedPending].includes(currentRow.payload.status)) {
    throw new Error('Pending reconciliation may only inspect a PENDING transition');
  }
  const observedSha256 = sha256(publicManifest);
  if (observedSha256 === currentRow.payload.requestedPublicManifestSha256) {
    const model = sealedBindingKind(currentRow.payload.requestedModelBinding);
    assertOperationalPublicManifest(publicManifest, {
      binding: currentRow.payload.requestedModelBinding,
      datasetId: currentRow.payload.datasetId,
      productionReferenceAt: currentRow.payload.productionReferenceAt,
      label: 'Observed requested reconciliation manifest',
    });
    return Object.freeze({
      action: 'complete',
      model,
      observedSha256,
      centralVersion: Number(currentRow.version),
    });
  }
  if (observedSha256 === currentRow.payload.sourcePublicManifestSha256) {
    const model = sealedBindingKind(currentRow.payload.sourceModelBinding);
    if (currentRow.payload.transitionKind
      === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover) {
      assertLegacyCandidateGManifest(publicManifest,
        'Observed legacy Candidate G reconciliation source');
    } else {
      assertOperationalPublicManifest(publicManifest, {
        binding: currentRow.payload.sourceModelBinding,
        label: 'Observed source reconciliation manifest',
      });
    }
    return Object.freeze({
      action: 'wait',
      model,
      observedSha256,
      centralVersion: Number(currentRow.version),
    });
  }
  return Object.freeze({
    action: 'third',
    model: null,
    observedSha256,
    centralVersion: Number(currentRow.version),
  });
}

export function operationalPendingReconciliationStabilization({
  currentRow,
  observations: observationEvidence,
} = {}) {
  if (!Array.isArray(observationEvidence) || observationEvidence.length < 2
    || observationEvidence.length > 12) {
    throw new Error('Pending reconciliation requires two to twelve bounded observations');
  }
  const seenNonces = new Set();
  let previousObservedAt = Number.NEGATIVE_INFINITY;
  const classified = observationEvidence.map((observation, index) => {
    if (!exactKeys(observation, ['manifest', 'observationNonce', 'observedAt'])
      || !SAFE_ID_PATTERN.test(String(observation.observationNonce ?? ''))
      || seenNonces.has(observation.observationNonce)
      || !canonicalTime(observation.observedAt)
      || Date.parse(observation.observedAt) <= previousObservedAt
      || (index > 0 && Date.parse(observation.observedAt) - previousObservedAt < 1_000)) {
      throw new Error('Pending reconciliation observations require distinct nonces and ordered timestamps');
    }
    seenNonces.add(observation.observationNonce);
    previousObservedAt = Date.parse(observation.observedAt);
    return operationalPendingReconciliationClassification({
      currentRow,
      publicManifest: observation.manifest,
    });
  });
  if (classified.some(item => item.action === 'third')) {
    return Object.freeze({
      action: 'third',
      model: null,
      centralVersion: Number(currentRow.version),
      observationCount: classified.length,
    });
  }
  const firstComplete = classified.findIndex(item => item.action === 'complete');
  if (firstComplete >= 0) {
    const target = classified[firstComplete];
    const targetObservations = classified.slice(firstComplete);
    const reversed = targetObservations
      .some(item => item.action !== 'complete'
        || item.observedSha256 !== target.observedSha256);
    const stabilized = !reversed && targetObservations.length >= 2;
    return Object.freeze({
      action: reversed ? 'third' : stabilized ? 'complete' : 'wait',
      model: reversed ? null : target.model,
      centralVersion: Number(currentRow.version),
      observationCount: classified.length,
    });
  }
  return Object.freeze({
    action: 'wait',
    model: classified[0].model,
    centralVersion: Number(currentRow.version),
    observationCount: classified.length,
  });
}

export function operationalPendingReconciliationTransition({
  currentRow,
  expectedVersion,
  publicManifest,
  observations,
  publicVerification = null,
  readiness = null,
  publicAudit = null,
  sourceAttestation = null,
  terminalEvidence = null,
  failureCode = null,
  deploymentId = null,
  now = new Date().toISOString(),
} = {}) {
  if (!Number.isSafeInteger(Number(expectedVersion)) || Number(expectedVersion) < 1
    || Number(currentRow?.version) !== Number(expectedVersion)) {
    throw new Error('Pending reconciliation compare-and-swap version mismatch');
  }
  const stabilization = operationalPendingReconciliationStabilization({
    currentRow,
    observations,
  });
  const finalObservation = observations.at(-1);
  if (sha256(finalObservation.manifest) !== sha256(publicManifest)) {
    throw new Error('Pending reconciliation final manifest differs from stabilized evidence');
  }
  const classification = operationalPendingReconciliationClassification({
    currentRow,
    publicManifest,
  });
  if (stabilization.action !== classification.action
    || stabilization.model !== classification.model) {
    throw new Error('Pending reconciliation is not stably observed at the final endpoint');
  }
  if (classification.action === 'wait' && terminalEvidence !== null) {
    if (!SAFE_ID_PATTERN.test(String(failureCode ?? ''))) {
      throw new Error('Historical PENDING source abort requires a bounded failure code');
    }
    const sourceBinding = currentRow.payload.sourceModelBinding;
    if (classification.model === 'legacy-candidate-g') {
      assertLegacyOperationalPendingSourceRestore({
        currentRow,
        sourceManifest: publicManifest,
        sourceAttestation,
        sourceVerification: publicVerification,
        sourceHead: currentRow.payload.sourceHead,
        label: 'Historical PENDING legacy source restore',
      });
    } else {
      assertOperationalPublicManifest(publicManifest, {
        binding: sourceBinding,
        label: 'Historical PENDING source restore',
      });
      assertOperationalPagesVerification(publicVerification, {
        model: classification.model,
        binding: sourceBinding,
        sourceHead: currentRow.payload.sourceHead,
        publicManifest,
        expectedImplementationClosureSha256:
          currentRow.payload.sourceImplementationClosureSha256,
      });
      if (classification.observedSha256 !== currentRow.payload.sourcePublicManifestSha256
        || classification.observedSha256 === currentRow.payload.requestedPublicManifestSha256) {
        throw new Error('Historical PENDING source restore differs from its sealed source endpoint');
      }
    }
    assertOperationalTerminalSourceEvidence(terminalEvidence, currentRow, publicManifest);
    const integratedSource = classification.model === 'integrated';
    const document = {
      ...currentRow.payload,
      status: integratedSource
        ? RAVSCORE_OPERATIONAL_STATUSES.integrated
        : RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
      activeModelBinding: structuredClone(sourceBinding),
      sourceModelBinding: structuredClone(sourceBinding),
      datasetId: publicManifest.datasetId,
      productionReferenceAt: publicManifest.productionReferenceAt,
      publicManifestSha256: classification.observedSha256,
      deploymentId: currentRow.payload.sourceDeploymentId,
      calibrationEligible: integratedSource,
      activatedAt: new Date(now).toISOString(),
      failureCode: String(failureCode),
    };
    assertOperationalActivationDocument(document, {
      allowSealedHistoricalBindings: true,
    });
    return Object.freeze({
      document,
      nextVersion: Number(expectedVersion) + 1,
      reconciliation: Object.freeze({ ...classification, action: 'abort-source' }),
      centralTargetProfile: null,
    });
  }
  if (classification.action !== 'complete') {
    throw new Error(`Pending reconciliation remains fail-closed (${classification.action}); no CAS is permitted`);
  }
  const integrated = classification.model === 'integrated';
  const binding = currentRow.payload.requestedModelBinding;
  assertOperationalPagesVerification(publicVerification, {
    model: classification.model,
    binding,
    sourceHead: currentRow.payload.sourceHead,
    publicManifest,
    expectedImplementationClosureSha256:
      currentRow.payload.requestedImplementationClosureSha256,
  });
  if (integrated) {
    assertSealedIntegratedReadiness(readiness, currentRow.payload);
    assertSealedIntegratedPublicAudit(publicAudit, currentRow.payload);
  }
  if (!SAFE_ID_PATTERN.test(String(deploymentId ?? ''))) {
    throw new Error('Pending completion requires a bounded verified deployment id');
  }
  const document = {
    ...currentRow.payload,
    status: integrated
      ? RAVSCORE_OPERATIONAL_STATUSES.integrated
      : RAVSCORE_OPERATIONAL_STATUSES.candidateActive,
    activeModelBinding: structuredClone(binding),
    publicManifestSha256: classification.observedSha256,
    deploymentId: String(deploymentId),
    calibrationEligible: integrated,
    activatedAt: new Date(now).toISOString(),
    failureCode: null,
  };
  assertOperationalActivationDocument(document, {
    allowSealedHistoricalBindings: true,
  });
  return Object.freeze({
    document,
    nextVersion: Number(expectedVersion) + 1,
    reconciliation: classification,
    centralTargetProfile: integrated
      ? Object.freeze(structuredClone(readiness.centralProfile)) : null,
  });
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive:true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { flag:'wx', mode:0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force:true }).catch(() => {});
    throw error;
  }
}

function cliOptions(argv) {
  const options = { command:argv[2] ?? 'read' };
  for (let index = 3; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--') || value === undefined) throw new Error(`Unknown operational option: ${key}`);
    options[key.slice(2)] = value;
    index += 1;
  }
  return options;
}

async function requestForEnvironment() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Operational RavScore CAS requires Supabase service credentials');
  return Object.freeze({
    documents: createSupabaseAdminRequester({
      endpoint:`${url}/rest/v1/admin_documents`,
      key,
    }),
    atomicCas: createSupabaseAdminRequester({
      endpoint:`${url}/rest/v1/rpc/ravradar_ravscore_operational_cas`,
      key,
    }),
  });
}

async function checkedIntegratedReadinessForEnvironment(
  sourceHead,
  publicImplementationClosureSha256,
) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
    || PUBLIC_CONFIG.supabasePublishableKey;
  if (!url || !serviceRoleKey || !publishableKey) {
    throw new Error('Integrated return readiness requires exact Supabase credentials');
  }
  return checkIntegratedCutoverReadiness({
    sourceHead,
    publicImplementationClosureSha256,
    url,
    serviceRoleKey,
    publishableKey,
  });
}

async function readJsonOption(options, name, label) {
  if (!options[name]) throw new Error(`${label} path is required`);
  try {
    return JSON.parse(await fs.readFile(options[name], 'utf8'));
  } catch {
    throw new Error(`${label} cannot be parsed`);
  }
}

async function readCentralRows(request) {
  const rows = await request(
    `?select=document_key,payload,version&document_key=in.(${RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY},${RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY})`,
    {},
    'atomisk RavScore operation/profil-læsning',
  );
  if (!Array.isArray(rows) || rows.length > 2) {
    throw new Error('Operational RavScore operation/profile read is ambiguous');
  }
  const byKey = new Map();
  for (const row of rows) {
    if (![RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY,
      RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY].includes(row?.document_key)
      || byKey.has(row.document_key)
      || !Number.isSafeInteger(Number(row.version))
      || Number(row.version) < 1) {
      throw new Error('Operational RavScore operation/profile read is malformed');
    }
    byKey.set(row.document_key, row);
  }
  const profileRow = byKey.get(RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY) ?? null;
  if (profileRow === null) throw new Error('Central RavScore profile is missing');
  return Object.freeze({
    operationalRow: byKey.get(RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY) ?? null,
    profileRow,
  });
}

function transitionPreservesSourceProfile(document) {
  const pending = [RAVSCORE_OPERATIONAL_STATUSES.candidatePending,
    RAVSCORE_OPERATIONAL_STATUSES.integratedPending].includes(document.status);
  const sourceReconciled = document.failureCode !== null
    && document.publicManifestSha256 === document.sourcePublicManifestSha256;
  return pending || sourceReconciled;
}

export function operationalCentralProfileForTransition({
  transition,
  currentProfile,
  integratedProfile,
} = {}) {
  assertOperationalActivationDocument(transition?.document, {
    allowSealedHistoricalBindings: true,
  });
  assertIntegratedRavScoreSelection(integratedProfile,
    'Local integrated RavScore CAS profile');
  const targetModel = sealedBindingKind(transition.document.activeModelBinding);
  if (transitionPreservesSourceProfile(transition.document)) {
    return currentProfile;
  }
  return exactProfileForModel(
    targetModel,
    integratedProfile,
    transition.document.activeModelBinding,
    {
      sealedTargetProfile: transition.centralTargetProfile ?? null,
      allowSealedHistoricalBinding: Boolean(transition.reconciliation),
    },
  );
}

async function writeCentralCas(request, currentRows, transition, integratedProfile) {
  const currentRow = currentRows.operationalRow;
  const currentProfileRow = currentRows.profileRow;
  const preservesSource = transitionPreservesSourceProfile(transition.document);
  const profilePayload = operationalCentralProfileForTransition({
    transition,
    currentProfile: currentProfileRow.payload,
    integratedProfile,
  });
  const response = await request('', {
    method:'POST',
    body:JSON.stringify({
      p_expected_operational_version:Number(currentRow?.version ?? 0),
      p_expected_profile_version:Number(currentProfileRow.version),
      p_operational_payload:transition.document,
      p_profile_payload:profilePayload,
    }),
  }, 'atomisk RavScore operation/profil-CAS');
  const result = Array.isArray(response) && response.length === 1 ? response[0] : response;
  const profileChanged = sha256(profilePayload) !== sha256(currentProfileRow.payload);
  const expectedProfileVersion = Number(currentProfileRow.version) + (profileChanged ? 1 : 0);
  if (!result || Array.isArray(result)
    || Number(result.operationalVersion) !== transition.nextVersion
    || sha256(result.operationalPayload) !== sha256(transition.document)
    || Number(result.profileVersion) !== expectedProfileVersion
    || sha256(result.profilePayload) !== sha256(profilePayload)) {
    throw new Error('Atomic RavScore operation/profile compare-and-swap lost a concurrent update');
  }
  if (preservesSource) {
    if (Number(result.profileVersion) !== Number(currentProfileRow.version)
      || sha256(result.profilePayload) !== sha256(currentProfileRow.payload)) {
      throw new Error('PENDING/source reconciliation changed the preserved central profile');
    }
  } else {
    assertProfileRowForSealedBinding({
      version: result.profileVersion,
      payload: result.profilePayload,
    }, transition.document.activeModelBinding);
  }
  return Object.freeze({
    operational: Object.freeze({
      version:Number(result.operationalVersion),
      payload:result.operationalPayload,
    }),
    profile: Object.freeze({
      version:Number(result.profileVersion),
      payload:result.profilePayload,
    }),
  });
}

async function main() {
  const options = cliOptions(process.argv);
  const request = await requestForEnvironment();
  const currentRows = await readCentralRows(request.documents);
  const { operationalRow:currentRow, profileRow:currentProfileRow } = currentRows;
  if (options.command === 'read') {
    const resolved = resolveOperationalRavScoreModel(currentRow, {
      profileRow: currentProfileRow,
      allowPending: true,
    });
    if (options.output) await atomicWriteJson(options.output, resolved);
    console.log(`Operational RavScore state read: ${resolved.status} version ${resolved.centralVersion}.`);
    return;
  }
  if (options.command === 'classify-pending') {
    const publicManifest = await readJsonOption(options, 'manifest',
      'Observed public reconciliation manifest');
    const classification = operationalPendingReconciliationClassification({
      currentRow,
      publicManifest,
    });
    if (options.output) await atomicWriteJson(options.output, classification);
    console.log(`Operational PENDING classified as ${classification.action} for ${classification.model}.`);
    return;
  }

  const candidateRefresh = ['refresh-begin', 'refresh-complete', 'refresh-abort']
    .includes(options.command);
  const allowedEvents = ['schedule', 'push', 'workflow_dispatch'];
  if (process.env.GITHUB_REF !== 'refs/heads/main'
    || !allowedEvents.includes(process.env.GITHUB_EVENT_NAME)
    || !HEAD_PATTERN.test(String(process.env.GITHUB_SHA ?? ''))) {
    throw new Error('Only exact-main production workflows may mutate operational RavScore activation');
  }
  if (options.command === 'prepare-integrated-return') {
    const [publicManifest, publicAudit, readiness] = await Promise.all([
      readJsonOption(options, 'manifest', 'Integrated return public manifest'),
      readJsonOption(options, 'audit', 'Integrated return public audit'),
      checkedIntegratedReadinessForEnvironment(
        process.env.GITHUB_SHA,
        options['requested-implementation-closure-sha256'],
      ),
    ]);
    const plan = prepareIntegratedOperationalReturn({
      currentRow,
      currentProfileRow,
      sourceHead: process.env.GITHUB_SHA,
      publicManifest,
      publicAudit,
      readiness,
      sourceImplementationClosureSha256:
        options['source-implementation-closure-sha256'],
      requestedImplementationClosureSha256:
        options['requested-implementation-closure-sha256'],
      eventName: process.env.GITHUB_EVENT_NAME,
      ref: process.env.GITHUB_REF,
      githubSha: process.env.GITHUB_SHA,
      confirmation: process.env.RAVRADAR_INTEGRATED_RETURN_CONFIRMATION,
    });
    if (!options.output) throw new Error('Integrated return plan output is required');
    await atomicWriteJson(options.output, plan);
    console.log(`Integrated operational return plan sealed for central version ${plan.centralExpectedVersion}; private payload logged: false.`);
    return;
  }

  let transition;
  if (options.command === 'reconcile') {
    const [publicManifest, observations] = await Promise.all([
      readJsonOption(options, 'manifest', 'Observed public reconciliation manifest'),
      readJsonOption(options, 'observations', 'Stabilized public reconciliation observations'),
    ]);
    const stabilization = operationalPendingReconciliationStabilization({
      currentRow,
      observations,
    });
    const sourceAbort = stabilization.action === 'wait' && options['terminal-evidence'];
    const publicVerification = stabilization.action === 'complete' || sourceAbort
      ? await readJsonOption(options, 'verification', 'Public reconciliation verification')
      : null;
    const readiness = stabilization.action === 'complete' && stabilization.model === 'integrated'
      ? await readJsonOption(options, 'readiness', 'Sealed integrated reconciliation readiness')
      : null;
    const publicAudit = stabilization.action === 'complete' && stabilization.model === 'integrated'
      ? await readJsonOption(options, 'audit', 'Sealed integrated reconciliation public audit')
      : null;
    const sourceAttestation = sourceAbort && stabilization.model === 'legacy-candidate-g'
      ? await readJsonOption(options, 'source-attestation',
        'Sealed legacy source reconciliation attestation')
      : null;
    const terminalEvidence = sourceAbort
      ? await readJsonOption(options, 'terminal-evidence',
        'Historical PENDING terminal Pages evidence')
      : null;
    transition = operationalPendingReconciliationTransition({
      currentRow,
      expectedVersion:Number(options['expected-version']),
      publicManifest,
      observations,
      publicVerification,
      readiness,
      publicAudit,
      sourceAttestation,
      terminalEvidence,
      failureCode: options['failure-code'] ?? null,
      deploymentId:options['deployment-id'] ?? null,
    });
  } else if (options.command === 'integrated-maintenance') {
    const [publicManifest, publicAudit, publicVerification, readiness] = await Promise.all([
      readJsonOption(options, 'manifest', 'Integrated maintenance public manifest'),
      readJsonOption(options, 'audit', 'Integrated maintenance public audit'),
      readJsonOption(options, 'verification', 'Integrated maintenance public verification'),
      checkedIntegratedReadinessForEnvironment(
        process.env.GITHUB_SHA,
        options['requested-implementation-closure-sha256'],
      ),
    ]);
    transition = operationalIntegratedMaintenanceTransition({
      currentRow,
      currentProfileRow,
      expectedVersion: Number(options['expected-version']),
      sourceHead: process.env.GITHUB_SHA,
      publicManifest,
      publicAudit,
      publicVerification,
      readiness,
      deploymentId: options['deployment-id'] ?? null,
    });
  } else {
    const plan = await readJsonOption(options, 'plan', 'Operational RavScore plan');
    if (candidateRefresh) {
    assertCandidateRefreshPlan(plan, {
      expectedSourceHead: process.env.GITHUB_SHA,
      expectedCentralVersion: options.command === 'refresh-begin'
        ? Number(options['expected-version'])
        : Number(options['expected-version']) - 1,
    });
    const requestedManifest = await readJsonOption(options, 'manifest',
      'Candidate G refreshed public manifest');
    const sourceManifest = options.command !== 'refresh-complete'
      ? await readJsonOption(options, 'source-manifest', 'Candidate G refresh source manifest')
      : null;
    const sourceVerification = options.command !== 'refresh-complete'
      ? await readJsonOption(options, 'source-verification',
        'Candidate G refresh source verification')
      : null;
    const publicVerification = options.command === 'refresh-complete'
      ? await readJsonOption(options, 'verification', 'Candidate G public deployment verification')
      : null;
    transition = operationalCandidateRefreshTransition({
      action: options.command,
      currentRow,
      currentProfileRow,
      expectedVersion: Number(options['expected-version']),
      plan,
      sourceManifest,
      sourceVerification,
      requestedManifest,
      publicVerification,
      sourceDeploymentId: options['source-deployment-id'] ?? 'public-source-observed',
      deploymentId: options['deployment-id'] ?? null,
      failureCode: options['failure-code'] ?? null,
      terminalEvidence: options.command === 'refresh-abort'
        ? await readJsonOption(options, 'terminal-evidence',
          'Candidate G refresh terminal Pages evidence')
        : null,
    });
    } else if (['return-begin', 'return-complete', 'return-abort'].includes(options.command)) {
      assertIntegratedReturnPlan(plan, { expectedSourceHead: process.env.GITHUB_SHA });
      const initialCutover = plan.transitionKind
        === RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover;
      if (process.env.GITHUB_EVENT_NAME !== (initialCutover ? 'push' : 'workflow_dispatch')) {
        throw new Error(initialCutover
          ? 'Initial integrated cutover may only run on its exact main push'
          : 'Integrated return may only run after explicit manual dispatch');
      }
      let readiness = null;
      let publicManifest = null;
      let publicAudit = null;
      let publicVerification = null;
      let sourceManifest = null;
      let sourceAttestation = null;
      let sourceVerification = null;
      if (options.command !== 'return-abort') {
        [publicManifest, publicAudit, readiness] = await Promise.all([
          readJsonOption(options, 'manifest', 'Integrated return public manifest'),
          readJsonOption(options, 'audit', 'Integrated return public audit'),
          checkedIntegratedReadinessForEnvironment(
            process.env.GITHUB_SHA,
            plan.requestedImplementationClosureSha256,
          ),
        ]);
        if (options.command !== 'return-begin') {
          publicVerification = await readJsonOption(options, 'verification',
            'Integrated public deployment verification');
        }
      }
      if (options.command === 'return-begin' || options.command === 'return-abort') {
        [sourceManifest, sourceVerification] = await Promise.all([
          readJsonOption(options, 'source-manifest',
            'Integrated transition source public manifest'),
          readJsonOption(options, 'source-verification',
            'Integrated transition source public verification'),
        ]);
        if (initialCutover) {
          sourceAttestation = await readJsonOption(options, 'source-attestation',
            'Legacy Candidate G source attestation');
        }
      }
      transition = operationalIntegratedReturnTransition({
        action: options.command,
        currentRow,
        currentProfileRow,
        expectedVersion: Number(options['expected-version']),
        plan,
        readiness,
        publicManifest,
        publicAudit,
        publicVerification,
        sourceManifest,
        sourceAttestation,
        sourceVerification,
        sourceDeploymentId:options['source-deployment-id'] ?? 'public-source-observed',
        deploymentId: options['deployment-id'] ?? null,
        failureCode: options['failure-code'] ?? null,
        terminalEvidence: options.command === 'return-abort'
          ? await readJsonOption(options, 'terminal-evidence',
            'Integrated return terminal Pages evidence')
          : null,
      });
    } else {
      if (process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') {
        throw new Error('Candidate G activation may only run after explicit manual dispatch');
      }
      assertCandidateActivationPlan(plan, {
        expectedSourceHead:process.env.GITHUB_SHA,
        expectedCentralVersion:options.command === 'begin'
          ? Number(options['expected-version'])
          : null,
      });
      const publicManifest = options.manifest
        ? await readJsonOption(options, 'manifest', 'Candidate G public manifest')
        : null;
      const publicVerification = options.verification
        ? await readJsonOption(options, 'verification', 'Candidate G public deployment verification')
        : null;
      const requiresSourceRestore = options.command === 'begin' || options.command === 'abort';
      const sourceManifest = requiresSourceRestore
        ? await readJsonOption(options, 'source-manifest',
          'Candidate G rollback source public manifest')
        : null;
      const sourceVerification = requiresSourceRestore
        ? await readJsonOption(options, 'source-verification',
          'Candidate G rollback source public verification')
        : null;
      transition = operationalActivationTransition({
        action:options.command,
        currentRow,
        currentProfileRow,
        expectedVersion:Number(options['expected-version']),
        plan,
        publicManifest,
        publicVerification,
        sourceManifest,
        sourceVerification,
        requestedManifest: options.command === 'begin' ? publicManifest : null,
        sourceDeploymentId:options['source-deployment-id'] ?? 'public-source-observed',
        deploymentId:options['deployment-id'] ?? null,
        failureCode:options['failure-code'] ?? null,
        terminalEvidence:options.command === 'abort'
          ? await readJsonOption(options, 'terminal-evidence',
            'Candidate G rollback terminal Pages evidence')
          : null,
      });
    }
  }
  const integratedProfile = JSON.parse(await fs.readFile(
    new URL('../data/admin/ravscore-profile-selection.json', import.meta.url),
    'utf8',
  ));
  const written = await writeCentralCas(
    request.atomicCas,
    currentRows,
    transition,
    integratedProfile,
  );
  if (options.output) await atomicWriteJson(options.output, {
    status:written.operational.payload.status,
    centralVersion:written.operational.version,
    profileVersion:written.profile.version,
    candidatePlanSha256:written.operational.payload.candidatePlanSha256,
  });
  console.log(`Atomic operational/profile RavScore CAS completed: ${written.operational.payload.status} version ${written.operational.version}; profile version ${written.profile.version}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Operational RavScore activation failed');
    process.exitCode = 1;
  });
}
