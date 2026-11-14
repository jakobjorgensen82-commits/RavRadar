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
  const currents=P.keys.map(document_key=>({document_key,payload:{title:document_key,text:'synthetic-current-never-log'},version:8,updated_at:'2026-08-08T00:00:00.000Z',updated_by:null}));
  const rawRows=new Map(); // Synthetic exact REST responses; metadata stays on the normal fixture.
  const locators=[],locatorVersions=[],preparations=[],unresolvedPreparations=[],objects=new Map(),calls=[],fault={privacy:false,historyPrivacy:false,acl:false,locatorRace:false,public:false,bucketDenied:false,r2Unknown:false,deleteUnknown:false,oversize:false,wrongRow:false};
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
      const report=[{current_access:!fault.acl,history_access:!fault.acl,prepared_access:!fault.preparedAcl,metadata,version_metadata}];
      if(fault.catalogueChange)fault.catalogueChange(report);
      const status=fault.privacyStatus??200;
      if(status===204)return new Response(null,{status});
      if(fault.privacyShape==='invalid-json')return new Response('synthetic-private-metadata-never-log',{status});
      return json(fault.privacyShape==='envelope'?{data:report}:fault.privacyShape==='empty'?[]:report,status);
    }
    if(u.origin===P.project){
      const q=u.searchParams,key=q.get('document_key')?.slice(3);
      if(u.pathname==='/rest/v1/admin_documents'&&method==='POST'){
        const body=JSON.parse(options.body);assert.equal(body.updated_by,null);
        if([P.preparedKey,P.unresolvedKey].includes(body.document_key)){
          const prefix=body.document_key===P.preparedKey?'prepared':'unresolved',store=prefix==='prepared'?preparations:unresolvedPreparations;
          if(fault[prefix+'InsertBefore']){fault[prefix+'InsertBefore']=false;throw Error('synthetic preparation INSERT not committed');}
          if(store.length)return json([]);store.push({document_key:body.document_key,payload:clone(body.payload),version:1});
          if(fault[prefix+'InsertUnknown']){fault[prefix+'InsertUnknown']=false;throw Error('synthetic unknown preparation INSERT');}
          return json(clone(store),201);
        }
        assert.equal(body.document_key,P.locatorKey);
        if(locators.length)return json([]);locators.push({document_key:P.locatorKey,payload:clone(body.payload),version:1});if(fault.afterLocator)fault.afterLocator();if(fault.locatorUnknown){fault.locatorUnknown=false;throw Error('PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE');}return json(clone(locators),201);
      }
      if([P.preparedKey,P.unresolvedKey].includes(key)){
        const prefix=key===P.preparedKey?'prepared':'unresolved',store=prefix==='prepared'?preparations:unresolvedPreparations;
        assert.equal(u.pathname,'/rest/v1/admin_documents','preparation never reaches document history');
        if(method==='GET')return json(clone(store));assert.equal(method,'DELETE','preparation is never UPDATEd');
        assert.equal(q.get('version'),'eq.1');assert.equal(store.length,1);
        assert.equal(q.get('payload'),'eq.'+bytes(store[0].payload).toString('utf8'),'full immutable pointer payload binds its exact DELETE');
        if(fault[prefix+'DeleteBefore']){fault[prefix+'DeleteBefore']=false;throw Error('synthetic metadata DELETE not committed');}
        store.pop();if(fault[prefix+'DeleteUnknown']){fault[prefix+'DeleteUnknown']=false;return json({},504);}return new Response(null,{status:204});
      }
      if(key===P.locatorKey){
        if(u.pathname==='/rest/v1/admin_documents'){
          if(method==='GET')return json(clone(locators));assert.equal(method,'PATCH');
          if(fault.locatorRace||!locators.length||q.get('version')!=='eq.'+locators[0].version)return json([]);
          const body=JSON.parse(options.body);
          if(fault.beforeLocatorPatch){fault.beforeLocatorPatch=false;throw Error('synthetic locator CAS not committed');}
          locatorVersions.push({...clone(locators[0]),id:Math.max(0,...rows.map(r=>r.id),...locatorVersions.map(r=>r.id))+1,
            created_at:new Date(Date.UTC(2026,9,1)+locators[0].version*1000).toISOString(),created_by:null});
          locators[0]={document_key:P.locatorKey,payload:clone(body.payload),version:locators[0].version+1};
          if(fault.locatorPatchUnknown){fault.locatorPatchUnknown=false;throw Error('synthetic committed locator CAS unknown');}
          return json(clone(locators));
        }
        let selected=locatorVersions.filter(x=>(!q.has('payload->>indexSha256')||x.payload.indexSha256===q.get('payload->>indexSha256').slice(3))
          &&(!q.has('version')||x.version===Number(q.get('version').slice(3)))&&(!q.has('id')||x.id===Number(q.get('id').slice(3))));
        if(method==='DELETE'){
          assert.equal(selected.length,1);assert.equal(selected[0].payload.kind,'ADMIN_HISTORY_ARCHIVE_LOCATOR_V3','V2/legacy locator rows can never expire');
          assert.equal(q.get('payload'),'eq.'+bytes(selected[0].payload).toString('utf8'),'the full exact JSONB payload is part of the delete filter');
          locatorVersions.splice(locatorVersions.indexOf(selected[0]),1);
          if(fault.locatorExpiryUnknown){fault.locatorExpiryUnknown=false;return json({},504);}return new Response(null,{status:204});
        }
        assert.equal(method,'GET');const select=q.get('select');
        return json(selected.slice(0,2).map(r=>select==='*'?clone(r):Object.fromEntries(select.split(',').map(k=>[k,r[k]]))));
      }
      assert.ok(P.keys.includes(key),'only the3 documentation keys or exact private locator reach the database');
      if(u.pathname==='/rest/v1/admin_documents'){
        assert.equal(method,'GET','current documents are read-only');const select=q.get('select');
        return json(currents.filter(r=>r.document_key===key).map(r=>select==='*'?clone(r):Object.fromEntries(select.split(',').map(k=>[k,r[k]]))));
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
      const entries=[...objects].map(([k,b])=>`<Contents><Key>${k}</Key><Size>${fault.listedSizes?.get(k)??b.length}</Size></Contents>`).join('');
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
    if(method==='DELETE'){
      assert.ok(fault.retentionDeleteAllowed,'only explicitly initialized retention cases allow archive DELETE');
      if(fault.r2DeleteBefore){fault.r2DeleteBefore=false;throw Error('PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE');}
      assert.ok(objects.has(key),'retirement never repeats an absent object');const prior=objects.get(key);objects.delete(key);
      if(fault.r2DeleteUnknown&&(!fault.r2DeleteOnlyGeneration||JSON.parse(gunzipSync(prior).toString('utf8').trimEnd()).kind!=='ADMIN_HISTORY_PREPARATION_V1')){
        fault.r2DeleteUnknown=false;return new Response(null,{status:504});}
      return new Response(null,{status:204});
    }
    assert.equal(method,'PUT','the maintenance caller never deletes an archive object');
    assert.equal(new Headers(options.headers).get('if-none-match'),'*');
    if(objects.has(key))return new Response(null,{status:412});
    if(fault.preparationPutBefore&&JSON.parse(gunzipSync(Buffer.from(options.body)).toString('utf8').trimEnd()).kind==='ADMIN_HISTORY_PREPARATION_V1'){
      fault.preparationPutBefore=false;throw Error('synthetic preparation PUT not committed');}
    if(fault.preparationPutDeferred&&JSON.parse(gunzipSync(Buffer.from(options.body)).toString('utf8').trimEnd()).kind==='ADMIN_HISTORY_PREPARATION_V1'){
      fault.preparationPutDeferred=false;const wire=Buffer.from(options.body);
      fault.deferredPreparationWire=wire;
      fault.completeDeferredPreparationPut=()=>{assert.ok(!objects.has(key));objects.set(key,wire);};
      throw Error('synthetic timed-out preparation PUT still pending remotely');}
    objects.set(key,Buffer.from(options.body));
    if(fault.afterR2Put)fault.afterR2Put(key,objects.get(key));
    if(fault.r2Unknown){fault.r2Unknown=false;throw new Error('PRIVATE-UPSTREAM-BODY-MUST-NOT-ESCAPE');}
    return new Response(null,{status:200});
  };
  return{env,rows,rawRows,currents,locators,locatorVersions,preparations,unresolvedPreparations,objects,calls,fault,fetchImpl,
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
const retentionConfirm={confirmation:'INITIALIZE-EXACT-THREE-DOCUMENT-RETENTION'};
function appendDocumentVersions(f,count){
  let nextId=Math.max(...f.rows.map(r=>r.id),...f.locatorVersions.map(r=>r.id))+1;
  for(let n=0;n<count;n++)for(const current of f.currents){
    f.rows.push({id:nextId++,document_key:current.document_key,version:current.version,created_at:current.updated_at,created_by:null,payload:clone(current.payload)});
    current.version++;current.updated_at=new Date(Date.UTC(2026,8,1)+current.version*1000).toISOString();
    current.payload={title:current.document_key,text:'synthetic-current-never-log',revision:current.version};
  }
}
const retainedIndex=f=>JSON.parse(gunzipSync(f.objects.get(f.locators[0].payload.indexPath)));
async function drainRetention(t,f){
  for(let pass=0;pass<30;pass++){
    const r=await call(f,await host(t),'maintain',maintainConfirm);
    if(r.remainingCandidates===0&&r.candidateRows===0&&!r.archiveObjectsDeleted)return;
  }
  assert.fail('bounded fixture backlog did not settle');
}
test('retention: explicit transition preserves all legacy and current originals, keeps ten NEW versions and rotates only published unshared objects',async t=>{
  const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
  f.objects.set('unknown-legacy-key-kept-forever',Buffer.from('synthetic-opaque-legacy'));
  const legacyObjects=new Map([...f.objects].map(([k,b])=>[k,Buffer.from(b)])),legacyRows=clone(f.rows.filter(r=>P.keys.includes(r.document_key)));
  const init=await call(f,await host(t),'initialize-retention',retentionConfirm);assert.equal(init.legacyRows,21);
  assert.equal(f.locators[0].payload.kind,'ADMIN_HISTORY_ARCHIVE_LOCATOR_V3');
  const frozen=clone(retainedIndex(f).legacy);assert.equal(frozen.rows.length,21);assert.equal(frozen.currents.length,3);
  await drainRetention(t,f);appendDocumentVersions(f,14);await drainRetention(t,f);
  appendDocumentVersions(f,20);await drainRetention(t,f);
  const index=retainedIndex(f);assert.equal(index.retained.length,30);assert.equal(index.lateLegacy.length,3);
  assert.deepEqual(index.legacy,frozen,'cutover identity cannot drift');
  for(const key of P.keys){const current=f.currents.find(r=>r.document_key===key);
    assert.deepEqual(index.retained.filter(r=>r.document_key===key).map(r=>r.version),Array.from({length:10},(_,n)=>current.version-6-n));
    assert.equal(f.rows.filter(r=>r.document_key===key).length,5);}
  for(const [key,original]of legacyObjects)assert.deepEqual(f.objects.get(key),original,'pre-transition originals and unknown keys remain byte-identical');
  for(const row of legacyRows){const reference=index.legacy.rows.find(r=>r.id===row.id),record=JSON.parse(gunzipSync(f.objects.get(reference.object.path)).toString('utf8').trimEnd());
    const raw=Buffer.from(record.rawBase64,'base64');assert.equal(sha(raw),reference.rowSha256);assert.deepEqual(JSON.parse(raw),[row]);}
  const r2Deletes=f.calls.filter(r=>r.method==='DELETE'&&new URL(r.url).hostname.endsWith('.r2.cloudflarestorage.com'));
  assert.ok(r2Deletes.length>0,'normal initialized maintenance performed actual synthetic retirement');
  assert.ok(r2Deletes.every(r=>!legacyObjects.has(decodeURIComponent(new URL(r.url).pathname.slice(P.bucket.length+2)))));
  const currentManifest={kind:'ADMIN_HISTORY_MANIFEST_V3',index:{path:f.locators[0].payload.indexPath,sha256:f.locators[0].payload.indexSha256,bytes:f.locators[0].payload.indexBytes}};
  assert.ok(f.objects.has(currentManifest.index.path));assert.ok(f.objects.has(index.reserve.index.path));
  const reserve=JSON.parse(gunzipSync(f.objects.get(index.reserve.index.path)));
  for(const chunk of [...index.chunks,...reserve.chunks])assert.equal(sha(f.objects.get(chunk.path)),chunk.sha256,'all current/reserve originals remain readable');
  assert.ok(f.rows.filter(r=>!P.keys.includes(r.document_key)).length===14,'other document keys are unchanged');
  const calls=f.calls.length;await call(f,await host(t),'maintain',maintainConfirm);
  assert.equal(f.calls.slice(calls).filter(r=>['PUT','PATCH','POST','DELETE'].includes(r.method)&&!r.url.startsWith('https://api.supabase.com/')).length,0,'settled empty pass makes no mutation');
});
test('retention: no implicit transition, no downgrade, complete byte reservation before PUT and unknown new objects held',async t=>{
  const {f}=await prepared(t);const original=f.locators[0].payload.indexSha256,puts=f.count('PUT');
  await assert.rejects(async()=>call(f,await host(t),'initialize-retention'),{code:'RETENTION_INITIALIZATION_CONFIRMATION'});
  assert.equal(f.count('PUT'),puts);assert.equal(f.locators[0].payload.indexSha256,original);
  f.objects.set('large-unknown-legacy',Buffer.from('synthetic'));f.fault.listedSizes=new Map([['large-unknown-legacy',1_850_000_000]]);
  await assert.rejects(async()=>call(f,await host(t),'initialize-retention',retentionConfirm),{code:'RETENTION_CAPACITY_HELD'});
  assert.equal(f.count('PUT'),puts,'all pending legacy and transient capacity are checked before first upload');
  f.objects.delete('large-unknown-legacy');f.fault.listedSizes=null;
  f.fault.retentionDeleteAllowed=true;await call(f,await host(t),'initialize-retention',retentionConfirm);
  f.objects.set('new-unexplained-object',Buffer.from('synthetic'));const writes=f.calls.filter(r=>['PUT','PATCH','DELETE'].includes(r.method)).length;
  await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),{code:'RETENTION_UNREFERENCED_OBJECT'});
  assert.equal(f.calls.filter(r=>['PUT','PATCH','DELETE'].includes(r.method)).length,writes);
  const dir=await host(t);await call(f,dir,'plan');
  // A locally retained old V2 manifest cannot replace the initialized root.
  const historic=f.locatorVersions.find(r=>r.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2').payload;
  await fs.writeFile(path.join(dir,'archive-manifest.json'),bytes({kind:'ADMIN_HISTORY_MANIFEST_V2',index:{path:historic.indexPath,sha256:historic.indexSha256,bytes:historic.indexBytes},indexRawBytes:historic.indexRawBytes,indexRawSha256:historic.indexRawSha256}));
  await assert.rejects(()=>call(f,dir,'publish-locator',publishConfirm),e=>['RETENTION_CANNOT_DOWNGRADE','CURRENT_DOCUMENT_CHANGED','TOP_FIVE_CHANGED'].includes(e.code));
});
test('retention: unknown DELETE is classified read-only, stops the pass, and resumes index-last without repeated deletion',async t=>{
  const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
  await call(f,await host(t),'initialize-retention',retentionConfirm);await drainRetention(t,f);
  appendDocumentVersions(f,30);await drainRetention(t,f);appendDocumentVersions(f,30);
  f.fault.r2DeleteUnknown=true;f.fault.r2DeleteOnlyGeneration=true;let failure=null;
  for(let pass=0;pass<20&&!failure;pass++)try{await call(f,await host(t),'maintain',maintainConfirm);}catch(e){failure=e;}
  assert.ok(failure,'normal retirement reached the injected unknown outcome');
  assert.equal(failure.code,'WRITE_OUTCOME_RESOLVED_STOPPED');assert.equal(failure.safeOperation.writeOutcome,'EXACT_ARCHIVE_ABSENT');
  assert.equal(failure.safeOperation.furtherWritesPerformed,false);
  const deleted=f.calls.filter(r=>r.method==='DELETE'&&new URL(r.url).hostname.endsWith('.r2.cloudflarestorage.com')).map(r=>r.url);
  const last=deleted.at(-1),count=deleted.filter(r=>r===last).length;
  await drainRetention(t,f);
  assert.equal(f.calls.filter(r=>r.method==='DELETE'&&r.url===last).length,count,'confirmed absent DELETE is never repeated');
});
test('retention: changed legacy identity, missing originals and ambiguous NEW document versions cannot gain any retirement or upload',async t=>{
  for(const fault of ['changed-row','missing-original','duplicate-new-version']){
    const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
    await call(f,await host(t),'initialize-retention',retentionConfirm);
    let code;
    if(fault==='changed-row'){f.rows.find(r=>r.document_key===P.keys[0]&&r.version===1).payload.text='changed';code='LEGACY_SOURCE_CHANGED';}
    if(fault==='missing-original'){f.objects.delete(retainedIndex(f).legacy.currents[0].object.path);code='LEGACY_OBJECT_MISSING';}
    if(fault==='duplicate-new-version'){
      appendDocumentVersions(f,14);const row=f.rows.find(r=>r.document_key===P.keys[0]&&r.version===9);
      f.rows.push({...clone(row),id:Math.max(...f.rows.map(r=>r.id))+1});code='RETENTION_DUPLICATE_DOCUMENT_VERSION';
    }
    const writes=f.calls.filter(r=>['PUT','PATCH','DELETE'].includes(r.method)).length;
    await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),{code});
    assert.equal(f.calls.filter(r=>['PUT','PATCH','DELETE'].includes(r.method)).length,writes,fault+' stops before mutation');
  }
});
test('retention recovery: own interrupted chunk or index upload resumes on a fresh pass after current has advanced',async t=>{
  for(const phase of ['chunk','index'])await t.test(phase,async()=>{
    const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
    await call(f,await host(t),'initialize-retention',retentionConfirm);await drainRetention(t,f);
    appendDocumentVersions(f,14);await drainRetention(t,f);appendDocumentVersions(f,12);
    f.fault.afterR2Put=(key,body)=>{if(JSON.parse(gunzipSync(body).toString('utf8').trimEnd()).kind===(phase==='chunk'?'ADMIN_HISTORY_REST_RESPONSE_V2':'ADMIN_HISTORY_GENERATION_V3')){
      f.fault.afterR2Put=null;throw Error('synthetic interrupted generation index upload');}};
    await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),{code:'WRITE_OUTCOME_RESOLVED_STOPPED'});
    appendDocumentVersions(f,1);
    const recovered=await call(f,await host(t),'maintain',maintainConfirm);
    assert.equal(recovered.preparedArchiveRecovered,true,phase);
    assert.equal(recovered.confirmedAbsentAfterWrite,0,'stale prepared archive cannot delete under old current/top5 guards');
    await drainRetention(t,f);
    for(const key of P.keys)assert.equal(f.rows.filter(r=>r.document_key===key).length,5);
  });
});
test('retention preparation: first intent, CAS and exact cleanup failures stop and recover without any orphan adoption',async t=>{
  for(const phase of ['pointer-before','pointer-after','intent-before','intent-after','cas-before','cas-after','intent-delete','pointer-delete'])await t.test(phase,async()=>{
    const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
    await call(f,await host(t),'initialize-retention',retentionConfirm);await drainRetention(t,f);
    appendDocumentVersions(f,14);await drainRetention(t,f);appendDocumentVersions(f,4);
    if(phase==='pointer-before')f.fault.preparedInsertBefore=true;
    if(phase==='pointer-after')f.fault.preparedInsertUnknown=true;
    if(phase==='intent-before')f.fault.preparationPutBefore=true;
    if(phase==='intent-after')f.fault.afterR2Put=(key,wire)=>{if(JSON.parse(gunzipSync(wire).toString('utf8')).kind==='ADMIN_HISTORY_PREPARATION_V1'){
      f.fault.afterR2Put=null;throw Error('synthetic committed preparation PUT unknown');}};
    if(phase==='cas-before')f.fault.beforeLocatorPatch=true;
    if(phase==='cas-after')f.fault.locatorPatchUnknown=true;
    if(phase==='intent-delete')f.fault.r2DeleteUnknown=true;
    if(phase==='pointer-delete')f.fault.preparedDeleteUnknown=true;
    const start=f.calls.length;
    await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),e=>['WRITE_OUTCOME_UNKNOWN','WRITE_OUTCOME_RESOLVED_STOPPED'].includes(e.code));
    const attempted=f.calls.slice(start),puts=attempted.filter(r=>r.method==='PUT');
    if(phase.startsWith('pointer-')&&phase!=='pointer-delete')assert.equal(puts.length,0,'unknown pointer outcome performs no R2 PUT');
    if(phase.startsWith('intent-')&&phase!=='intent-delete')assert.equal(puts.length,1,'unknown first intent PUT never reaches data PUT');
    appendDocumentVersions(f,1);const beforeNext=f.calls.length;
    const next=await call(f,await host(t),'maintain',maintainConfirm);
    if(['pointer-after','intent-before'].includes(phase)){
      assert.equal(next.preparedIntentAbsent,true);assert.equal(f.calls.slice(beforeNext).filter(r=>r.method==='PUT').length,0,'absence is classified on a fresh pass before any new attempt');
    }
    await drainRetention(t,f);assert.equal(f.preparations.length,0);
    for(const key of P.keys)assert.equal(f.rows.filter(r=>r.document_key===key).length,5);
    assert.ok(f.locatorVersions.every(r=>r.document_key!==P.preparedKey),'create-only scratch produces no historical versions');
  });
});
test('retention receipt: scratch-only cleanup never claims a locator write',async t=>{
  const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;f.fault.preparedDeleteBefore=true;
  await assert.rejects(async()=>call(f,await host(t),'initialize-retention',retentionConfirm),{code:'WRITE_OUTCOME_UNKNOWN'});
  const before=f.calls.length,locator=clone(f.locators[0]);
  const r=await call(f,await host(t),'maintain',maintainConfirm);
  assert.equal(r.preparedArchiveRecovered,true);assert.equal(r.preparationDocumentWritten,true);
  assert.equal(f.calls.slice(before).filter(c=>['POST','PATCH'].includes(c.method)&&new URL(c.url).searchParams.get('document_key')==='eq.'+P.locatorKey).length,0);
  assert.deepEqual(f.locators[0],locator);assert.equal(r.locatorDocumentWritten,false);
});
test('retention preparation: first timed-out metadata PUT may become durable after a later absent read',async t=>{
  const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
  await call(f,await host(t),'initialize-retention',retentionConfirm);await drainRetention(t,f);
  appendDocumentVersions(f,14);await drainRetention(t,f);appendDocumentVersions(f,4);
  f.fault.preparationPutDeferred=true;
  await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),{code:'WRITE_OUTCOME_UNKNOWN'});
  const pointer=clone(f.preparations[0]);assert.ok(pointer);assert.ok(!f.objects.has(pointer.payload.preparation.path));
  await call(f,await host(t),'maintain',maintainConfirm);
  assert.deepEqual(f.unresolvedPreparations[0].payload,pointer.payload);assert.equal(f.preparations.length,0);
  f.fault.completeDeferredPreparationPut();appendDocumentVersions(f,1);
  assert.ok(f.objects.has(pointer.payload.preparation.path),'the original request becomes durable only after the absent read');
  const current=clone(f.locators[0]),originals=sha(bytes(f.rows));
  const clean=await call(f,await host(t),'maintain',maintainConfirm);
  assert.equal(clean.unresolvedPreparationCleanupCompleted,true);assert.equal(clean.locatorDocumentWritten,false);
  assert.equal(clean.confirmedAbsentAfterWrite,0);assert.equal(sha(bytes(f.rows)),originals);assert.deepEqual(f.locators[0],current);
  assert.equal(f.preparations.length+f.unresolvedPreparations.length,0);assert.ok(!f.objects.has(pointer.payload.preparation.path));
  assert.equal(f.calls.filter(c=>c.method==='PUT'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length,1,'the one original request was never retried');
});
async function unresolvedFirstIntent(t,initializing=false){
  const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
  if(!initializing){await call(f,await host(t),'initialize-retention',retentionConfirm);await drainRetention(t,f);
    appendDocumentVersions(f,14);await drainRetention(t,f);appendDocumentVersions(f,4);}
  f.fault.preparationPutDeferred=true;
  await assert.rejects(async()=>call(f,await host(t),initializing?'initialize-retention':'maintain',initializing?retentionConfirm:maintainConfirm),{code:'WRITE_OUTCOME_UNKNOWN'});
  return{f,pointer:clone(f.preparations[0])};
}
test('retention unresolved: never-executed PUT stays reserved while a fresh unchanged selection proceeds and a second unknown is held',async t=>{
  const {f,pointer}=await unresolvedFirstIntent(t);const transfer=await call(f,await host(t),'maintain',maintainConfirm);
  assert.equal(transfer.unresolvedPreparationDocumentWritten,true);assert.ok(transfer.unresolvedPreparationPointerBytes<1024);
  assert.equal(f.preparations.length,0);assert.equal(f.unresolvedPreparations.length,1);
  const next=await call(f,await host(t),'maintain',maintainConfirm);
  assert.equal(next.locatorDocumentWritten,true);assert.ok(next.confirmedAbsentAfterWrite>0);
  assert.equal(f.locators[0].payload.indexSha256,pointer.payload.targetIndexSha256,'only the private preparation envelope changes, not the independently fresh index/original selection');
  assert.equal(next.unresolvedPreparationReservedBytes,pointer.payload.preparation.bytes);
  assert.ok(next.preparedReservationBytes>pointer.payload.preparation.bytes&&next.preparedReservationBytes<=8000000);
  assert.ok(next.retentionReservedBytes<=P.maximumBucketBytes);
  assert.ok(next.retentionReservedBytes>=[...f.objects.values()].reduce((n,b)=>n+b.length,0)+100000000+pointer.payload.preparation.bytes);
  assert.ok(!f.objects.has(pointer.payload.preparation.path));assert.equal(f.unresolvedPreparations.length,1);
  assert.equal(f.calls.filter(c=>c.method==='PUT'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length,1);
  await drainRetention(t,f);appendDocumentVersions(f,2);f.fault.preparationPutBefore=true;
  await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),{code:'WRITE_OUTCOME_UNKNOWN'});
  const writes=f.calls.length,second=clone(f.preparations[0]);
  await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),{code:'UNRESOLVED_PREPARATION_SLOT_HELD'});
  assert.deepEqual(f.unresolvedPreparations[0].payload,pointer.payload);assert.deepEqual(f.preparations[0],second);
  assert.equal(f.calls.slice(writes).filter(c=>['PUT','PATCH','DELETE'].includes(c.method)||c.method==='POST'&&new URL(c.url).origin===P.project).length,0);
});
test('retention unresolved: positive transfer survives unknown create/delete without overwriting the one reservation',async t=>{
  for(const phase of ['unresolvedInsertBefore','unresolvedInsertUnknown','preparedDeleteBefore','preparedDeleteUnknown'])await t.test(phase,async()=>{
    const {f,pointer}=await unresolvedFirstIntent(t);f.fault[phase]=true;
    await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),e=>['WRITE_OUTCOME_UNKNOWN','WRITE_OUTCOME_RESOLVED_STOPPED'].includes(e.code));
    assert.ok(f.preparations.length||f.unresolvedPreparations.length,'at least one positive pointer survives every unknown transfer');
    await call(f,await host(t),'maintain',maintainConfirm);
    assert.equal(f.preparations.length,0);assert.equal(f.unresolvedPreparations.length,1);
    assert.deepEqual(f.unresolvedPreparations[0].payload,pointer.payload);
    assert.equal(f.calls.filter(c=>c.method==='PUT'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length,1);
    assert.ok(!f.calls.some(c=>c.method==='PATCH'&&[P.preparedKey,P.unresolvedKey].some(k=>new URL(c.url).searchParams.get('document_key')==='eq.'+k)));
  });
});
test('retention unresolved: late metadata before a new INITIALIZE is never frozen as a legacy original',async t=>{
  for(const late of [false,true])await t.test(late?'late-before-freeze':'never-executed',async()=>{
    const {f,pointer}=await unresolvedFirstIntent(t,true);await call(f,await host(t),'maintain',maintainConfirm);
    if(late)f.fault.completeDeferredPreparationPut();
    f.objects.set('synthetic-unknown-legacy-preserved',Buffer.from('synthetic-original'));const originals=sha(bytes(f.rows));
    await call(f,await host(t),'initialize-retention',retentionConfirm);
    const index=JSON.parse(gunzipSync(f.objects.get('bundles/sha256/'+f.locators[0].payload.indexSha256+'.json.gz')));
    assert.ok(!index.legacy.objects.some(d=>d.path===pointer.payload.preparation.path),'exact positive reservation alone excludes this owned intent');
    assert.ok(index.legacy.objects.some(d=>d.path==='synthetic-unknown-legacy-preserved'));
    assert.equal(sha(bytes(f.rows)),originals,'initialization never deletes DB originals');
    if(late){const cleaned=await call(f,await host(t),'maintain',maintainConfirm);assert.equal(cleaned.unresolvedPreparationCleanupCompleted,true);
      assert.equal(f.unresolvedPreparations.length,0);assert.ok(!f.objects.has(pointer.payload.preparation.path));}
    else{await call(f,await host(t),'maintain',maintainConfirm);assert.equal(f.unresolvedPreparations.length,1);assert.ok(!f.objects.has(pointer.payload.preparation.path));}
    assert.deepEqual(f.objects.get('synthetic-unknown-legacy-preserved'),Buffer.from('synthetic-original'));
    assert.equal(f.calls.filter(c=>c.method==='PUT'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length,1);
  });
});
test('retention unresolved: durable cleanup witness survives runner gaps and unknown cleanup writes without repeated object deletion',async t=>{
  for(const phase of ['preparedInsertBefore','preparedInsertUnknown','r2DeleteUnknown','unresolvedDeleteBefore','unresolvedDeleteUnknown','preparedDeleteBefore','preparedDeleteUnknown'])await t.test(phase,async()=>{
    const {f,pointer}=await unresolvedFirstIntent(t);await call(f,await host(t),'maintain',maintainConfirm);
    f.fault.completeDeferredPreparationPut();f.fault[phase]=true;
    await assert.rejects(async()=>call(f,await host(t),'maintain',maintainConfirm),e=>['WRITE_OUTCOME_UNKNOWN','WRITE_OUTCOME_RESOLVED_STOPPED'].includes(e.code));
    const deleted=f.calls.filter(c=>c.method==='DELETE'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length;
    if(f.preparations.length)assert.equal(f.preparations[0].payload.kind,'ADMIN_HISTORY_PREPARATION_CLEANUP_V1');
    if(f.preparations.length||f.unresolvedPreparations.length){const r=await call(f,await host(t),'maintain',maintainConfirm);
      assert.equal(r.unresolvedPreparationCleanupCompleted,true);assert.equal(r.locatorDocumentWritten,false);assert.equal(r.confirmedAbsentAfterWrite,0);}
    assert.equal(f.preparations.length+f.unresolvedPreparations.length,0);assert.ok(!f.objects.has(pointer.payload.preparation.path));
    const after=f.calls.filter(c=>c.method==='DELETE'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length;
    assert.equal(after,deleted||1,'an already absent exact metadata object is never DELETEd again');
    assert.equal(f.calls.filter(c=>c.method==='PUT'&&new URL(c.url).pathname.endsWith('/'+pointer.payload.preparation.path)).length,1);
  });
});
test('retention metadata: compact pointers, bounded new locator history, exact positive expiry and unknown-outcome readback',async t=>{
  const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;
  const legacyPayloadBytes=bytes(f.locators[0].payload).length;
  const init=await call(f,await host(t),'initialize-retention',retentionConfirm);
  assert.ok(init.preparationPointerBytes>0&&init.preparationPointerBytes<1024);
  assert.ok(init.preparationMetadataBytes>0&&init.preparationMetadataBytes<=4_000_000);
  assert.equal(init.preparationMetadataObjectsDeleted,1);assert.equal(f.preparations.length,0);
  const legacyLocators=clone(f.locatorVersions.filter(r=>r.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2'));
  let expired=0;
  for(let round=0;round<12;round++){
    appendDocumentVersions(f,3);
    for(let pass=0;pass<10;pass++){
      const r=await call(f,await host(t),'maintain',maintainConfirm);expired+=r.locatorHistoryRowsExpired;
      if(r.remainingCandidates===0&&r.candidateRows===0&&!r.archiveObjectsDeleted)break;
    }
  }
  const newRows=f.locatorVersions.filter(r=>r.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V3');
  assert.ok(expired>0,'actual normal REST expiry occurred');assert.ok(newRows.length<=4,'unreferenced new audit rows do not accumulate');
  assert.deepEqual(f.locatorVersions.filter(r=>r.payload.kind==='ADMIN_HISTORY_ARCHIVE_LOCATOR_V2'),legacyLocators,'all V2/legacy audit rows remain byte-identical');
  assert.ok(newRows.every(r=>bytes(r.payload).length<1024));assert.ok(bytes(newRows).length<=4*4096);
  assert.equal(f.preparations.length,0);assert.ok(!f.calls.some(r=>r.method==='PATCH'&&new URL(r.url).searchParams.get('document_key')==='eq.'+P.preparedKey));
  console.log(JSON.stringify({kind:'ADMIN_HISTORY_METADATA_BYTE_BOUNDS',fixtureOnly:true,legacyLocatorPayloadBytes:legacyPayloadBytes,
    v3LocatorPayloadBytes:bytes(f.locators[0].payload).length,preparationPointerBytes:init.preparationPointerBytes,
    privatePreparationBytes:init.preparationMetadataBytes,newLocatorHistoryRows:newRows.length,newLocatorHistoryWireBytes:bytes(newRows).length,
    scratchHistoryRows:0,locatorUpdatesPerNewGeneration:1,actualNanoMemoryMeasured:false}));
  f.fault.locatorExpiryUnknown=true;let failure=null;
  for(let round=0;round<5&&!failure;round++){
    appendDocumentVersions(f,3);
    for(let pass=0;pass<5&&!failure;pass++)try{await call(f,await host(t),'maintain',maintainConfirm);}catch(e){failure=e;}
  }
  assert.ok(failure);assert.equal(failure.code,'WRITE_OUTCOME_RESOLVED_STOPPED');assert.equal(failure.safeOperation.writeOutcome,'EXACT_LOCATOR_HISTORY_ABSENT');
  const deletion=f.calls.filter(r=>r.method==='DELETE'&&new URL(r.url).searchParams.get('document_key')==='eq.'+P.locatorKey).at(-1);
  const count=f.calls.filter(r=>r.method==='DELETE'&&r.url===deletion.url).length;await drainRetention(t,f);
  assert.equal(f.calls.filter(r=>r.method==='DELETE'&&r.url===deletion.url).length,count,'confirmed absent V3 metadata DELETE is never repeated');
});
test('retention preparation: exact existing RLS and DELETE access dominate the new fixed key before any pointer or private upload',async t=>{
  for(const bad of ['privacy','historyPrivacy','preparedAcl']){
    const {f}=await prepared(t);f.fault.retentionDeleteAllowed=true;f.fault[bad]=true;
    const writes=f.calls.filter(r=>['PUT','PATCH','DELETE'].includes(r.method)||r.method==='POST'&&new URL(r.url).origin===P.project).length;
    await assert.rejects(async()=>call(f,await host(t),'initialize-retention',retentionConfirm));
    assert.equal(f.calls.filter(r=>['PUT','PATCH','DELETE'].includes(r.method)||r.method==='POST'&&new URL(r.url).origin===P.project).length,writes);
    assert.equal(f.preparations.length,0);
  }
});
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
