#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPreparedCandidateGOperationalRollback,
} from './prepare-candidate-g-operational-rollback.mjs';
import {
  ravScoreModelBinding as candidateModelBinding,
} from './rollback-assets/ravscore-model-contract.js';

export const CANDIDATE_G_ROLLBACK_STAGE_SCHEMA =
  'candidate-g-operational-rollback-stage-v1';
export const CANDIDATE_G_ROLLBACK_STAGE_MARKER =
  '.cache/candidate-g-operational-rollback/stage.json';

const OVERLAYS = Object.freeze([
  Object.freeze({
    source: 'scripts/rollback-assets/ravscore-model-contract.js',
    destination: 'js/core/ravscore-model-contract.js',
  }),
  Object.freeze({
    source: 'scripts/rollback-assets/ravscore-model-bundle.generated.js',
    destination: 'js/core/ravscore-model-bundle.generated.js',
  }),
]);

const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const posix = value => value.split(path.sep).join('/');

async function assertRealDirectory(directory, label) {
  let stat;
  try {
    stat = await fs.lstat(directory);
  } catch {
    throw new Error(`${label} does not exist`);
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory`);
  }
  return fs.realpath(directory);
}

function isWithin(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..'
    && !path.isAbsolute(relative));
}

async function assertSafeParent(root, relative) {
  const destination = path.resolve(root, relative);
  if (!isWithin(root, destination) || destination === root) {
    throw new Error(`Candidate G stage destination escapes its root: ${posix(relative)}`);
  }
  const parent = path.dirname(destination);
  await fs.mkdir(parent, { recursive: true });
  const realParent = await fs.realpath(parent);
  if (!isWithin(root, realParent)) {
    throw new Error(`Candidate G stage destination traverses a symlink: ${posix(relative)}`);
  }
  return destination;
}

async function readRegularFile(root, relative, label) {
  const absolute = path.resolve(root, relative);
  if (!isWithin(root, absolute) || absolute === root) {
    throw new Error(`${label} escapes its root`);
  }
  const stat = await fs.lstat(absolute).catch(() => null);
  if (!stat?.isFile() || stat.isSymbolicLink()) throw new Error(`${label} is not a regular file`);
  return fs.readFile(absolute);
}

async function atomicWrite(root, relative, bytes, mode) {
  const destination = await assertSafeParent(root, relative);
  const temporary = `${destination}.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  try {
    await fs.writeFile(temporary, bytes, { flag: 'wx', mode });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
  return destination;
}

export async function installCandidateGRollbackStage({
  stageRoot,
  repositoryRoot,
  candidateFull,
  plan,
  expectedSourceHead,
  expectedDatasetId,
} = {}) {
  const repository = await assertRealDirectory(path.resolve(repositoryRoot ?? ''),
    'Candidate G repository root');
  const stage = await assertRealDirectory(path.resolve(stageRoot ?? ''),
    'Candidate G isolated stage root');
  if (isWithin(repository, stage) || isWithin(stage, repository)) {
    throw new Error('Candidate G stage must be isolated outside the repository worktree');
  }
  assertPreparedCandidateGOperationalRollback(candidateFull, plan, {
    expectedSourceHead,
    expectedDatasetId,
  });

  const markerPath = await assertSafeParent(stage, CANDIDATE_G_ROLLBACK_STAGE_MARKER);
  await fs.rm(markerPath, { force: true });
  const installed = [];
  const conditionsText = `${JSON.stringify(candidateFull)}\n`;
  await atomicWrite(stage, 'data/live/conditions.json', conditionsText, 0o600);
  installed.push(Object.freeze({
    path: 'data/live/conditions.json',
    sha256: sha256(conditionsText),
    privacyClass: 'PRIVATE_STAGE_INPUT',
  }));

  for (const overlay of OVERLAYS) {
    const bytes = await readRegularFile(repository, overlay.source,
      `Candidate G overlay ${overlay.source}`);
    const destination = await atomicWrite(stage, overlay.destination, bytes, 0o644);
    const installedBytes = await fs.readFile(destination);
    if (!installedBytes.equals(bytes)) {
      throw new Error(`Candidate G overlay verification failed for ${overlay.destination}`);
    }
    installed.push(Object.freeze({
      path: overlay.destination,
      sha256: sha256(bytes),
      privacyClass: 'PUBLIC_MODEL_IMPLEMENTATION',
    }));
  }

  const marker = Object.freeze({
    schemaVersion: CANDIDATE_G_ROLLBACK_STAGE_SCHEMA,
    kind: 'CANDIDATE_G_OPERATIONAL_ROLLBACK_ISOLATED_STAGE',
    mode: plan.mode,
    sourceHead: plan.sourceHead,
    datasetId: plan.datasetId,
    productionReferenceAt: plan.productionReferenceAt,
    planSha256: plan.planSha256,
    candidateFullSha256: plan.candidateFullSha256,
    privateBundleContentSha256: plan.privateBundleContentSha256,
    sourceImplementationClosureSha256: plan.sourceImplementationClosureSha256,
    requestedImplementationClosureSha256: plan.requestedImplementationClosureSha256,
    modelBinding: candidateModelBinding(),
    automaticActivationAllowed: false,
    schedulerActivationAllowed: false,
    publicArtifactReady: false,
    installed,
  });
  await atomicWrite(stage, CANDIDATE_G_ROLLBACK_STAGE_MARKER,
    `${JSON.stringify(marker)}\n`, 0o600);
  return marker;
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`Unknown or valueless Candidate G stage option: ${key}`);
    }
    options[key.slice(2)] = value;
    index += 1;
  }
  for (const key of ['stage-root', 'repository-root', 'candidate-full', 'plan',
    'expected-source-head', 'expected-dataset-id']) {
    if (!options[key]) throw new Error(`Candidate G stage installation requires --${key}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const [candidateFull, plan] = await Promise.all([
    fs.readFile(options['candidate-full'], 'utf8').then(JSON.parse),
    fs.readFile(options.plan, 'utf8').then(JSON.parse),
  ]).catch(() => { throw new Error('Candidate G stage inputs cannot be parsed'); });
  const result = await installCandidateGRollbackStage({
    stageRoot: options['stage-root'],
    repositoryRoot: options['repository-root'],
    candidateFull,
    plan,
    expectedSourceHead: options['expected-source-head'],
    expectedDatasetId: options['expected-dataset-id'],
  });
  console.log(JSON.stringify({
    status: 'candidate-g-isolated-stage-installed',
    mode: result.mode,
    datasetId: result.datasetId,
    installedFileCount: result.installed.length,
    privatePayloadLogged: false,
  }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`Candidate G isolated stage installation failed closed: ${error.message}`);
    process.exitCode = 1;
  });
}
