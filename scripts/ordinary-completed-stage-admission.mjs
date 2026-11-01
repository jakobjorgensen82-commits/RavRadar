// Resume an UNPUBLISHED ordinary result through the existing completed-runtime
// branch. A source comparison or a JSON receipt alone is never admission.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { downloadOrdinaryCompletedStageArtifact } from './ordinary-completed-stage-artifact.mjs';
import { assertOrdinaryCompletedStageSource, assertOrdinaryCompletedStageCommittedSource }
  from './ordinary-completed-stage-source.mjs';
import { assertOrdinaryCompletedStageLineage } from './ordinary-completed-stage-lineage.mjs';
import { readCompletedPrivateRuntimePin, assertCompletedRuntimePublicIdentity }
  from './completed-private-runtime-admission.mjs';
import { openStagedPrivateProductionRuntime } from './staged-private-production-runtime.mjs';
import { verifyPrivateProductionRuntimeBundle, restorePrivateProductionRuntimeBundle,
  canonicalPrivateRuntimeJson } from './private-production-runtime-bundle.mjs';
import { installRestoredPrivateRuntime } from './private-production-runtime-workflow.mjs';
import { readEstablishedNativeCurrentOrigin } from './lib/established-native-current-origin.mjs';
import { saveRavScoreContinuationCheckpoint } from './ravscore-continuation-checkpoint.mjs';
import { restoreProtectedRavScoreContinuationCheckpoint, createProtectedRavScoreCheckpointRequester }
  from './protected-ravscore-continuation-checkpoint.mjs';
import { createProtectedPrivateRuntimeClients, publishProtectedPrivateProductionRuntime,
  validateProtectedPrivateRuntimePointer, PROTECTED_PRIVATE_RUNTIME_POLICY }
  from './protected-private-production-runtime.mjs';
import { PRIVATE_CONDITIONS_MAX_BYTES } from './lib/bounded-json-writer.mjs';
import { ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';
import { ravScoreModelBinding as candidateBinding } from './rollback-assets/ravscore-model-contract.js';

const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const digest = value => sha(canonicalPrivateRuntimeJson(value));
const same = (left, right) => canonicalPrivateRuntimeJson(left) === canonicalPrivateRuntimeJson(right);
const fail = code => { throw Object.assign(new Error(code), { code }); };
const require = (value, code) => { if (!value) fail(code); };
const HOUR = /^\d{4}-\d\d-\d\dT\d\d:00:00Z$/;
const SHA = /^[a-f0-9]{64}$/;
const POLICY = 'scripts/lib/dmi-marine-zone-exclusions.json';
const RECEIPT = 'ordinary-completed-stage-admission.json';
const SOURCE = 'ordinary-completed-stage-source.json';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function assertOrdinaryCompletedStageRequest(env = process.env, { pin = false } = {}) {
  const match = /^([1-9][0-9]*)-([1-9][0-9]*)-([a-f0-9]{40})$/.exec(env.COMPLETED_STAGE_SOURCE ?? '');
  require(match && match.slice(1, 3).every(value => Number.isSafeInteger(Number(value))
    && String(Number(value)) === value), 'ORDINARY_STAGE_REQUEST_LOCATOR');
  const target = pin ? env.CHECKPOINT_TARGET_HOUR : env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  require(HOUR.test(target ?? '') && Number.isFinite(Date.parse(target))
    && new Date(target).toISOString().replace('.000Z', 'Z') === target,
  'ORDINARY_STAGE_REQUEST_TARGET');
  require(env.COMPLETED_PRIVATE_RUNTIME === 'true' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_RUN_ATTEMPT === '1'
    && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')
    && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY ?? ''),
  'ORDINARY_STAGE_REQUEST_WORKFLOW');
  for (const key of ['QUICK_CONFIRMATION', 'CHECKPOINT_ONLY', 'EPOCH_BOOTSTRAP', 'EPOCH_REENTRY',
    'NATIVE_IDENTITY_RECOVERY', 'EXTENDED_PROVIDER_BOOTSTRAP', 'PRODUCE_HANDOFF', 'CURRENT_FAMILY_COLD_START'])
    require(env[key] === 'false', 'ORDINARY_STAGE_REQUEST_MIXED_MODE');
  require(env.QUICK_PROGRESS_SOURCE === '' && (pin || env.CHECKPOINT_TARGET_HOUR === ''),
    'ORDINARY_STAGE_REQUEST_MIXED_MODE');
  return Object.freeze({ repository: env.GITHUB_REPOSITORY, runId: match[1], runAttempt: match[2],
    sourceHead: match[3], target });
}

async function bytes(file, maximum) {
  const stat = await fs.lstat(file);
  require(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= maximum,
    'ORDINARY_STAGE_FILE_BOUNDARY');
  const value = await fs.readFile(file);
  require(value.length === stat.size, 'ORDINARY_STAGE_FILE_CHANGED');
  return value;
}
const json = async (file, maximum = 16 * 1024 * 1024) => JSON.parse(await bytes(file, maximum));
const conditions = file => json(file, PRIVATE_CONDITIONS_MAX_BYTES);
function paths(env) {
  require(path.isAbsolute(env.GITHUB_WORKSPACE ?? '') && path.isAbsolute(env.RUNNER_TEMP ?? ''),
    'ORDINARY_STAGE_WORKFLOW_PATHS');
  require(path.resolve(env.GITHUB_WORKSPACE) === ROOT, 'ORDINARY_STAGE_WORKFLOW_SOURCE_ROOT');
  return { root: path.resolve(env.GITHUB_WORKSPACE),
    receiptPath: path.join(env.RUNNER_TEMP, RECEIPT), sourcePath: path.join(env.RUNNER_TEMP, SOURCE),
    expectedPath: path.join(env.GITHUB_WORKSPACE, '.cache/private-production-runtime-expected.json'),
    checkpointPath: path.join(env.GITHUB_WORKSPACE, '.cache/ravscore-continuation-checkpoint/checkpoint.json'),
    activePath: path.join(env.RUNNER_TEMP, 'completed-runtime-active-source.json') };
}
function source(input, env, clean) {
  const comparison = { root: paths(env).root, producerHead: input.sourceHead, consumerHead: env.GITHUB_SHA };
  return (clean ? assertOrdinaryCompletedStageSource : assertOrdinaryCompletedStageCommittedSource)(comparison);
}
async function assertSource(input, env) {
  const recorded = await json(paths(env).sourcePath, 64 * 1024);
  const actual = source(input, env, false);
  require(same(recorded, actual), 'ORDINARY_STAGE_SOURCE_CHANGED');
  return actual;
}
async function assertParent(receipt) {
  const live = await readCompletedPrivateRuntimePin();
  require(live.pin === receipt.parentPin && same(live.descriptor, receipt.parentDescriptor),
    'ORDINARY_STAGE_PARENT_POINTER_CHANGED');
  return live;
}
async function normalParentCheckpoint(receipt, own) {
  const checkpoint = path.join(own, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
  const result = await restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: checkpoint,
    targetReference: receipt.parentDescriptor.productionReferenceAt,
    request: createProtectedRavScoreCheckpointRequester() });
  require(result.restored === true, 'ORDINARY_STAGE_PARENT_CHECKPOINT_MISSING');
  const value = await json(checkpoint);
  require(digest(value) === receipt.parentCheckpointSha256, 'ORDINARY_STAGE_PARENT_CHECKPOINT_CHANGED');
}
export async function materializeOrdinaryStageCandidate(root) {
  const directory = path.join(root, '.cache');
  await fs.mkdir(directory, { recursive: true });
  require(!(await fs.lstat(directory)).isSymbolicLink(), 'ORDINARY_STAGE_CANDIDATE_PATH');
  const candidate = path.join(directory, 'dmi-candidate-progress.json');
  const candidateStat = await fs.lstat(candidate).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  const bulk = path.join(root, 'data/live/dmi-bulk-cache.json');
  if (candidateStat) {
    require(candidateStat.isFile() && !candidateStat.isSymbolicLink(), 'ORDINARY_STAGE_CANDIDATE_CHANGED');
    const [selected, canonical] = await Promise.all([bytes(candidate, 350_000_000), bytes(bulk, 350_000_000)]);
    require(selected.equals(canonical), 'ORDINARY_STAGE_CANDIDATE_CHANGED');
  } else await fs.copyFile(bulk, candidate, fs.constants.COPYFILE_EXCL);
}
function installedFileMaximum(file) {
  // Only these exact normal producer roles exceed the old raw-file bound.
  // The compressed archive limit is a different contract.
  if (file.id === 'full-conditions' && file.relativePath === 'data/live/conditions.json')
    return PRIVATE_CONDITIONS_MAX_BYTES;
  if ((file.id === 'dmi-forecast-cache' && file.relativePath === 'data/live/dmi-forecast-cache.json')
    || (file.id === 'weather-component-inputs' && file.relativePath === '.cache/weather-component-inputs.pack'))
    return PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes;
  return 350_000_000;
}
const sameInstalledIdentity = (left, right) => right.isFile() && !right.isSymbolicLink()
  && ['dev', 'ino', 'size', 'mtimeNs', 'ctimeNs'].every(key => left[key] === right[key]);
async function installed(root, files) {
  for (const file of files) {
    const destination = path.resolve(root, file.relativePath), relative = path.relative(root, destination);
    require(relative && !relative.startsWith('..') && !path.isAbsolute(relative), 'ORDINARY_STAGE_INSTALL_PATH');
    let prefix = root;
    for (const segment of relative.split(path.sep)) {
      prefix = path.join(prefix, segment);
      require(!(await fs.lstat(prefix)).isSymbolicLink(), 'ORDINARY_STAGE_INSTALL_PATH');
    }
    const before = await fs.lstat(destination, { bigint: true });
    require(before.isFile() && !before.isSymbolicLink() && before.size > 0n
      && before.size <= BigInt(installedFileMaximum(file)), 'ORDINARY_STAGE_FILE_BOUNDARY');
    require(Number.isSafeInteger(file.bytes) && file.bytes > 0 && before.size === BigInt(file.bytes),
      'ORDINARY_STAGE_INSTALLED_BYTES_CHANGED');
    const handle = await fs.open(destination, 'r');
    let checked = false;
    try {
      require(sameInstalledIdentity(before, await handle.stat({ bigint: true })),
        'ORDINARY_STAGE_INSTALLED_IDENTITY_CHANGED');
      const hash = crypto.createHash('sha256'), block = Buffer.alloc(64 * 1024);
      let count = 0;
      for (;;) {
        const { bytesRead } = await handle.read(block, 0, block.length, null);
        if (!bytesRead) break;
        count += bytesRead;
        require(count <= file.bytes, 'ORDINARY_STAGE_INSTALLED_BYTES_CHANGED');
        hash.update(block.subarray(0, bytesRead));
      }
      require(count === file.bytes && hash.digest('hex') === file.sha256,
        'ORDINARY_STAGE_INSTALLED_BYTES_CHANGED');
      require(sameInstalledIdentity(before, await handle.stat({ bigint: true }))
        && sameInstalledIdentity(before, await fs.lstat(destination, { bigint: true })),
      'ORDINARY_STAGE_INSTALLED_IDENTITY_CHANGED');
      checked = true;
    } finally {
      // A close failure must not replace an earlier failure, including a falsy throw.
      try { await handle.close(); }
      catch (error) { if (checked) throw error; }
    }
  }
}
async function ownedWork() {
  const parent = await fs.realpath(os.tmpdir());
  const work = await fs.mkdtemp(path.join(parent, 'rr-ordinary-stage-consumer-'));
  return { work, parent };
}
async function removeOwned({ work, parent }) {
  const stat = await fs.lstat(work);
  require(path.dirname(work) === parent && path.basename(work).startsWith('rr-ordinary-stage-consumer-')
    && stat.isDirectory() && !stat.isSymbolicLink(), 'ORDINARY_STAGE_CLEANUP_OWNERSHIP');
  await fs.rm(work, { recursive: true, force: false });
}

export async function admitOrdinaryCompletedStage(env = process.env) {
  const request = assertOrdinaryCompletedStageRequest(env), p = paths(env);
  await assertSource(request, env);
  const expected = await json(p.expectedPath), active = await json(p.activePath);
  require(active.model === 'integrated' && active.status === 'INTEGRATED_ACTIVE' && active.pending === false
    && typeof active.calibrationEligible === 'boolean', 'ORDINARY_STAGE_OPERATIONAL_SOURCE');
  const parent = await readCompletedPrivateRuntimePin();
  require(SHA.test(env.COMPLETED_PRIVATE_RUNTIME_PIN ?? '') && parent.pin === env.COMPLETED_PRIVATE_RUNTIME_PIN,
    'ORDINARY_STAGE_PARENT_POINTER_CHANGED');
  const central = await json(path.join(p.root, 'data/live/coastal-parts-v2.json'));
  // This real reader authenticates old B/S, working H0, central registry and
  // origin in its private lexical authority. Never replace it with a receipt.
  require(await readEstablishedNativeCurrentOrigin(central), 'ORDINARY_STAGE_BASELINE_ORIGIN_REQUIRED');
  const baseline = await verifyPrivateProductionRuntimeBundle({ privateRoot: env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
    bundlePath: env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE, repositoryRoot: p.root, expected });
  require(baseline.bundleContentSha256 === parent.descriptor.bundleContentSha256,
    'ORDINARY_STAGE_BASELINE_B_CHANGED');
  const oldConditions = await conditions(path.join(env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE,
    'payload/data/live/conditions.json'));
  const oldS = await json(p.checkpointPath);
  let downloaded, own, completed = false;
  try {
    downloaded = await downloadOrdinaryCompletedStageArtifact({ repository: request.repository,
      runId: request.runId, runAttempt: request.runAttempt, sourceHead: request.sourceHead, token: env.GH_TOKEN });
    own = await ownedWork();
    const bundle = path.join(own.work, 'bundle');
    await openStagedPrivateProductionRuntime({ inputPath: downloaded.sealedPath,
      privateRoot: own.work, bundlePath: bundle, repositoryRoot: p.root, expected,
      ...downloaded.identity, masterSecret: env.STAGED_PRIVATE_BUILD_MASTER_SECRET });
    const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot: own.work, bundlePath: bundle,
      repositoryRoot: p.root, expected });
    const raw = await bytes(path.join(bundle, 'payload/data/live/conditions.json'), PRIVATE_CONDITIONS_MAX_BYTES);
    const nextConditions = JSON.parse(raw);
    const ownerPolicyGitBlob = execFileSync('git', ['-C', p.root, 'rev-parse', `HEAD:${POLICY}`],
      { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
    assertOrdinaryCompletedStageLineage({ conditions: nextConditions, conditionsPayloadBytes: raw,
      newBManifest: verified.manifest, originalAADIdentity: downloaded.identity,
      baselineBDescriptor: parent.descriptor, baselineConditions: oldConditions, baselineCheckpoint: oldS,
      centralContract: central, currentModelBinding: ravScoreModelBinding(), currentCandidateBinding: candidateBinding(),
      currentContractHashes: expected.contractHashes, ownerPolicyGitBlob,
      targetReferenceAt: new Date(request.target).toISOString() });
    require(Date.parse(verified.manifest.productionReferenceAt) > Date.parse(active.productionReferenceAt)
      && verified.manifest.datasetId !== active.datasetId, 'ORDINARY_STAGE_ALREADY_PUBLIC');
    const baseReceipt = { parentPin: parent.pin, parentDescriptor: parent.descriptor,
      parentCheckpointSha256: digest(oldS) };
    await assertParent(baseReceipt);
    await normalParentCheckpoint(baseReceipt, own.work);
    const restored = path.join(own.work, 'restored');
    await restorePrivateProductionRuntimeBundle({ privateRoot: own.work, bundlePath: bundle,
      outputPath: restored, repositoryRoot: p.root, expected,
      targetReferenceAt: new Date(request.target).toISOString(),
      minimumReferenceAt: expected.minimumReferenceAt, minimumGeneratedAt: expected.minimumGeneratedAt });
    await installRestoredPrivateRuntime({ restoredRoot: restored, repositoryRoot: p.root });
    // The ordinary create-spec selects this same canonical bulk value. Do not
    // reuse an unrelated working candidate left by a former provider stage.
    await materializeOrdinaryStageCandidate(p.root);
    const derived = path.join(own.work, 'child-checkpoint.json');
    await saveRavScoreContinuationCheckpoint({ repositoryRoot: p.root,
      sourcePath: path.join(p.root, 'data/live/conditions.json'), checkpointPath: derived });
    const childS = await json(derived);
    await fs.copyFile(derived, p.checkpointPath);
    await installed(p.root, verified.manifest.files);
    const receipt = { schemaVersion: 1, kind: 'ORDINARY_UNPUBLISHED_COMPLETED_STAGE_ADMISSION',
      ...baseReceipt, originalIdentity: downloaded.identity, artifact: downloaded.artifact,
      sealedPath: downloaded.sealedPath, sealedBytes: downloaded.sealedBytes, sealedSha256: downloaded.sealedSha256,
      datasetId: verified.manifest.datasetId, productionReferenceAt: verified.manifest.productionReferenceAt,
      generatedAt: verified.manifest.generatedAt, bundleContentSha256: verified.bundleContentSha256,
      originalManifestSha256: digest(verified.manifest), files: verified.manifest.files,
      checkpointSha256: digest(childS), activeSha256: digest(active), centralSha256: digest(central),
      consumerHead: env.GITHUB_SHA, providerRequestsPerformed: false, scoringPerformed: false };
    await fs.writeFile(p.receiptPath, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
    completed = true;
    return receipt;
  } finally {
    if (own) await removeOwned(own);
    // On success the authenticated original ciphertext remains private until
    // the normal upload step saves its byte-identical transport copy.
    if (!completed && downloaded) {
      const parent = await fs.realpath(os.tmpdir()), directory = downloaded.privateDirectory;
      const stat = await fs.lstat(directory);
      require(path.dirname(directory) === parent && path.basename(directory).startsWith('rr-ordinary-completed-stage-')
        && stat.isDirectory() && !stat.isSymbolicLink(), 'ORDINARY_STAGE_CLEANUP_OWNERSHIP');
      await fs.rm(directory, { recursive: true, force: false });
    }
  }
}

export async function verifyOrdinaryCompletedStage(env = process.env, { rebuilt = false } = {}) {
  const request = assertOrdinaryCompletedStageRequest(env), p = paths(env);
  await assertSource(request, env);
  const receipt = await json(p.receiptPath, 256 * 1024);
  require(receipt.kind === 'ORDINARY_UNPUBLISHED_COMPLETED_STAGE_ADMISSION'
    && receipt.consumerHead === env.GITHUB_SHA
    && same(receipt.originalIdentity, { repository: request.repository, runId: request.runId,
      runAttempt: request.runAttempt, sourceHead: request.sourceHead })
    && receipt.productionReferenceAt === new Date(request.target).toISOString()
    && Date.parse(receipt.artifact.expiresAt) > Date.now(), 'ORDINARY_STAGE_ADMISSION_IDENTITY');
  await assertParent(receipt);
  const own = await ownedWork();
  try { await normalParentCheckpoint(receipt, own.work); }
  finally { await removeOwned(own); }
  require(digest(await json(p.activePath)) === receipt.activeSha256
    && digest(await json(path.join(p.root, 'data/live/coastal-parts-v2.json'))) === receipt.centralSha256,
  'ORDINARY_STAGE_CONFIGURATION_CHANGED');
  await installed(p.root, receipt.files);
  require(digest(await json(p.checkpointPath)) === receipt.checkpointSha256, 'ORDINARY_STAGE_CHILD_S_CHANGED');
  if (rebuilt) {
    const verified = await verifyPrivateProductionRuntimeBundle({ privateRoot: env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
      bundlePath: env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE, repositoryRoot: p.root, expected: await json(p.expectedPath) });
    require(digest(verified.manifest) === receipt.originalManifestSha256
      && verified.bundleContentSha256 === receipt.bundleContentSha256, 'ORDINARY_STAGE_REBUILT_B_CHANGED');
  }
  return receipt;
}

// Bind the publisher's ACTUAL first read and its subsequent CAS to the same
// authenticated parent. A separate earlier read followed by an unbound normal
// publish is insufficient, even while workflow concurrency is held.
export function bindOrdinaryStagePublicationRequest(request, { parentPin, parentDescriptor }) {
  let initialRead = false;
  let version;
  return async (query, options = {}, phase) => {
    if (phase === 'insert') fail('ORDINARY_STAGE_PARENT_INSERT_FORBIDDEN');
    if (phase === 'compare-and-swap') {
      require(initialRead && query.includes(`&version=eq.${version}&`), 'ORDINARY_STAGE_PARENT_CAS_CHANGED');
      const next = JSON.parse(options.body);
      require(same(next.payload.previous, parentDescriptor), 'ORDINARY_STAGE_PARENT_CAS_CHANGED');
    }
    const rows = await request(query, options, phase);
    if (phase === 'read' && !initialRead) {
      require(Array.isArray(rows) && rows.length === 1
        && rows[0].document_key === PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey,
      'ORDINARY_STAGE_PARENT_PUBLISH_READ');
      version = Number(rows[0].version);
      const pointer = validateProtectedPrivateRuntimePointer(rows[0].payload);
      require(Number.isSafeInteger(version) && version > 0
        && same(pointer.current, parentDescriptor)
        && digest({ descriptor: pointer.current, pointerVersion: version }) === parentPin,
      'ORDINARY_STAGE_PARENT_PUBLISH_READ');
      initialRead = true;
    }
    return rows;
  };
}

async function main() {
  const env = process.env, operation = process.argv[2];
  const request = assertOrdinaryCompletedStageRequest(env, { pin: operation === 'pin' });
  const p = paths(env);
  if (operation === 'source') {
    await fs.writeFile(p.sourcePath, JSON.stringify(source(request, env, true)) + '\n', { flag: 'wx', mode: 0o600 });
  } else if (operation === 'request') {
    await assertSource(request, env);
  } else if (operation === 'pin') {
    const pinned = await readCompletedPrivateRuntimePin();
    require(Date.parse(request.target) > Date.parse(pinned.descriptor.productionReferenceAt),
      'ORDINARY_STAGE_TARGET_NOT_NEWER_THAN_PARENT');
    await fs.appendFile(env.GITHUB_OUTPUT, `target_hour=${request.target}\ncompleted_private_runtime_pin=${pinned.pin}\n`);
  } else if (operation === 'admit') await admitOrdinaryCompletedStage(env);
  else if (operation === 'target') {
    const receipt = await verifyOrdinaryCompletedStage(env);
    assertCompletedRuntimePublicIdentity(receipt, await json(path.join(p.root, 'data/live/manifest.json')));
  } else if (operation === 'before-publish') {
    await verifyOrdinaryCompletedStage(env, { rebuilt: true });
  } else if (operation === 'preserve-cipher') {
    const receipt = await verifyOrdinaryCompletedStage(env, { rebuilt: true });
    const cipher = await bytes(receipt.sealedPath, 350_100_000);
    require(cipher.length === receipt.sealedBytes && sha(cipher) === receipt.sealedSha256,
      'ORDINARY_STAGE_ORIGINAL_CIPHERTEXT_CHANGED');
    const output = path.join(env.RUNNER_TEMP, 'ravradar-private-build-stage/sealed.bin');
    await fs.mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
    await fs.writeFile(output, cipher, { flag: 'wx', mode: 0o600 });
    console.log('ORIGINAL_CIPHERTEXT_PRESERVED_NOT_NEW_GENERATION');
  } else if (operation === 'publish') {
    const receipt = await verifyOrdinaryCompletedStage(env, { rebuilt: true });
    const clients = createProtectedPrivateRuntimeClients();
    await publishProtectedPrivateProductionRuntime({ privateRoot: env.RAVRADAR_PRIVATE_RUNTIME_ROOT,
      bundlePath: env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE, repositoryRoot: p.root,
      expected: await json(p.expectedPath), sourceHead: receipt.originalIdentity.sourceHead,
      request: bindOrdinaryStagePublicationRequest(clients.documentRequest, receipt), storage: clients.storage });
  } else fail('ORDINARY_STAGE_UNKNOWN_OPERATION');
  console.log('ORDINARY_COMPLETED_STAGE_' + operation.toUpperCase().replaceAll('-', '_') + '_PASS');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // No raw GCM, server payload, checkpoint, vector, user information or key.
    let fixedCode;
    for (let value = error, depth = 0; value && depth < 5; value = value.cause, depth++) {
      if (typeof value.code === 'string' && /^ORDINARY_STAGE_[A-Z_]+$/.test(value.code)) {
        fixedCode = value.code; break;
      }
    }
    console.error(fixedCode ?? 'ORDINARY_STAGE_NORMAL_BOUNDARY_REFUSED');
    process.exitCode = 1;
  });
}
