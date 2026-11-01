// TEST ONLY extension of the unchanged genuine585 DATA host. No issuer,
// source/binding override, admission, PostgreSQL or production authority.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withAuthenticated585PredecessorSource} from '../check-native-original-continuity-predecessor-source.mjs';
const INVENTORY=new URL('./frozen585-account-statistics-assistant-test-host.json',import.meta.url);
const INVENTORY_SHA256='da2d965ff864a232fa9d44680718448932f46724eae51d742507ece13df086df';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HEAD='e8f9f7197d9e262720b7627b4970d3da82baa9d9',TREE='24dbf944916031ea256537b125966e946efeead8';
const ROOTS=Object.freeze(['scripts/verify-account-statistics-assistant-plan.mjs',
  'scripts/account-statistics-assistant-prewrite.mjs','scripts/account-statistics-assistant-runtime-transition.mjs',
  'scripts/sync-ravscore-model-binding.mjs']);
// The closed descriptor was built once from V8's static import/export
// requests over these genuine Git blobs, without linking or evaluating them.
// Computed/dynamic old-source loaders keep their original fixed-source gates;
// this test descriptor is never model identity or runtime admission.
const execute=promisify(callbackExec),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,timeout:30000,maxBuffer:16*1024*1024,
  env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}})).stdout;
const relative=file=>{assert.match(file,/^[A-Za-z0-9_./-]+$/);assert.equal(path.posix.normalize(file),file);
  assert(file!=='.'&&file!=='..'&&!file.startsWith('../')&&!path.posix.isAbsolute(file));return file;};
const fileIdentity=s=>{assert(s.isFile()&&!s.isSymbolicLink()&&s.nlink===1n&&s.ino>0n);return[s.dev,s.ino,s.birthtimeNs,s.size];};
const dirIdentity=s=>{assert(s.isDirectory()&&!s.isSymbolicLink()&&s.ino>0n);return[s.dev,s.ino,s.birthtimeNs];};
async function noLinks(file){let at=path.parse(file).root;for(const leaf of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,leaf);assert(!(await fs.lstat(at)).isSymbolicLink());}}
export async function withFrozen585AccountStatisticsAssistantTestHost(callback){
  assert.equal(arguments.length,1,'No caller source/head/binding or target override');assert.equal(typeof callback,'function');
  const inventoryBytes=await fs.readFile(INVENTORY);assert.equal(sha(inventoryBytes),INVENTORY_SHA256);
  const inventory=JSON.parse(inventoryBytes);
  assert.equal(inventory.schemaVersion,1);assert.equal(inventory.kind,'TEST_ONLY_GENUINE585_ASA_STATIC_CONTROLLER_CLOSURE');
  assert.equal(inventory.head,HEAD);assert.equal(inventory.tree,TREE);assert.deepEqual(inventory.roots,ROOTS);
  assert(Array.isArray(inventory.files)&&inventory.files.length>0&&inventory.files.length<=2048);
  assert.equal(new Set(inventory.files.map(row=>row.file)).size,inventory.files.length);
  assert(Number.isSafeInteger(inventory.sourceBytes)&&inventory.sourceBytes>0&&inventory.sourceBytes<=32*1024*1024);
  assert.equal(inventory.files.reduce((n,row)=>n+row.bytes,0),inventory.sourceBytes);
  for(const file of ROOTS)assert(inventory.files.some(row=>row.file===file));
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const index=new Map(String(await git(['ls-tree','-r','-z',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
    return match?[[relative(match[3]),{mode:match[1],gitBlob:match[2]}]]:[];}));
  for(const row of inventory.files){
    relative(row.file);assert.deepEqual(index.get(row.file),{mode:row.mode,gitBlob:row.gitBlob});
    assert(Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=32*1024*1024);assert.match(row.sha256,/^[a-f0-9]{64}$/);
  }
  return withAuthenticated585PredecessorSource(async sourceRoot=>{
    // The outer normal helper has already executed the actual585 builder
    // --check and qualified the complete unmodified133-leaf DATA host.
    const added=[],directories=new Map();let first,hasFirst=false,result;
    async function ensureDirectory(directory){
      const rel=path.relative(sourceRoot,directory);assert(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel));
      const existing=await fs.lstat(directory,{bigint:true}).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
      if(existing){dirIdentity(existing);return;}
      if(path.dirname(directory)!==sourceRoot)await ensureDirectory(path.dirname(directory));
      await fs.mkdir(directory);directories.set(directory,dirIdentity(await fs.lstat(directory,{bigint:true})));
    }
    async function leaf(file,pin=null){
      relative(file);assert(index.has(file),'Fixed genuine585 Git leaf required');
      const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+file]));
      if(pin){assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);}
      const target=path.join(sourceRoot,file);
      const present=await fs.lstat(target,{bigint:true}).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
      // All existing static leaves must ALSO be the genuine whole Git bytes.
      // The separate assertion-only leaf is not in this static Git closure.
      if(present){await noLinks(target);fileIdentity(present);assert.deepEqual(await fs.readFile(target),raw);return;}
      await ensureDirectory(path.dirname(target));await noLinks(path.dirname(target));
      await fs.writeFile(target,raw,{flag:'wx',mode:0o600});
      added.push({target,raw,identity:fileIdentity(await fs.lstat(target,{bigint:true}))});
    }
    try{
      for(const pin of inventory.files)await leaf(pin.file,pin);
      const readiness=await import(pathToFileURL(path.join(sourceRoot,'scripts/integrated-cutover-readiness.mjs')).href);
      const required=readiness.accountStatisticsAssistantRequiredMigrations();
      assert.equal(required.length,54);assert.equal(required.at(-1).version,'20261019100000');
      assert.equal(new Set(required.map(row=>row.filename)).size,54);
      for(const row of required)await leaf('supabase/migrations/'+row.filename);
      // Normal plan checks need all54 genuine SQL filenames, not merely the
      // ten canonical-chain operands already present in the DATA host.
      await readiness.inspectMigrationSources({sourcePhase:'account-statistics-assistant'});
      for(const row of added){await noLinks(row.target);assert.deepEqual(fileIdentity(await fs.lstat(row.target,{bigint:true})),row.identity);
        assert.deepEqual(await fs.readFile(row.target),row.raw);}
      result=await callback(sourceRoot);
    }catch(error){first=error;hasFirst=true;}
    try{
      for(const row of [...added].reverse()){await noLinks(row.target);
        assert.deepEqual(fileIdentity(await fs.lstat(row.target,{bigint:true})),row.identity);
        assert.deepEqual(await fs.readFile(row.target),row.raw);await fs.unlink(row.target);}
      for(const directory of [...directories.keys()].sort((a,b)=>b.length-a.length)){
        await noLinks(directory);assert.deepEqual(dirIdentity(await fs.lstat(directory,{bigint:true})),directories.get(directory));
        await fs.rmdir(directory);}
    }catch(error){if(!hasFirst){first=error;hasFirst=true;}}
    if(hasFirst)throw first;return result;
  });
}
