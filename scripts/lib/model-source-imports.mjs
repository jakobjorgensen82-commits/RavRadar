// Explicit reviewed import inventories, never a scanner-error fallback.
// Whole hashes use the model builders' existing UTF-8/no-BOM/LF source form.
// A changed byte at one of these paths is rejected before any import choice.
import crypto from 'node:crypto';
import { exactRelativeModuleSpecifiers } from './static-module-closure.mjs';
const REVIEWED = Object.freeze({
  // Only the exact frozen584 Git source may feed these computed loaders.
  // The snapshot accessor is opaque; data assertions mint no admission.
  'scripts/lib/authenticated-frozen584-predecessor.mjs': Object.freeze({
    sha256: '900e9452cdf7cb4ed2ec73cebfd451510a1ae71dc55402fb06a66c4b256c1792',
    imports: Object.freeze(['../check-account-statistics-assistant-predecessor-source.mjs']),
  }),
  'scripts/check-account-statistics-assistant-predecessor-source.mjs': Object.freeze({
    sha256: '10ccdee12b112bcc323689c331a7bb068b7f47ae1ac60d535caf2d4523f465c1',
    imports: Object.freeze([]),
  }),
  'scripts/lib/established-native-current-origin.mjs': Object.freeze({
    sha256: 'e6aac50d3077acd501228ffa64027c6524ab4c429a9b7edf97f48f966bcfb95b',
    imports: Object.freeze(['../protected-private-production-runtime.mjs', '../protected-ravscore-continuation-checkpoint.mjs',
      '../private-production-runtime-bundle.mjs', '../ravscore-continuation-checkpoint.mjs',
      '../private-production-runtime-workflow.mjs', '../../js/core/ravscore-model-contract.js',
      '../rollback-assets/ravscore-model-contract.js', '../../js/core/ravscore-model-bundle.generated.js',
      './ravscore-sampling-context.mjs', './coastal-point-staging-contract.mjs',
      './ravscore-candidate-g-rollback-runtime.mjs', './private-weather-component-pack.mjs',
      '../check-native-current-reanalysis-predecessor-source.mjs', './ravscore-production-part-pipeline.mjs',
      './weather-state-epoch-archive.mjs', './authenticated-frozen584-predecessor.mjs',
      '../check-account-statistics-assistant-predecessor-source.mjs']),
  }),
  // Its computed imports are only from the verified, fixed immutable d7 Git
  // source materialization. That complete 122-leaf closure is independently
  // checked by this exact helper; no caller root/source is accepted.
  'scripts/check-native-current-reanalysis-predecessor-source.mjs': Object.freeze({
    sha256: '1c08778a28bc3931b42430eaa94d9659dd279f42528c5306631b971c4405928d',
    imports: Object.freeze([]),
  }),
  'scripts/protected-private-production-runtime.mjs': Object.freeze({
    sha256: 'e41b0434e14dd181c5ca3f6313456274c4fa5fcc9e97029e49f300ae0d4e4762',
    imports: Object.freeze(['./private-production-runtime-bundle.mjs', './lib/supabase-admin-rest.mjs', '../js/core/ravscore-model-contract.js',
      './lib/r2-private-runtime-storage.mjs', './lib/private-weather-component-inventory.mjs', './lib/bounded-conditions-predecessor-transition.mjs']),
  }),
  'scripts/private-production-runtime-bundle.mjs': Object.freeze({
    sha256: '2eeff25c6d6e769c7a5d9b414bfed574e0105e7cb24d0bd1578e7700781d5529',
    imports: Object.freeze(['../js/core/ravscore-model-contract.js', './lib/bounded-conditions-predecessor-transition.mjs', './lib/private-weather-component-inventory.mjs']),
  }),
});
// Additive genuine585 validation closure. These whole-source variants are
// explicit reviewed imports, never exclusions or a scanner-error fallback.
const NATIVE_CONTINUITY_REVIEWED = Object.freeze({
  'scripts/check-native-original-continuity-predecessor-source.mjs': Object.freeze({
    sha256: '17b3ce539b1f296fb75bf592fcd7393569f0dd3614974e6d7d06a836a0020922',
    imports: Object.freeze([]),
  }),
  'scripts/lib/authenticated-frozen585-predecessor.mjs': Object.freeze({
    sha256: 'b62351eb51f1871d970295957f6d4882f9a996db95ee8e7ff10b638306acc65a',
    imports: Object.freeze(['../check-native-original-continuity-predecessor-source.mjs']),
  }),
  'scripts/lib/established-native-current-origin.mjs': Object.freeze({
    sha256: 'b67f460aa9b01ff9d0ff03bfbbed5c9d570425196bf929f9bd8d7b4b67b586b1',
    imports: Object.freeze([...REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,
      './authenticated-frozen585-predecessor.mjs', '../check-native-original-continuity-predecessor-source.mjs']),
  }),
});
// Additive authentic586 -> later-H0 variants. Whole-source inventory only;
// the original584/585/586 source variants above remain byte-identical.
const ASSISTANT_LATER_H0_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'2e529a7a4e1cca1ab7ac1c16dd7292ca78263bfb980eff95c3f5c6d845eca04d',imports:Object.freeze([])}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'d0ab8aa27c30aafdcc66ff120c748c05fbf4144c6aca71493a2c97710728137c',
    imports:Object.freeze(['../check-assistant-later-h0-predecessor-source.mjs'])}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'5ebeea93ee7da95011ecc3c589e2a1a54a7ac821ad938997aea0b6444aa607bf',
    imports:Object.freeze([...NATIVE_CONTINUITY_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,
      './authenticated-frozen586-predecessor.mjs'])}),
});
// Additive fixed binding-prewrite variants. All older whole-source imports
// above remain exact; computed loads still use only the verified OLD586 host.
const ASSISTANT_BINDING_PREWRITE_REVIEWED=Object.freeze({
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'4807e6e08c487a0cf7ed398dbe29be588c4bcb58b211778932cc9f36a0681df6',
    imports:Object.freeze(['../check-assistant-later-h0-predecessor-source.mjs'])}),
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'860d62ff21d2854ca2856bcb6998ba48859c0237f94b315c7736a1265e1be8de',
    imports:Object.freeze(["./lib/assistant-later-h0-successor-source.mjs","./check-assistant-later-h0-predecessor-source.mjs","./lib/authenticated-frozen586-predecessor.mjs","./migrate-post-cutover-private-runtime.mjs","./integrated-cutover-readiness.mjs","./lib/dmi-forecast-file.mjs","./lib/dmi-part-continuity.mjs","./lib/protected-dmi-native-current-proofs.mjs","./lib/ravscore-recovery-source-priority.mjs","./lib/coherent-original-source-views.mjs","../js/core/ravscore-model-contract.js","./rollback-assets/ravscore-model-contract.js","./private-production-runtime-workflow.mjs","./lib/private-weather-component-pack.mjs"])}),
});
// Same fixed imports, independently bound whole diagnostic-only caller bytes.
const ASSISTANT_BINDING_DIAGNOSTIC_REVIEWED=Object.freeze({
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'fa16454cd00e516c4fe3c3b80f3445c73a32ce2162c0258b493e5a88e61c3d25',
    imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports}),
});
// Same fixed imports; the owned S destination now satisfies the genuine reader.
const ASSISTANT_BINDING_CHECKPOINT_TARGET_REVIEWED=Object.freeze({
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'e1ee53aa55de4a49e68f7aff0182d3d3ff301740b330424a35d8e77da613ad8e',
    imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports}),
});
// Faste586/587-læsere med adskilte private profiler; ingen ny importvej eller fallback.
const ASSISTANT_PUBLIC587_SOURCE_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'36719b093953b7381acd88e9a69b81bbf4532066a044af3ecfa5039a44625e0a',imports:Object.freeze([])}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'c9a22ee662475bc26ea820d46ba4cb17dbd8020195423b8212ea62c6ac16617e',
    imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports}),
});
// Faste aktive587→588-kaldere. Begge tidligere hele varianter bevares;
// samme finite importmængder, ingen scannerfallback eller model-selvreference.
const ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED=Object.freeze({
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'869d93119cb9ba2968b39259ecd3d6500797f17ec514c7df39b04dbf8328e0e8',
    imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'5fa3fe20041a82a7e287e21f4562f6bb82ffab253c69e0754208bb6e5c907b69',
    imports:ASSISTANT_LATER_H0_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports}),
});
// Additive kalender588→NEXT-varianter. Alle ældre hele varianter ovenfor bevares.
// Samme normale importkanter; kun den eksakte nye whole-source må bruge dem.
const CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'853f2fbdaca3471f11b01449a7040e66bc300acbc080df22d99315c5ea9fc9e1',imports:Object.freeze([])}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'7dc5e67341e25d13cd0669fb0c5fcda5af9b8abe45edd609255eafef41aab79d',
    imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'bc3da0ace8094f36bc221e5d023620e42f8153e9082780141e48372ca7c1f2b0',
    imports:ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports}),
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'8807414050da91659ceefc2d6957e78aecb791d09632ea806bc182668b02a55d',
    imports:ASSISTANT_BINDING_PREWRITE_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports}),
});
// Additive unissued590 successor. Exact whole bytes; no exclusion or scanner fallback.
const ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'00facf607532512e2c9e904a6147f8dc58af672cfcd8b6c08dfda8a46d83aa39',
    imports:CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'67dc78cb89e552696e8642b13d23f0df0257a89f8e06036537f2dcab353ad655',
    imports:CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c',
    imports:CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports}),
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'4f1b884c09647fb315cc7703ccefd5737ec7de3c2f38cac7e3d1b6019ab6066c',
    imports:CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports}),
});
// Additive exact genuine590 DATA-parent selection; all prior whole variants remain.
const ASSISTANT_GENUINE590_PARENT_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'0c0b447d20b222daf5d119c60e814605f69572bc5b7f748d8174dc728fd9e87b',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
});
// Additive genuine591 standalone-assistant bank. Existing variants stay whole.
const ASSISTANT_GENUINE591_PARENT_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'00dc5244da4e9fe82b761f7ec2c8c4b394e4b2f97db7c225d99de9c1a9bf83e8',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'ba09589cd0f3c48b734d60214ddf2017a7dc3ebba0e14c468da825721b575776',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'2aa92e6a2fb14f93e6072160499be1f39a502f4078bf61c98f649adfe538cf01',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports}),
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({
    sha256:'c8f473abb689ff12fdbe0086fff2d9d29bb5a2d8a14e5f77a18c28c279e2b2e0',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports}),
});
// Additive capacity-reader variants; actual changed bodies remain model inputs.
const CONDITIONS_READER_CAPACITY593_REVIEWED=Object.freeze({
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({sha256:'e802e02df74a53bb543d7d0e9107efd3850890a9f2c15e5d7c0c01b5229671cb',
    imports:Object.freeze([...ASSISTANT_GENUINE591_PARENT_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,'./bounded-json-writer.mjs'])}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({sha256:'3f47d6808f563b456d173e63be919e79ec57bff959e8e216aeeeb9096d7b368b',
    imports:Object.freeze([...ASSISTANT_GENUINE591_PARENT_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports,'./bounded-json-writer.mjs'])})
});
// Ny faktisk origin-kilde og dens nye fælles policy indgår hele i C/I.
const ORIGIN591_METADATA594_REVIEWED=Object.freeze({
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({sha256:'b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa',
    imports:Object.freeze([...CONDITIONS_READER_CAPACITY593_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,
      './assistant-public591-runtime-contracts.mjs'])}),
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({sha256:'d46dc4c2741dc62608e640ca60bd6b18027df6086a71f63c26e879c4495c94e2',
    imports:ASSISTANT_GENUINE591_PARENT_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports})
});
// Strictly later 597 normal handoff. The frozen 594 imports and previous
// bytes remain separately accepted. The issued SQL tuple is outside C/I.
const SCALAR597_LATER_H0_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({sha256:'d07922fbe0406f46ed41bf40633d2b6ed02275dd4683acee8f37e99dae48a01a',
    imports:ASSISTANT_GENUINE591_PARENT_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({sha256:'d7465a5d3d2abee68ffac57beb2a707db0dcb1c9f39811d6249181b73626b1ac',
    imports:CONDITIONS_READER_CAPACITY593_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({sha256:'e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42',
    imports:ORIGIN591_METADATA594_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports}),
  'scripts/assistant-later-h0-binding-prewrite.mjs':Object.freeze({sha256:'a87b9960dfcd35ccda2a8de8ce6fea35783fc3a25ef49dde806643d309d05384',
    imports:ORIGIN591_METADATA594_REVIEWED['scripts/assistant-later-h0-binding-prewrite.mjs'].imports})
});
// Præcise gennemgåede efter597-varianter. Hver ny hel kilde skal først
// genskabe den ægte597-førkilde via sine afgrænsede hunks og fuld inverse.
const ASSISTANT_AFTER597_REVIEW_DATA={
  "scripts/check-assistant-later-h0-predecessor-source.mjs": {
    "beforeSha256": "d07922fbe0406f46ed41bf40633d2b6ed02275dd4683acee8f37e99dae48a01a",
    "sha256": "f49dbb2be0840d5d57ac9ebe847abed57884e320becc2c1ac7332d03ff14721d",
    "contextLines": 3,
    "hunks": [
      {
        "before": "const execute=promisify(callbackExec);\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');\nfunction fixedSource(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n  const HEAD=profile.head,TREE=profile.tree;\nconst C='scripts/rollback-assets/ravscore-model-bundle.generated.js';\nconst I='js/core/ravscore-model-bundle.generated.js';\n",
        "after": "const execute=promisify(callbackExec);\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');\nfunction fixedSource(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE||profile===SOURCE597_CODE_PROFILE||profile===SOURCE597_ORIGINAL_DATA_PROFILE,'FROZEN_SOURCE_UNKNOWN_PROFILE');\n  const HEAD=profile.head,TREE=profile.tree;\nconst C='scripts/rollback-assets/ravscore-model-bundle.generated.js';\nconst I='js/core/ravscore-model-bundle.generated.js';\n"
      },
      {
        "before": "  .replace('a157 issued594','37a34703 issued594')\n  .replace('516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c',\n    'b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa');\nconst ASSERTION_SUFFIX=profile===SOURCE594_ORIGINAL_DATA_PROFILE?SOURCE_594_ASSERTION_SUFFIX:profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n  assertionNames.reduce((source,[before,after])=>{assert(source.includes(before));return source.replaceAll(before,after);},ORIGINAL_586_ASSERTION_SUFFIX);\nif(profile===FROZEN587)assert.equal([...assertionNames].reverse().reduce(\n  (source,[before,after])=>source.replaceAll(after,before),ASSERTION_SUFFIX),ORIGINAL_586_ASSERTION_SUFFIX,'Whole assertion-suffix inverse');\n",
        "after": "  .replace('a157 issued594','37a34703 issued594')\n  .replace('516d9f641bbf8de4fd8933e60a8a76621de4ec72c2d9492c1e43a94c74c9b67c',\n    'b791c803b5d41fd036e01d25bd85f7298e3652abd6d44e49b68b04a0f7cfd4fa');\n// New normal597 originals only. This is deliberately not a retag of the594\n// metadata assertion: a metadata-only working view is not a new597 B/S bank.\nconst SOURCE_597_ASSERTION_SUFFIX=String.raw`\n// DATA assertions over whole immutable803f normal597 origin implementation.\n// No original/ForPart/finalizer handle or metadata admission is minted here.\nasync function source597OriginData(descriptor,conditions,centralContract) {\n  const {validateProtectedPrivateRuntimeDescriptor} = await import('../protected-private-production-runtime.mjs');\n  need(same(validateProtectedPrivateRuntimeDescriptor(descriptor),descriptor),'SOURCE_597_DESCRIPTOR');\n  const binding=ravScoreModelBinding(),candidate=candidateBinding(),contracts=await privateRuntimeContractHashes();\n  need(same(descriptor.modelBinding,binding)&&same(descriptor.contractHashes,contracts),'SOURCE_597_FAMILY');\n  const parts=registryParts(centralContract),pairs=pairsFromConditions(conditions,parts);\n  const currentSource=Object.freeze({sourceHead:descriptor.sourceHead,\n    semanticContract:ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT,\n    integrated:binding.modelBundleSha256,candidate:candidate.modelBundleSha256,\n    continuation:contracts.continuationStateContractSha256,ownerPolicyGitBlob:SEED.ownerPolicyGitBlob});\n  need(conditions[ATTEST]?.kind===KIND&&conditions[ATTEST]?.transition==='NORMAL_STRICT_CONTINUATION','SOURCE_597_NORMAL_GENERATION_REQUIRED');\n  validateAttestation(conditions[ATTEST],{descriptor,conditions,central:centralContract,pairs,currentSource});\n  need(conditions[ATTEST].registrySha256===digest(centralContract),'METADATA_REGISTRY_CHANGED');\n  return {pairs,binding,candidate,contracts};\n}\nexport async function assertSource597OriginSnapshotData(options) {\n  need(arguments.length===1&&exact(options,['descriptor','conditions','centralContract','checkpoint']),'ARGUMENTS');\n  const {descriptor,conditions,centralContract,checkpoint}=options;\n  const {pairs,binding,candidate,contracts}=await source597OriginData(descriptor,conditions,centralContract);\n  need(same(checkpoint.modelBinding,binding)&&same(checkpoint.candidateGRollbackCompanion?.modelBinding,candidate)\n    &&checkpoint.continuationStateContractSha256===contracts.continuationStateContractSha256\n    &&checkpoint.datasetId===conditions.datasetId&&checkpoint.productionReferenceAt===conditions.productionReferenceAt\n    &&SHA.test(checkpoint.generationSha256),'SOURCE_597_CHECKPOINT');\n  need(same(Object.keys(checkpoint.states??{}).sort(),[...pairs.keys()].sort())\n    &&same(Object.keys(checkpoint.candidateGRollbackCompanion?.states??{}).sort(),[...pairs.keys()].sort()),'PARTS');\n  for(const[id,pair]of pairs)need(same(pair.integrated,checkpoint.states[id])\n    &&same(pair.candidate,checkpoint.candidateGRollbackCompanion.states[id]),'B_S_DIFFER');\n}\n`;\nconst ASSERTION_SUFFIX=profile===SOURCE597_ORIGINAL_DATA_PROFILE?SOURCE_597_ASSERTION_SUFFIX:profile===SOURCE594_ORIGINAL_DATA_PROFILE?SOURCE_594_ASSERTION_SUFFIX:profile===FROZEN591?ORIGINAL_591_ASSERTION_SUFFIX:profile===FROZEN590?ORIGINAL_590_ASSERTION_SUFFIX:profile===FROZEN588?ORIGINAL_588_ASSERTION_SUFFIX:profile===FROZEN586?ORIGINAL_586_ASSERTION_SUFFIX:\n  assertionNames.reduce((source,[before,after])=>{assert(source.includes(before));return source.replaceAll(before,after);},ORIGINAL_586_ASSERTION_SUFFIX);\nif(profile===FROZEN587)assert.equal([...assertionNames].reverse().reduce(\n  (source,[before,after])=>source.replaceAll(after,before),ASSERTION_SUFFIX),ORIGINAL_586_ASSERTION_SUFFIX,'Whole assertion-suffix inverse');\n"
      },
      {
        "before": "  await visit(root);assert.deepEqual([...seen].sort(),files);\n}\nasync function withSource(useVerifiedSource){\n  if(profile===SOURCE594_ORIGINAL_DATA_PROFILE)assertSource594OriginalDataSourceSelected();\n  if(profile===SOURCE594_CODE_PROFILE)assertSource594CodeSourceSelected();\n  if(profile===FROZEN591)assertFrozen591CodeSourceSelected(); // Fixed genuine591 before Git/temp/I/O.\n",
        "after": "  await visit(root);assert.deepEqual([...seen].sort(),files);\n}\nasync function withSource(useVerifiedSource){\n  if(profile===SOURCE597_ORIGINAL_DATA_PROFILE)assertSource597OriginalDataSourceSelected();\n  if(profile===SOURCE597_CODE_PROFILE)assertSource597CodeSourceSelected();\n  if(profile===SOURCE594_ORIGINAL_DATA_PROFILE)assertSource594OriginalDataSourceSelected();\n  if(profile===SOURCE594_CODE_PROFILE)assertSource594CodeSourceSelected();\n  if(profile===FROZEN591)assertFrozen591CodeSourceSelected(); // Fixed genuine591 before Git/temp/I/O.\n"
      },
      {
        "before": "    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});\n      await fs.writeFile(output,await materializedBytes(file,index,gitReference),{flag:'wx',mode:0o600});}\n    await exactTree(root,files,index,gitReference);\n    const builderArgs=(profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE)?['--installed593-origin591-successor','--check']:\n      profile===FROZEN591?['--public590-successor','--check']:\n      profile===FROZEN590?['--public588-successor','--check']:\n      profile===FROZEN588?['--public587-successor','--check']:['--check'];\n",
        "after": "    for(const file of files){const output=path.resolve(root,file);assert(inside(root,output));await fs.mkdir(path.dirname(output),{recursive:true});\n      await fs.writeFile(output,await materializedBytes(file,index,gitReference),{flag:'wx',mode:0o600});}\n    await exactTree(root,files,index,gitReference);\n    const builderArgs=(profile===SOURCE597_CODE_PROFILE||profile===SOURCE597_ORIGINAL_DATA_PROFILE)?['--scalar597-later-h0','--check']:\n      (profile===SOURCE594_CODE_PROFILE||profile===SOURCE594_ORIGINAL_DATA_PROFILE)?['--installed593-origin591-successor','--check']:\n      profile===FROZEN591?['--public590-successor','--check']:\n      profile===FROZEN590?['--public588-successor','--check']:\n      profile===FROZEN588?['--public587-successor','--check']:['--check'];\n"
      },
      {
        "before": "  purpose:'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',\n  assertion:'scripts/lib/established-native-current-origin-594-assertion.mjs',temporaryPrefix:'rr-source-a594-data-'});\n\n// Hver fast profil ejer sin cache; samme relative sti kan aldrig genbruge den anden familie.\nconst source586=fixedSource(FROZEN586),source587=fixedSource(FROZEN587),source588=fixedSource(FROZEN588);\nexport async function withAuthenticated586PredecessorSource(useVerifiedSource){\n",
        "after": "  purpose:'ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',\n  assertion:'scripts/lib/established-native-current-origin-594-assertion.mjs',temporaryPrefix:'rr-source-a594-data-'});\n\n// Fixed source selection for a future assistant successor.803f is source data,\n// never proof of installed597, a new normal597 B/S generation, or delivery.\nexport const SOURCE597_CODE_SOURCE_PROVENANCE=Object.freeze({\n  selected:true,purpose:'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION',\n  head:'803f2c7c61237cef5c5f6b39ce0eaac5e090fb84',tree:'a5df6f32aac090c948be97a4a5532bb07482a31d',\n  candidateFiles:101,integratedFiles:100,\n  originSha256:'e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42',\n  partPipelineSha256:'8e979128a682a7324d7defcc3d2d2dfa5edc85ebc22d4ae714810aa085490758',\n  fullRuntimeContractSha256:'ede0b53b8ed0f3fa5d0e505ea7c07d98969dc7a38fe94ae034a85f9c5d5af7ff',\n  publicProjectionContractSha256:'24e95d442450769ff233e42aa4b100842c353c8d28735defbbfef5d5457c99ec',\n});\nconst SOURCE597_CODE_PROFILE=Object.freeze({...SOURCE597_CODE_SOURCE_PROVENANCE,\n  builder:'scripts/build-assistant-later-h0-successor.mjs',\n  builderChecked:'Exact scalar597/original594 later-H0 source checked; no installation or state admission.',\n  assertion:null,temporaryPrefix:'rr-source-a597-code-',\n  candidate:'23d97454ec9578e441a0482cf028ae347b2da5ee2ed97560246b486ee46364c5',\n  integrated:'68f118fbb07b252fab89f12ed0bf82816cd74b04afc306b00c2b3a8ccfe25c81',\n  additionalMigrations:Object.freeze([...SOURCE594_CODE_PROFILE.additionalMigrations,\n    Object.freeze({path:'supabase/migrations/20261104004400_scalar597_later_h0_original594_bound_successor.sql',\n      sha256:'bc8735d450ed547d2c0116704a319ab8854a47e34bac86974541050260e2174e'})]),\n  runtimeContracts:Object.freeze({continuationStateContractSha256:'67665c10d2bd134fb598af1c36a41c2d53bb2820344c577ada30bcfbd6afe8e1',\n    fullRuntimeContractSha256:SOURCE597_CODE_SOURCE_PROVENANCE.fullRuntimeContractSha256,\n    publicProjectionContractSha256:SOURCE597_CODE_SOURCE_PROVENANCE.publicProjectionContractSha256}),\n});\nconst SOURCE597_ORIGINAL_DATA_PROFILE=Object.freeze({...SOURCE597_CODE_PROFILE,\n  purpose:'NEW_NORMAL_597_ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION',\n  assertion:'scripts/lib/established-native-current-origin-597-assertion.mjs',temporaryPrefix:'rr-source-a597-data-'});\n\n// Hver fast profil ejer sin cache; samme relative sti kan aldrig genbruge den anden familie.\nconst source586=fixedSource(FROZEN586),source587=fixedSource(FROZEN587),source588=fixedSource(FROZEN588);\nexport async function withAuthenticated586PredecessorSource(useVerifiedSource){\n"
      },
      {
        "before": "export async function withSource594OriginalDataSource(callback){\n  assertSource594OriginalDataSourceSelected();return source594OriginalData(...arguments);\n}\n",
        "after": "export async function withSource594OriginalDataSource(callback){\n  assertSource594OriginalDataSourceSelected();return source594OriginalData(...arguments);\n}\n\nconst source597Code=fixedSource(SOURCE597_CODE_PROFILE);\nconst source597OriginalData=fixedSource(SOURCE597_ORIGINAL_DATA_PROFILE);\nexport function assertSource597CodeSourceSelected(){\n  assert.equal(arguments.length,0,'No caller-selected597 CODE source');\n  const source=SOURCE597_CODE_SOURCE_PROVENANCE;\n  assert.equal(source.selected,true);assert.equal(source.purpose,'CODE_ONLY_NO_ORIGINAL_OR_RUNTIME_ADMISSION');\n  assert.deepEqual(Object.keys(source).sort(),['candidateFiles','fullRuntimeContractSha256','head','integratedFiles',\n    'originSha256','partPipelineSha256','publicProjectionContractSha256','purpose','selected','tree'].sort());\n  for(const key of ['head','tree'])assert.match(source[key],/^[a-f0-9]{40}$/);\n  for(const key of ['candidateFiles','integratedFiles'])assert(Number.isSafeInteger(source[key])&&source[key]>0);\n  for(const key of ['originSha256','partPipelineSha256','fullRuntimeContractSha256','publicProjectionContractSha256'])\n    assert.match(source[key],/^[a-f0-9]{64}$/);\n  return source;\n}\nexport async function withSource597CodeParent(callback){\n  assertSource597CodeSourceSelected();return source597Code(...arguments);\n}\nexport function assertSource597OriginalDataSourceSelected(){\n  assert.equal(arguments.length,0);assertSource597CodeSourceSelected();\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.purpose,'NEW_NORMAL_597_ORIGINAL_DATA_ASSERTIONS_ONLY_NO_ADMISSION');\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.head,SOURCE597_CODE_SOURCE_PROVENANCE.head);\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.tree,SOURCE597_CODE_SOURCE_PROVENANCE.tree);\n  assert.equal(SOURCE597_ORIGINAL_DATA_PROFILE.assertion,'scripts/lib/established-native-current-origin-597-assertion.mjs');\n}\nexport async function withSource597OriginalDataSource(callback){\n  assertSource597OriginalDataSourceSelected();return source597OriginalData(...arguments);\n}\n"
      }
    ]
  },
  "scripts/lib/authenticated-frozen586-predecessor.mjs": {
    "beforeSha256": "d7465a5d3d2abee68ffac57beb2a707db0dcb1c9f39811d6249181b73626b1ac",
    "sha256": "4a4a3c8ed2f3c818ada8401411c744325fdad502b44c9a1f2e4b54067e88148e",
    "contextLines": 3,
    "hunks": [
      {
        "before": "  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE,\n  withSource594OriginalDataSource,assertSource594OriginalDataSourceSelected,SOURCE594_CODE_SOURCE_PROVENANCE}\n  from '../check-assistant-later-h0-predecessor-source.mjs';\n\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');\n",
        "after": "  withAuthenticated588PredecessorSource,assertFrozen588CodeSourceSelected,FROZEN588_CODE_SOURCE_PROVENANCE,\n  withAuthenticated590PredecessorSource,assertFrozen590CodeSourceSelected,FROZEN590_CODE_SOURCE_PROVENANCE,\n  withAuthenticated591PredecessorSource,assertFrozen591CodeSourceSelected,FROZEN591_CODE_SOURCE_PROVENANCE,\n  withSource594OriginalDataSource,assertSource594OriginalDataSourceSelected,SOURCE594_CODE_SOURCE_PROVENANCE,\n  withSource597OriginalDataSource,assertSource597OriginalDataSourceSelected,SOURCE597_CODE_SOURCE_PROVENANCE}\n  from '../check-assistant-later-h0-predecessor-source.mjs';\n\nconst ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');\n"
      },
      {
        "before": "// Ukendt fysisk FD-lukning blokerer samme sti på tværs af begge familier.\n// Opaque snapshots og friskhedsfunktioner tilhører derimod kun én fast profil.\nfunction fixedSnapshot(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE_FROZEN594,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n  const contexts=new WeakMap(),refreshers=new WeakMap();\n  const SOURCE=profile.sourceHead;\nconst SHA=/^[a-f0-9]{64}$/, HEAD=/^[a-f0-9]{40}$/, MB=1024*1024;\n",
        "after": "// Ukendt fysisk FD-lukning blokerer samme sti på tværs af begge familier.\n// Opaque snapshots og friskhedsfunktioner tilhører derimod kun én fast profil.\nfunction fixedSnapshot(profile){\n  assert(profile===FROZEN586||profile===FROZEN587||profile===FROZEN588||profile===FROZEN590||profile===FROZEN591||profile===SOURCE_FROZEN594||profile===SOURCE_FROZEN597,'FROZEN_PREDECESSOR_UNKNOWN_PROFILE');\n  const contexts=new WeakMap(),refreshers=new WeakMap();\n  const SOURCE=profile.sourceHead;\nconst SHA=/^[a-f0-9]{64}$/, HEAD=/^[a-f0-9]{40}$/, MB=1024*1024;\n"
      },
      {
        "before": "}\nasync function readAuthenticatedPredecessor(){\n  need(arguments.length===0,'ARGUMENTS');\n  const conditionsMaximum=profile===FROZEN591||profile===SOURCE_FROZEN594\n    ?PRIVATE_CONDITIONS_MAX_BYTES:256*MB;\n  // These normal workflow paths select already restored immutable B; they are\n  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.\n",
        "after": "}\nasync function readAuthenticatedPredecessor(){\n  need(arguments.length===0,'ARGUMENTS');\n  const conditionsMaximum=profile===FROZEN591||profile===SOURCE_FROZEN594||profile===SOURCE_FROZEN597\n    ?PRIVATE_CONDITIONS_MAX_BYTES:256*MB;\n  // These normal workflow paths select already restored immutable B; they are\n  // not authority. No consumed 0200/140000 upgrade flag is reused as permission.\n"
      },
      {
        "before": "}\nexport function assertAuthenticatedSource594Snapshot(handle){return sourceSnapshot594.snapshot(...arguments);}\nexport async function assertAuthenticatedSource594SnapshotFresh(handle){return sourceSnapshot594.fresh(...arguments);}\n",
        "after": "}\nexport function assertAuthenticatedSource594Snapshot(handle){return sourceSnapshot594.snapshot(...arguments);}\nexport async function assertAuthenticatedSource594SnapshotFresh(handle){return sourceSnapshot594.fresh(...arguments);}\n\n// Independent capability family over a genuinely new normal597 B/S bank.\n// CODE selection never establishes installation, CURRENT/S or original data.\n// The fixed597 DATA host rejects metadata-only views and historical594 banks.\nconst SOURCE_FROZEN597=Object.freeze({\n  sourceHead:SOURCE597_CODE_SOURCE_PROVENANCE.head,\n  requiredSha:Object.freeze([SOURCE597_CODE_SOURCE_PROVENANCE.originSha256,\n    SOURCE597_CODE_SOURCE_PROVENANCE.partPipelineSha256]),\n  withSource:withSource597OriginalDataSource,\n  assertionPath:'scripts/lib/established-native-current-origin-597-assertion.mjs',\n  assertionExport:'assertSource597OriginSnapshotData',\n  temporaryPrefix:'rr-source597-snapshot-',errorPrefix:'SOURCE597_PREDECESSOR_'});\nconst sourceSnapshot597=fixedSnapshot(SOURCE_FROZEN597);\nexport async function readAuthenticatedSource597Predecessor(){\n  assertSource597OriginalDataSourceSelected();return sourceSnapshot597.read(...arguments);\n}\nexport function assertAuthenticatedSource597Snapshot(handle){return sourceSnapshot597.snapshot(...arguments);}\nexport async function assertAuthenticatedSource597SnapshotFresh(handle){return sourceSnapshot597.fresh(...arguments);}\n"
      }
    ]
  },
  "scripts/lib/established-native-current-origin.mjs": {
    "beforeSha256": "e4ec3e1656669229b99a2dff0170db114ae31129c5c0584a3806c74ca90b4f42",
    "sha256": "fe1dad972fc236c42ebb3c9457d9c192f81ede06dd6e85a2978bdf6aa8407916",
    "contextLines": 7,
    "hunks": [
      {
        "before": "import { withAuthenticated585PredecessorSource } from '../check-native-original-continuity-predecessor-source.mjs';\n\nimport {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,\n  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,\n  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot,\n  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot,\n  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh}\n  from './authenticated-frozen586-predecessor.mjs';\n\nexport const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v1';\nconst ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');\nconst ATTEST = 'privateEstablishedNativeCurrentOrigin';\nconst SCALAR597_ORIGINAL594=Object.freeze({\n  I:'08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c',\n  C:'2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b',\n  T:'a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa',\n});\nconst KIND = 'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN';\nconst SHA = /^[a-f0-9]{64}$/, HEAD = /^[a-f0-9]{40}$/;\nconst MB = 1024 * 1024, MAX_ATTEST = 16 * 1024, MAX_CONDITIONS = 256 * MB;\nconst contexts = new WeakMap(), failedCloses = new Map();\nconst exec = promisify(callbackExec);\nconst canonical = value => JSON.stringify(value, (_key, nested) => nested && typeof nested === 'object'\n",
        "after": "import { withAuthenticated585PredecessorSource } from '../check-native-original-continuity-predecessor-source.mjs';\n\nimport {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot,\n  readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot,\n  readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot,\n  readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot,\n  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh,\n  readAuthenticatedSource597Predecessor,assertAuthenticatedSource597Snapshot,assertAuthenticatedSource597SnapshotFresh}\n  from './authenticated-frozen586-predecessor.mjs';\n\nexport const ESTABLISHED_NATIVE_CURRENT_SEMANTIC_CONTRACT = 'established-native-current-continuation-v1';\nconst ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');\nconst ATTEST = 'privateEstablishedNativeCurrentOrigin';\nconst SCALAR597_ORIGINAL594=Object.freeze({\n  I:'08750e3667e5a221374762fccadccf08abf5e9f1ae8814ccc97bfc11880bf36c',\n  C:'2d5cde5418270a02396e24a249f0b6bb09527366c1c110d8742a44cfe2ab459b',\n  T:'a6c0408f76b5de70a90959e254df78317f8282cb93c0edc85a71d36b9ef8dafa',\n});\n// Kun den allerede ægte udstedte597-forælder. Ny C/I/T kommer senere fra den\n// normale genererede model; controller-/SQL-profiler må ikke importeres i C/I.\nconst ASSISTANT_AFTER597_ORIGINAL597=Object.freeze({\n  I:'68f118fbb07b252fab89f12ed0bf82816cd74b04afc306b00c2b3a8ccfe25c81',\n  C:'23d97454ec9578e441a0482cf028ae347b2da5ee2ed97560246b486ee46364c5',\n  T:'67665c10d2bd134fb598af1c36a41c2d53bb2820344c577ada30bcfbd6afe8e1',\n});\nconst KIND = 'PRIVATE_ESTABLISHED_NATIVE_CURRENT_ORIGIN';\nconst SHA = /^[a-f0-9]{64}$/, HEAD = /^[a-f0-9]{40}$/;\nconst MB = 1024 * 1024, MAX_ATTEST = 16 * 1024, MAX_CONDITIONS = 256 * MB;\nconst contexts = new WeakMap(), failedCloses = new Map();\nconst exec = promisify(callbackExec);\nconst canonical = value => JSON.stringify(value, (_key, nested) => nested && typeof nested === 'object'\n"
      },
      {
        "before": "  const request = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' }).documentRequest;\n  const checkpointRequest = createProtectedRavScoreCheckpointRequester();\n  const before = await readPointer(request), descriptor = before.pointer.current;\n  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');\n  const conditionsMaximum = !seed && (descriptor.modelBinding.modelBundleSha256 === currentSource.integrated\n    || isScalar597OriginParentBinding(descriptor.modelBinding)\n    || descriptor.modelBinding.modelBundleSha256 === 'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n    ? PRIVATE_CONDITIONS_MAX_BYTES : MAX_CONDITIONS;\n  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), conditionsMaximum);\n  // Unknown/legacy input retains its OLD normal transitions; a claimed clean\n  // origin cannot silently downgrade to that route after a failed check.\n  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {\n    if(descriptor.modelBinding.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805')\n",
        "after": "  const request = createProtectedPrivateRuntimeClients({ storageBackend: 'supabase' }).documentRequest;\n  const checkpointRequest = createProtectedRavScoreCheckpointRequester();\n  const before = await readPointer(request), descriptor = before.pointer.current;\n  const seed = descriptor.bundleContentSha256 === SEED.B;\n  if (seedOnly) need(seed, 'SEED_CONTENT_CHANGED');\n  const conditionsMaximum = !seed && (descriptor.modelBinding.modelBundleSha256 === currentSource.integrated\n    || isScalar597OriginParentBinding(descriptor.modelBinding)\n    || isAssistantAfter597OriginParentBinding(descriptor.modelBinding)\n    || descriptor.modelBinding.modelBundleSha256 === 'ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n    ? PRIVATE_CONDITIONS_MAX_BYTES : MAX_CONDITIONS;\n  let conditions = seedOnly ? null : await json(path.join(ROOT, 'data/live/conditions.json'), conditionsMaximum);\n  // Unknown/legacy input retains its OLD normal transitions; a claimed clean\n  // origin cannot silently downgrade to that route after a failed check.\n  if (!seed && descriptor.modelBinding.modelBundleSha256 !== currentSource.integrated) {\n    if(descriptor.modelBinding.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805')\n"
      },
      {
        "before": "      return readFrozen588LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819')\n      return readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n      return readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(isScalar597OriginParentBinding(descriptor.modelBinding))\n      return readScalarFrozen594LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    need(conditions[ATTEST] === undefined, 'UNSUPPORTED_ATTESTED_FAMILY');\n    need(!(descriptor.datasetId === SEED.datasetId && descriptor.productionReferenceAt === SEED.referenceAt\n      && descriptor.modelBinding.modelBundleSha256 === SEED.I), 'SEED_CONTENT_CHANGED');\n    return null;\n  }\n  if (seed) need(descriptor.sourceHead === SEED.producer && descriptor.datasetId === SEED.datasetId\n    && descriptor.productionReferenceAt === SEED.referenceAt, 'SEED_IDENTITY');\n",
        "after": "      return readFrozen588LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='4c94c24e7d14d66c20cc3c2c3d0389cadb0c3e9e76fcfe692943c6087df56819')\n      return readFrozen590LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(descriptor.modelBinding.modelBundleSha256==='ebd5ac3dac09b7afb51e46d18920f6932b478b7ef15bdd31190c128273cb6a54')\n      return readFrozen591LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(isScalar597OriginParentBinding(descriptor.modelBinding))\n      return readScalarFrozen594LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    if(isAssistantAfter597OriginParentBinding(descriptor.modelBinding))\n      return readAssistantFrozen597LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource});\n    need(conditions[ATTEST] === undefined, 'UNSUPPORTED_ATTESTED_FAMILY');\n    need(!(descriptor.datasetId === SEED.datasetId && descriptor.productionReferenceAt === SEED.referenceAt\n      && descriptor.modelBinding.modelBundleSha256 === SEED.I), 'SEED_CONTENT_CHANGED');\n    return null;\n  }\n  if (seed) need(descriptor.sourceHead === SEED.producer && descriptor.datasetId === SEED.datasetId\n    && descriptor.productionReferenceAt === SEED.referenceAt, 'SEED_IDENTITY');\n"
      },
      {
        "before": "  await assertAuthenticatedSource594SnapshotFresh(original594);\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n",
        "after": "  await assertAuthenticatedSource594SnapshotFresh(original594);\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n\n// Rene597-værdikontroller; de skaber ingen kapabilitet eller installationsbevis.\nexport function isAssistantAfter597OriginParentBinding(binding){\n  return binding?.modelBundleSha256===ASSISTANT_AFTER597_ORIGINAL597.I;\n}\nexport function assertAssistantAfter597OriginParentMetadata(descriptor,checkpoint){\n  need(isAssistantAfter597OriginParentBinding(descriptor?.modelBinding)\n    &&descriptor.contractHashes?.continuationStateContractSha256===ASSISTANT_AFTER597_ORIGINAL597.T\n    &&checkpoint?.candidateGRollbackCompanion?.modelBinding?.modelBundleSha256===ASSISTANT_AFTER597_ORIGINAL597.C,\n    '597_FIXED_ORIGINAL_BINDING');return true;\n}\nexport function assertAssistantAfter597OriginTarget(descriptor,target){\n  need(arguments.length===2&&isAssistantAfter597OriginParentBinding(descriptor?.modelBinding)\n    &&descriptor.contractHashes?.continuationStateContractSha256===ASSISTANT_AFTER597_ORIGINAL597.T,'597_FIXED_ORIGINAL_BINDING');\n  need(hour(target)&&hour(descriptor.productionReferenceAt)\n    &&Date.parse(target)>Date.parse(descriptor.productionReferenceAt),'597_LATER_TARGET');return true;\n}\nasync function readAssistantFrozen597LaterOrigin({descriptor,before,request,conditions,central,parts,currentSource}){\n  // En uændret597-model kan ikke aktivere overgangen. Den normale controller\n  // kræver desuden udstedt output før arbejdsfiler og autentificerede læsere.\n  need(isAssistantAfter597OriginParentBinding(descriptor.modelBinding)\n    &&currentSource.integrated!==ASSISTANT_AFTER597_ORIGINAL597.I,'597_FAMILY');\n  assertAssistantAfter597OriginTarget(descriptor,process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);\n  const original597=await readAuthenticatedSource597Predecessor();\n  const snapshot=assertAuthenticatedSource597Snapshot(original597);\n  need(same(snapshot.descriptor,descriptor)&&same(snapshot.centralContract,central),'597_ORIGINAL_CHANGED');\n  const contracts=await privateRuntimeContractHashes(),I=ravScoreModelBinding(),C=candidateBinding();\n  assertAssistantAfter597OriginParentMetadata(descriptor,snapshot.checkpoint);\n  need(I.modelBundleSha256===currentSource.integrated&&C.modelBundleSha256===currentSource.candidate\n    &&contracts.continuationStateContractSha256===currentSource.continuation\n    &&C.modelBundleSha256!==snapshot.checkpoint.candidateGRollbackCompanion.modelBinding.modelBundleSha256\n    &&contracts.continuationStateContractSha256!==descriptor.contractHashes.continuationStateContractSha256,\n    '597_ISSUED_CURRENT_SOURCE');\n  need(same({...snapshot.checkpoint.modelBinding,modelBundleSha256:I.modelBundleSha256},I)\n    &&same({...snapshot.checkpoint.candidateGRollbackCompanion.modelBinding,modelBundleSha256:C.modelBundleSha256},C)\n    &&same({...descriptor.contractHashes,continuationStateContractSha256:contracts.continuationStateContractSha256},contracts),\n    '597_METADATA_ONLY');\n  need(conditions.datasetId===descriptor.datasetId&&conditions.productionReferenceAt===descriptor.productionReferenceAt\n    &&same(conditions[ATTEST],snapshot.attestation),'597_WHOLE_PARENT_CHANGED');\n  const pairs=pairsFromConditions(conditions,parts);\n  need(same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.states).sort())\n    &&same([...pairs.keys()].sort(),Object.keys(snapshot.checkpoint.candidateGRollbackCompanion.states).sort()),'597_PARTS');\n  for(const[id,pair]of pairs){\n    const originalI=snapshot.checkpoint.states[id],originalG=snapshot.checkpoint.candidateGRollbackCompanion.states[id];\n    const inverseI=structuredClone(pair.integrated),inverseG=structuredClone(pair.candidate);\n    need(inverseI.modelBundleSha256===I.modelBundleSha256,'597_CURRENT_PAIR_BINDING');\n    inverseI.modelBundleSha256=originalI.modelBundleSha256;\n    if(Object.hasOwn(inverseG,'modelBundleSha256')){\n      need(inverseG.modelBundleSha256===C.modelBundleSha256,'597_CURRENT_CANDIDATE_BINDING');\n      inverseG.modelBundleSha256=originalG.modelBundleSha256;\n    }\n    need(same(inverseI,originalI)&&same(inverseG,originalG),'597_WHOLE_PAIR_INVERSE');\n  }\n  need(same(await readPointer(request),before),'SOURCE_CHANGED');\n  need(same(await json(path.join(ROOT,'data/live/coastal-parts-v2.json'),16*MB),central),'REGISTRY_CHANGED');\n  await assertAuthenticatedSource597SnapshotFresh(original597);\n  const handle=Object.freeze({});\n  contexts.set(handle,{seed:false,descriptor:structuredClone(descriptor),generationSha256:snapshot.checkpoint.generationSha256,\n    parentAttestationSha256:snapshot.attestation.attestationSha256,central,parts,pairs,currentSource,\n    consumedParts:new Set(),finalized:false});\n  return handle;\n}\n"
      }
    ]
  },
  "scripts/assistant-later-h0-binding-prewrite.mjs": {
    "beforeSha256": "a87b9960dfcd35ccda2a8de8ce6fea35783fc3a25ef49dde806643d309d05384",
    "sha256": "80b6e2752da4409603a44e59a2112ddd5b18271fc7572f50dfa02eb3ba7e473a",
    "contextLines": 3,
    "hunks": [
      {
        "before": "import {fileURLToPath,pathToFileURL} from 'node:url';\nimport {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual as equal} from 'node:util';\nimport {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource,withSource594OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';\nimport {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh,readAuthenticatedFrozen591Predecessor,\n  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh,\n  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\nimport {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';\nimport {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan,assertScalar597LaterH0MigrationPlan} from './integrated-cutover-readiness.mjs';\nimport {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';\nimport {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';\nimport {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';\n",
        "after": "import {fileURLToPath,pathToFileURL} from 'node:url';\nimport {execFile as callbackExec} from 'node:child_process';\nimport {promisify,isDeepStrictEqual as equal} from 'node:util';\nimport {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE,requireAssistantAfter597Output} from './lib/assistant-later-h0-successor-source.mjs';\nimport {withAuthenticated587PredecessorSource,withAuthenticated588PredecessorSource,withAuthenticated590PredecessorSource,withAuthenticated591PredecessorSource,withSource594OriginalDataSource,withSource597OriginalDataSource} from './check-assistant-later-h0-predecessor-source.mjs';\nimport {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot,\n  assertAuthenticatedFrozen587SnapshotFresh,readAuthenticatedFrozen588Predecessor,\n  assertAuthenticatedFrozen588Snapshot,assertAuthenticatedFrozen588SnapshotFresh,readAuthenticatedFrozen590Predecessor,\n  assertAuthenticatedFrozen590Snapshot,assertAuthenticatedFrozen590SnapshotFresh,readAuthenticatedFrozen591Predecessor,\n  assertAuthenticatedFrozen591Snapshot,assertAuthenticatedFrozen591SnapshotFresh,\n  readAuthenticatedSource594Predecessor,assertAuthenticatedSource594Snapshot,assertAuthenticatedSource594SnapshotFresh,\n  readAuthenticatedSource597Predecessor,assertAuthenticatedSource597Snapshot,assertAuthenticatedSource597SnapshotFresh} from './lib/authenticated-frozen586-predecessor.mjs';\nimport {assertRestoredOriginalInventory} from './migrate-post-cutover-private-runtime.mjs';\nimport {assertAssistantPublic587SuccessorMigrationPlan,assertAssistantPublic588SuccessorMigrationPlan,assertAssistantPublic590SuccessorMigrationPlan,assertAssistantPublic591SuccessorMigrationPlan,assertInstalled593Original591MigrationPlan,assertScalar597LaterH0MigrationPlan,assertAssistantAfter597MigrationPlan} from './integrated-cutover-readiness.mjs';\nimport {inspectDmiForecastFile,readDmiForecastRecord} from './lib/dmi-forecast-file.mjs';\nimport {unpackDmiPartContinuity,assertDmiPartContinuityTotalSize} from './lib/dmi-part-continuity.mjs';\nimport {createProtectedDmiNativeCurrentInspector} from './lib/protected-dmi-native-current-proofs.mjs';\n"
      },
      {
        "before": "import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';\nimport {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';\n// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor','scalar597-later-h0-original594-successor'].includes(ACTIVE.sourcePhase));\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='scalar597-later-h0-original594-successor'?Object.freeze({\n  withSource:withSource594OriginalDataSource,read:readAuthenticatedSource594Predecessor,\n  snapshot:assertAuthenticatedSource594Snapshot,fresh:assertAuthenticatedSource594SnapshotFresh,\n  plan:assertScalar597LaterH0MigrationPlan\n",
        "after": "import {privateRuntimeContractHashes} from './private-production-runtime-workflow.mjs';\nimport {ownFileDescriptorIdentity,ownedFileDescriptorClosed} from './lib/private-weather-component-pack.mjs';\n// Ingen caller-/miljøvalgt familie. Begge profiler beholder deres egne opaque handles.\nassert(['assistant-public587-successor','assistant-public588-successor','assistant-public590-successor','assistant-public591-successor','assistant-installed593-origin591-successor','scalar597-later-h0-original594-successor','assistant-mixed-after597-successor'].includes(ACTIVE.sourcePhase));\nexport function assistantAfter597PrewritePredecessor(){\n  assert.equal(arguments.length,0,'Ingen caller-valgt originalfamilie');\n  requireAssistantAfter597Output(); // Uudstedt gren stopper før filer, B/S eller læseklienter.\n  return Object.freeze({withSource:withSource597OriginalDataSource,read:readAuthenticatedSource597Predecessor,\n    snapshot:assertAuthenticatedSource597Snapshot,fresh:assertAuthenticatedSource597SnapshotFresh,\n    plan:assertAssistantAfter597MigrationPlan});\n}\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-mixed-after597-successor'?assistantAfter597PrewritePredecessor():\n  ACTIVE.sourcePhase==='scalar597-later-h0-original594-successor'?Object.freeze({\n  withSource:withSource594OriginalDataSource,read:readAuthenticatedSource594Predecessor,\n  snapshot:assertAuthenticatedSource594Snapshot,fresh:assertAuthenticatedSource594SnapshotFresh,\n  plan:assertScalar597LaterH0MigrationPlan\n"
      }
    ]
  }
};
const ASSISTANT_AFTER597_REVIEWED=Object.freeze(Object.fromEntries(
  Object.entries(ASSISTANT_AFTER597_REVIEW_DATA).map(([file,row])=>{
    if(row.beforeSha256!==SCALAR597_LATER_H0_REVIEWED[file]?.sha256)
      throw new Error('Ukendt efter597-førkilde: '+file);
    return [file,Object.freeze({...row,hunks:Object.freeze(row.hunks.map(Object.freeze)),
      imports:SCALAR597_LATER_H0_REVIEWED[file].imports})];
  })));
function assertAssistantAfter597ImportInverse(source,file,reviewed){
  let original=source;
  for(const row of [...reviewed.hunks].reverse()){
    if(original.split(row.after).length!==2)throw new Error('Efter597-hunk mangler eller er dubleret: '+file);
    original=original.replace(row.after,()=>row.before);
  }
  if(crypto.createHash('sha256').update(original).digest('hex')!==reviewed.beforeSha256)
    throw new Error('Hele efter597-førkilden kan ikke genskabes: '+file);
  let roundtrip=original;
  for(const row of reviewed.hunks){
    if(roundtrip.split(row.before).length!==2)throw new Error('Efter597-førhunk er ændret eller dubleret: '+file);
    roundtrip=roundtrip.replace(row.before,()=>row.after);
  }
  if(roundtrip!==source)throw new Error('Hele efter597-rundturen fejlede: '+file);
}
export function modelSourceRelativeModuleSpecifiers(source, file) {
  if (!Object.hasOwn(REVIEWED, file) && !Object.hasOwn(NATIVE_CONTINUITY_REVIEWED, file)
    && !Object.hasOwn(ASSISTANT_LATER_H0_REVIEWED,file) && !Object.hasOwn(ASSISTANT_BINDING_PREWRITE_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_BINDING_DIAGNOSTIC_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_BINDING_CHECKPOINT_TARGET_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_PUBLIC587_SOURCE_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED,file)
    && !Object.hasOwn(CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_GENUINE590_PARENT_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_GENUINE591_PARENT_REVIEWED,file)
    && !Object.hasOwn(CONDITIONS_READER_CAPACITY593_REVIEWED,file)
    && !Object.hasOwn(ORIGIN591_METADATA594_REVIEWED,file)
    && !Object.hasOwn(SCALAR597_LATER_H0_REVIEWED,file))
    return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const reviewed = [REVIEWED[file], NATIVE_CONTINUITY_REVIEWED[file],ASSISTANT_LATER_H0_REVIEWED[file],ASSISTANT_BINDING_PREWRITE_REVIEWED[file],ASSISTANT_BINDING_DIAGNOSTIC_REVIEWED[file],ASSISTANT_BINDING_CHECKPOINT_TARGET_REVIEWED[file],ASSISTANT_PUBLIC587_SOURCE_REVIEWED[file],ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED[file],CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED[file],ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED[file],ASSISTANT_GENUINE590_PARENT_REVIEWED[file],ASSISTANT_GENUINE591_PARENT_REVIEWED[file],CONDITIONS_READER_CAPACITY593_REVIEWED[file],ORIGIN591_METADATA594_REVIEWED[file],SCALAR597_LATER_H0_REVIEWED[file],ASSISTANT_AFTER597_REVIEWED[file]].filter(Boolean)
    .find(variant => variant.sha256 === hash);
  if (!reviewed)
    throw new Error('Whole reviewed model import source changed: ' + file);
  if(reviewed===ASSISTANT_AFTER597_REVIEWED[file])assertAssistantAfter597ImportInverse(normalized,file,reviewed);
  return reviewed.imports;
}
