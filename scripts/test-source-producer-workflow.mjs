// Actual SOURCE caller contract plus its exact TEST-ONLY whole inverse.
// No network, SQL, B/S materialization, native execution or production proof.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {SOURCE_PRODUCER_WORKFLOW_SHA256,SOURCE_PRODUCER_WORKFLOW_PREDECESSOR_SHA256,
  inverseSourceProducerWorkflow} from './lib/source-producer-workflow-review.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const WORKFLOW='.github/workflows/deploy-code-only-repair.yml';
const source=fs.readFileSync(new URL('../'+WORKFLOW,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const gh=value=>'$'+'{{ '+value+' }}';
const count=(text,value)=>text.split(value).length-1;
const ORDER=Object.freeze([
  'Select the issued SOURCE source phase without admission',
  'Select the issued account-statistics-assistant source phase without admission',
  'Route metadata sources without sharing their authority',
  'Require actually installed SOURCE contracts before installed reentry',
  'Select actual SOURCE CURRENT family and restore only genuine original585 if needed',
  'Stage the exact saved registry for original585 SOURCE metadata preparation',
  'Prepare only the exact authenticated585 SOURCE metadata handoff',
  'Pair already-current SOURCE B with actual S before any local checkpoint build',
  'Rebuild public runtime from saved state without provider acquisition',
  'Build current private production runtime specification',
  'Preflight complete Pages artifact for private runtime material',
  'Apply the sole SOURCE compatibility binding after every artifact gate and fresh originals',
  'Publish current bounded private runtime',
  'Publish measured continuation only after verified warmup private runtime',
  'Read back the whole actually published SOURCE S before any Edge or Pages write',
  'Deploy exact rebound trip Edges without Worker or D1 replay',
  'Deploy only the exact RavRadar assistant Edge function',
  'Publish exact integrated backend and Edge readiness for this source',
  'Seal privacy-safe code-only operational handoff',
]);
function steps(text){
  const headings=[...text.matchAll(/^      - (name|uses): ([^\n]+)\n/gm)];
  return headings.flatMap((match,index)=>{
    if(match[1]!=='name')return [];
    const body=text.slice(match.index,index+1<headings.length?headings[index+1].index:text.length);
    return [{name:match[2],at:match.index,text:body,
      if:/^        if: (.+)$/m.exec(body)?.[1]??'true',
      continueOnError:/^        continue-on-error: (.+)$/m.exec(body)?.[1]??'false'}];
  });
}
function named(text,name){const rows=steps(text).filter(row=>row.name===name);assert.equal(rows.length,1,name);return rows[0];}
function evaluate(expression,state){
  const input=expression.replace(/^\$\{\{\s*|\s*\}\}$/g,'').replace(/\b(inputs|steps|env)\.[A-Za-z0-9_.-]+/g,token=>{
    let value=state;for(const key of token.split('.'))value=value?.[key];return JSON.stringify(value)??'undefined';
  });
  return vm.runInNewContext(input,{}, {timeout:1000});
}
function state(phase,family,active=true){
  return {inputs:{restart_archived_weather:false,publish_newest_saved_weather:false,upgrade_source_producer:phase==='before'},
    env:{RAVRADAR_SOURCE_PRODUCER_SOURCE_ACTIVE:String(active),RAVRADAR_SOURCE_PRODUCER_PHASE:phase,
      RAVRADAR_SOURCE_PRODUCER_CURRENT_FAMILY:family,RAVRADAR_CODE_ONLY_METADATA_SOURCE_ACTIVE:String(active),
      RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_SOURCE_ACTIVE:'false',
      RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_CURRENT_FAMILY:'',
      RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_EDGE_REQUIRED:'false'},
    steps:{'operational-action':{outputs:{action:'integrated'}},
      'saved-last-mile-source':{outputs:{required:'false'}},
      'checkpoint-disposition':{outputs:{disposition:'READY_PUBLISHED'}},
      'current-private-install':{outcome:family==='current'?'success':'skipped'},
      'current-private-publish':{outcome:'success'}}};
}
function assertActualSourceWorkflow(text){
  const positions=ORDER.map(name=>named(text,name).at);
  for(let i=1;i<positions.length;i++)assert(positions[i]>positions[i-1],ORDER[i]+' normal order');
  const input=/^      upgrade_source_producer:\n((?:        [^\n]*\n)+)/m.exec(text)?.[1];
  assert(input);assert.match(input,/^        required: false$/m);
  assert.match(input,/^        default: false$/m);assert.match(input,/^        type: boolean$/m);
  assert.equal(count(text,"      RAVRADAR_SOURCE_NORMAL_PRODUCER: 'false'"),1,'Compatibility never activates SOURCE19');
  const before=state('before','predecessor'),installed=state('installed','current'),off=state('installed','',false);
  const enabled=(name,s)=>Boolean(evaluate(named(text,name).if,s));
  for(const s of [before,installed])assert.equal(enabled(ORDER[1],s),false,'Do not share old585 source authority');
  assert.equal(enabled(ORDER[1],off),true,'Unissued/default-OFF can use its normal predecessor caller');
  for(const [name,pred,current]of [
    [ORDER[3],false,true],[ORDER[4],true,true],[ORDER[5],true,false],
    [ORDER[6],true,false],[ORDER[7],false,true],[ORDER[11],true,false],[ORDER[14],true,true],
  ]){
    assert.equal(enabled(name,before),pred,name+' original585 handoff');
    assert.equal(enabled(name,installed),current,name+' installed reentry');
    assert.equal(enabled(name,off),false,name+' default-OFF');
  }
  const build=named(text,'Build measured continuation checkpoint without promoting rollback readiness');
  assert(named(text,ORDER[7]).at<build.at,'Reconcile current B/S before any local S build');
  for(const s of [before,installed]){
    assert.equal(enabled('Publish measured continuation checkpoint without promoting rollback readiness',s),false,
      'SOURCE may not publish S through the early pre-B publisher');
    assert.equal(enabled(ORDER[13],s),true,'SOURCE publishes S only after successful B');
  }
  for(const name of ['Try newest current-compatible private runtime','Try verifying current-compatible private runtime',
    'Try installing current-compatible private runtime']){
    assert.equal(Boolean(evaluate(named(text,name).continueOnError,before)),false,name+' SOURCE failure is hard');
    assert.equal(Boolean(evaluate(named(text,name).continueOnError,off)),true,name+' old default policy preserved');
  }
  for(const slot of ['prepare','final'])assert.equal(count(text,'node scripts/source-producer-prewrite.mjs --slot '+slot),1);
  assert(!text.includes('source-producer-prewrite.mjs --slot proof'),'No invented SOURCE proof slot');
  assert.equal(count(text,'node scripts/reconcile-source-producer-code-only.mjs'),1);
  const pairing=named(text,ORDER[7]).text,sql=named(text,ORDER[11]).text,readback=named(text,ORDER[14]).text;
  assert(pairing.includes('test "'+gh('steps.current-private-install.outcome')+'" = success'));
  assert.equal(count(sql,'supabase db push --linked --skip-vault'),1,'Only one conditional SQL mutation');
  for(const token of ['SOURCE_PRODUCER_SQL_WRITE_REQUIRED=true)','SOURCE_PRODUCER_SQL_WRITE_REQUIRED=false)',
    'node scripts/source-producer-prewrite.mjs --slot final','node scripts/verify-source-producer-plan.mjs --phase before',
    'node scripts/verify-source-producer-plan.mjs --phase installed',
    'RAVRADAR_SOURCE_PRODUCER_PHASE=installed RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN=false',
    "echo 'RAVRADAR_SOURCE_PRODUCER_PHASE=installed'"]){
    assert(sql.includes(token),'Actual SQL plan/readback token: '+token);
  }
  assert(sql.indexOf('--slot final')<sql.indexOf('source_sql_plan='));
  assert(sql.indexOf('SOURCE_PRODUCER_SQL_WRITE_REQUIRED=true)')<sql.indexOf('supabase db push --linked --skip-vault'));
  assert(sql.indexOf('supabase db push --linked --skip-vault')<sql.indexOf('--phase installed'));
  for(const result of ['migrated-private-install.outcome','runtime-audit.outputs.runtime_audit_outcome',
    'current-private-spec.outcome','current-private-bundle.outcome','pages-prebuild.outcome','pages-preflight-privacy.outcome'])
    assert(sql.includes('test "'+gh('steps.'+result)+'" = success'),'Every actual artifact gate: '+result);
  assert(readback.includes('restoreProtectedRavScoreContinuationCheckpoint'));
  assert(readback.includes("assert.equal(result.reason,'protected-checkpoint-equivalent')"));
  assert(!readback.includes('reconcile-source-producer-code-only.mjs'),'Never reconcile when local S already exists');
  assert(readback.includes('test "'+gh('steps.current-private-publish.outcome')+'" = success'));
  assert(readback.includes('test "'+gh('steps.established-native-current-origin-checkpoint-publish.outcome')+'" = success'));
  for(const name of [ORDER[15],ORDER[16]]){
    const body=named(text,name).text;
    for(const token of ['test "$RAVRADAR_SOURCE_PRODUCER_PHASE" = installed',
      'test "$RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN" = false','test "$RAVRADAR_SOURCE_NORMAL_PRODUCER" = false',
      'test "'+gh('steps.current-private-publish.outcome')+'" = success',
      'test "'+gh('steps.established-native-current-origin-checkpoint-publish.outcome')+'" = success',
      'test "'+gh('steps.source-producer-checkpoint-readback.outputs.equivalent')+'" = true',
      'test "'+gh('steps.source-producer-checkpoint-readback.outcome')+'" = success'])
      assert(body.includes(token),name+' actual B/S/readback gate');
  }
  for(const name of [ORDER[4],'Select actual CURRENT family and restore only genuine original584 if needed'])
    for(const key of ['RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'])
      assert(named(text,name).text.includes(key+': '+gh('secrets.'+key)),'Preserve actual storage forwarding');
}
const once=(text,before,after)=>{assert.equal(count(text,before),1);return text.replace(before,()=>after);};
const changeStep=(text,name,change)=>{const block=named(text,name).text;return once(text,block,change(block));};
test('SOURCE workflow exact46-hunk inverse recovers every genuine b2 byte',()=>{
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'};
  const git=args=>execFileSync('git',['-C',ROOT,...args],{env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  const head='b2d4ba68c6e560c6e1f2335ea8ace604a6315da3';
  assert.equal(git(['rev-parse',head+'^{tree}']).trim(),'d911b0ee27084194cba8bde59ff9540d8b164543');
  const base=git(['show',head+':'+WORKFLOW]);
  assert.equal(sha(source),SOURCE_PRODUCER_WORKFLOW_SHA256);
  assert.equal(sha(base),SOURCE_PRODUCER_WORKFLOW_PREDECESSOR_SHA256);
  assert.equal(inverseSourceProducerWorkflow(source),base,'Every genuine b2 workflow byte survives');
  assert.throws(()=>inverseSourceProducerWorkflow(base),'No neutral identity return or old-as-current labeling');
  assert.throws(()=>inverseSourceProducerWorkflow(source+'\n# unreviewed\n'));
  assert.throws(()=>inverseSourceProducerWorkflow(source.replace("  contents: read\n","  contents: write\n")));
});
test('SOURCE whole predecessor still passes every unchanged older workflow oracle',async()=>{
  // Mandatory separate old raw-descriptor guards, not an optional/skip branch.
  // Their checkout failures must not conceal the independent SOURCE results.
  const {inverseAccountStatisticsAssistantWorkflow}=await import('./lib/account-statistics-assistant-workflow-review.mjs');
  const {inverseArchivedWeatherRestartWorkflow}=await import('./lib/archived-weather-restart-workflow-review.mjs');
  const base=inverseSourceProducerWorkflow(source);
  assert.equal(inverseAccountStatisticsAssistantWorkflow(source),inverseAccountStatisticsAssistantWorkflow(base));
  assert.equal(inverseArchivedWeatherRestartWorkflow(source),inverseArchivedWeatherRestartWorkflow(base));
});
test('actual SOURCE workflow keeps all19 hooks, default-OFF, no-replay and original/current B-S routes',()=>{
  assertActualSourceWorkflow(source);
  const registered=fs.readFileSync(new URL('./test-source-producer-prewrite.mjs',import.meta.url),'utf8');
  assert.equal(count(registered,"import './test-source-producer-workflow.mjs';"),1,
    'The actual existing SOURCE prewrite/account caller entry executes this target exactly once');
});
test('SOURCE semantic caller checks independently refuse changed guards, ordering and publication',()=>{
  const input=/^      upgrade_source_producer:\n((?:        [^\n]*\n)+)/m.exec(source)?.[0];assert(input);
  const mutations=[
    once(source,input,input.replace('default: false','default: true')),
    once(source,"      RAVRADAR_SOURCE_NORMAL_PRODUCER: 'false'","      RAVRADAR_SOURCE_NORMAL_PRODUCER: 'true'"),
    changeStep(source,ORDER[3],body=>body.replace("PHASE == 'installed'","PHASE == 'before'")),
    changeStep(source,ORDER[5],body=>body.replace("FAMILY == 'predecessor'","FAMILY == 'current'")),
    once(source,'node scripts/source-producer-prewrite.mjs --slot prepare','node scripts/source-producer-prewrite.mjs --slot final'),
    once(source,'node scripts/reconcile-source-producer-code-only.mjs','echo reconcile-not-executed'),
    changeStep(source,ORDER[11],body=>body.replace('SOURCE_PRODUCER_SQL_WRITE_REQUIRED=false)','SOURCE_PRODUCER_SQL_WRITE_REQUIRED=true)')),
    changeStep(source,ORDER[11],body=>body.replace('node scripts/source-producer-prewrite.mjs --slot final','true')),
    changeStep(source,ORDER[15],body=>body.replace(gh('steps.source-producer-checkpoint-readback.outputs.equivalent')+'" = true',
      gh('steps.source-producer-checkpoint-readback.outputs.equivalent')+'" = false')),
    changeStep(source,'Try newest current-compatible private runtime',body=>
      body.replace(/^        continue-on-error: .+$/m,'        continue-on-error: true')),
    changeStep(source,ORDER[4],body=>body.replace('RAVRADAR_R2_SECRET_ACCESS_KEY: '+gh('secrets.RAVRADAR_R2_SECRET_ACCESS_KEY'),
      'RAVRADAR_R2_SECRET_ACCESS_KEY: missing')),
  ];
  const preflight=named(source,ORDER[10]).text,sql=named(source,ORDER[11]).text,placeholder='__SOURCE_ORDER_TEST__\n';
  mutations.push(once(once(once(source,preflight,placeholder),sql,preflight),placeholder,sql));
  for(const changed of mutations){
    assert.notEqual(changed,source,'Every negative changes its actual workflow operand');
    assert.throws(()=>assertActualSourceWorkflow(changed),'Actual semantic guards refuse independently of whole-source pins');
    assert.throws(()=>inverseSourceProducerWorkflow(changed),'Unknown current workflow never enters old oracles');
  }
});
