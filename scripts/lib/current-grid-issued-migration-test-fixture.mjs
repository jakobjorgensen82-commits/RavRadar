// Test-only genuine584 migration/prewrite root. No production admission API.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const ROOT=path.resolve(process.cwd());
const HEAD='584e0e19530ce14f8d4f15c20ea3fbee9dd63e7e';
const TREE='f70504774f4d59b3c094fd95d6cd4b27b2146af0';
const OLD='044d3045fecc2e70d6f35f60010921c6bd597ecc';
const OLD_TREE='4c56c3b73633bf3a5e1540e4f53e75be49f0b9da';
const SQL213='supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql';
const SQL220='supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
const SCANNER='scripts/lib/static-module-closure.mjs';
const T_FILE='scripts/lib/ravscore-continuation-implementation-contract.mjs';
const ENTRY=Object.freeze([
 'scripts/migrate-post-cutover-private-runtime.mjs','scripts/lib/bounded-conditions-predecessor-transition.mjs',
 'scripts/private-production-runtime-bundle.mjs','scripts/protected-private-production-runtime.mjs',
 'scripts/prepare-historical-wave-predecessor-restore.mjs','scripts/private-runtime-second-restore-expectation.mjs',
 'scripts/private-production-runtime-workflow.mjs','scripts/lib/public-hour-delivery-pack.mjs',
 'scripts/lib/private-conditions-hourly.mjs','js/core/ravscore-model-contract.js',
 'scripts/rollback-assets/ravscore-model-contract.js','scripts/public-conditions-lib.mjs',
 'scripts/current-grid-binding-prewrite.mjs','scripts/check-account-assistant-issued-source.mjs',
 'scripts/lib/current-grid-prewrite-diagnostic.mjs',
]);
const PUBLIC_FILES=Object.freeze(['js/core/ravscore-public-model.js','js/core/ravscore-public-runtime-contract.js',
 'js/core/public-delivery-contract.js','js/core/local-zone-score.js','scripts/copy-public-delivery-shards.mjs',
 'scripts/lib/private-weather-component-inventory.mjs']);
// Classify only these exact non-literal import nodes for the closure scanner.
// Evaluated/stored Git blobs stay whole and unchanged. The old-source branches
// retain their own fixed044d loader; no callback or rewritten module replaces it.
const DYNAMIC_NODES=Object.freeze({
 'scripts/migrate-post-cutover-private-runtime.mjs':[
  'import(`${stagingUrl.href}${query}`)','import(`${integratedUrl.href}${query}`)',
  'import(`${candidateUrl.href}${query}`)',
  "import(pathToFileURL(path.join(predecessor,\n    'scripts/private-production-runtime-bundle.mjs')).href)",
 ],
 'scripts/protected-private-production-runtime.mjs':[
  "import(pathToFileURL(path.join(\n        oldRoot, 'js/core/ravscore-model-contract.js')).href)",
  "import(pathToFileURL(path.join(\n        oldRoot, 'scripts/private-production-runtime-bundle.mjs')).href)",
 ],
 'scripts/current-grid-binding-prewrite.mjs':[
  "import(pathToFileURL(path.join(issuedRoot, 'scripts/ravscore-continuation-checkpoint.mjs')).href)",
 ],
 'scripts/check-account-assistant-issued-source.mjs':[
  "import('data:text/javascript;base64,' + bytes.toString('base64'))",
  "import('data:text/javascript;base64,'\n    + (await gitBytes(SCANNER)).toString('base64'))",
 ],
});
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const env=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
 .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=(args,cwd=ROOT)=>execFileSync('git',['--no-replace-objects','-C',cwd,...args],
 {env,maxBuffer:32*1024*1024,timeout:30000});
const identity=stat=>{assert(stat.isDirectory()&&!stat.isSymbolicLink()&&stat.ino>0n);return[stat.dev,stat.ino,stat.birthtimeNs];};
const fileIdentity=stat=>{assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.ino>0n);return[stat.dev,stat.ino,stat.size,stat.mtimeNs];};
async function noLinks(absolute){let at=path.parse(absolute).root;for(const part of path.relative(at,absolute).split(path.sep).filter(Boolean)){
 at=path.join(at,part);assert(!(await fs.lstat(at)).isSymbolicLink(),'No fixture/Git locator symlink or reparse path');}}
async function sourceInventory(){
 assert.equal(String(git(['rev-parse',HEAD+'^{tree}'])).trim(),TREE);
 assert.equal(String(git(['rev-parse',OLD+'^{tree}'])).trim(),OLD_TREE);
 const regular=new Set(String(git(['ls-tree','-r','-z',HEAD])).split('\0').filter(Boolean).flatMap(row=>{
  const match=/^(100644|100755) blob [a-f0-9]{40}\t(.+)$/.exec(row);return match?[match[2]]:[];}));
 const bytes=new Map(),read=file=>{assert(regular.has(file));assert.equal(path.posix.normalize(file),file);
  assert(!file.startsWith('../')&&!path.posix.isAbsolute(file));
  if(!bytes.has(file))bytes.set(file,Buffer.from(git(['show',HEAD+':'+file])));return bytes.get(file);};
 assert.equal(sha(read(SQL213)),'80ad179bc896e9fcd62b8af103d70a2d086d3626395dd97f03e4184e52bcae5d');
 assert.equal(sha(read(SQL220)),'77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b');
 for(const file of[SQL213,SQL220])assert.deepEqual(await fs.readFile(path.join(ROOT,file)),read(file));
 assert.equal(sha(read(SCANNER)),'675f91e7942143a78636e219e54bd7fa0ff25ddcd1998657dd215105054938b0');
 const{exactRelativeModuleSpecifiers:scan}=await import('data:text/javascript;base64,'+read(SCANNER).toString('base64'));
 const t=/export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(String(read(T_FILE)));assert(t);
 const tFiles=[...t[1].matchAll(/  '([^']+)',/g)].map(match=>match[1]);assert.equal(tFiles.length,12);
 const pending=[...ENTRY,...PUBLIC_FILES,...tFiles,SCANNER,T_FILE,SQL213,SQL220,'package.json',
  'scripts/update-dmi-bulk.py','scripts/lib/private-weather-storage-abi.json','scripts/lib/dmi-marine-zone-exclusions.json',
  'scripts/lib/copernicus-component-spatial-policy.json'];
 const selected=new Set();while(pending.length){const file=pending.pop();if(selected.has(file))continue;
  selected.add(file);const data=read(file);if(!/\.(?:js|mjs|ts)$/.test(file))continue;
  let scanned=String(data);for(const node of DYNAMIC_NODES[file]??[]){assert.equal(scanned.split(node).length,2,file+' exact classified dynamic node');scanned=scanned.replace(node,'Promise.resolve(null)');}
  // Issued scanner declaration/from ambiguity: scanner input only, not source.
  scanned=scanned.replace(/^export (?=(?:async )?function\b|const\b|class\b)/gm,'');
  for(const specifier of scan(scanned,file)){
   const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0]));
   const candidates=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
   const resolved=candidates.find(item=>regular.has(item));assert(resolved,'Pinned static import '+file+' '+specifier);pending.push(resolved);
  }
 }
 const rows=[...selected].sort().map(file=>[file,sha(read(file))]);
 return{bytes:new Map(rows.map(([file])=>[file,read(file)])),rows,inventorySha256:sha(JSON.stringify(rows))};
}
export async function issued584MigrationInventory(){const{rows,inventorySha256}=await sourceInventory();return{head:HEAD,tree:TREE,rows,inventorySha256};}
export async function createIssued584MigrationFixture(){
 const source=await sourceInventory();
 assert.equal(source.rows.length,93);
 assert.equal(source.inventorySha256,'d85b35befa053d994b4140a3593b6ab91a8738dc35ed425fabe49de538157f5b');
 const gitDirectory=path.resolve(String(git(['rev-parse','--absolute-git-dir'])).trim());
 assert(path.isAbsolute(gitDirectory)&&!/[\r\n]/.test(gitDirectory));await noLinks(gitDirectory);
 assert.equal(await fs.realpath(gitDirectory),gitDirectory);
 const gitIdentity=identity(await fs.lstat(gitDirectory,{bigint:true}));
 const parent=await fs.realpath(os.tmpdir()),directory=await fs.mkdtemp(path.join(parent,'rr-issued584-migration-'));
 assert.equal(await fs.realpath(directory),directory);await noLinks(directory);
 const owned=identity(await fs.lstat(directory,{bigint:true}));
 const locator=Buffer.from('gitdir: '+gitDirectory.replace(/\\/g,'/')+'\n');
 const expected=new Map(source.bytes);expected.set('.git',locator);
 const stats=new Map();let active=true;
 async function assertOwned(){assert(active);assert.equal(path.dirname(directory),parent);assert.equal(await fs.realpath(directory),directory);
  assert.deepEqual(identity(await fs.lstat(directory,{bigint:true})),owned);
  assert.deepEqual(identity(await fs.lstat(gitDirectory,{bigint:true})),gitIdentity);}
 async function close(){await assertOwned();
  const actual=[];async function walk(at,prefix=''){for(const item of await fs.readdir(at,{withFileTypes:true})){
   const relative=prefix+item.name,absolute=path.join(at,item.name),stat=await fs.lstat(absolute,{bigint:true});
   assert(!stat.isSymbolicLink(),'Cleanup refuses any substituted link');
   if(stat.isDirectory())await walk(absolute,relative+'/');else{assert(stat.isFile());actual.push(relative);}}}
  await walk(directory);assert.deepEqual(actual.sort(),[...expected.keys()].sort(),'No unowned fixture files');
  for(const[file,bytes]of expected){const absolute=path.join(directory,file);
   assert.deepEqual(fileIdentity(await fs.lstat(absolute,{bigint:true})),stats.get(file),'Same original fixture file');
   assert.deepEqual(await fs.readFile(absolute),bytes,'Whole issued fixture unchanged: '+file);}
  // .git is an ordinary owned text file. Never traverse its contents for cleanup.
  await fs.rm(directory,{recursive:true,force:false});active=false;}
 try{
  for(const[file,bytes]of expected){const destination=path.resolve(directory,file);assert(destination.startsWith(directory+path.sep));
   await fs.mkdir(path.dirname(destination),{recursive:true});await noLinks(path.dirname(destination));
   await fs.writeFile(destination,bytes,{flag:'wx',mode:0o600});stats.set(file,fileIdentity(await fs.lstat(destination,{bigint:true})));}
  assert.equal(String(git(['rev-parse',HEAD+'^{tree}'],directory)).trim(),TREE);
  assert.equal(String(git(['rev-parse',OLD+'^{tree}'],directory)).trim(),OLD_TREE);
  assert.deepEqual(git(['show',OLD+':'+SQL213],directory),source.bytes.get(SQL213));
  await assertOwned();
  return Object.freeze({repositoryRoot:directory,close,
   receipt:Object.freeze({head:HEAD,tree:TREE,fileCount:source.rows.length,inventorySha256:source.inventorySha256,
    locatorSha256:sha(locator),readOnlyExistingGitObjectStore:true,productionProof:false})});
 }catch(error){try{await close();}catch{}throw error;}
}
