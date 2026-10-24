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
// Additive genuine587 -> SOURCE parent-ingress variants only. The actual
// c03 ordinary586/metadata585 tables and readers above remain unchanged.
// Each whole image selects one finite inventory; unknown bytes still fail.
const GENUINE587_PARENT_INGRESS_REVIEWED=Object.freeze({
  'scripts/lib/established-native-current-origin.mjs':Object.freeze({
    sha256:'0f6ab7de39f2d445412a72ecf706b46d1e3ab2f8f90e40b1be822da854d23c92',
    imports:Object.freeze([...ASSISTANT_LATER_H0_REVIEWED['scripts/lib/established-native-current-origin.mjs'].imports,
      './authenticated-frozen587-predecessor.mjs', '../check-source-producer-587-predecessor-source.mjs'])}),
  'scripts/lib/authenticated-frozen587-predecessor.mjs':Object.freeze({
    sha256:'1a349f83c3d7c54314b01ea015daa6f30f308c1417925e249ef76f5c3ad66d4a',
    imports:Object.freeze(['../check-source-producer-587-predecessor-source.mjs'])}),
  'scripts/check-source-producer-587-predecessor-source.mjs':Object.freeze({
    sha256:'45b34682a62199e6a180dcb3c876e9c0cc8e5caebaa031824d311004169ec070',
    imports:Object.freeze([])}),
});
// Exact additive core-runtime inventory for the genuine587 -> SOURCE port.
// All c03 and parent-ingress tables above remain byte-identical.
const SOURCE587_CORE_RUNTIME_REVIEWED=Object.freeze({
  'scripts/source-producer-runtime-transition.mjs':Object.freeze({
    sha256:'16d2ea51c1e0da6971710d608924bc12f56bc0cf34367d78dd61f10c9aed9104',
    imports:Object.freeze([
      './lib/bounded-json-writer.mjs',
      './lib/established-native-current-origin.mjs',
      './lib/authenticated-frozen587-predecessor.mjs',
      './check-source-producer-587-predecessor-source.mjs',
      './lib/source-producer-successor-source.mjs',
      '../js/core/ravscore-model-contract.js',
      './rollback-assets/ravscore-model-contract.js',
      './private-production-runtime-workflow.mjs',
      './ravscore-continuation-checkpoint.mjs',
      './migrate-post-cutover-private-runtime.mjs',
      './protected-private-production-runtime.mjs'
    ])}),
});
// Exact additive G1 reconcile inventory on the genuine587 parent.
// All existing foundation tables remain unchanged; no scanner fallback.
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
// Exact additive protected-restore result owner on the genuine587 parent.
// Whole source only: identical six import owners, never JSON/result admission.
const GENUINE587_PROTECTED_RESTORE_REVIEWED=Object.freeze({
  'scripts/protected-private-production-runtime.mjs':Object.freeze({
    sha256:'07be758050a350c687cfaba4bbe7721176eda973220abbcce6bbb2596220ab58',
    imports:Object.freeze(['./private-production-runtime-bundle.mjs', './lib/supabase-admin-rest.mjs', '../js/core/ravscore-model-contract.js',
      './lib/r2-private-runtime-storage.mjs', './lib/private-weather-component-inventory.mjs', './lib/bounded-conditions-predecessor-transition.mjs']),
  }),
});
// Two exact historical reconcile inventories used by the preserved prewrite oracle.
// Source recognition only: no runtime/numeric admission and no c832 V2 fallback.
// Both row bodies are byte-identical to their reviewed historical scanner.
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
// Exact connected archive-loader owners reached by the genuine SOURCE graph.
// Whole current bytes equal the reviewed LF owners; no whole LF scanner overlay,
// unknown-source fallback, runtime admission or excluded implementation is added.
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
export function modelSourceRelativeModuleSpecifiers(source, file) {
  if (!Object.hasOwn(REVIEWED, file) && !Object.hasOwn(NATIVE_CONTINUITY_REVIEWED, file)
    && !Object.hasOwn(ASSISTANT_LATER_H0_REVIEWED,file) && !Object.hasOwn(ASSISTANT_BINDING_PREWRITE_REVIEWED,file)
    && !Object.hasOwn(GENUINE587_PARENT_INGRESS_REVIEWED,file)
    && !Object.hasOwn(SOURCE587_CORE_RUNTIME_REVIEWED,file)
    && !Object.hasOwn(GENUINE587_G1_RECONCILE_REVIEWED,file)
    && !Object.hasOwn(GENUINE587_PROTECTED_RESTORE_REVIEWED,file)
    && !Object.hasOwn(SOURCE_PREWRITE_HISTORICAL_RECONCILE_PRIOR_REVIEWED,file)
    && !Object.hasOwn(SOURCE_PREWRITE_HISTORICAL_RECONCILE_CODE_ONLY_REVIEWED,file)
    && !Object.hasOwn(SOURCE_CONNECTED_ARCHIVE_LOADERS_REVIEWED,file))
    return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const reviewed = [REVIEWED[file], NATIVE_CONTINUITY_REVIEWED[file],ASSISTANT_LATER_H0_REVIEWED[file],ASSISTANT_BINDING_PREWRITE_REVIEWED[file],GENUINE587_PARENT_INGRESS_REVIEWED[file],SOURCE587_CORE_RUNTIME_REVIEWED[file],GENUINE587_G1_RECONCILE_REVIEWED[file],GENUINE587_PROTECTED_RESTORE_REVIEWED[file],SOURCE_PREWRITE_HISTORICAL_RECONCILE_PRIOR_REVIEWED[file],SOURCE_PREWRITE_HISTORICAL_RECONCILE_CODE_ONLY_REVIEWED[file],SOURCE_CONNECTED_ARCHIVE_LOADERS_REVIEWED[file]].filter(Boolean)
    .find(variant => variant.sha256 === hash);
  if (!reviewed)
    throw new Error('Whole reviewed model import source changed: ' + file);
  return reviewed.imports;
}
