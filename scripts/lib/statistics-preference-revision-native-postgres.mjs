// PRIVATE UNEXECUTED native case adapter. No CLI, cluster creation, migration
// destination, installer, production client, runtime install or 673 fixture copy.
// Future normal call: after compareCurrentGridSuccessor(), while the
// existing checkpoint-native helper still owns its genuine isolated cluster.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {statisticsPreferenceRevisionCatalogQuery,verifyStatisticsPreferenceRevisionCatalogMetadata}
 from '../verify-account-assistant-schema.mjs';
import {buildStatisticsPreferenceRevision,STATISTICS_REVISION_MIGRATION,STATISTICS_REVISION_PREDECESSOR}
 from '../build-statistics-preference-revision.mjs';

const HEAD='044d3045fecc2e70d6f35f60010921c6bd597ecc';
const TREE='4c56c3b73633bf3a5e1540e4f53e75be49f0b9da';
const V2_SHA='6c7d5adcfc8f9922f61b149d20d060f73871525af2a6ef36ab65842ab21784a5';
const SQL_SHA='687532cc1d4998b2f5ec404d99a315234383bea73744614d49df369a61c99458';
const PINS={
 '20261010130000_owner_export_origin_bound_successor.sql':'55f01dd535553ad5df708ec70de8d58d177299f3348d18a2355a188bfb4f8cb6',
 '20261012200000_checkpoint_cas_single_projection_successor.sql':'b03605272397585a3e6ad248398ba7bc6d88af506837f76c88a9a92955b48c18',
 '20261013210000_account_assistant_original_bound_successor.sql':'80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d',
};
const A='00000000-0000-0000-0000-000000000004';
const B='00000000-0000-0000-0000-000000000005';
const MISSING='00000000-0000-0000-0000-000000000006';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const execute=(file,args,{input='',env,timeout=15000}={})=>new Promise(resolve=>{
 const child=execFile(file,args,{env,timeout,maxBuffer:2*1024*1024},(error,stdout)=>
  resolve({code:error?(error.code??'NATIVE_EXEC_UNKNOWN'):0,signal:error?.signal??null,stdout:String(stdout??'')}));
 child.stdin?.on('error',()=>{}); child.stdin?.end(input);
});
function bodyOf(source,name){
 const marker=new RegExp('^create(?: or replace)? function public\\.'+name+'\\(','gm');
 const matches=[...source.matchAll(marker)]; assert.equal(matches.length,1);
 const start=matches[0].index,end=source.indexOf('\n$$;',start); assert(end>start);
 const definition=source.slice(start,end+4),body=definition.slice(definition.indexOf('as $$')+5,definition.lastIndexOf('$$;')).trim();
 assert(definition.includes('as $$')); return body;
}
const PROBE=String.raw`
create function public.native_statistics_attempt(operation text,wanted boolean,expected bigint)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare answer jsonb; failure text;
begin
 begin
  case operation
   when 'get' then answer:=public.get_own_statistics_preference();
   when 'set' then answer:=public.set_own_statistics_preference(wanted,expected);
   when 'legacy-on' then answer:=public.enable_own_statistics_preference();
   when 'legacy-off' then answer:=public.disable_own_statistics_preference();
   when 'table-read' then select jsonb_build_object('rows',count(*)) into answer from public.account_statistics_preferences;
   when 'table-insert' then insert into public.account_statistics_preferences(user_id,enabled,revision) values(auth.uid(),true,0);
   else raise exception 'NATIVE_OPERATION_UNKNOWN' using errcode='22023';
  end case;
 exception when others then get stacked diagnostics failure=returned_sqlstate;
 end;
 return jsonb_build_object('sqlstate',failure,'result',answer);
end;
$$;
revoke all on function public.native_statistics_attempt(text,boolean,bigint) from public;
grant execute on function public.native_statistics_attempt(text,boolean,bigint) to authenticated,anon,service_role;
`;

// Params are an internal normal-host seam, never a boolean proof or a callback
// executor. This adapter independently checks real processes/server/SQL output.
export async function runNativeStatisticsRevisionProposal({repositoryRoot,clusterDirectory,psqlExecutable}={}){
 assert.equal(process.platform,'linux','NATIVE_STATISTICS_POSTGRES_UNAVAILABLE');
 const root=await fs.realpath(clusterDirectory),temporary=await fs.realpath(os.tmpdir());
 assert.equal(path.dirname(root),temporary); assert(path.basename(root).startsWith('rr-checkpoint-pg-'));
 assert.equal(root,path.resolve(clusterDirectory));
 const directoryStat=await fs.lstat(root,{bigint:true});
 assert(directoryStat.isDirectory()&&!directoryStat.isSymbolicLink()&&directoryStat.ino>0n);
 assert.equal(directoryStat.uid,BigInt(process.getuid()));
 const data=path.join(root,'database'),socket=path.join(root,'socket');
 assert.equal(await fs.realpath(data),data); assert.equal(await fs.realpath(socket),socket);
 assert.equal(path.basename(psqlExecutable),'psql'); assert(path.isAbsolute(psqlExecutable));
 const binary=await fs.stat(await fs.realpath(psqlExecutable)); assert(binary.isFile());
 const env={PATH:process.env.PATH,LANG:'C.UTF-8',LC_ALL:'C.UTF-8',TZ:'UTC',
  PGHOST:socket,PGPORT:'5432',PGDATABASE:'postgres',PGUSER:'rr_native_test',
  PGPASSFILE:path.join(root,'absent-password-file'),PGSSLMODE:'disable'};
 const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h',socket,'-p','5432','-U','rr_native_test','-d','postgres'];
 const readOwner=async()=>{
  const pid=Number((await fs.readFile(path.join(data,'postmaster.pid'),'utf8')).split('\n')[0]);
  assert(Number.isSafeInteger(pid)&&pid>1);
  const argv=(await fs.readFile('/proc/'+pid+'/cmdline','utf8')).split('\0'); assert(argv.includes(data));
  const proc=(await fs.readFile('/proc/'+pid+'/stat','utf8')); const fields=proc.slice(proc.lastIndexOf(')')+2).split(' ');
  assert(fields[19]); return {pid,birth:fields[19]};
 };
 const owner=await readOwner();
 const sql=async(input)=>{
  assert.deepEqual(await readOwner(),owner);
  const result=await execute(psqlExecutable,args,{input,env});
  assert.equal(result.code,0,'NATIVE_STATISTICS_SQL_COMMAND_FAILED'); assert.equal(result.signal,null);
  assert.deepEqual(await readOwner(),owner); return result.stdout.trim();
 };
 const json=async(input)=>JSON.parse(await sql(input));
 const host=await json("select jsonb_build_object('data',current_setting('data_directory'),'tcp',current_setting('listen_addresses'),'user',current_user,'database',current_database(),'version',current_setting('server_version_num')::integer,'pid',pg_backend_pid(),'address',inet_server_addr());");
 assert.equal(host.data,data); assert.equal(host.tcp,''); assert.equal(host.user,'rr_native_test');
 assert.equal(host.database,'postgres'); assert.equal(host.address,null); assert(host.version>=160000);
 // Actual backend process must be a child of the held actual postmaster.
 // The one-shot host backend exits on psql close, so use the live held A below
 // for the process relationship; it is not inferred from the returned PID.
 const version=await execute(psqlExecutable,['--version'],{env});
 assert.equal(version.code,0); assert.equal(Number(version.stdout.match(/\b(\d+)\.\d+/)?.[1]),Math.floor(host.version/10000));
 const git=async(query)=>{const result=await execute('git',['-C',repositoryRoot,...query],{env});assert.equal(result.code,0);return result.stdout;};
 assert.equal((await git(['rev-parse',HEAD+'^{tree}'])).trim(),TREE);
 const sources={};
 for(const [name,pin] of Object.entries(PINS)){
  const source=await git(['show',HEAD+':supabase/migrations/'+name]); assert.equal(hash(source),pin); sources[name]=source;
 }
 const baseline=sources['20261013210000_account_assistant_original_bound_successor.sql'];
 const built=await buildStatisticsPreferenceRevision({migrationsDirectory:path.join(repositoryRoot,'supabase/migrations')});
 const {revisionSource:sqlProposal,migration}=built;
 assert.equal(hash(sqlProposal),SQL_SHA);
 const migrationFile=path.join(repositoryRoot,'supabase/migrations',STATISTICS_REVISION_MIGRATION.filename);
 const migrationStat=await fs.lstat(migrationFile);assert(migrationStat.isFile()&&!migrationStat.isSymbolicLink());
 assert.deepEqual(await fs.readFile(migrationFile),Buffer.from(migration));
 assert(sqlProposal.startsWith("begin;\nset local statement_timeout = '55s';\nset local lock_timeout = '5s';\n"));
 assert(sqlProposal.endsWith('commit;\n'));
 const originalNames=['get_own_statistics_preference','enable_own_statistics_preference','disable_own_statistics_preference'];
 const properties=async(name,signature)=>json("select jsonb_build_object('definer',p.prosecdef,'config',p.proconfig,'body',encode(extensions.digest(convert_to(btrim(p.prosrc,E' \\r\\n\\t'),'UTF8'),'sha256'),'hex'),'public',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE'),'anon',has_function_privilege('anon',p.oid,'execute'),'auth',has_function_privilege('authenticated',p.oid,'execute'),'service',has_function_privilege('service_role',p.oid,'execute')) from pg_proc p where p.oid=to_regprocedure('public."+name+'('+signature+")');");
 for(const name of originalNames){const p=await properties(name,'');assert.deepEqual(p,{definer:true,config:['search_path=""'],body:hash(bodyOf(baseline,name)),public:false,anon:false,auth:true,service:false});}
 assert.equal(await sql("select to_regprocedure('public.set_own_statistics_preference(boolean,bigint)') is null and to_regprocedure('public.native_statistics_attempt(text,boolean,bigint)') is null;"),'t');
 assert.deepEqual(await json("select jsonb_agg(attname order by attnum) from pg_attribute where attrelid='public.account_statistics_preferences'::regclass and attnum>0 and not attisdropped;"),['user_id','enabled']);
 assert.equal(await sql("select relrowsecurity and not relforcerowsecurity from pg_class where oid='public.account_statistics_preferences'::regclass;"),'t');
 const digest=(table,columns='to_jsonb(t)')=>sql("select md5(coalesce(jsonb_agg("+columns+" order by t.user_id),'[]'::jsonb)::text) from public."+table+' t;');
 assert.equal(await sql("select max(version::text) from supabase_migrations.schema_migrations;"),STATISTICS_REVISION_PREDECESSOR,'Actual current220 phase must precede statistics230');
 const oldValues=await digest('account_statistics_preferences',"jsonb_build_array(t.user_id,t.enabled)");
 const falseCount=await sql('select count(*) from public.account_statistics_preferences where not enabled;'); assert(Number(falseCount)>0,'Normal213 fixture must contain a retained explicit OFF');
 const journalBefore=await digest('account_activity_journal');
 const casBefore=await sql("select md5(row(p.prosrc,p.prosecdef,p.proconfig,p.proacl)::text) from pg_proc p where p.oid='public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure and 'statement_timeout=55s'=any(p.proconfig);"); assert(casBefore);
 await sql(migration); // Whole named append-only source, including actual BEFORE/AFTER catalog guards.
 await sql("insert into supabase_migrations.schema_migrations(version) values('"+STATISTICS_REVISION_MIGRATION.version+"');");
 const repeated=await execute(psqlExecutable,args,{input:migration,env});
 assert.notEqual(repeated.code,0,'Already installed revision must not replay');
 assert.deepEqual(await readOwner(),owner);
 // The revision phase uses ONLY schema2 after its actual SQL completes.
 const revisionCatalogMetadata=JSON.parse(await sql(statisticsPreferenceRevisionCatalogQuery));
 const revisionCatalogReceipt=await verifyStatisticsPreferenceRevisionCatalogMetadata(revisionCatalogMetadata);
 assert.equal(revisionCatalogReceipt.schemaVersion,2);
 assert.equal(revisionCatalogReceipt.status,'ACCOUNT_STATISTICS_REVISION_SCHEMA_MATCH');
 assert.equal(revisionCatalogReceipt.accountRowsRead,false);
 assert.equal(await sql("select current_setting('statement_timeout')||'/'||current_setting('lock_timeout');"),'0/0');
 assert.equal(await digest('account_statistics_preferences',"jsonb_build_array(t.user_id,t.enabled)"),oldValues);
 assert.equal(await sql('select count(*) from public.account_statistics_preferences where revision<>0;'),'0');
 for(const [name,signature] of [...originalNames.map(name=>[name,'']),['set_own_statistics_preference','boolean,bigint']]){
  const p=await properties(name,signature);assert.deepEqual(p,{definer:true,config:['search_path=""'],body:hash(bodyOf(sqlProposal,name)),public:false,anon:false,auth:true,service:false});
 }
 await sql("insert into public.profiles(id) values('"+A+"'),('"+B+"');"+PROBE);
 const profileBefore=await sql("select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb)::text) from public.profiles p;");
 const session=(uid,operation,wanted=null,expected=null,role='authenticated',claim=role)=>{
  assert(['',A,B,MISSING].includes(uid)); assert(['authenticated','anon','service_role'].includes(role)&&['authenticated','anon','service_role'].includes(claim));
  assert(['get','set','legacy-on','legacy-off','table-read','table-insert'].includes(operation));
  assert(wanted===null||typeof wanted==='boolean'); assert(expected===null||/^-?[0-9]+$/.test(expected));
  return "begin; set local statement_timeout='8s'; set local lock_timeout='6s'; do $$ begin perform set_config('request.jwt.claim.sub','"+uid+"',true); perform set_config('request.jwt.claim.role','"+claim+"',true); end $$; set local role "+role+"; select public.native_statistics_attempt('"+operation+"',"+(wanted===null?'null':String(wanted))+','+(expected??'null')+"); commit;";
 };
 const call=async(...input)=>json(session(...input));
 const expected=(result,enabled,revision,source='stored')=>assert.deepEqual(result,{sqlstate:null,result:{enabled,source,revision}});
 const stateHash=()=>digest('account_statistics_preferences');
 const refused=async(inputs,code)=>{const before=await stateHash(); const result=await call(...inputs);assert.deepEqual(result,{sqlstate:code,result:null});assert.equal(await stateHash(),before);};
 expected(await call(A,'get'),true,'0','default'); expected(await call(B,'get'),true,'0','default');
 assert.equal(await sql("select count(*) from public.account_statistics_preferences where user_id in ('"+A+"','"+B+"');"),'0');

 // Two real psql sessions. A has performed OFF in its open transaction.
 // B's genuine function is observed blocked by A BEFORE the parent permits COMMIT.
 const clientA=spawn(psqlExecutable,args,{env:{...env,PGAPPNAME:'rr-statistics-owner-off'},stdio:['pipe','pipe','pipe']});
 let aOutput='',aError='',aClosed=false,aCommitted=false,aOverflow=false;
 clientA.stdout.on('data',bytes=>{aOverflow ||= aOutput.length+bytes.length>=128*1024;aOutput=(aOutput+bytes).slice(0,128*1024);});
 clientA.stderr.on('data',bytes=>{aOverflow ||= aError.length+bytes.length>=128*1024;aError=(aError+bytes).slice(0,128*1024);});
 clientA.stdin.on('error',()=>{});
 const aDone=new Promise((resolve,reject)=>{clientA.on('error',reject);clientA.on('close',(code,signal)=>{aClosed=true;resolve({code,signal});});});
 // Keep a spawn rejection handled while the actual ready/block queries run;
 // the original promise is still awaited and never reclassified as success.
 aDone.catch(()=>{});
 let bDone=null;
 try{
  clientA.stdin.write("begin; set local statement_timeout='8s'; set local idle_in_transaction_session_timeout='12s'; do $$ begin perform set_config('request.jwt.claim.sub','"+A+"',true); perform set_config('request.jwt.claim.role','authenticated',true); end $$; set local role authenticated; select jsonb_build_object('pid',pg_backend_pid(),'off',public.set_own_statistics_preference(false,0));\n\\echo NATIVE_STATISTICS_A_LOCKED\n");
  const deadline=Date.now()+8000;
  while(!aOutput.includes('NATIVE_STATISTICS_A_LOCKED')){assert(!aOverflow&&!aClosed&&Date.now()<deadline,'A did not reach actual OFF/profile-lock');await new Promise(resolve=>setTimeout(resolve,20));}
  assert(!aOverflow);
  const held=JSON.parse(aOutput.split('\n').find(line=>line.startsWith('{')));
  assert.deepEqual(held.off,{enabled:false,source:'stored',revision:'1'});assert(Number.isSafeInteger(held.pid)&&held.pid>1);
  const parentFields=(await fs.readFile('/proc/'+held.pid+'/stat','utf8')).split(') ').at(-1).split(' ');assert.equal(Number(parentFields[1]),owner.pid);
  bDone=execute(psqlExecutable,args,{input:session(A,'set',true,'0'),env:{...env,PGAPPNAME:'rr-statistics-stale-on'}});
  let blocked=null;
  while(Date.now()<deadline){
   const rows=await json("select coalesce(jsonb_agg(jsonb_build_object('pid',pid,'type',wait_event_type,'blockers',pg_blocking_pids(pid))),'[]'::jsonb) from pg_stat_activity where application_name='rr-statistics-stale-on';");
   assert(rows.length<=1);if(rows.length===1&&rows[0].type==='Lock'&&rows[0].blockers.includes(held.pid)){blocked=rows[0];break;}
   await new Promise(resolve=>setTimeout(resolve,20));
  }
  assert(blocked,'Actual stale ON must wait on the actual OFF/profile owner');
  clientA.stdin.end('commit;\n\\q\n');aCommitted=true;
  assert.deepEqual(await aDone,{code:0,signal:null}); assert(!aOverflow); assert.equal(aError,'');
  const received=await bDone;assert.equal(received.code,0);assert.equal(received.signal,null);
  assert.deepEqual(JSON.parse(received.stdout.trim()),{sqlstate:'40001',result:null});
  expected(await call(A,'get'),false,'1'); expected(await call(B,'get'),true,'0','default');
 }finally{
  if(!aClosed&&!aCommitted)clientA.stdin.end('rollback;\n\\q\n');
  if(!aClosed)await aDone; if(bDone)await bDone;
 }
 expected(await call(A,'set',true,'1'),true,'2');
 await refused([A,'legacy-on'],'22023');
 expected(await call(A,'legacy-off'),false,'3');
 expected(await call(A,'set',false,'0'),false,'4');
 expected(await call(B,'legacy-off'),false,'1');
 expected(await call(B,'set',false,'0'),false,'2');
 expected(await call(B,'set',true,'2'),true,'3'); expected(await call(A,'get'),false,'4');
 for(const uid of ['',MISSING])for(const operation of ['get','set','legacy-on','legacy-off'])await refused([uid,operation,false,'0'],'42501');
 for(const role of ['anon','service_role'])for(const operation of ['get','set'])await refused([A,operation,false,'0',role],'42501');
 await refused([A,'get',null,null,'authenticated','service_role'],'42501');
 await refused([A,'table-read'],'42501');
 const directBefore=await stateHash();
 const rls=await json('begin; grant select,insert on public.account_statistics_preferences to authenticated;'
  +session(A,'table-read').replace(/^begin;/,'').replace(/commit;$/,'')+'rollback;');
 assert.deepEqual(rls,{sqlstate:null,result:{rows:0}});
 const denied=await json('begin; grant select,insert on public.account_statistics_preferences to authenticated;'
  +session(A,'table-insert').replace(/^begin;/,'').replace(/commit;$/,'')+'rollback;');
 assert.deepEqual(denied,{sqlstate:'42501',result:null});assert.equal(await stateHash(),directBefore);
 assert.equal(await sql("select has_table_privilege('authenticated','public.account_statistics_preferences','select,insert,update,delete');"),'f');
 await refused([B,'set',false,'9223372036854775807'],'40001');
 await refused([B,'set',true,null],'40001'); await refused([B,'set',null,'3'],'22023');
 await refused([B,'set',false,'-1'],'22023');
 await sql("update public.account_statistics_preferences set revision=9223372036854775807,enabled=false where user_id='"+A+"';");
 expected(await call(A,'get'),false,'9223372036854775807');
 await refused([A,'set',true,'9223372036854775807'],'22003'); await refused([A,'legacy-off'],'22003');
 assert.equal(await digest('account_activity_journal'),journalBefore);
 assert.equal(await sql("select md5(coalesce(jsonb_agg(jsonb_build_array(t.user_id,t.enabled) order by t.user_id),'[]'::jsonb)::text) from public.account_statistics_preferences t where t.user_id not in ('"+A+"','"+B+"');"),oldValues,'Every pre-existing true/false value remains unchanged');
 assert.equal(await sql("select md5(coalesce(jsonb_agg(to_jsonb(p) order by p.id),'[]'::jsonb)::text) from public.profiles p;"),profileBefore);
 assert.equal(await sql("select md5(row(p.prosrc,p.prosecdef,p.proconfig,p.proacl)::text) from pg_proc p where p.oid='public.ravradar_ravscore_checkpoint_cas(bigint,timestamptz,jsonb)'::regprocedure and 'statement_timeout=55s'=any(p.proconfig);"),casBefore);
 assert.deepEqual(await readOwner(),owner);
 const finalDirectoryStat=await fs.lstat(root,{bigint:true});
 assert(finalDirectoryStat.isDirectory()&&!finalDirectoryStat.isSymbolicLink());
 assert.deepEqual([finalDirectoryStat.dev,finalDirectoryStat.ino,finalDirectoryStat.birthtimeNs], [directoryStat.dev,directoryStat.ino,directoryStat.birthtimeNs]);
 return {kind:'NATIVE_STATISTICS_REVISION_SOURCE_CASES',postgresMajorVersion:Math.floor(host.version/10000),
  tcpEnabled:false,genuineBaseHead:HEAD,revisionSourceSha256:SQL_SHA,migrationSourceSha256:hash(migration),
  actualBlockedSessions:true,sqlExecuted:true,productionInstalled:false,wholeFutureMigrationExecuted:true,
  revisionCatalog:revisionCatalogReceipt,
  privateProductionRowsRead:false,rowsLogged:false,profileAndActivityUnchanged:true,
  checkpointBodyAclTimeoutUnchanged:true,clientUnknownAckProof:'separate controlled V2 normal client target',
  aggregateProcessingProven:false,deletionExecuted:false,coverageClaim:false};
}
