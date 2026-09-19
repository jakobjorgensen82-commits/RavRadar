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
  releaseVersion: '4.0.437',
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
  currentReleaseVersion,
} = {}) {
  if (!isObject(sourceDescription)
    || !isObject(currentBinding)
    || currentReleaseVersion !== BOUNDED_CONDITIONS_PREDECESSOR_POLICY.releaseVersion
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
    || !same(sourceDescription.modelBinding, currentBinding)
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
      === sourceDescription.contractHashes.publicProjectionContractSha256
    && currentContractHashes.fullRuntimeContractSha256
      !== sourceDescription.contractHashes.fullRuntimeContractSha256;
}

export function buildBoundedConditionsPredecessorRestoreExpectation({
  sourceDescription,
  targetReferenceAt,
  currentBinding,
  currentContractHashes,
  currentReleaseVersion,
  now = new Date().toISOString(),
} = {}) {
  if (!boundedConditionsPredecessorApplies({
    sourceDescription,
    currentBinding,
    currentContractHashes,
    currentReleaseVersion,
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
