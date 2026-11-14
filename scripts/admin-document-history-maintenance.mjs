import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createSupabaseAdminRequester} from './lib/supabase-admin-rest.mjs';
import {createR2PrivateReadDenialStorage} from './lib/r2-private-read-denial-storage.mjs';
import {PRIVATE_STUDY_ADMIN_ACCESS_SQL,assertPrivateStudyAdminAccess} from './lib/private-trip-study-admin-transport.mjs';

export const ADMIN_HISTORY_POLICY=Object.freeze({
  keys:Object.freeze(['rdks-documentation-center','handbook','handbook-source-baseline']),
  keep:5,locatorKey:'admin-document-history-archive-locator',project:'https://afqhhdrkjfjtpadntdzo.supabase.co',
  preparedKey:'admin-document-history-prepared-generation',
  unresolvedKey:'admin-document-history-unresolved-preparation',
  bucket:'ravradar-admin-history-archive',weatherBucket:'ravradar-private-production-runtime',
  maximumBucketBytes:2_000_000_000,maximumObjectBytes:50_000_000,
  maximumRowBytes:32_000_000,maximumChunkRawBytes:16_000_000,
  maximumRowsPerKey:1_000,maximumPruneRows:600,maximumOperationMs:20*60_000,
  maximumAdminDecodedBytes:2_000_000_000,maximumArchiveRawBytes:2_000_000_000,
});
// Only an explicit, qualified transition enables this rule. Existing V2
// originals are legacy; ten NEW versions per exact key may subsequently expire.
const RETENTION=Object.freeze({keepNew:10,reserveBytes:100_000_000,maximumGenerationBytes:500_000_000,
  maximumInventoryObjects:10_000,maximumInventoryBytes:20_000_000,maximumPointerBytes:1024,
  maximumPreparationBytes:4_000_000,maximumPreparationRawBytes:8_000_000,maximumCompletedMetadata:200});
const PRIVACY_STAGES=Object.freeze(["NOT_STARTED","CATALOGUE_REQUEST","HTTP_STATUS","RESPONSE_JSON","RESPONSE_FIELDS","SERVICE_ROLE_ACCESS","CURRENT_METADATA","HISTORY_POLICY_NAMES","HISTORY_METADATA","VERIFIED"]);
const P=ADMIN_HISTORY_POLICY,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
// The already-used privacy catalogue query is preserved as the inner query.
// Only fixed service-role ACL metadata is added; never arbitrary SQL or row content.
const HISTORY_ACCESS_SQL=`with existing_privacy as (${PRIVATE_STUDY_ADMIN_ACCESS_SQL.trim().replace(/;$/, '')}),
existing_history_privacy as (${PRIVATE_STUDY_ADMIN_ACCESS_SQL.trim().replace(/;$/, '').replaceAll('admin_documents','admin_document_versions')})
select existing_privacy.metadata,existing_history_privacy.metadata as version_metadata,
 (has_table_privilege('service_role','public.admin_documents','SELECT') and
  has_table_privilege('service_role','public.admin_documents','INSERT') and
  has_table_privilege('service_role','public.admin_documents','UPDATE')) as current_access,
 (has_table_privilege('service_role','public.admin_document_versions','SELECT') and
  has_table_privilege('service_role','public.admin_document_versions','INSERT') and
  has_table_privilege('service_role','public.admin_document_versions','DELETE')) as history_access,
 (has_table_privilege('service_role','public.admin_documents','SELECT') and
  has_table_privilege('service_role','public.admin_documents','INSERT') and
  has_table_privilege('service_role','public.admin_documents','DELETE')) as prepared_access
from existing_privacy,existing_history_privacy`;
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'
  ?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const encode=v=>Buffer.from(JSON.stringify(stable(v)),'utf8');
const same=(a,b)=>encode(a).equals(encode(b));
const fail=code=>{const e=new Error(code);e.code=code;throw e;};
const need=(v,c)=>{if(!v)fail(c);};
const fields=(o,keys,c)=>need(o&&typeof o==='object'&&!Array.isArray(o)
  &&same(Object.keys(o).sort(),[...keys].sort()),c);
const positive=v=>Number.isSafeInteger(v)&&v>0;
const hash=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const allowed=k=>P.keys.includes(k);
const preparationKey=k=>[P.preparedKey,P.unresolvedKey].includes(k);
const meta=r=>({id:r.id,document_key:r.document_key,version:r.version,created_at:r.created_at});
function checkMeta(r){
  fields(r,['id','document_key','version','created_at'],'HISTORY_METADATA_FIELDS');
  need(positive(r.id)&&positive(r.version)&&allowed(r.document_key)
    &&typeof r.created_at==='string'&&Number.isFinite(Date.parse(r.created_at)),'HISTORY_METADATA_INVALID');return r;
}
function checkRow(r){
  fields(r,['id','document_key','version','created_at','created_by','payload'],'HISTORY_FULL_FIELDS');checkMeta(meta(r));
  need(r.payload!==null&&typeof r.payload==='object'&&!Array.isArray(r.payload),'HISTORY_PAYLOAD_INVALID');
  need(r.created_by===null||(typeof r.created_by==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.created_by)),'HISTORY_AUTHOR_INVALID');return r;
}
const params=o=>'?'+new URLSearchParams(o).toString();
const objectPath=d=>'bundles/sha256/'+d+'.json.gz';
async function privateDirectory(value){
  need(typeof value==='string'&&path.isAbsolute(value),'PRIVATE_DIRECTORY_REQUIRED');
  const root=path.resolve(value),temp=path.resolve(process.env.RUNNER_TEMP||os.tmpdir());
  need(root.startsWith(temp+path.sep),'PRIVATE_TEMP_DIRECTORY_REQUIRED');
  await fs.mkdir(root,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  for(let at=root;;at=path.dirname(at)){
    const s=await fs.lstat(at);need(s.isDirectory()&&!s.isSymbolicLink(),'PRIVATE_DIRECTORY_LINK');
    if(at===path.dirname(at))break;
  }
  return root;
}
async function writePrivate(root,name,value){
  need(/^[a-z][a-z0-9-]*\.json$/.test(name),'PRIVATE_NAME');
  await fs.writeFile(path.join(root,name),encode(value),{flag:'wx',mode:0o600});
}
async function readPrivate(root,name){
  const file=path.join(root,name),s=await fs.lstat(file);
  need(s.isFile()&&!s.isSymbolicLink()&&s.size>0&&s.size<=2_000_000,'PRIVATE_INPUT_BOUND');
  return JSON.parse(await fs.readFile(file,'utf8'));
}
function checkDraft(d){
  fields(d,['kind','core','digest'],'DRAFT_FIELDS');need(d.kind==='ADMIN_HISTORY_DRAFT_V1'&&hash(d.digest)
    &&sha(encode(d.core))===d.digest,'DRAFT_DIGEST');
  fields(d.core,['project','keys','keep','guards','kept','candidates'],'DRAFT_CORE_FIELDS');
  need(d.core.project===P.project&&same(d.core.keys,P.keys)&&d.core.keep===P.keep,'EXACT_THREE_KEYS');
  need(Array.isArray(d.core.kept)&&Array.isArray(d.core.candidates)&&Array.isArray(d.core.guards)&&d.core.guards.length===3,'DRAFT_ARRAYS');
  need(d.core.guards.every((g,i)=>{fields(g,['document_key','version','updated_at'],'DRAFT_GUARD_FIELDS');return g.document_key===P.keys[i]&&positive(g.version)&&typeof g.updated_at==='string'&&Number.isFinite(Date.parse(g.updated_at));}),'DRAFT_GUARD_INVALID');
  need(d.core.candidates.length<=P.maximumRowsPerKey*3,'DRAFT_ROW_BOUND');
  const seen=new Set();for(const r of [...d.core.kept,...d.core.candidates]){
    checkMeta(r);need(!seen.has(r.id),'DUPLICATE_ID');seen.add(r.id);
  }
  need(P.keys.every(k=>d.core.kept.filter(r=>r.document_key===k).length===P.keep),'KEEP_FIVE_REQUIRED');
  return d;
}
function clients({env,fetchImpl,resolveUnknownWrites=false}){
  need(env.SUPABASE_URL?.replace(/\/$/,'')===P.project&&typeof env.SUPABASE_SERVICE_ROLE_KEY==='string'
    &&env.SUPABASE_SERVICE_ROLE_KEY.length>0,'EXACT_PROJECT_AND_EXISTING_SERVICE_ROLE_REQUIRED');
  const state={puts:new Set(),deletes:new Set(),unknownWrite:false,started:Date.now(),wireWrites:0,pendingMutation:null,guardFailure:null,adminDecodedBytes:0,declaredAdminContentLengthBytes:0,adminResponses:0,r2ReadBytes:0,privacyHttpStatus:null,privacyStage:'NOT_STARTED'};
  let exactResponse=null,exactCurrentResponse=null; // At most one exact response of each kind.
  const metadataUrl='https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query';
  const endpoint=P.project+'/rest/v1/',r2Host=String(env.RAVRADAR_R2_ACCOUNT_ID)+'.eu.r2.cloudflarestorage.com';
  const guardedFetch=async(url,options={})=>{
    if(state.guardFailure)fail(state.guardFailure);
    need(Date.now()-state.started<P.maximumOperationMs,'OPERATION_DEADLINE');
    const u=new URL(url),method=String(options.method||'GET').toUpperCase();
    const db=u.origin===P.project&&['/rest/v1/admin_documents','/rest/v1/admin_document_versions'].includes(u.pathname);
    const management=u.href===metadataUrl&&method==='POST'&&options.body===JSON.stringify({query:HISTORY_ACCESS_SQL});
    const r2=u.protocol==='https:'&&u.hostname===r2Host&&(u.pathname==='/'+P.bucket||u.pathname.startsWith('/'+P.bucket+'/'));
    need(db||r2||management,'NETWORK_SURFACE');
    need(['GET','HEAD','PUT','POST','PATCH','DELETE'].includes(method),'NETWORK_METHOD');
    need(!(db&&['PUT','HEAD'].includes(method)),'WRITE_SURFACE');
    if(r2&&method==='DELETE')need(u.search===''&&new Headers(options.headers).has('authorization')
      &&state.retirementPaths?.has(u.pathname.slice(P.bucket.length+2)),'RETENTION_EXACT_PATH');
    if(db&&method==='DELETE'&&u.pathname==='/rest/v1/admin_documents'){
      const q=u.searchParams;need(state.preparedDelete&&preparationKey(state.preparedDelete.document_key)
        &&q.get('document_key')==='eq.'+state.preparedDelete.document_key&&q.get('version')==='eq.1'
        &&q.get('payload')==='eq.'+encode(state.preparedDelete.payload).toString('utf8')
        &&[...q.keys()].sort().join(',')==='document_key,payload,version','PREPARATION_EXACT_DELETE');
    }else if(db&&method==='DELETE'&&u.searchParams.get('document_key')==='eq.'+P.locatorKey){
      const expected=state.expiringLocatorRow,q=u.searchParams;
      need(u.pathname==='/rest/v1/admin_document_versions'&&expected&&q.get('id')==='eq.'+expected.id
        &&q.get('version')==='eq.'+expected.version&&q.get('payload')==='eq.'+encode(expected.payload).toString('utf8')
        &&[...q.keys()].sort().join(',')==='document_key,id,payload,version','LOCATOR_EXPIRY_EXACT_DELETE');
    }else if(db&&method==='DELETE'){
      need(u.pathname==='/rest/v1/admin_document_versions','CURRENT_DOCUMENT_WRITE_FORBIDDEN');
      const q=u.searchParams;need([...q.keys()].sort().join(',')==='document_key,id,version'
        &&allowed(q.get('document_key')?.slice(3))&&q.get('document_key')?.startsWith('eq.')
        &&/^eq\.[1-9][0-9]*$/.test(q.get('id')||'')&&/^eq\.[1-9][0-9]*$/.test(q.get('version')||''),'EXACT_DELETE_FILTER');
    }
    if(db&&['POST','PATCH'].includes(method)){
      need(u.pathname==='/rest/v1/admin_documents','LOCATOR_WRITE_ONLY');const q=u.searchParams,b=JSON.parse(options.body);
      if(method==='POST'){fields(b,['document_key','payload','updated_by'],'LOCATOR_INSERT_FIELDS');need((b.document_key===P.locatorKey||preparationKey(b.document_key))&&q.get('on_conflict')==='document_key','LOCATOR_INSERT_KEY');
        if(preparationKey(b.document_key))checkPreparationPayload(b.payload,b.document_key);else checkLocator(b.payload);}
      else{fields(b,['payload','updated_by'],'LOCATOR_PATCH_FIELDS');need(q.get('document_key')==='eq.'+P.locatorKey&&/^eq\.[1-9][0-9]*$/.test(q.get('version')||''),'LOCATOR_CAS_FILTER');}
      need(b.updated_by===null,'LOCATOR_AUTHOR');if(method==='PATCH')checkLocator(b.payload);
    }
    const mutation=!management&&['PUT','DELETE','POST','PATCH'].includes(method);
    if(mutation){
      const set=method==='PUT'?state.puts:state.deletes;
      if(state.unknownWrite||set.has(u.href)){state.unknownWrite=true;fail('WRITE_OUTCOME_UNKNOWN');}
      set.add(u.href);state.wireWrites++;state.pendingMutation={method,url:u.href,body:options.body};
    }
    try{
      const response=await fetchImpl(u.href,{...options,signal:AbortSignal.timeout(30_000),redirect:'manual'});
      if(mutation&&[429,500,502,503,504].includes(response.status))state.unknownWrite=true;
      if(db||management){
        state.adminResponses++;const declared=response.headers.get('content-length');
        if(declared!==null){need(/^[0-9]+$/.test(declared)&&Number.isSafeInteger(Number(declared)),'ADMIN_CONTENT_LENGTH');
          state.declaredAdminContentLengthBytes+=Number(declared);need(Number(declared)<=P.maximumRowBytes,'ADMIN_RESPONSE_BOUND');}
        const parts=[];let bytes=0;
        for await(const b of response.body||[]){bytes+=b.length;state.adminDecodedBytes+=b.length;need(bytes<=P.maximumRowBytes,'ADMIN_RESPONSE_BOUND');need(state.adminDecodedBytes<=P.maximumAdminDecodedBytes,'ADMIN_OPERATION_BYTE_BUDGET');parts.push(b);}
        const raw=Buffer.concat(parts);
        if(db&&method==='GET'&&u.pathname==='/rest/v1/admin_document_versions'&&u.searchParams.get('select')==='*')
          exactResponse=response.status===200?{url:u.href,raw}:null;
        if(db&&method==='GET'&&u.pathname==='/rest/v1/admin_documents'&&u.searchParams.get('select')==='*')
          exactCurrentResponse=response.status===200?{url:u.href,raw}:null;
        return new Response([204,205,304].includes(response.status)?null:raw,{status:response.status,headers:response.headers});
      }
      const anonymousRange=r2&&method==='GET'&&u.search===''
        &&new RegExp('^/'+P.bucket+'/bundles/sha256/[0-9a-f]{64}\\.json\\.gz$').test(u.pathname)
        &&!new Headers(options.headers).has('authorization')&&new Headers(options.headers).get('range')==='bytes=0-0';
      if(anonymousRange)return response; // Typed adapter owns the error bound and non-400 cancellation.
      if(state.inventory&&r2&&method==='GET'&&u.pathname==='/'+P.bucket&&u.searchParams.get('list-type')==='2'){
        const parts=[];let bytes=0;for await(const b of response.body||[]){bytes+=b.length;state.r2ReadBytes+=b.length;
          need(bytes<=2_000_000&&state.r2ReadBytes<=P.maximumBucketBytes,'R2_READ_OPERATION_BOUND');parts.push(b);}
        const body=Buffer.concat(parts);state.inventory.listBytes+=body.length;
        need(state.inventory.listBytes<=RETENTION.maximumInventoryBytes,'RETENTION_LIST_BYTES');
        if(response.status===200)collectRetentionListing(state.inventory,body);
        return new Response(body,{status:response.status,headers:response.headers});
      }
      if(method==='GET'&&response.body){const body=response.body.pipeThrough(new TransformStream({transform(chunk,controller){state.r2ReadBytes+=chunk.length;if(state.r2ReadBytes>P.maximumBucketBytes){state.guardFailure='R2_READ_OPERATION_BOUND';fail(state.guardFailure);}controller.enqueue(chunk);}}));return new Response(body,{status:response.status,headers:response.headers});}
      return response;
    }catch(error){if(mutation)state.unknownWrite=true;
      if(['ADMIN_RESPONSE_BOUND','ADMIN_CONTENT_LENGTH','ADMIN_OPERATION_BYTE_BUDGET'].includes(error.code))state.guardFailure=error.code;throw error;}
  };
  const current=createSupabaseAdminRequester({endpoint:endpoint+'admin_documents',key:env.SUPABASE_SERVICE_ROLE_KEY,
    fetchImpl:guardedFetch,logger:()=>{}});
  const versions=createSupabaseAdminRequester({endpoint:endpoint+'admin_document_versions',key:env.SUPABASE_SERVICE_ROLE_KEY,
    fetchImpl:guardedFetch,logger:()=>{}});
  const exactVersions=async suffix=>{
    exactResponse=null;
    try{const rows=await versions(suffix);need(exactResponse?.url===endpoint+'admin_document_versions'+suffix,'RAW_ROW_RESPONSE_REQUIRED');
      return{rows,raw:exactResponse.raw};
    }finally{exactResponse=null;}
  };
  const exactCurrent=async key=>{exactCurrentResponse=null;const suffix=params({document_key:'eq.'+key,select:'*',limit:'2'});
    try{const rows=await current(suffix);need(exactCurrentResponse?.url===endpoint+'admin_documents'+suffix,'RAW_CURRENT_RESPONSE_REQUIRED');
      return{rows,raw:exactCurrentResponse.raw};}finally{exactCurrentResponse=null;}};
  // Unknown writes are never repeated. The automatic pass may only classify the last
  // request through authenticated reads; even a verified outcome stops all further writes.
  const resolveUnknown=async()=>{
    const pending=state.pendingMutation;if(!pending)return 'UNRESOLVED';
    try{
      const u=new URL(pending.url);
      if(u.origin===P.project){
        await privacy();
        if(pending.method==='DELETE'&&u.pathname==='/rest/v1/admin_documents'){
          const key=u.searchParams.get('document_key')?.slice(3);need(preparationKey(key),'PREPARATION_RECORD_IDENTITY');
          const row=await preparationRecord({current,state},key),prefix=key===P.unresolvedKey?'EXACT_UNRESOLVED_PREPARATION':'EXACT_PREPARATION';
          if(!row)return prefix+'_ABSENT';
          need('eq.'+encode(row.payload).toString('utf8')===u.searchParams.get('payload'),'PREPARATION_RECORD_CHANGED');return prefix+'_STILL_PRESENT';
        }
        if(pending.method==='DELETE'&&u.searchParams.get('document_key')==='eq.'+P.locatorKey){
          const expected=state.expiringLocatorRow;need(expected,'LOCATOR_EXPIRY_IDENTITY');
          const found=await locatorHistoryRecord({exactVersions},state.expiringLocatorEntry);
          if(!found)return 'EXACT_LOCATOR_HISTORY_ABSENT';need(same(found.row,expected),'LOCATOR_EXPIRY_ROW_CHANGED');return 'EXACT_LOCATOR_HISTORY_STILL_PRESENT';
        }
        if(pending.method==='DELETE'){
          const q=new URLSearchParams(u.search);q.set('select','*');q.set('limit','2');
          const found=await exactVersions('?'+q.toString());
          need(Array.isArray(found.rows)&&found.rows.length<=1,'EXACT_ROW_AMBIGUOUS');
          if(!found.rows.length)return 'EXACT_ROW_ABSENT';
          const row=checkRow(found.rows[0]);
          need(u.searchParams.get('id')==='eq.'+row.id&&u.searchParams.get('document_key')==='eq.'+row.document_key
            &&u.searchParams.get('version')==='eq.'+row.version,'EXACT_ROW_CHANGED');
          return 'EXACT_ROW_STILL_PRESENT';
        }
        if(['POST','PATCH'].includes(pending.method)){
          const body=JSON.parse(pending.body),key=preparationKey(body.document_key)?body.document_key:P.locatorKey,
            rows=await current(params({document_key:'eq.'+key,select:'document_key,payload,version',limit:'2'}));
          need(Array.isArray(rows)&&rows.length<=1,'LOCATOR_ROW_INVALID');
          const prefix=key===P.unresolvedKey?'UNRESOLVED_PREPARATION_POINTER':key===P.preparedKey?'PREPARATION_POINTER':'LOCATOR';
          if(!rows.length)return prefix+'_ABSENT';
          const row=rows[0];fields(row,['document_key','payload','version'],'LOCATOR_ROW_FIELDS');
          need(row.document_key===key&&positive(row.version),'LOCATOR_ROW_INVALID');if(preparationKey(key))checkPreparationPayload(row.payload,key);else checkLocator(row.payload);
          return same(row.payload,body.payload)?(key===P.locatorKey?'LOCATOR_PAYLOAD_PRESENT_VERIFIED':prefix+'_PRESENT_VERIFIED'):'UNRESOLVED';
        }
      }else if(pending.method==='DELETE'&&state.retirementPaths?.has(u.pathname.slice(P.bucket.length+2))){
        const inventory=await retentionInventory({r2,state});
        return inventory.objects.has(u.pathname.slice(P.bucket.length+2))?'EXACT_ARCHIVE_STILL_PRESENT':'EXACT_ARCHIVE_ABSENT';
      }else if(pending.method==='PUT'){
        const match=u.pathname.match(new RegExp('^/'+P.bucket+'/(bundles/sha256/([a-f0-9]{64})\\.json\\.gz)$'));
        need(match,'ARCHIVE_OBJECT_DESCRIPTOR');
        const expected=Buffer.from(pending.body),storage=r2();
        const actual=await verifiedObject(storage,{path:match[1],sha256:match[2],bytes:expected.length});
        need(actual.equals(expected),'ARCHIVE_READBACK');return 'IMMUTABLE_ARCHIVE_OBJECT_PRESENT_VERIFIED';
      }
    }catch{}
    return 'UNRESOLVED';
  };
  const withPrivacy=error=>Object.assign(error,{privacyHttpStatus:state.privacyHttpStatus,privacyStage:state.privacyStage});
  const safe=async fn=>{try{return await fn();}catch(e){if(state.unknownWrite){const resolution=resolveUnknownWrites?await resolveUnknown():'NOT_REQUESTED';
    const code=resolution==='UNRESOLVED'||resolution==='NOT_REQUESTED'?'WRITE_OUTCOME_UNKNOWN':'WRITE_OUTCOME_RESOLVED_STOPPED';
    const error=new Error(code);error.code=code;error.safeOperation={putPaths:[...state.puts].map(u=>new URL(u).pathname),deleteOrLocatorRequests:[...state.deletes].map(u=>({path:new URL(u).pathname,query:new URL(u).search})),adminDecodedReadBytes:state.adminDecodedBytes,r2ReadBytes:state.r2ReadBytes,writeOutcome:resolution,resolutionReadOnly:true,furtherWritesPerformed:false};throw withPrivacy(error);}if(state.guardFailure)throw withPrivacy(Object.assign(new Error(state.guardFailure),{code:state.guardFailure}));
    if(typeof e.code==='string'&&/^[A-Z_]+$/.test(e.code))throw withPrivacy(e);throw withPrivacy(Object.assign(new Error('ADMIN_OR_ARCHIVE_OPERATION_FAILED'),{code:'ADMIN_OR_ARCHIVE_OPERATION_FAILED'}));}};
  const r2=()=>createR2PrivateReadDenialStorage({accountId:env.RAVRADAR_R2_ACCOUNT_ID,
    accessKeyId:env.RAVRADAR_R2_ACCESS_KEY_ID,secretAccessKey:env.RAVRADAR_R2_SECRET_ACCESS_KEY,
    bucketId:P.bucket,maximumObjectBytes:P.maximumObjectBytes,bucketCeilingBytes:P.maximumBucketBytes,
    fetchImpl:guardedFetch});
  const privacy=async()=>{
    state.privacyHttpStatus=null;state.privacyStage='CATALOGUE_REQUEST';
    need(typeof env.SUPABASE_ACCESS_TOKEN==='string'&&env.SUPABASE_ACCESS_TOKEN.length>=20,'EXISTING_CATALOGUE_READ_TOKEN_REQUIRED');
    const response=await guardedFetch(metadataUrl,{method:'POST',headers:{Authorization:'Bearer '+env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query:HISTORY_ACCESS_SQL})});
    state.privacyHttpStatus=response.status;state.privacyStage='HTTP_STATUS';
    need(response.status===200||response.status===201,'LOCATOR_PRIVACY_UNVERIFIED');
    try{state.privacyStage='RESPONSE_JSON';const rows=await response.json();need(Array.isArray(rows)&&rows.length===1,'LOCATOR_PRIVACY_UNVERIFIED');
      state.privacyStage='RESPONSE_FIELDS';fields(rows[0],['metadata','version_metadata','current_access','history_access','prepared_access'],'LOCATOR_PRIVACY_FIELDS');
      state.privacyStage='SERVICE_ROLE_ACCESS';need(rows[0].current_access===true&&rows[0].history_access===true,'SERVICE_ROLE_HISTORY_ACCESS_UNVERIFIED');
      need(typeof rows[0].prepared_access==='boolean','PREPARATION_ACCESS_UNVERIFIED');state.preparedAccess=rows[0].prepared_access;
      state.privacyStage='CURRENT_METADATA';assertPrivateStudyAdminAccess([{metadata:rows[0].metadata}]);
      state.privacyStage='HISTORY_POLICY_NAMES';const version=rows[0].version_metadata;need(Array.isArray(version?.policies)&&version.policies.length===2,'LOCATOR_PRIVACY_UNVERIFIED');
      const aliases={'ravradar_admin_document_versions_read':'ravradar_admin_documents_read','ravradar_ravscore_checkpoint_versions_no_direct_read':'ravradar_ravscore_checkpoint_no_direct_read'};
      need(version.policies.every(p=>Object.hasOwn(aliases,p.name)),'LOCATOR_PRIVACY_UNVERIFIED');
      state.privacyStage='HISTORY_METADATA';assertPrivateStudyAdminAccess([{metadata:{...version,policies:version.policies.map(p=>({...p,name:aliases[p.name]}))}}]);
      state.privacyStage='VERIFIED';
    }catch(e){if(e.code==='SERVICE_ROLE_HISTORY_ACCESS_UNVERIFIED')throw e;fail('LOCATOR_PRIVACY_UNVERIFIED');}
  };
  return{current,versions,exactVersions,exactCurrent,r2,safe,state,privacy};
}
async function currentGuards(c){
  const out=[];for(const key of P.keys){
    const rows=await c.current(params({document_key:'eq.'+key,select:'document_key,version,updated_at',limit:'2'}));
    need(Array.isArray(rows)&&rows.length===1,'CURRENT_DOCUMENT_REQUIRED');const r=rows[0];
    fields(r,['document_key','version','updated_at'],'CURRENT_GUARD_FIELDS');
    need(r.document_key===key&&positive(r.version)&&typeof r.updated_at==='string'&&Number.isFinite(Date.parse(r.updated_at)),'CURRENT_GUARD_INVALID');out.push(r);
  }return out;
}
async function historyMetadata(c,key,{topOnly=false}={}){
  const all=[];for(let page=0;page<10;page++){
    const rows=await c.versions(params({document_key:'eq.'+key,select:'id,document_key,version,created_at',order:'version.desc,id.desc',limit:topOnly?'5':'100',offset:String(page*100)}));
    need(Array.isArray(rows)&&rows.length<=(topOnly?5:100),'HISTORY_PAGE_BOUND');
    for(const r of rows){checkMeta(r);need(r.document_key===key,'HISTORY_KEY_MISMATCH');all.push(r);}
    if(topOnly||rows.length<100)return all;
  }fail('HISTORY_INVENTORY_BOUND');
}
async function buildDraft(c){
  const guards=await currentGuards(c),kept=[],candidates=[],seen=new Set();
  for(const key of P.keys){
    const rows=await historyMetadata(c,key);need(rows.length>=P.keep,'KEEP_FIVE_REQUIRED');
    for(let i=0;i<rows.length;i++){
      const r=rows[i];need(!seen.has(r.id),'DUPLICATE_ID');seen.add(r.id);
      if(i)need(rows[i-1].version>r.version||(rows[i-1].version===r.version&&rows[i-1].id>r.id),'HISTORY_ORDER');
      (i<P.keep?kept:candidates).push(r);
    }
  }
  need(same(guards,await currentGuards(c)),'CURRENT_DOCUMENT_CHANGED');
  candidates.sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id-b.id);
  const core={project:P.project,keys:P.keys,keep:P.keep,guards,kept,candidates};
  return checkDraft({kind:'ADMIN_HISTORY_DRAFT_V1',core,digest:sha(encode(core))});
}
async function protect(c,d){
  need(same(d.core.guards,await currentGuards(c)),'CURRENT_DOCUMENT_CHANGED');
  for(const key of P.keys)need(same(d.core.kept.filter(r=>r.document_key===key),await historyMetadata(c,key,{topOnly:true})),'TOP_FIVE_CHANGED');
}
async function exactRow(c,m){
  const {rows,raw}=await c.exactVersions(params({id:'eq.'+m.id,document_key:'eq.'+m.document_key,version:'eq.'+m.version,select:'*',limit:'2'}));
  need(Array.isArray(rows)&&rows.length<=1,'EXACT_ROW_AMBIGUOUS');
  if(!rows.length)return null;const r=checkRow(rows[0]);need(same(meta(r),m),'EXACT_ROW_CHANGED');
  // JSON parsing above validates identity/shape only. Payload originals are NEVER reserialized.
  return{row:r,raw};
}
async function verifiedObject(storage,descriptor){
  need(hash(descriptor.sha256)&&descriptor.path===objectPath(descriptor.sha256)&&positive(descriptor.bytes)
    &&descriptor.bytes<=P.maximumObjectBytes,'ARCHIVE_OBJECT_DESCRIPTOR');
  const b=await storage.download(descriptor.path);need(Buffer.isBuffer(b)&&b.length===descriptor.bytes&&sha(b)===descriptor.sha256,'ARCHIVE_OBJECT_SHA');
  const denial=await storage.anonymousReadDenial(descriptor.path);
  if(!denial.denied)throw Object.assign(new Error('ARCHIVE_NOT_PRIVATE'),{code:'ARCHIVE_NOT_PRIVATE',httpStatus:denial.httpStatus});return b;
}
async function storeObject(storage,bytes){
  const descriptor={path:objectPath(sha(bytes)),sha256:sha(bytes),bytes:bytes.length};
  need(bytes.length>0&&bytes.length<=P.maximumObjectBytes,'ARCHIVE_OBJECT_BOUND');
  await storage.uploadImmutable(descriptor.path,bytes);need((await verifiedObject(storage,descriptor)).equals(bytes),'ARCHIVE_READBACK');return descriptor;
}
// Internal automatic selection only: the normal complete inventory supplies all
// current/top5 guards and deterministically orders the eligible metadata rows.
function automaticBatchDraft(full){
  const checked=checkDraft(full),core={...checked.core,candidates:checked.core.candidates.slice(0,25)};
  return checkDraft({kind:'ADMIN_HISTORY_DRAFT_V1',core,digest:sha(encode(core))});
}
async function archive(c,d,automaticBatch=false){
  // The private automatic admission is still equality against a FRESH normal full
  // inventory, followed by the one fixed oldest25 projection; no caller subset.
  const fresh=await buildDraft(c);
  need(same(d,automaticBatch?automaticBatchDraft(fresh):fresh),'DRAFT_CHANGED');const storage=c.r2();await storage.ensurePrivateBucket();
  const chunks=[];let parts=[],entries=[],bytes=0,totalRaw=0;
  const flush=async()=>{
    if(!entries.length)return;const raw=Buffer.concat(parts),compressed=gzipSync(raw,{level:9,mtime:0});
    chunks.push({...await storeObject(storage,compressed),rawBytes:raw.length,rawSha256:sha(raw),rows:entries});parts=[];entries=[];bytes=0;
  };
  for(const m of d.core.candidates){
    const row=await exactRow(c,m);need(row,'ARCHIVE_SOURCE_ROW_MISSING');
    const line=Buffer.concat([encode({kind:'ADMIN_HISTORY_REST_RESPONSE_V2',rawBase64:row.raw.toString('base64')}),Buffer.from('\n')]);
    totalRaw+=line.length;need(totalRaw<=P.maximumArchiveRawBytes,'ARCHIVE_TOTAL_RAW_BOUND');
    need(line.length<=P.maximumChunkRawBytes,'ARCHIVE_ROW_BOUND');if(bytes+line.length>P.maximumChunkRawBytes)await flush();
    parts.push(line);bytes+=line.length;entries.push({...m,rowBytes:row.raw.length,rowSha256:sha(row.raw)});
  }
  await flush();await protect(c,d);
  const index={kind:'ADMIN_HISTORY_ARCHIVE_INDEX_V2',bucket:P.bucket,draft:d,chunks};
  const raw=encode(index);need(raw.length<=2_000_000,'ARCHIVE_INDEX_BOUND');
  const manifest={kind:'ADMIN_HISTORY_MANIFEST_V2',index:await storeObject(storage,gzipSync(raw,{level:9,mtime:0})),indexRawBytes:raw.length,indexRawSha256:sha(raw)};
  await restore(c,manifest);return manifest;
}
async function restore(c,manifest,onChunk=null){
  if(manifest?.kind==='ADMIN_HISTORY_MANIFEST_V3')return restoreRetention(c,manifest,onChunk);
  fields(manifest,['kind','index','indexRawBytes','indexRawSha256'],'MANIFEST_FIELDS');
  need(manifest.kind==='ADMIN_HISTORY_MANIFEST_V2'&&positive(manifest.indexRawBytes)&&manifest.indexRawBytes<=2_000_000&&hash(manifest.indexRawSha256),'MANIFEST_INVALID');
  fields(manifest.index,['path','sha256','bytes'],'MANIFEST_OBJECT_FIELDS');
  const storage=c.r2();await storage.ensurePrivateBucket();const gz=await verifiedObject(storage,manifest.index);
  const raw=gunzipSync(gz,{maxOutputLength:2_000_000});need(raw.length===manifest.indexRawBytes&&sha(raw)===manifest.indexRawSha256,'ARCHIVE_INDEX_SHA');
  const index=JSON.parse(raw.toString('utf8'));fields(index,['kind','bucket','draft','chunks'],'INDEX_FIELDS');
  need(index.kind==='ADMIN_HISTORY_ARCHIVE_INDEX_V2'&&index.bucket===P.bucket&&Array.isArray(index.chunks)&&index.chunks.length<=1_000,'INDEX_INVALID');
  need(index.chunks.reduce((n,c)=>n+(Number.isSafeInteger(c.rawBytes)?c.rawBytes:P.maximumArchiveRawBytes+1),0)<=P.maximumArchiveRawBytes,'ARCHIVE_TOTAL_RAW_BOUND');
  const d=checkDraft(index.draft),wanted=new Map(d.core.candidates.map(m=>[m.id,m])),rows=new Map();
  for(const chunk of index.chunks){
    fields(chunk,['path','sha256','bytes','rawBytes','rawSha256','rows'],'CHUNK_FIELDS');
    need(positive(chunk.rawBytes)&&chunk.rawBytes<=P.maximumChunkRawBytes&&hash(chunk.rawSha256)&&Array.isArray(chunk.rows),'CHUNK_INVALID');
    const compressed=await verifiedObject(storage,chunk);
    const bytes=gunzipSync(compressed,{maxOutputLength:P.maximumChunkRawBytes});
    need(bytes.length===chunk.rawBytes&&sha(bytes)===chunk.rawSha256,'CHUNK_RAW_SHA');
    const text=bytes.toString('utf8');need(text.endsWith('\n'),'ROW_TERMINATOR');const lines=text.slice(0,-1).split('\n');
    need(lines.length===chunk.rows.length,'ROW_REFERENCE_COUNT');
    for(let i=0;i<lines.length;i++){
      const record=JSON.parse(lines[i]),entry=chunk.rows[i];
      fields(record,['kind','rawBase64'],'ROW_ENCODING_FIELDS');
      need(record.kind==='ADMIN_HISTORY_REST_RESPONSE_V2'&&typeof record.rawBase64==='string'
        &&record.rawBase64.length>0&&record.rawBase64.length<=4*Math.ceil(P.maximumRowBytes/3),'ROW_ENCODING_BOUND');
      const original=Buffer.from(record.rawBase64,'base64');
      need(original.length<=P.maximumRowBytes&&original.toString('base64')===record.rawBase64,'ROW_ENCODING_INVALID');
      const full=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original));
      need(Array.isArray(full)&&full.length===1,'ROW_RESPONSE_COUNT');const row=checkRow(full[0]);
      fields(entry,['id','document_key','version','created_at','rowBytes','rowSha256'],'ROW_REFERENCE_FIELDS');
      need(wanted.has(row.id)&&!rows.has(row.id)&&same(meta(row),wanted.get(row.id))&&same(meta(row),meta(entry))
        &&positive(entry.rowBytes)&&original.length===entry.rowBytes&&hash(entry.rowSha256)&&sha(original)===entry.rowSha256,'ROW_ROUNDTRIP');
      rows.set(row.id,{...meta(row),rowBytes:entry.rowBytes,rowSha256:entry.rowSha256});
    }
    if(onChunk)await onChunk(chunk,compressed);
  }
  need(rows.size===wanted.size,'COMPLETE_ARCHIVE_REQUIRED');return{draft:d,rows};
}
function checkLocator(p){
  fields(p,['kind','bucket','indexPath','indexSha256','indexBytes','indexRawBytes','indexRawSha256','draftDigest'],'LOCATOR_FIELDS');
  need(['ADMIN_HISTORY_ARCHIVE_LOCATOR_V2','ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'].includes(p.kind)&&p.bucket===P.bucket&&hash(p.indexSha256)
    &&p.indexPath===objectPath(p.indexSha256)&&positive(p.indexBytes)&&p.indexBytes<=P.maximumObjectBytes
    &&positive(p.indexRawBytes)&&p.indexRawBytes<=2_000_000&&hash(p.indexRawSha256)&&hash(p.draftDigest),'LOCATOR_INVALID');
  need(encode(p).length<RETENTION.maximumPointerBytes,'LOCATOR_BYTE_BOUND');return p;
}
const locatorPayload=(m,digest)=>checkLocator({kind:m.kind==='ADMIN_HISTORY_MANIFEST_V3'?'ADMIN_HISTORY_ARCHIVE_LOCATOR_V3':'ADMIN_HISTORY_ARCHIVE_LOCATOR_V2',bucket:P.bucket,
  indexPath:m.index.path,indexSha256:m.index.sha256,indexBytes:m.index.bytes,
  indexRawBytes:m.indexRawBytes,indexRawSha256:m.indexRawSha256,draftDigest:digest});
const locatorManifest=p=>({kind:p.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'?'ADMIN_HISTORY_MANIFEST_V3':'ADMIN_HISTORY_MANIFEST_V2',index:{path:p.indexPath,sha256:p.indexSha256,bytes:p.indexBytes},
  indexRawBytes:p.indexRawBytes,indexRawSha256:p.indexRawSha256});
async function currentLocator(c){
  const rows=await c.current(params({document_key:'eq.'+P.locatorKey,select:'document_key,payload,version',limit:'2'}));
  need(Array.isArray(rows)&&rows.length<=1,'LOCATOR_AMBIGUOUS');if(!rows.length)return null;
  const row=rows[0];fields(row,['document_key','payload','version'],'LOCATOR_ROW_FIELDS');
  need(row.document_key===P.locatorKey&&positive(row.version),'LOCATOR_ROW_INVALID');checkLocator(row.payload);return row;
}
async function publishLocator(c,manifest){
  await c.privacy();const verified=await restore(c,manifest);await protect(c,verified.draft);
  const payload=locatorPayload(manifest,verified.draft.digest),before=await currentLocator(c);
  if(manifest.kind==='ADMIN_HISTORY_MANIFEST_V3'&&(!before||!same(before.payload,payload)))await qualifyRetentionPublish(c,manifest,verified,before);
  if(manifest.kind==='ADMIN_HISTORY_MANIFEST_V2')need(before?.payload.kind!=='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3','RETENTION_CANNOT_DOWNGRADE');
  const fresh=await commitLocatorPayload(c,payload,before);
  if(manifest.kind==='ADMIN_HISTORY_MANIFEST_V3')await finishPreparation(c,fresh);
  return fresh;
}
async function commitLocatorPayload(c,payload,before){
  let written=false;
  if(!before||!same(before.payload,payload)){
    const inserted=!before,query=inserted
      ?{on_conflict:'document_key',select:'document_key,payload,version'}
      :{document_key:'eq.'+P.locatorKey,version:'eq.'+before.version,select:'document_key,payload,version'};
    const body=inserted?{document_key:P.locatorKey,payload,updated_by:null}:{payload,updated_by:null};
    const rows=await c.current(params(query),{method:inserted?'POST':'PATCH',headers:{Prefer:inserted?'resolution=ignore-duplicates,return=representation':'return=representation'},body:JSON.stringify(body)},'private archive locator CAS');
    need(Array.isArray(rows)&&rows.length===1&&rows[0].version===(inserted?1:before.version+1),'LOCATOR_CAS_FAILED');
    written=true;
  }
  const fresh=await currentLocator(c);need(fresh&&same(fresh.payload,payload),'LOCATOR_READBACK');
  const restored=await restore(c,locatorManifest(fresh.payload));need(restored.draft.digest===fresh.payload.draftDigest,'LOCATOR_DRAFT_BINDING');
  if(written)c.state.locatorDocumentWritten=true;
  return fresh;
}
async function discover(c,wanted=null,onChunk=null){
  await c.privacy();need(wanted===null||hash(wanted),'LOCATOR_INDEX_SELECTOR');let row=await currentLocator(c);
  if(wanted&&row?.payload.indexSha256!==wanted){
    const rows=await c.versions(params({document_key:'eq.'+P.locatorKey,'payload->>indexSha256':'eq.'+wanted,select:'document_key,payload,version',order:'version.desc,id.desc',limit:'2'}));
    need(Array.isArray(rows)&&rows.length===1,'HISTORIC_LOCATOR_AMBIGUOUS');row=rows[0];
    fields(row,['document_key','payload','version'],'LOCATOR_ROW_FIELDS');need(row.document_key===P.locatorKey&&positive(row.version),'LOCATOR_ROW_INVALID');checkLocator(row.payload);
  }
  need(row&&(!wanted||row.payload.indexSha256===wanted),'DURABLE_LOCATOR_REQUIRED');
  const manifest=locatorManifest(row.payload),verified=await restore(c,manifest,onChunk);
  need(verified.draft.digest===row.payload.draftDigest,'LOCATOR_DRAFT_BINDING');return{row,manifest,verified};
}
async function prune(c,manifest,limit){
  need(Number.isSafeInteger(limit)&&limit>0&&limit<=P.maximumPruneRows,'PRUNE_BATCH_BOUND');
  // No boolean receipt grants deletion: every invocation authenticates and reads the whole archive.
  const located=await discover(c),restored=located.verified,d=restored.draft;await protect(c,d);
  const present=[],absent=[];
  // Complete source identity preflight before the FIRST delete, including all full row fields.
  for(const m of d.core.candidates){
    const row=await exactRow(c,m);if(!row){absent.push(m.id);continue;}
    const archived=restored.rows.get(m.id);
    need(row.raw.length===archived.rowBytes&&sha(row.raw)===archived.rowSha256,'ROW_PAYLOAD_CHANGED');present.push(m);
  }
  await c.privacy();await protect(c,d);let confirmed=0;
  for(const m of present.slice(0,limit)){
    await protect(c,d);
    await c.versions(params({id:'eq.'+m.id,document_key:'eq.'+m.document_key,version:'eq.'+m.version}),
      {method:'DELETE',headers:{Prefer:'return=minimal'}},'exact archived history row');
    need(await exactRow(c,m)===null,'DELETE_NOT_CONFIRMED');confirmed++;
  }
  await protect(c,d);return{status:'EXACT_ARCHIVED_ROWS_ABSENT_AFTER_WRITE',confirmedAbsentAfterWrite:confirmed,
    previouslyAbsentCandidates:absent.length,remainingCandidates:present.length-confirmed};
}

// V3 is a declared retention scope, never a relabelled complete V2 archive.
// Its legacy identity is fixed at the explicit transition. Only post-cutover
// versions may expire; current/top5 remain in the database under the V2 guards.
function collectRetentionListing(inventory,body){
  const xml=new TextDecoder('utf-8',{fatal:true}).decode(body);
  need(!/<!DOCTYPE|<!ENTITY/i.test(xml),'RETENTION_LIST_FORMAT');
  for(const [,block]of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)){
    const keys=[...block.matchAll(/<Key>([\s\S]*?)<\/Key>/g)],sizes=[...block.matchAll(/<Size>([\s\S]*?)<\/Size>/g)];
    need(keys.length===1&&sizes.length===1&&/^(0|[1-9][0-9]*)$/.test(sizes[0][1]),'RETENTION_LIST_ENTRY');
    const bytes=Number(sizes[0][1]),key=keys[0][1];
    need(Number.isSafeInteger(bytes)&&typeof key==='string'&&key.length>0&&key.length<=4096
      &&!inventory.objects.has(key),'RETENTION_LIST_ENTRY');
    inventory.objects.set(key,{path:key,bytes});inventory.total+=bytes;
    need(inventory.objects.size<=RETENTION.maximumInventoryObjects&&Number.isSafeInteger(inventory.total),'RETENTION_LIST_BOUND');
  }
}
async function retentionInventory(c){
  const inventory={objects:new Map(),total:0,listBytes:0};need(!c.state.inventory,'RETENTION_LIST_REENTRY');
  c.state.inventory=inventory;let usage;
  try{usage=await c.r2().bucketUsage();}finally{c.state.inventory=null;}
  need(usage.objectCount===inventory.objects.size&&usage.usedBytes===inventory.total,'RETENTION_LIST_PARITY');return inventory;
}
function descriptor(d){
  fields(d,['path','sha256','bytes'],'RETENTION_OBJECT_FIELDS');
  need(hash(d.sha256)&&d.path===objectPath(d.sha256)&&positive(d.bytes)&&d.bytes<=P.maximumObjectBytes,'RETENTION_OBJECT');return d;
}
function checkPreparationPointer(p,key=P.preparedKey){
  fields(p,['kind','operation','parentVersion','parentIndexSha256','targetIndexSha256','preparation','inventorySha256'],'PREPARATION_POINTER_FIELDS');
  need(p.kind==='ADMIN_HISTORY_PREPARED_POINTER_V1'&&['INITIALIZE','CAPTURE'].includes(p.operation)&&positive(p.parentVersion)
    &&hash(p.parentIndexSha256)&&hash(p.targetIndexSha256)&&hash(p.inventorySha256),'PREPARATION_POINTER_IDENTITY');descriptor(p.preparation);
  need(preparationKey(key)&&p.preparation.bytes<=RETENTION.maximumPreparationBytes&&encode({document_key:key,payload:p,updated_by:null}).length<RETENTION.maximumPointerBytes,'PREPARATION_POINTER_BOUND');return p;
}
function checkPreparationPayload(p,key){
  if(p?.kind!=='ADMIN_HISTORY_PREPARATION_CLEANUP_V1')return checkPreparationPointer(p,key);
  fields(p,['kind','pointer'],'PREPARATION_CLEANUP_FIELDS');need(key===P.preparedKey,'PREPARATION_CLEANUP_KEY');
  checkPreparationPointer(p.pointer,P.unresolvedKey);
  need(encode({document_key:key,payload:p,updated_by:null}).length<RETENTION.maximumPointerBytes,'PREPARATION_POINTER_BOUND');return p;
}
async function preparationRecord(c,key=P.preparedKey){
  need(preparationKey(key),'PREPARATION_RECORD_KEY');
  const rows=await c.current(params({document_key:'eq.'+key,select:'document_key,payload,version',limit:'2'}));
  need(Array.isArray(rows)&&rows.length<=1,'PREPARATION_RECORD_AMBIGUOUS');if(!rows.length)return null;
  const row=rows[0];fields(row,['document_key','payload','version'],'PREPARATION_RECORD_FIELDS');
  need(row.document_key===key&&row.version===1,'PREPARATION_RECORD_IDENTITY');checkPreparationPayload(row.payload,key);return row;
}
async function unresolvedPreparation(c){
  const row=await preparationRecord(c,P.unresolvedKey);c.state.unresolvedPreparation=row;return row;
}
const inventoryDigest=inventory=>sha(encode([...inventory.objects.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0)));
async function createPreparation(c,index,manifest,indexWire,buffers,inventory){
  await c.privacy();need(c.state.preparedAccess===true,'PREPARATION_ACCESS_UNVERIFIED');
  need(await preparationRecord(c)===null,'PREPARATION_ALREADY_PENDING');const parent=await currentLocator(c);
  const unresolved=await unresolvedPreparation(c);
  need(parent&&same(index.parent,{version:parent.version,indexSha256:parent.payload.indexSha256}),'GENERATION_PARENT_CHANGED');
  const currentObjects=index.transition==='INITIALIZE'?index.legacy.currents.map(r=>{
    const b=buffers.get(r.object.path);need(b&&same(describe(b),r.object),'PREPARATION_CURRENT_REQUIRED');return{path:r.object.path,wireBase64:b.toString('base64')};}):[];
  const raw=encode({kind:'ADMIN_HISTORY_PREPARATION_V1',manifest,indexWireBase64:indexWire.toString('base64'),currentObjects,
    ...(unresolved?{unresolvedPreparationSha256:unresolved.payload.preparation.sha256}:{})});
  need(raw.length<=RETENTION.maximumPreparationRawBytes,'PREPARATION_RAW_BOUND');const wire=gzipSync(raw,{level:9,mtime:0});
  need(wire.length<=RETENTION.maximumPreparationBytes,'PREPARATION_BYTE_BOUND');
  const pointer=checkPreparationPointer({kind:'ADMIN_HISTORY_PREPARED_POINTER_V1',operation:index.transition,parentVersion:parent.version,
    parentIndexSha256:parent.payload.indexSha256,targetIndexSha256:manifest.index.sha256,preparation:describe(wire),inventorySha256:inventoryDigest(inventory)});
  need(!unresolved||pointer.preparation.path!==unresolved.payload.preparation.path,'UNRESOLVED_PREPARATION_RETRY_FORBIDDEN');
  const preparedReservationBytes=pointer.preparation.bytes+(unresolved?.payload.preparation.bytes??0);
  need(preparedReservationBytes<=2*RETENTION.maximumPreparationBytes,'PREPARATION_RESERVATION_BOUND');
  c.state.preparedReservationBytes=Math.max(c.state.preparedReservationBytes??0,preparedReservationBytes);
  reserveUpload(c,inventory,index,[...buffers.values()].map(describe).concat(manifest.index,pointer.preparation));
  const rows=await c.current(params({on_conflict:'document_key',select:'document_key,payload,version'}),
    {method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({document_key:P.preparedKey,payload:pointer,updated_by:null})},'create exact archive preparation');
  need(Array.isArray(rows)&&rows.length===1&&rows[0].version===1,'PREPARATION_CREATE_CONFLICT');
  const saved=await preparationRecord(c);need(saved&&same(saved.payload,pointer),'PREPARATION_READBACK');
  c.state.preparationPointerBytes=encode({document_key:P.preparedKey,payload:pointer,version:1}).length;
  c.state.preparationMetadataBytes=wire.length;c.state.preparationDocumentWritten=true;
  // No data or generation index is PUT before this exact metadata is durable.
  await storeObject(c.r2(),wire);return saved;
}
function openPreparation(pointer,wire){
  checkPreparationPointer(pointer);need(same(describe(wire),pointer.preparation),'PREPARATION_OBJECT_CHANGED');
  const body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(gunzipSync(wire,{maxOutputLength:RETENTION.maximumPreparationRawBytes})));
  const hasUnresolved=Object.hasOwn(body,'unresolvedPreparationSha256');
  fields(body,['kind','manifest','indexWireBase64','currentObjects',...(hasUnresolved?['unresolvedPreparationSha256']:[])],'PREPARATION_BODY_FIELDS');
  if(hasUnresolved)need(hash(body.unresolvedPreparationSha256)&&body.unresolvedPreparationSha256!==pointer.preparation.sha256,'PREPARATION_UNRESOLVED_IDENTITY');
  need(body.kind==='ADMIN_HISTORY_PREPARATION_V1'&&typeof body.indexWireBase64==='string'&&Array.isArray(body.currentObjects),'PREPARATION_BODY');checkRetentionManifest(body.manifest);
  const indexWire=Buffer.from(body.indexWireBase64,'base64');need(indexWire.toString('base64')===body.indexWireBase64&&same(describe(indexWire),body.manifest.index)
    &&body.manifest.index.sha256===pointer.targetIndexSha256,'PREPARATION_INDEX_IDENTITY');
  const raw=gunzipSync(indexWire,{maxOutputLength:2_000_000});need(raw.length===body.manifest.indexRawBytes&&sha(raw)===body.manifest.indexRawSha256,'ARCHIVE_INDEX_SHA');
  const index=checkGeneration(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)));
  need(index.transition===pointer.operation&&same(index.parent,{version:pointer.parentVersion,indexSha256:pointer.parentIndexSha256}),'PREPARATION_PARENT_IDENTITY');
  need(body.currentObjects.length===(index.transition==='INITIALIZE'?3:0),'PREPARATION_CURRENT_BOUND');const currentBuffers=new Map();
  for(let i=0;i<body.currentObjects.length;i++){
    const r=body.currentObjects[i];fields(r,['path','wireBase64'],'PREPARATION_CURRENT_FIELDS');need(typeof r.wireBase64==='string','PREPARATION_CURRENT_ENCODING');
    const bytes=Buffer.from(r.wireBase64,'base64'),expected=index.legacy.currents[i];
    need(bytes.toString('base64')===r.wireBase64&&r.path===expected.object.path&&same(describe(bytes),expected.object),'PREPARATION_CURRENT_IDENTITY');
    const record=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(gunzipSync(bytes,{maxOutputLength:P.maximumChunkRawBytes})).trimEnd());
    fields(record,['kind','rawBase64'],'PREPARATION_CURRENT_RECORD');need(record.kind==='ADMIN_HISTORY_CURRENT_REST_RESPONSE_V1'&&typeof record.rawBase64==='string','PREPARATION_CURRENT_RECORD');
    const original=Buffer.from(record.rawBase64,'base64');need(original.toString('base64')===record.rawBase64&&original.length===expected.rowBytes&&sha(original)===expected.rowSha256,'PREPARATION_CURRENT_ORIGINAL');
    const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original));need(Array.isArray(parsed)&&parsed.length===1,'PREPARATION_CURRENT_COUNT');
    const row=parsed[0];fields(row,['document_key','payload','version','updated_at','updated_by'],'LEGACY_CURRENT_ROW_FIELDS');
    need(row.document_key===expected.document_key&&row.version===expected.version&&row.updated_at===expected.updated_at&&sha(encode(row.payload))===expected.payloadSha256,'PREPARATION_CURRENT_PAYLOAD');
    currentBuffers.set(r.path,bytes);
  }
  return{index,manifest:body.manifest,indexWire,currentBuffers};
}
async function readPreparation(c,pointer){return openPreparation(pointer,await verifiedObject(c.r2(),pointer.preparation));}
async function removePreparationRecord(c,record){
  await c.privacy();need(c.state.preparedAccess===true,'PREPARATION_ACCESS_UNVERIFIED');
  const fresh=await preparationRecord(c,record.document_key);need(fresh&&same(fresh,record),'PREPARATION_RECORD_CHANGED');
  c.state.preparedDelete=record;
  try{await c.current(params({document_key:'eq.'+record.document_key,version:'eq.1',payload:'eq.'+encode(record.payload).toString('utf8')}),
    {method:'DELETE',headers:{Prefer:'return=minimal'}},'clear exact completed preparation');
    need(await preparationRecord(c,record.document_key)===null,'PREPARATION_DELETE_NOT_CONFIRMED');
    if(record.document_key===P.preparedKey)c.state.preparationDocumentWritten=true;
    else{c.state.unresolvedPreparation=null;c.state.unresolvedPreparationDocumentWritten=true;}
  }finally{if(!c.state.unknownWrite)c.state.preparedDelete=null;}
}
async function reserveUnresolvedPreparation(c,record){
  await c.privacy();need(c.state.preparedAccess===true,'PREPARATION_ACCESS_UNVERIFIED');
  let existing=await unresolvedPreparation(c);
  need(!existing||same(existing.payload,record.payload),'UNRESOLVED_PREPARATION_SLOT_HELD');
  if(!existing){
    const body={document_key:P.unresolvedKey,payload:record.payload,updated_by:null};checkPreparationPointer(body.payload,P.unresolvedKey);
    const rows=await c.current(params({on_conflict:'document_key',select:'document_key,payload,version'}),
      {method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(body)},'reserve exact unresolved preparation');
    need(Array.isArray(rows)&&rows.length===1&&rows[0].version===1,'UNRESOLVED_PREPARATION_CREATE_CONFLICT');
    existing=await unresolvedPreparation(c);need(existing&&same(existing.payload,record.payload),'UNRESOLVED_PREPARATION_READBACK');
    c.state.unresolvedPreparationDocumentWritten=true;
  }
  c.state.unresolvedPreparationPointerBytes=encode({document_key:P.unresolvedKey,payload:record.payload,updated_by:null}).length;
  // The original may still become durable after an absent read. Its positive
  // descriptor survives before the active slot is freed; it is never re-PUT.
  await removePreparationRecord(c,record);
}
async function checkUnresolvedCleanup(c,pointer,inventory){
  const current=await currentLocator(c);need(current,'PREPARATION_PARENT_MISSING');
  if(current.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'){
    const manifest=locatorManifest(current.payload),verified=await restoreRetention(c,manifest),located={row:current,manifest,verified};
    const refs=await retentionReferences(c,located);
    need(!refs.protectedObjects.has(pointer.preparation.path)
      &&!verified.index.retirement?.objects.some(d=>d.path===pointer.preparation.path),'UNRESOLVED_PREPARATION_STILL_REFERENCED');
    refs.allowed.set(pointer.preparation.path,pointer.preparation);inventoryReferences(inventory,located,refs);
  }else await restore(c,locatorManifest(current.payload));
  need(same(await currentLocator(c),current),'LOCATOR_CHANGED');return current;
}
async function finishUnresolvedCleanup(c,witness){
  await c.privacy();need(c.state.preparedAccess===true,'PREPARATION_ACCESS_UNVERIFIED');
  checkPreparationPayload(witness.payload,P.preparedKey);need(witness.payload.kind==='ADMIN_HISTORY_PREPARATION_CLEANUP_V1','PREPARATION_CLEANUP_REQUIRED');
  const pointer=witness.payload.pointer,unresolved=await unresolvedPreparation(c);
  need(!unresolved||same(unresolved.payload,pointer),'UNRESOLVED_PREPARATION_CHANGED');
  need(same(await preparationRecord(c),witness),'PREPARATION_RECORD_CHANGED');let inventory=await retentionInventory(c);
  await checkUnresolvedCleanup(c,pointer,inventory);
  if(inventory.objects.has(pointer.preparation.path)){
    openPreparation(pointer,await verifiedObject(c.r2(),pointer.preparation));
    need(same(await preparationRecord(c),witness),'PREPARATION_RECORD_CHANGED');
    c.state.retirementPaths=new Set([pointer.preparation.path]);
    try{await c.r2().removeExact(pointer.preparation.path);inventory=await retentionInventory(c);
      need(!inventory.objects.has(pointer.preparation.path),'PREPARATION_DELETE_NOT_CONFIRMED');
      c.state.unresolvedPreparationObjectsDeleted=(c.state.unresolvedPreparationObjectsDeleted??0)+1;
    }finally{if(!c.state.unknownWrite)c.state.retirementPaths=null;}
  }
  // This durable witness exists only after the sole original PUT was fully
  // observed. A later absent read therefore completes cleanup, not cancellation.
  if(unresolved)await removePreparationRecord(c,unresolved);
  need(!(await retentionInventory(c)).objects.has(pointer.preparation.path),'PREPARATION_DELETE_NOT_CONFIRMED');
  await removePreparationRecord(c,witness);
  return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',unresolvedPreparationCleanupCompleted:true,
    candidateRows:0,confirmedAbsentAfterWrite:0,remainingCandidates:(await buildDraft(c)).core.candidates.length,archiveRequired:false};
}
async function beginUnresolvedCleanup(c){
  const unresolved=await unresolvedPreparation(c);if(!unresolved)return null;
  await c.privacy();need(c.state.preparedAccess===true,'PREPARATION_ACCESS_UNVERIFIED');
  const pointer=unresolved.payload,inventory=await retentionInventory(c);
  if(!inventory.objects.has(pointer.preparation.path))return null;
  // A full positive hash/byte GET of the one original request precedes the
  // create-only witness. Absence alone can never create this terminal proof.
  openPreparation(pointer,await verifiedObject(c.r2(),pointer.preparation));
  await checkUnresolvedCleanup(c,pointer,inventory);
  need(await preparationRecord(c)===null&&same(await unresolvedPreparation(c),unresolved),'UNRESOLVED_PREPARATION_CHANGED');
  const payload={kind:'ADMIN_HISTORY_PREPARATION_CLEANUP_V1',pointer};checkPreparationPayload(payload,P.preparedKey);
  const rows=await c.current(params({on_conflict:'document_key',select:'document_key,payload,version'}),
    {method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({document_key:P.preparedKey,payload,updated_by:null})},'record positively observed unresolved metadata');
  need(Array.isArray(rows)&&rows.length===1&&rows[0].version===1,'PREPARATION_CREATE_CONFLICT');
  const witness=await preparationRecord(c);need(witness&&same(witness.payload,payload),'PREPARATION_READBACK');
  c.state.preparationDocumentWritten=true;c.state.preparationPointerBytes=encode({document_key:P.preparedKey,payload,updated_by:null}).length;
  return finishUnresolvedCleanup(c,witness);
}
async function finishPreparation(c,current){
  const record=await preparationRecord(c);if(!record)return;
  const pointer=record.payload;need(current.payload.indexSha256===pointer.targetIndexSha256&&current.version===pointer.parentVersion+1,'PREPARATION_COMMIT_CHANGED');
  const manifest=locatorManifest(current.payload),verified=await restoreRetention(c,manifest);
  need(same(verified.index.parent,{version:pointer.parentVersion,indexSha256:pointer.parentIndexSha256}),'PREPARATION_PARENT_IDENTITY');
  if(verified.index.transition==='INITIALIZE')for(const r of verified.index.legacy.currents)await verifiedObject(c.r2(),r.object);
  const located={row:current,manifest,verified},refs=await retentionReferences(c,located),inventory=await retentionInventory(c);
  need(!refs.protectedObjects.has(pointer.preparation.path),'PREPARATION_STILL_REFERENCED');refs.allowed.set(pointer.preparation.path,pointer.preparation);
  inventoryReferences(inventory,located,refs);
  if(inventory.objects.has(pointer.preparation.path)){
    await verifiedObject(c.r2(),pointer.preparation);need(same(await currentLocator(c),current),'LOCATOR_CHANGED');
    need(same(await preparationRecord(c),record),'PREPARATION_RECORD_CHANGED');c.state.retirementPaths=new Set([pointer.preparation.path]);
    try{await c.r2().removeExact(pointer.preparation.path);need(!(await retentionInventory(c)).objects.has(pointer.preparation.path),'PREPARATION_DELETE_NOT_CONFIRMED');
      c.state.preparationMetadataObjectsDeleted=(c.state.preparationMetadataObjectsDeleted??0)+1;
    }finally{if(!c.state.unknownWrite)c.state.retirementPaths=null;}
  }
  await removePreparationRecord(c,record);
}
async function recoverPreparation(c,record){
  if(record.payload.kind==='ADMIN_HISTORY_PREPARATION_CLEANUP_V1')return finishUnresolvedCleanup(c,record);
  await c.privacy();need(c.state.preparedAccess===true,'PREPARATION_ACCESS_UNVERIFIED');
  const pointer=record.payload,current=await currentLocator(c);need(current,'PREPARATION_PARENT_MISSING');
  const unresolved=await unresolvedPreparation(c);
  if(unresolved&&same(unresolved.payload,pointer)){
    need(current.version===pointer.parentVersion&&current.payload.indexSha256===pointer.parentIndexSha256,'ABORTED_PREPARATION_PARENT_CHANGED');
    await reserveUnresolvedPreparation(c,record);
    return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',preparedIntentAbsent:true,candidateRows:0,
      confirmedAbsentAfterWrite:0,remainingCandidates:(await buildDraft(c)).core.candidates.length,archiveRequired:false,
      retentionInitializationRequired:pointer.operation==='INITIALIZE'};
  }
  if(current.payload.indexSha256===pointer.targetIndexSha256){await finishPreparation(c,current);
    return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',preparedArchiveRecovered:true,candidateRows:0,
      confirmedAbsentAfterWrite:0,remainingCandidates:(await buildDraft(c)).core.candidates.length,archiveRequired:false};}
  need(current.version===pointer.parentVersion&&current.payload.indexSha256===pointer.parentIndexSha256,'PREPARATION_PARENT_CHANGED');
  const inventory=await retentionInventory(c);
  if(!inventory.objects.has(pointer.preparation.path)){
    // Absence does not terminate a remote PUT. Keep its exact descriptor in a
    // separate durable, bounded reservation before freeing the active slot.
    need(inventoryDigest(inventory)===pointer.inventorySha256,'PREPARATION_ABSENCE_UNPROVED');await reserveUnresolvedPreparation(c,record);
    return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',preparedIntentAbsent:true,candidateRows:0,confirmedAbsentAfterWrite:0,
      remainingCandidates:(await buildDraft(c)).core.candidates.length,archiveRequired:false,
      retentionInitializationRequired:pointer.operation==='INITIALIZE'};
  }
  const prepared=await readPreparation(c,pointer),index=prepared.index,old=current.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'
    ?await restoreRetention(c,locatorManifest(current.payload),null,{retainRaw:true}):null;
  if(index.transition==='CAPTURE')need(old&&same(index.legacy,old.index.legacy)&&same(index.reserve,locatorManifest(current.payload))
    &&same(index.holds,old.index.holds),'PREPARATION_REFERENCE_CHANGED');
  else need(current.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2','PREPARATION_INITIALIZATION_PARENT');
  const allowed=new Map(index.legacy.objects.map(d=>[d.path,d]));
  for(const d of [...index.legacy.rows.map(r=>r.object),...index.legacy.currents.map(r=>r.object),...index.lateLegacy.map(r=>r.object),
    ...generationObjects(prepared.manifest,index),pointer.preparation,...(index.retirement?.objects??[])])allowed.set(d.path,d);
  if(c.state.unresolvedPreparation){const d=c.state.unresolvedPreparation.payload.preparation;allowed.set(d.path,d);}
  if(old){const refs=await retentionReferences(c,{row:current,manifest:locatorManifest(current.payload),verified:old});for(const d of refs.allowed.values())allowed.set(d.path,d);}
  for(const d of inventory.objects.values())need(allowed.get(d.path)?.bytes===d.bytes,'RETENTION_UNREFERENCED_OBJECT');
  const full=await buildDraft(c);
  for(const guard of index.draft.core.guards){const now=full.core.guards.find(r=>r.document_key===guard.document_key);
    need(now.version>=guard.version&&(now.version!==guard.version||now.updated_at===guard.updated_at),'PREPARATION_CURRENT_REGRESSED');}
  const candidates=index.draft.core.candidates;
  const expected=index.selection==='FULL'?full.core.candidates.slice(0,candidates.length):automaticBatchDraft(full).core.candidates.slice(0,candidates.length);
  need(index.transition==='INITIALIZE'||same(candidates,expected),'PREPARATION_OLDEST_PREFIX_CHANGED');
  if(index.transition==='INITIALIZE')for(const r of index.legacy.rows){const source=await exactRow(c,meta(r));
    need(source&&source.raw.length===r.rowBytes&&sha(source.raw)===r.rowSha256,'LEGACY_SOURCE_CHANGED');}
  const buffers=new Map(prepared.currentBuffers);
  for(const chunk of index.chunks){
    need(chunk.rows.length===1,'PREPARATION_CHUNK_SHAPE');const ref=chunk.rows[0];
    let wire;if(inventory.objects.has(chunk.path))wire=await verifiedObject(c.r2(),chunk);
    else{let source=await exactRow(c,meta(ref));if(!source){const previous=old?.rows.get(ref.id);if(previous?.raw)source={raw:previous.raw,row:previous.row};}
      need(source&&source.raw.length===ref.rowBytes&&sha(source.raw)===ref.rowSha256,'PREPARATION_SOURCE_MISSING');wire=packedOriginal(source.raw).wire;
      need(same(describe(wire),{path:chunk.path,sha256:chunk.sha256,bytes:chunk.bytes}),'PREPARATION_ORIGINAL_CHANGED');}
    buffers.set(chunk.path,wire);
  }
  reserveUpload(c,inventory,index,[...buffers.values()].map(describe).concat(prepared.manifest.index,pointer.preparation));
  for(const b of buffers.values())await storeObject(c.r2(),b);await storeObject(c.r2(),prepared.indexWire);
  const verified=await restoreRetention(c,prepared.manifest);
  // The recorded old snapshot may be completed after current advanced. It is
  // not a new current/top5 proof and never authorizes DB prune on this pass.
  const fresh=await buildDraft(c);need(same(full.core.guards,fresh.core.guards)&&same(full.core.kept,fresh.core.kept),'PREPARATION_CURRENT_CHANGED');
  need(same(await currentLocator(c),current)&&same(await preparationRecord(c),record),'PREPARATION_PARENT_CHANGED');
  const published=await commitLocatorPayload(c,locatorPayload(prepared.manifest,verified.draft.digest),current);
  await finishPreparation(c,published);
  return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',preparedArchiveRecovered:true,candidateRows:0,confirmedAbsentAfterWrite:0,
    remainingCandidates:fresh.core.candidates.length,archiveRequired:true};
}
function rowReference(r){
  fields(r,['id','document_key','version','created_at','rowBytes','rowSha256','object'],'LEGACY_ROW_FIELDS');checkMeta(meta(r));descriptor(r.object);
  need(positive(r.rowBytes)&&r.rowBytes<=P.maximumRowBytes&&hash(r.rowSha256),'LEGACY_ROW_IDENTITY');return r;
}
function checkRetentionManifest(m){
  fields(m,['kind','index','indexRawBytes','indexRawSha256'],'RETENTION_MANIFEST_FIELDS');
  need(m.kind==='ADMIN_HISTORY_MANIFEST_V3'&&positive(m.indexRawBytes)&&m.indexRawBytes<=2_000_000&&hash(m.indexRawSha256),'RETENTION_MANIFEST');
  descriptor(m.index);return m;
}
function checkLegacy(legacy){
  fields(legacy,['kind','cutover','objects','rows','currents','digest'],'LEGACY_FIELDS');
  const {digest,...core}=legacy;need(legacy.kind==='ADMIN_HISTORY_LEGACY_V1'&&hash(digest)&&sha(encode(core))===digest,'LEGACY_DIGEST');
  need(Array.isArray(legacy.cutover)&&legacy.cutover.length===3&&legacy.cutover.every((r,i)=>{
    fields(r,['document_key','version','updated_at'],'LEGACY_CUTOVER_FIELDS');return r.document_key===P.keys[i]&&positive(r.version)
      &&typeof r.updated_at==='string'&&Number.isFinite(Date.parse(r.updated_at));}),'LEGACY_CUTOVER');
  need(Array.isArray(legacy.objects)&&legacy.objects.length<=RETENTION.maximumInventoryObjects,'LEGACY_OBJECT_BOUND');
  const paths=new Set();for(const r of legacy.objects){fields(r,['path','bytes'],'LEGACY_LIST_FIELDS');
    need(typeof r.path==='string'&&r.path.length>0&&r.path.length<=4096&&Number.isSafeInteger(r.bytes)&&r.bytes>=0&&!paths.has(r.path),'LEGACY_LIST_IDENTITY');paths.add(r.path);}
  need(Array.isArray(legacy.rows)&&legacy.rows.length<=P.maximumRowsPerKey*3,'LEGACY_ROWS_BOUND');
  const ids=new Set();for(const r of legacy.rows){rowReference(r);need(!ids.has(r.id)&&r.version<legacy.cutover.find(g=>g.document_key===r.document_key).version,'LEGACY_ROW_CUTOVER');ids.add(r.id);}
  need(Array.isArray(legacy.currents)&&legacy.currents.length===3,'LEGACY_CURRENT_BOUND');
  for(let i=0;i<3;i++){const r=legacy.currents[i];fields(r,['document_key','version','updated_at','payloadSha256','rowBytes','rowSha256','object'],'LEGACY_CURRENT_FIELDS');
    need(same({document_key:r.document_key,version:r.version,updated_at:r.updated_at},legacy.cutover[i])&&hash(r.payloadSha256)
      &&hash(r.rowSha256)&&positive(r.rowBytes)&&r.rowBytes<=P.maximumRowBytes,'LEGACY_CURRENT_IDENTITY');descriptor(r.object);}
  return legacy;
}
function checkCompletedRetirement(p){
  fields(p,['manifest','locatorVersion','locatorPayload'],'COMPLETED_METADATA_FIELDS');checkRetentionManifest(p.manifest);checkLocator(p.locatorPayload);
  need(positive(p.locatorVersion)&&p.locatorPayload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'
    &&same(locatorManifest(p.locatorPayload),p.manifest),'COMPLETED_METADATA_IDENTITY');return p;
}
async function locatorHistoryRecord(c,entry){
  checkCompletedRetirement(entry);
  const source=await c.exactVersions(params({document_key:'eq.'+P.locatorKey,version:'eq.'+entry.locatorVersion,select:'*',limit:'2'}));
  need(Array.isArray(source.rows)&&source.rows.length<=1&&source.raw.length<=4096,'LOCATOR_HISTORY_BOUND');if(!source.rows.length)return null;
  const row=source.rows[0];fields(row,['id','document_key','payload','version','created_at','created_by'],'LOCATOR_HISTORY_FIELDS');
  need(positive(row.id)&&row.document_key===P.locatorKey&&row.version===entry.locatorVersion&&same(row.payload,entry.locatorPayload)
    &&typeof row.created_at==='string'&&Number.isFinite(Date.parse(row.created_at))
    &&(row.created_by===null||/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.created_by)),'LOCATOR_HISTORY_IDENTITY');
  checkLocator(row.payload);return{row,rawSha256:sha(source.raw)};
}
async function nextCompletedRetirements(c,index,inventory){
  const pending=[...index.completedRetirements];
  if(index.retirement&&!inventory.objects.has(index.retirement.manifest.index.path)){
    const {manifest,locatorVersion,locatorPayload}=index.retirement;
    if(!pending.some(p=>p.manifest.index.sha256===manifest.index.sha256))pending.push({manifest,locatorVersion,locatorPayload});
  }
  const keep=[];for(const p of pending){checkCompletedRetirement(p);
    if(await locatorHistoryRecord(c,p))keep.push(p);else need(!inventory.objects.has(p.manifest.index.path),'LOCATOR_HISTORY_MISSING_BEFORE_RETIREMENT');}
  need(keep.length<=RETENTION.maximumCompletedMetadata,'COMPLETED_METADATA_BOUND');return keep;
}
function checkGeneration(index){
  fields(index,['kind','bucket','transition','selection','draft','legacy','lateLegacy','retained','chunks','reserve','retirement','completedRetirements','parent','holds'],'GENERATION_FIELDS');
  need(index.kind==='ADMIN_HISTORY_GENERATION_V3'&&index.bucket===P.bucket&&['INITIALIZE','CAPTURE'].includes(index.transition),'GENERATION_KIND');
  checkDraft(index.draft);checkLegacy(index.legacy);
  need(index.transition==='INITIALIZE'?index.selection==='NONE':['FULL','OLDEST_25'].includes(index.selection),'GENERATION_SELECTION');
  fields(index.parent,['version','indexSha256'],'GENERATION_PARENT_FIELDS');need(positive(index.parent.version)&&hash(index.parent.indexSha256),'GENERATION_PARENT');
  need(Array.isArray(index.lateLegacy)&&index.lateLegacy.length<=3,'LATE_LEGACY_BOUND');const lateKeys=new Set();
  for(const r of index.lateLegacy){rowReference(r);need(!lateKeys.has(r.document_key)&&r.version===index.legacy.cutover.find(g=>g.document_key===r.document_key).version,'LATE_LEGACY_VERSION');lateKeys.add(r.document_key);}
  need(Array.isArray(index.retained)&&index.retained.length<=3*RETENTION.keepNew&&Array.isArray(index.chunks)&&index.chunks.length<=1000,'GENERATION_ARRAYS');
  for(const r of index.retained){checkMeta(r);need(r.version>index.legacy.cutover.find(g=>g.document_key===r.document_key).version,'NEW_VERSION_REQUIRED');}
  need(index.reserve===null||checkRetentionManifest(index.reserve),'GENERATION_RESERVE');
  need(Array.isArray(index.holds)&&index.holds.length<=64,'GENERATION_HOLDS');for(const m of index.holds)checkRetentionManifest(m);
  if(index.retirement!==null){const p=index.retirement;fields(p,['manifest','objects','locatorVersion','locatorPayload'],'RETIREMENT_FIELDS');checkRetentionManifest(p.manifest);checkLocator(p.locatorPayload);
    need(positive(p.locatorVersion)&&Array.isArray(p.objects)&&p.objects.length<=1001,'RETIREMENT_PLAN');for(const d of p.objects)descriptor(d);
    need(p.objects.length>0&&same(p.objects.at(-1),p.manifest.index)&&p.locatorPayload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'
      &&same(locatorManifest(p.locatorPayload),p.manifest),'RETIREMENT_INDEX_LAST');}
  need(Array.isArray(index.completedRetirements)&&index.completedRetirements.length<=RETENTION.maximumCompletedMetadata,'COMPLETED_METADATA_BOUND');
  const completed=new Set();for(const p of index.completedRetirements){checkCompletedRetirement(p);need(!completed.has(p.manifest.index.sha256),'COMPLETED_METADATA_DUPLICATE');completed.add(p.manifest.index.sha256);}
  if(index.transition==='INITIALIZE')need(!index.retained.length&&!index.chunks.length&&!index.draft.core.candidates.length
    &&index.reserve===null&&index.retirement===null&&!index.completedRetirements.length&&!index.lateLegacy.length&&!index.holds.length,'INITIALIZATION_SCOPE');
  return index;
}
async function restoreRetention(c,manifest,onChunk=null,{retainRaw=false}={}){
  checkRetentionManifest(manifest);const storage=c.r2();await storage.ensurePrivateBucket();
  const raw=gunzipSync(await verifiedObject(storage,manifest.index),{maxOutputLength:2_000_000});
  need(raw.length===manifest.indexRawBytes&&sha(raw)===manifest.indexRawSha256,'ARCHIVE_INDEX_SHA');
  const index=checkGeneration(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)));
  const wanted=new Map();for(const r of [...index.draft.core.candidates,...index.retained]){
    const old=wanted.get(r.id);need(!old||same(old,r),'GENERATION_DUPLICATE_ID');wanted.set(r.id,r);}
  const rows=new Map(),seenPaths=new Set();let generationBytes=manifest.index.bytes,totalRaw=0;
  for(const chunk of index.chunks){
    fields(chunk,['path','sha256','bytes','rawBytes','rawSha256','rows'],'CHUNK_FIELDS');descriptor({path:chunk.path,sha256:chunk.sha256,bytes:chunk.bytes});
    need(!seenPaths.has(chunk.path)&&positive(chunk.rawBytes)&&chunk.rawBytes<=P.maximumChunkRawBytes&&hash(chunk.rawSha256)&&Array.isArray(chunk.rows),'CHUNK_INVALID');seenPaths.add(chunk.path);
    generationBytes+=chunk.bytes;totalRaw+=chunk.rawBytes;need(generationBytes<=RETENTION.maximumGenerationBytes&&totalRaw<=P.maximumArchiveRawBytes,'GENERATION_BYTE_BOUND');
    const compressed=await verifiedObject(storage,chunk),bytes=gunzipSync(compressed,{maxOutputLength:P.maximumChunkRawBytes});
    need(bytes.length===chunk.rawBytes&&sha(bytes)===chunk.rawSha256,'CHUNK_RAW_SHA');
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);need(text.endsWith('\n'),'ROW_TERMINATOR');const lines=text.slice(0,-1).split('\n');need(lines.length===chunk.rows.length,'ROW_REFERENCE_COUNT');
    for(let i=0;i<lines.length;i++){
      const record=JSON.parse(lines[i]),entry=chunk.rows[i];fields(record,['kind','rawBase64'],'ROW_ENCODING_FIELDS');
      need(record.kind==='ADMIN_HISTORY_REST_RESPONSE_V2'&&typeof record.rawBase64==='string'&&record.rawBase64.length>0
        &&record.rawBase64.length<=4*Math.ceil(P.maximumRowBytes/3),'ROW_ENCODING_BOUND');
      const original=Buffer.from(record.rawBase64,'base64');need(original.length<=P.maximumRowBytes&&original.toString('base64')===record.rawBase64,'ROW_ENCODING_INVALID');
      const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original));need(Array.isArray(parsed)&&parsed.length===1,'ROW_RESPONSE_COUNT');const row=checkRow(parsed[0]);
      fields(entry,['id','document_key','version','created_at','rowBytes','rowSha256'],'ROW_REFERENCE_FIELDS');
      need(wanted.has(row.id)&&!rows.has(row.id)&&same(meta(row),wanted.get(row.id))&&same(meta(row),meta(entry))
        &&positive(entry.rowBytes)&&entry.rowBytes===original.length&&hash(entry.rowSha256)&&sha(original)===entry.rowSha256,'ROW_ROUNDTRIP');
      const cutoff=index.legacy.cutover.find(g=>g.document_key===row.document_key).version;
      if(row.version<=cutoff){const legacy=[...index.legacy.rows,...index.lateLegacy].find(r=>r.id===row.id);
        need(legacy&&same(meta(legacy),meta(row))&&legacy.rowBytes===entry.rowBytes&&legacy.rowSha256===entry.rowSha256
          &&legacy.object.path===chunk.path&&chunk.rows.length===1,'LEGACY_ORIGINAL_REQUIRED');}
      rows.set(row.id,{...meta(row),rowBytes:entry.rowBytes,rowSha256:entry.rowSha256,...(retainRaw?{raw:original,row}:{} )});
    }
    if(onChunk)await onChunk(chunk,compressed);
  }
  need(rows.size===wanted.size,'COMPLETE_ARCHIVE_REQUIRED');
  need(same(index.retained,selectNewVersions([...wanted.values()],index.legacy)),'RETAINED_VERSION_SET');
  return{draft:index.draft,rows,index};
}
function selectNewVersions(rows,legacy){
  const result=[],identities=new Set();for(const key of P.keys){const cutoff=legacy.cutover.find(r=>r.document_key===key).version;
    const selected=rows.filter(r=>r.document_key===key&&r.version>cutoff).sort((a,b)=>b.version-a.version||b.id-a.id);
    for(const r of selected){const version=key+':'+r.version;need(!identities.has(version),'RETENTION_DUPLICATE_DOCUMENT_VERSION');identities.add(version);}
    result.push(...selected.slice(0,RETENTION.keepNew).map(meta));}return result;
}
const describe=b=>({path:objectPath(sha(b)),sha256:sha(b),bytes:b.length});
function packedOriginal(raw,kind='ADMIN_HISTORY_REST_RESPONSE_V2'){
  const line=Buffer.concat([encode({kind,rawBase64:raw.toString('base64')}),Buffer.from('\n')]);
  need(line.length<=P.maximumChunkRawBytes,'ARCHIVE_ROW_BOUND');const wire=gzipSync(line,{level:9,mtime:0});
  return{wire,object:describe(wire),rawBytes:line.length,rawSha256:sha(line)};
}
const rowArchiveReference=(row,raw,packed)=>({...meta(row),rowBytes:raw.length,rowSha256:sha(raw),object:packed.object});
function generationObjects(manifest,index){
  const objects=new Map();for(const d of [...index.chunks.map(({path,sha256,bytes})=>({path,sha256,bytes})),manifest.index]){
    const old=objects.get(d.path);need(!old||same(old,d),'RETENTION_OBJECT_COLLISION');objects.set(d.path,d);}
  return [...objects.values()].filter(d=>d.path!==manifest.index.path).concat([manifest.index]);
}
function legacyReservations(index){
  const objects=new Map();for(const d of [...index.legacy.objects,...index.legacy.rows.map(r=>r.object),
    ...index.legacy.currents.map(r=>r.object),...index.lateLegacy.map(r=>r.object)]){
    const old=objects.get(d.path);need(!old||old.bytes===d.bytes,'LEGACY_OBJECT_CHANGED');objects.set(d.path,d);}
  const future=(3-index.lateLegacy.length)*P.maximumObjectBytes;
  return{objects,future};
}
function reserveUpload(c,inventory,index,prepared){
  const reserved=new Map(inventory.objects),legacy=legacyReservations(index);
  const unresolved=c.state.unresolvedPreparation?.payload.preparation;
  for(const d of [...legacy.objects.values(),...prepared,...(unresolved?[unresolved]:[])]){const old=reserved.get(d.path);
    need(!old||old.bytes===d.bytes,'RETENTION_OBJECT_CHANGED');reserved.set(d.path,d);}
  const total=[...reserved.values()].reduce((n,d)=>n+d.bytes,0)+legacy.future+RETENTION.reserveBytes;
  need(Number.isSafeInteger(total)&&total<=P.maximumBucketBytes,'RETENTION_CAPACITY_HELD');
  c.state.retentionReservedBytes=Math.max(c.state.retentionReservedBytes??0,total);return total;
}
async function storedGeneration(c,index,buffers,inventory){
  const raw=encode(checkGeneration(index));need(raw.length<=2_000_000,'ARCHIVE_INDEX_BOUND');
  const wire=gzipSync(raw,{level:9,mtime:0}),manifest={kind:'ADMIN_HISTORY_MANIFEST_V3',index:describe(wire),indexRawBytes:raw.length,indexRawSha256:sha(raw)};
  need(index.chunks.reduce((n,d)=>n+d.bytes,wire.length)<=RETENTION.maximumGenerationBytes,'GENERATION_BYTE_BOUND');
  reserveUpload(c,inventory,index,[...buffers.values()].map(b=>describe(b)).concat(manifest.index));
  // A compact create-only DB pointer first binds a content-addressed private
  // preparation. No generation data PUT can precede its verified readback.
  await createPreparation(c,index,manifest,wire,buffers,inventory);
  // The WHOLE transient and all not-yet-uploaded legacy are reserved before PUT.
  for(const b of buffers.values())await storeObject(c.r2(),b);
  await storeObject(c.r2(),wire);await restoreRetention(c,manifest);return manifest;
}
async function initializeRetention(c){
  await c.privacy();const full=await buildDraft(c),before=await currentLocator(c);
  const unresolved=await unresolvedPreparation(c);
  need(before&&before.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2','RETENTION_V2_LOCATOR_REQUIRED');
  need(await preparationRecord(c)===null,'PREPARATION_ALREADY_PENDING');
  // Authenticate the existing current locator before freezing the complete list.
  await restore(c,locatorManifest(before.payload));const inventory=await retentionInventory(c),rows=[],currents=[],buffers=new Map();
  for(const m of [...full.core.kept,...full.core.candidates]){
    const source=await exactRow(c,m);need(source,'LEGACY_SOURCE_MISSING');const packed=packedOriginal(source.raw);
    rows.push(rowArchiveReference(source.row,source.raw,packed));
  }
  for(const guard of full.core.guards){
    const source=await c.exactCurrent(guard.document_key);need(Array.isArray(source.rows)&&source.rows.length===1,'LEGACY_CURRENT_REQUIRED');
    const r=source.rows[0];fields(r,['document_key','payload','version','updated_at','updated_by'],'LEGACY_CURRENT_ROW_FIELDS');
    need(same({document_key:r.document_key,version:r.version,updated_at:r.updated_at},guard)&&r.payload&&typeof r.payload==='object'&&!Array.isArray(r.payload),'LEGACY_CURRENT_CHANGED');
    const packed=packedOriginal(source.raw,'ADMIN_HISTORY_CURRENT_REST_RESPONSE_V1');buffers.set(packed.object.path,packed.wire);
    currents.push({...guard,payloadSha256:sha(encode(r.payload)),rowBytes:source.raw.length,rowSha256:sha(source.raw),object:packed.object});
  }
  // Only the exact positively reserved private metadata is not a legacy
  // original. Unknown names and every pre-existing original remain frozen.
  const core={kind:'ADMIN_HISTORY_LEGACY_V1',cutover:full.core.guards,objects:[...inventory.objects.values()]
    .filter(d=>d.path!==unresolved?.payload.preparation.path).sort((a,b)=>a.path.localeCompare(b.path)),rows:rows.sort((a,b)=>a.id-b.id),currents};
  const legacy={...core,digest:sha(encode(core))},draftCore={...full.core,candidates:[]};
  const index={kind:'ADMIN_HISTORY_GENERATION_V3',bucket:P.bucket,transition:'INITIALIZE',selection:'NONE',draft:{kind:full.kind,core:draftCore,digest:sha(encode(draftCore))},
    legacy,lateLegacy:[],retained:[],chunks:[],reserve:null,retirement:null,completedRetirements:[],parent:{version:before.version,indexSha256:before.payload.indexSha256},holds:[]};
  const manifest=await storedGeneration(c,index,buffers,inventory);await protect(c,full);
  need(same(await currentLocator(c),before),'LOCATOR_CHANGED');await publishLocator(c,manifest);
  return{status:'ADMIN_HISTORY_RETENTION_INITIALIZED',legacyRows:rows.length,legacyObjects:inventory.objects.size,keepNewVersions:RETENTION.keepNew,confirmedAbsentAfterWrite:0};
}
async function publishedGeneration(c,manifest){
  const rows=await c.versions(params({document_key:'eq.'+P.locatorKey,'payload->>indexSha256':'eq.'+manifest.index.sha256,
    select:'document_key,payload,version',order:'version.desc,id.desc',limit:'2'}));
  need(Array.isArray(rows)&&rows.length===1,'RETENTION_PUBLICATION_REQUIRED');const row=rows[0];
  fields(row,['document_key','payload','version'],'RETENTION_PUBLICATION_FIELDS');checkLocator(row.payload);
  need(row.document_key===P.locatorKey&&positive(row.version)&&same(locatorManifest(row.payload),manifest),'RETENTION_PUBLICATION_IDENTITY');return row;
}
async function retentionReferences(c,located){
  const {index}=located.verified,reserve=index.reserve?await restoreRetention(c,index.reserve):null,holds=[];
  for(const manifest of index.holds)holds.push({manifest,verified:await restoreRetention(c,manifest)});
  const protectedObjects=new Map(legacyReservations(index).objects);
  for(const d of generationObjects(located.manifest,index).concat(reserve?generationObjects(index.reserve,reserve.index):[],
    ...holds.map(h=>generationObjects(h.manifest,h.verified.index)))){
    const old=protectedObjects.get(d.path);need(!old||old.bytes===d.bytes,'RETENTION_REFERENCE_COLLISION');protectedObjects.set(d.path,d);}
  const allowed=new Map(protectedObjects);for(const d of index.retirement?.objects??[]){const old=allowed.get(d.path);
    need(!old||old.bytes===d.bytes,'RETENTION_REFERENCE_COLLISION');allowed.set(d.path,d);}
  const unresolved=await unresolvedPreparation(c);if(unresolved){const d=unresolved.payload.preparation,old=allowed.get(d.path);
    need(!old||same(old,d),'RETENTION_REFERENCE_COLLISION');allowed.set(d.path,d);}
  const prepared=await preparationRecord(c);if(prepared?.payload.kind==='ADMIN_HISTORY_PREPARATION_CLEANUP_V1'){
    const d=prepared.payload.pointer.preparation,old=allowed.get(d.path);need(!old||same(old,d),'RETENTION_REFERENCE_COLLISION');allowed.set(d.path,d);}
  return{protectedObjects,allowed,reserve,holds};
}
async function expireCompletedLocatorMetadata(c,located){
  const index=located.verified.index;if(!index.completedRetirements.length)return 0;
  const refs=await retentionReferences(c,located),blocked=new Set(refs.protectedObjects.keys());
  // Be conservative about rollback references carried by either kept snapshot.
  for(const snapshot of [index,refs.reserve?.index,...refs.holds.map(h=>h.verified.index)].filter(Boolean)){
    if(snapshot.reserve)blocked.add(snapshot.reserve.index.path);
    if(snapshot.retirement)blocked.add(snapshot.retirement.manifest.index.path);
    for(const h of snapshot.holds)blocked.add(h.index.path);
  }
  for(const entry of index.completedRetirements){
    if(blocked.has(entry.manifest.index.path))continue;
    need(!index.legacy.objects.some(d=>d.path===entry.manifest.index.path),'LEGACY_LOCATOR_EXPIRY_FORBIDDEN');
    const inventory=await retentionInventory(c);inventoryReferences(inventory,located,refs);
    need(!inventory.objects.has(entry.manifest.index.path),'COMPLETED_INDEX_REAPPEARED');
    const saved=await locatorHistoryRecord(c,entry);if(!saved)continue;
    need(entry.locatorVersion<located.row.version,'LOCATOR_EXPIRY_CURRENT_VERSION');
    await c.privacy();need(same(await currentLocator(c),located.row),'LOCATOR_CHANGED');
    const fresh=await locatorHistoryRecord(c,entry);need(fresh&&fresh.rawSha256===saved.rawSha256&&same(fresh.row,saved.row),'LOCATOR_EXPIRY_ROW_CHANGED');
    // Exact JSONB equality is part of the REST predicate, alongside ID/key/version.
    c.state.expiringLocatorRow=fresh.row;c.state.expiringLocatorEntry=entry;
    try{await c.versions(params({id:'eq.'+fresh.row.id,document_key:'eq.'+P.locatorKey,version:'eq.'+fresh.row.version,
      payload:'eq.'+encode(fresh.row.payload).toString('utf8')}),{method:'DELETE',headers:{Prefer:'return=minimal'}},'expire exact completed V3 locator metadata');
      need(await locatorHistoryRecord(c,entry)===null,'LOCATOR_EXPIRY_NOT_CONFIRMED');
      c.state.locatorHistoryRowsExpired=(c.state.locatorHistoryRowsExpired??0)+1;return 1;
    }finally{if(!c.state.unknownWrite){c.state.expiringLocatorRow=null;c.state.expiringLocatorEntry=null;}}
  }
  return 0;
}
function inventoryReferences(inventory,located,refs){
  for(const d of inventory.objects.values()){const known=refs.allowed.get(d.path);need(known&&known.bytes===d.bytes,'RETENTION_UNREFERENCED_OBJECT');}
  // Pending history originals may still be in DB. Existing frozen R2 objects,
  // cutover current originals and published late additions must remain present.
  for(const d of [...located.verified.index.legacy.objects,...located.verified.index.legacy.currents.map(r=>r.object),...located.verified.index.lateLegacy.map(r=>r.object)])
    need(inventory.objects.get(d.path)?.bytes===d.bytes,'LEGACY_OBJECT_MISSING');
}
async function retireRetention(c,located){
  const index=located.verified.index,plan=index.retirement;if(!plan)return{deletedObjects:0,settled:true};
  const refs=await retentionReferences(c,located);let inventory=await retentionInventory(c);inventoryReferences(inventory,located,refs);
  const proof=await publishedGeneration(c,plan.manifest);need(proof.version===plan.locatorVersion&&proof.version<located.row.version
    &&same(proof.payload,plan.locatorPayload),'RETIREMENT_PUBLICATION_VERSION');
  const eligible=plan.objects.filter(d=>!refs.protectedObjects.has(d.path));
  if(!inventory.objects.has(plan.manifest.index.path)){
    need(eligible.every(d=>!inventory.objects.has(d.path)),'RETIREMENT_INDEX_ABSENT_WITH_REMAINDER');return{deletedObjects:0,settled:true};
  }
  const raw=gunzipSync(await verifiedObject(c.r2(),plan.manifest.index),{maxOutputLength:2_000_000});
  need(raw.length===plan.manifest.indexRawBytes&&sha(raw)===plan.manifest.indexRawSha256,'ARCHIVE_INDEX_SHA');
  const retiring=checkGeneration(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw)));
  need(same(generationObjects(plan.manifest,retiring),plan.objects),'RETIREMENT_PLAN_CHANGED');
  const guard=await buildDraft(c);let deletedObjects=0;
  c.state.retirementPaths=new Set(eligible.map(d=>d.path));
  try{for(const d of eligible){
    need(same(await currentLocator(c),located.row),'LOCATOR_CHANGED');await c.privacy();await protect(c,guard);
    inventory=await retentionInventory(c);inventoryReferences(inventory,located,refs);
    const present=inventory.objects.get(d.path);if(!present)continue;need(present.bytes===d.bytes,'RETIREMENT_OBJECT_CHANGED');
    await verifiedObject(c.r2(),d);await c.r2().removeExact(d.path);
    const after=await retentionInventory(c);need(!after.objects.has(d.path),'RETIREMENT_DELETE_NOT_CONFIRMED');deletedObjects++;
  }}finally{if(!c.state.unknownWrite)c.state.retirementPaths=null;}
  need(same(await currentLocator(c),located.row),'LOCATOR_CHANGED');return{deletedObjects,settled:true};
}
async function retentionArchive(c,draft,automatic=false){
  const located=await discover(c);need(located.row.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3','RETENTION_LOCATOR_REQUIRED');
  const old=await restoreRetention(c,located.manifest,null,{retainRaw:true}),refs=await retentionReferences(c,{...located,verified:old});
  const inventory=await retentionInventory(c);inventoryReferences(inventory,{...located,verified:old},refs);
  need(!old.index.retirement||old.index.retirement.objects.every(d=>refs.protectedObjects.has(d.path)||!inventory.objects.has(d.path)),'RETENTION_RETIREMENT_PENDING');
  const full=await buildDraft(c);need(same(draft,automatic?automaticBatchDraft(full):full),'DRAFT_CHANGED');
  selectNewVersions([...full.core.kept,...full.core.candidates],old.index.legacy); // Ambiguity outside this batch is still a hold.
  const rawRows=new Map(),lateLegacy=[...old.index.lateLegacy];
  for(const m of old.index.retained){const r=old.rows.get(m.id);need(r?.raw,'RETAINED_ORIGINAL_REQUIRED');rawRows.set(m.id,r);}
  for(const m of draft.core.candidates){const source=await exactRow(c,m);need(source,'ARCHIVE_SOURCE_ROW_MISSING');
    const packed=packedOriginal(source.raw),r={...meta(source.row),rowBytes:source.raw.length,rowSha256:sha(source.raw),raw:source.raw,row:source.row};
    const prior=rawRows.get(r.id);need(!prior||prior.rowSha256===r.rowSha256,'ROW_PAYLOAD_CHANGED');rawRows.set(r.id,r);
    const cutoff=old.index.legacy.cutover.find(g=>g.document_key===r.document_key).version;
    if(r.version<=cutoff){const legacy=[...old.index.legacy.rows,...lateLegacy].find(v=>v.id===r.id);
      if(legacy)need(same(meta(legacy),meta(r))&&legacy.rowBytes===r.rowBytes&&legacy.rowSha256===r.rowSha256&&same(legacy.object,packed.object),'LEGACY_SOURCE_CHANGED');
      else{const current=old.index.legacy.currents.find(v=>v.document_key===r.document_key);
        need(r.version===cutoff&&!lateLegacy.some(v=>v.document_key===r.document_key)&&sha(encode(source.row.payload))===current.payloadSha256,'UNPROVEN_LEGACY_ROW');
        lateLegacy.push(rowArchiveReference(source.row,source.raw,packed));}
    }
  }
  const retained=selectNewVersions([...rawRows.values()],old.index.legacy),wanted=new Set([...retained,...draft.core.candidates].map(r=>r.id));
  const buffers=new Map(),chunks=[];for(const r of [...rawRows.values()].filter(r=>wanted.has(r.id)).sort((a,b)=>a.id-b.id)){
    const packed=packedOriginal(r.raw);buffers.set(packed.object.path,packed.wire);
    chunks.push({...packed.object,rawBytes:packed.rawBytes,rawSha256:packed.rawSha256,rows:[{...meta(r),rowBytes:r.rowBytes,rowSha256:r.rowSha256}]});
  }
  let retirement=null;if(old.index.reserve){const previous=await restoreRetention(c,old.index.reserve),proof=await publishedGeneration(c,old.index.reserve);
    retirement={manifest:old.index.reserve,objects:generationObjects(old.index.reserve,previous.index),locatorVersion:proof.version,locatorPayload:proof.payload};}
  const completedRetirements=await nextCompletedRetirements(c,old.index,inventory);
  const index={kind:'ADMIN_HISTORY_GENERATION_V3',bucket:P.bucket,transition:'CAPTURE',selection:automatic?'OLDEST_25':'FULL',draft,legacy:old.index.legacy,lateLegacy,retained,chunks,
    reserve:located.manifest,retirement,completedRetirements,parent:{version:located.row.version,indexSha256:located.row.payload.indexSha256},holds:old.index.holds};
  return storedGeneration(c,index,buffers,inventory);
}
async function qualifyRetentionPublish(c,manifest,verified,before){
  const index=verified.index;need(before&&same(index.parent,{version:before.version,indexSha256:before.payload.indexSha256}),'GENERATION_PARENT_CHANGED');
  const prepared=await preparationRecord(c);need(prepared&&prepared.payload.targetIndexSha256===manifest.index.sha256
    &&prepared.payload.parentVersion===before.version&&prepared.payload.parentIndexSha256===before.payload.indexSha256,'POSITIVE_PREPARATION_REQUIRED');
  const preparation=await readPreparation(c,prepared.payload);need(same(preparation.manifest,manifest)&&same(preparation.index,index),'PREPARATION_PLAN_CHANGED');
  const full=await buildDraft(c);
  if(index.transition==='INITIALIZE'){
    need(before.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2'&&same(index.legacy.cutover,full.core.guards),'LEGACY_TRANSITION_CHANGED');
    const wanted=[...full.core.kept,...full.core.candidates].sort((a,b)=>a.id-b.id);
    need(same(index.legacy.rows.map(meta),wanted),'LEGACY_INVENTORY_CHANGED');
    for(const r of index.legacy.rows){const original=await exactRow(c,meta(r));need(original&&original.raw.length===r.rowBytes&&sha(original.raw)===r.rowSha256
      &&same(packedOriginal(original.raw).object,r.object),'LEGACY_SOURCE_CHANGED');}
    for(const r of index.legacy.currents){const original=await c.exactCurrent(r.document_key);
      need(original.rows?.length===1&&original.raw.length===r.rowBytes&&sha(original.raw)===r.rowSha256
        &&same(packedOriginal(original.raw,'ADMIN_HISTORY_CURRENT_REST_RESPONSE_V1').object,r.object),'LEGACY_CURRENT_CHANGED');
      await verifiedObject(c.r2(),r.object);}
    const inventory=await retentionInventory(c),allowed=new Map(index.legacy.objects.map(d=>[d.path,d]));
    for(const d of [...index.legacy.currents.map(r=>r.object),manifest.index,prepared.payload.preparation])allowed.set(d.path,d);
    const unresolved=await unresolvedPreparation(c);if(unresolved&&inventory.objects.has(unresolved.payload.preparation.path)){
      const d=unresolved.payload.preparation;allowed.set(d.path,d);}
    need(inventory.objects.size===allowed.size&&[...inventory.objects.values()].every(d=>allowed.get(d.path)?.bytes===d.bytes),'LEGACY_BUCKET_CHANGED');
    reserveUpload(c,inventory,index,[]);return;
  }
  need(before.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3','RETENTION_LOCATOR_REQUIRED');
  const old=await restoreRetention(c,locatorManifest(before.payload));
  selectNewVersions([...full.core.kept,...full.core.candidates],old.index.legacy);
  need(same(index.legacy,old.index.legacy)&&same(index.holds,old.index.holds)&&same(index.reserve,locatorManifest(before.payload)),'RETENTION_REFERENCE_CHANGED');
  need(same(index.draft,index.selection==='OLDEST_25'?automaticBatchDraft(full):full),'DRAFT_CHANGED');
  const wanted=new Map(old.index.retained.map(r=>[r.id,r]));for(const r of index.draft.core.candidates){const existing=wanted.get(r.id);need(!existing||same(existing,r),'GENERATION_DUPLICATE_ID');wanted.set(r.id,r);}
  need(same(index.retained,selectNewVersions([...wanted.values()],index.legacy)),'RETAINED_VERSION_SET');
  for(const r of old.index.retained){if(!wanted.has(r.id)||!index.retained.some(m=>m.id===r.id))continue;const oldRow=old.rows.get(r.id),newRow=verified.rows.get(r.id);
    need(oldRow&&newRow&&oldRow.rowBytes===newRow.rowBytes&&oldRow.rowSha256===newRow.rowSha256,'RETAINED_ORIGINAL_CHANGED');}
  for(const r of index.draft.core.candidates){const original=await exactRow(c,r),archived=verified.rows.get(r.id);
    need(original&&archived&&original.raw.length===archived.rowBytes&&sha(original.raw)===archived.rowSha256,'ROW_PAYLOAD_CHANGED');}
  for(const r of old.index.lateLegacy)need(index.lateLegacy.some(n=>same(n,r)),'LEGACY_REFERENCE_LOST');
  for(const r of index.lateLegacy.filter(r=>!old.index.lateLegacy.some(n=>n.id===r.id))){
    const original=await exactRow(c,meta(r)),current=index.legacy.currents.find(m=>m.document_key===r.document_key);
    need(original&&r.version===current.version&&sha(encode(original.row.payload))===current.payloadSha256
      &&r.rowBytes===original.raw.length&&r.rowSha256===sha(original.raw)&&same(r.object,packedOriginal(original.raw).object),'UNPROVEN_LEGACY_ROW');}
  let retirement=null;if(old.index.reserve){const previous=await restoreRetention(c,old.index.reserve),proof=await publishedGeneration(c,old.index.reserve);
    retirement={manifest:old.index.reserve,objects:generationObjects(old.index.reserve,previous.index),locatorVersion:proof.version,locatorPayload:proof.payload};}
  need(same(index.retirement,retirement),'RETIREMENT_PLAN_CHANGED');
  // Nothing outside the exact original state plus this fully verified transient
  // can silently become a new managed object at publication.
  const refs=await retentionReferences(c,{row:before,manifest:locatorManifest(before.payload),verified:old}),inventory=await retentionInventory(c);
  for(const d of generationObjects(manifest,index))refs.allowed.set(d.path,d);
  refs.allowed.set(prepared.payload.preparation.path,prepared.payload.preparation);
  inventoryReferences(inventory,{verified:old},refs);reserveUpload(c,inventory,index,[]);
  need(same(index.completedRetirements,await nextCompletedRetirements(c,old.index,inventory)),'COMPLETED_METADATA_CHANGED');
}
async function maintainRetention(c){
  const located=await discover(c),retired=await retireRetention(c,located);
  await expireCompletedLocatorMetadata(c,located);
  if(retired.deletedObjects){c.state.retiredObjects=(c.state.retiredObjects??0)+retired.deletedObjects;
    return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',candidateRows:0,confirmedAbsentAfterWrite:0,
      retiredArchiveObjects:retired.deletedObjects,remainingCandidates:(await buildDraft(c)).core.candidates.length,archiveRequired:false};}
  const full=await buildDraft(c),draft=automaticBatchDraft(full);
  if(!draft.core.candidates.length){await protect(c,draft);return{status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',candidateRows:0,confirmedAbsentAfterWrite:0,remainingCandidates:0,archiveRequired:false};}
  const manifest=await retentionArchive(c,draft,true),locator=await publishLocator(c,manifest),pruned=await prune(c,null,25);
  const final=await discover(c),after=await retireRetention(c,final);c.state.retiredObjects=(c.state.retiredObjects??0)+after.deletedObjects;
  return{...pruned,status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',candidateRows:draft.core.candidates.length,
    eligibleRowsBefore:full.core.candidates.length,remainingCandidates:(await buildDraft(c)).core.candidates.length,
    locatorVersion:locator.version,indexSha256:locator.payload.indexSha256,archiveRequired:true,retiredArchiveObjects:after.deletedObjects};
}
export async function runAdminDocumentHistoryMaintenance({mode='plan',workdir,limit=25,confirmation=null,indexSha=null}={},
  {env=process.env,fetchImpl=globalThis.fetch}={}){
  need(['plan','archive','publish-locator','discover','restore','prune','maintain','initialize-retention'].includes(mode),'MODE');
  need(indexSha===null||['discover','restore'].includes(mode),'LOCATOR_SELECTOR_MODE');
  if(mode==='maintain')need(limit===25&&confirmation==='MAINTAIN-EXACT-THREE-DOCUMENT-HISTORY','AUTOMATIC_MAINTENANCE_SCOPE');
  if(mode==='initialize-retention')need(limit===25&&confirmation==='INITIALIZE-EXACT-THREE-DOCUMENT-RETENTION','RETENTION_INITIALIZATION_CONFIRMATION');
  const root=await privateDirectory(workdir),c=clients({env,fetchImpl,resolveUnknownWrites:mode==='maintain'});
  return c.safe(async()=>{
    let result;
    if(mode==='initialize-retention')result=await initializeRetention(c);
    else if(mode==='maintain'){
      await c.privacy();const prepared=await preparationRecord(c),active=await currentLocator(c);
      if(prepared)result=await recoverPreparation(c,prepared);
      else if((result=await beginUnresolvedCleanup(c))!==null){}
      else if(active?.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3')result=await maintainRetention(c);
      else{
      // This is the existing V2 chain, not a second deletion implementation.
      await c.privacy();const fullDraft=await buildDraft(c),draft=automaticBatchDraft(fullDraft);
      await writePrivate(root,'draft.json',draft);
      if(!draft.core.candidates.length){
        await protect(c,draft);result={status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',candidateRows:0,
          confirmedAbsentAfterWrite:0,remainingCandidates:0,archiveRequired:false};
      }else{
        const manifest=await archive(c,draft,true);await writePrivate(root,'archive-manifest.json',manifest);
        const locator=await publishLocator(c,manifest);
        // prune independently discovers the durable locator, authenticates every archived
        // original row, and refreshes current/top5/ACL before its first exact DELETE.
        const pruned=await prune(c,null,25),remaining=await buildDraft(c);
        result={...pruned,status:'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED',candidateRows:draft.core.candidates.length,
          eligibleRowsBefore:fullDraft.core.candidates.length,remainingCandidates:remaining.core.candidates.length,
          locatorVersion:locator.version,indexSha256:locator.payload.indexSha256,archiveRequired:true};
      }
      }
    }else if(mode==='plan'){
      const draft=await buildDraft(c);await writePrivate(root,'draft.json',draft);
      result={status:'READ_ONLY_DRAFT',draftDigest:draft.digest,candidateRows:draft.core.candidates.length,keptHistoryRows:draft.core.kept.length};
    }else if(mode==='archive'){
      const draft=checkDraft(await readPrivate(root,'draft.json')),active=await currentLocator(c);
      const manifest=active?.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3'?await retentionArchive(c,draft):await archive(c,draft);
      await writePrivate(root,'archive-manifest.json',manifest);result={status:'FIXED_BUCKET_ARCHIVE_AND_READONLY_ROUNDTRIP_VERIFIED',candidateRows:draft.core.candidates.length,manifestSha256:sha(encode(manifest))};
    }else if(mode==='publish-locator'){
      need(confirmation==='PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR','LOCATOR_PUBLISH_CONFIRMATION');
      const row=await publishLocator(c,await readPrivate(root,'archive-manifest.json'));
      result={status:'DURABLE_PRIVATE_LOCATOR_CAS_AND_RESTORE_VERIFIED',locatorVersion:row.version,indexSha256:row.payload.indexSha256};
    }else if(mode==='discover'||mode==='restore'){
      const restoredFiles=[];
      const onChunk=mode==='restore'?async(chunk,compressed)=>{
        const name='restore-'+chunk.sha256+'.jsonl.gz',file=path.join(root,name);
        try{await fs.writeFile(file,compressed,{flag:'wx',mode:0o600});}
        catch(e){if(e.code!=='EEXIST')throw e;const stat=await fs.lstat(file);need(stat.isFile()&&!stat.isSymbolicLink()&&stat.size===chunk.bytes,'RESTORE_OUTPUT_IDENTITY');need(sha(await fs.readFile(file))===chunk.sha256,'RESTORE_OUTPUT_SHA');}
        restoredFiles.push({file:name,bytes:chunk.bytes,sha256:chunk.sha256,rows:chunk.rows.length});
      }:null;
      const located=await discover(c,indexSha,onChunk);
      if(mode==='restore')await writePrivate(root,'restore-receipt.json',{indexSha256:located.row.payload.indexSha256,rows:located.verified.rows.size,files:restoredFiles,privateCompressedFullRows:true,exactRestResponseBytes:true,productionDatabaseWritten:false});
      result={status:mode==='restore'?'CENTRAL_DISCOVERY_READONLY_FULL_ROW_RESTORE_VERIFIED':'DURABLE_PRIVATE_LOCATOR_DISCOVERED_AND_RESTORED',rows:located.verified.rows.size,privateCompressedRestoreFiles:restoredFiles.length,locatorVersion:located.row.version,indexSha256:located.row.payload.indexSha256};
    }else{
      need(confirmation==='PRUNE-EXACT-THREE-DOCUMENT-HISTORY','PRUNE_CONFIRMATION');result=await prune(c,null,limit);
    }
    return{...result,mode,privacyHttpStatus:c.state.privacyHttpStatus,privacyStage:c.state.privacyStage,wireWrites:c.state.wireWrites,currentDocumentsWritten:false,protectedOtherKeysWritten:false,
      archiveObjectsDeleted:(c.state.retiredObjects??0)+(c.state.preparationMetadataObjectsDeleted??0)+(c.state.unresolvedPreparationObjectsDeleted??0)>0,
      preparationMetadataObjectsDeleted:c.state.preparationMetadataObjectsDeleted??0,
      preparationPointerBytes:c.state.preparationPointerBytes??0,preparationMetadataBytes:c.state.preparationMetadataBytes??0,
      preparationDocumentWritten:c.state.preparationDocumentWritten===true,
      unresolvedPreparationDocumentWritten:c.state.unresolvedPreparationDocumentWritten===true,
      unresolvedPreparationObjectsDeleted:c.state.unresolvedPreparationObjectsDeleted??0,
      unresolvedPreparationPointerBytes:c.state.unresolvedPreparationPointerBytes??0,
      unresolvedPreparationReservedBytes:c.state.unresolvedPreparation?.payload.preparation.bytes??0,
      preparedReservationBytes:c.state.preparedReservationBytes??0,retentionReservedBytes:c.state.retentionReservedBytes??0,
      locatorHistoryRowsExpired:c.state.locatorHistoryRowsExpired??0,
      protectedOtherKeysScope:'OUTSIDE_THREE_DOCUMENT_KEYS_AND_THREE_OWNED_METADATA_KEYS',
      locatorDocumentWritten:c.state.locatorDocumentWritten===true,adminDecodedReadBytes:c.state.adminDecodedBytes,declaredAdminContentLengthBytes:c.state.declaredAdminContentLengthBytes,adminResponses:c.state.adminResponses,r2ReadBytes:c.state.r2ReadBytes,fullDatabaseBackupVerified:false,productionDbRestoreExecuted:false,freeReady:false,sourceAdmission:false};
  });
}
async function main(){
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i++){
    const a=args[i];if(['--plan','--archive','--publish-locator','--discover','--restore','--prune','--maintain','--initialize-retention'].includes(a)){need(!options.mode,'ONE_MODE');options.mode=a.slice(2);}
    else if(a==='--workdir')options.workdir=args[++i];else if(a==='--limit')options.limit=Number(args[++i]);
    else if(a==='--confirm')options.confirmation=args[++i];else if(a==='--index-sha')options.indexSha=args[++i];else fail('CLI_ARGUMENT');
  }
  need(options.workdir,'PRIVATE_DIRECTORY_REQUIRED');console.log(JSON.stringify(await runAdminDocumentHistoryMaintenance(options)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(e=>{console.error(JSON.stringify({status:'FAILED_CLOSED',code:typeof e.code==='string'&&/^[A-Z_]+$/.test(e.code)?e.code:'OPERATION_FAILED',operation:e.safeOperation??null,...(Number.isInteger(e.httpStatus)&&e.httpStatus>=100&&e.httpStatus<=599?{httpStatus:e.httpStatus}:{}),privacyHttpStatus:Number.isInteger(e.privacyHttpStatus)&&e.privacyHttpStatus>=100&&e.privacyHttpStatus<=599?e.privacyHttpStatus:null,privacyStage:PRIVACY_STAGES.includes(e.privacyStage)?e.privacyStage:null}));process.exitCode=1;});
