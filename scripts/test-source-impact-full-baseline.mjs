import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import childProcess from 'node:child_process';
import {execFileSync} from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';
import test from 'node:test';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';
import {qualifySourceImpactFullBaseline,SOURCE_IMPACT_FULL_BASELINE_KIND}
  from './source-impact-full-baseline.mjs';
import {sourceTreeContentSha256,sourceTreeProofArtifactName} from './lib/source-tree-content.mjs';
import {PULL_REQUEST_SOURCE_STEPS,PULL_REQUEST_SOURCE_JOB,PULL_REQUEST_SOURCE_WORKFLOW,
  SOURCE_GATE_PRODUCERS,SOURCE_GATE_CONTRACT} from './lib/weather-source-gate.mjs';
import {ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS,ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
  ASSISTANT_PUBLIC591_V2_KIND,ASSISTANT_PUBLIC591_V2_PROFILE,ASSISTANT_PUBLIC591_FROZEN,
  ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,assistantPublic591RootPackageScopes,
  SCALAR597_LATER_H0_PHASE,SCALAR597_LATER_H0_PHASE_KIND,SCALAR597_LATER_H0_COMMANDS}
  from './native-postgres-evidence.mjs';
import {ORIGIN as NATIONAL,COMMAND as NATIONAL_COMMAND,STEP as NATIONAL_STEP,ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,
  SCALAR597_LATER_H0_SOURCE_COMMAND}
  from './national584-source-evidence.mjs';

// All run IDs, objects, APIs and Git operands below are synthetic. These tests
// run no PostgreSQL, source suite, network request, provider or production write.
const copy=value=>structuredClone(value),h=byte=>byte.repeat(40),hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
const repo=NATIONAL.repository,head=h('a'),merge=h('b'),candidate=h('c'),tree=h('d'),blob=h('e');
const runId=50000000001,pr=999,jobId=50000000002;
const current={run:runId,attempt:1,head,pullRequest:pr,branch:'codex/synthetic-full-baseline'};
const gitCalls=[];
function readGit(args,options){
  gitCalls.push(args);
  if(args[0]==='merge-base')return Buffer.alloc(0);
  if(args.join(' ')==='rev-parse HEAD')return Buffer.from(candidate+'\n');
  if(args.join(' ')==='rev-parse --is-shallow-repository')return Buffer.from('false\n');
  if(args[0]==='status'||args[0]==='for-each-ref')return Buffer.alloc(0);
  if(args[0]==='rev-parse'&&args[1].endsWith('^{tree}'))return Buffer.from(tree+'\n');
  if(args[0]==='ls-tree')return Buffer.from('100644 blob '+blob+'\tpackage.json\0');
  if(args[0]==='cat-file'&&args[1]==='blob'&&args[2].endsWith(':package.json'))
    return Buffer.from(JSON.stringify({version:'4.0.593'}));
  if(args[0]==='cat-file'){
    assert.equal(options.input.toString(),blob+'\n');return Buffer.from(blob+' blob 2\n{}\n');
  }
  throw Error('UNEXPECTED_GIT');
}
const sourceTreeSha256=sourceTreeContentSha256(merge,{git:readGit});
const stamp=minute=>'2026-10-30T12:'+String(minute).padStart(2,'0')+':00Z';
const step=(name,number,start=number,end=number)=>({name,number,status:'completed',conclusion:'success',
  started_at:stamp(start),completed_at:stamp(end)});
function zip(raw,name){
  return execFileSync('python',['-c',
    'import io,sys,zipfile; b=io.BytesIO(); z=zipfile.ZipFile(b,"w",compression=zipfile.ZIP_DEFLATED); z.writestr(sys.argv[1],sys.stdin.buffer.read()); z.close(); sys.stdout.buffer.write(b.getvalue())',name],
  {input:raw,maxBuffer:65536,timeout:10000,stdio:['pipe','pipe','pipe']});
}
function fixture({v2=false,reused=false,installed594=false,installed594V2=false}={}){
  const native={phase:'ASSISTANT_PUBLIC591_SUCCESSOR',commands:[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,current:copy(current)};
  if(v2||installed594V2)Object.assign(native,{schemaVersion:2,kind:ASSISTANT_PUBLIC591_V2_KIND,profile:ASSISTANT_PUBLIC591_V2_PROFILE,
    eligibleForReuse:true,nativeInput:{schemaVersion:1,files:140,modules:65,sqlFiles:71,
      moduleSha256:ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),
      packageMode:{type:'module',version:'4.0.593'},packageScopes:assistantPublic591RootPackageScopes(),
      frozenGitTrees:copy(ASSISTANT_PUBLIC591_FROZEN)},runtime:{platform:'linux',arch:'x64',imageOS:'ubuntu24',
      imageVersion:'20261012.334.1',node:'v22.23.3',python:'Python 3.12.15',
      pythonLocation:'/opt/hostedtoolcache/Python/3.12.15/x64',
      ldLibraryPath:'/opt/hostedtoolcache/Python/3.12.15/x64/lib',pgBindir:'/usr/lib/postgresql/16/bin',
      git:'git version 2.55.0',overrides:[],selectedPrograms:{schemaVersion:1,majorVersion:16,
        files:['initdb','pg_ctl','psql','postgres'].map(name=>({name,path:'/usr/lib/postgresql/16/bin/'+name,
          realpath:'/usr/lib/postgresql/16/bin/'+name,mode:0o755,bytes:100,sha256:'c'.repeat(64),
          version:name+' (PostgreSQL) 16.10'}))}}});
  if(installed594||installed594V2){assert(!v2&&(!reused||installed594V2));Object.assign(native,{schemaVersion:1,kind:INSTALLED593_ORIGINAL591_PHASE_KIND,
    phase:'INSTALLED593_ORIGINAL591_SUCCESSOR',sourcePhase:'assistant-installed593-origin591-successor',
    releaseVersion:requireInstalled593Original591Release(),binding:copy(requireInstalled593Original591Binding()),
    output:copy(requireInstalled593Original591Output()),databaseBefore:copy(INSTALLED593_ORIGINAL591_DATABASE_BEFORE),
    commands:[...INSTALLED593_ORIGINAL591_COMMANDS]});
    if(installed594V2)Object.assign(native,{schemaVersion:2,kind:INSTALLED593_ORIGINAL591_V2_KIND,
      profile:INSTALLED593_ORIGINAL591_V2_PROFILE,eligibleForReuse:true,
      nativeInput:{schemaVersion:1,files:143,modules:66,sqlFiles:72,moduleSha256:INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256,
        inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),packageMode:{type:'module',version:'4.0.594'},
        packageScopes:installed593Original591RootPackageScopes(),frozenGitTrees:copy(INSTALLED593_ORIGINAL591_FROZEN)}});}
  const national={status:'EXECUTED',executedInThisRun:true,origin:null,command:NATIONAL_COMMAND,
    sourceScope:'HISTORICAL_584_NATIONAL_ONLY',frozenHead:NATIONAL.head,frozenTree:NATIONAL.tree,
    historicalInput:{head:NATIONAL.head,tree:NATIONAL.tree,content:NATIONAL.content},
    current:{head,run:runId,attempt:1,pullRequest:pr},providerOrProductionProof:false,
    current585NationalExecutionClaimed:false,current586NationalExecutionClaimed:false,
    currentAssistantLaterH0NationalExecutionClaimed:false,currentAssistantPublic587SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic588SuccessorNationalExecutionClaimed:false,currentAssistantPublic591SuccessorNationalExecutionClaimed:false,
    currentAssistantPublic591SuccessorNative:{status:native.status,executedInThisRun:native.executedInThisRun,
      origin:native.origin,phase:'assistant-public591-successor',eligibleForReuse:native.eligibleForReuse,separatelyRequired:true},
    currentAssistantPublic591SuccessorSource:{command:'npm run test:assistant-later-h0-source',
      actualCommand:ASSISTANT_PUBLIC591_SUCCESSOR_SOURCE_COMMAND,separatelyRequired:true}};
  if(reused){
    assert(v2||installed594V2);Object.assign(native,{status:'REUSED',executedInThisRun:false,origin:{run:runId-1,attempt:1,
      job:jobId-1,head:h('f'),artifactId:50000000000,artifactDigest:'sha256:'+'d'.repeat(64),sourceTreeSha256}});
    Object.assign(national,{status:'REUSED',executedInThisRun:false,origin:copy(NATIONAL),
      sourceScope:'HISTORICAL_584_ONLY',artifactSha256:NATIONAL.zipSha256,
      branchAudits:[{branch:NATIONAL.branch,runs:1,complete:true}]});
    Object.assign(national.currentAssistantPublic591SuccessorNative,{status:native.status,
      executedInThisRun:native.executedInThisRun,origin:copy(native.origin)});
  }
  if(installed594||installed594V2){
    delete national.currentAssistantPublic591SuccessorNative;delete national.currentAssistantPublic591SuccessorSource;
    Object.assign(national,installed593Original591NativeClaims(native,current),{
      currentInstalled593Original591SuccessorNationalExecutionClaimed:false,
      currentInstalled593Original591SuccessorSource:{command:'npm run test:assistant-later-h0-source',
        actualCommand:INSTALLED593_ORIGINAL591_SOURCE_COMMAND,separatelyRequired:true}});
  }
  const full={schemaVersion:1,contractId:SOURCE_GATE_CONTRACT,repository:repo,pullRequestNumber:pr,
    headSha:head,sourceTreeSha256,privatePayloadIncluded:false,nativePostgres:native,historical584National:national};
  const phase={schemaVersion:v2||installed594V2?2:1,kind:installed594V2?INSTALLED593_ORIGINAL591_V2_KIND:installed594?INSTALLED593_ORIGINAL591_PHASE_KIND:v2?ASSISTANT_PUBLIC591_V2_KIND:ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
    repository:repo,headSha:head,sourceTreeSha256,privatePayloadIncluded:false,nativePostgres:copy(native)};
  const job={id:jobId,run_id:runId,run_attempt:1,head_sha:head,name:PULL_REQUEST_SOURCE_JOB,status:'completed',conclusion:'success',
    steps:Array.from({length:22},(_,i)=>step('Synthetic setup '+(i+1),i+1))};
  for(const [number,name] of [[3,PULL_REQUEST_SOURCE_STEPS[0]],[15,PULL_REQUEST_SOURCE_STEPS[1]],
    [16,PULL_REQUEST_SOURCE_STEPS[2]],[17,'Upload independently completed native586 PostgreSQL phase'],
    [18,NATIONAL_STEP],[19,'Validate durable Copernicus current-reference baseline on artificial data only'],
    [20,'Validate download-inclusive DMI capacity on artificial data only'],[21,PULL_REQUEST_SOURCE_STEPS[3]],
    [22,PULL_REQUEST_SOURCE_STEPS[4]]])job.steps[number-1]=step(name,number,number-1,number);
  const run={id:runId,run_attempt:1,head_sha:head,head_branch:current.branch,path:PULL_REQUEST_SOURCE_WORKFLOW,
    event:'pull_request',status:'completed',conclusion:'success',repository:{full_name:repo},head_repository:{full_name:repo},pull_requests:[]};
  const pull={number:pr,state:'closed',merged_at:stamp(23),merge_commit_sha:merge,head:{sha:head,repo:{full_name:repo}},
    base:{ref:'main',repo:{full_name:repo}}};
  const f={full,phase,job,run,pull,json:new Map(),zips:new Map(),zipCalls:[],jsonCalls:[],reference:null};
  function rebuild(){
    const rawFinal=Buffer.from(JSON.stringify(full)+'\n'),rawNative=Buffer.from(JSON.stringify(phase)+'\n');
    const zipFinal=zip(rawFinal,'source-tree-content-proof.json'),zipNative=zip(rawNative,'native-postgres-phase-proof.json');
    f.reference={repository:repo,mergeCommit:merge,producerHead:head,sourceTreeSha256,pullRequest:pr,
      runId,runAttempt:1,jobId,finalArtifactId:50000000004,finalArtifactDigest:'sha256:'+hash(zipFinal),
      finalProofSha256:hash(rawFinal),nativeArtifactId:50000000003,nativeArtifactDigest:'sha256:'+hash(zipNative)};
    const base='/repos/'+repo+'/actions';
    f.json.set(base+'/runs/'+runId,run);f.json.set('/repos/'+repo+'/pulls/'+pr,pull);
    f.json.set(base+'/runs/'+runId+'/attempts/1/jobs?per_page=100',{total_count:1,jobs:[job]});
    for(const [,producer] of Object.entries(SOURCE_GATE_PRODUCERS))
      f.json.set(base+'/workflows/'+producer.workflowId+'/runs?head_sha='+merge+'&branch=main&per_page=100&page=1',
        {total_count:0,workflow_runs:[]});
    for(const [kind,id,body,name,created] of [['native',f.reference.nativeArtifactId,zipNative,
      'native586-phase-'+runId+'-1-'+head,stamp(17)],['final',f.reference.finalArtifactId,zipFinal,
      sourceTreeProofArtifactName({pullRequestNumber:pr,headSha:head,sourceTreeSha256}),stamp(22)]]){
      const route=base+'/artifacts/'+id;
      f.json.set(route,{id,name,size_in_bytes:body.length,digest:'sha256:'+hash(body),expired:false,
        workflow_run:{id:runId,head_sha:head},created_at:created});f.zips.set(route+'/zip',body);
    }
  }
  f.rebuild=rebuild;rebuild();
  f.dependencies={readGit:(args,options)=>args[0]==='cat-file'&&args[1]==='blob'&&args[2].endsWith(':package.json')
    ?Buffer.from(JSON.stringify({version:installed594||installed594V2?'4.0.594':'4.0.593'}))
    :readGit(args,options),getJson:async route=>{f.jsonCalls.push(route);assert(f.json.has(route),route);return copy(f.json.get(route));},
    getArtifactZip:async(route,options)=>{f.zipCalls.push(route);assert.equal(options.maxBytes,65536);
      assert(options.signal instanceof AbortSignal);assert(f.zips.has(route),route);return Buffer.from(f.zips.get(route));}};
  f.qualify=()=>qualifySourceImpactFullBaseline({reference:f.reference,candidateCommit:candidate},f.dependencies);
  return f;
}

test('actual normal gate plus bound artifact bodies qualify V1 and V2 full ancestors without upgrading scope',async()=>{
  for(const options of [{v2:false},{v2:true},{v2:true,reused:true}]){
    const f=fixture(options);const result=await f.qualify();
    assert.equal(result.kind,SOURCE_IMPACT_FULL_BASELINE_KIND);assert.equal(result.scope,'FULL_SOURCE');
    assert.equal(result.historicalNationalScope,'HISTORICAL_584_NATIONAL_ONLY');assert.equal(result.providerOrProductionProof,false);
    assert.equal(result.gitTree,tree);assert.deepEqual(Object.fromEntries(Object.keys(f.reference).map(k=>[k,result[k]])),f.reference);
    assert.equal(f.zipCalls.length,2);assert(gitCalls.some(args=>args.join(' ')===`merge-base --is-ancestor ${merge} ${candidate}`));
    assert.equal(f.phase.nativePostgres.schemaVersion,options.v2?2:undefined);
    assert.equal(f.full.nativePostgres.executedInThisRun,!options.reused);
  }
});

test('source-only/main locators, foreign identities and incomplete or non-green deep steps cannot be a FULL baseline',async()=>{
  const mutations=[f=>f.reference.proofKind='main',f=>f.reference.runAttempt=2,f=>f.reference.repository='other/repo',
    f=>f.run.head_repository.full_name='other/repo',f=>f.pull.merged_at=null,f=>f.pull.merge_commit_sha=h('f'),
    f=>f.job.id++,f=>f.job.steps[15].conclusion='skipped',f=>f.job.steps[17].conclusion='skipped',
    f=>f.job.steps[18].conclusion='failure',f=>f.job.steps[21].status='in_progress',
    f=>f.job.steps.push(copy(f.job.steps[17])),f=>f.job.steps[17].number=99];
  for(const mutate of mutations){
    const f=fixture();mutate(f);assert.equal((await f.qualify()).status,'REFUSED');assert.equal(f.zipCalls.length,0);
  }
});

test('artifact metadata is checked before download and expired/wrong-name/wrong-attempt origins are refused',async()=>{
  for(const mutate of [m=>m.expired=true,m=>m.workflow_run.id++,m=>m.workflow_run.head_sha=h('f'),
    m=>m.name='ravradar-source-impact-targeted-v1',m=>m.size_in_bytes=65537,m=>m.created_at=stamp(1)]){
    const f=fixture(),route='/repos/'+repo+'/actions/artifacts/'+f.reference.nativeArtifactId;
    mutate(f.json.get(route));assert.equal((await f.qualify()).status,'REFUSED');assert.equal(f.zipCalls.length,0);
  }
});

test('changed ZIP, dishonest JSON, N/A, and current-national or production claims are rejected even with new matching transport hashes',async()=>{
  for(const mutate of [f=>f.full.historical584National.providerOrProductionProof=true,
    f=>f.full.historical584National.currentAssistantPublic591SuccessorNationalExecutionClaimed=true,
    f=>f.full.historical584National.status='NOT_APPLICABLE',f=>f.full.historical584National.current.head=h('f'),
    f=>f.full.nativePostgres.status='NOT_APPLICABLE',f=>f.phase.nativePostgres.status='REUSED',
    f=>f.full.contractId='RAVRADAR_SOURCE_IMPACT_TARGETED_V1',f=>f.full.qualification={scope:'TARGETED'},
    f=>f.full.headSha=h('f')]){
    const f=fixture();mutate(f);f.rebuild();assert.equal((await f.qualify()).status,'REFUSED');
  }
  const f=fixture();const route='/repos/'+repo+'/actions/artifacts/'+f.reference.nativeArtifactId+'/zip';
  f.zips.get(route)[0]^=1;assert.equal((await f.qualify()).status,'REFUSED');
});

test('historical FULL source uses committed objects despite current tracked runtime hydration',async()=>{
  const f=fixture(),normal=f.dependencies.readGit;let statusReads=0;
  f.dependencies.readGit=(args,options)=>{
    if(args[0]==='status'){statusReads++;return Buffer.from(' M data/water-level-station-routing.json\n');}
    return normal(args,options);
  };
  assert.equal((await f.qualify()).kind,SOURCE_IMPACT_FULL_BASELINE_KIND);
  assert.equal(statusReads,0);assert.equal(f.zipCalls.length,2);
});

test('missing Git ancestor, replaced refs, wrong HEAD and later conflicting exact-main evidence cannot yield targeted authority',async()=>{
  for(const bad of ['merge-base','for-each-ref','rev-parse HEAD']){
    const f=fixture(),original=f.dependencies.readGit;
    f.dependencies.readGit=(args,options)=>{if(args[0]===bad||args.join(' ')===bad){
      if(bad==='for-each-ref')return Buffer.from('refs/replace/synthetic\n');
      if(bad==='rev-parse HEAD')return Buffer.from(h('f'));throw Error('NO_ANCESTOR');}
      return original(args,options);};
    assert.equal((await f.qualify()).status,'REFUSED');assert.equal(f.zipCalls.length,0);
  }
  const f=fixture(),producer=Object.values(SOURCE_GATE_PRODUCERS)[0];
  f.json.set('/repos/'+repo+'/actions/workflows/'+producer.workflowId+'/runs?head_sha='+merge+'&branch=main&per_page=100&page=1',
    {total_count:1,workflow_runs:[{id:runId+9,run_attempt:1,head_sha:merge,head_branch:'main',
      path:'.github/workflows/update-and-deploy.yml',repository:{full_name:repo},updated_at:stamp(30),conclusion:'failure'}]});
  f.json.set('/repos/'+repo+'/actions/runs/'+(runId+9)+'/attempts/1/jobs?per_page=100',
    {total_count:1,jobs:[{name:producer.gates[0].job,run_id:runId+9,run_attempt:1,head_sha:merge,conclusion:'failure',
      steps:[{name:producer.gates[0].step,status:'completed',conclusion:'failure',completed_at:stamp(29)}]}]});
  assert.equal((await f.qualify()).status,'REFUSED');assert.equal(f.zipCalls.length,0);
});

test('late run-attempt or artifact drift is refused and transport gets fixed bounds only',async()=>{
  for(const kind of ['run','artifact']){
    const f=fixture(),normal=f.dependencies.getJson;let read=0;
    const route=kind==='run'?'/repos/'+repo+'/actions/runs/'+runId:
      '/repos/'+repo+'/actions/artifacts/'+f.reference.finalArtifactId;
    f.dependencies.getJson=async(r,options)=>{assert.equal(options.maxBytes,2*1024*1024);
      const value=await normal(r);if(r===route&&++read===2){if(kind==='run')value.run_attempt=2;else value.expired=true;}return value;};
    assert.equal((await f.qualify()).status,'REFUSED');assert.equal(f.zipCalls.length,2);
  }
});

test('whole-call60s acceptance deadline limits the final I/O timer and refuses late async, Python or Git results without sleeping',async t=>{
  let now=0;const delays=[],normalTimer=globalThis.setTimeout;
  t.mock.method(performance,'now',()=>now);
  t.mock.method(globalThis,'setTimeout',(callback,delay,...args)=>{
    delays.push(delay);return normalTimer(callback,delay,...args);
  });
  try{
    // A reader used59s. Every subsequent I/O gets only the remaining1s,
    // including the final metadata read, and may still qualify if all is timely.
    const within=fixture(),normal=within.dependencies.getJson;let first=true;
    within.dependencies.getJson=async(...args)=>{const value=await normal(...args);if(first){first=false;now=59000;}return value;};
    assert.equal((await within.qualify()).kind,SOURCE_IMPACT_FULL_BASELINE_KIND);
    assert.equal(delays[0],15000);assert(delays.slice(1).every(delay=>delay===1000));

    // The last read started inside the window and returned at/after its end.
    // No following API request is needed to discover that it is too late.
    now=0;const late=fixture(),read=late.dependencies.getJson;let finalReads=0;
    const finalRoute='/repos/'+repo+'/actions/artifacts/'+late.reference.finalArtifactId;
    late.dependencies.getJson=async(...args)=>{const value=await read(...args);
      if(args[0]===finalRoute&&++finalReads===2)now=60000;return value;};
    assert.equal((await late.qualify()).status,'REFUSED');assert.equal(late.zipCalls.length,2);

    // The timer actually aborts a non-resolving read using its remaining1s,
    // driven immediately through a test callback rather than a real wait.
    now=0;const timed=fixture(),timedRead=timed.dependencies.getJson;let count=0,abortObserved=false;
    timed.dependencies.getJson=async(route,options)=>{
      if(++count===1){const value=await timedRead(route,options);now=59000;return value;}
      options.signal.addEventListener('abort',()=>{abortObserved=true;});return new Promise(()=>{});
    };
    const timerMock=t.mock.method(globalThis,'setTimeout',(callback,delay,...args)=>{
      if(count===2){assert.equal(delay,1000);queueMicrotask(()=>{now=60000;callback();});return normalTimer(()=>{},0);}
      return normalTimer(callback,delay,...args);
    });
    assert.equal((await timed.qualify()).status,'REFUSED');assert.equal(abortObserved,true);timerMock.mock.restore();

    // Initial Git work is part of the same deadline, not free setup time.
    now=0;const initial=fixture(),initialGit=initial.dependencies.readGit;
    initial.dependencies.readGit=(...args)=>{const value=initialGit(...args);now=60001;return value;};
    assert.equal((await initial.qualify()).status,'REFUSED');assert.equal(initial.jsonCalls.length,0);

    // The last local freshness check cannot produce authority after60s.
    now=0;const finalGit=fixture(),git=finalGit.dependencies.readGit;let heads=0;
    finalGit.dependencies.readGit=(args,options)=>{const value=git(args,options);
      if(args.join(' ')==='rev-parse HEAD'&&++heads===2)now=60001;return value;};
    assert.equal((await finalGit.qualify()).status,'REFUSED');assert.equal(finalGit.zipCalls.length,2);

    // Synchronous ZIP decoding also gets the remaining timeout and is checked
    // after return. Its result cannot qualify merely because JS timers waited.
    now=0;const decoded=fixture(),zipReader=decoded.dependencies.getArtifactZip;
    decoded.dependencies.getArtifactZip=async(...args)=>{const value=await zipReader(...args);now=59000;return value;};
    const execute=childProcess.execFileSync;let decodeTimeout;
    t.mock.method(childProcess,'execFileSync',(...args)=>{
      decodeTimeout=args[2].timeout;const value=execute(...args);now=60001;return value;
    });
    syncBuiltinESMExports();
    assert.equal((await decoded.qualify()).status,'REFUSED');assert.equal(decodeTimeout,1000);
  }finally{t.mock.restoreAll();syncBuiltinESMExports();}
});


import {INSTALLED593_ORIGINAL591_PHASE_KIND,INSTALLED593_ORIGINAL591_COMMANDS} from './native-postgres-evidence.mjs';
import {INSTALLED593_ORIGINAL591_DATABASE_BEFORE,requireInstalled593Original591Release,
  requireInstalled593Original591Binding,requireInstalled593Original591Output} from './lib/assistant-later-h0-successor-source.mjs';
import {INSTALLED593_ORIGINAL591_SOURCE_COMMAND,installed593Original591NativeClaims} from './national584-source-evidence.mjs';
test('installed593 new594 normal FULL baseline qualifies its own executed proof and refuses retagged593 or reused claims',async()=>{
  const accepted=fixture({installed594:true});assert.equal((await accepted.qualify()).kind,SOURCE_IMPACT_FULL_BASELINE_KIND);
  for(const mutate of [f=>f.phase.kind=ASSISTANT_PUBLIC591_SUCCESSOR_PHASE_KIND,
    f=>f.phase.schemaVersion=2,f=>f.phase.nativePostgres.schemaVersion=2,
    f=>f.phase.nativePostgres.status='REUSED',f=>f.phase.nativePostgres.eligibleForReuse=true,
    f=>f.phase.nativePostgres.commands=[...ASSISTANT_PUBLIC591_SUCCESSOR_COMMANDS],
    f=>f.full.nativePostgres.binding.I='f'.repeat(64),
    f=>f.full.historical584National.currentInstalled593Original591SuccessorNationalExecutionClaimed=true,
    f=>f.full.historical584National.current593PredecessorNative.executedInThisRun=false,
    f=>f.full.historical584National.currentInstalled593Original591SuccessorNative.phase='assistant-public591-successor']){
    const f=fixture({installed594:true});mutate(f);f.rebuild();assert.equal((await f.qualify()).status,'REFUSED');
  }
});


import {INSTALLED593_ORIGINAL591_V2_KIND,INSTALLED593_ORIGINAL591_V2_PROFILE,
  INSTALLED593_ORIGINAL591_REVIEWED_MODULE_SHA256,INSTALLED593_ORIGINAL591_FROZEN,
  installed593Original591RootPackageScopes} from './native-postgres-evidence.mjs';
test('594 V2 FULL normal caller binds both new proofs and all seven executed/reused native claims',async()=>{
  for(const reused of [false,true]){
    const accepted=fixture({installed594V2:true,reused}),result=await accepted.qualify();
    assert.equal(result.kind,SOURCE_IMPACT_FULL_BASELINE_KIND);assert.equal(result.scope,'FULL_SOURCE');
    assert.equal(accepted.full.nativePostgres.executedInThisRun,!reused);assert.equal(accepted.zipCalls.length,2);
    for(const mutate of [f=>f.phase.kind=ASSISTANT_PUBLIC591_V2_KIND,f=>f.phase.schemaVersion=1,
      f=>f.phase.nativePostgres.schemaVersion=1,f=>f.full.nativePostgres.nativeInput=v2Synthetic593Input(),
      f=>f.phase.nativePostgres.nativeInput.controlsSha256='f'.repeat(64),
      f=>f.full.nativePostgres.databaseBefore.I='f'.repeat(64),
      f=>f.full.historical584National.current593PredecessorNative.executedInThisRun=reused,
      f=>f.full.historical584National.current586PredecessorNative.origin={run:1},
      f=>f.full.historical584National.currentInstalled593Original591SuccessorNative.eligibleForReuse=false,
      f=>f.full.historical584National.currentInstalled593Original591SuccessorNationalExecutionClaimed=true]){
      const bad=fixture({installed594V2:true,reused});mutate(bad);bad.rebuild();
      assert.equal((await bad.qualify()).status,'REFUSED');
    }
    if(reused)for(const key of Object.keys(installed593Original591NativeClaims(accepted.full.nativePostgres,current))){
      const bad=fixture({installed594V2:true,reused:true});Object.assign(bad.full.historical584National[key],
        {status:'EXECUTED',executedInThisRun:true,origin:null});bad.rebuild();assert.equal((await bad.qualify()).status,'REFUSED',key);
    }
  }
  const old=fixture({installed594:true});old.phase.kind=INSTALLED593_ORIGINAL591_V2_KIND;
  old.phase.schemaVersion=2;old.rebuild();assert.equal((await old.qualify()).status,'REFUSED','No V1 retroactive upgrade');
});
function v2Synthetic593Input(){return {schemaVersion:1,files:140,modules:65,sqlFiles:71,
  moduleSha256:ASSISTANT_PUBLIC591_REVIEWED_MODULE_SHA256,inputSha256:'a'.repeat(64),controlsSha256:'b'.repeat(64),
  packageMode:{type:'module',version:'4.0.593'},packageScopes:assistantPublic591RootPackageScopes(),
  frozenGitTrees:copy(ASSISTANT_PUBLIC591_FROZEN)};}


function use597Package(f,{candidateVersion='4.0.597',producerVersion='4.0.597'}={}){
  const ordinary=f.dependencies.readGit;
  f.dependencies.readGit=(args,options)=>{
    if(args[0]==='cat-file'&&args[1]==='blob'&&args[2].endsWith(':package.json')){
      const version=args[2].startsWith(candidate+':')?candidateVersion:producerVersion;
      return Buffer.from(JSON.stringify({version}));
    }
    return ordinary(args,options);
  };
}
test('597 normal FULL baseline refuses old594 after release change and even when old proof is relabelled',async()=>{
  for(const producerVersion of ['4.0.594','4.0.597']){
    const f=fixture({installed594V2:true,reused:true});use597Package(f,{producerVersion});
    const result=await qualifySourceImpactFullBaseline({candidateCommit:candidate,reference:f.reference},f.dependencies);
    assert.equal(result.status,'REFUSED');
    assert.equal(result.cheapPlanAvailable,false);
    if(producerVersion==='4.0.594')assert.deepEqual(f.zipCalls,[]);
  }
});
test('597 normal FULL baseline inherits an exact completed 597 native receipt, with no 597 national claim',async()=>{
  if(ACTIVE.sourcePhase!==SCALAR597_LATER_H0_PHASE)return;
  const f=fixture({installed594V2:true}),prior=f.full.nativePostgres;
  use597Package(f);
  const binding=ACTIVE.requireBinding(),databaseBefore=ACTIVE.databaseBefore;
  const receipt={schemaVersion:1,kind:SCALAR597_LATER_H0_PHASE_KIND,phase:'SCALAR597_LATER_H0_SUCCESSOR',
    sourcePhase:SCALAR597_LATER_H0_PHASE,releaseVersion:ACTIVE.requireRelease(),binding,
    output:ACTIVE.requireOutput(),databaseBefore,current:copy(prior.current),commands:[...SCALAR597_LATER_H0_COMMANDS],
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime:prior.runtime,
    report:{kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',sqlExecuted:true,migrationExecuted:true,
      tcpEnabled:false,normalModelPartCount:673,postgresMajorVersion:16,nativeProgramIdentity:prior.runtime.selectedPrograms,
      scalar597LaterH0Successor:{kind:'SCALAR597_LATER_H0_SUCCESSOR',sourceMigrationInventory:62,
        sqlExecuted:true,wholeMigrationExecuted:true,databaseBeforeVersion:databaseBefore.version,
        originalStateRelease:594,migrationVersion:binding.version,partCount:673,checkpointOidSlots:43,contractBodies:46,
        oldFunctionsAndOidsPreserved:true,allOriginalDefinitionsPreserved:true,exactCheckpointContract:true,
        exactTripContract:true,schema2Catalog:true,normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true,
        trueOld594Fixtures:true,currentNormalFixtures:true,old594ModelNotRetagged:true,wholeMetadataInverse:true,
        strictlyLater594ToNextOnly:true,productionSeedAuthenticated:false,sqlIsNotOriginAuthentication:true,
        intermediateRuntime:{oldActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,
          nextActiveAfterCompletion:true,oldRefusedAfterCompletion:true,activeDocumentsUnchangedBySql:true,
          quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true}}}};
  f.full.nativePostgres=receipt;
  Object.assign(f.phase,{schemaVersion:1,kind:SCALAR597_LATER_H0_PHASE_KIND,nativePostgres:copy(receipt)});
  const national=f.full.historical584National;
  for(const key of Object.keys(national).filter(key=>key.startsWith('current')))if(key!=='current')delete national[key];
  Object.assign(national,{
    currentScalar597LaterH0Native:{status:'EXECUTED',executedInThisRun:true,origin:null,
      phase:SCALAR597_LATER_H0_PHASE,eligibleForReuse:false,separatelyRequired:true},
    currentScalar597LaterH0Source:{command:'npm run test:assistant-later-h0-source',
      actualCommand:SCALAR597_LATER_H0_SOURCE_COMMAND,separatelyRequired:true},
    currentScalar597LaterH0NationalExecutionClaimed:false,
  });
  f.rebuild();
  const check=()=>qualifySourceImpactFullBaseline({candidateCommit:candidate,reference:f.reference},f.dependencies);
  assert.equal((await check()).scope,'FULL_SOURCE');
  national.currentScalar597LaterH0NationalExecutionClaimed=true;f.rebuild();
  assert.equal((await check()).status,'REFUSED');
  national.currentScalar597LaterH0NationalExecutionClaimed=false;
  national.currentScalar597LaterH0Native.status='REUSED';f.rebuild();
  assert.equal((await check()).status,'REFUSED');
});

// Protocol-only598 evidence DATA. These fixtures do not execute PostgreSQL or qualify a live run.
async function synthetic598FullFixture(){
  assert.equal(ACTIVE.sourcePhase,'assistant-mixed-after597-successor');
  const native=await import('./native-postgres-evidence.mjs'),national=await import('./national584-source-evidence.mjs');
  const f=fixture({installed594V2:true}),prior=f.full.nativePostgres;
  use597Package(f,{candidateVersion:'4.0.598',producerVersion:'4.0.598'});
  const binding=ACTIVE.requireBinding(),databaseBefore=ACTIVE.databaseBefore;
  const observed={kind:'ASSISTANT_AFTER597_SUCCESSOR',sourceMigrationInventory:63,
    databaseBeforeVersion:databaseBefore.version,originalStateRelease:597,migrationVersion:binding.version,
    partCount:673,checkpointOidSlots:45,contractBodies:48,productionSeedAuthenticated:false,
    parentCodeHead:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',parentNativeHead:'97d189e4a99fdab1b2764db1bfe59f96e92c3f02'};
  for(const key of ['sqlExecuted','wholeMigrationExecuted','oldFunctionsAndOidsPreserved','allOriginalDefinitionsPreserved',
    'exactCheckpointContract','exactTripContract','schema2Catalog','normalProtectedJsonbRoundtrip','originalDigestsPreserved',
    'trueOld597Fixtures','currentNormalFixtures','old597ModelNotRetagged','wholeMetadataInverse',
    'strictlyLater597ToNextOnly','sqlIsNotOriginAuthentication','predecessorExecutedInSameHost'])observed[key]=true;
  observed.intermediateRuntime=Object.fromEntries(['old597ActiveAfterSql','nextRefusedBeforeActivation','pendingBothRefused',
    'nextActiveAfterCompletion','old597RefusedAfterCompletion','wholeHistoryAndDocumentsPreserved',
    'quotaFunctionAndAdmissionUnchanged','quotaServiceRoleWorking'].map(key=>[key,true]));
  const receipt={schemaVersion:1,kind:native.ASSISTANT_AFTER597_PHASE_KIND,phase:'ASSISTANT_AFTER597_SUCCESSOR',
    sourcePhase:native.ASSISTANT_AFTER597_PHASE,releaseVersion:ACTIVE.requireRelease(),binding,output:ACTIVE.requireOutput(),
    databaseBefore,current:copy(prior.current),commands:[...native.ASSISTANT_AFTER597_COMMANDS],
    status:'EXECUTED',executedInThisRun:true,origin:null,eligibleForReuse:false,runtime:prior.runtime,
    report:{kind:'NATIVE_POSTGRES_CHECKPOINT_CAS_COMPARISON',sqlExecuted:true,migrationExecuted:true,tcpEnabled:false,
      normalModelPartCount:673,postgresMajorVersion:16,nativeProgramIdentity:prior.runtime.selectedPrograms,
      assistantAfter597Successor:observed}};
  f.full.nativePostgres=receipt;Object.assign(f.phase,{schemaVersion:1,kind:native.ASSISTANT_AFTER597_PHASE_KIND,nativePostgres:copy(receipt)});
  for(const key of Object.keys(f.full.historical584National).filter(key=>key.startsWith('current')))if(key!=='current')delete f.full.historical584National[key];
  Object.assign(f.full.historical584National,await national.assistantAfter597NativeClaims(receipt,receipt.current));
  f.rebuild();return f;
}
test('598 FULL baseline binds its genuine async native and national shapes without reexecuting or retagging proof',async()=>{
  const f=await synthetic598FullFixture(),result=await f.qualify();
  assert.equal(result.kind,SOURCE_IMPACT_FULL_BASELINE_KIND);assert.equal(result.scope,'FULL_SOURCE');
  assert.equal(result.producerHead,f.reference.producerHead);assert.equal(f.full.nativePostgres.eligibleForReuse,false);
  const mutations=[
    f=>f.full.nativePostgres.eligibleForReuse=true,
    f=>{f.full.nativePostgres.status='REUSED';f.full.nativePostgres.executedInThisRun=false;},
    f=>f.full.nativePostgres.report.assistantAfter597Successor.parentCodeHead=f.full.nativePostgres.report.assistantAfter597Successor.parentNativeHead,
    f=>f.full.nativePostgres.report.assistantAfter597Successor.sourceMigrationInventory=73,
    f=>f.full.historical584National.currentAssistantAfter597NationalExecutionClaimed=true,
    f=>f.full.historical584National.currentAssistantAfter597Native.status='REUSED',
    f=>f.full.historical584National.currentAssistantAfter597Source.actualCommand+=' --unknown',
    f=>f.full.historical584National.currentScalar597LaterH0Native={status:'EXECUTED'},
    f=>f.phase.kind='UNKNOWN_598_PHASE',
  ];
  for(const mutate of mutations){const bad=await synthetic598FullFixture();mutate(bad);bad.phase.nativePostgres=copy(bad.full.nativePostgres);bad.rebuild();assert.equal((await bad.qualify()).status,'REFUSED');}
  for(const version of ['4.0.594','4.0.597','4.0.599']){
    const bad=await synthetic598FullFixture();use597Package(bad,{candidateVersion:version,producerVersion:'4.0.598'});
    assert.equal((await bad.qualify()).status,'REFUSED');assert.deepEqual(bad.zipCalls,[]);
  }
});
test('reviewed ordinary DMI setup allows only the exact modern FULL producer baseline',async()=>{
  const workflow=readFileSync(new URL('../.github/workflows/validate-pull-request.yml',import.meta.url));
  const f=await synthetic598FullFixture();
  assert.equal((await f.qualify()).kind,SOURCE_IMPACT_FULL_BASELINE_KIND);
  f.zipCalls.length=0;
  const names=['Set up job',...Array.from(workflow.toString().matchAll(/^      - (name|uses): ([^\n]+)$/gm),
    ([,kind,name])=>kind==='uses'?'Run '+name:name)];
  assert.equal(names.length,23);assert.equal(names[5],'Install declared DMI dependencies before source planning');
  const steps=names.map((name,index)=>step(name,index+1));
  f.job.steps=copy(steps);
  for(const [id,minute] of [[f.reference.nativeArtifactId,18],[f.reference.finalArtifactId,23]])
    f.json.get('/repos/'+repo+'/actions/artifacts/'+id).created_at=stamp(minute);
  const read=f.dependencies.readGit;
  const readModern=(args,options)=>args.join(' ')===('cat-file blob '+head+':'+PULL_REQUEST_SOURCE_WORKFLOW)
    ?Buffer.from(workflow):read(args,options);
  f.dependencies.readGit=readModern;
  assert.equal((await f.qualify()).kind,SOURCE_IMPACT_FULL_BASELINE_KIND);
  assert.equal(f.zipCalls.length,2);
  for(const mutate of [f=>f.job.steps[5].conclusion='skipped',
    f=>f.job.steps.push({...f.job.steps[5],number:42}),
    f=>f.job.steps[16].completed_at=stamp(15),
    f=>{const read=f.dependencies.readGit;f.dependencies.readGit=(args,options)=>{
      const value=read(args,options);return args[2]===head+':'+PULL_REQUEST_SOURCE_WORKFLOW
        ?Buffer.concat([value,Buffer.from('\n')]):value;};}]){
    f.job.steps=copy(steps);f.dependencies.readGit=readModern;f.zipCalls.length=0;
    mutate(f);
    assert.equal((await f.qualify()).status,'REFUSED');assert.deepEqual(f.zipCalls,[]);
  }
});

test('598 normal V2 producer and consumer use real protected closure with synthetic evidence transport only',()=>{
  execFileSync(process.execPath,['scripts/test-source-targeted-domain-integration.mjs','--source598'],{
    timeout:180000,maxBuffer:4*1024*1024,stdio:['pipe','pipe','pipe'],env:{...process.env}});
});
