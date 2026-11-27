import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {inspectRecentBackupConfirmation} from './monitor-database-backup-confirmation.mjs';

const now = Date.parse('2026-11-27T06:37:00Z');
const past = hours => new Date(now - hours * 3_600_000).toISOString();
const head = 'd1d83b64b057d8540bbefe8b3142974c880f08ff';
const run = {
  id: 45932339037, run_attempt: 1, path: '.github/workflows/maintain-admin-document-history.yml',
  head_branch: 'main', head_sha: head, event: 'workflow_dispatch',
  repository: {id: 1306858343}, head_repository: {id: 1306858343},
  actor: {login: 'github-actions[bot]'}, status: 'completed', conclusion: 'success',
  created_at: past(50), updated_at: past(2),
};
const passed = (number, name, completed_at = past(49)) => ({
  number, name, completed_at, status: 'completed', conclusion: 'success',
});
const job = {
  name: 'Maintain one due private database backup after document history',
  run_id: run.id, run_attempt: 1, head_sha: head, status: 'completed', conclusion: 'success',
  completed_at: past(2),
  steps: [
    passed(5, 'Require the already qualified exact source before backup access'),
    passed(6, 'Reject missing backup source proof before private access'),
    passed(7, 'Plan one due database action in the original weather window'),
    passed(11, 'Database backup plan - current archive not due', past(48)),
  ],
};
function check({runs = [run], jobs = [job], runLimit = runs.length, fetchJobs} = {}) {
  return inspectRecentBackupConfirmation({now, fetchMetadata: async route => {
    if (route.includes('/workflows/')) {
      const endpoint = new URL(route, 'https://api.github.com');
      assert.match(endpoint.pathname, /\/workflows\/maintain-admin-document-history\.yml\/runs$/);
      assert.equal(endpoint.searchParams.get('branch'), 'main');
      assert.equal(endpoint.searchParams.get('created'), '>=' + past(52));
      return {total_count: runLimit, workflow_runs: runs};
    }
    assert.match(route, /\/runs\/45932339037\/attempts\/1\/jobs\?per_page=100$/);
    return fetchJobs ? fetchJobs() : {total_count: jobs.length, jobs};
  }});
}

test('a positive backup confirmation less than or exactly 48 hours old counts', async () => {
  assert.deepEqual(await check(), {status: 'BACKUP_CONFIRMATION_OBSERVED', runId: run.id, confirmedAt: past(48)});
});
test('an older confirmation, a closed window and a new capture awaiting restore are unconfirmed', async () => {
  const cases = [
    [{...job.steps[3], completed_at: past(48 + 1 / 60)}],
    [passed(10, 'Confirm backup stopped before private access')],
    [passed(9, 'Capture private Supabase database')],
    [passed(9, 'Restore and seal current private Supabase archive')],
    [passed(11, 'Database backup plan - rotation held')],
  ];
  for (const tail of cases) {
    assert.deepEqual(await check({jobs: [{...job, steps: [...job.steps.slice(0, 3), ...tail]}]}),
      {status: 'BACKUP_CONFIRMATION_UNOBSERVED', windowHours: 48});
  }
});
test('a rerun or owner-dispatched maintenance does not supply the normal marker', async () => {
  const expected = {status: 'BACKUP_CONFIRMATION_UNOBSERVED', windowHours: 48};
  assert.deepEqual(await check({runs: [{...run, run_attempt: 2}]}), expected);
  assert.deepEqual(await check({runs: [{...run, actor: {login: 'owner'}}]}), expected);
});
test('incomplete inventory, a mismatched attempt and missing admission are distinguishable from unconfirmed', async () => {
  await assert.rejects(check({runLimit: 2}), /INVENTORY_INCOMPLETE/);
  await assert.rejects(check({fetchJobs: () => { throw new Error('GITHUB_UNAVAILABLE'); }}), /GITHUB_UNAVAILABLE/);
  await assert.rejects(check({jobs: [{...job, run_id: 42}]}), /JOB_IDENTITY/);
  await assert.rejects(check({jobs: [{...job, steps: job.steps.slice(1)}]}), /PROOF_IDENTITY/);
  const futureProof = {...job.steps[3], completed_at: past(-1)};
  await assert.rejects(check({jobs: [{...job, steps: [...job.steps.slice(0, 3), futureProof]}]}),
    /PROOF_IDENTITY/);
});
test('the daily caller has read-only GitHub metadata access outside the weather and D1 jobs', () => {
  const text = fs.readFileSync(new URL('../.github/workflows/monitor-trip-storage.yml', import.meta.url), 'utf8');
  const observer = text.split(/^  monitor-database-backup-confirmation:\r?$/m).at(1);
  assert.ok(observer);
  assert.match(observer, /github\.event_name == 'schedule'/);
  assert.match(observer, /github\.ref == 'refs\/heads\/main'/);
  assert.match(observer, /permissions:\s+contents: read\s+actions: read/);
  assert.match(observer, /run: node scripts\/monitor-database-backup-confirmation\.mjs/);
  assert.doesNotMatch(observer, /secrets\.|: write|concurrency:|needs:|actions\/cache/);
});
