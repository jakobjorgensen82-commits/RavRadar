import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {runSupabaseDatabaseArchive as run,DB_REMOTE_BACKUP_POLICY as P,DB_BOOTSTRAP_POLICY as B} from './archive-supabase-database-backup.mjs';
import {PRIVATE_STUDY_ADMIN_FUNCTIONS} from './lib/private-trip-study-admin-transport.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x));
const names=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const sql=name=>Buffer.from('-- synthetic '+name+'\nINSERT INTO synthetic VALUES (9007199254740993,0.12345678901234567890123456789);\n');
async function host(t){const temp=path.resolve(os.tmpdir()),dir=await fs.mkdtemp(path.join(temp,'ravradar-db-remote-test-'));
  t.after(async()=>{assert.ok(path.resolve(dir).startsWith(temp+path.sep+'ravradar-db-remote-test-'));assert.equal((await fs.lstat(dir)).isSymbolicLink(),false);await fs.rm(dir,{recursive:true,force:false});});return dir;}
function catalogue(){const metadata={rls:true,ownerRestricted:true,anonSelect:false,authenticatedSelect:true,unsafeRoles:false,publicSelect:false,
  policies:[{name:'ravradar_admin_documents_read',permissive:'PERMISSIVE',roles:['authenticated'],command:'SELECT',
    qual:"public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_permission(document_key))"},
  {name:'ravradar_ravscore_checkpoint_no_direct_read',permissive:'RESTRICTIVE',roles:['authenticated'],command:'SELECT',qual:"document_key <> 'ravscore-continuation-checkpoint'"}],functions:clone(PRIVATE_STUDY_ADMIN_FUNCTIONS)};
  const version=clone(metadata);version.policies[0].name='ravradar_admin_document_versions_read';version.policies[1].name='ravradar_ravscore_checkpoint_versions_no_direct_read';
  return[{metadata,version_metadata:version,current_access:true}];}
function fixture(temp,behavior={}){
  const env={RUNNER_TEMP:temp,PATH:'synthetic-normal-cli-path',SUPABASE_ACCESS_TOKEN:'synthetic-access-never-real',SUPABASE_DB_PASSWORD:'synthetic-password-never-real',
    SUPABASE_SERVICE_ROLE_KEY:'synthetic-existing-db-backup-master-never-real',SUPABASE_URL:P.project,GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',
    GITHUB_REPOSITORY:'jakobjorgensen82-commits/RavRadar',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'12345',GITHUB_RUN_ATTEMPT:'1',
    RAVRADAR_R2_ACCOUNT_ID:'b'.repeat(32),RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-r2-access-never-real',RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2-secret-never-real'};
  const calls=[],children=[],objects=new Map(),oldLocators=[],processImpl=Object.assign(new EventEmitter(),{platform:'linux'});let pid=5000,now=0,locator=null;
  const spawnImpl=(command,args,options)=>{children.push({command,args,options});const child=Object.assign(new EventEmitter(),{pid:++pid,stdout:new PassThrough(),stderr:new PassThrough(),unref(){}});
    children.at(-1).child=child;child.alive=true;queueMicrotask(async()=>{let code=0;try{if(args[0]==='--version')child.stdout.write('2.117.0\n');else if(args[0]==='db'){
      const file=args[args.indexOf('--file')+1],name=path.basename(file);await fs.writeFile(file,behavior.sql?.(name)??sql(name),{mode:0o600,flag:'wx'});if(name===behavior.failDump)code=1;}
    }catch{code=1;}child.alive=false;child.stdout.end();child.stderr.end();child.emit('exit',code,null);child.emit('close',code,null);});return child;};
  const killImpl=(negativePid,signal)=>{assert.ok(negativePid<0);const c=children.find(x=>x.child?.pid===-negativePid);if(!c?.child?.alive){const e=new Error('gone');e.code='ESRCH';throw e;}assert.equal(signal,0);};
  const response=(body,status=200,headers={})=>new Response([204,205,304].includes(status)?null:body,{status,headers});
  const json=(value,status=200)=>response(JSON.stringify(value),status,{'content-type':'application/json'});
  const fetchImpl=async(url,options={})=>{
    const u=new URL(url),method=options.method||'GET',headers=new Headers(options.headers),body=options.body;calls.push({url,method,headers,body,childrenAtRequest:children.length});
    if(u.hostname==='api.supabase.com'){assert.ok(!behavior.denySupabase,'bootstrap must never contact Supabase');assert.equal(method,'POST');assert.ok(JSON.parse(body).query.includes('has_table_privilege'));return json(behavior.catalogue?.()??catalogue());}
    if(u.origin===P.project){assert.ok(!behavior.denySupabase,'bootstrap must never contact Supabase');assert.equal(u.pathname,'/rest/v1/admin_documents');assert.equal(headers.get('apikey'),env.SUPABASE_SERVICE_ROLE_KEY);
      if(method==='GET'){assert.equal(u.searchParams.get('document_key'),'eq.'+P.locatorKey);if(behavior.beforeLocatorGet)behavior.beforeLocatorGet(api);return json(locator?[clone(locator)]:[]);}
      const payload=JSON.parse(body);assert.equal(payload.updated_by,null);assert.equal(payload.payload.bucket,P.bucket);
      if(behavior.locatorUnknown)throw new Error('synthetic private response never returned');
      if(behavior.casConflict)return json([]);
      if(method==='POST'){assert.equal(u.searchParams.get('on_conflict'),'document_key');if(locator)return json([]);locator={document_key:P.locatorKey,payload:payload.payload,version:1};}
      else{assert.equal(method,'PATCH');assert.equal(u.searchParams.get('document_key'),'eq.'+P.locatorKey);if(u.searchParams.get('version')!=='eq.'+locator.version)return json([]);
        oldLocators.push(clone(locator));locator={...locator,payload:payload.payload,version:locator.version+1};}
      return json([clone(locator)]);
    }
    assert.equal(u.hostname,env.RAVRADAR_R2_ACCOUNT_ID+'.eu.r2.cloudflarestorage.com');assert.ok(u.pathname.startsWith('/'+P.bucket));
    const key=u.pathname.slice(P.bucket.length+2),authenticated=headers.has('authorization');
    if(!authenticated){assert.equal(method,'GET');assert.equal(headers.get('range'),'bytes=0-0');return response('',behavior.anonymousStatus??403);}
    if(!key){if(method==='HEAD')return response('',behavior.bucketHeadStatus??200);assert.equal(method,'GET');assert.equal(u.searchParams.get('list-type'),'2');
      if(behavior.listXml)return response(behavior.listXml(api,u.searchParams),200);
      const entries=[...objects].map(([key,b])=>'<Contents><Key>'+key+'</Key><Size>'+b.length+'</Size></Contents>').join('')
        +(behavior.existingUsageBytes?'<Contents><Key>existing-synthetic-object</Key><Size>'+behavior.existingUsageBytes+'</Size></Contents>':'');
      return response('<ListBucketResult><IsTruncated>false</IsTruncated>'+entries+'</ListBucketResult>',behavior.bucketListStatus??200);}
    assert.match(key,/^bundles\/sha256\/[0-9a-f]{64}\.json\.gz$/);
    if(method==='HEAD')return response('',objects.has(key)?200:404);
    if(method==='PUT'){assert.equal(headers.get('content-type'),'application/gzip');assert.equal(headers.get('if-none-match'),'*');
      assert.ok(Buffer.isBuffer(body));assert.ok(body.length<=P.maximumObjectBytes);assert.equal(sha(body),key.split('/').at(-1).split('.')[0]);
      const frame=JSON.parse(gunzipSync(body));assert.match(frame.kind,/^SUPABASE_DB_(SQL_CIPHERTEXT|ENCRYPTED_INDEX)_FRAME_V1$/);
      assert.equal(sha(Buffer.from(frame.data,'base64')),frame.sha256);assert.equal(Buffer.from(frame.data,'base64').length,frame.bytes);
      if(behavior.putUnknown){objects.set(key,Buffer.from(body));throw new Error('synthetic private uncertain outcome');}
      if(behavior.putStatus)return response('',behavior.putStatus);
      if(objects.has(key))return response('',412);objects.set(key,Buffer.from(body));return response('',200);}
    assert.equal(method,'GET');let b=objects.get(key);if(!b)return response('',404);
    if(behavior.readObject)b=behavior.readObject(key,Buffer.from(b));return response(b,200,{'content-length':String(b.length)});
  };
  const api={env,calls,children,objects,oldLocators,behavior,get locator(){return locator;},set locator(v){locator=v;},
    dependencies:()=>({env,fetchImpl,spawnImpl,killImpl,processImpl,now:()=>now,delay:async ms=>{now+=ms;await new Promise(resolve=>setImmediate(resolve));}})};return api;
}
async function captured(t,behavior){const f=fixture(await host(t),behavior),result=await run({mode:'capture'},f.dependencies());return{f,result};}
async function rejectCode(work,code){await assert.rejects(work,e=>e.code===code);}
const writeCalls=f=>f.calls.filter(c=>['PUT','PATCH'].includes(c.method)||(c.method==='POST'&&new URL(c.url).origin===P.project));
function decodeObject(b){return JSON.parse(gunzipSync(b));}
function encryptedIndex(f){const key=f.locator.payload.index.path,wire=f.objects.get(key),outer=decodeObject(wire),bytes=Buffer.from(outer.data,'base64');
  const legacy=bytes.subarray(0,25).toString().startsWith('RR-SUPABASE-DB-INDEX-1'),magic=Buffer.from('RR-SUPABASE-DB-INDEX-'+(legacy?'1':'2')+'\n');
  const at=legacy?magic.length:magic.length+4+bytes.readUInt32BE(magic.length),p=f.locator.payload,info='RavRadar/jakobjorgensen82-commits/RavRadar/SUPABASE_DATABASE_BACKUP/v1/INDEX';
  const k=Buffer.from(crypto.hkdfSync('sha256',Buffer.from(f.env.SUPABASE_SERVICE_ROLE_KEY),bytes.subarray(at,at+16),Buffer.from(info),32));
  const aad=legacy?Buffer.from(JSON.stringify({purpose:'SUPABASE_DATABASE_BACKUP/v1/INDEX',context:p.context,exportReceiptSha256:p.exportReceiptSha256,manifestSha256:p.manifestSha256})):bytes.subarray(0,at+28);
  const d=crypto.createDecipheriv('aes-256-gcm',k,bytes.subarray(at+16,at+28));d.setAAD(aad);d.setAuthTag(bytes.subarray(-16));
  return{index:JSON.parse(Buffer.concat([d.update(bytes.subarray(at+28,-16)),d.final()])),key};}

test('fixed normal five dumps -> honest gzip frames -> R2 exact readback -> central CAS; fresh discovery needs no local receipt',async t=>{
  const {f,result}=await captured(t);assert.equal(f.children.length,7);assert.equal(f.objects.size,6);assert.equal(writeCalls(f).length,7);assert.equal(f.locator.version,1);
  const {index}=encryptedIndex(f);assert.deepEqual(index.objects.map(x=>x.file),names);
  const receipt=Buffer.from(index.exportReceiptBase64,'base64'),m=Buffer.from(index.manifestBase64,'base64');assert.equal(sha(receipt),f.locator.payload.exportReceiptSha256);assert.equal(sha(m),f.locator.payload.manifestSha256);
  const discovered=await run({},f.dependencies());
  assert.equal(result.archiveWrittenThisOperation,true);assert.equal(result.centralLocatorWrittenThisOperation,true);assert.equal(discovered.archiveWrittenThisOperation,false);assert.equal(discovered.centralLocatorWrittenThisOperation,false);
  for(const r of [result,discovered]){assert.equal(r.remoteArchiveVerified,true);assert.equal(r.centralLocatorVerified,true);assert.equal(Object.hasOwn(r,'archiveUploaded'),false);assert.equal(Object.hasOwn(r,'centralLocatorPublished'),false);assert.equal(r.authRestoreVerified,false);
    assert.equal(r.fullDatabaseBackupVerified,false);assert.equal(r.freeReady,false);assert.equal(r.sourceAdmission,false);assert.equal(r.automaticRetry,false);
    assert.deepEqual(r.files.map(x=>x.sqlSha256),names.map(n=>sha(sql(n))));assert.ok(!JSON.stringify(r).includes('INSERT')&&!JSON.stringify(r).includes('synthetic-password'));}
  assert.equal(f.children.length,7,'discovery does not invoke the DB CLI');assert.equal(writeCalls(f).length,7,'discovery never writes remote state');
  assert.ok(f.calls.every(c=>c.method!=='DELETE'));assert.ok(f.children.every(c=>!c.options.env.SUPABASE_SERVICE_ROLE_KEY&&!c.options.env.RAVRADAR_R2_SECRET_ACCESS_KEY));
});
test('second capture uses guarded new version; original six archive objects and previous locator remain',async t=>{
  const {f}=await captured(t),old=clone(f.locator),objects=new Map(f.objects);const r=await run({mode:'capture'},f.dependencies());
  assert.equal(r.locatorVersion,2);assert.deepEqual(f.oldLocators,[old]);assert.equal(f.objects.size,12);for(const [key,b] of objects)assert.ok(f.objects.get(key).equals(b));
});
test('normal dump failure has UNKNOWN external outcome and only read-only preflight, no archive mutation',async t=>{
  const f=fixture(await host(t),{failDump:'roles.sql'});await assert.rejects(()=>run({mode:'capture'},f.dependencies()),e=>e.externalDumpOutcome==='UNKNOWN');
  assert.ok(f.calls.length>=4);assert.ok(f.calls.every(c=>c.method==='GET'||c.method==='HEAD'||new URL(c.url).hostname==='api.supabase.com'));assert.equal(writeCalls(f).length,0);assert.equal(f.objects.size,0);
});
test('private locator catalogue, exact functions, history policy and service rights are mandatory',async t=>{
  for(const change of [r=>r[0].metadata.anonSelect=true,r=>r[0].version_metadata.policies[0].qual='true',r=>r[0].current_access=false,
    r=>r[0].metadata.functions[2].source="select 'handbook_view';"]){const f=fixture(await host(t),{catalogue:()=>{const r=catalogue();change(r);return r;}});
    await assert.rejects(()=>run({mode:'capture'},f.dependencies()));assert.equal(writeCalls(f).length,0);}
});
test('default discovery cannot create a locator or qualify an absent backup',async t=>{
  const f=fixture(await host(t));await rejectCode(()=>run({},f.dependencies()),'LOCATOR_MISSING');assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);
});
test('public anonymous object response prevents locator publication',async t=>{
  const f=fixture(await host(t),{anonymousStatus:200});await rejectCode(()=>run({mode:'capture'},f.dependencies()),'R2_ANONYMOUS_ACCESS');assert.equal(f.locator,null);
});
test('PUT transport uncertainty or retryable HTTP produces one actual PUT and stops, with no locator',async t=>{
  for(const behavior of [{putUnknown:true},{putStatus:503}]){const f=fixture(await host(t),behavior);await rejectCode(()=>run({mode:'capture'},f.dependencies()),'DB_BACKUP_WRITE_OUTCOME_UNKNOWN');
    assert.equal(f.calls.filter(c=>c.method==='PUT').length,1);assert.equal(f.locator,null);assert.equal(f.calls.filter(c=>new URL(c.url).origin===P.project&&c.method==='POST').length,0);}
});
test('central mutation uncertainty is not repeated and never becomes discovery/restore authority',async t=>{
  const f=fixture(await host(t),{locatorUnknown:true});await rejectCode(()=>run({mode:'capture'},f.dependencies()),'DB_BACKUP_WRITE_OUTCOME_UNKNOWN');
  assert.equal(f.calls.filter(c=>new URL(c.url).origin===P.project&&c.method==='POST').length,1);assert.equal(f.objects.size,6);assert.equal(f.locator,null);
});
test('CAS conflict preserves archives and refuses to claim successful locator publication',async t=>{
  const f=fixture(await host(t),{casConflict:true});await rejectCode(()=>run({mode:'capture'},f.dependencies()),'LOCATOR_CAS_REJECTED');assert.equal(f.objects.size,6);assert.equal(f.locator,null);
});
test('existing unknown locator shape/key cannot be clobbered',async t=>{
  const f=fixture(await host(t));f.locator={document_key:P.locatorKey,payload:{kind:'OTHER_ARCHIVE'},version:1};await assert.rejects(()=>run({mode:'capture'},f.dependencies()));assert.equal(writeCalls(f).length,0);
});
test('changed central export-receipt hash or context fails authenticated index, even for unchanged wire SHA',async t=>{
  const {f}=await captured(t),original=clone(f.locator);for(const mutate of [p=>{p.exportReceiptSha256='c'.repeat(64);},p=>{p.context.runId='54321';},p=>{p.manifestSha256='d'.repeat(64);}]){
    f.locator=clone(original);mutate(f.locator.payload);await rejectCode(()=>run({},f.dependencies()),'INDEX_GCM_AUTHENTICATION');}assert.equal(writeCalls(f).length,7);
});
test('two captures in the same run cannot exchange their authenticated manifest/index group',async t=>{
  const {f}=await captured(t),old=clone(f.locator);await run({mode:'capture'},f.dependencies());assert.deepEqual(f.locator.payload.context,old.payload.context);
  f.locator.payload.index=old.payload.index;await rejectCode(()=>run({},f.dependencies()),'INDEX_GCM_AUTHENTICATION');
});
test('remote wire corruption is rejected before any local SQL verification or remote mutation',async t=>{
  const {f}=await captured(t),writes=writeCalls(f).length;f.behavior.readObject=(key,b)=>{b[b.length-1]^=1;return b;};await rejectCode(()=>run({},f.dependencies()),'REMOTE_OBJECT_SHA');assert.equal(writeCalls(f).length,writes);
});
test('ciphertext from another capture cannot replace one file behind a still-pinned index',async t=>{
  const {f}=await captured(t),first=encryptedIndex(f).index;await run({mode:'capture'},f.dependencies());const second=encryptedIndex(f).index;
  const descriptor=second.objects[0].object;f.objects.set(descriptor.path,Buffer.from(f.objects.get(first.objects[0].object.path)));
  await rejectCode(()=>run({},f.dependencies()),'REMOTE_OBJECT_SHA');
});
test('wrong existing master refuses index GCM; no payload or new mutation is returned',async t=>{
  const {f}=await captured(t);f.env.SUPABASE_SERVICE_ROLE_KEY='another-synthetic-master-never-real-12345';await rejectCode(()=>run({},f.dependencies()),'INDEX_GCM_AUTHENTICATION');assert.equal(writeCalls(f).length,7);
});
test('fresh locator drift after remote verification is refused',async t=>{
  const {f}=await captured(t);let gets=0;f.behavior.beforeLocatorGet=api=>{if(++gets===2)api.locator.version++;};await rejectCode(()=>run({},f.dependencies()),'LOCATOR_CHANGED');
});
test('wire expansion limit is stricter than local cipher cap and refuses before first upload',async t=>{
  // A genuine normal export with incompressible bytes crosses the explicit 36 MB remote preflight.
  const random=crypto.randomBytes(P.maximumCipherBytes+1024),f=fixture(await host(t),{sql:n=>n==='roles.sql'?random:sql(n)});
  await rejectCode(()=>run({mode:'capture',exportOptions:{fileByteLimit:40_000_000,totalByteLimit:50_000_000}},f.dependencies()),'FILE_BOUND');assert.equal(writeCalls(f).length,0);
});
test('capture-only flags cannot be used as caller authority; unsupported modes and discovery options stop',async t=>{
  const f=fixture(await host(t));for(const options of [{mode:'restore'},{mode:'discover',exportOptions:{fileByteLimit:1}}])await assert.rejects(()=>run(options,f.dependencies()));
  assert.equal(f.calls.length,0);assert.equal(f.children.length,0);
});


test('capture preflight refuses bucket HEAD/list 403 or insufficient maximum-wire headroom before any CLI/SQL/cipher/write',async t=>{
  for(const behavior of [{bucketHeadStatus:403},{bucketListStatus:403},{existingUsageBytes:1_800_000_001}]){
    const temp=await host(t),f=fixture(temp,behavior);await assert.rejects(()=>run({mode:'capture'},f.dependencies()));
    assert.equal(f.children.length,0);assert.deepEqual(await fs.readdir(temp),[]);assert.equal(writeCalls(f).length,0);assert.equal(f.objects.size,0);assert.equal(f.locator,null);
    assert.ok(f.calls.every(c=>c.childrenAtRequest===0));
  }
});
test('capture preflight refuses privacy, service access or unknown locator before any CLI/SQL/cipher/write',async t=>{
  for(const kind of ['privacy','service','locator']){const temp=await host(t),f=fixture(temp,{catalogue:()=>{const rows=catalogue();
    if(kind==='privacy')rows[0].metadata.anonSelect=true;if(kind==='service')rows[0].current_access=false;return rows;}});
    if(kind==='locator')f.locator={document_key:P.locatorKey,payload:{kind:'OTHER_ARCHIVE'},version:1};
    await assert.rejects(()=>run({mode:'capture'},f.dependencies()));assert.equal(f.children.length,0);assert.deepEqual(await fs.readdir(temp),[]);assert.equal(writeCalls(f).length,0);assert.equal(f.objects.size,0);
  }
});
test('capture preflight binds hosted Linux and exact run context before even the read-only network checks',async t=>{
  for(const change of [e=>{e.RUNNER_ENVIRONMENT='self-hosted';},e=>{e.GITHUB_REPOSITORY='other/repo';},e=>{e.GITHUB_SHA='not-a-head';},e=>{e.GITHUB_RUN_ID='0';},e=>{e.GITHUB_RUN_ATTEMPT='';}]){
    const temp=await host(t),f=fixture(temp);change(f.env);await assert.rejects(()=>run({mode:'capture'},f.dependencies()));
    assert.equal(f.calls.length,0);assert.equal(f.children.length,0);assert.deepEqual(await fs.readdir(temp),[]);
  }
});
test('capture preflight never replaces fresh privacy/locator/bucket checks after all five normal dumps',async t=>{
  const {f}=await captured(t),firstPut=f.calls.findIndex(c=>c.method==='PUT');assert.ok(firstPut>0);
  const before=f.calls.slice(0,firstPut);assert.ok(before.some(c=>c.childrenAtRequest===0&&new URL(c.url).hostname==='api.supabase.com'));
  assert.ok(before.some(c=>c.childrenAtRequest===7&&new URL(c.url).hostname==='api.supabase.com'));
  for(const count of [0,7]){assert.ok(before.some(c=>c.childrenAtRequest===count&&c.method==='HEAD'&&new URL(c.url).pathname==='/'+P.bucket));
    assert.ok(before.some(c=>c.childrenAtRequest===count&&new URL(c.url).searchParams.get('list-type')==='2'));}
  let reads=0;const temp=await host(t),blocked=fixture(temp,{catalogue:()=>{const rows=catalogue();if(++reads===2)rows[0].metadata.anonSelect=true;return rows;}});
  await rejectCode(()=>run({mode:'capture'},blocked.dependencies()),'LOCATOR_PRIVACY');assert.equal(blocked.children.length,7);assert.equal(writeCalls(blocked).length,0);
});
test('capture preflight detects a concurrent locator change across export before any new upload',async t=>{
  const {f}=await captured(t),priorWrites=writeCalls(f).length;let reads=0;f.behavior.beforeLocatorGet=api=>{if(++reads===2)api.locator.version++;};
  await rejectCode(()=>run({mode:'capture'},f.dependencies()),'LOCATOR_CHANGED');assert.equal(writeCalls(f).length,priorWrites);assert.equal(f.objects.size,6);assert.equal(f.children.length,14);
});

function addObject(f,body){const digest=sha(body),key='bundles/sha256/'+digest+'.json.gz';f.objects.set(key,body);return digest;}
function listing(entries,{truncated=false,token=null,keyCount=entries.length}={}){return'<ListBucketResult><KeyCount>'+keyCount+'</KeyCount><IsTruncated>'+truncated+'</IsTruncated>'+
  entries.map(([key,b])=>'<Contents><Key>'+key+'</Key><Size>'+b.length+'</Size></Contents>').join('')+(token?'<NextContinuationToken>'+token+'</NextContinuationToken>':'')+'</ListBucketResult>';}
function mutateIndex(f,change){const frame=decodeObject(f.objects.get(f.locator.payload.index.path)),binary=Buffer.from(frame.data,'base64');change(binary);
  const body=gzipSync(Buffer.from(JSON.stringify({...frame,data:binary.toString('base64'),bytes:binary.length,sha256:sha(binary)})),{level:1});return addObject(f,body);}
function legacyIndexFixture(f){const pointer=f.locator.payload,raw=Buffer.from(JSON.stringify(encryptedIndex(f).index)),salt=Buffer.alloc(16,31),nonce=Buffer.alloc(12,47);
  const key=Buffer.from(crypto.hkdfSync('sha256',Buffer.from(f.env.SUPABASE_SERVICE_ROLE_KEY),salt,Buffer.from('RavRadar/jakobjorgensen82-commits/RavRadar/SUPABASE_DATABASE_BACKUP/v1/INDEX'),32));
  const cipher=crypto.createCipheriv('aes-256-gcm',key,nonce);cipher.setAAD(Buffer.from(JSON.stringify({purpose:'SUPABASE_DATABASE_BACKUP/v1/INDEX',context:pointer.context,exportReceiptSha256:pointer.exportReceiptSha256,manifestSha256:pointer.manifestSha256})));
  const binary=Buffer.concat([Buffer.from('RR-SUPABASE-DB-INDEX-1\n'),salt,nonce,cipher.update(raw),cipher.final(),cipher.getAuthTag()]);
  const wire=gzipSync(Buffer.from(JSON.stringify({kind:'SUPABASE_DB_ENCRYPTED_INDEX_FRAME_V1',bytes:binary.length,sha256:sha(binary),data:binary.toString('base64')})),{level:1});
  const digest=addObject(f,wire);return{path:'bundles/sha256/'+digest+'.json.gz',sha256:digest,bytes:wire.length};}
function withoutDatabase(f){f.behavior.denySupabase=true;f.locator=null;for(const name of ['SUPABASE_URL','SUPABASE_ACCESS_TOKEN','SUPABASE_DB_PASSWORD','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT'])delete f.env[name];}

test('bootstrap enumerates authenticated indices with no DB/CLI/write; explicit SHA alone selects normal five-file verification',async t=>{
  const {f}=await captured(t),wanted=f.locator.payload.index.sha256,priorWrites=writeCalls(f).length,priorCalls=f.calls.length,priorNames=await fs.readdir(f.env.RUNNER_TEMP);withoutDatabase(f);
  const list=await run({mode:'bootstrap'},f.dependencies());assert.equal(list.status,'R2_BOOTSTRAP_AUTHENTICATED_INDEX_CANDIDATES_ONLY');assert.equal(list.selectionRequired,true);
  assert.equal(list.candidates.length,1);assert.equal(list.candidates[0].indexSha256,wanted);assert.equal(new Date(list.candidates[0].completedAt).toISOString(),list.candidates[0].completedAt);
  assert.equal(list.diagnostics.listedObjects,6);assert.equal(list.diagnostics.nonIndexSqlFrames,5);assert.deepEqual(list.diagnostics.invalidOrUnsupported,{});
  assert.equal(list.remoteArchiveVerified,false);assert.equal(list.centralLocatorVerified,false);assert.equal(list.archiveWrittenThisOperation,false);assert.equal(list.centralLocatorWrittenThisOperation,false);
  assert.deepEqual(await fs.readdir(f.env.RUNNER_TEMP),priorNames,'enumeration creates no local restore directory');assert.equal(Object.hasOwn(list,'files'),false);
  const selected=await run({mode:'bootstrap',indexSha256:wanted},f.dependencies());assert.equal(selected.status,'R2_BOOTSTRAP_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY');
  assert.equal(selected.selectionRequired,false);assert.equal(selected.indexSha256,wanted);assert.equal(selected.remoteArchiveVerified,true);assert.equal(selected.centralLocatorVerified,false);
  assert.equal(selected.archiveWrittenThisOperation,false);assert.equal(selected.centralLocatorWrittenThisOperation,false);assert.equal(selected.fullDatabaseBackupVerified,false);assert.equal(selected.authRestoreVerified,false);assert.equal(selected.freeReady,false);
  assert.deepEqual(selected.files.map(x=>x.sqlSha256),names.map(n=>sha(sql(n))));assert.ok(!JSON.stringify(selected).includes('INSERT'));
  assert.equal(f.children.length,7);assert.equal(writeCalls(f).length,priorWrites);assert.ok(f.calls.slice(priorCalls).every(c=>['GET','HEAD'].includes(c.method)&&new URL(c.url).hostname.endsWith('.eu.r2.cloudflarestorage.com')));
});
test('bootstrap never uses runId or equal authenticated completedAt as automatic selection authority',async t=>{
  const f=fixture(await host(t)),NativeDate=Date;let first,second;
  try{globalThis.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-11-02T12:00:00.000Z']));}static now(){return NativeDate.now();}};
    first=await run({mode:'capture'},f.dependencies());second=await run({mode:'capture'},f.dependencies());
  }finally{globalThis.Date=NativeDate;}
  withoutDatabase(f);const list=await run({mode:'bootstrap'},f.dependencies());assert.equal(list.candidates.length,2);assert.equal(list.candidates[0].completedAt,list.candidates[1].completedAt);
  assert.equal(list.selectionRequired,true);assert.equal(list.remoteArchiveVerified,false);assert.equal(Object.hasOwn(list,'indexSha256'),false);assert.notEqual(first.indexSha256,second.indexSha256);
  const chosen=await run({mode:'bootstrap',indexSha256:first.indexSha256},f.dependencies());assert.equal(chosen.indexSha256,first.indexSha256);assert.equal(chosen.remoteArchiveVerified,true);
});
test('bootstrap uses normal paginated bucketUsage and rejects duplicate or inconsistent listing rather than a partial success',async t=>{
  const {f}=await captured(t);f.behavior.listXml=(api,q)=>{const rows=[...api.objects];return q.has('continuation-token')?listing(rows.slice(3)):listing(rows.slice(0,3),{truncated:true,token:'second'});};
  withoutDatabase(f);const list=await run({mode:'bootstrap'},f.dependencies());assert.equal(list.candidates.length,1);assert.equal(list.diagnostics.listedObjects,6);
  f.behavior.listXml=(api,q)=>{const rows=[...api.objects];return q.has('continuation-token')?listing(rows.slice(2)):listing(rows.slice(0,3),{truncated:true,token:'second'});};
  await rejectCode(()=>run({mode:'bootstrap'},f.dependencies()),'BOOTSTRAP_LIST_DUPLICATE');
  f.behavior.listXml=api=>listing([...api.objects],{keyCount:7});await assert.rejects(()=>run({mode:'bootstrap'},f.dependencies()));
});
test('bootstrap reports unsupported names and corrupt/non-index candidates without printing unknown paths or claiming complete backups',async t=>{
  const {f}=await captured(t);f.objects.set('synthetic-unsupported-private-name',Buffer.from('x'));addObject(f,gzipSync(Buffer.from('{"kind":"OTHER"}')));
  withoutDatabase(f);const result=await run({mode:'bootstrap'},f.dependencies());assert.equal(result.candidates.length,1);assert.equal(result.diagnostics.unsupportedNamespaceObjects,1);
  assert.equal(Object.values(result.diagnostics.invalidOrUnsupported).reduce((a,b)=>a+b,0),1);assert.ok(!JSON.stringify(result).includes('synthetic-unsupported-private-name'));
  assert.equal(result.fullDatabaseBackupVerified,false);assert.equal(result.archiveWrittenThisOperation,false);
});
test('bootstrap authenticates the complete new raw header/tag, despite recomputed framing and content address',async t=>{
  const {f}=await captured(t);const headerChanged=mutateIndex(f,b=>{const at=b.indexOf(Buffer.from('"runId":"12345"'));assert.ok(at>0);b[at+9]=54;});
  const tagChanged=mutateIndex(f,b=>{b[b.length-1]^=1;});withoutDatabase(f);
  for(const digest of [headerChanged,tagChanged])await rejectCode(()=>run({mode:'bootstrap',indexSha256:digest},f.dependencies()),'INDEX_GCM_AUTHENTICATION');
  const scan=await run({mode:'bootstrap'},f.dependencies());assert.equal(scan.candidates.length,1);assert.equal(scan.diagnostics.invalidOrUnsupported.INDEX_GCM_AUTHENTICATION,2);
});
test('legacy index retains central-pointer verification but cannot claim DB-independent bootstrap',async t=>{
  const {f}=await captured(t),legacy=legacyIndexFixture(f);f.locator.payload.index=legacy;
  const central=await run({},f.dependencies());assert.equal(central.remoteArchiveVerified,true);assert.equal(central.centralLocatorVerified,true);assert.equal(central.archiveWrittenThisOperation,false);assert.equal(central.centralLocatorWrittenThisOperation,false);
  withoutDatabase(f);const scan=await run({mode:'bootstrap'},f.dependencies());assert.equal(scan.candidates.length,1);assert.equal(scan.diagnostics.legacyRequiresDbPointer,1);
  await rejectCode(()=>run({mode:'bootstrap',indexSha256:legacy.sha256},f.dependencies()),'BOOTSTRAP_LEGACY_REQUIRES_DB_POINTER');
});
test('bootstrap refuses absent/SQL explicit selections and any selected corrupt five-file group without automatic fallback',async t=>{
  const {f}=await captured(t),index=encryptedIndex(f).index,wanted=f.locator.payload.index.sha256,sqlSha=index.objects[0].object.sha256;withoutDatabase(f);
  await rejectCode(()=>run({mode:'bootstrap',indexSha256:'0'.repeat(64)},f.dependencies()),'BOOTSTRAP_SHA_NOT_LISTED');
  await rejectCode(()=>run({mode:'bootstrap',indexSha256:sqlSha},f.dependencies()),'BOOTSTRAP_SELECTED_NOT_INDEX');
  const entry=index.objects[0].object,b=Buffer.from(f.objects.get(entry.path));b[b.length-1]^=1;f.objects.set(entry.path,b);
  await rejectCode(()=>run({mode:'bootstrap',indexSha256:wanted},f.dependencies()),'REMOTE_OBJECT_SHA');
});
test('bootstrap enforces candidate/list counts and list-wire cap before unbounded object downloads',async t=>{
  const {f}=await captured(t);withoutDatabase(f);let before=f.calls.length;
  const many=n=>Array.from({length:n},(_,i)=>['bundles/sha256/'+sha(Buffer.from(String(i)))+'.json.gz',Buffer.from('x')]);
  f.behavior.listXml=()=>listing(many(B.maximumListedObjects+1));await rejectCode(()=>run({mode:'bootstrap'},f.dependencies()),'BOOTSTRAP_LIST_COUNT');
  assert.ok(f.calls.slice(before).every(c=>!new URL(c.url).pathname.includes('/bundles/')));
  before=f.calls.length;f.behavior.listXml=()=>listing(many(B.maximumCandidates+1));await rejectCode(()=>run({mode:'bootstrap'},f.dependencies()),'BOOTSTRAP_CANDIDATE_LIMIT');
  assert.ok(f.calls.slice(before).every(c=>!new URL(c.url).pathname.includes('/bundles/')));
  f.behavior.listXml=()=>'<ListBucketResult>'+(' '.repeat(B.maximumListBytes))+'</ListBucketResult>';await rejectCode(()=>run({mode:'bootstrap'},f.dependencies()),'RESPONSE_BOUND');
});
test('bootstrap bounds actual candidate response bytes and search deadline, not just claimed listing sizes',async t=>{
  const {f}=await captured(t);withoutDatabase(f);f.behavior.readObject=()=>Buffer.alloc(B.maximumIndexWireBytes+1);await rejectCode(()=>run({mode:'bootstrap'},f.dependencies()),'RESPONSE_BOUND');
  delete f.behavior.readObject;const original=Date.now,now=original();let reads=0;
  try{Date.now=()=>now+(++reads>2?B.maximumSearchMs+1:0);await rejectCode(()=>run({mode:'bootstrap'},f.dependencies()),'BOOTSTRAP_DEADLINE');}finally{Date.now=original;}
});

// The exact Root-corrected UTF8 fixture is shared as test DATA only.
const materializationSql=name=>Buffer.from('-- synthetic '+name+' æøå\nINSERT INTO synthetic VALUES (9007199254740993,0.123456789012345678901234567890);\n');

async function materializationTarget(f,name='sql-parent'){
  const canonical=await fs.realpath(f.env.RUNNER_TEMP),parent=path.join(canonical,name);await fs.mkdir(parent,{mode:0o700});return path.join(parent,'sql');
}
const absent=async file=>(await fs.lstat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;}))===null;
test('archive materialization: central authenticated group writes exact five UTF8 SQL bytes only after all five normal checks',async t=>{
  const {f}=await captured(t,{sql:materializationSql}),destination=await materializationTarget(f),writes=writeCalls(f).length,cli=f.children.length;
  const createDecipher=crypto.createDecipheriv,open=fs.open;let decipherCalls=0,sqlOpens=0;
  t.mock.method(crypto,'createDecipheriv',function(...args){decipherCalls++;return createDecipher.apply(this,args);});
  t.mock.method(fs,'open',async function(file,...args){if(path.dirname(String(file))===destination){
    if(sqlOpens===0)assert.ok(decipherCalls>=11,'index + all five remote checks + all five materializer checks precede first SQL open');sqlOpens++;
  }return open.call(this,file,...args);});
  const result=await run({mode:'materialize',destination},f.dependencies());
  assert.equal(result.status,'CENTRAL_DISCOVERY_FIVE_SQL_FILES_MATERIALIZED_ONLY');assert.equal(result.manifestSha256,f.locator.payload.manifestSha256);
  assert.equal(result.materializationCompleted,true);assert.equal(result.remoteArchiveVerified,true);assert.equal(result.centralLocatorVerified,true);
  assert.deepEqual((await fs.readdir(destination)).sort(),[...names].sort());
  for(const file of result.files){const bytes=await fs.readFile(path.join(destination,file.file));assert.ok(bytes.equals(materializationSql(file.file)));
    assert.equal(file.bytes,bytes.length);assert.equal(file.sha256,sha(bytes));}
  assert.equal(result.archiveWrittenThisOperation,false);assert.equal(result.centralLocatorWrittenThisOperation,false);
  for(const key of ['databaseRestoreExecuted','authRestoreVerified','fullDatabaseBackupVerified','freeReady','sourceAdmission'])assert.equal(result[key],false);
  assert.equal(writeCalls(f).length,writes);assert.equal(f.children.length,cli,'materialize must not execute CLI or SQL');
  assert.ok(!JSON.stringify(result).includes('INSERT')&&!JSON.stringify(result).includes('æøå')&&!JSON.stringify(result).includes('synthetic-existing'));
});
test('archive materialization: explicit bootstrap SHA authenticates its own manifest without database or status authority',async t=>{
  const {f,result:capturedStatus}=await captured(t,{sql:materializationSql}),wanted=f.locator.payload.index.sha256,manifest=f.locator.payload.manifestSha256;
  capturedStatus.manifestSha256='f'.repeat(64);capturedStatus.authRestoreVerified=true;
  const destination=await materializationTarget(f);withoutDatabase(f);f.calls.length=0;
  const result=await run({mode:'materialize',indexSha256:wanted,destination},f.dependencies());
  assert.equal(result.status,'R2_BOOTSTRAP_FIVE_SQL_FILES_MATERIALIZED_ONLY');assert.equal(result.manifestSha256,manifest);
  assert.equal(result.materializationCompleted,true);assert.equal(result.selectionRequired,false);assert.equal(result.indexSha256,wanted);
  assert.equal(result.centralLocatorVerified,false);assert.equal(result.remoteArchiveVerified,true);
  assert.ok(f.calls.every(c=>['GET','HEAD'].includes(c.method)&&new URL(c.url).hostname.endsWith('.eu.r2.cloudflarestorage.com')));
  assert.equal(writeCalls(f).length,0);assert.equal(f.children.length,7);assert.equal(result.databaseRestoreExecuted,false);assert.equal(result.authRestoreVerified,false);
  for(const name of names)assert.ok((await fs.readFile(path.join(destination,name))).equals(materializationSql(name)));
});
test('archive materialization: unsupported platform, destination, extra manifest pin and cross-mode options stop before transport',async t=>{
  for(const [options,platform,code]of [
    [{mode:'materialize',destination:'/absolute/synthetic'},'win32','MATERIALIZATION_LINUX_REQUIRED'],
    [{mode:'materialize'},'linux','MATERIALIZATION_TARGET'],
    [{mode:'materialize',destination:'relative'},'linux','MATERIALIZATION_TARGET'],
    [{mode:'materialize',destination:'/absolute/synthetic',manifestSha256:'f'.repeat(64)},'linux','MATERIALIZATION_OPTIONS'],
    [{mode:'discover',destination:'/absolute/synthetic'},'linux','MATERIALIZATION_OPTIONS'],
    [{mode:'materialize',destination:'/absolute/synthetic',indexSha256:'unknown'},'linux','BOOTSTRAP_SHA']]){
    const f=fixture(await host(t)),dependencies=f.dependencies();dependencies.processImpl.platform=platform;
    await rejectCode(()=>run(options,dependencies),code);assert.equal(f.calls.length,0);assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);
  }
});
test('archive materialization: corrupted final remote object and fresh locator drift produce no plaintext target',async t=>{
  for(const failure of ['last-object','locator-drift']){
    const {f}=await captured(t),destination=await materializationTarget(f),oldWrites=writeCalls(f).length;
    if(failure==='last-object'){const last=encryptedIndex(f).index.objects.at(-1).object.path;f.behavior.readObject=(key,b)=>{if(key===last)b[b.length-1]^=1;return b;};}
    else{let reads=0;f.behavior.beforeLocatorGet=()=>{if(++reads===2)f.locator={...f.locator,version:f.locator.version+1};};}
    await rejectCode(()=>run({mode:'materialize',destination},f.dependencies()),failure==='last-object'?'REMOTE_OBJECT_SHA':'LOCATOR_CHANGED');
    assert.equal(await absent(destination),true);assert.equal(writeCalls(f).length,oldWrites);assert.equal(f.children.length,7);
  }
});
test('archive materialization: existing target and actual aborted signal keep owned plaintext boundary closed',async t=>{
  const {f}=await captured(t),destination=await materializationTarget(f);await fs.mkdir(destination,{mode:0o700});
  const sentinel=Buffer.from('synthetic retained prior target');await fs.writeFile(path.join(destination,'keep'),sentinel,{mode:0o600});
  await rejectCode(()=>run({mode:'materialize',destination},f.dependencies()),'MATERIALIZATION_TARGET_EXISTS');
  assert.ok((await fs.readFile(path.join(destination,'keep'))).equals(sentinel));assert.deepEqual(await fs.readdir(destination),['keep']);
  const abortDestination=await materializationTarget(f,'abort-parent'),controller=new AbortController();controller.abort();
  await rejectCode(()=>run({mode:'materialize',destination:abortDestination},{...f.dependencies(),signal:controller.signal}),'MATERIALIZATION_ABORTED');
  assert.equal(await absent(abortDestination),true);assert.equal(f.children.length,7);assert.equal(writeCalls(f).length,7);
});
test('archive materialization: actual CLI rejects incomplete or caller manifest flags without payload or transport',async()=>{
  const {execFile}=await import('node:child_process'),{fileURLToPath}=await import('node:url');
  for(const args of [['--materialize'],['--materialize','--destination','synthetic','--manifest-sha','f'.repeat(64)]]){
    const result=await new Promise(resolve=>execFile(process.execPath,[fileURLToPath(new URL('./archive-supabase-database-backup.mjs',import.meta.url)),...args],
      {env:Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP'].filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]])),timeout:10000},(error,stdout,stderr)=>resolve({error,stdout,stderr})));
    assert.equal(result.error?.code,1);assert.equal(result.stdout,'');
    const report=JSON.parse(result.stderr.trim());assert.equal(report.code,'EXPLICIT_BACKUP_MODE');assert.equal(report.freeReady,false);assert.equal(report.automaticRetry,false);
    assert.ok(!result.stderr.includes('INSERT')&&!result.stderr.includes('synthetic-existing'));
  }
});
