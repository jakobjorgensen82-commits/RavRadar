#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertExactPublicRavScoreModelBindingShape } from '../js/core/ravscore-public-profile-contract.js';

export const RAVSCORE_OPERATIONAL_PAGES_RECOVERY_SCHEMA =
  'ravscore-operational-pages-recovery-classification-v1';
export const RAVSCORE_OPERATIONAL_PAGES_PENDING_IDENTITY_SCHEMA =
  'ravscore-operational-pages-pending-identity-v1';
export const RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_SEAL_SCHEMA =
  'ravscore-operational-pages-artifact-seal-v1';
export const RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_EVIDENCE_SCHEMA =
  'ravscore-operational-pages-artifact-evidence-v1';
export const RAVSCORE_OPERATIONAL_PAGES_TERMINAL_EVIDENCE_SCHEMA =
  'ravscore-operational-pages-terminal-evidence-v2';
export const RAVSCORE_OPERATIONAL_PAGES_PUBLIC_OBSERVATION_SCHEMA =
  'ravscore-operational-pages-public-observation-v1';

export const RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS = Object.freeze({
  SAFE_SOURCE_ABORT: 'SAFE_SOURCE_ABORT',
  EXACT_TARGET_REDEPLOY: 'EXACT_TARGET_REDEPLOY',
  TARGET_RECONCILE: 'TARGET_RECONCILE',
  FAIL_CLOSED: 'FAIL_CLOSED'
});

const IDENTITY_FIELDS = Object.freeze([
  'repository',
  'runId',
  'runAttempt',
  'headSha',
  'ref',
  'attemptId'
]);
const PENDING_FIELDS = Object.freeze([
  'schemaVersion',
  ...IDENTITY_FIELDS,
  'requestedAt',
  'datasetId',
  'productionReferenceAt',
  'sourcePublicManifestSha256',
  'requestedPublicManifestSha256',
  'requestedImplementationClosureSha256',
  'requestedModelBinding',
  'privatePayloadIncluded'
]);
const ARTIFACT_SEAL_FIELDS = Object.freeze([
  'schemaVersion',
  ...IDENTITY_FIELDS,
  'artifactId',
  'artifactName',
  'artifactDigestSha256',
  'artifactSizeBytes',
  'targetPublicManifestSha256',
  'targetImplementationClosureSha256',
  'targetModelBinding',
  'createdAt',
  'privatePayloadIncluded'
]);
const ARTIFACT_EVIDENCE_FIELDS = Object.freeze([
  'schemaVersion',
  ...IDENTITY_FIELDS,
  'artifactId',
  'artifactName',
  'artifactDigestSha256',
  'artifactSizeBytes',
  'downloadedZipSha256',
  'zipHashedBeforeExtraction',
  'expired',
  'checkedAt',
  'privatePayloadRead'
]);
const TERMINAL_EVIDENCE_FIELDS = Object.freeze([
  'schemaVersion',
  ...IDENTITY_FIELDS,
  'status',
  'runStatus',
  'runConclusion',
  'deployStepConclusion',
  'pagesRequestAccepted',
  'checkedAt',
  'evidenceSource',
  'privatePayloadRead'
]);
const PUBLIC_OBSERVATION_FIELDS = Object.freeze([
  'schemaVersion',
  ...IDENTITY_FIELDS,
  'publicManifestSha256',
  'observedAt',
  'observationNonce',
  'privatePayloadRead'
]);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} skal være et objekt.`);
  }
}

function assertExactKeys(value, fields, label) {
  assertObject(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...fields].sort();
  if (actual.length !== expected.length || actual.some((field, index) => field !== expected[index])) {
    throw new Error(`${label} har et ukendt eller manglende felt.`);
  }
}

function assertNonEmptyString(value, label, maximumLength = 200) {
  if (typeof value !== 'string' || value.length < 1 || value.length > maximumLength) {
    throw new Error(`${label} er ugyldig.`);
  }
  return value;
}

function assertPositiveSafeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} skal være et positivt sikkert heltal.`);
  }
  return value;
}

function assertSha256(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} skal være en kanonisk SHA-256.`);
  }
  return value;
}

export function normalizeArtifactDigestSha256(value, label = 'Artifact-digest') {
  if (typeof value !== 'string') {
    throw new Error(`${label} skal være en GitHub artifact SHA-256.`);
  }
  const normalized = value.startsWith('sha256:') ? value.slice('sha256:'.length) : value;
  return assertSha256(normalized, label);
}

function assertHeadSha(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) {
    throw new Error(`${label} skal være en kanonisk Git commit-SHA.`);
  }
  return value;
}

function assertCanonicalUtc(value, label) {
  assertNonEmptyString(value, label, 40);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error(`${label} skal være canonical UTC.`);
  }
  return value;
}

function assertRepository(value, label) {
  assertNonEmptyString(value, label, 201);
  const parts = value.split('/');
  if (
    parts.length !== 2 ||
    parts.some(
      (part) =>
        !/^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,98}[A-Za-z0-9])?$/.test(part) ||
        part.includes('..')
    )
  ) {
    throw new Error(`${label} skal være et kanonisk owner/repository-navn.`);
  }
  return value;
}

function assertWorkflowIdentity(value, label) {
  assertRepository(value.repository, `${label}.repository`);
  assertPositiveSafeInteger(value.runId, `${label}.runId`);
  assertPositiveSafeInteger(value.runAttempt, `${label}.runAttempt`);
  assertHeadSha(value.headSha, `${label}.headSha`);
  if (value.ref !== 'refs/heads/main') {
    throw new Error(`${label}.ref skal være refs/heads/main.`);
  }
  if (value.attemptId !== `pages-${value.runId}-${value.runAttempt}`) {
    throw new Error(`${label}.attemptId matcher ikke run/attempt.`);
  }
}

function assertSameWorkflowIdentity(value, expected, label) {
  assertWorkflowIdentity(value, label);
  for (const field of IDENTITY_FIELDS) {
    if (value[field] !== expected[field]) {
      throw new Error(`${label}.${field} matcher ikke den forseglede workflowidentitet.`);
    }
  }
}

function sortForCanonicalJson(value) {
  if (Array.isArray(value)) return value.map(sortForCanonicalJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortForCanonicalJson(value[key])])
    );
  }
  return value;
}

export function sha256CanonicalJson(value) {
  return createHash('sha256')
    .update(JSON.stringify(sortForCanonicalJson(value)))
    .digest('hex');
}

function sameCanonicalJson(left, right) {
  return sha256CanonicalJson(left) === sha256CanonicalJson(right);
}

function assertExactModelBinding(value, expected, label) {
  assertExactPublicRavScoreModelBindingShape(value, { label });
  if (expected && !sameCanonicalJson(value, expected)) {
    throw new Error(`${label} matcher ikke den forseglede target-modelbinding.`);
  }
}

function assertPendingIdentity(pending) {
  assertExactKeys(pending, PENDING_FIELDS, 'Pending-identiteten');
  if (pending.schemaVersion !== RAVSCORE_OPERATIONAL_PAGES_PENDING_IDENTITY_SCHEMA) {
    throw new Error('Pending-identiteten har forkert schemaVersion.');
  }
  assertWorkflowIdentity(pending, 'Pending-identiteten');
  assertCanonicalUtc(pending.requestedAt, 'Pending-identiteten.requestedAt');
  assertNonEmptyString(pending.datasetId, 'Pending-identiteten.datasetId', 160);
  assertCanonicalUtc(
    pending.productionReferenceAt,
    'Pending-identiteten.productionReferenceAt'
  );
  assertSha256(
    pending.sourcePublicManifestSha256,
    'Pending-identiteten.sourcePublicManifestSha256'
  );
  assertSha256(
    pending.requestedPublicManifestSha256,
    'Pending-identiteten.requestedPublicManifestSha256'
  );
  if (pending.sourcePublicManifestSha256 === pending.requestedPublicManifestSha256) {
    throw new Error('Source- og target-manifesthash må ikke være identiske.');
  }
  assertSha256(
    pending.requestedImplementationClosureSha256,
    'Pending-identiteten.requestedImplementationClosureSha256'
  );
  assertExactModelBinding(
    pending.requestedModelBinding,
    null,
    'Pending-identiteten.requestedModelBinding'
  );
  if (pending.privatePayloadIncluded !== false) {
    throw new Error('Pending-identiteten må ikke indeholde private payloads.');
  }
}

function assertTargetManifest(targetManifest, pending) {
  assertObject(targetManifest, 'Target-manifestet');
  if (targetManifest.schemaVersion !== 4) {
    throw new Error('Target-manifestet skal bruge den numeriske manifestkontrakt schemaVersion=4.');
  }
  if (targetManifest.complete !== true || targetManifest.zoneCount !== 210) {
    throw new Error('Target-manifestet er ikke komplet for 210 zoner.');
  }
  if (targetManifest.coastalPartCount !== 673) {
    throw new Error('Target-manifestet er ikke komplet for 673 kystdele.');
  }
  if (
    targetManifest.datasetId !== pending.datasetId ||
    targetManifest.productionReferenceAt !== pending.productionReferenceAt
  ) {
    throw new Error('Target-manifestets dataset/reference matcher ikke pending-identiteten.');
  }
  assertExactModelBinding(
    targetManifest.ravScoreModelBinding,
    pending.requestedModelBinding,
    'Target-manifestet.ravScoreModelBinding'
  );
  assertObject(targetManifest.ravScoreRuntime, 'Target-manifestet.ravScoreRuntime');
  assertExactModelBinding(
    targetManifest.ravScoreRuntime.modelBinding,
    pending.requestedModelBinding,
    'Target-manifestet.ravScoreRuntime.modelBinding'
  );
  const manifestSha256 = sha256CanonicalJson(targetManifest);
  if (manifestSha256 !== pending.requestedPublicManifestSha256) {
    throw new Error('Target-manifestets kanoniske hash matcher ikke requested target.');
  }
  return manifestSha256;
}

function assertArtifactSeal(seal, pending, targetManifestSha256) {
  assertExactKeys(seal, ARTIFACT_SEAL_FIELDS, 'Artifact-sealet');
  if (seal.schemaVersion !== RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_SEAL_SCHEMA) {
    throw new Error('Artifact-sealet har forkert schemaVersion.');
  }
  assertSameWorkflowIdentity(seal, pending, 'Artifact-sealet');
  assertPositiveSafeInteger(seal.artifactId, 'Artifact-sealet.artifactId');
  if (seal.artifactName !== 'github-pages') {
    throw new Error('Artifact-sealet skal pege på github-pages.');
  }
  normalizeArtifactDigestSha256(
    seal.artifactDigestSha256,
    'Artifact-sealet.artifactDigestSha256'
  );
  assertPositiveSafeInteger(seal.artifactSizeBytes, 'Artifact-sealet.artifactSizeBytes');
  if (seal.targetPublicManifestSha256 !== targetManifestSha256) {
    throw new Error('Artifact-sealets target-manifesthash matcher ikke requested target.');
  }
  if (
    seal.targetImplementationClosureSha256 !==
    pending.requestedImplementationClosureSha256
  ) {
    throw new Error('Artifact-sealets implementation-closure matcher ikke requested target.');
  }
  assertExactModelBinding(
    seal.targetModelBinding,
    pending.requestedModelBinding,
    'Artifact-sealet.targetModelBinding'
  );
  assertCanonicalUtc(seal.createdAt, 'Artifact-sealet.createdAt');
  if (Date.parse(seal.createdAt) > Date.parse(pending.requestedAt)) {
    throw new Error('Artifact-sealet skal være oprettet senest før activation-forsøget.');
  }
  if (seal.privatePayloadIncluded !== false) {
    throw new Error('Artifact-sealet må ikke indeholde private payloads.');
  }
}

function assertArtifactEvidence(evidence, seal, pending) {
  assertExactKeys(evidence, ARTIFACT_EVIDENCE_FIELDS, 'Artifact-evidensen');
  if (evidence.schemaVersion !== RAVSCORE_OPERATIONAL_PAGES_ARTIFACT_EVIDENCE_SCHEMA) {
    throw new Error('Artifact-evidensen har forkert schemaVersion.');
  }
  assertSameWorkflowIdentity(evidence, pending, 'Artifact-evidensen');
  if (
    evidence.artifactId !== seal.artifactId ||
    evidence.artifactName !== seal.artifactName ||
    evidence.artifactSizeBytes !== seal.artifactSizeBytes
  ) {
    throw new Error('Det bevarede artifact matcher ikke artifact-sealet.');
  }
  const observedDigestSha256 = normalizeArtifactDigestSha256(
    evidence.artifactDigestSha256,
    'Artifact-evidensen.artifactDigestSha256'
  );
  const sealedDigestSha256 = normalizeArtifactDigestSha256(
    seal.artifactDigestSha256,
    'Artifact-sealet.artifactDigestSha256'
  );
  const downloadedZipSha256 = assertSha256(
    evidence.downloadedZipSha256,
    'Artifact-evidensen.downloadedZipSha256'
  );
  if (
    observedDigestSha256 !== sealedDigestSha256 ||
    downloadedZipSha256 !== sealedDigestSha256
  ) {
    throw new Error('De downloadede ZIP-bytes matcher ikke artifact-sealets digest.');
  }
  if (evidence.zipHashedBeforeExtraction !== true) {
    throw new Error('Artifact-ZIP skal hashes før udpakning.');
  }
  if (evidence.expired !== false) {
    throw new Error('Det forseglede target-artifact mangler eller er udløbet.');
  }
  assertCanonicalUtc(evidence.checkedAt, 'Artifact-evidensen.checkedAt');
  if (Date.parse(evidence.checkedAt) < Date.parse(seal.createdAt)) {
    throw new Error('Artifact-evidensen er ældre end artifact-sealet.');
  }
  if (evidence.privatePayloadRead !== false) {
    throw new Error('Artifact-evidensen må ikke læse private payloads.');
  }
}

function assertTerminalEvidence(evidence, pending) {
  assertExactKeys(evidence, TERMINAL_EVIDENCE_FIELDS, 'Terminal-evidensen');
  if (evidence.schemaVersion !== RAVSCORE_OPERATIONAL_PAGES_TERMINAL_EVIDENCE_SCHEMA) {
    throw new Error('Terminal-evidensen har forkert schemaVersion.');
  }
  assertSameWorkflowIdentity(evidence, pending, 'Terminal-evidensen');
  if (!['NOT_STARTED', 'AMBIGUOUS'].includes(evidence.status)) {
    throw new Error('Terminal-evidensen har en ikke-understøttet status.');
  }
  if (evidence.runStatus !== 'completed') {
    throw new Error('Originalkørslen er ikke terminal endnu.');
  }
  if (
    ![
      'success',
      'failure',
      'cancelled',
      'timed_out',
      'action_required',
      'stale',
      'neutral',
      'skipped'
    ].includes(evidence.runConclusion)
  ) {
    throw new Error('Terminal-evidensen har en ukendt run conclusion.');
  }
  if (!['success', 'failure', 'cancelled', 'skipped', null].includes(evidence.deployStepConclusion)) {
    throw new Error('Terminal-evidensen har en ukendt deploy-step conclusion.');
  }
  if (![true, false, null].includes(evidence.pagesRequestAccepted)) {
    throw new Error('Terminal-evidensen har ugyldig pagesRequestAccepted.');
  }
  if (
    evidence.status === 'NOT_STARTED' &&
    (evidence.deployStepConclusion !== 'skipped' || evidence.pagesRequestAccepted !== false)
  ) {
    throw new Error('NOT_STARTED er ikke bevist af skipped deploy og pagesRequestAccepted=false.');
  }
  if (evidence.status === 'AMBIGUOUS' && evidence.deployStepConclusion === 'skipped') {
    throw new Error('Skipped deploy må kun klassificeres som bevist NOT_STARTED.');
  }
  assertCanonicalUtc(evidence.checkedAt, 'Terminal-evidensen.checkedAt');
  if (Date.parse(evidence.checkedAt) < Date.parse(pending.requestedAt)) {
    throw new Error('Terminal-evidensen er ældre end activation-forsøget.');
  }
  if (evidence.evidenceSource !== 'github-actions-pages-terminal-readback') {
    throw new Error('Terminal-evidensen har en ukendt evidenskilde.');
  }
  if (evidence.privatePayloadRead !== false) {
    throw new Error('Terminal-evidensen må ikke læse private payloads.');
  }
}

function assertAndClassifyObservations(observations, pending, terminalEvidence) {
  if (!Array.isArray(observations) || observations.length < 2 || observations.length > 12) {
    throw new Error('Der kræves mellem 2 og 12 offentlige observationer.');
  }
  const seenNonces = new Set();
  let previousObservedAt = null;
  return observations.map((observation, index) => {
    const label = `Offentlig observation ${index + 1}`;
    assertExactKeys(observation, PUBLIC_OBSERVATION_FIELDS, label);
    if (observation.schemaVersion !== RAVSCORE_OPERATIONAL_PAGES_PUBLIC_OBSERVATION_SCHEMA) {
      throw new Error(`${label} har forkert schemaVersion.`);
    }
    assertSameWorkflowIdentity(observation, pending, label);
    assertSha256(observation.publicManifestSha256, `${label}.publicManifestSha256`);
    assertCanonicalUtc(observation.observedAt, `${label}.observedAt`);
    const observedAt = Date.parse(observation.observedAt);
    if (observedAt <= Date.parse(terminalEvidence.checkedAt)) {
      throw new Error(`${label} skal være observeret efter terminal-evidensen.`);
    }
    if (previousObservedAt !== null && observedAt - previousObservedAt < 1000) {
      throw new Error('Offentlige observationer skal være ordnet og mindst ét sekund adskilt.');
    }
    previousObservedAt = observedAt;
    assertNonEmptyString(observation.observationNonce, `${label}.observationNonce`, 160);
    if (!/^[A-Za-z0-9._:-]+$/.test(observation.observationNonce)) {
      throw new Error(`${label}.observationNonce er ikke kanonisk.`);
    }
    if (seenNonces.has(observation.observationNonce)) {
      throw new Error('Offentlige observationer skal have forskellige nonces.');
    }
    seenNonces.add(observation.observationNonce);
    if (observation.privatePayloadRead !== false) {
      throw new Error(`${label} må ikke læse private payloads.`);
    }
    if (observation.publicManifestSha256 === pending.sourcePublicManifestSha256) {
      return 'source';
    }
    if (observation.publicManifestSha256 === pending.requestedPublicManifestSha256) {
      return 'target';
    }
    return 'third';
  });
}

function makeResult(action, reasonCode, pending, seal, observationCount) {
  return Object.freeze({
    schemaVersion: RAVSCORE_OPERATIONAL_PAGES_RECOVERY_SCHEMA,
    action,
    reasonCode,
    ...Object.fromEntries(IDENTITY_FIELDS.map((field) => [field, pending[field]])),
    artifactId: seal.artifactId,
    artifactDigestSha256: normalizeArtifactDigestSha256(seal.artifactDigestSha256),
    targetPublicManifestSha256: pending.requestedPublicManifestSha256,
    targetImplementationClosureSha256: pending.requestedImplementationClosureSha256,
    observationCount,
    centralMutationAllowed:
      action === RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.SAFE_SOURCE_ABORT ||
      action === RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.TARGET_RECONCILE,
    exactTargetRedeployAllowed:
      action === RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.EXACT_TARGET_REDEPLOY,
    privatePayloadRead: false
  });
}

export function classifyRavScoreOperationalPagesRecovery({
  pending,
  artifactSeal,
  artifactEvidence,
  terminalEvidence,
  observations,
  targetManifest
}) {
  assertPendingIdentity(pending);
  const targetManifestSha256 = assertTargetManifest(targetManifest, pending);
  assertArtifactSeal(artifactSeal, pending, targetManifestSha256);
  assertArtifactEvidence(artifactEvidence, artifactSeal, pending);
  assertTerminalEvidence(terminalEvidence, pending);
  const endpoints = assertAndClassifyObservations(observations, pending, terminalEvidence);

  if (terminalEvidence.runConclusion === 'success') {
    return makeResult(
      RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED,
      'CONTROLLER_PENDING_AFTER_SUCCESSFUL_RUN',
      pending,
      artifactSeal,
      endpoints.length
    );
  }

  if (endpoints.includes('third')) {
    return makeResult(
      RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED,
      'THIRD_PUBLIC_MANIFEST',
      pending,
      artifactSeal,
      endpoints.length
    );
  }

  const firstTargetIndex = endpoints.indexOf('target');
  if (firstTargetIndex !== -1) {
    const targetTail = endpoints.slice(firstTargetIndex);
    const stableTargetTail =
      targetTail.length >= 2 && targetTail.every((endpoint) => endpoint === 'target');
    if (!stableTargetTail) {
      return makeResult(
        RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED,
        'UNSTABLE_OR_REVERSED_PUBLIC_TARGET',
        pending,
        artifactSeal,
        endpoints.length
      );
    }
    return makeResult(
      RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.TARGET_RECONCILE,
      'STABLE_EXACT_TARGET',
      pending,
      artifactSeal,
      endpoints.length
    );
  }

  if (!endpoints.every((endpoint) => endpoint === 'source')) {
    return makeResult(
      RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED,
      'UNKNOWN_PUBLIC_ENDPOINT_STATE',
      pending,
      artifactSeal,
      endpoints.length
    );
  }

  if (terminalEvidence.status === 'NOT_STARTED') {
    return makeResult(
      RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.SAFE_SOURCE_ABORT,
      'STABLE_SOURCE_AND_PROVEN_NOT_STARTED',
      pending,
      artifactSeal,
      endpoints.length
    );
  }

  return makeResult(
    RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.EXACT_TARGET_REDEPLOY,
    'STABLE_SOURCE_AND_AMBIGUOUS_DEPLOYMENT',
    pending,
    artifactSeal,
    endpoints.length
  );
}

function parseArgs(argv) {
  const allowed = new Set([
    '--pending',
    '--artifact-seal',
    '--artifact-evidence',
    '--terminal-evidence',
    '--observations',
    '--target-manifest',
    '--output'
  ]);
  const args = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(key) || !value || value.startsWith('--')) {
      throw new Error('Ugyldige CLI-argumenter til Pages-recoveryhelperen.');
    }
    args[key.slice(2)] = value;
  }
  if (Object.keys(args).length !== allowed.size) {
    throw new Error('Alle CLI-inputfiler og --output er obligatoriske.');
  }
  return args;
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(path.resolve(filePath), 'utf8'));
  } catch {
    throw new Error(`${label} kunne ikke læses som JSON.`);
  }
}

async function writeJsonAtomic(filePath, value) {
  const absolutePath = path.resolve(filePath);
  const temporaryPath = `${absolutePath}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx'
  });
  await rename(temporaryPath, absolutePath);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = classifyRavScoreOperationalPagesRecovery({
    pending: await readJson(args.pending, 'Pending-identiteten'),
    artifactSeal: await readJson(args['artifact-seal'], 'Artifact-sealet'),
    artifactEvidence: await readJson(args['artifact-evidence'], 'Artifact-evidensen'),
    terminalEvidence: await readJson(args['terminal-evidence'], 'Terminal-evidensen'),
    observations: await readJson(args.observations, 'De offentlige observationer'),
    targetManifest: await readJson(args['target-manifest'], 'Target-manifestet')
  });
  await writeJsonAtomic(args.output, result);
  console.log(`Pages-recovery klassificeret som ${result.action}.`);
  if (result.action === RAVSCORE_OPERATIONAL_PAGES_RECOVERY_ACTIONS.FAIL_CLOSED) {
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error(`Pages-recovery stoppede sikkert: ${error.message}`);
    process.exitCode = 1;
  });
}
