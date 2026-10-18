// Normal source/factory tests only. Windows is NOT native PostgreSQL proof.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';import test from 'node:test';
import {assertAssistantSameH0TransactionBounds,compareAssistantSameH0Successor} from './lib/assistant-same-h0-postgres.mjs';
import {ASSISTANT_SAME_H0_BEFORE as OLD,ASSISTANT_SAME_H0_ALIASES as ALIASES,ASSISTANT_SAME_H0_PROJECTION as PROJECTION,
 requireAssistantSameH0Binding,requireAssistantSameH0Output,assistantSameH0Migration,readAssistantSameH0PredecessorCanonicalSource,
 readAssistantSameH0CanonicalSource,assistantSameH0Definition as definition} from './lib/assistant-same-h0-successor-source.mjs';
import {withFrozenEstablishedNativeCurrentOriginPostgresSource} from './run-frozen-established-native-current-origin-source-targets.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const load=file=>import(pathToFileURL(path.join(ROOT,file)).href);

test('issued53 native source requires exact old140000 and complete catalog/ACL/transaction contract',async()=>{
 const before=await readAssistantSameH0PredecessorCanonicalSource(),after=await readAssistantSameH0CanonicalSource(),pins=requireAssistantSameH0Output();
 const sql=await fs.readFile(path.join(ROOT,'supabase/migrations',assistantSameH0Migration().filename),'utf8');assert.equal(sha(sql),pins.migrationSha256);
 assertAssistantSameH0TransactionBounds(sql);
 for(const[a,b]of[["statement_timeout = '55s'","statement_timeout = '54s'"],["lock_timeout = '5s'","lock_timeout = '6s'"]])
  assert.throws(()=>assertAssistantSameH0TransactionBounds(sql.replace(a,b)));
 const counts=source=>{const body=definition(source,'ravradar_ravscore_checkpoint_contract'),array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(body);assert(array);
  return [(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,(body.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1];};
 assert.deepEqual(counts(before.canonicalSource),[23,26]);assert.deepEqual(counts(after.canonicalSource),[26,29]);assert.equal(ALIASES.length,3);
 for(const original of before.originalDefinitions)assert.equal(definition(after.canonicalSource,original.name),original.definition);
 assert.equal(definition(after.canonicalSource,'ravradar_ravscore_checkpoint_native_origin_projection').replace(
  'public.ravradar_ravscore_checkpoint_origin140000_payload_valid(','public.ravradar_ravscore_checkpoint_payload_valid('),
  definition(before.canonicalSource,'ravradar_ravscore_checkpoint_native_origin_projection'));
 const projection=definition(after.canonicalSource,PROJECTION);assert(projection.includes('origin140000_payload_valid(p_payload,p_target_reference)'));
 for(const literal of ['rr-20261016191945-210','d337d7fd8d111af723e26d9252bb8f56e679cb4dd66a226612e62971f4d661bb'])assert(!projection.includes(literal));
});

test('normal PR native route uses genuine frozen140000 factory then distinct current53 phase',async()=>{
 const [host,wrapper,caller,workflow]=await Promise.all(['scripts/lib/checkpoint-cas-native-postgres.mjs','scripts/run-frozen-established-native-current-origin-source-targets.mjs',
  'scripts/test-protected-ravscore-continuation-checkpoint.mjs','.github/workflows/validate-pull-request.yml'].map(file=>fs.readFile(path.join(ROOT,file),'utf8')));
 function check({host,wrapper,caller,workflow}){
  assert(host.includes('includeAssistantSameH0 = false'));assert(host.includes("'ASSISTANT_SAME_H0'"));
  const first=host.indexOf('withFrozenEstablishedNativeCurrentOriginPostgresSource(async({adapter,factory})=>'),last=host.indexOf('assistantSameH0=await compareAssistantSameH0Successor(');
  assert(first>=0&&last>first);assert(host.slice(first,last).includes('sourceDocumentAt:factory.sourceDocumentAt,atHour:factory.atHour,saveCheckpoint:factory.saveRavScoreContinuationCheckpoint'));
  assert(!host.includes("await import('./established-native-current-origin-postgres.mjs')"));
  assert(wrapper.includes("const fixed='85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9'"));
  assert(wrapper.includes('return await useVerifiedSource(sourceRoot,added.size);'),'Owned historical files must outlive the entire async caller');
  for(const pin of ['2e7024d0a90fea7fb9166f906450b65925cc9a9a8d9e800935952eaa78b9f27b','832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2',OLD.I,OLD.C,OLD.T])assert(wrapper.includes(pin));
  assert(caller.includes("includeAssistantSameH0: process.argv.includes('--assistant-same-h0')"));
  const command='node scripts/test-protected-ravscore-continuation-checkpoint.mjs --native-statistics-revision --native-sampling-identity --current-memory-warmup --established-native-current-origin --assistant-same-h0';
  assert.equal(workflow.split(command).length,2);
  assert(wrapper.includes("'scripts/test-assistant-same-h0-postgres-source.mjs'"));
 }
 const actual={host,wrapper,caller,workflow};check(actual);
 for(const [key,a,b]of[['workflow',' --assistant-same-h0',''],['host','withFrozenEstablishedNativeCurrentOriginPostgresSource(async({adapter,factory})=>','unqualifiedCurrentFactory('],
  ['host','adapter.compareEstablishedNativeCurrentOriginSuccessor({psql,runSql,root,\n          sourceDocumentAt:factory.sourceDocumentAt','adapter.compareEstablishedNativeCurrentOriginSuccessor({psql,runSql,root,\n          sourceDocumentAt:sourceDocumentAt'],['wrapper','return await useVerifiedSource(sourceRoot,added.size);','return useVerifiedSource(sourceRoot,added.size);'],
  ['caller',"includeAssistantSameH0: process.argv.includes('--assistant-same-h0')",'includeAssistantSameH0: false']]){
  assert(actual[key].includes(a));assert.throws(()=>check({...actual,[key]:actual[key].replace(a,b)}));
 }
});

test('genuine frozen140000 factory and normal current53 saver preserve whole same-H0 metadata inverse',async()=>{
 await withFrozenEstablishedNativeCurrentOriginPostgresSource(async({adapter,repositoryRoot,factory})=>{
  assert.equal(typeof adapter.compareEstablishedNativeCurrentOriginSuccessor,'function');assert.equal(factory.ravScoreModelBinding().modelBundleSha256,OLD.I);
  assert.equal(factory.candidateGRollbackModelBinding().modelBundleSha256,OLD.C);assert.equal(factory.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,OLD.T);
  const currentSource=await fs.readFile(path.join(ROOT,'scripts/test-protected-ravscore-continuation-checkpoint.mjs'),'utf8');
  const slice=(a,b)=>{assert.equal(currentSource.split(a).length,2);assert.equal(currentSource.split(b).length,2);return currentSource.slice(currentSource.indexOf(a),currentSource.indexOf(b));};
  const body=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');assert.equal(sha(body),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
  const imports=[['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
   ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
   ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
   ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs']];
  const text="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(ROOT,file)).href)+';').join('\n')+'\n'+body+'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint};';
  const current=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
  const temp=await fs.mkdtemp(path.join(await fs.realpath(os.tmpdir()),'rr-sameh0-pg-source-')),identity=await fs.lstat(temp,{bigint:true});
  try{
   const payloads=[];
   for(const [name,owner]of[['old',factory],['next',current]]){
    const sourcePath=path.join(temp,name+'-source.json'),checkpointPath=path.join(temp,name+'-checkpoint.json');
    await fs.writeFile(sourcePath,JSON.stringify(owner.sourceDocumentAt(49,'rr-native-identity-49')),{flag:'wx'});
    await owner.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath});payloads.push(JSON.parse(await fs.readFile(checkpointPath)));
   }
   const [old,next]=payloads,declared=requireAssistantSameH0Binding();assert.equal(old.partCount,673);assert.equal(next.partCount,673);
   assert.equal(next.modelBinding.modelBundleSha256,declared.I);assert.equal(next.candidateGRollbackCompanion.modelBinding.modelBundleSha256,declared.C);assert.equal(next.continuationStateContractSha256,declared.T);
   const inverse=structuredClone(next);inverse.modelBinding=structuredClone(old.modelBinding);inverse.continuationStateContractSha256=old.continuationStateContractSha256;
   inverse.candidateGRollbackCompanion.modelBinding=structuredClone(old.candidateGRollbackCompanion.modelBinding);
   for(const state of Object.values(inverse.states))state.modelBundleSha256=OLD.I;
   for(const key of ['generationSha256','stateSha256'])inverse[key]=old[key];inverse.candidateGRollbackCompanion.generationSha256=old.candidateGRollbackCompanion.generationSha256;
   assert.deepEqual(inverse,old,'Whole normal saved payload inverse, not count-only or caller tuple data');
   assert.equal(next.candidateGRollbackCompanion.stateSha256,old.candidateGRollbackCompanion.stateSha256);
   assert.notEqual(next.generationSha256,old.generationSha256);assert(repositoryRoot!==ROOT);
  }finally{
   const now=await fs.lstat(temp,{bigint:true});assert(!now.isSymbolicLink()&&now.dev===identity.dev&&now.ino===identity.ino&&now.birthtimeNs===identity.birthtimeNs);
   assert(path.basename(temp).startsWith('rr-sameh0-pg-source-'));for(const file of ['old-source.json','old-checkpoint.json','next-source.json','next-checkpoint.json'])await fs.unlink(path.join(temp,file));await fs.rmdir(temp);
  }
 });
});

test('current53 native phase preserves complete bank, original guards, source and no-auth boundaries',async()=>{
 const source=await fs.readFile(new URL('./lib/assistant-same-h0-postgres.mjs',import.meta.url),'utf8');
 assert.deepEqual(Object.keys(await import('./lib/assistant-same-h0-postgres.mjs')).sort(),['assertAssistantSameH0TransactionBounds','compareAssistantSameH0Successor']);
 const body=compareAssistantSameH0Successor.toString();
 for(const phase of ['BEFORE_VERSION','BEFORE_CATALOG','BEFORE_INVENTORY','INSTALL','READBACK','SAME_H0_WHOLE_METADATA_INVERSE','NORMAL_JSONB_ROUNDTRIP','PRESERVED'])assert(body.includes("phase = '"+phase+"'"));
 for(const name of ['same-H0-140000-metadata','same-H0-140000-numeric-change','same-H0-140000-wrong-version','newer-140000',
  'same-direct0600-refused','newer-direct0600-refused','same-direct0200-refused','newer-direct0200-refused'])assert(body.includes(name));
 for(const text of ["currentMemoryWarmupPreservationInventorySql('preserved')","currentMemoryWarmupPreservationInventorySql('original-bank')",'Old OID/ACL/owner/all native properties preserved',
  'normalProtectedJsonbRoundtrip: true','allEightOriginalFunctionsPreserved: true','sameH0SqlIsNotOriginAuthentication: true',"phase = 'PRESERVED'"])assert(source.includes(text));
 assert(!source.includes('artificialSelectorMechanics'));assert(!source.includes('productionSeedAuthenticated: true'));assert(!source.includes('console.error(error)'));
});
