// TEST ONLY fixed current-grid source context for the existing release metadata
// fixture assertions. No caller source/head/binding/SQL override or admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HEAD='877b9b8696d779961721250cad985c346e0a02ae';
const TREE='dae8a01027fd4dd0908242b3345e63da832b211b';
const INVENTORY=new URL('./frozen-current-grid-release-metadata-test-source.json',import.meta.url);
const INVENTORY_SHA256='ab9d31a066e4d8acce58799cabed2081073647ecbb8afd596336baf4fb55238a';
const TARGET='scripts/test-release-contract-metadata.mjs';
const TARGET_SHA256='9df70277356191179e3357da694f50d48d154402f876ccc3cc3e9586bb46732d';
const SCANNER='scripts/lib/static-module-closure.mjs';
const execute=promisify(callbackExec),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,'-c','protocol.allow=never',...args],{
  encoding,timeout:30000,maxBuffer:16*1024*1024,
  env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0'},
})).stdout;
function relative(file){
  assert.equal(typeof file,'string');assert.match(file,/^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(file),file);
  assert(file!=='.'&&file!=='..'&&!file.startsWith('../')&&!path.posix.isAbsolute(file));return file;
}
const inside=(root,file)=>{const rel=path.relative(root,file);return rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);};
const fileIdentity=stat=>{assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n&&stat.ino>0n);
  return [stat.dev,stat.ino,stat.birthtimeNs,stat.size];};
const directoryIdentity=stat=>{assert(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.ino>0n);
  return [stat.dev,stat.ino,stat.birthtimeNs];};
async function noLinks(file){
  let at=path.parse(file).root;
  for(const leaf of path.relative(at,file).split(path.sep).filter(Boolean)){
    at=path.join(at,leaf);assert(!(await fs.lstat(at)).isSymbolicLink(),'Historical test source must not traverse links');
  }
}
export async function withFrozenCurrentGridReleaseMetadataTestSource(callback){
  assert.equal(arguments.length,1,'No caller source/head/binding/target selection');assert.equal(typeof callback,'function');
  const inventoryBytes=await fs.readFile(INVENTORY);assert.equal(sha(inventoryBytes),INVENTORY_SHA256);
  const inventory=JSON.parse(inventoryBytes);
  assert.equal(inventory.schemaVersion,1);assert.equal(inventory.kind,'TEST_ONLY_EXACT_CURRENT_GRID_RELEASE_METADATA_CLOSURE');
  assert.equal(inventory.head,HEAD);assert.equal(inventory.tree,TREE);assert.equal(inventory.target,TARGET);
  assert.deepEqual(inventory.dataOnlyFiles,[TARGET]);assert.equal(inventory.files.length,81);
  assert.equal(inventory.sourceBytes,5657606);
  assert.equal(new Set(inventory.files.map(row=>relative(row.file))).size,inventory.files.length);
  assert.equal(inventory.files.reduce((sum,row)=>sum+row.bytes,0),inventory.sourceBytes);
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const regular=new Map(String(await git(['ls-tree','-r','-z','--full-tree',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(line=>{
    const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);
    return match?[[relative(match[3]),{mode:match[1],gitBlob:match[2]}]]:[];
  }));
  const selected=new Map();
  for(const row of inventory.files){
    assert.deepEqual(regular.get(row.file),{mode:row.mode,gitBlob:row.gitBlob});
    assert(Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=8*1024*1024);assert.match(row.sha256,/^[a-f0-9]{64}$/);
    const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+row.file]));
    assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);selected.set(row.file,raw);
  }
  assert.equal(sha(selected.get(TARGET)),TARGET_SHA256,'Whole unchanged original normal fixture/assertion source');
  for(const file of inventory.contextRoots)assert(selected.has(relative(file)));
  assert(selected.has(SCANNER));
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-current-grid-release-metadata-';
  const root=await fs.mkdtemp(path.join(parent,prefix));assert.equal(path.dirname(root),parent);
  await noLinks(root);assert.equal(await fs.realpath(root),root);
  const owned=directoryIdentity(await fs.lstat(root,{bigint:true})),identities=new Map();
  const directories=new Set();
  async function exactTree(){
    const seen=new Set();
    async function visit(directory,prefix=''){
      for(const leaf of await fs.readdir(directory)){
        const rel=prefix?prefix+'/'+leaf:leaf,target=path.join(directory,leaf),stat=await fs.lstat(target,{bigint:true});
        assert(inside(root,target)&&!stat.isSymbolicLink());
        if(stat.isDirectory()){assert(directories.has(rel));await visit(target,rel);}
        else {assert(selected.has(rel));assert.deepEqual(fileIdentity(stat),identities.get(rel));
          assert.deepEqual(await fs.readFile(target),selected.get(rel),'Whole historical fixture context must stay unchanged');seen.add(rel);}
      }
    }
    await visit(root);assert.deepEqual([...seen].sort(),[...selected.keys()].sort());
  }
  let result,first,hasFirst=false,materialized=false;
  try{
    for(const[file,raw]of selected){
      const target=path.join(root,file);assert(inside(root,target));
      let directory=path.posix.dirname(file);while(directory!=='.'){directories.add(directory);directory=path.posix.dirname(directory);}
      await fs.mkdir(path.dirname(target),{recursive:true});await noLinks(path.dirname(target));
      await fs.writeFile(target,raw,{flag:'wx',mode:0o600});identities.set(file,fileIdentity(await fs.lstat(target,{bigint:true})));
    }
    materialized=true;await exactTree();
    // Use the genuine normal strict scanner, not a permissive regex, fallback
    // inventory, source override, or an imported production facade.
    const {exactRelativeModuleSpecifiers}=await import(pathToFileURL(path.join(root,SCANNER)).href);
    for(const[file,raw]of selected){
      if(inventory.dataOnlyFiles.includes(file)||!/\.(?:js|mjs|ts)$/.test(file))continue;
      for(const specifier of exactRelativeModuleSpecifiers(raw.toString('utf8'),file)){
        const clean=specifier.split(/[?#]/,1)[0];
        const base=relative(path.posix.normalize(path.posix.join(path.posix.dirname(file),clean)));
        const choices=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
        assert(choices.some(choice=>selected.has(choice)),'Every actual historical module import must resolve inside the fixed closure');
      }
    }
    // The one DATA target is authenticated but never imported/evaluated here.
    // Its fixture functions/assertions remain literal in the normal test owner.
    result=await callback(root);
  }catch(error){first=error;hasFirst=true;}
  try{
    await noLinks(root);assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),parent);
    assert(path.basename(root).startsWith(prefix));assert.deepEqual(directoryIdentity(await fs.lstat(root,{bigint:true})),owned);
    assert(materialized,'Incomplete owned source retained for inspection');await exactTree();
    for(const file of selected.keys())await fs.unlink(path.join(root,file));
    for(const directory of [...directories].sort((a,b)=>b.length-a.length))await fs.rmdir(path.join(root,directory));
    await fs.rmdir(root);
  }catch(error){if(!hasFirst){first=error;hasFirst=true;}else first=new AggregateError([first,error],'Historical fixture failed; cleanup stopped safely');}
  if(hasFirst)throw first;return result;
}
