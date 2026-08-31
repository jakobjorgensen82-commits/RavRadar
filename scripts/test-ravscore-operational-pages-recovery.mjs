#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import {
  RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_EVIDENCE_SCHEMA,
  RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_SEAL_SCHEMA,
  RAVSCORE_OPERATIONAL_PAGES_PENDING_IDENTITY_SCHEMA,
  RAVSCORE_OPERATIONAL_PAGES_PUBLIC_OBSERVATION_SCHEMA,
  RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS,
  RAVSCORE_OPERATIONAL_PAGES_RECOVERY_SCHEMA,
  RAVSCORE_OPERATIONAL_PAGES_TERMINAL_EVIDENCE_SCHEMA,
  classifyRavScoreOperationalPagesRecovery,
  normalizeArtifactDigestSha256,
  sha256CanonicalJson
} from './ravscore-operational-pages-recovery.mjs';

const clone = (value) => structuredClone(value);

function fixture({ terminalStatus = 'AMBIGUOUS', observationEndpoints = ['source', 'source'] } = {}) {
  const identity = {
    repository: 'ravradar/RavRadar',
    runId: 33250000000,
    runAttempt: 2,
    headSha: 'd'.repeat(40),
    ref: 'refs/heads/main',
    attemptId: 'pages-33250000000-2'
  };
  const binding = ravScoreModelBinding();
  const targetManifest = {
    schemaVersion: 4,
    generatedAt: '2026-08-31T10:00:00.000Z',
    productionReferenceAt: '2026-08-31T09:00:00.000Z',
    datasetId: 'rr-20260831100000-210',
    complete: true,
    zoneCount: 210,
    coastalPartCount: 673,
    ravScoreModelBinding: clone(binding),
    ravScoreRuntime: {
      modelBinding: clone(binding)
    }
  };
  const requestedPublicManifestSha256 = sha256CanonicalJson(targetManifest);
  const sourcePublicManifestSha256 =
    requestedPublicManifestSha256 === 'a'.repeat(64) ? '9'.repeat(64) : 'a'.repeat(64);
  const requestedImplementationClosureSha256 = 'b'.repeat(64);
  const artifactDigestSha256 = 'c'.repeat(64);
  const pending = {
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_PENDING_IDENTITY_SCHEMA,
    ...identity,
    requestedAt: '2026-08-31T10:00:02.000Z',
    datasetId: targetManifest.datasetId,
    productionReferenceAt: targetManifest.productionReferenceAt,
    sourcePublicManifestSha256,
    requestedPublicManifestSha256,
    requestedImplementationClosureSha256,
    requestedModelBinding: clone(binding),
    privatePayloadIncluded: false
  };
  const artifactSeal = {
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_SEAL_SCHEMA,
    ...identity,
    artifactId: 987654321,
    artifactName: 'github-pages',
    artifactDigestSha256,
    artifactSizeBytes: 24681357,
    targetPublicManifestSha256: requestedPublicManifestSha256,
    targetImplementationClosureSha256: requestedImplementationClosureSha256,
    targetModelBinding: clone(binding),
    createdAt: '2026-08-31T10:00:01.000Z',
    privatePayloadIncluded: false
  };
  const artifactEvidence = {
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_EVIDENCE_SCHEMA,
    ...identity,
    artifactId: artifactSeal.artifactId,
    artifactName: artifactSeal.artifactName,
    artifactDigestSha256,
    artifactSizeBytes: artifactSeal.artifactSizeBytes,
    downloadedZipSha256: artifactDigestSha256,
    zipHashedBeforeExtraction: true,
    expired: false,
    checkedAt: '2026-08-31T10:01:00.000Z',
    privatePayloadRead: false
  };
  const terminalEvidence = {
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_TERMINAL_EVIDENCE_SCHEMA,
    ...identity,
    status: terminalStatus,
    runStatus: 'completed',
    runConclusion: 'failure',
    deployStepConclusion: terminalStatus === 'NOT_STARTED' ? 'skipped' : 'failure',
    pagesRequestAccepted: terminalStatus === 'NOT_STARTED' ? false : null,
    checkedAt: '2026-08-31T10:02:00.000Z',
    evidenceSource: 'github-actions-pages-terminal-readback',
    privatePayloadRead: false
  };
  const hashes = {
    source: sourcePublicManifestSha256,
    target: requestedPublicManifestSha256,
    third: 'e'.repeat(64)
  };
  const observations = observationEndpoints.map((endpoint, index) => ({
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_PUBLIC_OBSERVATION_SCHEMA,
    ...identity,
    publicManifestSha256: hashes[endpoint],
    observedAt: new Date(Date.parse('2026-08-31T10:03:00.000Z') + index * 2000).toISOString(),
    observationNonce: `observation-${index + 1}`,
    privatePayloadRead: false
  }));
  return {
    pending,
    artifactSeal,
    artifactEvidence,
    terminalEvidence,
    observations,
    targetManifest
  };
}

function classify(options) {
  return classifyRavScoreOperationalPagesRecovery(fixture(options));
}

function expectHardStop(mutator, pattern) {
  const input = fixture();
  mutator(input);
  assert.throws(() => classifyRavScoreOperationalPagesRecovery(input), pattern);
}

{
  const result = classify({ terminalStatus: 'NOT_STARTED' });
  assert.equal(result.schemaVersion, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_SCHEMA);
  assert.equal(result.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.SAFE_SOURCE_ABORT);
  assert.equal(result.reasonCode, 'STABLE_SOURCE_AND_PROVEN_NOT_STARTED');
  assert.equal(result.centralMutationAllowed, true);
  assert.equal(result.exactTargetRedeployAllowed, false);
  assert.equal(result.privatePayloadRead, false);
  assert.deepEqual(Object.keys(result).sort(), [
    'action',
    'artifactDigestSha256',
    'artifactId',
    'attemptId',
    'centralMutationAllowed',
    'exactTargetRedeployAllowed',
    'headSha',
    'observationCount',
    'privatePayloadRead',
    'reasonCode',
    'ref',
    'repository',
    'runAttempt',
    'runId',
    'schemaVersion',
    'targetImplementationClosureSha256',
    'targetPublicManifestSha256'
  ]);
}

{
  const result = classify();
  assert.equal(
    result.action,
    RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.EXACT_TARGET_REDEPLOY
  );
  assert.equal(result.reasonCode, 'STABLE_SOURCE_AND_AMBIGUOUS_DEPLOYMENT');
  assert.equal(result.centralMutationAllowed, false);
  assert.equal(result.exactTargetRedeployAllowed, true);
}

for (const observationEndpoints of [
  ['target', 'target'],
  ['source', 'target', 'target']
]) {
  const result = classify({ observationEndpoints });
  assert.equal(result.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.TARGET_RECONCILE);
  assert.equal(result.reasonCode, 'STABLE_EXACT_TARGET');
  assert.equal(result.centralMutationAllowed, true);
  assert.equal(result.exactTargetRedeployAllowed, false);
}

for (const observationEndpoints of [
  ['source', 'third'],
  ['third', 'third']
]) {
  const result = classify({ observationEndpoints });
  assert.equal(result.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED);
  assert.equal(result.reasonCode, 'THIRD_PUBLIC_MANIFEST');
  assert.equal(result.centralMutationAllowed, false);
  assert.equal(result.exactTargetRedeployAllowed, false);
}

for (const observationEndpoints of [
  ['source', 'target'],
  ['target', 'source'],
  ['target', 'target', 'source']
]) {
  const result = classify({ observationEndpoints });
  assert.equal(result.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED);
  assert.equal(result.reasonCode, 'UNSTABLE_OR_REVERSED_PUBLIC_TARGET');
}

expectHardStop((input) => {
  input.artifactEvidence = null;
}, /Artifact-evidensen/);
expectHardStop((input) => {
  input.artifactEvidence.artifactId += 1;
}, /matcher ikke artifact-sealet/);
expectHardStop((input) => {
  input.artifactEvidence.artifactDigestSha256 = 'f'.repeat(64);
}, /matcher ikke artifact-sealets digest/);
expectHardStop((input) => {
  input.artifactEvidence.downloadedZipSha256 = 'f'.repeat(64);
}, /matcher ikke artifact-sealets digest/);
expectHardStop((input) => {
  input.artifactEvidence.zipHashedBeforeExtraction = false;
}, /hashes før udpakning/);
expectHardStop((input) => {
  input.artifactEvidence.artifactSizeBytes += 1;
}, /matcher ikke artifact-sealet/);
expectHardStop((input) => {
  input.artifactEvidence.expired = true;
}, /mangler eller er udløbet/);

for (const field of ['repository', 'runId', 'runAttempt', 'headSha', 'ref', 'attemptId']) {
  expectHardStop((input) => {
    const replacements = {
      repository: 'other/repository',
      runId: input.pending.runId + 1,
      runAttempt: input.pending.runAttempt + 1,
      headSha: '1'.repeat(40),
      ref: 'refs/heads/not-main',
      attemptId: 'pages-1-1'
    };
    input.artifactEvidence[field] = replacements[field];
  }, /workflowidentitet|refs\/heads\/main|attemptId/);
}

expectHardStop((input) => {
  input.artifactSeal.targetPublicManifestSha256 = 'f'.repeat(64);
}, /target-manifesthash/);
expectHardStop((input) => {
  input.artifactSeal.targetImplementationClosureSha256 = 'f'.repeat(64);
}, /implementation-closure/);
expectHardStop((input) => {
  input.artifactSeal.targetModelBinding.modelId = 'TAMPERED';
}, /target-modelbinding/);
expectHardStop((input) => {
  input.artifactSeal.createdAt = '2026-08-31T10:00:03.000Z';
}, /oprettet senest før activation/);
expectHardStop((input) => {
  input.targetManifest.datasetId = 'rr-tampered';
}, /dataset\/reference/);
expectHardStop((input) => {
  input.targetManifest.ravScoreRuntime.modelBinding.modelId = 'TAMPERED';
}, /target-modelbinding/);
expectHardStop((input) => {
  input.pending.requestedPublicManifestSha256 = 'f'.repeat(64);
}, /kanoniske hash/);

expectHardStop((input) => {
  input.terminalEvidence.status = 'FAILED_BEFORE_PAGES_ACCEPTANCE';
}, /ikke-understøttet status/);
expectHardStop((input) => {
  input.terminalEvidence.status = 'NOT_STARTED';
  input.terminalEvidence.deployStepConclusion = 'failure';
  input.terminalEvidence.pagesRequestAccepted = false;
}, /NOT_STARTED er ikke bevist/);
expectHardStop((input) => {
  input.terminalEvidence.status = 'NOT_STARTED';
  input.terminalEvidence.deployStepConclusion = 'skipped';
  input.terminalEvidence.pagesRequestAccepted = true;
}, /NOT_STARTED er ikke bevist/);
expectHardStop((input) => {
  input.terminalEvidence.runStatus = 'in_progress';
}, /ikke terminal/);
expectHardStop((input) => {
  input.terminalEvidence.checkedAt = '2026-08-31T09:59:59.000Z';
}, /ældre end activation/);

expectHardStop((input) => {
  input.observations[0].observedAt = input.terminalEvidence.checkedAt;
}, /efter terminal-evidensen/);
expectHardStop((input) => {
  input.observations[0].observedAt = '2026-08-31T10:01:59.000Z';
}, /efter terminal-evidensen/);

{
  const input = fixture();
  input.terminalEvidence.runConclusion = 'success';
  input.terminalEvidence.deployStepConclusion = 'success';
  input.terminalEvidence.pagesRequestAccepted = true;
  const result = classifyRavScoreOperationalPagesRecovery(input);
  assert.equal(result.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED);
  assert.equal(result.reasonCode, 'CONTROLLER_PENDING_AFTER_SUCCESSFUL_RUN');
  assert.equal(result.centralMutationAllowed, false);
  assert.equal(result.exactTargetRedeployAllowed, false);
}

expectHardStop((input) => {
  input.observations[1].observationNonce = input.observations[0].observationNonce;
}, /forskellige nonces/);
expectHardStop((input) => {
  input.observations[1].observedAt = input.observations[0].observedAt;
}, /mindst ét sekund/);
expectHardStop((input) => {
  input.observations[0].runAttempt += 1;
}, /workflowidentitet|attemptId/);
expectHardStop((input) => {
  input.observations[0].privatePayloadRead = true;
}, /private payloads/);
expectHardStop((input) => {
  input.artifactEvidence.privatePayloadRead = true;
}, /private payloads/);
expectHardStop((input) => {
  input.pending.unexpected = 'forbidden';
}, /ukendt eller manglende felt/);

{
  const input = fixture();
  input.artifactSeal.artifactDigestSha256 = `sha256:${input.artifactSeal.artifactDigestSha256}`;
  input.artifactEvidence.artifactDigestSha256 =
    `sha256:${input.artifactEvidence.artifactDigestSha256}`;
  const result = classifyRavScoreOperationalPagesRecovery(input);
  assert.equal(result.artifactDigestSha256, 'c'.repeat(64));
  assert.equal(normalizeArtifactDigestSha256(`sha256:${'f'.repeat(64)}`), 'f'.repeat(64));
}

{
  const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'ravscore-pages-recovery-test-'));
  try {
    const input = fixture({ terminalStatus: 'NOT_STARTED' });
    const files = {
      pending: 'pending.json',
      'artifact-seal': 'artifact-seal.json',
      'artifact-evidence': 'artifact-evidence.json',
      'terminal-evidence': 'terminal-evidence.json',
      observations: 'observations.json',
      'target-manifest': 'target-manifest.json'
    };
    const values = {
      pending: input.pending,
      'artifact-seal': input.artifactSeal,
      'artifact-evidence': input.artifactEvidence,
      'terminal-evidence': input.terminalEvidence,
      observations: input.observations,
      'target-manifest': input.targetManifest
    };
    for (const [key, fileName] of Object.entries(files)) {
      writeFileSync(path.join(temporaryRoot, fileName), JSON.stringify(values[key]));
    }
    const outputPath = path.join(temporaryRoot, 'classification.json');
    const cliArguments = [
      path.resolve('scripts/ravscore-operational-pages-recovery.mjs'),
      ...Object.entries(files).flatMap(([key, fileName]) => [
        `--${key}`,
        path.join(temporaryRoot, fileName)
      ]),
      '--output',
      outputPath
    ];
    const execution = spawnSync(process.execPath, cliArguments, { encoding: 'utf8' });
    assert.equal(execution.status, 0, execution.stderr);
    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(output.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.SAFE_SOURCE_ABORT);

    input.observations[1].publicManifestSha256 = 'e'.repeat(64);
    writeFileSync(
      path.join(temporaryRoot, files.observations),
      JSON.stringify(input.observations)
    );
    const failClosedPath = path.join(temporaryRoot, 'classification-fail-closed.json');
    const failClosedExecution = spawnSync(
      process.execPath,
      cliArguments.slice(0, -1).concat(failClosedPath),
      { encoding: 'utf8' }
    );
    assert.equal(failClosedExecution.status, 1);
    const failClosed = JSON.parse(readFileSync(failClosedPath, 'utf8'));
    assert.equal(failClosed.action, RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED);
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

console.log('RavScore operational exact-target Pages recovery test passed.');
