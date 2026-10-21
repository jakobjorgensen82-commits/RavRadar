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
// Exact additive SOURCE variants. Old reviewed/frozen entries above remain
// byte-identical. Each whole-source hash selects one finite import inventory;
// no unknown byte or scanner failure can select a reviewed entry.
const SOURCE_REVIEWED = Object.freeze({
  "scripts/protected-private-production-runtime.mjs": Object.freeze({
    sha256: "380bb5420a833d4541cee4aa1f3889c4023087182580e18ccb16de8d0ab299da",
    imports: Object.freeze([
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
    sha256: "e938b6607bc9cacad90e175555bfa9c7c6450b105a3589538c787577f70927a8",
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
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/established-native-current-origin.mjs",
      "./account-statistics-assistant-prewrite.mjs",
      "./lib/private-weather-component-pack.mjs",
      "./check-production-target-freshness.mjs"
    ]),
  }),
  "scripts/check-last-mile-enclosure-predecessor-source.mjs": Object.freeze({
    sha256: "ab211de90959b87ca342a7db803a43f4ed90fe97d6a37ea648314c75c53337c3",
    imports: Object.freeze([]),
  }),
  "scripts/account-statistics-assistant-prewrite.mjs": Object.freeze({
    sha256: "44c1ef4edaab1d446cf7696eb5dcacfd49a618ee8788997ce88c740fe59a7761",
    imports: Object.freeze([
      "./account-statistics-assistant-runtime-transition.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./protected-private-production-runtime.mjs",
      "./protected-ravscore-continuation-checkpoint.mjs"
    ]),
  }),
  "scripts/account-statistics-assistant-runtime-transition.mjs": Object.freeze({
    sha256: "f3101b3d5d6c7df7dd42d560d2a9d99c6dbee6cc6904397c95c6256f8144d8fd",
    imports: Object.freeze([
      "./lib/bounded-json-writer.mjs",
      "./lib/established-native-current-origin.mjs",
      "./lib/authenticated-frozen584-predecessor.mjs",
      "./check-account-statistics-assistant-predecessor-source.mjs",
      "./lib/account-statistics-assistant-successor-source.mjs",
      "../js/core/ravscore-model-contract.js",
      "./rollback-assets/ravscore-model-contract.js",
      "./private-production-runtime-workflow.mjs",
      "./ravscore-continuation-checkpoint.mjs",
      "./migrate-post-cutover-private-runtime.mjs",
      "./protected-private-production-runtime.mjs"
    ]),
  }),
  "scripts/migrate-post-cutover-private-runtime.mjs": Object.freeze({
    sha256: "1b097d22f4102dc80f8d2c917dbaead896ceb3e7b8f364992d3422c4d010d9f6",
    imports: Object.freeze([
      "./private-production-runtime-workflow.mjs",
      "./lib/private-weather-component-inventory.mjs",
      "./lib/public-hour-delivery-pack.mjs",
      "./lib/rebind-public-hour-pack-exact.mjs",
      "./lib/private-conditions-hourly.mjs",
      "./public-conditions-lib.mjs",
      "../js/core/ravscore-public-runtime-contract.js",
      "./lib/coastal-point-staging-contract.mjs",
      "../js/core/ravscore-model-contract.js",
      "../js/core/ravscore-public-profile-contract.js",
      "../js/core/ravscore-integrated-state-pipeline.js",
      "../js/core/ravscore-integrated.js",
      "../js/core/ravscore-public-model.js",
      "./lib/ravscore-production-adapters.mjs",
      "./lib/ravscore-integrated-runtime.mjs",
      "./audit-ravscore-integrated-public-runtime.mjs",
      "./rollback-assets/ravscore-model-contract.js",
      "./runtime-binding-registry.mjs",
      "./lib/bounded-json-writer.mjs",
      "./lib/ravscore-production-part-pipeline.mjs",
      "./lib/dmi-marine-zone-exclusions.mjs",
      "./lib/bounded-conditions-predecessor-transition.mjs",
      "./private-production-runtime-bundle.mjs",
      "./protected-private-production-runtime.mjs",
      "./check-native-identity-frozen-i71-source.mjs"
    ]),
  }),
  "scripts/check-native-identity-frozen-i71-source.mjs": Object.freeze({
    sha256: "21f08e71ee3384b7e5d8a9294d356536ce0d866ffc562f7ecf94a4f547f35e77",
    imports: Object.freeze([]),
  }),
});
// Exact additive post585 variants for the final v2 snapshot/origin and
// fixed585 DATA-host. Every older table and rejection stays unchanged.
const POST585_REVIEWED = Object.freeze({
  "scripts/lib/established-native-current-origin.mjs": Object.freeze({
    sha256: "c3c52d867ed6b29c10986bc16f4052a1d639ef7ba508d0e20cad7be40110babc",
    imports: Object.freeze([
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
    sha256: "7a7e18b625a99c28dc8a3331d374e9d8fbbf19a64c8a323b1af99bfe1f60679e",
    imports: Object.freeze([
      "../check-source-producer-predecessor-source.mjs"
    ]),
  }),
  "scripts/check-source-producer-predecessor-source.mjs": Object.freeze({
    sha256: "17b3ce539b1f296fb75bf592fcd7393569f0dd3614974e6d7d06a836a0020922",
    imports: Object.freeze([]),
  }),
  "scripts/source-producer-runtime-transition.mjs": Object.freeze({
    sha256: "012d0c50b675bf8d2a4e0cd71ab51a78f19da3548d9647b18f7aeb554fee81f5",
    imports: Object.freeze([
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
// The fixed SOURCE code-only caller is an additive reviewed variant, never a
// repin of the genuine old585/SOURCE sources above. Its complete inverse is
// separately checked by the normal SOURCE prewrite regression.
const SOURCE_CODE_ONLY_REVIEWED = Object.freeze({
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
export function modelSourceRelativeModuleSpecifiers(source, file) {
  const variants = [REVIEWED, SOURCE_REVIEWED, POST585_REVIEWED, SOURCE_CODE_ONLY_REVIEWED]
    .filter(table => Object.hasOwn(table, file)).map(table => table[file]);
  if (variants.length === 0) return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  const reviewed = variants.find(value => value.sha256 === hash);
  if (!reviewed) throw new Error('Whole reviewed model import source changed: ' + file);
  return reviewed.imports;
}
