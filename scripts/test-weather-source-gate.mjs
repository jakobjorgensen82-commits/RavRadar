import assert from 'node:assert/strict';
import { decideSourceGate, sourceGateRecord, SOURCE_GATE_STEP } from './lib/weather-source-gate.mjs';
const env = { GITHUB_REF: 'refs/heads/main', GITHUB_SHA: 'a'.repeat(40),
  GITHUB_REPOSITORY: 'fixture/repo', GITHUB_RUN_ID: '200', GITHUB_RUN_ATTEMPT: '1' };
const proof = sourceGateRecord({ ...env, GITHUB_RUN_ID: '100' }, 'success');
const run = { run_attempt: 1, head_sha: env.GITHUB_SHA, head_branch: 'main',
  path: '.github/workflows/update-and-deploy.yml', repository: { full_name: env.GITHUB_REPOSITORY } };
const job = { name: 'Build and prepare weather production through reusable workflow / build-and-prepare',
  head_sha: env.GITHUB_SHA, run_id: 100, run_attempt: 1,
  steps: [{ name: SOURCE_GATE_STEP, status: 'completed', conclusion: 'success', completed_at: '2026-09-04T05:00:00Z' }] };
const api = (r = run, j = job) => async route => route.includes('/workflows/')
  ? { total_count: 0, workflow_runs: [] } : route.includes('/jobs?') ? { total_count: 1, jobs: [j] } : r;
assert.equal((await decideSourceGate(proof, env, api())).required, false);
for (const p of [null, { ...proof, conclusion: 'failure' }, { ...proof, conclusion: 'cancelled' },
  { ...proof, headSha: 'b'.repeat(40) }, { ...proof, repository: 'untrusted/repo' },
  { ...proof, runId: '200' }, { ...proof, contractId: 'old' }]) {
  assert.equal((await decideSourceGate(p, env, api())).required, true);
}
for (const r of [{ ...run, run_attempt: 2 }, { ...run, head_sha: 'b'.repeat(40) },
  { ...run, head_branch: 'feature' }, { ...run, path: 'different.yml' }]) {
  assert.equal((await decideSourceGate(proof, env, api(r))).required, true);
}
for (const outcome of ['skipped', 'failure', 'cancelled', null]) {
  assert.equal((await decideSourceGate(proof, env, api(run, { ...job,
    steps: [{ name: SOURCE_GATE_STEP, status: 'completed', conclusion: outcome }] }))).required, true);
}
assert.equal((await decideSourceGate(proof, { ...env, GITHUB_REF: 'refs/pull/1/merge' }, api())).required, true);
assert.equal((await decideSourceGate(proof, env, async () => { throw new Error('offline'); })).required, true);
assert.equal((await decideSourceGate(proof, env, api(run, { ...job, head_sha: 'b'.repeat(40) }))).required, true);
for (const laterId of [90, 150]) {
  // Includes a later rerun of an OLDER workflow, even if its invalidating cache
  // record was lost or evicted. An old green cache entry cannot bypass it.
  const later = { ...run, id: laterId, run_attempt: 2, conclusion: 'failure', updated_at: '2026-09-04T06:00:00Z' };
  const laterApi = outcome => async route => route.includes('/workflows/')
    ? { total_count: 1, workflow_runs: [later] }
    : route.includes(`/runs/${laterId}/`)
      ? { total_count: 1, jobs: [{ ...job, steps: [{ name: SOURCE_GATE_STEP,
        status: 'completed', conclusion: outcome, completed_at: '2026-09-04T06:00:00Z' }] }] }
      : api()(route);
  assert.equal((await decideSourceGate(proof, env, laterApi('failure'))).required, true);
  assert.equal((await decideSourceGate(proof, env, laterApi('cancelled'))).required, true);
  assert.equal((await decideSourceGate(proof, env, laterApi('skipped'))).required, false);
}
console.log('Exact-main source gate: same code reused; changed/failed/unverifiable proof requires validation.');
