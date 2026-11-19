import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';

const SHA256 = /^[0-9a-f]{64}$/;
const HEAD = /^[0-9a-f]{40}$/;
const RUN_ID = /^[1-9][0-9]{0,19}$/;
const HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00(?:\.000)?Z$/;

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
