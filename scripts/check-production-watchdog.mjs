#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIVE_RUN_STATUSES = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const finiteTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function assessProductionWatchdog({ runs, manifest, nowMs = Date.now(), maximumSilenceMinutes = 45 }) {
  if (!Number.isFinite(nowMs) || maximumSilenceMinutes < 15 || maximumSilenceMinutes > 180) {
    throw new Error('Production watchdog received an invalid bounded time policy');
  }
  const workflowRuns = Array.isArray(runs?.workflow_runs) ? runs.workflow_runs : null;
  if (!workflowRuns) throw new Error('Production watchdog could not validate the workflow-run list');
  const active = workflowRuns.find(run => ACTIVE_RUN_STATUSES.has(String(run?.status || '')));
  if (active) return { dispatch: false, reason: 'production-run-active' };
  const newestRunMs = workflowRuns
    .map(run => Date.parse(run?.created_at || ''))
    .filter(Number.isFinite)
    .sort((left, right) => right - left)[0] ?? Number.NEGATIVE_INFINITY;
  const manifestMs = Date.parse(manifest?.generatedAt || '');
  if (!Number.isFinite(manifestMs)) throw new Error('Production watchdog could not validate the public manifest time');
  const silenceMs = maximumSilenceMinutes * 60_000;
  if (nowMs - newestRunMs <= silenceMs) return { dispatch: false, reason: 'recent-production-run' };
  if (nowMs - manifestMs <= silenceMs) return { dispatch: false, reason: 'public-production-fresh' };
  return {
    dispatch: true,
    reason: 'production-silent-and-public-manifest-stale',
    runSilenceMinutes: Number.isFinite(newestRunMs) ? Math.floor((nowMs - newestRunMs) / 60_000) : null,
    manifestAgeMinutes: Math.floor((nowMs - manifestMs) / 60_000),
  };
}

function parseArgs(argv) {
  const result = { maximumSilenceMinutes: 45 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--runs') result.runsPath = argv[++index];
    else if (value === '--manifest-url') result.manifestUrl = argv[++index];
    else if (value === '--github-output') result.githubOutput = argv[++index];
    else if (value === '--maximum-silence-minutes') result.maximumSilenceMinutes = Number(argv[++index]);
    else throw new Error(`Ukendt argument: ${value}`);
  }
  if (!result.runsPath || !result.manifestUrl) throw new Error('--runs og --manifest-url er påkrævet');
  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [runs, response] = await Promise.all([
    fs.readFile(options.runsPath, 'utf8').then(JSON.parse),
    fetch(options.manifestUrl, { headers: { accept: 'application/json' } }),
  ]);
  if (!response.ok) throw new Error(`Public manifest returned HTTP ${response.status}`);
  const result = assessProductionWatchdog({
    runs,
    manifest: await response.json(),
    maximumSilenceMinutes: options.maximumSilenceMinutes,
  });
  if (options.githubOutput) {
    await fs.appendFile(options.githubOutput, `dispatch=${result.dispatch ? 'true' : 'false'}\nreason=${result.reason}\n`);
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
