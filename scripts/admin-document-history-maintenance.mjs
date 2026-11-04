import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {createSupabaseAdminRequester} from './lib/supabase-admin-rest.mjs';
import {createR2PrivateRuntimeStorage} from './lib/r2-private-runtime-storage.mjs';
import {PRIVATE_STUDY_ADMIN_ACCESS_SQL,assertPrivateStudyAdminAccess} from './lib/private-trip-study-admin-transport.mjs';

export const ADMIN_HISTORY_POLICY=Object.freeze({
  keys:Object.freeze(['rdks-documentation-center','handbook','handbook-source-baseline']),
  keep:5,locatorKey:'admin-document-history-archive-locator',project:'https://afqhhdrkjfjtpadntdzo.supabase.co',
  bucket:'ravradar-admin-history-archive',weatherBucket:'ravradar-private-production-runtime',
  maximumBucketBytes:2_000_000_000,maximumObjectBytes:50_000_000,
  maximumRowBytes:32_000_000,maximumChunkRawBytes:16_000_000,
  maximumRowsPerKey:1_000,maximumPruneRows:600,maximumOperationMs:20*60_000,
  maximumAdminDecodedBytes:2_000_000_000,maximumArchiveRawBytes:2_000_000_000,
});
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
  has_table_privilege('service_role','public.admin_document_versions','DELETE')) as history_access
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
  let exactResponse=null; // Only one bounded full-row response is retained, never all payloads.
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
    need(!(db&&['PUT','HEAD'].includes(method))&&!(r2&&method==='DELETE'),'WRITE_SURFACE');
    if(db&&method==='DELETE'){
      need(u.pathname==='/rest/v1/admin_document_versions','CURRENT_DOCUMENT_WRITE_FORBIDDEN');
      const q=u.searchParams;need([...q.keys()].sort().join(',')==='document_key,id,version'
        &&allowed(q.get('document_key')?.slice(3))&&q.get('document_key')?.startsWith('eq.')
        &&/^eq\.[1-9][0-9]*$/.test(q.get('id')||'')&&/^eq\.[1-9][0-9]*$/.test(q.get('version')||''),'EXACT_DELETE_FILTER');
    }
    if(db&&['POST','PATCH'].includes(method)){
      need(u.pathname==='/rest/v1/admin_documents','LOCATOR_WRITE_ONLY');const q=u.searchParams,b=JSON.parse(options.body);
      if(method==='POST'){fields(b,['document_key','payload','updated_by'],'LOCATOR_INSERT_FIELDS');need(b.document_key===P.locatorKey&&q.get('on_conflict')==='document_key','LOCATOR_INSERT_KEY');}
      else{fields(b,['payload','updated_by'],'LOCATOR_PATCH_FIELDS');need(q.get('document_key')==='eq.'+P.locatorKey&&/^eq\.[1-9][0-9]*$/.test(q.get('version')||''),'LOCATOR_CAS_FILTER');}
      need(b.updated_by===null,'LOCATOR_AUTHOR');checkLocator(b.payload);
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
        return new Response([204,205,304].includes(response.status)?null:raw,{status:response.status,headers:response.headers});
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
  // Unknown writes are never repeated. The automatic pass may only classify the last
  // request through authenticated reads; even a verified outcome stops all further writes.
  const resolveUnknown=async()=>{
    const pending=state.pendingMutation;if(!pending)return 'UNRESOLVED';
    try{
      const u=new URL(pending.url);
      if(u.origin===P.project){
        await privacy();
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
          const body=JSON.parse(pending.body),rows=await current(params({document_key:'eq.'+P.locatorKey,select:'document_key,payload,version',limit:'2'}));
          need(Array.isArray(rows)&&rows.length<=1,'LOCATOR_ROW_INVALID');
          if(!rows.length)return 'LOCATOR_ABSENT';
          const row=rows[0];fields(row,['document_key','payload','version'],'LOCATOR_ROW_FIELDS');
          need(row.document_key===P.locatorKey&&positive(row.version),'LOCATOR_ROW_INVALID');checkLocator(row.payload);
          return same(row.payload,body.payload)?'LOCATOR_PAYLOAD_PRESENT_VERIFIED':'UNRESOLVED';
        }
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
  const r2=()=>createR2PrivateRuntimeStorage({accountId:env.RAVRADAR_R2_ACCOUNT_ID,
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
      state.privacyStage='RESPONSE_FIELDS';fields(rows[0],['metadata','version_metadata','current_access','history_access'],'LOCATOR_PRIVACY_FIELDS');
      state.privacyStage='SERVICE_ROLE_ACCESS';need(rows[0].current_access===true&&rows[0].history_access===true,'SERVICE_ROLE_HISTORY_ACCESS_UNVERIFIED');
      state.privacyStage='CURRENT_METADATA';assertPrivateStudyAdminAccess([{metadata:rows[0].metadata}]);
      state.privacyStage='HISTORY_POLICY_NAMES';const version=rows[0].version_metadata;need(Array.isArray(version?.policies)&&version.policies.length===2,'LOCATOR_PRIVACY_UNVERIFIED');
      const aliases={'ravradar_admin_document_versions_read':'ravradar_admin_documents_read','ravradar_ravscore_checkpoint_versions_no_direct_read':'ravradar_ravscore_checkpoint_no_direct_read'};
      need(version.policies.every(p=>Object.hasOwn(aliases,p.name)),'LOCATOR_PRIVACY_UNVERIFIED');
      state.privacyStage='HISTORY_METADATA';assertPrivateStudyAdminAccess([{metadata:{...version,policies:version.policies.map(p=>({...p,name:aliases[p.name]}))}}]);
      state.privacyStage='VERIFIED';
    }catch(e){if(e.code==='SERVICE_ROLE_HISTORY_ACCESS_UNVERIFIED')throw e;fail('LOCATOR_PRIVACY_UNVERIFIED');}
  };
  return{current,versions,exactVersions,r2,safe,state,privacy};
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
  need([401,403,404].includes(await storage.anonymousStatus(descriptor.path)),'ARCHIVE_NOT_PRIVATE');return b;
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
  need(p.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2'&&p.bucket===P.bucket&&hash(p.indexSha256)
    &&p.indexPath===objectPath(p.indexSha256)&&positive(p.indexBytes)&&p.indexBytes<=P.maximumObjectBytes
    &&positive(p.indexRawBytes)&&p.indexRawBytes<=2_000_000&&hash(p.indexRawSha256)&&hash(p.draftDigest),'LOCATOR_INVALID');return p;
}
const locatorPayload=(m,digest)=>checkLocator({kind:'ADMIN_HISTORY_ARCHIVE_LOCATOR_V2',bucket:P.bucket,
  indexPath:m.index.path,indexSha256:m.index.sha256,indexBytes:m.index.bytes,
  indexRawBytes:m.indexRawBytes,indexRawSha256:m.indexRawSha256,draftDigest:digest});
const locatorManifest=p=>({kind:'ADMIN_HISTORY_MANIFEST_V2',index:{path:p.indexPath,sha256:p.indexSha256,bytes:p.indexBytes},
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
  if(!before||!same(before.payload,payload)){
    const inserted=!before,query=inserted
      ?{on_conflict:'document_key',select:'document_key,payload,version'}
      :{document_key:'eq.'+P.locatorKey,version:'eq.'+before.version,select:'document_key,payload,version'};
    const body=inserted?{document_key:P.locatorKey,payload,updated_by:null}:{payload,updated_by:null};
    const rows=await c.current(params(query),{method:inserted?'POST':'PATCH',headers:{Prefer:inserted?'resolution=ignore-duplicates,return=representation':'return=representation'},body:JSON.stringify(body)},'private archive locator CAS');
    need(Array.isArray(rows)&&rows.length===1&&rows[0].version===(inserted?1:before.version+1),'LOCATOR_CAS_FAILED');
  }
  const fresh=await currentLocator(c);need(fresh&&same(fresh.payload,payload),'LOCATOR_READBACK');
  const restored=await restore(c,locatorManifest(fresh.payload));need(restored.draft.digest===fresh.payload.draftDigest,'LOCATOR_DRAFT_BINDING');
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
export async function runAdminDocumentHistoryMaintenance({mode='plan',workdir,limit=25,confirmation=null,indexSha=null}={},
  {env=process.env,fetchImpl=globalThis.fetch}={}){
  need(['plan','archive','publish-locator','discover','restore','prune','maintain'].includes(mode),'MODE');
  need(indexSha===null||['discover','restore'].includes(mode),'LOCATOR_SELECTOR_MODE');
  if(mode==='maintain')need(limit===25&&confirmation==='MAINTAIN-EXACT-THREE-DOCUMENT-HISTORY','AUTOMATIC_MAINTENANCE_SCOPE');
  const root=await privateDirectory(workdir),c=clients({env,fetchImpl,resolveUnknownWrites:mode==='maintain'});
  return c.safe(async()=>{
    let result;
    if(mode==='maintain'){
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
    }else if(mode==='plan'){
      const draft=await buildDraft(c);await writePrivate(root,'draft.json',draft);
      result={status:'READ_ONLY_DRAFT',draftDigest:draft.digest,candidateRows:draft.core.candidates.length,keptHistoryRows:draft.core.kept.length};
    }else if(mode==='archive'){
      const draft=checkDraft(await readPrivate(root,'draft.json')),manifest=await archive(c,draft);
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
      archiveObjectsDeleted:false,locatorDocumentWritten:['publish-locator','maintain'].includes(mode)&&c.state.wireWrites>0,adminDecodedReadBytes:c.state.adminDecodedBytes,declaredAdminContentLengthBytes:c.state.declaredAdminContentLengthBytes,adminResponses:c.state.adminResponses,r2ReadBytes:c.state.r2ReadBytes,fullDatabaseBackupVerified:false,productionDbRestoreExecuted:false,freeReady:false,sourceAdmission:false};
  });
}
async function main(){
  const args=process.argv.slice(2),options={};
  for(let i=0;i<args.length;i++){
    const a=args[i];if(['--plan','--archive','--publish-locator','--discover','--restore','--prune','--maintain'].includes(a)){need(!options.mode,'ONE_MODE');options.mode=a.slice(2);}
    else if(a==='--workdir')options.workdir=args[++i];else if(a==='--limit')options.limit=Number(args[++i]);
    else if(a==='--confirm')options.confirmation=args[++i];else if(a==='--index-sha')options.indexSha=args[++i];else fail('CLI_ARGUMENT');
  }
  need(options.workdir,'PRIVATE_DIRECTORY_REQUIRED');console.log(JSON.stringify(await runAdminDocumentHistoryMaintenance(options)));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(e=>{console.error(JSON.stringify({status:'FAILED_CLOSED',code:typeof e.code==='string'&&/^[A-Z_]+$/.test(e.code)?e.code:'OPERATION_FAILED',operation:e.safeOperation??null,privacyHttpStatus:Number.isInteger(e.privacyHttpStatus)&&e.privacyHttpStatus>=100&&e.privacyHttpStatus<=599?e.privacyHttpStatus:null,privacyStage:PRIVACY_STAGES.includes(e.privacyStage)?e.privacyStage:null}));process.exitCode=1;});
