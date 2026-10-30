import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {inverseSourceBeforePostgresWorkflow, SOURCE_BEFORE_POSTGRES_BLOCK}
  from './national584-source-evidence.mjs';
import {ORIGIN, WORKFLOW, JOB, STEP, COMMANDS, ACCOUNT_STATISTICS_ASSISTANT_COMMANDS, CURRENT586_COMMANDS as CURRENT_COMMANDS,
  CURRENT_COMMANDS as ASSISTANT_LATER_H0_COMMANDS, NATIVE_SCRIPT as ASSISTANT_LATER_H0_SCRIPT, NEW_NATIVE_BLOCK,
  NON_NATIVE_TEST_INPUTS, NON_NATIVE_PROSE, nativeBlock, parseTree, verifyWorkflow,
  verifyInputTrees, verifyOriginMetadata, verifyOrigin, verifyEnvironment,
  verifyLaterRuns, decideReuse, verifyCurrentPullRequest, FOLLOWUP_INPUTS,
  CURRENT586_PHASE_KIND,CURRENT586_PHASE_UPLOAD,CURRENT586_PHASE_UPLOAD_BLOCK,
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
      if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false';
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
      if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false';
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
  const workflow=inverseSourceBeforePostgresWorkflow(actualWorkflow);
  assert(actualWorkflow.indexOf('      - name: Validate source contracts')<actualWorkflow.indexOf('      - name: '+STEP));
  assert(actualWorkflow.indexOf(CURRENT586_PHASE_UPLOAD_BLOCK)<actualWorkflow.indexOf('      - name: Validate isolated restart and two ordinary national followers'));
  // The existing586 whole-workflow hash below proves the complete inverse, not a new current hash.
  for(const changed of [
    actualWorkflow.replace('npm run validate:source','true'),
    actualWorkflow.replace('          node scripts/native-postgres-evidence.mjs','          true'),
    actualWorkflow.replace('path: .cache/native-postgres-phase-proof.json','path: .cache/changed.json'),
    actualWorkflow.replace(SOURCE_BEFORE_POSTGRES_BLOCK,''),
    actualWorkflow+SOURCE_BEFORE_POSTGRES_BLOCK,
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
  const workflow=inverseSourceBeforePostgresWorkflow(await fs.readFile(WORKFLOW,'utf8')),
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
    if(args[0]==='rev-parse'&&args[1]==='--is-shallow-repository')return 'false';
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
  if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor'){
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
  if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor')
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor')
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC590_SUCCESSOR_COMMANDS);
  else if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor')
    assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC588_SUCCESSOR_COMMANDS);
  else assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS);
});

test('calendar588 normal source command follows only its source-owned active profile',async()=>{
  const packageData=JSON.parse(await fs.readFile('package.json','utf8'));
  assert.equal(packageData.scripts['test:assistant-later-h0-source'],
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
  for(const [file,expected]of Object.entries(inventories)){
    const actual=await fs.readFile(file,'utf8'),source=historical592ImportSource(actual,file);
    assert.deepEqual([...modelSourceRelativeModuleSpecifiers(source,file)],[...expected],file);
    const actualExpected=Object.hasOwn(reviewedConditions593ImportViews,file)?[...expected,'./bounded-json-writer.mjs']:[...expected];
    assert.deepEqual([...modelSourceRelativeModuleSpecifiers(actual,file)],actualExpected,file);
    for(const changed of [actual+'\n',actual+"\nimport './unreviewed-source.mjs';\n"])
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/,file);
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(source+'\n// unknown changed input\n',file),
      /Whole reviewed model import source changed/,file);
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
test('actual593 native evidence selects exact591 successor commands and rejects older or reused receipts',async()=>{
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,'assistant-public591-successor');
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR.requireRelease(),'4.0.593');
  assert.equal(ACTIVE_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS);
  assert.equal(ACTIVE_NATIVE_SCRIPT,ASSISTANT_PUBLIC591_SUCCESSOR_SCRIPT);
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
    const raw=await fs.readFile(file,'utf8'),old=historical592ImportSource(raw,file);
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
} from './native-postgres-evidence.mjs';
const v2Hash=value=>cryptoHash('sha256').update(value).digest('hex');
const v2Input=()=>({schemaVersion:1,files:140,modules:65,sqlFiles:71,moduleSha256:ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,
  inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),packageMode:{type:'module',version:'4.0.593'},
  frozenGitTrees:copy(ASSISTANT_PUBLIC591_FROZEN)});
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
  const filesystem={readdir:async()=>['15','16','17'],access:async file=>{attempts.push(file);if(file.includes('/16/'))throw new Error('synthetic-unusable');}};
  const run=async(file,args)=>file==='pg_config'?{code:0,stdout:'/usr/lib/postgresql/16/bin\n'}:
    {code:0,stdout:file.split('/').at(-1)+' (PostgreSQL) '+(file.includes('/17/')?'17.6':'15.9')};
  const selected=await chooseActualNativePrograms({platform:'linux',filesystem,run});
  assert.equal(selected.majorVersion,17);assert.equal(selected.psql,'/usr/lib/postgresql/17/bin/psql');
  assert(attempts[0].includes('/16/'));assert(attempts.some(file=>file.includes('/17/')));
  await assert.rejects(chooseActualNativePrograms({platform:'linux',filesystem,run:async(file,args)=>{
    const result=await run(file,args);if(file.endsWith('/17/bin/psql'))result.stdout='psql (PostgreSQL) 18.1';return result;
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

test('593 V2 input capture closes65 modules/four JSON/all71 SQL and excludes named UI/docs/test/script-only deltas',async()=>{
  const {execFileSync}=await import('node:child_process'),cache=new Map(),requests=[];
  const readGit=args=>{const key=JSON.stringify(args);requests.push(args);
    if(!cache.has(key))cache.set(key,execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024}));return cache.get(key);};
  const original=await captureAssistantPublic591Input({readGit});
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
  const nativeFile='scripts/lib/checkpoint-cas-native-postgres.mjs';
  await assert.rejects(captureAssistantPublic591Input({physical:false,readGit:args=>
    readGit(args)+(args[0]==='cat-file'&&args[2]==='HEAD:'+nativeFile?'\n':'')}),/Native closure changed/);
  const sql=[...selected].find(file=>file.startsWith('supabase/migrations/'));
  const sqlChanged=await captureAssistantPublic591Input({physical:false,readGit:args=>
    readGit(args)+(args[0]==='cat-file'&&args[2]==='HEAD:'+sql?'\n':'')});
  assert.throws(()=>verifyAssistantPublic591Input(sqlChanged,original));
  await assert.rejects(captureAssistantPublic591Input({physical:false,readGit:args=>
    args[0]==='rev-parse'&&args[1]===ASSISTANT_PUBLIC591_FROZEN.at(-1).head+'^{tree}'?'d'.repeat(40):readGit(args)}));
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

function v2LiveFixture({laterFailure=false,locator=false}={}){
  const current=v2Current(),originId=ORIGIN.run+500,locatorId=ORIGIN.run+550;
  const originalCurrent={run:originId,attempt:1,head:oid,pullRequest:750,branch:'synthetic-other-branch'};
  const origin={...copy(run),id:originId,head_sha:oid,head_branch:originalCurrent.branch,
    head_repository:{full_name:ORIGIN.repository},pull_requests:[{number:750}],created_at:'2026-10-30T10:00:00Z'};
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
    const native=v2Receipt({run:r.id,attempt:1,head:r.head_sha,pullRequest:r.pull_requests[0].number,branch:r.head_branch});
    if(r.id===locatorId){native.status='REUSED';native.executedInThisRun=false;native.origin={
      run:originId,attempt:1,job:originalJobs.jobs[0].id,head:oid,artifactId:originId+2000,
      artifactDigest:'sha256:'+v2Hash(zip),sourceTreeSha256:'sha256:'+'e'.repeat(64)};}
    return {schemaVersion:2,kind:ASSISTANT_PUBLIC591_V2_KIND,repository:ORIGIN.repository,headSha:r.head_sha,
      sourceTreeSha256:'sha256:'+'e'.repeat(64),privatePayloadIncluded:false,nativePostgres:native};
  };
  const artifactFor=r=>({id:r.id+2000,name:'native586-phase-'+r.id+'-1-'+r.head_sha,expired:false,size_in_bytes:zip.length,
    digest:'sha256:'+v2Hash(zip),created_at:'2026-10-30T10:01:00Z',workflow_run:{id:r.id,head_sha:r.head_sha}});
  const calls=[],fault={};let decoding=origin;
  const rows=[active,...((locator||laterFailure)?[mid]:[]),origin];
  const get=async(route,options={})=>{
    calls.push(route);
    if(route.includes('/pulls/'))return {number:current.pullRequest,state:'open',base:{repo:{full_name:ORIGIN.repository},ref:'main'},
      head:{repo:{full_name:ORIGIN.repository},sha:fault.currentHead?'f'.repeat(40):current.head,ref:current.branch}};
    if(route.includes('/workflows/'))return {total_count:rows.length,workflow_runs:copy(rows)};
    if(route.endsWith('/runs/'+active.id))return copy(active);
    for(const r of [origin,mid]){
      if(route.endsWith('/runs/'+r.id))return {...copy(r),...(fault.attempt?{run_attempt:2}:{})};
      if(route.includes('/runs/'+r.id+'/attempts/1/jobs')){
        const value=copy(r.id===originId?originalJobs:midJobs);
        if(fault.preflight)value.jobs[0].steps[14].conclusion='skipped';
        if(fault.number)value.jobs[0].steps[15].number=15;
        return value;
      }
      if(route.endsWith('/runs/'+r.id+'/artifacts?per_page=100'))return {total_count:1,artifacts:[artifactFor(r)]};
      if(route.endsWith('/artifacts/'+(r.id+2000)+'/zip')){decoding=r;return zip;}
      if(route.endsWith('/artifacts/'+(r.id+2000)))return {...artifactFor(r),...(fault.expired?{expired:true}:{})};
    }
    throw new Error('UNEXPECTED_SYNTHETIC_ROUTE');
  };
  const options={local:v2Receipt(current),get,getRuntime:async()=>v2Runtime(),getInput:async()=>v2Input(),
    readGit:args=>args[0]==='rev-parse'?current.head:'identical reviewed proof/setup control',
    decode:()=>Buffer.from(JSON.stringify(proofFor(decoding)))};
  return {options,calls,fault,origin,originalJobs,zip,proofFor,artifactFor};
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

test('593 V2 artifact is independent phase evidence, never a V1 upgrade or whole-source success',()=>{
  const fixture=v2LiveFixture(),phase=verifyAssistantPublic591Metadata(fixture.origin,fixture.originalJobs);
  const metadata=fixture.artifactFor(fixture.origin),proof=fixture.proofFor(fixture.origin),raw=Buffer.from(JSON.stringify(proof));
  assert.equal(fixture.origin.conclusion,'failure');
  assert.equal(verifyAssistantPublic591Artifact(metadata,fixture.zip,raw,fixture.origin,phase).nativePostgres.status,'EXECUTED');
  for(const mutate of [v=>v.schemaVersion=1,v=>v.kind=ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
    v=>v.nativePostgres.eligibleForReuse=false,v=>v.nativePostgres.status='REUSED',v=>v.headSha=newOid,
    v=>v.privatePayloadIncluded=true]){
    const changed=copy(proof);mutate(changed);assert.throws(()=>verifyAssistantPublic591Artifact(metadata,fixture.zip,Buffer.from(JSON.stringify(changed)),fixture.origin,phase));
  }
  for(const changed of [{...metadata,expired:true},{...metadata,digest:'sha256:'+'f'.repeat(64)},
    {...metadata,name:'native588-phase'},{...metadata,size_in_bytes:65537}])
    assert.throws(()=>verifyAssistantPublic591Artifact(changed,fixture.zip,raw,fixture.origin,phase));
});
