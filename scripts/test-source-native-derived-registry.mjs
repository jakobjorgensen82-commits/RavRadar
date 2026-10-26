// Focused normal fixture guard: no provider/native/SQL or production calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {build} from './build-public-coastal-parts-v2.mjs';
import {assertCurrentNativeSourceWithDerivedRegistry} from './fixtures/source19-current-normal-inputs.mjs';
const ROOT=fileURLToPath(new URL('../',import.meta.url));
const REGISTRY='data/live/coastal-parts-v2.json';

test('SOURCE normal producer resolves its genuine585 DATA factory before native work',async()=>{
  const source=await fs.readFile(new URL('./fixtures/source19-current-normal-inputs.mjs',import.meta.url),'utf8');
  const calls=[...source.matchAll(/await \(await load\(ROOT, '(scripts\/[A-Za-z0-9_./-]+)'\)\)\s*\.withAuthenticated585PredecessorSource\(/g)];
  assert.equal(calls.length,1,'Exactly one actual normal585 factory call, not a separate test substitute');
  // Resolve/import the literal used by the real producer without entering its
  // Linux/PostgreSQL/provider route or manufacturing a frozen origin handle.
  const factory=await import(new URL('../'+calls[0][1],import.meta.url));
  assert.equal(typeof factory.withAuthenticated585PredecessorSource,'function');
  assert.equal(calls[0][1],'scripts/check-native-original-continuity-predecessor-source.mjs',
    'Use the existing genuine585 source owner, never a SOURCE-retagged alias');
});

test('SOURCE normal archival recipe receives its explicit path dependency',async()=>{
  const source=await fs.readFile(new URL('./fixtures/source19-current-normal-inputs.mjs',import.meta.url),'utf8');
  const recipe=execFileSync('git',['-C',ROOT,'show',
    'e8f9f7197d9e262720b7627b4970d3da82baa9d9:scripts/test-last-mile-enclosure-restart-archive-origin.mjs'],
    {env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'},
      timeout:30000,maxBuffer:1024*1024});
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(recipe.length,64375);
  assert.equal(sha(recipe),'06416defda5802bf4c98c8c265dd784263c93f50b2de9b9c39360ce95b582101');
  const text=recipe.toString('utf8'),start='    const publicDocs=new Map(',end='    const originalFiles=';
  assert.equal(text.split(start).length,2);assert.equal(text.split(end).length,2);
  const publicBody=text.slice(text.indexOf(start),text.indexOf(end,text.indexOf(start)));
  const callStart="  await AsyncFunction('archiveModule'",callEnd='  assert(Date.parse(time(7))';
  assert.equal(source.split(callStart).length,2);assert.equal(source.split(callEnd).length,2);
  const invocation=source.slice(source.indexOf(callStart),source.indexOf(callEnd,source.indexOf(callStart)));
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const archive=await import('./lib/weather-state-epoch-archive.mjs');
  const originals=path.join(ROOT,'.cache','unwritten-archival-path-unit'),saved=new Map();
  const load=async(root,file)=>{assert.equal(root,ROOT);assert.equal(file,'scripts/lib/weather-state-epoch-archive.mjs');return archive;};
  const writeNew=async(file,raw)=>{assert(Buffer.isBuffer(raw));assert(!saved.has(file));saved.set(file,JSON.parse(raw));};
  const oldI=Object.freeze({scope:'synthetic-lexical-dependency-only'}),time=hour=>new Date(Date.UTC(2026,9,25,hour)).toISOString();
  // Execute the actual fixture invocation and byte-identical archived body.
  // This is only an in-memory dependency regression, never B/S admission.
  await AsyncFunction('AsyncFunction','publicBody','load','ROOT','oldI','originals','writeNew','sha','time','path',invocation)(
    AsyncFunction,publicBody,load,ROOT,oldI,originals,writeNew,sha,time,path);
  assert.deepEqual([...saved.keys()].sort(),archive.WEATHER_STATE_EPOCH_PUBLIC_FILES.map(name=>path.join(originals,name)).sort());
  const manifest=saved.get(path.join(originals,'manifest.json'));
  assert.deepEqual(manifest.ravScoreModelBinding,oldI);assert.equal(manifest.zoneCount,210);assert.equal(manifest.coastalPartCount,673);
  assert.equal(manifest.productionReferenceAt,time(6));
  for(const name of archive.WEATHER_STATE_EPOCH_PUBLIC_FILES.filter(name=>name!=='manifest.json'))
    assert.equal(saved.get(path.join(originals,name)).fixtureOnly,name,'Old archival labels stay archival-only');
});

test('SOURCE fixture accepts ONLY the exact normal derived registry and keeps every other tracked byte strict',async()=>{
  const own=await fs.mkdtemp(path.join(os.tmpdir(),'rr-source-derived-registry-'));
  const sourceDirectory=path.join(own,'source');await fs.mkdir(sourceDirectory);
  const repositoryRoot=await fs.realpath(sourceDirectory);
  const git=(...args)=>execFileSync('git',['-c','core.autocrlf=false','-c','core.hooksPath=/dev/null',
    '-C',repositoryRoot,...args],{encoding:'utf8',env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',
      GIT_TERMINAL_PROMPT:'0'}}).trim();
  const geometry='data/geometry-v2/active-national-coastal-parts/';
  const inputs=['data/zones.geojson','data/admin/coastline-overrides.json','data/admin/direction-reviews.json',REGISTRY,
    ...['manifest.json','coastal-parts.geojson','part-names.json','point-pairs.json','dmi-grid-proof.json'].map(name=>geometry+name)];
  for(const name of inputs){const target=path.join(repositoryRoot,name);await fs.mkdir(path.dirname(target),{recursive:true});
    try{await fs.copyFile(path.join(ROOT,name),target);}catch(error){
      if(error.code!=='ENOENT'||!['data/admin/coastline-overrides.json','data/admin/direction-reviews.json'].includes(name))throw error;
    }}
  // A valid but non-canonical saved spelling keeps this regression independent
  // of whether a later repository refresh already committed the derived file.
  await fs.appendFile(path.join(repositoryRoot,REGISTRY),' ');
  const marker=path.join(repositoryRoot,'source-marker.js');await fs.writeFile(marker,'// committed test source\n');
  git('init','--quiet');git('add','--','.');
  git('-c','user.name=RavRadar fixture','-c','user.email=fixture@invalid','commit','--quiet','-m','Fixed synthetic inputs');
  const file=path.join(repositoryRoot,REGISTRY),before=await fs.readFile(file);
  const options={source:path.join(repositoryRoot,geometry),output:file,
    overrides:path.join(repositoryRoot,'data/admin/coastline-overrides.json'),
    directionReviews:path.join(repositoryRoot,'data/admin/direction-reviews.json'),
    zonesFile:path.join(repositoryRoot,'data/zones.geojson')};
  const normal=await build(options),canonical=await fs.readFile(file);
  assert.equal(normal.zoneCount,210);assert.equal(normal.partCount,673);
  assert(!canonical.equals(before),'Saved input spelling differs from its normal derived registry');
  assert.throws(()=>assert.equal(git('diff','--name-only','HEAD'),''),{code:'ERR_ASSERTION'},
    'RED: the former whole-tree-clean guard rejects this legitimate builder output');
  assert.equal(await assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,
    proofPath:path.join(own,'accepted.json')}),true);
  assert((await fs.readFile(file)).equals(canonical),'No normal input rewrite by the new guard');
  await fs.writeFile(marker,'// changed source\n');
  await assert.rejects(assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,
    proofPath:path.join(own,'changed-source.json')}),/Committed CURRENT source/);
  await fs.writeFile(marker,'// committed test source\n');
  await fs.writeFile(file,Buffer.concat([canonical,Buffer.from('\n')]));
  await assert.rejects(assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,
    proofPath:path.join(own,'changed-derived.json')}),/Exact complete normal derived registry/);
  await fs.writeFile(file,canonical);
  const admin=path.join(repositoryRoot,'data/zones.geojson'),adminBefore=await fs.readFile(admin);
  await fs.writeFile(admin,Buffer.concat([adminBefore,Buffer.from(' ')]));
  await assert.rejects(assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,
    proofPath:path.join(own,'changed-admin.json')}),/Committed CURRENT source/);
  await fs.writeFile(admin,adminBefore);
  const occupied=path.join(own,'occupied.json');await fs.writeFile(occupied,'retained');
  await assert.rejects(assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,proofPath:occupied}),
    /Exclusive derived-registry comparison/);
  assert.equal(await fs.readFile(occupied,'utf8'),'retained');
  git('add','--',REGISTRY);git('-c','user.name=RavRadar fixture','-c','user.email=fixture@invalid',
    'commit','--quiet','-m','Normal derived input');
  assert.equal(git('diff','--name-only','HEAD'),'');
  assert.equal(await assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,
    proofPath:path.join(own,'already-canonical.json')}),true);
});
