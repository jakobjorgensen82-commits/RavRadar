// Source-CI only: reuse one independently verified native phase, never a failed
// source gate. Unknown evidence or input/environment drift executes native PG.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const ORIGIN = Object.freeze({
  repository: 'jakobjorgensen82-commits/RavRadar', pullRequest: 671,
  run: 39203570076, attempt: 1, job: 117901472855,
  head: '8b855f63a9cd14f5d197c3b50437a4f8eb85b51e',
  completedAt: '2026-10-19T05:39:40Z',
  logSha256: '0b8db2b3f7d98c5fea621386f8d5a0cfa1428e5a76cc03d09020a6205a7e549d',
});
export const WORKFLOW = '.github/workflows/validate-pull-request.yml';
export const JOB = 'Source validation and release gate';
export const STEP = 'Validate native PostgreSQL checkpoint CAS on artificial data only';
export const COMMANDS = Object.freeze([
  'node scripts/run-frozen-native0600-source-targets.mjs policy',
  'node scripts/test-protected-ravscore-continuation-checkpoint.mjs --native-statistics-revision --native-sampling-identity --current-memory-warmup --established-native-current-origin --last-mile-enclosure',
]);
export const NATIVE_SCRIPT = 'set -euo pipefail\n' + COMMANDS.join('\n') + '\n';

// Explicit CURRENT non-native test consumers only. Historical copies of these
// files are NOT excluded: unchanged frozen loaders read exact old Git blobs.
// Never broaden to test-*.mjs, scripts/lib, docs, versions or migrations.
export const NON_NATIVE_TEST_INPUTS = Object.freeze([
  'scripts/lib/archived-weather-restart-updater-test-input.mjs',
  'scripts/lib/archived-weather-restart-updater-test-input.json',
  'scripts/lib/alternative-c-caller-test-input.mjs',
  'scripts/test-ravscore-initial-current-window-audit.mjs',
  'scripts/test-weather-state-epoch-input-view.mjs',
  'scripts/test-ravscore-recovery-replay.mjs',
  'scripts/test-protected-dmi-native-current-proofs.mjs',
  'scripts/test-dmi-protected-tuple-continuity.mjs',
  'scripts/test-weather-component-normal-wireup.mjs',
  'scripts/test-reusable-production-workflows.mjs',
  'scripts/test-weather-update-entrypoint.mjs',
]);
// These five prose records are not read by the reviewed native command or its
// historical materializers. No whole documentation directory is excluded.
export const NON_NATIVE_PROSE = Object.freeze([
  'AGENTS.md', 'CHANGELOG.md', 'docs/rdks/01_AI_OPERATING_RULES.md',
  'docs/rdks/90_INDEX/CURRENT_TRUTH.md', 'docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md',
]);
const REUSE_FILES = ['scripts/native-postgres-evidence.mjs', 'scripts/test-native-postgres-evidence.mjs'];
const FROZEN = [
  ['044d3045fecc2e70d6f35f60010921c6bd597ecc','4c56c3b73633bf3a5e1540e4f53e75be49f0b9da'],
  ['60d999a68136c43acb4d3664bbd66eed47283bb2','ead5743dd9098035b0de5f748de2009460506971'],
  ['d7b31aa3c706e2f657fe5de99c56434f3cff260d','9d05b060dba9015233a368c63438a3dfd9b9b45d'],
  ['d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7','0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0'],
];
export const NEW_NATIVE_BLOCK = [
  '      - name: ' + STEP,
  '        shell: bash',
  '        env:',
  '          GITHUB_TOKEN: ${{ github.token }}',
  '          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
  '          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}',
  '        run: |',
  '          set -euo pipefail',
  '          node --test scripts/test-native-postgres-evidence.mjs',
  '          node scripts/native-postgres-evidence.mjs',
  '',
].join('\n') + '\n';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const lf = value => String(value).replace(/\r\n/g, '\n');
const complete = (value, key) => Number.isSafeInteger(value?.total_count)
  && value.total_count >= 0 && value.total_count <= 100
  && Array.isArray(value[key]) && value.total_count === value[key].length;
const successful = value => value?.status === 'completed' && value.conclusion === 'success';
const one = values => { assert.equal(values.length, 1); return values[0]; };

export function nativeBlock(source) {
  const text = lf(source), start = text.indexOf('      - name: ' + STEP + '\n');
  assert(start >= 0 && text.indexOf('      - name: ' + STEP + '\n', start + 1) === -1);
  const end = text.indexOf('      - name:', start + 1); assert(end > start);
  return text.slice(start, end);
}
export function verifyWorkflow(before, after) {
  before = lf(before); after = lf(after);
  assert.equal(nativeBlock(after), NEW_NATIVE_BLOCK);
  assert.equal(after.split('  actions: read\n').length, 2);
  const restored = after.replace(NEW_NATIVE_BLOCK, nativeBlock(before)).replace('  actions: read\n', '');
  assert.equal(restored, before, 'Only the exact evidence wrapper and read permission may differ');
  for (const command of COMMANDS) assert.equal(nativeBlock(before).split('          ' + command + '\n').length, 2);
  assert.match(nativeBlock(before), /shell: bash\n        run: \|\n          set -euo pipefail\n/);
}
export function parseTree(text) {
  return String(text).split('\0').filter(Boolean).map(row => {
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([^\0]+)$/.exec(row);
    assert(match); return [match[4], match[1], match[2], match[3]];
  }).sort((a, b) => a[0].localeCompare(b[0], 'en'));
}
export function verifyInputTrees(before, after) {
  const excluded = new Set([...NON_NATIVE_TEST_INPUTS, ...NON_NATIVE_PROSE, ...REUSE_FILES, WORKFLOW]);
  const old = new Map(before.map(row => [row[0], row]));
  const next = new Map(after.map(row => [row[0], row]));
  assert(before.length > 0 && after.length > 0 && old.size === before.length && next.size === after.length);
  for (const file of excluded) {
    const a = old.get(file), b = next.get(file);
    if (a) assert(b, 'A reviewed test may not disappear');
    for (const row of [a,b].filter(Boolean)) assert(row[1] === '100644' && row[2] === 'blob');
  }
  const retained = rows => rows.filter(row => !excluded.has(row[0]));
  assert.deepEqual(retained(after), retained(before), 'Every other tracked file, mode and Git blob must be identical');
  return {inputGitManifestSha256: sha(JSON.stringify(retained(before))),
    retainedEntries: retained(before).length,
    changedNonNativePaths: [...excluded].filter(file => JSON.stringify(old.get(file)) !== JSON.stringify(next.get(file))).sort(),
    frozenGitTrees: FROZEN.map(([head,tree]) => ({head,tree}))};
}
export function verifyOriginMetadata(run, jobs) {
  assert.equal(run.id, ORIGIN.run); assert.equal(run.run_attempt, ORIGIN.attempt);
  assert.equal(run.head_sha, ORIGIN.head); assert.equal(run.path, WORKFLOW);
  assert.equal(run.event, 'pull_request'); assert.equal(run.repository?.full_name, ORIGIN.repository);
  assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'failure');
  assert(Number.isFinite(Date.parse(run.created_at)) && Date.parse(run.created_at) < Date.parse(ORIGIN.completedAt));
  assert(run.pull_requests?.some(pr => pr.number === ORIGIN.pullRequest));
  assert(complete(jobs, 'jobs'));
  const job = one(jobs.jobs.filter(value => value.id === ORIGIN.job && value.name === JOB));
  assert.equal(job.run_id, ORIGIN.run); assert.equal(job.run_attempt, ORIGIN.attempt);
  assert.equal(job.head_sha, ORIGIN.head); assert.equal(job.status, 'completed'); assert.equal(job.conclusion, 'failure');
  const pg = one(job.steps.filter(value => value.name === STEP));
  assert(successful(pg)); assert.equal(pg.number, 15); assert.equal(pg.completed_at, ORIGIN.completedAt);
  const source = one(job.steps.filter(value => value.name === 'Validate source contracts and release governance'));
  assert.equal(source.number, 16); assert.equal(source.status, 'completed'); assert.equal(source.conclusion, 'failure');
  const national = one(job.steps.filter(value => value.name === 'Validate isolated restart and two ordinary national followers'));
  assert.equal(national.number, 17); assert.equal(national.conclusion, 'skipped');
  return {nativeCompletedAt: pg.completed_at, sourceConclusion: source.conclusion};
}
export function verifyOrigin(run, jobs, log) {
  const metadata = verifyOriginMetadata(run, jobs);
  assert.equal(sha(log), ORIGIN.logSha256, 'Actual original job log must match the retained immutable receipt');
  // Authenticate RAW bytes above; only then remove the runner's observed SGR
  // colour framing from the logged command display. No argv rewriting.
  const lines = String(log).split(/\r?\n/).map(line => line.replace(/^\d{4}-\d\d-\d\dT\S+Z /, '')
    .replace(/\u001b\[[0-9;]*m/g, ''));
  for (const command of COMMANDS) assert.equal(lines.filter(line => line === command).length, 1);
  const report = JSON.parse(one(lines.filter(line => line.startsWith('{"kind":"NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON"'))));
  assert.equal(report.sqlExecuted, true); assert.equal(report.migrationExecuted, true);
  assert.equal(report.postgresMajorVersion, 16); assert.equal(report.tcpEnabled, false);
  assert.equal(report.lastMileEnclosure?.sqlExecuted, true);
  assert.equal(report.lastMileEnclosure?.wholeMigrationExecuted, true);
  assert.equal(report.lastMileEnclosure?.migrationVersion, '20261019060000');
  assert.equal(report.lastMileEnclosure?.trueOld140000Fixtures, true);
  assert.equal(report.lastMileEnclosure?.currentNormalFixtures, true);
  return metadata;
}
export function verifyEnvironment(value) {
  // The old log records image+runtime identity and PG major, NOT a binary SHA.
  // The unchanged setup never installs/changes PG; a different image reruns it.
  assert.equal(value.platform, 'linux'); assert.equal(value.arch, 'x64');
  assert.equal(value.imageOS, 'ubuntu24'); assert.equal(value.imageVersion, '20261012.334.1');
  assert.equal(value.node, 'v22.23.3'); assert.equal(value.python, 'Python 3.12.15');
  assert.equal(value.pythonLocation, '/opt/hostedtoolcache/Python/3.12.15/x64');
  assert.equal(value.ldLibraryPath, value.pythonLocation + '/lib');
  assert.equal(value.pgBindir, '/usr/lib/postgresql/16/bin');
  assert.deepEqual(value.pgMajors, [16,16,16,16]);
  assert.equal(value.git, 'git version 2.55.0');
  assert.deepEqual(value.overrides, []);
  return value;
}
export function verifyLaterRuns(list, jobsByRun, originRun, currentRunId) {
  assert(complete(list, 'workflow_runs'));
  assert.equal(new Set(list.workflow_runs.map(run=>run.id)).size,list.workflow_runs.length);
  for (const run of list.workflow_runs) {
    assert.equal(run.path, WORKFLOW); assert.equal(run.event, 'pull_request');
    assert.equal(run.repository?.full_name, ORIGIN.repository);
    assert.equal(run.head_branch, originRun.head_branch);
    if ([ORIGIN.run,currentRunId].includes(run.id)) continue;
    assert.equal(run.status, 'completed'); assert.equal(run.run_attempt, 1);
    const jobs = jobsByRun.get(run.id); assert(complete(jobs, 'jobs'));
    const job = one(jobs.jobs.filter(value => value.name === JOB));
    assert.equal(job.run_id, run.id); assert.equal(job.run_attempt, run.run_attempt); assert.equal(job.head_sha, run.head_sha);
    const step = one(job.steps.filter(value => value.name === STEP));
    assert(step.conclusion === 'skipped' || successful(step), 'Later failed, cancelled or unknown PG forbids reuse');
  }
}
const git = args => execFileSync('git', args, {encoding:'utf8', maxBuffer:64*1024*1024, timeout:30000});
function environment() {
  const command = (file,args) => execFileSync(file,args,{encoding:'utf8',timeout:10000}).trim();
  const pgBindir = command('pg_config',['--bindir']);
  return {platform:process.platform,arch:process.arch,imageOS:process.env.ImageOS,imageVersion:process.env.ImageVersion,
    node:process.version, python:command('python',['--version']),pythonLocation:process.env.pythonLocation,
    ldLibraryPath:process.env.LD_LIBRARY_PATH,git:command('git',['--version']),pgBindir,
    pgMajors:['initdb','pg_ctl','psql','postgres'].map(name => Number(command(path.join(pgBindir,name),['--version']).match(/\b(\d+)\.\d+/)?.[1])),
    overrides:Object.keys(process.env).filter(key => /^(?:PG|NODE_OPTIONS$|NODE_PATH$|LD_PRELOAD$|GIT_(?:OBJECT|ALTERNATE|REPLACE|CONFIG))/.test(key)).sort()};
}
async function github(route, {raw=false}={}) {
  const response = await fetch('https://api.github.com' + route, {headers:{
    Authorization:'Bearer ' + process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
  },redirect:'manual',signal:AbortSignal.timeout(15000)});
  if (raw && response.status === 302) {
    const url = new URL(response.headers.get('location'));
    assert(url.protocol === 'https:' && !url.username && !url.password);
    // GitHub's signed log URL receives NO repository token.
    const log = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
    assert(log.ok); const bytes = Buffer.from(await log.arrayBuffer()); assert(bytes.length <= 2*1024*1024); return bytes;
  }
  assert(response.ok); assert(!raw, 'Expected immutable GitHub job-log download'); return response.json();
}
export async function decideReuse({env=process.env,get=github,readGit=git,getEnvironment=environment}={}) {
  try {
    assert.equal(env.GITHUB_EVENT_NAME,'pull_request'); assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
    assert.equal(Number(env.PULL_REQUEST_NUMBER),ORIGIN.pullRequest); assert.equal(env.GITHUB_RUN_ATTEMPT,'1');
    assert(/^[a-f0-9]{40}$/.test(env.SOURCE_GATE_HEAD_SHA));
    assert.equal(readGit(['rev-parse','HEAD^{commit}']).trim(),env.SOURCE_GATE_HEAD_SHA);
    assert.equal(readGit(['status','--porcelain','--untracked-files=no']).trim(),'');
    assert.equal(readGit(['for-each-ref','refs/replace']).trim(),'');
    assert.equal(readGit(['rev-parse','--is-shallow-repository']).trim(),'false');
    readGit(['merge-base','--is-ancestor',ORIGIN.head,'HEAD']);
    for (const [head,tree] of FROZEN) assert.equal(readGit(['rev-parse',head+'^{tree}']).trim(),tree);
    verifyWorkflow(readGit(['show',ORIGIN.head+':'+WORKFLOW]),readGit(['show','HEAD:'+WORKFLOW]));
    const inputs = verifyInputTrees(parseTree(readGit(['ls-tree','-rz','--full-tree',ORIGIN.head])),parseTree(readGit(['ls-tree','-rz','--full-tree','HEAD'])));
    const runtime = verifyEnvironment(getEnvironment());
    const base='/repos/'+ORIGIN.repository+'/actions', originRun=await get(base+'/runs/'+ORIGIN.run);
    const jobs=await get(base+'/runs/'+ORIGIN.run+'/attempts/1/jobs?per_page=100');
    const log=await get(base+'/jobs/'+ORIGIN.job+'/logs',{raw:true}); verifyOrigin(originRun,jobs,log);
    const currentRunId=Number(env.GITHUB_RUN_ID); assert(Number.isSafeInteger(currentRunId)&&currentRunId>ORIGIN.run);
    const current=await get(base+'/runs/'+currentRunId);
    assert.equal(current.id,currentRunId); assert.equal(current.run_attempt,1); assert.equal(current.path,WORKFLOW);
    assert.equal(current.head_sha,env.SOURCE_GATE_HEAD_SHA); assert.equal(current.event,'pull_request');
    assert.equal(current.repository?.full_name,ORIGIN.repository); assert.equal(current.head_branch,originRun.head_branch);
    assert(current.pull_requests?.some(pr=>pr.number===ORIGIN.pullRequest));
    const query=new URLSearchParams({event:'pull_request',branch:originRun.head_branch,created:'>='+originRun.created_at,per_page:'100'});
    const later=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
    assert(complete(later,'workflow_runs'));
    assert(later.workflow_runs.some(run=>run.id===ORIGIN.run)&&later.workflow_runs.some(run=>run.id===currentRunId));
    const laterJobs=new Map();
    for(const run of later.workflow_runs)if(![ORIGIN.run,currentRunId].includes(run.id))
      laterJobs.set(run.id,await get(base+'/runs/'+run.id+'/attempts/'+run.run_attempt+'/jobs?per_page=100'));
    verifyLaterRuns(later,laterJobs,originRun,currentRunId);
    // Recheck origin after discovery; a newly requested old rerun revokes it.
    verifyOriginMetadata(await get(base+'/runs/'+ORIGIN.run),jobs);
    return {status:'REUSED',executedInThisRun:false,origin:ORIGIN,current:{run:currentRunId,attempt:1,head:env.SOURCE_GATE_HEAD_SHA},commands:COMMANDS,...inputs,
      runtime,environmentEvidence:'same-hosted-image-and-observed-runtime-prerequisites-not-an-unobserved-binary-sha'};
  } catch { return {status:'EXECUTE',reason:'native-input-or-evidence-unavailable-or-different'}; }
}
async function record(receipt) {
  const file='.cache/source-tree-content-proof.json', proof=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(proof.headSha,git(['rev-parse','HEAD^{commit}']).trim()); assert.equal(proof.repository,ORIGIN.repository);
  assert.equal(proof.contractId,'weather-source-gate-content-v2'); assert.equal(proof.privatePayloadIncluded,false);
  proof.nativePostgres=receipt; await fs.writeFile(file,JSON.stringify(proof)+'\n');
}
async function main() {
  let receipt=await decideReuse();
  if(receipt.status!=='REUSED') {
    console.log('Native PostgreSQL: original commands required; reuse evidence absent or different.');
    const env={...process.env}; for(const key of ['GITHUB_TOKEN','SOURCE_GATE_HEAD_SHA','PULL_REQUEST_NUMBER'])delete env[key];
    const result=spawnSync('/usr/bin/bash',['--noprofile','--norc','-e','-o','pipefail','-c',NATIVE_SCRIPT],{env,stdio:'inherit'});
    if(result.error||result.status!==0){process.exitCode=result.status||1;return;}
    receipt={...receipt,status:'EXECUTED',executedInThisRun:true,origin:null,
      current:{run:Number(process.env.GITHUB_RUN_ID),attempt:Number(process.env.GITHUB_RUN_ATTEMPT),head:git(['rev-parse','HEAD^{commit}']).trim()},commands:COMMANDS};
  } else console.log('Native PostgreSQL: REUSED from run '+ORIGIN.run+'/1, job '+ORIGIN.job+', head '+ORIGIN.head+'; no new SQL execution claimed.');
  await record(receipt);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
