import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {runSupabaseDatabaseArchive as run,auditSupabaseDatabaseArchiveRoleGrant as auditGrant,FIXED_844_ROLE_GRANT_COMMITMENTS as commitments,DB_REMOTE_BACKUP_POLICY as P,DB_BOOTSTRAP_POLICY as B} from './archive-supabase-database-backup.mjs';
import {PRIVATE_STUDY_ADMIN_FUNCTIONS} from './lib/private-trip-study-admin-transport.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),clone=x=>JSON.parse(JSON.stringify(x));
const names=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const sql=name=>Buffer.from('-- synthetic '+name+'\nINSERT INTO synthetic VALUES (9007199254740993,0.12345678901234567890123456789);\n');
// PostgreSQL JSONB emits object keys by UTF-8 byte length, then binary order.
function postgresJsonbOrder(value){
  if(Array.isArray(value))return value.map(postgresJsonbOrder);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.entries(value).sort(([a],[b])=>
    Buffer.byteLength(a)-Buffer.byteLength(b)||Buffer.compare(Buffer.from(a),Buffer.from(b)))
    .map(([key,item])=>[key,postgresJsonbOrder(item)]));
}
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
  const calls=[],children=[],objects=new Map(),oldLocators=[],processImpl=Object.assign(new EventEmitter(),{platform:'linux',versions:{node:'24.19.0'}});let pid=5000,now=0,locator=null;
  const spawnImpl=(command,args,options)=>{children.push({command,args,options});const child=Object.assign(new EventEmitter(),{pid:++pid,stdout:new PassThrough(),stderr:new PassThrough(),unref(){}});
    children.at(-1).child=child;child.alive=true;queueMicrotask(async()=>{let code=0;try{if(args[0]==='--version')child.stdout.write('2.117.0\n');else if(args[0]==='db'){
      const file=args[args.indexOf('--file')+1],name=path.basename(file);await fs.writeFile(file,behavior.sql?.(name)??sql(name),{mode:0o600,flag:'wx'});if(name===behavior.failDump)code=1;}
    }catch{code=1;}child.alive=false;child.stdout.end();child.stderr.end();child.emit('exit',code,null);child.emit('close',code,null);});return child;};
  const killImpl=(negativePid,signal)=>{assert.ok(negativePid<0);const c=children.find(x=>x.child?.pid===-negativePid);if(!c?.child?.alive){const e=new Error('gone');e.code='ESRCH';throw e;}assert.equal(signal,0);};
  const response=(body,status=200,headers={})=>new Response([204,205,304].includes(status)?null:body,{status,headers});
  const json=(value,status=200)=>response(JSON.stringify(value),status,{'content-type':'application/json'});
  const locatorRepresentation=method=>{
    if(!locator)return [];
    const row=clone(locator);
    if(behavior.reorderLocatorJsonb)row.payload=postgresJsonbOrder(row.payload);
    behavior.mutateLocatorResponse?.(row,method);
    return [row];
  };
  const fetchImpl=async(url,options={})=>{
    const u=new URL(url),method=options.method||'GET',headers=new Headers(options.headers),body=options.body;calls.push({url,method,headers,body,childrenAtRequest:children.length});
    if(u.hostname==='api.supabase.com'){assert.ok(!behavior.denySupabase,'bootstrap must never contact Supabase');assert.equal(method,'POST');assert.ok(JSON.parse(body).query.includes('has_table_privilege'));return json(behavior.catalogue?.()??catalogue(),behavior.catalogueStatus??200);}
    if(u.origin===P.project&&u.pathname==='/rest/v1/admin_document_versions'){
      assert.ok(!behavior.denySupabase,'receipt/bootstrap never contacts database');assert.equal(method,'GET');
      assert.equal(u.searchParams.get('document_key'),'eq.'+P.locatorKey);
      const wanted=u.searchParams.get('payload->index->>sha256')?.slice(3);
      const rows=oldLocators.filter(row=>row.payload.index.sha256===wanted).slice(0,2);
      return json(behavior.historyRows?behavior.historyRows(clone(rows)):rows);
    }
    if(u.origin===P.project){assert.ok(!behavior.denySupabase,'bootstrap must never contact Supabase');assert.equal(u.pathname,'/rest/v1/admin_documents');assert.equal(headers.get('apikey'),env.SUPABASE_SERVICE_ROLE_KEY);
      if(method==='GET'){assert.equal(u.searchParams.get('document_key'),'eq.'+P.locatorKey);if(behavior.beforeLocatorGet)behavior.beforeLocatorGet(api);return json(locatorRepresentation(method));}
      const payload=JSON.parse(body);assert.equal(payload.updated_by,null);assert.equal(payload.payload.bucket,P.bucket);
      if(behavior.locatorUnknown)throw new Error('synthetic private response never returned');
      if(behavior.casConflict)return json([]);
      if(method==='POST'){assert.equal(u.searchParams.get('on_conflict'),'document_key');if(locator)return json([]);locator={document_key:P.locatorKey,payload:payload.payload,version:1};}
      else{assert.equal(method,'PATCH');assert.equal(u.searchParams.get('document_key'),'eq.'+P.locatorKey);if(u.searchParams.get('version')!=='eq.'+locator.version)return json([]);
        oldLocators.push(clone(locator));locator={...locator,payload:payload.payload,version:locator.version+1};}
      return json(locatorRepresentation(method));
    }
    assert.equal(u.hostname,env.RAVRADAR_R2_ACCOUNT_ID+'.eu.r2.cloudflarestorage.com');assert.ok(u.pathname.startsWith('/'+P.bucket));
    const key=u.pathname.slice(P.bucket.length+2),authenticated=headers.has('authorization');
    if(!authenticated){assert.equal(method,'GET');assert.equal(headers.get('range'),'bytes=0-0');assert.equal(options.redirect,'manual');
      if(behavior.anonymousResponse)return behavior.anonymousResponse();
      return response(behavior.anonymousBody??'',behavior.anonymousStatus??403,behavior.anonymousHeaders??{});}
    if(!key){if(method==='HEAD')return response('',behavior.bucketHeadStatus??200);assert.equal(method,'GET');assert.equal(u.searchParams.get('list-type'),'2');
      if(behavior.listXml)return response(behavior.listXml(api,u.searchParams),200);
      const entries=[...objects].map(([key,b])=>'<Contents><Key>'+key+'</Key><Size>'+b.length+'</Size></Contents>').join('')
        +(behavior.existingUsageBytes?'<Contents><Key>existing-synthetic-object</Key><Size>'+behavior.existingUsageBytes+'</Size></Contents>':'');
      return response('<ListBucketResult><IsTruncated>false</IsTruncated>'+entries+'</ListBucketResult>',behavior.bucketListStatus??200);}
    const part=/^bundles\/sha256\/[0-9a-f]{64}\/part-[0-9]{3}-([0-9a-f]{64})\.json\.gz\.part$/.exec(key);
    if(!part)assert.match(key,/^bundles\/sha256\/[0-9a-f]{64}\.json\.gz$/);
    if(method==='HEAD')return response('',objects.has(key)?200:404);
    if(method==='PUT'){assert.equal(headers.get('content-type'),'application/gzip');assert.equal(headers.get('if-none-match'),'*');
      assert.ok(Buffer.isBuffer(body));assert.ok(body.length<=P.maximumObjectBytes);assert.equal(sha(body),part?part[1]:key.split('/').at(-1).split('.')[0]);
      if(part)assert.ok(gunzipSync(body,{maxOutputLength:P.maximumCipherBytes}).length>0);
      else{
        const frame=JSON.parse(gunzipSync(body));assert.match(frame.kind,/^SUPABASE_DB_(SQL_CIPHERTEXT|ENCRYPTED_INDEX|ENCRYPTED_RESTORE_RECEIPT)_FRAME_V1$/);
        assert.equal(sha(Buffer.from(frame.data,'base64')),frame.sha256);assert.equal(Buffer.from(frame.data,'base64').length,frame.bytes);
      }
      if(behavior.putUnknown){objects.set(key,Buffer.from(body));throw new Error('synthetic private uncertain outcome');}
      if(behavior.putStatus)return response('',behavior.putStatus);
      if(objects.has(key))return response('',412);objects.set(key,Buffer.from(body));return response('',200);}
    if(method==='DELETE'){
      assert.equal(behavior.allowRetirement,true,'ordinary capture/discovery cannot delete');
      if(behavior.deleteNoop)return response('',204);
      objects.delete(key);
      if(typeof behavior.deleteUnknown==='function'?behavior.deleteUnknown(key):behavior.deleteUnknown)throw new Error('synthetic lost delete response');
      return response('',204);
    }
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
  assert.deepEqual(result.files.map(x=>x.cipherBytes),JSON.parse(m).files.map(x=>x.cipherBytes));
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
test('PostgreSQL JSONB locator order preserves exact capture CAS and current and legacy readback',async t=>{
  const {f,result:first}=await captured(t,{reorderLocatorJsonb:true});
  assert.equal(first.locatorVersion,1);
  assert.notEqual(JSON.stringify(postgresJsonbOrder(f.locator.payload)),JSON.stringify(f.locator.payload));
  const firstObjects=new Map(f.objects);
  const discovered=await run({},f.dependencies());
  assert.equal(discovered.indexSha256,first.indexSha256);
  assert.deepEqual(discovered.files.map(x=>x.sqlSha256),names.map(n=>sha(sql(n))));
  assert.equal(writeCalls(f).filter(x=>new URL(x.url).origin===P.project).length,1);
  const second=await run({mode:'capture'},f.dependencies());
  assert.equal(second.locatorVersion,2);
  const patch=writeCalls(f).find(x=>x.method==='PATCH');
  assert.equal(new URL(patch.url).searchParams.get('version'),'eq.1');
  assert.equal(writeCalls(f).filter(x=>new URL(x.url).origin===P.project).length,2);
  for(const [key,bytes] of firstObjects)assert.ok(f.objects.get(key).equals(bytes));
  const legacy=legacyIndexFixture(f);f.locator.payload.index=legacy;
  const legacyRead=await run({},f.dependencies());
  assert.equal(legacyRead.indexSha256,legacy.sha256);
  assert.deepEqual(legacyRead.files.map(x=>x.sqlSha256),names.map(n=>sha(sql(n))));
  const thirdFixture=fixture(await host(t),{reorderLocatorJsonb:true,mutateLocatorResponse:(row,method)=>{
    if(method==='POST')row.version++;
  }});
  await rejectCode(()=>run({mode:'capture'},thirdFixture.dependencies()),'LOCATOR_CAS_REJECTED');
  assert.equal(writeCalls(thirdFixture).filter(x=>new URL(x.url).origin===P.project).length,1);
  const mismatchFixture=fixture(await host(t),{reorderLocatorJsonb:true,mutateLocatorResponse:(row,method)=>{
    if(method==='POST')row.payload.context.sourceHead='b'.repeat(40);
  }});
  await rejectCode(()=>run({mode:'capture'},mismatchFixture.dependencies()),'LOCATOR_CAS_REJECTED');
  assert.equal(writeCalls(mismatchFixture).filter(x=>new URL(x.url).origin===P.project).length,1);
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
test('normal encrypted backup admits exact bounded Authorization400 and rejects other denials with actual HTTPstatus',async t=>{
  const xml='<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidArgument</Code><Message>Authorization</Message></Error>';
  const {result}=await captured(t,{anonymousStatus:400,anonymousBody:xml,anonymousHeaders:{'content-type':'application/xml'}});
  assert.equal(result.remoteArchiveVerified,true);assert.equal(result.centralLocatorVerified,true);assert.equal(result.fullDatabaseBackupVerified,false);
  for(const status of [400,302,503]){
    const f=fixture(await host(t),{anonymousStatus:status,anonymousBody:'<Error><Code>Other</Code></Error>',anonymousHeaders:{'content-type':'application/xml'}});
    await assert.rejects(()=>run({mode:'capture'},f.dependencies()),e=>e.code==='R2_ANONYMOUS_ACCESS'&&e.httpStatus===status);
    assert.equal(f.locator,null);assert.equal(f.calls.filter(c=>c.method==='PUT').length,1);
  }
  const huge=fixture(await host(t),{anonymousStatus:400,anonymousBody:' '.repeat(4097),anonymousHeaders:{'content-type':'application/xml','content-length':'4097'}});
  await assert.rejects(()=>run({mode:'capture'},huge.dependencies()),e=>e.code==='R2_ANONYMOUS_ACCESS'&&e.httpStatus===400);assert.equal(huge.locator,null);assert.equal(huge.calls.filter(c=>c.method==='PUT').length,1);
});
test('normal backup cancels anonymous200 before guarded transport consumes any object bytes',async t=>{
  let pulls=0,cancels=0;const f=fixture(await host(t),{anonymousResponse:()=>new Response(new ReadableStream({pull(){pulls++;throw Error('anonymous object bytes must not be read');},cancel(){cancels++;}},{highWaterMark:0}),{status:200})});
  await assert.rejects(()=>run({mode:'capture'},f.dependencies()),e=>e.code==='R2_ANONYMOUS_ACCESS'&&e.httpStatus===200);
  assert.equal(pulls,0);assert.equal(cancels,1);assert.equal(f.locator,null);assert.equal(f.calls.filter(c=>c.method==='PUT').length,1);
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
test('segmented capture checks fresh exact whole-group headroom before first upload',async t=>{
  const random=crypto.randomBytes(P.maximumCipherBytes+1024),f=fixture(await host(t),{sql:n=>n==='roles.sql'?random:sql(n)});
  let reads=0;f.behavior.beforeLocatorGet=()=>{if(++reads===3)f.behavior.existingUsageBytes=P.maximumBucketBytes-random.length;};
  await rejectCode(()=>run({mode:'capture',exportOptions:{fileByteLimit:40_000_000,totalByteLimit:50_000_000}},f.dependencies()),'R2_CAPTURE_HEADROOM');
  assert.equal(reads,3);assert.equal(f.children.length,7);assert.equal(writeCalls(f).length,0);assert.equal(f.objects.size,0);assert.equal(f.locator,null);
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
test('archive materialization: one private commitment binds only the exact authenticated archive',async t=>{
  const {f}=await captured(t,{sql:materializationSql}),index=f.locator.payload.index;
  await run({mode:'capture'},f.dependencies());
  const current=f.locator.payload.index;
  assert.notEqual(current.sha256,index.sha256);
  const commit=(raw,domain='RavRadar/SupabaseArchiveRestore/v1/selector')=>sha(Buffer.from(JSON.stringify([domain,raw])));
  const indexCommitmentSha256=commit(index.sha256);
  const runCommit=(destination,overrides={})=>run({mode:'materialize',destination,indexCommitmentSha256,...overrides},f.dependencies());
  const listing=(objects,more='')=>'<ListBucketResult><IsTruncated>'+(more?'true':'false')+'</IsTruncated>'+
    (more?'<NextContinuationToken>'+more+'</NextContinuationToken>':'')+objects
      .map(({path,bytes})=>'<Contents><Key>'+path+'</Key><Size>'+bytes+'</Size></Contents>').join('')+'</ListBucketResult>';
  const objects=[...f.objects].map(([path,bytes])=>({path,bytes:bytes.length}));
  const objectGets=()=>f.calls.filter(c=>c.method==='GET'&&c.headers.has('authorization')&&c.url.includes('/bundles/'));
  withoutDatabase(f);f.calls.length=0;
  let listed=0;
  f.behavior.listXml=(_f,query)=>{
    listed++;
    if(query.has('continuation-token')){
      assert.equal(query.get('continuation-token'),'synthetic-page-2');
      return listing(objects.filter(x=>x.path!==index.path));
    }
    return listing([index],'synthetic-page-2');
  };
  const destination=await materializationTarget(f,'exact-commitment');
  const result=await runCommit(destination);
  assert.equal(listed,2);
  assert.equal(result.status,'R2_BOOTSTRAP_FIVE_SQL_FILES_MATERIALIZED_ONLY');
  assert.equal(result.indexCommitmentSha256,indexCommitmentSha256);
  assert.equal(result.remoteArchiveVerified,true);assert.equal(result.materializationCompleted,true);
  assert.ok(!JSON.stringify(result).includes(index.sha256));
  assert.ok(!Object.hasOwn(result,'candidates')&&!Object.hasOwn(result,'diagnostics'));
  assert.equal(objectGets().length,6);
  assert.ok(objectGets()[0].url.endsWith('/'+index.path));
  assert.ok(objectGets().every(c=>!c.url.endsWith('/'+current.path)));
  const listAt=f.calls.map((c,i)=>[c,i]).filter(([c])=>new URL(c.url).searchParams.has('list-type')).at(-1)[1];
  assert.ok(listAt<f.calls.indexOf(objectGets()[0]));
  for(const name of names)assert.deepEqual(await fs.readFile(path.join(destination,name)),materializationSql(name));
  assert.equal(writeCalls(f).length,0);assert.equal(f.children.length,14);
  delete f.behavior.listXml;

  for(const [tag,overrides,code] of [
    ['wrong',{indexCommitmentSha256:'0'.repeat(64)},'RESTORE_COMMITTED_INDEX_ABSENT'],
    ['raw',{indexCommitmentSha256:index.sha256},'RESTORE_COMMITTED_INDEX_ABSENT'],
    ['wrong-domain',{indexCommitmentSha256:commit(index.sha256,'RavRadar/SupabaseRoleGrantAudit/v1/selector')},'RESTORE_COMMITTED_INDEX_ABSENT'],
    ['both',{indexSha256:index.sha256},'MATERIALIZATION_COMMITMENT'],
  ]){
    const target=await materializationTarget(f,tag);f.calls.length=0;
    await rejectCode(()=>runCommit(target,overrides),code);
    assert.equal(objectGets().length,0);assert.equal(await absent(target),true);
  }

  for(const [tag,xml,code] of [
    ['duplicate',(_f,q)=>q.has('continuation-token')?listing([index]):listing([index],'synthetic-page-2'),'BOOTSTRAP_LIST_DUPLICATE'],
    ['bound',()=>listing([{...index,bytes:B.maximumIndexWireBytes+1}]),'RESTORE_COMMITTED_INDEX_BOUND'],
  ]){
    const target=await materializationTarget(f,tag);f.calls.length=0;f.behavior.listXml=xml;
    await rejectCode(()=>runCommit(target),code);
    assert.equal(objectGets().length,0);assert.equal(await absent(target),true);
  }
  delete f.behavior.listXml;
  const broken=await materializationTarget(f,'wrong-bytes');f.calls.length=0;
  f.behavior.readObject=(key,bytes)=>key===index.path?Buffer.alloc(bytes.length,65):bytes;
  await rejectCode(()=>runCommit(broken),'REMOTE_OBJECT_SHA');
  assert.equal(objectGets().length,1);assert.equal(await absent(broken),true);
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

test('database-query HTTP201 success passes backup privacy before unchanged missing-locator refusal',async t=>{
  const f=fixture(await host(t),{catalogueStatus:201});
  await rejectCode(()=>run({mode:'discover'},f.dependencies()),'LOCATOR_MISSING');
  assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);
  assert(f.calls.some(c=>new URL(c.url).origin===P.project&&c.method==='GET'));
});
test('database-query HTTP status and malformed201 backup privacy stop before CLI archive or locator writes',async t=>{
  for(const status of [401,403,429,500,204]){
    const f=fixture(await host(t),{catalogueStatus:status});
    await rejectCode(()=>run({mode:'discover'},f.dependencies()),'LOCATOR_PRIVACY');
    assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);assert.equal(f.calls.length,1);
  }
  for(const change of [r=>r[0].metadata.anonSelect=true,r=>r[0].version_metadata.policies[0].qual='true',
    r=>r[0].metadata.functions[2].source="select 'synthetic-private-never-log';",r=>r[0].current_access=false]){
    const f=fixture(await host(t),{catalogueStatus:201,catalogue:()=>{const rows=catalogue();change(rows);return rows;}});
    await assert.rejects(()=>run({mode:'discover'},f.dependencies()));
    assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);assert.equal(f.calls.length,1);
  }
  for(const catalogue of [()=>({data:[]}),()=>[]]){
    const f=fixture(await host(t),{catalogueStatus:201,catalogue});
    await rejectCode(()=>run({mode:'discover'},f.dependencies()),'LOCATOR_PRIVACY');
    assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);
  }
});

test('database-query HTTP201 wrong RLS remains refused before backup mutations',async t=>{
  const f=fixture(await host(t),{catalogueStatus:201,catalogue:()=>{const rows=catalogue();rows[0].metadata.rls=false;return rows;}});
  await rejectCode(()=>run({mode:'discover'},f.dependencies()),'LOCATOR_PRIVACY');
  assert.equal(f.children.length,0);assert.equal(writeCalls(f).length,0);assert.equal(f.calls.length,1);
});


function rewriteSyntheticSelfIndex(f,mutate){
  const {index,key}=encryptedIndex(f),base=clone(f.locator),outer=decodeObject(f.objects.get(key)),bytes=Buffer.from(outer.data,'base64');
  const magic=Buffer.from('RR-SUPABASE-DB-INDEX-2\n');
  assert.ok(bytes.subarray(0,magic.length).equals(magic));
  const at=magic.length+4+bytes.readUInt32BE(magic.length),prefix=Buffer.from(bytes.subarray(0,at+28));
  const salt=crypto.randomBytes(16),nonce=crypto.randomBytes(12);
  salt.copy(prefix,at);nonce.copy(prefix,at+16);
  const info='RavRadar/jakobjorgensen82-commits/RavRadar/SUPABASE_DATABASE_BACKUP/v1/INDEX';
  const secret=crypto.hkdfSync('sha256',Buffer.from(f.env.SUPABASE_SERVICE_ROLE_KEY),salt,Buffer.from(info),32);
  const cipher=crypto.createCipheriv('aes-256-gcm',secret,nonce);cipher.setAAD(prefix);
  mutate(index);
  const replacement=Buffer.concat([prefix,cipher.update(JSON.stringify(index)),cipher.final(),cipher.getAuthTag()]);
  const wire=gzipSync(Buffer.from(JSON.stringify({kind:outer.kind,bytes:replacement.length,sha256:sha(replacement),data:replacement.toString('base64')})));
  const digest=sha(wire),object='bundles/sha256/'+digest+'.json.gz';f.objects.set(object,wire);
  base.payload.index={path:object,bytes:wire.length,sha256:digest};return base;
}

test('segmented capture over 50 MB rejects altered groups and restores exact five SQL files without database access',async t=>{
  const large=crypto.randomBytes(50_001_024),expected=name=>name==='data.sql'?large:materializationSql(name);
  const {f,result}=await captured(t,{sql:expected}),original=clone(f.locator),{index}=encryptedIndex(f);
  assert.equal(index.kind,'SUPABASE_DB_BACKUP_INDEX_V2');assert.equal(result.cipherPartCount,6);assert.equal(f.objects.size,7);
  assert.equal(result.archiveWireBytes,[...f.objects.values()].reduce((total,b)=>total+b.length,0));
  assert.ok(result.files[2].cipherBytes>50_000_000);
  assert.deepEqual(index.objects.map(entry=>entry.parts.length),[1,1,2,1,1]);
  assert.equal(writeCalls(f).length,8);
  const before=writeCalls(f).length;
  for(const [label,mutate,code] of [
    ['order',x=>x.objects[2].parts.reverse(),'CHUNK_ORDER_OR_LENGTH'],
    ['group',x=>{const part=x.objects[2].parts[1];part.object.path=part.object.path.replace(original.payload.manifestSha256,'f'.repeat(64));},'OBJECT_DESCRIPTOR'],
    ['missing',x=>x.objects[2].parts.pop(),'CHUNK_COUNT'],
  ]){
    f.locator=clone(original);
    f.locator=rewriteSyntheticSelfIndex(f,mutate);
    const target=await materializationTarget(f,label);
    await rejectCode(()=>run({mode:'materialize',destination:target},f.dependencies()),code);
    assert.equal(await absent(target),true);
    f.objects.delete(f.locator.payload.index.path);
  }
  f.locator=clone(original);
  const part=index.objects[2].parts[1].object.path,target=await materializationTarget(f,'truncated');
  f.behavior.readObject=(key,b)=>key===part?b.subarray(0,b.length-1):b;
  await rejectCode(()=>run({mode:'materialize',destination:target},f.dependencies()),'REMOTE_OBJECT_SHA');
  assert.equal(await absent(target),true);assert.equal(writeCalls(f).length,before);
  delete f.behavior.readObject;
  const destination=await materializationTarget(f,'exact-restore');withoutDatabase(f);f.calls.length=0;
  const recovered=await run({mode:'materialize',indexSha256:original.payload.index.sha256,destination},f.dependencies());
  assert.equal(recovered.status,'R2_BOOTSTRAP_FIVE_SQL_FILES_MATERIALIZED_ONLY');
  assert.equal(recovered.manifestSha256,original.payload.manifestSha256);
  assert.equal(recovered.databaseRestoreExecuted,false);assert.equal(recovered.authRestoreVerified,false);assert.equal(recovered.freeReady,false);
  assert.deepEqual((await fs.readdir(destination)).sort(),[...names].sort());
  for(const name of names)assert.ok((await fs.readFile(path.join(destination,name))).equals(expected(name)));
  assert.equal(writeCalls(f).length,0);assert.equal(f.children.length,7);
  assert.ok(f.calls.every(c=>['GET','HEAD'].includes(c.method)&&new URL(c.url).hostname.endsWith('.eu.r2.cloudflarestorage.com')));
});

function mockSyntheticRoleGrantCommitments(t){
  const create=crypto.createHash,substitutions=new Map();
  t.mock.method(crypto,'createHash',(...args)=>{
    const hash=create(...args),digest=hash.digest.bind(hash);
    hash.digest=(encoding)=>{const value=digest(encoding);return substitutions.get(value)??value;};
    return hash;
  });
  const synthetic=(kind,values)=>create('sha256').update(JSON.stringify(['RavRadar/SupabaseRoleGrantAudit/v1/'+kind,...values])).digest('hex');
  return{
    selector(index){substitutions.set(synthetic('selector',[index]),commitments.selectorSha256);},
    origin(index,{sourceHead,runId,runAttempt}){substitutions.set(synthetic('origin',[index,sourceHead,runId,runAttempt]),commitments.originSha256);},
    clear(){substitutions.clear();},
  };
}
test('fixed ROLES audit resolves one listed commitment and authenticates only the ROLES part',async t=>{
  const pins=mockSyntheticRoleGrantCommitments(t);
  const line='GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";';
  for(const [contents,match] of [
    ['-- '+line+'\n'+line+' extra\n','ABSENT_EXACT'],
    ['-'.repeat(16*1024-25)+'\n'+line+'\r\n','PRESENT_ONCE'],
    [line+'\n'+line,'PRESENT_MULTIPLE'],
  ]){
    const {f,result}=await captured(t,{sql:n=>n==='roles.sql'?Buffer.from(contents):sql(n)});
    const source=f.locator.payload.context,manifestSha256=f.locator.payload.manifestSha256;
    let rolesPath;
    const segmented=rewriteSyntheticSelfIndex(f,index=>{
      index.kind='SUPABASE_DB_BACKUP_INDEX_V2';
      index.objects=index.objects.map(({file,object},i)=>{
        const raw=Buffer.from(decodeObject(f.objects.get(object.path)).data,'base64'),wire=gzipSync(raw,{level:0});
        const digest=sha(wire),key='bundles/sha256/'+manifestSha256+'/part-'+String(i).padStart(3,'0')+'-'+digest+'.json.gz.part';
        if(file==='roles.sql')rolesPath=key;
        f.objects.set(key,wire);
        return{file,parts:[{offset:0,cipherBytes:raw.length,cipherSha256:sha(raw),object:{path:key,bytes:wire.length,sha256:digest}}]};
      });
    });
    const exactIndex=segmented.payload.index.sha256;
    pins.clear();pins.selector(exactIndex);pins.origin(exactIndex,source);
    const namesBefore=await fs.readdir(f.env.RUNNER_TEMP);
    withoutDatabase(f);f.calls.length=0;
    assert.deepEqual(await auditGrant({},f.dependencies()),{
      status:'AUTHENTICATED_ROLES_FIXED_GRANT_AUDIT_ONLY',match,...commitments,
      rolesFileVerified:true,fullDatabaseBackupVerified:false,databaseRestoreExecuted:false,archiveWrittenThisOperation:false,
    });
    const objectGets=f.calls.filter(c=>c.method==='GET'&&c.headers.has('authorization')&&c.url.includes('/bundles/'))
      .map(c=>new URL(c.url).pathname.slice(P.bucket.length+2));
    assert.deepEqual(objectGets,[segmented.payload.index.path,rolesPath]);
    assert.ok(f.calls.every(c=>['GET','HEAD'].includes(c.method)&&c.headers.has('authorization')
      &&new URL(c.url).hostname.endsWith('.eu.r2.cloudflarestorage.com')));
    const newDirs=(await fs.readdir(f.env.RUNNER_TEMP)).filter(n=>!namesBefore.includes(n));
    assert.equal(newDirs.length,1);
    assert.deepEqual(await fs.readdir(path.join(f.env.RUNNER_TEMP,newDirs[0])),['roles.sql.gz.enc']);
    assert.equal(f.children.length,7);
    if(match==='PRESENT_ONCE'){
      f.calls.length=0;
      await rejectCode(()=>auditGrant({indexSha256:exactIndex},f.dependencies()),'ROLE_GRANT_AUDIT_OPTIONS');
      assert.equal(f.calls.length,0);
      for(const [selectors,reason]of [
        [[], 'ROLE_GRANT_AUDIT_INDEX_ABSENT'],
        [['0'.repeat(64)],'ROLE_GRANT_AUDIT_INDEX_ABSENT'],
        [[exactIndex,result.indexSha256],'ROLE_GRANT_AUDIT_INDEX_AMBIGUOUS'],
      ]){
        pins.clear();for(const selector of selectors)pins.selector(selector);
        f.calls.length=0;
        await rejectCode(()=>auditGrant({},f.dependencies()),reason);
        assert.equal(f.calls.some(c=>c.url.includes('/bundles/')),false);
      }
      for(const mismatch of [{sourceHead:'b'.repeat(40)},{runId:'54321'},{runAttempt:'2'}]){
        pins.clear();pins.selector(exactIndex);pins.origin(exactIndex,{...source,...mismatch});
        f.calls.length=0;
        await rejectCode(()=>auditGrant({},f.dependencies()),'ROLE_GRANT_AUDIT_ORIGIN');
        assert.equal(f.calls.some(c=>c.url.endsWith(rolesPath)),false);
      }
      const noHosted={...f.dependencies(),env:{...f.env,RUNNER_ENVIRONMENT:'self-hosted'}};
      f.calls.length=0;
      await rejectCode(()=>auditGrant({},noHosted),'HOSTED_VM_REQUIRED');
      assert.equal(f.calls.length,0);
      f.locator=segmented;
      const invalidIndex=mutateIndex(f,b=>{b[b.length-1]^=1;});
      f.locator=null;pins.clear();pins.selector(invalidIndex);
      await rejectCode(()=>auditGrant({},f.dependencies()),'INDEX_GCM_AUTHENTICATION');
      pins.clear();pins.selector(exactIndex);pins.origin(exactIndex,source);
      f.behavior.readObject=(key,b)=>key===rolesPath?b.subarray(0,b.length-1):b;
      await rejectCode(()=>auditGrant({},f.dependencies()),'REMOTE_OBJECT_SHA');
      delete f.behavior.readObject;
      pins.clear();pins.selector(result.indexSha256);pins.origin(result.indexSha256,source);
      const legacy=await auditGrant({},f.dependencies());
      assert.equal(legacy.match,'PRESENT_ONCE');
    }
  }
});

test('fixed ROLES audit rejects an authenticated oversized roles file before any roles object read',async t=>{
  const {f,result}=await captured(t,{sql:n=>n==='roles.sql'?Buffer.alloc(4*1024*1024+1,65):sql(n)});
  const pins=mockSyntheticRoleGrantCommitments(t);
  const indexPath=f.locator.payload.index.path;
  pins.selector(result.indexSha256);pins.origin(result.indexSha256,f.locator.payload.context);
  withoutDatabase(f);f.calls.length=0;
  await rejectCode(()=>auditGrant({},f.dependencies()),'ROLE_GRANT_AUDIT_BOUND');
  const objectGets=f.calls.filter(c=>c.method==='GET'&&c.headers.has('authorization')&&c.url.includes('/bundles/'));
  assert.deepEqual(objectGets.map(c=>new URL(c.url).pathname.slice(P.bucket.length+2)),[indexPath]);
});

test('reserved system role preflight authenticates only roles and compares actual identifiers without a name enum',async t=>{
  const contents=Buffer.from(`SET standard_conforming_strings = on;
-- GRANT "supabase_comment_only" TO "custom";
CREATE ROLE "custom";
ALTER ROLE "custom" SET "pgrst.example" TO 'supabase_string_only';
GRANT "supabase_future_role" TO "custom" WITH INHERIT FALSE GRANTED BY "supabase_admin";
GRANT SUPABASE_OTHER_ROLE TO "custom";
REVOKE "supabase_second_role", "supabase_admin" FROM "custom";
COMMENT ON ROLE "supabase_future_role" IS 'supabase_comment_value';
`);
  const {f,result}=await captured(t,{sql:n=>n==='roles.sql'?contents:sql(n)});
  const indexCommitmentSha256=sha(Buffer.from(JSON.stringify(['RavRadar/SupabaseArchiveRestore/v1/selector',result.indexSha256])));
  const targetSystemRoles=['supabase_admin','supabase_second_role'];
  const options={indexCommitmentSha256,targetSystemRoles};withoutDatabase(f);f.calls.length=0;
  const report=await auditGrant(options,f.dependencies());
  assert.deepEqual(report,{
    status:'AUTHENTICATED_RESERVED_SYSTEM_ROLE_PREFLIGHT_ONLY',indexCommitmentSha256,
    referencedSystemRoles:['supabase_admin','supabase_future_role','supabase_other_role','supabase_second_role'],
    targetSystemRoles,missingSystemRoles:['supabase_future_role','supabase_other_role'],referencedSystemRoleCount:4,targetSystemRoleCount:2,
    rolesFileVerified:true,fullDatabaseBackupVerified:false,databaseRestoreExecuted:false,archiveWrittenThisOperation:false,
  });
  const gets=f.calls.filter(c=>c.method==='GET'&&c.headers.has('authorization')&&c.url.includes('/bundles/'));
  assert.equal(gets.length,2,'one authenticated index and one roles object only');
  assert(f.calls.every(c=>['GET','HEAD'].includes(c.method)&&new URL(c.url).hostname.endsWith('.eu.r2.cloudflarestorage.com')));
  assert.equal(f.children.length,7,'audit starts no dump or database process');
  assert(!JSON.stringify(report).includes('custom')&&!JSON.stringify(report).includes('GRANT')&&!JSON.stringify(report).includes('supabase_string_only'));
  f.calls.length=0;
  for(const change of [{targetSystemRoles:['supabase_admin','supabase_admin']},{targetSystemRoles:['not_a_system_role']},
    {targetSystemRoles:['supabase_'+'x'.repeat(55)]},{targetSystemRoles:Array.from({length:129},(_,i)=>'supabase_'+i)},
    {indexCommitmentSha256:'not-a-commitment'}])await assert.rejects(()=>auditGrant({...options,...change},f.dependencies()));
  assert.equal(f.calls.length,0,'invalid target/selector cannot cause remote reads');
  // Reuse the same authentic cipher fixture: any changed roles bytes must fail its digest.
  const rolesGet=gets[1].url,rolesKey=new URL(rolesGet).pathname.slice(P.bucket.length+2),original=f.objects.get(rolesKey);
  f.objects.set(rolesKey,original.subarray(0,original.length-1));
  await rejectCode(()=>auditGrant(options,f.dependencies()),'REMOTE_OBJECT_SHA');f.objects.set(rolesKey,original);
  for(const roleSql of ['GRANT "supabase_new" TO "custom"; /* unfinished',
    'GRANT "supabase_new" TO "custom"','SELECT execute_arbitrary();','ALTER ROLE "custom" IN ROLE "supabase_hidden";',
    'SET standard_conforming_strings = off;','RESET ALL; GRANT "supabase_hidden" TO "custom";',
    "SET ROLE 'supabase_hidden';","SET SESSION ROLE 'supabase_hidden';","SET LOCAL ROLE 'supabase_hidden';",
    "SET SESSION AUTHORIZATION 'supabase_hidden';","SET LOCAL SESSION AUTHORIZATION 'supabase_hidden';",
    'SET "role" TO \'supabase_hidden\';','SET "session_authorization" TO \'supabase_hidden\';',
    'ALTER ROLE U&"\\0073upabase_hidden" LOGIN;',
    'GRANT member TO custom GRANTED BY U&"\\0073upabase_admin";',
    'ALTER ROLE custom UESCAPE \'!\';']){
    const x=await captured(t,{sql:n=>n==='roles.sql'?Buffer.from(roleSql):sql(n)});
    const commitment=sha(Buffer.from(JSON.stringify(['RavRadar/SupabaseArchiveRestore/v1/selector',x.result.indexSha256])));
    withoutDatabase(x.f);await assert.rejects(()=>auditGrant({indexCommitmentSha256:commitment,targetSystemRoles},x.f.dependencies()),
      e=>/^ROLE_AUDIT_/.test(e.code));
  }
});


function tinyOwnedParts(f){
  const original=clone(f.locator),{index}=encryptedIndex(f),manifest=f.locator.payload.manifestSha256;
  const entries=index.objects.map((entry,ordinal)=>{
    const raw=Buffer.from(decodeObject(f.objects.get(entry.object.path)).data,'base64'),wire=gzipSync(raw,{level:0});
    const digest=sha(wire),key=`bundles/sha256/${manifest}/part-${String(ordinal).padStart(3,'0')}-${digest}.json.gz.part`;
    f.objects.set(key,wire);
    return {file:entry.file,parts:[{offset:0,cipherBytes:raw.length,cipherSha256:sha(raw),object:{path:key,sha256:digest,bytes:wire.length}}]};
  });
  f.locator=rewriteSyntheticSelfIndex(f,value=>{value.kind='SUPABASE_DB_BACKUP_INDEX_V2';value.objects=entries;});
  // Test-only construction removes only its replaced tiny synthetic carriers.
  f.objects.delete(original.payload.index.path);for(const entry of index.objects)f.objects.delete(entry.object.path);
  return clone(f.locator);
}
async function tinyRotation(t,{verifyCurrent=true}={}){
  const {f}=await captured(t,{allowRetirement:true}),retiring=tinyOwnedParts(f);
  f.env.GITHUB_RUN_ID='12346';await run({mode:'capture'},f.dependencies());const reserve=clone(f.locator);
  f.env.GITHUB_RUN_ID='12347';await run({mode:'capture'},f.dependencies());
  Object.assign(f.env,{GITHUB_REF:'refs/heads/main',GITHUB_WORKFLOW:'Back up RavRadar Supabase database'});
  const q={f,retiring,reserve,options:{reserveIndexSha256:reserve.payload.index.sha256,restoreRunId:'700'},
    dependencies:()=>({...f.dependencies(),confirmMain:()=>{},verifyReserveRestore:({indexSha256,restoreRunId})=>({indexSha256,restoreRunId})})};
  Object.assign(f.env,{GITHUB_EVENT_NAME:'workflow_dispatch'});
  if(verifyCurrent){const {persistSupabaseDatabaseRestoreReceipt:persist}=await import('./archive-supabase-database-backup.mjs');
    await persist({indexSha256:f.locator.payload.index.sha256,report:positiveRestoreReport(f)},q.dependencies());}
  return q;
}
test('normal database rotation retires one authenticated tiny group index-last and preserves current and verified distinct reserve',async t=>{
  const {rotateSupabaseDatabaseBackups:rotate}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t),current=clone(q.f.locator);
  q.f.env.GITHUB_RUN_ID='12348';await run({mode:'capture'},q.f.dependencies());
  const unresolvedNewer=clone(q.f.locator);q.f.locator=current;const before=new Map(q.f.objects);
  const {databaseRestoreCommitment}=await import('./supabase-backup-lifecycle.mjs');
  const committed={restoreRunId:q.options.restoreRunId,
    reserveIndexCommitment:'rr-supabase-restore-v1:'+databaseRestoreCommitment(q.reserve.payload.index.sha256)};
  const held=await rotate({...committed,holdIndexSha256:[q.retiring.payload.index.sha256]},q.dependencies());
  assert.equal(held.deletedObjects,0);
  const result=await rotate(committed,q.dependencies());assert.equal(result.deletedObjects,6);
  assert.equal(result.status,'DATABASE_BACKUP_ONE_GROUP_RETIRED');assert.deepEqual(q.f.locator,current);
  const deleted=q.f.calls.filter(call=>call.method==='DELETE').map(call=>new URL(call.url).pathname.slice(P.bucket.length+2));
  assert.equal(deleted.length,6);assert.equal(deleted.at(-1),q.retiring.payload.index.path);
  for(const [key,wire]of before)if(!deleted.includes(key))assert.ok(q.f.objects.get(key).equals(wire));
  assert.ok(q.f.objects.has(q.reserve.payload.index.path)&&q.f.objects.has(current.payload.index.path));
  assert.ok(q.f.objects.has(unresolvedNewer.payload.index.path),'a newer non-current group is preserved');
  const later=await rotate(committed,q.dependencies());assert.equal(later.deletedObjects,0);
});
test('normal database rotation settles runner-loss absence under the existing writer without replaying an unknown DELETE',async t=>{
  const {rotateSupabaseDatabaseBackups:rotate}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t);q.f.behavior.deleteUnknown=true;
  await rejectCode(()=>rotate(q.options,q.dependencies()),'DB_BACKUP_WRITE_OUTCOME_UNKNOWN');
  const first=q.f.calls.filter(call=>call.method==='DELETE');assert.equal(first.length,1);
  assert.ok(q.f.objects.has(q.retiring.payload.index.path));q.f.behavior.deleteUnknown=false;
  const result=await rotate(q.options,q.dependencies());assert.equal(result.deletedObjects,5);
  const deletes=q.f.calls.filter(call=>call.method==='DELETE');assert.equal(deletes.length,6);
  assert.equal(new Set(deletes.map(call=>call.url)).size,6,'already absent object is not deleted again');
});
test('normal database rotation fails closed on no reserve, current-as-reserve and unobserved deletion',async t=>{
  const {rotateSupabaseDatabaseBackups:rotate}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t);
  assert.equal((await rotate({},q.dependencies())).deletedObjects,0);
  await rejectCode(()=>rotate({...q.options,reserveIndexSha256:q.f.locator.payload.index.sha256},q.dependencies()),'ROTATION_DISTINCT_RESERVE');
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,0);
  q.f.behavior.deleteNoop=true;
  await rejectCode(()=>rotate(q.options,q.dependencies()),'ROTATION_DELETE_NOT_OBSERVED');
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,1);
  q.f.behavior.deleteNoop=false;
  const before=q.f.calls.filter(call=>call.method==='DELETE').length;
  q.f.oldLocators.splice(0,q.f.oldLocators.length,...q.f.oldLocators.filter(row=>row.payload.index.sha256!==q.retiring.payload.index.sha256));
  assert.equal((await rotate(q.options,q.dependencies())).deletedObjects,0,'unknown unpublished group is retained');
  const {inspectSupabaseDatabaseBackupLifecycle:inspect}=await import('./archive-supabase-database-backup.mjs');
  assert.equal((await inspect(q.dependencies())).rotationHeld,true);
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,before);
});
test('normal database rotation rejects changed current locator and changed retiring object before DELETE',async t=>{
  const {rotateSupabaseDatabaseBackups:rotate}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t),original=clone(q.f.locator);let scanned=false;
  q.f.behavior.readObject=(key,wire)=>{if(key===q.retiring.payload.index.path)scanned=true;return wire;};
  q.f.behavior.beforeLocatorGet=()=>{if(scanned)q.f.locator.version++;};
  await rejectCode(()=>rotate(q.options,q.dependencies()),'LOCATOR_CHANGED');
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,0);
  q.f.locator=original;delete q.f.behavior.beforeLocatorGet;
  q.f.behavior.historyRows=rows=>rows.map(row=>({...row,payload:{...row.payload,manifestSha256:'e'.repeat(64)}}));
  await rejectCode(()=>rotate(q.options,q.dependencies()),'ROTATION_HISTORICAL_LOCATOR_IDENTITY');
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,0);delete q.f.behavior.historyRows;
  q.f.behavior.readObject=(key,wire)=>{
    if(key.startsWith('bundles/sha256/'+q.retiring.payload.manifestSha256+'/'))wire[wire.length-1]^=1;return wire;};
  await rejectCode(()=>rotate(q.options,q.dependencies()),'REMOTE_OBJECT_SHA');
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,0);
});


function positiveRestoreReport(f,indexSha256=f.locator.payload.index.sha256){
  const commitment=sha(Buffer.from(JSON.stringify(['RavRadar/SupabaseArchiveRestore/v1/selector',indexSha256])));
  return {status:'PASS',scope:'authenticated-archive-isolated-sql-restore',sourceHead:f.env.GITHUB_SHA,cliVersion:'2.117.0',
    archiveIndexCommitmentSha256:commitment,authenticatedFiveFileSqlExecuted:true,exactSqlBytesStreamed:true,
    isolatedAuthServiceHealthy:true,localRestoredCatalogVerified:true,ownedDockerClosed:true,
    sourceDataParityVerified:true,authRestoreVerified:true,fullDatabaseBackupVerified:true,
    archiveDataParity:{status:'PASS',scope:'AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES',digest:'c'.repeat(64)},
    productionDatabaseRestoreExecuted:false,productionBackupVerified:false,productionAuthRestoreVerified:false,
    atomicDatabaseSnapshot:false,storageObjectBytesRestored:false,erasureBarriersVerified:false,freeReady:false};
}

test('durable normal reserve uses exact598 strong flags before IO and only one R2 receipt without database access',async t=>{
  const {persistSupabaseDatabaseRestoreReceipt:persist}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t,{verifyCurrent:false}),indexSha256=q.f.locator.payload.index.sha256;
  const report=positiveRestoreReport(q.f),start=q.f.calls.length,children=q.f.children.length;
  q.f.env.GITHUB_WORKFLOW='Maintain RavRadar admin document history';
  q.f.behavior.denySupabase=true;
  for(const field of ['sourceDataParityVerified','authRestoreVerified','fullDatabaseBackupVerified','ownedDockerClosed'])
    await rejectCode(()=>persist({indexSha256,report:{...report,[field]:false}},q.dependencies()),'RESTORE_RECEIPT_NOT_POSITIVE');
  await rejectCode(()=>persist({indexSha256,report:{...report,archiveDataParity:{...report.archiveDataParity,digest:''}}},q.dependencies()),'RESTORE_RECEIPT_NOT_POSITIVE');
  assert.equal(q.f.calls.length,start);
  const first=await persist({indexSha256,report},q.dependencies());assert.equal(first.receiptWritten,true);
  assert.equal((await persist({indexSha256,report},q.dependencies())).receiptWritten,false);
  const writes=q.f.calls.slice(start).filter(call=>call.method==='PUT');
  assert.equal(writes.length,1);assert(writes[0].body.length<=8192);
  assert.equal(q.f.calls.slice(start).some(call=>!call.url.includes('.eu.r2.cloudflarestorage.com/')),false);
  assert.equal(q.f.children.length,children);assert.equal(q.f.calls.some(call=>call.method==='DELETE'),false);
  assert(!JSON.stringify(first).includes(indexSha256));
});

test('durable normal rotation keeps current and latest verified reserve and preserves every locator audit row',async t=>{
  const {persistSupabaseDatabaseRestoreReceipt:persist,rotateSupabaseDatabaseBackups:rotate,
    inspectSupabaseDatabaseBackupLifecycle:inspect}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t,{verifyCurrent:false}),current=clone(q.f.locator);
  q.f.env.GITHUB_WORKFLOW='Maintain RavRadar admin document history';
  await persist({indexSha256:q.reserve.payload.index.sha256,report:positiveRestoreReport(q.f,q.reserve.payload.index.sha256)},q.dependencies());
  await persist({indexSha256:current.payload.index.sha256,report:positiveRestoreReport(q.f)},q.dependencies());
  assert.equal((await inspect(q.dependencies())).rotationPending,true);
  const beforeAudit=clone(q.f.oldLocators),first=await rotate({},q.dependencies());
  assert.equal(first.retainedReserveIndexSha256,q.reserve.payload.index.sha256);
  assert.equal(q.f.objects.has(q.retiring.payload.index.path),false);
  assert.deepEqual(q.f.oldLocators,beforeAudit);
  q.f.env.GITHUB_RUN_ID='12348';await run({mode:'capture'},q.f.dependencies());
  await rejectCode(()=>rotate({},q.dependencies()),'ROTATION_CURRENT_NOT_RECOVERY_VERIFIED');
  await persist({indexSha256:q.f.locator.payload.index.sha256,report:positiveRestoreReport(q.f)},q.dependencies());
  const nextAudit=clone(q.f.oldLocators),next=await rotate({},q.dependencies());
  assert.equal(next.retainedReserveIndexSha256,current.payload.index.sha256);
  assert(q.f.objects.has(current.payload.index.path)&&q.f.objects.has(q.f.locator.payload.index.path));
  assert.equal(q.f.objects.has(q.reserve.payload.index.path),false);assert.deepEqual(q.f.oldLocators,nextAudit);
  const deleted=q.f.calls.filter(call=>call.method==='DELETE').map(call=>new URL(call.url).pathname.slice(P.bucket.length+2));
  assert.equal(deleted.at(-1),q.reserve.payload.index.path);
});

test('durable normal receipt uncertainty is reconciled without repeat PUT and altered GCM never authorizes rotation',async t=>{
  const {persistSupabaseDatabaseRestoreReceipt:persist,rotateSupabaseDatabaseBackups:rotate}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t,{verifyCurrent:false}),indexSha256=q.f.locator.payload.index.sha256,report=positiveRestoreReport(q.f);
  q.f.behavior.putUnknown=true;
  await rejectCode(()=>persist({indexSha256,report},q.dependencies()),'DB_BACKUP_WRITE_OUTCOME_UNKNOWN');
  q.f.behavior.putUnknown=false;const puts=q.f.calls.filter(call=>call.method==='PUT').length;
  assert.equal((await persist({indexSha256,report},q.dependencies())).receiptWritten,false);
  assert.equal(q.f.calls.filter(call=>call.method==='PUT').length,puts);
  const [key,wire]=[...q.f.objects].find(([,wire])=>{try{return decodeObject(wire).kind==='SUPABASE_DB_ENCRYPTED_RESTORE_RECEIPT_FRAME_V1';}catch{return false;}});
  const outer=decodeObject(wire),binary=Buffer.from(outer.data,'base64');binary[binary.length-1]^=1;
  outer.data=binary.toString('base64');outer.sha256=sha(binary);
  const altered=gzipSync(Buffer.from(JSON.stringify(outer)),{level:1});q.f.objects.delete(key);
  q.f.objects.set('bundles/sha256/'+sha(altered)+'.json.gz',altered);
  await rejectCode(()=>rotate(q.options,q.dependencies()),'INDEX_GCM_AUTHENTICATION');
  assert.equal(q.f.calls.filter(call=>call.method==='DELETE').length,0);
});


test('rotation v2 requires actual former-current audit even when an unpublished group has a valid restore receipt',async t=>{
  const {persistSupabaseDatabaseRestoreReceipt:persist,rotateSupabaseDatabaseBackups:rotate,
    inspectSupabaseDatabaseBackupLifecycle:inspect}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t);
  await persist({indexSha256:q.reserve.payload.index.sha256,
    report:positiveRestoreReport(q.f,q.reserve.payload.index.sha256)},q.dependencies());
  await persist({indexSha256:q.retiring.payload.index.sha256,
    report:positiveRestoreReport(q.f,q.retiring.payload.index.sha256)},q.dependencies());
  q.f.oldLocators.splice(0,q.f.oldLocators.length,...q.f.oldLocators.filter(row=>
    row.payload.index.sha256!==q.retiring.payload.index.sha256));
  const status=await inspect(q.dependencies());
  assert.equal(status.rotationHeld,true,'a receipt cannot prove previous publication');
  assert.equal(status.rotationPending,false,'unpublished restore-qualified group cannot retire');
  assert.equal((await rotate(q.options,q.dependencies())).deletedObjects,0);
  assert.equal(q.f.calls.some(call=>call.method==='DELETE'),false);
  assert(q.f.objects.has(q.retiring.payload.index.path));
});

test('rotation v2 holds unreferenced managed SQL frames and chunks from the complete existing inventory',async t=>{
  const {persistSupabaseDatabaseRestoreReceipt:persist,rotateSupabaseDatabaseBackups:rotate,inspectSupabaseDatabaseBackupLifecycle:inspect}
    =await import('./archive-supabase-database-backup.mjs');
  for(const kind of ['frame','chunk']){
    const q=await tinyRotation(t);let wire,key;
    await persist({indexSha256:q.reserve.payload.index.sha256,
      report:positiveRestoreReport(q.f,q.reserve.payload.index.sha256)},q.dependencies());
    assert.equal((await inspect(q.dependencies())).rotationHeld,false,'known normal chain before orphan');
    if(kind==='frame'){
      const entry=encryptedIndex(q.f).index.objects[0];
      wire=gzipSync(gunzipSync(q.f.objects.get(entry.object.path)),{level:0});
      key='bundles/sha256/'+sha(wire)+'.json.gz';
    }else{
      wire=gzipSync(Buffer.from('synthetic orphan encrypted chunk'),{level:0});
      key='bundles/sha256/'+'e'.repeat(64)+'/part-000-'+sha(wire)+'.json.gz.part';
    }
    assert(!q.f.objects.has(key));q.f.objects.set(key,wire);
    assert.equal((await inspect(q.dependencies())).rotationHeld,true,kind+' is retained and blocks capture');
    const result=await rotate(q.options,q.dependencies());assert.equal(result.deletedObjects,0);
    assert.equal(q.f.calls.some(call=>call.method==='DELETE'),false);assert(q.f.objects.get(key).equals(wire));
  }
});

test('rotation v2 resumes a published group after uncertain receipt deletion without deleting any settled object again',async t=>{
  const {persistSupabaseDatabaseRestoreReceipt:persist,rotateSupabaseDatabaseBackups:rotate,
    inspectSupabaseDatabaseBackupLifecycle:inspect}=await import('./archive-supabase-database-backup.mjs');
  const q=await tinyRotation(t);
  await persist({indexSha256:q.reserve.payload.index.sha256,
    report:positiveRestoreReport(q.f,q.reserve.payload.index.sha256)},q.dependencies());
  const before=new Set(q.f.objects.keys());
  await persist({indexSha256:q.retiring.payload.index.sha256,
    report:positiveRestoreReport(q.f,q.retiring.payload.index.sha256)},q.dependencies());
  const receiptKeys=[...q.f.objects.keys()].filter(key=>!before.has(key));assert.equal(receiptKeys.length,1);
  const [receiptKey]=receiptKeys;q.f.behavior.deleteUnknown=key=>key===receiptKey;
  await rejectCode(()=>rotate(q.options,q.dependencies()),'DB_BACKUP_WRITE_OUTCOME_UNKNOWN');
  assert.equal(q.f.objects.has(receiptKey),false);assert(q.f.objects.has(q.retiring.payload.index.path));
  q.f.behavior.deleteUnknown=false;
  const status=await inspect(q.dependencies());assert.equal(status.rotationHeld,false);
  // The genuine former-current row still qualifies the remaining index retirement.
  const result=await rotate(q.options,q.dependencies());assert.equal(result.deletedObjects,1);
  assert.equal(q.f.objects.has(q.retiring.payload.index.path),false);
  const deleted=q.f.calls.filter(call=>call.method==='DELETE').map(call=>call.url);
  assert.equal(deleted.length,7);assert.equal(new Set(deleted).size,7);
  assert.equal(deleted.filter(url=>new URL(url).pathname.endsWith(receiptKey)).length,1);
});
