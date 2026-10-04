import {
  canonicalPrivateRuntimeJson,
} from '../private-production-runtime-bundle.mjs';

const SHA256 = /^[0-9a-f]{64}$/;
const HOUR_MS = 3_600_000;
const CONTRACT_KEYS = Object.freeze([
  'continuationStateContractSha256',
  'fullRuntimeContractSha256',
  'publicProjectionContractSha256',
]);

export const BOUNDED_CONDITIONS_PREDECESSOR_POLICY = Object.freeze({
  introducedInRelease: '4.0.439',
  sourceDescriptionKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
  sourceDescriptionSchemaVersion: '1.0.0',
  sourceHead: 'd4e8844ece6bfa46447b762a662cac0d7f1da385',
  sourceBundleContentSha256:
    'ad2337ab263c117389ed0e7a733cd5d63c7d91589d94bb71d25923cf018587f6',
  sourceContractHashes: Object.freeze({
    continuationStateContractSha256:
      '3d4e51b9dca15bafac98cf5c1e69f0b60d6ca354d3aa9e05bf9302d8622c8f77',
    fullRuntimeContractSha256:
      'e6a6f3db54429847ae179ae0c91e10f8f90991e78c98bb26946c512f77786446',
    publicProjectionContractSha256:
      '2522b75dbac0b45c52c429a9955cac66b8b3529961124f4738334a4291ed50d1',
  }),
  sourceModelBinding: Object.freeze({
    modelId: 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
    stateSchemaVersion: '6.0.0',
    variantId: 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2',
    profileId: 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5',
    componentSchemaId: 'ravscore-components-huntability-delivery-mobilisation-bounds-v5',
    explanationSchemaId: 'ravscore-explanation-integrated-bounds-v5',
    rankingPolicyId: 'direction-broad-19-history-tie-v2',
    bestTimePolicyId: 'score-history-water-tie-earliest-v3',
    presentationPolicyId: 'score-bands-35-55-75-exceptional90-v1',
    modelContractSha256: 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b',
    modelBundleSha256: '8f0ef7800eee6adbb5cb620fed682c2c7900ad8748a86ba84085570e44fa9c26',
  }),
  targetModelBinding: Object.freeze({
    modelId: 'RRS-COASTAL-PROCESS-INTEGRATED-1.1.0',
    stateSchemaVersion: '6.0.0',
    variantId: 'COASTAL-SUPPLY-MOBILISATION-BOUNDED-WAVE-APPROACH-HUNTABILITY-2',
    profileId: 'cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-historybounds12d-lastmileewma4-tail40-atten15-v5',
    componentSchemaId: 'ravscore-components-huntability-delivery-mobilisation-bounds-v5',
    explanationSchemaId: 'ravscore-explanation-integrated-bounds-v5',
    rankingPolicyId: 'direction-broad-19-history-tie-v2',
    bestTimePolicyId: 'score-history-water-tie-earliest-v3',
    presentationPolicyId: 'score-bands-35-55-75-exceptional90-v1',
    modelContractSha256: 'a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b',
    modelBundleSha256: '315525d0e00d336660791fe32f4f5a6b2eb6962081aae4aa914f65590d8c7030',
  }),
  targetPublicProjectionContractSha256:
    '6b4ad46384194130cdbd3be1701ae1822831822801a9fcaea3b75d95b3bc77ec',
  expectedZoneCount: 210,
  expectedPartCount: 673,
});

const isObject = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function same(left, right) {
  return canonicalPrivateRuntimeJson(left) === canonicalPrivateRuntimeJson(right);
}

function canonicalHour(value, label) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/.test(value)) {
    throw new Error(`${label} must be a canonical exact UTC hour`);
  }
  const milliseconds = Date.parse(value);
  const normalized = Number.isFinite(milliseconds)
    ? new Date(milliseconds).toISOString()
    : '';
  const normalizedInput = value.endsWith(':00Z')
    ? `${value.slice(0, -1)}.000Z`
    : value;
  if (!Number.isFinite(milliseconds)
    || normalizedInput !== normalized
    || milliseconds % HOUR_MS !== 0) {
    throw new Error(`${label} must be a canonical exact UTC hour`);
  }
  return normalized;
}

function canonicalTime(value, label) {
  const milliseconds = Date.parse(value);
  if (typeof value !== 'string' || !Number.isFinite(milliseconds)
    || value !== new Date(milliseconds).toISOString()) {
    throw new Error(`${label} must be canonical UTC`);
  }
  return value;
}

function contractHashesAreExact(value, expected) {
  return isObject(value)
    && JSON.stringify(Object.keys(value).sort())
      === JSON.stringify([...CONTRACT_KEYS].sort())
    && CONTRACT_KEYS.every(key => SHA256.test(String(value[key] ?? '')))
    && (!expected || same(value, expected));
}

export function boundedConditionsPredecessorApplies({
  sourceDescription,
  currentBinding,
  currentContractHashes,
} = {}) {
  if (!isObject(sourceDescription)
    || !isObject(currentBinding)
    || sourceDescription.schemaVersion
      !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceDescriptionSchemaVersion
    || sourceDescription.kind
      !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceDescriptionKind
    || sourceDescription.sourceHead
      !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceHead
    || sourceDescription.bundleContentSha256
      !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceBundleContentSha256
    || sourceDescription.expectedZoneCount
      !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.expectedZoneCount
    || sourceDescription.expectedPartCount
      !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.expectedPartCount
    || sourceDescription.privatePayloadIncluded !== false
    || !same(sourceDescription.modelBinding,
      BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceModelBinding)
    || !same(currentBinding,
      BOUNDED_CONDITIONS_PREDECESSOR_POLICY.targetModelBinding)
    || !contractHashesAreExact(
      sourceDescription.contractHashes,
      BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceContractHashes,
    )
    || !contractHashesAreExact(currentContractHashes)) {
    return false;
  }
  return currentContractHashes.continuationStateContractSha256
      === sourceDescription.contractHashes.continuationStateContractSha256
    && currentContractHashes.publicProjectionContractSha256
      === BOUNDED_CONDITIONS_PREDECESSOR_POLICY.targetPublicProjectionContractSha256
    && currentContractHashes.fullRuntimeContractSha256
      !== sourceDescription.contractHashes.fullRuntimeContractSha256;
}

export function buildBoundedConditionsPredecessorRestoreExpectation({
  sourceDescription,
  targetReferenceAt,
  currentBinding,
  currentContractHashes,
  now = new Date().toISOString(),
} = {}) {
  if (!boundedConditionsPredecessorApplies({
    sourceDescription,
    currentBinding,
    currentContractHashes,
  })) return null;

  const sourceReferenceAt = canonicalHour(
    sourceDescription.productionReferenceAt,
    'Bounded conditions predecessor reference',
  );
  const target = canonicalHour(
    targetReferenceAt,
    'Bounded conditions successor target',
  );
  if (Date.parse(target) <= Date.parse(sourceReferenceAt)) {
    throw new Error('Bounded conditions transition requires a genuinely newer production hour');
  }
  const generatedAt = canonicalTime(
    sourceDescription.generatedAt,
    'Bounded conditions predecessor generation',
  );
  if (typeof sourceDescription.datasetId !== 'string'
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(sourceDescription.datasetId)) {
    throw new Error('Bounded conditions predecessor dataset identity is invalid');
  }
  return Object.freeze({
    modelBinding: structuredClone(sourceDescription.modelBinding),
    contractHashes: structuredClone(sourceDescription.contractHashes),
    datasetId: sourceDescription.datasetId,
    productionReferenceAt: sourceReferenceAt,
    generatedAt,
    targetReferenceAt: target,
    minimumReferenceAt: sourceReferenceAt,
    minimumGeneratedAt: generatedAt,
    now: canonicalTime(now, 'Bounded conditions predecessor restore time'),
  });
}

// One original generation, not a general model-hash override. The manifest
// remains ORIGINAL while the successor reads it; migration and reconstruction
// are separate operations and cannot be attested by this restore expectation.
export const OWNER_CURRENT_DOMAIN_PREDECESSOR = Object.freeze({
  sourceHead: 'd778ff28c84606a93364ce112fecce4152182649',
  datasetId: 'rr-20261004172305-210',
  productionReferenceAt: '2026-10-04T16:00:00.000Z',
  generatedAt: '2026-10-04T17:23:05.647Z',
  bundleContentSha256: '1d912d8fdfbfb9e5aebc8f78d945e6cd9d08296108fd350b7b02a1be5cf7b117',
  modelBinding: Object.freeze({
    ...BOUNDED_CONDITIONS_PREDECESSOR_POLICY.sourceModelBinding,
    modelBundleSha256: '29ea9a19647bf7d5edad0eee159267086d546f0d90a9f2778a77077351aad948',
  }),
  contractHashes: Object.freeze({
    continuationStateContractSha256: 'd983bb085f75252d00f0e2585cd0e274ea86020000f99037e9054a3989a4aef6',
    fullRuntimeContractSha256: 'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',
    publicProjectionContractSha256: 'c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09',
  }),
});

export const OWNER_CURRENT_DOMAIN_SUCCESSOR = Object.freeze({
  integratedBundleSha256: '4ebe158f68954f32b47cb71d5222ab0cf676faaf4b323d743f9d43bf34a63a51',
  candidateBundleSha256: '3e5aae87b19934091a7882fbd8f5b5570b7c83ba786ea6f3bac52a8fd71fcd1e',
  continuationStateContractSha256: '3dd9b7f054dd19400e8110ec504c2689bd62c52741cf6cf7805070e89e51d1bd',
});

export function assertOwnerCurrentOriginalExpectation(expected) {
  const original = OWNER_CURRENT_DOMAIN_PREDECESSOR;
  if (!isObject(expected)
    || expected.ownerCurrentDomainTransition !== 'EXACT_ORIGINAL_RESTORE_V1'
    || !same(expected.modelBinding, original.modelBinding)
    || !same(expected.contractHashes, original.contractHashes)
    || ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
      'bundleContentSha256'].some(key => expected[key] !== original[key])
    || canonicalHour(expected.minimumReferenceAt, 'Original minimum reference')
      !== original.productionReferenceAt
    || canonicalTime(expected.minimumGeneratedAt, 'Original minimum generation')
      !== original.generatedAt
    || Date.parse(canonicalHour(expected.targetReferenceAt, 'Successor target'))
      < Date.parse(original.productionReferenceAt)) {
    throw new Error('Owner current transition requires its exact original expectation');
  }
  return original;
}

export function buildOwnerCurrentOriginalRestoreExpectation({
  sourceDescription, targetReferenceAt, currentBinding, currentContractHashes,
  now = new Date().toISOString(),
} = {}) {
  const original = OWNER_CURRENT_DOMAIN_PREDECESSOR;
  if (!isObject(sourceDescription)
    || sourceDescription.schemaVersion !== '1.0.0'
    || sourceDescription.kind !== 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE'
    || sourceDescription.expectedZoneCount !== 210
    || sourceDescription.expectedPartCount !== 673
    || sourceDescription.privatePayloadIncluded !== false
    || ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',
      'bundleContentSha256'].some(key => sourceDescription[key] !== original[key])
    || !same(sourceDescription.modelBinding, original.modelBinding)
    || !same(sourceDescription.contractHashes, original.contractHashes)
    || !isObject(currentBinding)
    || currentBinding.modelBundleSha256 !== OWNER_CURRENT_DOMAIN_SUCCESSOR.integratedBundleSha256
    || !same({ ...currentBinding, modelBundleSha256: original.modelBinding.modelBundleSha256 },
      original.modelBinding)
    || !contractHashesAreExact(currentContractHashes)
    || currentContractHashes.fullRuntimeContractSha256
      !== original.contractHashes.fullRuntimeContractSha256
    || currentContractHashes.publicProjectionContractSha256
      !== original.contractHashes.publicProjectionContractSha256
    || currentContractHashes.continuationStateContractSha256
      !== OWNER_CURRENT_DOMAIN_SUCCESSOR.continuationStateContractSha256) return null;
  const expectation = {
    ...structuredClone(original),
    ownerCurrentDomainTransition: 'EXACT_ORIGINAL_RESTORE_V1',
    targetReferenceAt: canonicalHour(targetReferenceAt, 'Successor target'),
    minimumReferenceAt: original.productionReferenceAt,
    minimumGeneratedAt: original.generatedAt,
    now: canonicalTime(now, 'Original restore time'),
  };
  assertOwnerCurrentOriginalExpectation(expectation);
  return Object.freeze(expectation);
}
