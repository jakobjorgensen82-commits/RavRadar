import assert from 'node:assert/strict';
import test from 'node:test';
import { assertWeatherStateEpochRequest, checkWeatherStateEpochBudget, weatherStateEpochBudgetCli,
  WEATHER_STATE_EPOCH_PHASE_MINUTES } from './weather-state-epoch-budget.mjs';

const now = Date.parse('2026-10-16T12:30:00Z');
const environment = { RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true', GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main', GITHUB_RUN_ATTEMPT: '1', QUICK_CONFIRMATION: 'false', CHECKPOINT_ONLY: 'false',
  NATIVE_IDENTITY_RECOVERY: 'false', QUICK_PROGRESS_SOURCE: '', CHECKPOINT_TARGET_HOUR: '',
  RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-10-16T12:00:00Z', EXTENDED_BOOTSTRAP: 'true', PRODUCE_HANDOFF: 'false' };

test('one-off epoch requires a fresh manual target and excludes all continuation modes', () => {
  assert.doesNotThrow(() => assertWeatherStateEpochRequest(environment, now));
  for (const [key, value] of Object.entries({ RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false',
    GITHUB_EVENT_NAME: 'schedule', GITHUB_REF: 'refs/heads/feature', GITHUB_RUN_ATTEMPT: '2',
    QUICK_CONFIRMATION: 'true', CHECKPOINT_ONLY: 'true', NATIVE_IDENTITY_RECOVERY: 'true',
    QUICK_PROGRESS_SOURCE: '1-1', CHECKPOINT_TARGET_HOUR: '2026-10-16T12:00:00Z',
    EXTENDED_BOOTSTRAP: 'false', PRODUCE_HANDOFF: 'true', RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-10-16T10:00:00Z' }))
    assert.throws(() => assertWeatherStateEpochRequest({ ...environment, [key]: value }, now));
  assert.throws(() => assertWeatherStateEpochRequest({ ...environment,
    RAVRADAR_PRODUCTION_TARGET_HOUR: '2026-10-16T13:00:00Z' }, now));
});

test('fixed phase fences retain the full 180-minute reserve and never raise a cap', () => {
  assert.deepEqual(WEATHER_STATE_EPOCH_PHASE_MINUTES, { dmi: 320, copernicus: 250, 'open-meteo': 195, weather: 180 });
  for (const [phase, required] of Object.entries(WEATHER_STATE_EPOCH_PHASE_MINUTES)) {
    const startedAtMs = now - (360 - required) * 60000;
    const result = checkWeatherStateEpochBudget({ phase, startedAtMs, now });
    assert.equal(result.remainingMinutes, required); assert.equal(result.reserveMinutes, 180);
    assert.equal(result.performanceProof, false); assert.equal(result.admission, 'NO_ADMISSION');
    assert.throws(() => checkWeatherStateEpochBudget({ phase, startedAtMs, now: now + 1 }), /RESERVE_EXHAUSTED/);
  }
  assert.throws(() => checkWeatherStateEpochBudget({ phase: 'other', startedAtMs: now, now }), /PHASE_INVALID/);
  assert.throws(() => checkWeatherStateEpochBudget({ phase: 'dmi', startedAtMs: now + 1, now }), /CLOCK_INVALID/);
});

test('unknown CLI options and default-off use refuse before filesystem access', async () => {
  await assert.rejects(weatherStateEpochBudgetCli(['weather', '--more-time'], {}), /INVOCATION/);
  await assert.rejects(weatherStateEpochBudgetCli(['dmi'], {}));
  assert.deepEqual(await weatherStateEpochBudgetCli(['build-request'], environment),
    { request: 'SAME_EXCLUSIVE_EPOCH', admission: 'NO_ADMISSION' });
  await assert.rejects(weatherStateEpochBudgetCli(['build-request'], { ...environment, QUICK_CONFIRMATION: 'true' }));
});
