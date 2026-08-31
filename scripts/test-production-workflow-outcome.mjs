import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  classifyProductionWorkflowOutcome,
  PRODUCTION_WORKFLOW_OUTCOME_SCHEMA,
  PRODUCTION_WORKFLOW_OUTCOME_STATUSES,
  validateProductionWorkflowOutcome,
} from './production-workflow-outcome.mjs';

const base = () => ({
  sourceHead: 'a'.repeat(40),
  runId: '123456789',
  runAttempt: '1',
  eventName: 'schedule',
  refIsMain: true,
  geometryV2Pilot: false,
  geometryV2National: false,
  jobs: {
    validateDispatch: 'success',
    reconcileOperationalPending: 'success',
    recoverOperationalPagesTarget: 'skipped',
    finalizeOperationalPagesRecovery: 'skipped',
    operationalRecoveryGate: 'success',
    currentHourReadiness: 'success',
    tripStorageReadiness: 'success',
    buildAndPrepare: 'success',
    geometryV2National: 'skipped',
    geometryV2Pilot: 'skipped',
    deployPages: 'success',
  },
  proof: {
    recoveryAction: 'NONE',
    currentReady: true,
    tripStorageReady: true,
    preflightShouldRun: true,
    operationalAction: 'integrated',
    shouldDeploy: true,
    weatherOutcome: 'success',
    fullValidationOutcome: 'success',
    releaseGateOutcome: 'success',
    pagesBuildOutcome: 'success',
    pagesPrivacyOutcome: 'success',
    handoffUploadOutcome: 'success',
    pagesConfigureOutcome: 'success',
    pagesUploadOutcome: 'success',
    artifactBuilt: true,
    deploymentOutcome: 'success',
    publicVerificationOutcome: 'success',
    deployedVerified: true,
  },
});

function withPatch(input, patch) {
  return {
    ...input,
    ...patch,
    jobs: { ...input.jobs, ...(patch.jobs ?? {}) },
    proof: { ...input.proof, ...(patch.proof ?? {}) },
  };
}

function noProductionProof(overrides = {}) {
  return {
    ...Object.fromEntries(Object.keys(base().proof).map((key) => [key, null])),
    recoveryAction: 'NONE',
    ...overrides,
  };
}

function expectStatus(input, status, reasonCode) {
  const report = classifyProductionWorkflowOutcome(input);
  assert.equal(report.schemaVersion, PRODUCTION_WORKFLOW_OUTCOME_SCHEMA);
  assert.equal(report.status, status);
  assert.equal(report.reasonCode, reasonCode);
  assert.equal(report.privatePayloadIncluded, false);
  assert.equal(validateProductionWorkflowOutcome(report), report);
  return report;
}

assert.equal(PRODUCTION_WORKFLOW_OUTCOME_SCHEMA, 'ravradar-production-workflow-outcome-v2');
assert.deepEqual(PRODUCTION_WORKFLOW_OUTCOME_STATUSES, ['NOOP', 'DEFERRED', 'BUILT', 'DEPLOYED', 'FAILED']);
expectStatus(base(), 'DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED');
for (const recoveryAction of ['SAFE_SOURCE_ABORT', 'TARGET_RECONCILE']) {
  expectStatus(withPatch(base(), {
    proof: { recoveryAction },
  }), 'DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED');
}
expectStatus(withPatch(base(), {
  jobs: {
    recoverOperationalPagesTarget: 'success',
    finalizeOperationalPagesRecovery: 'success',
  },
  proof: { recoveryAction: 'EXACT_TARGET_REDEPLOY' },
}), 'DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED');
const recoveryOnlyDeployment = withPatch(base(), {
  jobs: {
    recoverOperationalPagesTarget: 'success',
    finalizeOperationalPagesRecovery: 'success',
    deployPages: 'skipped',
  },
  proof: {
    recoveryAction: 'EXACT_TARGET_REDEPLOY',
    preflightShouldRun: false,
    operationalAction: null,
    shouldDeploy: null,
    weatherOutcome: null,
    fullValidationOutcome: null,
    releaseGateOutcome: null,
    pagesBuildOutcome: null,
    pagesPrivacyOutcome: null,
    handoffUploadOutcome: null,
    pagesConfigureOutcome: null,
    pagesUploadOutcome: null,
    artifactBuilt: null,
    deploymentOutcome: null,
    publicVerificationOutcome: null,
    deployedVerified: null,
  },
});
expectStatus(recoveryOnlyDeployment, 'DEPLOYED', 'RECOVERED_PUBLIC_DEPLOYMENT_VERIFIED');
expectStatus(withPatch(base(), {
  jobs: { recoverOperationalPagesTarget: 'success' },
}), 'FAILED', 'INCONSISTENT_RECOVERY_EVIDENCE');
expectStatus(withPatch(base(), {
  proof: { recoveryAction: 'EXACT_TARGET_REDEPLOY' },
}), 'FAILED', 'INCONSISTENT_RECOVERY_EVIDENCE');
expectStatus(withPatch(base(), {
  jobs: {
    recoverOperationalPagesTarget: 'failure',
    finalizeOperationalPagesRecovery: 'skipped',
  },
  proof: { recoveryAction: 'EXACT_TARGET_REDEPLOY' },
}), 'FAILED', 'UPSTREAM_JOB_FAILED');
expectStatus(withPatch(base(), {
  jobs: { finalizeOperationalPagesRecovery: 'success' },
  proof: { recoveryAction: 'TARGET_RECONCILE' },
}), 'FAILED', 'INCONSISTENT_RECOVERY_EVIDENCE');
expectStatus(withPatch(base(), {
  proof: { recoveryAction: 'UNKNOWN_RECOVERY' },
}), 'FAILED', 'INVALID_OUTCOME_EVIDENCE');
expectStatus(withPatch(base(), {
  proof: { operationalAction: 'candidate-legacy-maintenance' },
}), 'DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED');
for (const operationalAction of [
  'candidate-historical-maintenance',
  'integrated-historical-maintenance',
]) {
  const deployed = expectStatus(withPatch(base(), {
    proof: { operationalAction },
  }), 'DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED');
  assert.equal(deployed.proof.operationalAction, operationalAction);
  expectStatus(withPatch(base(), {
    jobs: { deployPages: 'skipped' },
    proof: {
      operationalAction,
      shouldDeploy: false,
      pagesConfigureOutcome: null,
      pagesUploadOutcome: null,
      deploymentOutcome: null,
      publicVerificationOutcome: null,
      deployedVerified: null,
    },
  }), 'FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  expectStatus(withPatch(base(), {
    proof: {
      operationalAction,
      publicVerificationOutcome: null,
      deployedVerified: false,
    },
  }), 'FAILED', 'DEPLOYMENT_NOT_VERIFIED');
}
expectStatus(withPatch(base(), {
  proof: { operationalAction: 'unknown-historical-maintenance' },
}), 'FAILED', 'INVALID_OUTCOME_EVIDENCE');

expectStatus(withPatch(base(), {
  jobs: { deployPages: 'skipped' },
  proof: {
    preflightShouldRun: false,
    operationalAction: null,
    shouldDeploy: null,
    weatherOutcome: null,
    fullValidationOutcome: null,
    releaseGateOutcome: null,
    pagesBuildOutcome: null,
    pagesPrivacyOutcome: null,
    handoffUploadOutcome: null,
    pagesConfigureOutcome: null,
    pagesUploadOutcome: null,
    artifactBuilt: null,
    deploymentOutcome: null,
    publicVerificationOutcome: null,
    deployedVerified: null,
  },
}), 'NOOP', 'FRESH_WEATHER_NO_UPDATE_REQUIRED');

const currentDeferred = withPatch(base(), {
  jobs: { tripStorageReadiness: 'skipped', buildAndPrepare: 'skipped', deployPages: 'skipped' },
  proof: noProductionProof({
    currentReady: false,
  }),
});
expectStatus(currentDeferred, 'DEFERRED', 'CURRENT_INPUT_DEFERRED');
expectStatus(withPatch(currentDeferred, {
  proof: { weatherOutcome: 'success' },
}), 'FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');

const tripDeferred = withPatch(base(), {
  jobs: { buildAndPrepare: 'skipped', deployPages: 'skipped' },
  proof: noProductionProof({
    currentReady: true,
    tripStorageReady: false,
  }),
});
expectStatus(tripDeferred, 'DEFERRED', 'TRIP_STORAGE_DEFERRED');
expectStatus(withPatch(tripDeferred, {
  proof: { shouldDeploy: true },
}), 'FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');

expectStatus(withPatch(base(), {
  jobs: { deployPages: 'skipped' },
  proof: {
    operationalAction: 'candidate-dry-run',
    shouldDeploy: false,
    pagesConfigureOutcome: null,
    pagesUploadOutcome: null,
    deploymentOutcome: null,
    publicVerificationOutcome: null,
    deployedVerified: null,
  },
}), 'BUILT', 'SEALED_ARTIFACT_NOT_DEPLOYED');
expectStatus(withPatch(base(), {
  jobs: { deployPages: 'skipped' },
  proof: {
    operationalAction: 'candidate-dry-run',
    shouldDeploy: false,
    pagesConfigureOutcome: null,
    pagesUploadOutcome: null,
    deploymentOutcome: null,
    publicVerificationOutcome: 'success',
    deployedVerified: null,
  },
}), 'FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');

expectStatus(withPatch(base(), {
  proof: { deployedVerified: false },
}), 'FAILED', 'DEPLOYMENT_NOT_VERIFIED');

expectStatus(withPatch(base(), {
  proof: { publicVerificationOutcome: null },
}), 'FAILED', 'DEPLOYMENT_NOT_VERIFIED');

expectStatus(withPatch(base(), {
  proof: { releaseGateOutcome: 'skipped' },
}), 'FAILED', 'INCOMPLETE_BUILD_GATES');

expectStatus(withPatch(base(), {
  jobs: { deployPages: 'skipped' },
  proof: {
    preflightShouldRun: false,
    shouldDeploy: null,
    artifactBuilt: null,
    deployedVerified: null,
    releaseGateOutcome: 'success',
  },
}), 'FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');

expectStatus(withPatch(base(), {
  proof: { operationalAction: 'candidate-dry-run' },
}), 'FAILED', 'INCOMPLETE_BUILD_GATES');

expectStatus(withPatch(base(), {
  jobs: { buildAndPrepare: 'failure', deployPages: 'skipped' },
}), 'FAILED', 'UPSTREAM_JOB_FAILED');

expectStatus(withPatch(base(), {
  eventName: 'workflow_dispatch',
  geometryV2Pilot: true,
  jobs: {
    reconcileOperationalPending: 'skipped',
    buildAndPrepare: 'skipped',
    geometryV2Pilot: 'success',
    deployPages: 'skipped',
  },
  proof: noProductionProof({ recoveryAction: null }),
}), 'NOOP', 'PRIVATE_GEOMETRY_OPERATION_COMPLETED');

expectStatus(withPatch(base(), {
  eventName: 'workflow_dispatch',
  geometryV2Pilot: true,
  jobs: {
    reconcileOperationalPending: 'skipped',
    buildAndPrepare: 'skipped',
    geometryV2Pilot: 'failure',
    deployPages: 'skipped',
  },
  proof: noProductionProof({ recoveryAction: null }),
}), 'FAILED', 'UPSTREAM_JOB_FAILED');

expectStatus(withPatch(base(), {
  proof: { weatherOutcome: 'invented' },
}), 'FAILED', 'INVALID_OUTCOME_EVIDENCE');

const privacyReport = expectStatus(withPatch(base(), {
  sourceHead: 'not-a-sha',
}), 'FAILED', 'INVALID_OUTCOME_EVIDENCE');
const serialized = JSON.stringify(privacyReport);
for (const forbidden of ['waterPoint', 'landPoint', 'currentUMps', 'currentVMps', 'coordinates', 'rawPayload', 'weatherPayload']) {
  assert.equal(serialized.includes(forbidden), false, `Outcome must not contain ${forbidden}`);
}
assert.equal(serialized.includes('not-a-sha'), false, 'Invalid raw metadata must be sanitized');

assert.throws(() => validateProductionWorkflowOutcome({
  ...privacyReport,
  rawPayload: {},
}), /unexpected field set/);
const deployedReport = classifyProductionWorkflowOutcome(base());
assert.throws(() => validateProductionWorkflowOutcome({
  ...deployedReport,
  schemaVersion: 'ravradar-production-workflow-outcome-v1',
}), /Unexpected outcome schema/);
const missingRecoveryJobReport = structuredClone(deployedReport);
delete missingRecoveryJobReport.jobResults.operationalRecoveryGate;
assert.throws(() => validateProductionWorkflowOutcome(missingRecoveryJobReport), /job results has an unexpected field set/);
const missingRecoveryProofReport = structuredClone(deployedReport);
delete missingRecoveryProofReport.proof.recoveryAction;
assert.throws(() => validateProductionWorkflowOutcome(missingRecoveryProofReport), /production proof has an unexpected field set/);
assert.throws(() => validateProductionWorkflowOutcome({
  ...deployedReport,
  status: 'NOOP',
}), /classification does not match/);
assert.throws(() => validateProductionWorkflowOutcome({
  ...deployedReport,
  privatePayloadIncluded: true,
}), /must not include private payloads/);

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'ravradar-production-outcome-'));
const output = path.join(temporary, 'outcome.json');
const githubOutput = path.join(temporary, 'github-output.txt');
const summary = path.join(temporary, 'summary.md');
const cli = spawnSync(process.execPath, [
  'scripts/production-workflow-outcome.mjs',
  '--output', output,
  '--github-output', githubOutput,
  '--summary', summary,
], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    RAVRADAR_OUTCOME_SOURCE_HEAD: 'b'.repeat(40),
    RAVRADAR_OUTCOME_RUN_ID: '987654321',
    RAVRADAR_OUTCOME_RUN_ATTEMPT: '2',
    RAVRADAR_OUTCOME_EVENT_NAME: 'schedule',
    RAVRADAR_OUTCOME_REF_IS_MAIN: 'true',
    RAVRADAR_OUTCOME_GEOMETRY_PILOT: 'false',
    RAVRADAR_OUTCOME_GEOMETRY_NATIONAL: 'false',
    RAVRADAR_OUTCOME_JOB_VALIDATE_DISPATCH: 'success',
    RAVRADAR_OUTCOME_JOB_RECONCILE: 'success',
    RAVRADAR_OUTCOME_JOB_RECOVERY_WRITER: 'skipped',
    RAVRADAR_OUTCOME_JOB_RECOVERY_FINALIZER: 'skipped',
    RAVRADAR_OUTCOME_JOB_RECOVERY_GATE: 'success',
    RAVRADAR_OUTCOME_RECOVERY_ACTION: 'NONE',
    RAVRADAR_OUTCOME_JOB_CURRENT_READINESS: 'success',
    RAVRADAR_OUTCOME_JOB_TRIP_READINESS: 'success',
    RAVRADAR_OUTCOME_JOB_BUILD: 'success',
    RAVRADAR_OUTCOME_JOB_GEOMETRY_NATIONAL: 'skipped',
    RAVRADAR_OUTCOME_JOB_GEOMETRY_PILOT: 'skipped',
    RAVRADAR_OUTCOME_JOB_DEPLOY: 'success',
    RAVRADAR_OUTCOME_CURRENT_READY: 'true',
    RAVRADAR_OUTCOME_TRIP_READY: 'true',
    RAVRADAR_OUTCOME_PREFLIGHT_SHOULD_RUN: 'true',
    RAVRADAR_OUTCOME_OPERATIONAL_ACTION: 'integrated',
    RAVRADAR_OUTCOME_SHOULD_DEPLOY: 'true',
    RAVRADAR_OUTCOME_WEATHER: 'success',
    RAVRADAR_OUTCOME_FULL_VALIDATION: 'success',
    RAVRADAR_OUTCOME_RELEASE_GATE: 'success',
    RAVRADAR_OUTCOME_PAGES_BUILD: 'success',
    RAVRADAR_OUTCOME_PAGES_PRIVACY: 'success',
    RAVRADAR_OUTCOME_HANDOFF_UPLOAD: 'success',
    RAVRADAR_OUTCOME_PAGES_CONFIGURE: 'success',
    RAVRADAR_OUTCOME_PAGES_UPLOAD: 'success',
    RAVRADAR_OUTCOME_ARTIFACT_BUILT: 'true',
    RAVRADAR_OUTCOME_DEPLOYMENT: 'success',
    RAVRADAR_OUTCOME_PUBLIC_VERIFICATION: 'success',
    RAVRADAR_OUTCOME_DEPLOYED_VERIFIED: 'true',
  },
});
assert.equal(cli.status, 0, cli.stderr || cli.stdout);
assert.equal(JSON.parse(fs.readFileSync(output, 'utf8')).status, 'DEPLOYED');
assert.match(fs.readFileSync(githubOutput, 'utf8'), /^status=DEPLOYED\nreason_code=PUBLIC_DEPLOYMENT_VERIFIED\n$/);
assert.match(fs.readFileSync(summary, 'utf8'), /Status: `DEPLOYED`/);

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
assert.equal(packageJson.scripts['test:production-workflow-outcome'], 'node scripts/test-production-workflow-outcome.mjs');
assert.match(packageJson.scripts['test:workflow-action-contracts'], /npm run test:production-workflow-outcome/);
const releaseGate = fs.readFileSync('scripts/release-gate.mjs', 'utf8');
for (const marker of [
  "'scripts/test-production-workflow-outcome.mjs'",
  "const productionWorkflowOutcome=await read('scripts/production-workflow-outcome.mjs')",
  "PRODUCTION_WORKFLOW_OUTCOME_SCHEMA = 'ravradar-production-workflow-outcome-v2'",
  'productionWorkflowOutcome:true',
  'Maskinlæsbar NOOP/DEFERRED/BUILT/DEPLOYED/FAILED-produktionsstatus: OK',
]) {
  assert.ok(releaseGate.includes(marker), `Release gate must bind ${marker}`);
}

console.log('Production workflow outcome tests passed.');
