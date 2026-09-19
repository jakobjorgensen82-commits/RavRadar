import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { assessProductionWatchdog, productionWatchdogSummary } from './check-production-watchdog.mjs';

const nowMs = Date.parse('2026-08-27T12:45:00.000Z');
const manifest = { generatedAt: '2026-08-27T11:30:00.000Z' };
const run = (status, createdAt, headBranch = 'main') => ({
  status,
  created_at: createdAt,
  head_branch: headBranch,
});

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
assert.throws(() => assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T11:00:00.000Z')] },
  manifest: {},
  nowMs,
}), /manifest time/);

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
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [
    run('in_progress', '2026-08-27T12:44:00.000Z', 'feature/test'),
    run('completed', '2026-08-27T11:00:00.000Z'),
  ] },
  manifest,
  nowMs,
  ...externalPolicy,
}).dispatch, true, 'Et aktivt non-main-run må ikke skjule reel main-stilhed');
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [
    run('completed', '2026-08-27T12:44:00.000Z', 'feature/test'),
    run('completed', '2026-08-27T12:35:00.000Z'),
  ] },
  manifest,
  nowMs,
  ...externalPolicy,
}).reason, 'recent-production-run', 'Nyere non-main-runs må ikke skjule et nyligt main-run');
assert.equal(assessProductionWatchdog({
  runs: { workflow_runs: [
    run('completed', '2026-08-27T12:44:00.000Z', 'feature/test'),
    run('pending', '2026-08-27T11:00:00.000Z'),
  ] },
  manifest,
  nowMs,
  ...externalPolicy,
}).reason, 'production-run-active', 'Et pending main-run skal overleve en ufiltreret runliste');
assert.throws(() => assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', '2026-08-27T12:44:00.000Z', 'feature/test')] },
  manifest,
  nowMs,
  ...externalPolicy,
}), /main workflow-run history/);
assert.throws(() => assessProductionWatchdog({
  runs: { workflow_runs: [run('completed', 'not-a-time')] },
  manifest,
  nowMs,
  ...externalPolicy,
}), /malformed main workflow-run history/);
assert.throws(() => assessProductionWatchdog({
  runs: { workflow_runs: [] }, manifest, nowMs, maximumSilenceMinutes: 14,
}), /invalid bounded time policy/);

const scheduledFailure = (createdAt, conclusion = 'failure') => ({
  ...run('completed', createdAt), event: 'schedule', conclusion,
  display_title: 'PRIVATE-UNTRUSTED-TITLE', arbitraryPayload: 'SECRET-DO-NOT-COPY',
});
const failureRuns = [scheduledFailure('2026-08-27T12:35:00.000Z'), scheduledFailure('2026-08-27T12:15:00.000Z', 'timed_out')];
const oldWeatherNewFile = { generatedAt: '2026-08-27T12:40:00.000Z', productionReferenceAt: '2026-08-27T08:00:00.000Z',
  privatePayload: 'SECRET-DO-NOT-COPY' };
const delayed = assessProductionWatchdog({ runs: { workflow_runs: failureRuns }, manifest: oldWeatherNewFile, nowMs });
assert.equal(delayed.dispatch, false, 'Repeated failures must not introduce a dispatch loop');
assert.equal(delayed.reason, 'recent-production-run', 'The bounded scheduler decision is unchanged');
assert.equal(delayed.advisory.code, 'PUBLIC_WEATHER_STALE_AFTER_REPEATED_FAILURES');
assert.equal(delayed.advisory.referenceKind, 'productionReferenceAt', 'A freshly written code-only file does not refresh its weather');
assert.equal(delayed.advisory.publicAgeMinutes, 285);
assert.equal(delayed.advisory.recentFailedScheduledRuns, 2);
assert.equal(delayed.advisory.nextAction, 'INSPECT_FAILED_PRODUCTION_SUMMARY');
assert.equal(delayed.advisory.notificationSent, false, 'Without durable dedup this observer sends no alarm');
const summary = productionWatchdogSummary(delayed);
assert.match(summary, /dansk tid/);
assert.match(summary, /seneste fejlede kørsel/);
assert.match(summary, /ingen notifikation/);
assert.doesNotMatch(JSON.stringify(delayed) + summary, /SECRET|PRIVATE-UNTRUSTED|arbitraryPayload|::warning|::error/);

const recovering = assessProductionWatchdog({ runs: { workflow_runs: [...failureRuns,
  run('in_progress', '2026-08-27T12:44:00.000Z')] }, manifest: oldWeatherNewFile, nowMs });
assert.equal(recovering.dispatch, false);
assert.equal(recovering.reason, 'production-run-active');
assert.equal(recovering.advisory.code, 'PUBLIC_WEATHER_STALE_AFTER_REPEATED_FAILURES', 'An active retry must not conceal the stale evidence');
assert.equal(recovering.advisory.nextAction, 'WAIT_FOR_ACTIVE_RUN_THEN_INSPECT_FAILED_PRODUCTION');
assert.match(productionWatchdogSummary(recovering), /Lad den afslutte/);

const fresh = assessProductionWatchdog({ runs: { workflow_runs: failureRuns },
  manifest: { generatedAt: '2026-08-27T12:44:00.000Z', productionReferenceAt: '2026-08-27T12:30:00.000Z' }, nowMs });
assert.equal(fresh.advisory.code, 'NO_PUBLIC_STALENESS_SIGNAL', 'New valid weather clears the stale observation without retained alert state');
assert.equal(fresh.advisory.recentFailedScheduledRuns, 1, 'Failures before the new weather reference are not new failed progress');

for (const nonRepeatedRuns of [[failureRuns[0]], failureRuns.map(item => ({ ...item, event: 'workflow_dispatch' })),
  failureRuns.map(item => ({ ...item, conclusion: 'cancelled' })),
  failureRuns.map(item => ({ ...item, created_at: '2026-08-27T10:00:00.000Z' })),
  [failureRuns[0], { ...failureRuns[1], head_branch: 'feature/test' }]]) {
  assert.equal(assessProductionWatchdog({ runs: { workflow_runs: nonRepeatedRuns },
    manifest: oldWeatherNewFile, nowMs }).advisory.code, 'PUBLIC_WEATHER_STALE',
  'A lone/old/cancelled/non-main/private manual failure is not repeated scheduled failure evidence');
}
const noVerifiedTime = assessProductionWatchdog({ runs: { workflow_runs: [run('in_progress', '2026-08-27T12:44:00.000Z')] },
  manifest: { generatedAt: '2026-08-27T12:40:00.000Z', productionReferenceAt: 'not-a-time' }, nowMs });
assert.equal(noVerifiedTime.dispatch, false);
assert.equal(noVerifiedTime.advisory.code, 'PUBLIC_WEATHER_TIME_UNVERIFIED');
assert.match(productionWatchdogSummary(noVerifiedTime), /ikke bevis for/);
assert.equal(stale.advisory.referenceKind, 'generatedAt', 'Historical manifest format remains observable without inventing a weather time');

const workflow = await fs.readFile('.github/workflows/preserve-copernicus-current-shadow.yml', 'utf8');
assert.equal((workflow.match(/--summary "\$GITHUB_STEP_SUMMARY"/g) ?? []).length, 1, 'One report per observation, not another on dispatch recheck');
assert.match(workflow, /--report "\$RUNNER_TEMP\/ravradar-production-watchdog-report.json"/);
assert.match(workflow, /steps\.watchdog\.outputs\.dispatch == 'true' && steps\.watchdog-recheck\.outputs\.dispatch == 'true'/);
assert.doesNotMatch(workflow, /issues: write|::warning|advisory.*dispatch|curl.*notification/);
console.log('Production watchdog: unchanged bounded dispatch and privacy-safe stale-weather advisory passed.');
