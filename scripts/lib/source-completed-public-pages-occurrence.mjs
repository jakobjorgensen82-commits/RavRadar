import { exactPagesAttemptStep } from '../github-pages-attempt-evidence.mjs';

const WORKFLOW = '.github/workflows/run-current-weather-once.yml';
const EVIDENCE = 'Publish exact target reentry evidence before any activation CAS';
const DEPLOY = 'Deploy to GitHub Pages';
const VERIFY = 'Verify deployed exact model, implementation and 210/673 artifact';
const RESEAL = 'Reseal ordinary integrated production without changing model identity';
const PAGES_CALL = 'Deploy prepared Pages artifact through reusable workflow';
const PAGES_JOB = 'Deploy prepared Pages artifact';
const PAGES_JOBS = new Set([PAGES_JOB, PAGES_CALL + ' / ' + PAGES_JOB]);
const INTERRUPTED = new Set(['failure', 'cancelled', 'timed_out']);
const UNFINISHED = new Set(['skipped', ...INTERRUPTED]);
const LIMIT = 100;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const HEAD = /^[a-f0-9]{40}$/;
const SHA = /^[a-f0-9]{64}$/;
const REPOSITORY = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;
const PREFIX = 'SOURCE_COMPLETED_PUBLIC_PAGES_';
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;

function need(value, code) {
  if (!value) throw new Error(PREFIX + code);
}

function time(value) {
  if (!matches(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.]\d{3})?Z$/)) return NaN;
  const ms = Date.parse(value);
  const canonical = value.includes('.') ? value : value.slice(0, -1) + '.000Z';
  return Number.isFinite(ms) && new Date(ms).toISOString() === canonical ? ms : NaN;
}

function metadataReader({ repository, token, fetchImpl }) {
  const signal = AbortSignal.timeout(25_000);
  const headers = {
    Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token,
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RavRadar-source-completed-public-pages',
    'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity',
  };
  let totalBytes = 0;
  return async route => {
    need(!signal.aborted, 'METADATA_TIMEOUT');
    let response;
    try {
      response = await fetchImpl('https://api.github.com/repos/' + repository + route,
        { method: 'GET', headers, redirect: 'error', signal });
    } catch {
      need(false, signal.aborted ? 'METADATA_TIMEOUT' : 'METADATA_TRANSPORT');
    }
    need(response?.body?.getReader, 'METADATA_HTTP');
    const reader = response.body.getReader();
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
        const { done, value } = await reader.read();
        need(!signal.aborted, 'METADATA_TIMEOUT');
        if (done) break;
        need(value instanceof Uint8Array, 'METADATA_BODY');
        bytes += value.byteLength;
        totalBytes += value.byteLength;
        need(bytes <= MAX_BYTES && totalBytes <= MAX_TOTAL_BYTES, 'METADATA_BOUND');
        chunks.push(Buffer.from(value));
      }
      need(length === null || bytes === Number(length), 'METADATA_LENGTH');
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    } catch (error) {
      if (error?.message?.startsWith(PREFIX)) throw error;
      need(false, signal.aborted ? 'METADATA_TIMEOUT' : 'METADATA_BODY');
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  };
}

function assertRun(run, seal, clock) {
  need(run?.id === seal.runId && run.run_attempt === seal.runAttempt
    && run.repository?.full_name === seal.repository && run.head_repository?.full_name === seal.repository
    && positive(run.repository.id) && run.head_repository.id === run.repository.id
    && positive(run.workflow_id) && run.path === WORKFLOW && run.event === 'workflow_dispatch'
    && run.head_branch === 'main' && run.head_sha === seal.headSha
    && run.status === 'completed' && INTERRUPTED.has(run.conclusion)
    && time(run.created_at) <= time(run.run_started_at)
    && time(run.run_started_at) <= time(run.updated_at) && time(run.updated_at) <= clock, 'RUN_IDENTITY');
}

function exactStep(job, name) {
  const rows = job.steps.filter(step => step?.name === name);
  need(rows.length === 1 && positive(rows[0].number) && rows[0].status === 'completed', 'STEP_IDENTITY');
  return rows[0];
}

function assertExecutedStep(step, earliest, latest) {
  need(earliest <= time(step.started_at) && time(step.started_at) <= time(step.completed_at)
    && time(step.completed_at) <= latest, 'STEP_TIMING');
}

/**
 * Prove a recorded Pages deployment and interrupted ordinary integrated reseal.
 * The caller must authenticate the sealed integrated handoff before this read,
 * then recheck the live public target and current central state before any CAS.
 */
export async function readCompletedPublicPagesOccurrence({
  repository, currentMainHead, artifactSeal, token, fetchImpl = globalThis.fetch,
  now = new Date().toISOString(),
} = {}) {
  const clock = time(now);
  const seal = { ...artifactSeal };
  const created = time(seal?.createdAt);
  need(matches(repository, REPOSITORY) && !/\/\.{1,2}$/.test(repository)
    && matches(currentMainHead, HEAD) && matches(token, /^[^\s]{1,4096}$/)
    && typeof fetchImpl === 'function' && created <= clock
    && seal.schemaVersion === 'ravscore-operational-pages-artifact-seal-v1'
    && seal.repository === repository && seal.headSha === currentMainHead && seal.ref === 'refs/heads/main'
    && positive(seal.runId) && positive(seal.runAttempt) && seal.attemptId === `pages-${seal.runId}-${seal.runAttempt}`
    && positive(seal.artifactId) && positive(seal.artifactSizeBytes) && seal.artifactName === 'github-pages'
    && matches(seal.artifactDigestSha256, SHA) && matches(seal.targetPublicManifestSha256, SHA)
    && matches(seal.targetImplementationClosureSha256, SHA) && seal.privatePayloadIncluded === false, 'REQUEST');
  const json = metadataReader({ repository, token, fetchImpl });
  const runRoute = '/actions/runs/' + seal.runId;
  const attemptRoute = runRoute + '/attempts/' + seal.runAttempt;
  const run = await json(attemptRoute);
  assertRun(run, seal, clock);

  const { jobs, total_count: totalCount } = await json(attemptRoute + '/jobs?per_page=' + LIMIT) ?? {};
  need(Array.isArray(jobs) && jobs.length <= LIMIT && totalCount === jobs.length
    && jobs.every(job => positive(job?.id)) && new Set(jobs.map(job => job.id)).size === jobs.length, 'LIST_INCOMPLETE');
  const pages = jobs.filter(job => job.name === PAGES_CALL || job.name === PAGES_JOB
    || typeof job.name === 'string' && job.name.endsWith(' / ' + PAGES_JOB));
  need(pages.length === 1 && PAGES_JOBS.has(pages[0].name), 'PAGES_JOB');
  const [job] = pages;
  need(job.run_id === seal.runId && job.run_attempt === seal.runAttempt
    && job.head_sha === seal.headSha && job.head_branch === 'main'
    && job.status === 'completed' && INTERRUPTED.has(job.conclusion)
    && time(run.run_started_at) <= time(job.started_at)
    && time(job.started_at) <= time(job.completed_at) && time(job.completed_at) <= time(run.updated_at)
    && Array.isArray(job.steps) && job.steps.length <= 512, 'PAGES_JOB');

  const evidence = exactStep(job, EVIDENCE);
  const deploy = exactStep(job, DEPLOY);
  const verification = exactStep(job, VERIFY);
  const reseal = exactStep(job, RESEAL);
  need(evidence.number < deploy.number && deploy.number < verification.number && verification.number < reseal.number,
    'STEP_ORDER');
  need(evidence.conclusion === 'success', 'EVIDENCE_NOT_PUBLISHED');
  need(deploy.conclusion === 'success' && exactPagesAttemptStep([job], seal) === 'success', 'DEPLOY_NOT_SUCCESSFUL');
  need(verification.conclusion === 'success' || UNFINISHED.has(verification.conclusion), 'VERIFICATION_OUTCOME');
  need(UNFINISHED.has(reseal.conclusion), 'RESEAL_NOT_INTERRUPTED');
  const jobEnd = time(job.completed_at);
  assertExecutedStep(evidence, time(job.started_at), jobEnd);
  assertExecutedStep(deploy, time(evidence.completed_at), jobEnd);
  if (verification.conclusion !== 'skipped') assertExecutedStep(verification, time(deploy.completed_at), jobEnd);
  if (reseal.conclusion !== 'skipped') {
    need(verification.conclusion === 'success', 'RESEAL_BEFORE_VERIFICATION');
    assertExecutedStep(reseal, time(verification.completed_at), jobEnd);
  }

  const artifact = await json('/actions/artifacts/' + seal.artifactId);
  const artifactRun = artifact?.workflow_run;
  need(artifact?.id === seal.artifactId && artifact.name === seal.artifactName && artifact.expired === false
    && artifact.size_in_bytes === seal.artifactSizeBytes && artifact.digest === 'sha256:' + seal.artifactDigestSha256
    && artifactRun?.id === seal.runId && artifactRun.repository_id === run.repository.id
    && artifactRun.head_repository_id === run.repository.id && artifactRun.head_sha === seal.headSha
    && artifactRun.head_branch === 'main' && time(run.run_started_at) <= created
    && time(artifact.created_at) === created && created <= time(artifact.updated_at)
    && time(artifact.updated_at) <= time(evidence.started_at) && time(artifact.expires_at) > clock, 'ARTIFACT_IDENTITY');

  const latest = await json(runRoute);
  assertRun(latest, seal, clock);
  need(latest.workflow_id === run.workflow_id && latest.repository.id === run.repository.id
    && latest.created_at === run.created_at && latest.run_started_at === run.run_started_at
    && latest.conclusion === run.conclusion && time(job.completed_at) <= time(latest.updated_at), 'RUN_MOVED');
  const main = await json('/git/ref/heads/main');
  need(main?.ref === seal.ref && main.object?.type === 'commit' && main.object.sha === currentMainHead, 'MAIN_MOVED');

  return Object.freeze({
    kind: 'SOURCE_COMPLETED_PUBLIC_PAGES_OCCURRENCE_V1', sourceHead: seal.headSha,
    runId: seal.runId, runAttempt: seal.runAttempt, pagesJobId: job.id,
    artifactId: seal.artifactId, artifactDigestSha256: seal.artifactDigestSha256,
    publicManifestSha256: seal.targetPublicManifestSha256,
    targetImplementationClosureSha256: seal.targetImplementationClosureSha256,
    evidenceStepNumber: evidence.number, deployStepNumber: deploy.number, resealStepNumber: reseal.number,
    deployOutcome: 'success', publicVerificationOutcome: verification.conclusion,
    resealOutcome: reseal.conclusion, runConclusion: run.conclusion,
    livePublicVerificationPerformed: false, privatePayloadIncluded: false,
  });
}
