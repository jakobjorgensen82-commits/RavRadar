import assert from 'node:assert/strict';
import {
  assertUploadedOperationalPagesTarget,
  sha256CanonicalJson,
} from '../ravscore-operational-pages-recovery.mjs';

export const SOURCE_SAVED_PAIR_DISPOSITION = 'SAVED_PAIR_READBACK_VERIFIED';

const DISPOSITION_FIELDS = [
  'bindingSha256', 'checkpointRequired', 'datasetId', 'disposition',
  'privatePayloadIncluded', 'rollbackActivationReady', 'rollbackStatus',
  'runtimeAuditSha256', 'savedPairReadback', 'schemaVersion', 'sourceHead',
];
const PIN_DIGEST_FIELDS = [
  'pointerSha256', 'bundleContentSha256', 'bundleManifestSha256', 'checkpointSha256',
  'registrySha256', 'targetManifestSha256',
];
const PROOF_FIELDS = [
  ...PIN_DIGEST_FIELDS, 'pointerVersion', 'checkpointVersion', 'datasetId',
  'productionReferenceAt', 'sourceHead', 'runId', 'runAttempt',
];
const SHA256 = /^[a-f0-9]{64}$/;
const HEAD = /^[a-f0-9]{40}$/;
const DATASET = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const UTC_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00[.]000Z$/;

const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const object = value => value !== null && typeof value === 'object'
  && Object.getPrototypeOf(value) === Object.prototype;

function exactFields(value, fields, label) {
  assert(object(value), label);
  assert(Object.keys(value).length === fields.length
    && fields.every(key => Object.hasOwn(value, key)), label);
}

/**
 * Check only the saved-pair branch, after authenticating the producer identity.
 * The normal caller still owns artifact authentication, implementation-closure
 * checks, live readback of the B/S pins, and deployment authority.
 */
export function assertSourceSavedPairPagesProof(options) {
  exactFields(options, ['handoff', 'manifest', 'runtimeAudit', 'disposition',
    'artifactSeal', 'expectedIdentity'], 'SOURCE_SAVED_PAIR_ARGUMENTS');
  const { handoff, manifest, runtimeAudit, disposition, artifactSeal, expectedIdentity } = options;
  exactFields(expectedIdentity, ['repository', 'sourceHead', 'runId', 'runAttempt'],
    'SOURCE_SAVED_PAIR_EXPECTED_IDENTITY');
  const { repository, sourceHead, runId, runAttempt } = expectedIdentity;
  assert(matches(sourceHead, HEAD) && positive(runId) && positive(runAttempt),
    'SOURCE_SAVED_PAIR_EXPECTED_IDENTITY');

  exactFields(disposition, DISPOSITION_FIELDS, 'SOURCE_SAVED_PAIR_DISPOSITION_FIELDS');
  assert(disposition.schemaVersion === 'ravscore-continuation-checkpoint-disposition-v1'
    && disposition.disposition === SOURCE_SAVED_PAIR_DISPOSITION
    && disposition.privatePayloadIncluded === false
    && disposition.checkpointRequired === true && disposition.sourceHead === sourceHead,
  'SOURCE_SAVED_PAIR_DISPOSITION');

  const proof = disposition.savedPairReadback;
  exactFields(proof, PROOF_FIELDS, 'SOURCE_SAVED_PAIR_PROOF_FIELDS');
  assert(PIN_DIGEST_FIELDS.every(key => matches(proof[key], SHA256))
    && positive(proof.pointerVersion) && positive(proof.checkpointVersion),
  'SOURCE_SAVED_PAIR_PIN_SHAPE');
  assert(proof.sourceHead === sourceHead && proof.runId === runId && proof.runAttempt === runAttempt,
    'SOURCE_SAVED_PAIR_PRODUCER');
  assert(matches(proof.datasetId, DATASET) && matches(proof.productionReferenceAt, UTC_HOUR)
    && proof.productionReferenceAt === manifest?.productionReferenceAt
    && proof.datasetId === manifest.datasetId && proof.datasetId === disposition.datasetId,
  'SOURCE_SAVED_PAIR_TARGET');
  assert(manifest.schemaVersion === 4 && manifest.complete === true
    && manifest.zoneCount === 210 && manifest.coastalPartCount === 673,
  'SOURCE_SAVED_PAIR_TARGET_INVENTORY');

  assert(object(artifactSeal) && artifactSeal.artifactName === 'github-pages'
    && matches(artifactSeal.targetImplementationClosureSha256, SHA256), 'SOURCE_SAVED_PAIR_SEAL');
  const targetManifestSha256 = assertUploadedOperationalPagesTarget({
    seal: artifactSeal,
    workflowIdentity: {
      repository, runId, runAttempt, headSha: sourceHead, ref: 'refs/heads/main',
      attemptId: `pages-${runId}-${runAttempt}`,
    },
    targetManifest: manifest,
    targetModelBinding: manifest.ravScoreModelBinding,
    implementationClosureSha256: artifactSeal.targetImplementationClosureSha256,
  });
  assert(proof.targetManifestSha256 === targetManifestSha256, 'SOURCE_SAVED_PAIR_TARGET_DIGEST');

  const auditBinding = manifest.ravScoreModelBinding;
  assert(runtimeAudit?.schemaVersion === 1 && runtimeAudit.status === 'passed'
    && runtimeAudit.datasetId === proof.datasetId
    && runtimeAudit.productionReferenceAt === proof.productionReferenceAt
    && ['modelId', 'stateSchemaVersion', 'modelContractSha256', 'modelBundleSha256']
      .every(key => runtimeAudit.model?.[key] === auditBinding[key])
    && runtimeAudit.coverage?.zoneCount === 210 && runtimeAudit.coverage?.partCount === 673
    && runtimeAudit.payload?.privacyContractPassed === true,
  'SOURCE_SAVED_PAIR_RUNTIME_AUDIT');
  const { rollbackStatus, rollbackActivationReady } = disposition;
  assert((rollbackStatus === 'READY' && rollbackActivationReady === true
      || rollbackStatus === 'BUILDING_MEASURED_ONLY' && rollbackActivationReady === false)
    && runtimeAudit.rollback?.status === rollbackStatus
    && runtimeAudit.rollback?.activationReady === rollbackActivationReady,
  'SOURCE_SAVED_PAIR_ROLLBACK_STATE');

  const { bindingSha256, ...bound } = disposition;
  assert(matches(bindingSha256, SHA256) && sha256CanonicalJson(bound) === bindingSha256
    && matches(disposition.runtimeAuditSha256, SHA256)
    && sha256CanonicalJson(runtimeAudit) === disposition.runtimeAuditSha256,
  'SOURCE_SAVED_PAIR_DISPOSITION_DIGEST');
  assert(handoff?.schemaVersion === 'ravscore-operational-deploy-handoff-v2'
    && handoff.action === 'integrated' && handoff.sourceHead === sourceHead
    && handoff.privatePayloadIncluded === false && handoff.legacySourceRequired === false
    && handoff.savedWeatherContinuation === true && handoff.codeOnlyRepair === false
    && handoff.sourceRepairId == null
    && handoff.checkpointDisposition === SOURCE_SAVED_PAIR_DISPOSITION
    && handoff.checkpointDispositionSha256 === bindingSha256
    && handoff.checkpointDatasetId === proof.datasetId
    && handoff.checkpointRuntimeAuditSha256 === disposition.runtimeAuditSha256,
  'SOURCE_SAVED_PAIR_HANDOFF_BINDING');
  assert(handoff.checkpointBuildOutcome === 'success' && handoff.checkpointSaveOutcome === 'skipped'
    && handoff.checkpointPublishOutcome === 'skipped', 'SOURCE_SAVED_PAIR_OUTCOMES');

  return Object.freeze({ ...proof });
}
