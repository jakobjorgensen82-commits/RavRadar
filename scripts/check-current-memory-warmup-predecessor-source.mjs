// Fixed genuine native0600 validator/producer source. No caller root/head/pin.
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
const HEAD='60d999a68136c43acb4d3664bbd66eed47283bb2';
const TREE='ead5743dd9098035b0de5f748de2009460506971';
const C='scripts/rollback-assets/ravscore-model-bundle.generated.js';
const I='js/core/ravscore-model-bundle.generated.js';
const T='scripts/lib/ravscore-continuation-implementation-contract.mjs';
const BUILDER='scripts/build-native-sampling-identity-original-binding-successor.mjs';
const SCANNER='scripts/lib/static-module-closure.mjs';
const CP='scripts/ravscore-continuation-checkpoint.mjs';
// Same reviewed fixed-module inventory mechanism as the historical helper.
// Applies ONLY to this whole immutable Git blob; no scanner failure fallback.
const REVIEWED=Object.freeze({
  'scripts/protected-private-production-runtime.mjs':Object.freeze({
    sha256:'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762',
    imports:Object.freeze(['./private-production-runtime-bundle.mjs','./lib/supabase-admin-rest.mjs','../js/core/ravscore-model-contract.js',
      './lib/r2-private-runtime-storage.mjs','./lib/private-weather-component-inventory.mjs','./lib/bounded-conditions-predecessor-transition.mjs']),
  }),
  'scripts/lib/historical-wave-input-transition.mjs':Object.freeze({
    sha256:'fcc199d299c5173dae8fcb7ea8726e6717c2f3aeaaf038f5588a010fcc0460ef',
    imports:Object.freeze(['../../js/core/ravscore-model-contract.js','../private-production-runtime-bundle.mjs','./ravscore-recovery-replay.mjs']),
  }),
  'scripts/build-public-coastal-parts-v2.mjs':Object.freeze({
    sha256:'ad4dcfb1158639be600b1740453841f130539cf34f3f8e73158e3ad53fb99105',imports:Object.freeze([]),
  }),
  'scripts/private-production-runtime-bundle.mjs':Object.freeze({
    sha256:'2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529',
    imports:Object.freeze(['../js/core/ravscore-model-contract.js','./lib/bounded-conditions-predecessor-transition.mjs','./lib/private-weather-component-inventory.mjs']),
  }),
});
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const bytesCache=new Map();
const env=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
  .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,env:env(),timeout:30000,maxBuffer:16*1024*1024})).stdout;
function relative(value){
  assert.equal(typeof value,'string');assert.match(value,/^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(value),value);assert(value!=='.'&&value!=='..'&&!value.startsWith('../')&&!path.posix.isAbsolute(value));return value;
}
const inside=(root,file)=>{const r=path.relative(root,file);return r&&r!=='..'&&!r.startsWith('..'+path.sep)&&!path.isAbsolute(r);};
function identity(s){assert(s.isDirectory()&&!s.isSymbolicLink()&&s.ino>0n);return [s.dev,s.ino,s.birthtimeNs];}
async function noLinks(file){let at=path.parse(file).root;for(const p of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,p);assert(!(await fs.lstat(at)).isSymbolicLink(),'Frozen source must not traverse links');}}
async function inventory(){
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  return new Map(String(await git(['ls-tree','-r','-z',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const m=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(row);return m?[[relative(m[3]),m[2]]]:[];
  }));
}
async function bytes(file,index){relative(file);assert(index.has(file),'Fixed regular Git source leaf required: '+file);
  if(!bytesCache.has(file))bytesCache.set(file,Buffer.from(await git(['show',HEAD+':'+file])));return bytesCache.get(file);}
async function selected(index){
  const scanner=await import('data:text/javascript;base64,'+(await bytes(SCANNER,index)).toString('base64'));
  const pending=[BUILDER,SCANNER,C,I,T,CP,'package.json',
    'scripts/protected-ravscore-continuation-checkpoint.mjs','scripts/private-production-runtime-bundle.mjs',
    'scripts/fixtures/statistics-preference-revision-input.json','scripts/fixtures/account-assistant-successor-inputs.json',
    'scripts/lib/private-weather-storage-abi.json','scripts/copy-public-delivery-shards.mjs',
    'scripts/lib/dmi-marine-zone-exclusions.json','scripts/lib/copernicus-component-spatial-policy.json'];
  for(const [file,binding,count] of [[C,'2786145f7fc812cd658cab3a69927db625c2b8ffb3be81256acedd12288f4010',69],
    [I,'aa1e364bf6a0962725b6633fdc3487c6e626d51373302d7135023547a93c9855',71]]){
    const generated=await import('data:text/javascript;base64,'+(await bytes(file,index)).toString('base64'));
    assert.equal(generated.GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256,binding);
    const rows=generated.GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files;assert.equal(rows.length,count);
    pending.push(...rows.map(row=>relative(row.path??row.file)));
  }
  const t=(await bytes(T,index)).toString('utf8');
  const list=/export const RAVSCORE_CONTINUATION_IMPLEMENTATION_FILES = Object\.freeze\(\[\n((?:  '[A-Za-z0-9_./-]+',\n)+)\]\);/.exec(t);assert(list);
  const tFiles=[...list[1].matchAll(/  '([^']+)',\n/g)].map(m=>relative(m[1]));assert.equal(tFiles.length,12);pending.push(...tFiles);
  // Only six required immutable source migrations, never a repository copy.
  for(const name of ['20261010130000_owner_export_origin_bound_successor.sql','20261012200000_checkpoint_cas_single_projection_successor.sql',
    '20261013210000_account_assistant_original_bound_successor.sql','20261013220000_current_grid_original_bound_successor.sql',
    '20261013230000_account_statistics_revision.sql','20261016060000_native_sampling_identity_original_bound_successor.sql'])pending.push('supabase/migrations/'+name);
  const found=new Set();
  while(pending.length){const file=pending.pop();if(found.has(file))continue;found.add(file);
    if(!/\.(js|mjs|ts)$/.test(file))continue;
    const reviewed=REVIEWED[file],source=await bytes(file,index);
    if(reviewed)assert.equal(sha(source),reviewed.sha256,'Whole reviewed frozen import inventory');
    for(const specifier of reviewed?reviewed.imports:scanner.exactRelativeModuleSpecifiers(source.toString('utf8'),file)){
      const base=relative(path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0])));
      const choices=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
      const target=choices.find(p=>index.has(p));assert(target,'Exact source import must resolve: '+file+' '+specifier);pending.push(target);
    }
  }
  assert.equal(sha(await bytes('supabase/migrations/20261016060000_native_sampling_identity_original_bound_successor.sql',index)),
    '10e26f9d095b6c06eee479eb11d821114b04e4db0dbdb7c6717c13200793f019');
  assert.equal(sha(await bytes('supabase/migrations/20261013230000_account_statistics_revision.sql',index)),
    'af4bd9d36f9a8d4badf3802d151acb2f16f2d5edd22ce095f8086167f2a00cae');
  return [...found].sort();
}
async function exactTree(root,files,index){
  const expected=new Set(files),seen=new Set();
  async function visit(directory,prefix=''){
    for(const leaf of await fs.readdir(directory)){const rel=prefix?prefix+'/'+leaf:leaf,file=path.resolve(directory,leaf),stat=await fs.lstat(file);
      assert(inside(root,file)&&!stat.isSymbolicLink());
      if(stat.isDirectory()){assert(files.some(p=>p.startsWith(rel+'/')));await visit(file,rel);}
      else {assert(stat.isFile()&&stat.nlink===1&&expected.has(rel),'Unknown source leaf is retained');
        assert.deepEqual(await fs.readFile(file),await bytes(rel,index),'Fixed producer source changed');seen.add(rel);}
    }
  }
  await visit(root);assert.deepEqual([...seen].sort(),files);
}
export async function withCurrentMemoryWarmupPredecessorSource(useVerifiedSource){
  assert.equal(arguments.length,1,'No caller head/root/source override');assert.equal(typeof useVerifiedSource,'function');
  const index=await inventory(),files=await selected(index);
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-current-memory-warmup-source-',root=await fs.mkdtemp(path.join(parent,prefix));
  assert.equal(path.dirname(root),parent);assert.equal(await fs.realpath(root),root);
  const owned=identity(await fs.lstat(root,{bigint:true}));
  let result,first;
  try{
    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});
      await fs.writeFile(output,await bytes(file,index),{flag:'wx',mode:0o600});}
    await exactTree(root,files,index);
    const checked=await execute(process.execPath,[path.join(root,BUILDER),'--check'],{cwd:root,env:env(),timeout:60000,maxBuffer:1024*1024});
    assert.equal(checked.stdout.trim(),'Exact append-only native identity SOURCE verified; no installation or output write performed.');
    const continuation=await import(pathToFileURL(path.join(root,T)).href);
    assert.equal(await continuation.ravScoreContinuationImplementationSha256({repositoryRoot:root}),
      '15f0eb6748cf0a4f1c9d8971e43efc6823ec7d70c85984e6619e07db277702f1');
    await exactTree(root,files,index);
    result=await useVerifiedSource(root);
  }catch(error){first=error;}
  try{
    await noLinks(root);assert.equal(await fs.realpath(root),root);assert.equal(path.dirname(root),parent);assert(path.basename(root).startsWith(prefix));
    assert.deepEqual(identity(await fs.lstat(root,{bigint:true})),owned);await exactTree(root,files,index);
    for(const file of files)await fs.unlink(path.join(root,file));
    const dirs=new Set();for(const file of files){let p=path.posix.dirname(file);while(p!=='.'){dirs.add(p);p=path.posix.dirname(p);}}
    for(const p of [...dirs].sort((a,b)=>b.length-a.length))await fs.rmdir(path.join(root,p));await fs.rmdir(root);
  }catch(error){if(!first)first=error;}
  if(first)throw first;return result;
}
