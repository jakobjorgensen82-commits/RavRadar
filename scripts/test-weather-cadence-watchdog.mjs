import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { assessWeatherCadenceWatchdog } from './check-weather-cadence-watchdog.mjs';
import { notifyWeatherFailure, weatherFailureIssue, WEATHER_FAILURE_REPOSITORY,
  WEATHER_FAILURE_OWNER } from './notify-weather-failure.mjs';

const at = value => Date.parse(value);
const run = (created, updated = created, status = 'completed', branch = 'main', conclusion = 'success') => ({
  head_branch: branch,
  status,
  conclusion: status === 'completed' ? conclusion : null,
  created_at: created,
  updated_at: updated,
  run_attempt: 1,
  run_started_at: created,
});
const old = run('2026-09-27T20:25:00Z', '2026-09-27T23:03:00Z');
const inertLegacy = [
  { id: 34868901509, at: '2026-09-14T16:29:10Z', sha: 'c4930944a6273c00f201994504e3971ad3f2b165' },
  { id: 34613079069, at: '2026-09-11T14:55:55Z', sha: '5587001b45ffea056addaf6cd20084719540336a' },
  { id: 34228112413, at: '2026-09-08T12:47:45Z', sha: 'b814b525962514a368536f456477881390d6b333' },
].map(({ id, at: time, sha }) => ({
  ...run(time, time, 'queued'), id, run_attempt: 1,
  event: 'workflow_dispatch', head_sha: sha,
}));
const base = {
  normalRuns: { workflow_runs: [old, ...inertLegacy] },
  manualRuns: { workflow_runs: [old] },
  nowMs: at('2026-09-28T00:19:00Z'),
};
const check = overrides => assessWeatherCadenceWatchdog({ ...base, ...overrides });

assert.deepEqual(check({}), {
  dispatch: true,
  reason: 'external-four-hour-weather-slot-ready',
  slotAt: '2026-09-28T00:17:00.000Z',
});
for (const legacy of inertLegacy) {
  assert.equal(check({ normalRuns: { workflow_runs: [old, legacy] } }).dispatch, true,
    'Only the exact verified inert legacy queue may be ignored');
  for (const changed of [
    { ...legacy, id: legacy.id + 1 },
    { ...legacy, run_attempt: 2 },
    { ...legacy, event: 'schedule' },
    { ...legacy, status: 'in_progress' },
    { ...legacy, created_at: new Date(Date.parse(legacy.created_at) - 1000).toISOString() },
    { ...legacy, updated_at: '2026-09-28T00:18:00Z' },
    { ...legacy, head_sha: 'a'.repeat(40) },
  ]) assert.equal(check({ normalRuns: { workflow_runs: [old, changed] } }).reason,
    'weather-run-active-or-queued', 'A changed or unknown queued run must block dispatch');
}
assert.equal(check({ nowMs: at('2026-09-28T00:17:59Z') }).reason, 'before-external-cadence-window');
assert.equal(check({ nowMs: at('2026-09-28T01:47:00Z') }).reason, 'external-cadence-window-expired');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:30Z')] } }).reason,
'weather-run-already-started-in-slot');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:30Z')] } }).dispatch, false);
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:30Z')] } }).dispatch, false);
// A later GitHub attempt retains the original created_at. The actual latest
// attempt, including a failed one, must still occupy its start slot.
for (const entrance of ['normalRuns', 'manualRuns']) {
  for (const conclusion of ['success', 'failure', 'cancelled']) {
    const retried = { ...run('2026-09-27T20:25:00Z', '2026-09-28T00:18:59Z',
      'completed', 'main', conclusion), run_attempt: 2, run_started_at: '2026-09-28T00:18:00Z' };
    assert.equal(check({ [entrance]: { workflow_runs: [old, retried] } }).reason,
      'weather-run-already-started-in-slot', `${entrance}: latest attempt counts, not original creation`);
    const previousSlot = { ...retried, run_started_at: '2026-09-27T23:00:00Z' };
    assert.equal(check({ [entrance]: { workflow_runs: [old, previousSlot] } }).dispatch, true,
      'Completion in this slot does not move a previous-slot attempt into it');
  }
}
const latestAttempt = { ...run('2026-09-27T20:25:00Z', '2026-09-28T00:18:59Z'),
  run_attempt: 2, run_started_at: '2026-09-28T00:18:00Z' };
for (const fields of [
  { run_attempt: undefined }, { run_attempt: 0 }, { run_attempt: 1.5 }, { run_attempt: '2' },
  { run_started_at: undefined }, { run_started_at: null }, { run_started_at: 'bad' },
  { run_started_at: '2026-09-27T20:24:59Z' },
  { run_started_at: '2026-09-28T00:19:00Z' },
]) assert.throws(() => check({ manualRuns: { workflow_runs: [old, { ...latestAttempt, ...fields }] } }),
  /malformed/, 'Unknown or contradictory attempt timing must not authorize dispatch');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:59Z', 'completed', 'main', 'failure')] } }).dispatch, false,
  'A failed normal attempt is still an attempt; never blindly retry it');
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-27T22:00:00Z', '2026-09-27T22:00:00Z', 'queued')] } }).reason,
'weather-run-active-or-queued');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-27T23:00:00Z', '2026-09-28T00:18:00Z', 'completed', 'main', 'failure')] } }).reason,
'external-four-hour-weather-slot-ready');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-27T23:00:00Z', '2026-09-28T00:18:00Z')] } }).dispatch, true,
  'A completed previous-slot run must not block the new slot even if it finished late');
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-27T23:10:00Z', '2026-09-27T23:40:00Z', 'completed', 'main', 'failure')] } }).reason,
'external-four-hour-weather-slot-ready');
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-27T23:10:00Z', '2026-09-27T23:40:00Z', 'completed', 'main', 'failure'),
  run('2026-09-27T23:45:00Z', '2026-09-28T00:05:00Z')] } }).dispatch, true);
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:30:00Z', '2026-09-28T00:30:00Z', 'completed', 'feature/test')] } }).dispatch, true);
assert.equal(check({ nowMs: at('2026-09-28T04:19:00Z') }).slotAt,
  '2026-09-28T04:17:00.000Z');
assert.equal(check({ nowMs: at('2026-09-28T23:00:00Z') }).slotAt,
  '2026-09-28T20:17:00.000Z');
assert.throws(() => check({ normalRuns: { workflow_runs: null } }), /unavailable/);
assert.throws(() => check({ normalRuns: { workflow_runs: [
  { ...old, updated_at: 'bad' },
] } }), /malformed/);
assert.throws(() => check({ manualRuns: { workflow_runs: [] } }), /No verified/);
assert.throws(() => check({ normalRuns: { workflow_runs: [{ ...old, conclusion: null }] } }), /malformed/);

const workflow = await fs.readFile('.github/workflows/watch-missed-weather-schedule.yml', 'utf8');
assert.doesNotMatch(workflow, /\bschedule:\s*\n/);
assert.match(workflow, /steps\.first-check\.outputs\.dispatch == 'true' && steps\.recheck\.outputs\.dispatch == 'true'/);
assert.match(workflow, /inputs\.external_watchdog == true/);
assert.match(workflow, /run-current-weather-once\.yml\/dispatches/);
assert.match(workflow, /inputs\[quick_confirmation\]=false/);
assert.match(workflow, /run-current-weather-once\.yml\/runs/);
assert.equal((workflow.match(/node scripts\/check-weather-cadence-watchdog\.mjs/g) || []).length, 2);
assert.doesNotMatch(workflow, /retry-failed-production|external_watchdog=true/);
console.log('External four-hour weather cadence: one run per slot and fail-closed guards passed.');

// Exercise the actual owner-alert caller with a bounded, network-free API seam.
// Fixtures are synthetic metadata, never production logs or weather payloads.
const alertHead = 'a'.repeat(40);
const alertBase = `/repos/${WEATHER_FAILURE_REPOSITORY}`;
const alertRun = {
  id: 123, run_attempt: 1, head_branch: 'main', head_sha: 'b'.repeat(40),
  path: '.github/workflows/run-current-weather-once.yml', event: 'workflow_dispatch',
  status: 'completed', conclusion: 'failure',
  repository: { id: 1306858343, full_name: WEATHER_FAILURE_REPOSITORY },
  head_repository: { id: 1306858343, full_name: WEATHER_FAILURE_REPOSITORY },
  html_url: `https://github.com/${WEATHER_FAILURE_REPOSITORY}/actions/runs/123`,
};
function alertApi({ candidate = alertRun, renewed = candidate, rows = [],
  mainHeads = [alertHead, alertHead], createError = false, createdFields = {},
  verifiedFields = {} } = {}) {
  const calls = [];
  let reads = 0, heads = 0;
  const issue = weatherFailureIssue(alertRun);
  const saved = { ...issue, number: 7, user: { login: 'github-actions[bot]' },
    assignees: [{ login: WEATHER_FAILURE_OWNER }] };
  const get = async route => {
    calls.push({ method: 'GET', route });
    if (route === alertBase) return { id: 1306858343, full_name: WEATHER_FAILURE_REPOSITORY,
      default_branch: 'main', has_issues: true };
    if (route === `${alertBase}/git/ref/heads/main`) return { object: { sha: mainHeads[heads++] } };
    if (route === `${alertBase}/actions/runs/123`) return structuredClone(reads++ ? renewed : candidate);
    if (route.startsWith(`${alertBase}/issues?`)) return structuredClone(rows);
    if (route === `${alertBase}/assignees/${WEATHER_FAILURE_OWNER}`) return null;
    if (route === `${alertBase}/issues/7`) return { ...saved, ...verifiedFields };
    assert.fail(`Unexpected metadata route: ${route}`);
  };
  const post = async (route, body) => {
    calls.push({ method: 'POST', route, body: structuredClone(body) });
    assert.equal(route, `${alertBase}/issues`);
    assert.deepEqual(body, issue);
    if (createError) throw new Error('SYNTHETIC_PRIVATE_ERROR_MUST_NOT_ESCAPE');
    return { ...saved, ...createdFields };
  };
  return { calls, get, post, invoke: () => notifyWeatherFailure({ runId: 123,
    eventAttempt: 1, sourceHead: alertHead, get, post }) };
}
const alertCode = code => error => error?.alertCode === code && error.message === code;
const writes = api => api.calls.filter(call => call.method === 'POST');

test('Owner alert emits only the approved fixed link/status and assignment', () => {
  const canary = 'SYNTHETIC_PRIVATE_PAYLOAD_MUST_NOT_ESCAPE';
  const candidate = { ...alertRun, display_title: canary, name: canary,
    actor: { login: canary }, triggering_actor: { login: canary }, error: canary };
  for (const conclusion of ['failure', 'timed_out', 'startup_failure']) {
    const issue = weatherFailureIssue({ ...candidate, conclusion });
    assert.deepEqual(Object.keys(issue), ['title', 'body', 'assignees']);
    assert.deepEqual(issue.assignees, [WEATHER_FAILURE_OWNER]);
    assert.equal(issue.body, `Vejrhentning: ${alertRun.html_url}\n\nStatus: ${conclusion}\n\n<!-- ravradar-weather-failure:123 -->`);
    assert.equal(JSON.stringify(issue).includes(canary), false);
  }
  for (const fields of [{ status: 'in_progress', conclusion: null },
    { conclusion: 'success' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' }]) {
    assert.equal(weatherFailureIssue({ ...alertRun, ...fields }), null);
  }
});

test('Owner alert rejects other repositories, forks, workflows and untrusted identities', () => {
  for (const fields of [{ id: 0 }, { id: '123' }, { run_attempt: 1.5 },
    { repository: { ...alertRun.repository, id: 1 } },
    { head_repository: { ...alertRun.head_repository, full_name: 'other/RavRadar' } },
    { head_branch: 'feature' }, { event: 'pull_request' }, { head_sha: 'bad' },
    { path: '.github/workflows/update-weather.yml' }]) {
    assert.throws(() => weatherFailureIssue({ ...alertRun, ...fields }), alertCode('RUN_SCOPE_REJECTED'));
  }
  assert.throws(() => weatherFailureIssue({ ...alertRun, html_url: 'https://example.invalid/private' }),
    alertCode('RUN_URL_REJECTED'));
});

test('Owner alert makes one metadata-only write and verifies persisted assignment', async () => {
  const api = alertApi();
  assert.deepEqual(await api.invoke(), { status: 'CREATED', issueNumber: 7, runId: 123,
    privatePayloadIncluded: false, websiteChanged: false, emailReceiptVerified: false });
  assert.equal(writes(api).length, 1);
  assert.equal(api.calls.at(-1).route, `${alertBase}/issues/7`);
  assert.equal(api.calls.some(call => /logs|artifacts|caches|dispatches|contents/.test(call.route)), false);
});

test('Closed assigned owner alert is deduplicated; old attempt and success never write', async () => {
  const issue = weatherFailureIssue(alertRun);
  const api = alertApi({ rows: [{ ...issue, number: 9, state: 'closed',
    user: { login: 'github-actions[bot]' }, assignees: [{ login: WEATHER_FAILURE_OWNER }] }] });
  assert.deepEqual(await api.invoke(), { status: 'EXISTING', issueNumber: 9, runId: 123,
    privatePayloadIncluded: false });
  assert.equal(writes(api).length, 0);
  for (const [candidate, reason] of [[{ ...alertRun, run_attempt: 2 }, 'ATTEMPT_SUPERSEDED'],
    [{ ...alertRun, conclusion: 'success' }, 'NOT_COMPLETED_FAILURE']]) {
    const skipped = alertApi({ candidate });
    assert.deepEqual(await skipped.invoke(), { status: 'SKIPPED', reason });
    assert.equal(writes(skipped).length, 0);
  }
});

test('Changed live run/main and bounded incomplete issue inventory fail before create', async () => {
  for (const [settings, code] of [
    [{ renewed: { ...alertRun, run_attempt: 2 } }, 'RUN_CHANGED_BEFORE_CREATE'],
    [{ renewed: { ...alertRun, conclusion: 'success' } }, 'RUN_CHANGED_BEFORE_CREATE'],
    [{ mainHeads: [alertHead, 'c'.repeat(40)] }, 'SOURCE_HEAD_CHANGED'],
    [{ rows: Array.from({ length: 100 }, (_, index) => ({ number: index + 1, title: 'other' })) },
      'ISSUE_LIST_BOUND_NO_CREATE'],
  ]) {
    const api = alertApi(settings);
    await assert.rejects(api.invoke(), alertCode(code));
    assert.equal(writes(api).length, 0);
    if (code === 'ISSUE_LIST_BOUND_NO_CREATE') {
      assert.equal(api.calls.filter(call => call.route.startsWith(`${alertBase}/issues?`)).length, 100);
    }
  }
});

test('Unknown create outcome or failed readback never retries or echoes the primary error', async () => {
  for (const [settings, code] of [
    [{ createError: true }, 'ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY'],
    [{ createdFields: { assignees: [] } }, 'ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY'],
    [{ verifiedFields: { assignees: [] } }, 'ISSUE_VERIFY_FAILED_DO_NOT_RETRY'],
    [{ verifiedFields: { pull_request: {} } }, 'ISSUE_VERIFY_FAILED_DO_NOT_RETRY'],
  ]) {
    const api = alertApi(settings);
    await assert.rejects(api.invoke(), alertCode(code));
    assert.equal(writes(api).length, 1);
  }
  const api = alertApi({ rows: [{ ...weatherFailureIssue(alertRun), number: 9,
    user: { login: 'github-actions[bot]' }, assignees: [] }] });
  await assert.rejects(api.invoke(), alertCode('EXISTING_ISSUE_NOT_ASSIGNED'));
  assert.equal(writes(api).length, 0);
});

test('Owner alarm workflow uses default-branch code without production writes or website messages', async () => {
  const alarm = await fs.readFile('.github/workflows/notify-weather-failure.yml', 'utf8');
  assert.match(alarm, /workflows: \[Run current RavRadar weather once\]/);
  assert.match(alarm, /types: \[completed\]/);
  assert.match(alarm, /contents: read\s+actions: read\s+issues: write/);
  assert.match(alarm, /group: ravradar-weather-failure-owner-alert\s+queue: max\s+cancel-in-progress: false/);
  assert.match(alarm, /ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(alarm, /workflow_run\.head_sha|secrets\.|upload-artifact|download-artifact|weather-production|update-dmi|supabase|deploy-pages|send-mail|smtp/i);
  assert.equal((alarm.match(/run: node scripts\/notify-weather-failure\.mjs/g) || []).length, 1);
});
