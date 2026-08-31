export const RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS = Object.freeze([
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

export const RAVSCORE_PUBLIC_SCORE_PROFILE_FIELDS = Object.freeze([
  'schemaVersion',
  'switchVersion',
  'requestedProfileId',
  'activeProfileId',
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
  'rollbackModelId',
  'runtimeFallbackModelId',
  'modelCoverageReady',
  'modelMemoryReady',
  'modelMigrationReady',
  'memoryReferenceScope',
  'activationState',
  'advisories',
  'publicAvailabilityPolicy',
  'crossModelRuntimeFallbackAllowed',
  'automaticActivationAllowed',
]);

const PROFILE_BINDING_FIELDS = Object.freeze({
  modelId: 'activeProfileId',
  stateSchemaVersion: 'stateSchemaVersion',
  variantId: 'variantId',
  profileId: 'profileId',
  componentSchemaId: 'componentSchemaId',
  explanationSchemaId: 'explanationSchemaId',
  rankingPolicyId: 'rankingPolicyId',
  bestTimePolicyId: 'bestTimePolicyId',
  presentationPolicyId: 'presentationPolicyId',
  modelContractSha256: 'modelContractSha256',
  modelBundleSha256: 'modelBundleSha256',
});

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

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

export function assertExactPublicRavScoreModelBindingShape(binding, label = 'public RavScore model binding') {
  if (!exactKeys(binding, RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS)) {
    throw new Error(`${label} does not have the exact 11-field model binding`);
  }
  for (const field of RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS) {
    const value = binding[field];
    const valid = field === 'modelContractSha256' || field === 'modelBundleSha256'
      ? typeof value === 'string' && SHA256_PATTERN.test(value)
      : typeof value === 'string' && SAFE_ID_PATTERN.test(value);
    if (!valid) throw new Error(`${label} has an invalid ${field}`);
  }
}

/**
 * Proves that a public score profile is both closed to unknown fields and an
 * exact projection of one canonical 11-field model binding. Model-specific
 * activation policy is intentionally checked by the caller.
 */
export function assertExactPublicRavScoreProfile(profile, modelBinding, label = 'public RavScore profile') {
  assertExactPublicRavScoreModelBindingShape(modelBinding, `expected ${label} binding`);
  if (!exactKeys(profile, RAVSCORE_PUBLIC_SCORE_PROFILE_FIELDS)) {
    throw new Error(`${label} does not have the exact public score-profile field set`);
  }
  if (profile.requestedProfileId !== modelBinding.modelId
    || profile.activeProfileId !== modelBinding.modelId) {
    throw new Error(`${label} requests or activates another model`);
  }
  for (const field of RAVSCORE_PUBLIC_MODEL_BINDING_FIELDS) {
    const profileField = PROFILE_BINDING_FIELDS[field];
    if (profile[profileField] !== modelBinding[field]) {
      throw new Error(`${label} does not match ${field}`);
    }
  }
  if (!['modelCoverageReady', 'modelMemoryReady', 'modelMigrationReady']
    .every(field => typeof profile[field] === 'boolean')
    || !Array.isArray(profile.advisories)
    || profile.advisories.some(value => typeof value !== 'string')
    || typeof profile.schemaVersion !== 'string'
    || !SAFE_ID_PATTERN.test(profile.schemaVersion)
    || typeof profile.switchVersion !== 'string'
    || !SAFE_ID_PATTERN.test(profile.switchVersion)
    || typeof profile.memoryReferenceScope !== 'string'
    || !SAFE_ID_PATTERN.test(profile.memoryReferenceScope)
    || typeof profile.activationState !== 'string'
    || !SAFE_ID_PATTERN.test(profile.activationState)
    || typeof profile.publicAvailabilityPolicy !== 'string'
    || !SAFE_ID_PATTERN.test(profile.publicAvailabilityPolicy)
    || (profile.rollbackModelId !== null
      && (typeof profile.rollbackModelId !== 'string'
        || !SAFE_ID_PATTERN.test(profile.rollbackModelId)))
    || profile.runtimeFallbackModelId !== null
    || profile.crossModelRuntimeFallbackAllowed !== false
    || profile.automaticActivationAllowed !== false) {
    throw new Error(`${label} contains an invalid or unsafe public control field`);
  }
  return true;
}

export function assertSameExactPublicRavScoreProfile(
  actual,
  expected,
  modelBinding,
  label = 'public RavScore profile',
) {
  assertExactPublicRavScoreProfile(actual, modelBinding, label);
  assertExactPublicRavScoreProfile(expected, modelBinding, `expected ${label}`);
  for (const field of RAVSCORE_PUBLIC_SCORE_PROFILE_FIELDS) {
    if (field === 'advisories') {
      if (actual.advisories.length !== expected.advisories.length
        || actual.advisories.some((value, index) => value !== expected.advisories[index])) {
        throw new Error(`${label} advisories do not match`);
      }
    } else if (!Object.is(actual[field], expected[field])) {
      throw new Error(`${label} does not match the active public score profile`);
    }
  }
  return true;
}
