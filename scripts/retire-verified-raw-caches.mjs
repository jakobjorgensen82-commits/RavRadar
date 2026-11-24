import {execFileSync} from 'node:child_process';
import {lstat, readFile, realpath, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readRawRotationArtifactOnce} from './find-raw-rotation-artifact.mjs';
import {projectRawRotationDecision, requireRawRotationDecision} from './lib/raw-rotation-handoff.mjs';
import {closeRawCacheOverlapFromHandoff} from './lib/verified-raw-cache-rotation.mjs';
import {createProtectedPrivateRuntimeClients, describeCurrentProtectedPrivateProductionRuntime}
  from './protected-private-production-runtime.mjs';
import {createProtectedRavScoreCheckpointVersionRequester, PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY}
  from './protected-ravscore-continuation-checkpoint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = REPOSITORY + '/.github/workflows/run-current-weather-once.yml@refs/heads/main';

function requireScope(ok) {
  if (!ok) throw new Error('RAW_CACHE_ROTATION_SAME_RUN_REFUSED');
}

const KEY = PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;
const VERSION_QUERY = '?document_key=eq.' + encodeURIComponent(KEY) + '&select=document_key,version&limit=2';

function createRawRotationProtectedMetadataReaders() {
  const {documentRequest} = createProtectedPrivateRuntimeClients({storageBackend: 'supabase'});
  const requestVersion = createProtectedRavScoreCheckpointVersionRequester();
  const readProtectedB = async () => {
    let centralVersion;
    const identity = await describeCurrentProtectedPrivateProductionRuntime({request: async (...args) => {
      const rows = await documentRequest(...args);
      centralVersion = Number(rows?.[0]?.version);
      return rows;
    }});
    requireScope(Number.isSafeInteger(centralVersion) && centralVersion > 0);
    return {...identity, centralVersion};
  };
  const readProtectedSVersion = async () => {
    const rows = await requestVersion(VERSION_QUERY);
    requireScope(rows.length === 1 && rows[0].document_key === KEY
      && Number.isSafeInteger(rows[0].version) && rows[0].version > 0);
    return rows[0].version;
  };
  return {readProtectedB, readProtectedSVersion};
}

async function readReceivedFile(parent, name) {
  const directory = path.join(parent, 'ravradar-raw-rotation-received');
  requireScope(await realpath(directory) === directory);
  const file = path.join(directory, name);
  const before = await lstat(file, {bigint: true});
  requireScope(before.isFile() && before.nlink === 1n && before.size > 0n && before.size <= 1024n);
  const bytes = await readFile(file);
  const after = await lstat(file, {bigint: true});
  requireScope(BigInt(bytes.length) === before.size
    && ['dev', 'ino', 'mode', 'size', 'mtimeNs', 'ctimeNs'].every(key => before[key] === after[key]));
  return bytes;
}

async function getScopedJson(route, token) {
  const prefix = '/repos/' + REPOSITORY + '/';
  requireScope(route.startsWith(prefix) && !route.includes('..'));
  const response = await fetch('https://api.github.com' + route, {
    method: 'GET', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8_000),
    headers: {Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10'},
  });
  requireScope(response.ok);
  return response.json();
}

async function main(mode, env) {
  const savedCoverage = mode === '--close-saved-overlap';
  const writeDecision = mode === '--write-decision';
  const requireDecision = mode === '--require-decision';
  const job = savedCoverage ? 'close-dmi-raw-overlap' : writeDecision ? 'retire-dmi-raw-archives' : 'build-and-prepare';
  const scope = {runId: env.GITHUB_RUN_ID, runAttempt: env.GITHUB_RUN_ATTEMPT, sourceHead: env.GITHUB_SHA,
    targetReferenceAt: env.RAVRADAR_PRODUCTION_TARGET_HOUR};
  const number = value => /^[1-9][0-9]*$/.test(value ?? '') && Number.isSafeInteger(Number(value));
  const target = Date.parse(scope.targetReferenceAt);
  requireScope((savedCoverage || writeDecision || requireDecision) && process.platform === 'linux'
    && env.GITHUB_ACTIONS === 'true' && env.RUNNER_ENVIRONMENT === 'github-hosted'
    && env.GITHUB_REPOSITORY === REPOSITORY && env.GITHUB_WORKFLOW_REF === WORKFLOW
    && env.GITHUB_REF === 'refs/heads/main' && env.GITHUB_EVENT_NAME === 'workflow_dispatch'
    && env.GITHUB_ACTOR === 'github-actions[bot]' && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]'
    && env.GITHUB_JOB === job
    && env.RAVRADAR_RAW_BOOTSTRAP_PROOF === 'enforce' && scope.runAttempt === '1'
    && number(scope.runId) && number(env.GITHUB_REPOSITORY_ID)
    && /^[a-f0-9]{40}$/.test(scope.sourceHead ?? '')
    && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(scope.targetReferenceAt ?? '')
    && Number.isFinite(target) && new Date(target).toISOString() === scope.targetReferenceAt.replace(/Z$/, '.000Z')
    && env.GITHUB_WORKSPACE === ROOT && path.isAbsolute(env.RUNNER_TEMP ?? '')
    && await realpath(env.RUNNER_TEMP) === env.RUNNER_TEMP
    && execFileSync('git', ['rev-parse', 'HEAD^{commit}'], {cwd: ROOT, encoding: 'utf8'}).trim() === scope.sourceHead);
  if (requireDecision) {
    const result = await readReceivedFile(env.RUNNER_TEMP, 'decision.json');
    requireRawRotationDecision(result, scope, env.RAW_BOOTSTRAP_PRIVATE_PROOF_SHA256);
    console.log('RAW_CACHE_ROTATION_TWO_COPIES_CONFIRMED');
    return;
  }

  const githubToken = env.GITHUB_TOKEN;
  requireScope(githubToken && env.GITHUB_API_URL === 'https://api.github.com'
    && number(env.RAW_ROTATION_ARTIFACT_ID) && /^sha256:[a-f0-9]{64}$/.test(env.RAW_ROTATION_ARTIFACT_DIGEST ?? ''));
  const bytes = await readReceivedFile(env.RUNNER_TEMP, savedCoverage ? 'coverage.json' : 'handoff.json');
  const getJson = route => getScopedJson(route, githubToken);
  const verifyArtifactProducer = async () => {
    const result = await readRawRotationArtifactOnce({kind: savedCoverage ? 'saved-coverage' : 'proof',
      repositoryId: Number(env.GITHUB_REPOSITORY_ID),
      runId: Number(scope.runId), attempt: 1, head: scope.sourceHead, getJson,
      expectedArtifactId: Number(env.RAW_ROTATION_ARTIFACT_ID), expectedDigest: env.RAW_ROTATION_ARTIFACT_DIGEST});
    requireScope(result.status === 'FOUND');
  };
  const protectedReaders = createRawRotationProtectedMetadataReaders();
  const decision = await closeRawCacheOverlapFromHandoff({bytes, scope, githubToken, getJson,
    verifyArtifactProducer, savedCoverage, ...protectedReaders});
  if (writeDecision) {
    const untrusted = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    const receipt = projectRawRotationDecision(scope, untrusted.privateProofSha256, decision);
    await writeFile(path.join(env.RUNNER_TEMP, 'ravradar-raw-rotation-received', 'decision.json'),
      JSON.stringify(receipt), {mode: 0o600, flag: 'wx'});
  }
  console.log(decision.status === 'READY'
    ? 'RAW_CACHE_ROTATION_TWO_COPIES_CONFIRMED'
    : 'RAW_CACHE_ROTATION_HELD ' + decision.reason);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireScope(process.argv.length === 3);
    await main(process.argv[2], process.env);
  } catch {
    console.error('RAW_CACHE_ROTATION_SAME_RUN_REFUSED');
    process.exitCode = 2;
  }
}
