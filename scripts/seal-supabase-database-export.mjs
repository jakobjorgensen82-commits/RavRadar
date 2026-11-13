import fs from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createGzip,createGunzip} from 'node:zlib';
import {Readable,Transform,Writable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';
import {exportSupabaseDatabase} from './export-supabase-database.mjs';

export const DB_BACKUP_CIPHER_LIMITS=Object.freeze({partBytes:36_000_000,totalBytes:288_000_000,wireBytes:300_000_000,parts:12});
export const DB_LOCAL_CARRIER_POLICY=Object.freeze({repository:'jakobjorgensen82-commits/RavRadar',project:'afqhhdrkjfjtpadntdzo',
  purpose:'SUPABASE_DATABASE_BACKUP/v1',maximumCipherBytes:50_000_000,maximumSqlBytes:1_000_000_000,
  maximumTotalSqlBytes:2_000_000_000,maximumManifestBytes:32*1024,maximumHeaderBytes:4096,maximumMs:20*60_000});
const P=DB_LOCAL_CARRIER_POLICY,MAGIC=Buffer.from('RR-SUPABASE-DB-EXPORT-1\n');
const NAMES=['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'];
const STAGES=['VERSION','LINK','ROLES','SCHEMA','DATA','HISTORY_SCHEMA','HISTORY_DATA'];
const encode=x=>Buffer.from(JSON.stringify(x),'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fail=code=>{const e=new Error(code);e.code=code;throw e;},need=(v,c)=>{if(!v)fail(c);};
const parse=(b,code)=>{try{return JSON.parse(b.toString('utf8'));}catch{fail(code);}};
const same=(a,b)=>encode(a).equals(encode(b)),positive=n=>Number.isSafeInteger(n)&&n>0,hash=s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s);
const id=s=>({dev:String(s.dev),ino:String(s.ino)}),snap=s=>({...id(s),bytes:Number(s.size),mtimeNs:String(s.mtimeNs),ctimeNs:String(s.ctimeNs)});
const sameFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.bytes===b.bytes&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
function fields(x,names,code){need(x&&typeof x==='object'&&!Array.isArray(x)&&same(Object.keys(x).sort(),[...names].sort()),code);}
async function privatePath(value,env){
  need(typeof value==='string'&&path.isAbsolute(value)&&typeof env.RUNNER_TEMP==='string'&&path.isAbsolute(env.RUNNER_TEMP),'PRIVATE_TEMP_PATH');
  const root=path.resolve(value),temp=await fs.realpath(env.RUNNER_TEMP),relative=path.relative(temp,root);
  need(relative!==''&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep),'PRIVATE_TEMP_PATH');
  for(let at=root;;at=path.dirname(at)){
    const st=await fs.lstat(at,{bigint:true});need(st.isDirectory()&&!st.isSymbolicLink(),'PRIVATE_DIRECTORY_LINK');
    const git=await fs.lstat(path.join(at,'.git')).catch(e=>{if(e.code==='ENOENT')return null;throw e;});need(!git,'PRIVATE_DIRECTORY_REPOSITORY');
    if(at===path.dirname(at))break;
  }
  if(process.platform==='linux'){const owned=await fs.lstat(root,{bigint:true});need((owned.mode&0o077n)===0n&&owned.uid===BigInt(process.getuid()),'PRIVATE_DIRECTORY_PERMISSIONS');}
  return root;
}
function checkFile(s){need(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n,'PRIVATE_FILE_LINK');
  if(process.platform==='linux')need((s.mode&0o077n)===0n&&s.uid===BigInt(process.getuid()),'PRIVATE_FILE_PERMISSIONS');}
async function readSmall(file,maximum){
  const named=await fs.lstat(file,{bigint:true});checkFile(named);need(named.size>0n&&named.size<=BigInt(maximum),'PRIVATE_FILE_BOUND');
  const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{const before=await h.stat({bigint:true});checkFile(before);need(sameFile(snap(named),snap(before)),'PRIVATE_FILE_IDENTITY');
    const chunks=[],buffer=Buffer.alloc(64*1024);let total=0;
    for(;;){const {bytesRead}=await h.read(buffer,0,buffer.length,null);if(!bytesRead)break;total+=bytesRead;need(total<=maximum,'PRIVATE_FILE_BOUND');chunks.push(Buffer.from(buffer.subarray(0,bytesRead)));}
    const b=Buffer.concat(chunks,total),after=await h.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});checkFile(fresh);
    need(b.length===Number(before.size)&&sameFile(snap(before),snap(after))&&sameFile(snap(after),snap(fresh)),'PRIVATE_FILE_CHANGED');return b;
  }finally{await h.close();}
}
function context(c){
  fields(c,['purpose','project','repository','sourceHead','runId','runAttempt'],'DB_CONTEXT_FIELDS');
  need(c.purpose===P.purpose&&c.project===P.project&&c.repository===P.repository&&/^[0-9a-f]{40}$/.test(c.sourceHead)
    &&typeof c.runId==='string'&&typeof c.runAttempt==='string'&&/^[1-9][0-9]*$/.test(c.runId)&&/^[1-9][0-9]*$/.test(c.runAttempt),'DB_CONTEXT');return c;
}
function fromEnv(env){return context({purpose:P.purpose,project:P.project,repository:env.GITHUB_REPOSITORY,sourceHead:env.GITHUB_SHA,
  runId:env.GITHUB_RUN_ID,runAttempt:env.GITHUB_RUN_ATTEMPT});}
function key(env,salt){const master=env.SUPABASE_SERVICE_ROLE_KEY;need(typeof master==='string'&&master.length>=32,'EXISTING_DB_BACKUP_MASTER_REQUIRED');
  return Buffer.from(crypto.hkdfSync('sha256',Buffer.from(master),salt,Buffer.from(`RavRadar/${P.repository}/${P.purpose}`),32));}
async function writeAll(handle,b){for(let offset=0;offset<b.length;){const r=await handle.write(b,offset,b.length-offset,null);need(r.bytesWritten>0,'LOCAL_WRITE');offset+=r.bytesWritten;}}
function checkExport(r){
  fields(r,['kind','project','cliVersion','startedAt','completedAt','files','totalBytes','processes','exportPhaseCompleted','atomicDatabaseSnapshot',
    'authRestoreVerified','fullDatabaseBackupVerified','archiveUploaded','freeReady','sourceAdmission'],'EXPORT_RECEIPT_FIELDS');
  need(r.kind==='SUPABASE_FIVE_FILE_EXPORT_V1'&&r.project===P.project&&r.cliVersion==='2.117.0'&&r.exportPhaseCompleted===true
    &&r.atomicDatabaseSnapshot===false&&r.authRestoreVerified===false&&r.fullDatabaseBackupVerified===false&&r.archiveUploaded===false&&r.freeReady===false&&r.sourceAdmission===false,'EXPORT_RECEIPT');
  need(Number.isFinite(Date.parse(r.startedAt))&&Number.isFinite(Date.parse(r.completedAt))&&Date.parse(r.completedAt)>=Date.parse(r.startedAt),'EXPORT_HORIZON');
  need(Array.isArray(r.files)&&r.files.length===5&&Array.isArray(r.processes)&&r.processes.length===7,'EXPORT_COMPLETE');
  need(r.processes.every((x,i)=>x.stage===STAGES[i]&&x.exitCode===0&&x.processGroupTerminated===true),'EXPORT_PROCESS_OUTCOME');
  let bytes=0;for(let i=0;i<5;i++){const f=r.files[i];need(f.file===NAMES[i]&&positive(f.bytes)&&f.bytes<=P.maximumSqlBytes&&hash(f.sha256)
    &&typeof f.dev==='string'&&typeof f.ino==='string'&&typeof f.mtimeNs==='string'&&typeof f.ctimeNs==='string','EXPORT_FILE');bytes+=f.bytes;}
  need(bytes===r.totalBytes&&bytes<=P.maximumTotalSqlBytes,'EXPORT_TOTAL');return r;
}
async function sealFile(source,destination,entry,c,env,deadline,remainingCipherBytes){
  const named=await fs.lstat(source,{bigint:true});checkFile(named);need(sameFile(snap(named),entry),'SOURCE_IDENTITY');
  const input=await fs.open(source,constants.O_RDONLY|(constants.O_NOFOLLOW||0));let output;
  try{
    output=await fs.open(destination,'wx',0o600);
    need(sameFile(snap(await input.stat({bigint:true})),entry),'SOURCE_IDENTITY');
    const header=encode({kind:'SUPABASE_DB_GZIP_FILE_V1',context:c,file:entry.file,sqlBytes:entry.bytes,sqlSha256:entry.sha256});
    need(header.length<=P.maximumHeaderBytes,'HEADER_BOUND');const length=Buffer.alloc(4);length.writeUInt32BE(header.length);
    const salt=crypto.randomBytes(16),nonce=crypto.randomBytes(12),prefix=Buffer.concat([MAGIC,length,header,salt,nonce]);
    const cipher=crypto.createCipheriv('aes-256-gcm',key(env,salt),nonce);cipher.setAAD(prefix);
    const rawHash=crypto.createHash('sha256'),cipherHash=crypto.createHash('sha256');let sqlBytes=0,cipherBytes=0;
    const append=async b=>{cipherBytes+=b.length;need(cipherBytes<=remainingCipherBytes,'CIPHERTEXT_GROUP_BOUND');cipherHash.update(b);await writeAll(output,b);};
    await append(prefix);
    const count=new Transform({transform(b,_encoding,callback){try{need(Date.now()<deadline,'CARRIER_DEADLINE');sqlBytes+=b.length;need(sqlBytes<=entry.bytes,'SOURCE_LENGTH');rawHash.update(b);callback(null,b);}catch(e){callback(e);}}});
    const sink=new Writable({write(b,_encoding,callback){append(b).then(()=>callback(),callback);}});
    await pipeline(input.createReadStream({autoClose:false}),count,createGzip({level:9}),cipher,sink);
    await append(cipher.getAuthTag());await output.sync();
    const end=await input.stat({bigint:true}),fresh=await fs.lstat(source,{bigint:true});checkFile(fresh);
    need(sqlBytes===entry.bytes&&rawHash.digest('hex')===entry.sha256&&sameFile(snap(end),entry)&&sameFile(snap(fresh),entry),'SOURCE_CHANGED');
    return{file:entry.file,sqlBytes,sqlSha256:entry.sha256,cipherFile:path.basename(destination),cipherBytes,cipherSha256:cipherHash.digest('hex')};
  }finally{await input.close();if(output)await output.close();}
}
// The legacy single-file path retains its original allocation and validation.
// Large logical files are read from one pinned handle in bounded passes.
async function verifyLargeFile(file,entry,c,env,deadline,onSqlChunk){
  const named=await fs.lstat(file,{bigint:true});checkFile(named);
  need(named.size===BigInt(entry.cipherBytes),'CIPHERTEXT_SHA');
  const handle=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));
  try{
    const initial=await handle.stat({bigint:true});checkFile(initial);need(sameFile(snap(named),snap(initial)),'PRIVATE_FILE_IDENTITY');
    const unchanged=async()=>{
      const open=await handle.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});checkFile(fresh);
      need(sameFile(snap(initial),snap(open))&&sameFile(snap(open),snap(fresh)),'PRIVATE_FILE_CHANGED');
    };
    async function readAt(offset,length){
      need(Date.now()<deadline,'CARRIER_DEADLINE');const bytes=Buffer.allocUnsafe(length);
      for(let at=0;at<length;){const {bytesRead}=await handle.read(bytes,at,length-at,offset+at);need(bytesRead>0,'CIPHERTEXT_SHA');at+=bytesRead;}
      return bytes;
    }
    const prefixStart=await readAt(0,MAGIC.length+4);
    need(prefixStart.subarray(0,MAGIC.length).equals(MAGIC),'DB_MAGIC');
    const size=prefixStart.readUInt32BE(MAGIC.length),start=prefixStart.length,saltAt=start+size,bodyAt=saltAt+28,bodyEnd=entry.cipherBytes-16;
    need(size>0&&size<=P.maximumHeaderBytes&&bodyEnd>bodyAt,'HEADER_BOUND');
    const prefix=Buffer.concat([prefixStart,await readAt(start,size+28)]),tag=await readAt(bodyEnd,16);
    const header=parse(prefix.subarray(start,saltAt),'DB_HEADER_JSON');
    need(same(header,{kind:'SUPABASE_DB_GZIP_FILE_V1',context:c,file:entry.file,sqlBytes:entry.sqlBytes,sqlSha256:entry.sqlSha256}),'DB_AAD_CONTEXT');
    const secret=key(env,prefix.subarray(saltAt,saltAt+16));
    const decipher=()=>{
      const reader=crypto.createDecipheriv('aes-256-gcm',secret,prefix.subarray(saltAt+16,bodyAt));
      reader.setAAD(prefix);reader.setAuthTag(tag);return reader;
    };
    function final(reader){try{return reader.final();}catch{fail('DB_GCM_AUTHENTICATION');}}
    const digest=crypto.createHash('sha256');digest.update(prefix);const first=decipher();
    for(let at=bodyAt;at<bodyEnd;){const bytes=await readAt(at,Math.min(64*1024,bodyEnd-at));at+=bytes.length;digest.update(bytes);first.update(bytes).fill(0);}
    digest.update(tag);need(digest.digest('hex')===entry.cipherSha256,'CIPHERTEXT_SHA');final(first).fill(0);await unchanged();
    const outputHash=crypto.createHash('sha256');let sqlBytes=0;
    async function* authenticatedCompressed(){
      const second=decipher();
      for(let at=bodyAt;at<bodyEnd;){const bytes=await readAt(at,Math.min(64*1024,bodyEnd-at));at+=bytes.length;yield second.update(bytes);}
      yield final(second);
    }
    await pipeline(Readable.from(authenticatedCompressed()),createGunzip(),new Writable({write(bytes,_encoding,callback){
      Promise.resolve().then(async()=>{
        need(Date.now()<deadline,'CARRIER_DEADLINE');sqlBytes+=bytes.length;need(sqlBytes<=entry.sqlBytes,'RESTORE_SQL_BOUND');
        outputHash.update(bytes);if(onSqlChunk)await onSqlChunk(bytes);
      }).then(()=>callback(),callback);
    }}));
    await unchanged();need(sqlBytes===entry.sqlBytes&&outputHash.digest('hex')===entry.sqlSha256,'RESTORE_SQL_SHA');
    return{file:entry.file,sqlBytes,sqlSha256:entry.sqlSha256,cipherSha256:entry.cipherSha256};
  }finally{await handle.close();}
}
async function verifyFile(root,entry,c,env,deadline,onSqlChunk=null,maximumCipherBytes=P.maximumCipherBytes){
  fields(entry,['file','sqlBytes','sqlSha256','cipherFile','cipherBytes','cipherSha256'],'CIPHER_DESCRIPTOR_FIELDS');
  need(NAMES.includes(entry.file)&&entry.cipherFile===entry.file+'.gz.enc'&&positive(entry.sqlBytes)&&entry.sqlBytes<=P.maximumSqlBytes
    &&hash(entry.sqlSha256)&&positive(entry.cipherBytes)&&entry.cipherBytes<=maximumCipherBytes&&hash(entry.cipherSha256),'CIPHER_DESCRIPTOR');
  if(entry.cipherBytes>P.maximumCipherBytes)return verifyLargeFile(path.join(root,entry.cipherFile),entry,c,env,deadline,onSqlChunk);
  const bytes=await readSmall(path.join(root,entry.cipherFile),P.maximumCipherBytes);need(bytes.length===entry.cipherBytes&&sha(bytes)===entry.cipherSha256,'CIPHERTEXT_SHA');
  need(bytes.subarray(0,MAGIC.length).equals(MAGIC)&&bytes.length>MAGIC.length+4+44,'DB_MAGIC');
  const size=bytes.readUInt32BE(MAGIC.length),start=MAGIC.length+4;need(size>0&&size<=P.maximumHeaderBytes&&bytes.length>start+size+44,'HEADER_BOUND');
  const saltAt=start+size,bodyAt=saltAt+28,header=parse(bytes.subarray(start,saltAt),'DB_HEADER_JSON');
  need(same(header,{kind:'SUPABASE_DB_GZIP_FILE_V1',context:c,file:entry.file,sqlBytes:entry.sqlBytes,sqlSha256:entry.sqlSha256}),'DB_AAD_CONTEXT');
  const decipher=crypto.createDecipheriv('aes-256-gcm',key(env,bytes.subarray(saltAt,saltAt+16)),bytes.subarray(saltAt+16,bodyAt));
  decipher.setAAD(bytes.subarray(0,bodyAt));decipher.setAuthTag(bytes.subarray(-16));let compressed;
  try{compressed=Buffer.concat([decipher.update(bytes.subarray(bodyAt,-16)),decipher.final()]);}catch{fail('DB_GCM_AUTHENTICATION');}
  let sqlBytes=0;const digest=crypto.createHash('sha256');
  try{await pipeline(Readable.from([compressed]),createGunzip(),new Writable({write(b,_encoding,callback){try{
    need(Date.now()<deadline,'CARRIER_DEADLINE');sqlBytes+=b.length;need(sqlBytes<=entry.sqlBytes,'RESTORE_SQL_BOUND');digest.update(b);
    if(onSqlChunk)Promise.resolve().then(()=>onSqlChunk(b)).then(()=>callback(),callback);else callback();}catch(e){callback(e);}}}));
  }finally{compressed.fill(0);}
  need(sqlBytes===entry.sqlBytes&&digest.digest('hex')===entry.sqlSha256,'RESTORE_SQL_SHA');
  return{file:entry.file,sqlBytes,sqlSha256:entry.sqlSha256,cipherSha256:entry.cipherSha256};
}
const DOCUMENTED_CLI_LOGIN_GRANT=Buffer.from('GRANT "postgres" TO "cli_login_postgres" WITH INHERIT FALSE GRANTED BY "supabase_admin";','ascii');
const SYSTEM_ROLE_NAME=/^supabase_[A-Za-z0-9_]{1,54}$/;
const SYSTEM_ROLE_LIMIT=128,ROLE_AUDIT_BYTES=4*1024*1024;
function systemRoleInventory(value){
  need(Array.isArray(value)&&value.length<=SYSTEM_ROLE_LIMIT&&value.every(n=>typeof n==='string'&&SYSTEM_ROLE_NAME.test(n))
    &&new Set(value).size===value.length,'ROLE_AUDIT_TARGET_ROLES');return [...value].sort();
}
// Role-dump syntax only. String values/comments are consumed without becoming identifiers.
// An unfamiliar statement stops the read; it cannot silently make this inventory complete.
function referencedSystemRoles(bytes){
  need(bytes.length<=ROLE_AUDIT_BYTES,'ROLE_GRANT_AUDIT_BOUND');
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{fail('ROLE_AUDIT_UTF8');}
  const roles=new Set();let at=0,tokens=[],resetComplete=false,statementOrdinal=0;
  const word=t=>t?.kind==='word'?t.value.toUpperCase():null;
  const systemName=t=>t?.kind==='word'?t.value.toLowerCase():t?.value;
  const add=t=>{need(t&&(t.kind==='word'||t.kind==='identifier'),'ROLE_AUDIT_ROLE_OPERAND');const name=systemName(t);
    if(name.startsWith('supabase_')){need(SYSTEM_ROLE_NAME.test(name),'ROLE_AUDIT_SYSTEM_ROLE_NAME');roles.add(name);
      need(roles.size<=SYSTEM_ROLE_LIMIT,'ROLE_AUDIT_SYSTEM_ROLE_COUNT');}};
  // A list is identifiers separated by commas, never expressions or privilege clauses.
  const roleList=items=>{need(items.length>0&&items.length%2===1,'ROLE_AUDIT_ROLE_OPERAND');
    items.forEach((t,i)=>i%2?need(t.value===',','ROLE_AUDIT_ROLE_OPERAND'):add(t));};
  const statementKind=()=>{
    const first=word(tokens[0]),second=word(tokens[1]);
    if(['SET','RESET','GRANT','REVOKE','SELECT'].includes(first))return first;
    if(['CREATE','ALTER'].includes(first)&&['ROLE','USER'].includes(second))return first+'_ROLE';
    if(first==='COMMENT'&&second==='ON'&&word(tokens[2])==='ROLE')return 'COMMENT_ROLE';
    return 'OTHER';
  };
  const statementNeed=(value,branch)=>{
    if(!value)fail('ROLE_AUDIT_STATEMENT_'+statementKind()+'_'+branch+'_'+statementOrdinal);
  };
  // pg_dumpall also emits parameter ACLs in a role-only dump. Parse their
  // complete grammar; only grantees/grantor are roles, never GUC names.
  function parameterGrant(first,on){
    let next=1;
    const take=value=>{if(word(tokens[next])!==value)return false;next++;return true;};
    const comma=()=>{if(tokens[next]?.value!==','||tokens[next]?.kind!=='symbol')return false;next++;return true;};
    const name=branch=>{
      const t=tokens[next++];
      statementNeed(t&&['word','identifier'].includes(t.kind)&&t.value.length>0
        &&!['ON','TO','FROM','WITH','GRANT','OPTION','GRANTED','BY','CASCADE','RESTRICT','GROUP'].includes(word(t)),branch);
      return t;
    };
    if(first==='REVOKE'&&take('GRANT'))statementNeed(take('OPTION')&&take('FOR'),'PARAMETER_PRIVILEGES');
    if(take('ALL'))take('PRIVILEGES');
    else do{
      if(!take('SET'))statementNeed(take('ALTER')&&take('SYSTEM'),'PARAMETER_PRIVILEGES');
    }while(comma());
    statementNeed(next===on,'PARAMETER_PRIVILEGES');next+=2;
    do{
      name('PARAMETER_TARGET');
      while(tokens[next]?.kind==='symbol'&&tokens[next].value==='.'){next++;name('PARAMETER_TARGET');}
    }while(comma());
    statementNeed(take(first==='GRANT'?'TO':'FROM'),'PARAMETER_TARGET');
    const role=groupAllowed=>{
      if(groupAllowed)take('GROUP');
      const t=name('PARAMETER_ROLE');statementNeed(word(t)!=='NONE','PARAMETER_ROLE');add(t);
    };
    do{role(true);}while(comma());
    if(first==='GRANT'&&take('WITH'))statementNeed(take('GRANT')&&take('OPTION'),'PARAMETER_TAIL');
    if(take('GRANTED')){statementNeed(take('BY'),'PARAMETER_TAIL');role(false);}
    if(first==='REVOKE'&&!take('CASCADE'))take('RESTRICT');
    statementNeed(next===tokens.length,'PARAMETER_TAIL');
  }
  function statement(){
    if(!tokens.length)return;statementOrdinal++;need(!resetComplete,'ROLE_AUDIT_AFTER_RESET');const first=word(tokens[0]);
    if(['SET','RESET'].includes(first)){
      if(first==='SET'){
        const start=['SESSION','LOCAL'].includes(word(tokens[1]))?2:1;
        const setting=tokens[start]?.value.toUpperCase();
        statementNeed(!['ROLE','AUTHORIZATION','SESSION_AUTHORIZATION'].includes(setting)
          &&!(setting==='SESSION'&&word(tokens[start+1])==='AUTHORIZATION'),'IDENTITY');
      }
      statementNeed(!tokens.slice(1).some(t=>t.kind!=='string'&&systemName(t).startsWith('supabase_')),'MANAGED_REFERENCE');
      if(tokens[1]?.value.toLowerCase()==='standard_conforming_strings')need(first==='SET'&&word(tokens.at(-1))==='ON','ROLE_AUDIT_STRING_MODE');
      if(first==='RESET'&&word(tokens[1])==='ALL')resetComplete=true;
    }
    else if(['CREATE','ALTER'].includes(first)&&['ROLE','USER'].includes(word(tokens[1]))){
      add(tokens[2]);statementNeed(!tokens.slice(3).some(t=>t.kind!=='string'&&systemName(t).startsWith('supabase_')),'ROLE_OPTIONS');
    }else if(first==='COMMENT'&&word(tokens[1])==='ON'&&word(tokens[2])==='ROLE')add(tokens[3]);
    else if(first==='GRANT'||first==='REVOKE'){
      const on=tokens.findIndex(t=>word(t)==='ON');
      if(on>0&&word(tokens[on+1])==='PARAMETER'){parameterGrant(first,on);tokens=[];return;}
      const split=tokens.findIndex(t=>word(t)===(first==='GRANT'?'TO':'FROM'));
      if(!(split>1&&!tokens.slice(1,split).some(t=>word(t)==='ON'))){
        const shape=split<0?'NO_TO':split<=1?'TO_POSITION'
          :tokens.slice(1,split).some((t,i,items)=>word(t)==='ON'&&word(items[i+1])==='PARAMETER')?'OBJECT_PARAMETER':'OBJECT_OTHER';
        statementNeed(false,'MEMBERSHIP_SHAPE_'+shape);
      }
      let from=1;if(first==='REVOKE'&&word(tokens[1])==='ADMIN'&&word(tokens[2])==='OPTION'&&word(tokens[3])==='FOR')from=4;
      roleList(tokens.slice(from,split));
      let end=split+1;while(end<tokens.length&&!['WITH','GRANTED','CASCADE','RESTRICT'].includes(word(tokens[end])))end++;
      roleList(tokens.slice(split+1,end));
      const by=tokens.findIndex((t,i)=>i>=end&&word(t)==='GRANTED'&&word(tokens[i+1])==='BY');
      if(by>=0){need(by+2<tokens.length,'ROLE_AUDIT_ROLE_OPERAND');add(tokens[by+2]);}
      statementNeed(!tokens.slice(end).some((t,i)=>systemName(t).startsWith('supabase_')&&i+end!==by+2),'MEMBERSHIP_TAIL');
    }else statementNeed(false,'UNSUPPORTED');
    tokens=[];
  }
  function token(kind,value){tokens.push({kind,value});need(tokens.length<=4096,'ROLE_AUDIT_STATEMENT_BOUND');}
  while(at<text.length){
    const c=text[at];if(/\s/.test(c)){at++;continue;}
    if(text.startsWith('--',at)){const end=text.indexOf('\n',at+2);at=end<0?text.length:end+1;continue;}
    if(text.startsWith('/*',at)){let depth=1;at+=2;while(at<text.length&&depth){if(text.startsWith('/*',at)){depth++;at+=2;}
      else if(text.startsWith('*/',at)){depth--;at+=2;}else at++;}need(depth===0,'ROLE_AUDIT_COMMENT');continue;}
    if(c==='\\'){need(!tokens.length&&(at===0||text[at-1]==='\n'),'ROLE_AUDIT_META_COMMAND');const end=text.indexOf('\n',at);
      const line=text.slice(at,end<0?text.length:end).replace(/\r$/,'');need(/^\\(?:un)?restrict [A-Za-z0-9]+$/.test(line),'ROLE_AUDIT_META_COMMAND');at=end<0?text.length:end+1;continue;}
    if(/[Uu]/.test(c)&&text[at+1]==='&'&&text[at+2]==='"')fail('ROLE_AUDIT_UNICODE_IDENTIFIER');
    if(c==='"'||c==="'"){
      const quote=c,escaped=quote==="'"&&at>0&&/[Ee]/.test(text[at-1])&&(at<2||!/[A-Za-z0-9_]/.test(text[at-2]));
      let value='',closed=false;at++;
      while(at<text.length){const next=text[at++];if(escaped&&next==='\\'){need(at<text.length,'ROLE_AUDIT_QUOTE');at++;continue;}
        if(next===quote){if(text[at]===quote){value+=quote;at++;continue;}closed=true;break;}
        if(quote==='"')value+=next;}
      need(closed,'ROLE_AUDIT_QUOTE');token(quote==='"'?'identifier':'string',value);continue;
    }
    if(c===';'){at++;statement();continue;}
    const identifier=/^[A-Za-z_\u0080-\uffff][A-Za-z0-9_$\u0080-\uffff]*/.exec(text.slice(at));
    if(identifier){need(identifier[0].toUpperCase()!=='UESCAPE','ROLE_AUDIT_UNICODE_IDENTIFIER');
      token('word',identifier[0]);at+=identifier[0].length;continue;}
    token('symbol',c);at++;
  }
  need(tokens.length===0,'ROLE_AUDIT_UNTERMINATED_STATEMENT');return [...roles].sort();
}

// Compare one complete line while consuming the authenticated file. No SQL or line position leaves this helper.
export async function auditLocalDatabaseBackupRoleGrant({directory,entry,context:sourceContext,deadline,targetSystemRoles}={}, {env=process.env}={}){
  need(entry?.file==='roles.sql'&&Number.isSafeInteger(deadline),'ROLE_GRANT_AUDIT_FILE');
  const root=await privatePath(directory,env),c=context(sourceContext);
  if(targetSystemRoles!==undefined){
    const target=systemRoleInventory(targetSystemRoles),chunks=[];let bytes=0;
    need(entry.sqlBytes<=ROLE_AUDIT_BYTES&&entry.cipherBytes<=ROLE_AUDIT_BYTES,'ROLE_GRANT_AUDIT_BOUND');
    await verifyFile(root,entry,c,env,deadline,chunk=>{bytes+=chunk.length;need(bytes<=ROLE_AUDIT_BYTES,'ROLE_GRANT_AUDIT_BOUND');chunks.push(Buffer.from(chunk));});
    const sql=Buffer.concat(chunks);try{
      const referenced=referencedSystemRoles(sql),have=new Set(target);
      return{referencedSystemRoles:referenced,targetSystemRoles:target,missingSystemRoles:referenced.filter(n=>!have.has(n)),
        referencedSystemRoleCount:referenced.length,targetSystemRoleCount:target.length};
    }finally{sql.fill(0);for(const chunk of chunks)chunk.fill(0);}
  }
  let length=0,matches=0;
  function finishLine(newline){
    if(length===DOCUMENTED_CLI_LOGIN_GRANT.length||newline&&length===DOCUMENTED_CLI_LOGIN_GRANT.length+1)
      matches=Math.min(2,matches+1);
    length=0;
  }
  await verifyFile(root,entry,c,env,deadline,chunk=>{
    for(const byte of chunk){
      if(byte===10){finishLine(true);continue;}
      if(length<0)continue;
      if(length<DOCUMENTED_CLI_LOGIN_GRANT.length&&byte===DOCUMENTED_CLI_LOGIN_GRANT[length]
        ||length===DOCUMENTED_CLI_LOGIN_GRANT.length&&byte===13)length++;
      else length=-1;
    }
  });
  finishLine(false);
  return ['ABSENT_EXACT','PRESENT_ONCE','PRESENT_MULTIPLE'][matches];
}

async function verifyAt(directory,env,deadline){
  const root=await privatePath(directory,env),raw=await readSmall(path.join(root,'manifest.json'),P.maximumManifestBytes),m=parse(raw,'LOCAL_MANIFEST_JSON');
  fields(m,['kind','context','exportReceiptSha256','files','authRestoreVerified','fullDatabaseBackupVerified','archiveUploaded','centralLocatorPublished','freeReady'],'LOCAL_MANIFEST_FIELDS');
  const chunked=m.kind==='SUPABASE_LOCAL_DB_CARRIER_V2';
  need((chunked||m.kind==='SUPABASE_LOCAL_DB_CARRIER_V1')&&hash(m.exportReceiptSha256)&&m.authRestoreVerified===false&&m.fullDatabaseBackupVerified===false
    &&m.archiveUploaded===false&&m.centralLocatorPublished===false&&m.freeReady===false,'LOCAL_MANIFEST');const c=context(m.context);
  need(Array.isArray(m.files)&&m.files.length===5&&m.files.every((f,i)=>f.file===NAMES[i]),'FIVE_FILES_REQUIRED');
  const names=await fs.readdir(root);need(names.length===6&&names.every(n=>n==='manifest.json'||NAMES.some(f=>n===f+'.gz.enc')),'LOCAL_NAMESPACE');
  need(m.files.reduce((n,f)=>n+(positive(f.sqlBytes)?f.sqlBytes:P.maximumTotalSqlBytes+1),0)<=P.maximumTotalSqlBytes,'RESTORE_TOTAL_BOUND');
  if(chunked)need(m.files.every(f=>positive(f.cipherBytes))&&m.files.reduce((n,f)=>n+f.cipherBytes,0)<=DB_BACKUP_CIPHER_LIMITS.totalBytes,'CIPHERTEXT_GROUP_BOUND');
  const maximum=chunked?DB_BACKUP_CIPHER_LIMITS.totalBytes:P.maximumCipherBytes;
  const files=[];for(const f of m.files)files.push(await verifyFile(root,f,c,env,deadline,null,maximum));
  return{status:'LOCAL_AUTHENTICATED_SQL_BYTE_ROUNDTRIP_ONLY',manifestSha256:sha(raw),files,totalSqlBytes:files.reduce((n,f)=>n+f.sqlBytes,0),
    authRestoreVerified:false,fullDatabaseBackupVerified:false,archiveUploaded:false,centralLocatorPublished:false,freeReady:false};
}
export async function verifyLocalDatabaseBackup({directory}={}, {env=process.env}={}){return verifyAt(directory,env,Date.now()+P.maximumMs);}
// Explicit plaintext materialization only; verify/capture never select this sink.
export async function materializeLocalDatabaseBackup(options={}, {env=process.env,signal,processImpl=process}={}){
  fields(options,['directory','destination','manifestSha256'],'MATERIALIZATION_OPTIONS');
  const expectedManifestSha256=options.manifestSha256;need(processImpl.platform==='linux','MATERIALIZATION_LINUX_REQUIRED');need(hash(expectedManifestSha256),'MATERIALIZATION_MANIFEST_SHA');
  need(signal===undefined||signal instanceof AbortSignal,'MATERIALIZATION_SIGNAL');const deadline=Date.now()+P.maximumMs;
  const checkpoint=()=>{need(!signal?.aborted,'MATERIALIZATION_ABORTED');need(Date.now()<deadline,'CARRIER_DEADLINE');};checkpoint();
  const source=await privatePath(options.directory,env);
  need(typeof options.destination==='string'&&path.isAbsolute(options.destination),'MATERIALIZATION_TARGET');const destination=path.resolve(options.destination);
  const parent=await privatePath(path.dirname(destination),env),within=(child,root)=>{const r=path.relative(root,child);return r===''||!path.isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+path.sep);};
  need(!within(destination,source)&&!within(source,destination),'MATERIALIZATION_OVERLAP');
  need(!(await fs.lstat(destination).catch(e=>{if(e.code==='ENOENT')return null;throw e;})),'MATERIALIZATION_TARGET_EXISTS');
  const parentId=id(await fs.lstat(parent,{bigint:true})),sourceDirectory=snap(await fs.lstat(source,{bigint:true})),sourceFiles=[];
  for(const file of ['manifest.json',...NAMES.map(n=>n+'.gz.enc')]){const st=await fs.lstat(path.join(source,file),{bigint:true});checkFile(st);sourceFiles.push({file,...snap(st)});}
  const raw=await readSmall(path.join(source,'manifest.json'),P.maximumManifestBytes);need(sha(raw)===expectedManifestSha256,'MATERIALIZATION_MANIFEST_SHA');
  const verified=await verifyAt(source,env,deadline);need(verified.manifestSha256===expectedManifestSha256,'MATERIALIZATION_MANIFEST_SHA');
  const m=parse(raw,'LOCAL_MANIFEST_JSON'),c=context(m.context);let rootId=null;const created=[];let made=false;
  async function ownDirectories(){
    need(await privatePath(parent,env)===parent&&same(id(await fs.lstat(parent,{bigint:true})),parentId),'MATERIALIZATION_PARENT_CHANGED');
    if(made)need(await privatePath(destination,env)===destination&&same(id(await fs.lstat(destination,{bigint:true})),rootId),'MATERIALIZATION_TARGET_CHANGED');
  }
  async function unchangedSource(){
    need(await privatePath(source,env)===source&&sameFile(snap(await fs.lstat(source,{bigint:true})),sourceDirectory),'MATERIALIZATION_SOURCE_CHANGED');
    need((await fs.readdir(source)).length===6,'LOCAL_NAMESPACE');
    for(const f of sourceFiles){const st=await fs.lstat(path.join(source,f.file),{bigint:true});checkFile(st);need(sameFile(snap(st),f),'MATERIALIZATION_SOURCE_CHANGED');}
  }
  async function readBack(record,entry){
    const file=path.join(destination,record.file),named=await fs.lstat(file,{bigint:true});checkFile(named);need(sameFile(snap(named),record.last),'MATERIALIZATION_FILE_CHANGED');
    const h=await fs.open(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0));try{
      const before=await h.stat({bigint:true});checkFile(before);need(sameFile(snap(before),record.last),'MATERIALIZATION_FILE_CHANGED');const digest=crypto.createHash('sha256'),buffer=Buffer.alloc(64*1024);let count=0;
      for(;;){checkpoint();const {bytesRead}=await h.read(buffer,0,buffer.length,null);if(!bytesRead)break;count+=bytesRead;need(count<=entry.sqlBytes,'RESTORE_SQL_BOUND');digest.update(buffer.subarray(0,bytesRead));}
      const after=await h.stat({bigint:true}),fresh=await fs.lstat(file,{bigint:true});checkFile(fresh);
      need(count===entry.sqlBytes&&digest.digest('hex')===entry.sqlSha256&&sameFile(snap(before),snap(after))&&sameFile(snap(after),snap(fresh)),'MATERIALIZATION_READBACK');
      record.last=snap(fresh);return{file:entry.file,bytes:count,sha256:entry.sqlSha256};
    }finally{await h.close();}
  }
  async function cleanup(){
    const result={removedFiles:0,retainedUnknownEntries:0,rootRemoved:false};
    for(const record of created)if(record.handle){await record.handle.close().catch(()=>{});record.handle=null;}
    if(!made)return result;
    try{await ownDirectories();}catch{result.retainedUnknownEntries=null;return result;}
    for(const record of created){const file=path.join(destination,record.file);try{const st=await fs.lstat(file,{bigint:true});checkFile(st);
      if(!record.last||!sameFile(snap(st),record.last)){result.retainedUnknownEntries++;continue;}await ownDirectories();await fs.unlink(file);result.removedFiles++;
    }catch(e){if(e.code!=='ENOENT')result.retainedUnknownEntries++;}}
    try{await ownDirectories();const entries=await fs.readdir(destination);result.retainedUnknownEntries=entries.length;if(entries.length===0){await fs.rmdir(destination);result.rootRemoved=true;}}catch{result.retainedUnknownEntries=null;}
    return result;
  }
  try{
    checkpoint();await unchangedSource();await ownDirectories();
    try{await fs.mkdir(destination,{mode:0o700});}catch(e){if(e.code==='EEXIST')fail('MATERIALIZATION_TARGET_EXISTS');throw e;}
    made=true;rootId=id(await fs.lstat(destination,{bigint:true}));await ownDirectories();const files=[];
    for(const entry of m.files){checkpoint();await ownDirectories();
      const handle=await fs.open(path.join(destination,entry.file),constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|(constants.O_NOFOLLOW||0),0o600);
      const record={file:entry.file,handle,last:null};created.push(record);const initial=await handle.stat({bigint:true});checkFile(initial);record.last=snap(initial);
      await verifyFile(source,entry,c,env,deadline,async b=>{checkpoint();await ownDirectories();await writeAll(handle,b);const st=await handle.stat({bigint:true});checkFile(st);
        need(same(id(st),{dev:record.last.dev,ino:record.last.ino}),'MATERIALIZATION_FILE_CHANGED');record.last=snap(st);checkpoint();},m.kind==='SUPABASE_LOCAL_DB_CARRIER_V2'?DB_BACKUP_CIPHER_LIMITS.totalBytes:P.maximumCipherBytes);
      await handle.sync();const st=await handle.stat({bigint:true});checkFile(st);need(st.size===BigInt(entry.sqlBytes),'MATERIALIZATION_LENGTH');record.last=snap(st);
      files.push(await readBack(record,entry));await handle.close();record.handle=null;
    }
    checkpoint();await unchangedSource();await ownDirectories();need(same((await fs.readdir(destination)).sort(),[...NAMES].sort()),'MATERIALIZATION_NAMESPACE');
    for(const record of created){const st=await fs.lstat(path.join(destination,record.file),{bigint:true});checkFile(st);need(sameFile(snap(st),record.last),'MATERIALIZATION_FILE_CHANGED');}
    return{status:'LOCAL_FIVE_SQL_FILES_MATERIALIZED_ONLY',manifestSha256:expectedManifestSha256,files,totalSqlBytes:verified.totalSqlBytes,
      materializationCompleted:true,databaseRestoreExecuted:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,archiveUploaded:false,centralLocatorPublished:false,freeReady:false};
  }catch(e){const result=await cleanup(),error=new Error(typeof e.code==='string'&&/^[A-Z][A-Z0-9_]*$/.test(e.code)?e.code:'MATERIALIZATION_FAILED');
    error.code=error.message;error.materializationCompleted=false;error.cleanup=result;throw error;}
}
export async function sealCompletedDatabaseExport({workdir}={}, {env=process.env}={}){
  const root=await privatePath(workdir,env),receiptBytes=await readSmall(path.join(root,'export-receipt.json'),P.maximumManifestBytes),receipt=checkExport(parse(receiptBytes,'EXPORT_RECEIPT_JSON'));
  need(!(await fs.lstat(path.join(root,'failure-receipt.json')).catch(e=>{if(e.code==='ENOENT')return null;throw e;})),'FAILED_EXPORT_REJECTED');
  const c=fromEnv(env);key(env,Buffer.alloc(16));await privatePath(path.join(root,'exports'),env);
  const directory=await fs.mkdtemp(path.join(root,'sealed-db-export-'));await fs.chmod(directory,0o700);const files=[],deadline=Date.now()+P.maximumMs;
  let remaining=DB_BACKUP_CIPHER_LIMITS.totalBytes;
  for(const f of receipt.files){
    const sealed=await sealFile(path.join(root,'exports',f.file),path.join(directory,f.file+'.gz.enc'),f,c,env,deadline,remaining);
    remaining-=sealed.cipherBytes;files.push(sealed);
  }
  for(const f of receipt.files){const st=await fs.lstat(path.join(root,'exports',f.file),{bigint:true});checkFile(st);need(sameFile(snap(st),f),'SOURCE_CHANGED');}
  const manifest={kind:files.some(f=>f.cipherBytes>P.maximumCipherBytes)?'SUPABASE_LOCAL_DB_CARRIER_V2':'SUPABASE_LOCAL_DB_CARRIER_V1',context:c,exportReceiptSha256:sha(receiptBytes),files,
    authRestoreVerified:false,fullDatabaseBackupVerified:false,archiveUploaded:false,centralLocatorPublished:false,freeReady:false};
  const bytes=encode(manifest);need(bytes.length<=P.maximumManifestBytes,'MANIFEST_BOUND');await fs.writeFile(path.join(directory,'manifest.json'),bytes,{flag:'wx',mode:0o600});
  const verified=await verifyAt(directory,env,deadline);return{...verified,directory};
}
export async function captureLocalDatabaseBackup(options={},dependencies={}){
  const env=dependencies.env??process.env;need(env.GITHUB_ACTIONS==='true'&&env.RUNNER_ENVIRONMENT==='github-hosted'&&env.RUNNER_OS==='Linux','HOSTED_VM_REQUIRED');
  fromEnv(env);key(env,Buffer.alloc(16));const dumped=await exportSupabaseDatabase(options,dependencies);
  return sealCompletedDatabaseExport({workdir:dumped.workdir},{env});
}
async function main(){
  const args=process.argv.slice(2);if(args.length===1&&args[0]==='--capture')console.log(JSON.stringify(await captureLocalDatabaseBackup()));
  else if(args.length===2&&args[0]==='--verify')console.log(JSON.stringify(await verifyLocalDatabaseBackup({directory:args[1]})));
  else if(args.length===6&&args[0]==='--materialize'&&args[2]==='--destination'&&args[4]==='--manifest-sha')console.log(JSON.stringify(await materializeLocalDatabaseBackup({directory:args[1],destination:args[3],manifestSha256:args[5]})));
  else fail('EXPLICIT_LOCAL_CARRIER_MODE');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  main().catch(e=>{console.error(JSON.stringify({status:'FAILED_CLOSED',code:typeof e.code==='string'&&/^[A-Z_]+$/.test(e.code)?e.code:'DB_LOCAL_CARRIER_FAILED',
    stage:STAGES.includes(e.stage)?e.stage:null,externalDumpOutcome:['UNKNOWN','NOT_STARTED'].includes(e.externalDumpOutcome)?e.externalDumpOutcome:null,
    processGroupTerminated:typeof e.processGroupTerminated==='boolean'?e.processGroupTerminated:null,workdir:e.workdir??null,
    automaticRetry:false,archiveUploaded:false,centralLocatorPublished:false,authRestoreVerified:false,freeReady:false}));process.exitCode=1;});
