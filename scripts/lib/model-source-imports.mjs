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
// Additive actual588 -> SOURCE589 whole-source variants. No old inventory is replaced.
// New computed SOURCE loads use the fixed588 code factory; old586/587 paths stay intact.
// Its code selection is fail-closed; CURRENT and STAGED snapshots stay opaque and separate.
const SOURCE_ACTUAL588_RUNTIME_REVIEWED=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs":Object.freeze({
    sha256:"5cc13ecd5d6f3f1291349e40f0d2e1b90fde036cb3b641ad339dc92ddc718718",
    imports:Object.freeze([])}),
  "scripts/lib/authenticated-frozen586-predecessor.mjs":Object.freeze({
    sha256:"563e2202c90ac36fb52b4c0b8bf0dab7f7f766a529ed667053c2393076e9fce8",
    imports:Object.freeze(["../check-assistant-later-h0-predecessor-source.mjs"])}),
  "scripts/lib/established-native-current-origin.mjs":Object.freeze({
    sha256:"066d9f958c91ac131baf7c897d026485e44f309bbbef3ee24a1d9a3eb857a579",
    imports:Object.freeze([...ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,
      '../check-assistant-later-h0-predecessor-source.mjs'])}),
  "scripts/source-producer-runtime-transition.mjs":Object.freeze({
    sha256:"7d75140447f3f7e1d3cce4a83a06fac673c737251cc6f7ed14e8b5a597d54650",
    imports:Object.freeze(["./lib/bounded-json-writer.mjs","./lib/established-native-current-origin.mjs","./lib/authenticated-frozen586-predecessor.mjs","./check-assistant-later-h0-predecessor-source.mjs","./lib/source-producer-successor-source.mjs","../js/core/ravscore-model-contract.js","./rollback-assets/ravscore-model-contract.js","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./migrate-post-cutover-private-runtime.mjs","./protected-private-production-runtime.mjs"])}),
  "scripts/stage-source-producer-originals.mjs":Object.freeze({
    sha256:"17d3887d7dd388918a0a22573973465d239aceede9cf1041978cd44591bf8c59",
    imports:Object.freeze(["./lib/source-producer-successor-source.mjs","./select-source-producer-code-only-source.mjs","./check-assistant-later-h0-predecessor-source.mjs","./protected-private-production-runtime.mjs","../js/core/ravscore-model-contract.js","./private-production-runtime-workflow.mjs"])}),
});
// Exact additive SOURCE ordinary-reconcile inventory after actual588. Every
// computed reader target is the same fixed normal protected S module, loaded
// only through its genuine selected family factory; no caller source fallback.
const SOURCE_ACTUAL588_RECONCILE_REVIEWED=Object.freeze({
  'scripts/reconcile-private-runtime-checkpoint.mjs':Object.freeze({
    sha256:'cf5daa17206f7789f1ad89785198b43ee87a3a497860c45497f2f5cd282ebb66',
    imports:Object.freeze(["./protected-private-production-runtime.mjs","./private-production-runtime-bundle.mjs","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./protected-ravscore-continuation-checkpoint.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./check-last-mile-enclosure-predecessor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./check-account-statistics-assistant-predecessor-source.mjs","./lib/established-native-current-origin.mjs","./account-statistics-assistant-prewrite.mjs","./lib/native-original-continuity-successor-source.mjs","./check-native-original-continuity-predecessor-source.mjs","./select-native-original-continuity-code-only-source.mjs","./lib/private-weather-component-pack.mjs","./check-production-target-freshness.mjs","./lib/assistant-later-h0-successor-source.mjs","./lib/source-producer-successor-source.mjs","./select-source-producer-code-only-source.mjs","./check-assistant-later-h0-predecessor-source.mjs"])}),
});
// Exact historical assertion views and unchanged connected actual4845 owners.
// These are finite whole-source inventories only, never a runtime reader grant,
// origin handle, blanket fallback or admission for the c832 historical V2 view.
const GENUINE587_G1_RECONCILE_REVIEWED=Object.freeze({
  'scripts/reconcile-private-runtime-checkpoint.mjs':Object.freeze({
    sha256:'5088bf0e120208a352b8ea5e3799cd7f5ba31c50b5214031dc28289ccefe11f7',
    imports:Object.freeze([
      './protected-private-production-runtime.mjs',
      './private-production-runtime-bundle.mjs',
      './private-production-runtime-workflow.mjs',
      './ravscore-continuation-checkpoint.mjs',
      './protected-ravscore-continuation-checkpoint.mjs',
      './lib/established-native-current-origin-successor-source.mjs',
      './lib/last-mile-enclosure-successor-source.mjs',
      './check-last-mile-enclosure-predecessor-source.mjs',
      './lib/account-statistics-assistant-successor-source.mjs',
      './check-account-statistics-assistant-predecessor-source.mjs',
      './lib/established-native-current-origin.mjs',
      './account-statistics-assistant-prewrite.mjs',
      './lib/native-original-continuity-successor-source.mjs',
      './check-native-original-continuity-predecessor-source.mjs',
      './select-native-original-continuity-code-only-source.mjs',
      './lib/private-weather-component-pack.mjs',
      './check-production-target-freshness.mjs',
      './lib/assistant-later-h0-successor-source.mjs',
      './lib/source-producer-successor-source.mjs',
      './select-source-producer-code-only-source.mjs',
      './check-source-producer-587-predecessor-source.mjs'
    ])}),
});
const SOURCE_PREWRITE_HISTORICAL_RECONCILE_PRIOR_REVIEWED=Object.freeze({
  "scripts/reconcile-private-runtime-checkpoint.mjs": Object.freeze({
    sha256: "c646e24b5e7ee4a1b1a71917819eb49e9b38c9e123d5b631211207e033f6a052",
    imports: Object.freeze([
      "./protected-private-production-runtime.mjs",
      "./private-production-runtime-bundle.mjs",
      "./private-production-runtime-workflow.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs",
      "./lib/established-native-current-origin-successor-source.mjs",
      "./lib/last-mile-enclosure-successor-source.mjs",
      "./check-last-mile-enclosure-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "./lib/source-producer-successor-source.mjs",
      "./check-source-producer-predecessor-source.mjs",
      "./lib/established-native-current-origin.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./account-statistics-assistant-prewrite.mjs",
      "./lib/private-weather-component-pack.mjs",
      "./check-production-target-freshness.mjs"
    ]),
  }),
});
const SOURCE_PREWRITE_HISTORICAL_RECONCILE_CODE_ONLY_REVIEWED=Object.freeze({
  'scripts/reconcile-private-runtime-checkpoint.mjs': Object.freeze({
    sha256:'0d39bb342673321abf6481a4a3527bb3717dc4b2604688550d23e5d928b467f4',
    imports:Object.freeze([
      './protected-private-production-runtime.mjs',
      './private-production-runtime-bundle.mjs',
      './private-production-runtime-workflow.mjs',
      './ravscore-continuation-checkpoint.mjs',
      './protected-ravscore-continuation-checkpoint.mjs',
      './lib/established-native-current-origin-successor-source.mjs',
      './lib/last-mile-enclosure-successor-source.mjs',
      './check-last-mile-enclosure-predecessor-source.mjs',
      './lib/account-statistics-assistant-successor-source.mjs',
      './lib/source-producer-successor-source.mjs',
      './select-source-producer-code-only-source.mjs',
      './check-source-producer-predecessor-source.mjs',
      './lib/established-native-current-origin.mjs',
      './check-account-statistics-assistant-predecessor-source.mjs',
      './account-statistics-assistant-prewrite.mjs',
      './lib/private-weather-component-pack.mjs',
      './check-production-target-freshness.mjs',
    ]),
  }),
});
const SOURCE_CONNECTED_ARCHIVE_LOADERS_REVIEWED=Object.freeze({
  "scripts/account-statistics-assistant-prewrite.mjs":Object.freeze({sha256:"44c1ef4edaab1d446cf7696eb5dcacfd49a618ee8788997ce88c740fe59a7761",
    imports:Object.freeze(["./account-statistics-assistant-runtime-transition.mjs","./migrate-post-cutover-private-runtime.mjs","./check-account-statistics-assistant-predecessor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","../js/core/ravscore-model-contract.js","./rollback-assets/ravscore-model-contract.js","./private-production-runtime-workflow.mjs","./protected-private-production-runtime.mjs","./protected-ravscore-continuation-checkpoint.mjs"])}),
  "scripts/account-statistics-assistant-runtime-transition.mjs":Object.freeze({sha256:"f3101b3d5d6c7df7dd42d560d2a9d99c6dbee6cc6904397c95c6256f8144d8fd",
    imports:Object.freeze(["./lib/bounded-json-writer.mjs","./lib/established-native-current-origin.mjs","./lib/authenticated-frozen584-predecessor.mjs","./check-account-statistics-assistant-predecessor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","../js/core/ravscore-model-contract.js","./rollback-assets/ravscore-model-contract.js","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./migrate-post-cutover-private-runtime.mjs","./protected-private-production-runtime.mjs"])}),
  "scripts/migrate-post-cutover-private-runtime.mjs":Object.freeze({sha256:"1b097d22f4102dc80f8d2c917dbaead896ceb3e7b8f364992d3422c4d010d9f6",
    imports:Object.freeze(["./private-production-runtime-workflow.mjs","./lib/private-weather-component-inventory.mjs","./lib/public-hour-delivery-pack.mjs","./lib/rebind-public-hour-pack-exact.mjs","./lib/private-conditions-hourly.mjs","./public-conditions-lib.mjs","../js/core/ravscore-public-runtime-contract.js","./lib/coastal-point-staging-contract.mjs","../js/core/ravscore-model-contract.js","../js/core/ravscore-public-profile-contract.js","../js/core/ravscore-integrated-state-pipeline.js","../js/core/ravscore-integrated.js","../js/core/ravscore-public-model.js","./lib/ravscore-production-adapters.mjs","./lib/ravscore-integrated-runtime.mjs","./audit-ravscore-integrated-public-runtime.mjs","./rollback-assets/ravscore-model-contract.js","./runtime-binding-registry.mjs","./lib/bounded-json-writer.mjs","./lib/ravscore-production-part-pipeline.mjs","./lib/dmi-marine-zone-exclusions.mjs","./lib/bounded-conditions-predecessor-transition.mjs","./private-production-runtime-bundle.mjs","./protected-private-production-runtime.mjs","./check-native-identity-frozen-i71-source.mjs"])}),
  "scripts/check-last-mile-enclosure-predecessor-source.mjs":Object.freeze({sha256:"ab211de90959b87ca342a7db803a43f4ed90fe97d6a37ea648314c75c53337c3",
    imports:Object.freeze([])}),
  "scripts/check-native-identity-frozen-i71-source.mjs":Object.freeze({sha256:"21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77",
    imports:Object.freeze([])}),
});
// Exact normal restore RESULT association only; same finite imports, no new
// data/source/origin admission and no change to publication/SAME_H0 guards.
const SOURCE_ACTUAL588_RESTORE_RESULT_REVIEWED=Object.freeze({
  'scripts/protected-private-production-runtime.mjs':Object.freeze({
    sha256:'07be758050a350c687cfaba4bbe7721176eda973220abbcce6bbb2596220ab58',
    imports:REVIEWED['scripts/protected-private-production-runtime.mjs'].imports}),
});
// Separate composed SOURCE/control whole bytes; never predecessor/profile selection.
// Reuse only the already reviewed finite import arrays. This inventory grants
// no numeric, B/S, origin or opaque-snapshot admission; owner guards still apply.
const SOURCE_CONTROL_UNISSUED_COMPOSITION_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'39181e7c7a369fbbdac7ee49f41396d8383acdc8f6166ab75abce672e94276e2',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'52086a73364de2e8adee3b73428b8f448bbe33222af86a5ef3a95c72bdfc36b0',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'658f8c7b460ebe464d505ceb7b664eb116c3e1ea86fbaea290daba44d642c6cf',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports}),
  'scripts/source-producer-runtime-transition.mjs':Object.freeze({
    sha256:'39901c748116eba0d24bd233da061bbed9853a756fe9c1deefcd98e201b03ee3',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/source-producer-runtime-transition.mjs'].imports}),
  'scripts/stage-source-producer-originals.mjs':Object.freeze({
    sha256:'0b35ba85dd0aee5141c7b77300f60214da52954af3dee58e55c47d4ddac72eb1',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/stage-source-producer-originals.mjs'].imports}),
  // Kun den gennemgåede installerede CURRENT-komposition; ingen parent-/B-S-admission.
  'scripts/reconcile-private-runtime-checkpoint.mjs':Object.freeze({
    sha256:'d32f022a8712c31a22c30a20747dbef946b4c2447adbb2cc78b269489f33ce7e',
    imports:Object.freeze(["./protected-private-production-runtime.mjs","./private-production-runtime-bundle.mjs","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./protected-ravscore-continuation-checkpoint.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./check-last-mile-enclosure-predecessor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./check-account-statistics-assistant-predecessor-source.mjs","./lib/established-native-current-origin.mjs","./account-statistics-assistant-prewrite.mjs","./lib/native-original-continuity-successor-source.mjs","./check-native-original-continuity-predecessor-source.mjs","./select-native-original-continuity-code-only-source.mjs","./lib/private-weather-component-pack.mjs","./check-production-target-freshness.mjs","./lib/assistant-later-h0-successor-source.mjs","./lib/source-producer-successor-source.mjs","./select-source-producer-code-only-source.mjs"])}),
});
// SOURCEs additive590-kald; hver hel kilde gennemgås særskilt, og gamle varianter bevares.
const SOURCE_POST590_RUNTIME_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'ec5e2c8ecd9b72eb712d4653d854672b56b7eef7d6cb645dcf339442811adbfa',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
  'scripts/lib/authenticated-frozen586-predecessor.mjs':Object.freeze({
    sha256:'36f3412ac38d93b211712e207da1168682e7979ed608046a61eae54c79f6b042',
    imports:Object.freeze([...SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/lib/authenticated-frozen586-predecessor.mjs'].imports,'./source-producer-successor-source.mjs'])}),
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'b23860735e74b5ce3418a5f81198452d3e7131e42ad9ee09c74bf7ecd588db96',
    imports:Object.freeze([...SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,'./source-producer-successor-source.mjs'])}),
  'scripts/source-producer-runtime-transition.mjs':Object.freeze({
    sha256:'2366842b235e908b1d71c4755dda703e79c53c54fddcc1e39215d32032b2da93',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/source-producer-runtime-transition.mjs'].imports}),
  'scripts/stage-source-producer-originals.mjs':Object.freeze({
    sha256:'989fa09b9da51e059a9a98dfef01c592a7b62b0c5dfffdbdc39ea710d46bc52f',
    imports:SOURCE_ACTUAL588_RUNTIME_REVIEWED['scripts/stage-source-producer-originals.mjs'].imports}),
  // Genuine590 S reader and the original-bound SOURCE SAME_H0 assertion only.
  // The earlier20-edge UNISSUED composition remains a separate whole variant.
  'scripts/reconcile-private-runtime-checkpoint.mjs':Object.freeze({
    sha256:'cbc2e977b5722a84cdeb78d4e9958512311270a53da8aed84fa1b069a8909433',
    imports:Object.freeze([...SOURCE_CONTROL_UNISSUED_COMPOSITION_REVIEWED['scripts/reconcile-private-runtime-checkpoint.mjs'].imports,
      './check-assistant-later-h0-predecessor-source.mjs'])}),
});
// Fixed private artifact comparison after the existing authentic prewrite.
// The original eleven-edge runtime and all old variants remain separate.
const SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_REVIEWED=Object.freeze({
  'scripts/source-producer-runtime-transition.mjs':Object.freeze({
    sha256:'cd9b5dd648af011dadb171271804ed587cf88005d67b641edf965d54be885b2f',
    imports:Object.freeze([...SOURCE_POST590_RUNTIME_REVIEWED['scripts/source-producer-runtime-transition.mjs'].imports,
      './select-source-producer-code-only-source.mjs','./private-production-runtime-bundle.mjs'])}),
});
// One fixed private bootstrap caller; all prior installed/historical variants remain.
const SOURCE_PRIVATE_BOOTSTRAP_REVIEWED=Object.freeze({
  'scripts/reconcile-private-runtime-checkpoint.mjs':Object.freeze({
    sha256:'ea1122d7f2a95072f66f3eacd0801021194ed4db93a98e2c6508a39bf192f430',
    imports:Object.freeze([...SOURCE_POST590_RUNTIME_REVIEWED['scripts/reconcile-private-runtime-checkpoint.mjs'].imports,
      './integrated-cutover-readiness.mjs'])}),
  'scripts/reconcile-source-producer-code-only.mjs':Object.freeze({
    sha256:'3fa5e46e1c198a2960435f3b8abcc50a79f94191caa426f6ae1e02936d32ef24',
    imports:Object.freeze(['./lib/source-producer-successor-source.mjs','./reconcile-private-runtime-checkpoint.mjs'])}),
});
// Preserve the exact a157 genuine590 DATA-parent source alongside every historical SOURCE variant.
const ASSISTANT_GENUINE590_PARENT_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'0c0b447d20b222daf5d119c60e814605f69572bc5b7f748d8174dc728fd9e87b',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED['scripts/check-assistant-later-h0-predecessor-source.mjs'].imports}),
});
// Additive exact SOURCE591 original-parent caller variants; old whole variants remain unchanged.
// These arrays grant no origin/snapshot/metadata/native admission. Every owner keeps its actual NULL/original guards.
const SOURCE591_ORIGINAL_PARENT_RUNTIME_REVIEWED=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs":Object.freeze({
    sha256:"6cfde2fcf6af11ed24b125db46e7411c179abceb6640d9632ea3642904f3a25c",
    imports:SOURCE_POST590_RUNTIME_REVIEWED["scripts/check-assistant-later-h0-predecessor-source.mjs"].imports}),
  "scripts/lib/authenticated-frozen586-predecessor.mjs":Object.freeze({
    sha256:"fcca3de1d82a77d74b271cb9371a989cef23c26e20f56b02856917449fb713c7",
    imports:SOURCE_POST590_RUNTIME_REVIEWED["scripts/lib/authenticated-frozen586-predecessor.mjs"].imports}),
  "scripts/lib/established-native-current-origin.mjs":Object.freeze({
    sha256:"f41ca55b4c173c00c698183a4328f03cac0bf64f23b710fddf86b116fb15cbe2",
    imports:SOURCE_POST590_RUNTIME_REVIEWED["scripts/lib/established-native-current-origin.mjs"].imports}),
  "scripts/stage-source-producer-originals.mjs":Object.freeze({
    sha256:"89d8e122d9e0402d0096e4bb9f7d591e5d81bc65b0455666cd5259bb91e8fefe",
    imports:SOURCE_POST590_RUNTIME_REVIEWED["scripts/stage-source-producer-originals.mjs"].imports}),
  "scripts/source-producer-runtime-transition.mjs":Object.freeze({
    sha256:"6a275d603f1096a8f7dfd49ba0d9dd60f2c1cfd2d0fd10170bc4f325d4b4eb46",
    imports:SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_REVIEWED["scripts/source-producer-runtime-transition.mjs"].imports}),
  "scripts/reconcile-private-runtime-checkpoint.mjs":Object.freeze({
    sha256:"a213747ca5ca1d286d588d22792c81176aefb27d2f18ca11be733dd3ef9e2bd2",
    imports:SOURCE_PRIVATE_BOOTSTRAP_REVIEWED["scripts/reconcile-private-runtime-checkpoint.mjs"].imports}),
});
const SOURCE590_CANONICAL_PARENT_REVIEWED=Object.freeze({
  'scripts/lib/source-producer-successor-source.mjs':Object.freeze({
    sha256:'9cef2afc8e7fa9506d3b0bf76c144947a97f1b1b621fab388c93c347d610dc30',
    imports:Object.freeze(["./source-producer-binding.generated.json","./source-producer-derived-metadata.mjs","./assistant-later-h0-successor-source.mjs"])}),
});
const SOURCE591_CANONICAL_PARENT_REVIEWED=Object.freeze({
  'scripts/lib/source-producer-successor-source.mjs':Object.freeze({
    sha256:'42bccbb91aacbd711e425cf59b0bdf0cb80f3c55b21f577589801fc0aa3a806a',
    // Both computed imports are the same fixed module in separately verified
    // immutable591/590 roots; no caller-selected path or import target.
    imports:Object.freeze(["./source-producer-binding.generated.json","./source-producer-derived-metadata.mjs","./assistant-later-h0-successor-source.mjs","../check-assistant-later-h0-predecessor-source.mjs"])}),
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
// Finite actual592 CODE/catalogue parent port; no new DATA/native authority.
const SOURCE592_CODE_CATALOGUE_PARENT_REVIEWED=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs":Object.freeze({
    sha256:"84761e4ebac569af0895206b6c7b29d17f3dfa698f6944d8d1b9660f4d9eada2",
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED["scripts/check-assistant-later-h0-predecessor-source.mjs"].imports}),
  "scripts/lib/source-producer-successor-source.mjs":Object.freeze({
    sha256:"89cd6ed254193bd5caf9766744ec1b3667add2d60fef100fe10247df08e28121",
    imports:SOURCE591_CANONICAL_PARENT_REVIEWED["scripts/lib/source-producer-successor-source.mjs"].imports}),
  "scripts/stage-source-producer-originals.mjs":Object.freeze({
    sha256:"60beb2fb7f2fe1ff0b18d29685b4231677f0608ebb7770dfcbea44a7c59bafbf",
    imports:SOURCE591_ORIGINAL_PARENT_RUNTIME_REVIEWED["scripts/stage-source-producer-originals.mjs"].imports}),
  "scripts/source-producer-runtime-transition.mjs":Object.freeze({
    sha256:"63683df6becd4b946fd1134c3f0c2fa8e4b69c3330e02c3531dda4d10989612b",
    imports:SOURCE591_ORIGINAL_PARENT_RUNTIME_REVIEWED["scripts/source-producer-runtime-transition.mjs"].imports}),
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
// Finite593 CODE/default-catalogue port; whole historical591/592 variants stay valid.
const SOURCE593_CODE_CATALOGUE_PARENT_REVIEWED=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs":Object.freeze({sha256:'67a204c4d7e9aa25371e0f42deaa5635b549a325a753564919b7dd5c44da4d2a',
    imports:ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED["scripts/check-assistant-later-h0-predecessor-source.mjs"].imports}),
  "scripts/lib/source-producer-successor-source.mjs":Object.freeze({sha256:'19c26c7a842466e3d887d171a3dd7a91008b78c805299a6b8ce0a83f5806770a',
    imports:SOURCE591_CANONICAL_PARENT_REVIEWED["scripts/lib/source-producer-successor-source.mjs"].imports}),
  "scripts/stage-source-producer-originals.mjs":Object.freeze({sha256:'9b5a3ad9d4a7f9044a9326dee22ae1ca0fce86ca5086f7a2e55d1ec8efb69b19',
    imports:SOURCE591_ORIGINAL_PARENT_RUNTIME_REVIEWED["scripts/stage-source-producer-originals.mjs"].imports}),
  "scripts/source-producer-runtime-transition.mjs":Object.freeze({sha256:'1f2404e736740d755973026669e29dbf58a73ac8e28b793ca89da2c6c3291c09',
    imports:SOURCE591_ORIGINAL_PARENT_RUNTIME_REVIEWED["scripts/source-producer-runtime-transition.mjs"].imports})
});
// Additive SOURCE593 DATA/snapshot/runtime composition. Full changed module bytes remain model inputs.
const SOURCE593_DATA_RUNTIME_COMPOSITION_REVIEWED=Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs":Object.freeze({sha256:"b2c7294242de8cc1e2341fc6038e5659e7d87509b996e1dbfbe76f0f3e49eb8f",
    imports:Object.freeze([])}),
  "scripts/lib/authenticated-frozen586-predecessor.mjs":Object.freeze({sha256:"28e058826aae4a3ca3a8eb6c0c4cb7b9615727e133542c21ac0485b8893db046",
    imports:Object.freeze(["./bounded-json-writer.mjs","../check-assistant-later-h0-predecessor-source.mjs","./source-producer-successor-source.mjs"])}),
  "scripts/lib/established-native-current-origin.mjs":Object.freeze({sha256:"7b6d748689a516396a58733c9c1915efbfe7e3d626c5b71a13db3b878a4c4b4c",
    imports:Object.freeze(["../protected-private-production-runtime.mjs","../protected-ravscore-continuation-checkpoint.mjs","../private-production-runtime-bundle.mjs","./weather-state-epoch-archive.mjs","../ravscore-continuation-checkpoint.mjs","../private-production-runtime-workflow.mjs","../../js/core/ravscore-model-contract.js","../rollback-assets/ravscore-model-contract.js","../../js/core/ravscore-model-bundle.generated.js","./ravscore-sampling-context.mjs","./coastal-point-staging-contract.mjs","./ravscore-candidate-g-rollback-runtime.mjs","./private-weather-component-pack.mjs","./bounded-json-writer.mjs","../check-native-current-reanalysis-predecessor-source.mjs","./authenticated-frozen584-predecessor.mjs","../check-account-statistics-assistant-predecessor-source.mjs","./authenticated-frozen585-predecessor.mjs","../check-native-original-continuity-predecessor-source.mjs","./authenticated-frozen586-predecessor.mjs","../check-assistant-later-h0-predecessor-source.mjs","./source-producer-successor-source.mjs","./ravscore-production-part-pipeline.mjs"])}),
  "scripts/stage-source-producer-originals.mjs":Object.freeze({sha256:"f44d371f50c4746c8968f2eb825dfe8d0f1291d2dcabfac3fd0af66a0aa0dadd",
    imports:Object.freeze(["./lib/source-producer-successor-source.mjs","./select-source-producer-code-only-source.mjs","./check-assistant-later-h0-predecessor-source.mjs","./protected-private-production-runtime.mjs","../js/core/ravscore-model-contract.js","./private-production-runtime-workflow.mjs"])}),
  "scripts/source-producer-runtime-transition.mjs":Object.freeze({sha256:"22ee67e94f78ebcd6d2a2a4b3d630b29744f509be7fa8cc9918c7abd9ef4fff6",
    imports:Object.freeze(["./lib/bounded-json-writer.mjs","./lib/established-native-current-origin.mjs","./lib/authenticated-frozen586-predecessor.mjs","./check-assistant-later-h0-predecessor-source.mjs","./lib/source-producer-successor-source.mjs","../js/core/ravscore-model-contract.js","./rollback-assets/ravscore-model-contract.js","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./migrate-post-cutover-private-runtime.mjs","./protected-private-production-runtime.mjs","./select-source-producer-code-only-source.mjs","./private-production-runtime-bundle.mjs"])}),
  "scripts/reconcile-private-runtime-checkpoint.mjs":Object.freeze({sha256:"5cfad1bcca6fd20945e14f8aee5651b0362624d6e1efd44602c2359fba762178",
    imports:Object.freeze(["./protected-private-production-runtime.mjs","./private-production-runtime-bundle.mjs","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./protected-ravscore-continuation-checkpoint.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./check-last-mile-enclosure-predecessor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./check-account-statistics-assistant-predecessor-source.mjs","./lib/established-native-current-origin.mjs","./account-statistics-assistant-prewrite.mjs","./lib/native-original-continuity-successor-source.mjs","./check-native-original-continuity-predecessor-source.mjs","./select-native-original-continuity-code-only-source.mjs","./lib/private-weather-component-pack.mjs","./check-production-target-freshness.mjs","./lib/bounded-json-writer.mjs","./check-assistant-later-h0-predecessor-source.mjs","./lib/assistant-later-h0-successor-source.mjs","./lib/source-producer-successor-source.mjs","./select-source-producer-code-only-source.mjs","./integrated-cutover-readiness.mjs"])}),
});
// Exact private SOURCE593 plan extension; old phases and all numerical inputs remain whole.
const SOURCE593_WORKFLOW_PLAN_REVIEWED=Object.freeze({
  'scripts/integrated-cutover-readiness.mjs':Object.freeze({sha256:'0829c2514f3529e2b7ef130813ff4a12a67311a182310b6d43fb3c37b90e0199',
    imports:Object.freeze(["../config.js","../js/core/ravscore-model-contract.js","./lib/ravscore-profile-transition.mjs","./rollback-assets/ravscore-model-contract.js","./lib/supabase-admin-rest.mjs","./lib/account-assistant-successor-source.mjs","./lib/current-grid-successor-source.mjs","./lib/native-sampling-identity-successor-source.mjs","./lib/current-memory-warmup-successor-source.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./lib/native-original-continuity-successor-source.mjs","./lib/assistant-later-h0-successor-source.mjs","./build-statistics-preference-revision.mjs","./lib/source-producer-successor-source.mjs"])}),
});
// Præcis additiv SOURCE-workflowport oven på d038; gamle varianter bevares.
const SOURCE_D038_WORKFLOW_PLAN_REVIEWED=Object.freeze({
  'scripts/integrated-cutover-readiness.mjs':Object.freeze({sha256:'34004367659c15c863be725bcccbdcf6b6ce86add7d69062d11c7a4ba1438040',
    imports:Object.freeze(["../config.js","../js/core/ravscore-model-contract.js","./lib/ravscore-profile-transition.mjs","./rollback-assets/ravscore-model-contract.js","./lib/supabase-admin-rest.mjs","./lib/account-assistant-successor-source.mjs","./lib/current-grid-successor-source.mjs","./lib/native-sampling-identity-successor-source.mjs","./lib/current-memory-warmup-successor-source.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./lib/native-original-continuity-successor-source.mjs","./lib/assistant-later-h0-successor-source.mjs","./lib/source-producer-successor-source.mjs","./build-statistics-preference-revision.mjs"])}),
});
// Exact private d038 owner composition; whole current594 and historical variants remain unchanged.
const SOURCE_D038_OWNER_COMPOSITION_REVIEWED=Object.freeze({
  "scripts/lib/established-native-current-origin.mjs":Object.freeze({sha256:"fbb294683993553c4b1683b4cbb90a429336da4308e0c243cd1a619eeeccbfea",
    imports:Object.freeze(["../protected-private-production-runtime.mjs","../protected-ravscore-continuation-checkpoint.mjs","../private-production-runtime-bundle.mjs","../ravscore-continuation-checkpoint.mjs","../private-production-runtime-workflow.mjs","../../js/core/ravscore-model-contract.js","../rollback-assets/ravscore-model-contract.js","../../js/core/ravscore-model-bundle.generated.js","./ravscore-sampling-context.mjs","./coastal-point-staging-contract.mjs","./ravscore-candidate-g-rollback-runtime.mjs","./private-weather-component-pack.mjs","../check-native-current-reanalysis-predecessor-source.mjs","./ravscore-production-part-pipeline.mjs","./weather-state-epoch-archive.mjs","./authenticated-frozen584-predecessor.mjs","../check-account-statistics-assistant-predecessor-source.mjs","./authenticated-frozen585-predecessor.mjs","../check-native-original-continuity-predecessor-source.mjs","./authenticated-frozen586-predecessor.mjs","./bounded-json-writer.mjs","./assistant-public591-runtime-contracts.mjs","../check-assistant-later-h0-predecessor-source.mjs","./source-producer-successor-source.mjs"])}),
  "scripts/reconcile-private-runtime-checkpoint.mjs":Object.freeze({sha256:"ab0cba3a1301e20502b758c357e6983d7c59b303cbbc1092e55b7a9253534534",
    imports:Object.freeze(["./protected-private-production-runtime.mjs","./private-production-runtime-bundle.mjs","./private-production-runtime-workflow.mjs","./ravscore-continuation-checkpoint.mjs","./protected-ravscore-continuation-checkpoint.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./check-last-mile-enclosure-predecessor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./check-account-statistics-assistant-predecessor-source.mjs","./lib/established-native-current-origin.mjs","./account-statistics-assistant-prewrite.mjs","./lib/native-original-continuity-successor-source.mjs","./check-native-original-continuity-predecessor-source.mjs","./select-native-original-continuity-code-only-source.mjs","./lib/private-weather-component-pack.mjs","./check-production-target-freshness.mjs","./lib/bounded-json-writer.mjs","./check-assistant-later-h0-predecessor-source.mjs","./lib/assistant-later-h0-successor-source.mjs","./lib/source-producer-successor-source.mjs","./select-source-producer-code-only-source.mjs","./integrated-cutover-readiness.mjs"])}),
});
// Exact additive reviewed594 readiness; all historical whole-source variants remain valid.
const SOURCE_REVIEWED594_READINESS=Object.freeze({
  "scripts/integrated-cutover-readiness.mjs":Object.freeze({sha256:"70587064a60d396bd99a8070bf6a50ca6414eae5f1888db3edd696008d245c67",
    imports:Object.freeze(["../config.js","../js/core/ravscore-model-contract.js","./lib/ravscore-profile-transition.mjs","./rollback-assets/ravscore-model-contract.js","./lib/supabase-admin-rest.mjs","./lib/account-assistant-successor-source.mjs","./lib/current-grid-successor-source.mjs","./lib/native-sampling-identity-successor-source.mjs","./lib/current-memory-warmup-successor-source.mjs","./lib/established-native-current-origin-successor-source.mjs","./lib/last-mile-enclosure-successor-source.mjs","./lib/account-statistics-assistant-successor-source.mjs","./lib/native-original-continuity-successor-source.mjs","./lib/assistant-later-h0-successor-source.mjs","./lib/source-producer-successor-source.mjs","./build-statistics-preference-revision.mjs"])}),
});
// Exact historical SOURCE19 entries and the whole reviewed594 composition.
// Fixed complete hashes only; no changed-source/scanner-error fallback.
const SOURCE19_ARCHIVED_MODEL_IMPORTS_REVIEWED = Object.freeze({
  "scripts/protected-private-production-runtime.mjs": Object.freeze({
    sha256:"380bb5420a833d4541cee4aa1f3889c4023087182580e18ccb16de8d0ab299da",
    imports:Object.freeze([
  "./private-production-runtime-bundle.mjs",
  "./lib/supabase-admin-rest.mjs",
  "../js/core/ravscore-model-contract.js",
  "./lib/r2-private-runtime-storage.mjs",
  "./lib/private-weather-component-inventory.mjs",
  "./lib/bounded-conditions-predecessor-transition.mjs",
  "./source-normal-producer-entry.mjs"
]),
  }),
  "scripts/reconcile-private-runtime-checkpoint.mjs": Object.freeze({
    sha256:"e938b6607bc9cacad90e175555bfa9c7c6450b105a3589538c787577f70927a8",
    imports:Object.freeze([
  "./protected-private-production-runtime.mjs",
  "./private-production-runtime-bundle.mjs",
  "./private-production-runtime-workflow.mjs",
  "./ravscore-continuation-checkpoint.mjs",
  "./protected-ravscore-continuation-checkpoint.mjs",
  "./lib/established-native-current-origin-successor-source.mjs",
  "./lib/last-mile-enclosure-successor-source.mjs",
  "./check-last-mile-enclosure-predecessor-source.mjs",
  "./lib/account-statistics-assistant-successor-source.mjs",
  "./check-account-statistics-assistant-predecessor-source.mjs",
  "./lib/established-native-current-origin.mjs",
  "./account-statistics-assistant-prewrite.mjs",
  "./lib/private-weather-component-pack.mjs",
  "./check-production-target-freshness.mjs"
]),
  }),
  "scripts/lib/established-native-current-origin.mjs": Object.freeze({
    sha256:"c3c52d867ed6b29c10986bc16f4052a1d639ef7ba508d0e20cad7be40110babc",
    imports:Object.freeze([
  "../protected-private-production-runtime.mjs",
  "../protected-ravscore-continuation-checkpoint.mjs",
  "../private-production-runtime-bundle.mjs",
  "./weather-state-epoch-archive.mjs",
  "../ravscore-continuation-checkpoint.mjs",
  "../private-production-runtime-workflow.mjs",
  "../../js/core/ravscore-model-contract.js",
  "../rollback-assets/ravscore-model-contract.js",
  "../../js/core/ravscore-model-bundle.generated.js",
  "./ravscore-sampling-context.mjs",
  "./coastal-point-staging-contract.mjs",
  "./ravscore-candidate-g-rollback-runtime.mjs",
  "./private-weather-component-pack.mjs",
  "../check-native-current-reanalysis-predecessor-source.mjs",
  "./authenticated-frozen584-predecessor.mjs",
  "../check-account-statistics-assistant-predecessor-source.mjs",
  "./authenticated-frozen585-predecessor.mjs",
  "../check-source-producer-predecessor-source.mjs",
  "./ravscore-production-part-pipeline.mjs"
]),
  }),
  "scripts/lib/authenticated-frozen585-predecessor.mjs": Object.freeze({
    sha256:"7a7e18b625a99c28dc8a3331d374e9d8fbbf19a64c8a323b1af99bfe1f60679e",
    imports:Object.freeze([
  "../check-source-producer-predecessor-source.mjs"
]),
  }),
  "scripts/check-source-producer-predecessor-source.mjs": Object.freeze({
    sha256:"17b3ce539b1f296fb75bf592fcd7393569f0dd3614974e6d7d06a836a0020922",
    imports:Object.freeze([]),
  }),
  "scripts/source-producer-runtime-transition.mjs": Object.freeze({
    sha256:"012d0c50b675bf8d2a4e0cd71ab51a78f19da3548d9647b18f7aeb554fee81f5",
    imports:Object.freeze([
  "./lib/bounded-json-writer.mjs",
  "./lib/established-native-current-origin.mjs",
  "./lib/authenticated-frozen585-predecessor.mjs",
  "./check-source-producer-predecessor-source.mjs",
  "./lib/source-producer-successor-source.mjs",
  "../js/core/ravscore-model-contract.js",
  "./rollback-assets/ravscore-model-contract.js",
  "./private-production-runtime-workflow.mjs",
  "./ravscore-continuation-checkpoint.mjs",
  "./migrate-post-cutover-private-runtime.mjs",
  "./protected-private-production-runtime.mjs"
]),
  }),
});
const SOURCE594_ACTUAL_PRIVATE_COMPOSITION_REVIEWED = Object.freeze({
  "scripts/check-assistant-later-h0-predecessor-source.mjs": Object.freeze({
    sha256:"f45fb6c3f2a2def4445ab219aa17c6591cf3bda0a0aade41c8b383c3714d751d",
    imports:Object.freeze([]),
  }),
  "scripts/lib/source-producer-successor-source.mjs": Object.freeze({
    sha256:"746dddb8457bac994fbe24046dfb0ba2d60949bb72c15362502ca6784dbabf50",
    imports:Object.freeze([
  "./source-producer-binding.generated.json",
  "./source-producer-derived-metadata.mjs",
  "./assistant-later-h0-successor-source.mjs",
  "../check-assistant-later-h0-predecessor-source.mjs"
]),
  }),
  "scripts/lib/authenticated-frozen586-predecessor.mjs": Object.freeze({
    sha256:"a07a87fe224c5f5674f528ae38e9ba95f28545baded99c372f68da3e971932b7",
    imports:Object.freeze([
  "./bounded-json-writer.mjs",
  "../check-assistant-later-h0-predecessor-source.mjs",
  "./source-producer-successor-source.mjs"
]),
  }),
  "scripts/lib/established-native-current-origin.mjs": Object.freeze({
    sha256:"6a596e24ff12b007b5cfb9af48239870bc337980cff28f8676a5f52acc182a35",
    imports:Object.freeze([
  "../protected-private-production-runtime.mjs",
  "../protected-ravscore-continuation-checkpoint.mjs",
  "../private-production-runtime-bundle.mjs",
  "../ravscore-continuation-checkpoint.mjs",
  "../private-production-runtime-workflow.mjs",
  "../../js/core/ravscore-model-contract.js",
  "../rollback-assets/ravscore-model-contract.js",
  "../../js/core/ravscore-model-bundle.generated.js",
  "./ravscore-sampling-context.mjs",
  "./coastal-point-staging-contract.mjs",
  "./ravscore-candidate-g-rollback-runtime.mjs",
  "./private-weather-component-pack.mjs",
  "../check-native-current-reanalysis-predecessor-source.mjs",
  "./ravscore-production-part-pipeline.mjs",
  "./weather-state-epoch-archive.mjs",
  "./authenticated-frozen584-predecessor.mjs",
  "../check-account-statistics-assistant-predecessor-source.mjs",
  "./authenticated-frozen585-predecessor.mjs",
  "../check-native-original-continuity-predecessor-source.mjs",
  "./authenticated-frozen586-predecessor.mjs",
  "./bounded-json-writer.mjs",
  "./assistant-public591-runtime-contracts.mjs",
  "../check-assistant-later-h0-predecessor-source.mjs",
  "./source-producer-successor-source.mjs"
]),
  }),
  "scripts/stage-source-producer-originals.mjs": Object.freeze({
    sha256:"9122254149cd3b9ff18b46e9b408ca92fc276b58774e1af538543c08d1aaf55d",
    imports:Object.freeze([
  "./lib/source-producer-successor-source.mjs",
  "./select-source-producer-code-only-source.mjs",
  "./check-assistant-later-h0-predecessor-source.mjs",
  "./protected-private-production-runtime.mjs",
  "../js/core/ravscore-model-contract.js",
  "./private-production-runtime-workflow.mjs"
]),
  }),
  "scripts/source-producer-runtime-transition.mjs": Object.freeze({
    sha256:"2f181b0ff256a976106f2bad32dfdc4793809078e4003e7c9ae99bb40f2b7c16",
    imports:Object.freeze([
  "./lib/bounded-json-writer.mjs",
  "./lib/established-native-current-origin.mjs",
  "./lib/authenticated-frozen586-predecessor.mjs",
  "./check-assistant-later-h0-predecessor-source.mjs",
  "./lib/source-producer-successor-source.mjs",
  "../js/core/ravscore-model-contract.js",
  "./rollback-assets/ravscore-model-contract.js",
  "./private-production-runtime-workflow.mjs",
  "./ravscore-continuation-checkpoint.mjs",
  "./migrate-post-cutover-private-runtime.mjs",
  "./protected-private-production-runtime.mjs",
  "./select-source-producer-code-only-source.mjs",
  "./private-production-runtime-bundle.mjs"
]),
  }),
  "scripts/reconcile-private-runtime-checkpoint.mjs": Object.freeze({
    sha256:"de6eed5a039553302c818710478755f1143c6de561bcf2b6323e8b9ff46d5bd9",
    imports:Object.freeze([
  "./protected-private-production-runtime.mjs",
  "./private-production-runtime-bundle.mjs",
  "./private-production-runtime-workflow.mjs",
  "./ravscore-continuation-checkpoint.mjs",
  "./protected-ravscore-continuation-checkpoint.mjs",
  "./lib/established-native-current-origin-successor-source.mjs",
  "./lib/last-mile-enclosure-successor-source.mjs",
  "./check-last-mile-enclosure-predecessor-source.mjs",
  "./lib/account-statistics-assistant-successor-source.mjs",
  "./check-account-statistics-assistant-predecessor-source.mjs",
  "./lib/established-native-current-origin.mjs",
  "./account-statistics-assistant-prewrite.mjs",
  "./lib/native-original-continuity-successor-source.mjs",
  "./check-native-original-continuity-predecessor-source.mjs",
  "./select-native-original-continuity-code-only-source.mjs",
  "./lib/private-weather-component-pack.mjs",
  "./check-production-target-freshness.mjs",
  "./lib/bounded-json-writer.mjs",
  "./check-assistant-later-h0-predecessor-source.mjs",
  "./lib/assistant-later-h0-successor-source.mjs",
  "./lib/source-producer-successor-source.mjs",
  "./select-source-producer-code-only-source.mjs",
  "./integrated-cutover-readiness.mjs"
]),
  }),
});

// Én præcis additiv variant efter den faste source594-CLI. Alle gamle kilder bevares.
// Relativ importmængde er uændret tom; faste Git-/data-URL-importgrænser er bytebevarede.
const SOURCE594_FIXED_CLI_REVIEWED=Object.freeze({
  'scripts/check-assistant-later-h0-predecessor-source.mjs':Object.freeze({
    sha256:'eeaaecbfa70d0f8856ab76ac8f2e1c57bed7f2334ac0226a2482d08dc2e9a616',
    imports:Object.freeze([]),
  }),
});

// To hele, gennemgåede SOURCE596-varianter. Kun kodebundet readiness og den
// strenge saved-guard er ændret; begge finite importmængder er uændrede.
// Alle gamle hele varianter og afslag bevares; ingen produkt-/dataadmission.
const SOURCE596_READINESS_RECONCILE_REVIEWED=Object.freeze({
  'scripts/integrated-cutover-readiness.mjs':Object.freeze({
    sha256:'fb5b6e6b5bb3a1dc16272a481fbcfb52dc56b55c2b029cd8e9b3935f29375d53',
    imports:SOURCE_REVIEWED594_READINESS['scripts/integrated-cutover-readiness.mjs'].imports}),
  'scripts/reconcile-private-runtime-checkpoint.mjs':Object.freeze({
    sha256:'f399ead00e3f33ba92daed6c1b03701e0082989aa267ca2ff75e063b22b4acfe',
    imports:SOURCE594_ACTUAL_PRIVATE_COMPOSITION_REVIEWED['scripts/reconcile-private-runtime-checkpoint.mjs'].imports}),
});

export function modelSourceRelativeModuleSpecifiers(source, file) {
  if (!Object.hasOwn(REVIEWED, file) && !Object.hasOwn(NATIVE_CONTINUITY_REVIEWED, file)
    && !Object.hasOwn(ASSISTANT_LATER_H0_REVIEWED,file) && !Object.hasOwn(ASSISTANT_BINDING_PREWRITE_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_BINDING_DIAGNOSTIC_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_BINDING_CHECKPOINT_TARGET_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_PUBLIC587_SOURCE_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED,file)
    && !Object.hasOwn(CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED,file)
    && !Object.hasOwn(SOURCE_ACTUAL588_RUNTIME_REVIEWED,file)
    && !Object.hasOwn(SOURCE_ACTUAL588_RECONCILE_REVIEWED,file)
    && !Object.hasOwn(GENUINE587_G1_RECONCILE_REVIEWED,file)
    && !Object.hasOwn(SOURCE_PREWRITE_HISTORICAL_RECONCILE_PRIOR_REVIEWED,file)
    && !Object.hasOwn(SOURCE_PREWRITE_HISTORICAL_RECONCILE_CODE_ONLY_REVIEWED,file)
    && !Object.hasOwn(SOURCE_CONNECTED_ARCHIVE_LOADERS_REVIEWED,file)
    && !Object.hasOwn(SOURCE_ACTUAL588_RESTORE_RESULT_REVIEWED,file)
    && !Object.hasOwn(SOURCE_CONTROL_UNISSUED_COMPOSITION_REVIEWED,file)
    && !Object.hasOwn(SOURCE_POST590_RUNTIME_REVIEWED,file)
    && !Object.hasOwn(SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_REVIEWED,file)
    && !Object.hasOwn(SOURCE_PRIVATE_BOOTSTRAP_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED,file)
    && !Object.hasOwn(SOURCE590_CANONICAL_PARENT_REVIEWED,file)
    && !Object.hasOwn(SOURCE591_CANONICAL_PARENT_REVIEWED,file)
    && !Object.hasOwn(ASSISTANT_GENUINE591_PARENT_REVIEWED,file)
    && !Object.hasOwn(SOURCE592_CODE_CATALOGUE_PARENT_REVIEWED,file)
    && !Object.hasOwn(CONDITIONS_READER_CAPACITY593_REVIEWED,file)
    && !Object.hasOwn(SOURCE593_CODE_CATALOGUE_PARENT_REVIEWED,file)
    && !Object.hasOwn(SOURCE593_DATA_RUNTIME_COMPOSITION_REVIEWED,file)
    && !Object.hasOwn(SOURCE593_WORKFLOW_PLAN_REVIEWED,file)
    && !Object.hasOwn(ORIGIN591_METADATA594_REVIEWED,file)
    && !Object.hasOwn(SOURCE_D038_WORKFLOW_PLAN_REVIEWED,file)
    && !Object.hasOwn(SOURCE_D038_OWNER_COMPOSITION_REVIEWED,file)
    && !Object.hasOwn(SOURCE_REVIEWED594_READINESS,file)
    && !Object.hasOwn(SOURCE19_ARCHIVED_MODEL_IMPORTS_REVIEWED,file)
    && !Object.hasOwn(SOURCE594_ACTUAL_PRIVATE_COMPOSITION_REVIEWED,file)
    && !Object.hasOwn(SOURCE594_FIXED_CLI_REVIEWED,file))
    return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const reviewed = [REVIEWED[file], NATIVE_CONTINUITY_REVIEWED[file],ASSISTANT_LATER_H0_REVIEWED[file],ASSISTANT_BINDING_PREWRITE_REVIEWED[file],ASSISTANT_BINDING_DIAGNOSTIC_REVIEWED[file],ASSISTANT_BINDING_CHECKPOINT_TARGET_REVIEWED[file],ASSISTANT_PUBLIC587_SOURCE_REVIEWED[file],ASSISTANT_PUBLIC587_OPERATIVE_REVIEWED[file],CALENDAR_PUBLIC588_SUCCESSOR_REVIEWED[file],SOURCE_ACTUAL588_RUNTIME_REVIEWED[file],SOURCE_ACTUAL588_RECONCILE_REVIEWED[file],GENUINE587_G1_RECONCILE_REVIEWED[file],SOURCE_PREWRITE_HISTORICAL_RECONCILE_PRIOR_REVIEWED[file],SOURCE_PREWRITE_HISTORICAL_RECONCILE_CODE_ONLY_REVIEWED[file],SOURCE_CONNECTED_ARCHIVE_LOADERS_REVIEWED[file],SOURCE_ACTUAL588_RESTORE_RESULT_REVIEWED[file],SOURCE_CONTROL_UNISSUED_COMPOSITION_REVIEWED[file],SOURCE_POST590_RUNTIME_REVIEWED[file],SOURCE_PRIVATE_BOOTSTRAP_ARTIFACT_REVIEWED[file],SOURCE_PRIVATE_BOOTSTRAP_REVIEWED[file],ASSISTANT_PUBLIC590_SUCCESSOR_REVIEWED[file],ASSISTANT_GENUINE590_PARENT_REVIEWED[file],SOURCE591_ORIGINAL_PARENT_RUNTIME_REVIEWED[file],SOURCE590_CANONICAL_PARENT_REVIEWED[file],SOURCE591_CANONICAL_PARENT_REVIEWED[file],ASSISTANT_GENUINE591_PARENT_REVIEWED[file],SOURCE592_CODE_CATALOGUE_PARENT_REVIEWED[file],CONDITIONS_READER_CAPACITY593_REVIEWED[file],SOURCE593_CODE_CATALOGUE_PARENT_REVIEWED[file],SOURCE593_DATA_RUNTIME_COMPOSITION_REVIEWED[file],SOURCE593_WORKFLOW_PLAN_REVIEWED[file],ORIGIN591_METADATA594_REVIEWED[file],SOURCE_D038_WORKFLOW_PLAN_REVIEWED[file],SOURCE_D038_OWNER_COMPOSITION_REVIEWED[file],SOURCE_REVIEWED594_READINESS[file],SOURCE19_ARCHIVED_MODEL_IMPORTS_REVIEWED[file],SOURCE594_ACTUAL_PRIVATE_COMPOSITION_REVIEWED[file],SOURCE594_FIXED_CLI_REVIEWED[file],SOURCE596_READINESS_RECONCILE_REVIEWED[file]].filter(Boolean)
    .find(variant => variant.sha256 === hash);
  if (!reviewed)
    throw new Error('Whole reviewed model import source changed: ' + file);
  return reviewed.imports;
}
