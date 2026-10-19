import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inverseArchivedWeatherRestartWorkflow} from './lib/archived-weather-restart-workflow-review.mjs';
import {lastMileEnclosureRequiredMigrations} from './integrated-cutover-readiness.mjs';
import {requireLastMileEnclosureBinding} from './lib/last-mile-enclosure-successor-source.mjs';
import {ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING} from './lib/established-native-current-origin-successor-source.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actual=fs.readFileSync(path.join(ROOT,'.github/workflows/deploy-code-only-repair.yml'),'utf8').replace(/\r\n/g,'\n');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const historical=inverseArchivedWeatherRestartWorkflow(actual);
const bashPath=['C:/Program Files/Git/bin/bash.exe','C:/Program Files/Git/usr/bin/bash.exe',
  path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/usr/bin/sh.exe'),
  '/bin/bash','/usr/bin/bash'].find(value=>fs.existsSync(value));
assert(bashPath,'A real Bash is required; no platform stub or skip is allowed');
const bashVersion=spawnSync(bashPath,['--version'],{encoding:'utf8'});
assert.equal(bashVersion.status,0);assert.match(bashVersion.stdout,/GNU bash, version /);
function steps(source){
  const start=source.indexOf('  build-code-only:\n'),end=source.indexOf('  deploy-pages:\n');
  assert(start>=0&&end>start);
  const region=source.slice(start,end),headings=[...region.matchAll(/^      - (name|uses): ([^\n]+)\n/gm)];
  return headings.flatMap((match,index)=>{
    if(match[1]!=='name')return [];
    const text=region.slice(match.index,index+1<headings.length?headings[index+1].index:region.length);
    return [{name:match[2],text,at:start+match.index,
      id:/^        id: (.+)$/m.exec(text)?.[1],if:/^        if: (.+)$/m.exec(text)?.[1]??'true'}];
  });
}
function named(source,name){const selected=steps(source).filter(value=>value.name===name);assert.equal(selected.length,1,name);return selected[0];}
function runText(step){
  const lines=step.text.split('\n'),at=lines.findIndex(line=>/^        run: [|>]-?$/.test(line));
  assert(at>=0,'Actual multiline run required: '+step.name);
  const body=[];for(let i=at+1;i<lines.length;i++){
    if(lines[i]===''){body.push('');continue;}
    if(!lines[i].startsWith('          '))break;
    body.push(lines[i].slice(10));
  }return body.join('\n').trimEnd()+'\n';
}
function context(){
  const result={inputs:{restart_archived_weather:true,upgrade_last_mile_enclosure:true,publish_newest_saved_weather:false,
    upgrade_existing_owner_export:false,upgrade_account_assistant:false,upgrade_statistics_preference_revision:false,
    upgrade_established_native_current_origin:false,recover_public_run_id:'',recover_public_run_attempt:'1'},
    env:{RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_EDGE_REQUIRED:'false',RAVRADAR_LAST_MILE_ENCLOSURE_PHASE:'before'},
    steps:{},always:()=>true,cancelled:()=>false};
  for(const step of steps(actual))if(step.id)result.steps[step.id]={outcome:'success',outputs:{}};
  result.steps['operational-action'].outputs.action='integrated-historical-maintenance';
  result.steps['public-source'].outputs.repair_id='';
  result.steps['checkpoint-disposition'].outputs.disposition='MEASURED_WARMUP_PUBLISHED';
  result.steps['runtime-audit'].outputs.runtime_audit_outcome='success';
  result.steps['saved-last-mile-source'].outputs.required='false';
  result.steps['saved-checkpoint-reconcile'].outputs.required='false';
  for(const id of ['current-private-install','migrated-private-install'])result.steps[id].outcome='skipped';
  return result;
}
function evaluate(expression,state){
  const input=expression.replace(/^\$\{\{\s*|\s*\}\}$/g,'').replace(/\b(inputs|steps|env)\.[A-Za-z0-9_.-]+/g,token=>{
    let value=state;for(const key of token.split('.'))value=value?.[key];return JSON.stringify(value)??'undefined';
  });
  return vm.runInNewContext(input,{always:state.always,cancelled:state.cancelled},{timeout:1000});
}
const enabled=(step,state)=>Boolean(evaluate(step.if,state));
function render(body,state){return body.replace(/\$\{\{\s*(.*?)\s*\}\}/g,(_whole,expression)=>String(evaluate(expression,state)));}
function environment(extra={}){
  return {...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]])),
    PATH:path.dirname(process.execPath)+path.delimiter+(process.env.PATH??process.env.Path??''),...extra};
}
function bash(body,extra={}){
  const result=spawnSync(bashPath,['--noprofile','--norc','-c',body],{cwd:ROOT,env:environment(extra),encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(result.error,undefined,result.error?.message);assert.equal(result.signal,null);
  return result;
}
const predecessorNames=steps(historical).filter(step=>{
  const a=historical.indexOf('      - name: Build current private-runtime restore expectation\n');
  const b=historical.indexOf('      - name: Reverify the same assistant originals before binding installation\n');
  return step.at>=a&&step.at<b;
}).map(step=>step.name);
const requiredResults=['archived-weather-build.outcome','archived-weather-validation.outcome','archived-weather-release-gate.outcome',
  'runtime-audit.outputs.runtime_audit_outcome','current-private-spec.outcome','current-private-bundle.outcome',
  'pages-prebuild.outcome','pages-preflight-privacy.outcome'];
function gatePrefix(source){
  const run=runText(named(source,'Apply sole last-mile binding only after all new artifact checks'));
  const at=run.indexOf('git fetch --no-tags --prune origin');assert(at>0);
  const prefix=run.slice(0,at);
  const found=[...prefix.matchAll(/test "\$\{\{\s*steps\.([^}]+?)\s*\}\}" = success/g)].map(match=>match[1].trim());
  assert.deepEqual([...found].sort(),[...requiredResults].sort(),'Every real artifact result gates SQL');
  return prefix;
}
function proveActualRoute(source){
  const state=context(),all=steps(source);
  for(const flag of ['restart_archived_weather','upgrade_last_mile_enclosure']){
    const block=new RegExp('^      '+flag+':\\n((?:        [^\\n]*\\n)+)','m').exec(source)?.[1];
    assert(block,'One bounded input declaration: '+flag);
    assert.match(block,/^        default: false$/m);assert.match(block,/^        type: boolean$/m);
  }
  for(const name of predecessorNames)assert.equal(enabled(named(source,name),state),false,'New route cannot enter old path: '+name);
  assert.equal(enabled(named(source,'Apply exact dry-run-verified post-cutover binding'),state),false);
  const applySteps=all.filter(step=>/supabase db push --linked --skip-vault/.test(step.text)&&enabled(step,state));
  assert.equal(applySteps.length,1,'Only one production SQL caller is reachable on the new route');
  const apply=applySteps[0];assert.equal(apply.name,'Apply sole last-mile binding only after all new artifact checks');
  for(const [name,command]of [
    ['Build a new full public forecast through the normal provider-free updater','node scripts/update-weather.mjs'],
    ['Run full validation on the actual newly calculated forecast','npm run validate'],
    ['Run full release gate on the actual newly calculated forecast','npm run release:gate'],
    ['Audit regenerated integrated public runtime','node scripts/audit-ravscore-integrated-public-runtime.mjs'],
    ['Prebuild lean GitHub Pages artifact before production writes','rsync -a ./ _site/'],
    ['Preflight complete Pages artifact for private runtime material','node scripts/audit-pages-artifact-privacy.mjs'],
  ]){
    const step=named(source,name);assert(enabled(step,state));assert(step.text.includes(command));assert(step.at<apply.at,name);
  }
  gatePrefix(source);
  const applyRun=runText(apply),prewrite='env -u SUPABASE_DB_PASSWORD node scripts/run-archived-weather-restart.mjs prewrite';
  assert.equal(applyRun.split(prewrite).length,2);
  const following=applyRun.slice(applyRun.indexOf(prewrite)+prewrite.length).split('\n').filter(line=>line.trim()&&!line.trim().startsWith('#'));
  assert.equal(following.length,1,'No intervening remote operation after genuine final prewrite');
  assert.match(following[0],/^\(cd "\$\{\{ steps\.migration-view\.outputs\.workdir \}\}" && supabase db push --linked --skip-vault\)$/);
  for(const name of ['Archive independent actual originals and install only saved weather inputs',
    'Build a new full public forecast through the normal provider-free updater',
    'Apply sole last-mile binding only after all new artifact checks']){
    const step=named(source,name);
    assert.match(step.text,/RAVRADAR_PRIVATE_RUNTIME_ROOT: \/tmp\/ravradar-archived-weather-original\n/);
    assert.match(step.text,/RAVRADAR_PRIVATE_RUNTIME_BUNDLE: \/tmp\/ravradar-archived-weather-original\/bundle\n/);
  }
  const prepare=named(source,'Archive independent actual originals and install only saved weather inputs');
  assert.match(prepare.text,/mkdir -p "\$RAVRADAR_PRIVATE_RUNTIME_ROOT"[\s\S]*node scripts\/run-archived-weather-restart\.mjs prepare/);
  const job=source.slice(source.indexOf('  build-code-only:\n'),source.indexOf('    steps:\n',source.indexOf('  build-code-only:\n')));
  assert.match(job,/RAVRADAR_PRIVATE_RUNTIME_BUNDLE: \/tmp\/ravradar-private-production-runtime\/bundle\n/);
  for(const variable of ['RAVRADAR_WEATHER_CACHE_ONLY','RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE']){
    const value=new RegExp('      '+variable+': (.+)').exec(job)?.[1];assert(value);assert.equal(evaluate(value,state),'true');
  }
  const audit=runText(named(source,'Audit regenerated integrated public runtime'));
  assert(audit.includes("if test \"${{ inputs.restart_archived_weather }}\" = true \\\n"));
  assert.match(audit,/\|\| test "\$\{\{ steps\.saved-last-mile-source\.outputs\.required \}\}" = true; then\n\s+echo .+\n\s+exit 1\n\s+elif test "\$SAVED_WEATHER_CONTINUATION"/);
  const installed=named(source,'Read back the actual installed last-mile contracts and unchanged schema2');
  const B=named(source,'Publish current bounded private runtime');
  const S=named(source,'Publish measured continuation only after verified warmup private runtime');
  assert(apply.at<installed.at&&installed.at<B.at&&B.at<S.at);
  assert.match(installed.text,/RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN=false env -u SUPABASE_DB_PASSWORD node scripts\/run-archived-weather-restart\.mjs installed/);
  assert.equal(enabled(named(source,'Publish measured continuation checkpoint without promoting rollback readiness'),state),false);
  assert.equal(enabled(S,state),true);
  state.steps['current-private-publish'].outcome='failure';assert.equal(enabled(S,state),false,'S must depend on actual B success');
  const handoff=named(source,'Seal privacy-safe code-only operational handoff').text;
  const codeOnly=/--argjson codeOnlyRepair '([^']+)'/.exec(handoff)?.[1];assert(codeOnly);assert.equal(evaluate(codeOnly,context()),false);
  assert.match(handoff,/if test "\$\{\{ inputs\.restart_archived_weather \}\}" != true; then\n\s+cp \.geometry-v2-work\/code-only-public-runtime-reuse\.json/);
  assert.match(handoff,/codeOnlyReuseReportSha256:\(if \$codeOnlyReuseReportSha256 == "" then null else/);
  const pages=/^      code_only_repair: (.+)$/m.exec(source)?.[1];assert(pages);assert.equal(evaluate(pages,context()),false);
  for(const name of ['Deploy exact rebound trip Edges without Worker or D1 replay','Deploy only the exact RavRadar assistant Edge function',
    'Publish exact integrated backend and Edge readiness for this source']){
    const step=named(source,name);assert(step.at>S.at);assert(enabled(step,context()),name);
  }
  for(const command of ['supabase functions deploy trip-log','supabase functions deploy submit-observation','supabase functions deploy ravradar-assistant'])
    assert.equal(source.split(command).length,2);
  assert.match(named(source,'Seal historical-to-current integrated maintenance plan when required').text,/continue-on-error: \$\{\{ inputs\.restart_archived_weather != true && steps\.saved-last-mile-source\.outputs\.required != 'true' \}\}/);
  assert.doesNotMatch(source,/DMI_API_KEY|COPERNICUSMARINE_SERVICE_(?:USERNAME|PASSWORD)/);
}
function replaceOne(source,before,after){assert.equal(source.split(before).length,2,before);return source.replace(before,after);}
function fixture(run){
  const parent=fs.realpathSync(os.tmpdir()),directory=fs.mkdtempSync(path.join(parent,'rr-archive-workflow-normal-'));
  const before=fs.lstatSync(directory,{bigint:true}),identity=stat=>[stat.dev,stat.ino,stat.birthtimeNs];
  try{return run(directory);}finally{
    assert.equal(path.dirname(directory),parent);assert(path.basename(directory).startsWith('rr-archive-workflow-normal-'));
    assert.equal(fs.realpathSync(directory),directory);
    const after=fs.lstatSync(directory,{bigint:true});assert(after.isDirectory()&&!after.isSymbolicLink());
    assert.deepEqual(identity(after),identity(before));fs.rmSync(directory,{recursive:true,force:true});
  }
}

test('new actual route preserves the complete historical oracle and refuses changed routes',()=>{
  assert.equal(sha(actual),'b87ef14d831e6e825607a22deef3ab10f85bab654d2101731a473b393cb619cf');
  assert.equal(sha(historical),'a5052ae64638aaf4df28523f8a8c401e13803707ea0d46e0bb371f012f33352b');
  assert.match(historical,/if: steps\.current-private-install\.outcome == 'success'[\s\S]{0,220}--audit-anon/);
  proveActualRoute(actual);
  const mutations=[
    ['default: false\n        type: boolean\n      upgrade_last_mile_enclosure:','default: true\n        type: boolean\n      upgrade_last_mile_enclosure:'],
    ['        if: (inputs.publish_newest_saved_weather != true) && (inputs.restart_archived_weather != true)','        if: inputs.publish_newest_saved_weather != true'],
    ['          test "$'+'{{ steps.archived-weather-validation.outcome }}" = success\n',''],
    ['          test "$'+'{{ steps.runtime-audit.outputs.runtime_audit_outcome }}" = success\n',''],
    ['        run: npm run release:gate\n','        run: echo not-a-release-gate\n'],
    ['&& steps.current-private-publish.outcome == \'success\'',''],
    ['      code_only_repair: $'+'{{ inputs.publish_newest_saved_weather != true && inputs.restart_archived_weather != true }}\n','      code_only_repair: true\n'],
  ];
  for(const [before,after]of mutations){const changed=replaceOne(actual,before,after);
    assert.throws(()=>inverseArchivedWeatherRestartWorkflow(changed));assert.throws(()=>proveActualRoute(changed));}
  const prewrite=named(actual,'Apply sole last-mile binding only after all new artifact checks').text;
  const wrongPath=prewrite.replace('/tmp/ravradar-archived-weather-original/bundle','/tmp/ravradar-private-production-runtime/bundle');
  assert.throws(()=>proveActualRoute(replaceOne(actual,prewrite,wrongPath)));
  const interrupted=actual.replace('          # No remote operation is inserted between the native prewrite and this sole SQL application.',
    '          node scripts/unreviewed-remote-write.mjs');
  assert.notEqual(interrupted,actual);assert.throws(()=>proveActualRoute(interrupted));
});

test('actual authority Bash accepts only the exclusive first main dispatch and preserves old purposes',()=>{
  const authority=/      - name: Require the exact dispatch purpose on main\n([\s\S]*?)(?=\n  operational-recovery-gate:)/.exec(actual);assert(authority);
  const body=runText({name:'actual authority',text:authority[0]});
  const base={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
    CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',SAVED_WEATHER:'false',RECOVER_PUBLIC_RUN_ID:'',RECOVER_PUBLIC_RUN_ATTEMPT:'1',
    UPGRADE_EXISTING_OWNER_EXPORT:'false',UPGRADE_ACCOUNT_ASSISTANT:'false',UPGRADE_STATISTICS_REVISION:'false',
    UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN:'false',RESTART_ARCHIVED_WEATHER:'true',UPGRADE_LAST_MILE_ENCLOSURE:'true'};
  const invoke=changes=>bash(body,{...base,...changes});
  assert.equal(invoke({}).status,0);
  assert.equal(invoke({RESTART_ARCHIVED_WEATHER:'false',UPGRADE_LAST_MILE_ENCLOSURE:'false'}).status,0);
  assert.equal(invoke({RESTART_ARCHIVED_WEATHER:'false',UPGRADE_LAST_MILE_ENCLOSURE:'false',SAVED_WEATHER:'true',CONFIRMATION:'DEPLOY-SAVED-WEATHER-REPAIR'}).status,0);
  for(const changes of [{RESTART_ARCHIVED_WEATHER:'false'},{UPGRADE_LAST_MILE_ENCLOSURE:'false'},
    {UPGRADE_EXISTING_OWNER_EXPORT:'true'},{UPGRADE_ACCOUNT_ASSISTANT:'true'},{UPGRADE_STATISTICS_REVISION:'true'},
    {UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN:'true'},{SAVED_WEATHER:'true'},{RECOVER_PUBLIC_RUN_ID:'123'},
    {RECOVER_PUBLIC_RUN_ATTEMPT:'2'},{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REF:'refs/heads/topic'},
    {CONFIRMATION:'DEPLOY-SAVED-WEATHER-REPAIR'}])assert.notEqual(invoke(changes).status,0,JSON.stringify(changes));
  const oldStart=body.indexOf('if test "$UPGRADE_EXISTING_OWNER_EXPORT" = "true"; then');assert(oldStart>0);
  const changed=replaceOne(body.slice(0,oldStart),'  test "$UPGRADE_ACCOUNT_ASSISTANT" != "true"\n','')+body.slice(oldStart);
  assert.equal(bash(changed,{...base,UPGRADE_ACCOUNT_ASSISTANT:'true'}).status,0,'Mutation really removes this independent collision guard');
});

test('actual fixed selector CLI writes before only for the sole unconsumed source',()=>fixture(directory=>{
  const required=lastMileEnclosureRequiredMigrations();assert.equal(required.length,53);
  const list=installed=>'Local | Remote | Time (UTC)\n'+required.map((row,index)=>row.version+' | '
    +(installed||index<required.length-1?row.version:'')+' | synthetic').join('\n')+'\n';
  fs.writeFileSync(path.join(directory,'code-only-migrations-before.txt'),list(false));
  const output=path.join(directory,'github-env');
  const env=environment({GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',GITHUB_RUN_ID:'123',GITHUB_SHA:'1'.repeat(40),RUNNER_TEMP:directory,
    GITHUB_ENV:output,RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN:'true',
    RAVRADAR_LAST_MILE_ENCLOSURE_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',RAVRADAR_LAST_MILE_ENCLOSURE_WRITER_ACTIVE:'false'});
  const body=runText(named(actual,'Select only the unconsumed last-mile archive restart'));
  const accepted=bash(body,env);assert.equal(accepted.status,0,accepted.stderr);
  assert.equal(fs.readFileSync(output,'utf8'),'RAVRADAR_LAST_MILE_ENCLOSURE_PHASE=before\nRAVRADAR_LAST_MILE_ENCLOSURE_EDGE_REQUIRED=true\n');
  fs.unlinkSync(output);fs.writeFileSync(path.join(directory,'code-only-migrations-before.txt'),list(true));
  const consumed=bash(body,env);assert.notEqual(consumed.status,0);assert.equal(fs.existsSync(output),false);
}));

test('actual prewrite result assertions reject every failed gate before any remote command',()=>{
  const source=gatePrefix(actual),state=context();
  const success=bash(render(source,state));assert.equal(success.status,0,success.stderr);
  for(const required of requiredResults){const changed=context(),parts=required.split('.'),id=parts.shift();
    let selected=changed.steps[id];while(parts.length>1)selected=selected[parts.shift()];selected[parts[0]]='failure';
    assert.notEqual(bash(render(source,changed)).status,0,required);}
  const publisher=runText(named(actual,'Publish current bounded private runtime'));
  const stop=publisher.indexOf('node scripts/protected-private-production-runtime.mjs --publish');assert(stop>0);
  const prefix=render(publisher.slice(0,stop),state)+'test "$'+'{#same_reference_args[@]}" -eq 0\n';
  assert.equal(bash(prefix).status,0,'New B does not claim same-reference migration authority');
});

test('actual candidate-hour Node caller derives B+1 and preserves normal stale-valid/future/expiry guards',()=>fixture(directory=>{
  const body=runText(named(actual,'Select the earliest strictly newer hour from the actual saved generation'));
  const source=/node --input-type=module <<'NODE'\n([\s\S]*?)\nNODE\n/.exec(body)?.[1];assert(source);
  const clock=new Date();clock.setUTCMinutes(0,0,0);
  const invoke=hours=>{
    const input=new Date(clock.getTime()+hours*3600000).toISOString(),output=path.join(directory,'target-env');
    fs.writeFileSync(path.join(directory,'archive-target-private-source.json'),JSON.stringify({productionReferenceAt:input}));
    if(fs.existsSync(output))fs.unlinkSync(output);
    const result=spawnSync(process.execPath,['--input-type=module','--eval',source],{cwd:ROOT,
      env:environment({RAVRADAR_OPERATIONAL_WORK:directory,GITHUB_ENV:output}),encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
    assert.equal(result.error,undefined,result.error?.message);assert.equal(result.signal,null);
    return {input,output,result};
  };
  for(const hours of [-2,-6]){
    const {input,output,result}=invoke(hours);assert.equal(result.status,0,result.stderr);
    assert.equal(fs.readFileSync(output,'utf8'),'RAVRADAR_PRODUCTION_TARGET_HOUR='+new Date(Date.parse(input)+3600000).toISOString()+'\n');
  }
  for(const hours of [2,-120]){const {output,result}=invoke(hours);assert.notEqual(result.status,0);assert.equal(fs.existsSync(output),false);}
}));

function savedContext(){
  const state=context();state.inputs.restart_archived_weather=false;state.inputs.upgrade_last_mile_enclosure=false;
  state.inputs.publish_newest_saved_weather=true;
  state.steps['saved-last-mile-source'].outputs.required='true';
  state.steps['saved-checkpoint-reconcile'].outputs.required='true';
  state.steps['current-private-install'].outcome='success';
  state.env.RAVRADAR_LAST_MILE_ENCLOSURE_PHASE='installed';return state;
}
function proveSavedRoute(source){
  const state=savedContext(),all=steps(source);
  const describe=named(source,'Describe newest protected runtime for saved-weather continuation');
  const select=named(source,'Select only the exact installed last-mile saved-weather source');
  const view=named(source,'Prepare isolated post-cutover migration view');
  const history=named(source,'Hydrate only already-applied migration identities');
  const installed=named(source,'Require already-installed last-mile saved-weather contracts without replay');
  const authority=named(source,'Require unchanged central-public authority before saved checkpoint reconciliation');
  const selectPair=named(source,'Select saved B-S reconciliation before any checkpoint restore');
  const B=named(source,'Try installing current-compatible private runtime');
  const reconcile=named(source,'Reconcile saved last-mile CURRENT B with central S before public projection');
  const projection=named(source,'Rebuild public runtime from saved state without provider acquisition');
  assert(describe.at<select.at&&select.at<view.at&&view.at<history.at&&history.at<installed.at
    &&installed.at<authority.at&&authority.at<selectPair.at&&selectPair.at<B.at&&B.at<reconcile.at&&reconcile.at<projection.at);
  for(const step of [describe,select,view,history,installed,authority,selectPair,B,reconcile,projection])assert(enabled(step,state),step.name);
  assert.match(select.text,/assertSavedPrivateRuntimeCheckpointReconcileRequest\(\);/);
  assert.match(select.text,/source\.modelBinding\?\.modelBundleSha256 === next\.I/);
  assert.match(select.text,/source\.contractHashes\?\.continuationStateContractSha256 === next\.T/);
  assert.match(select.text,/assert\.equal\(integrated, continuation,/);
  assert.match(view.text,/steps\.saved-last-mile-source\.outputs\.required/);
  assert.match(view.text,/prepareLastMileEnclosureCutoverWorkdir/);
  assert.match(history.text,/hydrateLastMileEnclosureRemoteMigrationHistory/);
  assert.match(installed.text,/assertLastMileEnclosureMigrationsApplied\(migrationListText\)/);
  assert.match(installed.text,/await assertLastMileEnclosureMigrationPlan/);
  assert.match(installed.text,/assert\.deepEqual\(plan\.pendingVersions, \[\]\)/);
  assert.match(installed.text,/await verifyIntegratedDatabaseReadback\(\{ url: process\.env\.SUPABASE_URL,[\s\S]{0,200}sourcePhase: 'last-mile-enclosure'/);
  assert.match(installed.text,/await verifyInstalledStatisticsPreferenceRevisionSchema/);
  assert.match(installed.text,/assert\.equal\(schema\.schemaVersion, 2\)/);
  assert.match(authority.text,/canonicalPublicRuntimeJson/);
  assert.match(authority.text,/assertZoneRegistryVersionOnly\(publicZones\.value, activeZones\.value, version\.value\.version\)/);
  assert.match(authority.text,/ravScoreSamplingContextKey\(part\)/);
  assert.doesNotMatch(authority.text,/normalizeCodeOnlyProjection|writeFile|atomicWrite|rename\(/);
  assert.match(selectPair.text,/node scripts\/reconcile-private-runtime-checkpoint\.mjs select-saved/);
  assert.match(reconcile.text,/test "\$\{\{ steps\.current-private-install\.outcome \}\}" = success/);
  assert.match(reconcile.text,/test "\$\{\{ steps\.saved-checkpoint-reconcile\.outputs\.required \}\}" = true/);
  assert.match(reconcile.text,/test "\$RAVRADAR_LAST_MILE_ENCLOSURE_PHASE" = installed/);
  assert.match(reconcile.text,/node scripts\/reconcile-private-runtime-checkpoint\.mjs reconcile-saved/);
  assert.doesNotMatch(reconcile.text,/run-archived-weather-restart/);
  for(const name of ['Select only an already-installed established-origin successor before private work',
    'Select only the unconsumed last-mile archive restart','Require originals before the pending assistant binding',
    'Prepare exact original binding for owner current-domain release','Prepare exact predecessor source for bounded binding migration',
    'Select only the exact authenticated0200 origin metadata bridge','Rebind saved private runtime to current source without changing measurements',
    'Prepare exact authenticated seed metadata and private origin','Install migrated saved private runtime atomically',
    'Dry-run and require only the latest exact integrated migration','Apply exact dry-run-verified post-cutover binding',
    'Read back migration and database binding','Archive independent actual originals and install only saved weather inputs',
    'Build a new full public forecast through the normal provider-free updater','Apply sole last-mile binding only after all new artifact checks',
    'Read back the actual installed last-mile contracts and unchanged schema2']){
    assert.equal(enabled(named(source,name),state),false,'Installed saved584 must not replay: '+name);
  }
  assert.equal(all.filter(step=>enabled(step,state)&&/supabase db push --linked --skip-vault/.test(step.text)).length,0);
  for(const name of ['Run full validation on the actual newly calculated forecast','Run full release gate on the actual newly calculated forecast'])
    assert.equal(enabled(named(source,name),state),false,'Exact B projection must not acquire an unreviewed historical full-suite route: '+name);
  for(const name of ['Require exact code-only reuse invariants','Audit regenerated integrated public runtime',
    'Build current private production runtime specification','Create current private runtime bundle atomically',
    'Prebuild lean GitHub Pages artifact before production writes','Preflight complete Pages artifact for private runtime material',
    'Decide all independent prewrite checks together','Reconfirm current main before protected writes'])
    assert(enabled(named(source,name),state),'The normal artifact/privacy checks remain active: '+name);
  const centralNames=['Install normal geometry and DMI validation dependencies for archive restart',
    'Build normal constrained coastlines before central hydration','Read centrally saved admin configuration without promotion',
    'Apply only centrally approved active geometry','Stage the actual active central coastal registry before separate archive'];
  let prior=installed.at;
  for(const name of centralNames){const central=named(source,name);assert(enabled(central,state),name);
    assert(enabled(central,context()),'Initial route keeps the same normal central stage: '+name);
    assert(prior<central.at&&central.at<authority.at,'Real central staging precedes saved S reconciliation');prior=central.at;}
  assert.match(named(source,centralNames[0]).text,/-r requirements-dmi\.txt -r requirements-geometry\.txt/);
  assert.match(named(source,centralNames[1]).text,/python scripts\/refine-coastlines-constrained-4\.0\.48\.py/);
  assert.match(named(source,centralNames[2]).text,/python scripts\/sync-admin-config\.py/);
  assert.match(named(source,centralNames[3]).text,/python scripts\/apply-central-zone-reviews\.py/);
  assert.match(named(source,centralNames[4]).text,/node scripts\/build-public-coastal-parts-v2\.mjs/);
  const requireB=runText(named(source,'Require one exact saved private runtime'));
  assert.match(requireB,/test "\$\{\{ steps\.migrated-private-install\.outcome \}\}" != success/);
  assert.equal(enabled(named(source,'Publish measured continuation checkpoint without promoting rollback readiness'),state),false);
  const late=named(source,'Publish measured continuation only after verified warmup private runtime');
  assert(enabled(late,state));state.steps['current-private-publish'].outcome='failure';assert.equal(enabled(late,state),false);
  assert(enabled(named(source,'Deploy exact rebound trip Edges without Worker or D1 replay'),savedContext()));
  assert.equal(evaluate(/continue-on-error: (.+)/.exec(named(source,
    'Seal historical-to-current integrated maintenance plan when required').text)[1],savedContext()),false);
  assert.match(runText(named(source,'Audit regenerated integrated public runtime')),
    /\|\| test "\$\{\{ steps\.saved-last-mile-source\.outputs\.required \}\}" = true; then\n\s+echo .+\n\s+exit 1/);
  const job=source.slice(source.indexOf('  build-code-only:\n'),source.indexOf('    steps:\n',source.indexOf('  build-code-only:\n')));
  for(const name of ['COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY'])
    assert(job.includes("      "+name+": 'false'\n"),name+' must be explicit false');
  for(const name of ['RESTART_ARCHIVED_WEATHER','UPGRADE_LAST_MILE_ENCLOSURE','UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',
    'UPGRADE_EXISTING_OWNER_EXPORT','UPGRADE_ACCOUNT_ASSISTANT','UPGRADE_STATISTICS_REVISION']){
    const expression=new RegExp('^      '+name+': (.+)$','m').exec(job)?.[1];assert(expression,name);
    assert.equal(evaluate(expression,savedContext()),'false',name);
  }
  assert.equal(evaluate(/--argjson codeOnlyRepair '([^']+)'/.exec(
    named(source,'Seal privacy-safe code-only operational handoff').text)[1],savedContext()),false);
}
function nodeBody(source,name){
  const body=runText(named(source,name)),found=/node --input-type=module <<'NODE'\n([\s\S]*?)\nNODE\n/.exec(body)?.[1];
  assert(found,name+' must retain its actual Node caller');return found;
}
function node(source,env){
  const result=spawnSync(process.execPath,['--input-type=module','--eval',source],
    {cwd:ROOT,env:environment(env),encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  assert.equal(result.error,undefined,result.error?.message);assert.equal(result.signal,null);return result;
}
function savedEnvironment(directory){
  return {GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',OPERATIONAL_ACTION:'integrated-historical-maintenance',
    CONFIRMATION:'DEPLOY-SAVED-WEATHER-REPAIR',PUBLISH_NEWEST_SAVED_WEATHER:'true',RESTART_ARCHIVED_WEATHER:'false',
    COMPLETED_PRIVATE_RUNTIME:'false',CHECKPOINT_ONLY:'false',QUICK_CONFIRMATION:'false',
    RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP:'false',RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY:'false',
    NATIVE_IDENTITY_RECOVERY:'false',UPGRADE_LAST_MILE_ENCLOSURE:'false',UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN:'false',
    UPGRADE_EXISTING_OWNER_EXPORT:'false',UPGRADE_ACCOUNT_ASSISTANT:'false',UPGRADE_STATISTICS_REVISION:'false',
    RAVRADAR_OPERATIONAL_WORK:directory,GITHUB_OUTPUT:path.join(directory,'saved-output'),GITHUB_ENV:path.join(directory,'saved-env'),
    RUNNER_TEMP:directory};
}

test('actual installed584 saved route restores CURRENT B then reconciles S without replaying the initial migration',()=>{
  proveSavedRoute(actual);
  for(const [name,change]of [
    ['Require originals before the pending assistant binding',text=>text.replace(" && (steps.saved-last-mile-source.outputs.required != 'true')",'')],
    ['Require already-installed last-mile saved-weather contracts without replay',text=>text.replace('          assertLastMileEnclosureMigrationsApplied(migrationListText);\n','')],
    ['Reconcile saved last-mile CURRENT B with central S before public projection',text=>text.replace('node scripts/reconcile-private-runtime-checkpoint.mjs reconcile-saved','node scripts/run-archived-weather-restart.mjs prepare')],
    ['Reconcile saved last-mile CURRENT B with central S before public projection',text=>text.replace('          test "$'+'{{ steps.current-private-install.outcome }}" = success\n','')],
  ]){
    const before=named(actual,name).text,after=change(before);assert.notEqual(before,after);
    const changed=replaceOne(actual,before,after);assert.throws(()=>proveSavedRoute(changed));
    assert.throws(()=>inverseArchivedWeatherRestartWorkflow(changed));
  }
  const pair=named(actual,'Reconcile saved last-mile CURRENT B with central S before public projection').text;
  const reordered=actual.replace(pair,'').replace('      - name: Try installing current-compatible private runtime\n',
    pair+'\n      - name: Try installing current-compatible private runtime\n');
  assert.notEqual(reordered,actual);assert.throws(()=>proveSavedRoute(reordered));
  const requireB=runText(named(actual,'Require one exact saved private runtime'));
  assert.equal(bash(render(requireB,savedContext())).status,0);
  const failed=savedContext();failed.steps['current-private-install'].outcome='failure';
  failed.steps['migrated-private-install'].outcome='success';
  assert.notEqual(bash(render(requireB,failed)).status,0,'Saved584 must not adopt a historical fallback after CURRENT B failure');
});

test('actual saved584 source selector requires the real issued I and T and the strict saved-purpose guard',()=>fixture(directory=>{
  const source=nodeBody(actual,'Select only the exact installed last-mile saved-weather source'),env=savedEnvironment(directory);
  const next=requireLastMileEnclosureBinding(),old=ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING;
  const invoke=(I,T,changes={})=>{
    const selected={...env,...changes};for(const key of Object.keys(selected))if(selected[key]===undefined)delete selected[key];
    fs.writeFileSync(path.join(directory,'current-private-runtime-source.json'),
      JSON.stringify({modelBinding:{modelBundleSha256:I},contractHashes:{continuationStateContractSha256:T}}));
    if(fs.existsSync(env.GITHUB_OUTPUT))fs.unlinkSync(env.GITHUB_OUTPUT);
    const result=node(source,selected);return {result,output:fs.existsSync(env.GITHUB_OUTPUT)?fs.readFileSync(env.GITHUB_OUTPUT,'utf8'):null};
  };
  const selected=invoke(next.I,next.T);assert.equal(selected.result.status,0,selected.result.stderr);assert.equal(selected.output,'required=true\n');
  const predecessor=invoke(old.I,old.T);assert.equal(predecessor.result.status,0,predecessor.result.stderr);assert.equal(predecessor.output,'required=false\n');
  for(const [I,T]of [[next.I,old.T],[old.I,next.T]]){
    const mixed=invoke(I,T);assert.notEqual(mixed.result.status,0);assert.equal(mixed.output,null);
  }
  for(const key of ['RESTART_ARCHIVED_WEATHER','COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION',
    'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY',
    'UPGRADE_LAST_MILE_ENCLOSURE','UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN','UPGRADE_EXISTING_OWNER_EXPORT',
    'UPGRADE_ACCOUNT_ASSISTANT','UPGRADE_STATISTICS_REVISION']){
    for(const value of ['true',undefined]){const refused=invoke(next.I,next.T,{[key]:value});
      assert.notEqual(refused.result.status,0,key+': '+value);assert.equal(refused.output,null);}
  }
  for(const changes of [{CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR'},{PUBLISH_NEWEST_SAVED_WEATHER:'false'},
    {OPERATIONAL_ACTION:'initial-integrated-cutover'},{RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH:'/tmp/untrusted'},
    {RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256:'0'.repeat(64)}]){
    const refused=invoke(next.I,next.T,changes);assert.notEqual(refused.result.status,0);assert.equal(refused.output,null);
  }
}));

test('actual saved584 installed-plan prefix rejects pending or unknown migration without entering database readback',()=>fixture(directory=>{
  const body=nodeBody(actual,'Require already-installed last-mile saved-weather contracts without replay');
  const stop=body.indexOf('await verifyIntegratedDatabaseReadback(');assert(stop>0);
  const prefix=body.slice(0,stop);
  assert(prefix.includes('assertLastMileEnclosureMigrationsApplied(migrationListText)'));
  assert(prefix.includes('await assertLastMileEnclosureMigrationPlan'));
  // Execute only the unchanged normal applied/canonical/dry-run prefix. This
  // source test deliberately makes no hosted readback or B-authentication claim.
  const prepare="const {prepareLastMileEnclosureCutoverWorkdir}=await import('./scripts/integrated-cutover-readiness.mjs');\n"
    +"await prepareLastMileEnclosureCutoverWorkdir({workdir:process.env.RAVRADAR_TEST_VIEW});\n";
  const required=lastMileEnclosureRequiredMigrations(),env={...savedEnvironment(directory),
    RAVRADAR_TEST_VIEW:path.join(directory,'normal-view'),
    RAVRADAR_LAST_MILE_ENCLOSURE_MIGRATIONS_DIR:path.join(directory,'normal-view/supabase/migrations')};
  const prepared=node(prepare,env);assert.equal(prepared.status,0,prepared.stderr);
  const rows=required.map(row=>row.version+' | '+row.version+' | synthetic');
  const invoke=(lines,dryRun='DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.\n')=>{
    fs.writeFileSync(path.join(directory,'code-only-migrations-before.txt'),'Local | Remote | Time (UTC)\n'+lines.join('\n')+'\n');
    fs.writeFileSync(path.join(directory,'code-only-saved-last-mile-dry-run.txt'),dryRun);
    return node(prefix,env);
  };
  const installed=invoke(rows);assert.equal(installed.status,0,installed.stderr);
  const pending=[...rows];pending[pending.length-1]=required.at(-1).version+' | | synthetic';
  assert.notEqual(invoke(pending).status,0);
  assert.notEqual(invoke([...rows,'20990101000000 | 20990101000000 | synthetic']).status,0);
  assert.notEqual(invoke([...rows,rows.at(-1)]).status,0);
  assert.notEqual(invoke(rows,'DRY RUN: migrations will *not* be pushed to the database.\nWould push these migrations:\n • '+required.at(-1).filename+'\n').status,0);
}));

test('actual saved authority guard permits only clock and release metadata while rejecting point geometry and routing drift',()=>fixture(directory=>{
  const root=path.join(directory,'repository'),snapshot=path.join(directory,'snapshot');
  for(const part of [path.join(root,'data/live'),snapshot])fs.mkdirSync(part,{recursive:true});
  const source=nodeBody(actual,'Require unchanged central-public authority before saved checkpoint reconciliation');
  const baseline={schemaVersion:2,enabled:true,datasetVersion:'synthetic-approved-geometry',
    sourceRunId:'synthetic-source',generatedAt:'2026-10-18T00:00:00.000Z',partCount:673,
    sourcePartCount:673,zoneCount:210,wholeZoneMarginPoints:7,zones:{}};
  const zones={type:'FeatureCollection',version:'4.0.581',metadata:{version:'synthetic-geometry-policy'},features:[]};
  for(let z=0;z<210;z++){
    const id='synthetic-zone-'+z;baseline.zones[id]=[];
    zones.features.push({type:'Feature',properties:{id,zoneStatus:'active',name:id},
      geometry:{type:'LineString',coordinates:[[10+z/10000,55],[10.001+z/10000,55.001]]}});
  }
  for(let p=0;p<673;p++){
    const zoneId='synthetic-zone-'+(p%210),longitude=10+p/100000;
    baseline.zones[zoneId].push({partId:'synthetic-part-'+p,sourceZoneId:zoneId,name:'Synthetic part '+p,
      geometry:{type:'LineString',coordinates:[[longitude,55],[longitude+0.001,55.001]]},
      landPoint:[longitude+0.001,55],waterPoint:[longitude,55],onshoreDirectionDeg:90,
      marineCoverage:'full',coverageGaps:[]});
  }
  const routing={schemaVersion:1,updatedAt:'2026-10-18T00:00:00.000Z',description:'Synthetic routing only',
    zones:{'synthetic-zone-0':{enabled:true,method:'manual-weights',requireAll:true,reviewed:true,
      stations:[{sourceKey:'synthetic-source-A',stationId:'synthetic-A',role:'primary',weight:1}]}}};
  const write=(file,value)=>fs.writeFileSync(file,JSON.stringify(value)+'\n');
  const invoke=(mutate=()=>{},updatePublicDigest=true)=>{
    const active=structuredClone(baseline),published=structuredClone(baseline),activeZones=structuredClone(zones),
      activeRouting=structuredClone(routing),publishedRouting=structuredClone(routing);
    active.generatedAt='2026-10-19T09:00:00.000Z';
    activeRouting.updatedAt='2026-10-19T09:00:00.000Z';
    activeZones.version='4.0.584';
    const fixture={active,published,activeZones,publishedZones:structuredClone(zones),activeRouting,publishedRouting};
    mutate(fixture);
    write(path.join(root,'version.json'),{version:'4.0.584'});
    write(path.join(root,'data/live/coastal-parts-v2.json'),fixture.active);
    write(path.join(root,'data/zones.geojson'),fixture.activeZones);
    write(path.join(root,'data/water-level-station-routing.json'),fixture.activeRouting);
    write(path.join(snapshot,'coastal-parts-v2.json'),fixture.published);
    write(path.join(snapshot,'zones.geojson'),fixture.publishedZones);
    write(path.join(snapshot,'water-level-station-routing.json'),fixture.publishedRouting);
    const coast=fs.readFileSync(path.join(snapshot,'coastal-parts-v2.json'),'utf8'),
      zone=fs.readFileSync(path.join(snapshot,'zones.geojson'),'utf8');
    write(path.join(snapshot,'manifest.json'),{schemaVersion:4,complete:true,zoneCount:210,coastalPartCount:673,
      coastalPartsSha256:updatePublicDigest?sha(coast):'0'.repeat(64),coastalPartsBytes:Buffer.byteLength(coast),
      zoneRegistrySha256:sha(zone),zoneRegistryBytes:Buffer.byteLength(zone)});
    const files=['data/live/coastal-parts-v2.json','data/zones.geojson','data/water-level-station-routing.json'];
    const before=files.map(file=>sha(fs.readFileSync(path.join(root,file))));
    const result=node(source,{...savedEnvironment(directory),GITHUB_WORKSPACE:root,RAVRADAR_CODE_ONLY_PUBLIC_SNAPSHOT:snapshot});
    assert.deepEqual(files.map(file=>sha(fs.readFileSync(path.join(root,file)))),before,'Guard must be read-only');
    return result;
  };
  const accepted=invoke();assert.equal(accepted.status,0,accepted.stderr);
  const reordered=invoke(value=>{
    // The existing normal canonicalizer ignores JSON member order, not array,
    // point, geometry, ownership, coverage or routing values.
    value.active={zones:value.active.zones,...value.active};
  });assert.equal(reordered.status,0,reordered.stderr);
  const part=value=>value.active.zones['synthetic-zone-0'][0];
  for(const [name,mutate]of [
    ['land point',value=>{part(value).landPoint[0]+=0.01;}],
    ['water point',value=>{part(value).waterPoint[0]+=0.01;}],
    ['shore direction',value=>{part(value).onshoreDirectionDeg=91;}],
    ['coast geometry',value=>{part(value).geometry.coordinates[0][1]+=0.001;}],
    ['ownership',value=>{value.active.zones['synthetic-zone-1'].push(value.active.zones['synthetic-zone-0'].shift());}],
    ['source ownership',value=>{part(value).sourceZoneId='synthetic-zone-1';}],
    ['coverage',value=>{part(value).coverageGaps=['synthetic-gap'];}],
    ['zone geometry',value=>{value.activeZones.features[0].geometry.coordinates[0][1]+=0.001;}],
    ['routing source',value=>{value.activeRouting.zones['synthetic-zone-0'].stations[0].sourceKey='synthetic-source-B';}],
    ['routing weight',value=>{value.activeRouting.zones['synthetic-zone-0'].stations[0].weight=0.5;}],
  ]){
    const refused=invoke(mutate);assert.notEqual(refused.status,0,name);
    assert.doesNotMatch(refused.stderr,/synthetic-part-0|synthetic-source-A|"coordinates"/,'No actual coordinate/route payload in error output');
  }
  assert.notEqual(invoke(()=>{},false).status,0,'A stale public manifest digest must fail before S');
}));
