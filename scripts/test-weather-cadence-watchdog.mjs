import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { assessWeatherCadenceWatchdog } from './check-weather-cadence-watchdog.mjs';
import { readWeatherCadenceGithub } from './read-weather-cadence-github.mjs';
import { notifyWeatherFailure, weatherFailureIssue, WEATHER_FAILURE_REPOSITORY,
  WEATHER_FAILURE_OWNER } from './notify-weather-failure.mjs';

const at = value => Date.parse(value);
const run = (created, updated = created, status = 'completed', branch = 'main', conclusion = 'success') => ({
  head_branch: branch,
  status,
  conclusion: status === 'completed' ? conclusion : null,
  created_at: created,
  updated_at: updated,
  run_attempt: 1,
  run_started_at: created,
});
const old = run('2026-09-27T20:25:00Z', '2026-09-27T23:03:00Z');
const inertLegacy = [
  { id: 34868901509, at: '2026-09-14T16:29:10Z', sha: 'c4930944a6273c00f201994504e3971ad3f2b165' },
  { id: 34613079069, at: '2026-09-11T14:55:55Z', sha: '5587001b45ffea056addaf6cd20084719540336a' },
  { id: 34228112413, at: '2026-09-08T12:47:45Z', sha: 'b814b525962514a368536f456477881390d6b333' },
].map(({ id, at: time, sha }) => ({
  ...run(time, time, 'queued'), id, run_attempt: 1,
  event: 'workflow_dispatch', head_sha: sha,
}));
const base = {
  normalRuns: { workflow_runs: [old, ...inertLegacy] },
  manualRuns: { workflow_runs: [old] },
  nowMs: at('2026-09-28T00:19:00Z'),
};
const check = overrides => assessWeatherCadenceWatchdog({ ...base, ...overrides });

assert.deepEqual(check({}), {
  dispatch: true,
  reason: 'external-four-hour-weather-slot-ready',
  slotAt: '2026-09-28T00:17:00.000Z',
});
for (const legacy of inertLegacy) {
  assert.equal(check({ normalRuns: { workflow_runs: [old, legacy] } }).dispatch, true,
    'Only the exact verified inert legacy queue may be ignored');
  for (const changed of [
    { ...legacy, id: legacy.id + 1 },
    { ...legacy, run_attempt: 2 },
    { ...legacy, event: 'schedule' },
    { ...legacy, status: 'in_progress' },
    { ...legacy, created_at: new Date(Date.parse(legacy.created_at) - 1000).toISOString() },
    { ...legacy, updated_at: '2026-09-28T00:18:00Z' },
    { ...legacy, head_sha: 'a'.repeat(40) },
  ]) assert.equal(check({ normalRuns: { workflow_runs: [old, changed] } }).reason,
    'weather-run-active-or-queued', 'A changed or unknown queued run must block dispatch');
}
assert.equal(check({ nowMs: at('2026-09-28T00:17:59Z') }).reason, 'before-external-cadence-window');
assert.equal(check({ nowMs: at('2026-09-28T01:47:00Z') }).reason, 'external-cadence-window-expired');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:30Z')] } }).reason,
'weather-run-already-started-in-slot');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:30Z')] } }).dispatch, false);
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:30Z')] } }).dispatch, false);
// A later GitHub attempt retains the original created_at. The actual latest
// attempt, including a failed one, must still occupy its start slot.
for (const entrance of ['normalRuns', 'manualRuns']) {
  for (const conclusion of ['success', 'failure', 'cancelled']) {
    const retried = { ...run('2026-09-27T20:25:00Z', '2026-09-28T00:18:59Z',
      'completed', 'main', conclusion), run_attempt: 2, run_started_at: '2026-09-28T00:18:00Z' };
    assert.equal(check({ [entrance]: { workflow_runs: [old, retried] } }).reason,
      'weather-run-already-started-in-slot', `${entrance}: latest attempt counts, not original creation`);
    const previousSlot = { ...retried, run_started_at: '2026-09-27T23:00:00Z' };
    assert.equal(check({ [entrance]: { workflow_runs: [old, previousSlot] } }).dispatch, true,
      'Completion in this slot does not move a previous-slot attempt into it');
  }
}
const latestAttempt = { ...run('2026-09-27T20:25:00Z', '2026-09-28T00:18:59Z'),
  run_attempt: 2, run_started_at: '2026-09-28T00:18:00Z' };
for (const fields of [
  { run_attempt: undefined }, { run_attempt: 0 }, { run_attempt: 1.5 }, { run_attempt: '2' },
  { run_started_at: undefined }, { run_started_at: null }, { run_started_at: 'bad' },
  { run_started_at: '2026-09-27T20:24:59Z' },
  { run_started_at: '2026-09-28T00:19:00Z' },
]) assert.throws(() => check({ manualRuns: { workflow_runs: [old, { ...latestAttempt, ...fields }] } }),
  /malformed/, 'Unknown or contradictory attempt timing must not authorize dispatch');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:18:00Z', '2026-09-28T00:18:59Z', 'completed', 'main', 'failure')] } }).dispatch, false,
  'A failed normal attempt is still an attempt; never blindly retry it');
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-27T22:00:00Z', '2026-09-27T22:00:00Z', 'queued')] } }).reason,
'weather-run-active-or-queued');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-27T23:00:00Z', '2026-09-28T00:18:00Z', 'completed', 'main', 'failure')] } }).reason,
'external-four-hour-weather-slot-ready');
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-27T23:00:00Z', '2026-09-28T00:18:00Z')] } }).dispatch, true,
  'A completed previous-slot run must not block the new slot even if it finished late');
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-27T23:10:00Z', '2026-09-27T23:40:00Z', 'completed', 'main', 'failure')] } }).reason,
'external-four-hour-weather-slot-ready');
assert.equal(check({ manualRuns: { workflow_runs: [old,
  run('2026-09-27T23:10:00Z', '2026-09-27T23:40:00Z', 'completed', 'main', 'failure'),
  run('2026-09-27T23:45:00Z', '2026-09-28T00:05:00Z')] } }).dispatch, true);
assert.equal(check({ normalRuns: { workflow_runs: [old,
  run('2026-09-28T00:30:00Z', '2026-09-28T00:30:00Z', 'completed', 'feature/test')] } }).dispatch, true);
assert.equal(check({ nowMs: at('2026-09-28T04:19:00Z') }).slotAt,
  '2026-09-28T04:17:00.000Z');
assert.equal(check({ nowMs: at('2026-09-28T23:00:00Z') }).slotAt,
  '2026-09-28T20:17:00.000Z');
assert.throws(() => check({ normalRuns: { workflow_runs: null } }), /unavailable/);
assert.throws(() => check({ normalRuns: { workflow_runs: [
  { ...old, updated_at: 'bad' },
] } }), /malformed/);
assert.throws(() => check({ manualRuns: { workflow_runs: [] } }), /No verified/);
assert.throws(() => check({ normalRuns: { workflow_runs: [{ ...old, conclusion: null }] } }), /malformed/);

const workflow = await fs.readFile('.github/workflows/watch-missed-weather-schedule.yml', 'utf8');
assert.doesNotMatch(workflow, /\bschedule:\s*\n/);
assert.match(workflow, /needs\.inspect\.outputs\.dispatch == 'true' && steps\.recheck\.outputs\.dispatch == 'true'/);
assert.match(workflow, /inputs\.external_watchdog == true/);
assert.match(workflow, /run-current-weather-once\.yml\/dispatches/);
assert.match(workflow, /inputs\[quick_confirmation\]=false/);
const cadenceReader = await fs.readFile('scripts/read-weather-cadence-github.mjs', 'utf8');
assert.match(cadenceReader, /run-current-weather-once\.yml\/runs\?per_page=100/);
assert.equal((workflow.match(/node scripts\/check-weather-cadence-watchdog\.mjs/g) || []).length, 2);
assert.doesNotMatch(workflow, /retry-failed-production|external_watchdog=true/);
console.log('External four-hour weather cadence: one run per slot and fail-closed guards passed.');

const readCode = code => error => error?.cadenceReadCode === code && error.message === code;
const readOptions = { kind: 'manual', repository: 'owner/repository', token: 'OFFLINE_SYNTHETIC_TOKEN' };
const readResponse = (status, document = { workflow_runs: [old] }) => ({ status, json: async () => document });

test('Cadence metadata retries only 502/503/504 with bounded delays and unchanged GET scope', async () => {
  for (const status of [502, 503, 504]) {
    const calls = [], waits = [];
    const result = await readWeatherCadenceGithub({ ...readOptions,
      request: async (url, options) => {
        calls.push({ url, options });
        return readResponse(calls.length === 1 ? status : 200);
      }, wait: async ms => { waits.push(ms); } });
    assert.deepEqual(result, { workflow_runs: [old] });
    assert.equal(calls.length, 2);
    assert.deepEqual(waits, [1000]);
    for (const { url, options } of calls) {
      assert.equal(url, 'https://api.github.com/repos/owner/repository/actions/workflows/run-current-weather-once.yml/runs?per_page=100');
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.cache, 'no-store');
      assert.ok(options.signal instanceof AbortSignal);
      assert.equal(options.headers['X-GitHub-Api-Version'], '2022-11-28');
    }
  }
  let calls = 0;
  const waits = [];
  await assert.rejects(readWeatherCadenceGithub({ ...readOptions,
    request: async () => { calls++; return readResponse(502); }, wait: async ms => { waits.push(ms); } }),
  readCode('WEATHER_CADENCE_READ_RETRY_EXHAUSTED'));
  assert.equal(calls, 3);
  assert.deepEqual(waits, [1000, 2000]);
  assert.match(cadenceReader, /AbortSignal\.timeout\(10_000\)/);
  assert.ok(5 * (3 * 10 + (1000 + 2000) / 1000) + 20 < 5 * 60);
});

test('Cadence auth, unknown HTTP/JSON/metadata and other network errors never retry', async () => {
  for (const [request, code] of [
    [async () => readResponse(401), 'WEATHER_CADENCE_READ_AUTH_REJECTED'],
    [async () => readResponse(403), 'WEATHER_CADENCE_READ_AUTH_REJECTED'],
    [async () => readResponse(429), 'WEATHER_CADENCE_READ_HTTP_REJECTED'],
    [async () => readResponse(500), 'WEATHER_CADENCE_READ_HTTP_REJECTED'],
    [async () => ({ status: 200, json: async () => { throw Error('PRIVATE_RESPONSE_CANARY'); } }), 'WEATHER_CADENCE_READ_JSON_REJECTED'],
    [async () => readResponse(200, null), 'WEATHER_CADENCE_READ_METADATA_REJECTED'],
    [async () => readResponse(200, { workflow_runs: null }), 'WEATHER_CADENCE_READ_METADATA_REJECTED'],
    [async () => { throw Error('PRIVATE_RESPONSE_CANARY'); }, 'WEATHER_CADENCE_READ_UNAVAILABLE'],
  ]) {
    let calls = 0;
    await assert.rejects(readWeatherCadenceGithub({ ...readOptions,
      request: (...args) => { calls++; return request(...args); },
      wait: async () => assert.fail('Rejected metadata must not wait') }), readCode(code));
    assert.equal(calls, 1, code);
  }
  await assert.rejects(readWeatherCadenceGithub({ ...readOptions, kind: 'workflow',
    request: async () => readResponse(200, { state: 'disabled_manually' }),
    wait: async () => assert.fail('Inactive workflow must not wait') }), readCode('WEATHER_CADENCE_READ_METADATA_REJECTED'));
  for (const kind of ['dispatches', '__proto__', 'https://example.invalid']) {
    await assert.rejects(readWeatherCadenceGithub({ ...readOptions, kind,
      request: async () => assert.fail('Unknown route must not request') }), readCode('WEATHER_CADENCE_READ_ARGUMENT_REJECTED'));
  }
});

test('Only the adapter own read timeout permits retry; exhaustion remains bounded', async () => {
  const originalTimeout = AbortSignal.timeout;
  AbortSignal.timeout = milliseconds => {
    assert.equal(milliseconds, 10_000);
    return AbortSignal.abort(new DOMException('OFFLINE_TIMEOUT_CANARY', 'TimeoutError'));
  };
  try {
    let calls = 0;
    const waits = [];
    await assert.rejects(readWeatherCadenceGithub({ ...readOptions,
      request: async (_url, { signal }) => { calls++; throw signal.reason; },
      wait: async ms => { waits.push(ms); } }), readCode('WEATHER_CADENCE_READ_RETRY_EXHAUSTED'));
    assert.equal(calls, 3);
    assert.deepEqual(waits, [1000, 2000]);
    await assert.rejects(readWeatherCadenceGithub({ ...readOptions,
      request: async () => { throw Error('FOREIGN_ERROR_AFTER_OWN_TIMEOUT'); },
      wait: async () => assert.fail('A coincident timeout must not relabel an unrelated error') }),
    readCode('WEATHER_CADENCE_READ_UNAVAILABLE'));
  } finally { AbortSignal.timeout = originalTimeout; }
  let calls = 0;
  await assert.rejects(readWeatherCadenceGithub({ ...readOptions,
    request: async () => { calls++; throw new DOMException('OFFLINE_ABORT_CANARY', 'AbortError'); },
    wait: async () => assert.fail('Foreign abort must not retry') }), readCode('WEATHER_CADENCE_READ_UNAVAILABLE'));
  assert.equal(calls, 1);
});

test('Actual cadence reader CLI emits one JSON document or a fixed private-safe error', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cadence-read-'));
  const hookFile = path.join(directory, 'offline-hook.mjs'), callsFile = path.join(directory, 'calls.json');
  await fs.writeFile(hookFile, `
import fs from 'node:fs';
let calls=0,waits=[];
const timer=globalThis.setTimeout;
globalThis.setTimeout=(cb,ms,...args)=>{if(ms===1000||ms===2000){waits.push(ms);queueMicrotask(()=>cb(...args));return 0;}return timer(cb,ms,...args);};
globalThis.fetch=async (url,options)=>{
  calls++;
  if(options.method!=='GET'||!String(url).startsWith('https://api.github.com/repos/owner/repository/actions/workflows/'))throw Error('PRIVATE_RESPONSE_CANARY');
  if(process.env.RR_CADENCE_CASE==='persistent')return new Response('PRIVATE_RESPONSE_CANARY',{status:502});
  if(process.env.RR_CADENCE_CASE==='auth')return new Response('PRIVATE_RESPONSE_CANARY',{status:403});
  if(process.env.RR_CADENCE_CASE==='malformed')return new Response('PRIVATE_RESPONSE_CANARY',{status:200});
  if(calls===1)return new Response('PRIVATE_RESPONSE_CANARY',{status:502});
  return new Response(JSON.stringify({workflow_runs:[]}),{status:200});
};
process.on('exit',()=>fs.writeFileSync(process.env.RR_CADENCE_CALLS,JSON.stringify({calls,waits})));
`);
  try {
    for (const [scenario, status, count, code] of [
      ['success', 0, 2, null], ['persistent', 1, 3, 'WEATHER_CADENCE_READ_RETRY_EXHAUSTED'],
      ['auth', 1, 1, 'WEATHER_CADENCE_READ_AUTH_REJECTED'], ['malformed', 1, 1, 'WEATHER_CADENCE_READ_JSON_REJECTED'],
    ]) {
      const result = spawnSync(process.execPath, ['--import', pathToFileURL(hookFile).href,
        'scripts/read-weather-cadence-github.mjs', 'manual'], { encoding: 'utf8', timeout: 3000,
        env: { ...process.env, GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'owner/repository',
          GH_TOKEN: 'OFFLINE_SYNTHETIC_TOKEN', RR_CADENCE_CASE: scenario, RR_CADENCE_CALLS: callsFile } });
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      assert.equal(result.status, status);
      assert.equal((result.stdout + result.stderr).includes('PRIVATE_RESPONSE_CANARY'), false);
      assert.equal(JSON.parse(await fs.readFile(callsFile, 'utf8')).calls, count);
      if (status === 0) { assert.deepEqual(JSON.parse(result.stdout), { workflow_runs: [] }); assert.equal(result.stderr, ''); }
      else { assert.equal(result.stdout, ''); assert.equal(result.stderr.trim(), code); }
    }
  } finally {
    for (const file of [hookFile, callsFile]) await fs.unlink(file);
    await fs.rmdir(directory);
  }
});

test('Cadence workflow retains both fresh gates and exactly one bounded POST without retry', () => {
  assert.equal((workflow.match(/node scripts\/read-weather-cadence-github\.mjs workflow/g) || []).length, 1);
  for (const kind of ['normal', 'manual']) assert.equal((workflow.match(new RegExp('node scripts/read-weather-cadence-github\\.mjs ' + kind, 'g')) || []).length, 2);
  assert.match(workflow, /default: false\s+type: boolean/);
  assert.match(workflow, /timeout-minutes: 5/);
  assert.match(workflow, /test "\$GITHUB_REF" = refs\/heads\/main/);
  const post = workflow.slice(workflow.indexOf('      - name: Dispatch one ordinary current-weather run'));
  assert.equal((post.match(/gh api --method POST/g) || []).length, 1);
  assert.match(post, /timeout --signal=KILL 20s gh api --method POST/);
  assert.match(post, /> \/dev\/null 2>&1; then/);
  assert.match(post, /WEATHER_CADENCE_DISPATCH_OUTCOME_UNKNOWN_DO_NOT_RETRY/);
  assert.doesNotMatch(post, /\b(?:for|while|until)\b|--retry/);
});

// Linux must execute the actual workflow blocks. Missing Bash/timeout is a
// failure there; Windows has no owned Bash runtime and reports this as pending.
test('Actual Bash caller retries reads but never repeats an uncertain dispatch', {
  skip: process.platform === 'win32' ? 'PENDING: actual Bash blocks require Linux CI' : false,
}, async () => {
  for (const command of ['bash', 'timeout']) {
    const probe = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 3000 });
    assert.equal(probe.error, undefined, `${command} is mandatory on Linux`);
    assert.equal(probe.status, 0);
  }
  const blocks = [...workflow.matchAll(/^        run: \|\r?\n((?:          [^\n]*(?:\n|$)|\r?\n)+)/gm)]
    .map(match => match[1].split(/\r?\n/).map(line => line.startsWith('          ') ? line.slice(10) : line).join('\n').trimEnd());
  const cadenceBlocks = blocks.filter(block => /read-weather-cadence-github\.mjs workflow/.test(block)
    || /normal-runs-recheck\.json/.test(block) || /gh api --method POST/.test(block));
  assert.equal(cadenceBlocks.length, 3);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-cadence-bash-'));
  const hook = path.join(dir, 'hook.mjs'), gh = path.join(dir, 'gh');
  const calls = path.join(dir, 'calls.jsonl'), writes = path.join(dir, 'writes.jsonl');
  const output = path.join(dir, 'output'), summary = path.join(dir, 'summary');
  const owned = [hook, gh, calls, writes, output, summary,
    ...['normal-runs.json', 'manual-runs.json', 'normal-runs-recheck.json', 'manual-runs-recheck.json'].map(f => path.join(dir, f))];
  await fs.writeFile(hook, String.raw`
import fs from 'node:fs';
import path from 'node:path';
const file=path.basename(process.argv[1]||'');
Date.now=()=>${base.nowMs};
const old=${JSON.stringify(old)};
const timer=globalThis.setTimeout;
globalThis.setTimeout=(cb,ms,...args)=>{if(ms===1000||ms===2000){queueMicrotask(()=>cb(...args));return 0;}return timer(cb,ms,...args);};
let attempts=0;
globalThis.fetch=async (url,options)=> {
  attempts++;
  const base='https://api.github.com/repos/owner/repository/actions/workflows/';
  if(options.method!=='GET'||!String(url).startsWith(base))throw Error('PRIVATE_FIXTURE_CANARY');
  const suffix=String(url).slice(base.length);
  if(!['run-current-weather-once.yml','update-and-deploy.yml/runs?per_page=100','run-current-weather-once.yml/runs?per_page=100'].includes(suffix))throw Error('PRIVATE_FIXTURE_CANARY');
  const scenario=process.env.RR_CADENCE_CASE,stage=process.env.RR_CADENCE_STAGE;
  fs.appendFileSync(process.env.RR_CADENCE_CALLS,JSON.stringify({file,stage,suffix,attempt:attempts})+'\n');
  if(scenario==='persistent')return new Response('PRIVATE_FIXTURE_CANARY',{status:502});
  if(scenario==='auth')return new Response('PRIVATE_FIXTURE_CANARY',{status:403});
  if(scenario==='transient'&&attempts===1)return new Response('PRIVATE_FIXTURE_CANARY',{status:502});
  if(!suffix.includes('/runs?'))return new Response(JSON.stringify({state:'active'}),{status:200});
  const rows=[old];
  if((scenario==='recheck-active'&&stage==='recheck'||scenario==='first-active')&&suffix.startsWith('run-current'))
    rows.push({...old,status:'in_progress',conclusion:null,created_at:'2026-09-28T00:18:00Z',updated_at:'2026-09-28T00:18:30Z'});
  return new Response(JSON.stringify({workflow_runs:rows}),{status:200});
};
if(file==='check-weather-cadence-watchdog.mjs')
  fs.appendFileSync(process.env.RR_CADENCE_CALLS,JSON.stringify({file,stage:process.env.RR_CADENCE_STAGE})+'\n');
`);
  await fs.writeFile(gh, String.raw`#!/usr/bin/env node
const fs=require('node:fs');
fs.appendFileSync(process.env.RR_CADENCE_WRITES,JSON.stringify(process.argv.slice(2))+'\n');
if(process.env.RR_CADENCE_CASE==='unknown-post'){console.error('PRIVATE_FIXTURE_CANARY');process.exitCode=1;}
`);
  await fs.chmod(gh, 0o700);
  const script = `export RR_CADENCE_STAGE=first\n${cadenceBlocks[0]}
first=$(sed -n 's/^dispatch=//p' "$GITHUB_OUTPUT")
if [ "$first" = true ]; then
  export RR_CADENCE_STAGE=recheck
  : > "$GITHUB_OUTPUT"
${cadenceBlocks[1]}
  second=$(sed -n 's/^dispatch=//p' "$GITHUB_OUTPUT")
  if [ "$second" = true ]; then
${cadenceBlocks[2]}
  fi
fi\n`;
  try {
    for (const [scenario, status, checkCount, writeCount, readCount] of [
      ['transient', 0, 2, 1, 10], ['first-active', 0, 1, 0, 3],
      ['recheck-active', 0, 2, 0, 5], ['persistent', 1, 0, 0, 3],
      ['auth', 1, 0, 0, 1], ['unknown-post', 1, 2, 1, 5],
    ]) {
      for (const file of [calls, writes, output, summary]) await fs.writeFile(file, '');
      const result = spawnSync('bash', ['-c', script], { encoding: 'utf8', timeout: 10_000,
        env: { ...process.env, NODE_OPTIONS: `--import=${pathToFileURL(hook).href}`,
          PATH: dir + path.delimiter + path.dirname(process.execPath) + path.delimiter + process.env.PATH,
          GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'owner/repository',
          GH_TOKEN: 'OFFLINE_SYNTHETIC_TOKEN', RUNNER_TEMP: dir,
          GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: summary,
          RR_CADENCE_CASE: scenario, RR_CADENCE_CALLS: calls, RR_CADENCE_WRITES: writes } });
      assert.equal(result.error, undefined, scenario);
      assert.equal(result.signal, null, scenario);
      assert.equal(result.status, status, scenario);
      assert.equal((result.stdout + result.stderr).includes('PRIVATE_FIXTURE_CANARY'), false);
      const rows = (await fs.readFile(calls, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
      const actualChecks = rows.filter(row => row.file === 'check-weather-cadence-watchdog.mjs');
      const actualWrites = (await fs.readFile(writes, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
      assert.equal(actualChecks.length, checkCount, scenario);
      assert.equal(rows.filter(row => row.file === 'read-weather-cadence-github.mjs').length, readCount, scenario);
      assert.equal(actualWrites.length, writeCount, scenario);
      if (checkCount === 2) assert.deepEqual(actualChecks.map(row => row.stage), ['first', 'recheck']);
      if (writeCount) assert.deepEqual(actualWrites[0], ['api', '--method', 'POST', '-H',
        'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28',
        'repos/owner/repository/actions/workflows/run-current-weather-once.yml/dispatches',
        '-f', 'ref=main', '-F', 'inputs[quick_confirmation]=false']);
      if (scenario === 'unknown-post') assert.match(result.stderr, /WEATHER_CADENCE_DISPATCH_OUTCOME_UNKNOWN_DO_NOT_RETRY/);
    }
  } finally {
    for (const file of owned) await fs.unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    await fs.rmdir(dir);
  }
});

// Exercise the actual owner-alert caller with a bounded, network-free API seam.
// Fixtures are synthetic metadata, never production logs or weather payloads.
const alertHead = 'a'.repeat(40);
const alertBase = `/repos/${WEATHER_FAILURE_REPOSITORY}`;
const alertRun = {
  id: 123, run_attempt: 1, head_branch: 'main', head_sha: 'b'.repeat(40),
  path: '.github/workflows/run-current-weather-once.yml', event: 'workflow_dispatch',
  status: 'completed', conclusion: 'failure',
  repository: { id: 1306858343, full_name: WEATHER_FAILURE_REPOSITORY },
  head_repository: { id: 1306858343, full_name: WEATHER_FAILURE_REPOSITORY },
  html_url: `https://github.com/${WEATHER_FAILURE_REPOSITORY}/actions/runs/123`,
};
function alertApi({ candidate = alertRun, renewed = candidate, rows = [],
  mainHeads = [alertHead, alertHead], createError = false, createdFields = {},
  verifiedFields = {} } = {}) {
  const calls = [];
  let reads = 0, heads = 0;
  const issue = weatherFailureIssue(alertRun);
  const saved = { ...issue, number: 7, user: { login: 'github-actions[bot]' },
    assignees: [{ login: WEATHER_FAILURE_OWNER }] };
  const get = async route => {
    calls.push({ method: 'GET', route });
    if (route === alertBase) return { id: 1306858343, full_name: WEATHER_FAILURE_REPOSITORY,
      default_branch: 'main', has_issues: true };
    if (route === `${alertBase}/git/ref/heads/main`) return { object: { sha: mainHeads[heads++] } };
    if (route === `${alertBase}/actions/runs/123`) return structuredClone(reads++ ? renewed : candidate);
    if (route.startsWith(`${alertBase}/issues?`)) return structuredClone(rows);
    if (route === `${alertBase}/assignees/${WEATHER_FAILURE_OWNER}`) return null;
    if (route === `${alertBase}/issues/7`) return { ...saved, ...verifiedFields };
    assert.fail(`Unexpected metadata route: ${route}`);
  };
  const post = async (route, body) => {
    calls.push({ method: 'POST', route, body: structuredClone(body) });
    assert.equal(route, `${alertBase}/issues`);
    assert.deepEqual(body, issue);
    if (createError) throw new Error('SYNTHETIC_PRIVATE_ERROR_MUST_NOT_ESCAPE');
    return { ...saved, ...createdFields };
  };
  return { calls, get, post, invoke: () => notifyWeatherFailure({ runId: 123,
    eventAttempt: 1, sourceHead: alertHead, get, post }) };
}
const alertCode = code => error => error?.alertCode === code && error.message === code;
const writes = api => api.calls.filter(call => call.method === 'POST');

test('Owner alert emits only the approved fixed link/status and assignment', () => {
  const canary = 'SYNTHETIC_PRIVATE_PAYLOAD_MUST_NOT_ESCAPE';
  const candidate = { ...alertRun, display_title: canary, name: canary,
    actor: { login: canary }, triggering_actor: { login: canary }, error: canary };
  for (const conclusion of ['failure', 'timed_out', 'startup_failure']) {
    const issue = weatherFailureIssue({ ...candidate, conclusion });
    assert.deepEqual(Object.keys(issue), ['title', 'body', 'assignees']);
    assert.deepEqual(issue.assignees, [WEATHER_FAILURE_OWNER]);
    assert.equal(issue.body, `Vejrhentning: ${alertRun.html_url}\n\nStatus: ${conclusion}\n\n<!-- ravradar-weather-failure:123 -->`);
    assert.equal(JSON.stringify(issue).includes(canary), false);
  }
  for (const fields of [{ status: 'in_progress', conclusion: null },
    { conclusion: 'success' }, { conclusion: 'cancelled' }, { conclusion: 'skipped' }]) {
    assert.equal(weatherFailureIssue({ ...alertRun, ...fields }), null);
  }
});

test('Owner alert rejects other repositories, forks, workflows and untrusted identities', () => {
  for (const fields of [{ id: 0 }, { id: '123' }, { run_attempt: 1.5 },
    { repository: { ...alertRun.repository, id: 1 } },
    { head_repository: { ...alertRun.head_repository, full_name: 'other/RavRadar' } },
    { head_branch: 'feature' }, { event: 'pull_request' }, { head_sha: 'bad' },
    { path: '.github/workflows/update-weather.yml' }]) {
    assert.throws(() => weatherFailureIssue({ ...alertRun, ...fields }), alertCode('RUN_SCOPE_REJECTED'));
  }
  assert.throws(() => weatherFailureIssue({ ...alertRun, html_url: 'https://example.invalid/private' }),
    alertCode('RUN_URL_REJECTED'));
});

test('Owner alert makes one metadata-only write and verifies persisted assignment', async () => {
  const api = alertApi();
  assert.deepEqual(await api.invoke(), { status: 'CREATED', issueNumber: 7, runId: 123,
    privatePayloadIncluded: false, websiteChanged: false, emailReceiptVerified: false });
  assert.equal(writes(api).length, 1);
  assert.equal(api.calls.at(-1).route, `${alertBase}/issues/7`);
  assert.equal(api.calls.some(call => /logs|artifacts|caches|dispatches|contents/.test(call.route)), false);
});

test('Closed assigned owner alert is deduplicated; old attempt and success never write', async () => {
  const issue = weatherFailureIssue(alertRun);
  const api = alertApi({ rows: [{ ...issue, number: 9, state: 'closed',
    user: { login: 'github-actions[bot]' }, assignees: [{ login: WEATHER_FAILURE_OWNER }] }] });
  assert.deepEqual(await api.invoke(), { status: 'EXISTING', issueNumber: 9, runId: 123,
    privatePayloadIncluded: false });
  assert.equal(writes(api).length, 0);
  for (const [candidate, reason] of [[{ ...alertRun, run_attempt: 2 }, 'ATTEMPT_SUPERSEDED'],
    [{ ...alertRun, conclusion: 'success' }, 'NOT_COMPLETED_FAILURE']]) {
    const skipped = alertApi({ candidate });
    assert.deepEqual(await skipped.invoke(), { status: 'SKIPPED', reason });
    assert.equal(writes(skipped).length, 0);
  }
});

test('Changed live run/main and bounded incomplete issue inventory fail before create', async () => {
  for (const [settings, code] of [
    [{ renewed: { ...alertRun, run_attempt: 2 } }, 'RUN_CHANGED_BEFORE_CREATE'],
    [{ renewed: { ...alertRun, conclusion: 'success' } }, 'RUN_CHANGED_BEFORE_CREATE'],
    [{ mainHeads: [alertHead, 'c'.repeat(40)] }, 'SOURCE_HEAD_CHANGED'],
    [{ rows: Array.from({ length: 100 }, (_, index) => ({ number: index + 1, title: 'other' })) },
      'ISSUE_LIST_BOUND_NO_CREATE'],
  ]) {
    const api = alertApi(settings);
    await assert.rejects(api.invoke(), alertCode(code));
    assert.equal(writes(api).length, 0);
    if (code === 'ISSUE_LIST_BOUND_NO_CREATE') {
      assert.equal(api.calls.filter(call => call.route.startsWith(`${alertBase}/issues?`)).length, 100);
    }
  }
});

test('Unknown create outcome or failed readback never retries or echoes the primary error', async () => {
  for (const [settings, code] of [
    [{ createError: true }, 'ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY'],
    [{ createdFields: { assignees: [] } }, 'ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY'],
    [{ verifiedFields: { assignees: [] } }, 'ISSUE_VERIFY_FAILED_DO_NOT_RETRY'],
    [{ verifiedFields: { pull_request: {} } }, 'ISSUE_VERIFY_FAILED_DO_NOT_RETRY'],
  ]) {
    const api = alertApi(settings);
    await assert.rejects(api.invoke(), alertCode(code));
    assert.equal(writes(api).length, 1);
  }
  const api = alertApi({ rows: [{ ...weatherFailureIssue(alertRun), number: 9,
    user: { login: 'github-actions[bot]' }, assignees: [] }] });
  await assert.rejects(api.invoke(), alertCode('EXISTING_ISSUE_NOT_ASSIGNED'));
  assert.equal(writes(api).length, 0);
});

test('Owner alarm workflow uses default-branch code without production writes or website messages', async () => {
  const alarm = await fs.readFile('.github/workflows/notify-weather-failure.yml', 'utf8');
  assert.match(alarm, /workflows: \[Run current RavRadar weather once\]/);
  assert.match(alarm, /types: \[completed\]/);
  assert.match(alarm, /contents: read\s+actions: read\s+issues: write/);
  assert.match(alarm, /group: ravradar-weather-failure-owner-alert\s+queue: max\s+cancel-in-progress: false/);
  assert.match(alarm, /ref: \$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(alarm, /workflow_run\.head_sha|secrets\.|upload-artifact|download-artifact|weather-production|update-dmi|supabase|deploy-pages|send-mail|smtp/i);
  assert.equal((alarm.match(/run: node scripts\/notify-weather-failure\.mjs/g) || []).length, 1);
});

test('Bot-started ordinary failure explicitly dispatches the existing alert, without a weather retry', async () => {
  const caller = await fs.readFile('.github/workflows/run-current-weather-once.yml', 'utf8');
  const alarm = await fs.readFile('.github/workflows/notify-weather-failure.yml', 'utf8');
  const tail = caller.slice(caller.indexOf('\n  notify-owner-failure:'));
  assert.ok(caller.includes('\n  notify-owner-failure:'), 'A workflow_run event alone is not a bot-started failure handoff.');
  assert.match(tail, /needs: terminal-outcome/);
  assert.match(tail, /always\(\).*?!cancelled\(\)/s);
  assert.match(tail, /github\.actor == 'github-actions\[bot\]'/);
  assert.match(tail, /needs\.terminal-outcome\.result == 'failure'/);
  assert.match(tail, /github\.repository == 'jakobjorgensen82-commits\/RavRadar'/);
  assert.match(tail, /github\.ref == 'refs\/heads\/main'/);
  assert.match(tail, /timeout-minutes: 2/);
  assert.match(tail, /actions: write/);
  assert.doesNotMatch(tail, /issues: write|secrets\.|update-dmi|supabase|deploy-pages|providers|force=true/);
  assert.equal((tail.match(/gh api --method POST/g) || []).length, 1);
  assert.match(tail, /notify-weather-failure\.yml\/dispatches/);
  assert.match(tail, /inputs\[source_run_attempt\]/);
  assert.match(tail, /inputs\[wait_for_completion\]=true/);
  assert.match(tail, /DISPATCH_OUTCOME_UNKNOWN_DO_NOT_RETRY/);
  assert.doesNotMatch(tail, /for |while |workflow run|run-current-weather-once\.yml\/dispatches/);
  assert.doesNotMatch(alarm, /workflow_run\.actor\.login/, 'Keep the existing bot completion event as a safety path.');
  assert.match(alarm, /WAIT_FOR_COMPLETION: \$\{\{ inputs\.wait_for_completion \}\}/);
  assert.match(alarm, /SOURCE_RUN_ATTEMPT: \$\{\{ inputs\.source_run_attempt \}\}/);
});

test('Explicit alert waits for the exact attempt to complete before the normal one-write boundary', async () => {
  const api = alertApi();
  let observations = 0, waits = 0;
  const get = async route => {
    if (route === `${alertBase}/actions/runs/123` && observations++ < 2) {
      return { ...alertRun, status: 'in_progress', conclusion: null };
    }
    return api.get(route);
  };
  const result = await notifyWeatherFailure({ runId: 123, eventAttempt: 1,
    sourceHead: alertHead, get, post: api.post, waitForCompletion: true,
    wait: async milliseconds => {
      assert.equal(milliseconds, 5000);
      assert.equal(writes(api).length, 0, 'Never create an issue while the run is active.');
      waits++;
    } });
  assert.equal(result.status, 'CREATED');
  assert.equal(waits, 2);
  assert.equal(writes(api).length, 1);
  assert.equal(api.calls.at(-1).route, `${alertBase}/issues/7`);
});

test('Completion wait is bounded and never turns unknown status, scope or changed attempt into a write', async () => {
  for (const [changed, code, reason] of [
    [{ status: 'in_progress', conclusion: null }, 'RUN_COMPLETION_NOT_OBSERVED', null],
    [{ status: 'unknown', conclusion: null }, 'RUN_WAIT_STATUS_REJECTED', null],
    [{ id: 124 }, 'RUN_ID_REJECTED', null],
    [{ path: '.github/workflows/update-and-deploy.yml' }, 'RUN_SCOPE_REJECTED', null],
    [{ html_url: 'https://example.invalid/private' }, 'RUN_URL_REJECTED', null],
    [{ run_attempt: 2 }, null, 'ATTEMPT_SUPERSEDED'],
    [{ conclusion: 'success' }, null, 'NOT_COMPLETED_FAILURE'],
  ]) {
    const api = alertApi();
    let reads = 0, waits = 0;
    const promise = notifyWeatherFailure({ runId: 123, eventAttempt: 1,
      sourceHead: alertHead, post: api.post, waitForCompletion: true,
      wait: async milliseconds => { assert.equal(milliseconds, 5000); waits++; },
      get: async route => {
        if (route === `${alertBase}/actions/runs/123`) { reads++; return { ...alertRun, ...changed }; }
        return api.get(route);
      } });
    if (code) await assert.rejects(promise, alertCode(code));
    else assert.deepEqual(await promise, { status: 'SKIPPED', reason });
    assert.equal(writes(api).length, 0);
    assert.ok(reads <= 12);
    assert.ok(waits <= 11);
  }
  const api = alertApi();
  await assert.rejects(notifyWeatherFailure({ runId: 123, eventAttempt: null,
    sourceHead: alertHead, get: api.get, post: api.post, waitForCompletion: true,
    wait: async () => assert.fail('Missing attempt may never wait.') }), alertCode('ARGUMENT_REJECTED'));
  assert.equal(writes(api).length, 0);
});

test('Normal owner-alert CLI enforces the handoff inputs and completion gates without network access', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-owner-alert-cli-'));
  const eventFile = path.join(directory, 'event.json');
  const hookFile = path.join(directory, 'offline-hook.mjs');
  // This is a private synthetic transport fixture, never a provider or GitHub
  // request. Fail immediately on any route outside the normal metadata seam.
  await fs.writeFile(hookFile, `
import assert from 'node:assert/strict';
const base = ${JSON.stringify(alertBase)}, head = ${JSON.stringify(alertHead)};
const original = ${JSON.stringify(alertRun)};
const issue = ${JSON.stringify(weatherFailureIssue(alertRun))};
const stored = {...issue, number:7, user:{login:'github-actions[bot]'},
  assignees:[{login:${JSON.stringify(WEATHER_FAILURE_OWNER)}}]};
let reads=0,writes=0,waits=0,calls=0;
const timer=globalThis.setTimeout;
globalThis.setTimeout=(callback,milliseconds,...args)=> {
  if(milliseconds!==5000)return timer(callback,milliseconds,...args);
  waits++;queueMicrotask(()=>callback(...args));return 0;
};
globalThis.fetch=async (url,options={})=> {
  calls++;
  assert.equal(new URL(url).origin,'https://api.github.com');
  const route=new URL(url).pathname+new URL(url).search;
  let body;
  if(options.method==='POST') {
    assert.equal(route,base+'/issues');
    assert.ok(reads>=(process.env.RR_ALERT_FIXTURE.startsWith('bot-event')?2:3),
      'No issue before actual completion observation and immediate recheck.');
    assert.deepEqual(JSON.parse(options.body),issue);
    assert.equal(writes++,0,'No repeated create.');
    if(process.env.RR_ALERT_FIXTURE==='unknown-write')throw new Error('PRIVATE_FIXTURE_CANARY');
    body=stored;
  } else if(route===base)body={id:1306858343,full_name:${JSON.stringify(WEATHER_FAILURE_REPOSITORY)},
    default_branch:'main',has_issues:true};
  else if(route===base+'/git/ref/heads/main')body={object:{sha:head}};
  else if(route===base+'/actions/runs/123') {
    reads++;body=reads<3&&!process.env.RR_ALERT_FIXTURE.startsWith('bot-event')
      ?{...original,status:'in_progress',conclusion:null}
      :{...original,conclusion:process.env.RR_ALERT_FIXTURE==='success'?'success':'failure'};
  } else if(route.startsWith(base+'/issues?'))body=process.env.RR_ALERT_FIXTURE==='bot-event-existing'?[stored]:[];
  else if(route===base+'/assignees/'+${JSON.stringify(WEATHER_FAILURE_OWNER)})return new Response(null,{status:204});
  else if(route===base+'/issues/7')body=stored;
  else throw new Error('PRIVATE_FIXTURE_CANARY');
  return new Response(JSON.stringify(body),{status:200});
};
process.on('exit',()=>console.log(JSON.stringify({offlineFixture:true,calls,reads,writes,waits})));
`);
  try {
    for (const [scenario, fields, expectedStatus, expectedCode, expectedWrites] of [
      ['failure', {}, 0, 'CREATED', 1],
      ['success', {}, 0, 'NOT_COMPLETED_FAILURE', 0],
      ['unknown-write', {}, 1, 'ISSUE_CREATE_OUTCOME_UNKNOWN_DO_NOT_RETRY', 1],
      ['failure', { WAIT_FOR_COMPLETION: 'not-a-boolean' }, 1, 'ARGUMENT_REJECTED', 0],
      ['failure', { SOURCE_RUN_ATTEMPT: '' }, 1, 'ARGUMENT_REJECTED', 0],
      ['failure', { SOURCE_RUN_ATTEMPT: '1.5' }, 1, 'ARGUMENT_REJECTED', 0],
      ['bot-event', { GITHUB_EVENT_NAME: 'workflow_run', WAIT_FOR_COMPLETION: '',
        SOURCE_RUN_ATTEMPT: '' }, 0, 'CREATED', 1],
      ['bot-event-existing', { GITHUB_EVENT_NAME: 'workflow_run', WAIT_FOR_COMPLETION: '',
        SOURCE_RUN_ATTEMPT: '' }, 0, 'EXISTING', 0],
    ]) {
      await fs.writeFile(eventFile, JSON.stringify(scenario.startsWith('bot-event')
        ? {action:'completed',workflow_run:{...alertRun,actor:{login:'github-actions[bot]'}}}:{}));
      const result = spawnSync(process.execPath, ['--import', pathToFileURL(hookFile).href,
        'scripts/notify-weather-failure.mjs'], { encoding:'utf8', timeout:3000,
        env:{...process.env,GITHUB_REPOSITORY:WEATHER_FAILURE_REPOSITORY,GITHUB_REF:'refs/heads/main',
          GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_EVENT_PATH:eventFile,GITHUB_SHA:alertHead,
          GITHUB_TOKEN:'OFFLINE_SYNTHETIC_TOKEN',FAILED_RUN_ID:'123',SOURCE_RUN_ATTEMPT:'1',
          WAIT_FOR_COMPLETION:'true',RR_ALERT_FIXTURE:scenario,...fields} });
      assert.equal(result.error, undefined);
      assert.equal(result.signal, null);
      assert.equal(result.status, expectedStatus, scenario);
      assert.ok((result.stdout+result.stderr).includes(expectedCode), scenario);
      assert.equal((result.stdout+result.stderr).includes('PRIVATE_FIXTURE_CANARY'), false);
      const fixture = result.stdout.trim().split(/\r?\n/).map(line=>JSON.parse(line))
        .find(row=>row.offlineFixture);
      assert.equal(fixture.writes, expectedWrites, scenario);
      assert.ok(fixture.reads<=4);
      if (scenario === 'failure' && expectedStatus === 0) assert.equal(fixture.waits, 2);
      if (scenario.startsWith('bot-event')) {
        assert.equal(fixture.waits, 0, 'A delivered completion event must not need the explicit-handoff wait.');
        assert.ok(fixture.calls > 0, 'Do not discard the existing bot completion path.');
      }
      if (fields.WAIT_FOR_COMPLETION === 'not-a-boolean'
        || !scenario.startsWith('bot-event') && Object.hasOwn(fields,'SOURCE_RUN_ATTEMPT')
          && fields.SOURCE_RUN_ATTEMPT!=='1') {
        assert.equal(fixture.calls, 0, 'Rejected input/event must not even request metadata.');
      }
    }
  } finally {
    // Only these two owned files, after each real child has exited. No recursive
    // deletion, adoption, provider process or production artifact is involved.
    await fs.unlink(eventFile);
    await fs.unlink(hookFile);
    await fs.rmdir(directory);
  }
});


test('Source renewal is a separate bounded source-only job and preserves immutable cache identities',()=>{
  const source=workflow.slice(workflow.indexOf('\n  qualify-source:'),workflow.indexOf('\n  dispatch:'));
  const inspect=workflow.slice(workflow.indexOf('\n  inspect:'),workflow.indexOf('\n  qualify-source:'));
  const dispatch=workflow.slice(workflow.indexOf('\n  dispatch:'));
  assert.match(inspect,/timeout-minutes: 5/);
  assert.doesNotMatch(inspect,/npm run validate:source/);
  assert.match(inspect,/actions\/setup-python@v7\n        with:\n          python-version: \"3\.12\"/);
  assert.match(dispatch,/actions\/setup-python@v7\n        with:\n          python-version: \"3\.12\"/);
  const record=source.slice(source.indexOf('      - name: Record the actual isolated source-step outcome'),
    source.indexOf('      - name: Preserve the isolated source locator'));
  assert.doesNotMatch(record,/GITHUB_TOKEN|GH_TOKEN/);
  assert.doesNotMatch(inspect,/pip install|npm ci/);
  assert.doesNotMatch(dispatch,/pip install|npm ci/);
  assert.match(source,/timeout-minutes: 180/);
  assert.match(source,/name: Qualify exact main source without production/);
  assert.match(source,/name: Run actual exact-main source gate without production/);
  assert.match(source,/npm run validate:source/);
  assert.equal((source.match(/git diff --exit-code HEAD/g)||[]).length,2);
  assert.match(source,/SOURCE_GATE_OUTCOME: \$\{\{ steps\.source-gate\.outcome \}\}/);
  assert.match(source,/weather-source-proof-v2-\$\{\{ runner\.os \}\}-\$\{\{ github\.sha \}\}-\$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}-source-only/);
  assert.doesNotMatch(source,/SUPABASE_|COPERNICUSMARINE_|R2_|update-dmi|deploy-pages|gh api --method POST|cache\/delete|--write/);
  assert.match(dispatch,/timeout-minutes: 5/);
  assert.match(dispatch,/needs: \[inspect, qualify-source\]/);
  assert.match(dispatch,/needs\.qualify-source\.result == 'success'/);
  assert.match(dispatch,/needs\.qualify-source\.result == 'skipped' && needs\.inspect\.outputs\.renew_source == 'false'/);
  assert.match(dispatch,/Reconfirm exact main after any completed source job/);
  assert.match(dispatch,/Reconfirm a reused proof without consuming our own source run/);
  assert.match(dispatch,/if: needs\.inspect\.outputs\.renew_source == 'false'/);
  assert.equal((workflow.match(/gh api --method POST/g)||[]).length,1);
  assert.match(inspect,/REASON: \$\{\{ steps\.source-proof\.outputs\.reason \}\}/);
  assert.match(inspect,/source-proof-renewal-required/);
  assert.match(inspect,/SOURCE_PROOF_UNKNOWN_OR_CONTRADICTORY_NO_DISPATCH/);
  // The existing normal cadence policy must be evaluated at the later time.
  assert.equal(check({nowMs:at('2026-09-28T00:19:00Z')}).dispatch,true);
  assert.equal(check({nowMs:at('2026-09-28T01:47:00Z')}).dispatch,false);
});

test('Actual source-decision Bash accepts only reuse or explicit renewal',{
  skip:process.platform==='win32'?'PENDING: actual Bash block requires Linux CI':false,
},async()=>{
  const start=workflow.indexOf('      - name: Choose real validation only after positive proof absence or expiry');
  const end=workflow.indexOf('\n  qualify-source:',start);
  const block=workflow.slice(start,end).match(/        run: \|\n((?:          [^\n]*(?:\n|$)|\n)+)/)[1]
    .split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'rr-source-decision-'));
  const output=path.join(dir,'output');
  try{
    for(const [required,reason,status,expected]of[
      ['false','verified-exact-main-source-content',0,'renew_source=false\n'],
      ['true','source-proof-renewal-required',0,'renew_source=true\n'],
      ['true','later-source-not-green',1,''],['true','later-source-unresolved',1,''],
      ['true','source-history-inspection-limit',1,''],['true','source-history-limit',1,''],
      ['true','main-source-proof-discovery-unavailable',1,''],['','source-proof-renewal-required',1,''],
    ]){
      await fs.writeFile(output,'');
      const actual=spawnSync('bash',['-c',block],{encoding:'utf8',timeout:3000,
        env:{...process.env,REQUIRED:required,REASON:reason,GITHUB_OUTPUT:output}});
      assert.equal(actual.error,undefined);assert.equal(actual.status,status);
      assert.equal(await fs.readFile(output,'utf8'),expected);
      if(status)assert.match(actual.stderr,/SOURCE_PROOF_UNKNOWN_OR_CONTRADICTORY_NO_DISPATCH/);
    }
  }finally{await fs.unlink(output);await fs.rmdir(dir);}
});
