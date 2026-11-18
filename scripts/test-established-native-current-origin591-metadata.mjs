// Kun den normale metadatagrænse med ægte frosne kodebindinger.
// Ingen produktionsdescriptor, original B/S, proveniens eller adgang fabrikeres.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {withAuthenticated591PredecessorSource,withSource594CodeParent,withSource597CodeParent,withSource598CodeParent,withSource599CodeParent} from './check-assistant-later-h0-predecessor-source.mjs';
import {assertFrozen591CompactRuntimeContracts} from './lib/assistant-public591-runtime-contracts.mjs';
import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,INACTIVE_SCALAR597_LATER_H0_SUCCESSOR as SCALAR,
  UNISSUED_ASSISTANT_AFTER597_SUCCESSOR as AFTER597,INACTIVE_ASSISTANT_AFTER598_SUCCESSOR as AFTER598,INACTIVE_ASSISTANT_AFTER599_SUCCESSOR as AFTER599} from './lib/assistant-later-h0-successor-source.mjs';
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
  if ([SCALAR,AFTER597,AFTER598,AFTER599].includes(ACTIVE)) {
    await withSource594CodeParent(async root594 => {
      const original594 = await import(pathToFileURL(path.join(root594,'scripts/private-production-runtime-workflow.mjs')).href);
      const frozen594Contracts = await original594.privateRuntimeContractHashes({repositoryRoot:root594});
      assert.equal(assertFrozen591CompactRuntimeContracts(originalContracts,frozen594Contracts),true);
      if(ACTIVE===AFTER599){
        await withSource599CodeParent(async root599=>{
          const original599=await import(pathToFileURL(path.join(root599,'scripts/private-production-runtime-workflow.mjs')).href);
          const frozen599Contracts=await original599.privateRuntimeContractHashes({repositoryRoot:root599});
          assert.equal(frozen599Contracts.continuationStateContractSha256,AFTER598.requireBinding().T);
          assert.equal(ACTIVE.before.T,frozen599Contracts.continuationStateContractSha256);
          assert.deepEqual({...frozen594Contracts,continuationStateContractSha256:frozen599Contracts.continuationStateContractSha256},frozen599Contracts,
            'Whole genuine594/599 persisted ABI retains the old599 metadata transition');
          assert.notEqual(currentContracts.continuationStateContractSha256,frozen599Contracts.continuationStateContractSha256);
          assert.equal(assertAssistantOriginalRuntimeContracts(frozen599Contracts,currentContracts),true);
        });
      }else if(ACTIVE===AFTER598){
        await withSource598CodeParent(async root598=>{
          const original598=await import(pathToFileURL(path.join(root598,'scripts/private-production-runtime-workflow.mjs')).href);
          const frozen598Contracts=await original598.privateRuntimeContractHashes({repositoryRoot:root598});
          assert.equal(frozen598Contracts.continuationStateContractSha256,AFTER597.requireBinding().T);
          assert.equal(ACTIVE.before.T,frozen598Contracts.continuationStateContractSha256);
          assert.deepEqual({...frozen594Contracts,continuationStateContractSha256:frozen598Contracts.continuationStateContractSha256},frozen598Contracts,
            'Whole genuine594/598 persisted ABI retains the old598 metadata transition');
          assert.notEqual(currentContracts.continuationStateContractSha256,frozen598Contracts.continuationStateContractSha256);
          assert.equal(assertAssistantOriginalRuntimeContracts(frozen598Contracts,currentContracts),true);
        });
      }else if(ACTIVE===AFTER597){
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
