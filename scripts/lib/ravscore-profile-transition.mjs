import {
  RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_MODEL_CONTRACT_SHA256,
  RAVSCORE_MODEL_ID,
  RAVSCORE_STATE_SCHEMA_VERSION,
} from '../../js/core/ravscore-model-contract.js';
import {
  CANDIDATE_G_ROLLBACK_MODEL_ID,
  PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE,
  PUBLIC_RAVSCORE_PROFILE_SELECTION,
  RAVSCORE_PROFILE_SWITCH_VERSION,
} from '../../js/core/ravscore-public-model.js';
import {
  ravScoreModelBinding as candidateGRollbackModelBinding,
} from '../rollback-assets/ravscore-model-contract.js';

const CANDIDATE_G_SCHEMA_VERSION = '2.0.0';
const CANDIDATE_G_AVAILABILITY_POLICY = 'candidate-g-local-fail-closed';
const LEGACY_CANDIDATE_FIELDS = Object.freeze([
  'schemaVersion', 'sourceVersion', 'switchVersion', 'requestedProfileId',
  'rollbackProfileId', 'candidateProfileId', 'candidateActivationEnabled',
  'prePublicWarmupAccepted', 'automaticActivationAllowed',
  'publicAvailabilityPolicy', 'legacyPublicFallbackAllowed', 'status',
  'activationAuthority', 'evidence',
]);
const OPERATIONAL_PROFILE_FIELDS = Object.freeze([
  'schemaVersion', 'sourceVersion', 'switchVersion', 'requestedProfileId',
  'activeModelId', 'stateSchemaVersion', 'variantId', 'profileId',
  'componentSchemaId', 'explanationSchemaId', 'rankingPolicyId',
  'bestTimePolicyId', 'presentationPolicyId', 'modelContractSha256',
  'modelBundleSha256', 'rollbackModelId', 'runtimeFallbackModelId',
  'modelActivationEnabled', 'automaticActivationAllowed',
  'publicAvailabilityPolicy', 'crossModelRuntimeFallbackAllowed',
  'migrationRequiredAtFirstCutover', 'status', 'activationAuthority', 'evidence',
]);
const LEGACY_EVIDENCE_FIELDS = Object.freeze([
  'freshFinalShadowRunId', 'ownerReviewDecisionId',
]);
const OPERATIONAL_EVIDENCE_FIELDS = Object.freeze([
  'decisionId', 'exactHeadValidationRequired', 'freshProductionValidationRequired',
]);

function exactPlainKeys(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...fields].sort());
}

export function ravScoreReleaseVersion(value) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? ''));
  return match ? match.slice(1).map(Number) : null;
}

export function compareRavScoreReleaseVersions(left, right) {
  const a = ravScoreReleaseVersion(left);
  const b = ravScoreReleaseVersion(right);
  if (!a || !b) throw new Error('RavScore profile sourceVersion is invalid');
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] - b[index];
  }
  return 0;
}

export function isCandidateGOnlySelection(payload) {
  const version = String(payload?.sourceVersion ?? '');
  const evidence = payload?.evidence ?? {};
  const legacy = Boolean(
    ravScoreReleaseVersion(version)
    && exactPlainKeys(payload, LEGACY_CANDIDATE_FIELDS)
    && exactPlainKeys(evidence, LEGACY_EVIDENCE_FIELDS)
    && payload?.schemaVersion === CANDIDATE_G_SCHEMA_VERSION
    && payload?.switchVersion === `RAVSCORE-PROFILE-SWITCH-${version}`
    && payload?.requestedProfileId === CANDIDATE_G_ROLLBACK_MODEL_ID
    && payload?.candidateProfileId === CANDIDATE_G_ROLLBACK_MODEL_ID
    && payload?.rollbackProfileId === null
    && payload?.candidateActivationEnabled === true
    && payload?.prePublicWarmupAccepted === true
    && payload?.automaticActivationAllowed === false
    && payload?.publicAvailabilityPolicy === CANDIDATE_G_AVAILABILITY_POLICY
    && payload?.legacyPublicFallbackAllowed === false
    && String(payload?.status ?? '').startsWith('owner-approved-candidate-g-only-')
    && Boolean(String(payload?.activationAuthority ?? '').trim())
    && Boolean(String(evidence.ownerReviewDecisionId ?? '').trim())
  );
  if (legacy) return true;
  const candidate = candidateGRollbackModelBinding();
  return Boolean(
    ravScoreReleaseVersion(version)
    && exactPlainKeys(payload, OPERATIONAL_PROFILE_FIELDS)
    && exactPlainKeys(evidence, OPERATIONAL_EVIDENCE_FIELDS)
    && payload?.schemaVersion === '3.0.0'
    && payload?.switchVersion === 'RAVSCORE-PROFILE-SWITCH-CANDIDATE-G-ROLLBACK-1.0.0'
    && payload?.requestedProfileId === candidate.modelId
    && payload?.activeModelId === candidate.modelId
    && payload?.stateSchemaVersion === candidate.stateSchemaVersion
    && payload?.variantId === candidate.variantId
    && payload?.profileId === candidate.profileId
    && payload?.componentSchemaId === candidate.componentSchemaId
    && payload?.explanationSchemaId === candidate.explanationSchemaId
    && payload?.rankingPolicyId === candidate.rankingPolicyId
    && payload?.bestTimePolicyId === candidate.bestTimePolicyId
    && payload?.presentationPolicyId === candidate.presentationPolicyId
    && payload?.modelContractSha256 === candidate.modelContractSha256
    && payload?.modelBundleSha256 === candidate.modelBundleSha256
    && payload?.rollbackModelId === RAVSCORE_MODEL_ID
    && payload?.runtimeFallbackModelId === null
    && payload?.modelActivationEnabled === true
    && payload?.automaticActivationAllowed === false
    && payload?.publicAvailabilityPolicy === CANDIDATE_G_AVAILABILITY_POLICY
    && payload?.crossModelRuntimeFallbackAllowed === false
    && payload?.migrationRequiredAtFirstCutover === false
    && payload?.status === 'owner-approved-candidate-g-rollback-only-local-fail-closed'
    && payload?.activationAuthority === 'DEC-0108-manual-candidate-g-rollback'
    && evidence.decisionId === 'DEC-0108'
    && evidence.exactHeadValidationRequired === true
    && evidence.freshProductionValidationRequired === true
  );
}

export function assertIntegratedRavScoreSelection(payload, label = 'RavScore profile') {
  const expected = PUBLIC_RAVSCORE_PROFILE_SELECTION;
  const evidence = payload?.evidence ?? {};
  const valid = Boolean(
    ravScoreReleaseVersion(payload?.sourceVersion)
    && exactPlainKeys(payload, OPERATIONAL_PROFILE_FIELDS)
    && exactPlainKeys(evidence, OPERATIONAL_EVIDENCE_FIELDS)
    && payload?.schemaVersion === expected.schemaVersion
    && payload?.switchVersion === RAVSCORE_PROFILE_SWITCH_VERSION
    && payload?.requestedProfileId === RAVSCORE_MODEL_ID
    && payload?.activeModelId === RAVSCORE_MODEL_ID
    && payload?.stateSchemaVersion === RAVSCORE_STATE_SCHEMA_VERSION
    && payload?.variantId === expected.variantId
    && payload?.profileId === expected.profileId
    && payload?.componentSchemaId === expected.componentSchemaId
    && payload?.explanationSchemaId === expected.explanationSchemaId
    && payload?.rankingPolicyId === expected.rankingPolicyId
    && payload?.bestTimePolicyId === expected.bestTimePolicyId
    && payload?.presentationPolicyId === expected.presentationPolicyId
    && payload?.modelContractSha256 === RAVSCORE_MODEL_CONTRACT_SHA256
    && payload?.modelBundleSha256 === RAVSCORE_MODEL_BUNDLE_SHA256
    && payload?.rollbackModelId === CANDIDATE_G_ROLLBACK_MODEL_ID
    && payload?.runtimeFallbackModelId === null
    && payload?.modelActivationEnabled === true
    && payload?.automaticActivationAllowed === false
    && payload?.publicAvailabilityPolicy === expected.publicAvailabilityPolicy
    && payload?.crossModelRuntimeFallbackAllowed === false
    && payload?.migrationRequiredAtFirstCutover === true
    && String(payload?.status ?? '').startsWith('owner-approved-integrated-model-only-')
    && Boolean(String(payload?.activationAuthority ?? '').trim())
    && evidence.decisionId === PUBLIC_RAVSCORE_ACTIVATION_EVIDENCE.decisionId
    && evidence.exactHeadValidationRequired === true
    && evidence.freshProductionValidationRequired === true
  );
  if (!valid) throw new Error(`${label} is not the complete integrated-model-only contract`);
  return payload;
}

export function ravScoreProfileWriteAction({ local, central }) {
  assertIntegratedRavScoreSelection(local, 'Local RavScore profile');
  if (!central) return Object.freeze({ type: 'INSERT_FIRST_INTEGRATED', expectedVersion: null });
  if (isCandidateGOnlySelection(central)) {
    if (compareRavScoreReleaseVersions(local.sourceVersion, central.sourceVersion) <= 0) {
      throw new Error('Integrated RavScore cutover must be newer than Candidate G');
    }
    return Object.freeze({ type: 'CAS_CANDIDATE_G_CUTOVER', expectedVersion: null });
  }
  assertIntegratedRavScoreSelection(central, 'Central RavScore profile');
  const comparison = compareRavScoreReleaseVersions(local.sourceVersion, central.sourceVersion);
  if (comparison < 0) throw new Error('A newer central integrated RavScore profile must not be overwritten');
  if (comparison === 0) return Object.freeze({ type: 'VERIFY_IDENTICAL', expectedVersion: null });
  return Object.freeze({ type: 'CAS_SAME_MODEL_UPDATE', expectedVersion: null });
}

export function withExpectedAdminVersion(action, centralRow) {
  if (!action?.type?.startsWith('CAS_')) return action;
  const version = Number(centralRow?.version);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new Error('Central RavScore profile lacks a valid CAS version');
  }
  return Object.freeze({ ...action, expectedVersion: version });
}
