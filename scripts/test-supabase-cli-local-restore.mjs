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
import {readAccountErasureSource} from './verify-account-erasure-schema.mjs';

const P=Object.freeze({cli:'2.117.0',operationMs:20*60_000,cleanupMs:2*60_000,
  childMs:8*60_000,diagnosticBytes:1024*1024,fileBytes:8*1024*1024,totalBytes:32*1024*1024});
const IMAGES=Object.freeze({db:'supabase/postgres:17.6.1.167',kong:'kong:2.8.1',auth:'supabase/gotrue:v2.197.0'});
const ARCHIVE_VENDOR_IMAGES=Object.freeze({auth:'supabase/gotrue:v2.197.0',storage:'supabase/storage-api:v1.86.0'});
const ARCHIVE_VENDOR_PINS=Object.freeze({'gotrue-version':'v2.197.0\n','storage-version':'v1.86.0\n'});
const EXCLUDE='realtime,storage-api,imgproxy,edge-runtime,postgres-meta,studio,supavisor,logflare,vector,mailpit,postgrest';
const FILES=['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql'];
const ARCHIVE_FILES=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const ARCHIVE_SQL=Object.freeze({fileBytes:1_000_000_000,totalBytes:2_000_000_000,chunkBytes:64*1024});
const ARCHIVE_SQL_OWNERS=['ROLES','ROLE_SWITCH','SCHEMA','SCHEMA_ROLE_CHECK','REPLICA_SETTING','RELATION_PREFLIGHT','CHECK_SUSPEND','CHECK_RESTORE','DATA','DATA_ROLE_CHECK','HISTORY','UNKNOWN'];
const ARCHIVE_POSTGRES_ROLE_CHECK="DO $rr_restore$ BEGIN IF session_user <> 'supabase_admin' OR current_user <> 'postgres' THEN RAISE SQLSTATE '42501'; END IF; END; $rr_restore$;\n";
const DOCUMENTED_CLI_LOGIN_GRANT='GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";';
const ARCHIVE_SQL_STATEMENTS=['UNKNOWN','CREATE_ROLE','ALTER_ROLE','GRANT_ROLE','REVOKE_ROLE','COMMENT_ROLE','CLI_LOGIN_POSTGRES_GRANT'];
const ARCHIVE_ROLE_STATEMENT_STATES=new Set(['SQLSTATE_42501','SQLSTATE_42704']);
const MAX_ROLE_CLASS_LINES=8192;
const ARCHIVE_CHECK_CATALOG=Object.freeze({maximum:512,point:'BEFORE_DATA_SAME_TRANSACTION',
  hashFormat:'SHA256_LENGTH_PREFIXED_UTF8_SCHEMA_RELATION_CONSTRAINT_V1'});
const ARCHIVE_CHECK_SUSPEND_COUNTS=Object.freeze({
  ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND:Object.freeze({checkCount:4097,semanticBytes:8388609,notValidCount:4097,
    unsupportedNotValidCount:4097,catalogLookupMismatchCount:4097,domainOrNoRelationCount:4097,nonTableCount:4097,partitionOrInheritanceCount:4097,
    systemSchemaCount:4097,extensionDependencyCount:4097,definitionBytesExceededCount:4097,
    commentBytesExceededCount:4097,notValidSuffixMissingCount:4097}),
  ARCHIVE_CHECK_TARGET_UNSUPPORTED:Object.freeze({copyTargetCount:8193,unsupportedTargetCount:8193,
    missingTargetCount:8193,nonTableTargetCount:8193,partitionTargetCount:8193,inheritanceTargetCount:8193}),
  ARCHIVE_CHECK_CATALOG_CHANGED:Object.freeze({removedSemanticCount:4097,addedSemanticCount:4097}),
});
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
function archiveServiceEndpoint(info,network,c,p,service){
  need(['db','kong'].includes(service),'ARCHIVE_SERVICE_KIND');
  const id=ownedContainer(info,p,service,true);
  if(service==='kong')need(id===p.kong&&info.State?.Running===true&&info.State?.Health?.Status==='healthy','ARCHIVE_AUTH_NOT_HEALTHY');
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
function archiveDbEndpoint(info,network,c,p){return archiveServiceEndpoint(info,network,c,p,'db');}
async function archiveAuthEndpoint(c,p){
  need(c.archive===true&&p.side==='B'&&p.id==='rr_restore_'+c.owner.replace('-','_')+'_b','ARCHIVE_AUTH_PROJECT');
  const info=(await jsonCommand(c,'ARCHIVE_AUTH_CONTAINER',['inspect',p.kong]))[0];
  const network=(await jsonCommand(c,'ARCHIVE_AUTH_NETWORK',['network','inspect',p.network]))[0];
  return archiveServiceEndpoint(info,network,c,p,'kong');
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
     }:{}),
    ...(stage==='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'&&error?.code==='SQLSTATE_23514'&&error.inputOwner==='DATA'
      ?{checkConstraint:publicArchiveCheckDiagnostic(error.checkConstraint)}:{}),
    ...(['RESTORE_ARCHIVE_ROLES_SCHEMA_DATA','RESTORE_ARCHIVE_HISTORY'].includes(stage)
      &&error?.code==='SQLSTATE_P0001'&&error.inputOwner==='CHECK_SUSPEND'
      ?{checkSuspend:publicArchiveCheckSuspendDiagnostic(error.checkSuspend)}:{})};
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
// Only our exact owned P0001 guard and its bounded, identity-bound JSON DETAIL
// can leave the private child diagnostic. Unknown text never becomes a label.
function publicArchiveCheckSuspendDiagnostic(value){
  const unavailable={state:'UNAVAILABLE'},keys=['state','reason','phase','inventorySha256','measurementPoint','counts'];
  if(!value||Object.getPrototypeOf(value)!==Object.prototype
    ||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.sort())
    ||value.state!=='OWNED_GUARD_BOUND'||typeof value.reason!=='string'||!Object.hasOwn(ARCHIVE_CHECK_SUSPEND_COUNTS,value.reason)
    ||!['DATA','HISTORY_DATA'].includes(value.phase)||typeof value.inventorySha256!=='string'||!/^[a-f0-9]{64}$/.test(value.inventorySha256)
    ||value.measurementPoint!=='BEFORE_DATA_SAME_TRANSACTION'||!value.counts
    ||Object.getPrototypeOf(value.counts)!==Object.prototype)return unavailable;
  const bounds=ARCHIVE_CHECK_SUSPEND_COUNTS[value.reason],counts=value.counts;
  if(JSON.stringify(Object.keys(counts).sort())!==JSON.stringify(Object.keys(bounds).sort())
    ||Object.entries(bounds).some(([key,max])=>!Number.isSafeInteger(counts[key])||counts[key]<0||counts[key]>max))return unavailable;
  if(value.reason==='ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND'){
    if(counts.notValidCount>counts.checkCount||Object.keys(bounds).filter(key=>!['checkCount','semanticBytes','notValidCount'].includes(key))
      .some(key=>counts[key]>counts.notValidCount)
      ||!(counts.checkCount===4097||counts.semanticBytes===8388609||counts.unsupportedNotValidCount>0
        ||counts.definitionBytesExceededCount>0||counts.commentBytesExceededCount>0||counts.notValidSuffixMissingCount>0))return unavailable;
  }else if(value.reason==='ARCHIVE_CHECK_TARGET_UNSUPPORTED'){
    if(counts.unsupportedTargetCount<1||Object.keys(bounds).filter(key=>key!=='copyTargetCount').some(key=>counts[key]>counts.copyTargetCount)
      ||counts.missingTargetCount+counts.nonTableTargetCount+counts.partitionTargetCount+counts.inheritanceTargetCount<counts.unsupportedTargetCount)return unavailable;
  }else if(counts.removedSemanticCount+counts.addedSemanticCount<1)return unavailable;
  return {state:value.state,reason:value.reason,phase:value.phase,inventorySha256:value.inventorySha256,
    measurementPoint:value.measurementPoint,counts:Object.fromEntries(Object.keys(bounds).map(key=>[key,counts[key]]))};
}
function archiveCheckSuspendDiagnostic(c,stage,bytes,inputOwner){
  const unavailable={state:'UNAVAILABLE'},phase=stage==='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'?'DATA':stage==='RESTORE_ARCHIVE_HISTORY'?'HISTORY_DATA':null;
  if(!phase||inputOwner!=='CHECK_SUSPEND'||c.archiveRelationInventory?.complete!==true
    ||!Buffer.isBuffer(bytes)||bytes.length>P.diagnosticBytes)return unavailable;
  const text=bytes.toString('utf8'),frames=[...text.matchAll(/^psql:<stdin>:([1-9][0-9]{0,9}): ERROR: +P0001: ([^\r\n]*)\r?$/gm)],
    details=[...text.matchAll(/^DETAIL: +(\{[^\r\n]{1,2048}\})\r?$/gm)];
  if(frames.length!==1||(text.match(/\bERROR:/g)??[]).length!==1||details.length!==1
    ||!Object.hasOwn(ARCHIVE_CHECK_SUSPEND_COUNTS,frames[0][2])||details[0].index<frames[0].index)return unavailable;
  try{
    const report=publicArchiveCheckSuspendDiagnostic(JSON.parse(details[0][1]));
    return report.state==='OWNED_GUARD_BOUND'&&report.reason===frames[0][2]&&report.phase===phase
      &&report.inventorySha256===c.archiveRelationInventory.digest?report:unavailable;
  }catch{return unavailable;}
}
function archiveCheckTupleHash(parts){
  if(!Array.isArray(parts)||parts.length!==3)return null;
  const chunks=[];
  for(const name of parts){
    if(typeof name!=='string'||/[\x00-\x1f\x7f]/.test(name))return null;
    const bytes=Buffer.from(name,'utf8');
    if(bytes.length<1||bytes.length>63||bytes.toString('utf8')!==name)return null;
    const length=Buffer.alloc(4);length.writeUInt32BE(bytes.length);chunks.push(length,bytes);
  }
  return sha(Buffer.concat(chunks));
}
function publicArchiveCheckDiagnostic(value){
  const unavailable={state:'UNAVAILABLE'},keys=['state','tupleSha256','schemaClass','contype','convalidated','measurementPoint'];
  if(!value||Object.getPrototypeOf(value)!==Object.prototype
    ||JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.sort())
    ||value.state!=='CATALOG_BOUND'||!/^[a-f0-9]{64}$/.test(value.tupleSha256??'')
    ||![...Object.values(ARCHIVE_RELATION_SCHEMAS),'OTHER'].includes(value.schemaClass)
    ||value.contype!=='c'||typeof value.convalidated!=='boolean'
    ||value.measurementPoint!==ARCHIVE_CHECK_CATALOG.point)return unavailable;
  return Object.fromEntries(keys.map(key=>[key,value[key]]));
}
function readArchiveCheckCatalog(c,phase,bytes){
  // Diagnostic metadata cannot replace the original SQLSTATE or relation guard.
  c.archiveCheckCatalogs??=new Map();c.archiveCheckCatalogs.delete(phase);
  try{
    if(!Buffer.isBuffer(bytes)||bytes.length>P.diagnosticBytes)return;
    if(c.archiveRelationInventory?.complete!==true||!['DATA','HISTORY_DATA'].includes(phase))return;
    const found=[];
    for(const line of bytes.toString('utf8').split(/\r?\n/))try{
      const value=JSON.parse(line);if(value?.kind==='ARCHIVE_CHECK_CATALOG_V1')found.push(value);
    }catch{}
    if(found.length!==1)return;
    const value=found[0],keys=['kind','phase','inventorySha256','measurementPoint','hashFormat','complete','entries'];
    if(JSON.stringify(Object.keys(value).sort())!==JSON.stringify(keys.sort())
      ||value.phase!==phase||value.inventorySha256!==c.archiveRelationInventory.digest
      ||value.measurementPoint!==ARCHIVE_CHECK_CATALOG.point||value.hashFormat!==ARCHIVE_CHECK_CATALOG.hashFormat
      ||value.complete!==true||!Array.isArray(value.entries)||value.entries.length>ARCHIVE_CHECK_CATALOG.maximum)return;
    const schemas=new Set(c.archiveRelationInventory.relations.filter(r=>r.phase===phase&&r.kind==='COPY').map(r=>r.schemaClass));
    const entries=new Map(),entryKeys=['tupleSha256','schemaClass','contype','convalidated'];
    for(const entry of value.entries){
      if(!entry||Object.getPrototypeOf(entry)!==Object.prototype
        ||JSON.stringify(Object.keys(entry).sort())!==JSON.stringify(entryKeys.sort())
        ||!/^[a-f0-9]{64}$/.test(entry.tupleSha256??'')||!schemas.has(entry.schemaClass)
        ||entry.contype!=='c'||typeof entry.convalidated!=='boolean'||entries.has(entry.tupleSha256))return;
      entries.set(entry.tupleSha256,{...entry});
    }
    c.archiveCheckCatalogs.set(phase,{inventorySha256:value.inventorySha256,entries});
  }catch{ /* No raw diagnostic, partial catalogue, or secondary error escapes. */ }
}
function archiveCheckDiagnostic(c,stage,bytes,inputOwner){
  const unavailable={state:'UNAVAILABLE'};
  if(stage!=='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'||inputOwner!=='DATA')return unavailable;
  const catalog=c.archiveCheckCatalogs?.get('DATA');
  if(!catalog||catalog.inventorySha256!==c.archiveRelationInventory?.digest)return unavailable;
  const text=bytes.toString('utf8');
  const frames=[...text.matchAll(/^psql:<stdin>:([1-9][0-9]{0,9}): ERROR: +23514(?:: [^\r\n]*)?\r?$/gm)];
  if(frames.length!==1||(text.match(/\bERROR:/g)??[]).length!==1)return unavailable;
  const tail=text.slice(frames[0].index+frames[0][0].length),fields=[];
  for(const label of ['SCHEMA NAME','TABLE NAME','CONSTRAINT NAME']){
    const all=[...tail.matchAll(new RegExp('^'+label+':  ([^\\r\\n]*)\\r?$','gm'))];
    if(all.length!==1)return unavailable;fields.push(all[0][1]);
  }
  // Only PostgreSQL's table-CHECK emitter is supported. Its real fields must be
  // the final adjacent fields before LOCATION, not text injected in DETAIL.
  const suffix=/\r?\nSCHEMA NAME:  [^\r\n]*\r?\nTABLE NAME:  [^\r\n]*\r?\nCONSTRAINT NAME:  [^\r\n]*\r?\nLOCATION:  ExecConstraints, execMain\.c:[1-9][0-9]{0,9}\r?\n?$/;
  if(!suffix.test(tail)||(tail.match(/^LOCATION:/gm)??[]).length!==1)return unavailable;
  const tupleSha256=archiveCheckTupleHash(fields),entry=catalog.entries.get(tupleSha256);
  const schemaClass=Object.hasOwn(ARCHIVE_RELATION_SCHEMAS,fields[0])?ARCHIVE_RELATION_SCHEMAS[fields[0]]:'OTHER';
  if(!tupleSha256||!entry||entry.schemaClass!==schemaClass)return unavailable;
  return publicArchiveCheckDiagnostic({state:'CATALOG_BOUND',...entry,measurementPoint:ARCHIVE_CHECK_CATALOG.point});
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
    if(c.archiveRelationInventory&&i===(history?1:2)){
      yield track(archiveRelationPreflightSql(c.archiveRelationInventory,history?'HISTORY_DATA':'DATA'),'RELATION_PREFLIGHT');
      if(c.archive===true)yield track(archiveNotValidCheckSql(c.archiveRelationInventory,history?'HISTORY_DATA':'DATA'),'CHECK_SUSPEND');
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
  if(c.archive===true&&c.archiveRelationInventory)yield track(archiveNotValidCheckSql(c.archiveRelationInventory,history?'HISTORY_DATA':'DATA',true),'CHECK_RESTORE');
}

// Same owned process-group timeout shape as export-supabase-database.mjs.
// Process closure never claims that a Docker daemon-side operation has stopped.
async function command(c,stage,bin,args,{cwd=c.root,input=null,maxMs=P.childMs,audit=null,archivePsql=false,inputLines=null}={}){
  c.stage=stage;need(Date.now()<c.deadline,'OPERATION_DEADLINE');
  if(stage==='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA')c.archiveCheckCatalogs?.delete('DATA');
  if(stage==='RESTORE_ARCHIVE_HISTORY')c.archiveCheckCatalogs?.delete('HISTORY_DATA');
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
  const inputFailure=e=>fail(/^ARCHIVE_SQL_|^ARCHIVE_PARITY_|^ARCHIVE_RELATION_|^OPERATION_DEADLINE$/.test(e?.code??'')?e.code:'STDIN_TRANSPORT');
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
      if(!first)try{
        const report=readArchiveRelationPreflight(c,stage,Buffer.concat(out),exit);
        if(report&&(report.missingCount||report.wrongKindCount)){
          fail('ARCHIVE_RELATION_PREFLIGHT_MISSING');first.inputOwner='RELATION_PREFLIGHT';
        }
      }catch(e){fail(/^ARCHIVE_RELATION_/.test(e.code??'')?e.code:'ARCHIVE_RELATION_REPORT_INVALID');}
      if(!first&&exit===3&&signal===null){
        const bytes=Buffer.concat(err),diagnostic=diagnosticClass(bytes);
        fail(diagnostic.startsWith('SQLSTATE_')?diagnostic:'PSQL_SCRIPT_ERROR');
        if(inputLines&&diagnostic.startsWith('SQLSTATE_'))Object.assign(first,archiveInputDiagnostic(bytes,diagnostic,inputLines));
        if(diagnostic==='SQLSTATE_23514')first.checkConstraint=archiveCheckDiagnostic(c,stage,bytes,first.inputOwner);
        if(diagnostic==='SQLSTATE_P0001'&&first.inputOwner==='CHECK_SUSPEND')
          first.checkSuspend=archiveCheckSuspendDiagnostic(c,stage,bytes,first.inputOwner);
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
function config(id,target,archive=false){return `project_id = "${id}"
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
enabled = ${target&&archive}
[realtime]
# The CLI runs this one-shot bootstrap even when the persistent service is excluded.
enabled = ${target&&archive}
[studio]
enabled = false
[analytics]
enabled = false
[edge_runtime]
enabled = false
`;}
function archiveVendorPinDirectory(c,p){
  need(c.archive===true&&/^[1-9][0-9]{0,18}-1$/.test(c.owner??'')
    &&p.side==='B'&&p.id==='rr_restore_'+c.owner.replace('-','_')+'_b'
    &&path.isAbsolute(c.root)&&p.dir===path.join(c.root,'B'),'ARCHIVE_VENDOR_PROJECT');
  return path.join(p.dir,'supabase','.temp');
}
async function verifyArchiveVendorBootstrap(c,p){
  const directory=archiveVendorPinDirectory(c,p);
  for(const at of [c.root,p.dir,path.dirname(directory),directory]){
    const stat=await fs.lstat(at);
    need(stat.isDirectory()&&!stat.isSymbolicLink(),'ARCHIVE_VENDOR_DIRECTORY');
  }
  const names=await fs.readdir(directory);
  need(!names.includes('storage-migration'),'ARCHIVE_VENDOR_MIGRATION_CEILING');
  need(!names.includes('project-ref')&&!names.includes('pooler-url'),'ARCHIVE_VENDOR_LINKED_PROJECT');
  need(names.every(name=>name==='cli-latest'||Object.hasOwn(ARCHIVE_VENDOR_PINS,name)),'ARCHIVE_VENDOR_PIN_INVENTORY');
  for(const [name,value]of Object.entries(ARCHIVE_VENDOR_PINS)){
    const file=path.join(directory,name),named=await fs.lstat(file,{bigint:true});
    const regular=stat=>{
      need(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n,'ARCHIVE_VENDOR_PIN_FILE');
      if(process.platform==='linux')need((stat.mode&0o077n)===0n&&stat.uid===BigInt(process.getuid()),'ARCHIVE_VENDOR_PIN_PERMISSIONS');
    };
    regular(named);need(named.size===BigInt(Buffer.byteLength(value)),'ARCHIVE_VENDOR_PIN_VALUE');
    const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
    try{
      const before=await handle.stat({bigint:true});regular(before);assert.deepEqual(fileIdentity(before),fileIdentity(named));
      const buffer=Buffer.alloc(Buffer.byteLength(value)+1),read=await handle.read(buffer,0,buffer.length,0);
      need(read.bytesRead===Buffer.byteLength(value)&&buffer.subarray(0,read.bytesRead).equals(Buffer.from(value)),'ARCHIVE_VENDOR_PIN_VALUE');
      const after=await handle.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});regular(fresh);
      assert.deepEqual(fileIdentity(before),fileIdentity(after));assert.deepEqual(fileIdentity(after),fileIdentity(fresh));
    }finally{await handle.close();}
  }
}
async function prepareArchiveVendorBootstrap(c,p){
  const directory=archiveVendorPinDirectory(c,p);
  for(const at of [c.root,p.dir,path.dirname(directory)]){
    const stat=await fs.lstat(at);
    need(stat.isDirectory()&&!stat.isSymbolicLink(),'ARCHIVE_VENDOR_DIRECTORY');
  }
  await fs.mkdir(directory,{mode:0o700}).catch(error=>{if(error.code!=='EEXIST')throw error;});
  const stat=await fs.lstat(directory);
  need(stat.isDirectory()&&!stat.isSymbolicLink(),'ARCHIVE_VENDOR_DIRECTORY');
  const names=await fs.readdir(directory);
  need(!names.includes('storage-migration'),'ARCHIVE_VENDOR_MIGRATION_CEILING');
  need(!names.includes('project-ref')&&!names.includes('pooler-url'),'ARCHIVE_VENDOR_LINKED_PROJECT');
  // The CLI may keep its own latest-version cache; no prior service pins are adopted.
  need(names.every(name=>name==='cli-latest'),'ARCHIVE_VENDOR_PIN_EXISTS');
  for(const [name,value]of Object.entries(ARCHIVE_VENDOR_PINS))
    await fs.writeFile(path.join(directory,name),value,{flag:'wx',mode:0o600});
  await verifyArchiveVendorBootstrap(c,p);
}
// Synthetic A/B use the same already pinned Auth197 contract as archive B.
// A fresh owned project receives only this create-only CLI version hint.
async function syntheticAuthVersionPin(c,p,create){
  need(c.archive===false&&/^[1-9][0-9]{0,18}-1$/.test(c.owner??'')&&['A','B'].includes(p.side)
    &&p.id==='rr_restore_'+c.owner.replace('-','_')+'_'+p.side.toLowerCase()
    &&path.isAbsolute(c.root)&&p.dir===path.join(c.root,p.side),'SYNTHETIC_AUTH_PIN_TARGET');
  const directory=path.join(p.dir,'supabase','.temp'),value=IMAGES.auth.split(':').at(-1)+'\n';
  for(const at of [c.root,p.dir,path.dirname(directory)]){
    const stat=await fs.lstat(at);need(stat.isDirectory()&&!stat.isSymbolicLink(),'SYNTHETIC_AUTH_PIN_DIRECTORY');
  }
  if(create)await fs.mkdir(directory,{mode:0o700}).catch(e=>{if(e.code!=='EEXIST')throw e;});
  const stat=await fs.lstat(directory);need(stat.isDirectory()&&!stat.isSymbolicLink(),'SYNTHETIC_AUTH_PIN_DIRECTORY');
  const names=await fs.readdir(directory);
  need(names.every(name=>name==='cli-latest'||!create&&name==='gotrue-version'),'SYNTHETIC_AUTH_PIN_INVENTORY');
  const file=path.join(directory,'gotrue-version');
  if(create)await fs.writeFile(file,value,{flag:'wx',mode:0o600});
  const regular=st=>{need(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1n,'SYNTHETIC_AUTH_PIN_FILE');
    if(process.platform==='linux')need((st.mode&0o077n)===0n&&st.uid===BigInt(process.getuid()),'SYNTHETIC_AUTH_PIN_PERMISSIONS');};
  const named=await fs.lstat(file,{bigint:true});regular(named);need(named.size===BigInt(Buffer.byteLength(value)),'SYNTHETIC_AUTH_PIN_VALUE');
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{const before=await handle.stat({bigint:true});regular(before);assert.deepEqual(fileIdentity(before),fileIdentity(named));
    const bytes=Buffer.alloc(Buffer.byteLength(value)+1),read=await handle.read(bytes,0,bytes.length,0);
    need(read.bytesRead===Buffer.byteLength(value)&&bytes.subarray(0,read.bytesRead).equals(Buffer.from(value)),'SYNTHETIC_AUTH_PIN_VALUE');
    const after=await handle.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});regular(fresh);
    assert.deepEqual(fileIdentity(before),fileIdentity(after));assert.deepEqual(fileIdentity(after),fileIdentity(fresh));
  }finally{await handle.close();}
}
function serviceImageMetadata(c,p,service,info,image){
  need(c.archive!==true||p.side==='B','ARCHIVE_VENDOR_PROJECT');
  const expected=c.archive===true&&service==='auth'?ARCHIVE_VENDOR_IMAGES.auth:IMAGES[service];
  need(typeof expected==='string','UNEXPECTED_SERVICE_IMAGE');
  // Keep normal registry/mirror selection, exact tag, content identity and digest checks.
  const short=expected.split('/').at(-1);
  need(image.Id===info.Image&&typeof info.Config.Image==='string'
    &&info.Config.Image.split('/').at(-1)===short,'UNEXPECTED_SERVICE_IMAGE');
  need(Array.isArray(image.RepoDigests)&&image.RepoDigests.length>0,'IMAGE_DIGEST_REQUIRED');
  return {id:image.Id,digests:[...image.RepoDigests].sort()};
}
async function startProject(c,p){
  await fs.mkdir(p.dir,{mode:0o700});await projectsAbsent(c,p);
  const before=(await command(c,'NETWORK_ABSENCE','docker',['network','ls','-q','--filter','name=^'+p.network+'$'])).toString().trim();
  need(!before,'NETWORK_ALREADY_EXISTS');
  await command(c,'INIT_'+p.side,'supabase',['init','--yes'],{cwd:p.dir,maxMs:30_000});
  await fs.writeFile(path.join(p.dir,'supabase/config.toml'),config(p.id,p.side==='B',c.archive===true),{mode:0o600});
  if(c.archive===true)await prepareArchiveVendorBootstrap(c,p);
  else await syntheticAuthVersionPin(c,p,true);
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
  if(c.archive===true)await verifyArchiveVendorBootstrap(c,p);
  else await syntheticAuthVersionPin(c,p,false);
  const actual={};
  for(const service of ['db','kong','auth']){
    const info=(await jsonCommand(c,'INSPECT_'+p.side+'_'+service,['inspect','supabase_'+service+'_'+p.id]))[0];
    p[service]=ownedContainer(info,p,service,c.archive);const image=(await jsonCommand(c,'IMAGE_'+service,['image','inspect',info.Image]))[0];
    actual[service]=serviceImageMetadata(c,p,service,info,image);
  }
  const found=(await command(c,'EXACT_SERVICE_SET','docker',['ps','--no-trunc','-aq','--filter','label=com.supabase.cli.project='+p.id])).toString().trim().split(/\s+/).filter(Boolean);
  assert.deepEqual(found.sort(),[p.db,p.kong,p.auth].sort());
  if(c.images)assert.deepEqual(actual,c.images);else c.images=actual;
  const status=JSON.parse((await command(c,'STATUS_'+p.side,'supabase',['status','--output','json'],{cwd:p.dir,maxMs:30_000})).toString());
  p.api=localUrl(status.API_URL,'api');p.dbUrl=localUrl(status.DB_URL,'db');
  need(typeof status.ANON_KEY==='string'&&status.ANON_KEY.length>32&&typeof status.SERVICE_ROLE_KEY==='string'
    &&status.SERVICE_ROLE_KEY.length>32,'LOCAL_RUNTIME_KEYS_REQUIRED');p.anon=status.ANON_KEY;p.service=status.SERVICE_ROLE_KEY;
}
function psqlArguments(c,p,stage,inputLines){
  const archiveHistory=c.archive===true&&p.side==='B'&&stage==='RESTORE_ARCHIVE_HISTORY'&&inputLines!==null;
  return ['exec','-i','-e','PGPASSWORD='+decodeURIComponent(p.dbUrl.password),p.db,'psql','-X',
    '--host=127.0.0.1','--port=5432','--username=postgres','--dbname=postgres','--quiet','--single-transaction','--variable=ON_ERROR_STOP=1',
    ...(archiveHistory?['--set=VERBOSITY=verbose','--set=SHOW_CONTEXT=never']:['--set=VERBOSITY=sqlstate']),
    '--tuples-only','--no-align',...(inputLines?['--file=-']:[])];
}
async function psql(c,p,stage,bytes,inputLines=null){
  return command(c,stage,'docker',psqlArguments(c,p,stage,inputLines),
    {input:bytes,maxMs:90_000,archivePsql:!Buffer.isBuffer(bytes),inputLines});
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
  if(c.archive===true){
    need(c.archiveRelationInventory?.complete===true,'ARCHIVE_RELATION_CHECK_INVENTORY');
    c.archiveNotValidCheckExpected??=new Set();c.archiveNotValidCheckExpected.add(history?'HISTORY_DATA':'DATA');
    c.archiveNotValidCheckReports?.delete(history?'HISTORY_DATA':'DATA');
  }
  const inputLines={next:1,ranges:new Map(),...(history?{}:{roleLineClasses:null})};
  const input=materializedRestoreBytes(c,archive,history,inputLines);
  if(history)return psql(c,p,stage,input,inputLines);
  return command(c,stage,'docker',archiveBootstrapPsqlArguments(c,p),{input,maxMs:90_000,archivePsql:true,inputLines});
}
async function query(c,p,stage,sql){return JSON.parse((await psql(c,p,stage,Buffer.from(sql+'\n'))).toString().trim());}
function authRequestShape(c,p,route,body,method,status){
  const adminUser=/^\/admin\/users\/([a-f0-9-]{36})$/i.exec(route),refresh=route==='/token?grant_type=refresh_token';
  const original=['/admin/users','/token?grant_type=password','/user'].includes(route);
  need(original||c.archive===false&&p.side==='B'&&(refresh||adminUser&&uuid(adminUser[1])),'AUTH_ROUTE');
  const actualMethod=method??(body?'POST':'GET'),readback=Array.isArray(status);
  need(adminUser?actualMethod==='GET'&&body===null||actualMethod==='DELETE'
      &&body?.should_soft_delete===false&&Object.keys(body).length===1
    :actualMethod===(route==='/user'?'GET':'POST'),'AUTH_METHOD');
  need(!readback||adminUser&&actualMethod==='GET'&&JSON.stringify(status)==='[200,404]','AUTH_READBACK_STATUS');
  return {method:actualMethod,admin:route==='/admin/users'||Boolean(adminUser),readback,
    kind:adminUser?(actualMethod==='DELETE'?'DELETE':'ADMIN_USER'):refresh?'REFRESH':route==='/admin/users'?'CREATE':route==='/user'?'USER':'PASSWORD'};
}
async function auth(c,p,route,{body=null,token=null,status=200,method=null}={}){
  const shape=authRequestShape(c,p,route,body,method,status);
  c.stage=p.side+'_AUTH_'+shape.kind;
  need(Date.now()<c.deadline,'OPERATION_DEADLINE');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(10_000,c.deadline-Date.now()));
  try{
    const endpoint=c.archive?await archiveAuthEndpoint(c,p):null;
    const url=new URL('/auth/v1'+route,endpoint?'http://'+endpoint.address+':8000':p.api),headers={apikey:shape.admin?p.service:p.anon};
    if(token)headers.Authorization='Bearer '+token;if(body)headers['Content-Type']='application/json';
    const response=await fetch(url,{method:shape.method,headers,body:body?JSON.stringify(body):undefined,
      redirect:'error',signal:controller.signal});
    const reader=response.body?.getReader();need(reader,'AUTH_BODY');const chunks=[];let n=0;
    try{while(true){const part=await reader.read();if(part.done)break;n+=part.value.length;need(n<=64*1024,'AUTH_BODY_BOUND');chunks.push(Buffer.from(part.value));}}
    finally{await reader.cancel().catch(()=>{});}
    if(endpoint)assert.deepEqual(await archiveAuthEndpoint(c,p),endpoint,'ARCHIVE_AUTH_ENDPOINT_MOVED');
    c.authRequests.push({project:p.side,kind:c.stage,status:response.status,bodyBytes:n});
    need(shape.readback?status.includes(response.status):response.status===status,'AUTH_STATUS_'+response.status);
    const user=response.status===200?JSON.parse(Buffer.concat(chunks).toString('utf8')):null;
    return shape.readback?{status:response.status,user}:user;
  }finally{clearTimeout(timer);controller.abort();}
}
async function verifyArchiveAuthFunction(c,p){
  const email='isolated-archive-'+crypto.randomBytes(16).toString('hex')+'@example.invalid';
  const password=crypto.randomBytes(32).toString('base64url'),metadata={scope:'disposable-isolated-archive-restore-probe'};
  const created=await auth(c,p,'/admin/users',{token:p.service,body:{email,password,email_confirm:true,user_metadata:metadata}});
  need(uuid(created.id),'ARCHIVE_PROBE_USER_ID');
  const login=await auth(c,p,'/token?grant_type=password',{body:{email,password}});
  need(login.user?.id===created.id&&typeof login.access_token==='string','ARCHIVE_PROBE_AUTH_LOGIN');
  const user=await auth(c,p,'/user',{token:login.access_token});need(user.id===created.id,'ARCHIVE_PROBE_AUTH_USER');
  need(user.user_metadata?.scope===metadata.scope,'ARCHIVE_PROBE_AUTH_METADATA');
  await auth(c,p,'/token?grant_type=password',{body:{email,password:password+'wrong'},status:400});
}
// This probe creates and deletes only its dedicated user in synthetic B.
// Original archive Auth verification and every original restore SQL byte stay separate.
function syntheticIssuedJwtClaims(token,userId){
  need(typeof token==='string'&&token.length<=16384&&/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token),'SYNTHETIC_AUTH_JWT');
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString('utf8'));
  need(claims?.sub===userId&&uuid(claims.session_id)&&Number.isSafeInteger(claims.exp)
    &&claims.exp>Date.now()/1000,'SYNTHETIC_AUTH_JWT_CLAIMS');
  // Decoding an actual issuer response is not a signature/revocation assertion.
  return Object.freeze({userId,sessionId:claims.session_id,expiresAt:claims.exp});
}
function syntheticAuthCountsSql(intent){
  need(intent&&Object.keys(intent).sort().join(',')==='operationId,sessionId,userId'
    &&uuid(intent.operationId)&&uuid(intent.userId)&&uuid(intent.sessionId),'SYNTHETIC_AUTH_IDENTITY');
  const user=intent.userId,session=intent.sessionId;
  return `select jsonb_build_object('users',(select count(*) from auth.users where id='${user}'::uuid),
    'sessions',(select count(*) from auth.sessions where user_id='${user}'::uuid),
    'matchingSession',(select count(*) from auth.sessions where user_id='${user}'::uuid and id='${session}'::uuid),
    'refreshTokens',(select count(*) from auth.refresh_tokens where user_id::text='${user}'),
    'identities',(select count(*) from auth.identities where user_id='${user}'::uuid),
    'refreshed',exists(select 1 from auth.sessions where user_id='${user}'::uuid and id='${session}'::uuid and refreshed_at is not null));`;
}
function syntheticAuthDeleteReadback(intent,expected,admin,counts){
  need(JSON.stringify(intent)===JSON.stringify(expected),'SYNTHETIC_AUTH_OPERATION_CHANGED');syntheticAuthCountsSql(intent);
  need(counts&&Object.keys(counts).sort().join(',')==='identities,matchingSession,refreshTokens,refreshed,sessions,users'
    &&['users','sessions','matchingSession','refreshTokens','identities'].every(k=>Number.isSafeInteger(counts[k])&&counts[k]>=0)
    &&typeof counts.refreshed==='boolean','SYNTHETIC_AUTH_COUNTS');
  need(admin?.status===404&&admin.user===null&&counts.users===0&&counts.sessions===0
    &&counts.matchingSession===0&&counts.refreshTokens===0&&counts.identities===0&&!counts.refreshed,
    'SYNTHETIC_AUTH_DELETE_COMMIT_UNKNOWN');
  return Object.freeze({...intent,state:'AUTH_ABSENT_BY_ADMIN_AND_PG_READBACK'});
}
function syntheticAccountErasureAuthFenceSql(source,intent,actorId){
  syntheticAuthCountsSql(intent);
  need(uuid(actorId)&&actorId!==intent.userId&&source&&typeof source.sql==='string'
    &&source.sha256===sha(Buffer.from(source.sql)),'SYNTHETIC_ERASURE_FENCE_SOURCE');
  const tableStart='create table public.account_erasure_operations (',tableEnd='create function public.account_erasure_require_owner()',
    guardStart='create function public.account_erasure_auth_uuid_guard()',guardEnd='comment on table public.account_erasure_operations is';
  for(const marker of [tableStart,tableEnd,guardStart,guardEnd])
    need(source.sql.split(marker).length===2,'SYNTHETIC_ERASURE_FENCE_SOURCE');
  const outbox=source.sql.slice(source.sql.indexOf(tableStart),source.sql.indexOf(tableEnd)),
    guard=source.sql.slice(source.sql.indexOf(guardStart),source.sql.indexOf(guardEnd)),
    body=/as \$auth_uuid\$\n([\s\S]*?)\n\$auth_uuid\$;/.exec(guard)?.[1];
  need(outbox.startsWith(tableStart)&&guard.startsWith(guardStart)&&typeof body==='string'
    &&source.bodies?.account_erasure_auth_uuid_guard===sha(Buffer.from(body.trim())),
    'SYNTHETIC_ERASURE_FENCE_SOURCE');
  // Exactly the current migration's outbox DDL and Auth fence. The only small
  // extra table is an explicit profile-id fixture with the actual Auth CASCADE.
  // This is not a full profiles schema, PG-stage RPC or Storage qualification.
  // The existing psql caller owns --single-transaction; do not end it here.
  const sql=`set local lock_timeout='5s'; set local statement_timeout='30s';
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade);
${outbox}${guard}
insert into public.profiles(id) values('${intent.userId}'::uuid);
with own_clock as(select clock_timestamp() as at)
insert into public.account_erasure_operations(operation_id,target_user_id,requested_by,profile_was_active,state,prepared_at,updated_at,pg_staged_at)
select '${intent.operationId}'::uuid,'${intent.userId}'::uuid,'${actorId}'::uuid,true,'PG_STAGED_AUTH_PENDING',at,at,at from own_clock;
\n`;
  return {sql,sourceSha256:source.sha256,outboxDdlSha256:sha(Buffer.from(outbox)),authGuardDdlSha256:sha(Buffer.from(guard)),
    authGuardBodyMd5:crypto.createHash('md5').update(body.trim()).digest('hex')};
}
function syntheticAccountErasureAuthFenceReadbackSql(intent){
  syntheticAuthCountsSql(intent);
  return `select jsonb_build_object('profiles',(select count(*) from public.profiles where id='${intent.userId}'::uuid),
    'outboxRows',(select count(*) from public.account_erasure_operations where operation_id='${intent.operationId}'::uuid
      and target_user_id='${intent.userId}'::uuid and state='PG_STAGED_AUTH_PENDING' and pg_staged_at is not null),
    'guardMd5',(select md5(btrim(prosrc,E' \\n\\r\\t')) from pg_catalog.pg_proc where oid='public.account_erasure_auth_uuid_guard()'::regprocedure),
    'triggerScoped',exists(select 1 from pg_catalog.pg_trigger where tgname='account_erasure_auth_uuid_insert_guard'
      and tgrelid='auth.users'::regclass and tgfoid='public.account_erasure_auth_uuid_guard()'::regprocedure
      and tgtype=7 and tgenabled='O' and not tgisinternal));`;
}
async function verifySyntheticBAuthLifecycle(c,p,fixtureActorId){
  need(c.archive===false&&p.side==='B'&&uuid(fixtureActorId),'SYNTHETIC_AUTH_LIFECYCLE_TARGET');
  const email='owned-lifecycle-'+crypto.randomBytes(16).toString('hex')+'@example.invalid',password=crypto.randomBytes(32).toString('base64url');
  const created=await auth(c,p,'/admin/users',{token:p.service,body:{email,password,email_confirm:true}});
  need(uuid(created.id),'SYNTHETIC_AUTH_CREATED_USER');
  const login=await auth(c,p,'/token?grant_type=password',{body:{email,password}});
  need(login.user?.id===created.id&&typeof login.refresh_token==='string','SYNTHETIC_AUTH_LOGIN');
  const claims=syntheticIssuedJwtClaims(login.access_token,created.id);
  const currentUser=await auth(c,p,'/user',{token:login.access_token});need(currentUser.id===created.id,'SYNTHETIC_AUTH_USER');
  const refreshed=await auth(c,p,'/token?grant_type=refresh_token',{body:{refresh_token:login.refresh_token}});
  need(refreshed.user?.id===created.id&&typeof refreshed.refresh_token==='string','SYNTHETIC_AUTH_REFRESH');
  const nextClaims=syntheticIssuedJwtClaims(refreshed.access_token,created.id);need(nextClaims.sessionId===claims.sessionId,'SYNTHETIC_AUTH_REFRESH_SESSION');
  const intent=Object.freeze({operationId:crypto.randomUUID(),userId:created.id,sessionId:claims.sessionId}),expected=structuredClone(intent);
  const admin=await auth(c,p,'/admin/users/'+intent.userId,{token:p.service});need(admin.id===intent.userId,'SYNTHETIC_AUTH_ADMIN_USER');
  const sql=syntheticAuthCountsSql(intent),before=await query(c,p,'SYNTHETIC_AUTH_BEFORE_DELETE',sql);
  need(before.users===1&&before.sessions===1&&before.matchingSession===1&&before.identities===1&&before.refreshed===true,'SYNTHETIC_AUTH_LIVE_SESSION');
  const fence=syntheticAccountErasureAuthFenceSql(readAccountErasureSource(),intent,fixtureActorId),
    fenceReadback=syntheticAccountErasureAuthFenceReadbackSql(intent);
  await psql(c,p,'SYNTHETIC_ACCOUNT_ERASURE_AUTH_UUID_FENCE_SETUP',Buffer.from(fence.sql));
  const fenceBefore=await query(c,p,'SYNTHETIC_ACCOUNT_ERASURE_AUTH_UUID_FENCE_BEFORE',fenceReadback);
  assert.deepEqual(fenceBefore,{profiles:1,outboxRows:1,guardMd5:fence.authGuardBodyMd5,triggerScoped:true});
  // One real native DELETE; deliberately discard its reply. A transport failure
  // is likewise unknown until independent readback. Never retry the mutation here.
  try{await auth(c,p,'/admin/users/'+intent.userId,{method:'DELETE',token:p.service,body:{should_soft_delete:false}});}
  catch{/* Only exact admin + database absence can close an unknown outcome. */}
  let first;
  for(let i=0;i<2;i++){
    const read=await auth(c,p,'/admin/users/'+intent.userId,{token:p.service,status:[200,404]});
    const counts=await query(c,p,'SYNTHETIC_AUTH_DELETE_READBACK',sql);
    const result=syntheticAuthDeleteReadback(intent,expected,read,counts);
    if(first)assert.deepEqual(result,first);else first=result;
  }
  await auth(c,p,'/token?grant_type=refresh_token',{body:{refresh_token:refreshed.refresh_token},status:400});
  need(claims.expiresAt>Date.now()/1000,'SYNTHETIC_AUTH_OLD_JWT_EXPIRED');
  await auth(c,p,'/user',{token:login.access_token,status:403});
  await auth(c,p,'/token?grant_type=password',{body:{email,password},status:400});
  syntheticAuthDeleteReadback(intent,expected,{status:404,user:null},await query(c,p,'SYNTHETIC_AUTH_FINAL_ABSENCE',sql));
  // The same former email/password with a custom erased UUID must fail in the
  // real GoTrue transaction. No SQL Auth DELETE or legacy bootstrap is used.
  await auth(c,p,'/admin/users',{token:p.service,body:{id:intent.userId,email,password,email_confirm:true},status:500});
  const customRead=await auth(c,p,'/admin/users/'+intent.userId,{token:p.service,status:[200,404]});
  syntheticAuthDeleteReadback(intent,expected,customRead,await query(c,p,'SYNTHETIC_AUTH_CUSTOM_ID_ROLLBACK',sql));
  const fenceAfter=await query(c,p,'SYNTHETIC_ACCOUNT_ERASURE_AUTH_UUID_FENCE_AFTER',fenceReadback);
  assert.deepEqual(fenceAfter,{...fenceBefore,profiles:0});
  // Reuse the deleted account's own email so an unrelated email rejection
  // cannot masquerade as the UUID fence. A genuine fresh UUID still logs in.
  const fresh=await auth(c,p,'/admin/users',{token:p.service,body:{email,password,email_confirm:true}});
  need(uuid(fresh.id)&&fresh.id!==intent.userId,'SYNTHETIC_AUTH_FRESH_UUID');
  const freshLogin=await auth(c,p,'/token?grant_type=password',{body:{email,password}});
  need(freshLogin.user?.id===fresh.id,'SYNTHETIC_AUTH_FRESH_UUID_LOGIN');
  const freshClaims=syntheticIssuedJwtClaims(freshLogin.access_token,fresh.id);
  need((await auth(c,p,'/user',{token:freshLogin.access_token})).id===fresh.id,'SYNTHETIC_AUTH_FRESH_UUID_USER');
  const freshCounts=await query(c,p,'SYNTHETIC_AUTH_FRESH_UUID_SESSION',syntheticAuthCountsSql({operationId:crypto.randomUUID(),userId:fresh.id,sessionId:freshClaims.sessionId}));
  need(freshCounts.users===1&&freshCounts.sessions===1&&freshCounts.matchingSession===1&&freshCounts.identities===1
    &&freshCounts.refreshTokens>=1,'SYNTHETIC_AUTH_FRESH_UUID_SESSION');
  syntheticAuthDeleteReadback(intent,expected,{status:404,user:null},await query(c,p,'SYNTHETIC_AUTH_ERASED_UUID_STILL_ABSENT',sql));
  return Object.freeze({kind:'SYNTHETIC_B_GOTRUE_ADMIN_DELETE_REFRESH_READBACK',authImage:IMAGES.auth,
    normalRefreshVerified:true,liveSessionVerified:true,normalHardDeleteVerifiedByReadback:true,
    deleteAttempts:1,deleteReplyDeliberatelyDiscarded:true,stableReadbackCount:2,
    refreshAndPasswordAfterDeleteRejected:true,oldAccessJwtStillUnexpired:true,oldJwtUserLookupRejected:true,
    usersSessionsTokensIdentitiesAbsent:true,jwtRevocationClaimed:false,durableOutboxVerified:false,
    authUuidFence:{sourceSha256:fence.sourceSha256,outboxDdlSha256:fence.outboxDdlSha256,authGuardDdlSha256:fence.authGuardDdlSha256,
      exactCurrentMigrationFragments:true,profileIdFixtureOnly:true,profileAuthCascadeVerified:true,seededPgStageOnly:true,
      customIdCreateRejectedAndRolledBack:true,erasedUuidStillAbsent:true,freshUuidSameEmailLoginVerified:true,
      legacyBootstrapClaimed:false,fullAppSchemaVerified:false},
    lifecycleRpcVerified:false,loginRefreshDeleteConcurrencyVerified:false,
    unknownNetworkFaultInjected:false,productionAuthVerified:false});
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
create table public.rr_restore_duplicates(value text);
insert into public.rr_restore_duplicates(value) values ('same'),('same'),('other');
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

const COPY_IDENTIFIER='"(?:[^"\\r\\n]|"")+"';
const COPY_QUALIFIED=COPY_IDENTIFIER+'\\.'+COPY_IDENTIFIER;
const COPY_HEADER=new RegExp('^COPY ('+COPY_QUALIFIED+') \\(('+COPY_IDENTIFIER+'(?:, '+COPY_IDENTIFIER+')*)\\) FROM stdin;$');
const SETVAL_HEADER=/^SELECT pg_catalog\.setval\('((?:[^']|'')+)', (-?[0-9]+), (true|false)\);$/;
const qualifiedCopyName=new RegExp('^'+COPY_QUALIFIED+'$');
const sqlString=value=>"'"+value.replaceAll("'","''")+"'";
async function* archiveParityFileChunks(c,archive,name){
  need(['data.sql','history-data.sql'].includes(name),'ARCHIVE_PARITY_FILE');
  for(let at=archive.directory;;at=path.dirname(at)){
    need(at===c.root||inside(c.root,at),'ARCHIVE_SQL_DIRECTORY');const st=await fs.lstat(at);
    need(st.isDirectory()&&!st.isSymbolicLink(),'ARCHIVE_SQL_DIRECTORY');if(at===c.root)break;
  }
  const dir=await fs.lstat(archive.directory,{bigint:true}),entry=archive.files.find(f=>f.file===name);
  need(entry&&Number.isSafeInteger(entry.bytes)&&entry.bytes>0&&entry.bytes<=ARCHIVE_SQL.fileBytes,'ARCHIVE_FILE_DESCRIPTOR');
  const file=path.join(archive.directory,name),named=await fs.lstat(file,{bigint:true});privateSqlFile(named);
  const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const before=await h.stat({bigint:true});privateSqlFile(before);assert.deepEqual(fileIdentity(before),fileIdentity(named));
    need(before.size===BigInt(entry.bytes),'ARCHIVE_SQL_LENGTH');const digest=crypto.createHash('sha256');
    const buffer=Buffer.alloc(ARCHIVE_SQL.chunkBytes);let count=0;
    for(;;){need(Date.now()<c.deadline,'OPERATION_DEADLINE');const {bytesRead}=await h.read(buffer,0,buffer.length,null);if(!bytesRead)break;
      count+=bytesRead;need(count<=entry.bytes,'ARCHIVE_SQL_LENGTH');const bytes=Buffer.from(buffer.subarray(0,bytesRead));digest.update(bytes);yield bytes;}
    const after=await h.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});privateSqlFile(fresh);
    assert.deepEqual(fileIdentity(before),fileIdentity(after));assert.deepEqual(fileIdentity(after),fileIdentity(fresh));
    need(count===entry.bytes&&digest.digest('hex')===entry.sha256,'ARCHIVE_SQL_SHA');
    const current=await fs.lstat(archive.directory,{bigint:true});need(current.isDirectory()&&!current.isSymbolicLink()
      &&current.dev===dir.dev&&current.ino===dir.ino,'ARCHIVE_SQL_DIRECTORY_CHANGED');
  }finally{await h.close();}
}
async function* archiveParitySql(c,archive,summary,inventoryOnly=false){
  need(typeof inventoryOnly==='boolean','ARCHIVE_RELATION_PARSE_MODE');
  const tables=new Set(),sequences=new Set();let ordinal=0,rows=0;
  const relations=[];let relationBytes=0;
  const remember=(file,kind,qualified)=>{
    const entry=archiveRelationEntry(file,kind,qualified);relationBytes+=Buffer.byteLength(JSON.stringify(entry));
    need(relationBytes<=P.diagnosticBytes,'ARCHIVE_RELATION_INVENTORY_BOUND');relations.push(entry);
  };
  const text=value=>Buffer.from(value,'utf8');
  if(!inventoryOnly)yield text('SET LOCAL standard_conforming_strings = on;\nSET LOCAL client_encoding = \'UTF8\';\nSET LOCAL statement_timeout = \'90s\';\n');
  for(const file of ['data.sql','history-data.sql']){
    let header=[],headerBytes=0,copy=null,lineBytes=0,prefix=Buffer.alloc(0);
    const controlState={restrict:null,seenRestrict:false},utf8=new TextDecoder('utf-8',{fatal:true});
    function endCopy(){
      const {table,columns,temp}=copy,record='ROW('+columns+')::text COLLATE "C"';
      const expected=`SELECT ${record} FROM pg_temp.${temp}`,actual=`SELECT ${record} FROM ONLY ${table}`;
      copy=null;
      return `DO $rr_archive_parity$ BEGIN IF EXISTS (((${expected}) EXCEPT ALL (${actual})) UNION ALL ((${actual}) EXCEPT ALL (${expected}))) THEN RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_DATA_CONTENT_OR_DUPLICATE_MISMATCH'; END IF; END $rr_archive_parity$;\nDROP TABLE pg_temp.${temp};\n`;
    }
    function control(bytes){
      const line=new TextDecoder('utf-8',{fatal:true}).decode(bytes).replace(/\r?\n$/,'');
      if(inventoryOnly&&archiveInventoryControl(line,controlState))return '';
      if(!inventoryOnly&&(!line.trim()||/^--[^\r\n]*$/.test(line)||/^\\(?:un)?restrict [A-Za-z0-9]+$/.test(line)
        ||/^SET [A-Za-z_][A-Za-z0-9_. ]* = [^\r\n]+;$/.test(line)||line==='RESET ALL;'
        ||line==="SELECT pg_catalog.set_config('search_path', '', false);"))return '';
      const start=COPY_HEADER.exec(line);
      if(start){const [,table,columns]=start;need(!tables.has(table),'ARCHIVE_PARITY_DUPLICATE_COPY');tables.add(table);
        need(tables.size<=4096,'ARCHIVE_PARITY_TABLE_BOUND');const temp='"rr_archive_expected_'+String(++ordinal)+'"';
        if(inventoryOnly)remember(file,'COPY',table);
        copy={table,columns,temp};return inventoryOnly?'':`CREATE TEMP TABLE ${temp} ON COMMIT DROP AS SELECT ${columns} FROM ONLY ${table} WITH NO DATA;\nCOPY pg_temp.${temp} (${columns}) FROM stdin;\n`;}
      const sequence=SETVAL_HEADER.exec(line);
      if(sequence){const name=sequence[1].replaceAll("''","'"),value=sequence[2],called=sequence[3];
        need(qualifiedCopyName.test(name)&&!sequences.has(name),'ARCHIVE_PARITY_SEQUENCE');sequences.add(name);
        need(sequences.size<=4096,'ARCHIVE_PARITY_SEQUENCE_BOUND');
        if(inventoryOnly){need(BigInt(value)>=-(1n<<63n)&&BigInt(value)<(1n<<63n),'ARCHIVE_RELATION_SEQUENCE_VALUE');remember(file,'SEQUENCE',name);return '';}
        return `DO $rr_archive_parity$ DECLARE v text; c boolean; BEGIN SELECT last_value::text,is_called INTO STRICT v,c FROM ${name}; IF v IS DISTINCT FROM ${sqlString(value)} OR c IS DISTINCT FROM ${called} THEN RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_SEQUENCE_MISMATCH'; END IF; END $rr_archive_parity$;\n`;}
      need(false,'ARCHIVE_PARITY_UNSUPPORTED_DATA_COMMAND');
    }
    for await(const chunk of archiveParityFileChunks(c,archive,file)){
      if(inventoryOnly){need(!chunk.includes(0),'ARCHIVE_RELATION_NUL');utf8.decode(chunk,{stream:true});}
      for(let from=0;from<chunk.length;){
        const nl=chunk.indexOf(10,from),end=nl<0?chunk.length:nl+1,part=chunk.subarray(from,end),complete=nl>=0;
        if(copy){
          const content=complete?part.subarray(0,part.length-1):part;
          if(prefix.length<3)prefix=Buffer.concat([prefix,content.subarray(0,3-prefix.length)]);
          lineBytes+=content.length;if(!inventoryOnly)yield part;
          if(complete){const terminator=lineBytes===2&&prefix.subarray(0,2).equals(Buffer.from('\\.'))
            ||lineBytes===3&&prefix.equals(Buffer.from('\\.\r'));
            if(terminator){if(inventoryOnly)copy=null;else yield text(endCopy());}else rows++;
            lineBytes=0;prefix=Buffer.alloc(0);}
        }else{
          headerBytes+=part.length;need(headerBytes<=8192,'ARCHIVE_PARITY_CONTROL_BOUND');header.push(part);
          if(complete){const sql=control(Buffer.concat(header,headerBytes));header=[];headerBytes=0;if(sql)yield text(sql);}
        }
        from=end;
      }
    }
    need(copy===null&&lineBytes===0,'ARCHIVE_PARITY_UNTERMINATED_COPY');
    if(headerBytes){const sql=control(Buffer.concat(header,headerBytes));need(copy===null,'ARCHIVE_PARITY_UNTERMINATED_COPY');if(sql)yield text(sql);}
    if(inventoryOnly){utf8.decode();need(controlState.restrict===null,'ARCHIVE_RELATION_UNCLOSED_RESTRICT');}
  }
  need(tables.has('"auth"."users"')&&tables.has('"auth"."identities"'),'ARCHIVE_PARITY_AUTH_TABLES_REQUIRED');
  Object.assign(summary,{tableCount:tables.size,rowCount:rows,sequenceCount:sequences.size});
  if(inventoryOnly)summary.relations=relations;
  else yield text(`SELECT jsonb_build_object('status','PASS','scope','AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES','tables',${tables.size},'rows',${rows},'sequences',${sequences.size});\n`);
}
const ARCHIVE_RELATION_SCHEMAS=Object.freeze({auth:'AUTH',storage:'STORAGE',supabase_functions:'SUPABASE_FUNCTIONS',
  supabase_migrations:'SUPABASE_MIGRATIONS',public:'PUBLIC',cron:'CRON',net:'NET',pgmq:'PGMQ'});
const ARCHIVE_FIXED_RELATIONS=Object.freeze({
  '"storage"."migrations"':'STORAGE_MIGRATIONS','"storage"."buckets"':'STORAGE_BUCKETS','"storage"."objects"':'STORAGE_OBJECTS',
  '"storage"."s3_multipart_uploads"':'STORAGE_MULTIPART_UPLOADS','"storage"."s3_multipart_uploads_parts"':'STORAGE_MULTIPART_PARTS',
  '"storage"."prefixes"':'STORAGE_PREFIXES','"storage"."buckets_analytics"':'STORAGE_ANALYTICS_BUCKETS',
  '"storage"."buckets_vectors"':'STORAGE_VECTOR_BUCKETS','"storage"."vector_indexes"':'STORAGE_VECTOR_INDEXES',
  '"auth"."users"':'AUTH_USERS','"auth"."identities"':'AUTH_IDENTITIES','"auth"."schema_migrations"':'AUTH_SCHEMA_MIGRATIONS',
  '"supabase_migrations"."schema_migrations"':'MIGRATION_HISTORY',
  '"auth"."refresh_tokens"':'AUTH_REFRESH_TOKENS',
  '"auth"."instances"':'AUTH_INSTANCES',
  '"auth"."audit_log_entries"':'AUTH_AUDIT_LOG_ENTRIES',
  '"auth"."sessions"':'AUTH_SESSIONS',
  '"auth"."mfa_factors"':'AUTH_MFA_FACTORS',
  '"auth"."mfa_challenges"':'AUTH_MFA_CHALLENGES',
  '"auth"."mfa_amr_claims"':'AUTH_MFA_AMR_CLAIMS',
  '"auth"."sso_providers"':'AUTH_SSO_PROVIDERS',
  '"auth"."sso_domains"':'AUTH_SSO_DOMAINS',
  '"auth"."saml_providers"':'AUTH_SAML_PROVIDERS',
  '"auth"."saml_relay_states"':'AUTH_SAML_RELAY_STATES',
  '"auth"."sso_sessions"':'AUTH_SSO_SESSIONS',
  '"auth"."flow_state"':'AUTH_FLOW_STATE',
  '"auth"."one_time_tokens"':'AUTH_ONE_TIME_TOKENS',
  '"auth"."oauth_clients"':'AUTH_OAUTH_CLIENTS',
  '"auth"."oauth_authorizations"':'AUTH_OAUTH_AUTHORIZATIONS',
  '"auth"."oauth_consents"':'AUTH_OAUTH_CONSENTS',
  '"auth"."oauth_client_states"':'AUTH_OAUTH_CLIENT_STATES',
  '"auth"."custom_oauth_providers"':'AUTH_CUSTOM_OAUTH_PROVIDERS',
  '"auth"."webauthn_credentials"':'AUTH_WEBAUTHN_CREDENTIALS',
  '"auth"."webauthn_challenges"':'AUTH_WEBAUTHN_CHALLENGES',
  '"storage"."iceberg_namespaces"':'STORAGE_ICEBERG_NAMESPACES',
  '"storage"."iceberg_tables"':'STORAGE_ICEBERG_TABLES',
  '"auth"."scim_users"':'AUTH_SCIM_USERS','"auth"."scim_tokens"':'AUTH_SCIM_TOKENS',
  '"auth"."mfa_recovery_code_sets"':'AUTH_MFA_RECOVERY_CODE_SETS','"auth"."mfa_recovery_codes"':'AUTH_MFA_RECOVERY_CODES',
  '"storage"."bucket_lifecycle_states"':'STORAGE_BUCKET_LIFECYCLE_STATES',
  '"storage"."lifecycle_abandoned_artifacts"':'STORAGE_LIFECYCLE_ABANDONED_ARTIFACTS',
  '"auth"."refresh_tokens_id_seq"':'AUTH_REFRESH_TOKENS_ID_SEQUENCE',
});
const ARCHIVE_LOCAL_AUTH_METADATA=Object.freeze({bytes:16*1024,versions:512});
function archiveLocalAuthBootstrapScope(c){
  const inventory=c.archiveRelationInventory;
  need(c.archive===true&&inventory?.complete===true&&/^[a-f0-9]{64}$/.test(inventory.digest)
    &&Array.isArray(inventory.relations)&&inventory.relations.length<=8192,'ARCHIVE_LOCAL_AUTH_INVENTORY');
  const image=c.images?.auth?.id;
  need(typeof image==='string'&&/^sha256:[a-f0-9]{64}$/.test(image),'ARCHIVE_LOCAL_AUTH_IMAGE');
  const rows=inventory.relations.filter(r=>['AUTH','STORAGE'].includes(r.schemaClass));
  for(const r of rows)assert.deepEqual(r,archiveRelationEntry(r.phase==='DATA'?'data.sql':'history-data.sql',r.kind,r.qualified));
  const fixed=rows.filter(r=>r.relationClass!=='OTHER').map(r=>({label:r.relationClass,kind:r.kind}))
    .sort((a,b)=>(a.label<b.label?-1:a.label>b.label?1:0)||(a.kind<b.kind?-1:a.kind>b.kind?1:0));
  need(fixed.length<=Object.keys(ARCHIVE_FIXED_RELATIONS).length
    &&new Set(fixed.map(r=>r.label+':'+r.kind)).size===fixed.length,'ARCHIVE_LOCAL_AUTH_TARGETS');
  return {inventory,rows,fixed,authImageSha256:image.slice(7)};
}
function archiveLocalAuthBootstrapSql(c){
  const {inventory,rows,authImageSha256}=archiveLocalAuthBootstrapScope(c);
  const required=rows.length?'VALUES '+rows.map(r=>'('+[r.kind,r.qualified,r.relationClass].map(sqlString).join(',')+')').join(',')
    :'SELECT NULL::text,NULL::text,NULL::text WHERE false';
  const common="WITH required(kind,qualified,relation_class) AS ("+required+"),"
    +"observed AS (SELECT e.*,c.oid,c.relkind FROM required e LEFT JOIN pg_catalog.pg_class c ON c.oid=pg_catalog.to_regclass(e.qualified))";
  const migrationKind="coalesce((SELECT CASE c.relkind WHEN 'r' THEN 'TABLE' WHEN 'p' THEN 'PARTITIONED_TABLE' ELSE 'OTHER_KIND' END"
    +" FROM pg_catalog.pg_class c WHERE c.oid=pg_catalog.to_regclass('auth.schema_migrations')),'MISSING')";
  const targets="coalesce((SELECT jsonb_agg(jsonb_build_object('label',relation_class,'kind',kind,'state',"
    +"CASE WHEN oid IS NULL THEN 'MISSING' WHEN relkind='r' THEN 'TABLE' WHEN relkind='p' THEN 'PARTITIONED_TABLE'"
    +" WHEN relkind='S' THEN 'SEQUENCE' ELSE 'OTHER_KIND' END) ORDER BY relation_class COLLATE \"C\",kind COLLATE \"C\")"
    +" FROM observed WHERE relation_class<>'OTHER'),'[]'::jsonb)";
  const fields="'kind','ARCHIVE_LOCAL_AUTH_BOOTSTRAP_V1','measurementPoint','AFTER_AUTH_STOP_BEFORE_ORIGINAL_SQL',"
    +"'inventorySha256',"+sqlString(inventory.digest)+",'authTag',"+sqlString(ARCHIVE_VENDOR_IMAGES.auth.split('/').at(-1))+","
    +"'authImageSha256',"+sqlString(authImageSha256)+",'targetCount',(SELECT count(*) FROM observed),"
    +"'unclassifiedTargetCount',(SELECT count(*) FROM observed WHERE relation_class='OTHER'),'fixedTargets',"+targets+","
    +"'migrationTableKind',"+migrationKind;
  const sql=[
    "SET LOCAL standard_conforming_strings = on;",
    "SELECT "+migrationKind+" IN ('TABLE','PARTITIONED_TABLE') AS rr_local_auth_versions_readable",
    "\\gset",
    "\\if :rr_local_auth_versions_readable",
    common+",versions AS (SELECT version::text AS value FROM auth.schema_migrations),"
      +"version_state AS (SELECT count(*) AS n,count(*) FILTER (WHERE value IS NULL OR value !~ '^[0-9]{1,19}$') AS invalid FROM versions),"
      +"version_sample AS (SELECT value FROM versions WHERE value ~ '^[0-9]{1,19}$' ORDER BY length(value),value COLLATE \"C\" LIMIT "
      +(ARCHIVE_LOCAL_AUTH_METADATA.versions+1)+")",
    "SELECT jsonb_build_object("+fields+",'migrationState',CASE WHEN n>"+ARCHIVE_LOCAL_AUTH_METADATA.versions
      +" THEN 'OVER_BOUND' WHEN invalid>0 THEN 'INVALID_VERSION' ELSE 'OBSERVED' END,"
      +"'migrationCount',CASE WHEN n<="+ARCHIVE_LOCAL_AUTH_METADATA.versions+" THEN n ELSE NULL END,"
      +"'migrationVersions',CASE WHEN n<="+ARCHIVE_LOCAL_AUTH_METADATA.versions+" AND invalid=0"
      +" THEN coalesce((SELECT jsonb_agg(value ORDER BY length(value),value COLLATE \"C\") FROM version_sample),'[]'::jsonb)"
      +" ELSE '[]'::jsonb END) FROM version_state;",
    "\\else",
    common+" SELECT jsonb_build_object("+fields+",'migrationState',CASE WHEN "+migrationKind
      +"='MISSING' THEN 'MISSING' ELSE 'WRONG_KIND' END,'migrationCount',NULL,'migrationVersions','[]'::jsonb);",
    "\\endif",
    "",
  ].join('\n');
  const bytes=Buffer.from(sql);need(bytes.length<=P.diagnosticBytes,'ARCHIVE_LOCAL_AUTH_QUERY_BOUND');return bytes;
}
function readArchiveLocalAuthBootstrap(c,bytes){
  need(Buffer.isBuffer(bytes)&&bytes.length<=ARCHIVE_LOCAL_AUTH_METADATA.bytes,'ARCHIVE_LOCAL_AUTH_REPORT_BOUND');
  let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
  catch{need(false,'ARCHIVE_LOCAL_AUTH_REPORT_JSON');}
  const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype
    &&JSON.stringify(Object.keys(v).sort())===JSON.stringify([...keys].sort());
  const keys=['kind','measurementPoint','inventorySha256','authTag','authImageSha256','targetCount','unclassifiedTargetCount',
    'fixedTargets','migrationTableKind','migrationState','migrationCount','migrationVersions'];
  need(exact(value,keys),'ARCHIVE_LOCAL_AUTH_REPORT_FIELDS');
  const {inventory,rows,fixed,authImageSha256}=archiveLocalAuthBootstrapScope(c);
  need(value.kind==='ARCHIVE_LOCAL_AUTH_BOOTSTRAP_V1'&&value.measurementPoint==='AFTER_AUTH_STOP_BEFORE_ORIGINAL_SQL'
    &&value.inventorySha256===inventory.digest&&value.authTag===ARCHIVE_VENDOR_IMAGES.auth.split('/').at(-1)
    &&value.authImageSha256===authImageSha256,'ARCHIVE_LOCAL_AUTH_REPORT_IDENTITY');
  need(value.targetCount===rows.length&&value.unclassifiedTargetCount===rows.length-fixed.length
    &&Array.isArray(value.fixedTargets)&&value.fixedTargets.length===fixed.length,'ARCHIVE_LOCAL_AUTH_REPORT_TARGETS');
  for(let i=0;i<fixed.length;i++){
    const item=value.fixedTargets[i];
    need(exact(item,['label','kind','state'])&&item.label===fixed[i].label&&item.kind===fixed[i].kind
      &&['MISSING','TABLE','PARTITIONED_TABLE','SEQUENCE','OTHER_KIND'].includes(item.state),'ARCHIVE_LOCAL_AUTH_REPORT_TARGETS');
  }
  const kind=value.migrationTableKind,state=value.migrationState,count=value.migrationCount,versions=value.migrationVersions;
  need(['TABLE','PARTITIONED_TABLE','MISSING','OTHER_KIND'].includes(kind)
    &&['OBSERVED','MISSING','WRONG_KIND','INVALID_VERSION','OVER_BOUND'].includes(state)
    &&Array.isArray(versions)&&versions.length<=ARCHIVE_LOCAL_AUTH_METADATA.versions,'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
  if(kind==='MISSING'||kind==='OTHER_KIND'){
    need(state===(kind==='MISSING'?'MISSING':'WRONG_KIND')&&count===null&&versions.length===0,'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
  }else if(state==='OVER_BOUND'){
    need(count===null&&versions.length===0,'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
  }else{
    need(['OBSERVED','INVALID_VERSION'].includes(state)&&Number.isSafeInteger(count)&&count>=0
      &&count<=ARCHIVE_LOCAL_AUTH_METADATA.versions,'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
    if(state==='INVALID_VERSION')need(count>0&&versions.length===0,'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
    else{
      need(versions.length===count&&versions.every(v=>typeof v==='string'&&/^[0-9]{1,19}$/.test(v))
        &&new Set(versions).size===versions.length,'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
      const sorted=[...versions].sort((a,b)=>a.length-b.length||(a<b?-1:a>b?1:0));
      need(JSON.stringify(versions)===JSON.stringify(sorted),'ARCHIVE_LOCAL_AUTH_REPORT_VERSIONS');
    }
  }
  return value;
}
async function observeArchiveLocalAuthBootstrap(c,p,run=command){
  need(c.archive===true&&p.side==='B'&&c.stage==='QUIESCE_B_AUTH','ARCHIVE_LOCAL_AUTH_SEQUENCE');
  const input=archiveLocalAuthBootstrapSql(c);
  const bytes=await run(c,'ARCHIVE_LOCAL_AUTH_BOOTSTRAP','docker',archiveBootstrapPsqlArguments(c,p),
    {input,maxMs:90_000,archivePsql:true});
  const metadata=readArchiveLocalAuthBootstrap(c,bytes);c.archiveLocalAuthBootstrap=metadata;
  need(metadata.migrationState==='OBSERVED','ARCHIVE_LOCAL_AUTH_BOOTSTRAP_NOT_READY');return metadata;
}
function archiveInventoryControl(line,state){
  if(!line.trim()||/^--[^\r\n]*$/.test(line)||line==='RESET ALL;'
    ||line==="SELECT pg_catalog.set_config('search_path', '', false);")return true;
  const restricted=/^\\(unrestrict|restrict) ([A-Za-z0-9]{1,256})$/.exec(line);
  if(restricted){
    if(restricted[1]==='restrict'){need(!state.seenRestrict&&!state.restrict,'ARCHIVE_RELATION_RESTRICT');state.restrict=restricted[2];state.seenRestrict=true;}
    else{need(state.restrict===restricted[2],'ARCHIVE_RELATION_RESTRICT');state.restrict=null;}return true;
  }
  const setting=/^SET ([a-z_]+) = (.+);$/.exec(line);if(!setting)return false;
  const patterns={statement_timeout:/^[0-9]{1,19}$/,lock_timeout:/^[0-9]{1,19}$/,
    idle_in_transaction_session_timeout:/^[0-9]{1,19}$/,transaction_timeout:/^[0-9]{1,19}$/,
    client_encoding:/^'UTF8'$/,standard_conforming_strings:/^on$/,check_function_bodies:/^(true|false)$/,
    xmloption:/^(content|document)$/,client_min_messages:/^(warning|error|notice)$/,
    row_security:/^(on|off)$/,session_replication_role:/^(replica|origin)$/,
    default_tablespace:/^''$/,default_table_access_method:/^heap$/};
  need(Object.hasOwn(patterns,setting[1])&&patterns[setting[1]].test(setting[2]),'ARCHIVE_RELATION_UNSUPPORTED_SETTING');return true;
}
function archiveRelationEntry(file,kind,qualified){
  const match=new RegExp('^('+COPY_IDENTIFIER+')\\.('+COPY_IDENTIFIER+')$').exec(qualified);
  need(match&&['COPY','SEQUENCE'].includes(kind)&&['data.sql','history-data.sql'].includes(file),'ARCHIVE_RELATION_IDENTITY');
  const identifiers=match.slice(1).map(v=>v.slice(1,-1).replaceAll('""','"'));
  need(identifiers.every(v=>Buffer.byteLength(v)>0&&Buffer.byteLength(v)<=63&&!v.includes('\0')),'ARCHIVE_RELATION_IDENTIFIER_BOUND');
  return {phase:file==='data.sql'?'DATA':'HISTORY_DATA',kind,qualified,
    schemaClass:Object.hasOwn(ARCHIVE_RELATION_SCHEMAS,identifiers[0])?ARCHIVE_RELATION_SCHEMAS[identifiers[0]]:'OTHER',
    relationClass:Object.hasOwn(ARCHIVE_FIXED_RELATIONS,qualified)?ARCHIVE_FIXED_RELATIONS[qualified]:'OTHER'};
}
async function collectArchiveRelationInventory(c,archive){
  c.stage='ARCHIVE_RELATION_INVENTORY';c.archiveRelationInventoryAttempted=true;const summary={};
  try{for await(const _chunk of archiveParitySql(c,archive,summary,true))need(false,'ARCHIVE_RELATION_ROW_OUTPUT');}
  catch(e){if(/^ARCHIVE_SQL_|^ARCHIVE_PARITY_|^ARCHIVE_RELATION_|^OPERATION_DEADLINE$/.test(e.code??''))throw e;
    need(false,'ARCHIVE_RELATION_PARSE_REFUSED');}
  const relations=summary.relations;need(Array.isArray(relations)&&relations.length<=8192,'ARCHIVE_RELATION_INVENTORY_BOUND');
  const inventory={complete:true,relations,digest:sha(Buffer.from(JSON.stringify({
    files:archive.files.filter(f=>['data.sql','history-data.sql'].includes(f.file)),relations})))};
  // Build both bounded payloads now. No DDL/data starts if full parse or either
  // phase's exact query cannot be represented inside the existing diagnostic cap.
  for(const phase of ['DATA','HISTORY_DATA'])archiveRelationPreflightSql(inventory,phase);return inventory;
}
// Keep complete CHECK metadata private; only counts/digest leave this transaction.
function archiveNotValidCheckSql(inventory,phase,after=false){
  need(inventory?.complete===true&&/^[a-f0-9]{64}$/.test(inventory.digest)
    &&['DATA','HISTORY_DATA'].includes(phase)&&typeof after==='boolean','ARCHIVE_RELATION_CHECK_INVENTORY');
  const maximum=4096,maximumBytes=8*1024*1024;
  const comparison='semantic,unsupported,unsafe';
  const same=`NOT EXISTS ((SELECT ${comparison} FROM pg_temp.rr_archive_check_snapshot EXCEPT ALL SELECT ${comparison} FROM pg_temp.rr_archive_check_live)`
    +` UNION ALL (SELECT ${comparison} FROM pg_temp.rr_archive_check_live EXCEPT ALL SELECT ${comparison} FROM pg_temp.rr_archive_check_snapshot))`;
  const catalog="SELECT con.oid AS constraint_oid,con.convalidated,con.conname,n.nspname AS schema_name,r.relname AS table_name,"
    +"pg_catalog.pg_get_constraintdef(con.oid,false) AS definition,pg_catalog.obj_description(con.oid,'pg_constraint') AS comment,"
    +"(con.contypid<>0 OR con.conrelid=0 OR r.relkind<>'r' OR r.relispartition OR NOT con.conislocal OR con.coninhcount<>0 OR con.conparentid<>0"
    +" OR n.nspname ~ '^pg_' OR n.nspname='information_schema'"
    +" OR EXISTS(SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid)"
    +" OR EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.deptype='e' AND ((d.classid='pg_catalog.pg_constraint'::regclass AND d.objid=con.oid)"
    +" OR (d.classid='pg_catalog.pg_class'::regclass AND d.objid=r.oid)))"
    +" OR EXISTS(SELECT 1 FROM pg_catalog.pg_depend d JOIN pg_catalog.pg_depend e ON e.classid=d.refclassid AND e.objid=d.refobjid AND e.deptype='e'"
    +" WHERE d.classid='pg_catalog.pg_constraint'::regclass AND d.objid=con.oid)) AS unsupported,"
    // Known local r/p families can remain untouched and enforced. This does not
    // permit their suspension, foreign-table assumptions, or new COPY routing.
    +"(con.contypid<>0 OR con.conrelid=0 OR r.relkind NOT IN ('r','p')"
    +" OR n.nspname ~ '^pg_' OR n.nspname='information_schema'"
    +" OR EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.deptype='e' AND ((d.classid='pg_catalog.pg_constraint'::regclass AND d.objid=con.oid)"
    +" OR (d.classid='pg_catalog.pg_class'::regclass AND d.objid=r.oid)))"
    +" OR EXISTS(SELECT 1 FROM pg_catalog.pg_depend d JOIN pg_catalog.pg_depend e ON e.classid=d.refclassid AND e.objid=d.refobjid AND e.deptype='e'"
    +" WHERE d.classid='pg_catalog.pg_constraint'::regclass AND d.objid=con.oid)) AS unsafe,"
    +"jsonb_build_object('schema',coalesce(n.nspname,tn.nspname),'relation',r.relname,'domain',t.typname,'name',con.conname,"
    +"'definition',pg_catalog.pg_get_constraintdef(con.oid,false),'validated',con.convalidated,'deferrable',con.condeferrable,"
    +"'deferred',con.condeferred,'local',con.conislocal,'inheritCount',con.coninhcount,'noInherit',con.connoinherit,"
    +"'parentId',con.conparentid,'keys',con.conkey,'comment',pg_catalog.obj_description(con.oid,'pg_constraint')) AS semantic"
    +" FROM pg_catalog.pg_constraint con LEFT JOIN pg_catalog.pg_class r ON r.oid=con.conrelid"
    +" LEFT JOIN pg_catalog.pg_namespace n ON n.oid=r.relnamespace LEFT JOIN pg_catalog.pg_type t ON t.oid=con.contypid"
    +" LEFT JOIN pg_catalog.pg_namespace tn ON tn.oid=t.typnamespace WHERE con.contype='c'";
  const targets=inventory.relations.filter(r=>r.phase===phase&&r.kind==='COPY');
  const required=targets.length?'VALUES '+targets.map(r=>'('+sqlString(r.qualified)+')').join(','):'SELECT NULL::text WHERE false';
  // Diagnostics are evaluated only on an already-failing branch, in this same
  // transaction. Counts saturate at fixed guard+1 caps; private catalogue text
  // stays inside PostgreSQL. The original predicates and semantic JSON stay exact.
  const diagnostic=(reason,counts)=>"jsonb_build_object('state','OWNED_GUARD_BOUND','reason',"+sqlString(reason)
    +",'phase',"+sqlString(phase)+",'inventorySha256',"+sqlString(inventory.digest)
    +",'measurementPoint','BEFORE_DATA_SAME_TRANSACTION','counts',"+counts+")";
  const scopeCounts="jsonb_build_object('checkCount',least(count(*),4097),'semanticBytes',least(coalesce(sum(pg_catalog.pg_column_size(semantic)),0),8388609),"
    +"'notValidCount',least(count(*) FILTER(WHERE NOT convalidated),4097),"
    +"'unsupportedNotValidCount',least(count(*) FILTER(WHERE NOT convalidated AND unsupported IS DISTINCT FROM false),4097),"
    +"'catalogLookupMismatchCount',least(count(*) FILTER(WHERE NOT convalidated AND NOT diagnostic_catalog_match),4097),"
    +"'domainOrNoRelationCount',least(count(*) FILTER(WHERE NOT convalidated AND diagnostic_catalog_match AND diagnostic_domain_no_relation),4097),"
    +"'nonTableCount',least(count(*) FILTER(WHERE NOT convalidated AND diagnostic_catalog_match AND diagnostic_non_table),4097),"
    +"'partitionOrInheritanceCount',least(count(*) FILTER(WHERE NOT convalidated AND diagnostic_catalog_match AND diagnostic_partition_inheritance),4097),"
    +"'systemSchemaCount',least(count(*) FILTER(WHERE NOT convalidated AND diagnostic_catalog_match AND diagnostic_system_schema),4097),"
    +"'extensionDependencyCount',least(count(*) FILTER(WHERE NOT convalidated AND diagnostic_catalog_match AND diagnostic_extension),4097),"
    +"'definitionBytesExceededCount',least(count(*) FILTER(WHERE NOT convalidated AND pg_catalog.octet_length(definition)>131072),4097),"
    +"'commentBytesExceededCount',least(count(*) FILTER(WHERE NOT convalidated AND pg_catalog.octet_length(coalesce(comment,''))>65536),4097),"
    +"'notValidSuffixMissingCount',least(count(*) FILTER(WHERE NOT convalidated AND definition !~ ' NOT VALID$'),4097))";
  // A changed/missing catalogue lookup is explicit; no subcategory is guessed.
  const scopeDetail="(SELECT "+diagnostic('ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND',scopeCounts)+" FROM (SELECT snapshot.*,(live.constraint_oid IS NOT NULL AND live.semantic IS NOT DISTINCT FROM snapshot.semantic AND live.unsupported IS NOT DISTINCT FROM snapshot.unsupported) AS diagnostic_catalog_match,(con.contypid<>0 OR con.conrelid=0) AS diagnostic_domain_no_relation,(r.relkind<>'r') AS diagnostic_non_table,(r.relkind='p' OR r.relispartition OR NOT con.conislocal OR con.coninhcount<>0 OR con.conparentid<>0 OR EXISTS(SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid)) AS diagnostic_partition_inheritance,(snapshot.schema_name ~ '^pg_' OR snapshot.schema_name='information_schema') AS diagnostic_system_schema,(EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.deptype='e' AND ((d.classid='pg_catalog.pg_constraint'::regclass AND d.objid=con.oid) OR (d.classid='pg_catalog.pg_class'::regclass AND d.objid=r.oid))) OR EXISTS(SELECT 1 FROM pg_catalog.pg_depend d JOIN pg_catalog.pg_depend e ON e.classid=d.refclassid AND e.objid=d.refobjid AND e.deptype='e' WHERE d.classid='pg_catalog.pg_constraint'::regclass AND d.objid=con.oid)) AS diagnostic_extension FROM pg_temp.rr_archive_check_snapshot snapshot LEFT JOIN pg_temp.rr_archive_check_live live ON live.constraint_oid=snapshot.constraint_oid LEFT JOIN pg_catalog.pg_constraint con ON con.oid=snapshot.constraint_oid LEFT JOIN pg_catalog.pg_class r ON r.oid=con.conrelid) diagnostic_snapshot)::text";
  const targetCounts="jsonb_build_object('copyTargetCount',least(count(*),8193),"
    +"'unsupportedTargetCount',least(count(*) FILTER(WHERE r.oid IS NULL OR r.relkind<>'r' OR r.relispartition OR EXISTS(SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid)),8193),"
    +"'missingTargetCount',least(count(*) FILTER(WHERE r.oid IS NULL),8193),"
    +"'nonTableTargetCount',least(count(*) FILTER(WHERE r.oid IS NOT NULL AND r.relkind<>'r'),8193),"
    +"'partitionTargetCount',least(count(*) FILTER(WHERE r.relkind='p' OR r.relispartition),8193),"
    +"'inheritanceTargetCount',least(count(*) FILTER(WHERE EXISTS(SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid)),8193))";
  const targetDetail="(WITH required(qualified) AS ("+required+") SELECT "+diagnostic('ARCHIVE_CHECK_TARGET_UNSUPPORTED',targetCounts)
    +" FROM required e LEFT JOIN pg_catalog.pg_class r ON r.oid=pg_catalog.to_regclass(e.qualified))::text";
  const differenceCounts=`jsonb_build_object('removedSemanticCount',(SELECT least(count(*),4097) FROM (SELECT ${comparison} FROM pg_temp.rr_archive_check_snapshot EXCEPT ALL SELECT ${comparison} FROM pg_temp.rr_archive_check_live) d),`
    +`'addedSemanticCount',(SELECT least(count(*),4097) FROM (SELECT ${comparison} FROM pg_temp.rr_archive_check_live EXCEPT ALL SELECT ${comparison} FROM pg_temp.rr_archive_check_snapshot) d))`;
  const changedDetail=diagnostic('ARCHIVE_CHECK_CATALOG_CHANGED',differenceCounts)+"::text";
  const sql=after?String.raw`SET LOCAL search_path=pg_catalog;
DO $rr_archive_check_restore$ DECLARE item record; BEGIN
  IF current_user<>'postgres' OR current_database()<>'postgres' THEN RAISE SQLSTATE '42501'; END IF;
  FOR item IN SELECT * FROM pg_temp.rr_archive_check_staged ORDER BY constraint_oid LOOP
    EXECUTE pg_catalog.format('ALTER TABLE %I.%I ADD CONSTRAINT %I %s',item.schema_name,item.table_name,item.conname,item.definition);
    IF item.comment IS NOT NULL THEN
      EXECUTE pg_catalog.format('COMMENT ON CONSTRAINT %I ON %I.%I IS %L',item.conname,item.schema_name,item.table_name,item.comment);
    END IF;
  END LOOP;
  IF NOT (${same}) THEN RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_CHECK_SEMANTIC_MISMATCH'; END IF;
END $rr_archive_check_restore$;
SELECT jsonb_build_object('kind','ARCHIVE_NOTVALID_CHECK_RESTORE_V1','phase',${sqlString(phase)},
'inventorySha256',${sqlString(inventory.digest)},'catalogScope','ALL_DATABASE_CHECKS','measurementPoint','AFTER_DATA_BEFORE_COMMIT',
'checkCount',count(*),'stagedCount',(SELECT count(*) FROM pg_temp.rr_archive_check_staged),
'retainedNotValidCount',count(*) FILTER(WHERE NOT convalidated)-(SELECT count(*) FROM pg_temp.rr_archive_check_staged),
'validatedCheckCount',count(*) FILTER(WHERE convalidated),
'catalogSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(coalesce(jsonb_agg(semantic ORDER BY semantic::text COLLATE "C"),'[]'::jsonb)::text,'UTF8')),'hex'),
'semanticEqualityVerified',true) FROM pg_temp.rr_archive_check_snapshot;
`:String.raw`SET LOCAL search_path=pg_catalog;
CREATE TEMP VIEW rr_archive_check_live AS ${catalog};
CREATE TEMP TABLE rr_archive_check_snapshot ON COMMIT DROP AS SELECT * FROM pg_temp.rr_archive_check_live;
-- COPY names are a conservative staging scope, not a complete trigger-write
-- graph. Every other CHECK stays active; any actual violation must still fail.
CREATE TEMP TABLE rr_archive_check_staged ON COMMIT DROP AS
WITH required(qualified) AS (${required})
SELECT snapshot.* FROM pg_temp.rr_archive_check_snapshot snapshot
JOIN pg_catalog.pg_constraint con ON con.oid=snapshot.constraint_oid
WHERE NOT snapshot.convalidated AND snapshot.unsupported IS FALSE
  AND EXISTS(SELECT 1 FROM required e WHERE pg_catalog.to_regclass(e.qualified)=con.conrelid);
DO $rr_archive_check_suspend$ DECLARE item record; diagnostic_detail text; BEGIN
  IF current_user<>'postgres' OR current_database()<>'postgres' THEN RAISE SQLSTATE '42501'; END IF;
  IF (SELECT count(*) FROM pg_temp.rr_archive_check_snapshot)>${maximum}
    OR (SELECT coalesce(sum(pg_catalog.pg_column_size(semantic)),0) FROM pg_temp.rr_archive_check_snapshot)>${maximumBytes}
    OR EXISTS(SELECT 1 FROM pg_temp.rr_archive_check_snapshot WHERE NOT convalidated AND
      (unsafe IS DISTINCT FROM false OR pg_catalog.octet_length(definition)>131072
       OR pg_catalog.octet_length(coalesce(comment,''))>65536 OR definition !~ ' NOT VALID$')) THEN
    BEGIN
      diagnostic_detail := ${scopeDetail};
    EXCEPTION
      WHEN query_canceled THEN RAISE;
      WHEN OTHERS THEN diagnostic_detail := '';
    END;
    RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND', DETAIL=coalesce(diagnostic_detail,'');
  END IF;
  IF EXISTS(WITH required(qualified) AS (${required}) SELECT 1 FROM required e
    LEFT JOIN pg_catalog.pg_class r ON r.oid=pg_catalog.to_regclass(e.qualified)
    WHERE r.oid IS NULL OR r.relkind<>'r' OR r.relispartition
      OR EXISTS(SELECT 1 FROM pg_catalog.pg_inherits i WHERE i.inhrelid=r.oid OR i.inhparent=r.oid)) THEN
    BEGIN
      diagnostic_detail := ${targetDetail};
    EXCEPTION
      WHEN query_canceled THEN RAISE;
      WHEN OTHERS THEN diagnostic_detail := '';
    END;
    RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_CHECK_TARGET_UNSUPPORTED', DETAIL=coalesce(diagnostic_detail,'');
  END IF;
  FOR item IN SELECT DISTINCT constraint_oid,schema_name,table_name FROM pg_temp.rr_archive_check_staged ORDER BY constraint_oid LOOP
    EXECUTE pg_catalog.format('LOCK TABLE %I.%I IN ACCESS EXCLUSIVE MODE',item.schema_name,item.table_name);
  END LOOP;
  IF NOT (${same}) THEN
    BEGIN
      diagnostic_detail := ${changedDetail};
    EXCEPTION
      WHEN query_canceled THEN RAISE;
      WHEN OTHERS THEN diagnostic_detail := '';
    END;
    RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_CHECK_CATALOG_CHANGED', DETAIL=coalesce(diagnostic_detail,'');
  END IF;
  FOR item IN SELECT * FROM pg_temp.rr_archive_check_staged ORDER BY constraint_oid LOOP
    EXECUTE pg_catalog.format('ALTER TABLE %I.%I DROP CONSTRAINT %I RESTRICT',item.schema_name,item.table_name,item.conname);
  END LOOP;
END $rr_archive_check_suspend$;
`;
  const bytes=Buffer.from(sql);need(bytes.length<=P.diagnosticBytes,'ARCHIVE_RELATION_CHECK_QUERY_BOUND');return bytes;
}
function readArchiveNotValidCheckReport(c,phase,bytes){
  const found=[];for(const line of bytes.toString('utf8').split(/\r?\n/))try{
    const value=JSON.parse(line);if(value?.kind==='ARCHIVE_NOTVALID_CHECK_RESTORE_V1')found.push(value);
  }catch{}
  need(found.length===1,'ARCHIVE_RELATION_CHECK_REPORT_MISSING');const r=found[0];
  const keys=['kind','phase','inventorySha256','catalogScope','measurementPoint','checkCount','stagedCount','retainedNotValidCount','validatedCheckCount','catalogSha256','semanticEqualityVerified'];
  need(r&&Object.getPrototypeOf(r)===Object.prototype&&JSON.stringify(Object.keys(r).sort())===JSON.stringify(keys.sort())
    &&r.phase===phase&&r.inventorySha256===c.archiveRelationInventory?.digest&&r.catalogScope==='ALL_DATABASE_CHECKS'
    &&r.measurementPoint==='AFTER_DATA_BEFORE_COMMIT'&&r.semanticEqualityVerified===true
    &&/^[a-f0-9]{64}$/.test(r.catalogSha256??'')
    &&[r.checkCount,r.stagedCount,r.retainedNotValidCount,r.validatedCheckCount].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=4096)
    &&r.stagedCount+r.retainedNotValidCount+r.validatedCheckCount===r.checkCount,'ARCHIVE_RELATION_CHECK_REPORT_INVALID');
  c.archiveNotValidCheckReports??=new Map();need(!c.archiveNotValidCheckReports.has(phase),'ARCHIVE_RELATION_CHECK_REPORT_DUPLICATE');
  c.archiveNotValidCheckReports.set(phase,r);return r;
}

function archiveRelationPreflightSql(inventory,phase){
  need(inventory?.complete===true&&/^[a-f0-9]{64}$/.test(inventory.digest)&&['DATA','HISTORY_DATA'].includes(phase),'ARCHIVE_RELATION_INVENTORY_INCOMPLETE');
  const rows=inventory.relations.filter(r=>r.phase===phase);
  const required=rows.length?'VALUES '+rows.map(r=>'('+[r.kind,r.qualified,r.schemaClass,r.relationClass].map(sqlString).join(',')+')').join(',')
    :'SELECT NULL::text,NULL::text,NULL::text,NULL::text WHERE false';
  const wrong="oid IS NOT NULL AND NOT ((kind='COPY' AND relkind IN ('r','p')) OR (kind='SEQUENCE' AND relkind='S'))";
  const grouped=where=>`coalesce((SELECT jsonb_object_agg(schema_class,n) FROM (SELECT schema_class,count(*) n FROM observed WHERE ${where} GROUP BY schema_class) g),'{}'::jsonb)`;
  const fixed=where=>`coalesce((SELECT jsonb_agg(relation_class ORDER BY relation_class) FROM (SELECT DISTINCT relation_class FROM observed WHERE ${where} AND relation_class<>'OTHER') g),'[]'::jsonb)`;
  // Length-prefixed UTF-8 names match archiveCheckTupleHash without exposing
  // names/definitions. Only bounded CHECK metadata for exact COPY targets.
  const tuple=['n.nspname','target.relname','con.conname'].map(name=>
    `pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to(${name}::text,'UTF8')))||pg_catalog.convert_to(${name}::text,'UTF8')`).join('||');
  const sql=`SET LOCAL standard_conforming_strings = on;\nWITH required(kind,qualified,schema_class,relation_class) AS (${required}),
observed AS (SELECT e.*,c.oid,c.relkind FROM required e LEFT JOIN pg_catalog.pg_class c ON c.oid=pg_catalog.to_regclass(e.qualified)),
check_rows AS MATERIALIZED (SELECT DISTINCT con.oid,
pg_catalog.encode(pg_catalog.sha256(${tuple}),'hex') AS tuple_sha256,e.schema_class,con.contype::text,con.convalidated
FROM observed e JOIN pg_catalog.pg_constraint con ON con.conrelid=e.oid AND con.contype='c'
JOIN pg_catalog.pg_class target ON target.oid=e.oid JOIN pg_catalog.pg_namespace n ON n.oid=target.relnamespace
WHERE e.kind='COPY' AND e.relkind IN ('r','p') ORDER BY con.oid LIMIT ${ARCHIVE_CHECK_CATALOG.maximum+1})
SELECT jsonb_build_object('kind','ARCHIVE_RELATION_PREFLIGHT_V1','phase',${sqlString(phase)},'inventorySha256',${sqlString(inventory.digest)},
'completeParse',true,'copyTargets',count(*) FILTER (WHERE kind='COPY'),'sequenceTargets',count(*) FILTER (WHERE kind='SEQUENCE'),
'missingCount',count(*) FILTER (WHERE oid IS NULL),'wrongKindCount',count(*) FILTER (WHERE ${wrong}),
'missingBySchema',${grouped('oid IS NULL')},'wrongKindBySchema',${grouped(wrong)},
'missingFixedRelations',${fixed('oid IS NULL')},'wrongKindFixedRelations',${fixed(wrong)}) AS rr_archive_relation_report,
(count(*) FILTER (WHERE oid IS NULL OR (${wrong}))=0) AS rr_archive_relation_ok,
jsonb_build_object('kind','ARCHIVE_CHECK_CATALOG_V1','phase',${sqlString(phase)},'inventorySha256',${sqlString(inventory.digest)},
'measurementPoint',${sqlString(ARCHIVE_CHECK_CATALOG.point)},'hashFormat',${sqlString(ARCHIVE_CHECK_CATALOG.hashFormat)},
'complete',(SELECT count(*)<=${ARCHIVE_CHECK_CATALOG.maximum} FROM check_rows),
'entries',CASE WHEN (SELECT count(*)<=${ARCHIVE_CHECK_CATALOG.maximum} FROM check_rows) THEN
coalesce((SELECT jsonb_agg(jsonb_build_object('tupleSha256',tuple_sha256,'schemaClass',schema_class,
'contype',contype,'convalidated',convalidated) ORDER BY tuple_sha256) FROM check_rows),'[]'::jsonb)
ELSE '[]'::jsonb END) AS rr_archive_check_catalog FROM observed
\\gset
\\echo :rr_archive_relation_report
\\echo :rr_archive_check_catalog
\\if :rr_archive_relation_ok
\\else
DO $rr_archive_relation$ BEGIN RAISE SQLSTATE 'P0001' USING MESSAGE='ARCHIVE_RELATION_PREFLIGHT_MISSING_OR_KIND'; END $rr_archive_relation$;
\\endif
`;
  const bytes=Buffer.from(sql);need(bytes.length<=P.diagnosticBytes,'ARCHIVE_RELATION_QUERY_BOUND');return bytes;
}
function readArchiveRelationPreflight(c,stage,bytes,exit){
  const phase=stage==='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'?'DATA':stage==='RESTORE_ARCHIVE_HISTORY'?'HISTORY_DATA':null;
  if(!phase||!c.archiveRelationInventory)return null;
  const reports=[];for(const line of bytes.toString('utf8').split(/\r?\n/))try{
    const value=JSON.parse(line);if(value?.kind==='ARCHIVE_RELATION_PREFLIGHT_V1')reports.push(value);
  }catch{}
  if(!reports.length&&exit!==0)return null;
  need(reports.length===1,'ARCHIVE_RELATION_REPORT_MISSING');const report=reports[0],inventory=c.archiveRelationInventory;
  const keys=['kind','phase','inventorySha256','completeParse','copyTargets','sequenceTargets','missingCount','wrongKindCount',
    'missingBySchema','wrongKindBySchema','missingFixedRelations','wrongKindFixedRelations'];
  need(JSON.stringify(Object.keys(report).sort())===JSON.stringify(keys.sort()),'ARCHIVE_RELATION_REPORT_FIELDS');
  const rows=inventory.relations.filter(r=>r.phase===phase),copies=rows.filter(r=>r.kind==='COPY').length,sequences=rows.length-copies;
  need(report.phase===phase&&report.inventorySha256===inventory.digest&&report.completeParse===true
    &&report.copyTargets===copies&&report.sequenceTargets===sequences,'ARCHIVE_RELATION_REPORT_IDENTITY');
  const labels=new Set(rows.map(r=>r.relationClass).filter(r=>r!=='OTHER')),schemas=new Set([...Object.values(ARCHIVE_RELATION_SCHEMAS),'OTHER']);
  for(const prefix of ['missing','wrongKind']){
    const count=report[prefix+'Count'],groups=report[prefix+'BySchema'],fixed=report[prefix+'FixedRelations'];
    need(Number.isSafeInteger(count)&&count>=0&&count<=rows.length&&groups&&Object.getPrototypeOf(groups)===Object.prototype
      &&Object.keys(groups).every(k=>schemas.has(k)&&Number.isSafeInteger(groups[k])&&groups[k]>0)
      &&Object.values(groups).reduce((n,v)=>n+v,0)===count&&Array.isArray(fixed)&&fixed.length<=count
      &&new Set(fixed).size===fixed.length&&fixed.every(v=>labels.has(v)),'ARCHIVE_RELATION_REPORT_COUNTS');
  }
  need(report.missingCount+report.wrongKindCount<=rows.length,'ARCHIVE_RELATION_REPORT_COUNTS');
  c.archiveRelationReports??=new Map();need(!c.archiveRelationReports.has(phase),'ARCHIVE_RELATION_REPORT_DUPLICATE');
  c.archiveRelationReports.set(phase,report);readArchiveCheckCatalog(c,phase,bytes);
  if(exit===0&&c.archiveNotValidCheckExpected?.has(phase))readArchiveNotValidCheckReport(c,phase,bytes);
  return report;
}
async function verifyArchiveDataParity(c,p,archive){
  const expected={},input=archiveParitySql(c,archive,expected);
  const raw=c.archive?await command(c,'ARCHIVE_DATA_PARITY','docker',archiveBootstrapPsqlArguments(c,p),{input,maxMs:90_000,archivePsql:true})
    :await psql(c,p,'SYNTHETIC_ARCHIVE_DATA_PARITY',input);
  const actual=JSON.parse(raw.toString('utf8').trim());
  assert.deepEqual(actual,{status:'PASS',scope:'AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES',tables:expected.tableCount,rows:expected.rowCount,sequences:expected.sequenceCount});
  return {status:'PASS',scope:actual.scope,digest:sha(Buffer.from(JSON.stringify({files:archive.files.filter(f=>['data.sql','history-data.sql'].includes(f.file)),...expected})))};
}
// The normal synthetic route owns B and its synthetic rows. Only self-tests
// supply the private run seam; the fixed normal caller always uses real psql.
async function verifySyntheticRelationPreflight(c,p,archive,run=psql){
  need(c.archive===false&&p.side==='B'&&typeof run==='function','SYNTHETIC_RELATION_TARGET');
  need(!c.archiveRelationInventory&&!c.archiveRelationReports,'SYNTHETIC_RELATION_INITIAL_STATE');
  const inventory=await collectArchiveRelationInventory(c,archive);
  const table='"public"."rr_restore_probe"',sequence='"public"."rr_restore_probe_id_seq"';
  need(inventory.relations.some(r=>r.phase==='DATA'&&r.kind==='COPY'&&r.qualified===table)
    &&inventory.relations.some(r=>r.phase==='DATA'&&r.kind==='SEQUENCE'&&r.qualified===sequence),'SYNTHETIC_RELATION_EXISTING_TARGETS');
  const variant=relations=>({complete:true,relations,digest:sha(Buffer.from(JSON.stringify({
    files:archive.files.filter(f=>['data.sql','history-data.sql'].includes(f.file)),relations})))});
  const execute=async(value,phase,before='',after='')=>{
    c.archiveRelationInventory=value;c.archiveRelationReports=new Map();
    const input=(async function*(){if(before)yield Buffer.from(before);yield archiveRelationPreflightSql(value,phase);if(after)yield Buffer.from(after);})();
    await run(c,p,phase==='DATA'?'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA':'RESTORE_ARCHIVE_HISTORY',input);
    const report=c.archiveRelationReports.get(phase);
    need(report&&report.missingCount===0&&report.wrongKindCount===0,'SYNTHETIC_RELATION_POSITIVE_REPORT');return report;
  };
  const snapshotSql="SELECT jsonb_build_object('beforeRows',(SELECT count(*) FROM public.rr_restore_duplicates WHERE value='rr_preflight_before'),"
    +"'afterRows',(SELECT count(*) FROM public.rr_restore_duplicates WHERE value='rr_preflight_after'),"
    +"'sequenceValue',last_value::text,'isCalled',is_called) FROM public.rr_restore_probe_id_seq;\n";
  const snapshot=async()=>{
    const value=JSON.parse((await run(c,p,'SYNTHETIC_RELATION_CANARY_SNAPSHOT',Buffer.from(snapshotSql))).toString().trim());
    need(value&&Object.keys(value).sort().join(',')==='afterRows,beforeRows,isCalled,sequenceValue'
      &&value.beforeRows===0&&value.afterRows===0&&typeof value.sequenceValue==='string'&&/^[0-9]{1,19}$/.test(value.sequenceValue)
      &&typeof value.isCalled==='boolean','SYNTHETIC_RELATION_CANARY_STATE');return value;
  };
  try{
    await execute(inventory,'DATA');
    const empty=await execute(variant(inventory.relations.filter(r=>r.phase!=='HISTORY_DATA')),'HISTORY_DATA');
    need(empty.copyTargets===0&&empty.sequenceTargets===0,'SYNTHETIC_RELATION_EMPTY_HISTORY');
    const baseline=await snapshot();
    const missing=variant([...inventory.relations,archiveRelationEntry('data.sql','COPY','"public"."rr_preflight_missing_relation"')]);
    const wrong=variant(inventory.relations.map(r=>r.phase==='DATA'&&r.qualified===sequence?{...r,kind:'COPY'}:r));
    const prefix="INSERT INTO public.rr_restore_duplicates(value) VALUES ('rr_preflight_before');\n";
    // nextval is deliberately nontransactional: an unchanged sequence proves
    // that the post-preflight DATA tail never ran, separately from row rollback.
    const tail="SELECT nextval('public.rr_restore_probe_id_seq');\nINSERT INTO public.rr_restore_duplicates(value) VALUES ('rr_preflight_after');\n";
    for(const [value,missingCount,wrongKindCount]of [[missing,1,0],[wrong,0,1]]){
      await assert.rejects(()=>execute(value,'DATA',prefix,tail),e=>e.code==='ARCHIVE_RELATION_PREFLIGHT_MISSING'&&e.inputOwner==='RELATION_PREFLIGHT');
      const report=c.archiveRelationReports.get('DATA');
      need(report&&report.missingCount===missingCount&&report.wrongKindCount===wrongKindCount,'SYNTHETIC_RELATION_NEGATIVE_REPORT');
      assert.deepEqual(await snapshot(),baseline,'The owned preflight must roll back its canary and stop before DATA/nextval');
    }
    return {status:'PASS',scope:'SYNTHETIC_OWNED_POSTGRES_RELATION_PREFLIGHT',checks:4,
      sameBuilderAndPsqlReader:true,emptyHistory:true,missingAndWrongKindClosed:true,canaryRollback:true,dataTailNotExecuted:true};
  }finally{
    delete c.archiveRelationInventory;delete c.archiveRelationReports;delete c.archiveRelationInventoryAttempted;
  }
}
async function verifySyntheticNotValidChecks(c,p,run=psql){
  need(c.archive===false&&p.side==='B','SYNTHETIC_CHECK_TARGET');
  const setup=String.raw`CREATE SCHEMA rr_restore_check_scope;
CREATE TABLE public.rr_restore_check_legacy(value integer CONSTRAINT rr_restore_check_valid CHECK(value>=0));
INSERT INTO public.rr_restore_check_legacy VALUES(0);
ALTER TABLE public.rr_restore_check_legacy ADD CONSTRAINT rr_restore_check_pending CHECK(value>0) NOT VALID;
COMMENT ON CONSTRAINT rr_restore_check_pending ON public.rr_restore_check_legacy IS 'æøå preserved';
CREATE TABLE rr_restore_check_scope.other(value integer);
INSERT INTO rr_restore_check_scope.other VALUES(0);
ALTER TABLE rr_restore_check_scope.other ADD CONSTRAINT other_pending CHECK(value>0) NOT VALID;
CREATE SEQUENCE public.rr_restore_check_canary_seq START 77;
`;
  await run(c,p,'SYNTHETIC_CHECK_SETUP',Buffer.from(setup));
  const rows=async()=>JSON.parse((await run(c,p,'SYNTHETIC_CHECK_ROWS',Buffer.from("SELECT jsonb_build_array((SELECT count(*) FROM public.rr_restore_check_legacy),(SELECT count(*) FROM rr_restore_check_scope.other));\n"))).toString().trim());
  const canary=async()=>JSON.parse((await run(c,p,'SYNTHETIC_CHECK_CANARY',Buffer.from("SELECT jsonb_build_array(last_value,is_called) FROM public.rr_restore_check_canary_seq;\n"))).toString().trim());
  const copy=Buffer.from('COPY public.rr_restore_check_legacy(value) FROM stdin;\n0\n0\n\\.\nCOPY rr_restore_check_scope.other(value) FROM stdin;\n0\n\\.\n');
  const scope=phase=>({complete:true,digest:sha(Buffer.from('synthetic-check-'+phase)),relations:
    ['"public"."rr_restore_check_legacy"','"rr_restore_check_scope"."other"'].map(name=>archiveRelationEntry(phase==='DATA'?'data.sql':'history-data.sql','COPY',name))});
  const staged=(inventory,data=copy,afterData='')=>(async function*(){
    yield archiveNotValidCheckSql(inventory,inventory.relations[0].phase);yield data;
    if(afterData)yield Buffer.from(afterData);
    yield archiveNotValidCheckSql(inventory,inventory.relations[0].phase,true);
  })();
  // Existing owned-B SQL qualification also proves that real PostgreSQL emits
  // the fixed DETAIL. The subtransaction catches only the already-raised P0001;
  // its rollback and the original nontransactional DATA canary remain observable.
  const suspendReport=async(inventory,reason,edit=sql=>sql)=>{
    const body=edit(archiveNotValidCheckSql(inventory,'DATA').toString())+"SELECT nextval('public.rr_restore_check_canary_seq');\n";
    const capture=String.raw`CREATE TEMP TABLE rr_restore_check_diagnostic_capture(value jsonb) ON COMMIT DROP;
DO $rr_check_diagnostic$ DECLARE own_message text; own_detail text; BEGIN
  BEGIN
    EXECUTE ${sqlString(body)};
    RAISE SQLSTATE 'P0002' USING MESSAGE='SYNTHETIC_CHECK_GUARD_DID_NOT_REFUSE';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    GET STACKED DIAGNOSTICS own_message=MESSAGE_TEXT,own_detail=PG_EXCEPTION_DETAIL;
    IF own_message<>${sqlString(reason)} THEN RAISE SQLSTATE 'P0002' USING MESSAGE='SYNTHETIC_CHECK_GUARD_REASON'; END IF;
    INSERT INTO pg_temp.rr_restore_check_diagnostic_capture VALUES(
      CASE WHEN coalesce(own_detail,'')='' THEN '{"state":"UNAVAILABLE"}'::jsonb ELSE own_detail::jsonb END);
    IF pg_catalog.to_regclass('pg_temp.rr_archive_check_snapshot') IS NOT NULL
      OR pg_catalog.to_regclass('pg_temp.rr_archive_check_live') IS NOT NULL THEN
      RAISE SQLSTATE 'P0002' USING MESSAGE='SYNTHETIC_CHECK_GUARD_SUBTRANSACTION_NOT_ROLLED_BACK';
    END IF;
  END;
END $rr_check_diagnostic$;
SELECT value FROM pg_temp.rr_restore_check_diagnostic_capture;
`;
    const report=JSON.parse((await run(c,p,'SYNTHETIC_CHECK_GUARD_DIAGNOSTIC',Buffer.from(capture))).toString().trim());
    assert.deepEqual(publicArchiveCheckSuspendDiagnostic(report),report);
    if(report.state==='UNAVAILABLE'){assert.deepEqual(report,{state:'UNAVAILABLE'});return report;}
    assert.equal(report.state,'OWNED_GUARD_BOUND');assert.equal(report.reason,reason);
    assert.equal(report.inventorySha256,inventory.digest);assert.equal(report.phase,'DATA');return report;
  };
  const reports=[];
  for(const phase of ['DATA','HISTORY_DATA']){
    const inventory=scope(phase),before=await rows();
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_SCHEMA_FIRST_REFUSED',copy),e=>e.code==='SQLSTATE_23514');
    assert.deepEqual(await rows(),before);
    const output=await run(c,p,'SYNTHETIC_CHECK_POST_DATA',staged(inventory));
    const report=readArchiveNotValidCheckReport({archiveRelationInventory:inventory},phase,output);
    need(report.stagedCount>=2&&report.validatedCheckCount>=1,'SYNTHETIC_CHECK_INVENTORY');reports.push(report);
    assert.deepEqual(await rows(),[before[0]+2,before[1]+1]);
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_NEW_ROW_REFUSED',copy),e=>e.code==='SQLSTATE_23514');
    const stable=await rows();
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_VALIDATED_REFUSED',staged(inventory,
      Buffer.from('COPY public.rr_restore_check_legacy(value) FROM stdin;\n-1\n\\.\n'))),e=>e.code==='SQLSTATE_23514');
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_RECREATE_MISMATCH',staged(inventory,copy,
      'ALTER TABLE public.rr_restore_check_legacy DROP CONSTRAINT rr_restore_check_valid;\n')),e=>e.code==='SQLSTATE_P0001');
    assert.deepEqual(await rows(),stable);
  }
  const inventory=scope('DATA'),probe=Buffer.from("SELECT nextval('public.rr_restore_check_canary_seq');\n");
  const unsupported=[
    ["CREATE DOMAIN rr_restore_check_scope.domain_probe AS integer; ALTER DOMAIN rr_restore_check_scope.domain_probe ADD CONSTRAINT domain_pending CHECK(VALUE>0) NOT VALID;\n",
      'DROP DOMAIN rr_restore_check_scope.domain_probe;\n'],
  ];
  for(const [ddl,cleanup]of unsupported){
    await run(c,p,'SYNTHETIC_CHECK_UNSUPPORTED_SETUP',Buffer.from(ddl));const before=await canary();
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_UNSUPPORTED_REFUSED',staged(inventory,probe)),e=>e.code==='SQLSTATE_P0001');
    const diagnostic=await suspendReport(inventory,'ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND');
    assert(diagnostic.counts.unsupportedNotValidCount>=1);
    assert(diagnostic.counts[ddl.startsWith('CREATE DOMAIN')?'domainOrNoRelationCount':'partitionOrInheritanceCount']>=1);
    if(ddl.startsWith('CREATE DOMAIN')){
      const beforeFaultRows=await rows();
      const unavailable=await suspendReport(inventory,'ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND',sql=>{
        const assignment=/^      diagnostic_detail := [^\r\n]*;$/m;
        assert(assignment.test(sql));
        return sql.replace(assignment,'      diagnostic_detail := (1/0)::text;');
      });
      assert.deepEqual(unavailable,{state:'UNAVAILABLE'},'A secondary diagnostic error must retain the exact original P0001/message, with no invented binding');
      assert.deepEqual(await rows(),beforeFaultRows,'The failed guard subtransaction must roll back the owned SQL snapshot without changing rows');
    }
    assert.deepEqual(await canary(),before,'Unsupported scope must stop before the nontransactional DATA canary');
    await run(c,p,'SYNTHETIC_CHECK_UNSUPPORTED_CLEANUP',Buffer.from(cleanup));
  }
  const retainedFamilies=[
    {ddl:'CREATE TABLE rr_restore_check_scope.parent(value integer); ALTER TABLE rr_restore_check_scope.parent ADD CONSTRAINT inherited_pending CHECK(value>0) NOT VALID; CREATE TABLE rr_restore_check_scope.child() INHERITS(rr_restore_check_scope.parent);\n',
      target:'rr_restore_check_scope.child',parent:'parent',constraint:'inherited_pending',triggerMode:'REPLICA',
      cleanup:'DROP TABLE rr_restore_check_scope.child; DROP TABLE rr_restore_check_scope.parent;\n'},
    {ddl:'CREATE TABLE rr_restore_check_scope.partitioned(value integer) PARTITION BY RANGE(value); ALTER TABLE rr_restore_check_scope.partitioned ADD CONSTRAINT partition_pending CHECK(value>0) NOT VALID; CREATE TABLE rr_restore_check_scope.partition_leaf PARTITION OF rr_restore_check_scope.partitioned DEFAULT;\n',
      target:'rr_restore_check_scope.partitioned',parent:'partitioned',constraint:'partition_pending',triggerMode:'ALWAYS',
      cleanup:'DROP TABLE rr_restore_check_scope.partition_leaf; DROP TABLE rr_restore_check_scope.partitioned;\n'},
  ];
  for(const family of retainedFamilies){
    await run(c,p,'SYNTHETIC_CHECK_RETAINED_SETUP',Buffer.from(family.ddl));
    const before=await rows(),output=await run(c,p,'SYNTHETIC_CHECK_RETAINED_COPY',staged(inventory));
    const report=readArchiveNotValidCheckReport({archiveRelationInventory:inventory},'DATA',output);
    assert.equal(report.stagedCount,2);assert(report.retainedNotValidCount>=1);
    assert.equal(report.stagedCount+report.retainedNotValidCount+report.validatedCheckCount,report.checkCount);
    assert.deepEqual(await rows(),[before[0]+2,before[1]+1]);
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_RETAINED_DIRECT_REFUSED',
      Buffer.from('COPY '+family.target+'(value) FROM stdin;\n0\n\\.\n')),e=>e.code==='SQLSTATE_23514');
    await run(c,p,'SYNTHETIC_CHECK_RETAINED_DIRECT_VALID',Buffer.from('COPY '+family.target+'(value) FROM stdin;\n1\n\\.\n'));
    const familyRows=async()=>Number((await run(c,p,'SYNTHETIC_CHECK_RETAINED_ROWS',
      Buffer.from('SELECT count(*) FROM '+family.target+';\n'))).toString().trim());
    assert.equal(await familyRows(),1);
    const stable=await rows();
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_RETAINED_MISMATCH',staged(inventory,Buffer.alloc(0),
      'COMMENT ON CONSTRAINT '+family.constraint+' ON rr_restore_check_scope.'+family.parent+" IS 'changed';\n")),e=>e.code==='SQLSTATE_P0001');
    assert.deepEqual(await rows(),stable);
    // These remain real replica-session side effects. The family CHECK is not
    // staged even though its trigger can be reached from a staged COPY table.
    await run(c,p,'SYNTHETIC_CHECK_RETAINED_TRIGGER_SETUP',Buffer.from(
      'CREATE FUNCTION rr_restore_check_scope.write_family() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO '+family.target+' VALUES(NEW.value); RETURN NEW; END; $$;\n'
      +'CREATE TRIGGER rr_retained_family BEFORE INSERT ON public.rr_restore_check_legacy FOR EACH ROW EXECUTE FUNCTION rr_restore_check_scope.write_family();\n'
      +'ALTER TABLE public.rr_restore_check_legacy ENABLE '+family.triggerMode+' TRIGGER rr_retained_family;\n'));
    const triggerInput=(async function*(){yield Buffer.from('SET LOCAL session_replication_role=replica;\n');yield* staged(inventory);})();
    await assert.rejects(()=>run(c,p,'SYNTHETIC_CHECK_RETAINED_TRIGGER_REFUSED',triggerInput),e=>e.code==='SQLSTATE_23514');
    assert.deepEqual(await rows(),stable);
    assert.equal(await familyRows(),1);
    await run(c,p,'SYNTHETIC_CHECK_RETAINED_TRIGGER_CLEANUP',Buffer.from('DROP TRIGGER rr_retained_family ON public.rr_restore_check_legacy; DROP FUNCTION rr_restore_check_scope.write_family();\n'));
    const unchanged=readArchiveNotValidCheckReport({archiveRelationInventory:inventory},'DATA',
      await run(c,p,'SYNTHETIC_CHECK_RETAINED_AFTER_ROLLBACK',staged(inventory,Buffer.alloc(0))));
    assert.equal(unchanged.catalogSha256,report.catalogSha256);
    await run(c,p,'SYNTHETIC_CHECK_RETAINED_CLEANUP',Buffer.from(family.cleanup));
  }
  const beforeDiagnostic=await canary();
  await run(c,p,'SYNTHETIC_CHECK_TARGET_DIAGNOSTIC_SETUP',Buffer.from('CREATE TABLE rr_restore_check_scope.target_partition(value integer) PARTITION BY RANGE(value);\n'));
  const targetRelations=[...inventory.relations,archiveRelationEntry('data.sql','COPY','"rr_restore_check_scope"."target_partition"')];
  const targetInventory={complete:true,relations:targetRelations,digest:sha(Buffer.from(JSON.stringify(targetRelations)))};
  const targetDiagnostic=await suspendReport(targetInventory,'ARCHIVE_CHECK_TARGET_UNSUPPORTED');
  assert.equal(targetDiagnostic.counts.unsupportedTargetCount,1);assert.equal(targetDiagnostic.counts.partitionTargetCount,1);
  assert.equal(targetDiagnostic.counts.nonTableTargetCount,1);assert.deepEqual(await canary(),beforeDiagnostic);
  await run(c,p,'SYNTHETIC_CHECK_TARGET_DIAGNOSTIC_CLEANUP',Buffer.from('DROP TABLE rr_restore_check_scope.target_partition;\n'));
  const changedDiagnostic=await suspendReport(inventory,'ARCHIVE_CHECK_CATALOG_CHANGED',sql=>sql.replace('DO $rr_archive_check_suspend$',
    'ALTER TABLE rr_restore_check_scope.other ADD CONSTRAINT rr_diagnostic_changed CHECK(value>=0);\nDO $rr_archive_check_suspend$'));
  assert.equal(changedDiagnostic.counts.addedSemanticCount,1);assert.equal(changedDiagnostic.counts.removedSemanticCount,0);
  assert.deepEqual(await canary(),beforeDiagnostic);
  await run(c,p,'SYNTHETIC_CHECK_CLEANUP',Buffer.from('DROP TABLE public.rr_restore_check_legacy; DROP TABLE rr_restore_check_scope.other; DROP SEQUENCE public.rr_restore_check_canary_seq; DROP SCHEMA rr_restore_check_scope;\n'));
  return {status:'PASS',scope:'SYNTHETIC_OWNED_POSTGRES_NOTVALID_CHECK_RESTORE',phases:reports.map(r=>r.phase),
    legacyRowsAndDuplicates:true,validatedChecksPreserved:true,newViolationsRefused:true,recreateMismatchRolledBack:true,
    domainAndUnknownRefusedBeforeData:true,retainedFamiliesUnchanged:true,
    retainedDirectAndReplicaAlwaysTriggerViolationsRefused:true,sameBuilderAndPsqlReader:true};
}

async function restoreArchive(c,b,indexCommitmentSha256){
  await startProject(c,b);
  need((await query(c,b,'ARCHIVE_TARGET_EMPTY','select to_jsonb((select count(*) from auth.users)=0);'))===true,'ARCHIVE_TARGET_NOT_EMPTY');
  await auditArchiveSystemRoles(c,b,indexCommitmentSha256);
  const archive=await materializeArchiveInputs(c,indexCommitmentSha256);c.dumps=archive.files;
  c.archiveRelationInventory=await collectArchiveRelationInventory(c,archive);
  await command(c,'QUIESCE_B_AUTH','docker',['stop','--time','10',b.auth],{maxMs:30_000});
  await observeArchiveLocalAuthBootstrap(c,b);
  await restoreArchiveSql(c,b,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',archive);
  await restoreArchiveSql(c,b,'RESTORE_ARCHIVE_HISTORY',archive,true);
  need(c.archiveRelationReports?.size===2,'ARCHIVE_RELATION_REPORT_INCOMPLETE');
  need(c.archiveNotValidCheckReports?.size===2,'ARCHIVE_RELATION_CHECK_REPORT_INCOMPLETE');
  const parity=await verifyArchiveDataParity(c,b,archive);
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
  await verifyArchiveAuthFunction(c,b);
  return {status:'PASS',scope:'authenticated-archive-isolated-sql-restore',sourceHead:process.env.EXPECTED_HEAD_SHA,cliVersion:P.cli,
    archiveIndexCommitmentSha256:indexCommitmentSha256,
    authenticatedFiveFileSqlExecuted:true,exactSqlBytesStreamed:true,isolatedAuthServiceHealthy:true,containerNetworkExternalEgressDisabled:true,
    localRestoredCatalogVerified:true,productionDatabaseRestoreExecuted:false,productionBackupVerified:false,
    productionAuthRestoreVerified:false,authRestoreVerified:true,fullDatabaseBackupVerified:false,
    sourceDataParityVerified:true,archiveDataParity:parity,atomicDatabaseSnapshot:false,
    storageObjectBytesRestored:false,erasureBarriersVerified:false,freeReady:false};
}
async function auditArchiveSystemRoles(c,b,indexCommitmentSha256,{env=process.env,audit=null,readTarget=query}={}){
  delete c.systemRoleAudit;
  need(/^[a-f0-9]{64}$/.test(indexCommitmentSha256),'ARCHIVE_INDEX_COMMITMENT');
  const target=await readTarget(c,b,'ARCHIVE_TARGET_SYSTEM_ROLES',
    "select coalesce(jsonb_agg(rolname::text order by rolname), '[]'::jsonb) from pg_roles where rolname::text ~ '^supabase_[A-Za-z0-9_]{1,54}$';");
  const names=value=>Array.isArray(value)&&value.length<=128&&value.every(n=>typeof n==='string'&&/^supabase_[A-Za-z0-9_]{1,54}$/.test(n))
    &&new Set(value).size===value.length;
  need(names(target)&&target.includes('supabase_admin'),'ARCHIVE_TARGET_SYSTEM_ROLES');
  const keys=['RUNNER_TEMP','SUPABASE_SERVICE_ROLE_KEY','RAVRADAR_R2_ACCOUNT_ID','RAVRADAR_R2_ACCESS_KEY_ID','RAVRADAR_R2_SECRET_ACCESS_KEY',
    'GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','GITHUB_REPOSITORY'];
  const archiveEnv=Object.fromEntries(keys.filter(k=>typeof env[k]==='string').map(k=>[k,env[k]]));archiveEnv.RUNNER_TEMP=c.root;
  need(typeof archiveEnv.SUPABASE_SERVICE_ROLE_KEY==='string'&&archiveEnv.SUPABASE_SERVICE_ROLE_KEY.length>=32,'ARCHIVE_MASTER_REQUIRED');
  const remaining=c.deadline-Date.now();need(remaining>0,'OPERATION_DEADLINE');const signal=AbortSignal.timeout(remaining);
  c.stage='ARCHIVE_RESERVED_SYSTEM_ROLE_PREFLIGHT';
  const read=audit??(await import('./archive-supabase-database-backup.mjs')).auditSupabaseDatabaseArchiveRoleGrant;
  const r=await read({indexCommitmentSha256,targetSystemRoles:target},{env:archiveEnv,
    fetchImpl:(url,options={})=>fetch(url,{...options,signal:options.signal?AbortSignal.any([signal,options.signal]):signal})});
  need(r?.status==='AUTHENTICATED_RESERVED_SYSTEM_ROLE_PREFLIGHT_ONLY'&&r.indexCommitmentSha256===indexCommitmentSha256
    &&r.rolesFileVerified===true&&r.fullDatabaseBackupVerified===false&&r.databaseRestoreExecuted===false&&r.archiveWrittenThisOperation===false,
    'ARCHIVE_SYSTEM_ROLE_AUDIT_RECEIPT');
  need(names(r.referencedSystemRoles)&&names(r.targetSystemRoles)&&names(r.missingSystemRoles)
    &&r.referencedSystemRoleCount===r.referencedSystemRoles.length&&r.targetSystemRoleCount===target.length
    &&JSON.stringify(r.targetSystemRoles)===JSON.stringify([...target].sort())
    &&JSON.stringify(r.missingSystemRoles)===JSON.stringify(r.referencedSystemRoles.filter(n=>!target.includes(n))),
    'ARCHIVE_SYSTEM_ROLE_AUDIT_RECEIPT');
  c.systemRoleAudit={referencedSystemRoles:r.referencedSystemRoles,targetSystemRoles:r.targetSystemRoles,missingSystemRoles:r.missingSystemRoles,
    referencedSystemRoleCount:r.referencedSystemRoleCount,targetSystemRoleCount:r.targetSystemRoleCount,missingSystemRoleCount:r.missingSystemRoles.length};
  need(r.missingSystemRoles.length===0,'ARCHIVE_SYSTEM_ROLE_COMPATIBILITY');
  return c.systemRoleAudit;
}
function restorePublicReport(c,result,error,closed){
  const scope=c.archive?'authenticated-archive-isolated-sql-restore':'synthetic-standard-cli-local-restore';
  const strongArchive=closed===true&&!error&&result?.status==='PASS'&&result.authenticatedFiveFileSqlExecuted===true
    &&result.exactSqlBytesStreamed===true&&result.authRestoreVerified===true&&result.sourceDataParityVerified===true
    &&result.archiveDataParity?.status==='PASS'&&result.archiveDataParity.scope==='AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES'
    &&/^[a-f0-9]{64}$/.test(result.archiveDataParity.digest);
  return {...(result??{status:'FAILED_CLOSED',scope}),
    ...(error?{status:'FAILED_CLOSED',firstFailure:error}:{}),ownedDockerClosed:closed,
    ...(c.archive&&result&&Object.hasOwn(result,'fullDatabaseBackupVerified')?{fullDatabaseBackupVerified:strongArchive,
      authRestoreVerified:strongArchive,sourceDataParityVerified:strongArchive}:{}),
    ...(c.archive&&c.systemRoleAudit?{systemRoleAudit:c.systemRoleAudit}:{}),
    ...(c.archive&&error&&c.archiveRelationInventoryAttempted?{archiveRelationPreflight:{
      inventoryComplete:c.archiveRelationInventory?.complete===true,reports:[...(c.archiveRelationReports?.values()??[])],
    }}:{}),
    ...(c.archive&&c.archiveNotValidCheckReports?{archiveNotValidChecks:[...c.archiveNotValidCheckReports.entries()].map(([phase,r])=>
      readArchiveNotValidCheckReport({archiveRelationInventory:c.archiveRelationInventory},phase,Buffer.from(JSON.stringify(r))))}:{}),
    ...(c.archive&&c.archiveLocalAuthBootstrap?{
      localAuthBootstrap:readArchiveLocalAuthBootstrap(c,Buffer.from(JSON.stringify(c.archiveLocalAuthBootstrap))),
    }:{}),
    ...(!c.archive?{images:c.images,dumpFiles:c.dumps,authRequests:c.authRequests,processes:c.processes}:{})};
}
async function requireArchiveCurrentMain(c,run=command,env=process.env){
  need(/^[a-f0-9]{40}$/.test(env.EXPECTED_HEAD_SHA??'')&&env.EXPECTED_HEAD_SHA===env.GITHUB_SHA,'EXACT_DISPATCHED_HEAD');
  await run(c,'ARCHIVE_CURRENT_MAIN','git',['fetch','--no-tags','origin','+refs/heads/main:refs/remotes/origin/main'],{cwd:process.cwd(),maxMs:60_000});
  for(const ref of ['HEAD^{commit}','origin/main^{commit}'])
    need((await run(c,'ARCHIVE_EXACT_HEAD','git',['rev-parse',ref],{cwd:process.cwd(),maxMs:10_000})).toString().trim()===env.EXPECTED_HEAD_SHA,'ARCHIVE_MAIN_CHANGED');
}
function archiveInventoryOnlyReport(archive,inventory,indexCommitmentSha256,sourceHead){
  need(inventory?.complete===true&&/^[a-f0-9]{64}$/.test(inventory.digest)
    &&Array.isArray(inventory.relations)&&inventory.relations.length<=8192,'ARCHIVE_INVENTORY_INCOMPLETE');
  const phases={};
  for(const phase of ['DATA','HISTORY_DATA']){
    const rows=inventory.relations.filter(r=>r.phase===phase);
    phases[phase]={copyTargets:rows.filter(r=>r.kind==='COPY').length,sequenceTargets:rows.filter(r=>r.kind==='SEQUENCE').length};
  }
  const targets=[],unclassifiedBySchema={AUTH:0,STORAGE:0};let vendorTargetCount=0;
  for(const row of inventory.relations){
    assert.deepEqual(row,archiveRelationEntry(row.phase==='DATA'?'data.sql':'history-data.sql',row.kind,row.qualified));
    if(!['AUTH','STORAGE'].includes(row.schemaClass))continue;
    vendorTargetCount++;
    if(row.relationClass!=='OTHER')continue;
    const match=new RegExp('^('+COPY_IDENTIFIER+')\\.('+COPY_IDENTIFIER+')$').exec(row.qualified);
    need(match,'ARCHIVE_RELATION_IDENTITY');
    // Canonical SQL quoting only: preserve identifier case and exact UTF-8;
    // no Unicode/case folding, whitespace or newline is added to the preimage.
    const normalized=match.slice(1).map(v=>'"'+v.slice(1,-1).replaceAll('""','"').replaceAll('"','""')+'"').join('.');
    const schema=row.schemaClass==='AUTH'?'auth':'storage';unclassifiedBySchema[row.schemaClass]++;
    targets.push({schema,kind:row.kind,qualifiedNameSha256:sha(Buffer.from(normalized,'utf8'))});
  }
  targets.sort((a,b)=>a.schema.localeCompare(b.schema)||a.kind.localeCompare(b.kind)||a.qualifiedNameSha256.localeCompare(b.qualifiedNameSha256));
  const report={schemaVersion:1,status:'INVENTORY_ONLY',scope:'authenticated-archive-relation-inventory-only',
    sourceHead,archiveIndexCommitmentSha256:indexCommitmentSha256,manifestSha256:archive.manifestSha256,
    completeParse:true,inventorySha256:inventory.digest,phases,
    files:archive.files.map(f=>({file:f.file,bytes:f.bytes,sha256:f.sha256})),totalSqlBytes:archive.totalSqlBytes,
    vendorTargetCount,classifiedVendorTargetCount:vendorTargetCount-targets.length,unclassifiedTargetCount:targets.length,unclassifiedBySchema,
    qualifiedNameHashFormat:'canonical-sql-quoted-qualified-utf8-no-newline-sha256',targets,
    rawNamesIncluded:false,columnsIncluded:false,rowsIncluded:false,sqlIncluded:false,
    dockerInvoked:false,sqlExecuted:false,databaseRestoreExecuted:false,archiveWrittenThisOperation:false,
    centralLocatorWrittenThisOperation:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,freeReady:false};
  need(Buffer.byteLength(JSON.stringify(report))<=P.diagnosticBytes,'ARCHIVE_INVENTORY_REPORT_BOUND');return report;
}
async function collectArchiveInventoryOnly(c,indexCommitmentSha256,{env=process.env,archive=null,run=command}={}){
  need(c.archive===true&&archiveSelection(env)===indexCommitmentSha256,'ARCHIVE_INVENTORY_BINDING');
  await requireArchiveCurrentMain(c,run,env);
  const materialized=await materializeArchiveInputs(c,indexCommitmentSha256,{env,archive});
  const inventory=await collectArchiveRelationInventory(c,materialized);
  return archiveInventoryOnlyReport(materialized,inventory,indexCommitmentSha256,env.EXPECTED_HEAD_SHA);
}
async function archiveInventoryFixture(c,indexCommitmentSha256,temp,rootIdentity){
  let result,error=null,closed=false;
  try{result=await collectArchiveInventoryOnly(c,indexCommitmentSha256);}
  catch(e){error=safeError(e,c.stage);}
  finally{
    c.deadline=Date.now()+P.cleanupMs;
    try{
      const st=await fs.lstat(c.root,{bigint:true});need(st.isDirectory()&&!st.isSymbolicLink()
        &&st.dev===rootIdentity.dev&&st.ino===rootIdentity.ino&&inside(temp,await fs.realpath(c.root)),'SCRATCH_IDENTITY');
      await fs.rm(c.root,{recursive:true,force:false});
      closed=await fs.lstat(c.root).then(()=>false,e=>{if(e.code==='ENOENT')return true;throw e;});
      need(closed,'SCRATCH_CLEANUP_UNPROVED');
    }catch(e){error??=safeError(e,'SCRATCH_CLEANUP');}
    console.log(JSON.stringify({...(!error?result:{status:'FAILED_CLOSED',scope:'authenticated-archive-relation-inventory-only',firstFailure:error,
      rawNamesIncluded:false,columnsIncluded:false,rowsIncluded:false,sqlIncluded:false,dockerInvoked:false,sqlExecuted:false,
      databaseRestoreExecuted:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,freeReady:false}),ownedScratchClosed:closed}));
    if(error)process.exitCode=1;
  }
}
async function fixture({archive=false,inventoryOnly=false}={}){
  need(typeof inventoryOnly==='boolean'&&(!inventoryOnly||archive===true),'ARCHIVE_INVENTORY_MODE');
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
  if(inventoryOnly)return archiveInventoryFixture(c,indexCommitmentSha256,temp,rootIdentity);
  const projects=['A','B'].map(side=>({side,id:'rr_restore_'+run+'_1_'+side.toLowerCase(),dir:path.join(root,side),network:'rr-restore-'+owner+'-'+side.toLowerCase()}));
  let result,error=null;
  try{
    need((await command(c,'CLI_VERSION','supabase',['--version'],{maxMs:20_000})).toString().trim()===P.cli,'CLI_VERSION');
    need((await command(c,'DOCKER_LINUX','docker',['info','--format','{{.OSType}}'],{maxMs:20_000})).toString().trim()==='linux','DOCKER_LINUX');
    need((await command(c,'LOCAL_DAEMON','docker',['context','inspect','default','--format','{{.Endpoints.docker.Host}}'],{maxMs:20_000})).toString().trim()==='unix:///var/run/docker.sock','LOCAL_DAEMON');
    const [a,b]=projects;
    if(archive){
      await requireArchiveCurrentMain(c);
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
    const parityDirectory=path.join(c.root,'synthetic-parity-source');await fs.mkdir(parityDirectory,{mode:0o700});
    const parityArchive={directory:parityDirectory,files:[]};
    for(const [i,file]of ARCHIVE_FILES.entries()){
      await fs.writeFile(path.join(parityDirectory,file),dumps[i],{flag:'wx',mode:0o600});
      parityArchive.files.push({file,bytes:dumps[i].length,sha256:sha(dumps[i])});
    }
    const relationPreflight=await verifySyntheticRelationPreflight(c,b,parityArchive);
    const notValidChecks=await verifySyntheticNotValidChecks(c,b);
    await verifyArchiveDataParity(c,b,parityArchive);
    for(const [kind,mutation]of [
      ['VALUE',"UPDATE public.rr_restore_duplicates SET value='changed' WHERE ctid IN (SELECT ctid FROM public.rr_restore_duplicates WHERE value='other' LIMIT 1);\n"],
      ['DUPLICATE',"UPDATE public.rr_restore_duplicates SET value='same' WHERE ctid IN (SELECT ctid FROM public.rr_restore_duplicates WHERE value='other' LIMIT 1);\n"],
    ]){
      const changed=(async function*(){yield Buffer.from(mutation);yield*archiveParitySql(c,parityArchive,{});})();
      await assert.rejects(()=>psql(c,b,'SYNTHETIC_REJECT_PARITY_'+kind,changed),error=>error.code==='SQLSTATE_P0001');
    }
    // Each rejected negative is one rolled-back transaction; the restored rows still match.
    await verifyArchiveDataParity(c,b,parityArchive);
    const after=await query(c,b,'RESTORED_SNAPSHOT',snapshotSql());assert.deepEqual(after,before);
    await command(c,'RESTART_B_AUTH','docker',['start',b.auth],{maxMs:30_000});
    let healthy=false;const end=Math.min(c.deadline,Date.now()+60_000);
    while(Date.now()<end){const info=(await jsonCommand(c,'RESTORED_AUTH_HEALTH',['inspect',b.auth]))[0];
      if(info.State?.Health?.Status==='healthy'){ownedContainer(info,b,'auth');healthy=true;break;}await sleep(500);}
    need(healthy,'RESTORED_AUTH_NOT_HEALTHY');
    const restored=await auth(c,b,'/token?grant_type=password',{body:{email,password}});need(restored.user?.id===created.id&&typeof restored.access_token==='string','RESTORED_AUTH_LOGIN');
    const user=await auth(c,b,'/user',{token:restored.access_token});need(user.id===created.id,'RESTORED_USER_ID');assert.deepEqual(user.user_metadata,sourceUser.user_metadata);
    await auth(c,b,'/token?grant_type=password',{body:{email,password:password+'wrong'},status:400});
    const syntheticAuthLifecycle=await verifySyntheticBAuthLifecycle(c,b,restored.user.id);
    result={status:'PASS',scope:'synthetic-standard-cli-local-restore',sourceHead:process.env.EXPECTED_HEAD_SHA,cliVersion:P.cli,
      syntheticAuthLifecycle,
      standardFiveFileRoundtrip:true,utf8DecimalMetadata:true,rolesAndMigrationHistory:true,newAuthPasswordLogin:true,
      syntheticRelationPreflight:relationPreflight,syntheticNotValidChecks:notValidChecks,
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
  async function ownArchive(run,{large=false,receiptEdit=null,roleSql=null,fileSql={}}={}){
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
        try{const piece=Buffer.from(Object.hasOwn(fileSql,file)?fileSql[file]:i===0&&roleSql!==null?roleSql:i===2?TEXT+'\n'+DECIMAL+'\n':file+'\n'),repeat=large&&i===2?Math.ceil((P.fileBytes+65536)/piece.length):1;
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
  const inventoryEnv=(env,index)=>({...env,GITHUB_REF:'refs/heads/main',EXPECTED_HEAD_SHA:'c'.repeat(40),GITHUB_SHA:'c'.repeat(40),
    RESTORE_ARCHIVE_INDEX_COMMITMENT:'rr-supabase-restore-v1:'+index,RESTORE_ARCHIVE_CONFIRMATION:ARCHIVE_CONFIRMATION});
  const inventoryData='COPY "auth"."Private_Target_Sentinel" ("private_column") FROM stdin;\nprivate-row-never-output\n\\.\n'
    +'COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\nCOPY "public"."Private_Public_Sentinel" ("value") FROM stdin;\nsecret-row\n\\.\n'
    +`SELECT pg_catalog.setval('"storage"."Private_Sequence_Sentinel"', 7, true);\n`;
  const inventoryHistory='COPY "supabase_migrations"."schema_migrations" ("version") FROM stdin;\n20200101\n\\.\n';

  test('synthetic Auth UUID fence takes exact current migration fragments without Auth SQL stubs or legacy bootstrap',()=>{
    const source=readAccountErasureSource(),intent={operationId:'11111111-1111-4111-8111-111111111111',
      userId:'22222222-2222-4222-8222-222222222222',sessionId:'33333333-3333-4333-8333-333333333333'},actor='44444444-4444-4444-8444-444444444444';
    const result=syntheticAccountErasureAuthFenceSql(source,intent,actor);
    const table=source.sql.slice(source.sql.indexOf('create table public.account_erasure_operations ('),source.sql.indexOf('create function public.account_erasure_require_owner()')),
      guard=source.sql.slice(source.sql.indexOf('create function public.account_erasure_auth_uuid_guard()'),source.sql.indexOf('comment on table public.account_erasure_operations is'));
    assert(result.sql.includes(table));assert(result.sql.includes(guard));
    assert.equal(result.sourceSha256,source.sha256);assert.equal(result.outboxDdlSha256,sha(Buffer.from(table)));
    assert.equal(result.authGuardDdlSha256,sha(Buffer.from(guard)));
    assert(result.sql.includes('public.profiles(id uuid primary key references auth.users(id) on delete cascade)'));
    assert(!result.sql.includes('create table auth.users'));assert(!result.sql.includes('delete from auth.users'));
    assert(!result.sql.includes('handle_new_ravradar_user'));assert(!result.sql.includes('create function public.stage_account_erasure_pg'));
    assert.throws(()=>syntheticAccountErasureAuthFenceSql(source,intent,intent.userId));
    assert.throws(()=>syntheticAccountErasureAuthFenceSql({...source,sql:source.sql+'-- changed'},intent,actor));
    assert.throws(()=>syntheticAccountErasureAuthFenceSql({...source,bodies:{...source.bodies,account_erasure_auth_uuid_guard:'0'.repeat(64)}},intent,actor));
    const duplicate=source.sql+'\ncreate function public.account_erasure_auth_uuid_guard()';
    assert.throws(()=>syntheticAccountErasureAuthFenceSql({...source,sql:duplicate,sha256:sha(Buffer.from(duplicate))},intent,actor));
    assert(syntheticAccountErasureAuthFenceReadbackSql(intent).includes("E' \\n\\r\\t'"));
  });
  test('synthetic A/B receive only a fresh owned Auth197 pin and refuse stale or redirected inputs',async()=>{
    for(const side of ['A','B'])await ownArchive(async({c})=>{
      c.archive=false;c.owner='123-1';const p={side,id:'rr_restore_123_1_'+side.toLowerCase(),dir:path.join(c.root,side)};
      await fs.mkdir(path.join(p.dir,'supabase'),{recursive:true,mode:0o700});
      for(const [context,project]of [[{...c,archive:true},p],[c,{...p,side:'X'}],[c,{...p,id:'other'}],[c,{...p,dir:c.root}]])
        await assert.rejects(()=>syntheticAuthVersionPin(context,project,true),e=>e.code==='SYNTHETIC_AUTH_PIN_TARGET');
      await syntheticAuthVersionPin(c,p,true);await syntheticAuthVersionPin(c,p,false);
      const directory=path.join(p.dir,'supabase','.temp'),pin=path.join(directory,'gotrue-version');
      assert.deepEqual(await fs.readdir(directory),['gotrue-version']);
      assert.equal(await fs.readFile(pin,'utf8'),ARCHIVE_VENDOR_PINS['gotrue-version']);
      await assert.rejects(()=>syntheticAuthVersionPin(c,p,true),e=>e.code==='SYNTHETIC_AUTH_PIN_INVENTORY');
      await fs.writeFile(pin,'v2.196.0\n');await assert.rejects(()=>syntheticAuthVersionPin(c,p,false),e=>e.code==='SYNTHETIC_AUTH_PIN_VALUE');
    });
    for(const fault of ['linked','hardlink','directory'])await ownArchive(async({c})=>{
      c.archive=false;c.owner='123-1';const p={side:'B',id:'rr_restore_123_1_b',dir:path.join(c.root,'B')};
      await fs.mkdir(path.join(p.dir,'supabase'),{recursive:true,mode:0o700});await syntheticAuthVersionPin(c,p,true);
      const directory=path.join(p.dir,'supabase','.temp');
      if(fault==='linked')await fs.writeFile(path.join(directory,'project-ref'),'not-a-project',{flag:'wx'});
      if(fault==='hardlink')await fs.link(path.join(directory,'gotrue-version'),path.join(c.root,'pin-alias'));
      if(fault==='directory'){await fs.rename(directory,path.join(c.root,'pins'));
        await fs.symlink(path.join(c.root,'pins'),directory,process.platform==='win32'?'junction':'dir');}
      await assert.rejects(()=>syntheticAuthVersionPin(c,p,false),e=>/^SYNTHETIC_AUTH_PIN_/.test(e.code??''));
    });
  });
  test('Auth delete and readback routes are exact synthetic-B operations and archive routes retain their old shape',()=>{
    const c={archive:false},p={side:'B'},id='11111111-1111-4111-8111-111111111111',route='/admin/users/'+id;
    for(const archive of [false,true])for(const [r,body,method]of [
      ['/admin/users',{email:'fixture@example.invalid'},'POST'],['/token?grant_type=password',{password:'fixture'},'POST'],['/user',null,'GET']])
      assert.equal(authRequestShape({archive},p,r,body,null,200).method,method);
    assert.deepEqual(authRequestShape(c,p,route,null,null,[200,404]),{method:'GET',admin:true,readback:true,kind:'ADMIN_USER'});
    assert.equal(authRequestShape(c,p,route,{should_soft_delete:false},'DELETE',200).kind,'DELETE');
    assert.equal(authRequestShape(c,p,'/token?grant_type=refresh_token',{refresh_token:'fixture'},null,200).kind,'REFRESH');
    for(const args of [[{archive:true},p,route,null,null,200],[c,{side:'A'},route,null,null,200],
      [c,p,route+'?other=1',null,null,200],[c,p,'/admin/users/not-a-uuid',null,null,200],
      [c,p,route,{should_soft_delete:true},'DELETE',200],[c,p,route,{should_soft_delete:false,other:true},'DELETE',200],
      [c,p,route,null,'POST',200],[c,p,route,null,null,[200,401]],[c,p,'/user',null,null,[200,404]]])
      assert.throws(()=>authRequestShape(...args),e=>/^AUTH_/.test(e.code??''));
  });
  test('unknown delete outcome closes only on stable operation plus exact admin and zero-row readback',()=>{
    const intent={operationId:'11111111-1111-4111-8111-111111111111',userId:'22222222-2222-4222-8222-222222222222',sessionId:'33333333-3333-4333-8333-333333333333'},
      counts={users:0,sessions:0,matchingSession:0,refreshTokens:0,identities:0,refreshed:false},admin={status:404,user:null};
    const result=syntheticAuthDeleteReadback(intent,structuredClone(intent),admin,counts);
    assert.equal(result.state,'AUTH_ABSENT_BY_ADMIN_AND_PG_READBACK');
    assert.deepEqual(syntheticAuthDeleteReadback(structuredClone(intent),intent,admin,structuredClone(counts)),result);
    for(const field of ['users','sessions','matchingSession','refreshTokens','identities'])
      assert.throws(()=>syntheticAuthDeleteReadback(intent,intent,admin,{...counts,[field]:1}),e=>e.code==='SYNTHETIC_AUTH_DELETE_COMMIT_UNKNOWN');
    for(const value of [{status:200,user:{id:intent.userId}},{status:401,user:null},{status:404,user:{id:intent.userId}},null])
      assert.throws(()=>syntheticAuthDeleteReadback(intent,intent,value,counts),e=>e.code==='SYNTHETIC_AUTH_DELETE_COMMIT_UNKNOWN');
    assert.throws(()=>syntheticAuthDeleteReadback(intent,intent,admin,{...counts,refreshed:true}),e=>e.code==='SYNTHETIC_AUTH_DELETE_COMMIT_UNKNOWN');
    for(const changed of [{...intent,operationId:intent.userId},{...intent,userId:intent.sessionId},{...intent,sessionId:intent.userId}])
      assert.throws(()=>syntheticAuthDeleteReadback(changed,intent,admin,counts),e=>e.code==='SYNTHETIC_AUTH_OPERATION_CHANGED');
    for(const bad of [{...counts,users:-1},{...counts,users:'0'},{...counts,unexpected:'PRIVATE_SENTINEL'}])
      assert.throws(()=>syntheticAuthDeleteReadback(intent,intent,admin,bad),e=>e.code==='SYNTHETIC_AUTH_COUNTS');
    assert.throws(()=>syntheticAuthCountsSql({...intent,userId:"';delete from auth.users;--"}),e=>e.code==='SYNTHETIC_AUTH_IDENTITY');
    assert.throws(()=>syntheticAuthCountsSql({...intent,unexpected:'PRIVATE_SENTINEL'}),e=>e.code==='SYNTHETIC_AUTH_IDENTITY');
  });
  test('issued JWT claim projection proves only identity and remaining exp, never signature or revocation',()=>{
    const id='22222222-2222-4222-8222-222222222222',session='33333333-3333-4333-8333-333333333333',exp=Math.floor(Date.now()/1000)+3600;
    const token=claims=>'e30.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.not_verified';
    assert.deepEqual(syntheticIssuedJwtClaims(token({sub:id,session_id:session,exp,privateCanary:'NEVER_REPORT'}),id),
      {userId:id,sessionId:session,expiresAt:exp});
    for(const claims of [{sub:session,session_id:session,exp},{sub:id,session_id:'invalid',exp},{sub:id,session_id:session,exp:1},
      {sub:id,session_id:session,exp:String(exp)}])assert.throws(()=>syntheticIssuedJwtClaims(token(claims),id));
    for(const bad of ['', 'not-a-jwt','a.b.c.d','a'.repeat(16385)])assert.throws(()=>syntheticIssuedJwtClaims(bad,id));
  });

  test('archive CHECK staging wraps both original DATA streams without changing original file bytes',async()=>{
    await ownArchive(async({c,index,materialize,env,source})=>{
      const archive=await materializeArchiveInputs(c,index,{archive:materialize,env});
      c.archive=true;
      for(const history of [false,true]){
        const chunks=[];for await(const b of materializedRestoreBytes(c,archive,history))chunks.push(b);
        const bytes=Buffer.concat(chunks);assert.doesNotMatch(bytes.toString('utf8'),/rr_archive_check_(?:suspend|restore)/);
        for(const i of history?[3,4]:[0,1,2])assert(bytes.includes(source[i]));
        assert.throws(()=>restoreArchiveSql(c,{},history?'RESTORE_ARCHIVE_HISTORY':'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',archive,history),
          e=>e.code==='ARCHIVE_RELATION_CHECK_INVENTORY');
      }
      c.archiveRelationInventory=await collectArchiveRelationInventory(c,archive);
      for(const history of [false,true]){
        const chunks=[],lines={next:1,ranges:new Map()};
        for await(const b of materializedRestoreBytes(c,archive,history,lines))chunks.push(b);
        const bytes=Buffer.concat(chunks),text=bytes.toString('utf8'),data=source[history?4:2];
        for(const i of history?[3,4]:[0,1,2])assert(bytes.includes(source[i]));
        assert(text.indexOf('DO $rr_archive_check_suspend$')<text.indexOf(data.toString('utf8')));
        assert(text.indexOf('DO $rr_archive_check_restore$')>text.indexOf(data.toString('utf8')));
        assert(lines.ranges.has('CHECK_SUSPEND'));assert(lines.ranges.has('CHECK_RESTORE'));
      }
      c.archiveRelationInventory.complete=false;
      assert.throws(()=>archiveNotValidCheckSql(c.archiveRelationInventory,'DATA'),e=>e.code==='ARCHIVE_RELATION_CHECK_INVENTORY');
      for(const history of [false,true])assert.throws(()=>restoreArchiveSql(c,{},
        history?'RESTORE_ARCHIVE_HISTORY':'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',archive,history),e=>e.code==='ARCHIVE_RELATION_CHECK_INVENTORY');
    },{fileSql:{'data.sql':'COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\n'
      +'COPY "public"."check_fixture" ("value") FROM stdin;\nprivate-data-sentinel\n\\.\n',
      'history-data.sql':'COPY "supabase_migrations"."schema_migrations" ("version") FROM stdin;\n20200101\n\\.\n'}});
  });
  test('archive CHECK report requires complete bound counts exact identity and semantic equality without private fields',()=>{
    const inventory={complete:true,digest:'a'.repeat(64),relations:[]},report={kind:'ARCHIVE_NOTVALID_CHECK_RESTORE_V1',phase:'DATA',
      inventorySha256:inventory.digest,catalogScope:'ALL_DATABASE_CHECKS',measurementPoint:'AFTER_DATA_BEFORE_COMMIT',
      checkCount:4,stagedCount:2,retainedNotValidCount:1,validatedCheckCount:1,catalogSha256:'b'.repeat(64),semanticEqualityVerified:true};
    const wire=v=>Buffer.from(JSON.stringify(v)+'\n'),context=()=>({archiveRelationInventory:inventory});
    assert.deepEqual(readArchiveNotValidCheckReport(context(),'DATA',wire(report)),report);
    for(const edit of [r=>r.phase='HISTORY_DATA',r=>r.inventorySha256='c'.repeat(64),r=>r.semanticEqualityVerified=false,
      r=>r.catalogScope='COPY_ONLY',r=>r.checkCount=4097,r=>r.stagedCount=0,r=>r.retainedNotValidCount=-1,
      r=>delete r.retainedNotValidCount,r=>r.catalogSha256='unknown',r=>r.definition='PRIVATE_PREDICATE']){
      const changed=structuredClone(report);edit(changed);
      assert.throws(()=>readArchiveNotValidCheckReport(context(),'DATA',wire(changed)),e=>e.code==='ARCHIVE_RELATION_CHECK_REPORT_INVALID');
    }
    for(const bytes of [Buffer.alloc(0),Buffer.concat([wire(report),wire(report)])])
      assert.throws(()=>readArchiveNotValidCheckReport(context(),'DATA',bytes),e=>e.code==='ARCHIVE_RELATION_CHECK_REPORT_MISSING');
    const c=context();readArchiveNotValidCheckReport(c,'DATA',wire(report));
    assert.throws(()=>readArchiveNotValidCheckReport(c,'DATA',wire(report)),e=>e.code==='ARCHIVE_RELATION_CHECK_REPORT_DUPLICATE');
  });

  test('only the normal owned archive-B HISTORY stream gets primary-style verbose diagnostics with unchanged psql target and limits',()=>{
    const p={side:'B',db:'synthetic-owned-container',dbUrl:new URL('postgres://postgres:synthetic-password@127.0.0.1:54322/postgres')},
      lines={next:1,ranges:new Map()},prefix=['exec','-i','-e','PGPASSWORD=synthetic-password',p.db,'psql','-X',
        '--host=127.0.0.1','--port=5432','--username=postgres','--dbname=postgres','--quiet','--single-transaction','--variable=ON_ERROR_STOP=1'],
      tail=['--tuples-only','--no-align'];
    assert.deepEqual(psqlArguments({archive:true},p,'RESTORE_ARCHIVE_HISTORY',lines),
      [...prefix,'--set=VERBOSITY=verbose','--set=SHOW_CONTEXT=never',...tail,'--file=-']);
    for(const [c,target,stage,inputLines]of [[{archive:false},p,'RESTORE_ARCHIVE_HISTORY',lines],
      [{archive:true},{...p,side:'A'},'RESTORE_ARCHIVE_HISTORY',lines],[{archive:true},p,'ARCHIVE_DATA_PARITY',lines],
      [{archive:true},p,'RESTORE_ARCHIVE_HISTORY',null],[{archive:true},p,'SYNTHETIC_CHECK_GUARD_DIAGNOSTIC',null]])
      assert.deepEqual(psqlArguments(c,target,stage,inputLines),[...prefix,'--set=VERBOSITY=sqlstate',...tail,...(inputLines?['--file=-']:[])]);
  });

  function suspendDiagnosticFixture(reason='ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND',phase='DATA'){
    const inventory={complete:true,digest:'d'.repeat(64),relations:[]};
    const counts=Object.fromEntries(Object.keys(ARCHIVE_CHECK_SUSPEND_COUNTS[reason]).map(key=>[key,0]));
    if(reason==='ARCHIVE_CHECK_SCOPE_UNSUPPORTED_OR_BOUND')Object.assign(counts,{checkCount:3,semanticBytes:512,notValidCount:2,
      unsupportedNotValidCount:1,domainOrNoRelationCount:1});
    else if(reason==='ARCHIVE_CHECK_TARGET_UNSUPPORTED')Object.assign(counts,{copyTargetCount:2,unsupportedTargetCount:1,
      nonTableTargetCount:1,partitionTargetCount:1});
    else counts.addedSemanticCount=1;
    const report={state:'OWNED_GUARD_BOUND',reason,phase,inventorySha256:inventory.digest,
      measurementPoint:'BEFORE_DATA_SAME_TRANSACTION',counts};
    const wire=(r=report,message=reason)=>Buffer.from('psql:<stdin>:7: ERROR:  P0001: '+message+'\nDETAIL:  '+JSON.stringify(r)
      +'\nCONTEXT:  private-catalog-definition-row-sentinel\nLOCATION:  exec_stmt_raise, pl_exec.c:3905\n');
    return {inventory,report,wire};
  }
  test('owned CHECK_SUSPEND projects only three exact guard reasons and bounded same-transaction counts',()=>{
    for(const reason of Object.keys(ARCHIVE_CHECK_SUSPEND_COUNTS))for(const phase of ['DATA','HISTORY_DATA']){
      const f=suspendDiagnosticFixture(reason,phase),c={archiveRelationInventory:f.inventory},stage=phase==='DATA'?'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA':'RESTORE_ARCHIVE_HISTORY';
      assert.deepEqual(archiveCheckSuspendDiagnostic(c,stage,f.wire(),'CHECK_SUSPEND'),f.report);
      const failure=safeError({code:'SQLSTATE_P0001',exit:3,inputOwner:'CHECK_SUSPEND',checkSuspend:f.report},stage);
      assert.equal(failure.code,'SQLSTATE_P0001');assert.equal(failure.exit,3);assert.equal(failure.inputOwner,'CHECK_SUSPEND');
      assert.deepEqual(failure.checkSuspend,f.report);assert(!JSON.stringify(failure).includes('private-catalog-definition-row-sentinel'));
      const limits=structuredClone(f.report);Object.assign(limits.counts,ARCHIVE_CHECK_SUSPEND_COUNTS[reason]);
      assert.deepEqual(publicArchiveCheckSuspendDiagnostic(limits),limits);
    }
  });
  test('CHECK_SUSPEND refuses unknown conflicting unbound or malformed diagnostics without exposing sentinels',()=>{
    const f=suspendDiagnosticFixture(),c={archiveRelationInventory:f.inventory},stage='RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',unknown={state:'UNAVAILABLE'};
    const changed=edit=>{const r=structuredClone(f.report);edit(r);return r;};
    for(const report of [changed(r=>r.reason={toString:7}),changed(r=>r.inventorySha256={toString:7}),changed(r=>r.reason='PRIVATE_REASON_SENTINEL'),changed(r=>r.phase='PRIVATE_PHASE_SENTINEL'),
      changed(r=>r.measurementPoint='AFTER_COMMIT'),changed(r=>r.extra='PRIVATE_CATALOG_SENTINEL'),
      changed(r=>r.counts.extra=1),changed(r=>delete r.counts.checkCount),changed(r=>r.counts.checkCount=4098),
      changed(r=>r.counts.semanticBytes=8388610),changed(r=>r.counts.notValidCount=4),
      changed(r=>r.counts.domainOrNoRelationCount=-1),changed(r=>r.counts.domainOrNoRelationCount=0.5),
      changed(r=>Object.keys(r.counts).forEach(key=>r.counts[key]=0))]){
      assert.deepEqual(publicArchiveCheckSuspendDiagnostic(report),unknown);
      assert.deepEqual(archiveCheckSuspendDiagnostic(c,stage,f.wire(report),'CHECK_SUSPEND'),unknown);
    }
    for(const bytes of [Buffer.alloc(0),Buffer.alloc(P.diagnosticBytes+1),Buffer.concat([f.wire(),f.wire()]),
      Buffer.from(f.wire().toString().replace('P0001:','23514:')),f.wire(f.report,'PRIVATE_MESSAGE_SENTINEL'),
      f.wire(f.report,'ARCHIVE_CHECK_TARGET_UNSUPPORTED'),Buffer.from(f.wire().toString().replace('DETAIL:  ','DETAIL:  PRIVATE_PREFIX_SENTINEL')),
      Buffer.from(f.wire().toString()+'DETAIL:  '+JSON.stringify(f.report)+'\n'),
      f.wire(changed(r=>r.inventorySha256='e'.repeat(64))),f.wire(changed(r=>r.phase='HISTORY_DATA'))])
      assert.deepEqual(archiveCheckSuspendDiagnostic(c,stage,bytes,'CHECK_SUSPEND'),unknown);
    for(const owner of ['DATA','CHECK_RESTORE','UNKNOWN'])assert.deepEqual(archiveCheckSuspendDiagnostic(c,stage,f.wire(),owner),unknown);
    assert.deepEqual(archiveCheckSuspendDiagnostic(c,'UNOWNED_STAGE',f.wire(),'CHECK_SUSPEND'),unknown);
    assert.deepEqual(archiveCheckSuspendDiagnostic({archiveRelationInventory:{...f.inventory,complete:false}},stage,f.wire(),'CHECK_SUSPEND'),unknown);
    for(const edit of [{code:'SQLSTATE_23514'},{inputOwner:'DATA'}])
      assert(!Object.hasOwn(safeError({code:'SQLSTATE_P0001',inputOwner:'CHECK_SUSPEND',checkSuspend:f.report,...edit},stage),'checkSuspend'));
    assert.deepEqual(safeError({code:'SQLSTATE_P0001',inputOwner:'CHECK_SUSPEND',checkSuspend:{...f.report,private:'PRIVATE_SENTINEL'}},stage).checkSuspend,unknown);
  });
  test('normal owned archive command retains P0001 exit and CHECK_SUSPEND owner while projecting bounded guard DETAIL',async()=>{
    const c={root:os.tmpdir(),home:os.tmpdir(),deadline:Date.now()+30_000,processes:[]};
    for(const reason of Object.keys(ARCHIVE_CHECK_SUSPEND_COUNTS)){
      const f=suspendDiagnosticFixture(reason);c.archiveRelationInventory=f.inventory;
      const inputLines={next:10,ranges:new Map([['CHECK_SUSPEND',{first:1,last:9}]])};
      const child=['-e','process.stdin.resume();process.stdin.on("end",()=>process.stderr.write('+JSON.stringify(f.wire().toString())+',()=>process.exit(3)))'];
      await assert.rejects(command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,child,
        {input:Buffer.from('-- own synthetic CHECK_SUSPEND\n'.repeat(9)),archivePsql:true,inputLines,maxMs:10_000}),error=>{
        assert.equal(error.code,'SQLSTATE_P0001');assert.equal(error.exit,3);assert.equal(error.inputOwner,'CHECK_SUSPEND');
        assert.deepEqual(error.checkSuspend,f.report);const failure=safeError(error,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA');
        assert.deepEqual(failure.checkSuspend,f.report);assert(!JSON.stringify(failure).includes('private-catalog-definition-row-sentinel'));return true;
      });
    }
    const fallback=suspendDiagnosticFixture();c.archiveRelationInventory=fallback.inventory;
    const noDetail=fallback.wire().toString().replace(/^DETAIL: [^\r\n]*\n/m,'DETAIL:  \n');
    const fallbackChild=['-e','process.stdin.resume();process.stdin.on("end",()=>process.stderr.write('+JSON.stringify(noDetail)+',()=>process.exit(3)))'];
    await assert.rejects(command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,fallbackChild,
      {input:Buffer.from('-- own synthetic CHECK_SUSPEND\n'.repeat(9)),archivePsql:true,
        inputLines:{next:10,ranges:new Map([['CHECK_SUSPEND',{first:1,last:9}]])},maxMs:10_000}),error=>{
      assert.equal(error.code,'SQLSTATE_P0001');assert.equal(error.exit,3);assert.equal(error.inputOwner,'CHECK_SUSPEND');
      assert.deepEqual(error.checkSuspend,{state:'UNAVAILABLE'});
      assert.deepEqual(safeError(error,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA').checkSuspend,{state:'UNAVAILABLE'});return true;
    });
    assert(c.processes.every(p=>p.processGroupClosed));
  });
  test('CHECK_SUSPEND separates the exact COPY staging set from the complete CHECK control group',()=>{
    const f=suspendDiagnosticFixture();
    for(const phase of ['DATA','HISTORY_DATA']){
      const sql=archiveNotValidCheckSql(f.inventory,phase).toString(),post=archiveNotValidCheckSql(f.inventory,phase,true).toString();
      for(const reason of Object.keys(ARCHIVE_CHECK_SUSPEND_COUNTS))assert(sql.includes("RAISE SQLSTATE 'P0001' USING MESSAGE='"+reason+"', DETAIL="));
      assert(sql.includes("IF current_user<>'postgres' OR current_database()<>'postgres' THEN RAISE SQLSTATE '42501'; END IF;"));
      assert(sql.includes('FROM pg_temp.rr_archive_check_snapshot)>4096'));
      assert(sql.includes('FROM pg_temp.rr_archive_check_snapshot)>8388608'));
      assert(sql.includes("unsafe IS DISTINCT FROM false OR pg_catalog.octet_length(definition)>131072"));
      assert(sql.includes("OR pg_catalog.octet_length(coalesce(comment,''))>65536 OR definition !~ ' NOT VALID$'"));
      assert(sql.includes('WHERE r.oid IS NULL OR r.relkind<>\'r\' OR r.relispartition'));
      assert(sql.includes('EXCEPT ALL SELECT semantic,unsupported,unsafe FROM pg_temp.rr_archive_check_live'));
      assert(sql.includes('EXCEPT ALL SELECT semantic,unsupported,unsafe FROM pg_temp.rr_archive_check_snapshot'));
      assert(sql.includes("r.relkind NOT IN ('r','p')"));
      assert(sql.includes('WHERE NOT snapshot.convalidated AND snapshot.unsupported IS FALSE'));
      assert(sql.includes('pg_catalog.to_regclass(e.qualified)=con.conrelid'));
      assert(sql.includes('FROM pg_temp.rr_archive_check_staged ORDER BY constraint_oid LOOP'));
      assert(post.includes('FROM pg_temp.rr_archive_check_staged ORDER BY constraint_oid LOOP'));
      assert(post.includes("'retainedNotValidCount',count(*) FILTER(WHERE NOT convalidated)-(SELECT count(*) FROM pg_temp.rr_archive_check_staged)"));
      assert(!post.includes('WHERE NOT convalidated ORDER BY constraint_oid LOOP'));
      assert(sql.includes("'inventorySha256','"+f.inventory.digest+"'"));assert(sql.includes("'phase','"+phase+"'"));
      assert(sql.includes('least(count(*),4097)'));assert(sql.includes('least(count(*),8193)'));
      assert.equal((sql.match(/WHEN query_canceled THEN RAISE;/g)??[]).length,3);
      assert.equal((sql.match(/WHEN OTHERS THEN diagnostic_detail := '';/g)??[]).length,3);
      assert.equal((sql.match(/DETAIL=coalesce\(diagnostic_detail,''\)/g)??[]).length,3);
      assert(!post.includes('OWNED_GUARD_BOUND'));assert(post.includes("MESSAGE='ARCHIVE_CHECK_SEMANTIC_MISMATCH';"));
    }
  });

  test('inventory-only uses the authenticated materializer and complete parser before any Docker or SQL',async()=>{
    await ownArchive(async({c,env,index,materialize})=>{
      c.archive=true;const calls=[];const selectedEnv=inventoryEnv(env,index);
      const run=async(_c,stage,bin,args)=>{assert.equal(_c,c);assert.equal(bin,'git');calls.push([stage,...args]);
        return Buffer.from(stage==='ARCHIVE_EXACT_HEAD'?selectedEnv.EXPECTED_HEAD_SHA+'\n':'');};
      const archive=async(...args)=>{calls.push(['MATERIALIZE']);return materialize(...args);};
      const report=await collectArchiveInventoryOnly(c,index,{env:selectedEnv,archive,run});
      assert.deepEqual(calls.map(row=>row[0]),['ARCHIVE_CURRENT_MAIN','ARCHIVE_EXACT_HEAD','ARCHIVE_EXACT_HEAD','MATERIALIZE']);
      assert.equal(report.status,'INVENTORY_ONLY');assert.equal(report.completeParse,true);
      assert.equal(report.archiveIndexCommitmentSha256,index);assert.equal(report.manifestSha256,'b'.repeat(64));
      assert.deepEqual(report.phases,{DATA:{copyTargets:4,sequenceTargets:1},HISTORY_DATA:{copyTargets:1,sequenceTargets:0}});
      assert.equal(report.vendorTargetCount,4);assert.equal(report.unclassifiedTargetCount,2);
      assert.deepEqual(report.unclassifiedBySchema,{AUTH:1,STORAGE:1});
      assert.deepEqual(report.targets,[
        {schema:'auth',kind:'COPY',qualifiedNameSha256:sha(Buffer.from('"auth"."Private_Target_Sentinel"'))},
        {schema:'storage',kind:'SEQUENCE',qualifiedNameSha256:sha(Buffer.from('"storage"."Private_Sequence_Sentinel"'))},
      ]);
      assert.notEqual(report.targets[0].qualifiedNameSha256,sha(Buffer.from('"auth"."private_target_sentinel"')),'Quoted identifier case is exact');
      assert.equal(report.files.length,5);assert.equal(report.totalSqlBytes,report.files.reduce((n,f)=>n+f.bytes,0));
      for(const f of report.files){assert(ARCHIVE_FILES.includes(f.file));assert(Number.isSafeInteger(f.bytes)&&f.bytes>0);assert.match(f.sha256,/^[a-f0-9]{64}$/);}
      for(const key of ['dockerInvoked','sqlExecuted','databaseRestoreExecuted','archiveWrittenThisOperation','centralLocatorWrittenThisOperation',
        'authRestoreVerified','fullDatabaseBackupVerified','freeReady','rawNamesIncluded','columnsIncluded','rowsIncluded','sqlIncluded'])assert.equal(report[key],false);
      assert.doesNotMatch(JSON.stringify(report),/Private_|private_column|private-row|secret-row|COPY |setval|SELECT /);
      // Pure output-bound refusal only, not an authenticated inventory claim.
      const tooWide={complete:true,digest:'d'.repeat(64),relations:Array.from({length:8192},(_,i)=>
        archiveRelationEntry('data.sql','SEQUENCE','"storage"."synthetic_'+i+'"'))};
      assert.throws(()=>archiveInventoryOnlyReport({files:report.files,totalSqlBytes:report.totalSqlBytes,manifestSha256:report.manifestSha256},
        tooWide,index,selectedEnv.EXPECTED_HEAD_SHA),e=>e.code==='ARCHIVE_INVENTORY_REPORT_BOUND');
      const source=fixture.toString();assert(source.indexOf('if(inventoryOnly)return archiveInventoryFixture(')<source.indexOf("'CLI_VERSION'"));
    },{fileSql:{'data.sql':inventoryData,'history-data.sql':inventoryHistory}});
  });
  test('inventory-only preserves exact head/commitment/receipt/complete-parse refusals',async()=>{
    for(const fault of ['COMMITMENT','MAIN','RECEIPT','UNSAFE_SQL','CHANGED_BYTES'])await ownArchive(async({c,env,index,materialize})=>{
      c.archive=true;const selectedEnv=inventoryEnv(env,index);let materialized=false;
      if(fault==='COMMITMENT')selectedEnv.RESTORE_ARCHIVE_INDEX_COMMITMENT='rr-supabase-restore-v1:'+'d'.repeat(64);
      const run=async(_c,stage,bin)=>{assert.equal(bin,'git');return Buffer.from(stage==='ARCHIVE_EXACT_HEAD'
        ?(fault==='MAIN'?'d'.repeat(40):selectedEnv.EXPECTED_HEAD_SHA)+'\n':'');};
      const archive=async(...args)=>{materialized=true;const value=await materialize(...args);
        if(fault==='RECEIPT')value.archiveWrittenThisOperation=true;
        if(fault==='CHANGED_BYTES')await fs.appendFile(path.join(args[0].destination,'data.sql'),'-- changed\n');
        return value;};
      await assert.rejects(collectArchiveInventoryOnly(c,index,{env:selectedEnv,archive,run}),e=>/^(ARCHIVE_|MATERIALIZATION_)/.test(e.code??''));
      if(['COMMITMENT','MAIN'].includes(fault))assert.equal(materialized,false,'Refuse before archive access');
    },{fileSql:{'data.sql':fault==='UNSAFE_SQL'?'INSERT INTO public.private_table VALUES (1);\n':inventoryData,'history-data.sql':inventoryHistory}});
  });
  test('inventory-only has one explicit mode, the same archive locks/source gate and no CLI setup',async()=>{
    await assert.rejects(fixture({archive:false,inventoryOnly:true}),e=>e.code==='ARCHIVE_INVENTORY_MODE');
    const workflow=await fs.readFile(new URL('../.github/workflows/verify-supabase-cli-local-restore.yml',import.meta.url),'utf8');
    const family="(inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory')";
    assert(workflow.includes('group: ${{ '+family+" && 'ravradar-isolated-archive-restore'"));
    assert(workflow.includes('group: ${{ '+family+" && 'ravradar-trip-storage-production'"));
    assert(workflow.includes('archive|archive-inventory)'));assert(workflow.includes("if: inputs.restore_mode != 'archive-inventory'"));
    const inventoryStep=workflow.split('name: Read only the authenticated archive vendor-target inventory without Docker or SQL')[1];
    assert(inventoryStep);assert.match(inventoryStep,/if: inputs.restore_mode == 'archive-inventory'/);
    assert.match(inventoryStep,/--run-archive-inventory/);assert(!/--run-archive-restore|--capture|upload-artifact|continue-on-error/.test(inventoryStep));
    assert(workflow.indexOf('Refuse missing exact source proof')<workflow.indexOf('name: Read only the authenticated archive vendor-target inventory'));
    for(const args of [['--run-archive-inventory','--run-archive-restore'],['--run-archive-inventory','--run-local-fixture']]){
      const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','HOME']
        .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
      const child=spawn(process.execPath,[fileURLToPath(import.meta.url),...args],{env,windowsHide:true,timeout:10_000,stdio:['ignore','ignore','ignore']});
      const [code,signal]=await once(child,'close');assert.equal(signal,null);assert(Number.isInteger(code)&&code!==0,'Mixed fixed CLI modes refuse before any operation');
    }
  });
  const dumpFixture=()=>{
    const c={owner:'123-1',archive:false},p={side:'A',id:'rr_restore_123_1_a',network:'rr-restore-123-1-a',
      networkId:'b'.repeat(64),db:'a'.repeat(64),dbUrl:new URL('postgresql://postgres:synthetic%40%3A%2F%3F@127.0.0.1:54322/postgres')};
    const info={Id:p.db,Name:'/supabase_db_'+p.id,Config:{Labels:{'com.supabase.cli.project':p.id}},
      NetworkSettings:{Networks:{[p.network]:{NetworkID:p.networkId}},Ports:{'5432/tcp':[{HostIp:'127.0.0.1',HostPort:'54322'}]}},
      State:{Running:true,Health:{Status:'healthy'}}};
    return {c,p,info};
  };
  test('only archive targets enable normal realtime bootstrap while the persistent service remains excluded',()=>{
    const realtimeEnabled=text=>/^enabled = true$/m.test(text.split('[realtime]\n')[1].split('\n[')[0]);
    const storageEnabled=text=>/^enabled = true$/m.test(text.split('[storage]\n')[1].split('\n[')[0]);
    assert.equal(realtimeEnabled(config('rr_restore_probe',true,true)),true);
    assert.equal(storageEnabled(config('rr_restore_probe',true,true)),true);
    for(const [target,archive]of [[false,false],[true,false],[false,true]])
      assert.equal(realtimeEnabled(config('rr_restore_probe',target,archive)),false);
    for(const [target,archive]of [[false,false],[true,false],[false,true]])
      assert.equal(storageEnabled(config('rr_restore_probe',target,archive)),false);
    assert.equal(realtimeEnabled(config('rr_restore_probe',true)),false);
    assert.equal(storageEnabled(config('rr_restore_probe',true)),false);
    assert(EXCLUDE.split(',').includes('realtime'));
    assert(EXCLUDE.split(',').includes('storage-api'));
    assert.match(startProject.toString(),/config\(p\.id,p\.side==='B',c\.archive===true\)/);
  });
  async function ownVendorBootstrap(run){
    await ownArchive(async({c})=>{
      c.archive=true;c.owner='123-1';
      const p={side:'B',id:'rr_restore_123_1_b',dir:path.join(c.root,'B')};
      await fs.mkdir(path.join(p.dir,'supabase'),{recursive:true,mode:0o700});
      await run(c,p);
    });
  }
  test('fresh unlinked archive B alone receives create-only normal vendor version pins',async()=>{
    await ownVendorBootstrap(async(c,p)=>{
      const directory=archiveVendorPinDirectory(c,p);
      for(const [context,project]of [[{...c,archive:false},p],[c,{...p,side:'A'}],[c,{...p,id:'other'}],[c,{...p,dir:c.root}]])
        await assert.rejects(()=>prepareArchiveVendorBootstrap(context,project),error=>error.code==='ARCHIVE_VENDOR_PROJECT');
      await fs.mkdir(directory,{mode:0o700});
      await fs.writeFile(path.join(directory,'cli-latest'),'3.1.0\n',{flag:'wx',mode:0o600});
      await prepareArchiveVendorBootstrap(c,p);await verifyArchiveVendorBootstrap(c,p);
      assert.equal(await fs.readFile(path.join(directory,'gotrue-version'),'utf8'),'v2.197.0\n');
      assert.equal(await fs.readFile(path.join(directory,'storage-version'),'utf8'),'v1.86.0\n');
      assert.deepEqual((await fs.readdir(directory)).sort(),['cli-latest','gotrue-version','storage-version']);
      await assert.rejects(()=>prepareArchiveVendorBootstrap(c,p),error=>error.code==='ARCHIVE_VENDOR_PIN_EXISTS');
      assert.equal(P.cli,'2.117.0');assert.equal(IMAGES.auth,'supabase/gotrue:v2.197.0');
      for(const [name,service]of [['gotrue-version','auth'],['storage-version','storage']])
        assert.equal(ARCHIVE_VENDOR_PINS[name],ARCHIVE_VENDOR_IMAGES[service].split(':').at(-1)+'\n');
      const body=startProject.toString();
      assert(body.indexOf("['init','--yes']")<body.indexOf('prepareArchiveVendorBootstrap'));
      assert(body.indexOf('prepareArchiveVendorBootstrap')<body.indexOf("'CREATE_NETWORK_'"));
      assert(body.indexOf("'START_'")<body.indexOf('verifyArchiveVendorBootstrap'));
      assert(body.includes('if(c.archive===true)await prepareArchiveVendorBootstrap(c,p)'));
      assert(body.includes('if(c.archive===true)await verifyArchiveVendorBootstrap(c,p)'));
    });
  });
  test('archive vendor pins refuse a linked project stale ceiling or any pre-existing service pin',async()=>{
    for(const [name,code]of [['project-ref','ARCHIVE_VENDOR_LINKED_PROJECT'],['pooler-url','ARCHIVE_VENDOR_LINKED_PROJECT'],
      ['storage-migration','ARCHIVE_VENDOR_MIGRATION_CEILING'],['gotrue-version','ARCHIVE_VENDOR_PIN_EXISTS'],
      ['storage-version','ARCHIVE_VENDOR_PIN_EXISTS'],['realtime-version','ARCHIVE_VENDOR_PIN_EXISTS'],['unknown','ARCHIVE_VENDOR_PIN_EXISTS']])
      await ownVendorBootstrap(async(c,p)=>{
        const directory=archiveVendorPinDirectory(c,p);await fs.mkdir(directory,{mode:0o700});
        await fs.writeFile(path.join(directory,name),'stale-owned-sentinel',{flag:'wx',mode:0o600});
        await assert.rejects(()=>prepareArchiveVendorBootstrap(c,p),error=>error.code===code);
        assert.deepEqual(await fs.readdir(directory),[name]);
        assert.equal(await fs.readFile(path.join(directory,name),'utf8'),'stale-owned-sentinel');
      });
  });
  test('archive vendor pin readback refuses changed bytes hardlinks redirected directories and later ceilings',async()=>{
    for(const fault of ['value','hardlink','directory','ceiling'])await ownVendorBootstrap(async(c,p)=>{
      const directory=archiveVendorPinDirectory(c,p);await prepareArchiveVendorBootstrap(c,p);
      const pin=path.join(directory,'storage-version');
      if(fault==='value')await fs.writeFile(pin,'v1.72.1\n');
      if(fault==='hardlink')await fs.link(pin,path.join(c.root,'owned-pin-alias'));
      if(fault==='directory'){
        await fs.rename(directory,path.join(c.root,'owned-pins'));
        await fs.symlink(path.join(c.root,'owned-pins'),directory,process.platform==='win32'?'junction':'dir');
      }
      if(fault==='ceiling')await fs.writeFile(path.join(directory,'storage-migration'),'0067-objects-null-version-index',{flag:'wx',mode:0o600});
      await assert.rejects(()=>verifyArchiveVendorBootstrap(c,p),error=>/^ARCHIVE_VENDOR_/.test(error.code??''));
    });
  });
  test('archive B and synthetic A/B use exact Auth197 and the same other images',()=>{
    const imageId='sha256:'+'a'.repeat(64),image={Id:imageId,RepoDigests:['synthetic-public-image-digest']};
    const info=tag=>({Image:imageId,Config:{Image:'ghcr.io/supabase/'+tag}});
    for(const side of ['A','B']){
      assert.equal(serviceImageMetadata({archive:false},{side},'auth',info('gotrue:v2.197.0'),image).id,imageId);
      assert.throws(()=>serviceImageMetadata({archive:false},{side},'auth',info('gotrue:v2.196.0'),image),error=>error.code==='UNEXPECTED_SERVICE_IMAGE');
    }
    assert.equal(serviceImageMetadata({archive:true},{side:'B'},'auth',info('gotrue:v2.197.0'),image).id,imageId);
    for(const tag of ['gotrue:v2.196.0','gotrue:v2.198.0','gotrue:latest'])
      assert.throws(()=>serviceImageMetadata({archive:true},{side:'B'},'auth',info(tag),image),error=>error.code==='UNEXPECTED_SERVICE_IMAGE');
    assert.throws(()=>serviceImageMetadata({archive:true},{side:'A'},'auth',info('gotrue:v2.197.0'),image),error=>error.code==='ARCHIVE_VENDOR_PROJECT');
    for(const service of ['db','kong'])for(const archive of [false,true])
      assert.equal(serviceImageMetadata({archive},{side:'B'},service,info(IMAGES[service].split('/').at(-1)),image).id,imageId);
    assert.throws(()=>serviceImageMetadata({archive:true},{side:'B'},'auth',info('gotrue:v2.197.0'),{...image,Id:'sha256:'+'b'.repeat(64)}));
    assert.throws(()=>serviceImageMetadata({archive:true},{side:'B'},'auth',info('gotrue:v2.197.0'),{...image,RepoDigests:[]}),error=>error.code==='IMAGE_DIGEST_REQUIRED');
  });
  async function ownLocalAuthBootstrap(run){
    const data=[
      'COPY "auth"."users" ("id") FROM stdin;',
      '\\.',
      'COPY "auth"."identities" ("id") FROM stdin;',
      '\\.',
      'COPY "auth"."webauthn_credentials" ("id") FROM stdin;',
      '\\.',
      'COPY "storage"."iceberg_namespaces" ("id") FROM stdin;',
      '\\.',
      'COPY "auth"."PRIVATE_RELATION_SENTINEL" ("id") FROM stdin;',
      '\\.',
      '',
    ].join('\n');
    await ownArchive(async({c,index,materialize,env})=>{
      const archive=await materializeArchiveInputs(c,index,{archive:materialize,env});
      c.archive=true;c.images={auth:{id:'sha256:'+'d'.repeat(64),digests:['PRIVATE_IMAGE_SENTINEL']}};
      c.archiveRelationInventory=await collectArchiveRelationInventory(c,archive);c.stage='QUIESCE_B_AUTH';
      const p={side:'B',db:'e'.repeat(64)};
      const report={kind:'ARCHIVE_LOCAL_AUTH_BOOTSTRAP_V1',measurementPoint:'AFTER_AUTH_STOP_BEFORE_ORIGINAL_SQL',
        inventorySha256:c.archiveRelationInventory.digest,authTag:'gotrue:v2.197.0',authImageSha256:'d'.repeat(64),
        targetCount:5,unclassifiedTargetCount:1,fixedTargets:[
          {label:'AUTH_IDENTITIES',kind:'COPY',state:'TABLE'},
          {label:'AUTH_USERS',kind:'COPY',state:'TABLE'},
          {label:'AUTH_WEBAUTHN_CREDENTIALS',kind:'COPY',state:'MISSING'},
          {label:'STORAGE_ICEBERG_NAMESPACES',kind:'COPY',state:'MISSING'},
        ],migrationTableKind:'TABLE',migrationState:'OBSERVED',migrationCount:2,migrationVersions:['0','20260625000000']};
      await run({c,p,archive,report});
    },{fileSql:{'data.sql':data,'history-data.sql':'\n'}});
  }
  test('archive local Auth bootstrap uses the complete inventory and one owned pre-original read without raw target output',async()=>{
    await ownLocalAuthBootstrap(async({c,p,report})=>{
      let calls=0;
      const observed=await observeArchiveLocalAuthBootstrap(c,p,async(context,stage,bin,args,options)=>{
        calls++;assert.equal(context,c);assert.equal(stage,'ARCHIVE_LOCAL_AUTH_BOOTSTRAP');assert.equal(bin,'docker');
        assert.deepEqual(args,archiveBootstrapPsqlArguments(c,p));
        assert.equal(options.maxMs,90_000);assert.equal(options.archivePsql,true);assert(Buffer.isBuffer(options.input));
        const sql=options.input.toString('utf8');
        assert.match(sql,/\\if :rr_local_auth_versions_readable/);
        assert.match(sql,/FROM auth\.schema_migrations/);assert.match(sql,/LIMIT 513/);
        assert.match(sql,/PRIVATE_RELATION_SENTINEL/);
        assert(!sql.includes('PRIVATE_IMAGE_SENTINEL'));assert(!sql.includes('COPY '));
        return Buffer.from(JSON.stringify(report)+'\n');
      });
      assert.equal(calls,1);assert.deepEqual(observed,report);assert.deepEqual(c.archiveLocalAuthBootstrap,report);
      const missing={kind:'ARCHIVE_RELATION_PREFLIGHT_V1',phase:'DATA',inventorySha256:c.archiveRelationInventory.digest,
        completeParse:true,copyTargets:5,sequenceTargets:0,missingCount:2,wrongKindCount:0,
        missingBySchema:{AUTH:1,STORAGE:1},wrongKindBySchema:{},
        missingFixedRelations:['AUTH_WEBAUTHN_CREDENTIALS','STORAGE_ICEBERG_NAMESPACES'],wrongKindFixedRelations:[]};
      const post=readArchiveRelationPreflight(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',Buffer.from(JSON.stringify(missing)),3);
      assert.equal(post.missingCount,2);assert.deepEqual(post.missingFixedRelations,missing.missingFixedRelations);
      const published=restorePublicReport(c,null,{stage:'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',code:'ARCHIVE_RELATION_PREFLIGHT_MISSING'},true);
      assert.deepEqual(published.localAuthBootstrap,report);
      assert(!JSON.stringify(published).includes('PRIVATE_'));
      const body=restoreArchive.toString();
      assert(body.indexOf('collectArchiveRelationInventory')<body.indexOf('QUIESCE_B_AUTH'));
      assert(body.indexOf('QUIESCE_B_AUTH')<body.indexOf('observeArchiveLocalAuthBootstrap'));
      assert(body.indexOf('observeArchiveLocalAuthBootstrap')<body.indexOf('RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'));
      assert(body.indexOf('RESTORE_ARCHIVE_ROLES_SCHEMA_DATA')<body.indexOf('RESTORE_ARCHIVE_HISTORY'));
    });
  });
  test('archive local Auth bootstrap preserves fixed missing kind and invalid-version observations but grants no continuation',async()=>{
    await ownLocalAuthBootstrap(async({c,p,report})=>{
      for(const [migrationTableKind,migrationState,migrationCount]of [
        ['MISSING','MISSING',null],['OTHER_KIND','WRONG_KIND',null],
        ['TABLE','INVALID_VERSION',2],['TABLE','OVER_BOUND',null],
      ]){
        c.stage='QUIESCE_B_AUTH';delete c.archiveLocalAuthBootstrap;
        const value={...report,migrationTableKind,migrationState,migrationCount,migrationVersions:[]};let calls=0;
        await assert.rejects(()=>observeArchiveLocalAuthBootstrap(c,p,async()=>{calls++;return Buffer.from(JSON.stringify(value));}),
          e=>e.code==='ARCHIVE_LOCAL_AUTH_BOOTSTRAP_NOT_READY');
        assert.equal(calls,1);assert.deepEqual(c.archiveLocalAuthBootstrap,value);
        assert.deepEqual(restorePublicReport(c,null,{code:'ARCHIVE_LOCAL_AUTH_BOOTSTRAP_NOT_READY'},true).localAuthBootstrap,value);
      }
      let calls=0;
      for(const stage of ['PREFLIGHT','START_B','RESTORE_ARCHIVE_ROLES_SCHEMA_DATA']){
        c.stage=stage;
        await assert.rejects(()=>observeArchiveLocalAuthBootstrap(c,p,async()=>{calls++;}),e=>e.code==='ARCHIVE_LOCAL_AUTH_SEQUENCE');
      }
      assert.equal(calls,0);
    });
  });
  test('archive local Auth metadata rejects private extra fields unsafe versions unknown labels and changed identity before public projection',async()=>{
    await ownLocalAuthBootstrap(async({c,report})=>{
      for(const edit of [
        v=>v.raw='PRIVATE_PAYLOAD_SENTINEL',
        v=>v.authTag='PRIVATE_IMAGE_SENTINEL',
        v=>v.authTag='gotrue:v2.196.0',
        v=>v.authImageSha256='a'.repeat(64),
        v=>v.inventorySha256='b'.repeat(64),
        v=>v.measurementPoint='AFTER_ORIGINAL_SQL',
        v=>v.fixedTargets[0].label='PRIVATE_RELATION_SENTINEL',
        v=>v.fixedTargets[0].qualified='"auth"."PRIVATE_RELATION_SENTINEL"',
        v=>v.fixedTargets[0].state='PRIVATE_STATUS_SENTINEL',
        v=>v.unclassifiedTargetCount=0,
        v=>v.targetCount=0,
        v=>v.migrationVersions=['PRIVATE_VERSION_SENTINEL','20260625000000'],
        v=>v.migrationVersions=['20260625000000','0'],
        v=>v.migrationVersions=['0','0'],
        v=>v.migrationVersions=['0','9'.repeat(20)],
        v=>v.migrationVersions=Array(513).fill('0'),
        v=>v.migrationCount=513,
        v=>v.migrationCount=1,
        v=>v.migrationState='PASS',
        v=>{v.migrationState='MISSING';v.migrationVersions=[];v.migrationCount=null;},
      ]){
        const changed=structuredClone(report);edit(changed);
        assert.throws(()=>readArchiveLocalAuthBootstrap(c,Buffer.from(JSON.stringify(changed))),e=>/^ARCHIVE_LOCAL_AUTH_REPORT_/.test(e.code));
        c.archiveLocalAuthBootstrap=changed;
        assert.throws(()=>restorePublicReport(c,null,{code:'OTHER'},true),e=>/^ARCHIVE_LOCAL_AUTH_REPORT_/.test(e.code));
      }
      delete c.archiveLocalAuthBootstrap;
      for(const bytes of [Buffer.from('{'),Buffer.from([0xff]),Buffer.alloc(ARCHIVE_LOCAL_AUTH_METADATA.bytes+1,32)])
        assert.throws(()=>readArchiveLocalAuthBootstrap(c,bytes),e=>/^ARCHIVE_LOCAL_AUTH_REPORT_/.test(e.code));
      c.archiveRelationInventory.complete=false;
      assert.throws(()=>archiveLocalAuthBootstrapSql(c),e=>e.code==='ARCHIVE_LOCAL_AUTH_INVENTORY');
    });
  });
  test('archive vendor labels name only exact public Auth Storage and serial targets while private and future names stay OTHER',()=>{
    for(const [qualified,label,kind]of [
      ['"auth"."webauthn_credentials"','AUTH_WEBAUTHN_CREDENTIALS','COPY'],
      ['"auth"."custom_oauth_providers"','AUTH_CUSTOM_OAUTH_PROVIDERS','COPY'],
      ['"auth"."sso_sessions"','AUTH_SSO_SESSIONS','COPY'],
      ['"auth"."refresh_tokens_id_seq"','AUTH_REFRESH_TOKENS_ID_SEQUENCE','SEQUENCE'],
      ['"storage"."iceberg_namespaces"','STORAGE_ICEBERG_NAMESPACES','COPY'],
      ['"storage"."iceberg_tables"','STORAGE_ICEBERG_TABLES','COPY'],
      ['"auth"."scim_users"','AUTH_SCIM_USERS','COPY'],['"auth"."scim_tokens"','AUTH_SCIM_TOKENS','COPY'],
      ['"auth"."mfa_recovery_code_sets"','AUTH_MFA_RECOVERY_CODE_SETS','COPY'],['"auth"."mfa_recovery_codes"','AUTH_MFA_RECOVERY_CODES','COPY'],
      ['"storage"."bucket_lifecycle_states"','STORAGE_BUCKET_LIFECYCLE_STATES','COPY'],
      ['"storage"."lifecycle_abandoned_artifacts"','STORAGE_LIFECYCLE_ABANDONED_ARTIFACTS','COPY'],
    ])assert.equal(archiveRelationEntry('data.sql',kind,qualified).relationClass,label);
    for(const qualified of ['"auth"."PRIVATE_RELATION_SENTINEL"','"storage"."future_vendor_table"','"public"."users"'])
      assert.equal(archiveRelationEntry('data.sql','COPY',qualified).relationClass,'OTHER');
  });
  test('reserved system role preflight reads the owned target and stops before archive SQL on missing roles',async()=>{
    const target=['supabase_admin','supabase_auth_admin'],index='a'.repeat(64),root=path.join(os.tmpdir(),'synthetic-role-audit');
    const c={root,deadline:Date.now()+10_000,archive:true},calls=[];
    const env={SUPABASE_SERVICE_ROLE_KEY:'synthetic-master-never-real-'.repeat(2),SUPABASE_DB_PASSWORD:'must-not-leave',GITHUB_TOKEN:'must-not-leave',
      GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',GITHUB_REPOSITORY:'jakobjorgensen82-commits/RavRadar'};
    const readTarget=async(_c,_b,stage,sql)=>{calls.push(stage);assert(sql.includes('from pg_roles'));assert(!sql.includes('pg_authid'));return target;};
    let missing=true;
    const audit=async(options,dependencies)=>{
      calls.push('AUTHENTICATED_ROLES_ONLY');assert.deepEqual(options,{indexCommitmentSha256:index,targetSystemRoles:target});
      assert.deepEqual(Object.keys(dependencies.env).sort(),['RUNNER_TEMP','SUPABASE_SERVICE_ROLE_KEY','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','GITHUB_REPOSITORY'].sort());
      return{status:'AUTHENTICATED_RESERVED_SYSTEM_ROLE_PREFLIGHT_ONLY',indexCommitmentSha256:index,
        referencedSystemRoles:missing?['supabase_admin','supabase_future_role']:['supabase_admin'],targetSystemRoles:target,
        missingSystemRoles:missing?['supabase_future_role']:[],referencedSystemRoleCount:missing?2:1,targetSystemRoleCount:2,
        rolesFileVerified:true,fullDatabaseBackupVerified:false,databaseRestoreExecuted:false,archiveWrittenThisOperation:false};
    };
    await assert.rejects(()=>auditArchiveSystemRoles(c,{},index,{env,audit,readTarget}),e=>e.code==='ARCHIVE_SYSTEM_ROLE_COMPATIBILITY');
    assert.deepEqual(calls,['ARCHIVE_TARGET_SYSTEM_ROLES','AUTHENTICATED_ROLES_ONLY']);
    const publicReport=restorePublicReport(c,null,{code:'ARCHIVE_SYSTEM_ROLE_COMPATIBILITY'},true);
    assert.deepEqual(publicReport.systemRoleAudit.missingSystemRoles,['supabase_future_role']);
    assert(!JSON.stringify(publicReport).includes(index)&&!JSON.stringify(publicReport).includes('must-not-leave'));
    missing=false;assert.equal((await auditArchiveSystemRoles(c,{},index,{env,audit,readTarget})).missingSystemRoleCount,0);
    for(const edit of [r=>{r.referencedSystemRoles=['private_role'];},r=>{r.targetSystemRoles=['supabase_other'];},
      r=>{r.missingSystemRoles=['supabase_false_missing'];},r=>{r.rolesFileVerified=false;}]){
      const changed=async(...args)=>{const r=await audit(...args);edit(r);return r;};
      await assert.rejects(()=>auditArchiveSystemRoles(c,{},index,{env,audit:changed,readTarget}),e=>e.code==='ARCHIVE_SYSTEM_ROLE_AUDIT_RECEIPT');
    }
  });
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
  function checkDiagnosticFixture(inventory={complete:true,digest:'a'.repeat(64),
    relations:[archiveRelationEntry('data.sql','COPY','"auth"."users"')]}){
    const phase='DATA',entry={tupleSha256:archiveCheckTupleHash(['auth','users','fixture_check']),
      schemaClass:'AUTH',contype:'c',convalidated:true};
    const report={kind:'ARCHIVE_RELATION_PREFLIGHT_V1',phase,inventorySha256:inventory.digest,completeParse:true,
      copyTargets:inventory.relations.filter(r=>r.phase===phase&&r.kind==='COPY').length,
      sequenceTargets:inventory.relations.filter(r=>r.phase===phase&&r.kind==='SEQUENCE').length,
      missingCount:0,wrongKindCount:0,missingBySchema:{},wrongKindBySchema:{},missingFixedRelations:[],wrongKindFixedRelations:[]};
    const catalog={kind:'ARCHIVE_CHECK_CATALOG_V1',phase,inventorySha256:inventory.digest,
      measurementPoint:ARCHIVE_CHECK_CATALOG.point,hashFormat:ARCHIVE_CHECK_CATALOG.hashFormat,complete:true,entries:[entry]};
    const verbose=(line=7)=>Buffer.from('psql:<stdin>:'+line+': ERROR:  23514: private primary message\n'
      +'DETAIL:  Failing row contains (private-row-never-report).\nSCHEMA NAME:  auth\nTABLE NAME:  users\n'
      +'CONSTRAINT NAME:  fixture_check\nLOCATION:  ExecConstraints, execMain.c:2041\n');
    const wire=(value=catalog)=>Buffer.from(JSON.stringify(report)+'\n'+(value===null?'':JSON.stringify(value)+'\n'));
    return{inventory,entry,report,catalog,verbose,wire};
  }
  test('CHECK diagnostic hashes exact length-prefixed UTF8 tuples and reads only bounded same-transaction catalogue metadata',()=>{
    const f=checkDiagnosticFixture(),c={archiveRelationInventory:f.inventory};
    assert.equal(f.entry.tupleSha256,sha(Buffer.from('00000004617574680000000575736572730000000d666978747572655f636865636b','hex')));
    assert.notEqual(archiveCheckTupleHash(['a','bc','d']),archiveCheckTupleHash(['ab','c','d']));
    assert.notEqual(archiveCheckTupleHash(['auth','Users','fixture_check']),f.entry.tupleSha256);
    for(const parts of [['auth','users','x\ny'],['auth','users','x\0y'],['auth','users','æ'.repeat(32)],['auth','users','\ud800']])
      assert.equal(archiveCheckTupleHash(parts),null);
    assert.notEqual(archiveCheckTupleHash(['auth','users','æøå']),archiveCheckTupleHash(['auth','users','aeoeaa']));
    const sql=archiveRelationPreflightSql(f.inventory,'DATA').toString();
    assert(sql.includes('pg_catalog.pg_constraint')&&sql.includes("con.contype='c'")&&sql.includes('con.convalidated'));
    assert(sql.includes('pg_catalog.int4send(pg_catalog.octet_length(pg_catalog.convert_to('));
    assert(sql.includes('LIMIT 513')&&sql.includes('\\echo :rr_archive_check_catalog'));
    assert(!sql.includes('pg_get_constraintdef')&&!sql.includes('pg_get_expr')&&!sql.includes('private-row'));
    assert.deepEqual(readArchiveRelationPreflight(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.wire(),3),f.report);
    for(const convalidated of [true,false]){
      const catalog=structuredClone(f.catalog);catalog.entries[0].convalidated=convalidated;
      const trial={archiveRelationInventory:f.inventory};readArchiveCheckCatalog(trial,'DATA',f.wire(catalog));
      assert.deepEqual(archiveCheckDiagnostic(trial,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.verbose(),'DATA'),
        {state:'CATALOG_BOUND',...f.entry,convalidated,measurementPoint:ARCHIVE_CHECK_CATALOG.point});
    }
    assert(!JSON.stringify(restorePublicReport({...c,archive:true},null,{code:'OTHER_FAILURE'},true)).includes('fixture_check'));
  });
  test('CHECK diagnostic refuses missing replayed malformed duplicate and over-bound catalogues without replacing the SQL failure',()=>{
    const f=checkDiagnosticFixture(),unknown={state:'UNAVAILABLE'};
    for(const change of [v=>{v.complete=false;},v=>{v.phase='HISTORY_DATA';},v=>{v.inventorySha256='b'.repeat(64);},
      v=>{v.measurementPoint='AFTER_ROLLBACK';},v=>{v.hashFormat='UNKNOWN';},v=>{v.extra='private-value';},
      v=>{v.entries[0].name='private-constraint';},v=>{v.entries[0].tupleSha256='x';},v=>{v.entries[0].schemaClass='OTHER';},
      v=>{v.entries[0].contype='f';},v=>{v.entries[0].convalidated=null;},v=>{v.entries.push({...v.entries[0]});},
      v=>{v.entries=Array.from({length:513},()=>({...v.entries[0]}));}]){
      const value=structuredClone(f.catalog);change(value);const c={archiveRelationInventory:f.inventory};
      readArchiveCheckCatalog(c,'DATA',f.wire());readArchiveCheckCatalog(c,'DATA',f.wire(value));
      assert.deepEqual(archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.verbose(),'DATA'),unknown);
    }
    for(const wire of [f.wire(null),Buffer.concat([f.wire(),Buffer.from(JSON.stringify(f.catalog)+'\n')]),Buffer.alloc(P.diagnosticBytes+1)]){
      const c={archiveRelationInventory:f.inventory};readArchiveCheckCatalog(c,'DATA',wire);
      assert.deepEqual(archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.verbose(),'DATA'),unknown);
    }
    const c={archiveRelationInventory:f.inventory};readArchiveCheckCatalog(c,'DATA',f.wire());
    c.archiveRelationInventory={...f.inventory,digest:'b'.repeat(64)};
    assert.deepEqual(archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.verbose(),'DATA'),unknown);
    assert.deepEqual(publicArchiveCheckDiagnostic({state:'CATALOG_BOUND',...f.entry,measurementPoint:ARCHIVE_CHECK_CATALOG.point,
      rawName:'private-value'}),unknown);
    assert(!Object.hasOwn(safeError({code:'SQLSTATE_23505'},'OWNED_STAGE'),'checkConstraint'));
  });
  test('CHECK diagnostic binds only unique PostgreSQL table-CHECK verbose fields and never free text or injected DETAIL',()=>{
    const f=checkDiagnosticFixture(),c={archiveRelationInventory:f.inventory},unknown={state:'UNAVAILABLE'};
    readArchiveCheckCatalog(c,'DATA',f.wire());const text=f.verbose().toString();
    for(const diagnostic of [text+text,text.replace('23514:','23505:'),text.replace('SCHEMA NAME:  auth\n',''),
      text.replace('fixture_check\nLOCATION:','unbound_check\nLOCATION:'),text.replace('TABLE NAME:  users','TABLE NAME:  Users'),
      text.replace('DETAIL:  ','DETAIL:  \nSCHEMA NAME:  auth\n'),text.replace('ExecConstraints, execMain.c:2041','exec_stmt_raise, pl_exec.c:3905'),
      text+'private trailing text\n',text.replace('TABLE NAME:  users\nCONSTRAINT NAME:  fixture_check','CONSTRAINT NAME:  fixture_check\nTABLE NAME:  users'),
      'psql:<stdin>:7: ERROR:  23514: new row for relation "users" violates check constraint "fixture_check"\n'])
      assert.deepEqual(archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',Buffer.from(diagnostic),'DATA'),unknown);
    assert.deepEqual(archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_HISTORY',f.verbose(),'HISTORY'),unknown);
    assert.deepEqual(archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.verbose(),'SCHEMA'),unknown);
    const output=safeError({code:'SQLSTATE_23514',exit:3,inputOwner:'DATA',
      checkConstraint:archiveCheckDiagnostic(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',f.verbose(),'DATA')},'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA');
    assert.equal(output.code,'SQLSTATE_23514');assert.equal(output.inputOwner,'DATA');assert.equal(output.checkConstraint.state,'CATALOG_BOUND');
    for(const privateValue of ['fixture_check','users','private primary message','private-row-never-report','ExecConstraints'])
      assert(!JSON.stringify(output).includes(privateValue));
  });
  test('normal archive command preserves first SQLSTATE23514 and owned closure with a bound or unavailable CHECK diagnostic',async()=>{
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});c.archive=true;c.processes=[];c.home=c.root;
      c.archiveRelationInventory=await collectArchiveRelationInventory(c,archive);const f=checkDiagnosticFixture(c.archiveRelationInventory);
      const inputLines={next:1,ranges:new Map()},chunks=[];
      for await(const chunk of materializedRestoreBytes(c,archive,false,inputLines))chunks.push(chunk);
      const diagnostic=f.verbose(inputLines.ranges.get('DATA').first+1).toString();
      for(const [catalog,state]of [[f.catalog,'CATALOG_BOUND'],[undefined,'UNAVAILABLE'],[null,'UNAVAILABLE'],[{...f.catalog,complete:false},'UNAVAILABLE']]){
        c.archiveRelationReports=new Map();
        const child=['-e','process.stdin.resume();process.stdin.on("end",()=>{process.stdout.write('+JSON.stringify(catalog===undefined?'':f.wire(catalog).toString())
          +');process.stderr.write('+JSON.stringify(diagnostic)+',()=>process.exit(3));});'];
        const input=(async function*(){for(const chunk of chunks)yield chunk;})();
        await assert.rejects(command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,child,
          {input,archivePsql:true,inputLines,maxMs:10_000}),error=>{
          assert.equal(error.code,'SQLSTATE_23514');assert.equal(error.exit,3);assert.equal(error.inputOwner,'DATA');
          const firstFailure=safeError(error,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA');assert.equal(firstFailure.checkConstraint.state,state);
          const report=restorePublicReport(c,null,firstFailure,true);
          assert.equal(report.status,'FAILED_CLOSED');assert.equal(report.ownedDockerClosed,true);assert.notEqual(report.fullDatabaseBackupVerified,true);
          assert(!JSON.stringify(report).includes('private-row-never-report')&&!JSON.stringify(report).includes('fixture_check'));return true;
        });
      }
      assert(c.processes.every(p=>p.processGroupClosed));
    },{fileSql:{'data.sql':'COPY "auth"."users" ("id") FROM stdin;\nprivate-row-never-report\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\n','history-data.sql':'-- empty history\n'}});
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
    assert.equal(workflow.split('inputs.archive_index_commitment').length,4);
    assert(workflow.includes('^rr-supabase-restore-v1:[a-f0-9]{64}$'));
    assert.match(workflow,/default: synthetic[\s\S]*options: \[synthetic, archive, archive-inventory\]/);
    assert(workflow.indexOf('group: ${{ (inputs.restore_mode')<workflow.indexOf('ravradar-trip-storage-production'));
    assert(workflow.indexOf('Refuse missing exact source proof')<workflow.indexOf('SUPABASE_SERVICE_ROLE_KEY:'));
    const archiveStep=workflow.split('name: Materialize the exact authenticated archive and restore only to owned local PostgreSQL')[1].split('\n      - name:')[0];
    assert(archiveStep);assert.match(archiveStep,/if: inputs.restore_mode == 'archive'/);
    assert(!/SUPABASE_DB_PASSWORD|SUPABASE_ACCESS_TOKEN|CLOUDFLARE_API_TOKEN|GITHUB_TOKEN|upload-artifact|continue-on-error/.test(archiveStep));
    assert.match(archiveStep,/--run-archive-restore/);assert.match(workflow,/if: inputs.restore_mode == 'synthetic'[\s\S]*--run-local-fixture/);
  });
  test('archive parity emits COPY-preserving PostgreSQL content duplicate and sequence checks',async()=>{
    const payload='--row-is-data\t9007199254740993.123456789\nsame\t1\nsame\t1\n'+('æ'.repeat(ARCHIVE_SQL.chunkBytes))+'\t2\n';
    const data="SET client_encoding = 'UTF8';\nSELECT pg_catalog.set_config('search_path', '', false);\n"
      +'COPY "public"."probe" ("label", "amount") FROM stdin;\n'+payload+'\\.\n'
      +'COPY "auth"."users" ("id", "encrypted_password") FROM stdin;\nsynthetic-id\tsynthetic-hash\n\\.\n'
      +'COPY "auth"."identities" ("id") FROM stdin;\n\\.\n'
      +`SELECT pg_catalog.setval('"public"."probe_id_seq"', 7, true);\nRESET ALL;\n`;
    const history='COPY "supabase_migrations"."schema_migrations" ("version") FROM stdin;\n20200101\n\\.\n';
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize}),summary={},chunks=[];
      for await(const chunk of archiveParitySql(c,archive,summary))chunks.push(chunk);
      const sql=Buffer.concat(chunks).toString('utf8');
      assert.deepEqual(summary,{tableCount:4,rowCount:6,sequenceCount:1});assert(sql.includes(payload));
      assert.equal((sql.match(/EXCEPT ALL/g)??[]).length,8);assert.equal((sql.match(/COLLATE "C"/g)??[]).length,16);
      assert(sql.includes('FROM ONLY "public"."probe"'));assert(sql.includes('SELECT last_value::text,is_called'));
      assert(!sql.includes('pg_catalog.setval('));assert(!sql.includes('COPY "public"'));
      assert(sql.includes("'scope','AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES'"));
      await fs.writeFile(path.join(archive.directory,'data.sql'),Buffer.from(data.replace('same\t1','same\t3')));
      await assert.rejects(async()=>{for await(const _chunk of archiveParitySql(c,archive,{})){};},e=>e.code==='ARCHIVE_SQL_SHA');
    },{fileSql:{'data.sql':data,'history-data.sql':history}});
    for(const data of [
      'COPY "public"."probe" ("v") FROM stdin;\nrow\n',
      'INSERT INTO public.probe VALUES (1);\n',
      'COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."users" ("id") FROM stdin;\n\\.\n',
      `SELECT pg_catalog.setval('unsafe;select private', 1, true);\n`,
    ])await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      await assert.rejects(async()=>{for await(const _chunk of archiveParitySql(c,archive,{})){};},e=>/^ARCHIVE_PARITY_/.test(e.code));
    },{fileSql:{'data.sql':data,'history-data.sql':'-- empty history\n'}});
  });
  test('archive relation preflight: full COPY/setval inventory and valid same-transaction primary/history reports',async()=>{
    const data="\\restrict fixtureToken\nSET statement_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\n"
      +'COPY "storage"."migrations" ("id") FROM stdin;\nprivate-row-never-report'+('æ'.repeat(ARCHIVE_SQL.chunkBytes))+'\n\\.\n'
      +'COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\n'
      +`SELECT pg_catalog.setval('"public"."probe_id_seq"', 7, true);\n\\unrestrict fixtureToken\n`;
    const history='COPY "supabase_migrations"."schema_migrations" ("version") FROM stdin;\nprivate-history-row\n\\.\n';
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});c.archive=true;c.processes=[];
      c.archiveRelationInventory=await collectArchiveRelationInventory(c,archive);const inventory=c.archiveRelationInventory;
      assert.equal(inventory.relations.length,5);assert.equal(inventory.complete,true);
      assert.equal(inventory.relations.filter(r=>r.kind==='SEQUENCE').length,1);
      c.home=path.join(c.root,'home');await fs.mkdir(c.home,{mode:0o700});
      for(const [phase,stage,historyPhase]of [['DATA','RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',false],['HISTORY_DATA','RESTORE_ARCHIVE_HISTORY',true]]){
        const rows=inventory.relations.filter(r=>r.phase===phase),query=archiveRelationPreflightSql(inventory,phase).toString();
        assert(query.includes('pg_catalog.to_regclass(e.qualified)'));assert(query.includes('\\gset\n'));
        assert(!query.includes('private-row')&&!query.includes('private-history-row'));
        const streamed=[];for await(const part of materializedRestoreBytes(c,archive,historyPhase))streamed.push(part);
        const original=await fs.readFile(path.join(archive.directory,historyPhase?'history-data.sql':'data.sql'));
        const wire=Buffer.concat(streamed);assert(wire.indexOf(query)<wire.indexOf(original));assert(wire.includes(original));
        const report={kind:'ARCHIVE_RELATION_PREFLIGHT_V1',phase,inventorySha256:inventory.digest,completeParse:true,
          copyTargets:rows.filter(r=>r.kind==='COPY').length,sequenceTargets:rows.filter(r=>r.kind==='SEQUENCE').length,
          missingCount:0,wrongKindCount:0,missingBySchema:{},wrongKindBySchema:{},missingFixedRelations:[],wrongKindFixedRelations:[]};
        const child=['-e','process.stdin.resume();process.stdin.on("end",()=>process.stdout.write('+JSON.stringify(JSON.stringify(report)+'\n')+'));'];
        await command(c,stage,process.execPath,child,{input:materializedRestoreBytes(c,archive,historyPhase),archivePsql:true,maxMs:10_000});
      }
      assert.equal(c.archiveRelationReports.size,2);
      assert.equal(restorePublicReport(c,null,{code:'LATER_FAILURE'},true).archiveRelationPreflight.inventoryComplete,true);
    },{fileSql:{'data.sql':data,'history-data.sql':history}});
  });
  test('archive relation preflight: missing Storage plus another family is one fixed failure with no row or arbitrary identifier output',async()=>{
    const data='COPY "storage"."migrations" ("id") FROM stdin;\nprivate-row\n\\.\n'
      +'COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\n';
    await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});c.archive=true;c.processes=[];
      c.archiveRelationInventory=await collectArchiveRelationInventory(c,archive);c.home=path.join(c.root,'home');await fs.mkdir(c.home,{mode:0o700});
      const report={kind:'ARCHIVE_RELATION_PREFLIGHT_V1',phase:'DATA',inventorySha256:c.archiveRelationInventory.digest,completeParse:true,
        copyTargets:3,sequenceTargets:0,missingCount:2,wrongKindCount:0,missingBySchema:{STORAGE:1,AUTH:1},wrongKindBySchema:{},
        missingFixedRelations:['AUTH_IDENTITIES','STORAGE_MIGRATIONS'],wrongKindFixedRelations:[]};
      const child=['-e','process.stdin.resume();process.stdin.on("end",()=>{process.stdout.write('+JSON.stringify(JSON.stringify(report)+'\n')+');process.stderr.write("psql:<stdin>:7: ERROR: P0001\\n",()=>process.exit(3));});'];
      await assert.rejects(()=>command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,child,
        {input:materializedRestoreBytes(c,archive),archivePsql:true,maxMs:10_000}),e=>{
        assert.equal(e.code,'ARCHIVE_RELATION_PREFLIGHT_MISSING');assert.equal(e.inputOwner,'RELATION_PREFLIGHT');
        const publicReport=restorePublicReport(c,null,safeError(e,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA'),true);
        assert.equal(publicReport.status,'FAILED_CLOSED');assert.equal(publicReport.archiveRelationPreflight.reports[0].missingCount,2);
        assert.deepEqual(publicReport.archiveRelationPreflight.reports[0].missingFixedRelations,['AUTH_IDENTITIES','STORAGE_MIGRATIONS']);
        assert(!JSON.stringify(publicReport).includes('private-row'));return true;
      });
      for(const edit of [r=>{r.completeParse=false;},r=>{r.missingFixedRelations=['free-private-name'];},r=>{r.missingBySchema={RAW_PRIVATE:2};},
        r=>{r.missingCount=1;},r=>{r.inventorySha256='b'.repeat(64);},r=>{r.extra='private-value';}]){
        const changed=structuredClone(report);edit(changed);const trial={archiveRelationInventory:c.archiveRelationInventory};
        assert.throws(()=>readArchiveRelationPreflight(trial,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',Buffer.from(JSON.stringify(changed)),3),
          e=>/^ARCHIVE_RELATION_/.test(e.code));assert.equal(trial.archiveRelationReports,undefined);
      }
      assert.throws(()=>readArchiveRelationPreflight({archiveRelationInventory:c.archiveRelationInventory},
        'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',Buffer.alloc(0),0),e=>e.code==='ARCHIVE_RELATION_REPORT_MISSING');
      const wrong={...report,missingCount:0,missingBySchema:{},missingFixedRelations:[],wrongKindCount:1,
        wrongKindBySchema:{STORAGE:1},wrongKindFixedRelations:['STORAGE_MIGRATIONS']};
      delete c.archiveRelationReports;
      const wrongChild=['-e','process.stdin.resume();process.stdin.on("end",()=>{process.stdout.write('+JSON.stringify(JSON.stringify(wrong)+'\n')+');process.stderr.write("psql:<stdin>:7: ERROR: P0001\\n",()=>process.exit(3));});'];
      await assert.rejects(()=>command(c,'RESTORE_ARCHIVE_ROLES_SCHEMA_DATA',process.execPath,wrongChild,
        {input:materializedRestoreBytes(c,archive),archivePsql:true,maxMs:10_000}),e=>e.code==='ARCHIVE_RELATION_PREFLIGHT_MISSING');
      assert.equal(c.archiveRelationReports.get('DATA').wrongKindCount,1);
    },{fileSql:{'data.sql':data,'history-data.sql':'-- empty history\n'}});
  });
  test('archive relation preflight: unsupported unsafe incomplete and over-bound inputs never yield a complete inventory',async()=>{
    const auth='COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\n';
    for(const extra of ['SET statement_timeout = 0; COPY "private"."hidden" ("id") FROM stdin;\n',
      'SET standard_conforming_strings = off;\n','INSERT INTO public.private VALUES (1);\n',
      'COPY "private"."hidden" FROM PROGRAM \'private-command\';\n','COPY "private"."hidden" ("id") FROM stdin;\nunterminated\n',
      `SELECT pg_catalog.setval('unsafe; SELECT private', 1, true);\n`,
      'COPY "public"."'+('x'.repeat(64))+'" ("id") FROM stdin;\n\\.\n',
      '\\restrict a\n\\unrestrict b\n',
      Array.from({length:4097},(_,i)=>'COPY "public"."t'+i+'" ("id") FROM stdin;\n\\.\n').join('')])
      await ownArchive(async({c,env,index,materialize})=>{
        const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
        await assert.rejects(()=>collectArchiveRelationInventory(c,archive),e=>/^ARCHIVE_RELATION_|^ARCHIVE_PARITY_/.test(e.code));
        assert.equal(c.archiveRelationInventory,undefined);assert.equal(c.archiveRelationReports,undefined);
      },{fileSql:{'data.sql':auth+extra,'history-data.sql':'-- empty history\n'}});
    for(const invalid of [Buffer.from([0]),Buffer.from([0xc3])])await ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize}),bytes=Buffer.concat([Buffer.from(auth),invalid]);
      const file=path.join(archive.directory,'data.sql');await fs.writeFile(file,bytes);
      Object.assign(archive.files.find(f=>f.file==='data.sql'),{bytes:bytes.length,sha256:sha(bytes)});
      await assert.rejects(()=>collectArchiveRelationInventory(c,archive),e=>/^ARCHIVE_RELATION_/.test(e.code));
      assert.equal(c.archiveRelationInventory,undefined);
    },{fileSql:{'data.sql':auth,'history-data.sql':'-- empty history\n'}});
  });
  test('synthetic relation preflight normal caller: protocol stubs preserve builder stream reader and rollback guards',async()=>{
    const data='COPY "public"."rr_restore_probe" ("id") FROM stdin;\n\\.\n'
      +'COPY "auth"."users" ("id") FROM stdin;\n\\.\nCOPY "auth"."identities" ("id") FROM stdin;\n\\.\n'
      +`SELECT pg_catalog.setval('"public"."rr_restore_probe_id_seq"', 7, true);\n`;
    const trial=async advanceSequence=>ownArchive(async({c,env,index,materialize})=>{
      const archive=await materializeArchiveInputs(c,index,{env,archive:materialize});
      c.archive=false;c.processes=[];c.home=path.join(c.root,'home');await fs.mkdir(c.home,{mode:0o700});
      const calls=[];let snapshots=0;
      const run=async(context,project,stage,input)=>{
        assert.equal(context,c);assert.equal(project.side,'B');
        let body,negative=false;
        if(stage==='SYNTHETIC_RELATION_CANARY_SNAPSHOT'){
          snapshots++;body={beforeRows:0,afterRows:0,sequenceValue:advanceSequence&&snapshots>1?'8':'7',isCalled:true};
        }else{
          assert(['RESTORE_ARCHIVE_ROLES_SCHEMA_DATA','RESTORE_ARCHIVE_HISTORY'].includes(stage));
          const phase=stage==='RESTORE_ARCHIVE_HISTORY'?'HISTORY_DATA':'DATA',inventory=context.archiveRelationInventory;
          const rows=inventory.relations.filter(r=>r.phase===phase);
          const missing=rows.some(r=>r.qualified==='"public"."rr_preflight_missing_relation"');
          const wrong=rows.some(r=>r.kind==='COPY'&&r.qualified==='"public"."rr_restore_probe_id_seq"');
          negative=missing||wrong;
          body={kind:'ARCHIVE_RELATION_PREFLIGHT_V1',phase,inventorySha256:inventory.digest,completeParse:true,
            copyTargets:rows.filter(r=>r.kind==='COPY').length,sequenceTargets:rows.filter(r=>r.kind==='SEQUENCE').length,
            missingCount:missing?1:0,wrongKindCount:wrong?1:0,missingBySchema:missing?{PUBLIC:1}:{},wrongKindBySchema:wrong?{PUBLIC:1}:{},
            missingFixedRelations:[],wrongKindFixedRelations:[]};
        }
        const chunks=[];
        const wire=Buffer.isBuffer(input)?input:(async function*(){for await(const chunk of input){chunks.push(Buffer.from(chunk));yield chunk;}})();
        const program='process.stdin.resume();process.stdin.on("end",()=>{process.stdout.write('+JSON.stringify(JSON.stringify(body)+'\n')+');'
          +(negative?'process.stderr.write("psql:<stdin>:10: ERROR: P0001\\n",()=>process.exit(3));':'')+'});';
        try{return await command(context,stage,process.execPath,['-e',program],{input:wire,archivePsql:!Buffer.isBuffer(input),maxMs:10_000});}
        finally{
          const bytes=Buffer.isBuffer(input)?input:Buffer.concat(chunks),sql=bytes.toString('utf8');
          if(stage!=='SYNTHETIC_RELATION_CANARY_SNAPSHOT'){
            assert(sql.includes('pg_catalog.to_regclass(e.qualified)'));assert(sql.includes('\\gset\n'));assert(sql.includes('\\if :rr_archive_relation_ok\n'));
            if(negative){assert(sql.indexOf('rr_preflight_before')<sql.indexOf('WITH required'));
              assert(sql.indexOf('\\endif\n')<sql.indexOf("SELECT nextval('public.rr_restore_probe_id_seq')"));assert(sql.includes('rr_preflight_after'));}
          }
          calls.push({stage,negative});
        }
      };
      const result=await verifySyntheticRelationPreflight(c,{side:'B'},archive,run);
      assert.equal(result.status,'PASS');assert.equal(result.checks,4);assert.equal(result.dataTailNotExecuted,true);
      assert.equal(calls.length,7);assert.equal(calls.filter(row=>row.negative).length,2);assert.equal(snapshots,3);
      assert.equal(c.archiveRelationInventory,undefined);assert.equal(c.archiveRelationReports,undefined);
    },{fileSql:{'data.sql':data,'history-data.sql':'-- empty synthetic history\n'}});
    await trial(false);
    await assert.rejects(()=>trial(true),e=>e.code==='ERR_ASSERTION','A nontransactional DATA witness advance must fail the same normal caller');
    const source=await fs.readFile(fileURLToPath(import.meta.url),'utf8');
    const caller=source.slice(source.indexOf('async function fixture('),source.indexOf('\nasync function selfTest('));
    assert(caller.includes('const relationPreflight=await verifySyntheticRelationPreflight(c,b,parityArchive);'));
    assert(caller.includes('syntheticRelationPreflight:relationPreflight,'));
  });
  test('archive Auth endpoint uses only the healthy owned Kong on the internal bridge',()=>{
    const id='a'.repeat(64),net='b'.repeat(64),endpoint='c'.repeat(64),c={owner:'123-1',archive:true};
    const p={side:'B',id:'rr_restore_123_1_b',network:'rr-restore-123-1-b',networkId:net,kong:id};
    const info={Id:id,Name:'/supabase_kong_'+p.id,Config:{Labels:{'com.supabase.cli.project':p.id}},
      NetworkSettings:{Networks:{[p.network]:{NetworkID:net,IPAddress:'172.23.0.3',IPPrefixLen:16,EndpointID:endpoint}},Ports:{'8000/tcp':null}},
      State:{Running:true,Health:{Status:'healthy'}}};
    const network={Name:p.network,Id:net,Internal:true,Driver:'bridge',Scope:'local',Labels:{'ravradar.synthetic.restore.owner':c.owner},
      IPAM:{Config:[{Subnet:'172.23.0.0/16'}]},Containers:{[id]:{Name:info.Name.slice(1),IPv4Address:'172.23.0.3/16',EndpointID:endpoint}}};
    assert.deepEqual(archiveServiceEndpoint(info,network,c,p,'kong'),{address:'172.23.0.3',identity:id+':'+endpoint});
    for(const edit of [(i,n)=>{i.State.Health.Status='starting';},(i,n)=>{i.NetworkSettings.Ports['8000/tcp']=[{HostIp:'127.0.0.1',HostPort:'54321'}];},
      (i,n)=>{n.Internal=false;},(i,n)=>{i.NetworkSettings.Networks[p.network].IPAddress='127.0.0.1';},
      (i,n)=>{n.Containers[id].EndpointID='d'.repeat(64);}]){
      const i=structuredClone(info),n=structuredClone(network);edit(i,n);assert.throws(()=>archiveServiceEndpoint(i,n,c,p,'kong'));
    }
  });
  test('strong archive flag requires content proof Auth function and final owned Docker closure',()=>{
    const c={archive:true},ready={status:'PASS',scope:'authenticated-archive-isolated-sql-restore',authenticatedFiveFileSqlExecuted:true,
      exactSqlBytesStreamed:true,authRestoreVerified:true,sourceDataParityVerified:true,fullDatabaseBackupVerified:false,
      archiveDataParity:{status:'PASS',scope:'AUTHENTICATED_ARCHIVE_CONTENT_AND_DUPLICATES',digest:'a'.repeat(64)}};
    assert.equal(restorePublicReport(c,ready,null,true).fullDatabaseBackupVerified,true);
    assert.equal(restorePublicReport(c,ready,null,false).fullDatabaseBackupVerified,false);
    assert.equal(restorePublicReport(c,ready,null,false).sourceDataParityVerified,false);
    assert.equal(restorePublicReport(c,ready,null,false).authRestoreVerified,false);
    assert.equal(restorePublicReport(c,ready,{code:'CLEANUP_FAILED'},true).fullDatabaseBackupVerified,false);
    for(const field of ['authenticatedFiveFileSqlExecuted','exactSqlBytesStreamed','authRestoreVerified','sourceDataParityVerified'])
      assert.equal(restorePublicReport(c,{...ready,[field]:false},null,true).fullDatabaseBackupVerified,false);
    assert.equal(restorePublicReport(c,{...ready,archiveDataParity:{status:'PASS'}},null,true).fullDatabaseBackupVerified,false);
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
  else if(process.argv[2]==='--run-archive-inventory')await fixture({archive:true,inventoryOnly:true}).catch(e=>{
    console.log(JSON.stringify({status:'FAILED_CLOSED',scope:'authenticated-archive-relation-inventory-only',
      firstFailure:safeError(e,'PREFLIGHT'),rawNamesIncluded:false,columnsIncluded:false,rowsIncluded:false,sqlIncluded:false,
      dockerInvoked:false,sqlExecuted:false,databaseRestoreExecuted:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,freeReady:false}));process.exitCode=1;
  });
  else if(process.argv[2]==='--run-archive-restore')await fixture({archive:true}).catch(e=>{
    console.log(JSON.stringify({status:'FAILED_CLOSED',scope:'authenticated-archive-isolated-sql-restore',
      firstFailure:safeError(e,'PREFLIGHT'),productionBackupVerified:false,freeReady:false}));process.exitCode=1;
  });
  else need(false,'UNKNOWN_MODE');
}
