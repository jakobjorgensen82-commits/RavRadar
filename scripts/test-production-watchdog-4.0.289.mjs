import assert from 'node:assert/strict';
import { assessProductionWatchdog } from './check-production-watchdog.mjs';

const nowMs = Date.parse('2026-08-27T12:45:00.000Z');
const manifest = { generatedAt: '2026-08-27T11:30:00.000Z' };
const run = (status, createdAt) => ({ status, created_at: createdAt });

assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('in_progress', '2026-08-27T11:00:00.000Z')] },
  manifest,
  nowMs,
}).reason, 'production-run-active');

assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T12:15:00.000Z')] },
  manifest,
  nowMs,
}).reason, 'recent-production-run');

assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T10:00:00.000Z')] },
  manifest: { generatedAt: '2026-08-27T12:20:00.000Z' },
  nowMs,
}).reason, 'public-production-fresh');

const stale = assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T11:00:00.000Z')] },
  manifest,
  nowMs,
});
assert.equal(stale.dispatch, true);
assert.equal(stale.reason, 'production-silent-and-public-manifest-stale');

assert.throws(() => assessProductionWatchdog({ runs: {}, manifest, nowMs }), /workflow-run list/);
assert.throws(() => assessProductionWatchdog({ runs: { workflow_runs: [] }, manifest: {}, nowMs }), /manifest time/);

console.log('Production silence watchdog: OK');
