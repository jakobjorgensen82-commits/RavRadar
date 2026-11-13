// Kun den normale metadatagrænse med ægte frosne kodebindinger.
// Ingen produktionsdescriptor, original B/S, proveniens eller adgang fabrikeres.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withAuthenticated591PredecessorSource,withSource594CodeParent,withSource597CodeParent,withSource598CodeParent} from './check-assistant-later-h0-predecessor-source.mjs';
import {assertFrozen591CompactRuntimeContracts} from './lib/assistant-public591-runtime-contracts.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR as SCALAR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as AFTER597} from './lib/assistant-later-h0-successor-source.mjs';
import {assertFrozen591LaterOriginMetadata} from './lib/established-native-current-origin.mjs';
import {assertAssistantOriginalRuntimeContracts} from './assistant-later-h0-runtime-transition.mjs';
import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';
import {SOURCE_PRODUCER_AFTER597_PARENT as SOURCE}
  from './lib/source-producer-after597-parent.mjs';
import {requireSourceProducerOutput}
  from './lib/source-producer-after597-runtime-family.mjs';
// Historical assistant598 CODE contracts only. No original/data/session admission.
// The current Source profile has its own normal native/PG/national gates.
async function withHistoricalAssistantMetadata(useMetadata) {
  if (SOURCE.binding === null && SOURCE.output === null && SOURCE.nextRelease === null) {
    return useMetadata(await privateRuntimeContractHashes(), assertFrozen591LaterOriginMetadata);
  }
  requireSourceProducerOutput(); // Actual current output FIRST; historical CODE grants no admission.
  return withSource598CodeParent(async root598 => {
    const load = relative => import(pathToFileURL(path.join(root598, relative)).href);
    const [code598, origin598] = await Promise.all([
      load('scripts/private-production-runtime-workflow.mjs'),
      load('scripts/lib/established-native-current-origin.mjs'),
    ]);
    const contracts = await code598.privateRuntimeContractHashes({repositoryRoot: root598});
    assert.equal(contracts.continuationStateContractSha256, AFTER597.requireBinding().T);
    // The genuine598 function reads its own physical contracts on every call.
    // Keep its fixed source alive for the WHOLE historical positive/negative case.
    return useMetadata(contracts, origin598.assertFrozen591LaterOriginMetadata);
  });
}
const fail={code:'ESTABLISHED_CURRENT_ORIGIN_591_METADATA_ONLY'};
const clone=structuredClone;
let negatives=0;
await withHistoricalAssistantMetadata(async (currentContracts, assertFrozen591LaterOriginMetadata) => {
await withAuthenticated591PredecessorSource(async root=>{
  const load=relative=>import(pathToFileURL(path.join(root,relative)).href);
  const originalI=(await load('js/core/ravscore-model-contract.js')).ravScoreModelBinding();
  const originalC=(await load('scripts/rollback-assets/ravscore-model-contract.js')).ravScoreModelBinding();
  const originalContracts=await(await load('scripts/private-production-runtime-workflow.mjs')).privateRuntimeContractHashes({repositoryRoot:root});
  const descriptor={contractHashes:originalContracts};
  const checkpoint={modelBinding:originalI,candidateGRollbackCompanion:{modelBinding:originalC}};
  if ([SCALAR,AFTER597].includes(ACTIVE)) {
    await withSource594CodeParent(async root594 => {
      const original594 = await import(pathToFileURL(path.join(root594,'scripts/private-production-runtime-workflow.mjs')).href);
      const frozen594Contracts = await original594.privateRuntimeContractHashes({repositoryRoot:root594});
      assert.equal(assertFrozen591CompactRuntimeContracts(originalContracts,frozen594Contracts),true);
      if(ACTIVE===AFTER597){
        await withSource597CodeParent(async root597=>{
          const original597=await import(pathToFileURL(path.join(root597,'scripts/private-production-runtime-workflow.mjs')).href);
          const frozen597Contracts=await original597.privateRuntimeContractHashes({repositoryRoot:root597});
          assert.equal(frozen597Contracts.continuationStateContractSha256,SCALAR.requireBinding().T);
          assert.deepEqual({...frozen594Contracts,continuationStateContractSha256:frozen597Contracts.continuationStateContractSha256},frozen597Contracts,
            'Whole genuine594/597 persisted ABI differs only by its scalar597 T metadata');
          assert.equal(assertAssistantOriginalRuntimeContracts(frozen597Contracts,currentContracts),true);
        });
      }else assert.equal(assertAssistantOriginalRuntimeContracts(frozen594Contracts,currentContracts),true);
    });
  } else {
    assert.equal(await assertAssistantOriginalRuntimeContracts(originalContracts,currentContracts),true);
  }
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
});
