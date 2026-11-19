#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readWeatherCadenceGithub } from './read-weather-cadence-github.mjs';

const FOUR_HOURS_MS = 4 * 60 * 60_000;
const SLOT_MINUTE_MS = 17 * 60_000;
const EARLIEST_DISPATCH_MS = 60_000;
const LATEST_DISPATCH_MS = 90 * 60_000;
const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'requested', 'pending']);
const STATUSES = new Set([...ACTIVE, 'completed']);
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const RECOVERY_PREFIX = 'Finish an interrupted generation before new work / ';
const HANDOFF_JOB = 'Hand off recovered weather to the existing cadence watchdog';
const HANDOFF_STEP = 'Bind weather recovery recipient ';
const RUN_ID = /^[1-9][0-9]{0,14}$/;
// GitHub still reports these three old, inert legacy-orchestrator attempts as
// queued. Ignore only their exact unchanged identities, never an arbitrary old
// queued run. A changed attempt, SHA, timestamp or state regains the guard.
const INERT_LEGACY_QUEUE = new Map([
  [34868901509, { at: '2026-09-14T16:29:10Z', sha: 'c4930944a6273c00f201994504e3971ad3f2b165' }],
  [34613079069, { at: '2026-09-11T14:55:55Z', sha: '5587001b45ffea056addaf6cd20084719540336a' }],
  [34228112413, { at: '2026-09-08T12:47:45Z', sha: 'b814b525962514a368536f456477881390d6b333' }],
]);

export function isInertLegacyQueue(run) {
  const known = INERT_LEGACY_QUEUE.get(run?.id);
  return Boolean(known && run.status === 'queued' && run.run_attempt === 1 &&
    run.event === 'workflow_dispatch' && run.head_sha === known.sha &&
    run.created_at === known.at && run.updated_at === known.at);
}

function readMainRuns(document, branch, label, nowMs, legacy = false) {
  if (!Array.isArray(document?.workflow_runs)) {
    throw new Error(`${label}: workflow-run history is unavailable`);
  }
  return document.workflow_runs.filter(run => run?.head_branch === branch &&
    !(legacy && isInertLegacyQueue(run))).map(run => {
    const createdMs = Date.parse(run.created_at);
    const updatedMs = Date.parse(run.updated_at);
    // GitHub keeps created_at across reruns. Only the latest attempt's start
    // occupies a new slot; updated_at is completion/activity, not a start.
    const attemptStartedMs = run.run_attempt === 1 ? createdMs : Date.parse(run.run_started_at);
    if (!STATUSES.has(run.status) || !Number.isFinite(createdMs) ||
        !Number.isFinite(updatedMs) || updatedMs < createdMs ||
        !Number.isSafeInteger(run.run_attempt) || run.run_attempt < 1 ||
        !Number.isFinite(attemptStartedMs) || attemptStartedMs < createdMs || attemptStartedMs > updatedMs ||
        createdMs > nowMs + 5 * 60_000 || updatedMs > nowMs + 5 * 60_000 ||
        (run.status === 'completed' && !run.conclusion)) {
      throw new Error(`${label}: malformed main run history`);
    }
    return { id: run.id, status: run.status, conclusion: run.conclusion, attemptStartedMs };
  });
}

function verifiedRecoveryOwner(manualRuns, handoff, nowMs) {
  const { sourceId, recipientId, headSha, jobs } = handoff ?? {};
  if (!RUN_ID.test(sourceId ?? '') || !RUN_ID.test(recipientId ?? '') || sourceId === recipientId
    || !/^[a-f0-9]{40}$/.test(headSha ?? '') || !Array.isArray(jobs?.jobs) || jobs.total_count !== jobs.jobs.length
    || jobs.jobs.length > 100) return null;
  const runs = manualRuns.workflow_runs.filter(run => String(run.id) === sourceId);
  const owner = runs[0];
  const ownRepo = value => value?.id === 1306858343 && value.full_name === REPOSITORY;
  if (runs.length !== 1 || owner.run_attempt !== 1 || owner.event !== 'workflow_dispatch'
    || owner.path !== '.github/workflows/run-current-weather-once.yml' || owner.head_branch !== 'main'
    || owner.head_sha !== headSha || owner.actor?.login !== 'github-actions[bot]'
    || !ownRepo(owner.repository) || !ownRepo(owner.head_repository)
    || owner.status !== 'completed' || owner.conclusion !== 'success') return null;
  const completedAt = Date.parse(owner.updated_at);
  if (completedAt > nowMs || nowMs - completedAt >= LATEST_DISPATCH_MS) return null;
  if (jobs.jobs.some(job => String(job?.run_id) !== sourceId || job.run_attempt !== 1 || job.head_sha !== headSha
    || job.status !== 'completed')) return null;
  const select = (names, conclusion) => {
    const rows = jobs.jobs.filter(job => names.includes(job.name));
    return rows.length === 1 && rows[0].conclusion === conclusion ? rows[0] : null;
  };
  const passedStep = (job, name) => {
    const matches = job?.steps?.filter(step => step.name === name);
    return matches?.length === 1 && matches[0].status === 'completed' && matches[0].conclusion === 'success';
  };
  const handoffJob = select([HANDOFF_JOB], 'success');
  const bindings = handoffJob?.steps?.filter(step => step.name?.startsWith(HANDOFF_STEP));
  if (bindings?.length !== 1 || bindings[0].name !== HANDOFF_STEP + recipientId
    || bindings[0].status !== 'completed' || bindings[0].conclusion !== 'success'
    || !select(['Require a verified current-weather deployment'], 'skipped')
    || !select([RECOVERY_PREFIX + 'Require terminal operational recovery before production'], 'success')) return null;
  const resumePages = select([
    RECOVERY_PREFIX + 'resume-pre-activation-pages / Deploy exact pre-activation Pages artifact',
    RECOVERY_PREFIX + 'Deploy exact pre-activation Pages artifact',
  ], 'success');
  const exactPages = select([RECOVERY_PREFIX + 'Redeploy only a helper-proven exact sealed Pages target'], 'success');
  const exactFinalizer = select([RECOVERY_PREFIX + 'Finalize exact recovered target without Pages privileges'], 'success');
  const resumed = passedStep(resumePages, 'Verify deployed exact model, implementation and 210/673 artifact')
    && passedStep(resumePages, 'Seal exact verified deployment terminal');
  const redeployed = passedStep(exactPages, 'Redeploy the exact sealed Pages target')
    && passedStep(exactFinalizer, 'Reobserve exact target and complete central CAS');
  if (Boolean(resumed) === Boolean(redeployed)) return null;
  return owner;
}

export function assessWeatherCadenceWatchdog({
  normalRuns,
  manualRuns,
  nowMs = Date.now(),
  branch = 'main',
  recoveryHandoff,
}) {
  if (!Number.isFinite(nowMs) || branch !== 'main') {
    throw new Error('Invalid four-hour weather watchdog policy');
  }
  const normal = readMainRuns(normalRuns, branch, 'normal weather', nowMs, true);
  const manual = readMainRuns(manualRuns, branch, 'manual weather', nowMs);
  if (manual.length === 0) throw new Error('No verified current-weather run history on main');
  const slotMs = Math.floor((nowMs - SLOT_MINUTE_MS) / FOUR_HOURS_MS) * FOUR_HOURS_MS + SLOT_MINUTE_MS;
  const slotAt = new Date(slotMs).toISOString();
  const decision = (dispatch, reason) => ({ dispatch, reason, slotAt });
  const runs = [...normal, ...manual];
  if (recoveryHandoff !== undefined) {
    const owner = verifiedRecoveryOwner(manualRuns, recoveryHandoff, nowMs);
    if (!owner || normal.some(run => run.id === owner.id)) return decision(false, 'recovery-only-owner-unproved');
    if (runs.some(run => ACTIVE.has(run.status))) return decision(false, 'weather-run-active-or-queued');
    const occupiedSince = Math.min(slotMs, Date.parse(owner.created_at));
    if (runs.some(run => run.id !== owner.id && run.attemptStartedMs >= occupiedSince))
      return decision(false, 'weather-run-already-started-in-slot');
    return decision(true, 'verified-recovery-needs-fresh-weather');
  }
  if (nowMs < slotMs + EARLIEST_DISPATCH_MS) return decision(false, 'before-external-cadence-window');
  if (nowMs >= slotMs + LATEST_DISPATCH_MS) return decision(false, 'external-cadence-window-expired');
  if (runs.some(run => ACTIVE.has(run.status))) return decision(false, 'weather-run-active-or-queued');
  if (runs.some(run => run.attemptStartedMs >= slotMs)) return decision(false, 'weather-run-already-started-in-slot');
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
  const env = process.env;
  const sourceId = env.RAVRADAR_WEATHER_RECOVERY_RUN_ID;
  let recoveryHandoff;
  if (sourceId) {
    const { GITHUB_RUN_ID: recipientId, GITHUB_SHA: headSha } = env;
    if (!RUN_ID.test(sourceId) || !RUN_ID.test(recipientId ?? '') || sourceId === recipientId
      || !/^[a-f0-9]{40}$/.test(headSha ?? '') || env.RAVRADAR_EXTERNAL_WATCHDOG !== 'false'
      || env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== 'refs/heads/main'
      || env.GITHUB_WORKFLOW_REF !== REPOSITORY + '/.github/workflows/watch-missed-weather-schedule.yml@refs/heads/main'
      || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_RUN_ATTEMPT !== '1'
      || env.GITHUB_ACTOR !== 'github-actions[bot]' || env.GITHUB_TRIGGERING_ACTOR !== 'github-actions[bot]') {
      throw new Error('WEATHER_RECOVERY_HANDOFF_REJECTED');
    }
    const jobs = await readWeatherCadenceGithub({ kind: 'recovery-jobs', repository: REPOSITORY,
      token: env.GH_TOKEN, recoveryRunId: sourceId });
    recoveryHandoff = { sourceId, recipientId, headSha, jobs };
  }
  const result = assessWeatherCadenceWatchdog({ normalRuns, manualRuns, recoveryHandoff });
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
