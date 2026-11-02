import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
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
      return json([{current_access:!fault.acl,history_access:!fault.acl,metadata,version_metadata}]);
    }
    if(u.origin===P.project){
      const q=u.searchParams,key=q.get('document_key')?.slice(3);
      if(u.pathname==='/rest/v1/admin_documents'&&method==='POST'){
        const body=JSON.parse(options.body);assert.equal(body.document_key,P.locatorKey);assert.equal(body.updated_by,null);
        if(locators.length)return json([]);locators.push({document_key:P.locatorKey,payload:clone(body.payload),version:1});return json(clone(locators),201);
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
    if(!authenticated)return new Response(null,{status:fault.public?200:403});
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
