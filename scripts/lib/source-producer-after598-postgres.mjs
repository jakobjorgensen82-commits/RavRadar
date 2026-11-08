// Existing Source19 same-owned-PG schema comparison, ported to the exact
// genuine598 predecessor. It authenticates SQL/catalogue preservation only;
// no B/S snapshot, original admission, action/clock/fullprofile or production.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {SOURCE_PRODUCER_BEFORE as OLD,requireSourceProducerBinding,requireSourceProducerOutput,
  sourceProducerMigration,readSourceProducerCanonicalSource}
  from './source-producer-after597-runtime-family.mjs';
import {SOURCE_PRODUCER_AFTER597_PARENT,requireSourceProducerAfter597CodeParent,
  sourceProducerAfter597PredecessorCompilationLayout} from './source-producer-after597-parent.mjs';
import {assistantLaterH0Definition as definition} from './assistant-later-h0-successor-source.mjs';
import {currentMemoryWarmupPreservationInventorySql} from './current-memory-warmup-postgres.mjs';
import {sourceProducerRequiredMigrations} from '../integrated-cutover-readiness.mjs';
import {verifyStatisticsPreferenceRevisionCatalogMetadata,statisticsPreferenceRevisionCatalogQuery}
  from '../verify-account-assistant-schema.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const body=value=>value.slice(value.indexOf('as $$')+5,value.lastIndexOf('$$;')).trim();
const literal=value=>{assert.equal(typeof value,'string');assert(!value.includes("'"));return "'"+value+"'";};
export function assertSourceProducerAfter598TransactionBounds(sql){
  assert.equal(typeof sql,'string');
  assert.match(sql,/begin;\n\nset local statement_timeout = '55s';\n\nset local lock_timeout = '5s';/);
}
function accountRowsSql() {
  return "with rows as (select 'activity' as t,convert_to(to_jsonb(x)::text,'UTF8') as b from public.account_activity_journal x"
    + " union all select 'preference',convert_to(to_jsonb(x)::text,'UTF8') from public.account_statistics_preferences x)"
    + ", fingerprints as (select t,encode(extensions.digest(b,'sha256'),'hex') as h,octet_length(b) as n from rows)"
    + " select jsonb_build_array(t,h,n,count(*))::text from fingerprints group by t,h,n"
    + " order by t collate \"C\",h collate \"C\",n;";
}
const catalogSql = names => "select jsonb_object_agg(requested.name,jsonb_build_object('properties',to_jsonb(p)-array['prosrc','prosqlbody'],"
  + "'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')))"
  + ' from pg_proc p join pg_namespace n on n.oid=p.pronamespace join (values '
  + names.map(name => '(' + literal(name) + ')').join(',')
  + ") requested(name) on p.proname=requested.name::pg_catalog.name where n.nspname='public';";


export async function compareSourceProducerAfter598Successor(options) {
  const PINS=requireSourceProducerOutput(); // FIRST before caller access or I/O.
  const NEXT=requireSourceProducerBinding();
  assert.equal(arguments.length,1);assert.equal(process.platform,'linux');
  const source=Object.freeze({SOURCE_PRODUCER_PREDECESSOR_RELEASE:SOURCE_PRODUCER_AFTER597_PARENT.release,
    requireSourceProducerCodeParent:requireSourceProducerAfter597CodeParent,SOURCE_PRODUCER_BEFORE:OLD,
    sourceProducerPredecessorContractInventory:sourceProducerAfter597PredecessorCompilationLayout});
  assert.equal(source.SOURCE_PRODUCER_PREDECESSOR_RELEASE,'4.0.598');
  assert.equal(typeof source.requireSourceProducerCodeParent,'function');
  const selected=source.requireSourceProducerCodeParent();
  assert.equal(selected,source.SOURCE_PRODUCER_BEFORE);
  const {psql,runSql}=options;assert.equal(typeof psql,'function');assert.equal(typeof runSql,'function');
  const {withSource598CodeParent}=await import('../check-assistant-later-h0-predecessor-source.mjs');
  assert.equal(typeof withSource598CodeParent,'function');
  return withSource598CodeParent(async genuine598=>{
    const load=relative=>import(pathToFileURL(path.join(genuine598,relative)).href);
    // The fixed normal code callback authenticates actualbd9, not a caller root.
    const family=await load('scripts/lib/assistant-later-h0-successor-source.mjs');
    assert.equal(family.requireAssistantAfter597Release(),'4.0.598');
    const I=(await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
    const C=(await load('scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
    const workflow=await load('scripts/private-production-runtime-workflow.mjs');
    const contracts=await workflow.privateRuntimeContractHashes({repositoryRoot:genuine598});
    const original=family.requireAssistantAfter597Binding(),pins=family.requireAssistantAfter597Output();
    assert.deepEqual({version:original.version,C:original.C,I:original.I,T:original.T,
      canonicalSha256:pins.canonicalSha256,migrationSha256:pins.migrationSha256,
      checkpointContractSha256:pins.checkpointContractSha256,tripBindingPolicySha256:pins.tripBindingPolicySha256},selected);
    assert.equal(I.modelBundleSha256,selected.I);assert.equal(C.modelBundleSha256,selected.C);
    assert.equal(contracts.continuationStateContractSha256,selected.T);
    const readiness=await load('scripts/integrated-cutover-readiness.mjs');
    const baseline=readiness.accountStatisticsAssistantRequiredMigrations();
    const genuine=readiness.assistantAfter597RequiredMigrations();
    const required=sourceProducerRequiredMigrations();
    assert.equal(baseline.length,54);assert.equal(genuine.length,63);assert.equal(required.length,64);
    assert.deepEqual(genuine.slice(0,baseline.length),baseline);
    assert.deepEqual(required.slice(0,-1),genuine);assert.equal(genuine.at(-1).version,selected.version);
    assert.equal(required.at(-1).version,NEXT.version);
    const before=await family.readAssistantAfter597CanonicalSource();
    assert.equal(sha(before.canonicalSource),selected.canonicalSha256);
    assert.equal(typeof source.sourceProducerPredecessorContractInventory,'function');
    source.sourceProducerPredecessorContractInventory(before.canonicalSource);
    const migration=sourceProducerMigration(),file=path.join(ROOT,'supabase/migrations',migration.filename);
    const sql=await fs.readFile(file,'utf8');assert.equal(sha(sql),PINS.migrationSha256);
    assertSourceProducerAfter598TransactionBounds(sql);const after=await readSourceProducerCanonicalSource();
    assert.equal(sha(after.canonicalSource),PINS.canonicalSha256);
    const versions=async()=>JSON.parse(await psql("select coalesce(json_agg(version order by version),'[]'::json) from supabase_migrations.schema_migrations;"));
    const chronological=version=>{assert.match(version,/^[0-9]{8}([0-9]{6})?$/);return version.padEnd(14,'0');};
    const assertVersions=(actual,inventory)=>{
      assert(Array.isArray(actual));const expected=new Set(inventory.map(row=>row.version));
      assert.equal(new Set(actual).size,actual.length);
      for(const version of expected)assert(actual.includes(version),'Missing actual native migration '+version);
      for(const version of actual)assert(expected.has(version)||chronological(version)<chronological(inventory[0].version),
        'Unknown post-cutover migration in same native PG');
      assert.equal([...actual].sort((a,b)=>chronological(a).localeCompare(chronological(b))).at(-1),inventory.at(-1).version);
    };
    assertVersions(await versions(),baseline);
    const preservedSql=currentMemoryWarmupPreservationInventorySql('preserved');
    const preserved=await psql(preservedSql),account=await psql(accountRowsSql());
    const accountCatalog=await psql(statisticsPreferenceRevisionCatalogQuery);
    assert.equal((await verifyStatisticsPreferenceRevisionCatalogMetadata(JSON.parse(accountCatalog))).schemaVersion,2);
    const sqlInputs=[];
    for(const migration of genuine.slice(baseline.length)){
      assert.match(migration.filename,/^[0-9]{14}_[a-z0-9_]+\.sql$/);
      const file=path.join(genuine598,'supabase/migrations',migration.filename),stat=await fs.lstat(file);
      assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1&&stat.size>0);
      const raw=await fs.readFile(file);assert.equal(raw.length,stat.size);
      sqlInputs.push({migration,file,raw,sha256:sha(raw)});
    }
    // Entire existing issued SQL and actual registration, in chronological order.
    // No old585 row, body or model label is rewritten into a598 fixture.
    for(const row of sqlInputs){
      await psql(row.raw.toString('utf8'));
      await psql("insert into supabase_migrations.schema_migrations(version) values('"+row.migration.version+"');");
      assert.deepEqual(await fs.readFile(row.file),row.raw);
    }
    assertVersions(await versions(),genuine);
    const names=[...before.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]);
    const catalog598=JSON.parse(await psql(catalogSql(names)));
    assert.deepEqual(Object.keys(catalog598).sort(),[...names].sort());
    for(const name of names)assert.equal(catalog598[name].body,sha(body(definition(before.canonicalSource,name))));
    const rpcReadback=async(verifier,settings)=>{
      const address='https://source-current-same-pg.invalid',key='NATIVE_TEST_ONLY_NO_REMOTE_SERVICE';let calls=0;
      const signature='public.ravradar_integrated_cutover_contract('+Array(22).fill('text').join(',')+')';
      const fetchImpl=async(input,request)=>{
        assert.equal(typeof input,'string');assert.equal(request.method,'POST');
        const payload=JSON.parse(request.body);assert.equal(Object.getPrototypeOf(payload),Object.prototype);
        let name,args;
        if(calls===0){
          assert.equal(input,address+'/rest/v1/rpc/ravradar_integrated_cutover_contract');
          assert.equal(Object.keys(payload).length,22);
          const actual=JSON.parse(await psql("select to_json(proargnames) from pg_proc where oid='"+signature+"'::regprocedure;"));
          assert.deepEqual([...actual].sort(),Object.keys(payload).sort());
          for(const[field,value]of Object.entries(payload)){assert.match(field,/^p_[a-z0-9_]+$/);assert.equal(typeof value,'string');}
          name='ravradar_integrated_cutover_contract';
          args=Object.entries(payload).map(([field,value])=>field+"=>'"+value.replaceAll("'","''")+"'").join(',');
        }else{
          assert.equal(calls,1);assert.equal(input,address+'/rest/v1/rpc/ravradar_ravscore_checkpoint_contract');
          assert.deepEqual(payload,{});name='ravradar_ravscore_checkpoint_contract';args='';
        }
        const text=await psql("set request.jwt.claim.role='service_role';set role service_role;select public."+name+'('+args+')::text;');
        JSON.parse(text);calls++;return new Response(text,{status:200,headers:{'content-type':'application/json'}});
      };
      await verifier({...settings,url:address,serviceRoleKey:key,fetchImpl});assert.equal(calls,2);return calls;
    };
    // The normal GENUINE598 verifier derives all22 fields and actually executes
    // both real contracts on THIS PG. No authored metadata or READY response.
    await rpcReadback(readiness.verifyIntegratedDatabaseReadback,{
      sourcePhase:'assistant-mixed-after597-successor',modelBinding:I,candidateModelBinding:C});
    await psql(sql);await psql("insert into supabase_migrations.schema_migrations(version) values('"+migration.version+"');");
    assert.notEqual((await runSql(sql)).code,0,'No replay after installed version');
    assertVersions(await versions(),required);
    const allNames=[...after.canonicalSource.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]);
    const catalogAfter=JSON.parse(await psql(catalogSql(allNames)));
    assert.deepEqual(Object.keys(catalogAfter).sort(),[...allNames].sort());
    for(const name of allNames){
      assert.equal(catalogAfter[name].body,sha(body(definition(after.canonicalSource,name))));
      if(catalog598[name])assert.deepEqual(catalogAfter[name].properties,catalog598[name].properties);
    }
    const currentReadiness=await import('../integrated-cutover-readiness.mjs');
    await rpcReadback(currentReadiness.verifyIntegratedDatabaseReadback,{sourcePhase:'source-producer-after597'});
    assert.equal(await psql(preservedSql),preserved);assert.equal(await psql(accountRowsSql()),account);
    assert.equal(await psql(statisticsPreferenceRevisionCatalogQuery),accountCatalog);
    for(const row of sqlInputs)assert.deepEqual(await fs.readFile(row.file),row.raw);
    assert.equal(sha(await fs.readFile(file)),PINS.migrationSha256);
    return Object.freeze({kind:'SOURCE_CURRENT598_SAME_PG_SCHEMA_PREPARED',sourceMigrationInventory:64,
      genuine598MigrationInventory:63,genuine598IntegratedRpcParameters:22,genuine598ActualRpcCalls:2,
      sourceActualRpcCalls:2,sameNativePg:true,normalVerifiers:true,old585RowsPreserved:true,
      originalSqlBytesPreserved:true,metadataAuthored:false,sourceNativeActionQualified:false,
      originalBAndSAuthenticated:false,productionProof:false});
  });
}
