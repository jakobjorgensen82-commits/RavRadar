import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import {ORIGIN, WORKFLOW, JOB, STEP, COMMANDS, NEW_NATIVE_BLOCK,
  NON_NATIVE_TEST_INPUTS, NON_NATIVE_PROSE, nativeBlock, parseTree, verifyWorkflow,
  verifyInputTrees, verifyOriginMetadata, verifyOrigin, verifyEnvironment,
  verifyLaterRuns, decideReuse} from './native-postgres-evidence.mjs';

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
