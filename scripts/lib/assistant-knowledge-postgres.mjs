// Native source-test phase only; the existing owned Unix-socket host executes SQL.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {withAssistantKnowledgePredecessorSource} from '../check-assistant-knowledge-predecessor-source.mjs';
import {ASSISTANT_KNOWLEDGE_BEFORE as OLD,ASSISTANT_KNOWLEDGE_BINDING as NEXT,
  ASSISTANT_KNOWLEDGE_OUTPUT as PINS,ASSISTANT_KNOWLEDGE_REPLACEMENTS as REPLACEMENTS,
  ASSISTANT_KNOWLEDGE_PROJECTION as PROJECTION,assistantKnowledgeMigration,
  readAssistantKnowledgeBeforeSource,readAssistantKnowledgeCanonicalSource,assistantKnowledgeDefinition as definition}
  from './assistant-knowledge-successor-source.mjs';
import {expectedCheckpointCasContract,expectedTripBindingPolicy} from '../integrated-cutover-readiness.mjs';
import {verifyStatisticsPreferenceRevisionCatalogMetadata,statisticsPreferenceRevisionCatalogQuery}
  from '../verify-account-assistant-schema.mjs';
import {restoreProtectedRavScoreContinuationCheckpoint} from '../protected-ravscore-continuation-checkpoint.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY} from '../ravscore-continuation-checkpoint.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HEAD='229d11935776871083116c41b8e230b7841a4038',TREE='0265a6fc57a95557209f73a9fde2034e0151620b';
const TARGET='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
const CP='ravradar_ravscore_checkpoint_',CAS='public.'+CP+'cas',KEY='ravscore-continuation-checkpoint';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const body=v=>v.slice(v.indexOf('as $$')+5,v.lastIndexOf('$$;')).trim();
const execute=promisify(callbackExec);

// Actual fixed229d/0200 declarations evaluated ONLY against its validated C69/I71/T12.
// Neither a current constructor nor a changed binding can manufacture old receipts.
export async function withIssued0200CheckpointFactory(useFactory){
  assert.equal(arguments.length,1);assert.equal(typeof useFactory,'function');
  const git=async args=>(await execute('git',['-C',ROOT,...args],{encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024})).stdout;
  assert.equal((await git(['rev-parse',HEAD+'^{tree}'])).trim(),TREE);
  assert.match(await git(['ls-tree',HEAD,'--',TARGET]),/^100644 blob [a-f0-9]{40}\t/);
  const source=await git(['show',HEAD+':'+TARGET]);
  assert.equal(sha(source),'d80211e76007b50518b13bca56e25b6caa29d8d3edee41e32b393ff474a54c6e');
  const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);assert(source.indexOf(a)<source.indexOf(b));return source.slice(source.indexOf(a),source.indexOf(b));};
  const factory=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
  assert.equal(sha(factory),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
  return withAssistantKnowledgePredecessorSource(async root=>{
    const imports=[['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
      ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
      ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
      ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
      ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
      ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
      ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
      ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs']];
    const text="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(root,file)).href)+';').join('\n')
      +'\n'+factory+'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256};';
    const loaded=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
    assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,OLD.integrated);
    assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,OLD.candidate);
    assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,OLD.continuation);
    return useFactory(Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE}));
  });
}

export function assertAssistantKnowledgeTransactionBounds(sql){
  assert.equal(typeof sql,'string');
  assert.match(sql,/begin;\n\nset local statement_timeout = '55s';\n\nset local lock_timeout = '5s';/);
}

export function assistantKnowledgePreservationInventorySql(scope){
  assert(['preserved','original-bank'].includes(scope));
  const tables=scope==='preserved'?[
    ['checkpoint','admin_documents'],['history','admin_document_versions'],
    ['activity','account_activity_journal'],['preference','account_statistics_preferences'],
    ['bank','native_checkpoint_payloads'],
  ]:[['bank','native_checkpoint_payloads']];
  // Hash each COMPLETE row, including unknown fields, before any aggregation.
  // Only fixed-size fingerprints enter the materialized relation. No combined
  // checkpoint payload/whole-bank JSONB value is constructed or transported.
  const rows=tables.map(([name,table])=>"select '"+name+"'::text as table_name,"
    +"octet_length(row_bytes)::bigint as row_bytes,"
    +"encode(extensions.digest(row_bytes,'sha256'),'hex') as row_sha256 "
    +"from (select convert_to(to_jsonb(t)::text,'UTF8') as row_bytes from public."+table+" t"
    +(scope==='original-bank'?" where t.name not like 'after0200-%'":"")+") as whole_rows").join('\nunion all\n');
  return 'with row_fingerprints as materialized (\n'+rows+'\n),\n'
    +"table_names(table_name) as (values "+tables.map(([name])=>"('"+name+"')").join(',')+"),\n"
    +'inventory as (\n'
    +"select n.table_name,0 as kind,''::text as row_sha256,0::bigint as row_bytes,"
    +'count(f.row_sha256) as row_count,coalesce(sum(f.row_bytes),0) as total_bytes '
    +'from table_names n left join row_fingerprints f using(table_name) group by n.table_name\n'
    +'union all\n'
    +'select table_name,1,row_sha256,row_bytes,count(*),0::numeric '
    +'from row_fingerprints group by table_name,row_sha256,row_bytes\n)\n'
    // Totals also identify empty tables; grouped copies preserve duplicates.
    +'select jsonb_build_array(table_name,kind,row_sha256,row_bytes,row_count,total_bytes)::text '
    +'from inventory order by table_name collate "C",kind,row_sha256 collate "C",row_bytes;';
}

export async function compareAssistantKnowledgeSuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint}){
  let phase='SOURCE';
  try{
    const before=await readAssistantKnowledgeBeforeSource(),after=await readAssistantKnowledgeCanonicalSource(),migration=assistantKnowledgeMigration();
    const sql=await fs.readFile(path.join(ROOT,'supabase/migrations',migration.filename),'utf8');
    assert.equal(sha(sql),PINS.migrationSha256);assert.equal(sha(before.canonicalSource),OLD.canonicalSha256);assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);
    const expected={checkpoint:await expectedCheckpointCasContract(),trip:await expectedTripBindingPolicy()};
    assert.equal(expected.checkpoint.sha256,PINS.checkpointContractSha256);assert.equal(expected.trip.sha256,PINS.tripBindingPolicySha256);
    assertAssistantKnowledgeTransactionBounds(sql);
    phase='BEFORE_VERSION';assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'),OLD.version);
    const names=[...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]);
    // Full source keys; PostgreSQL OIDs/name truncation are NOT ordinal20 slots.
    const catalogSql=items=>"select jsonb_object_agg(requested.source_name,jsonb_build_object('oid',p.oid,'definer',p.prosecdef,'volatility',p.provolatile,'config',p.proconfig,'acl',p.proacl,'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex'))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join (values "+items.map(n=>"('"+n+"')").join(',')+") as requested(source_name) on p.proname=requested.source_name::pg_catalog.name where n.nspname='public';";
    phase='BEFORE_CATALOG';const catalogBefore=JSON.parse(await psql(catalogSql(names)));assert.deepEqual(Object.keys(catalogBefore).sort(),[...names].sort());
    for(const name of names)assert.equal(catalogBefore[name].body,sha(body(definition(before.canonicalSource,name))));
    const preservedSql=assistantKnowledgePreservationInventorySql('preserved');
    phase='BEFORE_INVENTORY';const preserved=await psql(preservedSql),archives=await fs.readdir(path.join(ROOT,'supabase/migrations'));
    const archivePins=new Map(await Promise.all(archives.filter(f=>f.endsWith('.sql')).map(async f=>[f,sha(await fs.readFile(path.join(ROOT,'supabase/migrations',f)))])));
    const guards=[
      ["delete from supabase_migrations.schema_migrations where version='20261017020000';","insert into supabase_migrations.schema_migrations values('20261017020000');"],
      ["delete from supabase_migrations.schema_migrations where version='20261016060000';","insert into supabase_migrations.schema_migrations values('20261016060000');"],
      ["delete from supabase_migrations.schema_migrations where version='20261013230000';","insert into supabase_migrations.schema_migrations values('20261013230000');"],
      ["insert into supabase_migrations.schema_migrations values('20990101000000');","delete from supabase_migrations.schema_migrations where version='20990101000000';"],
      ['alter function '+CAS+'(bigint,timestamptz,jsonb) security invoker;','alter function '+CAS+'(bigint,timestamptz,jsonb) security definer;'],
      ["alter function "+CAS+"(bigint,timestamptz,jsonb) set statement_timeout='54s';","alter function "+CAS+"(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
      ['revoke execute on function '+CAS+'(bigint,timestamptz,jsonb) from service_role;','grant execute on function '+CAS+'(bigint,timestamptz,jsonb) to service_role;'],
      ['grant execute on function public.'+CP+'native_identity_i71_payload_valid(jsonb,timestamptz) to authenticated;','revoke execute on function public.'+CP+'native_identity_i71_payload_valid(jsonb,timestamptz) from authenticated;'],
    ];
    for(const [index,[drift,restore]] of guards.entries()){
      phase='GUARD_'+index;await psql(drift);assert.notEqual((await runSql(sql)).code,0);await psql(restore);
      assert.equal(await psql(preservedSql),preserved);assert.deepEqual(JSON.parse(await psql(catalogSql(names))),catalogBefore);
      assert.equal(await psql("select to_regprocedure('public."+PROJECTION+"(jsonb,timestamptz)') is null;"),'t');
    }
    phase='INSTALL';await psql(sql);assert.equal(await psql("select current_setting('lock_timeout');"),'0');assert.equal(await psql(preservedSql),preserved);
    await psql("insert into supabase_migrations.schema_migrations values('"+migration.version+"');");assert.notEqual((await runSql(sql)).code,0,'No consumed-grant replay');
    const catalogAfter=JSON.parse(await psql(catalogSql([...names,PROJECTION])));
    for(const name of names){assert.equal(catalogAfter[name].oid,catalogBefore[name].oid);assert.equal(catalogAfter[name].body,sha(body(definition(after.canonicalSource,name))));
      if(!REPLACEMENTS.includes(name))assert.deepEqual(catalogAfter[name],catalogBefore[name]);else{const {body:a,...old}=catalogBefore[name],{body:b,...current}=catalogAfter[name];assert.deepEqual(current,old);}}
    assert.equal(catalogAfter[PROJECTION].body,sha(body(definition(after.canonicalSource,PROJECTION))));
    phase='READBACK';const contract=JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+CP+'contract();'));
    assert.equal(contract.appliedMigrationVersion,'20260920220000');assert.deepEqual(contract.checkpointContract,{id:expected.checkpoint.id,definition:expected.checkpoint.definition});
    assert.deepEqual(contract.checks,Object.fromEntries(['checkpointContractDefinitionPresent','checkpointCanonicalTimeHelperStableSecurityInvoker',
      'checkpointHistoryExclusionInstalled','checkpointDirectPayloadReadRestricted','checkpointCasSecurityDefiner','checkpointCasStatementTimeout55Seconds',
      'checkpointCasServiceRoleExecutable','checkpointCasAnonymousExecutionRejected','checkpointValidatorExecutionRestricted','checkpointFunctionsSearchPathLocked'].map(k=>[k,true])));
    const trip=await psql("select (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'::regprocedure)||E'\\n-- calibration-truth-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure)||E'\\n-- binding-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure);");
    assert.equal(sha(trip),PINS.tripBindingPolicySha256);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(await psql(statisticsPreferenceRevisionCatalogQuery)))).schemaVersion,2);
    phase='CURRENT_FIXTURES';const current={};
    for(const [name,hour,options] of [['same',49,{}],['newer',50,{}],['changed',49,{candidateCurrentSpeedMps:0.18}]]){
      const sourcePath=path.join(root,'after0200-'+name+'-source.json'),checkpointPath=path.join(root,'after0200-'+name+'-checkpoint.json');
      // SAME dataset/time/source values as the genuine issued0200 producer phase.
      await fs.writeFile(sourcePath,JSON.stringify(sourceDocumentAt(hour,'rr-native-identity-'+hour,options)),{flag:'wx'});await saveCheckpoint({sourcePath,checkpointPath});
      const payload=JSON.parse(await fs.readFile(checkpointPath,'utf8'));assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,NEXT.I);assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,NEXT.C);assert.equal(payload.continuationStateContractSha256,NEXT.T);
      const text=JSON.stringify(payload);assert(!text.includes('$after0600_fixture$'));
      await psql("insert into native_checkpoint_payloads values('after0200-"+name+"',$after0600_fixture$"+text+'$after0600_fixture$::jsonb);');current[name]=payload;
      assert.equal(await psql("select public."+CP+"payload_valid((select payload from native_checkpoint_payloads where name='after0200-"+name+"'),'"+atHour(hour)+"');"),'t');
    }
    phase='NORMAL_JSONB_ROUNDTRIP';const size=Number(await psql("select octet_length(convert_to(payload::text,'UTF8')) from native_checkpoint_payloads where name='after0200-same';"));
    assert(Number.isSafeInteger(size)&&size>0&&size<=RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes);const chunks=[];
    for(let offset=1;offset<=size;offset+=262144)chunks.push(Buffer.from((await psql("select encode(substring(convert_to(payload::text,'UTF8') from "+offset+" for 262144),'base64') from native_checkpoint_payloads where name='after0200-same';")).replace(/\s/g,''),'base64'));
    const bytes=Buffer.concat(chunks);assert.equal(bytes.length,size);const payload=JSON.parse(bytes.toString('utf8'));assert.deepEqual(payload,current.same);
    assert.notEqual(JSON.stringify(payload),JSON.stringify(current.same));
    const checkpointPath=path.join(root,'after0200-jsonb/.cache/ravscore-continuation-checkpoint/checkpoint.json'),request=async()=>[{document_key:KEY,payload,version:1}];
    const restored=await restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:atHour(49),request});assert.equal(restored.restored,true);assert.equal(restored.objectMemberOrderRestored,true);
    const restoredBytes=await fs.readFile(checkpointPath);assert.deepEqual(JSON.parse(restoredBytes),current.same);
    assert.equal((await restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:atHour(49),request})).reason,'protected-checkpoint-equivalent');assert.deepEqual(await fs.readFile(checkpointPath),restoredBytes);
    const originalBankSql=assistantKnowledgePreservationInventorySql('original-bank');
    const originalBank=await psql(originalBankSql),accountSql="select md5(jsonb_build_object('activity',(select jsonb_agg(to_jsonb(t) order by user_id) from account_activity_journal t),'preference',(select jsonb_agg(to_jsonb(t) order by user_id) from account_statistics_preferences t))::text);",account=await psql(accountSql);
    phase='ORIGINAL_PROJECTION';assert.equal(await psql("select public."+PROJECTION+"((select payload from native_checkpoint_payloads where name='after0600-same'),'"+atHour(49)+"') is not null;"),'t');
    const cases=[
      ['same-native','after0600-same','after0200-same',1,null,'updated',2],
      ['same-native-changed','after0600-same','after0200-changed',1,'23505',null,1],
      ['newer-native','after0600-same','after0200-newer',1,null,'updated',2],
      ['wrong-version','after0600-same','after0200-newer',0,'40001',null,1],
      ['equal-current','after0200-same','after0200-same',0,null,'unchanged',1],
      ['newer-current','after0200-same','after0200-newer',1,null,'updated',2],
      ['regression','after0200-newer','after0200-same',1,'22023',null,1],
    ];
    for(const [family,central] of [['native0600','identity-same'],['i994','grid-current'],...['ffc','249','c1ac'].map(f=>[f,'original-'+f])]){
      cases.push(['newer-'+family,central,'after0200-newer',1,null,'updated',2],['same-'+family,central,'after0200-same',1,'22023',null,1]);
    }
    for(const [kind,expression] of [['value',"jsonb_set(payload,'{states,part-001,currentEvidence,0,strength}','2'::jsonb)"],['field',"jsonb_set(payload,'{unknownField}','true'::jsonb)"],['part',"payload #- '{states,part-001}'"],['T',"jsonb_set(payload,'{continuationStateContractSha256}',to_jsonb(repeat('e',64)))"]]){
      const name='after0200-invalid-'+kind.toLowerCase();await psql("insert into native_checkpoint_payloads select '"+name+"',"+expression+" from native_checkpoint_payloads where name='after0600-same';");
      assert.equal(await psql("select public."+PROJECTION+"((select payload from native_checkpoint_payloads where name='"+name+"'),'"+atHour(49)+"') is null;"),'t');
      cases.push([name,name,'after0200-newer',1,'22023',null,1]);
    }
    const reports=[];
    for(const [name,central,incoming,version,code,disposition,storedVersion] of cases){phase='CASE_'+name.toUpperCase().replaceAll('-','_');
      const observed=JSON.parse(await psql("truncate admin_documents;insert into admin_documents(document_key,payload,version,updated_by) select '"+KEY+"',payload,1,'00000000-0000-0000-0000-000000000001' from native_checkpoint_payloads where name='"+central+"';set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,"+version+",(select payload from native_checkpoint_payloads where name='"+incoming+"'));"));
      assert.equal(observed.sqlstate,code);assert.equal(observed.stored.version,storedVersion);
      if(disposition){assert.equal(observed.result.disposition,disposition);assert.equal(observed.result.centralVersion,storedVersion);}
      if(code||disposition==='unchanged'){const {storedPayloadMatchesIncoming,...stored}=observed.stored;assert.deepEqual(stored,observed.previous);assert.equal(stored.ownerIsNull,false);}
      else{assert.equal(observed.stored.ownerIsNull,true);assert.equal(observed.stored.storedPayloadMatchesIncoming,true);}
      reports.push({case:name,sqlstate:code,disposition,storedVersion});
    }
    phase='PRESERVED';assert.equal(await psql(originalBankSql),originalBank);assert.equal(await psql(accountSql),account);assert.equal(await psql('select count(*) from admin_document_versions;'),'0');
    assert.deepEqual(JSON.parse(await psql(catalogSql([...names,PROJECTION]))),catalogAfter);
    for(const [file,pin] of archivePins)assert.equal(sha(await fs.readFile(path.join(ROOT,'supabase/migrations',file))),pin);
    return {kind:'ASSISTANT_KNOWLEDGE_SUCCESSOR',sqlExecuted:true,wholeMigrationExecuted:true,migrationVersion:migration.version,partCount:673,
      nativeOriginalProducer:true,oldFamiliesPreserved:true,allEightOriginalFunctionsPreserved:true,beforeGuardCases:guards.length,
      exactCheckpointContract:true,exactTripContract:true,schema2Catalog:true,normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true,reports};
  }catch(error){console.error(JSON.stringify({kind:'ASSISTANT_KNOWLEDGE_NATIVE_FIRST_FAILURE',phase,category:error?.code==='ERR_ASSERTION'?'ASSERTION_FAILED':'NATIVE_CALL_FAILED',privatePayloadIncluded:false}));throw error;}
}
