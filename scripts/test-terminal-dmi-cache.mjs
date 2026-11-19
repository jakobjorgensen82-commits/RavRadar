import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  DMI_CACHE_SAVE_STEP,
  DMI_PRODUCER_JOB,
  DMI_PRODUCER_STEP,
  DMI_TERMINAL_STEP,
  parseLegacyDmiCache,
  selectTerminalDmiCache,
  TERMINAL_DMI_CACHE_CONTRACT,
} from './lib/terminal-dmi-cache.mjs';
import {planRawDmiCacheRotation, readRawCacheReaderActivity} from './lib/verified-raw-cache-rotation.mjs';

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

const rawCaches = [1, 2, 3, 4].map(day => ({
  ...cache,
  id: cache.id + day,
  key: `dmi-grib-v4-Linux-2026-W36-${runId + day}-1`,
  created_at: `2026-09-0${day}T20:45:22Z`,
}));
const rawIdentity = ({ id, key, ref, version }) => ({ id, key, ref, version });
const retained = rawCaches.slice(-2).reverse().map(rawIdentity);
const boundary = {
  datasetId: 'rr-20260904190000-210',
  productionReferenceAt: '2026-09-04T19:00:00.000Z',
  bundleContentSha256: 'c'.repeat(64),
  checkpointGenerationSha256: 'd'.repeat(64),
  conditionsSha256: 'e'.repeat(64),
};
const current = {
  runId: String(runId + 5), runAttempt: '1', sourceHead: headSha,
  targetReferenceAt: '2026-09-05T00:00:00Z', boundary, requiredCaptures: 52,
};
const hashJson = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const observation = {
  kind: 'DMI_RESTORED_RAW_OBSERVATION_V2',
  runId: current.runId, runAttempt: current.runAttempt, sourceHead: current.sourceHead,
  targetReferenceAt: current.targetReferenceAt,
  // The Python producer serializes these before hashing with sorted keys.
  baselineBoundarySha256: hashJson({
    bundleContentSha256: boundary.bundleContentSha256,
    checkpointGenerationSha256: boundary.checkpointGenerationSha256,
    conditionsSha256: boundary.conditionsSha256,
    datasetId: boundary.datasetId,
    productionReferenceAt: boundary.productionReferenceAt,
  }),
  cacheIdentitySha256: hashJson({ id: retained[0].id, key: retained[0].key, version: retained[0].version }),
  allRequiredVerified: true, requiredCaptures: 52, protectedFiles: 52, unavailableCaptures: 0,
};
const otherRefCache = { ...cache, ref: 'refs/pull/99/merge', size_in_bytes: 0 };
const snapshot = (caches = [...rawCaches, otherRefCache], protectedCaches = [retained[1]]) => ({
  inventory: { total_count: caches.length, actions_caches: caches },
  protection: { complete: true, caches: protectedCaches },
});
const plan = { before: snapshot(), after: snapshot(), retained, current, observation };
assert.deepEqual(planRawDmiCacheRotation({
  ...plan, after: snapshot([...plan.before.inventory.actions_caches].reverse()
    .map(row => ({ ...row, last_accessed_at: '2026-09-05T00:00:00Z' }))),
}), {
  status: 'HOLD', reason: 'retirement-requires-successor-save', retire: [],
});
const checkHold = (replacement, reason) => {
  assert.deepEqual(planRawDmiCacheRotation({ ...plan, ...replacement }), { status: 'HOLD', reason, retire: [] });
};
const sameSnapshots = (caches, protectedCaches) => ({
  before: snapshot(caches, protectedCaches), after: snapshot(caches, protectedCaches),
});

checkHold({ after: { ...plan.after, inventory: { ...plan.after.inventory, total_count: 6 } } }, 'incomplete-cache-inventory');
checkHold(sameSnapshots([...rawCaches, rawCaches[0]]), 'incomplete-cache-inventory');
checkHold({ after: snapshot([...rawCaches, { ...otherRefCache, size_in_bytes: 1 }]) }, 'cache-inventory-changed');
checkHold({ after: { ...plan.after, protection: { caches: [] } } }, 'incomplete-raw-cache-protection');
checkHold({ after: snapshot(undefined, []) }, 'raw-cache-protection-changed');

checkHold(sameSnapshots(rawCaches, [rawIdentity(rawCaches[0])]), 'protected-raw-cache-outside-newest-two');
checkHold(sameSnapshots(rawCaches, [{ ...retained[1], version: 'f'.repeat(64) }]), 'protected-raw-cache-unavailable');
checkHold(sameSnapshots(rawCaches, [{ ...retained[1], id: 1 }]), 'protected-raw-cache-unavailable');
checkHold(sameSnapshots([...rawCaches, { ...rawCaches[0], id: 1 }]), 'ambiguous-raw-cache-key');
for (const [otherRaw, reason] of [
  [{ ...rawCaches[0], ref: 'refs/pull/99/merge' }, 'other-raw-cache-conflicts-with-newest-two'],
  [{ ...rawCaches[0], key: rawCaches[0].key.replace('-v4-', '-v3-') }, 'other-raw-cache-conflicts-with-newest-two'],
  [{ ...rawCaches[0], size_in_bytes: 0 }, 'raw-cache-upload-not-finalized'],
  [{ ...rawCaches[0], version: 'f'.repeat(64) }, 'raw-cache-version-conflict'],
]) checkHold(sameSnapshots([otherRaw, ...rawCaches.slice(1)]), reason);
checkHold({ retained: [...retained].reverse() }, 'raw-cache-order-or-identity-mismatch');
checkHold(sameSnapshots([...rawCaches.slice(0, 3), { ...rawCaches[3], created_at: rawCaches[2].created_at }]),
  'raw-cache-order-or-identity-mismatch');
checkHold(sameSnapshots(rawCaches.slice(-1)), 'two-finalized-raw-caches-required');

for (const incorrectObservation of [
  { ...observation, runAttempt: '2' },
  { ...observation, unavailableCaptures: 1 },
  { ...observation, baselineBoundarySha256: 'f'.repeat(64) },
  { ...observation, cacheIdentitySha256: hashJson({ id: retained[1].id, key: retained[1].key, version: retained[1].version }) },
]) checkHold({ observation: incorrectObservation }, 'current-raw-restore-coverage-unverified');
checkHold({ current: { ...current, boundary: { ...boundary, datasetId: 'rr-superseding-dataset' } } },
  'current-raw-restore-coverage-unverified');
checkHold({ current: { ...current, requiredCaptures: 53 } }, 'current-raw-restore-coverage-unverified');
assert.deepEqual(planRawDmiCacheRotation({ ...plan, ...sameSnapshots(rawCaches.slice(-2)) }), {
  status: 'READY', reason: 'already-two-raw-caches', retain: retained, retire: [],
});
console.log('OK: exact RAW cache rotation holds on changed, unverified or pinned evidence.');

const capture = {
  collection: 'dkss_idw', modelRun: '2026-09-04T12:00:00Z', validTime: '2026-09-04T19:00:00Z',
  itemId: 'Synthetic \u00f8 \ud83c\udf0a', assetIdentitySha256: '1'.repeat(64), assetSizeBytes: 51,
  acquiredAt: '2026-09-05T00:14:58Z', contentLengthBytes: 51, contentSha256: '2'.repeat(64),
  itemCreatedAt: null, itemUpdatedAt: null,
};
// From Python json.dumps with ensure_ascii=False over the capture without acquiredAt.
const pythonCaptureHash = '1448859a916c19d6297ab09387b79bc6a75b40576aa24b6728a93c711735ec95';
const captureSetSha256 = hashJson([pythonCaptureHash]);
const membership = {
  schemaVersion: 2,
  execution: { RUN_ID: String(runId + 4), RUN_ATTEMPT: '1', SHA: headSha },
  boundarySha256: observation.baselineBoundarySha256,
  captureSetSha256, manifestSha256: '9'.repeat(64),
  files: [['0'.repeat(24) + '.grib', {}, pythonCaptureHash]],
};
const membershipBytes = Buffer.from(JSON.stringify(membership));
const saved = {
  receipt: {
    schemaVersion: 2, kind: 'DMI_RAW_SAVE_COMMITTED_MEMBERSHIP', key: retained[0].key, cacheId: retained[0].id,
    observationSha256: createHash('sha256').update(membershipBytes).digest('hex'),
    boundarySha256: membership.boundarySha256, captureSetSha256, manifestSha256: membership.manifestSha256,
    verifiedCaptureCount: 1,
  },
  membershipBytes,
  predecessorBoundary: boundary,
};
const successorBoundary = {
  datasetId: 'rr-20260905000000-210', productionReferenceAt: '2026-09-05T00:00:00.000Z',
  bundleContentSha256: '6'.repeat(64), checkpointGenerationSha256: '7'.repeat(64), conditionsSha256: '8'.repeat(64),
};
const successor = {
  runId: String(runId + 4), runAttempt: '1', sourceHead: headSha,
  targetReferenceAt: '2026-09-05T04:00:00Z', boundary: successorBoundary, requiredCaptures: 1,
  successorPlan: {
    schemaVersion: 1, kind: 'PUBLISHED_RAW_ROTATION_SUCCESSOR_PLAN', targetReferenceAt: '2026-09-05T04:00:00.000Z',
    retention: {
      schemaVersion: 1, kind: 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION', boundary: successorBoundary, captures: [capture],
    },
  },
};
const savePlan = { ...plan, current: successor, observation: undefined, saved };
assert.deepEqual(planRawDmiCacheRotation(savePlan).retire, [rawIdentity(rawCaches[0])]);
const withCapture = next => ({
  ...successor, successorPlan: {
    ...successor.successorPlan, retention: {...successor.successorPlan.retention, captures: [next]},
  },
});
assert.equal(planRawDmiCacheRotation({
  ...savePlan, current: withCapture({ ...capture, acquiredAt: '2026-09-05T02:30:00Z' }),
}).status, 'READY');
for (const condition of [
  {current: withCapture({ ...capture, contentSha256: '3'.repeat(64) })},
  {current: withCapture({ ...capture, itemId: 'Different provider object' })},
  {current: {...successor, requiredCaptures: 2}},
  {current: {...successor, requiredCaptures: 0, successorPlan: {
    ...successor.successorPlan, retention: {...successor.successorPlan.retention, captures: []},
  }}},
  {current: {...successor, targetReferenceAt: '2026-09-05T00:00:00Z'}},
  {current: {...successor, targetReferenceAt: '2026-09-05T05:00:00Z'}},
  {current: {...successor, boundary}},
  {current: {...successor, sourceHead: '5'.repeat(40)}},
  {saved: {...saved, membershipBytes: Buffer.from(JSON.stringify({...membership, files: []}))}},
  {saved: {...saved, receipt: {...saved.receipt, verifiedCaptureCount: 2}}},
  {saved: {...saved, receipt: {...saved.receipt, cacheId: retained[1].id}}},
  {saved: {...saved, predecessorBoundary: successorBoundary}},
]) {
  assert.deepEqual(planRawDmiCacheRotation({...savePlan, ...condition}), {
    status: 'HOLD', reason: 'successor-raw-save-coverage-unverified', retire: [],
  });
}
console.log('OK: finalized RAW membership must cover the authenticated successor plan.');

const ordinaryOwner = {
  id: 111, path: '.github/workflows/run-current-weather-once.yml', status: 'in_progress',
  conclusion: null, head_branch: 'main', head_sha: headSha, run_attempt: 1, event: 'workflow_dispatch',
  actor: {login: 'github-actions[bot]'}, triggering_actor: {login: 'github-actions[bot]'},
  repository: {full_name: repository},
};
const inertLegacy = {
  ...ordinaryOwner, id: 34613079069, path: '.github/workflows/update-and-deploy.yml', status: 'queued',
  head_sha: '5587001b45ffea056addaf6cd20084719540336a',
  created_at: '2026-09-11T14:55:55Z', updated_at: '2026-09-11T14:55:55Z',
};
const queuedAudit = {
  ...ordinaryOwner, id: 112, status: 'queued', path: '.github/workflows/audit-saved-weather-inputs.yml',
};
const readActivity = async (rows, respond) => readRawCacheReaderActivity({
  repository, sourceHead: headSha, ownerRunId: ordinaryOwner.id,
  getJson: async route => {
    const status = new URL(route, 'https://example.invalid').searchParams.get('status');
    if (status) {
      const matches = rows.filter(row => row.status === status);
      return respond?.(route) ?? {total_count: matches.length, workflow_runs: matches};
    }
    assert.equal(route, '/repos/' + repository + '/actions/runs/34613079069/attempts/1/jobs?per_page=1');
    return respond?.(route) ?? {total_count: 0, jobs: []};
  },
});
assert.deepEqual(await readActivity([ordinaryOwner, inertLegacy]), {status: 'CLEAR', checkedRuns: 2, inertLegacy: 1});
assert.deepEqual(await readActivity([ordinaryOwner, queuedAudit, inertLegacy]), {
  status: 'HOLD', reason: 'possible-raw-reader-active-or-queued',
});
assert.deepEqual(await readActivity([ordinaryOwner, {...inertLegacy, run_attempt: 2}]), {
  status: 'HOLD', reason: 'possible-raw-reader-active-or-queued',
});
assert.deepEqual(await readActivity([ordinaryOwner, inertLegacy], route =>
  route.includes('/jobs') ? {total_count: 1, jobs: [{id: 251}]} : undefined), {
  status: 'HOLD', reason: 'legacy-reader-not-proved-inert',
});
assert.deepEqual(await readActivity([ordinaryOwner], route =>
  route.includes('status=pending') ? {total_count: 1, workflow_runs: []} : undefined), {
  status: 'HOLD', reason: 'incomplete-reader-inventory',
});
assert.deepEqual(await readActivity([{...ordinaryOwner, run_attempt: 2}]), {
  status: 'HOLD', reason: 'rotation-owner-unconfirmed',
});
assert.deepEqual(await readActivity([ordinaryOwner, {...queuedAudit, path: '.github/workflows/new-reader.yml',
  head_branch: 'other', head_sha: 'b'.repeat(40)}]), {
  status: 'HOLD', reason: 'possible-raw-reader-active-or-queued',
});
console.log('OK: queued RAW readers hold retirement; exact jobless legacy identities alone can be excluded.');
