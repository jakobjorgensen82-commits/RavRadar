import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {ORIGIN, WORKFLOW, JOB, STEP, COMMANDS, ACCOUNT_STATISTICS_ASSISTANT_COMMANDS, CURRENT586_COMMANDS as CURRENT_COMMANDS,
  CURRENT_COMMANDS as ASSISTANT_LATER_H0_COMMANDS, NATIVE_SCRIPT as ASSISTANT_LATER_H0_SCRIPT, NEW_NATIVE_BLOCK,
  NON_NATIVE_TEST_INPUTS, NON_NATIVE_PROSE, nativeBlock, parseTree, verifyWorkflow,
  verifyInputTrees, verifyOriginMetadata, verifyOrigin, verifyEnvironment,
  verifyLaterRuns, decideReuse, verifyCurrentPullRequest, FOLLOWUP_INPUTS,
  CURRENT586_PHASE_KIND,CURRENT586_PHASE_UPLOAD,CURRENT586_PHASE_UPLOAD_BLOCK,
  ASSISTANT_LATER_H0_PHASE_KIND,verifyAssistantLaterH0PhaseReceipt,
  inverseCurrent586PhaseUpload,verifyCurrent586Workflow,verifyCurrent586Runtime,
  verifyCurrent586PhaseReceipt,verifyCurrent586Metadata,verifyCurrent586Artifact,decideCurrent586Reuse} from './native-postgres-evidence.mjs';

// Keep every whole586 command assertion on its immutable predecessor view.
// The actual new production command is independently checked below.
const NATIVE_SCRIPT='set -euo pipefail\n'+CURRENT_COMMANDS.join('\n')+'\n';
const copy = value => structuredClone(value);
// TEST ONLY. First qualify the whole actual SOURCE caller, then restore only
// its two exact known inverses before the unchanged genuine586 receipt oracle.
import {verifyWorkflow as verifyActualSourceWorkflow,inverseSourceNode24Workflow}
  from './national584-source-evidence.mjs';
function historical586WorkflowView(actual){
  verifyActualSourceWorkflow(actual);
  const historical=inverseSourceNode24Workflow(inverseSourceProducerPhaseUpload(actual));
  verifyCurrent586Workflow(historical,historical);
  return historical;
}

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
  const workflow=historical586WorkflowView(await fs.readFile(WORKFLOW,'utf8'));
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
  const workflow=historical586WorkflowView(await fs.readFile(WORKFLOW,'utf8')),oldId=ORIGIN.run+10,currentId=oldId+2,number=700;
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
  assert.equal(ACTIVE_COMMANDS,SOURCE_PRODUCER_COMMANDS);
  assert.equal(ACTIVE_NATIVE_SCRIPT,SOURCE_PRODUCER_NATIVE_SCRIPT);
  assert.notDeepEqual(ACTIVE_COMMANDS,ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS);
  assert.notDeepEqual(ACTIVE_COMMANDS,ASSISTANT_LATER_H0_COMMANDS);
  const source=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
  const main=source.slice(source.indexOf('async function main() {'));
  assert(main.indexOf('requireAssistantPublic587SuccessorRelease()')<main.indexOf('spawnSync('));
  assert(main.includes("'-c',ACTIVE_NATIVE_SCRIPT]"));
  assert(main.includes("phase:'SOURCE_PRODUCER',eligibleForReuse:false"));
  assert(main.includes('commands:ACTIVE_COMMANDS'));
  assert(!main.includes('await decideReuse('));assert(!main.includes('await decideCurrent586Reuse('));
  const target=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  assert(target.indexOf('requireAssistantPublic587SuccessorRelease();')<target.indexOf('const PART_COUNT ='));
  assert(target.includes("const assistantPublic587SuccessorNative = process.argv.includes('--assistant-public587-successor') || sourceProducerNative;"));
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

// Additive SOURCE receipt guards. No test invokes PostgreSQL or manufactures issuance.
import {SOURCE_PRODUCER_COMMANDS,SOURCE_PRODUCER_NATIVE_SCRIPT,SOURCE_PRODUCER_PHASE_KIND,
  SOURCE_PRODUCER_PHASE_UPLOAD_BLOCK,inverseSourceProducerPhaseUpload,verifySourceProducerPhaseReceipt}
  from './native-postgres-evidence.mjs';
import {SOURCE_PRODUCER_BINDING,requireSourceProducerBinding,requireSourceProducerOutput}
  from './lib/source-producer-successor-source.mjs';

test('SOURCE active native commands append to the complete588 prefix and refuse before evidence I/O',async()=>{
  assert.deepEqual(SOURCE_PRODUCER_COMMANDS,[ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS[0],
    ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS[1]+' --source-producer']);
  assert.equal(SOURCE_PRODUCER_NATIVE_SCRIPT,'set -euo pipefail\n'+SOURCE_PRODUCER_COMMANDS.join('\n')+'\n');
  assert.equal(ACTIVE_COMMANDS,SOURCE_PRODUCER_COMMANDS);
  assert.equal(ACTIVE_NATIVE_SCRIPT,SOURCE_PRODUCER_NATIVE_SCRIPT);
  assert.notEqual(SOURCE_PRODUCER_PHASE_KIND,ASSISTANT_PUBLIC587_SUCCESSOR_PHASE_KIND);
  assert.notEqual(SOURCE_PRODUCER_PHASE_KIND,ASSISTANT_LATER_H0_PHASE_KIND);
  assert.notEqual(SOURCE_PRODUCER_PHASE_KIND,CURRENT586_PHASE_KIND);
  const source=await fs.readFile('scripts/native-postgres-evidence.mjs','utf8');
  const main=source.slice(source.indexOf('async function main() {'));
  const guard=main.indexOf('requireSourceProducerOutput();');
  assert(guard>=0&&guard<main.indexOf('requireAssistantPublic587SuccessorRelease();'));
  assert(guard<main.indexOf('const env=')&&guard<main.indexOf('spawnSync(')&&guard<main.indexOf('await record('));
  assert(main.includes("phase:'SOURCE_PRODUCER',eligibleForReuse:false"));
  assert(main.includes('currentSourceNativeProfileClaimed:false,productionProof:false'));
  assert(!main.includes('await decideReuse(')&&!main.includes('await decideCurrent586Reuse('));
  const target=await fs.readFile('scripts/test-protected-ravscore-continuation-checkpoint.mjs','utf8');
  assert(target.indexOf('requireSourceProducerOutput();')<target.indexOf('const PART_COUNT ='));
  assert(target.includes("const sourceProducerNative = process.argv.includes('--source-producer') || currentSourceNativeProfile;"));
  assert(target.includes('includeSourceProducer: sourceProducerNative'));
});

test('SOURCE receipt refuses UNISSUED before inspecting operands and cannot reuse or impersonate588',()=>{
  const current={run:ORIGIN.run+40,attempt:1,head:newOid,pullRequest:702,branch:'synthetic-source'};
  if(SOURCE_PRODUCER_BINDING===null){
    let reads=0;const poison=new Proxy({},{get(){reads++;throw new Error('UNEXPECTED_OPERAND');}});
    assert.throws(()=>verifySourceProducerPhaseReceipt(poison,poison),/SOURCE_PRODUCER_UNISSUED/);
    assert.equal(reads,0);return;
  }
  const next={phase:'SOURCE_PRODUCER',status:'EXECUTED',executedInThisRun:true,origin:null,
    current,commands:[...SOURCE_PRODUCER_COMMANDS],eligibleForReuse:false,
    sourceProducerBinding:requireSourceProducerBinding(),sourceProducerOutput:requireSourceProducerOutput(),
    currentSourceNativeProfileClaimed:false,productionProof:false};
  assert.equal(verifySourceProducerPhaseReceipt(next,current).status,'EXECUTED');
  assert.throws(()=>verifyAssistantPublic587SuccessorPhaseReceipt(next,current));
  assert.throws(()=>verifyAssistantLaterH0PhaseReceipt(next,current));
  assert.throws(()=>verifyCurrent586PhaseReceipt(next,current));
  for(const mutate of [v=>v.status='REUSED',v=>v.executedInThisRun=false,v=>v.origin={run:current.run-1},
    v=>v.eligibleForReuse=true,v=>v.commands=[...ASSISTANT_PUBLIC587_SUCCESSOR_COMMANDS],
    v=>v.commands=[...ASSISTANT_LATER_H0_COMMANDS],v=>v.current={...current,head:oid},
    v=>v.phase='ASSISTANT_PUBLIC587_SUCCESSOR',v=>v.sourceProducerBinding=null,v=>v.sourceProducerOutput=null,
    v=>v.currentSourceNativeProfileClaimed=true,v=>v.productionProof=true]){
    const changed=copy(next);mutate(changed);
    assert.throws(()=>verifySourceProducerPhaseReceipt(changed,current));
  }
});

test('SOURCE upload inverse is exact, single, and restores the whole older upload block',()=>{
  const current='before\n'+SOURCE_PRODUCER_PHASE_UPLOAD_BLOCK+'after\n';
  assert.equal(inverseSourceProducerPhaseUpload(current),'before\n'+CURRENT586_PHASE_UPLOAD_BLOCK+'after\n');
  for(const bad of [current.replace(SOURCE_PRODUCER_PHASE_UPLOAD_BLOCK,''),
    current+SOURCE_PRODUCER_PHASE_UPLOAD_BLOCK,current+CURRENT586_PHASE_UPLOAD_BLOCK,
    current.replace('name: source-producer-phase-','name: native586-phase-'),
    current.replace('retention-days: 30','retention-days: 31')])
    assert.throws(()=>inverseSourceProducerPhaseUpload(bad));
});

// Pure additive legacy failure observations. No PostgreSQL/provider/process
// execution or admission is performed by these unit cases.
test('legacy Node categories use only actual closed code/name and never arbitrary messages',async()=>{
  const {nativePostgresExceptionCode:classify}=await import('./lib/checkpoint-cas-native-postgres.mjs');
  const codes={ENOENT:'ENOENT',ENOSPC:'ENOSPC',EACCES:'EACCES',EPERM:'EPERM',ENOMEM:'ENOMEM',
    EMFILE:'EMFILE',EPIPE:'EPIPE',ERR_MODULE_NOT_FOUND:'MODULE_NOT_FOUND',MODULE_NOT_FOUND:'MODULE_NOT_FOUND'};
  for(const [code,suffix]of Object.entries(codes))
    assert.equal(classify({code,message:'PRIVATE_PATH_AND_VALUE'}),'NATIVE_POSTGRES_NODE_'+suffix);
  for(const [make,suffix]of [[TypeError,'TYPE_ERROR'],[SyntaxError,'SYNTAX_ERROR'],
    [RangeError,'RANGE_ERROR'],[ReferenceError,'REFERENCE_ERROR']])
    assert.equal(classify(new make('PRIVATE_PATH_AND_VALUE')),'NATIVE_POSTGRES_NODE_'+suffix);
  assert.equal(classify({code:'ERR_ASSERTION',message:'custom\nPRIVATE_ACTUAL_EXPECTED'}),
    'NATIVE_POSTGRES_ASSERTION_FAILED');
  assert.equal(classify({message:'NATIVE_POSTGRES_SQL_COMMAND_FAILED\nPRIVATE_SQL'}),
    'NATIVE_POSTGRES_SQL_COMMAND_FAILED');
  for(const error of [null,undefined,false,0,'ENOENT',{code:'PRIVATE',name:'Error',message:'ENOENT'},
    {message:'NATIVE_POSTGRES_NODE_ENOENT'},{name:'TypeError_PRIVATE'},
    Object.defineProperty({},'code',{get(){throw new Error('PRIVATE_GETTER');}})])
    assert.equal(classify(error),'NATIVE_POSTGRES_UNKNOWN_FAILURE');
});

test('legacy Node observations preserve five fields and the actual outer parser accepts only closed additive enums',async()=>{
  const {nativePostgresExceptionDiagnostic:diagnose,nativePostgresChildFirstFailure:parse}=
    await import('./lib/checkpoint-cas-native-postgres.mjs');
  const phases=['SOURCE_LEGACY_SETUP','SOURCE_LEGACY_PRODUCER','SOURCE_LEGACY_ORIGINALS',
    'SOURCE_LEGACY_RESTORE','SOURCE_LEGACY_UPDATER','SOURCE_LEGACY_SAVE','SOURCE_LEGACY_READBACK',
    'SOURCE_LEGACY_PRODUCER_SETUP',
    'SOURCE_LEGACY_PRODUCER_ARCHIVE',
    'SOURCE_LEGACY_PRODUCER_UPDATER585',
    'SOURCE_LEGACY_PRODUCER_SAVE585',
    'SOURCE_LEGACY_PRODUCER_RESTORE585',
    'SOURCE_LEGACY_PRODUCER_FOLLOWER585',
    'SOURCE_LEGACY_PRODUCER_NATIVE586',
    'SOURCE_LEGACY_PRODUCER_FOLLOWER587',
    'SOURCE_LEGACY_PRODUCER_FOLLOWER588',
    'SOURCE_LEGACY_PRODUCER_SOURCE_METADATA',
    'SOURCE_LEGACY_PRODUCER_FINISH',
  ];
  const codes=['ENOENT','ENOSPC','EACCES','EPERM','ENOMEM','EMFILE','EPIPE','ERR_MODULE_NOT_FOUND','MODULE_NOT_FOUND'];
  const errors=[...codes.map(code=>({code})),...['TypeError','SyntaxError','RangeError','ReferenceError'].map(name=>({name}))];
  for(const phase of phases)for(const fields of errors){
    const observed=await diagnose({...fields,message:'PRIVATE_PATH_AND_VALUE',stack:''},phase);
    assert.deepEqual(Object.keys(observed).sort(),['code','frame','kind','phase','privatePayloadIncluded']);
    assert.equal(observed.kind,'NATIVE_POSTGRES_FIRST_FAILURE');assert.equal(observed.phase,phase);
    assert.equal(observed.frame,null);assert.equal(observed.privatePayloadIncluded,false);
    assert(!JSON.stringify(observed).includes('PRIVATE_PATH_AND_VALUE'));
    const later={...observed,phase:'SOURCE_LEGACY_COMPATIBILITY',
      code:'NATIVE_POSTGRES_SOURCE_LEGACY_COMPATIBILITY_REFUSED'};
    assert.deepEqual(parse(JSON.stringify(observed)+'\n'+JSON.stringify(later),''),observed);
    assert.deepEqual(parse('',JSON.stringify(observed)),observed);
    for(const changed of [{...observed,raw:'PRIVATE'}, {...observed,phase:phase+'_PRIVATE'},
      {...observed,code:'NATIVE_POSTGRES_NODE_PRIVATE'}, {...observed,privatePayloadIncluded:true}])
      assert.equal(parse(JSON.stringify(changed),''),null);
  }
  assert.equal((await diagnose({code:'PRIVATE',stack:''},'PRIVATE')).phase,'UNKNOWN');
});

test('legacy CLI marks real boundaries and catches before its inner transport try without changing the normal routes',async()=>{
  const source=await fs.readFile('scripts/test-source-producer-legacy-compatibility.mjs','utf8');
  const start=source.indexOf('export async function runSourceProducerLegacyCompatibility(){'),
    main=source.indexOf('if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){');
  assert(start>=0&&main>start);
  const body=source.slice(start,main),cli=source.slice(main);
  const boundaries=[
    ['SOURCE_LEGACY_SETUP','  requireSourceProducerOutput();'],
    ['SOURCE_LEGACY_PRODUCER',"  const {produceCurrentSourceNativeInputs}=await load("],
    ['SOURCE_LEGACY_ORIGINALS',"  assert.equal(produced.profile,"],
    ['SOURCE_LEGACY_RESTORE',"    for(const name of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH'"],
    ['SOURCE_LEGACY_UPDATER',"    await load('scripts/update-weather.mjs');"],
    ['SOURCE_LEGACY_SAVE',"    const followerRoot=path.join(produced.workRoot,'saved-legacy-follower');"],
    ['SOURCE_LEGACY_READBACK','    const loaded=await normalS.loadRavScoreContinuationCheckpointForTarget('],
    ['SOURCE_LEGACY_SAVE','    const spec=await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot:ROOT});'],
    ['SOURCE_LEGACY_READBACK',"    const restored=path.join(followerRoot,'restored');"],
  ];
  let cursor=0;
  for(const [phase,normalCall]of boundaries){
    const mark=body.indexOf("sourceLegacyPhase='"+phase+"';",cursor),call=body.indexOf(normalCall,cursor);
    assert(mark>=cursor&&call>mark,'Phase precedes its actual unchanged normal call: '+phase);cursor=call+normalCall.length;
  }
  assert(body.indexOf("sourceLegacyPhase='SOURCE_LEGACY_PRODUCER';")<body.indexOf('let restoreTransport,hasFirst=false;'));
  assert(cli.indexOf('  try{')<cli.indexOf('requireSourceProducerOutput();'));
  assert(cli.includes('catch(error){await emitNativePostgresFirstFailure(error,sourceLegacyPhase);throw error;}'));
  assert(body.includes('}catch(error){hasFirst=true;throw error;}'));
  assert(body.includes("if(cleanup&&!hasFirst)throw cleanup;"));
  assert(body.includes("if(cleanup&&hasFirst)console.error('SOURCE_LEGACY_COMPATIBILITY_CLEANUP_REFUSED');"));
  const python=await fs.readFile('scripts/test-source19-terminal-failure-proof-bank-v17-observer-native.py','utf8');
  const relay=python.slice(python.indexOf('# Whole child files above precede selection.'),
    python.indexOf('break  # The Node parent independently validates every field.'));
  assert(relay.includes("value.get('kind') == 'NATIVE_POSTGRES_FIRST_FAILURE'"));
  assert(relay.includes("print(json.dumps(value, separators=(',', ':')), flush=True)"));
});
