import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

export const SUPABASE_DB_EXPORT_POLICY=Object.freeze({
  project:'afqhhdrkjfjtpadntdzo',cliVersion:'2.117.0',
  maximumFileBytes:1_000_000_000,maximumTotalBytes:2_000_000_000,
  maximumOperationMs:20*60_000,maximumChildMs:10*60_000,
  maximumDiagnosticBytes:1024*1024,termGraceMs:2000,killGraceMs:3000,
});
const P=SUPABASE_DB_EXPORT_POLICY;
const FILES=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const STAGES=['VERSION','LINK','ROLES','SCHEMA','DATA','HISTORY_SCHEMA','HISTORY_DATA'];
const failure=(reason,stage='PREFLIGHT',group=true)=>Object.assign(new Error('SUPABASE_DB_EXPORT_FAILED'),{
  code:'SUPABASE_DB_EXPORT_FAILED',reason,stage,processGroupTerminated:group,
  externalDumpOutcome:stage==='PREFLIGHT'||stage==='VERSION'||stage==='LINK'?'NOT_STARTED':'UNKNOWN',
});
const need=(value,reason)=>{if(!value)throw failure(reason);};
const identity=s=>({dev:String(s.dev),ino:String(s.ino)});
const sameId=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
const snapshot=s=>({...identity(s),bytes:Number(s.size),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs)});
const sameSnapshot=(a,b)=>sameId(a,b)&&a.bytes===b.bytes&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
const inside=(root,value)=>{const rel=path.relative(root,value);return rel!==''&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep);};
async function directories(value){
  need(typeof value==='string'&&path.isAbsolute(value),'RUNNER_TEMP_REQUIRED');
  for(let at=path.resolve(value);;at=path.dirname(at)){
    const s=await fs.lstat(at,{bigint:true});need(s.isDirectory()&&!s.isSymbolicLink(),'DIRECTORY_LINK_OR_TYPE');
    const git=await fs.lstat(path.join(at,'.git')).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
    need(!git,'DIRECTORY_INSIDE_REPOSITORY');if(at===path.dirname(at))break;
  }
}
function checkFile(s){
  need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n,'OUTPUT_FILE_TYPE_OR_LINK');
  // Normal execution is Linux-only. Windows synthetic tests still use real file identities.
  if(process.platform==='linux')need((s.mode&0o077n)===0n&&s.uid===BigInt(process.getuid()),'OUTPUT_FILE_PRIVACY');
}
async function boundedCli(stage,args,c,timeoutMs,captureVersion=false){
  let child,firstError,closed=false,spawnFailed=false,stopped=false,code,signal,stdoutBytes=0,stderrBytes=0;
  const output=[],started=c.now();
  const fail=reason=>{firstError??=failure(reason,stage,false);};
  const interrupted=()=>fail('INTERRUPTED');
  try{
    try{
      const previous=process.umask(0o077);
      try{child=c.spawnImpl('supabase',args,{cwd:c.workspace,env:c.childEnv,shell:false,windowsHide:true,
        detached:true,stdio:['ignore','pipe','pipe']});}finally{process.umask(previous);}
    }catch{throw failure('SPAWN_FAILED',stage,true);}
    child.on('error',()=>{spawnFailed=true;fail('SPAWN_FAILED');});
    child.on('exit',(value,why)=>{code=value;signal=why;if(value!==0||why!==null)fail('CHILD_EXIT');});
    child.on('close',()=>{closed=true;});
    child.stdout.on('data',b=>{stdoutBytes+=b.length;if(stdoutBytes>P.maximumDiagnosticBytes||(captureVersion&&stdoutBytes>128))fail('STDOUT_BOUND');else if(captureVersion)output.push(Buffer.from(b));});
    child.stderr.on('data',b=>{stderrBytes+=b.length;if(stderrBytes>P.maximumDiagnosticBytes)fail('STDERR_BOUND');});
    child.stdout.on('error',()=>fail('STDOUT_TRANSPORT'));child.stderr.on('error',()=>fail('STDERR_TRANSPORT'));
    c.processImpl.on('SIGINT',interrupted);c.processImpl.on('SIGTERM',interrupted);
    const validPid=Number.isSafeInteger(child.pid)&&child.pid>0;
    const groupGone=()=>{if(!validPid)return spawnFailed;try{c.killImpl(-child.pid,0);return false;}catch(e){return e?.code==='ESRCH';}};
    const confirmed=()=>closed&&groupGone();
    const send=why=>{if(validPid)try{c.killImpl(-child.pid,why);}catch{/* A signal request is not a termination receipt. */}};
    while(!closed&&!firstError){
      try{await c.audit();}catch(e){fail(e.code==='SUPABASE_DB_EXPORT_FAILED'?e.reason:'OUTPUT_CHECK_FAILED');}
      if(c.now()-started>=timeoutMs||c.now()-c.started>=P.maximumOperationMs)fail('TIMEOUT');
      if(!firstError)await c.delay(Math.min(20,Math.max(1,timeoutMs-(c.now()-started))));
    }
    if(!firstError&&(code!==0||signal!==null))fail('CHILD_EXIT');
    stopped=confirmed();
    if(!stopped){
      fail(closed?'DESCENDANTS_REMAIN':'TERMINATION_UNCONFIRMED');
      if(!groupGone())send('SIGTERM');let end=c.now()+P.termGraceMs;
      while(!(stopped=confirmed())&&c.now()<end)await c.delay(Math.min(20,end-c.now()));
      if(!stopped){if(!groupGone())send('SIGKILL');end=c.now()+P.killGraceMs;
        while(!(stopped=confirmed())&&c.now()<end)await c.delay(Math.min(20,end-c.now()));}
    }
    c.processes.push({stage,exitCode:Number.isInteger(code)?code:null,stdoutBytes,stderrBytes,processGroupTerminated:stopped});
    if(firstError){firstError.processGroupTerminated=stopped;throw firstError;}
    return captureVersion?Buffer.concat(output).toString('utf8'):null;
  }finally{
    c.processImpl.removeListener('SIGINT',interrupted);c.processImpl.removeListener('SIGTERM',interrupted);
    if(child&&!stopped){child.stdout?.destroy();child.stderr?.destroy();child.unref();}
  }
}
async function fingerprint(file,c){
  await c.audit();const named=await fs.lstat(file,{bigint:true});checkFile(named);
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const before=await handle.stat({bigint:true});checkFile(before);need(sameId(identity(named),identity(before)),'OUTPUT_OPEN_IDENTITY');
    const hash=crypto.createHash('sha256'),buffer=Buffer.alloc(64*1024);let position=0;
    for(;;){need(c.now()-c.started<P.maximumOperationMs,'OPERATION_DEADLINE');
      const {bytesRead}=await handle.read(buffer,0,buffer.length,position);if(!bytesRead)break;
      position+=bytesRead;need(position<=c.fileByteLimit,'OUTPUT_FILE_BOUND');hash.update(buffer.subarray(0,bytesRead));}
    const after=await handle.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});checkFile(after);checkFile(fresh);
    need(position===Number(before.size)&&sameSnapshot(snapshot(before),snapshot(after))&&sameSnapshot(snapshot(after),snapshot(fresh)),'OUTPUT_CHANGED_DURING_HASH');
    need(position>0,'OUTPUT_EMPTY');return{file:path.basename(file),...snapshot(after),sha256:hash.digest('hex')};
  }finally{await handle.close();}
}
export async function exportSupabaseDatabase({fileByteLimit=P.maximumFileBytes,totalByteLimit=P.maximumTotalBytes}={},
  {env=process.env,spawnImpl=spawn,killImpl=process.kill.bind(process),processImpl=process,now=()=>performance.now(),delay=sleep}={}){
  need(processImpl.platform==='linux'&&Number(process.versions.node.split('.')[0])>=24,'LINUX_NODE24_REQUIRED');
  need(typeof env.SUPABASE_ACCESS_TOKEN==='string'&&env.SUPABASE_ACCESS_TOKEN.length>0
    &&typeof env.SUPABASE_DB_PASSWORD==='string'&&env.SUPABASE_DB_PASSWORD.length>0,'EXISTING_CREDENTIALS_REQUIRED');
  need(typeof env.PATH==='string'&&env.PATH.length>0,'CLI_PATH_REQUIRED');
  need(Number.isSafeInteger(fileByteLimit)&&fileByteLimit>0&&fileByteLimit<=P.maximumFileBytes
    &&Number.isSafeInteger(totalByteLimit)&&totalByteLimit>0&&totalByteLimit<=P.maximumTotalBytes,'BYTE_LIMITS');
  await directories(env.RUNNER_TEMP);const temp=await fs.realpath(env.RUNNER_TEMP);
  const root=await fs.mkdtemp(path.join(temp,'ravradar-db-export-'));need(inside(temp,root),'OWNED_ROOT');
  await fs.chmod(root,0o700);await directories(root);const rootId=identity(await fs.lstat(root,{bigint:true}));
  const workspace=path.join(root,'workspace'),out=path.join(root,'exports'),home=path.join(root,'home'),tmp=path.join(root,'tmp');
  for(const dir of [workspace,out,home,tmp,path.join(workspace,'supabase')])await fs.mkdir(dir,{mode:0o700});
  await fs.writeFile(path.join(workspace,'supabase','config.toml'),'project_id = "ravradar-db-backup"\n',{flag:'wx',mode:0o600});
  const owned=[root,workspace,out,home,tmp,path.join(workspace,'supabase')],ownedIds=new Map();
  for(const dir of owned)ownedIds.set(dir,identity(await fs.lstat(dir,{bigint:true})));
  const seen=new Map(),finished=new Map(),processes=[];
  const c={workspace,root,out,fileByteLimit,totalByteLimit,spawnImpl,killImpl,processImpl,now,delay,processes,started:now(),
    childEnv:{PATH:env.PATH,HOME:home,XDG_CONFIG_HOME:path.join(home,'.config'),TMPDIR:tmp,CI:'true',NO_COLOR:'1',
      SUPABASE_ACCESS_TOKEN:env.SUPABASE_ACCESS_TOKEN,SUPABASE_DB_PASSWORD:env.SUPABASE_DB_PASSWORD}};
  c.audit=async()=>{
    for(const dir of owned){await directories(dir);const stat=await fs.lstat(dir,{bigint:true});
      need(sameId(ownedIds.get(dir),identity(stat)),'OWNED_DIRECTORY_CHANGED');
      if(process.platform==='linux')need((stat.mode&0o077n)===0n&&stat.uid===BigInt(process.getuid()),'OWNED_DIRECTORY_PRIVACY');}
    const names=await fs.readdir(out);need(names.every(n=>FILES.includes(n)),'UNEXPECTED_OUTPUT');let total=0;
    for(const name of names){const s=await fs.lstat(path.join(out,name),{bigint:true});checkFile(s);const snap=snapshot(s);
      need(s.size<=BigInt(fileByteLimit),'OUTPUT_FILE_BOUND');total+=Number(s.size);need(total<=totalByteLimit,'OUTPUT_TOTAL_BOUND');
      if(seen.has(name))need(sameId(seen.get(name),snap),'OUTPUT_IDENTITY_CHANGED');else seen.set(name,snap);
      if(finished.has(name))need(sameSnapshot(finished.get(name),snap),'COMPLETED_OUTPUT_CHANGED');
    }
    need([...finished.keys()].every(n=>names.includes(n)),'COMPLETED_OUTPUT_MISSING');
  };
  const startedAt=new Date().toISOString();let stage='VERSION';
  try{
    const version=await boundedCli(stage,['--version'],c,10_000,true);need(version.trim()===P.cliVersion,'CLI_VERSION');
    stage='LINK';await boundedCli(stage,['link','--project-ref',P.project],c,60_000);
    const exports=[['ROLES','roles.sql',['--role-only']],['SCHEMA','schema.sql',[]],['DATA','data.sql',['--data-only','--use-copy']],
      ['HISTORY_SCHEMA','history-schema.sql',['--schema','supabase_migrations']],['HISTORY_DATA','history-data.sql',['--schema','supabase_migrations','--data-only','--use-copy']]];
    const files=[];
    for(const [label,name,flags] of exports){
      stage=label;const file=path.join(out,name);need(!(await fs.lstat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;})),'OUTPUT_ALREADY_EXISTS');
      const remaining=P.maximumOperationMs-(now()-c.started);need(remaining>0,'OPERATION_DEADLINE');
      await boundedCli(stage,['db','dump','--linked',...flags,'--file',file],c,Math.min(P.maximumChildMs,remaining));
      const entry=await fingerprint(file,c);finished.set(name,entry);files.push(entry);
    }
    await c.audit();
    for(const entry of files)need(JSON.stringify(await fingerprint(path.join(out,entry.file),c))===JSON.stringify(entry),'FINAL_OUTPUT_CHANGED');
    const receipt={kind:'SUPABASE_FIVE_FILE_EXPORT_V1',project:P.project,cliVersion:P.cliVersion,startedAt,completedAt:new Date().toISOString(),
      files,totalBytes:files.reduce((n,f)=>n+f.bytes,0),processes,exportPhaseCompleted:true,atomicDatabaseSnapshot:false,
      authRestoreVerified:false,fullDatabaseBackupVerified:false,archiveUploaded:false,freeReady:false,sourceAdmission:false};
    await fs.writeFile(path.join(root,'export-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx',mode:0o600});
    return{status:'FIVE_FILE_EXPORT_COMPLETED_NOT_RESTORE_OR_ARCHIVE_PROOF',workdir:root,receipt:path.join(root,'export-receipt.json'),
      files:files.length,totalBytes:receipt.totalBytes,authRestoreVerified:false,fullDatabaseBackupVerified:false,archiveUploaded:false,freeReady:false};
  }catch(error){
    const safe=error.code==='SUPABASE_DB_EXPORT_FAILED'?error:failure('LOCAL_EXPORT_FAILED',stage);
    safe.stage=stage;safe.workdir=root;
    // A CLI group receipt is NOT a Docker-daemon container termination receipt.
    if(stage!=='VERSION'&&stage!=='LINK')safe.externalDumpOutcome='UNKNOWN';
    const body={status:'FAILED_CLOSED',code:safe.code,reason:safe.reason,stage:safe.stage,processGroupTerminated:safe.processGroupTerminated,
      externalDumpOutcome:safe.externalDumpOutcome,automaticRetry:false,partialFilesPreserved:true,processes};
    try{await directories(root);need(sameId(rootId,identity(await fs.lstat(root,{bigint:true}))),'OWNED_DIRECTORY_CHANGED');
      await fs.writeFile(path.join(root,'failure-receipt.json'),JSON.stringify(body,null,2)+'\n',{flag:'wx',mode:0o600});}catch{/* Never replace the primary failure or write into a changed root. */}
    throw safe;
  }
}
async function main(){
  need(process.argv.length===3&&process.argv[2]==='--export','EXPLICIT_EXPORT_REQUIRED');
  console.log(JSON.stringify(await exportSupabaseDatabase()));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(e=>{console.error(JSON.stringify({status:'FAILED_CLOSED',code:'SUPABASE_DB_EXPORT_FAILED',reason:e.code==='SUPABASE_DB_EXPORT_FAILED'?e.reason:'LOCAL_EXPORT_FAILED',
    stage:STAGES.includes(e.stage)?e.stage:'PREFLIGHT',processGroupTerminated:e.processGroupTerminated===true,externalDumpOutcome:e.externalDumpOutcome||'NOT_STARTED',workdir:e.workdir||null}));process.exitCode=1;});
