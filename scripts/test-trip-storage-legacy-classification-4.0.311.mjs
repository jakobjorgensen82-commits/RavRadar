import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  boundedFetch,
  TRIP_STORAGE_NETWORK_TIMEOUT_CODE,
} from './lib/bounded-fetch.mjs';

import {
  LEGACY_D1_ACTIVATION_EVIDENCE,
  LEGACY_D1_ACTIVATION_D1_STEPS,
  LEGACY_D1_ACTIVATION_JOB_NAME,
  LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP,
  TRIP_STORAGE_REQUIRED_SHARD_NAMES,
  assertBoundLegacyActivationEvidence,
  classifyExistingTripStorageDatabases,
  verifyLegacyActivationEvidence,
} from './lib/trip-storage-legacy-classification.mjs';

function shard(name, suffix = name) {
  return { name, uuid: `00000000-0000-4000-8000-${String(suffix).padStart(12, '0').slice(-12)}`, jurisdiction: 'eu' };
}

const complete = TRIP_STORAGE_REQUIRED_SHARD_NAMES.map((name, index) => shard(name, index));
const preparation = fs.readFileSync('scripts/prepare-cloudflare-trip-storage.mjs', 'utf8');
assert.match(preparation, /verifyLegacyActivationEvidence\(\{[\s\S]*?fetchImpl: boundedFetch/);
assert.equal(classifyExistingTripStorageDatabases([]), 'fresh');
assert.equal(classifyExistingTripStorageDatabases([...complete].reverse()), 'legacy');
for (const count of [1, 9]) {
  assert.throws(
    () => classifyExistingTripStorageDatabases(complete.slice(0, count)),
    /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
  );
}
assert.throws(
  () => classifyExistingTripStorageDatabases([...complete, shard('ravradar-trips-10', 10)]),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
assert.throws(
  () => classifyExistingTripStorageDatabases([...complete.slice(0, 9), shard('ravradar-trips-wrong', 10)]),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
assert.throws(
  () => classifyExistingTripStorageDatabases([...complete.slice(0, 9), shard('ravradar-trips-0', 10)]),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
assert.throws(
  () => classifyExistingTripStorageDatabases(complete.map((database, index) => (
    index === 4 ? { ...database, jurisdiction: 'wnam' } : database
  ))),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);

assert.equal(assertBoundLegacyActivationEvidence(), LEGACY_D1_ACTIVATION_EVIDENCE);
for (const mutation of [
  { runId: 33024408548 },
  { headSha: '6c7f774d3f09a527628d97e08c3900d49eb41a89' },
  { repository: 'someone-else/RavRadar' },
]) {
  assert.throws(
    () => assertBoundLegacyActivationEvidence({ ...LEGACY_D1_ACTIVATION_EVIDENCE, ...mutation }),
    /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
  );
}

const validRun = {
  id: LEGACY_D1_ACTIVATION_EVIDENCE.runId,
  head_sha: LEGACY_D1_ACTIVATION_EVIDENCE.headSha,
  head_branch: LEGACY_D1_ACTIVATION_EVIDENCE.headBranch,
  event: LEGACY_D1_ACTIVATION_EVIDENCE.event,
  path: LEGACY_D1_ACTIVATION_EVIDENCE.workflowPath,
  status: 'completed',
  conclusion: 'success',
};
function step(name, conclusion = 'success') {
  return { name, status: 'completed', conclusion };
}
function job(overrides = {}) {
  return {
    name: LEGACY_D1_ACTIVATION_JOB_NAME,
    run_attempt: 1,
    status: 'completed',
    conclusion: 'success',
    steps: [
      ...LEGACY_D1_ACTIVATION_D1_STEPS.map(name => step(name)),
      step(LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP, 'skipped'),
    ],
    ...overrides,
  };
}
function jobsPayload(overrides = {}) {
  return { total_count: 1, jobs: [job()], ...overrides };
}
function syntheticResponse(body, { ok = true, status = 200, link = '' } = {}) {
  return {
    ok,
    status,
    headers: { get: name => String(name).toLowerCase() === 'link' ? link : null },
    json: async () => body,
  };
}
function evidenceFetch({ run = validRun, jobs = jobsPayload(), jobsOptions = {} } = {}) {
  return async url => String(url).includes('/jobs?')
    ? syntheticResponse(jobs, jobsOptions)
    : syntheticResponse(run);
}

const requestedUrls = [];
const requestedAuthorizations = [];
await verifyLegacyActivationEvidence({
  repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
  githubToken: 'read-only-test-token',
  fetchImpl: async (url, init) => {
    requestedUrls.push(String(url));
    requestedAuthorizations.push(init?.headers?.authorization || '');
    return String(url).includes('/jobs?')
      ? syntheticResponse(jobsPayload())
      : syntheticResponse(validRun);
  },
});
assert.match(requestedUrls[0], /\/actions\/runs\/33024408547$/);
assert.match(requestedUrls[1], /\/actions\/runs\/33024408547\/jobs\?filter=latest&per_page=100$/);
assert.deepEqual(requestedAuthorizations, ['Bearer read-only-test-token', 'Bearer read-only-test-token']);
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
    githubToken: 'read-only-test-token',
    fetchImpl: evidenceFetch({ run: { ...validRun, conclusion: 'failure' } }),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: 'someone-else/RavRadar',
    githubToken: 'read-only-test-token',
    fetchImpl: evidenceFetch(),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
    githubToken: '',
    fetchImpl: evidenceFetch(),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
    githubToken: 'read-only-test-token',
    fetchImpl: async () => syntheticResponse({}, { ok: false, status: 403 }),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);

const rollbackSucceeded = jobsPayload({
  jobs: [job({
    steps: [
      ...LEGACY_D1_ACTIVATION_D1_STEPS.map(name => step(name)),
      step(LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP, 'success'),
    ],
  })],
});
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
    githubToken: 'read-only-test-token',
    fetchImpl: evidenceFetch({ jobs: rollbackSucceeded }),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
for (const conclusion of ['skipped', 'failure']) {
  const d1Outcome = jobsPayload({
    jobs: [job({
      steps: [
        ...LEGACY_D1_ACTIVATION_D1_STEPS.map((name, index) => step(name, index === 5 ? conclusion : 'success')),
        step(LEGACY_D1_ACTIVATION_SUPABASE_ROLLBACK_STEP, 'skipped'),
      ],
    })],
  });
  await assert.rejects(
    verifyLegacyActivationEvidence({
      repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
      githubToken: 'read-only-test-token',
      fetchImpl: evidenceFetch({ jobs: d1Outcome }),
    }),
    /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
  );
}
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
    githubToken: 'read-only-test-token',
    fetchImpl: async url => String(url).includes('/jobs?')
      ? syntheticResponse({}, { ok: false, status: 403 })
      : syntheticResponse(validRun),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);
for (const ambiguousJobs of [
  { total_count: 2, jobs: [job(), job()] },
  { total_count: 1, jobs: [] },
  { total_count: 1, jobs: [job({ run_attempt: 2 })] },
  { total_count: 1, jobs: [job({ name: 'A different job' })] },
  { total_count: 1, jobs: [job({ conclusion: 'failure' })] },
  {
    total_count: 1,
    jobs: [job({
      steps: job().steps.filter(candidate => candidate.name !== LEGACY_D1_ACTIVATION_D1_STEPS[0]),
    })],
  },
  { total_count: 1, jobs: [job({ steps: [...job().steps, step(LEGACY_D1_ACTIVATION_D1_STEPS[0])] })] },
]) {
  await assert.rejects(
    verifyLegacyActivationEvidence({
      repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
      githubToken: 'read-only-test-token',
      fetchImpl: evidenceFetch({ jobs: ambiguousJobs }),
    }),
    /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
  );
}
await assert.rejects(
  verifyLegacyActivationEvidence({
    repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
    githubToken: 'read-only-test-token',
    fetchImpl: evidenceFetch({ jobsOptions: { link: '<https://api.github.com/next>; rel="next"' } }),
  }),
  /TRIP_STORAGE_LEGACY_CLASSIFICATION_INVALID/,
);

let observedTimeoutMs = null;
let observedBoundedSignal = null;
const deadlineController = new AbortController();
let jobsRequestStarted;
const jobsRequestStartedPromise = new Promise(resolve => { jobsRequestStarted = resolve; });
const boundedEvidenceRequest = verifyLegacyActivationEvidence({
  repository: LEGACY_D1_ACTIVATION_EVIDENCE.repository,
  githubToken: 'read-only-test-token',
  fetchImpl: (input, init) => boundedFetch(input, init, {
    timeoutMs: 1_337,
    timeoutSignalFactory: milliseconds => {
      observedTimeoutMs = milliseconds;
      return deadlineController.signal;
    },
    fetchImpl: async (boundedInput, boundedInit = {}) => {
      observedBoundedSignal = boundedInit.signal;
      if (!String(boundedInput).includes('/jobs?')) return syntheticResponse(validRun);
      jobsRequestStarted();
      return new Promise((resolve, reject) => {
        if (boundedInit.signal?.aborted) {
          reject(boundedInit.signal.reason);
          return;
        }
        boundedInit.signal?.addEventListener('abort', () => reject(boundedInit.signal.reason), { once: true });
      });
    },
  }),
});
await jobsRequestStartedPromise;
deadlineController.abort(new DOMException('synthetic legacy-evidence deadline', 'TimeoutError'));
await assert.rejects(
  boundedEvidenceRequest,
  error => error?.code === TRIP_STORAGE_NETWORK_TIMEOUT_CODE && error?.cause?.name === 'TimeoutError',
);
assert.equal(observedTimeoutMs, 1_337);
assert.ok(observedBoundedSignal instanceof AbortSignal);
assert.equal(observedBoundedSignal.aborted, true);

console.log('Legacy-D1-klassifikation: 0=fresh, eksakt EU-sæt 0..9=legacy, alle tvetydige sæt fail-closed, og run/head-beviset er kildebundet.');
