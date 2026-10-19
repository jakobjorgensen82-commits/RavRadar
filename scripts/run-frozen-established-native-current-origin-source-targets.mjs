#!/usr/bin/env node
// TEST ONLY: actual historical140000 source assertions, never584 admission.
// Explicit extension OUTSIDE the unchanged105 archive-reader inventory/API.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile as callbackExec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { withFrozenLastMileEnclosurePredecessorSource }
  from './check-last-mile-enclosure-predecessor-source.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const HEAD='d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7',TREE='0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0';
const INVENTORY=new URL('./lib/established-native-current-origin-source-target-inventory.json',import.meta.url);
const INVENTORY_SHA256='d20f82536e630f2fc92a9680a199b214542d90ba1950d05c444ea0801b50e0f8';
const execute=promisify(callbackExec),sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const environment=()=>Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL','PYTHON']
  .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
const git=async(args,encoding=null)=>(await execute('git',['-C',ROOT,...args],{encoding,
  env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'},
  timeout:30000,maxBuffer:24*1024*1024})).stdout;
function relative(file){assert.match(file,/^[A-Za-z0-9_./-]+$/);assert.equal(path.posix.normalize(file),file);
  assert(!path.posix.isAbsolute(file)&&file!=='.'&&file!=='..'&&!file.startsWith('../'));return file;}
const identity=stat=>{assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.nlink===1n&&stat.ino>0n);
  return [stat.dev,stat.ino,stat.birthtimeNs,stat.size];};
async function noLinks(file){let at=path.parse(file).root;
  for(const piece of path.relative(at,file).split(path.sep).filter(Boolean)){
    at=path.join(at,piece);assert(!(await fs.lstat(at)).isSymbolicLink());}}

export async function withFrozenEstablishedNativeCurrentOriginSourceTarget(group,callback){
  assert.equal(arguments.length,2);assert.equal(typeof callback,'function');
  const bytes=await fs.readFile(INVENTORY);assert.equal(sha(bytes),INVENTORY_SHA256,'Whole explicit historical target inventory');
  const inventory=JSON.parse(bytes);assert.equal(inventory.kind,'EXPLICIT_TEST_ONLY_140000_SOURCE_TARGET_EXTENSION');
  assert.equal(inventory.head,HEAD);assert.equal(inventory.tree,TREE);assert(Object.hasOwn(inventory.targets,group));
  assert.equal(String(await git(['rev-parse',HEAD+'^{tree}'],'utf8')).trim(),TREE);
  const regular=new Map(String(await git(['ls-tree','-r','-z',HEAD],'utf8')).split('\0').filter(Boolean).flatMap(line=>{
    const m=/^100(?:644|755) blob ([a-f0-9]{40})\t(.+)$/.exec(line);return m?[[relative(m[2]),m[1]]]:[];}));
  const base=await fs.readFile(new URL('./lib/last-mile-enclosure-predecessor-source-inventory.json',import.meta.url));
  assert.equal(sha(base),inventory.original105InventorySha256);assert.equal(inventory.original105Unchanged,true);
  const selected=new Map();
  for(const row of inventory.additionalFiles){relative(row.file);assert(!selected.has(row.file));
    assert.equal(regular.get(row.file),row.gitBlob);const raw=Buffer.from(await git(['cat-file','blob',HEAD+':'+row.file]));
    assert.equal(raw.length,row.bytes);assert.equal(sha(raw),row.sha256);selected.set(row.file,raw);}
  const gitDirectory=path.resolve(String(await git(['rev-parse','--absolute-git-dir'],'utf8')).trim());
  await noLinks(gitDirectory);assert.equal(await fs.realpath(gitDirectory),gitDirectory);
  const gitStat=await fs.lstat(gitDirectory,{bigint:true}),gitIdentity=[gitStat.dev,gitStat.ino,gitStat.birthtimeNs];
  return withFrozenLastMileEnclosurePredecessorSource(async sourceRoot=>{
    const added=new Map(),directories=new Map();let result,first;
    async function add(file,raw){
      const target=path.join(sourceRoot,relative(file));
      const existing=await fs.lstat(target).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
      if(existing){assert(existing.isFile()&&!existing.isSymbolicLink());assert.deepEqual(await fs.readFile(target),raw);return;}
      const missing=[];let at=path.dirname(target);
      while(at!==sourceRoot){try{await fs.lstat(at);break;}catch(error){if(error.code!=='ENOENT')throw error;
        missing.push(at);at=path.dirname(at);}}
      for(const directory of missing.reverse()){await fs.mkdir(directory,{mode:0o700});
        const stat=await fs.lstat(directory,{bigint:true});directories.set(directory,[stat.dev,stat.ino,stat.birthtimeNs]);}
      await noLinks(path.dirname(target));await fs.writeFile(target,raw,{flag:'wx',mode:0o600});
      added.set(file,{sha256:sha(raw),identity:identity(await fs.lstat(target,{bigint:true}))});
    }
    try{
      for(const[file,raw]of selected)await add(file,raw);
      await add('.git',Buffer.from('gitdir: '+gitDirectory.split(path.sep).join('/')+'\n'));
      const readiness=await import(pathToFileURL(path.join(sourceRoot,'scripts/integrated-cutover-readiness.mjs')).href);
      assert.equal(readiness.REQUIRED_CUTOVER_MIGRATIONS.length,52);
      assert.equal(readiness.LATEST_REQUIRED_CUTOVER_MIGRATION.version,'20261017140000');
      assert.deepEqual(readiness.REQUIRED_CUTOVER_MIGRATIONS.map(row=>'supabase/migrations/'+row.filename).sort(),
        [...inventory.requiredSqlFiles].sort(),'All genuine52 issued SQL operands, no silent inventory expansion');
      await readiness.inspectMigrationSources();
      result=await callback(sourceRoot,inventory.targets[group]);
    }catch(error){first=error;}
    try{
      await noLinks(gitDirectory);const stat=await fs.lstat(gitDirectory,{bigint:true});
      assert.deepEqual([stat.dev,stat.ino,stat.birthtimeNs],gitIdentity,'Actual external Git directory unchanged');
      for(const[file,pin]of added){const target=path.join(sourceRoot,file);await noLinks(target);
        assert.deepEqual(identity(await fs.lstat(target,{bigint:true})),pin.identity);
        assert.equal(sha(await fs.readFile(target)),pin.sha256,'Whole frozen target leaf unchanged');}
      for(const file of [...added.keys()].reverse())await fs.unlink(path.join(sourceRoot,file));
      for(const directory of [...directories.keys()].sort((a,b)=>b.length-a.length)){
        const stat=await fs.lstat(directory,{bigint:true});assert(stat.isDirectory()&&!stat.isSymbolicLink());
        assert.deepEqual([stat.dev,stat.ino,stat.birthtimeNs],directories.get(directory));await fs.rmdir(directory);}
    }catch(error){first=first?new AggregateError([first,error],'Historical target failed; cleanup stopped safely'):error;}
    if(first)throw first;return result;
  });
}
export async function runFrozenEstablishedNativeCurrentOriginSourceTarget(group,{sourceOnly=false}={}){
  assert.equal(typeof sourceOnly,'boolean');
  await withFrozenEstablishedNativeCurrentOriginSourceTarget(group,async(sourceRoot,target)=>{
    if(sourceOnly)return;
    const command=group==='builder'?[target,'--check']:group==='followers'?[target]:['--test',target];
    const out=await execute(process.execPath,command,{cwd:sourceRoot,
      env:{...environment(),PYTHONDONTWRITEBYTECODE:'1'},timeout:15*60000,maxBuffer:8*1024*1024});
    assert(!/# skipped [1-9][0-9]*/.test(out.stdout),'No old historical assertions skipped');
    process.stdout.write(out.stdout);if(out.stderr)process.stderr.write(out.stderr);
  });
  console.log(JSON.stringify({kind:'FROZEN_140000_EXACT_NORMAL_SOURCE_TARGET',head:HEAD,tree:TREE,
    group,executed:!sourceOnly,originalAssertionsChanged:false,old105InventoryChanged:false,
    current584Admission:false,productionAuthority:false,networkCredentialsProvided:false}));
}
async function frozen140000CheckpointFactory(sourceRoot){
  const relative='scripts/test-protected-ravscore-continuation-checkpoint.mjs';
  const source=String(await git(['cat-file','blob',HEAD+':'+relative],'utf8'));
  assert.equal(sha(source),'2e7024d0a90fea7fb9166f906450b65925cc9a9a8d9e800935952eaa78b9f27b');
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
  assert.equal(loaded.ravScoreModelBinding().modelBundleSha256,'038d9b0cdc50d36dd10f207c6f33e909ddedbdacb28c89adbca12121cb2c7f5f');
  assert.equal(loaded.candidateGRollbackModelBinding().modelBundleSha256,'5cc38c658bf14513a029a62de8f5f9e98259630755bdd84bccbc5fb2c1797858');
  assert.equal(loaded.CURRENT_CONTINUATION_IMPLEMENTATION_SHA256,'047db5f9c91b555eb47b886d200061456c9cbec450732743265f0f1739114447');
  return Object.freeze({...loaded,sourceHead:HEAD,sourceTree:TREE});
}
export async function withFrozenEstablishedNativeCurrentOriginPostgresSource(callback){
  assert.equal(arguments.length,1);assert.equal(typeof callback,'function');
  return withFrozenEstablishedNativeCurrentOriginSourceTarget('postgres-source',async sourceRoot=>{
    const adapter=await import(pathToFileURL(path.join(sourceRoot,'scripts/lib/established-native-current-origin-postgres.mjs')).href);
    const factory=await frozen140000CheckpointFactory(sourceRoot);
    return callback({adapter,repositoryRoot:sourceRoot,factory});
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert.equal(process.argv.length,3);await runFrozenEstablishedNativeCurrentOriginSourceTarget(process.argv[2]);
}
