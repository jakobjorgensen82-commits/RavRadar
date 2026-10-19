// Explicit reviewed import inventories, never a scanner-error fallback.
// Whole hashes use the model builders' existing UTF-8/no-BOM/LF source form.
// A changed byte at one of these paths is rejected before any import choice.
import crypto from 'node:crypto';
import { exactRelativeModuleSpecifiers } from './static-module-closure.mjs';
const REVIEWED = Object.freeze({
  'scripts/lib/established-native-current-origin.mjs': Object.freeze({
    sha256: '2828947062b3fd0afa24eca48f8ee8f782c1b6b3287da3127be2aeccaf6b234d',
    imports: Object.freeze(['../protected-private-production-runtime.mjs', '../protected-ravscore-continuation-checkpoint.mjs',
      '../private-production-runtime-bundle.mjs', '../ravscore-continuation-checkpoint.mjs',
      '../private-production-runtime-workflow.mjs', '../../js/core/ravscore-model-contract.js',
      '../rollback-assets/ravscore-model-contract.js', '../../js/core/ravscore-model-bundle.generated.js',
      './ravscore-sampling-context.mjs', './coastal-point-staging-contract.mjs',
      './ravscore-candidate-g-rollback-runtime.mjs', './private-weather-component-pack.mjs',
      '../check-native-current-reanalysis-predecessor-source.mjs', './ravscore-production-part-pipeline.mjs',
      './weather-state-epoch-archive.mjs']),
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
export function modelSourceRelativeModuleSpecifiers(source, file) {
  if (!Object.hasOwn(REVIEWED, file)) return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const reviewed = REVIEWED[file];
  if (crypto.createHash('sha256').update(normalized).digest('hex') !== reviewed.sha256)
    throw new Error('Whole reviewed model import source changed: ' + file);
  return reviewed.imports;
}
