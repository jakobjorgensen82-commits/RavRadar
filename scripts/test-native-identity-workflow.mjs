import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { NATIVE_IDENTITY_ORIGINAL_PROGRESS } from './native-sampling-identity-recovery-prewrite.mjs';

const read = async name => (await fs.readFile(new URL('../.github/workflows/' + name, import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const manual = await read('run-current-weather-once.yml'), build = await read('reusable-weather-build.yml');
function step(source, idOrName) {
  const blocks = source.split(/(?=^      - (?:name|uses):)/m).slice(1);
  const selected = blocks.filter(block => block.startsWith('      - name: ' + idOrName + '\n')
    || block.includes('\n        id: ' + idOrName + '\n'));
  assert.equal(selected.length,1,'One actual workflow step: '+idOrName);
  return selected[0].split(/\n(?=  [a-z][a-z-]*:)/)[0];
}
function condition(block) {
  const match = block.match(/^        if: (.+)$/m); assert(match,'Actual step condition'); return match[1];
}
function evaluate(expression, context) {
  const translated = expression.replace(/\b(steps|needs)\.([a-zA-Z0-9_-]+)/g,(_,root,key)=>`${root}[${JSON.stringify(key)}]`);
  assert(!translated.includes('${{'),'Only the actual plain boolean condition grammar in this route');
  return Function('inputs','steps','github','needs','cancelled',`"use strict";return (${translated});`)(
    context.inputs,context.steps,context.github,context.needs,()=>context.cancelled);
}

test('actual native workflow conditions preserve default-off restore and exact SQL-job ordering',()=>{
  for(const source of [manual,build]) assert.match(source,/      native_sampling_identity_original_recovery:\n(?:        [^\n]+\n)*?        default: false/);
  const oldRestore = condition(step(build,'component-progress-cache'));
  const newRestore = condition(step(build,'native-identity-progress-cache'));
  const newInstall = condition(step(build,'native-identity-runtime-install'));
  let cases=0;
  for(const enabled of [false,true]) for(const shouldRun of ['false','true'])
    for(const privateInstall of ['failure','success']) for(const reused of ['false','true'])
      for(const quick of [false,true]) for(const source of ['',NATIVE_IDENTITY_ORIGINAL_PROGRESS.source]) {
        const context={inputs:{native_sampling_identity_original_recovery:enabled,quick_confirmation:quick,quick_progress_source:source},
          steps:{preflight:{outputs:{should_run:shouldRun}},'private-runtime-install':{outcome:privateInstall},
            'weather-source-handoff':{outputs:{reused}}},github:{ref:'refs/heads/main',event_name:'workflow_dispatch'}};
        assert.equal(evaluate(newRestore,context),enabled&&shouldRun==='true');
        assert.equal(evaluate(newInstall,context),enabled&&shouldRun==='true');
        assert.equal(evaluate(oldRestore,context),!enabled&&privateInstall==='success'&&reused!=='true');
        cases++;
      }
  assert.equal(cases,64);
  const job=manual.slice(manual.indexOf('  build-and-prepare:'),manual.indexOf('  deploy-pages:'));
  assert(job.includes('needs: [current-main-target, native-identity-prewrite]'));
  const start=job.indexOf('    if: >-\n'),end=job.indexOf('\n    ',start+13);
  const expression=job.slice(start+'    if: >-\n'.length,end).trim().replace(/\n\s*/g,' ');
  // Consume all continuation lines of this particular folded scalar.
  const folded=job.match(/    if: >-\n((?:      [^\n]*\n)+)/); assert(folded);
  const actual=folded[1].trim().replace(/\n\s*/g,' '); assert(actual.includes(expression));
  for(const enabled of [false,true]) for(const result of ['success','failure','cancelled','skipped'])
    for(const target of ['success','failure']) for(const cancelled of [false,true]) {
      const context={inputs:{native_sampling_identity_original_recovery:enabled},needs:{'current-main-target':{result:target},
        'native-identity-prewrite':{result}},cancelled};
      assert.equal(evaluate(actual,context),!cancelled&&target==='success'&&result===(enabled?'success':'skipped'));
    }
  assert(manual.includes('group: ravradar-weather-production-v2\n  queue: max\n  cancel-in-progress: false'));
});

test('actual build scope guard rejects every different recovery input before private work',()=>{
  const guard=step(build,'Require the fixed native-identity recovery scope before any recovery work');
  const code=guard.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\n          NODE/)[1].replace(/^          /gm,'');
  const environment={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',QUICK_CONFIRMATION:'false',
    CHECKPOINT_ONLY:'true',PRODUCE_HANDOFF:'false',EXTENDED_BOOTSTRAP:'false',
    QUICK_PROGRESS_SOURCE:NATIVE_IDENTITY_ORIGINAL_PROGRESS.source,
    RAVRADAR_PRODUCTION_TARGET_HOUR:NATIVE_IDENTITY_ORIGINAL_PROGRESS.target.replace('.000Z','Z')};
  const run=env=>spawnSync(process.execPath,['--input-type=module'],{input:code,encoding:'utf8',env:{...process.env,...env}});
  const positive=run(environment); assert.equal(positive.status,0,positive.stderr);
  for(const [key,value] of Object.entries({GITHUB_EVENT_NAME:'schedule',GITHUB_REF:'refs/heads/other',QUICK_CONFIRMATION:'true',
    CHECKPOINT_ONLY:'false',PRODUCE_HANDOFF:'true',EXTENDED_BOOTSTRAP:'true',QUICK_PROGRESS_SOURCE:'other',
    RAVRADAR_PRODUCTION_TARGET_HOUR:'2026-10-15T17:00:00Z'})) {
    const result=run({...environment,[key]:value}); assert.notEqual(result.status,0,key);
  }
});

test('actual recovery preserves original B, genuine old GCM and new workspace capture without granting SQL to build',()=>{
  const cache=step(build,'native-identity-progress-cache'),install=step(build,'native-identity-runtime-install');
  assert(cache.includes('key: '+NATIVE_IDENTITY_ORIGINAL_PROGRESS.key)); assert(!cache.includes('restore-keys:'));
  assert(cache.includes('fail-on-cache-miss: true')); assert(!install.includes('SUPABASE_DB_PASSWORD'));
  assert(install.indexOf('install-native-identity-checkpoint-runtime.mjs install')<install.indexOf('verifyInstalledNativeIdentityCheckpointRuntime()'));
  assert(install.includes('RAVRADAR_NATIVE_IDENTITY_ORIGINAL_BUNDLE='));
  assert(!install.includes('RAVRADAR_PRIVATE_RUNTIME_BUNDLE='));
  const progress=step(build,'component-progress-restore');
  const branch=progress.slice(progress.indexOf('if test'),progress.indexOf('protected_bundle_sha256='));
  assert(branch.includes('install-native-identity-checkpoint-runtime.mjs verify'));
  assert(branch.includes('captured=true')); assert(branch.includes('exit 0'));
  assert(!branch.includes('status:')); assert(!branch.includes('restored=true'));
  const required=step(build,'Require recovered progress before short confirmation');
  assert(required.includes('steps.native-identity-progress-cache.outputs.cache-matched-key'));
  assert(required.includes('RAVRADAR_NATIVE_IDENTITY_OLD_GCM_REPORT'));
  assert(required.includes('assertUsableDmiProgressRecovery(report.dmiProgress, { allowAbsent: true })'));
  assert(step(build,'Require the authenticated original hour before provider-free continuation').includes('RAVRADAR_NATIVE_IDENTITY_OLD_GCM_REPORT'));
  const database=step(manual,'Authenticate originals and serially verify sole230 then sole native-identity SQL');
  assert(database.includes('env -u SUPABASE_DB_PASSWORD node scripts/native-sampling-identity-recovery-prewrite.mjs'));
  for(const phase of ['verify-230-plan','verify-230-installed','verify-binding-plan','verify-binding-installed']) assert(database.includes('stage '+phase));
  assert(database.indexOf('stage verify-230-plan')<database.indexOf('stage verify-230-installed'));
  assert(database.indexOf('stage verify-230-installed')<database.indexOf('stage verify-binding-plan'));
  assert.equal((database.match(/db db push --linked --skip-vault/g)||[]).length,2);
  assert(database.includes('NATIVE_IDENTITY_DATABASE_COMMAND_FAILED_OR_OUTCOME_UNKNOWN_DO_NOT_RETRY'));
});
