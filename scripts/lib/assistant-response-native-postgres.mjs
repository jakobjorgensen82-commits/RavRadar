// Native RESPONSE AFTER only: same normal owned cluster, after genuine220 and statistics230.
// No CLI, network endpoint, cluster creation, package installation or runtime admission.
import assert from 'node:assert/strict';import crypto from 'node:crypto';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {execFile} from 'node:child_process';
import {assertIssuedCurrentGridFixture} from './current-grid-issued-native-fixture.mjs';
import {requireAssistantResponseBinding,readAssistantResponseCanonicalSource,
 ASSISTANT_RESPONSE_SOURCE_PINS,RESPONSE_PROJECTION,RESPONSE_REPLACEMENTS}
 from './assistant-response-successor-source.mjs';
import {kbDefinition} from './assistant-knowledge-successor-source.mjs';
import {statisticsPreferenceRevisionCatalogQuery,verifyStatisticsPreferenceRevisionCatalogMetadata}
 from '../verify-account-assistant-schema.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const CP='ravradar_ravscore_checkpoint_',KEY='ravscore-continuation-checkpoint';
const OLD={I:'994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399',
 C:'d192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9',
 T:'0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a'};
const body=s=>s.slice(s.indexOf('as $$')+5,s.lastIndexOf('$$;')).trim();
const exec=(file,args,input,env)=>new Promise(resolve=>{const child=execFile(file,args,
 {env,timeout:70000,maxBuffer:2*1024*1024},(error,stdout,stderr)=>{
  const code=/\b(?:ERROR|FATAL):[ \t]+([A-Z0-9]{5})(?:\s|$)/.exec(String(stderr??''));
  resolve({code:error?(error.code??'UNKNOWN'):0,signal:error?.signal??null,stdout:String(stdout??''),sqlstate:code?.[1]??null});});
 child.stdin?.on('error',()=>{});child.stdin?.end(input);});
const withoutReceipts=value=>{const copy=structuredClone(value);delete copy.generationSha256;
 delete copy.stateSha256;delete copy.candidateGRollbackCompanion.generationSha256;return copy;};
export async function runNativeAssistantResponseSuccessor({repositoryRoot,clusterDirectory,psqlExecutable,
 sourceDocumentAt,atHour,saveCheckpoint,issued220}={}){
 const next=requireAssistantResponseBinding();assert(ASSISTANT_RESPONSE_SOURCE_PINS);
 assert.equal(process.platform,'linux','NATIVE_RESPONSE_POSTGRES_UNAVAILABLE');
 assertIssuedCurrentGridFixture(issued220);
 assert.equal(await fs.realpath(repositoryRoot),await fs.realpath(ROOT));
 for(const fn of [sourceDocumentAt,atHour,saveCheckpoint])assert.equal(typeof fn,'function');
 const root=await fs.realpath(clusterDirectory),temp=await fs.realpath(os.tmpdir());
 assert.equal(root,path.resolve(clusterDirectory));assert.equal(path.dirname(root),temp);
 assert(path.basename(root).startsWith('rr-checkpoint-pg-'));
 const rootStat=await fs.lstat(root,{bigint:true});assert(rootStat.isDirectory()&&!rootStat.isSymbolicLink()&&rootStat.ino>0n);
 assert.equal(rootStat.uid,BigInt(process.getuid()));
 const data=path.join(root,'database'),socket=path.join(root,'socket');
 assert.equal(await fs.realpath(data),data);assert.equal(await fs.realpath(socket),socket);
 assert(path.isAbsolute(psqlExecutable)&&path.basename(psqlExecutable)==='psql');
 assert((await fs.stat(await fs.realpath(psqlExecutable))).isFile());
 const env={PATH:process.env.PATH,LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC',
  PGHOST:socket,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'rr_native_test',
  PGPASSFILE:path.join(root,'absent-password-file'),PGSSLMODE:'disable'};
 const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-v','VERBOSITY=sqlstate','-h',socket,'-p','5432','-U','rr_native_test','-d','postgres'];
 const readOwner=async()=>{const pid=Number((await fs.readFile(path.join(data,'postmaster.pid'),'utf8')).split('\n')[0]);
  assert(Number.isSafeInteger(pid)&&pid>1);const argv=(await fs.readFile('/proc/'+pid+'/cmdline','utf8')).split('\0');assert(argv.includes(data));
  const raw=await fs.readFile('/proc/'+pid+'/stat','utf8');const birth=raw.slice(raw.lastIndexOf(')')+2).split(' ')[19];assert(birth);return {pid,birth};};
 const owner=await readOwner();
 const run=async text=>{assertIssuedCurrentGridFixture(issued220);assert.deepEqual(await readOwner(),owner);
  const result=await exec(psqlExecutable,args,text,env);assert.equal(result.signal,null,'Native SQL timeout is not a negative-case success');
  assert.deepEqual(await readOwner(),owner);assertIssuedCurrentGridFixture(issued220);return result;};
 const sql=async text=>{const r=await run(text);assert.equal(r.code,0,'NATIVE_RESPONSE_SQL_COMMAND_FAILED');return r.stdout.trim();};
 const json=async text=>JSON.parse(await sql(text));
 const host=await json("select jsonb_build_object('data',current_setting('data_directory'),'tcp',current_setting('listen_addresses'),'user',current_user,'database',current_database(),'version',current_setting('server_version_num')::integer,'address',inet_server_addr());");
 assert.deepEqual({...host,version:undefined},{data,tcp:'',user:'rr_native_test',database:'postgres',version:undefined,address:null});assert(host.version>=160000);
 const binaryVersion=await exec(psqlExecutable,['--version'],'',env);assert.equal(binaryVersion.code,0);
 assert.equal(Number(binaryVersion.stdout.match(/\b(\d+)\.\d+/)?.[1]),Math.floor(host.version/10000));
 const source=await readAssistantResponseCanonicalSource();
 const filename=path.join(ROOT,'supabase/migrations',source.migration.filename),st=await fs.lstat(filename);
 assert(st.isFile()&&!st.isSymbolicLink());const migration=await fs.readFile(filename,'utf8');
 assert.equal(sha(migration),ASSISTANT_RESPONSE_SOURCE_PINS.migrationSha256);
 assert.equal(await sql('select max(version::text) from supabase_migrations.schema_migrations;'),'20261013230000');
 const catalog=async()=>verifyStatisticsPreferenceRevisionCatalogMetadata(await json(statisticsPreferenceRevisionCatalogQuery));
 const beforeCatalog=await catalog();assert.equal(beforeCatalog.schemaVersion,2);assert.equal(beforeCatalog.accountRowsRead,false);
 const rows=()=>sql("select md5(jsonb_build_object('checkpoint',(select jsonb_agg(to_jsonb(d) order by document_key) from public.admin_documents d),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p),'activity',(select jsonb_agg(to_jsonb(a) order by user_id) from public.account_activity_journal a),'preferences',(select jsonb_agg(to_jsonb(p) order by user_id) from public.account_statistics_preferences p),'nativeOriginals',(select jsonb_agg(to_jsonb(n) order by name) from public.native_checkpoint_payloads n))::text);");
 const beforeRows=await rows();const cas='public.'+CP+'cas(bigint,timestamptz,jsonb)';
 const accounts=()=>sql("select md5(jsonb_build_object('profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p),'activity',(select jsonb_agg(to_jsonb(a) order by user_id) from public.account_activity_journal a),'preferences',(select jsonb_agg(to_jsonb(p) order by user_id) from public.account_statistics_preferences p))::text);");
 const originals=()=>sql("select md5(jsonb_agg(jsonb_build_array(name,payload) order by name)::text) from public.native_checkpoint_payloads where name not like 'rsp-%';");
 const accountsBefore=await accounts(),originalsBefore=await originals();
 const properties=()=>sql("select md5(row(p.oid,p.proowner,p.prosrc,p.prosecdef,p.proconfig,p.proacl)::text) from pg_proc p where p.oid='"+cas+"'::regprocedure;");
 const beforeCas=await properties();
 const drifts=[
  ["insert into supabase_migrations.schema_migrations values('20261014140000');","delete from supabase_migrations.schema_migrations where version='20261014140000';"],
  ['alter table public.account_statistics_preferences alter column revision drop not null;','alter table public.account_statistics_preferences alter column revision set not null;'],
  ["delete from supabase_migrations.schema_migrations where version='20261013230000';","insert into supabase_migrations.schema_migrations values('20261013230000');"],
  ['alter function '+cas+' security invoker;','alter function '+cas+' security definer;'],
  ['alter function '+cas+' set search_path=public;','alter function '+cas+' set search_path=pg_catalog,public;'],
  ["alter function "+cas+" set statement_timeout='54s';","alter function "+cas+" set statement_timeout='55s';"],
  ['revoke execute on function '+cas+' from service_role;','grant execute on function '+cas+' to service_role;'],
  ['grant execute on function '+cas+' to anon;','revoke execute on function '+cas+' from anon;'],
  ['grant execute on function '+cas+' to authenticated;','revoke execute on function '+cas+' from authenticated;'],
 ];
 for(const [drift,restore] of drifts){await sql(drift);const failed=await run(migration);assert.notEqual(failed.code,0);
  assert.equal(failed.sqlstate,'P0001','Actual whole BEFORE guard must reject, not syntax/transport');
  assert.equal(await sql("select to_regprocedure('public."+RESPONSE_PROJECTION+"(jsonb,timestamptz)') is null;"),'t');
  await sql(restore);assert.equal(await properties(),beforeCas);assert.equal(await rows(),beforeRows);
  assert.deepEqual(await catalog(),beforeCatalog);
 }
 await sql(migration);assert.equal(await rows(),beforeRows,'Response metadata migration must not alter ANY original/account fixture row');
 await sql("insert into supabase_migrations.schema_migrations values('"+next.version+"');");
 const repeated=await run(migration);assert.notEqual(repeated.code,0);assert.equal(repeated.sqlstate,'P0001');
 assert.equal(await sql("select current_setting('statement_timeout')||'/'||current_setting('lock_timeout');"),'0/0');
 assert.deepEqual(await catalog(),beforeCatalog);
 const names=[RESPONSE_PROJECTION,...RESPONSE_REPLACEMENTS];
 const definitionPins=await json("select jsonb_object_agg(proname,encode(extensions.digest(convert_to(btrim(prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex')) from pg_proc where pronamespace='public'::regnamespace and proname in ("+names.map(n=>"'"+n+"'").join(',')+");");
 assert.deepEqual(definitionPins,Object.fromEntries(names.map(n=>[n,sha(body(kbDefinition(source.canonicalSource,n)))])));
 const acl=await json("select jsonb_build_object('definer',p.prosecdef,'path','search_path=pg_catalog, public'=any(p.proconfig),'timeout','statement_timeout=55s'=any(p.proconfig),'service',has_function_privilege('service_role',p.oid,'execute'),'anon',has_function_privilege('anon',p.oid,'execute'),'auth',has_function_privilege('authenticated',p.oid,'execute')) from pg_proc p where p.oid='"+cas+"'::regprocedure;");
 assert.deepEqual(acl,{definer:true,path:true,timeout:true,service:true,anon:false,auth:false});
 const put=async(name,payload)=>{assert.match(name,/^rsp-[a-z0-9-]+$/);const value=JSON.stringify(payload);assert(!value.includes('$rsp_native$'));
  await sql("insert into public.native_checkpoint_payloads values('"+name+"',$rsp_native$"+value+"$rsp_native$::jsonb);");};
 const snapshots=[];
 async function make(prefix,hour,options,constructors,tuple){
  const sourcePath=path.join(root,prefix+'-source.json'),checkpointPath=path.join(root,prefix+'-checkpoint.json');
  const document=constructors.sourceDocumentAt(hour,'rr-native-rsp-'+hour,options);
  await fs.writeFile(sourcePath,JSON.stringify(document),{flag:'wx'});
  const original=await fs.readFile(sourcePath);await constructors.saveCheckpoint({sourcePath,checkpointPath});
  assert.deepEqual(await fs.readFile(sourcePath),original);const checkpoint=await fs.readFile(checkpointPath);
  snapshots.push({sourcePath,checkpointPath,sourceSha:sha(original),checkpointSha:sha(checkpoint)});
  const payload=JSON.parse(checkpoint);assert.equal(payload.modelBinding.modelBundleSha256,tuple.I);
  assert.equal(payload.candidateGRollbackCompanion.modelBinding.modelBundleSha256,tuple.C);
  assert.equal(payload.continuationStateContractSha256,tuple.T);assert.equal(payload.partCount,673);
  assert.equal(Object.keys(payload.states).length,673);assert.equal(Object.keys(payload.candidateGRollbackCompanion.states).length,673);
  assert.equal(payload.productionReferenceAt,atHour(hour));await put(prefix,payload);return payload;
 }
 const old=await make('rsp-issued-current',49,{},issued220,OLD);
 const current=await make('rsp-current',49,{}, {sourceDocumentAt,saveCheckpoint},next);
 const future=await make('rsp-future',50,{}, {sourceDocumentAt,saveCheckpoint},next);
 const changed=await make('rsp-changed',49,{candidateCurrentSpeedMps:0.18},{sourceDocumentAt,saveCheckpoint},next);
 const projected=await json("select public."+RESPONSE_PROJECTION+"((select payload from native_checkpoint_payloads where name='rsp-issued-current'),'"+atHour(49)+"');");
 assert.deepEqual(withoutReceipts(projected),withoutReceipts(current),'Whole genuine issued220 to normal KB673 output; only existing three receipt exclusions');
 assert.equal(await sql("select public."+CP+"payload_valid((select payload from native_checkpoint_payloads where name='rsp-current'),'"+atHour(49)+"');"),'t');
 assert.equal(await sql("select public."+CP+"payload_valid((select payload from native_checkpoint_payloads where name='rsp-changed'),'"+atHour(49)+"');"),'t');
 assert.notDeepEqual(withoutReceipts(changed),withoutReceipts(current));
 const cases=[['same-old','rsp-issued-current','rsp-current',1,null,'updated',2],
  ['idempotent-before-version','rsp-current','rsp-current',999,null,'unchanged',1],
  ['changed-old','rsp-issued-current','rsp-changed',1,'23505',null,1],
  ['changed-current','rsp-current','rsp-changed',1,'23505',null,1],
  ['wrong-version','rsp-issued-current','rsp-current',0,'40001',null,1],
  ['newer','rsp-current','rsp-future',1,null,'updated',2],
  ['older','rsp-future','rsp-current',1,'22023',null,1],
  ['role','rsp-current','rsp-current',1,'42501',null,1,'service_role','anon'],
  ['acl','rsp-current','rsp-current',1,'42501',null,1,'anon','anon']];
 for(const [name,mutate,code] of [
  ['receipts',p=>{p.generationSha256=sha('rsp-generation');p.candidateGRollbackCompanion.generationSha256=p.generationSha256;p.stateSha256=sha('rsp-state');},null],
  ['candidate-receipt',p=>{p.candidateGRollbackCompanion.stateSha256=sha('rsp-candidate');},'23505'],
  ['candidate-history',p=>{p.candidateGRollbackCompanion.states=structuredClone(changed.candidateGRollbackCompanion.states);},'23505'],
  ['unpaired',p=>{p.generationSha256=sha('rsp-unpaired');},'22023'],
  ['mixed-family',p=>{Object.values(p.states)[0].modelBundleSha256=OLD.I;},'22023'],
 ]){const p=structuredClone(current);mutate(p);await put('rsp-'+name,p);cases.push([name,'rsp-issued-current','rsp-'+name,1,code,code===null?'updated':null,code===null?2:1]);}
 const reports=[];
 for(const [name,central,incoming,version,code,disposition,storedVersion,role='service_role',claim=role] of cases){
  const reset="truncate public.admin_documents;insert into public.admin_documents(document_key,payload,version,updated_by) select '"+KEY+"',payload,1,'00000000-0000-0000-0000-000000000001' from public.native_checkpoint_payloads where name='"+central+"';";
  const observed=await json(reset+"set statement_timeout='55s';do $$ begin perform set_config('request.jwt.claim.role','"+claim+"',false);end $$;set role "+role+";select public.native_checkpoint_attempt(false,"+version+",(select payload from native_checkpoint_payloads where name='"+incoming+"'));");
  assert.equal(observed.sqlstate,code,name);assert.equal(observed.stored?.version,storedVersion,name);
  if(disposition){assert.equal(observed.result.disposition,disposition);assert.equal(observed.result.centralVersion,storedVersion);}
  if(code||disposition==='unchanged'){const {storedPayloadMatchesIncoming,...stored}=observed.stored;
   assert.deepEqual(stored,observed.previous,'Whole refusal/unchanged preserves original owner/reference/payload/version');assert.equal(stored.ownerIsNull,false);
  }else{assert.equal(observed.stored.storedPayloadMatchesIncoming,true);assert.equal(observed.stored.ownerIsNull,true);}
  reports.push({case:name,sqlstate:code,disposition,storedVersion});
 }
 for(const family of ['ffc','249','c1ac'])assert.equal(await sql('select public.'+CP+'grid_'+family+"_payload_valid((select payload from native_checkpoint_payloads where name='original-"+family+"'),'"+atHour(49)+"');"),'t');
 for(const p of snapshots){assert.equal(sha(await fs.readFile(p.sourcePath)),p.sourceSha);assert.equal(sha(await fs.readFile(p.checkpointPath)),p.checkpointSha);}
 assert.equal(await accounts(),accountsBefore);assert.equal(await originals(),originalsBefore);
 assert.deepEqual(await catalog(),beforeCatalog);assertIssuedCurrentGridFixture(issued220);assert.deepEqual(await readOwner(),owner);
 assert.deepEqual([...(s=>[s.dev,s.ino,s.birthtimeNs])(await fs.lstat(root,{bigint:true}))],[rootStat.dev,rootStat.ino,rootStat.birthtimeNs]);
 return {kind:'NATIVE_ASSISTANT_RESPONSE_SUCCESSOR',wholeMigrationExecuted:true,
  sourceSha256:sha(migration),partCount:673,genuineIssued220:issued220.sourceReceipt,
  wholeMetadataProjectionEqual:true,originalSourceFilesPreserved:true,beforeGuardCases:drifts.length,
  schema2Preserved:true,postgresMajorVersion:Math.floor(host.version/10000),reports,
  productionInstalled:false,privateProductionRowsRead:false};
}
