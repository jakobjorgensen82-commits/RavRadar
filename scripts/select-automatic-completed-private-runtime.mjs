import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readCompletedPrivateRuntimePin } from './completed-private-runtime-admission.mjs';
import { createProtectedPrivateRuntimeClients } from './protected-private-production-runtime.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import {
  completedRuntimeOperationalSource, operationalResolvedBindingCurrent,
  RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY, RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY,
} from './ravscore-operational-activation.mjs';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { classifyOrdinaryPagesContinuation } from './lib/ordinary-completed-pages-route.mjs';
import { readOrdinaryPagesCancellation } from './lib/ordinary-pages-cancellation.mjs';

const repo = 'jakobjorgensen82-commits/RavRadar';
const workflow = 'run-current-weather-once.yml';
const pagesJob = 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact';
const buildJob = 'Build and prepare weather production through reusable workflow / build-and-prepare';
const sha = /^[a-f0-9]{64}$/;
const headSha = /^[a-f0-9]{40}$/;
const positive = value => Number.isSafeInteger(value) && value > 0;
const runShell = promisify(execFile);
const booleanModes = ['current_family_cold_start', 'completed_private_runtime', 'quick_confirmation',
  'weather_state_epoch_bootstrap', 'weather_state_epoch_checkpoint_reentry', 'native_sampling_identity_original_recovery'];
const stringModes = ['completed_stage_source', 'quick_progress_source', 'checkpoint_target_hour', 'weather_state_epoch_archive_key',
  'weather_state_epoch_archive_catalog_sha256', 'weather_state_epoch_raw_cache_key'];

export function assertOrdinaryPagesSelectorRequest(env) {
  const inputs = JSON.parse(env.RAVRADAR_AUTOMATIC_COMPLETED_INPUTS);
  assert(inputs && Object.getPrototypeOf(inputs) === Object.prototype, 'PAGES_AUTO_INPUTS');
  const known = new Set([...booleanModes, ...stringModes]);
  assert(Object.keys(inputs).every(key => known.has(key)), 'PAGES_AUTO_UNKNOWN_INPUT');
  assert(booleanModes.every(key => !Object.hasOwn(inputs, key) || inputs[key] === false)
    && stringModes.every(key => !Object.hasOwn(inputs, key) || inputs[key] === ''), 'PAGES_AUTO_SPECIAL_MODE');
  const id = Number(env.GITHUB_RUN_ID);
  assert(env.GITHUB_REPOSITORY === repo && env.GITHUB_REF === 'refs/heads/main'
    && env.GITHUB_WORKFLOW === 'Run current RavRadar weather once'
    && env.GITHUB_EVENT_NAME === 'workflow_dispatch' && env.GITHUB_RUN_ATTEMPT === '1'
    && env.GITHUB_ACTOR === 'github-actions[bot]' && env.GITHUB_TRIGGERING_ACTOR === 'github-actions[bot]'
    && env.RAVRADAR_AUTOMATIC_COMPLETED_REENTRY_ACTION === 'NONE'
    && headSha.test(env.GITHUB_SHA ?? '') && positive(id) && String(id) === env.GITHUB_RUN_ID,
  'PAGES_AUTO_WRITER_SCOPE');
  return { consumerRunId: id, head: env.GITHUB_SHA };
}

function one(rows, code) {
  assert(Array.isArray(rows) && rows.length === 1, code);
  return rows[0];
}

function list(data, field, limit = 100) {
  const rows = data?.[field];
  assert(Array.isArray(rows) && rows.length === data.total_count && rows.length <= limit
    && rows.every(row => positive(row?.id)) && new Set(rows.map(row => row.id)).size === rows.length,
  'PAGES_AUTO_INCOMPLETE_LIST');
  return rows;
}

export function exactPriorProducer(runs, { consumerRunId, head, saved }) {
  const generatedAt = Date.parse(saved.generatedAt);
  assert(Number.isFinite(generatedAt) && saved.sourceHead === head, 'PAGES_AUTO_PRODUCER_BINDING');
  return one(runs.filter(run => run.id < consumerRunId && run.run_attempt === 1
    && run.repository?.full_name === repo && run.head_repository?.full_name === repo
    && run.repository.id === run.head_repository.id && run.head_sha === head && run.head_branch === 'main'
    && run.event === 'workflow_dispatch' && run.path === '.github/workflows/' + workflow
    && run.actor?.login === 'github-actions[bot]' && run.status === 'completed' && run.conclusion === 'failure'
    && Date.parse(run.run_started_at) <= generatedAt && generatedAt <= Date.parse(run.updated_at)),
  'PAGES_AUTO_PRODUCER_NOT_EXACT');
}

async function fixedPublicManifest(run) {
  const url = new URL('https://ravradar.dk/data/live/manifest.json');
  url.searchParams.set('pages-reentry', String(run));
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { 'Cache-Control': 'no-cache' } });
  assert(response.status === 200 && !response.redirected && response.url === url.href, 'PAGES_AUTO_PUBLIC_HTTP');
  return JSON.parse(await readBoundedPublicManifest(response, 512 * 1024));
}

function githubReader(token) {
  assert(typeof token === 'string' && /^\S{1,4096}$/.test(token), 'PAGES_AUTO_TOKEN');
  const signal = AbortSignal.timeout(30_000);
  return async route => {
    const r = await fetch('https://api.github.com/repos/' + repo + route, { redirect: 'error', signal,
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache' } });
    assert(r.status === 200 && !/rel="?next(?=[";,\s]|$)/i.test(r.headers.get('link') ?? ''), 'PAGES_AUTO_GITHUB_HTTP');
    return JSON.parse(await readBoundedPublicManifest(r, 1024 * 1024));
  };
}

async function readExactHandoffArchive({ run, read, token }) {
  const name = 'ravscore-operational-handoff-' + run.id + '-1';
  const artifactsRoute = '/actions/runs/' + run.id + '/artifacts?per_page=100';
  const getArtifact = async () => one(list(await read(artifactsRoute), 'artifacts').filter(x => x.name === name), 'PAGES_AUTO_HANDOFF_COUNT');
  const art = await getArtifact();
  assert(art.expired === false && positive(art.size_in_bytes) && art.size_in_bytes <= 128 * 1024
    && /^sha256:[a-f0-9]{64}$/.test(art.digest ?? '')
    && art.workflow_run?.id === run.id && art.workflow_run.head_sha === run.head_sha
    && art.workflow_run.repository_id === run.repository.id && art.workflow_run.head_repository_id === run.repository.id,
  'PAGES_AUTO_HANDOFF_ID');
  const root = await fs.realpath(os.tmpdir());
  const dir = await fs.mkdtemp(path.join(root, 'rr-pages-cancel-handoff-'));
  assert(path.dirname(dir) === root, 'PAGES_AUTO_HANDOFF_DESTINATION');
  try {
    await runShell('gh', ['run', 'download', String(run.id), '--repo', repo, '--name', name, '--dir', dir], {
      env: { PATH: process.env.PATH, GH_TOKEN: token, GH_PROMPT_DISABLED: '1' },
      timeout: 25_000, maxBuffer: 64 * 1024,
    });
    const latest = await getArtifact();
    for (const field of ['id', 'name', 'digest', 'size_in_bytes', 'expired', 'updated_at'])
      assert.equal(latest[field], art[field], 'PAGES_AUTO_HANDOFF_CHANGED');
    const read = async file => {
      const full = path.join(dir, file);
      const stat = await fs.lstat(full);
      assert(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 512 * 1024, 'PAGES_AUTO_HANDOFF_FILE');
      return JSON.parse(await fs.readFile(full, 'utf8'));
    };
    const [handoff, seal, targetManifest] = await Promise.all([
      read('handoff.json'), read('pages-artifact-seal.json'), read('manifest.json'),
    ]);
    assert(handoff.schemaVersion === 'ravscore-operational-deploy-handoff-v2' && handoff.sourceHead === run.head_sha
      && handoff.action === 'integrated' && handoff.legacySourceRequired === false
      && handoff.checkpointPublishOutcome === 'success' && handoff.privatePayloadIncluded === false,
    'PAGES_AUTO_HANDOFF_SCOPE');
    return { seal, targetManifest, targetManifestSha256: sha256CanonicalJson(targetManifest) };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function ordinaryPredecessors(runs, { consumerRunId, head }) {
  return runs.filter(run => positive(run.id) && run.id < consumerRunId && run.run_attempt === 1
    && run.repository?.full_name === repo && run.head_repository?.full_name === repo
    && run.repository.id === run.head_repository.id && run.head_sha === head && run.head_branch === 'main'
    && run.event === 'workflow_dispatch' && run.path === '.github/workflows/' + workflow
    && run.actor?.login === 'github-actions[bot]' && run.status === 'completed')
    .sort((left, right) => right.id - left.id);
}

export async function previousOrdinaryHadPagesFailure(read, context) {
  const created = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const route = '/actions/workflows/' + workflow + '/runs?branch=main&event=workflow_dispatch&status=completed&head_sha='
    + context.head + '&per_page=12&created=' + encodeURIComponent('>=' + created);
  const predecessors = ordinaryPredecessors(list(await read(route), 'workflow_runs', 12), context);
  for (const previous of predecessors) {
    const jobs = list(await read('/actions/runs/' + previous.id + '/attempts/1/jobs?per_page=100'), 'jobs');
    const pages = jobs.filter(job => job.name === pagesJob);
    assert(pages.length <= 1, 'PAGES_AUTO_PRIOR_JOB_AMBIGUOUS');
    const job = pages[0];
    if (!job || job.conclusion === 'skipped') continue;
    const deploy = one(job.steps?.filter(step => step.name === 'Deploy to GitHub Pages'), 'PAGES_AUTO_PRIOR_DEPLOY_STEP');
    assert(job.status === 'completed' && deploy.status === 'completed', 'PAGES_AUTO_PRIOR_DEPLOY_INCOMPLETE');
    if (deploy.conclusion === 'skipped') continue;
    if (deploy.conclusion === 'success') return false;
    assert(previous.conclusion === 'failure' && job.conclusion === 'failure'
      && deploy.conclusion === 'failure', 'PAGES_AUTO_PRIOR_DEPLOY_UNKNOWN');
    return true;
  }
  return false;
}

async function findCancellation({ read, token, saved, context }) {
  const created = new Date(Date.parse(saved.generatedAt) - 24 * 60 * 60 * 1000).toISOString();
  const path = '/actions/workflows/' + workflow + '/runs?branch=main&event=workflow_dispatch&status=completed&head_sha='
    + context.head + '&per_page=12&created=' + encodeURIComponent('>=' + created);
  const run = exactPriorProducer(list(await read(path), 'workflow_runs', 12), { ...context, saved });
  const jobs = list(await read('/actions/runs/' + run.id + '/attempts/1/jobs?per_page=100'), 'jobs');
  const build = one(jobs.filter(job => job.name === buildJob), 'PAGES_AUTO_BUILD_COUNT');
  const passed = name => one(build.steps.filter(step => step.name === name), 'PAGES_AUTO_BUILD_STEP').conclusion === 'success';
  assert(build.status === 'completed' && build.conclusion === 'success'
    && passed('Update central weather cache') && passed('Refuse loss of previously valid public weather on identical coastal hours')
    && passed('Publish bounded private runtime with one protected rollback generation')
    && passed('Publish atomic RavScore checkpoint to protected admin storage'), 'PAGES_AUTO_BUILD_NOT_COMPLETE');
  const job = one(jobs.filter(job => job.name === pagesJob), 'PAGES_AUTO_JOB_COUNT');
  const evidence = await readExactHandoffArchive({ run, read, token });
  const proof = await readOrdinaryPagesCancellation({ repository: repo, currentMainHead: context.head,
    artifactSeal: evidence.seal, jobId: job.id, token });
  return { ...evidence, cancelled: { ...proof, kind: 'PAGES_DEPLOYMENT_CANCELLED_CONFIRMED', headSha: proof.sourceHead } };
}

export async function selectAutomaticCompletedPrivateRuntime(env, {
  readPin, readPublic, readActive, readEvidence,
}) {
  const context = assertOrdinaryPagesSelectorRequest(env);
  const [publicManifest, originalPin, active] = await Promise.all([readPublic(context.consumerRunId), readPin(), readActive()]);
  const saved = originalPin.descriptor;
  const publicManifestSha256 = sha256CanonicalJson(publicManifest);
  const scope = { ...context, publicManifest, publicManifestSha256, active, saved };
  const first = classifyOrdinaryPagesContinuation(scope);
  if (first.route === 'ordinary') return { mode: 'FETCH' };
  const outcome = classifyOrdinaryPagesContinuation({ ...scope, ...await readEvidence(saved, context) });
  assert.equal(outcome.route, 'resume-completed', 'PAGES_AUTO_NO_SAFE_CONTINUATION');
  const [current, publicAgain, activeAgain] = await Promise.all([readPin(), readPublic(context.consumerRunId), readActive()]);
  assert.deepEqual(current, originalPin, 'PAGES_AUTO_POINTER_CHANGED');
  assert.deepEqual(activeAgain, active, 'PAGES_AUTO_ACTIVE_CHANGED');
  assert.equal(sha256CanonicalJson(publicAgain), publicManifestSha256, 'PAGES_AUTO_PUBLIC_CHANGED');
  assert(sha.test(current.pin), 'PAGES_AUTO_POINTER_PIN');
  return { mode: 'COMPLETED', targetHour: outcome.productionReferenceAt, pin: current.pin };
}

async function main(env) {
  assert.equal(process.argv.length, 2);
  const context = assertOrdinaryPagesSelectorRequest(env);
  const token = env.GITHUB_TOKEN;
  const read = githubReader(token);
  if (!await previousOrdinaryHadPagesFailure(read, context)) {
    await fs.appendFile(env.GITHUB_OUTPUT, 'completed_private_runtime=false\n');
    console.log('PAGES_AUTO_ORDINARY');
    return;
  }
  const { documentRequest: request } = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' });
  const a = RAVSCORE_OPERATIONAL_ACTIVATION_DOCUMENT_KEY, b = RAVSCORE_PROFILE_SELECTION_DOCUMENT_KEY;
  const readActive = async () => {
    const rows = await request('?select=document_key,payload,version&document_key=in.(' + a + ',' + b + ')', {}, 'read');
    assert(Array.isArray(rows) && rows.length === 2, 'PAGES_AUTO_ACTIVE_ROWS');
    const active = completedRuntimeOperationalSource(one(rows.filter(r => r.document_key === a), 'PAGES_AUTO_ACTIVE_ROW'),
      one(rows.filter(r => r.document_key === b), 'PAGES_AUTO_PROFILE_ROW'));
    assert(operationalResolvedBindingCurrent(active), 'PAGES_AUTO_ACTIVE_BINDING');
    return active;
  };
  const plan = await selectAutomaticCompletedPrivateRuntime(env, {
    readPin: () => readCompletedPrivateRuntimePin(request), readPublic: fixedPublicManifest, readActive,
    readEvidence: (saved, context) => findCancellation({ read, token, saved, context }),
  });
  const output = plan.mode === 'FETCH' ? 'completed_private_runtime=false\n'
    : 'completed_private_runtime=true\ntarget_hour=' + plan.targetHour + '\ncompleted_private_runtime_pin=' + plan.pin + '\n';
  await fs.appendFile(env.GITHUB_OUTPUT, output);
  console.log(plan.mode === 'FETCH' ? 'PAGES_AUTO_ORDINARY' : 'PAGES_AUTO_COMPLETED_SELECTED');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.env).catch(error => {
    const reason = typeof error?.message === 'string' && /^(PAGES_(?:AUTO|SAVED)|ORDINARY_PAGES_CANCEL)_[A-Z0-9_]+$/.test(error.message)
      ? error.message : 'PAGES_AUTO_SELECTION_REFUSED';
    console.error(reason);
    process.exitCode = 1;
  });
}
