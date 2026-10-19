// Native TEST phase only. The existing owned socket-only PostgreSQL host must
// first run the genuine frozen140000 phase. No installer or old-model retag.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LAST_MILE_ENCLOSURE_BEFORE as OLD,LAST_MILE_ENCLOSURE_ALIASES as ALIASES,
  LAST_MILE_ENCLOSURE_REPLACEMENTS as REPLACEMENTS,requireLastMileEnclosureBinding,
  requireLastMileEnclosureOutput,lastMileEnclosureMigration,readLastMileEnclosureCanonicalSource,
  readLastMileEnclosurePredecessorCanonicalSource,lastMileEnclosureDefinition as definition}
  from './last-mile-enclosure-successor-source.mjs';
import {currentMemoryWarmupPreservationInventorySql} from './current-memory-warmup-postgres.mjs';
import {expectedCheckpointCasContract,expectedTripBindingPolicy} from '../integrated-cutover-readiness.mjs';
import {statisticsPreferenceRevisionCatalogQuery,verifyStatisticsPreferenceRevisionCatalogMetadata}
  from '../verify-account-assistant-schema.mjs';
import {restoreProtectedRavScoreContinuationCheckpoint} from '../protected-ravscore-continuation-checkpoint.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY} from '../ravscore-continuation-checkpoint.mjs';
import {buildIntegratedRavScoreStateSeries} from '../../js/core/ravscore-integrated-state-pipeline.js';
import {buildCandidateGDerivedStateSeries} from '../../js/core/ravscore-candidate-g-state-pipeline.js';
import {candidateGStateKey} from './coastal-point-staging-contract.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CP='ravradar_ravscore_checkpoint_',CAS='public.'+CP+'cas',KEY='ravscore-continuation-checkpoint';
const PREFIX='last-mile-584-';
export const LAST_MILE_ENCLOSURE_OLD_PG_ROWS=Object.freeze({same:'origin-current-same',newer:'origin-current-newer',changed:'origin-current-changed'});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const body=value=>value.slice(value.indexOf('as $$')+5,value.lastIndexOf('$$;')).trim();
const literal=value=>{assert.equal(typeof value,'string');assert(!value.includes("'"));return "'"+value+"'";};
export function assertLastMileEnclosureTransactionBounds(sql){
  assert.equal(typeof sql,'string');
  assert.match(sql,/begin;\n\nset local statement_timeout = '55s';\n\nset local lock_timeout = '5s';/);
}
const catalogSql=names=>"select jsonb_object_agg(requested.name,jsonb_build_object('properties',to_jsonb(p)-array['prosrc','prosqlbody'],"
  +"'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')))"
  +' from pg_proc p join pg_namespace n on n.oid=p.pronamespace join (values '
  +names.map(name=>'('+literal(name)+')').join(',')+") requested(name) on p.proname=requested.name::pg_catalog.name where n.nspname='public';";
const migrationRowsSql="select jsonb_agg(to_jsonb(x) order by version)::text from supabase_migrations.schema_migrations x;";
function accountRowsSql(){
  return "with rows as (select 'activity' as t,convert_to(to_jsonb(x)::text,'UTF8') as b from public.account_activity_journal x"
    +" union all select 'preference',convert_to(to_jsonb(x)::text,'UTF8') from public.account_statistics_preferences x)"
    +", fingerprints as (select t,encode(extensions.digest(b,'sha256'),'hex') as h,octet_length(b) as n from rows)"
    +" select jsonb_build_array(t,h,n,count(*))::text from fingerprints group by t,h,n order by t collate \"C\",h collate \"C\",n;";
}
export function lastMileEnclosureBeforeGuards(){
  return [
    ['missing140000',"delete from supabase_migrations.schema_migrations where version='"+OLD.version+"';","insert into supabase_migrations.schema_migrations values('"+OLD.version+"');"],
    ['missing230',"delete from supabase_migrations.schema_migrations where version='20261013230000';","insert into supabase_migrations.schema_migrations values('20261013230000');"],
    ['forbiddenArchivedPhase',"insert into supabase_migrations.schema_migrations values('20261016030000');","delete from supabase_migrations.schema_migrations where version='20261016030000';"],
    ['casDefiner','alter function '+CAS+'(bigint,timestamptz,jsonb) security invoker;','alter function '+CAS+'(bigint,timestamptz,jsonb) security definer;'],
    ['cas55s','alter function '+CAS+"(bigint,timestamptz,jsonb) set statement_timeout='54s';",'alter function '+CAS+"(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
    ['casServiceGrant','revoke execute on function '+CAS+'(bigint,timestamptz,jsonb) from service_role;','grant execute on function '+CAS+'(bigint,timestamptz,jsonb) to service_role;'],
    ['oldPrivateAliasAcl','grant execute on function public.'+CP+'native_identity_i71_payload_valid(jsonb,timestamptz) to authenticated;',
      'revoke execute on function public.'+CP+'native_identity_i71_payload_valid(jsonb,timestamptz) from authenticated;'],
    ['destinationAbsent','create function public.'+ALIASES[0].name+'(jsonb,text) returns boolean language sql as $$select false$$;',
      'drop function public.'+ALIASES[0].name+'(jsonb,text);'],
  ];
}
function reset(central){return 'truncate public.admin_documents;'+(central?"insert into public.admin_documents(document_key,payload,version,updated_by)"
  +" select '"+KEY+"',payload,1,'00000000-0000-0000-0000-000000000001' from public.native_checkpoint_payloads where name="+literal(central)+';':'');}
function observedEquals(observed,code,disposition,storedVersion){
  assert.equal(observed.sqlstate,code);assert.equal(observed.stored.version,storedVersion);
  if(disposition){assert.equal(observed.result.disposition,disposition);assert.equal(observed.result.centralVersion,storedVersion);}
  if(code||disposition==='unchanged'){
    const{storedPayloadMatchesIncoming,...stored}=observed.stored;
    assert.deepEqual(stored,observed.previous);assert.equal(stored.ownerIsNull,false);
  }else{assert.equal(observed.stored.ownerIsNull,true);assert.equal(observed.stored.storedPayloadMatchesIncoming,true);}
}

// The existing sourceDocumentAt(6) is NOT a cold-seven-hour fixture: its
// Candidate G helper independently constructs49 past hours. Build both
// models from exactly seven actual new rows, with no initial I/G state.
export function lastMileEnclosureSevenHourSource(sourceDocumentAt,atHour){
  assert.equal(typeof sourceDocumentAt,'function');assert.equal(typeof atHour,'function');
  const template=sourceDocumentAt(49,'rr-last-mile-584-template-only');
  const parts=Object.values(template.coastalParts.parts);assert.equal(parts.length,673);
  const rows=Array.from({length:7},(_,hour)=>({time:atHour(hour),currentSpeedMps:0.12,currentAlignment:0.75,currentVerified:true,
    waveHeightM:hour>=2&&hour<=5?null:4,wavePeriodS:hour>=2&&hour<=5?null:10,
    waveDirectionDeg:hour>=2&&hour<=5?null:0}));
  const pairs=parts.map(part=>{
    const partRows=rows.map(row=>({...row,waveDirectionDeg:row.waveDirectionDeg===null?null:part.onshoreDirectionDeg}));
    const integrated=buildIntegratedRavScoreStateSeries(partRows,{samplingContextKey:part.ravScoreModel.currentState.samplingContextKey,
      onshoreDirectionDeg:part.onshoreDirectionDeg});
    const candidate=buildCandidateGDerivedStateSeries(partRows,{stateKey:candidateGStateKey(part)});
    assert.equal(integrated.initialStateAccepted,false);assert.equal(integrated.initialStateSource,'COLD_START');
    assert.equal(integrated.rows.length,7);assert.equal(integrated.continuationState.currentMemoryReady,false);
    assert.equal(candidate.continuationState.transportMemoryReady,false);
    return [part,integrated.continuationState,candidate.continuationState];
  });
  const oldRoot=template.ravScoreCandidateGRollback;
  assert(oldRoot?.sourceModelBinding&&oldRoot?.rollbackModelBinding);
  return {datasetId:'rr-last-mile-584-cold-seven',productionReferenceAt:atHour(6),
    coastalParts:{parts:Object.fromEntries(pairs.map(([part,state])=>[part.partId,{...part,ravScoreModel:{currentState:state}}]))},
    ravScoreCandidateGWarmup:{schemaVersion:'1.0.0',kind:'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
      privacyClass:'PRIVATE_PRODUCTION_RUNTIME',status:'BUILDING_MEASURED_ONLY',evidencePolicy:'MEASURED_ONLY',
      syntheticHistoryAllowed:false,automaticActivationAllowed:false,publicDuringNormalOperation:false,
      sourceModelBinding:oldRoot.sourceModelBinding,candidateModelBinding:oldRoot.rollbackModelBinding,
      runtime:{modelBinding:oldRoot.rollbackModelBinding,status:'BUILDING_MEASURED_ONLY',expectedPartCount:673,measuredPartCount:673,
        parts:Object.fromEntries(pairs.map(([part,,state])=>[part.partId,{ravScoreModel:{currentState:state}}]))}}};
}

export async function compareLastMileEnclosureSuccessor({psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint}){
  let phase='SOURCE';
  try{
    for(const fn of[psql,runSql,sourceDocumentAt,atHour,saveCheckpoint])assert.equal(typeof fn,'function');
    assert(path.isAbsolute(root));
    const NEXT=requireLastMileEnclosureBinding(),PINS=requireLastMileEnclosureOutput();
    const before=await readLastMileEnclosurePredecessorCanonicalSource(),after=await readLastMileEnclosureCanonicalSource();
    const migration=lastMileEnclosureMigration(),sql=await fs.readFile(path.join(ROOT,'supabase/migrations',migration.filename),'utf8');
    assert.equal(sha(sql),PINS.migrationSha256);assert.equal(sha(before.canonicalSource),OLD.canonicalSha256);
    assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);assertLastMileEnclosureTransactionBounds(sql);
    const expected={checkpoint:await expectedCheckpointCasContract({sourcePhase:'last-mile-enclosure'}),
      trip:await expectedTripBindingPolicy({sourcePhase:'last-mile-enclosure'})};
    assert.equal(expected.checkpoint.sha256,PINS.checkpointContractSha256);assert.equal(expected.trip.sha256,PINS.tripBindingPolicySha256);
    const contractDefinition=definition(after.canonicalSource,CP+'contract');
    const oidArray=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contractDefinition);assert(oidArray);
    assert.equal((oidArray[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,25);
    assert.equal((contractDefinition.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,28);
    const names=[...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]);
    const allNames=[...names,...ALIASES.map(row=>row.name)];assert.equal(new Set(allNames).size,names.length+2);
    phase='GENUINE_OLD140000_BANK';
    assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'),OLD.version);
    for(const[name,hour]of[[LAST_MILE_ENCLOSURE_OLD_PG_ROWS.same,49],[LAST_MILE_ENCLOSURE_OLD_PG_ROWS.newer,50],
      [LAST_MILE_ENCLOSURE_OLD_PG_ROWS.changed,49]]){
      const metadata=JSON.parse(await psql("select jsonb_build_object('I',payload#>>'{modelBinding,modelBundleSha256}',"
        +"'C',payload#>>'{candidateGRollbackCompanion,modelBinding,modelBundleSha256}','T',payload->>'continuationStateContractSha256')"
        +' from native_checkpoint_payloads where name='+literal(name)+';'));
      assert.deepEqual(metadata,{I:OLD.I,C:OLD.C,T:OLD.T},'Preceding genuine140000 producer is mandatory; no current retag');
      assert.equal(await psql('select public.'+CP+'payload_valid((select payload from native_checkpoint_payloads where name='
        +literal(name)+'),'+literal(atHour(hour))+');'),'t');
    }
    phase='BEFORE_CATALOG';const catalogBefore=JSON.parse(await psql(catalogSql(names)));
    assert.deepEqual(Object.keys(catalogBefore).sort(),[...names].sort());
    for(const name of names)assert.equal(catalogBefore[name].body,sha(body(definition(before.canonicalSource,name))));
    const accountCatalog=await psql(statisticsPreferenceRevisionCatalogQuery);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(accountCatalog))).schemaVersion,2);
    const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved'),preserved=await psql(preservedSql);
    const migrationsBefore=await psql(migrationRowsSql);
    const archivePins=new Map(await Promise.all((await fs.readdir(path.join(ROOT,'supabase/migrations'))).filter(file=>file.endsWith('.sql'))
      .map(async file=>[file,sha(await fs.readFile(path.join(ROOT,'supabase/migrations',file)))])));
    const guards=lastMileEnclosureBeforeGuards();assert.equal(guards.length,8);
    for(const[name,drift,restore]of guards){
      phase='GUARD_'+name.toUpperCase();await psql(drift);assert.notEqual((await runSql(sql)).code,0);await psql(restore);
      assert.equal(await psql(preservedSql),preserved);assert.equal(await psql(migrationRowsSql),migrationsBefore);
      assert.deepEqual(JSON.parse(await psql(catalogSql(names))),catalogBefore);
      for(const alias of ALIASES)assert.equal(await psql("select to_regprocedure('public."+alias.name+alias.signature+"') is null;"),'t');
    }
    phase='WHOLE_INSTALL';await psql(sql);
    assert.equal(await psql("select current_setting('lock_timeout');"),'0');
    assert.equal(await psql(preservedSql),preserved);assert.equal(await psql(migrationRowsSql),migrationsBefore);
    assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalog);
    await psql("insert into supabase_migrations.schema_migrations values('"+migration.version+"');");
    const migrationsAfter=await psql(migrationRowsSql);assert.notEqual((await runSql(sql)).code,0,'Installed version cannot be replayed');
    const catalogAfter=JSON.parse(await psql(catalogSql(allNames)));
    for(const name of names){
      assert.equal(catalogAfter[name].body,sha(body(definition(after.canonicalSource,name))));
      assert.deepEqual(catalogAfter[name].properties,catalogBefore[name].properties,'Whole OID/ACL/owner/properties preserved');
      if(!REPLACEMENTS.includes(name))assert.deepEqual(catalogAfter[name],catalogBefore[name]);
    }
    for(const alias of ALIASES){
      assert.equal(catalogAfter[alias.name].body,sha(body(definition(after.canonicalSource,alias.name))));
      assert.equal(await psql("select not has_function_privilege('anon','public."+alias.name+alias.signature
        +"','EXECUTE') and not has_function_privilege('authenticated','public."+alias.name+alias.signature
        +"','EXECUTE') and not has_function_privilege('service_role','public."+alias.name+alias.signature+"','EXECUTE');"),'t');
    }
    for(const original of before.originalDefinitions)assert.equal(definition(after.canonicalSource,original.name),original.definition);
    phase='NORMAL_CONTRACT_READBACK';
    const contract=JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+CP+'contract();'));
    assert.deepEqual(contract.checkpointContract,{id:expected.checkpoint.id,definition:expected.checkpoint.definition});
    assert(Object.values(contract.checks).every(value=>value===true));
    const trip=await psql("select (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'::regprocedure)"
      +"||E'\\n-- calibration-truth-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure)"
      +"||E'\\n-- binding-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure);");
    assert.equal(sha(trip),PINS.tripBindingPolicySha256);
    phase='NORMAL_CURRENT_673_FIXTURES';const current={},sourcePins=[];
    for(const[name,hour,options]of[['same',49,{}],['newer',50,{}],['changed',49,{candidateCurrentSpeedMps:0.18}],['cold7',6,null]]){
      const sourcePath=path.join(root,PREFIX+name+'-source.json'),checkpointPath=path.join(root,PREFIX+name+'-checkpoint.json');
      const source=options===null?lastMileEnclosureSevenHourSource(sourceDocumentAt,atHour):sourceDocumentAt(hour,'rr-last-mile-584-'+name,options);
      await fs.writeFile(sourcePath,JSON.stringify(source),{flag:'wx'});const sourceBytes=await fs.readFile(sourcePath);
      await saveCheckpoint({sourcePath,checkpointPath,repositoryRoot:ROOT});assert.deepEqual(await fs.readFile(sourcePath),sourceBytes);
      const payload=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
      assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,NEXT.I);assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,NEXT.C);
      assert.equal(payload.continuationStateContractSha256,NEXT.T);
      const json=JSON.stringify(payload);assert(!json.includes('$lme584_fixture$'));
      await psql('insert into native_checkpoint_payloads values('+literal(PREFIX+name)+',$lme584_fixture$'+json+'$lme584_fixture$::jsonb);');
      assert.equal(await psql('select public.'+CP+'payload_valid((select payload from native_checkpoint_payloads where name='
        +literal(PREFIX+name)+'),'+literal(atHour(hour))+');'),'t');
      current[name]=payload;sourcePins.push({file:sourcePath,sha256:sha(sourceBytes)});
    }
    for(const[name,hour]of[['same',49],['newer',50]])assert.equal(await psql('select public.'+ALIASES[1].name
      +'((select payload from native_checkpoint_payloads where name='+literal(LAST_MILE_ENCLOSURE_OLD_PG_ROWS[name])+'),'+literal(atHour(hour))+');'),'t');
    phase='NATIVE_JSONB_TO_NORMAL_RESTORE';
    const size=Number(await psql("select octet_length(convert_to(payload::text,'UTF8')) from native_checkpoint_payloads where name="+literal(PREFIX+'same')+';'));
    assert(Number.isSafeInteger(size)&&size>0&&size<=RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes);
    const chunks=[];for(let offset=1;offset<=size;offset+=262144)chunks.push(Buffer.from((await psql("select encode(substring(convert_to(payload::text,'UTF8') from "
      +offset+' for 262144),\'base64\') from native_checkpoint_payloads where name='+literal(PREFIX+'same')+';')).replace(/\s/g,''),'base64'));
    const jsonbBytes=Buffer.concat(chunks);assert.equal(jsonbBytes.length,size);const payload=JSON.parse(jsonbBytes);
    assert.deepEqual(payload,current.same);assert.notEqual(JSON.stringify(payload),JSON.stringify(current.same));
    const checkpointPath=path.join(root,'last-mile-jsonb/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    const request=async()=>[{document_key:KEY,payload,version:1}];
    const restored=await restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:atHour(49),request});
    assert.equal(restored.restored,true);assert.equal(restored.objectMemberOrderRestored,true);
    const restoredBytes=await fs.readFile(checkpointPath);assert.deepEqual(JSON.parse(restoredBytes),current.same);
    assert.equal((await restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:atHour(49),request})).reason,'protected-checkpoint-equivalent');
    assert.deepEqual(await fs.readFile(checkpointPath),restoredBytes);
    const reports=[],cases=[
      ['equalRetry',PREFIX+'same',PREFIX+'same',0,null,'unchanged',1],
      ['sameNumericRefusal',PREFIX+'same',PREFIX+'changed',1,'23505',null,1],
      ['newerCurrent',PREFIX+'same',PREFIX+'newer',1,null,'updated',2],
      ['versionRefusal',PREFIX+'same',PREFIX+'newer',0,'40001',null,1],
      ['regression',PREFIX+'newer',PREFIX+'same',1,'22023',null,1],
      ['old140000SameRefusal',LAST_MILE_ENCLOSURE_OLD_PG_ROWS.same,PREFIX+'same',1,'22023',null,1],
      ['old140000StrictNewer',LAST_MILE_ENCLOSURE_OLD_PG_ROWS.same,PREFIX+'newer',1,null,'updated',2],
    ];
    const bank=await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),accounts=await psql(accountRowsSql());
    for(const[name,central,incoming,version,code,disposition,storedVersion]of cases){
      phase='CAS_'+name.toUpperCase();const observed=JSON.parse(await psql(reset(central)
        +"set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,"
        +version+',(select payload from native_checkpoint_payloads where name='+literal(incoming)+'));'));
      observedEquals(observed,code,disposition,storedVersion);reports.push({case:name,sqlstate:code,disposition,storedVersion});
    }
    phase='FIRST_COLD_SEVEN_INSERT';
    const inserted=JSON.parse(await psql(reset(null)+"set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,0,"
      +'(select payload from native_checkpoint_payloads where name='+literal(PREFIX+'cold7')+'));'));
    assert.equal(inserted.sqlstate,null);assert.equal(inserted.result.disposition,'inserted');assert.equal(inserted.result.centralVersion,1);
    assert.equal(inserted.stored.version,1);assert.equal(inserted.stored.ownerIsNull,true);assert.equal(inserted.stored.storedPayloadMatchesIncoming,true);
    phase='WHOLE_PRESERVATION';
    assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bank);
    assert.equal(await psql(accountRowsSql()),accounts);assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalog);
    assert.equal(await psql('select count(*) from admin_document_versions;'),'0');
    assert.equal(await psql(migrationRowsSql),migrationsAfter);assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))),catalogAfter);
    for(const[file,pin]of archivePins)assert.equal(sha(await fs.readFile(path.join(ROOT,'supabase/migrations',file))),pin);
    for(const{file,sha256}of sourcePins)assert.equal(sha(await fs.readFile(file)),sha256);
    return {kind:'LAST_MILE_ENCLOSURE_SUCCESSOR_NATIVE_SQL',sqlExecuted:true,wholeMigrationExecuted:true,migrationVersion:migration.version,
      beforeGuardCases:guards.length,checkpointOidSlots:25,contractBodies:28,privateAliases:2,partCount:673,
      trueOld140000Fixtures:true,currentNormalFixtures:true,sevenHourNoOldIG:true,normalJsonbRestore:true,
      originalFunctionsOidAclSchema2BankAndMigrationsPreserved:true,modelRetag:false,artificialSqlSelectors:false,reports};
  }catch(error){console.error(JSON.stringify({kind:'LAST_MILE_ENCLOSURE_NATIVE_FIRST_FAILURE',phase,
    category:error?.code==='ERR_ASSERTION'?'ASSERTION_FAILED':'NATIVE_CALL_FAILED',privatePayloadIncluded:false}));throw error;}
}
