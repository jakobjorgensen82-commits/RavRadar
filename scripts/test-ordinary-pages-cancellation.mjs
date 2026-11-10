import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readPreviousOrdinaryPagesFailure, readOrdinaryPagesEvidence,
  selectAutomaticCompletedPrivateRuntime } from './select-automatic-completed-private-runtime.mjs';
import { parseOrdinaryPagesCancellation, readOrdinaryPagesCancellation } from './lib/ordinary-pages-cancellation.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

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

const ordinaryRepo = { id: 1306858343, full_name: 'jakobjorgensen82-commits/RavRadar' };
const ordinaryRun = id => ({
  id, run_attempt: 1, repository: ordinaryRepo, head_repository: ordinaryRepo,
  head_sha: head, head_branch: 'main', event: 'workflow_dispatch',
  path: '.github/workflows/run-current-weather-once.yml', actor: { login: 'github-actions[bot]' },
  status: 'completed', conclusion: 'failure',
});
const ordinaryPages = (id, conclusion) => ({
  id, name: jobName, status: 'completed', conclusion,
  steps: [{ name: 'Deploy to GitHub Pages', status: 'completed', conclusion }],
});
const ordinaryContext = { head, consumerRunId: 500 };
const runList = (...workflow_runs) => ({ total_count: workflow_runs.length, workflow_runs });
const jobList = (...jobs) => ({ total_count: jobs.length, jobs });

test('a failed or skipped preflight does not hide the most recent attempted Pages deploy', async () => {
  const calls = [];
  const read = async route => {
    calls.push(route);
    if (calls.length === 1) return runList(ordinaryRun(101), ordinaryRun(103), ordinaryRun(102));
    if (route.includes('/103/')) return jobList();
    if (route.includes('/102/')) return jobList(ordinaryPages(202, 'skipped'));
    assert.match(route, /\/101\/attempts\/1\/jobs/);
    return jobList(ordinaryPages(201, 'failure'));
  };
  const previous = await readPreviousOrdinaryPagesFailure(read, ordinaryContext);
  assert.deepEqual([previous.kind, previous.run.id, previous.job.id], ['deploy', 101, 201]);
  assert.equal(calls.length, 4);
});

test('a later completed Pages deploy takes precedence over an older failure', async () => {
  let calls = 0;
  const read = async route => {
    if (++calls === 1) return runList(ordinaryRun(101), { ...ordinaryRun(102), conclusion: 'success' });
    assert.match(route, /\/102\/attempts\/1\/jobs/);
    return jobList(ordinaryPages(202, 'success'));
  };
  assert.equal(await readPreviousOrdinaryPagesFailure(read, ordinaryContext), null);
  assert.equal(calls, 2);
});

test('an unknown outcome at the Pages deploy step stops instead of treating it as a skipped run', async () => {
  let calls = 0;
  const read = async () => ++calls === 1
    ? runList({ ...ordinaryRun(102), conclusion: 'cancelled' })
    : jobList(ordinaryPages(202, 'cancelled'));
  await assert.rejects(readPreviousOrdinaryPagesFailure(read, ordinaryContext), /PAGES_AUTO_PRIOR_DEPLOY_UNKNOWN/);
});

test('277-shaped completed B/S reentry accepts only the exact terminal exhausted-404 seal marker', async () => {
  const producer = { ...ordinaryRun(103), created_at: '2026-11-07T16:19:30Z',
    run_started_at: '2026-11-07T16:19:31Z', updated_at: '2026-11-07T18:56:00Z' };
  const commonJob = { run_id: producer.id, run_attempt: 1, head_sha: head, head_branch: 'main', status: 'completed' };
  const fixtureSteps = [
    ['Update central weather cache', 'success'],
    ['Refuse loss of previously valid public weather on identical coastal hours', 'success'],
    ['Validate critical production artifact after fresh weather and current provenance', 'success'],
    ['Run release governance gate after refreshed data validation', 'success'],
    ['Publish bounded private runtime with one protected rollback generation', 'success'],
    ['Publish atomic RavScore checkpoint to protected admin storage', 'success'],
    ['Audit the complete Pages artifact for private runtime material', 'success'],
    ['Upload GitHub Pages artifact', 'success', '2026-11-07T18:54:00Z', '2026-11-07T18:54:05Z'],
    ['Resolve and seal the exact uploaded Pages artifact', 'failure', '2026-11-07T18:54:06Z', '2026-11-07T18:54:38Z'],
    ['Confirm exhausted exact Pages artifact metadata visibility', 'success', '2026-11-07T18:54:39Z', '2026-11-07T18:54:41Z'],
    ['Upload privacy-safe operational handoff evidence after Pages artifact seal', 'skipped'],
  ].map(([name, conclusion, started_at, completed_at], index) =>
    ({ name, status: 'completed', conclusion, number: index + 210, started_at, completed_at }));
  const build = { ...commonJob, id: 203, name: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    conclusion: 'failure', started_at: '2026-11-07T16:19:40Z', completed_at: '2026-11-07T18:54:45Z', steps: fixtureSteps };
  const pages = { ...commonJob, id: 204, name: jobName, conclusion: 'skipped', steps: [] };
  const artifact = { id: artifactId, name: 'github-pages', expired: false, digest: 'sha256:' + digest, size_in_bytes: 600,
    created_at: '2026-11-07T18:54:02Z', updated_at: '2026-11-07T18:54:02Z', expires_at: '2099-11-07T00:00:00Z',
    workflow_run: { id: producer.id, head_sha: head, head_branch: 'main', repository_id: ordinaryRepo.id,
      head_repository_id: ordinaryRepo.id } };
  const calls = [];
  const read = async route => {
    calls.push(route);
    if (route.startsWith('/actions/workflows/')) return runList(producer);
    if (route.endsWith('/attempts/1/jobs?per_page=100')) return jobList(build, pages);
    if (route.endsWith('/artifacts?per_page=100')) return { artifacts: [artifact], total_count: 1 };
    if (route === '/actions/runs/103') return producer;
    if (route === '/git/ref/heads/main') return { ref: 'refs/heads/main', object: { type: 'commit', sha: head } };
    assert.fail('Unexpected GitHub read: ' + route);
  };
  const binding = { modelId: 'fixture', stateSchemaVersion: '6.0.0', modelContractSha256: digest, modelBundleSha256: digest };
  const prior = { complete: true, zoneCount: 210, coastalPartCount: 673, datasetId: 'prior',
    productionReferenceAt: '2026-11-07T12:00:00Z', generatedAt: '2026-11-07T12:25:00Z', ravScoreModelBinding: binding };
  const saved = { datasetId: 'saved', productionReferenceAt: '2026-11-07T16:00:00Z',
    generatedAt: '2026-11-07T17:35:21Z', bundleContentSha256: digest, modelBinding: binding, sourceHead: head };
  const activeFor = manifest => ({ model: 'integrated', status: 'INTEGRATED_ACTIVE', pending: false,
    datasetId: manifest.datasetId, productionReferenceAt: manifest.productionReferenceAt,
    publicManifestSha256: sha256CanonicalJson(manifest) });
  const env = { RAVRADAR_AUTOMATIC_COMPLETED_INPUTS: '{}', GITHUB_REPOSITORY: ordinaryRepo.full_name,
    GITHUB_REF: 'refs/heads/main', GITHUB_WORKFLOW: 'Run current RavRadar weather once', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_RUN_ATTEMPT: '1', GITHUB_RUN_ID: String(ordinaryContext.consumerRunId), GITHUB_ACTOR: 'github-actions[bot]',
    GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', GITHUB_SHA: head, RAVRADAR_AUTOMATIC_COMPLETED_REENTRY_ACTION: 'NONE' };
  const select = (publicManifest = prior) => selectAutomaticCompletedPrivateRuntime(env, {
    readPin: async () => ({ descriptor: saved, pin: digest }),
    readPublic: async () => publicManifest,
    readActive: async () => activeFor(publicManifest),
    readEvidence: (saved, context) => readOrdinaryPagesEvidence({ read, saved, context }),
  });
  const previous = await readPreviousOrdinaryPagesFailure(read, ordinaryContext);
  assert.deepEqual([previous.kind, previous.run.id], ['visibility', 103]);
  assert.deepEqual(await select(), { mode: 'COMPLETED', targetHour: saved.productionReferenceAt, pin: digest });
  assert.equal(calls.filter(route => route.endsWith('/artifacts?per_page=100')).length, 1);
  assert.equal(calls.some(route => route.includes('/logs')), false);
  artifact.digest = 'mismatch';
  await assert.rejects(select(), /PAGES_AUTO_VISIBILITY_ARTIFACT_IDENTITY/);
  artifact.digest = 'sha256:' + digest;
  fixtureSteps[9].conclusion = 'failure'; // The same-token authorization check failed.
  await assert.rejects(readPreviousOrdinaryPagesFailure(read, ordinaryContext), /PAGES_AUTO_VISIBILITY_STEP_OUTCOME/);
  fixtureSteps[9].conclusion = 'skipped'; // Auth, hash and unknown failures never produce the marker.
  assert.equal(await readPreviousOrdinaryPagesFailure(read, ordinaryContext), null);
  const before = calls.length;
  const alreadyPublic = { ...prior, datasetId: saved.datasetId, generatedAt: saved.generatedAt,
    productionReferenceAt: saved.productionReferenceAt };
  assert.deepEqual(await select(alreadyPublic), { mode: 'FETCH' });
  assert.equal(calls.length, before);
});


test('classifies only an authenticated cancelled automatic replay of the original saved target', async () => {
  const at = second => new Date(Date.UTC(2026, 10, 7, 16, 0, second)).toISOString();
  const run = (id, begin, end) => ({ ...ordinaryRun(id), workflow_id: 9,
    triggering_actor: { login: 'github-actions[bot]' }, created_at: at(begin), run_started_at: at(begin), updated_at: at(end) });
  const original = run(101, 0, 100);
  const replay = run(102, 200, 900);
  const job = (owner, id, name, conclusion, begin, end, steps) => ({
    ...ordinaryPages(id, conclusion), name, run_id: owner.id, run_attempt: 1, head_sha: head, head_branch: 'main',
    started_at: at(begin), completed_at: at(end),
    steps: steps.map(([stepName, outcome], index) => ({
      name: stepName, number: index + 1, status: 'completed', conclusion: outcome,
      started_at: at(begin + index), completed_at: at(begin + index + 1),
    })),
  });
  const noLoss = 'Refuse loss of previously valid public weather on identical coastal hours';
  const publishB = 'Publish bounded private runtime with one protected rollback generation';
  const publishS = 'Publish atomic RavScore checkpoint to protected admin storage';
  const providerSteps = ['Update DMI bulk model cache', 'Fill only exact-hour DMI gaps from Copernicus',
    'Fill only the exact remaining current gaps from Open-Meteo', 'Update central weather cache'];
  const build = 'Build and prepare weather production through reusable workflow / build-and-prepare';
  const originalPages = job(original, 202, jobName, 'failure', 70, 90, [['Deploy to GitHub Pages', 'failure']]);
  const originalJobs = jobList(job(original, 201, build, 'success', 5, 65, [
    ['Update central weather cache', 'success'], [noLoss, 'success'], [publishB, 'success'], [publishS, 'success'],
  ]), originalPages);
  const lock = job(replay, 210, 'Lock one normal run to exact current main and UTC hour', 'success', 201, 220, [
    ['Identify the default scheduled weather caller', 'success'],
    ['Select provider-free continuation for the default scheduled caller', 'success'],
    ['Lock the canonical UTC production hour', 'skipped'],
    ['Require one canonical target hour and completed-runtime decision', 'success'],
  ]);
  const repeatedBuild = job(replay, 211, build, 'success', 230, 300, [
    ['Require the separate completed B request and actual restored originals', 'success'],
    ['Read actual operational and profile rows for completed B admission', 'success'],
    ['Restore the actual newest protected checkpoint for completed B admission', 'success'],
    ['Admit only the exact authenticated completed B and matching central S', 'success'],
    ...providerSteps.map(name => [name, 'skipped']),
    [noLoss, 'success'],
    ['Validate critical production artifact after fresh weather and current provenance', 'success'],
    ['Run release governance gate after refreshed data validation', 'success'],
    ['Refuse completed-runtime target or calibration mismatch before any new S or B publication', 'success'],
    [publishB, 'success'], [publishS, 'success'],
    ['Audit the complete Pages artifact for private runtime material', 'success'],
    ['Upload GitHub Pages artifact', 'success'],
    ['Resolve and seal the exact uploaded Pages artifact', 'success'],
    ['Confirm exhausted exact Pages artifact metadata visibility', 'skipped'],
    ['Upload privacy-safe operational handoff evidence after Pages artifact seal', 'success'],
  ]);
  const replayPages = job(replay, 212, jobName, 'failure', 320, 850, [
    ['Require horizon-valid weather immediately before Pages deployment', 'success'],
    ['Require monotonic public generation immediately before Pages', 'success'],
    ['Deploy to GitHub Pages', 'failure'],
    ['Verify deployed exact model, implementation and 210/673 artifact', 'skipped'],
    ['Seal exact verified deployment terminal', 'failure'],
  ]);
  const replayJobs = jobList(lock, repeatedBuild, replayPages,
    job(replay, 213, 'Require a verified current-weather deployment', 'failure', 860, 870,
      [['Summarize and require the complete normal production path', 'failure']]));
  const binding = { modelId: 'fixture', stateSchemaVersion: '6.0.0', modelContractSha256: digest, modelBundleSha256: digest };
  const prior = { complete: true, zoneCount: 210, coastalPartCount: 673, datasetId: 'prior',
    productionReferenceAt: '2026-11-07T12:00:00Z', generatedAt: '2026-11-07T12:25:00Z', ravScoreModelBinding: binding };
  const target = { ...prior, datasetId: 'saved', productionReferenceAt: '2026-11-07T16:00:00Z', generatedAt: at(30) };
  const saved = { datasetId: target.datasetId, productionReferenceAt: target.productionReferenceAt,
    generatedAt: target.generatedAt, bundleContentSha256: digest, modelBinding: binding, sourceHead: head };
  const env = { RAVRADAR_AUTOMATIC_COMPLETED_INPUTS: '{}', GITHUB_REPOSITORY: ordinaryRepo.full_name,
    GITHUB_REF: 'refs/heads/main', GITHUB_WORKFLOW: 'Run current RavRadar weather once', GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_RUN_ATTEMPT: '1', GITHUB_RUN_ID: String(ordinaryContext.consumerRunId), GITHUB_ACTOR: 'github-actions[bot]',
    GITHUB_TRIGGERING_ACTOR: 'github-actions[bot]', GITHUB_SHA: head, RAVRADAR_AUTOMATIC_COMPLETED_REENTRY_ACTION: 'NONE' };
  const calls = [];
  async function select({ hasReplay = true, changeManifest = false, movePin = false, movePublic = false, missingCancel = false } = {}) {
    let pins = 0, publicReads = 0;
    const read = async route => {
      if (route.startsWith('/actions/workflows/')) return hasReplay ? runList(original, replay) : runList(original);
      if (route === '/actions/runs/101/attempts/1/jobs?per_page=100') return originalJobs;
      if (route === '/actions/runs/102/attempts/1/jobs?per_page=100') return replayJobs;
      assert.fail('Unexpected metadata read: ' + route);
    };
    const previousFailure = await readPreviousOrdinaryPagesFailure(read, ordinaryContext);
    return selectAutomaticCompletedPrivateRuntime(env, {
      readPin: async () => ({ descriptor: saved, pin: ++pins === 2 && movePin ? 'c'.repeat(64) : digest }),
      readPublic: async () => ++publicReads === 2 && movePublic ? { ...prior, datasetId: 'moved' } : prior,
      readActive: async () => ({ model: 'integrated', status: 'INTEGRATED_ACTIVE', pending: false,
        datasetId: prior.datasetId, productionReferenceAt: prior.productionReferenceAt,
        publicManifestSha256: sha256CanonicalJson(prior) }),
      readEvidence: (saved, context) => readOrdinaryPagesEvidence({
        read, saved, context, previousFailure,
        readHandoff: async ({ run }) => {
          calls.push(['handoff', run.id]);
          const targetManifest = changeManifest && run.id === replay.id ? { ...target, diagnostic: true } : target;
          const targetManifestSha256 = sha256CanonicalJson(targetManifest);
          return { targetManifest, targetManifestSha256,
            seal: { artifactName: 'github-pages', ref: 'refs/heads/main', headSha: head,
              runId: run.id, runAttempt: 1, artifactId: run.id + 200, artifactDigestSha256: digest,
              targetPublicManifestSha256: targetManifestSha256, targetImplementationClosureSha256: 'd'.repeat(64) } };
        },
        readCancellation: async ({ artifactSeal, jobId: pagesId }) => {
          calls.push(['cancellation', artifactSeal.runId]);
          assert.equal(pagesId, artifactSeal.runId === replay.id ? replayPages.id : originalPages.id);
          if (missingCancel && artifactSeal.runId === replay.id) throw new Error('ORDINARY_PAGES_CANCEL_CANCEL_COUNT');
          return { runId: artifactSeal.runId, runAttempt: 1, jobId: pagesId, sourceHead: head,
            artifactId: artifactSeal.artifactId, artifactDigestSha256: digest };
        },
      }),
    });
  }
  const expected = { mode: 'COMPLETED', targetHour: saved.productionReferenceAt, pin: digest };
  assert.deepEqual(await select({ hasReplay: false }), expected);
  assert.deepEqual(calls.splice(0), [['handoff', 101], ['cancellation', 101]]);
  const matchedReplay = await select();
  assert.match(matchedReplay.repeatAnchor, /^[a-f0-9]{64}$/);
  assert.deepEqual(matchedReplay, { ...expected, repeatAnchor: matchedReplay.repeatAnchor, cancelledReplay: {
    kind: 'PAGES_AUTOMATIC_REPLAY_CANCELLED_CONFIRMED', runId: 102, runAttempt: 1, jobId: 212, artifactId: 302,
    artifactDigestSha256: digest, producerRunId: 101, producerRunAttempt: 1, headSha: head,
    targetPublicManifestSha256: sha256CanonicalJson(target), publicManifestSha256: sha256CanonicalJson(prior),
  } });
  assert.deepEqual(calls.splice(0).sort(), [
    ['cancellation', 101], ['cancellation', 102], ['handoff', 101], ['handoff', 102],
  ]);
  const canonical = lock.steps.find(step => step.name === 'Lock the canonical UTC production hour');
  canonical.conclusion = 'success';
  assert.deepEqual(await select(), expected);
  canonical.conclusion = 'skipped';
  const provider = repeatedBuild.steps.find(step => step.name === providerSteps[0]);
  provider.conclusion = 'success';
  await assert.rejects(select(), /PAGES_AUTO_REPLAY_STEP_OUTCOME/);
  provider.conclusion = 'skipped';
  await assert.rejects(select({ changeManifest: true }), /PAGES_AUTO_REPLAY_TARGET_DRIFT/);
  await assert.rejects(select({ missingCancel: true }), /ORDINARY_PAGES_CANCEL_CANCEL_COUNT/);
  await assert.rejects(select({ movePin: true }), /PAGES_AUTO_POINTER_CHANGED/);
  await assert.rejects(select({ movePublic: true }), /PAGES_AUTO_PUBLIC_CHANGED/);
});
