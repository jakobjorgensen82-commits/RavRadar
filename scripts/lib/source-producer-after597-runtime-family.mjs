import {execFileSync} from 'node:child_process';
import {committedSourceFileIdentities} from './source-tree-content.mjs';
// Closed normal SOURCE597 caller family. No issuance or caller-selected binding.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as sourceCodeFs from 'node:fs';
import {sourceProducerAfter597DerivedMetadataFromText} from './source-producer-after597-derived-metadata.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {SOURCE_PRODUCER_AFTER597_PARENT,requireSourceProducerAfter597CodeParent,
  requireSourceProducerAfter597Binding,requireSourceProducerAfter597Output,readSourceProducerAfter597PredecessorCanonicalSource}
  from './source-producer-after597-parent.mjs';
import {assistantLaterH0Definition as definition} from './assistant-later-h0-successor-source.mjs';
import {resolveProductionReferenceTime} from './production-reference-time.mjs';
export const SOURCE_PRODUCER_BEFORE=SOURCE_PRODUCER_AFTER597_PARENT.before;
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),CP='ravradar_ravscore_checkpoint_';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const once=(source,before,after)=>{assert.equal(source.split(before).length,2);return source.replace(before,()=>after);};
export const SOURCE_PRODUCER_ALIASES=Object.freeze([
  Object.freeze({name:CP+'source598_state_valid',signature:'(jsonb,text)'}),
  Object.freeze({name:CP+'source598_payload_valid',signature:'(jsonb,timestamptz)'}),
  Object.freeze({name:CP+'source598_same_h0_projection',signature:'(jsonb,timestamptz)'}),
]);
const replacements=Object.freeze([CP+'integrated_state_valid',CP+'payload_valid',CP+'integrated_state_reason',CP+'payload_reason',
  CP+'predecessor_payload_valid','ravradar_trip_v3_binding_allowed',CP+'cas',CP+'contract']);
const labels=Object.freeze(['source-original598-state-validator','source-original598-payload-validator','source598-same-h0-projection']);
export const SOURCE_PRODUCER_AFTER597_CODE_FILES = Object.freeze([
  ".github/actions/save-owned-dmi-grib/action.yml",
  ".github/actions/save-owned-dmi-grib/index.cjs",
  ".github/actions/save-owned-dmi-grib/package-lock.json",
  ".github/actions/save-owned-dmi-grib/package.json",
  ".github/workflows/deploy-code-only-repair.yml",
  ".github/workflows/reusable-operational-reentry.yml",
  ".github/workflows/reusable-pages-deploy.yml",
  ".github/workflows/reusable-weather-build.yml",
  ".github/workflows/run-current-weather-once.yml",
  ".github/workflows/update-and-deploy.yml",
  "app.js",
  "bootstrap.js",
  "config.js",
  "js/core/about-home-return.js",
  "js/core/adaptive-model.js",
  "js/core/best-time-policy.js",
  "js/core/best-time-selector.js",
  "js/core/coastal-process-model.js",
  "js/core/coastline-editor-model.js",
  "js/core/current-direction-audit.js",
  "js/core/debug-trace.js",
  "js/core/direction-anchors.js",
  "js/core/forecast-calendar.js",
  "js/core/local-zone-score.js",
  "js/core/phase-d-process-candidate.js",
  "js/core/phase-d-wave-process-candidate.js",
  "js/core/public-delivery-contract.js",
  "js/core/public-page-resume.js",
  "js/core/ravscore-candidate-g-state-pipeline.js",
  "js/core/ravscore-candidate-g.js",
  "js/core/ravscore-current-supply-memory.js",
  "js/core/ravscore-evidence-trust-contract.js",
  "js/core/ravscore-huntability.js",
  "js/core/ravscore-integrated-explanation-presenter.js",
  "js/core/ravscore-integrated-state-pipeline.js",
  "js/core/ravscore-integrated.js",
  "js/core/ravscore-mobilisation-memory.js",
  "js/core/ravscore-model-bundle.generated.js",
  "js/core/ravscore-model-contract.js",
  "js/core/ravscore-profile-switch.js",
  "js/core/ravscore-public-model.js",
  "js/core/ravscore-public-profile-contract.js",
  "js/core/ravscore-public-runtime-contract.js",
  "js/core/ravscore-public-weather-source-age.js",
  "js/core/ravscore-regime-memory.js",
  "js/core/ravscore-time.js",
  "js/core/ravscore-wave-approach-state.js",
  "js/core/ravscore-wave-mobilisation-state.js",
  "js/core/rule-engine.js",
  "js/core/score-engine.js",
  "js/core/score-presentation.js",
  "js/core/water-station-routing.js",
  "js/core/wave-approach.js",
  "js/core/zone-ranking.js",
  "js/i18n.js",
  "js/map/current-arrow-land-mask.js",
  "js/map/map-view.js",
  "js/map/public-coast-projection.js",
  "js/services/account-trip-report-contract.js",
  "js/services/admin-account-categories.js",
  "js/services/admin-document-store.js",
  "js/services/admin-trip-count.js",
  "js/services/app-update-flow.js",
  "js/services/auth-service.js",
  "js/services/calibration-eligibility.js",
  "js/services/data-service.js",
  "js/services/forecast-share-contract.js",
  "js/services/forecast-share-projection.js",
  "js/services/handbook-review-store.js",
  "js/services/historical-analysis.js",
  "js/services/html-sanitizer.js",
  "js/services/learning-analysis.js",
  "js/services/map-forecast-view.js",
  "js/services/observation-service.js",
  "js/services/own-trip-export.js",
  "js/services/permissions-service.js",
  "js/services/persistence-test-service.js",
  "js/services/plain-map-hour.js",
  "js/services/private-trip-study.js",
  "js/services/protected-runtime-envelope.js",
  "js/services/public-delivery-transport-binding.js",
  "js/services/public-json-transport.js",
  "js/services/rav-assistant.js",
  "js/services/site-function-test-service.js",
  "js/services/storage-safety.js",
  "js/services/trip-evidence-contract.js",
  "js/services/trip-evidence-controller.js",
  "js/services/trip-evidence-public-adapter.js",
  "js/services/trip-evidence-runtime.js",
  "js/services/trip-evidence-store.js",
  "js/services/trip-evidence-upload.js",
  "js/services/vendor/fflate-0.8.2/browser.js",
  "js/services/visit-counter.js",
  "js/services/visitor-report-service.js",
  "js/services/zone-hour-preview.js",
  "js/services/zone-registry.js",
  "js/ui/account-panel.js",
  "js/ui/admin-active-ravscore.js",
  "js/ui/admin-coastline-editor.js",
  "js/ui/admin-dashboard.js",
  "js/ui/admin-direction-editor.js",
  "js/ui/admin-private-trip-study.js",
  "js/ui/developer-panel.js",
  "js/ui/forecast-share.js",
  "js/ui/info-panel.js",
  "js/ui/map-tab-copy.js",
  "js/ui/map-timeline-copy.js",
  "js/ui/map-timeline.js",
  "js/ui/ranking-copy.js",
  "js/ui/score-prognosis-copy.js",
  "js/ui/site-search-copy.js",
  "js/ui/trip-evidence-dialog.js",
  "knowledge/rav-assistant-local-v2.js",
  "knowledge/rav-assistant-research-coast-v1.js",
  "knowledge/rav-assistant-research-material-v1.js",
  "knowledge/rav-assistant-research-v1.js",
  "knowledge/rav-assistant-sources-v1.js",
  "package.json",
  "scripts/account-statistics-assistant-prewrite.mjs",
  "scripts/account-statistics-assistant-runtime-transition.mjs",
  "scripts/acquire-code-only-public-snapshot.mjs",
  "scripts/apply-central-zone-reviews.py",
  "scripts/archived-weather-restart.mjs",
  "scripts/assistant-later-h0-runtime-transition.mjs",
  "scripts/audit-online-browser-4.0.238.py",
  "scripts/audit-p1-component-matrix.py",
  "scripts/audit-ravscore-integrated-public-runtime.mjs",
  "scripts/audit-zone-geometry-4.0.33.mjs",
  "scripts/build-candidate-g-rollback-bundle.mjs",
  "scripts/build-copernicus-target-registry.py",
  "scripts/build-current-arrow-land-mask.mjs",
  "scripts/build-current-operational-closure.py",
  "scripts/build-forecast-share-projection.mjs",
  "scripts/build-live-current-pilot.py",
  "scripts/build-public-coastal-parts-v2.mjs",
  "scripts/build-ravscore-model-bundle.mjs",
  "scripts/build-source-producer-successor.mjs",
  "scripts/build-statistics-preference-revision.mjs",
  "scripts/build-weather-acquisition-plan.py",
  "scripts/check-account-statistics-assistant-predecessor-source.mjs",
  "scripts/check-assistant-later-h0-predecessor-source.mjs",
  "scripts/check-copernicus-current-range.py",
  "scripts/check-dmi-bulk-operational-ready.py",
  "scripts/check-last-mile-enclosure-predecessor-source.mjs",
  "scripts/check-native-current-reanalysis-predecessor-source.mjs",
  "scripts/check-native-identity-frozen-i71-source.mjs",
  "scripts/check-native-original-continuity-predecessor-source.mjs",
  "scripts/check-production-target-freshness.mjs",
  "scripts/check-public-weather-continuity.mjs",
  "scripts/check-weather-update.py",
  "scripts/completed-private-runtime-admission.mjs",
  "scripts/current-family-cold-start.mjs",
  "scripts/enrich-current-provenance.mjs",
  "scripts/fill-open-meteo-current-fallback.py",
  "scripts/generate-public-conditions.mjs",
  "scripts/generate-state-reference-report-4.0.113.mjs",
  "scripts/github-pages-attempt-evidence.mjs",
  "scripts/integrated-cutover-readiness.mjs",
  "scripts/lib/account-assistant-successor-source.mjs",
  "scripts/lib/account-statistics-assistant-successor-source.mjs",
  "scripts/lib/archived-weather-restart-input-view.mjs",
  "scripts/lib/archived-weather-restart-updater-test-input.json",
  "scripts/lib/archived-weather-restart-updater-test-input.mjs",
  "scripts/lib/assistant-later-h0-successor-source.mjs",
  "scripts/lib/assistant-public591-runtime-contracts.mjs",
  "scripts/lib/authenticated-frozen584-predecessor.mjs",
  "scripts/lib/authenticated-frozen585-predecessor.mjs",
  "scripts/lib/authenticated-frozen586-predecessor.mjs",
  "scripts/lib/bounded-conditions-predecessor-transition.mjs",
  "scripts/lib/bounded-fetch.mjs",
  "scripts/lib/bounded-json-writer.mjs",
  "scripts/lib/coastal-point-stage-dmi-adapter.mjs",
  "scripts/lib/coastal-point-staging-contract.mjs",
  "scripts/lib/coastal_point_staging.py",
  "scripts/lib/coherent-current-original-bootstrap.mjs",
  "scripts/lib/coherent-original-source-views.mjs",
  "scripts/lib/copernicus-component-index.mjs",
  "scripts/lib/copernicus-component-projection.mjs",
  "scripts/lib/copernicus-component-runtime.mjs",
  "scripts/lib/copernicus-component-spatial-policy.json",
  "scripts/lib/copernicus-offline-environment.mjs",
  "scripts/lib/copernicus_component_process.py",
  "scripts/lib/copernicus_component_spatial.py",
  "scripts/lib/copernicus_component_transport.py",
  "scripts/lib/copernicus_current.py",
  "scripts/lib/copernicus_current_donor_bank.py",
  "scripts/lib/copernicus_current_segment_journal.py",
  "scripts/lib/copernicus_current_source_stage.py",
  "scripts/lib/copernicus_target_identity.py",
  "scripts/lib/copernicus_weather_component_bank.py",
  "scripts/lib/copernicus_weather_components.py",
  "scripts/lib/current-grid-successor-source.mjs",
  "scripts/lib/current-memory-warmup-successor-source.mjs",
  "scripts/lib/current-spatial-runtime-proof.mjs",
  "scripts/lib/current-transport-history.mjs",
  "scripts/lib/current_aged_dmi_challenge.py",
  "scripts/lib/current_field_shadow.py",
  "scripts/lib/current_model_reference.py",
  "scripts/lib/current_operational_closure.py",
  "scripts/lib/data-quality.mjs",
  "scripts/lib/dmi-acquisition-state.mjs",
  "scripts/lib/dmi-bulk-storage.mjs",
  "scripts/lib/dmi-forecast-file.mjs",
  "scripts/lib/dmi-forecast-store.mjs",
  "scripts/lib/dmi-legacy-current-originals.mjs",
  "scripts/lib/dmi-marine-run-seam-recovery.mjs",
  "scripts/lib/dmi-marine-zone-exclusions.json",
  "scripts/lib/dmi-marine-zone-exclusions.mjs",
  "scripts/lib/dmi-native-current-runtime-projection.mjs",
  "scripts/lib/dmi-part-continuity.mjs",
  "scripts/lib/dmi-wave-tuple-proof.mjs",
  "scripts/lib/dmi_adaptive_recovery.py",
  "scripts/lib/dmi_bulk_storage.py",
  "scripts/lib/dmi_cache_migration.py",
  "scripts/lib/dmi_current_processing_compatibility.py",
  "scripts/lib/dmi_grid_vector.py",
  "scripts/lib/dmi_legacy_current_originals.py",
  "scripts/lib/dmi_legacy_current_recovery.py",
  "scripts/lib/dmi_native_provenance.py",
  "scripts/lib/dmi_wave_history_bootstrap.py",
  "scripts/lib/dmi_wave_owner.py",
  "scripts/lib/dmi_wind_reference.py",
  "scripts/lib/established-native-current-origin-successor-source.mjs",
  "scripts/lib/established-native-current-origin.mjs",
  "scripts/lib/feggesund-wave-proxy.mjs",
  "scripts/lib/flow-points-from-forecast-record.mjs",
  "scripts/lib/fur-water-routing-diagnostic.mjs",
  "scripts/lib/historical-wave-input-transition.mjs",
  "scripts/lib/last-mile-enclosure-predecessor-source-inventory.json",
  "scripts/lib/last-mile-enclosure-successor-source.mjs",
  "scripts/lib/lf7-fur-consumer-observation.mjs",
  "scripts/lib/live-current-pilot.mjs",
  "scripts/lib/local-current-reference.mjs",
  "scripts/lib/local-part-runtime.mjs",
  "scripts/lib/model-source-imports.mjs",
  "scripts/lib/native-identity-staging-working-copy.mjs",
  "scripts/lib/native-original-continuity-successor-source.mjs",
  "scripts/lib/native-sampling-identity-successor-source.mjs",
  "scripts/lib/native0600-original-successor-source.mjs",
  "scripts/lib/open-meteo-forecast-window.mjs",
  "scripts/lib/open-meteo-hourly-components.mjs",
  "scripts/lib/open-meteo-o1280-grid.mjs",
  "scripts/lib/open-meteo-part-bank.mjs",
  "scripts/lib/open-meteo-part-runtime.mjs",
  "scripts/lib/open-meteo-usable-part-bank.mjs",
  "scripts/lib/open_meteo_current_fallback.py",
  "scripts/lib/post-h0-dmi-original-dependencies.mjs",
  "scripts/lib/private-conditions-hourly.mjs",
  "scripts/lib/private-dmi-recovery-record.mjs",
  "scripts/lib/private-weather-component-inventory.mjs",
  "scripts/lib/private-weather-component-pack.mjs",
  "scripts/lib/private-weather-progress-files.mjs",
  "scripts/lib/private-weather-storage-abi.json",
  "scripts/lib/production-reference-time.mjs",
  "scripts/lib/production-workflow-sources.mjs",
  "scripts/lib/protected-dmi-current-context.mjs",
  "scripts/lib/protected-dmi-native-current-proofs.mjs",
  "scripts/lib/protected-live-current-assembly.mjs",
  "scripts/lib/prove-cached-coherent-current-originals.mjs",
  "scripts/lib/public-bulk-details-archive.mjs",
  "scripts/lib/public-cold-hour-transport.mjs",
  "scripts/lib/public-delivery-json-transport.mjs",
  "scripts/lib/public-delivery-nested-binding.mjs",
  "scripts/lib/public-hour-delivery-pack.mjs",
  "scripts/lib/public-map-hour-pages.mjs",
  "scripts/lib/public-map-hour-projection.mjs",
  "scripts/lib/r2-private-runtime-storage.mjs",
  "scripts/lib/ravscore-candidate-g-rollback-runtime.mjs",
  "scripts/lib/ravscore-continuation-implementation-contract.mjs",
  "scripts/lib/ravscore-initial-current-window-audit.mjs",
  "scripts/lib/ravscore-integrated-runtime.mjs",
  "scripts/lib/ravscore-known-public-source-repair.mjs",
  "scripts/lib/ravscore-legacy-candidate-g-source.mjs",
  "scripts/lib/ravscore-operational-state-readiness.mjs",
  "scripts/lib/ravscore-production-adapters.mjs",
  "scripts/lib/ravscore-production-part-pipeline.mjs",
  "scripts/lib/ravscore-profile-transition.mjs",
  "scripts/lib/ravscore-public-browser-closure.mjs",
  "scripts/lib/ravscore-recovery-replay.mjs",
  "scripts/lib/ravscore-recovery-source-priority.mjs",
  "scripts/lib/ravscore-sampling-context.mjs",
  "scripts/lib/rebind-public-hour-pack-exact.mjs",
  "scripts/lib/regional_current_operational.py",
  "scripts/lib/regional_source_proofs.py",
  "scripts/lib/release-contract-metadata.mjs",
  "scripts/lib/reproject-coherent-current-originals.mjs",
  "scripts/lib/saved-current-forward-original-plan.mjs",
  "scripts/lib/saved-current-replay-grid-audit.mjs",
  "scripts/lib/saved-dmi-original-capture.mjs",
  "scripts/lib/saved-dmi-original-dependencies.mjs",
  "scripts/lib/source-artifact-distribution-review.mjs",
  "scripts/lib/source-completed-public-pages-occurrence.mjs",
  "scripts/lib/source-completed-stage-artifact-identity.mjs",
  "scripts/lib/source-completed-stage-occurrence.mjs",
  "scripts/lib/source-integrated-publication-receipt.mjs",
  "scripts/lib/source-producer-after597-binding.generated.json",
  "scripts/lib/source-producer-after597-derived-metadata.mjs",
  "scripts/lib/source-producer-after597-parent.mjs",
  "scripts/lib/source-producer-after597-runtime-family.mjs",
  "scripts/lib/source-producer-binding.generated.json",
  "scripts/lib/source-producer-derived-metadata.mjs",
  "scripts/lib/source-producer-successor-source.mjs",
  "scripts/lib/source-saved-pair-pages-proof.mjs",
  "scripts/lib/source-tree-content.mjs",
  "scripts/lib/source-union-birth-journal.mjs",
  "scripts/lib/source_union_birth_journal.py",
  "scripts/lib/static-module-closure.mjs",
  "scripts/lib/supabase-admin-rest.mjs",
  "scripts/lib/trip-storage-edge-readiness.mjs",
  "scripts/lib/verified-dmi-progress-inputs.mjs",
  "scripts/lib/verified-open-meteo-generation-union.mjs",
  "scripts/lib/verified-protected-progress-components.mjs",
  "scripts/lib/verified-weather-deployment-terminal.mjs",
  "scripts/lib/water-level-continuity.mjs",
  "scripts/lib/water-source-continuity-contract.mjs",
  "scripts/lib/water-source-forecast-routing.mjs",
  "scripts/lib/water-station-routing-alerts.mjs",
  "scripts/lib/weather-acquisition-writer.mjs",
  "scripts/lib/weather-component-needs.mjs",
  "scripts/lib/weather-component-runtime.mjs",
  "scripts/lib/weather-component-safe-summary.mjs",
  "scripts/lib/weather-component-selection-history.mjs",
  "scripts/lib/weather-component-selection.mjs",
  "scripts/lib/weather-history-retention.mjs",
  "scripts/lib/weather-reserve-admission.mjs",
  "scripts/lib/weather-source-gate.mjs",
  "scripts/lib/weather-state-epoch-archive.mjs",
  "scripts/lib/weather-state-epoch-input-view.mjs",
  "scripts/lib/weather-transport-settlement.mjs",
  "scripts/lib/weather_acquisition_plan.py",
  "scripts/local-weather-snapshot-status.mjs",
  "scripts/materialize-dmi-bulk-storage.py",
  "scripts/merge-verified-current-donor-banks.py",
  "scripts/migrate-post-cutover-private-runtime.mjs",
  "scripts/native-sampling-identity-successor-readiness.mjs",
  "scripts/plan-dmi-legacy-current-originals.mjs",
  "scripts/plan-dmi-recovery.py",
  "scripts/plan-ravscore-current-history.mjs",
  "scripts/prepare-cached-coherent-current-work.mjs",
  "scripts/prepare-candidate-g-operational-rollback.mjs",
  "scripts/prepare-coastal-point-activation.mjs",
  "scripts/private-production-runtime-bundle.mjs",
  "scripts/private-production-runtime-workflow.mjs",
  "scripts/private-runtime-second-restore-expectation.mjs",
  "scripts/produce-open-meteo-part-components.mjs",
  "scripts/production-workflow-outcome.mjs",
  "scripts/promote-coastal-point-activation.py",
  "scripts/protected-operational-reentry-evidence.mjs",
  "scripts/protected-private-production-runtime.mjs",
  "scripts/protected-ravscore-continuation-checkpoint.mjs",
  "scripts/public-conditions-lib.mjs",
  "scripts/ravscore-continuation-checkpoint.mjs",
  "scripts/ravscore-operational-activation.mjs",
  "scripts/ravscore-operational-pages-recovery.mjs",
  "scripts/read-authenticated-dmi-current-companions.mjs",
  "scripts/reconcile-private-runtime-checkpoint.mjs",
  "scripts/reconcile-source-producer-code-only.mjs",
  "scripts/refine-coastlines-constrained-4.0.48.py",
  "scripts/rollback-assets/ravscore-model-bundle.generated.js",
  "scripts/rollback-assets/ravscore-model-contract.js",
  "scripts/run-copernicus-current-pilot-with-retry.py",
  "scripts/run-copernicus-current-pilot.py",
  "scripts/run-copernicus-weather-components.py",
  "scripts/run-dmi-bulk-supervised.py",
  "scripts/run-owned-dmi-grib-save.py",
  "scripts/run-validation-collection.mjs",
  "scripts/runtime-binding-registry.mjs",
  "scripts/seal-ravscore-public-browser-closure.mjs",
  "scripts/select-automatic-source-saved-weather.mjs",
  "scripts/select-native-original-continuity-code-only-source.mjs",
  "scripts/select-source-producer-code-only-source.mjs",
  "scripts/source-normal-producer-entry.mjs",
  "scripts/source-normal-producer-tail.mjs",
  "scripts/source-post-pages-integrated-reentry.mjs",
  "scripts/source-producer-prewrite.mjs",
  "scripts/source-producer-runtime-transition.mjs",
  "scripts/source-progress-union-consumer.mjs",
  "scripts/stage-source-producer-originals.mjs",
  "scripts/staged-private-production-runtime.mjs",
  "scripts/sync-admin-config.py",
  "scripts/sync-ravscore-model-binding.mjs",
  "scripts/sync-release-contract-metadata.mjs",
  "scripts/test-admin-config-production-contract-4.0.94.mjs",
  "scripts/test-best-time-consistency-4.0.72.mjs",
  "scripts/test-current-arrow-land-mask.mjs",
  "scripts/test-current-direction-audit-4.0.66.mjs",
  "scripts/test-current-full-coverage-gate-4.0.232.mjs",
  "scripts/test-current-history-provenance-retention-4.0.217.mjs",
  "scripts/test-current-provenance-null-safety-4.0.78.mjs",
  "scripts/test-current-provenance-sealing.mjs",
  "scripts/test-current-provenance-vector-consistency-4.0.85.mjs",
  "scripts/test-current-spatial-scientific-audit-4.0.76.mjs",
  "scripts/test-current-transport-history-4.0.115.mjs",
  "scripts/test-data-quality.mjs",
  "scripts/test-dmi-vector-grid-integrity-4.0.116.py",
  "scripts/test-flow-arrow-runtime-4.0.87.mjs",
  "scripts/test-forecast-integrity-4.0.17.mjs",
  "scripts/test-fresh-startup-4.0.66.mjs",
  "scripts/test-helpers/dmi-water-source-fixture.mjs",
  "scripts/test-hydrated-retired-zone-pruning-4.0.65.mjs",
  "scripts/test-ios-about-history-return-4.0.301.mjs",
  "scripts/test-local-part-direction-isolation-4.0.233.mjs",
  "scripts/test-local-part-map-4.0.185.mjs",
  "scripts/test-local-weather-snapshot-status-4.0.208.mjs",
  "scripts/test-local-zone-explanation-4.0.184.mjs",
  "scripts/test-main-zone-boundaries-4.0.183.mjs",
  "scripts/test-map-arrow-zoom-density-4.0.228.mjs",
  "scripts/test-map-tile-seams-4.0.305.mjs",
  "scripts/test-map-zoom-refresh-4.0.88.mjs",
  "scripts/test-missing-weather-null-safety-4.0.116.mjs",
  "scripts/test-mobile-start-and-live-cache-4.0.74.mjs",
  "scripts/test-progressive-public-conditions-4.0.216.mjs",
  "scripts/test-public-cold-start-4.0.303.mjs",
  "scripts/test-public-fallback-startup-4.0.296.mjs",
  "scripts/test-public-hour-delivery-pack.mjs",
  "scripts/test-public-load-performance-4.0.295.mjs",
  "scripts/test-public-local-display-consistency-4.0.235.mjs",
  "scripts/test-public-nonblocking-forecast-4.0.83.mjs",
  "scripts/test-public-page-resume-4.0.292.mjs",
  "scripts/test-public-runtime-4.0.74.mjs",
  "scripts/test-public-runtime-pipeline-4.0.75.mjs",
  "scripts/test-public-score-explanations-4.0.269.mjs",
  "scripts/test-public-search-pages.mjs",
  "scripts/test-public-startup-order-4.0.80.mjs",
  "scripts/test-release-integrity-4.0.73.mjs",
  "scripts/test-score-presentation-4.0.45.mjs",
  "scripts/test-site-function-suite-4.0.70.mjs",
  "scripts/test-state-reference-report-4.0.113.mjs",
  "scripts/test-water-source-production-chain-4.0.103.mjs",
  "scripts/test-water-station-active-routing-display-4.0.102.mjs",
  "scripts/test-weather-history-retention-4.0.209.mjs",
  "scripts/test-zone-admin-propagation-4.0.89.mjs",
  "scripts/test-zone-deletion-runtime-4.0.91.mjs",
  "scripts/update-coastal-point-staging.mjs",
  "scripts/update-dmi-bulk.py",
  "scripts/update-water-source-registry.mjs",
  "scripts/update-weather.mjs",
  "scripts/validate-coastlines.mjs",
  "scripts/validate-data.mjs",
  "scripts/validate-release-version.mjs",
  "scripts/validate-weather-health.mjs",
  "scripts/validate-zone-plan.mjs",
  "scripts/verified-weather-source-handoff.mjs",
  "scripts/verify-account-assistant-schema.mjs",
  "scripts/verify-cloudflare-trip-gateway.mjs",
  "scripts/verify-legacy-candidate-g-source.mjs",
  "scripts/verify-native-sampling-identity-successor-plan.mjs",
  "scripts/verify-ravscore-operational-pages-deployment.mjs",
  "scripts/verify-source-producer-plan.mjs",
  "scripts/verify-trip-storage-edge.mjs",
  "scripts/weather-component-progress-cache.mjs",
  "scripts/weather-operational-control-summary.mjs",
  "scripts/weather-state-epoch-budget.mjs",
  "scripts/weather-state-epoch.mjs",
  "scripts/zone-registry-integrity.mjs",
  "service-worker.js",
  "supabase/functions/_shared/trip-storage-contract-probe.js",
  "supabase/functions/_shared/trip-storage.js"
]);
// Fixed CODE fingerprints are DATA bound by the normal integrated manifest.
// They issue no family, session, lease, process witness, SAVE or publication.
export const SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH = 'scripts/lib/source-producer-after597-code-pins.generated.json';
const SOURCE_CODE_PIN_SCHEMA = 'source-producer-after597-code-pins-v1';
const SOURCE_CODE_SPECIAL_FILES = Object.freeze([
  'js/core/ravscore-model-bundle.generated.js',
  'scripts/rollback-assets/ravscore-model-bundle.generated.js',
  'scripts/lib/source-producer-after597-binding.generated.json',
]);
export const SOURCE_PRODUCER_AFTER597_RAW_CODE_FILES = Object.freeze(
  SOURCE_PRODUCER_AFTER597_CODE_FILES.filter(file => !SOURCE_CODE_SPECIAL_FILES.includes(file)));
const sourceCodeUnclosedReads = new Set();
let sourceCodeFirstUnclosed = null;
const codeRefused = () => { throw Object.assign(new Error('SOURCE_AFTER597_CODE_INPUT_REFUSED'),
  {code:'SOURCE_AFTER597_CODE_INPUT_REFUSED'}); };
function codeNeed(value) { if (!value) codeRefused(); }
function codeShape(value, keys) {
  codeNeed(value && Object.getPrototypeOf(value) === Object.prototype);
  codeNeed(Reflect.ownKeys(value).join(',') === keys.join(','));
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value,key);
    codeNeed(descriptor && descriptor.enumerable && Object.hasOwn(descriptor,'value'));
  }
}
function sameCodeStat(left,right) {
  return ['dev','ino','mode','nlink','size','mtimeNs','ctimeNs'].every(key=>left[key]===right[key]);
}
function readSourceCodeFile(relative, expected, checkClock, collect=false, maximum=8*1024*1024) {
  if (sourceCodeFirstUnclosed !== null) throw sourceCodeFirstUnclosed.raw;
  const tick = () => { if (checkClock !== undefined) checkClock(); };
  tick();
  const file=path.join(ROOT,relative);
  let at=path.parse(file).root;
  for (const part of path.relative(at,path.dirname(file)).split(path.sep).filter(Boolean)) {
    tick(); at=path.join(at,part);
    const parent=sourceCodeFs.lstatSync(at,{bigint:true});
    codeNeed(parent.isDirectory()&&!parent.isSymbolicLink()&&sourceCodeFs.realpathSync(at)===at);
  }
  const named=sourceCodeFs.lstatSync(file,{bigint:true});
  codeNeed(named.isFile()&&!named.isSymbolicLink()&&named.nlink===1n&&(named.mode&0o111n)===0n
    &&named.size>=0n&&named.size<=BigInt(maximum)&&sourceCodeFs.realpathSync(file)===file);
  if (expected) codeNeed(named.size===BigInt(expected.bytes));
  const row={file,descriptor:null,closed:false,closeFailure:null};
  let first=null,result;
  try {
    tick();
    row.descriptor=sourceCodeFs.openSync(file,sourceCodeFs.constants.O_RDONLY|sourceCodeFs.constants.O_NOFOLLOW|sourceCodeFs.constants.O_NONBLOCK);
    sourceCodeUnclosedReads.add(row);
    const opened=sourceCodeFs.fstatSync(row.descriptor,{bigint:true});
    codeNeed(sameCodeStat(opened,named));
    const digest=crypto.createHash('sha256'),chunk=Buffer.alloc(64*1024),pieces=[];
    let total=0;const size=Number(named.size);
    while(total<size) {
      tick();
      const read=sourceCodeFs.readSync(row.descriptor,chunk,0,Math.min(chunk.length,size-total),total);
      codeNeed(read>0);digest.update(chunk.subarray(0,read));
      if(collect)pieces.push(Buffer.from(chunk.subarray(0,read)));
      total+=read;tick();
    }
    tick();codeNeed(sourceCodeFs.readSync(row.descriptor,chunk,0,1,total)===0);
    const hash=digest.digest('hex');
    codeNeed(!expected||hash===expected.sha256);
    codeNeed(sameCodeStat(opened,sourceCodeFs.fstatSync(row.descriptor,{bigint:true}))
      &&sameCodeStat(opened,sourceCodeFs.lstatSync(file,{bigint:true})));
    result={bytes:total,sha256:hash,...(collect?{content:Buffer.concat(pieces)}:{})};
  } catch(raw) { first={raw}; }
  if(row.descriptor!==null) {
    try {
      sourceCodeFs.closeSync(row.descriptor);
      let proved=false;
      try { sourceCodeFs.fstatSync(row.descriptor); }
      catch(error) { if(error?.code==='EBADF')proved=true;else throw error; }
      codeNeed(proved);row.closed=true;sourceCodeUnclosedReads.delete(row);
    } catch(raw) {
      row.closeFailure??={raw};
      sourceCodeFirstUnclosed??=first??{raw};
      first??={raw}; // retain the first actual value and the unclosed descriptor.
    }
  }
  if(first)throw first.raw;
  tick();return result;
}
function codeUtf8(row) {
  const text=row.content.toString('utf8');
  codeNeed(Buffer.from(text,'utf8').equals(row.content)&&!text.startsWith('\uFEFF')&&!text.includes('\r'));
  return text;
}
export function sourceProducerAfter597CodePinsFromText(text) {
  codeNeed(arguments.length===1&&typeof text==='string');
  const value=JSON.parse(text);codeShape(value,['schemaVersion','files']);
  codeNeed(value.schemaVersion===SOURCE_CODE_PIN_SCHEMA);
  if(value.files!==null) {
    codeNeed(Array.isArray(value.files)&&value.files.length===SOURCE_PRODUCER_AFTER597_RAW_CODE_FILES.length);
    for(let index=0;index<value.files.length;index++) {
      const row=value.files[index];codeShape(row,['path','bytes','sha256']);
      codeNeed(row.path===SOURCE_PRODUCER_AFTER597_RAW_CODE_FILES[index]
        &&Number.isSafeInteger(row.bytes)&&row.bytes>=0&&row.bytes<=8*1024*1024
        &&typeof row.sha256==='string'&&/^[a-f0-9]{64}$/.test(row.sha256));
      Object.freeze(row);
    }
    Object.freeze(value.files);
  }
  codeNeed(JSON.stringify(value,null,2)+'\n'===text);return Object.freeze(value);
}
export function computeSourceProducerAfter597CodePins() {
  requireSourceProducerAfter597CodeParent(); // genuine CODE only; never data/runtime admission.
  assert.equal(arguments.length,0);
  const legacy=JSON.parse(codeUtf8(readSourceCodeFile('scripts/lib/source-producer-binding.generated.json',null,undefined,true,8192)));
  codeShape(legacy,['schemaVersion','version','binding','output']);
  codeNeed(legacy.schemaVersion==='source-producer-derived-metadata-v1'
    &&legacy.version===null&&legacy.binding===null&&legacy.output===null);
  const files=SOURCE_PRODUCER_AFTER597_RAW_CODE_FILES.map(file=>{
    const row=readSourceCodeFile(file,null,undefined);
    return {path:file,bytes:row.bytes,sha256:row.sha256};
  });
  return sourceProducerAfter597CodePinsFromText(JSON.stringify({schemaVersion:SOURCE_CODE_PIN_SCHEMA,files},null,2)+'\n');
}
export function assertSourceProducerAfter597CodePinsPrepared() {
  requireSourceProducerAfter597CodeParent();assert.equal(arguments.length,0);
  const physical=readSourceCodeFile(SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH,null,undefined,true,256*1024);
  const value=sourceProducerAfter597CodePinsFromText(codeUtf8(physical));
  codeNeed(value.files!==null);
  assert.deepEqual(value,computeSourceProducerAfter597CodePins(),'SOURCE_AFTER597_FRESH_NORMAL_CODE_PINS_REQUIRED');
  return value;
}
function codeCanonical(value) {
  return Array.isArray(value)?value.map(codeCanonical):value&&typeof value==='object'
    ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,codeCanonical(value[key])])):value;
}
export function sourceProducerAfter597ManifestFromText(text,kind,bundleHash) {
  codeNeed(arguments.length===3&&typeof text==='string'&&['C','I'].includes(kind)
    &&/^[a-f0-9]{64}$/.test(bundleHash));
  const lines=text.split('\n');
  const header=kind==='I'?'// Generated by scripts/build-ravscore-model-bundle.mjs. Do not edit manually.'
    :'// Generated by scripts/build-candidate-g-rollback-bundle.mjs. Do not edit.';
  const contract=/^export const GENERATED_RAVSCORE_MODEL_CONTRACT_SHA256 = '([a-f0-9]{64})';$/.exec(lines[1]??'');
  const bundle=/^export const GENERATED_RAVSCORE_MODEL_BUNDLE_SHA256 = '([a-f0-9]{64})';$/.exec(lines[2]??'');
  const prefix='export const GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST = Object.freeze(';
  const tail=lines.slice(3).join('\n');
  codeNeed(lines[0]===header&&contract&&bundle&&bundle[1]===bundleHash&&tail.startsWith(prefix)&&tail.endsWith(');\n'));
  const manifest=JSON.parse(tail.slice(prefix.length,-3));
  codeShape(manifest,kind==='I'?['schemaVersion','normalizationId','contractSha256','entrypoints',...(manifest.normalizationId==='numerical-esm-closure-explicit-self-identity-exclusion-v3'?['excludedModules']:[]),'files']
    :['schemaVersion','normalizationId','entrypoints','excludedModules','files']);
  codeNeed(manifest.schemaVersion===(kind==='I'?'1.0.0':'candidate-g-operational-rollback-bundle-v1')
    &&(kind==='I'
      ? ['lexer-esm-relative-import-closure-utf8-lf-static-cachebuster-v2','numerical-esm-closure-explicit-self-identity-exclusion-v3']
      : ['candidate-g-rollback-lexer-esm-closure-utf8-lf-static-cachebuster-v2','candidate-g-rollback-numerical-esm-explicit-self-identity-exclusion-v3']).includes(manifest.normalizationId)
    &&Array.isArray(manifest.entrypoints)&&Array.isArray(manifest.files));
  if(kind==='I')codeNeed(manifest.contractSha256===contract[1]);
  else codeNeed(Array.isArray(manifest.excludedModules));
  const seen=new Set(),key=kind==='I'?'path':'file';
  for(const file of manifest.files) {
    codeShape(file,[key,'sha256']);
    codeNeed(typeof file[key]==='string'&&/^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/.test(file[key])
      &&!file[key].split('/').includes('..')&&!seen.has(file[key])&&/^[a-f0-9]{64}$/.test(file.sha256));
    seen.add(file[key]);
  }
  codeNeed(sha(JSON.stringify(kind==='I'?codeCanonical(manifest):manifest))===bundleHash);
  codeNeed(text===header+'\n'+lines[1]+'\n'+lines[2]+'\n'+prefix+JSON.stringify(manifest,null,2)+');\n');
  return manifest;
}
function sourceCodeBundle(relative,kind,bundleHash,checkClock) {
  const row=readSourceCodeFile(relative,null,checkClock,true,1024*1024);
  return {manifest:sourceProducerAfter597ManifestFromText(codeUtf8(row),kind,bundleHash),raw:row};
}
// Pure physical CODE/DATA relation, also used before the compiler issues a binding.
// Expected C/I values are data, not a Source output, session or publication grant.
export function assertSourceProducerAfter597CodeData(expected,checkClock) {
  requireSourceProducerAfter597CodeParent();
  codeNeed((arguments.length===1||arguments.length===2)&&(checkClock===undefined||typeof checkClock==='function'));
  codeShape(expected,['C','I','metadataText']);
  codeNeed(typeof expected.C==='string'&&/^[a-f0-9]{64}$/.test(expected.C)
    &&typeof expected.I==='string'&&/^[a-f0-9]{64}$/.test(expected.I)&&typeof expected.metadataText==='string');
  const phase=sourceProducerAfter597DerivedMetadataFromText(expected.metadataText);
  if(phase.binding!==null)codeNeed(phase.binding.C===expected.C&&phase.binding.I===expected.I);
  const integrated=sourceCodeBundle(SOURCE_CODE_SPECIAL_FILES[0],'I',expected.I,checkClock);
  const candidate=sourceCodeBundle(SOURCE_CODE_SPECIAL_FILES[1],'C',expected.C,checkClock);
  // Each numerical manifest has its own model binding. Operational RAW/app
  // identity is independently qualified by the normal exact-CI entry below,
  // not recursively made a numerical I input.
  for(const [kind,value] of [['I',integrated],['C',candidate]]) {
    for(const row of value.manifest.files) {
      // Model manifests bind the builders' declared source normal form.
      // RAW and committed Git bytes remain independently exact below.
      const physical=readSourceCodeFile(row[kind==='I'?'path':'file'],null,checkClock,true);
      const normalized=codeUtf8(physical).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')
        .replace(/([?&]v=)\d+\.\d+\.\d+(?=["'])/g,'$1<release-version>');
      codeNeed(sha(normalized)===row.sha256);
    }
  }
  const physical=readSourceCodeFile(SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH,null,checkClock,true,256*1024);
  const pins=sourceProducerAfter597CodePinsFromText(codeUtf8(physical));codeNeed(pins.files!==null);
  const metadata=readSourceCodeFile(SOURCE_CODE_SPECIAL_FILES[2],null,checkClock,true,8192);
  codeNeed(codeUtf8(metadata)===expected.metadataText);
  for(const row of pins.files)readSourceCodeFile(row.path,row,checkClock);
  // CODE integrity only. Existing SQL/readback, same-session, FD, lease,
  // guardian, stop and SAVE consumers still independently own admission.
}

const committedSourceCode = new Map();
function assertCommittedSourceCode(checkClock) {
  const tick=()=>{if(checkClock!==undefined)checkClock();};tick();
  const env={...process.env,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
    GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'};
  const git=(args,options={})=>execFileSync('git',['-C',ROOT,...args],{
    env,timeout:10000,maxBuffer:64*1024*1024,stdio:['pipe','pipe','pipe'],...options});
  const head=git(['rev-parse','HEAD^{commit}']).toString('utf8').trim();
  codeNeed(/^[a-f0-9]{40}$/.test(head));
  // A normal PR checks out its authenticated head, while GitHub retains the
  // merge-event SHA. The existing PR caller supplies SOURCE_GATE_HEAD_SHA.
  // Captured action children supply no gate field and keep their own head SHA.
  const requestHead=process.env.GITHUB_EVENT_NAME==='pull_request'
    &&process.env.SOURCE_GATE_HEAD_SHA!==undefined
    ?process.env.SOURCE_GATE_HEAD_SHA:process.env.GITHUB_SHA;
  if(requestHead!==undefined)codeNeed(head===requestHead);
  codeNeed(git(['for-each-ref','refs/replace']).length===0);
  const pins=sourceProducerAfter597CodePinsFromText(codeUtf8(
    readSourceCodeFile(SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH,null,checkClock,true,256*1024)));
  codeNeed(pins.files!==null);
  const paths=[...new Set([...pins.files.map(row=>row.path),SOURCE_PRODUCER_AFTER597_CODE_PIN_PATH,
    ...SOURCE_CODE_SPECIAL_FILES])].sort();
  const key=head+':'+sha(JSON.stringify(paths));
  let identities=committedSourceCode.get(key);
  if(!identities){identities=committedSourceFileIdentities(head,paths,{git});committedSourceCode.set(key,identities);}
  for(const row of identities) {
    const actual=readSourceCodeFile(row.path,null,checkClock);
    codeNeed(actual.sha256===row.sha256);
  }
  codeNeed(git(['rev-parse','HEAD^{commit}']).toString('utf8').trim()===head);tick();
  // Exact CI/tree/native qualification is mandatory in normal entry BEFORE
  // clients, B/S, origin or tail capability. This local check grants none.
}
export function assertSourceProducerAfter597StaticCode(checkClock) {
  requireSourceProducerOutput(); // FIRST: NULL refuses before operands or any file read.
  assert(arguments.length<=1&&(checkClock===undefined||typeof checkClock==='function'));
  const binding=requireSourceProducerBinding();
  assertSourceProducerAfter597CodeData({C:binding.C,I:binding.I,
    metadataText:JSON.stringify({schemaVersion:'source-producer-after597-derived-metadata-v1',
      release:SOURCE_PRODUCER_AFTER597_PARENT.nextRelease,version:binding.version,binding,
      output:SOURCE_PRODUCER_AFTER597_PARENT.output},null,2)+'\n'},checkClock);
  assertCommittedSourceCode(checkClock);
}

export function requireSourceProducerBinding(){
  requireSourceProducerAfter597Binding(); // FIRST, before operands or source access.
  assert.equal(arguments.length,0);return SOURCE_PRODUCER_AFTER597_PARENT.binding;
}
export function requireSourceProducerOutput(){
  requireSourceProducerAfter597Output(); // FIRST before caller options or I/O.
  assert.equal(arguments.length,0);return SOURCE_PRODUCER_AFTER597_PARENT.output;
}
// A value-only normalization of the inner caller's hour. Never rewrite the
// global request/environment identity or loosen the whole-UTC-hour contract.
export function sourceProducerReferenceHour(value){
  assert.equal(arguments.length,1);assert.equal(typeof value,'string');
  assert.match(value,/^\d{4}-\d\d-\d\dT\d\d:00:00(?:\.000)?Z$/);
  const actual=resolveProductionReferenceTime(value);assert.equal(Date.parse(actual),Date.parse(value));return actual;
}
export function sourceProducerMigration(){
  requireSourceProducerOutput();assert.equal(arguments.length,0);const {version}=requireSourceProducerBinding();
  const id=version+'_source_producer_original_bound_successor';return Object.freeze({version,id,filename:id+'.sql'});
}
export function sourceProducerCheckpointContractFromBase(source,base){
  assert.equal(arguments.length,2);assert(base&&sha(base.definition)===base.sha256);let value=base.definition;
  for(let index=0;index<SOURCE_PRODUCER_ALIASES.length;index++){
    const whole=definition(source,SOURCE_PRODUCER_ALIASES[index].name),at=whole.indexOf('as $$');assert(at>0);
    value+='\n-- '+labels[index]+' --\n'+whole.slice(at+5,whole.lastIndexOf('$$;')).replace(/\r\n?/g,'\n').trim();
  }return Object.freeze({id:base.id,definition:value,sha256:sha(value)});
}
export async function readSourceProducerCanonicalSource(options){
  const pins=requireSourceProducerOutput(); // FIRST before caller paths or I/O.
  assert(arguments.length<=1);let directory=path.join(ROOT,'supabase/migrations');
  if(options!==undefined){assert(options&&Object.getPrototypeOf(options)===Object.prototype);
    assert.deepEqual(Object.keys(options),['migrationsDirectory']);assert(path.isAbsolute(options.migrationsDirectory));directory=path.resolve(options.migrationsDirectory);}
  const prior=await readSourceProducerAfter597PredecessorCanonicalSource(),migration=sourceProducerMigration();
  const file=path.join(directory,migration.filename),stat=await fs.lstat(file);
  assert(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=8*1024*1024);
  const raw=await fs.readFile(file);assert.equal(raw.length,stat.size);assert.equal(sha(raw),pins.migrationSha256);
  const sql=raw.toString('utf8');
  assert.deepEqual([...sql.matchAll(/^create or replace function public\.([a-z0-9_]+)\(/gm)].map(row=>row[1]),
    [...SOURCE_PRODUCER_ALIASES.map(row=>row.name),...replacements]);
  let canonicalSource=prior.canonicalSource;
  for(const name of replacements)canonicalSource=once(canonicalSource,definition(canonicalSource,name),definition(sql,name));
  const insertion=SOURCE_PRODUCER_ALIASES.map(row=>definition(sql,row.name)+'\nrevoke all on function public.'+row.name+row.signature+' from public, anon, authenticated;\n\n').join('');
  const anchor=definition(canonicalSource,CP+'integrated_state_valid');canonicalSource=once(canonicalSource,anchor,insertion+anchor);
  assert.equal(sha(canonicalSource),pins.canonicalSha256);
  let inverse=once(canonicalSource,insertion,'');
  for(const name of [...replacements].reverse())inverse=once(inverse,definition(inverse,name),definition(prior.canonicalSource,name));
  assert.equal(inverse,prior.canonicalSource,'Whole genuine598 canonical inverse');
  for(const row of prior.originalDefinitions)assert.equal(definition(canonicalSource,row.name),row.definition);
  assert.deepEqual(await fs.readFile(file),raw);
  return Object.freeze({...prior,canonicalSource,migration,sourcePhase:'source-producer-after597',admission:'NO_ADMISSION'});
}
