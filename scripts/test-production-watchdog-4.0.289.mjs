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

const externalPolicy = { maximumSilenceMinutes: 15 };
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T12:35:00.000Z')] },
  manifest,
  nowMs,
  ...externalPolicy,
}).reason, 'recent-production-run');
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T11:00:00.000Z')] },
  manifest: { generatedAt: '2026-08-27T12:35:00.000Z' },
  nowMs,
  ...externalPolicy,
}).reason, 'public-production-fresh');
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T12:30:00.000Z')] },
  manifest: { generatedAt: '2026-08-27T12:30:00.000Z' },
  nowMs,
  ...externalPolicy,
}).dispatch, false, 'Præcis 15 minutter må ikke skabe en grænsedublet');
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T12:29:59.000Z')] },
  manifest: { generatedAt: '2026-08-27T12:29:59.000Z' },
  nowMs,
  ...externalPolicy,
}).dispatch, true, 'Ekstern stilhed over 15 minutter skal kunne erstattes');
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [run('queued', '2026-08-27T11:00:00.000Z')] },
  manifest,
  nowMs,
  ...externalPolicy,
}).reason, 'production-run-active', 'Aktiv produktion skal blokere ved den korte eksterne grænse');
assert.throws(() => assessProductionWatchdog({
  runs: { workflow_runs: [] }, manifest, nowMs, maximumSilenceMinutes: 14,
}), /invalid bounded time policy/);

console.log('Production silence watchdog: OK');
