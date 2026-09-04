// A cache entry is only a locator. GitHub's immutable exact-attempt step is proof.
export const SOURCE_GATE_CONTRACT = 'weather-source-gate-exact-main-v1';
export const SOURCE_GATE_STEP = 'Run fast source gate before expensive data refresh';
const workflow = '.github/workflows/update-and-deploy.yml';
const required = reason => ({ required: true, reason });

export function sourceGateRecord(env, conclusion) {
  if (!['success', 'failure', 'cancelled'].includes(conclusion)) throw new Error('Invalid source outcome');
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Source proof must belong to an exact main commit');
  }
  return {
    contractId: SOURCE_GATE_CONTRACT, repository: env.GITHUB_REPOSITORY,
    headSha: env.GITHUB_SHA, runId: String(env.GITHUB_RUN_ID),
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT), conclusion,
  };
}

export async function decideSourceGate(record, env, getJson) {
  if (env.GITHUB_REF !== 'refs/heads/main') return required('not-main');
  if (!record || record.contractId !== SOURCE_GATE_CONTRACT
      || record.repository !== env.GITHUB_REPOSITORY
      || !/^[a-f0-9]{40}$/.test(record.headSha || '') || record.headSha !== env.GITHUB_SHA
      || !/^\d+$/.test(record.runId || '') || !Number.isSafeInteger(record.runAttempt)
      || record.runAttempt < 1 || record.runId === String(env.GITHUB_RUN_ID)) {
    return required('missing-or-mismatched-proof');
  }
  // Save failures as well as successes: the newest failed attempt supersedes an old green entry.
  if (record.conclusion !== 'success') return required('previous-source-not-green');
  try {
    const base = `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${record.runId}`;
    // Check the latest attempt too: a rerun may have invalidated the cached green attempt.
    const latest = await getJson(base);
    if (latest.run_attempt !== record.runAttempt || latest.head_sha !== env.GITHUB_SHA
        || latest.head_branch !== 'main' || latest.path !== workflow
        || latest.repository?.full_name !== env.GITHUB_REPOSITORY) return required('run-identity-changed');
    const result = await getJson(`${base}/attempts/${record.runAttempt}/jobs?per_page=100`);
    if (!Array.isArray(result.jobs) || result.total_count > 100) return required('incomplete-job-evidence');
    const jobs = result.jobs.filter(job => job.name === 'Build and prepare weather production through reusable workflow / build-and-prepare');
    if (jobs.length !== 1 || jobs[0].head_sha !== env.GITHUB_SHA
        || jobs[0].run_id !== Number(record.runId) || jobs[0].run_attempt !== record.runAttempt) {
      return required('job-identity-mismatch');
    }
    const steps = (jobs[0].steps || []).filter(step => step.name === SOURCE_GATE_STEP);
    if (steps.length !== 1 || steps[0].status !== 'completed' || steps[0].conclusion !== 'success') {
      return required('source-step-not-green');
    }
    const proofTime = Date.parse(steps[0].completed_at);
    if (!Number.isFinite(proofTime)) return required('missing-proof-time');
    // Cache restore may fall back to an older entry. Independently inspect live
    // run history, including reruns of older run IDs, for later source failures.
    // Pagination must be complete; bounded/unavailable history means revalidate.
    const runs = [];
    let completeHistory = false;
    for (let page = 1; page <= 10; page += 1) {
      const history = await getJson(`/repos/${env.GITHUB_REPOSITORY}/actions/workflows/update-and-deploy.yml/runs?head_sha=${env.GITHUB_SHA}&branch=main&per_page=100&page=${page}`);
      if (!Array.isArray(history.workflow_runs) || !Number.isSafeInteger(history.total_count)) {
        return required('invalid-source-history');
      }
      runs.push(...history.workflow_runs);
      if (runs.length >= history.total_count) { completeHistory = true; break; }
    }
    if (!completeHistory) return required('source-history-limit');
    const newer = runs.filter(item => String(item.id) !== String(env.GITHUB_RUN_ID)
      && String(item.id) !== record.runId && item.conclusion !== 'success'
      && (!Number.isFinite(Date.parse(item.updated_at)) || Date.parse(item.updated_at) >= proofTime));
    if (newer.length > 30) return required('source-history-inspection-limit');
    for (const item of newer) {
      if (item.head_sha !== env.GITHUB_SHA || item.head_branch !== 'main'
          || item.path !== workflow || !Number.isSafeInteger(item.id)
          || !Number.isSafeInteger(item.run_attempt)) return required('source-history-identity-mismatch');
      const evidence = await getJson(`/repos/${env.GITHUB_REPOSITORY}/actions/runs/${item.id}/attempts/${item.run_attempt}/jobs?per_page=100`);
      if (!Array.isArray(evidence.jobs) || evidence.total_count > 100) return required('incomplete-later-jobs');
      for (const candidate of evidence.jobs) {
        for (const step of candidate.steps || []) {
          if (step.name !== SOURCE_GATE_STEP || step.conclusion === 'skipped') continue;
          if (step.status !== 'completed') return required('later-source-unresolved');
          if (!Number.isFinite(Date.parse(step.completed_at))) return required('later-source-time-unknown');
          if (Date.parse(step.completed_at) >= proofTime && step.conclusion !== 'success') {
            return required('later-source-not-green');
          }
        }
      }
    }
    return { required: false, reason: 'verified-exact-main-source', runId: record.runId };
  } catch {
    // An unavailable API or unreadable evidence must never silently open the gate.
    return required('proof-verification-unavailable');
  }
}
