import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {PRIVATE_STUDY_ADMIN_ACCESS_SQL,PRIVATE_STUDY_ADMIN_FUNCTIONS} from './lib/private-trip-study-admin-transport.mjs';
import {ADMIN_HISTORY_POLICY as P,runAdminDocumentHistoryMaintenance as run} from './admin-document-history-maintenance.mjs';
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const bytes=v=>Buffer.from(JSON.stringify(stable(v)));const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const clone=v=>structuredClone(v);
function fixture(){
  const env={SUPABASE_URL:P.project,SUPABASE_SERVICE_ROLE_KEY:'synthetic-service-role-never-real',SUPABASE_ACCESS_TOKEN:'synthetic-existing-metadata-access-never-real',
    RAVRADAR_R2_ACCOUNT_ID:'a'.repeat(32),RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-access-never-real',RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-secret-never-real'};
  let id=1;const rows=[];
  for(const key of [...P.keys,'rules','direction-reviews'])for(let version=1;version<=7;version++)rows.push({
    id:id++,document_key:key,version,created_at:`2026-08-${String(version).padStart(2,'0')}T00:00:00.000Z`,
    created_by:version%2?null:'00000000-0000-0000-0000-000000000001',
    payload:{title:key,text:'synthetic-document-secret-never-log-æøå',nested:{version,list:[true,null,'ö']}}});
  const currents=P.keys.map(document_key=>({document_key,version:8,updated_at:'2026-08-08T00:00:00.000Z'}));
  const rawRows=new Map(); // Synthetic exact REST responses; metadata stays on the normal fixture.
  const locators=[],locatorVersions=[],objects=new Map(),calls=[],fault={privacy:false,historyPrivacy:false,acl:false,locatorRace:false,public:false,bucketDenied:false,r2Unknown:false,deleteUnknown:false,oversize:false,wrongRow:false};
  const json=(body,status=200)=>{const b=Buffer.from(JSON.stringify(body));return new Response(b,{status,headers:{'content-type':'application/json','content-length':String(b.length)}});};
  const fetchImpl=async(url,options={})=>{
    const u=new URL(url),method=String(options.method||'GET').toUpperCase();calls.push({url:u.href,method});
    if(u.origin==='https://api.supabase.com'){
      assert.equal(u.href,'https://api.supabase.com/v1/projects/afqhhdrkjfjtpadntdzo/database/query');
      assert.equal(method,'POST');const query=JSON.parse(options.body).query;assert.ok(query.startsWith('with existing_privacy as ('));assert.ok(query.includes(PRIVATE_STUDY_ADMIN_ACCESS_SQL.trim().replace(/;$/,'')));assert.ok(query.endsWith('from existing_privacy,existing_history_privacy'));assert.ok(!query.includes("'SELECT,INSERT"));assert.ok(!query.toLowerCase().includes('delete from'));
      const metadata={rls:true,ownerRestricted:true,anonSelect:fault.privacy,authenticatedSelect:true,
        unsafeRoles:false,publicSelect:false,policies:[
          {name:'ravradar_admin_documents_read',permissive:'PERMISSIVE',roles:['authenticated'],command:'SELECT',qual:"public.is_ravradar_owner() or public.has_ravradar_permission('full_admin') or public.has_ravradar_permission(public.ravradar_document_permission(document_key))"},
          {name:'ravradar_ravscore_checkpoint_no_direct_read',permissive:'RESTRICTIVE',roles:['authenticated'],command:'SELECT',qual:"document_key <> 'ravscore-continuation-checkpoint'"}],functions:clone(PRIVATE_STUDY_ADMIN_FUNCTIONS)};
      const version_metadata=clone(metadata);version_metadata.anonSelect=fault.historyPrivacy;version_metadata.policies[0].name='ravradar_admin_document_versions_read';version_metadata.policies[1].name='ravradar_ravscore_checkpoint_versions_no_direct_read';
      const report=[{current_access:!fault.acl,history_access:!fault.acl,metadata,version_metadata}];
      if(fault.catalogueChange)fault.catalogueChange(report);
      const status=fault.privacyStatus??200;
      if(status===204)return new Response(null,{status});
      if(fault.privacyShape==='invalid-json')return new Response('synthetic-private-metadata-never-log',{status});
      return json(fault.privacyShape==='envelope'?{data:report}:fault.privacyShape==='empty'?[]:report,status);
    }
    if(u.origin===P.project){
      const q=u.searchParams,key=q.get('document_key')?.slice(3);
      if(u.pathname==='/rest/v1/admin_documents'&&method==='POST'){
        const body=JSON.parse(options.body);assert.equal(body.document_key,P.locatorKey);assert.equal(body.updated_by,null);
        if(locators.length)return json([]);locators.push({document_key:P.locatorKey,payload:clone(body.payload),version:1});if(fault.afterLocator)fault.afterLocator();if(fault.locatorUnknown){fault.locatorUnknown=false;throw Error('PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE');}return json(clone(locators),201);
      }
      if(key===P.locatorKey){
        if(u.pathname==='/rest/v1/admin_documents'){
          if(method==='GET')return json(clone(locators));assert.equal(method,'PATCH');
          if(fault.locatorRace||!locators.length||q.get('version')!=='eq.'+locators[0].version)return json([]);
          const body=JSON.parse(options.body);locatorVersions.push(clone(locators[0]));locators[0]={document_key:P.locatorKey,payload:clone(body.payload),version:locators[0].version+1};return json(clone(locators));
        }
        assert.equal(method,'GET','locator history can never be pruned');
        const digest=q.get('payload->>indexSha256')?.slice(3);return json(locatorVersions.filter(x=>x.payload.indexSha256===digest).slice(0,2).map(clone));
      }
      assert.ok(P.keys.includes(key),'only the3 documentation keys or exact private locator reach the database');
      if(u.pathname==='/rest/v1/admin_documents'){
        assert.equal(method,'GET','current documents are read-only');return json(currents.filter(r=>r.document_key===key));
      }
      assert.equal(u.pathname,'/rest/v1/admin_document_versions');
      let selected=rows.filter(r=>r.document_key===key);
      if(q.has('id'))selected=selected.filter(r=>r.id===Number(q.get('id').slice(3)));
      if(q.has('version'))selected=selected.filter(r=>r.version===Number(q.get('version').slice(3)));
      if(method==='DELETE'){
        assert.equal(selected.length,1,'one exact immutable history row per write');
        if(fault.deleteBeforeWrite){fault.deleteBeforeWrite=false;throw Error('PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE');}
        rows.splice(rows.indexOf(selected[0]),1);
        if(fault.deleteUnknown){fault.deleteUnknown=false;return json({message:'PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE'},504);}
        return new Response(null,{status:204});
      }
      assert.equal(method,'GET');selected.sort((a,b)=>b.version-a.version||b.id-a.id);
      selected=selected.slice(Number(q.get('offset')||0),Number(q.get('offset')||0)+Number(q.get('limit')||100));
      const select=q.get('select');let result=selected.map(r=>select==='*'?clone(r):Object.fromEntries(select.split(',').map(k=>[k,r[k]])));
      if(fault.wrongRow&&select==='*'&&result.length)result[0].document_key='rules';
      if(fault.oversize&&select==='*')return new Response('[]',{headers:{'content-length':'33000000'}});
      if(select==='*'&&result.length===1&&rawRows.has(result[0].id)){const raw=rawRows.get(result[0].id);return new Response(raw,{headers:{'content-type':'application/json','content-length':String(raw.length)}});}
      return json(result);
    }
    assert.equal(u.hostname,'a'.repeat(32)+'.eu.r2.cloudflarestorage.com');
    assert.ok(u.pathname===`/${P.bucket}`||u.pathname.startsWith(`/${P.bucket}/`),'archive never reaches weather bucket');
    const key=decodeURIComponent(u.pathname.slice(P.bucket.length+2));
    if(!key){
      if(method==='HEAD')return new Response(null,{status:fault.bucketDenied?403:200});
      assert.equal(method,'GET');assert.equal(u.searchParams.get('list-type'),'2');
      const entries=[...objects].map(([k,b])=>`<Contents><Key>${k}</Key><Size>${b.length}</Size></Contents>`).join('');
      return new Response(`<ListBucketResult><KeyCount>${objects.size}</KeyCount><IsTruncated>false</IsTruncated>${entries}</ListBucketResult>`);
    }
    const authenticated=new Headers(options.headers).has('authorization');
    if(!authenticated){
      assert.equal(method,'GET');assert.equal(new Headers(options.headers).get('range'),'bytes=0-0');assert.equal(options.redirect,'manual');
      if(fault.anonymousResponse)return fault.anonymousResponse();
      return new Response(fault.anonymousBody??null,{status:fault.anonymousStatus??(fault.public?200:403),headers:fault.anonymousHeaders??{}});
    }
    if(method==='HEAD')return new Response(null,{status:objects.has(key)?200:404});
    if(method==='GET')return objects.has(key)?new Response(objects.get(key)):new Response(null,{status:404});
    assert.equal(method,'PUT','the maintenance caller never deletes an archive object');
    assert.equal(new Headers(options.headers).get('if-none-match'),'*');
    if(objects.has(key))return new Response(null,{status:412});
    objects.set(key,Buffer.from(options.body));
    if(fault.r2Unknown){fault.r2Unknown=false;throw new Error('PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE');}
    return new Response(null,{status:200});
  };
  return{env,rows,rawRows,currents,locators,locatorVersions,objects,calls,fault,fetchImpl,
    dependencies(){return{env,fetchImpl};},count(method){return calls.filter(c=>c.method===method).length;}};
}
async function host(t){
  const temp=path.resolve(process.env.RUNNER_TEMP||os.tmpdir()),dir=await fs.mkdtemp(path.join(temp,'ravradar-admin-history-test-'));
  t.after(async()=>{assert.ok(path.resolve(dir).startsWith(temp+path.sep+'ravradar-admin-history-test-'));
    assert.equal((await fs.lstat(dir)).isSymbolicLink(),false);await fs.rm(dir,{recursive:true,force:false});});return dir;
}
const call=(f,workdir,mode,extra={})=>run({workdir,mode,...extra},f.dependencies());
const confirm={confirmation:'PRUNE-EXACT-THREE-DOCUMENT-HISTORY'},publishConfirm={confirmation:'PUBLISH-PRIVATE-ADMIN-HISTORY-LOCATOR'};
async function prepared(t){const f=fixture(),dir=await host(t);await call(f,dir,'plan');await call(f,dir,'archive');await call(f,dir,'publish-locator',publishConfirm);return{f,dir};}
async function assertZeroDeletes(f,fn,code){await assert.rejects(fn,code?{code}:undefined);assert.equal(f.count('DELETE'),0);}

test('normal read-only default, full compressed archive roundtrip, exact keep5 prune and other-key preservation',async t=>{
  const f=fixture(),dir=await host(t),protectedSha=sha(bytes(f.rows.filter(r=>!P.keys.includes(r.document_key)))),currentSha=sha(bytes(f.currents));
  const original=f.rows.filter(r=>P.keys.includes(r.document_key)&&r.version<=2).map(clone);
  const planned=await run({workdir:dir},f.dependencies());assert.equal(planned.candidateRows,6);assert.equal(planned.mode,'plan');assert.equal(f.count('PUT')+f.count('DELETE'),0);
  const archived=await call(f,dir,'archive');assert.match(archived.status,/ARCHIVE.*VERIFIED/);assert.equal(f.count('DELETE'),0);
  assert.ok(!JSON.stringify(archived).includes('created_by')&&!JSON.stringify(archived).includes('synthetic-document-secret'));
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'archive-manifest.json'),'utf8'));
  const index=JSON.parse(gunzipSync(f.objects.get(manifest.index.path)));
  const restored=[];for(const c of index.chunks)for(const line of gunzipSync(f.objects.get(c.path)).toString('utf8').trimEnd().split('\n'))restored.push(JSON.parse(Buffer.from(JSON.parse(line).rawBase64,'base64').toString('utf8'))[0]);
  restored.sort((a,b)=>a.id-b.id);original.sort((a,b)=>a.id-b.id);assert.equal(sha(bytes(restored)),sha(bytes(original)),'all full row fields roundtrip');
  await call(f,dir,'publish-locator',publishConfirm);
  assert.equal((await call(f,dir,'restore')).rows,6);
  const result=await call(f,dir,'prune',confirm);assert.equal(result.confirmedAbsentAfterWrite,6);
  for(const key of P.keys)assert.equal(f.rows.filter(r=>r.document_key===key).length,5);
  assert.equal(sha(bytes(f.rows.filter(r=>!P.keys.includes(r.document_key)))),protectedSha);assert.equal(sha(bytes(f.currents)),currentSha);
  assert.equal(result.fullDatabaseBackupVerified,false);assert.equal(result.productionDbRestoreExecuted,false);assert.equal(result.freeReady,false);
});
test('no delete before a verified durable central locator exists',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'DURABLE_LOCATOR_REQUIRED');
});
test('changed reviewed draft is rejected even if its local digest is recomputed',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');const file=path.join(dir,'draft.json'),d=JSON.parse(await fs.readFile(file,'utf8'));
  d.core.candidates[0].id=99999;d.digest=sha(bytes(d.core));await fs.writeFile(file,bytes(d));
  await assertZeroDeletes(f,()=>call(f,dir,'archive'),'DRAFT_CHANGED');assert.equal(f.count('PUT'),0);
});
test('duplicate identities fail in the normal metadata plan',async t=>{
  const f=fixture(),dir=await host(t);f.rows.find(r=>r.document_key===P.keys[1]&&r.version===1).id=1;
  await assertZeroDeletes(f,()=>call(f,dir,'plan'),'DUPLICATE_ID');assert.equal(f.count('PUT'),0);
});
test('another returned key cannot enter the archive',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');f.fault.wrongRow=true;
  await assertZeroDeletes(f,()=>call(f,dir,'archive'),'HISTORY_METADATA_INVALID');
});
test('changed current document guard gives zero deletes',async t=>{
  const {f,dir}=await prepared(t);f.currents[0].version++;await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'CURRENT_DOCUMENT_CHANGED');
});
test('changed latest5 gives zero deletes even with unchanged current metadata',async t=>{
  const {f,dir}=await prepared(t);f.rows.push({...clone(f.rows[0]),id:999,version:99});await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'TOP_FIVE_CHANGED');
});
test('changed candidate payload is detected globally before any delete',async t=>{
  const {f,dir}=await prepared(t);f.rows.find(r=>r.document_key===P.keys[2]&&r.version===2).payload.title='changed';
  await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'ROW_PAYLOAD_CHANGED');
});
test('corrupt compressed archive bytes give zero deletes',async t=>{
  const {f,dir}=await prepared(t);const manifest=JSON.parse(await fs.readFile(path.join(dir,'archive-manifest.json'),'utf8'));
  const index=JSON.parse(gunzipSync(f.objects.get(manifest.index.path)));const b=Buffer.from(f.objects.get(index.chunks[0].path));b[0]^=1;f.objects.set(index.chunks[0].path,b);
  await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'ARCHIVE_OBJECT_SHA');
});
test('changed manifest evidence gives zero deletes',async t=>{
  const {f,dir}=await prepared(t);f.locators[0].payload.indexRawSha256='0'.repeat(64);
  await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'ARCHIVE_INDEX_SHA');
});
test('anonymous readable object is rejected before archive qualification',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');f.fault.public=true;await assertZeroDeletes(f,()=>call(f,dir,'archive'),'ARCHIVE_NOT_PRIVATE');
});
test('normal archive admits only the exact bounded R2 Authorization denial and preserves later failure HTTPstatus',async t=>{
  const xml='<?xml version="1.0" encoding="UTF-8"?><Error><Code>InvalidArgument</Code><Message>Authorization</Message></Error>';
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');
  Object.assign(f.fault,{anonymousStatus:400,anonymousBody:xml,anonymousHeaders:{'content-type':'application/xml'}});
  assert.match((await call(f,dir,'archive')).status,/ARCHIVE.*VERIFIED/);assert.equal(f.count('DELETE'),0);assert.equal(f.locators.length,0);
  for(const status of [400,302,503]){
    const bad=fixture(),work=await host(t);await call(bad,work,'plan');Object.assign(bad.fault,{anonymousStatus:status,anonymousBody:'<Error><Code>Other</Code></Error>',anonymousHeaders:{'content-type':'application/xml'}});
    await assert.rejects(()=>call(bad,work,'archive'),e=>e.code==='ARCHIVE_NOT_PRIVATE'&&e.httpStatus===status&&e.privacyHttpStatus===null&&e.privacyStage==='NOT_STARTED');
    assert.equal(bad.count('DELETE'),0);assert.equal(bad.locators.length,0);
  }
  const huge=fixture(),hugeWork=await host(t);await call(huge,hugeWork,'plan');Object.assign(huge.fault,{anonymousStatus:400,anonymousBody:' '.repeat(4097),anonymousHeaders:{'content-type':'application/xml','content-length':'4097'}});
  await assert.rejects(()=>call(huge,hugeWork,'archive'),e=>e.code==='ARCHIVE_NOT_PRIVATE'&&e.httpStatus===400);assert.equal(huge.count('DELETE'),0);assert.equal(huge.locators.length,0);
});
test('normal history archive cancels anonymous200 without consuming object bytes',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');let pulls=0,cancels=0;
  f.fault.anonymousResponse=()=>new Response(new ReadableStream({pull(){pulls++;throw Error('anonymous object bytes must not be read');},cancel(){cancels++;}},{highWaterMark:0}),{status:200});
  await assert.rejects(()=>call(f,dir,'archive'),e=>e.code==='ARCHIVE_NOT_PRIVATE'&&e.httpStatus===200);
  assert.equal(pulls,0);assert.equal(cancels,1);assert.equal(f.count('DELETE'),0);assert.equal(f.locators.length,0);
});
test('existing bucket permissions are required; no bucket creation is attempted',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');f.fault.bucketDenied=true;await assertZeroDeletes(f,()=>call(f,dir,'archive'),'ADMIN_OR_ARCHIVE_OPERATION_FAILED');assert.equal(f.count('PUT'),0);
});
test('declared oversized REST row fails before raw body or pruning',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');f.fault.oversize=true;await assertZeroDeletes(f,()=>call(f,dir,'archive'),'ADMIN_RESPONSE_BOUND');
  assert.equal(f.calls.filter(c=>c.method==='GET'&&new URL(c.url).pathname.endsWith('admin_document_versions')&&new URL(c.url).searchParams.get('select')==='*').length,1,'a byte guard must not cause a second actual row GET');
});
test('unknown immutable PUT makes only one actual request; next explicit operation resolves via HEAD plus full GET',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');f.fault.r2Unknown=true;
  await assertZeroDeletes(f,()=>call(f,dir,'archive'),'WRITE_OUTCOME_UNKNOWN');assert.equal(f.count('PUT'),1);
  const existingKey=[...f.objects.keys()][0],before=f.calls.length;await call(f,dir,'archive');
  const later=f.calls.slice(before);assert.ok(later.some(c=>c.method==='HEAD'&&new URL(c.url).pathname.endsWith(existingKey)));
  assert.ok(later.some(c=>c.method==='GET'&&new URL(c.url).pathname.endsWith(existingKey)));
  assert.equal(later.filter(c=>c.method==='PUT'&&new URL(c.url).pathname.endsWith(existingKey)).length,0);
});
test('unknown exact DELETE stops without retry; later explicit operation classifies only those archived IDs',async t=>{
  const {f,dir}=await prepared(t);f.fault.deleteUnknown=true;
  await assert.rejects(()=>call(f,dir,'prune',confirm),{code:'WRITE_OUTCOME_UNKNOWN'});assert.equal(f.count('DELETE'),1);
  const result=await call(f,dir,'prune',confirm);assert.equal(result.previouslyAbsentCandidates,1);assert.equal(result.confirmedAbsentAfterWrite,5);assert.equal(f.count('DELETE'),6);
});
test('prune batch limit and explicit confirmation are enforced',async t=>{
  const {f,dir}=await prepared(t);await assertZeroDeletes(f,()=>call(f,dir,'prune'),'PRUNE_CONFIRMATION');
  await assertZeroDeletes(f,()=>call(f,dir,'prune',{...confirm,limit:601}),'PRUNE_BATCH_BOUND');
  assert.equal((await call(f,dir,'prune',{...confirm,limit:1})).confirmedAbsentAfterWrite,1);assert.equal(f.count('DELETE'),1);
});

test('local archive plus stdout metadata cannot authorize a prune before central publication',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');await call(f,dir,'archive');
  await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'DURABLE_LOCATOR_REQUIRED');
});
test('actual normal catalogue/RLS verifier rejects public access before locator write or prune',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');await call(f,dir,'archive');f.fault.privacy=true;
  await assertZeroDeletes(f,()=>call(f,dir,'publish-locator',publishConfirm),'LOCATOR_PRIVACY_UNVERIFIED');assert.equal(f.locators.length,0);
  await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'LOCATOR_PRIVACY_UNVERIFIED');
});
test('locator CAS rejects stale version; an unknown namespace is never overwritten',async t=>{
  const {f,dir}=await prepared(t);f.locators[0].payload.draftDigest='0'.repeat(64);f.fault.locatorRace=true;
  await assertZeroDeletes(f,()=>call(f,dir,'publish-locator',publishConfirm),'LOCATOR_CAS_FAILED');
  f.locators[0].payload={notThisApplication:true};f.fault.locatorRace=false;
  await assertZeroDeletes(f,()=>call(f,dir,'publish-locator',publishConfirm),'LOCATOR_FIELDS');
});
test('central discovery and full restore/prune work in a new private operation directory without any PC draft or manifest',async t=>{
  const {f}=await prepared(t),newDir=await host(t);
  assert.equal((await call(f,newDir,'discover')).rows,6);assert.equal((await call(f,newDir,'restore')).rows,6);
  assert.equal((await call(f,newDir,'prune',confirm)).confirmedAbsentAfterWrite,6);
});
test('old locator versions are preserved and support readonly historical restore',async t=>{
  const {f,dir}=await prepared(t),oldSha=f.locators[0].payload.indexSha256;
  for(let i=0;i<P.keys.length;i++){
    f.rows.push({...clone(f.rows.find(r=>r.document_key===P.keys[i])),id:900+i,version:8});f.currents[i].version=9;
  }
  const next=await host(t);await call(f,next,'plan');await call(f,next,'archive');await call(f,next,'publish-locator',publishConfirm);
  assert.equal(f.locators[0].version,2);assert.equal(f.locatorVersions.length,1);assert.equal((await call(f,next,'restore',{indexSha:oldSha})).rows,6);
  assert.equal(f.count('DELETE'),0);assert.ok(f.objects.size>0);
});

test('fixed service-role catalogue ACL is required before locator publication',async t=>{
  const f=fixture(),dir=await host(t);await call(f,dir,'plan');await call(f,dir,'archive');f.fault.acl=true;
  await assertZeroDeletes(f,()=>call(f,dir,'publish-locator',publishConfirm),'SERVICE_ROLE_HISTORY_ACCESS_UNVERIFIED');assert.equal(f.locators.length,0);
});
test('readonly restore materializes complete original row fields privately, never a production database write',async t=>{
  const {f}=await prepared(t),dir=await host(t);const result=await call(f,dir,'restore');
  const receipt=JSON.parse(await fs.readFile(path.join(dir,'restore-receipt.json'),'utf8'));const recovered=[];
  for(const entry of receipt.files){const b=await fs.readFile(path.join(dir,entry.file));assert.equal(sha(b),entry.sha256);for(const line of gunzipSync(b).toString('utf8').trimEnd().split('\n'))recovered.push(JSON.parse(Buffer.from(JSON.parse(line).rawBase64,'base64').toString('utf8'))[0]);}
  const expected=f.rows.filter(r=>P.keys.includes(r.document_key)&&r.version<=2);recovered.sort((a,b)=>a.id-b.id);expected.sort((a,b)=>a.id-b.id);
  assert.equal(sha(bytes(recovered)),sha(bytes(expected)));assert.equal(result.productionDbRestoreExecuted,false);assert.equal(f.count('DELETE'),0);
});

test('locator old-version privacy is verified too; selector cannot retarget a prune',async t=>{
  const {f,dir}=await prepared(t);f.fault.historyPrivacy=true;
  await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'LOCATOR_PRIVACY_UNVERIFIED');
  f.fault.historyPrivacy=false;
  await assertZeroDeletes(f,()=>call(f,dir,'prune',{...confirm,indexSha:'0'.repeat(64)}),'LOCATOR_SELECTOR_MODE');
});

test('exact REST bytes preserve large integers, high-precision decimals and multiline responses; even a parsed-equal change blocks prune',async t=>{
  const f=fixture(),dir=await host(t),originals=new Map();
  for(const row of f.rows.filter(r=>P.keys.includes(r.document_key)&&r.version<=2)){
    const raw=Buffer.from('[\n  {\n    "id": '+row.id+', "document_key": '+JSON.stringify(row.document_key)+',\n'
      +'    "version": '+row.version+', "created_at": '+JSON.stringify(row.created_at)+', "created_by": '+JSON.stringify(row.created_by)+',\n'
      +'    "payload": {"large": 9007199254740993, "precise": 0.123456789012345678901234567890, "text": "æøå\\nprivate synthetic text"}\n  }\n]\n','utf8');
    assert.doesNotThrow(()=>JSON.parse(raw));originals.set(row.id,raw);f.rawRows.set(row.id,raw);
  }
  await call(f,dir,'plan');await call(f,dir,'archive');await call(f,dir,'publish-locator',publishConfirm);
  const restoreDir=await host(t);await call(f,restoreDir,'restore');
  const receipt=JSON.parse(await fs.readFile(path.join(restoreDir,'restore-receipt.json'),'utf8'));assert.equal(receipt.exactRestResponseBytes,true);
  const recovered=new Map();
  for(const file of receipt.files){
    const compressed=await fs.readFile(path.join(restoreDir,file.file));assert.equal(sha(compressed),file.sha256);
    for(const line of gunzipSync(compressed).toString('utf8').trimEnd().split('\n')){
      const record=JSON.parse(line);assert.equal(record.kind,'ADMIN_HISTORY_REST_RESPONSE_V2');const raw=Buffer.from(record.rawBase64,'base64');
      const row=JSON.parse(raw)[0];assert.ok(raw.equals(originals.get(row.id)),'the complete original REST response, including whitespace and exact numeric lexemes, roundtrips');
      assert.ok(raw.includes(Buffer.from('9007199254740993'))&&raw.includes(Buffer.from('0.123456789012345678901234567890')));recovered.set(row.id,sha(raw));
    }
  }
  assert.equal(recovered.size,6);assert.equal(f.count('DELETE'),0);
  const [id,original]=originals.entries().next().value;
  for(const [from,to] of [['9007199254740993','9007199254740992'],['0.123456789012345678901234567890','0.123456789012345678901234567891']]){
    const changed=Buffer.from(original.toString('utf8').replace(from,to),'utf8');assert.notEqual(sha(changed),sha(original));
    assert.deepEqual(JSON.parse(changed),JSON.parse(original),'this change would be invisible to parse/reserialize hashing');
    f.rawRows.set(id,changed);await assertZeroDeletes(f,()=>call(f,dir,'prune',confirm),'ROW_PAYLOAD_CHANGED');
  }
  f.rawRows.set(id,original);assert.equal((await call(f,dir,'prune',confirm)).confirmedAbsentAfterWrite,6);
});

const maintainConfirm={confirmation:'MAINTAIN-EXACT-THREE-DOCUMENT-HISTORY'};
test('automatic pass runs the existing exact V2 archive locator restore fresh-protection prune chain',async t=>{
  const f=fixture(),dir=await host(t),current=sha(bytes(f.currents)),other=sha(bytes(f.rows.filter(r=>!P.keys.includes(r.document_key))));
  const r=await call(f,dir,'maintain',maintainConfirm);
  assert.equal(r.status,'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED');assert.equal(r.candidateRows,6);
  assert.equal(r.confirmedAbsentAfterWrite,6);assert.equal(r.remainingCandidates,0);assert.equal(r.archiveRequired,true);
  assert.equal(f.locators.length,1);assert.equal(sha(bytes(f.currents)),current);
  assert.equal(sha(bytes(f.rows.filter(r=>!P.keys.includes(r.document_key)))),other);
  for(const key of P.keys)assert.equal(f.rows.filter(r=>r.document_key===key).length,5);
  const deleted=f.calls.filter(x=>x.method==='DELETE');
  assert.equal(deleted.length,6);
  for(const x of deleted){const u=new URL(x.url);assert.equal(u.pathname,'/rest/v1/admin_document_versions');assert(P.keys.includes(u.searchParams.get('document_key').slice(3)));}
  const first=f.calls.findIndex(x=>x.method==='DELETE');
  assert(f.calls.slice(0,first).some(x=>x.method==='POST'&&new URL(x.url).origin==='https://api.supabase.com'));
  assert.equal(r.fullDatabaseBackupVerified,false);assert.equal(r.freeReady,false);
  // The next ordinary day is a genuine no-op: no new empty archive, locator or history DELETE.
  const next=await host(t),writes=f.count('PUT')+f.count('DELETE')+f.count('PATCH');
  const second=await call(f,next,'maintain',maintainConfirm);
  assert.equal(second.candidateRows,0);assert.equal(second.archiveRequired,false);assert.equal(second.wireWrites,0);
  assert.equal(f.count('PUT')+f.count('DELETE')+f.count('PATCH'),writes);
});
test('automatic pass is fixed to25 and refuses missing confirmation before private requests',async t=>{
  for(const extra of [{},{...maintainConfirm,limit:26},{...maintainConfirm,limit:100},{...maintainConfirm,indexSha:'a'.repeat(64)}]){
    const f=fixture(),dir=await host(t);await assert.rejects(()=>call(f,dir,'maintain',extra));
    assert.equal(f.calls.length,0);
  }
  const f=fixture(),dir=await host(t);let nextId=10000;
  for(const key of P.keys)for(let n=0;n<15;n++)f.rows.push({...clone(f.rows.find(r=>r.document_key===key)),
    id:nextId++,version:100+n,created_at:'2026-09-01T00:00:00Z'});
  const eligible=P.keys.flatMap(key=>f.rows.filter(r=>r.document_key===key)
    .sort((a,b)=>b.version-a.version||b.id-a.id).slice(5))
    .sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)||a.id-b.id);
  const expectedBatch=eligible.slice(0,25),expectedIds=expectedBatch.map(x=>x.id).sort((a,b)=>a-b);
  const r=await call(f,dir,'maintain',maintainConfirm);
  assert.equal(r.candidateRows,25);assert.equal(r.eligibleRowsBefore,eligible.length);
  assert.equal(r.confirmedAbsentAfterWrite,25);assert.equal(f.count('DELETE'),25);
  assert.equal(r.remainingCandidates,eligible.length-25);
  const fullGets=f.calls.filter(x=>x.method==='GET'&&new URL(x.url).pathname==='/rest/v1/admin_document_versions'
    &&new URL(x.url).searchParams.get('select')==='*');
  const readIds=[...new Set(fullGets.map(x=>Number(new URL(x.url).searchParams.get('id').slice(3))))].sort((a,b)=>a-b);
  assert.deepEqual(readIds,expectedIds,'only these25 original full rows are read, including exact readback checks');
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'archive-manifest.json'),'utf8'));
  const index=JSON.parse(gunzipSync(f.objects.get(manifest.index.path)));
  assert.deepEqual(index.draft.core.candidates.map(x=>x.id).sort((a,b)=>a-b),expectedIds);
  assert.deepEqual(index.chunks.flatMap(x=>x.rows.map(r=>r.id)).sort((a,b)=>a-b),expectedIds,
    'the compressed archive and verified restore contain exactly this batch');
  const deletedIds=f.calls.filter(x=>x.method==='DELETE').map(x=>Number(new URL(x.url).searchParams.get('id').slice(3))).sort((a,b)=>a-b);
  assert.deepEqual(deletedIds,expectedIds);
  for(const key of P.keys)assert(f.rows.filter(r=>r.document_key===key).length>=5);
});
test('automatic pass rechecks current top5 and ACL after durable publication before deleting',async t=>{
  for(const kind of ['current','top5','acl']){
    const f=fixture(),dir=await host(t);
    f.fault.afterLocator=()=>{
      if(kind==='current')f.currents[0].version++;
      else if(kind==='top5')f.rows.push({...clone(f.rows[0]),id:9999,version:999});
      else f.fault.acl=true;
    };
    await assert.rejects(()=>call(f,dir,'maintain',maintainConfirm));
    assert.equal(f.count('DELETE'),0);
  }
});
test('automatic unknown writes read-classify then stop: immutable object locator or exact delete, never repeat',async t=>{
  for(const [fault,outcome,method] of [
    ['r2Unknown','IMMUTABLE_ARCHIVE_OBJECT_PRESENT_VERIFIED','PUT'],
    ['locatorUnknown','LOCATOR_PAYLOAD_PRESENT_VERIFIED','POST'],
    ['deleteUnknown','EXACT_ROW_ABSENT','DELETE'],
    ['deleteBeforeWrite','EXACT_ROW_STILL_PRESENT','DELETE']
  ]){
    const f=fixture(),dir=await host(t);f.fault[fault]=true;
    let error;try{await call(f,dir,'maintain',maintainConfirm);}catch(e){error=e;}
    assert.equal(error?.code,'WRITE_OUTCOME_RESOLVED_STOPPED',fault);
    assert.equal(error.safeOperation.writeOutcome,outcome,fault);
    assert.equal(error.safeOperation.resolutionReadOnly,true);assert.equal(error.safeOperation.furtherWritesPerformed,false);
    const selected=f.calls.filter(x=>x.method===method&&(method!=='POST'||new URL(x.url).origin===P.project));
    assert.equal(selected.length,1,fault);
    const lastWrite=f.calls.findLastIndex(x=>['PUT','PATCH','DELETE'].includes(x.method)
      ||x.method==='POST'&&new URL(x.url).origin===P.project);
    assert(f.calls.slice(lastWrite+1).some(x=>x.method==='GET'),'actual authenticated outcome read after write failure');
    assert.equal(f.calls.slice(lastWrite+1).filter(x=>['PUT','PATCH','DELETE'].includes(x.method)
      ||x.method==='POST'&&new URL(x.url).origin===P.project).length,0);
    if(fault==='r2Unknown'||fault==='locatorUnknown')assert.equal(f.count('DELETE'),0);
    assert(!JSON.stringify(error.safeOperation).includes('synthetic-document-secret'));
  }
});

test('automatic unresolved write outcome stops after read attempts with no second wire mutation',async t=>{
  const f=fixture(),dir=await host(t),dependencies=f.dependencies(),normal=dependencies.fetchImpl;
  let unknown=false,putRequests=0;
  dependencies.fetchImpl=async(url,options={})=>{
    if(unknown&&String(options.method||'GET').toUpperCase()==='GET')return new Response(null,{status:503});
    if(String(options.method||'GET').toUpperCase()==='PUT'){
      putRequests++;await normal(url,options);unknown=true;throw Error('synthetic lost response');
    }
    return normal(url,options);
  };
  let error;try{await run({workdir:dir,mode:'maintain',...maintainConfirm},dependencies);}catch(e){error=e;}
  assert.equal(error?.code,'WRITE_OUTCOME_UNKNOWN');
  assert.equal(error.safeOperation.writeOutcome,'UNRESOLVED');
  assert.equal(error.safeOperation.resolutionReadOnly,true);assert.equal(error.safeOperation.furtherWritesPerformed,false);
  assert.equal(putRequests,1);assert.equal(f.count('DELETE'),0);
});

test('automatic oldest25 batch is re-admitted against a fresh normal inventory before archive I/O',async t=>{
  const f=fixture(),dir=await host(t),dependencies=f.dependencies(),normal=dependencies.fetchImpl;
  let currentReads=0;
  dependencies.fetchImpl=async(url,options={})=>{
    const u=new URL(url);
    if(u.origin===P.project&&u.pathname==='/rest/v1/admin_documents'&&P.keys.includes(u.searchParams.get('document_key')?.slice(3))
      &&String(options.method||'GET').toUpperCase()==='GET'&&++currentReads===7){
      f.rows.push({...clone(f.rows[0]),id:999999,created_at:'2000-01-01T00:00:00Z'});
    }
    return normal(url,options);
  };
  await assert.rejects(()=>run({workdir:dir,mode:'maintain',...maintainConfirm},dependencies),{code:'DRAFT_CHANGED'});
  assert.equal(f.count('PUT')+f.count('DELETE'),0);
  assert.equal(f.calls.filter(x=>new URL(x.url).pathname==='/rest/v1/admin_document_versions'
    &&new URL(x.url).searchParams.get('select')==='*').length,0);
});

test('database-query HTTP201 success keeps the complete normal history privacy and archive chain',async t=>{
  const f=fixture(),dir=await host(t);f.fault.privacyStatus=201;
  const result=await call(f,dir,'maintain',maintainConfirm);
  assert.equal(result.status,'AUTOMATIC_FIXED_DOCUMENT_HISTORY_MAINTAINED');
  assert.equal(result.privacyHttpStatus,201);assert.equal(result.privacyStage,'VERIFIED');
  assert.equal(result.confirmedAbsentAfterWrite,6);
});
test('database-query HTTP status and malformed201 metadata refuse before any archive locator or DELETE',async t=>{
  for(const status of [401,403,429,500,204]){
    const f=fixture(),dir=await host(t);f.fault.privacyStatus=status;
    await assert.rejects(()=>call(f,dir,'maintain',maintainConfirm),e=>{
      assert.equal(e.code,'LOCATOR_PRIVACY_UNVERIFIED');assert.equal(e.privacyHttpStatus,status);assert.equal(e.privacyStage,'HTTP_STATUS');return true;
    });
    assert.equal(f.calls.length,1);assert.equal(f.objects.size,0);assert.equal(f.locators.length,0);assert.equal(f.count('DELETE'),0);
  }
  for(const [change,stage,code] of [
    [f=>f.fault.privacyShape='invalid-json','RESPONSE_JSON','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.privacyShape='envelope','RESPONSE_JSON','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.privacyShape='empty','RESPONSE_JSON','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.privacy=true,'CURRENT_METADATA','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.historyPrivacy=true,'HISTORY_METADATA','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.acl=true,'SERVICE_ROLE_ACCESS','SERVICE_ROLE_HISTORY_ACCESS_UNVERIFIED'],
    [f=>f.fault.catalogueChange=r=>r[0].metadata.functions[2].source="select 'synthetic-private-never-log';",'CURRENT_METADATA','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.catalogueChange=r=>r[0].version_metadata.policies[0].name='unreviewed','HISTORY_POLICY_NAMES','LOCATOR_PRIVACY_UNVERIFIED'],
    [f=>f.fault.catalogueChange=r=>r[0].metadata=JSON.stringify(r[0].metadata),'CURRENT_METADATA','LOCATOR_PRIVACY_UNVERIFIED'],
  ]){
    const f=fixture(),dir=await host(t);f.fault.privacyStatus=201;change(f);
    await assert.rejects(()=>call(f,dir,'maintain',maintainConfirm),e=>{
      assert.equal(e.code,code);assert.equal(e.privacyHttpStatus,201);assert.equal(e.privacyStage,stage);
      assert(!JSON.stringify(e).includes('synthetic-private'));return true;
    });
    assert.equal(f.calls.length,1);assert.equal(f.objects.size,0);assert.equal(f.locators.length,0);assert.equal(f.count('DELETE'),0);
  }
});

test('database-query HTTP real CLI emits only fixed status and privacy stages after complete strict validation',async t=>{
  const testSource=await fs.readFile(new URL(import.meta.url),'utf8');
  const from=testSource.indexOf('function fixture(){'),to=testSource.indexOf('\nasync function host(t)',from);
  assert(from>=0&&to>from);
  const actualFixture=testSource.slice(from,to);
  for(const [status,kind,expectedStatus,expectedStage] of [
    [200,'private-root',1,null],[200,'ok',0,'VERIFIED'],[201,'ok',0,'VERIFIED'],[201,'privacy',1,'CURRENT_METADATA'],
    [201,'envelope',1,'RESPONSE_JSON'],[401,'ok',1,'HTTP_STATUS'],[201,'archive-failure',1,'VERIFIED'],[201,'archive-denial',1,'VERIFIED'],
  ]){
    const dir=await host(t),observation=path.join(dir,'cli-safe-observation.json');
    const support=[
      "import crypto from 'node:crypto';","import fs from 'node:fs';","import assert from 'node:assert/strict';",
      'import {PRIVATE_STUDY_ADMIN_FUNCTIONS,PRIVATE_STUDY_ADMIN_ACCESS_SQL} from '+JSON.stringify(pathToFileURL(path.resolve('scripts/lib/private-trip-study-admin-transport.mjs')).href)+';',
      'const P='+JSON.stringify(P)+';',
      "const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;",
      "const bytes=v=>Buffer.from(JSON.stringify(stable(v))),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),clone=v=>structuredClone(v);",
      actualFixture,'const f=fixture();f.fault.privacyStatus='+status+';',
      kind==='privacy'?'f.fault.privacy=true;':kind==='envelope'?"f.fault.privacyShape='envelope';":kind==='archive-failure'?'f.fault.r2Unknown=true;':kind==='archive-denial'?"f.fault.anonymousStatus=400;f.fault.anonymousBody='<Error><Code>Other</Code></Error>';f.fault.anonymousHeaders={'content-type':'application/xml'};":'',
      'globalThis.fetch=f.fetchImpl;',
      "process.on('exit',()=>fs.writeFileSync("+JSON.stringify(observation)+",JSON.stringify({calls:f.calls.length,mutations:f.calls.filter(c=>new URL(c.url).hostname!=='api.supabase.com'&&['PUT','POST','PATCH','DELETE'].includes(c.method)).length}),{flag:'wx'}));",
    ].join('\n');
    const f=fixture(),allowed=new Set(['PATH','SYSTEMROOT','WINDIR','COMSPEC','PATHEXT','HOME','USERPROFILE','LANG','LC_ALL']);
    const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>allowed.has(key.toUpperCase()))),
      ...f.env,RUNNER_TEMP:kind==='private-root'?path.join(dir,'other-runner-root'):dir,TMP:os.tmpdir(),TEMP:os.tmpdir()};
    assert.notEqual(path.resolve(env.RUNNER_TEMP),path.resolve(env.TEMP),'Private fixture runner and system temporary roots must differ');
    const result=spawnSync(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(support),
      path.resolve('scripts/admin-document-history-maintenance.mjs'),'--maintain','--workdir',path.join(dir,'working'),
      '--confirm',maintainConfirm.confirmation,'--limit','25'],{env,encoding:'utf8',timeout:15000,maxBuffer:65536,windowsHide:true});
    assert.equal(result.error,undefined);assert.equal(result.signal,null);assert.equal(result.status,expectedStatus,result.stderr);
    const record=JSON.parse((expectedStatus?result.stderr:result.stdout).trim());
    assert.equal(record.privacyStage,expectedStage);
    assert.equal(record.privacyHttpStatus,kind==='private-root'?null:status);
    assert.equal(record.httpStatus,kind==='archive-denial'?400:undefined,'Operation HTTPstatus remains distinct from metadata privacyHttpStatus');
    if(expectedStatus){
      const observed=JSON.parse(await fs.readFile(observation,'utf8'));
      if(kind==='private-root'){
        assert.equal(record.code,'PRIVATE_TEMP_DIRECTORY_REQUIRED');
        assert.equal(observed.calls,0);assert.equal(observed.mutations,0);
      }else if(kind==='archive-failure'){
        assert.equal(record.code,'WRITE_OUTCOME_RESOLVED_STOPPED');
        assert.equal(record.operation.writeOutcome,'IMMUTABLE_ARCHIVE_OBJECT_PRESENT_VERIFIED');
        assert.equal(observed.mutations,1,'Exactly one synthetic immutable upload precedes the resolved-stop');
      }else if(kind==='archive-denial'){
        assert.equal(record.code,'ARCHIVE_NOT_PRIVATE');assert.equal(observed.mutations,1);
      }else{assert.equal(record.code,'LOCATOR_PRIVACY_UNVERIFIED');assert.equal(observed.calls,1);assert.equal(observed.mutations,0);}
    }
    assert(!result.stdout.includes('synthetic-document-secret')&&!result.stderr.includes('synthetic-document-secret'));
    assert(!result.stderr.includes('synthetic-service-role')&&!result.stderr.includes('synthetic-existing-metadata-access'));
  }
});

test('database-query HTTP201 wrong RLS remains refused before history mutations',async t=>{
  const f=fixture(),dir=await host(t);f.fault.privacyStatus=201;
  f.fault.catalogueChange=rows=>{rows[0].metadata.rls=false;};
  await assert.rejects(()=>call(f,dir,'maintain',maintainConfirm),e=>{
    assert.equal(e.code,'LOCATOR_PRIVACY_UNVERIFIED');assert.equal(e.privacyHttpStatus,201);assert.equal(e.privacyStage,'CURRENT_METADATA');return true;
  });
  assert.equal(f.calls.length,1);assert.equal(f.objects.size,0);assert.equal(f.locators.length,0);assert.equal(f.count('DELETE'),0);
});
