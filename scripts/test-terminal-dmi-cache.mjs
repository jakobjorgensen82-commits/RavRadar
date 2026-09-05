import assert from 'node:assert/strict';
import {
  DMI_CACHE_SAVE_STEP,
  DMI_PRODUCER_JOB,
  DMI_PRODUCER_STEP,
  DMI_TERMINAL_STEP,
  parseLegacyDmiCache,
  selectTerminalDmiCache,
  TERMINAL_DMI_CACHE_CONTRACT,
} from './lib/terminal-dmi-cache.mjs';

const repository = 'owner/repository';
const runId = 33990516150;
const runAttempt = 1;
const headSha = 'a'.repeat(40);
const cache = {
  id: 7369179233,
  ref: 'refs/heads/main',
  key: `dmi-zone-cache-v1-Linux-2026-W36-${runId}-${runAttempt}`,
  version: 'b'.repeat(64),
  created_at: '2026-09-05T20:45:22Z',
  size_in_bytes: 48_847_855,
};
const run = {
  id: runId,
  run_attempt: runAttempt,
  head_branch: 'main',
  head_sha: headSha,
  path: '.github/workflows/update-and-deploy.yml',
  repository: { full_name: repository },
};
const step = (name, started_at, completed_at, conclusion = 'success', number = 1) => ({
  name, number, status: 'completed', conclusion, started_at, completed_at,
});
const job = {
  name: DMI_PRODUCER_JOB,
  run_id: runId,
  run_attempt: runAttempt,
  head_branch: 'main',
  head_sha: headSha,
  steps: [
    step(DMI_PRODUCER_STEP, '2026-09-05T20:37:07Z', '2026-09-05T20:45:01Z', 'success', 50),
    step(DMI_CACHE_SAVE_STEP, '2026-09-05T20:45:17Z', '2026-09-05T20:45:22Z', 'success', 54),
    step(DMI_TERMINAL_STEP, '2026-09-05T20:45:22Z', '2026-09-05T20:45:22Z', 'success', 56),
  ],
};
const route = suffix => `/repos/${repository}/actions/runs/${runId}/attempts/${runAttempt}${suffix}`;
const evidence = { total_count: 1, jobs: [job] };
const getJson = async value => {
  if (value === route('')) return run;
  if (value === route('/jobs?per_page=100')) return evidence;
  throw new Error(`Unexpected route: ${value}`);
};

assert.equal(parseLegacyDmiCache(cache)?.runId, runId);
for (const invalid of [
  { ...cache, ref: 'refs/heads/feature' },
  { ...cache, key: 'dmi-zone-cache-v1-Linux-latest' },
  { ...cache, id: 0 },
  { ...cache, size_in_bytes: 0 },
  { ...cache, version: 'invalid' },
  { ...cache, created_at: 'invalid' },
]) assert.equal(parseLegacyDmiCache(invalid), null);

const selected = await selectTerminalDmiCache([cache], repository, getJson);
assert.equal(selected.contractId, TERMINAL_DMI_CACHE_CONTRACT);
assert.equal(selected.key, cache.key);
assert.equal(selected.cacheId, cache.id);
assert.equal(selected.cacheVersion, cache.version);
assert.equal(selected.headSha, headSha);

const failingEvidence = conclusion => ({
  total_count: 1,
  jobs: [{ ...job, steps: job.steps.map(item => (
    item.name === DMI_TERMINAL_STEP ? { ...item, conclusion } : item
  )) }],
});
assert.equal(
  await selectTerminalDmiCache([cache], repository, async value => (
    value === route('') ? run : failingEvidence('failure')
  )),
  null,
);
assert.equal(
  await selectTerminalDmiCache(
    [{ ...cache, created_at: '2026-09-05T20:45:25Z' }],
    repository,
    getJson,
  ),
  null,
);
assert.equal(
  await selectTerminalDmiCache(
    [{ ...cache, created_at: '2026-09-05T20:30:00Z' }],
    repository,
    getJson,
  ),
  null,
);
assert.equal(
  await selectTerminalDmiCache([cache], repository, async value => (
    value === route('') ? { ...run, run_attempt: 2 } : evidence
  )),
  null,
);
for (const invalidRun of [
  { ...run, path: '.github/workflows/other.yml' },
  { ...run, repository: { full_name: 'other/repository' } },
  { ...run, head_sha: 'invalid' },
]) {
  assert.equal(
    await selectTerminalDmiCache([cache], repository, async value => (
      value === route('') ? invalidRun : evidence
    )),
    null,
  );
}
for (const invalidJobs of [
  [{ ...job, name: 'Other job' }],
  [job, { ...job }],
  [{ ...job, steps: job.steps.map(item => (
    item.name === DMI_PRODUCER_STEP ? { ...item, conclusion: 'failure' } : item
  )) }],
  [{ ...job, steps: job.steps.map(item => (
    item.name === DMI_CACHE_SAVE_STEP ? { ...item, conclusion: 'failure' } : item
  )) }],
  [{ ...job, steps: [
    job.steps[0],
    { ...job.steps[1], completed_at: '2026-09-05T20:45:23Z' },
    job.steps[2],
  ] }],
  [{ ...job, steps: [
    job.steps[0],
    { ...job.steps[1], number: 57 },
    job.steps[2],
  ] }],
]) {
  assert.equal(
    await selectTerminalDmiCache([cache], repository, async value => (
      value === route('') ? run : { total_count: invalidJobs.length, jobs: invalidJobs }
    )),
    null,
  );
}

assert.equal(
  await selectTerminalDmiCache(
    [cache, { ...cache, id: cache.id + 1, version: 'c'.repeat(64) }],
    repository,
    async () => { throw new Error('Ambiguous cache key must not reach run evidence'); },
  ),
  null,
);

const olderRunId = runId - 1;
const olderCache = {
  ...cache,
  id: cache.id - 1,
  key: `dmi-zone-cache-v1-Linux-2026-W36-${olderRunId}-1`,
  created_at: '2026-09-05T20:45:21Z',
};
const olderRun = { ...run, id: olderRunId };
const olderJob = { ...job, run_id: olderRunId };
const olderBase = `/repos/${repository}/actions/runs/${olderRunId}/attempts/1`;
const fallbackReader = async value => {
  if (value === route('')) return run;
  if (value === route('/jobs?per_page=100')) return failingEvidence('failure');
  if (value === olderBase) return olderRun;
  if (value === `${olderBase}/jobs?per_page=100`) {
    return { total_count: 1, jobs: [olderJob] };
  }
  throw new Error(`Unexpected fallback route: ${value}`);
};
assert.equal(
  (await selectTerminalDmiCache([olderCache, cache], repository, fallbackReader))?.key,
  olderCache.key,
);

const notFound = new Error('not found');
notFound.status = 404;
assert.equal(
  (await selectTerminalDmiCache([olderCache, cache], repository, async value => {
    if (value === route('')) throw notFound;
    if (value === olderBase) return olderRun;
    if (value === `${olderBase}/jobs?per_page=100`) {
      return { total_count: 1, jobs: [olderJob] };
    }
    throw new Error(`Unexpected 404 fallback route: ${value}`);
  }))?.key,
  olderCache.key,
);
await assert.rejects(
  selectTerminalDmiCache([cache], repository, async () => { throw new Error('offline'); }),
  /offline/,
);

console.log('OK: only the newest exact-main legacy cache with producer, save and terminal evidence is selectable.');
