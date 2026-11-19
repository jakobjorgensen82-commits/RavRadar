import { appendFile } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { DMI_PRODUCER_JOB, successfulStep } from './lib/terminal-dmi-cache.mjs';

const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const WORKFLOW = '.github/workflows/run-current-weather-once.yml';
const OBSERVE = 'Observe exact restored RAW coverage for the locked successor before DMI';
const PROOF_UPLOAD = 'Publish the bounded RAW rotation handoff before DMI';
const PROOF_WAIT = 'Wait for the RAW rotation decision before DMI';
const RESULT_JOB = 'Retire verified older DMI RAW archives';
const RESULT_UPLOAD = 'Publish the RAW rotation decision';
const SHA40 = /^[a-f0-9]{40}$/;
const ARTIFACT_DIGEST = /^sha256:[a-f0-9]{64}$/;
const MAX_ARTIFACT_BYTES = 16 * 1024;
const POLL_MS = 3000;
const DEADLINE_MS = { proof: 15 * 60_000, 'observe-proof': 90_000, result: 180_000 };
const positive = value => Number.isSafeInteger(value) && value > 0;
const timestamp = value => typeof value === 'string' ? Date.parse(value) : NaN;
const hold = reason => ({ status: 'HOLD', reason });
const pending = () => ({ status: 'PENDING' });

function normalRun(run, { repositoryId, runId, attempt, head }) {
  return run?.id === runId && run.run_attempt === attempt && run.head_sha === head && run.head_branch === 'main'
    && run.repository?.id === repositoryId && run.repository.full_name === REPOSITORY
    && run.head_repository?.id === repositoryId && run.path === WORKFLOW && run.event === 'workflow_dispatch'
    && run.status === 'in_progress' && run.conclusion === null
    && run.actor?.login === 'github-actions[bot]' && run.triggering_actor?.login === 'github-actions[bot]';
}

function exactArtifact(row, { name, repositoryId, runId, head }, now) {
  return row?.name === name && positive(row.id) && row.expired === false
    && positive(row.size_in_bytes) && row.size_in_bytes <= MAX_ARTIFACT_BYTES
    && ARTIFACT_DIGEST.test(row.digest ?? '') && timestamp(row.expires_at) > now
    && row.workflow_run?.id === runId && row.workflow_run?.head_sha === head
    && row.workflow_run?.head_branch === 'main' && row.workflow_run?.repository_id === repositoryId
    && row.workflow_run?.head_repository_id === repositoryId;
}

function publicationStep(response, { kind, runId, attempt, head }) {
  if (!Array.isArray(response?.jobs) || response.total_count !== response.jobs.length
      || response.jobs.length > 100) return hold('incomplete-jobs');
  const result = kind === 'result';
  const jobs = response.jobs.filter(job => job?.name === (result ? RESULT_JOB : DMI_PRODUCER_JOB));
  if (jobs.length !== 1) return jobs.length === 0 ? null : hold('ambiguous-publisher');
  const [job] = jobs;
  if (!positive(job.id) || job.run_id !== runId || job.run_attempt !== attempt || job.head_sha !== head
      || job.head_branch !== 'main' || !Array.isArray(job.steps)) return hold('publisher-identity-unproved');
  if (!(job.status === 'in_progress' && job.conclusion === null)
      && !(job.status === 'completed' && job.conclusion === 'success')) return hold('publisher-not-successful');

  const uploadName = result ? RESULT_UPLOAD : PROOF_UPLOAD;
  const upload = successfulStep(job, uploadName);
  if (!upload) {
    const rows = job.steps.filter(step => step?.name === uploadName);
    return job.status === 'completed' || rows.length > 1 || rows[0]?.status === 'completed'
      ? hold('upload-not-successful') : null;
  }
  if (result) return upload;
  const observed = successfulStep(job, OBSERVE);
  if (!observed || observed.number >= upload.number || observed.completedAt > upload.startedAt) {
    return hold('observation-not-successful');
  }
  if (kind === 'proof') {
    const waiting = job.steps.filter(step => step?.name === PROOF_WAIT);
    if (job.status !== 'in_progress' || waiting.length > 1 || waiting[0]?.status === 'completed') {
      return hold('producer-not-waiting');
    }
    if (waiting.length === 0 || waiting[0].status === 'queued' || waiting[0].status === 'pending') return null;
    const [step] = waiting;
    if (step.status !== 'in_progress' || step.conclusion !== null || !positive(step.number)
        || step.number <= upload.number || !(timestamp(step.started_at) >= upload.completedAt)) {
      return hold('producer-not-waiting');
    }
  }
  return upload;
}

// Use the same authenticated read again immediately before each retirement.
// The receiver must also authenticate the downloaded contents independently.
export async function readRawRotationArtifactOnce({ kind, repositoryId, runId, attempt, head, getJson,
  expectedArtifactId, expectedDigest, now = Date.now } = {}) {
  if (!Object.hasOwn(DEADLINE_MS, kind) || !positive(repositoryId) || !positive(runId) || attempt !== 1
      || typeof head !== 'string' || !SHA40.test(head) || typeof getJson !== 'function'
      || (expectedArtifactId !== undefined && !positive(expectedArtifactId))
      || (expectedDigest !== undefined && (typeof expectedDigest !== 'string' || !ARTIFACT_DIGEST.test(expectedDigest)))) {
    return hold('invalid-context');
  }
  const name = `raw-rotation-${kind === 'result' ? 'result' : 'proof'}-${runId}-${attempt}`;
  const context = { kind, name, repositoryId, runId, attempt, head };
  const runPath = `/repos/${REPOSITORY}/actions/runs/${runId}`;
  const attemptPath = `${runPath}/attempts/${attempt}`;
  try {
    const listing = await getJson(`${runPath}/artifacts?name=${name}&per_page=2`);
    if (!Array.isArray(listing?.artifacts) || listing.total_count !== listing.artifacts.length
        || listing.total_count > 1) return hold('artifact-not-unique');
    if (!listing.total_count) return pending();
    const [artifact] = listing.artifacts;
    if (!exactArtifact(artifact, context, now())
        || (expectedArtifactId !== undefined && artifact.id !== expectedArtifactId)
        || (expectedDigest !== undefined && artifact.digest !== expectedDigest)) {
      return hold('artifact-identity-unproved');
    }
    const [run, jobs] = await Promise.all([getJson(attemptPath), getJson(`${attemptPath}/jobs?per_page=100`)]);
    if (!normalRun(run, context)) return hold('run-not-current');
    const upload = publicationStep(jobs, context);
    if (!upload) return pending();
    if (upload.status === 'HOLD') return upload;
    const created = timestamp(artifact.created_at), updated = timestamp(artifact.updated_at);
    if (!(created >= upload.startedAt - 1000 && updated >= created && updated <= upload.completedAt + 2000)) {
      return hold('artifact-outside-upload-step');
    }
    return { status: 'FOUND', artifactId: artifact.id, digest: artifact.digest };
  } catch {
    return hold('metadata-unavailable');
  }
}

export async function findRawRotationArtifact({ pause = wait, signal, ...context } = {}) {
  if (!Object.hasOwn(DEADLINE_MS, context.kind)) return hold('invalid-context');
  const lookups = Math.ceil(DEADLINE_MS[context.kind] / POLL_MS);
  try {
    for (let poll = 0; poll < lookups && !signal?.aborted; poll += 1) {
      if (poll) await pause(POLL_MS, undefined, { signal });
      const finding = await readRawRotationArtifactOnce(context);
      if (signal?.aborted) break;
      if (finding.status !== 'PENDING') return finding;
    }
  } catch {
    return hold('metadata-unavailable');
  }
  return hold('artifact-not-ready');
}

async function main(env, args) {
  const kind = args.length === 1 && args[0].startsWith('--') ? args[0].slice(2) : '';
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_API_URL !== 'https://api.github.com'
      || env.GITHUB_WORKFLOW_REF !== `${REPOSITORY}/${WORKFLOW}@refs/heads/main`
      || env.GITHUB_ACTIONS !== 'true' || env.RUNNER_ENVIRONMENT !== 'github-hosted'
      || env.GITHUB_REF !== 'refs/heads/main' || env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
      || env.GITHUB_ACTOR !== 'github-actions[bot]' || env.GITHUB_TRIGGERING_ACTOR !== 'github-actions[bot]'
      || !/^\S{1,4096}$/.test(env.GITHUB_TOKEN ?? '') || !env.GITHUB_OUTPUT
      || ![env.GITHUB_REPOSITORY_ID, env.GITHUB_RUN_ID, env.GITHUB_RUN_ATTEMPT]
        .every(value => /^[1-9][0-9]{0,15}$/.test(value ?? '')) || !Object.hasOwn(DEADLINE_MS, kind)) {
    if (env.GITHUB_OUTPUT) await appendFile(env.GITHUB_OUTPUT, 'artifact_status=hold\nartifact_reason=invalid-context\n');
    return;
  }
  const signal = AbortSignal.timeout(DEADLINE_MS[kind]);
  const finding = await findRawRotationArtifact({ kind, repositoryId: Number(env.GITHUB_REPOSITORY_ID),
    runId: Number(env.GITHUB_RUN_ID), attempt: Number(env.GITHUB_RUN_ATTEMPT), head: env.GITHUB_SHA, signal,
    getJson: async route => {
      const response = await fetch('https://api.github.com' + route, {
        method: 'GET', redirect: 'error', cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
        headers: { Authorization: 'Bearer ' + env.GITHUB_TOKEN, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2026-03-10' },
      });
      if (response.status !== 200) { await response.body?.cancel(); throw new Error('RAW_ARTIFACT_METADATA_HTTP'); }
      return JSON.parse(await readBoundedPublicManifest(response));
    },
  });
  await appendFile(env.GITHUB_OUTPUT, finding.status === 'FOUND'
    ? `artifact_status=found\nartifact_id=${finding.artifactId}\nartifact_digest=${finding.digest}\n`
    : `artifact_status=hold\nartifact_reason=${finding.reason}\n`);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try { await main(process.env, process.argv.slice(2)); }
  catch { console.error('RAW_ROTATION_ARTIFACT_FINDER_REFUSED'); process.exitCode = 1; }
}
