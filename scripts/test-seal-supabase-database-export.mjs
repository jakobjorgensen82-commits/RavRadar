import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {exportSupabaseDatabase} from './export-supabase-database.mjs';
import {DB_LOCAL_CARRIER_POLICY as P,captureLocalDatabaseBackup,sealCompletedDatabaseExport,verifyLocalDatabaseBackup,materializeLocalDatabaseBackup} from './seal-supabase-database-export.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sql=name=>Buffer.from('-- synthetic '+name+' æøå\nINSERT INTO synthetic VALUES (9007199254740993,0.123456789012345678901234567890);\n');
async function host(t){const temp=path.resolve(os.tmpdir()),dir=await fs.mkdtemp(path.join(temp,'ravradar-local-db-carrier-test-'));
  t.after(async()=>{assert.ok(path.resolve(dir).startsWith(temp+path.sep+'ravradar-local-db-carrier-test-'));assert.equal((await fs.lstat(dir)).isSymbolicLink(),false);await fs.rm(dir,{recursive:true,force:false});});return dir;}
function normalExportTransport(temp,{failFile=null}={}){
  const env={RUNNER_TEMP:temp,PATH:'synthetic-normal-cli-path',SUPABASE_ACCESS_TOKEN:'synthetic-access-never-real',SUPABASE_DB_PASSWORD:'synthetic-db-password-never-real',
    SUPABASE_SERVICE_ROLE_KEY:'synthetic-existing-db-backup-master-never-real',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',
    GITHUB_REPOSITORY:'jakobjorgensen82-commits/RavRadar',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'12345',GITHUB_RUN_ATTEMPT:'1'};
  const calls=[],alive=new Set(),processImpl=Object.assign(new EventEmitter(),{platform:'linux'});let pid=5000,now=0;
  const spawnImpl=(command,args,options)=>{
    calls.push({command,args,options});const child=Object.assign(new EventEmitter(),{pid:++pid,stdout:new PassThrough(),stderr:new PassThrough(),unref(){}});alive.add(pid);
    queueMicrotask(async()=>{let code=0;try{
      if(args[0]==='--version')child.stdout.write('2.117.0\n');
      else if(args[0]==='db'){const file=args[args.indexOf('--file')+1];await fs.writeFile(file,sql(path.basename(file)),{mode:0o600,flag:'wx'});if(path.basename(file)===failFile)code=1;}
    }catch{code=1;}alive.delete(child.pid);child.stdout.end();child.stderr.end();child.emit('exit',code,null);child.emit('close',code,null);});return child;
  };
  const killImpl=(negativePid,signal)=>{assert.ok(negativePid<0);if(!alive.has(-negativePid)){const e=new Error('gone');e.code='ESRCH';throw e;}assert.equal(signal,0);};
  return{env,calls,dependencies:()=>({env,spawnImpl,killImpl,processImpl,now:()=>now,delay:async ms=>{now+=ms;await new Promise(resolve=>setImmediate(resolve));}})};
}
async function exported(t,options){const f=normalExportTransport(await host(t),options),r=await exportSupabaseDatabase({},f.dependencies());return{f,root:r.workdir};}
async function sealed(t){const {f,root}=await exported(t);const r=await sealCompletedDatabaseExport({workdir:root},{env:f.env});return{f,root,result:r,directory:r.directory};}
async function manifest(directory){return JSON.parse(await fs.readFile(path.join(directory,'manifest.json'),'utf8'));}
async function writeManifest(directory,m){await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(m));}
async function rejectsCode(fn,code){await assert.rejects(fn,e=>e.code===code);}

test('same normal five-file caller feeds gzip/GCM and exact SQL hashes; no Auth, R2 or Free authority',async t=>{
  const f=normalExportTransport(await host(t)),r=await captureLocalDatabaseBackup({},f.dependencies());assert.equal(f.calls.length,7);
  const m=await manifest(r.directory);assert.equal(m.context.purpose,'SUPABASE_DATABASE_BACKUP/v1');assert.equal(m.context.project,'afqhhdrkjfjtpadntdzo');
  assert.equal(m.context.sourceHead,'a'.repeat(40));assert.equal(m.context.runId,'12345');assert.equal(m.context.runAttempt,'1');
  assert.deepEqual(m.files.map(x=>x.file),['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql']);
  for(const entry of m.files){const b=await fs.readFile(path.join(r.directory,entry.cipherFile));assert.equal(b.length,entry.cipherBytes);assert.equal(sha(b),entry.cipherSha256);
    assert.equal(entry.sqlSha256,sha(sql(entry.file)));assert.equal(entry.sqlBytes,sql(entry.file).length);assert.ok(!b.includes(Buffer.from('INSERT INTO synthetic')));}
  assert.equal(r.totalSqlBytes,m.files.reduce((n,x)=>n+x.sqlBytes,0));assert.equal(r.authRestoreVerified,false);assert.equal(r.fullDatabaseBackupVerified,false);
  assert.equal(r.archiveUploaded,false);assert.equal(r.centralLocatorPublished,false);assert.equal(r.freeReady,false);
  assert.ok(!JSON.stringify(r).includes('INSERT')&&!JSON.stringify(r).includes('synthetic-existing-db-backup-master'));
  assert.ok(f.calls.every(c=>c.options.env.SUPABASE_SERVICE_ROLE_KEY===undefined),'the encryption master never reaches the CLI child');
  assert.equal((await verifyLocalDatabaseBackup({directory:r.directory},{env:f.env})).manifestSha256,r.manifestSha256);
});
test('independent new seals use new salt/nonce while preserving the same source bytes',async t=>{
  const {f,root}=await exported(t),a=await sealCompletedDatabaseExport({workdir:root},{env:f.env}),b=await sealCompletedDatabaseExport({workdir:root},{env:f.env});
  const x=await manifest(a.directory),y=await manifest(b.directory);assert.deepEqual(x.files.map(f=>f.sqlSha256),y.files.map(f=>f.sqlSha256));
  assert.ok(x.files.every((f,i)=>f.cipherSha256!==y.files[i].cipherSha256));
});
test('wrong existing master fails GCM without returning decrypted content',async t=>{
  const {f,directory}=await sealed(t);await rejectsCode(()=>verifyLocalDatabaseBackup({directory},{env:{...f.env,SUPABASE_SERVICE_ROLE_KEY:'other-synthetic-master-never-real-12345'}}),'DB_GCM_AUTHENTICATION');
});
test('ciphertext mutation still fails authentication when the local outer SHA is recomputed',async t=>{
  const {f,directory}=await sealed(t),m=await manifest(directory),entry=m.files[0],file=path.join(directory,entry.cipherFile),b=await fs.readFile(file);b[b.length-17]^=1;
  await fs.writeFile(file,b);entry.cipherSha256=sha(b);await writeManifest(directory,m);
  await rejectsCode(()=>verifyLocalDatabaseBackup({directory},{env:f.env}),'DB_GCM_AUTHENTICATION');
});
test('header/tag mutations cannot be accepted by merely changing the manifest digest',async t=>{
  for(const position of ['header','tag']){const {f,directory}=await sealed(t),m=await manifest(directory),entry=m.files[0],file=path.join(directory,entry.cipherFile),b=await fs.readFile(file);
    if(position==='tag')b[b.length-1]^=1;else{const at=b.indexOf(Buffer.from('"runId":"12345"'));assert.ok(at>0);b[at+9]=54;}
    await fs.writeFile(file,b);entry.cipherSha256=sha(b);await writeManifest(directory,m);
    await assert.rejects(()=>verifyLocalDatabaseBackup({directory},{env:f.env}),e=>['DB_AAD_CONTEXT','DB_GCM_AUTHENTICATION'].includes(e.code));
  }
});
test('changed context, wrong purpose or fake restore flags are rejected',async t=>{
  for(const change of [m=>{m.context.sourceHead='b'.repeat(40);},m=>{m.context.purpose='PRIVATE_BUILD_STAGE/v1';},m=>{m.authRestoreVerified=true;}]){
    const {f,directory}=await sealed(t),m=await manifest(directory);change(m);await writeManifest(directory,m);await assert.rejects(()=>verifyLocalDatabaseBackup({directory},{env:f.env}));
  }
});
test('changed source identity or bytes after export cannot be sealed as the completed export',async t=>{
  const {f,root}=await exported(t);await fs.appendFile(path.join(root,'exports','data.sql'),'-- changed\n');
  await rejectsCode(()=>sealCompletedDatabaseExport({workdir:root},{env:f.env}),'SOURCE_IDENTITY');
});
test('unknown/nonzero process receipt cannot qualify local sealing',async t=>{
  const {f,root}=await exported(t),file=path.join(root,'export-receipt.json'),r=JSON.parse(await fs.readFile(file,'utf8'));r.processes[4].processGroupTerminated=false;await fs.writeFile(file,JSON.stringify(r));
  await rejectsCode(()=>sealCompletedDatabaseExport({workdir:root},{env:f.env}),'EXPORT_PROCESS_OUTCOME');
});
test('normal dump failure prevents the sealing stage entirely, with no external write path',async t=>{
  const temp=await host(t),f=normalExportTransport(temp,{failFile:'roles.sql'});await assert.rejects(()=>captureLocalDatabaseBackup({},f.dependencies()),e=>e.code==='SUPABASE_DB_EXPORT_FAILED');
  assert.equal(f.calls.length,3);const roots=await fs.readdir(temp);assert.equal(roots.length,1);assert.ok(!(await fs.readdir(path.join(temp,roots[0]))).some(n=>n.startsWith('sealed-db-export-')));
});
test('hosted-only capture refuses self-hosted before normal CLI or private operation creation',async t=>{
  const temp=await host(t),f=normalExportTransport(temp);f.env.RUNNER_ENVIRONMENT='self-hosted';await rejectsCode(()=>captureLocalDatabaseBackup({},f.dependencies()),'HOSTED_VM_REQUIRED');assert.equal(f.calls.length,0);assert.deepEqual(await fs.readdir(temp),[]);
});
test('missing files, duplicate names and oversized descriptors refuse readonly verification',async t=>{
  const {f,directory}=await sealed(t),m=await manifest(directory);m.files[0].cipherBytes=P.maximumCipherBytes+1;await writeManifest(directory,m);
  await rejectsCode(()=>verifyLocalDatabaseBackup({directory},{env:f.env}),'CIPHER_DESCRIPTOR');m.files[0].cipherBytes=1;m.files[1].file=m.files[0].file;await writeManifest(directory,m);
  await rejectsCode(()=>verifyLocalDatabaseBackup({directory},{env:f.env}),'FIVE_FILES_REQUIRED');
  const next=await sealed(t),other=await manifest(next.directory);await fs.unlink(path.join(next.directory,other.files[0].cipherFile));await rejectsCode(()=>verifyLocalDatabaseBackup({directory:next.directory},{env:next.f.env}),'LOCAL_NAMESPACE');
});
test('real filesystem hardlinks and unexpected carrier contents are rejected',async t=>{
  const {f,directory}=await sealed(t),m=await manifest(directory),original=path.join(directory,m.files[0].cipherFile),linked=path.join(path.dirname(directory),'duplicate-encrypted-file');await fs.link(original,linked);
  await rejectsCode(()=>verifyLocalDatabaseBackup({directory},{env:f.env}),'PRIVATE_FILE_LINK');await fs.unlink(linked);await fs.writeFile(path.join(directory,'dump.log'),'not allowed');
  await rejectsCode(()=>verifyLocalDatabaseBackup({directory},{env:f.env}),'LOCAL_NAMESPACE');
});

async function targetFor(f){const canonical=await fs.realpath(f.env.RUNNER_TEMP),parent=await fs.mkdtemp(path.join(canonical,'owned-sql-parent-'));await fs.chmod(parent,0o700);return{parent,destination:path.join(parent,'sql')};}
function materialArgs(entry,target){return{directory:entry.directory,destination:target.destination,manifestSha256:entry.result.manifestSha256};}
function materialDeps(f,signal){return{env:f.env,processImpl:f.dependencies().processImpl,...(signal?{signal}:{})};}
async function interceptOpen(match,action,work){const original=fs.open;fs.open=async function(file,...args){const handle=await original.call(fs,file,...args);if(match(file,args))await action(handle,file,args);return handle;};
  try{return await work();}finally{fs.open=original;}}

test('explicit materialization uses the normal shared decrypt/hash sink and writes exactly five create-only SQL byte originals',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),before=await fs.readFile(path.join(entry.directory,'manifest.json'));
  const r=await materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f));assert.equal(r.status,'LOCAL_FIVE_SQL_FILES_MATERIALIZED_ONLY');
  assert.equal(r.materializationCompleted,true);assert.equal(r.databaseRestoreExecuted,false);assert.equal(r.authRestoreVerified,false);assert.equal(r.fullDatabaseBackupVerified,false);assert.equal(r.freeReady,false);
  assert.equal(r.archiveUploaded,false);assert.equal(r.centralLocatorPublished,false);assert.equal(r.manifestSha256,entry.result.manifestSha256);
  assert.deepEqual((await fs.readdir(target.destination)).sort(),['roles.sql','schema.sql','data.sql','history-schema.sql','history-data.sql'].sort());
  for(const file of r.files){const b=await fs.readFile(path.join(target.destination,file.file)),st=await fs.lstat(path.join(target.destination,file.file),{bigint:true});assert.ok(b.equals(sql(file.file)));assert.equal(file.sha256,sha(b));assert.equal(file.bytes,b.length);assert.equal(st.nlink,1n);
    if(process.platform==='linux'){assert.equal(st.mode&0o077n,0n);assert.equal(st.uid,BigInt(process.getuid()));}}
  assert.ok(!JSON.stringify(r).includes('INSERT')&&!JSON.stringify(r).includes('synthetic-existing-db-backup-master'));assert.equal(entry.f.calls.length,7,'no new CLI execution');
  assert.ok((await fs.readFile(path.join(entry.directory,'manifest.json'))).equals(before));assert.equal((await verifyLocalDatabaseBackup({directory:entry.directory},{env:entry.f.env})).manifestSha256,r.manifestSha256);
});
test('materialization wrong pin, unsupported platform, prior abort or extra options refuse without target files',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),options=materialArgs(entry,target),abort=new AbortController();abort.abort();
  for(const [args,deps,code]of [[{...options,manifestSha256:'0'.repeat(64)},materialDeps(entry.f),'MATERIALIZATION_MANIFEST_SHA'],
    [options,{env:entry.f.env,processImpl:{platform:'win32'}},'MATERIALIZATION_LINUX_REQUIRED'],[options,materialDeps(entry.f,abort.signal),'MATERIALIZATION_ABORTED'],
    [{...options,allowPlaintext:true},materialDeps(entry.f),'MATERIALIZATION_OPTIONS']])await rejectsCode(()=>materializeLocalDatabaseBackup(args,deps),code);
  assert.deepEqual(await fs.readdir(target.parent),[]);
});
test('materialization never overwrites an existing target, overlaps its input, or escapes the owned temp parent',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f);await fs.mkdir(target.destination,{mode:0o700});const sentinel=path.join(target.destination,'keep.txt');await fs.writeFile(sentinel,'synthetic original never delete');
  await rejectsCode(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f)),'MATERIALIZATION_TARGET_EXISTS');assert.equal(await fs.readFile(sentinel,'utf8'),'synthetic original never delete');
  await rejectsCode(()=>materializeLocalDatabaseBackup({...materialArgs(entry,target),destination:path.join(entry.directory,'sql')},materialDeps(entry.f)),'MATERIALIZATION_OVERLAP');
  const outside=await host(t);await rejectsCode(()=>materializeLocalDatabaseBackup({...materialArgs(entry,target),destination:path.join(outside,'sql')},materialDeps(entry.f)),'PRIVATE_TEMP_PATH');assert.deepEqual(await fs.readdir(outside),[]);
});
test('materialization rejects real parent junction/symlink and hardlinked input before creating plaintext',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),junction=path.join(await fs.realpath(entry.f.env.RUNNER_TEMP),'synthetic-parent-junction');
  await fs.symlink(target.parent,junction,process.platform==='win32'?'junction':'dir');
  await rejectsCode(()=>materializeLocalDatabaseBackup({...materialArgs(entry,target),destination:path.join(junction,'sql')},materialDeps(entry.f)),'PRIVATE_DIRECTORY_LINK');assert.deepEqual(await fs.readdir(target.parent),[]);
  const m=await manifest(entry.directory),extra=path.join(target.parent,'linked-cipher');await fs.link(path.join(entry.directory,m.files[0].cipherFile),extra);
  await rejectsCode(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f)),'PRIVATE_FILE_LINK');assert.deepEqual(await fs.readdir(target.parent),['linked-cipher']);await fs.unlink(extra);
});
test('materialization authenticates every file before target creation even when a tampered outer SHA is repinned',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),m=await manifest(entry.directory),file=path.join(entry.directory,m.files[4].cipherFile),b=await fs.readFile(file);b[b.length-1]^=1;
  await fs.writeFile(file,b);m.files[4].cipherSha256=sha(b);await writeManifest(entry.directory,m);const pinned=sha(await fs.readFile(path.join(entry.directory,'manifest.json')));
  await rejectsCode(()=>materializeLocalDatabaseBackup({...materialArgs(entry,target),manifestSha256:pinned},materialDeps(entry.f)),'DB_GCM_AUTHENTICATION');assert.deepEqual(await fs.readdir(target.parent),[]);
});
test('materialization abort after an actual write gives no valid receipt and retires only its unchanged owned partial',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),abort=new AbortController();let written=0,error;
  await interceptOpen(file=>path.resolve(String(file))===path.join(target.destination,'roles.sql'),async handle=>{
    const write=handle.write.bind(handle);handle.write=async(...args)=>{const r=await write(...args);written+=r.bytesWritten;abort.abort();return r;};
  },async()=>{await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f,abort.signal)),e=>{error=e;return e.code==='MATERIALIZATION_ABORTED';});});
  assert.ok(written>0);assert.equal(error.materializationCompleted,false);assert.equal(error.cleanup.removedFiles,1);assert.equal(error.cleanup.rootRemoved,true);assert.deepEqual(await fs.readdir(target.parent),[]);
});
test('materialization unknown partial write is preserved conservatively and never becomes a success receipt',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f);let written=0,error;
  await interceptOpen(file=>path.resolve(String(file))===path.join(target.destination,'roles.sql'),async handle=>{const write=handle.write.bind(handle);handle.write=async(...args)=>{
    const r=await write(...args);written+=r.bytesWritten;const e=new Error('raw synthetic SQL must never escape');e.code='EIO';throw e;};},async()=>{
    await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f)),e=>{error=e;return e.code==='EIO'&&!e.message.includes('raw synthetic');});});
  assert.ok(written>0);assert.equal(error.materializationCompleted,false);assert.equal(error.cleanup.removedFiles,0);assert.equal(error.cleanup.retainedUnknownEntries,1);assert.equal(error.cleanup.rootRemoved,false);
  assert.equal((await fs.stat(path.join(target.destination,'roles.sql'))).size,written);assert.deepEqual(await fs.readdir(target.destination),['roles.sql']);
});
test('materialization cleanup refuses a replaced name and preserves the unknown replacement and moved original',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),abort=new AbortController();let changed=false,error;
  await interceptOpen(file=>path.resolve(String(file))===path.join(target.destination,'roles.sql'),async(handle,file)=>{const write=handle.write.bind(handle);handle.write=async(...args)=>{
    const r=await write(...args);if(!changed){changed=true;await fs.rename(file,path.join(target.destination,'owned-moved'));await fs.writeFile(file,'keep-foreign');abort.abort();}return r;};},async()=>{
    await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f,abort.signal)),e=>{error=e;return e.code==='MATERIALIZATION_ABORTED';});});
  assert.equal(changed,true);assert.equal(error.materializationCompleted,false);assert.equal(error.cleanup.removedFiles,0);assert.equal(error.cleanup.retainedUnknownEntries,2);assert.equal(error.cleanup.rootRemoved,false);
  assert.equal(await fs.readFile(path.join(target.destination,'roles.sql'),'utf8'),'keep-foreign');assert.ok((await fs.stat(path.join(target.destination,'owned-moved'))).size>0);
});
test('materialization namespace drift preserves unrelated files while cleaning only verified owned SQL files',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f);let added=false,error;
  await interceptOpen(file=>path.resolve(String(file))===path.join(target.destination,'roles.sql'),async handle=>{const write=handle.write.bind(handle);handle.write=async(...args)=>{
    const r=await write(...args);if(!added){added=true;await fs.writeFile(path.join(target.destination,'keep-unknown'),'synthetic independent file');}return r;};},async()=>{
    await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f)),e=>{error=e;return e.code==='MATERIALIZATION_NAMESPACE';});});
  assert.equal(error.materializationCompleted,false);assert.equal(error.cleanup.removedFiles,5);assert.equal(error.cleanup.retainedUnknownEntries,1);assert.deepEqual(await fs.readdir(target.destination),['keep-unknown']);
  assert.equal(await fs.readFile(path.join(target.destination,'keep-unknown'),'utf8'),'synthetic independent file');
});
test('materialization detects source drift after first verification and performs no source rollback',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),m=await manifest(entry.directory),cipher=path.join(entry.directory,m.files[2].cipherFile);let changed=false;
  await interceptOpen(file=>path.resolve(String(file))===path.join(target.destination,'roles.sql'),async()=>{if(!changed){changed=true;await fs.appendFile(cipher,'synthetic changed input');}},async()=>{
    await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f)),e=>['CIPHERTEXT_SHA','MATERIALIZATION_SOURCE_CHANGED'].includes(e.code));});
  assert.equal(changed,true);assert.notEqual(sha(await fs.readFile(cipher)),m.files[2].cipherSha256);assert.deepEqual(await fs.readdir(target.parent),[]);
});
test('materialization destination readback and unchanged operation deadline are mandatory before success',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f);let corrupted=false;
  await interceptOpen((file,args)=>path.resolve(String(file))===path.join(target.destination,'roles.sql')&&typeof args[0]==='number'&&(args[0]&1)===0,async(_handle,file)=>{
    if(!corrupted){corrupted=true;await fs.appendFile(file,'synthetic tamper');}},async()=>{
    await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f)),e=>['MATERIALIZATION_FILE_CHANGED','MATERIALIZATION_READBACK'].includes(e.code));});
  assert.equal(corrupted,true);
  const next=await targetFor(entry.f),clock=Date.now;let expired=false;
  try{Date.now=()=>clock()+(expired?P.maximumMs+1:0);await interceptOpen(file=>path.resolve(String(file))===path.join(next.destination,'roles.sql'),async handle=>{
      const write=handle.write.bind(handle);handle.write=async(...args)=>{const r=await write(...args);expired=true;return r;};},async()=>{
      await rejectsCode(()=>materializeLocalDatabaseBackup(materialArgs(entry,next),materialDeps(entry.f)),'CARRIER_DEADLINE');});
  }finally{Date.now=clock;}
  assert.equal(expired,true);assert.deepEqual(await fs.readdir(next.parent),[]);
});

test('materialization cleanup reports unknown rather than claiming zero retained entries when final namespace cannot be read',async t=>{
  const entry=await sealed(t),target=await targetFor(entry.f),abort=new AbortController(),originalRead=fs.readdir;let error;
  fs.readdir=async function(file,...args){if(path.resolve(String(file))===target.destination){const e=new Error('synthetic private namespace error');e.code='EIO';throw e;}return originalRead.call(fs,file,...args);};
  try{await interceptOpen(file=>path.resolve(String(file))===path.join(target.destination,'roles.sql'),async handle=>{
    const write=handle.write.bind(handle);handle.write=async(...args)=>{const r=await write(...args);abort.abort();return r;};},async()=>{
    await assert.rejects(()=>materializeLocalDatabaseBackup(materialArgs(entry,target),materialDeps(entry.f,abort.signal)),e=>{error=e;return e.code==='MATERIALIZATION_ABORTED';});});
  }finally{fs.readdir=originalRead;}
  assert.equal(error.materializationCompleted,false);assert.equal(error.cleanup.removedFiles,1);assert.equal(error.cleanup.retainedUnknownEntries,null);assert.equal(error.cleanup.rootRemoved,false);
  assert.deepEqual(await fs.readdir(target.destination),[]);
});
