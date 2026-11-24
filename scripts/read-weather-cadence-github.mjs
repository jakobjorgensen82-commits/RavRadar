#!/usr/bin/env node
// Only the watchdog's existing metadata GETs may retry. Dispatch is separate.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export async function readWeatherCadenceGithub({ kind, repository, token, recoveryRunId,
  ownerOrdersSince, activeRunStatus,
  request = fetch, wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)) }) {
  const recovery = kind === 'recovery-jobs';
  const ownerOrders = kind === 'owner-orders';
  const activeRuns = kind === 'owner-active-runs';
  if ((!recovery && !ownerOrders && !activeRuns && !Object.hasOwn(routes, kind))
    || (recovery ? !/^[1-9][0-9]{0,14}$/.test(recoveryRunId ?? '') : recoveryRunId !== undefined)
    || (ownerOrders ? !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(ownerOrdersSince ?? '') : ownerOrdersSince !== undefined)
    || (activeRuns ? !CADENCE_ACTIVE_STATES.includes(activeRunStatus) : activeRunStatus !== undefined)
    || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')
    || typeof token !== 'string' || !token || typeof request !== 'function' || typeof wait !== 'function') {
    fail('WEATHER_CADENCE_READ_ARGUMENT_REJECTED');
  }
  const route = recovery ? `runs/${recoveryRunId}/attempts/1/jobs?per_page=100`
    : ownerOrders ? 'workflows/watch-missed-weather-schedule.yml/runs?branch=main&event=workflow_dispatch&per_page=100&created='
      + encodeURIComponent('>=' + ownerOrdersSince)
    : activeRuns ? 'runs?status=' + activeRunStatus + '&per_page=100'
    : `workflows/${routes[kind]}`;
  const url = `https://api.github.com/repos/${repository}/actions/${route}`;
  const routeLabel = activeRuns ? `${kind}:${activeRunStatus}` : kind;
  const reject = code => fail(code, routeLabel);
  const counted = recovery || ownerOrders || activeRuns;
  const inventoryDelays = activeRunStatus === 'in_progress' ? inProgressInventoryDelays : delays;
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
