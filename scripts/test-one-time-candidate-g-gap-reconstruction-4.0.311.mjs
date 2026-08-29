#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_MODEL_ID,
  CANDIDATE_G_STATE_PROFILE_ID,
  CANDIDATE_G_STATE_SCHEMA_VERSION,
  CANDIDATE_G_STATE_VARIANT_ID,
} from '../js/core/ravscore-candidate-g-state-pipeline.js';
import {
  assertCandidateGReconstructionTrustRolloff,
  buildBoundedCurrentTransportMemory,
  CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
  isReconstructedTransportEvidence,
} from '../js/core/ravscore-regime-memory.js';
import {
  applyOneTimeGap,
  cleanupOneTimeGap,
  inspectOneTimeGap,
  rollbackOrCleanupOneTimeGap,
  rollbackOneTimeGap,
} from './one-time-candidate-g-gap-reconstruction.mjs';
import {
  restoreContinuationCheckpoint,
  saveContinuationCheckpoint,
} from './candidate-g-continuation-checkpoint.mjs';

const HOUR_MS = 3_600_000;
const INCIDENT_ID = 'RRGAP-2026-08-29-CANDIDATE-G-01';
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'ravradar-gap-reconstruction-test-'));
const file = name => path.join(temp, name);
const iso = value => new Date(value).toISOString();
const addHours = (value, hours) => iso(Date.parse(value) + (hours * HOUR_MS));
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const digest = value => crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const rawDigest = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const writeJson = (name, value) => fs.writeFile(file(name), `${JSON.stringify(value, null, 2)}\n`);
const readJson = async name => JSON.parse(await fs.readFile(file(name), 'utf8'));
const exists = async target => fs.access(target).then(() => true, () => false);
const deepKeys = value => {
  if (Array.isArray(value)) return value.flatMap(deepKeys);
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...deepKeys(child)]);
};
const spawnOneTimeCli = (args, { githubActions = false } = {}) => {
  const env = { ...process.env };
  if (githubActions) env.GITHUB_ACTIONS = 'true';
  else delete env.GITHUB_ACTIONS;
  return spawnSync(process.execPath, [
    path.resolve('scripts/one-time-candidate-g-gap-reconstruction.mjs'),
    ...args,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env,
  });
};

const annotatedKnownFailure = spawnOneTimeCli([], { githubActions: true });
assert.notEqual(annotatedKnownFailure.status, 0);
assert.equal(annotatedKnownFailure.stderr, '');
assert.equal(
  annotatedKnownFailure.stdout.trim(),
  '::error title=Candidate G one-time reconstruction::ONE_TIME_GAP_ARGUMENTS_MISSING',
);
const annotatedUnknownFailure = spawnOneTimeCli(['--private-value'], { githubActions: true });
assert.notEqual(annotatedUnknownFailure.status, 0);
assert.equal(annotatedUnknownFailure.stderr, '');
assert.equal(
  annotatedUnknownFailure.stdout.trim(),
  '::error title=Candidate G one-time reconstruction::ONE_TIME_GAP_SANITIZED_FAILURE_UNAVAILABLE',
);
assert.doesNotMatch(annotatedUnknownFailure.stdout, /private-value/);

const sealedRolloffTrust = {
  schemaVersion: 1,
  status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE',
  incidentId: INCIDENT_ID,
  decisionId: 'DEC-0109',
  method: 'LINEAR_INTERPOLATION_OF_DERIVED_SIGNED_TRANSPORT_STRENGTH',
  evidenceClassification: 'RECONSTRUCTED_DERIVED_NOT_MEASURED',
  calibrationEligible: false,
  hardObservedOuttransportEligible: false,
  descriptorSha256: 'a'.repeat(64),
  affectedPartCount: 673,
  syntheticSampleCount: 2020,
  activeUntil: '2026-08-31T09:00:00.000Z',
};
assert.equal(assertCandidateGReconstructionTrustRolloff({
  previousTrust: sealedRolloffTrust,
  activeReconstructedPartCount: 8,
  generatedAt: '2026-08-30T09:00:00.000Z',
}), true);
assert.throws(() => assertCandidateGReconstructionTrustRolloff({
  previousTrust: sealedRolloffTrust,
  activeReconstructedPartCount: 0,
  generatedAt: '2026-08-31T08:59:59.000Z',
}), /disappeared before its sealed activeUntil/);
assert.equal(assertCandidateGReconstructionTrustRolloff({
  previousTrust: sealedRolloffTrust,
  activeReconstructedPartCount: 0,
  generatedAt: sealedRolloffTrust.activeUntil,
}), false);
assert.throws(() => assertCandidateGReconstructionTrustRolloff({
  previousTrust: { ...sealedRolloffTrust, descriptorSha256: 'tampered' },
  activeReconstructedPartCount: 0,
  generatedAt: '2026-09-01T09:00:00.000Z',
}), /not sealed/);

function series(start, end, cadenceHours, strength) {
  const rows = [];
  for (let time = Date.parse(start); time <= Date.parse(end); time += cadenceHours * HOUR_MS) {
    rows.push({ time: iso(time), strength });
  }
  return rows;
}

function state({ stateKey, stateTime, evidence, mobilisationPotential = 50 }) {
  const referenceTime = evidence.at(-1).time;
  const replay = buildBoundedCurrentTransportMemory(evidence, {
    ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
    referenceTime,
    restartAfterVerifiedTimeGap: true,
  });
  assert.ok(replay.result);
  return {
    schemaVersion: CANDIDATE_G_STATE_SCHEMA_VERSION,
    modelId: CANDIDATE_G_STATE_MODEL_ID,
    variantId: CANDIDATE_G_STATE_VARIANT_ID,
    profileId: CANDIDATE_G_STATE_PROFILE_ID,
    stateKey,
    time: stateTime,
    transportReferenceAt: referenceTime,
    transportPotential: replay.result.transportPotential,
    outboundEpisodeEffectiveHours: replay.result.outboundEpisodeEffectiveHours,
    transportMemoryReady: replay.memoryReady,
    transportMemoryStatus: replay.status,
    transportMemoryWindowHours: replay.windowHours,
    transportMemoryCoverageHours: replay.coverageHours,
    transportEvidence: replay.evidence,
    mobilisationPotential,
  };
}

const beforeReference = '2026-08-28T09:00:00.000Z';
const afterReference = '2026-08-28T18:00:00.000Z';
const targetReference = '2026-08-29T09:00:00.000Z';
const zones = Object.fromEntries(Array.from({ length: 210 }, (_, index) => [
  `zone-${String(index).padStart(3, '0')}`,
  { id: `zone-${String(index).padStart(3, '0')}` },
]));

function buildDocument(kind) {
  const productionReferenceAt = kind === 'before'
    ? beforeReference
    : kind === 'after'
      ? afterReference
      : targetReference;
  const parts = {};
  for (let index = 0; index < 673; index += 1) {
    const partId = `part-${String(index).padStart(3, '0')}`;
    const cadence = index < 665 ? 1 : 3;
    const leftAnchor = cadence === 1 ? beforeReference : beforeReference;
    const rightAnchor = cadence === 1
      ? addHours(leftAnchor, 3)
      : addHours(leftAnchor, 6);
    const measuredStrength = index % 2 === 0 ? 0.55 : -0.45;
    const rightStrength = index % 3 === 0 ? -0.35 : 0.4;
    let evidence;
    if (kind === 'before') {
      evidence = series(addHours(leftAnchor, -48), leftAnchor, cadence, measuredStrength);
    } else {
      const end = kind === 'after' ? afterReference : targetReference;
      // The sealed after artifact legitimately contains only its exact right
      // bracket for the eight native 3-hour parts. Before + target still prove
      // the native cadence independently.
      evidence = kind === 'after' && cadence === 3
        ? [{ time: rightAnchor, strength: rightStrength }]
        : series(rightAnchor, end, cadence, rightStrength);
    }
    const currentState = state({
      stateKey: `sha256:${crypto.createHash('sha256').update(partId).digest('hex')}`,
      stateTime: productionReferenceAt,
      evidence,
      mobilisationPotential: 40 + (index % 20),
    });
    if (kind === 'before') {
      assert.equal(currentState.transportMemoryReady, true);
      assert.equal(currentState.transportMemoryStatus, 'READY');
    } else {
      assert.equal(currentState.transportMemoryReady, false);
      assert.equal(currentState.transportMemoryStatus, 'WINDOW_INCOMPLETE');
    }
    parts[partId] = {
      zoneId: `zone-${String(index % 210).padStart(3, '0')}`,
      candidateG: { currentState },
    };
  }
  return {
    datasetId: `fixture-${kind}`,
    generatedAt: productionReferenceAt,
    productionReferenceAt,
    zones: structuredClone(zones),
    coastalParts: { parts },
  };
}

const before = buildDocument('before');
const after = buildDocument('after');
const originalTarget = buildDocument('target');
const beforePath = file('before.json');
const afterPath = file('after.json');
const targetPath = file('target.json');
const descriptorPath = file('descriptor.json');
const rollbackPath = file('rollback.json');
const githubOutputPath = file('github-output.txt');
const policyPath = path.resolve('data/admin/candidate-g-one-time-gap-reconstruction-20260829.json');
const beforeAttestationPath = file('before-attestation.txt');
const afterAttestationPath = file('after-attestation.txt');
const beforeBundlePath = file('before-bundle.zip');
const afterBundlePath = file('after-bundle.zip');
const sourceHead = 'a93082548c4cc1ddbe9c75ce303d334530a534c4';
await Promise.all([
  writeJson('before.json', before),
  writeJson('after.json', after),
  writeJson('target.json', originalTarget),
  fs.writeFile(beforeAttestationPath, `repository=jakobjorgensen82-commits/RavRadar\nrun_number=3675\nsha=${sourceHead}\nref=refs/heads/main\ngenerated_at=2026-08-28T09:00:00Z\n`),
  fs.writeFile(afterAttestationPath, `repository=jakobjorgensen82-commits/RavRadar\nrun_number=3676\nsha=${sourceHead}\nref=refs/heads/main\ngenerated_at=2026-08-28T18:00:00Z\n`),
  fs.writeFile(beforeBundlePath, 'synthetic-before-support-bundle'),
  fs.writeFile(afterBundlePath, 'synthetic-after-support-bundle'),
]);

const common = {
  beforePath,
  afterPath,
  targetPath,
  policyPath,
  descriptorPath,
  beforeAttestationPath,
  afterAttestationPath,
  beforeBundlePath,
  afterBundlePath,
};
const inspected = await inspectOneTimeGap(common);
assert.match(inspected.descriptorSha256, /^[a-f0-9]{64}$/);
assert.equal(inspected.affectedPartCount, 673);
assert.equal(inspected.syntheticSampleCount, (665 * 2) + 8);
assert.deepEqual(inspected.cadencePartCounts, { '1h': 665, '3h': 8 });
const descriptor = await readJson('descriptor.json');
assert.equal(descriptor.descriptorSha256, inspected.descriptorSha256);
assert.doesNotMatch(JSON.stringify(descriptor), /"strength"/);
assert.deepEqual(
  deepKeys(descriptor).filter(key => [
    'currentSpeedMps', 'currentAlignment', 'u', 'v', 'lat', 'lon', 'latitude', 'longitude',
    'coordinates', 'weather', 'waveHeightM', 'wavePeriodS', 'waterLevelM',
  ].includes(key)),
  [],
);

await writeJson('cli-target.json', originalTarget);
const cliDescriptorPath = file('cli-descriptor.json');
const cli = spawnOneTimeCli([
  '--inspect',
  '--before', beforePath,
  '--after', afterPath,
  '--target', file('cli-target.json'),
  '--policy', policyPath,
  '--descriptor', cliDescriptorPath,
  '--before-attestation', beforeAttestationPath,
  '--after-attestation', afterAttestationPath,
  '--before-bundle', beforeBundlePath,
  '--after-bundle', afterBundlePath,
  '--github-output', githubOutputPath,
], { githubActions: true });
assert.equal(cli.status, 0, cli.stderr || cli.stdout);
assert.equal(cli.stderr, '');
assert.match(
  cli.stdout,
  new RegExp(`^::notice title=Candidate G one-time reconstruction inspection::descriptor_sha256=${inspected.descriptorSha256};affected_part_count=673;synthetic_sample_count=1338;cadence_1h=665;cadence_3h=8\\r?\\n`),
);
assert.doesNotMatch(cli.stdout, /fixture-|"dataset|"sources|runId|artifactId|"strength"/i);
const githubOutput = await fs.readFile(githubOutputPath, 'utf8');
assert.deepEqual(githubOutput.trim().split(/\r?\n/).map(line => line.split('=')[0]), [
  'descriptor_sha256',
  'affected_part_count',
  'synthetic_sample_count',
  'cadence_1h',
  'cadence_3h',
  'sign_reversal_part_count',
  'reconstructed_outflow_gate_part_count',
  'neutral_outflow_gate_part_count',
  'left_hold_outflow_gate_part_count',
  'right_hold_outflow_gate_part_count',
]);
assert.doesNotMatch(githubOutput, /fixture-|2026-|strength|dataset|run|artifact/i);

const multipleModeTargetPath = file('multiple-mode-target.json');
const multipleModeDescriptorPath = file('multiple-mode-descriptor.json');
await writeJson('multiple-mode-target.json', originalTarget);
const multipleModeBytes = await fs.readFile(multipleModeTargetPath, 'utf8');
const multipleModeCli = spawnOneTimeCli([
  '--target', multipleModeTargetPath,
  '--descriptor', multipleModeDescriptorPath,
  '--inspect',
  '--apply',
]);
assert.notEqual(multipleModeCli.status, 0);
assert.match(multipleModeCli.stderr, /ONE_TIME_GAP_MULTIPLE_MODES/);
assert.equal(await fs.readFile(multipleModeTargetPath, 'utf8'), multipleModeBytes);
assert.equal(await exists(multipleModeDescriptorPath), false);

const illegalGithubTargetPath = file('illegal-github-target.json');
const illegalGithubRollbackPath = file('illegal-github-rollback.json');
const illegalGithubOutputPath = file('illegal-github-output.txt');
await writeJson('illegal-github-target.json', originalTarget);
const illegalGithubBytes = await fs.readFile(illegalGithubTargetPath, 'utf8');
const illegalGithubCli = spawnOneTimeCli([
  '--apply',
  '--before', beforePath,
  '--after', afterPath,
  '--target', illegalGithubTargetPath,
  '--policy', policyPath,
  '--descriptor', descriptorPath,
  '--descriptor-sha256', inspected.descriptorSha256,
  '--rollback-checkpoint', illegalGithubRollbackPath,
  '--before-attestation', beforeAttestationPath,
  '--after-attestation', afterAttestationPath,
  '--before-bundle', beforeBundlePath,
  '--after-bundle', afterBundlePath,
  '--github-output', illegalGithubOutputPath,
]);
assert.notEqual(illegalGithubCli.status, 0);
assert.match(illegalGithubCli.stderr, /ONE_TIME_GAP_GITHUB_OUTPUT_INSPECT_ONLY/);
assert.equal(await fs.readFile(illegalGithubTargetPath, 'utf8'), illegalGithubBytes);
assert.equal(await exists(illegalGithubRollbackPath), false);
assert.equal(await exists(illegalGithubOutputPath), false);

const duplicateAttestationPath = file('duplicate-attestation.txt');
await fs.writeFile(duplicateAttestationPath,
  `${await fs.readFile(beforeAttestationPath, 'utf8')}run_number=3675\n`);
const sourceFailureTargetPath = file('source-failure-target.json');
const sourceFailureDescriptorPath = file('source-failure-descriptor.json');
await writeJson('source-failure-target.json', originalTarget);
const sourceFailureBytes = await fs.readFile(sourceFailureTargetPath, 'utf8');
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    targetPath: sourceFailureTargetPath,
    descriptorPath: sourceFailureDescriptorPath,
    beforeAttestationPath: duplicateAttestationPath,
  }),
  /ONE_TIME_GAP_SOURCE_ATTESTATION_SHAPE_INVALID/,
);
assert.equal(await fs.readFile(sourceFailureTargetPath, 'utf8'), sourceFailureBytes);
assert.equal(await exists(sourceFailureDescriptorPath), false);

const policyTampered = JSON.parse(await fs.readFile(policyPath, 'utf8'));
policyTampered.forbidden.generalFallback = false;
const policyTamperedPath = file('tampered-policy.json');
await fs.writeFile(policyTamperedPath, `${JSON.stringify(policyTampered, null, 2)}\n`);
const policyFailureDescriptorPath = file('policy-failure-descriptor.json');
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    policyPath: policyTamperedPath,
    descriptorPath: policyFailureDescriptorPath,
  }),
  /ONE_TIME_GAP_FORBIDDEN_POLICY_INVALID/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), `${JSON.stringify(originalTarget, null, 2)}\n`);
assert.equal(await exists(policyFailureDescriptorPath), false);

const targetTrustConflict = structuredClone(originalTarget);
targetTrustConflict.coastalParts.evidenceTrust = {
  schemaVersion: 1,
  status: 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE',
  incidentId: 'UNRELATED',
};
await writeJson('trust-conflict-target.json', targetTrustConflict);
const trustConflictBytes = await fs.readFile(file('trust-conflict-target.json'), 'utf8');
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    targetPath: file('trust-conflict-target.json'),
    descriptorPath: file('trust-conflict-descriptor.json'),
  }),
  /ONE_TIME_GAP_TARGET_TRUST_CONFLICT/,
);
assert.equal(await fs.readFile(file('trust-conflict-target.json'), 'utf8'), trustConflictBytes);
assert.equal(await exists(file('trust-conflict-descriptor.json')), false);

const emptyAfter = structuredClone(after);
emptyAfter.coastalParts.parts['part-672'].candidateG.currentState.transportEvidence = [];
await writeJson('empty-after.json', emptyAfter);
const emptyAfterTargetBytes = await fs.readFile(targetPath, 'utf8');
const emptyAfterDescriptorPath = file('empty-after-descriptor.json');
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    afterPath: file('empty-after.json'),
    descriptorPath: emptyAfterDescriptorPath,
  }),
  /ONE_TIME_GAP_AFTER_EVIDENCE_COUNT/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), emptyAfterTargetBytes);
assert.equal(await exists(emptyAfterDescriptorPath), false);

const singletonBefore = structuredClone(before);
const singletonBeforeOriginal = singletonBefore.coastalParts.parts['part-672'].candidateG.currentState;
singletonBefore.coastalParts.parts['part-672'].candidateG.currentState = state({
  stateKey: singletonBeforeOriginal.stateKey,
  stateTime: beforeReference,
  evidence: [singletonBeforeOriginal.transportEvidence.at(-1)],
  mobilisationPotential: singletonBeforeOriginal.mobilisationPotential,
});
await writeJson('singleton-before.json', singletonBefore);
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    beforePath: file('singleton-before.json'),
    descriptorPath: file('singleton-before-descriptor.json'),
  }),
  /ONE_TIME_GAP_BEFORE_EVIDENCE_COUNT/,
);
assert.equal(await exists(file('singleton-before-descriptor.json')), false);

const singletonTarget = structuredClone(originalTarget);
const singletonTargetOriginal = singletonTarget.coastalParts.parts['part-672'].candidateG.currentState;
singletonTarget.coastalParts.parts['part-672'].candidateG.currentState = state({
  stateKey: singletonTargetOriginal.stateKey,
  stateTime: targetReference,
  evidence: [singletonTargetOriginal.transportEvidence.at(-1)],
  mobilisationPotential: singletonTargetOriginal.mobilisationPotential,
});
await writeJson('singleton-target.json', singletonTarget);
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    targetPath: file('singleton-target.json'),
    descriptorPath: file('singleton-target-descriptor.json'),
  }),
  /ONE_TIME_GAP_TARGET_EVIDENCE_COUNT/,
);
assert.equal(await exists(file('singleton-target-descriptor.json')), false);

const singletonOneHourAfter = structuredClone(after);
const singletonOneHourOriginal = singletonOneHourAfter.coastalParts.parts['part-000'].candidateG.currentState;
const singletonOneHourRightAnchor = singletonOneHourOriginal.transportEvidence.at(0);
singletonOneHourAfter.coastalParts.parts['part-000'].candidateG.currentState = state({
  stateKey: singletonOneHourOriginal.stateKey,
  stateTime: singletonOneHourRightAnchor.time,
  // Use the actual right bracket, so this negative isolates the 3h-only
  // singleton gate instead of also depending on the maximum-gap gate.
  evidence: [singletonOneHourRightAnchor],
  mobilisationPotential: singletonOneHourOriginal.mobilisationPotential,
});
await writeJson('singleton-one-hour-after.json', singletonOneHourAfter);
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    afterPath: file('singleton-one-hour-after.json'),
    descriptorPath: file('singleton-one-hour-after-descriptor.json'),
  }),
  /ONE_TIME_GAP_SINGLE_AFTER_ANCHOR_CADENCE_NOT_ALLOWED/,
);
assert.equal(await exists(file('singleton-one-hour-after-descriptor.json')), false);

const singletonReplayMismatchAfter = structuredClone(after);
const singletonReplayMismatchState = singletonReplayMismatchAfter.coastalParts
  .parts['part-672'].candidateG.currentState;
singletonReplayMismatchState.transportPotential = singletonReplayMismatchState.transportPotential >= 99
  ? singletonReplayMismatchState.transportPotential - 1
  : singletonReplayMismatchState.transportPotential + 1;
await writeJson('singleton-replay-mismatch-after.json', singletonReplayMismatchAfter);
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    afterPath: file('singleton-replay-mismatch-after.json'),
    descriptorPath: file('singleton-replay-mismatch-after-descriptor.json'),
  }),
  /ONE_TIME_GAP_AFTER_STATE_REPLAY_MISMATCH/,
);
assert.equal(await exists(file('singleton-replay-mismatch-after-descriptor.json')), false);

const missingAfterAnchorTarget = structuredClone(originalTarget);
const missingAfterAnchorOriginal = missingAfterAnchorTarget.coastalParts
  .parts['part-672'].candidateG.currentState;
missingAfterAnchorTarget.coastalParts.parts['part-672'].candidateG.currentState = state({
  stateKey: missingAfterAnchorOriginal.stateKey,
  stateTime: targetReference,
  // Cadence and replay remain valid, but the exact measured AFTER bracket is
  // absent from TARGET. Inspect must fail before descriptor or mutation.
  evidence: missingAfterAnchorOriginal.transportEvidence.slice(1),
  mobilisationPotential: missingAfterAnchorOriginal.mobilisationPotential,
});
await writeJson('missing-after-anchor-target.json', missingAfterAnchorTarget);
const missingAfterAnchorTargetBytes = await fs.readFile(file('missing-after-anchor-target.json'), 'utf8');
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    targetPath: file('missing-after-anchor-target.json'),
    descriptorPath: file('missing-after-anchor-descriptor.json'),
  }),
  /ONE_TIME_GAP_TARGET_AFTER_ANCHOR_MISSING/,
);
assert.equal(
  await fs.readFile(file('missing-after-anchor-target.json'), 'utf8'),
  missingAfterAnchorTargetBytes,
);
assert.equal(await exists(file('missing-after-anchor-descriptor.json')), false);

const twoPointTarget = structuredClone(originalTarget);
const twoPointTargetOriginal = twoPointTarget.coastalParts.parts['part-672'].candidateG.currentState;
twoPointTarget.coastalParts.parts['part-672'].candidateG.currentState = state({
  stateKey: twoPointTargetOriginal.stateKey,
  stateTime: targetReference,
  evidence: twoPointTargetOriginal.transportEvidence.slice(-2),
  mobilisationPotential: twoPointTargetOriginal.mobilisationPotential,
});
await writeJson('two-point-target.json', twoPointTarget);
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    targetPath: file('two-point-target.json'),
    descriptorPath: file('two-point-target-descriptor.json'),
  }),
  /ONE_TIME_GAP_NATIVE_CADENCE_UNPROVEN/,
);
assert.equal(await exists(file('two-point-target-descriptor.json')), false);

const ambiguousCadenceTarget = structuredClone(originalTarget);
const ambiguousPartId = 'part-000';
const ambiguousOriginal = ambiguousCadenceTarget.coastalParts.parts[ambiguousPartId].candidateG.currentState;
const ambiguousEvidence = series('2026-08-28T12:00:00.000Z', '2026-08-29T08:00:00.000Z', 2, -0.35);
ambiguousEvidence.push({ time: targetReference, strength: -0.35 });
ambiguousCadenceTarget.coastalParts.parts[ambiguousPartId].candidateG.currentState = state({
  stateKey: ambiguousOriginal.stateKey,
  stateTime: targetReference,
  evidence: ambiguousEvidence,
  mobilisationPotential: ambiguousOriginal.mobilisationPotential,
});
await writeJson('ambiguous-target.json', ambiguousCadenceTarget);
const ambiguousBytes = await fs.readFile(file('ambiguous-target.json'), 'utf8');
await assert.rejects(
  inspectOneTimeGap({ ...common, targetPath: file('ambiguous-target.json'), descriptorPath: file('ambiguous-descriptor.json') }),
  /ONE_TIME_GAP_AMBIGUOUS_NATIVE_CADENCE/,
);
assert.equal(await fs.readFile(file('ambiguous-target.json'), 'utf8'), ambiguousBytes);

const alreadyFilledTarget = structuredClone(originalTarget);
const filledOriginal = alreadyFilledTarget.coastalParts.parts[ambiguousPartId].candidateG.currentState;
alreadyFilledTarget.coastalParts.parts[ambiguousPartId].candidateG.currentState = state({
  stateKey: filledOriginal.stateKey,
  stateTime: targetReference,
  evidence: series('2026-08-28T10:00:00.000Z', targetReference, 1, -0.35),
  mobilisationPotential: filledOriginal.mobilisationPotential,
});
await writeJson('filled-target.json', alreadyFilledTarget);
const filledBytes = await fs.readFile(file('filled-target.json'), 'utf8');
await assert.rejects(
  inspectOneTimeGap({ ...common, targetPath: file('filled-target.json'), descriptorPath: file('filled-descriptor.json') }),
  /ONE_TIME_GAP_TARGET_TIMESTAMP_ALREADY_FILLED/,
);
assert.equal(await fs.readFile(file('filled-target.json'), 'utf8'), filledBytes);

const semanticallyTamperedDescriptor = structuredClone(descriptor);
delete semanticallyTamperedDescriptor.descriptorSha256;
semanticallyTamperedDescriptor.decisionId = 'DEC-9999';
semanticallyTamperedDescriptor.descriptorSha256 = digest(semanticallyTamperedDescriptor);
await writeJson('semantic-descriptor.json', semanticallyTamperedDescriptor);
await writeJson('semantic-target.json', originalTarget);
const semanticTargetBytes = await fs.readFile(file('semantic-target.json'), 'utf8');
const semanticRollbackPath = file('semantic-rollback.json');
await assert.rejects(
  applyOneTimeGap({
    ...common,
    targetPath: file('semantic-target.json'),
    descriptorPath: file('semantic-descriptor.json'),
    descriptorSha256: semanticallyTamperedDescriptor.descriptorSha256,
    rollbackPath: semanticRollbackPath,
  }),
  /ONE_TIME_GAP_DESCRIPTOR_SEMANTICS_INVALID/,
);
assert.equal(await fs.readFile(file('semantic-target.json'), 'utf8'), semanticTargetBytes);
assert.equal(await exists(semanticRollbackPath), false);

const changedBundlePath = file('changed-before-bundle.zip');
await fs.writeFile(changedBundlePath, 'not-the-inspected-support-bundle');
await writeJson('bundle-cas-target.json', originalTarget);
const bundleCasTargetBytes = await fs.readFile(file('bundle-cas-target.json'), 'utf8');
const bundleCasRollbackPath = file('bundle-cas-rollback.json');
await assert.rejects(
  applyOneTimeGap({
    ...common,
    targetPath: file('bundle-cas-target.json'),
    beforeBundlePath: changedBundlePath,
    descriptorSha256: inspected.descriptorSha256,
    rollbackPath: bundleCasRollbackPath,
  }),
  /ONE_TIME_GAP_DESCRIPTOR_OR_TARGET_CAS_MISMATCH/,
);
assert.equal(await fs.readFile(file('bundle-cas-target.json'), 'utf8'), bundleCasTargetBytes);
assert.equal(await exists(bundleCasRollbackPath), false);

const emptyBundlePath = file('empty-before-bundle.zip');
await fs.writeFile(emptyBundlePath, '');
await writeJson('empty-bundle-target.json', originalTarget);
const emptyBundleTargetBytes = await fs.readFile(file('empty-bundle-target.json'), 'utf8');
const emptyBundleDescriptorPath = file('empty-bundle-descriptor.json');
await assert.rejects(
  inspectOneTimeGap({
    ...common,
    targetPath: file('empty-bundle-target.json'),
    descriptorPath: emptyBundleDescriptorPath,
    beforeBundlePath: emptyBundlePath,
  }),
  /ONE_TIME_GAP_SOURCE_BUNDLE_EMPTY/,
);
assert.equal(await fs.readFile(file('empty-bundle-target.json'), 'utf8'), emptyBundleTargetBytes);
assert.equal(await exists(emptyBundleDescriptorPath), false);

const applied = await applyOneTimeGap({
  ...common,
  descriptorSha256: inspected.descriptorSha256,
  rollbackPath,
});
assert.equal(applied.syntheticSampleCount, (665 * 2) + 8);
const compactRollback = await readJson('rollback.json');
assert.equal(compactRollback.privacy.compactDerivedStateOnly, true);
assert.equal(compactRollback.privacy.privateDataIncluded, false);
assert.deepEqual(
  deepKeys(compactRollback).filter(key => [
    'currentSpeedMps', 'currentAlignment', 'u', 'v', 'lat', 'lon', 'latitude', 'longitude',
    'coordinates', 'weather', 'waveHeightM', 'wavePeriodS', 'waterLevelM',
  ].includes(key)),
  [],
);
let target = await readJson('target.json');
assert.equal(target.coastalParts.evidenceTrust.status, 'ACTIVE_RECONSTRUCTED_DERIVED_EVIDENCE');
assert.equal(target.coastalParts.evidenceTrust.calibrationEligible, false);
assert.equal(target.candidateGOneTimeReconstruction.descriptorSha256, inspected.descriptorSha256);
for (const [partId, part] of Object.entries(target.coastalParts.parts)) {
  assert.equal(part.candidateG.currentState.schemaVersion, CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION, partId);
  assert.ok(part.candidateG.currentState.transportEvidence.some(isReconstructedTransportEvidence), partId);
  assert.equal(part.candidateG.currentState.mobilisationPotential,
    originalTarget.coastalParts.parts[partId].candidateG.currentState.mobilisationPotential);
}

const beforeRepeatedApply = await fs.readFile(targetPath, 'utf8');
await assert.rejects(
  applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath }),
  /ONE_TIME_GAP_TARGET_ALREADY_MARKED/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), beforeRepeatedApply);

await rollbackOneTimeGap({
  targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath,
});
assert.deepEqual(await readJson('target.json'), originalTarget);
assert.equal(await fs.readFile(targetPath, 'utf8'), `${JSON.stringify(originalTarget, null, 2)}\n`);

// The workflow-facing rollback selector may use the old exact path only while
// the target is still the byte-/hash-identical immediate post-apply document.
await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
const exactDispatch = await rollbackOrCleanupOneTimeGap({
  targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath, policyPath,
});
assert.equal(exactDispatch.strategy, 'EXACT_IDENTICAL_POST_APPLY_TARGET');
assert.equal(exactDispatch.affectedPartCount, 673);
assert.equal(await fs.readFile(targetPath, 'utf8'), `${JSON.stringify(originalTarget, null, 2)}\n`);

const measuredForeignBytes = await fs.readFile(targetPath, 'utf8');
await assert.rejects(
  rollbackOrCleanupOneTimeGap({
    targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath, policyPath,
  }),
  /ONE_TIME_GAP_CLEANUP_LINEAGE_MISSING/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), measuredForeignBytes);

await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
const tamperedRollback = await readJson('rollback.json');
tamperedRollback.payloadSha256 = '0'.repeat(64);
await writeJson('tampered-rollback.json', tamperedRollback);
const rollbackTamperTargetBytes = await fs.readFile(targetPath, 'utf8');
await assert.rejects(
  rollbackOrCleanupOneTimeGap({
    targetPath,
    descriptorPath,
    descriptorSha256: inspected.descriptorSha256,
    rollbackPath: file('tampered-rollback.json'),
    policyPath,
  }),
  /ONE_TIME_GAP_ROLLBACK_CHECKPOINT_INVALID/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), rollbackTamperTargetBytes);

await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
target = await readJson('target.json');
target.datasetId = 'fixture-target-advanced';
await writeJson('target.json', target);
const advancedBytes = await fs.readFile(targetPath, 'utf8');
await assert.rejects(
  rollbackOneTimeGap({ targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath }),
  /ONE_TIME_GAP_ROLLBACK_BINDING_INVALID/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), advancedBytes);

await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
const cleanupContextTampered = await readJson('target.json');
cleanupContextTampered.coastalParts.parts['part-000'].candidateG.currentState.stateKey =
  `sha256:${'f'.repeat(64)}`;
await writeJson('target.json', cleanupContextTampered);
const cleanupContextBytes = await fs.readFile(targetPath, 'utf8');
await assert.rejects(
  rollbackOrCleanupOneTimeGap({
    targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath, policyPath,
  }),
  /ONE_TIME_GAP_CLEANUP_PART_CONTEXT_MISMATCH/,
);
assert.equal(await fs.readFile(targetPath, 'utf8'), cleanupContextBytes);

await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
const staleReadyTarget = await readJson('target.json');
for (const part of Object.values(staleReadyTarget.coastalParts.parts)) {
  const state = part.candidateG.currentState;
  part.candidateG.referenceAt = state.time;
  part.candidateG.transportReferenceAt = state.transportReferenceAt;
  part.candidateG.currentTransition = 'RETAINED_OR_NEUTRAL';
  part.candidateG.transportMemoryReady = true;
  part.candidateG.transportMemoryStatus = 'READY';
  part.candidateG.transportMemoryCoverageHours = 48;
  part.candidateG.transportMemoryWindowHours = 48;
  part.candidateG.modes = {
    waders: { available: true, score: 91 },
    beach: { available: true, score: 89 },
  };
  part.current = {
    time: state.time,
    waders: { available: true, score: 91 },
    beach: { available: true, score: 89 },
  };
}
staleReadyTarget.coastalParts.zones = {
  'zone-000': {
    expectedPartCount: 4,
    scoredPartCount: 4,
    currentReferenceAt: targetReference,
    hourly: [{
      time: targetReference,
      waders: { available: true, status: 'whole-zone', score: 91 },
      beach: { available: true, status: 'whole-zone', score: 89 },
    }],
  },
};
staleReadyTarget.coastalParts.scoreAvailability = {
  schemaVersion: 1,
  policy: 'candidate-g-local-fail-closed',
  allZonesActive: true,
  activeZoneCount: 1,
  unavailableZoneCount: 0,
  totalZoneCount: 1,
  evaluatedAt: targetReference,
  unavailableZones: [],
};
await writeJson('target.json', staleReadyTarget);
const cleanupResult = await rollbackOrCleanupOneTimeGap({
  targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath, policyPath,
});
assert.equal(cleanupResult.strategy, 'CAUSAL_INCIDENT_CLEANUP');
assert.equal(cleanupResult.affectedPartCount, 673);
assert.equal(cleanupResult.newerMeasuredEvidencePreserved, true);
assert.equal(cleanupResult.preIncidentMeasuredEvidenceDiscardedAtCausalBoundary, true);
assert.equal(cleanupResult.pendingFreshProductionRebuild, true);
assert.equal(cleanupResult.publicScoresFailClosed, true);
target = await readJson('target.json');
assert.equal(target.datasetId, originalTarget.datasetId);
assert.equal(target.productionReferenceAt, originalTarget.productionReferenceAt);
assert.equal(target.candidateGOneTimeReconstruction, undefined);
assert.equal(target.candidateGOneTimeCleanupPendingRebuild.status, 'PENDING_FRESH_PRODUCTION_REBUILD');
assert.equal(target.candidateGOneTimeCleanupPendingRebuild.publicScoresFailClosed, true);
assert.equal(target.coastalParts.evidenceTrust.status, 'VERIFIED_ONLY');
assert.equal(target.coastalParts.scoreAvailability.allZonesActive, false);
assert.equal(target.coastalParts.scoreAvailability.activeZoneCount, 0);
assert.equal(target.coastalParts.scoredPartCount, 0);
assert.equal(target.coastalParts.zones['zone-000'].scoredPartCount, 0);
assert.equal(target.coastalParts.zones['zone-000'].hourly[0].waders.available, false);
assert.equal(target.coastalParts.zones['zone-000'].hourly[0].waders.score, null);
assert.equal(target.coastalParts.zones['zone-000'].hourly[0].beach.available, false);
for (const [partId, part] of Object.entries(target.coastalParts.parts)) {
  const cleaned = part.candidateG.currentState;
  const original = originalTarget.coastalParts.parts[partId].candidateG.currentState;
  assert.equal(cleaned.schemaVersion, CANDIDATE_G_STATE_SCHEMA_VERSION, partId);
  assert.equal(cleaned.transportMemoryReady, false, partId);
  assert.equal(cleaned.transportMemoryStatus, 'WINDOW_INCOMPLETE', partId);
  assert.equal(part.candidateG.transportMemoryReady, false, partId);
  assert.equal(part.candidateG.transportMemoryStatus, 'WINDOW_INCOMPLETE', partId);
  assert.equal(part.candidateG.transportReferenceAt, cleaned.transportReferenceAt, partId);
  assert.equal(part.candidateG.modes.waders.available, false, partId);
  assert.equal(part.candidateG.modes.waders.score, null, partId);
  assert.equal(part.candidateG.modes.waders.reason, 'WINDOW_INCOMPLETE', partId);
  assert.equal(part.current.waders.available, false, partId);
  assert.equal(part.current.waders.score, null, partId);
  assert.equal(part.current.beach.available, false, partId);
  assert.equal(cleaned.mobilisationPotential, original.mobilisationPotential, partId);
  assert.ok(cleaned.transportEvidence.every(item => !isReconstructedTransportEvidence(item)), partId);
  for (const expected of original.transportEvidence) {
    assert.ok(cleaned.transportEvidence.some(item => item.time === expected.time
      && Object.is(item.strength, expected.strength)), `${partId}:${expected.time}`);
  }
}

// Simulate a later normal production where all 1-hour parts have naturally
// rolled past the synthetic rows, while the eight native 3-hour parts still
// retain one marked boundary sample. Cleanup must accept the honest 2.0/2.1
// mix, preserve every newer measured row and warm only the affected suffixes.
await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
const partiallyRolled = await readJson('target.json');
const advancedReference = addHours(targetReference, 27);
partiallyRolled.datasetId = 'fixture-target-partial-rolloff';
partiallyRolled.generatedAt = advancedReference;
partiallyRolled.productionReferenceAt = advancedReference;
for (const [partId, part] of Object.entries(partiallyRolled.coastalParts.parts)) {
  const index = Number(partId.slice('part-'.length));
  const cadence = index < 665 ? 1 : 3;
  const previousState = part.candidateG.currentState;
  const measuredAdditions = series(
    addHours(targetReference, cadence),
    advancedReference,
    cadence,
    index % 2 === 0 ? 0.25 : -0.2,
  );
  const replay = buildBoundedCurrentTransportMemory(
    [...previousState.transportEvidence, ...measuredAdditions],
    {
      ...CURRENT_TRANSPORT_POTENTIAL_RECOMMENDED_RESEARCH_PROFILE,
      referenceTime: advancedReference,
      restartAfterVerifiedTimeGap: true,
    },
  );
  assert.ok(replay.result, partId);
  const reconstructedCount = replay.evidence.filter(isReconstructedTransportEvidence).length;
  part.candidateG.currentState = {
    ...previousState,
    schemaVersion: reconstructedCount > 0
      ? CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION
      : CANDIDATE_G_STATE_SCHEMA_VERSION,
    time: advancedReference,
    transportReferenceAt: advancedReference,
    transportPotential: replay.result.transportPotential,
    outboundEpisodeEffectiveHours: replay.result.outboundEpisodeEffectiveHours,
    transportMemoryReady: replay.memoryReady,
    transportMemoryStatus: replay.status,
    transportMemoryWindowHours: replay.windowHours,
    transportMemoryCoverageHours: replay.coverageHours,
    transportEvidence: replay.evidence,
  };
}
const retainedSynthetic = Object.values(partiallyRolled.coastalParts.parts).flatMap(part =>
  part.candidateG.currentState.transportEvidence.filter(isReconstructedTransportEvidence));
assert.equal(retainedSynthetic.length, 8);
const retainedPartCount = Object.values(partiallyRolled.coastalParts.parts).filter(part =>
  part.candidateG.currentState.transportEvidence.some(isReconstructedTransportEvidence)).length;
assert.equal(retainedPartCount, 8);
const independentMeasuredTrust = {
  status: 'INDEPENDENT_MEASURED_AUDIT',
  calibrationEligible: false,
  source: 'fixture-non-incident-trust',
};
partiallyRolled.coastalParts.parts['part-000'].candidateG.evidenceTrust =
  structuredClone(independentMeasuredTrust);
const partialTrust = {
  ...partiallyRolled.coastalParts.evidenceTrust,
  affectedPartCount: retainedPartCount,
  syntheticSampleCount: retainedSynthetic.length,
  activeUntil: addHours(retainedSynthetic.map(item => item.time).sort().at(-1), 48),
};
partiallyRolled.coastalParts.evidenceTrust = partialTrust;
partiallyRolled.candidateGOneTimeReconstruction = structuredClone(partialTrust);
await writeJson('target.json', partiallyRolled);
const partialCleanup = await rollbackOrCleanupOneTimeGap({
  targetPath, descriptorPath, descriptorSha256: inspected.descriptorSha256, rollbackPath, policyPath,
});
assert.equal(partialCleanup.strategy, 'CAUSAL_INCIDENT_CLEANUP');
assert.equal(partialCleanup.affectedPartCount, 8);
assert.equal(partialCleanup.removedSampleCount, 8);
const partialCleaned = await readJson('target.json');
assert.equal(partialCleaned.datasetId, partiallyRolled.datasetId);
assert.equal(partialCleaned.productionReferenceAt, advancedReference);
assert.equal(partialCleaned.coastalParts.evidenceTrust.status, 'VERIFIED_ONLY');
assert.deepEqual(partialCleaned.coastalParts.parts['part-000'].candidateG.evidenceTrust,
  independentMeasuredTrust);
for (const [partId, part] of Object.entries(partialCleaned.coastalParts.parts)) {
  const cleaned = part.candidateG.currentState;
  assert.equal(cleaned.schemaVersion, CANDIDATE_G_STATE_SCHEMA_VERSION, partId);
  assert.ok(cleaned.transportEvidence.every(item => !isReconstructedTransportEvidence(item)), partId);
  assert.ok(cleaned.transportEvidence.some(item => item.time === advancedReference), partId);
  assert.equal(part.candidateG.modes.waders.available, false, partId);
  assert.equal(part.candidateG.modes.waders.score, null, partId);
  assert.equal(part.candidateG.modes.beach.available, false, partId);
  if (part.current) {
    assert.equal(part.current.waders.available, false, partId);
    assert.equal(part.current.beach.available, false, partId);
  }
  if (Number(partId.slice('part-'.length)) >= 665) {
    assert.equal(cleaned.transportMemoryReady, false, partId);
    assert.equal(cleaned.transportMemoryStatus, 'WINDOW_INCOMPLETE', partId);
  }
}
assert.equal(partialCleaned.coastalParts.scoredPartCount, 0);
assert.ok(Object.values(partialCleaned.coastalParts.zones || {})
  .every(zone => zone.scoredPartCount === 0));

await writeJson('target.json', originalTarget);
await applyOneTimeGap({ ...common, descriptorSha256: inspected.descriptorSha256, rollbackPath });
const reconstructedCheckpointPath = file('reconstructed-checkpoint.json');
await saveContinuationCheckpoint({ sourcePath: targetPath, checkpointPath: reconstructedCheckpointPath });
const reconstructedCheckpoint = JSON.parse(await fs.readFile(reconstructedCheckpointPath, 'utf8'));
assert.equal(reconstructedCheckpoint.schemaVersion, 2);
assert.match(reconstructedCheckpoint.payloadSha256, /^[a-f0-9]{64}$/);

const mixed = await readJson('target.json');
const measuredPartId = 'part-000';
mixed.coastalParts.parts[measuredPartId].candidateG.currentState = structuredClone(
  originalTarget.coastalParts.parts[measuredPartId].candidateG.currentState,
);
mixed.coastalParts.evidenceTrust.affectedPartCount -= 1;
mixed.coastalParts.evidenceTrust.syntheticSampleCount -= 2;
await writeJson('mixed.json', mixed);
const mixedCheckpointPath = file('mixed-checkpoint.json');
await saveContinuationCheckpoint({ sourcePath: file('mixed.json'), checkpointPath: mixedCheckpointPath });
await writeJson('restore-target.json', after);
const restoredMixed = await restoreContinuationCheckpoint({
  targetPath: file('restore-target.json'),
  checkpointPath: mixedCheckpointPath,
  targetReference,
});
assert.equal(restoredMixed.restored, true);
const restored = await readJson('restore-target.json');
assert.equal(restored.coastalParts.parts[measuredPartId].candidateG.currentState.schemaVersion,
  CANDIDATE_G_STATE_SCHEMA_VERSION);
assert.equal(restored.coastalParts.parts['part-001'].candidateG.currentState.schemaVersion,
  CANDIDATE_G_RECONSTRUCTED_STATE_SCHEMA_VERSION);

const tampered = JSON.parse(await fs.readFile(reconstructedCheckpointPath, 'utf8'));
tampered.evidenceTrust.descriptorSha256 = 'b'.repeat(64);
await writeJson('tampered-checkpoint.json', tampered);
await writeJson('restore-target.json', after);
await assert.rejects(
  restoreContinuationCheckpoint({
    targetPath: file('restore-target.json'),
    checkpointPath: file('tampered-checkpoint.json'),
    targetReference,
  }),
  /payload-integriteten/,
);

const replayTampered = structuredClone(reconstructedCheckpoint);
const replayTamperedPartId = 'part-001';
const oldPotential = replayTampered.states[replayTamperedPartId].transportPotential;
replayTampered.states[replayTamperedPartId].transportPotential = oldPotential >= 99
  ? oldPotential - 1
  : oldPotential + 1;
const replayTamperedRows = Object.entries(replayTampered.states)
  .sort(([left], [right]) => left.localeCompare(right));
replayTampered.stateSha256 = rawDigest(replayTamperedRows);
replayTampered.payloadSha256 = rawDigest({
  rows: replayTamperedRows,
  evidenceTrust: replayTampered.evidenceTrust,
});
await writeJson('replay-tampered-checkpoint.json', replayTampered);
await writeJson('restore-target.json', after);
const replayTamperedTargetBytes = await fs.readFile(file('restore-target.json'), 'utf8');
await assert.rejects(
  restoreContinuationCheckpoint({
    targetPath: file('restore-target.json'),
    checkpointPath: file('replay-tampered-checkpoint.json'),
    targetReference,
  }),
  /state kan ikke reproduceres/,
);
assert.equal(await fs.readFile(file('restore-target.json'), 'utf8'), replayTamperedTargetBytes);

const measuredForCheckpoint = structuredClone(originalTarget);
measuredForCheckpoint.coastalParts.evidenceTrust = {
  schemaVersion: 1,
  status: 'VERIFIED_ONLY',
  calibrationEligible: true,
  hardObservedOuttransportEligible: true,
  incidentId: null,
  affectedPartCount: 0,
  syntheticSampleCount: 0,
  activeUntil: null,
};
await writeJson('measured-source.json', measuredForCheckpoint);
const measuredCheckpointPath = file('measured-checkpoint.json');
await saveContinuationCheckpoint({
  sourcePath: file('measured-source.json'), checkpointPath: measuredCheckpointPath,
});
const checkpointMultipleModePath = file('checkpoint-multiple-mode.json');
const checkpointMultipleModeCli = spawnSync(process.execPath, [
  path.resolve('scripts/candidate-g-continuation-checkpoint.mjs'),
  '--source', file('measured-source.json'),
  '--checkpoint', checkpointMultipleModePath,
  '--save',
  '--restore',
], { cwd: process.cwd(), encoding: 'utf8' });
assert.notEqual(checkpointMultipleModeCli.status, 0);
assert.match(checkpointMultipleModeCli.stderr, /præcis én/);
assert.equal(await exists(checkpointMultipleModePath), false);
const legacy = JSON.parse(await fs.readFile(measuredCheckpointPath, 'utf8'));
legacy.schemaVersion = 1;
delete legacy.payloadSha256;
delete legacy.evidenceTrust;
await writeJson('legacy-checkpoint.json', legacy);
await writeJson('restore-target.json', after);
assert.equal((await restoreContinuationCheckpoint({
  targetPath: file('restore-target.json'),
  checkpointPath: file('legacy-checkpoint.json'),
  targetReference,
})).restored, true);

const forbiddenLegacy = structuredClone(reconstructedCheckpoint);
forbiddenLegacy.schemaVersion = 1;
delete forbiddenLegacy.payloadSha256;
delete forbiddenLegacy.evidenceTrust;
await writeJson('forbidden-legacy.json', forbiddenLegacy);
await writeJson('restore-target.json', after);
await assert.rejects(
  restoreContinuationCheckpoint({
    targetPath: file('restore-target.json'),
    checkpointPath: file('forbidden-legacy.json'),
    targetReference,
  }),
  /Legacy Candidate G-checkpoint/,
);

await fs.rm(temp, { recursive: true, force: true });
console.log('One-time Candidate G gap reconstruction: synthetic 210/673 inspect, CAS, rollback, cleanup and checkpoint gates passed.');
