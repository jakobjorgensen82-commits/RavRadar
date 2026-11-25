import {ACTIVE_ASSISTANT_SUCCESSOR} from './assistant-later-h0-successor-source.mjs';
/** Shared inventory: standalone release gate always executes every listed test. */
export const RELEASE_GATE_TEST_FILES = Object.freeze([
  'scripts/test-source-validation-once.mjs',
  'scripts/test-public-learning-module-4.0.268.mjs',
  'scripts/test-public-score-explanations-4.0.269.mjs',
  'scripts/build-ravscore-model-bundle.mjs',
  'scripts/test-ravscore-model-bundle.mjs',
  'scripts/test-candidate-g-rollback-bundle.mjs',
  'scripts/test-ravscore-candidate-g-operational-rollback.mjs',
  'scripts/test-prepare-candidate-g-operational-rollback.mjs',
  'scripts/test-candidate-g-rollback-public-stage.mjs',
  'scripts/test-candidate-g-rollback-trip-backend.mjs',
  'scripts/test-candidate-g-rollback-assistant-local.mjs',
  'scripts/test-ravscore-operational-pages-deployment.mjs',
  'scripts/test-ravscore-operational-pages-recovery.mjs',
  'scripts/test-ravscore-active-explanation-presenter.mjs',
  'scripts/test-ravscore-operational-activation.mjs',
  'scripts/sync-ravscore-model-binding.mjs',
  'scripts/test-ravscore-integrated-model.mjs',
  'scripts/test-ravscore-integrated-state-pipeline.mjs',
  'scripts/test-ravscore-integrated-generator.mjs',
  'scripts/test-ravscore-public-model.mjs',
  'scripts/test-ravscore-public-runtime-contract.mjs',
  'scripts/test-ravscore-public-data-service-binding.mjs',
  'scripts/test-ravscore-profile-transition.mjs',
  'scripts/test-ravscore-continuation-checkpoint.mjs',
  'scripts/test-protected-ravscore-continuation-checkpoint.mjs',
  'scripts/build-checkpoint-rejection-diagnostic.mjs',
  'scripts/test-checkpoint-rejection-diagnostic.mjs',
  'scripts/build-checkpoint-candidate-diagnostic-successor.mjs',
  'scripts/test-checkpoint-candidate-diagnostic-successor.mjs',
  'scripts/build-checkpoint-candidate-companion-id-successor.mjs',
  'scripts/test-checkpoint-candidate-companion-id-successor.mjs',
  'scripts/test-private-production-runtime-bundle.mjs',
  'scripts/test-private-production-runtime-workflow.mjs',
  'scripts/test-public-hour-delivery-pack.mjs',
  'scripts/test-current-provenance-sealing.mjs',
  'scripts/test-pages-artifact-privacy.mjs',
  'scripts/test-production-workflow-outcome.mjs',
  'scripts/test-release-contract-metadata.mjs',
  'scripts/build-top20-display-binding-successor.mjs',
  'scripts/build-copernicus-child-close-binding-successor.mjs',
  'scripts/build-checkpoint-warmup-status-successor.mjs',
  'scripts/build-checkpoint-missing-state-successor.mjs',
  'scripts/test-harmonie-binding-migration.mjs',
  'scripts/test-open-meteo-binding-migration.mjs',
  'scripts/build-measured-rollback-warmup-binding-migration.mjs',
  'scripts/build-state-only-hold-closure-v2-binding-migration.mjs',
  'scripts/build-local-unavailable-cutover-binding-migration.mjs',
  'scripts/build-public-runtime-oracle-binding-migration.mjs',
  'scripts/build-h0-reference-recovery-binding-migration.mjs',
  'scripts/build-h0-state-snapshot-binding-migration.mjs',
  'scripts/build-post-cutover-current-hold-binding-migration.mjs',
  'scripts/build-valid-data-before-local-missing-binding-migration.mjs',
  'scripts/build-partial-zone-public-metadata-binding-migration.mjs',
  'scripts/build-last-mile-history-envelope-binding-migration.mjs',
  'scripts/build-measured-warmup-checkpoint-migration.mjs',
  'scripts/build-public-hour-delivery-binding-migration.mjs',
  'scripts/test-reusable-production-workflows.mjs',
  'scripts/test-hydrated-atomic-dataset-4.0.67.mjs',
  'scripts/test-hydrate-deployed-weather-fail-closed-4.0.272.mjs',
  'scripts/test-assistant-after597-fixed-generator.mjs',
  'scripts/test-assistant-after597-migration-prewrite.mjs',
  'scripts/test-assistant-after597-parent-profiles.mjs',
  'scripts/test-assistant-after597-runtime-origin.mjs',
  'scripts/test-assistant-after597-sync-binding.mjs',
]);

const AFTER598_CURRENT_TEST_FILES=Object.freeze([
  "scripts/test-assistant-after597-fixed-generator.mjs",
  "scripts/test-assistant-after597-migration-prewrite.mjs",
  "scripts/test-assistant-after597-parent-profiles.mjs",
  "scripts/test-assistant-after597-runtime-origin.mjs",
  "scripts/test-assistant-after597-sync-binding.mjs"
]);
const AFTER601_RELEASE_CHECKS=Object.freeze({
  'scripts/test-assistant-after597-fixed-generator.mjs':['scripts/build-assistant-later-h0-successor.mjs','--assistant-after601','--check'],
  'scripts/test-assistant-after597-migration-prewrite.mjs':['scripts/test-assistant-after597-migration-prewrite.mjs','--after601-plan'],
  'scripts/test-assistant-after597-parent-profiles.mjs':['scripts/test-assistant-after597-parent-profiles.mjs','--after601-predecessor'],
  'scripts/test-assistant-after597-runtime-origin.mjs':['scripts/test-assistant-after597-runtime-origin.mjs','--after601-origin'],
  'scripts/test-assistant-after597-sync-binding.mjs':['scripts/test-assistant-after597-sync-binding.mjs','--after601-setup'],
});
export function assistantAfter601SourceArguments(file){
  return Object.hasOwn(AFTER601_RELEASE_CHECKS,file)?[...AFTER601_RELEASE_CHECKS[file]]:undefined;
}
export const ASSISTANT_AFTER601_SOURCE_COMMANDS=Object.freeze(
  Object.values(AFTER601_RELEASE_CHECKS).map(args=>['node',...args].join(' ')),
);
export function releaseGateTestArguments(file){
  if(ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-after601-successor'){
    const args=assistantAfter601SourceArguments(file);
    if(args!==undefined)return args;
  }
  // Closed argv mapping: the generic checkpoint target remains NON-PG.
  if(AFTER598_CURRENT_TEST_FILES.includes(file)&&ACTIVE_ASSISTANT_SUCCESSOR.sourcePhase==='assistant-after599-successor')
    return [file,'--after599-current'];
  return AFTER598_CURRENT_TEST_FILES.includes(file)?[file,'--after598-current']:[file];
}
