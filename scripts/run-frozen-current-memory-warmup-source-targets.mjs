#!/usr/bin/env node
// Historical normal0200 tests only: fixed Git source, not current/native admission.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withNativeCurrentReanalysisPredecessorSource} from './check-native-current-reanalysis-predecessor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),exec=promisify(callbackExec);
const HEAD='d7b31aa3c706e2f657fe5de99c56434f3cff260d',TREE='9d05b060dba9015233a368c63438a3dfd9b9b45d';
const TARGETS=Object.freeze({...Object.fromEntries(['successor','postgres-source','runtime-transition','current-consumers','workflow']
  .map(name=>[name,'scripts/test-current-memory-warmup-'+name+'.mjs'])),builder:'scripts/build-current-memory-warmup-successor.mjs'});
const REVIEWED=Object.freeze({
  "scripts/test-current-memory-warmup-successor.mjs": {
    "sha256": "24135804feb1e049933bceaf006fb7a3219c09d8caf0a25c1b41cdf898e73cc7",
    "imports": [
      "./build-current-memory-warmup-successor.mjs",
      "./integrated-cutover-readiness.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./verify-current-memory-warmup-plan.mjs"
    ]
  },
  "scripts/test-current-memory-warmup-postgres-source.mjs": {
    "sha256": "71a8ebd112e8748ebb338d4e175143b74fd28c3e0d249bdd73af68569618f61f",
    "imports": [
      "./integrated-cutover-readiness.mjs",
      "./lib/current-memory-warmup-postgres.mjs",
      "./lib/current-memory-warmup-successor-source.mjs"
    ]
  },
  "scripts/test-current-memory-warmup-runtime-transition.mjs": {
    "sha256": "2312c9df497237054f14c9675c13bb4215fe14e0a0de0a4860a0e2e6c3c59ed1",
    "imports": [
      "../js/core/ravscore-model-contract.js",
      "./check-current-memory-warmup-predecessor-source.mjs",
      "./current-memory-warmup-prewrite.mjs",
      "./current-memory-warmup-runtime-transition.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./private-production-runtime-bundle.mjs",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs",
      "./ravscore-continuation-checkpoint.mjs"
    ]
  },
  "scripts/test-current-memory-warmup-current-consumers.mjs": {
    "sha256": "39c1dc99718e3fb1ccb506b088cc7cfb4afa93bfc1119c611692524ff3695f54",
    "imports": [
      "../js/core/ravscore-model-contract.js",
      "./integrated-cutover-readiness.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./lib/production-workflow-sources.mjs",
      "./lib/ravscore-continuation-implementation-contract.mjs",
      "./sync-ravscore-model-binding.mjs"
    ]
  },
  "scripts/test-current-memory-warmup-workflow.mjs": {
    "sha256": "0a6fd6f15262d9ceef8e420646271f070ca1aa7b4120fef153b1bbc27f8d6f34",
    "imports": [
      "../js/core/ravscore-model-contract.js",
      "./check-current-memory-warmup-predecessor-source.mjs",
      "./current-memory-warmup-prewrite.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./private-production-runtime-bundle.mjs",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs"
    ]
  },
  "scripts/current-memory-warmup-runtime-transition.mjs": {
    "sha256": "e46cfbf790211bfe32a57fa8e0923199a392878ff34146ef1c610f6f98397ccf",
    "imports": [
      "../js/core/ravscore-model-contract.js",
      "./check-current-memory-warmup-predecessor-source.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./rollback-assets/ravscore-model-contract.js"
    ]
  },
  "scripts/current-memory-warmup-prewrite.mjs": {
    "sha256": "76656853ec4812e22084cf6f26f7a4a179acbd61bb2649969415b103910032ec",
    "imports": [
      "../js/core/ravscore-model-contract.js",
      "./check-current-memory-warmup-predecessor-source.mjs",
      "./current-memory-warmup-runtime-transition.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs",
      "./rollback-assets/ravscore-model-contract.js"
    ]
  },
  "scripts/migrate-post-cutover-private-runtime.mjs": {
    "sha256": "1b097d22f4102dc80f8d2c917dbaead896ceb3e7b8f364992d3422c4d010d9f6",
    "imports": [
      "../js/core/ravscore-integrated-state-pipeline.js",
      "../js/core/ravscore-integrated.js",
      "../js/core/ravscore-model-contract.js",
      "../js/core/ravscore-public-model.js",
      "../js/core/ravscore-public-profile-contract.js",
      "../js/core/ravscore-public-runtime-contract.js",
      "./audit-ravscore-integrated-public-runtime.mjs",
      "./check-native-identity-frozen-i71-source.mjs",
      "./lib/bounded-conditions-predecessor-transition.mjs",
      "./lib/bounded-json-writer.mjs",
      "./lib/coastal-point-staging-contract.mjs",
      "./lib/dmi-marine-zone-exclusions.mjs",
      "./lib/private-conditions-hourly.mjs",
      "./lib/private-weather-component-inventory.mjs",
      "./lib/public-hour-delivery-pack.mjs",
      "./lib/ravscore-integrated-runtime.mjs",
      "./lib/ravscore-production-adapters.mjs",
      "./lib/ravscore-production-part-pipeline.mjs",
      "./lib/rebind-public-hour-pack-exact.mjs",
      "./private-production-runtime-bundle.mjs",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./public-conditions-lib.mjs",
      "./rollback-assets/ravscore-model-contract.js",
      "./runtime-binding-registry.mjs"
    ]
  },
  "scripts/check-native-identity-frozen-i71-source.mjs": {
    "sha256": "21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77",
    "imports": []
  }
});
const DATA=Object.freeze(['supabase/config.toml','supabase/schema.sql','supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
  'knowledge/rav-assistant-public-v1.json','scripts/fixtures/rav-assistant-evals-v1.json','version.json',
  'supabase/functions/_shared/rav-assistant-contract.ts','data/admin/ravscore-profile-selection.json',
  'data/live/coastal-parts-v2.json','.github/workflows/deploy-code-only-repair.yml','scripts/source-critical-gate.mjs']);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const env=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL','PYTHON']
  .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
const git=async(args,encoding=null)=>(await exec('git',['-C',ROOT,...args],
  {encoding,env:env(),timeout:30000,maxBuffer:32*1024*1024})).stdout;
function relative(p){assert.equal(typeof p,'string');assert.match(p,/^[A-Za-z0-9_./-]+$/);
  assert.equal(path.posix.normalize(p),p);assert(!path.posix.isAbsolute(p)&&p!=='.'&&p!=='..'&&!p.startsWith('../'));return p;}
async function noLinks(file){let at=path.parse(file).root;for(const leaf of path.relative(at,file).split(path.sep).filter(Boolean)){
  at=path.join(at,leaf);assert(!(await fs.lstat(at)).isSymbolicLink());}}
export async function withFrozenCurrentMemoryWarmupTestSource(group,useVerifiedSource){
  assert.equal(arguments.length,2);assert(group==='all'||Object.hasOwn(TARGETS,group));assert.equal(typeof useVerifiedSource,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const regular=new Set(String(await git(['ls-tree','-r','-z',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const m=/^100(?:644|755) blob [a-f0-9]{40}\t(.+)$/.exec(row);return m?[relative(m[1])]:[];}));
  const cache=new Map(),read=async file=>{relative(file);assert(regular.has(file),'Fixed regular Git leaf required');
    if(!cache.has(file))cache.set(file,Buffer.from(await git(['cat-file','blob',HEAD+':'+file])));return cache.get(file);};
  const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());
  await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
  const oldGit=await fs.lstat(gitDirectory,{bigint:true}),gitIdentity=[oldGit.dev,oldGit.ino,oldGit.birthtimeNs];
  return withNativeCurrentReanalysisPredecessorSource(async sourceRoot=>{
    const added=new Map(),directories=new Set(),seen=new Set();
    async function add(file,bytes){
      const absolute=path.join(sourceRoot,relative(file));
      try{assert.deepEqual(await fs.readFile(absolute),bytes,'Existing frozen producer byte unchanged');return false;}
      catch(error){if(error.code!=='ENOENT')throw error;}
      const missing=[];let at=path.dirname(absolute);
      while(at!==sourceRoot){try{await fs.lstat(at);break;}catch(error){if(error.code!=='ENOENT')throw error;missing.push(at);at=path.dirname(at);}}
      for(const directory of missing.reverse()){await fs.mkdir(directory);directories.add(directory);}
      await noLinks(path.dirname(absolute));await fs.writeFile(absolute,bytes,{flag:'wx',mode:0o600});added.set(file,sha(bytes));return true;
    }
    try{
      const scanner=await import(pathToFileURL(path.join(sourceRoot,'scripts/lib/static-module-closure.mjs')).href);
      const pending=group==='all'?Object.values(TARGETS):[TARGETS[group]];
      while(pending.length){
        const file=pending.pop();if(seen.has(file))continue;seen.add(file);
        const bytes=await read(file),isNew=await add(file,bytes);
        // The immutable helper already verified the complete existing122-leaf
        // producer closure. Only new test modules need additional selection.
        if(!isNew||!/\.(?:mjs|js|ts)$/.test(file))continue;
        const reviewed=REVIEWED[file];
        if(reviewed)assert.equal(sha(bytes),reviewed.sha256,'Whole reviewed fixed import inventory');
        const specifiers=reviewed?reviewed.imports:scanner.exactRelativeModuleSpecifiers(bytes.toString('utf8'),file);
        for(const specifier of specifiers){const base=relative(path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0])));
          const choices=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
          const found=choices.find(p=>regular.has(p));assert(found,'Unknown import: '+file+' '+specifier);pending.push(found);}
      }
      // These are exact data-only reads, NOT executed/scanned module bodies.
      // Never infer a whole-repository closure from arbitrary quoted strings.
      for(const file of DATA)await add(file,await read(file));
      const readiness=await import(pathToFileURL(path.join(sourceRoot,'scripts/integrated-cutover-readiness.mjs')).href);
      assert.equal(readiness.REQUIRED_CUTOVER_MIGRATIONS.length,51);
      assert.equal(readiness.LATEST_REQUIRED_CUTOVER_MIGRATION.version,'20261017020000');
      for(const descriptor of readiness.REQUIRED_CUTOVER_MIGRATIONS){const file='supabase/migrations/'+descriptor.filename;await add(file,await read(file));}
      await add('.git',Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n'));
      await readiness.inspectMigrationSources();
      const result=await useVerifiedSource(sourceRoot);
      return {result,head:HEAD,tree:TREE,targets:group==='all'?Object.values(TARGETS):[TARGETS[group]],addedLeaves:added.size};
    }finally{
      await noLinks(gitDirectory);const end=await fs.lstat(gitDirectory,{bigint:true});
      assert.deepEqual([end.dev,end.ino,end.birthtimeNs],gitIdentity,'External Git directory retained');
      for(const[file,pin]of added){const absolute=path.join(sourceRoot,file),stat=await fs.lstat(absolute);
        assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);assert.equal(sha(await fs.readFile(absolute)),pin,'Historical test/data leaf changed');}
      for(const file of [...added.keys()].reverse())await fs.unlink(path.join(sourceRoot,file));
      for(const directory of [...directories].sort((a,b)=>b.length-a.length))await fs.rmdir(directory);
    }
  });
}
export async function runFrozenCurrentMemoryWarmupSourceTarget(group,{sourceOnly=false}={}){
  assert.equal(arguments.length<3,true);assert(Object.hasOwn(TARGETS,group)||sourceOnly&&group==='all');
  assert.equal(typeof sourceOnly,'boolean');
  const receipt=await withFrozenCurrentMemoryWarmupTestSource(group,async sourceRoot=>{
    if(sourceOnly)return;
    const command=group==='builder'?[TARGETS[group],'--check']:['--test',TARGETS[group]];
    const output=await exec(process.execPath,command,{cwd:sourceRoot,
      env:{...env(),PYTHONDONTWRITEBYTECODE:'1'},timeout:15*60000,maxBuffer:4*1024*1024});
    assert(!/# skipped [1-9][0-9]*/.test(output.stdout),'No historical assertion skips');
    process.stdout.write(output.stdout);if(output.stderr)process.stderr.write(output.stderr);
  });
  console.log(JSON.stringify({kind:'FROZEN_CURRENT_MEMORY_WARMUP_NORMAL_TARGET',head:HEAD,tree:TREE,
    target:group,executed:!sourceOnly,addedLeaves:receipt.addedLeaves,originalAssertionsChanged:false,
    currentModelAdmission:false,networkCredentialsProvided:false}));
}
async function frozenCurrentMemoryWarmupCheckpointFactory(sourceRoot){
  const file='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
  assert.match(String(await git(['ls-tree',HEAD,'--',file],'utf8')),/^100644 blob [a-f0-9]{40}\t/);
  const source=String(await git(['cat-file','blob',HEAD+':'+file],'utf8'));
  assert.equal(sha(source),'d80211e76007b50518b13bca56e25b6caa29d8d3edee41e32b393ff474a54c6e');
  const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);
    assert(source.indexOf(a)<source.indexOf(b));return source.slice(source.indexOf(a),source.indexOf(b));};
  const factory=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
  assert.equal(sha(factory),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
  const imports=[['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
    ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],
    ['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
    ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
    ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],
    ['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
    ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
    ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs']];
  const text="import crypto from 'node:crypto';\n"+imports.map(([names,relative])=>
    'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(sourceRoot,relative)).href)+';').join('\n')
    +'\n'+factory+'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256};';
  const loaded=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,'84217430a712fec3e78c5c3115d86520a4011a388998af030d231a8433d52bb3');
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,'76a86277db106621e7f0952d0789f9038a4bf9cfe7993b88de5c9a49bf25b4b8');
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,'a519a34e91e552623892e28f3c1fa9ee67b65d1fa08869a96e34fa24bd6d832f');
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
export async function withFrozenCurrentMemoryWarmupCheckpointFactory(useFactory){
  assert.equal(arguments.length,1);assert.equal(typeof useFactory,'function');
  return withFrozenCurrentMemoryWarmupTestSource('postgres-source',async sourceRoot=>
    useFactory(await frozenCurrentMemoryWarmupCheckpointFactory(sourceRoot)));
}
export async function withFrozenCurrentMemoryWarmupPostgresSource(useVerifiedSource){
  assert.equal(arguments.length,1);assert.equal(typeof useVerifiedSource,'function');
  return withFrozenCurrentMemoryWarmupTestSource('postgres-source',async sourceRoot=>{
    const adapter=await import(pathToFileURL(path.join(sourceRoot,'scripts/lib/current-memory-warmup-postgres.mjs')).href);
    const factory=await frozenCurrentMemoryWarmupCheckpointFactory(sourceRoot);
    return useVerifiedSource({adapter,repositoryRoot:sourceRoot,factory});
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);assert(args.length===1||args.length===2);assert(args.length===1||args[1]==='--source-only');
  await runFrozenCurrentMemoryWarmupSourceTarget(args[0],{sourceOnly:args.length===2});
}
