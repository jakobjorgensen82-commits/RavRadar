// Actual SOURCE phase refusals and local policy only, not positive B/S,
// original-preservation, PostgreSQL, legacy-follower or production proof.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import test from 'node:test';
import './test-source-producer-sync-binding.mjs';
import './test-source-producer-workflow.mjs';
import {SOURCE_PRODUCER_BINDING,SOURCE_PRODUCER_OUTPUT,requireSourceProducerBinding,requireSourceProducerOutput} from './lib/source-producer-successor-source.mjs';
import {stageSourceProducerOriginals} from './stage-source-producer-originals.mjs';
import {runSourceProducerPrewrite,verifySourceProducerPrewritePreservation} from './source-producer-prewrite.mjs';
import {verifySourceProducerPlan,sourceProducerSqlWriteRequired} from './verify-source-producer-plan.mjs';
import {reconcileSourceCodeOnlyPrivateRuntimeCheckpoint} from './reconcile-private-runtime-checkpoint.mjs';
import {reconcileSourceProducerCodeOnly} from './reconcile-source-producer-code-only.mjs';
import {runSourceProducerLegacyCompatibility} from './test-source-producer-legacy-compatibility.mjs';
import {modelSourceRelativeModuleSpecifiers} from './lib/model-source-imports.mjs';
import {sourceProducerRequiredMigrations} from './integrated-cutover-readiness.mjs';

const sourceIssued=SOURCE_PRODUCER_BINDING!==null;
if(sourceIssued){requireSourceProducerBinding();requireSourceProducerOutput();}
else assert.equal(SOURCE_PRODUCER_OUTPUT,null,'No partial SOURCE issuance');

test('SOURCE preserves the never-installed first proposal without staging it as an intermediate', {skip:!sourceIssued}, async()=>{
  const old='20261021020000_source_producer_original_bound_successor.sql';
  const bytes=await fs.readFile(new URL('./fixtures/'+old+'.txt',import.meta.url));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
    'd8986e0721129a0d0ad996a3a8c6f71c5b0e9dd487883e9d2417843a68599517',
    'Whole never-installed original SQL is retained, not rewritten');
  const required=sourceProducerRequiredMigrations();
  assert.equal(required.length,57);
  assert.equal(required.at(-2).version,'20261022181403','Same genuine587 predecessor');
  assert.equal(required.at(-1).version,SOURCE_PRODUCER_BINDING.version);
  assert.notEqual(required.at(-1).version,'20261021020000');
  assert(!required.some(row=>row.filename===old),'Old source-only proposal is not an installation step');
});

test(sourceIssued?'SOURCE issued staging and prewrite reject invalid call forms before operands or IO':'SOURCE original staging and prewrite refuse unissued before operands, clients or IO',async t=>{
  if(sourceIssued){
    let operands=0,io=0;
    const untouched=new Proxy({},{
      get(){operands++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},
      ownKeys(){operands++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},
      getPrototypeOf(){operands++;throw new Error('UNEXPECTED_OPERAND_ACCESS');},
    });
    for(const name of ['readFile','appendFile','writeFile','mkdir','realpath','lstat'])
      t.mock.method(fs,name,()=>{io++;throw new Error('UNEXPECTED_IO');});
    t.mock.method(globalThis,'fetch',()=>{io++;throw new Error('UNEXPECTED_FETCH');});
    try{
      for(const call of [
        ()=>stageSourceProducerOriginals(untouched),()=>runSourceProducerPrewrite(untouched),
        ()=>verifySourceProducerPrewritePreservation(untouched,untouched),
        ()=>verifySourceProducerPrewritePreservation({}),
        ()=>verifySourceProducerPlan(untouched,untouched),()=>verifySourceProducerPlan({}),
        ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched,untouched),
        ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint({}),
        ()=>reconcileSourceProducerCodeOnly(untouched),()=>runSourceProducerLegacyCompatibility(untouched),
      ])await assert.rejects(call,{code:'ERR_ASSERTION'});
      const previousEvent=process.env.GITHUB_EVENT_NAME;
      process.env.GITHUB_EVENT_NAME='push';
      try{
        for(const call of [()=>stageSourceProducerOriginals(),()=>runSourceProducerPrewrite(),
          ()=>verifySourceProducerPlan({phase:'before',migrationListText:'',dryRunText:'',migrationsDirectory:'unused-relative'}),
          ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint({privateRoot:'unused',bundlePath:'unused'})])
          await assert.rejects(call,{code:'ERR_ASSERTION'});
      }finally{
        if(previousEvent===undefined)delete process.env.GITHUB_EVENT_NAME;else process.env.GITHUB_EVENT_NAME=previousEvent;
      }
      assert.equal(operands,0);assert.equal(io,0);
    }finally{t.mock.restoreAll();}
    return;
  }
  assert.equal(SOURCE_PRODUCER_BINDING,null);assert.equal(SOURCE_PRODUCER_OUTPUT,null);
  let inputAccesses=0,ioCalls=0;
  const untouched=new Proxy({}, {
    get(){inputAccesses++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
    ownKeys(){inputAccesses++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
    getPrototypeOf(){inputAccesses++;throw new Error('UNEXPECTED_INPUT_ACCESS');},
  });
  for(const name of ['readFile','appendFile','writeFile','mkdir','realpath','lstat'])
    t.mock.method(fs,name,()=>{ioCalls++;throw new Error('UNEXPECTED_IO');});
  t.mock.method(globalThis,'fetch',()=>{ioCalls++;throw new Error('UNEXPECTED_FETCH');});
  try{
    for(const call of [()=>stageSourceProducerOriginals(),()=>stageSourceProducerOriginals(untouched),
      ()=>runSourceProducerPrewrite(),()=>runSourceProducerPrewrite(untouched),
      ()=>verifySourceProducerPrewritePreservation(untouched),
      ()=>verifySourceProducerPrewritePreservation(untouched,untouched),
      ()=>verifySourceProducerPlan(untouched),()=>verifySourceProducerPlan(untouched,untouched),
      ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched),
      ()=>reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(untouched,untouched),
      ()=>reconcileSourceProducerCodeOnly(),()=>reconcileSourceProducerCodeOnly(untouched),
      ()=>runSourceProducerLegacyCompatibility(),()=>runSourceProducerLegacyCompatibility(untouched)])
      await assert.rejects(call,/SOURCE_PRODUCER_UNISSUED/);
    assert.equal(inputAccesses,0);assert.equal(ioCalls,0);
  }finally{t.mock.restoreAll();}
});

test('SOURCE code-only reconciliation admits only reviewed bytes and preserves the complete older source',async()=>{
  const file='scripts/reconcile-private-runtime-checkpoint.mjs';
  const g1Source=(await fs.readFile(new URL('./reconcile-private-runtime-checkpoint.mjs',import.meta.url),'utf8'))
    .replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
  // Test-only historical projection. It is never imported or used as runtime.
  // Separately prove the entire actual G1 -> genuine587 inverse, not an alias.
  const reviewBytes=await fs.readFile(new URL('./lib/source-producer-g1-reconcile-oracle.json',import.meta.url));
  const g1Hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(reviewBytes.length,40445);
  assert.equal(g1Hash(reviewBytes),'b5665a924c0a975c15bc159d25986a2efd8d1e6cce5d97456a51ffba8fa34f62');
  const review=JSON.parse(reviewBytes);
  assert.equal(review.schemaVersion,1);
  assert.equal(review.kind,'TEST_ONLY_EXACT_GENUINE587_G1_RECONCILE_ORACLE');
  assert.equal(review.file,file);
  assert.equal(review.actualSha256,'5088bf0e120208a352b8ea5e3799cd7f5ba31c50b5214031dc28289ccefe11f7');
  assert.deepEqual(Object.keys(review.projections),['genuine587','historicalV2']);
  assert.equal(review.projections.genuine587.hunks.length,10);
  assert.equal(review.projections.historicalV2.hunks.length,9);
  const projectG1=(value,name)=>{
    assert.equal(typeof value,'string');
    assert.equal(g1Hash(value),review.actualSha256,'Only the whole actual G1 may enter either exact projection');
    assert(['genuine587','historicalV2'].includes(name));
    const projection=review.projections[name];
    let result=value;
    for(const hunk of projection.hunks){
      assert.equal(result.split(hunk.before).length,2,'One complete reviewed G1 literal');
      result=result.replace(hunk.before,()=>hunk.after);
    }
    assert.equal(g1Hash(result),projection.sha256,'Whole pinned projection, never selected-field preservation');
    let roundtrip=result;
    for(const hunk of [...projection.hunks].reverse()){
      assert.equal(roundtrip.split(hunk.after).length,2,'One complete reviewed reverse literal');
      roundtrip=roundtrip.replace(hunk.after,()=>hunk.before);
    }
    assert.equal(roundtrip,value,'Every actual G1 byte survives the reverse projection');
    return result;
  };
  assert.equal(g1Hash(projectG1(g1Source,'genuine587')),
    '208e221e7b1f62726866b3d81e2708fe1a5d90e58fbd632a4fac0e2e9b2fa636');
  const g1Imports=modelSourceRelativeModuleSpecifiers(g1Source,file);
  assert(Object.isFrozen(g1Imports));assert.equal(g1Imports.length,21);
  assert.deepEqual(g1Imports,review.actualImports);
  for(const name of ['genuine587','historicalV2']){
    for(const hunk of review.projections[name].hunks){
      const changed=g1Source.replace(hunk.before,()=>hunk.before+'// UNKNOWN G1 literal mutation\n');
      assert.notEqual(changed,g1Source);
      assert.throws(()=>projectG1(changed,name));
      assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
    }
    for(const changed of [g1Source+'\n',null,{}])assert.throws(()=>projectG1(changed,name));
  }
  assert.throws(()=>projectG1(g1Source,'unknown'));
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(g1Source+'\n',file),/Whole reviewed model import source changed/);
  for(const changed of [null,{}])assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),
    /Reviewed model source must be a string/);
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(g1Source,'scripts/protected-private-production-runtime.mjs'),
    /Whole reviewed model import source changed/);
  const actualSource=projectG1(g1Source,'historicalV2');
  assert.equal(g1Hash(actualSource),'c832a12fd410d65adf41c9c781720c7670a06b41c6ec80ab4dfe1cad284bb741');
  assert.throws(()=>modelSourceRelativeModuleSpecifiers(actualSource,file),
    /Whole reviewed model import source changed/,'Historical V2 is not a current scanner variant');
  // Exact outer inverse of the genuine586 qualification composition plus
  // this future587 parent arm. Every old historical oracle below is unchanged.
  const outerHunks=[
    {
      "before": "import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';\nimport {withAuthenticated585PredecessorSource} from './check-source-producer-predecessor-source.mjs';\nimport {assertEstablishedNativeCurrent585MetadataCheckpoint} from './lib/established-native-current-origin.mjs';\nimport {withAuthenticated584PredecessorSource} from './check-account-statistics-assistant-predecessor-source.mjs';\nimport {assertEstablishedNativeCurrent584MetadataCheckpoint} from './lib/established-native-current-origin.mjs';\nimport {assertAccountStatisticsAssistantPrewriteCaller} from './account-statistics-assistant-prewrite.mjs';",
      "after": "import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';\nimport {withAuthenticated585PredecessorSource} from './check-source-producer-predecessor-source.mjs';\nimport {assertEstablishedNativeCurrent585MetadataCheckpoint} from './lib/established-native-current-origin.mjs';\nimport {NATIVE_ORIGINAL_CONTINUITY_BINDING as NATIVE_METADATA_FAMILY}\n  from './lib/native-original-continuity-successor-source.mjs';\nimport {withAuthenticated586PredecessorSource} from './check-source-producer-586-predecessor-source.mjs';\nimport {withAuthenticated587PredecessorSource} from './check-source-producer-587-predecessor-source.mjs';\nimport {ASSISTANT_LATER_H0_BINDING as SOURCE_PREDECESSOR_FAMILY} from './lib/assistant-later-h0-successor-source.mjs';\nimport {assertEstablishedNativeCurrent587MetadataCheckpoint} from './lib/established-native-current-origin.mjs';\nimport {assertEstablishedNativeCurrent586MetadataCheckpoint} from './lib/established-native-current-origin.mjs';\nimport {withAuthenticated584PredecessorSource} from './check-account-statistics-assistant-predecessor-source.mjs';\nimport {assertEstablishedNativeCurrent584MetadataCheckpoint} from './lib/established-native-current-origin.mjs';\nimport {assertAccountStatisticsAssistantPrewriteCaller} from './account-statistics-assistant-prewrite.mjs';"
    },
    {
      "before": "const identityKeys = ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',\n  'bundleContentSha256', 'modelBinding', 'contractHashes'];\nfunction reconcileFamily(descriptor) {\n  return [FAMILY, NEXT_FAMILY, METADATA_FAMILY, SOURCE_FAMILY].filter(Boolean).find(family =>\n    descriptor?.modelBinding?.modelBundleSha256 === family.I\n    && descriptor?.contractHashes?.continuationStateContractSha256 === family.T) ?? null;\n}",
      "after": "const identityKeys = ['sourceHead', 'datasetId', 'productionReferenceAt', 'generatedAt',\n  'bundleContentSha256', 'modelBinding', 'contractHashes'];\nfunction reconcileFamily(descriptor) {\n  return [FAMILY, NEXT_FAMILY, METADATA_FAMILY, NATIVE_METADATA_FAMILY, SOURCE_FAMILY].filter(Boolean).find(family =>\n    descriptor?.modelBinding?.modelBundleSha256 === family.I\n    && descriptor?.contractHashes?.continuationStateContractSha256 === family.T) ?? null;\n}"
    },
    {
      "before": "    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY', 'NATIVE_IDENTITY_RECOVERY',\n    'UPGRADE_LAST_MILE_ENCLOSURE', 'UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',\n    'UPGRADE_EXISTING_OWNER_EXPORT', 'UPGRADE_ACCOUNT_ASSISTANT', 'UPGRADE_STATISTICS_REVISION',\n    'UPGRADE_ACCOUNT_STATISTICS_ASSISTANT'])\n    need(env[key] === 'false', 'SAVED_MODE_COLLISION');\n  for (const key of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH',\n    'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',",
      "after": "    'RAVRADAR_WEATHER_STATE_EPOCH_CHECKPOINT_REENTRY', 'NATIVE_IDENTITY_RECOVERY',\n    'UPGRADE_LAST_MILE_ENCLOSURE', 'UPGRADE_ESTABLISHED_NATIVE_CURRENT_ORIGIN',\n    'UPGRADE_EXISTING_OWNER_EXPORT', 'UPGRADE_ACCOUNT_ASSISTANT', 'UPGRADE_STATISTICS_REVISION',\n    'UPGRADE_ACCOUNT_STATISTICS_ASSISTANT', 'UPGRADE_NATIVE_ORIGINAL_CONTINUITY'])\n    need(env[key] === 'false', 'SAVED_MODE_COLLISION');\n  for (const key of ['RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_PATH',\n    'RAVRADAR_ARCHIVED_WEATHER_RESTART_CONTEXT_SHA256',"
    },
    {
      "before": "  const rows = await readCheckpointRows(request);\n  // Reader selection is NOT numerical admission. Normal current validation\n  // remains unchanged; only an exact older140000 S gets its genuine old reader.\n  const old585 = family === SOURCE_FAMILY && rows.length === 1\n    && rows[0].payload.modelBinding?.modelBundleSha256 === METADATA_FAMILY.I\n    && rows[0].payload.continuationStateContractSha256 === METADATA_FAMILY.T;\n  const old584 = family === METADATA_FAMILY && rows.length === 1",
      "after": "  const rows = await readCheckpointRows(request);\n  // Reader selection is NOT numerical admission. Normal current validation\n  // remains unchanged; only an exact older140000 S gets its genuine old reader.\n  const old587 = family === SOURCE_FAMILY && rows.length === 1\n    && rows[0].payload.modelBinding?.modelBundleSha256 === SOURCE_PREDECESSOR_FAMILY.I\n    && rows[0].payload.continuationStateContractSha256 === SOURCE_PREDECESSOR_FAMILY.T;\n  const old586 = family === SOURCE_FAMILY && rows.length === 1\n    && rows[0].payload.modelBinding?.modelBundleSha256 === NATIVE_METADATA_FAMILY.I\n    && rows[0].payload.continuationStateContractSha256 === NATIVE_METADATA_FAMILY.T;\n  const old585 = (family === SOURCE_FAMILY || family === NATIVE_METADATA_FAMILY) && rows.length === 1\n    && rows[0].payload.modelBinding?.modelBundleSha256 === METADATA_FAMILY.I\n    && rows[0].payload.continuationStateContractSha256 === METADATA_FAMILY.T;\n  const old584 = family === METADATA_FAMILY && rows.length === 1"
    },
    {
      "before": "  };\n  const options = { checkpointPath, targetReference, request: checkedRequest };\n  let restored;\n  if(old585) restored = await withAuthenticated585PredecessorSource(async sourceRoot=>{\n    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);\n    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);\n  });",
      "after": "  };\n  const options = { checkpointPath, targetReference, request: checkedRequest };\n  let restored;\n  if(old587) restored = await withAuthenticated587PredecessorSource(async sourceRoot=>{\n    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);\n    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);\n  });\n  else if(old586) restored = await withAuthenticated586PredecessorSource(async sourceRoot=>{\n    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);\n    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);\n  });\n  else if(old585) restored = await withAuthenticated585PredecessorSource(async sourceRoot=>{\n    const reader=await import(pathToFileURL(path.join(sourceRoot,'scripts/protected-ravscore-continuation-checkpoint.mjs')).href);\n    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);\n  });"
    },
    {
      "before": "    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);\n  });\n  else restored = await restoreProtectedRavScoreContinuationCheckpoint(options);\n  return { restored, rows, predecessorFamily: old585 ? METADATA_FAMILY : old584 ? NEXT_FAMILY : old ? FAMILY : family };\n}\nasync function readPointer(request) {\n  const key = PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;",
      "after": "    return reader.restoreProtectedRavScoreContinuationCheckpoint(options);\n  });\n  else restored = await restoreProtectedRavScoreContinuationCheckpoint(options);\n  return { restored, rows, predecessorFamily: old587 ? SOURCE_PREDECESSOR_FAMILY : old586 ? NATIVE_METADATA_FAMILY : old585 ? METADATA_FAMILY : old584 ? NEXT_FAMILY : old ? FAMILY : family };\n}\nasync function readPointer(request) {\n  const key = PROTECTED_PRIVATE_RUNTIME_POLICY.documentKey;"
    },
    {
      "before": "}\n// A separate exact code-only caller. Never rename it INPUT_OPERATION=source or\n// borrow the old585 caller. The shared core below still authenticates CURRENT\n// B, exact installed bytes, original585 metadata, normal CAS and full readback.\nexport async function reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(options){\n  requireSourceProducerOutput(); // FIRST, before options, environment or clients.\n  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);",
      "after": "}\n// A separate exact code-only caller. Never rename it INPUT_OPERATION=source or\n// borrow the old585 caller. The shared core below still authenticates CURRENT\n// B, exact installed bytes, original586 metadata, normal CAS and full readback.\nexport async function reconcileSourceCodeOnlyPrivateRuntimeCheckpoint(options){\n  requireSourceProducerOutput(); // FIRST, before options, environment or clients.\n  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);"
    },
    {
      "before": "    if (!same(derived, saved)) {\n      // Missing/older SAME-family S alone can advance. Same-time conflict and\n      // S-ahead-B are hard stops. A newer S may already be refused by restore.\n      let exact585MetadataOnly = false;\n      if(family === SOURCE_FAMILY && saved !== null\n        && predecessor.predecessorFamily === METADATA_FAMILY && saved.productionReferenceAt === current.productionReferenceAt){\n        exact585MetadataOnly = await assertEstablishedNativeCurrent585MetadataCheckpoint({\n          descriptor:current,conditions:JSON.parse(original.raw.toString('utf8')),",
      "after": "    if (!same(derived, saved)) {\n      // Missing/older SAME-family S alone can advance. Same-time conflict and\n      // S-ahead-B are hard stops. A newer S may already be refused by restore.\n      let exact587MetadataOnly = false;\n      if(family === SOURCE_FAMILY && saved !== null\n        && predecessor.predecessorFamily === SOURCE_PREDECESSOR_FAMILY && saved.productionReferenceAt === current.productionReferenceAt){\n        exact587MetadataOnly = await assertEstablishedNativeCurrent587MetadataCheckpoint({\n          descriptor:current,conditions:JSON.parse(original.raw.toString('utf8')),\n          centralContract:JSON.parse(registry.raw.toString('utf8')),previousCheckpoint:saved,incomingCheckpoint:derived});\n        need(exact587MetadataOnly === true,'SAME_H0_587_METADATA_ORIGINALS');\n      }\n      let exact586MetadataOnly = false;\n      if(family === SOURCE_FAMILY && saved !== null\n        && predecessor.predecessorFamily === NATIVE_METADATA_FAMILY && saved.productionReferenceAt === current.productionReferenceAt){\n        exact586MetadataOnly = await assertEstablishedNativeCurrent586MetadataCheckpoint({\n          descriptor:current,conditions:JSON.parse(original.raw.toString('utf8')),\n          centralContract:JSON.parse(registry.raw.toString('utf8')),previousCheckpoint:saved,incomingCheckpoint:derived});\n        need(exact586MetadataOnly === true,'SAME_H0_586_METADATA_ORIGINALS');\n      }\n      let exact585MetadataOnly = false;\n      if((family === SOURCE_FAMILY || family === NATIVE_METADATA_FAMILY) && saved !== null\n        && predecessor.predecessorFamily === METADATA_FAMILY && saved.productionReferenceAt === current.productionReferenceAt){\n        exact585MetadataOnly = await assertEstablishedNativeCurrent585MetadataCheckpoint({\n          descriptor:current,conditions:JSON.parse(original.raw.toString('utf8')),"
    },
    {
      "before": "          centralContract:JSON.parse(registry.raw.toString('utf8')),previousCheckpoint:saved,incomingCheckpoint:derived});\n        need(exact584MetadataOnly === true,'SAME_H0_METADATA_ORIGINALS');\n      }\n      need(exact585MetadataOnly || exact584MetadataOnly || saved === null || (saved.modelBinding.modelBundleSha256 === predecessor.predecessorFamily.I\n        && saved.continuationStateContractSha256 === predecessor.predecessorFamily.T\n        && Date.parse(saved.productionReferenceAt) < Date.parse(current.productionReferenceAt)), 'S_NOT_BEHIND');\n      await stable();",
      "after": "          centralContract:JSON.parse(registry.raw.toString('utf8')),previousCheckpoint:saved,incomingCheckpoint:derived});\n        need(exact584MetadataOnly === true,'SAME_H0_METADATA_ORIGINALS');\n      }\n      need(exact587MetadataOnly || exact586MetadataOnly || exact585MetadataOnly || exact584MetadataOnly || saved === null || (saved.modelBinding.modelBundleSha256 === predecessor.predecessorFamily.I\n        && saved.continuationStateContractSha256 === predecessor.predecessorFamily.T\n        && Date.parse(saved.productionReferenceAt) < Date.parse(current.productionReferenceAt)), 'S_NOT_BEHIND');\n      await stable();"
    }
  ];
  const historicalSource=value=>{
    assert.equal(crypto.createHash('sha256').update(value).digest('hex'),'c832a12fd410d65adf41c9c781720c7670a06b41c6ec80ab4dfe1cad284bb741');
    let inverse=value;
    for(const hunk of [...outerHunks].reverse()){
      assert.equal(inverse.split(hunk.after).length,2,'One entire reviewed outer hunk');
      inverse=inverse.replace(hunk.after,()=>hunk.before);
    }
    assert.equal(crypto.createHash('sha256').update(inverse).digest('hex'),'0d39bb342673321abf6481a4a3527bb3717dc4b2604688550d23e5d928b467f4',
      'WHOLE original code-only SOURCE predecessor, not a repinned historical oracle');
    return inverse;
  };
  const source=historicalSource(actualSource);
  for(const hunk of outerHunks)assert.throws(()=>historicalSource(
    actualSource.replace(hunk.after,hunk.after+'\n// UNKNOWN outer hunk mutation')));
  assert.throws(()=>historicalSource(actualSource+'\n'));
  const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
  const once=(value,before,after)=>{assert.equal(value.split(before).length,2);return value.replace(before,()=>after);};
  assert.equal(hash(source),'0d39bb342673321abf6481a4a3527bb3717dc4b2604688550d23e5d928b467f4');
  let inverse=once(source,'import {SOURCE_PRODUCER_BINDING as SOURCE_FAMILY,requireSourceProducerOutput}',
    'import {SOURCE_PRODUCER_BINDING as SOURCE_FAMILY}');
  inverse=once(inverse,"import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';\n",'');
  const start=inverse.indexOf('// A separate exact code-only caller.');
  const end=inverse.indexOf('async function reconcileAuthenticatedPrivateRuntimeCheckpoint(',start);
  assert(start>0&&end>start);assert.equal(inverse.split('// A separate exact code-only caller.').length,2);
  inverse=inverse.slice(0,start)+inverse.slice(end);
  inverse=once(inverse,'  expected, expectedCurrentIdentity, now =','  expected, now =');
  inverse=once(inverse,"  if(expectedCurrentIdentity!==undefined)for(const key of identityKeys)\n    need(same(current[key],expectedCurrentIdentity[key]),'SOURCE_CODE_ONLY_CURRENT_CHANGED');\n",'');
  assert.equal(hash(inverse),'c646e24b5e7ee4a1b1a71917819eb49e9b38c9e123d5b631211207e033f6a052',
    'Whole genuine prior SOURCE inverse, not selected unchanged snippets');
  const oldImports=modelSourceRelativeModuleSpecifiers(inverse,file),currentImports=modelSourceRelativeModuleSpecifiers(source,file);
  assert.equal(oldImports.length,16);assert.equal(currentImports.length,17);
  assert.deepEqual(currentImports.filter(value=>value!=='./select-source-producer-code-only-source.mjs'),oldImports);
  for(const changed of [source+'\n',source.replace("'SOURCE_CODE_ONLY_CURRENT_CHANGED'","'RELAXED_IDENTITY'"),
    source.replace("import {assertSourceProducerCodeOnlyCaller} from './select-source-producer-code-only-source.mjs';",'')])
    assert.throws(()=>modelSourceRelativeModuleSpecifiers(changed,file),/Whole reviewed model import source changed/);
});

test('SOURCE verified pending-write policy never replays an already installed SQL transition',()=>{
  const version='20261021010000';
  assert.equal(sourceProducerSqlWriteRequired('before',[version],version),true);
  assert.equal(sourceProducerSqlWriteRequired('before',[],version),false);
  assert.equal(sourceProducerSqlWriteRequired('installed',[],version),false);
  for(const args of [
    ['installed',[version],version],['before',['20261021020000'],version],
    ['before',[version,version],version],['before',[version,'20261021020000'],version],
    ['unknown',[],version],['before',null,version],['before',[],'not-issued-version'],
  ])assert.throws(()=>sourceProducerSqlWriteRequired(...args));
  assert.throws(()=>sourceProducerSqlWriteRequired('before',[],version,{}));
});
