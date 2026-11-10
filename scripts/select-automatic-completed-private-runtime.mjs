import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { cancelledReplayAnchor, createOrdinaryPagesBaselineReaders } from './pages-cancelled-replay-continuity.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { classifyOrdinaryPagesContinuation } from './lib/ordinary-completed-pages-route.mjs';
import { readOrdinaryPagesCancellation } from './lib/ordinary-pages-cancellation.mjs';

const repo = 'jakobjorgensen82-commits/RavRadar';
const workflow = 'run-current-weather-once.yml';
const pagesJob = 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact';
const buildJob = 'Build and prepare weather production through reusable workflow / build-and-prepare';
const lockJob = 'Lock one normal run to exact current main and UTC hour';
const terminalJob = 'Require a verified current-weather deployment';
const autoSelect = 'Select provider-free continuation for the default scheduled caller';
const canonicalHour = 'Lock the canonical UTC production hour';
const deployStep = 'Deploy to GitHub Pages';
const visibilityMarker = 'Confirm exhausted exact Pages artifact metadata visibility';
const artifactUpload = 'Upload GitHub Pages artifact';
const artifactSeal = 'Resolve and seal the exact uploaded Pages artifact';
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

function exactVisibilityFailure(run, jobs) {
  const builds = jobs.filter(job => job.name === buildJob);
  assert(builds.length <= 1, 'PAGES_AUTO_VISIBILITY_BUILD_COUNT');
  const build = builds[0];
  const markers = build?.steps?.filter(step => step.name === visibilityMarker) ?? [];
  if (markers.length === 0) return null;
  const marker = one(markers, 'PAGES_AUTO_VISIBILITY_MARKER_COUNT');
  if (marker.status === 'completed' && marker.conclusion === 'skipped') return null;
  const pages = one(jobs.filter(job => job.name === pagesJob), 'PAGES_AUTO_VISIBILITY_PAGES_COUNT');
  const sameRun = job => positive(job.id) && job.status === 'completed' && job.run_id === run.id
    && job.run_attempt === 1 && job.head_sha === run.head_sha && job.head_branch === 'main';
  assert(run.run_attempt === 1 && run.status === 'completed' && run.conclusion === 'failure'
    && sameRun(build) && build.conclusion === 'failure'
    && sameRun(pages) && pages.conclusion === 'skipped'
    && Array.isArray(pages.steps) && pages.steps.every(step => step.status === 'completed' && step.conclusion === 'skipped')
    && build.steps.length <= 256 && build.steps.every(step => step.status === 'completed'
      && ['success', 'failure', 'skipped'].includes(step.conclusion) && positive(step.number))
    && new Set(build.steps.map(step => step.number)).size === build.steps.length,
  'PAGES_AUTO_VISIBILITY_JOB_IDENTITY');
  const anchors = [
    ['Update central weather cache', 'success'],
    ['Refuse loss of previously valid public weather on identical coastal hours', 'success'],
    ['Validate critical production artifact after fresh weather and current provenance', 'success'],
    ['Run release governance gate after refreshed data validation', 'success'],
    ['Publish bounded private runtime with one protected rollback generation', 'success'],
    ['Publish atomic RavScore checkpoint to protected admin storage', 'success'],
    ['Audit the complete Pages artifact for private runtime material', 'success'],
    [artifactUpload, 'success'],
    [artifactSeal, 'failure'],
    [visibilityMarker, 'success'],
    ['Upload privacy-safe operational handoff evidence after Pages artifact seal', 'skipped'],
  ].map(([name, conclusion]) => {
    const step = one(build.steps.filter(row => row.name === name), 'PAGES_AUTO_VISIBILITY_STEP_COUNT');
    assert.equal(step.conclusion, conclusion, 'PAGES_AUTO_VISIBILITY_STEP_OUTCOME');
    return step;
  });
  const [upload, seal] = anchors.slice(-4);
  const uploadStartedAt = Date.parse(upload.started_at);
  const markerStartedAt = Date.parse(marker.started_at);
  assert(anchors.every((step, i) => i === 0 || anchors[i - 1].number < step.number)
    && build.steps.filter(step => step.conclusion === 'failure').length === 1
    && Date.parse(run.run_started_at) <= Date.parse(build.started_at)
    && Date.parse(build.started_at) <= uploadStartedAt
    && uploadStartedAt <= Date.parse(upload.completed_at)
    && Date.parse(upload.completed_at) <= Date.parse(seal.started_at)
    && Date.parse(seal.started_at) <= Date.parse(seal.completed_at)
    && Date.parse(seal.completed_at) <= markerStartedAt
    && markerStartedAt <= Date.parse(marker.completed_at)
    && Date.parse(marker.completed_at) <= Date.parse(build.completed_at)
    && Date.parse(build.completed_at) <= Date.parse(run.updated_at),
  'PAGES_AUTO_VISIBILITY_STEP_ORDER');
  return { jobId: build.id, uploadStartedAt, markerStartedAt };
}

export async function readPreviousOrdinaryPagesFailure(read, context) {
  const created = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const route = '/actions/workflows/' + workflow + '/runs?branch=main&event=workflow_dispatch&status=completed&head_sha='
    + context.head + '&per_page=12&created=' + encodeURIComponent('>=' + created);
  const predecessors = ordinaryPredecessors(list(await read(route), 'workflow_runs', 12), context);
  for (const previous of predecessors) {
    const jobs = list(await read('/actions/runs/' + previous.id + '/attempts/1/jobs?per_page=100'), 'jobs');
    if (exactVisibilityFailure(previous, jobs)) return { kind: 'visibility', run: previous };
    const pages = jobs.filter(job => job.name === pagesJob);
    assert(pages.length <= 1, 'PAGES_AUTO_PRIOR_JOB_AMBIGUOUS');
    const job = pages[0];
    if (!job || job.conclusion === 'skipped') continue;
    const deploy = one(job.steps?.filter(step => step.name === deployStep), 'PAGES_AUTO_PRIOR_DEPLOY_STEP');
    assert(job.status === 'completed' && deploy.status === 'completed', 'PAGES_AUTO_PRIOR_DEPLOY_INCOMPLETE');
    if (deploy.conclusion === 'skipped') continue;
    if (deploy.conclusion === 'success') return null;
    assert(previous.conclusion === 'failure' && job.conclusion === 'failure'
      && deploy.conclusion === 'failure', 'PAGES_AUTO_PRIOR_DEPLOY_UNKNOWN');
    return { kind: 'deploy', run: previous, jobs, job };
  }
  return null;
}

function requireReplaySteps(run, job, conclusion, expected) {
  assert(positive(job.id) && job.run_id === run.id && job.run_attempt === 1 && job.head_sha === run.head_sha
    && job.head_branch === 'main' && job.status === 'completed' && job.conclusion === conclusion
    && Date.parse(run.run_started_at) <= Date.parse(job.started_at)
    && Date.parse(job.started_at) <= Date.parse(job.completed_at)
    && Date.parse(job.completed_at) <= Date.parse(run.updated_at)
    && Array.isArray(job.steps) && job.steps.length <= 256
    && job.steps.every(step => positive(step.number)) && new Set(job.steps.map(step => step.number)).size === job.steps.length,
  'PAGES_AUTO_REPLAY_JOB_IDENTITY');
  let number = 0;
  let finished = Date.parse(job.started_at);
  for (const [name, outcome] of expected) {
    const step = one(job.steps.filter(value => value.name === name), 'PAGES_AUTO_REPLAY_STEP_COUNT');
    assert(step.status === 'completed' && step.conclusion === outcome, 'PAGES_AUTO_REPLAY_STEP_OUTCOME');
    assert(step.number > number && finished <= Date.parse(step.started_at)
      && Date.parse(step.started_at) <= Date.parse(step.completed_at)
      && Date.parse(step.completed_at) <= Date.parse(job.completed_at), 'PAGES_AUTO_REPLAY_STEP_ORDER');
    number = step.number;
    finished = Date.parse(step.completed_at);
  }
}

function exactAutomaticReplay(previous, producer, runs, context) {
  if (previous?.kind !== 'deploy' || previous.run.id <= producer.id) return null;
  const { run, jobs, job: pages } = previous;
  const locks = jobs.filter(job => job.name === lockJob);
  assert(locks.length <= 1, 'PAGES_AUTO_REPLAY_LOCK_COUNT');
  const lock = locks[0];
  // A later ordinary failure still uses the original producer unless its lock
  // shows that it selected the completed-runtime path automatically.
  if (!lock?.steps?.some(step => step.name === autoSelect && step.conclusion === 'success')
    || !lock.steps.some(step => step.name === canonicalHour && step.conclusion === 'skipped')) return null;

  const latest = ordinaryPredecessors(runs, context).find(row => row.id === run.id);
  assert(latest?.conclusion === 'failure' && run.conclusion === 'failure'
    && latest.triggering_actor?.login === 'github-actions[bot]' && run.triggering_actor?.login === 'github-actions[bot]'
    && latest.repository.id === run.repository.id && latest.workflow_id === run.workflow_id
    && positive(run.workflow_id) && producer.workflow_id === run.workflow_id
    && latest.created_at === run.created_at && latest.run_started_at === run.run_started_at && latest.updated_at === run.updated_at
    && Date.parse(producer.updated_at) <= Date.parse(run.created_at)
    && Date.parse(run.created_at) <= Date.parse(run.run_started_at), 'PAGES_AUTO_REPLAY_RUN_IDENTITY');

  const build = one(jobs.filter(job => job.name === buildJob), 'PAGES_AUTO_REPLAY_BUILD_COUNT');
  const terminal = one(jobs.filter(job => job.name === terminalJob), 'PAGES_AUTO_REPLAY_TERMINAL_COUNT');
  requireReplaySteps(run, lock, 'success', [
    ['Identify the default scheduled weather caller', 'success'],
    [autoSelect, 'success'],
    [canonicalHour, 'skipped'],
    ['Require one canonical target hour and completed-runtime decision', 'success'],
  ]);
  requireReplaySteps(run, build, 'success', [
    ['Require the separate completed B request and actual restored originals', 'success'],
    ['Read actual operational and profile rows for completed B admission', 'success'],
    ['Restore the actual newest protected checkpoint for completed B admission', 'success'],
    ['Admit only the exact authenticated completed B and matching central S', 'success'],
    ['Update DMI bulk model cache', 'skipped'],
    ['Fill only exact-hour DMI gaps from Copernicus', 'skipped'],
    ['Fill only the exact remaining current gaps from Open-Meteo', 'skipped'],
    ['Update central weather cache', 'skipped'],
    ['Refuse loss of previously valid public weather on identical coastal hours', 'success'],
    ['Validate critical production artifact after fresh weather and current provenance', 'success'],
    ['Run release governance gate after refreshed data validation', 'success'],
    ['Refuse completed-runtime target or calibration mismatch before any new S or B publication', 'success'],
    ['Publish bounded private runtime with one protected rollback generation', 'success'],
    ['Publish atomic RavScore checkpoint to protected admin storage', 'success'],
    ['Audit the complete Pages artifact for private runtime material', 'success'],
    [artifactUpload, 'success'],
    [artifactSeal, 'success'],
    [visibilityMarker, 'skipped'],
    ['Upload privacy-safe operational handoff evidence after Pages artifact seal', 'success'],
  ]);
  requireReplaySteps(run, pages, 'failure', [
    ['Require horizon-valid weather immediately before Pages deployment', 'success'],
    ['Require monotonic public generation immediately before Pages', 'success'],
    [deployStep, 'failure'],
    ['Verify deployed exact model, implementation and 210/673 artifact', 'skipped'],
    ['Seal exact verified deployment terminal', 'failure'],
  ]);
  requireReplaySteps(run, terminal, 'failure', [['Summarize and require the complete normal production path', 'failure']]);
  assert(Date.parse(lock.completed_at) <= Date.parse(build.started_at)
    && Date.parse(build.completed_at) <= Date.parse(pages.started_at)
    && Date.parse(pages.completed_at) <= Date.parse(terminal.started_at), 'PAGES_AUTO_REPLAY_JOB_ORDER');
  return previous;
}

async function readSealedCancellation(run, job, { read, token, context, readHandoff, readCancellation }) {
  const evidence = await readHandoff({ run, read, token });
  const proof = await readCancellation({ repository: repo, currentMainHead: context.head,
    artifactSeal: evidence.seal, jobId: job.id, token });
  return { ...evidence, cancelled: { ...proof, kind: 'PAGES_DEPLOYMENT_CANCELLED_CONFIRMED', headSha: proof.sourceHead } };
}

export async function readOrdinaryPagesEvidence({ read, token, saved, context, previousFailure,
  readHandoff = readExactHandoffArchive, readCancellation = readOrdinaryPagesCancellation }) {
  const created = new Date(Date.parse(saved.generatedAt) - 24 * 60 * 60 * 1000).toISOString();
  const path = '/actions/workflows/' + workflow + '/runs?branch=main&event=workflow_dispatch&status=completed&head_sha='
    + context.head + '&per_page=12&created=' + encodeURIComponent('>=' + created);
  const runs = list(await read(path), 'workflow_runs', 12);
  const run = exactPriorProducer(runs, { ...context, saved });
  const jobs = list(await read('/actions/runs/' + run.id + '/attempts/1/jobs?per_page=100'), 'jobs');
  const visibility = exactVisibilityFailure(run, jobs);
  if (visibility) {
    const artifacts = await read('/actions/runs/' + run.id + '/artifacts?per_page=100');
    const artifact = one(list(artifacts, 'artifacts').filter(row => row.name === 'github-pages'), 'PAGES_AUTO_VISIBILITY_ARTIFACT_COUNT');
    const link = artifact.workflow_run;
    const createdAt = Date.parse(artifact.created_at);
    assert(artifact.expired === false && positive(artifact.size_in_bytes)
      && /^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? '') && link?.id === run.id
      && link.head_sha === run.head_sha && link.head_branch === 'main'
      && link.repository_id === run.repository.id && link.head_repository_id === run.repository.id
      && visibility.uploadStartedAt <= createdAt && createdAt <= visibility.markerStartedAt
      && createdAt <= Date.parse(artifact.updated_at) && Date.parse(artifact.expires_at) > Date.now(),
    'PAGES_AUTO_VISIBILITY_ARTIFACT_IDENTITY');
    const latest = exactPriorProducer([await read('/actions/runs/' + run.id)], { ...context, saved });
    assert(latest.id === run.id && latest.created_at === run.created_at && latest.run_started_at === run.run_started_at
      && latest.updated_at === run.updated_at && latest.repository.id === run.repository.id, 'PAGES_AUTO_VISIBILITY_RUN_MOVED');
    const main = await read('/git/ref/heads/main');
    assert(main?.ref === 'refs/heads/main' && main.object?.type === 'commit'
      && main.object.sha === context.head, 'PAGES_AUTO_VISIBILITY_MAIN_MOVED');
    return { visibilityExhausted: { kind: 'PAGES_ARTIFACT_VISIBILITY_EXHAUSTED_CONFIRMED',
      runId: run.id, runAttempt: run.run_attempt, headSha: run.head_sha, jobId: visibility.jobId,
      artifactId: artifact.id, artifactDigestSha256: artifact.digest.slice(7) } };
  }
  const build = one(jobs.filter(job => job.name === buildJob), 'PAGES_AUTO_BUILD_COUNT');
  const passed = name => one(build.steps.filter(step => step.name === name), 'PAGES_AUTO_BUILD_STEP').conclusion === 'success';
  assert(build.status === 'completed' && build.conclusion === 'success'
    && passed('Update central weather cache') && passed('Refuse loss of previously valid public weather on identical coastal hours')
    && passed('Publish bounded private runtime with one protected rollback generation')
    && passed('Publish atomic RavScore checkpoint to protected admin storage'), 'PAGES_AUTO_BUILD_NOT_COMPLETE');
  const job = one(jobs.filter(job => job.name === pagesJob), 'PAGES_AUTO_JOB_COUNT');
  const replay = exactAutomaticReplay(previousFailure, run, runs, context);
  const readers = { read, token, context, readHandoff, readCancellation };
  if (!replay) return readSealedCancellation(run, job, readers);
  const [evidence, repeated] = await Promise.all([
    readSealedCancellation(run, job, readers),
    readSealedCancellation(replay.run, replay.job, readers),
  ]);
  assert(evidence.targetManifestSha256 === repeated.targetManifestSha256
    && evidence.seal.targetImplementationClosureSha256 === repeated.seal.targetImplementationClosureSha256,
  'PAGES_AUTO_REPLAY_TARGET_DRIFT');
  return { ...evidence, repeated };
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
  const evidence = await readEvidence(saved, context);
  const outcome = classifyOrdinaryPagesContinuation({ ...scope, ...evidence });
  assert.equal(outcome.route, 'resume-completed', 'PAGES_AUTO_NO_SAFE_CONTINUATION');
  let cancelledReplay;
  if (evidence.repeated) {
    const repeated = classifyOrdinaryPagesContinuation({ ...scope, ...evidence.repeated });
    assert(repeated.route === 'resume-completed' && repeated.producerRunId > outcome.producerRunId
      && repeated.productionReferenceAt === outcome.productionReferenceAt
      && repeated.targetManifestSha256 === outcome.targetManifestSha256, 'PAGES_AUTO_REPLAY_TARGET_DRIFT');
    const { runId, runAttempt, jobId, artifactId, artifactDigestSha256 } = evidence.repeated.cancelled;
    cancelledReplay = Object.freeze({ kind: 'PAGES_AUTOMATIC_REPLAY_CANCELLED_CONFIRMED',
      runId, runAttempt, jobId, artifactId, artifactDigestSha256,
      producerRunId: outcome.producerRunId, producerRunAttempt: outcome.producerRunAttempt, headSha: context.head,
      targetPublicManifestSha256: outcome.targetManifestSha256, publicManifestSha256 });
  }
  const [current, publicAgain, activeAgain] = await Promise.all([readPin(), readPublic(context.consumerRunId), readActive()]);
  assert.deepEqual(current, originalPin, 'PAGES_AUTO_POINTER_CHANGED');
  assert.deepEqual(activeAgain, active, 'PAGES_AUTO_ACTIVE_CHANGED');
  assert.equal(sha256CanonicalJson(publicAgain), publicManifestSha256, 'PAGES_AUTO_PUBLIC_CHANGED');
  assert(sha.test(current.pin), 'PAGES_AUTO_POINTER_PIN');
  return { mode: 'COMPLETED', targetHour: outcome.productionReferenceAt, pin: current.pin,
    ...(cancelledReplay ? { cancelledReplay, repeatAnchor: cancelledReplayAnchor({ ...context,
      publicManifestSha256, activeSha256: sha256CanonicalJson(active), pin: current.pin }) } : {}) };
}

async function main(env) {
  assert.equal(process.argv.length, 2);
  const context = assertOrdinaryPagesSelectorRequest(env);
  const token = env.GITHUB_TOKEN;
  const read = githubReader(token);
  const previousFailure = await readPreviousOrdinaryPagesFailure(read, context);
  if (!previousFailure) {
    await fs.appendFile(env.GITHUB_OUTPUT, 'completed_private_runtime=false\n');
    console.log('PAGES_AUTO_ORDINARY');
    return;
  }
  const plan = await selectAutomaticCompletedPrivateRuntime(env, {
    ...createOrdinaryPagesBaselineReaders(),
    readEvidence: (saved, context) => readOrdinaryPagesEvidence({ read, token, saved, context, previousFailure }),
  });
  let output = 'completed_private_runtime=false\n';
  if (plan.cancelledReplay) {
    output += 'fresh_after_cancelled_replay=true\nrepeat_anchor=' + plan.repeatAnchor + '\n';
  } else if (plan.mode === 'COMPLETED') {
    output = 'completed_private_runtime=true\ntarget_hour=' + plan.targetHour + '\ncompleted_private_runtime_pin=' + plan.pin + '\n';
  }
  await fs.appendFile(env.GITHUB_OUTPUT, output);
  if (plan.cancelledReplay) console.log('PAGES_AUTO_REPLAY_CANCELLED_CONFIRMED');
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
