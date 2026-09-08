// A cache entry is only a locator. GitHub's immutable exact-attempt step is proof.
export const SOURCE_GATE_CONTRACT = 'weather-source-gate-exact-main-v1';
export const SOURCE_GATE_STEP = 'Run fast source gate before expensive data refresh';

const producer = (workflowId, gates) => Object.freeze({
  workflowId,
  gates: Object.freeze(gates.map(gate => Object.freeze({ ...gate }))),
});

// These names are GitHub's live run/job/step identities, not just YAML job IDs.
// A reusable job is reported as "<caller job name> / <called job id>".
export const SOURCE_GATE_PRODUCERS = Object.freeze({
  '.github/workflows/update-and-deploy.yml': producer('update-and-deploy.yml', [{
    job: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    step: SOURCE_GATE_STEP,
  }]),
  '.github/workflows/validate-copernicus-current-pilot.yml': producer(
    'validate-copernicus-current-pilot.yml',
    [
      {
        job: 'validate',
        step: 'Run exact-main source gate before private acquisition',
      },
      {
        job: 'operational-118-preflight',
        step: 'Run exact-main source gate before one-off acquisition',
      },
    ],
  ),
});

const required = reason => ({ required: true, reason });
const validSha = value => /^[a-f0-9]{40}$/.test(value || '');
const validPositiveInteger = value => Number.isSafeInteger(value) && value >= 1;

function producerForPath(path) {
  return typeof path === 'string' && Object.hasOwn(SOURCE_GATE_PRODUCERS, path)
    ? SOURCE_GATE_PRODUCERS[path]
    : null;
}

function completeJobs(result) {
  return result && Array.isArray(result.jobs)
    && Number.isSafeInteger(result.total_count)
    && result.total_count >= 0
    && result.total_count <= 100
    && result.jobs.length === result.total_count;
}


function inspectProducerJobs(jobs, gateProducer, identity) {
  const knownStepNames = new Set(gateProducer.gates.map(gate => gate.step));
  const matches = [];
  let ranProducerJobWithoutGate = false;

  for (const job of jobs) {
    const jobContracts = gateProducer.gates.filter(gate => gate.job === job.name);
    const steps = Array.isArray(job.steps) ? job.steps : null;

    if (jobContracts.length > 0) {
      if (job.head_sha !== identity.headSha || job.run_id !== identity.runId
          || job.run_attempt !== identity.runAttempt) {
        return { reason: 'job-identity-mismatch' };
      }
      if (!steps) return { reason: 'invalid-job-steps' };
    }

    if (!steps) continue;
    let matchesInJob = 0;
    for (const step of steps) {
      const contract = jobContracts.find(candidate => candidate.step === step.name);
      if (contract) {
        matches.push({ job, step });
        matchesInJob += 1;
      } else if (knownStepNames.has(step.name)) {
        // A known source step under another job is not the approved producer.
        return { reason: 'source-job-step-mismatch' };
      }
    }
    if (jobContracts.length > 0 && job.conclusion !== 'skipped' && matchesInJob === 0) {
      ranProducerJobWithoutGate = true;
    }
  }

  return { matches, ranProducerJobWithoutGate };
}

export function sourceGateRecord(env, conclusion) {
  if (!['success', 'failure', 'cancelled'].includes(conclusion)) throw new Error('Invalid source outcome');
  const runId = Number(env.GITHUB_RUN_ID);
  const runAttempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (!validSha(env.GITHUB_SHA) || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Source proof must belong to an exact main commit');
  }
  if (!/^\d+$/.test(env.GITHUB_RUN_ID || '') || !validPositiveInteger(runId)
      || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT || '') || !validPositiveInteger(runAttempt)) {
    throw new Error('Source proof must belong to an exact workflow attempt');
  }
  return {
    contractId: SOURCE_GATE_CONTRACT, repository: env.GITHUB_REPOSITORY,
    headSha: env.GITHUB_SHA, runId: String(env.GITHUB_RUN_ID),
    runAttempt, conclusion,
  };
}

export async function decideSourceGate(record, env, getJson) {
  if (env.GITHUB_REF !== 'refs/heads/main') return required('not-main');
  const proofRunId = Number(record?.runId);
  if (!record || record.contractId !== SOURCE_GATE_CONTRACT
      || record.repository !== env.GITHUB_REPOSITORY
      || !validSha(record.headSha) || record.headSha !== env.GITHUB_SHA
      || !/^\d+$/.test(record.runId || '') || !validPositiveInteger(proofRunId)
      || !validPositiveInteger(record.runAttempt)
      || record.runId === String(env.GITHUB_RUN_ID)) {
    return required('missing-or-mismatched-proof');
  }
  // Save failures as well as successes: the newest failed attempt supersedes an old green entry.
  if (record.conclusion !== 'success') return required('previous-source-not-green');
  try {
    const base = `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${record.runId}`;
    // Check the latest attempt too: a rerun may have invalidated the cached green attempt.
    const latest = await getJson(base);
    if (latest.id !== proofRunId || latest.run_attempt !== record.runAttempt
        || latest.head_sha !== env.GITHUB_SHA || latest.head_branch !== 'main'
        || latest.repository?.full_name !== env.GITHUB_REPOSITORY) {
      return required('run-identity-changed');
    }
    const gateProducer = producerForPath(latest.path);
    if (!gateProducer) return required('unknown-source-producer');

    const result = await getJson(`${base}/attempts/${record.runAttempt}/jobs?per_page=100`);
    if (!completeJobs(result)) return required('incomplete-job-evidence');
    const proof = inspectProducerJobs(result.jobs, gateProducer, {
      headSha: env.GITHUB_SHA,
      runId: proofRunId,
      runAttempt: record.runAttempt,
    });
    if (proof.reason) return required(proof.reason);
    if (proof.matches.length !== 1) return required('source-job-step-mismatch');

    const sourceStep = proof.matches[0].step;
    if (sourceStep.status !== 'completed' || sourceStep.conclusion !== 'success') {
      return required('source-step-not-green');
    }
    const proofTime = Date.parse(sourceStep.completed_at);
    if (!Number.isFinite(proofTime)) return required('missing-proof-time');
    // Cache restore may fall back to an older entry. Independently inspect every
    // authorized producer, including reruns of older run IDs, for later failures.
    // Pagination must be complete; bounded/unavailable history means revalidate.
    const runs = [];
    for (const [producerPath, historyProducer] of Object.entries(SOURCE_GATE_PRODUCERS)) {
      let completeHistory = false;
      let historyTotal = null;
      let producerRunCount = 0;
      for (let page = 1; page <= 10; page += 1) {
        const history = await getJson(
          `/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${historyProducer.workflowId}`
          + `/runs?head_sha=${env.GITHUB_SHA}&branch=main&per_page=100&page=${page}`,
        );
        if (!Array.isArray(history.workflow_runs) || !Number.isSafeInteger(history.total_count)
            || history.total_count < 0 || history.workflow_runs.length > 100
            || (historyTotal !== null && history.total_count !== historyTotal)) {
          return required('invalid-source-history');
        }
        historyTotal = history.total_count;
        producerRunCount += history.workflow_runs.length;
        runs.push(...history.workflow_runs.map(item => ({
          item,
          producerPath,
          gateProducer: historyProducer,
        })));
        if (producerRunCount >= historyTotal) {
          completeHistory = true;
          break;
        }
      }
      if (!completeHistory) return required('source-history-limit');
    }

    const newer = [];
    for (const candidate of runs) {
      const { item } = candidate;
      if (String(item.id) === String(env.GITHUB_RUN_ID) || String(item.id) === record.runId
          || item.conclusion === 'success') continue;
      const updatedAt = Date.parse(item.updated_at);
      if (!Number.isFinite(updatedAt)) return required('source-history-time-unknown');
      if (updatedAt >= proofTime) newer.push(candidate);
    }
    if (newer.length > 30) return required('source-history-inspection-limit');
    for (const candidate of newer) {
      const { item, producerPath, gateProducer: laterProducer } = candidate;
      if (item.head_sha !== env.GITHUB_SHA || item.head_branch !== 'main'
          || item.path !== producerPath || producerForPath(item.path) !== laterProducer
          || item.repository?.full_name !== env.GITHUB_REPOSITORY
          || !validPositiveInteger(item.id) || !validPositiveInteger(item.run_attempt)) {
        return required('source-history-identity-mismatch');
      }
      const evidence = await getJson(
        `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${item.id}`
        + `/attempts/${item.run_attempt}/jobs?per_page=100`,
      );
      if (!completeJobs(evidence)) return required('incomplete-later-jobs');
      const later = inspectProducerJobs(evidence.jobs, laterProducer, {
        headSha: env.GITHUB_SHA,
        runId: item.id,
        runAttempt: item.run_attempt,
      });
      if (later.reason) return required(`later-${later.reason}`);
      if (later.ranProducerJobWithoutGate) return required('later-source-evidence-missing');

      for (const match of later.matches) {
        const step = match.step;
        if (step.conclusion === 'skipped') continue;
        if (step.status !== 'completed') return required('later-source-unresolved');
        const completedAt = Date.parse(step.completed_at);
        if (!Number.isFinite(completedAt)) return required('later-source-time-unknown');
        if (completedAt >= proofTime && step.conclusion !== 'success') {
          return required('later-source-not-green');
        }
      }
    }
    return { required: false, reason: 'verified-exact-main-source', runId: record.runId };
  } catch {
    // An unavailable API or unreadable evidence must never silently open the gate.
    return required('proof-verification-unavailable');
  }
}
