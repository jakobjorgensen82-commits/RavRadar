#!/usr/bin/env node
// TEST ONLY. Exact issued584 source oracles, not CURRENT585 admission or PG reuse.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEAD='ee029982538c67dea39880bc7b33f3508c10cf9c',TREE='400babda9377e43ea7ee1444008f7accd1aded32';
const INVENTORY=new URL('./lib/frozen584-normal-source-target-inventory.json',import.meta.url);
const INVENTORY_SHA256='d0bcf846ae7c8474f471cc2f0f41aebcc1f67b11a394d229e6a7220c5ef08e9f';
const execute=promisify(callbackExec),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,timeout:30000,maxBuffer:4*1024*1024,
  env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'}})).stdout;
function relative(file){assert.match(file,/^[A-Za-z0-9_./-]+$/);assert.equal(path.posix.normalize(file),file);
  assert(!path.posix.isAbsolute(file)&&file!=='.'&&file!=='..'&&!file.startsWith('../'));return file;}
const identity=stat=>{assert(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.ino>0n);return[stat.dev,stat.ino,stat.birthtimeNs];};
async function noLinks(file){let at=path.parse(file).root;for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,piece);assert(!(await fs.lstat(at)).isSymbolicLink());}}
async function exactTree(root,inventory){const expected=new Map(inventory.files.map(row=>[row.file,row])),found=new Set();
  async function visit(directory,prefix=''){
    for(const name of await fs.readdir(directory)){const rel=prefix?prefix+'/'+name:name,file=path.join(directory,name),stat=await fs.lstat(file);
      assert(!stat.isSymbolicLink());
      if(stat.isDirectory()){assert(inventory.files.some(row=>row.file.startsWith(rel+'/')),'Unknown directory is retained');await visit(file,rel);}
      else{const pin=expected.get(rel);assert(pin&&stat.isFile()&&stat.nlink===1,'Unknown source leaf is retained');
        const bytes=await fs.readFile(file);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);found.add(rel);}}
  }await visit(root);assert.deepEqual([...found].sort(),[...expected.keys()].sort());
}
export async function runFrozen584NormalSourceTargets(){
  assert.equal(arguments.length,0,'No caller root/head/source/grant or target override');
  const bytes=await fs.readFile(INVENTORY);assert.equal(sha(bytes),INVENTORY_SHA256);
  const inventory=JSON.parse(bytes);assert.equal(inventory.schemaVersion,1);
  assert.equal(inventory.kind,'EXACT_ISSUED584_NORMAL_SOURCE_TARGET_INVENTORY');
  assert.equal(inventory.head,HEAD);assert.equal(inventory.tree,TREE);
  assert.equal(inventory.migrations.length,53);assert.equal(new Set(inventory.migrations).size,53);
  assert.equal(inventory.targets.length,3);assert.equal(inventory.builder,'scripts/build-last-mile-enclosure-successor.mjs');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const blobs=new Map(String(await git(['ls-tree','-r','-z','--full-tree',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);return match?[[relative(match[3]),match[2]]]:[];}));
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-frozen584-normal-source-',root=await fs.mkdtemp(path.join(parent,prefix));
  assert.equal(path.dirname(root),parent);assert.equal(await fs.realpath(root),root);const owned=identity(await fs.lstat(root,{bigint:true}));
  let succeeded=false;
  try{
    assert.equal(new Set(inventory.files.map(row=>row.file)).size,inventory.files.length);
    for(const pin of inventory.files){relative(pin.file);assert.equal(blobs.get(pin.file),pin.gitBlob);
      const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+pin.file]));assert.equal(raw.length,pin.bytes);assert.equal(sha(raw),pin.sha256);
      const target=path.join(root,pin.file);assert(path.relative(root,target)&&!path.relative(root,target).startsWith('..'));
      await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,raw,{flag:'wx',mode:0o600});}
    await exactTree(root,inventory);
    const readiness=await import(pathToFileURL(path.join(root,'scripts/integrated-cutover-readiness.mjs')).href);
    assert.equal(readiness.REQUIRED_CUTOVER_MIGRATIONS.length,53);
    assert.equal(readiness.LATEST_REQUIRED_CUTOVER_MIGRATION.version,'20261019060000');
    assert.deepEqual(readiness.REQUIRED_CUTOVER_MIGRATIONS.map(row=>'supabase/migrations/'+row.filename),inventory.migrations);
    const before=await readiness.inspectMigrationSources();assert(before);
    const builder=await execute(process.execPath,[path.join(root,inventory.builder),'--check'],
      {cwd:root,env:environment(),timeout:60000,maxBuffer:2*1024*1024});
    assert.equal(builder.stdout.trim(),'Exact last-mile producer successor source verified; no installation or state admission.');
    process.stdout.write(builder.stdout);if(builder.stderr)process.stderr.write(builder.stderr);
    const targets=await execute(process.execPath,['--test','--test-concurrency=1',...inventory.targets.map(file=>path.join(root,file))],
      {cwd:root,env:environment(),timeout:5*60000,maxBuffer:4*1024*1024});
    assert(!/# (?:skipped|cancelled|fail) [1-9][0-9]*/.test(targets.stdout),'No old assertions skipped or failed');
    assert.match(targets.stdout,/# tests [1-9][0-9]*\r?\n/);
    process.stdout.write(targets.stdout);if(targets.stderr)process.stderr.write(targets.stderr);
    await exactTree(root,inventory);succeeded=true;
    console.log(JSON.stringify({kind:'GENUINE_FROZEN584_NORMAL_SOURCE_TARGETS',head:HEAD,tree:TREE,
      migrations:53,sourceLeaves:inventory.files.length,normalBuilderCheckExecuted:true,unchangedTargetFiles:inventory.targets,
      current585Admission:false,postgresExecuted:false,nationalFullJob:false,productionAuthority:false}));
  }catch(error){console.error(JSON.stringify({kind:'FROZEN584_NORMAL_SOURCE_TARGETS_STOPPED',ownedSourceRoot:root,
    code:error.code??null,message:typeof error.message==='string'?error.message.slice(0,500):'UNKNOWN',fixtureRetained:true}));throw error;}
  finally{if(succeeded){
    await noLinks(root);assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),parent);assert(path.basename(root).startsWith(prefix));
    assert.deepEqual(identity(await fs.lstat(root,{bigint:true})),owned);await exactTree(root,inventory);
    // The exact owned source inventory and physical root were just rechecked.
    await fs.rm(root,{recursive:true,force:false});
  }}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);assert.equal(process.argv[2],'source');await runFrozen584NormalSourceTargets();
}
