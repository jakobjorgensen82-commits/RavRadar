// Reuse existing protected admin_documents; fixed key, INSERT only, no raw output.
import {buildSupabaseAdminHeaders} from './supabase-admin-rest.mjs';
import {schemaTokens} from '../prepare-cloudflare-trip-storage.mjs';
import {assertPrivateNoisyProposal} from '../../cloudflare/trip-gateway/trip-aggregate-dp.js';
import {assertClosedAggregatePeriod} from '../../supabase/functions/_shared/trip-aggregate-contract.js';
import {canonicalJson,sha256Hex} from '../../supabase/functions/_shared/trip-storage.js';
const PROJECT='afqhhdrkjfjtpadntdzo',BASE='https://'+PROJECT+'.supabase.co';
const fail=code=>{throw new Error(code);};
// Fixed management READ ONLY query: catalogue/ACL/function definitions, never accounts.
export const PRIVATE_STUDY_ADMIN_ACCESS_SQL=`select jsonb_build_object(
 'rls',c.relrowsecurity,'ownerRestricted',c.relowner not in(select oid from pg_roles where rolname in('anon','authenticated')),
 'anonSelect',has_table_privilege('anon','public.admin_documents','SELECT'),
 'authenticatedSelect',has_table_privilege('authenticated','public.admin_documents','SELECT'),
 'unsafeRoles',exists(select 1 from pg_roles where rolname in('anon','authenticated') and(rolsuper or rolbypassrls)),
 'publicSelect',exists(select 1 from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where a.grantee=0 and a.privilege_type='SELECT'),
 'policies',(select jsonb_agg(jsonb_build_object('name',policyname,'permissive',permissive,'roles',roles,'command',cmd,'qual',qual) order by policyname)
   from pg_policies where schemaname='public' and tablename='admin_documents' and cmd in('ALL','SELECT')),
 'functions',(select jsonb_agg(jsonb_build_object('name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'result',pg_get_function_result(p.oid),'language',l.lanname,'securityDefiner',p.prosecdef,'strict',p.proisstrict,
   'volatility',p.provolatile,'settings',p.proconfig,'source',p.prosrc) order by p.proname)
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
   where n.nspname='public' and p.proname in('is_ravradar_owner','has_ravradar_permission','ravradar_document_permission'))
) as metadata from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname='admin_documents' and c.relkind='r'`;
const OWNER=`select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and is_active=true);`;
const PERMISSION=`select exists(select 1 from public.profiles where id=auth.uid() and role='owner' and is_active)
or exists(select 1 from public.user_permissions up join public.profiles p on p.id=up.user_id where up.user_id=auth.uid() and p.is_active and up.permission_key='full_admin' and up.enabled)
or exists(select 1 from public.user_permissions up join public.profiles p on p.id=up.user_id where up.user_id=auth.uid() and p.is_active and up.permission_key=p_key and up.enabled);`;
const DOCUMENT=`select case when p_document_key in ('handbook','rdks-documentation-center') then 'handbook_view'
when p_document_key in ('rules','rule-history') then 'rules_view'
when p_document_key in ('water-level-station-routing','direction-reviews','zone-overrides','dmi-station-registry','coastline-overrides') then 'zones_view'
when p_document_key like 'diagnostic-%' or p_document_key in ('diagnostics-settings','runtime-diagnostics','weather-health','dmi-water-stations','water-station-routing-audit','ocean-diagnostics','cache-audit','implementation-audit') then 'diagnostics_view' else 'full_admin' end;`;
export const PRIVATE_STUDY_ADMIN_FUNCTIONS=Object.freeze([
 {name:'has_ravradar_permission',arguments:'p_key text',result:'boolean',language:'sql',securityDefiner:true,strict:false,volatility:'s',settings:['search_path=public'],source:PERMISSION},
 {name:'is_ravradar_owner',arguments:'',result:'boolean',language:'sql',securityDefiner:true,strict:false,volatility:'s',settings:['search_path=public','row_security=off'],source:OWNER},
 {name:'ravradar_document_permission',arguments:'p_document_key text',result:'text',language:'sql',securityDefiner:false,strict:false,volatility:'i',settings:null,source:DOCUMENT},
]);
const qualTokens=text=>{
  if(typeof text!=='string'||text.length>4096)fail('PRIVATE_STUDY_ACCESS_UNVERIFIED');
  const tokens=JSON.parse(schemaTokens(text));
  return JSON.stringify(tokens.filter((token,i)=>token!=='('&&token!==')'&&!(token==='public'&&tokens[i+1]==='.')
    &&!(token==='.'&&tokens[i-1]==='public')&&!(token===':'&&(tokens[i-1]===':'||tokens[i+1]===':'))
    &&!(token==='text'&&tokens[i-1]===':'&&tokens[i-2]===':')));
};
const READ_QUAL="public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_permission(document_key))";
// The two actually issued normal bootstrap definitions; never arbitrary matching.
const ORIGINAL_PERMISSION={...PRIVATE_STUDY_ADMIN_FUNCTIONS[0],settings:['search_path=public','row_security=off'],
  source:"select public.is_ravradar_owner() or exists(select 1 from public.user_permissions p join public.profiles pr on pr.id=p.user_id where p.user_id=auth.uid() and p.permission_key=p_key and p.enabled=true and pr.is_active=true);"};
export function assertPrivateStudyAdminAccess(rows){
  if(!Array.isArray(rows)||rows.length!==1||!rows[0]||Object.keys(rows[0]).join(',')!=='metadata')fail('PRIVATE_STUDY_ACCESS_UNVERIFIED');
  const value=rows[0].metadata;
  if(!value||Object.keys(value).sort().join(',')!=='anonSelect,authenticatedSelect,functions,ownerRestricted,policies,publicSelect,rls,unsafeRoles'
    ||value.rls!==true||value.ownerRestricted!==true||value.anonSelect!==false||value.authenticatedSelect!==true
    ||value.publicSelect!==false||value.unsafeRoles!==false||!Array.isArray(value.policies)||value.policies.length!==2
    ||!Array.isArray(value.functions)||value.functions.length!==3)fail('PRIVATE_STUDY_ACCESS_UNVERIFIED');
  const expected=[['ravradar_admin_documents_read','PERMISSIVE',READ_QUAL],
    ['ravradar_ravscore_checkpoint_no_direct_read','RESTRICTIVE',"document_key <> 'ravscore-continuation-checkpoint'"]];
  for(let i=0;i<2;i++){
    const item=value.policies[i],[name,permissive,qual]=expected[i];
    if(!item||Object.keys(item).sort().join(',')!=='command,name,permissive,qual,roles'||item.name!==name||item.command!=='SELECT'
      ||item.permissive!==permissive||canonicalJson(item.roles)!=='["authenticated"]'||qualTokens(item.qual)!==qualTokens(qual))fail('PRIVATE_STUDY_ACCESS_UNVERIFIED');
  }
  for(let i=0;i<3;i++){
    const item=value.functions[i],expected=PRIVATE_STUDY_ADMIN_FUNCTIONS[i];
    if(!item||Object.keys(item).sort().join(',')!==Object.keys(expected).sort().join(','))fail('PRIVATE_STUDY_ACCESS_UNVERIFIED');
    const matches=source=>Object.keys(source).every(key=>key==='source'?schemaTokens(item[key])===schemaTokens(source[key])
      :canonicalJson(item[key])===canonicalJson(source[key]));
    if(!matches(expected)&&!(i===0&&matches(ORIGINAL_PERMISSION)))fail('PRIVATE_STUDY_ACCESS_UNVERIFIED');
  }
  return true;
}
async function boundedJson(url,init,fetchImpl,maximum=32768){
  const controller=new AbortController();let reader;const timer=setTimeout(()=>controller.abort(),15000);
  try{return await Promise.race([(async()=>{
    const response=await fetchImpl(url,{...init,redirect:'error',cache:'no-store',credentials:'omit',signal:controller.signal});
    if(response.redirected||!response.ok)fail('PRIVATE_STUDY_TRANSPORT_REJECTED');
    reader=response.body?.getReader();if(!reader){if(response.status===201||response.status===204)return null;fail('PRIVATE_STUDY_TRANSPORT_INVALID');}let total=0;const chunks=[];
    for(;;){const part=await reader.read();if(part.done)break;if((total+=part.value.byteLength)>maximum)fail('PRIVATE_STUDY_TRANSPORT_BOUND');chunks.push(part.value);}
    const text=Buffer.concat(chunks).toString('utf8');return text?JSON.parse(text):null;
  })(),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('PRIVATE_STUDY_TRANSPORT_TIMEOUT')),{once:true}))]);}
  finally{clearTimeout(timer);controller.abort();try{void reader?.cancel().catch(()=>{});}catch{}}
}
export async function publishPrivateTripStudyAdmin(report,{serviceRoleKey,accessToken,fetchImpl=fetch}={}){
  await assertPrivateNoisyProposal(report);const period=assertClosedAggregatePeriod(report.period);
  if(typeof serviceRoleKey!=='string'||serviceRoleKey.length<32
    ||typeof accessToken!=='string'||accessToken.length<20||typeof fetchImpl!=='function')fail('PRIVATE_STUDY_CONFIGURATION');
  // Actual fixed READ-only catalogue gate BEFORE any document destination access/write.
  const access=await boundedJson('https://api.supabase.com/v1/projects/'+PROJECT+'/database/query',{
    method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify({query:PRIVATE_STUDY_ADMIN_ACCESS_SQL})},fetchImpl);
  assertPrivateStudyAdminAccess(access);
  const key='trip-weather-study-'+period.start.slice(0,7),headers=buildSupabaseAdminHeaders(serviceRoleKey);
  const endpoint=BASE+'/rest/v1/admin_documents',suffix='?select=document_key,payload,version&document_key=eq.'+key+'&limit=1';
  const expected=canonicalJson(report),digest=await sha256Hex(expected);
  const read=async()=>{
    const rows=await boundedJson(endpoint+suffix,{method:'GET',headers},fetchImpl);
    if(!Array.isArray(rows)||rows.length>1)fail('PRIVATE_STUDY_DOCUMENT_INVALID');
    if(!rows.length)return false;const row=rows[0];
    if(!row||Object.keys(row).sort().join(',')!=='document_key,payload,version'||row.document_key!==key
      ||!Number.isSafeInteger(row.version)||row.version<1)fail('PRIVATE_STUDY_DOCUMENT_INVALID');
    await assertPrivateNoisyProposal(row.payload);
    if(canonicalJson(row.payload)!==expected||await sha256Hex(canonicalJson(row.payload))!==digest)fail('PRIVATE_STUDY_DOCUMENT_CONFLICT');
    return true;
  };
  const replay=await read();
  if(!replay){
    // No upsert, update, delete, generic key or automatic POST retry.
    try{await boundedJson(endpoint,{method:'POST',headers:{...headers,Prefer:'return=minimal'},
      body:JSON.stringify({document_key:key,payload:report,updated_by:null})},fetchImpl);}
    catch{fail('PRIVATE_STUDY_DOCUMENT_WRITE_OUTCOME_UNKNOWN');}
    if(!await read())fail('PRIVATE_STUDY_DOCUMENT_WRITE_OUTCOME_UNKNOWN');
  }
  return{kind:'PRIVATE_STUDY_ADMIN_BLOB_VERIFIED',documentKey:key,sha256:digest,bytes:Buffer.byteLength(expected),replay};
}
