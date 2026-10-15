import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ravScoreModelBinding as currentGridSamplingModelBinding }
  from '../../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as currentGridSamplingCandidateBinding }
  from '../rollback-assets/ravscore-model-contract.js';
import { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as currentGridSamplingIntegratedManifest }
  from '../../js/core/ravscore-model-bundle.generated.js';
import { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as currentGridSamplingCandidateManifest }
  from '../rollback-assets/ravscore-model-bundle.generated.js';
import {
  canonicalPrivateRuntimeJson,
  PRIVATE_RUNTIME_REPOSITORY_ROOT,
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

// Exact successful 542 protected successor, not a moving pointer, forecast
// projection, failed progress cache or relabelled 541 original.
export const OWNER_WATER_LEVEL_ONLY_PREDECESSOR = Object.freeze({
  ...OWNER_CURRENT_DOMAIN_PREDECESSOR,
  sourceHead:'892b56b66e5953e50f2425e6d66bf90f93081aed',
  datasetId:'rr-20261005020412-210',
  productionReferenceAt:'2026-10-05T00:00:00.000Z',
  generatedAt:'2026-10-05T02:04:12.334Z',
  bundleContentSha256:'9e17b4bc1c785ba0910e2b8b1b66bd55529c49d580b59303cae5f6a0260659da',
  modelBinding:Object.freeze({ ...OWNER_CURRENT_DOMAIN_PREDECESSOR.modelBinding,
    modelBundleSha256:OWNER_CURRENT_DOMAIN_SUCCESSOR.integratedBundleSha256 }),
  contractHashes:Object.freeze({ ...OWNER_CURRENT_DOMAIN_PREDECESSOR.contractHashes,
    continuationStateContractSha256:OWNER_CURRENT_DOMAIN_SUCCESSOR.continuationStateContractSha256 }),
});
export const OWNER_WATER_LEVEL_ONLY_SUCCESSOR = Object.freeze({
  integratedBundleSha256:'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb',
  candidateBundleSha256:'8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3',
  continuationStateContractSha256:'4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51',
});

function ownerOriginalPolicy(transition) {
  if (transition === 'EXACT_ORIGINAL_RESTORE_V1') return OWNER_CURRENT_DOMAIN_PREDECESSOR;
  if (transition === 'EXACT_WATER_LEVEL_ONLY_RESTORE_V1') return OWNER_WATER_LEVEL_ONLY_PREDECESSOR;
  throw new Error('Unknown exact owner technical transition');
}

export function assertOwnerCurrentOriginalExpectation(expected) {
  const original = ownerOriginalPolicy(expected?.ownerCurrentDomainTransition);
  if (!isObject(expected)
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
  const waterOnly=sourceDescription?.modelBinding?.modelBundleSha256
    === OWNER_WATER_LEVEL_ONLY_PREDECESSOR.modelBinding.modelBundleSha256;
  const original = waterOnly ? OWNER_WATER_LEVEL_ONLY_PREDECESSOR : OWNER_CURRENT_DOMAIN_PREDECESSOR;
  const successor=waterOnly ? OWNER_WATER_LEVEL_ONLY_SUCCESSOR : OWNER_CURRENT_DOMAIN_SUCCESSOR;
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
    || currentBinding.modelBundleSha256 !== successor.integratedBundleSha256
    || !same({ ...currentBinding, modelBundleSha256: original.modelBinding.modelBundleSha256 },
      original.modelBinding)
    || !contractHashesAreExact(currentContractHashes)
    || currentContractHashes.fullRuntimeContractSha256
      !== original.contractHashes.fullRuntimeContractSha256
    || currentContractHashes.publicProjectionContractSha256
      !== original.contractHashes.publicProjectionContractSha256
    || currentContractHashes.continuationStateContractSha256
      !== successor.continuationStateContractSha256) return null;
  const expectation = {
    ...structuredClone(original),
    ownerCurrentDomainTransition: waterOnly ? 'EXACT_WATER_LEVEL_ONLY_RESTORE_V1' : 'EXACT_ORIGINAL_RESTORE_V1',
    targetReferenceAt: canonicalHour(targetReferenceAt, 'Successor target'),
    minimumReferenceAt: original.productionReferenceAt,
    minimumGeneratedAt: original.generatedAt,
    now: canonicalTime(now, 'Original restore time'),
  };
  assertOwnerCurrentOriginalExpectation(expectation);
  return Object.freeze(expectation);
}

// Only the original FFC/Candidate source family. Generation identity comes from
// the normally described protected current archive, NOT a fabricated receipt.
// This is original restoration only, never usable current-state initialization.
export const CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY = Object.freeze({
  sourceDescriptionKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_CURRENT_SOURCE',
  restoredSourceDescriptionKind: 'RAVRADAR_PRIVATE_PRODUCTION_RUNTIME_TARGET_SOURCE',
  sourceDescriptionSchemaVersion: '1.0.0',
  sourceModelBinding: Object.freeze({
    ...OWNER_WATER_LEVEL_ONLY_PREDECESSOR.modelBinding,
    modelBundleSha256: 'ffc67b30f6018791f46e169ff039be8fba4c6935ba218d83f38340b886d2b9eb',
  }),
  sourceCandidateModelBinding: Object.freeze({
    "modelId": "RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3",
    "stateSchemaVersion": "2.0.0",
    "variantId": "G-CURRENT-LED-WAVE-MOBILISATION-WADERS-WIND-LED",
    "profileId": "current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48",
    "componentSchemaId": "ravscore-components-huntability-transport-mobilisation-candidate-g-v1",
    "explanationSchemaId": "ravscore-explanation-candidate-g-v3",
    "rankingPolicyId": "direction-broad-19-v1",
    "bestTimePolicyId": "score-water-tie-earliest-v2",
    "presentationPolicyId": "score-bands-35-55-75-exceptional90-v1",
    "modelContractSha256": "c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8",
    "modelBundleSha256": "8d9142b5f7d9b5a3e5a0f3593e73df0c7ffaf3d80c036317967cb713f09197e3"
  }),
  sourceContractHashes: Object.freeze({
    "continuationStateContractSha256": "4115f37178ff3d8eab540f3d9355a1275a13a9dd3a896e07f06673564e76ee51",
    "fullRuntimeContractSha256": "ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff",
    "publicProjectionContractSha256": "c495b80c7ca8906d81ae0a58f340fe693f79acce51ca6efc7933681d9505da09"
  }),
  expectedZoneCount: 210,
  expectedPartCount: 673,
});

// Historical policy above remains immutable. These are separate authenticated
// original families, not aliases or rewritten original-state metadata.
export const CURRENT_GRID_SAMPLING_DELIVERED_575_POLICY = Object.freeze({
  ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY,
  sourceModelBinding: Object.freeze({ ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceModelBinding,
    modelBundleSha256: '249c7720512216b10ebcbd8bb29329760170a5c610c7cdfb618c92fb74787932' }),
  sourceCandidateModelBinding: Object.freeze({ ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceCandidateModelBinding,
    modelBundleSha256: '55fd7dfa5ee36596c729d93225a448ea5b8f1e7142c44b8b1bda5c3d4d84c957' }),
  sourceContractHashes: Object.freeze({ ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceContractHashes,
    continuationStateContractSha256: 'a5430dd21e3135d6efc09e22df3dd0cdcafee723f962ff1d3cb52e7765b2aaa0' }),
});
export const CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY = Object.freeze({
  ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY,
  sourceModelBinding: Object.freeze({ ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceModelBinding,
    modelBundleSha256: 'c1ac9b32d6bfb6bfeda81bc10566f6906d7046ef2b1481981b3470bda4a427f5' }),
  sourceCandidateModelBinding: Object.freeze({ ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceCandidateModelBinding,
    modelBundleSha256: '2fdc7426ea99382731c6f4d118eacf4fc271f505fcf121bc67c5349c62938af9' }),
  sourceContractHashes: Object.freeze({ ...CURRENT_GRID_SAMPLING_PREDECESSOR_POLICY.sourceContractHashes,
    continuationStateContractSha256: '7876390c0e99dc1926d57e3e5a51a0c88c8e72c190add1ebcfd07964e928ea3b' }),
});

// Reviewed native-grid SOURCE delta only. Every unlisted old C/I source row,
// including all assistant/trip leaves, must remain the exact old source row.
// These are old header/remainder and reviewed leaf fingerprints, NOT target
// bundle hashes. The real generated C/I globals remain the target identities.
const CURRENT_GRID_SAMPLING_SOURCE_DELTA = Object.freeze({
  "js/core/ravscore-integrated-state-pipeline.js": "b3d17bce7f2233243fca4f561b1be8a108943dea69474dadbfa255a2167ebbc0",
  "scripts/lib/coastal-point-staging-contract.mjs": "c2abd8fb7f03a0d84628a4af9b734a5f648dd5e250fdd96ccace3d7bc5d2f851",
  "scripts/lib/dmi-forecast-store.mjs": "a525ef4ae0109336541758b7fc4de661e4b1977397fd7e5bcba71eed83c9bc99",
  "scripts/lib/live-current-pilot.mjs": "552a709d34b828086061f148841245b32f6f4d25c3d1e8249681bda83ad45ad9",
  "scripts/lib/ravscore-production-adapters.mjs": "71b0388b925ebd13d356a520226189e801ef83ca9de4010592533592f0d330b9",
  "scripts/lib/ravscore-production-part-pipeline.mjs": "92001dc5c4d3ff965d235d8f6f3e67b8e0c7d6351eb4e78a76787b00e5cf4531",
  "scripts/lib/ravscore-recovery-replay.mjs": "b7459a5d821800a9c58c303fc1fb166610b73d98a68523a8830ef29eb4e70223",
  "scripts/lib/copernicus-offline-environment.mjs": "a19a2de9102560936f3ed380fd843475dc125799bf9b3be948eaef0b425d9ea0",
  "scripts/lib/protected-dmi-native-current-proofs.mjs": "6ce30273517ec4062ff83b35d7c530b5d5c89190e265b3ba34f66461f6725110",
  "scripts/lib/ravscore-recovery-source-priority.mjs": "57ee543fd10450cd0272697843c402061436d1039650a9a0c455f6e68b838ad1"
});
const CURRENT_GRID_SAMPLING_ORIGINAL_KEYS = Object.freeze([
  'modelBinding', 'contractHashes', 'sourceHead', 'datasetId',
  'productionReferenceAt', 'generatedAt', 'bundleContentSha256',
  'currentGridSamplingTransition', 'targetReferenceAt',
  'minimumReferenceAt', 'minimumGeneratedAt', 'now',
]);
const gridSha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const gridCanonicalSha256 = value => gridSha256(canonicalPrivateRuntimeJson(value));
const gridNormalizeSource = value => String(value).replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g, '$1<release-version>');

const CURRENT_GRID_SAMPLING_REVIEWED_PRODUCERS = Object.freeze({
  // Separate reviewed SOURCE implementations; original-family pins above do not change.
  '8ff4a5b6f50d3f2d4e177fcf8c55048051266ded1a196151d6adff9427829ce2': 'native-grid-current-only',
  '242844d0da14fc64ce8ebbf48bdab1e49450822cd193cd231667013e216b160e': 'state-bound-cached-current-history',
  'a618f47d2f59ccf548db06a601a07383c365c5f5c5daf62d799d8653d325a1d4': 'original-target-cache-only-continuation',
  '3bb772a32861e911e790e47791a8a454750654b233d0b46d30a6be8515fcb96f': 'original-target-cache-only-finalized-partial',
});
function currentGridSamplingReviewedProducer(source) {
  return Object.hasOwn(CURRENT_GRID_SAMPLING_REVIEWED_PRODUCERS,
    gridSha256(gridNormalizeSource(source)));
}

function currentGridSamplingManifestMatches(manifest, pathKey, count, header, remainder) {
  if (!isObject(manifest) || !Array.isArray(manifest.files)
    || manifest.files.length !== count) return false;
  const { files, ...metadata } = manifest;
  if (gridCanonicalSha256(metadata) !== header) return false;
  const byPath = new Map();
  for (const row of files) {
    if (!isObject(row) || Object.keys(row).length !== 2
      || !Object.hasOwn(row, pathKey) || !Object.hasOwn(row, 'sha256')
      || typeof row[pathKey] !== 'string' || !SHA256.test(row.sha256)
      || byPath.has(row[pathKey])) return false;
    byPath.set(row[pathKey], row.sha256);
  }
  for (const [file, digest] of Object.entries(CURRENT_GRID_SAMPLING_SOURCE_DELTA)) {
    if (byPath.get(file) !== digest) return false;
    byPath.delete(file);
  }
  if (pathKey === 'path') {
    const generatedCandidate = 'scripts/rollback-assets/ravscore-model-bundle.generated.js';
    const generatedRow = byPath.get(generatedCandidate);
    const source = fs.readFileSync(path.join(
      PRIVATE_RUNTIME_REPOSITORY_ROOT, generatedCandidate,
    ), 'utf8');
    if (generatedRow !== gridSha256(gridNormalizeSource(source))) return false;
    byPath.delete(generatedCandidate);
  }
  const unchanged = [...byPath].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  return gridCanonicalSha256(unchanged) === remainder;
}

function currentGridSamplingSourceSuccessorApplies() {
  const policy = CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
  const integrated = currentGridSamplingModelBinding();
  const candidate = currentGridSamplingCandidateBinding();
  if (!SHA256.test(integrated.modelBundleSha256)
    || integrated.modelBundleSha256 === policy.sourceModelBinding.modelBundleSha256
    || !same({ ...integrated, modelBundleSha256: policy.sourceModelBinding.modelBundleSha256 },
      policy.sourceModelBinding)
    || !SHA256.test(candidate.modelBundleSha256)
    || candidate.modelBundleSha256 === policy.sourceCandidateModelBinding.modelBundleSha256
    || !same({ ...candidate, modelBundleSha256: policy.sourceCandidateModelBinding.modelBundleSha256 },
      policy.sourceCandidateModelBinding)
    || gridCanonicalSha256(currentGridSamplingIntegratedManifest) !== integrated.modelBundleSha256
    || gridSha256(JSON.stringify(currentGridSamplingCandidateManifest)) !== candidate.modelBundleSha256
    || !currentGridSamplingManifestMatches(currentGridSamplingCandidateManifest, 'file', 69,
      'cd1d050edd50c225d52a2f211b03b32e6e868e8ebd174ceabb3741476356ceeb',
      '23e36a357431a2a2a5f6addbf07d7bbb0f44b5baf4884f623ea9b60a6b062021')
    || !currentGridSamplingManifestMatches(currentGridSamplingIntegratedManifest, 'path', 71,
      'ebf20182dcefad957b54e62c028a418d0b21cce9c0ccae4558b8f233829f5f47',
      'f52b041d1558fbf88ac188df692674182052758e04436290b76cfe486bfa50d0')) return false;
  const producer = fs.readFileSync(path.join(
    PRIVATE_RUNTIME_REPOSITORY_ROOT, 'scripts/update-dmi-bulk.py',
  ), 'utf8');
  const checkpoint = fs.readFileSync(path.join(
    PRIVATE_RUNTIME_REPOSITORY_ROOT, 'scripts/ravscore-continuation-checkpoint.mjs',
  ), 'utf8');
  return currentGridSamplingReviewedProducer(producer)
    && gridSha256(gridNormalizeSource(checkpoint))
      === 'a119e9fff37bfcb7b60174bec97ae4f0a49012f5b5ac40ae57cb79ffbdf8322e';
}

export function assertCurrentGridSamplingOriginalExpectation(expected) {
  const policy = CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
  if (!currentGridSamplingSourceSuccessorApplies()) {
    throw new Error('Current-grid original target is not the exact reviewed native-grid SOURCE successor');
  }
  if (!isObject(expected)
    || Object.keys(expected).length !== CURRENT_GRID_SAMPLING_ORIGINAL_KEYS.length
    || CURRENT_GRID_SAMPLING_ORIGINAL_KEYS.some(key => !Object.hasOwn(expected, key))
    || expected.currentGridSamplingTransition !== 'EXACT_CURRENT_GRID_SAMPLING_ORIGINAL_RESTORE_V1'
    || !same(expected.modelBinding, policy.sourceModelBinding)
    || !contractHashesAreExact(expected.contractHashes, policy.sourceContractHashes)
    || typeof expected.sourceHead !== 'string' || !/^[0-9a-f]{40}$/.test(expected.sourceHead)
    || typeof expected.datasetId !== 'string'
    || !/^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(expected.datasetId)
    || !SHA256.test(String(expected.bundleContentSha256 ?? ''))
    || canonicalHour(expected.productionReferenceAt, 'Current-grid original reference')
      !== expected.productionReferenceAt
    || canonicalTime(expected.generatedAt, 'Current-grid original generation') !== expected.generatedAt
    || expected.minimumReferenceAt !== expected.productionReferenceAt
    || expected.minimumGeneratedAt !== expected.generatedAt
    || canonicalHour(expected.targetReferenceAt, 'Current-grid successor target') !== expected.targetReferenceAt
    || Date.parse(expected.targetReferenceAt) < Date.parse(expected.productionReferenceAt)
    || canonicalTime(expected.now, 'Current-grid original restore time') !== expected.now) {
    throw new Error('Current-grid sampling requires its exact original expectation');
  }
  return expected;
}

export async function buildCurrentGridSamplingOriginalRestoreExpectation({
  sourceDescription, targetReferenceAt, now = new Date().toISOString(),
} = {}) {
  const policy = CURRENT_GRID_SAMPLING_SELECTED_PREDECESSOR_POLICY;
  if (!isObject(sourceDescription)
    || sourceDescription.schemaVersion !== policy.sourceDescriptionSchemaVersion
    || sourceDescription.kind !== policy.sourceDescriptionKind
    || sourceDescription.expectedZoneCount !== policy.expectedZoneCount
    || sourceDescription.expectedPartCount !== policy.expectedPartCount
    || sourceDescription.privatePayloadIncluded !== false
    || !same(sourceDescription.modelBinding, policy.sourceModelBinding)
    || !contractHashesAreExact(sourceDescription.contractHashes, policy.sourceContractHashes)
    || !currentGridSamplingSourceSuccessorApplies()) return null;
  // Actual default repository/globals only. No caller-injected target binding,
  // contract hashes, root override, fallback repair or continuation mode flag.
  const { privateRuntimeContractHashes } = await import('../private-production-runtime-workflow.mjs');
  const currentContracts = await privateRuntimeContractHashes();
  if (!contractHashesAreExact(currentContracts)
    || currentContracts.fullRuntimeContractSha256 !== policy.sourceContractHashes.fullRuntimeContractSha256
    || currentContracts.publicProjectionContractSha256
      !== policy.sourceContractHashes.publicProjectionContractSha256
    || currentContracts.continuationStateContractSha256
      === policy.sourceContractHashes.continuationStateContractSha256) return null;
  const expected = {
    modelBinding: structuredClone(policy.sourceModelBinding),
    contractHashes: structuredClone(policy.sourceContractHashes),
    sourceHead: sourceDescription.sourceHead,
    datasetId: sourceDescription.datasetId,
    productionReferenceAt: sourceDescription.productionReferenceAt,
    generatedAt: sourceDescription.generatedAt,
    bundleContentSha256: sourceDescription.bundleContentSha256,
    currentGridSamplingTransition: 'EXACT_CURRENT_GRID_SAMPLING_ORIGINAL_RESTORE_V1',
    targetReferenceAt: canonicalHour(targetReferenceAt, 'Current-grid successor target'),
    minimumReferenceAt: sourceDescription.productionReferenceAt,
    minimumGeneratedAt: sourceDescription.generatedAt,
    now: canonicalTime(now, 'Current-grid original restore time'),
  };
  assertCurrentGridSamplingOriginalExpectation(expected);
  return Object.freeze(expected);
}
