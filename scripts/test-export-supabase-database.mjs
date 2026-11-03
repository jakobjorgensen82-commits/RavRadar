import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {SUPABASE_DB_EXPORT_POLICY as P,exportSupabaseDatabase as run} from './export-supabase-database.mjs';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const fixtureBytes=name=>Buffer.from('-- synthetic private '+name+'\nSELECT 123456789012345678901234567890;\n');
async function host(t){
  const temp=path.resolve(os.tmpdir()),root=await fs.mkdtemp(path.join(temp,'ravradar-db-export-test-'));
  t.after(async()=>{assert.ok(path.resolve(root).startsWith(temp+path.sep+'ravradar-db-export-test-'));
    assert.equal((await fs.lstat(root)).isSymbolicLink(),false);await fs.rm(root,{recursive:true,force:false});});return root;
}
function transport(temp,behavior={}){
  const env={RUNNER_TEMP:temp,PATH:'synthetic-pinned-cli-path',SUPABASE_ACCESS_TOKEN:'synthetic-access-never-real',SUPABASE_DB_PASSWORD:'synthetic-password-never-real',
    SUPABASE_SERVICE_ROLE_KEY:'must-not-reach-dump-process',NODE_OPTIONS:'must-not-reach-child',PGHOST:'must-not-retarget',GITHUB_TOKEN:'must-not-reach-child'};
  const processImpl=Object.assign(new EventEmitter(),{platform:'linux',versions:{node:'24.19.0'}}),calls=[],groups=new Map(),signals=[];let time=0,pid=10000;
  const stageOf=args=>args[0]==='--version'?'version':args[0]==='link'?'link':path.basename(args[args.indexOf('--file')+1]);
  const spawnImpl=(command,args,options)=>{
    const stage=stageOf(args),child=Object.assign(new EventEmitter(),{pid:++pid,stdout:new PassThrough(),stderr:new PassThrough(),unref(){this.unreferenced=true;}});
    const group={child,alive:true,closed:false,stage};groups.set(child.pid,group);calls.push({command,args:[...args],options,stage,child});
    const finish=(code=0,signal=null,alive=false)=>{group.alive=alive;group.closed=true;child.stdout.end();child.stderr.end();child.emit('exit',code,signal);child.emit('close',code,signal);};
    group.finish=finish;
    queueMicrotask(async()=>{
      try{
        if(behavior.spawnError===stage){group.alive=false;child.emit('error',new Error('synthetic private spawn error'));group.closed=true;child.emit('close');return;}
        if(behavior.hang===stage)return;
        if(stage==='version')child.stdout.write(behavior.version??'2.117.0\n');
        else{
          child.stdout.write('synthetic private output must never be returned\n');child.stderr.write('synthetic private error detail must never be returned\n');
          if(stage!=='link'){
            const file=args[args.indexOf('--file')+1];
            if(behavior.makeDirectory===stage)await fs.mkdir(file);
            else if(behavior.hardlink===stage){const source=path.join(path.dirname(options.cwd),'home','link-source');await fs.writeFile(source,fixtureBytes(stage),{mode:0o600});await fs.link(source,file);}
            else await fs.writeFile(file,behavior.empty===stage?'':behavior.oversize===stage?Buffer.alloc(129):fixtureBytes(stage),{mode:0o600,flag:'wx'});
            if(behavior.replaceCompleted===stage){const roles=path.join(path.dirname(file),'roles.sql');await fs.rename(roles,path.join(path.dirname(options.cwd),'home','original-roles.sql'));await fs.writeFile(roles,fixtureBytes('roles.sql'),{mode:0o600,flag:'wx'});}
            if(behavior.unexpected===stage)await fs.writeFile(path.join(path.dirname(file),'dump.log'),'must-not-be-created',{mode:0o600});
          }
        }
        if(behavior.overflow===stage)child.stderr.write(Buffer.alloc(P.maximumDiagnosticBytes+1,65));
        if(behavior.interrupt===stage){processImpl.emit('SIGTERM');return;}
        finish(behavior.fail===stage?1:0,null,behavior.descendants===stage);
      }catch(e){group.alive=false;group.closed=true;child.emit('error',e);child.emit('close');}
    });return child;
  };
  const killImpl=(negativePid,signal)=>{
    assert.ok(negativePid<0,'only this newly-owned process group is signalled');const group=groups.get(-negativePid);
    if(!group?.alive){const e=new Error('gone');e.code='ESRCH';throw e;}
    if(signal===0)return;signals.push({stage:group.stage,signal});
    if(behavior.unstoppable===group.stage)return;
    if(signal==='SIGTERM'&&behavior.forceKill===group.stage)return;
    group.finish(null,signal,false);
  };
  const delay=async ms=>{time+=behavior.hang?Math.max(ms,100_000):ms;await new Promise(resolve=>setImmediate(resolve));};
  return{env,calls,signals,groups,processImpl,dependencies:()=>({env,spawnImpl,killImpl,processImpl,now:()=>time,delay})};
}
async function rejected(f,options,reason){
  let error;await assert.rejects(()=>run(options,f.dependencies()),e=>{error=e;return e.code==='SUPABASE_DB_EXPORT_FAILED'&&e.reason===reason;});
  const safe=JSON.stringify({...error,message:error.message});assert.ok(!safe.includes('synthetic-password')&&!safe.includes('synthetic private error detail'));return error;
}

test('normal fixed CLI/link and five file exports: actual args, private files, hashes, final reread and no false restore authority',async t=>{
  const dir=await host(t),f=transport(dir),result=await run({},f.dependencies());assert.equal(f.calls.length,7);
  const [version,link,...dumps]=f.calls;assert.equal(version.command,'supabase');assert.deepEqual(version.args,['--version']);
  assert.deepEqual(link.args,['link','--project-ref','afqhhdrkjfjtpadntdzo']);
  const expected=[['roles.sql',['--role-only']],['schema.sql',[]],['data.sql',['--data-only','--use-copy']],
    ['history-schema.sql',['--schema','supabase_migrations']],['history-data.sql',['--schema','supabase_migrations','--data-only','--use-copy']]];
  for(let i=0;i<expected.length;i++){
    const [name,flags]=expected[i],call=dumps[i],file=path.join(result.workdir,'exports',name);
    assert.deepEqual(call.args,['db','dump','--linked',...flags,'--file',file]);assert.ok((await fs.readFile(file)).equals(fixtureBytes(name)));
  }
  for(const call of f.calls){
    assert.equal(call.options.shell,false);assert.equal(call.options.detached,true);assert.equal(call.options.windowsHide,true);assert.deepEqual(call.options.stdio,['ignore','pipe','pipe']);
    assert.equal(call.options.env.SUPABASE_DB_PASSWORD,'synthetic-password-never-real');assert.equal(call.options.env.SUPABASE_ACCESS_TOKEN,'synthetic-access-never-real');
    assert.ok(!call.args.join(' ').includes('synthetic-password'));for(const key of ['NODE_OPTIONS','SUPABASE_SERVICE_ROLE_KEY','PGHOST','GITHUB_TOKEN','RUNNER_TEMP'])assert.equal(call.options.env[key],undefined);
    assert.ok(call.options.cwd.startsWith(result.workdir+path.sep));
  }
  const receipt=JSON.parse(await fs.readFile(result.receipt,'utf8'));assert.equal(receipt.cliVersion,'2.117.0');assert.equal(receipt.project,'afqhhdrkjfjtpadntdzo');assert.equal(receipt.files.length,5);
  for(const entry of receipt.files){const s=await fs.lstat(path.join(result.workdir,'exports',entry.file),{bigint:true});
    assert.equal(entry.dev,String(s.dev));assert.equal(entry.ino,String(s.ino));assert.equal(s.nlink,1n);assert.equal(entry.sha256,sha(fixtureBytes(entry.file)));assert.equal(entry.bytes,fixtureBytes(entry.file).length);
    if(process.platform==='linux')assert.equal(Number(s.mode&0o077n),0);
  }
  assert.equal(result.authRestoreVerified,false);assert.equal(result.fullDatabaseBackupVerified,false);assert.equal(result.archiveUploaded,false);assert.equal(result.freeReady,false);assert.equal(receipt.atomicDatabaseSnapshot,false);
  assert.ok(!JSON.stringify(receipt).includes('SELECT')&&!JSON.stringify(receipt).includes('synthetic-password')&&!JSON.stringify(result).includes('synthetic private output'));
  assert.ok(receipt.processes.every(x=>x.processGroupTerminated));assert.deepEqual((await fs.readdir(path.join(result.workdir,'exports'))).sort(),expected.map(x=>x[0]).sort());
});
test('missing existing credentials fail before any child or operation root',async t=>{
  const dir=await host(t),f=transport(dir);delete f.env.SUPABASE_DB_PASSWORD;await rejected(f,{},'EXISTING_CREDENTIALS_REQUIRED');assert.equal(f.calls.length,0);assert.deepEqual(await fs.readdir(dir),[]);
});
test('actual default execution requires Linux, even though synthetic process seams can be exercised on Windows',async t=>{
  const f=transport(await host(t));f.processImpl.platform='win32';await rejected(f,{},'LINUX_NODE24_REQUIRED');assert.equal(f.calls.length,0);
});
test('runtime preflight rejects pre-24 and unknown injected runtimes before temp access or any CLI start',async t=>{
  for(const versions of [{node:'22.21.1'},{node:'23.11.0'},undefined,null,{}, {node:''},{node:'unknown'},{node:24}]){
    const dir=await host(t),f=transport(dir);f.processImpl.versions=versions;let tempReads=0;
    Object.defineProperty(f.env,'RUNNER_TEMP',{get(){tempReads++;return dir;}});
    const e=await rejected(f,{},'LINUX_NODE24_REQUIRED');assert.equal(e.stage,'PREFLIGHT');assert.equal(e.externalDumpOutcome,'NOT_STARTED');
    assert.equal(tempReads,0);assert.equal(f.calls.length,0);assert.deepEqual(await fs.readdir(dir),[]);
  }
});

test('omitting processImpl keeps the actual host runtime as the production default',async t=>{
  const dir=await host(t),f=transport(dir),dependencies=f.dependencies();delete dependencies.processImpl;delete f.env.SUPABASE_DB_PASSWORD;
  const reason=process.platform==='linux'&&Number(process.versions.node.split('.')[0])>=24?'EXISTING_CREDENTIALS_REQUIRED':'LINUX_NODE24_REQUIRED';
  await assert.rejects(()=>run({},dependencies),e=>e.code==='SUPABASE_DB_EXPORT_FAILED'&&e.reason===reason);
  assert.equal(f.calls.length,0);assert.deepEqual(await fs.readdir(dir),[]);
});

test('a different CLI version never reaches link or dump',async t=>{
  const f=transport(await host(t),{version:'2.118.0\n'});await rejected(f,{},'CLI_VERSION');assert.equal(f.calls.length,1);
});
test('link failure retains safe metadata only and never proceeds to exports or retries',async t=>{
  const f=transport(await host(t),{fail:'link'}),e=await rejected(f,{},'CHILD_EXIT');assert.equal(f.calls.length,2);
  const receipt=JSON.parse(await fs.readFile(path.join(e.workdir,'failure-receipt.json'),'utf8'));assert.equal(receipt.stage,'LINK');assert.equal(receipt.automaticRetry,false);assert.equal(receipt.externalDumpOutcome,'NOT_STARTED');assert.ok(!JSON.stringify(receipt).includes('synthetic private'));
});
test('a failed dump stops the sequence once, retains partial files and claims no Docker-daemon termination',async t=>{
  const f=transport(await host(t),{fail:'schema.sql'}),e=await rejected(f,{},'CHILD_EXIT');assert.equal(f.calls.length,4);assert.equal(e.externalDumpOutcome,'UNKNOWN');assert.equal(e.processGroupTerminated,true);
  assert.ok((await fs.readFile(path.join(e.workdir,'exports','roles.sql'))).equals(fixtureBytes('roles.sql')));assert.ok(!(await fs.readdir(path.join(e.workdir,'exports'))).includes('data.sql'));
});
test('timeout terminates the owned group and stops all subsequent dump commands',async t=>{
  const f=transport(await host(t),{hang:'roles.sql'}),e=await rejected(f,{},'TIMEOUT');assert.equal(f.calls.length,3);assert.equal(e.processGroupTerminated,true);assert.equal(e.externalDumpOutcome,'UNKNOWN');assert.deepEqual(f.signals,[{stage:'roles.sql',signal:'SIGTERM'}]);
});
test('a closed parent with a surviving descendant requires verified TERM then KILL, never an export success',async t=>{
  const f=transport(await host(t),{descendants:'roles.sql',forceKill:'roles.sql'}),e=await rejected(f,{},'DESCENDANTS_REMAIN');assert.equal(e.processGroupTerminated,true);assert.deepEqual(f.signals.map(x=>x.signal),['SIGTERM','SIGKILL']);assert.equal(f.calls.length,3);
});
test('unknown process lifetime remains unconfirmed and partial data is not cleaned or retried',async t=>{
  const f=transport(await host(t),{hang:'roles.sql',unstoppable:'roles.sql'}),e=await rejected(f,{},'TIMEOUT');assert.equal(e.processGroupTerminated,false);assert.equal(f.calls.length,3);assert.equal(f.calls[2].child.unreferenced,true);
  assert.equal((await fs.lstat(e.workdir)).isDirectory(),true);assert.deepEqual(f.signals.map(x=>x.signal),['SIGTERM','SIGKILL']);
});
test('private diagnostic overflow is bounded and never returned as raw text',async t=>{
  const f=transport(await host(t),{overflow:'link'});await rejected(f,{},'STDERR_BOUND');assert.equal(f.calls.length,2);
});
test('file and total byte ceilings can only be tightened and stop before the next export',async t=>{
  const dir=await host(t),f=transport(dir,{oversize:'roles.sql'});await rejected(f,{fileByteLimit:128},'OUTPUT_FILE_BOUND');assert.equal(f.calls.length,3);
  const next=transport(dir);await rejected(next,{totalByteLimit:1},'OUTPUT_TOTAL_BOUND');assert.equal(next.calls.length,3);
  const invalid=transport(dir);await rejected(invalid,{fileByteLimit:P.maximumFileBytes+1},'BYTE_LIMITS');assert.equal(invalid.calls.length,0);
});
test('an empty or directory-shaped SQL output is never a completed export',async t=>{
  const dir=await host(t),empty=transport(dir,{empty:'roles.sql'});await rejected(empty,{},'OUTPUT_EMPTY');assert.equal(empty.calls.length,3);
  const directory=transport(dir,{makeDirectory:'roles.sql'});await rejected(directory,{},'OUTPUT_FILE_TYPE_OR_LINK');assert.equal(directory.calls.length,3);
});
test('a hardlinked output is rejected using real filesystem link count',async t=>{
  const f=transport(await host(t),{hardlink:'roles.sql'});await rejected(f,{},'OUTPUT_FILE_TYPE_OR_LINK');assert.equal(f.calls.length,3);
});
test('replacement of a completed file fails even with identical logical bytes',async t=>{
  const f=transport(await host(t),{replaceCompleted:'schema.sql'});const e=await rejected(f,{},'OUTPUT_IDENTITY_CHANGED');assert.equal(f.calls.length,4);assert.equal(e.externalDumpOutcome,'UNKNOWN');
});
test('unexpected output including a dump log is refused',async t=>{
  const f=transport(await host(t),{unexpected:'roles.sql'});await rejected(f,{},'UNEXPECTED_OUTPUT');assert.equal(f.calls.length,3);
});
test('RUNNER_TEMP inside a repository is not an export destination',async t=>{
  const dir=await host(t);await fs.writeFile(path.join(dir,'.git'),'synthetic worktree marker');const f=transport(dir);await rejected(f,{},'DIRECTORY_INSIDE_REPOSITORY');assert.equal(f.calls.length,0);
});
test('a symlink or Windows junction in the temp path is rejected before child creation',async t=>{
  const dir=await host(t),target=path.join(dir,'target'),link=path.join(dir,'link');await fs.mkdir(target);await fs.symlink(target,link,process.platform==='win32'?'junction':'dir');
  t.after(async()=>{await fs.unlink(link).catch(()=>{});});const f=transport(link);await rejected(f,{},'DIRECTORY_LINK_OR_TYPE');assert.equal(f.calls.length,0);
});
test('parent interruption uses the same bounded group stop and never advances',async t=>{
  const f=transport(await host(t),{interrupt:'roles.sql'}),e=await rejected(f,{},'INTERRUPTED');assert.equal(e.processGroupTerminated,true);assert.equal(f.calls.length,3);assert.deepEqual(f.signals,[{stage:'roles.sql',signal:'SIGTERM'}]);
});
