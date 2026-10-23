import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

const coldEnvironment = { ...environment, RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'false',
  RAVRADAR_CURRENT_FAMILY_COLD_START: 'true', RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'false',
  COMPLETED_PRIVATE_RUNTIME: 'false', EXTENDED_PROVIDER_BOOTSTRAP: 'true' };

test('current-family cold start uses the same actual clock and full post-processing reserve', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cold-budget-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), path.resolve(os.tmpdir()));
    assert(path.basename(directory).startsWith('rr-cold-budget-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const clock = path.join(directory, 'weather-state-epoch-job-start-ms.txt');
  await fs.writeFile(clock, String(Date.now() - 10 * 60000) + '\n', { flag: 'wx', mode: 0o600 });
  const env = { ...coldEnvironment, RUNNER_TEMP: directory };
  for (const phase of Object.keys(WEATHER_STATE_EPOCH_PHASE_MINUTES)) {
    const result = await weatherStateEpochBudgetCli([phase], env);
    assert.equal(result.phase, phase);
    assert.equal(result.requiredMinutes, WEATHER_STATE_EPOCH_PHASE_MINUTES[phase]);
    assert.equal(result.reserveMinutes, 180);
    assert.equal(result.admission, 'NO_ADMISSION');
    assert.equal(result.performanceProof, false);
  }
  await fs.writeFile(clock, String(Date.now() - 181 * 60000) + '\n');
  await assert.rejects(weatherStateEpochBudgetCli(['weather'], env), /RESERVE_EXHAUSTED/);
});

test('cold phase budget cannot become an epoch request or accept a mixed or ordinary mode', async () => {
  for (const phase of ['request', 'build-request', 'checkpoint-request'])
    await assert.rejects(weatherStateEpochBudgetCli([phase], coldEnvironment), /COLD_PHASE_SCOPE/);
  for (const [key, value] of Object.entries({ RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP: 'true',
    RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY: 'true', COMPLETED_PRIVATE_RUNTIME: 'true',
    QUICK_CONFIRMATION: 'true', CHECKPOINT_ONLY: 'true', NATIVE_IDENTITY_RECOVERY: 'true',
    QUICK_PROGRESS_SOURCE: '1-1', CHECKPOINT_TARGET_HOUR: '2026-10-16T12:00:00Z',
    EXTENDED_PROVIDER_BOOTSTRAP: 'false', PRODUCE_HANDOFF: 'true', GITHUB_RUN_ATTEMPT: '2',
    GITHUB_REF: 'refs/heads/feature', GITHUB_EVENT_NAME: 'schedule' }))
    await assert.rejects(weatherStateEpochBudgetCli(['dmi'], { ...coldEnvironment, [key]: value }), /COLD_PHASE_SCOPE/);
  await assert.rejects(weatherStateEpochBudgetCli(['dmi'], {
    ...coldEnvironment, RAVRADAR_CURRENT_FAMILY_COLD_START: 'false' }));
});

test('actual workflow starts the cold clock before checkout and gates every provider plus calculation', async () => {
  const workflow = await fs.readFile(new URL('../.github/workflows/reusable-weather-build.yml', import.meta.url), 'utf8');
  const body = name => {
    const marker = '      - name: ' + name + '\n', offset = workflow.indexOf(marker);
    assert(offset >= 0);
    const end = workflow.indexOf('\n      - ', offset + marker.length);
    return workflow.slice(offset, end < 0 ? workflow.length : end);
  };
  const selected = (name, inputs, shouldRun = 'true') => {
    const condition = /^        if: (.+)$/m.exec(body(name)); assert(condition);
    return Boolean(new Function('inputs', 'steps', 'return (' + condition[1] + ');')(
      inputs, { preflight: { outputs: { should_run: shouldRun } } }));
  };
  const clock = 'Record the actual epoch build start before checkout';
  assert(workflow.indexOf('date +%s%3N') < workflow.indexOf('uses: actions/checkout'));
  assert(body(clock).includes('set -o noclobber'));
  for (const inputs of [{ current_family_cold_start: true }, { weather_state_epoch_bootstrap: true }]) {
    assert.equal(selected(clock, inputs), true);
    for (const [phase, next] of [['dmi', 'Update DMI bulk model cache'],
      ['copernicus', 'Fill only exact-hour DMI gaps from Copernicus'],
      ['open-meteo', 'Fill only the exact remaining current gaps from Open-Meteo'],
      ['weather', 'Update central weather cache']]) {
      const gate = 'Preserve the fixed epoch post-processing reserve before ' + phase;
      assert.equal(selected(gate, inputs), true);
      assert.equal(selected(gate, inputs, 'false'), false);
      assert.equal(selected(gate, { ...inputs, completed_private_runtime: true }), false);
      assert.equal(selected(gate, {}), false);
      assert(workflow.indexOf('      - name: ' + gate) < workflow.indexOf('      - name: ' + next));
      assert(body(gate).includes('node scripts/weather-state-epoch-budget.mjs ' + phase));
      assert(!body(gate).includes('continue-on-error'));
    }
  }
  assert.equal(selected(clock, {}), false);
});
