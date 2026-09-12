import assert from 'node:assert/strict';
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

console.log('Source gate reuses only live-verified, SHA-256-identical PR or exact-main content.');
