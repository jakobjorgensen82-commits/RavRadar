import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {captureLocalDatabaseBackup,verifyLocalDatabaseBackup,materializeLocalDatabaseBackup,DB_LOCAL_CARRIER_POLICY as LOCAL} from './seal-supabase-database-export.mjs';
import {createR2PrivateRuntimeStorage} from './lib/r2-private-runtime-storage.mjs';
import {createSupabaseAdminRequester} from './lib/supabase-admin-rest.mjs';
import {PRIVATE_STUDY_ADMIN_ACCESS_SQL,assertPrivateStudyAdminAccess} from './lib/private-trip-study-admin-transport.mjs';

export const DB_REMOTE_BACKUP_POLICY=Object.freeze({project:'https://afqhhdrkjfjtpadntdzo.supabase.co',bucket:'ravradar-supabase-backup',
  locatorKey:'supabase-database-backup-locator',maximumObjectBytes:50_000_000,maximumCipherBytes:36_000_000,
  maximumFrameJsonBytes:48_100_000,maximumBucketBytes:2_000_000_000,maximumMetadataBytes:64*1024,maximumMs:20*60_000});
export const DB_BOOTSTRAP_POLICY=Object.freeze({maximumListedObjects:512,maximumListBytes:2*1024*1024,maximumCandidates:64,maximumIndexWireBytes:128*1024,maximumCandidateBytes:8*1024*1024,maximumSearchMs:120_000});
const B=DB_BOOTSTRAP_POLICY,P=DB_REMOTE_BACKUP_POLICY,INDEX_PURPOSE=LOCAL.purpose+'/INDEX',INDEX_MAGIC=Buffer.from('RR-SUPABASE-DB-INDEX-1\n'),SELF_INDEX_MAGIC=Buffer.from('RR-SUPABASE-DB-INDEX-2\n');
const NAMES=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const encode=x=>Buffer.from(JSON.stringify(x),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),same=(a,b)=>encode(a).equals(encode(b));
const fail=code=>{const e=new Error(code);e.code=code;throw e;},need=(v,c)=>{if(!v)fail(c);},positive=n=>Number.isSafeInteger(n)&&n>0,hash=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const parse=(b,c)=>{try{return JSON.parse(b.toString('utf8'));}catch{fail(c);}};
function fields(x,names,c){need(x&&typeof x==='object'&&!Array.isArray(x)&&same(Object.keys(x).sort(),[...names].sort()),c);}
const objectPath=h=>'bundles/sha256/'+h+'.json.gz';
function checkContext(c){fields(c,['purpose','project','repository','sourceHead','runId','runAttempt'],'DB_CONTEXT_FIELDS');
  need(c.purpose===LOCAL.purpose&&c.project===LOCAL.project&&c.repository===LOCAL.repository&&typeof c.sourceHead==='string'&&/^[0-9a-f]{40}$/.test(c.sourceHead)
    &&typeof c.runId==='string'&&/^[1-9][0-9]*$/.test(c.runId)&&typeof c.runAttempt==='string'&&/^[1-9][0-9]*$/.test(c.runAttempt),'DB_CONTEXT');return c;}
function checkObject(x){fields(x,['path','sha256','bytes'],'OBJECT_FIELDS');need(hash(x.sha256)&&x.path===objectPath(x.sha256)&&positive(x.bytes)&&x.bytes<=P.maximumObjectBytes,'OBJECT_DESCRIPTOR');return x;}
function checkPointer(x){fields(x,['kind','bucket','index','context','exportReceiptSha256','manifestSha256'],'LOCATOR_FIELDS');
  need(x.kind==='SUPABASE_DB_BACKUP_LOCATOR_V1'&&x.bucket===P.bucket&&hash(x.exportReceiptSha256)&&hash(x.manifestSha256),'LOCATOR_INVALID');checkObject(x.index);checkContext(x.context);return x;}
function frame(kind,bytes){need(Buffer.isBuffer(bytes)&&bytes.length>0,'FRAME_INPUT');
  const maximum=kind==='SQL_CIPHERTEXT'?P.maximumCipherBytes:P.maximumMetadataBytes;
  need(bytes.length<=maximum&&4*Math.ceil(bytes.length/3)+512<=P.maximumFrameJsonBytes,'FRAME_INPUT_BOUND');
  const raw=encode({kind:'SUPABASE_DB_'+kind+'_FRAME_V1',bytes:bytes.length,sha256:sha(bytes),data:bytes.toString('base64')});
  need(raw.length<=P.maximumFrameJsonBytes,'FRAME_JSON_BOUND');const body=gzipSync(raw,{level:1});need(body.length<=P.maximumObjectBytes,'WIRE_OBJECT_BOUND');return body;}
function unframe(kind,body){need(Buffer.isBuffer(body)&&body.length>0&&body.length<=P.maximumObjectBytes,'WIRE_OBJECT_BOUND');
  let raw;try{raw=gunzipSync(body,{maxOutputLength:kind==='SQL_CIPHERTEXT'?P.maximumFrameJsonBytes:100_000});}catch{fail('FRAME_GZIP');}
  const x=parse(raw,'FRAME_JSON');fields(x,['kind','bytes','sha256','data'],'FRAME_FIELDS');const maximum=kind==='SQL_CIPHERTEXT'?P.maximumCipherBytes:P.maximumMetadataBytes;
  need(x.kind==='SUPABASE_DB_'+kind+'_FRAME_V1'&&positive(x.bytes)&&x.bytes<=maximum&&hash(x.sha256)&&typeof x.data==='string'&&x.data.length===4*Math.ceil(x.bytes/3),'FRAME_INVALID');
  const binary=Buffer.from(x.data,'base64');need(binary.length===x.bytes&&binary.toString('base64')===x.data&&sha(binary)===x.sha256,'FRAME_BINARY_SHA');return binary;}
function indexAad(pointer){return encode({purpose:INDEX_PURPOSE,context:checkContext(pointer.context),exportReceiptSha256:pointer.exportReceiptSha256,manifestSha256:pointer.manifestSha256});}
function indexKey(env,salt){need(typeof env.SUPABASE_SERVICE_ROLE_KEY==='string'&&env.SUPABASE_SERVICE_ROLE_KEY.length>=32,'EXISTING_MASTER_REQUIRED');
  return Buffer.from(crypto.hkdfSync('sha256',Buffer.from(env.SUPABASE_SERVICE_ROLE_KEY),salt,Buffer.from(`RavRadar/${LOCAL.repository}/${INDEX_PURPOSE}`),32));}
function headerBytes(pointer){return encode({kind:'SUPABASE_DB_INDEX_HEADER_V2',purpose:INDEX_PURPOSE,context:checkContext(pointer.context),exportReceiptSha256:pointer.exportReceiptSha256,manifestSha256:pointer.manifestSha256});}
function envelopeSize(raw,pointer){return SELF_INDEX_MAGIC.length+4+headerBytes(pointer).length+44+raw.length;}
function sealIndex(raw,pointer,env){const header=headerBytes(pointer);need(header.length<=4096&&envelopeSize(raw,pointer)<=P.maximumMetadataBytes,'INDEX_BOUND');
  const size=Buffer.alloc(4);size.writeUInt32BE(header.length);const salt=crypto.randomBytes(16),nonce=crypto.randomBytes(12),prefix=Buffer.concat([SELF_INDEX_MAGIC,size,header,salt,nonce]);
  const cipher=crypto.createCipheriv('aes-256-gcm',indexKey(env,salt),nonce);cipher.setAAD(prefix);return Buffer.concat([prefix,cipher.update(raw),cipher.final(),cipher.getAuthTag()]);}
function selfIndexHeader(bytes){need(bytes.subarray(0,SELF_INDEX_MAGIC.length).equals(SELF_INDEX_MAGIC)&&bytes.length>SELF_INDEX_MAGIC.length+4+44&&bytes.length<=P.maximumMetadataBytes,'INDEX_ENVELOPE');
  const at=SELF_INDEX_MAGIC.length,size=bytes.readUInt32BE(at),end=at+4+size;need(size>0&&size<=4096&&bytes.length>end+44,'INDEX_HEADER_BOUND');
  const h=parse(bytes.subarray(at+4,end),'INDEX_HEADER_JSON');fields(h,['kind','purpose','context','exportReceiptSha256','manifestSha256'],'INDEX_HEADER_FIELDS');
  need(h.kind==='SUPABASE_DB_INDEX_HEADER_V2'&&h.purpose===INDEX_PURPOSE&&hash(h.exportReceiptSha256)&&hash(h.manifestSha256),'INDEX_HEADER');checkContext(h.context);
  return{pointer:{kind:'SUPABASE_DB_BACKUP_LOCATOR_V1',bucket:P.bucket,index:null,context:h.context,exportReceiptSha256:h.exportReceiptSha256,manifestSha256:h.manifestSha256},end};}
function openLegacyIndex(bytes,pointer,env){need(bytes.subarray(0,INDEX_MAGIC.length).equals(INDEX_MAGIC)&&bytes.length>INDEX_MAGIC.length+44&&bytes.length<=P.maximumMetadataBytes,'INDEX_ENVELOPE');const at=INDEX_MAGIC.length;
  const decipher=crypto.createDecipheriv('aes-256-gcm',indexKey(env,bytes.subarray(at,at+16)),bytes.subarray(at+16,at+28));decipher.setAAD(indexAad(pointer));decipher.setAuthTag(bytes.subarray(-16));
  try{return Buffer.concat([decipher.update(bytes.subarray(at+28,-16)),decipher.final()]);}catch{fail('INDEX_GCM_AUTHENTICATION');}}
function openIndex(bytes,pointer,env){if(bytes.subarray(0,INDEX_MAGIC.length).equals(INDEX_MAGIC))return openLegacyIndex(bytes,pointer,env);
  const header=selfIndexHeader(bytes);need(pointer&&indexAad(header.pointer).equals(indexAad(pointer)),'INDEX_GCM_AUTHENTICATION');const at=header.end;
  const decipher=crypto.createDecipheriv('aes-256-gcm',indexKey(env,bytes.subarray(at,at+16)),bytes.subarray(at+16,at+28));
  decipher.setAAD(bytes.subarray(0,at+28));decipher.setAuthTag(bytes.subarray(-16));
  try{return Buffer.concat([decipher.update(bytes.subarray(at+28,-16)),decipher.final()]);}catch{fail('INDEX_GCM_AUTHENTICATION');}}
async function privateDirectory(env){need(typeof env.RUNNER_TEMP==='string'&&path.isAbsolute(env.RUNNER_TEMP),'PRIVATE_TEMP_REQUIRED');const temp=await fs.realpath(env.RUNNER_TEMP);
  for(const parent of new Set([path.resolve(env.RUNNER_TEMP),temp]))for(let at=parent;;at=path.dirname(at)){const s=await fs.lstat(at);need(s.isDirectory()&&!s.isSymbolicLink(),'PRIVATE_DIRECTORY_LINK');need(!(await fs.lstat(path.join(at,'.git')).catch(e=>{if(e.code==='ENOENT')return null;throw e;})),'PRIVATE_DIRECTORY_REPOSITORY');if(at===path.dirname(at))break;}
  const root=await fs.mkdtemp(path.join(temp,'ravradar-db-discovery-'));await fs.chmod(root,0o700);return root;}
async function readLocal(file,max){const named=await fs.lstat(file,{bigint:true});need(named.isFile()&&!named.isSymbolicLink()&&named.nlink===1n&&named.size>0n&&named.size<=BigInt(max),'LOCAL_FILE_BOUND');
  const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));try{const before=await h.stat({bigint:true});need(before.dev===named.dev&&before.ino===named.ino,'LOCAL_FILE_IDENTITY');
    const buffer=Buffer.alloc(64*1024),chunks=[];let count=0;for(;;){const r=await h.read(buffer,0,buffer.length,null);if(!r.bytesRead)break;count+=r.bytesRead;need(count<=max,'LOCAL_FILE_BOUND');chunks.push(Buffer.from(buffer.subarray(0,r.bytesRead)));}
    const after=await h.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});need(count===Number(before.size)&&['dev','ino','size','mtimeNs','ctimeNs'].every(k=>before[k]===after[k]&&after[k]===fresh[k])&&fresh.isFile()&&!fresh.isSymbolicLink()&&fresh.nlink===1n,'LOCAL_FILE_CHANGED');return Buffer.concat(chunks,count);
  }finally{await h.close();}}
const ACCESS_SQL=`with current_privacy as (${PRIVATE_STUDY_ADMIN_ACCESS_SQL.trim().replace(/;$/,'')}),
version_privacy as (${PRIVATE_STUDY_ADMIN_ACCESS_SQL.trim().replace(/;$/,'').replaceAll('admin_documents','admin_document_versions')})
select current_privacy.metadata,version_privacy.metadata as version_metadata,
(has_table_privilege('service_role','public.admin_documents','SELECT') and has_table_privilege('service_role','public.admin_documents','INSERT') and has_table_privilege('service_role','public.admin_documents','UPDATE')) as current_access
from current_privacy,version_privacy`;
async function privacy(c){need(typeof c.env.SUPABASE_ACCESS_TOKEN==='string'&&c.env.SUPABASE_ACCESS_TOKEN.length>=20,'CATALOGUE_TOKEN_REQUIRED');
  const response=await c.fetch('https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query',{method:'POST',headers:{Authorization:'Bearer '+c.env.SUPABASE_ACCESS_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({query:ACCESS_SQL})});
  need(response.status===200||response.status===201,'LOCATOR_PRIVACY');const rows=parse(Buffer.from(await response.arrayBuffer()),'LOCATOR_PRIVACY');need(Array.isArray(rows)&&rows.length===1,'LOCATOR_PRIVACY');
  fields(rows[0],['metadata','version_metadata','current_access'],'LOCATOR_PRIVACY');need(rows[0].current_access===true,'LOCATOR_SERVICE_ACCESS');
  try{assertPrivateStudyAdminAccess([{metadata:rows[0].metadata}]);const version=rows[0].version_metadata,aliases={'ravradar_admin_document_versions_read':'ravradar_admin_documents_read','ravradar_ravscore_checkpoint_versions_no_direct_read':'ravradar_ravscore_checkpoint_no_direct_read'};
    need(Array.isArray(version?.policies)&&version.policies.length===2&&version.policies.every(p=>Object.hasOwn(aliases,p.name)),'LOCATOR_PRIVACY');
    assertPrivateStudyAdminAccess([{metadata:{...version,policies:version.policies.map(p=>({...p,name:aliases[p.name]}))}}]);
  }catch{fail('LOCATOR_PRIVACY');}}
function clients(env,fetchImpl,{bootstrap=false,readOnly=false}={}){
  need((bootstrap||env.SUPABASE_URL?.replace(/\/$/,'')===P.project)&&typeof env.SUPABASE_SERVICE_ROLE_KEY==='string'&&env.SUPABASE_SERVICE_ROLE_KEY.length>=32,'EXACT_PROJECT_MASTER');
  const state={started:Date.now(),writes:new Set(),unknown:false,fatal:null,readBytes:0,bootstrap,listing:null,searchDeadline:null,objectReadBound:P.maximumObjectBytes,archiveCreates:0,locatorWrites:0,candidateReadBytes:0},host=String(env.RAVRADAR_R2_ACCOUNT_ID)+'.eu.r2.cloudflarestorage.com';
  const guarded=async(url,options={})=>{
    if(state.unknown)fail('DB_BACKUP_WRITE_OUTCOME_UNKNOWN');if(state.fatal)fail(state.fatal);need(Date.now()-state.started<P.maximumMs,'REMOTE_DEADLINE');if(state.searchDeadline&&Date.now()>=state.searchDeadline){state.fatal='BOOTSTRAP_DEADLINE';fail(state.fatal);}
    const u=new URL(url),method=String(options.method||'GET').toUpperCase(),management=u.href==='https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query'&&method==='POST'&&options.body===JSON.stringify({query:ACCESS_SQL});
    const admin=u.origin===P.project&&u.pathname==='/rest/v1/admin_documents',r2=u.protocol==='https:'&&u.hostname===host&&(u.pathname==='/'+P.bucket||u.pathname.startsWith('/'+P.bucket+'/'));
    if(bootstrap)need(r2&&['GET','HEAD'].includes(method),'BOOTSTRAP_R2_READ_ONLY');
    if(readOnly)need(management||['GET','HEAD'].includes(method),'MATERIALIZATION_READ_ONLY');
    need(management||admin||r2,'NETWORK_SURFACE');need(management||admin?['GET','POST','PATCH'].includes(method):['GET','HEAD','PUT'].includes(method),'NETWORK_METHOD');
    if(admin){const q=u.searchParams;need(q.get('select')==='document_key,payload,version','LOCATOR_SELECT');
      if(method==='GET')need(q.get('document_key')==='eq.'+P.locatorKey&&q.get('limit')==='2'&&[...q.keys()].sort().join(',')==='document_key,limit,select','LOCATOR_GET');
      else{const b=parse(Buffer.from(options.body||''),'LOCATOR_BODY');if(method==='POST'){fields(b,['document_key','payload','updated_by'],'LOCATOR_BODY');need(b.document_key===P.locatorKey&&q.get('on_conflict')==='document_key'&&[...q.keys()].sort().join(',')==='on_conflict,select','LOCATOR_INSERT');}
        else{fields(b,['payload','updated_by'],'LOCATOR_BODY');need(q.get('document_key')==='eq.'+P.locatorKey&&/^eq\.[1-9][0-9]*$/.test(q.get('version')||'')&&[...q.keys()].sort().join(',')==='document_key,select,version','LOCATOR_CAS');}
        need(b.updated_by===null&&Buffer.byteLength(options.body)<=P.maximumMetadataBytes,'LOCATOR_BODY');checkPointer(b.payload);}}
    const write=!management&&['PUT','POST','PATCH'].includes(method);if(write){if(state.writes.has(u.href)){state.unknown=true;fail('DB_BACKUP_WRITE_OUTCOME_UNKNOWN');}state.writes.add(u.href);}
    try{const response=await fetchImpl(u.href,{...options,redirect:'manual',signal:AbortSignal.timeout(state.searchDeadline?Math.max(1,Math.min(30_000,state.searchDeadline-Date.now())):30_000)});
      if(write&&![200,201,204,412].includes(response.status))state.unknown=true;
      if(write&&response.ok){if(r2)state.archiveCreates++;else if(admin)state.locatorWrites++;}
      const list=bootstrap&&r2&&method==='GET'&&u.pathname==='/'+P.bucket&&u.searchParams.get('list-type')==='2';
      const maximum=list?B.maximumListBytes:r2?state.objectReadBound:2_000_000,declared=response.headers.get('content-length');
      if(declared!==null)need(/^[0-9]+$/.test(declared)&&Number.isSafeInteger(Number(declared))&&Number(declared)<=maximum,'RESPONSE_BOUND');
      const chunks=[];let bytes=0;for await(const b of response.body||[]){bytes+=b.length;state.readBytes+=b.length;need(bytes<=maximum&&state.readBytes<=P.maximumBucketBytes,'RESPONSE_BOUND');if(list){state.listing.bytes+=b.length;need(state.listing.bytes<=B.maximumListBytes,'RESPONSE_BOUND');}if(bootstrap&&r2&&method==='GET'&&!list&&state.searchDeadline){state.candidateReadBytes+=b.length;need(state.candidateReadBytes<=B.maximumCandidateBytes,'RESPONSE_BOUND');}chunks.push(b);}
      const body=Buffer.concat(chunks);if(list&&response.status===200){need(state.listing,'BOOTSTRAP_LIST_STATE');collectListing(state.listing,body);}
      return new Response([204,205,304].includes(response.status)?null:body,{status:response.status,headers:response.headers});
    }catch(e){if(write)state.unknown=true;if(e.code==='RESPONSE_BOUND'||/^BOOTSTRAP_LIST_/.test(e.code||''))state.fatal=e.code;throw e;}
  };
  const admin=createSupabaseAdminRequester({endpoint:P.project+'/rest/v1/admin_documents',key:env.SUPABASE_SERVICE_ROLE_KEY,fetchImpl:guarded,logger:()=>{}});
  const r2=createR2PrivateRuntimeStorage({accountId:env.RAVRADAR_R2_ACCOUNT_ID,accessKeyId:env.RAVRADAR_R2_ACCESS_KEY_ID,secretAccessKey:env.RAVRADAR_R2_SECRET_ACCESS_KEY,
    bucketId:P.bucket,maximumObjectBytes:P.maximumObjectBytes,bucketCeilingBytes:P.maximumBucketBytes,fetchImpl:guarded});
  return{env,state,fetch:guarded,admin,r2};
}

function validateManifest(raw,pointer){
  need(raw.length<=LOCAL.maximumManifestBytes&&sha(raw)===pointer.manifestSha256,'MANIFEST_SHA');const m=parse(raw,'MANIFEST_JSON');
  fields(m,['kind','context','exportReceiptSha256','files','authRestoreVerified','fullDatabaseBackupVerified','archiveUploaded','centralLocatorPublished','freeReady'],'MANIFEST_FIELDS');
  need(m.kind==='SUPABASE_LOCAL_DB_CARRIER_V1'&&same(m.context,pointer.context)&&m.exportReceiptSha256===pointer.exportReceiptSha256
    &&['authRestoreVerified','fullDatabaseBackupVerified','archiveUploaded','centralLocatorPublished','freeReady'].every(k=>m[k]===false),'MANIFEST_GROUP');
  need(Array.isArray(m.files)&&m.files.length===5,'FIVE_FILES_REQUIRED');let total=0;
  for(let i=0;i<5;i++){const x=m.files[i];fields(x,['file','sqlBytes','sqlSha256','cipherFile','cipherBytes','cipherSha256'],'FILE_FIELDS');
    need(x.file===NAMES[i]&&x.cipherFile===x.file+'.gz.enc'&&positive(x.sqlBytes)&&x.sqlBytes<=LOCAL.maximumSqlBytes&&hash(x.sqlSha256)
      &&positive(x.cipherBytes)&&x.cipherBytes<=P.maximumCipherBytes&&hash(x.cipherSha256),'FILE_BOUND');total+=x.sqlBytes;}
  need(Number.isSafeInteger(total)&&total<=LOCAL.maximumTotalSqlBytes,'TOTAL_SQL_BOUND');return m;
}
function decodedBase64(value,max,code){need(typeof value==='string'&&value.length<=4*Math.ceil(max/3),'INDEX_BOUND');const b=Buffer.from(value,'base64');
  need(b.length>0&&b.length<=max&&b.toString('base64')===value,code);return b;}
function validateIndex(raw,pointer){
  need(raw.length<=P.maximumMetadataBytes-128,'INDEX_BOUND');const x=parse(raw,'INDEX_JSON');
  fields(x,['kind','exportReceiptSha256','manifestSha256','manifestBase64','exportReceiptBase64','objects'],'INDEX_FIELDS');
  need(x.kind==='SUPABASE_DB_BACKUP_INDEX_V1'&&x.exportReceiptSha256===pointer.exportReceiptSha256&&x.manifestSha256===pointer.manifestSha256,'INDEX_GROUP');
  const manifestBytes=decodedBase64(x.manifestBase64,LOCAL.maximumManifestBytes,'MANIFEST_BASE64'),m=validateManifest(manifestBytes,pointer);
  const receiptBytes=decodedBase64(x.exportReceiptBase64,LOCAL.maximumManifestBytes,'RECEIPT_BASE64');need(sha(receiptBytes)===pointer.exportReceiptSha256,'EXPORT_RECEIPT_SHA');
  const receipt=parse(receiptBytes,'EXPORT_RECEIPT_JSON');need(receipt.kind==='SUPABASE_FIVE_FILE_EXPORT_V1'&&receipt.project===LOCAL.project&&receipt.exportPhaseCompleted===true
    &&receipt.authRestoreVerified===false&&receipt.fullDatabaseBackupVerified===false&&Array.isArray(receipt.files)&&receipt.files.length===5,'EXPORT_RECEIPT_GROUP');
  need([receipt.startedAt,receipt.completedAt].every(t=>typeof t==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(t)&&Number.isFinite(Date.parse(t))&&new Date(t).toISOString()===t)
    &&Date.parse(receipt.startedAt)<=Date.parse(receipt.completedAt),'EXPORT_RECEIPT_TIME');
  need(Array.isArray(x.objects)&&x.objects.length===5,'FIVE_OBJECTS_REQUIRED');const paths=new Set();
  for(let i=0;i<5;i++){const entry=x.objects[i],r=receipt.files[i],f=m.files[i];fields(entry,['file','object'],'INDEX_OBJECT_FIELDS');
    need(entry.file===NAMES[i]&&r.file===f.file&&r.bytes===f.sqlBytes&&r.sha256===f.sqlSha256,'EXPORT_FILE_GROUP');checkObject(entry.object);
    need(!paths.has(entry.object.path),'DUPLICATE_OBJECT');paths.add(entry.object.path);}
  return{index:x,manifest:m,manifestBytes,receiptBytes,completedAt:receipt.completedAt};
}
const GET_SUFFIX='?document_key=eq.'+P.locatorKey+'&select=document_key,payload,version&limit=2';
function locatorRows(rows){need(Array.isArray(rows)&&rows.length<=1,'LOCATOR_ROWS');if(!rows.length)return null;const r=rows[0];
  fields(r,['document_key','payload','version'],'LOCATOR_ROW');need(r.document_key===P.locatorKey&&positive(r.version),'LOCATOR_IDENTITY');checkPointer(r.payload);return r;}
async function readLocator(c){return locatorRows(await c.admin(GET_SUFFIX,{},'backup locator read'));}
async function publishLocator(c,before,pointer){
  const fresh=await readLocator(c);need(same(fresh,before),'LOCATOR_CHANGED');let rows;
  if(before){need(before.version<Number.MAX_SAFE_INTEGER,'LOCATOR_VERSION');rows=await c.admin('?document_key=eq.'+P.locatorKey+'&version=eq.'+before.version+'&select=document_key,payload,version',
    {method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({payload:pointer,updated_by:null})},'backup locator CAS');}
  else rows=await c.admin('?on_conflict=document_key&select=document_key,payload,version',
    {method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify({document_key:P.locatorKey,payload:pointer,updated_by:null})},'backup locator insert');
  const written=locatorRows(rows);need(written&&written.version===(before?before.version+1:1)&&same(written.payload,pointer),'LOCATOR_CAS_REJECTED');
  const readback=await readLocator(c);need(same(readback,written),'LOCATOR_READBACK');return readback;
}
async function store(c,body){
  const descriptor={path:objectPath(sha(body)),sha256:sha(body),bytes:body.length};checkObject(descriptor);
  await c.r2.uploadImmutable(descriptor.path,body);const readback=await c.r2.download(descriptor.path);
  need(readback.length===body.length&&readback.equals(body),'R2_EXACT_READBACK');
  need([401,403,404].includes(await c.r2.anonymousStatus(descriptor.path)),'R2_ANONYMOUS_ACCESS');return descriptor;
}
async function remoteBody(c,descriptor){checkObject(descriptor);const b=await c.r2.download(descriptor.path);need(b.length===descriptor.bytes&&sha(b)===descriptor.sha256,'REMOTE_OBJECT_SHA');return b;}
async function capture(c,options,dependencies){
  need(c.env.GITHUB_ACTIONS==='true'&&c.env.RUNNER_ENVIRONMENT==='github-hosted'&&c.env.RUNNER_OS==='Linux'
    &&(dependencies.processImpl??process).platform==='linux','HOSTED_VM_REQUIRED');
  const expectedContext=checkContext({purpose:LOCAL.purpose,project:LOCAL.project,repository:c.env.GITHUB_REPOSITORY,
    sourceHead:c.env.GITHUB_SHA,runId:c.env.GITHUB_RUN_ID,runAttempt:c.env.GITHUB_RUN_ATTEMPT});
  // Read-only admission before any DB export, SQL/cipher file or upload.
  await privacy(c);const preflightLocator=await readLocator(c);await c.r2.ensurePrivateBucket();const usage=await c.r2.bucketUsage();
  need(usage.usedBytes+(NAMES.length+1)*P.maximumObjectBytes<=P.maximumBucketBytes,'R2_CAPTURE_HEADROOM');
  // The normal fixed export + local verifier is the only capture admission.
  // A supplied local directory, receipt or boolean cannot qualify a remote backup.
  const local=await captureLocalDatabaseBackup(options,dependencies),manifestBytes=await readLocal(path.join(local.directory,'manifest.json'),LOCAL.maximumManifestBytes);
  need(sha(manifestBytes)===local.manifestSha256,'CAPTURE_MANIFEST_CHANGED');const initial=parse(manifestBytes,'MANIFEST_JSON');
  const pointer={kind:'SUPABASE_DB_BACKUP_LOCATOR_V1',bucket:P.bucket,index:null,context:initial.context,
    exportReceiptSha256:initial.exportReceiptSha256,manifestSha256:local.manifestSha256};checkContext(pointer.context);need(same(pointer.context,expectedContext),'CAPTURE_CONTEXT_CHANGED');
  const m=validateManifest(manifestBytes,pointer),receiptBytes=await readLocal(path.join(path.dirname(local.directory),'export-receipt.json'),LOCAL.maximumManifestBytes);
  need(sha(receiptBytes)===pointer.exportReceiptSha256,'EXPORT_RECEIPT_SHA');
  const index={kind:'SUPABASE_DB_BACKUP_INDEX_V1',exportReceiptSha256:pointer.exportReceiptSha256,manifestSha256:pointer.manifestSha256,
    manifestBase64:manifestBytes.toString('base64'),exportReceiptBase64:receiptBytes.toString('base64'),objects:NAMES.map(file=>({file,object:{path:objectPath('0'.repeat(64)),sha256:'0'.repeat(64),bytes:P.maximumObjectBytes}}))};
  // Check every file and worst-case index framing before the first upload.
  need(envelopeSize(encode(index),pointer)<=P.maximumMetadataBytes,'INDEX_BOUND');
  await privacy(c);const before=await readLocator(c);need(same(before,preflightLocator),'LOCATOR_CHANGED');await c.r2.ensurePrivateBucket();await c.r2.bucketUsage();index.objects=[];
  for(const f of m.files){const cipher=await readLocal(path.join(local.directory,f.cipherFile),P.maximumCipherBytes);
    need(cipher.length===f.cipherBytes&&sha(cipher)===f.cipherSha256,'CAPTURE_CIPHER_CHANGED');
    const body=frame('SQL_CIPHERTEXT',cipher),object=await store(c,body);need(unframe('SQL_CIPHERTEXT',body).equals(cipher),'FRAME_ROUNDTRIP');index.objects.push({file:f.file,object});}
  const indexBytes=encode(index);validateIndex(indexBytes,pointer);const encrypted=sealIndex(indexBytes,pointer,c.env),wire=frame('ENCRYPTED_INDEX',encrypted);
  pointer.index=await store(c,wire);checkPointer(pointer);need(openIndex(unframe('ENCRYPTED_INDEX',wire),pointer,c.env).equals(indexBytes),'INDEX_ROUNDTRIP');
  const locator=await publishLocator(c,before,pointer);
  return{status:'REMOTE_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY',locatorVersion:locator.version,indexSha256:pointer.index.sha256,
    files:local.files,totalSqlBytes:local.totalSqlBytes,remoteArchiveVerified:true,centralLocatorVerified:true,archiveWrittenThisOperation:c.state.archiveCreates>0,centralLocatorWrittenThisOperation:c.state.locatorWrites>0,
    authRestoreVerified:false,fullDatabaseBackupVerified:false,atomicDatabaseSnapshot:false,freeReady:false,sourceAdmission:false,automaticRetry:false};
}
async function verifyRemoteGroup(c,pointer,opened){
  const {index,manifest,manifestBytes}=validateIndex(opened,pointer),directory=await privateDirectory(c.env);
  // Only authenticated, centrally pinned names reach this private create-only root.
  for(let i=0;i<5;i++){const f=manifest.files[i],cipher=unframe('SQL_CIPHERTEXT',await remoteBody(c,index.objects[i].object));
    need(cipher.length===f.cipherBytes&&sha(cipher)===f.cipherSha256,'REMOTE_CIPHER_GROUP');
    await fs.writeFile(path.join(directory,f.cipherFile),cipher,{flag:'wx',mode:0o600});}
  await fs.writeFile(path.join(directory,'manifest.json'),manifestBytes,{flag:'wx',mode:0o600});
  const verified=await verifyLocalDatabaseBackup({directory},{env:c.env});need(verified.manifestSha256===pointer.manifestSha256,'RESTORED_MANIFEST_SHA');
  return{verified,directory};
}
async function discover(c,materialization=null){
  await privacy(c);const locator=await readLocator(c);need(locator,'LOCATOR_MISSING');await c.r2.ensurePrivateBucket();
  const pointer=locator.payload,wire=await remoteBody(c,pointer.index),opened=openIndex(unframe('ENCRYPTED_INDEX',wire),pointer,c.env);
  const {verified,directory}=await verifyRemoteGroup(c,pointer,opened);
  const fresh=await readLocator(c);need(same(fresh,locator),'LOCATOR_CHANGED');
  if(materialization){
    const sql=await materializeLocalDatabaseBackup({directory,destination:materialization.destination,manifestSha256:pointer.manifestSha256},materialization.dependencies);
    return{...sql,status:'CENTRAL_DISCOVERY_FIVE_SQL_FILES_MATERIALIZED_ONLY',locatorVersion:locator.version,indexSha256:pointer.index.sha256,
      remoteArchiveVerified:true,centralLocatorVerified:true,archiveWrittenThisOperation:false,centralLocatorWrittenThisOperation:false,
      atomicDatabaseSnapshot:false,sourceAdmission:false,automaticRetry:false};
  }
  return{status:'CENTRAL_DISCOVERY_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY',locatorVersion:locator.version,indexSha256:pointer.index.sha256,
    files:verified.files,totalSqlBytes:verified.totalSqlBytes,directory,remoteArchiveVerified:true,centralLocatorVerified:true,archiveWrittenThisOperation:c.state.archiveCreates>0,centralLocatorWrittenThisOperation:c.state.locatorWrites>0,
    authRestoreVerified:false,fullDatabaseBackupVerified:false,atomicDatabaseSnapshot:false,freeReady:false,sourceAdmission:false,automaticRetry:false};
}
function collectListing(inventory,body){need(inventory.bytes<=B.maximumListBytes,'BOOTSTRAP_LIST_BYTES');const xml=body.toString('utf8');
  need(!/<!DOCTYPE|<!ENTITY/i.test(xml),'BOOTSTRAP_LIST_FORMAT');
  for(const [,block]of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)){
    const keys=[...block.matchAll(/<Key>([\s\S]*?)<\/Key>/g)],sizes=[...block.matchAll(/<Size>([\s\S]*?)<\/Size>/g)];
    need(keys.length===1&&sizes.length===1&&/^(0|[1-9][0-9]*)$/.test(sizes[0][1])&&Number.isSafeInteger(Number(sizes[0][1])),'BOOTSTRAP_LIST_ENTRY');
    inventory.count++;need(inventory.count<=B.maximumListedObjects,'BOOTSTRAP_LIST_COUNT');const bytes=Number(sizes[0][1]);inventory.total+=bytes;
    need(Number.isSafeInteger(inventory.total),'BOOTSTRAP_LIST_ENTRY');const key=keys[0][1];
    if(!/^bundles\/sha256\/[0-9a-f]{64}\.json\.gz$/.test(key)){inventory.unsupported++;continue;}
    need(!inventory.objects.has(key),'BOOTSTRAP_LIST_DUPLICATE');inventory.objects.set(key,{path:key,bytes,sha256:key.slice(15,79)});
  }
}
function candidateSummary(pointer,group){return{indexSha256:pointer.index.sha256,indexBytes:pointer.index.bytes,completedAt:group.completedAt,context:pointer.context};}
async function bootstrap(c,indexSha256,materialization=null){
  c.state.searchDeadline=Date.now()+B.maximumSearchMs;c.state.objectReadBound=B.maximumIndexWireBytes;
  await c.r2.ensurePrivateBucket();const inventory={bytes:0,count:0,total:0,unsupported:0,objects:new Map()};c.state.listing=inventory;
  const usage=await c.r2.bucketUsage();c.state.listing=null;
  need(usage.objectCount===inventory.count&&usage.usedBytes===inventory.total,'BOOTSTRAP_LIST_PARITY');
  const all=[...inventory.objects.values()],eligible=all.filter(x=>positive(x.bytes)&&x.bytes<=B.maximumIndexWireBytes);
  let wanted=eligible;if(indexSha256!==null){const found=eligible.find(x=>x.sha256===indexSha256);need(found,'BOOTSTRAP_SHA_NOT_LISTED');wanted=[found];}
  need(wanted.length<=B.maximumCandidates&&wanted.reduce((n,x)=>n+x.bytes,0)<=B.maximumCandidateBytes,'BOOTSTRAP_CANDIDATE_LIMIT');
  const diagnostics={listedObjects:inventory.count,unsupportedNamespaceObjects:inventory.unsupported,objectsAboveIndexLimit:all.filter(x=>x.bytes>B.maximumIndexWireBytes).length,
    emptyObjects:all.filter(x=>x.bytes===0).length,eligibleNotInspected:eligible.length-wanted.length,nonIndexSqlFrames:0,legacyRequiresDbPointer:0,invalidOrUnsupported:{}};
  const candidates=[];let selected=null;
  for(const descriptor of wanted){
    // Transport/list/deadline errors abort an incomplete scan; data errors below are counted.
    const wire=await c.r2.download(descriptor.path);try{
      need(wire.length===descriptor.bytes&&sha(wire)===descriptor.sha256,'REMOTE_OBJECT_SHA');let outer;
      try{outer=parse(gunzipSync(wire,{maxOutputLength:100_000}),'FRAME_JSON');}catch{fail('UNREADABLE_OR_NON_INDEX_FRAME');}
      if(outer.kind==='SUPABASE_DB_SQL_CIPHERTEXT_FRAME_V1'){unframe('SQL_CIPHERTEXT',wire);diagnostics.nonIndexSqlFrames++;if(indexSha256!==null)fail('BOOTSTRAP_SELECTED_NOT_INDEX');continue;}
      const binary=unframe('ENCRYPTED_INDEX',wire);
      if(binary.subarray(0,INDEX_MAGIC.length).equals(INDEX_MAGIC)){diagnostics.legacyRequiresDbPointer++;if(indexSha256!==null)fail('BOOTSTRAP_LEGACY_REQUIRES_DB_POINTER');continue;}
      const pointer=selfIndexHeader(binary).pointer;pointer.index=descriptor;
      const opened=openIndex(binary,pointer,c.env),group=validateIndex(opened,pointer);candidates.push(candidateSummary(pointer,group));
      if(indexSha256!==null)selected={pointer,opened};
    }catch(e){if(indexSha256!==null)throw e;const code=typeof e.code==='string'&&/^[A-Z][A-Z0-9_]*$/.test(e.code)?e.code:'INVALID_OR_UNSUPPORTED_INDEX';
      diagnostics.invalidOrUnsupported[code]=(diagnostics.invalidOrUnsupported[code]??0)+1;}
  }
  need(Date.now()<c.state.searchDeadline,'BOOTSTRAP_DEADLINE');c.state.searchDeadline=null;c.state.objectReadBound=P.maximumObjectBytes;
  const result={candidates:candidates.sort((a,b)=>a.indexSha256<b.indexSha256?-1:a.indexSha256>b.indexSha256?1:0),diagnostics,selectionRequired:true,
    remoteArchiveVerified:false,centralLocatorVerified:false,archiveWrittenThisOperation:false,centralLocatorWrittenThisOperation:false,
    authRestoreVerified:false,fullDatabaseBackupVerified:false,atomicDatabaseSnapshot:false,freeReady:false,sourceAdmission:false,automaticRetry:false};
  if(indexSha256===null)return{status:'R2_BOOTSTRAP_AUTHENTICATED_INDEX_CANDIDATES_ONLY',...result};
  need(selected,'BOOTSTRAP_SELECTED_NOT_AUTHENTICATED');const {verified,directory}=await verifyRemoteGroup(c,selected.pointer,selected.opened);
  if(materialization){
    const sql=await materializeLocalDatabaseBackup({directory,destination:materialization.destination,manifestSha256:selected.pointer.manifestSha256},materialization.dependencies);
    return{...result,...sql,status:'R2_BOOTSTRAP_FIVE_SQL_FILES_MATERIALIZED_ONLY',selectionRequired:false,indexSha256,remoteArchiveVerified:true};
  }
  return{...result,status:'R2_BOOTSTRAP_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY',selectionRequired:false,indexSha256,remoteArchiveVerified:true,
    files:verified.files,totalSqlBytes:verified.totalSqlBytes,directory};
}
export async function runSupabaseDatabaseArchive(options={},dependencies={}){
  const {mode='discover',exportOptions={},indexSha256=null,destination=null}=options;
  need(['capture','discover','bootstrap','materialize'].includes(mode),'EXPLICIT_BACKUP_MODE');
  need(indexSha256===null||(['bootstrap','materialize'].includes(mode)&&hash(indexSha256)),'BOOTSTRAP_SHA');
  if(mode==='materialize'){
    fields(options,Object.keys(options),'MATERIALIZATION_OPTIONS');
    need(Object.keys(options).every(key=>['mode','destination','indexSha256'].includes(key)),'MATERIALIZATION_OPTIONS');
    need((dependencies.processImpl??process).platform==='linux','MATERIALIZATION_LINUX_REQUIRED');
    need(typeof destination==='string'&&path.isAbsolute(destination),'MATERIALIZATION_TARGET');
    need(dependencies.signal===undefined||dependencies.signal instanceof AbortSignal,'MATERIALIZATION_SIGNAL');
  }else need(destination===null,'MATERIALIZATION_OPTIONS');
  fields(exportOptions,Object.keys(exportOptions),'EXPORT_OPTIONS');
  need(mode==='capture'||Object.keys(exportOptions).length===0,'DISCOVERY_EXPORT_OPTIONS');
  const env=dependencies.env??process.env;let c;
  try{c=clients(env,dependencies.fetchImpl??globalThis.fetch,{bootstrap:mode==='bootstrap'||mode==='materialize'&&indexSha256!==null,readOnly:mode==='materialize'});
    let materialization=null;
    if(mode==='materialize'){
      const remaining=Math.min(P.maximumMs,P.maximumMs-(Date.now()-c.state.started));need(remaining>0,'REMOTE_DEADLINE');
      const horizon=AbortSignal.timeout(remaining),signal=dependencies.signal===undefined?horizon:AbortSignal.any([dependencies.signal,horizon]);
      materialization={destination,dependencies:{env,signal,processImpl:dependencies.processImpl??process}};
    }
    return mode==='capture'?await capture(c,exportOptions,{...dependencies,env}):mode==='bootstrap'||mode==='materialize'&&indexSha256!==null
      ?await bootstrap(c,indexSha256,materialization):await discover(c,materialization);
  }catch(e){const error=new Error(c?.state.unknown?'DB_BACKUP_WRITE_OUTCOME_UNKNOWN':c?.state.fatal??(typeof e.code==='string'&&/^[A-Z][A-Z0-9_]*$/.test(e.code)?e.code:'DATABASE_ARCHIVE_FAILED_CLOSED'));
    error.code=error.message;error.automaticRetry=false;error.externalDumpOutcome=['UNKNOWN','NOT_STARTED'].includes(e.externalDumpOutcome)?e.externalDumpOutcome:null;
    error.authRestoreVerified=false;error.fullDatabaseBackupVerified=false;error.freeReady=false;throw error;}
}
async function main(){const args=process.argv.slice(2);
  if(args[0]==='--materialize'){
    need((args.length===3||args.length===5)&&args[1]==='--destination'
      &&(args.length===3||args[3]==='--index-sha'&&hash(args[4])),'EXPLICIT_BACKUP_MODE');
    console.log(JSON.stringify(await runSupabaseDatabaseArchive({mode:'materialize',destination:args[2],indexSha256:args[4]??null})));return;
  }
  need(args.length===0||(args.length===1&&['--capture','--discover','--bootstrap'].includes(args[0]))||(args.length===2&&args[0]==='--bootstrap'&&hash(args[1])),'EXPLICIT_BACKUP_MODE');
  console.log(JSON.stringify(await runSupabaseDatabaseArchive({mode:args[0]==='--capture'?'capture':args[0]==='--bootstrap'?'bootstrap':'discover',indexSha256:args[1]??null})));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(e=>{console.error(JSON.stringify({status:'FAILED_CLOSED',code:e.code??'DATABASE_ARCHIVE_FAILED_CLOSED',externalDumpOutcome:e.externalDumpOutcome??null,
    automaticRetry:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,freeReady:false}));process.exitCode=1;});
