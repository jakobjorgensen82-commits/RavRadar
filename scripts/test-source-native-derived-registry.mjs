// Focused normal fixture guard: no provider/native/SQL or production calls.
import assert from 'node:assert/strict';
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
