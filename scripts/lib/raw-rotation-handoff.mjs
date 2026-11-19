import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const SHA256 = /^[0-9a-f]{64}$/;
const HEAD = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
const HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/;
const authenticatedHandoffs = new WeakSet();

function digest(data) {
  return createHash('sha256').update(data).digest('hex');
}

function exactKeys(record, keys) {
  return record && typeof record === 'object'
    && isDeepStrictEqual(Object.keys(record).sort(), [...keys].sort());
}

function requireEvidence(condition) {
  if (!condition) throw new Error('RAW_ROTATION_HANDOFF_EVIDENCE_INVALID');
}

export function rawRotationPairDigest({datasetId, productionReferenceAt, bundleContentSha256,
  bSourceHead, bVersion, sVersion}) {
  requireEvidence(typeof datasetId === 'string' && /^rr-[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(datasetId)
    && HOUR.test(productionReferenceAt ?? '') && Number.isFinite(Date.parse(productionReferenceAt))
    && SHA256.test(bundleContentSha256 ?? '') && HEAD.test(bSourceHead ?? '')
    && [bVersion, sVersion].every(version => Number.isSafeInteger(version) && version > 0));
  return digest(JSON.stringify([datasetId, productionReferenceAt, bundleContentSha256, bSourceHead, bVersion, sVersion]));
}

export function isAuthenticatedRawRotationHandoff(value) {
  return authenticatedHandoffs.has(value);
}

// Authenticate the compact wire form against its actual source and re-read the
// live numbered pair. Copying a JSON receipt cannot create this authority.
export async function authenticateRawRotationHandoff({bytes, scope, verifyArtifactProducer,
  readProtectedB, readProtectedSVersion}) {
  requireEvidence(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 1024);
  const receipt = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  requireEvidence(exactKeys(receipt, ['schemaVersion', 'kind', 'runId', 'runAttempt', 'sourceHead',
    'targetReferenceAt', 'cacheIdentitySha256', 'protectedPairSha256', 'privateProofSha256', 'verifiedCaptureCount'])
    && receipt.schemaVersion === 1 && receipt.kind === 'DMI_RAW_RESTORED_COVERAGE_HANDOFF_V1'
    && RUN_ID.test(receipt.runId ?? '') && receipt.runAttempt === '1' && HEAD.test(receipt.sourceHead ?? '')
    && HOUR.test(receipt.targetReferenceAt ?? '') && !receipt.targetReferenceAt.endsWith('.000Z')
    && ['runId', 'runAttempt', 'sourceHead', 'targetReferenceAt'].every(key => receipt[key] === scope[key])
    && [receipt.cacheIdentitySha256, receipt.protectedPairSha256, receipt.privateProofSha256]
      .every(value => typeof value === 'string' && SHA256.test(value))
    && Number.isSafeInteger(receipt.verifiedCaptureCount)
    && receipt.verifiedCaptureCount > 0 && receipt.verifiedCaptureCount <= 4096);
  await verifyArtifactProducer();
  const [b, sVersion] = await Promise.all([readProtectedB(), readProtectedSVersion()]);
  requireEvidence(b?.expectedZoneCount === 210 && b.expectedPartCount === 673);
  const {datasetId, productionReferenceAt, bundleContentSha256, sourceHead: bSourceHead, centralVersion: bVersion} = b;
  const boundary = Object.freeze({datasetId, productionReferenceAt, bundleContentSha256});
  const published = Object.freeze({bSourceHead, bVersion, sVersion});
  const hours = (Date.parse(receipt.targetReferenceAt) - Date.parse(productionReferenceAt)) / 3_600_000;
  requireEvidence(Number.isInteger(hours) && hours >= 1 && hours <= 72
    && rawRotationPairDigest({...boundary, ...published}) === receipt.protectedPairSha256);
  const authenticated = Object.freeze({receipt: Object.freeze(receipt), boundary, published});
  authenticatedHandoffs.add(authenticated);
  return authenticated;
}

// The checkout is public. Only operational identity, sizes of sets and hashes
// cross the job boundary. The protected weather identifiers stay on its runner.
export function projectPublicRawRotationProof(bytes, expectedProofDigest) {
  requireEvidence(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 4096
    && expectedProofDigest === digest(bytes));
  const proof = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  requireEvidence(exactKeys(proof, ['schemaVersion', 'kind', 'pairedBaseline', 'boundary', 'coverage'])
    && proof.schemaVersion === 1 && proof.kind === 'DMI_RAW_BOOTSTRAP_PRE_DMI_HANDOFF_V1');
  const {pairedBaseline, boundary, coverage} = proof;
  requireEvidence(exactKeys(boundary, ['datasetId', 'productionReferenceAt', 'bundleContentSha256',
    'checkpointGenerationSha256', 'conditionsSha256'])
    && SHA256.test(boundary.checkpointGenerationSha256 ?? '') && SHA256.test(boundary.conditionsSha256 ?? '')
    && exactKeys(pairedBaseline, ['schemaVersion', 'kind', 'bVersion', 'sVersion', 'bSourceHead', 'boundarySha256'])
    && pairedBaseline.schemaVersion === 1 && pairedBaseline.kind === 'DMI_PAIRED_RAW_BASELINE_V1'
    && pairedBaseline.boundarySha256 === digest(JSON.stringify(boundary, Object.keys(boundary).sort())));
  requireEvidence(exactKeys(coverage, ['schemaVersion', 'kind', 'runId', 'runAttempt', 'sourceHead',
    'targetReferenceAt', 'cacheIdentitySha256', 'baselineBoundarySha256', 'planSha256', 'allRequiredVerified',
    'requiredCaptures', 'protectedFiles', 'unavailableCaptures'])
    && coverage.schemaVersion === 1 && coverage.kind === 'DMI_RESTORED_RAW_SUCCESSOR_COVERAGE_V1'
    && RUN_ID.test(coverage.runId ?? '') && coverage.runAttempt === '1' && HEAD.test(coverage.sourceHead ?? '')
    && HOUR.test(coverage.targetReferenceAt ?? '') && !coverage.targetReferenceAt.endsWith('.000Z')
    && SHA256.test(coverage.cacheIdentitySha256 ?? '') && SHA256.test(coverage.planSha256 ?? '')
    && coverage.baselineBoundarySha256 === pairedBaseline.boundarySha256
    && coverage.allRequiredVerified === true && coverage.requiredCaptures === coverage.protectedFiles
    && Number.isSafeInteger(coverage.requiredCaptures) && coverage.requiredCaptures >= 1
    && coverage.requiredCaptures <= 4096 && coverage.unavailableCaptures === 0);
  const hours = (Date.parse(coverage.targetReferenceAt) - Date.parse(boundary.productionReferenceAt)) / 3_600_000;
  requireEvidence(Number.isInteger(hours) && hours >= 1 && hours <= 72);
  return {
    schemaVersion: 1,
    kind: 'DMI_RAW_RESTORED_COVERAGE_HANDOFF_V1',
    runId: coverage.runId,
    runAttempt: coverage.runAttempt,
    sourceHead: coverage.sourceHead,
    targetReferenceAt: coverage.targetReferenceAt,
    cacheIdentitySha256: coverage.cacheIdentitySha256,
    protectedPairSha256: rawRotationPairDigest({...boundary, ...pairedBaseline}),
    privateProofSha256: expectedProofDigest,
    verifiedCaptureCount: coverage.requiredCaptures,
  };
}

// Same-run acknowledgement, projected without IDs of deleted objects or
// operational details from the protected weather stores.
export function projectRawRotationDecision(scope, privateProofSha256, decision) {
  requireEvidence(RUN_ID.test(scope.runId ?? '') && scope.runAttempt === '1' && HEAD.test(scope.sourceHead ?? '')
    && HOUR.test(scope.targetReferenceAt ?? '') && !scope.targetReferenceAt.endsWith('.000Z')
    && SHA256.test(privateProofSha256 ?? '')
    && ['READY', 'HOLD'].includes(decision?.status)
    && Number.isSafeInteger(decision.retiredCount) && decision.retiredCount >= 0 && decision.retiredCount <= 2);
  return {schemaVersion: 1, kind: 'DMI_RAW_ROTATION_DECISION_V1',
    runId: scope.runId, runAttempt: scope.runAttempt, sourceHead: scope.sourceHead,
    targetReferenceAt: scope.targetReferenceAt, privateProofSha256,
    status: decision.status, retiredCount: decision.retiredCount};
}

export function requireRawRotationDecision(bytes, scope, privateProofSha256) {
  requireEvidence(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 1024);
  const decision = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  const expected = projectRawRotationDecision(scope, privateProofSha256, decision);
  requireEvidence(isDeepStrictEqual(expected, decision) && decision.status === 'READY');
  return decision;
}
