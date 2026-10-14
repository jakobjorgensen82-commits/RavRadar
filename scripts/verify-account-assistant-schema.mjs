#!/usr/bin/env node
// Fixed metadata-only installation readback. No account rows or arbitrary SQL.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readAccountAssistantCanonicalSource } from './lib/account-assistant-successor-source.mjs';

const ENDPOINT='https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query';
const FUNCTIONS=Object.freeze(['record_account_activity','get_own_statistics_preference',
  'enable_own_statistics_preference','disable_own_statistics_preference']);
const TABLES=Object.freeze(['account_activity_journal','account_statistics_preferences']);
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
const keys=(value,names)=>value!==null && typeof value==='object' && !Array.isArray(value)
  && Object.keys(value).sort().join('\n')===[...names].sort().join('\n');
function requireMetadata(value) {
  if(!value) throw new Error('ACCOUNT_ASSISTANT_CATALOG_MISMATCH');
}
// Exported solely to the existing native SQL target: exact same fixed query.
export const accountAssistantCatalogQuery=String.raw`
with wanted_tables(name) as (values ('account_activity_journal'),('account_statistics_preferences')),
table_metadata as (
  select wanted.name,jsonb_build_object(
    'present',r.oid is not null,
    'regular',r.relkind='r','rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
    'inheritance',exists(select 1 from pg_catalog.pg_inherits where inhrelid=r.oid or inhparent=r.oid),
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
      'type',t.typname,'builtin',t.typnamespace='pg_catalog'::regnamespace,
      'notNull',a.attnotnull,'default',a.atthasdef,'identity',a.attidentity,
      'generated',a.attgenerated,'dimensions',a.attndims) order by a.attnum)
      from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
      where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped),
    'droppedColumns',(select count(*) from pg_catalog.pg_attribute where attrelid=r.oid and attnum>0 and attisdropped),
    'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid),
    'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='p'
      and conkey=array[1]::smallint[] and convalidated and not condeferrable),
    'profilesCascade',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='f'
      and conkey=array[1]::smallint[] and confrelid='public.profiles'::regclass
      and confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid='public.profiles'::regclass
        and attname='id' and not attisdropped)]::smallint[]
      and confdeltype='c' and confupdtype='a' and confmatchtype='s'
      and convalidated and not condeferrable),
    'activityOrder',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and convalidated and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')
        ='(last_activity_at>=first_observed_at)'),
    'policyCount',(select count(*) from pg_catalog.pg_policy where polrelid=r.oid),
    'userTriggerCount',(select count(*) from pg_catalog.pg_trigger where tgrelid=r.oid and not tgisinternal),
    'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(r.relacl,pg_catalog.acldefault('r',r.relowner))) a
      where a.grantee<>r.relowner and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0))
      or exists(select 1 from pg_catalog.pg_attribute c cross join lateral pg_catalog.aclexplode(c.attacl) a
        where c.attrelid=r.oid and c.attnum>0 and not c.attisdropped and a.grantee<>r.relowner
          and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0)),
    'anonAccess',pg_catalog.has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES'),
    'authenticatedAccess',pg_catalog.has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  ) as metadata
  from wanted_tables wanted
  left join pg_catalog.pg_class r on r.oid=pg_catalog.to_regclass('public.'||wanted.name)
), wanted_functions(name) as (values ('record_account_activity'),('get_own_statistics_preference'),
 ('enable_own_statistics_preference'),('disable_own_statistics_preference')),
function_metadata as (
 select wanted.name,jsonb_build_object(
   'present',p.oid is not null,
   'sameNameCount',(select count(*) from pg_catalog.pg_proc q where q.pronamespace='public'::regnamespace and q.proname=wanted.name),
   'kind',p.prokind,'language',l.lanname,'result',pg_catalog.pg_get_function_result(p.oid),
   'arguments',pg_catalog.pg_get_function_arguments(p.oid),'variadic',p.provariadic<>0,
   'strict',p.proisstrict,'returnsSet',p.proretset,'definer',p.prosecdef,'volatility',p.provolatile,
   'configuration',p.proconfig,
   'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
   'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where a.grantee=0 and a.privilege_type='EXECUTE'),
   'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where (a.grantee<>p.proowner and a.grantee not in
       (select oid from pg_catalog.pg_roles where rolname in ('authenticated','service_role')))
       or (a.is_grantable and a.grantee=(select oid from pg_catalog.pg_roles where rolname='authenticated'))),
   'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 ) as metadata from wanted_functions wanted
 left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure('public.'||wanted.name||'()')
 left join pg_catalog.pg_language l on l.oid=p.prolang
)
select jsonb_build_object('schemaVersion',1,
 'tables',(select jsonb_object_agg(name,metadata) from table_metadata),
 'functions',(select jsonb_object_agg(name,metadata) from function_metadata)) as metadata;
`;

export async function verifyAccountAssistantCatalogMetadata(document) {
  const {accountSource}=await readAccountAssistantCanonicalSource();
  requireMetadata(keys(document,['schemaVersion','tables','functions']) && document.schemaVersion===1
    && keys(document.tables,TABLES) && keys(document.functions,FUNCTIONS));
  for(const name of TABLES) {
    const m=document.tables[name];
    requireMetadata(keys(m,['present','regular','rls','forceRls','inheritance','columns','droppedColumns',
      'constraintCount','primaryKey','profilesCascade','activityOrder','policyCount','userTriggerCount',
      'unexpectedAcl','anonAccess','authenticatedAccess']));
    requireMetadata(m.present===true && m.regular===true && m.rls===true && m.forceRls===false
      && m.inheritance===false && m.droppedColumns===0 && m.primaryKey===1 && m.profilesCascade===1
      && m.policyCount===0 && m.userTriggerCount===0 && m.unexpectedAcl===false
      && m.anonAccess===false && m.authenticatedAccess===false);
    const activity=name==='account_activity_journal';
    requireMetadata(m.constraintCount===(activity?3:2) && m.activityOrder===(activity?1:0));
    const columns=activity?[['user_id','uuid'],['first_observed_at','timestamptz'],['last_activity_at','timestamptz']]
      :[['user_id','uuid'],['enabled','bool']];
    assert.deepEqual(m.columns,columns.map(([column,type],index)=>({
      name:column,position:index+1,type,builtin:true,notNull:true,default:false,
      identity:'',generated:'',dimensions:0,
    })),'ACCOUNT_ASSISTANT_CATALOG_COLUMNS');
  }
  let serviceRpcExecuteCount=0;
  for(const name of FUNCTIONS) {
    const m=document.functions[name];
    requireMetadata(keys(m,['present','sameNameCount','kind','language','result','arguments','variadic',
      'strict','returnsSet','definer','volatility','configuration','bodySha256','publicExecute',
      'unexpectedAcl','anonExecute','authenticatedExecute','serviceExecute']));
    const mark='create function public.'+name+'()';
    requireMetadata(accountSource.split(mark).length===2);
    const start=accountSource.indexOf('as $$',accountSource.indexOf(mark));
    const end=accountSource.indexOf('\n$$;',start);
    requireMetadata(start>0 && end>start);
    requireMetadata(m.present===true && m.sameNameCount===1 && m.kind==='f' && m.language==='plpgsql'
      && m.result==='jsonb' && m.arguments==='' && m.variadic===false && m.strict===false
      && m.returnsSet===false && m.definer===true && m.volatility==='v'
      && Array.isArray(m.configuration) && m.configuration.length===1
      && /^search_path=(?:""|)$/.test(m.configuration[0])
      && m.bodySha256===sha(accountSource.slice(start+5,end).trim())
      && m.publicExecute===false && m.unexpectedAcl===false && m.anonExecute===false
      && m.authenticatedExecute===true && typeof m.serviceExecute==='boolean');
    // SOURCE revokes PUBLIC/anon, but does not revoke pre-existing service_role
    // default EXECUTE. The body's exact role guard still rejects that role.
    if(m.serviceExecute)serviceRpcExecuteCount++;
  }
  return Object.freeze({schemaVersion:1,status:'ACCOUNT_ASSISTANT_SCHEMA_MATCH',
    scope:'FIXED_METADATA_ONLY',tables:2,rpcs:4,rls:true,directClientTableAccess:false,
    serviceRpcExecuteCount,accountRowsRead:false,statisticalProcessingProved:false,
    hostedOwnerFlowProved:false});
}

export async function verifyInstalledAccountAssistantSchema(options) {
  requireMetadata(keys(options,['accessToken']) || keys(options,['accessToken','fetchImpl']));
  const {accessToken,fetchImpl=globalThis.fetch}=options;
  requireMetadata(typeof accessToken==='string' && accessToken.length>0 && !/[\r\n]/.test(accessToken)
    && typeof fetchImpl==='function');
  const controller=new AbortController();
  let rejectDeadline;
  const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
  const timer=setTimeout(()=>{rejectDeadline(new Error('ACCOUNT_ASSISTANT_CATALOG_DEADLINE'));controller.abort();},15000);
  const bounded=promise=>Promise.race([promise,deadline]);
  try {
    const response=await bounded(fetchImpl(ENDPOINT,{method:'POST',redirect:'error',
      cache:'no-store',credentials:'omit',signal:controller.signal,
      headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
      body:JSON.stringify({query:accountAssistantCatalogQuery,read_only:true})}));
    requireMetadata(response.status===201 && !response.redirected && response.body);
    const length=response.headers.get('content-length');
    requireMetadata(length===null || (/^\d+$/.test(length) && Number(length)<=32768));
    const reader=response.body.getReader(),chunks=[];let count=0;
    try {
      while(true){const item=await bounded(reader.read());if(item.done)break;
        requireMetadata(item.value instanceof Uint8Array);
        count+=item.value.byteLength;requireMetadata(count<=32768);chunks.push(item.value);}
    } finally {reader.releaseLock();}
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,count)));
    const rows=Array.isArray(value)?value:keys(value,['result'])?value.result:keys(value,['data'])?value.data:null;
    requireMetadata(Array.isArray(rows) && rows.length===1 && keys(rows[0],['metadata']));
    return await bounded(verifyAccountAssistantCatalogMetadata(rows[0].metadata));
  } finally {clearTimeout(timer);controller.abort();}
}
if(process.argv[1] && fileURLToPath(import.meta.url)===process.argv[1]) {
  try {
    requireMetadata(process.argv.length===2 && process.env.GITHUB_EVENT_NAME==='workflow_dispatch'
      && process.env.GITHUB_REF==='refs/heads/main' && process.env.GITHUB_RUN_ATTEMPT==='1');
    console.log(JSON.stringify(await verifyInstalledAccountAssistantSchema({
      accessToken:process.env.SUPABASE_ACCESS_TOKEN,
    })));
  } catch {
    // Never print response content, raw SQL exception, credentials or user data.
    console.error('ACCOUNT_ASSISTANT_SCHEMA_READBACK_FAILED');process.exitCode=1;
  }
}

// Separate future revision phase: never widen issued schema1 admission.
const REVISION_FUNCTIONS=Object.freeze(['record_account_activity','get_own_statistics_preference',
  'enable_own_statistics_preference','disable_own_statistics_preference','set_own_statistics_preference']);
const REVISED_BODY_SHA256=Object.freeze({
  "get_own_statistics_preference": "77405eb8ad047c59e9352893b91d35041c93fc7b4e4b7e52311612cbbc7b3c02",
  "enable_own_statistics_preference": "2e51ed1903aa8e8e4de40ddccc94a6e05f4f0d34bd8bb21b4e96ed34fd19666b",
  "disable_own_statistics_preference": "b1275e656d398f5b240990bb8a8401c3166c66121189cc205fc5c0154924c4f5",
  "set_own_statistics_preference": "acd4d566a25d0fc251cd52bb58a8edccfb1aa7de02e4f751f69becb95a0e7bf1"
});
async function readStatisticsRevisionPrefix() {
  const {accountSource}=await readAccountAssistantCanonicalSource();
  requireMetadata(sha(accountSource)==='a049bf058cd9fb849d354170f3eee717cb922d1ffea71e31e429a194179feec8');
  return accountSource;
}
export const statisticsPreferenceRevisionCatalogQuery=String.raw`
with wanted_tables(name) as (values ('account_activity_journal'),('account_statistics_preferences')),
table_metadata as (
  select wanted.name,jsonb_build_object(
    'present',r.oid is not null,
    'regular',r.relkind='r','rls',r.relrowsecurity,'forceRls',r.relforcerowsecurity,
    'inheritance',exists(select 1 from pg_catalog.pg_inherits where inhrelid=r.oid or inhparent=r.oid),
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'position',a.attnum,
      'type',t.typname,'builtin',t.typnamespace='pg_catalog'::regnamespace,
      'notNull',a.attnotnull,'default',a.atthasdef,
      'defaultExpression',(select pg_catalog.pg_get_expr(d.adbin,d.adrelid)
        from pg_catalog.pg_attrdef d where d.adrelid=a.attrelid and d.adnum=a.attnum),
      'identity',a.attidentity,
      'generated',a.attgenerated,'dimensions',a.attndims) order by a.attnum)
      from pg_catalog.pg_attribute a join pg_catalog.pg_type t on t.oid=a.atttypid
      where a.attrelid=r.oid and a.attnum>0 and not a.attisdropped),
    'droppedColumns',(select count(*) from pg_catalog.pg_attribute where attrelid=r.oid and attnum>0 and attisdropped),
    'constraintCount',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid),
    'primaryKey',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='p'
      and conkey=array[1]::smallint[] and convalidated and not condeferrable),
    'profilesCascade',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='f'
      and conkey=array[1]::smallint[] and confrelid='public.profiles'::regclass
      and confkey=array[(select attnum from pg_catalog.pg_attribute where attrelid='public.profiles'::regclass
        and attname='id' and not attisdropped)]::smallint[]
      and confdeltype='c' and confupdtype='a' and confmatchtype='s'
      and convalidated and not condeferrable),
    'activityOrder',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and convalidated and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')
        ='(last_activity_at>=first_observed_at)'),
    'revisionNonnegative',(select count(*) from pg_catalog.pg_constraint where conrelid=r.oid and contype='c'
      and conkey=array[3]::smallint[] and convalidated and not condeferrable and not connoinherit
      and regexp_replace(pg_catalog.pg_get_expr(conbin,conrelid),'[[:space:]]','','g')='(revision>=0)'),
    'policyCount',(select count(*) from pg_catalog.pg_policy where polrelid=r.oid),
    'userTriggerCount',(select count(*) from pg_catalog.pg_trigger where tgrelid=r.oid and not tgisinternal),
    'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(r.relacl,pg_catalog.acldefault('r',r.relowner))) a
      where a.grantee<>r.relowner and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0))
      or exists(select 1 from pg_catalog.pg_attribute c cross join lateral pg_catalog.aclexplode(c.attacl) a
        where c.attrelid=r.oid and c.attnum>0 and not c.attisdropped and a.grantee<>r.relowner
          and a.grantee<>coalesce((select oid from pg_catalog.pg_roles where rolname='service_role'),0)),
    'anonAccess',pg_catalog.has_table_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('anon',r.oid,'SELECT,INSERT,UPDATE,REFERENCES'),
    'authenticatedAccess',pg_catalog.has_table_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or pg_catalog.has_any_column_privilege('authenticated',r.oid,'SELECT,INSERT,UPDATE,REFERENCES')
  ) as metadata
  from wanted_tables wanted
  left join pg_catalog.pg_class r on r.oid=pg_catalog.to_regclass('public.'||wanted.name)
), wanted_functions(name,signature) as (values ('record_account_activity',''),('get_own_statistics_preference',''),
 ('enable_own_statistics_preference',''),('disable_own_statistics_preference',''),
 ('set_own_statistics_preference','boolean,bigint')),
function_metadata as (
 select wanted.name,jsonb_build_object(
   'present',p.oid is not null,
   'sameNameCount',(select count(*) from pg_catalog.pg_proc q where q.pronamespace='public'::regnamespace and q.proname=wanted.name),
   'kind',p.prokind,'language',l.lanname,'result',pg_catalog.pg_get_function_result(p.oid),
   'arguments',pg_catalog.pg_get_function_arguments(p.oid),'variadic',p.provariadic<>0,
   'strict',p.proisstrict,'returnsSet',p.proretset,'definer',p.prosecdef,'volatility',p.provolatile,
   'configuration',p.proconfig,
   'bodySha256',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.btrim(p.prosrc,E' \n\r\t'),'UTF8'),'sha256'),'hex'),
   'publicExecute',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where a.grantee=0 and a.privilege_type='EXECUTE'),
   'unexpectedAcl',exists(select 1 from pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     where (a.grantee<>p.proowner and a.grantee not in
       (select oid from pg_catalog.pg_roles where rolname in ('authenticated','service_role')))
       or (a.is_grantable and a.grantee=(select oid from pg_catalog.pg_roles where rolname='authenticated'))),
   'anonExecute',pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticatedExecute',pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'serviceExecute',pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
 ) as metadata from wanted_functions wanted
 left join pg_catalog.pg_proc p on p.oid=pg_catalog.to_regprocedure('public.'||wanted.name||'('||wanted.signature||')')
 left join pg_catalog.pg_language l on l.oid=p.prolang
)
select jsonb_build_object('schemaVersion',2,
 'tables',(select jsonb_object_agg(name,metadata) from table_metadata),
 'functions',(select jsonb_object_agg(name,metadata) from function_metadata)) as metadata;
`;

export async function verifyStatisticsPreferenceRevisionCatalogMetadata(document) {
  const accountSource=await readStatisticsRevisionPrefix();
  requireMetadata(keys(document,['schemaVersion','tables','functions']) && document.schemaVersion===2
    && keys(document.tables,TABLES) && keys(document.functions,REVISION_FUNCTIONS));
  for(const name of TABLES) {
    const m=document.tables[name];
    requireMetadata(keys(m,['present','regular','rls','forceRls','inheritance','columns','droppedColumns',
      'constraintCount','primaryKey','profilesCascade','activityOrder','revisionNonnegative','policyCount','userTriggerCount',
      'unexpectedAcl','anonAccess','authenticatedAccess']));
    requireMetadata(m.present===true && m.regular===true && m.rls===true && m.forceRls===false
      && m.inheritance===false && m.droppedColumns===0 && m.primaryKey===1 && m.profilesCascade===1
      && m.policyCount===0 && m.userTriggerCount===0 && m.unexpectedAcl===false
      && m.anonAccess===false && m.authenticatedAccess===false);
    const activity=name==='account_activity_journal';
    requireMetadata(m.constraintCount===3 && m.activityOrder===(activity?1:0)
      && m.revisionNonnegative===(activity?0:1));
    const columns=activity?[['user_id','uuid'],['first_observed_at','timestamptz'],['last_activity_at','timestamptz']]
      :[['user_id','uuid'],['enabled','bool'],['revision','int8']];
    assert.deepEqual(m.columns,columns.map(([column,type],index)=>({
      name:column,position:index+1,type,builtin:true,notNull:true,default:!activity&&column==='revision',
      defaultExpression:!activity&&column==='revision'?'0':null,identity:'',generated:'',dimensions:0,
    })),'ACCOUNT_ASSISTANT_CATALOG_COLUMNS');
  }
  let serviceRpcExecuteCount=0;
  for(const name of REVISION_FUNCTIONS) {
    const m=document.functions[name];
    requireMetadata(keys(m,['present','sameNameCount','kind','language','result','arguments','variadic',
      'strict','returnsSet','definer','volatility','configuration','bodySha256','publicExecute',
      'unexpectedAcl','anonExecute','authenticatedExecute','serviceExecute']));
    let expectedBodySha=REVISED_BODY_SHA256[name];
    if(!expectedBodySha) {
      const mark='create function public.'+name+'()';
      requireMetadata(accountSource.split(mark).length===2);
      const start=accountSource.indexOf('as $$',accountSource.indexOf(mark));
      const end=accountSource.indexOf('\n$$;',start);
      requireMetadata(start>0 && end>start);
      expectedBodySha=sha(accountSource.slice(start+5,end).trim());
    }
    const expectedArguments=name==='set_own_statistics_preference'?'p_enabled boolean, p_expected_revision bigint':'';
    requireMetadata(m.present===true && m.sameNameCount===1 && m.kind==='f' && m.language==='plpgsql'
      && m.result==='jsonb' && m.arguments===expectedArguments && m.variadic===false && m.strict===false
      && m.returnsSet===false && m.definer===true && m.volatility==='v'
      && Array.isArray(m.configuration) && m.configuration.length===1
      && /^search_path=(?:""|)$/.test(m.configuration[0])
      && m.bodySha256===expectedBodySha
      && m.publicExecute===false && m.unexpectedAcl===false && m.anonExecute===false
      && m.authenticatedExecute===true && typeof m.serviceExecute==='boolean');
    // SOURCE revokes PUBLIC/anon, but does not revoke pre-existing service_role
    // default EXECUTE. The body's exact role guard still rejects that role.
    if(m.serviceExecute)serviceRpcExecuteCount++;
  }
  return Object.freeze({schemaVersion:2,status:'ACCOUNT_STATISTICS_REVISION_SCHEMA_MATCH',
    scope:'FIXED_METADATA_ONLY',tables:2,rpcs:5,rls:true,directClientTableAccess:false,
    serviceRpcExecuteCount,accountRowsRead:false,statisticalProcessingProved:false,
    hostedOwnerFlowProved:false});
}

export async function verifyInstalledStatisticsPreferenceRevisionSchema(options) {
  requireMetadata(keys(options,['accessToken']) || keys(options,['accessToken','fetchImpl']));
  const {accessToken,fetchImpl=globalThis.fetch}=options;
  requireMetadata(typeof accessToken==='string' && accessToken.length>0 && !/[\r\n]/.test(accessToken)
    && typeof fetchImpl==='function');
  const controller=new AbortController();
  let rejectDeadline;
  const deadline=new Promise((_,reject)=>{rejectDeadline=reject;});
  const timer=setTimeout(()=>{rejectDeadline(new Error('ACCOUNT_ASSISTANT_CATALOG_DEADLINE'));controller.abort();},15000);
  const bounded=promise=>Promise.race([promise,deadline]);
  try {
    await bounded(readStatisticsRevisionPrefix());
    const response=await bounded(fetchImpl(ENDPOINT,{method:'POST',redirect:'error',
      cache:'no-store',credentials:'omit',signal:controller.signal,
      headers:{authorization:'Bearer '+accessToken,'content-type':'application/json'},
      body:JSON.stringify({query:statisticsPreferenceRevisionCatalogQuery,read_only:true})}));
    requireMetadata(response.status===201 && !response.redirected && response.body);
    const length=response.headers.get('content-length');
    requireMetadata(length===null || (/^\d+$/.test(length) && Number(length)<=32768));
    const reader=response.body.getReader(),chunks=[];let count=0;
    try {
      while(true){const item=await bounded(reader.read());if(item.done)break;
        requireMetadata(item.value instanceof Uint8Array);
        count+=item.value.byteLength;requireMetadata(count<=32768);chunks.push(item.value);}
    } finally {reader.releaseLock();}
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,count)));
    const rows=Array.isArray(value)?value:keys(value,['result'])?value.result:keys(value,['data'])?value.data:null;
    requireMetadata(Array.isArray(rows) && rows.length===1 && keys(rows[0],['metadata']));
    return await bounded(verifyStatisticsPreferenceRevisionCatalogMetadata(rows[0].metadata));
  } finally {clearTimeout(timer);controller.abort();}
}
