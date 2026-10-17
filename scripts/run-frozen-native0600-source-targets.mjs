#!/usr/bin/env node
// Execute historical assertions on their actual immutable native0600 source.
// Not a current/source validator, historical data admission, install or Git write.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile as callbackExec} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {withCurrentMemoryWarmupPredecessorSource} from './check-current-memory-warmup-predecessor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),exec=promisify(callbackExec);
const HEAD='60d999a68136c43acb4d3664bbd66eed47283bb2',TREE='ead5743dd9098035b0de5f748de2009460506971';
const GROUPS=Object.freeze({
  native:Object.freeze(['scripts/test-native-identity-frozen-i71-source.mjs','scripts/test-native-sampling-identity-successor.mjs',
    'scripts/test-native-identity-normal-readiness.mjs','scripts/test-native-identity-normal-routing.mjs',
    'scripts/test-owned-i71-native-identity-working.mjs','scripts/test-native-identity-staging-working-copy.mjs',
    'scripts/test-native-identity-installed-migration-metadata.mjs','scripts/test-native-identity-checkpoint-runtime.mjs','scripts/test-native-identity-workflow.mjs']),
  epoch:Object.freeze(['scripts/test-weather-state-epoch-archive.mjs','scripts/test-weather-state-epoch-input-view.mjs',
    'scripts/test-weather-state-epoch-callers.mjs','scripts/test-weather-state-epoch.mjs','scripts/test-weather-state-epoch-budget.mjs','scripts/test-weather-state-epoch-workflow.mjs']),
  policy:Object.freeze(['scripts/test-code-only-userdata-policy-routing.mjs']),
  readiness:Object.freeze(['scripts/test-integrated-cutover-readiness.mjs']),
  install:Object.freeze(['scripts/test-integrated-cutover-install-contract.mjs']),
  routing:Object.freeze(['scripts/test-reusable-production-workflows.mjs']),
});
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL','PYTHON']
  .filter(k=>typeof process.env[k]==='string').map(k=>[k,process.env[k]]));
const git=async(args,encoding=null)=>(await exec('git',['-C',ROOT,...args],{encoding,env:environment(),timeout:30000,maxBuffer:32*1024*1024})).stdout;
const cleanRelative=p=>{assert.match(p,/^[A-Za-z0-9_./-]+$/);assert.equal(path.posix.normalize(p),p);assert(!path.posix.isAbsolute(p)&&p!=='.'&&p!=='..'&&!p.startsWith('../'));return p;};
async function noLinks(file){let at=path.parse(file).root;for(const leaf of path.relative(at,file).split(path.sep).filter(Boolean)){at=path.join(at,leaf);assert(!(await fs.lstat(at)).isSymbolicLink());}}
export async function withFrozenNative0600TestSource(group,useVerifiedSource){
  assert.equal(arguments.length,2);assert(Object.hasOwn(GROUPS,group));assert.equal(typeof useVerifiedSource,'function');
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const regular=new Set(String(await git(['ls-tree','-r','-z',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(row=>{
    const match=/^100(?:644|755) blob [a-f0-9]{40}\t(.+)$/.exec(row);return match?[cleanRelative(match[1])]:[];}));
  const bank=new Map(),read=async file=>{cleanRelative(file);assert(regular.has(file),'Fixed regular Git test source required');if(!bank.has(file))bank.set(file,Buffer.from(await git(['show',HEAD+':'+file])));return bank.get(file);};
  const pending=[...GROUPS[group],'scripts/integrated-cutover-readiness.mjs','supabase/config.toml',
    'supabase/schema.sql','supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql','knowledge/rav-assistant-public-v1.json',
    'data/admin/ravscore-profile-selection.json','data/live/coastal-parts-v2.json','version.json',
    '.github/workflows/deploy-code-only-repair.yml','.github/workflows/run-current-weather-once.yml',
    '.github/workflows/apply-weather-model-binding-only.yml',
    '.github/workflows/reusable-weather-build.yml','.github/workflows/update-and-deploy.yml',
    '.github/workflows/reusable-pages-deploy.yml','.github/workflows/reusable-operational-reentry.yml'];
  const readiness=(await read('scripts/integrated-cutover-readiness.mjs')).toString('utf8');
  pending.push(...[...readiness.matchAll(/filename:\s*'([^']+\.sql)'/g)].map(m=>'supabase/migrations/'+m[1]));
  const found=new Set();
  while(pending.length){const file=pending.pop();if(found.has(file))continue;found.add(file);const source=(await read(file)).toString('utf8');
    // Selection, NOT an issuer/module-closure waiver: every selected byte is
    // fixed-tree regular Git data; unresolved dynamic reads fail in the unchanged
    // normal target. The old helpers independently materialize their own pinned
    // historical closures. Never replace a module body or catch import errors.
    for(const match of source.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"\r\n]+)['"]/g)){
      const value=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1].split(/[?#]/,1)[0]));
      const target=regular.has(value)?value:regular.has(value+'.js')?value+'.js':regular.has(value+'.mjs')?value+'.mjs':null;
      if(target)pending.push(target);
    }
    for(const match of source.matchAll(/['"]([A-Za-z0-9_./-]+\.(?:mjs|js|json|geojson|sql|py|yml))['"]/g)){
      const value=match[1],candidates=[value,path.posix.normalize(path.posix.join(path.posix.dirname(file),value))];
      for(const candidate of candidates)if(regular.has(candidate))pending.push(candidate);
    }
  }
  const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
  const gitStat=await fs.lstat(gitDirectory,{bigint:true}),gitIdentity=[gitStat.dev,gitStat.ino,gitStat.birthtimeNs];
  return withCurrentMemoryWarmupPredecessorSource(async sourceRoot=>{
    const added=new Map(),directories=new Set();
    async function add(relative,bytes){const file=path.join(sourceRoot,relative);await noLinks(path.dirname(file)).catch(async e=>{if(e.code!=='ENOENT')throw e;});
      try{assert.deepEqual(await fs.readFile(file),bytes,'Existing genuine producer leaf must remain exact');return;}catch(error){if(error.code!=='ENOENT')throw error;}
      let at=path.dirname(file);const missing=[];while(at!==sourceRoot){try{await fs.lstat(at);break;}catch(e){if(e.code!=='ENOENT')throw e;missing.push(at);at=path.dirname(at);}}
      for(const dir of missing.reverse()){await fs.mkdir(dir);directories.add(dir);}
      await noLinks(path.dirname(file));await fs.writeFile(file,bytes,{flag:'wx',mode:0o600});added.set(relative,sha(bytes));
    }
    try{
      for(const file of [...found].sort())await add(file,await read(file));
      await add('.git',Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n'));
      for(const name of ['scripts/__pycache__','scripts/lib/__pycache__'])await add(name,Buffer.alloc(0));
      // Normal historical readiness itself proves the complete exact50 source.
      const normal=await import(pathToFileURL(path.join(sourceRoot,'scripts/integrated-cutover-readiness.mjs')).href);
      assert.equal(normal.REQUIRED_CUTOVER_MIGRATIONS.length,50);assert.equal(normal.LATEST_REQUIRED_CUTOVER_MIGRATION.version,'20261016060000');
      await normal.inspectMigrationSources();
      const result=await useVerifiedSource(sourceRoot);
      return {result,head:HEAD,tree:TREE,sourceLeaves:found.size};
    }finally{
      await noLinks(gitDirectory);const end=await fs.lstat(gitDirectory,{bigint:true});assert.deepEqual([end.dev,end.ino,end.birthtimeNs],gitIdentity);
      for(const [relative,pin] of added){const file=path.join(sourceRoot,relative),stat=await fs.lstat(file);assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1);assert.equal(sha(await fs.readFile(file)),pin);}
      for(const relative of [...added.keys()].reverse())await fs.unlink(path.join(sourceRoot,relative));
      for(const dir of [...directories].sort((a,b)=>b.length-a.length))await fs.rmdir(dir);
    }
  });
}
export async function runFrozenNative0600SourceTargets(args=process.argv.slice(2)){
  assert(args.length===1||args.length===2);const group=args[0];assert(Object.hasOwn(GROUPS,group));
  const sourceOnly=args.length===2;assert(!sourceOnly||args[1]==='--source-only');
  const receipt=await withFrozenNative0600TestSource(group,async sourceRoot=>{
    if(sourceOnly)return;
    const commands=group==='native'?[[GROUPS.native[0]],['--test','--test-concurrency','2',...GROUPS.native.slice(1)]]
      :group==='epoch'?[['--test','--test-concurrency','2',...GROUPS.epoch]]:[[...GROUPS[group]]];
    for(const argv of commands){const result=await exec(process.execPath,argv,{cwd:sourceRoot,env:{...environment(),PYTHONDONTWRITEBYTECODE:'1'},timeout:15*60000,maxBuffer:4*1024*1024});
      if(argv.includes('--test'))assert(!/\bskipped [1-9][0-9]*\b|# skipped [1-9][0-9]*/.test(result.stdout),'No skipped historical assertions');
    }
  });
  console.log(JSON.stringify({kind:'FROZEN_NATIVE0600_NORMAL_SOURCE_TARGETS',head:HEAD,tree:TREE,group,targetCount:GROUPS[group].length,
    sourceLeaves:receipt.sourceLeaves,originalAssertionsChanged:false,executed:!sourceOnly,networkCredentialsProvided:false}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await runFrozenNative0600SourceTargets().catch(()=>{console.error('FROZEN_NATIVE0600_NORMAL_TARGET_FAILED');process.exitCode=1;});
