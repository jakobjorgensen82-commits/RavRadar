// Synthetic by default; the explicit archive branch restores only to its own local project.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {get as httpGet} from 'node:http';
import {BlockList,createConnection,createServer,isIPv4} from 'node:net';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {Readable,Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';

const P=Object.freeze({cli:'2.117.0',operationMs:20*60_000,cleanupMs:2*60_000,
  childMs:8*60_000,diagnosticBytes:1024*1024,fileBytes:8*1024*1024,totalBytes:32*1024*1024});
const IMAGES=Object.freeze({db:'supabase/postgres:17.6.1.167',kong:'kong:2.8.1',auth:'supabase/gotrue:v2.196.0'});
const EXCLUDE='realtime,storage-api,imgproxy,edge-runtime,postgres-meta,studio,supavisor,logflare,vector,mailpit,postgrest';
const FILES=['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql'];
const ARCHIVE_FILES=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const ARCHIVE_SQL=Object.freeze({fileBytes:1_000_000_000,totalBytes:2_000_000_000,chunkBytes:64*1024});
const ARCHIVE_SQL_OWNERS=['ROLES','ROLE_SWITCH','SCHEMA','SCHEMA_ROLE_CHECK','REPLICA_SETTING','DATA','DATA_ROLE_CHECK','HISTORY','UNKNOWN'];
const ARCHIVE_POSTGRES_ROLE_CHECK="DO $rr_restore$ BEGIN IF session_user <> 'supabase_admin' OR current_user <> 'postgres' THEN RAISE SQLSTATE '42501'; END IF; END; $rr_restore$;\n";
const DOCUMENTED_CLI_LOGIN_GRANT='GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";';
const ARCHIVE_SQL_STATEMENTS=['UNKNOWN','CREATE_ROLE','ALTER_ROLE','GRANT_ROLE','REVOKE_ROLE','COMMENT_ROLE','CLI_LOGIN_POSTGRES_GRANT'];
const ARCHIVE_ROLE_STATEMENT_STATES=new Set(['SQLSTATE_42501','SQLSTATE_42704']);
const MAX_ROLE_CLASS_LINES=8192;
const ROLE_STATEMENT_CATEGORIES=Object.freeze({
  'CREATE ROLE':'CREATE_ROLE','ALTER ROLE':'ALTER_ROLE',
  GRANT:'GRANT_ROLE',REVOKE:'REVOKE_ROLE','COMMENT ON ROLE':'COMMENT_ROLE',
});
const ARCHIVE_CONFIRMATION='RESTORE-PRIVATE-ARCHIVE-IN-ISOLATED-LOCAL-POSTGRES';
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
function ownedContainer(info,project,service,archive=false){
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
  need(published===(archive||service==='auth'?0:1),'CONTAINER_PORT_COUNT');
  if(archive)need(info.NetworkSettings.Networks[project.network]?.NetworkID===project.networkId,'ARCHIVE_CONTAINER_NETWORK_ID');
  need(info.State?.Running===true&&info.State?.Health?.Status==='healthy','CONTAINER_NOT_HEALTHY');return info.Id;
}
function ownedArchiveNetwork(info,c,p){
  return info?.Name===p.network&&info.Id===p.networkId&&info.Internal===true
    &&info.Labels?.['ravradar.synthetic.restore.owner']===c.owner;
}
function isolatedArchiveNetwork(info,c,p){
  need(ownedArchiveNetwork(info,c,p)&&Object.keys(info.Containers??{}).length===0,'ARCHIVE_NETWORK_NOT_ISOLATED');
}
function archiveDbEndpoint(info,network,c,p){
  const id=ownedContainer(info,p,'db',true);
  need(ownedArchiveNetwork(network,c,p)&&network.Driver==='bridge'&&network.Scope==='local','ARCHIVE_DB_RELAY_NETWORK');
  const endpoint=info.NetworkSettings.Networks[p.network],member=network.Containers?.[id];
  const address=endpoint.IPAddress,subnets=network.IPAM?.Config;
  const subnet=Array.isArray(subnets)&&subnets.length===1&&subnets[0].Subnet;
  const [networkAddress,prefix,extra]=typeof subnet==='string'?subnet.split('/'):[];
  need(isIPv4(address)&&isIPv4(networkAddress)&&/^(?:[89]|[12][0-9]|3[01])$/.test(prefix)&&extra===undefined,
    'ARCHIVE_DB_RELAY_SUBNET');
  const [first,second]=address.split('.').map(Number);
  const allowed=new BlockList();allowed.addSubnet(networkAddress,Number(prefix),'ipv4');
  need((first===10||first===172&&second>=16&&second<=31||first===192&&second===168)
    &&allowed.check(address,'ipv4')&&address!==networkAddress
    &&member?.Name===info.Name.slice(1)&&member.IPv4Address===address+'/'+prefix
    &&endpoint.IPPrefixLen===Number(prefix)&&/^[a-f0-9]{64}$/.test(endpoint.EndpointID??'')
    &&member.EndpointID===endpoint.EndpointID,'ARCHIVE_DB_RELAY_ENDPOINT');
  return {address,identity:id+':'+endpoint.EndpointID};
}
async function inspectArchiveDocker(route,signal){
  const response=await new Promise((resolve,reject)=>{
    const request=httpGet({socketPath:'/var/run/docker.sock',path:route,agent:false,signal},resolve);
    request.once('error',reject);
  });
  try{
    need(response.statusCode===200,'ARCHIVE_DB_RELAY_INSPECT');
    const chunks=[];let bytes=0;
    for await(const chunk of response){
      bytes+=chunk.length;need(bytes<=512*1024,'ARCHIVE_DB_RELAY_INSPECT_BOUND');chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }finally{response.destroy();}
}
async function openLoopbackRelay(resolveTarget,listenPort,targetPort){
  const cancel=new AbortController(),sockets=new Set(),pending=new Set();
  let closing=false,listenerFailed=false;
  const track=socket=>{
    sockets.add(socket);
    socket.on('error',()=>socket.destroy());
    socket.once('close',()=>sockets.delete(socket));
    return socket;
  };
  const forward=async client=>{
    const signal=AbortSignal.any([cancel.signal,AbortSignal.timeout(5000)]);
    const target=await resolveTarget(signal);
    if(closing||client.destroyed)return;
    const peer=track(createConnection({host:target.address,port:targetPort,family:4}));
    client.once('close',()=>peer.destroy());
    peer.once('close',()=>client.destroy());
    await once(peer,'connect',{signal});
    const fresh=await resolveTarget(signal);
    need(fresh.address===target.address&&fresh.identity===target.identity,'ARCHIVE_DB_RELAY_ENDPOINT_CHANGED');
    if(!closing&&!client.destroyed&&!peer.destroyed){client.pipe(peer);peer.pipe(client);}
  };
  const listener=createServer({pauseOnConnect:true},client=>{
    track(client);
    if(closing){client.destroy();return;}
    const task=forward(client).catch(()=>client.destroy()).finally(()=>pending.delete(task));
    pending.add(task);
  });
  listener.maxConnections=8;
  listener.on('error',()=>{listenerFailed=true;cancel.abort();});
  await new Promise((resolve,reject)=>{
    const refuse=()=>reject(Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code:'ARCHIVE_DB_RELAY_BIND'}));
    listener.once('error',refuse);
    listener.listen({host:'127.0.0.1',port:listenPort,exclusive:true},()=>{
      listener.off('error',refuse);resolve();
    });
  });
  const address=listener.address();
  return {address,async close(){
    closing=true;cancel.abort();
    const closed=new Promise((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));
    const socketClosures=[...sockets].map(socket=>new Promise(resolve=>{
      socket.once('close',resolve);socket.destroy();
    }));
    await Promise.all([closed,Promise.all(socketClosures),Promise.all(pending)]);
    need(!listener.listening&&sockets.size===0&&pending.size===0&&!listenerFailed,'ARCHIVE_DB_RELAY_NOT_CLOSED');
  }};
}
async function openArchiveDbRelay(c,p){
  need(c.archive===true&&p.side==='B'&&/^[1-9][0-9]{0,18}-1$/.test(c.owner)
    &&p.id==='rr_restore_'+c.owner.slice(0,-2)+'_1_b'&&p.network==='rr-restore-'+c.owner+'-b'
    &&/^[a-f0-9]{64}$/.test(p.networkId),'ARCHIVE_DB_RELAY_PROJECT');
  return openLoopbackRelay(async signal=>{
    const [info,network]=await Promise.all([
      inspectArchiveDocker('/containers/supabase_db_'+p.id+'/json',signal),
      inspectArchiveDocker('/networks/'+p.networkId,signal),
    ]);
    return archiveDbEndpoint(info,network,c,p);
  },54322,5432);
}
function safeError(error,stage){
  return {stage,code:/^[A-Z0-9_]+$/.test(error?.code??'')?error.code:'LOCAL_RESTORE_REFUSED',
    exit:Number.isInteger(error?.exit)?error.exit:null,externalDockerOutcome:'UNKNOWN_UNTIL_OWNED_READBACK',
    ...(ARCHIVE_SQL_OWNERS.includes(error?.inputOwner)?{inputOwner:error.inputOwner}:{}),
    ...(ARCHIVE_ROLE_STATEMENT_STATES.has(error?.code)&&ARCHIVE_SQL_STATEMENTS.includes(error.inputStatement)?{inputStatement:error.inputStatement}:{}),
    ...(error?.code==='SQLSTATE_42704'&&error.inputOwner==='ROLES'?{
       ...safeRoleOperands(error.inputRoleOperands),
       ...(stage==='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'&&isGrantRoleStatement(error.inputStatement)
         &&ROLE_OPERAND_LABELS.has(error.missingRoleClass)
         ?{missingRoleClass:error.missingRoleClass}:{}),
     }:{})};
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
function archiveInputDiagnostic(diagnostic,code,inputLines){
  const report={inputOwner:'UNKNOWN',...(ARCHIVE_ROLE_STATEMENT_STATES.has(code)&&Object.hasOwn(inputLines,'roleLineClasses')?{inputStatement:'UNKNOWN'}:{})};
  const text=diagnostic.toString('utf8');
  const frames=text.matchAll(/^psql:<stdin>:([1-9][0-9]{0,9}): ERROR: +([0-9A-Z]{5})(?:: ([^\r\n]*))?\r?$/gm);
  const frame=frames.next().value;
  if(!frame||!frames.next().done||code!=='SQLSTATE_'+frame[2])return report;
  const line=Number(frame[1]);
  const ranges=[...inputLines.ranges].filter(([,range])=>line>=range.first&&line<=range.last);
  if(ranges.length===1)report.inputOwner=ranges[0][0];
  if(report.inputStatement&&report.inputOwner==='ROLES'&&(text.match(/\bERROR:/g)??[]).length===1){
    const classified=inputLines.roleLineClasses?.[line-1];
    report.inputStatement=ARCHIVE_SQL_STATEMENTS[classified]??'UNKNOWN';
    if(code==='SQLSTATE_42704'&&report.inputStatement!=='UNKNOWN'){
      const operands=inputLines.roleLineOperands?.get(line);
      if(operands)report.inputRoleOperands=operands;
      const missing=frame[3]===undefined?null:UNDEFINED_ROLE_MESSAGE.exec(frame[3]);
      // The exact verbose location must be the final line. A role identifier can
      // contain quotes and newlines, so a matching first line alone is insufficient.
      if(isGrantRoleStatement(report.inputStatement)&&missing
        &&UNDEFINED_ROLE_LOCATION.test(text.slice(frame.index+frame[0].length))){
        report.missingRoleClass=roleOperandLabel(missing[1]);
      }
    }
  }
  return report;
}
// Recognise only complete single-line statements from a role dump prefix.
// A multi-line string, comment, psql command or unfamiliar construct leaves attribution unknown.
const ROLE_DUMP_PREFIX=/^((?:CREATE|ALTER) ROLE|GRANT|REVOKE|COMMENT ON ROLE) (?:(?:[A-Za-z0-9_ \t,.=]|"(?:[^"\\\r\n]|"")*"|'(?:[^'\\\r\n]|'')*'))+;$/;
// Exact public upstream labels plus its two reserved name patterns. None of the
// labels asserts that the corresponding role was present or was the missing object.
const FIXED_ROLE_LABELS=new Map([
  ['anon','ANON'],['authenticated','AUTHENTICATED'],['authenticator','AUTHENTICATOR'],
  ['dashboard_user','DASHBOARD_USER'],['pgbouncer','PGBOUNCER'],['postgres','POSTGRES'],
  ['service_role','SERVICE_ROLE'],['pgsodium_keyholder','PGSODIUM_KEYHOLDER'],
  ['pgsodium_keyiduser','PGSODIUM_KEYIDUSER'],['pgsodium_keymaker','PGSODIUM_KEYMAKER'],
  ['pgtle_admin','PGTLE_ADMIN'],['supabase_admin','SUPABASE_ADMIN'],['cli_login_postgres','CLI_LOGIN_POSTGRES'],
  // Public upstream role labels only; no role is created or granted here.
  ['supabase_auth_admin','SUPABASE_AUTH_ADMIN'],
  ['supabase_etl_admin','SUPABASE_ETL_ADMIN'],
  ['supabase_functions_admin','SUPABASE_FUNCTIONS_ADMIN'],
  ['supabase_privileged_role','SUPABASE_PRIVILEGED_ROLE'],
  ['supabase_read_only_user','SUPABASE_READ_ONLY_USER'],
  ['supabase_replication_admin','SUPABASE_REPLICATION_ADMIN'],
  ['supabase_storage_admin','SUPABASE_STORAGE_ADMIN'],
]);
const ROLE_OPERAND_LABELS=new Set([...FIXED_ROLE_LABELS.values(),'RESERVED_SUPABASE_NAMESPACE','RESERVED_CLI_LOGIN_NAMESPACE','OTHER_ROLE_IDENTIFIER']);
const FIXED_GUC_LABELS=new Map([['session_replication_role','SESSION_REPLICATION_ROLE'],
  ['statement_timeout','STATEMENT_TIMEOUT'],['track_io_timing','TRACK_IO_TIMING']]);
const GUC_OPERAND_LABELS=new Set([...FIXED_GUC_LABELS.values(),'PGRST_NAMESPACE','PGAUDIT_NAMESPACE','OTHER_GUC_IDENTIFIER']);
const QUOTED_ROLE_IDENTIFIER='"([A-Za-z_][A-Za-z0-9_]{0,62})"';
const UNDEFINED_ROLE_MESSAGE=new RegExp('^role '+QUOTED_ROLE_IDENTIFIER+' does not exist$');
const UNDEFINED_ROLE_LOCATION=/^\r?\nLOCATION: +get_role_oid, acl\.c:[1-9][0-9]{0,9}\r?\n?$/;
const isGrantRoleStatement=value=>value==='GRANT_ROLE'||value==='CLI_LOGIN_POSTGRES_GRANT';
const ALTER_ROLE_CONFIG_OPERANDS=new RegExp('^ALTER ROLE '+QUOTED_ROLE_IDENTIFIER+' SET "([a-z][a-z0-9_.]{0,62})" TO .+;$');
const ALTER_ROLE_ATTRIBUTE_OPERANDS=new RegExp('^ALTER ROLE '+QUOTED_ROLE_IDENTIFIER+' WITH .+;$');
const GRANT_ROLE_OPERANDS=new RegExp('^GRANT '+QUOTED_ROLE_IDENTIFIER+' TO '+QUOTED_ROLE_IDENTIFIER
  +'(?: WITH (?:ADMIN OPTION|(?:ADMIN|INHERIT|SET) (?:TRUE|FALSE)(?:, (?:ADMIN|INHERIT|SET) (?:TRUE|FALSE))*))?'
  +'(?: GRANTED BY '+QUOTED_ROLE_IDENTIFIER+')?;$');
const REVOKE_ROLE_OPERANDS=new RegExp('^REVOKE '+QUOTED_ROLE_IDENTIFIER+' FROM '+QUOTED_ROLE_IDENTIFIER
  +'(?: GRANTED BY '+QUOTED_ROLE_IDENTIFIER+')?(?: CASCADE| RESTRICT)?;$');

function roleOperandLabel(name){
  return FIXED_ROLE_LABELS.get(name)??(name.startsWith('supabase_')?'RESERVED_SUPABASE_NAMESPACE':
    name.startsWith('cli_login_')?'RESERVED_CLI_LOGIN_NAMESPACE':'OTHER_ROLE_IDENTIFIER');
}
function roleLineOperands(line){
  const config=ALTER_ROLE_CONFIG_OPERANDS.exec(line);
  if(config){
    const [,name,guc]=config;
    return {form:'ALTER_ROLE_CONFIG',role:roleOperandLabel(name),guc:FIXED_GUC_LABELS.get(guc)??
      (guc.startsWith('pgrst.')?'PGRST_NAMESPACE':guc.startsWith('pgaudit.')?'PGAUDIT_NAMESPACE':'OTHER_GUC_IDENTIFIER')};
  }
  const attributes=ALTER_ROLE_ATTRIBUTE_OPERANDS.exec(line);
  if(attributes)return {form:'ALTER_ROLE_ATTRIBUTES',role:roleOperandLabel(attributes[1])};
  const membership=GRANT_ROLE_OPERANDS.exec(line)??REVOKE_ROLE_OPERANDS.exec(line);
  if(!membership)return null;
  const [,role,member,grantor]=membership;
  return {form:line.startsWith('GRANT ')?'GRANT_ROLE':'REVOKE_ROLE',
    role:roleOperandLabel(role),member:roleOperandLabel(member),grantor:grantor?roleOperandLabel(grantor):'UNSPECIFIED'};
}
function safeRoleOperands(value){
  if(!value||!ROLE_OPERAND_LABELS.has(value.role))return {};
  const {form,role,member,grantor,guc}=value;
  if(form==='ALTER_ROLE_ATTRIBUTES')return {inputRoleOperands:{form,role}};
  if(form==='ALTER_ROLE_CONFIG'&&GUC_OPERAND_LABELS.has(guc))return {inputRoleOperands:{form,role,guc}};
  if((form==='GRANT_ROLE'||form==='REVOKE_ROLE')&&ROLE_OPERAND_LABELS.has(member)
    &&(grantor==='UNSPECIFIED'||ROLE_OPERAND_LABELS.has(grantor)))return {inputRoleOperands:{form,role,member,grantor}};
  return {};
}

function finishRoleLine(s){
  const length=s.length;
  if(length<=s.buffer.length){
    const line=s.buffer.toString('latin1',0,length-(s.buffer[length-1]===13?1:0));
    const statement=s.prefixSafe&&/^[\x20-\x7e\t]*$/.test(line)&&ROLE_DUMP_PREFIX.exec(line);
    if(statement&&s.line<=s.classes.length){
      const category=line===DOCUMENTED_CLI_LOGIN_GRANT?'CLI_LOGIN_POSTGRES_GRANT':
        ROLE_STATEMENT_CATEGORIES[statement[1]];
      s.classes[s.line-1]=ARCHIVE_SQL_STATEMENTS.indexOf(category);
      const operands=roleLineOperands(line);
      if(operands)s.operands.set(s.line,operands);
    }
    if(s.prefixSafe)s.prefixSafe=statement||/^[ \t]*(?:--[^\r\n]*)?$/.test(line)
      ||/^\\restrict [A-Za-z0-9]+$/.test(line)||/^SET (?:default_transaction_read_only = off|client_encoding = 'UTF8'|standard_conforming_strings = on);$/.test(line);
  }else s.prefixSafe=false;
  s.length=0;s.line++;
}
function scanRoleLines(s,chunk){
  let from=0;
  for(;;){
    const newline=chunk.indexOf(10,from),end=newline<0?chunk.length:newline;
    if(s.length<=s.buffer.length&&s.length+end-from<=s.buffer.length){
      chunk.copy(s.buffer,s.length,from,end);s.length+=end-from;
    }else s.length=s.buffer.length+1;
    if(newline<0)return;
    finishRoleLine(s);from=newline+1;
  }
}

function restoreBytes(buffers,history=false){
  need(Array.isArray(buffers)&&buffers.length===(history?2:3)&&buffers.every(Buffer.isBuffer),'RESTORE_BYTES');
  return history?Buffer.concat(buffers.flatMap(b=>[b,Buffer.from('\n')])):
    Buffer.concat([buffers[0],Buffer.from('\n'),buffers[1],Buffer.from('\nSET session_replication_role = replica;\n'),buffers[2],Buffer.from('\n')]);
}
function restoreChildEnvironment(env,home,root,bin){
  const child={PATH:env.PATH,HOME:home,TMPDIR:root,LANG:'C.UTF-8',LC_ALL:'C.UTF-8',CI:'true',SUPABASE_TELEMETRY_DISABLED:'true'};
  // The pinned setup action selects this public registry for CLI 2.117.0.
  if(bin==='supabase'&&env.SUPABASE_INTERNAL_IMAGE_REGISTRY==='ghcr.io')child.SUPABASE_INTERNAL_IMAGE_REGISTRY='ghcr.io';
  return child;
}
function archiveSelection(env){
  const match=/^rr-supabase-restore-v1:([a-f0-9]{64})$/.exec(env.RESTORE_ARCHIVE_INDEX_COMMITMENT??'');
  need(match&&!env.RESTORE_ARCHIVE_INDEX_SHA&&env.RESTORE_ARCHIVE_CONFIRMATION===ARCHIVE_CONFIRMATION,
    'EXPLICIT_ARCHIVE_RESTORE_REQUIRED');
  need(env.GITHUB_REF==='refs/heads/main','ARCHIVE_MAIN_REQUIRED');
  return match[1];
}

async function materializeArchiveInputs(c,indexCommitmentSha256,{env=process.env,archive=null}={}){
  need(/^[a-f0-9]{64}$/.test(indexCommitmentSha256),'ARCHIVE_INDEX_COMMITMENT');
  const area=path.join(c.root,'archive-materialization');await fs.mkdir(area,{mode:0o700});
  const destination=path.join(area,'sql');
  need(!(await fs.lstat(destination).catch(e=>{if(e.code==='ENOENT')return null;throw e;})),'ARCHIVE_DESTINATION_EXISTS');
  const keys=['RUNNER_TEMP','SUPABASE_SERVICE_ROLE_KEY','RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'];
  const archiveEnv=Object.fromEntries(keys.filter(k=>typeof env[k]==='string').map(k=>[k,env[k]]));
  // The normal materializer's cipher scratch and plaintext sink are both owned by this lifecycle.
  archiveEnv.RUNNER_TEMP=c.root;
  need(typeof archiveEnv.SUPABASE_SERVICE_ROLE_KEY==='string'&&archiveEnv.SUPABASE_SERVICE_ROLE_KEY.length>=32,'ARCHIVE_MASTER_REQUIRED');
  const remaining=c.deadline-Date.now();need(remaining>0,'OPERATION_DEADLINE');
  const signal=AbortSignal.timeout(remaining);
  const materialize=archive??(await import('./archive-supabase-database-backup.mjs')).runSupabaseDatabaseArchive;
  const receipt=await materialize({mode:'materialize',destination,indexCommitmentSha256},{env:archiveEnv,signal,
    fetchImpl:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([signal,options.signal]):signal})});
  need(receipt?.status==='R2_BOOTSTRAP_FIVE_SQL_FILES_MATERIALIZED_ONLY'&&receipt.indexCommitmentSha256===indexCommitmentSha256
    &&!Object.hasOwn(receipt,'indexSha256')&&!Object.hasOwn(receipt,'candidates')
    &&receipt.remoteArchiveVerified===true&&receipt.materializationCompleted===true&&receipt.selectionRequired===false
    &&receipt.archiveWrittenThisOperation===false&&receipt.centralLocatorWrittenThisOperation===false
    &&receipt.databaseRestoreExecuted===false&&receipt.authRestoreVerified===false&&receipt.fullDatabaseBackupVerified===false
    &&receipt.freeReady===false&&/^[a-f0-9]{64}$/.test(receipt.manifestSha256??''),'ARCHIVE_MATERIALIZATION_RECEIPT');
  need(Array.isArray(receipt.files)&&receipt.files.length===5,'ARCHIVE_FIVE_FILES');
  let total=0;
  for(let i=0;i<5;i++){const f=receipt.files[i];need(f?.file===ARCHIVE_FILES[i]&&Number.isSafeInteger(f.bytes)
    &&f.bytes>0&&f.bytes<=ARCHIVE_SQL.fileBytes&&/^[a-f0-9]{64}$/.test(f.sha256??''),'ARCHIVE_FILE_DESCRIPTOR');total+=f.bytes;}
  need(total===receipt.totalSqlBytes&&Number.isSafeInteger(total)&&total<=ARCHIVE_SQL.totalBytes,'ARCHIVE_TOTAL_BYTES');
  const actual=(await fs.readdir(destination)).sort();assert.deepEqual(actual,[...ARCHIVE_FILES].sort());
  return {directory:destination,files:receipt.files,totalSqlBytes:total,manifestSha256:receipt.manifestSha256};
}
const fileIdentity=s=>({dev:s.dev,ino:s.ino,size:s.size,mtimeNs:s.mtimeNs,ctimeNs:s.ctimeNs});
function privateSqlFile(s){
  need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n,'ARCHIVE_SQL_FILE');
  if(process.platform==='linux')need((s.mode&0o077n)===0n&&s.uid===BigInt(process.getuid()),'ARCHIVE_SQL_PERMISSIONS');
}
async function* materializedRestoreBytes(c,archive,history=false,inputLines=null){
  function track(chunk,owner){
    if(!inputLines)return chunk;
    const first=inputLines.next;
    for(let at=chunk.indexOf(10);at!==-1;at=chunk.indexOf(10,at+1))inputLines.next++;
    if(owner)inputLines.ranges.set(owner,{first:inputLines.ranges.get(owner)?.first??first,
      last:inputLines.next-(chunk.at(-1)===10?1:0)});
    return chunk;
  }
  for(let at=archive.directory;;at=path.dirname(at)){
    need(at===c.root||inside(c.root,at),'ARCHIVE_SQL_DIRECTORY');const st=await fs.lstat(at);
    need(st.isDirectory()&&!st.isSymbolicLink(),'ARCHIVE_SQL_DIRECTORY');if(at===c.root)break;
  }
  const directory=await fs.lstat(archive.directory,{bigint:true});
  need(directory.isDirectory()&&!directory.isSymbolicLink()&&inside(c.root,archive.directory),'ARCHIVE_SQL_DIRECTORY');
  const names=history?ARCHIVE_FILES.slice(3):ARCHIVE_FILES.slice(0,3);
  for(let i=0;i<names.length;i++){
    const name=names[i],entry=archive.files.find(f=>f.file===name);need(entry,'ARCHIVE_FILE_DESCRIPTOR');
    if(!history&&i===1)yield track(Buffer.from('SET LOCAL ROLE postgres;\n'+ARCHIVE_POSTGRES_ROLE_CHECK),'ROLE_SWITCH');
    if(!history&&i===2){
      yield track(Buffer.from(ARCHIVE_POSTGRES_ROLE_CHECK),'SCHEMA_ROLE_CHECK');
      yield track(Buffer.from('SET session_replication_role = replica;\n'),'REPLICA_SETTING');
    }
    const owner=history?'HISTORY':['ROLES','SCHEMA','DATA'][i];
    const roleLines=owner==='ROLES'&&inputLines&&Object.hasOwn(inputLines,'roleLineClasses')?
      {line:inputLines.next,buffer:Buffer.alloc(512),length:0,prefixSafe:true,
        classes:new Uint8Array(MAX_ROLE_CLASS_LINES),operands:new Map()}:null;
    const file=path.join(archive.directory,name),named=await fs.lstat(file,{bigint:true});privateSqlFile(named);
    const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
    try{
      const before=await h.stat({bigint:true});privateSqlFile(before);
      assert.deepEqual(fileIdentity(before),fileIdentity(named));need(before.size===BigInt(entry.bytes),'ARCHIVE_SQL_LENGTH');
      const digest=crypto.createHash('sha256'),buffer=Buffer.alloc(ARCHIVE_SQL.chunkBytes);let count=0;
      for(;;){need(Date.now()<c.deadline,'OPERATION_DEADLINE');const {bytesRead}=await h.read(buffer,0,buffer.length,null);
        if(!bytesRead)break;count+=bytesRead;need(count<=entry.bytes,'ARCHIVE_SQL_LENGTH');
        const chunk=buffer.subarray(0,bytesRead);digest.update(chunk);
        if(roleLines)scanRoleLines(roleLines,chunk);
        yield track(Buffer.from(chunk),owner);}
      const after=await h.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});privateSqlFile(fresh);
      assert.deepEqual(fileIdentity(before),fileIdentity(after));assert.deepEqual(fileIdentity(after),fileIdentity(fresh));
      need(count===entry.bytes&&digest.digest('hex')===entry.sha256,'ARCHIVE_SQL_SHA');
      const current=await fs.lstat(archive.directory,{bigint:true});
      need(current.isDirectory()&&!current.isSymbolicLink()&&current.dev===directory.dev&&current.ino===directory.ino,'ARCHIVE_SQL_DIRECTORY_CHANGED');
      if(roleLines){
        if(roleLines.length)finishRoleLine(roleLines);
        inputLines.roleLineClasses=roleLines.classes;
        inputLines.roleLineOperands=roleLines.operands;
      }
    }finally{await h.close();}
    yield track(Buffer.from('\n'));
  }
  if(!history)yield track(Buffer.from(ARCHIVE_POSTGRES_ROLE_CHECK),'DATA_ROLE_CHECK');
}

// Same owned process-group timeout shape as export-supabase-database.mjs.
// Process closure never claims that a Docker daemon-side operation has stopped.
async function command(c,stage,bin,args,{cwd=c.root,input=null,maxMs=P.childMs,audit=null,archivePsql=false,inputLines=null}={}){
  c.stage=stage;need(Date.now()<c.deadline,'OPERATION_DEADLINE');
  need(input===null||Buffer.isBuffer(input)||typeof input?.[Symbol.asyncIterator]==='function','RESTORE_INPUT_STREAM');
  let child,closed=false,exit=null,signal=null,first=null,outBytes=0,errBytes=0,inputStream=null,inputPump=null,inputDone=false,stdinClosed=false;
  const out=[],err=[],started=Date.now();
  const fail=code=>{first??=Object.assign(new Error('LOCAL_RESTORE_FAILED_CLOSED'),{code});};
  const interrupted=()=>fail('INTERRUPTED');
  const stdinFailure=e=>{
    const closedPipe=e?.code==='EPIPE'||e?.code==='ERR_STREAM_PREMATURE_CLOSE'
      ||(process.platform==='win32'&&e?.code==='EOF');
    if(archivePsql&&closedPipe)stdinClosed=true;
    else fail('STDIN_TRANSPORT');
  };
  const inputFailure=e=>fail(/^ARCHIVE_SQL_|^OPERATION_DEADLINE$/.test(e?.code??'')?e.code:'STDIN_TRANSPORT');
  try{
    child=spawn(bin,args,{cwd,env:restoreChildEnvironment(process.env,c.home,c.root,bin),shell:false,detached:true,stdio:['pipe','pipe','pipe']});
    child.on('error',()=>fail('SPAWN_FAILED'));
    child.on('exit',(v,s)=>{
      exit=v;signal=s;
      if((v!==0||s!==null)&&!(archivePsql&&v===3&&s===null))fail('CHILD_EXIT');
    });
    child.on('close',()=>{closed=true;});
    child.stdout.on('data',b=>{outBytes+=b.length;if(outBytes>P.diagnosticBytes)fail('STDOUT_BOUND');else out.push(Buffer.from(b));});
    child.stderr.on('data',b=>{errBytes+=b.length;if(errBytes>P.diagnosticBytes)fail('STDERR_BOUND');else err.push(Buffer.from(b));});
    child.stdout.on('error',()=>fail('STDOUT_TRANSPORT'));child.stderr.on('error',()=>fail('STDERR_TRANSPORT'));
    child.stdin.on('error',stdinFailure);
    if(input!==null&&!Buffer.isBuffer(input)){
      // Readable.from can propagate a sink error back into its source. Record failures of
      // the actual archive iterator first, and do not inject sink errors into that iterator.
      const iterator=archivePsql?input[Symbol.asyncIterator]():null;
      const checked=async read=>{try{return await read();}catch(e){inputFailure(e);throw e;}};
      inputStream=Readable.from(iterator?{
        [Symbol.asyncIterator](){return this;},
        next:()=>checked(()=>iterator.next()),
        return:()=>checked(()=>iterator.return?.()??{done:true}),
      }:input,{objectMode:false});
      if(!archivePsql)inputStream.on('error',inputFailure);
      inputPump=pipeline(inputStream,child.stdin).then(()=>{inputDone=true;},e=>{
        (archivePsql?stdinFailure:inputFailure)(e);inputDone=true;});
    }else{child.stdin.end(input??undefined);inputDone=true;}
    process.on('SIGINT',interrupted);process.on('SIGTERM',interrupted);
    while(!closed&&!first){
      if(Date.now()>=c.deadline||Date.now()-started>=maxMs)fail('CHILD_TIMEOUT');
      if(audit)try{await audit();}catch(e){first??=e;}
      if(!first)await sleep(40);
    }
    if(!archivePsql&&!inputDone)fail('STDIN_INCOMPLETE');
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
    if(archivePsql){
      if(!inputDone)inputStream?.destroy();
      await inputPump;
      if(!first&&exit===3&&signal===null){
        const bytes=Buffer.concat(err),diagnostic=diagnosticClass(bytes);
        fail(diagnostic.startsWith('SQLSTATE_')?diagnostic:'PSQL_SCRIPT_ERROR');
        if(inputLines&&diagnostic.startsWith('SQLSTATE_'))Object.assign(first,archiveInputDiagnostic(bytes,diagnostic,inputLines));
      }
      if(stdinClosed)fail('STDIN_TRANSPORT');
      if(!inputDone)fail('STDIN_INCOMPLETE');
    }
    if(first){if(first.code==='CHILD_EXIT')first.code=diagnosticClass(Buffer.concat(err));first.exit=exit;throw first;}
    return Buffer.concat(out);
  }finally{
    process.removeListener('SIGINT',interrupted);process.removeListener('SIGTERM',interrupted);
    child?.stdin?.destroy();child?.stdout?.destroy();child?.stderr?.destroy();
    inputStream?.destroy();await inputPump;
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
    ...(c.archive?['--internal']:[]),
    '--label','ravradar.synthetic.restore.owner='+c.owner,'--opt','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',p.network]);
  p.networkId=raw.toString().trim();need(/^[a-f0-9]{64}$/.test(p.networkId),'NETWORK_CREATE_OUTCOME_UNKNOWN');p.networkCreated=true;
  if(c.archive)isolatedArchiveNetwork((await jsonCommand(c,'ARCHIVE_INTERNAL_NETWORK',['network','inspect',p.network]))[0],c,p);
  // Docker does not publish ports on an internal-only bridge. The CLI's fresh
  // database setup still dials loopback; close its temporary path before SQL or archive access.
  c.stage='ARCHIVE_DB_RELAY_BIND';
  const relay=c.archive?await openArchiveDbRelay(c,p):null;
  p.startAttempted=true;
  try{
    await command(c,'START_'+p.side,'supabase',['--network-id',p.network,'start','--exclude',EXCLUDE],{cwd:p.dir});
  }finally{if(relay)await relay.close();}
  const actual={};
  for(const service of ['db','kong','auth']){
    const info=(await jsonCommand(c,'INSPECT_'+p.side+'_'+service,['inspect','supabase_'+service+'_'+p.id]))[0];
    p[service]=ownedContainer(info,p,service,c.archive);const image=(await jsonCommand(c,'IMAGE_'+service,['image','inspect',info.Image]))[0];
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
async function psql(c,p,stage,bytes,inputLines=null){
  return command(c,stage,'docker',['exec','-i','-e','PGPASSWORD='+decodeURIComponent(p.dbUrl.password),p.db,'psql','-X',
    '--host=127.0.0.1','--port=5432','--username=postgres','--dbname=postgres','--quiet','--single-transaction','--variable=ON_ERROR_STOP=1',
    '--set=VERBOSITY=sqlstate','--tuples-only','--no-align',...(inputLines?['--file=-']:[])],
    {input:bytes,maxMs:90_000,archivePsql:c.archive===true&&!Buffer.isBuffer(bytes),inputLines});
}
function archiveBootstrapPsqlArguments(c,p){
  need(c.archive===true&&p.side==='B'&&/^[a-f0-9]{64}$/.test(p.db??''),'ARCHIVE_BOOTSTRAP_TARGET');
  const shell=[
    'test "${POSTGRES_HOST:-}" = /var/run/postgresql',
    'test -n "${POSTGRES_PASSWORD:-}"',
    'unset PGSERVICE PGSERVICEFILE PGOPTIONS',
    'PGPASSWORD="$POSTGRES_PASSWORD" PGPASSFILE=/dev/null PGCONNECT_TIMEOUT=5 LC_ALL=C exec psql -X -w --host=/var/run/postgresql --port=5432 --username=supabase_admin --dbname=postgres --quiet --single-transaction --variable=ON_ERROR_STOP=1 --set=VERBOSITY=verbose --set=SHOW_CONTEXT=never --tuples-only --no-align --command="$1" --file=-',
  ].join('\n');
  // Run the initial role assertion before stdin so archive error line numbers stay physical.
  const bootstrapRole="DO $rr_restore$ BEGIN IF session_user <> 'supabase_admin' OR current_user <> 'supabase_admin' THEN RAISE SQLSTATE '42501'; END IF; END; $rr_restore$;";
  return ['exec','-i',p.db,'sh','-ceu',shell,'archive-bootstrap',bootstrapRole];
}
function restoreArchiveSql(c,p,stage,archive,history=false){
  const inputLines={next:1,ranges:new Map(),...(history?{}:{roleLineClasses:null})};
  const input=materializedRestoreBytes(c,archive,history,inputLines);
  if(history)return psql(c,p,stage,input,inputLines);
  return command(c,stage,'docker',archiveBootstrapPsqlArguments(c,p),{input,maxMs:90_000,archivePsql:true,inputLines});
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
// CLI dump runs inside this exact owned bridge, so its destination is the
// verified DB container's internal endpoint, never the host's loopback port.
// The status URL still passes the unchanged strict loopback guard first.
function ownedDumpArguments(c,p,info){
  need(arguments.length===3,'OWNED_DUMP_ARGUMENTS');
  need(c?.archive===false&&/^[1-9][0-9]{0,18}-1$/.test(c?.owner??''),'SYNTHETIC_DUMP_ONLY');
  const run=c.owner.slice(0,-2);
  need(p?.side==='A'&&p.id==='rr_restore_'+run+'_1_a'
    &&p.network==='rr-restore-'+c.owner+'-a','OWNED_DUMP_PROJECT');
  need(/^[a-f0-9]{64}$/.test(p.db??'')&&/^[a-f0-9]{64}$/.test(p.networkId??''),'OWNED_DUMP_IDENTITY');
  const local=localUrl(p.dbUrl?.href,'db');
  need(ownedContainer(info,p,'db')===p.db,'OWNED_DUMP_DB_ID');
  need(info.NetworkSettings.Networks[p.network]?.NetworkID===p.networkId,'OWNED_DUMP_NETWORK_ID');
  const target=new URL(local.href);target.hostname=info.Name.slice(1);target.port='5432';
  need(target.hostname==='supabase_db_'+p.id&&target.port==='5432'
    &&target.username===local.username&&target.password===local.password
    &&target.pathname==='/postgres'&&!target.search&&!target.hash,'OWNED_DUMP_TARGET');
  return Object.freeze(['--network-id',p.network,'db','dump','--db-url',target.href]);
}

async function dumpFiles(c,p){
  const info=(await jsonCommand(c,'DUMP_SOURCE_DB',['inspect',p.db]))[0];
  const dumpArguments=ownedDumpArguments(c,p,info);
  const dir=path.join(c.root,'dumps');await fs.mkdir(dir,{mode:0o700});
  const audit=async()=>{let n=0;for(const name of FILES){const s=await fs.lstat(path.join(dir,name)).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    if(s){need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1&&s.size<=P.fileBytes,'DUMP_FILE_BOUND');n+=s.size;}}need(n<=P.totalBytes,'DUMP_TOTAL_BOUND');};
  const flags=[['--role-only'],[],['--data-only','--use-copy'],['--schema','supabase_migrations'],['--schema','supabase_migrations','--data-only','--use-copy']];
  for(let i=0;i<FILES.length;i++)await command(c,'DUMP_'+i,'supabase',[...dumpArguments,...flags[i],'--file',path.join(dir,FILES[i])],{cwd:p.dir,audit});
  await audit();const bytes=[];for(const name of FILES){const file=path.join(dir,name),before=await fs.lstat(file,{bigint:true});
    need(before.isFile()&&!before.isSymbolicLink()&&before.nlink===1n&&before.size>0n,'DUMP_FILE');
    const value=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
    for(const key of ['dev','ino','size','mtimeNs','ctimeNs'])need(before[key]===after[key],'DUMP_CHANGED');
    need(BigInt(value.length)===before.size,'DUMP_LENGTH');bytes.push(value);c.dumps.push({name,bytes:value.length,sha256:sha(value)});}
  return bytes;
}

async function restoreArchive(c,b,indexCommitmentSha256){
  await startProject(c,b);
  need((await query(c,b,'ARCHIVE_TARGET_EMPTY','select to_jsonb((select count(*) from auth.users)=0);'))===true,'ARCHIVE_TARGET_NOT_EMPTY');
  const archive=await materializeArchiveInputs(c,indexCommitmentSha256);c.dumps=archive.files;
  await command(c,'QUIESCE_B_AUTH','docker',['stop','--time','10',b.auth],{maxMs:30_000});
  await restoreArchiveSql(c,b,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',archive);
  await restoreArchiveSql(c,b,'RESTORE_ARCHIVE_HISTORY',archive,true);
  const restored=await query(c,b,'ARCHIVE_RESTORED_CATALOG',`select jsonb_build_object(
    'database',current_database(),'role',current_user,'serverVersion',current_setting('server_version_num'),
    'publicTables',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p')),
    'authUsers',(select count(*) from auth.users),
    'migrationHistoryPresent',to_regclass('supabase_migrations.schema_migrations') is not null);`);
  need(restored.database==='postgres'&&restored.role==='postgres'&&/^17[0-9]{4}$/.test(restored.serverVersion),'ARCHIVE_RESTORED_DATABASE');
  await command(c,'RESTART_B_AUTH','docker',['start',b.auth],{maxMs:30_000});
  let healthy=false;const end=Math.min(c.deadline,Date.now()+60_000);
  while(Date.now()<end){const info=(await jsonCommand(c,'RESTORED_AUTH_HEALTH',['inspect',b.auth]))[0];
    if(info.State?.Health?.Status==='healthy'){ownedContainer(info,b,'auth',true);healthy=true;break;}await sleep(500);}
  need(healthy,'RESTORED_AUTH_NOT_HEALTHY');
  return {status:'PASS',scope:'authenticated-archive-isolated-sql-restore',sourceHead:process.env.EXPECTED_HEAD_SHA,cliVersion:P.cli,
    authenticatedFiveFileSqlExecuted:true,exactSqlBytesStreamed:true,isolatedAuthServiceHealthy:true,containerNetworkExternalEgressDisabled:true,
    localRestoredCatalogVerified:true,productionDatabaseRestoreExecuted:false,productionBackupVerified:false,
    productionAuthRestoreVerified:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,
    sourceDataParityVerified:false,storageObjectBytesRestored:false,erasureBarriersVerified:false,freeReady:false};
}
function restorePublicReport(c,result,error,closed){
  const scope=c.archive?'authenticated-archive-isolated-sql-restore':'synthetic-standard-cli-local-restore';
  return {...(result??{status:'FAILED_CLOSED',scope}),
    ...(error?{status:'FAILED_CLOSED',firstFailure:error}:{}),ownedDockerClosed:closed,
    ...(!c.archive?{images:c.images,dumpFiles:c.dumps,authRequests:c.authRequests,processes:c.processes}:{})};
}
async function fixture({archive=false}={}){
  need(process.platform==='linux'&&process.env.GITHUB_ACTIONS==='true'&&process.env.RUNNER_ENVIRONMENT==='github-hosted'
    &&process.env.RUNNER_OS==='Linux'&&process.env.GITHUB_EVENT_NAME==='workflow_dispatch','HOSTED_LINUX_ONLY');
  need(process.env.GITHUB_REPOSITORY==='jakobjorgensen82-commits/RavRadar'&&process.env.GITHUB_RUN_ATTEMPT==='1','FIXED_REPOSITORY_ATTEMPT');
  need(/^[a-f0-9]{40}$/.test(process.env.EXPECTED_HEAD_SHA??'')&&process.env.EXPECTED_HEAD_SHA===process.env.GITHUB_SHA,'EXACT_DISPATCHED_HEAD');
  const run=process.env.GITHUB_RUN_ID;need(/^[1-9][0-9]{0,18}$/.test(run??''),'RUN_ID');
  const indexCommitmentSha256=archive?archiveSelection(process.env):null;
  if(!archive)need(!process.env.RESTORE_ARCHIVE_INDEX_SHA&&!process.env.RESTORE_ARCHIVE_INDEX_COMMITMENT&&!process.env.RESTORE_ARCHIVE_CONFIRMATION,'SYNTHETIC_ARCHIVE_COLLISION');
  need(['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_CONFIG','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH','CONTAINER_HOST'].every(k=>!process.env[k]),'LOCAL_DOCKER_ENV');
  need(typeof process.env.RUNNER_TEMP==='string'&&path.isAbsolute(process.env.RUNNER_TEMP),'RUNNER_TEMP_REQUIRED');
  const temp=await fs.realpath(process.env.RUNNER_TEMP);need(temp!==path.parse(temp).root,'RUNNER_TEMP');
  const root=await fs.mkdtemp(path.join(temp,'rr-standard-restore-'));need(inside(temp,root),'OWNED_ROOT');await fs.chmod(root,0o700);
  const rootIdentity=await fs.lstat(root,{bigint:true});
  const home=path.join(root,'home');await fs.mkdir(home,{mode:0o700});const owner=run+'-1';
  const c={root,home,owner,archive,stage:'PREFLIGHT',deadline:Date.now()+P.operationMs,processes:[],authRequests:[],dumps:[],images:null};
  const projects=['A','B'].map(side=>({side,id:'rr_restore_'+run+'_1_'+side.toLowerCase(),dir:path.join(root,side),network:'rr-restore-'+owner+'-'+side.toLowerCase()}));
  let result,error=null;
  try{
    need((await command(c,'CLI_VERSION','supabase',['--version'],{maxMs:20_000})).toString().trim()===P.cli,'CLI_VERSION');
    need((await command(c,'DOCKER_LINUX','docker',['info','--format','{{.OSType}}'],{maxMs:20_000})).toString().trim()==='linux','DOCKER_LINUX');
    need((await command(c,'LOCAL_DAEMON','docker',['context','inspect','default','--format','{{.Endpoints.docker.Host}}'],{maxMs:20_000})).toString().trim()==='unix:///var/run/docker.sock','LOCAL_DAEMON');
    const [a,b]=projects;
    if(archive){
      await command(c,'ARCHIVE_CURRENT_MAIN','git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],{cwd:process.cwd(),maxMs:60_000});
      for(const ref of ['HEAD^{commit}','origin/main^{commit}'])
        need((await command(c,'ARCHIVE_EXACT_HEAD','git',['rev-parse',ref],{cwd:process.cwd(),maxMs:10_000})).toString().trim()===process.env.EXPECTED_HEAD_SHA,'ARCHIVE_MAIN_CHANGED');
      result=await restoreArchive(c,b,indexCommitmentSha256);
    }else{
    await startProject(c,a);
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
    }
  }catch(e){error=safeError(e,c.stage);}
  finally{
    c.deadline=Date.now()+P.cleanupMs;
    for(const p of projects)try{await stopProject(c,p);}catch(e){error??=safeError(e,'CLEANUP_'+p.side);}
    const closed=projects.every(p=>p.closed===true);
    if(!closed)error??={stage:'CLEANUP',code:'OWNED_DOCKER_CLOSURE_UNKNOWN',exit:null};
    if(closed)try{const st=await fs.lstat(root,{bigint:true});need(st.isDirectory()&&!st.isSymbolicLink()
      &&st.dev===rootIdentity.dev&&st.ino===rootIdentity.ino&&inside(temp,await fs.realpath(root)),'SCRATCH_IDENTITY');
      await fs.rm(root,{recursive:true,force:false});}catch(e){error??=safeError(e,'SCRATCH_CLEANUP');}
    const report=restorePublicReport(c,result,error,closed);
    console.log(JSON.stringify(report));if(error)process.exitCode=1;
  }
}

async function selfTest(){
  const {test}=await import('node:test');
  async function ownArchive(run,{large=false,receiptEdit=null,roleSql=null}={}){
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'rr-archive-stream-self-'));await fs.chmod(root,0o700);
    const c={root,deadline:Date.now()+30_000},source=[];let observed=null;
    const env={RUNNER_TEMP:os.tmpdir(),SUPABASE_SERVICE_ROLE_KEY:'synthetic-master-never-real-'.repeat(2),
      RAVRADAR_R2_ACCOUNT_ID:'synthetic-account',RAVRADAR_R2_ACCESS_KEY_ID:'synthetic-access',RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-secret',
      SUPABASE_DB_PASSWORD:'must-not-reach-restore',SUPABASE_ACCESS_TOKEN:'must-not-reach-restore',GITHUB_TOKEN:'must-not-reach-restore'};
    const index='a'.repeat(64);
    const materialize=async(options,dependencies)=>{
      observed={options,dependencies};assert.equal(options.mode,'materialize');assert.equal(options.indexCommitmentSha256,index);assert(!Object.hasOwn(options,'indexSha256'));
      assert.equal(options.destination,path.join(root,'archive-materialization','sql'));
      assert.deepEqual(Object.keys(dependencies.env).sort(),['RUNNER_TEMP','SUPABASE_SERVICE_ROLE_KEY','RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY'].sort());
      assert.equal(dependencies.env.RUNNER_TEMP,root);assert(dependencies.signal instanceof AbortSignal);
      await fs.mkdir(options.destination,{mode:0o700});const files=[];
      for(const [i,file]of ARCHIVE_FILES.entries()){
        const h=await fs.open(path.join(options.destination,file),'wx',0o600),digest=crypto.createHash('sha256');let bytes=0;
        try{const piece=Buffer.from(i===0&&roleSql!==null?roleSql:i===2?TEXT+'\n'+DECIMAL+'\n':file+'\n'),repeat=large&&i===2?Math.ceil((P.fileBytes+65536)/piece.length):1;
          for(let remaining=repeat;remaining>0;){const n=Math.min(1024,remaining),chunk=Buffer.from(piece.toString('utf8').repeat(n));
            await h.writeFile(chunk);digest.update(chunk);bytes+=chunk.length;remaining-=n;}source.push(piece);
        }finally{await h.close();}
        files.push({file,bytes,sha256:digest.digest('hex')});
      }
      const receipt={status:'R2_BOOTSTRAP_FIVE_SQL_FILES_MATERIALIZED_ONLY',indexCommitmentSha256:index,manifestSha256:'b'.repeat(64),
        remoteArchiveVerified:true,materializationCompleted:true,selectionRequired:false,archiveWrittenThisOperation:false,
        centralLocatorWrittenThisOperation:false,databaseRestoreExecuted:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,
        freeReady:false,files,totalSqlBytes:files.reduce((n,f)=>n+f.bytes,0)};
      if(receiptEdit)receiptEdit(receipt);return receipt;
    };
    try{await run({c,source,env,index,materialize,getObserved:()=>observed});}
    finally{await fs.rm(root,{recursive:true,force:false});}
  }
  const dumpFixture=()=>{
    const c={owner:'123-1',archive:false},p={side:'A',id:'rr_restore_123_1_a',network:'rr-restore-123-1-a',
      networkId:'b'.repeat(64),db:'a'.repeat(64),dbUrl:new URL('postgresql://postgres:synthetic%40%3A%2F%3F@127.0.0.1:54322/postgres')};
    const info={Id:p.db,Name:'/supabase_db_'+p.id,Config:{Labels:{'com.supabase.cli.project':p.id}},
      NetworkSettings:{Networks:{[p.network]:{NetworkID:p.networkId}},Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'54322'}]}},
      State:{Running:true,Health:{Status:'healthy'}}};
    return {c,p,info};
  };
  test('only exact loopback API and database URLs are accepted',()=>{
    assert.equal(localUrl('http://127.0.0.1:54321/','api').host,'127.0.0.1:54321');
    assert.equal(localUrl('postgresql://postgres:synthetic@127.0.0.1:54322/postgres','db').pathname,'/postgres');
    for(const value of ['https://example.com:54321/','http://localhost:54321/','http://127.0.0.1:54321/?token=x','http://u:p@127.0.0.1:54321/','http://127.0.0.1:54325/'])
      assert.throws(()=>localUrl(value,'api'));
    const {c,p,info}=dumpFixture(),before=p.dbUrl.href;
    const args=ownedDumpArguments(c,p,info),target=new URL(args.at(-1));
    assert.deepEqual(args.slice(0,-1),['--network-id',p.network,'db','dump','--db-url']);
    assert.equal(target.hostname,info.Name.slice(1));assert.equal(target.port,'5432');
    assert.equal(target.username,p.dbUrl.username);assert.equal(target.password,p.dbUrl.password);
    assert.equal(target.pathname,'/postgres');assert.equal(p.dbUrl.href,before);
    assert(Object.isFrozen(args));
    for(const flag of ['--local','--linked','--project-ref'])assert(!args.includes(flag));
    let operand=0;const extra=new Proxy({},{get(){operand++;throw new Error('UNEXPECTED_DUMP_OVERRIDE');}});
    assert.throws(()=>ownedDumpArguments(c,p,info,extra),e=>e.code==='OWNED_DUMP_ARGUMENTS');assert.equal(operand,0);
    for(const value of ['postgresql://postgres:synthetic@db.project.invalid:5432/postgres',
      'postgresql://postgres:synthetic@localhost:54322/postgres','postgresql://postgres:synthetic@127.0.0.1:5432/postgres',
      'postgresql://service_role:synthetic@127.0.0.1:54322/postgres']){
      const changed={...p,dbUrl:new URL(value)};assert.throws(()=>ownedDumpArguments(c,changed,info));
    }
  });
  test('container identity, project, network and real loopback health are required',()=>{
    const p={id:'rr_synthetic',network:'rr-net'},x={Id:'a'.repeat(64),Name:'/supabase_auth_rr_synthetic',Config:{Labels:{'com.supabase.cli.project':p.id}},
      NetworkSettings:{Networks:{'rr-net':{}},Ports:{'9999/tcp':null}},State:{Running:true,Health:{Status:'healthy'}}};
    assert.equal(ownedContainer(x,p,'auth'),x.Id);
    for(const edit of [v=>v.Name+='x',v=>v.Config.Labels['com.supabase.cli.project']='other',v=>v.NetworkSettings.Ports['9999/tcp']=[{HostIp:'0.0.0.0',HostPort:'9999'}],v=>v.State.Health.Status='starting']){
      const v=structuredClone(x);edit(v);assert.throws(()=>ownedContainer(v,p,'auth'));}
    const db=structuredClone(x);db.Name='/supabase_db_'+p.id;db.NetworkSettings.Ports={'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'54322'}]};
    assert.equal(ownedContainer(db,p,'db'),db.Id);db.NetworkSettings.Ports['5432/tcp'][0].HostPort='54323';assert.throws(()=>ownedContainer(db,p,'db'));
    for(const edit of [v=>{v.c.archive=true;},v=>{v.c.owner='other';},v=>{v.p.side='B';},
      v=>{v.p.id='linked_project_ref';},v=>{v.p.network='foreign-network';},v=>{v.p.db='c'.repeat(64);},
      v=>{v.info.Name='/foreign';},v=>{v.info.Id='c'.repeat(64);},
      v=>{v.info.Config.Labels['com.supabase.cli.project']='foreign';},
      v=>{v.info.NetworkSettings.Networks[v.p.network].NetworkID='c'.repeat(64);},
      v=>{v.info.NetworkSettings.Networks.extra={NetworkID:'c'.repeat(64)};},
      v=>{v.info.NetworkSettings.Ports['5432/tcp'][0].HostIp='0.0.0.0';},v=>{v.info.State.Health.Status='starting';}]){
      const v=dumpFixture();edit(v);assert.throws(()=>ownedDumpArguments(v.c,v.p,v.info));
    }
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
  test('archive psql exit 3 retains only the SQLSTATE across early stdin closure',async()=>{
    const c={root:os.tmpdir(),home:os.tmpdir(),deadline:Date.now()+15_000,processes:[]};
    const child=(diagnostic,exit=3)=>['-e','process.stderr.write('+JSON.stringify(diagnostic)+',()=>process.exit('+exit+'))'];
    async function* pending(){const chunk=Buffer.alloc(128*1024);for(let i=0;i<64;i++)yield chunk;}
    for(const [diagnostic,exit,code]of [['psql:<stdin>:7: ERROR: 23505 synthetic private detail',3,'SQLSTATE_23505'],
      ['synthetic private detail',3,'PSQL_SCRIPT_ERROR'],['synthetic private detail',0,'STDIN_TRANSPORT']]){
      await assert.rejects(command(c,'ARCHIVE_SQL_TEST',process.execPath,child(diagnostic,exit),{input:pending(),archivePsql:true}),
        error=>error.code===code&&error.exit===exit&&!error.message.includes(diagnostic));
    }
    async function* broken(code){throw Object.assign(new Error('synthetic iterator detail'),{code});}
    for(const [source,code]of [['ARCHIVE_SQL_SHA','ARCHIVE_SQL_SHA'],['EPIPE','STDIN_TRANSPORT'],['OPERATION_DEADLINE','OPERATION_DEADLINE']]){
      await assert.rejects(command(c,'ARCHIVE_SQL_TEST',process.execPath,child('ERROR: 23505 synthetic private detail'),
        {input:broken(source),archivePsql:true}),error=>error.code===code);
    }
    await assert.rejects(command(c,'ARCHIVE_SQL_TEST',process.execPath,['-e','setTimeout(()=>process.exit(3),350)'],
      {input:pending(),archivePsql:true,maxMs:100}),error=>error.code==='CHILD_TIMEOUT');
    assert(c.processes.every(p=>p.processGroupClosed));
  });
  function expectedPrimaryArchiveSql([roles,schema,data]){
    const roleCheck="DO $rr_restore$ BEGIN IF session_user <> 'supabase_admin' OR current_user <> 'postgres' THEN RAISE SQLSTATE '42501'; END IF; END; $rr_restore$;\n";
    return Buffer.concat([roles,Buffer.from('\nSET LOCAL ROLE postgres;\n'+roleCheck),schema,
      Buffer.from('\n'+roleCheck+'SET session_replication_role = replica;\n'),data,Buffer.from('\n'+roleCheck)]);
  }
  test('archive SQLSTATE reports only the matching streamed input owner',async()=>{
    const p={side:'B',db:'a'.repeat(64)},args=archiveBootstrapPsqlArguments({archive:true},p);
    assert.deepEqual(args.slice(0,5),['exec','-i',p.db,'sh','-ceu']);
    assert.match(args[5],/PGPASSWORD="\$POSTGRES_PASSWORD" .*--host=\/var\/run\/postgresql .*--username=supabase_admin .*--single-transaction .*--variable=ON_ERROR_STOP=1 .*--command="\$1" --file=-$/);
    assert.match(args[5],/ LC_ALL=C exec psql .* --set=VERBOSITY=verbose --set=SHOW_CONTEXT=never /);
    assert.match(args[7],/session_user <> 'supabase_admin' OR current_user <> 'supabase_admin'/);
    for(const [c,target] of [[{archive:false},p],[{archive:true},{...p,side:'A'}],[{archive:true},{...p,db:'other'}]])
      assert.throws(()=>archiveBootstrapPsqlArguments(c,target),e=>e.code==='ARCHIVE_BOOTSTRAP_TARGET');
    await ownArchive(async({c,env,index,materialize,source})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      const inputLines={next:1,ranges:new Map()},chunks=[];
      for await(const chunk of materializedRestoreBytes(c,archive,false,inputLines))chunks.push(chunk);
      assert(Buffer.concat(chunks).equals(expectedPrimaryArchiveSql(source)));
      const frame=line=>Buffer.from('psql:<stdin>:'+line+': ERROR:  42501\n');
      const archiveInputOwner=(...args)=>archiveInputDiagnostic(...args).inputOwner;
      for(const [line,owner]of [[1,'ROLES'],[2,'UNKNOWN'],[3,'ROLE_SWITCH'],[4,'ROLE_SWITCH'],[5,'SCHEMA'],
        [6,'UNKNOWN'],[7,'SCHEMA_ROLE_CHECK'],[8,'REPLICA_SETTING'],[9,'DATA'],[10,'DATA'],[11,'DATA'],[12,'UNKNOWN'],[13,'DATA_ROLE_CHECK'],[14,'UNKNOWN']])
        assert.equal(archiveInputOwner(frame(line),'SQLSTATE_42501',inputLines),owner);
      assert.equal(archiveInputOwner(Buffer.concat([frame(1),frame(3)]),'SQLSTATE_42501',inputLines),'UNKNOWN');
      assert.equal(archiveInputOwner(frame(8),'SQLSTATE_23505',inputLines),'UNKNOWN');
      assert.equal(archiveInputOwner(Buffer.from('ERROR:  42501\n'),'SQLSTATE_42501',inputLines),'UNKNOWN');
      const history={next:1,ranges:new Map()};
      const historyChunks=[];
      for await(const chunk of materializedRestoreBytes(c,archive,true,history))historyChunks.push(chunk);
      assert(Buffer.concat(historyChunks).equals(restoreBytes(source.slice(3),true)));
      assert.equal(archiveInputOwner(frame(3),'SQLSTATE_42501',history),'HISTORY');
      Object.assign(c,{home:c.root,processes:[]});
      const streamed={next:1,ranges:new Map()};
      const child=['-e','process.stdin.resume();process.stdin.on("end",()=>{process.stderr.write("psql:<stdin>:4: ERROR:  42501\\n",()=>process.exit(3))})'];
      await assert.rejects(command(c,'ARCHIVE_SQL_TEST',process.execPath,child,
        {input:materializedRestoreBytes(c,archive,false,streamed),archivePsql:true,inputLines:streamed}),
      error=>{
        assert.deepEqual(safeError(error,'ARCHIVE_SQL_TEST'),{stage:'ARCHIVE_SQL_TEST',code:'SQLSTATE_42501',exit:3,
          externalDockerOutcome:'UNKNOWN_UNTIL_OWNED_READBACK',inputOwner:'ROLE_SWITCH'});
        return true;
      });
    });
  });
  test('primary archive SQLSTATE reports a fixed category for a verified standalone roles statement',async()=>{
    const grant=DOCUMENTED_CLI_LOGIN_GRANT;
    const header='-- fixture\n\\restrict synthetic123\nSET client_encoding = \'UTF8\';\nCREATE ROLE "synthetic";\n';
    const frame=(line,state='42501')=>Buffer.from('psql:<stdin>:'+line+': ERROR:  '+state+'\n');
    const splitHeader=header+'\n'.repeat(ARCHIVE_SQL.chunkBytes-5-Buffer.byteLength(header));
    for(const [sql,expected,position,operands]of [
      [header+grant+'\r\n','CLI_LOGIN_POSTGRES_GRANT',5,{form:'GRANT_ROLE',role:'POSTGRES',member:'CLI_LOGIN_POSTGRES',grantor:'SUPABASE_ADMIN'}],
      [header+grant,'CLI_LOGIN_POSTGRES_GRANT',5,{form:'GRANT_ROLE',role:'POSTGRES',member:'CLI_LOGIN_POSTGRES',grantor:'SUPABASE_ADMIN'}],
      [splitHeader+grant+'\n','UNKNOWN',splitHeader.length-header.length+5],
      [header+grant+'\n'+grant+'\n','CLI_LOGIN_POSTGRES_GRANT',5,{form:'GRANT_ROLE',role:'POSTGRES',member:'CLI_LOGIN_POSTGRES',grantor:'SUPABASE_ADMIN'}],
      [header+' '+grant+'\n','UNKNOWN',5],
      [header+'CREATE ROLE "synthetic";\n','CREATE_ROLE',5],
      [header+'ALTER ROLE "synthetic" WITH LOGIN;\n','ALTER_ROLE',5,{form:'ALTER_ROLE_ATTRIBUTES',role:'OTHER_ROLE_IDENTIFIER'}],
      [header+'ALTER ROLE "supabase_unlisted" SET "statement_timeout" TO \'secret\';\n','ALTER_ROLE',5,
        {form:'ALTER_ROLE_CONFIG',role:'RESERVED_SUPABASE_NAMESPACE',guc:'STATEMENT_TIMEOUT'}],
      [header+'ALTER ROLE "synthetic" SET "pgrst.example" TO \'secret\';\n','ALTER_ROLE',5,
        {form:'ALTER_ROLE_CONFIG',role:'OTHER_ROLE_IDENTIFIER',guc:'PGRST_NAMESPACE'}],
      [header+'ALTER ROLE "synthetic" SET "other_parameter" TO \'secret\';\n','ALTER_ROLE',5,
        {form:'ALTER_ROLE_CONFIG',role:'OTHER_ROLE_IDENTIFIER',guc:'OTHER_GUC_IDENTIFIER'}],
      [header+'ALTER ROLE "synthetic" IN DATABASE "other" SET "statement_timeout" TO \'secret\';\n','ALTER_ROLE',5],
      [header+'GRANT "synthetic" TO "other";\n','GRANT_ROLE',5,{form:'GRANT_ROLE',role:'OTHER_ROLE_IDENTIFIER',member:'OTHER_ROLE_IDENTIFIER',grantor:'UNSPECIFIED'}],
      [header+'GRANT "supabase_unlisted" TO "other" GRANTED BY "cli_login_unlisted";\n','GRANT_ROLE',5,
        {form:'GRANT_ROLE',role:'RESERVED_SUPABASE_NAMESPACE',member:'OTHER_ROLE_IDENTIFIER',grantor:'RESERVED_CLI_LOGIN_NAMESPACE'}],
      [header+'GRANT "supabase_unlisted", "postgres" TO "other";\n','GRANT_ROLE',5],
      [header+'REVOKE "synthetic" FROM "other";\n','REVOKE_ROLE',5,{form:'REVOKE_ROLE',role:'OTHER_ROLE_IDENTIFIER',member:'OTHER_ROLE_IDENTIFIER',grantor:'UNSPECIFIED'}],
      [header+'COMMENT ON ROLE "synthetic" IS \'x;y\';\n','COMMENT_ROLE',5],
      [header+grant+' -- comment\n','UNKNOWN',5],
      [header+'/* earlier comment\n'+grant+'\n*/\n','UNKNOWN',6],
      [header+"COMMENT ON ROLE synthetic IS 'earlier string\n"+grant+"\n';\n",'UNKNOWN',6],
      [header+'\\if true\n'+grant+'\n\\endif\n','UNKNOWN',6],
    ])await ownArchive(async({c,env,index,materialize,source})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      const inputLines={next:1,ranges:new Map(),roleLineClasses:null},chunks=[];
      const report=(bytes=frame(position),code='SQLSTATE_42501')=>archiveInputDiagnostic(bytes,code,inputLines);
      const stream=materializedRestoreBytes(c,archive,false,inputLines);
      const first=await stream.next();chunks.push(first.value);
      assert.equal(report().inputStatement,'UNKNOWN','roles verification has not completed');
      assert.equal(report(frame(position,'42704'),'SQLSTATE_42704').inputRoleOperands,undefined);
      for await(const chunk of stream)chunks.push(chunk);
      assert(Buffer.concat(chunks).equals(expectedPrimaryArchiveSql(source)));
      assert.deepEqual(report(),{inputOwner:'ROLES',inputStatement:expected});
      const undefinedObject=report(frame(position,'42704'),'SQLSTATE_42704');
      assert.deepEqual(undefinedObject,{inputOwner:'ROLES',inputStatement:expected,...(operands?{inputRoleOperands:operands}:{})});
      assert.deepEqual(safeError({code:'SQLSTATE_42704',...undefinedObject},'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA').inputRoleOperands,operands);
      assert.equal(safeError({code:'SQLSTATE_42704',inputOwner:'ROLES',inputRoleOperands:{form:'ALTER_ROLE_CONFIG',role:'private',guc:'private'}},
        'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA').inputRoleOperands,undefined);
      assert.equal(report(Buffer.concat([frame(position,'42704'),frame(position+1,'42704')]),'SQLSTATE_42704').inputRoleOperands,undefined);
      assert.equal(safeError({code:'SQLSTATE_42704',...undefinedObject},'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA').inputStatement,expected);
      assert.equal(report(Buffer.concat([frame(position,'42704'),frame(position+1,'42704')]),'SQLSTATE_42704').inputStatement,'UNKNOWN');
      assert.equal(report(frame(position+2)).inputStatement,'UNKNOWN');
      assert.equal(report(Buffer.concat([frame(position),frame(position+1)])).inputStatement,'UNKNOWN');
      assert.equal(report(Buffer.concat([frame(position),Buffer.from('ERROR: 42501 additional frame\n')])).inputStatement,'UNKNOWN');
      assert.equal(report(frame(position,'23505'),'SQLSTATE_23505').inputStatement,undefined);
      if(expected==='CLI_LOGIN_POSTGRES_GRANT'&&position===5&&sql.endsWith('\r\n')){
        Object.assign(c,{home:c.root,processes:[]});
        const tracked={next:1,ranges:new Map(),roleLineClasses:null};
        const child=['-e','process.stdin.resume();process.stdin.on("end",()=>{process.stderr.write('+JSON.stringify(frame(position).toString())+',()=>process.exit(3))})'];
        await assert.rejects(command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,child,
          {input:materializedRestoreBytes(c,archive,false,tracked),archivePsql:true,inputLines:tracked}),
        error=>{
          assert.deepEqual(safeError(error,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'),{
            stage:'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',code:'SQLSTATE_42501',exit:3,
            externalDockerOutcome:'UNKNOWN_UNTIL_OWNED_READBACK',inputOwner:'ROLES',inputStatement:'CLI_LOGIN_POSTGRES_GRANT',
          });
          return true;
        });
      }
    },{roleSql:sql});
  });

  test('owned archive GRANT 42704 projects only the exact missing role class',async()=>{
    const location='LOCATION:  get_role_oid, acl.c:1234\n';
    const detail=name=>'psql:<stdin>:2: ERROR:  42704: role "'+name+'" does not exist\n';
    const roleSql='-- synthetic\nGRANT "supabase_fixture_role", "postgres" TO "fixture_member";\n'
      +'ALTER ROLE "fixture_member" WITH LOGIN;\n';
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      const inputLines={next:1,ranges:new Map(),roleLineClasses:null};
      for await(const _chunk of materializedRestoreBytes(c,archive,false,inputLines)){}
      const report=(stderr,code='SQLSTATE_42704')=>archiveInputDiagnostic(Buffer.from(stderr),code,inputLines);
      for(const [name,label]of [['postgres','POSTGRES'],['cli_login_postgres','CLI_LOGIN_POSTGRES'],
        ['supabase_fixture_role','RESERVED_SUPABASE_NAMESPACE'],['cli_login_fixture','RESERVED_CLI_LOGIN_NAMESPACE'],
        ['supabase_auth_admin','SUPABASE_AUTH_ADMIN'],
        ['supabase_etl_admin','SUPABASE_ETL_ADMIN'],
        ['supabase_functions_admin','SUPABASE_FUNCTIONS_ADMIN'],
        ['supabase_privileged_role','SUPABASE_PRIVILEGED_ROLE'],
        ['supabase_read_only_user','SUPABASE_READ_ONLY_USER'],
        ['supabase_replication_admin','SUPABASE_REPLICATION_ADMIN'],
        ['supabase_storage_admin','SUPABASE_STORAGE_ADMIN'],
        ['fixture_private_member','OTHER_ROLE_IDENTIFIER']]){
        const failure=report(detail(name)+location);
        assert.deepEqual(failure,{inputOwner:'ROLES',inputStatement:'GRANT_ROLE',missingRoleClass:label});
        const safe=safeError({code:'SQLSTATE_42704',exit:3,...failure},'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA');
        assert.equal(safe.missingRoleClass,label);
        assert(!JSON.stringify(safe).includes(name),'raw role identifier must not be reported');
      }
      assert.equal(report((detail('postgres')+location).replaceAll('\n','\r\n')).missingRoleClass,'POSTGRES');
      for(const text of [detail('postgres'),detail('postgres')+location+'extra\n',
        detail('postgres')+location+detail('anon')+location,
        detail('postgres')+'more " does not exist\n'+location,
        detail('postgres" does not exist\n'+location+'private-tail')+location,
        detail('private ø')+location,detail('postgres').replace(':2:',':3:')+location,
        detail('postgres').replace(':2:',':5:')+location,
        detail('postgres').replace('42704','42501')+location,
        detail('postgres')+location.replace('get_role_oid','unexpected'),
        detail('postgres')+location.replace('acl.c','unrelated.c'),
        detail('postgres').replace('role "postgres"','relation "postgres"')+location,
        'psql:<stdin>:2: ERROR:  42704\n',
        'ERROR:  42704: role "postgres" does not exist\n'+location]){
        assert.equal(report(text).missingRoleClass,undefined);
      }
      assert.equal(report(detail('postgres')+location,'SQLSTATE_42501').missingRoleClass,undefined);
      for(const invalid of [{missingRoleClass:'raw_private_identifier'},{inputOwner:'DATA'},
        {inputStatement:'ALTER_ROLE'},{code:'SQLSTATE_42501'}]){
        assert.equal(safeError({code:'SQLSTATE_42704',inputOwner:'ROLES',inputStatement:'GRANT_ROLE',
          missingRoleClass:'POSTGRES',...invalid},'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA').missingRoleClass,undefined);
      }
      assert.equal(safeError({code:'SQLSTATE_42704',inputOwner:'ROLES',inputStatement:'GRANT_ROLE',
        missingRoleClass:'POSTGRES'},'RESTORE_ARCHIVE_HISTORY').missingRoleClass,undefined);
      Object.assign(c,{home:c.root,processes:[]});
      const streamed={next:1,ranges:new Map(),roleLineClasses:null};
      const stderr=detail('fixture_private_member')+location;
      const child=['-e','process.stdin.resume();process.stdin.on("end",()=>{process.stderr.write('
        +JSON.stringify(stderr)+',()=>process.exit(3))})'];
      await assert.rejects(command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,child,
        {input:materializedRestoreBytes(c,archive,false,streamed),archivePsql:true,inputLines:streamed}),
      error=>{
        assert.deepEqual(safeError(error,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'),{
          stage:'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',code:'SQLSTATE_42704',exit:3,
          externalDockerOutcome:'UNKNOWN_UNTIL_OWNED_READBACK',inputOwner:'ROLES',inputStatement:'GRANT_ROLE',
          missingRoleClass:'OTHER_ROLE_IDENTIFIER',
        });
        assert(!JSON.stringify(error).includes('fixture_private_member'));
        return true;
      });
      assert(c.processes.every(p=>p.processGroupClosed));
    },{roleSql});
  });

  test('hosted archive reports exclude private backup descriptors and process byte counts',()=>{
    const privateMarker='PRIVATE_BACKUP_SENTINEL';
    const context={archive:true,images:{},dumps:[{sha256:privateMarker}],authRequests:[],processes:[{stdoutBytes:99}]};
    const failure={stage:'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',code:'SQLSTATE_42501',inputOwner:'ROLES',inputStatement:'ALTER_ROLE'};
    const failed=restorePublicReport(context,null,failure,true);
    assert.deepEqual(failed,{status:'FAILED_CLOSED',scope:'authenticated-archive-isolated-sql-restore',
      firstFailure:failure,ownedDockerClosed:true});
    const success={status:'PASS',scope:'authenticated-archive-isolated-sql-restore',authenticatedFiveFileSqlExecuted:true};
    assert.deepEqual(restorePublicReport(context,success,null,true),{...success,ownedDockerClosed:true});
    assert.deepEqual(restorePublicReport({...context,archive:false},success,null,true).dumpFiles,context.dumps);
  });
  test('hosted archive choice requires a tagged commitment, explicit isolated confirmation and main',()=>{
    const digest='a'.repeat(64),valid={GITHUB_REF:'refs/heads/main',RESTORE_ARCHIVE_INDEX_COMMITMENT:'rr-supabase-restore-v1:'+digest,
      RESTORE_ARCHIVE_CONFIRMATION:ARCHIVE_CONFIRMATION};
    assert.equal(archiveSelection(valid),digest);
    for(const change of [{RESTORE_ARCHIVE_INDEX_COMMITMENT:''},{RESTORE_ARCHIVE_INDEX_COMMITMENT:digest},
      {RESTORE_ARCHIVE_INDEX_COMMITMENT:'rr-supabase-restore-v1:'+'A'.repeat(64)},
      {RESTORE_ARCHIVE_INDEX_SHA:digest},{RESTORE_ARCHIVE_CONFIRMATION:''},
      {GITHUB_REF:'refs/heads/codex/unqualified'}])assert.throws(()=>archiveSelection({...valid,...change}));
  });

  test('archive materialization uses the existing read-only API and isolated master/R2 environment',async()=>{
    await ownArchive(async({c,env,index,materialize,getObserved})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      assert.equal(archive.files.length,5);assert(!Object.hasOwn(archive,'indexSha256'));assert(getObserved());
      const child=restoreChildEnvironment({...env,PATH:'synthetic-path'},path.join(c.root,'home'),c.root);
      assert.deepEqual(Object.keys(child).sort(),['PATH','HOME','TMPDIR','LANG','LC_ALL','CI','SUPABASE_TELEMETRY_DISABLED'].sort());
      for(const key of Object.keys(env).filter(k=>k!=='RUNNER_TEMP'))assert(!Object.hasOwn(child,key));
    });
  });
  test('only the pinned setup registry reaches the Supabase CLI without archive or registry credentials',()=>{
    const env={PATH:'synthetic-path',SUPABASE_INTERNAL_IMAGE_REGISTRY:'ghcr.io',
      SUPABASE_SERVICE_ROLE_KEY:'synthetic-archive-key',RAVRADAR_R2_SECRET_ACCESS_KEY:'synthetic-r2-key',
      GH_TOKEN:'synthetic-registry-token',DOCKER_AUTH_CONFIG:'synthetic-registry-config'};
    const generic=restoreChildEnvironment(env,'owned-home','owned-root','docker');
    assert.deepEqual(Object.keys(generic).sort(),['PATH','HOME','TMPDIR','LANG','LC_ALL','CI','SUPABASE_TELEMETRY_DISABLED'].sort());
    assert.deepEqual(restoreChildEnvironment(env,'owned-home','owned-root','git'),generic);
    assert.deepEqual(restoreChildEnvironment(env,'owned-home','owned-root','supabase'),
      {...generic,SUPABASE_INTERNAL_IMAGE_REGISTRY:'ghcr.io'});
    for(const value of [undefined,'public.ecr.aws','ghcr.io/private',' ghcr.io','https://ghcr.io'])
      assert.deepEqual(restoreChildEnvironment({...env,SUPABASE_INTERNAL_IMAGE_REGISTRY:value},'owned-home','owned-root','supabase'),generic);
  });
  test('archive receipt cannot admit incomplete, writing or upgraded evidence',async()=>{
    for(const receiptEdit of [r=>{r.remoteArchiveVerified=false;},r=>{r.databaseRestoreExecuted=true;},
      r=>{r.archiveWrittenThisOperation=true;},r=>{r.freeReady=true;},r=>{r.indexCommitmentSha256='d'.repeat(64);},r=>{r.indexSha256='d'.repeat(64);},
      r=>{r.candidates=[];},r=>{r.files[4].file='arbitrary.sql';}])
      await ownArchive(async({c,env,index,materialize})=>{
        await assert.rejects(materializeArchiveInputs(c,index,{env,archive:materialize}));
      },{receiptEdit});
  });
  test('normal streamed archive order equals the existing five-file SQL recipe byte for byte',async()=>{
    await ownArchive(async({c,env,index,materialize,source})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      for(const history of [false,true]){const chunks=[];
        for await(const chunk of materializedRestoreBytes(c,archive,history))chunks.push(chunk);
        assert(Buffer.concat(chunks).equals(history?restoreBytes(source.slice(3),true):expectedPrimaryArchiveSql(source)));}
    });
  });
  test('real archive SQL exceeds the synthetic 8MiB cap and streams in bounded chunks through backpressure',async()=>{
    await ownArchive(async({c,env,index,materialize,source})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});assert(archive.files[2].bytes>P.fileBytes);
      let count=0,maximum=0,writes=0;
      await pipeline(Readable.from(materializedRestoreBytes(c,archive),{objectMode:false}),new Writable({highWaterMark:1024,
        write(chunk,_encoding,done){count+=chunk.length;maximum=Math.max(maximum,chunk.length);writes++;setImmediate(done);}}));
      assert.equal(count,expectedPrimaryArchiveSql(source).length-source[2].length+archive.files[2].bytes);
      assert(maximum<=ARCHIVE_SQL.chunkBytes&&writes>128);
    },{large:true});
  });
  test('wrong inner SQL hash aborts the stream before successful stdin finalization',async()=>{
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      await fs.writeFile(path.join(archive.directory,'data.sql'),Buffer.alloc(archive.files[2].bytes,120));let finalized=false;
      await assert.rejects(pipeline(Readable.from(materializedRestoreBytes(c,archive),{objectMode:false}),
        new Writable({write(_chunk,_encoding,done){done();},final(done){finalized=true;done();}})),e=>e.code==='ARCHIVE_SQL_SHA');
      assert.equal(finalized,false);
    });
    await ownArchive(async({c,env,index,materialize,source})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      const bad=Buffer.from(source[0]),at=bad.indexOf(Buffer.from("'500'"));
      assert(at>=0);bad[at+1]=54;
      const seen=[],inputLines={next:1,ranges:new Map(),roleLineClasses:null};
      await fs.writeFile(path.join(archive.directory,'roles.sql'),bad);
      await assert.rejects(async()=>{for await(const chunk of materializedRestoreBytes(c,archive,false,inputLines))seen.push(chunk);},
        e=>e.code==='ARCHIVE_SQL_SHA');
      assert.equal(inputLines.roleLineClasses,null);assert.equal(inputLines.roleLineOperands,undefined);
      assert(Buffer.concat(seen).equals(bad),'role switch must follow successful role-file verification');
    },{roleSql:'ALTER ROLE "supabase_unlisted" SET "statement_timeout" TO \'500\';\n'});
  });
  test('replacement hardlinks and expired operation deadlines refuse archive bytes',async()=>{
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      const file=path.join(archive.directory,'roles.sql');await fs.link(file,path.join(c.root,'unowned-alias'));
      await assert.rejects(async()=>{for await(const _chunk of materializedRestoreBytes(c,archive)){}},e=>e.code==='ARCHIVE_SQL_FILE');
      await fs.unlink(path.join(c.root,'unowned-alias'));c.deadline=Date.now()-1;
      await assert.rejects(async()=>{for await(const _chunk of materializedRestoreBytes(c,archive)){}},e=>e.code==='OPERATION_DEADLINE');
    });
  });
  test('normal workflow keeps synthetic default, exact source gate, lock order and archive-only credentials',async()=>{
    const workflow=await fs.readFile(new URL('../.github/workflows/verify-supabase-cli-local-restore.yml',import.meta.url),'utf8');
    assert.doesNotMatch(workflow,/archive_index_sha|RESTORE_ARCHIVE_INDEX_SHA/);
    assert.equal(workflow.split('inputs.archive_index_commitment').length,3);
    assert(workflow.includes('^rr-supabase-restore-v1:[a-f0-9]{64}$'));
    assert.match(workflow,/default: synthetic[\s\S]*options: \[synthetic, archive\]/);
    assert(workflow.indexOf('group: ${{ inputs.restore_mode')<workflow.indexOf('ravradar-trip-storage-production'));
    assert(workflow.indexOf('Refuse missing exact source proof')<workflow.indexOf('SUPABASE_SERVICE_ROLE_KEY:'));
    const archiveStep=workflow.split('name: Materialize the exact authenticated archive and restore only to owned local PostgreSQL')[1];
    assert(archiveStep);assert.match(archiveStep,/if: inputs.restore_mode == 'archive'/);
    assert(!/SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|CLOUDFLARE_API_TOKEN|GITHUB_TOKEN|upload-artifact|continue-on-error/.test(archiveStep));
    assert.match(archiveStep,/--run-archive-restore/);assert.match(workflow,/if: inputs.restore_mode == 'synthetic'[\s\S]*--run-local-fixture/);
  });
  test('archive startup DB endpoint requires matching owned healthy container and bridge membership',async()=>{
    const id='a'.repeat(64),net='b'.repeat(64),endpoint='c'.repeat(64),c={owner:'123-1',archive:true};
    const p={side:'B',id:'rr_restore_123_1_b',network:'rr-restore-123-1-b',networkId:net};
    const db={Id:id,Name:'/supabase_db_'+p.id,Config:{Labels:{'com.supabase.cli.project':p.id}},
      NetworkSettings:{Networks:{[p.network]:{NetworkID:net,IPAddress:'172.23.0.2',IPPrefixLen:16,EndpointID:endpoint}},
        Ports:{'5432/tcp':null}},State:{Running:true,Health:{Status:'healthy'}}};
    const network={Name:p.network,Id:net,Internal:true,Driver:'bridge',Scope:'local',
      Labels:{'ravradar.synthetic.restore.owner':c.owner},IPAM:{Config:[{Subnet:'172.23.0.0/16'}]},
      Containers:{[id]:{Name:db.Name.slice(1),IPv4Address:'172.23.0.2/16',EndpointID:endpoint}}};
    assert.deepEqual(archiveDbEndpoint(db,network,c,p),{address:'172.23.0.2',identity:id+':'+endpoint});
    for(const edit of [
      (db,n)=>db.Config.Labels['com.supabase.cli.project']='foreign',
      (db,n)=>db.Name='/foreign',
      (db,n)=>db.State.Health.Status='starting',
      (db,n)=>db.NetworkSettings.Networks.bridge={},
      (db,n)=>db.NetworkSettings.Networks[p.network].NetworkID='d'.repeat(64),
      (db,n)=>db.NetworkSettings.Ports['5432/tcp']=[{HostIp:'127.0.0.1',HostPort:'54322'}],
      (db,n)=>db.NetworkSettings.Networks[p.network].IPAddress='127.0.0.1',
      (db,n)=>n.Internal=false,
      (db,n)=>n.Driver='overlay',
      (db,n)=>n.Labels['ravradar.synthetic.restore.owner']='foreign',
      (db,n)=>n.Containers[id].EndpointID='d'.repeat(64),
      (db,n)=>n.Containers[id].IPv4Address='172.24.0.2/16',
      (db,n)=>delete n.Containers[id],
    ]){
      const i=structuredClone(db),n=structuredClone(network);edit(i,n);
      assert.throws(()=>archiveDbEndpoint(i,n,c,p));
    }
    await assert.rejects(()=>openArchiveDbRelay(c,{...p,id:'rr_restore_124_1_b'}),
      error=>error.code==='ARCHIVE_DB_RELAY_PROJECT');
  });
  test('owned bootstrap relay refuses a bind collision and stale targets, then closes listener and sockets',async()=>{
    const payload=Buffer.from('synthetic bootstrap probe'),backendClients=new Set();let received=0;
    const backend=createServer(socket=>{
      backendClients.add(socket);socket.once('close',()=>backendClients.delete(socket));
      socket.on('data',bytes=>{received+=bytes.length;socket.write(bytes);});
    });
    await new Promise((resolve,reject)=>{
      backend.once('error',reject);backend.listen({host:'127.0.0.1',port:0},resolve);
    });
    let relay,client;
    const identity=()=>({address:'127.0.0.1',identity:'fixed-fake-peer'}),backendPort=backend.address().port;
    try{
      let reads=0;
      relay=await openLoopbackRelay(()=>({...identity(),identity:String(++reads)}),0,backendPort);
      assert.equal(relay.address.address,'127.0.0.1');
      client=createConnection({host:'127.0.0.1',port:relay.address.port});
      const rejected=new Promise(resolve=>client.once('close',resolve));
      client.on('error',()=>{}); // Windows can report the intentional refusal as a reset.
      client.write(payload);
      await rejected;
      assert.equal(reads,2);assert.equal(received,0);
      const port=relay.address.port;await relay.close();relay=null;
      relay=await openLoopbackRelay(identity,port,backendPort);
      await assert.rejects(()=>openLoopbackRelay(identity,port,backendPort),error=>error.code==='ARCHIVE_DB_RELAY_BIND');
      client=createConnection({host:'127.0.0.1',port});
      const response=once(client,'data');client.write(payload);
      assert.deepEqual((await response)[0],payload);
      const clientClosed=new Promise(resolve=>client.once('close',resolve));
      client.on('error',()=>{});
      await relay.close();relay=null;await clientClosed;
      relay=await openLoopbackRelay(identity,port,backendPort);
    }finally{
      client?.destroy();if(relay)await relay.close();
      for(const socket of backendClients)socket.destroy();
      await new Promise(resolve=>backend.close(resolve));
    }
  });
  test('archive target requires its empty owned internal Docker network before any SQL or container start',()=>{
    const c={owner:'synthetic-owner'},p={network:'own-net',networkId:'a'.repeat(64)},n={Name:'own-net',Id:'a'.repeat(64),
      Internal:true,Labels:{'ravradar.synthetic.restore.owner':'synthetic-owner'},Containers:{}};
    isolatedArchiveNetwork(n,c,p);
    for(const edit of [x=>{x.Internal=false;},x=>{x.Id='b'.repeat(64);},x=>{x.Name='other';},
      x=>{x.Labels['ravradar.synthetic.restore.owner']='other';},x=>{x.Containers={unexpected:{}};}]){
      const changed=structuredClone(n);edit(changed);assert.throws(()=>isolatedArchiveNetwork(changed,c,p),e=>e.code==='ARCHIVE_NETWORK_NOT_ISOLATED');}
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  need(process.argv.length===3,'ONE_FIXED_MODE');
  if(process.argv[2]==='--self-test')await selfTest();
  else if(process.argv[2]==='--run-local-fixture')await fixture().catch(e=>{
    console.log(JSON.stringify({status:'FAILED_CLOSED',scope:'synthetic-standard-cli-local-restore',firstFailure:safeError(e,'PREFLIGHT')}));process.exitCode=1;
  });
  else if(process.argv[2]==='--run-archive-restore')await fixture({archive:true}).catch(e=>{
    console.log(JSON.stringify({status:'FAILED_CLOSED',scope:'authenticated-archive-isolated-sql-restore',
      firstFailure:safeError(e,'PREFLIGHT'),productionBackupVerified:false,freeReady:false}));process.exitCode=1;
  });
  else need(false,'UNKNOWN_MODE');
}
