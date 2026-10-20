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
export function modelSourceRelativeModuleSpecifiers(source, file) {
  if (!Object.hasOwn(REVIEWED, file)) return exactRelativeModuleSpecifiers(source, file);
  if (typeof source !== 'string') throw new Error('Reviewed model source must be a string');
  const normalized = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const reviewed = REVIEWED[file];
  if (crypto.createHash('sha256').update(normalized).digest('hex') !== reviewed.sha256)
    throw new Error('Whole reviewed model import source changed: ' + file);
  return reviewed.imports;
}
