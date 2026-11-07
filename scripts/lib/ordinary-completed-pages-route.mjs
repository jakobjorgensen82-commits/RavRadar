import assert from 'node:assert/strict';

const sha256 = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
const exactHour = /^\d{4}-\d\d-\d\dT\d\d:00:00(?:\.000)?Z$/;
const positive = value => Number.isSafeInteger(value) && value > 0;

function hour(value) {
  assert(exactHour.test(value ?? '') && Number.isFinite(Date.parse(value)), 'PAGES_SAVED_INVALID_HOUR');
  return Date.parse(value);
}

function requireSameBinding(left, right) {
  for (const key of ['modelId', 'stateSchemaVersion', 'modelContractSha256', 'modelBundleSha256']) {
    assert(typeof left?.[key] === 'string' && left[key].length > 0, 'PAGES_SAVED_MISSING_BINDING');
    assert.equal(left[key], right?.[key], 'PAGES_SAVED_BINDING_CHANGED');
  }
}

// This selects one read-only route. The caller still authenticates current B,
// compares the whole S checkpoint and repeats normal no-loss and Pages gates.
export function classifyOrdinaryPagesContinuation({
  head, consumerRunId, publicManifest, publicManifestSha256,
  active, saved, targetManifest, targetManifestSha256, seal, cancelled, visibilityExhausted,
}) {
  assert(commit.test(head ?? '') && positive(consumerRunId), 'PAGES_SAVED_INVALID_CALLER');
  assert(publicManifest?.complete === true && publicManifest.zoneCount === 210
    && publicManifest.coastalPartCount === 673 && sha256.test(publicManifestSha256 ?? ''),
  'PAGES_SAVED_PUBLIC_INCOMPLETE');
  assert(active?.model === 'integrated' && active.status === 'INTEGRATED_ACTIVE'
    && active.pending === false && active.datasetId === publicManifest.datasetId
    && hour(active.productionReferenceAt) === hour(publicManifest.productionReferenceAt)
    && active.publicManifestSha256 === publicManifestSha256, 'PAGES_SAVED_PUBLIC_BASE_CHANGED');

  const priorHour = hour(publicManifest.productionReferenceAt);
  const savedHour = hour(saved?.productionReferenceAt);
  requireSameBinding(saved?.modelBinding, publicManifest.ravScoreModelBinding);
  assert(savedHour >= priorHour, 'PAGES_SAVED_BEHIND_PUBLIC');
  if (savedHour === priorHour) {
    assert(saved.datasetId === publicManifest.datasetId && saved.generatedAt === publicManifest.generatedAt,
      'PAGES_SAVED_SAME_HOUR_CHANGED');
    return Object.freeze({ route: 'ordinary' });
  }

  assert(saved.datasetId !== publicManifest.datasetId, 'PAGES_SAVED_REUSED_DATASET');
  if (visibilityExhausted != null) {
    assert(cancelled == null && seal == null && targetManifest == null && targetManifestSha256 == null
      && visibilityExhausted.kind === 'PAGES_ARTIFACT_VISIBILITY_EXHAUSTED_CONFIRMED'
      && positive(visibilityExhausted.runId) && visibilityExhausted.runId < consumerRunId
      && visibilityExhausted.runAttempt === 1 && visibilityExhausted.headSha === head
      && positive(visibilityExhausted.jobId) && positive(visibilityExhausted.artifactId)
      && sha256.test(visibilityExhausted.artifactDigestSha256 ?? ''), 'PAGES_SAVED_VISIBILITY_NOT_EXACT');
    assert(saved.sourceHead === head && sha256.test(saved.bundleContentSha256 ?? '')
      && Date.parse(saved.generatedAt) > Date.parse(publicManifest.generatedAt), 'PAGES_SAVED_VISIBILITY_TARGET_DRIFT');
    return Object.freeze({
      route: 'resume-completed',
      productionReferenceAt: new Date(savedHour).toISOString().replace('.000Z', 'Z'),
      producerRunId: visibilityExhausted.runId,
      producerRunAttempt: visibilityExhausted.runAttempt,
      publicManifestSha256,
    });
  }
  if (cancelled == null) return Object.freeze({ route: 'unresolved' });
  assert(cancelled.kind === 'PAGES_DEPLOYMENT_CANCELLED_CONFIRMED'
    && positive(cancelled.jobId) && positive(cancelled.runId) && cancelled.runId < consumerRunId
    && cancelled.runAttempt === 1 && cancelled.headSha === head
    && positive(cancelled.artifactId) && sha256.test(cancelled.artifactDigestSha256 ?? ''),
  'PAGES_SAVED_CANCELLATION_NOT_EXACT');

  assert(seal?.artifactName === 'github-pages' && seal.ref === 'refs/heads/main'
    && seal.headSha === head && seal.runId === cancelled.runId && seal.runAttempt === cancelled.runAttempt
    && seal.artifactId === cancelled.artifactId
    && seal.artifactDigestSha256 === cancelled.artifactDigestSha256
    && seal.targetPublicManifestSha256 === targetManifestSha256 && sha256.test(targetManifestSha256 ?? ''),
  'PAGES_SAVED_ARTIFACT_DRIFT');
  assert(targetManifest?.complete === true && targetManifest.zoneCount === 210
    && targetManifest.coastalPartCount === 673 && targetManifest.datasetId === saved.datasetId
    && hour(targetManifest.productionReferenceAt) === savedHour
    && targetManifest.generatedAt === saved.generatedAt
    && Date.parse(targetManifest.generatedAt) > Date.parse(publicManifest.generatedAt)
    && saved.sourceHead === head, 'PAGES_SAVED_TARGET_DRIFT');
  requireSameBinding(saved.modelBinding, targetManifest.ravScoreModelBinding);

  return Object.freeze({
    route: 'resume-completed',
    productionReferenceAt: new Date(savedHour).toISOString().replace('.000Z', 'Z'),
    producerRunId: cancelled.runId,
    producerRunAttempt: cancelled.runAttempt,
    publicManifestSha256,
    targetManifestSha256,
  });
}
