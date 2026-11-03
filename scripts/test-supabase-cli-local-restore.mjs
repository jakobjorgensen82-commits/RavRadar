// Synthetic standard CLI recipe only. No RavRadar exporter, credentials or R2.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

const P=Object.freeze({cli:'2.117.0',operationMs:20*60_000,cleanupMs:2*60_000,
  childMs:8*60_000,diagnosticBytes:1024*1024,fileBytes:8*1024*1024,totalBytes:32*1024*1024});
const IMAGES=Object.freeze({db:'supabase/postgres:17.6.1.167',kong:'kong:2.8.1',auth:'supabase/gotrue:v2.196.0'});
const EXCLUDE='realtime,storage-api,imgproxy,edge-runtime,postgres-meta,studio,supavisor,logflare,vector,mailpit,postgrest';
const FILES=['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql'];
const TEXT='æøå ÆØÅ — rav 🟠\nanden linje';
const DECIMAL='9007199254740993.123456789012345678';
const META={label:TEXT,nested:{meaning:'egen syntetisk fixture',enabled:true}};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code});};
const inside=(root,value)=>{const r=path.relative(root,value);return r!==''&&!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep);};
const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);

function localUrl(raw,kind){
  const u=new URL(raw);
  need(u.hostname==='127.0.0.1'&&!u.hash&&!u.search,'LOOPBACK_URL_REQUIRED');
  if(kind==='api')need(u.protocol==='http:'&&!u.username&&!u.password&&u.pathname==='/','LOCAL_API_URL');
  else need(['postgres:','postgresql:'].includes(u.protocol)&&u.username==='postgres'&&u.password.length>0
    &&u.pathname==='/postgres','LOCAL_DATABASE_URL');
  need(u.port===(kind==='api'?'54321':'54322'),'LOCAL_PORT_REQUIRED');return u;
}
function ownedContainer(info,project,service){
  need(/^[a-f0-9]{64}$/.test(info?.Id??''),'CONTAINER_ID');
  need(info.Name==='/supabase_'+service+'_'+project.id,'CONTAINER_NAME');
  need(info.Config?.Labels?.['com.supabase.cli.project']===project.id,'CONTAINER_PROJECT_LABEL');
  need(Object.keys(info.NetworkSettings?.Networks??{}).length===1
    &&Object.hasOwn(info.NetworkSettings.Networks,project.network),'CONTAINER_NETWORK');
  let published=0;
  for(const values of Object.values(info.NetworkSettings.Ports??{}))for(const v of values??[]){
    need(v.HostIp==='127.0.0.1','CONTAINER_NOT_LOOPBACK_BOUND');
    need(service!=='auth'&&v.HostPort===(service==='db'?'54322':'54321'),'CONTAINER_UNEXPECTED_HOST_PORT');published++;
  }
  need(published===(service==='auth'?0:1),'CONTAINER_PORT_COUNT');
  need(info.State?.Running===true&&info.State?.Health?.Status==='healthy','CONTAINER_NOT_HEALTHY');return info.Id;
}
function safeError(error,stage){
  return {stage,code:/^[A-Z0-9_]+$/.test(error?.code??'')?error.code:'LOCAL_RESTORE_REFUSED',
    exit:Number.isInteger(error?.exit)?error.exit:null,externalDockerOutcome:'UNKNOWN_UNTIL_OWNED_READBACK'};
}
function diagnosticClass(bytes){
  const text=bytes.toString('utf8');
  const state=/ERROR:\s+([0-9A-Z]{5})\b/.exec(text);if(state)return 'SQLSTATE_'+state[1];
  for(const [code,expression]of [
    ['DOCKER_UNAVAILABLE',/cannot connect to the docker|docker daemon is not running|error during connect/i],
    ['LOCAL_PERMISSION_DENIED',/permission denied/i],
    ['PUBLIC_IMAGE_PULL_REFUSED',/pull access denied|manifest unknown|toomanyrequests/i],
    ['CONFIG_REJECTED',/invalid config|failed to parse.*toml/i],
    ['LOOPBACK_CONNECTION_REFUSED',/connection refused/i],
  ])if(expression.test(text))return code;
  return 'CHILD_EXIT';
}
function restoreBytes(buffers,history=false){
  need(Array.isArray(buffers)&&buffers.length===(history?2:3)&&buffers.every(Buffer.isBuffer),'RESTORE_BYTES');
  return history?Buffer.concat(buffers.flatMap(b=>[b,Buffer.from('\n')])):
    Buffer.concat([buffers[0],Buffer.from('\n'),buffers[1],Buffer.from('\nSET session_replication_role = replica;\n'),buffers[2],Buffer.from('\n')]);
}

// Same owned process-group timeout shape as export-supabase-database.mjs.
// Process closure never claims that a Docker daemon-side operation has stopped.
async function command(c,stage,bin,args,{cwd=c.root,input=null,maxMs=P.childMs,audit=null}={}){
  c.stage=stage;need(Date.now()<c.deadline,'OPERATION_DEADLINE');
  let child,closed=false,exit=null,signal=null,first=null,outBytes=0,errBytes=0;
  const out=[],err=[],started=Date.now();
  const fail=code=>{first??=Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code});};
  const interrupted=()=>fail('INTERRUPTED');
  try{
    child=spawn(bin,args,{cwd,env:c.env,shell:false,detached:true,stdio:['pipe','pipe','pipe']});
    child.on('error',()=>fail('SPAWN_FAILED'));
    child.on('exit',(v,s)=>{exit=v;signal=s;if(v!==0||s!==null)fail('CHILD_EXIT');});
    child.on('close',()=>{closed=true;});
    child.stdout.on('data',b=>{outBytes+=b.length;if(outBytes>P.diagnosticBytes)fail('STDOUT_BOUND');else out.push(Buffer.from(b));});
    child.stderr.on('data',b=>{errBytes+=b.length;if(errBytes>P.diagnosticBytes)fail('STDERR_BOUND');else err.push(Buffer.from(b));});
    child.stdout.on('error',()=>fail('STDOUT_TRANSPORT'));child.stderr.on('error',()=>fail('STDERR_TRANSPORT'));
    child.stdin.on('error',()=>fail('STDIN_TRANSPORT'));child.stdin.end(input??undefined);
    process.on('SIGINT',interrupted);process.on('SIGTERM',interrupted);
    while(!closed&&!first){
      if(Date.now()>=c.deadline||Date.now()-started>=maxMs)fail('CHILD_TIMEOUT');
      if(audit)try{await audit();}catch(e){first??=e;}
      if(!first)await sleep(40);
    }
    const gone=()=>{if(!Number.isSafeInteger(child.pid))return closed;
      try{process.kill(-child.pid,0);return false;}catch(e){return e.code==='ESRCH';}};
    for(const [why,grace]of [['SIGTERM',2000],['SIGKILL',3000]]){
      if(closed&&gone())break;
      fail('PROCESS_GROUP_UNCLOSED');try{process.kill(-child.pid,why);}catch{}
      const end=Date.now()+grace;while(!(closed&&gone())&&Date.now()<end)await sleep(40);
    }
    const processClosed=closed&&gone();
    c.processes.push({stage,exit,stdoutBytes:outBytes,stderrBytes:errBytes,processGroupClosed:processClosed});
    if(!processClosed)fail('PROCESS_GROUP_UNCLOSED');
    if(first){if(first.code==='CHILD_EXIT')first.code=diagnosticClass(Buffer.concat(err));first.exit=exit;throw first;}
    return Buffer.concat(out);
  }finally{
    process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);
    child?.stdin?.destroy();child?.stdout?.destroy();child?.stderr?.destroy();
  }
}
async function jsonCommand(c,stage,args){
  try{return JSON.parse((await command(c,stage,'docker',args)).toString('utf8'));}
  catch(e){if(e.code)throw e;throw Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code:'DOCKER_JSON'});}
}
async function projectsAbsent(c,p){
  const containers=(await command(c,'OWNED_CONTAINER_ABSENCE','docker',['ps','-aq','--filter','label=com.supabase.cli.project='+p.id])).toString().trim();
  const volumes=(await command(c,'OWNED_VOLUME_ABSENCE','docker',['volume','ls','-q','--filter','label=com.supabase.cli.project='+p.id])).toString().trim();
  need(!containers&&!volumes,'OWNED_PROJECT_REMAINS');
}
async function stopProject(c,p){
  if(p.cleanupAttempted)return p.closed===true;p.cleanupAttempted=true;
  // The exact ID was absent before its first start; never --all or global prune.
  if(p.startAttempted){await command(c,'STOP_'+p.side,'supabase',['stop','--project-id',p.id,'--no-backup'],{cwd:p.dir,maxMs:60_000});
    await projectsAbsent(c,p);}
  if(p.networkCreateAttempted){
    const remaining=(await command(c,'NETWORK_READBACK','docker',['network','ls','-q','--no-trunc','--filter','name=^'+p.network+'$'])).toString().trim();
    if(remaining){
      const n=(await jsonCommand(c,'NETWORK_OWNER',['network','inspect',p.network]))[0];
      need(n.Name===p.network&&(!p.networkId||n.Id===p.networkId)
        &&n.Labels?.['ravradar.synthetic.restore.owner']===c.owner,'NETWORK_OWNER_CHANGED');
      need(Object.keys(n.Containers??{}).length===0,'NETWORK_STILL_OCCUPIED');
      await command(c,'REMOVE_NETWORK_'+p.side,'docker',['network','rm',n.Id],{maxMs:30_000});
      need(!(await command(c,'NETWORK_CLOSED','docker',['network','ls','-q','--filter','name=^'+p.network+'$'])).toString().trim(),'NETWORK_REMAINS');
    }
  }
  p.closed=true;return true;
}
function config(id,target){return `project_id = "${id}"
[api]
enabled = true
port = 54321
[db]
port = 54322
shadow_port = 54320
major_version = 17
[db.migrations]
enabled = ${!target}
[db.seed]
enabled = false
[db.pooler]
enabled = false
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = []
[auth.email]
enable_confirmations = false
[local_smtp]
enabled = false
[storage]
enabled = false
[realtime]
enabled = false
[studio]
enabled = false
[analytics]
enabled = false
[edge_runtime]
enabled = false
`;}
async function startProject(c,p){
  await fs.mkdir(p.dir,{mode:0o700});await projectsAbsent(c,p);
  const before=(await command(c,'NETWORK_ABSENCE','docker',['network','ls','-q','--filter','name=^'+p.network+'$'])).toString().trim();
  need(!before,'NETWORK_ALREADY_EXISTS');
  await command(c,'INIT_'+p.side,'supabase',['init','--yes'],{cwd:p.dir,maxMs:30_000});
  await fs.writeFile(path.join(p.dir,'supabase/config.toml'),config(p.id,p.side==='B'),{mode:0o600});
  p.networkCreateAttempted=true;
  const raw=await command(c,'CREATE_NETWORK_'+p.side,'docker',['network','create','--driver','bridge',
    '--label','ravradar.synthetic.restore.owner='+c.owner,'--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',p.network]);
  p.networkId=raw.toString().trim();need(/^[a-f0-9]{64}$/.test(p.networkId),'NETWORK_CREATE_OUTCOME_UNKNOWN');p.networkCreated=true;
  p.startAttempted=true;
  await command(c,'START_'+p.side,'supabase',['--network-id',p.network,'start','--exclude',EXCLUDE],{cwd:p.dir});
  const actual={};
  for(const service of ['db','kong','auth']){
    const info=(await jsonCommand(c,'INSPECT_'+p.side+'_'+service,['inspect','supabase_'+service+'_'+p.id]))[0];
    p[service]=ownedContainer(info,p,service);const image=(await jsonCommand(c,'IMAGE_'+service,['image','inspect',info.Image]))[0];
    // The clean, unlinked CLI chooses its own normal public registry/mirror.
    // Verify exact service/tag as well as content identity; do not assume a Docker Hub alias.
    const short=IMAGES[service].split('/').at(-1);
    need(image.Id===info.Image&&typeof info.Config.Image==='string'
      &&info.Config.Image.split('/').at(-1)===short,'UNEXPECTED_SERVICE_IMAGE');
    need(Array.isArray(image.RepoDigests)&&image.RepoDigests.length>0,'IMAGE_DIGEST_REQUIRED');
    actual[service]={id:image.Id,digests:[...image.RepoDigests].sort()};
  }
  const found=(await command(c,'EXACT_SERVICE_SET','docker',['ps','--no-trunc','-aq','--filter','label=com.supabase.cli.project='+p.id])).toString().trim().split(/\s+/).filter(Boolean);
  assert.deepEqual(found.sort(),[p.db,p.kong,p.auth].sort());
  if(c.images)assert.deepEqual(actual,c.images);else c.images=actual;
  const status=JSON.parse((await command(c,'STATUS_'+p.side,'supabase',['status','--output','json'],{cwd:p.dir,maxMs:30_000})).toString());
  p.api=localUrl(status.API_URL,'api');p.dbUrl=localUrl(status.DB_URL,'db');
  need(typeof status.ANON_KEY==='string'&&status.ANON_KEY.length>32&&typeof status.SERVICE_ROLE_KEY==='string'
    &&status.SERVICE_ROLE_KEY.length>32,'LOCAL_RUNTIME_KEYS_REQUIRED');p.anon=status.ANON_KEY;p.service=status.SERVICE_ROLE_KEY;
}
async function psql(c,p,stage,bytes){
  return command(c,stage,'docker',['exec','-i','-e','PGPASSWORD='+decodeURIComponent(p.dbUrl.password),p.db,'psql','-X',
    '--host=127.0.0.1','--port=5432','--username=postgres','--dbname=postgres','--quiet','--single-transaction','--variable=ON_ERROR_STOP=1',
    '--set=VERBOSITY=sqlstate','--tuples-only','--no-align'],{input:bytes,maxMs:90_000});
}
async function query(c,p,stage,sql){return JSON.parse((await psql(c,p,stage,Buffer.from(sql+'\n'))).toString().trim());}
async function auth(c,p,route,{body=null,token=null,status=200}={}){
  need(['/admin/users','/token?grant_type=password','/user'].includes(route),'AUTH_ROUTE');
  c.stage=p.side+'_AUTH_'+(route==='/admin/users'?'CREATE':route==='/user'?'USER':'PASSWORD');
  need(Date.now()<c.deadline,'OPERATION_DEADLINE');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(10_000,c.deadline-Date.now()));
  try{
    const url=new URL('/auth/v1'+route,p.api),headers={apikey:route==='/admin/users'?p.service:p.anon};
    if(token)headers.Authorization='Bearer '+token;if(body)headers['Content-Type']='application/json';
    const response=await fetch(url,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined,
      redirect:'error',signal:controller.signal});
    const reader=response.body?.getReader();need(reader,'AUTH_BODY');const chunks=[];let n=0;
    try{while(true){const part=await reader.read();if(part.done)break;n+=part.value.length;need(n<=64*1024,'AUTH_BODY_BOUND');chunks.push(Buffer.from(part.value));}}
    finally{await reader.cancel().catch(()=>{});}
    c.authRequests.push({project:p.side,kind:c.stage,status:response.status,bodyBytes:n});
    need(response.status===status,'AUTH_STATUS_'+response.status);
    return status===200?JSON.parse(Buffer.concat(chunks).toString('utf8')):null;
  }finally{clearTimeout(timer);controller.abort();}
}
function snapshotSql(){return `select jsonb_build_object(
 'row',(select jsonb_build_object('id',id,'owner',owner_id::text,'text',label,'decimal',amount::text,'metadata',metadata::text) from public.rr_restore_probe),
 'columns',(select jsonb_agg(jsonb_build_array(column_name,data_type,udt_name,is_nullable,column_default) order by ordinal_position) from information_schema.columns where table_schema='public' and table_name='rr_restore_probe'),
 'constraints',(select jsonb_agg(pg_get_constraintdef(oid) order by conname) from pg_constraint where conrelid='public.rr_restore_probe'::regclass),
 'indexes',(select jsonb_agg(indexdef order by indexname) from pg_indexes where schemaname='public' and tablename='rr_restore_probe'),
 'policy',(select jsonb_agg(jsonb_build_array(policyname,permissive,roles,cmd,qual,with_check) order by policyname) from pg_policies where schemaname='public' and tablename='rr_restore_probe'),
 'rls',(select relrowsecurity from pg_class where oid='public.rr_restore_probe'::regclass),
 'sequence',(select last_value::text from public.rr_restore_probe_id_seq),
 'role',(select jsonb_build_array(rolcanlogin,rolsuper,rolcreatedb,rolcreaterole) from pg_roles where rolname='rr_restore_reader'),
 'grant',has_table_privilege('rr_restore_reader','public.rr_restore_probe','SELECT'),
 'history',(select jsonb_agg(to_jsonb(h) order by version) from supabase_migrations.schema_migrations h),
 'users',(select jsonb_agg(jsonb_build_array(id::text,raw_user_meta_data::text) order by id) from auth.users),
 'identities',(select count(*) from auth.identities));`;}
const MIGRATION=`create role rr_restore_reader nologin;
create table public.rr_restore_probe(id bigserial primary key,owner_id uuid references auth.users(id),label text not null,
 amount numeric(38,18) not null check(amount>0),metadata jsonb not null);
create index rr_restore_probe_label_idx on public.rr_restore_probe(label);
alter table public.rr_restore_probe enable row level security;
create policy own_probe on public.rr_restore_probe for select to authenticated using(owner_id=auth.uid());
grant usage on schema public to rr_restore_reader;
grant select on public.rr_restore_probe to rr_restore_reader;
`;
async function dumpFiles(c,p){
  const dir=path.join(c.root,'dumps');await fs.mkdir(dir,{mode:0o700});
  const audit=async()=>{let n=0;for(const name of FILES){const s=await fs.lstat(path.join(dir,name)).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    if(s){need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=P.fileBytes,'DUMP_FILE_BOUND');n+=s.size;}}need(n<=P.totalBytes,'DUMP_TOTAL_BOUND');};
  const flags=[['--role-only'],[],['--data-only','--use-copy'],['--schema','supabase_migrations'],['--schema','supabase_migrations','--data-only','--use-copy']];
  for(let i=0;i<FILES.length;i++)await command(c,'DUMP_'+i,'supabase',['--network-id',p.network,'db','dump','--local',...flags[i],'--file',path.join(dir,FILES[i])],{cwd:p.dir,audit});
  await audit();const bytes=[];for(const name of FILES){const file=path.join(dir,name),before=await fs.lstat(file,{bigint:true});
    need(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n&&before.size>0n,'DUMP_FILE');
    const value=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
    for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key],'DUMP_CHANGED');
    need(BigInt(value.length)===before.size,'DUMP_LENGTH');bytes.push(value);c.dumps.push({name,bytes:value.length,sha256:sha(value)});}
  return bytes;
}

async function fixture(){
  need(process.platform==='linux'&&process.env.GITHUB_ACTIONS==='true'&&process.env.RUNNER_ENVIRONMENT==='github-hosted'
    &&process.env.RUNNER_OS==='Linux'&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch','HOSTED_LINUX_ONLY');
  need(process.env.GITHUB_REPOSITORY==='jakobjorgensen82-commits/RavRadar'&&process.env.GITHUB_RUN_ATTEMPT==='1','FIXED_REPOSITORY_ATTEMPT');
  need(/^[a-f0-9]{40}$/.test(process.env.EXPECTED_HEAD_SHA??'')&&process.env.EXPECTED_HEAD_SHA===process.env.GITHUB_SHA,'EXACT_DISPATCHED_HEAD');
  const run=process.env.GITHUB_RUN_ID;need(/^[1-9][0-9]{0,18}$/.test(run??''),'RUN_ID');
  need(typeof process.env.RUNNER_TEMP==='string'&&path.isAbsolute(process.env.RUNNER_TEMP),'RUNNER_TEMP_REQUIRED');
  const temp=await fs.realpath(process.env.RUNNER_TEMP);need(temp!==path.parse(temp).root,'RUNNER_TEMP');
  const root=await fs.mkdtemp(path.join(temp,'rr-standard-restore-'));need(inside(temp,root),'OWNED_ROOT');await fs.chmod(root,0o700);
  const rootIdentity=await fs.lstat(root,{bigint:true});
  const home=path.join(root,'home');await fs.mkdir(home,{mode:0o700});const owner=run+'-1';
  const c={root,owner,stage:'PREFLIGHT',deadline:Date.now()+P.operationMs,processes:[],authRequests:[],dumps:[],images:null,
    env:{PATH:process.env.PATH,HOME:home,TMPDIR:root,LANG:'C.UTF-8',LC_ALL:'C.UTF-8',CI:'true',SUPABASE_TELEMETRY_DISABLED:'true'}};
  const projects=['A','B'].map(side=>({side,id:'rr_restore_'+run+'_1_'+side.toLowerCase(),dir:path.join(root,side),network:'rr-restore-'+owner+'-'+side.toLowerCase()}));
  let result,error=null;
  try{
    need((await command(c,'CLI_VERSION','supabase',['--version'],{maxMs:20_000})).toString().trim()===P.cli,'CLI_VERSION');
    need((await command(c,'DOCKER_LINUX','docker',['info','--format','{{.OSType}}'],{maxMs:20_000})).toString().trim()==='linux','DOCKER_LINUX');
    need((await command(c,'LOCAL_DAEMON','docker',['context','inspect','default','--format','{{.Endpoints.docker.Host}}'],{maxMs:20_000})).toString().trim()==='unix:///var/run/docker.sock','LOCAL_DAEMON');
    const [a,b]=projects;await startProject(c,a);
    const migrations=path.join(a.dir,'supabase/migrations');await fs.mkdir(migrations,{recursive:true,mode:0o700});
    await fs.writeFile(path.join(migrations,'20200101000000_restore_probe.sql'),MIGRATION,{flag:'wx',mode:0o600});
    await command(c,'APPLY_OWN_MIGRATION','supabase',['--network-id',a.network,'migration','up','--local'],{cwd:a.dir});
    const email='restore-'+run+'@example.invalid',password=crypto.randomBytes(32).toString('base64url');
    const created=await auth(c,a,'/admin/users',{token:a.service,body:{email,password,email_confirm:true,user_metadata:META}});need(uuid(created.id),'AUTH_CREATED_ID');
    const login=await auth(c,a,'/token?grant_type=password',{body:{email,password}});need(login.user?.id===created.id&&typeof login.access_token==='string','SOURCE_AUTH_LOGIN');
    const sourceUser=await auth(c,a,'/user',{token:login.access_token});need(sourceUser.id===created.id,'SOURCE_USER_ID');
    assert.equal(sourceUser.user_metadata.label,META.label);assert.deepEqual(sourceUser.user_metadata.nested,META.nested);
    const quoted=(JSON.stringify(META).slice(0,-1)+',"largeInteger":9007199254740993}').replaceAll("'","''");
    await psql(c,a,'INSERT_OWN_DATA',Buffer.from(`insert into public.rr_restore_probe(owner_id,label,amount,metadata) values('${created.id}',convert_from(decode('${Buffer.from(TEXT).toString('hex')}','hex'),'UTF8'),'${DECIMAL}', '${quoted}'::jsonb);\nselect setval('public.rr_restore_probe_id_seq',7);\n`));
    await command(c,'QUIESCE_A_AUTH','docker',['stop','--time','10',a.auth],{maxMs:30_000});
    const before=await query(c,a,'SOURCE_SNAPSHOT',snapshotSql());need(before.row.decimal===DECIMAL&&before.row.text===TEXT,'SOURCE_PRECISION');
    const dumps=await dumpFiles(c,a);await stopProject(c,a);
    await startProject(c,b);
    const empty=await query(c,b,'TARGET_EMPTY',"select jsonb_build_array(to_regclass('public.rr_restore_probe') is null,not exists(select 1 from pg_roles where rolname='rr_restore_reader'),to_regclass('supabase_migrations.schema_migrations') is null,(select count(*)=0 from auth.users));");
    assert.deepEqual(empty,[true,true,true,true]);
    await auth(c,b,'/token?grant_type=password',{body:{email,password},status:400});
    await command(c,'QUIESCE_B_AUTH','docker',['stop','--time','10',b.auth],{maxMs:30_000});
    await psql(c,b,'RESTORE_ROLES_SCHEMA_DATA',restoreBytes(dumps.slice(0,3)));
    await psql(c,b,'RESTORE_HISTORY',restoreBytes(dumps.slice(3),true));
    const after=await query(c,b,'RESTORED_SNAPSHOT',snapshotSql());assert.deepEqual(after,before);
    await command(c,'RESTART_B_AUTH','docker',['start',b.auth],{maxMs:30_000});
    let healthy=false;const end=Math.min(c.deadline,Date.now()+60_000);
    while(Date.now()<end){const info=(await jsonCommand(c,'RESTORED_AUTH_HEALTH',['inspect',b.auth]))[0];
      if(info.State?.Health?.Status==='healthy'){ownedContainer(info,b,'auth');healthy=true;break;}await sleep(500);}
    need(healthy,'RESTORED_AUTH_NOT_HEALTHY');
    const restored=await auth(c,b,'/token?grant_type=password',{body:{email,password}});need(restored.user?.id===created.id&&typeof restored.access_token==='string','RESTORED_AUTH_LOGIN');
    const user=await auth(c,b,'/user',{token:restored.access_token});need(user.id===created.id,'RESTORED_USER_ID');assert.deepEqual(user.user_metadata,sourceUser.user_metadata);
    await auth(c,b,'/token?grant_type=password',{body:{email,password:password+'wrong'},status:400});
    result={status:'PASS',scope:'synthetic-standard-cli-local-restore',sourceHead:process.env.EXPECTED_HEAD_SHA,cliVersion:P.cli,
      standardFiveFileRoundtrip:true,utf8DecimalMetadata:true,rolesAndMigrationHistory:true,newAuthPasswordLogin:true,
      productionBackupVerified:false,cryptoR2Verified:false,productionAuthRestoreVerified:false};
  }catch(e){error=safeError(e,c.stage);}
  finally{
    c.deadline=Date.now()+P.cleanupMs;
    for(const p of projects)try{await stopProject(c,p);}catch(e){error??=safeError(e,'CLEANUP_'+p.side);}
    const closed=projects.every(p=>p.closed===true);
    if(!closed)error??={stage:'CLEANUP',code:'OWNED_DOCKER_CLOSURE_UNKNOWN',exit:null};
    if(closed)try{const st=await fs.lstat(root,{bigint:true});need(st.isDirectory()&&!st.isSymbolicLink()
      &&st.dev===rootIdentity.dev&&st.ino===rootIdentity.ino&&inside(temp,await fs.realpath(root)),'SCRATCH_IDENTITY');
      await fs.rm(root,{recursive:true,force:false});}catch(e){error??=safeError(e,'SCRATCH_CLEANUP');}
    const report={...(result??{status:'FAILED_CLOSED',scope:'synthetic-standard-cli-local-restore'}),
      ...(error?{status:'FAILED_CLOSED',firstFailure:error}:{}),ownedDockerClosed:closed,
      images:c.images,dumpFiles:c.dumps,authRequests:c.authRequests,processes:c.processes};
    console.log(JSON.stringify(report));if(error)process.exitCode=1;
  }
}

async function selfTest(){
  const {test}=await import('node:test');
  test('only exact loopback API and database URLs are accepted',()=>{
    assert.equal(localUrl('http://127.0.0.1:54321/','api').host,'127.0.0.1:54321');
    assert.equal(localUrl('postgresql://postgres:synthetic@127.0.0.1:54322/postgres','db').pathname,'/postgres');
    for(const value of ['https://example.com:54321/','http://localhost:54321/','http://127.0.0.1:54321/?token=x','http://u:p@127.0.0.1:54321/','http://127.0.0.1:54325/'])
      assert.throws(()=>localUrl(value,'api'));
  });
  test('container identity, project, network and real loopback health are required',()=>{
    const p={id:'rr_synthetic',network:'rr-net'},x={Id:'a'.repeat(64),Name:'/supabase_auth_rr_synthetic',Config:{Labels:{'com.supabase.cli.project':p.id}},
      NetworkSettings:{Networks:{'rr-net':{}},Ports:{'9999/tcp':null}},State:{Running:true,Health:{Status:'healthy'}}};
    assert.equal(ownedContainer(x,p,'auth'),x.Id);
    for(const edit of [v=>v.Name+='x',v=>v.Config.Labels['com.supabase.cli.project']='other',v=>v.NetworkSettings.Ports['9999/tcp']=[{HostIp:'0.0.0.0',HostPort:'9999'}],v=>v.State.Health.Status='starting']){
      const v=structuredClone(x);edit(v);assert.throws(()=>ownedContainer(v,p,'auth'));}
    const db=structuredClone(x);db.Name='/supabase_db_'+p.id;db.NetworkSettings.Ports={'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'54322'}]};
    assert.equal(ownedContainer(db,p,'db'),db.Id);db.NetworkSettings.Ports['5432/tcp'][0].HostPort='54323';assert.throws(()=>ownedContainer(db,p,'db'));
  });
  test('restore stream preserves UTF8 and decimal bytes without number conversion',()=>{
    const x=Buffer.from(TEXT+'\n'+DECIMAL),values=[Buffer.from('roles\n'),Buffer.from('schema\n'),x];
    assert(restoreBytes(values).includes(x));assert(restoreBytes([x,x],true).includes(x));assert.throws(()=>restoreBytes(['text',x]));
  });
  test('scratch containment and safe errors reject escapes and raw diagnostics',()=>{
    assert(inside(path.resolve(os.tmpdir()),path.join(path.resolve(os.tmpdir()),'owned')));
    assert(!inside('/tmp/own','/tmp/own-other'));assert(!inside('/tmp/own','/tmp/own'));
    assert.deepEqual(safeError(new Error('token=must-not-appear'),'OWNED_STAGE'),{stage:'OWNED_STAGE',code:'LOCAL_RESTORE_REFUSED',exit:null,externalDockerOutcome:'UNKNOWN_UNTIL_OWNED_READBACK'});
  });
  test('bounded diagnostics keep fixed SQL and transport classes without raw errors',()=>{
    assert.equal(diagnosticClass(Buffer.from('ERROR: 23505 private synthetic detail')),'SQLSTATE_23505');
    assert.equal(diagnosticClass(Buffer.from('Cannot connect to the Docker daemon')),'DOCKER_UNAVAILABLE');
    assert.equal(diagnosticClass(Buffer.from('token=must-not-appear')),'CHILD_EXIT');
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  need(process.argv.length===3,'ONE_FIXED_MODE');
  if(process.argv[2]==='--self-test')await selfTest();
  else if(process.argv[2]==='--run-local-fixture')await fixture().catch(e=>{
    console.log(JSON.stringify({status:'FAILED_CLOSED',scope:'synthetic-standard-cli-local-restore',firstFailure:safeError(e,'PREFLIGHT')}));process.exitCode=1;
  });
  else need(false,'UNKNOWN_MODE');
}
