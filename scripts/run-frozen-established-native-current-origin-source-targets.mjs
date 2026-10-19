#!/usr/bin/env node
// Genuine historical140000 normal targets. No current source/admission issuer.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath,pathToFileURL} from 'node:url';
import {withEstablishedNativeCurrentOrigin140000PredecessorSource} from './check-established-native-current-origin-predecessor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),exec=promisify(callbackExec);
const HEAD='edf68357f3b2aa6654629d49b7e12084473932df',TREE='0ee995dc288278652fc4e5b92a2007050a57aced';
const TARGETS=Object.freeze({builder:'scripts/build-established-native-current-origin-successor.mjs',
 successor:'scripts/test-established-native-current-origin-successor.mjs',applied:'scripts/test-established-native-current-origin-successor.mjs',
 'postgres-source':'scripts/test-established-native-current-origin-postgres-source.mjs',followers:'scripts/test-established-native-current-origin-followers.mjs'});
// Exact source-bound inventory for the few historical computed-import hosts;
// every other added module uses the unchanged normal strict import scanner.
const REVIEWED=Object.freeze({
  "scripts/test-established-native-current-origin-successor.mjs": {
    "sha256": "fd851a28c08b8d71abcf3ef81991f92c29b31a4e9c3b1ea3aea7e628ce55a432",
    "imports": [
      "./build-established-native-current-origin-successor.mjs",
      "./lib/established-native-current-origin-successor-source.mjs",
      "./lib/current-memory-warmup-successor-source.mjs",
      "./integrated-cutover-readiness.mjs",
      "./verify-established-native-current-origin-plan.mjs",
      "./established-native-current-origin-prewrite.mjs",
      "./sync-ravscore-model-binding.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./public-conditions-lib.mjs"
    ]
  },
  "scripts/test-established-native-current-origin-postgres-source.mjs": {
    "sha256": "1108891caa8da8e3d8847ebde81666f7e847f0f8ee211de81fcc479130c8a0ae",
    "imports": [
      "./lib/established-native-current-origin-postgres.mjs",
      "./lib/established-native-current-origin-successor-source.mjs",
      "./lib/current-memory-warmup-successor-source.mjs"
    ]
  },
  "scripts/test-established-native-current-origin-followers.mjs": {
    "sha256": "dc8ed7872a470018b28c8cf960be9ef353bb7c65c2046520ffc08e662fd8976c",
    "imports": [
      "./lib/established-native-current-origin-cp-fixture.mjs",
      "./lib/established-native-current-origin-test-transports.mjs"
    ]
  },
  "scripts/established-native-current-origin-prewrite.mjs": {
    "sha256": "28fd39e193bd231dfdca76adde268409be8d8b34126011807e290c3200fdc7fc",
    "imports": [
      "./established-native-current-origin-runtime-transition.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./check-native-current-reanalysis-predecessor-source.mjs",
      "./lib/established-native-current-origin-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs"
    ]
  },
  "scripts/established-native-current-origin-runtime-transition.mjs": {
    "sha256": "8712d49df8a91b0669e3fb13865a57ae7df0a70775a6cfa1aa8cf323e7541b98",
    "imports": [
      "./lib/bounded-json-writer.mjs",
      "./lib/established-native-current-origin.mjs",
      "./check-native-current-reanalysis-predecessor-source.mjs",
      "./lib/established-native-current-origin-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./protected-private-production-runtime.mjs"
    ]
  },
  "scripts/run-frozen-current-memory-warmup-source-targets.mjs": {
    "sha256": "0a5146f73005ad79baf62fd4997a1ac8030573d153238ff68c8f3e1910221329",
    "imports": [
      "./check-native-current-reanalysis-predecessor-source.mjs"
    ]
  },
  "scripts/check-native-identity-frozen-i71-source.mjs": {
    "sha256": "21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77",
    "imports": []
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
  "scripts/lib/established-native-current-origin-cp-fixture.mjs": {
    "sha256": "4816464052247abb993d97521ed28ab4fc0e0de10ecc77c390ab6ba0b80e380d",
    "imports": [
      "./live-current-pilot.mjs"
    ]
  },
  "scripts/check-current-memory-warmup-predecessor-source.mjs": {
    "sha256": "a201e4afb0da382623004d7717ca867d9a9b881ff107e7a30dd052a5b2a68989",
    "imports": []
  },
  "scripts/lib/current-memory-warmup-postgres.mjs": {
    "sha256": "2e1498b7603a6625d415a1aed8c042c73d747ddd408f4222bdb0e3aa6046e091",
    "imports": [
      "../check-current-memory-warmup-predecessor-source.mjs",
      "./current-memory-warmup-successor-source.mjs",
      "../integrated-cutover-readiness.mjs",
      "../verify-account-assistant-schema.mjs",
      "../protected-ravscore-continuation-checkpoint.mjs",
      "../ravscore-continuation-checkpoint.mjs",
      "../../js/core/ravscore-integrated-state-pipeline.js",
      "../../js/core/ravscore-candidate-g-state-pipeline.js",
      "../../js/core/ravscore-model-contract.js",
      "../rollback-assets/ravscore-model-contract.js",
      "./coastal-point-staging-contract.mjs",
      "./ravscore-candidate-g-rollback-runtime.mjs",
      "./ravscore-continuation-implementation-contract.mjs"
    ]
  },
  "scripts/protected-private-production-runtime.mjs": {
    "sha256": "e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762",
    "imports": [
      "./private-production-runtime-bundle.mjs",
      "./lib/supabase-admin-rest.mjs",
      "../js/core/ravscore-model-contract.js",
      "./lib/r2-private-runtime-storage.mjs",
      "./lib/private-weather-component-inventory.mjs",
      "./lib/bounded-conditions-predecessor-transition.mjs"
    ]
  },
  "scripts/lib/historical-wave-input-transition.mjs": {
    "sha256": "fcc199d299c5173dae8fcb7ea8726e6717c2f3aeaaf038f5588a010fcc0460ef",
    "imports": [
      "../../js/core/ravscore-model-contract.js",
      "../private-production-runtime-bundle.mjs",
      "./ravscore-recovery-replay.mjs"
    ]
  },
  "scripts/build-public-coastal-parts-v2.mjs": {
    "sha256": "ad4dcfb1158639be600b1740453841f130539cf34f3f8e73158e3ad53fb99105",
    "imports": []
  },
  "scripts/private-production-runtime-bundle.mjs": {
    "sha256": "2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529",
    "imports": [
      "../js/core/ravscore-model-contract.js",
      "./lib/bounded-conditions-predecessor-transition.mjs",
      "./lib/private-weather-component-inventory.mjs"
    ]
  }
});
const DATA=Object.freeze(['supabase/config.toml','supabase/schema.sql','supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
 'knowledge/rav-assistant-public-v1.json','scripts/fixtures/rav-assistant-evals-v1.json','version.json',
 'supabase/functions/_shared/rav-assistant-contract.ts','data/admin/ravscore-profile-selection.json',
 'data/live/coastal-parts-v2.json','.github/workflows/deploy-code-only-repair.yml','scripts/source-critical-gate.mjs',
 'scripts/test-ravscore-recovery-replay.mjs']);
// These are TEXT inputs of the whole genuine follower, not executable imports
// of its sparse host. The follower copies them into its own genuine BASE clone.
// Read only the existing fixed HEAD/TREE; never supply current582 afterimages or
// relax the strict import scanner for the modules actually loaded by this host.
const FOLLOWER_TEXT_INPUTS=Object.freeze([
 ['scripts/lib/established-native-current-origin.mjs','e4741332e9cc54523fccf8ded70ace9767047d97090306c00fafd43385235c42'],
 ['scripts/lib/ravscore-production-part-pipeline.mjs','dadb5bf8c37fd12415b4596523df218f67cca4d4775b1cf8d0f2066c524cabd0'],
 ['scripts/update-weather.mjs','608b795d382d96fed7435ffd9437f589f8771ea742ec65f75053d25059b9d25d'],
 ['scripts/public-conditions-lib.mjs','e5a921d2a818694cfa13d5fcb30392cad972dc3b7038e929bc1d659a95f8017d'],
 ['scripts/check-native-current-reanalysis-predecessor-source.mjs','1c08778a28bc3931b42430eaa94d9659dd279f42528c5306631b971c4405928d'],
 ['scripts/lib/model-source-imports.mjs','534aa596471ea2fd68661540c4ed5e29d8385cf7cbf45f0c010e7e3357ec811b'],
 ['scripts/build-ravscore-model-bundle.mjs','974a8af2c8fdbc92217b15f582142f43a13288143d635b72dec0521021a66dcd'],
 ['scripts/build-candidate-g-rollback-bundle.mjs','79e030daafc41f56c20d343c1a246ad79b82fce2cd27a3f636a762f8f687dbf0'],
 ['scripts/test-weather-update-entrypoint.mjs','72035cc686f34b86a3e5702d6c6f25831a8bbbb451b3465b29286cd96a17beed'],
]);
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const env=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL','PYTHON']
 .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
const git=async(args,encoding=null)=>(await exec('git',['-C',ROOT,...args],{encoding,env:env(),timeout:30000,maxBuffer:32*1024*1024})).stdout;
function relative(p){assert.equal(typeof p,'string');assert.match(p,/^[A-Za-z0-9_./-]+$/);assert.equal(path.posix.normalize(p),p);
 assert(!path.posix.isAbsolute(p)&&p!=='.'&&p!=='..'&&!p.startsWith('../'));return p;}
async function noLinks(file){let at=path.parse(file).root;for(const leaf of path.relative(at,file).split(path.sep).filter(Boolean)){
 at=path.join(at,leaf);assert(!(await fs.lstat(at)).isSymbolicLink());}}
async function withFrozenEstablishedNativeCurrentOriginTestSource(group,useVerifiedSource){
 assert(Object.hasOwn(TARGETS,group)||group==='all');assert.equal(typeof useVerifiedSource,'function');
 assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
 const regular=new Set(String(await git(['ls-tree','-r','-z',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
  const m=/^100(?:644|755) blob [a-f0-9]{40}\t(.+)$/.exec(row);return m?[relative(m[1])]:[];}));
 const cache=new Map(),read=async file=>{relative(file);assert(regular.has(file));
  if(!cache.has(file))cache.set(file,Buffer.from(await git(['cat-file','blob',HEAD+':'+file])));return cache.get(file);};
 const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());
 await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
 const gitBefore=await fs.lstat(gitDirectory,{bigint:true}),gitIdentity=[gitBefore.dev,gitBefore.ino,gitBefore.birthtimeNs];
 const result=await withEstablishedNativeCurrentOrigin140000PredecessorSource(async sourceRoot=>{
  const added=new Map(),directories=new Set(),seen=new Set();let readinessOriginal;
  async function add(file,bytes){const absolute=path.join(sourceRoot,relative(file));
   try{const actual=await fs.readFile(absolute);if(file==='scripts/integrated-cutover-readiness.mjs'){
     assert.equal(sha(actual),'3dcd344d6f25bf5906b473c3289b23d50621223b57cbb53ddfe7be9679e7552a');
     assert.equal(sha(bytes),'647f46129b92431275c6d091d9a325c32fc3e48efda78f7c00908bc42c4d3da8');
     const old='export function assertSupabaseMigrationsApplied(migrationListText) {\n  assertCurrentMemoryWarmupMigrationsApplied(migrationListText);';
     const next='export function assertSupabaseMigrationsApplied(migrationListText) {\n  assertEstablishedNativeCurrentOriginMigrationsApplied(migrationListText);';
     assert.equal(bytes.toString().split(next).length,2);assert.equal(bytes.toString().replace(next,old),actual.toString(),
       'Whole genuine PR653 one-line applied-CLI inverse; no old oracle retag');
     readinessOriginal=actual;await fs.writeFile(absolute,bytes);return false;}
    assert.deepEqual(actual,bytes,'Existing frozen producer bytes unchanged');return false;
   }catch(error){if(error.code!=='ENOENT')throw error;}
   const missing=[];let at=path.dirname(absolute);while(at!==sourceRoot){try{await fs.lstat(at);break;}catch(e){if(e.code!=='ENOENT')throw e;missing.push(at);at=path.dirname(at);}}
   for(const dir of missing.reverse()){await fs.mkdir(dir);directories.add(dir);}await noLinks(path.dirname(absolute));
   await fs.writeFile(absolute,bytes,{flag:'wx',mode:0o600});added.set(file,sha(bytes));return true;
  }
  try{
   const scanner=await import(pathToFileURL(path.join(sourceRoot,'scripts/lib/static-module-closure.mjs')).href);
   const pending=[...(group==='all'?[...new Set(Object.values(TARGETS))]:[TARGETS[group]]),'scripts/integrated-cutover-readiness.mjs'];
   while(pending.length){const file=pending.pop();if(seen.has(file))continue;seen.add(file);
    const bytes=await read(file),isNew=await add(file,bytes);
    if(!isNew||!/\.(?:mjs|js|ts)$/.test(file))continue;
    const reviewed=REVIEWED[file];if(reviewed)assert.equal(sha(bytes),reviewed.sha256,'Exact reviewed historical computed-import leaf');
    const imports=reviewed?reviewed.imports:scanner.exactRelativeModuleSpecifiers(bytes.toString('utf8'),file);
    for(const specifier of imports){const base=relative(path.posix.normalize(path.posix.join(path.posix.dirname(file),specifier.split(/[?#]/,1)[0])));
     const choices=path.posix.extname(base)?[base]:[base,base+'.js',base+'.mjs',base+'.json',base+'/index.js'];
     const found=choices.find(p=>regular.has(p));assert(found,'Unknown historical relative import: '+file+' '+specifier);pending.push(found);}
   }
   for(const file of DATA)await add(file,await read(file));
   if(group==='followers'||group==='all')for(const[file,pin]of FOLLOWER_TEXT_INPUTS){
    const bytes=await read(file);assert.equal(sha(bytes),pin,'Whole genuine140000 follower text input');
    await add(file,bytes);
   }
   const readiness=await import(pathToFileURL(path.join(sourceRoot,'scripts/integrated-cutover-readiness.mjs')).href);
   assert.equal(readiness.REQUIRED_CUTOVER_MIGRATIONS.length,52);assert.equal(readiness.LATEST_REQUIRED_CUTOVER_MIGRATION.version,'20261017140000');
   for(const row of readiness.REQUIRED_CUTOVER_MIGRATIONS){const file='supabase/migrations/'+row.filename;await add(file,await read(file));}
   await add('.git',Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n'));
   await readiness.inspectMigrationSources();
   return await useVerifiedSource(sourceRoot,added.size);
  }finally{
   if(readinessOriginal){const file=path.join(sourceRoot,'scripts/integrated-cutover-readiness.mjs');
    assert.equal(sha(await fs.readFile(file)),'647f46129b92431275c6d091d9a325c32fc3e48efda78f7c00908bc42c4d3da8');await fs.writeFile(file,readinessOriginal);}
   await noLinks(gitDirectory);const after=await fs.lstat(gitDirectory,{bigint:true});assert.deepEqual([after.dev,after.ino,after.birthtimeNs],gitIdentity);
   for(const[file,pin]of added){const stat=await fs.lstat(path.join(sourceRoot,file));assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);
    assert.equal(sha(await fs.readFile(path.join(sourceRoot,file))),pin,'Historical test/data leaf changed');}
   for(const file of [...added.keys()].reverse())await fs.unlink(path.join(sourceRoot,file));
   for(const dir of [...directories].sort((a,b)=>b.length-a.length))await fs.rmdir(dir);
  }
 });
 return result;
}
export async function runFrozenEstablishedNativeCurrentOriginSourceTarget(group,{sourceOnly=false}={}){
 assert(arguments.length<=2);assert.equal(typeof sourceOnly,'boolean');assert(Object.hasOwn(TARGETS,group)||group==='all'&&sourceOnly);
 const result=await withFrozenEstablishedNativeCurrentOriginTestSource(group,async(sourceRoot,addedLeaves)=>{
   if(sourceOnly)return {addedLeaves:addedLeaves,sourceOnly:true};
   const command=group==='builder'?[TARGETS[group],'--check']:['--test',...(group==='applied'?['--test-name-pattern','^normal applied CLI reads the installed origin phase']:[]),TARGETS[group]];
   const output=await exec(process.execPath,command,{cwd:sourceRoot,env:{...env(),PYTHONDONTWRITEBYTECODE:'1'},timeout:15*60000,maxBuffer:4*1024*1024});
   assert(!/# skipped [1-9][0-9]*/.test(output.stdout));process.stdout.write(output.stdout);if(output.stderr)process.stderr.write(output.stderr);
   return {addedLeaves:addedLeaves};
 });
 if(!sourceOnly&&['followers','postgres-source'].includes(group)){
  const target=group==='followers'?'scripts/test-assistant-same-h0-followers.mjs':'scripts/test-assistant-same-h0-postgres-source.mjs';
  const args=group==='followers'?[path.join(ROOT,target)]:['--test',path.join(ROOT,target)];
  const current=await exec(process.execPath,args,{cwd:ROOT,env:{...env(),PYTHONDONTWRITEBYTECODE:'1'},timeout:15*60000,maxBuffer:4*1024*1024});
  process.stdout.write(current.stdout);if(current.stderr)process.stderr.write(current.stderr);
 }
 console.log(JSON.stringify({kind:'FROZEN_140000_NORMAL_TARGET',group,head:HEAD,tree:TREE,...result,
  wholeOldAssertionsPreserved:true,currentAdmission:false,networkCredentialsProvided:false}));
}

// Whole genuine85 declaration factory against genuine frozen140000 modules.
// Neither the current582 constructor nor edited tuple data can supply OLD rows.
async function frozenEstablishedNativeCurrentOriginCheckpointFactory(sourceRoot){
 const fixed='85fe6f7ffa889af0b74346a12d0b4385ce4ab0e9',file='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
 assert.equal(String(await git(['rev-parse',fixed+'^{tree}'],'utf8')).trim(),'b7deb9eb805f5bdcd79ad0e02c1612bd99946d61');
 assert.match(String(await git(['ls-tree',fixed,'--',file],'utf8')),/^100644 blob [a-f0-9]{40}\t/);
 const source=String(await git(['cat-file','blob',fixed+':'+file],'utf8'));
 assert.equal(sha(source),'2e7024d0a90fea7fb9166f906450b65925cc9a9a8d9e800935952eaa78b9f27b');
 const slice=(a,b)=>{assert.equal(source.split(a).length,2);assert.equal(source.split(b).length,2);assert(source.indexOf(a)<source.indexOf(b));return source.slice(source.indexOf(a),source.indexOf(b));};
 const factory=slice('const PART_COUNT =','const safeShape =')+slice('const samples =','const sourceDocument =');
 assert.equal(sha(factory),'832098498476efe1b119472f16fe6e254496640b2e7ad5bf23d5518088926ed2');
 const imports=[['buildIntegratedRavScoreStateSeries','js/core/ravscore-integrated-state-pipeline.js'],
  ['buildCandidateGDerivedStateSeries','js/core/ravscore-candidate-g-state-pipeline.js'],['ravScoreModelBinding','js/core/ravscore-model-contract.js'],
  ['ravScoreModelBinding as candidateGRollbackModelBinding','scripts/rollback-assets/ravscore-model-contract.js'],
  ['candidateGStateKey','scripts/lib/coastal-point-staging-contract.mjs'],['CANDIDATE_G_OPERATIONAL_ROLLBACK_ID','scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'],
  ['RAVSCORE_CONTINUATION_CHECKPOINT_POLICY,saveRavScoreContinuationCheckpoint','scripts/ravscore-continuation-checkpoint.mjs'],
  ['ravScoreContinuationImplementationSha256','scripts/lib/ravscore-continuation-implementation-contract.mjs']];
 const text="import crypto from 'node:crypto';\n"+imports.map(([names,file])=>'import { '+names+' } from '+JSON.stringify(pathToFileURL(path.join(sourceRoot,file)).href)+';').join('\n')
  +'\n'+factory+'\nexport {sourceDocumentAt,atHour,saveRavScoreContinuationCheckpoint,ravScoreModelBinding,candidateGRollbackModelBinding,CURRENT_CONTINUATION_IMPLEMENTATION_SHA256};';
 const loaded=await import('data:text/javascript;base64,'+Buffer.from(text).toString('base64'));
 assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f');
 assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858');
 assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447');
 return Object.freeze({...loaded,sourceHead:fixed,sourceTree:'b7deb9eb805f5bdcd79ad0e02c1612bd99946d61'});
}
export async function withFrozenEstablishedNativeCurrentOriginPostgresSource(useVerifiedSource){
 assert.equal(arguments.length,1);assert.equal(typeof useVerifiedSource,'function');
 return withFrozenEstablishedNativeCurrentOriginTestSource('postgres-source',async sourceRoot=>{
  const adapter=await import(pathToFileURL(path.join(sourceRoot,'scripts/lib/established-native-current-origin-postgres.mjs')).href);
  const factory=await frozenEstablishedNativeCurrentOriginCheckpointFactory(sourceRoot);
  return useVerifiedSource({adapter,repositoryRoot:sourceRoot,factory});
 });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 assert(process.argv.length===3||process.argv.length===4);assert(process.argv.length===3||process.argv[3]==='--source-only');
 await runFrozenEstablishedNativeCurrentOriginSourceTarget(process.argv[2],{sourceOnly:process.argv.length===4});
}
