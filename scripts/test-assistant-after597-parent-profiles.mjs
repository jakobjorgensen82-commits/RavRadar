// Source preparation only. Synthetic DATA assertions never authenticate B/S,
// establish installed SQL, or mint an origin/snapshot/publication capability.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {test} from 'node:test';
import {ACTIVE_ASSISTANT_SUCCESSOR,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as next,SCALAR597_LATER_H0_BINDING,
  SCALAR597_LATER_H0_OUTPUT,readScalar597LaterH0CanonicalSource,ASSISTANT_AFTER597_BINDING,ASSISTANT_AFTER597_OUTPUT}
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

test('issued assistant598 retains genuine597 canonical parent without granting Source authority',async()=>{
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR,next);
  assert.deepEqual(next.before,{...SCALAR597_LATER_H0_BINDING,canonicalSha256:SCALAR597_LATER_H0_OUTPUT.canonicalSha256});
  assert.equal(next.originalStateFamily,'597');assert.equal(next.databaseBefore,next.before);
  assert.deepEqual(next.requireBinding(),ASSISTANT_AFTER597_BINDING);assert.deepEqual(next.requireOutput(),ASSISTANT_AFTER597_OUTPUT);
  assert.equal(next.readPredecessorCanonicalSource,readScalar597LaterH0CanonicalSource);
  const canonical597=await next.readPredecessorCanonicalSource();
  assert.equal(crypto.createHash('sha256').update(canonical597.canonicalSource).digest('hex'),next.before.canonicalSha256);
  assert.equal(canonical597.admission,'NO_ADMISSION');
  assert.equal(next.requireRelease(),'4.0.598');
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


import {SOURCE598_CODE_SOURCE_PROVENANCE,assertSource598CodeSourceSelected} from './check-assistant-later-h0-predecessor-source.mjs';
// SOURCE uses the fixed genuine598 CODE parent; historical597 DATA remains separate. no old SOURCE issuance
// is imported and no positive original/prewrite capability is fabricated.
import {SOURCE_PRODUCER_AFTER597_PARENT,requireSourceProducerAfter597CodeParent,
  requireSourceProducerAfter597Binding,requireSourceProducerAfter597Output,
  assertSourceProducerAfter597UnissuedMetadata,sourceProducerAfter597PredecessorCompilationLayout,
  readSourceProducerAfter597PredecessorCanonicalSource} from './lib/source-producer-after597-parent.mjs';

test('SOURCE after597 parent/compiler uses the genuine fixed CODE host and exact new checkpoint tail',async()=>{
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.code,SOURCE598_CODE_SOURCE_PROVENANCE);
  assert.equal(assertSource598CodeSourceSelected(),SOURCE598_CODE_SOURCE_PROVENANCE);
  assert.throws(()=>assertSource598CodeSourceSelected({head:SOURCE597_CODE_SOURCE_PROVENANCE.head}));
  assert.equal(requireSourceProducerAfter597CodeParent().version,'20261105064515');
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.code.head,'bd9cf518fe798ddea45d2b835f324f6e2bea06fc');
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.binding,null);
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.output,null);
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,null);
  const source=await readSourceProducerAfter597PredecessorCanonicalSource();
  const layout=sourceProducerAfter597PredecessorCompilationLayout(source.canonicalSource);
  assert.equal(layout.validatorCount,45);assert.equal(layout.definitionCount,48);
  assert(layout.oldTail.includes('original597'));assert.equal(layout.admission,'NO_ADMISSION');
  assert.equal(source.admission,'NO_ADMISSION');
  assert.throws(()=>sourceProducerAfter597PredecessorCompilationLayout(source.canonicalSource+'\n'));
});

test('SOURCE after597 NULL metadata and pre-issuance boundary reject borrowed and mixed families before I/O',async t=>{
  let calls=0;const hostile=new Proxy({},{get(){calls++;throw new Error('UNEXPECTED_OPERAND');},
    ownKeys(){calls++;throw new Error('UNEXPECTED_OPERAND');},getPrototypeOf(){calls++;throw new Error('UNEXPECTED_OPERAND');}});
  for(const key of ['readFile','writeFile','appendFile','mkdir','lstat','realpath'])
    t.mock.method(fs,key,()=>{calls++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{calls++;throw new Error('UNEXPECTED_NETWORK');});
  for(const call of [()=>requireSourceProducerAfter597Binding(),()=>requireSourceProducerAfter597Output()])
    assert.throws(call,/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  assert.throws(()=>requireSourceProducerAfter597Binding(hostile),/No caller-selected/);
  assert.throws(()=>requireSourceProducerAfter597Output(hostile),/No caller-selected/);
  await assert.rejects(readSourceProducerAfter597PredecessorCanonicalSource(hostile),/No caller-selected/);
  assert.equal(calls,0);
  const empty={schemaVersion:'source-producer-after597-derived-metadata-v1',release:null,version:null,binding:null,output:null};
  assert.equal(assertSourceProducerAfter597UnissuedMetadata(empty),true);
  for(const changed of [{...empty,version:'20261103012633'}, {...empty,binding:SCALAR597_LATER_H0_BINDING},
    {...empty,output:SCALAR597_LATER_H0_OUTPUT},{...empty,family:'594'}])
    assert.throws(()=>assertSourceProducerAfter597UnissuedMetadata(changed));
});


import {assistantLaterH0Definition as source597Definition}
  from './lib/assistant-later-h0-successor-source.mjs';
import {NATIVE_ORIGINAL_CONTINUITY_BEFORE as source597Ancient,
  NATIVE_ORIGINAL_CONTINUITY_BINDING as source597ProjectionOutput,
  NATIVE_ORIGINAL_CONTINUITY_PROJECTION as source597Projection}
  from './lib/native-original-continuity-successor-source.mjs';
import {ACCOUNT_STATISTICS_ASSISTANT_PROJECTION as source597AccountProjection}
  from './lib/account-statistics-assistant-successor-source.mjs';

const SOURCE_AFTER597_FIRST_ISSUER_REVIEW={"beforeSha256":"0545668b140cb31b7e93c5888dfbbf921673e23e30b77365eaa2dd024c70145b","afterSha256":"0a62fa7114a2e739207305fe90f58f1acbe69cde3db5e502a4262e9eaec4f26b","hunks":[{"before":"rAfter597PredecessorCanonicalSource} from './lib/source-producer-after597-parent.mjs';\n// SOURCE_AFTER597_COMPILER_IMPORT_END\nconst ROOT=path.resolve(path.dirna","after":"rAfter597PredecessorCanonicalSource} from './lib/source-producer-after597-parent.mjs';\nimport {SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH,sourceProducerAfter597DerivedMetadataFromText,\n  assertSourceProducerAfter597DerivedMetadata,assertSourceProducerAfter597Release}\n  from './lib/source-producer-after597-derived-metadata.mjs';\n// SOURCE_AFTER597_COMPILER_IMPORT_END\nconst ROOT=path.resolve(path.dirna"},{"before":"nput');\n  const issued=SOURCE_PRODUCER_AFTER597_PARENT.binding;\n  const release=JSON.parse(await regularSource('package.json')).version;\n  assert.match(release,/^4\\.0\\.[1-9][0-9]*$/);\n  assert(Number(release.split('.').at(-1))>597);\n  assert.equal(release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);\n  const candidate=await computeCandidateGRollbackBundle();\n  assert.equal(await regularSource('scripts/rollback-assets/ravscore-model-bundle.generated.js'),renderCandidateGRollbackGeneratedModule(candidate));\n  const integrated=await computeRavScoreModelBundle();\n  assert.equal(await regularSource('js/core/ravscore-model-bundle.generated.js'),renderGeneratedBundleModule(integrated));\n  const next={version:issued.version,C:candidate.modelBundleSha256,I:integra","after":"nput');\n  const issued=SOURCE_PRODUCER_AFTER597_PARENT.binding;\n  const release=await sourceAfter597ReadRelease();\n  assert.equal(release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);\n  const candidate=await computeCandidateGRollbackBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)));\n  const integrated=await computeRavScoreModelBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),Buffer.from(renderGeneratedBundleModule(integrated)));\n  const next={version:issued.version,C:candidate.modelBundleSha256,I:integra"},{"before":"56:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});\n}\n\n// Existing CLI flags, closed until the real separately issued family exists.\nexpor","after":"56:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});\n}\n\n// SOURCE_AFTER597_FIRST_ISSUANCE_BEGIN\nasync function sourceAfter597RegularSourceBytes(relative){\n  const file=path.join(ROOT,relative),stat=await fs.lstat(file);\n  assert(stat.isFile()&&!stat.isSymbolicLink(),'SOURCE_AFTER597_REGULAR_SOURCE_REQUIRED');\n  return fs.readFile(file);\n}\nasync function readSourceProducerAfter597FirstIssuanceMetadata(){\n  requireSourceProducerAfter597CodeParent(); // Fixed genuine CODE, before files.\n  const bytes=await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH);\n  const raw=bytes.toString('utf8');assert.deepEqual(Buffer.from(raw,'utf8'),bytes,'SOURCE_AFTER597_METADATA_UTF8');\n  const value=sourceProducerAfter597DerivedMetadataFromText(raw);\n  assert.deepEqual(value.binding,SOURCE_PRODUCER_AFTER597_PARENT.binding,'SOURCE_AFTER597_FRESH_BINDING_PHASE');\n  assert.deepEqual(value.output,SOURCE_PRODUCER_AFTER597_PARENT.output,'SOURCE_AFTER597_FRESH_OUTPUT_PHASE');\n  assert.equal(value.release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,'SOURCE_AFTER597_FRESH_RELEASE_PHASE');\n  assert.equal(value.version,SOURCE_PRODUCER_AFTER597_PARENT.binding?.version??null,'SOURCE_AFTER597_FRESH_VERSION_PHASE');\n  return {raw,value};\n}\nasync function sourceAfter597ReadRelease(){\n  const pkg=JSON.parse((await sourceAfter597RegularSourceBytes('package.json')).toString('utf8'));\n  return assertSourceProducerAfter597Release(pkg.version);\n}\nexport async function deriveSourceProducerAfter597FirstBinding(version){\n  assert.equal(arguments.length,1,'SOURCE_AFTER597_TIMESTAMP_ONLY');\n  assert.equal(typeof version,'string','SOURCE_AFTER597_TIMESTAMP_ONLY');\n  assert.match(version,/^[0-9]{14}$/,'SOURCE_AFTER597_TIMESTAMP_ONLY');\n  const before=requireSourceProducerAfter597CodeParent();\n  assert(version>before.version,'SOURCE_AFTER597_LATER_VERSION_REQUIRED');\n  const {raw,value}=await readSourceProducerAfter597FirstIssuanceMetadata();\n  assert.equal(value.version,null,'SOURCE_AFTER597_FIRST_BINDING_REQUIRES_NULL');\n  assert.equal(value.release,null);assert.equal(value.binding,null);assert.equal(value.output,null);\n  const release=await sourceAfter597ReadRelease(); // Real later package, before builders.\n  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();\n  assert.equal(sha(prior.canonicalSource),before.canonicalSha256);\n  const candidate=await computeCandidateGRollbackBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),\n    Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)),'SOURCE_AFTER597_PHYSICAL_C_MODULE');\n  const integrated=await computeRavScoreModelBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),\n    Buffer.from(renderGeneratedBundleModule(integrated)),'SOURCE_AFTER597_PHYSICAL_I_MODULE');\n  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'\n    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;\n  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,\n    T:await ravScoreContinuationImplementationSha256(),\n    candidateManifestSha256:sha(JSON.stringify(candidate.manifest)),\n    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};\n  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);\n  assert.equal(new Set(['C','I','T'].flatMap(key=>[before[key],binding[key]])).size,6);\n  assert.deepEqual(await readSourceProducerAfter597PredecessorCanonicalSource(),prior,'Whole fixed597 prior unchanged during first derivation');\n  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),\n    Buffer.from(raw,'utf8'),'SOURCE_AFTER597_NULL_METADATA_UNCHANGED');\n  return assertSourceProducerAfter597DerivedMetadata({schemaVersion:value.schemaVersion,release,version,binding,output:null});\n}\nexport async function deriveSourceProducerAfter597FirstOutput(){\n  assert.equal(arguments.length,0,'SOURCE_AFTER597_NO_OUTPUT_OPTIONS');\n  requireSourceProducerAfter597Binding(); // NULL refuses before files/operands.\n  const {raw,value}=await readSourceProducerAfter597FirstIssuanceMetadata();\n  assert(value.binding!==null&&value.version!==null&&value.release!==null,'SOURCE_AFTER597_BINDING_ONLY_REQUIRED');\n  assert.equal(value.output,null,'SOURCE_AFTER597_BINDING_ONLY_REQUIRED');\n  const result=await buildSourceProducerAfter597BindingSuccessor(); // SAME normal compiler/wrapper.\n  assert.deepEqual(result.nextBinding,{version:value.version,C:value.binding.C,I:value.binding.I,T:value.binding.T});\n  const output={migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,\n    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256};\n  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),\n    Buffer.from(raw,'utf8'),'SOURCE_AFTER597_BINDING_ONLY_METADATA_UNCHANGED');\n  return assertSourceProducerAfter597DerivedMetadata({schemaVersion:value.schemaVersion,release:value.release,\n    version:value.version,binding:{...value.binding},output});\n}\n// SOURCE_AFTER597_FIRST_ISSUANCE_END\n\n// Existing CLI flags, closed until the real separately issued family exists.\nexpor"},{"before":"ss.argv[2])));\n  const binding=SOURCE_PRODUCER_AFTER597_PARENT.binding;\n  const result=await buildSourceProducerAfter597BindingSuccessor();\n  assert.deepEqual({","after":"ss.argv[2])));\n  const binding=SOURCE_PRODUCER_AFTER597_PARENT.binding;\n  const {raw,value}=await readSourceProducerAfter597FirstIssuanceMetadata();assert(value.output!==null);\n  const result=await buildSourceProducerAfter597BindingSuccessor();\n  assert.deepEqual({"},{"before":"pointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);\n  const file=path.join(ROOT,'supabase/migrations',binding.version+'_source_pr","after":"pointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);\n  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),Buffer.from(raw,'utf8'),'SOURCE_AFTER597_OUTPUT_METADATA_UNCHANGED');\n  const file=path.join(ROOT,'supabase/migrations',binding.version+'_source_pr"},{"before":"\n}\n// SOURCE_AFTER597_COMPILER_END\n\nasync function main(){\n  // SOURCE_AFTER597_COMPILER_DISPATCH_BEGIN\n  if(SOURCE_PRODUCER_AFTER597_PARENT.binding!==null){\n    await runSourceProducerAfter597Compiler();return;\n  }\n  // SOURCE_AFTER59","after":"\n}\n// SOURCE_AFTER597_COMPILER_END\n\nasync function main(){\n  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_BEGIN\n  if(process.argv[2]==='--derive-after597-first-binding'){\n    assert.equal(process.argv.length,4);\n    console.log(JSON.stringify(await deriveSourceProducerAfter597FirstBinding(process.argv[3]),null,2));return;\n  }\n  if(process.argv[2]==='--derive-after597-first-output'){\n    assert.equal(process.argv.length,3);\n    console.log(JSON.stringify(await deriveSourceProducerAfter597FirstOutput(),null,2));return;\n  }\n  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_END\n  // SOURCE_AFTER597_COMPILER_DISPATCH_BEGIN\n  if(SOURCE_PRODUCER_AFTER597_PARENT.binding!==null||process.argv[2]===undefined\n    ||['--check','--write'].includes(process.argv[2])){\n    await runSourceProducerAfter597Compiler();return;\n  }\n  // SOURCE_AFTER59"}]};

const SOURCE_CODE_PINS_COMPILER_REVIEW={"beforeSha256":"0a62fa7114a2e739207305fe90f58f1acbe69cde3db5e502a4262e9eaec4f26b","afterSha256":"7e5ff79432e9f4953126fcfd95d2e634f61905ac77cc4e7cabcf443b42b69800","hunks":[{"before":"import {SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH,sourceProducerAfter597DerivedMetadataFromText,\n  assertSourceProducerAfter597DerivedMetadata,assertSourceProducerAfter597Release}\n  from './lib/source-producer-after597-derived-metadata.mjs';\n// SOURCE_AFTER597_COMPILER_IMPORT_END\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';\nconst sha=value=>crypto.createHash('sha256').update(value).digest('hex');\n","after":"import {SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH,sourceProducerAfter597DerivedMetadataFromText,\n  assertSourceProducerAfter597DerivedMetadata,assertSourceProducerAfter597Release}\n  from './lib/source-producer-after597-derived-metadata.mjs';\nimport {computeSourceProducerAfter597CodePins,assertSourceProducerAfter597CodePinsPrepared,assertSourceProducerAfter597CodeData}\n  from './lib/source-producer-after597-runtime-family.mjs';\n// SOURCE_AFTER597_COMPILER_IMPORT_END\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';\nconst sha=value=>crypto.createHash('sha256').update(value).digest('hex');\n"},{"before":"export async function prepareSourceProducerAfter597SuccessorStructure(){\n  requireSourceProducerAfter597Binding();\n  assert.equal(arguments.length,0,'No caller-selected SOURCE597 build input');\n  const issued=SOURCE_PRODUCER_AFTER597_PARENT.binding;\n  const release=await sourceAfter597ReadRelease();\n  assert.equal(release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);\n","after":"export async function prepareSourceProducerAfter597SuccessorStructure(){\n  requireSourceProducerAfter597Binding();\n  assert.equal(arguments.length,0,'No caller-selected SOURCE597 build input');\n  assertSourceProducerAfter597CodePinsPrepared(); // Fresh physical compiler-derived DATA, never an import-cached NULL.\n  const issued=SOURCE_PRODUCER_AFTER597_PARENT.binding;\n  const release=await sourceAfter597ReadRelease();\n  assert.equal(release,SOURCE_PRODUCER_AFTER597_PARENT.nextRelease);\n"},{"before":"  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)));\n  const integrated=await computeRavScoreModelBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),Buffer.from(renderGeneratedBundleModule(integrated)));\n  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,\n    T:await ravScoreContinuationImplementationSha256()};\n  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued SOURCE597 C/I/T');\n","after":"  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)));\n  const integrated=await computeRavScoreModelBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),Buffer.from(renderGeneratedBundleModule(integrated)));\n  assertSourceProducerAfter597CodeData({C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,\n    metadataText:JSON.stringify({schemaVersion:'source-producer-after597-derived-metadata-v1',\n      release:SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,version:issued.version,binding:issued,\n      output:SOURCE_PRODUCER_AFTER597_PARENT.output},null,2)+'\\n'});\n  const next={version:issued.version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,\n    T:await ravScoreContinuationImplementationSha256()};\n  assert.deepEqual(next,{version:issued.version,C:issued.C,I:issued.I,T:issued.T},'Only actual physical issued SOURCE597 C/I/T');\n"},{"before":"  const pkg=JSON.parse((await sourceAfter597RegularSourceBytes('package.json')).toString('utf8'));\n  return assertSourceProducerAfter597Release(pkg.version);\n}\nexport async function deriveSourceProducerAfter597FirstBinding(version){\n  assert.equal(arguments.length,1,'SOURCE_AFTER597_TIMESTAMP_ONLY');\n  assert.equal(typeof version,'string','SOURCE_AFTER597_TIMESTAMP_ONLY');\n","after":"  const pkg=JSON.parse((await sourceAfter597RegularSourceBytes('package.json')).toString('utf8'));\n  return assertSourceProducerAfter597Release(pkg.version);\n}\n// Pure fixed CODE DATA preparation; no model binding/output/SQL is issued here.\nexport async function deriveSourceProducerAfter597CodePins(){\n  requireSourceProducerAfter597CodeParent();assert.equal(arguments.length,0);\n  const {value}=await readSourceProducerAfter597FirstIssuanceMetadata();\n  assert.equal(value.binding,null);assert.equal(value.output,null);assert.equal(value.release,null);assert.equal(value.version,null);\n  await sourceAfter597ReadRelease(); // Same real later-package requirement as first binding.\n  return computeSourceProducerAfter597CodePins();\n}\nexport async function deriveSourceProducerAfter597FirstBinding(version){\n  assert.equal(arguments.length,1,'SOURCE_AFTER597_TIMESTAMP_ONLY');\n  assert.equal(typeof version,'string','SOURCE_AFTER597_TIMESTAMP_ONLY');\n"},{"before":"  const release=await sourceAfter597ReadRelease(); // Real later package, before builders.\n  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();\n  assert.equal(sha(prior.canonicalSource),before.canonicalSha256);\n  const candidate=await computeCandidateGRollbackBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),\n    Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)),'SOURCE_AFTER597_PHYSICAL_C_MODULE');\n  const integrated=await computeRavScoreModelBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),\n    Buffer.from(renderGeneratedBundleModule(integrated)),'SOURCE_AFTER597_PHYSICAL_I_MODULE');\n  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'\n    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;\n  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,\n","after":"  const release=await sourceAfter597ReadRelease(); // Real later package, before builders.\n  const prior=await readSourceProducerAfter597PredecessorCanonicalSource();\n  assert.equal(sha(prior.canonicalSource),before.canonicalSha256);\n  assertSourceProducerAfter597CodePinsPrepared(); // Before deriving the real I/binding.\n  const candidate=await computeCandidateGRollbackBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('scripts/rollback-assets/ravscore-model-bundle.generated.js'),\n    Buffer.from(renderCandidateGRollbackGeneratedModule(candidate)),'SOURCE_AFTER597_PHYSICAL_C_MODULE');\n  const integrated=await computeRavScoreModelBundle();\n  assert.deepEqual(await sourceAfter597RegularSourceBytes('js/core/ravscore-model-bundle.generated.js'),\n    Buffer.from(renderGeneratedBundleModule(integrated)),'SOURCE_AFTER597_PHYSICAL_I_MODULE');\n  assertSourceProducerAfter597CodeData({C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,metadataText:raw});\n  const canonical=value=>Array.isArray(value)?value:value&&typeof value==='object'\n    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,value[key]])):value;\n  const binding={version,C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,\n"}]};

const SOURCE_AFTER598_PARENT_COMPILER_REVIEW={"beforeSha256":"7e5ff79432e9f4953126fcfd95d2e634f61905ac77cc4e7cabcf443b42b69800","afterSha256":"ebf2ca26b0d480069e18d98bf3b658b8bae68bece29814c095ce5a72c281c4be","hunks":[{"before":"// Separate inactive597 arm. Old594/595/596 compiler/issuance functions above\n// remain whole. The template markers are deliberately invalid identities.\nconst SOURCE_AFTER597_COMPILER_ALIASES=Object.freeze([\n  Object.freeze({name:CP+'source597_state_valid',signature:'(jsonb,text)'}),\n  Object.freeze({name:CP+'source597_payload_valid',signature:'(jsonb,timestamptz)'}),\n  Object.freeze({name:CP+'source597_same_h0_projection',signature:'(jsonb,timestamptz)'}),\n]);\nconst SOURCE_AFTER597_COMPILER_REPLACEMENTS=Object.freeze([\n  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',\n  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);\nconst SOURCE_AFTER597_COMPILER_LABELS=Object.freeze([\n  'source-original597-state-validator','source-original597-payload-validator','source597-same-h0-projection']);\nconst SOURCE_AFTER597_UNISSUED_MARKERS=Object.freeze({\n  version:'UNISSUED_SOURCE_AFTER597_VERSION',\n  C:'UNISSUED_SOURCE_AFTER597_C'.padEnd(64,'_'),\n","after":"// Separate inactive597 arm. Old594/595/596 compiler/issuance functions above\n// remain whole. The template markers are deliberately invalid identities.\nconst SOURCE_AFTER597_COMPILER_ALIASES=Object.freeze([\n  Object.freeze({name:CP+'source598_state_valid',signature:'(jsonb,text)'}),\n  Object.freeze({name:CP+'source598_payload_valid',signature:'(jsonb,timestamptz)'}),\n  Object.freeze({name:CP+'source598_same_h0_projection',signature:'(jsonb,timestamptz)'}),\n]);\nconst SOURCE_AFTER597_COMPILER_REPLACEMENTS=Object.freeze([\n  CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',\n  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);\nconst SOURCE_AFTER597_COMPILER_LABELS=Object.freeze([\n  'source-original598-state-validator','source-original598-payload-validator','source598-same-h0-projection']);\nconst SOURCE_AFTER597_UNISSUED_MARKERS=Object.freeze({\n  version:'UNISSUED_SOURCE_AFTER597_VERSION',\n  C:'UNISSUED_SOURCE_AFTER597_C'.padEnd(64,'_'),\n"},{"before":"  for(const[suffix,inventory]of[['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],\n    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])add(CP+suffix,sourceAfter597CurrentMetadata(definition(before,CP+suffix),next,inventory));\n  // Preserve the entire genuine NOC585->586 projection as an exact template.\n  // Its585 INPUT moves to genuine597; its586 OUTPUT moves to new SOURCE-unissued.\n  // These are separate maps; every original projection remains byte-identical.\n  const oldProjection=definition(before,NATIVE_ORIGINAL_CONTINUITY_PROJECTION),map=new Map(),inverseMap=new Map();\n  for(const key of ['C','I','T']){assert.equal(count(oldProjection,ANCIENT[key]),key==='I'?2:1);assert.equal(count(oldProjection,PROJECTION_OUTPUT[key]),key==='I'?2:1);\n    assert.equal(count(oldProjection,OLD[key]),0,'The frozen template is not the current597 input');\n    map.set(ANCIENT[key],OLD[key]);map.set(PROJECTION_OUTPUT[key],next[key]);inverseMap.set(OLD[key],ANCIENT[key]);inverseMap.set(next[key],PROJECTION_OUTPUT[key]);}\n  let projection=once(oldProjection,'function public.'+NATIVE_ORIGINAL_CONTINUITY_PROJECTION+'(','function public.'+PROJECTION+'(');\n  projection=once(projection,'public.'+CP+'noc585_payload_valid(','public.'+FROZEN_PAYLOAD+'(');\n","after":"  for(const[suffix,inventory]of[['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],\n    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])add(CP+suffix,sourceAfter597CurrentMetadata(definition(before,CP+suffix),next,inventory));\n  // Preserve the entire genuine NOC585->586 projection as an exact template.\n  // Its585 INPUT moves to genuine598; its586 OUTPUT moves to new SOURCE-unissued.\n  // These are separate maps; every original projection remains byte-identical.\n  const oldProjection=definition(before,NATIVE_ORIGINAL_CONTINUITY_PROJECTION),map=new Map(),inverseMap=new Map();\n  for(const key of ['C','I','T']){assert.equal(count(oldProjection,ANCIENT[key]),key==='I'?2:1);assert.equal(count(oldProjection,PROJECTION_OUTPUT[key]),key==='I'?2:1);\n    assert.equal(count(oldProjection,OLD[key]),0,'The frozen template is not the current598 input');\n    map.set(ANCIENT[key],OLD[key]);map.set(PROJECTION_OUTPUT[key],next[key]);inverseMap.set(OLD[key],ANCIENT[key]);inverseMap.set(next[key],PROJECTION_OUTPUT[key]);}\n  let projection=once(oldProjection,'function public.'+NATIVE_ORIGINAL_CONTINUITY_PROJECTION+'(','function public.'+PROJECTION+'(');\n  projection=once(projection,'public.'+CP+'noc585_payload_valid(','public.'+FROZEN_PAYLOAD+'(');\n"},{"before":"  add('ravradar_trip_v3_binding_allowed',trip);\n  const casBefore=definition(before,CP+'cas');\n  let cas=once(casBefore,'  v_noc_same_h0_predecessor_payload jsonb;',\n    '  v_noc_same_h0_predecessor_payload jsonb;\\n  v_source597_same_h0_predecessor_payload jsonb;');\n  const dispatch=\"    if p_payload ->> 'continuationStateContractSha256' = '\"+PROJECTION_OUTPUT.T+\"'\\n\";\n  cas=once(cas,dispatch,\"    if p_payload ->> 'continuationStateContractSha256' = '\"+next.T+\"'\\n\"\n    +\"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '\"+OLD.I+\"'\\n    then\\n\"\n    +'      v_source597_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\\n    end if;\\n'+dispatch);\n  cas=once(cas,'    if v_noc_same_h0_predecessor_payload is not null',\n    '    if v_source597_same_h0_predecessor_payload is not null\\n      or v_noc_same_h0_predecessor_payload is not null');\n  const comparison='    if v_central_is_compatible_predecessor and v_noc_same_h0_predecessor_payload is not null then';\n  cas=once(cas,comparison,'    if v_central_is_compatible_predecessor and v_source597_same_h0_predecessor_payload is not null then\\n'\n    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\\n'\n    +\"        and (v_source597_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\\n\"\n    +\"          #- '{candidateGRollbackCompanion,generationSha256}')\\n\"\n    +\"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\\n\"\n    +\"          #- '{candidateGRollbackCompanion,generationSha256}');\\n\"+comparison.replace('    if ','    elsif '));\n","after":"  add('ravradar_trip_v3_binding_allowed',trip);\n  const casBefore=definition(before,CP+'cas');\n  let cas=once(casBefore,'  v_noc_same_h0_predecessor_payload jsonb;',\n    '  v_noc_same_h0_predecessor_payload jsonb;\\n  v_source598_same_h0_predecessor_payload jsonb;');\n  const dispatch=\"    if p_payload ->> 'continuationStateContractSha256' = '\"+PROJECTION_OUTPUT.T+\"'\\n\";\n  cas=once(cas,dispatch,\"    if p_payload ->> 'continuationStateContractSha256' = '\"+next.T+\"'\\n\"\n    +\"      and v_payload #>> '{modelBinding,modelBundleSha256}' = '\"+OLD.I+\"'\\n    then\\n\"\n    +'      v_source598_same_h0_predecessor_payload := public.'+PROJECTION+'(v_payload,v_central_reference);\\n    end if;\\n'+dispatch);\n  cas=once(cas,'    if v_noc_same_h0_predecessor_payload is not null',\n    '    if v_source598_same_h0_predecessor_payload is not null\\n      or v_noc_same_h0_predecessor_payload is not null');\n  const comparison='    if v_central_is_compatible_predecessor and v_noc_same_h0_predecessor_payload is not null then';\n  cas=once(cas,comparison,'    if v_central_is_compatible_predecessor and v_source598_same_h0_predecessor_payload is not null then\\n'\n    +'      v_exact_predecessor_same_target_transition := v_central_reference = p_target_reference\\n'\n    +\"        and (v_source598_same_h0_predecessor_payload #- '{generationSha256}' #- '{stateSha256}'\\n\"\n    +\"          #- '{candidateGRollbackCompanion,generationSha256}')\\n\"\n    +\"        = (p_payload #- '{generationSha256}' #- '{stateSha256}'\\n\"\n    +\"          #- '{candidateGRollbackCompanion,generationSha256}');\\n\"+comparison.replace('    if ','    elsif '));\n"},{"before":"  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole retry/version/write/refusal tail unchanged');add(CP+'cas',cas);\n  const contractBefore=definition(before,CP+'contract');\n  let contract=once(contractBefore,'  v_noc_same_h0_projection_definition text;',\n    '  v_noc_same_h0_projection_definition text;\\n  v_source597_state_definition text;\\n  v_source597_payload_definition text;\\n  v_source597_same_h0_projection_definition text;');\n  const prefix=layout.prefix;\n  const oldOids=prefix.validators,oid=[prefix.oid],oldDefinition=[prefix.checkpoint];\n  const newOids=aliases.map(row=>\"    pg_catalog.to_regprocedure('public.\"+row.name+row.signature+\"')\").join(',\\n');\n  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\\n'+newOids+'\\n  ];');\n  const variables=['v_source597_state_definition','v_source597_payload_definition','v_source597_same_h0_projection_definition'];\n  const bodies=variables.map((variable,index)=>\"  select pg_catalog.btrim(p.prosrc, E' \\\\n\\\\r\\\\t') into \"+variable+'\\n'\n    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\\n').join('\\n');\n  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\\n  v_checkpoint_definition := v_canonical_time_definition');\n","after":"  assert(tail>=0&&cas.endsWith(casBefore.slice(tail)),'Whole retry/version/write/refusal tail unchanged');add(CP+'cas',cas);\n  const contractBefore=definition(before,CP+'contract');\n  let contract=once(contractBefore,'  v_noc_same_h0_projection_definition text;',\n    '  v_noc_same_h0_projection_definition text;\\n  v_source598_state_definition text;\\n  v_source598_payload_definition text;\\n  v_source598_same_h0_projection_definition text;');\n  const prefix=layout.prefix;\n  const oldOids=prefix.validators,oid=[prefix.oid],oldDefinition=[prefix.checkpoint];\n  const newOids=aliases.map(row=>\"    pg_catalog.to_regprocedure('public.\"+row.name+row.signature+\"')\").join(',\\n');\n  contract=once(contract,oid[0],oid[0].slice(0,-5)+',\\n'+newOids+'\\n  ];');\n  const variables=['v_source598_state_definition','v_source598_payload_definition','v_source598_same_h0_projection_definition'];\n  const bodies=variables.map((variable,index)=>\"  select pg_catalog.btrim(p.prosrc, E' \\\\n\\\\r\\\\t') into \"+variable+'\\n'\n    +'  from pg_catalog.pg_proc p where p.oid = v_validator_oids['+(oldOids.length+index+1)+'];\\n').join('\\n');\n  contract=once(contract,'  v_checkpoint_definition := v_canonical_time_definition',bodies+'\\n  v_checkpoint_definition := v_canonical_time_definition');\n"},{"before":"  const afterOid=/  v_validator_oids oid\\[\\] := array\\[([\\s\\S]*?)\\n  \\];/.exec(contract);assert(afterOid);\n  const afterOids=[...afterOid[1].matchAll(/pg_catalog\\.to_regprocedure\\(\\s*'([^']+)'\\s*\\)/g)].map(m=>m[1]);\n  assert.deepEqual(afterOids,[...oldOids,...aliases.map(row=>'public.'+row.name+row.signature)],\n    'Entire genuine597 validator prefix followed only by the three SOURCE aliases');\n  assert.equal(afterOids.length,layout.successorValidatorCount);\n  const afterDefinition=/  v_checkpoint_definition := v_canonical_time_definition[\\s\\S]*?;/.exec(contract);assert(afterDefinition);\n  assert(afterDefinition[0].startsWith(oldDefinition[0].slice(0,-1)),\n    'Entire genuine597 checkpoint definition prefix is preserved');\n  assert.equal((contract.match(/\\|\\| v_[a-z0-9_]+_definition/g)??[]).length+1,layout.successorDefinitionCount);add(CP+'contract',contract);\n  assert.deepEqual(changes.map(row=>row.name),SOURCE_PRODUCER_REPLACEMENTS);\n  const insertion=aliases.map(row=>row.definition+'\\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\\n\\n').join('');\n  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);\n  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);\n  let inverse=once(canonicalSource,insertion,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);\n  assert.equal(inverse,before,'Whole issued597 canonical inverse');\n  const replaced=new Set(changes.map(row=>row.name));\n  for(const match of before.matchAll(/^create or replace function public\\.([a-z0-9_]+)\\(/gm))\n    if(!replaced.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(before,match[1]),\n      'Every untouched genuine597/historical function remains whole');\n  for(const name of [CP+'native_origin_projection',ACCOUNT_STATISTICS_ASSISTANT_PROJECTION,NATIVE_ORIGINAL_CONTINUITY_PROJECTION])\n    assert.equal(definition(canonicalSource,name),definition(before,name),'All existing projections unchanged');\n  return Object.freeze({aliases,changes,canonicalSource,nextBinding:next,wholeCanonicalInverse:true,\n","after":"  const afterOid=/  v_validator_oids oid\\[\\] := array\\[([\\s\\S]*?)\\n  \\];/.exec(contract);assert(afterOid);\n  const afterOids=[...afterOid[1].matchAll(/pg_catalog\\.to_regprocedure\\(\\s*'([^']+)'\\s*\\)/g)].map(m=>m[1]);\n  assert.deepEqual(afterOids,[...oldOids,...aliases.map(row=>'public.'+row.name+row.signature)],\n    'Entire genuine598 validator prefix followed only by the three SOURCE aliases');\n  assert.equal(afterOids.length,layout.successorValidatorCount);\n  const afterDefinition=/  v_checkpoint_definition := v_canonical_time_definition[\\s\\S]*?;/.exec(contract);assert(afterDefinition);\n  assert(afterDefinition[0].startsWith(oldDefinition[0].slice(0,-1)),\n    'Entire genuine598 checkpoint definition prefix is preserved');\n  assert.equal((contract.match(/\\|\\| v_[a-z0-9_]+_definition/g)??[]).length+1,layout.successorDefinitionCount);add(CP+'contract',contract);\n  assert.deepEqual(changes.map(row=>row.name),SOURCE_PRODUCER_REPLACEMENTS);\n  const insertion=aliases.map(row=>row.definition+'\\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\\n\\n').join('');\n  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);\n  canonicalSource=once(canonicalSource,changes[0].after,insertion+changes[0].after);\n  let inverse=once(canonicalSource,insertion,'');for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);\n  assert.equal(inverse,before,'Whole issued598 canonical inverse');\n  const replaced=new Set(changes.map(row=>row.name));\n  for(const match of before.matchAll(/^create or replace function public\\.([a-z0-9_]+)\\(/gm))\n    if(!replaced.has(match[1]))assert.equal(definition(canonicalSource,match[1]),definition(before,match[1]),\n      'Every untouched genuine598/historical function remains whole');\n  for(const name of [CP+'native_origin_projection',ACCOUNT_STATISTICS_ASSISTANT_PROJECTION,NATIVE_ORIGINAL_CONTINUITY_PROJECTION])\n    assert.equal(definition(canonicalSource,name),definition(before,name),'All existing projections unchanged');\n  return Object.freeze({aliases,changes,canonicalSource,nextBinding:next,wholeCanonicalInverse:true,\n"},{"before":"\n\n// Pure CODE transformer, not binding derivation or a SQL emitter. The only\n// accepted input is the exact genuine597 canonical source. No caller tuple.\nexport function compileSourceProducerAfter597Template(before){\n  assert.equal(arguments.length,1,'No caller-selected SOURCE597 template tuple');\n  const core=compileSourceProducerAfter597(before,SOURCE_AFTER597_UNISSUED_MARKERS,true);\n","after":"\n\n// Pure CODE transformer, not binding derivation or a SQL emitter. The only\n// accepted input is the exact genuine598 canonical source. No caller tuple.\nexport function compileSourceProducerAfter597Template(before){\n  assert.equal(arguments.length,1,'No caller-selected SOURCE597 template tuple');\n  const core=compileSourceProducerAfter597(before,SOURCE_AFTER597_UNISSUED_MARKERS,true);\n"},{"before":"  const snapshot=preservationQuery(signatures);\n  const prefix=['do $source_producer_successor$',\n    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;','begin',\n    \"  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '\"+OLD.version+\"' then raise exception 'SOURCE_PRODUCER_EXACT_INSTALLED597_REQUIRED'; end if;\",\n    \"  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'SOURCE_PRODUCER_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;\",\n    \"  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'SOURCE_PRODUCER_INSTALLED230_REQUIRED'; end if;\",\n    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\\n');\n","after":"  const snapshot=preservationQuery(signatures);\n  const prefix=['do $source_producer_successor$',\n    'declare original_catalog jsonb; after_catalog jsonb; account_observed jsonb; function_name text;','begin',\n    \"  if (select max(version::text) from supabase_migrations.schema_migrations) is distinct from '\"+OLD.version+\"' then raise exception 'SOURCE_PRODUCER_EXACT_INSTALLED598_REQUIRED'; end if;\",\n    \"  if exists(select 1 from supabase_migrations.schema_migrations where version::text=any(array['20261014140000','20261015030000','20261016030000'])) then raise exception 'SOURCE_PRODUCER_ARCHIVED_PHASE_MUST_BE_ABSENT'; end if;\",\n    \"  if not exists(select 1 from supabase_migrations.schema_migrations where version::text='20261013230000') then raise exception 'SOURCE_PRODUCER_INSTALLED230_REQUIRED'; end if;\",\n    '  lock table public.account_activity_journal,public.account_statistics_preferences in access share mode;'].join('\\n');\n"},{"before":"  for(const original of prior.originalDefinitions)\n    assert.equal(definition(result.canonicalSource,original.name),original.definition,'Every inherited original definition whole');\n  const contract=sourceAfter597CheckpointContractFromBase(result.canonicalSource,\n    checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'scalar597-later-h0-original594-successor'}));\n  return Object.freeze({...result,checkpointContractSha256:contract.sha256,\n    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});\n}\n","after":"  for(const original of prior.originalDefinitions)\n    assert.equal(definition(result.canonicalSource,original.name),original.definition,'Every inherited original definition whole');\n  const contract=sourceAfter597CheckpointContractFromBase(result.canonicalSource,\n    checkpointCasContractFromCanonicalSource(result.canonicalSource,{sourcePhase:'assistant-mixed-after597-successor'}));\n  return Object.freeze({...result,checkpointContractSha256:contract.sha256,\n    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(result.canonicalSource).sha256});\n}\n"},{"before":"    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};\n  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);\n  assert.equal(new Set(['C','I','T'].flatMap(key=>[before[key],binding[key]])).size,6);\n  assert.deepEqual(await readSourceProducerAfter597PredecessorCanonicalSource(),prior,'Whole fixed597 prior unchanged during first derivation');\n  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),\n    Buffer.from(raw,'utf8'),'SOURCE_AFTER597_NULL_METADATA_UNCHANGED');\n  return assertSourceProducerAfter597DerivedMetadata({schemaVersion:value.schemaVersion,release,version,binding,output:null});\n","after":"    integratedManifestSha256:sha(JSON.stringify(integrated.manifest,(_key,value)=>canonical(value)))};\n  assert.equal(binding.C,binding.candidateManifestSha256);assert.equal(binding.I,binding.integratedManifestSha256);\n  assert.equal(new Set(['C','I','T'].flatMap(key=>[before[key],binding[key]])).size,6);\n  assert.deepEqual(await readSourceProducerAfter597PredecessorCanonicalSource(),prior,'Whole fixed598 prior unchanged during first derivation');\n  assert.deepEqual(await sourceAfter597RegularSourceBytes(SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),\n    Buffer.from(raw,'utf8'),'SOURCE_AFTER597_NULL_METADATA_UNCHANGED');\n  return assertSourceProducerAfter597DerivedMetadata({schemaVersion:value.schemaVersion,release,version,binding,output:null});\n"}]};

function sourceCodePinsHistoricalCompiler(source){
  assert.equal(typeof source,'string');
  const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
  if(sha(source)===SOURCE_AFTER598_PARENT_COMPILER_REVIEW.afterSha256){
    for(const row of [...SOURCE_AFTER598_PARENT_COMPILER_REVIEW.hunks].reverse()){
      assert.equal(source.split(row.after).length,2,'SOURCE_AFTER598_COMPILER_EXACT_INVERSE');
      source=source.replace(row.after,()=>row.before);
    }
    assert.equal(sha(source),SOURCE_AFTER598_PARENT_COMPILER_REVIEW.beforeSha256,'SOURCE_AFTER598_COMPILER_WHOLE_INVERSE');
  }
  if(sha(source)===SOURCE_CODE_PINS_COMPILER_REVIEW.beforeSha256)return source;
  assert.equal(sha(source),SOURCE_CODE_PINS_COMPILER_REVIEW.afterSha256,'SOURCE_CODE_PINS_COMPILER_UNREVIEWED');
  let previous=source;
  for(const row of [...SOURCE_CODE_PINS_COMPILER_REVIEW.hunks].reverse()){
    assert.equal(previous.split(row.after).length,2,'SOURCE_CODE_PINS_COMPILER_EXACT_INVERSE');
    previous=previous.replace(row.after,()=>row.before);
  }
  assert.equal(sha(previous),SOURCE_CODE_PINS_COMPILER_REVIEW.beforeSha256,'SOURCE_CODE_PINS_COMPILER_WHOLE_INVERSE');
  return previous;
}

// The current parent arm is exercised through its entire real normal module.
// Every existing historical compiler inverse/hash remains a DATA-only assertion.
function assertWholeCompilerHistory(current){
  const raw=sourceCodePinsHistoricalCompiler(current);
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),SOURCE_AFTER597_FIRST_ISSUER_REVIEW.afterSha256);
  let oldCompiler=raw;for(const row of [...SOURCE_AFTER597_FIRST_ISSUER_REVIEW.hunks].reverse()){
    assert.equal(oldCompiler.split(row.after).length,2);oldCompiler=oldCompiler.replace(row.after,()=>row.before);
  }
  assert.equal(crypto.createHash('sha256').update(oldCompiler).digest('hex'),SOURCE_AFTER597_FIRST_ISSUER_REVIEW.beforeSha256);
  const begin='// SOURCE_AFTER597_COMPILER_BEGIN',end='// SOURCE_AFTER597_COMPILER_END';
  assert.equal(raw.split(begin).length,2);assert.equal(raw.split(end).length,2);
  const a=raw.indexOf(begin),b=raw.indexOf(end)+end.length,block=raw.slice(a,b);
  const ia=raw.indexOf('// SOURCE_AFTER597_COMPILER_IMPORT_BEGIN');
  const ib=raw.indexOf('// SOURCE_AFTER597_COMPILER_IMPORT_END')+'// SOURCE_AFTER597_COMPILER_IMPORT_END'.length+1;
  assert(ia>0&&ib>ia);
  const da=raw.indexOf('  // SOURCE_AFTER597_COMPILER_DISPATCH_BEGIN'),db=raw.indexOf('  // SOURCE_AFTER597_COMPILER_DISPATCH_END')+'  // SOURCE_AFTER597_COMPILER_DISPATCH_END'.length+1;
  assert(da>b&&db>da);
  const ca=raw.indexOf('  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_BEGIN'),cb=raw.indexOf('  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_END')+'  // SOURCE_AFTER597_FIRST_ISSUANCE_CLI_END'.length+1;
  assert(ca>b&&cb<=da);
  const original=(raw.slice(0,a)+raw.slice(b+2)).replace(raw.slice(ia,ib),'').replace('\n'+raw.slice(da,db),'').replace(raw.slice(ca,cb),'');
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'),
    '6eb36e879331c87ff52b91d97eb379beb149c9dd02738edfe8b6ec6eca770e85',
    'Whole original SOURCE compiler, old41/44 arm, wrappers and every historical issuer retained');
}

async function normalSource597Compiler(){
  const raw=await fs.readFile(new URL('./build-source-producer-successor.mjs',import.meta.url),'utf8');
  assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),SOURCE_AFTER598_PARENT_COMPILER_REVIEW.afterSha256);
  assertWholeCompilerHistory(raw);
  return import('./build-source-producer-successor.mjs');
}

test('SOURCE after597 compiler transforms genuine canonical CODE and proves entire metadata/numerical inverse',async()=>{
  const api=await normalSource597Compiler();
  const core=await api.prepareSourceProducerAfter597CompilerTemplate();
  let before=core.canonicalTemplate;
  const insertionForBefore=core.aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  before=before.replace(insertionForBefore,'');for(const row of [...core.changes].reverse())before=before.replace(row.after,()=>row.before);
  assert.equal(crypto.createHash('sha256').update(before).digest('hex'),SOURCE_PRODUCER_AFTER597_PARENT.before.canonicalSha256);
  assert.equal(core.transactionalWrapperPrepared,true);assert.equal(core.migrationIssued,false);
  assert(core.migrationTemplate.includes('SOURCE_PRODUCER_EXACT_INSTALLED598_REQUIRED'));
  assert(core.migrationTemplate.includes(core.unissuedMarkers.version));
  for(const key of ['C','I','T'])assert(core.migrationTemplate.includes(core.unissuedMarkers[key]));
  assert.equal(core.postgresRun,false);
  assert.equal(core.binding,null);assert.equal(core.output,null);assert.equal(core.migration,null);
  assert.equal(core.productionAuthority,false);assert.equal(core.installationPerformed,false);
  assert.equal(core.sqlExecuted,false);assert.equal(core.numericalSqlRulesChanged,false);
  assert.equal(core.wholeCanonicalInverse,true);
  for(const value of Object.values(core.unissuedMarkers))assert(!/^[a-f0-9]{64}$/.test(value));
  assert(!/^[0-9]{14}$/.test(core.unissuedMarkers.version));
  assert.equal(core.aliases.length,3);assert.equal(core.changes.length,8);
  const contract=source597Definition(core.canonicalTemplate,'ravradar_ravscore_checkpoint_contract');
  const oid=/  v_validator_oids oid\[\] := array\[([\s\S]*?)\n  \];/.exec(contract);
  assert(oid);assert.equal((oid[1].match(/pg_catalog\.to_regprocedure/g)??[]).length,48);
  assert.equal((contract.match(/\|\| v_[a-z0-9_]+_definition/g)??[]).length+1,51);
  const original=sourceProducerAfter597PredecessorCompilationLayout(before);
  assert(contract.includes(original.checkpoint.slice(0,-1)),'Whole45/48/ask597 prefix retained');
  const insertion=core.aliases.map(row=>row.definition+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  let inverse=core.canonicalTemplate;assert.equal(inverse.split(insertion).length,2);inverse=inverse.replace(insertion,'');
  for(const row of [...core.changes].reverse()){
    assert.equal(inverse.split(row.after).length,2);inverse=inverse.replace(row.after,()=>row.before);
  }
  assert.equal(inverse,before,'Independent whole canonical inverse, no numeric rewriting');
  const replaced=new Set(core.changes.map(row=>row.name));
  for(const match of before.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm))
    if(!replaced.has(match[1]))assert.equal(source597Definition(core.canonicalTemplate,match[1]),source597Definition(before,match[1]));
  for(const suffix of ['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason']){
    const row=core.changes.find(row=>row.name==='ravradar_ravscore_checkpoint_'+suffix);assert(row);
    let unmapped=row.after;
    for(const key of ['C','I','T'])unmapped=unmapped.split(core.unissuedMarkers[key]).join(SOURCE_PRODUCER_AFTER597_PARENT.before[key]);
    assert.equal(unmapped,row.before,'Numerical validator body is byte-identical after exact metadata inverse');
  }

});

test('SOURCE after597 compiler refuses changed source, caller tuples and real build before operands or I/O',async()=>{
  const api=await normalSource597Compiler();let operands=0;
  const hostile=new Proxy({},{get(){operands++;throw new Error('UNEXPECTED_OPERAND');},
    ownKeys(){operands++;throw new Error('UNEXPECTED_OPERAND');},getPrototypeOf(){operands++;throw new Error('UNEXPECTED_OPERAND');}});
  assert.throws(()=>api.compileSourceProducerAfter597Template('',hostile),/No caller-selected/);
  assert.throws(()=>api.compileSourceProducerAfter597Template('changed source'),error=>error.code==='ERR_ASSERTION'
    &&error.actual===crypto.createHash('sha256').update('changed source').digest('hex')
    &&error.expected===SOURCE_PRODUCER_AFTER597_PARENT.before.canonicalSha256);
  for(const args of [[],[hostile]])for(const invoke of [api.prepareSourceProducerAfter597SuccessorStructure,api.buildSourceProducerAfter597BindingSuccessor,api.runSourceProducerAfter597Compiler])
    await assert.rejects(invoke(...args),/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  await assert.rejects(api.prepareSourceProducerAfter597CompilerTemplate(hostile),/No caller-selected/);
  assert.equal(operands,0);
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.binding,null);
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.output,null);
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,null);
});

import {statisticsPreferenceRevisionCatalogQuery as source597StatisticsQuery}
  from './verify-account-assistant-schema.mjs';

import {SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH,sourceProducerAfter597DerivedMetadataFromText,
  assertSourceProducerAfter597DerivedMetadata,assertSourceProducerAfter597Release}
  from './lib/source-producer-after597-derived-metadata.mjs';

test('SOURCE after597 first issuance canonical NULL DATA rejects ambiguous and executable metadata',()=>{
  const empty=()=>({schemaVersion:'source-producer-after597-derived-metadata-v1',release:null,version:null,binding:null,output:null});
  const raw=JSON.stringify(empty(),null,2)+'\n';
  assert.deepEqual(sourceProducerAfter597DerivedMetadataFromText(raw),empty());
  assert(Object.isFrozen(sourceProducerAfter597DerivedMetadataFromText(raw)));
  const duplicate=raw.replace('  "release": null,','  "release": null,\n  "release": null,');
  const reordered=JSON.stringify({release:null,schemaVersion:empty().schemaVersion,version:null,binding:null,output:null},null,2)+'\n';
  for(const text of [duplicate,reordered,JSON.stringify(empty()),raw+'\n',raw.replace(/\n/g,'\r\n'),'\ufeff'+raw,
    raw.replace('"release"','"relea\\u0073e"'),raw+'// executable',raw+' '.repeat(8193)])
    assert.throws(()=>sourceProducerAfter597DerivedMetadataFromText(text));
  let invoked=0;const accessor=empty();Object.defineProperty(accessor,'release',{enumerable:true,get(){invoked++;throw Error('GETTER');}});
  const hidden=empty();Object.defineProperty(hidden,'extra',{value:null});const symbolic=empty();symbolic[Symbol('extra')]=null;
  for(const value of [accessor,hidden,symbolic,Object.assign(Object.create(null),empty()),{...empty(),extra:null},
    {...empty(),version:SCALAR597_LATER_H0_BINDING.version},{...empty(),release:'4.0.597'},
    {...empty(),output:SCALAR597_LATER_H0_OUTPUT},
    {...empty(),release:'4.0.597',version:SCALAR597_LATER_H0_BINDING.version,binding:SCALAR597_LATER_H0_BINDING}])
    assert.throws(()=>assertSourceProducerAfter597DerivedMetadata(value));
  assert.equal(invoked,0);
  for(const release of ['4.0.597','4.0.598','4.0.0598','4.0.598-dev','5.0.1',null,{},'4.0.9007199254740992'])
    assert.throws(()=>assertSourceProducerAfter597Release(release));
});

test('SOURCE after597 first issuance normal issuer rejects caller options and unissued output before I/O',async t=>{
  const api=await normalSource597Compiler();let calls=0;
  const hostile=new Proxy({},{get(){calls++;throw Error('OPERAND');},ownKeys(){calls++;throw Error('OPERAND');},getPrototypeOf(){calls++;throw Error('OPERAND');}});
  for(const key of ['readFile','writeFile','appendFile','mkdir','lstat','realpath'])
    t.mock.method(fs,key,()=>{calls++;throw Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{calls++;throw Error('UNEXPECTED_NETWORK');});
  for(const args of [[],[null],[{}],[[]],[hostile],[()=>{}],[''],['2026-11-05'],['--source'],['20261105000000',hostile]])
    await assert.rejects(api.deriveSourceProducerAfter597FirstBinding(...args),/SOURCE_AFTER597_TIMESTAMP_ONLY|ERR_ASSERTION/);
  await assert.rejects(api.deriveSourceProducerAfter597FirstBinding(SCALAR597_LATER_H0_BINDING.version),/SOURCE_AFTER597_LATER_VERSION_REQUIRED/);
  await assert.rejects(api.deriveSourceProducerAfter597FirstOutput(),/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  await assert.rejects(api.deriveSourceProducerAfter597FirstOutput(hostile),/SOURCE_AFTER597_NO_OUTPUT_OPTIONS/);
  assert.equal(calls,0);
});

test('SOURCE after597 first issuance actual package598 and physical NULL refuse later-release requirement before builders',async()=>{
  const api=await normalSource597Compiler();
  const root=fileURLToPath(new URL('../',import.meta.url));
  const file=path.join(root,SOURCE_PRODUCER_AFTER597_DERIVED_METADATA_PATH),before=await fs.readFile(file);
  assert.equal(JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version,'4.0.598');
  const empty=sourceProducerAfter597DerivedMetadataFromText(before.toString('utf8'));
  assert.equal(empty.release,null);assert.equal(empty.version,null);assert.equal(empty.binding,null);assert.equal(empty.output,null);
  await assert.rejects(api.deriveSourceProducerAfter597FirstBinding('20261106000000'),/SOURCE_AFTER597_LATER_RELEASE_REQUIRED/);
  assert.deepEqual(await fs.readFile(file),before);
  assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.binding,null);assert.equal(SOURCE_PRODUCER_AFTER597_PARENT.output,null);
});

test('SOURCE after597 staged original reader remains unissued before operands, filesystem or transport',async t=>{
  const staged=await import('./lib/authenticated-frozen586-predecessor.mjs');
  const source=await import('./lib/source-producer-after597-parent.mjs');
  assert.equal(source.SOURCE_PRODUCER_AFTER597_PARENT.binding,null);
  assert.equal(source.SOURCE_PRODUCER_AFTER597_PARENT.output,null);
  let operands=0,io=0;
  const untouched=new Proxy({}, {get(){operands++;throw Error('UNEXPECTED_OPERAND');},
    ownKeys(){operands++;throw Error('UNEXPECTED_OPERAND');},getPrototypeOf(){operands++;throw Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','realpath','lstat','open','rm'])
    t.mock.method(fs,name,()=>{io++;throw Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw Error('UNEXPECTED_FETCH');});
  await assert.rejects(()=>staged.readAuthenticatedSourceStaged597Predecessor(untouched),/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  assert.throws(()=>staged.assertAuthenticatedSourceStaged597Snapshot(untouched),/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  await assert.rejects(()=>staged.assertAuthenticatedSourceStaged597SnapshotFresh(untouched),/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  assert.equal(operands,0);assert.equal(io,0);
});

test('SOURCE after597 normal caller chain refuses unissued metadata before operands, Git, files or transport',async t=>{
  const family=await import('./lib/source-producer-after597-runtime-family.mjs');
  const stage=await import('./stage-source-producer-originals.mjs');
  const runtime=await import('./source-producer-runtime-transition.mjs');
  const prewrite=await import('./source-producer-prewrite.mjs');
  const plan=await import('./verify-source-producer-plan.mjs');
  const readiness=await import('./integrated-cutover-readiness.mjs');
  const reconcile=await import('./reconcile-private-runtime-checkpoint.mjs');
  const code=await import('./reconcile-source-producer-code-only.mjs');
  const origin=await import('./lib/established-native-current-origin.mjs');
  const snapshots=await import('./lib/authenticated-frozen586-predecessor.mjs');
  const view=await import('./check-assistant-later-h0-predecessor-source.mjs');
  let operands=0,io=0;
  const untouched=new Proxy({}, {get(){operands++;throw Error('UNEXPECTED_OPERAND');},
    ownKeys(){operands++;throw Error('UNEXPECTED_OPERAND');},getPrototypeOf(){operands++;throw Error('UNEXPECTED_OPERAND');}});
  for(const name of ['readFile','writeFile','appendFile','mkdir','realpath','lstat','open','rm'])
    t.mock.method(fs,name,()=>{io++;throw Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{io++;throw Error('UNEXPECTED_FETCH');});
  for(const call of [()=>family.requireSourceProducerBinding(untouched),()=>family.requireSourceProducerOutput(untouched),
    ()=>family.sourceProducerMigration(untouched),()=>readiness.sourceProducerRequiredMigrations(untouched),
    ()=>readiness.assertSourceProducerMigrationsApplied(untouched),
    ()=>snapshots.assertAuthenticatedSource598Snapshot(untouched),
    ()=>snapshots.assertAuthenticatedSourceStaged598Snapshot(untouched)])
    assert.throws(call,/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  const calls=[()=>family.readSourceProducerCanonicalSource(untouched),
    ()=>stage.selectInstalledSourceNormalRoute(untouched),()=>stage.stageSourceProducerOriginals(untouched),
    ()=>runtime.restoreAndPrepareSourceProducerRuntimeTransition(untouched),()=>runtime.prepareSourceProducerRuntimeTransition(untouched),
    ()=>runtime.assertSourceProducerRuntimeTransitionPrepared(untouched),()=>runtime.assertSourceProducerPrivateBootstrapArtifact(untouched),
    ()=>prewrite.verifySourceProducerPrewritePreservation(untouched),()=>prewrite.runSourceProducerPrewrite(untouched),
    ()=>plan.verifySourceProducerPlan(untouched),()=>readiness.assertSourceProducerMigrationPlan(untouched),
    ()=>reconcile.reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched),
    ()=>reconcile.reconcileSourcePrivateBootstrapRuntimeCheckpoint(untouched),
    ()=>reconcile.reconcileSourcePrivateRuntimeCheckpoint(untouched),()=>code.reconcileSourceProducerCodeOnly(untouched),
    ()=>origin.buildEstablishedNativeCurrent597MetadataAttestation(untouched,untouched),
    ()=>origin.assertEstablishedNativeCurrent597MetadataCheckpoint(untouched),
    ()=>origin.buildEstablishedNativeCurrent598MetadataAttestation(untouched,untouched),
    ()=>origin.assertEstablishedNativeCurrent598MetadataCheckpoint(untouched),
    ()=>snapshots.readAuthenticatedSource598Predecessor(untouched),
    ()=>snapshots.assertAuthenticatedSource598SnapshotFresh(untouched),
    ()=>snapshots.readAuthenticatedSourceStaged598Predecessor(untouched),
    ()=>snapshots.assertAuthenticatedSourceStaged598SnapshotFresh(untouched),
    ()=>view.withSource598OriginAssertionView(untouched)];
  for(const call of calls)await assert.rejects(call,/SOURCE_PRODUCER_AFTER597_UNISSUED/);
  assert.equal(operands,0);assert.equal(io,0);
  assert.equal(ACTIVE_ASSISTANT_SUCCESSOR,next);
});

test('SOURCE after597 normal caller pure classification retains genuine598 and rejects mixed historical families',async()=>{
  const family=await import('./lib/source-producer-after597-runtime-family.mjs');
  const stage=await import('./stage-source-producer-originals.mjs');
  const runtime=await import('./source-producer-runtime-transition.mjs');
  const old=family.SOURCE_PRODUCER_BEFORE;
  assert.deepEqual(old,{...ASSISTANT_AFTER597_BINDING,...ASSISTANT_AFTER597_OUTPUT});
  const descriptor={modelBinding:{modelBundleSha256:old.I},contractHashes:{continuationStateContractSha256:old.T}};
  assert.equal(runtime.sourceProducerRuntimePredecessorFamily(descriptor),'598');
  assert.throws(()=>runtime.sourceProducerRuntimePredecessorFamily({
    modelBinding:{modelBundleSha256:SCALAR597_LATER_H0_BINDING.I},
    contractHashes:{continuationStateContractSha256:SCALAR597_LATER_H0_BINDING.T}}));
  // Two actual historical identities exercise only the pure classifier. This
  // is no issued successor, validator, opaque handle or positive B/S evidence.
  const {SCALAR597_LATER_H0_BEFORE:historical}=await import('./lib/assistant-later-h0-successor-source.mjs');
  assert.equal(stage.sourceProducerOriginalStageFamily(descriptor,historical),'predecessor');
  assert.equal(stage.sourceProducerOriginalStageFamily({modelBinding:{modelBundleSha256:historical.I},
    contractHashes:{continuationStateContractSha256:historical.T}},historical),'current');
  for(const mixed of [
    {...descriptor,modelBinding:{modelBundleSha256:historical.I}},
    {...descriptor,contractHashes:{continuationStateContractSha256:historical.T}},{}]){
    assert.throws(()=>stage.sourceProducerOriginalStageFamily(mixed,historical));
    assert.throws(()=>runtime.sourceProducerRuntimePredecessorFamily(mixed));
  }
  assert.equal(family.sourceProducerReferenceHour('2026-11-04T04:00:00Z'),'2026-11-04T04:00:00.000Z');
  assert.equal(family.sourceProducerReferenceHour(H0),H0);
  for(const invalid of ['2026-11-04T04:30:00Z','2026-11-04T04:00:00+00:00','2026-11-32T04:00:00Z'])
    assert.throws(()=>family.sourceProducerReferenceHour(invalid));
});

test('SOURCE after597 normal caller request guards preserve ordinary saved and separate source grants',async()=>{
  const reconcile=await import('./reconcile-private-runtime-checkpoint.mjs');
  const ordinary={OPERATIONAL_ACTION:'integrated'};
  for(const key of ['COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION',
    'RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY','NATIVE_IDENTITY_RECOVERY'])ordinary[key]='false';
  reconcile.assertOrdinaryPrivateRuntimeCheckpointReconcileRequest(ordinary);
  assert.throws(()=>reconcile.assertOrdinaryPrivateRuntimeCheckpointReconcileRequest({...ordinary,CHECKPOINT_ONLY:'true'}));
  const saved={...ordinary,GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',CONFIRMATION:'DEPLOY-SAVED-WEATHER-REPAIR',
    PUBLISH_NEWEST_SAVED_WEATHER:'true'};
  for(const key of ['RESTART_ARCHIVED_WEATHER','UPGRADE_LAST_MILE_ENCLOSURE','UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',
    'UPGRADE_EXISTING_OWNER_EXPORT','UPGRADE_ACCOUNT_ASSISTANT','UPGRADE_STATISTICS_REVISION',
    'UPGRADE_ACCOUNT_STATISTICS_ASSISTANT','UPGRADE_NATIVE_ORIGINAL_CONTINUITY'])saved[key]='false';
  reconcile.assertSavedPrivateRuntimeCheckpointReconcileRequest(saved);
  reconcile.assertSavedPrivateRuntimeCheckpointReconcileRequest({...saved,UPGRADE_SOURCE_PRODUCER:'false'});
  for(const value of ['true','unknown',''])assert.throws(()=>reconcile.assertSavedPrivateRuntimeCheckpointReconcileRequest({...saved,UPGRADE_SOURCE_PRODUCER:value}));
  const source={...ordinary,INPUT_OPERATION:'source',CURRENT_FAMILY_COLD_START:'false',PRODUCE_HANDOFF:'false',
    QUICK_PROGRESS_SOURCE:'',CHECKPOINT_TARGET_HOUR:''};
  reconcile.assertSourcePrivateRuntimeCheckpointReconcileRequest(source);
  for(const key of ['COMPLETED_PRIVATE_RUNTIME','CHECKPOINT_ONLY','QUICK_CONFIRMATION','CURRENT_FAMILY_COLD_START',
    'PRODUCE_HANDOFF','NATIVE_IDENTITY_RECOVERY'])
    assert.throws(()=>reconcile.assertSourcePrivateRuntimeCheckpointReconcileRequest({...source,[key]:'true'}));
  assert.throws(()=>reconcile.assertSourcePrivateRuntimeCheckpointReconcileRequest({...source,INPUT_OPERATION:'saved'}));
  assert.equal(reconcile.requiresPrivateRuntimeCheckpointReconcile({modelBinding:{modelBundleSha256:SCALAR597_LATER_H0_BINDING.I},
    contractHashes:{continuationStateContractSha256:SCALAR597_LATER_H0_BINDING.T}}),true);
});

test('SOURCE after597 normal caller code-only pure policy rejects mixed grants and leaves unissued false selector inert',async()=>{
  const selector=await import('./select-source-producer-code-only-source.mjs');
  const environment={GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',
    GITHUB_RUN_ID:'1',GITHUB_SHA:SOURCE597_CODE_SOURCE_PROVENANCE.head,GITHUB_WORKFLOW:'Deploy RavRadar code-only repair',
    RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:'true',RAVRADAR_SOURCE_PRODUCER_PHASE:'before',
    RAVRADAR_SOURCE_PRODUCER_CONFIRMATION:'DEPLOY-CODE-ONLY-REPAIR',RAVRADAR_SOURCE_PRODUCER_WRITER_ACTIVE:'false',
    RAVRADAR_SOURCE_PRODUCER_RECOVERY_GATE_RESULT:'success',RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER:'false',
    RAVRADAR_SOURCE_PRODUCER_RECOVERY_RUN_ID:'',RAVRADAR_SOURCE_NORMAL_PRODUCER:'false',
    RAVRADAR_ACCOUNT_STATISTICS_ASSISTANT_UPGRADE_OPT_IN:'false'};
  selector.assertSourceProducerCodeOnlyCaller(environment);
  selector.assertSourceProducerCodeOnlyCaller({...environment,RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:'false',RAVRADAR_SOURCE_PRODUCER_PHASE:'installed'});
  for(const key of ['RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN','RAVRADAR_NEW_UNKNOWN_UPGRADE_OPT_IN',
    'PUBLISH_NEWEST_SAVED_WEATHER','CHECKPOINT_ONLY','RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY'])
    assert.throws(()=>selector.assertSourceProducerCodeOnlyCaller({...environment,[key]:'true'}));
  assert.throws(()=>selector.assertSourceProducerCodeOnlyCaller({...environment,RAVRADAR_SOURCE_PRODUCER_SAVED_WEATHER:'true'}));
  assert.equal(await selector.selectSourceProducerCodeOnlySource({RAVRADAR_SOURCE_PRODUCER_UPGRADE_OPT_IN:'false'}),false);
  await assert.rejects(selector.selectSourceProducerCodeOnlySource(environment),/SOURCE_PRODUCER_AFTER597_UNISSUED/);
});

test('SOURCE after597 normal caller same H0 relation rejects older and later original references',async()=>{
  const {assertSourceProducerSameH0CheckpointReference:relation}=await import('./reconcile-private-runtime-checkpoint.mjs');
  // Only reference values are tested; no S row, opaque original or binding is fabricated.
  relation(H0,H0);
  for(const previous of ['2026-11-04T03:00:00.000Z',later])
    assert.throws(()=>relation(previous,H0),/PAIRED_PUBLICATION_SOURCE597_SAME_H0_ONLY/);
  assert.throws(()=>relation(undefined,H0),/PAIRED_PUBLICATION_SOURCE597_SAME_H0_ARGUMENTS/);
});


// Permanent real CLI regression. A body extraction cannot prove ESM linking;
// missing modules/exports and generic exit1 must never count as the NULL guard.
test('SOURCE after597 full normal compiler CLI links real modules and refuses NULL before application I/O',async t=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const legacyPath=path.join(root,'scripts/lib/source-producer-binding.generated.json');
  const after597Path=path.join(root,'scripts/lib/source-producer-after597-binding.generated.json');
  const [legacyText,after597Text]=await Promise.all([fs.readFile(legacyPath,'utf8'),fs.readFile(after597Path,'utf8')]);
  assert.equal(legacyText,JSON.stringify({schemaVersion:'source-producer-derived-metadata-v1',
    version:null,binding:null,output:null},null,2)+'\n');
  assert.equal(after597Text,JSON.stringify({schemaVersion:'source-producer-after597-derived-metadata-v1',
    release:null,version:null,binding:null,output:null},null,2)+'\n');
  const {spawnSync}=await import('node:child_process');
  // No authentication/provider inputs or SOURCE grants are inherited. These
  // ordinary runtime keys are not capabilities and do not replace the compiler.
  const environment=Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','LANG','LC_ALL']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]]));
  Object.assign(environment,{GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'});
  const result=spawnSync(process.execPath,[path.join(root,'scripts/build-source-producer-successor.mjs'),'--check'],
    {cwd:root,env:environment,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:1024*1024});
  assert.equal(result.error,undefined,'The actual normal compiler must start and terminate within its bound');
  assert.equal(result.signal,null);assert.equal(result.status,1);assert.equal(result.stdout,'');
  const stderr=result.stderr.replace(/\r\n?/g,'\n');
  const guards=[...stderr.matchAll(/^AssertionError \[ERR_ASSERTION\]: ([^\n]+)$/gm)].map(row=>row[1]);
  assert.deepEqual(guards,['SOURCE_PRODUCER_AFTER597_UNISSUED'],'Only the exact issued-output NULL refusal is accepted');
  assert.match(stderr,/at requireSourceProducerAfter597Binding \([^\n]*source-producer-after597-parent\.mjs:\d+:\d+\)/);
  assert.match(stderr,/at requireSourceProducerAfter597Output \([^\n]*source-producer-after597-parent\.mjs:\d+:\d+\)/);
  assert.match(stderr,/at runSourceProducerAfter597Compiler \([^\n]*build-source-producer-successor\.mjs:\d+:\d+\)/);
  assert.match(stderr,/actual: null/);assert.match(stderr,/expected: true/);
  assert.doesNotMatch(stderr,/ERR_MODULE_NOT_FOUND|ERR_PACKAGE_PATH_NOT_EXPORTED|does not provide an export|SyntaxError|Cannot find (?:module|package)/);
  assert.equal(await fs.readFile(legacyPath,'utf8'),legacyText);
  assert.equal(await fs.readFile(after597Path,'utf8'),after597Text);
  t.diagnostic(JSON.stringify({actualCompilerExitCode:result.status,nullGuard:guards[0],
    stderrSha256:crypto.createHash('sha256').update(result.stderr).digest('hex')}));
});

// Whole-module CODE/DATA regression. Both Source metadata files stay NULL;
// fixture fingerprints and real normal C/I renders are not Source capabilities.
test('SOURCE after597 normal CODE DATA fingerprints preserve NULL and enforce physical I and cutoff',{timeout:60000},async t=>{
  const root=fileURLToPath(new URL('../',import.meta.url));
  const {execFileSync}=await import('node:child_process');
  const {performance}=await import('node:perf_hooks');
  const productFiles=['scripts/lib/source-producer-binding.generated.json',
    'scripts/lib/source-producer-after597-binding.generated.json',
    'scripts/lib/source-producer-after597-code-pins.generated.json',
    'js/core/ravscore-model-bundle.generated.js','scripts/rollback-assets/ravscore-model-bundle.generated.js'];
  const originals=new Map(await Promise.all(productFiles.map(async file=>[file,await fs.readFile(path.join(root,file))])));
  const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
  const actualCompiler=await fs.readFile(path.join(root,'scripts/build-source-producer-successor.mjs'),'utf8');
  await t.test('exact whole compiler history inverse retains old oracles and refuses unknown or partial bodies',()=>{
    assert.equal(assertWholeCompilerHistory(actualCompiler),undefined);
    assert.equal(sha(sourceCodePinsHistoricalCompiler(actualCompiler)),SOURCE_CODE_PINS_COMPILER_REVIEW.beforeSha256);
    assert.equal(sourceCodePinsHistoricalCompiler(sourceCodePinsHistoricalCompiler(actualCompiler)),sourceCodePinsHistoricalCompiler(actualCompiler));
    assert.throws(()=>sourceCodePinsHistoricalCompiler(actualCompiler.slice(0,-1)),/SOURCE_CODE_PINS_COMPILER_UNREVIEWED/);
    const first=SOURCE_CODE_PINS_COMPILER_REVIEW.hunks[0];
    assert.throws(()=>sourceCodePinsHistoricalCompiler(actualCompiler.replace(first.after,()=>first.before)),/SOURCE_CODE_PINS_COMPILER_UNREVIEWED/);
  });
  const temporaryRoot=await fs.realpath(os.tmpdir());
  const fixture=await fs.realpath(await fs.mkdtemp(path.join(temporaryRoot,'rr-source-code-data-')));
  const startedSetup=performance.now();
  try {
    // Copy the complete real tracked source context, including all normal SQL
    // and static JSON companions. No compiler/module/FS implementation is stubbed.
    const environment={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_TERMINAL_PROMPT:'0'};
    const files=execFileSync('git',['-c','protocol.allow=never','-C',root,'ls-files','-z'],
      {env:environment,encoding:'utf8',timeout:30000,maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']})
      .split('\0').filter(Boolean);
    assert(files.length>3000,'Use the complete actual source checkout, not a small substitute fixture');
    const directories=[...new Set(files.map(file=>path.dirname(path.join(fixture,file))))].sort((a,b)=>a.length-b.length);
    for(const directory of directories)await fs.mkdir(directory,{recursive:true});
    let nextFile=0;
    await Promise.all(Array.from({length:8},async()=>{
      while(nextFile<files.length) {
        const file=files[nextFile++];
        assert(!path.isAbsolute(file)&&!file.split(/[\\/]/).includes('..'));
        await fs.copyFile(path.join(root,file),path.join(fixture,file));
      }
    }));
    const family=await import(pathToFileURL(path.join(fixture,'scripts/lib/source-producer-after597-runtime-family.mjs')).href);
    const compiler=await import(pathToFileURL(path.join(fixture,'scripts/build-source-producer-successor.mjs')).href);
    const cBuilder=await import(pathToFileURL(path.join(fixture,'scripts/build-candidate-g-rollback-bundle.mjs')).href);
    const iBuilder=await import(pathToFileURL(path.join(fixture,'scripts/build-ravscore-model-bundle.mjs')).href);
    assert.equal(typeof compiler.deriveSourceProducerAfter597CodePins,'function');
    const legacy='scripts/lib/source-producer-binding.generated.json';
    const metadata='scripts/lib/source-producer-after597-binding.generated.json';
    const data=family.SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH;
    const metadataText=originals.get(metadata).toString('utf8');
    assert.deepEqual(JSON.parse(metadataText),{schemaVersion:'source-producer-after597-derived-metadata-v1',
      release:null,version:null,binding:null,output:null});
    assert.deepEqual(JSON.parse(originals.get(legacy)),{schemaVersion:'source-producer-derived-metadata-v1',version:null,binding:null,output:null});
    const initialData=family.sourceProducerAfter597CodePinsFromText(await fs.readFile(path.join(fixture,data),'utf8'));
    assert.equal(initialData.files,null);
    let sourceClockCalls=0;
    const unissued=error=>error?.code==='ERR_ASSERTION'&&error.message==='SOURCE_PRODUCER_AFTER597_UNISSUED';
    await t.test('actual runtime NULL is first before arguments or clock and never becomes a capability',()=>{
      assert.throws(()=>family.assertSourceProducerAfter597StaticCode(()=>{sourceClockCalls++;throw new Error('UNEXPECTED_CLOCK');}),unissued);
      assert.throws(()=>family.assertSourceProducerAfter597StaticCode({root:fixture}),unissued);
      assert.equal(sourceClockCalls,0);
    });
    const build=async()=>{
      // Exactly the noargs raw producer shared by the real compiler. The two
      // normal noargs builders/renderers supply expected C/I; metadata stays NULL.
      const pins=family.computeSourceProducerAfter597CodePins();
      await fs.writeFile(path.join(fixture,data),JSON.stringify(pins,null,2)+'\n');
      assert.deepEqual(family.assertSourceProducerAfter597CodePinsPrepared(),pins);
      const candidate=await cBuilder.computeCandidateGRollbackBundle();
      const candidateText=cBuilder.renderCandidateGRollbackGeneratedModule(candidate);
      await fs.writeFile(path.join(fixture,'scripts/rollback-assets/ravscore-model-bundle.generated.js'),candidateText);
      const integrated=await iBuilder.computeRavScoreModelBundle();
      const integratedText=iBuilder.renderGeneratedBundleModule(integrated);
      await fs.writeFile(path.join(fixture,'js/core/ravscore-model-bundle.generated.js'),integratedText);
      return {pins,candidate,integrated,candidateText,integratedText,
        expected:{C:candidate.modelBundleSha256,I:integrated.modelBundleSha256,metadataText},
        dataText:await fs.readFile(path.join(fixture,data),'utf8')};
    };
    const baseline=await build();let baselineTicks=0;
    const startHash=performance.now();
    assert.equal(family.assertSourceProducerAfter597CodeData(baseline.expected,()=>{baselineTicks++;}),undefined);
    const hashElapsedMs=performance.now()-startHash;
    await t.test('real compiler-shared raw pins and normal I seal validate only CODE DATA with fresh physical JSON',async()=>{
      assert.equal(initialData.files,null,'The original parsed NULL object is not used as a mutable import cache');
      assert.equal(baseline.pins.files.length,family.SOURCE_PRODUCER_AFTER597_RAW_CODE_FILES.length);
      assert(baseline.pins.files.length>400);
      assert(baseline.integrated.manifest.files.some(row=>row.path===data&&row.sha256===sha(baseline.dataText)));
      assert.equal(family.assertSourceProducerAfter597CodeData(baseline.expected),undefined);
      assert.throws(()=>family.assertSourceProducerAfter597StaticCode(),unissued);
      assert.equal(await fs.readFile(path.join(fixture,metadata),'utf8'),metadataText);
      assert.deepEqual(await fs.readFile(path.join(fixture,legacy)),originals.get(legacy));
    });
    const refused=error=>error?.code==='SOURCE_AFTER597_CODE_INPUT_REFUSED';
    const iFile=path.join(fixture,'js/core/ravscore-model-bundle.generated.js');
    await t.test('physical I manifest tamper cannot reuse its expected normal binding',async()=>{
      const altered={...baseline.integrated,manifest:{...baseline.integrated.manifest,
        files:baseline.integrated.manifest.files.map(row=>row.path===data?{...row,sha256:'0'.repeat(64)}:row)}};
      await fs.writeFile(iFile,iBuilder.renderGeneratedBundleModule(altered));
      try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
      finally{await fs.writeFile(iFile,baseline.integratedText);}
    });
    await t.test('fingerprint DATA tamper is rejected against the sealed I row',async()=>{
      const altered=JSON.parse(baseline.dataText);altered.files[0].sha256='0'.repeat(64);
      await fs.writeFile(path.join(fixture,data),JSON.stringify(altered,null,2)+'\n');
      try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
      finally{await fs.writeFile(path.join(fixture,data),baseline.dataText);}
    });
    const last=baseline.pins.files.at(-1),file=path.join(fixture,last.path),originalFile=await fs.readFile(file);
    assert.match(last.path,/\.(?:js|mjs|ts)$/);
    await t.test('same-size actual working-byte change is rejected',async()=>{
      const altered=Buffer.from(originalFile);altered[altered.length-1]^=1;await fs.writeFile(file,altered);
      try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
      finally{await fs.writeFile(file,originalFile);}
    });
    await t.test('actual missing file and directory mode are refused',async()=>{
      const held=file+'.code-test-held';await fs.rename(file,held);
      try {
        assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),error=>error?.code==='ENOENT'&&error.path===file);
        await fs.mkdir(file);
        try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
        finally{await fs.rmdir(file);}
      } finally{await fs.rename(held,file);}
    });
    await t.test('actual hardlink alias is refused',async()=>{
      const alias=file+'.code-test-alias';await fs.link(file,alias);
      try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
      finally{await fs.unlink(alias);}
    });
    await t.test('actual executable mode is refused where POSIX mode bits exist',async sub=>{
      if(process.platform==='win32'){sub.skip('Windows does not represent POSIX executable mode; regular/directory/junction cases still execute');return;}
      const mode=(await fs.stat(file)).mode&0o7777;await fs.chmod(file,0o755);
      try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
      finally{await fs.chmod(file,mode);}
    });
    await t.test('actual parent directory symlink or Windows junction is refused',async()=>{
      const directory=path.dirname(file),held=directory+'.code-test-held';await fs.rename(directory,held);
      try {
        await fs.symlink(held,directory,process.platform==='win32'?'junction':'dir');
        try{assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected),refused);}
        finally{await fs.unlink(directory);}
      } finally{await fs.rename(held,directory);}
    });
    await t.test('DATA API refuses a caller root or extra operands',()=>{
      assert.throws(()=>family.assertSourceProducerAfter597CodeData({...baseline.expected,root:fixture}),refused);
      assert.throws(()=>family.assertSourceProducerAfter597CodeData(baseline.expected,undefined,fixture),refused);
    });
    let paddedTicks=0;
    await t.test('real additional chunks check cutoff and preserve the first value with closed readers',async()=>{
      // Extend only the LAST copied source file with a harmless exact2chunk
      // comment, then rederive all DATA and C/I through the normal APIs.
      // No product file or Source metadata/output is changed.
      const chunk=64*1024,padding='\n/*'+'x'.repeat(2*chunk-6)+'*/\n';
      assert.equal(Buffer.byteLength(padding),2*chunk);
      await fs.writeFile(file,Buffer.concat([originalFile,Buffer.from(padding)]));
      const padded=await build();
      assert.equal(Buffer.byteLength(padded.candidateText),Buffer.byteLength(baseline.candidateText));
      assert.equal(Buffer.byteLength(padded.integratedText),Buffer.byteLength(baseline.integratedText));
      assert.equal(Math.ceil(Buffer.byteLength(padded.dataText)/chunk),Math.ceil(Buffer.byteLength(baseline.dataText)/chunk));
      assert.equal(family.assertSourceProducerAfter597CodeData(padded.expected,()=>{paddedTicks++;}),undefined);
      assert.equal(paddedTicks-baselineTicks,4,'Both sides of every additional64KiB read must call the real constraining clock seam');
      const first=Object.freeze({kind:'CODE_DATA_LOCAL_CLOCK_EXPIRED_NO_SOURCE_AUTHORITY'});
      let ticks=0,cutoff=Infinity,caught;
      try {
        family.assertSourceProducerAfter597CodeData(padded.expected,()=>{
          const now=performance.now();if(++ticks===baselineTicks)cutoff=now;
          if(!(now<cutoff))throw first;
        });
      } catch(error){caught=error;}
      assert.equal(caught,first,'The first actual callback value must be preserved');
      assert.equal(ticks,baselineTicks);
      assert.equal(family.assertSourceProducerAfter597CodeData(padded.expected),undefined,
        'A chunk cutoff must close its readonly descriptor rather than poison future CODE reads');
      assert.throws(()=>family.assertSourceProducerAfter597StaticCode(),unissued);
    });
    assert.equal(await fs.readFile(path.join(fixture,metadata),'utf8'),metadataText);
    assert.deepEqual(await fs.readFile(path.join(fixture,legacy)),originals.get(legacy));
    t.diagnostic(JSON.stringify({scope:'PURE_CODE_DATA_NOT_SOURCE_SESSION_SQL_OR_NATIVE',copiedTrackedFiles:files.length,
      fixtureSetupMs:startHash-startedSetup,rawFiles:baseline.pins.files.length,
      rawBytes:baseline.pins.files.reduce((sum,row)=>sum+row.bytes,0),fingerprintDataBytes:Buffer.byteLength(baseline.dataText),
      baselineClockCalls:baselineTicks,paddedClockCalls:paddedTicks,baselineHashElapsedMs:hashElapsedMs,
      sourceOutput:'NULL_UNISSUED',genuineSourceJobKernelCapacityProved:false}));
  } finally {
    const relative=path.relative(temporaryRoot,path.resolve(fixture));
    assert(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(fixture).startsWith('rr-source-code-data-'));
    await fs.rm(fixture,{recursive:true,force:true});
    for(const [relative,bytes] of originals)assert.deepEqual(await fs.readFile(path.join(root,relative)),bytes,
      'Product DATA/metadata/generated models remain byte-identical');
  }
});
