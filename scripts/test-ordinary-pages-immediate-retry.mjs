import './test-current-pages-workflow-wiring.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { createPagesDeploymentRequest, classifyPagesPriorStatus } from './lib/pages-per-artifact-identity.mjs';
import { runSealedPagesDeployment, postJsonOnce, hasSealedPagesRetryEvidence, hasSealedPagesTerminalEvidence, hasSealedPagesNoPostEvidence } from './lib/run-sealed-pages-deployment.mjs';
import { publishSealedPagesWithRecovery } from './lib/publish-sealed-pages-with-recovery.mjs';
import { selectSealedPagesRecovery, getOrdinaryPagesRetryDeadline, MINIMUM_RECOVERY_WINDOW_MS,
  NORMAL_PAGES_COMPLETION_RESERVE_MS, ORDINARY_PAGES_CLEANUP_RESERVE_MS, hasOrdinaryPagesWriteBudget } from './lib/pages-sealed-retry-decision.mjs';

const binding = Object.fromEntries([
  'modelId', 'stateSchemaVersion', 'variantId', 'profileId', 'componentSchemaId',
  'explanationSchemaId', 'rankingPolicyId', 'bestTimePolicyId', 'presentationPolicyId',
].map(key => [key, 'fixture']));
binding.modelContractSha256 = '1'.repeat(64);
binding.modelBundleSha256 = '2'.repeat(64);
const seal = Object.freeze({
  schemaVersion: 'ravscore-operational-pages-artifact-seal-v1',
  repository: 'jakobjorgensen82-commits/RavRadar', ref: 'refs/heads/main',
  runId: 100, runAttempt: 1, headSha: 'a'.repeat(40), attemptId: 'pages-100-1',
  artifactId: 200, artifactName: 'github-pages', artifactDigestSha256: '3'.repeat(64),
  artifactSizeBytes: 500, targetPublicManifestSha256: '4'.repeat(64),
  targetImplementationClosureSha256: '5'.repeat(64), targetModelBinding: binding,
  createdAt: '2026-11-10T01:00:00.000Z', privatePayloadIncluded: false,
});
const old = 'e'.repeat(64);
const host = 'https://ravradar.dk/';
const oidcToken = 'ZXhhbXBsZQ.ZXhhbXBsZQ.ZXhhbXBsZQ';
const githubToken = 'synthetic-gh';
const runnerToken = 'synthetic-oidc';
const env = {
  GITHUB_API_URL: 'https://api.github.com', GITHUB_REPOSITORY: seal.repository, GITHUB_REF: seal.ref,
  GITHUB_RUN_ID: String(seal.runId), GITHUB_RUN_ATTEMPT: String(seal.runAttempt), GITHUB_SHA: seal.headSha,
  GITHUB_REPOSITORY_ID: '1306858343', GH_TOKEN: githubToken, ACTIONS_ID_TOKEN_REQUEST_TOKEN: runnerToken,
  ACTIONS_ID_TOKEN_REQUEST_URL: 'https://pipelines.actions.githubusercontent.com/token?test=1',
};
const artifact = {
  id: seal.artifactId, name: seal.artifactName, digest: 'sha256:' + seal.artifactDigestSha256,
  size_in_bytes: seal.artifactSizeBytes, expired: false, created_at: seal.createdAt, expires_at: '2099-01-01T00:00:00Z',
  workflow_run: { id: seal.runId, head_sha: seal.headSha, head_branch: 'main',
    repository_id: 1306858343, head_repository_id: 1306858343 },
};

function fakeService({ replayOldStatus = false, duplicate = false, createThrows = false, firstTerminal = 'succeed',
  admitCreate = () => true, cancellation = null, priorStatus = 404, immediateFirst = false,
  returnedId = null, createReplyExtra = {}, priorReplyExtra = {}, statusReplyExtra = {}, legacyStatusUrl = false, createHttp = 200,
  deadlineMs = 35 * 60_000, admitDelayMs = 0, statusIdentityFields = false,
  oidcHttp = 200, artifactListHttp = 200, cancellationWaitMs = 30_000,
  perReadMs = 0, perPostMs = 0, perCancelMs = 0, terminalAfterMs = null,
  frozenPauseClock = false, finalWaitOvershootMs = 0, postClockError = null } = {}) {
  const posts = [], reads = [], intents = [], cancels = [];
  const statusById = new Map(), versionById = new Map();
  const postTimes = [], cancelTimes = [], pauses = [];
  let clock = 0, polling = false, lastTerminal = priorStatus;
  const reply = (url, data, status = 200) => {
    const response = new Response(JSON.stringify(data), { status });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  };
  const fetchImpl = async (url, options) => {
    clock += options.method === 'POST' ? perPostMs : perReadMs;
    assert.equal(options.redirect, 'error');
    if (url === env.ACTIONS_ID_TOKEN_REQUEST_URL) {
      assert.equal(options.headers.Authorization, 'Bearer ' + runnerToken);
      return reply(url, { value: oidcToken }, oidcHttp);
    }
    assert.equal(options.headers.Authorization, 'Bearer ' + githubToken);
    if (url.endsWith('artifacts?per_page=100')) {
      const artifacts = duplicate ? [artifact, { ...artifact, id: artifact.id + 1 }] : [artifact];
      return reply(url, { total_count: artifacts.length, artifacts }, artifactListHttp);
    }
    if (options.method === 'POST') {
      assert.equal(options.headers['User-Agent'], 'RavRadar-Pages-deploy');
      const body = JSON.parse(options.body);
      assert.deepEqual(Object.keys(body).sort(), ['artifact_id', 'oidc_token', 'pages_build_version']);
      assert.equal(body.oidc_token, oidcToken);
      assert.equal(intents.at(-1).buildVersion, body.pages_build_version);
      assert.notEqual(body.pages_build_version, seal.headSha);
      assert.equal(body.pages_build_version, intents.at(-1).clientIntentSha256.slice(0, 40));
      const id = returnedId ?? body.pages_build_version;
      posts.push({ id, artifactId: body.artifact_id });
      postTimes.push(clock);
      if (createThrows) throw new Error('synthetic create timeout');
      polling = true;
      const terminal = posts.length === 1 ? firstTerminal : 'succeed';
      statusById.set(id, immediateFirst ? [terminal] : ['deployment_queued', terminal]);
      versionById.set(id, body.pages_build_version);
      const createExtra = typeof createReplyExtra === 'function'
        ? createReplyExtra({ id, buildVersion: body.pages_build_version }) : createReplyExtra;
      return reply(url, { id: replayOldStatus ? '../foreign' : id, page_url: host,
        ...(legacyStatusUrl ? { status_url: 'https://api.github.com/repos/' + seal.repository + '/pages/deployment/status/' + id } : {}),
        ...createExtra }, createHttp);
    }
    const version = url.split('/').at(-1);
    if (!polling) {
      if (priorStatus === 'throws') throw new Error('NEVER_PRINT_PRIVATE_TRANSPORT_TEXT');
      if (typeof priorStatus === 'number') return reply(url, {}, priorStatus);
      return reply(url, lastTerminal === null ? {} : { status: lastTerminal, ...priorReplyExtra });
    }
    reads.push(version);
    assert(statusById.has(version));
    let status = statusById.get(version).shift() ?? 'syncing_files';
    if (terminalAfterMs !== null && cancels.length === 0)
      status = clock - postTimes.at(-1) >= terminalAfterMs
        ? (posts.length === 1 ? firstTerminal : 'succeed') : 'syncing_files';
    if (['succeed', 'deployment_failed', 'deployment_cancelled'].includes(status)) { polling = false; lastTerminal = status; }
    return reply(url, { status, ...(statusIdentityFields ? { id: version,
      deployment_id: version, pages_build_version: versionById.get(version), artifact_id: seal.artifactId } : {}), ...statusReplyExtra });
  };
  const postImpl = async (url, headers, body) => {
    const response = await fetchImpl(url, { redirect: 'error', method: 'POST', headers, body });
    return { status: response.status, url: response.url, data: await response.json() };
  };
  const deploy = deliveryOrdinal => runSealedPagesDeployment({
    env, seal, expectedBaseUrl: host, deliveryOrdinal, fetchImpl, postImpl,
    waitMs: deliveryOrdinal === 1 ? 600_000 : 360_000,
    absoluteDeadlineMs: deadlineMs, completionReserveMs: NORMAL_PAGES_COMPLETION_RESERVE_MS,
    beforeCreate: async intent => { intents.push(intent); clock += admitDelayMs; return admitCreate(intent); },
    pause: async ms => {
      pauses.push(ms);
      if (!frozenPauseClock) clock += ms;
      if (ms > 5_000) clock += finalWaitOvershootMs;
    }, clock: () => { if (postClockError && posts.length > 0) throw postClockError; return clock; },
    ...(cancellation !== null ? {
      waitMs: cancellationWaitMs, cancelAtDeadline: true,
      cancelImpl: async (url, headers) => {
        clock += perCancelMs;
        assert.equal(headers['User-Agent'], 'RavRadar-Pages-deploy');
        const version = url.split('/').at(-2);
        cancels.push(version);
        cancelTimes.push(clock - perCancelMs);
        assert.equal(url.split('/').at(-1), 'cancel');
        assert.equal(version, posts[0].id);
        if (cancellation === 'readback' || cancellation === 'throws-readback')
          statusById.set(version, ['deployment_cancelled']);
        if (cancellation === 'slow-readback')
          statusById.set(version, [...Array(6).fill('syncing_files'), 'deployment_cancelled']);
        if (String(cancellation).startsWith('throws')) throw new Error('NEVER_PRINT_CANCEL_TOKEN_' + githubToken);
        return true;
      },
    } : {}),
  });
  return { posts, reads, intents, cancels, deploy, postTimes, cancelTimes, pauses, now: () => clock };
}

test('the retry window is tied to the dispatch even when the runner starts after the next slot', () => {
  const at = time => '2026-11-10T' + time + ':00Z';
  const queued = { createdAt: at('12:19'), startedAt: at('16:20'),
    jobStartedMs: Date.parse(at('16:21')), nowMs: Date.parse(at('16:32')) };
  assert.equal(getOrdinaryPagesRetryDeadline(queued), Date.parse(at('16:19')));
  assert.equal(getOrdinaryPagesRetryDeadline({ ...queued, createdAt: at('16:19') }), Date.parse(at('16:56')));
  assert.throws(() => getOrdinaryPagesRetryDeadline({ ...queued, createdAt: at('16:21') }), /PAGES_RETRY_JOB_CLOCK/);
});

test('the existing unique build version keeps the exact artifact and actual receipt ID', async () => {
  const server = fakeService();
  const first = await server.deploy(1);
  assert.equal(first.outcome, 'SUCCEEDED');
  assert.deepEqual(server.reads, [first.receipt.deploymentId, first.receipt.deploymentId]);
  assert.deepEqual(server.posts, [{ id: first.receipt.deploymentId, artifactId: seal.artifactId }]);
  assert.equal(first.receipt.deploymentId, first.request.buildVersion);
  assert.notEqual(first.request.buildVersion, seal.headSha);
  assert.equal(server.intents.length, 1);
  assert.equal(server.intents[0].artifactDigestSha256, seal.artifactDigestSha256);
  assert(!JSON.stringify(server.intents[0]).includes(oidcToken));
  assert.deepEqual(first.response.data, { status: 'succeed' },
    'Do not add a deployment ID or artifact field that GitHub did not return');
  assert(!JSON.stringify(first).includes(oidcToken));
  assert(!JSON.stringify(first).includes(githubToken));
});

test('known terminal failure with an unchanged public predecessor admits the same artifact once', async () => {
  const server = fakeService({ firstTerminal: 'deployment_failed' });
  const first = await server.deploy(1);
  assert.equal(selectSealedPagesRecovery({
    seal, firstDelivery: first, firstRequest: first.request, firstReceipt: first.receipt, firstStatus: first.response,
    predecessorSha256: old, publicObservations: [old, old], remainingMs: MINIMUM_RECOVERY_WINDOW_MS,
  }), 'RETRY_SAME_SEALED_PACKAGE_ONCE');
  const second = await server.deploy(2);
  assert.equal(second.outcome, 'SUCCEEDED');
  assert.equal(server.posts.length, 2);
  assert(server.posts.every(row => row.artifactId === seal.artifactId));
  assert.notEqual(server.intents[0].buildVersion, server.intents[1].buildVersion);
  assert.notEqual(server.intents[0].clientIntentSha256, server.intents[1].clientIntentSha256);
});

test('an invalid CREATE ID or unknown write makes one POST and no post-CREATE status read', async () => {
  for (const problem of [{ replayOldStatus: true }, { createThrows: true }]) {
    const server = fakeService(problem);
    const result = await server.deploy(1);
    assert.equal(result.outcome, 'UNKNOWN');
    assert.equal(result.code, problem.replayOldStatus ? 'PAGES_CREATE_RESPONSE_CREATE_ID' : 'PAGES_CREATE_TRANSPORT_UNPROVED');
    assert.equal(server.posts.length, 1);
    assert.deepEqual(server.reads, []);
  }
});

test('ambiguous same-run artifact names are refused before POST', async () => {
  const server = fakeService({ duplicate: true });
  await assert.rejects(server.deploy(1), /PAGES_TRANSPORT_ARTIFACT_UNIQUE/);
  assert.deepEqual(server.posts, []);
});


test('the whole recovery decision makes one same-package repeat under the existing writer fence', async () => {
  const server = fakeService({ firstTerminal: 'deployment_failed' });
  const seen = [old, old, old];
  let fences = 0;
  const result = await publishSealedPagesWithRecovery({
    seal, predecessorSha256: old, submit: (target, ordinal) => {
      assert.equal(target, seal);
      return server.deploy(ordinal);
    },
    readPublic: async () => seen.shift(),
    revalidateWriter: async target => { assert.equal(target, seal); fences++; return true; },
    timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS, pause: async () => {}, maximumObservations: 2,
  });
  assert.equal(result.kind, 'VERIFY_PUBLIC');
  assert.equal(result.attempts, 2);
  assert.equal(fences, 1);
  assert.equal(seen.length, 0);
  assert(server.posts.every(post => post.artifactId === seal.artifactId));
  assert.notEqual(server.intents[0].buildVersion, server.intents[1].buildVersion);
  assert.notEqual(server.intents[0].clientIntentSha256, server.intents[1].clientIntentSha256);
});

test('a late public target, lost writer fence or unknown create cannot make a duplicate POST', async () => {
  for (const testCase of [
    { last: seal.targetPublicManifestSha256, fence: true, expected: 'VERIFY_PUBLIC' },
    { last: old, fence: false, expected: 'HOLD' },
    { replayOldStatus: true, last: old, fence: true, expected: 'HOLD' },
  ]) {
    const server = fakeService({ ...testCase, firstTerminal: 'deployment_failed' });
    const seen = [old, old, testCase.last];
    const result = await publishSealedPagesWithRecovery({
      seal, predecessorSha256: old, submit: (_, ordinal) => server.deploy(ordinal),
      readPublic: async () => seen.shift(), revalidateWriter: async () => testCase.fence,
      timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS, pause: async () => {}, maximumObservations: 2,
    });
    assert.equal(result.kind, testCase.expected);
    assert.equal(server.posts.length, 1);
  }
});


test('the real Node transport submits one physical POST on HTTP 421', async () => {
  let calls = 0;
  const server = createServer((request, response) => {
    calls++;
    request.resume();
    request.once('end', () => {
      response.writeHead(421, { Connection: 'close' });
      response.end();
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const url = 'http://127.0.0.1:' + server.address().port + '/local-fixture';
    const response = await postJsonOnce(url, { 'Content-Type': 'application/json' }, '{"fixture":true}', 1024, httpRequest);
    assert.equal(response.status, 421);
    assert.equal(response.data, null);
    assert.equal(calls, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('an unreserved or uncertain create makes no network POST', async () => {
  for (const admitCreate of [() => false, () => { throw new Error('INTENT_UNCERTAIN'); }]) {
    const server = fakeService({ admitCreate });
    await assert.rejects(server.deploy(1), /CREATE_NOT_RESERVED|INTENT_UNCERTAIN/);
    assert.equal(server.intents.length, 1);
    assert.deepEqual(server.posts, []);
    assert.deepEqual(server.reads, []);
  }
});

test('timeout can retry the same artifact only after exact cancellation readback', async () => {
  const server = fakeService({ firstTerminal: 'syncing_files', cancellation: 'readback' });
  const result = await publishSealedPagesWithRecovery({
    seal, predecessorSha256: old, submit: (_seal, ordinal) => server.deploy(ordinal),
    readPublic: async () => old, revalidateWriter: async () => true,
    timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS + 30_000, pause: async () => {},
  });
  assert.equal(result.kind, 'VERIFY_PUBLIC');
  assert.equal(result.attempts, 2);
  assert.deepEqual(server.cancels, [server.posts[0].id]);
  assert.deepEqual(server.posts.map(post => post.artifactId), [seal.artifactId, seal.artifactId]);
  assert.notEqual(server.intents[0].buildVersion, server.intents[1].buildVersion);
  assert.notEqual(server.intents[0].clientIntentSha256, server.intents[1].clientIntentSha256);
});

test('a cancellation acknowledgement without terminal readback never makes a second deploy', async () => {
  const server = fakeService({ firstTerminal: 'syncing_files', cancellation: 'pending' });
  const result = await publishSealedPagesWithRecovery({
    seal, predecessorSha256: old, submit: (_seal, ordinal) => server.deploy(ordinal),
    readPublic: async () => old, revalidateWriter: async () => true,
    timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS + 30_000, pause: async () => {},
  });
  assert.equal(result.kind, 'HOLD');
  assert.equal(server.posts.length, 1);
  assert.deepEqual(server.cancels, [server.posts[0].id]);
});


test('documented empty preview and legacy status URL accept the actual returned ID', async () => {
  const server = fakeService({ returnedId: '123456', createReplyExtra: { preview_url: '' }, legacyStatusUrl: true, statusIdentityFields: true });
  const first = await server.deploy(1);
  assert.equal(first.outcome, 'SUCCEEDED');
  assert.notEqual(first.request.buildVersion, seal.headSha);
  assert.equal(first.receipt.deploymentId, '123456');
  assert.equal(first.receipt.statusUrl, 'https://api.github.com/repos/' + seal.repository + '/pages/deployments/123456');
  assert.deepEqual(server.reads, ['123456', '123456']);
  for (const [pageUrl, canonical] of [
    ['ravradar.dk', host], ['ravradar.dk/', host],
    ['jakobjorgensen82-commits.github.io/RavRadar', 'https://jakobjorgensen82-commits.github.io/RavRadar/'],
    ['jakobjorgensen82-commits.github.io/RavRadar/', 'https://jakobjorgensen82-commits.github.io/RavRadar/'],
  ]) {
    const bare = fakeService({ createReplyExtra: { page_url: pageUrl } });
    const delivery = await bare.deploy(1);
    assert.equal(delivery.outcome, 'SUCCEEDED'); assert.equal(delivery.receipt.pageUrl, canonical);
  }
  for (const pageUrl of ['foreign.invalid', 'ravradar.dk.foreign.invalid', 'ravradar.dk/other',
    'http://ravradar.dk', '//ravradar.dk', 'ravradar.dk?query=1',
    'user@ravradar.dk', 'ravradar.dk:443', 'jakobjorgensen82-commits.github.io']) {
    const foreign = fakeService({ createReplyExtra: { page_url: pageUrl } });
    assert.equal((await foreign.deploy(1)).outcome, 'UNKNOWN'); assert.equal(foreign.posts.length, 1);
    assert.equal(foreign.reads.length, 0);
  }
});

test('a foreign status URL and a concrete CREATE HTTP refusal retain safe causes', async () => {
  for (const [options, code] of [
    [{ createReplyExtra: { status_url: 'https://api.github.com/repos/foreign/repository/pages/deployments/123' } }, 'PAGES_CREATE_RESPONSE_CREATE_STATUS_URL'],
    [{ createHttp: 422 }, 'PAGES_CREATE_HTTP_422'],
  ]) {
    const server = fakeService(options), first = await server.deploy(1);
    assert.equal(first.outcome, 'UNKNOWN'); assert.equal(first.code, code);
    assert.equal(server.posts.length, 1); assert.equal(server.reads.length, 0);
  }
});

test('own unique positive CREATE and immediate known FAILED allow one same-artifact retry', async () => {
  const server = fakeService({ firstTerminal: 'deployment_failed', immediateFirst: true, returnedId: '123456' });
  const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
    submit: (_seal, ordinal) => server.deploy(ordinal), readPublic: async () => old,
    revalidateWriter: async () => true, timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS, pause: async () => {} });
  assert.equal(result.kind, 'VERIFY_PUBLIC'); assert.equal(result.attempts, 2);
  assert.equal(server.posts.length, 2);
  assert(server.posts.every(post => post.artifactId === seal.artifactId));
});

test('empty or 404 grants no authority while own unique reservation ACK and terminal allow one retry', async () => {
  for (const priorStatus of [null, '', 404]) {
    const successful = fakeService({ priorStatus, immediateFirst: true });
    const done = await successful.deploy(1); assert.equal(done.outcome, 'SUCCEEDED');
    const failed = fakeService({ priorStatus, firstTerminal: 'deployment_failed' });
    const first = await failed.deploy(1);
    assert.equal(selectSealedPagesRecovery({ seal, firstDelivery: first, firstRequest: first.request,
      firstReceipt: first.receipt, firstStatus: first.response, predecessorSha256: old,
      publicObservations: [old, old], remainingMs: MINIMUM_RECOVERY_WINDOW_MS }), 'RETRY_SAME_SEALED_PACKAGE_ONCE');
    assert.equal(first.priorStatus, priorStatus === 404 ? 'PRIOR_STATUS_ABSENCE_UNQUALIFIED' : 'PRIOR_STATUS_EMPTY_UNQUALIFIED');
    assert.equal(failed.posts.length, 1);
  }
});

test('known prior PENDING, permission refusal and uncertain prior transport stop before POST', async () => {
  for (const priorStatus of ['syncing_files', 'succeed', 'deployment_failed', ' ', 'unknown_future_status', 401, 403, 'throws']) {
    const server = fakeService({ priorStatus }), first = await server.deploy(1);
    assert.equal(first.outcome, 'UNKNOWN'); assert.equal(server.posts.length, 0);
    if (typeof priorStatus === 'number') assert.equal(first.code, 'PRIOR_STATUS_HTTP_' + priorStatus);
    assert(!JSON.stringify(first).includes('NEVER_PRINT_PRIVATE_TRANSPORT_TEXT'));
  }
});

test('both write ordinals honor the original absolute deadline and visible thirteen-minute reserve', async () => {
  assert.equal(NORMAL_PAGES_COMPLETION_RESERVE_MS, MINIMUM_RECOVERY_WINDOW_MS - 6 * 60_000);
  for (const [ordinal, pollMs] of [[1, 600_000], [2, 360_000]]) {
    const minimum = 12_000 + pollMs + ORDINARY_PAGES_CLEANUP_RESERVE_MS + NORMAL_PAGES_COMPLETION_RESERVE_MS;
    assert.equal(hasOrdinaryPagesWriteBudget(minimum - 1, pollMs), false);
    assert.equal(hasOrdinaryPagesWriteBudget(minimum, pollMs), true);
    const expired = fakeService({ deadlineMs: minimum - 1, cancellation: 'readback', cancellationWaitMs: pollMs });
    const refused = await expired.deploy(ordinal);
    assert.equal(refused.outcome, 'UNKNOWN'); assert.equal(expired.posts.length, 0);
    const moved = fakeService({ deadlineMs: minimum, admitDelayMs: 1, cancellation: 'readback', cancellationWaitMs: pollMs });
    const late = await moved.deploy(ordinal);
    assert.equal(late.outcome, 'UNKNOWN'); assert.equal(late.code, 'CREATE_BUDGET_EXPIRED');
    assert.equal(moved.posts.length, 0);
  }
});

test('a caller-supplied PENDING flag cannot forge the executor retry witness', async () => {
  const server = fakeService({ firstTerminal: 'deployment_failed' }), first = await server.deploy(1);
  const forged = { ...first, pendingObserved: true };
  assert.equal(selectSealedPagesRecovery({ seal, firstDelivery: forged, firstRequest: forged.request,
    firstReceipt: forged.receipt, firstStatus: forged.response, predecessorSha256: old,
    publicObservations: [old, old], remainingMs: MINIMUM_RECOVERY_WINDOW_MS }), 'HOLD_PUBLICATION');
});


test('uncertain CANCEL is never repeated and only actual terminal readback permits another POST', async () => {
  for (const [cancellation, expectedKind, expectedPosts] of [
    ['throws-readback', 'VERIFY_PUBLIC', 2], ['throws-pending', 'HOLD', 1],
  ]) {
    const server = fakeService({ firstTerminal: 'syncing_files', cancellation });
    const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
      submit: (_seal, ordinal) => server.deploy(ordinal), readPublic: async () => old,
      revalidateWriter: async () => true, timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS + 30_000, pause: async () => {} });
    assert.equal(result.kind, expectedKind); assert.equal(server.posts.length, expectedPosts);
    assert.equal(server.cancels.length, 1);
    assert(!JSON.stringify(result).includes('NEVER_PRINT_CANCEL_TOKEN'));
  }
});

test('an unknown CREATE keeps only a fixed diagnostic and never exposes credentials', async () => {
  const server = fakeService({ createThrows: true });
  const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
    submit: (_seal, ordinal) => server.deploy(ordinal), readPublic: async () => old,
    revalidateWriter: async () => true, timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS, pause: async () => {} });
  assert.equal(result.kind, 'HOLD'); assert.equal(result.diagnostic, 'PAGES_CREATE_TRANSPORT_UNPROVED');
  assert.equal(server.posts.length, 1);
  for (const secret of [oidcToken, githubToken, runnerToken, 'synthetic create timeout'])
    assert(!JSON.stringify(result).includes(secret));
});

test('content failure closes its write without retry while lost and unknown outcomes stay unproved', async () => {
  for (const [status, closed] of [['deployment_content_failed', true], ['deployment_lost', false], ['unknown_future_status', false]]) {
    const server = fakeService({ firstTerminal: status, immediateFirst: true });
    const deliveries = [];
    const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
      submit: async (_seal, ordinal) => { const delivery = await server.deploy(ordinal); deliveries.push(delivery); return delivery; },
      readPublic: async () => old, revalidateWriter: async () => true,
      timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS, pause: async () => {} });
    assert.equal(result.kind, 'HOLD'); assert.equal(server.posts.length, 1);
    assert.equal(hasSealedPagesTerminalEvidence(deliveries[0]), closed);
    assert.equal(hasSealedPagesRetryEvidence(deliveries[0]), false);
    assert.equal(hasSealedPagesTerminalEvidence({ ...deliveries[0] }), false);
  }
});


test('pre-CREATE artifact and OIDC HTTP refusals remain fixed phase-specific diagnostics', async () => {
  for (const [options, expected] of [
    [{ oidcHttp: 403 }, 'PAGES_TRANSPORT_OIDC_HTTP_403'],
    [{ artifactListHttp: 500 }, 'PAGES_TRANSPORT_ARTIFACT_LIST_HTTP_500'],
  ]) {
    const server = fakeService(options);
    const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
      submit: (_seal, ordinal) => server.deploy(ordinal), readPublic: async () => old,
      revalidateWriter: async () => true, timeRemainingMs: () => MINIMUM_RECOVERY_WINDOW_MS, pause: async () => {} });
    assert.equal(result.kind, 'HOLD'); assert.equal(result.stage, 'FIRST_SUBMISSION');
    assert.equal(result.diagnostic, expected); assert.equal(server.posts.length, 0);
  }
});


test('all bounded status and cancel time accumulates before the operation deadline and preserves the normal tail', async () => {
  const prepReads = 3 * 12_000;
  const deadlineMs = prepReads + 12_000 + 600_000 + ORDINARY_PAGES_CLEANUP_RESERVE_MS + NORMAL_PAGES_COMPLETION_RESERVE_MS;
  const server = fakeService({ firstTerminal: 'syncing_files', cancellation: 'slow-readback',
    cancellationWaitMs: 600_000, deadlineMs, perReadMs: 12_000, perPostMs: 12_000, perCancelMs: 12_000 });
  const first = await server.deploy(1);
  assert.equal(first.outcome, 'FAILED'); assert.equal(first.code, 'deployment_cancelled');
  assert.equal(server.posts.length, 1); assert.equal(server.cancels.length, 1);
  assert(server.reads.length >= 9, 'includes latest GET and all seven terminal readbacks');
  assert(server.cancelTimes[0] - server.postTimes[0] >= 600_000, 'No cancellation before the complete first polling window');
  assert(server.now() <= deadlineMs - NORMAL_PAGES_COMPLETION_RESERVE_MS);
  assert(deadlineMs - server.now() >= NORMAL_PAGES_COMPLETION_RESERVE_MS);
});


test('additive remote metadata is ignored through a legitimate same-job retry and omitted from evidence', async () => {
  const extra = { future_metadata: { informational: 'PASSIVE_REMOTE_MARKER' }, future_url: 'https://untrusted.invalid/unused' };
  const server = fakeService({ firstTerminal: 'deployment_failed', returnedId: '123456', statusIdentityFields: true,
    createReplyExtra: ({ id, buildVersion }) => ({ ...extra, deployment_id: id, pages_build_version: buildVersion, artifact_id: seal.artifactId }),
    statusReplyExtra: { ...extra, page_url: host, preview_url: '',
      status_url: 'https://api.github.com/repos/' + seal.repository + '/pages/deployment/status/123456' } });
  const deliveries = [];
  const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
    submit: async (_seal, ordinal) => { const first = await server.deploy(ordinal); deliveries.push(first); return first; },
    readPublic: async () => old, revalidateWriter: async () => true, timeRemainingMs: () => 35 * 60_000, pause: async () => {} });
  assert.equal(result.kind, 'VERIFY_PUBLIC'); assert.equal(result.attempts, 2);
  assert.deepEqual(server.posts.map(row => row.artifactId), [seal.artifactId, seal.artifactId]);
  for (const delivery of deliveries) {
    assert.equal(delivery.response.data.artifact_id, seal.artifactId);
    assert.equal(delivery.response.data.deployment_id, delivery.receipt.deploymentId);
    assert(!JSON.stringify(delivery).includes('PASSIVE_REMOTE_MARKER'));
    assert(!JSON.stringify(delivery).includes('untrusted.invalid'));
  }
});

test('known CREATE identity status and route conflicts stay refused beside passive extra fields', async () => {
  for (const fields of [{ deployment_id: 'foreign' }, { pages_build_version: 'b'.repeat(40) },
    { artifact_id: seal.artifactId + 1 }, { page_url: 'https://foreign.invalid/' },
    { status_url: 'https://api.github.com/repos/foreign/repo/pages/deployments/123456' },
    { preview_url: 'http://foreign.invalid/' }, { status: 'unknown_future_status' }]) {
    const server = fakeService({ returnedId: '123456', createReplyExtra: { future_metadata: true, ...fields } });
    const result = await server.deploy(1);
    assert.equal(result.outcome, 'UNKNOWN'); assert.match(result.code, /^PAGES_CREATE_RESPONSE_CREATE_/);
    assert.equal(server.posts.length, 1); assert.equal(server.reads.length, 0);
  }
});

test('known post-CREATE status identities and routes cannot be hidden by additive metadata', async () => {
  for (const fields of [{ id: 'foreign' }, { deployment_id: 'foreign' }, { pages_build_version: 'b'.repeat(40) },
    { artifact_id: seal.artifactId + 1 }, { page_url: 'https://foreign.invalid/' },
    { status_url: 'https://api.github.com/repos/foreign/repo/pages/deployments/123456' }, { preview_url: false }]) {
    const server = fakeService({ firstTerminal: 'deployment_failed', statusReplyExtra: { future_metadata: true, ...fields } });
    const result = await server.deploy(1);
    assert.equal(result.outcome, 'UNKNOWN'); assert.match(result.code, /^STATUS_.*_UNPROVED$/);
    assert.equal(server.posts.length, 1); assert.equal(server.cancels.length, 0);
  }
});

test('prior aliases validate known identities without claiming the new physical artifact', async () => {
  for (const fields of [{ id: 'one', deployment_id: 'two' }, { id: null }, { artifact_id: 0 },
    { pages_build_version: 'b'.repeat(40) }, { page_url: 'https://foreign.invalid/' },
    { status_url: 'https://api.github.com/repos/foreign/repo/pages/deployments/123456' }]) {
    const server = fakeService({ priorStatus: 'succeed', priorReplyExtra: { future_metadata: true, ...fields } });
    const result = await server.deploy(1);
    assert.equal(result.outcome, 'UNKNOWN'); assert.match(result.code, /^PRIOR_STATUS_.*_UNPROVED$/);
    assert.equal(server.posts.length, 0);
  }
  for (const priorReplyExtra of [{ artifact_id: seal.artifactId }, { id: '123456' }, { future_metadata: true }]) {
    const blank = fakeService({ priorStatus: '', priorReplyExtra });
    const stopped = await blank.deploy(1);
    assert.equal(stopped.outcome, 'UNKNOWN'); assert.equal(blank.posts.length, 0);
  }
  const oldArtifact = fakeService({ priorStatus: 'succeed', priorReplyExtra: { artifact_id: seal.artifactId - 1, future_metadata: true } });
  const used = await oldArtifact.deploy(1);
  assert.equal(used.outcome, 'UNKNOWN'); assert.equal(used.code, 'PRIOR_UNIQUE_VERSION_ALREADY_USED');
  assert.equal(oldArtifact.posts.length, 0);
});

test('additive metadata never turns unknown status or unknown POST into retry authority', async () => {
  for (const options of [{ firstTerminal: 'unknown_future_status', statusReplyExtra: { future_metadata: true } },
    { createThrows: true, createReplyExtra: { future_metadata: true } }]) {
    const server = fakeService(options);
    const result = await publishSealedPagesWithRecovery({ seal, predecessorSha256: old,
      submit: (_seal, ordinal) => server.deploy(ordinal), readPublic: async () => old,
      revalidateWriter: async () => true, timeRemainingMs: () => 35 * 60_000, pause: async () => {} });
    assert.equal(result.kind, 'HOLD'); assert.equal(server.posts.length, 1); assert.equal(server.cancels.length, 0);
  }
});

test('local seals and bindings stay closed while non-data remote properties are refused without execution', () => {
  const request = localSeal => createPagesDeploymentRequest({ env, seal: localSeal, artifact, oidcToken, expectedBaseUrl: host });
  assert.throws(() => request({ ...seal, future_metadata: true }), /PAGES_CREATE_REQUEST_SEAL/);
  assert.throws(() => request({ ...seal, targetModelBinding: { ...binding, future_metadata: true } }), /PAGES_CREATE_REQUEST_SEAL/);
  let executed = false;
  const data = { status: 'succeed' };
  Object.defineProperty(data, 'future_metadata', { get() { executed = true; throw Error('MUST_NOT_EXECUTE'); } });
  const intent = request(seal);
  assert.equal(classifyPagesPriorStatus({ status: 200, url: intent.statusUrl, data }, intent).outcome, 'UNKNOWN');
  assert.equal(executed, false);
});


test('both admitted transport ordinals keep the full polling window and a valid late success', async () => {
  assert.equal(ORDINARY_PAGES_CLEANUP_RESERVE_MS, 138_000);
  for (const [ordinal, pollMs] of [[1, 600_000], [2, 360_000]]) {
    const minimum = 12_000 + pollMs + ORDINARY_PAGES_CLEANUP_RESERVE_MS + NORMAL_PAGES_COMPLETION_RESERVE_MS;
    const server = fakeService({ firstTerminal: 'succeed', terminalAfterMs: pollMs - 10_000,
      cancellation: 'readback', cancellationWaitMs: pollMs, deadlineMs: minimum, perPostMs: 12_000 });
    const delivery = await server.deploy(ordinal);
    assert.equal(delivery.outcome, 'SUCCEEDED');
    assert.equal(server.posts.length, 1); assert.equal(server.cancels.length, 0);
    assert(server.now() - server.postTimes[0] >= pollMs, 'Late success is read at the actual full polling deadline');
    assert(server.now() <= minimum - NORMAL_PAGES_COMPLETION_RESERVE_MS);
  }
});

test('a frozen injected clock yields finite HOLD with one final wait and no CANCEL', async () => {
  const server = fakeService({ firstTerminal: 'syncing_files', cancellation: 'readback',
    cancellationWaitMs: 600_000, frozenPauseClock: true });
  const delivery = await server.deploy(1);
  assert.equal(delivery.outcome, 'UNKNOWN'); assert.equal(delivery.code, 'CANCELLATION_POLL_DEADLINE_UNPROVED');
  assert.equal(server.posts.length, 1); assert.equal(server.cancels.length, 0);
  assert.equal(server.reads.length, 121); assert.equal(server.pauses.length, 121);
  assert.equal(server.pauses.filter(ms => ms > 5_000).length, 1);
  assert.equal(server.now(), 0);
});

test('an observed deadline overshoot refuses cancellation when full cleanup no longer fits', async () => {
  const minimum = 12_000 + 600_000 + ORDINARY_PAGES_CLEANUP_RESERVE_MS + NORMAL_PAGES_COMPLETION_RESERVE_MS;
  const server = fakeService({ firstTerminal: 'syncing_files', cancellation: 'readback',
    cancellationWaitMs: 600_000, deadlineMs: minimum, perPostMs: 12_000, finalWaitOvershootMs: 1 });
  const delivery = await server.deploy(1);
  assert.equal(delivery.outcome, 'UNKNOWN'); assert.equal(delivery.code, 'CANCELLATION_OPERATION_BUDGET_EXHAUSTED');
  assert.equal(server.posts.length, 1); assert.equal(server.cancels.length, 0);
  assert(minimum - server.now() >= NORMAL_PAGES_COMPLETION_RESERVE_MS);
});


test('only an actual pre-POST transport refusal has internal no-write evidence', async () => {
  for (const options of [{priorStatus:401},{priorStatus:'unknown_future_status'},{deadlineMs:1}]) {
    const server=fakeService(options), result=await server.deploy(1);
    assert.equal(server.posts.length,0);
    assert.equal(hasSealedPagesNoPostEvidence(result),true);
    assert.equal(hasSealedPagesNoPostEvidence(structuredClone(result)),false);
  }
  const denied=fakeService({admitCreate:()=>false});
  let refused;
  try { await denied.deploy(1); } catch(error) { refused=error; }
  assert(refused); assert.equal(denied.posts.length,0);
  assert.equal(hasSealedPagesNoPostEvidence(refused),true);
  for(const options of [{createThrows:true},{firstTerminal:'unknown_future_status'},
    {firstTerminal:'deployment_failed'},{priorStatus:'syncing_files'},{priorStatus:'succeed'}]) {
    const server=fakeService(options), result=await server.deploy(1);
    assert.equal(hasSealedPagesNoPostEvidence(result),false);
  }
});

test('normal CLI caller refusal before transport records closure without credentials or a network call', async () => {
  const fs=await import('node:fs/promises'), os=await import('node:os'), path=await import('node:path');
  const {spawnSync}=await import('node:child_process');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'rr-pages-before-post-'));
  const output=path.join(directory,'outputs.txt');
  try {
    const result=spawnSync(process.execPath,['scripts/deploy-ordinary-pages-with-immediate-retry.mjs'],{
      cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:20_000,
      env:{PATH:process.env.PATH,...(process.env.SystemRoot?{SystemRoot:process.env.SystemRoot}:{}),GITHUB_OUTPUT:output},
    });
    assert.equal(result.error,undefined);assert.equal(result.status,1);
    assert.match(result.stderr,/PAGES_RETRY_ORDINARY_SCOPE_REQUIRED/);
    assert.equal(await fs.readFile(output,'utf8'),'closed_unpublished=true\n');
  } finally {
    await fs.unlink(output).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(directory);
  }
});


test('reusing a previous pre-POST error after an attempted POST cannot carry its no-write evidence', async () => {
  const sentinel=new Error('synthetic reused error');
  const before=fakeService({admitCreate:()=>{throw sentinel;}});
  await assert.rejects(before.deploy(1),error=>error===sentinel);
  assert.equal(before.posts.length,0);assert.equal(hasSealedPagesNoPostEvidence(sentinel),true);
  const after=fakeService({postClockError:sentinel});
  await assert.rejects(after.deploy(1),error=>error===sentinel);
  assert.equal(after.posts.length,1);assert.equal(hasSealedPagesNoPostEvidence(sentinel),false);
});
