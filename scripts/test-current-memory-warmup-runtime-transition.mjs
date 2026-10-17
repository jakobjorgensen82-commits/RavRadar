// Focused normal-producer673 integration regression. Controlled GET transport
// is NOT hosted authentication, provider data, SQL installation or public proof.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyCurrentMemoryWarmupPrewritePreservation} from './current-memory-warmup-prewrite.mjs';
import {migratePostCutoverPrivateRuntime} from './migrate-post-cutover-private-runtime.mjs';
import {withCurrentMemoryWarmupPredecessorSource} from './check-current-memory-warmup-predecessor-source.mjs';
import {prepareCurrentMemoryWarmupRuntimeTransition,restoreAndPrepareCurrentMemoryWarmupRuntimeTransition,assertCurrentMemoryWarmupRuntimeTransitionPrepared}
  from './current-memory-warmup-runtime-transition.mjs';
import {loadRavScoreContinuationCheckpointForTarget} from './ravscore-continuation-checkpoint.mjs';
import {CURRENT_MEMORY_WARMUP_BEFORE as OLD,requireCurrentMemoryWarmupBinding} from './lib/current-memory-warmup-successor-source.mjs';
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const clone=structuredClone;

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
