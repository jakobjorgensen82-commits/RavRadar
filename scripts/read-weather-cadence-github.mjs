#!/usr/bin/env node
// Only the watchdog's existing metadata GETs may retry. Dispatch is separate.
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {verifyReadOnlySourceWorkflowHeader} from './lib/source-impact-workflow-review.mjs';

const routes = {
  workflow: 'run-current-weather-once.yml',
  normal: 'update-and-deploy.yml/runs?per_page=100',
  manual: 'run-current-weather-once.yml/runs?per_page=100',
};
const transient = new Set([502, 503, 504]);
const delays = [1000, 2000];
const inProgressInventoryDelays = [1000, 2000, 5000, 10_000, 15_000];
const fail = (code, routeLabel) => {
  throw Object.assign(new Error(routeLabel ? `${code} ${routeLabel}` : code), { cadenceReadCode: code });
};
export const CADENCE_ACTIVE_STATES = Object.freeze(['queued', 'in_progress', 'waiting', 'requested', 'pending']);

export const PR_SOURCE_VALIDATION = '.github/workflows/validate-pull-request.yml';
const COMMIT_SHA = /^[0-9a-f]{40}$/;

async function readCacheDisabledValidationBlob() {
  const bytes = await readFile(new URL('../' + PR_SOURCE_VALIDATION, import.meta.url));
  const yaml = bytes.toString('utf8').replace(/\r\n/g, '\n').replace(/^ *#[^\n]*\n/gm, '');
  if (!verifyReadOnlySourceWorkflowHeader(yaml)) return null;
  return createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
}

export async function readCacheIndependentValidationRuns({runs, repository, readWorkflowFile}) {
  const independent = new Set();
  if (typeof readWorkflowFile !== 'function') return independent;
  const refs = new Map();
  let expectedBlob;
  for (const run of runs) {
    if (run?.path !== PR_SOURCE_VALIDATION || run.event !== 'pull_request' || run.run_attempt !== 1
        || !Array.isArray(run.referenced_workflows) || run.referenced_workflows.length !== 0) continue;
    const pr = run.pull_requests?.length === 1 && run.pull_requests[0];
    const repoId = run.repository?.id;
    if (!Number.isSafeInteger(repoId) || repoId < 1 || run.repository.full_name !== repository
        || run.head_repository?.id !== repoId || run.head_repository.full_name !== repository
        || pr?.base?.repo?.id !== repoId || pr.base.ref !== 'main' || pr.head?.repo?.id !== repoId
        || pr.head.ref !== run.head_branch || pr.head.sha !== run.head_sha
        || !COMMIT_SHA.test(pr.head.sha ?? '') || !COMMIT_SHA.test(pr.base.sha ?? '')) continue;
    try {
      expectedBlob ??= readCacheDisabledValidationBlob();
      const expected = await expectedBlob;
      if (!expected) break;
      const files = await Promise.all([pr.base.sha, pr.head.sha].map(ref => {
        if (!refs.has(ref)) refs.set(ref, Promise.resolve().then(() => readWorkflowFile(ref)));
        return refs.get(ref);
      }));
      // The pull_request event uses the merge revision. Both of its source
      // commits must contain the same reviewed, cache-disabled workflow.
      if (files.every(file => file?.type === 'file' && file.path === PR_SOURCE_VALIDATION
          && file.sha === expected)) independent.add(run.id);
    } catch {
      // An unavailable workflow file leaves the run in the reader inventory.
    }
  }
  return independent;
}

export async function readWeatherCadenceGithub({ kind, repository, token, recoveryRunId,
  ownerOrdersSince, activeRunStatus, workflowRef, waitForInProgress = false,
  request = fetch, wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  const recovery = kind === 'recovery-jobs';
  const ownerOrders = kind === 'owner-orders';
  const activeRuns = kind === 'owner-active-runs';
  const workflowFile = kind === 'source-validation-workflow-file';
  if ((!recovery && !ownerOrders && !activeRuns && !workflowFile && !Object.hasOwn(routes, kind))
    || (workflowFile ? !COMMIT_SHA.test(workflowRef ?? '') : workflowRef !== undefined)
    || (recovery ? !/^[1-9][0-9]{0,14}$/.test(recoveryRunId ?? '') : recoveryRunId !== undefined)
    || (ownerOrders ? !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ownerOrdersSince ?? '') : ownerOrdersSince !== undefined)
    || (activeRuns ? !CADENCE_ACTIVE_STATES.includes(activeRunStatus) : activeRunStatus !== undefined)
    || typeof waitForInProgress !== 'boolean' || (waitForInProgress && activeRunStatus !== 'in_progress')
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')
    || typeof token !== 'string' || !token || typeof request !== 'function' || typeof wait !== 'function') {
    fail('WEATHER_CADENCE_READ_ARGUMENT_REJECTED');
  }
  const route = recovery ? `runs/${recoveryRunId}/attempts/1/jobs?per_page=100`
    : ownerOrders ? 'workflows/watch-missed-weather-schedule.yml/runs?branch=main&event=workflow_dispatch&per_page=100&created='
      + encodeURIComponent('>=' + ownerOrdersSince)
    : activeRuns ? 'runs?status=' + activeRunStatus + '&per_page=100'
    : `workflows/${routes[kind]}`;
  const url = workflowFile
    ? `https://api.github.com/repos/${repository}/contents/${PR_SOURCE_VALIDATION}?ref=${workflowRef}`
    : `https://api.github.com/repos/${repository}/actions/${route}`;
  const routeLabel = activeRuns ? `${kind}:${activeRunStatus}` : kind;
  const reject = code => fail(code, routeLabel);
  const counted = recovery || ownerOrders || activeRuns;
  const inventoryDelays = waitForInProgress ? inProgressInventoryDelays : delays;
  // Owner inventory reads share their wait budget by running concurrently.
  // The separate single POST is bounded to 20s inside the unchanged 5min job.
  let retry = 0;
  for (;;) {
    const signal = AbortSignal.timeout(10_000);
    try {
      const response = await request(url, { method: 'GET', redirect: 'error', cache: 'no-store', signal,
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28' } });
      if (response.status === 401 || response.status === 403) reject('WEATHER_CADENCE_READ_AUTH_REJECTED');
      if (!transient.has(response.status)) {
        if (response.status !== 200) reject('WEATHER_CADENCE_READ_HTTP_REJECTED');
        let document;
        try { document = await response.json(); }
        catch (error) {
          if (signal.aborted && signal.reason?.name === 'TimeoutError'
            && (error === signal.reason || error?.name === 'AbortError')) throw signal.reason;
          reject('WEATHER_CADENCE_READ_JSON_REJECTED');
        }
        if (!document || typeof document !== 'object' || Array.isArray(document)) {
          reject('WEATHER_CADENCE_READ_METADATA_REJECTED');
        }
        if (kind === 'workflow') {
          if (document.state !== 'active') reject('WEATHER_CADENCE_READ_METADATA_REJECTED');
          return document;
        }
        if (workflowFile) return document;
        const rows = recovery ? document.jobs : document.workflow_runs;
        if (!Array.isArray(rows) || rows.length > 100 || (counted &&
          (!Number.isSafeInteger(document.total_count) || document.total_count < 0 || document.total_count > 100))) {
          reject('WEATHER_CADENCE_READ_METADATA_REJECTED');
        }
        if (!counted || document.total_count === rows.length) return document;
        if (recovery) reject('WEATHER_CADENCE_READ_METADATA_REJECTED');
        // The API can return inconsistent list/count metadata as activity changes.
        // Never combine snapshots or release a document with missing rows.
        if (retry === inventoryDelays.length) reject('WEATHER_CADENCE_READ_INCOMPLETE');
        await wait(inventoryDelays[retry++]);
        continue;
      }
    } catch (error) {
      if (error?.cadenceReadCode) throw error;
      // A network error, caller abort or unknown exception is not our timeout.
      if (!signal.aborted || signal.reason?.name !== 'TimeoutError' || error !== signal.reason) {
        reject('WEATHER_CADENCE_READ_UNAVAILABLE');
      }
    }
    if (retry >= delays.length) reject('WEATHER_CADENCE_READ_RETRY_EXHAUSTED');
    await wait(delays[retry++]);
  }
}

async function main() {
  if (process.argv.length !== 3 || process.env.GITHUB_REF !== 'refs/heads/main') {
    fail('WEATHER_CADENCE_READ_ARGUMENT_REJECTED');
  }
  const document = await readWeatherCadenceGithub({ kind: process.argv[2],
    repository: process.env.GITHUB_REPOSITORY, token: process.env.GH_TOKEN });
  // Exactly one JSON document; transient failures never contaminate run files.
  console.log(JSON.stringify(document));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error?.cadenceReadCode ? error.message : 'WEATHER_CADENCE_READ_UNAVAILABLE'); process.exitCode = 1; });
}
