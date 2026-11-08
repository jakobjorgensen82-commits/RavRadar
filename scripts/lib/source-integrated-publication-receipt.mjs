import assert from 'node:assert/strict';
import { sha256CanonicalJson } from '../ravscore-operational-pages-recovery.mjs';
import { assertSourceSavedPairPagesProof } from './source-saved-pair-pages-proof.mjs';

const sha = /^[a-f0-9]{64}$/;
const head = /^[a-f0-9]{40}$/;
const positive = value => Number.isSafeInteger(value) && value > 0;
const same = (a, b) => sha256CanonicalJson(a) === sha256CanonicalJson(b);

export function sourceIntegratedPublicationPin({ handoff, manifest, seal, disposition, audit, livePin }) {
  assert(handoff?.schemaVersion === 'ravscore-operational-deploy-handoff-v2'
    && handoff.action === 'integrated' && handoff.legacySourceRequired === false
    && handoff.privatePayloadIncluded === false && positive(handoff.centralVersion)
    && handoff.codeOnlyRepair !== true && handoff.sourceRepairId == null,
  'SOURCE_PUBLICATION_HANDOFF');
  assert(head.test(handoff.sourceHead) && handoff.sourceHead === seal?.headSha
    && positive(seal.runId) && seal.runAttempt === 1
    && seal.attemptId === `pages-${seal.runId}-${seal.runAttempt}`
    && sha.test(seal.targetImplementationClosureSha256),
  'SOURCE_PUBLICATION_OCCURRENCE');
  assert(manifest?.schemaVersion === 4 && manifest.complete === true
    && manifest.zoneCount === 210 && manifest.coastalPartCount === 673
    && typeof manifest.datasetId === 'string'
    && manifest.datasetId === handoff.checkpointDatasetId
    && seal.targetPublicManifestSha256 === sha256CanonicalJson(manifest)
    && same(seal.targetModelBinding, manifest.ravScoreModelBinding),
  'SOURCE_PUBLICATION_MANIFEST');

  const saved = handoff.checkpointDisposition === 'SAVED_PAIR_READBACK_VERIFIED';
  if (saved) {
    const savedPair = assertSourceSavedPairPagesProof({
      handoff, manifest, runtimeAudit: audit, disposition, artifactSeal: seal,
      expectedIdentity: { repository: seal.repository, sourceHead: seal.headSha,
        runId: seal.runId, runAttempt: seal.runAttempt },
    });
    assert(savedPair.pointerVersion === livePin?.pointerVersion
      && savedPair.pointerSha256 === livePin?.pointerSha256
      && savedPair.checkpointVersion === livePin?.checkpointVersion
      && savedPair.bundleContentSha256 === livePin?.descriptor?.bundleContentSha256,
    'SOURCE_PUBLICATION_SAVED_PAIR_CHANGED');
  } else {
    assert(handoff.savedWeatherContinuation !== true
      && ['READY_PUBLISHED', 'MEASURED_WARMUP_PUBLISHED'].includes(handoff.checkpointDisposition)
      && handoff.checkpointBuildOutcome === 'success'
      && handoff.checkpointSaveOutcome === 'success'
      && handoff.checkpointPublishOutcome === 'success'
      && livePin?.descriptor?.sourceHead === seal.headSha,
    'SOURCE_PUBLICATION_NORMAL_PAIR_UNPROVED');
    const { bindingSha256, ...binding } = disposition;
    assert(disposition.schemaVersion === 'ravscore-continuation-checkpoint-disposition-v1'
      && disposition.privatePayloadIncluded === false && disposition.checkpointRequired === true
      && disposition.sourceHead === handoff.sourceHead && disposition.datasetId === manifest.datasetId
      && disposition.disposition === handoff.checkpointDisposition
      && bindingSha256 === handoff.checkpointDispositionSha256
      && bindingSha256 === sha256CanonicalJson(binding)
      && disposition.runtimeAuditSha256 === handoff.checkpointRuntimeAuditSha256
      && disposition.runtimeAuditSha256 === sha256CanonicalJson(audit)
      && audit.datasetId === manifest.datasetId
      && audit.productionReferenceAt === manifest.productionReferenceAt,
    'SOURCE_PUBLICATION_NORMAL_DISPOSITION_CHANGED');
  }

  const descriptor = livePin?.descriptor;
  assert(sha.test(livePin?.pin ?? '') && positive(livePin?.pointerVersion)
    && positive(livePin?.checkpointVersion)
    && descriptor?.datasetId === manifest.datasetId
    && Date.parse(descriptor.productionReferenceAt) === Date.parse(manifest.productionReferenceAt)
    && Date.parse(descriptor.generatedAt) === Date.parse(manifest.generatedAt)
    && same(descriptor.modelBinding, manifest.ravScoreModelBinding),
  'SOURCE_PUBLICATION_CURRENT_PAIR');
  return Object.freeze({
    schemaVersion: 'ravradar-source-integrated-publication-pin-v1',
    pairSha256: livePin.pin,
    targetManifestSha256: seal.targetPublicManifestSha256,
    sourceHead: seal.headSha,
    deploymentId: seal.attemptId,
    privatePayloadIncluded: false,
  });
}

export function assertSourceIntegratedPublicationPin(evidence) {
  const expected = sourceIntegratedPublicationPin(evidence);
  assert.deepEqual(evidence.handoff.sourceContinuationPin, expected,
    'SOURCE_PUBLICATION_PROTECTED_PAIR_CHANGED');
  return expected;
}
