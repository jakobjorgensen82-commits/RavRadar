#!/usr/bin/env node
// Owner-approved link/status alert only. Never read logs, artifacts or weather.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEATHER_FAILURE_REPOSITORY = 'jakobjorgensen82-commits/RavRadar';
export const WEATHER_FAILURE_OWNER = 'jakobjorgensen82-commits';
const repositoryId = 1306858343;
const entry = '.github/workflows/run-current-weather-once.yml';
const failures = new Set(['failure', 'timed_out', 'startup_failure']);
const integer = value => Number.isSafeInteger(value) && value > 0;
const fail = code => { throw Object.assign(new Error(code), { alertCode: code }); };

export function weatherFailureIssue(run) {
  if (!integer(run?.id) || !integer(run.run_attempt)
    || run.repository?.full_name !== WEATHER_FAILURE_REPOSITORY || run.repository.id !== repositoryId
    || run.head_repository?.full_name !== WEATHER_FAILURE_REPOSITORY || run.head_repository.id !== repositoryId
    || run.head_branch !== 'main' || run.path !== entry || run.event !== 'workflow_dispatch'
    || !/^[a-f0-9]{40}$/.test(run.head_sha ?? '')) fail('RUN_SCOPE_REJECTED');
  if (run.status !== 'completed' || !failures.has(run.conclusion)) return null;
  // Never interpolate an API title, actor, branch, URL, exception or payload.
  const url = `https://github.com/${WEATHER_FAILURE_REPOSITORY}/actions/runs/${run.id}`;
  if (run.html_url !== url) fail('RUN_URL_REJECTED');
  return {
    title: `RavRadar vejrhentning ${run.id}: fejl`,
    body: `Vejrhentning: ${url}\n\nStatus: ${run.conclusion}\n\n<!-- ravradar-weather-failure:${run.id} -->`,
    assignees: [WEATHER_FAILURE_OWNER],
  };
}

export async function notifyWeatherFailure({ runId, eventAttempt = null, sourceHead, get, post } = {}) {
  if (!integer(runId) || (eventAttempt !== null && !integer(eventAttempt))
    || !/^[a-f0-9]{40}$/.test(sourceHead ?? '') || typeof get !== 'function' || typeof post !== 'function') fail('ARGUMENT_REJECTED');
  const base = `/repos/${WEATHER_FAILURE_REPOSITORY}`;
  const repo = await get(base);
  if (repo?.id !== repositoryId || repo.full_name !== WEATHER_FAILURE_REPOSITORY
    || repo.default_branch !== 'main' || repo.has_issues !== true) fail('REPOSITORY_REJECTED');
  if ((await get(`${base}/git/ref/heads/main`))?.object?.sha !== sourceHead) fail('SOURCE_HEAD_CHANGED');
  const run = await get(`${base}/actions/runs/${runId}`);
  if (run?.id !== runId) fail('RUN_ID_REJECTED');
  // A delayed notification from an older attempt must not report a newer success.
  if (eventAttempt !== null && run.run_attempt !== eventAttempt) return { status: 'SKIPPED', reason: 'ATTEMPT_SUPERSEDED' };
  const issue = weatherFailureIssue(run);
  if (!issue) return { status: 'SKIPPED', reason: 'NOT_COMPLETED_FAILURE' };
  const marker = `<!-- ravradar-weather-failure:${runId} -->`;
  // List all states, not eventually-consistent search. No edit/close/comment.
  // The workflow serializes alerts; reaching the bound never authorizes create.
  for (let page = 1; page <= 100; page++) {
    const rows = await get(`${base}/issues?state=all&creator=github-actions%5Bbot%5D&sort=created&direction=desc&per_page=100&page=${page}`);
    if (!Array.isArray(rows) || rows.length > 100) fail('ISSUE_LIST_REJECTED');
    for (const row of rows) {
      if (row?.pull_request || row?.title !== issue.title || !String(row?.body ?? '').includes(marker)) continue;
      if (!integer(row.number) || row.user?.login !== 'github-actions[bot]') fail('EXISTING_ISSUE_REJECTED');
      if (!row.assignees?.some(owner => owner.login === WEATHER_FAILURE_OWNER)) fail('EXISTING_ISSUE_NOT_ASSIGNED');
      return { status: 'EXISTING', issueNumber: row.number, runId, privatePayloadIncluded: false };
    }
    if (rows.length === 100) continue;
    await get(`${base}/assignees/${WEATHER_FAILURE_OWNER}`);
    // Re-read the live run/main immediately before the single write boundary.
    const renewed = await get(`${base}/actions/runs/${runId}`);
    if (renewed?.id !== runId || renewed.run_attempt !== run.run_attempt
      || JSON.stringify(weatherFailureIssue(renewed)) !== JSON.stringify(issue)) fail('RUN_CHANGED_BEFORE_CREATE');
    if ((await get(`${base}/git/ref/heads/main`))?.object?.sha !== sourceHead) fail('SOURCE_HEAD_CHANGED');
    let created;
    try { created = await post(`${base}/issues`, issue); }
    catch { fail('ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY'); }
    if (!integer(created?.number) || created.title !== issue.title || created.body !== issue.body
      || created.user?.login !== 'github-actions[bot]'
      || !created.assignees?.some(owner => owner.login === WEATHER_FAILURE_OWNER)) fail('ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY');
    const verified = await get(`${base}/issues/${created.number}`);
    if (verified?.number !== created.number || verified.title !== issue.title || verified.body !== issue.body
      || verified.user?.login !== 'github-actions[bot]' || verified.pull_request
      || !verified.assignees?.some(owner => owner.login === WEATHER_FAILURE_OWNER)) fail('ISSUE_VERIFY_FAILED_DO_NOT_RETRY');
    return { status: 'CREATED', issueNumber: created.number, runId, privatePayloadIncluded: false,
      websiteChanged: false, emailReceiptVerified: false };
  }
  fail('ISSUE_LIST_BOUND_NO_CREATE');
}

async function main() {
  if (process.argv.length !== 2 || process.env.GITHUB_REPOSITORY !== WEATHER_FAILURE_REPOSITORY
    || process.env.GITHUB_REF !== 'refs/heads/main' || !process.env.GITHUB_TOKEN) fail('ENVIRONMENT_REJECTED');
  const event = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const automated = process.env.GITHUB_EVENT_NAME === 'workflow_run';
  if (!automated && process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch') fail('EVENT_REJECTED');
  if (automated && event.action !== 'completed') fail('EVENT_REJECTED');
  const rawId = automated ? event.workflow_run?.id : process.env.FAILED_RUN_ID;
  if (!/^\d+$/.test(String(rawId ?? ''))) fail('ARGUMENT_REJECTED');
  const api = async (route, body) => {
    const response = await fetch(`https://api.github.com${route}`, {
      method: body === undefined ? 'GET' : 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) fail('API_REQUEST_FAILED');
    return response.status === 204 ? null : response.json();
  };
  const result = await notifyWeatherFailure({ runId: Number(rawId),
    eventAttempt: automated ? event.workflow_run?.run_attempt : null, sourceHead: process.env.GITHUB_SHA,
    get: route => api(route), post: (route, body) => api(route, body) });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error?.alertCode ?? 'WEATHER_FAILURE_ALERT_UNAVAILABLE'); process.exitCode = 1; });
}
