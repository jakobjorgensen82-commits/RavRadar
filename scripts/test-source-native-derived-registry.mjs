// Focused normal fixture guard: no provider/native/SQL or production calls.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
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


test('SOURCE normal admin fixture hydrates the audited tombstone before providers and preserves every other feature',async()=>{
  const own=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rr-source-normal-admin-')));
  try{
    const fixture=path.join(ROOT,'scripts/fixtures/source19-current-native-providers.py');
    const python=String.raw`
import hashlib, importlib.util, json, os, sys
from pathlib import Path
fixture, out = Path(sys.argv[1]), Path(sys.argv[2])
spec = importlib.util.spec_from_file_location("normal_admin_fixture_under_test", fixture)
provider = importlib.util.module_from_spec(spec)
spec.loader.exec_module(provider)
root = provider.ROOT
tracked = [root / name for name in (*provider.NORMAL_ADMIN_INPUTS, provider.NORMAL_ADMIN_AUDIT) if (root / name).exists()]
before = {str(file): file.read_bytes() for file in tracked}
rows = provider.prepare_staged_normal_admin_inputs(out)
assert provider.assert_staged_normal_admin_inputs(out, rows) is True
proof = json.loads((out / ".cache/native-admin-inputs/hydration-proof.json").read_text(encoding="utf-8"))
original = json.loads((out / ".cache/native-admin-inputs/source-zones.geojson").read_bytes())
actual_file = out / "data/zones.geojson"
actual_raw = actual_file.read_bytes()
actual = json.loads(actual_raw)
registry = json.loads((root / "data/live/coastal-parts-v2.json").read_text(encoding="utf-8"))
assert len(original["features"]) == 211 and len(actual["features"]) == 210
assert sorted(feature["properties"]["id"] for feature in actual["features"]) == sorted(registry["zones"])
expected = dict(original)
expected["features"] = [feature for feature in original["features"]
                        if feature["properties"]["id"] not in proof["deletedZoneIds"]]
assert actual == expected
assert proof["syntheticTestInput"] is True and proof["productionProof"] is False and proof["freshCentralRead"] is False
assert proof["auditSha256"] == "3efa0b99e28ab1dadf8278e3394986c962fc37b478571342311d110030c231d7"
assert proof["exactRegistryIdentities"] is True and proof["retainedFeaturesUnchanged"] is True
def reject_changed_document(document, expected_code):
    raw = json.dumps(document, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
    actual_file.write_bytes(raw)
    altered_rows = [{**row, **({"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
                    if row["relativePath"] == "data/zones.geojson" else {})} for row in rows]
    try:
        provider.assert_staged_normal_admin_inputs(out, altered_rows)
        raise AssertionError("Altered normal admin input was accepted")
    except RuntimeError as error:
        assert str(error) == "CURRENT_NATIVE_PROVIDER_" + expected_code
    finally:
        actual_file.write_bytes(actual_raw)
wrong_ids = json.loads(actual_raw)
wrong_ids["features"][0]["properties"]["id"] = "UNKNOWN-SAME-COUNT"
reject_changed_document(wrong_ids, "NORMAL_ADMIN_ZONE_IDS")
changed_feature = json.loads(actual_raw)
changed_feature["features"][0]["properties"]["unexpectedFixtureMutation"] = True
reject_changed_document(changed_feature, "NORMAL_ADMIN_RETAINED_FEATURES_CHANGED")
assert provider.assert_staged_normal_admin_inputs(out, rows) is True
try:
    provider.prepare_staged_normal_admin_inputs(out)
    raise AssertionError("Existing owned admin archive was overwritten")
except FileExistsError:
    pass
assert all(file.read_bytes() == before[str(file)] for file in tracked)
assert (out / ".cache/native-admin-inputs/source-zones.geojson").read_bytes() == before[str(root / "data/zones.geojson")]
print(json.dumps({"syntheticTestInput": True, "originalZones": 211, "hydratedZones": 210,
    "parts": registry["partCount"], "exactIds": True, "otherFieldsUnchanged": True,
    "sourceBytesUnchanged": True, "wrongSameCountRefused": True, "changedFeatureRefused": True,
    "existingArchiveRefused": True, "productionProof": False}, separators=(",", ":")))
`;
    const output=execFileSync(process.env.PYTHON||'python',['-B','-c',python,fixture,own],
      {encoding:'utf8',cwd:ROOT,timeout:30000,maxBuffer:1024*1024,
        env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
    assert.deepEqual(JSON.parse(output.trim().split(/\r?\n/).at(-1)),{
      syntheticTestInput:true,originalZones:211,hydratedZones:210,parts:673,exactIds:true,
      otherFieldsUnchanged:true,sourceBytesUnchanged:true,wrongSameCountRefused:true,
      changedFeatureRefused:true,existingArchiveRefused:true,productionProof:false});
  }finally{
    assert.equal(path.dirname(own),await fs.realpath(os.tmpdir()));
    assert(path.basename(own).startsWith('rr-source-normal-admin-'));
    await fs.rm(own,{recursive:true,force:true});
  }
});

test('SOURCE all normal callers share staged admin only after strict source-clean and the initial return',async()=>{
  const provider=await fs.readFile(new URL('./fixtures/source19-current-native-providers.py',import.meta.url),'utf8');
  const forecast=await fs.readFile(new URL('./fixtures/source19-current-provider-forecast.mjs',import.meta.url),'utf8');
  const source=await fs.readFile(new URL('./fixtures/source19-current-normal-inputs.mjs',import.meta.url),'utf8');
  const preparation=provider.indexOf('    admin_rows = prepare_staged_normal_admin_inputs(out)');
  assert(preparation>provider.indexOf('str(ROOT / "scripts/build-public-coastal-parts-v2.mjs")'));
  assert(preparation<provider.indexOf('    raw_dir = out / ".cache/dmi-grib"'),'Exact IDs are checked before native bytes/decoding');
  assert(provider.includes('producer.ZONES_PATH = out / "data/zones.geojson"'));
  assert(provider.indexOf('producer.ZONES_PATH = out / "data/zones.geojson"')<provider.indexOf('signature = producer.sampling_registry_signature()'));
  assert(provider.includes('zones = producer.build_operational_zone_config(json.loads((out / "data/zones.geojson").read_text()), targets)'));
  assert(provider.includes('assert_staged_normal_admin_inputs(out, admin_rows)'),'The same manifest is reread before options emission');
  assert(forecast.includes("const zoneRegistry=JSON.parse(await fs.readFile(path.join(out,'data/zones.geojson')))"));
  const clean=source.indexOf('await assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot:ROOT,');
  const initialReturn=source.indexOf("    if(initial)return Object.freeze({profile:'current-source-native-initial'");
  const materialize=source.indexOf('    await copyInputs(inputRoot, ROOT, options.adminInputs, ADMIN);');
  const transition=source.indexOf("    const transition = await load(ROOT, 'scripts/source-producer-runtime-transition.mjs');");
  assert(clean>=0&&clean<initialReturn&&initialReturn<materialize&&materialize<transition,
    'The initial-only profile leaves CURRENT source untouched; SOURCE metadata uses the same normal admin inputs');
  assert(source.includes('currentZones.features.map(feature=>feature.properties.id).sort(),Object.keys(registry585.zones).sort()'));
  assert(source.includes("same(currentRegistry, registry585, 'Same full normal registry after CURRENT admin input materialization')"));
  const fromInitial=source.slice(source.indexOf('export async function prepareCurrentSourceNativeFromInitialProfile(){'));
  const fromInitialClean=fromInitial.indexOf('await assertCurrentNativeSourceWithDerivedRegistry({repositoryRoot:ROOT,');
  const fromInitialAdmin=fromInitial.indexOf('await copyInputs(adminInputRoot,ROOT,adminOptions.adminInputs,ADMIN);');
  const fromInitialTransition=fromInitial.indexOf("const transition=await load(ROOT,'scripts/source-producer-runtime-transition.mjs');");
  assert(fromInitialClean>=0&&fromInitialClean<fromInitialAdmin&&fromInitialAdmin<fromInitialTransition,
    'The real from-initial profile also materializes the same normal admin only after source-clean');
  assert(fromInitial.includes('assert.equal(adminOptions.targetReferenceAt,initial.frozen585ForwardReferenceAt)'));
  assert(fromInitial.includes('currentZones.features.map(feature=>feature.properties.id).sort(),Object.keys(initial.registry.zones).sort()'));
  assert(fromInitial.includes('Same full normal prefix registry after CURRENT-from-initial admin materialization'));
});

// These observations execute no producer/provider/SQL route and grant no
// admission. Read the actual private helper body; authenticate real Git blobs.
async function producerObservationHarness(root, producer, logs=[]){
  const source=await fs.readFile(new URL('./fixtures/source19-current-normal-inputs.mjs',import.meta.url),'utf8');
  const start='// SOURCE_PRODUCER_OBSERVATION_BEGIN',end='// SOURCE_PRODUCER_OBSERVATION_END';
  assert.equal(source.split(start).length,2);assert.equal(source.split(end).length,2);
  const block=source.slice(source.indexOf(start),source.indexOf(end));
  const modulePrefix=source.slice(source.indexOf('const sha ='),source.indexOf('// Test-input guard only'));
  const readExport='export async function read(file, maximum = 256 * 1024 * 1024) {';
  assert.equal(modulePrefix.split(readExport).length,2,'One exact normal fixture read export');
  // AsyncFunction needs local syntax, but the complete real read body stays.
  const prefix=modulePrefix.replace(readExport,()=>readExport.slice('export '.length));
  const names=['OLD_HEAD','OLD_TREE','OPERATIVE_INITIAL_HEAD','OPERATIVE_INITIAL_TREE','HEAD586','TREE586',
    'OPERATIVE587_HEAD','OPERATIVE587_TREE','OPERATIVE588_HEAD','OPERATIVE588_TREE'];
  const pins=names.map(name=>{
    const matches=[...source.matchAll(new RegExp('\\b'+name+"\\s*=\\s*'([a-f0-9]{40})'",'g'))];
    assert.equal(matches.length,1);return matches[0][1];
  });
  const {isDeepStrictEqual}=await import('node:util');
  const {nativePostgresExceptionDiagnostic}=await import('./lib/checkpoint-cas-native-postgres.mjs');
  const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
  const phaseLogs=[];
  const functions=await AsyncFunction('assert','crypto','fs','path','execFileSync','fileURLToPath','pathToFileURL',
    'isDeepStrictEqual','ROOT',...names,'nativePostgresExceptionDiagnostic','produceNativeInputs','console',
    prefix+block+'\nreturn {sourceProducerFailureFrame,observeNativeInputs,reportSourceProducerFailure};')(
    assert,crypto,fs,path,execFileSync,fileURLToPath,pathToFileURL,isDeepStrictEqual,root,...pins,
    nativePostgresExceptionDiagnostic,producer,{error:value=>{
      const report=JSON.parse(value);
      if(report.kind==='SOURCE_LEGACY_PHASE_OBSERVATION')phaseLogs.push(report);
      else logs.push(report);
    }});
  return {...functions,pins:Object.fromEntries(names.map((name,index)=>[name,pins[index]])),source,phaseLogs};
}

test('SOURCE producer reports real fixed operation boundaries and preserves the thrown identity/result',async()=>{
  const logs=[],sentinel={scope:'diagnostic-unit-only'},h=await producerObservationHarness(ROOT,async()=>sentinel,logs);
  assert.equal(await h.observeNativeInputs({},false),sentinel);assert.equal(logs.length,0);
  assert.deepEqual(h.phaseLogs,[{kind:'SOURCE_LEGACY_PHASE_OBSERVATION',
    phase:'SOURCE_LEGACY_PRODUCER_SETUP',privatePayloadIncluded:false}]);
  assert(h.source.includes('} catch (error) { first = error; await reportSourceProducerFailure(error,observation); throw error; }'),
    'The real producer reports its first exception before its existing cleanup');
  const firstObservation={phase:'SOURCE_LEGACY_PRODUCER_SETUP',work:null,failureReported:false};
  await h.reportSourceProducerFailure(new Error('PRIVATE_FIRST'),firstObservation);
  await h.reportSourceProducerFailure(new Error('PRIVATE_SECOND'),firstObservation);
  assert.equal(logs.length,1,'Outer wrapper cannot replace an already reported first exception');
  assert(!JSON.stringify(logs).includes('PRIVATE_FIRST'));assert(!JSON.stringify(logs).includes('PRIVATE_SECOND'));
  const boundaries=[
    ["SOURCE_LEGACY_PRODUCER_ARCHIVE","    const archiveSeed = await createArchivedOnlyOldSeed("],
    ["SOURCE_LEGACY_PRODUCER_UPDATER585","    await load(host585, 'scripts/update-weather.mjs');"],
    ["SOURCE_LEGACY_PRODUCER_PUBLIC585","    await load(host585, 'scripts/generate-public-conditions.mjs');"],
    ["SOURCE_LEGACY_PRODUCER_SAVE585","    const private585 = path.join(work, 'saved585');"],
    ["SOURCE_LEGACY_PRODUCER_RESTORE585","      const workflow585=await load(host585,"],
    ["SOURCE_LEGACY_PRODUCER_FOLLOWER585","      await copyInputs(path.join(own,'fixture-initial-h1'),host585,"],
    ["SOURCE_LEGACY_PRODUCER_SOURCE_METADATA","    process.chdir(ROOT); process.env.PRIVATE_RUNTIME_REPOSITORY_ROOT = ROOT;"],
  ];
  for(const [phase,call]of boundaries){
    const marker="observation.phase='"+phase+"';";
    assert(h.source.indexOf(marker)>=0&&h.source.indexOf(marker)<h.source.indexOf(call),phase);
  }
  for(const [phase,call]of [
    ['SOURCE_LEGACY_PRODUCER_NATIVE586',"  const native=path.join(work,'normal586');"],
    ['SOURCE_LEGACY_PRODUCER_FOLLOWER587',"  const host587=path.join(work,"],
    ['SOURCE_LEGACY_PRODUCER_FOLLOWER588',"  assertFrozen588CodeSourceSelected();"],
    ['SOURCE_LEGACY_PRODUCER_FINISH',"    if(initial)return Object.freeze("],
  ])assert(h.source.indexOf("observation.phase='"+phase+"';")<h.source.indexOf(call),phase);
  for(const thrown of [new Error('PRIVATE_MESSAGE_AND_VALUE'),null,undefined,false,0]){
    const observed=[],actual=await producerObservationHarness(ROOT,async()=>{throw thrown;},observed);
    let caught=false;
    try{await actual.observeNativeInputs({},false);}catch(error){caught=true;assert.equal(error,thrown);}
    assert(caught);assert.equal(observed.length,1);
    assert.deepEqual(actual.phaseLogs,[{kind:'SOURCE_LEGACY_PHASE_OBSERVATION',
      phase:'SOURCE_LEGACY_PRODUCER_SETUP',privatePayloadIncluded:false}]);
    assert.deepEqual(Object.keys(observed[0]).sort(),['code','frame','kind','phase','privatePayloadIncluded']);
    assert.equal(observed[0].phase,'SOURCE_LEGACY_PRODUCER_SETUP');assert.equal(observed[0].privatePayloadIncluded,false);
    assert(!JSON.stringify(observed[0]).includes('PRIVATE_MESSAGE_AND_VALUE'));
  }
});

test('SOURCE producer frames require an exact owned fixed Git source and prefer the authenticated caller',async()=>{
  const own=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'rr-source19-union-native-observation-')));
  const root=path.join(own,'current-source-native'),work=path.join(own,'current-source-native-inputs');
  await fs.mkdir(root);await fs.mkdir(work);
  const h=await producerObservationHarness(root,async()=>{throw new Error('UNUSED');});
  const gitEnvironment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
  const git=(cwd,...args)=>execFileSync('git',['-c','core.autocrlf=false','-C',cwd,...args],
    {env:gitEnvironment,timeout:30000,maxBuffer:2*1024*1024,stdio:['ignore','pipe','pipe']});
  const observation={work,initial:false,sourceHead:null,sourceTree:null};
  const owners=[
    ['normal-old140000',h.pins.OLD_HEAD,h.pins.OLD_TREE],
    ['normal-initial-operative585',h.pins.OPERATIVE_INITIAL_HEAD,h.pins.OPERATIVE_INITIAL_TREE],
    ['normal586',h.pins.HEAD586,h.pins.TREE586],
    ['normal-operative587',h.pins.OPERATIVE587_HEAD,h.pins.OPERATIVE587_TREE],
    ['normal-operative588',h.pins.OPERATIVE588_HEAD,h.pins.OPERATIVE588_TREE],
  ];
  const module='js/core/ravscore-model-contract.js',hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  let selected;
  for(const [name,head,tree]of owners){
    const checkout=path.join(work,name);
    // Diagnostic-only sparse work copy: actual immutable HEAD/tree/whole blob,
    // never a normal producer checkout, numerical input or native PASS.
    execFileSync('git',['-c','core.autocrlf=false','clone','--shared','--no-hardlinks','--no-checkout',ROOT,checkout],
      {env:gitEnvironment,timeout:30000,stdio:['ignore','pipe','pipe']});
    git(checkout,'update-ref','--no-deref','HEAD',head);
    assert.equal(git(checkout,'rev-parse','HEAD^{tree}').toString().trim(),tree);
    const file=path.join(checkout,module),body=git(checkout,'cat-file','blob',head+':'+module);
    await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,body);
    const url=pathToFileURL(file).href;
    const error={code:'ENOENT',message:'PRIVATE',stack:'Error: PRIVATE\n    at fail ('+url+':1:1)\n    at actualProducer ('+url+':2:1)'};
    const frame=await h.sourceProducerFailureFrame(error,observation);
    assert.deepEqual(frame,{module,sha256:hash(body),line:2,column:1});
    const fallback=await h.sourceProducerFailureFrame({...error,stack:'Error\n    at need ('+url+':1:1)'},observation);
    assert.equal(fallback.line,1,'Retain a genuine guard when no authenticated caller exists');
    await fs.appendFile(file,'\n');
    assert.equal(await h.sourceProducerFailureFrame(error,observation),null,'Changed working source is not a frame');
    await fs.writeFile(file,body);
    assert.equal(await h.sourceProducerFailureFrame({...error,stack:'Error\n    at fn ('+url+'?arbitrary:1:1)'},observation),null);
    if(!selected)selected={checkout,file,body,error,head};
  }
  const {checkout,file,body,error,head}=selected;
  const link=path.join(checkout,'source-hardlink');await fs.link(file,link);
  assert.equal(await h.sourceProducerFailureFrame(error,observation),null,'Hardlinked source refused');
  await fs.unlink(link);
  const moved=path.join(checkout,'retained-original');await fs.rename(file,moved);await fs.mkdir(file);
  assert.equal(await h.sourceProducerFailureFrame(error,observation),null,'Directory refused');await fs.rmdir(file);
  if(process.platform==='linux'){
    await fs.symlink(moved,file);
    assert.equal(await h.sourceProducerFailureFrame(error,observation),null,'Symlink refused');await fs.unlink(file);
  }
  await fs.rename(moved,file);git(checkout,'update-ref','--no-deref','HEAD',h.pins.OPERATIVE_INITIAL_HEAD);
  assert.equal(await h.sourceProducerFailureFrame(error,observation),null,'Wrong actual HEAD/tree refused');
  git(checkout,'update-ref','--no-deref','HEAD',head);
  const sibling=path.join(own,'unowned-source.js');await fs.writeFile(sibling,body);
  assert.equal(await h.sourceProducerFailureFrame({...error,stack:'Error\n    at fn ('+pathToFileURL(sibling).href+':1:1)'},observation),null);
  const producer585=path.join(work,'normal-initial-operative585'),relative='scripts/update-weather.mjs';
  const queryFile=path.join(producer585,relative),queryBody=git(producer585,'cat-file','blob',h.pins.OPERATIVE_INITIAL_HEAD+':'+relative);
  await fs.mkdir(path.dirname(queryFile),{recursive:true});await fs.writeFile(queryFile,queryBody);
  const queryFrame=await h.sourceProducerFailureFrame({...error,
    stack:'Error\n    at normalFollower ('+pathToFileURL(queryFile).href+'?source-native-initial-forward:1:1)'},observation);
  assert.deepEqual(queryFrame,{module:relative,sha256:hash(queryBody),line:1,column:1});
  // This one extra fallback tuple is bound to the actual immutable585 module,
  // its complete bytes, exact wrapper line and exact stack name.
  const dmiModule='scripts/lib/dmi-forecast-file.mjs',dmiBody=git(producer585,'cat-file','blob',
    h.pins.OPERATIVE_INITIAL_HEAD+':'+dmiModule),dmiFile=path.join(producer585,dmiModule);
  assert.equal(hash(dmiBody),'ac1cbf3909daad48e126a23c1c724e942344750c8856308c2e2a74d842a053a6');
  await fs.mkdir(path.dirname(dmiFile),{recursive:true});await fs.writeFile(dmiFile,dmiBody);
  const dmiUrl=pathToFileURL(dmiFile).href,callerUrl=pathToFileURL(queryFile).href;
  const stackFor=(name,line,source=dmiUrl)=>'Error\n    at '+name+' ('+source+':'+line+':33)\n    at actualFileConsumer ('+callerUrl+':1:1)';
  const callerFrame={module:relative,sha256:hash(queryBody),line:1,column:1};
  assert.deepEqual(await h.sourceProducerFailureFrame({stack:stackFor('invalid',23)},observation),callerFrame);
  const invalidFallback=await h.sourceProducerFailureFrame({stack:'Error\n    at invalid ('+dmiUrl+':23:33)'},observation);
  assert.deepEqual(invalidFallback,{module:dmiModule,sha256:hash(dmiBody),line:23,column:33});
  for(const [name,line]of [['invalid',22],['invalidOther',23],['Object.invalid',23]]){
    assert.deepEqual(await h.sourceProducerFailureFrame({stack:stackFor(name,line)},observation),
      {module:dmiModule,sha256:hash(dmiBody),line,column:33},'Wrong name or line is not a fallback exemption');
  }
  assert.deepEqual(await h.sourceProducerFailureFrame({stack:stackFor('invalid',23,callerUrl)},observation),
    {module:relative,sha256:hash(queryBody),line:23,column:33},'Wrong module is not a fallback exemption');
  await fs.appendFile(dmiFile,'\n');
  assert.equal(await h.sourceProducerFailureFrame({stack:'Error\n    at invalid ('+dmiUrl+':23:33)'},observation),null,
    'Changed working bytes cannot supply even the fallback frame');
  await fs.writeFile(dmiFile,dmiBody);
  // The actual65db module has a different authenticated whole hash. Its name
  // and line alone must not acquire the special585 fallback behavior.
  execFileSync('git',['-c','core.autocrlf=false','clone','--shared','--no-hardlinks','--no-checkout',ROOT,root],
    {env:gitEnvironment,timeout:30000,stdio:['ignore','pipe','pipe']});
  const currentHead='65db5331bd2a2a89a31261ad7951d87449ecdb26',currentTree='ae317cc1547abb85a9e89b49471cd9e0481d43fe';
  git(root,'update-ref','--no-deref','HEAD',currentHead);
  assert.equal(git(root,'rev-parse','HEAD^{tree}').toString().trim(),currentTree);
  const currentDmi=git(root,'cat-file','blob',currentHead+':'+dmiModule),currentFile=path.join(root,dmiModule);
  assert.notEqual(hash(currentDmi),hash(dmiBody));
  await fs.mkdir(path.dirname(currentFile),{recursive:true});await fs.writeFile(currentFile,currentDmi);
  assert.deepEqual(await h.sourceProducerFailureFrame({stack:stackFor('invalid',23,pathToFileURL(currentFile).href)},
    {...observation,sourceHead:currentHead,sourceTree:currentTree}),
    {module:dmiModule,sha256:hash(currentDmi),line:23,column:33},'A different genuine module hash gets no585 exemption');
  assert.equal(await h.sourceProducerFailureFrame({stack:''},observation),null);
  assert.equal(await h.sourceProducerFailureFrame(error,{...observation,work:path.join(own,'wrong-work')}),null);
  // Only these newly created, fixed diagnostic work copies are disposable.
  assert.equal(path.dirname(own),await fs.realpath(os.tmpdir()));
  assert(path.basename(own).startsWith('rr-source19-union-native-observation-'));
  await fs.rm(own,{recursive:true,force:true});
});
