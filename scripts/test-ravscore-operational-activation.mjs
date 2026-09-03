import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ravScoreModelBinding as integratedModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateModelBinding } from './rollback-assets/ravscore-model-contract.js';
import { CANDIDATE_G_OPERATIONAL_ROLLBACK_ID } from './lib/ravscore-candidate-g-rollback-runtime.mjs';
import {
  assertLegacyCandidateGCentralProfile,
  legacyCandidateGCentralProfile,
  legacyCandidateGControllerBinding,
  legacyCandidateGSourceIdentity,
} from './lib/ravscore-legacy-candidate-g-source.mjs';
import { buildIntegratedCutoverReadiness } from './integrated-cutover-readiness.mjs';
import {
  LEGACY_CANDIDATE_G_ATTESTATION_SCHEMA,
  LEGACY_CANDIDATE_G_VERIFICATION_SCHEMA,
} from './verify-legacy-candidate-g-source.mjs';
import {
  assertCandidateActivationPlan,
  assertCandidateRefreshPlan,
  assertHistoricalCandidateRefreshPlan,
  assertIntegratedHistoricalMaintenancePlan,
  assertIntegratedReturnPlan,
  assertLegacyCandidateRefreshPlan,
  assertOperationalActivationDocument,
  candidateGOperationalProfileDocument,
  operationalActivationTransition,
  operationalCandidateRefreshTransition,
  operationalCentralProfileForTransition,
  operationalIntegratedHistoricalMaintenanceTransition,
  operationalIntegratedMaintenanceTransition,
  operationalIntegratedReturnTransition,
  operationalLegacyCandidateRefreshTransition,
  operationalPendingReconciliationClassification,
  operationalPendingReconciliationStabilization,
  operationalPendingReconciliationTransition,
  operationalResolvedBindingCurrent,
  prepareIntegratedHistoricalMaintenance,
  prepareIntegratedOperationalReturn,
  RAVSCORE_INTEGRATED_RETURN_POLICY,
  RAVSCORE_OPERATIONAL_STATUSES,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS,
  resolveOperationalRavScoreModel,
} from './ravscore-operational-activation.mjs';

const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => crypto.createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(canonical(value)))
  .digest('hex');
const sourceHead = 'a'.repeat(40);
const laterHead = 'b'.repeat(40);
const now = '2026-08-29T13:00:00.000Z';
const defaultImplementationClosureSha256 = 'a'.repeat(64);
const legacyImplementationClosureSha256 = '8'.repeat(64);

const integratedProfile = JSON.parse(await fs.readFile(
  new URL('../data/admin/ravscore-profile-selection.json', import.meta.url), 'utf8'));
const integratedProfileRow = Object.freeze({ version: 7, payload: integratedProfile });
const candidateProfile = candidateGOperationalProfileDocument(integratedProfile);
const candidateProfileRow = Object.freeze({ version: 8, payload: candidateProfile });
const readiness = await buildIntegratedCutoverReadiness(sourceHead, {
  publicImplementationClosureSha256: defaultImplementationClosureSha256,
});

function manifest(binding, datasetId, productionReferenceAt) {
  return Object.freeze({
    schemaVersion: 4,
    datasetId,
    productionReferenceAt,
    complete: true,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: structuredClone(binding),
  });
}

function verification(model, binding, publicManifest, head = sourceHead) {
  return Object.freeze({
    schemaVersion: 'ravscore-operational-pages-verification-v1',
    status: 'passed',
    sourceHead: head,
    datasetId: publicManifest.datasetId,
    productionReferenceAt: publicManifest.productionReferenceAt,
    model,
    modelBinding: structuredClone(binding),
    implementationClosureSha256: defaultImplementationClosureSha256,
    publicManifestSha256: sha256(publicManifest),
    zoneCount: 210,
    coastalPartCount: 673,
    privatePayloadRead: false,
  });
}

let observationSequence = 0;
function observations(...manifests) {
  const base = Date.parse('2026-08-29T13:30:00.000Z')
    + observationSequence * 60_000;
  observationSequence += 1;
  return manifests.map((publicManifest, index) => Object.freeze({
    manifest: publicManifest,
    observationNonce: `observation-${observationSequence}-${index + 1}`,
    observedAt: new Date(base + index * 2_000).toISOString(),
  }));
}

function integratedAudit(binding = integratedModelBinding(), {
  rollbackStatus = 'READY',
  allCurrentScoresFullHistory = true,
} = {}) {
  const rollbackActivationReady = rollbackStatus === 'READY';
  return Object.freeze({
    schemaVersion: 1,
    status: 'passed',
    model: Object.freeze({
      modelId: binding.modelId,
      stateSchemaVersion: binding.stateSchemaVersion,
      modelContractSha256: binding.modelContractSha256,
      modelBundleSha256: binding.modelBundleSha256,
    }),
    coverage: Object.freeze({
      expectedZoneCount: 210,
      zoneCount: 210,
      expectedPartCount: 673,
      partCount: 673,
    }),
    history: Object.freeze({
      allCurrentScoresFullHistory,
      currentFullHistoryModeCount: allCurrentScoresFullHistory ? 420 : 0,
      currentHistoryIncompleteModeCount: allCurrentScoresFullHistory ? 0 : 420,
    }),
    rollback: Object.freeze({
      status: rollbackStatus,
      activationReady: rollbackActivationReady,
      descriptorValid: true,
      generationReferenceBound: true,
      runtimePartCount: 673,
      readyPartCount: rollbackActivationReady ? 673 : 0,
      reconstructedFromIntegratedState: false,
    }),
    payload: Object.freeze({
      privacyContractPassed: true,
      publicStateOrEvidenceIncluded: false,
      publicRawVectorIncluded: false,
      publicUnapprovedCoordinateIncluded: false,
      publicShadowIncluded: false,
    }),
    errors: Object.freeze([]),
    errorCounts: Object.freeze({}),
  });
}

function sealedHistoricalInitialPlan({
  currentRow = null,
  currentProfileRow,
  sourceModelBinding,
  publicManifest,
  publicAudit,
  sourceImplementationClosureSha256,
  requestedImplementationClosureSha256 = defaultImplementationClosureSha256,
  legacySourceRequired,
} = {}) {
  const unsealed = {
    schemaVersion: RAVSCORE_INTEGRATED_RETURN_POLICY.schemaVersion,
    kind: RAVSCORE_INTEGRATED_RETURN_POLICY.kind,
    mode: RAVSCORE_INTEGRATED_RETURN_POLICY.mode,
    transitionKind: RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover,
    sourceHead,
    datasetId: publicManifest.datasetId,
    productionReferenceAt: publicManifest.productionReferenceAt,
    centralExpectedVersion: Number(currentRow?.version ?? 0),
    sourceModelBinding: structuredClone(sourceModelBinding),
    activeModelBinding: integratedModelBinding(),
    legacySourceRequired,
    sourceImplementationClosureSha256,
    requestedImplementationClosureSha256,
    candidateActivationDocumentSha256: sha256(
      currentRow?.payload ?? currentProfileRow.payload,
    ),
    integratedReadinessSha256: sha256(readiness),
    integratedPublicAuditSha256: sha256(publicAudit),
    integratedManifestSha256: sha256(publicManifest),
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligibleAfterVerifiedActivation:
      publicAudit.history.allCurrentScoresFullHistory,
    privatePayloadLogged: false,
  };
  return Object.freeze({ ...unsealed, planSha256: sha256(unsealed) });
}

function candidatePlan({
  mode = 'execute',
  centralExpectedVersion,
  sourceBinding,
  datasetId,
  productionReferenceAt,
  salt,
  sourceImplementationClosureSha256 = defaultImplementationClosureSha256,
  requestedImplementationClosureSha256 = defaultImplementationClosureSha256,
  targetBinding = candidateModelBinding(),
  targetProfile = candidateProfile,
}) {
  const activation = {
    schemaVersion: '1.0.0',
    kind: 'RAVSCORE_CANDIDATE_G_OPERATIONAL_ROLLBACK_PLAN',
    mode,
    sourceHead,
    datasetId,
    productionReferenceAt,
    privateBundleContentSha256: salt.repeat(64),
    sourceImplementationClosureSha256,
    requestedImplementationClosureSha256,
    centralExpectedVersion,
    sourceModelBinding: structuredClone(sourceBinding),
    activeModelBinding: structuredClone(targetBinding),
    candidateTargetProfileSha256: sha256(targetProfile),
    rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligible: false,
  };
  const planBody = {
    ...activation,
    candidateTargetProfile: structuredClone(targetProfile),
  };
  return Object.freeze({
    ...planBody,
    planSha256: sha256(planBody),
    candidateFullSha256: String.fromCharCode(salt.charCodeAt(0) + 1).repeat(64),
    privatePayloadLogged: false,
  });
}

function candidateProfileForBinding(binding) {
  return Object.freeze({
    ...candidateProfile,
    requestedProfileId: binding.modelId,
    activeModelId: binding.modelId,
    stateSchemaVersion: binding.stateSchemaVersion,
    variantId: binding.variantId,
    profileId: binding.profileId,
    componentSchemaId: binding.componentSchemaId,
    explanationSchemaId: binding.explanationSchemaId,
    rankingPolicyId: binding.rankingPolicyId,
    bestTimePolicyId: binding.bestTimePolicyId,
    presentationPolicyId: binding.presentationPolicyId,
    modelContractSha256: binding.modelContractSha256,
    modelBundleSha256: binding.modelBundleSha256,
  });
}

function terminalEvidence(
  pendingRow,
  sourceManifest,
  status = 'FAILED_BEFORE_PAGES_ACCEPTANCE',
  checkedAt = '2026-08-29T13:05:00.000Z',
) {
  return Object.freeze({
    schemaVersion: 'ravscore-operational-pages-attempt-terminal-v1',
    transitionSourceHead: pendingRow.payload.sourceHead,
    requestedPublicManifestSha256: pendingRow.payload.requestedPublicManifestSha256,
    attemptId: pendingRow.payload.deploymentId,
    status,
    pagesRequestAccepted: false,
    observedSourcePublicManifestSha256: sha256(sourceManifest),
    checkedAt,
    evidenceSource: 'github-actions-pages-terminal-readback',
    privatePayloadRead: false,
  });
}

const integratedH0 = manifest(integratedModelBinding(),
  'rr-20260829110000-210', '2026-08-29T11:00:00.000Z');
const candidateH0 = manifest(candidateModelBinding(),
  'rr-20260829120000-210', '2026-08-29T12:00:00.000Z');
const integratedH0Verification = verification('integrated', integratedModelBinding(), integratedH0);
const candidateH0Verification = verification('candidate-g', candidateModelBinding(), candidateH0);

// Manual rollback is a durable PENDING -> ACTIVE transition. A source-only
// observation never authorizes an abort; terminal attempt evidence does.
const rollbackPlan = candidatePlan({
  centralExpectedVersion: 0,
  sourceBinding: integratedModelBinding(),
  datasetId: candidateH0.datasetId,
  productionReferenceAt: candidateH0.productionReferenceAt,
  salt: '1',
});
assertCandidateActivationPlan(rollbackPlan, {
  expectedSourceHead: sourceHead,
  expectedCentralVersion: 0,
});
const rollbackBegin = operationalActivationTransition({
  action: 'begin',
  currentRow: null,
  currentProfileRow: integratedProfileRow,
  expectedVersion: 0,
  plan: rollbackPlan,
  sourceManifest: integratedH0,
  sourceVerification: integratedH0Verification,
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-integrated-h0',
  deploymentId: 'run-rollback-h1',
  now,
});
const rollbackPendingRow = Object.freeze({ version: 1, payload: rollbackBegin.document });
assert.equal(rollbackBegin.document.status, RAVSCORE_OPERATIONAL_STATUSES.candidatePending);
assert.equal(rollbackBegin.document.deploymentId, 'run-rollback-h1');
assert.deepEqual(rollbackBegin.document.sourceModelBinding, integratedModelBinding());
assert.equal(rollbackBegin.document.sourceImplementationClosureSha256,
  defaultImplementationClosureSha256);
assert.equal(rollbackBegin.document.requestedImplementationClosureSha256,
  defaultImplementationClosureSha256);
assert.throws(() => resolveOperationalRavScoreModel(rollbackPendingRow), /pending.*fail closed/i);
assert.equal(operationalPendingReconciliationClassification({
  currentRow: rollbackPendingRow,
  publicManifest: integratedH0,
}).action, 'wait');
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  publicManifest: integratedH0,
  observations: observations(integratedH0, integratedH0),
}), /wait.*no CAS/i);
const crossRunRollbackAbort = operationalPendingReconciliationTransition({
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  publicManifest: integratedH0,
  observations: observations(integratedH0, integratedH0),
  publicVerification: integratedH0Verification,
  terminalEvidence: terminalEvidence(rollbackPendingRow, integratedH0, 'NOT_STARTED'),
  failureCode: 'HEAD_A_CANCELLED_BEFORE_PAGES',
  now: '2026-08-29T13:06:00.000Z',
});
assert.equal(crossRunRollbackAbort.document.status, RAVSCORE_OPERATIONAL_STATUSES.integrated);
assert.deepEqual(crossRunRollbackAbort.document.activeModelBinding, integratedModelBinding());
assert.deepEqual(crossRunRollbackAbort.document.requestedModelBinding, candidateModelBinding(),
  'historical source abort must preserve the sealed target history');
assert.deepEqual(operationalCentralProfileForTransition({
  transition: crossRunRollbackAbort,
  currentProfile: integratedProfile,
  integratedProfile,
}), integratedProfile, 'runner B must preserve the source profile while aborting head A');
assert.throws(() => operationalActivationTransition({
  action: 'abort',
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  plan: rollbackPlan,
  sourceManifest: integratedH0,
  sourceVerification: integratedH0Verification,
  failureCode: 'PAGES_FAILED',
}), /terminal/i);
assert.throws(() => operationalActivationTransition({
  action: 'complete',
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  plan: rollbackPlan,
  publicManifest: candidateH0,
  publicVerification: {
    ...candidateH0Verification,
    implementationClosureSha256: 'f'.repeat(64),
  },
  deploymentId: 'pages-candidate-mutated-closure',
}), /exact public Pages verification/,
'completion must not accept a closure described only after begin');
const rollbackAbort = operationalActivationTransition({
  action: 'abort',
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  plan: rollbackPlan,
  sourceManifest: integratedH0,
  sourceVerification: integratedH0Verification,
  terminalEvidence: terminalEvidence(rollbackPendingRow, integratedH0),
  failureCode: 'PAGES_FAILED',
});
assert.equal(rollbackAbort.document.status, RAVSCORE_OPERATIONAL_STATUSES.integrated);
assert.equal(rollbackAbort.document.failureCode, 'PAGES_FAILED');

const rollbackComplete = operationalActivationTransition({
  action: 'complete',
  currentRow: rollbackPendingRow,
  expectedVersion: 1,
  plan: rollbackPlan,
  publicManifest: candidateH0,
  publicVerification: candidateH0Verification,
  deploymentId: 'pages-candidate-h0',
  now: '2026-08-29T13:01:00.000Z',
});
const candidateActiveRow = Object.freeze({ version: 2, payload: rollbackComplete.document });
assert.equal(rollbackComplete.document.status, RAVSCORE_OPERATIONAL_STATUSES.candidateActive);
assert.equal(rollbackComplete.document.calibrationEligible, false);
assert.deepEqual(rollbackComplete.document.sourceModelBinding, integratedModelBinding());
assert.deepEqual(rollbackComplete.document.requestedModelBinding, candidateModelBinding());

// Candidate maintenance is itself two phase. Delayed Pages visibility can move
// source -> target and complete, but a target -> source reversal or third hash
// cannot mutate central truth.
const candidateH1 = manifest(candidateModelBinding(),
  'rr-20260829121500-210', '2026-08-29T12:15:00.000Z');
const candidateH1Verification = verification('candidate-g', candidateModelBinding(), candidateH1);
const refreshPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 2,
  sourceBinding: candidateModelBinding(),
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: '3',
});
assertCandidateRefreshPlan(refreshPlan, { expectedCentralVersion: 2 });
const refreshBegin = operationalCandidateRefreshTransition({
  action: 'refresh-begin',
  currentRow: candidateActiveRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 2,
  plan: refreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  requestedManifest: candidateH1,
  deploymentId: 'run-candidate-refresh-h1',
  now: '2026-08-29T13:02:00.000Z',
});
const refreshPendingRow = Object.freeze({ version: 3, payload: refreshBegin.document });
assert.equal(refreshBegin.document.status, RAVSCORE_OPERATIONAL_STATUSES.candidatePending);
assert.equal(refreshBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh);
assert.throws(() => assertOperationalActivationDocument({
  ...refreshBegin.document,
  transitionKind:
    RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefreshBeforeInitialCutover,
}), /Pending Candidate G transition must preserve its exact active source/,
'an ordinary refresh without sealed initial-cutover lineage may not be relabelled');
assert.deepEqual(refreshBegin.document.sourceModelBinding, candidateModelBinding());
assert.deepEqual(refreshBegin.document.requestedModelBinding, candidateModelBinding());
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: observations(candidateH0, candidateH0),
}).action, 'wait');
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: observations(candidateH0, candidateH1),
}).action, 'wait', 'one final target observation is not bounded stabilization');
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: observations(candidateH0, candidateH0, candidateH1, candidateH1),
}).action, 'complete');
assert.throws(() => operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: (() => {
    const duplicateNonce = observations(candidateH1, candidateH1).map(item => ({ ...item }));
    duplicateNonce[1].observationNonce = duplicateNonce[0].observationNonce;
    return duplicateNonce;
  })(),
}), /distinct nonces and ordered timestamps/);
assert.throws(() => operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: observations(candidateH1),
}), /two to twelve bounded observations/);
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: observations(candidateH1, candidateH0),
}).action, 'third');
const thirdCandidate = manifest(candidateModelBinding(),
  'rr-20260829121600-210', '2026-08-29T12:16:00.000Z');
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: refreshPendingRow,
  observations: observations(candidateH0, thirdCandidate),
}).action, 'third');
const refreshReconciled = operationalPendingReconciliationTransition({
  currentRow: refreshPendingRow,
  expectedVersion: 3,
  publicManifest: candidateH1,
  observations: observations(candidateH0, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  deploymentId: 'pages-candidate-h1',
  candidatePlan: refreshPlan,
  now: '2026-08-29T13:03:00.000Z',
});
assert.equal(refreshReconciled.document.status, RAVSCORE_OPERATIONAL_STATUSES.candidateActive);
assert.equal(refreshReconciled.document.publicManifestSha256, sha256(candidateH1));

const refreshAbort = operationalCandidateRefreshTransition({
  action: 'refresh-abort',
  currentRow: refreshPendingRow,
  expectedVersion: 3,
  plan: refreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(refreshPendingRow, candidateH0),
  failureCode: 'PAGES_NOT_ACCEPTED',
});
assert.equal(refreshAbort.document.status, RAVSCORE_OPERATIONAL_STATUSES.candidateActive);
assert.deepEqual(refreshAbort.document.sourceModelBinding, candidateModelBinding());
assert.deepEqual(refreshAbort.document.requestedModelBinding, candidateModelBinding());
const crossRunRefreshAbort = operationalPendingReconciliationTransition({
  currentRow: refreshPendingRow,
  expectedVersion: 3,
  publicManifest: candidateH0,
  observations: observations(candidateH0, candidateH0),
  publicVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(refreshPendingRow, candidateH0,
    'FAILED_BEFORE_PAGES_ACCEPTANCE'),
  failureCode: 'HEAD_A_REFRESH_CANCELLED',
});
assert.equal(crossRunRefreshAbort.document.status,
  RAVSCORE_OPERATIONAL_STATUSES.candidateActive);
assert.deepEqual(crossRunRefreshAbort.document.activeModelBinding, candidateModelBinding());

// Explicit return keeps Candidate active while PENDING, then activates the
// exact integrated profile from the readiness document—not the source profile.
const integratedH1 = manifest(integratedModelBinding(),
  'rr-20260829130000-210', '2026-08-29T13:00:00.000Z');
const integratedH1Audit = integratedAudit();
const integratedWarmupAudit = integratedAudit(integratedModelBinding(), {
  rollbackStatus: 'BUILDING_MEASURED_ONLY',
  allCurrentScoresFullHistory: false,
});
const integratedH1Verification = verification('integrated', integratedModelBinding(), integratedH1);
const returnPlan = prepareIntegratedOperationalReturn({
  currentRow: candidateActiveRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: RAVSCORE_INTEGRATED_RETURN_POLICY.mainRef,
  githubSha: sourceHead,
  confirmation: RAVSCORE_INTEGRATED_RETURN_POLICY.confirmation,
});
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: candidateActiveRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedWarmupAudit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: RAVSCORE_INTEGRATED_RETURN_POLICY.mainRef,
  githubSha: sourceHead,
  confirmation: RAVSCORE_INTEGRATED_RETURN_POLICY.confirmation,
}), /requires a READY Candidate G rollback companion/,
'manual return from Candidate G must remain READY-only');
const returnBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: candidateActiveRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 2,
  plan: returnPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  sourceDeploymentId: 'ignored-current-row-wins',
  deploymentId: 'run-integrated-return-h1',
});
const returnPendingRow = Object.freeze({ version: 3, payload: returnBegin.document });
assert.equal(returnBegin.document.status, RAVSCORE_OPERATIONAL_STATUSES.integratedPending);
assert.deepEqual(returnBegin.document.activeModelBinding, candidateModelBinding());
assert.equal(returnBegin.document.calibrationEligible, false);
const returnComplete = operationalIntegratedReturnTransition({
  action: 'return-complete',
  currentRow: returnPendingRow,
  expectedVersion: 3,
  plan: returnPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  publicVerification: integratedH1Verification,
  deploymentId: 'pages-integrated-h1',
});
assert.equal(returnComplete.document.status, RAVSCORE_OPERATIONAL_STATUSES.integrated);
assert.deepEqual(returnComplete.centralTargetProfile, readiness.centralProfile);
assert.notStrictEqual(returnComplete.centralTargetProfile, candidateProfile,
  'the integrated target profile must come from sealed target readiness, not the source object');

// Ordinary integrated weather refreshes reseal the exact ACTIVE public source,
// so the next rollback can start from H2 instead of a stale cutover manifest.
const integratedActiveRow = Object.freeze({ version: 4, payload: returnComplete.document });
const integratedH2 = manifest(integratedModelBinding(),
  'rr-20260829131500-210', '2026-08-29T13:15:00.000Z');
const integratedH2Verification = verification('integrated', integratedModelBinding(), integratedH2);
const maintenance = operationalIntegratedMaintenanceTransition({
  currentRow: integratedActiveRow,
  currentProfileRow: integratedProfileRow,
  expectedVersion: 4,
  sourceHead,
  publicManifest: integratedH2,
  publicAudit: integratedAudit(),
  publicVerification: integratedH2Verification,
  readiness,
  deploymentId: 'pages-integrated-h2',
});
assert.throws(() => operationalIntegratedMaintenanceTransition({
  currentRow: integratedActiveRow,
  currentProfileRow: integratedProfileRow,
  expectedVersion: 4,
  sourceHead,
  publicManifest: integratedH2,
  publicAudit: integratedWarmupAudit,
  publicVerification: integratedH2Verification,
  readiness,
  deploymentId: 'pages-integrated-h2-warmup-regression',
}), /requires a READY Candidate G rollback companion/,
'a calibrated ACTIVE integrated release must not silently lose its READY rollback companion');
assert.equal(maintenance.document.publicManifestSha256, sha256(integratedH2));
assert.equal(maintenance.document.sourceDeploymentId, 'pages-integrated-h2');
const resolvedMaintainedIntegrated = resolveOperationalRavScoreModel({
  version: 5,
  payload: maintenance.document,
}, { profileRow: integratedProfileRow });
assert.equal(resolvedMaintainedIntegrated.activeImplementationClosureSha256,
  defaultImplementationClosureSha256);
assert.equal(resolvedMaintainedIntegrated.deploymentId, 'pages-integrated-h2');

const postAbortMaintenance = operationalIntegratedMaintenanceTransition({
  currentRow: { version: 3, payload: rollbackAbort.document },
  currentProfileRow: integratedProfileRow,
  expectedVersion: 3,
  sourceHead,
  publicManifest: integratedH2,
  publicAudit: integratedAudit(),
  publicVerification: integratedH2Verification,
  readiness,
  deploymentId: 'pages-integrated-after-abort',
});
assert.equal(postAbortMaintenance.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRollback,
  'maintenance after an aborted rollback must preserve its four-state transition history');
assert.deepEqual(postAbortMaintenance.document.requestedModelBinding, candidateModelBinding());
assert.equal(postAbortMaintenance.document.sourcePublicManifestSha256, sha256(integratedH2));
assert.equal(postAbortMaintenance.document.sourceDeploymentId, 'pages-integrated-after-abort');
assert.equal(postAbortMaintenance.document.failureCode, rollbackAbort.document.failureCode);

// Maintenance is identity-neutral. A runner on main B may not smuggle a real
// model-binding A -> B transition through the ordinary weather reseal path.
const oldIntegratedBinding = Object.freeze({
  ...integratedModelBinding(),
  modelContractSha256: '8'.repeat(64),
  modelBundleSha256: '9'.repeat(64),
});
const oldIntegratedDocument = Object.freeze({
  ...maintenance.document,
  activeModelBinding: oldIntegratedBinding,
  requestedModelBinding: oldIntegratedBinding,
  sourceModelBinding: oldIntegratedBinding,
});
const oldIntegratedProfile = Object.freeze({
  ...integratedProfile,
  modelContractSha256: oldIntegratedBinding.modelContractSha256,
  modelBundleSha256: oldIntegratedBinding.modelBundleSha256,
});
assert.throws(() => operationalIntegratedMaintenanceTransition({
  currentRow: { version: 4, payload: oldIntegratedDocument },
  currentProfileRow: { version: 7, payload: oldIntegratedProfile },
  expectedVersion: 4,
  sourceHead,
  publicManifest: integratedH2,
  publicAudit: integratedAudit(),
  publicVerification: integratedH2Verification,
  readiness,
  deploymentId: 'forbidden-hidden-binding-switch',
}), /cannot change the exact active model binding/);

// A historical integrated H0 release must use an explicit immutable H0 -> H1
// bridge. Ordinary maintenance remains identity-neutral, while begin preserves
// the exact H0 controller/profile and complete atomically installs current H1.
const historicalIntegratedSource = manifest(oldIntegratedBinding,
  'rr-20260829123000-210', '2026-08-29T12:30:00.000Z');
const historicalIntegratedSourceVerification = verification(
  'integrated',
  oldIntegratedBinding,
  historicalIntegratedSource,
);
const historicalIntegratedSourceDocument = Object.freeze({
  ...maintenance.document,
  sourceHead,
  datasetId: historicalIntegratedSource.datasetId,
  productionReferenceAt: historicalIntegratedSource.productionReferenceAt,
  activeModelBinding: oldIntegratedBinding,
  requestedModelBinding: oldIntegratedBinding,
  sourceModelBinding: oldIntegratedBinding,
  publicManifestSha256: sha256(historicalIntegratedSource),
  sourcePublicManifestSha256: sha256(historicalIntegratedSource),
  requestedPublicManifestSha256: sha256(historicalIntegratedSource),
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  sourceDeploymentId: 'pages-historical-integrated-h0',
  deploymentId: 'pages-historical-integrated-h0',
  requestedAt: '2026-08-29T12:31:00.000Z',
  activatedAt: '2026-08-29T12:31:00.000Z',
  calibrationEligible: false,
  failureCode: null,
  integratedManifestSha256: sha256(historicalIntegratedSource),
});
const historicalIntegratedSourceRow = Object.freeze({
  version: 40,
  payload: historicalIntegratedSourceDocument,
});
const historicalIntegratedSourceProfileRow = Object.freeze({
  version: 30,
  payload: oldIntegratedProfile,
});
assert.doesNotThrow(() => assertOperationalActivationDocument(
  historicalIntegratedSourceDocument,
  { allowSealedHistoricalBindings: true },
));
assert.throws(() => assertOperationalActivationDocument(
  historicalIntegratedSourceDocument,
), /exact current or legacy-bootstrap binding/);
const historicalIntegratedResolved = resolveOperationalRavScoreModel(
  historicalIntegratedSourceRow,
  { profileRow: historicalIntegratedSourceProfileRow },
);
assert.equal(operationalResolvedBindingCurrent(historicalIntegratedResolved), false);

const integratedH3 = manifest(integratedModelBinding(),
  'rr-20260829134500-210', '2026-08-29T13:45:00.000Z');
const integratedH3Audit = integratedAudit();
const integratedH3Verification = verification('integrated', integratedModelBinding(), integratedH3);
const historicalIntegratedWarmupPlan = prepareIntegratedHistoricalMaintenance({
  currentRow: historicalIntegratedSourceRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  sourceHead,
  publicManifest: integratedH3,
  publicAudit: integratedWarmupAudit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'schedule',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
});
assert.equal(
  historicalIntegratedWarmupPlan.calibrationEligibleAfterVerifiedActivation,
  false,
);
assert.doesNotThrow(() => assertIntegratedHistoricalMaintenancePlan(
  historicalIntegratedWarmupPlan,
  {
    expectedSourceHead: sourceHead,
    expectedCentralVersion: 40,
    currentRow: historicalIntegratedSourceRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
    readiness,
    publicManifest: integratedH3,
    publicAudit: integratedWarmupAudit,
  },
));
const historicalWarmupBegin = operationalIntegratedHistoricalMaintenanceTransition({
  action: 'integrated-historical-maintenance-begin',
  currentRow: historicalIntegratedSourceRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 40,
  plan: historicalIntegratedWarmupPlan,
  readiness,
  publicManifest: integratedH3,
  publicAudit: integratedWarmupAudit,
  sourceManifest: historicalIntegratedSource,
  sourceVerification: historicalIntegratedSourceVerification,
  deploymentId: 'run-historical-integrated-h1-warmup',
});
const historicalWarmupComplete = operationalIntegratedHistoricalMaintenanceTransition({
  action: 'integrated-historical-maintenance-complete',
  currentRow: Object.freeze({ version: 41, payload: historicalWarmupBegin.document }),
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  plan: historicalIntegratedWarmupPlan,
  readiness,
  publicManifest: integratedH3,
  publicAudit: integratedWarmupAudit,
  publicVerification: integratedH3Verification,
  deploymentId: 'pages-historical-integrated-h1-warmup',
});
assert.equal(historicalWarmupComplete.document.calibrationEligible, false);
const historicalWarmupReconciled = operationalPendingReconciliationTransition({
  currentRow: Object.freeze({ version: 41, payload: historicalWarmupBegin.document }),
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  publicManifest: integratedH3,
  observations: observations(
    historicalIntegratedSource,
    integratedH3,
    integratedH3,
  ),
  publicVerification: integratedH3Verification,
  readiness,
  publicAudit: integratedWarmupAudit,
  integratedPlan: historicalIntegratedWarmupPlan,
  deploymentId: 'pages-historical-integrated-h1-warmup-reconciled',
});
assert.equal(
  historicalWarmupReconciled.document.status,
  RAVSCORE_OPERATIONAL_STATUSES.integrated,
);
assert.equal(historicalWarmupReconciled.document.calibrationEligible, false);
const historicalIntegratedPlan = prepareIntegratedHistoricalMaintenance({
  currentRow: historicalIntegratedSourceRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  sourceHead,
  publicManifest: integratedH3,
  publicAudit: integratedH3Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'schedule',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
});
assert.equal(historicalIntegratedPlan.sourceProfileSha256,
  sha256(oldIntegratedProfile));
assert.equal(historicalIntegratedPlan.sourceCalibrationEligible, false);
assert.doesNotThrow(() => assertIntegratedHistoricalMaintenancePlan(
  historicalIntegratedPlan,
  {
    expectedSourceHead: sourceHead,
    expectedCentralVersion: 40,
    currentRow: historicalIntegratedSourceRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
    readiness,
    publicManifest: integratedH3,
    publicAudit: integratedH3Audit,
  },
));
const { planSha256: ignoredHistoricalPlanSha256, ...historicalPlanBody } =
  historicalIntegratedPlan;
const tamperedHistoricalIntegratedPlanBody = {
  ...historicalPlanBody,
  sourceProfileSha256: 'f'.repeat(64),
};
const tamperedHistoricalIntegratedPlan = Object.freeze({
  ...tamperedHistoricalIntegratedPlanBody,
  planSha256: sha256(tamperedHistoricalIntegratedPlanBody),
});
assert.throws(() => assertIntegratedHistoricalMaintenancePlan(
  tamperedHistoricalIntegratedPlan,
  {
    currentRow: historicalIntegratedSourceRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
  },
), /another active document/);
assert.throws(() => operationalIntegratedHistoricalMaintenanceTransition({
  action: 'integrated-historical-maintenance-begin',
  currentRow: historicalIntegratedSourceRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 39,
  plan: historicalIntegratedPlan,
  readiness,
  publicManifest: integratedH3,
  publicAudit: integratedH3Audit,
  sourceManifest: historicalIntegratedSource,
  sourceVerification: historicalIntegratedSourceVerification,
  deploymentId: 'run-historical-integrated-h1-stale',
}), /compare-and-swap version mismatch/);

const historicalIntegratedBegin = operationalIntegratedHistoricalMaintenanceTransition({
  action: 'integrated-historical-maintenance-begin',
  currentRow: historicalIntegratedSourceRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 40,
  plan: historicalIntegratedPlan,
  readiness,
  publicManifest: integratedH3,
  publicAudit: integratedH3Audit,
  sourceManifest: historicalIntegratedSource,
  sourceVerification: historicalIntegratedSourceVerification,
  deploymentId: 'run-historical-integrated-h1',
  now: '2026-08-29T13:46:00.000Z',
});
const historicalIntegratedPendingRow = Object.freeze({
  version: 41,
  payload: historicalIntegratedBegin.document,
});
assert.equal(Object.keys(historicalIntegratedBegin.document).length, 30);
assert.equal(historicalIntegratedBegin.document.status,
  RAVSCORE_OPERATIONAL_STATUSES.integratedPending);
assert.deepEqual(historicalIntegratedBegin.document.activeModelBinding,
  oldIntegratedBinding);
assert.deepEqual(historicalIntegratedBegin.document.requestedModelBinding,
  integratedModelBinding());
assert.deepEqual(operationalCentralProfileForTransition({
  transition: historicalIntegratedBegin,
  currentProfile: oldIntegratedProfile,
  integratedProfile,
}), oldIntegratedProfile);

const historicalIntegratedComplete =
  operationalIntegratedHistoricalMaintenanceTransition({
    action: 'integrated-historical-maintenance-complete',
    currentRow: historicalIntegratedPendingRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
    expectedVersion: 41,
    plan: historicalIntegratedPlan,
    readiness,
    publicManifest: integratedH3,
    publicAudit: integratedH3Audit,
    publicVerification: integratedH3Verification,
    deploymentId: 'pages-historical-integrated-h1',
    now: '2026-08-29T13:47:00.000Z',
  });
assert.deepEqual(historicalIntegratedComplete.document.activeModelBinding,
  integratedModelBinding());
assert.equal(historicalIntegratedComplete.document.calibrationEligible, true);
assert.deepEqual(historicalIntegratedComplete.centralTargetProfile,
  readiness.centralProfile);
assert.equal(operationalResolvedBindingCurrent(resolveOperationalRavScoreModel({
  version: 42,
  payload: historicalIntegratedComplete.document,
}, {
  profileRow: { version: 31, payload: readiness.centralProfile },
})), true);

assert.throws(() => operationalIntegratedHistoricalMaintenanceTransition({
  action: 'integrated-historical-maintenance-abort',
  currentRow: historicalIntegratedPendingRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  plan: historicalIntegratedPlan,
  sourceManifest: historicalIntegratedSource,
  sourceVerification: historicalIntegratedSourceVerification,
  failureCode: 'HISTORICAL_INTEGRATED_TARGET_FAILED',
}), /terminal/i);
const historicalIntegratedAbort =
  operationalIntegratedHistoricalMaintenanceTransition({
    action: 'integrated-historical-maintenance-abort',
    currentRow: historicalIntegratedPendingRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
    expectedVersion: 41,
    plan: historicalIntegratedPlan,
    sourceManifest: historicalIntegratedSource,
    sourceVerification: historicalIntegratedSourceVerification,
    terminalEvidence: terminalEvidence(
      historicalIntegratedPendingRow,
      historicalIntegratedSource,
      'FAILED_BEFORE_PAGES_ACCEPTANCE',
      '2026-08-29T13:47:00.000Z',
    ),
    failureCode: 'HISTORICAL_INTEGRATED_TARGET_FAILED',
    now: '2026-08-29T13:48:00.000Z',
  });
assert.deepEqual(historicalIntegratedAbort.document.activeModelBinding,
  oldIntegratedBinding);
assert.equal(historicalIntegratedAbort.document.calibrationEligible, false);
assert.equal(historicalIntegratedAbort.document.deploymentId,
  'pages-historical-integrated-h0');
assert.deepEqual(operationalCentralProfileForTransition({
  transition: historicalIntegratedAbort,
  currentProfile: oldIntegratedProfile,
  integratedProfile,
}), oldIntegratedProfile);

const historicalIntegratedTargetObservations = observations(
  historicalIntegratedSource,
  integratedH3,
  integratedH3,
);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalIntegratedPendingRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  publicManifest: integratedH3,
  observations: historicalIntegratedTargetObservations,
  publicVerification: integratedH3Verification,
  readiness,
  publicAudit: integratedH3Audit,
  deploymentId: 'pages-historical-integrated-h1-reconciled',
}), /plan.*incomplete|immutable plan/i);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalIntegratedPendingRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  publicManifest: integratedH3,
  observations: historicalIntegratedTargetObservations,
  publicVerification: integratedH3Verification,
  readiness,
  publicAudit: integratedH3Audit,
  integratedPlan: tamperedHistoricalIntegratedPlan,
  deploymentId: 'pages-historical-integrated-h1-tampered',
}), /immutable plan|PENDING state differs/);
const historicalIntegratedReconciledTarget =
  operationalPendingReconciliationTransition({
    currentRow: historicalIntegratedPendingRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
    expectedVersion: 41,
    publicManifest: integratedH3,
    observations: historicalIntegratedTargetObservations,
    publicVerification: integratedH3Verification,
    readiness,
    publicAudit: integratedH3Audit,
    integratedPlan: historicalIntegratedPlan,
    deploymentId: 'pages-historical-integrated-h1-reconciled',
    now: '2026-08-29T13:49:00.000Z',
  });
assert.deepEqual(historicalIntegratedReconciledTarget.centralTargetProfile,
  readiness.centralProfile);
assert.equal(historicalIntegratedReconciledTarget.document.calibrationEligible, true);

const historicalIntegratedSourceObservations = observations(
  historicalIntegratedSource,
  historicalIntegratedSource,
);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalIntegratedPendingRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  publicManifest: historicalIntegratedSource,
  observations: historicalIntegratedSourceObservations,
  publicVerification: historicalIntegratedSourceVerification,
  terminalEvidence: terminalEvidence(
    historicalIntegratedPendingRow,
    historicalIntegratedSource,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:50:00.000Z',
  ),
  failureCode: 'HISTORICAL_INTEGRATED_SOURCE_RECONCILE_NO_PLAN',
}), /plan.*incomplete|immutable plan/i);
const historicalIntegratedReconciledSource =
  operationalPendingReconciliationTransition({
    currentRow: historicalIntegratedPendingRow,
    currentProfileRow: historicalIntegratedSourceProfileRow,
    expectedVersion: 41,
    publicManifest: historicalIntegratedSource,
    observations: historicalIntegratedSourceObservations,
    publicVerification: historicalIntegratedSourceVerification,
    integratedPlan: historicalIntegratedPlan,
    terminalEvidence: terminalEvidence(
      historicalIntegratedPendingRow,
      historicalIntegratedSource,
      'FAILED_BEFORE_PAGES_ACCEPTANCE',
      '2026-08-29T13:50:00.000Z',
    ),
    failureCode: 'HISTORICAL_INTEGRATED_SOURCE_RECONCILED',
    now: '2026-08-29T13:50:00.000Z',
  });
assert.deepEqual(historicalIntegratedReconciledSource.document.activeModelBinding,
  oldIntegratedBinding);
assert.equal(historicalIntegratedReconciledSource.document.calibrationEligible, false);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: historicalIntegratedReconciledSource,
  currentProfile: oldIntegratedProfile,
  integratedProfile,
}), oldIntegratedProfile);

const historicalIntegratedThird = manifest(integratedModelBinding(),
  'rr-20260829134600-210', '2026-08-29T13:46:00.000Z');
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalIntegratedPendingRow,
  currentProfileRow: historicalIntegratedSourceProfileRow,
  expectedVersion: 41,
  publicManifest: historicalIntegratedThird,
  observations: observations(historicalIntegratedThird, historicalIntegratedThird),
}), /fail-closed \(third\); no CAS/i);

const resealedIntegratedRow = Object.freeze({ version: 5, payload: maintenance.document });
const postRefreshCandidate = manifest(candidateModelBinding(),
  'rr-20260829133000-210', '2026-08-29T13:30:00.000Z');
const postRefreshPlan = candidatePlan({
  centralExpectedVersion: 5,
  sourceBinding: integratedModelBinding(),
  datasetId: postRefreshCandidate.datasetId,
  productionReferenceAt: postRefreshCandidate.productionReferenceAt,
  salt: '5',
});
assert.doesNotThrow(() => operationalActivationTransition({
  action: 'begin',
  currentRow: resealedIntegratedRow,
  currentProfileRow: integratedProfileRow,
  expectedVersion: 5,
  plan: postRefreshPlan,
  sourceManifest: integratedH2,
  sourceVerification: integratedH2Verification,
  requestedManifest: postRefreshCandidate,
  deploymentId: 'run-post-refresh-rollback',
}));

const oldCandidateBinding = Object.freeze({
  ...candidateModelBinding(),
  modelContractSha256: '8'.repeat(64),
  modelBundleSha256: '9'.repeat(64),
});
const oldCandidateDocument = Object.freeze({
  ...refreshAbort.document,
  activeModelBinding: oldCandidateBinding,
  requestedModelBinding: oldCandidateBinding,
  sourceModelBinding: oldCandidateBinding,
});
const oldCandidateProfile = Object.freeze({
  ...candidateProfile,
  modelContractSha256: oldCandidateBinding.modelContractSha256,
  modelBundleSha256: oldCandidateBinding.modelBundleSha256,
});
const oldCandidateRefreshPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 3,
  sourceBinding: candidateModelBinding(),
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: '6',
});
assert.throws(() => operationalCandidateRefreshTransition({
  action: 'refresh-begin',
  currentRow: { version: 3, payload: oldCandidateDocument },
  currentProfileRow: { version: 8, payload: oldCandidateProfile },
  expectedVersion: 3,
  plan: oldCandidateRefreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  requestedManifest: candidateH1,
  deploymentId: 'forbidden-hidden-candidate-switch',
}), /source differs from the exact centrally active binding/);

// The first production cutover goes directly from the exact 4.0.316 legacy
// source to integrated. The external 12-field attestation never enters the
// controller; all three controller bindings remain the common 11-field shape.
const legacyProfile = legacyCandidateGCentralProfile();
assertLegacyCandidateGCentralProfile(legacyProfile);
for (const mutated of [
  { ...legacyProfile, sourceVersion: '4.0.315' },
  { ...legacyProfile, switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.315' },
  { ...legacyProfile, status: 'owner-approved-candidate-g-only-forged' },
  { ...legacyProfile, activationAuthority: 'DEC-UNKNOWN' },
  { ...legacyProfile, evidence: { ...legacyProfile.evidence, ownerReviewDecisionId: 'FORGED' } },
]) assert.throws(() => assertLegacyCandidateGCentralProfile(mutated), /exact production-verified/);
const legacyProfileRow = Object.freeze({ version: 6, payload: legacyProfile });
const legacyManifest = Object.freeze({
  schemaVersion: 2,
  datasetId: 'rr-20260829100000-210-legacy',
  productionReferenceAt: '2026-08-29T10:00:00.000Z',
  complete: true,
  zoneCount: 210,
  coastalPartCount: 673,
  conditionsPath: './public-conditions.json',
  conditionDetailsPath: './public-condition-details.json',
  fullConditionsPath: './conditions.json',
  publicConditionsSha256: '6'.repeat(64),
  publicConditionsBytes: 123,
  publicConditionDetailsSha256: '7'.repeat(64),
  publicConditionDetailsBytes: 456,
  ravScoreProfile: Object.freeze({
    schemaVersion: '2.0.0',
    switchVersion: 'RAVSCORE-PROFILE-SWITCH-4.0.316',
    requestedProfileId: legacyCandidateGControllerBinding().modelId,
    activeProfileId: legacyCandidateGControllerBinding().modelId,
    candidateProfileId: legacyCandidateGControllerBinding().modelId,
    rollbackProfileId: null,
    candidateCoverageReady: true,
    candidateMemoryReady: false,
    candidateWarmupEligible: true,
    candidateMemoryReferenceScope: 'CURRENT_COMMON_ZONE_REFERENCE',
    freshFinalShadowPassed: false,
    ownerReviewApproved: true,
    prePublicWarmupAccepted: true,
    activationState: 'candidate-g-only-local-fail-closed',
    fallbackReason: null,
    advisories: Object.freeze(['LOCAL_CANDIDATE_MEMORY_INCOMPLETE']),
    publicAvailabilityPolicy: 'candidate-g-local-fail-closed',
    legacyPublicFallbackAllowed: false,
    automaticActivationAllowed: false,
  }),
});
const legacyAttestation = Object.freeze({
  schemaVersion: LEGACY_CANDIDATE_G_ATTESTATION_SCHEMA,
  legacySourceIdentity: legacyCandidateGSourceIdentity(),
  datasetId: legacyManifest.datasetId,
  productionReferenceAt: legacyManifest.productionReferenceAt,
  publicManifestSha256: sha256(legacyManifest),
  zoneCount: 210,
  coastalPartCount: 673,
  candidateStateCount: 673,
  privatePayloadLogged: false,
});
const legacyVerification = Object.freeze({
  schemaVersion: LEGACY_CANDIDATE_G_VERIFICATION_SCHEMA,
  status: 'passed',
  sourceHead,
  legacySourceIdentity: legacyCandidateGSourceIdentity(),
  datasetId: legacyManifest.datasetId,
  productionReferenceAt: legacyManifest.productionReferenceAt,
  publicManifestSha256: sha256(legacyManifest),
  zoneCount: 210,
  coastalPartCount: 673,
  candidateStateCount: 673,
  localAttestationSha256: sha256(legacyAttestation),
  implementationClosureSha256: legacyImplementationClosureSha256,
  privatePayloadRead: false,
  privatePayloadLogged: false,
});

// The production-reachable non-push bridge starts from no operational row and
// the exact legacy schema-2 profile/source. It creates one durable PENDING row
// whose only valid endpoints are the sealed modern Candidate target or the
// attested legacy source. Initial integrated cutover intent remains explicit
// after either endpoint without inventing return evidence.
const legacyRefreshPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 0,
  sourceBinding: legacyCandidateGControllerBinding(),
  datasetId: candidateH0.datasetId,
  productionReferenceAt: candidateH0.productionReferenceAt,
  salt: '8',
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
});
assertLegacyCandidateRefreshPlan(legacyRefreshPlan, {
  expectedSourceHead: sourceHead,
  expectedCentralVersion: 0,
});
const validCandidateSourcePlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 0,
  sourceBinding: candidateModelBinding(),
  datasetId: candidateH0.datasetId,
  productionReferenceAt: candidateH0.productionReferenceAt,
  salt: '8',
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
});
assert.throws(() => assertLegacyCandidateRefreshPlan(validCandidateSourcePlan),
  /differs from the sealed transition binding/,
'a newly sealed modern Candidate plan may not impersonate the legacy bridge');
assert.throws(() => assertLegacyCandidateRefreshPlan(legacyRefreshPlan, {
  expectedCentralVersion: 1,
}), /another central CAS version/);

const legacyRefreshBegin = operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-begin',
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 0,
  plan: legacyRefreshPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-legacy-4316',
  deploymentId: 'run-legacy-candidate-refresh',
  now: '2026-08-29T13:04:00.000Z',
});
const legacyRefreshPendingRow = Object.freeze({
  version: 1,
  payload: legacyRefreshBegin.document,
});
assert.equal(legacyRefreshBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.legacyCandidateRefreshBeforeInitialCutover);
assert.deepEqual(legacyRefreshBegin.document.activeModelBinding,
  legacyCandidateGControllerBinding());
assert.deepEqual(legacyRefreshBegin.document.sourceModelBinding,
  legacyCandidateGControllerBinding());
assert.deepEqual(legacyRefreshBegin.document.requestedModelBinding,
  candidateModelBinding());
for (const field of ['candidatePlanSha256', 'candidateFullSha256',
  'privateBundleContentSha256']) {
  assert.match(legacyRefreshBegin.document[field], /^[a-f0-9]{64}$/,
    `legacy bridge must seal exact Candidate evidence in ${field}`);
}
for (const field of ['returnPlanSha256', 'integratedReadinessSha256',
  'integratedPublicAuditSha256', 'integratedManifestSha256']) {
  assert.equal(legacyRefreshBegin.document[field], null,
    `legacy bridge must not invent integrated return evidence in ${field}`);
  assert.throws(() => assertOperationalActivationDocument({
    ...legacyRefreshBegin.document,
    [field]: 'f'.repeat(64),
  }), /exact two-phase endpoint/,
  `legacy bridge must reject a forged ${field}`);
}
assert.notEqual(refreshBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.legacyCandidateRefreshBeforeInitialCutover,
'the transition function may never create legacy lineage from an ordinary Candidate state');
assert.throws(() => assertOperationalActivationDocument({
  ...legacyRefreshBegin.document,
  transitionKind: RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh,
}), /Pending Candidate G transition must preserve its exact active source/,
'a legacy bridge may not be relabelled as an ordinary Candidate refresh');
assert.throws(() => operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-begin',
  currentRow: null,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 0,
  plan: legacyRefreshPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-legacy-4316',
  deploymentId: 'run-forged-profile',
}), /exact pre-cutover legacy source/,
'the rowless bridge requires the exact central legacy profile');
assert.throws(() => operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-begin',
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 0,
  plan: legacyRefreshPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: { ...legacyAttestation, candidateStateCount: 672 },
  sourceVerification: legacyVerification,
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-legacy-4316',
  deploymentId: 'run-forged-attestation',
}), /attestation/i,
'legacy source attestation tamper must fail closed');
assert.throws(() => operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-begin',
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 0,
  plan: legacyRefreshPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: {
    ...legacyVerification,
    implementationClosureSha256: defaultImplementationClosureSha256,
  },
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-legacy-4316',
  deploymentId: 'run-forged-source-closure',
}), /closure differs from the sealed source/,
'legacy source closure tamper must fail closed');
assert.throws(() => operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-begin',
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 1,
  plan: legacyRefreshPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  requestedManifest: candidateH0,
  sourceDeploymentId: 'pages-legacy-4316',
  deploymentId: 'run-forged-cas',
}), /compare-and-swap version mismatch/,
'the rowless bridge may only create central version one from exact version zero');

const legacyRefreshComplete = operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-complete',
  currentRow: legacyRefreshPendingRow,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 1,
  plan: legacyRefreshPlan,
  requestedManifest: candidateH0,
  publicVerification: candidateH0Verification,
  deploymentId: 'pages-candidate-h0-from-legacy',
  now: '2026-08-29T13:06:00.000Z',
});
const legacyRefreshCompleteRow = Object.freeze({
  version: 2,
  payload: legacyRefreshComplete.document,
});
const resolvedLegacyRefreshComplete = resolveOperationalRavScoreModel(
  legacyRefreshCompleteRow,
  { profileRow: candidateProfileRow },
);
assert.equal(resolvedLegacyRefreshComplete.initialCutoverRequired, true);
assert.equal(resolvedLegacyRefreshComplete.legacySourceRequired, false);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: legacyRefreshComplete,
  currentProfile: legacyProfile,
  integratedProfile,
}), candidateProfile,
'legacy bridge target completion must atomically select the exact modern Candidate profile');

const legacyRefreshAbort = operationalLegacyCandidateRefreshTransition({
  action: 'legacy-refresh-abort',
  currentRow: legacyRefreshPendingRow,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 1,
  plan: legacyRefreshPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  terminalEvidence: terminalEvidence(legacyRefreshPendingRow, legacyManifest),
  failureCode: 'LEGACY_REFRESH_PAGES_NOT_ACCEPTED',
  now: '2026-08-29T13:06:00.000Z',
});
const resolvedLegacyRefreshAbort = resolveOperationalRavScoreModel({
  version: 2,
  payload: legacyRefreshAbort.document,
}, { profileRow: legacyProfileRow });
assert.equal(resolvedLegacyRefreshAbort.initialCutoverRequired, true);
assert.equal(resolvedLegacyRefreshAbort.legacySourceRequired, true);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: legacyRefreshAbort,
  currentProfile: legacyProfile,
  integratedProfile,
}), legacyProfile,
'legacy bridge source abort must preserve the exact central legacy profile object');

const legacyRefreshReconciledTarget = operationalPendingReconciliationTransition({
  currentRow: legacyRefreshPendingRow,
  expectedVersion: 1,
  publicManifest: candidateH0,
  observations: observations(legacyManifest, candidateH0, candidateH0),
  publicVerification: candidateH0Verification,
  deploymentId: 'pages-candidate-h0-reconciled',
  candidatePlan: legacyRefreshPlan,
  now: '2026-08-29T13:06:00.000Z',
});
const resolvedLegacyRefreshReconciledTarget = resolveOperationalRavScoreModel({
  version: 2,
  payload: legacyRefreshReconciledTarget.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedLegacyRefreshReconciledTarget.initialCutoverRequired, true);
assert.equal(resolvedLegacyRefreshReconciledTarget.legacySourceRequired, false);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: legacyRefreshReconciledTarget,
  currentProfile: legacyProfile,
  integratedProfile,
}), candidateProfile);

const legacyRefreshReconciledSource = operationalPendingReconciliationTransition({
  currentRow: legacyRefreshPendingRow,
  expectedVersion: 1,
  publicManifest: legacyManifest,
  observations: observations(legacyManifest, legacyManifest),
  publicVerification: legacyVerification,
  sourceAttestation: legacyAttestation,
  terminalEvidence: terminalEvidence(legacyRefreshPendingRow, legacyManifest),
  failureCode: 'LEGACY_REFRESH_SOURCE_RECONCILED',
  now: '2026-08-29T13:06:00.000Z',
});
const resolvedLegacyRefreshReconciledSource = resolveOperationalRavScoreModel({
  version: 2,
  payload: legacyRefreshReconciledSource.document,
}, { profileRow: legacyProfileRow });
assert.equal(resolvedLegacyRefreshReconciledSource.initialCutoverRequired, true);
assert.equal(resolvedLegacyRefreshReconciledSource.legacySourceRequired, true);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: legacyRefreshReconciledSource,
  currentProfile: legacyProfile,
  integratedProfile,
}), legacyProfile);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: legacyRefreshPendingRow,
  expectedVersion: 1,
  publicManifest: legacyManifest,
  observations: observations(legacyManifest, legacyManifest),
  publicVerification: legacyVerification,
  sourceAttestation: { ...legacyAttestation, candidateStateCount: 672 },
  terminalEvidence: terminalEvidence(legacyRefreshPendingRow, legacyManifest),
  failureCode: 'FORGED_SOURCE_ATTESTATION',
}), /attestation/i);
const legacyRefreshThirdManifest = manifest(candidateModelBinding(),
  'rr-20260829120100-210-third', '2026-08-29T12:01:00.000Z');
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: legacyRefreshPendingRow,
  observations: observations(legacyManifest, legacyRefreshThirdManifest),
}).action, 'third');
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: legacyRefreshPendingRow,
  expectedVersion: 1,
  publicManifest: legacyRefreshThirdManifest,
  observations: observations(legacyRefreshThirdManifest, legacyRefreshThirdManifest),
}), /third.*no CAS/i);

// A legacy-marker Candidate target sealed by head H0 must remain readable after
// main moves to H1. Ordinary refresh is identity-neutral; only the explicit
// historical bridge may move the exact H0 binding and central profile to H1.
const historicalMarkerTarget = manifest(oldCandidateBinding,
  candidateH0.datasetId, candidateH0.productionReferenceAt);
const historicalMarkerVerification = verification(
  'candidate-g',
  oldCandidateBinding,
  historicalMarkerTarget,
);
const historicalMarkerTargetProfile = candidateProfileForBinding(oldCandidateBinding);
const historicalLegacyPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 0,
  sourceBinding: legacyCandidateGControllerBinding(),
  targetBinding: oldCandidateBinding,
  targetProfile: historicalMarkerTargetProfile,
  datasetId: historicalMarkerTarget.datasetId,
  productionReferenceAt: historicalMarkerTarget.productionReferenceAt,
  salt: '8',
});
const historicalMarkerDocument = Object.freeze({
  ...legacyRefreshComplete.document,
  sourceHead: historicalLegacyPlan.sourceHead,
  datasetId: historicalMarkerTarget.datasetId,
  productionReferenceAt: historicalMarkerTarget.productionReferenceAt,
  activeModelBinding: oldCandidateBinding,
  requestedModelBinding: oldCandidateBinding,
  candidatePlanSha256: historicalLegacyPlan.planSha256,
  candidateFullSha256: historicalLegacyPlan.candidateFullSha256,
  privateBundleContentSha256: historicalLegacyPlan.privateBundleContentSha256,
  sourceImplementationClosureSha256:
    historicalLegacyPlan.sourceImplementationClosureSha256,
  requestedImplementationClosureSha256:
    historicalLegacyPlan.requestedImplementationClosureSha256,
  requestedPublicManifestSha256: sha256(historicalMarkerTarget),
  publicManifestSha256: sha256(historicalMarkerTarget),
  deploymentId: 'pages-historical-marker-h0',
});
assert.throws(() => assertOperationalActivationDocument(historicalMarkerDocument),
  /exact current or legacy-bootstrap binding/);
assertOperationalActivationDocument(historicalMarkerDocument, {
  allowSealedHistoricalBindings: true,
});
const historicalMarkerRow = Object.freeze({
  version: 2,
  payload: historicalMarkerDocument,
});
const historicalMarkerProfileRow = Object.freeze({
  version: 9,
  payload: historicalMarkerTargetProfile,
});
const resolvedHistoricalMarker = resolveOperationalRavScoreModel(
  historicalMarkerRow,
  { profileRow: historicalMarkerProfileRow },
);
assert.equal(resolvedHistoricalMarker.initialCutoverRequired, true);
assert.equal(resolvedHistoricalMarker.legacySourceRequired, false);

const historicalBridgePlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 2,
  sourceBinding: oldCandidateBinding,
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: 'a',
});
assertHistoricalCandidateRefreshPlan(historicalBridgePlan, {
  expectedCentralVersion: 2,
});
assert.throws(() => assertCandidateRefreshPlan(historicalBridgePlan),
  /incompatible modelContractSha256|not the expected exact model bundle/);
assert.throws(() => operationalCandidateRefreshTransition({
  action: 'refresh-begin',
  currentRow: historicalMarkerRow,
  currentProfileRow: historicalMarkerProfileRow,
  expectedVersion: 2,
  plan: historicalBridgePlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  requestedManifest: candidateH1,
  deploymentId: 'forbidden-ordinary-historical-refresh',
}), /incompatible modelContractSha256|not the expected exact model bundle/);
assert.throws(() => operationalCandidateRefreshTransition({
  action: 'historical-refresh-begin',
  currentRow: historicalMarkerRow,
  currentProfileRow: historicalMarkerProfileRow,
  expectedVersion: 1,
  plan: historicalBridgePlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  requestedManifest: candidateH1,
  deploymentId: 'stale-historical-refresh',
}), /compare-and-swap version mismatch/);

const tamperedHistoricalBridgePlan = {
  ...historicalBridgePlan,
  candidateTargetProfile: {
    ...historicalBridgePlan.candidateTargetProfile,
    modelBundleSha256: '0'.repeat(64),
  },
};
tamperedHistoricalBridgePlan.candidateTargetProfileSha256 = sha256(
  tamperedHistoricalBridgePlan.candidateTargetProfile,
);
{
  const {
    planSha256: _planSha256,
    candidateFullSha256: _candidateFullSha256,
    privatePayloadLogged: _privatePayloadLogged,
    ...tamperedBody
  } = tamperedHistoricalBridgePlan;
  tamperedHistoricalBridgePlan.planSha256 = sha256(tamperedBody);
}
assert.throws(() => assertHistoricalCandidateRefreshPlan(tamperedHistoricalBridgePlan),
  /central operational profile differs from the sealed PENDING binding/i);

const historicalBridgeBegin = operationalCandidateRefreshTransition({
  action: 'historical-refresh-begin',
  currentRow: historicalMarkerRow,
  currentProfileRow: historicalMarkerProfileRow,
  expectedVersion: 2,
  plan: historicalBridgePlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  requestedManifest: candidateH1,
  deploymentId: 'run-historical-candidate-bridge',
  now: '2026-08-29T13:10:00.000Z',
});
assert.equal(historicalBridgeBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.legacyCandidateRefreshBeforeInitialCutover);
assert.deepEqual(historicalBridgeBegin.document.activeModelBinding, oldCandidateBinding);
assert.deepEqual(historicalBridgeBegin.document.requestedModelBinding,
  candidateModelBinding());
assert.equal(Object.keys(historicalBridgeBegin.document).length, 30,
  'schema-v4 controller must remain the exact 30-field contract');
const historicalBridgePendingRow = Object.freeze({
  version: 3,
  payload: historicalBridgeBegin.document,
});
assert.throws(() => operationalCandidateRefreshTransition({
  action: 'historical-refresh-abort',
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  plan: historicalBridgePlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  failureCode: 'MISSING_TERMINAL_EVIDENCE',
}), /terminal/i);
const historicalBridgeAbort = operationalCandidateRefreshTransition({
  action: 'historical-refresh-abort',
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  plan: historicalBridgePlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  terminalEvidence: terminalEvidence(
    historicalBridgePendingRow,
    historicalMarkerTarget,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:12:00.000Z',
  ),
  failureCode: 'HISTORICAL_BRIDGE_NOT_ACCEPTED',
});
assert.deepEqual(historicalBridgeAbort.document.activeModelBinding, oldCandidateBinding);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: historicalBridgeAbort,
  currentProfile: historicalMarkerTargetProfile,
  integratedProfile,
}), historicalMarkerTargetProfile);
const historicalBridgeComplete = operationalCandidateRefreshTransition({
  action: 'historical-refresh-complete',
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  plan: historicalBridgePlan,
  requestedManifest: candidateH1,
  publicVerification: candidateH1Verification,
  deploymentId: 'pages-historical-candidate-bridge',
  now: '2026-08-29T13:11:00.000Z',
});
assert.deepEqual(historicalBridgeComplete.document.activeModelBinding,
  candidateModelBinding());
assert.deepEqual(historicalBridgeComplete.centralTargetProfile, candidateProfile);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: historicalBridgeComplete,
  currentProfile: historicalMarkerTargetProfile,
  integratedProfile,
}), candidateProfile);

assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 2,
  publicManifest: candidateH1,
  observations: observations(historicalMarkerTarget, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  candidatePlan: historicalBridgePlan,
  deploymentId: 'stale-reconciled-historical-bridge',
}), /compare-and-swap version mismatch/);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: candidateH1,
  observations: observations(historicalMarkerTarget, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  deploymentId: 'missing-plan-historical-bridge',
}), /plan is incomplete or unsafe/);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: candidateH1,
  observations: observations(historicalMarkerTarget, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  candidatePlan: tamperedHistoricalBridgePlan,
  deploymentId: 'tampered-plan-historical-bridge',
}), /profile differs from the sealed PENDING binding/i);
const historicalBridgeReconciledTarget = operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: candidateH1,
  observations: observations(historicalMarkerTarget, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  candidatePlan: historicalBridgePlan,
  deploymentId: 'pages-reconciled-historical-bridge',
});
assert.deepEqual(historicalBridgeReconciledTarget.centralTargetProfile,
  candidateProfile);
assert.equal(resolveOperationalRavScoreModel({
  version: 4,
  payload: historicalBridgeReconciledTarget.document,
}, { profileRow: candidateProfileRow }).initialCutoverRequired, true);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: historicalMarkerTarget,
  observations: observations(historicalMarkerTarget, historicalMarkerTarget),
  publicVerification: historicalMarkerVerification,
  terminalEvidence: terminalEvidence(
    historicalBridgePendingRow,
    historicalMarkerTarget,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:12:00.000Z',
  ),
  failureCode: 'HISTORICAL_BRIDGE_SOURCE_MISSING_PLAN',
}), /plan is incomplete or unsafe/);
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: historicalMarkerTarget,
  observations: observations(historicalMarkerTarget, historicalMarkerTarget),
  publicVerification: historicalMarkerVerification,
  candidatePlan: tamperedHistoricalBridgePlan,
  terminalEvidence: terminalEvidence(
    historicalBridgePendingRow,
    historicalMarkerTarget,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:12:00.000Z',
  ),
  failureCode: 'HISTORICAL_BRIDGE_SOURCE_TAMPERED_PLAN',
}), /profile differs from the sealed PENDING binding/i);
const historicalBridgeReconciledSource = operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: historicalMarkerTarget,
  observations: observations(historicalMarkerTarget, historicalMarkerTarget),
  publicVerification: historicalMarkerVerification,
  candidatePlan: historicalBridgePlan,
  terminalEvidence: terminalEvidence(
    historicalBridgePendingRow,
    historicalMarkerTarget,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:12:00.000Z',
  ),
  failureCode: 'HISTORICAL_BRIDGE_SOURCE_RECONCILED',
});
assert.deepEqual(historicalBridgeReconciledSource.document.activeModelBinding,
  oldCandidateBinding);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: historicalBridgeReconciledSource,
  currentProfile: historicalMarkerTargetProfile,
  integratedProfile,
}), historicalMarkerTargetProfile);
const historicalBridgeRetryPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 4,
  sourceBinding: oldCandidateBinding,
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: '4',
});
const historicalBridgeRetryBegin = operationalCandidateRefreshTransition({
  action: 'historical-refresh-begin',
  currentRow: { version: 4, payload: historicalBridgeReconciledSource.document },
  currentProfileRow: historicalMarkerProfileRow,
  expectedVersion: 4,
  plan: historicalBridgeRetryPlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  requestedManifest: candidateH1,
  deploymentId: 'run-historical-candidate-bridge-retry',
});
assert.deepEqual(historicalBridgeRetryBegin.document.activeModelBinding,
  oldCandidateBinding);
assert.deepEqual(historicalBridgeRetryBegin.document.requestedModelBinding,
  candidateModelBinding());
const historicalBridgeThird = manifest(candidateModelBinding(),
  'rr-20260829121700-210-third', '2026-08-29T12:17:00.000Z');
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: historicalBridgePendingRow,
  observations: observations(historicalMarkerTarget, historicalBridgeThird),
}).action, 'third');
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalBridgePendingRow,
  expectedVersion: 3,
  publicManifest: historicalBridgeThird,
  observations: observations(historicalBridgeThird, historicalBridgeThird),
}), /third.*no CAS/i);

// New first-cutover plans may not be created from a historical H0 binding.
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: historicalMarkerRow,
  currentProfileRow: historicalMarkerProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: true,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
}), /current same-head Candidate G source closure parity/);

// Previously sealed historical plans remain valid for transition recovery.
const historicalCandidateIntegratedPlan = sealedHistoricalInitialPlan({
  currentRow: historicalMarkerRow,
  currentProfileRow: historicalMarkerProfileRow,
  sourceModelBinding: oldCandidateBinding,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  legacySourceRequired: false,
});
assert.equal(historicalCandidateIntegratedPlan.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);
assert.equal(historicalCandidateIntegratedPlan.legacySourceRequired, false);
assert.deepEqual(historicalCandidateIntegratedPlan.sourceModelBinding, oldCandidateBinding);
const historicalCandidateIntegratedBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: historicalMarkerRow,
  currentProfileRow: historicalMarkerProfileRow,
  expectedVersion: 2,
  plan: historicalCandidateIntegratedPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  deploymentId: 'run-historical-candidate-integrated',
  now: '2026-08-29T13:10:00.000Z',
});
const historicalCandidateIntegratedPendingRow = Object.freeze({
  version: 3,
  payload: historicalCandidateIntegratedBegin.document,
});
const historicalCandidateIntegratedComplete = operationalIntegratedReturnTransition({
  action: 'return-complete',
  currentRow: historicalCandidateIntegratedPendingRow,
  expectedVersion: 3,
  plan: historicalCandidateIntegratedPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  publicVerification: integratedH1Verification,
  deploymentId: 'pages-historical-candidate-integrated',
});
assert.deepEqual(historicalCandidateIntegratedComplete.centralTargetProfile,
  readiness.centralProfile);
const historicalCandidateIntegratedAbort = operationalIntegratedReturnTransition({
  action: 'return-abort',
  currentRow: historicalCandidateIntegratedPendingRow,
  expectedVersion: 3,
  plan: historicalCandidateIntegratedPlan,
  sourceManifest: historicalMarkerTarget,
  sourceVerification: historicalMarkerVerification,
  terminalEvidence: terminalEvidence(
    historicalCandidateIntegratedPendingRow,
    historicalMarkerTarget,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:12:00.000Z',
  ),
  failureCode: 'HISTORICAL_INTEGRATED_NOT_ACCEPTED',
});
assert.deepEqual(historicalCandidateIntegratedAbort.document.activeModelBinding,
  oldCandidateBinding);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: historicalCandidateIntegratedAbort,
  currentProfile: historicalMarkerTargetProfile,
  integratedProfile,
}), historicalMarkerTargetProfile);

// Same-run SAFE_SOURCE_ABORT uses the IntegratedReturnPlan transition directly.
// A later run must be able to reach the same exact H0 source through generic
// reconciliation, and must never reinterpret the plan as a Candidate refresh.
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalCandidateIntegratedPendingRow,
  expectedVersion: 3,
  publicManifest: historicalMarkerTarget,
  observations: observations(historicalMarkerTarget, historicalMarkerTarget),
  publicVerification: historicalMarkerVerification,
  terminalEvidence: terminalEvidence(
    historicalCandidateIntegratedPendingRow,
    historicalMarkerTarget,
    'FAILED_BEFORE_PAGES_ACCEPTANCE',
    '2026-08-29T13:13:00.000Z',
  ),
  failureCode: 'HISTORICAL_INTEGRATED_NOT_ACCEPTED',
}), /integrated.*plan/i);
const historicalCandidateIntegratedReconciledSource =
  operationalPendingReconciliationTransition({
    currentRow: historicalCandidateIntegratedPendingRow,
    expectedVersion: 3,
    publicManifest: historicalMarkerTarget,
    observations: observations(historicalMarkerTarget, historicalMarkerTarget),
    publicVerification: historicalMarkerVerification,
    integratedPlan: historicalCandidateIntegratedPlan,
    terminalEvidence: terminalEvidence(
      historicalCandidateIntegratedPendingRow,
      historicalMarkerTarget,
      'FAILED_BEFORE_PAGES_ACCEPTANCE',
      '2026-08-29T13:14:00.000Z',
    ),
    failureCode: 'HISTORICAL_INTEGRATED_NOT_ACCEPTED',
  });
assert.equal(historicalCandidateIntegratedReconciledSource.reconciliation.action,
  'abort-source');
assert.deepEqual(
  historicalCandidateIntegratedReconciledSource.document.activeModelBinding,
  oldCandidateBinding,
);
assert.equal(
  historicalCandidateIntegratedReconciledSource.document.deploymentId,
  historicalCandidateIntegratedPendingRow.payload.sourceDeploymentId,
);

// Cross-run target reconciliation is likewise bound to the immutable
// IntegratedReturnPlan and may only install the exact H1 integrated target.
assert.throws(() => operationalPendingReconciliationTransition({
  currentRow: historicalCandidateIntegratedPendingRow,
  expectedVersion: 3,
  publicManifest: integratedH1,
  observations: observations(integratedH1, integratedH1),
  publicVerification: integratedH1Verification,
  readiness,
  publicAudit: integratedH1Audit,
  deploymentId: 'pages-historical-candidate-integrated-reconcile',
}), /integrated.*plan/i);
const historicalCandidateIntegratedReconciledTarget =
  operationalPendingReconciliationTransition({
    currentRow: historicalCandidateIntegratedPendingRow,
    expectedVersion: 3,
    publicManifest: integratedH1,
    observations: observations(integratedH1, integratedH1),
    publicVerification: integratedH1Verification,
    readiness,
    publicAudit: integratedH1Audit,
    integratedPlan: historicalCandidateIntegratedPlan,
    deploymentId: 'pages-historical-candidate-integrated-reconcile',
  });
assert.equal(historicalCandidateIntegratedReconciledTarget.document.status,
  RAVSCORE_OPERATIONAL_STATUSES.integrated);
assert.deepEqual(
  historicalCandidateIntegratedReconciledTarget.document.activeModelBinding,
  integratedModelBinding(),
);
assert.deepEqual(
  historicalCandidateIntegratedReconciledTarget.centralTargetProfile,
  readiness.centralProfile,
);

const postBridgeRefreshPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 2,
  sourceBinding: candidateModelBinding(),
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: '4',
});
const postBridgeRefreshBegin = operationalCandidateRefreshTransition({
  action: 'refresh-begin',
  currentRow: legacyRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 2,
  plan: postBridgeRefreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  requestedManifest: candidateH1,
  deploymentId: 'run-post-bridge-refresh',
  now: '2026-08-29T13:07:00.000Z',
});
const postBridgeRefreshPendingRow = Object.freeze({
  version: 3,
  payload: postBridgeRefreshBegin.document,
});
assert.equal(postBridgeRefreshBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.legacyCandidateRefreshBeforeInitialCutover);
assert.deepEqual(postBridgeRefreshBegin.document.sourceModelBinding,
  candidateModelBinding());
assert.deepEqual(postBridgeRefreshBegin.document.activeModelBinding,
  candidateModelBinding());
assert.deepEqual(postBridgeRefreshBegin.document.requestedModelBinding,
  candidateModelBinding());
for (const field of ['returnPlanSha256', 'integratedReadinessSha256',
  'integratedPublicAuditSha256', 'integratedManifestSha256']) {
  assert.equal(postBridgeRefreshBegin.document[field], null);
}
assert.throws(() => assertOperationalActivationDocument({
  ...postBridgeRefreshBegin.document,
  returnPlanSha256: '1'.repeat(64),
}), /exact two-phase endpoint/,
'post-bridge lineage may not mix invented return evidence into noReturn state');

const postBridgeRefreshComplete = operationalCandidateRefreshTransition({
  action: 'refresh-complete',
  currentRow: postBridgeRefreshPendingRow,
  expectedVersion: 3,
  plan: postBridgeRefreshPlan,
  requestedManifest: candidateH1,
  publicVerification: candidateH1Verification,
  deploymentId: 'pages-post-bridge-h1',
  now: '2026-08-29T13:08:00.000Z',
});
const resolvedPostBridgeRefreshComplete = resolveOperationalRavScoreModel({
  version: 4,
  payload: postBridgeRefreshComplete.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedPostBridgeRefreshComplete.initialCutoverRequired, true);
assert.equal(resolvedPostBridgeRefreshComplete.legacySourceRequired, false);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: postBridgeRefreshComplete,
  currentProfile: candidateProfile,
  integratedProfile,
}), candidateProfile);

const postBridgeRefreshAbort = operationalCandidateRefreshTransition({
  action: 'refresh-abort',
  currentRow: postBridgeRefreshPendingRow,
  expectedVersion: 3,
  plan: postBridgeRefreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(postBridgeRefreshPendingRow, candidateH0,
    'FAILED_BEFORE_PAGES_ACCEPTANCE', '2026-08-29T13:08:00.000Z'),
  failureCode: 'POST_BRIDGE_REFRESH_NOT_ACCEPTED',
  now: '2026-08-29T13:09:00.000Z',
});
const resolvedPostBridgeRefreshAbort = resolveOperationalRavScoreModel({
  version: 4,
  payload: postBridgeRefreshAbort.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedPostBridgeRefreshAbort.initialCutoverRequired, true);
assert.equal(resolvedPostBridgeRefreshAbort.legacySourceRequired, false);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: postBridgeRefreshAbort,
  currentProfile: candidateProfile,
  integratedProfile,
}), candidateProfile);

const postBridgeRefreshReconciledTarget = operationalPendingReconciliationTransition({
  currentRow: postBridgeRefreshPendingRow,
  expectedVersion: 3,
  publicManifest: candidateH1,
  observations: observations(candidateH0, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  deploymentId: 'pages-post-bridge-h1-reconciled',
  candidatePlan: postBridgeRefreshPlan,
  now: '2026-08-29T13:08:00.000Z',
});
assert.equal(resolveOperationalRavScoreModel({
  version: 4,
  payload: postBridgeRefreshReconciledTarget.document,
}, { profileRow: candidateProfileRow }).initialCutoverRequired, true);
const postBridgeRefreshReconciledSource = operationalPendingReconciliationTransition({
  currentRow: postBridgeRefreshPendingRow,
  expectedVersion: 3,
  publicManifest: candidateH0,
  observations: observations(candidateH0, candidateH0),
  publicVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(postBridgeRefreshPendingRow, candidateH0,
    'FAILED_BEFORE_PAGES_ACCEPTANCE', '2026-08-29T13:08:00.000Z'),
  failureCode: 'POST_BRIDGE_SOURCE_RECONCILED',
  now: '2026-08-29T13:09:00.000Z',
});
const resolvedPostBridgeRefreshReconciledSource = resolveOperationalRavScoreModel({
  version: 4,
  payload: postBridgeRefreshReconciledSource.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedPostBridgeRefreshReconciledSource.initialCutoverRequired, true);
assert.equal(resolvedPostBridgeRefreshReconciledSource.legacySourceRequired, false);
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: postBridgeRefreshPendingRow,
  observations: observations(candidateH0, legacyRefreshThirdManifest),
}).action, 'third');

// The bridge marker must not block the actual integrated cutover. Once the
// active public source is modern Candidate G, initial return verifies that
// schema-4 source directly (without legacy attestation), and creates genuine
// integrated return lineage on source abort/reconciliation.
const bridgeIntegratedPlan = prepareIntegratedOperationalReturn({
  currentRow: legacyRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: true,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
});
assert.equal(bridgeIntegratedPlan.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);
assert.equal(bridgeIntegratedPlan.legacySourceRequired, false);
assert.deepEqual(bridgeIntegratedPlan.sourceModelBinding, candidateModelBinding());
const bridgeIntegratedBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: legacyRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 2,
  plan: bridgeIntegratedPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  deploymentId: 'run-integrated-after-legacy-bridge',
  now: '2026-08-29T13:07:00.000Z',
});
const bridgeIntegratedPendingRow = Object.freeze({
  version: 3,
  payload: bridgeIntegratedBegin.document,
});
assert.deepEqual(bridgeIntegratedBegin.document.sourceModelBinding,
  candidateModelBinding());
assert.equal(bridgeIntegratedBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);

const bridgeIntegratedComplete = operationalIntegratedReturnTransition({
  action: 'return-complete',
  currentRow: bridgeIntegratedPendingRow,
  expectedVersion: 3,
  plan: bridgeIntegratedPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  publicVerification: integratedH1Verification,
  deploymentId: 'pages-integrated-after-legacy-bridge',
  now: '2026-08-29T13:08:00.000Z',
});
assert.deepEqual(operationalCentralProfileForTransition({
  transition: bridgeIntegratedComplete,
  currentProfile: candidateProfile,
  integratedProfile,
}), readiness.centralProfile);
assert.equal(resolveOperationalRavScoreModel({
  version: 4,
  payload: bridgeIntegratedComplete.document,
}, { profileRow: { version: 9, payload: readiness.centralProfile } })
  .initialCutoverRequired, false);

const bridgeIntegratedAbort = operationalIntegratedReturnTransition({
  action: 'return-abort',
  currentRow: bridgeIntegratedPendingRow,
  expectedVersion: 3,
  plan: bridgeIntegratedPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(bridgeIntegratedPendingRow, candidateH0,
    'FAILED_BEFORE_PAGES_ACCEPTANCE', '2026-08-29T13:08:00.000Z'),
  failureCode: 'BRIDGE_INTEGRATED_PAGES_NOT_ACCEPTED',
  now: '2026-08-29T13:09:00.000Z',
});
const bridgeIntegratedAbortRow = Object.freeze({
  version: 4,
  payload: bridgeIntegratedAbort.document,
});
const resolvedBridgeIntegratedAbort = resolveOperationalRavScoreModel(
  bridgeIntegratedAbortRow,
  { profileRow: candidateProfileRow },
);
assert.equal(resolvedBridgeIntegratedAbort.initialCutoverRequired, true);
assert.equal(resolvedBridgeIntegratedAbort.legacySourceRequired, false);
for (const field of ['returnPlanSha256', 'integratedReadinessSha256',
  'integratedPublicAuditSha256', 'integratedManifestSha256']) {
  assert.match(bridgeIntegratedAbort.document[field], /^[a-f0-9]{64}$/,
    `source abort after bridge must retain genuine ${field}`);
}

const bridgeIntegratedReconciledTarget = operationalPendingReconciliationTransition({
  currentRow: bridgeIntegratedPendingRow,
  expectedVersion: 3,
  publicManifest: integratedH1,
  observations: observations(candidateH0, integratedH1, integratedH1),
  publicVerification: integratedH1Verification,
  readiness,
  publicAudit: integratedH1Audit,
  integratedPlan: bridgeIntegratedPlan,
  deploymentId: 'pages-integrated-after-bridge-reconciled',
  now: '2026-08-29T13:09:00.000Z',
});
assert.deepEqual(operationalCentralProfileForTransition({
  transition: bridgeIntegratedReconciledTarget,
  currentProfile: candidateProfile,
  integratedProfile,
}), readiness.centralProfile);
const bridgeIntegratedReconciledSource = operationalPendingReconciliationTransition({
  currentRow: bridgeIntegratedPendingRow,
  expectedVersion: 3,
  publicManifest: candidateH0,
  observations: observations(candidateH0, candidateH0),
  publicVerification: candidateH0Verification,
  integratedPlan: bridgeIntegratedPlan,
  terminalEvidence: terminalEvidence(bridgeIntegratedPendingRow, candidateH0,
    'FAILED_BEFORE_PAGES_ACCEPTANCE', '2026-08-29T13:08:00.000Z'),
  failureCode: 'BRIDGE_INTEGRATED_SOURCE_RECONCILED',
  now: '2026-08-29T13:09:00.000Z',
});
const resolvedBridgeIntegratedReconciledSource = resolveOperationalRavScoreModel({
  version: 4,
  payload: bridgeIntegratedReconciledSource.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedBridgeIntegratedReconciledSource.initialCutoverRequired, true);
assert.equal(resolvedBridgeIntegratedReconciledSource.legacySourceRequired, false);

const postReturnAbortRefreshPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 4,
  sourceBinding: candidateModelBinding(),
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: '4',
});
const postReturnAbortRefreshBegin = operationalCandidateRefreshTransition({
  action: 'refresh-begin',
  currentRow: bridgeIntegratedAbortRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 4,
  plan: postReturnAbortRefreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  requestedManifest: candidateH1,
  deploymentId: 'run-post-return-abort-refresh',
  now: '2026-08-29T13:10:00.000Z',
});
assert.equal(postReturnAbortRefreshBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefreshBeforeInitialCutover);
for (const field of ['returnPlanSha256', 'integratedReadinessSha256',
  'integratedPublicAuditSha256', 'integratedManifestSha256']) {
  assert.equal(postReturnAbortRefreshBegin.document[field],
    bridgeIntegratedAbort.document[field],
    `ordinary pre-cutover maintenance must retain genuine ${field}`);
}

assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: true,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
}), /centrally active modern Candidate G source/);

// These plans represent immutable pre-lock artifacts. Their transition and
// reconciliation paths must remain usable even though new legacy creation is closed.
const initialPlan = sealedHistoricalInitialPlan({
  currentProfileRow: legacyProfileRow,
  sourceModelBinding: legacyCandidateGControllerBinding(),
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  legacySourceRequired: true,
});
assert.equal(initialPlan.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);
assert.deepEqual(initialPlan.sourceModelBinding, legacyCandidateGControllerBinding());
const initialWarmupPlan = sealedHistoricalInitialPlan({
  currentProfileRow: legacyProfileRow,
  sourceModelBinding: legacyCandidateGControllerBinding(),
  publicManifest: integratedH1,
  publicAudit: integratedWarmupAudit,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  legacySourceRequired: true,
});
assert.equal(initialWarmupPlan.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);
assert.equal(initialWarmupPlan.calibrationEligibleAfterVerifiedActivation, false);
const initialWarmupBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 0,
  plan: initialWarmupPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedWarmupAudit,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  sourceDeploymentId: 'pages-legacy-4308',
  deploymentId: 'run-initial-integrated-warmup',
});
const initialWarmupPendingRow = Object.freeze({
  version: 1,
  payload: initialWarmupBegin.document,
});
const initialWarmupComplete = operationalIntegratedReturnTransition({
  action: 'return-complete',
  currentRow: initialWarmupPendingRow,
  expectedVersion: 1,
  plan: initialWarmupPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedWarmupAudit,
  publicVerification: integratedH1Verification,
  deploymentId: 'pages-initial-integrated-warmup',
});
assert.equal(initialWarmupComplete.document.status,
  RAVSCORE_OPERATIONAL_STATUSES.integrated);
assert.equal(initialWarmupComplete.document.calibrationEligible, false);
assertOperationalActivationDocument(initialWarmupComplete.document, {
  allowSealedHistoricalBindings: true,
});
const initialWarmupReconciledComplete = operationalPendingReconciliationTransition({
  currentRow: initialWarmupPendingRow,
  expectedVersion: 1,
  publicManifest: integratedH1,
  observations: observations(legacyManifest, integratedH1, integratedH1),
  publicVerification: integratedH1Verification,
  readiness,
  publicAudit: integratedWarmupAudit,
  integratedPlan: initialWarmupPlan,
  deploymentId: 'pages-initial-integrated-warmup-reconciled',
});
assert.equal(initialWarmupReconciledComplete.document.calibrationEligible, false,
  'reconciliation must use the sealed warmup target disposition, not model kind');
const warmupMaintenance = operationalIntegratedMaintenanceTransition({
  currentRow: Object.freeze({
    version: 2,
    payload: initialWarmupComplete.document,
  }),
  currentProfileRow: integratedProfileRow,
  expectedVersion: 2,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedWarmupAudit,
  publicVerification: integratedH1Verification,
  readiness,
  deploymentId: 'pages-initial-integrated-warmup-maintenance',
});
assert.equal(warmupMaintenance.document.calibrationEligible, false);
const warmupActiveRow = Object.freeze({
  version: 2,
  payload: initialWarmupComplete.document,
});
const warmupRollbackPlan = candidatePlan({
  centralExpectedVersion: 2,
  sourceBinding: integratedModelBinding(),
  datasetId: candidateH0.datasetId,
  productionReferenceAt: candidateH0.productionReferenceAt,
  salt: '6',
});
const warmupRollbackBegin = operationalActivationTransition({
  action: 'begin',
  currentRow: warmupActiveRow,
  currentProfileRow: integratedProfileRow,
  expectedVersion: 2,
  plan: warmupRollbackPlan,
  sourceManifest: integratedH1,
  sourceVerification: integratedH1Verification,
  requestedManifest: candidateH0,
  deploymentId: 'run-warmup-candidate-rollback',
  now: '2026-08-29T13:02:00.000Z',
});
const warmupRollbackPendingRow = Object.freeze({
  version: 3,
  payload: warmupRollbackBegin.document,
});
assert.equal(warmupRollbackBegin.document.calibrationEligible, false);
for (const field of ['returnPlanSha256', 'integratedReadinessSha256',
  'integratedPublicAuditSha256', 'integratedManifestSha256']) {
  assert.equal(warmupRollbackBegin.document[field], initialWarmupComplete.document[field],
    `warmup rollback must retain sealed source ${field}`);
}
const warmupRollbackAbort = operationalActivationTransition({
  action: 'abort',
  currentRow: warmupRollbackPendingRow,
  expectedVersion: 3,
  plan: warmupRollbackPlan,
  sourceManifest: integratedH1,
  sourceVerification: integratedH1Verification,
  terminalEvidence: terminalEvidence(warmupRollbackPendingRow, integratedH1),
  failureCode: 'WARMUP_ROLLBACK_NOT_STARTED',
});
assert.equal(warmupRollbackAbort.document.calibrationEligible, false);
const warmupRollbackReconciledSource = operationalPendingReconciliationTransition({
  currentRow: warmupRollbackPendingRow,
  expectedVersion: 3,
  publicManifest: integratedH1,
  observations: observations(integratedH1, integratedH1),
  publicVerification: integratedH1Verification,
  candidatePlan: warmupRollbackPlan,
  terminalEvidence: terminalEvidence(warmupRollbackPendingRow, integratedH1),
  failureCode: 'WARMUP_ROLLBACK_SOURCE_RECONCILED',
});
assert.equal(warmupRollbackReconciledSource.document.calibrationEligible, false);
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: legacyRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'schedule',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: true,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
}), /exact manual-dispatch authorization/,
'the scheduler must never initiate the first integrated cutover');
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: legacyRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: false,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
}), /exact manual-dispatch authorization/,
'the exact first-cutover token must remain inert without the explicit boolean');
const initialBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  expectedVersion: 0,
  plan: initialPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  sourceDeploymentId: 'pages-legacy-4308',
  deploymentId: 'run-initial-integrated',
  now: '2026-08-29T13:04:00.000Z',
});
const initialPendingRow = Object.freeze({ version: 1, payload: initialBegin.document });
assert.equal(initialBegin.document.status, RAVSCORE_OPERATIONAL_STATUSES.integratedPending);
for (const field of ['sourceModelBinding', 'activeModelBinding', 'requestedModelBinding']) {
  assert.equal(Object.keys(initialBegin.document[field]).length, 11);
}
assert.deepEqual(initialBegin.document.sourceModelBinding, legacyCandidateGControllerBinding());
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: initialPendingRow,
  observations: observations(legacyManifest, legacyManifest),
}).action, 'wait');
const initialAbort = operationalIntegratedReturnTransition({
  action: 'return-abort',
  currentRow: initialPendingRow,
  expectedVersion: 1,
  plan: initialPlan,
  sourceManifest: legacyManifest,
  sourceAttestation: legacyAttestation,
  sourceVerification: legacyVerification,
  terminalEvidence: terminalEvidence(initialPendingRow, legacyManifest),
  failureCode: 'PAGES_NOT_ACCEPTED',
});
const legacyActiveRow = Object.freeze({ version: 2, payload: initialAbort.document });
assert.equal(initialAbort.document.status, RAVSCORE_OPERATIONAL_STATUSES.candidateActive);
assert.deepEqual(initialAbort.document.sourceModelBinding, legacyCandidateGControllerBinding());
assert.deepEqual(initialAbort.document.requestedModelBinding, integratedModelBinding());
assert.deepEqual(initialAbort.document.activeModelBinding, legacyCandidateGControllerBinding());
const resolvedLegacyActive = resolveOperationalRavScoreModel(legacyActiveRow, {
  profileRow: legacyProfileRow,
});
assert.equal(resolvedLegacyActive.initialCutoverRequired, true);
assert.equal(resolvedLegacyActive.legacySourceRequired, true);
assert.equal(Object.hasOwn(resolvedLegacyActive, 'normalizationRequired'), false,
  'the removed normalization protocol must not survive as a resolver output');
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: legacyActiveRow,
  currentProfileRow: legacyProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: true,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
}), /active modern Candidate G/);

// A normal schema-4 Candidate G weather refresh may run while the first
// integrated cutover is still pending, but it must preserve that durable
// intent through complete, abort and cross-run reconciliation. The following
// first cutover must verify the exact modern Candidate source, never route it
// through the legacy schema-2 attestation.
const failedCandidateInitialDocument = Object.freeze({
  ...initialAbort.document,
  datasetId: candidateH0.datasetId,
  productionReferenceAt: candidateH0.productionReferenceAt,
  activeModelBinding: candidateModelBinding(),
  sourceModelBinding: candidateModelBinding(),
  publicManifestSha256: sha256(candidateH0),
  sourcePublicManifestSha256: sha256(candidateH0),
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  sourceDeploymentId: 'pages-candidate-h0',
  deploymentId: 'pages-candidate-h0',
});
assertOperationalActivationDocument(failedCandidateInitialDocument);
const failedCandidateInitialRow = Object.freeze({
  version: 20,
  payload: failedCandidateInitialDocument,
});
const resolvedFailedCandidateInitial = resolveOperationalRavScoreModel(
  failedCandidateInitialRow,
  { profileRow: candidateProfileRow },
);
assert.equal(resolvedFailedCandidateInitial.initialCutoverRequired, true);
assert.equal(resolvedFailedCandidateInitial.legacySourceRequired, false);

const preCutoverRefreshPlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 20,
  sourceBinding: candidateModelBinding(),
  datasetId: candidateH1.datasetId,
  productionReferenceAt: candidateH1.productionReferenceAt,
  salt: '7',
});
const preCutoverRefreshBegin = operationalCandidateRefreshTransition({
  action: 'refresh-begin',
  currentRow: failedCandidateInitialRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 20,
  plan: preCutoverRefreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  requestedManifest: candidateH1,
  deploymentId: 'run-pre-cutover-refresh',
  now: '2026-08-29T13:02:00.000Z',
});
assert.equal(preCutoverRefreshBegin.document.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefreshBeforeInitialCutover);
for (const field of ['returnPlanSha256', 'integratedReadinessSha256',
  'integratedPublicAuditSha256', 'integratedManifestSha256']) {
  assert.equal(preCutoverRefreshBegin.document[field], failedCandidateInitialDocument[field],
    `pre-cutover refresh must retain the exact ${field} lineage`);
}
const preCutoverRefreshPendingRow = Object.freeze({
  version: 21,
  payload: preCutoverRefreshBegin.document,
});

const preCutoverRefreshComplete = operationalCandidateRefreshTransition({
  action: 'refresh-complete',
  currentRow: preCutoverRefreshPendingRow,
  expectedVersion: 21,
  plan: preCutoverRefreshPlan,
  requestedManifest: candidateH1,
  publicVerification: candidateH1Verification,
  deploymentId: 'pages-pre-cutover-h1',
});
const preCutoverRefreshCompleteRow = Object.freeze({
  version: 22,
  payload: preCutoverRefreshComplete.document,
});
assert.equal(resolveOperationalRavScoreModel(preCutoverRefreshCompleteRow, {
  profileRow: candidateProfileRow,
}).initialCutoverRequired, true);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: preCutoverRefreshComplete,
  currentProfile: candidateProfile,
  integratedProfile,
}), candidateProfile);

const preCutoverRefreshAbort = operationalCandidateRefreshTransition({
  action: 'refresh-abort',
  currentRow: preCutoverRefreshPendingRow,
  expectedVersion: 21,
  plan: preCutoverRefreshPlan,
  sourceManifest: candidateH0,
  sourceVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(preCutoverRefreshPendingRow, candidateH0),
  failureCode: 'PRE_CUTOVER_REFRESH_NOT_ACCEPTED',
});
assert.equal(resolveOperationalRavScoreModel({
  version: 22,
  payload: preCutoverRefreshAbort.document,
}, { profileRow: candidateProfileRow }).initialCutoverRequired, true);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: preCutoverRefreshAbort,
  currentProfile: candidateProfile,
  integratedProfile,
}), candidateProfile,
'a source-aborted pre-cutover refresh must preserve the exact central profile object');

const preCutoverRefreshReconciled = operationalPendingReconciliationTransition({
  currentRow: preCutoverRefreshPendingRow,
  expectedVersion: 21,
  publicManifest: candidateH1,
  observations: observations(candidateH0, candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  deploymentId: 'pages-pre-cutover-reconciled',
  candidatePlan: preCutoverRefreshPlan,
});
assert.equal(resolveOperationalRavScoreModel({
  version: 22,
  payload: preCutoverRefreshReconciled.document,
}, { profileRow: candidateProfileRow }).initialCutoverRequired, true);

const preCutoverRefreshReconciledAbort = operationalPendingReconciliationTransition({
  currentRow: preCutoverRefreshPendingRow,
  expectedVersion: 21,
  publicManifest: candidateH0,
  observations: observations(candidateH0, candidateH0),
  publicVerification: candidateH0Verification,
  terminalEvidence: terminalEvidence(preCutoverRefreshPendingRow, candidateH0),
  failureCode: 'PRE_CUTOVER_REFRESH_SOURCE_RECONCILED',
});
assert.equal(resolveOperationalRavScoreModel({
  version: 22,
  payload: preCutoverRefreshReconciledAbort.document,
}, { profileRow: candidateProfileRow }).initialCutoverRequired, true);

const modernFirstCutoverRequest = {
  currentRow: preCutoverRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: defaultImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: RAVSCORE_INTEGRATED_RETURN_POLICY.manualEventName,
  ref: 'refs/heads/main',
  githubSha: sourceHead,
  initialCutoverRequested: true,
  initialCutoverConfirmation:
    RAVSCORE_INTEGRATED_RETURN_POLICY.initialCutoverConfirmation,
};
assert.throws(() => prepareIntegratedOperationalReturn({
  ...modernFirstCutoverRequest,
  eventName: 'push',
}), /exact manual-dispatch authorization/,
'a push may never create the initial integrated cutover plan');
assert.throws(() => prepareIntegratedOperationalReturn({
  ...modernFirstCutoverRequest,
  initialCutoverConfirmation: 'NOT-EXACT',
}), /exact manual-dispatch authorization/,
'the first cutover token must be exact');
assert.throws(() => prepareIntegratedOperationalReturn({
  ...modernFirstCutoverRequest,
  currentRow: {
    ...preCutoverRefreshCompleteRow,
    payload: { ...preCutoverRefreshCompleteRow.payload, sourceHead: laterHead },
  },
}), /current same-head Candidate G source closure parity/,
'the centrally active Candidate G source must belong to the dispatched head');
assert.throws(() => prepareIntegratedOperationalReturn({
  ...modernFirstCutoverRequest,
  sourceImplementationClosureSha256: 'b'.repeat(64),
}), /current same-head Candidate G source closure parity/,
'the supplied source closure must equal the centrally active source closure');
assert.throws(() => prepareIntegratedOperationalReturn({
  ...modernFirstCutoverRequest,
  ref: 'refs/heads/feature',
}), /exact manual-dispatch authorization/,
'first cutover may only be created on main');
assert.throws(() => prepareIntegratedOperationalReturn({
  ...modernFirstCutoverRequest,
  githubSha: laterHead,
}), /exact manual-dispatch authorization/,
'the checked-out head must equal the requested source head');
const modernInitialPlan = prepareIntegratedOperationalReturn(modernFirstCutoverRequest);
assert.equal(modernInitialPlan.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);
assert.equal(modernInitialPlan.legacySourceRequired, false);
assert.equal(initialPlan.legacySourceRequired, true);
const forgedLegacyMode = {
  ...modernInitialPlan,
  legacySourceRequired: true,
};
forgedLegacyMode.planSha256 = sha256(Object.fromEntries(
  Object.entries(forgedLegacyMode).filter(([key]) => key !== 'planSha256'),
));
assert.throws(() => assertIntegratedReturnPlan(forgedLegacyMode),
  /source verification mode is incompatible/);

const modernInitialBegin = operationalIntegratedReturnTransition({
  action: 'return-begin',
  currentRow: preCutoverRefreshCompleteRow,
  currentProfileRow: candidateProfileRow,
  expectedVersion: 22,
  plan: modernInitialPlan,
  readiness,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  sourceManifest: candidateH1,
  sourceVerification: candidateH1Verification,
  deploymentId: 'run-modern-initial-cutover',
  now: '2026-08-29T13:04:00.000Z',
});
assert.deepEqual(modernInitialBegin.document.sourceModelBinding, candidateModelBinding());
const modernInitialPendingRow = Object.freeze({
  version: 23,
  payload: modernInitialBegin.document,
});
const modernInitialAbort = operationalIntegratedReturnTransition({
  action: 'return-abort',
  currentRow: modernInitialPendingRow,
  expectedVersion: 23,
  plan: modernInitialPlan,
  sourceManifest: candidateH1,
  sourceVerification: candidateH1Verification,
  terminalEvidence: terminalEvidence(modernInitialPendingRow, candidateH1),
  failureCode: 'MODERN_INITIAL_PAGES_NOT_ACCEPTED',
});
const resolvedModernInitialAbort = resolveOperationalRavScoreModel({
  version: 24,
  payload: modernInitialAbort.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedModernInitialAbort.initialCutoverRequired, true);
assert.equal(resolvedModernInitialAbort.legacySourceRequired, false);

const modernInitialReconciledComplete = operationalPendingReconciliationTransition({
  currentRow: modernInitialPendingRow,
  expectedVersion: 23,
  publicManifest: integratedH1,
  observations: observations(candidateH1, integratedH1, integratedH1),
  publicVerification: integratedH1Verification,
  readiness,
  publicAudit: integratedH1Audit,
  integratedPlan: modernInitialPlan,
  deploymentId: 'pages-modern-initial-reconciled',
});
assert.equal(modernInitialReconciledComplete.document.status,
  RAVSCORE_OPERATIONAL_STATUSES.integrated);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: modernInitialReconciledComplete,
  currentProfile: candidateProfile,
  integratedProfile,
}), readiness.centralProfile,
'a modern initial target reconciliation must switch exactly once to the sealed integrated profile');

const modernInitialReconciledAbort = operationalPendingReconciliationTransition({
  currentRow: modernInitialPendingRow,
  expectedVersion: 23,
  publicManifest: candidateH1,
  observations: observations(candidateH1, candidateH1),
  publicVerification: candidateH1Verification,
  integratedPlan: modernInitialPlan,
  terminalEvidence: terminalEvidence(modernInitialPendingRow, candidateH1),
  failureCode: 'MODERN_INITIAL_SOURCE_RECONCILED',
});
const resolvedModernInitialReconciledAbort = resolveOperationalRavScoreModel({
  version: 24,
  payload: modernInitialReconciledAbort.document,
}, { profileRow: candidateProfileRow });
assert.equal(resolvedModernInitialReconciledAbort.initialCutoverRequired, true);
assert.equal(resolvedModernInitialReconciledAbort.legacySourceRequired, false);
assert.strictEqual(operationalCentralProfileForTransition({
  transition: modernInitialReconciledAbort,
  currentProfile: candidateProfile,
  integratedProfile,
}), candidateProfile);

const modernThirdManifest = manifest(candidateModelBinding(),
  'rr-20260829121600-210-third', '2026-08-29T12:16:00.000Z');
assert.equal(operationalPendingReconciliationStabilization({
  currentRow: modernInitialPendingRow,
  observations: observations(candidateH1, modernThirdManifest),
}).action, 'third');
assert.throws(() => assertOperationalActivationDocument({
  ...preCutoverRefreshBegin.document,
  activeModelBinding: legacyCandidateGControllerBinding(),
  sourceModelBinding: legacyCandidateGControllerBinding(),
  requestedModelBinding: legacyCandidateGControllerBinding(),
}), /Pending Candidate G transition must preserve its exact active source/,
'the pre-cutover refresh marker is valid only for the exact modern Candidate G binding');
assert.equal(resolveOperationalRavScoreModel({
  version: 4,
  payload: refreshReconciled.document,
}, {
  profileRow: candidateProfileRow,
}).initialCutoverRequired, false,
'ordinary Candidate G refresh must never invent first-cutover intent');

// A pending A artifact remains verifiable after main moves to B. Only the
// explicitly sealed reconciliation path accepts old hashes, and the exact
// target central profile comes from A readiness instead of being rebuilt by B.
const historicalBinding = Object.freeze({
  ...integratedModelBinding(),
  modelContractSha256: '9'.repeat(64),
  modelBundleSha256: 'c'.repeat(64),
});
const historicalProfile = Object.freeze({
  ...readiness.centralProfile,
  modelContractSha256: historicalBinding.modelContractSha256,
  modelBundleSha256: historicalBinding.modelBundleSha256,
  sourceVersion: '4.0.309',
});
const historicalReadiness = Object.freeze({
  ...readiness,
  modelContractSha256: historicalBinding.modelContractSha256,
  modelBundleSha256: historicalBinding.modelBundleSha256,
  modelBinding: historicalBinding,
  centralProfile: historicalProfile,
  assistantBinding: Object.freeze({
    ...readiness.assistantBinding,
    modelContractSha256: historicalBinding.modelContractSha256,
    modelBundleSha256: historicalBinding.modelBundleSha256,
  }),
});
const historicalManifest = manifest(historicalBinding,
  initialBegin.document.datasetId, initialBegin.document.productionReferenceAt);
const historicalAudit = integratedAudit(historicalBinding);
const { planSha256: _initialPlanSha256, ...historicalReturnPlanBase } = initialPlan;
const historicalReturnPlanUnsealed = Object.freeze({
  ...historicalReturnPlanBase,
  centralExpectedVersion: 10,
  activeModelBinding: historicalBinding,
  integratedReadinessSha256: sha256(historicalReadiness),
  integratedPublicAuditSha256: sha256(historicalAudit),
  integratedManifestSha256: sha256(historicalManifest),
});
const historicalReturnPlan = Object.freeze({
  ...historicalReturnPlanUnsealed,
  planSha256: sha256(historicalReturnPlanUnsealed),
});
const historicalPendingDocument = Object.freeze({
  ...initialBegin.document,
  sourceHead,
  requestedModelBinding: historicalBinding,
  datasetId: historicalManifest.datasetId,
  productionReferenceAt: historicalManifest.productionReferenceAt,
  requestedPublicManifestSha256: sha256(historicalManifest),
  returnPlanSha256: historicalReturnPlan.planSha256,
  integratedReadinessSha256: sha256(historicalReadiness),
  integratedPublicAuditSha256: sha256(historicalAudit),
  integratedManifestSha256: sha256(historicalManifest),
});
assert.throws(() => assertOperationalActivationDocument(historicalPendingDocument),
  /exact current or legacy-bootstrap binding/);
const historicalPendingRow = Object.freeze({ version: 11, payload: historicalPendingDocument });
const historicalTransition = operationalPendingReconciliationTransition({
  currentRow: historicalPendingRow,
  expectedVersion: 11,
  publicManifest: historicalManifest,
  observations: observations(historicalManifest, historicalManifest),
  publicVerification: verification('integrated', historicalBinding, historicalManifest, sourceHead),
  readiness: historicalReadiness,
  publicAudit: historicalAudit,
  integratedPlan: historicalReturnPlan,
  deploymentId: 'pages-head-a-target',
});
assert.deepEqual(historicalTransition.centralTargetProfile, historicalProfile);
assert.deepEqual(operationalCentralProfileForTransition({
  transition: historicalTransition,
  currentProfile: legacyProfile,
  integratedProfile,
}), historicalProfile);
assert.equal(historicalTransition.document.sourceHead, sourceHead);
assert.notEqual(historicalTransition.document.sourceHead, laterHead,
  'main B must not rewrite the sealed transition source head A');

const historicalCandidateBinding = Object.freeze({
  ...candidateModelBinding(),
  modelContractSha256: 'd'.repeat(64),
  modelBundleSha256: 'e'.repeat(64),
});
const historicalCandidateTarget = manifest(historicalCandidateBinding,
  refreshPendingRow.payload.datasetId, refreshPendingRow.payload.productionReferenceAt);
const sealedHistoricalCandidateProfile = candidateProfileForBinding(
  historicalCandidateBinding,
);
const historicalCandidatePlan = candidatePlan({
  mode: 'dry-run',
  centralExpectedVersion: 11,
  sourceBinding: historicalCandidateBinding,
  targetBinding: historicalCandidateBinding,
  targetProfile: sealedHistoricalCandidateProfile,
  datasetId: historicalCandidateTarget.datasetId,
  productionReferenceAt: historicalCandidateTarget.productionReferenceAt,
  salt: '7',
});
const historicalCandidatePending = Object.freeze({
  ...refreshPendingRow.payload,
  sourceHead: historicalCandidatePlan.sourceHead,
  sourceModelBinding: historicalCandidateBinding,
  requestedModelBinding: historicalCandidateBinding,
  activeModelBinding: historicalCandidateBinding,
  candidatePlanSha256: historicalCandidatePlan.planSha256,
  candidateFullSha256: historicalCandidatePlan.candidateFullSha256,
  privateBundleContentSha256: historicalCandidatePlan.privateBundleContentSha256,
  sourceImplementationClosureSha256:
    historicalCandidatePlan.sourceImplementationClosureSha256,
  requestedImplementationClosureSha256:
    historicalCandidatePlan.requestedImplementationClosureSha256,
  sourcePublicManifestSha256: 'f'.repeat(64),
  publicManifestSha256: 'f'.repeat(64),
  requestedPublicManifestSha256: sha256(historicalCandidateTarget),
});
const historicalCandidateTransition = operationalPendingReconciliationTransition({
  currentRow: { version: 12, payload: historicalCandidatePending },
  expectedVersion: 12,
  publicManifest: historicalCandidateTarget,
  observations: observations(historicalCandidateTarget, historicalCandidateTarget),
  publicVerification: verification('candidate-g', historicalCandidateBinding,
    historicalCandidateTarget, sourceHead),
  candidatePlan: historicalCandidatePlan,
  deploymentId: 'pages-candidate-head-a-target',
});
const resolvedHistoricalCandidateProfile = operationalCentralProfileForTransition({
  transition: historicalCandidateTransition,
  currentProfile: candidateProfile,
  integratedProfile,
});
assert.deepEqual(historicalCandidateTransition.centralTargetProfile,
  sealedHistoricalCandidateProfile);
assert.equal(resolvedHistoricalCandidateProfile.modelContractSha256,
  historicalCandidateBinding.modelContractSha256);
assert.equal(resolvedHistoricalCandidateProfile.modelBundleSha256,
  historicalCandidateBinding.modelBundleSha256);
for (const mutation of [
  { ...candidateActiveRow.payload.activeModelBinding, modelBundleSha256: '0'.repeat(64) },
  { ...candidateActiveRow.payload.activeModelBinding, rankingPolicyId: 'forged-policy-v1' },
]) assert.throws(() => assertOperationalActivationDocument({
  ...candidateActiveRow.payload,
  activeModelBinding: mutation,
}), /exact current or legacy-bootstrap binding/);

assert.deepEqual(Object.values(RAVSCORE_OPERATIONAL_STATUSES).sort(), [
  'CANDIDATE_G_ACTIVE', 'CANDIDATE_G_PENDING', 'INTEGRATED_ACTIVE', 'INTEGRATED_PENDING',
].sort());
assert.deepEqual(Object.values(RAVSCORE_OPERATIONAL_TRANSITION_KINDS).sort(), [
  'CANDIDATE_G_REFRESH', 'CANDIDATE_G_ROLLBACK',
  'CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER',
  'INITIAL_INTEGRATED_CUTOVER', 'INTEGRATED_RETURN',
  'LEGACY_CANDIDATE_G_REFRESH_BEFORE_INITIAL_CUTOVER',
].sort());
assert.throws(() => assertOperationalActivationDocument({
  ...maintenance.document,
  transitionKind: 'INTEGRATED_REFRESH',
}), /Operational RavScore activation document is invalid/);
assert.throws(() => assertOperationalActivationDocument({
  ...maintenance.document,
  transitionKind:RAVSCORE_OPERATIONAL_TRANSITION_KINDS.candidateRefresh,
}), /Integrated maintenance document lacks one exact active public identity/,
'et identity-neutralt integreret reseal må ikke ommærkes som Candidate G scheduler-refresh');

const serialized = JSON.stringify([
  rollbackBegin.document,
  rollbackAbort.document,
  rollbackComplete.document,
  refreshBegin.document,
  refreshReconciled.document,
  refreshAbort.document,
  returnBegin.document,
  returnComplete.document,
  maintenance.document,
  historicalIntegratedBegin.document,
  historicalIntegratedComplete.document,
  historicalIntegratedAbort.document,
  historicalIntegratedReconciledTarget.document,
  historicalIntegratedReconciledSource.document,
  initialBegin.document,
  initialAbort.document,
  legacyRefreshBegin.document,
  legacyRefreshComplete.document,
  legacyRefreshAbort.document,
  legacyRefreshReconciledTarget.document,
  legacyRefreshReconciledSource.document,
  preCutoverRefreshBegin.document,
  preCutoverRefreshComplete.document,
  preCutoverRefreshAbort.document,
  preCutoverRefreshReconciled.document,
  preCutoverRefreshReconciledAbort.document,
  modernInitialBegin.document,
  modernInitialAbort.document,
  historicalTransition.document,
]);
assert.doesNotMatch(serialized, /coordinates|waterPoint|landPoint|rawVector|currentU|currentV/i);

console.log('Operational RavScore v4 protocol: exact 4/4 state machine, legacy bootstrap, delayed visibility, durable refresh, terminal evidence, head-moved sealed reconciliation, exact target profile and privacy passed.');
