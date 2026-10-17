// Focused normal-producer673 integration regression. Controlled test transports
// is NOT hosted authentication, provider data, SQL installation or public proof.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runInNewContext} from 'node:vm';
import {verifyCurrentMemoryWarmupPrewritePreservation} from './current-memory-warmup-prewrite.mjs';
import {migratePostCutoverPrivateRuntime} from './migrate-post-cutover-private-runtime.mjs';
import {withCurrentMemoryWarmupPredecessorSource} from './check-current-memory-warmup-predecessor-source.mjs';
import {prepareCurrentMemoryWarmupRuntimeTransition,restoreAndPrepareCurrentMemoryWarmupRuntimeTransition,assertCurrentMemoryWarmupRuntimeTransitionPrepared}
  from './current-memory-warmup-runtime-transition.mjs';
import {loadRavScoreContinuationCheckpointForTarget} from './ravscore-continuation-checkpoint.mjs';
import {CURRENT_MEMORY_WARMUP_BEFORE as OLD,requireCurrentMemoryWarmupBinding} from './lib/current-memory-warmup-successor-source.mjs';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const clone=structuredClone;

// Reuse the genuine 673 producer/B/S above. Only remote transports and runner
// loss are controlled; every bundle/CAS/restore operation uses its normal API.
async function assertPublicationStops({temporary,token,archive,pointer,oldCheckpoint,frozenRoot,bundleManifestPath,reference,generatedAt}){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const [bundle,protectedB,normalS,protectedS,workflow,model]=await Promise.all([
    import('./private-production-runtime-bundle.mjs'),import('./protected-private-production-runtime.mjs'),
    import('./ravscore-continuation-checkpoint.mjs'),import('./protected-ravscore-continuation-checkpoint.mjs'),
    import('./private-production-runtime-workflow.mjs'),import('../js/core/ravscore-model-contract.js')]);
  const next=requireCurrentMemoryWarmupBinding(),binding=model.ravScoreModelBinding(),contracts=await workflow.privateRuntimeContractHashes();
  const predecessorManifest=JSON.parse(await fs.readFile(bundleManifestPath,'utf8'));
  const bundlePath=path.join(temporary,'publication-bundle');
  const built=await bundle.createPrivateProductionRuntimeBundle({privateRoot:temporary,bundlePath,repositoryRoot:root,
    metadata:{datasetId:oldCheckpoint.datasetId,generationId:predecessorManifest.generationId,productionReferenceAt:reference,
      generatedAt,zoneCount:210,partCount:673,modelBinding:binding,contractHashes:contracts,privacyClass:'PRIVATE_PRODUCTION_RUNTIME'},
    files:workflow.PRIVATE_RUNTIME_FILES.map(x=>({...x,sourcePath:path.join(token.outputRoot,x.relativePath),privacyClass:'PRIVATE_PRODUCTION_RUNTIME'}))});
  const expected={modelBinding:binding,contractHashes:contracts,datasetId:oldCheckpoint.datasetId,
    productionReferenceAt:reference,bundleContentSha256:built.bundleContentSha256,
    targetReferenceAt:reference,minimumReferenceAt:reference,minimumGeneratedAt:generatedAt};
  const evidence={predecessorManifest,
    migrationReport:JSON.parse(await fs.readFile(token.normalBReportPath,'utf8'))};
  const source=(await fs.readFile(new URL('../.github/workflows/deploy-code-only-repair.yml',import.meta.url),'utf8')).replace(/\r\n?/g,'\n');
  const matches=[...source.matchAll(/^      - name: ([^\n]+)\n/gm)];
  const steps=matches.map((m,i)=>({name:m[1],text:source.slice(m.index,matches[i+1]?.index??source.length)}))
    .filter(s=>s.name==='Publish current bounded private runtime'||/id: (?:checkpoint-publish|current-memory-warmup-checkpoint-publish)\n/.test(s.text));
  function selected(warmup){return steps.filter(s=>{const condition=/^        if: (.+)$/m.exec(s.text)?.[1];if(!condition)return true;
    return runInNewContext(condition.replace(/steps\.([a-z0-9-]+)\./g,(_,id)=>'steps['+JSON.stringify(id)+'].'),
      {env:{RAVRADAR_CURRENT_MEMORY_WARMUP_EDGE_REQUIRED:warmup?'true':'false'},
        steps:{'checkpoint-disposition':{outputs:{disposition:'MEASURED_WARMUP_PUBLISHED'}}}},{timeout:1000});});}
  assert.deepEqual(selected(false).map(s=>s.name),['Publish measured continuation checkpoint without promoting rollback readiness',
    'Publish current bounded private runtime'],'Other code-only routes retain their original S-before-B order');
  assert.deepEqual(selected(true).map(s=>s.name),['Publish current bounded private runtime',
    'Publish measured continuation only after verified warmup private runtime']);
  const outcome=/--arg checkpointPublishOutcome "\$\{\{ (.+?) \}\}"/.exec(source)?.[1];assert(outcome);
  for(const warmup of [true,false])assert.equal(runInNewContext(outcome.replace(/steps\.([a-z0-9-]+)\./g,(_,id)=>'steps['+JSON.stringify(id)+'].'),
    {env:{RAVRADAR_CURRENT_MEMORY_WARMUP_EDGE_REQUIRED:warmup?'true':'false'},steps:{'checkpoint-publish':{outcome:'success'},
      'current-memory-warmup-checkpoint-publish':{outcome:'skipped'}}},{timeout:1000}),warmup?'skipped':'success',
    'Handoff reports the actual selected publication outcome; skipped is not a success fallback');
  const current=JSON.parse(await fs.readFile(token.checkpointPath,'utf8'));
  const loaded=await normalS.loadRavScoreContinuationCheckpointForTarget({checkpointPath:token.checkpointPath,targetReference:reference});
  for(const failure of ['before-b','after-b','lost-b-response']){
    let row=clone(pointer),remoteS=clone(oldCheckpoint),sVersion=1,bWrites=0,sWrites=0,lose=failure==='lost-b-response';
    const events=[],objects=new Map(archive.objects.map(x=>[x.descriptor.objectPath,Buffer.from(x.bytes)]));
    const request=async(suffix,options={})=>{const method=options.method??'GET';if(method==='GET')return[clone(row)];
      assert.equal(method,'PATCH');assert.equal(Number(/version=eq\.(\d+)/.exec(suffix)?.[1]),row.version);
      row={...row,version:row.version+1,payload:JSON.parse(options.body).payload};bWrites++;events.push('B_CAS');
      if(lose){lose=false;throw Error('CONTROLLED_LOST_COMMITTED_B_RESPONSE');}return[clone(row)];};
    const storage={ensurePrivateBucket:async()=>true,uploadImmutable:async(key,bytes)=>{
      if(failure==='before-b')throw Error('CONTROLLED_B_UPLOAD_STOP');
      if(objects.has(key)){assert.deepEqual(objects.get(key),bytes);return{created:false,alreadyExists:true};}
      objects.set(key,Buffer.from(bytes));return{created:true};},
      download:async key=>{assert(objects.has(key));return Buffer.from(objects.get(key));},
      removeExact:async key=>{assert(!archive.objects.some(x=>x.descriptor.objectPath===key),'Never delete an original object');objects.delete(key);},
      anonymousStatus:async()=>403};
    const checkpointRequest=async suffix=>suffix.includes('select=document_key,version&')
      ?[{document_key:'ravscore-continuation-checkpoint',version:sVersion}]
      :[{document_key:'ravscore-continuation-checkpoint',version:sVersion,payload:clone(remoteS)}];
    const publishS=async checkpointPath=>protectedS.publishProtectedRavScoreContinuationCheckpoint({checkpointPath,targetReference:reference,
      request:checkpointRequest,rpcRequest:async body=>{
        assert.equal(row.payload.current.modelBinding.modelBundleSha256,next.I,'S CAS must follow verified new B');
        assert(events.includes('B_VERIFIED'),'A B write without successful normal readback is not enough');
        assert.equal(body.p_expected_version,sVersion);assert.deepEqual(body.p_payload,current);
        remoteS=clone(body.p_payload);sVersion++;sWrites++;events.push('S_CAS');
        return{schemaVersion:'1.0.0',documentKey:'ravscore-continuation-checkpoint',disposition:'updated',centralVersion:sVersion,
          productionReferenceAt:reference,partCount:673,candidatePartCount:673,modelId:loaded.modelId,stateSchemaVersion:loaded.stateSchemaVersion,
          modelContractSha256:loaded.modelContractSha256,modelBundleSha256:loaded.modelBundleSha256,generationSha256:loaded.generationSha256};}});
    async function execute(){for(const step of selected(true)){
      if(step.name==='Publish current bounded private runtime'){
        assert(step.text.includes('node scripts/protected-private-production-runtime.mjs --publish'));
        await protectedB.publishProtectedPrivateProductionRuntime({privateRoot:temporary,bundlePath,repositoryRoot:root,expected,
          now:generatedAt,sourceHead:'b'.repeat(40),sameReferenceSuccessorEvidence:evidence,request,storage});
        events.push('B_VERIFIED');if(failure==='after-b')throw Error('CONTROLLED_RUNNER_LOSS_AFTER_B');
      }else{assert(step.text.includes('node scripts/protected-ravscore-continuation-checkpoint.mjs'));
        await publishS(token.checkpointPath);}
    }}
    if(failure==='before-b'){
      await assert.rejects(execute(),/CONTROLLED_B_UPLOAD_STOP/);assert.deepEqual(row,pointer);assert.deepEqual(remoteS,oldCheckpoint);assert.equal(sWrites,0);
      const oldB=await import(pathToFileURL(path.join(frozenRoot,'scripts/protected-private-production-runtime.mjs')).href);
      await fs.mkdir(path.join(temporary,'publication-old-restore'));
      const restored=await oldB.restoreProtectedPrivateProductionRuntime({privateRoot:path.join(temporary,'publication-old-restore'),
        bundlePath:path.join(temporary,'publication-old-restore/bundle'),repositoryRoot:frozenRoot,
        expected:{modelBinding:pointer.payload.current.modelBinding,contractHashes:pointer.payload.current.contractHashes,
          datasetId:oldCheckpoint.datasetId,productionReferenceAt:reference,bundleContentSha256:archive.descriptor.bundleContentSha256,
          targetReferenceAt:reference,minimumReferenceAt:reference,minimumGeneratedAt:generatedAt},request,storage,now:generatedAt});
      assert.equal(restored.restored,true);assert.equal(restored.rollbackSelected,false);
    }else{
      if(failure==='after-b'){await assert.rejects(execute(),/CONTROLLED_RUNNER_LOSS_AFTER_B/);assert.deepEqual(remoteS,oldCheckpoint);assert.equal(sWrites,0);}
      else await execute();
      assert.equal(bWrites,1,'Unknown committed outcome is read back, never blindly written again');
      const privateRoot=path.join(temporary,'publication-current-'+failure),restoredBundle=path.join(privateRoot,'bundle');
      await fs.mkdir(privateRoot);
      const restored=await protectedB.restoreProtectedPrivateProductionRuntime({privateRoot,bundlePath:restoredBundle,repositoryRoot:root,
        expected,request,storage,now:generatedAt});assert.equal(restored.restored,true);assert.equal(restored.rollbackSelected,false);
      const restoredRoot=path.join(privateRoot,'restored');
      await bundle.restorePrivateProductionRuntimeBundle({privateRoot,bundlePath:restoredBundle,repositoryRoot:root,expected,outputPath:restoredRoot,
        targetReferenceAt:reference,minimumReferenceAt:reference,minimumGeneratedAt:generatedAt,now:generatedAt});
      const retryCheckpoint=path.join(privateRoot,'.cache/ravscore-continuation-checkpoint/checkpoint.json');
      await normalS.saveRavScoreContinuationCheckpoint({sourcePath:path.join(restoredRoot,'data/live/conditions.json'),checkpointPath:retryCheckpoint});
      assert.deepEqual(JSON.parse(await fs.readFile(retryCheckpoint,'utf8')),current,'Normal current restore reproduces exact new S without old-S bridge');
      if(failure==='after-b')await publishS(retryCheckpoint);
      assert.equal(sWrites,1);assert(events.indexOf('B_CAS')<events.indexOf('B_VERIFIED')&&events.indexOf('B_VERIFIED')<events.indexOf('S_CAS'));
      assert.deepEqual(remoteS,current);
    }
    for(const original of archive.objects)assert.deepEqual(objects.get(original.descriptor.objectPath),original.bytes,'Original archive remains exact');
  }
  console.log('PUBLICATION_STOPS_PASS: normal673 B/S calls preserve before-B originals, restore current B after runner loss, and recover unknown B CAS without repeat.');
}

test('current-memory-warmup genuine native0600 673 producer→old normal S/B validators→metadata-only B→new normal S; same/newer/invalid original',async()=>{
  const parent=await fs.realpath(os.tmpdir()),prefix='rr-current-memory-warmup-regression-';
  const temporary=await fs.realpath(await fs.mkdtemp(path.join(parent,prefix)));
  const owned=await fs.lstat(temporary,{bigint:true}),owner=[owned.dev,owned.ino,owned.birthtimeNs];
  try{
    await withCurrentMemoryWarmupPredecessorSource(async frozenRoot=>{
      const load=p=>import(pathToFileURL(path.join(frozenRoot,p)).href);
      const [pipeline,candidate,stage,model,cbModel,profile,candidateProfile,evidence,workflow,bundle,oldS,protectedB]=await Promise.all([
        load('js/core/ravscore-integrated-state-pipeline.js'),load('js/core/ravscore-candidate-g-state-pipeline.js'),
        load('scripts/lib/coastal-point-staging-contract.mjs'),load('js/core/ravscore-model-contract.js'),load('scripts/rollback-assets/ravscore-model-contract.js'),
        load('js/core/ravscore-public-model.js'),load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'),load('js/core/ravscore-evidence-trust-contract.js'),
        load('scripts/private-production-runtime-workflow.mjs'),load('scripts/private-production-runtime-bundle.mjs'),load('scripts/ravscore-continuation-checkpoint.mjs'),
        load('scripts/protected-private-production-runtime.mjs')]);
      const ib=model.ravScoreModelBinding(),cb=cbModel.ravScoreModelBinding();
      assert.equal(ib.modelBundleSha256,OLD.integrated);assert.equal(cb.modelBundleSha256,OLD.candidate);
      const reference='2026-10-16T10:00:00.000Z',generatedAt='2026-10-16T10:05:00.000Z';
      const parts={},candidateParts={},zones={},scoreZones={};let count=0;
      for(let z=0;z<210;z++){
        const zoneId='CONTROLLED-NATIVE0600-'+z,n=z<43?4:3;
        zones[zoneId]={forecast:{provider:'CONTROLLED_TEST_ONLY',generatedAt,hourly:[]}};
        scoreZones[zoneId]={expectedPartCount:n,scoredPartCount:n,currentReferenceAt:reference,hourly:[]};
        for(let p=0;p<n;p++){
          count++;const id=zoneId+'::PART-'+p;
          const part={partId:id,zoneId,name:'Controlled '+count,waterPoint:[8,55],landPoint:[8.01,55],
            onshoreDirectionDeg:90,onshoreDirectionSource:'landPoint',marineCoverage:'controlled',current:null,hourly:[]};
          const identity=stage.coastalPointStageIdentity(part);
          const samples=Array.from({length:49},(_,h)=>({time:new Date(Date.parse(reference)-(48-h)*3600000).toISOString(),
            currentSpeedMps:0.054,currentAlignment:1,currentVerified:true,waveHeightM:1,wavePeriodS:6,waveDirectionDeg:270}));
          const state=pipeline.buildIntegratedRavScoreStateSeries(samples,{samplingContextKey:identity.samplingContextKey,onshoreDirectionDeg:90}).continuationState;
          const companion=candidate.buildCandidateGDerivedStateSeries(samples,{stateKey:identity.expectedCandidateGStateKey}).continuationState;
          stage.assertIntegratedCoastalPointContinuation(state,{samplingContextKey:identity.samplingContextKey});
          stage.assertCandidateGCoastalPointRollbackContinuation(companion,identity.expectedCandidateGStateKey);
          parts[id]={...part,ravScoreModel:{...ib,currentState:state,modes:{}}};
          candidateParts[id]={...part,ravScoreModel:{...cb,currentState:companion,modes:{}}};
        }
      }
      assert.equal(count,673);
      const conditions={datasetId:'rr-current-memory-warmup-controlled',generatedAt,productionReferenceAt:reference,zones,
        coastalParts:{schemaVersion:1,enabled:true,generatedAt,expectedPartCount:673,scoredPartCount:673,marginPoints:7,
          modelBinding:ib,evidenceTrust:evidence.ravScoreVerifiedEvidenceTrust(),
          scoreProfile:profile.resolvePublicRavScoreProfile({modelCoverageReady:true,modelMemoryReady:true,modelMigrationReady:true}),parts,zones:scoreZones},
        ravScoreCandidateGRollback:{schemaVersion:'1.0.0',kind:'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',privacyClass:'PRIVATE_PRODUCTION_RUNTIME',
          sourceModelBinding:ib,rollbackModelBinding:cb,rollbackId:candidateProfile.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,
          automaticActivationAllowed:false,publicDuringNormalOperation:false,
          runtime:{schemaVersion:1,enabled:true,generatedAt:reference,expectedPartCount:673,scoredPartCount:673,modelBinding:cb,
            scoreProfile:candidateProfile.candidateGRollbackScoreProfile({modelCoverageReady:true,modelMemoryReady:true,modelMigrationReady:true}),parts:candidateParts,zones:{}}}};
      const sourceRoot=path.join(temporary,'original-runtime');await fs.mkdir(sourceRoot);
      for(const item of workflow.PRIVATE_RUNTIME_FILES){const file=path.join(sourceRoot,item.relativePath);await fs.mkdir(path.dirname(file),{recursive:true});
        await fs.writeFile(file,JSON.stringify(item.id==='full-conditions'?conditions:{controlledOnly:true,id:item.id,value:17})+'\n',{flag:'wx'});}
      const contractHashes=await workflow.privateRuntimeContractHashes({repositoryRoot:frozenRoot});assert.equal(contractHashes.continuationStateContractSha256,OLD.continuation);
      const bundlePath=path.join(temporary,'original-bundle');
      const built=await bundle.createPrivateProductionRuntimeBundle({privateRoot:temporary,bundlePath,repositoryRoot:frozenRoot,
        metadata:{datasetId:conditions.datasetId,generationId:'controlled-native0600',productionReferenceAt:reference,generatedAt,
          zoneCount:210,partCount:673,modelBinding:ib,contractHashes,privacyClass:'PRIVATE_PRODUCTION_RUNTIME'},
        files:workflow.PRIVATE_RUNTIME_FILES.map(item=>({...item,sourcePath:path.join(sourceRoot,item.relativePath),privacyClass:'PRIVATE_PRODUCTION_RUNTIME'}))});
      const bundleManifestPath=path.join(bundlePath,'manifest.json');
      const archive=await protectedB.buildProtectedPrivateRuntimeArchive({privateRoot:temporary,bundlePath,repositoryRoot:frozenRoot,
        expected:{modelBinding:ib,contractHashes,datasetId:conditions.datasetId,productionReferenceAt:reference,bundleContentSha256:built.bundleContentSha256},
        sourceHead:'60d999a68136c43acb4d3664bbd66eed47283bb2'});
      let pointer={document_key:protectedB.PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey,version:1,
        payload:{schemaVersion:protectedB.PROTECTED_PRIVATE_RUNTIME_POLICY.schemaVersion,kind:protectedB.PROTECTED_PRIVATE_RUNTIME_POLICY.pointerKind,current:archive.descriptor,previous:null}};
      let pointerCalls=0;
      const request=async(_suffix,options={})=>{pointerCalls++;assert.equal(options.method??'GET','GET');return [clone(pointer)];};
      const identity=await protectedB.describeTargetProtectedPrivateProductionRuntime({request,targetReferenceAt:reference});
      const predecessorDescriptorPath=path.join(temporary,'actual-target-description.json');await fs.writeFile(predecessorDescriptorPath,JSON.stringify(identity)+'\n',{flag:'wx'});
      const oldCheckpointPath=path.join(temporary,'old-checkpoint.json');
      await oldS.saveRavScoreContinuationCheckpoint({sourcePath:path.join(sourceRoot,'data/live/conditions.json'),checkpointPath:oldCheckpointPath,repositoryRoot:frozenRoot});
      const oldBytes=await fs.readFile(oldCheckpointPath),oldCheckpoint=JSON.parse(oldBytes);
      let remoteS=clone(oldCheckpoint),sCalls=0;
      const checkpointRequest=async(_suffix,options={})=>{sCalls++;assert.equal(options.method??'GET','GET');
        return [{document_key:'ravscore-continuation-checkpoint',version:1,payload:clone(remoteS)}];};
      // Genuine RED: the new unchanged core refuses this real OLD producer's T.
      await assert.rejects(loadRavScoreContinuationCheckpointForTarget({checkpointPath:oldCheckpointPath,targetReference:reference}),
        /RavScore checkpoint continuation implementation is incompatible/);
      console.log('RED_CONFIRMED: genuine native0600 normal673 checkpoint refuses new unchanged core; no payload exposed.');
      const inputs={sourceRoot,bundleManifestPath,predecessorDescriptorPath,request,checkpointRequest};
      let downloads=0,writeCalls=0;
      const storage={ensurePrivateBucket:async options=>{assert.equal(options.allowCreate,false);},
        download:async key=>{downloads++;const item=archive.objects.find(x=>x.descriptor.objectPath===key);assert(item);return Buffer.from(item.bytes);},
        uploadImmutable:async()=>{writeCalls++;throw Error('No storage writes');},removeExact:async()=>{writeCalls++;throw Error('No storage removal');},
        anonymousStatus:async()=>{throw Error('No unrelated anonymous probe');}};
      const originals=new Map();for(const item of workflow.PRIVATE_RUNTIME_FILES)originals.set(item.relativePath,sha(await fs.readFile(path.join(sourceRoot,item.relativePath))));
      for(const [label,targetReferenceAt] of [['same',reference],['newer','2026-10-16T23:00:00.000Z']]){
        const token=await restoreAndPrepareCurrentMemoryWarmupRuntimeTransition({request,checkpointRequest,storage,targetReferenceAt,workdir:path.join(temporary,label)});
        assert.equal(token.numericalChanges,0);assert.equal(token.partCount,673);assert.equal(token.admission,'NO_ADMISSION');
        assert.equal(await assertCurrentMemoryWarmupRuntimeTransitionPrepared(token),token);
        await assert.rejects(assertCurrentMemoryWarmupRuntimeTransitionPrepared(clone(token)),/serialized receipt/);
        const current=JSON.parse(await fs.readFile(token.checkpointPath,'utf8'));
        const next=requireCurrentMemoryWarmupBinding();assert.equal(current.modelBinding.modelBundleSha256,next.I);
        assert.equal(current.continuationStateContractSha256,next.T);assert.equal(current.productionReferenceAt,reference);
        assert.deepEqual(current.candidateGRollbackCompanion.states,oldCheckpoint.candidateGRollbackCompanion.states);
        const loaded=await loadRavScoreContinuationCheckpointForTarget({checkpointPath:token.checkpointPath,targetReference:targetReferenceAt});
        assert.equal(loaded.loaded,true);assert.equal(loaded.continuationAvailable,true);assert.equal(loaded.ageHours,label==='same'?0:13);
        for(const [file,digest] of originals)assert.equal(sha(await fs.readFile(path.join(sourceRoot,file))),digest);
        assert.deepEqual(await fs.readFile(oldCheckpointPath),oldBytes);
        if(label==='same'){
          await assertPublicationStops({temporary,token,archive,pointer,oldCheckpoint,frozenRoot,bundleManifestPath,reference,generatedAt});
          // Actual ordinary migrator output, independently compared to a fresh
          // original-authenticated wrapper. Not the wrapper's own output path.
          const externalRoot=path.join(temporary,'ordinary-migrator-after0600'),externalReport=path.join(temporary,'ordinary-migrator-after0600-report.json');
          await migratePostCutoverPrivateRuntime({sourceRoot,outputRoot:externalRoot,bundleManifestPath,predecessorDescriptorPath,
            predecessorRoot:frozenRoot,repositoryRoot:path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),
            expectedSourceHead:identity.sourceHead,reportPath:externalReport,metadataOnly:true});
          const proofOptions={...inputs,preparedRuntimeRoot:externalRoot,reportPath:externalReport,targetReferenceAt:reference};
          const proof=await verifyCurrentMemoryWarmupPrewritePreservation({...proofOptions,workdir:path.join(temporary,'actual-workflow-proof')});
          assert.equal(proof.numericalChanges,0);assert.equal(proof.admission,'NO_ADMISSION');
          const altered=path.join(externalRoot,workflow.PRIVATE_RUNTIME_FILES.find(x=>x.id!=='full-conditions').relativePath),original=await fs.readFile(altered);
          await fs.appendFile(altered,'\n');
          await assert.rejects(verifyCurrentMemoryWarmupPrewritePreservation({...proofOptions,workdir:path.join(temporary,'actual-workflow-mutation')}),/prepared successor bytes/);
          await fs.writeFile(altered,original);
          const item=workflow.PRIVATE_RUNTIME_FILES.find(x=>x.id!=='full-conditions'),preparedFile=path.join(token.outputRoot,item.relativePath),bytes=await fs.readFile(preparedFile);
          await fs.appendFile(preparedFile,'\n');await assert.rejects(assertCurrentMemoryWarmupRuntimeTransitionPrepared(token),/prepared B bytes/);await fs.writeFile(preparedFile,bytes);
          const preparedS=await fs.readFile(token.checkpointPath);await fs.appendFile(token.checkpointPath,'\n');
          await assert.rejects(assertCurrentMemoryWarmupRuntimeTransitionPrepared(token));await fs.writeFile(token.checkpointPath,preparedS);
          const part=Object.keys(remoteS.states).sort()[0];remoteS.states[part].supplyPotential+=0.01;
          await assert.rejects(assertCurrentMemoryWarmupRuntimeTransitionPrepared(token));remoteS=clone(oldCheckpoint);
        }
      }
      // Invalid normal old originals are refused, never silently retagged.
      const first=Object.keys(remoteS.states).sort()[0];
      for(const [label,mutate] of [
        ['state-value',s=>{s.states[first].supplyPotential+=0.01;}],
        ['wrong-old-t',s=>{s.continuationStateContractSha256=requireCurrentMemoryWarmupBinding().T;}],
        ['unknown-field',s=>{s.unrecognized=true;}],
      ]){
        remoteS=clone(oldCheckpoint);mutate(remoteS);
        await assert.rejects(prepareCurrentMemoryWarmupRuntimeTransition({...inputs,targetReferenceAt:reference,workdir:path.join(temporary,'negative-'+label)}));
      }
      remoteS=clone(oldCheckpoint);
      const file=path.join(sourceRoot,workflow.PRIVATE_RUNTIME_FILES.find(f=>f.id!=='full-conditions').relativePath),before=await fs.readFile(file);
      await fs.appendFile(file,'\n');await assert.rejects(prepareCurrentMemoryWarmupRuntimeTransition({...inputs,targetReferenceAt:reference,workdir:path.join(temporary,'negative-b-bytes')}));await fs.writeFile(file,before);
      const savedPointer=clone(pointer);pointer.payload.current.sourceHead='f'.repeat(40);
      await assert.rejects(prepareCurrentMemoryWarmupRuntimeTransition({...inputs,targetReferenceAt:reference,workdir:path.join(temporary,'negative-source-head')}));pointer=savedPointer;
      assert(sCalls>=7);assert(pointerCalls>=8);
      assert(downloads>=2);assert.equal(writeCalls,0);
      for(const [file,digest] of originals)assert.equal(sha(await fs.readFile(path.join(sourceRoot,file))),digest);
      assert.deepEqual(await fs.readFile(oldCheckpointPath),oldBytes);
      console.log('GREEN_CONFIRMED: genuine normal673 same/newer S/B metadata bridge and invalid originals PASS; no SQL, providers or hosted claim.');
    });
  }finally{
    assert.equal(await fs.realpath(temporary),temporary);assert.equal(path.dirname(temporary),parent);assert(path.basename(temporary).startsWith(prefix));
    const final=await fs.lstat(temporary,{bigint:true});assert(final.isDirectory()&&!final.isSymbolicLink());assert.deepEqual([final.dev,final.ino,final.birthtimeNs],owner);
    await fs.rm(temporary,{recursive:true,force:false});
  }
});
