// Normal target7: default authority and --national673x121 stay unchanged.
// Explicit --completed-stage-admit adds one actual lexical-origin consumer proof,673 target-H0 pairs only.
// Genuine d8 B/S builders -> normal UNPAIRED archive -> genuine issued584
// opaque restart origin. No SEED edit, tuple retag, origin stub or dirty waiver.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const completedStageAdmit=process.argv.includes('--completed-stage-admit');
assert(!(completedStageAdmit&&process.argv.includes('--national')),'Select exactly one explicit fixture.');
const FIXED584_HEAD='0b3a6fdd92dddf90f0030094a2ec9aa36261e748',FIXED584_TREE='dd2d223ab88e9061bc751dd7f531fa1a52d5bba7';
const OLD_HEAD='d8a52e3e4cbaed1557cc56fe01f5f0a2b0d657d7';
const OLD_TREE='0ddede3f4b4fb4faa43b0d43f17c7cdbadcc9bc0';
const EXPECTED={C:'47a27aec034d8d7cbab7755a19025d796b6fe51c2b276676c7309c912a85f501',
  I:'bb0da11642d1aff76fc4f821114d923aa9897c41abd543df0fa6166290075947',
  T:'7532755a43f8bb2ccc125efa3aa747ed03365b720d13addfcdb91ce4b74d908c'};
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const clone=structuredClone;
const load=(root,file)=>import(pathToFileURL(path.join(root,file)).href);
const time=hour=>new Date(Date.parse('2026-01-01T00:00:00.000Z')+hour*3600000).toISOString();
const git=(root,...args)=>execFileSync('git',['-c','core.autocrlf=false','-C',root,...args],
  {encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:32*1024*1024}).trim();
const write=async(file,value)=>{
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value)+'\n',{flag:'wx'});
};

test('issued584 genuine old B/S and UNPAIRED archive mint a new zero-history origin, never old-pair admission',async t=>{
  const executionHead=git(ROOT,'rev-parse','HEAD'),sourceHead=FIXED584_HEAD;
  assert.match(executionHead,/^[a-f0-9]{40}$/);
  assert.match(sourceHead,/^[a-f0-9]{40}$/);
  git(ROOT,'merge-base','--is-ancestor',FIXED584_HEAD,executionHead);
  assert.equal(git(ROOT,'rev-parse',FIXED584_HEAD+'^{tree}'),FIXED584_TREE);
  git(ROOT,'merge-base','--is-ancestor',OLD_HEAD,sourceHead);
  assert.equal(git(ROOT,'diff','--name-only','HEAD'),'','Real committed source is required before this positive target.');
  if(process.env.GITHUB_EVENT_NAME==='pull_request'){
    // The workflow checks out pull_request.head.sha; ambient GITHUB_SHA is its merge commit.
    const eventPath=process.env.GITHUB_EVENT_PATH;assert.equal(typeof eventPath,'string');assert(path.isAbsolute(eventPath));
    const event=JSON.parse(await fs.readFile(eventPath,'utf8')),eventHead=event?.pull_request?.head?.sha;
    assert.match(eventHead??'',/^[a-f0-9]{40}$/);assert.equal(executionHead,eventHead,'Checkout must be the actual PR event source head.');
  }else if(process.env.GITHUB_SHA!==undefined)assert.equal(process.env.GITHUB_SHA,executionHead);
  if(completedStageAdmit)t.mock.timers.enable({apis:['Date'],now:Date.parse(time(15))});
  const parent=await fs.realpath(os.tmpdir());
  const work=await fs.mkdtemp(path.join(parent,'rr-lme584-archive-origin-'));
  const workIdentity=await fs.lstat(work,{bigint:true});
  const HOST=path.join(work,'source584'),OLD=path.join(work,'source140000');
  const originalFetch=globalThis.fetch,originalEnv={...process.env};
  let restoreTransport=null;
  const receipt={kind:'SYNTHETIC_GENUINE_584_ARCHIVE_TO_OPAQUE_ORIGIN',result:'STARTED',sourceHead,executionHead,historical584Only:true,current585Admission:false,
    oldProducer:OLD_HEAD,sourceCleanWaiver:false,modelRetag:false,originStub:false,
    syntheticPublicProjection:true,full673Cold:false,full121Forecast:false,ordinaryFollowers:0,
    productionProof:false,sqlExecuted:false,stages:[]};
  let phase='SOURCE_HOSTS';
  try{
    for(const[root,head]of[[HOST,sourceHead],[OLD,OLD_HEAD]]){
      execFileSync('git',['-c','core.autocrlf=false','clone','--shared','--no-hardlinks','--no-checkout',ROOT,root],
        {stdio:['ignore','pipe','pipe']});
      git(root,'-c','advice.detachedHead=false','checkout','--detach',head);
      assert.equal(git(root,'rev-parse','HEAD'),head);
      assert.equal(git(root,'status','--porcelain','-uno'),'');
    }
    assert.equal(git(HOST,'rev-parse','HEAD^{tree}'),FIXED584_TREE);
    assert.equal(git(OLD,'rev-parse','HEAD^{tree}'),OLD_TREE);
    const source=await load(HOST,'scripts/lib/last-mile-enclosure-successor-source.mjs');
    const binding=source.requireLastMileEnclosureBinding();source.requireLastMileEnclosureOutput();
    for(const key of['C','I','T'])assert.equal(binding[key],EXPECTED[key]);
    const currentManifest=(await load(HOST,'js/core/ravscore-model-bundle.generated.js')).GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST;
    assert.equal(currentManifest.files.some(row=>(row.path??row.file)==='data/live/coastal-parts-v2.json'),false,
      'The fixture may hydrate runtime registry input, never mutate a bound source leaf.');
    // Capture the actual clean committed comparison before runtime hydration.
    const completedStageSourceComparison=completedStageAdmit
      ?(await load(HOST,'scripts/ordinary-completed-stage-source.mjs')).assertOrdinaryCompletedStageSource(
        {root:HOST,producerHead:sourceHead,consumerHead:sourceHead}):null;
    const oldWorkflow=await load(OLD,'scripts/private-production-runtime-workflow.mjs');
    const oldBundle=await load(OLD,'scripts/private-production-runtime-bundle.mjs');
    const oldB=await load(OLD,'scripts/protected-private-production-runtime.mjs');
    const oldLocalS=await load(OLD,'scripts/ravscore-continuation-checkpoint.mjs');
    const oldProtectedS=await load(OLD,'scripts/protected-ravscore-continuation-checkpoint.mjs');
    const oldI=(await load(OLD,'js/core/ravscore-model-contract.js')).ravScoreModelBinding();
    const oldC=(await load(OLD,'scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
    assert.equal(oldI.modelBundleSha256,source.LAST_MILE_ENCLOSURE_BEFORE.I);
    assert.equal(oldC.modelBundleSha256,source.LAST_MILE_ENCLOSURE_BEFORE.C);
    assert.equal((await oldWorkflow.privateRuntimeContractHashes({repositoryRoot:OLD})).continuationStateContractSha256,
      source.LAST_MILE_ENCLOSURE_BEFORE.T);
    const integrated=await load(OLD,'js/core/ravscore-integrated-state-pipeline.js');
    const candidate=await load(OLD,'js/core/ravscore-candidate-g-state-pipeline.js');
    const context=await load(OLD,'scripts/lib/ravscore-sampling-context.mjs');
    const point=await load(OLD,'scripts/lib/coastal-point-staging-contract.mjs');
    const backend=(await load(HOST,'scripts/lib/established-native-current-origin-test-transports.mjs')).normalBAndSTransports();
    restoreTransport=backend.installFixedReaderTransport();
    const zoneIds=Array.from({length:210},(_,i)=>'SYNTHETIC-LME584-ZONE-'+i);
    const parts=Array.from({length:673},(_,i)=>({partId:'SYNTHETIC-LME584-PART-'+i,
      zoneId:zoneIds[i%210],parentZoneId:zoneIds[i%210],landPoint:[10,56],waterPoint:[10.01,56.01],onshoreDirectionDeg:0}));
    const registry={schemaVersion:2,enabled:true,zoneCount:210,partCount:673,
      zones:Object.fromEntries(zoneIds.map(id=>[id,parts.filter(part=>part.zoneId===id)]))};
    // Central runtime input is intentionally synthetic and separately bound by
    // archive hashes. No model source or generated manifest is changed.
    await fs.writeFile(path.join(HOST,'data/live/coastal-parts-v2.json'),JSON.stringify(registry)+'\n');
    function conditionsAt(hour,label){
      const states=parts.map(part=>{
        const rows=Array.from({length:hour+1},(_,i)=>({time:time(i),currentSpeedMps:0.12,currentAlignment:0.75,
          currentVerified:true,waveHeightM:0,wavePeriodS:0,waveDirectionDeg:null}));
        return [part,integrated.buildIntegratedRavScoreStateSeries(rows,{samplingContextKey:context.ravScoreSamplingContextKey(part),
          onshoreDirectionDeg:part.onshoreDirectionDeg}).continuationState,
        candidate.buildCandidateGDerivedStateSeries(rows,{stateKey:point.candidateGStateKey(part)}).continuationState];
      });
      return {datasetId:'rr-synthetic-lme584-'+label,productionReferenceAt:time(hour),generatedAt:time(hour+1),
        zones:Object.fromEntries(zoneIds.map(id=>[id,{fixtureOnly:true}])),
        coastalParts:{modelBinding:oldI,expectedPartCount:673,parts:Object.fromEntries(states.map(([part,state])=>
          [part.partId,{...part,ravScoreModel:{currentState:state}}]))},
        ravScoreCandidateGWarmup:{schemaVersion:'1.0.0',kind:'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
          privacyClass:'PRIVATE_PRODUCTION_RUNTIME',status:'BUILDING_MEASURED_ONLY',evidencePolicy:'MEASURED_ONLY',
          syntheticHistoryAllowed:false,automaticActivationAllowed:false,publicDuringNormalOperation:false,
          sourceModelBinding:oldI,candidateModelBinding:oldC,runtime:{modelBinding:oldC,status:'BUILDING_MEASURED_ONLY',
            expectedPartCount:673,measuredPartCount:673,parts:Object.fromEntries(states.map(([part,,state])=>
              [part.partId,{ravScoreModel:{currentState:state}}]))}}};
    }
    phase='GENUINE_OLD_SEPARATE_S_AND_B';
    const oldCentral=conditionsAt(7,'central'),oldConditions=conditionsAt(8,'bundle');
    const centralSource=path.join(work,'central-source.json'),centralCheckpoint=path.join(work,'central/.cache/ravscore-continuation-checkpoint/checkpoint.json');
    await write(centralSource,oldCentral);
    await oldLocalS.saveRavScoreContinuationCheckpoint({sourcePath:centralSource,checkpointPath:centralCheckpoint,repositoryRoot:OLD});
    await oldProtectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath:centralCheckpoint,
      targetReference:time(7),request:backend.documentRequest,rpcRequest:backend.checkpointRpc});
    for(const descriptor of oldWorkflow.PRIVATE_RUNTIME_FILES){
      const file=path.join(OLD,descriptor.relativePath);await fs.mkdir(path.dirname(file),{recursive:true});
      await fs.writeFile(file,JSON.stringify(descriptor.id==='full-conditions'?oldConditions:{fixtureOnly:descriptor.id})+'\n');
    }
    const spec=await oldWorkflow.buildPrivateRuntimeCreateSpec({repositoryRoot:OLD});
    const privateRoot=path.join(work,'private140000');await fs.mkdir(privateRoot);
    const bundlePath=path.join(privateRoot,'bundle');
    await oldBundle.createPrivateProductionRuntimeBundle({repositoryRoot:OLD,privateRoot,bundlePath,...spec});
    const expected=await oldWorkflow.buildPrivateRuntimeExpectation({repositoryRoot:OLD,targetReferenceAt:time(8),now:time(9)});
    const published=await oldB.publishProtectedPrivateProductionRuntime({repositoryRoot:OLD,privateRoot,bundlePath,expected,
      now:time(9),sourceHead:OLD_HEAD,request:backend.documentRequest,storage:backend.storage});
    assert.equal(published.published,true);
    const pointer=clone(backend.documents.get('ravscore-private-production-runtime-pointer'));
    const central=clone(backend.documents.get('ravscore-continuation-checkpoint'));
    assert.equal(pointer.payload.current.sourceHead,OLD_HEAD);assert.equal(central.payload.productionReferenceAt,time(7));
    process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=privateRoot;process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=bundlePath;
    phase='NORMAL_UNPAIRED_ARCHIVE';
    const archiveModule=await load(HOST,'scripts/lib/weather-state-epoch-archive.mjs');
    const originals=path.join(work,'original-files');await fs.mkdir(originals);
    await write(path.join(originals,'original-S.json'),central.payload);await write(path.join(originals,'registry.json'),registry);
    const publicDocs=new Map(archiveModule.WEATHER_STATE_EPOCH_PUBLIC_FILES.filter(name=>name!=='manifest.json')
      .map(name=>[name,{fixtureOnly:name,datasetId:'rr-synthetic-lme584-public'}]));
    const publicManifest={schemaVersion:4,complete:true,zoneCount:210,coastalPartCount:673,
      datasetId:'rr-synthetic-lme584-public',productionReferenceAt:time(6),ravScoreModelBinding:oldI};
    for(const[name,key]of[['public-conditions.json','publicConditions'],['public-condition-details.json','publicConditionDetails'],
      ['coastal-parts-v2.json','coastalParts'],['zones.geojson','zoneRegistry']]){
      const raw=Buffer.from(JSON.stringify(publicDocs.get(name))+'\n');publicManifest[key+'Bytes']=raw.length;publicManifest[key+'Sha256']=sha(raw);
    }
    publicDocs.set('manifest.json',publicManifest);
    for(const[name,value]of publicDocs)await write(path.join(originals,name),value);
    const originalFiles=[{role:'checkpoint',relativePath:'original-S.json',sourcePath:path.join(originals,'original-S.json')},
      {role:'registry',relativePath:'registry.json',sourcePath:path.join(originals,'registry.json')},
      ...archiveModule.WEATHER_STATE_EPOCH_PUBLIC_FILES.map(relativePath=>({role:'public-snapshot',relativePath,sourcePath:path.join(originals,relativePath)}))];
    const objects=pointer.payload.current.objects??[{index:0,objectPath:pointer.payload.current.objectPath,
      objectBytes:pointer.payload.current.objectBytes,objectSha256:pointer.payload.current.objectSha256}];
    const captured=await archiveModule.createWeatherStateEpochCaptureStorage({storage:backend.storage,captureRoot:path.join(work,'archive'),objects});
    for(const object of objects)await captured.storage.download(object.objectPath);
    const verifyOriginalSnapshot=async({archivedFiles})=>{
      assert.deepEqual(backend.documents.get('ravscore-private-production-runtime-pointer'),pointer);
      assert.deepEqual(backend.documents.get('ravscore-continuation-checkpoint'),central);
      const verified=await oldBundle.verifyPrivateProductionRuntimeBundle({repositoryRoot:OLD,privateRoot,bundlePath,expected,now:time(9)});
      const restoredPath=path.join(work,'readback-S/.cache/ravscore-continuation-checkpoint/checkpoint.json');
      const restored=await oldProtectedS.restoreProtectedRavScoreContinuationCheckpoint({checkpointPath:restoredPath,targetReference:time(7),request:backend.documentRequest});
      assert(restored.restored===true||restored.reason==='protected-checkpoint-equivalent');
      assert.deepEqual(JSON.parse(await fs.readFile(restoredPath,'utf8')),central.payload);
      return {originalDescription:clone(pointer.payload.current),originalPointerRow:clone(pointer),
        originalCheckpointRow:clone(central),originalCheckpointPayload:clone(central.payload),checkpointVersion:central.version,
        originalConditions:clone(oldConditions),registry:clone(registry),
        originalFileDigests:verified.files.map(({relativePath,bytes,sha256})=>({relativePath,bytes,sha256})),
        files:archivedFiles??originalFiles};
    };
    const archive=await archiveModule.saveUnpairedWeatherRestartArchive({capture:captured.capture,storage:backend.storage,
      targetReferenceAt:time(9),verifyOriginalSnapshot});
    const facts=archiveModule.assertVerifiedUnpairedWeatherRestartArchive(archive);
    assert.equal(facts.paired,false);assert.equal(facts.S.productionReferenceAt,time(7));
    assert.equal(facts.B.description.productionReferenceAt,time(8));assert.equal(facts.public.productionReferenceAt,time(6));
    phase='GENUINE_584_ORIGIN_AND_ZERO_OLD_ADMISSION';
    // Only this test-owned clone receives its own genuine HEAD for normal sourceIdentity.
    // originalEnv above is restored byte-for-value by the existing finally below.
    const fixtureSourceHead=git(HOST,'rev-parse','HEAD');assert.equal(fixtureSourceHead,sourceHead);
    process.env.GITHUB_SHA=fixtureSourceHead;
    const input=await load(HOST,'scripts/lib/archived-weather-restart-input-view.mjs');
    const view=await input.createArchivedWeatherRestartInputView({archive,registry,targetReferenceAt:time(9)});
    const selected=input.archivedWeatherRestartScoreInputs(view,{registry,targetReferenceAt:time(9)});
    for(const key of['previousCoastalParts','previousCandidateGRollbackRuntime','deployedBulkCache','historicalDmiBulkCache'])assert.equal(selected[key],null);
    for(const key of['checkpointStates','checkpointCandidateGRollbackStates','pointStateInjections'])assert.deepEqual(selected[key],{});
    assert.equal(selected.persistedDmiPartRows.size,0);
    const origin=await load(HOST,'scripts/lib/established-native-current-origin.mjs');
    const first=parts[0];
    assert.throws(()=>origin.assertEstablishedNativeCurrentOriginForPart(selected.establishedNativeCurrentOrigin,{part:first,
      integrated:oldConditions.coastalParts.parts[first.partId].ravScoreModel.currentState,
      candidate:oldConditions.ravScoreCandidateGWarmup.runtime.parts[first.partId].ravScoreModel.currentState}),
    /ESTABLISHED_CURRENT_ORIGIN_HANDLE/,'A genuine restart handle must not admit an archived old pair.');
    assert.deepEqual(backend.documents.get('ravscore-private-production-runtime-pointer'),pointer);
    assert.deepEqual(backend.documents.get('ravscore-continuation-checkpoint'),central);
    if(process.argv.includes('--national')||completedStageAdmit){
      // Explicit sequential preactivation target, never a default authority test.
      // Reuse the normal673x121 fixture; every model/origin/PART/B/S API is real.
      const load=relative=>import(pathToFileURL(path.join(HOST,relative)).href);
      const write=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});
        await fs.writeFile(file,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value)+'\n');};
      const at=time,allParts=parts,central=registry,RUN=work,PUBLIC=path.join(work,'new-public');
      const canonical=value=>JSON.stringify(value,(_key,nested)=>nested&&typeof nested==='object'&&!Array.isArray(nested)
        ?Object.fromEntries(Object.keys(nested).sort().map(key=>[key,nested[key]])):nested);
      const hash=value=>sha(canonical(value));
      const workflow=await load('scripts/private-production-runtime-workflow.mjs');
      const bundle=await load('scripts/private-production-runtime-bundle.mjs');
      const protectedB=await load('scripts/protected-private-production-runtime.mjs');
      const normalS=await load('scripts/ravscore-continuation-checkpoint.mjs');
      const protectedS=await load('scripts/protected-ravscore-continuation-checkpoint.mjs');
      const pipeline=await load('scripts/lib/ravscore-production-part-pipeline.mjs');
      const adapters=await load('scripts/lib/ravscore-production-adapters.mjs');
      const record=await load('scripts/lib/private-dmi-recovery-record.mjs');
      const protectedCurrent=await load('scripts/lib/protected-dmi-current-context.mjs');
      const priority=await load('scripts/lib/ravscore-recovery-source-priority.mjs');
      const replay=await load('scripts/lib/ravscore-recovery-replay.mjs');
      const integratedRuntime=await load('scripts/lib/ravscore-integrated-runtime.mjs');
      const dmi=await load('scripts/lib/dmi-forecast-store.mjs');
      const continuity=await load('scripts/lib/dmi-part-continuity.mjs');
      const forecastIo=await load('scripts/lib/dmi-forecast-file.mjs');
      const collector=(await load('scripts/lib/post-h0-dmi-original-dependencies.mjs')).collectPostH0DmiOriginalDependencies;
      const I=(await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
      const C=(await load('scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
      const supply=await load('js/core/ravscore-current-supply-memory.js');
      const transport=await load('js/core/ravscore-regime-memory.js');
      const zoneFor=part=>({id:part.zoneId,onshoreDirectionDeg:part.onshoreDirectionDeg});
      const sourceLeaves=[...new Set([
        ...currentManifest.files.map(row=>row.path??row.file),
        ...(await load('scripts/rollback-assets/ravscore-model-bundle.generated.js')).GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST.files.map(row=>row.path??row.file),
        'js/core/ravscore-model-bundle.generated.js','scripts/rollback-assets/ravscore-model-bundle.generated.js'])].sort();
      const sourcePins=new Map();for(const file of sourceLeaves)sourcePins.set(file,sha(await fs.readFile(path.join(HOST,file))));
      const originals=new Map();for(const file of originalFiles)originals.set(file.sourcePath,sha(await fs.readFile(file.sourcePath)));
      for(const file of facts.B.fileDigests)originals.set(path.join(bundlePath,'payload',file.relativePath),sha(await fs.readFile(path.join(bundlePath,'payload',file.relativePath))));
      originals.set(path.join(bundlePath,'manifest.json'),sha(await fs.readFile(path.join(bundlePath,'manifest.json'))));
      const archivedObjects=new Map([...backend.objects].filter(([name])=>!objects.some(row=>row.objectPath===name))
        .map(([name,bytes])=>[name,sha(bytes)]));assert(archivedObjects.size>0);
      const section=(source,first,next)=>{const a=source.indexOf(first),b=source.indexOf(next,a);
        assert(a>=0&&b>a);assert.equal(source.indexOf(first,a+first.length),-1);return source.slice(a,b);};
      const nativeText=(await fs.readFile(path.join(HOST,'scripts/test-post-h0-dmi-original-dependencies.mjs'),'utf8')).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
      const originalFactory=section(nativeText,'const sha = value =>','const rowAt =');
      assert.equal(sha(originalFactory),'ce887df6095f47f80708c0694c36831ef2bbee58dd8c8b29773c2be7b1b8b294');
      // These are only synthetic native-fixture INPUT parameter substitutions.
      // All constructors and original/grid/projection validators stay normal.
      const inputChanges=[
        ["const at = hours => new Date(Date.parse('2026-10-18T00:00:00.000Z') + hours * 3_600_000).toISOString();","const at = hours => new Date(Date.parse('2026-01-01T00:00:00.000Z') + hours * 3_600_000).toISOString();",1],
        ["const part = { partId: 'SYNTHETIC-POST-H0-PART', zoneId: 'DK-B01-01', waterPoint: [8, 55], onshoreDirectionDeg: 90 };",'const part = fixturePart;',1],
        ['const natives = [-3, 0, 3, 6, 9].map(offset => {','const natives = fixtureOffsets.map(offset => {',1],
        ['modelRun: at(-100), nativeValidTime: at(offset), leadTimeHours: 100 + offset,','modelRun: fixtureModelRun, nativeValidTime: at(offset), leadTimeHours: (Date.parse(at(offset)) - Date.parse(fixtureModelRun)) / 3600000,',1],
        ["itemId: 'synthetic-post-h0-item-' + offset, assetIdentitySha256: sha('asset-' + offset),","itemId: 'synthetic-post-h0-item-' + fixtureGeneration + '-' + offset, assetIdentitySha256: sha('asset-' + fixtureGeneration + '-' + offset),",1],
        ["assetSizeBytes: 1234, acquiredAt: at(-1), contentLengthBytes: 1234, contentSha256: sha('bytes-' + offset),","assetSizeBytes: 1234, acquiredAt: fixtureAcquiredAt, contentLengthBytes: 1234, contentSha256: sha('bytes-' + fixtureGeneration + '-' + offset),",1],
        ['itemCreatedAt: at(-100), itemUpdatedAt: at(-99), gridPoint: [8, 55],','itemCreatedAt: fixtureModelRun, itemUpdatedAt: fixtureModelRun, gridPoint: [...part.waterPoint],',1],
        ["'current-u': 0.1 + offset / 1000, 'current-v': 0.2","'current-u': 0.1 + offset / 1000 + fixtureGeneration / 100, 'current-v': 0.08 + fixtureGeneration / 100",1],
        ['at(6)','fixtureTarget',4],
      ];
      let nativeFactory=originalFactory;
      for(const[before,after,count]of inputChanges){assert.equal(nativeFactory.split(before).length,count+1);nativeFactory=nativeFactory.split(before).join(after);}
      let inverse=nativeFactory;
      for(const[before,after,count]of [...inputChanges].reverse()){assert.equal(inverse.split(after).length,count+1);inverse=inverse.split(after).join(before);}
      assert.equal(inverse,originalFactory);
      receipt.nativeFixture={beforeSha256:sha(originalFactory),afterSha256:sha(nativeFactory),wholeInverse:true,inputChanges};
      const env={assert,crypto,...adapters,...record,...priority,...integratedRuntime};
      const createNative=(part,offsets,generation,acquiredHour,targetHour)=>Function(...Object.keys(env),'fixturePart','fixtureOffsets',
        'fixtureModelRun','fixtureAcquiredAt','fixtureGeneration','fixtureTarget',nativeFactory+'\nreturn fixture({coherent:fixtureOffsets});')(
        ...Object.values(env),part,offsets,at(-100+generation*10),at(acquiredHour),generation,at(targetHour));

      const conditionsFor = (pairs, hour, label) => ({ datasetId: 'rr-synthetic-lme584-national-' + label,
        productionReferenceAt: at(hour), generatedAt: at(hour + 1), zones: Object.fromEntries(zoneIds.map(id => [id, { fixtureOnly: true }])),
        coastalParts: { modelBinding: I, expectedPartCount: 673, parts: Object.fromEntries(allParts.map(part => [part.partId,
          { ...part, ravScoreModel: { currentState: clone(pairs.get(part.partId).integrated) } }])) },
        ravScoreCandidateGWarmup: { schemaVersion: '1.0.0', kind: 'PRIVATE_CANDIDATE_G_MEASURED_WARMUP_RUNTIME',
          privacyClass: 'PRIVATE_PRODUCTION_RUNTIME', status: 'BUILDING_MEASURED_ONLY', evidencePolicy: 'MEASURED_ONLY',
          syntheticHistoryAllowed: false, automaticActivationAllowed: false, publicDuringNormalOperation: false,
          sourceModelBinding: I, candidateModelBinding: C, runtime: { modelBinding: C, status: 'BUILDING_MEASURED_ONLY',
            expectedPartCount: 673, measuredPartCount: 673, parts: Object.fromEntries(allParts.map(part => [part.partId,
              { ravScoreModel: { currentState: clone(pairs.get(part.partId).candidate) } }])) } } });
      const pairAt = (series, target) => ({ integrated: clone(series.scores.find(row => row.time === target)?.ravScoreModel?.continuationState),
        candidate: clone(series.candidateGRollbackScores.find(row => row.time === target)?.candidateG?.continuationState) });
      const pairsFrom = conditions => new Map(allParts.map(part => [part.partId, {
        integrated: conditions.coastalParts.parts[part.partId].ravScoreModel.currentState,
        candidate: conditions.ravScoreCandidateGWarmup.runtime.parts[part.partId].ravScoreModel.currentState }]));

      async function publicPack(conditions) {
        await fs.mkdir(path.join(PUBLIC, 'forecast'), { recursive: true });
        const details = Buffer.from(JSON.stringify({ syntheticDetails: true, datasetId: conditions.datasetId }) + '\n');
        const detailsSha = sha(details), hours = {}, forecastHours = (await load('js/core/ravscore-model-contract.js')).RAVSCORE_PUBLIC_FORECAST_HOURS;
        for (let index = 0; index < forecastHours; index++) {
          const time = new Date(Date.parse(conditions.productionReferenceAt) + index * 3600000).toISOString();
          const raw = Buffer.from(JSON.stringify({ delivery: { schemaVersion: 1, kind: 'hour', key: time,
            sourceDetailsSha256: detailsSha, modelBinding: I }, coastalParts: { modelBinding: I, current: { modelId: I.modelId,
            modelVersion: I.modelId, modelContractSha256: I.modelContractSha256, modelBundleSha256: I.modelBundleSha256, modelBinding: I } } }) + '\n');
          const file = sha(raw) + '.json'; await write(path.join(PUBLIC, 'forecast', file), raw);
          hours[time] = { path: './forecast/' + file, bytes: raw.length, sha256: sha(raw) };
        }
        const publicManifest = { datasetId: conditions.datasetId, productionReferenceAt: conditions.productionReferenceAt,
          publicConditionDetailsSha256: detailsSha, publicConditionDetailsBytes: details.length, ravScoreModelBinding: I,
          detailDelivery: { schemaVersion: 1, sourceDetailsSha256: detailsSha, hours } };
        const startupNationalForecast = { schemaVersion: 2, modelBinding: I,
          dates: [conditions.productionReferenceAt.slice(0, 10)], modes: { waders: [], beach: [] } };
        const packPath = path.join(HOST, '.cache/public-hour-delivery.pack');
        const pack = await (await load('scripts/lib/public-hour-delivery-pack.mjs')).buildPrivatePublicHourDeliveryPack({
          liveDirectory: PUBLIC, publicManifest, startupNationalForecast, outputPath: packPath });
        conditions.publicHourDelivery = pack.marker;
        await write(path.join(PUBLIC, 'manifest.json'), publicManifest);
        await write(path.join(PUBLIC, 'public-condition-details.json'), details);
        for (const file of ['public-conditions.json', 'coastal-parts-v2.json', 'zones.geojson', 'water-level-station-routing.json'])
          await write(path.join(PUBLIC, file), { synthetic: file, datasetId: conditions.datasetId });
      }
      async function saveNormal(conditions, bulk, partRecords, label, {publish=true}={}) {
        await publicPack(conditions);
        for (const descriptor of workflow.PRIVATE_RUNTIME_FILES) {
          if (descriptor.id === 'dmi-forecast-cache') continue;
          await write(path.join(HOST, descriptor.relativePath), descriptor.id === 'full-conditions' ? conditions
            : descriptor.id === 'dmi-bulk-cache' ? bulk : { fixtureOnly: descriptor.id });
        }
        const forecastFile = path.join(HOST, 'data/live/dmi-forecast-cache.json');
        const packed = await continuity.packDmiPartContinuity(partRecords, allParts, conditions.productionReferenceAt);
        await forecastIo.writeDmiForecastFileAtomic(forecastFile, { schemaVersion: 2, zones: {}, partContinuity: packed });
        const checkpointPath = path.join(HOST, '.cache/ravscore-continuation-checkpoint/checkpoint.json');
        await normalS.saveRavScoreContinuationCheckpoint({ repositoryRoot: HOST,
          sourcePath: path.join(HOST, 'data/live/conditions.json'), checkpointPath });
        const spec = await workflow.buildPrivateRuntimeCreateSpec({ repositoryRoot: HOST });
        assert.equal(spec.files.length, 10, 'Nine base files plus the genuine current-generation public pack only.');
        const privateRoot = path.join(RUN, label + '-private'), created = path.join(privateRoot, 'created');
        await fs.mkdir(privateRoot);
        await bundle.createPrivateProductionRuntimeBundle({ repositoryRoot: HOST, privateRoot, bundlePath: created, ...spec });
        const now = conditions.generatedAt, expected = await workflow.buildPrivateRuntimeExpectation({ repositoryRoot: HOST,
          targetReferenceAt: conditions.productionReferenceAt, now });
        if(!publish){
          // Actual normal B/S creation, but no protected parent mutation.
          const verified=await bundle.verifyPrivateProductionRuntimeBundle({repositoryRoot:HOST,privateRoot,
            bundlePath:created,expected,now});
          return {privateRoot,bundlePath:created,conditions:JSON.parse(await fs.readFile(path.join(created,'payload/data/live/conditions.json'))),
            bulk,rows:partRecords,manifest:verified.manifest,
            checkpoint:JSON.parse(await fs.readFile(checkpointPath)),remoteCheckpointPath:checkpointPath};
        }
        const B = await protectedB.publishProtectedPrivateProductionRuntime({ repositoryRoot: HOST, privateRoot, bundlePath: created,
          expected, now, sourceHead, request: backend.documentRequest, storage: backend.storage });
        const S = await protectedS.publishProtectedRavScoreContinuationCheckpoint({ checkpointPath,
          targetReference: conditions.productionReferenceAt, request: backend.documentRequest, rpcRequest: backend.checkpointRpc });
        assert.equal(B.published, true); assert.equal(S.published, true);
        const bundlePath = path.join(privateRoot, 'restored');
        assert.equal((await protectedB.restoreProtectedPrivateProductionRuntime({ repositoryRoot: HOST, privateRoot, bundlePath,
          expected, now, request: backend.documentRequest, storage: backend.storage })).restored, true);
        const payload = path.join(bundlePath, 'payload');
        for (const row of spec.files) assert.deepEqual(await fs.readFile(path.join(created, 'payload', row.relativePath)),
          await fs.readFile(path.join(payload, row.relativePath)), 'Whole restored file ' + row.relativePath);
        const remoteS = path.join(RUN, label + '-S/.cache/ravscore-continuation-checkpoint/checkpoint.json');
        assert.equal((await protectedS.restoreProtectedRavScoreContinuationCheckpoint({ checkpointPath: remoteS,
          targetReference: conditions.productionReferenceAt, request: backend.documentRequest })).restored, true);
        assert.deepEqual(JSON.parse(await fs.readFile(remoteS)), JSON.parse(await fs.readFile(checkpointPath)));
        const manifest = JSON.parse(await fs.readFile(path.join(bundlePath, 'manifest.json')));
        const checkpoint = JSON.parse(await fs.readFile(remoteS));
        const restoredForecast = await forecastIo.readDmiForecastFile(path.join(payload, 'data/live/dmi-forecast-cache.json'));
        const rows = await continuity.unpackDmiPartContinuity(restoredForecast.partContinuity, allParts, conditions.productionReferenceAt);
        assert.equal(rows.size, 673);
        for (const part of allParts) assert.deepEqual(rows.get(part.partId).hourly, partRecords.get(part.partId).hourly);
        const restoredBulk = await (await load('scripts/lib/dmi-bulk-storage.mjs')).readDmiBulkDocument(path.join(payload, 'data/live/dmi-bulk-cache.json'));
        assert.deepEqual(restoredBulk, bulk);
        await (await load('scripts/lib/public-hour-delivery-pack.mjs')).inspectPrivatePublicHourDeliveryPack({
          packPath: path.join(payload, '.cache/public-hour-delivery.pack'), conditions });
        process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT = privateRoot; process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE = bundlePath;
        return { privateRoot, bundlePath, conditions: JSON.parse(await fs.readFile(path.join(payload, 'data/live/conditions.json'))),
          bulk: restoredBulk, rows, manifest, checkpoint, remoteCheckpointPath: remoteS };
      }

      async function generation({ targetHour, generation, firstOffset, old, capInputs = null, label, h0Only=false }) {
        assert(!h0Only||completedStageAdmit,'H0 reduction is exclusive to the new consumer fixture.');
        const pairs = new Map(), results = new Map(), partRecords = new Map(), bulk = { schemaVersion: 2,
          generatedAt: at(targetHour), currentVectorSemanticsVersion: 3,
          currentVectorSelection: 'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',
          currentMaxDistanceKm: 5, timeStrideHours: 3, zones: {} };
        const oldPairs = old ? pairsFrom(old.conditions) : null;
        const oldSnapshot = oldPairs ? hash([...oldPairs]) : null;
        const offsets = Array.from({ length: ((h0Only?targetHour+3:168) - firstOffset) / 3 + 1 }, (_, i) => firstOffset + i * 3);
        let handle = capInputs?.establishedNativeCurrentOrigin ?? null;
        if (old && !capInputs) handle = await origin.readEstablishedNativeCurrentOrigin(central);
        let unknownCaptures = 0, newRunRows = 0, verifiedNativeRows = 0, actualParts = 0;
        for (const [index, part] of allParts.entries()) {
          const f = createNative(part, offsets, generation, targetHour - 1, targetHour), id = f.identity.entityId;
          bulk.zones[id] = f.document.zones[id];
          const pair = oldPairs?.get(part.partId), cold = !old || Boolean(capInputs);
          const initialSelection = cold ? { state: null, source: 'COLD_START',
            candidateGSourceDisposition: 'VALIDATED_ROLLBACK_ORACLE_REBUILT_FROM_MEASURED_HISTORY' }
            : { state: pair.integrated, source: 'EXISTING_INTEGRATED' };
          const target = at(targetHour), startAt = pipeline.ravScoreOwnerCurrentHistoryStartAt(part, initialSelection.state,
            replay.ravScoreRecoverySourceStartAt(initialSelection.state, target), { requireNativeGridSampling: true });
          const feature = { properties: { id, dataPoint: part.waterPoint } };
          const freshRecord = record.buildPrivateDmiRecoveryRecord(feature, f.document, target, { startAt, expectedIdentity: f.identity });
          const fresh = { source: 'progressive-private-dmi', nativeCurrentContexts: [f.document], record: { ...freshRecord,
            hourly: adapters.verifiedIntegratedPartHourly(freshRecord, f.document, id, part, { requireNativeGridSampling: false }) } };
          let fallback = null;
          if (old && !capInputs) {
            const priorRecord = record.buildPrivateDmiRecoveryRecord(feature, old.bulk, target, { startAt, expectedIdentity: f.identity,
              persistedHourly: old.rows.get(part.partId).hourly, protectPreviousDmi: true });
            fallback = { source: 'deployed-private-runtime', nativeCurrentContexts: [old.bulk], record: { ...priorRecord,
              hourly: protectedCurrent.verifiedProtectedDmiPartHourly(priorRecord, [old.bulk], id, part, { requireNativeGridSampling: false }) } };
          }
          // First restart consumes no pre-target history, not even newly projected old hours.
          const recoverySources = cold ? [] : priority.buildNewestValidRavScoreRecoverySources({ part, productionReferenceAt: target,
            fallbackSource: fallback, preferredSource: fresh, protectedPreviousSource: fallback });
          const forecastRows = dmi.buildDmiForecastHourly({ ocean: f.natives.map(row => ({ step: row.time,
            'current-u': row['current-u'], 'current-v': row['current-v'], provenance: row.sources })),
            generatedAt: target, startAt: target, hours: dmi.DMI_FORECAST_HOURS }).hourly;
          const cacheHourly = adapters.verifiedIntegratedPartHourly({ point: part.waterPoint, hourly: forecastRows },
            f.document, id, part, { requireNativeGridSampling: true });
          // The existing persisted DMI cache requires its complete 121-row
          // axis, including honest missing rows. Reduce only score evaluation
          // in this new consumer test, never the normal cache contract.
          const publicHourly = h0Only ? cacheHourly.slice(0, 1) : cacheHourly;
          if(h0Only){assert.equal(forecastRows.length,121);assert.equal(cacheHourly.length,121);
            assert.equal(publicHourly.length,1);assert.equal(publicHourly[0].time,target);}
          else{
          assert.equal(forecastRows.length,121);assert.equal(publicHourly.length,121);
          assert.equal(publicHourly[0].time,target);assert.equal(publicHourly.at(-1).time,at(targetHour+120));
          }
          partRecords.set(part.partId, { point: part.waterPoint, zoneId: id, hourly: cacheHourly });
          for (const source of [...recoverySources,{record:{hourly:publicHourly}}]) for (const row of source.record.hourly) {
            const proof = row.currentProvenance ?? row.sources?.current;
            if (proof?.provider !== 'dmi') continue;
            assert.equal(dmi.inspectDmiForecastGridSampling(proof, 'current', row.time, f.identity).status, 'coherent');
            verifiedNativeRows++; if (proof.modelRun === at(-100 + generation * 10)) newRunRows++;
          }
          const options = { part, zone: zoneFor(part), initialSelection,
            ...(cold ? { candidateGRollbackMeasuredColdStart: true } : {
              previousCandidateGContinuation: pair.candidate, candidateGRollbackMeasuredWarmupContinuation: true }),
            targetReferenceAt: target, recoverySources, publicHourly, requireNativeGridSampling: true,
            ...(handle ? { establishedNativeCurrentOrigin: handle } : {}) };
          if (!cold) unknownCaptures += collector(options).captures.length;
          const series = pipeline.buildRavScoreProductionPartSeries(options), actual = pairAt(series, target);
          assert(actual.integrated && actual.candidate); assert.equal(actual.integrated.time, target);
          assert(handle,'Every generation must carry a genuine opaque origin.');
          assert.deepEqual(pipeline.assertEstablishedNativeCurrentProductionResult(series,
            { originHandle: handle, part, targetReferenceAt: target,requireMeasuredColdStart:cold }), actual);
          if(h0Only){assert.equal(series.scores.length,1);assert.equal(series.candidateGRollbackScores.length,1);}
          else{
          assert.equal(series.scores.length,121);assert.equal(series.candidateGRollbackScores.length,121);
          }
          if(cold){
            assert.equal(series.recovery.replayedHourCount,0);
            assert(series.recovery.hourly.every(row=>Date.parse(row.time)>=Date.parse(target)));
            assert.deepEqual(actual.integrated.currentEvidence.map(row=>row.time),[target]);
            assert.deepEqual(actual.candidate.transportEvidence.map(row=>row.time),[target]);
            assert.equal(actual.integrated.currentMemoryReady,false);assert.equal(actual.candidate.transportMemoryReady,false);
          }
          if (!cold) assert(series.recovery.hourly.every(row => Date.parse(row.time) > Date.parse(pair.integrated.time)));
          pairs.set(part.partId, actual); actualParts++;
          // Retain these genuine brands only until the normal national finalizer;
          // never replace them with detached H0 pairs or an authored attestation.
          if (handle) results.set(part.partId, series);
          if (index % 100 === 0) console.log(JSON.stringify({ phase, parts: index + 1, targetHour }));
        }
        if (oldPairs) assert.equal(hash([...oldPairs]), oldSnapshot, 'Saved state pairs remain WHOLE unchanged.');
        assert.equal(unknownCaptures, 0); assert(newRunRows > 0); assert(verifiedNativeRows > 0);
        const conditions = conditionsFor(pairs, targetHour, label);
        if (handle) conditions.privateEstablishedNativeCurrentOrigin = await origin.buildEstablishedNativeCurrentOriginAttestation(handle,
          { centralContract: central, conditions, partResults: results });
        const metrics = { targetHour, actualParts, unknownCaptures, newRunRows, verifiedNativeRows,
          capCold: Boolean(capInputs), normalDefaultFollower: Boolean(old && !capInputs) };
        (receipt.pipelineGenerations ??= []).push({ ...metrics, normalFinalizerPassed: Boolean(handle) });
        // The enclosing normal target writes one complete retained receipt.
        results.clear(); // The branded series have completed their ONLY use.
        return { conditions, bulk, partRecords, metrics };
      }



      const assertCurrentInputSource=async()=>{
        assert.equal(git(HOST,'rev-parse','HEAD'),sourceHead);
        assert.equal(git(HOST,'diff','--name-only','HEAD','--',...sourceLeaves),'');
        for(const[file,pin]of sourcePins)assert.equal(sha(await fs.readFile(path.join(HOST,file))),pin);
      };
      const checkSavedH0=async(saved,hour,generation,prior=null)=>{
        const loaded=await normalS.loadRavScoreContinuationCheckpointForTarget({checkpointPath:saved.remoteCheckpointPath,
          targetReference:at(hour+1),repositoryRoot:HOST});
        assert.equal(loaded.loaded,true);assert.equal(loaded.continuationAvailable,true);assert.equal(loaded.reason,'checkpoint-ready');
        assert.equal(loaded.modelBundleSha256,EXPECTED.I);assert.equal(loaded.continuationStateContractSha256,EXPECTED.T);
        assert.equal(loaded.continuationReattestedFromImplementationSha256,null);assert.equal(loaded.partCount,673);
        assert.deepEqual(loaded.states,saved.checkpoint.states);
        assert.deepEqual(loaded.candidateGRollbackStates,saved.checkpoint.candidateGRollbackCompanion.states);
        const close=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-12;
        let currentNative=0,integratedFresh=0,candidateFresh=0,oldNumericRefused=0;
        for(const part of allParts){
          const row=saved.rows.get(part.partId).hourly.find(item=>item.time===at(hour));assert(row);
          const proof=row.currentProvenance??row.sources?.current;
          assert.equal(proof.modelRun,at(-100+generation*10));
          assert.equal(dmi.inspectDmiForecastGridSampling(proof,'current',row.time,adapters.dmiExpectedIdentityForPart(part)).status,'coherent');
          currentNative++;
          const actualI=saved.checkpoint.states[part.partId],actualG=saved.checkpoint.candidateGRollbackCompanion.states[part.partId];
          assert.equal(actualI.time,at(hour));assert.equal(actualG.time,at(hour));
          assert(actualI.currentEvidence.every(item=>Date.parse(item.time)>=Date.parse(at(9))));
          assert(actualG.transportEvidence.every(item=>Date.parse(item.time)>=Date.parse(at(9))));
          const evidenceI=actualI.currentEvidence.find(item=>item.time===at(hour));
          const evidenceG=actualG.transportEvidence.find(item=>item.time===at(hour));assert(evidenceI&&evidenceG);
          const freshI=supply.currentSupplyStrength(row.currentCoastNormalSpeedMps);
          const freshG=transport.deriveCurrentTransportEvidence({time:row.time,currentSpeedMps:row.currentSpeedMps,
            currentAlignment:Math.cos((row.currentDirectionDeg-part.onshoreDirectionDeg)*Math.PI/180),currentVerified:true}).strength;
          assert(close(evidenceI.strength,freshI));integratedFresh++;
          assert(close(evidenceG.strength,freshG));candidateFresh++;
          if(prior){
            const oldRow=prior.rows.get(part.partId).hourly.find(item=>item.time===at(hour));assert(oldRow);
            const oldI=supply.currentSupplyStrength(oldRow.currentCoastNormalSpeedMps);
            const oldG=transport.deriveCurrentTransportEvidence({time:row.time,currentSpeedMps:oldRow.currentSpeedMps,
              currentAlignment:Math.cos((oldRow.currentDirectionDeg-part.onshoreDirectionDeg)*Math.PI/180),currentVerified:true}).strength;
            assert(!close(evidenceI.strength,oldI));assert(!close(evidenceG.strength,oldG));oldNumericRefused++;
          }
        }
        assert.equal(currentNative,673);assert.equal(integratedFresh,673);assert.equal(candidateFresh,673);
        if(prior)assert.equal(oldNumericRefused,673);
        (receipt.savedH0Readbacks??=[]).push({hour,currentNative,integratedFresh,candidateFresh,oldNumericRefused,
          checkpointSha256:sha(await fs.readFile(saved.remoteCheckpointPath))});
      };
      if(completedStageAdmit){
        // This explicit fixture exercises the actual consumer. The fixed Date
        // is Node's test-owned clock, not a product clock/callback parameter.
        // Existing default/national targets do not enter this branch.
        phase='ACTUAL_ADMIT_GENUINE_673_H0_PARENT';
        const cold=await generation({targetHour:9,generation:0,firstOffset:9,
          capInputs:selected,label:'admit-parent',h0Only:true});
        assert.equal(cold.conditions.privateEstablishedNativeCurrentOrigin.transition,'ARCHIVE_ISOLATED_MEASURED_COLD');
        const saved=await saveNormal(cold.conditions,cold.bulk,cold.partRecords,'admit-parent');
        const parentConditionsBytes=await fs.readFile(path.join(saved.bundlePath,'payload/data/live/conditions.json'));
        const parentPointer=clone(backend.documents.get('ravscore-private-production-runtime-pointer'));
        const parentCentral=clone(backend.documents.get('ravscore-continuation-checkpoint'));
        phase='ACTUAL_ADMIT_GENUINE_673_H0_CHILD';
        // generation() itself invokes the real lexical origin reader for old.
        const child=await generation({targetHour:12,generation:1,firstOffset:9,
          old:saved,label:'admit-child',h0Only:true});
        assert.equal(child.conditions.privateEstablishedNativeCurrentOrigin.transition,'NORMAL_STRICT_CONTINUATION');
        assert.equal(child.conditions.privateEstablishedNativeCurrentOrigin.parent.bundleContentSha256,
          saved.manifest.bundleContentSha256);
        assert.equal(child.conditions.privateEstablishedNativeCurrentOrigin.parent.generationSha256,
          saved.checkpoint.generationSha256);
        const unpublished=await saveNormal(child.conditions,child.bulk,child.partRecords,'admit-child',{publish:false});
        assert.deepEqual(backend.documents.get('ravscore-private-production-runtime-pointer'),parentPointer);
        assert.deepEqual(backend.documents.get('ravscore-continuation-checkpoint'),parentCentral);
        const identity={repository:'synthetic-owner/RavRadar',runId:'87654321',runAttempt:'1',sourceHead};
        const expected=await workflow.buildPrivateRuntimeExpectation({repositoryRoot:HOST,
          targetReferenceAt:at(12)});
        const secret='SYNTHETIC_ONLY_NOT_A_SERVICE_CREDENTIAL_ORDINARY_STAGE_123456';
        const staged=await load('scripts/staged-private-production-runtime.mjs');
        const cipherPath=path.join(work,'ordinary-original-sealed.bin');
        await staged.sealStagedPrivateProductionRuntime({...identity,repositoryRoot:HOST,
          privateRoot:unpublished.privateRoot,bundlePath:unpublished.bundlePath,expected,
          outputPath:cipherPath,masterSecret:secret});
        const originalCipher=await fs.readFile(cipherPath),zipPath=path.join(work,'ordinary-original-artifact.zip');
        // The actual stdlib writer makes one stored sealed.bin; the product's
        // existing Python extractor and GCM opener must authenticate it later.
        execFileSync(process.env.PYTHON||'python',['-c',
          'import pathlib,stat,sys,zipfile\ns=pathlib.Path(sys.argv[1]);o=pathlib.Path(sys.argv[2]);i=zipfile.ZipInfo("sealed.bin");i.create_system=3;i.external_attr=(stat.S_IFREG|0o600)<<16\nwith zipfile.ZipFile(o,"x",compression=zipfile.ZIP_STORED,allowZip64=True) as z:z.writestr(i,s.read_bytes())',
          cipherPath,zipPath],{timeout:30000,maxBuffer:4096,windowsHide:true});
        const zip=await fs.readFile(zipPath);
        const minute=n=>new Date(Date.parse(at(13))+n*60000).toISOString();
        const run={id:Number(identity.runId),run_attempt:1,repository:{id:123,full_name:identity.repository},
          head_repository:{id:123,full_name:identity.repository},path:'.github/workflows/run-current-weather-once.yml',
          event:'workflow_dispatch',head_branch:'main',head_sha:sourceHead,status:'completed',conclusion:'failure',
          run_started_at:at(12),updated_at:minute(20)};
        const stepNames=['Update central weather cache','Build private production runtime bundle specification',
          'Create the next private production runtime bundle atomically',
          'Encrypt exact completed private build for late-failure recovery',
          'Save only encrypted completed private build for one day'];
        const job={id:456,run_id:run.id,run_attempt:1,head_sha:sourceHead,head_branch:'main',
          name:'Build and prepare weather production through reusable workflow / build-and-prepare',
          status:'completed',conclusion:'failure',started_at:minute(0),completed_at:minute(19),
          steps:stepNames.map((name,index)=>({name,number:index+10,status:'completed',conclusion:'success',
            started_at:minute(index*2),completed_at:minute(index*2+1)}))};
        const artifact={id:789,name:`ravradar-private-build-stage-${identity.runId}-1`,expired:false,
          size_in_bytes:zip.length,digest:'sha256:'+sha(zip),workflow_run:{id:run.id,repository_id:123,
            head_repository_id:123,head_sha:sourceHead,head_branch:'main'},created_at:minute(8),
          updated_at:minute(9),expires_at:at(39)};
        const base=`https://api.github.com/repos/${identity.repository}`;
        const metadata=new Map([
          [`${base}/actions/runs/${identity.runId}/attempts/1`,run],
          [`${base}/actions/runs/${identity.runId}/attempts/1/jobs?per_page=100`,{total_count:1,jobs:[job]}],
          [`${base}/actions/runs/${identity.runId}/artifacts?per_page=100`,{total_count:1,artifacts:[artifact]}],
        ]);
        const runner=path.join(work,'ordinary-stage-runner');await fs.mkdir(runner);
        await write(path.join(runner,'ordinary-completed-stage-source.json'),completedStageSourceComparison);
        await write(path.join(HOST,'.cache/private-production-runtime-expected.json'),expected);
        // Operational readback is synthetic input, not origin authority. The
        // immutable B/S and lexical reader below authenticate the actual H0.
        await write(path.join(runner,'completed-runtime-active-source.json'),{
          model:'integrated',status:'INTEGRATED_ACTIVE',pending:false,calibrationEligible:false,
          datasetId:saved.conditions.datasetId,productionReferenceAt:saved.conditions.productionReferenceAt});
        const restoredParent=path.join(saved.privateRoot,'ordinary-parent-install');
        await bundle.restorePrivateProductionRuntimeBundle({privateRoot:saved.privateRoot,
          bundlePath:saved.bundlePath,outputPath:restoredParent,repositoryRoot:HOST,expected,
          targetReferenceAt:saved.conditions.productionReferenceAt,
          minimumReferenceAt:expected.minimumReferenceAt,minimumGeneratedAt:expected.minimumGeneratedAt});
        await workflow.installRestoredPrivateRuntime({restoredRoot:restoredParent,repositoryRoot:HOST});
        await fs.copyFile(saved.remoteCheckpointPath,path.join(HOST,'.cache/ravscore-continuation-checkpoint/checkpoint.json'));
        assert.deepEqual(await fs.readFile(path.join(HOST,'data/live/conditions.json')),parentConditionsBytes);
        process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT=saved.privateRoot;
        process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE=saved.bundlePath;
        const env={...process.env,GITHUB_WORKSPACE:HOST,RUNNER_TEMP:runner,GITHUB_SHA:sourceHead,
          GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',
          GITHUB_REPOSITORY:identity.repository,GH_TOKEN:'synthetic-api-token',
          COMPLETED_STAGE_SOURCE:`${identity.runId}-1-${sourceHead}`,COMPLETED_PRIVATE_RUNTIME:'true',
          RAVRADAR_PRODUCTION_TARGET_HOUR:at(12).replace('.000Z','Z'),CHECKPOINT_TARGET_HOUR:'',
          QUICK_PROGRESS_SOURCE:'',STAGED_PRIVATE_BUILD_MASTER_SECRET:secret,
          ...Object.fromEntries(['QUICK_CONFIRMATION','CHECKPOINT_ONLY','EPOCH_BOOTSTRAP','EPOCH_REENTRY',
            'NATIVE_IDENTITY_RECOVERY','EXTENDED_PROVIDER_BOOTSTRAP','PRODUCE_HANDOFF','CURRENT_FAMILY_COLD_START']
            .map(name=>[name,'false']))};
        const admission=await load('scripts/ordinary-completed-stage-admission.mjs');
        const completed=await load('scripts/completed-private-runtime-admission.mjs');
        const parentPin=await completed.readCompletedPrivateRuntimePin(backend.documentRequest);
        env.COMPLETED_PRIVATE_RUNTIME_PIN=parentPin.pin;
        const fixedReaderFetch=globalThis.fetch,artifactCalls=[];
        const fixtureFetch=async(input,options={})=>{
          const url=typeof input==='string'||input instanceof URL?String(input):input.url;
          if(!url.startsWith(base+'/'))return fixedReaderFetch(input,options);
          artifactCalls.push(url);assert(artifactCalls.length<=4,'One actual artifact read only.');
          assert.equal(options.redirect,'manual');assert(options.signal instanceof AbortSignal);
          assert.equal(new Headers(options.headers).get('authorization'),'Bearer '+env.GH_TOKEN);
          if(metadata.has(url))return new Response(JSON.stringify(metadata.get(url)),{status:200});
          assert.equal(url,`${base}/actions/artifacts/789/zip`,'No new transport endpoint.');
          return new Response(zip,{status:200,headers:{'content-length':String(zip.length)}});
        };
        globalThis.fetch=fixtureFetch;
        let admitted;
        try{
          phase='ACTUAL_ADMIT_DIRECT_PARENT_REFUSAL';
          await assert.rejects(admission.admitOrdinaryCompletedStage({...env,COMPLETED_PRIVATE_RUNTIME_PIN:'0'.repeat(64)}),
            {code:'ORDINARY_STAGE_PARENT_POINTER_CHANGED'});
          assert.equal(artifactCalls.length,0);
          phase='ACTUAL_ADMIT_REAL_LEXICAL_ORIGIN_REFUSAL';
          const missing=clone(saved.conditions);delete missing.privateEstablishedNativeCurrentOrigin;
          try{
            await fs.writeFile(path.join(HOST,'data/live/conditions.json'),JSON.stringify(missing)+'\n');
            await assert.rejects(admission.admitOrdinaryCompletedStage(env),
              {code:'ESTABLISHED_CURRENT_ORIGIN_WORKING_ATTESTATION_CHANGED'});
          }finally{await fs.writeFile(path.join(HOST,'data/live/conditions.json'),parentConditionsBytes);}
          assert.equal(artifactCalls.length,0,'The real lexical origin refusal precedes artifact retrieval.');
          phase='ACTUAL_ADMIT_GENUINE_LEXICAL_ORIGIN_POSITIVE';
          admitted=await admission.admitOrdinaryCompletedStage(env);
        }finally{
          assert.equal(globalThis.fetch,fixtureFetch);globalThis.fetch=fixedReaderFetch;
        }
        assert.equal(artifactCalls.length,4);
        assert.equal(admitted.kind,'ORDINARY_UNPUBLISHED_COMPLETED_STAGE_ADMISSION');
        assert.equal(admitted.providerRequestsPerformed,false);assert.equal(admitted.scoringPerformed,false);
        assert.equal(admitted.bundleContentSha256,unpublished.manifest.bundleContentSha256);
        assert.deepEqual(admitted.originalIdentity,identity);
        assert.equal(admitted.parentPin,parentPin.pin);
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(HOST,'data/live/conditions.json'))),unpublished.conditions);
        assert.deepEqual(JSON.parse(await fs.readFile(path.join(HOST,'.cache/ravscore-continuation-checkpoint/checkpoint.json'))),
          unpublished.checkpoint,'Actual admission used the unchanged normal S builder on the exact child.');
        assert.deepEqual(backend.documents.get('ravscore-private-production-runtime-pointer'),parentPointer);
        assert.deepEqual(backend.documents.get('ravscore-continuation-checkpoint'),parentCentral);
        assert.deepEqual(await fs.readFile(admitted.sealedPath),originalCipher);
        assert.equal(sha(await fs.readFile(cipherPath)),sha(originalCipher));
        await assertCurrentInputSource();
        for(const[file,pin]of originals)assert.equal(sha(await fs.readFile(file)),pin);
        for(const[name,pin]of archivedObjects){assert(backend.objects.has(name));assert.equal(sha(backend.objects.get(name)),pin);}
        receipt.actualAdmit={result:'PASS',actualLexicalOriginReader:true,originStub:false,
          authoredPositiveAttestation:false,parentParts:673,childParts:673,scoreRowsPerPart:1,
          genuineGenerations:2,directDenials:2,artifactTransportCalls:artifactCalls.length,
          externalNetworkRequests:0,productionProof:false,protectedBSPublishedByAdmission:false,
          originalCipherUnchanged:true,admissionPerformedScoring:false,admissionPerformedProviderRequest:false,
          parentB:saved.manifest.bundleContentSha256,parentS:saved.checkpoint.generationSha256,
          childB:admitted.bundleContentSha256,childS:admitted.checkpointSha256};
        // Only the synthetic test-owned artifact copy is retired. The fixture's
        // original ciphertext, parent B/S, child B and receipt are retained.
        const downloaded=path.dirname(admitted.sealedPath),temporaryRoot=await fs.realpath(os.tmpdir());
        const stat=await fs.lstat(downloaded);assert.equal(path.dirname(downloaded),temporaryRoot);
        assert(path.basename(downloaded).startsWith('rr-ordinary-completed-stage-'));
        assert(stat.isDirectory()&&!stat.isSymbolicLink());await fs.rm(downloaded,{recursive:true,force:false});
      }else{
      const clockCheckedAt=new Date().toISOString();
      for(const hour of[9,28,41])for(const value of[at(hour),at(hour+1)])assert(Date.parse(value)<=Date.parse(clockCheckedAt));
      receipt.national={requested:true,sourceHead,sourceCleanWaiver:false,modelRetag:false,originStub:false,
        seedOrInitialAttestationAuthored:false,targetHours:[9,28,41],forecastHoursPerPart:121,oneoffOnlyFirst:true,
        sourceOnlySynthetic:true,publicShards:'MINIMAL_SYNTHETIC_METADATA',sqlExecuted:false,clockCheckedAt};
      for(const key of Object.keys(process.env))assert(!/^RAVRADAR_.*(?:COLD_START|ARCHIVED_WEATHER_RESTART).*CONTEXT/.test(key),
        'No ambient one-off context may enter this normal in-process fixture.');
      phase='NEW584_673_COLD_121_FINALIZER';
      const cold=await generation({targetHour:9,generation:0,firstOffset:9,capInputs:selected,label:'cold'});
      assert.equal(cold.conditions.privateEstablishedNativeCurrentOrigin.transition,'ARCHIVE_ISOLATED_MEASURED_COLD');
      assert.equal(cold.conditions.privateEstablishedNativeCurrentOrigin.kind,'PRIVATE_ARCHIVE_ISOLATED_NATIVE_CURRENT_ORIGIN');
      phase='NEW584_COLD_B_THEN_S_RESTORE';
      let saved=await saveNormal(cold.conditions,cold.bulk,cold.partRecords,'cold');
      receipt.generations=[{...cold.metrics,B:saved.manifest.bundleContentSha256,S:saved.checkpoint.generationSha256}];
      await checkSavedH0(saved,9,0);await assertCurrentInputSource();
      // No prepare/createArchived... call or one-off context is used below.
      // Each follower independently reads the just-saved genuine normal origin.
      for(const[hour,generationNumber,firstOffset]of[[28,1,12],[41,2,27]]){
        phase='ORDINARY_FOLLOWER_'+hour;
        const prior=saved,priorSha=hash(prior.conditions);
        const next=await generation({targetHour:hour,generation:generationNumber,firstOffset,old:prior,label:'follow-'+hour});
        assert.equal(hash(prior.conditions),priorSha);
        assert.equal(next.conditions.privateEstablishedNativeCurrentOrigin.transition,'NORMAL_STRICT_CONTINUATION');
        assert.equal(next.conditions.privateEstablishedNativeCurrentOrigin.parent.attestationSha256,
          prior.conditions.privateEstablishedNativeCurrentOrigin.attestationSha256);
        saved=await saveNormal(next.conditions,next.bulk,next.partRecords,'follow-'+hour);
        receipt.generations.push({...next.metrics,B:saved.manifest.bundleContentSha256,S:saved.checkpoint.generationSha256});
        await checkSavedH0(saved,hour,generationNumber,prior);await assertCurrentInputSource();
      }
      phase='ARCHIVE_AND_SOURCE_WHOLE_PRESERVATION';
      for(const[file,pin]of originals)assert.equal(sha(await fs.readFile(file)),pin);
      for(const[name,pin]of archivedObjects){assert(backend.objects.has(name));assert.equal(sha(backend.objects.get(name)),pin);}
      assert.equal(archiveModule.assertVerifiedUnpairedWeatherRestartArchive(archive),facts);
      assert.equal(receipt.generations.length,3);
      assert.equal(receipt.generations.filter(row=>row.normalDefaultFollower).length,2);
      assert.equal(receipt.savedH0Readbacks.length,3);
      receipt.full673Cold=true;receipt.full121Forecast=true;receipt.ordinaryFollowers=2;
      receipt.national.result='PASS';receipt.national.originalArchivePreserved=true;
      receipt.national.modelBoundSourceUnchanged=true;receipt.national.wholeCliProviderOrProductionProof=false;
      }
    }
    receipt.result='PASS';receipt.phase=receipt.actualAdmit?.result==='PASS'?'ACTUAL_GENUINE_ORDINARY_STAGE_ADMISSION_COMPLETE':receipt.national?.result==='PASS'?'NATIONAL_COLD_AND_TWO_ORDINARY_FOLLOWERS_COMPLETE':'OPAQUE_ORIGIN_MINTED_NO_OLD_PAIR_ADMISSION';
    receipt.archiveId=facts.archiveId;receipt.sourceLeavesUnchanged=true;
  }catch(error){receipt.result='FAIL';receipt.phase=phase;receipt.firstError={name:error.name,code:error.code??null,message:error.message,stack:error.stack};throw error;}
  finally{
    if(restoreTransport)restoreTransport();else globalThis.fetch=originalFetch;
    for(const key of Object.keys(process.env))if(!Object.hasOwn(originalEnv,key))delete process.env[key];Object.assign(process.env,originalEnv);
    const actual=await fs.lstat(work,{bigint:true});assert(actual.isDirectory()&&!actual.isSymbolicLink());
    assert.equal(actual.dev,workIdentity.dev);assert.equal(actual.ino,workIdentity.ino);assert.equal(await fs.realpath(work),work);
    receipt.runtime={node:process.version,argv:process.execArgv,cpu:process.cpuUsage(),resourceUsage:process.resourceUsage(),memory:process.memoryUsage()};
    await write(path.join(work,'receipt.json'),receipt);
    t.diagnostic(receipt.actualAdmit?.result==='PASS'?'Owned genuine673-H0 parent/child actual-admit receipt retained; not provider,SQL or production proof.':receipt.national?.result==='PASS'?'Owned synthetic673x121 restart/two-follower receipt retained; not provider,SQL or production proof.':'Owned synthetic authority receipt retained; explicit --national full chain remains separate.');
  }
});
