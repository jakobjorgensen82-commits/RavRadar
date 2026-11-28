import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {AUTHENTIC_RECEIPT80_SOURCE_HEAD,inverseReviewedAfter599PackageForHistoricalOracles,
  readAuthenticatedAfter598PackageForHistoricalOracles,withAuthenticatedReceipt80Source}
  from './lib/account-statistics-assistant-package-review.mjs';
import test from 'node:test';
import {inverseSourceBeforePostgresWorkflow, SOURCE_BEFORE_POSTGRES_BLOCK,
  SCALAR597_LATER_H0_SOURCE_COMMAND,inverseScalar597LaterH0Package,verifyScalar597LaterH0NativeContext,
  ASSISTANT_AFTER599_SOURCE_COMMAND,ASSISTANT_AFTER598_SOURCE_COMMAND,inverseAssistantAfter598Package,
  scalar597LaterH0NativeClaims,ASSISTANT_AFTER597_SOURCE_COMMAND,inverseAssistantAfter597Package}
  from './national584-source-evidence.mjs';
import {projectSourceImpactWorkflowFull,inverseOwnedCacheNativeWorkflow,OWNED_CACHE_NATIVE_EARLY_STEP_NAMES,
  readHistoricalSourceSetupWorkflow,verifyCurrentSourceWorkflow,TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES}
  from './lib/source-impact-workflow-review.mjs';
import {ORIGIN, WORKFLOW, JOB, STEP, COMMANDS, ACCOUNT_STATISTICS_ASSISTANT_COMMANDS, CURRENT586_COMMANDS as CURRENT_COMMANDS,
  CURRENT_COMMANDS as ASSISTANT_LATER_H0_COMMANDS, NATIVE_SCRIPT as ASSISTANT_LATER_H0_SCRIPT, NEW_NATIVE_BLOCK,
  NON_NATIVE_TEST_INPUTS, NON_NATIVE_PROSE, nativeBlock, parseTree, verifyWorkflow,
  verifyInputTrees, verifyOriginMetadata, verifyOrigin, verifyEnvironment,
  verifyLaterRuns, decideReuse, verifyCurrentPullRequest, FOLLOWUP_INPUTS,
  CURRENT586_PHASE_KIND,CURRENT586_PHASE_UPLOAD,CURRENT586_PHASE_UPLOAD_BLOCK,
  SCALAR597_LATER_H0_PHASE,SCALAR597_LATER_H0_PHASE_KIND,SCALAR597_LATER_H0_COMMANDS,SCALAR597_LATER_H0_SCRIPT,
  scalar597NativeReportCollector,verifyScalar597LaterH0PhaseReceipt,
  ASSISTANT_AFTER597_PHASE,ASSISTANT_AFTER597_COMMANDS,ASSISTANT_AFTER597_SCRIPT,
  ASSISTANT_AFTER599_PHASE,ASSISTANT_AFTER599_COMMANDS,ASSISTANT_AFTER599_SCRIPT,
  ASSISTANT_AFTER598_PHASE,ASSISTANT_AFTER598_COMMANDS,ASSISTANT_AFTER598_SCRIPT,
  ASSISTANT_LATER_H0_PHASE_KIND,verifyAssistantLaterH0PhaseReceipt,
  inverseCurrent586PhaseUpload,verifyCurrent586Workflow,verifyCurrent586Runtime,
  verifyCurrent586PhaseReceipt,verifyCurrent586Metadata,verifyCurrent586Artifact,decideCurrent586Reuse} from './native-postgres-evidence.mjs';

import {ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT,
  ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,verifyAssistantPublic591SuccessorPhaseReceipt}
  from './native-postgres-evidence.mjs';

// Keep every whole586 command assertion on its immutable predecessor view.
// The actual new production command is independently checked below.
const NATIVE_SCRIPT='set -euo pipefail\n'+CURRENT_COMMANDS.join('\n')+'\n';
const copy = value => structuredClone(value);
import {ASSISTANT_AFTER597_BINDING as AFTER597_BINDING} from './lib/assistant-later-h0-successor-source.mjs';
const AFTER597_ISSUED=AFTER597_BINDING!==null;
import {ACTIVE_ASSISTANT_SUCCESSOR as CURRENT_ASSISTANT} from './lib/assistant-later-h0-successor-source.mjs';
const AFTER598_ACTIVE=CURRENT_ASSISTANT.sourcePhase==='assistant-after598-successor';
const AFTER599_ACTIVE=CURRENT_ASSISTANT.sourcePhase==='assistant-after599-successor';
const AFTER601_ACTIVE=CURRENT_ASSISTANT.sourcePhase==='assistant-after601-successor';
const HISTORICAL598_INPUT_REQUIRED=AFTER598_ACTIVE||AFTER599_ACTIVE||AFTER601_ACTIVE;
const AFTER601_NATIVE_COMMAND='node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after601-successor';
const AFTER601_NATIVE_SCRIPT='set -euo pipefail\n'+AFTER601_NATIVE_COMMAND+'\n';
const OLDER_NATIVE_PHASES=[ASSISTANT_AFTER599_PHASE,ASSISTANT_AFTER598_PHASE,ASSISTANT_AFTER597_PHASE,SCALAR597_LATER_H0_PHASE];
const LATER_THAN_594=AFTER601_ACTIVE||OLDER_NATIVE_PHASES.includes(CURRENT_ASSISTANT.sourcePhase);
// The existing authenticated old CODE host supplies actual old package/profile
// input. No rewritten current package, copied legacy suite or new cohort.
async function genuineIssued598SourceData(){
  const {withSource598CodeParent}=await import('./check-assistant-later-h0-predecessor-source.mjs');
  const {pathToFileURL}=await import('node:url'),path=await import('node:path');
  return withSource598CodeParent(async root=>{
    const profile=await import(pathToFileURL(path.join(root,'scripts/lib/assistant-later-h0-successor-source.mjs')).href);
    const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
    assert.equal(profile.ACTIVE_ASSISTANT_SUCCESSOR,profile.UNISSUED_ASSISTANT_AFTER597_SUCCESSOR);
    assert.equal(pkg.version,profile.requireAssistantAfter597Release());
    return {pkg,sourcePhase:profile.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,binding:profile.requireAssistantAfter597Binding(),output:profile.requireAssistantAfter597Output()};
  });
}


test('593 V2 transport bounds streamed JSON and ZIP, separates tokens, keeps budgets and never stores signed URLs',async t=>{
  const prefix='/repos/'+ORIGIN.repository+'/',signedUrl='https://synthetic-artifact.invalid/body?signature=synthetic-private-signed-value';
  const timeoutValues=[],written=[],logged=[];
  t.mock.method(AbortSignal,'timeout',ms=>{timeoutValues.push(ms);return new AbortController().signal;});
  for(const name of ['writeFile','appendFile','mkdir','mkdtemp'])
    t.mock.method(fs,name,(...args)=>{written.push(name);throw new Error('UNEXPECTED_EVIDENCE_PERSISTENCE');});
  t.mock.method(console,'log',(...args)=>{logged.push(args);});
  const env={GITHUB_TOKEN:'synthetic-repository-token'};
  const streamed=(size,count,state)=>{
    let emitted=0;
    const response=new Response(new ReadableStream({
      pull(controller){if(emitted===count){controller.close();return;}emitted++;state.emitted=emitted;controller.enqueue(new Uint8Array(size).fill(120));},
      cancel(){state.cancelled++;}
    }));
    response.arrayBuffer=()=>{state.arrayBuffer++;throw new Error('UNBOUNDED_BODY_READ');};
    return response;
  };
  try{
    const requests=[];
    const transport=assistantPublic591Reader({env,fetchImpl:async(url,options)=>{
      requests.push({url,options});
      return url.startsWith('https://api.github.com/')
        ?new Response(null,{status:302,headers:{Location:signedUrl}})
        :new Response(new Uint8Array(65536));
    }});
    assert.equal((await transport(prefix+'actions/artifacts/1/zip',{zip:true})).length,65536);
    assert.equal(requests.length,2);assert.equal(requests[0].options.headers.Authorization,'Bearer '+env.GITHUB_TOKEN);
    assert.equal(requests[0].options.redirect,'manual');assert.equal(requests[1].url,signedUrl);
    assert.equal(requests[1].options.headers,undefined);assert.equal(requests[1].options.redirect,'error');
    const exact=JSON.stringify({data:'x'.repeat(2*1024*1024-11)});
    assert.equal(Buffer.byteLength(exact),2*1024*1024);
    const json=assistantPublic591Reader({env,fetchImpl:async()=>new Response(exact)});
    assert.equal((await json(prefix+'actions/runs/1')).data.length,2*1024*1024-11);
    const jsonState={emitted:0,cancelled:0,arrayBuffer:0};
    const overflowJSON=assistantPublic591Reader({env,fetchImpl:async()=>streamed(32768,100,jsonState)});
    await assert.rejects(overflowJSON(prefix+'actions/runs/1'),/NATIVE591_V2_EVIDENCE_UNAVAILABLE/);
    assert(jsonState.emitted<100&&jsonState.cancelled>0);assert.equal(jsonState.arrayBuffer,0);
    const zipState={emitted:0,cancelled:0,arrayBuffer:0};
    const overflowZIP=assistantPublic591Reader({env,fetchImpl:async(url,options)=>{
      if(url.startsWith('https://api.github.com/'))return new Response(null,{status:302,headers:{Location:signedUrl}});
      assert.equal(options.headers,undefined);return streamed(4096,32,zipState);
    }});
    await assert.rejects(overflowZIP(prefix+'actions/artifacts/1/zip',{zip:true}),/NATIVE591_V2_EVIDENCE_UNAVAILABLE/);
    assert(zipState.emitted<32&&zipState.cancelled>0);assert.equal(zipState.arrayBuffer,0);
    let redirectCalls=0;
    const invalid=assistantPublic591Reader({env,fetchImpl:async()=>{
      redirectCalls++;return new Response(null,{status:302,headers:{Location:'https://user:secret@synthetic-artifact.invalid/private'}});
    }});
    await assert.rejects(invalid(prefix+'actions/artifacts/1/zip',{zip:true}),error=>error.message==='NATIVE591_V2_EVIDENCE_UNAVAILABLE');
    assert.equal(redirectCalls,1);
    let count=0;
    const counted=assistantPublic591Reader({env,fetchImpl:async()=>{count++;return new Response('{}');}});
    for(let i=0;i<24;i++)await counted(prefix+'actions/runs/1');
    await assert.rejects(counted(prefix+'actions/runs/1'));assert.equal(count,24);
    let zipCalls=0;
    const zipBudget=assistantPublic591Reader({env,fetchImpl:async url=>{
      zipCalls++;return url.startsWith('https://api.github.com/')
        ?new Response(null,{status:302,headers:{Location:signedUrl}}):new Response(new Uint8Array(1));
    }});
    for(let i=0;i<12;i++)await zipBudget(prefix+'actions/artifacts/1/zip',{zip:true});
    await assert.rejects(zipBudget(prefix+'actions/artifacts/1/zip',{zip:true}));assert.equal(zipCalls,24);
    let clock=0,clockCalls=0;
    const timed=assistantPublic591Reader({env,now:()=>clock,fetchImpl:async()=>{clockCalls++;return new Response('{}');}});
    clock=50000;await timed(prefix+'actions/runs/1');assert.equal(timeoutValues.at(-1),10000);
    clock=60000;await assert.rejects(timed(prefix+'actions/runs/1'));assert.equal(clockCalls,1);
    let duringFetch=0;
    const elapsed=assistantPublic591Reader({env,now:()=>duringFetch,fetchImpl:async()=>{
      duringFetch=60001;return new Response('{}');
    }});
    await assert.rejects(elapsed(prefix+'actions/runs/1'));
    assert(timeoutValues.every(ms=>ms>0&&ms<=15000));
    assert.deepEqual(written,[]);assert.deepEqual(logged,[]);
  }finally{t.mock.restoreAll();}
});


// Genuine reviewed P0 follow-up, not the potentially changed current PR tree.
const REVIEWED_FOLLOWUP = 'c72d6730bd235954091416268e7af649b46452d9';
const REVIEWED_FOLLOWUP_TREE = 'b2b49abd10c186115759f3792ecc8fd312049126';
const originalWorkflow = 'name: Validate RavRadar pull request\non:\n  pull_request:\npermissions:\n  contents: read\n'
  + 'jobs:\n  validate:\n    steps:\n      - name: ' + STEP + '\n        shell: bash\n        run: |\n          set -euo pipefail\n'
  + COMMANDS.map(command => '          ' + command + '\n').join('')
  + '\n      - name: Validate source contracts and release governance\n        run: npm run validate:source\n';
const candidateWorkflow = originalWorkflow.replace('  contents: read\n','  contents: read\n  actions: read\n')
  .replace(nativeBlock(originalWorkflow), NEW_NATIVE_BLOCK);
const run = {id:ORIGIN.run,run_attempt:1,head_sha:ORIGIN.head,path:WORKFLOW,event:'pull_request',
  repository:{full_name:ORIGIN.repository},pull_requests:[{number:671}],head_branch:'test-branch',
  status:'completed',conclusion:'failure',created_at:'2026-10-19T05:15:10Z'};
const jobs = {total_count:1,jobs:[{id:ORIGIN.job,name:JOB,run_id:ORIGIN.run,run_attempt:1,head_sha:ORIGIN.head,
  status:'completed',conclusion:'failure',steps:[
    {name:STEP,number:15,status:'completed',conclusion:'success',completed_at:ORIGIN.completedAt},
    {name:'Validate source contracts and release governance',number:16,status:'completed',conclusion:'failure'},
    {name:'Validate isolated restart and two ordinary national followers',number:17,status:'completed',conclusion:'skipped'},
  ]}]};
const runtime = {platform:'linux',arch:'x64',imageOS:'ubuntu24',imageVersion:'20261012.334.1',node:'v22.23.3',
  python:'Python 3.12.15',pythonLocation:'/opt/hostedtoolcache/Python/3.12.15/x64',
  ldLibraryPath:'/opt/hostedtoolcache/Python/3.12.15/x64/lib',pgBindir:'/usr/lib/postgresql/16/bin',
  pgMajors:[16,16,16,16],git:'git version 2.55.0',overrides:[]};
const oid='a'.repeat(40),newOid='b'.repeat(40);
const tree = [['js/core/ravscore-model-bundle.generated.js','100644','blob',oid],
  ['scripts/lib/checkpoint-cas-native-postgres.mjs','100644','blob',oid],
  ['scripts/lib/established-native-current-origin-source-target-inventory.json','100644','blob',oid],
  ['supabase/migrations/20261019060000_last_mile.sql','100644','blob',oid],
  ['version.json','100644','blob',oid]];

test('only the three named current UI and PR-workflow callers are non-native inputs',()=>{
  const callers=['scripts/test-mobile-start-and-live-cache-4.0.74.mjs','scripts/test-current-arrow-land-mask.mjs',
    'scripts/test-workflow-validation-order-4.0.108.mjs'];
  for(const file of callers){
    assert.equal(NON_NATIVE_TEST_INPUTS.filter(value=>value===file).length,1);
    const before=[...tree,[file,'100644','blob',oid]],after=[...tree,[file,'100644','blob',newOid]];
    assert.equal(verifyInputTrees(before,after).retainedEntries,tree.length);
    assert.throws(()=>verifyInputTrees(before,after.map(row=>row[0]===file?[file,'120000','blob',newOid]:row)));
    assert.throws(()=>verifyInputTrees(before,tree),'A named current caller cannot disappear');
  }
  for(const file of ['scripts/test-current-arrow-land-mask-other.mjs','scripts/lib/current-arrow-land-mask.mjs',
    'js/map/current-arrow-land-mask.js','scripts/test-workflow-validation-order-4.0.108-other.mjs',
    'scripts/lib/workflow-validation-order.mjs'])
    assert.throws(()=>verifyInputTrees(tree,[...tree,[file,'100644','blob',newOid]]));
});

test('exact native phase reuse; drift, missing evidence and later failure execute normal PG', async () => {
  verifyWorkflow(originalWorkflow,candidateWorkflow);
  assert.throws(()=>verifyWorkflow(originalWorkflow,candidateWorkflow.replace('npm run validate:source','true')));
  assert.throws(()=>verifyWorkflow(originalWorkflow,candidateWorkflow.replace('contents: read','contents: write')));
  assert.throws(()=>verifyWorkflow(originalWorkflow,candidateWorkflow.replace('github.token','secrets.UNRELATED')));
  const repaired=[...tree,...NON_NATIVE_TEST_INPUTS.map(file=>[file,'100644','blob',newOid]),
    ...NON_NATIVE_PROSE.map(file=>[file,'100644','blob',newOid])];
  assert.equal(verifyInputTrees(tree,repaired).retainedEntries,tree.length);
  for(const row of tree){const next=copy(tree);next.find(value=>value[0]===row[0])[3]=newOid;
    assert.throws(()=>verifyInputTrees(tree,next),'Actual PG/model/inventory/migration/version changes must rerun');}
  assert.throws(()=>verifyInputTrees(tree,[...tree,['scripts/test-unreviewed.mjs','100644','blob',newOid]]));
  assert.throws(()=>verifyInputTrees(tree,[...tree,[NON_NATIVE_TEST_INPUTS[0],'120000','blob',newOid]]));
  assert.throws(()=>verifyInputTrees(repaired,tree),'Even reviewed existing tests may not disappear');
  assert.deepEqual(parseTree('100644 blob '+oid+'\tversion.json\0'),[['version.json','100644','blob',oid]]);
  assert.equal(verifyOriginMetadata(run,jobs).sourceConclusion,'failure','A failed whole source run is NOT relabelled green');
  for(const mutate of [value=>value.run_attempt++,value=>value.head_sha=newOid,
    value=>value.conclusion='success',value=>value.pull_requests=[],value=>value.path='other.yml']){
    const value=copy(run);mutate(value);assert.throws(()=>verifyOriginMetadata(value,jobs));}
  for(const mutate of [value=>value.jobs[0].steps[0].conclusion='failure',value=>value.jobs[0].steps[0].number=14,
    value=>value.jobs[0].head_sha=newOid,value=>value.jobs[0].run_attempt=2,
    value=>value.jobs[0].steps[1].conclusion='success',value=>value.total_count=2]){
    const value=copy(jobs);mutate(value);assert.throws(()=>verifyOriginMetadata(run,value));}
  assert.throws(()=>verifyOrigin(run,jobs,Buffer.from('cache marker or invented green log')));
  verifyEnvironment(runtime);
  for(const [key,value]of Object.entries({imageVersion:'new-image',node:'v22.0.0',python:'Python 3.12.99',
    pgMajors:[16,16,16,17],overrides:['NODE_OPTIONS'],ldLibraryPath:'/elsewhere',arch:'arm64'}))
    assert.throws(()=>verifyEnvironment({...runtime,[key]:value}));
  const later={...copy(run),id:ORIGIN.run+1},laterJobs=copy(jobs);
  laterJobs.jobs[0].run_id=later.id;
  const listing={total_count:1,workflow_runs:[later]},byRun=new Map([[later.id,laterJobs]]);
  verifyLaterRuns(listing,byRun,run,ORIGIN.run+2);
  for(const conclusion of ['failure','cancelled','timed_out',null]){
    const changed=copy(laterJobs);changed.jobs[0].steps[0].conclusion=conclusion;
    assert.throws(()=>verifyLaterRuns(listing,new Map([[later.id,changed]]),run,ORIGIN.run+2));}
  assert.throws(()=>verifyLaterRuns({...listing,total_count:101},byRun,run,ORIGIN.run+2));
  assert.throws(()=>verifyLaterRuns(listing,new Map(),run,ORIGIN.run+2));
  assert.equal((await decideReuse({env:{}})).status,'EXECUTE');

  // Optional LOCAL retained genuine log drives the complete success and
  // negative decision branches in the single focused preparation run. CI's
  // contract remains offline and always tests the metadata/input boundaries;
  // the production wrapper itself must fetch+verify the genuine log each time.
  if(process.env.NATIVE_REUSE_TEST_LOG) {
    const log=await fs.readFile(process.env.NATIVE_REUSE_TEST_LOG);verifyOrigin(run,jobs,log);
    const currentId=ORIGIN.run+2,current={...run,id:currentId,head_sha:newOid,status:'in_progress',conclusion:null};
    const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:ORIGIN.repository,PULL_REQUEST_NUMBER:'671',
      GITHUB_RUN_ATTEMPT:'1',SOURCE_GATE_HEAD_SHA:newOid,GITHUB_RUN_ID:String(currentId)};
    const readGit=args=>{
      if(args[0]==='status'||args[0]==='for-each-ref'||args[0]==='merge-base')return '';
      if(args[0]==='rev-parse'&&args[1]==='HEAD^{commit}')return newOid;
      if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false\n';
      if(args[0]==='rev-parse')return verifyInputTrees(tree,tree).frozenGitTrees.find(row=>args[1]===row.head+'^{tree}').tree;
      if(args[0]==='show')return args[1].startsWith('HEAD:')?candidateWorkflow:originalWorkflow;
      if(args[0]==='ls-tree')return tree.map(([file,mode,type,id])=>mode+' '+type+' '+id+'\t'+file+'\0').join('');
      throw new Error('Unexpected Git call');
    };
    const get=async route=>{
      if(route.endsWith('/logs'))return log;
      if(route.endsWith('/pulls/671'))return {number:671,state:'open',base:{repo:{full_name:ORIGIN.repository},ref:'main'},head:{repo:{full_name:ORIGIN.repository},sha:current.head_sha,ref:current.head_branch}};
      if(route.endsWith('/runs/'+ORIGIN.run))return run;
      if(route.endsWith('/runs/'+currentId))return current;
      if(route.includes('/attempts/1/jobs'))return jobs;
      if(route.includes('/workflows/'))return {total_count:2,workflow_runs:[run,current]};
      throw new Error('Unexpected API call');
    };
    const options={env,get,readGit,getEnvironment:()=>runtime};
    const accepted=await decideReuse(options);
    assert.equal(accepted.status,'REUSED');assert.equal(accepted.executedInThisRun,false);assert.equal(accepted.origin.head,ORIGIN.head);
    assert.equal((await decideReuse({...options,get:async()=>{throw new Error('Unavailable');}})).status,'EXECUTE');
    assert.equal((await decideReuse({...options,getEnvironment:()=>({...runtime,imageVersion:'changed'})})).status,'EXECUTE');
    assert.equal((await decideReuse({...options,get:async(route,...rest)=>route.endsWith('/logs')?Buffer.from('wrong'):get(route,...rest)})).status,'EXECUTE');
  }
});

test('follow-up PR identity and both native branch histories remain independently strict',async()=>{
  const number=ORIGIN.pullRequest+1,current={...copy(run),id:ORIGIN.run+5,head_sha:newOid,
    head_branch:'test-followup-branch',pull_requests:[{number}],status:'in_progress',conclusion:null};
  const pr={number,state:'open',base:{repo:{full_name:ORIGIN.repository},ref:'main'},
    head:{repo:{full_name:ORIGIN.repository},sha:newOid,ref:current.head_branch}};
  assert.equal(verifyCurrentPullRequest(pr,current,number).number,number);
  for(const mutate of [v=>v.number++,v=>v.state='closed',v=>v.head.sha=oid,v=>v.head.ref='other',
      v=>v.head.repo.full_name='other/repo',v=>v.base.ref='other',v=>v.base.repo.full_name='other/repo']){
    const value=copy(pr);mutate(value);assert.throws(()=>verifyCurrentPullRequest(value,current,number));}
  assert.throws(()=>verifyCurrentPullRequest(pr,{...current,pull_requests:[]},number));
  const oldLater={...copy(run),id:ORIGIN.run+2},newLater={...copy(current),id:ORIGIN.run+3,status:'completed',conclusion:'failure'};
  const laterJobs=value=>{const result=copy(jobs);Object.assign(result.jobs[0],{run_id:value.id,head_sha:value.head_sha});return result;};
  const oldJobs=laterJobs(oldLater),newJobs=laterJobs(newLater);
  verifyLaterRuns({total_count:1,workflow_runs:[oldLater]},new Map([[oldLater.id,oldJobs]]),run,current.id,run.head_branch);
  verifyLaterRuns({total_count:1,workflow_runs:[newLater]},new Map([[newLater.id,newJobs]]),run,current.id,current.head_branch);
  for(const value of [oldLater,newLater]){
    const failed=laterJobs(value);failed.jobs[0].steps[0].conclusion='failure';
    assert.throws(()=>verifyLaterRuns({total_count:1,workflow_runs:[value]},new Map([[value.id,failed]]),run,current.id,value.head_branch));
  }
  assert.throws(()=>verifyLaterRuns({total_count:1,workflow_runs:[oldLater]},new Map([[oldLater.id,oldJobs]]),run,current.id,current.head_branch));
  if(process.env.NATIVE_REUSE_TEST_LOG){
    const log=await fs.readFile(process.env.NATIVE_REUSE_TEST_LOG);verifyOrigin(run,jobs,log);
    const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:ORIGIN.repository,PULL_REQUEST_NUMBER:String(number),GITHUB_RUN_ATTEMPT:'1',SOURCE_GATE_HEAD_SHA:newOid,GITHUB_RUN_ID:String(current.id)};
    const readGit=args=>{
      if(['status','for-each-ref','merge-base'].includes(args[0]))return '';
      if(args[0]==='rev-parse'&&args[1]==='HEAD^{commit}')return newOid;
      if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false\n';
      if(args[0]==='rev-parse')return verifyInputTrees(tree,tree).frozenGitTrees.find(row=>args[1]===row.head+'^{tree}').tree;
      if(args[0]==='show')return args[1].startsWith('HEAD:')?candidateWorkflow:originalWorkflow;
      if(args[0]==='ls-tree')return tree.map(([file,mode,type,id])=>mode+' '+type+' '+id+'\t'+file+'\0').join('');
      throw new Error('Unexpected Git call');
    };
    const visited=[];
    const get=async route=>{
      visited.push(route);
      if(route.endsWith('/logs'))return log;
      if(route.endsWith('/pulls/'+number))return pr;
      if(route.endsWith('/runs/'+ORIGIN.run))return run;
      if(route.endsWith('/runs/'+current.id))return current;
      if(route.includes('/runs/'+ORIGIN.run+'/attempts/1/jobs'))return jobs;
      if(route.includes('/runs/'+oldLater.id+'/attempts/1/jobs'))return oldJobs;
      if(route.includes('/runs/'+newLater.id+'/attempts/1/jobs'))return newJobs;
      if(route.includes('/workflows/')){
        const branch=new URL('https://api.github.com'+route).searchParams.get('branch');
        if(branch===run.head_branch)return {total_count:2,workflow_runs:[run,oldLater]};
        if(branch===current.head_branch)return {total_count:2,workflow_runs:[current,newLater]};
      }
      throw new Error('Unexpected API call');
    };
    const options={env,get,readGit,getEnvironment:()=>runtime};
    const accepted=await decideReuse(options);assert.equal(accepted.status,'REUSED');assert.equal(accepted.branchAudits.length,2);
    for(const branch of [run.head_branch,current.head_branch])assert(visited.some(route=>route.includes('/workflows/')&&new URL('https://api.github.com'+route).searchParams.get('branch')===branch));
    for(const value of [oldLater,newLater]){
      const failed=laterJobs(value);failed.jobs[0].steps[0].conclusion='failure';
      assert.equal((await decideReuse({...options,get:route=>route.includes('/runs/'+value.id+'/attempts/1/jobs')?failed:get(route)})).status,'EXECUTE');
    }
    assert.equal((await decideReuse({...options,get:route=>route.endsWith('/pulls/'+number)?{...pr,state:'closed'}:get(route)})).status,'EXECUTE');
    assert.equal((await decideReuse({...options,get:route=>route.includes('/workflows/')?{total_count:101,workflow_runs:[]}:get(route)})).status,'EXECUTE');
  }
});

test('only exact reviewed follow-up inputs preserve every original retained PG tree entry',async()=>{
  const {execFileSync}=await import('node:child_process');
  const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024});
  assert.equal(git(['rev-parse',REVIEWED_FOLLOWUP+'^{commit}']).trim(),REVIEWED_FOLLOWUP);
  assert.equal(git(['rev-parse',REVIEWED_FOLLOWUP+'^{tree}']).trim(),REVIEWED_FOLLOWUP_TREE);
  const before=parseTree(git(['ls-tree','-rz','--full-tree',ORIGIN.head]));
  const after=parseTree(git(['ls-tree','-rz','--full-tree',REVIEWED_FOLLOWUP]));
  const readSource=(file,side)=>git(['show',(side==='before'?ORIGIN.head:REVIEWED_FOLLOWUP)+':'+file]);
  const result=verifyInputTrees(before,after,readSource);
  const currentMapCallers=['scripts/test-mobile-start-and-live-cache-4.0.74.mjs','scripts/test-current-arrow-land-mask.mjs',
    'scripts/test-workflow-validation-order-4.0.108.mjs'];
  // The original3228 inventory included these three source-only current callers.
  // Account for all three actual regular Git entries explicitly; retain every other
  // original input, fixed-Git tree and all existing drift/refusal assertions.
  for(const file of currentMapCallers){
    for(const entries of [before,after]){
      const found=entries.filter(row=>row[0]===file);assert.equal(found.length,1);
      assert.equal(found[0][1],'100644');assert.equal(found[0][2],'blob');
    }
  }
  assert.equal(result.retainedEntries+currentMapCallers.length,3228);assert.equal(result.followupWorkflowWholeInverse,true);
  assert.throws(()=>verifyInputTrees([...before,before[0]],after,readSource));
  assert.throws(()=>verifyInputTrees(before,[...after,after[0]],readSource));
  assert.deepEqual(result.exactFollowupInputs.slice().sort(),FOLLOWUP_INPUTS.map(row=>row.path).sort());
  for(const pin of FOLLOWUP_INPUTS){
    const changed=copy(after);changed.find(row=>row[0]===pin.path)[3]=newOid;
    assert.throws(()=>verifyInputTrees(before,changed,readSource));
    assert.throws(()=>verifyInputTrees(before,after,(file,side)=>readSource(file,side)+(file===pin.path&&side==='after'?'\n':'')));
  }
  assert.throws(()=>verifyInputTrees(before,after));
});

test('actual committed follow-up drift selects original PG before any network access',async t=>{
  const {execFileSync}=await import('node:child_process');
  const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024,
    env:{...process.env,GIT_NO_LAZY_FETCH:'1'}});
  const head=git(['rev-parse','HEAD^{commit}']).trim();
  if(head===REVIEWED_FOLLOWUP){
    t.skip('Actual follow-up HEAD is not committed yet; future-tree refusal remains unqualified.');
    return;
  }
  git(['merge-base','--is-ancestor',REVIEWED_FOLLOWUP,head]);
  const before=parseTree(git(['ls-tree','-rz','--full-tree',ORIGIN.head]));
  const after=parseTree(git(['ls-tree','-rz','--full-tree',head]));
  const readSource=(file,side)=>git(['show',(side==='before'?ORIGIN.head:head)+':'+file]);
  assert.throws(()=>verifyInputTrees(before,after,readSource),
    'Actual committed delivery additions are not unchanged native inputs');
  let apiCalls=0,environmentCalls=0;
  const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:ORIGIN.repository,
    PULL_REQUEST_NUMBER:'1',GITHUB_RUN_ATTEMPT:'1',SOURCE_GATE_HEAD_SHA:head,
    GITHUB_RUN_ID:String(ORIGIN.run+2)};
  const decision=await decideReuse({env,readGit:git,
    get:async()=>{apiCalls++;throw new Error('Unexpected network boundary');},
    getEnvironment:()=>{environmentCalls++;return runtime;}});
  assert.deepEqual(decision,{status:'EXECUTE',reason:'native-input-or-evidence-unavailable-or-different'});
  assert.equal(apiCalls,0);assert.equal(environmentCalls,0);
});

// Preserve the exact oldP0 receipt oracle above at its genuine historical input.
// Current585 must execute its own normal phase, never inherit that receipt.
test('native continuity appends its real phase while the whole585 command stays exact',()=>{
  assert.equal(COMMANDS.length,2);assert.equal(CURRENT_COMMANDS.length,2);
  assert.equal(CURRENT_COMMANDS[0],COMMANDS[0]);
  assert.equal(ACCOUNT_STATISTICS_ASSISTANT_COMMANDS.length,2);
  assert.equal(ACCOUNT_STATISTICS_ASSISTANT_COMMANDS[0],COMMANDS[0]);
  assert.equal(ACCOUNT_STATISTICS_ASSISTANT_COMMANDS[1],COMMANDS[1]+' --account-statistics-assistant');
  assert.equal(CURRENT_COMMANDS[1],ACCOUNT_STATISTICS_ASSISTANT_COMMANDS[1]+' --native-original-continuity');
  assert.notDeepEqual(CURRENT_COMMANDS,COMMANDS);
  assert.equal(NATIVE_SCRIPT,'set -euo pipefail\n'+CURRENT_COMMANDS.join('\n')+'\n');
});

test('assistant later-H0 appends its actual phase without retagging whole586 commands',()=>{
  assert.equal(ASSISTANT_LATER_H0_COMMANDS.length,2);
  assert.equal(ASSISTANT_LATER_H0_COMMANDS[0],CURRENT_COMMANDS[0]);
  assert.equal(ASSISTANT_LATER_H0_COMMANDS[1],CURRENT_COMMANDS[1]+' --assistant-later-h0');
  assert.notDeepEqual(ASSISTANT_LATER_H0_COMMANDS,CURRENT_COMMANDS);
  assert.equal(ASSISTANT_LATER_H0_SCRIPT,'set -euo pipefail\n'+ASSISTANT_LATER_H0_COMMANDS.join('\n')+'\n');
});


test('current586 phase artifact is independent, exact, honest, and does not relax conservative native inputs',async()=>{
  const actualWorkflow=(await fs.readFile(WORKFLOW,'utf8')).replace(/\r\n/g,'\n');
  // Only the historical V1 oracle and its mutation inputs receive the exact
  // qualified FULL workflow. V2 captures the actual workflow bytes unchanged.
  const historicalWorkflow=projectSourceImpactWorkflowFull(readHistoricalSourceSetupWorkflow());
  const workflow=inverseSourceBeforePostgresWorkflow(historicalWorkflow);
  verifyCurrentSourceWorkflow(actualWorkflow);
  // The existing586 whole-workflow hash below proves the complete inverse, not a new current hash.
  for(const changed of [
    historicalWorkflow.replace('npm run validate:source','true'),
    historicalWorkflow.replace('          node scripts/native-postgres-evidence.mjs','          true'),
    historicalWorkflow.replace('path: .cache/native-postgres-phase-proof.json','path: .cache/changed.json'),
    historicalWorkflow.replace(SOURCE_BEFORE_POSTGRES_BLOCK,''),
    historicalWorkflow+SOURCE_BEFORE_POSTGRES_BLOCK,
  ])assert.throws(()=>inverseSourceBeforePostgresWorkflow(changed));
  assert.equal(workflow.split(CURRENT586_PHASE_UPLOAD_BLOCK).length,2);
  verifyCurrent586Workflow(workflow,workflow);
  assert.equal(inverseCurrent586PhaseUpload(workflow).includes(CURRENT586_PHASE_UPLOAD),false);
  assert(workflow.indexOf('      - name: '+STEP)<workflow.indexOf(CURRENT586_PHASE_UPLOAD_BLOCK));
  assert(workflow.indexOf(CURRENT586_PHASE_UPLOAD_BLOCK)<workflow.indexOf('      - name: Validate source contracts'));
  for(const changed of [workflow.replace('retention-days: 30','retention-days: 29'),
    workflow.replace('path: .cache/native-postgres-phase-proof.json','path: .cache/source-tree-content-proof.json'),
    workflow.replace('npm run validate:source','true'),workflow+CURRENT586_PHASE_UPLOAD_BLOCK])
    assert.throws(()=>verifyCurrent586Workflow(workflow,changed));
  for(const file of ['docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md','scripts/test-dmi-native-provenance.py',
    'docs/handbook/any-other-document.md']){
    const before=[...tree,[file,'100644','blob',oid]],after=[...tree,[file,'100644','blob',newOid]];
    assert.throws(()=>verifyInputTrees(before,after),'These whole inputs remain conservatively retained');
  }
  verifyCurrent586Runtime(runtime,runtime);
  for(const changed of [{...runtime,imageVersion:'20261022.1'},{...runtime,node:'v22.99.0'},
    {...runtime,pgMajors:[16,16,17,16]},{...runtime,overrides:['PYTHONPATH']}])
    assert.throws(()=>verifyCurrent586Runtime(changed,runtime));
  const current={run:ORIGIN.run+20,attempt:1,head:newOid,pullRequest:700,branch:'synthetic-native586'};
  const executed={phase:'NATIVE_ORIGINAL_CONTINUITY',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...CURRENT_COMMANDS],eligibleForReuse:true,nativeInput:verifyInputTrees(tree,tree),runtime};
  assert.equal(verifyCurrent586PhaseReceipt(executed,current).status,'EXECUTED');
  const reused={...executed,status:'REUSED',executedInThisRun:false,
    origin:{run:current.run-1,attempt:1,job:123,head:oid,artifactId:456,artifactDigest:'sha256:'+'c'.repeat(64)}};
  assert.equal(verifyCurrent586PhaseReceipt(reused,current).status,'REUSED');
  for(const mutate of [v=>v.executedInThisRun=true,v=>v.origin=null,v=>v.origin.attempt=2,
    v=>v.commands=[...COMMANDS],v=>v.current={...current,head:oid},v=>v.eligibleForReuse=false]){
    const bad=copy(reused);mutate(bad);assert.throws(()=>verifyCurrent586PhaseReceipt(bad,current));
  }
  assert.equal((await decideCurrent586Reuse({env:{}})).status,'EXECUTE');
});

test('current586 exact EXECUTED origin survives a later source failure; missing, stale, failed or changed evidence executes PG',async()=>{
  const {createHash}=await import('node:crypto');
  const hash=value=>createHash('sha256').update(value).digest('hex');
  // A genuine small stored ZIP is passed to the same normal Python reader.
  // These are artificial phase/transport inputs, never invented SQL execution.
  const zipProof=raw=>{
    const name=Buffer.from('native-postgres-phase-proof.json');let crc=0xffffffff;
    for(const byte of raw){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    crc=(crc^0xffffffff)>>>0;
    const local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);
    local.writeUInt32LE(raw.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(name.length,26);
    central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
    central.writeUInt32LE(crc,16);central.writeUInt32LE(raw.length,20);central.writeUInt32LE(raw.length,24);
    central.writeUInt16LE(name.length,28);
    end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
    end.writeUInt32LE(central.length+name.length,12);end.writeUInt32LE(local.length+name.length+raw.length,16);
    return Buffer.concat([local,name,raw,central,name,end]);
  };
  const workflow=inverseSourceBeforePostgresWorkflow(readHistoricalSourceSetupWorkflow()),
    oldId=ORIGIN.run+10,currentId=oldId+2,number=700;
  const branch='synthetic-native586',nativeInput=verifyInputTrees(tree,tree);
  const oldRun={id:oldId,run_attempt:1,head_sha:oid,head_branch:branch,path:WORKFLOW,event:'pull_request',
    repository:{full_name:ORIGIN.repository},head_repository:{full_name:ORIGIN.repository},
    pull_requests:[{number}],status:'completed',conclusion:'failure',created_at:'2026-10-22T01:00:00Z'};
  const current={...copy(oldRun),id:currentId,head_sha:newOid,status:'in_progress',conclusion:null};
  const oldJobs={total_count:1,jobs:[{id:123,name:JOB,run_id:oldId,run_attempt:1,head_sha:oid,
    status:'completed',conclusion:'failure',steps:[
      ...Array.from({length:14},(_,i)=>({number:i+1,name:'synthetic prerequisite '+i,status:'completed',conclusion:'success'})),
      {name:STEP,number:15,status:'completed',conclusion:'success',started_at:'2026-10-22T01:01:00Z',completed_at:'2026-10-22T01:02:00Z'},
      {name:CURRENT586_PHASE_UPLOAD,number:16,status:'completed',conclusion:'success',completed_at:'2026-10-22T01:02:02Z'},
      {name:'Validate source contracts and release governance',number:17,status:'completed',conclusion:'failure'},
      {name:'Validate isolated restart and two ordinary national followers',number:18,status:'completed',conclusion:'skipped'},
    ]}]};
  const executed={phase:'NATIVE_ORIGINAL_CONTINUITY',status:'EXECUTED',executedInThisRun:true,origin:null,
    current:{run:oldId,attempt:1,head:oid,pullRequest:number,branch},commands:[...CURRENT_COMMANDS],
    eligibleForReuse:true,nativeInput,runtime};
  const proof={schemaVersion:1,kind:CURRENT586_PHASE_KIND,repository:ORIGIN.repository,headSha:oid,
    sourceTreeSha256:'sha256:'+'c'.repeat(64),privatePayloadIncluded:false,nativePostgres:executed};
  const raw=Buffer.from(JSON.stringify(proof)),zip=zipProof(raw);
  const artifact={id:456,name:'native586-phase-'+oldId+'-1-'+oid,expired:false,size_in_bytes:zip.length,
    digest:'sha256:'+hash(zip),created_at:'2026-10-22T01:02:01Z',workflow_run:{id:oldId,head_sha:oid}};
  const phase=verifyCurrent586Metadata(oldRun,oldJobs,executed.current);
  assert.equal(phase.sourceConclusion,'failure','Only PG is reusable; the failed source remains failed');
  assert.equal(verifyCurrent586Artifact(artifact,zip,raw,oldRun,phase).nativePostgres.status,'EXECUTED');
  for(const mutate of [v=>v.expired=true,v=>v.digest='sha256:'+'d'.repeat(64),v=>v.size_in_bytes++,
    v=>v.workflow_run.head_sha=newOid,v=>v.created_at='2026-10-22T01:03:00Z']){
    const bad=copy(artifact);mutate(bad);assert.throws(()=>verifyCurrent586Artifact(bad,zip,raw,oldRun,phase));
  }
  const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:ORIGIN.repository,PULL_REQUEST_NUMBER:String(number),
    GITHUB_RUN_ATTEMPT:'1',GITHUB_HEAD_REF:branch,SOURCE_GATE_HEAD_SHA:newOid,GITHUB_RUN_ID:String(currentId)};
  const pr={number,state:'open',base:{repo:{full_name:ORIGIN.repository},ref:'main'},
    head:{repo:{full_name:ORIGIN.repository},sha:newOid,ref:branch}};
  const lines=rows=>rows.map(([file,mode,type,id])=>mode+' '+type+' '+id+'\t'+file+'\0').join('');
  const readGit=args=>{
    if(['status','for-each-ref','merge-base'].includes(args[0]))return '';
    if(args[0]==='rev-parse'&&args[1]==='HEAD^{commit}')return newOid;
    if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false\n';
    if(args[0]==='rev-parse')return nativeInput.frozenGitTrees.find(row=>args[1]===row.head+'^{tree}').tree;
    if(args[0]==='show'&&args[1].endsWith(':package.json'))return '{"version":"4.0.586"}';
    if(args[0]==='show'&&args[1].endsWith(':'+WORKFLOW))return workflow;
    if(args[0]==='show')return 'identical complete synthetic wrapper/test bytes';
    if(args[0]==='ls-tree')return lines(tree);
    throw new Error('Unexpected Git call');
  };
  const get=async route=>{
    if(route.endsWith('/pulls/'+number))return copy(pr);
    if(route.endsWith('/runs/'+oldId))return copy(oldRun);
    if(route.endsWith('/runs/'+currentId))return copy(current);
    if(route.endsWith('/runs/'+oldId+'/attempts/1/jobs?per_page=100'))return copy(oldJobs);
    if(route.endsWith('/runs/'+oldId+'/artifacts?per_page=100'))return {total_count:1,artifacts:[copy(artifact)]};
    if(route.endsWith('/artifacts/456/zip'))return zip;
    if(route.includes('/workflows/'))return {total_count:2,workflow_runs:[copy(current),copy(oldRun)]};
    throw new Error('Unexpected API call');
  };
  const options={env,get,readGit,getEnvironment:()=>copy(runtime)};
  const accepted=await decideCurrent586Reuse(options);
  assert.equal(accepted.status,'REUSED');assert.equal(accepted.executedInThisRun,false);
  assert.equal(accepted.origin.run,oldId);assert.equal(accepted.origin.artifactDigest,artifact.digest);
  const reusedRun={...copy(oldRun),id:oldId+1,head_sha:'d'.repeat(40)};
  const reusedJobs=copy(oldJobs);Object.assign(reusedJobs.jobs[0],{id:124,run_id:reusedRun.id,head_sha:reusedRun.head_sha});
  const reusedProof={...copy(proof),headSha:reusedRun.head_sha,nativePostgres:{...copy(accepted),
    current:{...accepted.current,run:reusedRun.id,head:reusedRun.head_sha}}};
  const reusedRaw=Buffer.from(JSON.stringify(reusedProof)),reusedZip=zipProof(reusedRaw);
  const reusedArtifact={...copy(artifact),id:457,name:'native586-phase-'+reusedRun.id+'-1-'+reusedRun.head_sha,
    size_in_bytes:reusedZip.length,digest:'sha256:'+hash(reusedZip),
    workflow_run:{id:reusedRun.id,head_sha:reusedRun.head_sha}};
  const getReused=async route=>{
    if(route.endsWith('/runs/'+reusedRun.id))return copy(reusedRun);
    if(route.endsWith('/runs/'+reusedRun.id+'/attempts/1/jobs?per_page=100'))return copy(reusedJobs);
    if(route.endsWith('/runs/'+reusedRun.id+'/artifacts?per_page=100'))return {total_count:1,artifacts:[copy(reusedArtifact)]};
    if(route.endsWith('/artifacts/457/zip'))return reusedZip;
    if(route.includes('/workflows/'))return {total_count:3,workflow_runs:[copy(current),copy(reusedRun),copy(oldRun)]};
    return get(route);
  };
  const viaLocator=await decideCurrent586Reuse({...options,get:getReused});
  assert.equal(viaLocator.status,'REUSED');assert.equal(viaLocator.origin.run,oldId);
  assert.notEqual(viaLocator.origin.run,reusedRun.id,'REUSED is a locator, never a new EXECUTED origin');
  const failedLater=copy(reusedJobs);failedLater.jobs[0].steps[14].conclusion='failure';
  assert.equal((await decideCurrent586Reuse({...options,get:route=>
    route.endsWith('/runs/'+reusedRun.id+'/attempts/1/jobs?per_page=100')?failedLater:getReused(route)})).status,'EXECUTE');
  for(const mutate of [v=>v.run_attempt=2,v=>v.head_sha=newOid,v=>v.status='in_progress',v=>v.conclusion='cancelled']){
    const bad=copy(oldRun);mutate(bad);
    assert.equal((await decideCurrent586Reuse({...options,get:route=>route.endsWith('/runs/'+oldId)?bad:get(route)})).status,'EXECUTE');
  }
  for(const mutate of [v=>v.jobs[0].steps[14].conclusion='failure',
    v=>v.jobs[0].steps[15].conclusion='skipped',v=>v.jobs[0].steps[16].status='in_progress',
    v=>v.jobs[0].steps.splice(15,1),v=>v.total_count=2]){
    const bad=copy(oldJobs);mutate(bad);
    assert.equal((await decideCurrent586Reuse({...options,get:route=>route.endsWith('/runs/'+oldId+'/attempts/1/jobs?per_page=100')?bad:get(route)})).status,'EXECUTE');
  }
  for(const file of ['supabase/migrations/new-native-input.sql','scripts/test-dmi-native-provenance.py',
    'docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md']){
    const changed=[...tree,[file,'100644','blob',newOid]];
    assert.equal((await decideCurrent586Reuse({...options,readGit:args=>
      args[0]==='ls-tree'&&args.at(-1)==='HEAD'?lines(changed):readGit(args)})).status,'EXECUTE');
  }
  assert.equal((await decideCurrent586Reuse({...options,getEnvironment:()=>({...runtime,imageVersion:'20261022.1'})})).status,'EXECUTE');
  assert.equal((await decideCurrent586Reuse({...options,get:async()=>{throw Error('Unavailable');}})).status,'EXECUTE');
  assert.equal((await decideCurrent586Reuse({...options,get:route=>route.includes('/workflows/')?
    {total_count:101,workflow_runs:[]}:get(route)})).status,'EXECUTE');
  const missing={total_count:0,artifacts:[]};
  assert.equal((await decideCurrent586Reuse({...options,get:route=>route.includes('/artifacts?')?missing:get(route)})).status,'EXECUTE');
});

test('assistant NEXT execution cannot be minted or reused as a whole586 phase',()=>{
  const current={run:ORIGIN.run+20,attempt:1,head:newOid,pullRequest:700,branch:'synthetic-assistant-next'};
  const next={phase:'ASSISTANT_LATER_H0',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...ASSISTANT_LATER_H0_COMMANDS],eligibleForReuse:false};
  assert.equal(verifyAssistantLaterH0PhaseReceipt(next,current).status,'EXECUTED');
  assert.notEqual(ASSISTANT_LATER_H0_PHASE_KIND,CURRENT586_PHASE_KIND);
  assert.throws(()=>verifyCurrent586PhaseReceipt(next,current));
  const predecessor={...next,phase:'NATIVE_ORIGINAL_CONTINUITY',commands:[...CURRENT_COMMANDS]};
  assert.equal(verifyCurrent586PhaseReceipt(predecessor,current).status,'EXECUTED');
  assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(predecessor,current));
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:current.run-1},
    v=>v.eligibleForReuse=true,v=>v.commands=[...CURRENT_COMMANDS],v=>v.current={...current,head:oid},
    v=>v.phase='NATIVE_ORIGINAL_CONTINUITY']){
    const changed=copy(next);mutate(changed);
    assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(changed,current));
  }
});

// Additive588 source/receipt guards only. Actual PG execution remains the normal native target.
import {
  ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_SCRIPT,
  ACTIVE_COMMANDS,ACTIVE_NATIVE_SCRIPT,ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND,
  verifyAssistantPublic587SuccessorPhaseReceipt,
} from './native-postgres-evidence.mjs';
import {ASSISTANT_PUBLIC587_SUCCESSOR_BINDING,requireAssistantPublic587SuccessorOutput}
  from './lib/assistant-later-h0-successor-source.mjs';
import {withFrozen587CheckpointPostgresSource} from './run-frozen586-assistant-later-h0-postgres-source.mjs';
import {compareAssistantPublic587Successor} from './lib/assistant-later-h0-postgres.mjs';
import {runNativeCheckpointSqlComparison,nativePostgresFailureDiagnostic}
  from './lib/checkpoint-cas-native-postgres.mjs';

test('public587 successor native commands append588 without retagging whole587 identities',async()=>{
  assert.deepEqual(ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS,[ASSISTANT_LATER_H0_COMMANDS[0],
    ASSISTANT_LATER_H0_COMMANDS[1]+' --assistant-public587-successor']);
  assert.equal(ASSISTANT_PUBLIC587_SUCCESSOR_SCRIPT,'set -euo pipefail\n'+ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS.join('\n')+'\n');
  if(AFTER601_ACTIVE){
    assert.deepEqual(ACTIVE_COMMANDS,[AFTER601_NATIVE_COMMAND]);
    assert.equal(ACTIVE_NATIVE_SCRIPT,AFTER601_NATIVE_SCRIPT);
  }else if(AFTER599_ACTIVE){
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_AFTER599_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_AFTER599_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER598_PHASE){
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_AFTER598_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_AFTER598_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER597_PHASE){
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_AFTER597_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_AFTER597_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===SCALAR597_LATER_H0_PHASE){
    assert.equal(ACTIVE_COMMANDS,SCALAR597_LATER_H0_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,SCALAR597_LATER_H0_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-installed593-origin591-successor'){
    assert.equal(ACTIVE_COMMANDS,INSTALLED593_ORIGINAL591_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,INSTALLED593_ORIGINAL591_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor'){
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'){
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_PUBLIC590_SUCCESSOR_SCRIPT);
  }else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'){
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_PUBLIC588_SUCCESSOR_SCRIPT);
  }else{
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'assistant-public587-successor');
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_PUBLIC587_SUCCESSOR_SCRIPT);
  }
  assert.notDeepEqual(ACTIVE_COMMANDS,ASSISTANT_LATER_H0_COMMANDS);
  const source=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
  const main=source.slice(source.indexOf('async function main() {'));
  assert(main.indexOf('requireAssistantPublic587SuccessorRelease()')<main.indexOf('spawnSync('));
  assert(main.includes("'-c',ACTIVE_NATIVE_SCRIPT]"));
  assert(main.includes("phase:'ASSISTANT_PUBLIC587_SUCCESSOR',eligibleForReuse:false"));
  assert(main.includes('commands:ACTIVE_COMMANDS'));
  assert(!main.includes('await decideReuse('));assert(!main.includes('await decideCurrent586Reuse('));
  const target=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  assert(target.indexOf('requireAssistantPublic587SuccessorRelease();')<target.indexOf('const PART_COUNT ='));
  assert(target.includes("const assistantPublic587SuccessorNative = process.argv.includes('--assistant-public587-successor');"));
  assert(target.includes("process.argv.includes('--assistant-later-h0') || assistantPublic587SuccessorNative"));
  assert(target.includes('includeAssistantPublic587Successor: assistantPublic587SuccessorNative'));
});

test('public587 successor receipt requires its own executed command and rejects every predecessor receipt',()=>{
  const current={run:ORIGIN.run+30,attempt:1,head:newOid,pullRequest:701,branch:'synthetic-public587-successor'};
  const next={phase:'ASSISTANT_PUBLIC587_SUCCESSOR',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS],eligibleForReuse:false};
  assert.equal(verifyAssistantPublic587SuccessorPhaseReceipt(next,current).status,'EXECUTED');
  assert.notEqual(ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND,ASSISTANT_LATER_H0_PHASE_KIND);
  assert.notEqual(ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND,CURRENT586_PHASE_KIND);
  assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(next,current));
  assert.throws(()=>verifyCurrent586PhaseReceipt(next,current));
  for(const [phase,commands]of [['ASSISTANT_LATER_H0',ASSISTANT_LATER_H0_COMMANDS],
    ['NATIVE_ORIGINAL_CONTINUITY',CURRENT_COMMANDS]]){
    assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt({...next,phase,commands:[...commands]},current));
  }
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:current.run-1},
    v=>v.eligibleForReuse=true,v=>v.commands=[...ASSISTANT_LATER_H0_COMMANDS],v=>v.commands=[...CURRENT_COMMANDS],
    v=>v.current={...current,head:oid},v=>v.phase='ASSISTANT_LATER_H0']){
    const changed=copy(next);mutate(changed);
    assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(changed,current));
  }
});

test('public587 native source and adapter reject unissued or extra operands before owned work',async t=>{
  let io=0,operands=0,callbacks=0;
  const poison=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING===null){
      assert.throws(()=>requireAssistantPublic587SuccessorOutput(),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
      await assert.rejects(compareAssistantPublic587Successor(poison),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
      await assert.rejects(withFrozen587CheckpointPostgresSource(()=>{callbacks++;}),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
    }else{
      requireAssistantPublic587SuccessorOutput();
      await assert.rejects(compareAssistantPublic587Successor(poison,poison),{code:'ERR_ASSERTION'});
      await assert.rejects(withFrozen587CheckpointPostgresSource(()=>{callbacks++;},poison),{code:'ERR_ASSERTION'});
    }
    assert.equal(io,0);assert.equal(operands,0);assert.equal(callbacks,0);
  }finally{t.mock.restoreAll();}
});

test('public587 native phase requires complete587 and refuses UNISSUED before native programs',async()=>{
  await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantPublic587Successor:true}),
    /Public587 successor requires the genuine complete587 native phase/);
  await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantPublic587Successor:'true'}),{code:'ERR_ASSERTION'});
  if(ASSISTANT_PUBLIC587_SUCCESSOR_BINDING===null)await assert.rejects(runNativeCheckpointSqlComparison({
    includeStatisticsRevision:true,includeNativeIdentity:true,includeCurrentMemoryWarmup:true,
    includeEstablishedNativeCurrentOrigin:true,includeLastMileEnclosure:true,includeAccountStatisticsAssistant:true,
    includeNativeOriginalContinuity:true,includeAssistantLaterH0:true,includeAssistantPublic587Successor:true,
  }),/ASSISTANT_PUBLIC587_SUCCESSOR_UNISSUED/);
  assert.deepEqual(nativePostgresFailureDiagnostic('ASSISTANT_PUBLIC587_SUCCESSOR','ERROR: 40001\n'),
    {phase:'ASSISTANT_PUBLIC587_SUCCESSOR',sqlState:'40001',category:'SQL_CAS_CONFLICT'});
});

test('public587 native source owns genuine whole587 adapter and factory with unchanged older pins',async()=>{
  const source=await fs.readFile('scripts/run-frozen586-assistant-later-h0-postgres-source.mjs','utf8');
  for(const pin of [
    '7df56f36f705db641b3f9476ee8ca1b4c4cfed0c','57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0',
    '6690b4abd7f75c8011f4646c60236a0f88ab2563477b2dce76bcdadbaa0c27b6',
    '8111a107b16ffdf6fdc9b2b5d50be837b18105da0b1f9e2aec4988b345640bce',
    'aab72babd27175a4276c2a2f1965c74bb021b4af','959f63d40c3980e804caa750da227cbd96e34a49',
    '51f12b62222bd998362186456323685ee52f26d3b6af38823428850acb4c20da',
    'e87ee5406f02681e6c5a6848ed8481e11168088d0799f7b399bfe7715edf17b0',
    '832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2',
  ])assert(source.includes(pin),pin);
  assert(source.includes('profile===FROZEN586||profile===FROZEN587'));
  assert(source.includes('withSource:withAuthenticated587PredecessorSource,requireOutput:requireAssistantPublic587SuccessorOutput'));
  assert(source.includes('assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256)'));
  assert(source.includes("fs.writeFile(target,row.raw,{flag:'wx',mode:0o600})"));
  assert(source.includes('await fs.readFile(target),raw'));
  assert(source.includes("phase='ADAPTER_IMPORT'"));assert(source.includes("phase='FACTORY_IMPORT'"));
});

test('public587 native wiring keeps same owned host and all old negative-case families before588',async()=>{
  const source=await fs.readFile('scripts/lib/checkpoint-cas-native-postgres.mjs','utf8');
  const start=source.indexOf("nativePhase='ASSISTANT_LATER_H0';");
  const end=source.indexOf("nativePhase='ASSISTANT_PUBLIC587_SUCCESSOR';");
  assert(start>=0&&end>start);
  const previous=source.slice(start,end);
  assert(previous.includes('withFrozen587CheckpointPostgresSource(async({adapter,factory})=>'));
  assert(previous.includes('adapter.compareAssistantLaterH0Successor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,'));
  assert(previous.includes('atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}'));
  assert(source.slice(end).includes('compareAssistantPublic587Successor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint})'));
  assert(source.includes("await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-pg-'))"));
  const adapter=await fs.readFile('scripts/lib/assistant-later-h0-postgres.mjs','utf8');
  assert(adapter.includes("sourcePhase:'assistant-later-h0',migrationCount:56,oidSlots:33,contractBodies:36"));
  assert(adapter.includes("sourcePhase:'assistant-public587-successor',migrationCount:57,oidSlots:35,contractBodies:38"));
  assert(adapter.includes("olderFixtures:Object.freeze(['native-original-continuity-current-same'])"));
  for(const retained of ["'account-statistics-assistant-current-same'","'last-mile-584-same'","'origin-current-same'",
    "'identity-same'","'after0600-same'","'grid-current'","['ffc','249','c1ac']",
    "['value',","['field',","['part',","['T',","'same-current-numeric-change'","'wrong-version'","'regression'"])
    assert(adapter.includes(retained),retained);
  assert(adapter.includes('assertWholeMetadataInverse(original,payload,NEXT)'));
  assert(adapter.includes('assert.notEqual((await runSql(sql)).code,0'));
  assert(adapter.includes("normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true"));
});

// Additiv kalender588→NEXT-kontrakt. Gamle native-orakler ovenfor bevares hele.
import {ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC588_SUCCESSOR_SCRIPT,
  ASSISTANT_PUBLIC588_SUCCESSOR_PHASE_KIND,verifyAssistantPublic588SuccessorPhaseReceipt}
  from './native-postgres-evidence.mjs';
import {ASSISTANT_PUBLIC588_SUCCESSOR_BINDING,requireAssistantPublic588SuccessorOutput,
  INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR,ACTIVE_ASSISTANT_SUCCESSOR}
  from './lib/assistant-later-h0-successor-source.mjs';
import {withFrozen588CheckpointPostgresSource} from './run-frozen586-assistant-later-h0-postgres-source.mjs';
import {compareAssistantPublic588Successor} from './lib/assistant-later-h0-postgres.mjs';
import {FROZEN588_CODE_SOURCE_PROVENANCE,withAuthenticated588PredecessorSource}
  from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedFrozen588Predecessor} from './lib/authenticated-frozen586-predecessor.mjs';

test('calendar588 successor commands and receipts never reuse or retag an older SQL execution',()=>{
  assert.deepEqual(ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS,[ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS[0],
    ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS[1]+' --assistant-public588-successor']);
  assert.equal(ASSISTANT_PUBLIC588_SUCCESSOR_SCRIPT,'set -euo pipefail\n'+ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS.join('\n')+'\n');
  const current={run:ORIGIN.run+41,attempt:1,head:newOid,pullRequest:701,branch:'synthetic-calendar588'};
  const receipt={phase:'ASSISTANT_PUBLIC588_SUCCESSOR',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS],eligibleForReuse:false};
  assert.equal(verifyAssistantPublic588SuccessorPhaseReceipt(receipt,current).status,'EXECUTED');
  assert.notEqual(ASSISTANT_PUBLIC588_SUCCESSOR_PHASE_KIND,ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND);
  for(const [phase,commands]of [['ASSISTANT_PUBLIC587_SUCCESSOR',ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS],
    ['ASSISTANT_LATER_H0',ASSISTANT_LATER_H0_COMMANDS],['NATIVE_ORIGINAL_CONTINUITY',CURRENT_COMMANDS]])
    assert.throws(()=>verifyAssistantPublic588SuccessorPhaseReceipt({...receipt,phase,commands:[...commands]},current));
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:current.run-1},
    v=>v.eligibleForReuse=true,v=>v.commands=[...ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS],
    v=>v.current={...current,head:oid},v=>v.phase='SOURCE_PRODUCER']){
    const changed=copy(receipt);mutate(changed);
    assert.throws(()=>verifyAssistantPublic588SuccessorPhaseReceipt(changed,current));
  }
  assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(receipt,current));
  assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(receipt,current));
  assert.throws(()=>verifyCurrent586PhaseReceipt(receipt,current));
});

test('calendar588 unissued child and unselected genuine parent stop before operands or owned I/O',async t=>{
  let io=0,operands=0,callbacks=0;
  const poison=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    if(ASSISTANT_PUBLIC588_SUCCESSOR_BINDING===null){
      assert.throws(()=>requireAssistantPublic588SuccessorOutput(),/ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED/);
      await assert.rejects(compareAssistantPublic588Successor(poison),/ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED/);
      await assert.rejects(withFrozen588CheckpointPostgresSource(()=>{callbacks++;}),/ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED/);
      assert.throws(()=>INACTIVE_ASSISTANT_PUBLIC588_SUCCESSOR.requireRelease(),/ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED/);
    }else{
      requireAssistantPublic588SuccessorOutput();
      await assert.rejects(compareAssistantPublic588Successor(poison,poison),{code:'ERR_ASSERTION'});
      await assert.rejects(withFrozen588CheckpointPostgresSource(()=>{callbacks++;},poison),{code:'ERR_ASSERTION'});
    }
    if(!FROZEN588_CODE_SOURCE_PROVENANCE.selected){
      for(const [key,value]of Object.entries(FROZEN588_CODE_SOURCE_PROVENANCE))
        if(key!=='selected')assert.equal(value,null,key);
      await assert.rejects(withAuthenticated588PredecessorSource(()=>{callbacks++;}),/FROZEN588_CODE_SOURCE_UNSELECTED/);
      await assert.rejects(readAuthenticatedFrozen588Predecessor(),/FROZEN588_CODE_SOURCE_UNSELECTED/);
    }
    assert.equal(io,0);assert.equal(operands,0);assert.equal(callbacks,0);
  }finally{t.mock.restoreAll();}
});

test('calendar588 native phase requires complete genuine588 before any programs or PostgreSQL',async()=>{
  await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantPublic588Successor:true}),
    /Public588 successor requires the genuine complete588 native phase/);
  await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantPublic588Successor:'true'}),{code:'ERR_ASSERTION'});
  if(ASSISTANT_PUBLIC588_SUCCESSOR_BINDING===null)await assert.rejects(runNativeCheckpointSqlComparison({
    includeStatisticsRevision:true,includeNativeIdentity:true,includeCurrentMemoryWarmup:true,
    includeEstablishedNativeCurrentOrigin:true,includeLastMileEnclosure:true,includeAccountStatisticsAssistant:true,
    includeNativeOriginalContinuity:true,includeAssistantLaterH0:true,includeAssistantPublic587Successor:true,
    includeAssistantPublic588Successor:true,
  }),/ASSISTANT_PUBLIC588_SUCCESSOR_UNISSUED/);
  assert.deepEqual(nativePostgresFailureDiagnostic('ASSISTANT_PUBLIC588_SUCCESSOR','ERROR: 40001\n'),
    {phase:'ASSISTANT_PUBLIC588_SUCCESSOR',sqlState:'40001',category:'SQL_CAS_CONFLICT'});
});

test('calendar588 normal native route uses genuine parent factory then current child with whole old oracles',async()=>{
  const source=await fs.readFile('scripts/lib/checkpoint-cas-native-postgres.mjs','utf8');
  const oldAt=source.indexOf("nativePhase='ASSISTANT_PUBLIC587_SUCCESSOR';");
  const newAt=source.indexOf("nativePhase='ASSISTANT_PUBLIC588_SUCCESSOR';");
  assert(oldAt>=0&&newAt>oldAt);
  const oldPhase=source.slice(oldAt,newAt);
  assert(oldPhase.includes('if(includeAssistantPublic588Successor)'));
  assert(oldPhase.includes('withFrozen588CheckpointPostgresSource(async({adapter,factory})=>'));
  assert(oldPhase.includes('adapter.compareAssistantPublic587Successor({psql,runSql,root,sourceDocumentAt:factory.sourceDocumentAt,'));
  assert(oldPhase.includes('atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint}'));
  assert(source.slice(newAt).includes('compareAssistantPublic588Successor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint})'));
  const adapter=await fs.readFile('scripts/lib/assistant-later-h0-postgres.mjs','utf8');
  assert(adapter.includes("sourcePhase:'assistant-public588-successor',migrationCount:58,oidSlots:37,contractBodies:40"));
  assert(adapter.includes("oldPrefix:'assistant-public587-successor-current-',previousRelease:588"));
  assert(adapter.includes("olderFixtures:Object.freeze(['native-original-continuity-current-same','assistant-later-h0-current-same'])"));
  assert(adapter.includes('assertWholeMetadataInverse(original,payload,NEXT)'));
  for(const contract of ["['value',","['field',","['part',","['T',","'same-current-numeric-change'",
    "'wrong-version'","'regression'","'same-H0-'","'earlier-'","'BEFORE_CATALOG'","'PRESERVED'"])
    assert(adapter.includes(contract),contract);
  const frozen=await fs.readFile('scripts/run-frozen586-assistant-later-h0-postgres-source.mjs','utf8');
  for(const pin of ['c8bafe6b5fe7ebed8d46eb24a4ccf778d2382f05cb0737bf7eb2335acf0281b0',
    '3c702f489f632eada501d978502015e9b2f307867c9f3697c1707ddd2f3da4c0',
    '832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2'])assert(frozen.includes(pin),pin);
  assert(frozen.includes('head:FROZEN588_CODE_SOURCE_PROVENANCE.head,tree:FROZEN588_CODE_SOURCE_PROVENANCE.tree'));
  assert(frozen.includes('withSource:withAuthenticated588PredecessorSource,requireOutput:requireAssistantPublic588SuccessorOutput'));
  assert(frozen.includes('assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256)'));
  assert(frozen.includes("fs.writeFile(target,row.raw,{flag:'wx',mode:0o600})"));
  assert(frozen.includes('await fs.readFile(target),raw'));
  const target=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  assert(target.indexOf('requireAssistantPublic588SuccessorRelease();')<target.indexOf('const PART_COUNT ='));
  assert(target.includes('includeAssistantPublic588Successor: assistantPublic588SuccessorNative'));
  const evidence=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
  const main=evidence.slice(evidence.indexOf('async function main() {'));
  assert(main.indexOf('requireAssistantPublic588SuccessorRelease()')<main.indexOf('spawnSync('));
  assert(!main.includes('await decideReuse('));assert(!main.includes('await decideCurrent586Reuse('));
  if(AFTER601_ACTIVE)assert.deepEqual(ACTIVE_COMMANDS,[AFTER601_NATIVE_COMMAND]);
  else if(AFTER599_ACTIVE)assert.equal(ACTIVE_COMMANDS,ASSISTANT_AFTER599_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER598_PHASE)
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_AFTER598_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER597_PHASE)
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_AFTER597_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===SCALAR597_LATER_H0_PHASE)
    assert.equal(ACTIVE_COMMANDS,SCALAR597_LATER_H0_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-installed593-origin591-successor')
    assert.equal(ACTIVE_COMMANDS,INSTALLED593_ORIGINAL591_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor')
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor')
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor')
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS);
  else assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS);
});

test('calendar588 normal source command follows only its source-owned active profile',async()=>{
  const packageData=JSON.parse(await fs.readFile('package.json','utf8'));
  const {ASSISTANT_AFTER601_SOURCE_COMMANDS}=await import('./lib/release-gate-test-plan.mjs');
  assert.equal(packageData.scripts['test:assistant-later-h0-source'],
    AFTER601_ACTIVE?ASSISTANT_AFTER601_SOURCE_COMMANDS.join(' && '):AFTER599_ACTIVE?ASSISTANT_AFTER599_SOURCE_COMMAND:
    ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER598_PHASE?ASSISTANT_AFTER598_SOURCE_COMMAND:
    ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER597_PHASE?ASSISTANT_AFTER597_SOURCE_COMMAND:
    ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===SCALAR597_LATER_H0_PHASE?SCALAR597_LATER_H0_SOURCE_COMMAND:
      'node scripts/build-assistant-later-h0-successor.mjs --active --check');
  const builder=await fs.readFile('scripts/build-assistant-later-h0-successor.mjs','utf8');
  assert(builder.includes("if(args[0]==='--active')"));
  assert(builder.includes("ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'"));
  for(const old of ["args[0]==='--public587-successor'","args[0]==='--public588-successor'"])
    assert(builder.includes(old),old);
  // Execute only the actual normal selector/admission clauses. No profile,
  // tuple, constructor, source import, SQL or provider is replaced or invoked.
  const from=builder.indexOf("  const public590=args[0]==='--public590-successor';"),
    to=builder.indexOf('  if(public590){',from);
  assert(from>=0&&to>from);
  const branch=builder.slice(to,builder.indexOf('  if(public588){',to));
  const admissions=branch.split('\n').filter(line=>line.includes('assert(args.length===0||'));
  assert.equal(admissions.length,1);
  const select=new Function('assert','args',builder.slice(from,to)
    +'\nif(public590){'+admissions[0]+'}\nreturn {public590,public588,public587,args};');
  for(const suffix of [[],['--check'],['--write']]){
    const selected=select(assert,['--public590-successor',...suffix]);
    assert.equal(selected.public590,true);assert.deepEqual(selected.args,suffix);
  }
  for(const flags of [
    ['--public590-successor','--public588-successor','--check'],
    ['--public590-successor','--public587-successor','--check'],
    ['--public590-successor','--public590-successor','--check'],
    ['--public590-successor','--unknown']
  ])assert.throws(()=>select(assert,flags),{code:'ERR_ASSERTION'});
  for(const [flag,key]of [['--public588-successor','public588'],['--public587-successor','public587']]){
    const selected=select(assert,[flag,'--check']);
    assert.equal(selected.public590,false);assert.equal(selected[key],true);
    assert.deepEqual(selected.args,['--check'],'Both old selector branches remain unchanged');
  }
});

import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import {createHash as cryptoHash} from 'node:crypto';
// TEST DATA ONLY: exact593 capacity source -> unchanged whole592 import oracle.
const reviewedConditions593ImportViews=Object.freeze({
  "scripts/lib/established-native-current-origin.mjs": {
    "path": "scripts/lib/established-native-current-origin.mjs",
    "before": {
      "bytes": 85971,
      "sha256": "2aa92e6a2fb14f93e6072160499be1f39a502f4078bf61c98f649adfe538cf01"
    },
    "after": {
      "bytes": 86377,
      "sha256": "e802e02df74a53bb543d7d0e9107efd3850890a9f2c15e5d7c0c01b5229671cb"
    },
    "hunks": [
      [
        "import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';\nimport { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';\nimport { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';\nimport { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';\nimport { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';\n",
        "import { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';\nimport { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';\nimport { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';\nimport { PRIVATE_CONDITIONS_MAX_BYTES } from './bounded-json-writer.mjs';\nimport { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';\nimport { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';\n"
      ],
      [
        "  const before = await readPointer(request), descriptor = before.pointer.current;\n  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');\n  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), MAX_CONDITIONS);\n  // Unknown/legacy input retains its OLD normal transitions; a claimed clean\n  // origin cannot silently downgrade to that route after a failed check.\n  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {\n",
        "  const before = await readPointer(request), descriptor = before.pointer.current;\n  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');\n  const conditionsMaximum = !seed && (descriptor.modelBinding.modelBundleSha256 === currentSource.integrated\n    || descriptor.modelBinding.modelBundleSha256 === 'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n    ? PRIVATE_CONDITIONS_MAX_BYTES : MAX_CONDITIONS;\n  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), conditionsMaximum);\n  // Unknown/legacy input retains its OLD normal transitions; a claimed clean\n  // origin cannot silently downgrade to that route after a failed check.\n  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {\n"
      ],
      [
        "        expected: { modelBinding: descriptor.modelBinding, contractHashes: descriptor.contractHashes,\n          datasetId: descriptor.datasetId, productionReferenceAt: descriptor.productionReferenceAt,\n          generatedAt: descriptor.generatedAt, bundleContentSha256: descriptor.bundleContentSha256 } });\n      const originalBytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'), MAX_CONDITIONS);\n      const file = verified.files.find(row => row.relativePath === 'data/live/conditions.json');\n      need(file && file.bytes === originalBytes.length && file.sha256 === sha(originalBytes), 'B_CONDITIONS_CHANGED');\n      originalConditions = JSON.parse(originalBytes);\n",
        "        expected: { modelBinding: descriptor.modelBinding, contractHashes: descriptor.contractHashes,\n          datasetId: descriptor.datasetId, productionReferenceAt: descriptor.productionReferenceAt,\n          generatedAt: descriptor.generatedAt, bundleContentSha256: descriptor.bundleContentSha256 } });\n      const originalBytes = await ownedBytes(path.join(bundlePath, 'payload/data/live/conditions.json'),\n        seed ? MAX_CONDITIONS : PRIVATE_CONDITIONS_MAX_BYTES);\n      const file = verified.files.find(row => row.relativePath === 'data/live/conditions.json');\n      need(file && file.bytes === originalBytes.length && file.sha256 === sha(originalBytes), 'B_CONDITIONS_CHANGED');\n      originalConditions = JSON.parse(originalBytes);\n"
      ]
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "path": "scripts/lib/authenticated-frozen586-predecessor.mjs",
    "before": {
      "bytes": 20438,
      "sha256": "ba09589cd0f3c48b734d60214ddf2017a7dc3ebba0e14c468da825721b575776"
    },
    "after": {
      "bytes": 20626,
      "sha256": "3f47d6808f563b456d173e63be919e79ec57bff959e8e216aeeeb9096d7b368b"
    },
    "hunks": [
      [
        "import {fileURLToPath,pathToFileURL} from 'node:url';\nimport {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual} from 'node:util';\nimport {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,\n  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n",
        "import {fileURLToPath,pathToFileURL} from 'node:url';\nimport {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual} from 'node:util';\nimport {PRIVATE_CONDITIONS_MAX_BYTES} from './bounded-json-writer.mjs';\nimport {withAuthenticated586PredecessorSource,withAuthenticated587PredecessorSource,\n  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n"
      ],
      [
        "}\nasync function readAuthenticatedPredecessor(){\n  need(arguments.length===0,'ARGUMENTS');\n  // These normal workflow paths select already restored immutable B; they are\n  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.\n  const paths=await fixedPaths();\n",
        "}\nasync function readAuthenticatedPredecessor(){\n  need(arguments.length===0,'ARGUMENTS');\n  const conditionsMaximum=profile===FROZEN591?PRIVATE_CONDITIONS_MAX_BYTES:256*MB;\n  // These normal workflow paths select already restored immutable B; they are\n  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.\n  const paths=await fixedPaths();\n"
      ],
      [
        "      expected:{modelBinding:descriptor.modelBinding,contractHashes:descriptor.contractHashes,datasetId:descriptor.datasetId,\n        productionReferenceAt:descriptor.productionReferenceAt,generatedAt:descriptor.generatedAt,bundleContentSha256:descriptor.bundleContentSha256}});\n    const conditionsPath=path.join(paths.bundlePath,'payload/data/live/conditions.json');\n    const originalBytes=await read(conditionsPath,256*MB);\n    const inventory=verified.files.find(row=>row.relativePath==='data/live/conditions.json');\n    need(inventory&&inventory.bytes===originalBytes.length&&inventory.sha256===sha(originalBytes),'B_CONDITIONS_CHANGED');\n    const conditions=JSON.parse(originalBytes.toString('utf8'));\n",
        "      expected:{modelBinding:descriptor.modelBinding,contractHashes:descriptor.contractHashes,datasetId:descriptor.datasetId,\n        productionReferenceAt:descriptor.productionReferenceAt,generatedAt:descriptor.generatedAt,bundleContentSha256:descriptor.bundleContentSha256}});\n    const conditionsPath=path.join(paths.bundlePath,'payload/data/live/conditions.json');\n    const originalBytes=await read(conditionsPath,conditionsMaximum);\n    const inventory=verified.files.find(row=>row.relativePath==='data/live/conditions.json');\n    need(inventory&&inventory.bytes===originalBytes.length&&inventory.sha256===sha(originalBytes),'B_CONDITIONS_CHANGED');\n    const conditions=JSON.parse(originalBytes.toString('utf8'));\n"
      ],
      [
        "      need(same(await checkpointRequest('?document_key=eq.'+encodeURIComponent(SKey)\n        +'&select=document_key,payload,version&limit=2',{},'read'),SRows),'S_CHANGED');\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,256*MB))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await qualifyProducer(descriptor.sourceHead,frozenRoot),producer),'SOURCE_CHANGED');\n    }catch(error){first=error;hasFirst=true;}\n    try{\n",
        "      need(same(await checkpointRequest('?document_key=eq.'+encodeURIComponent(SKey)\n        +'&select=document_key,payload,version&limit=2',{},'read'),SRows),'S_CHANGED');\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,conditionsMaximum))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await qualifyProducer(descriptor.sourceHead,frozenRoot),producer),'SOURCE_CHANGED');\n    }catch(error){first=error;hasFirst=true;}\n    try{\n"
      ],
      [
        "    // reach the normal pointer/version readers. No JSON/PASS/grant is read.\n    refreshers.set(handle,async()=>{\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,256*MB))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await pointer(),before),'SOURCE_CHANGED');\n      const SKey=protectedS.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;\n      const versionRequest=protectedS.createProtectedRavScoreCheckpointVersionRequester();\n",
        "    // reach the normal pointer/version readers. No JSON/PASS/grant is read.\n    refreshers.set(handle,async()=>{\n      need(same(JSON.parse((await read(centralPath,16*MB)).toString('utf8')),central),'REGISTRY_CHANGED');\n      need(sha(await read(conditionsPath,conditionsMaximum))===inventory.sha256,'B_CONDITIONS_CHANGED');\n      need(same(await pointer(),before),'SOURCE_CHANGED');\n      const SKey=protectedS.PROTECTED_RAVSCORE_CHECKPOINT_DOCUMENT_KEY;\n      const versionRequest=protectedS.createProtectedRavScoreCheckpointVersionRequester();\n"
      ]
    ]
  }
});
function historical592ImportSource(source,file){
  const row=reviewedConditions593ImportViews[file];if(!row)return source;
  const hash=text=>cryptoHash('sha256').update(text).digest('hex');
  source=source.replace(/\r\n?/g,'\n');
  if(hash(source)===row.before.sha256){assert.equal(Buffer.byteLength(source),row.before.bytes);return source;}
  const original=source;assert.equal(Buffer.byteLength(source),row.after.bytes);assert.equal(hash(source),row.after.sha256);
  for(const [old,current]of [...row.hunks].reverse()){assert.equal(source.split(current).length,2);source=source.replace(current,()=>old);}
  assert.equal(Buffer.byteLength(source),row.before.bytes);assert.equal(hash(source),row.before.sha256);
  let roundtrip=source;for(const [old,current]of row.hunks){assert.equal(roundtrip.split(old).length,2);roundtrip=roundtrip.replace(old,()=>current);}
  assert.equal(roundtrip,original,'Whole593-592-593 import DATA roundtrip');return source;
}


test('calendar588 computed source inventories retain exact finite edges and refuse byte mutation',async()=>{
  const inventories={
  "scripts/check-assistant-later-h0-predecessor-source.mjs": [],
  "scripts/lib/authenticated-frozen586-predecessor.mjs": [
    "../check-assistant-later-h0-predecessor-source.mjs"
  ],
  "scripts/lib/established-native-current-origin.mjs": [
    "../protected-private-production-runtime.mjs",
    "../protected-ravscore-continuation-checkpoint.mjs",
    "../private-production-runtime-bundle.mjs",
    "../ravscore-continuation-checkpoint.mjs",
    "../private-production-runtime-workflow.mjs",
    "../../js/core/ravscore-model-contract.js",
    "../rollback-assets/ravscore-model-contract.js",
    "../../js/core/ravscore-model-bundle.generated.js",
    "./ravscore-sampling-context.mjs",
    "./coastal-point-staging-contract.mjs",
    "./ravscore-candidate-g-rollback-runtime.mjs",
    "./private-weather-component-pack.mjs",
    "../check-native-current-reanalysis-predecessor-source.mjs",
    "./ravscore-production-part-pipeline.mjs",
    "./weather-state-epoch-archive.mjs",
    "./authenticated-frozen584-predecessor.mjs",
    "../check-account-statistics-assistant-predecessor-source.mjs",
    "./authenticated-frozen585-predecessor.mjs",
    "../check-native-original-continuity-predecessor-source.mjs",
    "./authenticated-frozen586-predecessor.mjs"
  ],
  "scripts/assistant-later-h0-binding-prewrite.mjs": [
    "./lib/assistant-later-h0-successor-source.mjs",
    "./check-assistant-later-h0-predecessor-source.mjs",
    "./lib/authenticated-frozen586-predecessor.mjs",
    "./migrate-post-cutover-private-runtime.mjs",
    "./integrated-cutover-readiness.mjs",
    "./lib/dmi-forecast-file.mjs",
    "./lib/dmi-part-continuity.mjs",
    "./lib/protected-dmi-native-current-proofs.mjs",
    "./lib/ravscore-recovery-source-priority.mjs",
    "./lib/coherent-original-source-views.mjs",
    "../js/core/ravscore-model-contract.js",
    "./rollback-assets/ravscore-model-contract.js",
    "./private-production-runtime-workflow.mjs",
    "./lib/private-weather-component-pack.mjs"
  ]
};
  const assertArchivedByteOracle=async read=>{
    for(const [file,expected]of Object.entries(inventories)){
      const actual=await historical593ImportReviewSource(file),source=historical592ImportSource(actual,file);
      assert.deepEqual([...read(source,file)],expected,file);
      const actualExpected=Object.hasOwn(reviewedConditions593ImportViews,file)?[...expected,'./bounded-json-writer.mjs']:expected;
      assert.deepEqual([...read(actual,file)],actualExpected,file);
      for(const changed of [actual+'\n',actual+"\nimport './unreviewed-source.mjs';\n"])
        assert.throws(()=>read(changed,file),/Whole reviewed model import source changed/,file);
      assert.throws(()=>read(source+'\n// unknown changed input\n',file),/Whole reviewed model import source changed/,file);
    }
  };
  if(AFTER601_ACTIVE){
    const path=await import('node:path'),{pathToFileURL}=await import('node:url');
    await withInstalled593CodePredecessorSource(async root=>{
      const archived=await import(pathToFileURL(path.join(root,'scripts/lib/model-source-imports.mjs')).href);
      await assertArchivedByteOracle(archived.modelSourceRelativeModuleSpecifiers);
    });
    // The active capsule verifies the dependency closure. Its model manifests
    // still seal raw source bytes independently of this import scanner.
    for(const [file,expected]of Object.entries(inventories)){
      const actual=await fs.readFile(file,'utf8');
      const edges=[...expected];
      if(Object.hasOwn(reviewedConditions593ImportViews,file))edges.push('./bounded-json-writer.mjs');
      if(file==='scripts/lib/established-native-current-origin.mjs')
        edges.push('./assistant-public591-runtime-contracts.mjs','../check-assistant-later-h0-predecessor-source.mjs');
      const scan=source=>[...modelSourceRelativeModuleSpecifiers(source,file)].sort();
      assert.deepEqual(scan(actual),edges.sort(),file);
      assert.deepEqual(scan(actual+'\n'),edges,file);
      assert.throws(()=>scan(actual+"\nimport './unreviewed-source.mjs';\n"),/Undeclared capsule module dependency/,file);
      assert.throws(()=>scan(actual+"\nimport('./' + 'unreviewed-source.mjs');\n"),/non-literal or unparsed dynamic import/,file);
    }
  }else{
    await assertArchivedByteOracle(modelSourceRelativeModuleSpecifiers);
  }
  const scanner=await fs.readFile('scripts/lib/model-source-imports.mjs','utf8');
  for(const historical of ['36719b093953b7381acd88e9a69b81bbf4532066a044af3ecfa5039a44625e0a',
    'c9a22ee662475bc26ea820d46ba4cb17dbd8020195423b8212ea62c6ac16617e',
    '5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69',
    '869d93119cb9ba2968b39259ecd3d6500797f17ec514c7df39b04dbf8328e0e8'])
    assert(scanner.includes(historical),historical);
});


// Additive preparation-only590 family; existing native/receipt oracles above stay whole.
import {ASSISTANT_PUBLIC590_SUCCESSOR_PARENT,ASSISTANT_PUBLIC590_SUCCESSOR_BINDING,
  ASSISTANT_PUBLIC590_SUCCESSOR_OUTPUT,ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE,
  INACTIVE_ASSISTANT_PUBLIC590_SUCCESSOR,requireAssistantPublic590SuccessorParent,
  requireAssistantPublic590SuccessorOutput} from './lib/assistant-later-h0-successor-source.mjs';
import {prepareAssistantPublic590SuccessorStructure} from './build-assistant-later-h0-successor.mjs';
import {compareAssistantPublic590Successor} from './lib/assistant-later-h0-postgres.mjs';
import {withFrozen590CheckpointPostgresSource} from './run-frozen586-assistant-later-h0-postgres-source.mjs';
import {withAuthenticated590PredecessorSource,FROZEN590_CODE_SOURCE_PROVENANCE}
  from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedFrozen590Predecessor} from './lib/authenticated-frozen586-predecessor.mjs';
import {ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_SCRIPT,
  ASSISTANT_PUBLIC590_SUCCESSOR_PHASE_KIND,verifyAssistantPublic590SuccessorPhaseReceipt}
  from './native-postgres-evidence.mjs';

test('next590 receipt is a separate actual-execution-only phase, never a renamed590/588 proof',()=>{
  assert.deepEqual(ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS,[ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS[0],
    ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS[1]+' --assistant-public590-successor']);
  assert.equal(ASSISTANT_PUBLIC590_SUCCESSOR_SCRIPT,'set -euo pipefail\n'+ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS.join('\n')+'\n');
  assert.notEqual(ASSISTANT_PUBLIC590_SUCCESSOR_PHASE_KIND,ASSISTANT_PUBLIC588_SUCCESSOR_PHASE_KIND);
  const current={run:ORIGIN.run+52,attempt:1,head:newOid,pullRequest:702,branch:'synthetic-unissued-assistant-next'};
  const receipt={phase:'ASSISTANT_PUBLIC590_SUCCESSOR',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS],eligibleForReuse:false};
  assert.equal(verifyAssistantPublic590SuccessorPhaseReceipt(receipt,current).status,'EXECUTED');
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:current.run-1},
    v=>v.eligibleForReuse=true,v=>v.commands=[...ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS],
    v=>v.current={...current,head:oid},v=>v.phase='ASSISTANT_PUBLIC588_SUCCESSOR',v=>v.phase='SOURCE_PRODUCER']){
    const changed=copy(receipt);mutate(changed);
    assert.throws(()=>verifyAssistantPublic590SuccessorPhaseReceipt(changed,current));
  }
  assert.throws(()=>verifyAssistantPublic588SuccessorPhaseReceipt(receipt,current));
  assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(receipt,current));
  assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(receipt,current));
  assert.throws(()=>verifyCurrent586PhaseReceipt(receipt,current));
});

test('next590 family cannot manufacture a parent, tuple or output',()=>{
  assert.equal(INACTIVE_ASSISTANT_PUBLIC590_SUCCESSOR.sourcePhase,'assistant-public590-successor');
  if(!ASSISTANT_PUBLIC590_SUCCESSOR_PARENT.selected){
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'assistant-public588-successor');
    for(const value of [ASSISTANT_PUBLIC590_SUCCESSOR_BINDING,ASSISTANT_PUBLIC590_SUCCESSOR_OUTPUT,
      ASSISTANT_PUBLIC590_SUCCESSOR_RELEASE])assert.equal(value,null);
    assert.throws(()=>requireAssistantPublic590SuccessorParent(),/ASSISTANT_PUBLIC590_PARENT_UNSELECTED/);
  }else requireAssistantPublic590SuccessorParent();
  if(!FROZEN590_CODE_SOURCE_PROVENANCE.selected)for(const [key,value]of Object.entries(FROZEN590_CODE_SOURCE_PROVENANCE))
    if(key!=='selected')assert.equal(value,null,key);
});

test('unselected590 stops before operands, source materialization, transport, factory or callbacks',async t=>{
  let io=0,operands=0,callbacks=0;
  const poison=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','mkdtemp','realpath','lstat'])
    t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_NETWORK');});
  try{
    if(ASSISTANT_PUBLIC590_SUCCESSOR_BINDING===null){
      const refusal=/ASSISTANT_PUBLIC590_(?:PARENT_UNSELECTED|SUCCESSOR_UNISSUED)/;
      assert.throws(()=>requireAssistantPublic590SuccessorOutput(),refusal);
      await assert.rejects(prepareAssistantPublic590SuccessorStructure(poison),{code:'ERR_ASSERTION'});
      await assert.rejects(compareAssistantPublic590Successor(poison),refusal);
      await assert.rejects(withFrozen590CheckpointPostgresSource(()=>{callbacks++;}),refusal);
    }else{
      requireAssistantPublic590SuccessorOutput();
      await assert.rejects(prepareAssistantPublic590SuccessorStructure(poison,poison),{code:'ERR_ASSERTION'});
      await assert.rejects(compareAssistantPublic590Successor(poison,poison),{code:'ERR_ASSERTION'});
      await assert.rejects(withFrozen590CheckpointPostgresSource(()=>{callbacks++;},poison),{code:'ERR_ASSERTION'});
    }
    if(!FROZEN590_CODE_SOURCE_PROVENANCE.selected){
      await assert.rejects(withAuthenticated590PredecessorSource(()=>{callbacks++;}),/FROZEN590_CODE_SOURCE_UNSELECTED/);
      await assert.rejects(readAuthenticatedFrozen590Predecessor(),/FROZEN590_CODE_SOURCE_UNSELECTED/);
    }
    assert.equal(io,0);assert.equal(operands,0);assert.equal(callbacks,0);
  }finally{t.mock.restoreAll();}
});

test('next assistant PG phase requires genuine590 and refuses before native program discovery',async()=>{
  await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantPublic590Successor:true}),
    /Authentic590 phase is required/);
  await assert.rejects(runNativeCheckpointSqlComparison({includeAssistantPublic590Successor:'true'}),{code:'ERR_ASSERTION'});
  if(ASSISTANT_PUBLIC590_SUCCESSOR_BINDING===null)await assert.rejects(runNativeCheckpointSqlComparison({
    includeStatisticsRevision:true,includeNativeIdentity:true,includeCurrentMemoryWarmup:true,
    includeEstablishedNativeCurrentOrigin:true,includeLastMileEnclosure:true,includeAccountStatisticsAssistant:true,
    includeNativeOriginalContinuity:true,includeAssistantLaterH0:true,includeAssistantPublic587Successor:true,
    includeAssistantPublic588Successor:true,includeAssistantPublic590Successor:true,
  }),/ASSISTANT_PUBLIC590_(?:PARENT_UNSELECTED|SUCCESSOR_UNISSUED)/);
});

// Current593 qualification is additive; all historical command/receipt oracles above stay exact.
test('genuine593 native evidence selects exact591 successor commands and rejects older or reused receipts',async()=>{
  assert.equal(INACTIVE_ASSISTANT_PUBLIC591_SUCCESSOR.sourcePhase,'assistant-public591-successor');
  assert.equal(INACTIVE_ASSISTANT_PUBLIC591_SUCCESSOR.requireRelease(),'4.0.593');
  assert.equal(ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT,'set -euo pipefail\n'+ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS.join('\n')+'\n');
  assert.deepEqual(ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,[ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS[0],ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS[1]+' --assistant-public591-successor']);
  assert.equal(ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT,'set -euo pipefail\n'+ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS.join('\n')+'\n');
  assert.notEqual(ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,ASSISTANT_PUBLIC590_SUCCESSOR_PHASE_KIND);
  const current={run:ORIGIN.run+593,attempt:1,head:newOid,pullRequest:756,branch:'synthetic-actual593-source'};
  const receipt={phase:'ASSISTANT_PUBLIC591_SUCCESSOR',status:'EXECUTED',executedInThisRun:true,origin:null,current,commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],eligibleForReuse:false};
  assert.equal(verifyAssistantPublic591SuccessorPhaseReceipt(receipt,current).status,'EXECUTED');
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:current.run-1},v=>v.eligibleForReuse=true,
    v=>v.current={...current,head:oid},v=>v.phase='SOURCE_PRODUCER']){const changed=copy(receipt);mutate(changed);assert.throws(()=>verifyAssistantPublic591SuccessorPhaseReceipt(changed,current));}
  for(const [phase,commands]of [['ASSISTANT_PUBLIC590_SUCCESSOR',ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS],
    ['ASSISTANT_PUBLIC588_SUCCESSOR',ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS],['ASSISTANT_PUBLIC587_SUCCESSOR',ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS],
    ['ASSISTANT_LATER_H0',ASSISTANT_LATER_H0_COMMANDS],['NATIVE_ORIGINAL_CONTINUITY',CURRENT_COMMANDS]]){
    assert.throws(()=>verifyAssistantPublic591SuccessorPhaseReceipt({...receipt,phase,commands:[...commands]},current));
    assert.throws(()=>verifyAssistantPublic591SuccessorPhaseReceipt({...receipt,commands:[...commands]},current));
  }
  for(const verify of [verifyAssistantPublic590SuccessorPhaseReceipt,verifyAssistantPublic588SuccessorPhaseReceipt,
    verifyAssistantPublic587SuccessorPhaseReceipt,verifyAssistantLaterH0PhaseReceipt,verifyCurrent586PhaseReceipt])assert.throws(()=>verify(receipt,current));
  const controller=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
  const main=controller.slice(controller.indexOf('async function main() {'));
  assert(main.indexOf('requireAssistantPublic591SuccessorRelease()')<main.indexOf('spawnSync('));
  assert(main.includes("phase:'ASSISTANT_PUBLIC591_SUCCESSOR',eligibleForReuse:false"));
  assert(!main.includes('await decideReuse('));assert(!main.includes('await decideCurrent586Reuse('));
  for(const [file,row]of Object.entries(reviewedConditions593ImportViews)){
    const raw=await historical593ImportReviewSource(file),old=historical592ImportSource(raw,file);
    assert.equal(historical592ImportSource(old,file),old);
    for(const [previous,current]of row.hunks)for(const changed of [raw.replace(current,()=>previous),raw.replace(current,()=>current+current)])
      assert.throws(()=>historical592ImportSource(changed,file));
    for(const changed of [raw+'\n','!'+raw.slice(1)])assert.throws(()=>historical592ImportSource(changed,file));
  }
});


import {nativePrograms as chooseActualNativePrograms} from './lib/checkpoint-cas-native-postgres.mjs';
import {
  ASSISTANT_PUBLIC591_V2_KIND,ASSISTANT_PUBLIC591_V2_PROFILE,ASSISTANT_PUBLIC591_FROZEN,
  ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,ASSISTANT_PUBLIC591_INPUT_MODULES,
  captureAssistantPublic591Input,verifyAssistantPublic591Input,verifyAssistantPublic591Runtime,
  verifyAssistantPublic591Programs,verifyAssistantPublic591V2PhaseReceipt,verifyAssistantPublic591Metadata,
  verifyAssistantPublic591Artifact,decideAssistantPublic591Reuse,nativeProgramMarkerCollector,
  assistantPublic591PackageScopePaths,assistantPublic591RootPackageScopes,assistantPublic591Reader,
} from './native-postgres-evidence.mjs';
const v2Hash=value=>cryptoHash('sha256').update(value).digest('hex');
const v2Input=()=>({schemaVersion:1,files:140,modules:65,sqlFiles:71,moduleSha256:ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,
  inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),packageMode:{type:'module',version:'4.0.593'},
  packageScopes:assistantPublic591RootPackageScopes(),frozenGitTrees:copy(ASSISTANT_PUBLIC591_FROZEN)});
const v2Runtime=()=>{
  const {pgMajors,...base}=copy(runtime);
  return {...base,selectedPrograms:{schemaVersion:1,majorVersion:16,
    files:['initdb','pg_ctl','psql','postgres'].map(name=>({name,path:'/usr/lib/postgresql/16/bin/'+name,
      realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,bytes:100,sha256:'c'.repeat(64),version:name+' (PostgreSQL) 16.10'}))}};
};
const v2Current=()=>({run:ORIGIN.run+593,attempt:1,head:newOid,pullRequest:756,branch:'synthetic593-v2-current'});
const v2Receipt=(current=v2Current())=>({schemaVersion:2,kind:ASSISTANT_PUBLIC591_V2_KIND,profile:ASSISTANT_PUBLIC591_V2_PROFILE,
  phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
  current,nativeInput:v2Input(),runtime:v2Runtime(),status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:true});

test('593 V2 shares the real ordered PG selector, including configured-directory failure and mismatched quartets',async()=>{
  const attempts=[];
  const posix=file=>file.replaceAll('\\','/');
  const filesystem={readdir:async()=>['15','16','17'],access:async file=>{attempts.push(posix(file));if(posix(file).includes('/16/'))throw new Error('synthetic-unusable');}};
  const run=async(file,args)=>file==='pg_config'?{code:0,stdout:'/usr/lib/postgresql/16/bin\n'}:
    {code:0,stdout:posix(file).split('/').at(-1)+' (PostgreSQL) '+(posix(file).includes('/17/')?'17.6':'15.9')};
  const selected=await chooseActualNativePrograms({platform:'linux',filesystem,run});
  assert.equal(selected.majorVersion,17);assert.equal(posix(selected.psql),'/usr/lib/postgresql/17/bin/psql');
  assert(attempts[0].includes('/16/'));assert(attempts.some(file=>file.includes('/17/')));
  await assert.rejects(chooseActualNativePrograms({platform:'linux',filesystem,run:async(file,args)=>{
    const result=await run(file,args);if(posix(file).endsWith('/17/bin/psql'))result.stdout='psql (PostgreSQL) 18.1';return result;
  }}),/COMPLETE_EXISTING_BINARIES_UNAVAILABLE/);
  const actual=v2Runtime();actual.selectedPrograms.majorVersion=17;
  for(const file of actual.selectedPrograms.files){file.path=file.path.replace('/16/','/17/');file.realpath=file.path;file.version=file.version.replace('16.10','17.6');}
  assert.doesNotThrow(()=>verifyAssistantPublic591Runtime(actual));
  assert.notEqual(actual.pgBindir,actual.selectedPrograms.files[0].path.slice(0,-7));
  for(const mutate of [v=>v.files.pop(),v=>v.files[0].version='initdb (PostgreSQL) 18.1',
    v=>v.files[0].mode=0,v=>v.files[0].sha256='unknown',v=>v.files[0].path='relative/initdb'])
    {const changed=copy(actual.selectedPrograms);mutate(changed);assert.throws(()=>verifyAssistantPublic591Programs(changed));}
  const changed=copy(actual);changed.selectedPrograms.files[0].sha256='d'.repeat(64);
  assert.throws(()=>verifyAssistantPublic591Runtime(changed,actual));
});
test('593 V2 input capture closes65 modules/four JSON/all71 SQL and package scopes while preserving named UI/docs/test deltas',async t=>{
  const check=async sourceRoot=>{
  const {execFileSync}=await import('node:child_process'),cache=new Map(),requests=[];
  const readGit=args=>{const key=JSON.stringify(args);requests.push(args);
    if(!cache.has(key))cache.set(key,execFileSync('git',
      (LATER_THAN_594||ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-installed593-origin591-successor')
        ?args.map(arg=>arg==='HEAD'?FROZEN593_NATIVE_CODE.head:arg.startsWith('HEAD:')?FROZEN593_NATIVE_CODE.head+arg.slice(4):arg):args,
      {encoding:'utf8',maxBuffer:64*1024*1024,env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}}));return cache.get(key);};
  const original=await captureAssistantPublic591Input({root:sourceRoot,readGit});
  assert.equal(original.files,140);assert.equal(original.frozenGitTrees.length,12);
  assert.equal(ASSISTANT_PUBLIC591_INPUT_MODULES.length,65);
  const selected=new Set(requests.filter(args=>args[0]==='cat-file').map(args=>args[2].split(':').slice(1).join(':')));
  for(const file of ['app.js','index.html','js/ui/admin-dashboard.js','js/ui/map-timeline.js',
    'HANDBOOK-RAVRADAR.md','docs/handbook/content.json','docs/rdks/40_KNOWN_ISSUES/KNOWN-ISSUES.md',
    'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql','scripts/test-ravscore-operational-pages-deployment.mjs'])
    assert(!selected.has(file),file);
  const scriptsOnly=await captureAssistantPublic591Input({physical:false,readGit:args=>{
    const value=readGit(args);
    if(args[0]==='cat-file'&&args[2]==='HEAD:package.json'){const p=JSON.parse(value);p.scripts['synthetic-new-source-test']='node synthetic';return JSON.stringify(p);}
    return value;
  }});
  assert.deepEqual(scriptsOnly,original);
  const unrelatedScopes=await captureAssistantPublic591Input({physical:false,readGit:args=>args[0]==='ls-tree'
    ?readGit(args)+'100644 blob '+newOid+'\tdocs/package.json\0'+'100644 blob '+newOid+'\tjs/ui/package.json\0'
    :readGit(args)});
  assert.deepEqual(unrelatedScopes,original,'Unrelated documentation/UI package scopes are outside the finite native directory set');
  assert.equal(assistantPublic591PackageScopePaths().length,6);
  const nested='js/package.json',nestedText=JSON.stringify({type:'commonjs'});
  const nestedInput=await captureAssistantPublic591Input({physical:false,readGit:args=>{
    if(args[0]==='ls-tree')return readGit(args)+'100644 blob '+newOid+'\t'+nested+'\0';
    if(args[0]==='cat-file'&&args[2]==='HEAD:'+nested)return nestedText;
    return readGit(args);
  }});
  assert.equal(nestedInput.inputSha256,original.inputSha256,'The140 original file bytes did not change');
  assert.equal(nestedInput.moduleSha256,original.moduleSha256);
  assert.throws(()=>verifyAssistantPublic591Input(nestedInput,original));
  const {default:path}=await import('node:path'),normalLstat=fs.lstat.bind(fs);
  try{
    t.mock.method(fs,'lstat',async file=>path.resolve(String(file))===path.resolve(sourceRoot,nested)
      ?{isFile:()=>true,isSymbolicLink:()=>false}:normalLstat(file));
    await assert.rejects(captureAssistantPublic591Input({root:sourceRoot,readGit}),/Untracked package scope/);
  }finally{t.mock.restoreAll();}
  const nativeFile='scripts/lib/checkpoint-cas-native-postgres.mjs';
  await assert.rejects(captureAssistantPublic591Input({physical:false,readGit:args=>
    readGit(args)+(args[0]==='cat-file'&&args[2]==='HEAD:'+nativeFile?'\n':'')}),/Native closure changed/);
  const sql=[...selected].find(file=>file.startsWith('supabase/migrations/'));
  const sqlChanged=await captureAssistantPublic591Input({physical:false,readGit:args=>
    readGit(args)+(args[0]==='cat-file'&&args[2]==='HEAD:'+sql?'\n':'')});
  assert.throws(()=>verifyAssistantPublic591Input(sqlChanged,original));
  await assert.rejects(captureAssistantPublic591Input({physical:false,readGit:args=>
    args[0]==='rev-parse'&&args[1]===ASSISTANT_PUBLIC591_FROZEN.at(-1).head+'^{tree}'?'d'.repeat(40):readGit(args)}));
  };
  if((LATER_THAN_594||ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-installed593-origin591-successor'))
    await withInstalled593CodePredecessorSource(check);
  else await check(process.cwd());
});

test('593 V2 receipts and bounded marker preserve V1 refusal and reject identity/status/input/runtime drift',()=>{
  const receipt=v2Receipt(),current=receipt.current;
  assert.equal(verifyAssistantPublic591V2PhaseReceipt(receipt,current).status,'EXECUTED');
  assert.throws(()=>verifyAssistantPublic591SuccessorPhaseReceipt(receipt,current));
  for(const mutate of [v=>v.schemaVersion=1,v=>v.kind=ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
    v=>v.profile='old588',v=>v.eligibleForReuse=false,v=>v.executedInThisRun=false,v=>v.origin={run:1},
    v=>v.commands.reverse(),v=>v.nativeInput.files=139,v=>v.nativeInput.frozenGitTrees.pop(),
    v=>v.runtime.imageVersion='unknown',v=>v.runtime.overrides=['NODE_OPTIONS'],v=>v.runtime.selectedPrograms.files.pop()]){
    const changed=copy(receipt);mutate(changed);assert.throws(()=>verifyAssistantPublic591V2PhaseReceipt(changed,current));
  }
  const raw=JSON.stringify({kind:'RAVRADAR_NATIVE_PROGRAM_IDENTITY_V2',phase:receipt.phase,programs:receipt.runtime.selectedPrograms})+'\n';
  const collector=nativeProgramMarkerCollector();collector.write('ordinary SQL fixture output '+ 'x'.repeat(20000)+'\n');
  for(let i=0;i<raw.length;i+=7)collector.write(raw.slice(i,i+7));
  assert.deepEqual(collector.finish(),receipt.runtime.selectedPrograms);
  for(const lines of ['',raw+raw,raw.slice(0,-1),raw.replace('"programs":','"programs":null,"ignored":'),raw.slice(0,-2)+' '.repeat(9000)+'}\n']){
    const invalid=nativeProgramMarkerCollector();invalid.write(lines);assert.throws(()=>invalid.finish());
  }
});

function v2LiveFixture({laterFailure=false,locator=false,emptyOriginProjection=false,installed594V2=false}={}){
  const receiptFor=installed594V2?installed594V2Receipt:v2Receipt,inputFor=installed594V2?installed594V2Input:v2Input;
  const current=v2Current(),originId=ORIGIN.run+500,locatorId=ORIGIN.run+550;
  const originalCurrent={run:originId,attempt:1,head:oid,pullRequest:750,branch:'synthetic-other-branch'};
  const origin={...copy(run),id:originId,head_sha:oid,head_branch:originalCurrent.branch,
    head_repository:{full_name:ORIGIN.repository},pull_requests:emptyOriginProjection?[]:[{number:750}],created_at:'2026-10-30T10:00:00Z'};
  const active={...copy(origin),id:current.run,head_sha:current.head,head_branch:current.branch,
    pull_requests:[{number:current.pullRequest}],created_at:'2026-10-30T12:00:00Z',status:'in_progress',conclusion:null};
  const mid={...copy(origin),id:locatorId,head_sha:'d'.repeat(40),head_branch:'synthetic-locator',
    pull_requests:[{number:751}],created_at:'2026-10-30T11:00:00Z'};
  const makeJobs=r=>({total_count:1,jobs:[{id:r.id+1000,name:JOB,run_id:r.id,run_attempt:1,head_sha:r.head_sha,
    status:'completed',conclusion:'failure',steps:Array.from({length:17},(_,i)=>({number:i+1,
      name:i===14?'Validate source contracts and release governance':i===15?STEP:i===16?CURRENT586_PHASE_UPLOAD:'setup'+i,
      status:'completed',conclusion:'success',started_at:'2026-10-30T10:00:00Z',
      completed_at:i<15?'2026-10-30T10:00:00Z':'2026-10-30T10:02:00Z'}))}]});
  const originalJobs=makeJobs(origin),midJobs=makeJobs(mid),zip=Buffer.from('bounded synthetic artifact bytes');
  if(laterFailure)midJobs.jobs[0].steps[15].conclusion='failure';
  const proofFor=r=>{
    const native=receiptFor({run:r.id,attempt:1,head:r.head_sha,pullRequest:r.id===originId?750:751,branch:r.head_branch});
    if(r.id===locatorId){native.status='REUSED';native.executedInThisRun=false;native.origin={
      run:originId,attempt:1,job:originalJobs.jobs[0].id,head:oid,artifactId:originId+2000,
      artifactDigest:'sha256:'+v2Hash(zip),sourceTreeSha256:'sha256:'+'e'.repeat(64)};}
    return {schemaVersion:2,kind:native.kind,repository:ORIGIN.repository,headSha:r.head_sha,
      sourceTreeSha256:'sha256:'+'e'.repeat(64),privatePayloadIncluded:false,nativePostgres:native};
  };
  const artifactFor=r=>({id:r.id+2000,name:'native586-phase-'+r.id+'-1-'+r.head_sha,expired:false,size_in_bytes:zip.length,
    digest:'sha256:'+v2Hash(zip),created_at:'2026-10-30T10:01:00Z',workflow_run:{id:r.id,head_sha:r.head_sha}});
  const originPullFor=r=>({number:r.id===originId?750:751,state:'closed',base:{repo:{full_name:ORIGIN.repository},ref:'main'},
    head:{repo:{full_name:ORIGIN.repository},sha:r.head_sha,ref:r.head_branch}});
  const calls=[],fault={};let decoding=origin,originPullReads=0,originRunReads=0;
  const rows=[active,...((locator||laterFailure)?[mid]:[]),origin];
  const get=async(route,options={})=>{
    calls.push(route);
    if(route.endsWith('/pulls/'+current.pullRequest))return {number:current.pullRequest,state:'open',base:{repo:{full_name:ORIGIN.repository},ref:'main'},
      head:{repo:{full_name:ORIGIN.repository},sha:fault.currentHead?'f'.repeat(40):current.head,ref:current.branch}};
    for(const r of [origin,mid])if(route.endsWith('/pulls/'+(r.id===originId?750:751))){
      if(fault.originPullUnavailable)throw new Error('SYNTHETIC_ORIGIN_PR_UNAVAILABLE');
      const pr=originPullFor(r);if(r.id===originId)originPullReads++;
      if(fault.originPullMutation)fault.originPullMutation(pr,originPullReads,r);
      return pr;
    }
    if(route.includes('/workflows/'))return {total_count:rows.length,workflow_runs:copy(rows)};
    if(route.endsWith('/runs/'+active.id))return copy(active);
    for(const r of [origin,mid]){
      if(route.endsWith('/runs/'+r.id)){
        const value={...copy(r),...(fault.attempt?{run_attempt:2}:{})};
        if(r.id===originId&&++originRunReads===2&&fault.originFinalMutation)fault.originFinalMutation(value);
        return value;
      }
      if(route.includes('/runs/'+r.id+'/attempts/1/jobs')){
        const value=copy(r.id===originId?originalJobs:midJobs);
        if(fault.preflight)value.jobs[0].steps[14].conclusion='skipped';
        if(fault.number)value.jobs[0].steps[15].number=15;
        return value;
      }
      if(route.endsWith('/runs/'+r.id+'/artifacts?per_page=100')){
        const artifact=artifactFor(r);if(fault.artifactMutation)fault.artifactMutation(artifact);
        return {total_count:1,artifacts:[artifact]};
      }
      if(route.endsWith('/artifacts/'+(r.id+2000)+'/zip')){decoding=r;return zip;}
      if(route.endsWith('/artifacts/'+(r.id+2000)))return {...artifactFor(r),...(fault.expired?{expired:true}:{})};
    }
    throw new Error('UNEXPECTED_SYNTHETIC_ROUTE');
  };
  const options={local:receiptFor(current),get,getRuntime:async()=>v2Runtime(),getInput:async()=>inputFor(),
    readGit:args=>args[0]==='rev-parse'?current.head:'identical reviewed proof/setup control',
    decode:()=>Buffer.from(JSON.stringify(proofFor(decoding)))};
  return {options,calls,fault,origin,originalJobs,zip,proofFor,artifactFor,originPullFor};
}

test('593 V2 live reader verifies cross-branch actual origin/upload, preserves direct origin and rejects unknown or later negative evidence',async()=>{
  const first=v2LiveFixture(),decision=await decideAssistantPublic591Reuse(first.options);
  assert.equal(decision.status,'REUSED');assert.equal(decision.executedInThisRun,false);
  assert.equal(decision.origin.run,first.origin.id);assert(first.calls.length>=12);
  const located=v2LiveFixture({locator:true}),locatedDecision=await decideAssistantPublic591Reuse(located.options);
  assert.equal(locatedDecision.status,'REUSED');assert.equal(locatedDecision.origin.run,located.origin.id);
  for(const fault of ['currentHead','attempt','preflight','number','expired']){
    const fixture=v2LiveFixture();fixture.fault[fault]=true;
    assert.equal((await decideAssistantPublic591Reuse(fixture.options)).status,'EXECUTE',fault);
  }
  assert.equal((await decideAssistantPublic591Reuse(v2LiveFixture({laterFailure:true}).options)).status,'EXECUTE');
  const unavailable=v2LiveFixture();unavailable.options.get=async()=>{throw new Error('synthetic unavailable');};
  assert.equal((await decideAssistantPublic591Reuse(unavailable.options)).status,'EXECUTE');
  const drift=v2LiveFixture();drift.options.getRuntime=async()=>({...v2Runtime(),imageVersion:'20261030.1'});
  assert.equal((await decideAssistantPublic591Reuse(drift.options)).status,'EXECUTE');
});

test('native phase metadata permits only the reviewed early DMI setup step',()=>{
  const fixture=v2LiveFixture();
  const expected=verifyAssistantPublic591Metadata(fixture.origin,fixture.originalJobs);
  const shifted=copy(fixture.originalJobs),steps=shifted.jobs[0].steps;
  const added={...steps[5],name:'Install declared DMI dependencies before source planning'};
  for(const step of steps.slice(5))step.number++;
  steps[5].name='Build deterministic source-tree content identity';
  steps.splice(5,0,added);
  assert.deepEqual(verifyAssistantPublic591Metadata(fixture.origin,shifted),expected);
  for(const changed of [
    {name:'Unknown extra setup'}, {conclusion:'skipped'}, {number:7},
  ]){
    const invalid=copy(shifted);
    Object.assign(invalid.jobs[0].steps[5],changed);
    assert.throws(()=>verifyAssistantPublic591Metadata(fixture.origin,invalid));
  }
});

test('native FULL metadata verifies the actual and historical owned-cache environment layouts',async()=>{
  const fixture=v2LiveFixture(),requests=[];
  const expected=verifyAssistantPublic591Metadata(fixture.origin,fixture.originalJobs,()=>{
    throw new Error('Old metadata must not need a new workflow read');
  });
  const workflow=await fs.readFile(new URL('../'+WORKFLOW,import.meta.url),'utf8');
  const predecessor=inverseOwnedCacheNativeWorkflow(workflow);assert.notEqual(predecessor,workflow);
  const shifted=copy(fixture.originalJobs),steps=shifted.jobs[0].steps;
  const dmi={...steps[5],name:'Install declared DMI dependencies before source planning'};
  for(const step of steps.slice(5))step.number++;
  steps[5].name='Build deterministic source-tree content identity';steps.splice(5,0,dmi);
  const environment=OWNED_CACHE_NATIVE_EARLY_STEP_NAMES.map((name,index)=>({...steps[3],name,number:4+index}));
  for(const step of steps.slice(3))step.number+=2;
  steps.splice(3,0,...environment);
  const readWorkflow=(args,value=workflow)=>{
    requests.push(args);assert.deepEqual(args,['cat-file','blob',fixture.origin.head_sha+':'+WORKFLOW]);
    return Buffer.from(value);
  };
  assert.deepEqual(verifyAssistantPublic591Metadata(fixture.origin,shifted,readWorkflow),{...expected,historicalNationalOmitted:true});
  assert.equal(requests.length,1);
  const historical=readHistoricalSourceSetupWorkflow();
  assert.deepEqual(verifyAssistantPublic591Metadata(fixture.origin,shifted,args=>readWorkflow(args,historical)),expected);
  for(const value of [predecessor,predecessor.replace(/\n/g,'\r\n'),historical+'\n',
    workflow.replace('          node-version: 24','          node-version: 22'),
    workflow.replace('  contents: read','  contents: write')])
    assert.throws(()=>verifyAssistantPublic591Metadata(fixture.origin,shifted,args=>readWorkflow(args,value)));
  assert.throws(()=>verifyAssistantPublic591Metadata(fixture.origin,shifted,()=>null));
  for(const mutate of [
    rows=>rows.splice(3,1),rows=>rows.splice(4,0,copy(rows[3])),
    rows=>[rows[3],rows[4]]=[rows[4],rows[3]],
    rows=>rows[3].name='Unknown environment step',rows=>rows[4].number++,
    rows=>rows[3].conclusion='skipped',rows=>rows[4].conclusion='failure',
    rows=>rows.find(row=>row.name==='Install declared DMI dependencies before source planning').name='Unknown DMI setup',
    rows=>rows.find(row=>row.name===STEP).conclusion='skipped',
  ]){
    const invalid=copy(shifted);mutate(invalid.jobs[0].steps);
    assert.throws(()=>verifyAssistantPublic591Metadata(fixture.origin,invalid,readWorkflow));
  }
  // Both the initial normal origin read and final reread use this same Git seam.
  fixture.originalJobs.jobs[0].steps=copy(steps);
  const normalReadGit=fixture.options.readGit;let workflowReads=0;
  fixture.options.readGit=args=>{
    if(args[0]==='cat-file'&&args[2].endsWith(':'+WORKFLOW)){
      assert([fixture.origin.head_sha,'HEAD'].some(ref=>args[2]===ref+':'+WORKFLOW));
      if(args[2]===fixture.origin.head_sha+':'+WORKFLOW)workflowReads++;
      return workflow;
    }
    return normalReadGit(args);
  };
  const decision=await decideAssistantPublic591Reuse(fixture.options);
  assert.equal(decision.status,'REUSED');assert.equal(decision.origin.run,fixture.origin.id);
  assert(workflowReads>=2);assert.equal(decision.executedInThisRun,false);
});

test('593 V2 artifact is independent phase evidence, never a V1 upgrade or whole-source success',()=>{
  const fixture=v2LiveFixture(),phase=verifyAssistantPublic591Metadata(fixture.origin,fixture.originalJobs);
  const metadata=fixture.artifactFor(fixture.origin),proof=fixture.proofFor(fixture.origin),raw=Buffer.from(JSON.stringify(proof));
  assert.equal(fixture.origin.conclusion,'failure');
  const originPull=fixture.originPullFor(fixture.origin);
  assert.equal(verifyAssistantPublic591Artifact(metadata,fixture.zip,raw,fixture.origin,phase,originPull).nativePostgres.status,'EXECUTED');
  for(const mutate of [v=>v.schemaVersion=1,v=>v.kind=ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
    v=>v.nativePostgres.eligibleForReuse=false,v=>v.nativePostgres.status='REUSED',v=>v.headSha=newOid,
    v=>v.privatePayloadIncluded=true]){
    const changed=copy(proof);mutate(changed);assert.throws(()=>verifyAssistantPublic591Artifact(metadata,fixture.zip,Buffer.from(JSON.stringify(changed)),fixture.origin,phase,originPull));
  }
  for(const changed of [{...metadata,expired:true},{...metadata,digest:'sha256:'+'f'.repeat(64)},
    {...metadata,name:'native588-phase'},{...metadata,size_in_bytes:65537}])
    assert.throws(()=>verifyAssistantPublic591Artifact(changed,fixture.zip,raw,fixture.origin,phase,originPull));
});

test('593 V2 merged origin requires independent artifact-bound PR identity before reuse and at final freshness',async()=>{
  const merged=v2LiveFixture({emptyOriginProjection:true}),before=copy(merged.origin);
  assert.equal((await decideAssistantPublic591Reuse(merged.options)).status,'REUSED');
  assert.equal(merged.calls.filter(route=>route.endsWith('/pulls/750')).length,2);
  assert.deepEqual(merged.origin,before,'No fabricated run PR projection');
  const located=v2LiveFixture({emptyOriginProjection:true,locator:true});
  assert.equal((await decideAssistantPublic591Reuse(located.options)).status,'REUSED');
  assert.equal(located.calls.filter(route=>route.endsWith('/pulls/750')).length,2);
  assert.equal(located.calls.filter(route=>route.endsWith('/pulls/751')).length,1);
  const physical=v2LiveFixture({emptyOriginProjection:true,locator:true}),synthetic=physical.options.get;
  let physicalCalls=0,signedCalls=0;
  physical.options.get=assistantPublic591Reader({env:{GITHUB_TOKEN:'synthetic-token'},fetchImpl:async(url,options)=>{
    physicalCalls++;
    if(url==='https://synthetic-artifact.invalid/body'){
      signedCalls++;assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');return new Response(physical.zip);
    }
    const route=new URL(url).pathname+new URL(url).search;
    if(route.endsWith('/zip')){
      await synthetic(route,{zip:true});
      return new Response(null,{status:302,headers:{Location:'https://synthetic-artifact.invalid/body'}});
    }
    return new Response(JSON.stringify(await synthetic(route)));
  }});
  assert.equal((await decideAssistantPublic591Reuse(physical.options)).status,'REUSED');
  assert.equal(physicalCalls,24);assert.equal(signedCalls,2);
  for(const projection of [[{number:749}],[{number:750},{number:750}],null,{}]){
    const invalid=v2LiveFixture({emptyOriginProjection:true});invalid.origin.pull_requests=projection;
    assert.equal((await decideAssistantPublic591Reuse(invalid.options)).status,'EXECUTE');
  }
  const mutations=[pr=>pr.number=749,pr=>pr.state='unknown',pr=>pr.base.ref='other',
    pr=>pr.base.repo.full_name='other/repository',pr=>pr.head.repo.full_name='other/repository',
    pr=>pr.head.sha=newOid,pr=>pr.head.ref='other-branch'];
  for(const mutate of mutations){
    for(const finalOnly of [false,true]){
      const invalid=v2LiveFixture({emptyOriginProjection:true});
      invalid.fault.originPullMutation=(pr,count)=>{if(!finalOnly||count===2)mutate(pr);};
      assert.equal((await decideAssistantPublic591Reuse(invalid.options)).status,'EXECUTE');
    }
  }
  const unavailable=v2LiveFixture({emptyOriginProjection:true});unavailable.fault.originPullUnavailable=true;
  assert.equal((await decideAssistantPublic591Reuse(unavailable.options)).status,'EXECUTE');
  for(const mutate of [r=>r.pull_requests=[{number:749}],r=>r.head_sha=newOid,
    r=>r.head_branch='other-branch',r=>r.run_attempt=2]){
    const invalid=v2LiveFixture({emptyOriginProjection:true});invalid.fault.originFinalMutation=mutate;
    assert.equal((await decideAssistantPublic591Reuse(invalid.options)).status,'EXECUTE');
  }
  const fixture=v2LiveFixture({emptyOriginProjection:true}),phase=verifyAssistantPublic591Metadata(fixture.origin,fixture.originalJobs);
  const raw=Buffer.from(JSON.stringify(fixture.proofFor(fixture.origin)));
  assert.throws(()=>verifyAssistantPublic591Artifact(fixture.artifactFor(fixture.origin),fixture.zip,raw,fixture.origin,phase));
});

test('593 quartet observation remains conditional and follows proved cleanup without changing older profile reports',async()=>{
  // Keep this whole593 oracle on its genuine pinned source. Current597 has its
  // own additive observation guard, checked below without changing this oracle.
  const source=await withInstalled593CodePredecessorSource(root=>
    fs.readFile(root+'/scripts/lib/checkpoint-cas-native-postgres.mjs','utf8'));
  assert(source.includes('const nativeProgramsBefore=includeAssistantPublic591Successor?await nativePostgresProgramIdentity(programs):null;'));
  const guard=source.indexOf('if(completedReport&&includeAssistantPublic591Successor){');
  const cleanup=source.indexOf('if (cleanupAllowed && (!started || stopped)) await fs.rm(');
  const property=source.indexOf('completedReport.nativeProgramIdentity=after;',guard);
  const end=source.indexOf('} catch (cleanupError)',guard);
  assert(cleanup>=0&&guard>cleanup&&property>guard&&end>property);
  assert.equal((source.match(/await nativePostgresProgramIdentity\(programs\)/g)??[]).length,2);
});


test('597 quartet observation is conditional and follows proved stop and cleanup before the completed report',async()=>{
  const source=await fs.readFile('scripts/lib/checkpoint-cas-native-postgres.mjs','utf8');
  const selection=/^  const nativeProgramsBefore=([^\n]+)\n    \?await nativePostgresProgramIdentity\(programs\):null;/m.exec(source);
  assert(selection?.[1].split('||').includes('includeScalar597LaterH0Successor'));
  const before=selection.index;
  const setup=source.indexOf("const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-checkpoint-pg-'))",before);
  const stop=source.indexOf("assert.equal(stop.code,0,'native server stop was not proved; preserve directory');",setup);
  const terminal=source.indexOf("assert.equal(status.code,3,'native server is not physically terminal; preserve directory');",stop);
  const stopped=source.indexOf('stopped=true;',terminal),allowed=source.indexOf('cleanupAllowed=true;',stopped);
  const cleanup=source.indexOf('if (cleanupAllowed && (!started || stopped)) await fs.rm(',allowed);
  const guard=source.indexOf('if(completedReport&&nativeProgramsBefore){',cleanup);
  const after=source.indexOf('const after=await nativePostgresProgramIdentity(programs);',guard);
  const exact=source.indexOf("assert.deepEqual(after,nativeProgramsBefore,'Selected native PostgreSQL programs changed during execution');",after);
  const property=source.indexOf('completedReport.nativeProgramIdentity=after;',exact);
  const end=source.indexOf('} catch (cleanupError)',property);
  assert(before>=0&&setup>before&&stop>setup&&terminal>stop&&stopped>terminal&&allowed>stopped
    &&cleanup>allowed&&guard>cleanup&&after>guard&&exact>after&&property>exact&&end>property);
  assert.equal((source.match(/await nativePostgresProgramIdentity\(programs\)/g)??[]).length,2);
  const caller=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  assert(caller.includes('includeScalar597LaterH0Successor:scalar597LaterH0Native'));
  assert(caller.indexOf("kind:'RAVRADAR_NATIVE_PROGRAM_IDENTITY_V2'")>caller.indexOf('const report = await runNativeCheckpointSqlComparison('));
});

test('593 V2 rejects invalid artifact metadata before every ZIP call while preserving valid complete download verification',async()=>{
  const valid=v2LiveFixture();assert.equal((await decideAssistantPublic591Reuse(valid.options)).status,'REUSED');
  assert.equal(valid.calls.filter(route=>route.endsWith('/zip')).length,1);
  for(const mutate of [v=>v.expired=true,v=>v.workflow_run.id++,v=>v.workflow_run.head_sha=newOid,
    v=>v.name='native588-phase',v=>v.id=0,v=>v.size_in_bytes=0,v=>v.size_in_bytes=-1,
    v=>v.size_in_bytes=65537,v=>v.size_in_bytes=1.5,v=>v.digest='unknown',
    v=>v.created_at='2026-10-30T09:59:59Z',v=>v.created_at='2026-10-30T10:02:01Z',v=>v.created_at='unknown']){
    const fixture=v2LiveFixture();fixture.fault.artifactMutation=mutate;
    assert.equal((await decideAssistantPublic591Reuse(fixture.options)).status,'EXECUTE');
    assert.equal(fixture.calls.filter(route=>route.endsWith('/zip')).length,0,'Invalid metadata cannot start ZIP transport');
  }
});


import {INSTALLED593_ORIGINAL591_COMMANDS,INSTALLED593_ORIGINAL591_SCRIPT,
  INSTALLED593_ORIGINAL591_PHASE_KIND,verifyInstalled593Original591PhaseReceipt}
  from './native-postgres-evidence.mjs';
import {INACTIVE_ASSISTANT_PUBLIC591_SUCCESSOR,INSTALLED593_ORIGINAL591_DATABASE_BEFORE,
  requireInstalled593Original591Release,requireInstalled593Original591Binding,requireInstalled593Original591Output}
  from './lib/assistant-later-h0-successor-source.mjs';
import {verifyInstalled593Original591Package,verifyInstalled593Original591NativeContext,
  installed593Original591NativeClaims} from './national584-source-evidence.mjs';
import {compareInstalled593Original591Successor} from './lib/assistant-later-h0-postgres.mjs';
import {withFrozen593CheckpointPostgresSource} from './run-frozen586-assistant-later-h0-postgres-source.mjs';
import {FROZEN593_NATIVE_CODE,verifyFrozen593NativeCodeManifest,withInstalled593CodePredecessorSource} from './check-installed593-code-predecessor-source.mjs';
const FROZEN594_NATIVE_EVIDENCE_HEAD='84051e2d700595837ebf80426410dcbef8e08704';
async function historical593ImportReviewSource(file){
  if((LATER_THAN_594||ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-installed593-origin591-successor')
    &&(AFTER601_ACTIVE||Object.hasOwn(reviewedConditions593ImportViews,file))){
    const {execFileSync}=await import('node:child_process');
    return execFileSync('git',['cat-file','blob',FROZEN593_NATIVE_CODE.head+':'+file],{
      encoding:'utf8',maxBuffer:1024*1024,timeout:30000,
      env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'},
    });
  }
  return fs.readFile(file,'utf8');
}
function installed594Receipt(){return {schemaVersion:1,kind:INSTALLED593_ORIGINAL591_PHASE_KIND,phase:'INSTALLED593_ORIGINAL591_SUCCESSOR',
  sourcePhase:'assistant-installed593-origin591-successor',releaseVersion:requireInstalled593Original591Release(),
  binding:requireInstalled593Original591Binding(),output:requireInstalled593Original591Output(),
  databaseBefore:INSTALLED593_ORIGINAL591_DATABASE_BEFORE,current:{run:50000000594,attempt:1,
    head:'a'.repeat(40),pullRequest:999,branch:'codex/synthetic-installed594'},
  commands:[...INSTALLED593_ORIGINAL591_COMMANDS],status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false};}

test('installed593 new594 active native commands and receipt refuse predecessor, reused and changed inputs',()=>{
  if(LATER_THAN_594){
    assert.notDeepEqual(ACTIVE_COMMANDS,INSTALLED593_ORIGINAL591_COMMANDS);
    assert.notEqual(ACTIVE_NATIVE_SCRIPT,INSTALLED593_ORIGINAL591_SCRIPT);
  }else{
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'assistant-installed593-origin591-successor');
    assert.equal(ACTIVE_COMMANDS,INSTALLED593_ORIGINAL591_COMMANDS);
    assert.equal(ACTIVE_NATIVE_SCRIPT,INSTALLED593_ORIGINAL591_SCRIPT);
  }
  assert.deepEqual(INSTALLED593_ORIGINAL591_COMMANDS,[ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS[0],
    ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS[1]+' --assistant-installed593-origin591-successor']);
  assert.equal(INSTALLED593_ORIGINAL591_SCRIPT,'set -euo pipefail\n'+INSTALLED593_ORIGINAL591_COMMANDS.join('\n')+'\n');
  assert.notEqual(INSTALLED593_ORIGINAL591_PHASE_KIND,ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND);
  const receipt=installed594Receipt(),current=receipt.current;
  assert.equal(verifyInstalled593Original591PhaseReceipt(receipt,current).status,'EXECUTED');
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:1},v=>v.eligibleForReuse=true,
    v=>v.phase='ASSISTANT_PUBLIC591_SUCCESSOR',v=>v.schemaVersion=2,v=>v.kind=ASSISTANT_PUBLIC591_V2_KIND,v=>v.sourcePhase='assistant-public591-successor',
    v=>v.releaseVersion='4.0.593',v=>v.commands=[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],v=>v.current={...current,head:'b'.repeat(40)},
    v=>v.binding={...v.databaseBefore},v=>v.binding.I='f'.repeat(64),v=>v.output.migrationSha256='f'.repeat(64),
    v=>v.databaseBefore.version='20261029183010']){
    const changed=copy(receipt);mutate(changed);assert.throws(()=>verifyInstalled593Original591PhaseReceipt(changed,current));
  }
  assert.throws(()=>verifyAssistantPublic591SuccessorPhaseReceipt(receipt,current));
  assert.throws(()=>verifyAssistantPublic591V2PhaseReceipt(receipt,current));
});

test('installed593 new594 normal national caller preserves package and executed-only native claims',async()=>{
  const activePackage=JSON.parse(await fs.readFile('package.json','utf8')),receipt=installed594Receipt();
  const beforeAfter597=AFTER601_ACTIVE?await readAuthenticatedAfter598PackageForHistoricalOracles()
    :AFTER599_ACTIVE?await inverseReviewedAfter599PackageForHistoricalOracles(activePackage)
    :ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER598_PHASE
      ?inverseAssistantAfter598Package(activePackage):activePackage;
  const scalarPackage=HISTORICAL598_INPUT_REQUIRED||ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase===ASSISTANT_AFTER597_PHASE
    ?inverseAssistantAfter597Package(beforeAfter597):beforeAfter597;
  const pkg=LATER_THAN_594
    ?inverseScalar597LaterH0Package(scalarPackage):scalarPackage;
  verifyInstalled593Original591Package(pkg);
  verifyInstalled593Original591NativeContext(receipt,receipt.current,pkg.version);
  const claims=installed593Original591NativeClaims(receipt,receipt.current);
  assert.equal(claims.current593PredecessorNative.scope,'GENUINE_FROZEN593');
  for(const claim of Object.values(claims))assert.deepEqual([claim.status,claim.executedInThisRun,claim.origin,claim.eligibleForReuse],['EXECUTED',true,null,false]);
  for(const mutate of [v=>v.version='4.0.593',v=>v.scripts['test:assistant-later-h0-source']+=' --write',
    v=>v.scripts['test:ravscore-source-critical']+=' && node unrelated.mjs']){
    const changed=copy(pkg);mutate(changed);assert.throws(()=>verifyInstalled593Original591Package(changed));
  }
});

test('installed593 new594 normal PG caller validates real canonical inputs before its first synthetic SQL boundary',async t=>{
  const failure=Object.freeze({synthetic:'first-native-sql-boundary'});let calls=0;
  t.mock.method(console,'error',()=>{});
  await assert.rejects(compareInstalled593Original591Successor({
    psql:async query=>{calls++;assert.equal(query,'select max(version) from supabase_migrations.schema_migrations;');throw failure;},
    runSql:async()=>{throw Error('No SQL execution');},root:'synthetic',sourceDocumentAt(){},atHour(){},saveCheckpoint(){},
  }),error=>error===failure);
  assert.equal(calls,1);
  await assert.rejects(runNativeCheckpointSqlComparison({includeInstalled593Original591Successor:true}),
    /requires the genuine complete593 native phase/);
  await assert.rejects(runNativeCheckpointSqlComparison({includeInstalled593Original591Successor:'true'}),{code:'ERR_ASSERTION'});
});

test('installed593 fixed genuine593 native code manifest rejects changed bytes and host imports its own factory',async()=>{
  const raw=await fs.readFile('scripts/fixtures/installed593-code-predecessor.json');
  const manifest=verifyFrozen593NativeCodeManifest(raw);assert.equal(manifest.files.length,186);
  assert.deepEqual(manifest.files.find(row=>row.file==='scripts/lib/account-statistics-assistant-package-review.json'),{"file":"scripts/lib/account-statistics-assistant-package-review.json","bytes":5739,"sha256":"8d068a938290911427dbef05fc75a0700829b48c7f8dee069440ce013bc2c490"});
  for(const changed of [Buffer.concat([raw,Buffer.from('\n')]),Buffer.from(raw).fill(0,0,1)])
    assert.throws(()=>verifyFrozen593NativeCodeManifest(changed));
  const result=await withFrozen593CheckpointPostgresSource(async({adapter,factory})=>{
    assert.equal(typeof adapter.compareAssistantPublic591Successor,'function');
    assert.equal(factory.sourceHead,manifest.head);assert.equal(factory.sourceTree,manifest.tree);
    assert.equal(factory.ravScoreModelBinding().modelBundleSha256,INSTALLED593_ORIGINAL591_DATABASE_BEFORE.I);
    const stop=Object.freeze({synthetic:'genuine593-first-native-sql'});let sqlCalls=0;
    const originalError=console.error;console.error=()=>{};
    try{await assert.rejects(adapter.compareAssistantPublic591Successor({
      psql:async query=>{sqlCalls++;assert.equal(query,'select max(version) from supabase_migrations.schema_migrations;');throw stop;},
      runSql:async()=>{throw Error('No SQL execution');},root:'synthetic',sourceDocumentAt:factory.sourceDocumentAt,
      atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint,
    }),error=>error===stop);}finally{console.error=originalError;}
    assert.equal(sqlCalls,1);
    return 'synthetic-code-only-callback';
  });
  assert.equal(result,'synthetic-code-only-callback');
});


import {INSTALLED593_ORIGINAL591_V2_KIND,INSTALLED593_ORIGINAL591_V2_PROFILE,
  INSTALLED593_ORIGINAL591_INPUT_MODULES,INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256,
  INSTALLED593_ORIGINAL591_FROZEN,installed593Original591RootPackageScopes,
  captureInstalled593Original591Input,verifyInstalled593Original591Input,
  verifyInstalled593Original591V2PhaseReceipt,verifyInstalled593Original591Artifact,
  decideInstalled593Original591Reuse,completeInstalled593Original591Execution,
  installed593Original591Reader} from './native-postgres-evidence.mjs';
const installed594V2Input=()=>({schemaVersion:1,files:143,modules:66,sqlFiles:72,
  moduleSha256:INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256,inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),
  packageMode:{type:'module',version:'4.0.594'},packageScopes:installed593Original591RootPackageScopes(),
  frozenGitTrees:copy(INSTALLED593_ORIGINAL591_FROZEN)});
function installed594V2Receipt(current=installed594Receipt().current){
  return {...installed594Receipt(),schemaVersion:2,kind:INSTALLED593_ORIGINAL591_V2_KIND,
    profile:INSTALLED593_ORIGINAL591_V2_PROFILE,eligibleForReuse:true,current,
    nativeInput:installed594V2Input(),runtime:v2Runtime()};
}

test('594 V2 normal capture binds66 actual modules/five data/all72 SQL, controls, scopes and genuine593 anchor',async()=>{
  const {execFileSync}=await import('node:child_process'),cache=new Map(),selected=new Set();
  const readGit=args=>{const key=JSON.stringify(args);if(args[0]==='cat-file')selected.add(args[2].split(':').slice(1).join(':'));
    if(!cache.has(key))cache.set(key,execFileSync('git',
      LATER_THAN_594
        ?args.map(arg=>arg==='HEAD'?FROZEN594_NATIVE_EVIDENCE_HEAD:
          arg.startsWith('HEAD:')?FROZEN594_NATIVE_EVIDENCE_HEAD+arg.slice(4):arg):args,
      {encoding:'utf8',maxBuffer:64*1024*1024,timeout:30000,
        env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}}));return cache.get(key);};
  const original=await captureInstalled593Original591Input({physical:false,readGit});
  verifyInstalled593Original591Input(original);assert.equal(INSTALLED593_ORIGINAL591_INPUT_MODULES.length,66);
  assert.equal(original.frozenGitTrees.length,13);assert.deepEqual(original.frozenGitTrees.at(-1),
    {head:FROZEN593_NATIVE_CODE.head,tree:FROZEN593_NATIVE_CODE.tree});
  for(const file of ['scripts/check-installed593-code-predecessor-source.mjs','scripts/fixtures/installed593-code-predecessor.json',
    'scripts/native-postgres-evidence.mjs','scripts/national584-source-evidence.mjs','scripts/source-impact-full-baseline.mjs',
    'scripts/test-native-postgres-evidence.mjs','scripts/test-source-impact-full-baseline.mjs',WORKFLOW,
    'requirements-dmi.txt','requirements-geometry.txt','requirements-copernicus.txt',
    'scripts/lib/source-tree-content.mjs','scripts/lib/weather-source-gate.mjs',
    'scripts/lib/source-impact-workflow-review.mjs','scripts/lib/account-statistics-assistant-package-review.mjs',
    'scripts/lib/account-statistics-assistant-package-review.json','scripts/validate-source-once.mjs',
    'scripts/run-frozen584-source-targets.mjs','scripts/lib/frozen584-normal-source-target-inventory.json'])assert(selected.has(file),file);
  for(const file of ['scripts/check-installed593-code-predecessor-source.mjs','scripts/fixtures/installed593-code-predecessor.json',
    'scripts/national584-source-evidence.mjs','scripts/source-impact-full-baseline.mjs','scripts/lib/source-tree-content.mjs',
    [...selected].find(file=>file.startsWith('supabase/migrations/'))]){
    const changed=()=>captureInstalled593Original591Input({physical:false,readGit:args=>readGit(args)
      +(args[0]==='cat-file'&&args[2]==='HEAD:'+file?'\n':'')});
    if(file.endsWith('predecessor-source.mjs'))await assert.rejects(changed(),/Native closure changed/);
    const awaited=file.endsWith('predecessor-source.mjs')?null:await changed();
    if(awaited)assert.throws(()=>verifyInstalled593Original591Input(awaited,original));
  }
  for(const file of ['js/package.json','scripts/package.json']){
    const nested=await captureInstalled593Original591Input({physical:false,readGit:args=>args[0]==='ls-tree'
      ?readGit(args)+'100644 blob '+newOid+'\t'+file+'\0':args[0]==='cat-file'&&args[2]==='HEAD:'+file
        ?JSON.stringify({type:'commonjs'}):readGit(args)});
    assert.throws(()=>verifyInstalled593Original591Input(nested,original));
  }
  await assert.rejects(captureAssistantPublic591Input({physical:false,readGit}),'593 is not594');
});

test('594 V2 receipt/marker and national caller preserve V1 refusals and composite execution origin',async()=>{
  const receipt=installed594V2Receipt(),current=receipt.current;
  verifyInstalled593Original591V2PhaseReceipt(receipt,current);
  assert.throws(()=>verifyInstalled593Original591PhaseReceipt(receipt,current));
  assert.throws(()=>verifyAssistantPublic591V2PhaseReceipt(receipt,current));
  assert.throws(()=>verifyInstalled593Original591V2PhaseReceipt(installed594Receipt(),current));
  for(const mutate of [v=>v.kind=ASSISTANT_PUBLIC591_V2_KIND,v=>v.profile=ASSISTANT_PUBLIC591_V2_PROFILE,
    v=>v.nativeInput=v2Input(),v=>v.nativeInput.modules=65,v=>v.nativeInput.sqlFiles=71,
    v=>v.binding.I='f'.repeat(64),v=>v.databaseBefore.I='f'.repeat(64),v=>v.output.migrationSha256='f'.repeat(64),
    v=>v.runtime.selectedPrograms.files.pop(),v=>v.origin={run:1},v=>v.executedInThisRun=false]){
    const changed=copy(receipt);mutate(changed);assert.throws(()=>verifyInstalled593Original591V2PhaseReceipt(changed,current));
  }
  const raw=JSON.stringify({kind:'RAVRADAR_NATIVE_PROGRAM_IDENTITY_V2',phase:receipt.phase,programs:receipt.runtime.selectedPrograms})+'\n';
  const collector=nativeProgramMarkerCollector(receipt.phase);for(let i=0;i<raw.length;i+=7)collector.write(raw.slice(i,i+7));
  assert.deepEqual(collector.finish(),receipt.runtime.selectedPrograms);
  for(const body of ['',raw+raw,raw.slice(0,-1),raw.replace(receipt.phase,'ASSISTANT_PUBLIC591_SUCCESSOR')]){
    const bad=nativeProgramMarkerCollector(receipt.phase);bad.write(body);assert.throws(()=>bad.finish());
  }
  assert.throws(()=>nativeProgramMarkerCollector('ARBITRARY_PHASE'));
  const reused=await decideInstalled593Original591Reuse(v2LiveFixture({installed594V2:true}).options);
  for(const native of [receipt,reused]){
    verifyInstalled593Original591NativeContext(native,native.current,'4.0.594');
    const claims=installed593Original591NativeClaims(native,native.current);assert.equal(Object.keys(claims).length,7);
    assert.equal(claims.current593PredecessorNative.scope,'GENUINE_FROZEN593');
    for(const claim of Object.values(claims))assert.deepEqual([claim.status,claim.executedInThisRun,claim.origin,claim.eligibleForReuse],
      [native.status,native.executedInThisRun,native.origin,true]);
  }
});

test('594 V2 normal live caller requires its own new executed origin/upload, merged PR and final freshness; unknown reruns',async()=>{
  for(const options of [{},{locator:true},{emptyOriginProjection:true},{locator:true,emptyOriginProjection:true}]){
    const f=v2LiveFixture({...options,installed594V2:true}),result=await decideInstalled593Original591Reuse(f.options);
    assert.equal(result.status,'REUSED');assert.equal(result.executedInThisRun,false);assert.equal(result.origin.run,f.origin.id);
  }
  for(const fault of ['currentHead','attempt','preflight','number','expired','originPullUnavailable']){
    const f=v2LiveFixture({installed594V2:true});f.fault[fault]=true;
    assert.equal((await decideInstalled593Original591Reuse(f.options)).status,'EXECUTE',fault);
  }
  for(const mutate of [v=>v.expired=true,v=>v.workflow_run.head_sha=newOid,v=>v.name='other',v=>v.id=0,
    v=>v.size_in_bytes=65537,v=>v.digest='unknown',v=>v.created_at='unknown']){
    const f=v2LiveFixture({installed594V2:true});f.fault.artifactMutation=mutate;
    assert.equal((await decideInstalled593Original591Reuse(f.options)).status,'EXECUTE');
    assert.equal(f.calls.filter(route=>route.endsWith('/zip')).length,0);
  }
  for(const finalOnly of [false,true]){
    const f=v2LiveFixture({installed594V2:true,emptyOriginProjection:true});
    f.fault.originPullMutation=(pr,count)=>{if(!finalOnly||count===2)pr.head.sha=newOid;};
    assert.equal((await decideInstalled593Original591Reuse(f.options)).status,'EXECUTE');
  }
  assert.equal((await decideInstalled593Original591Reuse(v2LiveFixture({installed594V2:true,laterFailure:true}).options)).status,'EXECUTE');
  const drift=v2LiveFixture({installed594V2:true});drift.options.getRuntime=async()=>({...v2Runtime(),imageVersion:'20261031.1'});
  assert.equal((await decideInstalled593Original591Reuse(drift.options)).status,'EXECUTE');
  const inputDrift=v2LiveFixture({installed594V2:true});inputDrift.options.getInput=async()=>({...installed594V2Input(),controlsSha256:'f'.repeat(64)});
  assert.equal((await decideInstalled593Original591Reuse(inputDrift.options)).status,'EXECUTE');
  const old=v2LiveFixture();assert.equal((await decideInstalled593Original591Reuse(old.options)).status,'EXECUTE');
  const upgraded=v2LiveFixture({installed594V2:true});Object.assign(upgraded.options.local,
    {schemaVersion:1,kind:INSTALLED593_ORIGINAL591_PHASE_KIND,eligibleForReuse:false});
  assert.equal((await decideInstalled593Original591Reuse(upgraded.options)).status,'EXECUTE');
  assert.equal(upgraded.calls.length,0,'An augmented V1 cannot even start origin transport');
  const f=v2LiveFixture({installed594V2:true}),phase=verifyAssistantPublic591Metadata(f.origin,f.originalJobs),proof=f.proofFor(f.origin);
  assert.equal(verifyInstalled593Original591Artifact(f.artifactFor(f.origin),f.zip,Buffer.from(JSON.stringify(proof)),f.origin,phase,
    f.originPullFor(f.origin)).nativePostgres.status,'EXECUTED');
  for(const native of [installed594Receipt(),v2Receipt(),{...installed594V2Receipt(),status:'REUSED'}]){
    const changed={...proof,nativePostgres:native};assert.throws(()=>verifyInstalled593Original591Artifact(f.artifactFor(f.origin),f.zip,
      Buffer.from(JSON.stringify(changed)),f.origin,phase,f.originPullFor(f.origin)));
  }
});

test('594 V2 normal execution boundary requires finished marker and fresh input/runtime after proved cleanup',async()=>{
  const local=installed594V2Receipt(),programs=local.runtime.selectedPrograms;
  const options={getInput:async()=>installed594V2Input(),getRuntime:async()=>v2Runtime()};
  const executed=await completeInstalled593Original591Execution(local,programs,options);
  assert.deepEqual([executed.status,executed.executedInThisRun,executed.origin],['EXECUTED',true,null]);
  for(const selected of [null,{...programs,majorVersion:17},v2Runtime().selectedPrograms.files])
    await assert.rejects(completeInstalled593Original591Execution(local,selected,options));
  await assert.rejects(completeInstalled593Original591Execution(local,programs,
    {...options,getInput:async()=>({...installed594V2Input(),controlsSha256:'f'.repeat(64)})}));
  await assert.rejects(completeInstalled593Original591Execution(local,programs,
    {...options,getRuntime:async()=>({...v2Runtime(),imageVersion:'20261031.1'})}));
  const source=await fs.readFile('scripts/lib/checkpoint-cas-native-postgres.mjs','utf8');
  const cleanup=source.indexOf('if (cleanupAllowed && (!started || stopped)) await fs.rm('),
    complete=source.indexOf('completedReport.nativeProgramIdentity=after;');assert(cleanup>=0&&complete>cleanup);
  const caller=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  assert(caller.indexOf("kind:'RAVRADAR_NATIVE_PROGRAM_IDENTITY_V2'")>caller.indexOf('const report = await runNativeCheckpointSqlComparison('));
  assert(caller.includes("?'INSTALLED593_ORIGINAL591_SUCCESSOR':'ASSISTANT_PUBLIC591_SUCCESSOR'"));
});

test('594 V2 normal locator transport reuses beyond24 physical hops and safely refuses64 or60s overflow',async t=>{
  const run=async(reader,{laterRuns=2,expireDuringFetch=false}={})=>{
    const fixture=v2LiveFixture({installed594V2:true,locator:true,emptyOriginProjection:true}),synthetic=fixture.options.get;
    const extra=Array.from({length:laterRuns-1},(_,i)=>({...copy(fixture.origin),id:fixture.origin.id+i+1,
      head_sha:'c'.repeat(40),head_branch:'synthetic-later-'+i}));
    const env={GITHUB_TOKEN:'synthetic594-budget-token'},signed='https://synthetic-artifact.invalid/budget-body';
    let physicalCalls=0,signedCalls=0,clock=0;
    const fetchImpl=async(url,options)=>{
      physicalCalls++;assert(options.signal instanceof AbortSignal);
      if(expireDuringFetch)clock=60000;
      if(url===signed){
        signedCalls++;assert.equal(options.headers,undefined);assert.equal(options.redirect,'error');
        return new Response(fixture.zip);
      }
      assert(url.startsWith('https://api.github.com/repos/'+ORIGIN.repository+'/'));
      assert.equal(options.headers.Authorization,'Bearer '+env.GITHUB_TOKEN);assert.equal(options.redirect,'manual');
      const parsed=new URL(url),route=parsed.pathname+parsed.search;
      if(route.endsWith('/zip')){
        await synthetic(route,{zip:true});return new Response(null,{status:302,headers:{Location:signed}});
      }
      if(route.includes('/workflows/')){
        const listing=await synthetic(route);listing.workflow_runs.push(...copy(extra));listing.total_count+=extra.length;
        return new Response(JSON.stringify(listing));
      }
      const later=extra.find(value=>route.includes('/runs/'+value.id+'/attempts/1/jobs'));
      if(later){
        const jobs=copy(fixture.originalJobs),job=jobs.jobs[0];
        Object.assign(job,{id:later.id+1000,run_id:later.id,head_sha:later.head_sha});
        return new Response(JSON.stringify(jobs));
      }
      return new Response(JSON.stringify(await synthetic(route)));
    };
    if(reader)fixture.options.get=reader({env,now:()=>clock,fetchImpl});
    else{
      delete fixture.options.get;fixture.options.env=env;
      t.mock.method(globalThis,'fetch',fetchImpl); // Exercise the normal594 default reader selection.
    }
    try{
      const result=await decideInstalled593Original591Reuse(fixture.options);
      return {result,fixture,physicalCalls,signedCalls};
    }finally{if(!reader)t.mock.restoreAll();}
  };
  const old=await run(assistantPublic591Reader);
  assert.equal(old.result.status,'EXECUTE');assert.equal(old.physicalCalls,24);
  const current=await run(null);
  assert.equal(current.result.status,'REUSED');assert.equal(current.result.executedInThisRun,false);
  assert.equal(current.physicalCalls,25);assert.equal(current.signedCalls,2);
  assert.equal(current.fixture.proofFor(current.fixture.origin).nativePostgres.status,'EXECUTED');
  assert.deepEqual(current.result.origin,{run:current.fixture.origin.id,attempt:1,
    job:current.fixture.originalJobs.jobs[0].id,head:current.fixture.origin.head_sha,
    artifactId:current.fixture.origin.id+2000,artifactDigest:'sha256:'+v2Hash(current.fixture.zip),
    sourceTreeSha256:'sha256:'+'e'.repeat(64)});
  const overflow=await run(installed593Original591Reader,{laterRuns:42});
  assert.equal(overflow.result.status,'EXECUTE');assert.equal(overflow.physicalCalls,64);
  const expired=await run(installed593Original591Reader,{expireDuringFetch:true});
  assert.equal(expired.result.status,'EXECUTE');assert.equal(expired.physicalCalls,1);
});


test('594 V2 skips only proved non-executed PG rows and keeps later negative or missing-artifact refusals',async()=>{
  const scenario=({pgConclusion='skipped',pgStatus='completed',differentControls=false,artifactMode='missing',freshRunMutation=null}={})=>{
    const fixture=v2LiveFixture({installed594V2:true}),observed=[];
    const newest={...copy(fixture.origin),id:fixture.origin.id+25,head_sha:'7'.repeat(40),
      head_branch:'synthetic594-targeted-skipped',pull_requests:[],created_at:'2026-10-30T11:00:00Z',conclusion:'success'};
    const jobs=copy(fixture.originalJobs),job=jobs.jobs[0];
    Object.assign(job,{id:newest.id+1000,run_id:newest.id,head_sha:newest.head_sha,conclusion:'success'});
    for(const step of job.steps)Object.assign(step,{started_at:'2026-10-30T11:00:00Z',completed_at:'2026-10-30T11:01:00Z'});
    job.steps[14].conclusion=pgConclusion==='success'?'success':'skipped';
    Object.assign(job.steps[15],{status:pgStatus,conclusion:pgConclusion,
      started_at:pgConclusion==='skipped'?null:'2026-10-30T11:01:00Z',completed_at:pgConclusion==='skipped'?null:'2026-10-30T11:02:00Z'});
    Object.assign(job.steps[16],{conclusion:pgConclusion==='success'?'success':'skipped',
      started_at:pgConclusion==='success'?'2026-10-30T11:02:00Z':null,completed_at:pgConclusion==='success'?'2026-10-30T11:03:00Z':null});
    const originalGet=fixture.options.get,originalReadGit=fixture.options.readGit;
    fixture.options.readGit=args=>differentControls&&args[0]==='cat-file'&&args[2].startsWith(newest.head_sha+':')
      ?'different actual controls':originalReadGit(args);
    fixture.options.get=async(route,options={})=>{
      observed.push(route);
      if(route.includes('/workflows/')){
        const listing=await originalGet(route,options);
        return {...listing,total_count:listing.total_count+1,
          workflow_runs:[listing.workflow_runs[0],copy(newest),...listing.workflow_runs.slice(1)]};
      }
      if(route.endsWith('/runs/'+newest.id)){const fresh=copy(newest);freshRunMutation?.(fresh);return fresh;}
      if(route.includes('/runs/'+newest.id+'/attempts/1/jobs'))return copy(jobs);
      if(route.endsWith('/runs/'+newest.id+'/artifacts?per_page=100')){
        assert.equal(pgConclusion,'success','A skipped phase must not request an artifact');
        if(artifactMode==='missing')return {total_count:0,artifacts:[]};
        return {total_count:1,artifacts:[{...fixture.artifactFor(newest),digest:'unknown'}]};
      }
      return originalGet(route,options);
    };
    return {fixture,newest,jobs,observed};
  };
  const skipped=scenario(),reused=await decideInstalled593Original591Reuse(skipped.fixture.options);
  assert.equal(reused.status,'REUSED');assert.equal(reused.executedInThisRun,false);
  assert.equal(reused.origin.run,skipped.fixture.origin.id,'The actual older executed origin must remain the origin');
  assert.deepEqual(skipped.jobs.jobs[0].steps.slice(14,17).map(step=>[step.status,step.conclusion]),
    [['completed','skipped'],['completed','skipped'],['completed','skipped']],
    'The actual normal TARGETED source15/PG16/upload17 shape must be used');
  assert.equal(skipped.observed.filter(route=>route.endsWith('/runs/'+skipped.newest.id)).length,1,
    'Listing metadata alone cannot authorize passing the skipped run');
  assert(!skipped.observed.some(route=>route.includes('/runs/'+skipped.newest.id+'/artifacts')));
  assert.equal(skipped.observed.filter(route=>route.endsWith('/artifacts/'+(skipped.fixture.origin.id+2000)+'/zip')).length,1);
  for(const pgConclusion of ['failure','cancelled',null,'unknown']){
    const later=scenario({pgConclusion,differentControls:true});
    assert.equal((await decideInstalled593Original591Reuse(later.fixture.options)).status,'EXECUTE',String(pgConclusion));
    assert(later.observed.some(route=>route.endsWith('/artifacts/'+(later.fixture.origin.id+2000)+'/zip')),
      'The later negative phase must be rejected after the older actual origin was checked');
  }
  for(const pgStatus of ['in_progress',null]){
    const unknown=scenario({pgStatus,differentControls:true});
    assert.equal((await decideInstalled593Original591Reuse(unknown.fixture.options)).status,'EXECUTE');
  }
  for(const artifactMode of ['missing','tampered']){
    const executed=scenario({pgConclusion:'success',artifactMode});
    assert.equal((await decideInstalled593Original591Reuse(executed.fixture.options)).status,'EXECUTE');
    assert(!executed.observed.some(route=>route.endsWith('/artifacts/'+(executed.fixture.origin.id+2000)+'/zip')),
      'A selected PG-success origin with missing or changed evidence must not fall through to older evidence');
  }
  const mixed=scenario();mixed.jobs.jobs[0].steps[16].conclusion='success';
  assert.equal((await decideInstalled593Original591Reuse(mixed.fixture.options)).status,'EXECUTE');
  const obsoleteV1Shape=scenario();obsoleteV1Shape.jobs.jobs[0].steps[14].conclusion='success';
  assert.equal((await decideInstalled593Original591Reuse(obsoleteV1Shape.fixture.options)).status,'EXECUTE',
    'Do not retain the mistaken v1 source15-success admission as an alternative TARGETED shape');
  for(const mutate of [run=>run.head_sha='8'.repeat(40),run=>run.run_attempt=2,
    run=>run.status='in_progress',run=>run.conclusion='cancelled',run=>run.conclusion=null]){
    const moved=scenario({freshRunMutation:mutate});
    assert.equal((await decideInstalled593Original591Reuse(moved.fixture.options)).status,'EXECUTE');
    assert(!moved.observed.some(route=>route.endsWith('/artifacts/'+(moved.fixture.origin.id+2000)+'/zip')),
      'A changed or unknown fresh skipped-run identity must stop before an older origin is used');
  }
});


function scalar597Report(migrationVersion,databaseBeforeVersion){
  return {kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',sqlExecuted:true,migrationExecuted:true,
    tcpEnabled:false,normalModelPartCount:673,postgresMajorVersion:16,nativeProgramIdentity:v2Runtime().selectedPrograms,
    scalar597LaterH0Successor:{kind:'SCALAR597_LATER_H0_SUCCESSOR',sourceMigrationInventory:62,
      sqlExecuted:true,wholeMigrationExecuted:true,databaseBeforeVersion,originalStateRelease:594,
      migrationVersion,partCount:673,checkpointOidSlots:43,contractBodies:46,
      oldFunctionsAndOidsPreserved:true,allOriginalDefinitionsPreserved:true,exactCheckpointContract:true,
      exactTripContract:true,schema2Catalog:true,normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true,
      trueOld594Fixtures:true,currentNormalFixtures:true,old594ModelNotRetagged:true,wholeMetadataInverse:true,
      strictlyLater594ToNextOnly:true,productionSeedAuthenticated:false,sqlIsNotOriginAuthentication:true,
      intermediateRuntime:{oldActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,
        nextActiveAfterCompletion:true,oldRefusedAfterCompletion:true,activeDocumentsUnchangedBySql:true,
        quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true}}};
}

test('597 normal native command accepts exactly one complete payload-free 597 marker, never 594 or partial proof',()=>{
  const raw=scalar597Report('20261104004400','20261029233000');
  const expected={migrationVersion:'20261104004400',databaseBeforeVersion:'20261029233000',
    selectedPrograms:v2Runtime().selectedPrograms};
  const line=JSON.stringify({...raw,irrelevant:['synthetic-report-content']})+'\n';
  const collector=scalar597NativeReportCollector(expected);
  collector.write('ordinary SQL fixture output\n');
  for(let i=0;i<line.length;i+=7)collector.write(line.slice(i,i+7));
  assert.deepEqual(collector.finish(),raw);
  for(const bad of ['',line+line,line.slice(0,-1),
    '{"kind":"NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON",'+ ' '.repeat(65536)+'}\n',
    JSON.stringify({...raw,installed593Original591Successor:{}})+'\n',
    JSON.stringify({...raw,scalar597LaterH0Successor:null})+'\n']){
    const refused=scalar597NativeReportCollector(expected);refused.write(bad);
    assert.throws(()=>refused.finish());
  }
  for(const mutation of [v=>v.migrationExecuted=false,v=>v.postgresMajorVersion=17,
    v=>v.nativeProgramIdentity.files[0].sha256='f'.repeat(64),
    v=>v.scalar597LaterH0Successor.sourceMigrationInventory=61,
    v=>v.scalar597LaterH0Successor.migrationVersion='20261029233000',
    v=>v.scalar597LaterH0Successor.strictlyLater594ToNextOnly=false,
    v=>v.scalar597LaterH0Successor.intermediateRuntime.quotaServiceRoleWorking=false]){
    const changed=copy(raw);mutation(changed);
    const refused=scalar597NativeReportCollector(expected);refused.write(JSON.stringify(changed)+'\n');
    assert.throws(()=>refused.finish());
  }
});

test('597 normal national/native readers refuse old phase, execution retag, run drift and lost new source target',async()=>{
  const old=installed594Receipt(),current=old.current;
  const pkg=JSON.parse(await fs.readFile('package.json','utf8'));
  assert.throws(()=>verifyScalar597LaterH0PhaseReceipt(old,current));
  if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase!==SCALAR597_LATER_H0_PHASE){
    assert.throws(()=>verifyScalar597LaterH0NativeContext(old,current,'4.0.597'));
    return;
  }
  const binding=ACTIVE_ASSISTANT_SUCCESSOR.requireBinding(),output=ACTIVE_ASSISTANT_SUCCESSOR.requireOutput();
  const databaseBefore=ACTIVE_ASSISTANT_SUCCESSOR.databaseBefore,releaseVersion=ACTIVE_ASSISTANT_SUCCESSOR.requireRelease();
  const receipt={schemaVersion:1,kind:SCALAR597_LATER_H0_PHASE_KIND,phase:'SCALAR597_LATER_H0_SUCCESSOR',
    sourcePhase:SCALAR597_LATER_H0_PHASE,releaseVersion,binding,output,databaseBefore,current,
    commands:[...SCALAR597_LATER_H0_COMMANDS],status:'EXECUTED',executedInThisRun:true,origin:null,
    eligibleForReuse:false,runtime:v2Runtime(),report:scalar597Report(binding.version,databaseBefore.version)};
  assert.equal(verifyScalar597LaterH0NativeContext(receipt,current,pkg.version),receipt);
  assert.equal(inverseScalar597LaterH0Package(pkg).version,'4.0.594');
  const oldSource=copy(pkg);oldSource.scripts['test:assistant-later-h0-source']=SCALAR597_LATER_H0_SOURCE_COMMAND.split(' && ')[0];
  assert.throws(()=>inverseScalar597LaterH0Package(oldSource));
  assert.deepEqual(scalar597LaterH0NativeClaims(receipt,current),{
    currentScalar597LaterH0Native:{status:'EXECUTED',executedInThisRun:true,origin:null,
      phase:SCALAR597_LATER_H0_PHASE,eligibleForReuse:false,separatelyRequired:true},
    currentScalar597LaterH0Source:{command:'npm run test:assistant-later-h0-source',
      actualCommand:SCALAR597_LATER_H0_SOURCE_COMMAND,separatelyRequired:true},
    currentScalar597LaterH0NationalExecutionClaimed:false});
  for(const mutate of [v=>v.kind=old.kind,v=>v.commands=old.commands,v=>v.status='REUSED',v=>v.eligibleForReuse=true,
    v=>v.current.attempt=2,v=>v.current.run++,v=>v.output.migrationSha256='f'.repeat(64),
    v=>v.runtime.selectedPrograms.files.pop(),v=>v.report.scalar597LaterH0Successor.originalStateRelease=593]){
    const changed=copy(receipt);mutate(changed);
    assert.throws(()=>verifyScalar597LaterH0NativeContext(changed,current,pkg.version));
  }
});


test('after597 frozen native boundary preserves CODE/native identities and checks admission before IO',async t=>{
  const {withFrozen597CheckpointPostgresSource,FROZEN597_NATIVE_SOURCE:source}=
    await import('./run-frozen586-assistant-later-h0-postgres-source.mjs');
  const {SOURCE597_CODE_SOURCE_PROVENANCE:code}=await import('./check-assistant-later-h0-predecessor-source.mjs');
  const {SCALAR597_LATER_H0_BINDING:binding,ASSISTANT_AFTER597_BINDING,ASSISTANT_AFTER597_OUTPUT,
    ACTIVE_ASSISTANT_SUCCESSOR}=await import('./lib/assistant-later-h0-successor-source.mjs');
  if(HISTORICAL598_INPUT_REQUIRED){
    const historical=await genuineIssued598SourceData();
    assert.equal(historical.sourcePhase,ASSISTANT_AFTER597_PHASE);
    assert.deepEqual(historical.binding,ASSISTANT_AFTER597_BINDING);
    assert.deepEqual(historical.output,ASSISTANT_AFTER597_OUTPUT);
  }else if(AFTER597_ISSUED){
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,ASSISTANT_AFTER597_PHASE);
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.requireBinding(),ASSISTANT_AFTER597_BINDING);
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.requireOutput(),ASSISTANT_AFTER597_OUTPUT);
  }else{
    assert.equal(ASSISTANT_AFTER597_BINDING,null);assert.equal(ASSISTANT_AFTER597_OUTPUT,null);
    assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'scalar597-later-h0-original594-successor');
  }
  assert.equal(source.codeHead,code.head);assert.equal(source.codeTree,code.tree);
  assert.equal(source.codeHead,'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84');
  assert.equal(source.nativeHead,'97d189e4a99fdab1b2764db1bfe59f96e92c3f02');
  assert.equal(source.nativeTree,'b804a9d766e1828cfed6ef6927ddf6582d2dc326');
  assert.equal(source.adapterBytes,44475);assert.equal(source.adapterSha256,'4798450acb08f9078377424f7de12a9b9e7317eb703754024a6b16b4e37bc963');
  assert.equal(source.factorySourceSha256,'7e953c0fb1ef424d40a85396bafe506076ab642229a735800a34376b0f2f7960');
  assert.deepEqual([source.candidate,source.integrated,source.continuation],[binding.C,binding.I,binding.T]);
  let callbacks=0,filesystem=0;
  for(const name of ['readFile','writeFile','lstat','mkdir','unlink'])t.mock.method(fs,name,()=>{filesystem++;throw Error('IO_BEFORE_ISSUANCE');});
  if(AFTER597_ISSUED){
    await assert.rejects(()=>withFrozen597CheckpointPostgresSource(null),{code:'ERR_ASSERTION'});
    await assert.rejects(()=>withFrozen597CheckpointPostgresSource(),{code:'ERR_ASSERTION'});
  }else{
    await assert.rejects(()=>withFrozen597CheckpointPostgresSource(()=>{callbacks++;}),/ASSISTANT_AFTER597_UNISSUED/);
    await assert.rejects(()=>withFrozen597CheckpointPostgresSource(null),/ASSISTANT_AFTER597_UNISSUED/);
  }
  assert.equal(callbacks,0);assert.equal(filesystem,0);
});

test('after597 fixed native profile keeps genuine597 CODE/native identities and real metadata',async()=>{
  const native=await import('./lib/assistant-later-h0-postgres.mjs');
  const source=await import('./lib/assistant-later-h0-successor-source.mjs');
  const frozen=await import('./run-frozen586-assistant-later-h0-postgres-source.mjs');
  const p=native.ASSISTANT_AFTER597_NATIVE_PROFILE;
  assert.equal(p.before,source.ASSISTANT_AFTER597_BEFORE);assert.equal(p.parent,frozen.FROZEN597_NATIVE_SOURCE);
  assert.equal(p.parent.codeHead,'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84');
  assert.equal(p.parent.nativeHead,'97d189e4a99fdab1b2764db1bfe59f96e92c3f02');
  assert.equal(p.parent.adapterSha256,'4798450acb08f9078377424f7de12a9b9e7317eb703754024a6b16b4e37bc963');
  assert.equal(p.before.I,p.parent.integrated);assert.equal(p.before.C,p.parent.candidate);assert.equal(p.before.T,p.parent.continuation);
  assert.equal(p.previousRelease,597);assert.equal(p.oldPrefix,'scalar597-later-h0-current-');
  assert.equal(p.migrationCount,63);assert.equal(p.deriveContractShapeFromCanonical,true);
  assert.equal(Object.hasOwn(p,'oidSlots'),false,'No fabricated future OID count');
  assert.equal(Object.hasOwn(p,'contractBodies'),false,'Shape derives only from legitimately generated canonical');
  assert.equal(p.sourcePhase,source.UNISSUED_ASSISTANT_AFTER597_SUCCESSOR.sourcePhase);
  if(AFTER597_ISSUED){
    assert.equal(p.requireBinding(),source.ASSISTANT_AFTER597_BINDING);
    assert.equal(p.requireOutput(),source.ASSISTANT_AFTER597_OUTPUT);
    if(HISTORICAL598_INPUT_REQUIRED){
      const old=await genuineIssued598SourceData();
      assert.equal(source.requireAssistantAfter597Release(),old.pkg.version);
      assert.equal(old.sourcePhase,source.UNISSUED_ASSISTANT_AFTER597_SUCCESSOR.sourcePhase);
      assert.deepEqual(old.binding,source.requireAssistantAfter597Binding());
    }else{
    assert.equal(source.requireAssistantAfter597Release(),JSON.parse(await fs.readFile('package.json','utf8')).version);
    assert.equal(source.ACTIVE_ASSISTANT_SUCCESSOR,source.UNISSUED_ASSISTANT_AFTER597_SUCCESSOR);
    }
  }else{
    assert.equal(source.ASSISTANT_AFTER597_BINDING,null);assert.equal(source.ASSISTANT_AFTER597_OUTPUT,null);assert.equal(source.ASSISTANT_AFTER597_RELEASE,null);
    assert.equal(source.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'scalar597-later-h0-original594-successor');
  }
});

test('after597 fixed native comparison and trip window reject invalid input before IO',async t=>{
  const {compareAssistantAfter597Successor,prepareAssistantAfter597NativeFixtureWindow}=await import('./lib/assistant-later-h0-postgres.mjs');
  let reads=0,io=0;
  const poison=new Proxy({},{get(){reads++;throw Error('UNEXPECTED_OPTION_ACCESS');},ownKeys(){reads++;throw Error('UNEXPECTED_OPTION_KEYS');}});
  for(const name of ['readFile','writeFile','mkdir','mkdtemp','lstat','readdir'])
    t.mock.method(fs,name,()=>{io++;throw Error('UNEXPECTED_FILESYSTEM');});
  for(const fn of [compareAssistantAfter597Successor,prepareAssistantAfter597NativeFixtureWindow]){
    if(AFTER597_ISSUED){
      await assert.rejects(fn(poison),/UNEXPECTED_OPTION_ACCESS/);
      await assert.rejects(fn(),{code:'ERR_ASSERTION'});
    }else{
      await assert.rejects(fn(poison),/ASSISTANT_AFTER597_UNISSUED/);
      await assert.rejects(fn(),/ASSISTANT_AFTER597_UNISSUED/);
    }
  }
  assert.equal(reads,AFTER597_ISSUED?2:0);assert.equal(io,0,'Invalid options never reach filesystem/Git/factory/SQL/callback');
});

test('after597 normal routing selects only the fixed source-owned active command',async()=>{
  const native=await import('./native-postgres-evidence.mjs');
  assert.equal(native.ASSISTANT_AFTER597_PHASE,'assistant-mixed-after597-successor');
  assert.deepEqual(native.ASSISTANT_AFTER597_COMMANDS,
    ['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after597-successor']);
  assert.equal(native.ASSISTANT_AFTER597_SCRIPT,'set -euo pipefail\n'+native.ASSISTANT_AFTER597_COMMANDS[0]+'\n');
  const activeCommands=AFTER599_ACTIVE?native.ASSISTANT_AFTER599_COMMANDS:AFTER598_ACTIVE?native.ASSISTANT_AFTER598_COMMANDS:
    AFTER597_ISSUED?native.ASSISTANT_AFTER597_COMMANDS:native.SCALAR597_LATER_H0_COMMANDS;
  if(AFTER601_ACTIVE)assert.deepEqual(native.ACTIVE_COMMANDS,[AFTER601_NATIVE_COMMAND]);
  else assert.equal(native.ACTIVE_COMMANDS,activeCommands);
  assert.equal(native.ACTIVE_NATIVE_SCRIPT,AFTER601_ACTIVE?AFTER601_NATIVE_SCRIPT:
    AFTER599_ACTIVE?native.ASSISTANT_AFTER599_SCRIPT:AFTER598_ACTIVE?native.ASSISTANT_AFTER598_SCRIPT:
    AFTER597_ISSUED?native.ASSISTANT_AFTER597_SCRIPT:native.SCALAR597_LATER_H0_SCRIPT);
  const caller=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  const guard=caller.indexOf('if(assistantAfter597Native){'),first=caller.indexOf('requireAssistantAfter597Output();',guard);
  assert(guard>=0&&first>guard&&first<caller.indexOf('const PART_COUNT ='));
  assert(caller.includes('const report=await runAssistantAfter597NativeCheckpointSqlComparison({'));
});

test('after597 normal PG entry and report collector enforce real admission before IO',async t=>{
  const {runAssistantAfter597NativeCheckpointSqlComparison}=await import('./lib/checkpoint-cas-native-postgres.mjs');
  const native=await import('./native-postgres-evidence.mjs');
  let reads=0;
  const poison=new Proxy({},{get(){reads++;throw Error('UNEXPECTED_NEXT_OPTIONS');},ownKeys(){reads++;throw Error('UNEXPECTED_NEXT_KEYS');}});
  for(const name of ['readFile','writeFile','mkdir','mkdtemp','lstat','readdir'])
    t.mock.method(fs,name,()=>{reads++;throw Error('UNEXPECTED_NEXT_IO');});
  if(AFTER597_ISSUED){
    await assert.rejects(runAssistantAfter597NativeCheckpointSqlComparison(poison),/UNEXPECTED_NEXT_OPTIONS/);
    await assert.rejects(runAssistantAfter597NativeCheckpointSqlComparison(),{code:'ERR_ASSERTION'});
    const collector=native.assistantAfter597NativeReportCollector(poison);
    collector.write('ordinary unit output without a native marker\n');
    await assert.rejects(collector.finish());
    assert.equal(reads,1,'Only the deliberately invalid option getter was reached; no IO/native launch');
  }else{
    for(const call of [()=>runAssistantAfter597NativeCheckpointSqlComparison(poison),
      ()=>native.assistantAfter597NativeReportProjection(poison,poison),
      ()=>native.verifyAssistantAfter597PhaseReceipt(poison,poison),()=>native.executeAssistantAfter597Native()])
      await assert.rejects(call(),/ASSISTANT_AFTER597_UNISSUED/);
    assert.throws(()=>native.assistantAfter597NativeReportCollector(poison),/ASSISTANT_AFTER597_UNISSUED/);
    assert.equal(reads,0);
  }
});

test('after597 actual normal CLI checks issued source or refuses unissued before PostgreSQL',async()=>{
  if(HISTORICAL598_INPUT_REQUIRED){
    // This existing authenticated CODE822 reader already executes the genuine
    // after597 --check and validates its complete original stdout before callback.
    const historical=await genuineIssued598SourceData();
    assert.equal(historical.sourcePhase,ASSISTANT_AFTER597_PHASE);
    assert.equal(historical.pkg.version,'4.0.598');
  }
  const {execFile}=await import('node:child_process');
  const result=await new Promise(resolve=>execFile(process.execPath,
    HISTORICAL598_INPUT_REQUIRED?['scripts/build-assistant-later-h0-successor.mjs','--active','--check']
      :AFTER597_ISSUED?['scripts/build-assistant-later-h0-successor.mjs','--assistant-after597','--check']
      :['scripts/test-protected-ravscore-continuation-checkpoint.mjs','--assistant-after597-successor'],
    {env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot},timeout:10000,maxBuffer:16384},
    (error,stdout,stderr)=>resolve({code:error?.code??0,stdout,stderr})));
  if(AFTER601_ACTIVE){
    assert.equal(result.code,0);assert.equal(result.stderr,'');
    assert.match(result.stdout,/Præcis originalbevarende 601-kilde, migration og invers genlæsning består./);
  }else if(AFTER599_ACTIVE){
    assert.equal(result.code,0);assert.equal(result.stderr,'');
    assert.match(result.stdout,/Præcis assistentkilde efter599 kontrolleret/);
  }else if(AFTER598_ACTIVE){
    assert.equal(result.code,0);assert.equal(result.stderr,'');
    assert.match(result.stdout,/Præcis assistentkilde efter598 kontrolleret/);
  }else if(AFTER597_ISSUED){
    assert.equal(result.code,0);assert.equal(result.stderr,'');
    assert.match(result.stdout,/Præcis assistentkilde efter597 kontrolleret/);
  }else{
    assert.equal(result.code,1);assert.equal(result.stdout,'');
    assert.match(result.stderr,/ASSISTANT_AFTER597_UNISSUED/);
    assert(!result.stderr.includes('NATIVE_POSTGRES_ASSERTION_FAILED'));
  }
});


test('after597 nationalreader keeps exact issued source and old unissued input boundary',async t=>{
  const normal=await import('./national584-source-evidence.mjs');
  const profile=await import('./lib/assistant-later-h0-successor-source.mjs');
  if(AFTER597_ISSUED){
    const pkg=HISTORICAL598_INPUT_REQUIRED?(await genuineIssued598SourceData()).pkg:JSON.parse(await fs.readFile('package.json','utf8'));
    if(!HISTORICAL598_INPUT_REQUIRED)assert.equal(profile.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,ASSISTANT_AFTER597_PHASE);
    assert.equal(profile.requireAssistantAfter597Release(),pkg.version);
    if(HISTORICAL598_INPUT_REQUIRED){normal.verifyAssistantAfter597Package(pkg);normal.verifyAssistantAfter597NativeCommands(ASSISTANT_AFTER597_COMMANDS,pkg.version);
      assert.throws(()=>normal.verifyCurrentNativeCommands(ASSISTANT_AFTER597_COMMANDS,pkg.version));
    }else{normal.verifyPackage(pkg);normal.verifyCurrentNativeCommands(ASSISTANT_AFTER597_COMMANDS,pkg.version);}
    const previous=normal.inverseAssistantAfter597Package(pkg);
    assert.equal(previous.version,profile.INACTIVE_SCALAR597_LATER_H0_SUCCESSOR.requireRelease());
    const tampered=copy(pkg);tampered.scripts['test:assistant-later-h0-source']+=' --write';
    assert.throws(()=>normal.inverseAssistantAfter597Package(tampered));
    assert.throws(()=>normal.verifyCurrentNativeCommands(SCALAR597_LATER_H0_COMMANDS,pkg.version));
    if(HISTORICAL598_INPUT_REQUIRED){await assert.rejects(normal.verifyAssistantAfter597SourceTarget());}else{
    const checked=await normal.verifyAssistantAfter597SourceTarget();
    assert.equal(checked.release,pkg.version);
    assert.equal(checked.canonicalSha256,profile.requireAssistantAfter597Output().canonicalSha256);
    assert.deepEqual([checked.sourceOnly,checked.sqlExecuted,checked.originalsAuthenticated,checked.productionProof],[true,false,false,false]);
    }
    const older={...installed594Receipt(),runtime:v2Runtime(),report:scalar597Report('20261104004400','20261029233000')};
    await assert.rejects(normal.verifyAssistantAfter597NativeContext(older,older.current,pkg.version));
    await assert.rejects(normal.assistantAfter597NativeClaims(older,older.current));
  }else{
  assert.equal(profile.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'scalar597-later-h0-original594-successor');
  assert.equal(profile.ASSISTANT_AFTER597_BINDING,null);
  assert.equal(profile.ASSISTANT_AFTER597_OUTPUT,null);
  assert.equal(profile.ASSISTANT_AFTER597_RELEASE,null);
  assert.equal(normal.ASSISTANT_AFTER597_SOURCE_COMMAND,
    'node scripts/build-assistant-later-h0-successor.mjs --active --check'
    +' && node scripts/national584-source-evidence.mjs assistant-after597-source');
  const pkg=JSON.parse(await fs.readFile(new URL('../package.json',import.meta.url),'utf8'));
  assert.doesNotThrow(()=>normal.verifyPackage(pkg),'The actual normal597 package still passes its whole old plan');
  normal.verifyCurrentNativeCommands(SCALAR597_LATER_H0_COMMANDS,'4.0.597');
  let inputReads=0,io=0;
  const forbidden=new Proxy({},{
    get(){inputReads++;throw new Error('UNEXPECTED_AFTER597_INPUT');},
    ownKeys(){inputReads++;throw new Error('UNEXPECTED_AFTER597_KEYS');},
  });
  for(const key of ['readFile','writeFile','readdir','mkdir','lstat'])
    t.mock.method(fs,key,async()=>{io++;throw new Error('UNEXPECTED_AFTER597_FILE_IO');});
  t.mock.method(globalThis,'fetch',async()=>{io++;throw new Error('UNEXPECTED_AFTER597_NETWORK');});
  assert.throws(()=>normal.inverseAssistantAfter597Package(forbidden),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>normal.verifyAssistantAfter597Package(forbidden),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>normal.verifyAssistantAfter597NativeCommands(forbidden,forbidden),/ASSISTANT_AFTER597_UNISSUED/);
  await assert.rejects(normal.verifyAssistantAfter597NativeContext(forbidden,forbidden,forbidden),/ASSISTANT_AFTER597_UNISSUED/);
  await assert.rejects(normal.assistantAfter597NativeClaims(forbidden,forbidden),/ASSISTANT_AFTER597_UNISSUED/);
  await assert.rejects(normal.verifyAssistantAfter597SourceTarget(),/ASSISTANT_AFTER597_UNISSUED/);
  assert.equal(inputReads,0);assert.equal(io,0,'No files, options, receipt fields or network before legitimate binding/output');
  }
});

test('after597 actual source-package CLI checks issued source only or refuses NULL',async()=>{
  const {spawnSync}=await import('node:child_process');
  const {fileURLToPath}=await import('node:url');
  const script=fileURLToPath(new URL('./national584-source-evidence.mjs',import.meta.url));
  const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(key=>process.env[key]!==undefined)
    .map(key=>[key,process.env[key]]));
  const result=spawnSync(process.execPath,[script,'assistant-after597-source'],{
    cwd:fileURLToPath(new URL('..',import.meta.url)),env,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});
  assert.equal(result.error,undefined);
  if(AFTER601_ACTIVE||AFTER599_ACTIVE){
    assert.equal(result.status,1);assert.equal(result.stdout,'');
    assert.match(result.stderr,AFTER601_ACTIVE?/assistant-after601-successor/:/assistant-after599-successor/);
    assert.match(result.stderr,/assistant-mixed-after597-successor/);assert.doesNotMatch(result.stderr,/ENOENT|not a git repository/);
  }else if(AFTER598_ACTIVE){
    assert.equal(result.status,1);assert.equal(result.stdout,'');assert.match(result.stderr,/assistant-after598-successor/);
    assert.match(result.stderr,/assistant-mixed-after597-successor/);assert.doesNotMatch(result.stderr,/ENOENT|not a git repository/);
  }else if(AFTER597_ISSUED){
    assert.equal(result.status,0);assert.equal(result.stderr,'');
    const checked=JSON.parse(result.stdout);
    assert.equal(checked.kind,'ASSISTANT_AFTER597_SOURCE_TARGET');
    assert.equal(checked.release,JSON.parse(await fs.readFile('package.json','utf8')).version);
    assert.deepEqual([checked.sourceOnly,checked.sqlExecuted,checked.originalsAuthenticated,checked.productionProof],[true,false,false,false]);
  }else{
    assert.equal(result.status,1);assert.match(result.stderr,/ASSISTANT_AFTER597_UNISSUED/);
    assert.equal(result.stdout,'');
    assert.doesNotMatch(result.stderr,/ENOENT|GITHUB_EVENT_NAME|SOURCE_GATE_HEAD_SHA|not a git repository/);
  }
});



// Actual whole normal exports and imports only: no PostgreSQL, SQL transport,
// synthetic origin/native receipt, or replacement model/capability is supplied.
test('after597 real frozen597 native export links complete genuine companions and nested594 without PostgreSQL',async()=>{
  const {pathToFileURL}=await import('node:url'),path=await import('node:path'),crypto=await import('node:crypto');
  const {withFrozen597CheckpointPostgresSource,FROZEN597_NATIVE_SOURCE,FROZEN597_NATIVE_READSET}=
    await import('./run-frozen586-assistant-later-h0-postgres-source.mjs');
  const {SCALAR597_LATER_H0_BEFORE}=await import('./lib/assistant-later-h0-successor-source.mjs');
  let callbacks=0,outerRoot,nestedRoot;
  if(!AFTER597_ISSUED){
    await assert.rejects(()=>withFrozen597CheckpointPostgresSource(()=>{callbacks++;}),/ASSISTANT_AFTER597_UNISSUED/);
    assert.equal(callbacks,0);return;
  }
  const {execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{fileURLToPath}=await import('node:url');
  const execute=promisify(execFile),repo=fileURLToPath(new URL('..',import.meta.url));
  const git=async args=>(await execute('git',['-c','protocol.allow=never','-C',repo,...args],{
    timeout:30000,maxBuffer:2*1024*1024,encoding:null,
    env:{...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
      .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
      GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}})).stdout;
  const parse=raw=>new Map(raw.toString('utf8').split('\0').filter(Boolean).map(line=>{
    const m=/^(\d{6}) (blob|commit) ([a-f0-9]{40})\t([\s\S]+)$/.exec(line);assert(m);
    return[m[4],{mode:m[1],type:m[2],blob:m[3]}];}));
  const genuineCode=parse(await git(['ls-tree','-rz','--full-tree',FROZEN597_NATIVE_SOURCE.codeHead]));
  const genuineNative=parse(await git(['ls-tree','-z',FROZEN597_NATIVE_SOURCE.nativeHead,'--','scripts/lib/assistant-later-h0-postgres.mjs']));
  assert.equal(FROZEN597_NATIVE_READSET.length,229);assert(Object.isFrozen(FROZEN597_NATIVE_READSET));
  assert(FROZEN597_NATIVE_READSET.every(Object.isFrozen));
  assert.equal(crypto.createHash('sha256').update(JSON.stringify(FROZEN597_NATIVE_READSET)).digest('hex'),'9988a3392e70bc26d83aa7615451f2185d7b4a33835f6b7030acb9e1a4622cf4');
  const sqlNames=[...genuineCode.keys()].filter(file=>file.startsWith('supabase/migrations/')).sort();
  assert.equal(sqlNames.length,73);assert(sqlNames.every(file=>file.endsWith('.sql')));
  let preflightReadbackMs=0,readbackBytes=0;const fixtureStarted=performance.now();
  await withFrozen597CheckpointPostgresSource(async source=>{
    callbacks++;outerRoot=source.repositoryRoot;
    assert.equal(source.nativeSourceHead,FROZEN597_NATIVE_SOURCE.nativeHead);
    assert.equal(source.factory.sourceHead,FROZEN597_NATIVE_SOURCE.codeHead);
    assert.equal(source.factory.sourceTree,FROZEN597_NATIVE_SOURCE.codeTree);
    const readbackStarted=performance.now(),physical=[];
    const walk=async(dir,prefix='')=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){
      assert(!entry.isSymbolicLink());const file=prefix+entry.name;
      if(entry.isDirectory())await walk(path.join(dir,entry.name),file+'/');else{assert(entry.isFile());physical.push(file);}}};
    await walk(outerRoot);assert.deepEqual(physical.sort(),['.git',...FROZEN597_NATIVE_READSET.map(row=>row.file)].sort());
    const bridge=await fs.lstat(path.join(outerRoot,'.git'),{bigint:true});assert(bridge.isFile()&&!bridge.isSymbolicLink()&&bridge.nlink===1n);
    let nativeLeaves=0;
    for(const row of FROZEN597_NATIVE_READSET){
      const isAdapter=row.file==='scripts/lib/assistant-later-h0-postgres.mjs';
      assert.equal(row.sourceHead,isAdapter?FROZEN597_NATIVE_SOURCE.nativeHead:FROZEN597_NATIVE_SOURCE.codeHead);
      if(isAdapter)nativeLeaves++;
      const committed=(isAdapter?genuineNative:genuineCode).get(row.file);
      assert.deepEqual(committed,{mode:'100644',type:'blob',blob:row.blob});
      const stat=await fs.lstat(path.join(outerRoot,row.file),{bigint:true});
      assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n);assert.equal(stat.size,BigInt(row.bytes));
      assert.equal(stat.mode&0o111n,0n);assert(row.bytes<=2*1024*1024);
      const bytes=await fs.readFile(path.join(outerRoot,row.file));readbackBytes+=bytes.length;
      assert.equal(bytes.length,row.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);
      assert.equal(crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),committed.blob);
    }
    assert.equal(nativeLeaves,1);assert.equal(readbackBytes,12669245);
    assert.deepEqual((await fs.readdir(path.join(outerRoot,'supabase/migrations'))).map(name=>'supabase/migrations/'+name).sort(),sqlNames);
    preflightReadbackMs=performance.now()-readbackStarted;
    for(const row of [
      {file:'scripts/run-frozen586-assistant-later-h0-postgres-source.mjs',bytes:16249,sha256:'0459a227114aaeaa830cd95afe3c5f2e06baa1b968eabfdd354ef52b3c794d63'},
      {file:'scripts/check-installed593-code-predecessor-source.mjs',bytes:6929,sha256:'b53be91b486ff6fd5a1d0048f85e75ac2777ebf11756c6a2dc30be436361142b'},
    ]){
      const bytes=await fs.readFile(path.join(outerRoot,row.file));
      assert.equal(bytes.length,row.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);
    }
    // This is the exact real module missing in native16, loaded as a whole ESM.
    const native=await import(pathToFileURL(path.join(outerRoot,'scripts/run-frozen586-assistant-later-h0-postgres-source.mjs')).href);
    assert.equal(typeof native.withFrozen594CheckpointPostgresSource,'function');
    await native.withFrozen594CheckpointPostgresSource(async original=>{
      callbacks++;nestedRoot=original.repositoryRoot;assert.notEqual(nestedRoot,outerRoot);
      assert.equal(original.factory.ravScoreModelBinding().modelBundleSha256,SCALAR597_LATER_H0_BEFORE.I);
      assert.equal(original.factory.candidateGRollbackModelBinding().modelBundleSha256,SCALAR597_LATER_H0_BEFORE.C);
      assert.equal(original.factory.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,SCALAR597_LATER_H0_BEFORE.T);
    });
    await assert.rejects(fs.lstat(nestedRoot),{code:'ENOENT'});
  });
  assert.equal(callbacks,2);await assert.rejects(fs.lstat(outerRoot),{code:'ENOENT'});
  console.log(JSON.stringify({kind:'GENUINE_FROZEN597_COMPLETE_SOURCE_HOST_PRE_PG',staticFiles:229,SQLFiles:73,readbackBytes,
    preflightReadbackMs,fixtureElapsedMs:performance.now()-fixtureStarted,wholeWrapperAndNested594Factory:true,ownedRootsRemoved:true,
    SQLExecuted:false,all69ModulesImported:false,SourceCapabilityCreated:false}));
});

test('after597 native fixture lifecycle starts after genuine97 CAS reset and preserves whole rows',async t=>{
  const {prepareAssistantAfter597NativeFixtureWindow:prepare}=await import('./lib/assistant-later-h0-postgres.mjs');
  if(!AFTER597_ISSUED){
    const poison=new Proxy({},{get(){throw Error('UNEXPECTED_UNISSUED_OPTION_READ');}});
    await assert.rejects(prepare(poison),/ASSISTANT_AFTER597_UNISSUED/);
    t.diagnostic('NULL output refusal only; issued fixture lifecycle was not executed.');return;
  }
  // Exercise the actual exported adapter through strict synthetic SQL transport.
  // This is fixture-protocol evidence, not PostgreSQL/RPC or SOURCE authority.
  const source=await import('./lib/assistant-later-h0-successor-source.mjs');
  const {ravScoreModelBinding}=await import('../js/core/ravscore-model-contract.js');
  const {createHash}=await import('node:crypto');
  const {currentMemoryWarmupPreservationInventorySql:inventorySql}=await import('./lib/current-memory-warmup-postgres.mjs');
  const before=source.ASSISTANT_AFTER597_BEFORE,next=source.requireAssistantAfter597Binding();
  const oldBinding={...ravScoreModelBinding(),modelBundleSha256:before.I};
  const oldProfile={sourceVersion:'4.0.597',modelBundleSha256:before.I,syntheticUnknownField:{whole:'retained'}};
  const trigger=source.assistantLaterH0Definition((await source.readScalar597LaterH0CanonicalSource()).canonicalSource,'version_admin_document');
  assert.match(trigger,/if tg_op='UPDATE' and old\.document_key not in/);
  assert(trigger.includes("'ravscore-operational-model-activation'"));
  assert(!trigger.includes("'ravscore-profile-selection'"));
  const opKey='ravscore-operational-model-activation',profileKey='ravscore-profile-selection';
  const preservedSql=inventorySql('preserved'),bankSql=inventorySql('original-bank');
  const fixture=(fault=null)=>{
    // Genuine97's CAS reset has removed both activation keys. Other complete
    // checkpoint/admin rows and old history remain and must not be replaced.
    let documents=new Map([['ravscore-continuation-checkpoint',{document_key:'ravscore-continuation-checkpoint',
      payload:{syntheticCheckpoint:'whole'},version:7,extraColumn:{unknown:17}}],
      ['synthetic-unrelated',{document_key:'synthetic-unrelated',payload:{unknown:[1,2,3]},version:9,extraColumn:'retained'}]]);
    let history=[{document_key:'synthetic-unrelated',payload:{unknown:16},version:8,extraColumn:'retained'}];
    if(fault==='existing-operation'||fault==='existing-profile'){
      const key=fault==='existing-operation'?opKey:profileKey;
      documents.set(key,{document_key:key,payload:{unknownExisting:true},version:11,unknownColumn:'retained'});
    }
    const initialDocuments=structuredClone(documents),initialHistory=structuredClone(history);
    const original594=source.SCALAR597_LATER_H0_BEFORE;
    const bank=Buffer.from(JSON.stringify({modelBinding:{modelBundleSha256:original594.I},
      candidateGRollbackCompanion:{modelBinding:{modelBundleSha256:original594.C}},
      continuationStateContractSha256:fault==='wrong-bank'?'e'.repeat(64):original594.T}));
    const nativeError=new Error('NATIVE_POSTGRES_SQL_COMMAND_FAILED');
    let inserts=0,updates=0,setupTransactions=0,rollbackTransactions=0,inventoryReads=0,queries=0,quotaCalls=0;
    const selected=()=>[...documents].filter(([key])=>[opKey,profileKey].includes(key))
      .sort(([a],[b])=>a<b?-1:a>b?1:0).map(([,row])=>row);
    const fingerprint=()=>JSON.stringify({documents:[...documents].sort(([a],[b])=>a<b?-1:a>b?1:0),history,
      originalBank:{unknownWholeRow:'retained'},account:{unknownWholeRow:'retained'},catalog:{unknownProperty:'retained'}});
    const unrelatedFingerprint=()=>{
      const groups=new Map();let count=0,totalBytes=0;
      for(const[key,row]of documents){
        if([opKey,profileKey].includes(key))continue;
        const bytes=Buffer.from(JSON.stringify(row)),hash=createHash('sha256').update(bytes).digest('hex');
        const groupKey=hash+':'+bytes.length,group=groups.get(groupKey)??{hash,bytes:bytes.length,count:0};
        group.count++;groups.set(groupKey,group);count++;totalBytes+=bytes.length;
      }
      return [JSON.stringify(['checkpoint',0,'',0,count,totalBytes]),...[...groups.values()]
        .sort((a,b)=>a.hash<b.hash?-1:a.hash>b.hash?1:a.bytes-b.bytes)
        .map(row=>JSON.stringify(['checkpoint',1,row.hash,row.bytes,row.count,0]))].join('\n');
    };
    const allowed=bundle=>documents.get(opKey)?.payload.status==='INTEGRATED_ACTIVE'
      &&documents.get(opKey)?.payload.activeModelBinding.modelBundleSha256===bundle
      &&documents.get(profileKey)?.payload.modelBundleSha256===bundle;
    const apply=(query,insert)=>{
      const pattern=insert
        ?/insert into admin_documents\(document_key,payload\) values\('([^']+)',\$after597_trip\$([\s\S]*?)\$after597_trip\$::jsonb\);/g
        :/update admin_documents set payload=\$after597_trip\$([\s\S]*?)\$after597_trip\$::jsonb where document_key='([^']+)';/g;
      let count=0;
      for(const row of query.matchAll(pattern)){
        count++;const key=insert?row[1]:row[2],payload=JSON.parse(insert?row[2]:row[1]);
        assert([opKey,profileKey].includes(key),'Only the two fixed fixture keys may be written');
        const old=documents.get(key);
        if(insert){
          inserts++;assert.equal(old,undefined,'INSERT cannot overwrite an existing document');
          if(fault==='missing-insert'&&key===profileKey)continue;
          documents.set(key,{document_key:key,payload,version:1});
          if(fault==='setup-payload'&&key===profileKey)documents.get(key).payload.unknownDrift=true;
        }else{
          updates++;assert(old);
          if(JSON.stringify(old.payload)===JSON.stringify(payload))continue;
          if(key!==opKey)history.push({document_key:key,payload:structuredClone(old.payload),version:old.version});
          documents.set(key,{...old,payload,version:old.version+1});
        }
      }
      assert.equal(count,insert?2:query.includes('"status":"INTEGRATED_PENDING"')?1:2);
      return count;
    };
    const psql=async query=>{
      queries++;
      if(query===preservedSql){inventoryReads++;return fingerprint();}
      if(query===bankSql)return '{"wholeOriginalBank":"retained"}';
      if(query.startsWith('with row_fingerprints as materialized (\n')){
        assert(query.includes("where t.document_key not in ('"+opKey+"','"+profileKey+"')"));
        assert(query.includes("convert_to(to_jsonb(t)::text,'UTF8')"));
        assert(query.includes("octet_length(row_bytes)::bigint"));assert(query.includes("extensions.digest(row_bytes,'sha256')"));
        assert(query.includes('count(f.row_sha256)'));assert(query.includes('coalesce(sum(f.row_bytes),0)'));
        assert(query.includes('group by table_name,row_sha256,row_bytes'));assert(!query.includes('jsonb_agg'));
        return unrelatedFingerprint();
      }
      if(query.startsWith("with rows as (select 'activity'"))return '{"wholeAccountRows":"retained"}';
      if(query.startsWith('select to_regprocedure(')&&query.endsWith(' is not null;'))return 't';
      if(query.startsWith('select jsonb_object_agg(p.oid::regprocedure::text,'))return '{"wholeCatalog":"retained"}';
      if(query.startsWith('select coalesce(jsonb_agg(to_jsonb(d) order by document_key)'))return JSON.stringify(selected());
      if(query.startsWith('select coalesce(jsonb_agg(to_jsonb(v)'))return JSON.stringify(history);
      if(query==="select octet_length(convert_to(payload::text,'UTF8')) from native_checkpoint_payloads where name='scalar597-original594-same';")return String(bank.length);
      if(query==="select encode(substring(convert_to(payload::text,'UTF8') from 1 for 262144),'base64') from native_checkpoint_payloads where name='scalar597-original594-same';")return bank.toString('base64');
      if(query.includes("select public.consume_public_request_limit('ravradar-assistant:minute','native-assistant-after597-fixture',6,60);")){
        quotaCalls++;return 't';
      }
      if(query.startsWith("set request.jwt.claim.role='service_role';set role service_role;select public.ravradar_trip_v3_active_binding_admitted(")){
        const bundle=query.includes("'"+before.I+"'")?before.I:next.I;assert(query.includes("'"+bundle+"'"));return allowed(bundle)?'t':'f';
      }
      if(query.startsWith('begin;')&&query.endsWith('commit;')){
        setupTransactions++;assert(!query.includes('on conflict'));assert(!query.includes('update admin_documents'));
        apply(query,true);
        if(fault==='setup-history')history.push({document_key:'unknown-history-append',payload:{all:'retained'},version:1});
        if(fault==='setup-unrelated-change')documents.get('synthetic-unrelated').payload.unknown.push('drift');
        if(fault==='setup-unrelated-add')documents.set('synthetic-added',{document_key:'synthetic-added',payload:{unknown:'drift'},version:1});
        if(fault==='setup-unrelated-delete')documents.delete('synthetic-unrelated');
        return '';
      }
      if(query.startsWith('begin;')&&query.endsWith('rollback;')){
        rollbackTransactions++;assert(query.includes("set local request.jwt.claim.role='service_role';set local role service_role;"));
        if(fault==='command')throw nativeError;
        const oldDocuments=structuredClone(documents),oldHistory=structuredClone(history);
        apply(query,false);const observed={oldAllowed:allowed(before.I),nextAllowed:allowed(next.I)};
        documents=oldDocuments;history=oldHistory;
        if(fault==='rollback-document')documents.get(opKey).payload.unknownDrift=true;
        if(fault==='rollback-history')history.push({document_key:'unknown-history-append',payload:{all:'retained'},version:1});
        return JSON.stringify(observed);
      }
      throw Error('Unexpected SQL in the strict after597 synthetic fixture transport');
    };
    return {psql,initialDocuments,initialHistory,nativeError,fingerprint,get documents(){return documents;},get history(){return history;},
      get inserts(){return inserts;},get updates(){return updates;},get setupTransactions(){return setupTransactions;},
      get rollbackTransactions(){return rollbackTransactions;},get inventoryReads(){return inventoryReads;},get queries(){return queries;},get quotaCalls(){return quotaCalls;}};
  };
  const options=db=>({psql:db.psql,oldBinding,newBundle:next.I,oldProfile});
  await t.test('completed97 absent keys become exactly two597 fixtures before the whole baseline',async()=>{
    const db=fixture(),window=await prepare(options(db));
    assert.equal(db.inserts,2);assert.equal(db.updates,0);assert.equal(db.setupTransactions,1);assert.equal(db.inventoryReads,1);
    assert.equal(db.documents.size,db.initialDocuments.size+2);assert.deepEqual(db.documents.get(profileKey).payload,oldProfile);
    assert.deepEqual(db.documents.get(opKey).payload.activeModelBinding,oldBinding);
    for(const[key,row]of db.initialDocuments)assert.deepEqual(db.documents.get(key),row);
    assert.deepEqual(db.history,db.initialHistory);assert.equal(window.preserved,db.fingerprint());
    assert.equal(window.preservedSql,preservedSql);
    const report=await window.checkIntermediate();
    assert.equal(report.old597ActiveAfterSql,true);assert.equal(report.nextRefusedBeforeActivation,true);
    assert.equal(report.pendingBothRefused,true);assert.equal(report.nextActiveAfterCompletion,true);assert.equal(report.old597RefusedAfterCompletion,true);
    assert.equal(report.wholeHistoryAndDocumentsPreserved,true);assert.equal(report.quotaFunctionAndAdmissionUnchanged,true);assert.equal(report.quotaServiceRoleWorking,true);
    assert.equal(db.rollbackTransactions,2);assert.equal(db.quotaCalls,2);assert.equal(window.preserved,db.fingerprint());
  });
  for(const fault of ['existing-operation','existing-profile','wrong-bank'])await t.test(fault+' refuses before fixture writes',async()=>{
    const db=fixture(fault);await assert.rejects(prepare(options(db)),{code:'ERR_ASSERTION'});
    assert.equal(db.inserts,0);assert.equal(db.updates,0);assert.equal(db.setupTransactions,0);assert.equal(db.inventoryReads,0);
    assert.deepEqual(db.documents,db.initialDocuments);assert.deepEqual(db.history,db.initialHistory);
  });
  for(const field of ['oldBinding','newBundle','oldProfile'])await t.test('unknown '+field+' is refused without writes',async()=>{
    const db=fixture(),input=options(db);
    if(field==='oldBinding')input.oldBinding={...oldBinding,modelBundleSha256:'f'.repeat(64)};
    if(field==='newBundle')input.newBundle='f'.repeat(64);
    if(field==='oldProfile')input.oldProfile={...oldProfile,sourceVersion:'4.0.594'};
    await assert.rejects(prepare(input),{code:'ERR_ASSERTION'});assert.equal(db.inserts,0);assert.equal(db.updates,0);assert.equal(db.inventoryReads,0);
    assert.deepEqual(db.documents,db.initialDocuments);assert.deepEqual(db.history,db.initialHistory);
  });
  for(const fault of ['missing-insert','setup-payload','setup-history'])await t.test(fault+' cannot establish a partial or changed baseline',async()=>{
    const db=fixture(fault);await assert.rejects(prepare(options(db)),{code:'ERR_ASSERTION'});assert.equal(db.inventoryReads,0);
  });
  for(const fault of ['setup-unrelated-change','setup-unrelated-add','setup-unrelated-delete'])await t.test(fault+' is refused before the unfiltered baseline',async()=>{
    const db=fixture(fault);await assert.rejects(prepare(options(db)),{code:'ERR_ASSERTION'});assert.equal(db.inventoryReads,0);
  });
  for(const fault of ['rollback-document','rollback-history'])await t.test(fault+' is refused without filtering',async()=>{
    const db=fixture(fault),window=await prepare(options(db));await assert.rejects(window.checkIntermediate(),{code:'ERR_ASSERTION'});
  });
  await t.test('first psql error is preserved without retry or alternate fixture',async()=>{
    const db=fixture('command'),window=await prepare(options(db));
    await assert.rejects(window.checkIntermediate(),error=>error===db.nativeError);
    assert.equal(db.rollbackTransactions,1);assert.equal(db.inserts,2);assert.equal(window.preserved,db.fingerprint());
  });
  t.diagnostic('Strict synthetic transport only; whole normal helper, no PostgreSQL/SQL execution, native receipt, model issue or SOURCE capability.');
});

if(AFTER598_ACTIVE){
  test('after598 current normal command owners execute all five explicit modes and reject missing/default/duplicate commands',async()=>{
    const normal=await import('./national584-source-evidence.mjs'),source=await import('./lib/assistant-later-h0-successor-source.mjs');
    const native=await import('./native-postgres-evidence.mjs');
    const pkg=JSON.parse(await fs.readFile('package.json','utf8'));normal.verifyAssistantAfter598Package(pkg);
    assert.equal(normal.ASSISTANT_AFTER598_CURRENT_SOURCE_COMMANDS.length,5);
    for(const command of normal.ASSISTANT_AFTER598_CURRENT_SOURCE_COMMANDS){
      assert.equal(pkg.scripts['test:assistant-later-h0-source'].split(command).length,2);
      for(const changed of [pkg.scripts['test:assistant-later-h0-source'].replace(command+' && ',''),pkg.scripts['test:assistant-later-h0-source'].replace(command,command.replace(' --after598-current','')),pkg.scripts['test:assistant-later-h0-source']+' && '+command]){
        const bad=copy(pkg);bad.scripts['test:assistant-later-h0-source']=changed;assert.throws(()=>normal.verifyAssistantAfter598Package(bad));
      }
    }
    assert.deepEqual(native.ASSISTANT_AFTER598_COMMANDS,['node scripts/test-protected-ravscore-continuation-checkpoint.mjs --assistant-after598-successor']);
    normal.verifyAssistantAfter598NativeCommands(native.ASSISTANT_AFTER598_COMMANDS,source.requireAssistantAfter598Release());
    assert.throws(()=>normal.verifyAssistantAfter598NativeCommands(native.ASSISTANT_AFTER597_COMMANDS,source.requireAssistantAfter598Release()));
    const {RELEASE_GATE_TEST_FILES,releaseGateTestArguments}=await import('./lib/release-gate-test-plan.mjs');
    for(const command of normal.ASSISTANT_AFTER598_CURRENT_SOURCE_COMMANDS){const file=command.split(' ')[1];assert.equal(RELEASE_GATE_TEST_FILES.filter(f=>f===file).length,1);assert.deepEqual(releaseGateTestArguments(file),[file,'--after598-current']);}
    assert.deepEqual(releaseGateTestArguments('scripts/test-protected-ravscore-continuation-checkpoint.mjs'),['scripts/test-protected-ravscore-continuation-checkpoint.mjs']);
    const checked=await normal.verifyAssistantAfter598SourceTarget();assert.equal(checked.release,source.requireAssistantAfter598Release());assert.equal(checked.sqlExecuted,false);
    const {spawnSync}=await import('node:child_process');
    const result=spawnSync(process.execPath,['scripts/national584-source-evidence.mjs','assistant-after598-source'],{encoding:'utf8',timeout:30000,maxBuffer:32768,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot}});
    assert.equal(result.error,undefined);assert.equal(result.status,0);assert.equal(JSON.parse(result.stdout).release,source.requireAssistantAfter598Release());
  });
  test('after598 current synthetic report contract rejects old receipt, false truths and old native command',async t=>{
    const native=await import('./native-postgres-evidence.mjs'),source=await import('./lib/assistant-later-h0-successor-source.mjs');
    const runtime=v2Runtime(),binding=source.requireAssistantAfter598Binding(),output=source.requireAssistantAfter598Output();
    const canonical=await source.readAssistantAfter598CanonicalSource();
    const contract=source.assistantLaterH0Definition(canonical.canonicalSource,'ravradar_ravscore_checkpoint_contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    const observed={kind:'ASSISTANT_AFTER598_SUCCESSOR',sourceMigrationInventory:64,databaseBeforeVersion:source.ASSISTANT_AFTER598_BEFORE.version,
      originalStateRelease:598,migrationVersion:binding.version,partCount:673,checkpointOidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,productionSeedAuthenticated:false,
      parentCodeHead:'82200280c42b9060f14be2721ba7b766e0ede5a6',predecessorSetupMigrationCount:9};
    for(const key of ['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved','allOriginalDefinitionsPreserved','exactCheckpointContract','exactTripContract','schema2Catalog',
      'normalProtectedJsonbRoundtrip','originalDigestsPreserved','trueOld598Fixtures','currentNormalFixtures','old598ModelNotRetagged','wholeMetadataInverse','strictlyLater598ToNextOnly','sqlIsNotOriginAuthentication','predecessorExecutedInSameHost'])observed[key]=true;
    observed.intermediateRuntime=Object.fromEntries(['old598ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused','nextActiveAfterCompletion','old598RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved','quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'].map(key=>[key,true]));
    const report={kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,normalModelPartCount:673,
      postgresMajorVersion:16,nativeProgramIdentity:runtime.selectedPrograms,assistantAfter598Successor:observed};
    const projected=await native.assistantAfter598NativeReportProjection(report,{selectedPrograms:runtime.selectedPrograms});assert.deepEqual(projected,report);
    for(const mutate of [r=>r.assistantAfter598Successor.wholeMetadataInverse=false,r=>r.assistantAfter598Successor.originalStateRelease=597,r=>r.assistantAfter597Successor={},r=>r.assistantAfter598Successor.predecessorSetupMigrationCount=8]){
      const bad=copy(report);mutate(bad);await assert.rejects(native.assistantAfter598NativeReportProjection(bad,{selectedPrograms:runtime.selectedPrograms}));
    }
    const old={...installed594Receipt(),runtime,report:scalar597Report('20261104004400','20261029233000')};
    await assert.rejects(native.verifyAssistantAfter598PhaseReceipt(old,old.current));
    assert.equal(output,source.requireAssistantAfter598Output()); // DATA format checks are not native execution.
    await t.test('current76-row OFF evidence survives RAW projection and is mandatory before normal record',async()=>{
      const sql=await fs.readFile('supabase/migrations/20261116181500_account_erasure_outbox_off.sql');
      const schema=await import('./verify-account-erasure-schema.mjs');
      const checkReference=schema.accountErasureCheckReference({format:'PG_CONSTRAINTDEF_V1',postgresMajor:16,
        definitions:Array.from({length:28},(_,i)=>['account_erasure_operations_check'+String(i).padStart(2,'0'),'CHECK (SYNTHETIC)'])});
      const app={kind:'ACCOUNT_ERASURE_APP_NATIVE_SQL_CASES',sqlExecuted:true,
        migrationVersion:'20261116181500',migrationSQLSha256:cryptoHash('sha256').update(sql).digest('hex'),sourceSqlFileCount:76,
        passed:true,cases:49,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,checkReference,checkExpressionDriftRefused:true,
        serviceEvidenceSynthetic:true,failedTransactionRolledBack:true,aclMutationRefused:true,ownerPendingDiscoveryAndPagination:true,
        authAttemptReplayAndGeneration:true,initialAbsenceWithoutDeleteClaim:true,authUuidFenceSqlOnly:true,storageDefaultDenyAndOwnership:true,postPgStorageClaimHeld:true,
        observationsAndBootstrapFence:true,readCommittedFreshness:true,repeatableReadNoLateCommit:true,serializableNoLateCommit:true,
        actorNonKeyPrivilegeLock:true,authDeletion:false,d1Ack:false,completionAuthority:false};
      // The original historical599/75 projection above remains valid, but never becomes current OFF proof.
      await assert.rejects(native.assertCurrentAccountErasureNativeReport(report));
      const raw={...copy(report),accountErasure:app};
      const typed=await native.assistantAfter598NativeReportProjection(raw,{selectedPrograms:runtime.selectedPrograms});
      assert.deepEqual(typed.accountErasure,app);
      assert.deepEqual(await native.assertCurrentAccountErasureNativeReport(typed),app);
      const chunks=native.assistantAfter598NativeReportCollector({selectedPrograms:runtime.selectedPrograms});
      chunks.write(JSON.stringify(raw)+'\n');
      assert.deepEqual((await chunks.finish()).accountErasure,app);
      const controller=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
      const record=controller.slice(controller.indexOf('async function record(receipt) {'));
      assert(record.indexOf('await assertCurrentAccountErasureNativeReport(receipt.report);')>=0);
      assert(record.indexOf('await assertCurrentAccountErasureNativeReport(receipt.report);')
        <record.indexOf('proof.nativePostgres=receipt;'));
      for(const key of Object.keys(app)){
        const bad=copy(raw);delete bad.accountErasure[key];
        await assert.rejects(native.assertCurrentAccountErasureNativeReport(bad));
        await assert.rejects(native.assistantAfter598NativeReportProjection(bad,{selectedPrograms:runtime.selectedPrograms}));
      }
      await assert.rejects(native.assertCurrentAccountErasureNativeReport(report,{ignore:true}));
      for(const mutate of [r=>delete r.accountErasure,r=>r.accountErasure=undefined,
        r=>r.accountErasure.sourceSqlFileCount=75,r=>r.accountErasure.migrationSQLSha256='0'.repeat(64),
        r=>r.accountErasure.migrationVersion='20261115060000',r=>r.accountErasure.cases=47,
        r=>r.accountErasure.checkReference.postgresMajor=17,r=>r.accountErasure.checkExpressionDriftRefused=false,
        r=>r.accountErasure.realGoTrue=true,r=>r.accountErasure.completionAuthority=true,
        r=>r.accountErasure.failedTransactionRolledBack=false,r=>r.accountErasure.extra=true]){
        const bad=copy(raw);mutate(bad);await assert.rejects(native.assertCurrentAccountErasureNativeReport(bad));
        if(Object.hasOwn(bad,'accountErasure'))
          await assert.rejects(native.assistantAfter598NativeReportProjection(bad,{selectedPrograms:runtime.selectedPrograms}));
      }
    });

  });
}


test('native and national CLI boundaries discard only the earlier SDK hint while imports and runtime guards stay strict',async()=>{
  const path=await import('node:path'),{fileURLToPath,pathToFileURL}=await import('node:url');
  const {execFile}=await import('node:child_process'),{promisify}=await import('node:util');
  const {verifyRuntime:verifyNationalRuntime}=await import('./national584-source-evidence.mjs');
  const files=['native-postgres-evidence.mjs','national584-source-evidence.mjs'];
  const inherited={RAVRADAR_SOURCE_NODE24:'/synthetic/sdk/node',RAVRADAR_SOURCE_NODE24_OTHER:'keep',
    RAVRADAR_PRIVATE_RUNTIME_ROOT:'synthetic-private-root',PGHOST:'synthetic-pg-host',
    NODE_OPTIONS:'synthetic-loader-option',PYTHONPATH:'synthetic-python-path',
    GIT_OBJECT_DIRECTORY:'synthetic-object-directory',GITHUB_TOKEN:'synthetic-token'};
  const retained={...inherited};delete retained.RAVRADAR_SOURCE_NODE24;
  for(const file of files){
    const filename=fileURLToPath(new URL(file,import.meta.url)),source=await fs.readFile(filename,'utf8');
    const start=source.lastIndexOf('\nif(process.argv[1]');assert(start>0);
    const entry=source.slice(start); // Execute the actual final caller boundary, with no product main/SQL.
    for(const direct of [false,true]){
      const argv1=direct?filename:path.resolve(path.dirname(filename),'synthetic-importing-parent.mjs');
      const fixture='import path from "node:path";\n'
        +'export const process='+JSON.stringify({argv:['node',argv1],env:inherited})+';\n'
        +'const fileURLToPath=()=>'+JSON.stringify(filename)+';\n'
        +'export let calls=0,observed=null;async function main(){calls++;observed={...process.env};}\n'
        +entry;
      const observed=await import('data:text/javascript;base64,'+Buffer.from(fixture).toString('base64'));
      assert.equal(observed.calls,direct?1:0,file+' direct='+direct);
      assert.deepEqual(observed.process.env,direct?retained:inherited);
      assert.deepEqual(observed.observed,direct?retained:null,'The hint is discarded before main, with every other key retained');
    }
  }
  // A fresh real import must not clean the importing process's environment.
  const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  env.RAVRADAR_SOURCE_NODE24=inherited.RAVRADAR_SOURCE_NODE24;
  env.RAVRADAR_PRIVATE_RUNTIME_ROOT=inherited.RAVRADAR_PRIVATE_RUNTIME_ROOT;
  const code='import assert from "node:assert/strict";'
    +files.map(file=>'await import('+JSON.stringify(pathToFileURL(fileURLToPath(new URL(file,import.meta.url))).href)+');'
      +'assert.equal(process.env.RAVRADAR_SOURCE_NODE24,'+JSON.stringify(env.RAVRADAR_SOURCE_NODE24)+');'
      +'assert.equal(process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT,'+JSON.stringify(env.RAVRADAR_PRIVATE_RUNTIME_ROOT)+');').join('')
    +'console.log("SDK_HINT_IMPORT_PRESERVATION_PASS");';
  const result=await promisify(execFile)(process.execPath,['--input-type=module','-e',code],
    {env,timeout:15000,maxBuffer:16384,windowsHide:true});
  assert.equal(result.stderr,'');assert.equal(result.stdout.trim(),'SDK_HINT_IMPORT_PRESERVATION_PASS');
  const current={...v2Runtime(),node:'v22.23.3'};
  assert.doesNotThrow(()=>verifyAssistantPublic591Runtime(current));
  assert.doesNotThrow(()=>verifyNationalRuntime(current,current));
  for(const key of Object.keys(inherited).filter(key=>key!=='GITHUB_TOKEN')){
    const changed={...current,overrides:[key]};
    assert.throws(()=>verifyAssistantPublic591Runtime(changed),key+' remains a forbidden PG override');
    assert.throws(()=>verifyNationalRuntime(changed,changed),key+' remains a forbidden national override');
  }
  const wrongNode={...current,node:'v24.22.1'};
  assert.throws(()=>verifyAssistantPublic591Runtime(wrongNode));
  assert.throws(()=>verifyNationalRuntime(wrongNode,wrongNode));
});

// Synthetic transport lifecycle only: this calls the real adapter but aborts
// before bootstrap SQL. It produces no PostgreSQL, Auth or 49-case acceptance.
test('native app fixture database ownership survives Auth timestamp shadowing without executing SQL',async()=>{
  const {exerciseAccountErasureOutbox}=await import('./lib/account-erasure-outbox-native-fixture.mjs');
  const {fileURLToPath}=await import('node:url');
  const database='rr_account_erasure_native_fixture',repositoryRoot=fileURLToPath(new URL('../',import.meta.url));
  for(const stop of ['CREATE','BOOTSTRAP']){
    const first=new Error('SYNTHETIC_NATIVE_DATABASE_LIFETIME_STOP'),calls=[];
    const psql=async statement=>{
      if(statement==="select current_setting('listen_addresses');"){calls.push('LISTEN');return '';}
      if(statement==='select current_user;'){calls.push('OWNER');return 'rr_native_test';}
      if(statement==='create database '+database+';'){
        calls.push('CREATE');if(stop==='CREATE')throw first;return '';
      }
      assert(statement.startsWith("\\connect "+database+"\ncreate schema auth;"),'Actual normal bootstrap frame only');
      calls.push('BOOTSTRAP');throw first;
    };
    const runSql=async(statement,timeout)=>{
      assert.equal(statement,'drop database '+database+';');assert.equal(timeout,15000);
      calls.push('DROP');return{code:0};
    };
    await assert.rejects(exerciseAccountErasureOutbox({psql,runSql,repositoryRoot}),error=>error===first,
      'The first transport failure must survive while the confirmed owned database is cleaned');
    assert.deepEqual(calls,['LISTEN','OWNER','CREATE',...(stop==='BOOTSTRAP'?['BOOTSTRAP','DROP']:[])]);
  }
});



// Current80 DATA for protocol tests only. The original79 DATA below is kept;
// only an actual owned PG run can supply this facet in a real source receipt.
async function currentNativeReceiptProtocolData(root=new URL('../',import.meta.url)){
 const files=(await fs.readdir(new URL('supabase/migrations/',root))).filter(file=>file.endsWith('.sql'));
 if(!files.includes('20261122200000_account_native_activity_receipt_off.sql'))return null;
 const {currentNativeActivityReceiptSourceContext}=await import(new URL('scripts/lib/account-native-activity-receipt-source.mjs',root).href);
 const identity=currentNativeActivityReceiptSourceContext();
 return {kind:'ACCOUNT_NATIVE_ACTIVITY_RECEIPT_NATIVE_SQL_CASES',sqlExecuted:true,...identity,
  cases:9,appendSha256:identity.migrationSQLSha256,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,realAuthResponse:false,
  exclusiveHookOnly:true,browserRpcCannotWitness:true,outerTransactionRollback:true,oneReceipt:true,
  policyActivated:false,notices:false,deletion:false,userDataReported:false};
}

// Synthetic typed DATA for the separately required current79 OFF phase; never
// a replay/retag of the old77 PostgreSQL execution or a new SQL execution claim.
async function currentInactivityOffProtocolData(postgresMajor){
 const schema=await import('./verify-account-erasure-schema.mjs'),{createHash}=await import('node:crypto');
 const source=schema.readAccountInactivitySource(),counts={account_inactivity_policy:4,account_lifecycle_activity:2,account_inactivity_notices:11};
 const definitions=Object.entries(counts).flatMap(([name,count])=>Array.from({length:count},(_,i)=>[name+'.'+name+'_check'+String(i).padStart(2,'0'),'CHECK (SYNTHETIC_CURRENT79)'])).sort((a,b)=>a[0].localeCompare(b[0]));
 const checkReference=schema.verifyAccountInactivityCheckReference({format:'PG_CONSTRAINTDEF_V1',postgresMajor,definitions,
  definitionsSha256:createHash('sha256').update(JSON.stringify(definitions)).digest('hex')});
 return {kind:'ACCOUNT_INACTIVITY_OFF_NATIVE_SQL_CASES',sqlExecuted:true,sourceSqlFileCount:79,migrations:source.migrations.map(({sql,id,...row})=>row),cases:17,
  checkReference,catalogVerified:true,captureSqlExecuted:true,hookConfigured:false,syntheticSqlHost:true,actualPostgres:true,coverageSynthetic:true,
  providerDeliverySynthetic:true,positiveRpcCancellation:true,defaultOff:true,automaticDeletion:false,realAuth:false,realMail:false};
}

if(CURRENT_ASSISTANT.sourcePhase==='assistant-after599-successor'){
  test('after599 typed native ledger keeps synthetic prefix separate from whole executed SQL',async t=>{
    const native=await import('./native-postgres-evidence.mjs'),source=await import('./lib/assistant-later-h0-successor-source.mjs');
    const {assistantAfter599RequiredMigrations}=await import('./integrated-cutover-readiness.mjs');
    const rows=assistantAfter599RequiredMigrations(),runtime=v2Runtime(),binding=source.requireAssistantAfter599Binding();
    const canonical=await source.readAssistantAfter599CanonicalSource();
    const contract=source.assistantLaterH0Definition(canonical.canonicalSource,'ravradar_ravscore_checkpoint_contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    const inventory=await Promise.all(rows.map(async row=>({version:row.version,filename:row.filename,
      sha256:cryptoHash('sha256').update(await fs.readFile('supabase/migrations/'+row.filename)).digest('hex')})));
    const ledgerFixture={kind:'SYNTHETIC_PRIOR_LEDGER_AND_EXECUTED_SUFFIX_V1',
      priorFixtureVersions:rows.slice(0,45).map(row=>row.version),wholeExecutedMigrationVersions:rows.slice(45).map(row=>row.version),
      sourceInventorySha256:cryptoHash('sha256').update(JSON.stringify(inventory)).digest('hex')};
    assert.equal(ledgerFixture.priorFixtureVersions.length,45);assert.equal(ledgerFixture.wholeExecutedMigrationVersions.length,21);
    assert.equal(ledgerFixture.priorFixtureVersions.at(-1),'20261010130000');
    assert.equal(ledgerFixture.wholeExecutedMigrationVersions.at(-2),'20261116181500');
    const observed={kind:'ASSISTANT_AFTER599_SUCCESSOR',sourceMigrationInventory:66,databaseBeforeVersion:'20261116181500',
      originalStateRelease:599,migrationVersion:binding.version,partCount:673,checkpointOidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,productionSeedAuthenticated:false,
      parentCodeHead:'9d67207fbbec0f6bcf7819048f72e57535e9615d',predecessorSetupMigrationCount:11,
      app600InstalledInCheckpointDatabase:true,app600CatalogPreserved:true,beforeGuardCases:14,
      allHistoricalMigrationsExecuted:false,productionInstalledHistoryEvidence:false,ledgerFixture};
    for(const key of ['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved','allOriginalDefinitionsPreserved','exactCheckpointContract','exactTripContract','schema2Catalog',
      'normalProtectedJsonbRoundtrip','originalDigestsPreserved','trueOld599Fixtures','currentNormalFixtures','old599ModelNotRetagged','wholeMetadataInverse','strictlyLater599ToNextOnly','sqlIsNotOriginAuthentication','predecessorExecutedInSameHost'])observed[key]=true;
    observed.intermediateRuntime=Object.fromEntries(['old599ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused','nextActiveAfterCompletion','old599RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved','quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'].map(key=>[key,true]));
    // Public schema expressions only, reused as SYNTHETIC protocol data.
    // Their old76-source qualification is never a qualification of this77-source receipt.
    const schema=await import('./verify-account-erasure-schema.mjs');
    const checkReference=schema.accountErasureCheckReference({format:'PG_CONSTRAINTDEF_V1',postgresMajor:16,
      definitions:[["account_erasure_operations_auth_attempt_ids_check", "CHECK (((COALESCE(array_ndims(auth_attempt_ids), 1) = 1) AND (COALESCE(array_lower(auth_attempt_ids, 1), 1) = 1) AND (array_position(auth_attempt_ids, NULL::uuid) IS NULL) AND (NOT ('00000000-0000-0000-0000-000000000000'::uuid = ANY (auth_attempt_ids)))))"], ["account_erasure_operations_auth_user_created_at_check", "CHECK (((auth_user_created_at IS NULL) OR (auth_user_created_at ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{1,9})?Z$'::text)))"], ["account_erasure_operations_check", "CHECK ((target_user_id <> requested_by))"], ["account_erasure_operations_check1", "CHECK (((activity_first IS NULL) = (activity_last IS NULL)))"], ["account_erasure_operations_check10", "CHECK (((auth_user_created_at IS NOT NULL) = (auth_claimed_at IS NOT NULL)))"], ["account_erasure_operations_check11", "CHECK (((state <> 'AUTH_ATTEMPTED'::text) OR (auth_claimed_at IS NOT NULL)))"], ["account_erasure_operations_check12", "CHECK (((auth_claimed_at IS NULL) OR ((auth_attempt_id IS NOT NULL) AND isfinite(auth_claimed_at) AND (auth_claimed_at >= pg_staged_at))))"], ["account_erasure_operations_check13", "CHECK (((state = ANY (ARRAY['AUTH_ABSENT_D1_PENDING'::text, 'COMPLETE'::text])) = (auth_absent_at IS NOT NULL)))"], ["account_erasure_operations_check14", "CHECK (((auth_absent_at IS NULL) OR ((auth_attempt_id IS NOT NULL) AND (d1_owner_subject IS NOT NULL) AND isfinite(auth_absent_at) AND (auth_absent_at >= COALESCE(auth_claimed_at, pg_staged_at)))))"], ["account_erasure_operations_check15", "CHECK (((state = 'COMPLETE'::text) = (d1_ack_at IS NOT NULL)))"], ["account_erasure_operations_check16", "CHECK (((d1_ack_at IS NOT NULL) = (d1_deleted_count IS NOT NULL)))"], ["account_erasure_operations_check17", "CHECK (((d1_ack_at IS NULL) OR (isfinite(d1_ack_at) AND (d1_ack_at >= auth_absent_at))))"], ["account_erasure_operations_check18", "CHECK (((auth_attempt_id IS NULL) OR ((pg_staged_at IS NOT NULL) AND (d1_owner_subject IS NOT NULL))))"], ["account_erasure_operations_check2", "CHECK (((activity_first IS NULL) OR (isfinite(activity_first) AND isfinite(activity_last) AND (activity_first <= activity_last))))"], ["account_erasure_operations_check3", "CHECK ((isfinite(prepared_at) AND isfinite(updated_at) AND (prepared_at <= updated_at)))"], ["account_erasure_operations_check4", "CHECK (((state = ANY (ARRAY['PG_STAGED_AUTH_PENDING'::text, 'AUTH_ATTEMPTED'::text, 'AUTH_ABSENT_D1_PENDING'::text, 'COMPLETE'::text])) = (pg_staged_at IS NOT NULL)))"], ["account_erasure_operations_check5", "CHECK (((pg_staged_at IS NULL) OR (isfinite(pg_staged_at) AND (pg_staged_at >= prepared_at))))"], ["account_erasure_operations_check6", "CHECK (((state <> ALL (ARRAY['HOLD_ACTIVITY_CHANGED'::text, 'HOLD_POLICY'::text])) OR (hold_reason IS NOT NULL)))"], ["account_erasure_operations_check7", "CHECK (((state <> ALL (ARRAY['PREPARED'::text, 'COMPLETE'::text])) OR (hold_reason IS NULL)))"], ["account_erasure_operations_check8", "CHECK (((pg_staged_at IS NOT NULL) OR (pg_rows_removed = 0)))"], ["account_erasure_operations_check9", "CHECK ((NOT (auth_attempt_id IS DISTINCT FROM auth_attempt_ids[cardinality(auth_attempt_ids)])))"], ["account_erasure_operations_d1_deleted_count_check", "CHECK (((d1_deleted_count >= 0) AND (d1_deleted_count <= '9007199254740991'::bigint)))"], ["account_erasure_operations_d1_owner_subject_check", "CHECK (((d1_owner_subject IS NULL) OR (d1_owner_subject ~ '^usr_v1_[A-Za-z0-9_-]{43}$'::text)))"], ["account_erasure_operations_hold_reason_check", "CHECK ((hold_reason = ANY (ARRAY['ACTIVITY_CHANGED'::text, 'PRIVILEGED_TARGET'::text, 'REFERENCE_POLICY'::text, 'REFERENCE_CATALOG_UNKNOWN'::text, 'TARGET_MISSING'::text, 'STORAGE_CATALOG_UNKNOWN'::text, 'STORAGE_POLICY_UNQUALIFIED'::text, 'STORAGE_OWNERSHIP'::text, 'AUTH_GENERATION_CHANGED'::text])))"], ["account_erasure_operations_mode_check", "CHECK ((mode = 'MANUAL_OWNER'::text))"], ["account_erasure_operations_operation_id_check", "CHECK ((operation_id <> '00000000-0000-0000-0000-000000000000'::uuid))"], ["account_erasure_operations_pg_rows_removed_check", "CHECK (((pg_rows_removed >= 0) AND (pg_rows_removed <= '9007199254740991'::bigint)))"], ["account_erasure_operations_state_check", "CHECK ((state = ANY (ARRAY['PREPARED'::text, 'HOLD_ACTIVITY_CHANGED'::text, 'HOLD_POLICY'::text, 'PG_STAGED_AUTH_PENDING'::text, 'AUTH_ATTEMPTED'::text, 'AUTH_ABSENT_D1_PENDING'::text, 'COMPLETE'::text])))"]]});
    const receipt80=await currentNativeReceiptProtocolData();
    const wholeSqlFileCount=(await fs.readdir(new URL('../supabase/migrations/',import.meta.url))).filter(file=>file.endsWith('.sql')).length;
    // Preserve original79 DATA/oracles; the mandatory current80 facet binds the new append.
    const sourceSqlFileCount=wholeSqlFileCount-Number(receipt80!==null);
    assert.equal(wholeSqlFileCount,receipt80===null?79:80,'Exact original79 scope plus only the current receipt append');
    const pair=schema.ACCOUNT_INACTIVITY_OFF_APP_MIGRATIONS;
    assert.equal(sourceSqlFileCount-pair.length,77,'The genuine77-file predecessor remains, plus only the two named OFF appends');
    assert.equal(sourceSqlFileCount,79,'Original79 scope, never an old77 execution retag');
    const accountInactivity=await currentInactivityOffProtocolData(16);
    const accountErasure={kind:'ACCOUNT_ERASURE_APP_NATIVE_SQL_CASES',sqlExecuted:true,
      migrationVersion:'20261116181500',migrationSQLSha256:schema.readAccountErasureSource().sha256,sourceSqlFileCount,
      passed:true,cases:49,actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,checkReference,checkExpressionDriftRefused:true,
      serviceEvidenceSynthetic:true,failedTransactionRolledBack:true,aclMutationRefused:true,ownerPendingDiscoveryAndPagination:true,
      authAttemptReplayAndGeneration:true,initialAbsenceWithoutDeleteClaim:true,authUuidFenceSqlOnly:true,storageDefaultDenyAndOwnership:true,postPgStorageClaimHeld:true,
      observationsAndBootstrapFence:true,readCommittedFreshness:true,repeatableReadNoLateCommit:true,serializableNoLateCommit:true,
      actorNonKeyPrivilegeLock:true,authDeletion:false,d1Ack:false,completionAuthority:false};
    const report={kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,normalModelPartCount:673,
      postgresMajorVersion:16,nativeProgramIdentity:runtime.selectedPrograms,assistantAfter599Successor:observed,accountErasure,accountInactivity,...(receipt80===null?{}:{accountNativeReceipt:receipt80})};
    assert.deepEqual(await native.assistantAfter599NativeReportProjection(report,{selectedPrograms:runtime.selectedPrograms}),report);
    const collector=native.assistantAfter599NativeReportCollector({selectedPrograms:runtime.selectedPrograms});collector.write(JSON.stringify(report)+'\n');
    assert.deepEqual(await collector.finish(),report);
    const receipt={schemaVersion:1,kind:native.ASSISTANT_AFTER599_PHASE_KIND,phase:'ASSISTANT_AFTER599_SUCCESSOR',
      sourcePhase:native.ASSISTANT_AFTER599_PHASE,releaseVersion:source.requireAssistantAfter599Release(),binding,output:source.requireAssistantAfter599Output(),
      databaseBefore:{...source.ASSISTANT_AFTER599_BEFORE,version:source.ASSISTANT_AFTER599_DATABASE_LEDGER.maximumVersion},
      current:installed594Receipt().current,commands:[...native.ASSISTANT_AFTER599_COMMANDS],status:'EXECUTED',executedInThisRun:true,
      origin:null,eligibleForReuse:false,runtime,report};
    assert.equal(await native.verifyAssistantAfter599PhaseReceipt(receipt,receipt.current),receipt);
    // Exercise the complete raw normal consumer, including its real package,
    // workflow, command and current79-file native validators. Transport is DATA.
    const normal=await import('./national584-source-evidence.mjs');
    const caller=await fs.readFile('scripts/national584-source-evidence.mjs','utf8');
    const begin=caller.indexOf('async function currentContext() {'),end=caller.indexOf('async function authenticatedReuse(ctx) {',begin);
    assert(begin>=0&&end>begin);
    const currentContextSource=caller.slice(begin,end).trim();
    const packageData=JSON.parse(await fs.readFile('package.json','utf8'));
    const workflow=await fs.readFile(normal.WORKFLOW,'utf8');
    const path=await import('node:path'),root=path.resolve('synthetic-national-consumer');
    const contentHash='sha256:'+'c'.repeat(64),context=receipt.current;
    const env={GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:normal.ORIGIN.repository,
      SOURCE_GATE_HEAD_SHA:context.head,GITHUB_EVENT_PATH:'synthetic-event.json',GITHUB_RUN_ID:String(context.run),
      GITHUB_RUN_ATTEMPT:String(context.attempt),PULL_REQUEST_NUMBER:String(context.pullRequest)};
    const event={pull_request:{number:context.pullRequest,head:{sha:context.head,ref:context.branch,repo:{full_name:normal.ORIGIN.repository}}}};
    const proof={headSha:context.head,repository:normal.ORIGIN.repository,contractId:'weather-source-gate-content-v2',
      privatePayloadIncluded:false,sourceTreeSha256:contentHash,nativePostgres:receipt};
    const runContext=async(value=proof,phase=source.ACTIVE_ASSISTANT_SUCCESSOR)=>{
      const calls=[];
      const dependencies={assert,path,ROOT:root,WORKFLOW:normal.WORKFLOW,ORIGIN:normal.ORIGIN,ACTIVE:phase,
        process:{env},fs:{async readFile(file){
          if(file===env.GITHUB_EVENT_PATH)return JSON.stringify(event);
          if(file===path.join(root,normal.WORKFLOW))return workflow;
          if(file===path.join(root,'package.json'))return JSON.stringify(packageData);
          assert.equal(file,path.join(root,'.cache/source-tree-content-proof.json'));return JSON.stringify(value);
        }},git(...args){
          if(args[0]==='rev-parse'){assert.deepEqual(args,['rev-parse','HEAD^{commit}']);return context.head;}
          if(args[0]==='status'){assert.deepEqual(args,['status','--porcelain','--untracked-files=no']);return '';}
          assert.deepEqual(args,['merge-base','--is-ancestor',normal.ORIGIN.head,context.head]);return '';
        },content(ref){assert.equal(ref,'HEAD');return contentHash;},verifyWorkflow:normal.verifyWorkflow,verifyPackage:normal.verifyPackage,
        ASSISTANT_AFTER599_PHASE:native.ASSISTANT_AFTER599_PHASE,ASSISTANT_AFTER598_PHASE:native.ASSISTANT_AFTER598_PHASE,
        ASSISTANT_AFTER597_PHASE:native.ASSISTANT_AFTER597_PHASE,SCALAR597_LATER_H0_PHASE:native.SCALAR597_LATER_H0_PHASE,
        ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE:source.ASSISTANT_PUBLIC588_SUCCESSOR_RELEASE,
        requireAssistantAfter599Release:source.requireAssistantAfter599Release,
        requireAssistantAfter598Release:source.requireAssistantAfter598Release,
        async verifyAssistantAfter599NativeContext(...args){calls.push('after599');return normal.verifyAssistantAfter599NativeContext(...args);},
        verifyAssistantAfter598NativeContext:normal.verifyAssistantAfter598NativeContext,
        verifyAssistantAfter597NativeContext:normal.verifyAssistantAfter597NativeContext,
        verifyScalar597LaterH0NativeContext:normal.verifyScalar597LaterH0NativeContext,
        verifyInstalled593Original591NativeContext:normal.verifyInstalled593Original591NativeContext,
        verifyAssistantPublic591SuccessorNativeContext:normal.verifyAssistantPublic591SuccessorNativeContext,
        verifyAssistantPublic590SuccessorNativeContext:normal.verifyAssistantPublic590SuccessorNativeContext,
        verifyAssistantPublic588SuccessorNativeContext:normal.verifyAssistantPublic588SuccessorNativeContext,
        verifyCurrent586PhaseReceipt:native.verifyCurrent586PhaseReceipt,
        verifyAssistantLaterH0PhaseReceipt:native.verifyAssistantLaterH0PhaseReceipt,
        verifyAssistantPublic587SuccessorPhaseReceipt:native.verifyAssistantPublic587SuccessorPhaseReceipt,
        verifyCurrentNativeCommands:normal.verifyCurrentNativeCommands};
      const execute=Function(...Object.keys(dependencies),'return ('+currentContextSource+');')(...Object.values(dependencies));
      const result=await execute();assert.deepEqual(calls,['after599']);return result;
    };
    const accepted=await runContext();assert.deepEqual(accepted.proof,proof);assert.equal(accepted.head,context.head);
    for(const mutate of [p=>p.nativePostgres.phase='ASSISTANT_PUBLIC587_SUCCESSOR',p=>p.nativePostgres.current.head='d'.repeat(40),
      p=>p.nativePostgres.commands=[...native.ASSISTANT_AFTER598_COMMANDS],p=>delete p.nativePostgres.report.accountErasure,
      p=>p.nativePostgres.report.accountErasure.sourceSqlFileCount=76,p=>p.sourceTreeSha256='sha256:'+'d'.repeat(64),
      p=>p.historical584National={status:'EXECUTED'}]){
      const changed=copy(proof);mutate(changed);await assert.rejects(runContext(changed));
    }
    await assert.rejects(runContext(proof,{sourcePhase:'unknown-current-phase'}));
    for(const mutate of [r=>delete r.accountInactivity,r=>r.accountInactivity.sourceSqlFileCount=77,
      r=>r.accountInactivity.cases=16,r=>r.accountInactivity.captureSqlExecuted=false,r=>r.accountInactivity.automaticDeletion=true,
      r=>r.accountInactivity.migrations.reverse(),r=>r.accountInactivity.migrations[1].sha256='0'.repeat(64),
      r=>r.accountInactivity.checkReference.definitions.pop(),r=>r.accountErasure.sourceSqlFileCount=77,
      r=>delete r.accountErasure,r=>r.accountErasure=undefined,
      r=>r.accountErasure.sourceSqlFileCount=76,r=>r.accountErasure.sourceSqlFileCount=75,
      r=>r.accountErasure.migrationVersion='20261115060000',r=>r.accountErasure.migrationSQLSha256='0'.repeat(64),
      r=>r.accountErasure.cases=48,r=>r.accountErasure.checkReference.definitions.pop(),
      r=>r.accountErasure.checkReference.definitionsSha256='0'.repeat(64),r=>r.accountErasure.checkExpressionDriftRefused=false]){
      const changed=copy(receipt);mutate(changed.report);
      await assert.rejects(native.assistantAfter599NativeReportProjection(changed.report,{selectedPrograms:runtime.selectedPrograms}));
      await assert.rejects(native.verifyAssistantAfter599PhaseReceipt(changed,changed.current));
    }

    for(const mutate of [r=>delete r.ledgerFixture,r=>r.allHistoricalMigrationsExecuted=true,r=>r.productionInstalledHistoryEvidence=true,
      r=>r.ledgerFixture.priorFixtureVersions.shift(),r=>r.ledgerFixture.wholeExecutedMigrationVersions.push(r.ledgerFixture.priorFixtureVersions.shift()),
      r=>r.ledgerFixture.wholeExecutedMigrationVersions.pop(),r=>r.ledgerFixture.sourceInventorySha256='0'.repeat(64),
      r=>r.ledgerFixture.extra=true,r=>r.beforeGuardCases=12,r=>r.app600InstalledInCheckpointDatabase=false,r=>r.app600CatalogPreserved=false]){
      const changed=copy(report);mutate(changed.assistantAfter599Successor);
      await assert.rejects(native.assistantAfter599NativeReportProjection(changed,{selectedPrograms:runtime.selectedPrograms}));
    }
    // The original V1 is an immutable fact, not rewritten as a reused run.
    const {execFileSync}=await import('node:child_process');
    const actualHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
    const parentHead=execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim();
    const actualInput=await native.captureAssistantAfter599PgInput();
    if(receipt80===null)assert.equal(actualInput.sqlFiles,79);
    else assert.equal(actualInput.sqlFiles,80,'Current80 PG key includes the actual new append');
    assert.equal(actualInput.complete,true);
    const currentReuse={run:ORIGIN.run+900,attempt:1,head:actualHead,pullRequest:947,branch:'synthetic-after599-same-pr'};
    const originRun={...copy(run),id:ORIGIN.run+800,run_attempt:1,head_sha:parentHead,head_branch:currentReuse.branch,
      repository:{full_name:ORIGIN.repository},head_repository:{full_name:ORIGIN.repository},pull_requests:[{number:947}],
      created_at:'2026-11-17T10:00:00Z',status:'completed',conclusion:'failure'};
    const currentRun={...copy(originRun),id:currentReuse.run,head_sha:actualHead,created_at:'2026-11-17T12:00:00Z',status:'in_progress',conclusion:null};
    const originalReceipt={...copy(receipt),current:{run:originRun.id,attempt:1,head:parentHead,pullRequest:947,branch:currentReuse.branch}};
    const originalBytes=JSON.stringify(originalReceipt);
    const sourceStep='Validate source contracts and release governance';
    const sourceTreeStep='Build deterministic source-tree content identity';
    const makeAfter599Fixture=({mutate={},locator=null,later=false,unrelatedLater=false,skippedCurrent=false,
      skippedFault=null,sourceBlocked=false,terminalSourceFailure=null,differentRunner=false,missingHistory=false,
      activeTail=null,activeTailFault=null}={})=>{
      const zip=Buffer.from('bounded after599 synthetic ZIP'),calls=[],origin=copy(originRun),active=copy(currentRun);
      const laterRun={...copy(origin),id:origin.id+(sourceBlocked?2:1),head_sha:unrelatedLater?'c'.repeat(40):actualHead};
      const fetches=[];
      let recovered=false,historyCaptures=0;
      if(missingHistory){laterRun.id=active.id+1;laterRun.head_sha='b'.repeat(40);}
      if(mutate.changedCancelledSetup)laterRun.head_sha='b'.repeat(40);
      const blockedRun={...copy(origin),id:origin.id+1,head_sha:actualHead};
      const ordinaryJobsFor=r=>({total_count:1,jobs:[{id:r.id+1000,name:JOB,run_id:r.id,run_attempt:1,head_sha:r.head_sha,
        status:'completed',conclusion:'failure',steps:Array.from({length:17},(_,i)=>({number:i+1,
          name:i===14?'Validate source contracts and release governance':i===15?STEP:i===16?CURRENT586_PHASE_UPLOAD:'setup'+i,
          status:'completed',conclusion:'success',started_at:'2026-11-17T10:00:00Z',
          completed_at:i<15?'2026-11-17T10:00:00Z':'2026-11-17T10:02:00Z'}))}]});
      const skippedJobs={total_count:1,jobs:[{id:laterRun.id+1000,name:JOB,run_id:laterRun.id,run_attempt:1,
        head_sha:laterRun.head_sha,status:'completed',conclusion:'success',
        steps:TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES.filter(name=>name!==normal.STEP)
          .map((name,index)=>({name,number:index+1,status:'completed',
          conclusion:index>=9&&index<=21?'skipped':'success',
          started_at:'2026-11-17T10:'+String(index).padStart(2,'0')+':00Z',
          completed_at:'2026-11-17T10:'+String(index+1).padStart(2,'0')+':00Z'}))}]};
      if(skippedCurrent||terminalSourceFailure){
        const job=skippedJobs.jobs[0];
        laterRun.conclusion=job.conclusion=terminalSourceFailure?'failure':'success';
        if(terminalSourceFailure){
          const source=job.steps.find(step=>step.name===terminalSourceFailure);
          for(const step of job.steps){
            step.conclusion=step.number<source.number?'success':step.number===source.number?'failure':'skipped';
            if(step.number>source.number)step.started_at=step.completed_at=source.completed_at;
          }
          job.steps.push({number:48,name:'Post Run actions/checkout@v7',status:'completed',conclusion:'success'});
        }
        skippedFault?.({run:laterRun,job,jobs:skippedJobs});
      }
      if(activeTail){
        if(activeTail==='later')laterRun.id=active.id+1;
        laterRun.status='in_progress';laterRun.conclusion=null;
        laterRun.head_branch='synthetic-after599-other-pr';laterRun.pull_requests=[{number:948}];
        const job=skippedJobs.jobs[0];
        Object.assign(job,{id:laterRun.id+1000,run_id:laterRun.id,status:'in_progress',conclusion:null});
        const uploadNumber=job.steps.find(step=>step.name===CURRENT586_PHASE_UPLOAD).number;
        for(const step of job.steps){
          if(step.number<=uploadNumber)step.conclusion='success';
          else Object.assign(step,{status:step.number===uploadNumber+1?'in_progress':'queued',conclusion:null,completed_at:null});
        }
        const postNames=[
          'Restore Node22 for existing source validation',
          'Set up Node24 for isolated acquisition contracts',
          'Run actions/setup-python@v7',
          'Run actions/setup-node@v7',
          'Set up Node24 for selected owned-cache native contracts',
          'Run actions/checkout@v7',
        ];
        job.steps.push(...postNames.map((name,index)=>({name:'Post '+name,number:43+index,
          status:'pending',conclusion:null,started_at:null,completed_at:null})));
        activeTailFault?.({run:laterRun,job});
      }
      const jobsFor=r=>{
        if((skippedCurrent||terminalSourceFailure||activeTail)&&r.id===laterRun.id)return copy(skippedJobs);
        const value=ordinaryJobsFor(r);
        if(sourceBlocked&&r.id===blockedRun.id){
          value.jobs[0].steps[14].conclusion='failure';
          value.jobs[0].steps[15].conclusion='skipped';value.jobs[0].steps[16].conclusion='skipped';
        }
        return value;
      };
      const metadata=r=>({id:r.id+2000,name:'native586-phase-'+r.id+'-1-'+r.head_sha,expired:false,size_in_bytes:zip.length,
        digest:'sha256:'+v2Hash(zip),created_at:activeTail&&r.id===laterRun.id?'2026-11-17T10:19:30Z':'2026-11-17T10:01:00Z',
        workflow_run:{id:r.id,head_sha:r.head_sha}});
      const rows=[active,...(locator||later||unrelatedLater||skippedCurrent||terminalSourceFailure||differentRunner||activeTail?[laterRun]:[]),
        ...(sourceBlocked?[blockedRun]:[]),origin];let decoding=origin,pullReads=0,historyReads=0;
      const proofFor=r=>({schemaVersion:r.id===laterRun.id&&locator?2:1,kind:r.id===laterRun.id&&locator?native.ASSISTANT_AFTER599_REUSE_KIND:native.ASSISTANT_AFTER599_PHASE_KIND,
        repository:ORIGIN.repository,headSha:r.head_sha,sourceTreeSha256:'sha256:'+'e'.repeat(64),privatePayloadIncluded:false,
        nativePostgres:r.id===laterRun.id&&locator?{...copy(locator),current:{...currentReuse,run:r.id}}
          :r.id===laterRun.id&&differentRunner?{...copy(originalReceipt),current:{...currentReuse,run:r.id},
            runtime:{...copy(runtime),imageVersion:'20261117.7125'}}
           :r.id===laterRun.id&&activeTail?{...copy(originalReceipt),current:{...currentReuse,run:r.id,branch:r.head_branch,pullRequest:948}}
           :copy(originalReceipt)});
      const get=async(route,options={})=>{
        calls.push(route);if(mutate.unavailable)throw Error('SYNTHETIC_UNAVAILABLE');
        if(route.endsWith('/pulls/947')){pullReads++;return {number:947,state:'open',draft:false,base:{ref:'main',repo:{full_name:ORIGIN.repository}},
          head:{sha:mutate.prHead?'f'.repeat(40):mutate.originPrHead&&pullReads>1?normal.ORIGIN.head:actualHead,ref:currentReuse.branch,repo:{full_name:ORIGIN.repository}}};}
        if(route.endsWith('/pulls/948'))return {number:948,state:'open',base:{ref:'main',repo:{full_name:ORIGIN.repository}},
          head:{sha:laterRun.head_sha,ref:laterRun.head_branch,repo:{full_name:ORIGIN.repository}}};
        if(route.includes('/workflows/')){
          historyReads++;
          const observed=mutate.otherRunnerMissingFromHistory&&historyReads>1?rows.filter(r=>r.id!==laterRun.id):rows;
          return {total_count:observed.length,workflow_runs:copy(observed)};
        }
        for(const r of rows){
          if(route.endsWith('/runs/'+r.id))return {...copy(r),...(mutate.attempt&&r.id===origin.id?{run_attempt:2}:{}),
            ...(mutate.skippedFreshHead&&r.id===laterRun.id?{head_sha:'f'.repeat(40)}:{}),
            ...(activeTail&&mutate.activeTailReplay&&r.id===laterRun.id&&calls.includes('/repos/'+ORIGIN.repository+'/actions/artifacts/'+(r.id+2000)+'/zip')?{run_attempt:2}:{}),
            ...(mutate.foreignHistory&&r.id===laterRun.id?{head_repository:{full_name:'foreign/RavRadar'}}:{})};
          if(route.includes('/runs/'+r.id+'/attempts/1/jobs')){
            const value=jobsFor(r);if((mutate.pgFailure&&r.id===origin.id)||((later||unrelatedLater||mutate.otherRunnerPgFailure)&&!locator&&r.id===laterRun.id))value.jobs[0].steps[15].conclusion='failure';
            if((mutate.sourceFailure&&r.id===origin.id)||(mutate.currentSourceFailure&&r.id===active.id))
              value.jobs[0].steps.find(step=>step.name===sourceStep).conclusion='failure';
            if(mutate.uploadFailure&&r.id===origin.id)value.jobs[0].steps[16].conclusion='failure';return value;
          }
          if(route.endsWith('/runs/'+r.id+'/artifacts?per_page=100')){
            if(mutate.otherRunnerMissingArtifact&&r.id===laterRun.id)return {total_count:0,artifacts:[]};
            return {total_count:1,artifacts:[{...metadata(r),...(mutate.expired?{expired:true}:{})}]};
          }
          if(route.endsWith('/artifacts/'+(r.id+2000)+'/zip')){decoding=r;return mutate.zip?Buffer.from('wrong'):zip;}
          if(route.endsWith('/artifacts/'+(r.id+2000)))return {...metadata(r),...(mutate.finalArtifact?{expired:true}:{})};
        }
        throw Error('UNEXPECTED_SYNTHETIC_ROUTE');
      };
      let inputCalls=0,runtimeCalls=0;
      const options={env:{GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:ORIGIN.repository,GITHUB_RUN_ATTEMPT:'1',
        SOURCE_GATE_HEAD_SHA:actualHead,GITHUB_RUN_ID:String(currentReuse.run),PULL_REQUEST_NUMBER:'947',GITHUB_HEAD_REF:currentReuse.branch},
        get,getInput:async({ref='HEAD'}={})=>{
          inputCalls++;const result=copy(actualInput);
          if(missingHistory&&ref===laterRun.head_sha){
            historyCaptures++;
            if(!recovered||mutate.brokenRecoveredInput)throw Error('SYNTHETIC_TREE_UNAVAILABLE');
          }
          if((mutate.input&&ref===parentHead)||(mutate.freshInput&&inputCalls>2))result.inputSha256='f'.repeat(64);
          if(mutate.sql77&&ref===parentHead||unrelatedLater&&ref===laterRun.head_sha){result.sqlFiles=77;result.inputSha256='d'.repeat(64);}return result;
        },getRuntime:async()=>{runtimeCalls++;return {...v2Runtime(),...(mutate.runtime||mutate.freshRuntime&&runtimeCalls>1?{imageVersion:'20261117.999'}:{})};},
        readGit:(args,input)=>{
          if(args[0]==='rev-parse'&&args[1]==='HEAD^{commit}')return actualHead+'\n';
          if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false\n';
          if(args[0]==='status'||args[0]==='for-each-ref')return '';
          if(missingHistory&&args[0]==='cat-file'&&args[1]==='--batch-check=%(objectname) %(objecttype)'){
            assert.equal(String(input),laterRun.head_sha+'\n');
            const kind=mutate.presentButInvalid?'commit':recovered?(mutate.nonCommitRecovery?'tree':'commit'):'missing';
            return laterRun.head_sha+' '+kind+'\n';
          }
          if(missingHistory&&args[0]==='ls-remote'&&args[1]==='--get-url')
            return (mutate.mappedGitOrigin?'https://foreign.invalid/repo.git':args[2])+'\n';
          if(missingHistory&&args[0]==='-c'&&args[2]==='fetch'){
            fetches.push(args);calls.push('git-recover');recovered=true;return '';
          }
          if(missingHistory&&args[0]==='cat-file'&&args[2]===laterRun.head_sha+':'+WORKFLOW){
            assert(recovered);return Buffer.from(workflow);
          }
          if(mutate.changedCancelledSetup&&args[0]==='cat-file'&&args[2]===laterRun.head_sha+':'+WORKFLOW)
            return Buffer.from(workflow.replace('      - name: Install source-gate dependencies\n',
              '      - name: Install source-gate dependencies\n        shell: sh\n'));
          if(mutate.skippedWorkflow&&args[0]==='cat-file'&&args[2]===actualHead+':'+WORKFLOW)
            return Buffer.from(workflow.replace('  contents: read','  contents: write'));
          if(args[0]==='ls-tree'||args[0]==='cat-file'&&args[1]==='blob')return execFileSync('git',args);
          return execFileSync('git',args,{encoding:'utf8'});
        },decode:()=>{const proof=proofFor(decoding);if(mutate.receipt)mutate.receipt(proof.nativePostgres);
          if(activeTail&&mutate.activeTailDifferentRuntime&&decoding.id===laterRun.id)proof.nativePostgres.runtime.imageVersion='20261117.7125';
          return Buffer.from(JSON.stringify(proof));}};
      return {options,calls,skippedRun:laterRun,fetches,historyCaptures:()=>historyCaptures};
    };
    const positive=makeAfter599Fixture();
    const positiveRefusals=[];
    positive.options.onRefusal=reason=>positiveRefusals.push(reason);
    const reused=await native.decideAssistantAfter599Reuse(positive.options);
    assert(reused,'The genuine after599 V1 phase survives its later national failure');
    assert.equal(reused.kind,native.ASSISTANT_AFTER599_REUSE_KIND);assert.equal(reused.status,'REUSED');
    assert.equal(reused.executedInThisRun,false);assert.equal(reused.origin.run,originRun.id);assert.equal(reused.origin.head,parentHead);
    assert.equal(reused.eligibleForReuse,false);assert.equal(JSON.stringify(originalReceipt),originalBytes);
    assert.deepEqual(positiveRefusals,[]);
    await t.test('after599 reports only fixed failure stages before the ordinary fallback',async()=>{
      for(const [fault,stage] of [['unavailable','CURRENT_RUN'],['zip','ORIGIN_RECEIPT'],
        ['runtime','MATCHING_ORIGIN_MISSING'],['finalArtifact','FINAL_REOBSERVATION']]){
        const rejected=makeAfter599Fixture({mutate:{[fault]:true}}),refusals=[];
        rejected.options.onRefusal=reason=>{refusals.push(reason);throw Error('SYNTHETIC_REPORTER_FAILURE');};
        assert.equal(await native.decideAssistantAfter599Reuse(rejected.options),null);
        assert.deepEqual(refusals,[stage],fault);
      }
    });
    await t.test('after599 genbruger den ældre præcise runner efter en nyere verificeret PostgreSQL-prøve',async()=>{
      const differentRunner=makeAfter599Fixture({differentRunner:true});
      const compatible=await native.decideAssistantAfter599Reuse(differentRunner.options);
      assert.equal(compatible?.origin.run,originRun.id);
      assert.equal(compatible.executedInThisRun,false);
      assert(differentRunner.calls.some(route=>route.endsWith('/artifacts/'+(differentRunner.skippedRun.id+2000)+'/zip')));
      for(const fault of ['otherRunnerMissingArtifact','otherRunnerPgFailure','otherRunnerMissingFromHistory','runtime']) {
        const uncertain=makeAfter599Fixture({differentRunner:true,mutate:{[fault]:true}});
        assert.equal(await native.decideAssistantAfter599Reuse(uncertain.options),null,fault);
      }
    });
    await t.test('after599 beviser uudført PG i den normale CURRENT-kontrol',async()=>{
      // Samme normale CURRENT-stepform: ingen ny PG-origin eller native-artifact.
      const skipped=makeAfter599Fixture({skippedCurrent:true});
      const skippedReceipt=await native.decideAssistantAfter599Reuse(skipped.options);
      assert(skippedReceipt);assert.equal(skippedReceipt.origin.run,originRun.id);
      assert.equal(skippedReceipt.executedInThisRun,false);assert.equal(JSON.stringify(originalReceipt),originalBytes);
      assert(!skipped.calls.some(route=>route.includes('/runs/'+skipped.skippedRun.id+'/artifacts')));
      for(const skippedFault of [
        x=>{x.run.conclusion='failure';},x=>{x.job.conclusion='failure';},x=>{x.run.run_attempt=2;},
        x=>{x.jobs.total_count=2;},x=>{x.job.steps.find(s=>s.name===STEP).conclusion='failure';},
        x=>{Object.assign(x.job.steps.find(s=>s.name===STEP),{status:'in_progress',conclusion:null});},
        x=>{x.job.steps.find(s=>s.name==='Build deterministic source-tree content identity').conclusion='failure';},
        x=>{x.job.steps.find(s=>s.name==='Build deterministic source-tree content identity').conclusion=null;},
        x=>{x.job.steps.find(s=>s.name===CURRENT586_PHASE_UPLOAD).conclusion='success';},
        x=>{x.job.steps.find(s=>s.name==='Upload tree-content source validation proof').conclusion='skipped';},
      ])assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({skippedCurrent:true,skippedFault}).options),null);
      for(const key of ['skippedFreshHead','skippedWorkflow'])
        assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({skippedCurrent:true,mutate:{[key]:true}}).options),null,key);
      assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({skippedCurrent:true,sourceBlocked:true}).options),null,
        'En uafklaret form for en tidligere kildefejl spærrer fortsat');
    });
    await t.test('after599 passerer verificeret terminal kildefejl i begge historikopslag',async()=>{
      for(const terminalSourceFailure of [sourceTreeStep,sourceStep]){
        const failed=makeAfter599Fixture({terminalSourceFailure});
        const kept=await native.decideAssistantAfter599Reuse(failed.options);
        assert(kept,terminalSourceFailure);
        assert.equal(kept.origin.run,originRun.id);assert.equal(kept.executedInThisRun,false);
        const route='/runs/'+failed.skippedRun.id;
        assert.equal(failed.calls.filter(value=>value.endsWith(route)).length,2);
        assert(!failed.calls.some(value=>value.includes(route+'/artifacts')));
      }
      const terminalSourceFailure=sourceTreeStep;
      for(const [name,skippedFault] of [
        ['cancellation',({run,job})=>{run.conclusion=job.conclusion='cancelled';}],
        ['failed setup',({job})=>{job.steps[7].conclusion='failure';}],
        ['second failure',({job})=>{job.steps[17].conclusion='failure';}],
        ['workflow shape',({job})=>{job.steps[8].name='Other source check';}],
        ['unknown step',({job})=>{job.steps.at(-1).name='Other action';}],
        ['native attempted',({job})=>{job.steps.find(step=>step.name===STEP).started_at='2026-11-17T10:00:00Z';}],
        ['uploaded phase',({job})=>{job.steps.find(step=>step.name===CURRENT586_PHASE_UPLOAD).conclusion='success';}],
      ]){
        assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({terminalSourceFailure,skippedFault}).options),null,name);
      }
      assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({
        terminalSourceFailure:'Install declared DMI dependencies before source planning',
      }).options),null,'fully skipped suffix cannot qualify a setup failure');
      for(const key of ['skippedFreshHead','currentSourceFailure'])
        assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({terminalSourceFailure,mutate:{[key]:true}}).options),null,key);
    });
    await t.test('after599 bevarer kvitteringen efter verificeret afbrudt kildeopsætning',async()=>{
      const cancelled=({step='Install source-gate dependencies',mutate,change}={})=>makeAfter599Fixture({
        terminalSourceFailure:step,mutate,
        skippedFault:({run,job})=>{
          run.conclusion=job.conclusion='cancelled';
          job.steps.find(value=>value.name===step).conclusion='cancelled';
          change?.(run,job);
        },
      });
      const fixture=cancelled();
      const receipt=await native.decideAssistantAfter599Reuse(fixture.options);
      assert.equal(receipt?.origin.run,originRun.id);
      assert.equal(receipt.executedInThisRun,false);
      const route='/runs/'+fixture.skippedRun.id;
      assert.equal(fixture.calls.filter(value=>value.endsWith(route)).length,2);
      assert(!fixture.calls.some(value=>value.includes(route+'/artifacts')));

      for(const [label,options] of [
        ['later stop',{step:sourceStep}],
        ['changed setup workflow',{mutate:{changedCancelledSetup:true}}],
        ['unknown retry',{change:run=>{run.run_attempt=2;}}],
        ['mismatched job conclusion',{change:(_run,job)=>{job.conclusion='failure';}}],
        ['native ran',{change:(_run,job)=>{job.steps.find(step=>step.name===STEP).conclusion='success';}}],
        ['upload unknown',{change:(_run,job)=>{job.steps.find(step=>step.name===CURRENT586_PHASE_UPLOAD).status='in_progress';}}],
        ['current source failed',{mutate:{currentSourceFailure:true}}],
      ]){
        assert.equal(await native.decideAssistantAfter599Reuse(cancelled(options).options),null,label);
      }
    });
    await t.test('after599 beholder ægte oprindelse når anden PR kun kører halen efter bevist native-upload',async()=>{
      for(const activeTail of ['earlier','later']){
        const fixture=makeAfter599Fixture({activeTail});
        const result=await native.decideAssistantAfter599Reuse(fixture.options);
        assert.equal(result?.origin.run,originRun.id);
        assert(fixture.calls.some(route=>route.endsWith('/artifacts/'+(fixture.skippedRun.id+2000)+'/zip')));
      }
      for(const [name,activeTailFault,mutate] of [
        ['native in progress',({job})=>Object.assign(job.steps.find(step=>step.name===STEP),{status:'in_progress',conclusion:null})],
        ['native failed',({job})=>{job.steps.find(step=>step.name===STEP).conclusion='failure';}],
        ['upload incomplete',({job})=>{job.steps.find(step=>step.name===CURRENT586_PHASE_UPLOAD).conclusion='skipped';}],
        ['unknown tail',({job})=>{job.steps[23].name='Unknown workflow step';}],
        ['post row without an action',({job})=>{job.steps.at(-1).name='Post '+sourceStep;}],
        ['duplicate post name',({job})=>{job.steps.push({...job.steps.at(-1),number:50});}],
        ['duplicate post ordinal',({job})=>{job.steps.at(-1).number=job.steps.at(-2).number;}],
        ['malformed pending post',({job})=>{job.steps.at(-1).completed_at='2026-11-17T10:20:00Z';}],
        ['missing artifact',null,{otherRunnerMissingArtifact:true}],
        ['missing from fresh history',null,{otherRunnerMissingFromHistory:true}],
        ['moved run head',null,{skippedFreshHead:true}],
        ['replayed after download',null,{activeTailReplay:true}],
        ['different active runtime',null,{activeTailDifferentRuntime:true}],
        ['unreviewed workflow',null,{skippedWorkflow:true}],
      ])assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({activeTail:'earlier',activeTailFault,mutate}).options),null,name);
    });
    await t.test('after599 recovers only an authenticated exact missing history commit',async()=>{
      const fixture=mutate=>makeAfter599Fixture({missingHistory:true,terminalSourceFailure:sourceTreeStep,mutate});
      const pending=fixture({});
      const accepted=await native.decideAssistantAfter599Reuse(pending.options);
      assert.equal(accepted?.origin.run,originRun.id);
      assert.equal(pending.historyCaptures(),2);
      const rowRead='/runs/'+pending.skippedRun.id;
      assert(pending.calls.findIndex(route=>route.endsWith(rowRead))<pending.calls.indexOf('git-recover'));
      assert.deepEqual(pending.fetches,[['-c','http.followRedirects=false','fetch','--no-tags','--no-prune',
        '--no-prune-tags','--no-recurse-submodules','--no-write-fetch-head','--refmap=','--no-auto-maintenance',
        '--no-write-commit-graph','--','https://github.com/'+ORIGIN.repository+'.git',pending.skippedRun.head_sha]]);
      for(const fault of ['skippedFreshHead','foreignHistory','mappedGitOrigin','presentButInvalid']){
        const refused=fixture({[fault]:true});
        assert.equal(await native.decideAssistantAfter599Reuse(refused.options),null,fault);
        assert.equal(refused.fetches.length,0,fault);
      }
      for(const fault of ['nonCommitRecovery','brokenRecoveredInput']){
        const refused=fixture({[fault]:true});
        assert.equal(await native.decideAssistantAfter599Reuse(refused.options),null,fault);
        assert.equal(refused.fetches.length,1,fault);
      }
    });
    assert.equal(await native.verifyAssistantAfter599PhaseReceipt(reused,currentReuse),reused);
    const claims=await normal.assistantAfter599NativeClaims(reused,currentReuse);
    assert.equal(claims.currentAssistantAfter599Native.status,'REUSED');assert.equal(claims.currentAssistantAfter599Native.executedInThisRun,false);
    const located=await native.decideAssistantAfter599Reuse(makeAfter599Fixture({locator:reused}).options);
    assert(located);assert.equal(located.origin.run,originRun.id,'A reused locator is never a SQL origin');
    for(const key of ['unavailable','prHead','originPrHead','attempt','pgFailure','sourceFailure','uploadFailure','expired','zip','finalArtifact','input','sql77','freshInput','runtime','freshRuntime']){
      const f=makeAfter599Fixture({mutate:{[key]:true}});assert.equal(await native.decideAssistantAfter599Reuse(f.options),null,key);
    }
    assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({later:true}).options),null,'Later relevant native failure executes normally');
    const unrelated=await native.decideAssistantAfter599Reuse(makeAfter599Fixture({unrelatedLater:true}).options);
    assert(unrelated,'A proved different77-SQL failure cannot invalidate the unchanged79-SQL phase');
    let clock=0;const clockMock=t.mock.method(performance,'now',()=>clock);
    try{const late=makeAfter599Fixture(),transport=late.options.get;
      const refusals=[];
      late.options.onRefusal=reason=>refusals.push(reason);
      late.options.get=async(...args)=>{const value=await transport(...args);clock=60001;return value;};
      assert.equal(await native.decideAssistantAfter599Reuse(late.options),null,'Expired qualification never grants reuse');
      assert.deepEqual(refusals,['READ_DEADLINE']);
    }finally{clockMock.mock.restore();}
    for(const mutate of [r=>r.eligibleForReuse=true,r=>r.status='REUSED',r=>r.executedInThisRun=false,
      r=>r.report.assistantAfter599Successor.sqlExecuted=false,r=>r.report.accountErasure.sourceSqlFileCount=76,
      r=>r.report.accountErasure.cases=48,r=>r.report.accountErasure.checkReference.definitions.pop()]){
      assert.equal(await native.decideAssistantAfter599Reuse(makeAfter599Fixture({mutate:{receipt:mutate}}).options),null);
    }
    // The actual ESM CLI, main, reuse-return and record bodies run unchanged.
    // Only the already qualified decision and file transport are synthetic.
    const os=await import('node:os'),{pathToFileURL}=await import('node:url');
    const nativeSource=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
    const executeStart=nativeSource.indexOf('export async function executeAssistantAfter599Native(){');
    const recordStart=nativeSource.indexOf('async function record(receipt) {',executeStart);
    const mainStart=nativeSource.indexOf('async function main() {',recordStart);
    const entryStart=nativeSource.lastIndexOf('if(process.argv[1]');
    assert(executeStart>=0&&recordStart>executeStart&&mainStart>recordStart&&entryStart>mainStart);
    const owned=await fs.mkdtemp(path.join(os.tmpdir(),'rr-after599-reuse-cli-'));
    try{
      const entry=path.join(owned,'normal-entry.mjs');
      const nativeDriverNames=["assertCurrentAccountInactivityNativeReport","assertCurrentAccountNativeReceiptNativeReport","CURRENT586_PHASE_FILE","ASSISTANT_AFTER599_PHASE","ASSISTANT_AFTER598_PHASE","ASSISTANT_AFTER597_PHASE","SCALAR597_LATER_H0_PHASE","ASSISTANT_AFTER599_PHASE_KIND","ASSISTANT_AFTER598_PHASE_KIND","ASSISTANT_AFTER597_PHASE_KIND","SCALAR597_LATER_H0_PHASE_KIND","INSTALLED593_ORIGINAL591_V2_KIND","INSTALLED593_ORIGINAL591_PHASE_KIND","CURRENT586_PHASE_KIND","ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND","ASSISTANT_PUBLIC590_SUCCESSOR_PHASE_KIND","ASSISTANT_PUBLIC588_SUCCESSOR_PHASE_KIND","ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND","ASSISTANT_LATER_H0_PHASE_KIND","ACTIVE_NATIVE_SCRIPT","ACTIVE_COMMANDS","ASSISTANT_AFTER599_SCRIPT","executeAssistantAfter598Native","executeAssistantAfter597Native","captureInstalled593Original591Input","captureAssistantPublic591Input","verifyInstalled593Original591Input","verifyAssistantPublic591Input","verifyInstalled593Original591V2PhaseReceipt","verifyAssistantPublic591V2PhaseReceipt","decideInstalled593Original591Reuse","decideAssistantPublic591Reuse","completeInstalled593Original591Execution","assistantPublic591Runtime","verifyAssistantPublic591Runtime","assistantAfter599NativeReportCollector","verifyAssistantAfter599PhaseReceipt","verifyAssistantAfter598PhaseReceipt","verifyAssistantAfter597PhaseReceipt","verifyScalar597LaterH0PhaseReceipt","verifyInstalled593Original591PhaseReceipt","verifyCurrent586PhaseReceipt","verifyAssistantPublic591SuccessorPhaseReceipt","verifyAssistantPublic590SuccessorPhaseReceipt","verifyAssistantPublic588SuccessorPhaseReceipt","verifyAssistantPublic587SuccessorPhaseReceipt","verifyAssistantLaterH0PhaseReceipt"];
      const sourceDriverNames=["requireInstalled593Original591Release","requireInstalled593Original591Binding","requireInstalled593Original591Output","INSTALLED593_ORIGINAL591_DATABASE_BEFORE","requireAssistantPublic591SuccessorRelease","requireAssistantPublic590SuccessorRelease","requireAssistantPublic588SuccessorRelease","requireAssistantPublic587SuccessorRelease","requireAssistantLaterH0Release"];
      for(const name of nativeDriverNames)assert(Object.hasOwn(native,name),'Actual native export '+name);
      for(const name of sourceDriverNames)assert(Object.hasOwn(source,name),'Actual source export '+name);
      const driver=`import assert from 'node:assert/strict';import path from 'node:path';import {fileURLToPath} from 'node:url';
const native=await import(${JSON.stringify(pathToFileURL(path.resolve('scripts/native-postgres-evidence.mjs')).href)});
const source=await import(${JSON.stringify(pathToFileURL(path.resolve('scripts/lib/assistant-later-h0-successor-source.mjs')).href)});
const ORIGIN=native.ORIGIN,ACTIVE=source.ACTIVE_ASSISTANT_SUCCESSOR;
const {${nativeDriverNames.join(',')}}=native;
const {${sourceDriverNames.join(',')}}=source;
const unselectedSql=()=>{throw Error('SYNTHETIC_CLI_UNSELECTED_SQL_BRANCH');};
const assistantAfter599PhaseIdentity=unselectedSql,accountErasureSourceIdentity=unselectedSql,executeMarkedNative=unselectedSql,
installed593Original591LocalProof=unselectedSql,assistantPublic591LocalProof=unselectedSql,
executeAssistantPublic591Native=unselectedSql,executeScalar597LaterH0=unselectedSql,spawnSync=unselectedSql;
const receipt=${JSON.stringify(reused)},writes=[];let decisions=0;
const proof={headSha:receipt.current.head,repository:ORIGIN.repository,contractId:'weather-source-gate-content-v2',privatePayloadIncluded:false,sourceTreeSha256:'sha256:'+'e'.repeat(64)};
const fs={async readFile(file){assert.equal(file,'.cache/source-tree-content-proof.json');return JSON.stringify(proof);},async writeFile(file,text,options){writes.push({file,value:JSON.parse(text),options});}};
const git=args=>{assert.deepEqual(args,['rev-parse','HEAD^{commit}']);return receipt.current.head;};
const assertCurrentAccountErasureNativeReport=async report=>{assert.deepEqual(await native.assistantAfter599NativeReportProjection(report,{selectedPrograms:receipt.runtime.selectedPrograms}),report);};
async function decideAssistantAfter599Reuse(){assert.equal(process.env.RAVRADAR_SOURCE_NODE24,undefined);decisions++;return receipt;}
${nativeSource.slice(executeStart,recordStart).replace(/^export /,'')}
${nativeSource.slice(recordStart,mainStart)}
${nativeSource.slice(mainStart,entryStart)}
${nativeSource.slice(entryStart)}
assert.equal(decisions,1);assert.equal(writes.length,2);const phase=writes.find(row=>row.file===CURRENT586_PHASE_FILE);
assert.equal(phase.value.schemaVersion,2);assert.equal(phase.value.kind,native.ASSISTANT_AFTER599_REUSE_KIND);
assert.equal(phase.value.nativePostgres.status,'REUSED');assert.equal(phase.value.nativePostgres.executedInThisRun,false);
console.log(JSON.stringify({scope:'SYNTHETIC_NORMAL_CLI_WIRING',decisions,writes:writes.length,sqlExecuted:false}));`;
      await fs.writeFile(entry,driver);
      const stdout=execFileSync(process.execPath,[entry],{encoding:'utf8',timeout:65000,maxBuffer:32768,
        env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,GITHUB_RUN_ID:String(currentReuse.run),GITHUB_RUN_ATTEMPT:'1',
          PULL_REQUEST_NUMBER:String(currentReuse.pullRequest),GITHUB_HEAD_REF:currentReuse.branch,RAVRADAR_SOURCE_NODE24:'synthetic-earlier-sdk-hint'}});
      assert.deepEqual(JSON.parse(stdout),{scope:'SYNTHETIC_NORMAL_CLI_WIRING',decisions:1,writes:2,sqlExecuted:false});
    }finally{await fs.rm(owned,{recursive:true,force:true});}
    t.diagnostic('Typed DATA fixture only; no PostgreSQL, full historical installation or production receipt claimed.');
  });
}


test('after601 receipt accepts the measured whole-history and quota results and refuses old markers',async t=>{
  const native=await import('./native-postgres-evidence.mjs');
  const {INACTIVE_ASSISTANT_AFTER601_SUCCESSOR:profile}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const {SOURCE601_ORIGINAL_DATA_PROFILE}=await import('./check-assistant-later-h0-predecessor-source.mjs');
  const current={...v2Current(),branch:'synthetic-after601-native'};
  const report={
    kind:'ASSISTANT_AFTER601_SUCCESSOR',sourceMigrationInventory:70,databaseBeforeVersion:profile.databaseBefore.version,
    originalStateRelease:601,migrationVersion:profile.migration().version,partCount:673,installedLedgerBeforeRows:69,
    installedLedgerAfterRows:70,beforeGuardCases:17,parentCodeHead:SOURCE601_ORIGINAL_DATA_PROFILE.head,
    allHistoricalMigrationsExecuted:false,productionInstalledHistoryEvidence:false,productionSeedAuthenticated:false,
    sqlIsNotOriginAuthentication:true,sqlExecuted:true,wholeMigrationExecuted:true,exactCheckpointContract:true,
    exactTripContract:true,oldFunctionsAndOidsPreserved:true,allOriginalDefinitionsPreserved:true,originalDigestsPreserved:true,
    trueOld601Fixtures:true,old601ModelNotRetagged:true,currentNormalFixtures:true,wholeMetadataInverse:true,
    strictlyLater601ToNextOnly:true,accountOffCatalogPreserved:true,normalProtectedJsonbRoundtrip:true,
    schema2Catalog:true,predecessorExecutedInSameHost:true,
    intermediateRuntime:{
      old601ActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,nextActiveAfterCompletion:true,
      old601RefusedAfterCompletion:true,wholeHistoryAndDocumentsPreserved:true,quotaFunctionAndAdmissionUnchanged:true,
      quotaServiceRoleWorking:true,
    },
  };
  const receipt={
    schemaVersion:1,kind:native.ASSISTANT_AFTER601_PHASE_KIND,phase:report.kind,sourcePhase:native.ASSISTANT_AFTER601_PHASE,
    current,commands:native.ASSISTANT_AFTER601_COMMANDS,status:'EXECUTED',executedInThisRun:true,origin:null,
    eligibleForReuse:false,binding:profile.requireBinding(),output:profile.requireOutput(),runtime:v2Runtime(),report,
  };
  assert.equal(native.verifyAssistantAfter601PhaseReceipt(receipt,current),receipt);

  const oldMarker=copy(receipt);
  delete oldMarker.report.intermediateRuntime.wholeHistoryAndDocumentsPreserved;
  oldMarker.report.intermediateRuntime.activeDocumentsUnchangedBySql=true;
  assert.throws(()=>native.verifyAssistantAfter601PhaseReceipt(oldMarker,current),/wholeHistoryAndDocumentsPreserved/);
  for(const key of ['quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking']){
    const failed=copy(receipt);
    failed.report.intermediateRuntime[key]=false;
    assert.throws(()=>native.verifyAssistantAfter601PhaseReceipt(failed,current),new RegExp(key));
  }

  const {execFileSync}=await import('node:child_process');
  const realHead=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const exactCurrent={...current,head:realHead};
  const input=await native.captureAssistantAfter601PgInput({ref:realHead,physical:false});
  const {CHECKPOINT_SCALAR_WALK_MIGRATION:append,CHECKPOINT_DISTINCT_PRIVACY_MIGRATION:privacy}=await import('./integrated-cutover-readiness.mjs');
  const readGit=(args,options)=>execFileSync('git',args,{...options,maxBuffer:32*1024*1024});
  const scalarWalk=readGit(['ls-tree',realHead,'--','supabase/migrations/'+append.filename]).length!==0;
  const {TRIP_ERASURE_RECOVERY_MIGRATION}=await import('./lib/trip-erasure-recovery-native-fixture.mjs');
  const tripSql='supabase/migrations/'+TRIP_ERASURE_RECOVERY_MIGRATION;
  const hasTripErasure=readGit(['ls-tree',realHead,'--',tripSql]).length!==0;
  const {ACCOUNT_AUTOMATIC_OFF_MIGRATIONS}=await import('./lib/account-automatic-off-source.mjs');
  const offSql=ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({filename})=>'supabase/migrations/'+filename);
  const automaticOffCount=offSql.filter(file=>readGit(['ls-tree',realHead,'--',file]).length!==0).length;
  const distinctPrivacy=readGit(['ls-tree',realHead,'--','supabase/migrations/'+privacy.filename]).length!==0;
  assert.equal(input.sqlFiles,(scalarWalk?82:81)+Number(hasTripErasure)+automaticOffCount+Number(distinctPrivacy));
  const tripErasureRecovery={migration:TRIP_ERASURE_RECOVERY_MIGRATION,
    migrationSha256:hasTripErasure?cryptoHash('sha256').update(readGit(['cat-file','blob',realHead+':'+tripSql])).digest('hex'):null,
    actualPostgres:true,syntheticSqlHost:true,realGoTrue:false,accountClaimCommitRefusesHold:true,
    priorTripIntentInHeldJournal:true,heldTripAndAccountWritesRefused:true,supabaseObservationWritesRefused:true,
    sameHoldIdRequired:true,productionReleaseVerified:false};
  const checkpointScalarWalk={migrationVersion:append.version,migrationSha256:append.sha256,
    installedLedgerBeforeRows:70,installedLedgerAfterRows:71,
    sqlExecuted:true,checkpointContractExact:true,helperOnlyCatalogChange:true,
    priorDataPreserved:true,forbiddenKeysUnchanged:true,normalCasUnchanged:true};
  const checkpointDistinctPrivacy={migrationVersion:privacy.version,migrationSha256:privacy.sha256,
    installedLedgerBeforeRows:71,installedLedgerAfterRows:72,
    sqlExecuted:true,checkpointContractExact:true,helperOnlyCatalogChange:true,priorDataPreserved:true,
    forbiddenKeysUnchanged:true,normalCasUnchanged:true,integratedPartCount:673,companionPartCount:673};
  const issued={...receipt,current:exactCurrent};
  const v2={...issued,schemaVersion:2,kind:native.ASSISTANT_AFTER601_EXECUTED_V2_KIND,
    nativeInput:input,report:{...report,...(scalarWalk?{checkpointScalarWalk}:{}),
      ...(hasTripErasure?{tripErasureRecovery}:{}),...(distinctPrivacy?{checkpointDistinctPrivacy}:{})}};
  assert.equal(await native.verifyAssistantAfter601ExecutedV2Receipt(v2,exactCurrent,readGit),v2);
  if(automaticOffCount){
    assert.deepEqual(v2.nativeInput.automaticAccountOffMigrationSha256,ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({sha256})=>sha256));
    assert(!Object.hasOwn(v2.report,'automaticAccountOff'));
    const falseExecution=copy(v2);
    falseExecution.report.automaticAccountOff={actualPostgres:true};
    await assert.rejects(native.verifyAssistantAfter601ExecutedV2Receipt(falseExecution,exactCurrent,readGit));
    for(const mutate of [value=>value.nativeInput.sqlFiles=84,
      value=>value.nativeInput.automaticAccountOffMigrationSha256.reverse(),
      value=>value.nativeInput.automaticAccountOffSourceSha256='a'.repeat(64)]){
      const changed=copy(v2);mutate(changed);
      assert.throws(()=>native.verifyAssistantAfter601PgInput(changed.nativeInput));
    }
  }
  if(distinctPrivacy){
    assert.equal(v2.nativeInput.checkpointDistinctPrivacyMigrationSha256,privacy.sha256);
    for(const mutate of [value=>delete value.report.checkpointDistinctPrivacy,
      value=>value.report.checkpointDistinctPrivacy.companionPartCount=672,
      value=>value.report.checkpointDistinctPrivacy.helperOnlyCatalogChange=false,
      value=>value.report.checkpointDistinctPrivacy.normalCasUnchanged=false]){
      const changed=copy(v2);mutate(changed);
      await assert.rejects(native.verifyAssistantAfter601ExecutedV2Receipt(changed,exactCurrent,readGit),
        /checkpoint distinct privacy execution proof/);
    }
  }
  if(scalarWalk){
    assert.throws(()=>native.verifyAssistantAfter601PhaseReceipt(issued,exactCurrent,readGit),/requires exact native V2 execution/);
    const missing=copy(v2);delete missing.report.checkpointScalarWalk;
    await assert.rejects(native.verifyAssistantAfter601ExecutedV2Receipt(missing,exactCurrent,readGit),/execution proof/);
    const unexecuted=copy(v2);unexecuted.report.checkpointScalarWalk.sqlExecuted=false;
    await assert.rejects(native.verifyAssistantAfter601ExecutedV2Receipt(unexecuted,exactCurrent,readGit),/execution proof/);
  }else assert.equal(native.verifyAssistantAfter601PhaseReceipt(issued,exactCurrent,readGit),issued);
  if(hasTripErasure){
    for(const mutate of [value=>delete value.report.tripErasureRecovery,
      value=>value.report.tripErasureRecovery.actualPostgres=false,
      value=>value.report.tripErasureRecovery.supabaseObservationWritesRefused=false,
      value=>value.report.tripErasureRecovery.productionReleaseVerified=true,
      value=>value.report.tripErasureRecovery.migrationSha256='a'.repeat(64)]){
      const changed=copy(v2);mutate(changed);
      await assert.rejects(native.verifyAssistantAfter601ExecutedV2Receipt(changed,exactCurrent,readGit),/trip erasure recovery execution proof/);
    }
  }
  assert.throws(()=>native.verifyAssistantAfter601PhaseReceipt(v2,exactCurrent));
  for(const mutate of [
    value=>value.status='REUSED',
    value=>value.origin={run:receipt.current.run-1},
    value=>value.nativeInput.inputSha256='a'.repeat(64),
    value=>value.runtime.overrides.push('NODE_PATH'),
  ]){
    const changed=copy(v2);mutate(changed);
    await assert.rejects(native.verifyAssistantAfter601ExecutedV2Receipt(changed,exactCurrent));
  }
  await t.test('after601 V2 bounded origin, normal record and FULL decoder preserve honest reuse',async()=>{
    const {verifyCurrentSourceWorkflow,verifyTargetedSourceStepShape,TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES}=await import('./lib/source-impact-workflow-review.mjs');
    const workflow=await fs.readFile(native.WORKFLOW,'utf8');
    const shape=verifyCurrentSourceWorkflow(workflow),nativeSource=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
    const originRunId=current.run+100,currentRunId=originRunId+10,prNumber=999;
    const originCurrent={...exactCurrent,run:originRunId,pullRequest:prNumber};
    const callerCurrent={...originCurrent,run:currentRunId};
    const original={...copy(v2),current:originCurrent};
    const originalBytes=JSON.stringify(original),archive=Buffer.from('SYNTHETIC_V2_TRANSPORT_ONLY');
    const stamp=minute=>'2026-11-26T10:'+String(minute).padStart(2,'0')+':00Z';
    const runFor=(id,status='completed')=>({id,run_attempt:1,head_sha:realHead,head_branch:callerCurrent.branch,
      path:native.WORKFLOW,event:'pull_request',status,conclusion:status==='completed'?'success':null,
      repository:{full_name:native.ORIGIN.repository},head_repository:{full_name:native.ORIGIN.repository},
      pull_requests:status==='in_progress'?[{number:prNumber}]:[],created_at:stamp(id===originRunId?0:30)});
    const jobsFor=r=>({total_count:1,jobs:[{id:r.id+1000,run_id:r.id,run_attempt:1,head_sha:r.head_sha,name:native.JOB,
      status:r.status,conclusion:r.conclusion,steps:shape.stepNames.map((name,index)=>({name,number:index+1,
        status:'completed',conclusion:'success',started_at:stamp(index),completed_at:stamp(index+1)}))}]});
    const artifactFor=r=>({id:r.id+2000,name:'native586-phase-'+r.id+'-1-'+r.head_sha,expired:false,
      size_in_bytes:archive.length,digest:'sha256:'+cryptoHash('sha256').update(archive).digest('hex'),
      workflow_run:{id:r.id,head_sha:r.head_sha},created_at:stamp(shape.nativeUploadNumber)});
    const base='/repos/'+native.ORIGIN.repository,actions=base+'/actions';
    const build=(fault=null)=>{
      const origin=runFor(originRunId),active=runFor(currentRunId,'in_progress'),later=runFor(originRunId+1);
      const transition=typeof fault==='string'&&fault.startsWith('transition-');
      const history=fault==='later-failure'||transition?[active,later,origin]:[active,origin];
      const calls=[];let inputReads=0,historyReads=0,decoding=origin;
      const observedRows=()=>history.map(r=>r.id!==later.id||!transition?r:historyReads<=1
        ?{...r,status:'in_progress',conclusion:null}:fault==='transition-skip'?r:{...r,conclusion:'failure'});
      const get=async route=>{
        calls.push(route);if(fault==='unavailable')throw Error('SYNTHETIC_UNAVAILABLE');
        if(route===base+'/pulls/'+prNumber)return {number:prNumber,state:'open',draft:false,
          base:{ref:'main',repo:{full_name:native.ORIGIN.repository}},head:{sha:realHead,ref:callerCurrent.branch,repo:{full_name:native.ORIGIN.repository}}};
        if(route.includes('/workflows/')){historyReads++;const rows=observedRows();return {total_count:rows.length,workflow_runs:copy(rows)};}
        for(const r of observedRows()){
          if(route===actions+'/runs/'+r.id)return copy(r);
          if(route===actions+'/runs/'+r.id+'/attempts/1/jobs?per_page=100'){
            const jobs=jobsFor(r);if(fault==='later-failure'&&r.id===later.id)
              jobs.jobs[0].steps.find(step=>step.name===native.STEP).conclusion='failure';
            if(transition&&r.id===later.id&&historyReads>1){
              const job=jobs.jobs[0],upload=job.steps.find(step=>step.name===native.CURRENT586_PHASE_UPLOAD);
              if(fault==='transition-upload-failed')upload.conclusion='failure';
              else if(fault==='transition-upload-missing')job.steps=job.steps.filter(step=>step!==upload);
              else if(fault==='transition-native-ok')job.steps.find(step=>step.number===shape.nativeUploadNumber+1).conclusion='failure';
              else if(fault==='transition-skip'){
                const fullOnly=new Set(TARGETED_OWNED_CACHE_NATIVE_SOURCE_STEP_NAMES.slice(9,23));
                for(const step of job.steps)if(fullOnly.has(step.name))step.conclusion='skipped';
                verifyTargetedSourceStepShape(job,workflow);
              }
            }
            return jobs;
          }
          if(route===actions+'/runs/'+r.id+'/artifacts?per_page=100')return {total_count:1,artifacts:[{...artifactFor(r),expired:fault==='expired'}]};
          if(route===actions+'/artifacts/'+(r.id+2000)+'/zip'){decoding=r;return archive;}
          if(route===actions+'/artifacts/'+(r.id+2000))return {...artifactFor(r),expired:fault==='expired'};
        }
        throw Error('UNEXPECTED_SYNTHETIC_ROUTE');
      };
      return {calls,options:{env:{GITHUB_EVENT_NAME:'pull_request',GITHUB_REPOSITORY:native.ORIGIN.repository,
        GITHUB_RUN_ATTEMPT:'1',SOURCE_GATE_HEAD_SHA:realHead,GITHUB_RUN_ID:String(currentRunId),PULL_REQUEST_NUMBER:String(prNumber),GITHUB_HEAD_REF:callerCurrent.branch},
        readGit:(args,input)=>{
          // The fixture has synthetic Actions state; immutable input bytes still
          // come from the real exact Git tree, not the dirty development files.
          if(args[0]==='status'||args[0]==='for-each-ref')return '';
          const raw=execFileSync('git',args,{input,maxBuffer:32*1024*1024});
          return args[0]==='cat-file'||args[0]==='ls-tree'?raw:raw.toString('utf8');
        },get,getInput:async()=>{inputReads++;return {...input,...(fault==='fresh-input'&&inputReads>1?{inputSha256:'f'.repeat(64)}:{})};},
        getRuntime:async()=>({...v2Runtime(),...(fault==='runtime'?{imageVersion:'20261126.999'}:{})}),
        decode:()=>{
          const nativePostgres=fault==='v1'?{...copy(receipt),current:originCurrent}
            :{...copy(original),current:{...originCurrent,run:decoding.id}};
          if(fault==='origin-81')nativePostgres.nativeInput.sqlFiles=81;
          if(fault==='missing-append-proof')delete nativePostgres.report.checkpointScalarWalk;
          if(fault==='false-append-proof')nativePostgres.report.checkpointScalarWalk.sqlExecuted=false;
          return Buffer.from(JSON.stringify({schemaVersion:nativePostgres.schemaVersion,kind:nativePostgres.kind,
            repository:native.ORIGIN.repository,headSha:realHead,sourceTreeSha256:'sha256:'+'e'.repeat(64),
            privatePayloadIncluded:false,nativePostgres}));
        },
      }};
    };
    const fixture=build(),refusals=[];fixture.options.onRefusal=reason=>refusals.push(reason);
    const reused=await native.decideAssistantAfter601Reuse(fixture.options);
    assert(reused,JSON.stringify(refusals));assert.equal(reused.kind,native.ASSISTANT_AFTER601_REUSE_V2_KIND);
    assert.equal(reused.status,'REUSED');assert.equal(reused.executedInThisRun,false);assert.equal(reused.eligibleForReuse,false);
    assert.equal(reused.origin.run,originRunId);assert.equal(reused.origin.artifactId,originRunId+2000);
    assert.equal(JSON.stringify(original),originalBytes,'The authentic EXECUTED_V2 bytes are never retagged');
    assert.equal(await native.verifyAssistantAfter601ReuseV2Receipt(reused,callerCurrent,readGit),reused);
    for(const fault of ['v1','runtime','expired','later-failure','fresh-input','unavailable','transition-upload-failed','transition-upload-missing'])
      assert.equal(await native.decideAssistantAfter601Reuse(build(fault).options),null,fault);
    if(scalarWalk){
      assert.deepEqual(reused.report.checkpointScalarWalk,checkpointScalarWalk);
      for(const fault of ['origin-81','missing-append-proof','false-append-proof'])
        assert.equal(await native.decideAssistantAfter601Reuse(build(fault).options),null,fault);
    }
    for(const state of ['transition-native-ok','transition-skip']){
      const f=build(state),accepted=await native.decideAssistantAfter601Reuse(f.options);
      assert(accepted,state);assert.equal(accepted.origin.run,originRunId,'A later native or skip never replaces the original SQL origin');
      if(state==='transition-native-ok')assert(f.calls.includes(actions+'/artifacts/'+(originRunId+1+2000)+'/zip'));
      else assert(!f.calls.includes(actions+'/artifacts/'+(originRunId+1+2000)+'/zip'));
    }
    const self=copy(reused);self.origin.run=currentRunId;
    await assert.rejects(native.verifyAssistantAfter601ReuseV2Receipt(self,callerCurrent,readGit));
    const extra=copy(reused);extra.origin.unreviewedPayload='SYNTHETIC_FORBIDDEN_FIELD';
    await assert.rejects(native.verifyAssistantAfter601ReuseV2Receipt(extra,callerCurrent,readGit));
    const producerChanged=(args,options)=>args[0]==='ls-tree'&&args[4]==='scripts/native-postgres-evidence.mjs'
      ?Buffer.from('100644 blob '+(args[2]==='1'.repeat(40)?'f':'e').repeat(40)+'\tscripts/native-postgres-evidence.mjs\0'):readGit(args,options);
    const changedProducer=copy(reused);changedProducer.origin.head='1'.repeat(40);
    await assert.rejects(native.verifyAssistantAfter601ReuseV2Receipt(changedProducer,callerCurrent,producerChanged),/AFTER601_PG_PRODUCER_CHANGED/);
    const fullSource=await fs.readFile('scripts/source-impact-full-baseline.mjs','utf8');
    const start=fullSource.indexOf('async function nativeProof('),end=fullSource.indexOf('async function historicalNational(',start);
    assert(start>=0&&end>start);
    const names=['ASSISTANT_AFTER601_PHASE_KIND','ASSISTANT_AFTER601_EXECUTED_V2_KIND','ASSISTANT_AFTER601_REUSE_V2_KIND',
      'ASSISTANT_AFTER599_REUSE_KIND','ASSISTANT_AFTER599_PHASE_KIND','ASSISTANT_AFTER598_PHASE_KIND','ASSISTANT_AFTER597_PHASE_KIND',
      'SCALAR597_LATER_H0_PHASE_KIND','INSTALLED593_ORIGINAL591_V2_KIND','INSTALLED593_ORIGINAL591_PHASE_KIND',
      'ASSISTANT_PUBLIC591_V2_KIND','ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND','verifyAssistantAfter601ReuseV2Receipt'];
    const dependencies={assert,...Object.fromEntries(names.map(name=>[name,native[name]]))};
    const decode=Function(...Object.keys(dependencies),'return ('+fullSource.slice(start,end)+');')(...Object.values(dependencies));
    const proof={schemaVersion:2,kind:reused.kind,repository:native.ORIGIN.repository,headSha:realHead,
      sourceTreeSha256:'sha256:'+'e'.repeat(64),privatePayloadIncluded:false,nativePostgres:reused};
    assert.equal(await decode(proof,{repository:native.ORIGIN.repository,producerHead:realHead,sourceTreeSha256:proof.sourceTreeSha256},callerCurrent,'4.0.603',readGit),reused);
    const execStart=nativeSource.indexOf('async function executeAssistantAfter601Native(){'),recordStart=nativeSource.indexOf('async function record(receipt) {',execStart),mainStart=nativeSource.indexOf('async function main() {',recordStart);
    assert(execStart>=0&&recordStart>execStart&&mainStart>recordStart);
    const writes=[];let decisions=0;
    const normalDependencies={assert,ACTIVE:profile,process:{env:fixture.options.env},
      fs:{readFile:async()=>JSON.stringify({headSha:realHead,repository:native.ORIGIN.repository,contractId:'weather-source-gate-content-v2',privatePayloadIncluded:false,sourceTreeSha256:'sha256:'+'e'.repeat(64)}),
        writeFile:async(file,raw)=>writes.push({file,value:JSON.parse(raw)})},
      git:()=>realHead,ORIGIN:native.ORIGIN,CURRENT586_PHASE_FILE:native.CURRENT586_PHASE_FILE,
      ASSISTANT_AFTER601_PHASE:native.ASSISTANT_AFTER601_PHASE,
      ASSISTANT_AFTER601_PHASE_KIND:native.ASSISTANT_AFTER601_PHASE_KIND,ASSISTANT_AFTER601_EXECUTED_V2_KIND:native.ASSISTANT_AFTER601_EXECUTED_V2_KIND,
      ASSISTANT_AFTER601_REUSE_V2_KIND:native.ASSISTANT_AFTER601_REUSE_V2_KIND,
      decideAssistantAfter601Reuse:async()=>{decisions++;return reused;},verifyAssistantAfter601ReuseV2Receipt:native.verifyAssistantAfter601ReuseV2Receipt};
    await Function(...Object.keys(normalDependencies),nativeSource.slice(execStart,mainStart)+'\nreturn executeAssistantAfter601Native();')(...Object.values(normalDependencies));
    assert.equal(decisions,1);assert.equal(writes.length,2);assert.equal(writes[1].value.nativePostgres.status,'REUSED');
    assert.equal(writes[1].value.nativePostgres.executedInThisRun,false);
    t.diagnostic('Synthetic Actions/transport and normal dispatch only; no SQL, credentials or provider requests.');
  });
});

test('current80 typed receipt requires the exact fresh nine-case result and cannot retag original79',()=>withAuthenticatedReceipt80Source(async root=>{
 const path=await import('node:path'),{pathToFileURL}=await import('node:url'),source=pathToFileURL(root+path.sep);
 const native=await import(new URL('scripts/native-postgres-evidence.mjs',source).href);
 const value=await currentNativeReceiptProtocolData(source);assert(value);
 assert.deepEqual(await native.assertCurrentAccountNativeReceiptNativeReport({accountNativeReceipt:value}),value);
 for(const mutate of [
  r=>delete r.accountNativeReceipt,
  r=>r.accountNativeReceipt.sourceSqlFileCount=79,
  r=>r.accountNativeReceipt.originalSqlScopeCount=80,
  r=>r.accountNativeReceipt.cases=8,
  r=>r.accountNativeReceipt.appendSha256='0'.repeat(64),
  r=>r.accountNativeReceipt.hookBodySha256='0'.repeat(64),
  r=>r.accountNativeReceipt.sqlExecuted=false,
  r=>r.accountNativeReceipt.realGoTrue=true,
  r=>r.accountNativeReceipt.exclusiveHookOnly=false,
  r=>r.accountNativeReceipt.policyActivated=true,
 ]){
  const report={accountNativeReceipt:structuredClone(value)};mutate(report);
  await assert.rejects(native.assertCurrentAccountNativeReceiptNativeReport(report));
 }
}));

test('current80 normal caller dispatches original79 then receipt9 and refuses incomplete results',()=>withAuthenticatedReceipt80Source(async root=>{
 const [caller,decoder]=await Promise.all([fs.readFile('scripts/lib/checkpoint-cas-native-postgres.mjs','utf8'),fs.readFile('scripts/native-postgres-evidence.mjs','utf8')]);
 const begin=caller.indexOf('    if(includeAssistantAfter598Successor||includeAssistantAfter599Successor){');
 const end=caller.indexOf('    completedReport=',begin);assert(begin>0&&end>begin);
 let body=caller.slice(begin,end);
 for(const [exact,replacement] of [
  ["await import('./account-erasure-outbox-native-fixture.mjs')",'fixtures'],
  ["await import('./account-native-activity-receipt-source.mjs')",'sourceExports'],
 ]){assert.equal(body.split(exact).length,2);body=body.replace(exact,replacement);}
 assert(!body.includes('import('),'Unknown owner imports need explicit review');
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const normalOwner=new AsyncFunction('assert','fs','path','accountErasureSchema','repositoryRoot','includeAssistantAfter598Successor','includeAssistantAfter599Successor','psql','runSql','fixtures','sourceExports',
  'let nativePhase,accountErasure,accountInactivity,accountNativeReceipt;\n'+body+'\nreturn {nativePhase,accountErasure,accountInactivity,accountNativeReceipt};');
 const path=await import('node:path'),{pathToFileURL}=await import('node:url'),source=pathToFileURL(root+path.sep);
 const schema=await import(new URL('scripts/verify-account-assistant-schema.mjs',source).href);
 const sourceExports=await import(new URL('scripts/lib/account-native-activity-receipt-source.mjs',source).href);
 const files=(await fs.readdir(path.join(root,'supabase/migrations'))).filter(file=>file.endsWith('.sql'));
 const receiptFilename='20261122200000_account_native_activity_receipt_off.sql',context=sourceExports.currentNativeActivityReceiptSourceContext();assert(context);
 const invoke=async({withReceipt=true,missingNotice=false,wrongDigest=false,wrongFamily=false}={})=>{
  const calls=[],noSql=()=>{throw Error('This dispatch test must not execute SQL');};
  const fixtures={async exerciseAccountErasureOutbox(args){assert.equal(args.psql,noSql);assert.equal(args.runSql,noSql);calls.push('original49/17');
   return {fixtureScope:'SYNTHETIC_DISPATCH_ONLY',...(missingNotice?{}:{inactivityNotice:{fixtureScope:'SYNTHETIC_DISPATCH_ONLY'}})};},
   async exerciseAccountNativeReceipt(args){assert.equal(args.psql,noSql);calls.push('receipt9');return {appendSha256:wrongDigest?'0'.repeat(64):context.migrationSQLSha256,fixtureScope:'SYNTHETIC_DISPATCH_ONLY'};}};
  const value=await normalOwner(assert,{readdir:async()=>withReceipt?files:files.filter(file=>file!==receiptFilename)},path,schema,root,wrongFamily,!wrongFamily,noSql,noSql,fixtures,sourceExports);
  return {value,calls};
 };
 const historical=await invoke({withReceipt:false});assert.deepEqual(historical.calls,['original49/17']);
 assert.equal(historical.value.accountErasure.sourceSqlFileCount,79);assert.equal(historical.value.accountInactivity.sourceSqlFileCount,79);
 assert.equal(historical.value.accountNativeReceipt,undefined);
 const current=await invoke();assert.deepEqual(current.calls,['original49/17','receipt9']);
 assert.equal(historical.value.nativePhase,'ACCOUNT_ERASURE_APP');assert.equal(current.value.nativePhase,'ACCOUNT_NATIVE_RECEIPT_APP80');
 const {nativePostgresFailureDiagnostic}=await import('./lib/checkpoint-cas-native-postgres.mjs');
 assert.deepEqual(nativePostgresFailureDiagnostic('ACCOUNT_NATIVE_RECEIPT_APP80','ERROR: 42601\n'),{phase:'ACCOUNT_NATIVE_RECEIPT_APP80',sqlState:'42601',category:'SQL_SYNTAX'});
 assert.equal(current.value.accountErasure.sourceSqlFileCount,79);assert.equal(current.value.accountInactivity.sourceSqlFileCount,79);
 assert.equal(current.value.accountNativeReceipt.sourceSqlFileCount,80);assert.equal(current.value.accountNativeReceipt.originalSqlScopeCount,79);
 for(const options of [{missingNotice:true},{wrongDigest:true},{wrongFamily:true}])await assert.rejects(invoke(options));
 assert(decoder.includes('await assertCurrentAccountNativeReceiptNativeReport(report);'));
 assert(decoder.includes('await assertCurrentAccountNativeReceiptNativeReport(receipt.report);'));
}));

test('current80 actual PG input includes the pure leaf, refuses partial pairs and excludes the HTTP controller',()=>withAuthenticatedReceipt80Source(async root=>{
 const native=await import('./native-postgres-evidence.mjs'),path=await import('node:path'),os=await import('node:os');
 const temporary=await fs.realpath(os.tmpdir()),dir=await fs.mkdtemp(path.join(temporary,'rr-native80-inputs-'));
 const index=path.join(dir,'index');const {execFileSync}=await import('node:child_process');
 const environment={...process.env,GIT_INDEX_FILE:index,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',
  GIT_AUTHOR_NAME:'Synthetic input fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Synthetic input fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid'};
 const git=(args,input)=>execFileSync('git',args,{input,env:environment,timeout:10000,maxBuffer:4*1024*1024}).toString('utf8').trim();
 const head=AUTHENTIC_RECEIPT80_SOURCE_HEAD,leaf='scripts/lib/account-native-activity-receipt-source.mjs',sql='supabase/migrations/20261122200000_account_native_activity_receipt_off.sql';
 // Each ref has its real ls-tree. Cache only immutable object bytes by the OID
 // obtained from that tree; never reuse an input digest across different trees.
 const trees=new Map(),blobs=new Map(),reads=new Map();
 const realRead=args=>execFileSync('git',args,{env:environment,timeout:10000,maxBuffer:64*1024*1024});
 const treeFor=ref=>{
  if(!trees.has(ref)){
   const raw=realRead(['ls-tree','-rz','--full-tree',ref]);
   trees.set(ref,{raw,rows:new Map(native.parseTree(raw).map(row=>[row[0],row]))});
  }
  return trees.get(ref);
 };
 const readInputGit=args=>{
  if(args[0]==='ls-tree')return treeFor(args.at(-1)).raw;
  if(args[0]==='cat-file'&&args[1]==='blob'){
   const separator=args[2].indexOf(':');assert(separator>0);
   const row=treeFor(args[2].slice(0,separator)).rows.get(args[2].slice(separator+1));assert(row&&row[2]==='blob');
   if(!blobs.has(row[3])){
    const bytes=realRead(['cat-file','blob',row[3]]);
    const actual=cryptoHash('sha1').update(Buffer.from('blob '+bytes.length+'\0')).update(bytes).digest('hex');
    assert.equal(actual,row[3]);blobs.set(row[3],bytes);
   }
   return blobs.get(row[3]);
  }
  const key=JSON.stringify(args);if(!reads.has(key))reads.set(key,realRead(args));
  return reads.get(key).toString('utf8');
 };
 const variant=(file,mode,bytes)=>{
  git(['read-tree',head]);
  if(bytes===null)git(['update-index','--force-remove','--',file]);
  else{const blob=git(['hash-object','-w','--stdin'],bytes);git(['update-index','--add','--cacheinfo',mode+','+blob+','+file]);}
  return git(['commit-tree',git(['write-tree']),'-p',head,'-m','unqualified synthetic input variant']);
 };
 try{
  const current=await native.captureAssistantAfter599PgInput({ref:head,root,readGit:readInputGit});assert.equal(current.sqlFiles,80);assert.equal(current.complete,true);
  assert.deepEqual(await native.captureAssistantAfter599PgInput({ref:head,root}),current,'Batched normal read preserves the entire input identity');
  const leafBytes=await fs.readFile(path.join(root,leaf));const changed=variant(leaf,'100644',Buffer.concat([leafBytes,Buffer.from('\n// synthetic leaf input mutation\n')]));
  const changedInput=await native.captureAssistantAfter599PgInput({ref:changed,physical:false,readGit:readInputGit});assert.notEqual(changedInput.inputSha256,current.inputSha256);
  assert.deepEqual(await native.captureAssistantAfter599PgInput({ref:changed,physical:false}),changedInput);
  const http=variant('scripts/read-fixed-account-activity-hook.mjs','100644',Buffer.concat([await fs.readFile(path.join(root,'scripts/read-fixed-account-activity-hook.mjs')),Buffer.from('\n// synthetic HTTP-only input mutation\n')]));
  assert.deepEqual(await native.captureAssistantAfter599PgInput({ref:http,physical:false,readGit:readInputGit}),current);
  for(const file of [leaf,sql])await assert.rejects(native.captureAssistantAfter599PgInput({ref:variant(file,'100644',null),physical:false,readGit:readInputGit}));
  await assert.rejects(native.captureAssistantAfter599PgInput({ref:variant(leaf,'120000',Buffer.from('foreign-target')),physical:false,readGit:readInputGit}));
  assert.equal(trees.size,6,'Every actual variant tree was independently read');
 }finally{
  assert.equal(path.dirname(path.resolve(dir)),temporary);assert(path.basename(dir).startsWith('rr-native80-inputs-'));
  try{await fs.unlink(index);}catch(error){if(error.code!=='ENOENT')throw error;}
  await fs.rmdir(dir);
 }
}));

test('after601 native input distinguishes a Pages edit from SQL and module-resolution changes', async t => {
  const {captureAssistantAfter601PgInput,parseTree}=await import('./native-postgres-evidence.mjs');
  const {ACTIVE_ASSISTANT_SUCCESSOR}=await import('./lib/assistant-later-h0-successor-source.mjs');
  const {SOURCE601_ORIGINAL_DATA_PROFILE}=await import('./check-assistant-later-h0-predecessor-source.mjs');
  const {execFileSync}=await import('node:child_process');
  const path=await import('node:path'),os=await import('node:os');
  const temporary=await fs.realpath(os.tmpdir());
  const directory=await fs.mkdtemp(path.join(temporary,'rr-after601-inputs-'));
  t.after(async()=>{
    assert.equal(path.dirname(path.resolve(directory)),temporary);
    await fs.rm(directory,{recursive:true,force:true});
  });
  const objectDirectory=path.join(directory,'objects');
  await fs.mkdir(objectDirectory);
  const authority=execFileSync('git',['rev-parse','--path-format=absolute','--git-path','objects'],
    {encoding:'utf8'}).trim();
  const env={...process.env,GIT_INDEX_FILE:path.join(directory,'index'),
    GIT_OBJECT_DIRECTORY:objectDirectory,GIT_ALTERNATE_OBJECT_DIRECTORIES:authority,
    GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',
    GIT_AUTHOR_NAME:'Synthetic source',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
    GIT_COMMITTER_NAME:'Synthetic source',GIT_COMMITTER_EMAIL:'fixture@example.invalid'};
  const rawGit=(args,input)=>execFileSync('git',args,{env,input,timeout:10000,maxBuffer:32*1024*1024});
  const git=(args,input)=>rawGit(args,input).toString('utf8').trim();
  const trees=new Map(),blobs=new Map(),anchors=new Map();
  const treeFor=ref=>{
    if(!trees.has(ref)){
      const raw=rawGit(['ls-tree','-rz','--full-tree',ref]);
      trees.set(ref,{raw,paths:new Map(parseTree(raw).map(row=>[row[0],row[3]]))});
    }
    return trees.get(ref);
  };
  const readGit=args=>{
    if(args[0]==='ls-tree')return treeFor(args.at(-1)).raw;
    if(args[0]==='cat-file'){
      const [ref,file]=args[2].split(':');
      const oid=treeFor(ref).paths.get(file);
      assert(oid);
      if(!blobs.has(oid))blobs.set(oid,rawGit(['cat-file','blob',oid]));
      return blobs.get(oid);
    }
    const key=JSON.stringify(args);
    if(!anchors.has(key))anchors.set(key,git(args));
    return anchors.get(key);
  };
  const head=git(['rev-parse','HEAD']);
  const variant=(file,bytes)=>{
    git(['read-tree',head]);
    if(bytes===null)git(['update-index','--force-remove','--',file]);
    else {
      const blob=git(['hash-object','-w','--stdin'],bytes);
      git(['update-index','--add','--cacheinfo','100644,'+blob+','+file]);
    }
    return git(['commit-tree',git(['write-tree']),'-p',head,'-m','Synthetic PostgreSQL input comparison']);
  };
  const capture=ref=>captureAssistantAfter601PgInput({ref,readGit,physical:false});
  const current=await captureAssistantAfter601PgInput({ref:head,physical:false});
  assert.equal(current.kind,'AFTER601_ACTUAL_PG_INPUT_V1');
  const {CHECKPOINT_SCALAR_WALK_MIGRATION:append,CHECKPOINT_DISTINCT_PRIVACY_MIGRATION:privacy}=await import('./integrated-cutover-readiness.mjs');
  const scalarWalkFile='supabase/migrations/'+append.filename;
  const scalarWalk=treeFor(head).paths.has(scalarWalkFile);
  const {TRIP_ERASURE_RECOVERY_MIGRATION}=await import('./lib/trip-erasure-recovery-native-fixture.mjs');
  const tripMigration='supabase/migrations/'+TRIP_ERASURE_RECOVERY_MIGRATION;
  const tripErasure=treeFor(head).paths.has(tripMigration);
  const {ACCOUNT_AUTOMATIC_OFF_MIGRATIONS}=await import('./lib/account-automatic-off-source.mjs');
  const offSql=ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({filename})=>'supabase/migrations/'+filename);
  const automaticOffSource='scripts/lib/account-automatic-off-source.mjs';
  const automaticOffCount=offSql.filter(file=>treeFor(head).paths.has(file)).length;
  const distinctPrivacyFile='supabase/migrations/'+privacy.filename;
  const distinctPrivacy=treeFor(head).paths.has(distinctPrivacyFile);
  assert.equal(current.sqlFiles,(scalarWalk?82:81)+Number(tripErasure)+automaticOffCount+Number(distinctPrivacy));
  assert.equal(current.complete,true);
  assert.ok(current.frozenGitTrees.some(({head,tree})=>head===SOURCE601_ORIGINAL_DATA_PROFILE.head
    &&tree===SOURCE601_ORIGINAL_DATA_PROFILE.tree));

  const appendTo=(file,text)=>Buffer.concat([readGit(['cat-file','blob',head+':'+file]),Buffer.from(text)]);
  const pages='.github/workflows/reusable-weather-build.yml';
  assert.deepEqual(await capture(variant(pages,appendTo(pages,'\n# Synthetic Pages change\n'))),current);

  const migration='supabase/migrations/'+ACTIVE_ASSISTANT_SUCCESSOR.migration().filename;
  const changedSql=await capture(variant(migration,appendTo(migration,'\n-- Synthetic SQL input change\n')));
  assert.notEqual(changedSql.inputSha256,current.inputSha256);
  await assert.rejects(capture(variant(migration,null)),new RegExp('complete current'+current.sqlFiles));
  if(tripErasure){
    const unchangedCount=await capture(variant(tripMigration,appendTo(tripMigration,'\n-- Synthetic D1 SQL input change\n')));
    assert.notEqual(unchangedCount.tripErasureRecoveryMigrationSha256,current.tripErasureRecoveryMigrationSha256);
    assert.notEqual(unchangedCount.inputSha256,current.inputSha256);
    const predecessor=capture(variant(tripMigration,null));
    if(automaticOffCount)await assert.rejects(predecessor,/require SQL83/);
    else{
      const prior=await predecessor;
      assert.equal(prior.sqlFiles,82);
      assert.equal(prior.tripErasureRecoveryMigrationSha256,undefined);
    }
    await assert.rejects(capture(variant('scripts/lib/trip-erasure-recovery-native-fixture.mjs',null)),/requires its fixture/);
  }
  if(scalarWalk){
    const changedScalar=Buffer.from(readGit(['cat-file','blob',head+':'+scalarWalkFile]));
    changedScalar[0]^=1;
    await assert.rejects(capture(variant(scalarWalkFile,changedScalar)),/scalar-walk SQL input changed/);
    const noScalarWalk=capture(variant(scalarWalkFile,null));
    if(tripErasure)await assert.rejects(noScalarWalk,/requires its fixture and current82 predecessor/);
    else assert.equal((await noScalarWalk).sqlFiles,81);
  }

  if(automaticOffCount){
    assert.deepEqual(current.automaticAccountOffMigrationSha256,ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(({sha256})=>sha256));
    for(const file of [...offSql,automaticOffSource]){
      await assert.rejects(capture(variant(file,null)),/both exact SQL files and the source helper/);
      await assert.rejects(capture(variant(file,appendTo(file,'\n-- changed OFF input\n'))),/Automatic account OFF input changed/);
    }
  }

  if(distinctPrivacy){
    assert.equal(current.checkpointDistinctPrivacyMigrationSha256,privacy.sha256);
    const prior=await capture(variant(distinctPrivacyFile,null));
    assert.equal(prior.sqlFiles,85);
    assert.equal(prior.checkpointDistinctPrivacyMigrationSha256,undefined);
    await assert.rejects(capture(variant(distinctPrivacyFile,appendTo(distinctPrivacyFile,'\n-- changed fixture SQL\n'))),
      /distinct privacy SQL input changed/);
  }

  const scope='js/core/package.json';
  const changedScope=await capture(variant(scope,Buffer.from('{"type":"commonjs"}\n')));
  assert.equal(changedScope.inputSha256,current.inputSha256);
  assert.notDeepEqual(changedScope.packageScopes,current.packageScopes);
  const module='scripts/lib/checkpoint-cas-native-postgres.mjs';
  const changedModule=variant(module,appendTo(module,"\nimport '../weather-source-gate.mjs';\n"));
  await assert.rejects(capture(changedModule),/Unqualified after601 native import/);
});
