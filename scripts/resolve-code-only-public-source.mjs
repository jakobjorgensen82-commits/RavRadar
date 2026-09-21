import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAVSCORE_KNOWN_PUBLIC_SOURCE_REPAIR_POLICY as REPAIR } from
  './lib/ravscore-known-public-source-repair.mjs';

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DEPLOYMENT_PATTERN = /^pages-[1-9][0-9]*-[1-9][0-9]*$/;
const HEAD_PATTERN = /^[a-f0-9]{40}$/;
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => crypto.createHash('sha256')
  .update(JSON.stringify(canonical(value))).digest('hex');
const same = (left, right) => JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));

function assertCommonCentralSource(current, publicManifest) {
  if (current?.model !== 'integrated'
    || current?.status !== 'INTEGRATED_ACTIVE'
    || current?.pending !== false
    || !Number.isSafeInteger(Number(current?.centralVersion))
    || Number(current.centralVersion) < 1
    || !SHA256_PATTERN.test(String(current?.publicManifestSha256 ?? ''))
    || !SHA256_PATTERN.test(String(current?.activeImplementationClosureSha256 ?? ''))
    || !DEPLOYMENT_PATTERN.test(String(current?.deploymentId ?? ''))
    || !publicManifest || publicManifest.schemaVersion !== 4
    || publicManifest.complete !== true
    || publicManifest.zoneCount !== 210
    || publicManifest.coastalPartCount !== 673
    || !publicManifest.ravScoreModelBinding) {
    throw new Error('Code-only public source is not an exact active integrated deployment');
  }
}

function assertFailedIntegratedMaintenanceEvidence({
  current,
  publicManifest,
  handoff,
  seal,
  targetBinding,
  expectedRunId,
  expectedRunAttempt,
  expectedRepository = process.env.GITHUB_REPOSITORY,
}) {
  if (!handoff || typeof handoff !== 'object' || Array.isArray(handoff)
    || handoff.schemaVersion !== 'ravscore-operational-deploy-handoff-v2'
    || handoff.action !== 'integrated'
    || handoff.legacySourceRequired !== false
    || handoff.privatePayloadIncluded !== false
    || handoff.sourceHead !== seal?.headSha
    || handoff.centralVersion !== Number(current.centralVersion)
    || handoff.checkpointDatasetId !== publicManifest.datasetId
    || handoff.checkpointBuildOutcome !== 'skipped'
    || handoff.checkpointSaveOutcome !== 'skipped'
    || handoff.checkpointPublishOutcome !== 'skipped') {
    throw new Error('Failed integrated maintenance handoff is not an exact public-only source proof');
  }
  if (!seal || typeof seal !== 'object' || Array.isArray(seal)
    || seal.schemaVersion !== 'ravscore-operational-pages-artifact-seal-v1'
    || seal.repository !== expectedRepository
    || seal.runId !== Number(expectedRunId)
    || seal.runAttempt !== Number(expectedRunAttempt)
    || !HEAD_PATTERN.test(String(seal.headSha ?? ''))
    || seal.ref !== 'refs/heads/main'
    || seal.attemptId !== `pages-${seal.runId}-${seal.runAttempt}`
    || seal.artifactName !== 'github-pages'
    || seal.privatePayloadIncluded !== false
    || seal.targetPublicManifestSha256 !== sha256(publicManifest)
    || !SHA256_PATTERN.test(String(seal.targetImplementationClosureSha256 ?? ''))
    || !seal.targetModelBinding
    || !targetBinding) {
    throw new Error('Failed integrated maintenance artifact seal is not an exact public-only source proof');
  }
  if (!same(seal.targetModelBinding, targetBinding)
    || !same(targetBinding, current.modelBinding)
    || !same(publicManifest.ravScoreModelBinding, targetBinding)) {
    throw new Error('Failed integrated maintenance source has a conflicting model binding');
  }
  return Object.freeze({
    schemaVersion: 'ravscore-code-only-public-source-v1',
    status: 'FAILED_INTEGRATED_MAINTENANCE_PUBLIC_SOURCE',
    deploymentId: seal.attemptId,
    implementationClosureSha256: seal.targetImplementationClosureSha256,
    repairId: null,
    sourceHead: seal.headSha,
    publicManifestSha256: seal.targetPublicManifestSha256,
    privatePayloadRead: false,
  });
}

export function resolveCodeOnlyPublicSource({ current, publicManifest } = {}) {
  assertCommonCentralSource(current, publicManifest);
  const observedManifestSha256 = sha256(publicManifest);
  if (observedManifestSha256 === current.publicManifestSha256) {
    if (!same(publicManifest.ravScoreModelBinding, current.modelBinding)) {
      throw new Error('Matching central/public manifest has a conflicting model binding');
    }
    return Object.freeze({
      schemaVersion: 'ravscore-code-only-public-source-v1',
      status: 'CENTRAL_AND_PUBLIC_MATCH',
      deploymentId: current.deploymentId,
      implementationClosureSha256: current.activeImplementationClosureSha256,
      repairId: null,
      sourceHead: current.sourceHead,
      publicManifestSha256: observedManifestSha256,
      privatePayloadRead: false,
    });
  }
  if (Number(current.centralVersion) !== REPAIR.centralVersion
    || current.sourceHead !== REPAIR.centralSourceHead
    || current.deploymentId !== REPAIR.centralDeploymentId
    || current.publicManifestSha256 !== REPAIR.centralPublicManifestSha256
    || current.activeImplementationClosureSha256
      !== REPAIR.centralImplementationClosureSha256
    || sha256(current.modelBinding) !== REPAIR.centralModelBindingSha256
    || observedManifestSha256 !== REPAIR.sourcePublicManifestSha256
    || sha256(publicManifest.ravScoreModelBinding)
      !== REPAIR.sourceModelBindingSha256) {
    throw new Error('Public RavScore source is ahead of central state without an exact repair policy');
  }
  return Object.freeze({
    schemaVersion: 'ravscore-code-only-public-source-v1',
    status: 'KNOWN_PUBLIC_SOURCE_REPAIR',
    deploymentId: REPAIR.sourceDeploymentId,
    implementationClosureSha256: REPAIR.sourceImplementationClosureSha256,
    repairId: REPAIR.id,
    sourceHead: REPAIR.sourceHead,
    publicManifestSha256: observedManifestSha256,
    privatePayloadRead: false,
  });
}

export function resolveFailedIntegratedMaintenancePublicSource({
  current,
  publicManifest,
  handoff,
  seal,
  targetBinding,
  expectedRunId,
  expectedRunAttempt,
  expectedRepository,
} = {}) {
  assertCommonCentralSource(current, publicManifest);
  if (!/^[1-9][0-9]{0,19}$/.test(String(expectedRunId ?? ''))
    || !/^[1-9][0-9]{0,3}$/.test(String(expectedRunAttempt ?? ''))) {
    throw new Error('Failed integrated maintenance recovery requires a valid run and attempt');
  }
  return assertFailedIntegratedMaintenanceEvidence({
    current,
    publicManifest,
    handoff,
    seal,
    targetBinding,
    expectedRunId,
    expectedRunAttempt,
    expectedRepository,
  });
}

function argumentValue(argv, name) {
  const index = argv.indexOf(name);
  if (index < 0 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`Code-only public source resolver requires ${name}`);
  }
  return argv[index + 1];
}

async function atomicWriteJson(file, value) {
  const destination = path.resolve(file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(value)}\n`, { flag: 'wx', mode: 0o600 });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const [current, publicManifest] = await Promise.all([
    fs.readFile(argumentValue(argv, '--current'), 'utf8').then(JSON.parse),
    fs.readFile(argumentValue(argv, '--manifest'), 'utf8').then(JSON.parse),
  ]);
  const recoveryHandoff = argv.includes('--handoff')
    ? await Promise.all([
      fs.readFile(argumentValue(argv, '--handoff'), 'utf8').then(JSON.parse),
      fs.readFile(argumentValue(argv, '--seal'), 'utf8').then(JSON.parse),
      fs.readFile(argumentValue(argv, '--binding'), 'utf8').then(JSON.parse),
    ])
    : null;
  const result = recoveryHandoff
    ? resolveFailedIntegratedMaintenancePublicSource({
      current,
      publicManifest,
      handoff: recoveryHandoff[0],
      seal: recoveryHandoff[1],
      targetBinding: recoveryHandoff[2],
      expectedRunId: argumentValue(argv, '--expected-run-id'),
      expectedRunAttempt: argumentValue(argv, '--expected-run-attempt'),
      expectedRepository: process.env.GITHUB_REPOSITORY,
    })
    : resolveCodeOnlyPublicSource({ current, publicManifest });
  await atomicWriteJson(argumentValue(argv, '--output'), result);
  console.log(`Code-only public source resolved: ${result.status}; private payload read: false.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
