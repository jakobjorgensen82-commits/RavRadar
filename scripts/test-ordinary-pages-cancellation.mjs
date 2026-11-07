import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOrdinaryPagesCancellation, readOrdinaryPagesCancellation } from './lib/ordinary-pages-cancellation.mjs';

const repo = 'owner/forecast';
const head = 'a'.repeat(40);
const digest = 'b'.repeat(64);
const runId = 100;
const jobId = 200;
const artifactId = 300;
const now = '2026-11-07T12:30:00Z';
const start = '2026-11-07T11:07:39Z';
const end = '2026-11-07T11:18:04Z';
const jobEnd = '2026-11-07T11:18:07Z';
const jobName = 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact';
const input = { sourceHead: head, artifactId, stepStartedAt: start, stepCompletedAt: end, jobCompletedAt: jobEnd };
const logUrl = 'https://release-fixture.blob.core.windows.net/log?signature=fixture';
const unknownUrl = 'https://release-fixture.blob.core.windows.net.example.test/log';

function actionLog({ polls = true, headSha = head, id = artifactId } = {}) {
  const createTime = '2026-11-07T11:07:42.0000000Z';
  const lines = [
    [start, '##[group]Run actions/deploy-pages@v5'],
    [start, '  artifact_name: github-pages'],
    [start, '  timeout: 600000'],
    [createTime, 'Creating Pages deployment with payload:'],
    [createTime, '{'],
    [createTime, '  "artifact_id": ' + id + ','],
    [createTime, '  "pages_build_version": "' + headSha + '",'],
    [createTime, '  "oidc_token": "***"'],
    [createTime, '}'],
    ['2026-11-07T11:07:42.5000000Z', 'Created deployment for ' + headSha + ', ID: ' + headSha],
  ];
  if (polls) lines.push(['2026-11-07T11:17:28Z', 'Current status: syncing_files']);
  return lines.concat([
    ['2026-11-07T11:18:04.0830842Z', '##[error]Timeout reached, aborting!'],
    ['2026-11-07T11:18:04.0832334Z', '##[error]Timeout reached, aborting!'],
    ['2026-11-07T11:18:04.8405464Z', 'Canceled deployment with ID ' + headSha],
  ]).map(([stamp, body]) => stamp + ' ' + body).join('\n');
}

function fixture() {
  const run = {
    id: runId, run_attempt: 1, head_sha: head, head_branch: 'main', workflow_id: 9,
    path: '.github/workflows/run-current-weather-once.yml', event: 'workflow_dispatch',
    repository: { full_name: repo, id: 17 }, head_repository: { full_name: repo, id: 17 },
    status: 'completed', conclusion: 'failure', created_at: '2026-11-07T08:19:33Z',
    run_started_at: '2026-11-07T08:19:33Z', updated_at: '2026-11-07T11:18:28Z',
  };
  const jobs = { total_count: 1, jobs: [{
    name: jobName, id: jobId, run_id: runId, run_attempt: 1, head_sha: head, head_branch: 'main',
    status: 'completed', conclusion: 'failure', started_at: '2026-11-07T11:07:12Z', completed_at: jobEnd,
    steps: [
      { name: 'Publish exact target reentry evidence before any activation CAS', number: 16,
        status: 'completed', conclusion: 'success', started_at: '2026-11-07T11:07:33Z', completed_at: '2026-11-07T11:07:38Z' },
      { name: 'Deploy to GitHub Pages', number: 29, status: 'completed', conclusion: 'failure',
        started_at: start, completed_at: end },
    ],
  }] };
  const seal = {
    schemaVersion: 'ravscore-operational-pages-artifact-seal-v1', repository: repo, runId, runAttempt: 1,
    headSha: head, ref: 'refs/heads/main', attemptId: 'pages-100-1', artifactId,
    artifactName: 'github-pages', artifactDigestSha256: digest, artifactSizeBytes: 194128148,
    targetPublicManifestSha256: 'c'.repeat(64), targetImplementationClosureSha256: 'd'.repeat(64),
    createdAt: '2026-11-07T11:07:04.000Z', privatePayloadIncluded: false,
  };
  const artifact = {
    id: artifactId, name: 'github-pages', expired: false, digest: 'sha256:' + digest,
    size_in_bytes: seal.artifactSizeBytes, workflow_run: {
      id: runId, head_sha: head, head_branch: 'main', repository_id: 17, head_repository_id: 17,
    },
    created_at: '2026-11-07T11:07:04Z', updated_at: '2026-11-07T11:07:04Z',
    expires_at: '2026-11-21T11:06:54Z',
  };
  return {
    run, latest: { ...run }, jobs, seal, artifact, location: logUrl, redirectStatus: 302,
    log: actionLog({ polls: false }), logHeaders: {},
    main: { ref: 'refs/heads/main', object: { type: 'commit', sha: head } },
  };
}

function options(state, calls) {
  const base = '/repos/' + repo;
  const runRoute = '/actions/runs/' + runId;
  const attempt = runRoute + '/attempts/1';
  const routes = new Map([
    [attempt, state.run], [attempt + '/jobs?per_page=100', state.jobs],
    ['/actions/artifacts/' + artifactId, state.artifact], [runRoute, state.latest],
    ['/git/ref/heads/main', state.main],
  ]);
  return {
    repository: repo, currentMainHead: head, artifactSeal: state.seal, jobId, token: 'fixture-token', now,
    async fetchImpl(href, request) {
      const url = new URL(href);
      const headers = new Headers(request.headers);
      calls.push({ host: url.hostname, path: url.pathname, method: request.method,
        auth: headers.has('authorization'), redirect: request.redirect, credentials: request.credentials,
        signal: request.signal instanceof AbortSignal });
      if (href === logUrl) return new Response(state.log, { headers: state.logHeaders });
      assert.equal(url.origin, 'https://api.github.com');
      assert.equal(url.pathname.startsWith(base), true);
      const key = url.pathname.slice(base.length) + url.search;
      if (key === '/actions/jobs/' + jobId + '/logs') {
        return new Response(null, { status: state.redirectStatus, headers: { location: state.location } });
      }
      assert.equal(routes.has(key), true);
      return Response.json(routes.get(key));
    },
  };
}

const error = name => ({ code: 'ORDINARY_PAGES_CANCEL_' + name });

test('accepts both a recorded syncing poll and a cancellation with no poll', () => {
  assert.equal(parseOrdinaryPagesCancellation(actionLog(), input).syncingPolls, 1);
  const proof = parseOrdinaryPagesCancellation(actionLog({ polls: false }), input);
  assert.equal(proof.syncingPolls, 0);
  assert.equal(proof.timeoutLines, 2);
  assert.equal(proof.createToTimeoutMillis, 621583);
});

test('requires the exact Create, failure, cancellation and clock sequence', () => {
  const log = actionLog();
  for (const [sample, code] of [
    [actionLog({ id: artifactId + 1 }), 'CREATE_FRAME'],
    [actionLog({ headSha: 'b'.repeat(40) }), 'CREATE_FRAME'],
    [log.replace(/.*Created deployment.*\n/, ''), 'CREATE_COUNT'],
    [log.replace(/.*Canceled deployment.*/, ''), 'CANCEL_COUNT'],
    [log + '\n' + log.split('\n').at(-1), 'CANCEL_COUNT'],
    [log.replace('Current status: syncing_files', 'Current status: succeed'), 'STATUS_SHAPE'],
    [log.replaceAll('11:18:04.', '11:16:04.'), 'CANCEL_CLOCK'],
    [log.replace('Canceled deployment with ID ' + head, 'Canceled deployment with ID ' + 'b'.repeat(40)), 'CANCEL_ORDER'],
    [log + '\n' + start + ' ##[group]Run actions/deploy-pages@v5', 'ACTION_COUNT'],
    [log.replace('  timeout: 600000', '  timeout: 300000'), 'ACTION_TIMEOUT'],
  ]) assert.throws(() => parseOrdinaryPagesCancellation(sample, input), error(code));
});

test('binds one exact attempt and artifact and reads one unauthenticated redirected log', async () => {
  const calls = [];
  const state = fixture();
  const result = await readOrdinaryPagesCancellation(options(state, calls));
  assert.deepEqual([result.runId, result.runAttempt, result.jobId, result.deployStepNumber, result.artifactId],
    [runId, 1, jobId, 29, artifactId]);
  assert.deepEqual([result.publicationAuthorized, result.privatePayloadIncluded, result.syncingPolls], [false, false, 0]);
  assert.equal(result.artifactDigestSha256, digest);
  assert.equal(calls.length, 7);
  assert.ok(calls.every(call => call.method === 'GET' && call.credentials === 'omit' && call.signal));
  assert.equal(calls.filter(call => call.redirect === 'manual').length, 1);
  assert.deepEqual(calls.filter(call => !call.auth), [{
    host: 'release-fixture.blob.core.windows.net', path: '/log', method: 'GET',
    auth: false, redirect: 'error', credentials: 'omit', signal: true,
  }]);
  assert.equal(calls.at(-1).path, '/repos/' + repo + '/git/ref/heads/main');
});

test('refuses active, successful, ambiguous, expired or moved identities and untrusted log transport', async () => {
  const cases = [
    [state => { state.run.status = 'in_progress'; state.run.conclusion = null; }, 'RUN_IDENTITY', 1],
    [state => { state.run.conclusion = 'success'; }, 'RUN_IDENTITY', 1],
    [state => { state.run.path = '.github/workflows/recover.yml'; }, 'RUN_IDENTITY', 1],
    [state => { state.jobs.total_count++; }, 'LIST_INCOMPLETE', 2],
    [state => { state.jobs.jobs[0].run_attempt = 2; }, 'JOB_IDENTITY', 2],
    [state => { state.jobs.jobs.push({ ...state.jobs.jobs[0], id: jobId + 1 }); state.jobs.total_count++; }, 'JOB_COUNT', 2],
    [state => { state.jobs.jobs[0].steps[0].conclusion = 'skipped'; }, 'STEP_IDENTITY', 2],
    [state => { state.artifact.digest = 'sha256:' + head; }, 'ARTIFACT_IDENTITY', 3],
    [state => { state.artifact.expires_at = now; }, 'ARTIFACT_IDENTITY', 3],
    [state => { state.location = unknownUrl; }, 'LOG_REDIRECT', 4],
    [state => { state.redirectStatus = 307; }, 'LOG_REDIRECT', 4],
    [state => { state.logHeaders['content-length'] = '262145'; }, 'BODY_BOUND', 5],
    [state => { state.log = 'x'.repeat(262145); }, 'BODY_BOUND', 5],
    [state => { state.latest.updated_at = '2026-11-07T11:18:29Z'; }, 'RUN_MOVED', 6],
    [state => { state.main.object.sha = 'f'.repeat(40); }, 'MAIN_MOVED', 7],
  ];
  for (const [mutate, code, maximum] of cases) {
    const state = fixture();
    const calls = [];
    mutate(state);
    await assert.rejects(() => readOrdinaryPagesCancellation(options(state, calls)), error(code));
    assert.equal(calls.length, maximum, code);
  }
});
