// Native source fixture ONLY. No runtime, production-original or SQL admission.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import sync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFile as execFileCallback} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const HEAD='c74737575e1404e98bbcef7f644684ab250e1b6c';
const TREE='bee109d9bce90ebee031ad883ebfcd5d52b406d2';
const TARGET='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
const T_FILE='scripts/lib/ravscore-continuation-implementation-contract.mjs';
const I='994da006e4c91a1fc759d5ed58b74de80a9ccaad6753274d5abb0cb07eaed399';
const C='d192e060cf47fde07a1ae2faf9a8db913dbbf4e1325cbf7bf2e33c720982e8d9';
const T='0f6c182ab2ffa7d9d0153706277aa3f7b582327be7dda02842a9c8b995568d4a';
const SQL='supabase/migrations/20261013220000_current_grid_original_bound_successor.sql';
const SQL_SHA='77d5a60f22ff38fce3164c87e74d089ea56c0a18647310213cde465e95e4632b';
const FACTORY_SHA='71ce29ec98e43bfa02017a145c4438346f1d8a1f4323526ec58e4b1081d81e36';
const CLOSURE_SHA='7d3615e3392e09d5f2d36bedea88e98f3489752dcc20567e55d1545e0bc879f2';
const IMPORTS=Object.freeze([
 ['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
 ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
 ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
 ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
 ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
 ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
 ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY, saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
 ['ravScoreContinuationImplementationSha256',T_FILE],
]);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const owners=new WeakMap(),retained=new Set();
const identity=s=>[s.dev,s.ino,s.birthtimeNs];
const fileIdentity=s=>[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs];
const execFile=promisify(execFileCallback);
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
 .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
function directoryIdentity(filename){const s=sync.lstatSync(filename,{bigint:true});
 assert(s.isDirectory()&&!s.isSymbolicLink()&&s.ino>0n);assert.equal(sync.realpathSync(filename),filename);return identity(s);}
function assertActive(owner){const state=owners.get(owner);
 assert(state&&state.phase==='active','ISSUED220_NATIVE_OWNER_INACTIVE');
 assert.deepEqual(directoryIdentity(state.root),state.rootIdentity);
 assert.deepEqual(directoryIdentity(state.directory),state.directoryIdentity);
 for(const entry of state.handles){
  const before=sync.fstatSync(entry.fd,{bigint:true});assert(before.isFile());
  assert.deepEqual(fileIdentity(before),entry.identity);
  assert.equal(sync.realpathSync(entry.filename),entry.filename);
  const named=sync.lstatSync(entry.filename,{bigint:true});assert(named.isFile()&&!named.isSymbolicLink());
  assert.deepEqual(fileIdentity(named),entry.identity);
  const bytes=Buffer.alloc(Number(before.size));let offset=0;
  while(offset<bytes.length){const count=sync.readSync(entry.fd,bytes,offset,bytes.length-offset,offset);assert(count>0);offset+=count;}
  assert.equal(sha(bytes),entry.sha256);assert.deepEqual(fileIdentity(sync.fstatSync(entry.fd,{bigint:true})),entry.identity);
 }
 return state;
}
export function assertIssuedCurrentGridFixture(owner){assertActive(owner);return owner;}
// Closing the typed fixture does NOT prove PostgreSQL/child termination and
// never removes the native root. The normal host calls this only after its own
// existing pg_ctl-stop/status proof; unknown stop retains this owner and all FDs.
export function closeIssuedCurrentGridFixture(owner){const state=assertActive(owner);
 assert.equal(state.pending,0,'ISSUED220_NATIVE_CONSUMER_STILL_ACTIVE');state.phase='closing';
 try{for(const entry of state.handles){sync.closeSync(entry.fd);
   // A returned close is not closure proof. Reuse/any other uncertainty is retained.
   let closed=false;
   try{sync.fstatSync(entry.fd);}catch(error){if(error?.code!=='EBADF')throw error;closed=true;}
   assert(closed,'ISSUED220_NATIVE_FD_CLOSE_UNPROVED');entry.closed=true;
  }
  state.phase='closed';retained.delete(state);
 }catch(error){state.phase='close-unknown';throw error;}
}
export async function createIssuedCurrentGridFixture({ownedNativeRoot}={}){
 const root=await fs.realpath(ownedNativeRoot),temp=await fs.realpath(os.tmpdir());
 assert.equal(root,path.resolve(ownedNativeRoot));assert.equal(path.dirname(root),temp);
 assert(path.basename(root).startsWith('rr-checkpoint-pg-'));const rootIdentity=directoryIdentity(root);
 const git=async args=>(await execFile('git',['--no-replace-objects','-C',ROOT,...args],
  {encoding:'buffer',env:environment(),timeout:30000,maxBuffer:32*1024*1024})).stdout;
 assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'])).trim(),TREE);
 const regular=new Set(String(await git(['ls-tree','-r','-z',HEAD])).split('\0').filter(Boolean).flatMap(row=>{
  const m=/^(100644|100755) blob [a-f0-9]{40}\t(.+)$/.exec(row);return m?[m[2]]:[];}));
 const bytes=new Map();const read=async file=>{
  assert.match(file,/^[A-Za-z0-9_./-]+$/);assert.equal(path.posix.normalize(file),file);
  assert(!path.posix.isAbsolute(file)&&!file.startsWith('../')&&regular.has(file));
  if(!bytes.has(file))bytes.set(file,Buffer.from(await git(['show',HEAD+':'+file])));return bytes.get(file);
 };
 assert.equal(sha(await read(SQL)),SQL_SHA);
 const localSql=await fs.lstat(path.join(ROOT,SQL));assert(localSql.isFile()&&!localSql.isSymbolicLink());
 assert.deepEqual(await fs.readFile(path.join(ROOT,SQL)),await read(SQL),'Issued220 SQL must remain genuine');
 const target=String(await read(TARGET));assert.equal(sha(target),'c659612f26b55c3e1a33d812bdd0f42a0c5b520a131f01de4989bdc2c89a9bd0');
 const slice=(a,b)=>{assert.equal(target.split(a).length,2);assert.equal(target.split(b).length,2);
  assert(target.indexOf(a)<target.indexOf(b));return target.slice(target.indexOf(a),target.indexOf(b));};
 const factory=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
 assert.equal(sha(factory),FACTORY_SHA);
 const scanner=await read('scripts/lib/static-module-closure.mjs');
 assert.equal(sha(scanner),'675f91e7942143a78636e219e54bd7fa0ff25ddcd1998657dd215105054938b0');
 const {exactRelativeModuleSpecifiers:scan}=await import('data:text/javascript;base64,'+scanner.toString('base64'));
 const declaration=/export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(String(await read(T_FILE)));assert(declaration);
 const tFiles=[...declaration[1].matchAll(/  '([^']+)',/g)].map(m=>m[1]);
 assert.equal(tFiles.length,12);assert.equal(new Set(tFiles).size,12);
 const tRows=[];for(const file of [...tFiles].sort())tRows.push([file,sha(String(await read(file)).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n'))]);
 assert.equal(sha(JSON.stringify(tRows)),T);
 const selected=new Set(tFiles),pending=[...IMPORTS.map(x=>x[1]),'package.json'],visited=new Set();
 while(pending.length){const file=pending.pop();if(visited.has(file))continue;visited.add(file);selected.add(file);
  if(!/\.(?:js|mjs|ts)$/.test(file))continue;
  for(const specifier of scan(String(await read(file)),file)){
   const base=path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0]));
   const candidates=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
   const resolved=candidates.find(f=>regular.has(f));assert(resolved);pending.push(resolved);
  }
 }
 const policy='scripts/lib/dmi-marine-zone-exclusions.json';assert(!selected.has(policy));selected.add(policy);
 assert.equal(sha(await read(policy)),'b959dee7b87cfebe9fdc7311ffd62b835c96d5c4a263bbcff5c0485f6660ef16');
 const pins=[];for(const file of [...selected].sort()){const b=await read(file);pins.push({file,bytes:b.length,sha256:sha(b)});}
 assert.equal(pins.length,28);assert.equal(sha(JSON.stringify(pins)),CLOSURE_SHA);
 const directory=path.join(root,'issued220');
 const state={root,rootIdentity,directory,directoryIdentity:null,handles:[],phase:'preparing',pending:0};
 retained.add(state); // Unknown initialization/close outcomes retain actual resources.
 await fs.mkdir(directory,{mode:0o700});state.directoryIdentity=directoryIdentity(directory);
 for(const pin of pins){const destination=path.resolve(directory,pin.file),parent=path.dirname(destination);
  assert(destination.startsWith(directory+path.sep));await fs.mkdir(parent,{recursive:true,mode:0o700});
  assert.equal(await fs.realpath(parent),parent);await fs.writeFile(destination,await read(pin.file),{flag:'wx',mode:0o600});
  const fd=sync.openSync(destination,'r');const stat=sync.fstatSync(fd,{bigint:true});
  state.handles.push({fd,filename:destination,identity:fileIdentity(stat),sha256:pin.sha256,closed:false});
 }
 const owner={};owners.set(owner,state);state.phase='active';assertActive(owner);
 const moduleSource="import crypto from 'node:crypto';\n"+IMPORTS.map(([names,file])=>
  'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(directory,file)).href)+';').join('\n')
  +'\n'+factory+'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,ravScoreModelBinding,candidateGRollbackModelBinding};';
 const loaded=await import('data:text/javascript;base64,'+Buffer.from(moduleSource).toString('base64'));
 assertActive(owner);assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,I);
 assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,C);assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,T);
 owner.atHour=(...args)=>{assertActive(owner);const value=loaded.atHour(...args);assertActive(owner);return value;};
 owner.sourceDocumentAt=(...args)=>{assertActive(owner);const value=loaded.sourceDocumentAt(...args);assertActive(owner);return value;};
 owner.saveCheckpoint=async options=>{assertActive(owner);assert.deepEqual(Object.keys(options).sort(),['checkpointPath','sourcePath']);
  for(const name of ['checkpointPath','sourcePath']){assert.equal(path.dirname(path.resolve(options[name])),root);}
  state.pending++;let first=null;try{return await loaded.saveRavScoreContinuationCheckpoint(options);}
  catch(error){first={error};throw error;}
  finally{state.pending--;try{assertActive(owner);}catch(error){if(first)throw first.error;throw error;}}
 };
 owner.sourceReceipt=Object.freeze({kind:'GENUINE_ISSUED220_NATIVE_FIXTURE_SOURCE_ONLY',head:HEAD,tree:TREE,
  factorySha256:FACTORY_SHA,closureSha256:CLOSURE_SHA,fileCount:pins.length,I,C,T,sqlExecuted:false});
 return Object.freeze(owner);
}
