// Source preparation only. Synthetic DATA assertions never authenticate B/S,
// establish installed SQL, or mint an origin/snapshot/publication capability.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {test} from 'node:test';
import {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as next,SCALAR597_LATER_H0_BINDING,
  SCALAR597_LATER_H0_OUTPUT,readScalar597LaterH0CanonicalSource}
  from './lib/assistant-later-h0-successor-source.mjs';
import {SOURCE597_CODE_SOURCE_PROVENANCE,assertSource597CodeSourceSelected,
  assertSource597OriginalDataSourceSelected,withSource597OriginalDataSource}
  from './check-assistant-later-h0-predecessor-source.mjs';
import {readAuthenticatedSource597Predecessor,assertAuthenticatedSource597Snapshot,
  assertAuthenticatedSource597SnapshotFresh,assertAuthenticatedSource594Snapshot}
  from './lib/authenticated-frozen586-predecessor.mjs';

const canonical=value=>JSON.stringify(value,(_key,nested)=>nested&&typeof nested==='object'
  &&!Array.isArray(nested)?Object.fromEntries(Object.keys(nested).sort().map(key=>[key,nested[key]])):nested);
const digest=value=>crypto.createHash('sha256').update(canonical(value)).digest('hex');
const H0='2026-11-04T04:00:00.000Z',later='2026-11-04T05:00:00.000Z';

test('named unissued assistant parent reads genuine597 canonical SQL without changing ACTIVE or issuing a tuple',async()=>{
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR);
  assert.deepEqual(next.before,{...SCALAR597_LATER_H0_BINDING,canonicalSha256:SCALAR597_LATER_H0_OUTPUT.canonicalSha256});
  assert.equal(next.originalStateFamily,'597');assert.equal(next.databaseBefore,next.before);
  assert.equal(next.binding,null);assert.equal(next.output,null);
  assert.equal(next.readPredecessorCanonicalSource,readScalar597LaterH0CanonicalSource);
  const canonical597=await next.readPredecessorCanonicalSource();
  assert.equal(crypto.createHash('sha256').update(canonical597.canonicalSource).digest('hex'),next.before.canonicalSha256);
  assert.equal(canonical597.admission,'NO_ADMISSION');
  assert.throws(()=>next.requireBinding(),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>next.requireOutput(),/ASSISTANT_AFTER597_UNISSUED/);
  assert.throws(()=>next.requireBinding({C:'a'.repeat(64)}),/No caller-selected/);
  const descriptor={modelBinding:{modelBundleSha256:next.before.I},
    contractHashes:{continuationStateContractSha256:next.before.T},productionReferenceAt:H0};
  assert.equal(next.assertTarget(descriptor,later),true);
  for(const time of [H0,'2026-11-04T03:00:00.000Z','2026-11-04T05:30:00.000Z'])
    assert.throws(()=>next.assertTarget(descriptor,time));
  assert.throws(()=>next.assertTarget({...descriptor,modelBinding:{modelBundleSha256:'0'.repeat(64)}},later));
});

test('CODE, DATA and597 snapshot scopes reject caller selection and serialized/foreign handles before transport',async()=>{
  assert.equal(assertSource597CodeSourceSelected(),SOURCE597_CODE_SOURCE_PROVENANCE);
  assertSource597OriginalDataSourceSelected();
  assert.equal(SOURCE597_CODE_SOURCE_PROVENANCE.head,'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84');
  assert.throws(()=>assertSource597CodeSourceSelected({head:'a'.repeat(40)}));
  assert.throws(()=>assertSource597OriginalDataSourceSelected({family:'594'}));
  await assert.rejects(readAuthenticatedSource597Predecessor({family:'594'}),/SOURCE597_PREDECESSOR_ARGUMENTS/);
  const serialized=Object.freeze({});
  assert.throws(()=>assertAuthenticatedSource597Snapshot(serialized),/SOURCE597_PREDECESSOR_HANDLE/);
  assert.throws(()=>assertAuthenticatedSource594Snapshot(serialized),/SOURCE594_PREDECESSOR_HANDLE/);
  await assert.rejects(assertAuthenticatedSource597SnapshotFresh(serialized),/SOURCE597_PREDECESSOR_HANDLE/);
});

test('normal fixed597 DATA host validates673 actual model pairs and refuses metadata views, wrong S and altered attestation',async t=>{
  await withSource597OriginalDataSource(async root=>{
    const load=relative=>import(pathToFileURL(path.join(root,relative)).href);
    const [data,I,C,stateI,stateC,context,partContract,rollback,workflow,checkpoint,protectedB]=await Promise.all([
      load('scripts/lib/established-native-current-origin-597-assertion.mjs'),
      load('js/core/ravscore-model-contract.js'),load('scripts/rollback-assets/ravscore-model-contract.js'),
      load('js/core/ravscore-integrated-state-pipeline.js'),load('js/core/ravscore-candidate-g-state-pipeline.js'),
      load('scripts/lib/ravscore-sampling-context.mjs'),load('scripts/lib/coastal-point-staging-contract.mjs'),
      load('scripts/lib/ravscore-candidate-g-rollback-runtime.mjs'),load('scripts/private-production-runtime-workflow.mjs'),
      load('scripts/ravscore-continuation-checkpoint.mjs'),load('scripts/protected-private-production-runtime.mjs'),
    ]);
    assert.equal(data.assertSource597OriginSnapshotData instanceof Function,true);
    assert.equal(data.assertFrozen594OriginSnapshotData,undefined);
    const tempParent=await fs.realpath(os.tmpdir());
    const own=await fs.mkdtemp(path.join(tempParent,'rr-assistant597-data-input-'));
    t.after(async()=>{assert.equal(path.dirname(own),tempParent);await fs.rm(own,{recursive:true});});
    const central={zoneCount:210,partCount:673,zones:Object.fromEntries(Array.from({length:210},(_,i)=>['z'+i,[]]))};
    for(let i=0;i<673;i++)central.zones['z'+(i%210)].push({partId:'p'+i,
      landPoint:[10,56],waterPoint:[10.01,56.01],onshoreDirectionDeg:90});
    // The existing ordinary-lineage target's normal49-hour recipe. Values are
    // synthetic inputs; both whole state types are created by their real APIs.
    const samples=Array.from({length:49},(_,i)=>({time:new Date(Date.parse(H0)-(48-i)*3600000).toISOString(),
      currentSpeedMps:0.12,currentAlignment:0.75,currentVerified:true,waveHeightM:1.2,wavePeriodS:6,waveDirectionDeg:270}));
    const first=central.zones.z0[0];
    const integrated=stateI.buildIntegratedRavScoreStateSeries(samples,{samplingContextKey:context.ravScoreSamplingContextKey(first),
      onshoreDirectionDeg:90}).rows.at(-1).continuationState;
    const candidate=stateC.buildCandidateGDerivedStateSeries(samples,{stateKey:partContract.candidateGStateKey(first)}).continuationState;
    const parts={},candidateParts={},pairs=new Map();
    for(const[zoneId,values]of Object.entries(central.zones))for(const part of values){
      const{partId,...metadata}=part;
      const pair={integrated:{...structuredClone(integrated),samplingContextKey:context.ravScoreSamplingContextKey(part)},
        candidate:{...structuredClone(candidate),stateKey:partContract.candidateGStateKey(part)}};
      pair.context=pair.integrated.samplingContextKey;pairs.set(partId,pair);
      parts[partId]={...metadata,zoneId,ravScoreModel:{currentState:pair.integrated}};
      candidateParts[partId]={ravScoreModel:{currentState:pair.candidate}};
    }
    const iBinding=I.ravScoreModelBinding(),cBinding=C.ravScoreModelBinding();
    const conditions={datasetId:'rr-synthetic-assistant-after597-210',productionReferenceAt:H0,generatedAt:later,
      zones:Object.fromEntries(Object.keys(central.zones).map(id=>[id,{}])),
      coastalParts:{modelBinding:iBinding,expectedPartCount:673,parts},
      ravScoreCandidateGRollback:{schemaVersion:'1.0.0',kind:'PRIVATE_CANDIDATE_G_OPERATIONAL_ROLLBACK_RUNTIME',
        privacyClass:'PRIVATE_PRODUCTION_RUNTIME',sourceModelBinding:iBinding,rollbackModelBinding:cBinding,
        rollbackId:rollback.CANDIDATE_G_OPERATIONAL_ROLLBACK_ID,automaticActivationAllowed:false,publicDuringNormalOperation:false,
        runtime:{modelBinding:cBinding,expectedPartCount:673,scoredPartCount:673,
          scoreProfile:{modelCoverageReady:true,modelMemoryReady:true,modelMigrationReady:true},parts:candidateParts}}};
    const origin=await fs.readFile(path.join(root,'scripts/lib/established-native-current-origin.mjs'),'utf8');
    const seedMatch=/const SEED = Object\.freeze\(\{\n([\s\S]*?)\n\}\);/.exec(origin.replaceAll('\r\n','\n'));
    assert(seedMatch);const seedRows=[...seedMatch[1].matchAll(/([A-Za-z][A-Za-z0-9]*): '([^'\n]*)'/g)];
    assert.equal(seedRows.length,13);
    assert.equal(seedMatch[1].replace(/([A-Za-z][A-Za-z0-9]*): '([^'\n]*)'/g,'').replace(/[\s,]/g,''),'');
    const seed=Object.fromEntries(seedRows.map(row=>[row[1],row[2]]));
    const contracts=await workflow.privateRuntimeContractHashes({repositoryRoot:root});
    const hash=crypto.createHash('sha256');for(const id of [...pairs.keys()].sort())hash.update(canonical([id,pairs.get(id)]));
    const content={schemaVersion:1,kind:'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',semanticContract:'established-native-current-continuation-v1',
      seed,parent:{bundleContentSha256:'1'.repeat(64),generationSha256:'2'.repeat(64),attestationSha256:'3'.repeat(64)},
      producer:{sourceHead:SOURCE597_CODE_SOURCE_PROVENANCE.head,semanticContract:'established-native-current-continuation-v1',
        integrated:iBinding.modelBundleSha256,candidate:cBinding.modelBundleSha256,
        continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:seed.ownerPolicyGitBlob},
      datasetId:conditions.datasetId,referenceAt:H0,registrySha256:digest(central),pairsSha256:hash.digest('hex'),
      contextRegistrySha256:digest([...pairs].map(([id,pair])=>[id,pair.context]).sort(([a],[b])=>a.localeCompare(b))),
      transition:'NORMAL_STRICT_CONTINUATION'};
    conditions.privateEstablishedNativeCurrentOrigin={...content,attestationSha256:digest(content)};
    const sourcePath=path.join(own,'conditions.json'),checkpointPath=path.join(own,'checkpoint.json');
    await fs.writeFile(sourcePath,JSON.stringify(conditions));
    await checkpoint.saveRavScoreContinuationCheckpoint({sourcePath,checkpointPath,repositoryRoot:root});
    const S=JSON.parse(await fs.readFile(checkpointPath,'utf8'));
    const policy=protectedB.PROTECTED_PRIVATE_RUNTIME_POLICY;
    const descriptor={schemaVersion:policy.legacySchemaVersion,kind:policy.legacyDescriptorKind,privacyClass:policy.privacyClass,
      bucketId:policy.bucketId,objectPath:'bundles/sha256/'+('4'.repeat(64))+'.json.gz',objectSha256:'4'.repeat(64),objectBytes:1,
      bundleContentSha256:'5'.repeat(64),datasetId:conditions.datasetId,productionReferenceAt:H0,generatedAt:later,
      sourceHead:SOURCE597_CODE_SOURCE_PROVENANCE.head,modelBinding:iBinding,contractHashes:contracts};
    const input={descriptor,conditions,centralContract:central,checkpoint:S};
    assert.equal(await data.assertSource597OriginSnapshotData(input),undefined);
    const metadata=structuredClone(input);metadata.conditions.privateEstablishedNativeCurrentOrigin.kind='PRIVATE_ORIGINAL_BOUND_SAME_H0_METADATA';
    await assert.rejects(data.assertSource597OriginSnapshotData(metadata),/SOURCE_597_NORMAL_GENERATION_REQUIRED/);
    const changedS=structuredClone(input);changedS.checkpoint.states.p0.extraNumericValue=1;
    await assert.rejects(data.assertSource597OriginSnapshotData(changedS),/B_S_DIFFER/);
    const changedAttestation=structuredClone(input);changedAttestation.conditions.privateEstablishedNativeCurrentOrigin.attestationSha256='0'.repeat(64);
    await assert.rejects(data.assertSource597OriginSnapshotData(changedAttestation),/ATTESTATION_HASH/);
  });
});
