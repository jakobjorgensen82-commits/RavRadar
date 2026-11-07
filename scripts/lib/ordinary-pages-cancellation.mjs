import { createHash } from 'node:crypto';

const PREFIX = 'ORDINARY_PAGES_CANCEL_';
const WORKFLOW = '.github/workflows/run-current-weather-once.yml';
const JOB = 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact';
const DEPLOY = 'Deploy to GitHub Pages';
const EVIDENCE = 'Publish exact target reentry evidence before any activation CAS';
const ACTION = '##[group]Run actions/deploy-pages@v5';
const CREATE = 'Creating Pages deployment with payload:';
const TIMEOUT = '##[error]Timeout reached, aborting!';
const HEAD = /^[a-f0-9]{40}$/;
const SHA = /^[a-f0-9]{64}$/;
const REPO = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9_.-]{1,100}$/;
const UTC = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:[.](\d{1,7}))?Z$/;
const LOG_RECORD = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[.]\d{1,7})?Z) (.*)$/;
const NS_SECOND = 1_000_000_000n;
const LOG_LIMIT = 256 * 1024;
const META_LIMIT = 1024 * 1024;
const MAX_LINES = 1000;
const matches = (value, pattern) => typeof value === 'string' && pattern.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;

function need(value, reason) {
  if (!value) throw Object.assign(new Error(PREFIX + reason), { code: PREFIX + reason });
}

function time(value) {
  const fields = typeof value === 'string' && UTC.exec(value);
  need(fields, 'TIME');
  const second = Date.parse(fields[1] + 'Z');
  need(Number.isFinite(second) && new Date(second).toISOString() === fields[1] + '.000Z', 'TIME');
  return BigInt(second) * 1_000_000n + BigInt((fields[2] ?? '').padEnd(9, '0'));
}

function one(rows, reason) {
  need(rows.length === 1, reason);
  return rows[0];
}

/** Pure verification of the v5 action's exact logged Create and cancellation. */
export function parseOrdinaryPagesCancellation(log, {
  sourceHead, artifactId, stepStartedAt, stepCompletedAt, jobCompletedAt,
} = {}) {
  need(matches(sourceHead, HEAD) && positive(artifactId), 'LOG_IDENTITY');
  need(typeof log === 'string' && Buffer.byteLength(log) > 0 && Buffer.byteLength(log) <= LOG_LIMIT, 'LOG_BOUND');
  const lines = log.split(/\r?\n/);
  need(lines.length <= MAX_LINES, 'LOG_BOUND');
  const records = lines.flatMap((line, index) => {
    const parsed = LOG_RECORD.exec(line);
    return parsed ? [{ index, at: time(parsed[1]), body: parsed[2] }] : [];
  });
  const select = (rows, predicate) => rows.flatMap((row, index) => predicate(row.body) ? [index] : []);
  const begin = one(select(records, body => body === ACTION), 'ACTION_COUNT');
  const next = records.findIndex((row, index) => index > begin && row.body.startsWith('##[group]Run '));
  const action = records.slice(begin, next === -1 ? undefined : next);
  const p = one(select(records, body => body.startsWith(CREATE)), 'CREATE_COUNT') - begin;
  const c = one(select(records, body => body.startsWith('Created deployment for ')), 'CREATE_COUNT') - begin;
  const k = one(select(records, body => body.startsWith('Canceled deployment with ID ')), 'CANCEL_COUNT') - begin;
  const budget = one(select(action, body => /^\s*timeout: 600000$/.test(body)), 'ACTION_TIMEOUT');
  const name = one(select(action, body => /^\s*artifact_name: github-pages$/.test(body)), 'ACTION_ARTIFACT_NAME');
  need(name < budget && budget < p && p + 6 === c && c < k && k < action.length, 'CREATE_FRAME');
  const create = action.slice(p, c + 1);
  const expected = [
    CREATE, '{', '"artifact_id": ' + artifactId + ',',
    '"pages_build_version": "' + sourceHead + '",', '"oidc_token": "***"', '}',
    'Created deployment for ' + sourceHead + ', ID: ' + sourceHead,
  ];
  need(create.every((row, index) => row.index === create[0].index + index
    && row.body.trim() === expected[index]), 'CREATE_FRAME');

  const status = select(action, body => body.startsWith('Current status:'));
  const syncing = status.filter(index => action[index].body === 'Current status: syncing_files');
  const blank = status.filter(index => action[index].body.trimEnd() === 'Current status:');
  const timeout = select(action, body => body === TIMEOUT);
  need(timeout.length === 1 || timeout.length === 2
    && timeout[1] === timeout[0] + 1 && action[timeout[1]].index === action[timeout[0]].index + 1
    && action[timeout[1]].at > action[timeout[0]].at
    && action[timeout[1]].at - action[timeout[0]].at < NS_SECOND, 'TIMEOUT_COUNT');
  need(blank.length <= 1 && status.length === syncing.length + blank.length
    && status.every(index => c < index && index < timeout[0])
    && (blank.length === 0 || blank[0] === timeout[0] - 1), 'STATUS_SHAPE');
  need(c < timeout[0] && timeout.at(-1) < k
    && action[k].body === 'Canceled deployment with ID ' + sourceHead, 'CANCEL_ORDER');

  const start = time(stepStartedAt);
  const end = time(stepCompletedAt);
  const jobEnd = time(jobCompletedAt);
  const clocks = [0, name, budget, ...Array.from({ length: 7 }, (_, i) => p + i),
    ...syncing, ...blank, ...timeout, k].map(index => action[index].at);
  const elapsed = action[timeout[0]].at - action[c].at;
  need(clocks.every((clock, index) => index === 0 || clock >= clocks[index - 1])
    && start <= clocks[0] && clocks[0] < clocks.at(-1) && clocks.at(-1) < end + NS_SECOND
    && clocks.at(-1) <= jobEnd && action[timeout[0]].at - action[0].at >= 600n * NS_SECOND
    && elapsed > 0n, 'CANCEL_CLOCK');
  return Object.freeze({
    syncingPolls: syncing.length,
    timeoutLines: timeout.length,
    createToTimeoutMillis: Math.round(Number(elapsed) / 1_000_000),
    logSha256: createHash('sha256').update(log).digest('hex'),
  });
}

function reader({ repository, token, fetchImpl }) {
  const signal = AbortSignal.timeout(30_000);
  const root = 'https://api.github.com/repos/' + repository;
  const auth = {
    Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'RavRadar-ordinary-pages-cancellation',
    'Cache-Control': 'no-cache', 'Accept-Encoding': 'identity',
  };
  let requests = 0;
  async function get(url, headers, redirect) {
    need(++requests <= 7 && !signal.aborted, 'REQUEST_BOUND');
    try {
      return await fetchImpl(url, { method: 'GET', headers, redirect, signal, credentials: 'omit' });
    } catch {
      need(false, signal.aborted ? 'TRANSPORT_TIMEOUT' : 'TRANSPORT');
    }
  }
  async function body(response, limit) {
    need(response?.body?.getReader, 'HTTP_BODY');
    const stream = response.body.getReader();
    try {
      need(response.status === 200 && response.redirected === false, 'HTTP_STATUS');
      const length = response.headers.get('content-length');
      need(length === null || matches(length, /^(0|[1-9][0-9]*)$/) && Number(length) <= limit, 'BODY_BOUND');
      need([null, 'identity'].includes(response.headers.get('content-encoding')), 'BODY_ENCODING');
      const chunks = [];
      let size = 0;
      for (;;) {
        const { done, value } = await stream.read();
        need(!signal.aborted, 'TRANSPORT_TIMEOUT');
        if (done) break;
        need(value instanceof Uint8Array, 'HTTP_BODY');
        size += value.byteLength;
        need(size <= limit, 'BODY_BOUND');
        chunks.push(Buffer.from(value));
      }
      need(length === null || size === Number(length), 'BODY_LENGTH');
      return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
    } catch (error) {
      if (error?.message?.startsWith(PREFIX)) throw error;
      need(false, signal.aborted ? 'TRANSPORT_TIMEOUT' : 'HTTP_BODY');
    } finally {
      await stream.cancel().catch(() => {});
      stream.releaseLock();
    }
  }
  return {
    async json(route) {
      const response = await get(root + route, auth, 'error');
      if (/rel="?next(?=[";,\s]|$)/i.test(response?.headers?.get('link') ?? '')) {
        await response.body?.cancel().catch(() => {});
        need(false, 'LIST_INCOMPLETE');
      }
      const text = await body(response, META_LIMIT);
      try { return JSON.parse(text); }
      catch { need(false, 'JSON_BODY'); }
    },
    async log(jobId) {
      const response = await get(root + '/actions/jobs/' + jobId + '/logs', auth, 'manual');
      const location = response?.headers?.get('location');
      await response?.body?.cancel().catch(() => {});
      need(response?.status === 302 && response.redirected === false
        && typeof location === 'string' && location.length <= 4096 && !/[,\r\n]/.test(location), 'LOG_REDIRECT');
      let url;
      try { url = new URL(location); } catch { need(false, 'LOG_REDIRECT'); }
      need(url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash
        && (url.hostname.endsWith('.blob.core.windows.net') || url.hostname.endsWith('.githubusercontent.com')),
      'LOG_REDIRECT');
      return body(await get(url.href, { 'Accept-Encoding': 'identity' }, 'error'), LOG_LIMIT);
    },
  };
}

function assertRun(run, seal, now) {
  need(run?.id === seal.runId && run.run_attempt === seal.runAttempt
    && run.head_sha === seal.headSha && run.head_branch === 'main'
    && run.path === WORKFLOW && run.event === 'workflow_dispatch'
    && run.repository?.full_name === seal.repository && run.head_repository?.full_name === seal.repository
    && positive(run.repository.id) && run.head_repository.id === run.repository.id && positive(run.workflow_id)
    && run.status === 'completed' && run.conclusion === 'failure'
    && time(run.created_at) <= time(run.run_started_at)
    && time(run.run_started_at) <= time(run.updated_at) && time(run.updated_at) <= now,
  'RUN_IDENTITY');
}

function step(job, name) {
  return one(job.steps.filter(value => value?.name === name), 'STEP_COUNT');
}

/**
 * Read proof for one failed ordinary Pages job and its already authenticated
 * handoff seal. The caller must select the latest preceding ordinary producer
 * and prove its action, current B/S, live predecessor and exclusive writer.
 */
export async function readOrdinaryPagesCancellation({
  repository, currentMainHead, artifactSeal, jobId, token,
  fetchImpl = globalThis.fetch, now = new Date().toISOString(),
} = {}) {
  const seal = { ...artifactSeal };
  const clock = time(now);
  need(matches(repository, REPO) && !/\/\.{1,2}$/.test(repository)
    && matches(currentMainHead, HEAD) && matches(token, /^[^\s]{1,4096}$/)
    && positive(jobId) && typeof fetchImpl === 'function'
    && seal.schemaVersion === 'ravscore-operational-pages-artifact-seal-v1'
    && seal.repository === repository && seal.headSha === currentMainHead && seal.ref === 'refs/heads/main'
    && positive(seal.runId) && positive(seal.runAttempt)
    && seal.attemptId === 'pages-' + seal.runId + '-' + seal.runAttempt
    && positive(seal.artifactId) && positive(seal.artifactSizeBytes) && seal.artifactName === 'github-pages'
    && matches(seal.artifactDigestSha256, SHA) && matches(seal.targetPublicManifestSha256, SHA)
    && matches(seal.targetImplementationClosureSha256, SHA) && seal.privatePayloadIncluded === false, 'REQUEST');
  const api = reader({ repository, token, fetchImpl });
  const runRoute = '/actions/runs/' + seal.runId;
  const attemptRoute = runRoute + '/attempts/' + seal.runAttempt;
  const run = await api.json(attemptRoute);
  assertRun(run, seal, clock);
  const { jobs, total_count: total } = await api.json(attemptRoute + '/jobs?per_page=100') ?? {};
  need(Array.isArray(jobs) && jobs.length <= 100 && total === jobs.length
    && jobs.every(job => positive(job?.id)) && new Set(jobs.map(job => job.id)).size === jobs.length, 'LIST_INCOMPLETE');
  const job = one(jobs.filter(value => value.name === JOB || value.name === 'Deploy prepared Pages artifact'
    || typeof value.name === 'string' && value.name.endsWith(' / Deploy prepared Pages artifact')), 'JOB_COUNT');
  need(job.id === jobId && job.name === JOB && job.run_id === seal.runId && job.run_attempt === seal.runAttempt
    && job.head_sha === seal.headSha && job.head_branch === 'main' && job.status === 'completed'
    && job.conclusion === 'failure' && time(run.run_started_at) <= time(job.started_at)
    && time(job.started_at) <= time(job.completed_at) && time(job.completed_at) <= time(run.updated_at)
    && Array.isArray(job.steps) && job.steps.length <= 256 && job.steps.every(row => positive(row?.number))
    && new Set(job.steps.map(row => row.number)).size === job.steps.length, 'JOB_IDENTITY');
  const deploy = step(job, DEPLOY);
  const evidence = step(job, EVIDENCE);
  need(deploy.status === 'completed' && deploy.conclusion === 'failure'
    && evidence.status === 'completed' && evidence.conclusion === 'success' && evidence.number < deploy.number
    && time(job.started_at) <= time(evidence.started_at) && time(evidence.started_at) <= time(evidence.completed_at)
    && time(evidence.completed_at) <= time(deploy.started_at)
    && time(deploy.started_at) < time(deploy.completed_at) && time(deploy.completed_at) <= time(job.completed_at), 'STEP_IDENTITY');

  const artifact = await api.json('/actions/artifacts/' + seal.artifactId);
  const link = artifact?.workflow_run;
  need(artifact?.id === seal.artifactId && artifact.name === seal.artifactName && artifact.expired === false
    && artifact.digest === 'sha256:' + seal.artifactDigestSha256 && artifact.size_in_bytes === seal.artifactSizeBytes
    && link?.id === seal.runId && link.head_sha === seal.headSha && link.head_branch === 'main'
    && link.repository_id === run.repository.id && link.head_repository_id === run.repository.id
    && time(run.run_started_at) <= time(artifact.created_at) && time(artifact.created_at) === time(seal.createdAt)
    && time(artifact.created_at) <= time(artifact.updated_at) && time(artifact.updated_at) <= time(evidence.started_at)
    && time(artifact.expires_at) > clock, 'ARTIFACT_IDENTITY');

  const parsed = parseOrdinaryPagesCancellation(await api.log(job.id), {
    sourceHead: seal.headSha, artifactId: artifact.id, stepStartedAt: deploy.started_at,
    stepCompletedAt: deploy.completed_at, jobCompletedAt: job.completed_at,
  });
  const latest = await api.json(runRoute);
  assertRun(latest, seal, clock);
  need(latest.workflow_id === run.workflow_id && latest.repository.id === run.repository.id
    && latest.created_at === run.created_at && latest.run_started_at === run.run_started_at
    && latest.updated_at === run.updated_at, 'RUN_MOVED');
  const main = await api.json('/git/ref/heads/main');
  need(main?.ref === seal.ref && main.object?.type === 'commit' && main.object.sha === currentMainHead, 'MAIN_MOVED');
  return Object.freeze({
    kind: 'ORDINARY_PAGES_CANCELLED_OCCURRENCE_V1',
    repository, sourceHead: seal.headSha, runId: seal.runId, runAttempt: seal.runAttempt,
    jobId: job.id, deployStepNumber: deploy.number, artifactId: seal.artifactId,
    artifactDigestSha256: seal.artifactDigestSha256, targetPublicManifestSha256: seal.targetPublicManifestSha256,
    ...parsed, privatePayloadIncluded: false, publicationAuthorized: false,
  });
}
