// Private native profile preparation. No production data, phase callbacks,
// owner/session issuer, handwritten conditions, origin or public projection.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {DMI_FORECAST_FILE_MAX_BYTES} from '../lib/dmi-forecast-file.mjs';
import {isDeepStrictEqual} from 'node:util';
import {requireSourceProducerOutput, requireSourceProducerBinding,
  SOURCE_PRODUCER_BEFORE} from '../lib/source-producer-successor-source.mjs';
import {ASSISTANT_PUBLIC587_SUCCESSOR_BEFORE as ISSUED587}
  from '../lib/assistant-later-h0-successor-source.mjs';
import {assertFrozen588CodeSourceSelected} from '../check-assistant-later-h0-predecessor-source.mjs';
import {build as buildNormalRegistry} from '../build-public-coastal-parts-v2.mjs';
import {nativePostgresExceptionDiagnostic} from '../lib/checkpoint-cas-native-postgres.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OLD_HEAD = 'd8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7';
const OLD_TREE = '0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0';
const HEAD585 = 'e8f9f7197d9e262720b7627b4970d3da82baa9d9';
const TREE585 = '24dbf944916031ea256537b125966e946efeead8';
// New operative source, NOT the frozen585 factory or a qualified source proof.
const OPERATIVE_INITIAL_HEAD='e7c2e14a6403870e8a1df6c91862980640684733';
const OPERATIVE_INITIAL_TREE='10799761addcd1976055d9051bc5062f02eaf9f6';
const HEAD586='7df56f36f705db641b3f9476ee8ca1b4c4cfed0c',TREE586='57192d6d5cfbd8709f3558ad8afaaf10dd6cafe0';
const OPERATIVE587_HEAD='c03a4f8dc106e535db61d6248cb395a1a96b9b88',OPERATIVE587_TREE='42b345259142d5451386d56184374ce380c5ddd5';
const OPERATIVE588_HEAD='4845e6c6622333ad4e8454b0b43f5f94ae42233e',OPERATIVE588_TREE='30e8fd7994c3a625b55f6798fc0d268589bb4cfb';
const OLD_RECIPE = 'scripts/test-last-mile-enclosure-restart-archive-origin.mjs';
const OLD_RECIPE_SHA = '06416defda5802bf4c98c8c265dd784263c93f50b2de9b9c39360ce95b582101';
const REGISTRY = 'data/live/coastal-parts-v2.json';
const CHECKPOINT = '.cache/ravscore-continuation-checkpoint/checkpoint.json';
const sha = raw => crypto.createHash('sha256').update(raw).digest('hex');
const same = (a, b, reason) => assert(isDeepStrictEqual(a, b), reason);
const load = (root, relative) => import(pathToFileURL(path.join(root, relative)).href);
const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const inside = (root, file) => { const rel = path.relative(root, file);
  return rel !== '' && rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel); };
const exact = (value, keys) => {
  assert(value && Object.getPrototypeOf(value) === Object.prototype);
  same(Object.keys(value).sort(), [...keys].sort(), 'Exact private native input options');
};
function hour(value) {
  assert.equal(typeof value, 'string'); assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\.000Z$/);
  assert.equal(new Date(value).toISOString(), value); return value;
}
function git(root, ...args) {
  return execFileSync('git', ['-c', 'core.autocrlf=false', '-C', root, ...args], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 4 * 1024 * 1024, timeout: 30000,
    env: {...process.env, GIT_NO_REPLACE_OBJECTS: '1', GIT_NO_LAZY_FETCH: '1', GIT_TERMINAL_PROMPT: '0'},
  }).trim();
}
async function noLinks(file) {
  assert(path.isAbsolute(file)); let at = path.parse(file).root;
  for (const segment of path.relative(at, file).split(path.sep).filter(Boolean)) {
    at = path.join(at, segment); assert(!(await fs.lstat(at)).isSymbolicLink(), 'Private native path contains a link');
  }
}
export async function read(file, maximum = 256 * 1024 * 1024) {
  await noLinks(file); const before = await fs.lstat(file, {bigint: true});
  const reason = !before.isFile() ? 'NOT_REGULAR' : before.nlink !== 1n ? 'MULTIPLE_LINKS'
    : before.size <= 0n ? 'EMPTY' : before.size > BigInt(maximum) ? 'SIZE_LIMIT' : null;
  if (reason) {
    try { console.error(JSON.stringify({kind:'NATIVE_FIXTURE_FILE_READ_REFUSED',reason,
      regular:before.isFile(),links:String(before.nlink),bytes:String(before.size),maximum,
      privatePayloadIncluded:false})); } catch {} // Fixed enums/stat only; never a path or input body.
  }
  assert(before.isFile(), 'NATIVE_FIXTURE_FILE_NOT_REGULAR');
  assert.equal(before.nlink, 1n, 'NATIVE_FIXTURE_FILE_MULTIPLE_LINKS');
  assert(before.size > 0n, 'NATIVE_FIXTURE_FILE_EMPTY');
  assert(before.size <= BigInt(maximum), 'NATIVE_FIXTURE_FILE_SIZE_LIMIT');
  const raw = await fs.readFile(file), after = await fs.lstat(file, {bigint: true});
  same([before.dev, before.ino, before.size, before.mtimeNs, before.ctimeNs],
    [after.dev, after.ino, after.size, after.mtimeNs, after.ctimeNs], 'Input changed while reading');
  assert.equal(BigInt(raw.length), before.size); return raw;
}
async function writeNew(file, raw) {
  await fs.mkdir(path.dirname(file), {recursive: true}); await noLinks(path.dirname(file));
  const handle = await fs.open(file, 'wx', 0o600); let first;
  try { await handle.writeFile(raw); await handle.sync(); } catch (error) { first = error; }
  try { await handle.close(); } catch (error) { first ??= error; }
  if (first) throw first; same(await read(file, Math.max(raw.length, 1024)), raw, 'Private output read-back');
}

// Test-input guard only, never source or production admission. The provider
// fixture legitimately rebuilds this ONE tracked derived file before entry.
// Every other tracked byte must still equal HEAD, and this file must equal
// the whole actual normal builder output from the same committed inputs.
export async function assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot,proofPath}) {
  assert.equal(arguments.length,1);assert(path.isAbsolute(repositoryRoot)&&path.isAbsolute(proofPath));
  const source=await fs.realpath(repositoryRoot);assert.equal(source,repositoryRoot);
  assert(!inside(source,proofPath)&&proofPath!==source);
  await noLinks(source);await noLinks(path.dirname(proofPath));
  await assert.rejects(fs.lstat(proofPath),{code:'ENOENT'},'Exclusive derived-registry comparison');
  const changed=git(source,'diff','--name-only','HEAD').split(/\r?\n/).filter(Boolean);
  assert(changed.every(name=>name===REGISTRY),'Committed CURRENT source/admin inputs only');
  const actual=await read(path.join(source,REGISTRY));
  await buildNormalRegistry({source:path.join(source,'data/geometry-v2/active-national-coastal-parts'),
    output:proofPath,overrides:path.join(source,'data/admin/coastline-overrides.json'),
    directionReviews:path.join(source,'data/admin/direction-reviews.json'),zonesFile:path.join(source,'data/zones.geojson')});
  same(await read(proofPath),actual,'Exact complete normal derived registry, not a dirty-path exemption');
  same(await read(path.join(source,REGISTRY)),actual,'Derived registry unchanged during comparison');
  same(git(source,'diff','--name-only','HEAD').split(/\r?\n/).filter(Boolean),changed,
    'Source/admin files unchanged during normal derivation');
  return true;
}
function refuseFixtureOnly(value) {
  if (Array.isArray(value)) for (const item of value) refuseFixtureOnly(item);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    assert(!['fixtureOnly', 'syntheticDetails', 'syntheticPublicProjection'].includes(key), 'Not a normal full-runtime input');
    refuseFixtureOnly(item);
  }
}

// Exact normal acquisition/admin INPUTS only. In particular no conditions,
// checkpoint, authored origin, output registry, public pack or public projection.
const ADMIN = Object.freeze(['data/zones.geojson', 'data/admin/coastline-overrides.json',
  'data/admin/direction-reviews.json', 'data/geometry-v2/active-national-coastal-parts/manifest.json',
  ...['coastal-parts.geojson', 'part-names.json', 'point-pairs.json', 'dmi-grid-proof.json']
    .map(name => 'data/geometry-v2/active-national-coastal-parts/' + name)]);
const PROVIDERS = Object.freeze(['data/live/dmi-bulk-cache.json', 'data/live/dmi-forecast-cache.json',
  '.cache/dmi-active-complete.json', '.cache/dmi-candidate-progress.json',
  '.cache/copernicus-current-shadow.json', '.cache/copernicus-current-source-stage.json',
  '.cache/copernicus-current-donor-bank.json', '.cache/copernicus-current-segment-journal.json',
  '.cache/copernicus-component-bank.json', '.cache/copernicus-component-bank.json.progress.json',
  '.cache/open-meteo-current-fallback.json', '.cache/open-meteo-current-donor-bank.json',
  '.cache/open-meteo-part-component-bank.json', '.cache/current-field-shadow.json',
  '.cache/weather-component-fallback-cursor.json', '.cache/weather-component-selection-history.json',
  'data/live/current-pilot-history.json', 'data/live/dmi-water-stations.json']);

async function copyInputs(inputRoot, outputRoot, rows, allowed) {
  assert(Array.isArray(rows) && rows.length > 0); const seen = new Set();
  for (const row of rows) {
    exact(row, ['relativePath', 'bytes', 'sha256']); const name = row.relativePath;
    assert(allowed.includes(name) && !seen.has(name), 'Only exact normal input leaves'); seen.add(name);
    assert(Number.isSafeInteger(row.bytes) && row.bytes > 0); assert.match(row.sha256, /^[a-f0-9]{64}$/);
    const source = path.join(inputRoot, name), target = path.join(outputRoot, name);
    assert(inside(inputRoot, source) && inside(outputRoot, target));
    // Only this fixed forecast leaf uses its existing normal owner's file bound.
    const maximum = name === 'data/live/dmi-forecast-cache.json' ? DMI_FORECAST_FILE_MAX_BYTES : undefined;
    const raw = await read(source, maximum);
    same({bytes: raw.length, sha256: sha(raw)}, {bytes: row.bytes, sha256: row.sha256}, 'Actual prepared provider/admin input');
    // These are runtime input leaves in a fresh, owned Git work copy, not old
    // model code or originals. The later source-clean comparison excludes no code.
    refuseFixtureOnly(JSON.parse(raw)); await fs.mkdir(path.dirname(target), {recursive: true});
    await noLinks(path.dirname(target)); await fs.writeFile(target, raw);
    same(await read(target, maximum), raw, 'Actual copied provider/admin input');
  }
  return seen;
}

// SOURCE_PRODUCER_OBSERVATION_BEGIN
function observeSourceLegacyPhase(phase){
  try{console.error(JSON.stringify({kind:'SOURCE_LEGACY_PHASE_OBSERVATION',phase,privatePayloadIncluded:false}));}
  catch{} // Observation never changes the normal phase/exception/result.
}
// Observation only: these fixed owned source roots cannot admit data or a host.
// Keep a failed producer's original exception/result and five-field report.
async function sourceProducerFailureFrame(error, observation) {
  try {
    const deadline=performance.now()+10_000;
    const remaining=()=>{const value=Math.floor(deadline-performance.now());
      assert(value>0,'SOURCE_PRODUCER_DIAGNOSTIC_DEADLINE');return Math.min(value,2000);};
    const diagnosticGit=(root,...args)=>execFileSync('git',['-c','core.autocrlf=false','-C',root,...args],
      {encoding:'utf8',timeout:remaining(),maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe'],
        env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}}).trim();
    const stack=error?.stack, own=path.dirname(ROOT), work=observation.work;
    if(typeof stack!=='string'||stack.length>2*1024*1024||typeof work!=='string'
      ||!['current-source-native-inputs','current-source-native-initial-inputs'].includes(path.basename(work))
      ||path.dirname(work)!==own||path.basename(ROOT)!=='current-source-native'
      ||!path.basename(own).startsWith('rr-source19-union-native-'))return null;
    await noLinks(work);
    const owners=[
      {root:ROOT,head:observation.sourceHead,tree:observation.sourceTree},
      {root:path.join(work,'normal-old140000'),head:OLD_HEAD,tree:OLD_TREE},
      {root:path.join(work,'normal-initial-operative585'),head:OPERATIVE_INITIAL_HEAD,tree:OPERATIVE_INITIAL_TREE},
      {root:path.join(work,'normal586'),head:HEAD586,tree:TREE586},
      {root:path.join(work,observation.initial?'normal-initial-operative587':'normal-operative587'),head:OPERATIVE587_HEAD,tree:OPERATIVE587_TREE},
      {root:path.join(work,observation.initial?'normal-initial-operative588':'normal-operative588'),head:OPERATIVE588_HEAD,tree:OPERATIVE588_TREE},
    ];
    const verified=new Map(), files=new Map(), attemptedFiles=new Set();let fallback=null;
    for(const line of stack.split(/\r?\n/).slice(0,64)){
      if(performance.now()>=deadline)break;
      try{
      const named=/^\s+at ([^\r\n()]+) \((file:\/\/\/[^\r\n()]+):(\d+):(\d+)\)$/.exec(line);
      const bare=named?null:/^\s+at (file:\/\/\/[^\r\n()]+):(\d+):(\d+)$/.exec(line);
      if(!named&&!bare)continue;
      const [,name,urlText,lineText,columnText]=named??[bare[0],'',bare[1],bare[2],bare[3]];
      const url=new URL(urlText);if(url.host||url.hash)continue;
      const file=fileURLToPath(url),owner=owners.find(row=>inside(row.root,file));
      if(!owner||!/^[a-f0-9]{40}$/.test(owner.head??'')||!/^[a-f0-9]{40}$/.test(owner.tree??''))continue;
      const relative=path.relative(owner.root,file).split(path.sep).join('/');
      if(!/^(?:scripts|js\/core)\/[A-Za-z0-9_./-]+\.(?:mjs|js)$/.test(relative)||relative.split('/').includes('..'))continue;
      // This is the existing fixed second585 import, not arbitrary URL access.
      if(url.search&&!(owner.head===OPERATIVE_INITIAL_HEAD&&url.search==='?source-native-initial-forward'
        &&['scripts/update-weather.mjs','scripts/generate-public-conditions.mjs'].includes(relative)))continue;
      if(!verified.has(owner.root)){
        await noLinks(owner.root);
        verified.set(owner.root,diagnosticGit(owner.root,'rev-parse','HEAD')===owner.head
          &&diagnosticGit(owner.root,'rev-parse','HEAD^{tree}')===owner.tree);
      }
      if(!verified.get(owner.root))continue;
      if(!files.has(file)){
        if(attemptedFiles.has(file))continue;
        if(attemptedFiles.size>=8)break;
        attemptedFiles.add(file);
        await noLinks(file);
        const before=await fs.lstat(file,{bigint:true});
        if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>2n*1024n*1024n)continue;
        const body=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});
        const identity=value=>[value.dev,value.ino,value.size,value.mtimeNs,value.ctimeNs];
        if(!identity(before).every((value,index)=>value===identity(after)[index])
          ||BigInt(body.length)!==before.size||await fs.realpath(file)!==file)continue;
        const committed=execFileSync('git',['-C',owner.root,'cat-file','blob',owner.head+':'+relative],
          {timeout:remaining(),maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe'],
            env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'}});
        if(!body.equals(committed))continue;
        files.set(file,{body,owner,relative,identity:identity(before)});
      }
      const qualified=files.get(file),at=Number(lineText),column=Number(columnText);
      if(!Number.isSafeInteger(at)||at<1||at>qualified.body.toString('utf8').split(/\r?\n/).length
        ||!Number.isSafeInteger(column)||column<1||column>100000)continue;
      if(diagnosticGit(owner.root,'rev-parse','HEAD')!==owner.head||diagnosticGit(owner.root,'rev-parse','HEAD^{tree}')!==owner.tree)continue;
      const last=await fs.lstat(file,{bigint:true});
      if(!last.isFile()||last.isSymbolicLink()||last.nlink!==1n||!qualified.identity.every((value,index)=>
        value===[last.dev,last.ino,last.size,last.mtimeNs,last.ctimeNs][index]))continue;
      const frame={module:relative,sha256:sha(qualified.body),line:at,column};
      // Preserve a genuine guard as fallback, but prefer its real caller when
      // both source frames authenticate. Never invent an eval/AsyncFunction frame.
      const fixed585DmiInvalid=name==='invalid'&&frame.module==='scripts/lib/dmi-forecast-file.mjs'
        &&frame.sha256==='ac1cbf3909daad48e126a23c1c724e942344750c8856308c2e2a74d842a053a6'
        &&frame.line===23;
      if(/^(?:async )?(?:Object\.)?(?:fail|need)$/.test(name)||fixed585DmiInvalid){fallback??=frame;continue;}
      return frame;
      }catch{} // One absent/changed/unqualified source cannot qualify or hide a later genuine caller.
    }
    return fallback;
  }catch{return null;} // Observation failure never replaces the actual throw.
}
async function reportSourceProducerFailure(error,observation){
  if(!observation.failureReported){
    try{
      const report=await nativePostgresExceptionDiagnostic(error,observation.phase);
      report.frame=await sourceProducerFailureFrame(error,observation)??report.frame;
      console.error(JSON.stringify(report));
      observation.failureReported=true;
    }catch{} // Raw error text/values/absolute paths never become diagnostics.
  }
}
async function observeNativeInputs(options, initial) {
  const observation={phase:'SOURCE_LEGACY_PRODUCER_SETUP',work:null,sourceHead:null,sourceTree:null,initial,failureReported:false};
  observeSourceLegacyPhase(observation.phase);
  try{return await produceNativeInputs(options,initial,observation);}
  catch(error){await reportSourceProducerFailure(error,observation);throw error;}
}
// SOURCE_PRODUCER_OBSERVATION_END

function cloneSource(head, tree, destination) {
  execFileSync('git', ['-c', 'core.autocrlf=false', 'clone', '--shared', '--no-hardlinks', '--no-checkout', ROOT, destination],
    {stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0'}});
  git(destination, '-c', 'advice.detachedHead=false', 'checkout', '--detach', head);
  assert.equal(git(destination, 'rev-parse', 'HEAD'), head);
  assert.equal(git(destination, 'rev-parse', 'HEAD^{tree}'), tree);
  assert.equal(git(destination, 'status', '--porcelain', '-uno'), '');
}
function frozenFragment(source, start, end) {
  assert.equal(source.split(start).length, 2); assert.equal(source.split(end).length, 2);
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert(last > first); const fragment = source.slice(first, last);
  assert.equal(source.slice(0, first) + fragment + source.slice(last), source, 'WHOLE unchanged frozen recipe inverse');
  return fragment;
}
// This is deliberately the OLD archival-only seed, NOT a full585 runtime.
// Reuse the preserved national test's actual OLD closures unchanged. Only
// their input registry/time axis is this host's real normal admin transport.
// No old numeric pair is admitted after the normal archive input view.
async function createArchivedOnlyOldSeed({work, inputRoot, adminInputs, registry, target, backend}) {
  const old = path.join(work, 'normal-old140000'); cloneSource(OLD_HEAD, OLD_TREE, old);
  await copyInputs(inputRoot, old, adminInputs, ADMIN);
  same(await (await load(old, 'scripts/build-public-coastal-parts-v2.mjs')).build(), registry,
    'ONE normal admin registry for old archive,585 updater and CURRENT');
  const workflow = await load(old, 'scripts/private-production-runtime-workflow.mjs');
  const bundle = await load(old, 'scripts/private-production-runtime-bundle.mjs');
  const normalS = await load(old, 'scripts/ravscore-continuation-checkpoint.mjs');
  const protectedS = await load(old, 'scripts/protected-ravscore-continuation-checkpoint.mjs');
  const protectedB = await load(old, 'scripts/protected-private-production-runtime.mjs');
  const oldI = (await load(old, 'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const oldC = (await load(old, 'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
  // Authenticate actual OLD data contracts through its existing frozen factory;
  // no retagged585 tuple, altered source or historical fixture repin.
  await (await load(ROOT, 'scripts/check-last-mile-enclosure-predecessor-source.mjs'))
    .withFrozenLastMileEnclosurePredecessorSource(async frozen => {
      same(oldI, (await load(frozen, 'js/core/ravscore-model-contract.js')).ravScoreModelBinding(), 'Actual genuine OLD I');
      same(oldC, (await load(frozen, 'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding(), 'Actual genuine OLD C');
      same(await workflow.privateRuntimeContractHashes({repositoryRoot: old}),
        await (await load(frozen, 'scripts/private-production-runtime-workflow.mjs'))
          .privateRuntimeContractHashes({repositoryRoot: frozen}), 'Actual whole OLD persisted ABI');
    });
  const recipeBytes = execFileSync('git', ['-C', ROOT, 'show', HEAD585 + ':' + OLD_RECIPE],
    {stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000, maxBuffer: 1024 * 1024,
      env: {...process.env, GIT_NO_LAZY_FETCH: '1', GIT_NO_REPLACE_OBJECTS: '1', GIT_TERMINAL_PROMPT: '0'}});
  assert.equal(recipeBytes.length, 64375); assert.equal(sha(recipeBytes), OLD_RECIPE_SHA);
  const recipe = recipeBytes.toString('utf8');
  const time = value => new Date(Date.parse(target) + (value - 9) * 3600000).toISOString();
  const zoneIds = Object.keys(registry.zones), parts = Object.entries(registry.zones)
    .flatMap(([zoneId, rows]) => rows.map(part => ({...part, zoneId, parentZoneId: zoneId})));
  assert.equal(zoneIds.length, 210); assert.equal(parts.length, 673);
  const conditionsBody = frozenFragment(recipe, '    function conditionsAt(hour,label){',
    "    phase='GENUINE_OLD_SEPARATE_S_AND_B';");
  const conditionsAt = Function('parts', 'integrated', 'context', 'candidate', 'point', 'oldI', 'oldC', 'zoneIds', 'time',
    conditionsBody + '\nreturn conditionsAt;')(parts,
    await load(old, 'js/core/ravscore-integrated-state-pipeline.js'), await load(old, 'scripts/lib/ravscore-sampling-context.mjs'),
    await load(old, 'js/core/ravscore-candidate-g-state-pipeline.js'), await load(old, 'scripts/lib/coastal-point-staging-contract.mjs'),
    oldI, oldC, zoneIds, time);
  const centralSource = path.join(work, 'old-central-source.json');
  const checkpointPath = path.join(work, 'old-central', CHECKPOINT);
  await writeNew(centralSource, Buffer.from(JSON.stringify(conditionsAt(7, 'central')) + '\n'));
  await normalS.saveRavScoreContinuationCheckpoint({sourcePath: centralSource, checkpointPath, repositoryRoot: old});
  const S = await protectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath, targetReference: time(7),
    request: backend.documentRequest, rpcRequest: backend.checkpointRpc}); assert.equal(S.published, true);
  const oldConditions = conditionsAt(8, 'bundle');
  // Exactly the old recipe's nine archival inputs, including explicit OLD-only
  // fixture labels. These are never claimed as newly generated585 fullRuntime.
  for (const descriptor of workflow.PRIVATE_RUNTIME_FILES) {
    const output = path.join(old, descriptor.relativePath); await fs.mkdir(path.dirname(output), {recursive: true});
    await fs.writeFile(output, JSON.stringify(descriptor.id === 'full-conditions' ? oldConditions : {fixtureOnly: descriptor.id}) + '\n');
  }
  const privateRoot = path.join(work, 'old-private'); await fs.mkdir(privateRoot);
  const bundlePath = path.join(privateRoot, 'bundle'), spec = await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot: old});
  await bundle.createPrivateProductionRuntimeBundle({repositoryRoot: old, privateRoot, bundlePath, ...spec});
  const expected = await workflow.buildPrivateRuntimeExpectation({repositoryRoot: old, targetReferenceAt: time(8), now: time(9)});
  const B = await protectedB.publishProtectedPrivateProductionRuntime({repositoryRoot: old, privateRoot, bundlePath, expected,
    now: time(9), sourceHead: OLD_HEAD, request: backend.documentRequest, storage: backend.storage}); assert.equal(B.published, true);
  const originals = path.join(work, 'old-archive-public'); await fs.mkdir(originals);
  const publicBody = frozenFragment(recipe, '    const publicDocs=new Map(', '    const originalFiles=');
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await AsyncFunction('archiveModule', 'oldI', 'originals', 'write', 'sha', 'time', 'path', publicBody)(
    await load(ROOT, 'scripts/lib/weather-state-epoch-archive.mjs'), oldI, originals,
    async (file, value) => writeNew(file, Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value) + '\n')), sha, time, path);
  assert(Date.parse(time(7)) < Date.parse(time(8)) && Date.parse(time(8)) < Date.parse(target));
  return {privateRoot, bundlePath, checkpointPath, publicRoot: originals};
}

// Only normal HTTP transport is replaced here. The actual normal B/S/archive
// validators/producers remain the callers. No request can fall through to net.
function installOfflineTransport(backend, policy, publicManifestBytes) {
  const original = globalThis.fetch, previous = Object.fromEntries([
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND',
  ].map(key => [key, process.env[key]]));
  const address = 'https://ravradar-origin-test.invalid', key = 'SYNTHETIC_TEST_ONLY_NO_SERVICE_PRIVILEGE';
  process.env.SUPABASE_URL = address; process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  process.env.RAVRADAR_PRIVATE_RUNTIME_STORAGE_BACKEND = 'supabase';
  const answer = (value, status = 200, type = 'application/json') => new Response(
    Buffer.isBuffer(value) ? value : JSON.stringify(value), {status, headers: {'content-type': type}});
  const owned = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const method = options.method ?? 'GET';
    if (url.href === 'https://ravradar.dk/data/live/manifest.json') {
      assert.equal(method, 'GET'); return answer(typeof publicManifestBytes==='function'?await publicManifestBytes():publicManifestBytes);
    }
    assert.equal(url.origin, address, 'No external acquisition or service request in native input production');
    const headers = new Headers(options.headers), authenticated = headers.get('apikey') === key
      && headers.get('authorization') === 'Bearer ' + key;
    if (url.pathname === '/rest/v1/admin_documents') {
      assert(authenticated); assert.equal(method, 'GET'); return answer(await backend.documentRequest(url.search));
    }
    if (url.pathname === '/storage/v1/bucket/' + encodeURIComponent(policy.bucketId)) {
      assert(authenticated); assert.equal(method, 'GET'); return answer({id: policy.bucketId, name: policy.bucketId,
        public: false, file_size_limit: policy.maximumArchiveBytes, allowed_mime_types: [policy.mimeType]});
    }
    const prefix = '/storage/v1/object/' + encodeURIComponent(policy.bucketId) + '/';
    const downloadPrefix = '/storage/v1/object/authenticated/' + encodeURIComponent(policy.bucketId) + '/';
    assert(url.pathname.startsWith(prefix) || url.pathname.startsWith(downloadPrefix), 'Unknown private fixture HTTP route');
    if (!authenticated) { assert.equal(method, 'GET'); assert(url.pathname.startsWith(downloadPrefix)); return answer({}, 403); }
    const selectedPrefix = url.pathname.startsWith(downloadPrefix) ? downloadPrefix : prefix;
    const objectPath = url.pathname.slice(selectedPrefix.length).split('/').map(decodeURIComponent).join('/');
    assert(objectPath && !objectPath.split('/').some(segment => ['.', '..', ''].includes(segment)));
    if (method === 'GET') { assert.equal(selectedPrefix, downloadPrefix);
      return answer(await backend.storage.download(objectPath), 200, policy.mimeType); }
    if (method === 'POST') {
      assert.equal(selectedPrefix, prefix);
      assert.equal(headers.get('x-upsert'), 'false'); assert(Buffer.isBuffer(options.body));
      const saved = await backend.storage.uploadImmutable(objectPath, options.body);
      return saved.created ? answer({Key: objectPath}) : answer({code: 'KeyAlreadyExists'}, 409);
    }
    assert.fail('Unknown private fixture storage method');
  };
  globalThis.fetch = owned;
  return () => {
    assert.equal(globalThis.fetch, owned); globalThis.fetch = original;
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  };
}

async function saveNormal(root, privateRoot, backend, sourceHead, sameReferenceSuccessorEvidence) {
  const workflow = await load(root, 'scripts/private-production-runtime-workflow.mjs');
  const bundle = await load(root, 'scripts/private-production-runtime-bundle.mjs');
  const protectedB = await load(root, 'scripts/protected-private-production-runtime.mjs');
  const normalS = await load(root, 'scripts/ravscore-continuation-checkpoint.mjs');
  const protectedS = await load(root, 'scripts/protected-ravscore-continuation-checkpoint.mjs');
  const conditions = await json(path.join(root, 'data/live/conditions.json')); refuseFixtureOnly(conditions);
  assert(conditions.privateEstablishedNativeCurrentOrigin, 'Normal updater must have finalized the actual opaque origin');
  const checkpointPath = path.join(privateRoot, CHECKPOINT);
  await normalS.saveRavScoreContinuationCheckpoint({repositoryRoot: root,
    sourcePath: path.join(root, 'data/live/conditions.json'), checkpointPath});
  const spec = await workflow.buildPrivateRuntimeCreateSpec({repositoryRoot: root});
  assert(spec.files.some(row => row.relativePath === '.cache/public-hour-delivery.pack'), 'Actual normal public-hour pack is required');
  for (const row of spec.files) if (row.relativePath.endsWith('.json')) {
    // Keep the SAME forecast-only normal bound as copyInputs, including every
    // genuine585/586/587/588/SOURCE save. Other fixture input caps stay 256 MiB.
    const maximum = row.relativePath === 'data/live/dmi-forecast-cache.json' ? DMI_FORECAST_FILE_MAX_BYTES : undefined;
    refuseFixtureOnly(JSON.parse(await read(path.join(root, row.relativePath), maximum)));
  }
  const bundlePath = path.join(privateRoot, 'created'), now = conditions.generatedAt;
  const expected = await workflow.buildPrivateRuntimeExpectation({repositoryRoot: root,
    targetReferenceAt: conditions.productionReferenceAt, now});
  await bundle.createPrivateProductionRuntimeBundle({repositoryRoot: root, privateRoot, bundlePath, ...spec});
  const B = await protectedB.publishProtectedPrivateProductionRuntime({repositoryRoot: root, privateRoot,
    bundlePath, expected, now, sourceHead, request: backend.documentRequest, storage: backend.storage,
    ...(sameReferenceSuccessorEvidence ? {sameReferenceSuccessorEvidence} : {})});
  assert.equal(B.published, true);
  const S = await protectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath,
    targetReference: conditions.productionReferenceAt, request: backend.documentRequest, rpcRequest: backend.checkpointRpc});
  assert.equal(S.published, true);
  const restored = path.join(privateRoot, 'restored');
  const result = await protectedB.restoreProtectedPrivateProductionRuntime({repositoryRoot: root, privateRoot,
    bundlePath: restored, expected, now, request: backend.documentRequest, storage: backend.storage});
  assert.equal(result.restored, true); assert.equal(result.rollbackSelected, false);
  for (const row of spec.files) {
    const maximum = row.relativePath === 'data/live/dmi-forecast-cache.json' ? DMI_FORECAST_FILE_MAX_BYTES
      : row.relativePath === '.cache/weather-component-inputs.pack'
        ? protectedB.PROTECTED_PRIVATE_RUNTIME_POLICY.maximumFilePayloadBytes : undefined;
    same(await read(path.join(bundlePath, 'payload', row.relativePath), maximum),
      await read(path.join(restored, 'payload', row.relativePath), maximum), 'WHOLE actual B restore: ' + row.relativePath);
  }
  const protectedPath = path.join(privateRoot, 'protected-S', CHECKPOINT);
  const readback = await protectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath: protectedPath,
    targetReference: conditions.productionReferenceAt, request: backend.documentRequest});
  assert.equal(readback.restored, true); same(await json(protectedPath), await json(checkpointPath), 'Normal S whole read-back');
  return {privateRoot, bundlePath: restored, checkpointPath, manifest: await json(path.join(restored, 'manifest.json')),
    referenceAt: conditions.productionReferenceAt, sourceHead,
    retentionCleanup:{complete:B.retentionCleanupComplete,failureCount:B.retentionCleanupFailureCount}};
}


// The ordinary workflow stages --describe-current at this SAME fixed runner
// path. Reuse its real normal descriptor, never an authored tuple/attestation.
export async function stageNormalCurrentSourceDescriptor(root,saved,backend) {
  const runner=process.env.RUNNER_TEMP;
  assert.equal(await fs.realpath(runner),path.join(ROOT,'runner-temp'));
  await noLinks(runner);
  const readRow=async key=>{
    const rows=await backend.documentRequest('?document_key=eq.'+encodeURIComponent(key)
      +'&select=document_key,payload,version&limit=2');
    assert.equal(rows.length,1);exact(rows[0],['document_key','payload','version']);
    assert.equal(rows[0].document_key,key);
    assert(Number.isSafeInteger(rows[0].version)&&rows[0].version>0);return rows;
  };
  const BKey='ravscore-private-production-runtime-pointer',SKey='ravscore-continuation-checkpoint';
  const beforeB=await readRow(BKey),beforeS=await readRow(SKey);
  const manifest=JSON.parse(await read(path.join(saved.bundlePath,'manifest.json'),4*1024*1024));
  same(manifest,saved.manifest,'WHOLE retained normal B manifest before descriptor staging');
  same(beforeS[0].payload,JSON.parse(await read(saved.checkpointPath,16*1024*1024)),
    'WHOLE normally saved S and central version before descriptor staging');
  assert.equal(beforeS[0].payload.datasetId,manifest.datasetId);
  assert.equal(beforeS[0].payload.productionReferenceAt,manifest.productionReferenceAt);
  same(beforeS[0].payload.modelBinding,manifest.modelBinding,'One actual B/S model family');
  const protectedB=await load(root,'scripts/protected-private-production-runtime.mjs');
  const descriptor=await protectedB.describeCurrentProtectedPrivateProductionRuntime({request:backend.documentRequest});
  assert.equal(descriptor.sourceHead,saved.sourceHead);
  for(const key of ['datasetId','productionReferenceAt','generatedAt','bundleContentSha256','modelBinding','contractHashes'])
    same(descriptor[key],manifest[key],'Actual normal describe-current matches whole saved B: '+key);
  const file=path.join(runner,'private-runtime-current-source.json');
  const previous=await fs.lstat(file).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  if(previous)await read(file,2*1024*1024); // Existing owned regular/no-link metadata only.
  const writer=await load(root,'scripts/lib/bounded-json-writer.mjs');
  await writer.writeBoundedJsonAtomic(file,descriptor,{maximumBytes:2*1024*1024});
  same(JSON.parse(await read(file,2*1024*1024)),descriptor,'WHOLE actual normal descriptor readback');
  same(await protectedB.describeCurrentProtectedPrivateProductionRuntime({request:backend.documentRequest}),descriptor,
    'Fresh normal B descriptor after staging');
  same(await readRow(BKey),beforeB,'Whole central B payload/version unchanged by staging');
  same(await readRow(SKey),beforeS,'Whole central S payload/version unchanged by staging');
}

// The existing 585 factory stays a real, immutable producer. Advance it through
// the issued native586 SAME_H0 transition, then through the issued c03 ordinary
// STRICTLY_LATER_H0 587 caller. No tuple, checkpoint, origin or ACTIVE row is
// authored here. B is always published/read back before S; original stores stay.
async function advanceGenuine585Through587({work,host585,saved585,inputRoot,adminInputs,
  successorProviderInputs,targetReferenceAt,backend,registry,initial,publicReader,observation}) {
  observation.phase='SOURCE_LEGACY_PRODUCER_NATIVE586';
  observeSourceLegacyPhase(observation.phase);
  const native=path.join(work,'normal586');cloneSource(HEAD586,TREE586,native);
  await copyInputs(inputRoot,native,adminInputs,ADMIN);
  same(await(await load(native,'scripts/build-public-coastal-parts-v2.mjs')).build(),registry,
    'Same normal admin registry through genuine586');
  process.chdir(native);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=native;process.env.GITHUB_SHA=HEAD586;
  process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT=saved585.privateRoot;
  process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE=saved585.bundlePath;
  const transition=await load(native,'scripts/native-original-continuity-runtime-transition.mjs');
  const prepared=await transition.restoreAndPrepareNativeOriginalContinuityRuntimeTransition({
    request:backend.documentRequest,checkpointRequest:backend.documentRequest,storage:backend.storage,
    targetReferenceAt:saved585.referenceAt,workdir:path.join(work,'native586-metadata')});
  await transition.assertNativeOriginalContinuityRuntimeTransitionPrepared(prepared);
  await(await load(native,'scripts/private-production-runtime-workflow.mjs')).installRestoredPrivateRuntime({
    restoredRoot:prepared.outputRoot,repositoryRoot:native});
  await load(native,'scripts/generate-public-conditions.mjs');publicReader.root=native;
  const private586=path.join(work,'saved586');await fs.mkdir(private586,{recursive:false,mode:0o700});
  const saved586=await saveNormal(native,private586,backend,HEAD586,{
    predecessorManifest:saved585.manifest,migrationReport:await json(prepared.normalBReportPath)});
  assert.equal(saved586.referenceAt,saved585.referenceAt);
  assert.equal(saved586.manifest.modelBinding.modelBundleSha256,'6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805');
  assert.equal(saved586.manifest.contractHashes.continuationStateContractSha256,'d2d93920aacc4be877da22c7b9e31e21426e647227a2c5018ee14b3a267500c7');
  observation.phase='SOURCE_LEGACY_PRODUCER_FOLLOWER587';
  observeSourceLegacyPhase(observation.phase);
  const host587=path.join(work,initial?'normal-initial-operative587':'normal-operative587');
  cloneSource(OPERATIVE587_HEAD,OPERATIVE587_TREE,host587);
  await copyInputs(inputRoot,host587,adminInputs,ADMIN);
  same(await(await load(host587,'scripts/build-public-coastal-parts-v2.mjs')).build(),registry,
    'Same normal admin registry through genuine587');
  for(const [relative,expected]of [['js/core/ravscore-model-contract.js',ISSUED587.I],
    ['scripts/rollback-assets/ravscore-model-contract.js',ISSUED587.C]])
    assert.equal((await load(host587,relative)).ravScoreModelBinding().modelBundleSha256,expected);
  assert.equal((await(await load(host587,'scripts/private-production-runtime-workflow.mjs'))
    .privateRuntimeContractHashes({repositoryRoot:host587})).continuationStateContractSha256,ISSUED587.T);
  assert.equal(Date.parse(targetReferenceAt)-Date.parse(saved586.referenceAt),3600000,
    'The issued587 arm is STRICTLY later H0, never a same-H0 retag');
  const originalPrivate=path.join(work,'assistant586-original-private');await fs.mkdir(originalPrivate,{recursive:false,mode:0o700});
  process.chdir(host587);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=host587;process.env.GITHUB_SHA=OPERATIVE587_HEAD;
  process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=originalPrivate;
  process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=path.join(originalPrivate,'bundle');
  process.env.RAVRADAR_PRODUCTION_TARGET_HOUR=targetReferenceAt;
  // A fixed synthetic ordinary request to the actual normal no-argument
  // controller; it grants no GitHub qualification/installed-production proof.
  process.env.GITHUB_WORKFLOW='Update weather and deploy RavRadar';
  process.env.GITHUB_REF='refs/heads/main';process.env.GITHUB_EVENT_NAME='workflow_dispatch';
  process.env.GITHUB_RUN_ATTEMPT='1';process.env.OPERATIONAL_ACTION='integrated';
  const assistant=await load(host587,'scripts/assistant-later-h0-runtime-transition.mjs');
  await assistant.prepareAssistantLaterH0Runtime();await assistant.installAssistantLaterH0Runtime();
  await stageNormalCurrentSourceDescriptor(host587,saved586,backend);
  await writeNew(path.join(host587,'.cache/deployed-dmi-bulk-cache.json'),
    await read(path.join(host587,'data/live/dmi-bulk-cache.json')));
  // New provider INPUTS only, after the authenticated working view is installed.
  await copyInputs(path.join(path.dirname(ROOT),'fixture-587'),host587,successorProviderInputs,PROVIDERS);
  await load(host587,'scripts/update-weather.mjs');
  await load(host587,'scripts/generate-public-conditions.mjs');publicReader.root=host587;
  same(await json(path.join(host587,REGISTRY)),registry,'Actual587 normal registry unchanged');
  const private587=path.join(work,'saved587');await fs.mkdir(private587,{recursive:false,mode:0o700});
  const saved587=await saveNormal(host587,private587,backend,OPERATIVE587_HEAD);
  assert.equal(saved587.referenceAt,targetReferenceAt);
  assert.equal(saved587.manifest.modelBinding.modelBundleSha256,ISSUED587.I);
  assert.equal(saved587.manifest.contractHashes.continuationStateContractSha256,ISSUED587.T);
  return {host587,saved586,saved587};
}

// One further genuine ordinary generation on the separately selected actual588
// CODE source. Its B/S is produced below, never inferred from this source pin.
// The historical585/586/587 hosts and every original remain separately owned.
async function advanceGenuine587Through588({work,saved587,inputRoot,adminInputs,
  successorProviderInputs,targetReferenceAt,backend,registry,initial,publicReader,observation}) {
  observation.phase='SOURCE_LEGACY_PRODUCER_FOLLOWER588';
  observeSourceLegacyPhase(observation.phase);
  assertFrozen588CodeSourceSelected();
  assert.equal(Date.parse(targetReferenceAt)-Date.parse(saved587.referenceAt),3600000,
    'Actual ACTIVE588 caller is STRICTLY later than genuine587');
  const host588=path.join(work,initial?'normal-initial-operative588':'normal-operative588');
  cloneSource(OPERATIVE588_HEAD,OPERATIVE588_TREE,host588);
  git(ROOT,'merge-base','--is-ancestor',OPERATIVE588_HEAD,git(ROOT,'rev-parse','HEAD'));
  await copyInputs(inputRoot,host588,adminInputs,ADMIN);
  same(await(await load(host588,'scripts/build-public-coastal-parts-v2.mjs')).build(),registry,
    'Same normal admin registry through genuine588');
  for(const [relative,expected]of [['js/core/ravscore-model-contract.js',SOURCE_PRODUCER_BEFORE.I],
    ['scripts/rollback-assets/ravscore-model-contract.js',SOURCE_PRODUCER_BEFORE.C]])
    assert.equal((await load(host588,relative)).ravScoreModelBinding().modelBundleSha256,expected);
  assert.equal((await(await load(host588,'scripts/private-production-runtime-workflow.mjs'))
    .privateRuntimeContractHashes({repositoryRoot:host588})).continuationStateContractSha256,SOURCE_PRODUCER_BEFORE.T);
  const originalPrivate=path.join(work,'assistant587-original-private');await fs.mkdir(originalPrivate,{recursive:false,mode:0o700});
  process.chdir(host588);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=host588;process.env.GITHUB_SHA=OPERATIVE588_HEAD;
  process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=originalPrivate;
  process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=path.join(originalPrivate,'bundle');
  process.env.RAVRADAR_PRODUCTION_TARGET_HOUR=targetReferenceAt;
  // The same normal no-argument ACTIVE588 controller and its dedicated caller
  // guard (including the4845 P0 fix), not the historical586->587 caller.
  process.env.GITHUB_WORKFLOW='Update weather and deploy RavRadar';
  process.env.GITHUB_REF='refs/heads/main';process.env.GITHUB_EVENT_NAME='workflow_dispatch';
  process.env.GITHUB_RUN_ATTEMPT='1';process.env.OPERATIONAL_ACTION='integrated';
  const assistant=await load(host588,'scripts/assistant-later-h0-runtime-transition.mjs');
  await assistant.prepareAssistantLaterH0Runtime();await assistant.installAssistantLaterH0Runtime();
  await stageNormalCurrentSourceDescriptor(host588,saved587,backend);
  await writeNew(path.join(host588,'.cache/deployed-dmi-bulk-cache.json'),
    await read(path.join(host588,'data/live/dmi-bulk-cache.json')));
  await copyInputs(path.join(path.dirname(ROOT),'fixture'),host588,successorProviderInputs,PROVIDERS);
  await load(host588,'scripts/update-weather.mjs');
  await load(host588,'scripts/generate-public-conditions.mjs');publicReader.root=host588;
  same(await json(path.join(host588,REGISTRY)),registry,'Actual588 normal registry unchanged');
  const private588=path.join(work,'saved588');await fs.mkdir(private588,{recursive:false,mode:0o700});
  const saved588=await saveNormal(host588,private588,backend,OPERATIVE588_HEAD);
  assert.equal(saved588.referenceAt,targetReferenceAt);
  assert.equal(saved588.manifest.modelBinding.modelBundleSha256,SOURCE_PRODUCER_BEFORE.I);
  assert.equal(saved588.manifest.contractHashes.continuationStateContractSha256,SOURCE_PRODUCER_BEFORE.T);
  return {host588,saved588};
}

/**
 * NEW native preparation, not the no-arg action and not its owner/session.
 * It CREATES the archival-only OLD140000 B/older S on the actual normal admin
 * registry, then its own full585 generation through the ACTUAL updater/public
 * producers. No external/full585 parent or handwritten NEW output is accepted.
 */
export async function produceCurrentSourceNativeInputs(options) {
  requireSourceProducerOutput(); requireSourceProducerBinding();
  assert.equal(arguments.length,1);return observeNativeInputs(options,false);
}
// Fixed synthetic OLD initialization before the CURRENT H0. This is not a
// production restart, arbitrary parent import or phase callback. Both actual
// normal585 generations and all original B/S outputs remain in their owned host.
export async function produceFrozen585NativeInitialInputs(options) {
  requireSourceProducerOutput(); requireSourceProducerBinding();
  assert.equal(arguments.length,1);return observeNativeInputs(options,true);
}
async function produceNativeInputs(options,initial,observation) {
  requireSourceProducerOutput(); const next = requireSourceProducerBinding(); // BEFORE getters, filesystem, Git, transport or updater.
  assert.equal(arguments.length, 3); assert.equal(typeof initial,'boolean');
  exact(options, ['profile','workRoot','inputRoot','adminInputs','providerInputs','targetReferenceAt',
    'forwardProviderInputs','successorProviderInputs','successorTargetReferenceAt',
    'predecessor587ProviderInputs','predecessor587TargetReferenceAt']);
  assert.equal(options.profile,initial?'current-source-native-initial':'current-source-native'); assert.equal(process.platform, 'linux');
  assert.equal(Number(process.versions.node.split('.')[0]), 24);
  for (const name of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH', 'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',
    'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_PATH', 'RAVRADAR_CURRENT_FAMILY_COLD_START_CONTEXT_SHA256',
    'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_PATH', 'RAVRADAR_WEATHER_STATE_EPOCH_CONTEXT_SHA256',
    'RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION', 'DMI_PART_CONTINUITY_DONOR_PATH',
    'RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC', 'RAVRADAR_SAVED_CURRENT_FORWARD_ORIGINAL_PLAN',
    'RAVSCORE_HISTORICAL_WAVE_TRANSITION_PATH']) assert(process.env[name] === undefined, 'No ambient exceptional mode: ' + name);
  const finalTarget=hour(options.targetReferenceAt),predecessor587Target=hour(options.predecessor587TargetReferenceAt),
    successorTarget=hour(options.successorTargetReferenceAt);
  assert.equal(Date.parse(predecessor587Target)-Date.parse(finalTarget),3600000,'Genuine587 follows real585/586 H1 by one hour');
  assert.equal(Date.parse(successorTarget)-Date.parse(predecessor587Target),3600000,'Genuine588 follows real587 by one hour');
  const target=new Date(Date.parse(finalTarget)-48*3600000).toISOString();
  const work=path.resolve(options.workRoot),inputRoot=path.resolve(options.inputRoot);
  assert(path.isAbsolute(options.workRoot) && path.isAbsolute(options.inputRoot));
  assert(!inside(ROOT, work) && work !== ROOT && !inside(inputRoot, work) && !inside(work, inputRoot));
  assert(path.isAbsolute(process.env.RUNNER_TEMP ?? ''), 'Existing native host must own RUNNER_TEMP');
  const runner = await fs.realpath(process.env.RUNNER_TEMP), own = path.dirname(ROOT);
  assert.equal(path.basename(ROOT), 'current-source-native', 'Explicit new case in the existing actual_case seam');
  assert(path.basename(own).startsWith('rr-source19-union-native-'), 'Existing normal native test owns this host');
  await noLinks(own); assert.equal(await fs.realpath(ROOT), ROOT);
  // Preserve the SDK proposal's exact working_root/runner-temp transport path.
  // The normal metadata migrator separately REQUIRES workdir outside code ROOT;
  // its inputs/work therefore live beside, not below, this action checkout.
  assert.equal(runner, path.join(ROOT, 'runner-temp'), 'Same physical action/tail/SDK RUNNER_TEMP');
  assert.equal(work,path.join(own,initial?'current-source-native-initial-inputs':'current-source-native-inputs'),
    'One fixed new sibling under existing native ownership');
  assert.equal(inputRoot,path.join(own,'fixture-initial-h0'),'Exact genuine585 H0 provider fixture directory');
  for(const name of ['fixture-initial-h1','fixture-587','fixture']){const forwardRoot=path.join(own,name);await noLinks(forwardRoot);
    assert.equal(await fs.realpath(forwardRoot),forwardRoot);}
  await noLinks(path.dirname(work)); await noLinks(inputRoot); await fs.mkdir(work, {recursive: false, mode: 0o700});
  const workStat = await fs.lstat(work, {bigint: true}), currentHead = git(ROOT, 'rev-parse', 'HEAD');
  assert.match(currentHead, /^[a-f0-9]{40}$/);
  observation.work=work;observation.sourceHead=currentHead;observation.sourceTree=git(ROOT,'rev-parse','HEAD^{tree}');
  await assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot:ROOT,
    proofPath:path.join(work,'normal-registry-source-check.json')});
  const beforeEnv = {...process.env}, beforeCwd = process.cwd(), beforeFetch = globalThis.fetch; let restoreTransport, first;
  const closedFetch = async () => { throw new Error('CURRENT_NATIVE_INPUT_EXTERNAL_REQUEST_REFUSED'); };
  globalThis.fetch = closedFetch;
  try {
    const backend = (await load(ROOT, 'scripts/lib/established-native-current-origin-test-transports.mjs')).normalBAndSTransports();
    const policy = (await load(ROOT, 'scripts/protected-private-production-runtime.mjs')).PROTECTED_PRIVATE_RUNTIME_POLICY;
    // The genuine frozen DATA factory proves the unchanged585 source contracts.
    // Its limited assertion-only module closure is NOT passed off as a full
    // updater host. The latter is a separate complete clone of the SAME commit.
    await (await load(ROOT, 'scripts/check-native-original-continuity-predecessor-source.mjs'))
      .withAuthenticated585PredecessorSource(async frozen => {
        const binding = (await load(frozen, 'scripts/lib/account-statistics-assistant-successor-source.mjs'))
          .requireAccountStatisticsAssistantBinding();
        const nativeBefore=(await load(ROOT,'scripts/lib/native-original-continuity-successor-source.mjs')).NATIVE_ORIGINAL_CONTINUITY_BEFORE;
        for (const key of ['C','I','T']) assert.equal(binding[key],nativeBefore[key],'Actual585 family, never retagged587');
      });
    const producerHead=OPERATIVE_INITIAL_HEAD,producerTree=OPERATIVE_INITIAL_TREE;
    const host585=path.join(work,'normal-initial-operative585');
    const before585=(await load(ROOT,'scripts/lib/native-original-continuity-successor-source.mjs')).NATIVE_ORIGINAL_CONTINUITY_BEFORE;
    cloneSource(producerHead,producerTree,host585);
    {
      git(ROOT,'merge-base','--is-ancestor',producerHead,currentHead);
      const I=(await load(host585,'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
      const C=(await load(host585,'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
      assert.equal(I.modelBundleSha256,before585.I);
      assert.equal(C.modelBundleSha256,before585.C);
      const contracts=await(await load(host585,'scripts/private-production-runtime-workflow.mjs'))
        .privateRuntimeContractHashes({repositoryRoot:host585});
      assert.equal(contracts.continuationStateContractSha256,before585.T);
    }
    await copyInputs(inputRoot, host585, options.adminInputs, ADMIN);
    const registry585 = await (await load(host585, 'scripts/build-public-coastal-parts-v2.mjs')).build();
    assert.equal(registry585.zoneCount, 210); assert.equal(registry585.partCount, 673);
    same(JSON.parse(await read(path.join(ROOT, REGISTRY))), registry585, 'Same actual normal admin registry in CURRENT and585');
    observation.phase='SOURCE_LEGACY_PRODUCER_ARCHIVE';
    observeSourceLegacyPhase(observation.phase);
    const archiveSeed = await createArchivedOnlyOldSeed({work, inputRoot, adminInputs: options.adminInputs,
      registry: registry585, target, backend});
    const publicReader={root:archiveSeed.publicRoot};
    restoreTransport = installOfflineTransport(backend,policy,()=>read(path.join(publicReader.root,'manifest.json'),1024*1024));
    const oldRoot = path.join(work, 'archive-original-private'); await fs.mkdir(oldRoot);
    process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT = oldRoot; process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE = path.join(oldRoot, 'bundle');
    process.env.GITHUB_SHA = producerHead; process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT = host585;
    const archive = await (await load(host585, 'scripts/archived-weather-restart.mjs')).prepareArchivedWeatherRestart({
      workRoot: path.join(work, 'restart'), publicRoot: archiveSeed.publicRoot, targetReferenceAt: target});
    // The normal archive installer may restore provider inputs. Only AFTER it
    // has preserved originals do we stage this generation's actual new inputs.
    const providers = await copyInputs(inputRoot, host585, options.providerInputs, PROVIDERS);
    for (const name of ['data/live/dmi-bulk-cache.json', 'data/live/dmi-forecast-cache.json',
      '.cache/copernicus-current-shadow.json', '.cache/open-meteo-current-fallback.json',
      'data/live/current-pilot-history.json', 'data/live/dmi-water-stations.json'])
      assert(providers.has(name), 'Real normal provider input must replace OLD archival placeholder: ' + name);
    process.env.RAVRADAR_WEATHER_CACHE_ONLY = 'true'; process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE = 'true';
    process.env.RAVRADAR_PRODUCTION_TARGET_HOUR = target;
    process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH = archive.contextPath;
    process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256 = archive.contextSha256;
    // Any ambient exceptional mode must be absent, never silently reset to
    // make this case pass. These are the actual normal updater's own gates.
    for (const name of ['CHECKPOINT_ONLY', 'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP',
      'RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED', 'RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED'])
      assert([undefined, 'false'].includes(process.env[name]), 'No ambient exceptional mode: ' + name);
    assert(process.env.RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE === undefined);
    process.chdir(host585);
    observation.phase='SOURCE_LEGACY_PRODUCER_UPDATER585';
    observeSourceLegacyPhase(observation.phase);
    await load(host585, 'scripts/update-weather.mjs');
    observation.phase='SOURCE_LEGACY_PRODUCER_PUBLIC585';
    observeSourceLegacyPhase(observation.phase);
    await load(host585, 'scripts/generate-public-conditions.mjs');
    same(await json(path.join(host585, REGISTRY)), registry585, 'Registry unchanged through normal updater/public');
    observation.phase='SOURCE_LEGACY_PRODUCER_SAVE585';
    observeSourceLegacyPhase(observation.phase);
    const private585 = path.join(work, 'saved585'); await fs.mkdir(private585);
    let saved585 = await saveNormal(host585, private585, backend, producerHead);
    const first585=saved585;
    assert.equal(saved585.manifest.modelBinding.modelBundleSha256, before585.I);
    assert.equal(saved585.manifest.contractHashes.continuationStateContractSha256, before585.T);
    {
      observation.phase='SOURCE_LEGACY_PRODUCER_RESTORE585';
      observeSourceLegacyPhase(observation.phase);
      // Same normal restore/install/readback callers as the ordinary follower;
      // no state field, previous hour, score or READY bit is authored here.
      const workflow585=await load(host585,'scripts/private-production-runtime-workflow.mjs');
      // The protected B result contains manifest.json+payload. Authenticate
      // that original B, then pass only its normal flat payload inventory to
      // the installer, as the ordinary archive consumer already does.
      const bundle585=await load(host585,'scripts/private-production-runtime-bundle.mjs');
      const parentManifest=saved585.manifest;
      const verifiedParent=await bundle585.verifyPrivateProductionRuntimeBundle({
        privateRoot:saved585.privateRoot,bundlePath:saved585.bundlePath,repositoryRoot:host585,
        expected:{modelBinding:parentManifest.modelBinding,contractHashes:parentManifest.contractHashes,
          datasetId:parentManifest.datasetId,productionReferenceAt:parentManifest.productionReferenceAt,
          bundleContentSha256:parentManifest.bundleContentSha256}});
      assert.equal(verifiedParent.verified,true);
      same(verifiedParent.manifest,parentManifest,'Whole actual saved585 B manifest');
      await workflow585.installRestoredPrivateRuntime({restoredRoot:path.join(verifiedParent.bundlePath,'payload'),repositoryRoot:host585});
      const protectedS585=await load(host585,'scripts/protected-ravscore-continuation-checkpoint.mjs');
      const restoredS=await protectedS585.restoreProtectedRavScoreContinuationCheckpoint({
        checkpointPath:path.join(host585,CHECKPOINT),targetReference:finalTarget,request:backend.documentRequest});
      assert.equal(restoredS.restored,true);
      // The real workflow preserves exactly these existing bytes before new
      // provider inputs. No reconstructed numeric donor is invented.
      const oldBulk=await read(path.join(host585,'data/live/dmi-bulk-cache.json'));
      await writeNew(path.join(host585,'.cache/deployed-dmi-bulk-cache.json'),oldBulk);
      publicReader.root=host585;
      assert.equal(process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH,archive.contextPath);
      assert.equal(process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256,archive.contextSha256);
      delete process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH;
      delete process.env.RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256;
      // The normal origin reader must reopen the SAME whole verified585 B as
      // the restored local runtime and central S, never the earlier OLD archive.
      process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=saved585.privateRoot;
      process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=saved585.bundlePath;
      observation.phase='SOURCE_LEGACY_PRODUCER_FOLLOWER585';
      observeSourceLegacyPhase(observation.phase);
      await copyInputs(path.join(own,'fixture-initial-h1'),host585,options.forwardProviderInputs,PROVIDERS);
      process.env.RAVRADAR_PRODUCTION_TARGET_HOUR=finalTarget;
      // Native test-only fixed second invocation. Ordinary module source and
      // all model/state contracts stay identical; query avoids ESM run caching.
      await import(pathToFileURL(path.join(host585,'scripts/update-weather.mjs')).href+'?source-native-initial-forward');
      observation.phase='SOURCE_LEGACY_PRODUCER_PUBLIC585';
      observeSourceLegacyPhase(observation.phase);
      await import(pathToFileURL(path.join(host585,'scripts/generate-public-conditions.mjs')).href+'?source-native-initial-forward');
      same(await json(path.join(host585,REGISTRY)),registry585,'Same normal registry through both585 generations');
      observation.phase='SOURCE_LEGACY_PRODUCER_SAVE585';
      observeSourceLegacyPhase(observation.phase);
      const forwardPrivate=path.join(work,'saved585-forward');await fs.mkdir(forwardPrivate);
      saved585=await saveNormal(host585,forwardPrivate,backend,producerHead);
      assert.equal(saved585.referenceAt,finalTarget);
      assert.equal(saved585.manifest.modelBinding.modelBundleSha256,before585.I);
    }
    const {host587,saved586,saved587}=await advanceGenuine585Through587({work,host585,saved585,inputRoot,
      adminInputs:options.adminInputs,successorProviderInputs:options.predecessor587ProviderInputs,
      targetReferenceAt:predecessor587Target,backend,registry:registry585,initial,publicReader,observation});
    const {host588,saved588}=await advanceGenuine587Through588({work,saved587,inputRoot,
      adminInputs:options.adminInputs,successorProviderInputs:options.successorProviderInputs,
      targetReferenceAt:successorTarget,backend,registry:registry585,initial,publicReader,observation});
    observation.phase='SOURCE_LEGACY_PRODUCER_FINISH';
    observeSourceLegacyPhase(observation.phase);
    if(initial)return Object.freeze({profile:'current-source-native-initial',workRoot:work,sourceRoot:host588,
      first585,saved585,saved586,saved587,saved588,referenceAt:successorTarget,initialReferenceAt:target,
      frozen585ForwardReferenceAt:finalTarget,
      archiveContextPath:archive.contextPath,archiveContextSha256:archive.contextSha256,
      registry:structuredClone(registry585),documents:backend.documents,objects:backend.objects,
      events:[...backend.events],normalNationalRollbackQualified:false,initialCentralActivation:'UNRUN',
      actionInvoked:false,sdkInvoked:false,sourceOwnerIssued:false,wholeSourceIntegrationProved:false,productionProof:false});
    observation.phase='SOURCE_LEGACY_PRODUCER_SOURCE_METADATA';
    observeSourceLegacyPhase(observation.phase);
    // Same normal admin INPUTS as every genuine585/586/587/588 host. This is
    // AFTER source-clean and the initial-only return, never a tracked-code waiver.
    await copyInputs(inputRoot, ROOT, options.adminInputs, ADMIN);
    const currentZones = await json(path.join(ROOT, 'data/zones.geojson'));
    same(currentZones.features.map(feature=>feature.properties.id).sort(),Object.keys(registry585.zones).sort(),
      'Exact normally hydrated CURRENT parent identities before SOURCE metadata');
    const currentRegistry = await (await load(ROOT, 'scripts/build-public-coastal-parts-v2.mjs')).build();
    same(currentRegistry, registry585, 'Same full normal registry after CURRENT admin input materialization');
    process.chdir(ROOT); process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT = ROOT; process.env.GITHUB_SHA = currentHead;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT = saved588.privateRoot;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE = saved588.bundlePath;
    const transition = await load(ROOT, 'scripts/source-producer-runtime-transition.mjs');
    const prepared = await transition.restoreAndPrepareSourceProducerRuntimeTransition({
      request: backend.documentRequest, checkpointRequest: backend.documentRequest, storage: backend.storage,
      targetReferenceAt: successorTarget, workdir: path.join(work, 'source-metadata')});
    await transition.assertSourceProducerRuntimeTransitionPrepared(prepared);
    const workflow = await load(ROOT, 'scripts/private-production-runtime-workflow.mjs');
    await workflow.installRestoredPrivateRuntime({restoredRoot: prepared.outputRoot, repositoryRoot: ROOT});
    const privateCurrent = path.join(work, 'saved-current'); await fs.mkdir(privateCurrent);
    const current = await saveNormal(ROOT, privateCurrent, backend, currentHead, {
      predecessorManifest: saved588.manifest, migrationReport: await json(prepared.normalBReportPath),
    });
    observation.phase='SOURCE_LEGACY_PRODUCER_FINISH';
    observeSourceLegacyPhase(observation.phase);
    assert.equal(current.manifest.modelBinding.modelBundleSha256, next.I);
    assert.equal(current.manifest.contractHashes.continuationStateContractSha256, next.T);
    same(await json(path.join(ROOT, REGISTRY)), registry585, 'Same registry retained through actual CURRENT B/S');
    same([workStat.dev, workStat.ino], await fs.lstat(work, {bigint: true}).then(s => [s.dev, s.ino]), 'Owned host directory unchanged');
    // This is normal producer input data for the SAME native host, not an owner
    // token, phase completion or positive whole-SOURCE/SDK/PG/production result.
    return Object.freeze({profile: 'current-source-native', workRoot: work, current, first585, saved585, saved586, saved587, saved588,
      archiveContextPath: archive.contextPath, archiveContextSha256: archive.contextSha256,
      registry: structuredClone(registry585), documents: backend.documents, objects: backend.objects,
      events: [...backend.events], actionInvoked: false, sdkInvoked: false, sourceOwnerIssued: false,
      wholeSourceIntegrationProved: false, productionProof: false});
  } catch (error) { first = error; await reportSourceProducerFailure(error,observation); throw error; }
  finally {
    let cleanupFailure;
    const clean = operation => { try { operation(); } catch (error) { cleanupFailure ??= error; } };
    clean(() => process.chdir(beforeCwd)); clean(() => restoreTransport?.());
    clean(() => { assert.equal(globalThis.fetch, closedFetch, 'Restore only this native preparation fetch owner'); globalThis.fetch = beforeFetch; });
    clean(() => {
      for (const name of Object.keys(process.env)) if (!Object.hasOwn(beforeEnv, name)) delete process.env[name];
      for (const [name, value] of Object.entries(beforeEnv)) process.env[name] = value;
    });
    // Keep the actual owned archive, originals and first failure for the native
    // caller's existing archival/cleanup lifecycle; never delete inputs here.
    if (cleanupFailure && first) Object.defineProperty(first, 'nativeInputCleanupFailure', {value: cleanupFailure});
    else if (cleanupFailure) throw cleanupFailure;
  }
}

// Explicit new native fixture preparer, not a SOURCE controller. The existing
// Python actual_case can invoke this one CLI after creating its owned checkout
// and provider fixture. Its old cases/operand056 need no changed input format.
export async function prepareCurrentSourceNativeProfile() {
  requireSourceProducerOutput(); requireSourceProducerBinding(); // BEFORE argv or any input I/O.
  assert.equal(arguments.length, 0); assert.equal(process.platform, 'linux');
  assert.equal(Number(process.versions.node.split('.')[0]), 24);
  const own = path.dirname(ROOT); assert.equal(path.basename(ROOT), 'current-source-native');
  assert(path.basename(own).startsWith('rr-source19-union-native-')); await noLinks(own);
  const h0=await json(path.join(own,'fixture-initial-h0/current-source-native-options.json'));
  const h1=await json(path.join(own,'fixture-initial-h1/current-source-native-options.json'));
  const next=await json(path.join(own,'fixture/current-source-native-options.json'));
  const prior587=await json(path.join(own,'fixture-587/current-source-native-options.json'));
  same(h0.adminInputs,h1.adminInputs,'Same genuine585 H0/H1 registry');same(h0.adminInputs,next.adminInputs,'Same actual588 registry');
  same(h0.adminInputs,prior587.adminInputs,'Same retained587 registry');
  assert.equal(h0.targetReferenceAt,h1.targetReferenceAt);
  assert.equal(Date.parse(prior587.targetReferenceAt)-Date.parse(h1.targetReferenceAt),3600000);
  assert.equal(Date.parse(next.targetReferenceAt)-Date.parse(prior587.targetReferenceAt),3600000);
  const options={...h0,profile:'current-source-native',workRoot:path.join(own,'current-source-native-inputs'),
    forwardProviderInputs:h1.providerInputs,successorProviderInputs:next.providerInputs,
    successorTargetReferenceAt:next.targetReferenceAt,
    predecessor587ProviderInputs:prior587.providerInputs,predecessor587TargetReferenceAt:prior587.targetReferenceAt};
  const produced = await produceCurrentSourceNativeInputs(options), outputRoot = path.join(produced.workRoot, 'transport');
  await fs.mkdir(outputRoot, {recursive: false, mode: 0o700});
  const objectRows = [];
  for (const [objectPath, raw] of produced.objects) {
    assert(Buffer.isBuffer(raw)); const relativePath = 'objects/' + sha(Buffer.from(objectPath)) + '.bin';
    await writeNew(path.join(outputRoot, relativePath), raw);
    objectRows.push({objectPath, relativePath, bytes: raw.length, sha256: sha(raw)});
  }
  // Values are the ACTUAL normal producer outputs, not caller-authored pointer,
  // state, origin, publicPack, SQL read-back, action result or success receipt.
  const inputs = {schemaVersion: 1, profile: produced.profile, sourceHead: produced.current.sourceHead,
    target: produced.current.referenceAt, registry: produced.registry,
    documents: Object.fromEntries(produced.documents), objectRows,
    current: {privateRoot: produced.current.privateRoot, bundlePath: produced.current.bundlePath,
      checkpointPath: produced.current.checkpointPath},
    actionInvoked: false, sdkInvoked: false, sourceOwnerIssued: false,
    wholeSourceIntegrationProved: false, productionProof: false};
  const raw = Buffer.from(JSON.stringify(inputs) + '\n'), file = path.join(outputRoot, 'current-normal-inputs.json');
  await writeNew(file, raw);
  return Object.freeze({file, bytes: raw.length, sha256: sha(raw), actionInvoked: false, productionProof: false});
}
// Appended to the existing normal-input producer, not a second producer or
// an origin/owner issuer. Both CLI paths remain behind the same own-family gate.
async function serializeNativeInputs(produced, initial) {
  const selected=initial?produced.saved588:produced.current;
  const outputRoot=path.join(produced.workRoot,'transport');
  await fs.mkdir(outputRoot,{recursive:false,mode:0o700});
  const objectRows=[];
  for(const [objectPath,raw] of produced.objects){
    assert(Buffer.isBuffer(raw));const relativePath='objects/'+sha(Buffer.from(objectPath))+'.bin';
    await writeNew(path.join(outputRoot,relativePath),raw);
    objectRows.push({objectPath,relativePath,bytes:raw.length,sha256:sha(raw)});
  }
  const saved=row=>({privateRoot:row.privateRoot,bundlePath:row.bundlePath,
    checkpointPath:row.checkpointPath,sourceHead:row.sourceHead,referenceAt:row.referenceAt});
  const inputs={schemaVersion:1,profile:produced.profile,sourceHead:selected.sourceHead,
    target:selected.referenceAt,registry:produced.registry,
    documents:Object.fromEntries(produced.documents),objectRows,
    ...(initial?{sourceRoot:produced.sourceRoot,first585:saved(produced.first585),
      saved585:saved(produced.saved585),saved586:saved(produced.saved586),saved587:saved(produced.saved587),saved588:saved(produced.saved588),
      initialReferenceAt:produced.initialReferenceAt,frozen585ForwardReferenceAt:produced.frozen585ForwardReferenceAt,
      archiveContextPath:produced.archiveContextPath,archiveContextSha256:produced.archiveContextSha256}
      :{current:{...saved(produced.current),retentionCleanup:produced.current.retentionCleanup}}),
    actionInvoked:false,sdkInvoked:false,sourceOwnerIssued:false,
    wholeSourceIntegrationProved:false,productionProof:false};
  const raw=Buffer.from(JSON.stringify(inputs)+'\n');
  const file=path.join(outputRoot,initial?'initial-normal-inputs.json':'current-normal-inputs.json');
  await writeNew(file,raw);
  return Object.freeze({file,bytes:raw.length,sha256:sha(raw),actionInvoked:false,productionProof:false});
}

export async function prepareCurrentSourceNativeInitialProfile(){
  requireSourceProducerOutput();requireSourceProducerBinding();
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const own=path.dirname(ROOT);assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(own).startsWith('rr-source19-union-native-'));await noLinks(own);
  const h0=JSON.parse(await read(path.join(own,'fixture-initial-h0/current-source-native-options.json'),1024*1024));
  const h1=JSON.parse(await read(path.join(own,'fixture-initial-h1/current-source-native-options.json'),1024*1024));
  same(h0.adminInputs,h1.adminInputs,'One exact normal admin input registry through H0/H1');
  assert.equal(h0.profile,'current-source-native-initial');assert.equal(h1.profile,h0.profile);
  assert.equal(h0.targetReferenceAt,h1.targetReferenceAt);
  assert.equal(path.resolve(h0.inputRoot),path.join(own,'fixture-initial-h0'));
  assert.equal(path.resolve(h1.inputRoot),path.join(own,'fixture-initial-h1'));
  assert.equal(h0.workRoot,h1.workRoot);
  const successor=await json(path.join(own,'fixture/current-source-native-options.json'));
  const prior587=await json(path.join(own,'fixture-587/current-source-native-options.json'));
  same(h0.adminInputs,prior587.adminInputs,'One exact admin registry for the real587 ordinary update');
  same(h0.adminInputs,successor.adminInputs,'One exact admin registry for the real588 ordinary update');
  assert.equal(Date.parse(prior587.targetReferenceAt)-Date.parse(h1.targetReferenceAt),3600000);
  assert.equal(Date.parse(successor.targetReferenceAt)-Date.parse(prior587.targetReferenceAt),3600000);
  const produced=await produceFrozen585NativeInitialInputs({...h0,forwardProviderInputs:h1.providerInputs,
    successorProviderInputs:successor.providerInputs,successorTargetReferenceAt:successor.targetReferenceAt,
    predecessor587ProviderInputs:prior587.providerInputs,predecessor587TargetReferenceAt:prior587.targetReferenceAt});
  assert.equal(Date.parse(produced.saved585.referenceAt)-Date.parse(produced.initialReferenceAt),48*3600000);
  assert.equal(Date.parse(produced.saved587.referenceAt)-Date.parse(produced.saved586.referenceAt),3600000);
  assert.equal(Date.parse(produced.referenceAt)-Date.parse(produced.saved587.referenceAt),3600000);
  assert.equal(produced.saved585.sourceHead,OPERATIVE_INITIAL_HEAD);
  assert.equal(produced.saved586.sourceHead,HEAD586);assert.equal(produced.saved587.sourceHead,OPERATIVE587_HEAD);
  assert.equal(produced.saved588.sourceHead,OPERATIVE588_HEAD);
  return serializeNativeInputs(produced,true);
}

// Normal metadata successor of the EXACT already initialized H1 B/S. Do NOT
// rebuild H1 from a fresh archive or rerun the updater: that loses the prefix.
export async function prepareCurrentSourceNativeFromInitialProfile(){
  requireSourceProducerOutput();const next=requireSourceProducerBinding();
  assert.equal(arguments.length,0);assert.equal(process.platform,'linux');
  assert.equal(Number(process.versions.node.split('.')[0]),24);
  const own=path.dirname(ROOT);assert.equal(path.basename(ROOT),'current-source-native');
  assert(path.basename(own).startsWith('rr-source19-union-native-'));await noLinks(own);await noLinks(ROOT);
  assert.equal(await fs.realpath(ROOT),ROOT);
  assert.equal(await fs.realpath(process.env.RUNNER_TEMP??''),path.join(ROOT,'runner-temp'));
  assert.match(process.env.HTTPS_PROXY??'',/^http:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/);
  assert.equal(process.env.NODE_USE_ENV_PROXY,'1');
  assert.equal(process.env.SUPABASE_URL,'https://fixture.invalid');
  assert.equal(process.env.SUPABASE_SERVICE_ROLE_KEY,'sb_secret_source19_synthetic');
  const initialRoot=path.join(own,'current-source-native-initial-inputs');await noLinks(initialRoot);
  const initialFile=path.join(initialRoot,'transport/initial-normal-inputs.json');
  const initialBytes=await read(initialFile,32*1024*1024),initial=JSON.parse(initialBytes);
  assert.equal(initial.profile,'current-source-native-initial');assert.equal(initial.sourceHead,OPERATIVE588_HEAD);
  const target=hour(initial.target);assert.equal(Date.parse(target)-Date.parse(initial.initialReferenceAt),50*3600000);
  assert.equal(Date.parse(initial.frozen585ForwardReferenceAt)-Date.parse(initial.initialReferenceAt),48*3600000);
  assert.equal(initial.sourceRoot,path.join(initialRoot,'normal-initial-operative588'));
  const savedRoot=path.join(initialRoot,'saved588');
  same(initial.saved588,{privateRoot:savedRoot,bundlePath:path.join(savedRoot,'restored'),
    checkpointPath:path.join(savedRoot,CHECKPOINT),sourceHead:OPERATIVE588_HEAD,referenceAt:target},
    'Only actual saved prefix H1 output, never a caller-selected parent');
  for(const file of [initial.sourceRoot,savedRoot,initial.saved588.bundlePath,initial.saved588.checkpointPath])await noLinks(file);
  assert.equal(git(initial.sourceRoot,'rev-parse','HEAD'),OPERATIVE588_HEAD);
  assert.equal(git(initial.sourceRoot,'rev-parse','HEAD^{tree}'),OPERATIVE588_TREE);
  const currentHead=git(ROOT,'rev-parse','HEAD');assert.match(currentHead,/^[a-f0-9]{40}$/);
  await assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot:ROOT,
    proofPath:path.join(own,'normal-current-registry-source-check.json')});
  git(ROOT,'merge-base','--is-ancestor',OPERATIVE588_HEAD,currentHead);
  const work=path.join(own,'current-source-native-inputs');
  await fs.mkdir(work,{recursive:false,mode:0o700});const identity=await fs.lstat(work,{bigint:true});
  const beforeEnv={...process.env},beforeCwd=process.cwd();let first;
  try{
    // Same audited normal admin INPUTS as the already prepared genuine588
    // prefix. Keep this AFTER source-clean, never inside the initial-only path.
    const adminInputRoot=path.join(own,'fixture-initial-h0');
    const adminOptions=JSON.parse(await read(path.join(adminInputRoot,'current-source-native-options.json'),1024*1024));
    assert.equal(adminOptions.profile,'current-source-native-initial');
    assert.equal(path.resolve(adminOptions.inputRoot),adminInputRoot);
    assert.equal(adminOptions.targetReferenceAt,initial.frozen585ForwardReferenceAt);
    await copyInputs(adminInputRoot,ROOT,adminOptions.adminInputs,ADMIN);
    const currentZones=await json(path.join(ROOT,'data/zones.geojson'));
    same(currentZones.features.map(feature=>feature.properties.id).sort(),Object.keys(initial.registry.zones).sort(),
      'Exact normally hydrated CURRENT-from-initial parent identities');
    same(await(await load(ROOT,'scripts/build-public-coastal-parts-v2.mjs')).build(),initial.registry,
      'Same full normal prefix registry after CURRENT-from-initial admin materialization');
    const B=await load(ROOT,'scripts/protected-private-production-runtime.mjs');
    const S=await load(ROOT,'scripts/protected-ravscore-continuation-checkpoint.mjs');
    const clients=B.createProtectedPrivateRuntimeClients({storageBackend:'supabase'});
    const checkpointRequest=S.createProtectedRavScoreCheckpointRequester();
    const backend={...clients,checkpointRpc:S.createProtectedRavScoreCheckpointRpcRequester()};
    for(const [name,row] of Object.entries(initial.documents)){
      assert(['ravscore-private-production-runtime-pointer','ravscore-continuation-checkpoint'].includes(name));
      const rows=await clients.documentRequest('?document_key=eq.'+encodeURIComponent(name)+'&select=document_key,payload,version&limit=2');
      same(rows,[row],'Genuine prefix B/S still selected after normal initial activation');
    }
    same(await json(path.join(ROOT,REGISTRY)),initial.registry,'Same normal CURRENT registry before metadata transition');
    const sourceManifest=await json(path.join(initial.saved588.bundlePath,'manifest.json'));
    assert.equal(sourceManifest.modelBinding.modelBundleSha256,SOURCE_PRODUCER_BEFORE.I);
    process.chdir(ROOT);process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT=ROOT;process.env.GITHUB_SHA=currentHead;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_ROOT=savedRoot;
    process.env.RAVRADAR_PREDECESSOR_PRIVATE_BUNDLE=initial.saved588.bundlePath;
    const transition=await load(ROOT,'scripts/source-producer-runtime-transition.mjs');
    const prepared=await transition.restoreAndPrepareSourceProducerRuntimeTransition({
      request:clients.documentRequest,checkpointRequest,storage:clients.storage,
      targetReferenceAt:target,workdir:path.join(work,'source-metadata')});
    await transition.assertSourceProducerRuntimeTransitionPrepared(prepared);
    const workflow=await load(ROOT,'scripts/private-production-runtime-workflow.mjs');
    await workflow.installRestoredPrivateRuntime({restoredRoot:prepared.outputRoot,repositoryRoot:ROOT});
    const privateCurrent=path.join(work,'saved-current');await fs.mkdir(privateCurrent,{recursive:false,mode:0o700});
    const current=await saveNormal(ROOT,privateCurrent,backend,currentHead,{
      predecessorManifest:sourceManifest,migrationReport:await json(prepared.normalBReportPath)});
    assert.equal(current.referenceAt,target);assert.equal(current.manifest.modelBinding.modelBundleSha256,next.I);
    assert.equal(current.manifest.contractHashes.continuationStateContractSha256,next.T);
    const documents=new Map();
    for(const name of ['ravscore-private-production-runtime-pointer','ravscore-continuation-checkpoint']){
      const rows=await clients.documentRequest('?document_key=eq.'+encodeURIComponent(name)+'&select=document_key,payload,version&limit=2');
      assert.equal(rows.length,1);assert.equal(rows[0].document_key,name);documents.set(name,rows[0]);
    }
    const pointer=B.validateProtectedPrivateRuntimePointer(documents.get('ravscore-private-production-runtime-pointer').payload);
    assert.equal(pointer.current.sourceHead,currentHead);assert.equal(pointer.current.productionReferenceAt,target);
    assert.equal(pointer.current.bundleContentSha256,current.manifest.bundleContentSha256);
    const objects=new Map();
    for(const descriptor of [pointer.current,pointer.previous].filter(Boolean)){
      const rows=descriptor.objects??[{objectPath:descriptor.objectPath,objectBytes:descriptor.objectBytes,
        objectSha256:descriptor.objectSha256}];
      for(const row of rows){
        const raw=await clients.storage.download(row.objectPath);
        same({bytes:raw.length,sha256:sha(raw)},{bytes:row.objectBytes,sha256:row.objectSha256},'Normal TLS stored object readback');
        if(objects.has(row.objectPath))same(objects.get(row.objectPath),raw);else objects.set(row.objectPath,raw);
      }
    }
    same(await json(path.join(ROOT,REGISTRY)),initial.registry,'Same normal registry after CURRENT B/S');
    same(await read(initialFile,32*1024*1024),initialBytes,'Retained original initial transport metadata');
    same([identity.dev,identity.ino],await fs.lstat(work,{bigint:true}).then(s=>[s.dev,s.ino]),'Same exclusive CURRENT output');
    return serializeNativeInputs({profile:'current-source-native',workRoot:work,current,registry:initial.registry,
      documents,objects},false);
  }catch(error){first=error;throw error;}
  finally{
    let failure;try{process.chdir(beforeCwd);
      for(const name of Object.keys(process.env))if(!Object.hasOwn(beforeEnv,name))delete process.env[name];
      for(const [name,value]of Object.entries(beforeEnv))process.env[name]=value;
    }catch(error){failure=error;}
    if(failure&&first)Object.defineProperty(first,'nativeInputCleanupFailure',{value:failure});else if(failure)throw failure;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  requireSourceProducerOutput(); requireSourceProducerBinding();
  assert.equal(process.argv.length,3);
  const mode=process.argv[2];assert(['--prepare-current-profile','--prepare-initial-profile','--prepare-current-from-initial-profile'].includes(mode));
  console.log(JSON.stringify(await(mode==='--prepare-initial-profile'?prepareCurrentSourceNativeInitialProfile():
    mode==='--prepare-current-from-initial-profile'?prepareCurrentSourceNativeFromInitialProfile():prepareCurrentSourceNativeProfile())));
}
