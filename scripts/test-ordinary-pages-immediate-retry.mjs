import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { runSealedPagesDeployment, postJsonOnce } from './lib/run-sealed-pages-deployment.mjs';
import { publishSealedPagesWithRecovery } from './lib/publish-sealed-pages-with-recovery.mjs';
import { selectSealedPagesRecovery, getOrdinaryPagesRetryDeadline, MINIMUM_RECOVERY_WINDOW_MS } from './lib/pages-sealed-retry-decision.mjs';

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
  admitCreate = () => true, cancellation = null } = {}) {
  const posts = [], reads = [], intents = [], cancels = [];
  const statusById = new Map();
  let clock = 0;
  const reply = (url, data) => {
    const response = new Response(JSON.stringify(data));
    Object.defineProperty(response, 'url', { value: url });
    return response;
  };
  const fetchImpl = async (url, options) => {
    assert.equal(options.redirect, 'error');
    if (url === env.ACTIONS_ID_TOKEN_REQUEST_URL) {
      assert.equal(options.headers.Authorization, 'Bearer ' + runnerToken);
      return reply(url, { value: oidcToken });
    }
    assert.equal(options.headers.Authorization, 'Bearer ' + githubToken);
    if (url.endsWith('artifacts?per_page=100')) {
      const artifacts = duplicate ? [artifact, { ...artifact, id: artifact.id + 1 }] : [artifact];
      return reply(url, { total_count: artifacts.length, artifacts });
    }
    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.deepEqual(Object.keys(body).sort(), ['artifact_id', 'oidc_token', 'pages_build_version']);
      assert.equal(body.oidc_token, oidcToken);
      assert.equal(intents.at(-1).buildVersion, body.pages_build_version);
      posts.push({ id: body.pages_build_version, artifactId: body.artifact_id });
      if (createThrows) throw new Error('synthetic create timeout');
      statusById.set(body.pages_build_version, ['deployment_queued', posts.length === 1 ? firstTerminal : 'succeed']);
      return reply(url, { id: replayOldStatus ? seal.headSha : body.pages_build_version, page_url: host });
    }
    const version = url.split('/').at(-1);
    reads.push(version);
    assert(statusById.has(version));
    return reply(url, { status: statusById.get(version).shift() ?? 'syncing_files' });
  };
  const postImpl = async (url, headers, body) => {
    const response = await fetchImpl(url, { redirect: 'error', method: 'POST', headers, body });
    return { status: response.status, url: response.url, data: await response.json() };
  };
  const deploy = deliveryOrdinal => runSealedPagesDeployment({
    env, seal, expectedBaseUrl: host, deliveryOrdinal, fetchImpl, postImpl,
    beforeCreate: async intent => { intents.push(intent); return admitCreate(intent); },
    pause: async ms => { clock += ms; }, clock: () => clock,
    ...(cancellation !== null ? {
      waitMs: 5_000, cancelAtDeadline: true,
      cancelImpl: async url => {
        const version = url.split('/').at(-2);
        cancels.push(version);
        assert.equal(url.split('/').at(-1), 'cancel');
        assert.equal(version, posts[0].id);
        if (cancellation === 'readback') statusById.set(version, ['deployment_cancelled']);
        return true;
      },
    } : {}),
  });
  return { posts, reads, intents, cancels, deploy };
}

test('the retry window is tied to the dispatch even when the runner starts after the next slot', () => {
  const at = time => '2026-11-10T' + time + ':00Z';
  const queued = { createdAt: at('12:19'), startedAt: at('16:20'),
    jobStartedMs: Date.parse(at('16:21')), nowMs: Date.parse(at('16:32')) };
  assert.equal(getOrdinaryPagesRetryDeadline(queued), Date.parse(at('16:19')));
  assert.equal(getOrdinaryPagesRetryDeadline({ ...queued, createdAt: at('16:19') }), Date.parse(at('16:56')));
  assert.throws(() => getOrdinaryPagesRetryDeadline({ ...queued, createdAt: at('16:21') }), /PAGES_RETRY_JOB_CLOCK/);
});

test('normal server path uses the exact accepted artifact and unique status route', async () => {
  const server = fakeService();
  const first = await server.deploy(1);
  assert.equal(first.outcome, 'SUCCEEDED');
  assert.deepEqual(server.reads, [first.receipt.deploymentId, first.receipt.deploymentId]);
  assert.deepEqual(server.posts, [{ id: first.receipt.deploymentId, artifactId: seal.artifactId }]);
  assert.notEqual(first.receipt.deploymentId, seal.headSha);
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
    seal, firstRequest: first.request, firstReceipt: first.receipt, firstStatus: first.response,
    predecessorSha256: old, publicObservations: [old, old], remainingMs: MINIMUM_RECOVERY_WINDOW_MS,
  }), 'RETRY_SAME_SEALED_PACKAGE_ONCE');
  const second = await server.deploy(2);
  assert.equal(second.outcome, 'SUCCEEDED');
  assert.equal(server.posts.length, 2);
  assert(server.posts.every(row => row.artifactId === seal.artifactId));
  assert.notEqual(server.posts[0].id, server.posts[1].id);
});

test('a stale SHA reply or unknown write makes one POST and no status read', async () => {
  for (const problem of [{ replayOldStatus: true }, { createThrows: true }]) {
    const server = fakeService(problem);
    const result = await server.deploy(1);
    assert.equal(result.outcome, 'UNKNOWN');
    assert.equal(result.code, 'CREATE_RESPONSE_UNPROVED');
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
  assert.notEqual(server.posts[0].id, server.posts[1].id);
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
  assert.notEqual(server.posts[0].id, server.posts[1].id);
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
