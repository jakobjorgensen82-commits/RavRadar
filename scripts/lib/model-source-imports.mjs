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
    && !Object.hasOwn(ORIGIN591_METADATA594_REVIEWED,file))
    return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const reviewed = [REVIEWED[file], NATIVE_CONTINUITY_REVIEWED[file],ASSISTANT_LATER_H0_REVIEWED[file],ASSISTANT_BINDING_PREWRITE_REVIEWED[file],ASSISTANT_BINDING_DIAGNOSTIC_REVIEWED[file],ASSISTANT_BINDING_CHECKPOINT_TARGET_REVIEWED[file],ASSISTANT_PUBLIC587_SOURCE_REVIEWED[file],ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED[file],CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED[file],ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED[file],ASSISTANT_GENUINE590_PARENT_REVIEWED[file],ASSISTANT_GENUINE591_PARENT_REVIEWED[file],CONDITIONS_READER_CAPACITY593_REVIEWED[file],ORIGIN591_METADATA594_REVIEWED[file]].filter(Boolean)
    .find(variant => variant.sha256 === hash);
  if (!reviewed)
    throw new Error('Whole reviewed model import source changed: ' + file);
  return reviewed.imports;
}
