// Test-only genuine issued220 receiver namespace. No production admission API.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const ROOT=path.resolve(process.cwd());
const HEAD='c74737575e1404e98bbcef7f644684ab250e1b6c';
const TREE='bee109d9bce90ebee031ad883ebfcd5d52b406d2';
const SQL='supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
const SQL_SHA='77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b';
const SCANNER='scripts/lib/static-module-closure.mjs';
const T_FILE='scripts/lib/ravscore-continuation-implementation-contract.mjs';
const FLOW='.github/workflows/deploy-code-only-repair.yml';
const ENTRY=Object.freeze({grid:'scripts/lib/bounded-conditions-predecessor-transition.mjs',
 archive:'scripts/protected-private-production-runtime.mjs',bundle:'scripts/private-production-runtime-bundle.mjs',
 workflow:'scripts/private-production-runtime-workflow.mjs'});
const PUBLIC_FILES=Object.freeze(['js/core/ravscore-model-contract.js','js/core/ravscore-public-model.js',
 'js/core/ravscore-public-runtime-contract.js','js/core/public-delivery-contract.js','js/core/local-zone-score.js',
 'scripts/public-conditions-lib.mjs','scripts/copy-public-delivery-shards.mjs',
 'scripts/lib/private-weather-component-inventory.mjs','scripts/lib/public-hour-delivery-pack.mjs']);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
 .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
const git=args=>execFileSync('git',['--no-replace-objects','-C',ROOT,...args],{env,maxBuffer:32*1024*1024,timeout:30000});
const identity=s=>{assert(s.isDirectory()&&!s.isSymbolicLink()&&s.ino>0n);return [s.dev,s.ino,s.birthtimeNs];};
async function sources(){
 assert.equal(String(git(['rev-parse',HEAD+'^{tree}'])).trim(),TREE);
 const regular=new Set(String(git(['ls-tree','-r','-z',HEAD])).split('\0').filter(Boolean).flatMap(row=>{
  const m=/^(100644|100755) blob [a-f0-9]{40}\t(.+)$/.exec(row);return m?[m[2]]:[];}));
 const bytes=new Map(),read=file=>{assert(regular.has(file));assert.equal(path.posix.normalize(file),file);
  assert(!file.startsWith('../')&&!path.posix.isAbsolute(file));
  if(!bytes.has(file))bytes.set(file,Buffer.from(git(['show',HEAD+':'+file])));return bytes.get(file);};
 assert.equal(sha(read(SQL)),SQL_SHA);assert.deepEqual(await fs.readFile(path.join(ROOT,SQL)),read(SQL));
 assert.equal(sha(read(SCANNER)),'675f91e7942143a78636e219e54bd7fa0ff25ddcd1998657dd215105054938b0');
 const {exactRelativeModuleSpecifiers:scan}=await import('data:text/javascript;base64,'+read(SCANNER).toString('base64'));
 const t=/export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(String(read(T_FILE)));assert(t);
 const tFiles=[...t[1].matchAll(/  '([^']+)',/g)].map(m=>m[1]);assert.equal(tFiles.length,12);
 const pending=[...Object.values(ENTRY),...PUBLIC_FILES,...tFiles,SCANNER,T_FILE,FLOW,SQL,'package.json',
  'scripts/update-dmi-bulk.py','scripts/lib/private-weather-storage-abi.json','scripts/lib/dmi-marine-zone-exclusions.json'];
 const selected=new Set();while(pending.length){const file=pending.pop();if(selected.has(file))continue;
  selected.add(file);const data=read(file);if(!/\.(?:js|mjs|ts)$/.test(file))continue;
  let scanned=String(data);
  if(file===ENTRY.archive){
   // Two exact imports belong only to this issued CLI's historical-reader-root
   // branch. The fixture imports library exports, never invokes main or supplies
   // that option. Classify these exact nodes for the scanner ONLY; the stored
   // and evaluated full Git blob below is never rewritten.
   const main=scanned.indexOf('async function main() {');assert(main>=0);
   for(const leaf of ['js/core/ravscore-model-contract.js','scripts/private-production-runtime-bundle.mjs']){
    const node="import(pathToFileURL(path.join(\n        oldRoot, '"+leaf+"')).href)";
    assert.equal(scanned.split(node).length,2);assert(scanned.indexOf(node)>main);
    scanned=scanned.replace(node,'Promise.resolve(null)');
   }
  }
  // The issued scanner treats a later identifier `from` inside an exported
  // declaration body as a re-export. A declaration is not a module-reference
  // statement. Remove only its line-leading export keyword from scanner input;
  // imports and actual export-from statements stay strict and unchanged.
  scanned=scanned.replace(/^export (?=(?:async )?function\b|const\b|class\b)/gm,'');
  for(const specifier of scan(scanned,file)){
   const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0]));
   const candidates=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
   const resolved=candidates.find(f=>regular.has(f));assert(resolved,'Pinned static import '+file+' '+specifier);pending.push(resolved);
  }
 }
 const rows=[...selected].sort().map(file=>[file,sha(read(file))]);
 return {bytes:new Map(rows.map(([file])=>[file,read(file)])),rows,inventorySha256:sha(JSON.stringify(rows))};
}
// Used only to freeze/review the fixed Git fixture inventory before running tests.
export async function issuedCurrentGridReceiverInventory(){const {rows,inventorySha256}=await sources();return {head:HEAD,tree:TREE,rows,inventorySha256};}
export async function createIssuedCurrentGridReceiverFixture(){
 const source=await sources();
 assert.equal(source.rows.length,62);
 assert.equal(source.inventorySha256,'ab2ceb7f459169e66cbec8bab80d51ae135c2a24c536645f516224d3db68841b');
 const parent=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(parent,'rr-issued220-receivers-'));
 assert.equal(await fs.realpath(directory),directory);const owned=identity(await fs.lstat(directory,{bigint:true}));
 let active=true;
 async function assertOwned(){assert(active);assert.equal(path.dirname(directory),parent);assert.equal(await fs.realpath(directory),directory);
  assert.deepEqual(identity(await fs.lstat(directory,{bigint:true})),owned);}
 async function close(){await assertOwned();
  for(const [file,bytes] of source.bytes)assert.deepEqual(await fs.readFile(path.join(directory,file)),bytes,'Issued receiver source unchanged: '+file);
  await fs.rm(directory,{recursive:true,force:false});active=false;}
 try{
  for(const [file,bytes] of source.bytes){const target=path.resolve(directory,file);assert(target.startsWith(directory+path.sep));
   await fs.mkdir(path.dirname(target),{recursive:true});assert.equal(await fs.realpath(path.dirname(target)),path.dirname(target));
   await fs.writeFile(target,bytes,{flag:'wx'});}
  const modules={};for(const [key,file] of Object.entries(ENTRY))modules[key]=await import(pathToFileURL(path.join(directory,file)).href);
  const contracts=await modules.workflow.privateRuntimeContractHashes();
  assert.equal(contracts.continuationStateContractSha256,'0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a');
  await assertOwned();
  return Object.freeze({...modules,workflowSource:String(source.bytes.get(FLOW)),close,
   receipt:Object.freeze({head:HEAD,tree:TREE,inventorySha256:source.inventorySha256,fileCount:source.rows.length,productionProof:false})});
 }catch(error){try{await close();}catch{}throw error;}
}
