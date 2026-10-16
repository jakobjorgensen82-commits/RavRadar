#!/usr/bin/env node
// One-off epoch scheduling reserve, not a performance or publication proof.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { classifyProductionTargetFreshness } from './check-production-target-freshness.mjs';

export const WEATHER_STATE_EPOCH_JOB_MINUTES = 360;
export const WEATHER_STATE_EPOCH_RESERVE_MINUTES = 180;
export const WEATHER_STATE_EPOCH_PHASE_MINUTES = Object.freeze({ dmi: 320, copernicus: 250, 'open-meteo': 195, weather: 180 });

export function assertWeatherStateEpochCheckpointRequest(environment = process.env) {
  assert.equal(environment.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP, 'true');
  assert.equal(environment.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY, 'true');
  assert.equal(environment.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(environment.GITHUB_REF, 'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT, '1');
  assert.equal(environment.QUICK_CONFIRMATION, 'false');
  assert.equal(environment.CHECKPOINT_ONLY, 'true');
  assert.notEqual(environment.NATIVE_IDENTITY_RECOVERY, 'true');
  assert.notEqual(environment.RAVRADAR_NATIVE_IDENTITY_RECOVERY_OPT_IN, 'true');
  assert(/^[1-9][0-9]*-[1-9][0-9]*$/.test(environment.QUICK_PROGRESS_SOURCE ?? ''));
  const requested = environment.CHECKPOINT_TARGET_HOUR;
  assert(typeof requested === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(requested));
  assert.equal(new Date(requested).toISOString().replace('.000Z', 'Z'), requested);
  assert.equal(environment.RAVRADAR_PRODUCTION_TARGET_HOUR?.replace('.000Z', 'Z'), requested);
  for (const name of ['RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_ID', 'RAVRADAR_WEATHER_STATE_EPOCH_ARCHIVE_CATALOG_SHA256'])
    assert(/^[a-f0-9]{64}$/.test(environment[name] ?? ''));
  assert(/^dmi-grib-v4-Linux-\d{4}-W(?:0[1-9]|[1-4][0-9]|5[0-3])-[1-9][0-9]*-[1-9][0-9]*$/.test(environment.RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY ?? ''));
  assert(environment.RAVRADAR_WEATHER_STATE_EPOCH_RAW_CACHE_KEY.endsWith('-' + environment.QUICK_PROGRESS_SOURCE));
  if (environment.EXTENDED_BOOTSTRAP !== undefined) assert.equal(environment.EXTENDED_BOOTSTRAP, 'false');
  if (environment.PRODUCE_HANDOFF !== undefined) assert.equal(environment.PRODUCE_HANDOFF, 'false');
}

export function assertWeatherStateEpochInterface(environment = process.env) {
  if (environment.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY === 'true') {
    assertWeatherStateEpochCheckpointRequest(environment);
    return;
  }
  assert.equal(environment.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP, 'true');
  assert.equal(environment.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.equal(environment.GITHUB_REF, 'refs/heads/main');
  assert.equal(environment.GITHUB_RUN_ATTEMPT, '1');
  for (const name of ['QUICK_CONFIRMATION', 'CHECKPOINT_ONLY', 'NATIVE_IDENTITY_RECOVERY'])
    assert.equal(environment[name], 'false', 'WEATHER_STATE_EPOCH_EXCLUSIVE_MODE_REQUIRED');
  for (const name of ['QUICK_PROGRESS_SOURCE', 'CHECKPOINT_TARGET_HOUR'])
    assert.equal(environment[name] ?? '', '', 'WEATHER_STATE_EPOCH_EXCLUSIVE_MODE_REQUIRED');
  if (environment.EXTENDED_BOOTSTRAP !== undefined) assert.equal(environment.EXTENDED_BOOTSTRAP, 'true');
  if (environment.PRODUCE_HANDOFF !== undefined) assert.equal(environment.PRODUCE_HANDOFF, 'false');
}

export function assertWeatherStateEpochRequest(environment = process.env, now = Date.now()) {
  assert.notEqual(environment.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY, 'true');
  assertWeatherStateEpochInterface(environment);
  assert.equal(classifyProductionTargetFreshness({ target: environment.RAVRADAR_PRODUCTION_TARGET_HOUR,
    maximumAgeMinutes: 90, maximumFutureMinutes: 0, now: new Date(now).toISOString() }).status,
  'FRESH', 'WEATHER_STATE_EPOCH_FRESH_TARGET_REQUIRED');
}

export function checkWeatherStateEpochBudget({ phase, startedAtMs, now = Date.now() }) {
  assert(Object.hasOwn(WEATHER_STATE_EPOCH_PHASE_MINUTES, phase), 'WEATHER_STATE_EPOCH_PHASE_INVALID');
  assert(Number.isSafeInteger(startedAtMs) && startedAtMs > 0 && Number.isSafeInteger(now)
    && now >= startedAtMs, 'WEATHER_STATE_EPOCH_CLOCK_INVALID');
  const remainingMs = WEATHER_STATE_EPOCH_JOB_MINUTES * 60000 - (now - startedAtMs);
  assert(remainingMs >= WEATHER_STATE_EPOCH_PHASE_MINUTES[phase] * 60000,
    'WEATHER_STATE_EPOCH_POSTPROCESSING_RESERVE_EXHAUSTED');
  return Object.freeze({ phase, remainingMinutes: Math.floor(remainingMs / 60000),
    requiredMinutes: WEATHER_STATE_EPOCH_PHASE_MINUTES[phase], reserveMinutes: WEATHER_STATE_EPOCH_RESERVE_MINUTES,
    admission: 'NO_ADMISSION', performanceProof: false });
}

export async function weatherStateEpochBudgetCli(argv = process.argv.slice(2), environment = process.env) {
  assert(argv.length === 1 && (['request', 'build-request', 'checkpoint-request'].includes(argv[0]) || Object.hasOwn(WEATHER_STATE_EPOCH_PHASE_MINUTES, argv[0])),
    'WEATHER_STATE_EPOCH_BUDGET_INVOCATION');
  assert.equal(environment.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP, 'true');
  if (argv[0] === 'checkpoint-request') {
    assertWeatherStateEpochCheckpointRequest(environment);
    return { request: 'AUTHENTICATED_EPOCH_CHECKPOINT_REQUIRED', admission: 'NO_ADMISSION' };
  }
  if (argv[0] === 'request') {
    assertWeatherStateEpochRequest(environment);
    return { request: 'FRESH_EXCLUSIVE_EPOCH', admission: 'NO_ADMISSION' };
  }
  if (argv[0] === 'build-request') {
    // Archive/SQL time does not redate or invalidate the original fresh request.
    // Install authenticates the same locked archive target; ordinary late gates remain.
    assertWeatherStateEpochInterface(environment);
    return { request: 'SAME_EXCLUSIVE_EPOCH', admission: 'NO_ADMISSION' };
  }
  const parent = await fs.realpath(environment.RUNNER_TEMP);
  const file = path.join(parent, 'weather-state-epoch-job-start-ms.txt');
  const before = await fs.lstat(file);
  assert(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size === 14,
    'WEATHER_STATE_EPOCH_CLOCK_FILE_INVALID');
  const bytes = await fs.readFile(file, 'utf8');
  const after = await fs.lstat(file);
  for (const key of ['dev', 'ino', 'size', 'mtimeMs', 'ctimeMs']) assert.equal(after[key], before[key]);
  assert(/^[1-9][0-9]{12}\n$/.test(bytes), 'WEATHER_STATE_EPOCH_CLOCK_FILE_INVALID');
  if (environment.RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY === 'true') {
    assertWeatherStateEpochCheckpointRequest(environment);
    // No provider acquisition is permitted here. Preserve the full measured
    // 180-minute processing/SAVE/deploy reserve before every cache-only leg,
    // instead of demanding an obsolete fresh-provider320/250/195-minute slot.
    const reserve = checkWeatherStateEpochBudget({ phase: 'weather', startedAtMs: Number(bytes.trim()) });
    return { ...reserve, phase: argv[0], checkpointOnly: true };
  }
  return checkWeatherStateEpochBudget({ phase: argv[0], startedAtMs: Number(bytes.trim()) });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log(JSON.stringify(await weatherStateEpochBudgetCli())); }
  catch { console.error('WEATHER_STATE_EPOCH_BUDGET_REFUSED'); process.exitCode = 1; }
}
