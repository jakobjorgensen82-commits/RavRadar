import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assessWeatherCadenceWatchdog } from './check-weather-cadence-watchdog.mjs';

const at = value => Date.parse(value);
const run = (created, updated = created, status = 'completed', branch = 'main', conclusion = 'success') => ({
  head_branch: branch,
  status,
  conclusion: status === 'completed' ? conclusion : null,
  created_at: created,
  updated_at: updated,
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
