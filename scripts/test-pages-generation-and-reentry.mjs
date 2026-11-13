import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync,execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import { assertMonotonicPagesGeneration, readBoundedPublicManifest } from './lib/pages-generation-order.mjs';
import { exactPagesAttemptStep, readAuthenticPagesAttemptClosure, hasAuthenticPagesAttemptClosure, authenticPagesPublicCompletionObservation } from './github-pages-attempt-evidence.mjs';
import { sha256CanonicalJson } from './ravscore-operational-pages-recovery.mjs';

const manifest = (hour, minute = 10) => ({ complete: true, zoneCount: 210,
  datasetId: `rr-${hour}-${minute}`, productionReferenceAt: `2026-09-19T${hour}:00:00.000Z`,
  generatedAt: `2026-09-19T${hour}:${minute}:00.000Z` });
const text = value => JSON.stringify(value);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(await readBoundedPublicManifest(new Response('{"ok":true}')), '{"ok":true}');
await assert.rejects(readBoundedPublicManifest(new Response('12345'), 4), /admission bound/);
await assert.rejects(readBoundedPublicManifest(new Response(new Uint8Array([0xff]))), /encoded data/);
await assert.rejects(readBoundedPublicManifest(new Response(null)), /no readable body/);
const previous = manifest('10'), next = manifest('11');
const input = { targetText: text(next), publicText: text(previous) };
assert.equal(assertMonotonicPagesGeneration(input), 'FORWARD_WEATHER_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ ...input, publicText: text(manifest('12')) }), /older/);
assert.equal(assertMonotonicPagesGeneration({ ...input, targetText: text(manifest('10', 20)) }), 'FORWARD_WEATHER_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ ...input, targetText: text(previous) }), /Same-hour/);
const repacked = { ...previous, releaseVersion: 'synthetic-successor' };
const reuse = { sourcePublicManifestSha256: hash(text(previous)),
  generatedPublicManifestSha256: hash(text(repacked)), sourceDatasetId: previous.datasetId,
  datasetId: repacked.datasetId, productionReferenceAt: repacked.productionReferenceAt,
  providerRequestsPerformed: false, privatePayloadIncluded: false, publicRuntimeAdvanced: false };
assert.equal(assertMonotonicPagesGeneration({ ...input, targetText: text(repacked), reuseReport: reuse }), 'EXACT_REUSE_PREDECESSOR');
for (const mutation of [{ sourcePublicManifestSha256: 'f'.repeat(64) },
  { generatedPublicManifestSha256: 'f'.repeat(64) }, { sourceDatasetId: 'other' },
  { publicRuntimeAdvanced: true }, { providerRequestsPerformed: true }]) {
  assert.throws(() => assertMonotonicPagesGeneration({ ...input, targetText: text(repacked), reuseReport: { ...reuse, ...mutation } }));
}
assert.equal(assertMonotonicPagesGeneration({ ...input, recoverySourceSha256: sha256CanonicalJson(previous) }), 'EXACT_RECOVERY_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ ...input, recoverySourceSha256: 'f'.repeat(64) }), /sealed public predecessor/);
const sameHourRecovery = { ...previous, releaseVersion: 'exact-recovery-successor' };
const sameHourRecoveryReuse = { ...reuse, generatedPublicManifestSha256: hash(text(sameHourRecovery)),
  datasetId: sameHourRecovery.datasetId, productionReferenceAt: sameHourRecovery.productionReferenceAt,
  publicRuntimeAdvanced: true };
assert.equal(assertMonotonicPagesGeneration({ targetText: text(sameHourRecovery), publicText: text(previous),
  reuseReport: sameHourRecoveryReuse, recoverySourceSha256: sha256CanonicalJson(previous) }), 'EXACT_RECOVERY_GENERATION');
const formattedPredecessor = `${JSON.stringify(previous, null, 2)}\n`;
assert.notEqual(hash(formattedPredecessor), sha256CanonicalJson(previous));
assert.equal(assertMonotonicPagesGeneration({ targetText: text(sameHourRecovery), publicText: formattedPredecessor,
  recoverySourceSha256: sha256CanonicalJson(previous) }), 'EXACT_RECOVERY_GENERATION');
assert.throws(() => assertMonotonicPagesGeneration({ targetText: text(sameHourRecovery), publicText: formattedPredecessor,
  recoverySourceSha256: hash(formattedPredecessor) }), /sealed public predecessor/);

const identity = { runId: 123, runAttempt: 2, headSha: 'a'.repeat(40) };
const job = name => ({ name, run_id: 123, run_attempt: 2, head_sha: identity.headSha,
  steps: [{ name: 'Deploy to GitHub Pages', conclusion: 'success' }] });
for (const name of ['Deploy prepared Pages artifact',
  'Deploy verified code-only artifact / Deploy prepared Pages artifact',
  'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact']) {
  assert.equal(exactPagesAttemptStep([job(name)], identity), 'success');
}
assert.throws(() => exactPagesAttemptStep([job('Deploy prepared Pages artifact'), job('X / Deploy prepared Pages artifact')], identity), /unambiguous/);
assert.throws(() => exactPagesAttemptStep([{ ...job('Deploy prepared Pages artifact'), run_attempt: 1 }], identity));
assert.throws(() => exactPagesAttemptStep([{ ...job('Deploy prepared Pages artifact'), head_sha: 'b'.repeat(40) }], identity));

// The skipped wrapper spelling is the actual GitHub job shape observed in 305.
// These synthetic responses authenticate the same complete API envelope; they
// are not a new production read or a successful Pages-write claim.
{
  const owner = { ...identity, repository: 'ravradar/RavRadar', attemptId: 'pages-123-2' };
  const run = { id: 123, run_attempt: 2, head_sha: identity.headSha, head_branch: 'main',
    repository: { full_name: owner.repository }, path: '.github/workflows/run-current-weather-once.yml',
    status: 'completed', conclusion: 'failure', updated_at: '2026-11-12T01:00:00Z' };
  const skipped = (id, name) => ({ id, run_id: 123, run_attempt: 2, head_sha: identity.headSha,
    name, status: 'completed', conclusion: 'skipped' });
  const complete = [skipped(1, 'Deploy prepared Pages artifact through reusable workflow'),
    skipped(2, 'Finish an interrupted generation before new work / resume-pre-activation-pages'),
    skipped(3, 'Finish an interrupted generation before new work / Redeploy only a helper-proven exact sealed Pages target')];
  const fetchJobs = (jobs, mutate = value => value) => async (url, options) => {
    assert.equal(options.redirect, 'error'); assert.equal(options.cache, 'no-store');
    assert.equal(options.headers['X-GitHub-Api-Version'], '2022-11-28');
    if (!url.includes('/jobs?')) return { ok: true, json: async () => structuredClone(run) };
    const page = Number(new URL(url).searchParams.get('page'));
    return { ok: true, json: async () => mutate({ total_count: jobs.length, jobs: structuredClone(jobs.slice((page - 1) * 100, page * 100)) }) };
  };
  const readClosure = (jobs, mutate) => readAuthenticPagesAttemptClosure({ owner, token: 'test-token', fetchImpl: fetchJobs(jobs, mutate) });
  const noPost = await readClosure(complete);
  assert.equal(noPost.state, 'NO_POST'); assert.equal(noPost.roles.length, 3);
  assert.equal(hasAuthenticPagesAttemptClosure(noPost, owner), true);
  assert.equal(hasAuthenticPagesAttemptClosure({ ...noPost }, owner), false);
  assert.equal(hasAuthenticPagesAttemptClosure(noPost, { ...owner, runAttempt: 3 }), false);
  for (const jobs of [[], complete.slice(0, 2), [...complete, complete[0]],
    complete.map((job, i) => i === 2 ? { ...job, head_sha: 'b'.repeat(40) } : job),
    complete.map((job, i) => i === 1 ? { ...job, conclusion: 'success' } : job)]) {
    await assert.rejects(readClosure(jobs), /PAGES_OWNER_/);
  }
  await assert.rejects(readClosure(complete, ({ jobs }) => ({ jobs })), /JOB_LIST_INCOMPLETE/);
  const failed = structuredClone(complete);
  failed[0] = { ...failed[0], name: 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact',
    conclusion: 'failure', steps: [{ name: 'Deploy to GitHub Pages', status: 'completed', conclusion: 'failure',
      number: 30, completed_at: '2026-11-12T00:59:00Z' }] };
  await assert.rejects(readClosure(failed), /WRITE_CLOSURE_UNKNOWN/);
  let unresolved;try{await readClosure(failed);}catch(error){unresolved=error;}
  const observed=authenticPagesPublicCompletionObservation(unresolved,owner);
  assert.equal(observed.state,'PUBLIC_TARGET_UNRESOLVED');
  assert.equal(hasAuthenticPagesAttemptClosure(observed,owner),false);
  assert.equal(authenticPagesPublicCompletionObservation(new Error('PAGES_OWNER_WRITE_CLOSURE_UNKNOWN'),owner),null);
  assert.equal(authenticPagesPublicCompletionObservation(unresolved,{...owner,runAttempt:3}),null);
  const changedOther=structuredClone(failed);changedOther[1].status='in_progress';
  let invalid;try{await readClosure(changedOther);}catch(error){invalid=error;}
  assert.equal(authenticPagesPublicCompletionObservation(invalid,owner),null,
    'a failed first writer never hides another active writer');
  for(const mutation of [{number:0},{completed_at:null}]){
    const malformed=structuredClone(failed);Object.assign(malformed[0].steps[0],mutation);
    let error;try{await readClosure(malformed);}catch(value){error=value;}
    assert.equal(authenticPagesPublicCompletionObservation(error,owner),null);
  }
  failed[0].steps.push({ name: 'Confirm scheduled Pages writes are terminal and unpublished', status: 'completed',
    conclusion: 'success', number: 31, started_at: '2026-11-12T00:59:01Z' });
  assert.equal((await readClosure(failed)).state, 'CLOSED_UNPUBLISHED');
  const reversed = structuredClone(failed); reversed[0].steps[1].number = 29;
  await assert.rejects(readClosure(reversed), /WRITE_CLOSURE_UNKNOWN/);
  const recoveryUnknown = structuredClone(complete);
  recoveryUnknown[2] = { ...recoveryUnknown[2], conclusion: 'failure', steps: [
    { name: 'Redeploy the exact sealed Pages target', status: 'completed', conclusion: 'cancelled', number: 9 }] };
  await assert.rejects(readClosure(recoveryUnknown), /WRITE_CLOSURE_UNKNOWN/);
  const unknownRole = [...complete, { ...complete[0], id: 4, name: 'Other writer', steps: failed[0].steps }];
  await assert.rejects(readClosure(unknownRole), /WRITER_ROLE_UNKNOWN/);
  const paginated = [...complete, ...Array.from({ length: 98 }, (_, i) => skipped(i + 4, 'Non-writer ' + i))];
  assert.equal((await readClosure(paginated)).state, 'NO_POST');
}


// The private historical log is deliberately absent from this repository.
// A real-code diagnostic-looking line, token/status HTTP404, or missing log
// cannot replace the complete authenticated reviewed POST-rejection event.
{
  const owner = { repository: 'jakobjorgensen82-commits/RavRadar', runId: 43336157644,
    runAttempt: 1, headSha: 'd7a9a21afd013b386d211bdb540a719050a489de', attemptId: 'pages-43336157644-1' };
  const run = { id: owner.runId, run_attempt: 1, head_sha: owner.headSha, head_branch: 'main',
    repository: { full_name: owner.repository }, path: '.github/workflows/run-current-weather-once.yml',
    status: 'completed', conclusion: 'failure', updated_at: '2026-11-13T03:08:05Z' };
  const root = `https://api.github.com/repos/${owner.repository}/actions/runs/${owner.runId}`;
  const logUrl = `https://api.github.com/repos/${owner.repository}/actions/jobs/131660621931/logs`;
  const common = { run_id: owner.runId, run_attempt: 1, head_sha: owner.headSha, status: 'completed' };
  const step = (name, number, conclusion) => ({ name, number, status: 'completed', conclusion });
  const jobs = [
    { ...common, id: 131660621931, conclusion: 'failure',
      name: 'Deploy prepared Pages artifact through reusable workflow / Deploy prepared Pages artifact', steps: [
        step('Reserve this exact Pages writer before its first POST', 30, 'success'),
        step('Deploy to GitHub Pages', 31, 'failure'),
        step('Confirm scheduled Pages writes are terminal and unpublished', 32, 'skipped')] },
    { ...common, id: 131660621932, conclusion: 'skipped',
      name: 'Finish an interrupted generation before new work / resume-pre-activation-pages' },
    { ...common, id: 131660621933, conclusion: 'skipped',
      name: 'Finish an interrupted generation before new work / Redeploy only a helper-proven exact sealed Pages target' },
  ];
  const fetchMemory = ({ body = null, status = 200, rows = jobs, location = null } = {}) => async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    if (url === root) return { ok: true, json: async () => structuredClone(run) };
    if (url === root + '/attempts/1/jobs?per_page=100&page=1')
      return { ok: true, json: async () => ({ total_count: rows.length, jobs: structuredClone(rows) }) };
    assert.equal(url, logUrl);
    assert.equal(options.redirect, 'manual');
    const response = new Response(body, { status, headers: location ? { location } : {} });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  };
  const qualify = options => readAuthenticPagesAttemptClosure({ owner, token: 'test-token', fetchImpl: fetchMemory(options) });
  for (const body of [null,
    'PAGES_RETRY_DIAGNOSTIC {"stage":"FIRST_DEPLOYMENT","code":"PAGES_CREATE_HTTP_404"}\n',
    'PAGES_RETRY_DIAGNOSTIC {"stage":"FIRST_DEPLOYMENT","code":"PAGES_TRANSPORT_OIDC_HTTP_404"}\n',
    'PAGES_RETRY_DIAGNOSTIC {"stage":"FIRST_DEPLOYMENT","code":"PRIOR_STATUS_ABSENCE_UNQUALIFIED"}\n']) {
    await assert.rejects(qualify({ body }), /PAGES_OWNER_REJECTED_CREATE_LOG_UNPROVED/);
  }
  await assert.rejects(qualify({ status: 404 }), /PAGES_OWNER_REJECTED_CREATE_LOG_UNPROVED/);
  await assert.rejects(qualify({ status: 302, location: 'https://untrusted.example/log' }), /PAGES_OWNER_REJECTED_CREATE_LOG_UNPROVED/);
  await assert.rejects(qualify({ rows: [...jobs, jobs[0]] }), /PAGES_OWNER_JOB_LIST_UNBOUND/);
  const noReservation = structuredClone(jobs); noReservation[0].steps[0].conclusion = 'skipped';
  await assert.rejects(qualify({ rows: noReservation }), /PAGES_OWNER_REJECTED_CREATE_STEP_UNPROVED/);
}

const read = file => fs.readFile(`.github/workflows/${file}.yml`, 'utf8');
function assertSourceReviewRead(source, job) {
  let scope = source, indent = 0;
  if (job) {
    const start = source.indexOf('\n  ' + job + ':\n');
    assert.ok(start >= 0, 'Expected recovery job: ' + job);
    // The next two-space job key, rather than one of the job's own fields.
    const next = source.slice(start + 4).search(/^  [a-z][a-z-]+:\s*$/m);
    scope = source.slice(start, next < 0 ? source.length : start + 4 + next);
    indent = 4;
  }
  const block = scope.match(new RegExp('^' + ' '.repeat(indent) + 'permissions:\\n((?:' + ' '.repeat(indent + 2) + '[^\\n]*\\n)+)', 'm'));
  assert.ok(block && new RegExp('^' + ' '.repeat(indent + 2) + 'pull-requests: read$', 'm').test(block[1]),
    'Source review read permission missing: ' + (job || 'workflow'));
}
for (const name of ['update-and-deploy', 'run-current-weather-once', 'deploy-code-only-repair']) {
  const source = await read(name);
  assert.match(source, /ravradar-weather-production-v2/);
  assert.match(source, /uses: \.\/\.github\/workflows\/reusable-operational-reentry.yml/);
  assertSourceReviewRead(source);
  assertSourceReviewRead(source, 'operational-recovery-gate');
  assert.throws(() => assertSourceReviewRead(source.replaceAll('      pull-requests: read\n', ''),
    'operational-recovery-gate'), /Source review read permission missing/);
}
const recovery = await read('reusable-operational-reentry');
function assertPublishedCompletionOrder(source) {
  const phase=source.indexOf('if test "$(jq -r \'.action\' "$RAVRADAR_OPERATIONAL_WORK/pre-activation.json")" != NONE; then');
  const gate=source.indexOf('completion_source_output=',phase),required=source.indexOf("grep -Fx 'required=false'",gate);
  const complete=source.indexOf('--complete-published-ordinary'),fresh=source.indexOf('node scripts/ravscore-operational-activation.mjs read',complete);
  const retire=source.indexOf('--retire-closed-ordinary-phase',phase),begin=source.indexOf('--begin-terminal-pre-activation',phase);
  assert(complete>=0&&complete<fresh&&fresh<phase&&phase<gate&&gate<required&&required<retire&&retire<begin,
    'Completion is reachable without a phase; other phase writers retain normal source qualification');
  return source.slice(source.lastIndexOf('\n',source.indexOf('node scripts/protected-operational-reentry-evidence.mjs --complete-published-ordinary'))+1,source.lastIndexOf('\n',phase)+1)
    .split('\n').map(line=>line.replace(/^ {10}/,'')).join('\n');
}
const completionProgram=assertPublishedCompletionOrder(recovery);
assert.throws(()=>assertPublishedCompletionOrder(recovery.replace("grep -Fx 'required=false'",'true # removed source decision')));
const completionWork=await fs.mkdtemp(path.join(os.tmpdir(),'rr-published-completion-order-'));
try {
  const shell=process.platform==='win32'?path.resolve(execFileSync('git',['--exec-path'],{encoding:'utf8'}).trim(),'../../../usr/bin/sh.exe'):'bash';
  const priorPath=Object.entries(process.env).find(([key])=>key.toUpperCase()==='PATH')?.[1]??'';
  const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>key.toUpperCase()!=='PATH'));
  env.PATH=(process.platform==='win32'?path.dirname(shell)+path.delimiter:'')+priorPath;
  for(const required of ['true','false'])for(const phase of ['NONE','PRE_ACTIVATION_PRESENT'])for(const completed of ['false','true']) {
    const directory=path.join(completionWork,required+'-'+phase+'-'+completed);await fs.mkdir(directory);
    const calls=path.join(directory,'calls.txt'),output=path.join(directory,'output.txt');
    const input='set -euo pipefail\nnode() { if test "$1" = scripts/protected-operational-reentry-evidence.mjs && test "$TEST_COMPLETED" = true && test "$TEST_REQUIRED" = true; then return 1; fi; printf "%s\\n" "$*" >> "$TEST_CALLS"; }\njq() { if test "$2" = .completed; then printf "%s\\n" "$TEST_COMPLETED"; else printf "%s\\n" "$TEST_PHASE"; fi; }\n'+completionProgram;
    const result=spawnSync(shell,['-e','-s'],{input,encoding:'utf8',timeout:10000,env:{...env,GH_TOKEN:'synthetic-source-token',GITHUB_REPOSITORY:'ravradar/RavRadar',
      TEST_REQUIRED:required,TEST_PHASE:phase,TEST_COMPLETED:completed,GITHUB_OUTPUT:output.replace(/\\/g,'/'),
      RAVRADAR_OPERATIONAL_WORK:directory.replace(/\\/g,'/'),TEST_CALLS:calls.replace(/\\/g,'/')}});
    if(required==='true'&&completed==='true'){assert.notEqual(result.status,0);await assert.rejects(fs.stat(calls),{code:'ENOENT'});}
    else{assert.equal(result.status,0,result.stderr);const invoked=await fs.readFile(calls,'utf8');
      assert.match(invoked,/protected-operational-reentry-evidence\.mjs --complete-published-ordinary/);
      assert.match(invoked,/ravscore-operational-activation\.mjs read/);
      const action=await fs.readFile(output,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
      assert.equal(action.includes('recovery_action=TARGET_RECONCILE'),phase==='NONE'&&completed==='true',
        'only actual pagesWrite-only completion returns existing target-reconciliation semantics');}
  }
} finally {await fs.rm(completionWork,{recursive:true,force:true});}
const protectedPagesSource=await fs.readFile('scripts/protected-operational-reentry-evidence.mjs','utf8');
const protectedMain=protectedPagesSource.slice(protectedPagesSource.indexOf('async function main()'));
assert.ok(protectedMain.indexOf('const beforeRotation=')<protectedMain.indexOf("result=await publishProtectedPreActivationTarget"));
assert.ok(protectedMain.indexOf('const beforeRotation=')<protectedMain.indexOf('? await publishProtectedOperationalEvidence'));
assert.match(protectedMain,/if\(!beforeRotation\?\.payload\.pagesWrite\)[\s\S]*assertProtectedPagesWritesClosed/);
assert.ok(recovery.indexOf('--reserve-recovery-writer')<recovery.indexOf('- name: Redeploy the exact sealed Pages target'));
assertSourceReviewRead(recovery);
for (const job of ['reconcile-operational-pending', 'recover-operational-pages-target']) {
  assertSourceReviewRead(recovery, job);
  assert.throws(() => assertSourceReviewRead(recovery.replaceAll('      pull-requests: read\n', ''), job),
    /Source review read permission missing/);
}
const once=await read('run-current-weather-once');
const onceStep=name=>{const start=once.indexOf('      - name: '+name+'\n');assert(start>=0);
  const next=once.indexOf('\n      - ',start+1),job=once.indexOf('\n  native-identity-prewrite:',start+1);
  return once.slice(start,next>=0&&(job<0||next<job)?next:job);};
const cancellationSelector=onceStep('Select fresh weather and verify a prior closed Pages outcome');
const autoExpression=cancellationSelector.match(/^        if: (.+)$/m)?.[1];assert(autoExpression);
const evaluateAuto=(action,eligible='true')=>runInNewContext(autoExpression.replace(/\b(steps|needs)\.([a-z][a-z0-9-]*)/g,(_all,type,id)=>type+'['+JSON.stringify(id)+']'),{
  steps:{'automatic-completed-scope':{outputs:{eligible}}},needs:{'operational-recovery-gate':{outputs:{recovery_action:action}}}});
assert.equal(evaluateAuto('NONE'),true);
for(const action of ['COMPLETED_PRE_ACTIVATION','TARGET_RECONCILE','PRE_ACTIVATION_RESUME','UNKNOWN',undefined])assert.equal(evaluateAuto(action),false);
assert.equal(evaluateAuto('NONE','false'),false);
const canonicalHour=onceStep('Lock the canonical UTC production hour');
assert.match(canonicalHour,/steps\.automatic-completed-target\.outcome == 'skipped'/);
const targetStep=onceStep('Require one canonical target hour and completed-runtime decision');
const targetProgram=targetStep.slice(targetStep.indexOf('        run: |\n')+'        run: |\n'.length)
  .split('\n').map(line=>line.replace(/^ {10}/,'')).join('\n');
const freshWork=await fs.mkdtemp(path.join(os.tmpdir(),'rr-after-completed-phase-'));
try{
  const shell=process.platform==='win32'?path.resolve(execFileSync('git',['--exec-path'],{encoding:'utf8'}).trim(),'../../../usr/bin/sh.exe'):'bash';
  const output=path.join(freshWork,'output.txt'),result=spawnSync(shell,['-e','-s'],{input:targetProgram,encoding:'utf8',timeout:10000,
    env:{...process.env,REQUESTED_COMPLETED:'false',MANUAL_TARGET:'',MANUAL_PIN:'',AUTO_OUTCOME:'skipped',AUTO_COMPLETED:'',AUTO_TARGET:'',AUTO_PIN:'',
      AUTO_ELIGIBLE:'true',AUTO_FRESH_AFTER_CANCELLED_REPLAY:'',AUTO_REPEAT_ANCHOR:'',CHECKPOINT_TARGET:'',CACHE_TARGET:'2026-11-13T17:00:00Z',
      GITHUB_OUTPUT:output.replace(/\\/g,'/')}});
  assert.equal(result.status,0,result.stderr);const rows=(await fs.readFile(output,'utf8')).trim().split('\n');
  assert(rows.includes('completed_private_runtime=false'));assert(rows.includes('target_hour=2026-11-13T17:00:00Z'));
  assert(rows.includes('completed_private_runtime_pin='));assert(rows.includes('fresh_after_pages_failure=false'));
}finally{await fs.rm(freshWork,{recursive:true,force:true});}
const checkpoint = await read('resume-operational-checkpoint');
assertSourceReviewRead(checkpoint);
assert.match(checkpoint, /group: ravradar-weather-production-v2/);
assert.match(checkpoint, /uses: \.\/\.github\/workflows\/reusable-operational-reentry.yml/);
assert.match(checkpoint, /test "\$RESULT" = success/);
assert.match(checkpoint, /EXACT_TARGET_REDEPLOY\|TARGET_RECONCILE\|COMPLETED_PRE_ACTIVATION\|PRE_ACTIVATION_RESUME/);
assert.match(checkpoint, /\*\) echo "No exact prepared target was publicly recovered\." >&2; exit 1/);
for (const source of [checkpoint, recovery]) {
  assert.throws(() => assertSourceReviewRead(source.replace(/^  pull-requests: read\n/m, '')),
    /Source review read permission missing/);
}
assert.doesNotMatch(recovery, /^concurrency:/m);
assert.match(recovery, /github-pages-attempt-evidence.mjs/);
assert.match(recovery, /assertMonotonicPagesGeneration/);
assert.match(recovery, /protected-operational-reentry-evidence\.mjs --restore/);
assert.match(recovery, /--durable-evidence/);
assert.match(recovery, /TERMINAL_SOURCE_STABLE_AFTER_ARTIFACT_EXPIRY/);
for (const name of ['reusable-weather-build', 'deploy-code-only-repair']) {
  const source = await read(name);
  assert.match(source, /MEASURED_WARMUP_PUBLISHED/);
  const copy = name === 'reusable-weather-build'
    ? 'node scripts/copy-pages-public-delivery.mjs --source "$pages_source/data/live" --target "$pages_destination/data/live"'
    : 'node scripts/copy-pages-public-delivery.mjs --source data/live --target _site/data/live';
  assert.equal(source.split(copy).length, 2, 'Exactly one actual Pages delivery copy per workflow');
  for (const step of ['checkpoint-build', 'checkpoint-save', 'checkpoint-publish']) {
    const at = source.indexOf(`id: ${step}`), end = source.indexOf('\n      - ', at);
    const block = source.slice(at, end);
    assert.match(block, /disposition == 'READY_PUBLISHED'/);
    assert.match(block, /disposition == 'MEASURED_WARMUP_PUBLISHED'/);
    assert.doesNotMatch(block, /rollback_activation_ready == 'true'/);
  }
}
const deploy = await read('reusable-pages-deploy');
// Historical-owner closure reads exact committed source blobs. Every actual
// reservation, claim, reconciliation and clear caller needs those Git objects.
function assertPagesOwnerSourceHistory(source, job = null) {
  if (job !== null) {
    const header = '\n  ' + job + ':\n';
    assert.equal(source.split(header).length, 2, 'One normal Pages/reentry job');
    const start = source.indexOf(header), tail = source.slice(start + header.length);
    const next = tail.search(/^  [a-z][a-z0-9-]*:\n/m);
    source = source.slice(start, next < 0 ? source.length : start + header.length + next);
  }
  const header = '      - uses: actions/checkout@v7\n';
  assert.equal(source.split(header).length, 2, 'One normal Pages checkout');
  const start = source.indexOf(header), end = source.indexOf('\n      - ', start + header.length);
  const checkout = source.slice(start, end < 0 ? source.length : end + 1);
  assert.ok(checkout.includes('        with:\n          fetch-depth: 0\n'),
    'Pages owner-source reader requires full-history checkout');
  assert.equal(checkout.split('fetch-depth:').length, 2, 'One explicit history setting');
  return { checkout, source };
}
for (const [source, job] of [[deploy, null],
  ...['reconcile-operational-pending', 'recover-operational-pages-target',
    'finalize-operational-pages-recovery', 'resume-pre-activation', 'complete-pre-activation']
    .map(job => [recovery, job])]) {
  const { checkout, source: jobSource } = assertPagesOwnerSourceHistory(source, job);
  for (const replacement of [
    checkout.replace('        with:\n          fetch-depth: 0\n', ''),
    checkout.replace('          fetch-depth: 0\n', '          fetch-depth: 1\n'),
  ]) assert.throws(() => assertPagesOwnerSourceHistory(jobSource.replace(checkout, () => replacement)),
    /full-history checkout/);
}

assert.doesNotMatch(deploy, /^concurrency:/m);

// Both normal historical begin callers must carry the independently observed
// public identity, including a valid public generation ahead of central ACTIVE.
const observedSourceArgument = '--source-deployment-id "$(cat "$RAVRADAR_OPERATIONAL_HANDOFF/source-deployment-id.txt")"';
function historicalBeginStep(source, id) {
  const marker = '\n        id: ' + id + '\n';
  assert.equal(source.split(marker).length, 2, 'One exact historical begin step: ' + id);
  const at = source.indexOf(marker), end = source.indexOf('\n      - name:', at + marker.length);
  return source.slice(source.lastIndexOf('\n      - name:', at), end < 0 ? source.length : end);
}
function assertObservedHistoricalBeginCallers(source) {
  for (const id of ['integrated-historical-maintenance-begin', 'code-only-integrated-historical-maintenance-begin']) {
    const step = historicalBeginStep(source, id);
    assert.equal(step.split(observedSourceArgument).length, 2,
      id + ' must pass the observed public source deployment');
    assert.match(step, /ravscore-operational-activation\.mjs integrated-historical-maintenance-begin/);
    assert.match(step, /--source-verification "\$RAVRADAR_OPERATIONAL_HANDOFF\/source-verification\.json"/);
  }
}
assertObservedHistoricalBeginCallers(deploy);
for (const id of ['integrated-historical-maintenance-begin', 'code-only-integrated-historical-maintenance-begin']) {
  const step = historicalBeginStep(deploy, id);
  for (const replacement of ['', '--source-deployment-id "${{ inputs.active_deployment_id }}"']) {
    assert.throws(() => assertObservedHistoricalBeginCallers(deploy.replace(step,
      step.replace(observedSourceArgument, replacement))), /must pass the observed public source deployment/);
  }
}

assert.equal(deploy.match(/check-pages-generation-order.mjs/g).length, 2);
assert.ok(deploy.indexOf('--reserve-pages-writer')<deploy.indexOf('- name: Deploy to GitHub Pages'));
assert.match(deploy,/--deployment-id "\$\{\{ inputs\.pre_activation_recovery && format\('pages-recovery-\{0\}-\{1\}'/);
assert.match(deploy, /exact_public_recovery/);
assert.match(deploy, /--recovery-source-sha256/);
assert.equal(deploy.match(/\.sourcePublicManifestCanonicalSha256/g)?.length, 2);
assert.doesNotMatch(deploy, /jq -er '\.sourcePublicManifestSha256/);
assert.ok(deploy.indexOf('id: code-only-integrated-historical-maintenance-begin') < deploy.indexOf('id: deployment'));
assert.match(deploy, /steps\.integrated-historical-maintenance-begin\.outcome == 'success' \|\| steps\.code-only-integrated-historical-maintenance-begin\.outcome == 'success'/);
assert.match(deploy, /MEASURED_WARMUP_PUBLISHED/);
assert.match(deploy, /NOT_APPLICABLE_DURING_MEASURED_WARMUP/);
assert.match(deploy, /Publish exact target reentry evidence before any activation CAS/);
assert.match(deploy, /--retain-public-manifest-sha256/);
assert.ok(deploy.indexOf('Publish exact target reentry evidence before any activation CAS')
  < deploy.indexOf('id: candidate-begin'));
console.log('Pages generation order, exact reusable attempt, shared reentry and measured-warmup workflow integration: passed.');


// Distinct fixed namespaces prevent a recovery and subsequent ordinary Pages
// deployment in the same run from aliasing terminal evidence or immutable IDs.
{
  const ordinary=job('Deploy prepared Pages artifact');
  const recovered=job('Recovery / Deploy exact pre-activation Pages artifact');
  recovered.steps[0].conclusion='failure';
  const both=[ordinary,recovered];
  assert.equal(exactPagesAttemptStep(both,identity),'success');
  const recoveryIdentity={...identity,attemptId:'pages-recovery-'+identity.runId+'-'+identity.runAttempt};
  assert.equal(exactPagesAttemptStep(both,recoveryIdentity),'failure');
  assert.throws(()=>exactPagesAttemptStep([ordinary],recoveryIdentity),/unambiguous/);
  assert.throws(()=>exactPagesAttemptStep([recovered,recovered],recoveryIdentity),/unambiguous/);
  assert.throws(()=>exactPagesAttemptStep(both,{...recoveryIdentity,attemptId:'pages-recovery-1-999'}),/identity/);
}
