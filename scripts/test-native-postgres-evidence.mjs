import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {ORIGIN, WORKFLOW, JOB, STEP, COMMANDS, NEW_NATIVE_BLOCK,
  NON_NATIVE_TEST_INPUTS, NON_NATIVE_PROSE, nativeBlock, parseTree, verifyWorkflow,
  verifyInputTrees, verifyOriginMetadata, verifyOrigin, verifyEnvironment,
  verifyLaterRuns, decideReuse, verifyCurrentPullRequest, FOLLOWUP_INPUTS} from './native-postgres-evidence.mjs';

const copy = value => structuredClone(value);
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

test('only the two named current map artifact callers are non-native inputs',()=>{
  const callers=['scripts/test-mobile-start-and-live-cache-4.0.74.mjs','scripts/test-current-arrow-land-mask.mjs'];
  for(const file of callers){
    assert.equal(NON_NATIVE_TEST_INPUTS.filter(value=>value===file).length,1);
    const before=[...tree,[file,'100644','blob',oid]],after=[...tree,[file,'100644','blob',newOid]];
    assert.equal(verifyInputTrees(before,after).retainedEntries,tree.length);
    assert.throws(()=>verifyInputTrees(before,after.map(row=>row[0]===file?[file,'120000','blob',newOid]:row)));
    assert.throws(()=>verifyInputTrees(before,tree),'A named UI caller cannot disappear');
  }
  for(const file of ['scripts/test-current-arrow-land-mask-other.mjs','scripts/lib/current-arrow-land-mask.mjs',
    'js/map/current-arrow-land-mask.js'])
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
  const before=parseTree(git(['ls-tree','-rz','--full-tree',ORIGIN.head]));
  const after=parseTree(git(['ls-tree','-rz','--full-tree','HEAD']));
  const readSource=(file,side)=>git(['show',(side==='before'?ORIGIN.head:'HEAD')+':'+file]);
  const result=verifyInputTrees(before,after,readSource);
  const currentMapCallers=['scripts/test-mobile-start-and-live-cache-4.0.74.mjs','scripts/test-current-arrow-land-mask.mjs'];
  // The original3228 inventory included these two source-only UI callers.
  // Account for both actual regular Git entries explicitly; retain every other
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
