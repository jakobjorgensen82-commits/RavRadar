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
  assertOperationalActivationDocument,
  candidateGOperationalProfileDocument,
  operationalActivationTransition,
  operationalCandidateRefreshTransition,
  operationalCentralProfileForTransition,
  operationalIntegratedMaintenanceTransition,
  operationalIntegratedReturnTransition,
  operationalPendingReconciliationClassification,
  operationalPendingReconciliationStabilization,
  operationalPendingReconciliationTransition,
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

function integratedAudit(binding = integratedModelBinding()) {
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
    rollback: Object.freeze({ readyPartCount: 673 }),
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

function candidatePlan({
  mode = 'execute',
  centralExpectedVersion,
  sourceBinding,
  datasetId,
  productionReferenceAt,
  salt,
}) {
  const activation = {
    schemaVersion: '1.0.0',
    kind: 'RAVSCORE_CANDIDATE_G_OPERATIONAL_ROLLBACK_PLAN',
    mode,
    sourceHead,
    datasetId,
    productionReferenceAt,
    privateBundleContentSha256: salt.repeat(64),
    sourceImplementationClosureSha256: defaultImplementationClosureSha256,
    requestedImplementationClosureSha256: defaultImplementationClosureSha256,
    centralExpectedVersion,
    sourceModelBinding: structuredClone(sourceBinding),
    activeModelBinding: candidateModelBinding(),
    rollbackId: CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    calibrationEligible: false,
  };
  return Object.freeze({
    ...activation,
    planSha256: sha256(activation),
    candidateFullSha256: String.fromCharCode(salt.charCodeAt(0) + 1).repeat(64),
    privatePayloadLogged: false,
  });
}

function terminalEvidence(pendingRow, sourceManifest, status = 'FAILED_BEFORE_PAGES_ACCEPTANCE') {
  return Object.freeze({
    schemaVersion: 'ravscore-operational-pages-attempt-terminal-v1',
    transitionSourceHead: pendingRow.payload.sourceHead,
    requestedPublicManifestSha256: pendingRow.payload.requestedPublicManifestSha256,
    attemptId: pendingRow.payload.deploymentId,
    status,
    pagesRequestAccepted: false,
    observedSourcePublicManifestSha256: sha256(sourceManifest),
    checkedAt: '2026-08-29T13:05:00.000Z',
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
}), /cannot change the exact active model binding/);

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
    activationState: 'candidate-g-only-local-fail-closed',
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
const initialPlan = prepareIntegratedOperationalReturn({
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'push',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
});
assert.equal(initialPlan.transitionKind,
  RAVSCORE_OPERATIONAL_TRANSITION_KINDS.initialIntegratedCutover);
assert.deepEqual(initialPlan.sourceModelBinding, legacyCandidateGControllerBinding());
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: null,
  currentProfileRow: legacyProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'schedule',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
}), /Initial integrated cutover requires the exact main push/,
'the scheduler must never initiate the first integrated cutover');
assert.throws(() => prepareIntegratedOperationalReturn({
  currentRow: null,
  currentProfileRow: { ...legacyProfileRow, payload: { ...legacyProfile, sourceVersion: '4.0.307' } },
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'push',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
}), /exact production-verified/);
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
assert.equal(Object.hasOwn(resolvedLegacyActive, 'normalizationRequired'), false,
  'the removed normalization protocol must not survive as a resolver output');
assert.doesNotThrow(() => prepareIntegratedOperationalReturn({
  currentRow: legacyActiveRow,
  currentProfileRow: legacyProfileRow,
  sourceHead,
  publicManifest: integratedH1,
  publicAudit: integratedH1Audit,
  readiness,
  sourceImplementationClosureSha256: legacyImplementationClosureSha256,
  requestedImplementationClosureSha256: defaultImplementationClosureSha256,
  eventName: 'push',
  ref: 'refs/heads/main',
  githubSha: sourceHead,
}));

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
const historicalPendingDocument = Object.freeze({
  ...initialBegin.document,
  sourceHead,
  requestedModelBinding: historicalBinding,
  datasetId: historicalManifest.datasetId,
  productionReferenceAt: historicalManifest.productionReferenceAt,
  requestedPublicManifestSha256: sha256(historicalManifest),
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
const historicalCandidatePending = Object.freeze({
  ...refreshPendingRow.payload,
  sourceModelBinding: historicalCandidateBinding,
  requestedModelBinding: historicalCandidateBinding,
  activeModelBinding: historicalCandidateBinding,
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
  deploymentId: 'pages-candidate-head-a-target',
});
const historicalCandidateProfile = operationalCentralProfileForTransition({
  transition: historicalCandidateTransition,
  currentProfile: candidateProfile,
  integratedProfile,
});
assert.equal(historicalCandidateProfile.modelContractSha256,
  historicalCandidateBinding.modelContractSha256);
assert.equal(historicalCandidateProfile.modelBundleSha256,
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
  'INITIAL_INTEGRATED_CUTOVER', 'INTEGRATED_RETURN',
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
  initialBegin.document,
  initialAbort.document,
  historicalTransition.document,
]);
assert.doesNotMatch(serialized, /coordinates|waterPoint|landPoint|rawVector|currentU|currentV/i);

console.log('Operational RavScore v4 protocol: exact 4/4 state machine, legacy bootstrap, delayed visibility, durable refresh, terminal evidence, head-moved sealed reconciliation, exact target profile and privacy passed.');
