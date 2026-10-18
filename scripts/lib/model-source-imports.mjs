// Explicit reviewed import inventories, never a scanner-error fallback.
// Whole hashes use the model builders' existing UTF-8/no-BOM/LF source form.
// A changed byte at one of these paths is rejected before any import choice.
import crypto from 'node:crypto';
import { exactRelativeModuleSpecifiers } from './static-module-closure.mjs';
const REVIEWED = Object.freeze({
  // Two additional immutable140000-family leaves. These inventories do not
  // authorize a new binding or retag the pre-paired-repair85 family to075.
  // Every computed module is loaded only from the helper's fixed Git host.
  'scripts/check-established-native-current-origin-predecessor-source.mjs': Object.freeze({
    sha256: 'cb2743d4c7caff798667c6eb61436d9bc662fb321c37e3844e52f4b70eabce69',
    imports: Object.freeze([]),
  }),
  'scripts/lib/authenticated-frozen140000-predecessor.mjs': Object.freeze({
    sha256: 'ae78ab5dfbf03ef9eba4b9955c10d2cc2c8cbb588703728da91c0ef9bbb52d73',
    imports: Object.freeze(['../check-established-native-current-origin-predecessor-source.mjs']),
  }),
  'scripts/lib/established-native-current-origin.mjs': Object.freeze({
    sha256: '056d88253e4975e424af6df2b4fcf5f029c9fae72b4ad90ead4f06bfad503b98',
    imports: Object.freeze(['../protected-private-production-runtime.mjs', '../protected-ravscore-continuation-checkpoint.mjs',
      '../private-production-runtime-bundle.mjs', '../ravscore-continuation-checkpoint.mjs',
      '../private-production-runtime-workflow.mjs', '../../js/core/ravscore-model-contract.js',
      '../rollback-assets/ravscore-model-contract.js', '../../js/core/ravscore-model-bundle.generated.js',
      './ravscore-sampling-context.mjs', './coastal-point-staging-contract.mjs',
      './ravscore-candidate-g-rollback-runtime.mjs', './private-weather-component-pack.mjs',
      '../check-native-current-reanalysis-predecessor-source.mjs', './ravscore-production-part-pipeline.mjs',
      './authenticated-frozen140000-predecessor.mjs']),
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
