import { sourceTreeProofArtifactName } from './source-tree-content.mjs';

// Cache entries and artifacts are locators. GitHub's immutable job/step
// evidence plus an equal SHA-256 content manifest is the proof.
export const SOURCE_GATE_CONTRACT = 'weather-source-gate-content-v2';
export const SOURCE_GATE_STEP = 'Run fast source gate before expensive data refresh';
export const MAIN_SOURCE_JOB = 'Qualify exact main source without production';
export const MAIN_SOURCE_STEP = 'Run actual exact-main source gate without production';
export const PULL_REQUEST_SOURCE_WORKFLOW = '.github/workflows/validate-pull-request.yml';
export const PULL_REQUEST_SOURCE_JOB = 'Source validation and release gate';
export const PULL_REQUEST_SOURCE_STEPS = Object.freeze([
  'Require exact pull-request source head',
  'Validate source contracts and release governance',
  'Validate native PostgreSQL checkpoint CAS on artificial data only',
  'Require validated source tree to remain unchanged',
  'Upload tree-content source validation proof',
]);

const producer = (workflowId, gates) => Object.freeze({
  workflowId,
  gates: Object.freeze(gates.map(gate => Object.freeze({ ...gate }))),
});

export const SOURCE_GATE_PRODUCERS = Object.freeze({
  '.github/workflows/update-and-deploy.yml': producer('update-and-deploy.yml', [{
    job: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    step: SOURCE_GATE_STEP,
  }]),
  '.github/workflows/run-current-weather-once.yml': producer('run-current-weather-once.yml', [{
    job: 'Build and prepare weather production through reusable workflow / build-and-prepare',
    step: SOURCE_GATE_STEP,
  }]),
  '.github/workflows/watch-missed-weather-schedule.yml': producer('watch-missed-weather-schedule.yml', [{
    job: MAIN_SOURCE_JOB, step: MAIN_SOURCE_STEP,
  }]),
  '.github/workflows/validate-copernicus-current-pilot.yml': producer(
    'validate-copernicus-current-pilot.yml',
    [
      { job: 'validate', step: 'Run exact-main source gate before private acquisition' },
      { job: 'operational-118-preflight', step: 'Run exact-main source gate before one-off acquisition' },
    ],
  ),
});

const required = reason => ({ required: true, reason });
const validSha = value => /^[a-f0-9]{40}$/.test(value || '');
const validSha256 = value => /^sha256:[a-f0-9]{64}$/.test(value || '');
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
        return { reason: 'source-job-step-mismatch' };
      }
    }
    if (jobContracts.length > 0 && job.conclusion !== 'skipped' && matchesInJob === 0) {
      ranProducerJobWithoutGate = true;
    }
  }
  return { matches, ranProducerJobWithoutGate };
}

function pullRequestIdentity(run, record, repository, pull) {
  if (run.id !== Number(record.runId) || run.run_attempt !== record.runAttempt
      || run.head_sha !== record.runHeadSha || run.path !== PULL_REQUEST_SOURCE_WORKFLOW
      || run.event !== 'pull_request' || run.status !== 'completed'
      || run.conclusion !== 'success' || run.repository?.full_name !== repository
      || run.head_repository?.full_name !== repository
      || record.runHeadSha !== record.producerHeadSha) return false;
  // GitHub's run endpoint legitimately returns pull_requests: [] for same-repo
  // PR runs. Bind through the independently fetched PR instead of trusting that
  // optional projection, while still requiring the run/job head to be exact.
  return pull?.number === record.pullRequestNumber
    && pull.state === 'closed' && typeof pull.merged_at === 'string'
    && pull.merge_commit_sha === record.headSha
    && pull.head?.sha === record.producerHeadSha
    && pull.head?.repo?.full_name === repository
    && pull.base?.ref === 'main'
    && pull.base?.repo?.full_name === repository;
}

function inspectPullRequestJobs(jobs, record) {
  const matches = jobs.filter(job => job.name === PULL_REQUEST_SOURCE_JOB);
  if (matches.length !== 1) return { reason: 'pull-request-source-job-mismatch' };
  const job = matches[0];
  if (job.run_id !== Number(record.runId) || job.run_attempt !== record.runAttempt
      || job.head_sha !== record.runHeadSha || job.status !== 'completed'
      || job.conclusion !== 'success' || !Array.isArray(job.steps)) {
    return { reason: 'pull-request-source-job-identity-mismatch' };
  }
  for (const name of PULL_REQUEST_SOURCE_STEPS) {
    const steps = job.steps.filter(step => step.name === name);
    if (steps.length !== 1 || steps[0].status !== 'completed' || steps[0].conclusion !== 'success') {
      return { reason: 'pull-request-source-step-not-green' };
    }
  }
  const sourceStep = job.steps.find(step => (
    step.name === 'Validate source contracts and release governance'
  ));
  const proofTime = Date.parse(sourceStep.completed_at);
  if (!Number.isFinite(proofTime)) return { reason: 'missing-proof-time' };
  return { proofTime };
}

export function sourceGateRecord(env, conclusion, sourceTreeSha256) {
  if (!['success', 'failure', 'cancelled'].includes(conclusion)) throw new Error('Invalid source outcome');
  const runId = Number(env.GITHUB_RUN_ID);
  const runAttempt = Number(env.GITHUB_RUN_ATTEMPT);
  if (!validSha(env.GITHUB_SHA) || env.GITHUB_REF !== 'refs/heads/main'
      || !validSha256(sourceTreeSha256)) {
    throw new Error('Source proof must belong to an exact main content tree');
  }
  if (!/^\d+$/.test(env.GITHUB_RUN_ID || '') || !validPositiveInteger(runId)
      || !/^\d+$/.test(env.GITHUB_RUN_ATTEMPT || '') || !validPositiveInteger(runAttempt)) {
    throw new Error('Source proof must belong to an exact workflow attempt');
  }
  return {
    contractId: SOURCE_GATE_CONTRACT,
    repository: env.GITHUB_REPOSITORY,
    headSha: env.GITHUB_SHA,
    sourceTreeSha256,
    proofKind: 'main',
    producerHeadSha: env.GITHUB_SHA,
    runHeadSha: env.GITHUB_SHA,
    runId: String(env.GITHUB_RUN_ID),
    runAttempt,
    conclusion,
  };
}

export async function inspectLaterMainEvidence({ env, proofTime, record, getJson }) {
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
      runs.push(...history.workflow_runs.map(item => ({ item, producerPath, gateProducer: historyProducer })));
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
      if (completedAt >= proofTime && step.conclusion !== 'success') return required('later-source-not-green');
    }
  }
  return null;
}

export async function decideSourceGate(record, env, getJson, { sourceTreeSha256 } = {}) {
  if (env.GITHUB_REF !== 'refs/heads/main') return required('not-main');
  const proofRunId = Number(record?.runId);
  if (!record || record.contractId !== SOURCE_GATE_CONTRACT
      || record.repository !== env.GITHUB_REPOSITORY
      || !validSha(record.headSha) || record.headSha !== env.GITHUB_SHA
      || !validSha256(sourceTreeSha256) || record.sourceTreeSha256 !== sourceTreeSha256
      || !['main', 'pull-request'].includes(record.proofKind)
      || !validSha(record.producerHeadSha) || !validSha(record.runHeadSha)
      || !/^\d+$/.test(record.runId || '') || !validPositiveInteger(proofRunId)
      || !validPositiveInteger(record.runAttempt)
      || record.runId === String(env.GITHUB_RUN_ID)) {
    return required('missing-or-mismatched-proof');
  }
  if (record.conclusion !== 'success') return required('previous-source-not-green');
  try {
    const base = `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${record.runId}`;
    const latest = await getJson(base);
    let proofTime;
    if (record.proofKind === 'main') {
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
      proofTime = Date.parse(sourceStep.completed_at);
      if (!Number.isFinite(proofTime)) return required('missing-proof-time');
    } else {
      const pull = validPositiveInteger(record.pullRequestNumber)
        ? await getJson(`/repos/${env.GITHUB_REPOSITORY}/pulls/${record.pullRequestNumber}`)
        : null;
      if (!pullRequestIdentity(latest, record, env.GITHUB_REPOSITORY, pull)) {
        return required('pull-request-source-identity-mismatch');
      }
      const result = await getJson(`${base}/attempts/${record.runAttempt}/jobs?per_page=100`);
      if (!completeJobs(result)) return required('incomplete-job-evidence');
      const proof = inspectPullRequestJobs(result.jobs, record);
      if (proof.reason) return required(proof.reason);
      proofTime = proof.proofTime;
    }
    const later = await inspectLaterMainEvidence({ env, proofTime, record, getJson });
    if (later) return later;
    return {
      required: false,
      reason: record.proofKind === 'main'
        ? 'verified-exact-main-source-content'
        : 'verified-identical-pull-request-source-content',
      runId: record.runId,
    };
  } catch {
    return required('proof-verification-unavailable');
  }
}


// Check-runs locate only registered source jobs. A check status is never proof:
// every proposed locator still passes the unchanged live MAIN consumer below.
// In particular this works when an immutable cache contains an unusable old
// locator, as well as when the cache/locator is entirely absent.

// Positive expiry/absence data only selects an actual new validation. This
// never accepts an expired proof. Unknown transport/identity remains unknown.
export async function inspectSourceProofRenewalMetadata(reference, repository, getJson) {
  try {
    if (arguments.length !== 3 || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
        || typeof getJson !== 'function' || reference?.repository !== repository
        || !validPositiveInteger(reference.runId) || reference.runAttempt !== 1
        || !validPositiveInteger(reference.pullRequest) || !validSha(reference.producerHead)
        || !validSha256(reference.sourceTreeSha256)) return 'UNPROVED';
    for (const kind of ['native', 'final'])
      if (!validPositiveInteger(reference[kind + 'ArtifactId']) || !validSha256(reference[kind + 'ArtifactDigest'])) return 'UNPROVED';
    let state = null;
    for (const kind of ['native', 'final']) {
      const id = reference[kind + 'ArtifactId'], digest = reference[kind + 'ArtifactDigest'];
      const name = kind === 'native' ? 'native586-phase-' + reference.runId + '-1-' + reference.producerHead
        : sourceTreeProofArtifactName({ pullRequestNumber: reference.pullRequest,
          headSha: reference.producerHead, sourceTreeSha256: reference.sourceTreeSha256 });
      let metadata;
      try { metadata = await getJson('/repos/' + repository + '/actions/artifacts/' + id); }
      catch {
        const listing = await getJson('/repos/' + repository + '/actions/artifacts?name=' + encodeURIComponent(name) + '&per_page=100');
        if (!Array.isArray(listing.artifacts) || !Number.isSafeInteger(listing.total_count)
            || listing.total_count < 0 || listing.total_count !== listing.artifacts.length || listing.total_count > 100)
          return 'UNPROVED';
        const matches = listing.artifacts.filter(row => row.id === id);
        if (matches.length === 0) { state = 'MISSING'; continue; }
        if (matches.length !== 1) return 'UNPROVED';
        metadata = matches[0];
      }
      if (metadata.id !== id || metadata.name !== name || metadata.digest !== digest
          || metadata.workflow_run?.id !== reference.runId || metadata.workflow_run?.head_sha !== reference.producerHead)
        return 'UNPROVED';
      if (metadata.expired === true) state ??= 'EXPIRED';
      else if (metadata.expired !== false) return 'UNPROVED';
    }
    return state ?? 'UNPROVED';
  } catch { return 'UNPROVED'; }
}

export async function discoverMainSourceGate(env, sourceTreeSha256, getJson) {
  const unavailable = reason => ({ required: true, reason, mainAvailability: 'UNPROVED' });
  const deadline = performance.now() + 60000;
  let calls = 0;
  const json = async route => {
    if (++calls > 64 || performance.now() >= deadline) throw new Error('BOUND');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(15000, deadline - performance.now()));
    try {
      const value = await getJson(route, { signal: controller.signal });
      if (performance.now() >= deadline || Buffer.byteLength(JSON.stringify(value)) > 2 * 1024 * 1024)
        throw new Error('BOUND');
      return value;
    } finally { clearTimeout(timer); controller.abort(); }
  };
  try {
    if (arguments.length !== 3 || env.GITHUB_REF !== 'refs/heads/main'
        || !validSha(env.GITHUB_SHA) || !validSha256(sourceTreeSha256)
        || !/^\d+$/.test(env.GITHUB_RUN_ID || '') || !validPositiveInteger(Number(env.GITHUB_RUN_ID))
        || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY)
        || typeof getJson !== 'function') return unavailable('main-source-discovery-identity');
    const repo = '/repos/' + env.GITHUB_REPOSITORY;
    // This new locator entrance searches only its dedicated source-only job.
    // Existing ordinary/pilot cache proofs and all negative producer checks
    // remain owned by the unchanged normal v2 consumer, never by check colour.
    let total = null, count = 0;
    const seen = new Set();
    for (let page = 1; page <= 10; page += 1) {
      const listing = await json(repo + '/commits/' + env.GITHUB_SHA + '/check-runs?check_name='
        + encodeURIComponent(MAIN_SOURCE_JOB) + '&filter=all&per_page=100&page=' + page);
      if (!Number.isSafeInteger(listing.total_count) || listing.total_count < 0
          || listing.total_count > 1000 || !Array.isArray(listing.check_runs)
          || listing.check_runs.length > 100 || total !== null && total !== listing.total_count)
        return unavailable('main-source-check-history-incomplete');
      total = listing.total_count;
      count += listing.check_runs.length;
      for (const check of listing.check_runs) {
        if (check.name !== MAIN_SOURCE_JOB || check.head_sha !== env.GITHUB_SHA
            || !validPositiveInteger(check.id) || seen.has(check.id)) return unavailable('main-source-check-identity');
        seen.add(check.id);
        if (check.status === 'completed' && check.conclusion === 'skipped') continue;
        const url = new URL(check.details_url);
        const escaped = env.GITHUB_REPOSITORY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = url.pathname.match(new RegExp('^/' + escaped + '/actions/runs/([1-9][0-9]*)/job/([1-9][0-9]*)$'));
        if (url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash || !match)
          return unavailable('main-source-check-locator');
        const runId = match[1];
        if (runId === String(env.GITHUB_RUN_ID)) continue;
        const run = await json(repo + '/actions/runs/' + runId);
        const producer = producerForPath(run.path);
        if (run.id !== Number(runId) || run.head_sha !== env.GITHUB_SHA || run.head_branch !== 'main'
            || run.repository?.full_name !== env.GITHUB_REPOSITORY
            || run.event !== 'workflow_dispatch' || !validPositiveInteger(run.run_attempt)
            || producer?.workflowId !== 'watch-missed-weather-schedule.yml')
          return unavailable('main-source-run-identity');
        const evidence = await json(repo + '/actions/runs/' + runId + '/attempts/' + run.run_attempt + '/jobs?per_page=100');
        if (!completeJobs(evidence)) return unavailable('main-source-jobs-incomplete');
        if (evidence.jobs.filter(job => job.id === Number(match[2]) && job.name === MAIN_SOURCE_JOB).length !== 1)
          return unavailable('main-source-check-job-locator');
        const proof = inspectProducerJobs(evidence.jobs, producer,
          { headSha: env.GITHUB_SHA, runId: run.id, runAttempt: run.run_attempt });
        if (proof.reason || proof.ranProducerJobWithoutGate || proof.matches.length !== 1)
          return unavailable('main-source-job-unproved');
        const step = proof.matches[0].step;
        if (step.status !== 'completed') return { required: true, reason: 'later-source-unresolved', mainAvailability: 'CONTRADICTION' };
        if (step.conclusion === 'skipped') return unavailable('main-source-job-unproved');
        if (step.conclusion !== 'success') return { required: true, reason: 'later-source-not-green', mainAvailability: 'CONTRADICTION' };
        const record = sourceGateRecord({ ...env, GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: String(run.run_attempt) }, 'success', sourceTreeSha256);
        const decision = await decideSourceGate(record, env, json, { sourceTreeSha256 });
        if (decision.required) return { ...decision, mainAvailability: 'UNPROVED' };
        return { ...decision, record, mainAvailability: 'VERIFIED' };
      }
      if (count === total) return { required: true,
        reason: 'matching-dedicated-main-source-proof-not-found', mainAvailability: 'MISSING' };
      if (count > total || page === 10 || listing.check_runs.length === 0)
        return unavailable('main-source-check-history-incomplete');
    }
    return unavailable('main-source-check-history-incomplete');
  } catch { return unavailable('main-source-proof-discovery-unavailable'); }
}

export async function discoverPullRequestSourceGate(env, sourceTreeSha256, getJson) {
  if (env.GITHUB_REF !== 'refs/heads/main' || !validSha(env.GITHUB_SHA)
      || !validSha256(sourceTreeSha256)) {
    return required('pull-request-proof-discovery-not-applicable');
  }
  try {
    const pulls = await getJson(
      `/repos/${env.GITHUB_REPOSITORY}/commits/${env.GITHUB_SHA}/pulls?per_page=100`,
    );
    if (!Array.isArray(pulls) || pulls.length > 100) return required('pull-request-proof-list-invalid');
    const candidates = pulls.filter(pull => (
      validPositiveInteger(pull.number) && pull.state === 'closed'
      && typeof pull.merged_at === 'string' && pull.merge_commit_sha === env.GITHUB_SHA
      && validSha(pull.head?.sha) && pull.head?.repo?.full_name === env.GITHUB_REPOSITORY
      && pull.base?.ref === 'main' && pull.base?.repo?.full_name === env.GITHUB_REPOSITORY
    ));
    for (const pull of candidates) {
      const artifactName = sourceTreeProofArtifactName({
        pullRequestNumber: pull.number,
        headSha: pull.head.sha,
        sourceTreeSha256,
      });
      const artifactResult = await getJson(
        `/repos/${env.GITHUB_REPOSITORY}/actions/artifacts?name=${encodeURIComponent(artifactName)}&per_page=100`,
      );
      if (!Array.isArray(artifactResult.artifacts)
          || !Number.isSafeInteger(artifactResult.total_count)
          || artifactResult.total_count !== artifactResult.artifacts.length
          || artifactResult.total_count > 100) {
        return required('pull-request-proof-artifacts-incomplete');
      }
      const artifacts = artifactResult.artifacts.filter(artifact => (
        artifact.name === artifactName && artifact.expired === false
        && validPositiveInteger(artifact.id) && validPositiveInteger(artifact.workflow_run?.id)
      )).sort((left, right) => right.id - left.id);
      for (const artifact of artifacts) {
        const runId = artifact.workflow_run.id;
        const run = await getJson(`/repos/${env.GITHUB_REPOSITORY}/actions/runs/${runId}`);
        const record = {
          contractId: SOURCE_GATE_CONTRACT,
          repository: env.GITHUB_REPOSITORY,
          headSha: env.GITHUB_SHA,
          sourceTreeSha256,
          proofKind: 'pull-request',
          pullRequestNumber: pull.number,
          producerHeadSha: pull.head.sha,
          runHeadSha: run.head_sha,
          runId: String(runId),
          runAttempt: run.run_attempt,
          conclusion: 'success',
        };
        if (!validSha(record.runHeadSha) || !validPositiveInteger(record.runAttempt)
            || !pullRequestIdentity(run, record, env.GITHUB_REPOSITORY, pull)) continue;
        const jobs = await getJson(
          `/repos/${env.GITHUB_REPOSITORY}/actions/runs/${runId}`
          + `/attempts/${record.runAttempt}/jobs?per_page=100`,
        );
        if (!completeJobs(jobs) || inspectPullRequestJobs(jobs.jobs, record).reason) continue;
        return { required: false, reason: 'discovered-identical-pull-request-source-content', record };
      }
    }
    return required('matching-pull-request-source-proof-not-found');
  } catch {
    return required('pull-request-proof-discovery-unavailable');
  }
}
