// Historical584-only CI evidence. Never call the COLD584 target on CURRENT585.
// CURRENT585 native SQL and source/builder remain mandatory earlier steps.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {sourceTreeContentSha256} from './lib/source-tree-content.mjs';
import {inverseReviewedForecastShareProjectionSourceScripts} from './lib/account-statistics-assistant-package-review.mjs';
import {requireAssistantLaterH0Release,requireAssistantPublic587SuccessorRelease,
  requireAssistantPublic588SuccessorRelease,ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE,
  requireAssistantPublic590SuccessorRelease,ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE,
  requireAssistantPublic591SuccessorRelease,ASSISTANT_PUBLIC591_SUCCESSOR_RELEASE,
  ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';
import {CURRENT586_PHASE_UPLOAD,inverseCurrent586PhaseUpload,verifyCurrent586PhaseReceipt,
  verifyAssistantLaterH0PhaseReceipt,verifyAssistantPublic587SuccessorPhaseReceipt,
  verifyAssistantPublic588SuccessorPhaseReceipt,verifyAssistantPublic590SuccessorPhaseReceipt,verifyAssistantPublic591SuccessorPhaseReceipt,
  verifyAssistantPublic591V2PhaseReceipt} from './native-postgres-evidence.mjs';

export const ORIGIN=Object.freeze({
  repository:'jakobjorgensen82-commits/RavRadar',pullRequest:671,
  run:39216632584,attempt:1,job:117941905389,
  head:'ee029982538c67dea39880bc7b33f3508c10cf9c',
  tree:'400babda9377e43ea7ee1444008f7accd1aded32',
  content:'sha256:f16b65e3a8ef411549b0110e016ea7fee019b1b2e967df0c6568f180f478ac59',
  branch:'codex/cold-scalar-codec-after664',createdAt:'2026-10-19T07:32:22Z',
  stepStartedAt:'2026-10-19T07:57:28Z',stepCompletedAt:'2026-10-19T08:09:04Z',
  artifact:12171746508,zipBytes:1706,
  zipSha256:'75416a6fe5389e0d4c39e8349c7e65eb47987620f91313497a9ef291a51790d1',
  proofBytes:2941,proofSha256:'9f23f70f3f45565d1f984d979d9eb54bf5b699e551c43858ec92618968f4e2c1',
});
export const WORKFLOW='.github/workflows/validate-pull-request.yml';
export const JOB='Source validation and release gate';
export const STEP='Validate isolated restart and two ordinary national followers';
export const TARGET='scripts/test-last-mile-enclosure-restart-archive-origin.mjs';
export const ARGV=Object.freeze(['--max-old-space-size=6144',TARGET,'--national']);
export const COMMAND='node '+ARGV.join(' ');
export const SOURCE_ARGV=Object.freeze([TARGET]);
export const SOURCE_COMMAND='node '+SOURCE_ARGV.join(' ');
export const CURRENT585_ROOT_TARGET='scripts/test-account-statistics-assistant-callers.mjs';
export const CURRENT585_SOURCE_COMMAND='node scripts/build-account-statistics-assistant-successor.mjs --check && node --test '+CURRENT585_ROOT_TARGET;
export const CURRENT586_PREDECESSOR_SOURCE_COMMAND='node --test scripts/test-account-statistics-assistant-callers.mjs';
export const CURRENT586_ROOT_TARGET='scripts/test-native-original-continuity-callers.mjs';
export const CURRENT586_SOURCE_COMMAND='node scripts/build-native-original-continuity-successor.mjs --check && node --test scripts/test-native-original-continuity-callers.mjs';
export const CURRENT585_NATIVE_COMMANDS=Object.freeze([
  'node scripts/run-frozen-native0600-source-targets.mjs policy',
  'node scripts/test-protected-ravscore-continuation-checkpoint.mjs --native-statistics-revision --native-sampling-identity --current-memory-warmup --established-native-current-origin --last-mile-enclosure --account-statistics-assistant',
]);
export const CURRENT586_NATIVE_COMMANDS=Object.freeze([CURRENT585_NATIVE_COMMANDS[0],CURRENT585_NATIVE_COMMANDS[1]+' --native-original-continuity']);
export const ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND='node --test '+CURRENT586_ROOT_TARGET;
export const ASSISTANT_LATER_H0_SOURCE_COMMAND='node scripts/build-assistant-later-h0-successor.mjs --check';
export const ASSISTANT_LATER_H0_NATIVE_COMMANDS=Object.freeze([CURRENT586_NATIVE_COMMANDS[0],CURRENT586_NATIVE_COMMANDS[1]+' --assistant-later-h0']);
export const ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND='node scripts/build-assistant-later-h0-successor.mjs --public587-successor --check';
export const ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS=Object.freeze([ASSISTANT_LATER_H0_NATIVE_COMMANDS[0],ASSISTANT_LATER_H0_NATIVE_COMMANDS[1]+' --assistant-public587-successor']);

// Egen kalender588→590-kontrol. Gamle kommando-/receiptidentiteter ovenfor er uændrede.
export const ASSISTANT_PUBLIC588_SUCCESSOR_SOURCE_COMMAND='node scripts/build-assistant-later-h0-successor.mjs --active --check';
export const ASSISTANT_PUBLIC588_SUCCESSOR_NATIVE_COMMANDS=Object.freeze([
  ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS[0],
  ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS[1]+' --assistant-public588-successor']);
export const ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND='node scripts/build-assistant-later-h0-successor.mjs --active --check';
export const ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_COMMANDS=Object.freeze([
  ASSISTANT_PUBLIC588_SUCCESSOR_NATIVE_COMMANDS[0],
  ASSISTANT_PUBLIC588_SUCCESSOR_NATIVE_COMMANDS[1]+' --assistant-public590-successor']);

export const ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND='node scripts/build-assistant-later-h0-successor.mjs --active --check';
export const ASSISTANT_PUBLIC591_SUCCESSOR_NATIVE_COMMANDS=Object.freeze([
  ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_COMMANDS[0],
  ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_COMMANDS[1]+' --assistant-public591-successor']);

export const BEFORE_BLOCK='      - name: '+STEP+'\n        run: '+COMMAND+'\n';
export const AFTER_BLOCK=[
  '      - name: '+STEP,'        shell: bash','        env:',
  '          GITHUB_TOKEN: $'+'{{ github.token }}',
  '          SOURCE_GATE_HEAD_SHA: $'+'{{ github.event.pull_request.head.sha }}',
  '          PULL_REQUEST_NUMBER: $'+'{{ github.event.pull_request.number }}',
  '        run: node scripts/national584-source-evidence.mjs','',
].join('\n');
export const BEFORE_JOB="  validate:\n    name: Source validation and release gate\n    runs-on: ubuntu-24.04\n    timeout-minutes: 75\n    steps:\n";
export const AFTER_JOB=BEFORE_JOB.replace('timeout-minutes: 75','timeout-minutes: 90');
// Registered genuine90/120 predecessors. The interrupted120-minute source job
// needed40m native SQL,32m source and45m full public stage, before later gates.
// Only the exact180-minute PR job is current; no weather/provider budget changes.
export const REVIEWED120_JOB=AFTER_JOB.replace('timeout-minutes: 90','timeout-minutes: 120');
export const CURRENT_JOB=REVIEWED120_JOB.replace('timeout-minutes: 120','timeout-minutes: 180');
export const REVIEWED_SOURCE_RUN_LINE='        run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs\n';
export const CURRENT_SOURCE_RUN_LINE='        run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs && node scripts/test-prepare-candidate-g-operational-rollback.mjs && node scripts/test-candidate-g-rollback-public-stage.mjs\n';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sha=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const lf=value=>String(value).replace(/\r\n/g,'\n');
const one=rows=>{assert.equal(rows.length,1);return rows[0];};
const successful=row=>row?.status==='completed'&&row.conclusion==='success';
const complete=(value,key)=>Number.isSafeInteger(value?.total_count)&&value.total_count>=0
  &&value.total_count<=100&&Array.isArray(value[key])&&value[key].length===value.total_count;
const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{encoding:'utf8',maxBuffer:64*1024*1024,timeout:30000}).trim();
const content=ref=>sourceTreeContentSha256(ref,{git:(args,options={})=>execFileSync('git',['-C',ROOT,...args],{
  maxBuffer:512*1024*1024,timeout:30000,...options,
})});
const environmentOverrides=()=>Object.keys(process.env).filter(key=>
  /^(?:RAVRADAR_|NODE_OPTIONS$|NODE_PATH$|LD_PRELOAD$|PYTHONPATH$|PYTHONHOME$|GIT_(?:OBJECT|ALTERNATE|REPLACE|CONFIG|DIR$|WORK_TREE$|COMMON_DIR$|INDEX_FILE$|SHALLOW_FILE$|GRAFT_FILE$))/.test(key)).sort();
async function requireSourceEnvironment(){
  assert.deepEqual(process.execArgv,[],'The evidence wrapper has no loader or argument override');
  assert.deepEqual(environmentOverrides(),[],'Frozen execution must not inherit source/runtime overrides');
  assert.equal(await fs.realpath(process.cwd()),await fs.realpath(ROOT),'Run from the actual repository root');
  const raw=await fs.readFile(path.join(ROOT,'scripts/lib/source-tree-content.mjs'));
  assert.equal(sha(lf(raw)),'ebf2c31976600c9c72ee87465791c683b88bb9980f5cf0262a05d977cc8c87c3');
  const grafts=git('rev-parse','--git-path','info/grafts');
  await assert.rejects(fs.access(path.resolve(ROOT,grafts)),error=>error.code==='ENOENT');
}
const frozen=[
  ['044d3045fecc2e70d6f35f60010921c6bd597ecc','4c56c3b73633bf3a5e1540e4f53e75be49f0b9da'],
  ['60d999a68136c43acb4d3664bbd66eed47283bb2','ead5743dd9098035b0de5f748de2009460506971'],
  ['d7b31aa3c706e2f657fe5de99c56434f3cff260d','9d05b060dba9015233a368c63438a3dfd9b9b45d'],
  ['d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7','0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0'],
  [ORIGIN.head,ORIGIN.tree],
];
export function requireHistoricalSource() {
  assert.equal(git('rev-parse','--is-shallow-repository'),'false');
  assert.equal(git('for-each-ref','refs/replace'),'');
  for(const [head,tree]of frozen)assert.equal(git('rev-parse',head+'^{tree}'),tree);
  const raw=file=>execFileSync('git',['-C',ROOT,'show',ORIGIN.head+':'+file],{maxBuffer:8*1024*1024});
  assert.equal(sha(raw(TARGET)),'976239c3f8403634ab0bd0abb479f9c61e715d932e134d813bfc746dda3722e1');
  assert.equal(sha(raw(WORKFLOW)),'55bd264d8cc8fb7301d6b403f7035f644625d08528514fab3200e7e435f1d2d0');
  assert.equal(sha(raw('scripts/lib/source-tree-content.mjs')),'ebf2c31976600c9c72ee87465791c683b88bb9980f5cf0262a05d977cc8c87c3');
  assert.equal(content(ORIGIN.head),ORIGIN.content);
  assert.equal(lf(raw(WORKFLOW)).split(BEFORE_BLOCK).length,2);
  return {head:ORIGIN.head,tree:ORIGIN.tree,content:ORIGIN.content,frozenGitTrees:frozen};
}
export function verifyReviewed90Workflow(source) {
  source=lf(source);assert.equal(source.split(AFTER_BLOCK).length,2);
  assert.equal(source.split(AFTER_JOB).length,2,'Only the exact reviewed current90-minute source job is admitted');
  const restored=source.replace(AFTER_BLOCK,BEFORE_BLOCK).replace(AFTER_JOB,BEFORE_JOB);
  assert.equal(sha(Buffer.from(restored)),
    '55bd264d8cc8fb7301d6b403f7035f644625d08528514fab3200e7e435f1d2d0',
    'Only this exact CI step and reviewed75-to90 source-job header may differ from the verified old workflow');
  assert(source.indexOf('Validate source contracts and release governance')<source.indexOf(AFTER_BLOCK));
  assert(source.indexOf('Require validated source tree to remain unchanged')>source.indexOf(AFTER_BLOCK));
}
export function inverseCandidatePublicSourceRunLine(source) {
  source=lf(source);
  assert.equal(source.split(CURRENT_SOURCE_RUN_LINE).length,2,
    'Only the exact once appended Candidate source-PR test runline is admitted');
  return source.replace(CURRENT_SOURCE_RUN_LINE,REVIEWED_SOURCE_RUN_LINE);
}

// Exact source-before-PG permutation only. Historical whole-workflow oracles
// still receive their genuine bytes; no command, gate or old hash is repinned.
export const SOURCE_BEFORE_POSTGRES_BLOCK="      - name: Validate source contracts and release governance\n        run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs && node scripts/test-prepare-candidate-g-operational-rollback.mjs && node scripts/test-candidate-g-rollback-public-stage.mjs\n\n      # Reject source-contract regressions before the native PostgreSQL matrix.\n      # All the same gates must succeed; only their execution order changes.\n      - name: Validate native PostgreSQL checkpoint CAS on artificial data only\n        shell: bash\n        env:\n          GITHUB_TOKEN: ${{ github.token }}\n          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}\n        run: |\n          set -euo pipefail\n          node --test scripts/test-native-postgres-evidence.mjs\n          node scripts/native-postgres-evidence.mjs\n\n      - name: Upload independently completed native586 PostgreSQL phase\n        uses: actions/upload-artifact@v7\n        with:\n          name: native586-phase-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.event.pull_request.head.sha }}\n          path: .cache/native-postgres-phase-proof.json\n          if-no-files-found: error\n          retention-days: 30\n\n";
const REVIEWED_POSTGRES_BEFORE_SOURCE_BLOCK="      # Diagnose the short native SQL boundary before the long source matrix.\n      # All the same gates must succeed; only their execution order changes.\n      - name: Validate native PostgreSQL checkpoint CAS on artificial data only\n        shell: bash\n        env:\n          GITHUB_TOKEN: ${{ github.token }}\n          SOURCE_GATE_HEAD_SHA: ${{ github.event.pull_request.head.sha }}\n          PULL_REQUEST_NUMBER: ${{ github.event.pull_request.number }}\n        run: |\n          set -euo pipefail\n          node --test scripts/test-native-postgres-evidence.mjs\n          node scripts/native-postgres-evidence.mjs\n\n      - name: Upload independently completed native586 PostgreSQL phase\n        uses: actions/upload-artifact@v7\n        with:\n          name: native586-phase-${{ github.run_id }}-${{ github.run_attempt }}-${{ github.event.pull_request.head.sha }}\n          path: .cache/native-postgres-phase-proof.json\n          if-no-files-found: error\n          retention-days: 30\n\n      - name: Validate source contracts and release governance\n        run: npm run validate:source && node scripts/test-fixed-public-rate-log-20261013.mjs && node scripts/test-fixed-storage-upload-log-20261013.mjs && node scripts/test-fixed-public-rate-console-log-20261015.mjs && node scripts/test-prepare-candidate-g-operational-rollback.mjs && node scripts/test-candidate-g-rollback-public-stage.mjs\n\n";
export function inverseSourceBeforePostgresWorkflow(source) {
  source=lf(source);
  for(const name of ['Validate source contracts and release governance',
    'Validate native PostgreSQL checkpoint CAS on artificial data only',CURRENT586_PHASE_UPLOAD])
    assert.equal(source.split('      - name: '+name+'\n').length,2,
      'Exactly one unchanged source/native/upload step is required before the order inverse');
  assert.equal(source.split(SOURCE_BEFORE_POSTGRES_BLOCK).length,2,
    'Only the exact source-before-PG permutation and reviewed comment may be inverted');
  assert.equal(source.includes("      # Diagnose the short native SQL boundary before the long source matrix.\n"),false,
    'The superseded order comment must not remain in the current workflow');
  return source.replace(SOURCE_BEFORE_POSTGRES_BLOCK,REVIEWED_POSTGRES_BEFORE_SOURCE_BLOCK);
}
export function verifyWorkflow(source) {
  source=lf(source);
  if(source.includes("      # Reject source-contract regressions before the native PostgreSQL matrix.\n"))source=inverseSourceBeforePostgresWorkflow(source);
  if(source.includes('      - name: '+CURRENT586_PHASE_UPLOAD+'\n'))source=inverseCurrent586PhaseUpload(source);
  assert.equal(source.split(CURRENT_JOB).length,2,'Only the exact reviewed current180-minute source PR job is admitted');
  verifyReviewed90Workflow(inverseCandidatePublicSourceRunLine(source).replace(CURRENT_JOB,AFTER_JOB));
}
export function verifyOrigin(run,jobs) {
  assert.equal(run.id,ORIGIN.run);assert.equal(run.run_attempt,1);
  assert.equal(run.head_sha,ORIGIN.head);assert.equal(run.path,WORKFLOW);
  assert.equal(run.event,'pull_request');assert.equal(run.repository?.full_name,ORIGIN.repository);
  assert.equal(run.head_repository?.full_name,ORIGIN.repository);
  assert.equal(run.head_branch,ORIGIN.branch);assert.equal(run.created_at,ORIGIN.createdAt);
  assert(successful(run));assert(complete(jobs,'jobs'));
  const job=one(jobs.jobs.filter(row=>row.id===ORIGIN.job&&row.name===JOB));
  assert.equal(job.run_id,ORIGIN.run);assert.equal(job.run_attempt,1);assert.equal(job.head_sha,ORIGIN.head);
  assert(successful(job));assert(job.steps.length>=21&&job.steps.every(successful));
  const step=one(job.steps.filter(row=>row.name===STEP));
  assert.equal(step.number,17);assert.equal(step.started_at,ORIGIN.stepStartedAt);
  assert.equal(step.completed_at,ORIGIN.stepCompletedAt);assert(successful(step));
  for(const name of ['Require exact pull-request source head','Require validated source tree to remain unchanged','Upload tree-content source validation proof'])
    assert(successful(one(job.steps.filter(row=>row.name===name))));
  // Closed PR association can disappear. Actual repo/head/tree/job/artifact,
  // not run.pull_requests, authenticates this immutable historical execution.
  return step;
}
function runtime() {
  const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',timeout:10000}).trim();
  return {platform:process.platform,arch:process.arch,imageOS:process.env.ImageOS,imageVersion:process.env.ImageVersion,
    node:process.version,python:command('python',['--version']),pythonLocation:process.env.pythonLocation,
    ldLibraryPath:process.env.LD_LIBRARY_PATH,git:command('git',['--version']),
    overrides:environmentOverrides()};
}
export function verifyRuntime(current,prior) {
  for(const key of ['platform','arch','imageOS','imageVersion','node','python','pythonLocation','ldLibraryPath','git'])
    assert.equal(current[key],prior[key],'Historical national runtime prerequisite changed: '+key);
  assert.deepEqual(current.overrides,[]);
  assert.equal(current.platform,'linux');assert.equal(current.arch,'x64');
  assert.equal(current.imageOS,'ubuntu24');assert.equal(current.node,'v22.23.3');
}
export function verifyReviewed585Package(pkg){
  assert.equal(pkg.version,'4.0.585');
  assert.equal(pkg.scripts['test:account-statistics-assistant-source'],CURRENT585_SOURCE_COMMAND);
  const commands=pkg.scripts['test:ravscore-source-critical'].split(' && ');
  const marker='npm run test:account-statistics-assistant-source';
  assert.equal(commands.filter(command=>command===marker).length,1);
  assert.equal(commands[commands.indexOf(marker)-1],'npm run test:last-mile-enclosure');
  assert.equal(Object.values(pkg.scripts).join('\n').split(CURRENT585_ROOT_TARGET).length,2,
    'Exactly one normal current585 caller target must remain in the package');
  assert.equal(pkg.scripts['test:last-mile-enclosure'].split('node scripts/national584-source-evidence.mjs source').length,2);
}
export function verifyAssistantLaterH0Package(pkg){
  assert.equal(pkg.version,requireAssistantLaterH0Release(),'Only the actual fixed issued assistant release');
  assert.equal(sha(JSON.stringify(Object.keys(pkg.scripts).sort().map(key=>[key,pkg.scripts[key]]))),'9df85408955c0449c92370f1af4451ff475f4cc10a4e92bcb440790793bda997','Whole reviewed NEXT source command plan');
  assert.equal(pkg.scripts['test:account-statistics-assistant-source'],CURRENT586_PREDECESSOR_SOURCE_COMMAND);
  assert.equal(pkg.scripts['test:native-original-continuity-source'],ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND);
  assert.equal(pkg.scripts['test:assistant-later-h0-source'],ASSISTANT_LATER_H0_SOURCE_COMMAND);
  const commands=pkg.scripts['test:ravscore-source-critical'].split(' && ');
  const asa='npm run test:account-statistics-assistant-source',native='npm run test:native-original-continuity-source',
    next='npm run test:assistant-later-h0-source';
  for(const command of [asa,native,next])assert.equal(commands.filter(c=>c===command).length,1);
  assert.equal(commands[commands.indexOf(asa)-1],'npm run test:last-mile-enclosure');
  assert.equal(commands[commands.indexOf(asa)+1],native);
  assert.equal(commands[commands.indexOf(native)+1],next);
  assert.equal(commands[commands.indexOf(next)+1],'node scripts/sync-ravscore-model-binding.mjs --check');
  for(const target of [CURRENT585_ROOT_TARGET,CURRENT586_ROOT_TARGET])
    assert.equal(Object.values(pkg.scripts).join('\n').split(target).length,2,'Each genuine prior/current caller target remains once');
  assert.equal(pkg.scripts['test:last-mile-enclosure'].split('node scripts/national584-source-evidence.mjs source').length,2);
}
export function verifyAssistantPublic587SuccessorPackage(pkg){
  assert.equal(pkg.version,requireAssistantPublic587SuccessorRelease(),'Only the fixed issued public587 successor release');
  assert.equal(sha(JSON.stringify(Object.keys(pkg.scripts).sort().map(key=>[key,pkg.scripts[key]]))),'fe8e112b4e4e30d948aeecf764db02369bdfc90ba1d0d681af5733b27443b06b','Whole reviewed public587 successor source command plan');
  assert.equal(pkg.scripts['test:assistant-later-h0-source'],ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND);
  // Exact one-command inverse; every older plan byte and assertion survives.
  verifyAssistantLaterH0Package({...pkg,version:requireAssistantLaterH0Release(),
    scripts:{...pkg.scripts,'test:assistant-later-h0-source':ASSISTANT_LATER_H0_SOURCE_COMMAND}});
}
export function verifyAssistantPublic588SuccessorPackage(pkg){
  assert.equal(ACTIVE.sourcePhase,'assistant-public588-successor');
  assert.equal(pkg.version,requireAssistantPublic588SuccessorRelease(),'Only the actual issued calendar588 successor release');
  assert.equal(sha(JSON.stringify(Object.keys(pkg.scripts).sort().map(key=>[key,pkg.scripts[key]]))),
    'ecd611d8379143b1a046eb7f77c422a6f8bab9aae72847ec90ec6416afb2c563','Whole reviewed calendar588 successor source command plan');
  assert.equal(pkg.scripts['test:assistant-later-h0-source'],ASSISTANT_PUBLIC588_SUCCESSOR_SOURCE_COMMAND);
  // Kun en DATA-planinverse. Ingen gammel SQL-/nativeeksekvering ommærkes.
  verifyAssistantPublic587SuccessorPackage({...pkg,version:requireAssistantPublic587SuccessorRelease(),
    scripts:{...pkg.scripts,'test:assistant-later-h0-source':ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}});
}
export function verifyAssistantPublic590SuccessorPackage(pkg){
  assert.equal(ACTIVE.sourcePhase,'assistant-public590-successor');
  assert.equal(pkg.version,requireAssistantPublic590SuccessorRelease(),'Only the actual issued assistant590 successor release');
  assert.equal(sha(JSON.stringify(Object.keys(pkg.scripts).sort().map(key=>[key,pkg.scripts[key]]))),
    'ecd611d8379143b1a046eb7f77c422a6f8bab9aae72847ec90ec6416afb2c563','Whole reviewed assistant590 successor source command plan');
  assert.equal(pkg.scripts['test:assistant-later-h0-source'],ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND);
  // Kun en DATA-planinverse. Ingen gammel SQL-/nativeeksekvering ommærkes.
  verifyAssistantPublic587SuccessorPackage({...pkg,version:requireAssistantPublic587SuccessorRelease(),
    scripts:{...pkg.scripts,'test:assistant-later-h0-source':ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}});
}

export function verifyAssistantPublic591SuccessorPackage(pkg){
  assert.equal(ACTIVE.sourcePhase,'assistant-public591-successor');
  assert.equal(pkg.version,requireAssistantPublic591SuccessorRelease(),'Only the actual issued assistant591 successor release');
  const scripts=inverseReviewedForecastShareProjectionSourceScripts(pkg.scripts);
  assert.equal(sha(JSON.stringify(Object.keys(scripts).sort().map(key=>[key,scripts[key]]))),
    'ecd611d8379143b1a046eb7f77c422a6f8bab9aae72847ec90ec6416afb2c563','Whole reviewed assistant591 successor source command plan');
  assert.equal(pkg.scripts['test:assistant-later-h0-source'],ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND);
  // Kun en DATA-planinverse. Ingen gammel SQL-/nativeeksekvering ommærkes.
  verifyAssistantPublic587SuccessorPackage({...pkg,version:requireAssistantPublic587SuccessorRelease(),
    scripts:{...scripts,'test:assistant-later-h0-source':ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND}});
}
export function verifyPackage(pkg){
  if(ACTIVE.sourcePhase==='assistant-public591-successor')return verifyAssistantPublic591SuccessorPackage(pkg);
  if(ACTIVE.sourcePhase==='assistant-public590-successor')return verifyAssistantPublic590SuccessorPackage(pkg);
  if(pkg.version==='4.0.588')return verifyAssistantPublic587SuccessorPackage(pkg);
  if(pkg.scripts?.['test:assistant-later-h0-source']===ASSISTANT_PUBLIC588_SUCCESSOR_SOURCE_COMMAND)
    return verifyAssistantPublic588SuccessorPackage(pkg);
  if(Object.hasOwn(pkg.scripts??{},'test:assistant-later-h0-source'))return verifyAssistantLaterH0Package(pkg);
  if(pkg.version==='4.0.585')return verifyReviewed585Package(pkg);
  assert.equal(pkg.version,'4.0.586');
  assert.equal(pkg.scripts['test:account-statistics-assistant-source'],CURRENT586_PREDECESSOR_SOURCE_COMMAND);
  assert.equal(pkg.scripts['test:native-original-continuity-source'],CURRENT586_SOURCE_COMMAND);
  const commands=pkg.scripts['test:ravscore-source-critical'].split(' && ');
  const asa='npm run test:account-statistics-assistant-source',native='npm run test:native-original-continuity-source';
  assert.equal(commands.filter(c=>c===asa).length,1);assert.equal(commands.filter(c=>c===native).length,1);
  assert.equal(commands[commands.indexOf(asa)-1],'npm run test:last-mile-enclosure');
  assert.equal(commands[commands.indexOf(asa)+1],native);
  assert.equal(commands[commands.indexOf(native)+1],'node scripts/sync-ravscore-model-binding.mjs --check');
  for(const target of [CURRENT585_ROOT_TARGET,CURRENT586_ROOT_TARGET])
    assert.equal(Object.values(pkg.scripts).join('\n').split(target).length,2,'Each genuine585/current586 source target remains once');
  assert.equal(pkg.scripts['test:last-mile-enclosure'].split('node scripts/national584-source-evidence.mjs source').length,2);
}
// Den samme normale CI-reader kalder denne eksakte nye fasekontrol.
// Rent receipt-input er ikke selv PostgreSQL-, runtime- eller produktionsautoritet.
export function verifyAssistantPublic588SuccessorNativeContext(native,current,version){
  assert.equal(ACTIVE.sourcePhase,'assistant-public588-successor');
  assert.equal(version,requireAssistantPublic588SuccessorRelease());
  verifyCurrentNativeCommands(native.commands,version);
  return verifyAssistantPublic588SuccessorPhaseReceipt(native,current);
}
export function verifyAssistantPublic590SuccessorNativeContext(native,current,version){
  assert.equal(ACTIVE.sourcePhase,'assistant-public590-successor');
  assert.equal(version,requireAssistantPublic590SuccessorRelease());
  verifyCurrentNativeCommands(native.commands,version);
  return verifyAssistantPublic590SuccessorPhaseReceipt(native,current);
}

export function verifyAssistantPublic591SuccessorNativeContext(native,current,version){
  assert.equal(ACTIVE.sourcePhase,'assistant-public591-successor');
  assert.equal(version,requireAssistantPublic591SuccessorRelease());
  verifyCurrentNativeCommands(native.commands,version);
  return native?.schemaVersion===2?verifyAssistantPublic591V2PhaseReceipt(native,current):verifyAssistantPublic591SuccessorPhaseReceipt(native,current);
}
export function assistantPublic591NativeClaims(native,current){
  verifyAssistantPublic591V2PhaseReceipt(native,current);
  const claim=(phase,scope)=>({status:native.status,executedInThisRun:native.executedInThisRun,
    origin:native.origin,phase,...(scope?{scope}:{}),eligibleForReuse:native.eligibleForReuse,separatelyRequired:true});
  return {
    current586PredecessorNative:claim('native-original-continuity','GENUINE_FROZEN586'),
    current587PredecessorNative:claim('assistant-later-h0','GENUINE_FROZEN587'),
    current588PredecessorNative:claim('assistant-public587-successor','GENUINE_FROZEN588'),
    current590PredecessorNative:claim('assistant-public588-successor','GENUINE_FROZEN590'),
    current591PredecessorNative:claim('assistant-public590-successor','GENUINE_FROZEN591'),
    currentAssistantPublic591SuccessorNative:claim('assistant-public591-successor'),
  };
}
export function verifyCurrentNativeCommands(commands,version){
  if(ACTIVE.sourcePhase==='assistant-public591-successor'){
    assert.equal(version,requireAssistantPublic591SuccessorRelease());
    assert.deepEqual(commands,ASSISTANT_PUBLIC591_SUCCESSOR_NATIVE_COMMANDS);return;
  }
  if(ACTIVE.sourcePhase==='assistant-public590-successor'){
    assert.equal(version,requireAssistantPublic590SuccessorRelease());
    assert.deepEqual(commands,ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_COMMANDS);return;
  }
  if(version===ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE){
    assert.equal(ACTIVE.sourcePhase,'assistant-public588-successor');
    assert.equal(version,requireAssistantPublic588SuccessorRelease());
    assert.deepEqual(commands,ASSISTANT_PUBLIC588_SUCCESSOR_NATIVE_COMMANDS);return;
  }
  if(version==='4.0.587'){
    assert.equal(version,requireAssistantLaterH0Release());assert.deepEqual(commands,ASSISTANT_LATER_H0_NATIVE_COMMANDS);return;
  }
  if(!['4.0.585','4.0.586'].includes(version)){
    assert.equal(version,requireAssistantPublic587SuccessorRelease());assert.deepEqual(commands,ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_COMMANDS);return;
  }
  assert(['4.0.585','4.0.586'].includes(version));
  assert.deepEqual(commands,version==='4.0.585'?CURRENT585_NATIVE_COMMANDS:CURRENT586_NATIVE_COMMANDS);
}
async function currentContext() {
  const env=process.env,head=git('rev-parse','HEAD^{commit}');
  assert.equal(env.GITHUB_EVENT_NAME,'pull_request');assert.equal(env.GITHUB_REPOSITORY,ORIGIN.repository);
  assert.equal(env.SOURCE_GATE_HEAD_SHA,head);assert.match(head,/^[a-f0-9]{40}$/);
  assert.equal(git('status','--porcelain','--untracked-files=no'),'');git('merge-base','--is-ancestor',ORIGIN.head,head);
  const event=JSON.parse(await fs.readFile(env.GITHUB_EVENT_PATH,'utf8'));
  assert.equal(event.pull_request?.head?.sha,head);assert.equal(event.pull_request?.head?.repo?.full_name,ORIGIN.repository);
  assert.equal(event.pull_request?.number,Number(env.PULL_REQUEST_NUMBER));
  verifyWorkflow(await fs.readFile(path.join(ROOT,WORKFLOW),'utf8'));
  const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8'));
  verifyPackage(pkg);
  const proof=JSON.parse(await fs.readFile(path.join(ROOT,'.cache/source-tree-content-proof.json'),'utf8'));
  assert.equal(proof.headSha,head);assert.equal(proof.repository,ORIGIN.repository);
  assert.equal(proof.contractId,'weather-source-gate-content-v2');assert.equal(proof.privatePayloadIncluded,false);
  assert.equal(proof.sourceTreeSha256,content('HEAD'));
  const native=proof.nativePostgres;
  if(ACTIVE.sourcePhase==='assistant-public591-successor')verifyAssistantPublic591SuccessorNativeContext(native,
    {run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
      pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:event.pull_request.head.ref},pkg.version);
  else if(ACTIVE.sourcePhase==='assistant-public590-successor')verifyAssistantPublic590SuccessorNativeContext(native,
    {run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
      pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:event.pull_request.head.ref},pkg.version);
  else if(pkg.version===ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE)verifyAssistantPublic588SuccessorNativeContext(native,
    {run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),head,
      pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:event.pull_request.head.ref},pkg.version);
  else if(pkg.version==='4.0.586')verifyCurrent586PhaseReceipt(native,{run:Number(env.GITHUB_RUN_ID),
    attempt:Number(env.GITHUB_RUN_ATTEMPT),head,pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:event.pull_request.head.ref});
  else if(pkg.version==='4.0.587')verifyAssistantLaterH0PhaseReceipt(native,{run:Number(env.GITHUB_RUN_ID),
    attempt:Number(env.GITHUB_RUN_ATTEMPT),head,pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:event.pull_request.head.ref});
  else if(pkg.version!=='4.0.585')verifyAssistantPublic587SuccessorPhaseReceipt(native,{run:Number(env.GITHUB_RUN_ID),
    attempt:Number(env.GITHUB_RUN_ATTEMPT),head,pullRequest:Number(env.PULL_REQUEST_NUMBER),branch:event.pull_request.head.ref});
  else{
  assert.equal(native?.status,'EXECUTED');assert.equal(native.executedInThisRun,true);
  assert.equal(native.current?.head,head);assert.equal(native.current?.run,Number(env.GITHUB_RUN_ID));
  assert.equal(native.current?.attempt,Number(env.GITHUB_RUN_ATTEMPT));assert.equal(native.origin,null);
  }
  verifyCurrentNativeCommands(native.commands,pkg.version);
  assert(!Object.hasOwn(proof,'historical584National'));
  return {head,run:Number(env.GITHUB_RUN_ID),attempt:Number(env.GITHUB_RUN_ATTEMPT),pullRequest:Number(env.PULL_REQUEST_NUMBER),
    branch:event.pull_request.head.ref,releaseVersion:pkg.version,proof};
}
async function authenticatedReuse(ctx) {
  const directory=await fs.mkdtemp(path.join(ROOT,'.cache/national584-evidence-'));
  const deadline=performance.now()+60000;let calls=0;
  const retain=async(response,name)=>{
    // Persist the complete response privately BEFORE status/size/JSON checks.
    // Signed redirect URLs, error bodies and headers never enter console/proof.
    await fs.writeFile(path.join(directory,name+'.response.json'),JSON.stringify({status:response.status,
      statusText:response.statusText,headers:Object.fromEntries(response.headers)})+'\n',{flag:'wx'});
    const raw=Buffer.from(await response.arrayBuffer());
    await fs.writeFile(path.join(directory,name+'.body'),raw,{flag:'wx'});
    return raw;
  };
  const get=async(route,{zip=false}={})=>{
    assert(++calls<=24);const remaining=Math.floor(deadline-performance.now());assert(remaining>0);
    const sequence=String(calls).padStart(2,'0');
    try{
    const response=await fetch('https://api.github.com'+route,{headers:{
      Authorization:'Bearer '+process.env.GITHUB_TOKEN,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    },redirect:'manual',signal:AbortSignal.timeout(Math.min(15000,remaining))});
    let final=response,raw=await retain(response,sequence+'.api');
    if(zip){
      assert.equal(response.status,302);const target=new URL(response.headers.get('location'));
      assert.equal(target.protocol,'https:');assert(!target.username&&!target.password);
      // No repository token is forwarded to GitHub's signed artifact URL.
      final=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(Math.min(15000,Math.max(1,Math.floor(deadline-performance.now()))))});
      raw=await retain(final,sequence+'.artifact');
    }
    assert(final.ok);assert(raw.length<4*1024*1024);
    return zip?raw:JSON.parse(raw);
    }catch(error){
      await fs.writeFile(path.join(directory,sequence+'.failure.json'),JSON.stringify({name:error.name,
        code:error.code??null,message:error.message,responseBodyMayBeUnavailable:true})+'\n',{flag:'wx'});
      throw error;
    }
  };
  const base='/repos/'+ORIGIN.repository+'/actions';
  assert.equal(ctx.attempt,1);
  const origin=await get(base+'/runs/'+ORIGIN.run),jobs=await get(base+'/runs/'+ORIGIN.run+'/attempts/1/jobs?per_page=100');
  verifyOrigin(origin,jobs);
  const current=await get(base+'/runs/'+ctx.run);
  assert.equal(current.head_sha,ctx.head);assert.equal(current.run_attempt,ctx.attempt);assert.equal(current.path,WORKFLOW);
  assert.equal(current.event,'pull_request');assert.equal(current.repository?.full_name,ORIGIN.repository);
  assert.equal(current.head_branch,ctx.branch);
  const currentJobs=await get(base+'/runs/'+ctx.run+'/attempts/'+ctx.attempt+'/jobs?per_page=100');
  assert(complete(currentJobs,'jobs'));const active=one(currentJobs.jobs.filter(row=>row.name===JOB));
  assert.equal(active.head_sha,ctx.head);assert.equal(active.run_id,ctx.run);assert.equal(active.run_attempt,ctx.attempt);
  for(const name of ['Validate native PostgreSQL checkpoint CAS on artificial data only','Validate source contracts and release governance'])
    assert(successful(one(active.steps.filter(row=>row.name===name))));
  const artifacts=await get(base+'/runs/'+ORIGIN.run+'/artifacts?per_page=100');assert(complete(artifacts,'artifacts'));
  const artifact=one(artifacts.artifacts.filter(row=>row.id===ORIGIN.artifact));
  assert.equal(artifact.expired,false);assert.equal(artifact.workflow_run?.id,ORIGIN.run);
  assert.equal(artifact.workflow_run?.head_sha,ORIGIN.head);
  assert.equal(artifact.digest,'sha256:'+ORIGIN.zipSha256);assert.equal(artifact.size_in_bytes,ORIGIN.zipBytes);
  const zip=await get(base+'/artifacts/'+ORIGIN.artifact+'/zip',{zip:true});
  assert.equal(zip.length,ORIGIN.zipBytes);assert.equal(sha(zip),ORIGIN.zipSha256);
  const proofRaw=execFileSync('python',['-c',
    'import io,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.namelist()==["source-tree-content-proof.json"]; i=z.infolist()[0]; assert i.file_size==2941 and not i.is_dir(); sys.stdout.buffer.write(z.read(i))',
  ],{input:zip,maxBuffer:65536,timeout:10000});
  assert.equal(proofRaw.length,ORIGIN.proofBytes);assert.equal(sha(proofRaw),ORIGIN.proofSha256);
  const proof=JSON.parse(proofRaw);assert.equal(proof.headSha,ORIGIN.head);
  assert.equal(proof.repository,ORIGIN.repository);assert.equal(proof.sourceTreeSha256,ORIGIN.content);
  assert.equal(proof.privatePayloadIncluded,false);assert.equal(proof.pullRequestNumber,ORIGIN.pullRequest);
  const observedRuntime=runtime();verifyRuntime(observedRuntime,proof.nativePostgres.runtime);
  const audits=[];
  for(const branch of [...new Set([ORIGIN.branch,ctx.branch])]){
    const query=new URLSearchParams({event:'pull_request',branch,created:'>='+ORIGIN.createdAt,per_page:'100'});
    const later=await get(base+'/workflows/validate-pull-request.yml/runs?'+query);
    assert(complete(later,'workflow_runs'));assert.equal(new Set(later.workflow_runs.map(row=>row.id)).size,later.total_count);
    if(branch===ORIGIN.branch)assert(later.workflow_runs.some(row=>row.id===ORIGIN.run));
    if(branch===ctx.branch)assert(later.workflow_runs.some(row=>row.id===ctx.run));
    for(const run of later.workflow_runs){
      assert.equal(run.path,WORKFLOW);assert.equal(run.event,'pull_request');
      assert.equal(run.repository?.full_name,ORIGIN.repository);assert.equal(run.head_branch,branch);
      if([ctx.run,ORIGIN.run].includes(run.id))continue;
      assert.equal(run.run_attempt,1);assert.equal(run.status,'completed');
      const laterJobs=await get(base+'/runs/'+run.id+'/attempts/1/jobs?per_page=100');
      assert(complete(laterJobs,'jobs'));const job=one(laterJobs.jobs.filter(row=>row.name===JOB));
      assert.equal(job.run_id,run.id);assert.equal(job.run_attempt,1);assert.equal(job.head_sha,run.head_sha);
      assert(successful(one(job.steps.filter(row=>row.name===STEP))),
        'Later failed/cancelled/skipped/unknown national requires fresh frozen execution');
    }
    audits.push({branch,runs:later.total_count,complete:true});
  }
  verifyOrigin(await get(base+'/runs/'+ORIGIN.run),await get(base+'/runs/'+ORIGIN.run+'/attempts/1/jobs?per_page=100'));
  const refreshed=await get(base+'/runs/'+ctx.run);assert.equal(refreshed.head_sha,ctx.head);assert.equal(refreshed.run_attempt,ctx.attempt);
  return {status:'REUSED',executedInThisRun:false,origin:ORIGIN,command:COMMAND,sourceScope:'HISTORICAL_584_ONLY',
    branchAudits:audits,runtime:observedRuntime,artifactSha256:ORIGIN.zipSha256};
}
async function executeHistorical({national=true}={}) {
  // Full immutable checkout binds literal/dynamic/JSON/runtime/frozen-Git inputs.
  const parent=await fs.realpath(os.tmpdir()),owned=await fs.mkdtemp(path.join(parent,'rr-national584-ci-'));
  const identity=await fs.lstat(owned,{bigint:true}),host=path.join(owned,'source584');
  execFileSync('git',['-c','core.autocrlf=false','clone','--shared','--no-hardlinks','--no-checkout',ROOT,host],{stdio:['ignore','pipe','pipe']});
  const hostGit=(...args)=>execFileSync('git',['-C',host,...args],{encoding:'utf8',maxBuffer:64*1024*1024}).trim();
  hostGit('-c','advice.detachedHead=false','checkout','--detach',ORIGIN.head);
  assert.equal(hostGit('rev-parse','HEAD'),ORIGIN.head);assert.equal(hostGit('rev-parse','HEAD^{tree}'),ORIGIN.tree);
  assert.equal(hostGit('status','--porcelain','--untracked-files=no'),'');
  const env={...process.env};
  // Local historical child, NOT a relabelled current PR event.
  for(const key of Object.keys(env))if(/^GITHUB_|^ACTIONS_|^SOURCE_GATE_|^PULL_REQUEST_NUMBER$/.test(key))delete env[key];
  const argv=national?ARGV:SOURCE_ARGV,command=national?COMMAND:SOURCE_COMMAND;
  const result=spawnSync(process.execPath,argv,{cwd:host,env,stdio:'inherit'});
  if(result.error||result.signal||result.status!==0)throw new Error(national?'FROZEN584_NATIONAL_FAILED':'FROZEN584_SOURCE_FAILED');
  assert.equal(hostGit('rev-parse','HEAD'),ORIGIN.head);assert.equal(hostGit('rev-parse','HEAD^{tree}'),ORIGIN.tree);
  assert.equal(hostGit('status','--porcelain','--untracked-files=no'),'');
  const actual=await fs.lstat(owned,{bigint:true});
  assert(actual.isDirectory()&&!actual.isSymbolicLink());assert.equal(actual.dev,identity.dev);assert.equal(actual.ino,identity.ino);
  assert.equal(await fs.realpath(owned),owned);assert.equal(path.dirname(owned),parent);
  await fs.rm(owned,{recursive:true});
  return {status:'EXECUTED',executedInThisRun:true,origin:null,command,
    sourceScope:national?'HISTORICAL_584_NATIONAL_ONLY':'HISTORICAL_584_DEFAULT_ONLY',frozenHead:ORIGIN.head,frozenTree:ORIGIN.tree};
}
async function main(){
  if(ACTIVE.sourcePhase==='assistant-public591-successor')requireAssistantPublic591SuccessorRelease();
  if(ACTIVE.sourcePhase==='assistant-public590-successor')requireAssistantPublic590SuccessorRelease();
  if(ACTIVE.sourcePhase==='assistant-public588-successor')requireAssistantPublic588SuccessorRelease();
  requireAssistantPublic587SuccessorRelease(); // Active588 never falls back to a predecessor receipt or command.
  await requireSourceEnvironment();
  const historical=requireHistoricalSource();
  const mode=process.argv[2]??'national';assert(['source','national'].includes(mode));assert(process.argv.length<=3);
  if(mode==='source'){
    // The package's old default target stays a real separate execution. It has
    // no --national, no network lookup and cannot mint a national evidence row.
    const head=git('rev-parse','HEAD^{commit}');git('merge-base','--is-ancestor',ORIGIN.head,head);
    assert.equal(git('status','--porcelain','--untracked-files=no'),'');
    const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8'));
    verifyPackage(pkg);
    await executeHistorical({national:false});
    assert.equal(git('rev-parse','HEAD'),head);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
    console.log('Historical584 DEFAULT target EXECUTED; no national or CURRENT585 transition proof claimed.');return;
  }
  assert.equal(process.platform,'linux','Normal CI host required; no Windows skip proof');
  const ctx=await currentContext();
  let result;
  try{result=await authenticatedReuse(ctx);}
  catch{result=await executeHistorical();result.reason='prior-national-evidence-unknown-different-or-conflicting';}
  assert.equal(git('rev-parse','HEAD'),ctx.head);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
  const file=path.join(ROOT,'.cache/source-tree-content-proof.json');
  const current=JSON.parse(await fs.readFile(file,'utf8'));assert.deepEqual(current,ctx.proof);
  if(ctx.releaseVersion==='4.0.585'){
  current.historical584National={...result,historicalInput:historical,
    current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
    current585Native:{status:'EXECUTED',phase:'account-statistics-assistant',separatelyRequired:true},
    current585Source:{command:'npm run test:account-statistics-assistant-source',actualCommand:CURRENT585_SOURCE_COMMAND,separatelyRequired:true},
    current585NationalExecutionClaimed:false,providerOrProductionProof:false};
  }else if(ctx.releaseVersion==='4.0.586'){
    assert.equal(ctx.releaseVersion,'4.0.586');
    current.historical584National={...result,historicalInput:historical,
      current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
      current585PredecessorSource:{command:'npm run test:account-statistics-assistant-source',
        actualCommand:CURRENT586_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN585_SOURCE_ONLY',separatelyRequired:true},
      current586Native:{status:ctx.proof.nativePostgres.status,executedInThisRun:ctx.proof.nativePostgres.executedInThisRun,
        origin:ctx.proof.nativePostgres.origin,phase:'native-original-continuity',separatelyRequired:true},
      current586Source:{command:'npm run test:native-original-continuity-source',actualCommand:CURRENT586_SOURCE_COMMAND,separatelyRequired:true},
      current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,providerOrProductionProof:false};
  }else if(ctx.releaseVersion==='4.0.587'){
    assert.equal(ctx.releaseVersion,requireAssistantLaterH0Release());
    current.historical584National={...result,historicalInput:historical,
      current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
      current585PredecessorSource:{command:'npm run test:account-statistics-assistant-source',
        actualCommand:CURRENT586_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN585_SOURCE_ONLY',separatelyRequired:true},
      current586PredecessorNative:{status:'EXECUTED',phase:'native-original-continuity',scope:'GENUINE_FROZEN586',separatelyRequired:true},
      current586PredecessorSource:{command:'npm run test:native-original-continuity-source',
        actualCommand:ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN586_SOURCE_ONLY',separatelyRequired:true},
      currentAssistantLaterH0Native:{status:'EXECUTED',phase:'assistant-later-h0',separatelyRequired:true},
      currentAssistantLaterH0Source:{command:'npm run test:assistant-later-h0-source',
        actualCommand:ASSISTANT_LATER_H0_SOURCE_COMMAND,separatelyRequired:true},
      current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
      currentAssistantLaterH0NationalExecutionClaimed:false,providerOrProductionProof:false};
  }else if(ACTIVE.sourcePhase==='assistant-public591-successor'){
    assert.equal(ACTIVE.sourcePhase,'assistant-public591-successor');
    assert.equal(ctx.releaseVersion,requireAssistantPublic591SuccessorRelease());
    current.historical584National={...result,historicalInput:historical,
      current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
      current585PredecessorSource:{command:'npm run test:account-statistics-assistant-source',
        actualCommand:CURRENT586_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN585_SOURCE_ONLY',separatelyRequired:true},
      current586PredecessorNative:{status:'EXECUTED',phase:'native-original-continuity',scope:'GENUINE_FROZEN586',separatelyRequired:true},
      current586PredecessorSource:{command:'npm run test:native-original-continuity-source',
        actualCommand:ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN586_SOURCE_ONLY',separatelyRequired:true},
      current587PredecessorNative:{status:'EXECUTED',phase:'assistant-later-h0',scope:'GENUINE_FROZEN587',separatelyRequired:true},
      current588PredecessorNative:{status:'EXECUTED',phase:'assistant-public587-successor',scope:'GENUINE_FROZEN588',separatelyRequired:true},
      current590PredecessorNative:{status:'EXECUTED',phase:'assistant-public588-successor',scope:'GENUINE_FROZEN590',separatelyRequired:true},
      current591PredecessorNative:{status:'EXECUTED',phase:'assistant-public590-successor',scope:'GENUINE_FROZEN591',separatelyRequired:true},
      currentAssistantPublic591SuccessorNative:{status:ctx.proof.nativePostgres.status,
        executedInThisRun:ctx.proof.nativePostgres.executedInThisRun,origin:ctx.proof.nativePostgres.origin,
        phase:'assistant-public591-successor',eligibleForReuse:false,separatelyRequired:true},
      currentAssistantPublic591SuccessorSource:{command:'npm run test:assistant-later-h0-source',
        actualCommand:ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true},
      current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
      currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
      currentAssistantPublic588SuccessorNationalExecutionClaimed:false,currentAssistantPublic591SuccessorNationalExecutionClaimed:false,providerOrProductionProof:false};
    if(ctx.proof.nativePostgres.schemaVersion===2)Object.assign(current.historical584National,
      assistantPublic591NativeClaims(ctx.proof.nativePostgres,ctx.proof.nativePostgres.current));
  }else if(ACTIVE.sourcePhase==='assistant-public590-successor'){
    assert.equal(ACTIVE.sourcePhase,'assistant-public590-successor');
    assert.equal(ctx.releaseVersion,requireAssistantPublic590SuccessorRelease());
    current.historical584National={...result,historicalInput:historical,
      current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
      current585PredecessorSource:{command:'npm run test:account-statistics-assistant-source',
        actualCommand:CURRENT586_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN585_SOURCE_ONLY',separatelyRequired:true},
      current586PredecessorNative:{status:'EXECUTED',phase:'native-original-continuity',scope:'GENUINE_FROZEN586',separatelyRequired:true},
      current586PredecessorSource:{command:'npm run test:native-original-continuity-source',
        actualCommand:ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN586_SOURCE_ONLY',separatelyRequired:true},
      current587PredecessorNative:{status:'EXECUTED',phase:'assistant-later-h0',scope:'GENUINE_FROZEN587',separatelyRequired:true},
      current588PredecessorNative:{status:'EXECUTED',phase:'assistant-public587-successor',scope:'GENUINE_FROZEN588',separatelyRequired:true},
      current590PredecessorNative:{status:'EXECUTED',phase:'assistant-public588-successor',scope:'GENUINE_FROZEN590',separatelyRequired:true},
      currentAssistantPublic590SuccessorNative:{status:ctx.proof.nativePostgres.status,
        executedInThisRun:ctx.proof.nativePostgres.executedInThisRun,origin:ctx.proof.nativePostgres.origin,
        phase:'assistant-public590-successor',eligibleForReuse:false,separatelyRequired:true},
      currentAssistantPublic590SuccessorSource:{command:'npm run test:assistant-later-h0-source',
        actualCommand:ASSISTANT_PUBLIC590_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true},
      current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
      currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
      currentAssistantPublic588SuccessorNationalExecutionClaimed:false,currentAssistantPublic590SuccessorNationalExecutionClaimed:false,providerOrProductionProof:false};
  }else if(ctx.releaseVersion===ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE){
    assert.equal(ACTIVE.sourcePhase,'assistant-public588-successor');
    assert.equal(ctx.releaseVersion,requireAssistantPublic588SuccessorRelease());
    current.historical584National={...result,historicalInput:historical,
      current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
      current585PredecessorSource:{command:'npm run test:account-statistics-assistant-source',
        actualCommand:CURRENT586_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN585_SOURCE_ONLY',separatelyRequired:true},
      current586PredecessorNative:{status:'EXECUTED',phase:'native-original-continuity',scope:'GENUINE_FROZEN586',separatelyRequired:true},
      current586PredecessorSource:{command:'npm run test:native-original-continuity-source',
        actualCommand:ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN586_SOURCE_ONLY',separatelyRequired:true},
      current587PredecessorNative:{status:'EXECUTED',phase:'assistant-later-h0',scope:'GENUINE_FROZEN587',separatelyRequired:true},
      current588PredecessorNative:{status:'EXECUTED',phase:'assistant-public587-successor',scope:'GENUINE_FROZEN588',separatelyRequired:true},
      currentAssistantPublic588SuccessorNative:{status:ctx.proof.nativePostgres.status,
        executedInThisRun:ctx.proof.nativePostgres.executedInThisRun,origin:ctx.proof.nativePostgres.origin,
        phase:'assistant-public588-successor',eligibleForReuse:false,separatelyRequired:true},
      currentAssistantPublic588SuccessorSource:{command:'npm run test:assistant-later-h0-source',
        actualCommand:ASSISTANT_PUBLIC588_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true},
      current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
      currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
      currentAssistantPublic588SuccessorNationalExecutionClaimed:false,providerOrProductionProof:false};
  }else{
    assert.equal(ctx.releaseVersion,requireAssistantPublic587SuccessorRelease());
    current.historical584National={...result,historicalInput:historical,
      current:{head:ctx.head,run:ctx.run,attempt:ctx.attempt,pullRequest:ctx.pullRequest},
      current585PredecessorSource:{command:'npm run test:account-statistics-assistant-source',
        actualCommand:CURRENT586_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN585_SOURCE_ONLY',separatelyRequired:true},
      current586PredecessorNative:{status:'EXECUTED',phase:'native-original-continuity',scope:'GENUINE_FROZEN586',separatelyRequired:true},
      current586PredecessorSource:{command:'npm run test:native-original-continuity-source',
        actualCommand:ASSISTANT_LATER_H0_PREDECESSOR_SOURCE_COMMAND,scope:'GENUINE_FROZEN586_SOURCE_ONLY',separatelyRequired:true},
      current587PredecessorNative:{status:'EXECUTED',phase:'assistant-later-h0',scope:'GENUINE_FROZEN587',separatelyRequired:true},
      currentAssistantPublic587SuccessorNative:{status:'EXECUTED',phase:'assistant-public587-successor',separatelyRequired:true},
      currentAssistantPublic587SuccessorSource:{command:'npm run test:assistant-later-h0-source',
        actualCommand:ASSISTANT_PUBLIC587_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true},
      current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
      currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
      providerOrProductionProof:false};
  }
  await fs.writeFile(file,JSON.stringify(current)+'\n');
  console.log('Historical584 national '+result.status+'; frozen '+ORIGIN.head+'; CURRENT585 native/source remain separate.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
