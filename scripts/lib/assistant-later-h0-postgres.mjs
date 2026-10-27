// Native TEST phases only, AFTER genuine frozen586/587 in the SAME owned PG host.
// Never an installer, model issuer, runtime-origin issuer or production reader.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ASSISTANT_LATER_H0_BEFORE as OLD,ASSISTANT_LATER_H0_ALIASES as ALIASES,
  requireAssistantLaterH0Binding,requireAssistantLaterH0Output,assistantLaterH0Migration,
  readAssistantLaterH0PredecessorCanonicalSource,readAssistantLaterH0CanonicalSource,
  assistantLaterH0Definition as definition,
  ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
  requireAssistantPublic587SuccessorBinding,requireAssistantPublic587SuccessorOutput,assistantPublic587SuccessorMigration,
  readAssistantPublic587PredecessorCanonicalSource,readAssistantPublic587SuccessorCanonicalSource,
  ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
  requireAssistantPublic588SuccessorBinding,requireAssistantPublic588SuccessorOutput,assistantPublic588SuccessorMigration,
  readAssistantPublic588PredecessorCanonicalSource,readAssistantPublic588SuccessorCanonicalSource}
  from './assistant-later-h0-successor-source.mjs';
import {currentMemoryWarmupPreservationInventorySql} from './current-memory-warmup-postgres.mjs';
import {expectedCheckpointCasContract,expectedTripBindingPolicy,assistantLaterH0RequiredMigrations,
  assistantPublic587SuccessorRequiredMigrations,assistantPublic588SuccessorRequiredMigrations}
  from '../integrated-cutover-readiness.mjs';
import {statisticsPreferenceRevisionCatalogQuery,verifyStatisticsPreferenceRevisionCatalogMetadata}
  from '../verify-account-assistant-schema.mjs';
import {restoreProtectedRavScoreContinuationCheckpoint} from '../protected-ravscore-continuation-checkpoint.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY} from '../ravscore-continuation-checkpoint.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CP='ravradar_ravscore_checkpoint_',CAS='public.'+CP+'cas',KEY='ravscore-continuation-checkpoint';
const PREFIX='assistant-later-h0-current-',OLD_PREFIX='native-original-continuity-current-';
const REPLACEMENTS=['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason']
  .map(s=>CP+s).concat(['ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const body=value=>value.slice(value.indexOf('as $$')+5,value.lastIndexOf('$$;')).trim();
const literal=value=>{assert.equal(typeof value,'string');assert(!value.includes("'"));return "'"+value+"'";};

export function assertAssistantLaterH0TransactionBounds(sql){
  assert.equal(typeof sql,'string');
  assert.match(sql,/begin;\n\nset local statement_timeout = '55s';\n\nset local lock_timeout = '5s';/);
}
const catalogSql=names=>"select jsonb_object_agg(requested.name,jsonb_build_object('properties',to_jsonb(p)-array['prosrc','prosqlbody'],"
  +"'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')))"
  +' from pg_proc p join pg_namespace n on n.oid=p.pronamespace join (values '
  +names.map(name=>'('+literal(name)+')').join(',')
  +") requested(name) on p.proname=requested.name::pg_catalog.name where n.nspname='public';";
const accountRowsSql=()=>"with rows as (select 'activity' as t,convert_to(to_jsonb(x)::text,'UTF8') as b from public.account_activity_journal x"
  +" union all select 'preference',convert_to(to_jsonb(x)::text,'UTF8') from public.account_statistics_preferences x)"
  +", fingerprints as (select t,encode(extensions.digest(b,'sha256'),'hex') as h,octet_length(b) as n from rows)"
  +" select jsonb_build_array(t,h,n,count(*))::text from fingerprints group by t,h,n order by t collate \"C\",h collate \"C\",n;";
const reset=central=>'truncate public.admin_documents;'+(central?"insert into public.admin_documents(document_key,payload,version,updated_by)"
  +" select '"+KEY+"',payload,1,'00000000-0000-0000-0000-000000000001' from public.native_checkpoint_payloads where name='"+central+"';":'');
function assertObserved(observed,code,disposition,storedVersion){
  assert.equal(observed.sqlstate,code);assert.equal(observed.stored.version,storedVersion);
  if(disposition){assert.equal(observed.result.disposition,disposition);assert.equal(observed.result.centralVersion,storedVersion);}
  if(code||disposition==='unchanged'){
    const {storedPayloadMatchesIncoming,...stored}=observed.stored;
    assert.deepEqual(stored,observed.previous);assert.equal(stored.ownerIsNull,false);
  }else{assert.equal(observed.stored.ownerIsNull,true);assert.equal(observed.stored.storedPayloadMatchesIncoming,true);}
}
async function readFixture(psql,name){
  assert.match(name,/^[a-z0-9-]+$/); // Fixed private native fixture-table names only.
  const size=Number(await psql("select octet_length(convert_to(payload::text,'UTF8')) from native_checkpoint_payloads where name='"+name+"';"));
  assert(Number.isSafeInteger(size)&&size>0&&size<=RAVSCORE_CONTINUATION_CHECKPOINT_POLICY.maximumSerializedBytes);
  const chunks=[];
  for(let offset=1;offset<=size;offset+=262144)chunks.push(Buffer.from((await psql(
    "select encode(substring(convert_to(payload::text,'UTF8') from "+offset+" for 262144),'base64') from native_checkpoint_payloads where name='"+name+"';"
  )).replace(/\s/g,''),'base64'));
  const bytes=Buffer.concat(chunks);assert.equal(bytes.length,size);
  return {bytes,payload:JSON.parse(bytes.toString('utf8'))};
}
function assertWholeMetadataInverse(original,prepared,next){
  // Same exact field projection as the normal later-H0 S inverse, TEST ONLY.
  // This creates no runtime snapshot/origin handle and admits no B/S.
  const inverse=structuredClone(prepared);
  assert.equal(inverse.modelBinding.modelBundleSha256,next.I);
  assert.equal(inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256,next.C);
  assert.equal(inverse.continuationStateContractSha256,next.T);
  inverse.modelBinding.modelBundleSha256=original.modelBinding.modelBundleSha256;
  inverse.candidateGRollbackCompanion.modelBinding.modelBundleSha256=original.candidateGRollbackCompanion.modelBinding.modelBundleSha256;
  inverse.continuationStateContractSha256=original.continuationStateContractSha256;
  assert.deepEqual(Object.keys(inverse.states).sort(),Object.keys(original.states).sort());
  for(const[id,state]of Object.entries(inverse.states)){
    assert.equal(state.modelBundleSha256,next.I);state.modelBundleSha256=original.states[id].modelBundleSha256;
  }
  for(const key of ['generationSha256','stateSha256'])inverse[key]=original[key];
  inverse.candidateGRollbackCompanion.generationSha256=original.candidateGRollbackCompanion.generationSha256;
  assert.deepEqual(inverse,original,'Whole673-state original metadata inverse including all unknown fields');
}
const LEGACY586=Object.freeze({
  before:OLD,aliases:ALIASES,prefix:PREFIX,oldPrefix:OLD_PREFIX,previousRelease:586,
  requireBinding:requireAssistantLaterH0Binding,requireOutput:requireAssistantLaterH0Output,
  requiredMigrations:assistantLaterH0RequiredMigrations,migration:assistantLaterH0Migration,
  readBefore:readAssistantLaterH0PredecessorCanonicalSource,readAfter:readAssistantLaterH0CanonicalSource,
  sourcePhase:'assistant-later-h0',migrationCount:56,oidSlots:33,contractBodies:36,
  fixtureStem:'assistant-later-h0',olderFixtures:Object.freeze([]),
  resultKind:'ASSISTANT_LATER_H0_SUCCESSOR',failureKind:'ASSISTANT_LATER_H0_NATIVE_FIRST_FAILURE'});
const PUBLIC587=Object.freeze({
  before:ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
  prefix:'assistant-public587-successor-current-',oldPrefix:'assistant-later-h0-current-',previousRelease:587,
  requireBinding:requireAssistantPublic587SuccessorBinding,requireOutput:requireAssistantPublic587SuccessorOutput,
  requiredMigrations:assistantPublic587SuccessorRequiredMigrations,migration:assistantPublic587SuccessorMigration,
  readBefore:readAssistantPublic587PredecessorCanonicalSource,readAfter:readAssistantPublic587SuccessorCanonicalSource,
  sourcePhase:'assistant-public587-successor',migrationCount:57,oidSlots:35,contractBodies:38,
  fixtureStem:'assistant-public587-successor',olderFixtures:Object.freeze(['native-original-continuity-current-same']),
  resultKind:'ASSISTANT_PUBLIC587_SUCCESSOR',failureKind:'ASSISTANT_PUBLIC587_SUCCESSOR_NATIVE_FIRST_FAILURE'});
const PUBLIC588=Object.freeze({
  before:ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
  prefix:'assistant-public588-successor-current-',oldPrefix:'assistant-public587-successor-current-',previousRelease:588,
  requireBinding:requireAssistantPublic588SuccessorBinding,requireOutput:requireAssistantPublic588SuccessorOutput,
  requiredMigrations:assistantPublic588SuccessorRequiredMigrations,migration:assistantPublic588SuccessorMigration,
  readBefore:readAssistantPublic588PredecessorCanonicalSource,readAfter:readAssistantPublic588SuccessorCanonicalSource,
  sourcePhase:'assistant-public588-successor',migrationCount:58,oidSlots:37,contractBodies:40,
  fixtureStem:'assistant-public588-successor',olderFixtures:Object.freeze(['native-original-continuity-current-same','assistant-later-h0-current-same']),
  resultKind:'ASSISTANT_PUBLIC588_SUCCESSOR',failureKind:'ASSISTANT_PUBLIC588_SUCCESSOR_NATIVE_FIRST_FAILURE'});
export async function compareAssistantLaterH0Successor(options){
  return compareFixedSuccessor(LEGACY586,...arguments);
}
export async function compareAssistantPublic587Successor(options){
  return compareFixedSuccessor(PUBLIC587,...arguments);
}
export async function compareAssistantPublic588Successor(options){
  return compareFixedSuccessor(PUBLIC588,...arguments);
}
async function compareFixedSuccessor(profile,options){
  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588,'ASSISTANT_NATIVE_UNKNOWN_PROFILE');
  const OLD=profile.before,ALIASES=profile.aliases,PREFIX=profile.prefix,OLD_PREFIX=profile.oldPrefix;
  let phase='SOURCE';
  try{
    const NEXT=profile.requireBinding(),PINS=profile.requireOutput(); // Before options, programs, files or SQL.
    assert.equal(arguments.length,2);
    const {psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint}=options;
    for(const fn of [psql,runSql,sourceDocumentAt,atHour,saveCheckpoint])assert.equal(typeof fn,'function');
    const inventory=profile.requiredMigrations();assert.equal(inventory.length,profile.migrationCount);
    assert.equal(inventory.at(-2).version,OLD.version);assert.equal(inventory.at(-1).version,NEXT.version);
    const before=await profile.readBefore(),after=await profile.readAfter();
    const migration=profile.migration(),file=path.join(ROOT,'supabase/migrations',migration.filename),stat=await fs.lstat(file);
    assert(stat.isFile()&&!stat.isSymbolicLink());
    const sql=await fs.readFile(file,'utf8');
    assert.equal(sha(sql),PINS.migrationSha256);assert.equal(sha(before.canonicalSource),OLD.canonicalSha256);
    assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);assertAssistantLaterH0TransactionBounds(sql);
    const expected={checkpoint:await expectedCheckpointCasContract({sourcePhase:profile.sourcePhase}),
      trip:await expectedTripBindingPolicy({sourcePhase:profile.sourcePhase})};
    assert.equal(expected.checkpoint.sha256,PINS.checkpointContractSha256);assert.equal(expected.trip.sha256,PINS.tripBindingPolicySha256);
    phase='BEFORE_VERSION';assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'),OLD.version);
    phase='GENUINE'+profile.previousRelease+'_BANK';const originals={};
    for(const[name,hour]of [['same',49],['newer',50]]){
      const {payload}=await readFixture(psql,OLD_PREFIX+name);
      assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,OLD.I);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,OLD.C);
      assert.equal(payload.continuationStateContractSha256,OLD.T);assert.equal(payload.productionReferenceAt,atHour(hour));
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='"+OLD_PREFIX+name+"'),'"+atHour(hour)+"');"),'t');
      originals[name]=payload;
    }
    const names=[...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]);
    const allNames=[...names,...ALIASES.map(row=>row.name)];assert.equal(new Set(allNames).size,names.length+2);
    const contractSource=definition(after.canonicalSource,CP+'contract');
    const validatorArray=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contractSource);assert(validatorArray);
    assert.equal((validatorArray[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,profile.oidSlots);
    assert.equal((contractSource.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,profile.contractBodies);
    phase='BEFORE_CATALOG';const catalogBefore=JSON.parse(await psql(catalogSql(names)));
    assert.deepEqual(Object.keys(catalogBefore).sort(),[...names].sort());
    for(const name of names)assert.equal(catalogBefore[name].body,sha(body(definition(before.canonicalSource,name))));
    const accountCatalogBefore=await psql(statisticsPreferenceRevisionCatalogQuery);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(accountCatalogBefore))).schemaVersion,2);
    phase='BEFORE_INVENTORY';const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved'),preserved=await psql(preservedSql);
    const archivePins=new Map(await Promise.all((await fs.readdir(path.join(ROOT,'supabase/migrations')))
      .filter(name=>name.endsWith('.sql')).map(async name=>[name,sha(await fs.readFile(path.join(ROOT,'supabase/migrations',name)))])));
    const guards=[
      ["delete from supabase_migrations.schema_migrations where version='"+OLD.version+"';","insert into supabase_migrations.schema_migrations values('"+OLD.version+"');"],
      ["delete from supabase_migrations.schema_migrations where version='20261013230000';","insert into supabase_migrations.schema_migrations values('20261013230000');"],
      ["insert into supabase_migrations.schema_migrations values('20990101000000');","delete from supabase_migrations.schema_migrations where version='20990101000000';"],
      ...['20261014140000','20261015030000','20261016030000'].map(version=>["insert into supabase_migrations.schema_migrations values('"+version+"');","delete from supabase_migrations.schema_migrations where version='"+version+"';"]),
      ['alter function '+CAS+'(bigint,timestamptz,jsonb) security invoker;','alter function '+CAS+'(bigint,timestamptz,jsonb) security definer;'],
      ['alter function '+CAS+"(bigint,timestamptz,jsonb) set statement_timeout='54s';",'alter function '+CAS+"(bigint,timestamptz,jsonb) set statement_timeout='55s';"],
      ['revoke execute on function '+CAS+'(bigint,timestamptz,jsonb) from service_role;','grant execute on function '+CAS+'(bigint,timestamptz,jsonb) to service_role;'],
      ['grant execute on function public.'+CP+'native_identity_i71_payload_valid(jsonb,timestamptz) to authenticated;',
        'revoke execute on function public.'+CP+'native_identity_i71_payload_valid(jsonb,timestamptz) from authenticated;'],
      ...ALIASES.map(row=>['create function public.'+row.name+row.signature+' returns boolean language sql as $$select false$$;',
        'drop function public.'+row.name+row.signature+';']),
    ];
    for(const[index,[drift,restore]]of guards.entries()){
      phase='GUARD_'+index;await psql(drift);assert.notEqual((await runSql(sql)).code,0);await psql(restore);
      assert.equal(await psql(preservedSql),preserved);assert.deepEqual(JSON.parse(await psql(catalogSql(names))),catalogBefore);
      for(const alias of ALIASES)assert.equal(await psql("select to_regprocedure('public."+alias.name+alias.signature+"') is null;"),'t');
    }
    phase='INSTALL';await psql(sql);
    assert.equal(await psql("select current_setting('lock_timeout');"),'0');assert.equal(await psql(preservedSql),preserved);
    assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalogBefore);
    await psql("insert into supabase_migrations.schema_migrations values('"+migration.version+"');");
    assert.notEqual((await runSql(sql)).code,0,'No replay after installed version');
    const catalogAfter=JSON.parse(await psql(catalogSql(allNames)));
    for(const name of names){
      assert.equal(catalogAfter[name].body,sha(body(definition(after.canonicalSource,name))));
      assert.deepEqual(catalogAfter[name].properties,catalogBefore[name].properties,'All old OIDs, owners, ACL and properties');
      if(!REPLACEMENTS.includes(name))assert.deepEqual(catalogAfter[name],catalogBefore[name]);
    }
    for(const alias of ALIASES){
      assert.equal(catalogAfter[alias.name].body,sha(body(definition(after.canonicalSource,alias.name))));
      assert.equal(await psql("select not has_function_privilege('anon','public."+alias.name+alias.signature
        +"','EXECUTE') and not has_function_privilege('authenticated','public."+alias.name+alias.signature+"','EXECUTE');"),'t');
    }
    for(const original of before.originalDefinitions)assert.equal(definition(after.canonicalSource,original.name),original.definition);
    for(const[name,hour]of [['same',49],['newer',50]])assert.equal(await psql('select public.'+ALIASES[1].name
      +"((select payload from native_checkpoint_payloads where name='"+OLD_PREFIX+name+"'),'"+atHour(hour)+"');"),'t');
    phase='READBACK';const contract=JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+CP+'contract();'));
    assert.deepEqual(contract.checkpointContract,{id:expected.checkpoint.id,definition:expected.checkpoint.definition});
    assert(Object.values(contract.checks).every(value=>value===true));
    const trip=await psql("select (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'::regprocedure)"
      +"||E'\\n-- calibration-truth-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure)"
      +"||E'\\n-- binding-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure);");
    assert.equal(sha(trip),PINS.tripBindingPolicySha256);
    phase='CURRENT_FIXTURES';const current={};
    for(const[name,hour,options]of [['same',49,{}],['newer',50,{}],['changed',49,{candidateCurrentSpeedMps:0.18}]]){
      const sourcePath=path.join(root,PREFIX+name+'-source.json'),checkpointPath=path.join(root,PREFIX+name+'-checkpoint.json');
      const original=originals[name==='changed'?'same':name];
      await fs.writeFile(sourcePath,JSON.stringify(sourceDocumentAt(hour,original.datasetId,options)),{flag:'wx'});
      await saveCheckpoint({sourcePath,checkpointPath,repositoryRoot:ROOT});
      const payload=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
      assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,NEXT.I);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,NEXT.C);
      assert.equal(payload.continuationStateContractSha256,NEXT.T);assert.equal(payload.productionReferenceAt,atHour(hour));
      if(name!=='changed')assertWholeMetadataInverse(original,payload,NEXT);
      const text=JSON.stringify(payload);assert(!text.includes('$assistant_fixture$'));
      await psql("insert into native_checkpoint_payloads values('"+PREFIX+name+"',$assistant_fixture$"+text+"$assistant_fixture$::jsonb);");
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='"+PREFIX+name+"'),'"+atHour(hour)+"');"),'t');
      current[name]=payload;
    }
    phase='NORMAL_JSONB_ROUNDTRIP';const {bytes,payload}=await readFixture(psql,PREFIX+'same');
    assert.deepEqual(payload,current.same);assert.notEqual(bytes.toString('utf8'),JSON.stringify(current.same));
    const checkpointPath=path.join(root,profile.fixtureStem+'-jsonb/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    const request=async()=>[{document_key:KEY,payload,version:1}];
    const restored=await restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:atHour(49),request});
    assert.equal(restored.restored,true);assert.equal(restored.objectMemberOrderRestored,true);
    const restoredBytes=await fs.readFile(checkpointPath);assert.deepEqual(JSON.parse(restoredBytes),current.same);
    assert.equal((await restoreProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:atHour(49),request})).reason,'protected-checkpoint-equivalent');
    assert.deepEqual(await fs.readFile(checkpointPath),restoredBytes);
    const cases=[
      ['equal-retry',PREFIX+'same',PREFIX+'same',0,null,'unchanged',1],
      ['same-current-numeric-change',PREFIX+'same',PREFIX+'changed',1,'23505',null,1],
      ['newer-current',PREFIX+'same',PREFIX+'newer',1,null,'updated',2],
      ['wrong-version',PREFIX+'same',PREFIX+'newer',0,'40001',null,1],
      ['regression',PREFIX+'newer',PREFIX+'same',1,'22023',null,1],
      ['strict-later-'+profile.previousRelease,OLD_PREFIX+'same',PREFIX+'newer',1,null,'updated',2],
      ['strict-later-'+profile.previousRelease+'-wrong-version',OLD_PREFIX+'same',PREFIX+'newer',0,'40001',null,1],
      ['same-H0-'+profile.previousRelease+'-refused',OLD_PREFIX+'same',PREFIX+'same',1,'22023',null,1],
      ['same-H0-'+profile.previousRelease+'-changed-refused',OLD_PREFIX+'same',PREFIX+'changed',1,'22023',null,1],
      ['same-H0-newer'+profile.previousRelease+'-refused',OLD_PREFIX+'newer',PREFIX+'newer',1,'22023',null,1],
      ['earlier-'+profile.previousRelease+'-refused',OLD_PREFIX+'newer',PREFIX+'same',1,'22023',null,1],
    ];
    for(const central of [...profile.olderFixtures,'account-statistics-assistant-current-same','last-mile-584-same','origin-current-same','identity-same','after0600-same',
      'grid-current',...['ffc','249','c1ac'].map(family=>'original-'+family)])
      cases.push(['same-older-'+central,central,PREFIX+'same',1,'22023',null,1],
        ['newer-older-'+central,central,PREFIX+'newer',1,'22023',null,1]);
    for(const[kind,expression]of [
      ['value',"jsonb_set(payload,'{states,part-001,currentEvidence,0,strength}','2'::jsonb)"],
      ['field',"jsonb_set(payload,'{unknownField}','true'::jsonb)"],
      ['part',"payload #- '{states,part-001}'"],
      ['T',"jsonb_set(payload,'{continuationStateContractSha256}',to_jsonb(repeat('e',64)))"]]){
      const name=profile.fixtureStem+'-invalid-'+kind.toLowerCase();
      await psql("insert into native_checkpoint_payloads select '"+name+"',"+expression+" from native_checkpoint_payloads where name='"+OLD_PREFIX+"same';");
      assert.equal(await psql('select public.'+ALIASES[1].name+"((select payload from native_checkpoint_payloads where name='"+name+"'),'"+atHour(49)+"');"),'f');
      cases.push([name,name,PREFIX+'newer',1,'22023',null,1]);
      const incomingName=profile.fixtureStem+'-incoming-invalid-'+kind.toLowerCase();
      await psql("insert into native_checkpoint_payloads select '"+incomingName+"',"+expression+" from native_checkpoint_payloads where name='"+PREFIX+"same';");
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='"+incomingName+"'),'"+atHour(49)+"');"),'f');
      cases.push([incomingName,PREFIX+'same',incomingName,1,'22023',null,1]);
    }
    const bank=await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),account=await psql(accountRowsSql()),reports=[];
    for(const[name,central,incoming,version,code,disposition,storedVersion]of cases){
      phase='CASE_'+name.toUpperCase().replaceAll('-','_');
      const observed=JSON.parse(await psql(reset(central)
        +"set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,"
        +version+",(select payload from native_checkpoint_payloads where name='"+incoming+"'));"));
      assertObserved(observed,code,disposition,storedVersion);
      reports.push({case:name,sqlstate:code,disposition,storedVersion});
    }
    phase='PRESERVED';assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bank);
    assert.equal(await psql(accountRowsSql()),account);assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalogBefore);
    assert.equal(await psql('select count(*) from admin_document_versions;'),'0');
    assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))),catalogAfter);
    for(const[file,pin]of archivePins)assert.equal(sha(await fs.readFile(path.join(ROOT,'supabase/migrations',file))),pin);
    return {kind:profile.resultKind,sourceMigrationInventory:profile.migrationCount,sqlExecuted:true,wholeMigrationExecuted:true,
      migrationVersion:migration.version,partCount:673,checkpointOidSlots:profile.oidSlots,contractBodies:profile.contractBodies,
      oldFunctionsAndOidsPreserved:true,allOriginalDefinitionsPreserved:true,privateAliases:2,
      beforeGuardCases:guards.length,exactCheckpointContract:true,exactTripContract:true,schema2Catalog:true,
      normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true,['trueOld'+profile.previousRelease+'Fixtures']:true,currentNormalFixtures:true,
      ['old'+profile.previousRelease+'ModelNotRetagged']:true,wholeMetadataInverse:true,['strictlyLater'+profile.previousRelease+'ToNextOnly']:true,
      productionSeedAuthenticated:false,sqlIsNotOriginAuthentication:true,reports};
  }catch(error){
    try{console.error(JSON.stringify({kind:profile.failureKind,phase,
      category:error?.code==='ERR_ASSERTION'?'ASSERTION_FAILED':'NATIVE_CALL_FAILED',privatePayloadIncluded:false}));}catch{}
    throw error; // Preserve the actual first failure; no retry or alternate SQL path.
  }
}
