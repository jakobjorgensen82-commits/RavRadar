import assert from 'node:assert/strict';
import {
  decideSourceGate,
  sourceGateRecord,
  SOURCE_GATE_PRODUCERS,
  SOURCE_GATE_STEP,
} from './lib/weather-source-gate.mjs';

const env = {
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_REPOSITORY: 'fixture/repo',
  GITHUB_RUN_ID: '200',
  GITHUB_RUN_ATTEMPT: '1',
};
const proof = sourceGateRecord({ ...env, GITHUB_RUN_ID: '100' }, 'success');
const proofTime = '2026-09-04T05:00:00Z';

const contracts = Object.entries(SOURCE_GATE_PRODUCERS).flatMap(([path, value]) => (
  value.gates.map(gate => ({ path, workflowId: value.workflowId, ...gate }))
));
assert.deepEqual(contracts, [
  {
    path: '.github/workflows/update-and-deploy.yml',
    workflowId: 'update-and-deploy.yml',
    job: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    step: SOURCE_GATE_STEP,
  },
  {
    path: '.github/workflows/validate-copernicus-current-pilot.yml',
    workflowId: 'validate-copernicus-current-pilot.yml',
    job: 'validate',
    step: 'Run exact-main source gate before private acquisition',
  },
  {
    path: '.github/workflows/validate-copernicus-current-pilot.yml',
    workflowId: 'validate-copernicus-current-pilot.yml',
    job: 'operational-118-preflight',
    step: 'Run exact-main source gate before one-off acquisition',
  },
]);

const makeRun = (contract, overrides = {}) => ({
  id: 100,
  run_attempt: 1,
  head_sha: env.GITHUB_SHA,
  head_branch: 'main',
  path: contract.path,
  repository: { full_name: env.GITHUB_REPOSITORY },
  ...overrides,
});

const makeJob = (contract, overrides = {}) => ({
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

function makeApi(contract, {
  run = makeRun(contract),
  proofJobs = [makeJob(contract)],
  historyRunsByWorkflow = new Map(),
  laterJobs = new Map(),
} = {}) {
  const routes = [];
  return {
    routes,
    getJson: async route => {
      routes.push(route);
      if (route.includes('/actions/workflows/')) {
        const workflow = route.match(/\/actions\/workflows\/([^/]+)\/runs\?/);
        if (!workflow) throw new Error(`Unexpected history route: ${route}`);
        const historyRuns = historyRunsByWorkflow.get(workflow[1]) || [];
        return { total_count: historyRuns.length, workflow_runs: historyRuns };
      }
      const attempt = route.match(/\/actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs/);
      if (attempt) {
        const runId = Number(attempt[1]);
        const jobs = runId === Number(proof.runId) ? proofJobs : laterJobs.get(runId);
        if (!jobs) throw new Error(`Unexpected jobs route: ${route}`);
        return { total_count: jobs.length, jobs };
      }
      if (route.endsWith(`/actions/runs/${proof.runId}`)) return run;
      throw new Error(`Unexpected route: ${route}`);
    },
  };
}

for (const contract of contracts) {
  const api = makeApi(contract);
  const decision = await decideSourceGate(proof, env, api.getJson);
  assert.equal(decision.required, false);
  for (const workflowId of new Set(contracts.map(item => item.workflowId))) {
    assert.ok(api.routes.some(route => route.includes(`/workflows/${workflowId}/runs?`)));
  }
}

assert.throws(
  () => sourceGateRecord({ ...env, GITHUB_RUN_ID: 'not-a-run' }, 'success'),
  /exact workflow attempt/,
);
assert.throws(
  () => sourceGateRecord({ ...env, GITHUB_RUN_ATTEMPT: '0' }, 'success'),
  /exact workflow attempt/,
);

const normal = contracts[0];
const normalApi = () => makeApi(normal).getJson;
for (const candidate of [
  null,
  { ...proof, conclusion: 'failure' },
  { ...proof, conclusion: 'cancelled' },
  { ...proof, headSha: 'b'.repeat(40) },
  { ...proof, repository: 'untrusted/repo' },
  { ...proof, runId: '200' },
  { ...proof, runId: String(Number.MAX_SAFE_INTEGER + 1) },
  { ...proof, contractId: 'old' },
]) {
  assert.equal((await decideSourceGate(candidate, env, normalApi())).required, true);
}

for (const run of [
  makeRun(normal, { id: 101 }),
  makeRun(normal, { run_attempt: 2 }),
  makeRun(normal, { head_sha: 'b'.repeat(40) }),
  makeRun(normal, { head_branch: 'feature' }),
  makeRun(normal, { repository: { full_name: 'untrusted/repo' } }),
]) {
  assert.equal((await decideSourceGate(
    proof,
    env,
    makeApi(normal, { run }).getJson,
  )).required, true);
}

const unknownPath = await decideSourceGate(
  proof,
  env,
  makeApi(normal, { run: makeRun(normal, { path: '.github/workflows/unknown.yml' }) }).getJson,
);
assert.deepEqual(unknownPath, { required: true, reason: 'unknown-source-producer' });

for (const proofJobs of [
  [makeJob(normal, { name: 'unknown-job' })],
  [makeJob(normal, { steps: [{
    name: 'Renamed source gate',
    status: 'completed',
    conclusion: 'success',
    completed_at: proofTime,
  }] })],
  [makeJob(contracts[1], { steps: [{
    name: contracts[2].step,
    status: 'completed',
    conclusion: 'success',
    completed_at: proofTime,
  }] })],
]) {
  const contract = proofJobs[0].name === contracts[1].job ? contracts[1] : normal;
  assert.equal((await decideSourceGate(
    proof,
    env,
    makeApi(contract, { proofJobs }).getJson,
  )).required, true);
}

for (const conclusion of ['skipped', 'failure', 'cancelled', null]) {
  const proofJobs = [makeJob(normal, { steps: [{
    name: normal.step,
    status: 'completed',
    conclusion,
    completed_at: proofTime,
  }] })];
  assert.equal((await decideSourceGate(
    proof,
    env,
    makeApi(normal, { proofJobs }).getJson,
  )).required, true);
}
assert.equal((await decideSourceGate(
  proof,
  { ...env, GITHUB_REF: 'refs/pull/1/merge' },
  normalApi(),
)).required, true);
assert.equal((await decideSourceGate(
  proof,
  env,
  async () => { throw new Error('offline'); },
)).required, true);

for (const contract of contracts) {
  for (const outcome of ['failure', 'cancelled', 'skipped', 'success']) {
    const laterId = 150;
    const historyRuns = [makeRun(contract, {
      id: laterId,
      run_attempt: 2,
      conclusion: 'failure',
      updated_at: '2026-09-04T06:00:00Z',
    })];
    const laterJob = makeJob(contract, {
      run_id: laterId,
      run_attempt: 2,
      conclusion: outcome === 'success' ? 'success' : 'failure',
      steps: [{
        name: contract.step,
        status: 'completed',
        conclusion: outcome,
        completed_at: '2026-09-04T06:00:00Z',
      }],
    });
    const api = makeApi(contract, {
      historyRunsByWorkflow: new Map([[contract.workflowId, historyRuns]]),
      laterJobs: new Map([[laterId, [laterJob]]]),
    });
    const decision = await decideSourceGate(proof, env, api.getJson);
    assert.equal(
      decision.required,
      outcome === 'failure' || outcome === 'cancelled',
      `${contract.path} / ${contract.job} / ${outcome}`,
    );
  }
}

const laterId = 151;
const laterRun = makeRun(contracts[2], {
  id: laterId,
  run_attempt: 2,
  conclusion: 'failure',
  updated_at: '2026-09-04T06:00:00Z',
});
const renamedLaterJob = makeJob(contracts[2], {
  run_id: laterId,
  run_attempt: 2,
  conclusion: 'failure',
  steps: [{
    name: 'Renamed source gate',
    status: 'completed',
    conclusion: 'failure',
    completed_at: '2026-09-04T06:00:00Z',
  }],
});
assert.deepEqual(
  await decideSourceGate(proof, env, makeApi(contracts[2], {
    historyRunsByWorkflow: new Map([[contracts[2].workflowId, [laterRun]]]),
    laterJobs: new Map([[laterId, [renamedLaterJob]]]),
  }).getJson),
  { required: true, reason: 'later-source-evidence-missing' },
);

for (const [proofContract, laterContract] of [
  [contracts[0], contracts[2]],
  [contracts[2], contracts[0]],
]) {
  const crossRunId = laterContract === contracts[0] ? 161 : 90;
  const crossRun = makeRun(laterContract, {
    id: crossRunId,
    run_attempt: 2,
    conclusion: 'failure',
    updated_at: '2026-09-04T06:00:00Z',
  });
  const crossJob = makeJob(laterContract, {
    run_id: crossRunId,
    run_attempt: 2,
    conclusion: 'failure',
    steps: [{
      name: laterContract.step,
      status: 'completed',
      conclusion: 'failure',
      completed_at: '2026-09-04T06:00:00Z',
    }],
  });
  assert.deepEqual(
    await decideSourceGate(proof, env, makeApi(proofContract, {
      historyRunsByWorkflow: new Map([[laterContract.workflowId, [crossRun]]]),
      laterJobs: new Map([[crossRunId, [crossJob]]]),
    }).getJson),
    { required: true, reason: 'later-source-not-green' },
  );
}

const crowdedHistory = Array.from({ length: 31 }, (_, index) => makeRun(normal, {
  id: 300 + index,
  conclusion: 'failure',
  updated_at: '2026-09-04T06:00:00Z',
}));
assert.deepEqual(
  await decideSourceGate(proof, env, makeApi(normal, {
    historyRunsByWorkflow: new Map([[normal.workflowId, crowdedHistory]]),
  }).getJson),
  { required: true, reason: 'source-history-inspection-limit' },
);

console.log('Exact-main source proof is live-bound to both authorized producer workflows.');
