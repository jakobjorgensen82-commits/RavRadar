import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readClosedUnpublishedSourcePagesOccurrence, readCompletedPublicPagesOccurrence } from './lib/source-completed-public-pages-occurrence.mjs';
import { findSourceCompletedStageOccurrence } from './lib/source-completed-stage-occurrence.mjs';
import { sourceCompletedStageArtifactName } from './lib/source-completed-stage-artifact-identity.mjs';
import { assertAutomaticCompletedSourceRequest } from './completed-private-runtime-admission.mjs';

const repository = 'owner/repo';
const head = 'a'.repeat(40);
const digest = 'b'.repeat(64);
const runId = 23;
const runAttempt = 2;
const artifactId = 73;
const at = minute => `2026-11-07T10:${String(minute).padStart(2, '0')}:00Z`;
const canonical = minute => new Date(at(minute)).toISOString();
const runRoute = '/actions/runs/' + runId;
const attemptRoute = runRoute + '/attempts/' + runAttempt;
const routes = [
  attemptRoute, attemptRoute + '/jobs?per_page=100', '/actions/artifacts/' + artifactId,
  runRoute, '/git/ref/heads/main',
];

function step(name, number, conclusion, start, end) {
  return {
    name, number, conclusion, status: 'completed',
    started_at: start === null ? null : at(start), completed_at: end === null ? null : at(end),
  };
}

function fixture() {
  const run = {
    id: runId, run_attempt: runAttempt, repository: { id: 17, full_name: repository },
    head_repository: { id: 17, full_name: repository }, workflow_id: 31,
    path: '.github/workflows/run-current-weather-once.yml', event: 'workflow_dispatch',
    head_branch: 'main', head_sha: head, status: 'completed', conclusion: 'failure',
    created_at: at(1), run_started_at: at(2), updated_at: at(55),
  };
  const job = {
    id: 43, run_id: runId, run_attempt: runAttempt,
    name: 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact',
    head_branch: 'main', head_sha: head, status: 'completed', conclusion: 'failure',
    started_at: at(35), completed_at: at(53),
    steps: [
      step('Publish exact target reentry evidence before any activation CAS', 9, 'success', 38, 41),
      step('Deploy to GitHub Pages', 13, 'success', 42, 45),
      step('Verify deployed exact model, implementation and 210/673 artifact', 14, 'success', 46, 48),
      step('Reseal ordinary integrated production without changing model identity', 21, 'failure', 49, 52),
    ],
  };
  const artifactSeal = {
    schemaVersion: 'ravscore-operational-pages-artifact-seal-v1',
    repository, runId, runAttempt, headSha: head, ref: 'refs/heads/main',
    attemptId: `pages-${runId}-${runAttempt}`, artifactId, artifactName: 'github-pages',
    artifactDigestSha256: digest, artifactSizeBytes: 247_456_789,
    targetPublicManifestSha256: 'c'.repeat(64), targetImplementationClosureSha256: 'd'.repeat(64),
    targetModelBinding: {}, createdAt: canonical(33), privatePayloadIncluded: false,
  };
  const artifact = {
    id: artifactId, name: 'github-pages', expired: false, digest: 'sha256:' + digest,
    size_in_bytes: artifactSeal.artifactSizeBytes, created_at: at(33), updated_at: at(33),
    expires_at: '2026-11-21T10:33:00Z',
    workflow_run: { id: runId, repository_id: 17, head_repository_id: 17, head_branch: 'main', head_sha: head },
  };
  const rows = [
    run, { total_count: 1, jobs: [job] }, artifact, structuredClone(run),
    { ref: 'refs/heads/main', object: { type: 'commit', sha: head } },
  ];
  const options = { repository, currentMainHead: head, artifactSeal, token: 'test-token', now: canonical(57) };
  const calls = [];
  const headers = {};
  const statuses = {};
  options.fetchImpl = async (url, request) => {
    const endpoint = routes[calls.length];
    calls.push(url);
    assert.equal(url, 'https://api.github.com/repos/' + repository + endpoint);
    assert.equal(request.method, 'GET');
    assert.equal(request.redirect, 'error');
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.equal(request.headers['Cache-Control'], 'no-cache');
    assert.ok(request.signal instanceof AbortSignal);
    const index = calls.length - 1;
    return new Response(JSON.stringify(rows[index]), { status: statuses[index] ?? 200, headers: headers[index] });
  };
  return { options, rows, run, job, artifact, calls, headers, statuses };
}

function callPaths(f) {
  return f.calls.map(url => url.replace('https://api.github.com/repos/' + repository, ''));
}

test('normal terminal Pages deployment, exact sealed artifact and failed integrated reseal', async () => {
  const f = fixture();
  const actual = await readCompletedPublicPagesOccurrence(f.options);
  assert.deepEqual(callPaths(f), routes);
  assert.ok(Object.isFrozen(actual));
  assert.deepEqual(actual, {
    kind: 'SOURCE_COMPLETED_PUBLIC_PAGES_OCCURRENCE_V1', sourceHead: head, runId, runAttempt, pagesJobId: 43,
    artifactId, artifactDigestSha256: digest, publicManifestSha256: 'c'.repeat(64),
    targetImplementationClosureSha256: 'd'.repeat(64), evidenceStepNumber: 9, deployStepNumber: 13,
    resealStepNumber: 21, deployOutcome: 'success', publicVerificationOutcome: 'success',
    resealOutcome: 'failure', runConclusion: 'failure',
    livePublicVerificationPerformed: false, privatePayloadIncluded: false,
  });
});

test('cancelled after Pages, with the old public verifier and reseal skipped', async () => {
  const f = fixture();
  f.run.conclusion = f.rows[3].conclusion = f.job.conclusion = 'cancelled';
  for (const entry of f.job.steps.slice(2)) {
    Object.assign(entry, { conclusion: 'skipped', started_at: null, completed_at: null });
  }
  const proof = await readCompletedPublicPagesOccurrence(f.options);
  assert.deepEqual(callPaths(f), routes);
  assert.equal(proof.publicVerificationOutcome, 'skipped');
  assert.equal(proof.resealOutcome, 'skipped');
  assert.equal(proof.livePublicVerificationPerformed, false);
});

test('261-minute SOURCE preseal 404 proves the same artifact across both saved-path reads', async () => {
  const f = fixture();
  f.run.run_attempt = f.job.run_attempt = 1;
  const generation = { sourceHead: head, datasetId: 'rr-20261107102200-210',
    productionReferenceAt: canonical(0), generatedAt: canonical(22), bundleContentSha256: digest };
  const now = '2026-11-07T14:21:00.000Z';
  const stageArtifact = {
    ...f.artifact, id: 74, created_at: at(24), updated_at: at(24),
    name: sourceCompletedStageArtifactName({ repository, sourceHead: head,
      runId: String(runId), runAttempt: '1', generation }),
  };
  const pagesArtifact = { ...f.artifact, created_at: at(38), updated_at: at(38) };
  const build = { ...f.job, id: 44, name: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    started_at: at(3), steps: [
      step('Run the one explicit owned SOURCE ordinary route', 1, 'success', 4, 27),
      step('Audit the complete Pages artifact for private runtime material', 2, 'success', 28, 29),
      step('Current-grid pre-Edge - Upload GitHub Pages artifact', 3, 'skipped', null, null),
      step('Current-grid pre-Edge - Resolve and seal the exact uploaded Pages artifact', 4, 'skipped', null, null),
      step('Seal SOURCE through the unchanged normal operational handoff contract', 5, 'success', 30, 31),
      step('Decide whether this sealed artifact may deploy', 6, 'success', 33, 34),
      step('Configure GitHub Pages', 7, 'success', 35, 36),
      step('Upload GitHub Pages artifact', 8, 'success', 37, 39),
      step('Resolve and seal the exact uploaded Pages artifact', 9, 'failure', 40, 43),
      step('Confirm exhausted exact SOURCE Pages artifact metadata visibility', 10, 'success', 44, 45),
      step('Bind the current protected SOURCE pair to this exact integrated Pages handoff', 11, 'skipped', null, null),
      step('Upload privacy-safe operational handoff evidence after Pages artifact seal', 12, 'skipped', null, null),
    ] };
  const pages = { ...f.job, conclusion: 'skipped', steps: f.job.steps.map(entry => ({
    ...entry, conclusion: 'skipped', started_at: null, completed_at: null,
  })) };
  const options = { repository, generation, publicReferenceAt: '2026-11-07T06:00:00.000Z',
    consumerRunId: 24, token: 'test-token', now };
  const end = '/attempts/1';
  const responses = new Map([
    ['/actions/workflows/run-current-weather-once.yml/runs?branch=main&event=workflow_dispatch&head_sha='
      + head + '&per_page=100', { total_count: 1, workflow_runs: [f.run] }],
    [runRoute + '/artifacts?per_page=100', { total_count: 2, artifacts: [stageArtifact, pagesArtifact] }],
    [runRoute + end, f.run],
    [runRoute + end + '/jobs?per_page=100', { total_count: 2, jobs: [build, pages] }],
    ['/actions/artifacts/74', stageArtifact],
    [runRoute, f.run],
  ]);
  const calls = [];
  options.fetchImpl = async (url, request) => {
    const endpoint = url.replace('https://api.github.com/repos/' + repository, '');
    assert.equal(url, 'https://api.github.com/repos/' + repository + endpoint);
    assert.equal(request.method, 'GET');
    assert.equal(request.redirect, 'error');
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.ok(responses.has(endpoint));
    calls.push(endpoint);
    return new Response(JSON.stringify(responses.get(endpoint)));
  };

  const selected = await findSourceCompletedStageOccurrence(options);
  assert.equal(selected.pagesOutcome, 'SOURCE_METADATA_VISIBILITY_EXHAUSTED');
  assert.match(selected.pagesProof, /^[a-f0-9]{64}$/);
  assert.equal(selected.artifactId, 74);
  assert.deepEqual(calls, [...responses.keys()]);

  const env = {
    SOURCE_SAVED_PAIR: 'true', GITHUB_ACTIONS: 'true', GITHUB_WORKFLOW: 'Run current RavRadar weather once',
    GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1',
    GITHUB_SHA: head, GITHUB_REPOSITORY: repository, GITHUB_RUN_ID: '24',
    RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-11-07T10:00:00Z', SOURCE_SAVED_PAIR_PIN: digest,
    SOURCE_SAVED_PAIR_PUBLIC_MANIFEST_SHA256: digest, SOURCE_SAVED_PAIR_OCCURRENCE: `23-1-${head}-74`,
    SOURCE_SAVED_PAIR_PAGES_PROOF: selected.pagesProof,
  };
  const locator = assertAutomaticCompletedSourceRequest(env);
  const readback = await findSourceCompletedStageOccurrence(options);
  assert.equal(readback.pagesOutcome, selected.pagesOutcome);
  assert.equal(readback.pagesProof, locator.pagesProof);

  pagesArtifact.digest = 'sha256:' + 'c'.repeat(64);
  assert.notEqual((await findSourceCompletedStageOccurrence(options)).pagesProof, locator.pagesProof);
  build.steps[9].name = 'Confirm exhausted exact Pages artifact metadata visibility';
  await assert.rejects(findSourceCompletedStageOccurrence(options), /SOURCE_COMPLETED_OCCURRENCE_STEP_IDENTITY/);
  build.steps[9].name = 'Confirm exhausted exact SOURCE Pages artifact metadata visibility';
  for (const index of [7, 8, 9]) Object.assign(build.steps[index], {
    conclusion: 'skipped', started_at: null, completed_at: null,
  });
  const oldRoute = await findSourceCompletedStageOccurrence(options);
  assert.equal(oldRoute.pagesOutcome, 'NOT_STARTED');
  assert.equal(oldRoute.pagesProof, undefined);
  assert.equal(assertAutomaticCompletedSourceRequest({ ...env, SOURCE_SAVED_PAIR_PAGES_PROOF: '' }).pagesProof, undefined);
});

for (const [name, change, error, count] of [
  ['different sealed main', f => { f.options.currentMainHead = 'f'.repeat(40); }, 'REQUEST', 0],
  ['attempt not terminal', f => { f.run.status = 'in_progress'; }, 'RUN_IDENTITY', 1],
  ['different workflow', f => { f.run.path = '.github/workflows/recover.yml'; }, 'RUN_IDENTITY', 1],
  ['duplicate Pages job', f => {
    f.rows[1].jobs.push({ ...f.job, id: 44 }); f.rows[1].total_count++;
  }, 'PAGES_JOB', 2],
  ['wrong Pages caller', f => {
    f.job.name = 'An unrelated caller / Deploy prepared Pages artifact';
  }, 'PAGES_JOB', 2],
  ['incomplete job metadata', f => { f.rows[1].total_count++; }, 'LIST_INCOMPLETE', 2],
  ['paginated job metadata', f => {
    f.headers[1] = { link: '<https://api.github.com/something>; rel="next"' };
  }, 'LIST_INCOMPLETE', 2],
  ['duplicate deploy step', f => { f.job.steps.push({ ...f.job.steps[1] }); }, 'STEP_IDENTITY', 2],
  ['public deployment skipped', f => { f.job.steps[1].conclusion = 'skipped'; }, 'DEPLOY_NOT_SUCCESSFUL', 2],
  ['protected evidence publish failed', f => { f.job.steps[0].conclusion = 'failure'; }, 'EVIDENCE_NOT_PUBLISHED', 2],
  ['protected evidence published too late', f => { f.job.steps[0].completed_at = at(43); }, 'STEP_TIMING', 2],
  ['ordinary integrated reseal already succeeded', f => { f.job.steps[3].conclusion = 'success'; }, 'RESEAL_NOT_INTERRUPTED', 2],
  ['artifact expired despite false flag', f => { f.artifact.expires_at = at(56); }, 'ARTIFACT_IDENTITY', 3],
  ['artifact digest differs', f => { f.artifact.digest = 'sha256:' + 'e'.repeat(64); }, 'ARTIFACT_IDENTITY', 3],
  ['artifact creation differs from authenticated seal', f => { f.artifact.created_at = at(34); }, 'ARTIFACT_IDENTITY', 3],
  ['artifact repository differs', f => { f.artifact.workflow_run.repository_id++; }, 'ARTIFACT_IDENTITY', 3],
  ['later rerun is active', f => {
    f.rows[3].run_attempt++; f.rows[3].status = 'in_progress';
  }, 'RUN_IDENTITY', 4],
  ['main moved', f => { f.rows[4].object.sha = 'e'.repeat(40); }, 'MAIN_MOVED', 5],
  ['unavailable metadata', f => { f.statuses[0] = 403; }, 'METADATA_HTTP', 1],
  ['oversized metadata', f => { f.headers[0] = { 'content-length': '4194305' }; }, 'METADATA_BOUND', 1],
]) {
  test(name, async () => {
    const f = fixture();
    change(f);
    await assert.rejects(readCompletedPublicPagesOccurrence(f.options), {
      message: 'SOURCE_COMPLETED_PUBLIC_PAGES_' + error,
    });
    assert.deepEqual(callPaths(f), routes.slice(0, count));
  });
}

test('scheduled Pages closure proves only one exact unpublished SOURCE occurrence', async () => {
  const make = () => {
    const f = fixture();
    const bot = { login: 'github-actions[bot]' };
    Object.assign(f.run, { run_attempt: 1, actor: bot, triggering_actor: bot });
    Object.assign(f.options.artifactSeal, { runAttempt: 1, attemptId: 'pages-23-1' });
    f.job.run_attempt = 1;
    f.job.steps.splice(1, 3,
      step('Require horizon-valid weather immediately before Pages deployment', 10, 'success', 41, 41),
      step('Require monotonic public generation immediately before Pages', 11, 'success', 41, 42),
      step('Deploy to GitHub Pages', 13, 'failure', 42, 45),
      step('Confirm scheduled Pages writes are terminal and unpublished', 14, 'success', 46, 47),
      step('Verify deployed exact model, implementation and 210/673 artifact', 15, 'skipped', null, null),
      step('Reseal ordinary integrated production without changing model identity', 21, 'skipped', null, null));
    f.rows[3] = structuredClone(f.run);
    const fetchImpl = f.options.fetchImpl;
    f.options.fetchImpl = (url, request) => {
      assert.ok(!url.includes('/attempts/2'));
      return fetchImpl(url.replace('/attempts/1', '/attempts/2'), request);
    };
    return f;
  };
  const success = make();
  const proof = await readClosedUnpublishedSourcePagesOccurrence(success.options);
  assert.equal(proof.kind, 'SOURCE_CLOSED_UNPUBLISHED_PAGES_OCCURRENCE_V1');
  assert.equal(proof.artifactId, artifactId);
  assert.equal(proof.terminalStepNumber, 14);
  assert.equal(proof.targetPublicManifestSha256, success.options.artifactSeal.targetPublicManifestSha256);
  assert.equal(success.calls.length, 5);
  await assert.rejects(readCompletedPublicPagesOccurrence(make().options), /DEPLOY_NOT_SUCCESSFUL/);
  for (const [change, reason] of [
    [f => { f.job.steps[4].conclusion = 'skipped'; }, 'SCHEDULED_WRITE_UNPROVED'],
    [f => { f.job.steps.splice(4, 1); }, 'STEP_IDENTITY'],
    [f => { f.job.steps[4].started_at = at(44); }, 'STEP_TIMING'],
    [f => { f.job.steps[5].conclusion = 'success'; }, 'SCHEDULED_WRITE_UNPROVED'],
    [f => { f.job.conclusion = 'cancelled'; }, 'SCHEDULED_WRITE_UNPROVED'],
    [f => { f.run.triggering_actor = { login: 'human' }; }, 'SCHEDULED_FAILURE_REQUIRED'],
    [f => { f.artifact.digest = 'sha256:' + '9'.repeat(64); }, 'ARTIFACT_IDENTITY'],
    [f => { f.rows[3].updated_at = at(56); }, 'RUN_MOVED'],
    [f => { f.rows[4].object.sha = 'e'.repeat(40); }, 'MAIN_MOVED'],
  ]) {
    const f = make(); change(f);
    await assert.rejects(readClosedUnpublishedSourcePagesOccurrence(f.options), new RegExp(reason));
  }
});
