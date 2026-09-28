#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FOUR_HOURS_MS = 4 * 60 * 60_000;
const SLOT_MINUTE_MS = 17 * 60_000;
const EARLIEST_DISPATCH_MS = 60_000;
const LATEST_DISPATCH_MS = 90 * 60_000;
const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const STATUSES = new Set([...ACTIVE, 'completed']);

function readMainRuns(document, branch, label, nowMs) {
  if (!Array.isArray(document?.workflow_runs)) {
    throw new Error(`${label}: workflow-run history is unavailable`);
  }
  return document.workflow_runs.filter(run => run?.head_branch === branch).map(run => {
    const createdMs = Date.parse(run.created_at);
    const updatedMs = Date.parse(run.updated_at);
    if (!STATUSES.has(run.status) || !Number.isFinite(createdMs) ||
        !Number.isFinite(updatedMs) || updatedMs < createdMs ||
        createdMs > nowMs + 5 * 60_000 || updatedMs > nowMs + 5 * 60_000 ||
        (run.status === 'completed' && !run.conclusion)) {
      throw new Error(`${label}: malformed main run history`);
    }
    return { status: run.status, conclusion: run.conclusion, createdMs, updatedMs };
  });
}

export function assessWeatherCadenceWatchdog({
  normalRuns,
  manualRuns,
  nowMs = Date.now(),
  branch = 'main',
}) {
  if (!Number.isFinite(nowMs) || branch !== 'main') {
    throw new Error('Invalid four-hour weather watchdog policy');
  }
  const normal = readMainRuns(normalRuns, branch, 'normal weather', nowMs);
  const manual = readMainRuns(manualRuns, branch, 'manual weather', nowMs);
  if (manual.length === 0) throw new Error('No verified current-weather run history on main');
  const slotMs = Math.floor((nowMs - SLOT_MINUTE_MS) / FOUR_HOURS_MS) * FOUR_HOURS_MS + SLOT_MINUTE_MS;
  const slotAt = new Date(slotMs).toISOString();
  const decision = (dispatch, reason) => ({ dispatch, reason, slotAt });
  if (nowMs < slotMs + EARLIEST_DISPATCH_MS) return decision(false, 'before-external-cadence-window');
  if (nowMs >= slotMs + LATEST_DISPATCH_MS) return decision(false, 'external-cadence-window-expired');
  const runs = [...normal, ...manual];
  if (runs.some(run => ACTIVE.has(run.status))) return decision(false, 'weather-run-active-or-queued');
  if (runs.some(run => run.createdMs >= slotMs)) return decision(false, 'weather-run-already-started-in-slot');
  return decision(true, 'external-four-hour-weather-slot-ready');
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--normal-runs') options.normalRunsPath = argv[++index];
    else if (flag === '--manual-runs') options.manualRunsPath = argv[++index];
    else if (flag === '--github-output') options.githubOutput = argv[++index];
    else if (flag === '--summary') options.summaryPath = argv[++index];
    else throw new Error(`Unknown watchdog argument: ${flag}`);
  }
  if (!options.normalRunsPath || !options.manualRunsPath) {
    throw new Error('Both normal and manual weather-run histories are required');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [normalRuns, manualRuns] = await Promise.all([
    fs.readFile(options.normalRunsPath, 'utf8').then(JSON.parse),
    fs.readFile(options.manualRunsPath, 'utf8').then(JSON.parse),
  ]);
  const result = assessWeatherCadenceWatchdog({ normalRuns, manualRuns });
  if (options.githubOutput) {
    await fs.appendFile(options.githubOutput, `dispatch=${result.dispatch}\nreason=${result.reason}\n`);
  }
  if (options.summaryPath) {
    await fs.appendFile(options.summaryPath,
      `## External four-hour weather cadence guard\n\nExpected slot: ${result.slotAt}. ` +
      `Decision: ${result.reason}. Dispatch: ${result.dispatch ? 'one normal current-weather run' : 'none'}.\n`);
  }
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
