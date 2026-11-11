import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { SOURCE_PRODUCER_AFTER597_PARENT } from './lib/source-producer-after597-parent.mjs';
import { requireSourceProducerOutput } from './lib/source-producer-after597-runtime-family.mjs';
import { readSourceCompletedPrivateRuntimePin } from './completed-private-runtime-admission.mjs';
import { readAutomaticSourcePublicManifest } from './select-automatic-source-saved-weather.mjs';
import { assertSourceIntegratedPublicationPin } from './lib/source-integrated-publication-receipt.mjs';
import { readCompletedPublicPagesOccurrence } from './lib/source-completed-public-pages-occurrence.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import { verifyRavScoreOperationalPagesDeployment } from './verify-ravscore-operational-pages-deployment.mjs';

const run = promisify(execFile);
const sha = /^[a-f0-9]{64}$/;
const same = (left, right) => sha256CanonicalJson(left) === sha256CanonicalJson(right);
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));

export function classifySourcePostPagesCurrent(current, publicManifest) {
  assert(current?.status === 'INTEGRATED_ACTIVE' && current.model === 'integrated'
    && current.pending === false && current.bindingCurrent === true
    && Number.isSafeInteger(current.centralVersion) && current.centralVersion > 0
    && sha.test(current.publicManifestSha256 ?? ''), 'SOURCE_REENTRY_ACTIVE_INVALID');
  assert(publicManifest?.schemaVersion === 4 && publicManifest.complete === true
    && publicManifest.zoneCount === 210 && publicManifest.coastalPartCount === 673
    && same(current.modelBinding, publicManifest.ravScoreModelBinding),
  'SOURCE_REENTRY_PUBLIC_BINDING_INVALID');
  const before = Date.parse(current.productionReferenceAt);
  const after = Date.parse(publicManifest.productionReferenceAt);
  assert(Number.isFinite(before) && Number.isFinite(after), 'SOURCE_REENTRY_REFERENCE_INVALID');
  const publicDigest = sha256CanonicalJson(publicManifest);
  if (current.publicManifestSha256 === publicDigest) {
    assert(before === after && current.datasetId === publicManifest.datasetId,
      'SOURCE_REENTRY_MATCHED_DIGEST_INCONSISTENT');
    return 'NONE';
  }
  assert(after > before && current.datasetId !== publicManifest.datasetId,
    'SOURCE_REENTRY_TARGET_NOT_STRICTLY_NEWER');
  return 'CANDIDATE';
}

export function assertSourcePostPagesResult({ before, after, evidence, expectedHead }) {
  const { manifest, seal } = evidence;
  assert(after.status === 'INTEGRATED_ACTIVE' && after.pending === false
    && after.model === 'integrated' && after.bindingCurrent === true
    && after.centralVersion === before.centralVersion + 1
    && after.datasetId === manifest.datasetId
    && Date.parse(after.productionReferenceAt) === Date.parse(manifest.productionReferenceAt)
    && after.publicManifestSha256 === seal.targetPublicManifestSha256
    && after.activeImplementationClosureSha256 === seal.targetImplementationClosureSha256
    && after.sourceHead === expectedHead && after.deploymentId === seal.attemptId
    && same(before.modelBinding, after.modelBinding), 'SOURCE_REENTRY_CENTRAL_READBACK');
}

async function main(env) {
  const family = SOURCE_PRODUCER_AFTER597_PARENT;
  if (family.binding === null && family.output === null && family.nextRelease === null) return 'NONE';
  requireSourceProducerOutput();
  assert(process.argv.length === 2 && env.GITHUB_WORKFLOW === 'Run current RavRadar weather once'
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_RUN_ATTEMPT === '1' && /^[a-f0-9]{40}$/.test(env.GITHUB_SHA)
    && /^[1-9][0-9]{0,15}$/.test(env.GITHUB_RUN_ID)
    && path.isAbsolute(env.GITHUB_WORKSPACE) && path.isAbsolute(env.RUNNER_TEMP)
    && env.RAVRADAR_OPERATIONAL_WORK === '/tmp/ravradar-operational-reconcile',
  'SOURCE_REENTRY_CALLER');

  const current = await read(path.join(env.RAVRADAR_OPERATIONAL_WORK, 'current.json'));
  if (current.model !== 'integrated' || current.bindingCurrent !== true) return 'NONE';
  const publicManifest = await readAutomaticSourcePublicManifest(env);
  if (classifySourcePostPagesCurrent(current, publicManifest) === 'NONE') return 'NONE';

  const root = path.join(env.RUNNER_TEMP, 'source-integrated-post-pages');
  await fs.mkdir(root, { mode: 0o700 });
  const directory = path.join(root, 'sealed');
  const node = (script, args) => run(process.execPath, [script, ...args], {
    cwd: env.GITHUB_WORKSPACE, timeout: 180_000, maxBuffer: 256 * 1024,
  });
  await node('scripts/protected-operational-reentry-evidence.mjs', [
    '--restore', '--require-unique-public-manifest', '--public-manifest-sha256', sha256CanonicalJson(publicManifest),
    '--repository', env.GITHUB_REPOSITORY, '--directory', directory,
    '--output', path.join(root, 'protected-restore.json'),
  ]);
  const at = name => path.join(directory, name);
  const files = {
    manifest: 'manifest.json', handoff: 'handoff.json', seal: 'pages-artifact-seal.json',
    disposition: 'checkpoint-disposition.json', audit: 'checkpoint-runtime-audit.json',
  };
  const evidence = Object.fromEntries(await Promise.all(Object.entries(files)
    .map(async ([key, file]) => [key, await read(at(file))])));
  const { handoff, manifest, seal } = evidence;
  assert(same(publicManifest, manifest) && seal.repository === env.GITHUB_REPOSITORY
    && seal.headSha === env.GITHUB_SHA && Number(env.GITHUB_RUN_ID) > seal.runId
    && handoff.centralVersion === current.centralVersion
    && same(evidence.audit, await read(at('public-audit.json'))), 'SOURCE_REENTRY_SEALED_TARGET');
  const verifyPair = async () => assertSourceIntegratedPublicationPin({
    ...evidence, livePin: await readSourceCompletedPrivateRuntimePin(),
  });
  await verifyPair();
  await readCompletedPublicPagesOccurrence({
    repository: env.GITHUB_REPOSITORY, currentMainHead: env.GITHUB_SHA,
    artifactSeal: seal, token: env.GH_TOKEN,
  });

  const verification = await verifyRavScoreOperationalPagesDeployment({
    baseUrl: 'https://ravradar.dk', sourceHead: seal.headSha, expectedManifest: manifest,
    expectedModel: 'integrated', expectedBinding: await read(at('target-binding.json')),
    expectedContractText: await fs.readFile(at('target-contract.js'), 'utf8'),
    expectedBundleText: await fs.readFile(at('target-bundle.generated.js'), 'utf8'),
    expectedPublicClosure: await read(at('target-public-closure.json')),
    observationNonce: `source-reentry-${env.GITHUB_RUN_ID}-${seal.runId}`,
  });
  const verificationPath = path.join(root, 'verified-public.json');
  await fs.writeFile(verificationPath, JSON.stringify(verification)+'\n', { flag: 'wx', mode: 0o600 });

  await run('git', ['fetch', '--no-tags', 'origin', '+refs/heads/main:refs/remotes/origin/main'],
    { cwd: env.GITHUB_WORKSPACE, timeout: 30_000, maxBuffer: 128 * 1024 });
  const gitHead = ref => run('git', ['rev-parse', ref], { cwd: env.GITHUB_WORKSPACE, timeout: 5_000 });
  const [local, remote] = await Promise.all([gitHead('HEAD^{commit}'), gitHead('origin/main^{commit}')]);
  assert(local.stdout.trim() === env.GITHUB_SHA && remote.stdout.trim() === env.GITHUB_SHA,
    'SOURCE_REENTRY_MAIN_CHANGED');
  const activePath = path.join(root, 'active-before-cas.json');
  await node('scripts/ravscore-operational-activation.mjs', ['read','--source-producer','--output',activePath]);
  assert(same(await read(activePath), current), 'SOURCE_REENTRY_ACTIVE_MOVED');
  await verifyPair();
  const beforeReseal = await readAutomaticSourcePublicManifest(env, globalThis.fetch, 'before-reseal');
  assert(same(beforeReseal, manifest), 'SOURCE_REENTRY_PUBLIC_MOVED');
  await node('scripts/ravscore-operational-activation.mjs', [
    'integrated-maintenance', '--source-producer', '--expected-version', String(handoff.centralVersion),
    '--manifest', at('manifest.json'), '--audit', at('public-audit.json'), '--verification', verificationPath,
    '--requested-implementation-closure-sha256', seal.targetImplementationClosureSha256,
    '--deployment-id', seal.attemptId, '--output', path.join(root, 'completion.json'),
  ]);
  const result = path.join(root, 'active-after-cas.json');
  await node('scripts/ravscore-operational-activation.mjs', ['read','--source-producer','--output',result]);
  assertSourcePostPagesResult({ before: current, after: await read(result), evidence, expectedHead: env.GITHUB_SHA });
  return 'SOURCE_INTEGRATED_RESEALED';
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try { console.log(await main(process.env)); }
  catch (error) {
    const code = /^SOURCE_[A-Z0-9_]+$/.test(error?.message ?? '') ? error.message : 'SOURCE_REENTRY_PROOF_REFUSED';
    console.error(code);
    process.exitCode = 1;
  }
}
