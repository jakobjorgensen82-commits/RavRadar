import { createHash } from 'node:crypto';
import { classifyProductionTargetFreshness } from '../check-production-target-freshness.mjs';
import { PROTECTED_PRIVATE_RUNTIME_POLICY } from '../protected-private-production-runtime.mjs';
import { sourceCompletedStageArtifactName } from './source-completed-stage-artifact-identity.mjs';

const WORKFLOW = 'run-current-weather-once.yml';
const WORKER_JOB = 'Build and prepare weather production through reusable workflow / build-and-prepare';
const WORKER_STEP = 'Run the one explicit owned SOURCE ordinary route';
const PAGES_CALL = 'Deploy prepared Pages artifact through reusable workflow';
const PAGES_JOBS = new Set([PAGES_CALL, 'Deploy prepared Pages artifact',
  PAGES_CALL + ' / Deploy prepared Pages artifact']);
const PAGES_STEPS = [
  'Current-grid pre-Edge - Upload GitHub Pages artifact',
  'Current-grid pre-Edge - Resolve and seal the exact uploaded Pages artifact',
  'Upload GitHub Pages artifact',
  'Resolve and seal the exact uploaded Pages artifact',
  'Upload privacy-safe operational handoff evidence after Pages artifact seal',
];
const SOURCE_VISIBILITY_MARKER = 'Confirm exhausted exact SOURCE Pages artifact metadata visibility';
const INTERRUPTED = new Set(['failure', 'cancelled', 'timed_out']);
const WORKER_TERMINAL = new Set(['success', ...INTERRUPTED]);
const LIMIT = 100;
const MAX_CANDIDATES = 6;
const MAX_ATTEMPTS = 8;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const MAX_ARTIFACT = PROTECTED_PRIVATE_RUNTIME_POLICY.maximumArchiveAggregateBytes
  + 32 * 1024 + 2 * 1024 * 1024;
const HEAD = /^[a-f0-9]{40}$/;
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;
const UTC_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00[.]000Z$/;
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const time = value => {
  if (!matches(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.]\d{3})?Z$/)) return NaN;
  const ms = Date.parse(value);
  return Number.isFinite(ms)
    && new Date(ms).toISOString() === value.replace(/(?<![.]\d{3})Z$/, '.000Z') ? ms : NaN;
};
function need(value, code) {
  if (!value) throw new Error('SOURCE_COMPLETED_OCCURRENCE_' + code);
}

function metadataReader({ repository, token, fetchImpl }) {
  const signal = AbortSignal.timeout(25_000);
  const headers = {
    Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RavRadar-source-completed-occurrence',
    'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity',
  };
  let requests = 0, totalBytes = 0;
  return async route => {
    need(++requests <= MAX_CANDIDATES + 5 && !signal.aborted, 'REQUEST_BOUND');
    let response;
    try {
      response = await fetchImpl('https://api.github.com/repos/' + repository + route,
        { method: 'GET', headers, redirect: 'error', signal });
    } catch {
      need(false, 'TRANSPORT');
    }
    need(response?.body?.getReader, 'METADATA_HTTP');
    const stream = response.body.getReader();
    try {
      need(response.status === 200, 'METADATA_HTTP');
      const length = response.headers.get('content-length');
      need(length === null || matches(length, /^(0|[1-9][0-9]*)$/)
        && Number(length) <= MAX_BYTES, 'METADATA_BOUND');
      need([null, 'identity'].includes(response.headers.get('content-encoding')), 'METADATA_ENCODING');
      need(!/rel="?next(?=[";,\s]|$)/i.test(response.headers.get('link') ?? ''), 'LIST_INCOMPLETE');
      const chunks = [];
      let bytes = 0;
      for (;;) {
        const { done, value } = await stream.read();
        if (done) break;
        need(value instanceof Uint8Array && !signal.aborted, 'METADATA_STREAM');
        bytes += value.byteLength;
        totalBytes += value.byteLength;
        need(bytes <= MAX_BYTES && totalBytes <= MAX_TOTAL_BYTES, 'METADATA_BOUND');
        chunks.push(Buffer.from(value));
      }
      need(length === null || Number(length) === bytes, 'METADATA_LENGTH');
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    } catch (error) {
      if (error?.message?.startsWith('SOURCE_COMPLETED_OCCURRENCE_')) throw error;
      need(false, 'METADATA_BODY');
    } finally {
      await stream.cancel().catch(() => {});
      stream.releaseLock();
    }
  };
}

function completeList(document, key) {
  const rows = document?.[key];
  need(Array.isArray(rows) && rows.length <= LIMIT && document.total_count === rows.length
    && rows.every(row => positive(row?.id))
    && new Set(rows.map(row => row.id)).size === rows.length, 'LIST_INCOMPLETE');
  return rows;
}

function matchesRun(run, { repository, sourceHead }) {
  return positive(run?.id) && positive(run.run_attempt)
    && run.repository?.full_name === repository && run.head_repository?.full_name === repository
    && positive(run.repository.id) && run.head_repository.id === run.repository.id
    && run.head_branch === 'main' && run.head_sha === sourceHead
    && run.path === '.github/workflows/' + WORKFLOW && run.event === 'workflow_dispatch';
}

function assertTerminalRun(run, listing, identity, now) {
  need(matchesRun(run, identity) && run.id === listing.id && run.run_attempt === listing.run_attempt
    && run.repository.id === listing.repository.id && run.created_at === listing.created_at
    && run.status === 'completed' && INTERRUPTED.has(run.conclusion)
    && time(run.created_at) <= time(run.run_started_at)
    && time(run.run_started_at) <= time(run.updated_at) && time(run.updated_at) <= now,
  'RUN_IDENTITY');
}

function assertJobIdentity(job, run) {
  need(job.run_id === run.id && job.run_attempt === run.run_attempt
    && job.head_sha === run.head_sha && job.head_branch === 'main'
    && job.status === 'completed' && Array.isArray(job.steps) && job.steps.length <= 512, 'JOB_IDENTITY');
}

function step(job, name) {
  const rows = job.steps.filter(entry => entry?.name === name);
  need(rows.length === 1 && positive(rows[0].number) && rows[0].status === 'completed', 'STEP_IDENTITY');
  return rows[0];
}

function assertArtifact(artifact, name, run, worker, job, generated, now) {
  need(positive(artifact?.id) && artifact.name === name && artifact.expired === false
    && artifact.workflow_run?.id === run.id && artifact.workflow_run.repository_id === run.repository.id
    && artifact.workflow_run.head_repository_id === run.repository.id
    && artifact.workflow_run.head_sha === run.head_sha && artifact.workflow_run.head_branch === 'main'
    && matches(artifact.digest, /^sha256:[a-f0-9]{64}$/)
    && positive(artifact.size_in_bytes) && artifact.size_in_bytes <= MAX_ARTIFACT
    && time(worker.started_at) <= generated && generated <= time(artifact.created_at)
    && time(artifact.created_at) <= time(worker.completed_at)
    && time(artifact.created_at) <= time(artifact.updated_at)
    && time(artifact.updated_at) <= time(job.completed_at) && time(artifact.expires_at) > now,
  'ARTIFACT_IDENTITY');
}

function readSourcePresealVisibility({ run, job, worker, stageArtifact, artifacts, now }) {
  need(run.run_attempt === 1 && run.conclusion === 'failure' && job.conclusion === 'failure' && worker.conclusion === 'success'
    && job.steps.every(entry => positive(entry?.number) && entry.status === 'completed'
      && ['success', 'failure', 'skipped'].includes(entry.conclusion))
    && new Set(job.steps.map(entry => entry.number)).size === job.steps.length
    && job.steps.filter(entry => entry.conclusion === 'failure').length === 1, 'PAGES_REENTRY_REQUIRED');

  const anchors = [
    ['Audit the complete Pages artifact for private runtime material', 'success'],
    ['Seal SOURCE through the unchanged normal operational handoff contract', 'success'],
    ['Decide whether this sealed artifact may deploy', 'success'],
    ['Configure GitHub Pages', 'success'],
    [PAGES_STEPS[2], 'success'],
    [PAGES_STEPS[3], 'failure'],
    [SOURCE_VISIBILITY_MARKER, 'success'],
    ['Bind the current protected SOURCE pair to this exact integrated Pages handoff', 'skipped'],
    [PAGES_STEPS[4], 'skipped'],
  ].map(([label, outcome]) => {
    const entry = step(job, label);
    need(entry.conclusion === outcome, 'PAGES_REENTRY_REQUIRED');
    return entry;
  });
  for (const label of PAGES_STEPS.slice(0, 2)) {
    const preEdge = step(job, label);
    need(preEdge.number > worker.number && preEdge.conclusion === 'skipped', 'PAGES_REENTRY_REQUIRED');
  }
  need([worker, ...anchors].every((entry, index, steps) =>
    index === 0 || steps[index - 1].number < entry.number), 'PAGES_REENTRY_REQUIRED');
  const [upload, seal, marker] = anchors.slice(4, 7);
  const times = [worker.completed_at, upload.started_at, upload.completed_at, seal.started_at,
    seal.completed_at, marker.started_at, marker.completed_at, job.completed_at].map(time);
  need(times.every((value, index) => Number.isFinite(value)
    && (index === 0 || times[index - 1] <= value)), 'PAGES_REENTRY_REQUIRED');

  need(!artifacts.some(entry => entry.name === `ravscore-operational-handoff-${run.id}-${run.run_attempt}`),
    'PAGES_REENTRY_REQUIRED');
  const rows = artifacts.filter(entry => entry.name === 'github-pages');
  need(rows.length === 1, 'PAGES_ARTIFACT_IDENTITY');
  const [artifact] = rows;
  const link = artifact.workflow_run;
  const createdAt = time(artifact.created_at), updatedAt = time(artifact.updated_at);
  need(artifact.expired === false && positive(artifact.size_in_bytes)
    && matches(artifact.digest, /^sha256:[a-f0-9]{64}$/)
    && link?.id === run.id && link.repository_id === run.repository.id
    && link.head_repository_id === run.repository.id && link.head_sha === run.head_sha
    && link.head_branch === 'main' && times[1] <= createdAt && createdAt <= times[5]
    && createdAt <= updatedAt && updatedAt <= now && time(artifact.expires_at) > now,
  'PAGES_ARTIFACT_IDENTITY');

  return {
    pagesOutcome: 'SOURCE_METADATA_VISIBILITY_EXHAUSTED',
    pagesProof: createHash('sha256').update(JSON.stringify([
      'ravradar-source-preseal-visibility-v1', run.id, run.run_attempt, run.head_sha, job.id,
      stageArtifact.id, stageArtifact.digest, marker.number, marker.started_at,
      artifact.id, artifact.digest, artifact.size_in_bytes, artifact.created_at, artifact.updated_at,
    ])).digest('hex'),
  };
}

/**
 * Locate the terminal producer of an already authenticated CURRENT descriptor.
 * This proves a recorded occurrence before Pages. The caller still owns
 * SOURCE admission, live B/S parity, producer ancestry and reentry authority.
 */
export async function findSourceCompletedStageOccurrence({
  repository, generation, publicReferenceAt, consumerRunId, token,
  fetchImpl = globalThis.fetch, now = new Date().toISOString(),
} = {}) {
  const sourceHead = generation?.sourceHead;
  const clock = time(now);
  const generated = time(generation?.generatedAt);
  const target = generation?.productionReferenceAt;
  need(matches(repository, REPOSITORY) && !/\/\.{1,2}$/.test(repository)
    && matches(sourceHead, HEAD) && positive(consumerRunId)
    && matches(token, /^[^\s]{1,4096}$/) && typeof fetchImpl === 'function'
    && matches(target, UTC_HOUR) && matches(publicReferenceAt, UTC_HOUR)
    && time(target) > time(publicReferenceAt) && time(target) <= generated && generated <= clock,
  'REQUEST');
  classifyProductionTargetFreshness({ target, now, maximumAgeMinutes: 150 });
  const identity = { repository, sourceHead };
  const name = (runId, runAttempt) => sourceCompletedStageArtifactName({
    ...identity, runId: String(runId), runAttempt: String(runAttempt), generation,
  });
  name(consumerRunId, 1); // Check the normal generation fields before I/O.
  const json = metadataReader({ repository, token, fetchImpl });
  const runs = completeList(await json('/actions/workflows/' + WORKFLOW
    + '/runs?branch=main&event=workflow_dispatch&head_sha=' + sourceHead + '&per_page=' + LIMIT),
  'workflow_runs');
  need(runs.every(run => matchesRun(run, identity)
    && time(run.created_at) <= time(run.updated_at) && time(run.updated_at) <= clock), 'RUN_LIST_IDENTITY');
  const candidates = runs.filter(run => run.id !== consumerRunId
    && time(run.created_at) <= generated && generated <= time(run.updated_at));
  need(candidates.length <= MAX_CANDIDATES && candidates.every(run => run.run_attempt <= MAX_ATTEMPTS),
    'CANDIDATE_BOUND');

  let occurrence;
  for (const listing of candidates) {
    const names = new Map(Array.from({ length: listing.run_attempt }, (_, index) =>
      [name(listing.id, index + 1), index + 1]));
    const artifacts = completeList(await json('/actions/runs/' + listing.id + '/artifacts?per_page=' + LIMIT),
      'artifacts');
    for (const artifact of artifacts.filter(value => names.has(value.name))) {
      need(!occurrence && names.get(artifact.name) === listing.run_attempt, 'OCCURRENCE_AMBIGUOUS');
      occurrence = { listing, artifact, artifacts };
    }
  }
  need(occurrence, 'NOT_FOUND');
  const { listing, artifact, artifacts } = occurrence;
  const base = '/actions/runs/' + listing.id;
  const attempt = base + '/attempts/' + listing.run_attempt;
  const run = await json(attempt);
  assertTerminalRun(run, listing, identity, clock);
  const jobs = completeList(await json(attempt + '/jobs?per_page=' + LIMIT), 'jobs');
  const builds = jobs.filter(job => job.name === WORKER_JOB);
  const pages = jobs.filter(job => PAGES_JOBS.has(job.name));
  need(builds.length === 1, 'JOB_IDENTITY');
  need(pages.length === 1, 'PAGES_REENTRY_REQUIRED');
  const [job] = builds;
  const [pagesJob] = pages;
  assertJobIdentity(job, run);
  assertJobIdentity(pagesJob, run);
  need(WORKER_TERMINAL.has(job.conclusion) && time(run.run_started_at) <= time(job.started_at)
    && time(job.started_at) <= time(job.completed_at) && time(job.completed_at) <= time(run.updated_at),
  'WORKER_JOB');
  const worker = step(job, WORKER_STEP);
  need(WORKER_TERMINAL.has(worker.conclusion) && time(job.started_at) <= time(worker.started_at)
    && time(worker.started_at) <= time(worker.completed_at)
    && time(worker.completed_at) <= time(job.completed_at), 'WORKER_STEP');
  need(pagesJob.conclusion === 'skipped' && pagesJob.steps.every(entry =>
    entry?.status === 'completed' && entry.conclusion === 'skipped'), 'PAGES_REENTRY_REQUIRED');
  const pagesEvidence = PAGES_STEPS.every(label => {
    const skipped = step(job, label);
    return skipped.number > worker.number && skipped.conclusion === 'skipped';
  }) ? { pagesOutcome: 'NOT_STARTED' }
    : readSourcePresealVisibility({ run, job, worker, stageArtifact: artifact, artifacts, now: clock });

  const expectedName = name(run.id, run.run_attempt);
  assertArtifact(artifact, expectedName, run, worker, job, generated, clock);
  const exactArtifact = await json('/actions/artifacts/' + artifact.id);
  assertArtifact(exactArtifact, expectedName, run, worker, job, generated, clock);
  need(['id', 'digest', 'size_in_bytes', 'created_at', 'updated_at', 'expires_at']
    .every(key => exactArtifact[key] === artifact[key]), 'ARTIFACT_CHANGED');
  const latest = await json(base);
  assertTerminalRun(latest, listing, identity, clock);
  need(latest.updated_at === run.updated_at && latest.conclusion === run.conclusion
    && latest.run_started_at === run.run_started_at, 'RUN_CHANGED');

  return Object.freeze({
    kind: 'SOURCE_COMPLETED_STAGE_OCCURRENCE_V1', sourceHead, runId: run.id,
    runAttempt: run.run_attempt, producerJobId: job.id, workerStepNumber: worker.number,
    workerOutcome: worker.conclusion, artifactId: artifact.id, artifactDigestSha256: artifact.digest.slice(7),
    datasetId: generation.datasetId, productionReferenceAt: target, ...pagesEvidence,
  });
}
