// Kun den normale metadatagrænse med ægte frosne kodebindinger.
// Ingen produktionsdescriptor, original B/S, proveniens eller adgang fabrikeres.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withAuthenticated591PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';
import {assertFrozen591LaterOriginMetadata} from './lib/established-native-current-origin.mjs';
import {assertAssistantOriginalRuntimeContracts} from './assistant-later-h0-runtime-transition.mjs';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
const fail={code:'ESTABLISHED_CURRENT_ORIGIN_591_METADATA_ONLY'};
const clone=structuredClone;
let negatives=0;
await withAuthenticated591PredecessorSource(async root=>{
  const load=relative=>import(pathToFileURL(path.join(root,relative)).href);
  const originalI=(await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const originalC=(await load('scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
  const originalContracts=await(await load('scripts/private-production-runtime-workflow.mjs')).privateRuntimeContractHashes({repositoryRoot:root});
  const descriptor={contractHashes:originalContracts};
  const checkpoint={modelBinding:originalI,candidateGRollbackCompanion:{modelBinding:originalC}};
  const currentContracts=await privateRuntimeContractHashes();
  assert.equal(await assertAssistantOriginalRuntimeContracts(originalContracts,currentContracts),true);
  const before=clone({descriptor,checkpoint});
  assert.equal(await assertFrozen591LaterOriginMetadata(descriptor,checkpoint),true);
  assert.deepEqual({descriptor,checkpoint},before,'Hele metadata er uændrede');
  for(const family of ['modelBinding','candidateGRollbackCompanion']){
    const changed=clone(checkpoint),binding=family==='modelBinding'?changed.modelBinding:changed.candidateGRollbackCompanion.modelBinding;
    for(const key of Object.keys(binding).filter(key=>key!=='modelBundleSha256')){
      const invalid=clone(changed),target=family==='modelBinding'?invalid.modelBinding:invalid.candidateGRollbackCompanion.modelBinding;
      target[key]='ukendt';await assert.rejects(assertFrozen591LaterOriginMetadata(descriptor,invalid),fail);negatives++;
    }
    binding.unknown='ukendt';await assert.rejects(assertFrozen591LaterOriginMetadata(descriptor,changed),fail);negatives++;
  }
  for(const key of Object.keys(originalContracts)){
    const bad=clone(descriptor);bad.contractHashes[key]='0'.repeat(64);
    await assert.rejects(assertFrozen591LaterOriginMetadata(bad,checkpoint),fail);negatives++;
    const missing=clone(descriptor);delete missing.contractHashes[key];
    await assert.rejects(assertFrozen591LaterOriginMetadata(missing,checkpoint),fail);negatives++;
  }
  const extra=clone(descriptor);extra.contractHashes.unknown='ukendt';
  await assert.rejects(assertFrozen591LaterOriginMetadata(extra,checkpoint),fail);negatives++;
  await assert.rejects(assertFrozen591LaterOriginMetadata(descriptor,checkpoint,'override'),fail);negatives++;
  assert.deepEqual({descriptor,checkpoint},before);
  console.log(JSON.stringify({kind:'NORMAL_591_ORIGIN_METADATA_GRAENSE',status:'PASS',negativeCases:negatives,
    originalCodeBindings:'genuine591',productionBS:false,productionProof:false,sqlExecuted:false}));
});
