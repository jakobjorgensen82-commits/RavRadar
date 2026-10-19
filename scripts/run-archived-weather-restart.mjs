#!/usr/bin/env node
// Fixed entrypoints in the existing serialized code-only workflow. No SQL
// executor, provider acquisition, caller source/model override or PASS import.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { assertLastMileEnclosurePlanCaller } from './verify-last-mile-enclosure-plan.mjs';
import { verifyLastMileEnclosurePrewriteReadiness, verifyLastMileEnclosureInstalledReadiness }
  from './last-mile-enclosure-prewrite-readiness.mjs';
import { prepareArchivedWeatherRestart, loadArchivedWeatherRestartArchiveForTarget,
  ARCHIVED_WEATHER_RESTART_CONTEXT_ENV } from './archived-weather-restart.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function main() {
  assertLastMileEnclosurePlanCaller(process.env); // UNISSUED before args, files or secrets.
  assert.equal(process.env.RAVRADAR_WEATHER_CACHE_ONLY, 'true');
  assert.equal(process.argv.length, 3);
  const command = process.argv[2];
  assert(['prepare', 'prewrite', 'installed'].includes(command));
  const git = args => execFileSync('git', ['-C', ROOT, ...args], {
    encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true,
  }).trim();
  assert.equal(git(['rev-parse', 'HEAD^{commit}']), process.env.GITHUB_SHA);
  assert.equal(git(['rev-parse', 'origin/main^{commit}']), process.env.GITHUB_SHA);
  const targetReferenceAt = process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;
  if (command === 'prepare') {
    const result = await prepareArchivedWeatherRestart({
      workRoot: process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_WORK,
      publicRoot: process.env.RAVRADAR_CODE_ONLY_PUBLIC_SNAPSHOT, targetReferenceAt,
    });
    assert(path.isAbsolute(process.env.GITHUB_ENV ?? ''));
    await fs.appendFile(process.env.GITHUB_ENV,
      ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.path + '=' + result.contextPath + '\n'
      + ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.sha256 + '=' + result.contextSha256 + '\n');
    console.log('Separate original archive saved and read back; normal weather inputs installed; no old score history admitted.');
    return;
  }
  const directory = process.env.RAVRADAR_LAST_MILE_ENCLOSURE_MIGRATIONS_DIR;
  assert(path.isAbsolute(directory ?? ''));
  const temporary = process.env.RUNNER_TEMP;
  assert(path.isAbsolute(temporary ?? ''));
  const installed = command === 'installed';
  const migrationListText = await fs.readFile(path.join(temporary,
    installed ? 'code-only-migrations-applied.txt' : 'code-only-last-mile-final-plan.txt'), 'utf8');
  const dryRunText = await fs.readFile(path.join(temporary,
    installed ? 'code-only-last-mile-installed-dry-run.txt' : 'code-only-last-mile-final-dry-run.txt'), 'utf8');
  const shared = { migrationListText, dryRunText, migrationsDirectory: directory, environment: process.env,
    url: process.env.SUPABASE_URL, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN };
  if (installed) {
    await verifyLastMileEnclosureInstalledReadiness(shared);
    console.log('Installed last-mile source, checkpoint/trip contracts and unchanged schema2 read back.');
  } else {
    const archiveCapability = await loadArchivedWeatherRestartArchiveForTarget({
      contextPath: process.env[ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.path],
      contextSha256: process.env[ARCHIVED_WEATHER_RESTART_CONTEXT_ENV.sha256], targetReferenceAt,
    });
    const centralContract = JSON.parse(await fs.readFile(path.join(ROOT, 'data/live/coastal-parts-v2.json'), 'utf8'));
    await verifyLastMileEnclosurePrewriteReadiness({ ...shared, archiveCapability, centralContract, targetReferenceAt });
    console.log('Actual unchanged originals and live installed predecessor read back immediately before sole SQL application.');
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
