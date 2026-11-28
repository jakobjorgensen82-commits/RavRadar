// Native TEST phases only, AFTER genuine frozen586/587 in the SAME owned PG host.
// Never an installer, model issuer, runtime-origin issuer or production reader.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {ASSISTANT_LATER_H0_BEFORE as OLD,ASSISTANT_LATER_H0_ALIASES as ALIASES,
  requireAssistantLaterH0Binding,requireAssistantLaterH0Output,assistantLaterH0Migration,
  readAssistantLaterH0PredecessorCanonicalSource,readAssistantLaterH0CanonicalSource,
  assistantLaterH0Definition as definition,
  ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC587_SUCCESSOR_ALIASES,
  requireAssistantPublic587SuccessorBinding,requireAssistantPublic587SuccessorOutput,assistantPublic587SuccessorMigration,
  readAssistantPublic587PredecessorCanonicalSource,readAssistantPublic587SuccessorCanonicalSource,
  ASSISTANT_PUBLIC588_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC588_SUCCESSOR_ALIASES,
  requireAssistantPublic588SuccessorBinding,requireAssistantPublic588SuccessorOutput,assistantPublic588SuccessorMigration,
  readAssistantPublic588PredecessorCanonicalSource,readAssistantPublic588SuccessorCanonicalSource,
  ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,
  requireAssistantPublic590SuccessorBinding,requireAssistantPublic590SuccessorOutput,assistantPublic590SuccessorMigration,
  readAssistantPublic590PredecessorCanonicalSource,readAssistantPublic590SuccessorCanonicalSource,
  ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,
  requireAssistantPublic591SuccessorBinding,requireAssistantPublic591SuccessorOutput,assistantPublic591SuccessorMigration,
  readAssistantPublic591PredecessorCanonicalSource,readAssistantPublic591SuccessorCanonicalSource,
  INSTALLED593_ORIGINAL591_DATABASE_BEFORE,requireInstalled593Original591Binding,
  requireInstalled593Original591Output,installed593Original591Migration,readInstalled593Original591CanonicalSource,
  SCALAR597_LATER_H0_BEFORE,SCALAR597_LATER_H0_ALIASES,requireScalar597LaterH0Binding,requireScalar597LaterH0Output,
  scalar597LaterH0Migration,readScalar597LaterH0CanonicalSource,assertScalar597LaterH0CheckpointInverse,
  ASSISTANT_AFTER597_BEFORE,ASSISTANT_AFTER597_ALIASES,UNISSUED_ASSISTANT_AFTER597_SUCCESSOR,
  requireAssistantAfter597Binding,requireAssistantAfter597Output,requireAssistantAfter597Release,
  assistantAfter597Migration,readAssistantAfter597CanonicalSource,assertAssistantAfter597CheckpointInverse,
  ASSISTANT_AFTER598_BEFORE,ASSISTANT_AFTER598_ALIASES,INACTIVE_ASSISTANT_AFTER598_SUCCESSOR,
  requireAssistantAfter598Binding,requireAssistantAfter598Output,requireAssistantAfter598Release,
  assistantAfter598Migration,readAssistantAfter598CanonicalSource,assertAssistantAfter598CheckpointInverse,ASSISTANT_AFTER599_BEFORE,ASSISTANT_AFTER599_ALIASES,INACTIVE_ASSISTANT_AFTER599_SUCCESSOR,requireAssistantAfter599Binding,requireAssistantAfter599Output,requireAssistantAfter599Release,assistantAfter599Migration,readAssistantAfter599CanonicalSource,assertAssistantAfter599CheckpointInverse}
  from './assistant-later-h0-successor-source.mjs';
import {ASSISTANT_AFTER599_DATABASE_LEDGER,ASSISTANT_AFTER601_ALIASES,INACTIVE_ASSISTANT_AFTER601_SUCCESSOR}
  from './assistant-later-h0-successor-source.mjs';
import {readAccountErasureSource,accountErasureCatalogQuery,verifyAccountErasureCatalogMetadata,
  readAccountInactivitySource,accountInactivityCatalogQuery,verifyAccountInactivityCatalogMetadata}
  from '../verify-account-erasure-schema.mjs';
import {buildFixedNativeActivityReceiptQuery,readFixedNativeActivityReceiptSource}
  from './account-native-activity-receipt-source.mjs';
import {SOURCE601_ORIGINAL_DATA_PROFILE,withSource601OriginalDataSource}
  from '../check-assistant-later-h0-predecessor-source.mjs';
import {currentMemoryWarmupPreservationInventorySql} from './current-memory-warmup-postgres.mjs';
import {expectedCheckpointCasContract,expectedTripBindingPolicy,assistantLaterH0RequiredMigrations,
  assistantPublic587SuccessorRequiredMigrations,assistantPublic588SuccessorRequiredMigrations,assistantPublic590SuccessorRequiredMigrations,assistantPublic591SuccessorRequiredMigrations,installed593Original591RequiredMigrations,
  accountStatisticsAssistantRequiredMigrations,scalar597LaterH0RequiredMigrations,assistantAfter597RequiredMigrations,assistantAfter598RequiredMigrations,
  assistantAfter599RequiredMigrations,assistantAfter601RequiredMigrations,
  CHECKPOINT_SCALAR_WALK_MIGRATION,expectedCheckpointScalarWalkContract,readCheckpointScalarWalkSource,
  CHECKPOINT_DISTINCT_PRIVACY_MIGRATION,expectedCheckpointDistinctPrivacyContract,readCheckpointDistinctPrivacySource}
  from '../integrated-cutover-readiness.mjs';
import {statisticsPreferenceRevisionCatalogQuery,verifyStatisticsPreferenceRevisionCatalogMetadata}
  from '../verify-account-assistant-schema.mjs';
import {restoreProtectedRavScoreContinuationCheckpoint} from '../protected-ravscore-continuation-checkpoint.mjs';
import {RAVSCORE_CONTINUATION_CHECKPOINT_POLICY} from '../ravscore-continuation-checkpoint.mjs';
import {FROZEN597_NATIVE_SOURCE,withFrozen597CheckpointPostgresSource,FROZEN598_NATIVE_SOURCE,withFrozen598CheckpointFactorySource,FROZEN599_NATIVE_SOURCE,withFrozen599CheckpointFactorySource}
  from '../run-frozen586-assistant-later-h0-postgres-source.mjs';
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
const PUBLIC590=Object.freeze({
  before:ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,
  prefix:'assistant-public590-successor-current-',oldPrefix:'assistant-public588-successor-current-',previousRelease:590,
  requireBinding:requireAssistantPublic590SuccessorBinding,requireOutput:requireAssistantPublic590SuccessorOutput,
  requiredMigrations:assistantPublic590SuccessorRequiredMigrations,migration:assistantPublic590SuccessorMigration,
  readBefore:readAssistantPublic590PredecessorCanonicalSource,readAfter:readAssistantPublic590SuccessorCanonicalSource,
  sourcePhase:'assistant-public590-successor',migrationCount:59,oidSlots:39,contractBodies:42,
  fixtureStem:'assistant-public590-successor',olderFixtures:Object.freeze(['native-original-continuity-current-same','assistant-later-h0-current-same','assistant-public587-successor-current-same']),
  resultKind:'ASSISTANT_PUBLIC590_SUCCESSOR',failureKind:'ASSISTANT_PUBLIC590_SUCCESSOR_NATIVE_FIRST_FAILURE'});
const PUBLIC591=Object.freeze({
  before:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,
  prefix:'assistant-public591-successor-current-',oldPrefix:'assistant-public590-successor-current-',previousRelease:591,
  requireBinding:requireAssistantPublic591SuccessorBinding,requireOutput:requireAssistantPublic591SuccessorOutput,
  requiredMigrations:assistantPublic591SuccessorRequiredMigrations,migration:assistantPublic591SuccessorMigration,
  readBefore:readAssistantPublic591PredecessorCanonicalSource,readAfter:readAssistantPublic591SuccessorCanonicalSource,
  sourcePhase:'assistant-public591-successor',migrationCount:60,oidSlots:41,contractBodies:44,
  fixtureStem:'assistant-public591-successor',olderFixtures:Object.freeze(['native-original-continuity-current-same','assistant-later-h0-current-same','assistant-public587-successor-current-same','assistant-public588-successor-current-same']),
  resultKind:'ASSISTANT_PUBLIC591_SUCCESSOR',failureKind:'ASSISTANT_PUBLIC591_SUCCESSOR_NATIVE_FIRST_FAILURE'});
const INSTALLED593_ORIGINAL591=Object.freeze({
  before:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,databaseBefore:INSTALLED593_ORIGINAL591_DATABASE_BEFORE,
  aliases:Object.freeze([]),originalAliases:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,
  originalPayloadValidator:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[1].name,
  prefix:'installed593-original591-successor-current-',oldPrefix:'assistant-public590-successor-current-',previousRelease:591,
  requireBinding:requireInstalled593Original591Binding,requireOutput:requireInstalled593Original591Output,
  requiredMigrations:installed593Original591RequiredMigrations,migration:installed593Original591Migration,
  readBefore:readAssistantPublic591SuccessorCanonicalSource,readAfter:readInstalled593Original591CanonicalSource,
  sourcePhase:'assistant-installed593-origin591-successor',migrationCount:61,oidSlots:41,contractBodies:44,
  fixtureStem:'installed593-original591-successor',olderFixtures:Object.freeze([
    'native-original-continuity-current-same','assistant-later-h0-current-same',
    'assistant-public587-successor-current-same','assistant-public588-successor-current-same',
    'assistant-public591-successor-current-same']),
  resultKind:'INSTALLED593_ORIGINAL591_SUCCESSOR',failureKind:'INSTALLED593_ORIGINAL591_NATIVE_FIRST_FAILURE'});

const SCALAR597_LATER_H0=Object.freeze({
  before:SCALAR597_LATER_H0_BEFORE,databaseBefore:SCALAR597_LATER_H0_BEFORE,aliases:SCALAR597_LATER_H0_ALIASES,
  prefix:'scalar597-later-h0-current-',oldPrefix:'scalar597-original594-',previousRelease:594,
  requireBinding:requireScalar597LaterH0Binding,requireOutput:requireScalar597LaterH0Output,
  requiredMigrations:scalar597LaterH0RequiredMigrations,migration:scalar597LaterH0Migration,
  readBefore:readInstalled593Original591CanonicalSource,readAfter:readScalar597LaterH0CanonicalSource,
  sourcePhase:'scalar597-later-h0-original594-successor',migrationCount:62,oidSlots:43,contractBodies:46,
  fixtureStem:'scalar597-later-h0',olderFixtures:Object.freeze([]),
  resultKind:'SCALAR597_LATER_H0_SUCCESSOR',failureKind:'SCALAR597_LATER_H0_NATIVE_FIRST_FAILURE',
});

export async function compareScalar597LaterH0Successor(options){
  assert.equal(arguments.length,1);
  requireScalar597LaterH0Output();
  const {psql,root,atHour}=options;
  const {withFrozen594CheckpointPostgresSource}=await import('../run-frozen586-assistant-later-h0-postgres-source.mjs');
  return withFrozen594CheckpointPostgresSource(async({repositoryRoot,factory,originalProfile})=>{
    const baseline=accountStatisticsAssistantRequiredMigrations(),prior=installed593Original591RequiredMigrations();
    const next=scalar597LaterH0RequiredMigrations();
    assert.equal(baseline.length,54);assert.equal(prior.length,61);assert.equal(next.length,62);
    assert.deepEqual(prior.slice(0,54),baseline);assert.deepEqual(next.slice(0,61),prior);
    // The genuine constrained native host seeds this version, then executes
    // the nine predecessor phases. Earlier archive entries are not installed
    // in that synthetic database. Production keeps its full 54/61/62 inventory.
    const nativeStart=baseline.findIndex(row=>row.version==='20261010130000');
    assert.equal(nativeStart,44,'The fixed native seed must retain its exact archive prefix');
    async function assertHistory(expected){
      const actual=JSON.parse(await psql('select json_agg(version order by version) from supabase_migrations.schema_migrations;'));
      const required=expected.slice(nativeStart).map(row=>row.version);
      assert.deepEqual(actual,required,'Every normally executed native migration must match');
    }
    await assertHistory(baseline);
    for(const row of prior.slice(54)){
      const archived=await fs.readFile(path.join(repositoryRoot,'supabase/migrations',row.filename));
      assert.deepEqual(archived,await fs.readFile(path.join(ROOT,'supabase/migrations',row.filename)));
      await psql(archived.toString('utf8'));
      await psql('insert into supabase_migrations.schema_migrations values('+literal(row.version)+');');
    }
    await assertHistory(prior);
    for(const [name,hour] of [['same',49],['newer',50]]){
      const sourcePath=path.join(root,'scalar597-original594-'+name+'-conditions.json');
      const checkpointPath=path.join(root,'scalar597-original594-'+name+'-checkpoint.json');
      assert.equal(factory.atHour(hour),atHour(hour));
      await fs.writeFile(sourcePath,JSON.stringify(factory.sourceDocumentAt(hour,'rr-scalar597-native-original')),{flag:'wx'});
      await factory.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot});
      const payload=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
      const text=JSON.stringify(payload);
      assert(!text.includes('$scalar_original_fixture$'));
      await psql("insert into native_checkpoint_payloads values('"+SCALAR597_LATER_H0.oldPrefix+name
        +"',$scalar_original_fixture$"+text+"$scalar_original_fixture$::jsonb);");
    }
    const report=await compareFixedSuccessor(SCALAR597_LATER_H0,{...options,originalProfile});
    await assertHistory(next);
    return report;
  });
}

async function prepareScalar597TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile){
  const admission='public.ravradar_trip_v3_active_binding_admitted';
  const admissionType=admission+'('+Array(11).fill('text').join(',')+',jsonb,boolean,text,text,text,text)';
  const quota='public.consume_public_request_limit(text,text,integer,integer)';
  const archived=await fs.readFile(path.join(ROOT,'supabase/migrations/20260920220000_public_hour_pack_capacity_binding.sql'),'utf8');
  const quotaSource=await fs.readFile(path.join(ROOT,'supabase/migrations/20260826_security_hardening.sql'),'utf8');
  assert.equal(sha(archived),'4ab13e16700801ee38cd6a25cc6fe4adcc87cbe188c5f226a61798bede7b2f9f');
  assert.equal(sha(quotaSource),'b135b8d0fe2a479a50f91e3f3cd70c7cda09362a34eeb2da89236e259edd9283');
  const admissionSql=definition(archived,admission.slice('public.'.length));
  if(await psql('select to_regprocedure('+literal(admissionType)+') is null;')==='t'){
    await psql(admissionSql+'revoke all on function '+admissionType+' from public,anon,authenticated;'
      +'grant execute on function '+admissionType+' to service_role;');
  }
  if(await psql('select to_regprocedure('+literal(quota)+') is null;')==='t'){
    const start=quotaSource.indexOf('create table if not exists public.public_request_limits (');
    const stop=quotaSource.indexOf('create or replace function public.save_ravradar_permissions(');
    assert(start>=0&&stop>start);
    await psql(quotaSource.slice(start,stop));
  }
  const catalog=()=>psql("select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('oid',p.oid,'body',p.prosrc,'acl',p.proacl,'owner',p.proowner,'settings',p.proconfig))::text"
    +' from pg_proc p where p.oid in ('+literal(admissionType)+'::regprocedure,'+literal(quota)+'::regprocedure);');
  const beforeCatalog=await catalog();
  const service="set request.jwt.claim.role='service_role';set role service_role;";
  const activeExpression=(binding)=>admission+'('+
    ['modelId','stateSchemaVersion','variantId','profileId','componentSchemaId','explanationSchemaId','rankingPolicyId',
      'bestTimePolicyId','presentationPolicyId','modelContractSha256','modelBundleSha256'].map(key=>literal(binding[key])).join(',')
      +",'[\"ravscore-history-incomplete\"]'::jsonb,false,'zone-fixture','part-001','zone-fixture','part-001')";
  const active=(binding)=>psql(service+'select '+activeExpression(binding)+';');
  const quotaWorks=()=>psql(service+"select public.consume_public_request_limit('ravradar-assistant:minute','native-scalar597-fixture',6,60);");
  const nextBinding={...oldBinding,modelBundleSha256:newBundle};
  assert.equal(oldProfile.modelBundleSha256,oldBinding.modelBundleSha256);
  // These two synthetic rows exercise the actual admission RPC. The normal
  // operational document reader/writer is not bypassed in production.
  const op=Object.fromEntries(('transitionKind sourceHead datasetId productionReferenceAt rollbackId requestedModelBinding sourceModelBinding '
    +'candidatePlanSha256 candidateFullSha256 privateBundleContentSha256 publicManifestSha256 sourcePublicManifestSha256 requestedPublicManifestSha256 '
    +'sourceDeploymentId deploymentId requestedAt activatedAt failureCode returnPlanSha256 integratedReadinessSha256 integratedPublicAuditSha256 integratedManifestSha256')
    .split(' ').map(key=>[key,null]));
  Object.assign(op,{schemaVersion:'ravscore-operational-model-activation-v4',status:'INTEGRATED_ACTIVE',
    activeModelBinding:oldBinding,sourceImplementationClosureSha256:'1'.repeat(64),requestedImplementationClosureSha256:'2'.repeat(64),
    automaticActivationAllowed:false,schedulerActivationAllowed:false,calibrationEligible:false});
  const opKey='ravscore-operational-model-activation',profileKey='ravscore-profile-selection';
  const documents=()=>psql('select coalesce(jsonb_agg(to_jsonb(d) order by document_key),\'[]\'::jsonb)::text from admin_documents d where document_key in ('
    +literal(opKey)+','+literal(profileKey)+');');
  const history=()=>psql('select coalesce(jsonb_agg(to_jsonb(v) order by to_jsonb(v)::text collate "C"),\'[]\'::jsonb)::text from admin_document_versions v;');
  const json=value=>{const text=JSON.stringify(value);assert(!text.includes('$scalar_trip$'));return '$scalar_trip$'+text+'$scalar_trip$::jsonb';};
  const putSql=(key,value)=>'insert into admin_documents(document_key,payload) values('+literal(key)+','+json(value)
    +') on conflict(document_key) do update set payload=excluded.payload;';
  const put=(key,value)=>psql(putSql(key,value));
  // Fixed native fixtures must not overwrite an earlier phase's documents.
  assert.equal(await documents(),'[]','The two native activation fixture keys must be absent');
  const beforeHistory=await history();
  await put(opKey,op);await put(profileKey,oldProfile);
  assert.equal(await history(),beforeHistory,'Fixture inserts must preserve the whole existing history');
  const beforeDocuments=await documents();
  assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');
  assert.equal(await quotaWorks(),'t');
  return async()=>{
    assert.equal(await catalog(),beforeCatalog);
    assert.equal(await documents(),beforeDocuments);
    assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');
    assert.equal(await quotaWorks(),'t');
    // Each actual RPC probe and its temporary document changes share ONE
    // transaction. ROLLBACK also restores trigger-created profile history.
    // No history row is filtered, deleted or accepted as an expected increase.
    const attempt=async mutations=>JSON.parse(await psql('begin;'+mutations.join('')
      +"set local request.jwt.claim.role='service_role';set local role service_role;"
      +"select jsonb_build_object('oldAllowed',"+activeExpression(oldBinding)
      +",'nextAllowed',"+activeExpression(nextBinding)+');rollback;'));
    assert.deepEqual(await attempt([putSql(opKey,{...op,status:'INTEGRATED_PENDING'})]),
      {oldAllowed:false,nextAllowed:false});
    assert.deepEqual(await attempt([
      putSql(profileKey,{...oldProfile,sourceVersion:'4.0.597',modelBundleSha256:newBundle}),
      putSql(opKey,{...op,activeModelBinding:nextBinding}),
    ]),{oldAllowed:false,nextAllowed:true});
    assert.equal(await documents(),beforeDocuments,'Rollback must restore the whole fixture documents');
    assert.equal(await history(),beforeHistory,'Rollback must restore the whole existing history');
    return {oldActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,
      nextActiveAfterCompletion:true,oldRefusedAfterCompletion:true,activeDocumentsUnchangedBySql:true,
      quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true};
  };
}

// Native TEST adapter only. Prepare its finite documents before the SAME
// unfiltered full-row inventory used by normal guard/install comparisons.
// The early source target exercises this seam without creating673-state packs.
export async function prepareScalar597NativeFixtureWindow({psql,oldBinding,newBundle,oldProfile}){
  assert.equal(arguments.length,1);assert.equal(typeof psql,'function');
  assert.equal(oldBinding?.modelBundleSha256,SCALAR597_LATER_H0_BEFORE.I);
  assert.equal(newBundle,requireScalar597LaterH0Binding().I);
  const checkIntermediate=await prepareScalar597TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile);
  const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved');
  const preserved=await psql(preservedSql);
  return Object.freeze({preservedSql,preserved,checkIntermediate});
}
export async function compareInstalled593Original591Successor(options){
  return compareFixedSuccessor(INSTALLED593_ORIGINAL591,...arguments);
}

// Fixed TEST-only successor. Nothing here issues or selects a model/output.
export const ASSISTANT_AFTER597_NATIVE_PROFILE=Object.freeze({
  before:ASSISTANT_AFTER597_BEFORE,databaseBefore:ASSISTANT_AFTER597_BEFORE,
  aliases:ASSISTANT_AFTER597_ALIASES,parent:FROZEN597_NATIVE_SOURCE,
  prefix:'assistant-after597-current-',oldPrefix:'scalar597-later-h0-current-',previousRelease:597,
  requireBinding:requireAssistantAfter597Binding,requireOutput:requireAssistantAfter597Output,
  requiredMigrations:assistantAfter597RequiredMigrations,migration:assistantAfter597Migration,
  readBefore:readScalar597LaterH0CanonicalSource,readAfter:readAssistantAfter597CanonicalSource,
  sourcePhase:UNISSUED_ASSISTANT_AFTER597_SUCCESSOR.sourcePhase,migrationCount:63,
  deriveContractShapeFromCanonical:true,fixtureStem:'assistant-after597',olderFixtures:Object.freeze([]),
  resultKind:'ASSISTANT_AFTER597_SUCCESSOR',failureKind:'ASSISTANT_AFTER597_NATIVE_FIRST_FAILURE',
});

export const ASSISTANT_AFTER598_NATIVE_PROFILE=Object.freeze({
  before:ASSISTANT_AFTER598_BEFORE,databaseBefore:ASSISTANT_AFTER598_BEFORE,
  aliases:ASSISTANT_AFTER598_ALIASES,parent:FROZEN598_NATIVE_SOURCE,
  prefix:'assistant-after598-current-',oldPrefix:'assistant-after598-original598-',previousRelease:598,
  requireBinding:requireAssistantAfter598Binding,requireOutput:requireAssistantAfter598Output,
  requiredMigrations:assistantAfter598RequiredMigrations,migration:assistantAfter598Migration,
  readBefore:readAssistantAfter597CanonicalSource,readAfter:readAssistantAfter598CanonicalSource,
  sourcePhase:INACTIVE_ASSISTANT_AFTER598_SUCCESSOR.sourcePhase,migrationCount:64,
  deriveContractShapeFromCanonical:true,fixtureStem:'assistant-after598',olderFixtures:Object.freeze([]),
  resultKind:'ASSISTANT_AFTER598_SUCCESSOR',failureKind:'ASSISTANT_AFTER598_NATIVE_FIRST_FAILURE',
});
export const ASSISTANT_AFTER599_NATIVE_PROFILE=Object.freeze({
  before:ASSISTANT_AFTER599_BEFORE,databaseBefore:Object.freeze({...ASSISTANT_AFTER599_BEFORE,version:ASSISTANT_AFTER599_DATABASE_LEDGER.maximumVersion}),
  aliases:ASSISTANT_AFTER599_ALIASES,parent:FROZEN599_NATIVE_SOURCE,
  prefix:'assistant-after599-current-',oldPrefix:'assistant-after599-original599-',previousRelease:599,
  requireBinding:requireAssistantAfter599Binding,requireOutput:requireAssistantAfter599Output,
  requiredMigrations:assistantAfter599RequiredMigrations,migration:assistantAfter599Migration,
  readBefore:readAssistantAfter598CanonicalSource,readAfter:readAssistantAfter599CanonicalSource,
  sourcePhase:INACTIVE_ASSISTANT_AFTER599_SUCCESSOR.sourcePhase,migrationCount:66,
  deriveContractShapeFromCanonical:true,fixtureStem:'assistant-after599',olderFixtures:Object.freeze([]),
  resultKind:'ASSISTANT_AFTER599_SUCCESSOR',failureKind:'ASSISTANT_AFTER599_NATIVE_FIRST_FAILURE',
});

const AFTER601=INACTIVE_ASSISTANT_AFTER601_SUCCESSOR;
const ASSISTANT_AFTER601_NATIVE_PROFILE=Object.freeze({
  before:AFTER601.before,databaseBefore:AFTER601.databaseBefore,aliases:ASSISTANT_AFTER601_ALIASES,
  parent:SOURCE601_ORIGINAL_DATA_PROFILE,previousRelease:601,
  prefix:'assistant-after601-current-',oldPrefix:'assistant-after601-original601-',
  requireBinding:AFTER601.requireBinding,requireOutput:AFTER601.requireOutput,
  requiredMigrations:assistantAfter601RequiredMigrations,migration:AFTER601.migration,
  readBefore:AFTER601.readPredecessorCanonicalSource,readAfter:AFTER601.readCanonicalSource,
  sourcePhase:AFTER601.sourcePhase,migrationCount:70,
  fixtureStem:'assistant-after601',olderFixtures:Object.freeze([]),
  resultKind:'ASSISTANT_AFTER601_SUCCESSOR',failureKind:'ASSISTANT_AFTER601_NATIVE_FIRST_FAILURE',
});

export async function compareAssistantAfter597Successor(options){
  requireAssistantAfter597Output(); // FIRST: null refuses before options/Git/factory/SQL.
  assert.equal(arguments.length,1);
  const {psql,runSql,root,atHour}=options;
  for(const fn of [psql,runSql,atHour])assert.equal(typeof fn,'function');
  return withFrozen597CheckpointPostgresSource(async({adapter,factory,repositoryRoot,originalProfile,
    nativeSourceHead,nativeSourceTree})=>{
    assert.equal(nativeSourceHead,FROZEN597_NATIVE_SOURCE.nativeHead);
    assert.equal(nativeSourceTree,FROZEN597_NATIVE_SOURCE.nativeTree);
    assert.equal(factory.ravScoreModelBinding().modelBundleSha256,ASSISTANT_AFTER597_BEFORE.I);
    assert.equal(factory.candidateGRollbackModelBinding().modelBundleSha256,ASSISTANT_AFTER597_BEFORE.C);
    assert.equal(factory.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,ASSISTANT_AFTER597_BEFORE.T);
    const baseline=accountStatisticsAssistantRequiredMigrations(),prior=scalar597LaterH0RequiredMigrations();
    const next=assistantAfter597RequiredMigrations();
    assert.equal(baseline.length,54);assert.equal(prior.length,62);assert.equal(next.length,63);
    assert.deepEqual(prior.slice(0,54),baseline);assert.deepEqual(next.slice(0,62),prior);
    const nativeStart=baseline.findIndex(row=>row.version==='20261010130000');assert.equal(nativeStart,44);
    const assertHistory=async inventory=>assert.deepEqual(JSON.parse(await psql(
      'select json_agg(version order by version) from supabase_migrations.schema_migrations;')),
      inventory.slice(nativeStart).map(row=>row.version),'Every executed migration in the same native host');
    await assertHistory(baseline);
    // This genuine97 adapter actually builds/validates its old594 bank and runs
    // 54→61→62, then creates genuine597 outputs with the genuine803f factory.
    const predecessor=await adapter.compareScalar597LaterH0Successor({psql,runSql,root,
      sourceDocumentAt:factory.sourceDocumentAt,atHour:factory.atHour,
      saveCheckpoint:factory.saveRavScoreContinuationCheckpoint});
    assert.equal(predecessor.kind,'SCALAR597_LATER_H0_SUCCESSOR');assert.equal(predecessor.sqlExecuted,true);
    assert.equal(predecessor.sourceMigrationInventory,62);assert.equal(predecessor.wholeMetadataInverse,true);
    await assertHistory(prior);assert.equal(factory.atHour(49),atHour(49));
    // The fixed oldPrefix names the actual597 bank just produced above. It is
    // neither a relabelled594 object nor a caller-provided fixture/receipt.
    const report=await compareFixedSuccessor(ASSISTANT_AFTER597_NATIVE_PROFILE,{...options,originalProfile});
    await assertHistory(next);
    return {...report,predecessorExecutedInSameHost:true,parentCodeHead:FROZEN597_NATIVE_SOURCE.codeHead,
      parentNativeHead:nativeSourceHead};
  });
}

export async function compareAssistantAfter598Successor(options){
  requireAssistantAfter598Output();assert.equal(arguments.length,1);
  const {psql,root,atHour}=options;assert.equal(typeof psql,'function');
  return withFrozen598CheckpointFactorySource(async({factory,repositoryRoot,originalProfile,parentCodeHead})=>{
    const baseline=accountStatisticsAssistantRequiredMigrations(),prior=assistantAfter597RequiredMigrations(),next=assistantAfter598RequiredMigrations();
    assert.equal(baseline.length,54);assert.equal(prior.length,63);assert.equal(next.length,64);
    assert.deepEqual(prior.slice(0,54),baseline);assert.deepEqual(next.slice(0,63),prior);
    const nativeStart=baseline.findIndex(row=>row.version==='20261010130000');assert.equal(nativeStart,44);
    const assertHistory=async rows=>assert.deepEqual(JSON.parse(await psql(
      'select json_agg(version order by version) from supabase_migrations.schema_migrations;')),
      rows.slice(nativeStart).map(row=>row.version),'Exact actually executed migration suffix in the same owned host');
    await assertHistory(baseline);
    const bankBefore=await psql(currentMemoryWarmupPreservationInventorySql('original-bank'));
    const accountBefore=await psql(accountRowsSql());
    for(const row of prior.slice(54)){
      const original=await fs.readFile(path.join(repositoryRoot,'supabase/migrations',row.filename));
      assert.deepEqual(original,await fs.readFile(path.join(ROOT,'supabase/migrations',row.filename)));
      await psql(original.toString('utf8'));
      await psql('insert into supabase_migrations.schema_migrations values('+literal(row.version)+');');
    }
    await assertHistory(prior);
    assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bankBefore);
    assert.equal(await psql(accountRowsSql()),accountBefore);
    for(const[name,hour]of [['same',49],['newer',50]]){
      assert.equal(factory.atHour(hour),atHour(hour));
      const sourcePath=path.join(root,'assistant-after598-original598-'+name+'-source.json');
      const checkpointPath=path.join(root,'assistant-after598-original598-'+name+'-checkpoint.json');
      await fs.writeFile(sourcePath,JSON.stringify(factory.sourceDocumentAt(hour,'rr-after598-native-original598')),{flag:'wx'});
      await factory.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot});
      const payload=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
      assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,ASSISTANT_AFTER598_BEFORE.I);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,ASSISTANT_AFTER598_BEFORE.C);
      assert.equal(payload.continuationStateContractSha256,ASSISTANT_AFTER598_BEFORE.T);
      const text=JSON.stringify(payload);assert(!text.includes('$original598$'));
      await psql("insert into native_checkpoint_payloads values('assistant-after598-original598-"+name+"',$original598$"+text+"$original598$::jsonb);");
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='assistant-after598-original598-"+name+"'),'"+atHour(hour)+"');"),'t');
    }
    const report=await compareFixedSuccessor(ASSISTANT_AFTER598_NATIVE_PROFILE,{...options,originalProfile});
    await assertHistory(next);
    return {...report,predecessorExecutedInSameHost:true,parentCodeHead,predecessorSetupMigrationCount:9};
  });
}
export async function compareAssistantAfter599Successor(options){
  requireAssistantAfter599Output();assert.equal(arguments.length,1);
  const {psql,root,atHour}=options;assert.equal(typeof psql,'function');
  return withFrozen599CheckpointFactorySource(async({factory,repositoryRoot,originalProfile,parentCodeHead})=>{
    const baseline=accountStatisticsAssistantRequiredMigrations(),prior=assistantAfter598RequiredMigrations(),next=assistantAfter599RequiredMigrations();
    assert.equal(baseline.length,54);assert.equal(prior.length,64);assert.equal(next.length,66);
    assert.deepEqual(prior.slice(0,54),baseline);assert.deepEqual(next.slice(0,64),prior);
    const nativeStart=baseline.findIndex(row=>row.version==='20261010130000');assert.equal(nativeStart,44);
    const assertHistory=async rows=>assert.deepEqual(JSON.parse(await psql(
      'select json_agg(version order by version) from supabase_migrations.schema_migrations;')),
      rows.slice(nativeStart).map(row=>row.version),'Exact existing native suffix, including its explicitly synthetic initial anchor');
    await assertHistory(baseline);
    const bankBefore=await psql(currentMemoryWarmupPreservationInventorySql('original-bank'));
    const accountBefore=await psql(accountRowsSql());
    await applyNativeMigrationRows(psql,prior.slice(54),repositoryRoot);
    await assertHistory(prior);
    assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bankBefore);
    assert.equal(await psql(accountRowsSql()),accountBefore);
    for(const[name,hour]of [['same',49],['newer',50]]){
      assert.equal(factory.atHour(hour),atHour(hour));
      const sourcePath=path.join(root,'assistant-after599-original599-'+name+'-source.json');
      const checkpointPath=path.join(root,'assistant-after599-original599-'+name+'-checkpoint.json');
      await fs.writeFile(sourcePath,JSON.stringify(factory.sourceDocumentAt(hour,'rr-after599-native-original599')),{flag:'wx'});
      await factory.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot});
      const payload=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
      assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,ASSISTANT_AFTER599_BEFORE.I);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,ASSISTANT_AFTER599_BEFORE.C);
      assert.equal(payload.continuationStateContractSha256,ASSISTANT_AFTER599_BEFORE.T);
      const text=JSON.stringify(payload);assert(!text.includes('$original599$'));
      await psql("insert into native_checkpoint_payloads values('assistant-after599-original599-"+name+"',$original599$"+text+"$original599$::jsonb);");
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='assistant-after599-original599-"+name+"'),'"+atHour(hour)+"');"),'t');
    }
    // Explicit TEST input modelling the prior installed ledger. The old
    // constrained host has never executed these44 archive migrations, and its
    // existing20261010130000 row is likewise a selected-definition scaffold.
    // This does not alter the normal production SQL guard or old native phases.
    const priorFixtureVersions=prior.slice(0,nativeStart+1).map(row=>row.version);
    assert.equal(priorFixtureVersions.length,45);
    const prefixFixtureVersions=priorFixtureVersions.slice(0,-1);assert.equal(prefixFixtureVersions.length,44);
    await psql('insert into supabase_migrations.schema_migrations(version) values '
      +prefixFixtureVersions.map(version=>'('+literal(version)+')').join(',')+';');
    const assertDeclaredLedger=async rows=>assert.deepEqual(JSON.parse(await psql(
      'select json_agg(version order by version) from supabase_migrations.schema_migrations;')),
      rows.map(row=>row.version),'Declared synthetic prior ledger plus actually executed whole suffix');
    await assertDeclaredLedger(prior);
    // The checkpoint database installs the ENTIRE exact app600 source before
    // registering its ledger row. Its tiny existing synthetic account fixture
    // is extended only for actual trigger/FK prerequisites; it is not a claim
    // about hosted Auth or the complete profiles schema.
    const app=readAccountErasureSource(ROOT);
    assert.equal(app.sha256,ASSISTANT_AFTER599_DATABASE_LEDGER.appMigrationSha256);
    await installNativeManualAccountBefore601(psql,app);
    const appCatalogBefore=await psql(accountErasureCatalogQuery);
    verifyAccountErasureCatalogMetadata([{metadata:JSON.parse(appCatalogBefore)}],{source:app});
    await assertDeclaredLedger(next.slice(0,-1));
    const report=await compareFixedSuccessor(ASSISTANT_AFTER599_NATIVE_PROFILE,{...options,originalProfile});
    assert.equal(await psql(accountErasureCatalogQuery),appCatalogBefore,'Whole app600 catalog retained by the new numerical migration');
    await assertDeclaredLedger(next);
    const sourceInventory=await Promise.all(next.map(async row=>({version:row.version,filename:row.filename,
      sha256:sha(await fs.readFile(path.join(ROOT,'supabase/migrations',row.filename)))})));
    const wholeExecutedMigrationVersions=next.slice(nativeStart+1).map(row=>row.version);
    assert.equal(wholeExecutedMigrationVersions.length,21);
    return {...report,app600InstalledInCheckpointDatabase:true,app600CatalogPreserved:true,
      predecessorExecutedInSameHost:true,parentCodeHead,predecessorSetupMigrationCount:11,
      allHistoricalMigrationsExecuted:false,productionInstalledHistoryEvidence:false,
      ledgerFixture:{kind:'SYNTHETIC_PRIOR_LEDGER_AND_EXECUTED_SUFFIX_V1',priorFixtureVersions,
        wholeExecutedMigrationVersions,sourceInventorySha256:sha(JSON.stringify(sourceInventory))}};
  });
}

// Both native phases replay actual predecessor bytes on the existing owned PG host.
async function applyNativeMigrationRows(psql,rows,sourceRoot=ROOT){
  for(const row of rows){
    const current=await fs.readFile(path.join(ROOT,'supabase/migrations',row.filename));
    if(sourceRoot!==ROOT)assert.deepEqual(current,await fs.readFile(path.join(sourceRoot,'supabase/migrations',row.filename)));
    await psql(current.toString('utf8'));
    await psql('insert into supabase_migrations.schema_migrations values('+literal(row.version)+');');
  }
}

async function installNativeManualAccountBefore601(psql,app){
  await psql(`create table auth.users(id uuid primary key);
insert into auth.users(id) select id from public.profiles;
alter table public.profiles add column email text,add column role text not null default 'expert',add column is_active boolean not null default true;
alter table public.profiles add constraint native_profiles_auth_fk foreign key(id) references auth.users(id) on delete cascade;
create table public.observations(id bigint primary key,user_id uuid references auth.users(id) on delete set null);`);
  await psql(app.sql);
  await psql('insert into supabase_migrations.schema_migrations values('+literal(ASSISTANT_AFTER599_DATABASE_LEDGER.maximumVersion)+');');
}

function readFrozen601TestSource(file){
  const {head,tree}=SOURCE601_ORIGINAL_DATA_PROFILE;
  const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  const git=(...args)=>execFileSync('git',['-C',ROOT,'-c','protocol.allow=never',...args],{
    env:{...env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0'},
    encoding:'utf8',timeout:30000,maxBuffer:1024*1024,
  });
  assert.equal(git('rev-parse',head+'^{tree}').trim(),tree);
  return git('cat-file','blob',head+':'+file);
}

async function frozen601CheckpointFactory(repositoryRoot){
  const text=readFrozen601TestSource('scripts/test-protected-ravscore-continuation-checkpoint.mjs');
  const slice=(start,end)=>{
    assert.equal(text.split(start).length,2);
    assert.equal(text.split(end).length,2);
    assert(text.indexOf(start)<text.indexOf(end));
    return text.slice(text.indexOf(start),text.indexOf(end));
  };
  const recipe=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
  assert.equal(sha(recipe),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
  const imports=[
    ['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
    ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
    ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs'],
  ];
  const program="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>
    'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(repositoryRoot,file)).href)+';').join('\n')+'\n'+recipe
    +'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256};';
  const factory=await import('data:text/javascript;base64,'+Buffer.from(program).toString('base64'));
  assert.equal(factory.ravScoreModelBinding().modelBundleSha256,AFTER601.before.I);
  assert.equal(factory.candidateGRollbackModelBinding().modelBundleSha256,AFTER601.before.C);
  assert.equal(factory.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,AFTER601.before.T);
  return factory;
}

const nativeLedgerRows=async psql=>JSON.parse(await psql(
  'select json_agg(version order by version) from supabase_migrations.schema_migrations;'));

async function readNative601AccountOff(psql,app,inactivity,append){
  const manual=JSON.parse(await psql(accountErasureCatalogQuery));
  verifyAccountErasureCatalogMetadata([{metadata:manual}],{source:app});
  const query=buildFixedNativeActivityReceiptQuery(accountInactivityCatalogQuery).trim().replace(/;$/,'');
  const {metadata,receipt,authAdminPublicUsage,policyEpoch}=JSON.parse(await psql(
    'select row_to_json(fixed_receipt) from ('+query+') fixed_receipt;'));
  const {account_native_activity_receipt:receiptTable,...tables}=metadata.tables;
  verifyAccountInactivityCatalogMetadata([{metadata:{...metadata,tables}}],{source:{...inactivity,bodies:{
    ...inactivity.bodies,account_native_activity_token_hook:append.hookBodySha256,
  }}});
  assert(authAdminPublicUsage&&typeof policyEpoch==='string');
  assert(receiptTable.present&&receiptTable.regular&&receiptTable.rls&&receiptTable.forceRls);
  assert.equal(receiptTable.owner,'rr_native_test');
  assert.equal(receiptTable.checks,7);
  assert.equal(receiptTable.constraintCount,8);
  for(const key of ['directAccess','unexpectedAcl','unexpectedColumnAcl'])assert.equal(receiptTable[key],false);
  assert.equal(receipt.length,1);
  for(const key of ['coverageEpoch','armedAt','nativeStartedAt','nativeCapturedAt'])assert.equal(receipt[0][key],null);
  const policy=JSON.parse(await psql('select row_to_json(p) from public.account_inactivity_policy p where singleton;'));
  assert.equal(policy.coverage_status,'UNKNOWN');
  assert.equal(policy.coverage_started_at,null);
  assert.equal(policy.notices_enabled,false);
  assert.equal(policy.delivery_qualified,false);
  assert.equal(policy.coverage_epoch,policyEpoch);
  return {manual,metadata,receipt,policy,authAdminPublicUsage};
}

export async function compareAssistantAfter601Successor(options){
  AFTER601.requireOutput();
  assert.equal(arguments.length,1);
  const {psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint}=options;
  for(const fn of [psql,runSql,sourceDocumentAt,atHour,saveCheckpoint])assert.equal(typeof fn,'function');
  assert.equal(typeof root,'string');
  assert.equal(await psql("select current_setting('listen_addresses');"),'');
  assert.equal(await psql('select current_user;'),'rr_native_test');
  const baseline=accountStatisticsAssistantRequiredMigrations(),prior=assistantAfter599RequiredMigrations();
  const next=assistantAfter601RequiredMigrations(),installed=next.slice(0,-1);
  assert.deepEqual(installed.slice(0,66),prior);
  assert.equal(baseline.length,54);
  assert.equal(baseline[44].version,'20261010130000');
  assert.deepEqual(await nativeLedgerRows(psql),baseline.slice(44).map(row=>row.version));
  const bank=await psql(currentMemoryWarmupPreservationInventorySql('original-bank'));
  const accounts=await psql(accountRowsSql());
  const app=readAccountErasureSource(ROOT),inactivity=readAccountInactivitySource(ROOT),append=readFixedNativeActivityReceiptSource();
  assert.deepEqual([app.sha256,...inactivity.migrations.map(row=>row.sha256),append.sha256],
    AFTER601.installedAppMigrations.map(row=>row.sha256));
  await withFrozen599CheckpointFactorySource(({repositoryRoot})=>applyNativeMigrationRows(psql,prior.slice(54,-2),repositoryRoot));
  // The old fixture's initial 45 ledger rows include declarations, not native executions.
  // The former 44-row prefix is absent in the native 54-row baseline.
  await psql('insert into supabase_migrations.schema_migrations(version) values '
    +prior.slice(0,44).map(row=>'('+literal(row.version)+')').join(',')+';');
  await installNativeManualAccountBefore601(psql,app);
  await applyNativeMigrationRows(psql,prior.slice(-1));
  // The original 49/17/9 app tests can already have installed this cluster role.
  if(await psql("select exists(select 1 from pg_roles where rolname='supabase_auth_admin');")==='f')
    await psql('create role supabase_auth_admin nologin noinherit;');
  assert.equal(await psql("select not rolcanlogin and not rolinherit from pg_roles where rolname='supabase_auth_admin';"),'t');
  await applyNativeMigrationRows(psql,installed.slice(66));
  assert.deepEqual(await nativeLedgerRows(psql),installed.map(row=>row.version));
  const accountBefore=await readNative601AccountOff(psql,app,inactivity,append);
  assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bank);
  assert.equal(await psql(accountRowsSql()),accounts);

  const originalProfile=JSON.parse(readFrozen601TestSource('data/admin/ravscore-profile-selection.json'));
  assert.equal(originalProfile.sourceVersion,'4.0.601');
  assert.equal(originalProfile.modelBundleSha256,AFTER601.before.I);
  await withSource601OriginalDataSource(async repositoryRoot=>{
    const factory=await frozen601CheckpointFactory(repositoryRoot);
    for(const [name,hour] of [['same',49],['newer',50]]){
      assert.equal(factory.atHour(hour),atHour(hour));
      const stem=path.join(root,ASSISTANT_AFTER601_NATIVE_PROFILE.oldPrefix+name);
      const sourcePath=stem+'-source.json',checkpointPath=stem+'-checkpoint.json';
      await fs.writeFile(sourcePath,JSON.stringify(factory.sourceDocumentAt(hour,'rr-after601-native-original601')),{flag:'wx'});
      await factory.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot});
      const payload=await fs.readFile(checkpointPath,'utf8');
      assert(!payload.includes('$original601$'));
      await psql("insert into native_checkpoint_payloads values('assistant-after601-original601-"+name+"',$original601$"+payload+"$original601$::jsonb);");
    }
  });

  const scalarWalkFile=path.join(ROOT,'supabase/migrations',CHECKPOINT_SCALAR_WALK_MIGRATION.filename);
  const scalarWalkPresent=await fs.lstat(scalarWalkFile).then(()=>true,error=>{
    if(error.code==='ENOENT')return false;
    throw error;
  });
  const scalarWalkSource=scalarWalkPresent?await readCheckpointScalarWalkSource():null;
  const distinctPrivacyFile=path.join(ROOT,'supabase/migrations',CHECKPOINT_DISTINCT_PRIVACY_MIGRATION.filename);
  const distinctPrivacyPresent=await fs.lstat(distinctPrivacyFile).then(()=>true,error=>{
    if(error.code==='ENOENT')return false;
    throw error;
  });
  let distinctPrivacySource=null;
  if(distinctPrivacyPresent){
    assert(scalarWalkSource,'Distinct checkpoint privacy requires scalar walk');
    const {ACCOUNT_AUTOMATIC_OFF_MIGRATIONS,readAccountAutomaticOffSql}=await import('./account-automatic-off-source.mjs');
    await Promise.all(ACCOUNT_AUTOMATIC_OFF_MIGRATIONS.map(migration=>readAccountAutomaticOffSql(migration)));
    distinctPrivacySource=await readCheckpointDistinctPrivacySource();
  }
  const report=await compareFixedSuccessor(ASSISTANT_AFTER601_NATIVE_PROFILE,
    {...options,originalProfile,scalarWalkSource,distinctPrivacySource});
  const expectedLedger=next.map(row=>row.version);
  if(scalarWalkPresent)expectedLedger.push(CHECKPOINT_SCALAR_WALK_MIGRATION.version);
  if(distinctPrivacyPresent)expectedLedger.push(CHECKPOINT_DISTINCT_PRIVACY_MIGRATION.version);
  assert.deepEqual(await nativeLedgerRows(psql),expectedLedger);
  assert.deepEqual(await readNative601AccountOff(psql,app,inactivity,append),accountBefore);
  return {...report,installedLedgerBeforeRows:installed.length,installedLedgerAfterRows:next.length,
    accountOffCatalogPreserved:true,predecessorExecutedInSameHost:true,
    parentCodeHead:SOURCE601_ORIGINAL_DATA_PROFILE.head,allHistoricalMigrationsExecuted:false,
    productionInstalledHistoryEvidence:false};
}

function after597CanonicalShape(before,after,aliases){
  requireAssistantAfter597Output();
  const shape=source=>{
    const contract=definition(source,CP+'contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    return {oidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1};
  };
  const old=shape(before.canonicalSource),next=shape(after.canonicalSource);
  assert.equal(next.oidSlots,old.oidSlots+aliases.length);
  assert.equal(next.contractBodies,old.contractBodies+aliases.length);
  return next; // Derived only after legitimate output and whole canonical/SQL hashes.
}

function after598CanonicalShape(before,after,aliases){
  requireAssistantAfter598Output();
  const shape=source=>{
    const contract=definition(source,CP+'contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    return {oidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1};
  };
  const old=shape(before.canonicalSource),next=shape(after.canonicalSource);
  assert.equal(next.oidSlots,old.oidSlots+aliases.length);
  assert.equal(next.contractBodies,old.contractBodies+aliases.length);
  return next; // Derived only after legitimate output and whole canonical/SQL hashes.
}
function after599CanonicalShape(before,after,aliases){
  requireAssistantAfter599Output();
  return deriveCanonicalShape(before,after,aliases);
}

function deriveCanonicalShape(before,after,aliases){
  const shape=source=>{
    const contract=definition(source,CP+'contract');
    const array=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contract);assert(array);
    return {oidSlots:(array[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,
      contractBodies:(contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1};
  };
  const old=shape(before.canonicalSource),next=shape(after.canonicalSource);
  assert.equal(next.oidSlots,old.oidSlots+aliases.length);
  assert.equal(next.contractBodies,old.contractBodies+aliases.length);
  return next; // Derived only after legitimate output and whole canonical/SQL hashes.
}

async function prepareAssistantAfter597TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile){
  const admission='public.ravradar_trip_v3_active_binding_admitted';
  const admissionType=admission+'('+Array(11).fill('text').join(',')+',jsonb,boolean,text,text,text,text)';
  const quota='public.consume_public_request_limit(text,text,integer,integer)';
  for(const signature of [admissionType,quota])assert.equal(await psql('select to_regprocedure('+literal(signature)+') is not null;'),'t');
  const catalog=()=>psql("select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('oid',p.oid,'body',p.prosrc,'acl',p.proacl,'owner',p.proowner,'settings',p.proconfig))::text"
    +' from pg_proc p where p.oid in ('+literal(admissionType)+'::regprocedure,'+literal(quota)+'::regprocedure);');
  const service="set request.jwt.claim.role='service_role';set role service_role;";
  const activeExpression=binding=>admission+'('+['modelId','stateSchemaVersion','variantId','profileId',
    'componentSchemaId','explanationSchemaId','rankingPolicyId','bestTimePolicyId','presentationPolicyId',
    'modelContractSha256','modelBundleSha256'].map(key=>literal(binding[key])).join(',')
    +",'[\"ravscore-history-incomplete\"]'::jsonb,false,'zone-fixture','part-001','zone-fixture','part-001')";
  const active=binding=>psql(service+'select '+activeExpression(binding)+';');
  const quotaWorks=()=>psql(service+"select public.consume_public_request_limit('ravradar-assistant:minute','native-assistant-after597-fixture',6,60);");
  const nextBinding={...oldBinding,modelBundleSha256:newBundle};
  assert.equal(oldProfile.modelBundleSha256,oldBinding.modelBundleSha256);assert.equal(oldProfile.sourceVersion,'4.0.597');
  const opKey='ravscore-operational-model-activation',profileKey='ravscore-profile-selection';
  const documents=()=>psql('select coalesce(jsonb_agg(to_jsonb(d) order by document_key),\'[]\'::jsonb)::text from admin_documents d where document_key in ('
    +literal(opKey)+','+literal(profileKey)+');');
  // The same bounded whole-row hash/count/byte inventory as normal preservation,
  // excluding ONLY the two fixed keys that this fixture is about to insert.
  const unrelatedSql='with row_fingerprints as materialized (\n'
    +"select 'checkpoint'::text as table_name,octet_length(row_bytes)::bigint as row_bytes,"
    +"encode(extensions.digest(row_bytes,'sha256'),'hex') as row_sha256 "
    +"from (select convert_to(to_jsonb(t)::text,'UTF8') as row_bytes from public.admin_documents t"
    +' where t.document_key not in ('+literal(opKey)+','+literal(profileKey)+')) as whole_rows\n),\n'
    +"table_names(table_name) as (values ('checkpoint')),\n"
    +'inventory as (\n'
    +"select n.table_name,0 as kind,''::text as row_sha256,0::bigint as row_bytes,"
    +'count(f.row_sha256) as row_count,coalesce(sum(f.row_bytes),0) as total_bytes '
    +'from table_names n left join row_fingerprints f using(table_name) group by n.table_name\n'
    +'union all\n'
    +'select table_name,1,row_sha256,row_bytes,count(*),0::numeric '
    +'from row_fingerprints group by table_name,row_sha256,row_bytes\n)\n'
    +'select jsonb_build_array(table_name,kind,row_sha256,row_bytes,row_count,total_bytes)::text '
    +'from inventory order by table_name collate "C",kind,row_sha256 collate "C",row_bytes;';
  const historySql='select coalesce(jsonb_agg(to_jsonb(v) order by to_jsonb(v)::text collate "C"),\'[]\'::jsonb)::text from admin_document_versions v;';
  const history=()=>psql(historySql);
  const operation=binding=>{
    const op=Object.fromEntries(('transitionKind sourceHead datasetId productionReferenceAt rollbackId requestedModelBinding sourceModelBinding '
      +'candidatePlanSha256 candidateFullSha256 privateBundleContentSha256 publicManifestSha256 sourcePublicManifestSha256 requestedPublicManifestSha256 '
      +'sourceDeploymentId deploymentId requestedAt activatedAt failureCode returnPlanSha256 integratedReadinessSha256 integratedPublicAuditSha256 integratedManifestSha256')
      .split(' ').map(key=>[key,null]));
    return Object.assign(op,{schemaVersion:'ravscore-operational-model-activation-v4',status:'INTEGRATED_ACTIVE',
      activeModelBinding:binding,sourceImplementationClosureSha256:'1'.repeat(64),requestedImplementationClosureSha256:'2'.repeat(64),
      automaticActivationAllowed:false,schedulerActivationAllowed:false,calibrationEligible:false});
  };
  const json=value=>{const text=JSON.stringify(value);assert(!text.includes('$after597_trip$'));return '$after597_trip$'+text+'$after597_trip$::jsonb';};
  const putSql=(key,value)=>'update admin_documents set payload='+json(value)+' where document_key='+literal(key)+';';
  const insertSql=(key,value)=>'insert into admin_documents(document_key,payload) values('+literal(key)+','+json(value)+');';
  // Genuine97's completed CAS cases reset admin_documents to checkpoint-only.
  // Its genuine594 bank remains intact, but neither activation fixture survives.
  // Create exactly two597 TEST fixtures BEFORE the unfiltered preservation baseline.
  const old594=(await readFixture(psql,SCALAR597_LATER_H0.oldPrefix+'same')).payload;
  assert.equal(old594.modelBinding.modelBundleSha256,SCALAR597_LATER_H0_BEFORE.I);
  assert.equal(old594.candidateGRollbackCompanion.modelBinding.modelBundleSha256,SCALAR597_LATER_H0_BEFORE.C);
  assert.equal(old594.continuationStateContractSha256,SCALAR597_LATER_H0_BEFORE.T);
  assert.deepEqual(JSON.parse(await documents()),[],'The two after597 native activation fixture keys must be absent');
  const unrelatedBefore=await psql(unrelatedSql);
  const historyBefore=JSON.parse(await history()),bankBefore=await psql(currentMemoryWarmupPreservationInventorySql('original-bank'));
  const accountBefore=await psql(accountRowsSql()),catalogBefore=await catalog(),op=operation(oldBinding);
  await psql('begin;'+insertSql(opKey,op)+insertSql(profileKey,oldProfile)+'commit;');
  assert.equal(await psql(unrelatedSql),unrelatedBefore,'Fixture INSERTs preserve every WHOLE unrelated admin row');
  assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bankBefore);
  assert.equal(await psql(accountRowsSql()),accountBefore);assert.equal(await catalog(),catalogBefore);
  const preparedRows=JSON.parse(await documents());assert.equal(preparedRows.length,2);
  const prepared=new Map(preparedRows.map(row=>[row.document_key,row]));
  assert.deepEqual(prepared.get(opKey)?.payload,op);assert.deepEqual(prepared.get(profileKey)?.payload,oldProfile);
  // The genuine native version_admin_document trigger is BEFORE UPDATE only.
  // These INSERTs append no history; preserve every complete preexisting row.
  assert.deepEqual(JSON.parse(await history()),historyBefore,'Fixture INSERTs preserve WHOLE predecessor history');
  const beforeDocuments=await documents(),beforeHistory=await history();
  assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');assert.equal(await quotaWorks(),'t');
  const checkIntermediate=async()=>{
    assert.equal(await catalog(),catalogBefore);assert.equal(await documents(),beforeDocuments);assert.equal(await history(),beforeHistory);
    assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');assert.equal(await quotaWorks(),'t');
    const attempt=async mutations=>JSON.parse(await psql('begin;'+mutations.join('')
      +"set local request.jwt.claim.role='service_role';set local role service_role;"
      +"select jsonb_build_object('oldAllowed',"+activeExpression(oldBinding)+",'nextAllowed',"+activeExpression(nextBinding)+');rollback;'));
    assert.deepEqual(await attempt([putSql(opKey,{...op,status:'INTEGRATED_PENDING'})]),{oldAllowed:false,nextAllowed:false});
    assert.deepEqual(await attempt([putSql(profileKey,{...oldProfile,sourceVersion:requireAssistantAfter597Release(),modelBundleSha256:newBundle}),
      putSql(opKey,{...op,activeModelBinding:nextBinding})]),{oldAllowed:false,nextAllowed:true});
    assert.equal(await documents(),beforeDocuments,'Rollback restores whole597 activation documents');
    assert.equal(await history(),beforeHistory,'Rollback restores WHOLE history, including preexisting rows');
    return {old597ActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,nextActiveAfterCompletion:true,
      old597RefusedAfterCompletion:true,wholeHistoryAndDocumentsPreserved:true,quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true};
  };
  return {checkIntermediate,historySql,beforeHistory};
}

export async function prepareAssistantAfter597NativeFixtureWindow(options){
  requireAssistantAfter597Output(); // FIRST: even option getters are forbidden while UNISSUED.
  assert.equal(arguments.length,1);
  const {psql,oldBinding,newBundle,oldProfile}=options;
  assert.equal(typeof psql,'function');assert.equal(oldBinding?.modelBundleSha256,ASSISTANT_AFTER597_BEFORE.I);
  assert.equal(newBundle,requireAssistantAfter597Binding().I);
  const window=await prepareAssistantAfter597TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile);
  const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved'),preserved=await psql(preservedSql);
  return Object.freeze({...window,preservedSql,preserved});
}

async function prepareAssistantAfter598TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile){
  const admission='public.ravradar_trip_v3_active_binding_admitted';
  const admissionType=admission+'('+Array(11).fill('text').join(',')+',jsonb,boolean,text,text,text,text)';
  const quota='public.consume_public_request_limit(text,text,integer,integer)';
  const archived=await fs.readFile(path.join(ROOT,'supabase/migrations/20260920220000_public_hour_pack_capacity_binding.sql'),'utf8');
  const quotaSource=await fs.readFile(path.join(ROOT,'supabase/migrations/20260826_security_hardening.sql'),'utf8');
  assert.equal(sha(archived),'4ab13e16700801ee38cd6a25cc6fe4adcc87cbe188c5f226a61798bede7b2f9f');
  assert.equal(sha(quotaSource),'b135b8d0fe2a479a50f91e3f3cd70c7cda09362a34eeb2da89236e259edd9283');
  const admissionSql=definition(archived,admission.slice('public.'.length));
  if(await psql('select to_regprocedure('+literal(admissionType)+') is null;')==='t'){
    await psql(admissionSql+'revoke all on function '+admissionType+' from public,anon,authenticated;'
      +'grant execute on function '+admissionType+' to service_role;');
  }
  if(await psql('select to_regprocedure('+literal(quota)+') is null;')==='t'){
    const start=quotaSource.indexOf('create table if not exists public.public_request_limits (');
    const stop=quotaSource.indexOf('create or replace function public.save_ravradar_permissions(');
    assert(start>=0&&stop>start);
    await psql(quotaSource.slice(start,stop));
  }
  for(const signature of [admissionType,quota])assert.equal(await psql('select to_regprocedure('+literal(signature)+') is not null;'),'t');
  const catalog=()=>psql("select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('oid',p.oid,'body',p.prosrc,'acl',p.proacl,'owner',p.proowner,'settings',p.proconfig))::text"
    +' from pg_proc p where p.oid in ('+literal(admissionType)+'::regprocedure,'+literal(quota)+'::regprocedure);');
  const service="set request.jwt.claim.role='service_role';set role service_role;";
  const activeExpression=binding=>admission+'('+['modelId','stateSchemaVersion','variantId','profileId',
    'componentSchemaId','explanationSchemaId','rankingPolicyId','bestTimePolicyId','presentationPolicyId',
    'modelContractSha256','modelBundleSha256'].map(key=>literal(binding[key])).join(',')
    +",'[\"ravscore-history-incomplete\"]'::jsonb,false,'zone-fixture','part-001','zone-fixture','part-001')";
  const active=binding=>psql(service+'select '+activeExpression(binding)+';');
  const quotaWorks=()=>psql(service+"select public.consume_public_request_limit('ravradar-assistant:minute','native-assistant-after598-fixture',6,60);");
  const nextBinding={...oldBinding,modelBundleSha256:newBundle};
  assert.equal(oldProfile.modelBundleSha256,oldBinding.modelBundleSha256);assert.equal(oldProfile.sourceVersion,'4.0.598');
  const opKey='ravscore-operational-model-activation',profileKey='ravscore-profile-selection';
  const documents=()=>psql('select coalesce(jsonb_agg(to_jsonb(d) order by document_key),\'[]\'::jsonb)::text from admin_documents d where document_key in ('
    +literal(opKey)+','+literal(profileKey)+');');
  // The same bounded whole-row hash/count/byte inventory as normal preservation,
  // excluding ONLY the two fixed keys that this fixture is about to insert.
  const unrelatedSql='with row_fingerprints as materialized (\n'
    +"select 'checkpoint'::text as table_name,octet_length(row_bytes)::bigint as row_bytes,"
    +"encode(extensions.digest(row_bytes,'sha256'),'hex') as row_sha256 "
    +"from (select convert_to(to_jsonb(t)::text,'UTF8') as row_bytes from public.admin_documents t"
    +' where t.document_key not in ('+literal(opKey)+','+literal(profileKey)+')) as whole_rows\n),\n'
    +"table_names(table_name) as (values ('checkpoint')),\n"
    +'inventory as (\n'
    +"select n.table_name,0 as kind,''::text as row_sha256,0::bigint as row_bytes,"
    +'count(f.row_sha256) as row_count,coalesce(sum(f.row_bytes),0) as total_bytes '
    +'from table_names n left join row_fingerprints f using(table_name) group by n.table_name\n'
    +'union all\n'
    +'select table_name,1,row_sha256,row_bytes,count(*),0::numeric '
    +'from row_fingerprints group by table_name,row_sha256,row_bytes\n)\n'
    +'select jsonb_build_array(table_name,kind,row_sha256,row_bytes,row_count,total_bytes)::text '
    +'from inventory order by table_name collate "C",kind,row_sha256 collate "C",row_bytes;';
  const historySql='select coalesce(jsonb_agg(to_jsonb(v) order by to_jsonb(v)::text collate "C"),\'[]\'::jsonb)::text from admin_document_versions v;';
  const history=()=>psql(historySql);
  const operation=binding=>{
    const op=Object.fromEntries(('transitionKind sourceHead datasetId productionReferenceAt rollbackId requestedModelBinding sourceModelBinding '
      +'candidatePlanSha256 candidateFullSha256 privateBundleContentSha256 publicManifestSha256 sourcePublicManifestSha256 requestedPublicManifestSha256 '
      +'sourceDeploymentId deploymentId requestedAt activatedAt failureCode returnPlanSha256 integratedReadinessSha256 integratedPublicAuditSha256 integratedManifestSha256')
      .split(' ').map(key=>[key,null]));
    return Object.assign(op,{schemaVersion:'ravscore-operational-model-activation-v4',status:'INTEGRATED_ACTIVE',
      activeModelBinding:binding,sourceImplementationClosureSha256:'1'.repeat(64),requestedImplementationClosureSha256:'2'.repeat(64),
      automaticActivationAllowed:false,schedulerActivationAllowed:false,calibrationEligible:false});
  };
  const json=value=>{const text=JSON.stringify(value);assert(!text.includes('$after598_trip$'));return '$after598_trip$'+text+'$after598_trip$::jsonb';};
  const putSql=(key,value)=>'update admin_documents set payload='+json(value)+' where document_key='+literal(key)+';';
  const insertSql=(key,value)=>'insert into admin_documents(document_key,payload) values('+literal(key)+','+json(value)+');';
  const original598=(await readFixture(psql,'assistant-after598-original598-same')).payload;
  assert.equal(original598.modelBinding.modelBundleSha256,ASSISTANT_AFTER598_BEFORE.I);
  assert.equal(original598.candidateGRollbackCompanion.modelBinding.modelBundleSha256,ASSISTANT_AFTER598_BEFORE.C);
  assert.equal(original598.continuationStateContractSha256,ASSISTANT_AFTER598_BEFORE.T);
  assert.deepEqual(JSON.parse(await documents()),[],'The two after598 native activation fixture keys must be absent');
  const unrelatedBefore=await psql(unrelatedSql);
  const historyBefore=JSON.parse(await history()),bankBefore=await psql(currentMemoryWarmupPreservationInventorySql('original-bank'));
  const accountBefore=await psql(accountRowsSql()),catalogBefore=await catalog(),op=operation(oldBinding);
  await psql('begin;'+insertSql(opKey,op)+insertSql(profileKey,oldProfile)+'commit;');
  assert.equal(await psql(unrelatedSql),unrelatedBefore,'Fixture INSERTs preserve every WHOLE unrelated admin row');
  assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bankBefore);
  assert.equal(await psql(accountRowsSql()),accountBefore);assert.equal(await catalog(),catalogBefore);
  const preparedRows=JSON.parse(await documents());assert.equal(preparedRows.length,2);
  const prepared=new Map(preparedRows.map(row=>[row.document_key,row]));
  assert.deepEqual(prepared.get(opKey)?.payload,op);assert.deepEqual(prepared.get(profileKey)?.payload,oldProfile);
  // The genuine native version_admin_document trigger is BEFORE UPDATE only.
  // These INSERTs append no history; preserve every complete preexisting row.
  assert.deepEqual(JSON.parse(await history()),historyBefore,'Fixture INSERTs preserve WHOLE predecessor history');
  const beforeDocuments=await documents(),beforeHistory=await history();
  assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');assert.equal(await quotaWorks(),'t');
  const checkIntermediate=async()=>{
    assert.equal(await catalog(),catalogBefore);assert.equal(await documents(),beforeDocuments);assert.equal(await history(),beforeHistory);
    assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');assert.equal(await quotaWorks(),'t');
    const attempt=async mutations=>JSON.parse(await psql('begin;'+mutations.join('')
      +"set local request.jwt.claim.role='service_role';set local role service_role;"
      +"select jsonb_build_object('oldAllowed',"+activeExpression(oldBinding)+",'nextAllowed',"+activeExpression(nextBinding)+');rollback;'));
    assert.deepEqual(await attempt([putSql(opKey,{...op,status:'INTEGRATED_PENDING'})]),{oldAllowed:false,nextAllowed:false});
    assert.deepEqual(await attempt([putSql(profileKey,{...oldProfile,sourceVersion:requireAssistantAfter598Release(),modelBundleSha256:newBundle}),
      putSql(opKey,{...op,activeModelBinding:nextBinding})]),{oldAllowed:false,nextAllowed:true});
    assert.equal(await documents(),beforeDocuments,'Rollback restores whole598 activation documents');
    assert.equal(await history(),beforeHistory,'Rollback restores WHOLE history, including preexisting rows');
    return {old598ActiveAfterSql:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,nextActiveAfterCompletion:true,
      old598RefusedAfterCompletion:true,wholeHistoryAndDocumentsPreserved:true,quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true};
  };
  return {checkIntermediate,historySql,beforeHistory};
}
async function prepareAssistantAfter599TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile,profile){
  const oldRelease=profile.previousRelease;
  const oldVersion='4.0.'+oldRelease;
  const nextVersion=profile===ASSISTANT_AFTER599_NATIVE_PROFILE?requireAssistantAfter599Release():
    JSON.parse(await fs.readFile(path.join(ROOT,'package.json'),'utf8')).version;
  assert.match(nextVersion,/^4\.0\.[0-9]+$/);
  assert(Number(nextVersion.split('.').at(-1))>oldRelease);
  const admission='public.ravradar_trip_v3_active_binding_admitted';
  const admissionType=admission+'('+Array(11).fill('text').join(',')+',jsonb,boolean,text,text,text,text)';
  const quota='public.consume_public_request_limit(text,text,integer,integer)';
  const archived=await fs.readFile(path.join(ROOT,'supabase/migrations/20260920220000_public_hour_pack_capacity_binding.sql'),'utf8');
  const quotaSource=await fs.readFile(path.join(ROOT,'supabase/migrations/20260826_security_hardening.sql'),'utf8');
  assert.equal(sha(archived),'4ab13e16700801ee38cd6a25cc6fe4adcc87cbe188c5f226a61798bede7b2f9f');
  assert.equal(sha(quotaSource),'b135b8d0fe2a479a50f91e3f3cd70c7cda09362a34eeb2da89236e259edd9283');
  const admissionSql=definition(archived,admission.slice('public.'.length));
  if(await psql('select to_regprocedure('+literal(admissionType)+') is null;')==='t'){
    await psql(admissionSql+'revoke all on function '+admissionType+' from public,anon,authenticated;'
      +'grant execute on function '+admissionType+' to service_role;');
  }
  if(await psql('select to_regprocedure('+literal(quota)+') is null;')==='t'){
    const start=quotaSource.indexOf('create table if not exists public.public_request_limits (');
    const stop=quotaSource.indexOf('create or replace function public.save_ravradar_permissions(');
    assert(start>=0&&stop>start);
    await psql(quotaSource.slice(start,stop));
  }
  for(const signature of [admissionType,quota])assert.equal(await psql('select to_regprocedure('+literal(signature)+') is not null;'),'t');
  const catalog=()=>psql("select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('oid',p.oid,'body',p.prosrc,'acl',p.proacl,'owner',p.proowner,'settings',p.proconfig))::text"
    +' from pg_proc p where p.oid in ('+literal(admissionType)+'::regprocedure,'+literal(quota)+'::regprocedure);');
  const service="set request.jwt.claim.role='service_role';set role service_role;";
  const activeExpression=binding=>admission+'('+['modelId','stateSchemaVersion','variantId','profileId',
    'componentSchemaId','explanationSchemaId','rankingPolicyId','bestTimePolicyId','presentationPolicyId',
    'modelContractSha256','modelBundleSha256'].map(key=>literal(binding[key])).join(',')
    +",'[\"ravscore-history-incomplete\"]'::jsonb,false,'zone-fixture','part-001','zone-fixture','part-001')";
  const active=binding=>psql(service+'select '+activeExpression(binding)+';');
  const quotaWorks=()=>psql(service+"select public.consume_public_request_limit('ravradar-assistant:minute','native-assistant-after"+oldRelease+"-fixture',6,60);");
  const nextBinding={...oldBinding,modelBundleSha256:newBundle};
  assert.equal(oldProfile.modelBundleSha256,oldBinding.modelBundleSha256);assert.equal(oldProfile.sourceVersion,oldVersion);
  const opKey='ravscore-operational-model-activation',profileKey='ravscore-profile-selection';
  const documents=()=>psql('select coalesce(jsonb_agg(to_jsonb(d) order by document_key),\'[]\'::jsonb)::text from admin_documents d where document_key in ('
    +literal(opKey)+','+literal(profileKey)+');');
  // The same bounded whole-row hash/count/byte inventory as normal preservation,
  // excluding ONLY the two fixed keys that this fixture is about to insert.
  const unrelatedSql='with row_fingerprints as materialized (\n'
    +"select 'checkpoint'::text as table_name,octet_length(row_bytes)::bigint as row_bytes,"
    +"encode(extensions.digest(row_bytes,'sha256'),'hex') as row_sha256 "
    +"from (select convert_to(to_jsonb(t)::text,'UTF8') as row_bytes from public.admin_documents t"
    +' where t.document_key not in ('+literal(opKey)+','+literal(profileKey)+')) as whole_rows\n),\n'
    +"table_names(table_name) as (values ('checkpoint')),\n"
    +'inventory as (\n'
    +"select n.table_name,0 as kind,''::text as row_sha256,0::bigint as row_bytes,"
    +'count(f.row_sha256) as row_count,coalesce(sum(f.row_bytes),0) as total_bytes '
    +'from table_names n left join row_fingerprints f using(table_name) group by n.table_name\n'
    +'union all\n'
    +'select table_name,1,row_sha256,row_bytes,count(*),0::numeric '
    +'from row_fingerprints group by table_name,row_sha256,row_bytes\n)\n'
    +'select jsonb_build_array(table_name,kind,row_sha256,row_bytes,row_count,total_bytes)::text '
    +'from inventory order by table_name collate "C",kind,row_sha256 collate "C",row_bytes;';
  const historySql='select coalesce(jsonb_agg(to_jsonb(v) order by to_jsonb(v)::text collate "C"),\'[]\'::jsonb)::text from admin_document_versions v;';
  const history=()=>psql(historySql);
  const operation=binding=>{
    const op=Object.fromEntries(('transitionKind sourceHead datasetId productionReferenceAt rollbackId requestedModelBinding sourceModelBinding '
      +'candidatePlanSha256 candidateFullSha256 privateBundleContentSha256 publicManifestSha256 sourcePublicManifestSha256 requestedPublicManifestSha256 '
      +'sourceDeploymentId deploymentId requestedAt activatedAt failureCode returnPlanSha256 integratedReadinessSha256 integratedPublicAuditSha256 integratedManifestSha256')
      .split(' ').map(key=>[key,null]));
    return Object.assign(op,{schemaVersion:'ravscore-operational-model-activation-v4',status:'INTEGRATED_ACTIVE',
      activeModelBinding:binding,sourceImplementationClosureSha256:'1'.repeat(64),requestedImplementationClosureSha256:'2'.repeat(64),
      automaticActivationAllowed:false,schedulerActivationAllowed:false,calibrationEligible:false});
  };
  const json=value=>{const text=JSON.stringify(value);assert(!text.includes('$after599_trip$'));return '$after599_trip$'+text+'$after599_trip$::jsonb';};
  const putSql=(key,value)=>'update admin_documents set payload='+json(value)+' where document_key='+literal(key)+';';
  const insertSql=(key,value)=>'insert into admin_documents(document_key,payload) values('+literal(key)+','+json(value)+');';
  const original=(await readFixture(psql,profile.oldPrefix+'same')).payload;
  assert.equal(original.modelBinding.modelBundleSha256,profile.before.I);
  assert.equal(original.candidateGRollbackCompanion.modelBinding.modelBundleSha256,profile.before.C);
  assert.equal(original.continuationStateContractSha256,profile.before.T);
  assert.deepEqual(JSON.parse(await documents()),[],'The two native activation fixture keys must be absent');
  const unrelatedBefore=await psql(unrelatedSql);
  const historyBefore=JSON.parse(await history()),bankBefore=await psql(currentMemoryWarmupPreservationInventorySql('original-bank'));
  const accountBefore=await psql(accountRowsSql()),catalogBefore=await catalog(),op=operation(oldBinding);
  await psql('begin;'+insertSql(opKey,op)+insertSql(profileKey,oldProfile)+'commit;');
  assert.equal(await psql(unrelatedSql),unrelatedBefore,'Fixture INSERTs preserve every WHOLE unrelated admin row');
  assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bankBefore);
  assert.equal(await psql(accountRowsSql()),accountBefore);assert.equal(await catalog(),catalogBefore);
  const preparedRows=JSON.parse(await documents());assert.equal(preparedRows.length,2);
  const prepared=new Map(preparedRows.map(row=>[row.document_key,row]));
  assert.deepEqual(prepared.get(opKey)?.payload,op);assert.deepEqual(prepared.get(profileKey)?.payload,oldProfile);
  // The genuine native version_admin_document trigger is BEFORE UPDATE only.
  // These INSERTs append no history; preserve every complete preexisting row.
  assert.deepEqual(JSON.parse(await history()),historyBefore,'Fixture INSERTs preserve WHOLE predecessor history');
  const beforeDocuments=await documents(),beforeHistory=await history();
  assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');assert.equal(await quotaWorks(),'t');
  const checkIntermediate=async()=>{
    assert.equal(await catalog(),catalogBefore);assert.equal(await documents(),beforeDocuments);assert.equal(await history(),beforeHistory);
    assert.equal(await active(oldBinding),'t');assert.equal(await active(nextBinding),'f');assert.equal(await quotaWorks(),'t');
    const attempt=async mutations=>JSON.parse(await psql('begin;'+mutations.join('')
      +"set local request.jwt.claim.role='service_role';set local role service_role;"
      +"select jsonb_build_object('oldAllowed',"+activeExpression(oldBinding)+",'nextAllowed',"+activeExpression(nextBinding)+');rollback;'));
    assert.deepEqual(await attempt([putSql(opKey,{...op,status:'INTEGRATED_PENDING'})]),{oldAllowed:false,nextAllowed:false});
    assert.deepEqual(await attempt([putSql(profileKey,{...oldProfile,sourceVersion:nextVersion,modelBundleSha256:newBundle}),
      putSql(opKey,{...op,activeModelBinding:nextBinding})]),{oldAllowed:false,nextAllowed:true});
    assert.equal(await documents(),beforeDocuments,'Rollback restores the whole predecessor activation documents');
    assert.equal(await history(),beforeHistory,'Rollback restores WHOLE history, including preexisting rows');
    return {['old'+oldRelease+'ActiveAfterSql']:true,nextRefusedBeforeActivation:true,pendingBothRefused:true,nextActiveAfterCompletion:true,
      ['old'+oldRelease+'RefusedAfterCompletion']:true,wholeHistoryAndDocumentsPreserved:true,quotaFunctionAndAdmissionUnchanged:true,quotaServiceRoleWorking:true};
  };
  return {checkIntermediate,historySql,beforeHistory};
}

export async function prepareAssistantAfter598NativeFixtureWindow(options){
  requireAssistantAfter598Output(); // FIRST: even option getters are forbidden while UNISSUED.
  assert.equal(arguments.length,1);
  const {psql,oldBinding,newBundle,oldProfile}=options;
  assert.equal(typeof psql,'function');assert.equal(oldBinding?.modelBundleSha256,ASSISTANT_AFTER598_BEFORE.I);
  assert.equal(newBundle,requireAssistantAfter598Binding().I);
  const window=await prepareAssistantAfter598TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile);
  const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved'),preserved=await psql(preservedSql);
  return Object.freeze({...window,preservedSql,preserved});
}
export async function prepareAssistantAfter599NativeFixtureWindow(options){
  requireAssistantAfter599Output(); // FIRST: even option getters are forbidden while UNISSUED.
  assert.equal(arguments.length,1);
  const {psql,oldBinding,newBundle,oldProfile}=options;
  assert.equal(typeof psql,'function');assert.equal(oldBinding?.modelBundleSha256,ASSISTANT_AFTER599_BEFORE.I);
  assert.equal(newBundle,requireAssistantAfter599Binding().I);
  return prepareAfter599BoundNativeFixtureWindow(psql,oldBinding,newBundle,oldProfile,ASSISTANT_AFTER599_NATIVE_PROFILE);
}

async function prepareAfter599BoundNativeFixtureWindow(psql,oldBinding,newBundle,oldProfile,profile){
  const window=await prepareAssistantAfter599TripAndQuotaWindow(psql,oldBinding,newBundle,oldProfile,profile);
  const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved'),preserved=await psql(preservedSql);
  return Object.freeze({...window,preservedSql,preserved});
}

async function compareFixedSuccessor(profile,options){
  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591||profile===INSTALLED593_ORIGINAL591||profile===SCALAR597_LATER_H0||profile===ASSISTANT_AFTER597_NATIVE_PROFILE||profile===ASSISTANT_AFTER598_NATIVE_PROFILE||profile===ASSISTANT_AFTER599_NATIVE_PROFILE||profile===ASSISTANT_AFTER601_NATIVE_PROFILE,'ASSISTANT_NATIVE_UNKNOWN_PROFILE');
  const OLD=profile.before,DATABASE_BEFORE=profile.databaseBefore??OLD,ALIASES=profile.aliases,
    ORIGINAL_ALIASES=profile.originalAliases??ALIASES,PREFIX=profile.prefix,OLD_PREFIX=profile.oldPrefix;
  let phase='SOURCE';
  try{
    const NEXT=profile.requireBinding(),PINS=profile.requireOutput(); // Before options, programs, files or SQL.
    assert.equal(arguments.length,2);
    const {psql,runSql,root,sourceDocumentAt,atHour,saveCheckpoint}=options;
    for(const fn of [psql,runSql,sourceDocumentAt,atHour,saveCheckpoint])assert.equal(typeof fn,'function');
    const inventory=profile.requiredMigrations();assert.equal(inventory.length,profile.migrationCount);
    assert.equal(inventory.at(-2).version,DATABASE_BEFORE.version);assert.equal(inventory.at(-1).version,NEXT.version);
    const before=await profile.readBefore(),after=await profile.readAfter();
    const migration=profile.migration(),file=path.join(ROOT,'supabase/migrations',migration.filename),stat=await fs.lstat(file);
    assert(stat.isFile()&&!stat.isSymbolicLink());
    const sql=await fs.readFile(file,'utf8');
    assert.equal(sha(sql),PINS.migrationSha256);assert.equal(sha(before.canonicalSource),DATABASE_BEFORE.canonicalSha256);
    assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);assertAssistantLaterH0TransactionBounds(sql);
    const expected={checkpoint:await expectedCheckpointCasContract({sourcePhase:profile.sourcePhase}),
      trip:await expectedTripBindingPolicy({sourcePhase:profile.sourcePhase})};
    assert.equal(expected.checkpoint.sha256,PINS.checkpointContractSha256);assert.equal(expected.trip.sha256,PINS.tripBindingPolicySha256);
    phase='BEFORE_VERSION';assert.equal(await psql('select max(version) from supabase_migrations.schema_migrations;'),DATABASE_BEFORE.version);
    phase='GENUINE'+profile.previousRelease+'_BANK';const originals={};
    for(const[name,hour]of [['same',49],['newer',50]]){
      const {payload}=await readFixture(psql,OLD_PREFIX+name);
      assert.equal(payload.partCount,673);assert.equal(Object.keys(payload.states).length,673);
      assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
      assert.equal(payload.modelBinding.modelBundleSha256,OLD.I);
      assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,OLD.C);
      assert.equal(payload.continuationStateContractSha256,OLD.T);assert.equal(payload.productionReferenceAt,atHour(hour));
      assert.equal(await psql('select public.'+(profile.originalPayloadValidator??CP+'payload_valid')+"((select payload from native_checkpoint_payloads where name='"+OLD_PREFIX+name+"'),'"+atHour(hour)+"');"),'t');
      originals[name]=payload;
    }
    const names=[...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(m=>m[1]);
    const allNames=[...names,...ALIASES.map(row=>row.name)];assert.equal(new Set(allNames).size,names.length+ALIASES.length);
    const contractSource=definition(after.canonicalSource,CP+'contract');
    const validatorArray=/v_validator_oids oid\[\] := array\[([\s\S]+?)\n  \];/.exec(contractSource);assert(validatorArray);
    const checkpointShape=profile===ASSISTANT_AFTER601_NATIVE_PROFILE?deriveCanonicalShape(before,after,ALIASES):
      profile===ASSISTANT_AFTER599_NATIVE_PROFILE?after599CanonicalShape(before,after,ALIASES):profile===ASSISTANT_AFTER598_NATIVE_PROFILE?after598CanonicalShape(before,after,ALIASES):profile===ASSISTANT_AFTER597_NATIVE_PROFILE?after597CanonicalShape(before,after,ALIASES):null;
    assert.equal((validatorArray[1].match(/pg_catalog\.to_regprocedure\(/g)??[]).length,checkpointShape?.oidSlots??profile.oidSlots);
    assert.equal((contractSource.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,checkpointShape?.contractBodies??profile.contractBodies);
    phase='BEFORE_CATALOG';const catalogBefore=JSON.parse(await psql(catalogSql(names)));
    assert.deepEqual(Object.keys(catalogBefore).sort(),[...names].sort());
    for(const name of names)assert.equal(catalogBefore[name].body,sha(body(definition(before.canonicalSource,name))));
    const accountCatalogBefore=await psql(statisticsPreferenceRevisionCatalogQuery);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(accountCatalogBefore))).schemaVersion,2);
    phase='BEFORE_INVENTORY';
    const scalarWindow=profile===SCALAR597_LATER_H0?await prepareScalar597NativeFixtureWindow({
      psql,oldBinding:originals.same.modelBinding,newBundle:NEXT.I,oldProfile:options.originalProfile,
    }):null;
    const after597Window=profile===ASSISTANT_AFTER597_NATIVE_PROFILE?await prepareAssistantAfter597NativeFixtureWindow({
      psql,oldBinding:originals.same.modelBinding,newBundle:NEXT.I,oldProfile:options.originalProfile,
    }):null;
    const after598Window=profile===ASSISTANT_AFTER598_NATIVE_PROFILE?await prepareAssistantAfter598NativeFixtureWindow({
      psql,oldBinding:originals.same.modelBinding,newBundle:NEXT.I,oldProfile:options.originalProfile,
    }):null;
    const after599Window=profile===ASSISTANT_AFTER599_NATIVE_PROFILE?await prepareAssistantAfter599NativeFixtureWindow({
      psql,oldBinding:originals.same.modelBinding,newBundle:NEXT.I,oldProfile:options.originalProfile,
    }):null;
    const after601Window=profile===ASSISTANT_AFTER601_NATIVE_PROFILE?await prepareAfter599BoundNativeFixtureWindow(
      psql,originals.same.modelBinding,NEXT.I,options.originalProfile,profile):null;
    const assistantWindow=after601Window??after599Window??after598Window??after597Window;
    const preservedSql=assistantWindow?.preservedSql??scalarWindow?.preservedSql??currentMemoryWarmupPreservationInventorySql('preserved');
    const preserved=assistantWindow?assistantWindow.preserved:scalarWindow?scalarWindow.preserved:await psql(preservedSql);
    const archivePins=new Map(await Promise.all((await fs.readdir(path.join(ROOT,'supabase/migrations')))
      .filter(name=>name.endsWith('.sql')).map(async name=>[name,sha(await fs.readFile(path.join(ROOT,'supabase/migrations',name)))])));
    const guards=[
      ["delete from supabase_migrations.schema_migrations where version='"+DATABASE_BEFORE.version+"';","insert into supabase_migrations.schema_migrations values('"+DATABASE_BEFORE.version+"');"],
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
    const guardedLedgerVersions=[inventory[0].version,OLD.version];
    if(profile===ASSISTANT_AFTER601_NATIVE_PROFILE)guardedLedgerVersions.push(...AFTER601.installedAppMigrations.slice(0,-1).map(row=>row.version));
    const completeLedgerGuards=guardedLedgerVersions.map(version=>[
      'delete from supabase_migrations.schema_migrations where version='+literal(version)+';',
      'insert into supabase_migrations.schema_migrations values('+literal(version)+');']);
    const selectedGuards=profile===ASSISTANT_AFTER601_NATIVE_PROFILE||profile===ASSISTANT_AFTER599_NATIVE_PROFILE?[...guards,...completeLedgerGuards]
      :profile===SCALAR597_LATER_H0?[guards[0],guards.at(-1)]:guards;
    for(const[index,[drift,restore]]of selectedGuards.entries()){
      phase='GUARD_'+index;await psql(drift);assert.notEqual((await runSql(sql)).code,0);await psql(restore);
      assert.equal(await psql(preservedSql),preserved);assert.deepEqual(JSON.parse(await psql(catalogSql(names))),catalogBefore);
      for(const alias of ALIASES)assert.equal(await psql("select to_regprocedure('public."+alias.name+alias.signature+"') is null;"),'t');
    }
    const checkIntermediate=assistantWindow?.checkIntermediate??scalarWindow?.checkIntermediate??null;
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
    for(const[name,hour]of [['same',49],['newer',50]])assert.equal(await psql('select public.'+ORIGINAL_ALIASES[1].name
      +"((select payload from native_checkpoint_payloads where name='"+OLD_PREFIX+name+"'),'"+atHour(hour)+"');"),'t');
    phase='READBACK';const contract=JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+CP+'contract();'));
    assert.deepEqual(contract.checkpointContract,{id:expected.checkpoint.id,definition:expected.checkpoint.definition});
    assert(Object.values(contract.checks).every(value=>value===true));
    const trip=await psql("select (select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_score_quality_allowed(text,jsonb)'::regprocedure)"
      +"||E'\\n-- calibration-truth-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_calibration_truth_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure)"
      +"||E'\\n-- binding-function --\\n'||(select btrim(prosrc,E' \\r\\n\\t') from pg_proc where oid='public.ravradar_trip_v3_binding_allowed(text,jsonb,boolean,text,text,text,text)'::regprocedure);");
    assert.equal(sha(trip),PINS.tripBindingPolicySha256);
    phase=profile===ASSISTANT_AFTER601_NATIVE_PROFILE?'ASSISTANT_AFTER601_INTERMEDIATE_RUNTIME':
      profile===ASSISTANT_AFTER599_NATIVE_PROFILE?'ASSISTANT_AFTER599_INTERMEDIATE_RUNTIME':profile===ASSISTANT_AFTER598_NATIVE_PROFILE?'ASSISTANT_AFTER598_INTERMEDIATE_RUNTIME':profile===ASSISTANT_AFTER597_NATIVE_PROFILE?'ASSISTANT_AFTER597_INTERMEDIATE_RUNTIME':'SCALAR597_INTERMEDIATE_RUNTIME';
    const intermediateRuntime=checkIntermediate?await checkIntermediate():null;
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
      if(name!=='changed'){
        if(profile===ASSISTANT_AFTER601_NATIVE_PROFILE)AFTER601.assertCheckpointInverse(original,payload,NEXT);
        else if(profile===ASSISTANT_AFTER599_NATIVE_PROFILE)assertAssistantAfter599CheckpointInverse(original,payload,NEXT);
        else if(profile===ASSISTANT_AFTER598_NATIVE_PROFILE)assertAssistantAfter598CheckpointInverse(original,payload,NEXT);
        else if(profile===ASSISTANT_AFTER597_NATIVE_PROFILE)assertAssistantAfter597CheckpointInverse(original,payload,NEXT);
        else if(profile===SCALAR597_LATER_H0)assertScalar597LaterH0CheckpointInverse(original,payload,NEXT);
        else assertWholeMetadataInverse(original,payload,NEXT);
      }
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
    for(const central of profile===SCALAR597_LATER_H0?['account-statistics-assistant-current-same']:
      profile===ASSISTANT_AFTER597_NATIVE_PROFILE?['account-statistics-assistant-current-same','scalar597-original594-same']:
      profile===ASSISTANT_AFTER599_NATIVE_PROFILE?['account-statistics-assistant-current-same','last-mile-584-same','origin-current-same','identity-same','after0600-same','grid-current',...['ffc','249','c1ac'].map(family=>'original-'+family)]:
      profile===ASSISTANT_AFTER598_NATIVE_PROFILE?['account-statistics-assistant-current-same','last-mile-584-same','origin-current-same','identity-same','after0600-same','grid-current',...['ffc','249','c1ac'].map(family=>'original-'+family)]:
      [...profile.olderFixtures,'account-statistics-assistant-current-same','last-mile-584-same','origin-current-same','identity-same','after0600-same',
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
      assert.equal(await psql('select public.'+ORIGINAL_ALIASES[1].name+"((select payload from native_checkpoint_payloads where name='"+name+"'),'"+atHour(49)+"');"),'f');
      cases.push([name,name,PREFIX+'newer',1,'22023',null,1]);
      const incomingName=profile.fixtureStem+'-incoming-invalid-'+kind.toLowerCase();
      await psql("insert into native_checkpoint_payloads select '"+incomingName+"',"+expression+" from native_checkpoint_payloads where name='"+PREFIX+"same';");
      assert.equal(await psql('select public.'+CP+"payload_valid((select payload from native_checkpoint_payloads where name='"+incomingName+"'),'"+atHour(49)+"');"),'f');
      cases.push([incomingName,PREFIX+'same',incomingName,1,'22023',null,1]);
    }
    const bank=await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),account=await psql(accountRowsSql()),reports=[];
    const invokeCas=async(central,incoming,version)=>JSON.parse(await psql(reset(central)
      +"set statement_timeout='55s';set request.jwt.claim.role='service_role';set role service_role;select public.native_checkpoint_attempt(false,"
      +version+",(select payload from native_checkpoint_payloads where name='"+incoming+"'));"));
    let newerCurrentBefore;
    for(const[name,central,incoming,version,code,disposition,storedVersion]of cases){
      phase='CASE_'+name.toUpperCase().replaceAll('-','_');
      const observed=await invokeCas(central,incoming,version);
      assertObserved(observed,code,disposition,storedVersion);
      if(options.scalarWalkSource&&name==='newer-current')newerCurrentBefore=observed;
      reports.push({case:name,sqlstate:code,disposition,storedVersion});
    }
    phase='PRESERVED';assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bank);
    assert.equal(await psql(accountRowsSql()),account);assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalogBefore);
    if(profile===ASSISTANT_AFTER601_NATIVE_PROFILE){
      assert(after601Window);assert.equal(await psql(after601Window.historySql),after601Window.beforeHistory,'WHOLE601 successor history preserved');
    }else if(profile===ASSISTANT_AFTER599_NATIVE_PROFILE){
      assert(after599Window);assert.equal(await psql(after599Window.historySql),after599Window.beforeHistory,'WHOLE599 successor history preserved');
    }else if(profile===ASSISTANT_AFTER598_NATIVE_PROFILE){
      assert(after598Window);assert.equal(await psql(after598Window.historySql),after598Window.beforeHistory,'WHOLE598 successor history preserved');
    }else if(profile===ASSISTANT_AFTER597_NATIVE_PROFILE){
      assert(after597Window);assert.equal(await psql(after597Window.historySql),after597Window.beforeHistory,'WHOLE597→NEXT history preserved');
    }else assert.equal(await psql('select count(*) from admin_document_versions;'),'0');
    assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))),catalogAfter);
    let checkpointScalarWalk,checkpointDistinctPrivacy;
    if(options.scalarWalkSource){
      phase='CHECKPOINT_SCALAR_WALK';
      assert.equal(profile,ASSISTANT_AFTER601_NATIVE_PROFILE);
      assert(newerCurrentBefore&&after601Window);
      const append=CHECKPOINT_SCALAR_WALK_MIGRATION;
      assert.equal(sha(options.scalarWalkSource),append.sha256);
      const beforeAppendLedger=inventory.map(row=>row.version);
      assert.deepEqual(await nativeLedgerRows(psql),beforeAppendLedger);
      const helper=CP+'has_forbidden_key';
      const privacyCases="select array(select public."+helper+"(value) from unnest(array["
        +"null::jsonb,'false','0','\"rawu\"','{\"ok\":[null,\"rawu\",{}]}',"
        +"'[0,{\"L-a_t\":0}]','{\"ok\":[[{\"rawu\":null}]]}']) with ordinality sample(value,ordinal) order by ordinal);";
      assert.equal(await psql(privacyCases),'{f,f,f,f,f,t,t}');
      const checkpointRows="select jsonb_agg(encode(extensions.digest(convert_to(to_jsonb(d)::text,'UTF8'),'sha256'),'hex')"
        +" order by d.document_key)::text from public.admin_documents d;";
      const beforeAppendCheckpoint=await psql(checkpointRows);
      const appendContract=await expectedCheckpointScalarWalkContract();
      await psql(options.scalarWalkSource);
      await psql('insert into supabase_migrations.schema_migrations values('+literal(append.version)+');');
      assert.deepEqual(await nativeLedgerRows(psql),[...beforeAppendLedger,append.version]);
      assert.equal(await psql(checkpointRows),beforeAppendCheckpoint);
      const scalarCatalog=JSON.parse(await psql(catalogSql(allNames)));
      const helperBody=/\n-- forbidden-key-validator --\n([\s\S]+?)\n-- /.exec(appendContract.definition);
      assert(helperBody);
      assert.notEqual(sha(helperBody[1]),catalogAfter[helper].body);
      assert.deepEqual(scalarCatalog,{...catalogAfter,[helper]:{...catalogAfter[helper],body:sha(helperBody[1])}});
      const appendReadback=JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+CP+'contract();'));
      assert.deepEqual(appendReadback,{...contract,checkpointContract:{id:appendContract.id,definition:appendContract.definition}});
      assert.equal(await psql(privacyCases),'{f,f,f,f,f,t,t}');
      const {elapsedMs:beforeMs,...beforeCas}=newerCurrentBefore;
      const {elapsedMs:afterMs,...afterCas}=await invokeCas(PREFIX+'same',PREFIX+'newer',1);
      assert(Number.isFinite(beforeMs)&&Number.isFinite(afterMs));
      assert.deepEqual(afterCas,beforeCas);
      assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bank);
      assert.equal(await psql(accountRowsSql()),account);
      assert.equal(await psql(after601Window.historySql),after601Window.beforeHistory);
      checkpointScalarWalk={migrationVersion:append.version,migrationSha256:append.sha256,
        installedLedgerBeforeRows:beforeAppendLedger.length,installedLedgerAfterRows:beforeAppendLedger.length+1,
        sqlExecuted:true,checkpointContractExact:true,helperOnlyCatalogChange:true,
        priorDataPreserved:true,forbiddenKeysUnchanged:true,normalCasUnchanged:true};

      if(options.distinctPrivacySource){
        phase='CHECKPOINT_DISTINCT_PRIVACY';
        const distinct=CHECKPOINT_DISTINCT_PRIVACY_MIGRATION;
        assert.equal(sha(options.distinctPrivacySource),distinct.sha256);
        const {states,candidateGRollbackCompanion}=current.newer;
        const integratedPartCount=Object.keys(states).length;
        const companionPartCount=Object.keys(candidateGRollbackCompanion.states).length;
        assert.deepEqual([integratedPartCount,companionPartCount],[673,673]);
        const beforeDistinctLedger=[...beforeAppendLedger,append.version];
        assert.deepEqual(await nativeLedgerRows(psql),beforeDistinctLedger);
        const beforeDistinctCheckpoint=await psql(checkpointRows);
        const distinctContract=await expectedCheckpointDistinctPrivacyContract();
        const distinctHelper=/\n-- forbidden-key-validator --\n([\s\S]+?)\n-- /.exec(distinctContract.definition);
        assert(distinctHelper);
        const distinctBody=sha(distinctHelper[1]);
        assert.notEqual(distinctBody,scalarCatalog[helper].body);
        const repeatedKeys="select array[public."+helper+"('[{\"safe\":\"rawu\"},{\"safe\":null}]'::jsonb),public."
          +helper+"('[{\"safe\":[{\"safe\":true},{\"Ra-w_U\":null}]}]'::jsonb)];";
        assert.equal(await psql(repeatedKeys),'{f,t}');

        await psql(options.distinctPrivacySource);
        await psql('insert into supabase_migrations.schema_migrations values('+literal(distinct.version)+');');
        assert.deepEqual(await nativeLedgerRows(psql),[...beforeDistinctLedger,distinct.version]);
        assert.equal(await psql(checkpointRows),beforeDistinctCheckpoint);
        assert.deepEqual(JSON.parse(await psql(catalogSql(allNames))),
          {...scalarCatalog,[helper]:{...scalarCatalog[helper],body:distinctBody}});
        const distinctReadback=JSON.parse(await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+CP+'contract();'));
        assert.deepEqual(distinctReadback,{...appendReadback,checkpointContract:{id:distinctContract.id,definition:distinctContract.definition}});
        assert.equal(await psql(privacyCases),'{f,f,f,f,f,t,t}');
        assert.equal(await psql(repeatedKeys),'{f,t}');
        const {elapsedMs:distinctMs,...distinctCas}=await invokeCas(PREFIX+'same',PREFIX+'newer',1);
        assert(Number.isFinite(distinctMs));
        assert.deepEqual(distinctCas,afterCas);
        assert.equal(await psql(currentMemoryWarmupPreservationInventorySql('original-bank')),bank);
        assert.equal(await psql(accountRowsSql()),account);
        assert.equal(await psql(after601Window.historySql),after601Window.beforeHistory);
        checkpointDistinctPrivacy={migrationVersion:distinct.version,migrationSha256:distinct.sha256,
          installedLedgerBeforeRows:beforeDistinctLedger.length,installedLedgerAfterRows:beforeDistinctLedger.length+1,
          sqlExecuted:true,checkpointContractExact:true,helperOnlyCatalogChange:true,priorDataPreserved:true,
          forbiddenKeysUnchanged:true,normalCasUnchanged:true,integratedPartCount,companionPartCount};
      }
    }
    for(const[file,pin]of archivePins)assert.equal(sha(await fs.readFile(path.join(ROOT,'supabase/migrations',file))),pin);
    return {kind:profile.resultKind,sourceMigrationInventory:profile.migrationCount,sqlExecuted:true,wholeMigrationExecuted:true,
      ...(checkpointScalarWalk?{checkpointScalarWalk}:{}),
      ...(checkpointDistinctPrivacy?{checkpointDistinctPrivacy}:{}),
      ...(profile.databaseBefore?{databaseBeforeVersion:DATABASE_BEFORE.version,originalStateRelease:profile.previousRelease,
        existingOriginalAliasesPreserved:ORIGINAL_ALIASES.length}:{}),
      migrationVersion:migration.version,partCount:673,checkpointOidSlots:checkpointShape?.oidSlots??profile.oidSlots,contractBodies:checkpointShape?.contractBodies??profile.contractBodies,
      oldFunctionsAndOidsPreserved:true,allOriginalDefinitionsPreserved:true,privateAliases:ALIASES.length,
      beforeGuardCases:selectedGuards.length,exactCheckpointContract:true,exactTripContract:true,schema2Catalog:true,
      normalProtectedJsonbRoundtrip:true,originalDigestsPreserved:true,['trueOld'+profile.previousRelease+'Fixtures']:true,currentNormalFixtures:true,
      ['old'+profile.previousRelease+'ModelNotRetagged']:true,wholeMetadataInverse:true,['strictlyLater'+profile.previousRelease+'ToNextOnly']:true,
      productionSeedAuthenticated:false,sqlIsNotOriginAuthentication:true,...(intermediateRuntime?{intermediateRuntime}:{}),reports};
  }catch(error){
    try{console.error(JSON.stringify({kind:profile.failureKind,phase,
      category:error?.code==='ERR_ASSERTION'?'ASSERTION_FAILED':'NATIVE_CALL_FAILED',privatePayloadIncluded:false}));}catch{}
    throw error; // Preserve the actual first failure; no retry or alternate SQL path.
  }
}

export async function compareAssistantPublic590Successor(options){
  return compareFixedSuccessor(PUBLIC590,...arguments);
}

export async function compareAssistantPublic591Successor(options){
  return compareFixedSuccessor(PUBLIC591,...arguments);
}
