// Normal source-only contract. No native PostgreSQL, actual B/S or origin grant.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import test from 'node:test';
import {ASSISTANT_SAME_H0_BEFORE as OLD,ASSISTANT_SAME_H0_BINDING,ASSISTANT_SAME_H0_OUTPUT,
  ASSISTANT_SAME_H0_PROJECTION as PROJECTION,ASSISTANT_SAME_H0_ALIASES as ALIASES,
  ASSISTANT_SAME_H0_REPLACEMENTS as REPLACEMENTS,requireAssistantSameH0Binding,
  requireAssistantSameH0Output,assistantSameH0Migration,assistantSameH0Definition as definition,
  readAssistantSameH0PredecessorCanonicalSource,readAssistantSameH0CanonicalSource,
  assistantSameH0CheckpointContractFromBase} from './lib/assistant-same-h0-successor-source.mjs';
import {prepareAssistantSameH0SuccessorStructure,buildAssistantSameH0BindingSuccessor}
  from './build-assistant-same-h0-successor.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const CP='ravradar_ravscore_checkpoint_',sha=x=>crypto.createHash('sha256').update(x).digest('hex');
// Historical physical582 render is ONLY a compiler data fixture. The version
// is deliberately nonrelease2099; neither this tuple nor SQL is issued here.
const NEXT=Object.freeze({version:'20990101000000',
  C:'04d4d6ad608640c7993514d613d97e02a0346b2141adf83de2c306ee472432c9',
  I:'f35ee55867dc7f39b52e77308ecc2947c199d2243c89d1f7dbdd23735a15f750',
  T:'8df98a277facfea72de14341e7e7131c0ac9de012b769ce1e2854423c5f5bc5d'});
let prior,built,core,lexical;
if(ASSISTANT_SAME_H0_BINDING!==null){
  await import('./test-assistant-same-h0-issued-source.mjs');
  test('whole historical UNISSUED contracts execute in their exact source context',()=>{
    const preload=new URL('./lib/assistant-same-h0-unissued-test-context.mjs',import.meta.url).href;
    const child=spawnSync(process.execPath,['--import',preload,'--test',fileURLToPath(import.meta.url)],{
      cwd:ROOT,encoding:'utf8',timeout:180000,maxBuffer:4*1024*1024,
      env:{...process.env,NODE_OPTIONS:((process.env.NODE_OPTIONS??'')+' --import='+preload).trim(),
        SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_DB_PASSWORD:'',SUPABASE_ACCESS_TOKEN:''}});
    assert.equal(child.status,0,child.stdout+'\n'+child.stderr);
  });
}else{
test('UNISSUED public API refuses before source I/O and rejects caller authority',async()=>{
  assert.equal(ASSISTANT_SAME_H0_BINDING,null);assert.equal(ASSISTANT_SAME_H0_OUTPUT,null);
  for(const use of [requireAssistantSameH0Binding,requireAssistantSameH0Output,assistantSameH0Migration])
    assert.throws(()=>use(),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  for(const use of [prepareAssistantSameH0SuccessorStructure,buildAssistantSameH0BindingSuccessor]){
    await assert.rejects(use(),{code:'ASSISTANT_SAME_H0_UNISSUED'});
    await assert.rejects(use({tuple:NEXT}));
  }
  await assert.rejects(readAssistantSameH0CanonicalSource({migrationsDirectory:'/caller'}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(readAssistantSameH0PredecessorCanonicalSource({source:'/caller'}));
  const cli=spawnSync(process.execPath,[path.join(ROOT,'scripts/build-assistant-same-h0-successor.mjs'),'--describe'],
    {encoding:'utf8',timeout:10000,env:{...process.env,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_DB_PASSWORD:''}});
  assert.equal(cli.status,1);assert.equal(cli.stdout,'');assert.equal(cli.stderr.trim(),'ASSISTANT_SAME_H0_UNISSUED');
});
test('normal frozen140000 source plus whole original/CAS/catalog inverse',async()=>{
  prior=await readAssistantSameH0PredecessorCanonicalSource();
  assert.equal(sha(prior.canonicalSource),OLD.canonicalSha256);assert.equal(prior.admission,'NO_ADMISSION');
  const source=await fs.readFile(path.join(ROOT,'scripts/build-assistant-same-h0-successor.mjs'),'utf8');
  const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);return source.slice(source.indexOf(a),source.indexOf(b));};
  const constants=slice("const CP='ravradar_ravscore_checkpoint_'",'const sha=value=>');
  const compiler=slice('const sha=value=>','const literal=value=>');
  const wrapper=slice('const literal=value=>','export async function prepareAssistantSameH0SuccessorStructure');
  lexical=runInNewContext(constants+compiler+wrapper+'\n({compileAssistantSameH0Structure,wrapAssistantSameH0Source,body,signature,definitionGuard});',
    {assert,crypto,Buffer,OLD,PROJECTION,definition});
  core=lexical.compileAssistantSameH0Structure(prior.canonicalSource,NEXT);
  built=lexical.wrapAssistantSameH0Source(core,prior);
  assert.equal(core.wholeCanonicalInverse,true);assert.equal(core.changes.length,9);assert.equal(core.aliases.length,2);
  assert.equal(core.oldSeedProjectionPreserved,true);assert.equal(core.sameH0ProjectionIsNotAuthentication,true);
  assert.equal(built.migrationIssued,false);assert.equal(built.postgresRun,false);assert.equal(built.productionAuthority,false);
  for(const row of prior.originalDefinitions)assert.equal(definition(core.canonicalSource,row.name),row.definition);
  for(const name of ['cmw0200_state_valid','cmw0200_payload_valid','cmw_predecessor_projection'])
    assert.equal(definition(core.canonicalSource,CP+name),definition(prior.canonicalSource,CP+name));
  const oldState=definition(prior.canonicalSource,CP+'integrated_state_valid');
  assert.equal(definition(core.canonicalSource,CP+'origin140000_state_valid').replace('function public.'+CP+'origin140000_state_valid(',
    'function public.'+CP+'integrated_state_valid('),oldState);
  const oldPayload=definition(prior.canonicalSource,CP+'payload_valid');
  assert.equal(definition(core.canonicalSource,CP+'origin140000_payload_valid')
    .replace('function public.'+CP+'origin140000_payload_valid(','function public.'+CP+'payload_valid(')
    .replace('public.'+CP+'origin140000_state_valid(','public.'+CP+'integrated_state_valid('),oldPayload);
  let inverse=core.canonicalSource;
  const inserted=ALIASES.map(row=>definition(inverse,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  assert.equal(inverse.split(inserted).length,2);inverse=inverse.replace(inserted,'');
  for(const row of [...core.changes].reverse()){assert.equal(inverse.split(row.after).length,2);inverse=inverse.replace(row.after,()=>row.before);}
  assert.equal(inverse,prior.canonicalSource);
  for(const [label,invalid]of [['source',prior.canonicalSource+'\n-- changed'],['version',{...NEXT,version:OLD.version}],['binding',{...NEXT,I:OLD.I}]])
    assert.throws(()=>lexical.compileAssistantSameH0Structure(label==='source'?invalid:prior.canonicalSource,label==='source'?NEXT:invalid));
});
test('SAME_H0 projection preserves old seed guard and every same-time/CAS refusal',()=>{
  assert(core&&built);
  const oldProjection=definition(prior.canonicalSource,CP+'native_origin_projection');
  const preserved=definition(core.canonicalSource,CP+'native_origin_projection');
  assert.equal(preserved.replace('public.'+CP+'origin140000_payload_valid(','public.'+CP+'payload_valid('),oldProjection);
  const projection=definition(core.canonicalSource,PROJECTION);
  assert(projection.includes('if not public.'+CP+'origin140000_payload_valid(p_payload,p_target_reference)'));
  for(const value of ['rr-20261016191945-210','2026-10-16T10:00:00.000Z',
    'd337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb'])assert(!projection.includes(value));
  for(const value of ['16777216','<> 673','exception when others then return null;',OLD.I,OLD.C,OLD.T,NEXT.I,NEXT.C,NEXT.T])assert(projection.includes(value));
  const oldCas=definition(prior.canonicalSource,CP+'cas'),cas=definition(core.canonicalSource,CP+'cas');
  assert(cas.includes('v_same_h0_predecessor_payload is not null'));
  assert(cas.includes('v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference'));
  const tail='    -- Equality is checked before the expected version.';
  assert.equal(cas.slice(cas.indexOf(tail)),oldCas.slice(oldCas.indexOf(tail)));
  for(const code of ['42501','22023','40001'])assert(cas.includes("errcode = '"+code+"'"));
  const numeric='    elsif p_target_reference > v_central_reference\n';
  assert.equal(cas.split(numeric).length,oldCas.split(numeric).length+1);
  const originalArms=oldCas.slice(oldCas.indexOf(numeric),oldCas.indexOf('    elsif public.'+CP+'payload_valid(',oldCas.indexOf(numeric)));
  assert(cas.includes(originalArms),'All original numerical arms WHOLE');
  const oldTrip=definition(prior.canonicalSource,'ravradar_trip_v3_binding_allowed'),trip=definition(core.canonicalSource,'ravradar_trip_v3_binding_allowed');
  assert.equal(trip.replace("        '"+OLD.I+"',\n        '"+NEXT.I+"'","        '"+OLD.I+"'")
    .replace("        '"+OLD.C+"',\n        '"+NEXT.C+"'","        '"+OLD.C+"'"),oldTrip);
});
test('transaction/ACL/full-property contract includes all new bodies, no data grants',()=>{
  assert(built);const sql=built.migration;
  assert(sql.includes("is distinct from '20261017140000'"));
  assert(sql.includes('ASSISTANT_SAME_H0_EXACT_INSTALLED140000_REQUIRED'));
  assert(sql.includes('original_catalog')&&sql.includes('after_catalog is distinct from original_catalog'));
  assert(sql.includes('statement_timeout')&&sql.includes("'55s'"));
  assert.equal(sql.split('CMW_SQL_EXACT_SCHEMA2_REQUIRED').length,3);
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]),
    [...ALIASES.map(r=>r.name),...REPLACEMENTS]);
  for(const row of ALIASES){assert(Buffer.byteLength(row.name)<=63);assert(sql.includes('revoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;'));}
  const contract=definition(core.canonicalSource,CP+'contract');
  for(const i of [24,25,26])assert(contract.includes('v_validator_oids['+i+']'));
  for(const label of ['origin140000-original-state-validator','origin140000-original-payload-validator','assistant-same-h0-metadata-projection'])assert(contract.includes(label));
  // Reuse the WHOLE genuine fixed140000 pure renderer, not a fake contract or
  // another parser. Only its export keyword is removed for lexical exposure.
  const fixed=execFileSync('git',['-C',ROOT,'cat-file','blob',
    '85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9:scripts/integrated-cutover-readiness.mjs'],{encoding:'utf8',maxBuffer:2*1024*1024});
  const fixedSlice=(a,b)=>{assert.equal(fixed.split(a).length,2);assert.equal(fixed.split(b).length,2);return fixed.slice(fixed.indexOf(a),fixed.indexOf(b));};
  const normalize=fixedSlice('function normaliseTripBindingPolicyDefinition(','\nexport async function expectedTripBindingPolicy');
  const extract=fixedSlice('function sqlFunctionBody(','\nexport async function expectedCheckpointCasContract');
  const exported=fixedSlice('export function checkpointCasContractFromCanonicalSource(','\nexport async function expectedTripActiveAdmissionPolicy');
  const local=exported.replace('export function ','function ');assert.equal('export '+local,exported);
  const id=/export const CHECKPOINT_CAS_CONTRACT_ID\s*=\s*'([^']+)'/.exec(fixed);assert(id);
  const render=runInNewContext(normalize+extract+local+'\ncheckpointCasContractFromCanonicalSource;',
    {assert,sha256:sha,CHECKPOINT_CAS_CONTRACT_ID:id[1],CURRENT_MEMORY_WARMUP_PROJECTION:CP+'cmw_predecessor_projection',
      ESTABLISHED_NATIVE_CURRENT_ORIGIN_PROJECTION:CP+'native_origin_projection'});
  const base=render(core.canonicalSource,{sourcePhase:'established-native-current-origin'});
  const actual=assistantSameH0CheckpointContractFromBase(core.canonicalSource,base);
  for(const row of ALIASES){const whole=definition(core.canonicalSource,row.name);
    const changed=core.canonicalSource.replace(whole,()=>whole.replace('as $$',()=> 'as $$\n-- changed'));
    assert.notEqual(assistantSameH0CheckpointContractFromBase(changed,base).sha256,actual.sha256);
    assert.throws(()=>assistantSameH0CheckpointContractFromBase(core.canonicalSource.replace(whole,''),base));}
  assert.throws(()=>assistantSameH0CheckpointContractFromBase(core.canonicalSource,{...base,sha256:'0'.repeat(64)}));
  assert(sql.startsWith('-- Later SAME_H0_MODEL_METADATA'));assert(sql.endsWith('commit;\n'));
});

test('new SAME_H0 callers: UNISSUED runtime, prewrite, plan and readiness refuse before I/O',async()=>{
  const runtime=await import('./assistant-same-h0-runtime-transition.mjs');
  const prewrite=await import('./assistant-same-h0-prewrite.mjs');
  const plan=await import('./verify-assistant-same-h0-plan.mjs');
  const readiness=await import('./integrated-cutover-readiness.mjs');
  let transports=0;const request=()=>{transports++;throw Error('UNISSUED_TRANSPORT_MUST_NOT_RUN');};
  const options={sourceRoot:'/never-source',bundleManifestPath:'/never-bundle/manifest.json',predecessorDescriptorPath:'/never-descriptor',
    workdir:'/never-work',targetReferenceAt:'2026-10-16T10:00:00.000Z',request,checkpointRequest:request};
  await assert.rejects(runtime.prepareAssistantSameH0RuntimeTransition(options),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(runtime.restoreAndPrepareAssistantSameH0RuntimeTransition({request,checkpointRequest:request,storage:{},
    targetReferenceAt:options.targetReferenceAt,workdir:options.workdir}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(runtime.assertAssistantSameH0RuntimeTransitionPrepared({kind:'ASSISTANT_SAME_H0_140000_PREPARED_RUNTIME'}));
  await assert.rejects(prewrite.verifyAssistantSameH0PrewritePreservation({...options,preparedRuntimeRoot:'/never-prepared',reportPath:'/never-report'}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(prewrite.selectAssistantSameH0MetadataRoute({sourceRoot:options.sourceRoot,bundleManifestPath:options.bundleManifestPath,
    predecessorDescriptorPath:options.predecessorDescriptorPath}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  assert.throws(()=>plan.selectAssistantSameH0Route({migrationListText:'invalid; must not parse'}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  await assert.rejects(plan.verifyAssistantSameH0Plan({phase:'installed',migrationListText:'invalid',dryRunText:'invalid'}),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  for(const use of [()=>readiness.assistantSameH0RequiredMigrations(),()=>readiness.assertAssistantSameH0MigrationsApplied('invalid')])
    assert.throws(use,{code:'ASSISTANT_SAME_H0_UNISSUED'});
  for(const use of [()=>readiness.assertAssistantSameH0MigrationPlan({}),()=>readiness.prepareAssistantSameH0CutoverWorkdir({workdir:'/never-work'}),
    ()=>readiness.expectedCheckpointCasContract({sourcePhase:'assistant-same-h0'}),
    ()=>readiness.verifyIntegratedDatabaseReadback({url:'https://must-not-fetch.invalid',serviceRoleKey:'INERT',sourcePhase:'assistant-same-h0'})])
    await assert.rejects(use(),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  assert.equal(transports,0);
  assert.equal(readiness.REQUIRED_CUTOVER_MIGRATIONS.length,52);
  assert.equal(readiness.establishedNativeCurrentOriginRequiredMigrations().at(-1).version,'20261017140000');
  for(const [file,args,fixed]of [['assistant-same-h0-prewrite.mjs',['--slot','prepare'],'ASSISTANT_SAME_H0_PREWRITE_FAILED_DO_NOT_RETRY'],
    ['verify-assistant-same-h0-plan.mjs',['--select','--migration-list','/never-file'],'ASSISTANT_SAME_H0_UNISSUED']]){
    const result=spawnSync(process.execPath,[path.join(ROOT,'scripts',file),...args],{encoding:'utf8',timeout:10000,
      env:{...process.env,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_DB_PASSWORD:''}});
    assert.equal(result.status,1);assert.equal(result.stdout,'');assert(result.stderr.includes(fixed),result.stderr);
  }
});

test('new SAME_H0 callers: before versus installed flags are exclusive and cannot replay old grants',async()=>{
  const {assertAssistantSameH0PrewriteCaller:check}=await import('./assistant-same-h0-prewrite.mjs');
  const base={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'1',GITHUB_SHA:'b'.repeat(40),
    GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'true',RAVRADAR_ASSISTANT_SAME_H0_PHASE:'before',
    RAVRADAR_ASSISTANT_SAME_H0_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',RAVRADAR_ASSISTANT_SAME_H0_SAVED_WEATHER:'false',
    RAVRADAR_ASSISTANT_SAME_H0_RECOVERY_RUN_ID:'',RAVRADAR_ASSISTANT_SAME_H0_WRITER_ACTIVE:'false',RAVRADAR_ASSISTANT_SAME_H0_RECOVERY_GATE_RESULT:'success'};
  check(base);check({...base,RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN:'false',RAVRADAR_ASSISTANT_SAME_H0_PHASE:'installed'});
  for(const [key,value]of [['GITHUB_REF','refs/heads/other'],['GITHUB_RUN_ATTEMPT','2'],['RAVRADAR_ASSISTANT_SAME_H0_PHASE','installed'],
    ['RAVRADAR_ASSISTANT_SAME_H0_WRITER_ACTIVE','true'],['RAVRADAR_ASSISTANT_SAME_H0_SAVED_WEATHER','true'],
    ['RAVRADAR_ASSISTANT_SAME_H0_RECOVERY_RUN_ID','1'],['RAVRADAR_ASSISTANT_SAME_H0_RECOVERY_GATE_RESULT','failure'],
    ['RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN','true'],['RAVRADAR_USERDATA_UPGRADE_OPT_IN','true']])
    assert.throws(()=>check({...base,[key]:value}),key);
});

test('new SAME_H0 callers: paired selector preserves140000 and refuses unissued or mixed next family',async()=>{
  const paired=await import('./reconcile-private-runtime-checkpoint.mjs');
  const {ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING:old}=await import('./lib/established-native-current-origin-successor-source.mjs');
  const {ravScoreModelBinding}=await import('../js/core/ravscore-model-contract.js');
  const {ravScoreContinuationImplementationSha256}=await import('./lib/ravscore-continuation-implementation-contract.mjs');
  const current={I:ravScoreModelBinding().modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};
  const descriptor=(I,T)=>({modelBinding:{modelBundleSha256:I},contractHashes:{continuationStateContractSha256:T}});
  assert.equal(paired.requiresPrivateRuntimeCheckpointReconcile(descriptor(old.I,old.T)),true);
  for(const d of [descriptor(current.I,current.T),descriptor(old.I,current.T),descriptor(current.I,old.T),descriptor('0'.repeat(64),old.T),{},null])
    assert.equal(paired.requiresPrivateRuntimeCheckpointReconcile(d),false,'Unissued NEXT never becomes a family from caller data');
  assert.throws(()=>paired.assertPrivateRuntimeCheckpointPublicationDisposition(descriptor(old.I,old.T),'FAILED'));
  paired.assertPrivateRuntimeCheckpointPublicationDisposition(descriptor(old.I,old.T),'MEASURED_WARMUP_PUBLISHED');
});

test('new SAME_H0 reentry: normal frozen140000 S and exact whole metadata inverse only',async t=>{
  const {pathToFileURL}=await import('node:url');
  const {isDeepStrictEqual:same}=await import('node:util');
  const {constants:vmConstants}=await import('node:vm');
  const {default:os}=await import('node:os');
  const {withEstablishedNativeCurrentOrigin140000PredecessorSource:withFrozen}
    =await import('./check-established-native-current-origin-predecessor-source.mjs');
  const currentS=await import('./ravscore-continuation-checkpoint.mjs');
  const currentProtected=await import('./protected-ravscore-continuation-checkpoint.mjs');
  const {ravScoreModelBinding:currentI}=await import('../js/core/ravscore-model-contract.js');
  const {ravScoreModelBinding:currentC}=await import('./rollback-assets/ravscore-model-contract.js');
  const {ravScoreContinuationImplementationSha256}=await import('./lib/ravscore-continuation-implementation-contract.mjs');
  const {migrateExactModelBindingMetadata}=await import('./migrate-post-cutover-private-runtime.mjs');
  const {ESTABLISHED_NATIVE_CURRENT_ORIGIN_BINDING:FAMILY}=await import('./lib/established-native-current-origin-successor-source.mjs');
  const {ASSISTANT_SAME_H0_BINDING}=await import('./lib/assistant-same-h0-successor-source.mjs');
  assert.equal(ASSISTANT_SAME_H0_BINDING,null,'This data-boundary fixture issues no NEXT family or authority');
  const NEXT_FAMILY=Object.freeze({I:currentI().modelBundleSha256,C:currentC().modelBundleSha256,
    T:await ravScoreContinuationImplementationSha256()});
  const source=await fs.readFile(path.join(ROOT,'scripts/reconcile-private-runtime-checkpoint.mjs'),'utf8');
  const slice=(text,a,b)=>{assert.equal(text.split(a).length,2);assert.equal(text.split(b).length,2);
    return text.slice(text.indexOf(a),text.indexOf(b));};
  const family=slice(source,'function checkpointReconcileFamily(descriptor) {','export function requiresPrivateRuntimeCheckpointReconcile');
  const body=slice(source,'// Only the source-issued NEXT family','async function readPointer(request) {');
  const module=runInNewContext(family+body+'\n({restoreCheckpointForReconcile,assertSameH0CheckpointMetadataInverse});',
    {assert,structuredClone,path,pathToFileURL,fs,same,FAMILY,NEXT_FAMILY,
      need:(ok,code)=>assert(ok,'PAIRED_PUBLICATION_'+code),json:async file=>JSON.parse(await fs.readFile(file,'utf8')),
      restoreProtectedRavScoreContinuationCheckpoint:currentProtected.restoreProtectedRavScoreContinuationCheckpoint,
      withEstablishedNativeCurrentOrigin140000PredecessorSource:withFrozen,
      // Native import() executes the exact fixed file URL selected by the real
      // immutable source host above; no callback provides a model/validator.
    },{importModuleDynamically:vmConstants.USE_MAIN_CONTEXT_DEFAULT_LOADER});
  const own=await fs.mkdtemp(path.join(os.tmpdir(),'rr-same-h0-s-reentry-test-'));
  t.after(()=>fs.rm(own,{recursive:true,force:true}));
  const put=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value)+'\n');};
  const targetPath=label=>path.join(own,label,'.cache/ravscore-continuation-checkpoint/checkpoint.json');
  let old,older,changed,derived,factoryPins;
  await withFrozen(async frozenRoot=>{
    const load=file=>import(pathToFileURL(path.join(frozenRoot,file)).href);
    const oldS=await load('scripts/ravscore-continuation-checkpoint.mjs');
    const oldProtected=await load('scripts/protected-ravscore-continuation-checkpoint.mjs');
    const oldI=await load('js/core/ravscore-model-contract.js'),oldC=await load('scripts/rollback-assets/ravscore-model-contract.js');
    const I=await load('js/core/ravscore-integrated-state-pipeline.js'),G=await load('js/core/ravscore-candidate-g-state-pipeline.js');
    const staging=await load('scripts/lib/coastal-point-staging-contract.mjs'),rollback=await load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs');
    const contract=await load('scripts/lib/ravscore-continuation-implementation-contract.mjs');
    const fixture=execFileSync('git',['-C',ROOT,'show','85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9:scripts/test-protected-ravscore-continuation-checkpoint.mjs'],{encoding:'utf8'});
    const declarations=slice(fixture,'const PART_COUNT =','const safeShape =')
      +slice(fixture,'const samples = Array.from','const sourceDocument = sourceDocumentAt');
    factoryPins={gitHead:'85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9',wholeFixtureSha256:sha(fixture),wholeDeclarationsSha256:sha(declarations)};
    const factory=await runInNewContext('(async()=>{'+declarations+'\nreturn {sourceDocumentAt,atHour};})()',{
      crypto,JSON,Map,Array,Date,RAVSCORE_CONTINUATION_CHECKPOINT_POLICY:oldS.RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,
      ravScoreContinuationImplementationSha256:contract.ravScoreContinuationImplementationSha256,
      buildIntegratedRavScoreStateSeries:I.buildIntegratedRavScoreStateSeries,
      buildCandidateGDerivedStateSeries:G.buildCandidateGDerivedStateSeries,
      candidateGStateKey:staging.candidateGStateKey,CANDIDATE_G_OPERATIONAL_ROLLBACK_ID:rollback.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
      ravScoreModelBinding:oldI.ravScoreModelBinding,candidateGRollbackModelBinding:oldC.ravScoreModelBinding,
    });
    const save=async(label,hour,options)=>{const sourcePath=path.join(own,label,'conditions.json'),checkpointPath=targetPath(label);
      await put(sourcePath,factory.sourceDocumentAt(hour,'rr-same-h0-normal-synthetic',options));
      await oldS.saveRavScoreContinuationCheckpoint({repositoryRoot:frozenRoot,sourcePath,checkpointPath});
      return JSON.parse(await fs.readFile(checkpointPath,'utf8'));};
    old=await save('old',49);older=await save('older',48);changed=await save('changed',49,{candidateCurrentSpeedMps:0.2});
    const nextSource=structuredClone(factory.sourceDocumentAt(49,'rr-same-h0-normal-synthetic'));
    const originalSource=structuredClone(nextSource);
    const paths=[...migrateExactModelBindingMetadata(nextSource,oldI.ravScoreModelBinding(),currentI()),
      ...migrateExactModelBindingMetadata(nextSource,oldC.ravScoreModelBinding(),currentC())];
    for(const [id,part]of Object.entries(nextSource.coastalParts.parts)){
      assert.equal(part.ravScoreModel.currentState.modelBundleSha256,FAMILY.I);
      part.ravScoreModel.currentState.modelBundleSha256=NEXT_FAMILY.I;
      paths.push('coastalParts.parts.'+id+'.ravScoreModel.currentState.modelBundleSha256');
    }
    const inverse=structuredClone(nextSource);
    for(const key of paths){const keys=key.split('.');let dst=inverse,src=originalSource;
      for(const k of keys.slice(0,-1)){dst=dst[k];src=src[k];}dst[keys.at(-1)]=src[keys.at(-1)];}
    assert.deepEqual(inverse,originalSource,'Whole normal S fixture source inverse: ONLY explicit model-binding metadata');
    const nextSourcePath=path.join(own,'next/conditions.json'),nextPath=targetPath('next');await put(nextSourcePath,nextSource);
    await currentS.saveRavScoreContinuationCheckpoint({repositoryRoot:ROOT,sourcePath:nextSourcePath,checkpointPath:nextPath});
    derived=JSON.parse(await fs.readFile(nextPath,'utf8'));
    // The unmodified CURRENT normal protected restore is the actual RED seam.
    await assert.rejects(currentProtected.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:targetPath('red'),
      targetReference:old.productionReferenceAt,request:async()=>[{document_key:'ravscore-continuation-checkpoint',payload:old,version:1}]}),
      {message:'RavScore checkpoint continuation implementation is incompatible'});
    const validated=await oldProtected.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:targetPath('old-verified'),
      targetReference:old.productionReferenceAt,request:async()=>[{document_key:'ravscore-continuation-checkpoint',payload:old,version:1}]});
    assert.equal(validated.restored,true,'Genuine normal frozen140000 load succeeds with unchanged original digests');
  });
  const current={datasetId:derived.datasetId,productionReferenceAt:derived.productionReferenceAt,
    modelBinding:derived.modelBinding,contractHashes:{continuationStateContractSha256:derived.continuationStateContractSha256}};
  let reads=0;
  const read=payload=>async()=>{reads++;return payload===null?[]:[{document_key:'ravscore-continuation-checkpoint',payload,version:1}];};
  const restore=(label,payload,descriptor=current)=>module.restoreCheckpointForReconcile({current:descriptor,derived,
    checkpointPath:targetPath(label),request:read(payload)});
  const originalBytes=JSON.stringify(old),derivedBytes=JSON.stringify(derived);
  const result=await restore('green',old);assert.equal(result.sameH0Metadata,true);assert.deepEqual(result.saved,old);
  assert.equal(reads,2,'CURRENT rejection followed by a separate genuine normal frozen140000 read');
  assert.equal((await restore('current',derived)).sameH0Metadata,false,'Already NEXT is the unchanged normal branch');
  assert.equal((await restore('missing',null)).saved,null,'Absent S retains the unchanged normal branch');
  await assert.rejects(restore('older-rejected',older),/SAME_H0_IDENTITY/);
  await assert.rejects(restore('different-normal-old',changed),/SAME_H0_WHOLE_METADATA_INVERSE/);
  await assert.rejects(restore('old-family',old,{...current,modelBinding:old.modelBinding,
    contractHashes:{continuationStateContractSha256:old.continuationStateContractSha256}}),
    {message:'RavScore checkpoint continuation implementation is incompatible'});
  const beforeBadRead=reads,bad=structuredClone(derived);bad.states[Object.keys(bad.states)[0]].memory=999;
  await assert.rejects(restore('invalid-current',bad));assert.equal(reads,beforeBadRead+1,'Non-compatibility error must never enter frozen fallback');
  const oldTampered=structuredClone(old);oldTampered.states[Object.keys(oldTampered.states)[0]].memory=999;
  await assert.rejects(restore('invalid-old',oldTampered));
  const firstI=Object.keys(derived.states)[0],firstG=Object.keys(derived.candidateGRollbackCompanion.states)[0];
  const mutations=[
    x=>{x.datasetId+='-changed';},x=>{x.productionReferenceAt='2026-08-03T02:00:00.000Z';},
    x=>{x.privacy.extra='NO';},x=>{x.extra='NO';},x=>{x.states[firstI].extra='NO';},
    x=>{x.states[firstI].samplingContextKey='sha256:'+'0'.repeat(64);},
    x=>{x.states[firstI].currentEvidence[0].strength=0.123456;},
    x=>{x.candidateGRollbackCompanion.states[firstG].transportEvidence[0].strength=0.123456;},
    x=>{delete x.states[firstI];},x=>{x.candidateGRollbackCompanion.stateSha256='0'.repeat(64);},
    x=>{x.modelBinding.modelContractSha256='0'.repeat(64);},
    x=>{x.continuationStateContractSha256=FAMILY.T;},
  ];
  for(const mutate of mutations){const value=structuredClone(derived);mutate(value);
    assert.throws(()=>module.assertSameH0CheckpointMetadataInverse(old,value,current));}
  assert.equal(JSON.stringify(old),originalBytes);assert.equal(JSON.stringify(derived),derivedBytes);
  assert.match(source,/need\(restored\.sameH0Metadata \|\| saved === null \|\|/,'Only the qualified exact inverse extends the existing advancement guard');
  t.diagnostic(JSON.stringify({kind:'SAME_H0_NORMAL_S_BOUNDARY',partCount:673,normalOldLoaderRed:true,
    normalFrozen140000Loader:true,normalCurrentSave:true,wholeSourceMetadataInverse:true,metadataMutationRefusals:mutations.length,
    actualBAuthentication:false,CASExecuted:false,productionBS:false,nativePG:false,issuedNextFamily:false,factoryPins}));
});

test('new SAME_H0 activation: actual generic defaults and applied CLI cannot reuse historical52',async()=>{
  const ready=await import('./integrated-cutover-readiness.mjs');
  const sync=await import('./sync-ravscore-model-binding.mjs');
  const workflows=await import('./lib/production-workflow-sources.mjs');
  const historical=ready.establishedNativeCurrentOriginRequiredMigrations();assert.equal(historical.length,52);
  assert.equal(historical.at(-1).version,'20261017140000');
  const table='Local | Remote | Time (UTC)\n'+historical.map(row=>row.version+' | '+row.version+' | normal fixture').join('\n');
  assert.deepEqual(ready.assertEstablishedNativeCurrentOriginMigrationsApplied(table).appliedVersions,historical.map(row=>row.version));
  assert.throws(()=>ready.assertSupabaseMigrationsApplied(table),{code:'ASSISTANT_SAME_H0_UNISSUED'},
    'The actual generic applied export must NOT silently accept historical52 as current53');
  for(const use of [()=>ready.expectedCheckpointCasContract(),()=>ready.expectedTripBindingPolicy(),
    ()=>ready.inspectMigrationSources(),()=>ready.prepareTemporarySupabaseCutoverWorkdir({workdir:'/must-not-write'}),
    ()=>ready.buildIntegratedCutoverReadiness('a'.repeat(40),{publicImplementationClosureSha256:'b'.repeat(64)}),
    ()=>ready.verifyIntegratedDatabaseReadback({url:'https://must-not-fetch.invalid',serviceRoleKey:'INERT'}),
    ()=>sync.synchronizeRavScoreModelBinding(),()=>workflows.currentGridEdgePublicationRequired({},'integrated')])
    await assert.rejects(use(),{code:'ASSISTANT_SAME_H0_UNISSUED'});
  const cli=spawnSync(process.execPath,[path.join(ROOT,'scripts/integrated-cutover-readiness.mjs'),'applied',
    '--migration-list','/must-not-read'],{encoding:'utf8',timeout:10000,
    env:{...process.env,SUPABASE_URL:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_ACCESS_TOKEN:'',SUPABASE_DB_PASSWORD:''}});
  assert.equal(cli.status,1);assert.equal(cli.stdout,'');assert(cli.stderr.includes('ASSISTANT_SAME_H0_UNISSUED'));
  assert(!cli.stderr.includes('ENOENT'),'Unissued current CLI refuses BEFORE the supplied file read');
  const oldTest=await fs.readFile(path.join(ROOT,'scripts/test-established-native-current-origin-successor.mjs'));
  assert.equal(sha(oldTest),'fd851a28c08b8d71abcf3ef81991f92c29b31a4e9c3b1ea3aea7e628ce55a432');
});

test('new SAME_H0 activation: real code-only phase and Worker hooks preserve write order',async()=>{
  const source=await fs.readFile(path.join(ROOT,'.github/workflows/deploy-code-only-repair.yml'),'utf8');
  const {inverseAssistantSameH0CodeOnlyWorkflow}=await import('./lib/assistant-same-h0-caller-review.mjs');
  const check=source=>{
    assert.equal(sha(inverseAssistantSameH0CodeOnlyWorkflow(source)),'a5052ae64638aaf4df28523f8a8c401e13803707ea0d46e0bb371f012f33352b');
    const step=name=>{const marker='      - name: '+name;assert.equal(source.split(marker).length,2);const start=source.indexOf(marker),end=source.indexOf('\n      - name:',start+marker.length);
      return source.slice(start,end<0?undefined:end);};
    const ordered=[
      'Select only an already-installed SAME_H0 successor before private work',
      'Select only the exact authenticated140000 SAME_H0 metadata bridge',
      'Stage the exact saved public coastal registry before SAME_H0 metadata',
      'Verify actual already-installed contracts before SAME_H0 metadata reentry',
      'Prepare exact authenticated SAME_H0 metadata and private origin',
      'Install migrated saved private runtime atomically',
      'Authenticate original140000 B/S and compare every prepared SAME_H0 byte before new binding',
      'Select the sole pending SAME_H0 successor after actual original and no-loss proof',
      'Dry-run and require only the latest exact integrated migration',
      'Apply exact dry-run-verified post-cutover binding',
      'Read back migration and database binding',
      'Publish measured continuation only after verified warmup private runtime',
      'Update and attest the existing SELF_REPORTED Worker before new Edges',
      'Deploy exact rebound trip Edges after the required Worker update',
      'Deploy only the exact RavRadar assistant Edge function',
      'Publish exact integrated backend and Edge readiness for this source'];
    let previous=-1;for(const name of ordered){const at=source.indexOf(step(name));assert(at>previous,name);previous=at;}
    const readback=step('Read back migration and database binding');
    assert(readback.includes('node scripts/integrated-cutover-readiness.mjs applied'));
    assert(readback.includes('node scripts/integrated-cutover-readiness.mjs verify-db'));
    assert(readback.includes('RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN=false'));
    assert(readback.includes('RAVRADAR_ASSISTANT_SAME_H0_PHASE=installed'));
    const worker=step('Update and attest the existing SELF_REPORTED Worker before new Edges');
    for(const value of ["if: env.RAVRADAR_ASSISTANT_SAME_H0_EDGE_REQUIRED == 'true'",
      'RAVRADAR_ASSISTANT_SAME_H0_MIGRATION_VIEW: ${{ steps.migration-view.outputs.workdir }}',
      'SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}','node scripts/update-assistant-same-h0-trip-worker.mjs'])assert(worker.includes(value));
    const edges=step('Deploy exact rebound trip Edges after the required Worker update');
    for(const value of ['RAVRADAR_ASSISTANT_SAME_H0_EDGE_REQUIRED',"test \"$RAVRADAR_ASSISTANT_SAME_H0_PHASE\" = \"installed\"",
      "test \"$RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN\" = \"false\"",'functions deploy trip-log','functions deploy submit-observation',
      'node scripts/verify-trip-storage-edge.mjs'])assert(edges.includes(value));
    const apply=step('Apply exact dry-run-verified post-cutover binding');
    assert(apply.includes('scripts/assistant-same-h0-prewrite.mjs" --slot final'));
    assert(apply.includes('RAVRADAR_ASSISTANT_SAME_H0_PHASE:-'));
    assert.equal((source.match(/supabase db push --linked --skip-vault/g)??[]).length,1);
    assert(source.includes('test "$UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN" != "true"'));
    assert(source.includes("RAVRADAR_ASSISTANT_SAME_H0_METADATA_ONLY: 'false'"));
    assert(!source.includes("RAVRADAR_ASSISTANT_SAME_H0_METADATA_ONLY: 'true'"));
  };
  check(source);
  for(const [before,after]of [['RAVRADAR_ASSISTANT_SAME_H0_PHASE=installed','RAVRADAR_ASSISTANT_SAME_H0_PHASE=before'],
    ['node scripts/integrated-cutover-readiness.mjs applied','node scripts/integrated-cutover-readiness.mjs old-applied'],
    ['steps.migration-view.outputs.workdir','github.workspace'],
    ['SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}','SUPABASE_DB_PASSWORD: ""'],
    ['functions deploy submit-observation','functions deploy omitted-observation']])
    assert.throws(()=>check(source.replace(before,after)));
});

test('new SAME_H0 activation: normal mutable SQL inspection preserves both whole140000 originals',async()=>{
  const prior=await readAssistantSameH0PredecessorCanonicalSource();
  const builder=await fs.readFile(path.join(ROOT,'scripts/build-assistant-same-h0-successor.mjs'),'utf8');
  const slice=(a,b)=>{assert.equal(builder.split(a).length,2);assert.equal(builder.split(b).length,2);return builder.slice(builder.indexOf(a),builder.indexOf(b));};
  const source=slice("const CP='ravradar_ravscore_checkpoint_'",'const sha=value=>')
    +slice('const sha=value=>','const literal=value=>');
  const compiler=runInNewContext(source+'\n({compileAssistantSameH0Structure});',{assert,crypto,Buffer,OLD,PROJECTION,definition});
  const {checkpointMetadataCasBlock}=await import('./sync-ravscore-model-binding.mjs');
  const {ravScoreModelBinding:I}=await import('../js/core/ravscore-model-contract.js');
  const {ravScoreModelBinding:C}=await import('./rollback-assets/ravscore-model-contract.js');
  const {ravScoreContinuationImplementationSha256}=await import('./lib/ravscore-continuation-implementation-contract.mjs');
  // Actual normal getter values for this unissued source view, not the older
  // compiler-only2099 tuple and not a caller override of model validation.
  const physical={version:NEXT.version,I:I().modelBundleSha256,C:C().modelBundleSha256,
    T:await ravScoreContinuationImplementationSha256()};
  const next=compiler.compileAssistantSameH0Structure(prior.canonicalSource,physical);
  const args=[I(),C(),physical.T];
  const block=checkpointMetadataCasBlock(next.canonicalSource,...args);
  for(const name of ['origin140000_state_valid','origin140000_payload_valid']){
    const original=definition(next.canonicalSource,CP+name);assert(block.includes(original));
    assert.throws(()=>checkpointMetadataCasBlock(next.canonicalSource.replace(original,''),...args));
    assert.throws(()=>checkpointMetadataCasBlock(next.canonicalSource.replace(original,original.replace('begin\n','begin\n  -- tampered\n')),...args));
  }
  assert.equal(next.wholeCanonicalInverse,true);assert.equal(next.migrationIssued,false);
});
}
