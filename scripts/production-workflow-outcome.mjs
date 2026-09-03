import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const PRODUCTION_WORKFLOW_OUTCOME_SCHEMA = 'ravradar-production-workflow-outcome-v2';
export const PRODUCTION_WORKFLOW_OUTCOME_STATUSES = Object.freeze([
  'NOOP',
  'DEFERRED',
  'BUILT',
  'DEPLOYED',
  'FAILED',
]);

const JOB_KEYS = Object.freeze([
  'validateDispatch',
  'reconcileOperationalPending',
  'recoverOperationalPagesTarget',
  'finalizeOperationalPagesRecovery',
  'operationalRecoveryGate',
  'currentHourReadiness',
  'tripStorageReadiness',
  'buildAndPrepare',
  'geometryV2National',
  'geometryV2Pilot',
  'deployPages',
]);

const PROOF_KEYS = Object.freeze([
  'recoveryAction',
  'currentReady',
  'tripStorageReady',
  'preflightShouldRun',
  'operationalAction',
  'shouldDeploy',
  'weatherOutcome',
  'fullValidationOutcome',
  'releaseGateOutcome',
  'pagesBuildOutcome',
  'pagesPrivacyOutcome',
  'handoffUploadOutcome',
  'checkpointDisposition',
  'checkpointDispositionSha256',
  'checkpointDatasetId',
  'checkpointRuntimeAuditSha256',
  'checkpointBuildOutcome',
  'checkpointSaveOutcome',
  'checkpointPublishOutcome',
  'pagesConfigureOutcome',
  'pagesUploadOutcome',
  'artifactBuilt',
  'deploymentOutcome',
  'publicVerificationOutcome',
  'deployedVerified',
]);

const JOB_RESULTS = new Set(['success', 'failure', 'cancelled', 'skipped']);
const STEP_OUTCOMES = new Set(['success', 'failure', 'cancelled', 'skipped']);
const CHECKPOINT_DISPOSITIONS = new Set([
  'READY_PUBLISHED',
  'NOT_APPLICABLE_DURING_MEASURED_WARMUP',
]);
const EVENTS = new Set(['push', 'schedule', 'workflow_dispatch']);
const RECOVERY_ACTIONS = new Set([
  'NONE',
  'SAFE_SOURCE_ABORT',
  'TARGET_RECONCILE',
  'EXACT_TARGET_REDEPLOY',
]);
const OPERATIONAL_ACTIONS = new Set([
  'integrated',
  'integrated-cutover',
  'integrated-return',
  'candidate-dry-run',
  'candidate-execute',
  'candidate-maintenance',
  'candidate-historical-maintenance',
  'candidate-legacy-maintenance',
  'integrated-historical-maintenance',
]);

function normalizeJobResult(value, errors, key) {
  const normalized = String(value ?? '').trim();
  if (JOB_RESULTS.has(normalized)) return normalized;
  errors.push(`INVALID_JOB_RESULT_${key}`);
  return 'unknown';
}

function normalizeStepOutcome(value, errors, key) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 'unknown';
  if (STEP_OUTCOMES.has(normalized)) return normalized;
  errors.push(`INVALID_STEP_OUTCOME_${key}`);
  return 'unknown';
}

function normalizeBoolean(value, errors, key) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  if (value == null || String(value).trim() === '') return null;
  errors.push(`INVALID_BOOLEAN_${key}`);
  return null;
}

function normalizeAction(value, errors) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (OPERATIONAL_ACTIONS.has(normalized)) return normalized;
  errors.push('INVALID_OPERATIONAL_ACTION');
  return null;
}

function normalizeCheckpointDisposition(value, errors) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (CHECKPOINT_DISPOSITIONS.has(normalized)) return normalized;
  errors.push('INVALID_CHECKPOINT_DISPOSITION');
  return null;
}

function normalizeSha256(value, errors, key) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (/^[a-f0-9]{64}$/.test(normalized)) return normalized;
  errors.push(`INVALID_SHA256_${key}`);
  return null;
}

function normalizeDatasetId(value, errors) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (/^[a-z0-9][a-z0-9._-]{0,127}$/.test(normalized)) return normalized;
  errors.push('INVALID_CHECKPOINT_DATASET_ID');
  return null;
}

function normalizeRecoveryAction(value, errors) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return null;
  if (RECOVERY_ACTIONS.has(normalized)) return normalized;
  errors.push('INVALID_RECOVERY_ACTION');
  return null;
}

function normalizeMetadata(input, errors) {
  const sourceHead = String(input.sourceHead ?? '').trim().toLowerCase();
  const runId = String(input.runId ?? '').trim();
  const runAttempt = String(input.runAttempt ?? '').trim();
  const eventName = String(input.eventName ?? '').trim();
  if (!/^[a-f0-9]{40}$/.test(sourceHead)) errors.push('INVALID_SOURCE_HEAD');
  if (!/^[1-9][0-9]*$/.test(runId)) errors.push('INVALID_RUN_ID');
  if (!/^[1-9][0-9]*$/.test(runAttempt)) errors.push('INVALID_RUN_ATTEMPT');
  if (!EVENTS.has(eventName)) errors.push('INVALID_EVENT_NAME');
  return {
    sourceHead: /^[a-f0-9]{40}$/.test(sourceHead) ? sourceHead : 'unknown',
    runId: /^[1-9][0-9]*$/.test(runId) ? runId : 'unknown',
    runAttempt: /^[1-9][0-9]*$/.test(runAttempt) ? runAttempt : 'unknown',
    eventName: EVENTS.has(eventName) ? eventName : 'unknown',
  };
}

function normalizeEvidence(input) {
  const errors = [];
  const metadata = normalizeMetadata(input, errors);
  const refIsMain = normalizeBoolean(input.refIsMain, errors, 'refIsMain');
  const geometryV2Pilot = normalizeBoolean(input.geometryV2Pilot, errors, 'geometryV2Pilot');
  const geometryV2National = normalizeBoolean(input.geometryV2National, errors, 'geometryV2National');
  const jobs = Object.fromEntries(JOB_KEYS.map((key) => [
    key,
    normalizeJobResult(input.jobs?.[key], errors, key),
  ]));
  const proof = {
    recoveryAction: normalizeRecoveryAction(input.proof?.recoveryAction, errors),
    currentReady: normalizeBoolean(input.proof?.currentReady, errors, 'currentReady'),
    tripStorageReady: normalizeBoolean(input.proof?.tripStorageReady, errors, 'tripStorageReady'),
    preflightShouldRun: normalizeBoolean(input.proof?.preflightShouldRun, errors, 'preflightShouldRun'),
    operationalAction: normalizeAction(input.proof?.operationalAction, errors),
    shouldDeploy: normalizeBoolean(input.proof?.shouldDeploy, errors, 'shouldDeploy'),
    weatherOutcome: normalizeStepOutcome(input.proof?.weatherOutcome, errors, 'weatherOutcome'),
    fullValidationOutcome: normalizeStepOutcome(input.proof?.fullValidationOutcome, errors, 'fullValidationOutcome'),
    releaseGateOutcome: normalizeStepOutcome(input.proof?.releaseGateOutcome, errors, 'releaseGateOutcome'),
    pagesBuildOutcome: normalizeStepOutcome(input.proof?.pagesBuildOutcome, errors, 'pagesBuildOutcome'),
    pagesPrivacyOutcome: normalizeStepOutcome(input.proof?.pagesPrivacyOutcome, errors, 'pagesPrivacyOutcome'),
    handoffUploadOutcome: normalizeStepOutcome(input.proof?.handoffUploadOutcome, errors, 'handoffUploadOutcome'),
    checkpointDisposition: normalizeCheckpointDisposition(input.proof?.checkpointDisposition, errors),
    checkpointDispositionSha256: normalizeSha256(
      input.proof?.checkpointDispositionSha256,
      errors,
      'checkpointDispositionSha256',
    ),
    checkpointDatasetId: normalizeDatasetId(input.proof?.checkpointDatasetId, errors),
    checkpointRuntimeAuditSha256: normalizeSha256(
      input.proof?.checkpointRuntimeAuditSha256,
      errors,
      'checkpointRuntimeAuditSha256',
    ),
    checkpointBuildOutcome: normalizeStepOutcome(
      input.proof?.checkpointBuildOutcome,
      errors,
      'checkpointBuildOutcome',
    ),
    checkpointSaveOutcome: normalizeStepOutcome(
      input.proof?.checkpointSaveOutcome,
      errors,
      'checkpointSaveOutcome',
    ),
    checkpointPublishOutcome: normalizeStepOutcome(
      input.proof?.checkpointPublishOutcome,
      errors,
      'checkpointPublishOutcome',
    ),
    pagesConfigureOutcome: normalizeStepOutcome(input.proof?.pagesConfigureOutcome, errors, 'pagesConfigureOutcome'),
    pagesUploadOutcome: normalizeStepOutcome(input.proof?.pagesUploadOutcome, errors, 'pagesUploadOutcome'),
    artifactBuilt: normalizeBoolean(input.proof?.artifactBuilt, errors, 'artifactBuilt'),
    deploymentOutcome: normalizeStepOutcome(input.proof?.deploymentOutcome, errors, 'deploymentOutcome'),
    publicVerificationOutcome: normalizeStepOutcome(input.proof?.publicVerificationOutcome, errors, 'publicVerificationOutcome'),
    deployedVerified: normalizeBoolean(input.proof?.deployedVerified, errors, 'deployedVerified'),
  };
  let operation = 'WEATHER_PRODUCTION';
  if (geometryV2Pilot === true && geometryV2National !== true) operation = 'GEOMETRY_V2_PILOT';
  if (geometryV2National === true && geometryV2Pilot !== true) operation = 'GEOMETRY_V2_NATIONAL';
  if (geometryV2Pilot === true && geometryV2National === true) operation = 'INVALID_MULTIPLE_OPERATIONS';
  return { ...metadata, refIsMain, operation, jobs, proof, errors };
}

function result(status, reasonCode) {
  return { status, reasonCode };
}

function noCheckpointProof(proof) {
  return proof.checkpointDisposition == null
    && proof.checkpointDispositionSha256 == null
    && proof.checkpointDatasetId == null
    && proof.checkpointRuntimeAuditSha256 == null
    && proof.checkpointBuildOutcome === 'unknown'
    && proof.checkpointSaveOutcome === 'unknown'
    && proof.checkpointPublishOutcome === 'unknown';
}

function checkpointProofHasExactBinding(proof) {
  return CHECKPOINT_DISPOSITIONS.has(proof.checkpointDisposition)
    && /^[a-f0-9]{64}$/.test(proof.checkpointDispositionSha256 ?? '')
    && /^[a-z0-9][a-z0-9._-]{0,127}$/.test(proof.checkpointDatasetId ?? '')
    && /^[a-f0-9]{64}$/.test(proof.checkpointRuntimeAuditSha256 ?? '');
}

function checkpointProofIsDeploymentReady(proof) {
  if (!checkpointProofHasExactBinding(proof)) return false;
  if (proof.checkpointDisposition === 'READY_PUBLISHED') {
    return proof.checkpointBuildOutcome === 'success'
      && proof.checkpointSaveOutcome === 'success'
      && proof.checkpointPublishOutcome === 'success';
  }
  return proof.checkpointDisposition === 'NOT_APPLICABLE_DURING_MEASURED_WARMUP'
    && proof.checkpointBuildOutcome === 'skipped'
    && proof.checkpointSaveOutcome === 'skipped'
    && proof.checkpointPublishOutcome === 'skipped';
}

function checkpointProofIsDryRunComplete(proof) {
  if (!checkpointProofHasExactBinding(proof)) return false;
  if (proof.checkpointDisposition === 'READY_PUBLISHED') {
    return proof.checkpointBuildOutcome === 'success'
      && proof.checkpointSaveOutcome === 'skipped'
      && proof.checkpointPublishOutcome === 'skipped';
  }
  return proof.checkpointDisposition === 'NOT_APPLICABLE_DURING_MEASURED_WARMUP'
    && proof.checkpointBuildOutcome === 'skipped'
    && proof.checkpointSaveOutcome === 'skipped'
    && proof.checkpointPublishOutcome === 'skipped';
}

function noFreshProduction(evidence) {
  const { jobs, proof } = evidence;
  return jobs.buildAndPrepare === 'skipped'
    && jobs.deployPages === 'skipped'
    && proof.preflightShouldRun !== true
    && proof.operationalAction == null
    && proof.shouldDeploy !== true
    && proof.artifactBuilt !== true
    && proof.deployedVerified !== true
    && PROOF_KEYS.filter((key) => key.endsWith('Outcome') && !key.startsWith('checkpoint'))
      .every((key) => proof[key] !== 'success');
}

function noUnexpectedProduction(evidence) {
  return noFreshProduction(evidence) && noCheckpointProof(evidence.proof);
}

function recoveryContract(evidence) {
  const { jobs, operation, proof } = evidence;
  const geometryOperation = operation === 'GEOMETRY_V2_PILOT'
    || operation === 'GEOMETRY_V2_NATIONAL';
  if (geometryOperation) {
    return {
      valid: proof.recoveryAction == null
        && jobs.reconcileOperationalPending === 'skipped'
        && jobs.recoverOperationalPagesTarget === 'skipped'
        && jobs.finalizeOperationalPagesRecovery === 'skipped'
        && jobs.operationalRecoveryGate === 'success',
      exactTargetRedeployed: false,
    };
  }
  if (jobs.reconcileOperationalPending !== 'success'
    || jobs.operationalRecoveryGate !== 'success') {
    return { valid: false, exactTargetRedeployed: false };
  }
  if (['NONE', 'SAFE_SOURCE_ABORT', 'TARGET_RECONCILE'].includes(proof.recoveryAction)) {
    return {
      valid: jobs.recoverOperationalPagesTarget === 'skipped'
        && jobs.finalizeOperationalPagesRecovery === 'skipped',
      exactTargetRedeployed: false,
    };
  }
  if (proof.recoveryAction === 'EXACT_TARGET_REDEPLOY') {
    return {
      valid: jobs.recoverOperationalPagesTarget === 'success'
        && jobs.finalizeOperationalPagesRecovery === 'success',
      exactTargetRedeployed: true,
    };
  }
  return { valid: false, exactTargetRedeployed: false };
}

function classifyNormalized(evidence) {
  const { errors, jobs, proof, operation } = evidence;
  if (errors.length > 0) return result('FAILED', 'INVALID_OUTCOME_EVIDENCE');
  if (Object.values(jobs).some((value) => value === 'failure' || value === 'cancelled')) {
    return result('FAILED', 'UPSTREAM_JOB_FAILED');
  }
  if (operation === 'INVALID_MULTIPLE_OPERATIONS') {
    return result('FAILED', 'AMBIGUOUS_OPERATION');
  }
  const recovery = recoveryContract(evidence);
  if (operation === 'GEOMETRY_V2_PILOT' || operation === 'GEOMETRY_V2_NATIONAL') {
    const selected = operation === 'GEOMETRY_V2_PILOT' ? jobs.geometryV2Pilot : jobs.geometryV2National;
    const unselected = operation === 'GEOMETRY_V2_PILOT' ? jobs.geometryV2National : jobs.geometryV2Pilot;
    if (jobs.validateDispatch === 'success'
      && selected === 'success'
      && unselected === 'skipped'
      && recovery.valid
      && noUnexpectedProduction(evidence)) {
      return result('NOOP', 'PRIVATE_GEOMETRY_OPERATION_COMPLETED');
    }
    return result('FAILED', 'OPERATION_NOT_EXECUTED');
  }
  if (evidence.refIsMain !== true
    || jobs.validateDispatch !== 'success'
    || jobs.operationalRecoveryGate !== 'success'
    || jobs.currentHourReadiness !== 'success') {
    return result('FAILED', 'PRODUCTION_NOT_EXECUTED');
  }
  if (!recovery.valid) {
    return result('FAILED', 'INCONSISTENT_RECOVERY_EVIDENCE');
  }
  if (proof.currentReady === false) {
    if (jobs.tripStorageReadiness === 'skipped' && noFreshProduction(evidence)) {
      if (recovery.exactTargetRedeployed) {
        if (!checkpointProofIsDeploymentReady(proof)) {
          return result('FAILED', 'CHECKPOINT_DISPOSITION_MISSING_OR_INCONSISTENT');
        }
        return result('DEPLOYED', 'RECOVERED_PUBLIC_DEPLOYMENT_VERIFIED');
      }
      if (!noCheckpointProof(proof)) return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
      return result('DEFERRED', 'CURRENT_INPUT_DEFERRED');
    }
    return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  }
  if (proof.currentReady !== true || jobs.tripStorageReadiness !== 'success') {
    return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  }
  if (proof.tripStorageReady === false) {
    if (noFreshProduction(evidence)) {
      if (recovery.exactTargetRedeployed) {
        if (!checkpointProofIsDeploymentReady(proof)) {
          return result('FAILED', 'CHECKPOINT_DISPOSITION_MISSING_OR_INCONSISTENT');
        }
        return result('DEPLOYED', 'RECOVERED_PUBLIC_DEPLOYMENT_VERIFIED');
      }
      if (!noCheckpointProof(proof)) return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
      return result('DEFERRED', 'TRIP_STORAGE_DEFERRED');
    }
    return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  }
  if (proof.tripStorageReady !== true || jobs.buildAndPrepare !== 'success') {
    return result('FAILED', 'PRODUCTION_NOT_EXECUTED');
  }
  if (proof.preflightShouldRun === false) {
    if (jobs.deployPages === 'skipped'
      && proof.artifactBuilt !== true
      && proof.shouldDeploy !== true
      && proof.deployedVerified !== true
      && proof.operationalAction == null
      && [
        proof.weatherOutcome,
        proof.fullValidationOutcome,
        proof.releaseGateOutcome,
        proof.pagesBuildOutcome,
        proof.pagesPrivacyOutcome,
        proof.handoffUploadOutcome,
        proof.pagesConfigureOutcome,
        proof.pagesUploadOutcome,
        proof.deploymentOutcome,
        proof.publicVerificationOutcome,
      ].every((value) => value !== 'success')) {
      if (recovery.exactTargetRedeployed) {
        if (!checkpointProofIsDeploymentReady(proof)) {
          return result('FAILED', 'CHECKPOINT_DISPOSITION_MISSING_OR_INCONSISTENT');
        }
        return result('DEPLOYED', 'RECOVERED_PUBLIC_DEPLOYMENT_VERIFIED');
      }
      if (!noCheckpointProof(proof)) return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
      return result('NOOP', 'FRESH_WEATHER_NO_UPDATE_REQUIRED');
    }
    return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  }
  if (proof.preflightShouldRun !== true) {
    return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  }
  for (const key of [
    'weatherOutcome',
    'fullValidationOutcome',
    'releaseGateOutcome',
    'pagesBuildOutcome',
    'pagesPrivacyOutcome',
    'handoffUploadOutcome',
  ]) {
    if (proof[key] !== 'success') return result('FAILED', 'INCOMPLETE_BUILD_GATES');
  }
  if (proof.artifactBuilt !== true || proof.operationalAction == null) {
    return result('FAILED', 'INCOMPLETE_BUILD_GATES');
  }
  if (proof.shouldDeploy === false) {
    if (proof.operationalAction === 'candidate-dry-run'
      && checkpointProofIsDryRunComplete(proof)
      && jobs.deployPages === 'skipped'
      && proof.pagesConfigureOutcome !== 'success'
      && proof.pagesUploadOutcome !== 'success'
      && proof.deploymentOutcome !== 'success'
      && proof.publicVerificationOutcome !== 'success'
      && proof.deployedVerified !== true) {
      return result('BUILT', 'SEALED_ARTIFACT_NOT_DEPLOYED');
    }
    return result('FAILED', 'INCONSISTENT_PRODUCTION_EVIDENCE');
  }
  if (proof.shouldDeploy !== true
    || proof.operationalAction === 'candidate-dry-run'
    || proof.pagesConfigureOutcome !== 'success'
    || proof.pagesUploadOutcome !== 'success') {
    return result('FAILED', 'INCOMPLETE_BUILD_GATES');
  }
  if (!checkpointProofIsDeploymentReady(proof)) {
    return result('FAILED', 'CHECKPOINT_DISPOSITION_MISSING_OR_INCONSISTENT');
  }
  if (jobs.deployPages === 'success'
    && proof.deploymentOutcome === 'success'
    && proof.publicVerificationOutcome === 'success'
    && proof.deployedVerified === true) {
    return result('DEPLOYED', 'PUBLIC_DEPLOYMENT_VERIFIED');
  }
  return result('FAILED', 'DEPLOYMENT_NOT_VERIFIED');
}

export function classifyProductionWorkflowOutcome(input) {
  const evidence = normalizeEvidence(input ?? {});
  const classification = classifyNormalized(evidence);
  const report = {
    schemaVersion: PRODUCTION_WORKFLOW_OUTCOME_SCHEMA,
    status: classification.status,
    reasonCode: classification.reasonCode,
    sourceHead: evidence.sourceHead,
    runId: evidence.runId,
    runAttempt: evidence.runAttempt,
    eventName: evidence.eventName,
    refIsMain: evidence.refIsMain,
    operation: evidence.operation,
    jobResults: evidence.jobs,
    proof: evidence.proof,
    privatePayloadIncluded: false,
  };
  validateProductionWorkflowOutcome(report);
  return report;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value ?? {}).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} has an unexpected field set`);
  }
}

export function validateProductionWorkflowOutcome(report) {
  exactKeys(report, [
    'schemaVersion', 'status', 'reasonCode', 'sourceHead', 'runId', 'runAttempt',
    'eventName', 'refIsMain', 'operation', 'jobResults', 'proof', 'privatePayloadIncluded',
  ], 'production workflow outcome');
  exactKeys(report.jobResults, JOB_KEYS, 'job results');
  exactKeys(report.proof, PROOF_KEYS, 'production proof');
  if (report.schemaVersion !== PRODUCTION_WORKFLOW_OUTCOME_SCHEMA) throw new Error('Unexpected outcome schema');
  if (!PRODUCTION_WORKFLOW_OUTCOME_STATUSES.includes(report.status)) throw new Error('Unexpected outcome status');
  if (!/^[A-Z][A-Z0-9_]*$/.test(report.reasonCode)) throw new Error('Unsafe outcome reason code');
  if (report.privatePayloadIncluded !== false) throw new Error('Outcome must not include private payloads');
  if (!(report.sourceHead === 'unknown' || /^[a-f0-9]{40}$/.test(report.sourceHead))) throw new Error('Unexpected source head');
  if (!(report.runId === 'unknown' || /^[1-9][0-9]*$/.test(report.runId))) throw new Error('Unexpected run id');
  if (!(report.runAttempt === 'unknown' || /^[1-9][0-9]*$/.test(report.runAttempt))) throw new Error('Unexpected run attempt');
  if (!(report.eventName === 'unknown' || EVENTS.has(report.eventName))) throw new Error('Unexpected event name');
  if (!(report.refIsMain == null || typeof report.refIsMain === 'boolean')) throw new Error('Unexpected main-ref proof');
  if (!['WEATHER_PRODUCTION', 'GEOMETRY_V2_PILOT', 'GEOMETRY_V2_NATIONAL', 'INVALID_MULTIPLE_OPERATIONS'].includes(report.operation)) {
    throw new Error('Unexpected operation');
  }
  if (!Object.values(report.jobResults).every((value) => JOB_RESULTS.has(value) || value === 'unknown')) {
    throw new Error('Unexpected job result');
  }
  if (!PROOF_KEYS.filter((key) => key.endsWith('Outcome'))
    .every((key) => STEP_OUTCOMES.has(report.proof[key]) || report.proof[key] === 'unknown')) {
    throw new Error('Unexpected step outcome');
  }
  for (const key of ['currentReady', 'tripStorageReady', 'preflightShouldRun', 'shouldDeploy', 'artifactBuilt', 'deployedVerified']) {
    if (!(report.proof[key] == null || typeof report.proof[key] === 'boolean')) throw new Error(`Unexpected boolean proof ${key}`);
  }
  if (!(report.proof.operationalAction == null || OPERATIONAL_ACTIONS.has(report.proof.operationalAction))) {
    throw new Error('Unexpected operational action');
  }
  if (!(report.proof.recoveryAction == null || RECOVERY_ACTIONS.has(report.proof.recoveryAction))) {
    throw new Error('Unexpected recovery action');
  }
  if (!(report.proof.checkpointDisposition == null
    || CHECKPOINT_DISPOSITIONS.has(report.proof.checkpointDisposition))) {
    throw new Error('Unexpected checkpoint disposition');
  }
  for (const key of ['checkpointDispositionSha256', 'checkpointRuntimeAuditSha256']) {
    if (!(report.proof[key] == null || /^[a-f0-9]{64}$/.test(report.proof[key]))) {
      throw new Error(`Unexpected checkpoint proof ${key}`);
    }
  }
  if (!(report.proof.checkpointDatasetId == null
    || /^[a-z0-9][a-z0-9._-]{0,127}$/.test(report.proof.checkpointDatasetId))) {
    throw new Error('Unexpected checkpoint dataset id');
  }
  if (report.reasonCode === 'INVALID_OUTCOME_EVIDENCE') {
    if (report.status !== 'FAILED') throw new Error('Invalid evidence must remain FAILED');
  } else {
    const metadataInvalid = [report.sourceHead, report.runId, report.runAttempt, report.eventName].includes('unknown')
      || report.refIsMain == null;
    const recomputed = classifyNormalized({
      sourceHead: report.sourceHead,
      runId: report.runId,
      runAttempt: report.runAttempt,
      eventName: report.eventName,
      refIsMain: report.refIsMain,
      operation: report.operation,
      jobs: report.jobResults,
      proof: report.proof,
      errors: metadataInvalid ? ['INVALID_REPORT_METADATA'] : [],
    });
    if (recomputed.status !== report.status || recomputed.reasonCode !== report.reasonCode) {
      throw new Error('Outcome classification does not match its proof');
    }
  }
  return report;
}

function writeAtomicJson(outputPath, value) {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, resolved);
}

function parseArguments(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--') || index + 1 >= argv.length) throw new Error('Invalid outcome CLI arguments');
    args[token.slice(2)] = argv[index + 1];
    index += 1;
  }
  if (!args.output) throw new Error('--output is required');
  return args;
}

function environmentEvidence(env) {
  return {
    sourceHead: env.RAVRADAR_OUTCOME_SOURCE_HEAD,
    runId: env.RAVRADAR_OUTCOME_RUN_ID,
    runAttempt: env.RAVRADAR_OUTCOME_RUN_ATTEMPT,
    eventName: env.RAVRADAR_OUTCOME_EVENT_NAME,
    refIsMain: env.RAVRADAR_OUTCOME_REF_IS_MAIN,
    geometryV2Pilot: env.RAVRADAR_OUTCOME_GEOMETRY_PILOT,
    geometryV2National: env.RAVRADAR_OUTCOME_GEOMETRY_NATIONAL,
    jobs: {
      validateDispatch: env.RAVRADAR_OUTCOME_JOB_VALIDATE_DISPATCH,
      reconcileOperationalPending: env.RAVRADAR_OUTCOME_JOB_RECONCILE,
      recoverOperationalPagesTarget: env.RAVRADAR_OUTCOME_JOB_RECOVERY_WRITER,
      finalizeOperationalPagesRecovery: env.RAVRADAR_OUTCOME_JOB_RECOVERY_FINALIZER,
      operationalRecoveryGate: env.RAVRADAR_OUTCOME_JOB_RECOVERY_GATE,
      currentHourReadiness: env.RAVRADAR_OUTCOME_JOB_CURRENT_READINESS,
      tripStorageReadiness: env.RAVRADAR_OUTCOME_JOB_TRIP_READINESS,
      buildAndPrepare: env.RAVRADAR_OUTCOME_JOB_BUILD,
      geometryV2National: env.RAVRADAR_OUTCOME_JOB_GEOMETRY_NATIONAL,
      geometryV2Pilot: env.RAVRADAR_OUTCOME_JOB_GEOMETRY_PILOT,
      deployPages: env.RAVRADAR_OUTCOME_JOB_DEPLOY,
    },
    proof: {
      recoveryAction: env.RAVRADAR_OUTCOME_RECOVERY_ACTION,
      currentReady: env.RAVRADAR_OUTCOME_CURRENT_READY,
      tripStorageReady: env.RAVRADAR_OUTCOME_TRIP_READY,
      preflightShouldRun: env.RAVRADAR_OUTCOME_PREFLIGHT_SHOULD_RUN,
      operationalAction: env.RAVRADAR_OUTCOME_OPERATIONAL_ACTION,
      shouldDeploy: env.RAVRADAR_OUTCOME_SHOULD_DEPLOY,
      weatherOutcome: env.RAVRADAR_OUTCOME_WEATHER,
      fullValidationOutcome: env.RAVRADAR_OUTCOME_FULL_VALIDATION,
      releaseGateOutcome: env.RAVRADAR_OUTCOME_RELEASE_GATE,
      pagesBuildOutcome: env.RAVRADAR_OUTCOME_PAGES_BUILD,
      pagesPrivacyOutcome: env.RAVRADAR_OUTCOME_PAGES_PRIVACY,
      handoffUploadOutcome: env.RAVRADAR_OUTCOME_HANDOFF_UPLOAD,
      checkpointDisposition: env.RAVRADAR_OUTCOME_CHECKPOINT_DISPOSITION,
      checkpointDispositionSha256: env.RAVRADAR_OUTCOME_CHECKPOINT_DISPOSITION_SHA256,
      checkpointDatasetId: env.RAVRADAR_OUTCOME_CHECKPOINT_DATASET_ID,
      checkpointRuntimeAuditSha256: env.RAVRADAR_OUTCOME_CHECKPOINT_RUNTIME_AUDIT_SHA256,
      checkpointBuildOutcome: env.RAVRADAR_OUTCOME_CHECKPOINT_BUILD,
      checkpointSaveOutcome: env.RAVRADAR_OUTCOME_CHECKPOINT_SAVE,
      checkpointPublishOutcome: env.RAVRADAR_OUTCOME_CHECKPOINT_PUBLISH,
      pagesConfigureOutcome: env.RAVRADAR_OUTCOME_PAGES_CONFIGURE,
      pagesUploadOutcome: env.RAVRADAR_OUTCOME_PAGES_UPLOAD,
      artifactBuilt: env.RAVRADAR_OUTCOME_ARTIFACT_BUILT,
      deploymentOutcome: env.RAVRADAR_OUTCOME_DEPLOYMENT,
      publicVerificationOutcome: env.RAVRADAR_OUTCOME_PUBLIC_VERIFICATION,
      deployedVerified: env.RAVRADAR_OUTCOME_DEPLOYED_VERIFIED,
    },
  };
}

function appendOutput(outputPath, report) {
  if (!outputPath) return;
  fs.appendFileSync(outputPath, `status=${report.status}\nreason_code=${report.reasonCode}\n`, 'utf8');
}

function appendSummary(summaryPath, report) {
  if (!summaryPath) return;
  fs.appendFileSync(summaryPath,
    `## RavRadar production outcome\n\n- Status: \`${report.status}\`\n- Reason: \`${report.reasonCode}\`\n- Run: \`${report.runId}\` attempt \`${report.runAttempt}\`\n`,
    'utf8');
}

function main() {
  const args = parseArguments(process.argv.slice(2));
  const report = classifyProductionWorkflowOutcome(environmentEvidence(process.env));
  writeAtomicJson(args.output, report);
  appendOutput(args['github-output'], report);
  appendSummary(args.summary, report);
  process.stdout.write(`${report.status} ${report.reasonCode}\n`);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main();
}
