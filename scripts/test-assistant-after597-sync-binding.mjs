// Lokale normale kildekaldere. Ingen SQL, originale B/S, provider eller drift.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
// Explicit normal current entry. No project constructor/runtime import
// precedes the fixed after598 issuance guard. Old PRE bodies stay unchanged.
const currentArguments=process.argv.slice(2);
assert(currentArguments.length===0||(currentArguments.length===1&&currentArguments[0]==='--after598-current'),'Unknown or mixed assistant test mode');
const AFTER598_CURRENT_MODE=currentArguments.length===1;
const currentSource=await import('./lib/assistant-later-h0-successor-source.mjs');
if(AFTER598_CURRENT_MODE){
  currentSource.requireAssistantAfter598Output();currentSource.requireAssistantAfter598Release();
  assert.equal(currentSource.ACTIVE_ASSISTANT_SUCCESSOR,currentSource.INACTIVE_ASSISTANT_AFTER598_SUCCESSOR);
}
const {
  assistantAfter597CheckpointInspectionView,
  nativeOriginalContinuityCheckpointInspectionView,
  assistantLaterH0CheckpointInspectionView,
  assistantPublic587SuccessorCheckpointInspectionView,
  assistantPublic588SuccessorCheckpointInspectionView,
  assistantPublic590SuccessorCheckpointInspectionView,
  assistantPublic591SuccessorCheckpointInspectionView,
  installed593Original591CheckpointInspectionView,
  scalar597LaterH0CheckpointInspectionView,
  checkpointMetadataCasBlock,synchronizeRavScoreModelBinding,
}=await import('./sync-ravscore-model-binding.mjs');
const {readNativeOriginalContinuityCanonicalSource}=await import('./lib/native-original-continuity-successor-source.mjs');
const {
  ACTIVE_ASSISTANT_SUCCESSOR:ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR:NEXT,
  readAssistantLaterH0CanonicalSource,readAssistantPublic587SuccessorCanonicalSource,
  readAssistantPublic588SuccessorCanonicalSource,readAssistantPublic590SuccessorCanonicalSource,
  readAssistantPublic591SuccessorCanonicalSource,readInstalled593Original591CanonicalSource,
  readScalar597LaterH0CanonicalSource,SCALAR597_LATER_H0_ALIASES,
}=await import('./lib/assistant-later-h0-successor-source.mjs');
const {RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,ravScoreContinuationImplementationSha256}=await import('./lib/ravscore-continuation-implementation-contract.mjs');
const {ravScoreModelBinding}=await import('../js/core/ravscore-model-contract.js');
const {ravScoreModelBinding:candidateBinding}=await import('./rollback-assets/ravscore-model-contract.js');

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const CONSUMERS=['knowledge/rav-assistant-public-v1.json','scripts/fixtures/rav-assistant-evals-v1.json',
  'version.json','data/admin/ravscore-profile-selection.json',
  'supabase/functions/_shared/rav-assistant-contract.ts','supabase/schema.sql',
  'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql'];

// Current source checks run only after the fixed issuance/ACTIVE admission above.
if(AFTER598_CURRENT_MODE){
  const {verifyAssistantAfter598SourceTarget}=await import('./national584-source-evidence.mjs');
  await verifyAssistantAfter598SourceTarget();
}
if(!AFTER598_CURRENT_MODE){

test('alle gamle navngivne kontrolvisninger læser deres egne ægte hele kanoniske kilder',async()=>{
  const pairs=[
    [readNativeOriginalContinuityCanonicalSource,nativeOriginalContinuityCheckpointInspectionView],
    [readAssistantLaterH0CanonicalSource,assistantLaterH0CheckpointInspectionView],
    [readAssistantPublic587SuccessorCanonicalSource,assistantPublic587SuccessorCheckpointInspectionView],
    [readAssistantPublic588SuccessorCanonicalSource,assistantPublic588SuccessorCheckpointInspectionView],
    [readAssistantPublic590SuccessorCanonicalSource,assistantPublic590SuccessorCheckpointInspectionView],
    [readAssistantPublic591SuccessorCanonicalSource,assistantPublic591SuccessorCheckpointInspectionView],
    [readInstalled593Original591CanonicalSource,installed593Original591CheckpointInspectionView],
    [readScalar597LaterH0CanonicalSource,scalar597LaterH0CheckpointInspectionView],
  ];
  for(const[read,inspect]of pairs){
    const original=await read();assert.equal(original.admission,'NO_ADMISSION');
    const source=original.canonicalSource,bytes=Buffer.from(source),view=inspect(source);
    assert(view.length<source.length);assert.deepEqual(Buffer.from(source),bytes);
    for(const invalid of [source+'\n-- ukendt variant\n',source.slice(1),source+source])
      assert.throws(()=>inspect(invalid),/entire issued canonical source/);
  }
  const scalar=(await readScalar597LaterH0CanonicalSource()).canonicalSource;
  const view=scalar597LaterH0CheckpointInspectionView(scalar);
  for(const row of SCALAR597_LATER_H0_ALIASES)
    assert(!view.includes('create or replace function public.'+row.name+'('));
  const block=checkpointMetadataCasBlock(scalar,ravScoreModelBinding(),candidateBinding(),
    await ravScoreContinuationImplementationSha256({repositoryRoot:ROOT}));
  assert(scalar.includes(block));
  assert.equal(ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
});

test('ny kontrolvisning afviser uudstedt før input, filadgang og netadgang',async t=>{
  let accessed=0;
  const hostile=new Proxy({},{get(){accessed++;throw Error('UVENTET_INPUT');}});
  for(const key of ['readFile','writeFile','lstat','stat','readdir','mkdir','copyFile'])
    t.mock.method(fs,key,async()=>{accessed++;throw Error('UVENTET_FILADGANG');});
  t.mock.method(globalThis,'fetch',async()=>{accessed++;throw Error('UVENTET_NETADGANG');});
  assert.throws(()=>assistantAfter597CheckpointInspectionView(hostile),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>assistantAfter597CheckpointInspectionView(),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>assistantAfter597CheckpointInspectionView(hostile,{family:'594'}),/ASSISTANT_AFTER597_UNISSUED/);
  assert.equal(accessed,0);assert.equal(NEXT.binding,null);assert.equal(NEXT.output,null);
  assert.equal(ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
});

test('normal synkronisering og genkontrol bevarer mixedV2 Edge og afviser defekt SQL før skrivning',async()=>{
  const stage=await fs.mkdtemp(path.join(os.tmpdir(),'rr-after597-normal-sync-'));
  const migration='supabase/migrations/'+ACTIVE.migration().filename;
  const files=[...new Set([...CONSUMERS,...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,migration])];
  try{
    for(const file of files){
      const target=path.join(stage,file);await fs.mkdir(path.dirname(target),{recursive:true});
      await fs.copyFile(path.join(ROOT,file),target);
    }
    const edgePath=path.join(stage,'supabase/functions/_shared/rav-assistant-contract.ts');
    const edgeBefore=await fs.readFile(edgePath);
    // Hele den allerede gennemgåede Edge-semantik, med ægte597-binding.
    assert.equal(digest(edgeBefore),'c15f449bd4ab9845aed89acb8690db4cc69753d8c823d347d1c24bd7ec7f844d');
    const first=await synchronizeRavScoreModelBinding({write:true,root:stage});
    assert.deepEqual(first.binding,ravScoreModelBinding());
    assert.deepEqual(first.candidateBinding,candidateBinding());
    assert.deepEqual(await fs.readFile(edgePath),edgeBefore);
    const after=new Map(await Promise.all(CONSUMERS.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
    const second=await synchronizeRavScoreModelBinding({root:stage});
    assert.deepEqual(second.changed,[]);
    for(const[file,bytes]of after)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes);
    const bad='supabase/schema.sql',badPath=path.join(stage,bad);
    const sql=await fs.readFile(badPath,'utf8');
    const marker='-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN';
    assert.equal(sql.split(marker).length,2);
    await fs.writeFile(badPath,sql+'\n'+marker+'\n');
    const beforeRejected=new Map(await Promise.all(CONSUMERS.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
    await assert.rejects(synchronizeRavScoreModelBinding({write:true,root:stage}),/missing or duplicated/);
    for(const[file,bytes]of beforeRejected)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes);
  }finally{
    // Kun dette tests egne, konkrete midlertidige træ.
    assert(path.basename(stage).startsWith('rr-after597-normal-sync-'));
    assert.equal(path.dirname(stage),path.resolve(os.tmpdir()));
    await fs.rm(stage,{recursive:true,force:false});
  }
});

}else{

  const sync=await import('./sync-ravscore-model-binding.mjs');
  test('after598 current and all named old canonical inspection views retain their own entire-source rejection',async()=>{
    const pairs=[
      [readNativeOriginalContinuityCanonicalSource,nativeOriginalContinuityCheckpointInspectionView],
      [readAssistantLaterH0CanonicalSource,assistantLaterH0CheckpointInspectionView],
      [readAssistantPublic587SuccessorCanonicalSource,assistantPublic587SuccessorCheckpointInspectionView],
      [readAssistantPublic588SuccessorCanonicalSource,assistantPublic588SuccessorCheckpointInspectionView],
      [readAssistantPublic590SuccessorCanonicalSource,assistantPublic590SuccessorCheckpointInspectionView],
      [readAssistantPublic591SuccessorCanonicalSource,assistantPublic591SuccessorCheckpointInspectionView],
      [readInstalled593Original591CanonicalSource,installed593Original591CheckpointInspectionView],
      [readScalar597LaterH0CanonicalSource,scalar597LaterH0CheckpointInspectionView],
      [currentSource.readAssistantAfter597CanonicalSource,assistantAfter597CheckpointInspectionView],
      [currentSource.readAssistantAfter598CanonicalSource,sync.assistantAfter598CheckpointInspectionView]];
    for(const[read,inspect]of pairs){const {canonicalSource:source}=await read(),before=Buffer.from(source);assert(inspect(source).length<source.length);
      for(const changed of [source+'\n-- unknown\n',source.slice(1),source+source])assert.throws(()=>inspect(changed));assert.deepEqual(Buffer.from(source),before);}
  });
  test('after598 current normal seven-consumer sync is stable and rejects damaged SQL before writing',async()=>{
    const stage=await fs.mkdtemp(path.join(os.tmpdir(),'rr-after598-normal-sync-'));
    const migration='supabase/migrations/'+currentSource.assistantAfter598Migration().filename;
    const files=[...new Set([...CONSUMERS,...RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES,migration])];
    try{
      for(const file of files){const target=path.join(stage,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(path.join(ROOT,file),target);}
      const first=await synchronizeRavScoreModelBinding({write:true,root:stage});assert.deepEqual(first.binding,ravScoreModelBinding());assert.deepEqual(first.candidateBinding,candidateBinding());
      const after=new Map(await Promise.all(CONSUMERS.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
      assert.deepEqual((await synchronizeRavScoreModelBinding({root:stage})).changed,[]);
      for(const[file,bytes]of after)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes);
      assert.deepEqual(after.get('supabase/functions/_shared/rav-assistant-contract.ts'),await fs.readFile(path.join(ROOT,'supabase/functions/_shared/rav-assistant-contract.ts')),'Actual reviewed current Edge semantics stay unchanged by binding synchronization');
      const badPath=path.join(stage,'supabase/schema.sql'),sql=await fs.readFile(badPath,'utf8'),marker='-- RAVSCORE_CHECKPOINT_METADATA_CAS_GENERATED_BEGIN';
      assert.equal(sql.split(marker).length,2);
      for(const damaged of [sql.replace(marker,''),sql+'\n'+marker+'\n']){
        await fs.writeFile(badPath,damaged);const before=new Map(await Promise.all(CONSUMERS.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
        await assert.rejects(synchronizeRavScoreModelBinding({write:true,root:stage}),/missing or duplicated/);
        for(const[file,bytes]of before)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes);
      }
    }finally{assert.equal(path.dirname(stage),path.resolve(os.tmpdir()));assert(path.basename(stage).startsWith('rr-after598-normal-sync-'));await fs.rm(stage,{recursive:true,force:false});}
  });

  test('after598 current next ordinary app release keeps issued family, original598 and unchanged C/I/T and SQL',async()=>{
    const {execFileSync}=await import('node:child_process'),{pathToFileURL}=await import('node:url');
    const {assistantAfter598RequiredMigrations}=await import('./integrated-cutover-readiness.mjs');
    const stage=await fs.mkdtemp(path.join(os.tmpdir(),'rr-after598-next-app-'));
    const family=currentSource.ACTIVE_ASSISTANT_SUCCESSOR,issued=currentSource.requireAssistantAfter598Binding();
    const version=JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8')).version;
    assert.match(version,/^4\.0\.[0-9]+$/);
    const nextApplicationVersion='4.0.'+(Number(version.split('.').at(-1))+1);
    if(version==='4.0.599')assert.equal(nextApplicationVersion,'4.0.600');
    const files=execFileSync('git',['-C',ROOT,'-c','protocol.allow=never','ls-files','-z'],{
      encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024,env:{PATH:process.env.PATH,SystemRoot:process.env.SystemRoot,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'}}).split('\0').filter(Boolean);
    assert.equal(new Set(files).size,files.length);
    const generated=['js/core/ravscore-model-contract.js','scripts/rollback-assets/ravscore-model-contract.js'];
    const beforeGenerated=new Map(await Promise.all(generated.map(async file=>[file,await fs.readFile(path.join(ROOT,file))])));
    const migrations=files.filter(file=>file.startsWith('supabase/migrations/')&&file.endsWith('.sql'));
    const beforeSQL=new Map(await Promise.all(migrations.map(async file=>[file,await fs.readFile(path.join(ROOT,file))])));
    const inputProfile=JSON.parse(await fs.readFile(path.join(ROOT,'scripts/lib/source-impact-domain-inputs-598.json'),'utf8'));
    const modelFiles=(await Promise.all(Object.values(inputProfile.models).map(async def=>{
      const source=await fs.readFile(path.join(ROOT,def.file),'utf8');
      const manifest=JSON.parse(source.slice(source.indexOf('Object.freeze(')+14,source.lastIndexOf(');')));
      return [def.file,...manifest.files.map(row=>row[def.rowKey])];
    }))).flat();
    const analysisFiles=[...new Set([...inputProfile.postgresModules,...inputProfile.postgresData,
      ...inputProfile.nativeEvidenceControls,...inputProfile.setupInputs,...inputProfile.plannerTrustChain,
      ...inputProfile.continuation.files,inputProfile.continuation.file,...modelFiles,...migrations,
      'version.json','data/admin/ravscore-profile-selection.json','knowledge/rav-assistant-public-v1.json',
      'scripts/protected-operational-reentry-evidence.mjs'])];
    const beforeAnalysis=new Map(await Promise.all(analysisFiles.map(async file=>[file,await fs.readFile(path.join(ROOT,file))])));

    try{
      for(const file of files){assert(!path.isAbsolute(file)&&!file.split('/').includes('..'));
        const from=path.join(ROOT,file),to=path.join(stage,file);assert((await fs.lstat(from)).isFile());
        await fs.mkdir(path.dirname(to),{recursive:true});await fs.copyFile(from,to);}
      const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(key=>process.env[key]!==undefined).map(key=>[key,process.env[key]]));
      execFileSync(process.execPath,[path.join(stage,'scripts/set-version.mjs'),nextApplicationVersion],{cwd:stage,env,timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});
      for(const file of ['scripts/build-candidate-g-rollback-bundle.mjs','scripts/build-ravscore-model-bundle.mjs'])
        execFileSync(process.execPath,[path.join(stage,file),'--check'],{cwd:stage,env,timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});
      for(const[file,bytes]of beforeGenerated)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes,'Ordinary app setter does not reissue C or I');
      for(const[file,bytes]of beforeSQL)assert.deepEqual(await fs.readFile(path.join(stage,file)),bytes,'No migration or old SQL changed for app600');
      assert.equal(await ravScoreContinuationImplementationSha256({repositoryRoot:stage}),issued.T);
      await synchronizeRavScoreModelBinding({write:true,root:stage});assert.deepEqual((await synchronizeRavScoreModelBinding({root:stage})).changed,[]);
      const pkg=JSON.parse(await fs.readFile(path.join(stage,'package.json'),'utf8'));assert.equal(pkg.version,nextApplicationVersion);
      const profile=JSON.parse(await fs.readFile(path.join(stage,'data/admin/ravscore-profile-selection.json'),'utf8'));assert.equal(profile.modelBundleSha256,issued.I);assert.equal(profile.sourceVersion,nextApplicationVersion);
      const load=file=>import(pathToFileURL(path.join(stage,file)).href);
      const stagedSource=await load('scripts/lib/assistant-later-h0-successor-source.mjs');
      assert.equal(stagedSource.ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase,family.sourcePhase);
      assert.deepEqual(stagedSource.requireAssistantAfter598Binding(),issued);assert.deepEqual(stagedSource.ASSISTANT_AFTER598_BEFORE,currentSource.ASSISTANT_AFTER598_BEFORE);
      const codeOnly=await load('scripts/select-native-original-continuity-code-only-source.mjs');
      const inventory=assistantAfter598RequiredMigrations(),migrationListText='Local | Remote | Time (UTC)\n'+inventory.map(row=>row.version+' | '+row.version+' | synthetic-installed-plan').join('\n');
      const environment={GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
        GITHUB_SHA:'82200280c42b9060f14be2721ba7b766e0ede5a6',GITHUB_RUN_ID:'123',
        CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',PUBLISH_NEWEST_SAVED_WEATHER:'false',
        RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_WRITER_ACTIVE:'false',RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_GATE_RESULT:'success',
        RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_RECOVERY_RUN_ID:'',RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_SAVED_WEATHER:'false',
        ...Object.fromEntries(['RAVRADAR_USERDATA_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_ASSISTANT_UPGRADE_OPT_IN',
          'RAVRADAR_STATISTICS_REVISION_UPGRADE_OPT_IN','RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN',
          'RAVRADAR_LAST_MILE_ENCLOSURE_UPGRADE_OPT_IN','RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN',
          'RAVRADAR_NATIVE_ORIGINAL_CONTINUITY_UPGRADE_OPT_IN','UPGRADE_EXISTING_OWNER_EXPORT','UPGRADE_ACCOUNT_ASSISTANT',
          'UPGRADE_STATISTICS_REVISION','UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN','UPGRADE_LAST_MILE_ENCLOSURE',
          'UPGRADE_ACCOUNT_STATISTICS_ASSISTANT','UPGRADE_NATIVE_ORIGINAL_CONTINUITY','RESTART_ARCHIVED_WEATHER',
          'COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION','RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
          'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY'].map(key=>[key,'false']))};
      const plan=await codeOnly.verifyCurrentInstalledCodeOnlyPlan({environment,migrationListText,dryRunText:'DRY RUN: migrations will *not* be pushed to the database.\nRemote database is up to date.',migrationsDirectory:path.join(stage,'supabase/migrations')});
      assert.deepEqual(plan.pendingVersions,[]);
      // Actual normal caller, not a relaxed stand-in: this must also accept the
      // next application release with the unchanged issued model/SQL family.
      const national=await load('scripts/national584-source-evidence.mjs');
      national.verifyPackage(pkg);
      for(const wrongVersion of [version,'4.0.'+(Number(nextApplicationVersion.split('.').at(-1))+1),''])
        assert.throws(()=>national.verifyPackage({...pkg,version:wrongVersion}));
      const {ASSISTANT_AFTER598_COMMANDS}=await load('scripts/native-postgres-evidence.mjs');
      national.verifyCurrentNativeCommands(ASSISTANT_AFTER598_COMMANDS,stagedSource.requireAssistantAfter598Release());
      assert.throws(()=>national.verifyAssistantAfter598NativeCommands(ASSISTANT_AFTER598_COMMANDS,nextApplicationVersion),'Family-native release remains the exact issued release');
      const versionPath=path.join(stage,'version.json'),versionBytes=await fs.readFile(versionPath);
      const mismatched=JSON.parse(versionBytes);mismatched.releaseContract.modelBindings.integrated.modelBundleSha256='0'.repeat(64);
      await fs.writeFile(versionPath,JSON.stringify(mismatched));
      assert.throws(()=>national.verifyPackage(pkg),'Actual release metadata must bind the issued model');
      await fs.writeFile(versionPath,versionBytes);
      national.verifyPackage(pkg);

      // Both source-parity operands are clean owned Git commits of actual normal
      // input bytes. No readiness rows, PG receipts or execution are fabricated.
      assert.equal(await fs.lstat(path.join(stage,'.git')).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;}),false);
      const gitEnvironment={...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
        GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',
        GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never',
        GIT_AUTHOR_NAME:'Synthetic source parity',GIT_AUTHOR_EMAIL:'fixture@example.invalid',
        GIT_COMMITTER_NAME:'Synthetic source parity',GIT_COMMITTER_EMAIL:'fixture@example.invalid',
        GIT_AUTHOR_DATE:'2026-11-15T12:00:00Z',GIT_COMMITTER_DATE:'2026-11-15T12:00:00Z'};
      const git=(directory,args,input)=>execFileSync('git',['-C',directory,'-c','core.autocrlf=false',...args],
        {input,env:gitEnvironment,timeout:30000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe']});
      const text=args=>git(stage,args).toString('utf8').trim();
      git(stage,['init','-q']);git(stage,['config','core.autocrlf','false']);
      const origins=[...inputProfile.frozenGitAnchors,
        {head:'bd9cf518fe798ddea45d2b835f324f6e2bea06fc',tree:'2f71c562eea774ca03996802f83bdad7cccd43cc'},
        {head:'82200280c42b9060f14be2721ba7b766e0ede5a6',tree:'c69c1beed4275fb02af216a1c4741410555e2675'}];
      const requiredBlobs=[['bd9cf518fe798ddea45d2b835f324f6e2bea06fc','version.json'],
        ['82200280c42b9060f14be2721ba7b766e0ede5a6','scripts/test-protected-ravscore-continuation-checkpoint.mjs'],
        ['82200280c42b9060f14be2721ba7b766e0ede5a6','data/admin/ravscore-profile-selection.json'],
        // Exact ancestor tree objects for these historical selected paths only.
        ['82200280c42b9060f14be2721ba7b766e0ede5a6','scripts'],
        ['82200280c42b9060f14be2721ba7b766e0ede5a6','data'],
        ['82200280c42b9060f14be2721ba7b766e0ede5a6','data/admin']]
        .map(([ref,file])=>git(ROOT,['rev-parse',ref+':'+file]).toString('utf8').trim());
      git(stage,['unpack-objects','-q'],git(ROOT,['pack-objects','--stdout'],
        [...new Set([...origins.flatMap(row=>[row.head,row.tree]),...requiredBlobs])].join('\n')+'\n'));
      const afterAnalysis=new Map(await Promise.all(analysisFiles.map(async file=>[file,await fs.readFile(path.join(stage,file))])));
      for(const[file,bytes]of beforeAnalysis)await fs.writeFile(path.join(stage,file),bytes);
      git(stage,['add','-f','--',...analysisFiles]);
      const beforeCommit=text(['commit-tree',text(['write-tree']),'-m','synthetic actual599 source facts, never a qualified producer']);
      git(stage,['update-ref','HEAD',beforeCommit]);assert.equal(text(['status','--porcelain','--untracked-files=no']),'');
      const {analyzeSourceDomainInputs:analyze}=await load('scripts/source-impact-domain-inputs.mjs');
      const {assertPublishedOrdinaryReadinessSourceParity:parity}=await load('scripts/protected-operational-reentry-evidence.mjs');
      const analyzePair=(baselineCommit,candidateCommit)=>analyze({baselineCommit,candidateCommit,expectedHead:candidateCommit});
      const same599=analyzePair(beforeCommit,beforeCommit);assert.equal(same599.analysis,'COMPLETE',same599.failureCode);
      assert.equal(same599.profile.id,'DERIVED_599_DOMAIN_INPUTS_C101_I100_T12');
      assert.equal(same599.actualPostgresInput.unchanged,true);assert.equal(same599.postgresExecuted,false);
      await parity({producerHead:beforeCommit,liveHead:beforeCommit,executorHead:beforeCommit});
      for(const[file,bytes]of afterAnalysis)await fs.writeFile(path.join(stage,file),bytes);
      git(stage,['add','-f','--',...analysisFiles]);
      const afterCommit=text(['commit-tree',text(['write-tree']),'-p',beforeCommit,'-m','synthetic real normal setter next-app source facts']);
      git(stage,['update-ref','HEAD',afterCommit]);assert.equal(text(['status','--porcelain','--untracked-files=no']),'');
      const same600=analyzePair(afterCommit,afterCommit);assert.equal(same600.analysis,'COMPLETE',same600.failureCode);
      assert.equal(same600.profile.id,same599.profile.id);assert.equal(same600.profile.sha256,same599.profile.sha256);
      assert.equal(same600.actualPostgresInput.unchanged,true);assert.equal(same600.models.T.before.implementationSha256,issued.T);
      assert.equal(same600.postgresExecuted,false);assert.equal(same600.baselineQualified,false);
      await parity({producerHead:afterCommit,liveHead:afterCommit,executorHead:afterCommit});
      const cross=analyzePair(beforeCommit,afterCommit);assert.equal(cross.analysis,'COMPLETE',cross.failureCode);
      assert.equal(cross.actualPostgresInput.unchanged,false);
      assert.notDeepEqual(cross.actualPostgresInput.before.packageScopes,cross.actualPostgresInput.after.packageScopes);
      await assert.rejects(parity({producerHead:beforeCommit,liveHead:beforeCommit,executorHead:afterCommit}),
        /Published ordinary completion readiness backend inputs differ/);
      // A genuine same-family documentation diff goes to generic CurrentV4,
      // while the historical V2 owners explicitly retain FULL for this family.
      await fs.writeFile(path.join(stage,'CHANGELOG.md'),'Synthetic current-family source-planning prose only.\n');
      git(stage,['add','-f','--','CHANGELOG.md']);
      const proseCommit=text(['commit-tree',text(['write-tree']),'-p',afterCommit,'-m','synthetic current family unbound prose']);
      git(stage,['update-ref','HEAD',proseCommit]);assert.equal(text(['status','--porcelain','--untracked-files=no']),'');
      const input={baselineCommit:afterCommit,candidateCommit:proseCommit,expectedHead:proseCommit};
      const {planSourceCurrentContractsFromGit:currentPlan}=await load('scripts/source-current-contract-plan.mjs');
      const current=currentPlan(input);assert.equal(current.status,'PLANNED');assert.equal(current.selection,'CURRENT_CONTRACTS');
      assert.equal(current.inputProfile.id,same599.profile.id);assert.equal(current.baselineQualified,false);
      const {planSourceDomainImpactFromGit:domainPlan}=await load('scripts/source-impact-domain-plan.mjs');
      const domain=domainPlan(input);assert.equal(domain.selection,'FULL');
      assert.deepEqual(domain.reasonCodes,['DERIVED_599_REQUIRES_CURRENT_OR_FULL']);
    }finally{assert.equal(path.dirname(stage),path.resolve(os.tmpdir()));assert(path.basename(stage).startsWith('rr-after598-next-app-'));await fs.rm(stage,{recursive:true,force:false});}
  });

}
