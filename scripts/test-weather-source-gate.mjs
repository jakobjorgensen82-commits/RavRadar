import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  decideSourceGate,
  discoverPullRequestSourceGate,
  sourceGateRecord,
  SOURCE_GATE_PRODUCERS,
  SOURCE_GATE_STEP,
  PULL_REQUEST_SOURCE_JOB,
  PULL_REQUEST_SOURCE_STEPS,
  PULL_REQUEST_SOURCE_WORKFLOW,
} from './lib/weather-source-gate.mjs';
import { sourceTreeProofArtifactName } from './lib/source-tree-content.mjs';

const digest = `sha256:${'d'.repeat(64)}`;
const env = {
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_REPOSITORY: 'fixture/repo',
  GITHUB_RUN_ID: '200',
  GITHUB_RUN_ATTEMPT: '1',
};
const proof = sourceGateRecord({ ...env, GITHUB_RUN_ID: '100' }, 'success', digest);
const proofTime = '2026-09-12T01:00:00Z';
const contracts = Object.entries(SOURCE_GATE_PRODUCERS).flatMap(([path, value]) => (
  value.gates.map(gate => ({ path, workflowId: value.workflowId, ...gate }))
));
assert.equal(contracts[0].step, SOURCE_GATE_STEP);

const makeMainRun = (contract, overrides = {}) => ({
  id: 100,
  run_attempt: 1,
  head_sha: env.GITHUB_SHA,
  head_branch: 'main',
  path: contract.path,
  repository: { full_name: env.GITHUB_REPOSITORY },
  ...overrides,
});
const makeMainJob = (contract, overrides = {}) => ({
  name: contract.job,
  status: 'completed',
  conclusion: 'success',
  head_sha: env.GITHUB_SHA,
  run_id: 100,
  run_attempt: 1,
  steps: [{
    name: contract.step,
    status: 'completed',
    conclusion: 'success',
    completed_at: proofTime,
  }],
  ...overrides,
});

function mainApi(contract, { run = makeMainRun(contract), jobs = [makeMainJob(contract)], histories = new Map() } = {}) {
  return async route => {
    if (route.includes('/actions/workflows/')) {
      const workflowId = route.match(/workflows\/([^/]+)\/runs/)[1];
      const rows = histories.get(workflowId) || [];
      return { total_count: rows.length, workflow_runs: rows };
    }
    if (route.includes('/attempts/')) return { total_count: jobs.length, jobs };
    if (route.endsWith('/actions/runs/100')) return run;
    throw new Error(`Unexpected route: ${route}`);
  };
}

for (const contract of contracts) {
  const decision = await decideSourceGate(proof, env, mainApi(contract), { sourceTreeSha256: digest });
  assert.equal(decision.required, false, `${contract.path}/${contract.job}`);
}
for (const [record, currentDigest] of [
  [null, digest],
  [{ ...proof, conclusion: 'failure' }, digest],
  [{ ...proof, sourceTreeSha256: `sha256:${'e'.repeat(64)}` }, digest],
  [proof, `sha256:${'e'.repeat(64)}`],
  [{ ...proof, contractId: 'old' }, digest],
]) {
  assert.equal((await decideSourceGate(record, env, mainApi(contracts[0]), {
    sourceTreeSha256: currentDigest,
  })).required, true);
}
assert.throws(
  () => sourceGateRecord({ ...env, GITHUB_RUN_ATTEMPT: '0' }, 'success', digest),
  /exact workflow attempt/,
);

const pullRequestNumber = 278;
const pullHeadSha = 'b'.repeat(40);
const pullRunHeadSha = pullHeadSha;
const artifactName = sourceTreeProofArtifactName({ pullRequestNumber, headSha: pullHeadSha, sourceTreeSha256: digest });
const pull = {
  number: pullRequestNumber,
  state: 'closed',
  merged_at: '2026-09-12T01:30:00Z',
  merge_commit_sha: env.GITHUB_SHA,
  head: { sha: pullHeadSha, repo: { full_name: env.GITHUB_REPOSITORY } },
  base: { ref: 'main', repo: { full_name: env.GITHUB_REPOSITORY } },
};
const pullRun = {
  id: 300,
  run_attempt: 1,
  head_sha: pullRunHeadSha,
  path: PULL_REQUEST_SOURCE_WORKFLOW,
  event: 'pull_request',
  status: 'completed',
  conclusion: 'success',
  repository: { id: 42, full_name: env.GITHUB_REPOSITORY },
  head_repository: { id: 42, full_name: env.GITHUB_REPOSITORY },
  // This is the shape observed from GitHub for the repository's real PR run.
  pull_requests: [],
};
const pullJob = {
  name: PULL_REQUEST_SOURCE_JOB,
  status: 'completed',
  conclusion: 'success',
  head_sha: pullRunHeadSha,
  run_id: 300,
  run_attempt: 1,
  steps: PULL_REQUEST_SOURCE_STEPS.map(name => ({
    name,
    status: 'completed',
    conclusion: 'success',
    completed_at: proofTime,
  })),
};
const artifact = {
  id: 400,
  name: artifactName,
  expired: false,
  workflow_run: { id: 300 },
};

function pullApi({ pulls = [pull], artifacts = [artifact], run = pullRun, job = pullJob, histories = new Map() } = {}) {
  return async route => {
    if (route.includes(`/commits/${env.GITHUB_SHA}/pulls`)) return pulls;
    if (route.endsWith(`/pulls/${pullRequestNumber}`)) return pulls[0];
    if (route.includes('/actions/artifacts?')) return { total_count: artifacts.length, artifacts };
    if (route.endsWith('/actions/runs/300')) return run;
    if (route.includes('/actions/runs/300/attempts/1/jobs')) return { total_count: 1, jobs: [job] };
    if (route.includes('/actions/workflows/')) {
      const workflowId = route.match(/workflows\/([^/]+)\/runs/)[1];
      const rows = histories.get(workflowId) || [];
      return { total_count: rows.length, workflow_runs: rows };
    }
    throw new Error(`Unexpected route: ${route}`);
  };
}

const discovered = await discoverPullRequestSourceGate(env, digest, pullApi());
assert.equal(discovered.required, false);
assert.equal(discovered.record.proofKind, 'pull-request');
assert.equal(discovered.record.sourceTreeSha256, digest);
assert.equal((await decideSourceGate(discovered.record, env, pullApi(), {
  sourceTreeSha256: digest,
})).required, false);

for (const api of [
  pullApi({ artifacts: [] }),
  pullApi({ artifacts: [{ ...artifact, expired: true }] }),
  pullApi({ run: { ...pullRun, conclusion: 'failure' } }),
  pullApi({ run: { ...pullRun, head_sha: 'c'.repeat(40) } }),
  pullApi({ run: { ...pullRun, head_repository: { full_name: 'attacker/repo' } } }),
  pullApi({ job: { ...pullJob, steps: pullJob.steps.map((step, index) => (
    index === 1 ? { ...step, conclusion: 'failure' } : step
  )) } }),
  pullApi({ pulls: [{ ...pull, head: { ...pull.head, repo: { full_name: 'attacker/repo' } } }] }),
]) assert.equal((await discoverPullRequestSourceGate(env, digest, api)).required, true);

const laterId = 350;
const laterRun = {
  ...makeMainRun(contracts[0]),
  id: laterId,
  run_attempt: 1,
  conclusion: 'failure',
  updated_at: '2026-09-12T02:00:00Z',
};
const laterJob = {
  ...makeMainJob(contracts[0]),
  run_id: laterId,
  steps: [{
    name: contracts[0].step,
    status: 'completed',
    conclusion: 'failure',
    completed_at: '2026-09-12T02:00:00Z',
  }],
};
const invalidatedApi = async route => {
  if (route.endsWith(`/pulls/${pullRequestNumber}`)) return pull;
  if (route.endsWith('/actions/runs/300')) return pullRun;
  if (route.includes('/actions/runs/300/attempts/1/jobs')) return { total_count: 1, jobs: [pullJob] };
  if (route.includes(`/actions/runs/${laterId}/attempts/1/jobs`)) return { total_count: 1, jobs: [laterJob] };
  if (route.includes(`/actions/workflows/${contracts[0].workflowId}/runs`)) {
    return { total_count: 1, workflow_runs: [laterRun] };
  }
  if (route.includes('/actions/workflows/')) return { total_count: 0, workflow_runs: [] };
  throw new Error(`Unexpected route: ${route}`);
};
assert.deepEqual(
  await decideSourceGate(discovered.record, env, invalidatedApi, { sourceTreeSha256: digest }),
  { required: true, reason: 'later-source-not-green' },
);

// The ordinary manual entry shares the real reusable weather producer. A later
// source failure there must invalidate older proof just like a scheduled run.
const ordinaryWorkflow = (await readFile(new URL(
  '../.github/workflows/run-current-weather-once.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const ordinaryName = ordinaryWorkflow.match(/^  build-and-prepare:\n    name: ([^\n]+)\n/m);
assert.ok(ordinaryName, 'ordinary manual workflow retains its actual reusable job');
assert.ok(ordinaryWorkflow.includes('    uses: ./.github/workflows/reusable-weather-build.yml\n'));
const ordinaryContract = {
  path: '.github/workflows/run-current-weather-once.yml',
  workflowId: 'run-current-weather-once.yml',
  job: ordinaryName[1] + ' / build-and-prepare',
  step: SOURCE_GATE_STEP,
};
for (const [stepStatus, stepConclusion, expectedReason, wrongJob] of [
  ['completed', 'failure', 'later-source-not-green', false],
  ['in_progress', null, 'later-source-unresolved', false],
  ['completed', 'skipped', null, false],
  ['completed', 'success', null, false],
  ['completed', 'failure', 'later-source-job-step-mismatch', true],
]) {
  const runId = 351;
  const currentRun = makeMainRun(ordinaryContract, { id: runId,
    conclusion: 'failure', updated_at: '2026-09-12T02:00:00Z' });
  const currentJob = makeMainJob(ordinaryContract, { run_id: runId,
    name: wrongJob ? 'wrong-ordinary-producer' : ordinaryContract.job,
    steps: [{ name: ordinaryContract.step, status: stepStatus,
      conclusion: stepConclusion, completed_at: '2026-09-12T02:00:00Z' }] });
  const oldProofApi = pullApi({ histories: new Map([[ordinaryContract.workflowId, [currentRun]]]) });
  const api = async route => route.includes('/actions/runs/351/attempts/1/jobs')
    ? { total_count: 1, jobs: [currentJob] } : oldProofApi(route);
  const decision = await decideSourceGate(discovered.record, env, api, { sourceTreeSha256: digest });
  if (expectedReason) assert.deepEqual(decision, { required: true, reason: expectedReason });
  else assert.equal(decision.required, false, 'weather failure alone does not invalidate successful or skipped source');
}

console.log('Source gate reuses only live-verified, SHA-256-identical PR or exact-main content.');

// The mandatory native SQL leaf is part of the live immutable PR proof.
// Outer success, absence, pending or SKIP cannot substitute for its real run.
const nativeSqlStep = 'Validate native PostgreSQL checkpoint CAS on artificial data only';
assert.ok(PULL_REQUEST_SOURCE_STEPS.includes(nativeSqlStep));
// Reject source-contract regressions before the native database matrix.
// This is ordering only: every original gate stays mandatory before proof.
const {projectSourceImpactWorkflowFull}=await import('./lib/source-impact-workflow-review.mjs');
const prValidation = projectSourceImpactWorkflowFull(await readFile(
  new URL('../.github/workflows/validate-pull-request.yml', import.meta.url), 'utf8'));
function assertSourceBeforeNativeSql(source) {
  const names = [
    'Require exact pull-request source head',
    'Build deterministic source-tree content identity',
    'Diagnose normal pack-reader closure on artificial data only',
    'Restore Node22 for existing source validation',
    'Validate bounded native current diagnosis on artificial data only',
    'Validate source contracts and release governance',
    nativeSqlStep,
    'Upload independently completed native586 PostgreSQL phase',
    'Validate isolated restart and two ordinary national followers',
    'Validate durable Copernicus current-reference baseline on artificial data only',
    'Validate download-inclusive DMI capacity on artificial data only',
    'Require validated source tree to remain unchanged',
    'Upload tree-content source validation proof',
  ];
  let previous = -1;
  for (const name of names) {
    const marker = '      - name: ' + name + '\n';
    assert.equal(source.split(marker).length, 2, 'one actual mandatory gate: ' + name);
    const position = source.indexOf(marker);
    assert.ok(position > previous, 'source must precede native SQL; national gates and final proof remain after both');
    previous = position;
    const block = source.slice(position).split('\n      - ').at(0);
    assert.doesNotMatch(block, /^\s+(?:if|continue-on-error):/m, 'mandatory gates cannot be skipped or softened');
  }
}
assertSourceBeforeNativeSql(prValidation);
assert.throws(() => assertSourceBeforeNativeSql(prValidation.replace('      - name: ' + nativeSqlStep + '\n', '      - name: missing-native-sql\n')));
assert.throws(() => assertSourceBeforeNativeSql(prValidation.replace('      - name: ' + nativeSqlStep + '\n',
  '      - name: ' + nativeSqlStep + '\n        continue-on-error: true\n')));
for (const nativeOutcome of [null,
  { status: 'completed', conclusion: 'skipped' },
  { status: 'completed', conclusion: 'failure' },
  { status: 'in_progress', conclusion: null }]) {
  const job = { ...pullJob, steps: pullJob.steps.flatMap(step => step.name !== nativeSqlStep
    ? [step] : nativeOutcome === null ? [] : [{ ...step, ...nativeOutcome }]) };
  const api = pullApi({ job });
  assert.equal((await discoverPullRequestSourceGate(env, digest, api)).required, true);
  assert.equal((await decideSourceGate(discovered.record, env, api,
    { sourceTreeSha256: digest })).required, true);
}


// Exercise the actual CLI decision/output block with the existing resolver
// functions and GitHub fixtures. This is not a hosted source-proof claim.
const normalCheckSource = (await readFile(new URL('./weather-source-gate.mjs', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
const normalCheckStart = '  let decision = await decideSourceGate(record, env, githubJson, { sourceTreeSha256 });';
const normalCheckEnd = '\n} else {\n  throw new Error(\'Expected check, digest or record\');';
assert.equal(normalCheckSource.split(normalCheckStart).length, 2);
assert.equal(normalCheckSource.split(normalCheckEnd).length, 2);
const normalCheckBody = normalCheckSource.slice(normalCheckSource.indexOf(normalCheckStart), normalCheckSource.indexOf(normalCheckEnd));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runNormalCheck = new AsyncFunction('record', 'env', 'sourceTreeSha256', 'githubJson',
  'decideSourceGate', 'discoverPullRequestSourceGate', 'fs', 'writeJson', 'console',
  'verifiedTargetedSourceProof', 'locatorPath',
  normalCheckBody + '\nreturn decision;');
const fixedReadWorkflow = (await readFile(new URL('../.github/workflows/deploy-trip-storage.yml', import.meta.url), 'utf8')).replaceAll('\r\n', '\n');
assert.ok(fixedReadWorkflow.includes('      - name: Reject missing source proof before either fixed read\n        shell: bash\n        run: test "\${{ steps.fixed_read_source.outputs.required }}" = false'));
for (const [api, reason] of [
  [pullApi({ artifacts: [] }), 'matching-pull-request-source-proof-not-found'],
  [async () => { throw new Error('synthetic unavailable GitHub metadata'); }, 'pull-request-proof-discovery-unavailable'],
]) {
  let output = null;
  let locatorWrites = 0;
  const printed = [];
  const current = { ...env, GITHUB_OUTPUT: 'synthetic-fixed-read-source-output' };
  const decision = await runNormalCheck(null, current, digest, api,
    decideSourceGate, discoverPullRequestSourceGate,
    { appendFile: async (file, value) => { assert.equal(file, current.GITHUB_OUTPUT); assert.equal(output, null); output = value; } },
    async () => { locatorWrites += 1; },
    { log: value => { printed.push(value); } }, async () => null,
    '.cache/weather-source-validation.json');
  assert.deepEqual(decision, { required: true, reason });
  assert.equal(locatorWrites, 0, 'failed discovery never writes a locator');
  assert.equal(output, 'required=true\nreason=' + reason + '\nsource_tree_sha256=' + digest + '\n');
  assert.deepEqual(printed, ['Source gate: required=true; reason=' + reason]);
}

// The actual CLI must persist only a successful independently verified typed
// locator. The dedicated normal consumer fixture covers its cryptographic and
// live-identity contract; this checks the final decision/output connection.
for (const required of [false, true]) {
  const context = { ...env, GITHUB_OUTPUT: 'synthetic-targeted-source-output' };
  const reason = required ? 'targeted-source-proof-unavailable'
    : 'verified-targeted-pull-request-source-content';
  const locator = { contractId: 'weather-source-targeted-impact-v1', synthetic: true };
  const writes = [];
  let output = null;
  let targetedCalls = 0;
  const result = await runNormalCheck(null, context, digest, pullApi({ artifacts: [] }),
    decideSourceGate, discoverPullRequestSourceGate,
    { appendFile: async (file, value) => {
      assert.equal(file, context.GITHUB_OUTPUT);
      assert.equal(output, null);
      output = value;
    } },
    async (file, value) => { writes.push({ file, value }); }, { log() {} },
    async (prior, actualContext, actualDigest) => {
      targetedCalls += 1;
      assert.equal(prior, null);
      assert.equal(actualContext, context);
      assert.equal(actualDigest, digest);
      return { decision: { required, reason }, record: locator };
    }, '.cache/weather-source-validation.json');
  assert.equal(targetedCalls, 1);
  assert.deepEqual(result, { required, reason });
  assert.equal(output, `required=${required}\nreason=${reason}\nsource_tree_sha256=${digest}\n`);
  assert.deepEqual(writes, required ? []
    : [{ file: '.cache/weather-source-validation.json', value: locator }]);
}
