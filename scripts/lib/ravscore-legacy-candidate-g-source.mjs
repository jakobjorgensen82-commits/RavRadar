import crypto from 'node:crypto';

export const LEGACY_CANDIDATE_G_RELEASE_VERSION = '4.0.316';
export const LEGACY_CANDIDATE_G_SOURCE_HEAD =
  '49dd4cb454656bdf629e5df760176705e38d2cb0';
export const LEGACY_CANDIDATE_G_SOURCE_TREE =
  '975c3e9432cea7780564ffd56766bc1f0a0a9763';
export const LEGACY_CANDIDATE_G_IMPLEMENTATION_CLOSURE_SHA256 =
  'a366b4a64fc3ccc8f1b94f3fed24b3ce03ea23d906396bc8bea183338c5d2606';
export const LEGACY_CANDIDATE_G_IMPLEMENTATION_FILE_COUNT = 53;
export const LEGACY_CANDIDATE_G_MODEL_ID =
  'RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3';
export const LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION = '2.0.0';
export const LEGACY_CANDIDATE_G_VARIANT_ID =
  'G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED';
export const LEGACY_CANDIDATE_G_PROFILE_ID =
  'current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48';
export const LEGACY_CANDIDATE_G_PROFILE_SWITCH =
  'RAVSCORE-PROFILE-SWITCH-4.0.316';
export const LEGACY_CANDIDATE_G_SOURCE_SCHEMA =
  'ravscore-legacy-candidate-g-public-source-v1';
export const LEGACY_CANDIDATE_G_MANIFEST_SCHEMA = 2;
export const LEGACY_CANDIDATE_G_COMPONENT_SCHEMA_ID =
  'ravscore-components-huntability-transport-mobilisation-candidate-g-v1';
export const LEGACY_CANDIDATE_G_EXPLANATION_SCHEMA_ID =
  'ravscore-explanation-candidate-g-v3';
export const LEGACY_CANDIDATE_G_RANKING_POLICY_ID = 'direction-broad-19-v1';
export const LEGACY_CANDIDATE_G_BEST_TIME_POLICY_ID = 'score-water-tie-earliest-v2';
export const LEGACY_CANDIDATE_G_PRESENTATION_POLICY_ID =
  'score-bands-35-55-75-exceptional90-v1';
export const LEGACY_CANDIDATE_G_ACTIVATION_AUTHORITY =
  'DEC-0072-owner-decision-2026-08-24';
export const LEGACY_CANDIDATE_G_OWNER_REVIEW_DECISION_ID =
  'DEC-0072-CANDIDATE-G-ONLY-LOCAL-AVAILABILITY';

const SOURCE_IDENTITY_FIELDS = Object.freeze([
  'schemaVersion',
  'releaseVersion',
  'sourceHead',
  'sourceTreeId',
  'modelId',
  'stateSchemaVersion',
  'variantId',
  'profileId',
  'profileSwitchVersion',
  'manifestSchemaVersion',
  'sourceContractSha256',
  'sourceBundleSha256',
]);
const LEGACY_CENTRAL_PROFILE_FIELDS = Object.freeze([
  'schemaVersion', 'sourceVersion', 'switchVersion', 'requestedProfileId',
  'rollbackProfileId', 'candidateProfileId', 'candidateActivationEnabled',
  'prePublicWarmupAccepted', 'automaticActivationAllowed',
  'publicAvailabilityPolicy', 'legacyPublicFallbackAllowed', 'status',
  'activationAuthority', 'evidence',
]);
const LEGACY_CENTRAL_EVIDENCE_FIELDS = Object.freeze([
  'freshFinalShadowRunId', 'ownerReviewDecisionId',
]);
const LEGACY_PUBLIC_PROFILE_FIELDS = Object.freeze([
  'schemaVersion', 'switchVersion', 'requestedProfileId', 'activeProfileId',
  'candidateProfileId', 'rollbackProfileId', 'activationState',
  'candidateCoverageReady', 'candidateMemoryReady', 'candidateWarmupEligible',
  'candidateMemoryReferenceScope', 'freshFinalShadowPassed',
  'ownerReviewApproved', 'prePublicWarmupAccepted', 'fallbackReason', 'advisories',
  'publicAvailabilityPolicy', 'legacyPublicFallbackAllowed',
  'automaticActivationAllowed',
]);
const LEGACY_CANDIDATE_G_MEMORY_REFERENCE_SCOPE = 'CURRENT_COMMON_ZONE_REFERENCE';
const LEGACY_CANDIDATE_G_READINESS_ADVISORIES = Object.freeze([
  Object.freeze(['candidateCoverageReady', 'LOCAL_CANDIDATE_COVERAGE_INCOMPLETE']),
  Object.freeze(['candidateMemoryReady', 'LOCAL_CANDIDATE_MEMORY_INCOMPLETE']),
  Object.freeze(['candidateWarmupEligible', 'LOCAL_CANDIDATE_MEMORY_GAPS']),
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
const expectedLegacyCandidateGAdvisories = profile =>
  LEGACY_CANDIDATE_G_READINESS_ADVISORIES
    .filter(([field]) => profile?.[field] !== true)
    .map(([, advisory]) => advisory);

export const LEGACY_CANDIDATE_G_SOURCE_CONTRACT = Object.freeze({
  schemaVersion: LEGACY_CANDIDATE_G_SOURCE_SCHEMA,
  releaseVersion: LEGACY_CANDIDATE_G_RELEASE_VERSION,
  sourceHead: LEGACY_CANDIDATE_G_SOURCE_HEAD,
  sourceTreeId: LEGACY_CANDIDATE_G_SOURCE_TREE,
  modelId: LEGACY_CANDIDATE_G_MODEL_ID,
  stateSchemaVersion: LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
  variantId: LEGACY_CANDIDATE_G_VARIANT_ID,
  profileId: LEGACY_CANDIDATE_G_PROFILE_ID,
  profileSwitchVersion: LEGACY_CANDIDATE_G_PROFILE_SWITCH,
  manifestSchemaVersion: LEGACY_CANDIDATE_G_MANIFEST_SCHEMA,
  zoneCount: 210,
  coastalPartCount: 673,
  publicImplementationProof: 'exact-git-source-closure-and-content-addressed-public-runtime',
  privatePayloadRead: false,
});

const LEGACY_CONTRACT_SHA256 = sha256(LEGACY_CANDIDATE_G_SOURCE_CONTRACT);
const LEGACY_BUNDLE_SHA256 = sha256(Object.freeze({
  normalizationId: 'ravscore-legacy-candidate-g-git-tree-sha256-v1',
  sourceHead: LEGACY_CANDIDATE_G_SOURCE_HEAD,
  sourceTreeId: LEGACY_CANDIDATE_G_SOURCE_TREE,
}));

export function legacyCandidateGSourceIdentity() {
  return Object.freeze({
    schemaVersion: LEGACY_CANDIDATE_G_SOURCE_SCHEMA,
    releaseVersion: LEGACY_CANDIDATE_G_RELEASE_VERSION,
    sourceHead: LEGACY_CANDIDATE_G_SOURCE_HEAD,
    sourceTreeId: LEGACY_CANDIDATE_G_SOURCE_TREE,
    modelId: LEGACY_CANDIDATE_G_MODEL_ID,
    stateSchemaVersion: LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
    variantId: LEGACY_CANDIDATE_G_VARIANT_ID,
    profileId: LEGACY_CANDIDATE_G_PROFILE_ID,
    profileSwitchVersion: LEGACY_CANDIDATE_G_PROFILE_SWITCH,
    manifestSchemaVersion: LEGACY_CANDIDATE_G_MANIFEST_SCHEMA,
    sourceContractSha256: LEGACY_CONTRACT_SHA256,
    sourceBundleSha256: LEGACY_BUNDLE_SHA256,
  });
}

// The controller always serializes the common 11-field binding shape. This
// bootstrap binding is derived from the exact production-verified 4.0.316
// source attestation; it is deliberately distinct from the regenerated
// Candidate G rollback implementation bundle and is never trip-admitted.
export function legacyCandidateGControllerBinding() {
  const source = legacyCandidateGSourceIdentity();
  return Object.freeze({
    modelId: source.modelId,
    stateSchemaVersion: source.stateSchemaVersion,
    variantId: source.variantId,
    profileId: source.profileId,
    componentSchemaId: LEGACY_CANDIDATE_G_COMPONENT_SCHEMA_ID,
    explanationSchemaId: LEGACY_CANDIDATE_G_EXPLANATION_SCHEMA_ID,
    rankingPolicyId: LEGACY_CANDIDATE_G_RANKING_POLICY_ID,
    bestTimePolicyId: LEGACY_CANDIDATE_G_BEST_TIME_POLICY_ID,
    presentationPolicyId: LEGACY_CANDIDATE_G_PRESENTATION_POLICY_ID,
    modelContractSha256: source.sourceContractSha256,
    modelBundleSha256: source.sourceBundleSha256,
  });
}

export function legacyCandidateGCentralProfile() {
  return Object.freeze({
    schemaVersion: LEGACY_CANDIDATE_G_STATE_SCHEMA_VERSION,
    sourceVersion: LEGACY_CANDIDATE_G_RELEASE_VERSION,
    switchVersion: LEGACY_CANDIDATE_G_PROFILE_SWITCH,
    requestedProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
    rollbackProfileId: null,
    candidateProfileId: LEGACY_CANDIDATE_G_MODEL_ID,
    candidateActivationEnabled: true,
    prePublicWarmupAccepted: true,
    automaticActivationAllowed: false,
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    legacyPublicFallbackAllowed: false,
    status: 'owner-approved-candidate-g-only-local-fail-closed',
    activationAuthority: LEGACY_CANDIDATE_G_ACTIVATION_AUTHORITY,
    evidence: Object.freeze({
      freshFinalShadowRunId: null,
      ownerReviewDecisionId: LEGACY_CANDIDATE_G_OWNER_REVIEW_DECISION_ID,
    }),
  });
}

export function assertLegacyCandidateGCentralProfile(value,
  label = 'Legacy Candidate G central profile') {
  const expected = legacyCandidateGCentralProfile();
  if (!exactKeys(value, LEGACY_CENTRAL_PROFILE_FIELDS)
    || !exactKeys(value?.evidence, LEGACY_CENTRAL_EVIDENCE_FIELDS)
    || JSON.stringify(canonical(value)) !== JSON.stringify(canonical(expected))) {
    throw new Error(`${label} is not the exact production-verified 4.0.316 central profile`);
  }
  return value;
}

export function assertLegacyCandidateGSourceIdentity(value,
  label = 'Legacy Candidate G source identity') {
  const expected = legacyCandidateGSourceIdentity();
  if (!exactKeys(value, SOURCE_IDENTITY_FIELDS)
    || JSON.stringify(canonical(value)) !== JSON.stringify(canonical(expected))) {
    throw new Error(`${label} is not the exact production-verified 4.0.316 source`);
  }
  return value;
}

export function assertLegacyCandidateGManifest(manifest,
  label = 'Legacy Candidate G public manifest') {
  const profile = manifest?.ravScoreProfile;
  const expectedAdvisories = expectedLegacyCandidateGAdvisories(profile);
  if (!manifest || manifest.schemaVersion !== LEGACY_CANDIDATE_G_MANIFEST_SCHEMA
    || manifest.complete !== true
    || !manifest.datasetId
    || !Number.isFinite(Date.parse(manifest.productionReferenceAt))
    || manifest.zoneCount !== 210
    || manifest.coastalPartCount !== 673
    || manifest.conditionsPath !== './public-conditions.json'
    || manifest.conditionDetailsPath !== './public-condition-details.json'
    || manifest.fullConditionsPath !== './conditions.json'
    || !exactKeys(profile, LEGACY_PUBLIC_PROFILE_FIELDS)
    || profile.schemaVersion !== '2.0.0'
    || profile.switchVersion !== LEGACY_CANDIDATE_G_PROFILE_SWITCH
    || profile.requestedProfileId !== LEGACY_CANDIDATE_G_MODEL_ID
    || profile.activeProfileId !== LEGACY_CANDIDATE_G_MODEL_ID
    || profile.candidateProfileId !== LEGACY_CANDIDATE_G_MODEL_ID
    || profile.rollbackProfileId !== null
    || !['candidateCoverageReady', 'candidateMemoryReady', 'candidateWarmupEligible']
      .every(field => typeof profile[field] === 'boolean')
    || profile.candidateMemoryReferenceScope !== LEGACY_CANDIDATE_G_MEMORY_REFERENCE_SCOPE
    || profile.freshFinalShadowPassed !== false
    || profile.ownerReviewApproved !== true
    || profile.prePublicWarmupAccepted !== true
    || profile.activationState !== 'candidate-g-only-local-fail-closed'
    || profile.fallbackReason !== null
    || !Array.isArray(profile.advisories)
    || profile.advisories.length !== expectedAdvisories.length
    || profile.advisories.some((value, index) => value !== expectedAdvisories[index])
    || profile.publicAvailabilityPolicy !== 'candidate-g-local-fail-closed'
    || profile.legacyPublicFallbackAllowed !== false
    || profile.automaticActivationAllowed !== false) {
    throw new Error(`${label} is not the exact schema-2 210/673 Candidate G runtime`);
  }
  return manifest;
}
