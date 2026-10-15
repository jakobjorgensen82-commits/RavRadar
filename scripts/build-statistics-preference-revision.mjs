#!/usr/bin/env node
// Proposed scripts/build-statistics-preference-revision.mjs. Not executed here.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CURRENT_GRID_MIGRATION,readCurrentGridCanonicalSource} from './lib/current-grid-successor-source.mjs';
import {accountAssistantCatalogQuery,statisticsPreferenceRevisionCatalogQuery}
  from './verify-account-assistant-schema.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MIGRATIONS=path.join(ROOT,'supabase/migrations');
export const STATISTICS_REVISION_MIGRATION=Object.freeze({version:'20261013230000',
  id:'20261013230000_account_statistics_revision',filename:'20261013230000_account_statistics_revision.sql'});
export const STATISTICS_REVISION_PREDECESSOR=CURRENT_GRID_MIGRATION.version;
const INPUT=path.join(ROOT,'scripts/fixtures/statistics-preference-revision-input.json');
const SOURCE_SHA='687532cc1d4998b2f5ec404d99a315234383bea73744614d49df369a61c99458';
const PREFIX_SHA='a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8';
const QUERY1_SHA='dc053223bf4010dbaf96fa6d686e1073b083906d53bb676dca14a2a55f34209b';
const QUERY2_SHA='721ac0938241c1b3d7349e154e78a29e0d94647d67e5885253def69517bb98d1';
const OLD_FUNCTIONS=['record_account_activity','get_own_statistics_preference',
  'enable_own_statistics_preference','disable_own_statistics_preference'];
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
function definition(source,name){
  const matches=[...source.matchAll(new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm'))];
  assert.equal(matches.length,1,'Exactly one fixed function');
  const start=matches[0].index,end=source.indexOf('\n$$;',start);assert(end>start);
  return source.slice(start,end+4);
}
const body=source=>source.slice(source.indexOf('as $$')+5,source.lastIndexOf('$$;')).trim();
function expectedCatalog(accountSource,revisionSource,phase){
  const revision=phase===2,names=revision?[...OLD_FUNCTIONS,'set_own_statistics_preference']:OLD_FUNCTIONS;
  const tables=Object.fromEntries(['account_activity_journal','account_statistics_preferences'].map(name=>{
    const activity=name==='account_activity_journal';
    const columns=activity?[['user_id','uuid'],['first_observed_at','timestamptz'],['last_activity_at','timestamptz']]
      :[['user_id','uuid'],['enabled','bool'],...(revision?[['revision','int8']]:[])];
    return [name,{present:true,regular:true,rls:true,forceRls:false,inheritance:false,
      columns:columns.map(([column,type],index)=>({name:column,position:index+1,type,builtin:true,
        notNull:true,default:revision&&column==='revision',
        ...(revision?{defaultExpression:column==='revision'?'0':null}:{}),identity:'',generated:'',dimensions:0})),
      droppedColumns:0,constraintCount:activity||revision?3:2,primaryKey:1,profilesCascade:1,
      activityOrder:activity?1:0,...(revision?{revisionNonnegative:activity?0:1}:{}),
      policyCount:0,userTriggerCount:0,unexpectedAcl:false,anonAccess:false,authenticatedAccess:false}];
  }));
  const functions=Object.fromEntries(names.map(name=>[name,{present:true,sameNameCount:1,kind:'f',language:'plpgsql',
    result:'jsonb',arguments:name==='set_own_statistics_preference'?'p_enabled boolean, p_expected_revision bigint':'',
    variadic:false,strict:false,returnsSet:false,definer:true,volatility:'v',configuration:['search_path=""'],
    bodySha256:sha(body(definition(revision&&name!=='record_account_activity'?revisionSource:accountSource,name))),
    publicExecute:false,unexpectedAcl:false,anonExecute:false,authenticatedExecute:true,serviceExecute:false}]));
  return {schemaVersion:phase,tables,functions};
}
function catalogGuard(query,expected,label){
  const names=Object.keys(expected.functions);
  assert(query.trimEnd().endsWith(';')&&!query.includes('$statistics_revision$'));
  const json=JSON.stringify(expected);assert(!json.includes('$statistics_expected$'));
  return `  select q.metadata into observed from (${query.trim().slice(0,-1)}) q;
  foreach function_name in array array[${names.map(name=>"'"+name+"'").join(',')}] loop
    if pg_catalog.jsonb_typeof(observed #> array['functions',function_name,'serviceExecute']) is distinct from 'boolean'
      then raise exception 'STATISTICS_REVISION_${label}_SERVICE_SHAPE'; end if;
    -- Preserve genuine213's pre-existing service defaults; the exact body still
    -- rejects service_role. Never normalize unexpectedAcl/PUBLIC/anon/auth.
    observed:=pg_catalog.jsonb_set(observed,array['functions',function_name,'serviceExecute'],'false'::jsonb,false);
    if observed #> array['functions',function_name,'configuration'] = '["search_path="]'::jsonb then
      observed:=pg_catalog.jsonb_set(observed,array['functions',function_name,'configuration'],pg_catalog.jsonb_build_array('search_path=""'),false);
    end if;
  end loop;
  if observed is distinct from $statistics_expected$${json}$statistics_expected$::jsonb
    then raise exception 'STATISTICS_REVISION_${label}_CATALOG_MISMATCH'; end if;`;
}
// Catalogs only: no account rows. Existing function OIDs/owners/ACL, old columns,
// activity body and checkpoint CAS are compared in the SAME transaction.
const PRESERVATION_QUERY=String.raw`select jsonb_build_object(
 'functions',(select jsonb_object_agg(p.proname,jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl))
   from pg_catalog.pg_proc p where p.oid=any(array[
    'public.record_account_activity()'::regprocedure,'public.get_own_statistics_preference()'::regprocedure,
    'public.enable_own_statistics_preference()'::regprocedure,'public.disable_own_statistics_preference()'::regprocedure])),
 'tables',(select jsonb_object_agg(r.relname,jsonb_build_object('oid',r.oid,'owner',r.relowner,'acl',r.relacl,
    'rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,'oldColumnAcl',(select jsonb_agg(jsonb_build_array(a.attnum,a.attacl) order by a.attnum)
       from pg_catalog.pg_attribute a where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped
       and not (r.relname='account_statistics_preferences' and a.attname='revision'))))
   from pg_catalog.pg_class r where r.oid in ('public.account_activity_journal'::regclass,'public.account_statistics_preferences'::regclass)),
 'activity',pg_catalog.pg_get_functiondef('public.record_account_activity()'::regprocedure),
 'checkpoint',(select jsonb_build_object('oid',p.oid,'owner',p.proowner,'acl',p.proacl,'definition',pg_catalog.pg_get_functiondef(p.oid))
   from pg_catalog.pg_proc p where p.oid='public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure)
)`;
export async function buildStatisticsPreferenceRevision({migrationsDirectory=MIGRATIONS}={}){
  const {canonicalSource,accountSource}=await readCurrentGridCanonicalSource({migrationsDirectory});
  assert.equal(sha(canonicalSource),'52da7ec58df834fb879cab25d26d94da355e8eaaf6c24ce0913199ac8181a894');
  assert.equal(sha(accountSource),PREFIX_SHA);
  const input=JSON.parse(await fs.readFile(INPUT,'utf8'));
  assert.deepEqual(Object.keys(input).sort(),['notMigrationTarget','schemaVersion','sha256','source']);
  assert.equal(input.schemaVersion,1);assert.equal(input.notMigrationTarget,true);
  assert.equal(input.sha256,SOURCE_SHA);assert.equal(sha(input.source),SOURCE_SHA);
  assert.equal(sha(accountAssistantCatalogQuery),QUERY1_SHA);
  assert.equal(sha(statisticsPreferenceRevisionCatalogQuery),QUERY2_SHA);
  const revisionSource=input.source;
  const alter='alter table public.account_statistics_preferences\n  add column revision bigint not null default 0 check (revision >= 0);';
  const definitions=['get_own_statistics_preference','set_own_statistics_preference',
    'enable_own_statistics_preference','disable_own_statistics_preference'].map(name=>definition(revisionSource,name));
  const statements=[alter,...definitions,
    'revoke all on function public.set_own_statistics_preference(boolean, bigint) from public, anon, authenticated;',
    'grant execute on function public.set_own_statistics_preference(boolean, bigint) to authenticated;'];
  let remainder=revisionSource;
  for(const statement of statements){assert.equal(remainder.split(statement).length,2);remainder=remainder.replace(statement,'');}
  assert.equal(remainder.replace(/^--.*$/gm,'').replace(/\s+/g,' ').trim(),
    "begin; set local statement_timeout = '55s'; set local lock_timeout = '5s'; commit;",'No unreviewed SQL statements');
  const before=expectedCatalog(accountSource,revisionSource,1),after=expectedCatalog(accountSource,revisionSource,2);
  const commands=statements.map((statement,index)=>{
    const tag='$statistics_ddl_'+index+'$';assert(!statement.includes(tag));return '  execute '+tag+'\n'+statement+'\n'+tag+';';
  });
  const migration=[
    '-- Append-only account preference revision; no statistics/deletion activation or binding change.',
    'begin;',"set local statement_timeout = '55s';","set local lock_timeout = '5s';",
    `do $statistics_revision$
declare observed jsonb; original_catalog jsonb; after_catalog jsonb; function_name text;
begin
  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '${STATISTICS_REVISION_PREDECESSOR}'
    then raise exception 'STATISTICS_REVISION_EXACT_220_PREDECESSOR_REQUIRED'; end if;
  lock table public.account_statistics_preferences, public.account_activity_journal in access exclusive mode;
  if exists(select 1 from pg_catalog.pg_proc where pronamespace='public'::regnamespace and proname='set_own_statistics_preference')
    then raise exception 'STATISTICS_REVISION_DESTINATION_EXISTS'; end if;`,
    catalogGuard(accountAssistantCatalogQuery,before,'BEFORE'),
    '  '+PRESERVATION_QUERY+' into original_catalog;',...commands,
    catalogGuard(statisticsPreferenceRevisionCatalogQuery,after,'AFTER'),
    '  '+PRESERVATION_QUERY+' into after_catalog;',
    `  if after_catalog is distinct from original_catalog then raise exception 'STATISTICS_REVISION_ORIGINAL_CATALOG_CHANGED'; end if;
end;
$statistics_revision$;`,"notify pgrst, 'reload schema';",'commit;',''].join('\n\n').replace(/\n+$/,'\n');
  return Object.freeze({migration,revisionSource,sourceSha256:SOURCE_SHA,accountPrefixSha256:PREFIX_SHA,
    beforeExpected:before,afterExpected:after,migrationSha256:sha(migration)});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);assert(['--write','--check'].includes(process.argv[2]));
  const output=await buildStatisticsPreferenceRevision(),destination=path.join(MIGRATIONS,STATISTICS_REVISION_MIGRATION.filename);
  if(process.argv[2]==='--write'){
    try{const h=await fs.open(destination,'wx');try{await h.writeFile(output.migration,'utf8');await h.sync();}finally{await h.close();}}
    catch(error){if(error?.code!=='EEXIST')throw error;}
  }
  const stat=await fs.lstat(destination);assert(stat.isFile()&&!stat.isSymbolicLink());
  assert.deepEqual(await fs.readFile(destination),Buffer.from(output.migration),'Existing migration must match exactly; never overwrite');
  console.log('Statistics revision source: exact220/schema1 to schema2, unchanged original values and checkpoint; no activation.');
}
