#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import { CADENCE_ACTIVE_STATES, readWeatherCadenceGithub } from './read-weather-cadence-github.mjs';
import { DMI_PRODUCER_JOB } from './lib/terminal-dmi-cache.mjs';
import { WEATHER_FAILURE_OWNER } from './notify-weather-failure.mjs';

const FOUR_HOURS_MS = 4 * 60 * 60_000;
const SLOT_MINUTE_MS = 17 * 60_000;
const EARLIEST_DISPATCH_MS = 60_000;
const LATEST_DISPATCH_MS = 90 * 60_000;
const ACTIVE = new Set(CADENCE_ACTIVE_STATES);
const STATUSES = new Set([...ACTIVE, 'completed']);
const REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
const WATCHDOG_PATH = '.github/workflows/watch-missed-weather-schedule.yml';
const ORDINARY_PATH = '.github/workflows/run-current-weather-once.yml';
const LEGACY_PATH = '.github/workflows/update-and-deploy.yml';
const OWNER_ORDER_TITLE = 'Owner weather request';
const RAW_RETRY_TITLE = 'Retry weather after an exact pre-DMI RAW reader hold';
const RAW_HANDOFF_JOB = 'Hand off the pre-DMI RAW reader hold to the existing cadence watchdog';
const RAW_HANDOFF_STEP = 'Bind RAW reader retry recipient ';
const BOT = 'github-actions[bot]';
const RECOVERY_PREFIX = 'Finish an interrupted generation before new work / ';
const HANDOFF_JOB = 'Hand off recovered weather to the existing cadence watchdog';
const HANDOFF_STEP = 'Bind weather recovery recipient ';
const RUN_ID = /^[1-9][0-9]{0,14}$/;
const MAIN_HEAD = /^[a-f0-9]{40}$/;
const slotFor = nowMs => Math.floor((nowMs - SLOT_MINUTE_MS) / FOUR_HOURS_MS) * FOUR_HOURS_MS + SLOT_MINUTE_MS;
const ownRepository = value => value?.id === 1306858343 && value.full_name === REPOSITORY;
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

function orderActor(run) {
  if (run?.display_title === RAW_RETRY_TITLE) return BOT;
  if (run?.display_title === OWNER_ORDER_TITLE) return WEATHER_FAILURE_OWNER;
  return null;
}

function ownerOrders(history) {
  return history.workflow_runs.filter(run => orderActor(run) === run?.actor?.login);
}

function sourceOrdinaryRun(run, sourceId, slotMs, nowMs) {
  return String(run?.id) === sourceId && run.path === ORDINARY_PATH && run.head_branch === 'main'
    && run.event === 'workflow_dispatch' && run.run_attempt === 1 && MAIN_HEAD.test(run.head_sha ?? '')
    && run.actor?.login === BOT && run.triggering_actor?.login === BOT
    && ownRepository(run.repository) && ownRepository(run.head_repository)
    && Date.parse(run.created_at) >= slotMs && Date.parse(run.updated_at) <= nowMs;
}

function exactOutcome(rows, name, conclusion) {
  const matches = Array.isArray(rows) ? rows.filter(row => row?.name === name) : [];
  return matches.length === 1 && matches[0].status === 'completed' && matches[0].conclusion === conclusion
    ? matches[0] : null;
}

function verifiedRawReaderHold(failed, request, document) {
  const jobs = document?.jobs;
  if (failed.head_sha !== request.head_sha || !Array.isArray(jobs) || document.total_count !== jobs.length
    || jobs.length > 100 || new Set(jobs.map(job => job?.id)).size !== jobs.length
    || jobs.some(job => !RUN_ID.test(String(job?.id)) || job.run_id !== failed.id || job.head_sha !== failed.head_sha
      || job.head_branch !== 'main' || job.run_attempt !== 1 || job.status !== 'completed')) return false;
  const handoff = exactOutcome(jobs, RAW_HANDOFF_JOB, 'success');
  const recipientBindings = handoff?.steps?.filter(step => step.name?.startsWith(RAW_HANDOFF_STEP));
  const rotator = exactOutcome(jobs, 'Retire verified older DMI RAW archives', 'success');
  const builder = exactOutcome(jobs, DMI_PRODUCER_JOB, 'failure');
  const stopped = exactOutcome(builder?.steps, 'Require successful RAW rotation for this exact target', 'failure');
  const download = exactOutcome(builder?.steps, 'Download the immutable RAW rotation decision', 'success');
  const published = exactOutcome(rotator?.steps, 'Publish the RAW rotation decision', 'success');
  const held = exactOutcome(rotator?.steps, 'Record exact RAW reader hold with zero retirements', 'success');
  return recipientBindings?.length === 1
    && Boolean(exactOutcome(recipientBindings, RAW_HANDOFF_STEP + request.id, 'success'))
    && published?.number < held?.number && download?.number < stopped?.number
    && [
      'Update DMI bulk model cache', 'Fill only exact-hour DMI gaps from Copernicus',
      'Fill only the exact remaining current gaps from Open-Meteo', 'Save progressed DMI GRIB download cache',
      'Publish bounded private runtime with one protected rollback generation',
      'Publish atomic RavScore checkpoint to protected admin storage',
    ].every(name => stopped.number < exactOutcome(builder?.steps, name, 'skipped')?.number)
    && Boolean(exactOutcome(jobs, 'Deploy prepared Pages artifact through reusable workflow', 'skipped'))
    && Boolean(exactOutcome(jobs, RECOVERY_PREFIX + 'Require terminal operational recovery before production', 'success'))
    && Boolean(exactOutcome(jobs, 'Require a verified current-weather deployment', 'failure'));
}

function priorMayHaveSkippedDispatch(run) {
  return run?.status === 'completed' && RUN_ID.test(String(run.id))
    && (run.conclusion === 'failure' || (orderActor(run) === BOT && run.conclusion === 'success'));
}

function priorOrderStoppedBeforeDispatch(prior, request, failed, jobs, sameWorkflow, nowMs) {
  const automatic = orderActor(prior) === BOT;
  if (!sameWorkflow || prior.run_attempt !== 1
    || prior.triggering_actor?.login !== orderActor(prior)
    || !MAIN_HEAD.test(prior.head_sha ?? '') || !priorMayHaveSkippedDispatch(prior)
    || !(Date.parse(prior.created_at) >= Date.parse(automatic ? failed.created_at : failed.updated_at)
      && Date.parse(prior.updated_at) >= Date.parse(prior.created_at)
      && Date.parse(prior.updated_at) <= (automatic ? nowMs : Date.parse(request.created_at)))
    || !Array.isArray(jobs?.jobs) || jobs.total_count !== jobs.jobs.length || jobs.jobs.length > 100) return false;
  const dispatchJobs = jobs.jobs.filter(job => job?.name === 'dispatch');
  const [dispatch] = dispatchJobs;
  return dispatchJobs.length === 1 && RUN_ID.test(String(dispatch.id)) && dispatch.run_id === prior.id
    && dispatch.run_attempt === 1 && dispatch.head_branch === 'main' && dispatch.head_sha === prior.head_sha
    && dispatch.status === 'completed' && dispatch.conclusion === 'skipped'
    && Array.isArray(dispatch.steps) && dispatch.steps.length === 0;
}

function verifiedOwnerOrder(manualRuns, ownerOrder, slotMs, nowMs) {
  const { failedRunId, requestId, headSha, history, priorJobs, samePriorWorkflow, rawReaderJobs } = ownerOrder ?? {};
  const automatic = rawReaderJobs !== undefined;
  const actor = automatic ? BOT : WEATHER_FAILURE_OWNER;
  if (!RUN_ID.test(failedRunId ?? '') || !RUN_ID.test(requestId ?? '') || requestId === failedRunId
    || !MAIN_HEAD.test(headSha ?? '') || !Array.isArray(history?.workflow_runs)
    || history.total_count !== history.workflow_runs.length || history.total_count > 100) return null;
  const failures = manualRuns.workflow_runs.filter(run => String(run?.id) === failedRunId);
  const failed = failures[0];
  if (failures.length !== 1 || !sourceOrdinaryRun(failed, failedRunId, slotMs, nowMs)
    || failed.status !== 'completed' || failed.conclusion !== 'failure') return null;
  // A failed POST can still create a run. Only a separately verified skipped
  // dispatch job permits one replacement of a terminal, earlier owner order.
  const requests = ownerOrders(history);
  if (requests.some(run => !RUN_ID.test(String(run.id)) || run.path !== WATCHDOG_PATH
    || run.head_branch !== 'main' || run.event !== 'workflow_dispatch'
    || !ownRepository(run.repository) || !ownRepository(run.head_repository)
    || !(Date.parse(run.created_at) >= slotMs && Date.parse(run.created_at) <= nowMs))) return null;
  const ownRequests = requests.filter(run => String(run.id) === requestId);
  const request = ownRequests[0];
  const earlier = requests.filter(run => Number(run.id) < Number(requestId));
  if (ownRequests.length !== 1 || request.run_attempt !== 1 || request.status !== 'in_progress'
    || request.conclusion !== null || request.head_sha !== headSha
    || orderActor(request) !== actor || request.triggering_actor?.login !== actor) return null;
  if (automatic) return earlier.length === 0 && Date.parse(request.created_at) >= Date.parse(failed.created_at)
    && Date.parse(request.created_at) <= Date.parse(failed.updated_at)
    && verifiedRawReaderHold(failed, request, rawReaderJobs) ? failed : null;
  if (Date.parse(request.created_at) < Date.parse(failed.updated_at)
    || earlier.length > 1
    || (earlier.length === 1 && !priorOrderStoppedBeforeDispatch(earlier[0], request, failed,
      priorJobs, samePriorWorkflow, nowMs))) return null;
  return failed;
}

function sameOwnerWorkflow(priorHead, headSha) {
  if (!MAIN_HEAD.test(priorHead ?? '') || !MAIN_HEAD.test(headSha ?? '')) return false;
  try {
    const git = args => execFileSync('git', args, { timeout: 3000, maxBuffer: 64 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_NO_REPLACE_OBJECTS: '1' } });
    git(['merge-base', '--is-ancestor', priorHead, headSha]);
    return git(['cat-file', 'blob', `${priorHead}:${WATCHDOG_PATH}`])
      .equals(git(['cat-file', 'blob', `${headSha}:${WATCHDOG_PATH}`]));
  } catch { return false; }
}

function ownerOrderReadersClear({ requestId, headSha, activity }) {
  if (!Array.isArray(activity) || activity.length !== CADENCE_ACTIVE_STATES.length) return false;
  const observed = new Set();
  for (const [index, status] of CADENCE_ACTIVE_STATES.entries()) {
    const document = activity[index];
    if (!Array.isArray(document?.workflow_runs) || document.total_count !== document.workflow_runs.length
      || document.total_count > 100) return false;
    for (const row of document.workflow_runs) {
      if (!RUN_ID.test(String(row?.id)) || observed.has(row.id) || row.status !== status
        || row.conclusion !== null || !ownRepository(row.repository)) return false;
      observed.add(row.id);
      if (String(row.id) === requestId && row.path === WATCHDOG_PATH && row.head_sha === headSha
        && row.head_branch === 'main' && row.status === 'in_progress' && row.run_attempt === 1) continue;
      if (row.path === LEGACY_PATH && row.head_branch === 'main' && isInertLegacyQueue(row)) continue;
      return false;
    }
  }
  return observed.has(Number(requestId));
}

export function assessWeatherCadenceWatchdog({
  normalRuns,
  manualRuns,
  nowMs = Date.now(),
  branch = 'main',
  recoveryHandoff,
  ownerOrder,
}) {
  if (!Number.isFinite(nowMs) || branch !== 'main') {
    throw new Error('Invalid four-hour weather watchdog policy');
  }
  const normal = readMainRuns(normalRuns, branch, 'normal weather', nowMs, true);
  const manual = readMainRuns(manualRuns, branch, 'manual weather', nowMs);
  if (manual.length === 0) throw new Error('No verified current-weather run history on main');
  const slotMs = slotFor(nowMs);
  const slotAt = new Date(slotMs).toISOString();
  const decision = (dispatch, reason) => ({ dispatch, reason, slotAt });
  const runs = [...normal, ...manual];
  if (ownerOrder !== undefined) {
    const automatic = ownerOrder.rawReaderJobs !== undefined;
    const failed = recoveryHandoff === undefined && verifiedOwnerOrder(manualRuns, ownerOrder, slotMs, nowMs);
    if (!failed || normal.some(run => run.id === failed.id)) return decision(false, 'owner-weather-order-unproved');
    if (nowMs < slotMs + EARLIEST_DISPATCH_MS || nowMs >= slotMs + LATEST_DISPATCH_MS)
      return decision(false, 'owner-weather-order-window-closed');
    if (runs.some(run => ACTIVE.has(run.status))) return decision(false, 'weather-run-active-or-queued');
    if (runs.some(run => run.id !== failed.id && run.attemptStartedMs >= Date.parse(failed.created_at)))
      return decision(false, 'weather-run-already-started-after-owner-boundary');
    if (automatic && runs.some(run => run.id !== failed.id && run.attemptStartedMs >= slotMs))
      return decision(false, 'raw-reader-first-attempt-already-used');
    if (!ownerOrderReadersClear(ownerOrder)) {
      // The owner may queue behind this watchdog's cadence lock. Give up the
      // automatic order before POST so the queued owner can actually take over.
      const queuedOwner = automatic && ownerOrders(ownerOrder.history).some(run => orderActor(run) === WEATHER_FAILURE_OWNER
        && run.triggering_actor?.login === WEATHER_FAILURE_OWNER && run.run_attempt === 1
        && Number(run.id) > Number(ownerOrder.requestId)
        && ACTIVE.has(run.status) && run.status !== 'in_progress' && run.conclusion === null);
      return decision(false, queuedOwner ? 'raw-reader-retry-yields-to-owner' : 'owner-weather-order-actions-active-or-unproved');
    }
    return decision(true, automatic ? 'verified-raw-reader-hold-needs-fresh-weather' : 'verified-owner-order-needs-fresh-weather');
  }
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

// The automatic recipient holds only the cadence lock. The original weather
// writer must finish before this reader can authorize another ordinary owner.
export async function inspectRawReaderRetry({ failedRunId, requestId, headSha, waitForReaders,
  read, clock = Date.now, sleep = pause }) {
  const slotMs = slotFor(clock());
  const no = reason => ({ dispatch: false, reason, slotAt: new Date(slotMs).toISOString() });
  const cutoffMs = slotMs + LATEST_DISPATCH_MS;
  for (;;) {
    const nowMs = clock();
    if (nowMs >= cutoffMs) return no('owner-weather-order-window-closed');
    const manualRuns = await read({ kind: 'manual' });
    const sources = manualRuns.workflow_runs.filter(run => String(run?.id) === failedRunId);
    const source = sources[0];
    if (sources.length !== 1 || !sourceOrdinaryRun(source, failedRunId, slotMs, clock())
      || source.head_sha !== headSha) return no('raw-reader-retry-source-unproved');
    if (source.status === 'completed' && source.conclusion === 'failure') {
      const [normalRuns, freshManual, history, rawReaderJobs, ...activity] = await Promise.all([
        read({ kind: 'normal' }),
        read({ kind: 'manual' }),
        read({ kind: 'owner-orders', ownerOrdersSince: new Date(slotMs).toISOString() }),
        read({ kind: 'recovery-jobs', recoveryRunId: failedRunId }),
        ...CADENCE_ACTIVE_STATES.map(activeRunStatus => read({ kind: 'owner-active-runs', activeRunStatus })),
      ]);
      if (clock() >= cutoffMs) return no('owner-weather-order-window-closed');
      const result = assessWeatherCadenceWatchdog({ normalRuns, manualRuns: freshManual, nowMs: clock(),
        ownerOrder: { failedRunId, requestId, headSha, history, rawReaderJobs, activity } });
      if (!waitForReaders || result.reason !== 'owner-weather-order-actions-active-or-unproved') return result;
    } else if (!waitForReaders || source.status !== 'in_progress' || source.conclusion !== null) {
      return no('raw-reader-retry-source-not-terminal');
    }
    // Avoid a busy loop against GitHub while a real reader remains active.
    const remaining = cutoffMs - clock();
    if (remaining <= 0) return no('owner-weather-order-window-closed');
    await sleep(Math.min(60_000, remaining));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let [normalRuns, manualRuns] = await Promise.all([
    fs.readFile(options.normalRunsPath, 'utf8').then(JSON.parse),
    fs.readFile(options.manualRunsPath, 'utf8').then(JSON.parse),
  ]);
  const env = process.env;
  const sourceId = env.RAVRADAR_WEATHER_RECOVERY_RUN_ID;
  const failedRunId = env.RAVRADAR_WEATHER_OWNER_FAILED_RUN_ID;
  const rawReaderId = env.RAVRADAR_WEATHER_RAW_READER_RETRY_SOURCE_RUN_ID;
  const nowMs = Date.now();
  let rawRetryResult;
  if (rawReaderId) {
    const { GITHUB_RUN_ID: requestId, GITHUB_SHA: headSha } = env;
    if (sourceId || failedRunId || !RUN_ID.test(rawReaderId) || !RUN_ID.test(requestId ?? '')
      || requestId === rawReaderId || !MAIN_HEAD.test(headSha ?? '')
      || env.RAVRADAR_EXTERNAL_WATCHDOG !== 'false'
      || env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== 'refs/heads/main'
      || env.GITHUB_WORKFLOW_REF !== REPOSITORY + '/' + WATCHDOG_PATH + '@refs/heads/main'
      || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_RUN_ATTEMPT !== '1'
      || env.GITHUB_ACTOR !== BOT || env.GITHUB_TRIGGERING_ACTOR !== BOT) {
      throw new Error('WEATHER_RAW_READER_RETRY_REJECTED');
    }
    rawRetryResult = await inspectRawReaderRetry({ failedRunId: rawReaderId, requestId, headSha,
      waitForReaders: env.RAVRADAR_WEATHER_RAW_READER_WAIT === 'true',
      read: options => readWeatherCadenceGithub({ ...options, repository: REPOSITORY, token: env.GH_TOKEN }),
    });
  }
  let ownerOrder;
  if (failedRunId) {
    const { GITHUB_RUN_ID: requestId, GITHUB_SHA: headSha } = env;
    if (sourceId || !RUN_ID.test(failedRunId) || !RUN_ID.test(requestId ?? '') || failedRunId === requestId
      || !MAIN_HEAD.test(headSha ?? '') || env.RAVRADAR_EXTERNAL_WATCHDOG !== 'false'
      || env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== 'refs/heads/main'
      || env.GITHUB_WORKFLOW_REF !== REPOSITORY + '/' + WATCHDOG_PATH + '@refs/heads/main'
      || env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_RUN_ATTEMPT !== '1'
      || env.GITHUB_ACTOR !== WEATHER_FAILURE_OWNER || env.GITHUB_TRIGGERING_ACTOR !== WEATHER_FAILURE_OWNER) {
      throw new Error('WEATHER_OWNER_ORDER_REJECTED');
    }
    const access = { repository: REPOSITORY, token: env.GH_TOKEN };
    const history = await readWeatherCadenceGithub({ ...access, kind: 'owner-orders',
      ownerOrdersSince: new Date(slotFor(nowMs)).toISOString() });
    const earlier = ownerOrders(history).filter(run => Number(run.id) < Number(requestId));
    const [prior] = earlier;
    const samePriorWorkflow = earlier.length === 1 && priorMayHaveSkippedDispatch(prior)
      && sameOwnerWorkflow(prior.head_sha, headSha);
    const priorJobs = samePriorWorkflow
      ? await readWeatherCadenceGithub({ ...access, kind: 'recovery-jobs', recoveryRunId: String(prior.id) })
      : undefined;
    // Wait for the unstable list before collecting the final set together.
    // Earlier status snapshots could otherwise miss work queued during the wait.
    await readWeatherCadenceGithub({ ...access, kind: 'owner-active-runs',
      activeRunStatus: 'in_progress', waitForInProgress: true });
    const [freshNormal, freshManual, ...activity] = await Promise.all([
      readWeatherCadenceGithub({ ...access, kind: 'normal' }),
      readWeatherCadenceGithub({ ...access, kind: 'manual' }),
      ...CADENCE_ACTIVE_STATES.map(activeRunStatus =>
        readWeatherCadenceGithub({ ...access, kind: 'owner-active-runs', activeRunStatus })),
    ]);
    normalRuns = freshNormal;
    manualRuns = freshManual;
    ownerOrder = { failedRunId, requestId, headSha, history, activity, priorJobs, samePriorWorkflow };
  }
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
  const result = rawRetryResult ?? assessWeatherCadenceWatchdog({ normalRuns, manualRuns,
    nowMs: ownerOrder ? Date.now() : nowMs, recoveryHandoff, ownerOrder });
  if (options.githubOutput) {
    await fs.appendFile(options.githubOutput, `dispatch=${result.dispatch}\nreason=${result.reason}\n`);
    if (rawRetryResult?.dispatch) {
      const expiresAt = Date.parse(rawRetryResult.slotAt) + LATEST_DISPATCH_MS;
      await fs.appendFile(options.githubOutput, `raw_retry_deadline_ms=${expiresAt}\n`);
    }
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
