// TEST DATA alene: præcis594→ægte593-kildeinverse før gamle orakler.
// Den aktuelle594-guard og dens afslag afprøves separat gennem normal kalder.
// Ingen modelimport, runtime-normalisering, original eller adgang ændres.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const reviewed={
  "scripts/lib/established-native-current-origin.mjs": {
    "beforeSha256": "e802e02df74a53bb543d7d0e9107efd3850890a9f2c15e5d7c0c01b5229671cb",
    "afterSha256": "b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa",
    "beforeBytes": 86377,
    "afterBytes": 86933,
    "hunks": [
      [
        "import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';\nimport { ravScoreModelBinding as candidateBinding } from '../rollback-assets/ravscore-model-contract.js';\nimport { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as I_MANIFEST } from '../../js/core/ravscore-model-bundle.generated.js';\nimport { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';\nimport { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';\nimport { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';\nimport { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';\nimport { PRIVATE_CONDITIONS_MAX_BYTES } from './bounded-json-writer.mjs';\nimport { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';\nimport { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen585Snapshot } from './authenticated-frozen585-predecessor.mjs';\nimport { withAuthenticated585PredecessorSource } from '../check-native-original-continuity-predecessor-source.mjs';\n\nimport {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,\n  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n",
        "import { ravScoreModelBinding } from '../../js/core/ravscore-model-contract.js';\nimport { ravScoreModelBinding as candidateBinding } from '../rollback-assets/ravscore-model-contract.js';\nimport { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST as I_MANIFEST } from '../../js/core/ravscore-model-bundle.generated.js';\nimport { ravScoreSamplingContextKey } from './ravscore-sampling-context.mjs';\nimport { assertIntegratedCoastalPointContinuation } from './coastal-point-staging-contract.mjs';\nimport { assertCandidateGRollbackContinuation } from './ravscore-candidate-g-rollback-runtime.mjs';\nimport { ownFileDescriptorIdentity, ownedFileDescriptorClosed } from './private-weather-component-pack.mjs';\nimport { PRIVATE_CONDITIONS_MAX_BYTES } from './bounded-json-writer.mjs';\nimport {assertFrozen591CompactRuntimeContracts} from './assistant-public591-runtime-contracts.mjs';\nimport { withNativeCurrentReanalysisPredecessorSource } from '../check-native-current-reanalysis-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen584Snapshot } from './authenticated-frozen584-predecessor.mjs';\nimport { withAuthenticated584PredecessorSource } from '../check-account-statistics-assistant-predecessor-source.mjs';\nimport { assertAuthenticatedFrozen585Snapshot } from './authenticated-frozen585-predecessor.mjs';\nimport { withAuthenticated585PredecessorSource } from '../check-native-original-continuity-predecessor-source.mjs';\n\nimport {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,\n  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n"
      ],
      [
        "  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n\n// Separate genuine591 later-H0 origin. The old590 implementation remains byte-whole above.\nasync function readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  const oldI='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54';\n  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'591_FAMILY');\n  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');\n  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'591_LATER_TARGET');\n  const snapshot=assertAuthenticatedFrozen591Snapshot(await readAuthenticatedFrozen591Predecessor());\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'591_ORIGINAL_CHANGED');\n",
        "  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n\n// Ren metadatakontrol; den skaber ingen attest, autentificering eller adgang.\n// Normal læsning autentificerer hele den frosne original før dette kald.\nexport async function assertFrozen591LaterOriginMetadata(descriptor,checkpoint){\n  need(arguments.length===2,'591_METADATA_ONLY');\n  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();\n  need(same({...checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C),\n    '591_METADATA_ONLY');\n  try{assertFrozen591CompactRuntimeContracts(descriptor.contractHashes,contracts);}\n  catch{fail('591_METADATA_ONLY');}\n  return true;\n}\n// Separate genuine591 later-H0 origin. The old590 implementation remains byte-whole above.\nasync function readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  const oldI='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54';\n  need(descriptor.modelBinding.modelBundleSha256===oldI&&currentSource.integrated!==oldI,'591_FAMILY');\n  const target=Date.parse(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR??'');\n  need(Number.isFinite(target)&&target%3600000===0&&target>Date.parse(descriptor.productionReferenceAt),'591_LATER_TARGET');\n  const snapshot=assertAuthenticatedFrozen591Snapshot(await readAuthenticatedFrozen591Predecessor());\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'591_ORIGINAL_CHANGED');\n"
      ],
      [
        "  need(descriptor.contractHashes.continuationStateContractSha256==='b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d'\n    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',\n    '591_FIXED_ORIGINAL_BINDING');\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '591_ISSUED_CURRENT_SOURCE');\n  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)\n    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),\n    '591_METADATA_ONLY');\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'591_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'591_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n",
        "  need(descriptor.contractHashes.continuationStateContractSha256==='b490f11d14cfe607839d7848bbcdb8e9df7abdfe62c82983e5247fb4ca3dcc0d'\n    &&snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256==='38738b7d7d3bfd74958ab2453422f2416338e99dac53d12f7098ad8c3539ec64',\n    '591_FIXED_ORIGINAL_BINDING');\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '591_ISSUED_CURRENT_SOURCE');\n  await assertFrozen591LaterOriginMetadata(descriptor,snapshot.checkpoint);\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'591_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'591_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n"
      ]
    ]
  },
  "scripts/assistant-later-h0-binding-prewrite.mjs": {
    "beforeSha256": "c8f473abb689ff12fdbe0086fff2d9d29bb5a2d8a14e5f77a18c28c279e2b2e0",
    "afterSha256": "d46dc4c2741dc62608e640ca60bd6b18027df6086a71f63c26e879c4495c94e2",
    "beforeBytes": 24709,
    "afterBytes": 25124,
    "hunks": [
      [
        "import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\nimport {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh,readAuthenticatedFrozen591Predecessor,\n  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\nimport {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';\nimport {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan} from './integrated-cutover-readiness.mjs';\nimport {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';\nimport {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';\nimport {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';\nimport {nativeCurrentOriginalBankForPart} from './lib/ravscore-recovery-source-priority.mjs';\nimport {saved121DirectSelection} from './lib/coherent-original-source-views.mjs';\nimport {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';\nimport {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';\nimport {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';\nimport {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';\n// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public591-successor'?Object.freeze({\n  withSource:withAuthenticated591PredecessorSource,read:readAuthenticatedFrozen591Predecessor,\n  snapshot:assertAuthenticatedFrozen591Snapshot,fresh:assertAuthenticatedFrozen591SnapshotFresh,\n  plan:assertAssistantPublic591SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({  withSource:withAuthenticated590PredecessorSource,read:readAuthenticatedFrozen590Predecessor,\n  snapshot:assertAuthenticatedFrozen590Snapshot,fresh:assertAuthenticatedFrozen590SnapshotFresh,\n  plan:assertAssistantPublic590SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n  withSource:withAuthenticated588PredecessorSource,read:readAuthenticatedFrozen588Predecessor,\n",
        "import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\nimport {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh,readAuthenticatedFrozen591Predecessor,\n  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\nimport {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';\nimport {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan} from './integrated-cutover-readiness.mjs';\nimport {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';\nimport {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';\nimport {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';\nimport {nativeCurrentOriginalBankForPart} from './lib/ravscore-recovery-source-priority.mjs';\nimport {saved121DirectSelection} from './lib/coherent-original-source-views.mjs';\nimport {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';\nimport {ravScoreModelBinding as candidateBinding} from './rollback-assets/ravscore-model-contract.js';\nimport {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';\nimport {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';\n// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'?Object.freeze({\n  withSource:withAuthenticated591PredecessorSource,read:readAuthenticatedFrozen591Predecessor,\n  snapshot:assertAuthenticatedFrozen591Snapshot,fresh:assertAuthenticatedFrozen591SnapshotFresh,\n  plan:assertInstalled593Original591MigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public591-successor'?Object.freeze({\n  withSource:withAuthenticated591PredecessorSource,read:readAuthenticatedFrozen591Predecessor,\n  snapshot:assertAuthenticatedFrozen591Snapshot,fresh:assertAuthenticatedFrozen591SnapshotFresh,\n  plan:assertAssistantPublic591SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({  withSource:withAuthenticated590PredecessorSource,read:readAuthenticatedFrozen590Predecessor,\n  snapshot:assertAuthenticatedFrozen590Snapshot,fresh:assertAuthenticatedFrozen590SnapshotFresh,\n  plan:assertAssistantPublic590SuccessorMigrationPlan\n}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n  withSource:withAuthenticated588PredecessorSource,read:readAuthenticatedFrozen588Predecessor,\n"
      ]
    ]
  },
  "scripts/build-assistant-later-h0-successor.mjs": {
    "beforeSha256": "51bbc5683dceed8c0afa822da6377e78568b9bd1bef824755a1d96fa9700a117",
    "afterSha256": "b82eebe5524c40c8dd41907ce22a7e09e652ff8b7379b45c29ea4b5841838245",
    "beforeBytes": 33668,
    "afterBytes": 40413,
    "hunks": [
      [
        "  requireAssistantPublic588SuccessorRelease,assistantPublic588SuccessorMigration,ACTIVE_ASSISTANT_SUCCESSOR,\n  ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,\n  readAssistantPublic590PredecessorCanonicalSource,assistantPublic590SuccessorCheckpointContractFromBase,\n  requireAssistantPublic590SuccessorParent,requireAssistantPublic590SuccessorBinding,requireAssistantPublic590SuccessorOutput,\n  requireAssistantPublic590SuccessorRelease,assistantPublic590SuccessorMigration,\n  ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,\n  readAssistantPublic591PredecessorCanonicalSource,assistantPublic591SuccessorCheckpointContractFromBase,\n  requireAssistantPublic591SuccessorParent,requireAssistantPublic591SuccessorBinding,requireAssistantPublic591SuccessorOutput,\n  requireAssistantPublic591SuccessorRelease,assistantPublic591SuccessorMigration}\n  from './lib/assistant-later-h0-successor-source.mjs';\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';\nconst sha=v=>crypto.createHash('sha256').update(v).digest('hex');\nconst once=(s,a,b)=>{assert.equal(s.split(a).length,2,'One exact source insertion');return s.replace(a,()=>b);};\n// Kun disse faste interne profilobjekter må vælge en forgænger.\n// Ingen eksport eller caller-/miljøvalgt profil, rod, binding eller SQL-kilde.\nconst LEGACY586=Object.freeze({\n  previous:OLD,aliases:ALIASES,previousRelease:586,validatorCount:31,\n",
        "  requireAssistantPublic588SuccessorRelease,assistantPublic588SuccessorMigration,ACTIVE_ASSISTANT_SUCCESSOR,\n  ASSISTANT_PUBLIC590_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC590_SUCCESSOR_ALIASES,\n  readAssistantPublic590PredecessorCanonicalSource,assistantPublic590SuccessorCheckpointContractFromBase,\n  requireAssistantPublic590SuccessorParent,requireAssistantPublic590SuccessorBinding,requireAssistantPublic590SuccessorOutput,\n  requireAssistantPublic590SuccessorRelease,assistantPublic590SuccessorMigration,\n  ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,\n  readAssistantPublic591PredecessorCanonicalSource,assistantPublic591SuccessorCheckpointContractFromBase,\n  requireAssistantPublic591SuccessorParent,requireAssistantPublic591SuccessorBinding,requireAssistantPublic591SuccessorOutput,\n  requireAssistantPublic591SuccessorRelease,assistantPublic591SuccessorMigration,\n  INSTALLED593_ORIGINAL591_DATABASE_BEFORE,readAssistantPublic591SuccessorCanonicalSource,\n  requireInstalled593Original591Binding,requireInstalled593Original591Output,requireInstalled593Original591Release,\n  installed593Original591Migration}\n  from './lib/assistant-later-h0-successor-source.mjs';\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),CP='ravradar_ravscore_checkpoint_';\nconst sha=v=>crypto.createHash('sha256').update(v).digest('hex');\nconst once=(s,a,b)=>{assert.equal(s.split(a).length,2,'One exact source insertion');return s.replace(a,()=>b);};\n// Kun disse faste interne profilobjekter må vælge en forgænger.\n// Ingen eksport eller caller-/miljøvalgt profil, rod, binding eller SQL-kilde.\nconst LEGACY586=Object.freeze({\n  previous:OLD,aliases:ALIASES,previousRelease:586,validatorCount:31,\n"
      ],
      [
        "\nconst PUBLIC591=Object.freeze({\n  previous:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,\n  previousRelease:591,validatorCount:39,\n  readPredecessor:readAssistantPublic591PredecessorCanonicalSource,\n  checkpointFromBase:assistantPublic591SuccessorCheckpointContractFromBase,\n  contractTail:\"    || E'\\\\n-- assistant-later-h0-original590-payload-validator --\\\\n' || v_ask590_payload_definition;\",\n  kind:'ASSISTANT_PUBLIC591_SUCCESSOR_STRUCTURE'});\n\nfunction fixedProfile(profile){\n  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n  return profile;\n}\nfunction metadata(source,next,inventory,OLD){\n  for(const key of ['C','I','T'])assert.equal(source.split(OLD[key]).length-1,inventory[key]??0);\n  const forward=new Map(['C','I','T'].map(k=>[OLD[k],next[k]]));\n  const backward=new Map([...forward].map(([a,b])=>[b,a]));\n  const after=source.replace(/[a-f0-9]{64}/g,v=>forward.get(v)??v);\n  assert.equal(after.replace(/[a-f0-9]{64}/g,v=>backward.get(v)??v),source,'Whole scalar metadata inverse');return after;\n",
        "\nconst PUBLIC591=Object.freeze({\n  previous:ASSISTANT_PUBLIC591_SUCCESSOR_BEFORE,aliases:ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES,\n  previousRelease:591,validatorCount:39,\n  readPredecessor:readAssistantPublic591PredecessorCanonicalSource,\n  checkpointFromBase:assistantPublic591SuccessorCheckpointContractFromBase,\n  contractTail:\"    || E'\\\\n-- assistant-later-h0-original590-payload-validator --\\\\n' || v_ask590_payload_definition;\",\n  kind:'ASSISTANT_PUBLIC591_SUCCESSOR_STRUCTURE'});\nconst INSTALLED593_ORIGINAL591=Object.freeze({\n  previous:INSTALLED593_ORIGINAL591_DATABASE_BEFORE,previousRelease:593,aliases:Object.freeze([]),\n  readPredecessor:readAssistantPublic591SuccessorCanonicalSource,\n  checkpointFromBase:assistantPublic591SuccessorCheckpointContractFromBase,\n  kind:'INSTALLED593_ORIGINAL591_SUCCESSOR_STRUCTURE',\n});\n\nfunction fixedProfile(profile){\n  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591||profile===INSTALLED593_ORIGINAL591,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n  return profile;\n}\nfunction metadata(source,next,inventory,OLD){\n  for(const key of ['C','I','T'])assert.equal(source.split(OLD[key]).length-1,inventory[key]??0);\n  const forward=new Map(['C','I','T'].map(k=>[OLD[k],next[k]]));\n  const backward=new Map([...forward].map(([a,b])=>[b,a]));\n  const after=source.replace(/[a-f0-9]{64}/g,v=>forward.get(v)??v);\n  assert.equal(after.replace(/[a-f0-9]{64}/g,v=>backward.get(v)??v),source,'Whole scalar metadata inverse');return after;\n"
      ],
      [
        "    checkpointCasContractFromCanonicalSource(canonicalSource,{sourcePhase:'native-original-continuity'}));\n  return Object.freeze({schemaVersion:1,kind:profile.kind,admission:'NO_ADMISSION',\n    nextBinding:next,aliases,changes,canonicalSource,canonicalSha256:sha(canonicalSource),\n    checkpointContractSha256:checkpoint.sha256,tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(canonicalSource).sha256,\n    originalCanonicalSha256:sha(before),wholeCanonicalInverse:true,sameH0Capability:false,\n    numericalSqlRulesChanged:false,migrationIssued:false,sqlExecuted:false,installationPerformed:false});\n}\n\nconst CORE_REPLACEMENTS=['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason']\n.map(s=>CP+s).concat(['ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);\nconst literal=value=>{assert(typeof value==='string'&&!value.includes(\"'\"));return \"'\"+value+\"'\";};\n\nfunction body(source){\n  const start=source.indexOf('as $$');assert(start>0);\n  return source.slice(start+5,source.lastIndexOf('$$;')).trim();\n}\n",
        "    checkpointCasContractFromCanonicalSource(canonicalSource,{sourcePhase:'native-original-continuity'}));\n  return Object.freeze({schemaVersion:1,kind:profile.kind,admission:'NO_ADMISSION',\n    nextBinding:next,aliases,changes,canonicalSource,canonicalSha256:sha(canonicalSource),\n    checkpointContractSha256:checkpoint.sha256,tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(canonicalSource).sha256,\n    originalCanonicalSha256:sha(before),wholeCanonicalInverse:true,sameH0Capability:false,\n    numericalSqlRulesChanged:false,migrationIssued:false,sqlExecuted:false,installationPerformed:false});\n}\n\n// Normal constructor fra den faktisk udstedte593-database. Originalfamilie591\n// har allerede sine ægte validatorer i593; der tilføjes ingen nye originaler.\nexport async function prepareInstalled593Original591SuccessorStructure(options){\n  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);\n  assert.deepEqual(Object.keys(options),['version']);const {version}=options;\n  const profile=INSTALLED593_ORIGINAL591,OLD=profile.previous;\n  assert.match(version,/^[0-9]{14}$/);assert(version>OLD.version);\n  const C=await computeCandidateGRollbackBundle();\n  assert.equal((await fs.readFile(path.join(ROOT,'scripts/rollback-assets/ravscore-model-bundle.generated.js'),'utf8')).replace(/\\r\\n?/g,'\\n'),renderCandidateGRollbackGeneratedModule(C));\n  const I=await computeRavScoreModelBundle();\n  assert.equal((await fs.readFile(path.join(ROOT,'js/core/ravscore-model-bundle.generated.js'),'utf8')).replace(/\\r\\n?/g,'\\n'),renderGeneratedBundleModule(I));\n  const next={version,C:C.modelBundleSha256,I:I.modelBundleSha256,T:await ravScoreContinuationImplementationSha256()};\n  assert.equal(new Set(['C','I','T'].flatMap(key=>[OLD[key],next[key]])).size,6);\n  const prior=await profile.readPredecessor(),before=prior.canonicalSource;\n  assert.equal(sha(before),OLD.canonicalSha256);\n  const changes=[],add=(name,after)=>changes.push({name,before:definition(before,name),after});\n  for(const [suffix,inventory] of [['integrated_state_valid',{I:1}],['payload_valid',{I:1,C:1,T:1}],\n    ['integrated_state_reason',{I:1}],['payload_reason',{I:1,C:1,T:1}]])\n    add(CP+suffix,metadata(definition(before,CP+suffix),next,inventory,OLD));\n  let trip=definition(before,'ravradar_trip_v3_binding_allowed');\n  for(const key of ['I','C'])trip=once(trip,\"        '\"+OLD[key]+\"'\\n      )\",\"        '\"+OLD[key]+\"',\\n        '\"+next[key]+\"'\\n      )\");\n  add('ravradar_trip_v3_binding_allowed',trip);\n  const casBefore=definition(before,CP+'cas');\n  const originalBranch=\"    elsif p_target_reference > v_central_reference\\n\"\n    +\"      and p_payload ->> 'continuationStateContractSha256' = '\"+OLD.T+\"'\\n\"\n    +'      and public.'+ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[1].name+'(v_payload,v_central_reference)\\n'\n    +'    then\\n      -- Authenticated immutable591 predecessor; only a strictly LATER ordinary generation.\\n'\n    +'      v_central_is_compatible_predecessor := false;\\n';\n  assert.equal(casBefore.split(originalBranch).length,2,'Eksisterende ægte591-gren fra installeret593');\n  const branch=once(originalBranch,OLD.T,next.T);\n  add(CP+'cas',once(casBefore,originalBranch,branch+originalBranch));\n  const contractBefore=definition(before,CP+'contract');\n  add(CP+'contract',once(contractBefore,\"where m.version::text = '\"+OLD.version+\"'\",\"where m.version::text = '\"+version+\"'\"));\n  let canonicalSource=before;for(const row of changes)canonicalSource=once(canonicalSource,row.before,row.after);\n  let inverse=canonicalSource;for(const row of [...changes].reverse())inverse=once(inverse,row.after,row.before);\n  assert.equal(inverse,before,'Hele faktiske593-canonical bevares ved inverse');\n  for(const name of [...before.matchAll(/^create or replace function public\\.([a-z0-9_]+)\\(/gm)].map(match=>match[1]))\n    if(!changes.some(row=>row.name===name))assert.equal(definition(canonicalSource,name),definition(before,name));\n  assert.equal(definition(canonicalSource,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[0].name),definition(before,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[0].name));\n  assert.equal(definition(canonicalSource,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[1].name),definition(before,ASSISTANT_PUBLIC591_SUCCESSOR_ALIASES[1].name));\n  const checkpoint=profile.checkpointFromBase(canonicalSource,checkpointCasContractFromCanonicalSource(canonicalSource,{sourcePhase:'native-original-continuity'}));\n  return Object.freeze({schemaVersion:1,kind:profile.kind,admission:'NO_ADMISSION',nextBinding:next,\n    aliases:[],changes,canonicalSource,canonicalSha256:sha(canonicalSource),checkpointContractSha256:checkpoint.sha256,\n    tripBindingPolicySha256:tripBindingPolicyFromCanonicalSource(canonicalSource).sha256,\n    originalCanonicalSha256:sha(before),wholeCanonicalInverse:true,sameH0Capability:false,numericalSqlRulesChanged:false,\n    migrationIssued:false,sqlExecuted:false,installationPerformed:false,originalStateFamily:'591',databaseBeforeRelease:593});\n}\n\nconst CORE_REPLACEMENTS=['integrated_state_valid','payload_valid','integrated_state_reason','payload_reason']\n.map(s=>CP+s).concat(['ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);\nconst literal=value=>{assert(typeof value==='string'&&!value.includes(\"'\"));return \"'\"+value+\"'\";};\n\nfunction body(source){\n  const start=source.indexOf('as $$');assert(start>0);\n  return source.slice(start+5,source.lastIndexOf('$$;')).trim();\n}\n"
      ],
      [
        "export async function buildAssistantPublic591BindingSuccessor(options){\n  assert.equal(arguments.length,1);\n  const core=await prepareAssistantPublic591SuccessorStructure(options);\n  const prior=await readAssistantPublic591PredecessorCanonicalSource();\n  const result=wrap(core,prior,PUBLIC591);\n  assert.equal(result.migrationIssued,false);assert.equal(result.productionAuthority,false);\n  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});\n}\n\n\nasync function main(){\n  const args=process.argv.slice(2);\n  if(args[0]==='--active'){\n    // Det eksisterende normale source-mål følger kun det kildeejede aktive objekt.\n    // De navngivne gamle CLI-indgange bevares til autentiske frozen-banker.\n    assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor'].includes(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase));\n    args.shift();args.unshift(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor'\n      ?'--public591-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'\n      ?'--public590-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'\n      ?'--public588-successor':'--public587-successor');\n  }\n  const public591=args[0]==='--public591-successor';\n  if(public591)args.shift();\n  if(public591){\n    // Lukket ny indgang: NULL afvises før konstruktion, modelberegning eller fil-I/O.\n    const issued=requireAssistantPublic591SuccessorBinding(),pins=requireAssistantPublic591SuccessorOutput();\n    requireAssistantPublic591SuccessorRelease();\n    assert(args.length===0||(args.length===1&&['--check','--write'].includes(args[0])));\n    const result=await buildAssistantPublic591BindingSuccessor({version:issued.version});\n",
        "export async function buildAssistantPublic591BindingSuccessor(options){\n  assert.equal(arguments.length,1);\n  const core=await prepareAssistantPublic591SuccessorStructure(options);\n  const prior=await readAssistantPublic591PredecessorCanonicalSource();\n  const result=wrap(core,prior,PUBLIC591);\n  assert.equal(result.migrationIssued,false);assert.equal(result.productionAuthority,false);\n  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});\n}\nexport async function buildInstalled593Original591BindingSuccessor(options){\n  assert.equal(arguments.length,1);\n  const core=await prepareInstalled593Original591SuccessorStructure(options);\n  const result=wrap(core,await readAssistantPublic591SuccessorCanonicalSource(),INSTALLED593_ORIGINAL591);\n  assert.equal(result.aliases.length,0);assert.equal(result.originalStateFamily,'591');\n  return Object.freeze({...result,sameH0Capability:false,admission:'NO_ADMISSION'});\n}\n\n\nasync function main(){\n  const args=process.argv.slice(2);\n  if(args[0]==='--active'){\n    // Det eksisterende normale source-mål følger kun det kildeejede aktive objekt.\n    // De navngivne gamle CLI-indgange bevares til autentiske frozen-banker.\n    assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase));\n    args.shift();args.unshift(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-installed593-origin591-successor'\n      ?'--installed593-origin591-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public591-successor'\n      ?'--public591-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public590-successor'\n      ?'--public590-successor':ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-public588-successor'\n      ?'--public588-successor':'--public587-successor');\n  }\n  if(args[0]==='--installed593-origin591-successor'){\n    args.shift();const issued=requireInstalled593Original591Binding(),pins=requireInstalled593Original591Output();\n    requireInstalled593Original591Release();\n    assert(args.length===0||(args.length===1&&['--check','--write'].includes(args[0])));\n    const result=await buildInstalled593Original591BindingSuccessor({version:issued.version});\n    assert.deepEqual(result.nextBinding,issued);\n    assert.deepEqual({migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,\n      checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256},pins);\n    const file=path.join(ROOT,'supabase/migrations',installed593Original591Migration().filename);\n    if(args[0]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});\n    else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));\n    console.log('Exact installed593/original591 later-H0 successor checked; no installation or state admission.');return;\n  }\n  const public591=args[0]==='--public591-successor';\n  if(public591)args.shift();\n  if(public591){\n    // Lukket ny indgang: NULL afvises før konstruktion, modelberegning eller fil-I/O.\n    const issued=requireAssistantPublic591SuccessorBinding(),pins=requireAssistantPublic591SuccessorOutput();\n    requireAssistantPublic591SuccessorRelease();\n    assert(args.length===0||(args.length===1&&['--check','--write'].includes(args[0])));\n    const result=await buildAssistantPublic591BindingSuccessor({version:issued.version});\n"
      ]
    ]
  }
};
// Test DATA only. Offsets are UTF-16 source indices, checked against both
// complete reviewed source digests and the exact bytes of each changed slice.
// Exact whole after597 -> genuine597 TEST DATA only; no runtime admission.
const reviewedAfter597=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs": {
    "before": "d07922fbe0406f46ed41bf40633d2b6ed02275dd4683acee8f37e99dae48a01a",
    "after": "f49dbb2be0840d5d57ac9ebe847abed57884e320becc2c1ac7332d03ff14721d",
    "beforeBytes": 46429,
    "afterBytes": 53718,
    "hunks": [
      [
        629,
        629,
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n",
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE||profile===SOURCE597_CODE_PROFILE||profile===SOURCE597_ORIGINAL_DATA_PROFILE,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n"
      ],
      [
        24172,
        24249,
        "const ASSERTION_SUFFIX=profile===SOURCE594_ORIGINAL_DATA_PROFILE?SOURCE_594_ASSERTION_SUFFIX:profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n",
        "// New normal597 originals only. This is deliberately not a retag of the594\n// metadata assertion: a metadata-only working view is not a new597 B/S bank.\nconst SOURCE_597_ASSERTION_SUFFIX=String.raw`\n// DATA assertions over whole immutable803f normal597 origin implementation.\n// No original/ForPart/finalizer handle or metadata admission is minted here.\nasync function source597OriginData(descriptor,conditions,centralContract) {\n  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');\n  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'SOURCE_597_DESCRIPTOR');\n  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();\n  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'SOURCE_597_FAMILY');\n  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);\n  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,\n    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,\n    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,\n    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});\n  need(conditions[ATTEST]?.kind===KIND&&conditions[ATTEST]?.transition==='NORMAL_STRICT_CONTINUATION','SOURCE_597_NORMAL_GENERATION_REQUIRED');\n  validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});\n  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');\n  return {pairs,binding,candidate,contracts};\n}\nexport async function assertSource597OriginSnapshotData(options) {\n  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');\n  const {descriptor,conditions,centralContract,checkpoint}=options;\n  const {pairs,binding,candidate,contracts}=await source597OriginData(descriptor,conditions,centralContract);\n  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)\n    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256\n    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt\n    &&SHA.test(checkpoint.generationSha256),'SOURCE_597_CHECKPOINT');\n  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())\n    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');\n  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])\n    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');\n}\n`;\nconst ASSERTION_SUFFIX=profile===SOURCE597_ORIGINAL_DATA_PROFILE?SOURCE_597_ASSERTION_SUFFIX:profile===SOURCE594_ORIGINAL_DATA_PROFILE?SOURCE_594_ASSERTION_SUFFIX:profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n"
      ],
      [
        26194,
        29162,
        "",
        "  if(profile===SOURCE597_ORIGINAL_DATA_PROFILE)assertSource597OriginalDataSourceSelected();\n  if(profile===SOURCE597_CODE_PROFILE)assertSource597CodeSourceSelected();\n"
      ],
      [
        28205,
        31340,
        "    const builderArgs=(profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE)?['--installed593-origin591-successor','--check']:\n",
        "    const builderArgs=(profile===SOURCE597_CODE_PROFILE||profile===SOURCE597_ORIGINAL_DATA_PROFILE)?['--scalar597-later-h0','--check']:\n      (profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE)?['--installed593-origin591-successor','--check']:\n"
      ],
      [
        40976,
        44231,
        "",
        "// Fixed source selection for a future assistant successor.803f is source data,\n// never proof of installed597, a new normal597 B/S generation, or delivery.\nexport const SOURCE597_CODE_SOURCE_PROVENANCE=Object.freeze({\n  selected:true,purpose:'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION',\n  head:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',tree:'a5df6f32aac090c948be97a4a5532bb07482a31d',\n  candidateFiles:101,integratedFiles:100,\n  originSha256:'e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42',\n  partPipelineSha256:'8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758',\n  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',\n  publicProjectionContractSha256:'24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec',\n});\nconst SOURCE597_CODE_PROFILE=Object.freeze({...SOURCE597_CODE_SOURCE_PROVENANCE,\n  builder:'scripts/build-assistant-later-h0-successor.mjs',\n  builderChecked:'Exact scalar597/original594 later-H0 source checked; no installation or state admission.',\n  assertion:null,temporaryPrefix:'rr-source-a597-code-',\n  candidate:'23d97454ec9578e441a0482cf028ae347b2da5ee2ed97560246b486ee46364c5',\n  integrated:'68f118fbb07b252fab89f12ed0bf82816cd74b04afc306b00c2b3a8ccfe25c81',\n  additionalMigrations:Object.freeze([...SOURCE594_CODE_PROFILE.additionalMigrations,\n    Object.freeze({path:'supabase/migrations/20261104004400_scalar597_later_h0_original594_bound_successor.sql',\n      sha256:'bc8735d450ed547d2c0116704a319ab8854a47e34bac86974541050260e2174e'})]),\n  runtimeContracts:Object.freeze({continuationStateContractSha256:'67665c10d2bd134fb598af1c36a41c2d53bb2820344c577ada30bcfbd6afe8e1',\n    fullRuntimeContractSha256:SOURCE597_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,\n    publicProjectionContractSha256:SOURCE597_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),\n});\nconst SOURCE597_ORIGINAL_DATA_PROFILE=Object.freeze({...SOURCE597_CODE_PROFILE,\n  purpose:'NEW_NORMAL_597_ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',\n  assertion:'scripts/lib/established-native-current-origin-597-assertion.mjs',temporaryPrefix:'rr-source-a597-data-'});\n\n"
      ],
      [
        46421,
        51833,
        "",
        "\nconst source597Code=fixedSource(SOURCE597_CODE_PROFILE);\nconst source597OriginalData=fixedSource(SOURCE597_ORIGINAL_DATA_PROFILE);\nexport function assertSource597CodeSourceSelected(){\n  assert.equal(arguments.length,0,'No caller-selected597 CODE source');\n  const source=SOURCE597_CODE_SOURCE_PROVENANCE;\n  assert.equal(source.selected,true);assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');\n  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',\n    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());\n  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);\n  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);\n  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])\n    assert.match(source[key],/^[a-f0-9]{64}$/);\n  return source;\n}\nexport async function withSource597CodeParent(callback){\n  assertSource597CodeSourceSelected();return source597Code(...arguments);\n}\nexport function assertSource597OriginalDataSourceSelected(){\n  assert.equal(arguments.length,0);assertSource597CodeSourceSelected();\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.purpose,'NEW_NORMAL_597_ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION');\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.head,SOURCE597_CODE_SOURCE_PROVENANCE.head);\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.tree,SOURCE597_CODE_SOURCE_PROVENANCE.tree);\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.assertion,'scripts/lib/established-native-current-origin-597-assertion.mjs');\n}\nexport async function withSource597OriginalDataSource(callback){\n  assertSource597OriginalDataSourceSelected();return source597OriginalData(...arguments);\n}\n"
      ]
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "before": "d7465a5d3d2abee68ffac57beb2a707db0dcb1c9f39811d6249181b73626b1ac",
    "after": "4a4a3c8ed2f3c818ada8401411c744325fdad502b44c9a1f2e4b54067e88148e",
    "beforeBytes": 21969,
    "afterBytes": 23303,
    "hunks": [
      [
        969,
        969,
        "  withSource594OriginalDataSource,assertSource594OriginalDataSourceSelected,SOURCE594_CODE_SOURCE_PROVENANCE}\n",
        "  withSource594OriginalDataSource,assertSource594OriginalDataSourceSelected,SOURCE594_CODE_SOURCE_PROVENANCE,\n  withSource597OriginalDataSource,assertSource597OriginalDataSourceSelected,SOURCE597_CODE_SOURCE_PROVENANCE}\n"
      ],
      [
        1467,
        1577,
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE_FROZEN594,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n",
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE_FROZEN594||profile===SOURCE_FROZEN597,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n"
      ],
      [
        7719,
        7857,
        "  const conditionsMaximum=profile===FROZEN591||profile===SOURCE_FROZEN594\n",
        "  const conditionsMaximum=profile===FROZEN591||profile===SOURCE_FROZEN594||profile===SOURCE_FROZEN597\n"
      ],
      [
        21965,
        22131,
        "",
        "\n// Independent capability family over a genuinely new normal597 B/S bank.\n// CODE selection never establishes installation, CURRENT/S or original data.\n// The fixed597 DATA host rejects metadata-only views and historical594 banks.\nconst SOURCE_FROZEN597=Object.freeze({\n  sourceHead:SOURCE597_CODE_SOURCE_PROVENANCE.head,\n  requiredSha:Object.freeze([SOURCE597_CODE_SOURCE_PROVENANCE.originSha256,\n    SOURCE597_CODE_SOURCE_PROVENANCE.partPipelineSha256]),\n  withSource:withSource597OriginalDataSource,\n  assertionPath:'scripts/lib/established-native-current-origin-597-assertion.mjs',\n  assertionExport:'assertSource597OriginSnapshotData',\n  temporaryPrefix:'rr-source597-snapshot-',errorPrefix:'SOURCE597_PREDECESSOR_'});\nconst sourceSnapshot597=fixedSnapshot(SOURCE_FROZEN597);\nexport async function readAuthenticatedSource597Predecessor(){\n  assertSource597OriginalDataSourceSelected();return sourceSnapshot597.read(...arguments);\n}\nexport function assertAuthenticatedSource597Snapshot(handle){return sourceSnapshot597.snapshot(...arguments);}\nexport async function assertAuthenticatedSource597SnapshotFresh(handle){return sourceSnapshot597.fresh(...arguments);}\n"
      ]
    ]
  },
  "scripts/lib/established-native-current-origin.mjs": {
    "before": "e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42",
    "after": "fe1dad972fc236c42ebb3c9457d9c192f81ede06dd6e85a2978bdf6aa8407916",
    "beforeBytes": 91600,
    "afterBytes": 96994,
    "hunks": [
      [
        3196,
        3196,
        "  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh}\n",
        "  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh,\n  readAuthenticatedSource597Predecessor,assertAuthenticatedSource597Snapshot,assertAuthenticatedSource597SnapshotFresh}\n"
      ],
      [
        3873,
        3993,
        "",
        "});\n// Kun den allerede ægte udstedte597-forælder. Ny C/I/T kommer senere fra den\n// normale genererede model; controller-/SQL-profiler må ikke importeres i C/I.\nconst ASSISTANT_AFTER597_ORIGINAL597=Object.freeze({\n  I:'68f118fbb07b252fab89f12ed0bf82816cd74b04afc306b00c2b3a8ccfe25c81',\n  C:'23d97454ec9578e441a0482cf028ae347b2da5ee2ed97560246b486ee46364c5',\n  T:'67665c10d2bd134fb598af1c36a41c2d53bb2820344c577ada30bcfbd6afe8e1',\n"
      ],
      [
        49679,
        50230,
        "",
        "    || isAssistantAfter597OriginParentBinding(descriptor.modelBinding)\n"
      ],
      [
        51515,
        52137,
        "",
        "    if(isAssistantAfter597OriginParentBinding(descriptor.modelBinding))\n      return readAssistantFrozen597LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n"
      ],
      [
        91589,
        92399,
        "",
        "\n// Rene597-værdikontroller; de skaber ingen kapabilitet eller installationsbevis.\nexport function isAssistantAfter597OriginParentBinding(binding){\n  return binding?.modelBundleSha256===ASSISTANT_AFTER597_ORIGINAL597.I;\n}\nexport function assertAssistantAfter597OriginParentMetadata(descriptor,checkpoint){\n  need(isAssistantAfter597OriginParentBinding(descriptor?.modelBinding)\n    &&descriptor.contractHashes?.continuationStateContractSha256===ASSISTANT_AFTER597_ORIGINAL597.T\n    &&checkpoint?.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256===ASSISTANT_AFTER597_ORIGINAL597.C,\n    '597_FIXED_ORIGINAL_BINDING');return true;\n}\nexport function assertAssistantAfter597OriginTarget(descriptor,target){\n  need(arguments.length===2&&isAssistantAfter597OriginParentBinding(descriptor?.modelBinding)\n    &&descriptor.contractHashes?.continuationStateContractSha256===ASSISTANT_AFTER597_ORIGINAL597.T,'597_FIXED_ORIGINAL_BINDING');\n  need(hour(target)&&hour(descriptor.productionReferenceAt)\n    &&Date.parse(target)>Date.parse(descriptor.productionReferenceAt),'597_LATER_TARGET');return true;\n}\nasync function readAssistantFrozen597LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  // En uændret597-model kan ikke aktivere overgangen. Den normale controller\n  // kræver desuden udstedt output før arbejdsfiler og autentificerede læsere.\n  need(isAssistantAfter597OriginParentBinding(descriptor.modelBinding)\n    &&currentSource.integrated!==ASSISTANT_AFTER597_ORIGINAL597.I,'597_FAMILY');\n  assertAssistantAfter597OriginTarget(descriptor,process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);\n  const original597=await readAuthenticatedSource597Predecessor();\n  const snapshot=assertAuthenticatedSource597Snapshot(original597);\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'597_ORIGINAL_CHANGED');\n  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();\n  assertAssistantAfter597OriginParentMetadata(descriptor,snapshot.checkpoint);\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '597_ISSUED_CURRENT_SOURCE');\n  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)\n    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),\n    '597_METADATA_ONLY');\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'597_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'597_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n    need(inverseI.modelBundleSha256===I.modelBundleSha256,'597_CURRENT_PAIR_BINDING');\n    inverseI.modelBundleSha256=originalI.modelBundleSha256;\n    if(Object.hasOwn(inverseG,'modelBundleSha256')){\n      need(inverseG.modelBundleSha256===C.modelBundleSha256,'597_CURRENT_CANDIDATE_BINDING');\n      inverseG.modelBundleSha256=originalG.modelBundleSha256;\n    }\n    need(same(inverseI,originalI)&&same(inverseG,originalG),'597_WHOLE_PAIR_INVERSE');\n  }\n  need(same(await readPointer(request),before),'SOURCE_CHANGED');\n  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  await assertAuthenticatedSource597SnapshotFresh(original597);\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n"
      ]
    ]
  },
  "scripts/assistant-later-h0-binding-prewrite.mjs": {
    "before": "a87b9960dfcd35ccda2a8de8ce6fea35783fc3a25ef49dde806643d309d05384",
    "after": "80b6e2752da4409603a44e59a2112ddd5b18271fc7572f50dfa02eb3ba7e473a",
    "beforeBytes": 25667,
    "afterBytes": 26512,
    "hunks": [
      [
        502,
        502,
        "import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource,withSource594OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';\n",
        "import {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,requireAssistantAfter597Output} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource,withSource594OriginalDataSource,withSource597OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';\n"
      ],
      [
        1342,
        1405,
        "  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n",
        "  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh,\n  readAuthenticatedSource597Predecessor,assertAuthenticatedSource597Snapshot,assertAuthenticatedSource597SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n"
      ],
      [
        1608,
        1791,
        "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan,assertScalar597LaterH0MigrationPlan} from './integrated-cutover-readiness.mjs';\n",
        "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan,assertScalar597LaterH0MigrationPlan,assertAssistantAfter597MigrationPlan} from './integrated-cutover-readiness.mjs';\n"
      ],
      [
        2866,
        3086,
        "assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor','scalar597-later-h0-original594-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='scalar597-later-h0-original594-successor'?Object.freeze({\n",
        "assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor','scalar597-later-h0-original594-successor','assistant-mixed-after597-successor'].includes(ACTIVE.sourcePhase));\nexport function assistantAfter597PrewritePredecessor(){\n  assert.equal(arguments.length,0,'Ingen caller-valgt originalfamilie');\n  requireAssistantAfter597Output(); // Uudstedt gren stopper før filer, B/S eller læseklienter.\n  return Object.freeze({withSource:withSource597OriginalDataSource,read:readAuthenticatedSource597Predecessor,\n    snapshot:assertAuthenticatedSource597Snapshot,fresh:assertAuthenticatedSource597SnapshotFresh,\n    plan:assertAssistantAfter597MigrationPlan});\n}\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-mixed-after597-successor'?assistantAfter597PrewritePredecessor():\n  ACTIVE.sourcePhase==='scalar597-later-h0-original594-successor'?Object.freeze({\n"
      ]
    ]
  },
  "scripts/build-assistant-later-h0-successor.mjs": {
    "before": "e789b73ba57efed3ceaab3bd6cc27a31f812aae1cc1088b395576557ac4720d5",
    "after": "4aa7120935a65728cd0018e2551a2aee2468f6eb2377c13bc89c76d613b7374c",
    "beforeBytes": 43186,
    "afterBytes": 47359,
    "hunks": [
      [
        3254,
        3254,
        "  requireScalar597LaterH0Output,scalar597LaterH0Migration}\n",
        "  requireScalar597LaterH0Output,scalar597LaterH0Migration,\n  ASSISTANT_AFTER597_BEFORE,ASSISTANT_AFTER597_ALIASES,readScalar597LaterH0CanonicalSource,\n  assistantAfter597CheckpointContractFromBase,requireAssistantAfter597Binding,\n  requireAssistantAfter597Output,requireAssistantAfter597Release,assistantAfter597Migration}\n"
      ],
      [
        6960,
        7224,
        "",
        "const ASSISTANT_AFTER597=Object.freeze({\n  previous:ASSISTANT_AFTER597_BEFORE,aliases:ASSISTANT_AFTER597_ALIASES,\n  previousRelease:597,validatorCount:43,\n  readPredecessor:readScalar597LaterH0CanonicalSource,\n  checkpointFromBase:assistantAfter597CheckpointContractFromBase,\n  contractTail:\"    || E'\\\\n-- assistant-later-h0-original594-payload-validator --\\\\n' || v_ask594_payload_definition;\",\n  kind:'ASSISTANT_AFTER597_SUCCESSOR_STRUCTURE',\n});\n"
      ],
      [
        6993,
        7707,
        "  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591||profile===INSTALLED593_ORIGINAL591||profile===SCALAR597_LATER_H0,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n",
        "  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591||profile===INSTALLED593_ORIGINAL591||profile===SCALAR597_LATER_H0||profile===ASSISTANT_AFTER597,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n"
      ],
      [
        9504,
        10248,
        "",
        "// Samme normale aliaskonstruktion som prepareStructure. Kun ægte597-kildedata;\n// ingen ny tuple, version, migrationsfil, udstedelse eller installationsautoritet.\nexport async function prepareAssistantAfter597PredecessorAliases(){\n  assert.equal(arguments.length,0,'Ingen caller-valgt familie, kilde eller version');\n  const prior=await ASSISTANT_AFTER597.readPredecessor();\n  const prepared=predecessorAliases(ASSISTANT_AFTER597,prior);\n  const contract=definition(prior.canonicalSource,CP+'contract');\n  const oid=/  v_validator_oids oid\\[\\] := array\\[([\\s\\S]*?)\\n  \\];/.exec(contract);assert(oid);\n  assert.equal([...oid[1].matchAll(/pg_catalog\\.to_regprocedure\\(/g)].length,ASSISTANT_AFTER597.validatorCount);\n  assert.equal(contract.split(ASSISTANT_AFTER597.contractTail).length,2);\n  return Object.freeze({kind:'ASSISTANT_AFTER597_PREDECESSOR_ALIASES_ONLY',admission:'NO_ADMISSION',\n    aliases:prepared.aliases,originalCanonicalSha256:sha(prior.canonicalSource),\n    originalCanonicalUnchanged:true,validatorCount:ASSISTANT_AFTER597.validatorCount,\n    nextBinding:null,migration:null,migrationIssued:false,installationPerformed:false,sameH0Capability:false});\n}\n// Den eksisterende DATA-konstruktør får først et reelt tidsstempel ved særskilt\n// normal udstedelse. Den skriver intet og giver aldrig produktionsautoritet.\n// Den normale CLI nedenfor kræver allerede udstedte bindinger før ethvert I/O.\nexport async function prepareAssistantAfter597SuccessorStructure(options){\n  assert.equal(arguments.length,1);assert(options&&Object.getPrototypeOf(options)===Object.prototype);\n  assert.deepEqual(Object.keys(options),['version'],'Kun normalt tidsstempel; ingen caller-valgt profil eller tuple');\n  assert.equal(typeof options.version,'string');assert.match(options.version,/^[0-9]{14}$/);\n  assert(options.version>ASSISTANT_AFTER597_BEFORE.version);\n  return prepareStructure(ASSISTANT_AFTER597,options.version);\n}\nfunction predecessorAliases(profile,prior){\n  fixedProfile(profile);const OLD=profile.previous,ALIASES=profile.aliases,before=prior.canonicalSource;\n  assert.equal(sha(before),OLD.canonicalSha256);\n  const [stateAlias,payloadAlias]=ALIASES.map(r=>r.name);\n  for(const row of ALIASES)assert(!before.includes('function public.'+row.name+'('));\n  const stateBefore=definition(before,CP+'integrated_state_valid'),payloadBefore=definition(before,CP+'payload_valid');\n  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(','function public.'+stateAlias+'(');\n  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(','function public.'+payloadAlias+'('),\n    'public.'+CP+'integrated_state_valid(','public.'+stateAlias+'(');\n  assert.equal(once(state,'function public.'+stateAlias+'(','function public.'+CP+'integrated_state_valid('),stateBefore);\n  assert.equal(once(once(payload,'function public.'+payloadAlias+'(','function public.'+CP+'payload_valid('),\n    'public.'+stateAlias+'(','public.'+CP+'integrated_state_valid('),payloadBefore);\n  return Object.freeze({stateAlias,payloadAlias,aliases:[{...ALIASES[0],definition:state},{...ALIASES[1],definition:payload}]});\n}\n\n"
      ],
      [
        10584,
        14468,
        "  assert.equal(sha(before),OLD.canonicalSha256);\n  const [stateAlias,payloadAlias]=ALIASES.map(r=>r.name);\n  for(const row of ALIASES)assert(!before.includes('function public.'+row.name+'('));\n  const stateBefore=definition(before,CP+'integrated_state_valid'),payloadBefore=definition(before,CP+'payload_valid');\n  const state=once(stateBefore,'function public.'+CP+'integrated_state_valid(','function public.'+stateAlias+'(');\n  const payload=once(once(payloadBefore,'function public.'+CP+'payload_valid(','function public.'+payloadAlias+'('),\n    'public.'+CP+'integrated_state_valid(','public.'+stateAlias+'(');\n  assert.equal(once(state,'function public.'+stateAlias+'(','function public.'+CP+'integrated_state_valid('),stateBefore);\n  assert.equal(once(once(payload,'function public.'+payloadAlias+'(','function public.'+CP+'payload_valid('),\n    'public.'+stateAlias+'(','public.'+CP+'integrated_state_valid('),payloadBefore);\n  const aliases=[{...ALIASES[0],definition:state},{...ALIASES[1],definition:payload}];\n",
        "  const {stateAlias,payloadAlias,aliases}=predecessorAliases(profile,prior);\n"
      ],
      [
        34198,
        37139,
        "",
        "export async function buildAssistantAfter597BindingSuccessor(options){\n  assert.equal(arguments.length,1);\n  const core=await prepareAssistantAfter597SuccessorStructure(options);\n  return wrap(core,await readScalar597LaterH0CanonicalSource(),ASSISTANT_AFTER597);\n}\n"
      ],
      [
        34507,
        37713,
        "",
        "  if(args[0]==='--active'&&ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-mixed-after597-successor')\n    args[0]='--assistant-after597';\n  if(args[0]==='--assistant-after597'){\n    const issued=requireAssistantAfter597Binding(),pins=requireAssistantAfter597Output();\n    requireAssistantAfter597Release();\n    assert.equal(args.length,2);assert(['--check','--write'].includes(args[1]));\n    const result=await buildAssistantAfter597BindingSuccessor({version:issued.version});\n    assert.deepEqual(result.nextBinding,issued);assert.deepEqual(scalar597Output(result),pins);\n    const file=path.join(ROOT,'supabase/migrations',assistantAfter597Migration().filename);\n    if(args[1]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});\n    else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));\n    console.log('Præcis assistentkilde efter597 kontrolleret; ingen installation eller tilstandsoptagelse.');\n    return;\n  }\n"
      ]
    ]
  }
});
function inverseReviewedAfter597(source,file){
  const row=reviewedAfter597[file];
  if(!row||hash(source)!==row.after)return source;
  assert.equal(Buffer.byteLength(source),row.afterBytes);const actual=source;
  for(const [,offset,prior,current] of [...row.hunks].reverse()){
    assert.equal(source.slice(offset,offset+current.length),current);
    source=source.slice(0,offset)+prior+source.slice(offset+current.length);
  }
  assert.equal(hash(source),row.before);assert.equal(Buffer.byteLength(source),row.beforeBytes);
  let roundtrip=source;
  for(const [offset,,prior,current] of [...row.hunks].reverse()){
    assert.equal(roundtrip.slice(offset,offset+prior.length),prior);
    roundtrip=roundtrip.slice(0,offset)+current+roundtrip.slice(offset+prior.length);
  }
  assert.equal(roundtrip,actual,'Whole after597 -> genuine597 -> after597 test DATA roundtrip');
  return source;
}
const reviewed597=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs": {
    "before": "00dc5244da4e9fe82b761f7ec2c8c4b394e4b2f97db7c225d99de9c1a9bf83e8",
    "after": "d07922fbe0406f46ed41bf40633d2b6ed02275dd4683acee8f37e99dae48a01a",
    "hunks": [
      [
        629,
        629,
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n",
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n"
      ],
      [
        23802,
        23879,
        "const ASSERTION_SUFFIX=profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n",
        "const SOURCE_594_ASSERTION_SUFFIX=ORIGINAL_591_ASSERTION_SUFFIX\n  .replaceAll('591','594')\n  .replace('a157 issued594','37a34703 issued594')\n  .replace('516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c',\n    'b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa');\nconst ASSERTION_SUFFIX=profile===SOURCE594_ORIGINAL_DATA_PROFILE?SOURCE_594_ASSERTION_SUFFIX:profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n"
      ],
      [
        25754,
        26194,
        "",
        "  if(profile===SOURCE594_ORIGINAL_DATA_PROFILE)assertSource594OriginalDataSourceSelected();\n  if(profile===SOURCE594_CODE_PROFILE)assertSource594CodeSourceSelected();\n"
      ],
      [
        26195,
        26802,
        "  const index=await inventory(),sourceFiles=await selected(index),files=[...sourceFiles,ASSERTION,GIT_REFERENCE].sort();\n",
        "  const index=await inventory(),sourceFiles=await selected(index),files=[...sourceFiles,...(ASSERTION===null?[]:[ASSERTION]),GIT_REFERENCE].sort();\n"
      ],
      [
        27571,
        28205,
        "    const builderArgs=profile===FROZEN591?['--public590-successor','--check']:\n",
        "    const builderArgs=(profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE)?['--installed593-origin591-successor','--check']:\n      profile===FROZEN591?['--public590-successor','--check']:\n"
      ],
      [
        37627,
        38395,
        "",
        "export const SOURCE594_CODE_SOURCE_PROVENANCE=Object.freeze({\n  \"selected\": true,\n  \"purpose\": \"CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION\",\n  \"head\": \"37a34703d9ae8bfb2c28056f21a7ea73944033ae\",\n  \"tree\": \"09aef7f6f5d965f565fadabea203b50687acc255\",\n  \"candidateFiles\": 100,\n  \"integratedFiles\": 99,\n  \"originSha256\": \"b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa\",\n  \"partPipelineSha256\": \"8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758\",\n  \"fullRuntimeContractSha256\": \"ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff\",\n  \"publicProjectionContractSha256\": \"24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec\"\n});\nconst SOURCE594_CODE_PROFILE=Object.freeze({\n  ...SOURCE594_CODE_SOURCE_PROVENANCE,\n  builder:'scripts/build-assistant-later-h0-successor.mjs',\n  builderChecked:'Exact installed593/original591 later-H0 successor checked; no installation or state admission.',\n  assertion:null,temporaryPrefix:'rr-source-a594-code-',\n  candidate:'2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b',integrated:'08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c',\n  additionalMigrations:Object.freeze([...FROZEN591.additionalMigrations,\n    Object.freeze({path:'supabase/migrations/20261029183010_assistant_public591_later_h0_original_bound_successor.sql',sha256:'e5c7fb182d9491bd9222cb59dbefd3da4592867522dde805ea17e67c0d023e97'}),\n    Object.freeze({path:'supabase/migrations/20261030105202_assistant_public591_later_h0_original_bound_successor.sql',sha256:'47c51886a58aa1cfbbc244a5469ace67521774499135666c26fccd8c7f291bfd'}),\n    Object.freeze({\n    path:'supabase/migrations/20261031070755_installed593_original591_later_h0_bound_successor.sql',\n    sha256:'0d50a857aebf838c072ee7ccfc846fecd9744f9bb093eb6943b0484eee99c777'})]),\n  runtimeContracts:Object.freeze({continuationStateContractSha256:'a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa',\n    fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',\n    publicProjectionContractSha256:'24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec'}),\n});\n// This is only an immutable DATA validator host. B/S, original attestations,\n// registry/snapshot and fresh CURRENT/S versions must still be authenticated.\nconst SOURCE594_ORIGINAL_DATA_PROFILE=Object.freeze({...SOURCE594_CODE_PROFILE,\n  purpose:'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',\n  assertion:'scripts/lib/established-native-current-origin-594-assertion.mjs',temporaryPrefix:'rr-source-a594-data-'});\n\n"
      ],
      [
        41139,
        44488,
        "",
        "\nconst source594Code=fixedSource(SOURCE594_CODE_PROFILE);\nexport function assertSource594CodeSourceSelected(){\n  assert.equal(arguments.length,0,'No caller-selected594 CODE source');\n  const source=SOURCE594_CODE_SOURCE_PROVENANCE;\n  assert.equal(source.selected,true);assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');\n  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',\n    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());\n  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);\n  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);\n  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])\n    assert.match(source[key],/^[a-f0-9]{64}$/);\n  return source; // Proposed CODE data only, not qualification or original admission.\n}\nexport async function withSource594CodeParent(callback){\n  assertSource594CodeSourceSelected();return source594Code(...arguments);\n}\n\n\nconst source594OriginalData=fixedSource(SOURCE594_ORIGINAL_DATA_PROFILE);\nexport function assertSource594OriginalDataSourceSelected(){\n  assert.equal(arguments.length,0);assertSource594CodeSourceSelected();\n  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.purpose,'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION');\n  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.head,SOURCE594_CODE_SOURCE_PROVENANCE.head);\n  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.tree,SOURCE594_CODE_SOURCE_PROVENANCE.tree);\n  assert.equal(SOURCE594_ORIGINAL_DATA_PROFILE.assertion,'scripts/lib/established-native-current-origin-594-assertion.mjs');\n}\nexport async function withSource594OriginalDataSource(callback){\n  assertSource594OriginalDataSourceSelected();return source594OriginalData(...arguments);\n}\n"
      ]
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "before": "3f47d6808f563b456d173e63be919e79ec57bff959e8e216aeeeb9096d7b368b",
    "after": "d7465a5d3d2abee68ffac57beb2a707db0dcb1c9f39811d6249181b73626b1ac",
    "hunks": [
      [
        861,
        861,
        "  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE}\n",
        "  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE,\n  withSource594OriginalDataSource,assertSource594OriginalDataSourceSelected,SOURCE594_CODE_SOURCE_PROVENANCE}\n"
      ],
      [
        1357,
        1467,
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n",
        "  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE_FROZEN594,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n"
      ],
      [
        2540,
        2678,
        "  {env:environment(),encoding:'utf8',timeout:30000,maxBuffer:16*MB})).stdout.trim();\n",
        "  {env:{...environment(),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'},encoding:'utf8',timeout:30000,maxBuffer:16*MB})).stdout.trim();\n"
      ],
      [
        7398,
        7719,
        "  const conditionsMaximum=profile===FROZEN591?PRIVATE_CONDITIONS_MAX_BYTES:256*MB;\n",
        "  const conditionsMaximum=profile===FROZEN591||profile===SOURCE_FROZEN594\n    ?PRIVATE_CONDITIONS_MAX_BYTES:256*MB;\n"
      ],
      [
        20622,
        20976,
        "",
        "\n// CURRENT snapshot of authenticated 594 originals.\nconst SOURCE_FROZEN594=Object.freeze({\n  sourceHead:SOURCE594_CODE_SOURCE_PROVENANCE.head,\n  requiredSha:Object.freeze([SOURCE594_CODE_SOURCE_PROVENANCE.originSha256,\n    SOURCE594_CODE_SOURCE_PROVENANCE.partPipelineSha256]),\n  withSource:withSource594OriginalDataSource,\n  assertionPath:'scripts/lib/established-native-current-origin-594-assertion.mjs',\n  assertionExport:'assertFrozen594OriginSnapshotData',\n  temporaryPrefix:'rr-source594-snapshot-',errorPrefix:'SOURCE594_PREDECESSOR_'});\nconst sourceSnapshot594=fixedSnapshot(SOURCE_FROZEN594);\nexport async function readAuthenticatedSource594Predecessor(){\n  assertSource594OriginalDataSourceSelected();return sourceSnapshot594.read(...arguments);\n}\nexport function assertAuthenticatedSource594Snapshot(handle){return sourceSnapshot594.snapshot(...arguments);}\nexport async function assertAuthenticatedSource594SnapshotFresh(handle){return sourceSnapshot594.fresh(...arguments);}\n"
      ]
    ]
  },
  "scripts/lib/established-native-current-origin.mjs": {
    "before": "b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa",
    "after": "e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42",
    "hunks": [
      [
        3118,
        3118,
        "  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot}\n",
        "  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot,\n  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh}\n"
      ],
      [
        3493,
        3613,
        "",
        "const SCALAR597_ORIGINAL594=Object.freeze({\n  I:'08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c',\n  C:'2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b',\n  T:'a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa',\n});\n"
      ],
      [
        49232,
        49616,
        "",
        "    || isScalar597OriginParentBinding(descriptor.modelBinding)\n"
      ],
      [
        50891,
        51338,
        "",
        "    if(isScalar597OriginParentBinding(descriptor.modelBinding))\n      return readScalarFrozen594LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n"
      ],
      [
        86922,
        87546,
        "",
        "\n// Pure family checks shared with the normal origin reader. They mint no handle.\nexport function isScalar597OriginParentBinding(binding){\n  return binding?.modelBundleSha256===SCALAR597_ORIGINAL594.I;\n}\nexport function assertScalar597OriginParentMetadata(descriptor,checkpoint){\n  need(isScalar597OriginParentBinding(descriptor?.modelBinding)\n    &&descriptor.contractHashes?.continuationStateContractSha256===SCALAR597_ORIGINAL594.T\n    &&checkpoint?.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256===SCALAR597_ORIGINAL594.C,\n    '594_FIXED_ORIGINAL_BINDING');\n  return true;\n}\n\n// The existing ordinary origin handoff, scoped only to a strictly newer scalar597 target.\nasync function readScalarFrozen594LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  const target=process.env.RAVRADAR_PRODUCTION_TARGET_HOUR;\n  need(isScalar597OriginParentBinding(descriptor.modelBinding)\n    &&currentSource.integrated!==SCALAR597_ORIGINAL594.I,'594_FAMILY');\n  need(hour(target)&&Date.parse(target)>Date.parse(descriptor.productionReferenceAt),'594_LATER_TARGET');\n  const original594=await readAuthenticatedSource594Predecessor();\n  const snapshot=assertAuthenticatedSource594Snapshot(original594);\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'594_ORIGINAL_CHANGED');\n  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();\n  assertScalar597OriginParentMetadata(descriptor,snapshot.checkpoint);\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '594_ISSUED_CURRENT_SOURCE');\n  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)\n    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),\n    '594_METADATA_ONLY');\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'594_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'594_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n    need(inverseI.modelBundleSha256===I.modelBundleSha256,'594_CURRENT_PAIR_BINDING');\n    inverseI.modelBundleSha256=originalI.modelBundleSha256;\n    if(Object.hasOwn(inverseG,'modelBundleSha256')){\n      need(inverseG.modelBundleSha256===C.modelBundleSha256,'594_CURRENT_CANDIDATE_BINDING');\n      inverseG.modelBundleSha256=originalG.modelBundleSha256;\n    }\n    need(same(inverseI,originalI)&&same(inverseG,originalG),'594_WHOLE_PAIR_INVERSE');\n  }\n  need(same(await readPointer(request),before),'SOURCE_CHANGED');\n  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  await assertAuthenticatedSource594SnapshotFresh(original594);\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n"
      ]
    ]
  },
  "scripts/assistant-later-h0-binding-prewrite.mjs": {
    "before": "d46dc4c2741dc62608e640ca60bd6b18027df6086a71f63c26e879c4495c94e2",
    "after": "a87b9960dfcd35ccda2a8de8ce6fea35783fc3a25ef49dde806643d309d05384",
    "hunks": [
      [
        602,
        602,
        "import {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource} from './check-assistant-later-h0-predecessor-source.mjs';\n",
        "import {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource,withSource594OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';\n"
      ],
      [
        1228,
        1260,
        "  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n",
        "  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh,\n  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\n"
      ],
      [
        1456,
        1608,
        "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan} from './integrated-cutover-readiness.mjs';\n",
        "import {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan,assertScalar597LaterH0MigrationPlan} from './integrated-cutover-readiness.mjs';\n"
      ],
      [
        2678,
        2866,
        "assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'?Object.freeze({\n",
        "assert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor','scalar597-later-h0-original594-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='scalar597-later-h0-original594-successor'?Object.freeze({\n  withSource:withSource594OriginalDataSource,read:readAuthenticatedSource594Predecessor,\n  snapshot:assertAuthenticatedSource594Snapshot,fresh:assertAuthenticatedSource594SnapshotFresh,\n  plan:assertScalar597LaterH0MigrationPlan\n}):ACTIVE.sourcePhase==='assistant-installed593-origin591-successor'?Object.freeze({\n"
      ]
    ]
  },
  "scripts/build-assistant-later-h0-successor.mjs": {
    "before": "b82eebe5524c40c8dd41907ce22a7e09e652ff8b7379b45c29ea4b5841838245",
    "after": "e789b73ba57efed3ceaab3bd6cc27a31f812aae1cc1088b395576557ac4720d5",
    "hunks": [
      [
        3015,
        3015,
        "  installed593Original591Migration}\n",
        "  installed593Original591Migration,readInstalled593Original591CanonicalSource,\n  SCALAR597_LATER_H0_BEFORE,SCALAR597_LATER_H0_ALIASES,SCALAR597_LATER_H0_RELEASE,\n  scalar597LaterH0CheckpointContractFromBase,requireScalar597LaterH0Binding,\n  requireScalar597LaterH0Output,scalar597LaterH0Migration}\n"
      ],
      [
        6242,
        6504,
        "",
        "const SCALAR597_LATER_H0=Object.freeze({\n  previous:SCALAR597_LATER_H0_BEFORE,aliases:SCALAR597_LATER_H0_ALIASES,\n  previousRelease:594,validatorCount:41,\n  readPredecessor:readInstalled593Original591CanonicalSource,\n  checkpointFromBase:scalar597LaterH0CheckpointContractFromBase,\n  contractTail:\"    || E'\\\\n-- assistant-later-h0-original591-payload-validator --\\\\n' || v_ask591_payload_definition;\",\n  kind:'SCALAR597_LATER_H0_SUCCESSOR_STRUCTURE',\n});\n\n"
      ],
      [
        6274,
        6993,
        "  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591||profile===INSTALLED593_ORIGINAL591,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n",
        "  assert(profile===LEGACY586||profile===PUBLIC587||profile===PUBLIC588||profile===PUBLIC590||profile===PUBLIC591||profile===INSTALLED593_ORIGINAL591||profile===SCALAR597_LATER_H0,'ASSISTANT_SUCCESSOR_UNKNOWN_PROFILE');\n"
      ],
      [
        32902,
        33651,
        "",
        "export async function buildScalar597LaterH0BindingSuccessor(options){\n  assert.equal(arguments.length,1);\n  assert(options&&Object.getPrototypeOf(options)===Object.prototype);\n  assert.deepEqual(Object.keys(options),['version']);\n  assert.match(options.version,/^[0-9]{14}$/);\n  assert(options.version>'20261103012633','Scalar migration must follow reserved SOURCE alternatives');\n  const core=await prepareStructure(SCALAR597_LATER_H0,options.version);\n  return wrap(core,await readInstalled593Original591CanonicalSource(),SCALAR597_LATER_H0);\n}\n\nfunction scalar597Output(result){\n  return {migrationSha256:result.migrationSha256,canonicalSha256:result.afterCanonicalSha256,\n    checkpointContractSha256:result.checkpointContractSha256,tripBindingPolicySha256:result.tripBindingPolicySha256};\n}\n\n"
      ],
      [
        32961,
        34507,
        "",
        "  if(args[0]==='--scalar597-later-h0-derive'){\n    assert.equal(args.length,2);\n    const result=await buildScalar597LaterH0BindingSuccessor({version:args[1]});\n    console.log(JSON.stringify({release:SCALAR597_LATER_H0_RELEASE,binding:result.nextBinding,output:scalar597Output(result)}));\n    return;\n  }\n  if(args[0]==='--active'&&ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='scalar597-later-h0-original594-successor')\n    args[0]='--scalar597-later-h0';\n  if(args[0]==='--scalar597-later-h0'){\n    assert.equal(args.length,2);assert(['--check','--write'].includes(args[1]));\n    const issued=requireScalar597LaterH0Binding(),pins=requireScalar597LaterH0Output();\n    const result=await buildScalar597LaterH0BindingSuccessor({version:issued.version});\n    assert.deepEqual(result.nextBinding,issued);assert.deepEqual(scalar597Output(result),pins);\n    const file=path.join(ROOT,'supabase/migrations',scalar597LaterH0Migration().filename);\n    if(args[1]==='--write')await fs.writeFile(file,result.migration,{flag:'wx'});\n    else assert.deepEqual(await fs.readFile(file),Buffer.from(result.migration));\n    console.log('Exact scalar597/original594 later-H0 source checked; no installation or state admission.');\n    return;\n  }\n"
      ]
    ]
  }
});
function inverseReviewed597(source,file){
  const row=reviewed597[file];
  if(!row||hash(source)!==row.after)return source;
  const actual=source;
  for(const [,offset,prior,current] of [...row.hunks].reverse()){
    assert.equal(source.slice(offset,offset+current.length),current);
    source=source.slice(0,offset)+prior+source.slice(offset+current.length);
  }
  assert.equal(hash(source),row.before);
  let roundtrip=source;
  for(const [offset,,prior,current] of [...row.hunks].reverse()){
    assert.equal(roundtrip.slice(offset,offset+prior.length),prior);
    roundtrip=roundtrip.slice(0,offset)+current+roundtrip.slice(offset+prior.length);
  }
  assert.equal(roundtrip,actual,'Whole 597→594→597 test source inverse');
  return source;
}
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
export function inverseIssued594HistoricalSource(source,file){
  assert.equal(typeof source,'string');source=source.replace(/\r\n?/g,'\n');
  source=inverseReviewedAfter597(source,file);
  source=inverseReviewed597(source,file);
  const row=reviewed[file];if(!row||hash(source)!==row.afterSha256)return source;
  assert.equal(Buffer.byteLength(source),row.afterBytes);const original=source;
  for(const [prior,current]of [...row.hunks].reverse()){
    assert.equal(source.split(current).length,2);source=source.replace(current,()=>prior);
  }
  assert.equal(hash(source),row.beforeSha256);assert.equal(Buffer.byteLength(source),row.beforeBytes);
  let roundtrip=source;
  for(const [prior,current]of row.hunks){assert.equal(roundtrip.split(prior).length,2);roundtrip=roundtrip.replace(prior,()=>current);}
  assert.equal(roundtrip,original,'Hele594→593→594-testdatainverse');return source;
}
