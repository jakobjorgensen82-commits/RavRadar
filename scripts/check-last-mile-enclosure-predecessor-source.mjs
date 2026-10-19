// Archive-only readers for the exact current140000 producer. No caller source/head override.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';

const execute=promisify(callbackExec);
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEAD='d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7';
const TREE='0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0';
const INVENTORY=new URL('./lib/last-mile-enclosure-predecessor-source-inventory.json',import.meta.url);
const INVENTORY_SHA256='8a35db217041ddfb2f14fb2da76b09af427367989ec67bad7a4fef72d34c0e45';
const SCANNER='scripts/lib/static-module-closure.mjs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const inside=(root,file)=>{const value=path.relative(root,file);return value&&value!=='..'&&!value.startsWith('..'+path.sep)&&!path.isAbsolute(value);};
const env=()=>({...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
  GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
  GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'});
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],
  {encoding,env:env(),timeout:30000,maxBuffer:16*1024*1024})).stdout;

function relative(value){
  assert.equal(typeof value,'string');assert.match(value,/^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(value),value);
  assert(value!=='.'&&value!=='..'&&!value.startsWith('../')&&!path.posix.isAbsolute(value));
  return value;
}
function canonical(value){
  if(Array.isArray(value))return value.map(canonical);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])]));
}
const normalizedModelSource=text=>String(text).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')
  .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g,'$1<release-version>');
function nodeIdentity(stat,directory){
  assert(!stat.isSymbolicLink()&&(directory?stat.isDirectory():stat.isFile()));
  assert(stat.ino>0n&&(!directory?stat.nlink===1n:true));
  return [stat.dev,stat.ino,stat.birthtimeNs];
}
async function noLinks(file){
  let at=path.parse(file).root;
  for(const part of path.relative(at,file).split(path.sep).filter(Boolean)){
    at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink(),'Frozen reader source must not traverse links');
  }
}
function directories(files){
  const result=new Set();
  for(const file of files){let directory=path.posix.dirname(file);while(directory!=='.'){
    result.add(directory);directory=path.posix.dirname(directory);
  }}
  return [...result].sort((a,b)=>a.split('/').length-b.split('/').length||a.localeCompare(b));
}
async function fixedSource(){
  const inventoryBytes=await fs.readFile(INVENTORY);
  assert.equal(sha(inventoryBytes),INVENTORY_SHA256,'Whole fixed reader inventory');
  const inventory=JSON.parse(inventoryBytes);
  assert.equal(inventory.schemaVersion,1);
  assert.equal(inventory.kind,'FIXED_GENUINE_LAST_MILE_ENCLOSURE_PREDECESSOR_SOURCE');
  assert.equal(inventory.head,HEAD);assert.equal(inventory.tree,TREE);
  assert.equal(inventory.maximumFiles,105);assert.equal(inventory.maximumTotalBytes,2319125);
  assert.equal(inventory.maximumFileBytes,121860);
  assert.equal(String(await git(['cat-file','-t',HEAD],'utf8')).trim(),'commit');
  assert.equal(String(await git(['rev-parse',HEAD+'^{commit}'],'utf8')).trim(),HEAD);
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const index=new Map(String(await git(['ls-tree','-r','-z','--full-tree',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);
    return match?[[relative(match[3]),match[2]]]:[];
  }));
  const rows=new Map(),content=new Map();
  assert.equal(inventory.files.length,105);
  let total=0;
  for(const row of inventory.files){
    const file=relative(row.file);assert(!rows.has(file),'Duplicate fixed reader leaf');
    assert.equal(index.get(file),row.gitBlob,'Exact regular Git blob: '+file);
    assert.match(row.sha256,/^[a-f0-9]{64}$/);assert(Number.isSafeInteger(row.bytes)&&row.bytes>0&&row.bytes<=121860);
    const value=Buffer.from(await git(['cat-file','blob',HEAD+':'+file]));
    assert.equal(value.length,row.bytes,'Exact fixed reader size: '+file);
    assert.equal(sha(value),row.sha256,'Exact fixed reader bytes: '+file);
    total+=value.length;rows.set(file,row);content.set(file,value);
  }
  assert.equal(total,2319125);
  const required=new Set(inventory.seeds.map(relative));
  for(const entry of inventory.manifests){
    assert.equal(sha(content.get(entry.file)),entry.sha256,'Genuine old model module');
    const generated=await import('data:text/javascript;base64,'+content.get(entry.file).toString('base64'));
    const manifest=generated.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST;
    assert.equal(generated.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,entry.binding);
    assert.equal(manifest.files.length,entry.count);
    const candidate=entry.file.startsWith('scripts/');
    assert.equal(sha(JSON.stringify(candidate?manifest:canonical(manifest))),entry.binding,'Genuine old manifest binding');
    const paths=new Set();
    for(const row of manifest.files){
      const file=relative(candidate?row.file:row.path);assert(!paths.has(file));paths.add(file);
      assert(content.has(file),'Manifest leaf must be in exact closure: '+file);
      assert.equal(sha(normalizedModelSource(content.get(file).toString('utf8'))),row.sha256,'Genuine old normalized model leaf: '+file);
      required.add(file);
    }
  }
  const tSource=content.get(inventory.t.module).toString('utf8');
  const match=/export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(tSource);
  assert(match,'Exact genuine T declaration');
  const tFiles=[...match[1].matchAll(/  '([^']+)',\n/g)].map(item=>relative(item[1]));
  assert.equal(tFiles.length,12);assert.deepEqual(tFiles,inventory.t.files);
  for(const file of tFiles)required.add(file);
  const scanner=await import('data:text/javascript;base64,'+content.get(SCANNER).toString('base64'));
  const pending=[...required],visited=new Set();
  while(pending.length){
    const file=pending.pop();if(visited.has(file))continue;visited.add(file);
    assert(content.has(file),'Fixed source dependency absent: '+file);
    const row=rows.get(file);
    if(!/\.(js|mjs|ts)$/.test(file)){assert.equal(row.imports,null);continue;}
    const reviewed=inventory.reviewedFixedImportInventories[file];
    // Four reviewed inventories are selected by exact old blob identity, never by scanner failure.
    const imports=reviewed
      ?(assert.equal(sha(content.get(file)),reviewed.sha256),reviewed.imports)
      :scanner.exactRelativeModuleSpecifiers(content.get(file).toString('utf8'),file);
    assert.deepEqual(imports,row.imports,'Whole fixed module import inventory: '+file);
    for(const specifier of imports){
      const base=relative(path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0])));
      const choices=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
      const target=choices.find(value=>index.has(value));assert(target,'Fixed module import must resolve: '+file);
      assert(content.has(target),'Undeclared fixed module import: '+target);pending.push(target);
    }
  }
  assert.deepEqual([...visited].sort(),[...rows.keys()].sort(),'No arbitrary old repository copy');
  return {inventory,rows,content,files:[...rows.keys()].sort()};
}
async function exactTree(root,source,owned,complete){
  const seen=new Set(),seenDirectories=new Set();
  async function visit(directory,prefix=''){
    for(const name of await fs.readdir(directory)){
      const rel=prefix?prefix+'/'+name:name,file=path.resolve(directory,name);
      assert(inside(root,file),'Reader tree escaped owned root');
      const stat=await fs.lstat(file,{bigint:true});
      assert(!stat.isSymbolicLink(),'Reader tree contains a link');
      if(stat.isDirectory()){
        assert(owned.directories.has(rel),'Unknown reader directory retained');
        assert.deepEqual(nodeIdentity(stat,true),owned.directories.get(rel),'Reader directory identity changed');
        seenDirectories.add(rel);await visit(file,rel);
      }else{
        assert(owned.files.has(rel)&&source.content.has(rel),'Unknown reader leaf retained');
        assert.deepEqual(nodeIdentity(stat,false),owned.files.get(rel),'Reader leaf identity changed');
        assert.deepEqual(await fs.readFile(file),source.content.get(rel),'Fixed reader source changed');
        seen.add(rel);
      }
    }
  }
  await visit(root);
  assert.deepEqual([...seen].sort(),[...owned.files.keys()].sort(),'Owned reader leaf missing');
  assert.deepEqual([...seenDirectories].sort(),[...owned.directories.keys()].sort(),'Owned reader directory missing');
  if(complete)assert.deepEqual([...seen].sort(),source.files);
}
async function validateReadContracts(root,source){
  const continuation=await import(pathToFileURL(path.join(root,source.inventory.t.module)).href);
  assert.equal(await continuation.ravScoreContinuationImplementationSha256({repositoryRoot:root}),source.inventory.t.sha256,
    'Genuine fixed140000 continuation implementation');
  const workflow=await import(pathToFileURL(path.join(root,'scripts/private-production-runtime-workflow.mjs')).href);
  assert.deepEqual(await workflow.privateRuntimeContractHashes({repositoryRoot:root}),source.inventory.runtimeContracts,
    'Genuine fixed140000 persisted runtime contracts');
  const bundle=await import(pathToFileURL(path.join(root,'scripts/private-production-runtime-bundle.mjs')).href);
  const checkpoint=await import(pathToFileURL(path.join(root,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);
  const localCheckpoint=await import(pathToFileURL(path.join(root,'scripts/ravscore-continuation-checkpoint.mjs')).href);
  for(const value of [bundle.verifyPrivateProductionRuntimeBundle,workflow.buildPrivateRuntimeExpectation,
    checkpoint.restoreProtectedRavScoreContinuationCheckpoint,localCheckpoint.loadRavScoreContinuationCheckpointForTarget])
    assert.equal(typeof value,'function','Genuine old archive-reader export required');
}
export async function withFrozenLastMileEnclosurePredecessorSource(callback){
  assert.equal(arguments.length,1,'No caller head/path/model override');assert.equal(typeof callback,'function');
  const source=await fixedSource(),parent=await fs.realpath(os.tmpdir());
  await noLinks(parent);
  const prefix='rr-last-mile-enclosure-source-',root=await fs.mkdtemp(path.join(parent,prefix));
  const owned={root:null,directories:new Map(),files:new Map()};
  let result,first,complete=false;
  try{
    assert.equal(path.dirname(root),parent);assert.equal(await fs.realpath(root),root);await noLinks(root);
    owned.root=nodeIdentity(await fs.lstat(root,{bigint:true}),true);
    for(const directory of directories(source.files)){
      const target=path.resolve(root,directory);assert(inside(root,target));
      await fs.mkdir(target,{mode:0o700});
      owned.directories.set(directory,nodeIdentity(await fs.lstat(target,{bigint:true}),true));
    }
    for(const file of source.files){
      const target=path.resolve(root,file);assert(inside(root,target));
      await fs.writeFile(target,source.content.get(file),{flag:'wx',mode:0o600});
      owned.files.set(file,nodeIdentity(await fs.lstat(target,{bigint:true}),false));
    }
    complete=true;await exactTree(root,source,owned,true);
    await validateReadContracts(root,source);await exactTree(root,source,owned,true);
    // Callback may authenticate the actual B and actual older S separately.
    // Nothing here grants old numeric-origin admission, builds S from B, or asserts B/S/public parity.
    result=await callback(root);await exactTree(root,source,owned,true);
  }catch(error){first=error;}
  try{
    assert(owned.root,'Owned reader root identity required before cleanup');
    await noLinks(root);assert.equal(path.dirname(root),parent);assert.equal(await fs.realpath(root),root);
    assert(path.basename(root).startsWith(prefix));
    assert.deepEqual(nodeIdentity(await fs.lstat(root,{bigint:true}),true),owned.root,'Reader root identity changed');
    await exactTree(root,source,owned,complete);
    for(const file of [...owned.files.keys()].sort()){
      const target=path.join(root,file);
      assert.deepEqual(nodeIdentity(await fs.lstat(target,{bigint:true}),false),owned.files.get(file));
      await fs.unlink(target);
    }
    for(const directory of [...owned.directories.keys()].sort((a,b)=>b.split('/').length-a.split('/').length||b.localeCompare(a))){
      const target=path.join(root,directory);
      assert.deepEqual(nodeIdentity(await fs.lstat(target,{bigint:true}),true),owned.directories.get(directory));
      await fs.rmdir(target);
    }
    assert.deepEqual(nodeIdentity(await fs.lstat(root,{bigint:true}),true),owned.root);await fs.rmdir(root);
  }catch(error){first=first?new AggregateError([first,error],'Frozen reader failed; cleanup stopped safely'):error;}
  if(first)throw first;return result;
}
