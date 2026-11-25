// Normal plan: aktuelle kontrakter for de faktisk ændrede områder.
// Planlægning er hverken en FULL-baseline, en testkvittering eller deployautoritet.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import { inversePrivateWeatherPublicationWorkflow, isPrivateWeatherPublicationWorkflowChange, WEATHER_PUBLICATION_COMMANDS, WEATHER_PUBLICATION_PATHS } from './lib/private-weather-publication-workflow.mjs';
import {analyzeSourceDomainInputs} from './source-impact-domain-inputs.mjs';
import {OWNED_CACHE_DEPENDENCY_COMMAND,OWNED_CACHE_NATIVE_COMMAND} from './source-current-contract-receipt.mjs';
import {isAdditiveOwnedCacheNativeWorkflowChange} from './lib/source-impact-workflow-review.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MAX_COMMITTED_TEXT_BYTES=4*1024*1024;
const freeze=value=>{for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return Object.freeze(value);};
const INSTALLER='supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql';
const WEATHER_BUILD='.github/workflows/reusable-weather-build.yml';
const MANUAL_WEATHER='.github/workflows/update-and-deploy.yml';
const ASSISTANT_SUCCESSOR_TESTS=new Set([
  'scripts/test-assistant-after597-fixed-generator.mjs',
  'scripts/test-assistant-after597-migration-prewrite.mjs',
  'scripts/test-assistant-after597-parent-profiles.mjs',
  'scripts/test-assistant-after597-runtime-origin.mjs',
  'scripts/test-assistant-after597-sync-binding.mjs',
]);
const FIXED_ASSISTANT_LOG_TEST='scripts/test-fixed-assistant-failure-log-20261101.mjs';
const ACCOUNT_SCHEMA_FIXTURE='scripts/test-account-erasure-outbox.mjs';
const ACCOUNT_SCHEMA_SOURCE_TEST='node --test '+ACCOUNT_SCHEMA_FIXTURE;
const SHARE_PROJECTION_SOURCE_TEST='node scripts/test-forecast-share-projection.mjs';
const SHARE_ZONE_BUNDLE_MODULE='js/services/forecast-share-zone-bundle.js';
const PAGES_DEPLOYMENT_COMMAND='node scripts/test-ravscore-operational-pages-deployment.mjs';
const PAGES_PUBLIC_VERIFICATION_COMMAND=PAGES_DEPLOYMENT_COMMAND+' --public-verification-only';
const PAGES_OWNER_COMPLETION_COMMAND=PAGES_DEPLOYMENT_COMMAND+' --owner-completion-only';
const LOCAL_RESTORE_FIXTURE='scripts/test-supabase-cli-local-restore.mjs';
const LOCAL_RESTORE_SELF_TEST='node '+LOCAL_RESTORE_FIXTURE+' --self-test';
const LOCAL_RESTORE_WORKFLOW='.github/workflows/verify-supabase-cli-local-restore.yml';
// Existing legacy pins apply only when comparing the fixed inventory dispatch addition.
const LOCAL_RESTORE_IMPORTS='\nconst P=Object.freeze(';
const LOCAL_RESTORE_DISPATCH='if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){';
const LOCAL_RESTORE_IMPORTS_SHA256='dd05a1d036c7d9afff9ae2ba4c0511dff199ad4faf5baab258b2a17b0cd728d4';
const LOCAL_RESTORE_DISPATCH_SHA256='2e0d348293d622790375df6457726e0af04d92c9e23aedbac42033aa5049443c';

// Navngiven inventory-CLI: en reel ny mode, ikke et nyt helfil-/headpin.
const LOCAL_RESTORE_INVENTORY_DISPATCH=[
  "  else if(process.argv[2]==='--run-archive-inventory')await fixture({archive:true,inventoryOnly:true}).catch(e=>{",
  "    console.log(JSON.stringify({status:'FAILED_CLOSED',scope:'authenticated-archive-relation-inventory-only',",
  "      firstFailure:safeError(e,'PREFLIGHT'),rawNamesIncluded:false,columnsIncluded:false,rowsIncluded:false,sqlIncluded:false,",
  "      dockerInvoked:false,sqlExecuted:false,databaseRestoreExecuted:false,authRestoreVerified:false,fullDatabaseBackupVerified:false,freeReady:false}));process.exitCode=1;",
  "  });",
  ""
].join('\n');


// Rækkefølgen er også den normale kommandorækkefølge. Ingen imports-/ressourcelexer.
const RAW_CACHE_ROTATION_SOURCE_COMMAND = 'node --test scripts/test-terminal-dmi-cache.mjs scripts/test-find-raw-rotation-artifact.mjs scripts/test-github-actions-cache-stock.mjs scripts/test-weather-acquisition-workflows.mjs scripts/test-committed-raw-current-capture-union.mjs';
const WEATHER_CADENCE_SOURCE_COMMAND = 'node scripts/test-weather-cadence-watchdog.mjs';
const ACCOUNT_TRIP_UI_SOURCE_TEST = 'node --test scripts/test-user-account-trip-log-4.0.264.mjs scripts/test-trip-evidence-upload-receipt.mjs';

const WEATHER_COMPONENT_RUNTIME_SOURCE_COMMAND='node --test scripts/test-weather-component-runtime.mjs scripts/test-open-meteo-part-bank.mjs scripts/test-open-meteo-part-runtime.mjs scripts/test-open-meteo-normal-component-chain.mjs';
const DKSS_RAW_NATIVE_FIXTURE='scripts/test-native-current-grid.py';
const DKSS_RAW_H0_FIXTURE='scripts/test-protected-dmi-native-current-proofs.mjs';
const DKSS_RAW_AUDIT_COMMAND='node scripts/test-dkss-current-raw-audit-source.mjs';

export const CURRENT_CONTRACT_COMMANDS=freeze({
  core:[
    'node scripts/validate-release-version.mjs',
    'node scripts/test-module-version-closure-4.0.87.mjs',
    'node scripts/test-security-hardening-4.0.284.mjs',
  ],
  pages:[
    'node --test scripts/test-ordinary-pages-immediate-retry.mjs',
    'node scripts/test-pages-generation-and-reentry.mjs',
    'node scripts/test-ravscore-operational-pages-recovery.mjs',
    PAGES_PUBLIC_VERIFICATION_COMMAND,
    PAGES_OWNER_COMPLETION_COMMAND,
    'node --test scripts/test-protected-operational-reentry-evidence.mjs',
  ],
  workflowSupport:[
    'node --test scripts/test-current-pages-workflow-wiring.mjs',
  ],
  pagesArtifact:[
    'node --test scripts/test-pages-artifact-metadata.mjs',
  ],
  assistantEdge:[
    'node scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
    'node scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  ],
  assistantDiagnostic:['node '+FIXED_ASSISTANT_LOG_TEST],
  assistantDiagnostic1712:['node scripts/test-fixed-assistant-failure-log-20261121-1712.mjs'],
  accountActivityHookRead:['node --test scripts/test-fixed-account-activity-hook.mjs'],
  accountSchemaFixture:[ACCOUNT_SCHEMA_SOURCE_TEST],
  accountTripUI:[ACCOUNT_TRIP_UI_SOURCE_TEST],
  assistantPublic:[
    'node --test scripts/test-assistant-ui-error-boundary.mjs',
    'node scripts/test-rav-assistant-local-knowledge-4.0.293.mjs',
    'node scripts/test-rav-assistant-main-edge-roundtrip.mjs',
    'node scripts/test-ravscore-public-browser-closure.mjs',
  ],
  publicUI:[
    'node --test scripts/test-assistant-ui-error-boundary.mjs',
    'node scripts/test-ravscore-public-data-service-binding.mjs',
    'node scripts/test-ravscore-public-browser-closure.mjs',
    'node scripts/test-map-forecast-timeline.mjs',
    'node --test scripts/test-map-forecast-panel.mjs scripts/test-map-timeline-generation.mjs',
    'node scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  ],
  adminUI:[
    'node scripts/test-admin-initial-dashboard-4.0.77.mjs',
    'node scripts/test-admin-active-ravscore-runtime.mjs',
    'node scripts/test-admin-config-production-contract-4.0.94.mjs',
    'node scripts/test-private-visitor-statistics-4.0.215.mjs',
    'node scripts/test-water-station-active-routing-display-4.0.102.mjs',
  ],
  documentation:[
    'node scripts/validate-rdks.mjs',
    'node scripts/test-handbook-plain-language-4.0.70.mjs',
    'node scripts/test-handbook-review-archive-4.0.91.mjs',
    'node scripts/test-protected-handbook-merge-4.0.270.mjs',
  ],
  releaseMetadata:[
    'node scripts/test-private-production-runtime-workflow.mjs',
    'node scripts/test-release-contract-metadata.mjs',
  ],
  ownedCacheNative:[OWNED_CACHE_DEPENDENCY_COMMAND,OWNED_CACHE_NATIVE_COMMAND],
  rawCacheRotation:[RAW_CACHE_ROTATION_SOURCE_COMMAND],
  sourceControls:[
    'node --test scripts/test-source-current-contracts.mjs',
    'node scripts/test-source-impact-workflow.mjs',
    'node scripts/test-source-targeted-producer.mjs',
    'node scripts/test-source-targeted-consumer.mjs',
    'node --test scripts/test-native-postgres-evidence.mjs',
    'node --test scripts/test-source-impact-full-baseline.mjs',
    'node scripts/test-weather-source-gate.mjs',
    WEATHER_CADENCE_SOURCE_COMMAND,
  ],
  currentInstalledCodeOnly:[
    'node --test scripts/test-native-original-continuity-callers.mjs',
  ],
  adminHistory:[
    'node --test scripts/test-admin-document-history-workflow.mjs',
    'node --test scripts/test-admin-document-history-maintenance.mjs',
  ],
  backupRestore:[
    LOCAL_RESTORE_SELF_TEST,
    'node --test scripts/test-archive-supabase-database-backup.mjs',
    'node --test scripts/test-supabase-database-backup-workflow.mjs',
    'node --test scripts/test-supabase-backup-lifecycle.mjs',
  ],
  mailOwnerProbe:[
    'node --test scripts/test-owner-notice-probe-ci.mjs',
  ],
  dmiBudget:[
    'node scripts/test-dmi-budget-rotation-4.0.189.mjs',
  ],
  dmiCollectionRecovery:[
    'node --test scripts/test-current-operational-python-contracts.mjs',
  ],
  dkssRawAudit:[DKSS_RAW_AUDIT_COMMAND],
  weatherScalarPlanning:[
    'node --test scripts/test-weather-component-normal-wireup.mjs',
    WEATHER_COMPONENT_RUNTIME_SOURCE_COMMAND,
    'node scripts/test-copernicus-component-index.mjs',
  ],
  sharing:[
    'node scripts/test-map-forecast-timeline.mjs',
    SHARE_PROJECTION_SOURCE_TEST,
    'node scripts/test-forecast-share-pages-deploy.mjs',
  ],
  privateStudy:[
    // This whole existing entry imports month-rollover and categorical-controller.
    'node --test scripts/test-account-statistics-assistant-callers.mjs',
  ],
  ownerErasure:[
    'node --test scripts/test-delete-trip-owner-data-readback.mjs',
  ],
  waterSourceRouting:[
    "node scripts/test-water-source-forecast-routing-4.0.100.mjs",
    "node scripts/test-water-source-automatic-selection-4.0.101.mjs",
    "node scripts/test-water-source-production-chain-4.0.103.mjs",
    "node scripts/test-water-regressions-4.0.104.mjs"
  ],
  weatherUpdater:[
    "node scripts/test-dmi-acquisition-resilience.mjs",
    "node scripts/test-dmi-forecast-store.mjs",
    "node scripts/test-dmi-part-continuity.mjs",
    "node scripts/test-dmi-marine-run-seam-recovery.mjs",
    "node scripts/test-dmi-bulk-storage.mjs",
    "node --test scripts/test-current-operational-python-contracts.mjs scripts/test-dmi-bulk-forecast-integration.mjs scripts/test-dmi-protected-tuple-continuity.mjs scripts/test-protected-live-current-assembly.mjs",
    "node --test scripts/test-weather-component-normal-wireup.mjs",
    "node scripts/test-weather-acquisition-workflows.mjs",
    "node scripts/test-current-operational-live-adapter.mjs",
    "node scripts/test-public-weather-continuity.mjs",
    "node scripts/test-bounded-json-writer.mjs",
    "node scripts/test-private-conditions-hourly.mjs",
    "node scripts/test-bounded-conditions-predecessor-transition.mjs",
    "node --test scripts/test-public-hour-delivery-pack.mjs scripts/test-progressive-public-conditions-4.0.216.mjs scripts/test-public-nonblocking-forecast-4.0.83.mjs scripts/test-map-zoom-refresh-4.0.88.mjs scripts/test-public-search-pages.mjs",
    "node --test scripts/test-current-provenance-sealing.mjs",
    "node --test scripts/test-ravscore-integrated-generator.mjs scripts/test-ravscore-recovery-replay.mjs scripts/test-score-prognosis-plain-copy.mjs scripts/test-ravscore-initial-current-window-audit.mjs scripts/test-saved-current-window-scratch.mjs scripts/test-post-h0-dmi-original-dependencies.mjs scripts/test-saved-current-forward-original-plan.mjs",
    "node scripts/test-ravscore-production-adapters.mjs",
    "node scripts/test-runtime-diagnostics-envelope-4.0.234.mjs",
    "node scripts/test-admin-config-production-contract-4.0.94.mjs",
    WEATHER_COMPONENT_RUNTIME_SOURCE_COMMAND
  ],
  runtimeAudit:[
    "node scripts/test-ravscore-public-runtime-contract.mjs",
    "node scripts/test-ravscore-public-data-service-binding.mjs",
    "node scripts/test-ravscore-integrated-public-runtime-audit.mjs",
    "node scripts/test-ravscore-integrated-public-consumers.mjs",
    "node scripts/test-ravscore-public-browser-closure.mjs"
  ],
  // Shared capture/SAVE/restore, authenticated audit and local installation.
  // The ordinary package group plus its actual caller contracts run in full.
  weatherProgressRecovery:[
    'node --test scripts/test-weather-component-progress-cache.mjs scripts/test-weather-component-progress-workflow.mjs scripts/test-dmi-progress-inputs.mjs',
    'node --test scripts/test-audit-saved-weather-inputs.mjs',
    'node --test scripts/test-native-identity-checkpoint-runtime.mjs',
    'node --test scripts/test-current-family-cold-supervisor-wrapper.mjs',
    'node --test scripts/test-saved-current-window-scratch.mjs',
  ],

  weatherPublication:WEATHER_PUBLICATION_COMMANDS,
  // Aktuel faktisk kildegate + arkivkontrakt. Det er ikke et løfte om at
  // samtlige historiske whole-oracles er udført.
  compatibility:[
    'node scripts/source-critical-gate.mjs',
    'node --test scripts/test-archived-weather-restart-workflow.mjs',
  ],
  actionVersions:[
    'node scripts/test-github-action-versions.mjs',
  ],
  savedWeatherAudit:[
    'node --test scripts/test-audit-saved-weather-inputs.mjs',
    'node --test scripts/test-saved-weather-audit-workflow.mjs',
  ],
  historicalUpdaterOracles:[
    'node --test scripts/test-ravscore-integrated-generator.mjs scripts/test-ravscore-recovery-replay.mjs scripts/test-score-prognosis-plain-copy.mjs scripts/test-ravscore-initial-current-window-audit.mjs scripts/test-saved-current-window-scratch.mjs scripts/test-post-h0-dmi-original-dependencies.mjs scripts/test-saved-current-forward-original-plan.mjs',
    'node --test scripts/test-weather-update-entrypoint.mjs',
    'node scripts/test-weather-history-retention-4.0.209.mjs',
    'node --test scripts/test-audit-saved-weather-inputs.mjs',
  ],
  historicalTests:[],
});
const COMMANDS=CURRENT_CONTRACT_COMMANDS;

// Stier udpeger ansvar; indholdet godkendes først af de faktiske kommandoer.
// Nye/ukendte produktstier falder ikke automatisk ind under et bredt præfiks.
const PATH_AREAS=freeze({
  dkssRawAudit:[
    'scripts/lib/dkss-current-raw-audit-input.mjs',
    'scripts/lib/dkss_current_raw_audit.py',
    'scripts/lib/dkss_current_raw_cache.py',
    'scripts/test-dkss-current-raw-audit.py',
    'scripts/test-dkss-current-raw-audit-source.mjs',
    DKSS_RAW_NATIVE_FIXTURE,
    DKSS_RAW_H0_FIXTURE,
  ],
  pages:[
    '.github/actions/deploy-ravradar-pages/action.yml',
    '.github/workflows/run-current-weather-once.yml',
    MANUAL_WEATHER,
    '.github/workflows/reusable-pages-deploy.yml',
    '.github/workflows/reusable-operational-reentry.yml',
    '.github/workflows/reusable-weather-build.yml',
    'scripts/deploy-ordinary-pages-with-immediate-retry.mjs',
    'scripts/github-pages-attempt-evidence.mjs',
    'scripts/protected-operational-reentry-evidence.mjs',
    'scripts/ravscore-operational-pages-recovery.mjs',
    'scripts/verify-ravscore-operational-pages-deployment.mjs',
    'scripts/lib/pages-per-artifact-identity.mjs',
    'scripts/lib/pages-sealed-retry-decision.mjs',
    'scripts/lib/publish-sealed-pages-with-recovery.mjs',
    'scripts/lib/run-sealed-pages-deployment.mjs',
    'scripts/test-ordinary-pages-immediate-retry.mjs',
    'scripts/test-current-pages-workflow-wiring.mjs',
    'scripts/test-pages-generation-and-reentry.mjs',
    'scripts/test-ravscore-operational-pages-recovery.mjs',
    'scripts/test-ravscore-operational-pages-deployment.mjs',
    'scripts/test-protected-operational-reentry-evidence.mjs',
  ],
  workflowSupport:[
    'scripts/write-support-run-metadata.mjs',
  ],
  pagesArtifact:[
    '.github/workflows/reusable-weather-build.yml',
    '.github/workflows/deploy-code-only-repair.yml',
    'scripts/read-pages-artifact-metadata.mjs',
    'scripts/test-pages-artifact-metadata.mjs',
  ],
  assistantEdge:[
    'supabase/functions/ravradar-assistant/index.ts',
    'supabase/functions/_shared/rav-assistant-contract.ts',
    'scripts/test-rav-assistant-edge-cloudflare-4.0.290.mjs',
    'scripts/test-rav-assistant-main-edge-roundtrip.mjs',
  ],
  assistantDiagnostic:[FIXED_ASSISTANT_LOG_TEST,'scripts/read-fixed-assistant-failure-log-20261101.mjs',
    '.github/workflows/deploy-trip-storage.yml'],
  assistantDiagnostic1712:['scripts/read-fixed-assistant-failure-log-20261121-1712.mjs',
    'scripts/test-fixed-assistant-failure-log-20261121-1712.mjs',
    '.github/workflows/deploy-trip-storage.yml'],
  accountActivityHookRead:[
    'scripts/lib/account-native-activity-receipt-source.mjs',
    'scripts/read-fixed-account-activity-hook.mjs',
    'scripts/test-fixed-account-activity-hook.mjs',
  ],
  accountSchemaFixture:[ACCOUNT_SCHEMA_FIXTURE],
  accountTripUI:[
    'js/ui/account-panel.js',
    'scripts/test-user-account-trip-log-4.0.264.mjs',
    'scripts/test-trip-evidence-upload-receipt.mjs',
  ],
  assistantPublic:[
    'js/services/rav-assistant.js',
    'js/services/rav-assistant-public-help.js',
    'knowledge/rav-assistant-local-v2.js',
    'knowledge/rav-assistant-research-coast-v1.js',
    'knowledge/rav-assistant-research-material-v1.js',
    'knowledge/rav-assistant-research-v1.js',
    'knowledge/rav-assistant-sources-v1.js',
    'scripts/test-assistant-ui-error-boundary.mjs',
    'scripts/test-rav-assistant-local-knowledge-4.0.293.mjs',
  ],
  publicUI:[
    'app.js','bootstrap.js','index.html','service-worker.js',
    'js/services/data-service.js',
    'scripts/test-ravscore-public-data-service-binding.mjs',
    'scripts/test-ravscore-public-browser-closure.mjs',
    'scripts/test-map-forecast-timeline.mjs',
    'scripts/test-map-forecast-panel.mjs',
    'scripts/test-map-timeline-generation.mjs',
    'scripts/test-public-json-reader-bridge.mjs',
    'scripts/test-public-cold-start-4.0.303.mjs',
  ],
  adminUI:[
    'admin.html','js/ui/admin-dashboard.js',
    'js/services/admin-document-store.js','js/services/visitor-report-service.js',
    'scripts/test-admin-initial-dashboard-4.0.77.mjs',
    'scripts/test-admin-active-ravscore-runtime.mjs',
    'scripts/test-admin-config-production-contract-4.0.94.mjs',
    'scripts/test-private-visitor-statistics-4.0.215.mjs',
    'scripts/test-water-station-active-routing-display-4.0.102.mjs',
  ],
  documentation:[
    'AGENTS.md','CHANGELOG.md','HANDBOOK-RAVRADAR.md','docs/handbook/content.json',INSTALLER,
    'scripts/sync-handbook-installation-copy.mjs',
    'scripts/validate-rdks.mjs','scripts/test-handbook-plain-language-4.0.70.mjs',
    'scripts/test-handbook-review-archive-4.0.91.mjs','scripts/test-protected-handbook-merge-4.0.270.mjs',
  ],
  releaseMetadata:[
    'scripts/set-version.mjs',
    'scripts/test-private-production-runtime-workflow.mjs',
    'scripts/test-release-contract-metadata.mjs',
  ],
  rawCacheRotation:[
    '.github/workflows/build-ravscore-historical-wave-pilot.yml',
    'scripts/check-weather-cadence-watchdog.mjs',
    'scripts/find-raw-rotation-artifact.mjs',
    'scripts/lib/committed-raw-current-capture-union.mjs',
    'scripts/lib/github-actions-cache-stock.mjs',
    'scripts/lib/raw-rotation-handoff.mjs',
    'scripts/lib/terminal-dmi-cache.mjs',
    'scripts/lib/verify-saved-raw-capture-coverage.mjs',
    'scripts/lib/verified-raw-cache-rotation.mjs',
    'scripts/observe-github-raw-cache-stock.mjs',
    'scripts/prove-post-publish-saved-raw.mjs',
    'scripts/prove-pre-dmi-restored-raw-successor.mjs',
    'scripts/prove-restored-raw-successor.py',
    'scripts/prove-saved-raw-cache.py',
    'scripts/publish-checkpoint-with-raw-receipt.mjs',
    'scripts/read-published-raw-rotation-runtime.mjs',
    'scripts/reconcile-private-runtime-checkpoint.mjs',
    'scripts/retire-verified-raw-caches.mjs',
    'scripts/test-committed-raw-current-capture-union.mjs',
    'scripts/test-find-raw-rotation-artifact.mjs',
    'scripts/test-github-actions-cache-stock.mjs',
    'scripts/test-prove-restored-raw-successor.py',
    'scripts/test-terminal-dmi-cache.mjs',
    'scripts/test-weather-acquisition-workflows.mjs',
    'scripts/weather-state-epoch-budget.mjs',
    'scripts/weather-state-epoch.mjs',
  ],
  ownedCacheNative:[
    '.github/actions/save-owned-dmi-grib/action.yml',
    '.github/actions/save-owned-dmi-grib/index.cjs',
    'scripts/run-owned-dmi-grib-save.py',
    'scripts/test-owned-dmi-grib-save-native.py',
    'scripts/test-owned-dmi-cache-dependency.mjs',
  ],
  sourceControls:[
    '.github/workflows/validate-pull-request.yml',
    'scripts/lib/source-impact-workflow-review.mjs','scripts/test-source-impact-workflow.mjs',
    'scripts/source-current-contract-plan.mjs',
    'scripts/source-current-contract-receipt.mjs',
    'scripts/test-source-current-contracts.mjs',
    'scripts/source-targeted-producer.mjs','scripts/test-source-targeted-producer.mjs',
    'scripts/source-targeted-receipt.mjs','scripts/test-source-targeted-receipt.mjs',
    'scripts/source-targeted-consumer.mjs','scripts/test-source-targeted-consumer.mjs',
    'scripts/native-postgres-evidence.mjs','scripts/test-native-postgres-evidence.mjs',
    'scripts/source-impact-full-baseline.mjs','scripts/test-source-impact-full-baseline.mjs',
    'scripts/test-source-targeted-domain-integration.mjs','scripts/weather-source-gate.mjs',
    '.github/workflows/watch-missed-weather-schedule.yml',
    'scripts/check-weather-cadence-watchdog.mjs','scripts/read-weather-cadence-github.mjs',
    'scripts/lib/weather-source-gate.mjs',
    'scripts/test-weather-source-gate.mjs','scripts/test-weather-cadence-watchdog.mjs',
    'scripts/validate-release-version.mjs','scripts/test-module-version-closure-4.0.87.mjs',
    'scripts/test-security-hardening-4.0.284.mjs',
  ],
  currentInstalledCodeOnly:[
    'scripts/select-native-original-continuity-code-only-source.mjs',
    'scripts/test-native-original-continuity-callers.mjs',
  ],
  compatibility:[
    '.github/workflows/deploy-code-only-repair.yml',
    'scripts/lib/archived-production-gate-review.mjs',
    'scripts/lib/completed-private-runtime-workflow-review.mjs',
    'scripts/lib/native-original-continuity-workflow-review.mjs',
  ],
  adminHistory:[
    '.github/workflows/run-current-weather-once.yml',
    '.github/workflows/maintain-admin-document-history.yml',
    'scripts/test-admin-document-history-workflow.mjs',
    'scripts/admin-document-history-maintenance.mjs',
    'scripts/test-admin-document-history-maintenance.mjs',
  ],
  backupRestore:[
    '.github/workflows/maintain-admin-document-history.yml',
    'scripts/supabase-backup-lifecycle.mjs',
    'scripts/run-autonomous-supabase-backup.mjs',
    'scripts/test-supabase-backup-lifecycle.mjs',
    '.github/workflows/backup-supabase-database.yml',
    '.github/workflows/inspect-supabase-database-backup.yml',
    LOCAL_RESTORE_WORKFLOW,
    'scripts/inspect-supabase-database-backup.mjs',
    'scripts/run-hosted-supabase-backup.mjs',
    'scripts/test-supabase-database-backup-workflow.mjs',
    LOCAL_RESTORE_FIXTURE,
    'scripts/seal-supabase-database-export.mjs',
    'scripts/archive-supabase-database-backup.mjs',
    'scripts/test-archive-supabase-database-backup.mjs',
  ],
  mailOwnerProbe:[
    '.github/workflows/test-owner-notice-mail.yml',
    'scripts/owner-notice-probe-ci.mjs',
    'scripts/test-owner-notice-probe-ci.mjs',
    'scripts/fixtures/owner-notice-probe/index.ts',
    'scripts/fixtures/owner-notice-probe/inactivity-notice-mail.mjs',
    'scripts/fixtures/owner-notice-probe/owner-notice-probe.mjs',
    'scripts/fixtures/owner-notice-probe/owner-notice-probe-invoke.mjs',
    'scripts/fixtures/owner-notice-probe/reservation.mjs',
    'scripts/fixtures/owner-notice-probe/hosted-owner-adapter-v1/hosted-owner-notice-probe.mjs',
  ],
  dmiBudget:[
    'scripts/plan-dmi-recovery.py','scripts/lib/dmi_adaptive_recovery.py',
    'scripts/run-dmi-bulk-supervised.py','scripts/update-dmi-bulk.py',
    'scripts/test-plan-dmi-recovery.py','scripts/test-dmi-budget-rotation-4.0.189.mjs',
  ],
  weatherScalarPlanning:[
    'scripts/lib/weather-component-runtime.mjs',
    'scripts/test-weather-component-normal-wireup.mjs',
    'scripts/test-weather-component-runtime.mjs',
    'scripts/test-copernicus-component-index.mjs',
  ],
  sharing:[
    SHARE_ZONE_BUNDLE_MODULE,'js/services/data-service.js','js/services/forecast-share-trust-index.js',
    'scripts/build-forecast-share-projection.mjs','scripts/audit-pages-artifact-privacy.mjs',
    'scripts/forecast-share/handler.mjs',
    'scripts/test-forecast-share-projection.mjs',
    '.github/workflows/deploy-forecast-share-pages.yml',
    'scripts/deploy-forecast-share-pages.mjs',
    'scripts/test-forecast-share-pages-deploy.mjs',
  ],
  privateStudy:[
      ".github/workflows/private-trip-weather-study.yml",
      "scripts/publish-private-trip-weather-study.mjs",
      "scripts/deploy-private-trip-study.mjs",
      "cloudflare/trip-gateway/trip-aggregate-row.js",
      "scripts/test-trip-aggregate-month-rollover.mjs",
      "scripts/test-private-trip-study-categorical-controller.mjs",
      "scripts/test-account-statistics-assistant-callers.mjs"
  ],
  ownerErasure:[
    'supabase/functions/_shared/trip-owner-erasure.js',
    'scripts/test-delete-trip-owner-data-readback.mjs',
  ],
  waterSourceRouting:[
    "scripts/lib/water-source-forecast-routing.mjs",
    "scripts/test-water-source-forecast-routing-4.0.100.mjs",
    "scripts/test-water-source-production-chain-4.0.103.mjs",
    "scripts/update-weather.mjs"
  ],
  weatherUpdater:[
    "scripts/update-weather.mjs"
  ],
  runtimeAudit:[
    "scripts/audit-ravscore-integrated-public-runtime.mjs",
    "scripts/test-ravscore-integrated-public-runtime-audit.mjs",
    "scripts/update-weather.mjs",
    "scripts/lib/water-source-forecast-routing.mjs"
  ],
  weatherProgressRecovery:[
    'scripts/weather-component-progress-cache.mjs',
    'scripts/test-weather-component-progress-cache.mjs',
  ],
  weatherPublication:WEATHER_PUBLICATION_PATHS,
  // Disse kendte historiske/metakontroller giver ingen produktadmission i V3.
  // Deres ændring kræver stadig en uafhængig kontrolgennemgang.
  actionVersions:[
    '.github/workflows/watch-missed-weather-schedule.yml',
    '.github/workflows/apply-weather-model-binding-only.yml',
    '.github/workflows/audit-saved-weather-inputs.yml',
    '.github/workflows/reusable-operational-reentry.yml',
    'scripts/test-github-action-versions.mjs',
  ],
  savedWeatherAudit:[
    '.github/workflows/audit-saved-weather-inputs.yml',
    'scripts/audit-saved-weather-inputs.mjs',
    'scripts/test-audit-saved-weather-inputs.mjs',
    'scripts/audit-b358-water-level-trend.mjs',
    'scripts/test-saved-weather-audit-workflow.mjs',
  ],
  historicalUpdaterOracles:[
    'scripts/lib/archived-weather-restart-updater-test-input.mjs',
    'scripts/test-post-h0-dmi-original-dependencies.mjs',
    'scripts/test-ravscore-initial-current-window-audit.mjs',
    'scripts/test-ravscore-integrated-generator.mjs',
    'scripts/test-ravscore-recovery-replay.mjs',
    'scripts/test-weather-update-entrypoint.mjs',
    'scripts/test-weather-history-retention-4.0.209.mjs',
  ],
  historicalTests:[
    'scripts/lib/pages-closure-historical-test-input.mjs',
    'scripts/test-account-statistics-assistant-callers.mjs',
    'scripts/test-completed-private-runtime-admission.mjs',
    'scripts/test-completed-private-runtime-workflow-inverse.mjs',
    'scripts/test-ordinary-completed-stage-source.mjs',
    'scripts/test-reconcile-private-runtime-checkpoint.mjs',
    'scripts/test-reusable-production-workflows.mjs',
    'scripts/test-reusable-production-workflow-cases.mjs',
    'scripts/test-source-validation-once.mjs',
    'scripts/test-weather-acquisition-workflows.mjs',
    'scripts/test-weather-component-progress-workflow.mjs',
    'scripts/test-weather-state-epoch-workflow.mjs',
    'scripts/test-workflow-validation-order-4.0.108.mjs',
    'scripts/source-impact-domain-plan.mjs',
    'scripts/test-source-impact-domain-plan.mjs',
    'scripts/lib/source-impact-domain-owners-594.json',
    'scripts/lib/source-impact-domain-owners-597.json',
    'scripts/lib/source-impact-domain-owners-598.json',
  ],
});
const WEATHER_OPERATION_PATHS=new Set([...PATH_AREAS.waterSourceRouting,...PATH_AREAS.weatherUpdater,...PATH_AREAS.runtimeAudit]);
const RELEASE_METADATA_PATHS=new Set(PATH_AREAS.releaseMetadata);
const WEATHER_PROGRESS_RECOVERY_PATHS=new Set(PATH_AREAS.weatherProgressRecovery);
const SMALL_USER_CONTRACT_PATHS=new Set([...PATH_AREAS.sharing,...PATH_AREAS.ownerErasure,
  ...PATH_AREAS.privateStudy,...PATH_AREAS.accountActivityHookRead,...PATH_AREAS.accountSchemaFixture,
  ...PATH_AREAS.accountTripUI]);
const sourceControlPaths=new Set(PATH_AREAS.sourceControls);
// The same actual owner/target catalog serves current CI and historical input admission.
// This is only a lookup; it does not run a producer, read Git or qualify a receipt.
// Kun denne kendte additive operation. Ingen nyt helfil-/headhashlag.
export function isFixedAssistant1712WorkflowAddition(before,after){
  assert.equal(arguments.length,2);
  if(typeof before!=='string'||typeof after!=='string'
    ||[before,after].some(value=>value.includes('\r')||value.includes('\0')||value.includes('\uFFFD')))return false;
  const route="fixed-assistant-failure-log-read-20261121-1712";
  if(before.includes(route))return false;
  const edits=[
  [
    "          - fixed-assistant-failure-log-read-20261101\n",
    "          - fixed-assistant-failure-log-read-20261101\n          - fixed-assistant-failure-log-read-20261121-1712\n"
  ],
  [
    " || inputs.operation == 'fixed-assistant-failure-log-read-20261101'",
    " || inputs.operation == 'fixed-assistant-failure-log-read-20261101' || inputs.operation == 'fixed-assistant-failure-log-read-20261121-1712'"
  ],
  [
    " && inputs.operation != 'fixed-assistant-failure-log-read-20261101'",
    " && inputs.operation != 'fixed-assistant-failure-log-read-20261101' && inputs.operation != 'fixed-assistant-failure-log-read-20261121-1712'"
  ],
  [
    "      - name: Read only the fixed 1 November assistant failure categories\n        if: inputs.operation == 'fixed-assistant-failure-log-read-20261101'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-assistant-failure-log-20261101.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n",
    "      - name: Read only the fixed 1 November assistant failure categories\n        if: inputs.operation == 'fixed-assistant-failure-log-read-20261101'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-assistant-failure-log-20261101.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n      - name: Read only the fixed 21 November 17:12 assistant failure categories\n        if: inputs.operation == 'fixed-assistant-failure-log-read-20261121-1712'\n        timeout-minutes: 1\n        run: node scripts/read-fixed-assistant-failure-log-20261121-1712.mjs\n        env:\n          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}\n\n"
  ]
];
  let expected=before;
  for(const [oldValue,newValue]of edits){
    if(expected.split(oldValue).length!==2)return false;
    expected=expected.replace(oldValue,()=>newValue);
  }
  return after===expected;
}

export function currentWorkflowTargets(relative){
  assert.equal(arguments.length,1);
  if(typeof relative!=='string'||!/^\.github\/workflows\/[A-Za-z0-9_.-]+\.ya?ml$/.test(relative))return null;
  const areas=pathAreas.get(relative);
  if(!areas?.length||areas.some(area=>!COMMANDS[area]?.length))return null;
  return freeze({path:relative,owners:areas.map(area=>({area,commands:[...COMMANDS[area]]}))});
}
// Existing whole callers for precise app and Pages inputs. This lookup
// selects test commands without adding short-path qualification authority.
const TRIP_LOG_SOURCE_TEST='node --test scripts/test-user-account-trip-log-4.0.264.mjs';
const PROTECTED_HANDBOOK_SOURCE_TESTS=[
  'node scripts/test-protected-handbook-merge-4.0.270.mjs',
  'node --test scripts/test-supabase-quota-controls.mjs',
];
const SOURCE_EXECUTION_TARGETS=freeze({
  // The actual Node24 dependency and physical archive proofs run once in the
  // dedicated native phases. The Node22 source driver checks the normal callers.
  '.github/actions/save-owned-dmi-grib/action.yml':[RAW_CACHE_ROTATION_SOURCE_COMMAND],
  '.github/actions/save-owned-dmi-grib/index.cjs':[RAW_CACHE_ROTATION_SOURCE_COMMAND],
  'scripts/run-owned-dmi-grib-save.py':[RAW_CACHE_ROTATION_SOURCE_COMMAND],
  'scripts/test-owned-dmi-grib-save-native.py':[RAW_CACHE_ROTATION_SOURCE_COMMAND],
  'scripts/check-weather-cadence-watchdog.mjs':['node --test scripts/test-weather-cadence-watchdog.mjs'],
  'scripts/read-weather-cadence-github.mjs':['node --test scripts/test-weather-cadence-watchdog.mjs'],
  '.github/workflows/update-and-deploy.yml':[
    'node scripts/test-pages-generation-and-reentry.mjs',
    'node scripts/test-production-workflow-outcome.mjs',
  ],
  'scripts/audit-pages-artifact-privacy.mjs':['node scripts/test-pages-artifact-privacy.mjs',SHARE_PROJECTION_SOURCE_TEST],
  'scripts/build-forecast-share-projection.mjs':[SHARE_PROJECTION_SOURCE_TEST],
  'scripts/lib/merge-protected-handbook.mjs':PROTECTED_HANDBOOK_SOURCE_TESTS,
  'scripts/sync-protected-admin-assets.mjs':PROTECTED_HANDBOOK_SOURCE_TESTS,
  'scripts/release-gate.mjs':['node --test scripts/test-release-gate-error-aggregation.mjs'],
  'scripts/verify-ravscore-operational-pages-deployment.mjs':[PAGES_PUBLIC_VERIFICATION_COMMAND,SHARE_PROJECTION_SOURCE_TEST],
  [WEATHER_BUILD]:[...COMMANDS.pages,...COMMANDS.pagesArtifact,RAW_CACHE_ROTATION_SOURCE_COMMAND],
  'scripts/run-copernicus-current-pilot-with-retry.py':COMMANDS.dmiCollectionRecovery,
  'scripts/run-dmi-bulk-supervised.py':[...COMMANDS.dmiBudget,...COMMANDS.dmiCollectionRecovery],
  'scripts/run-ordinary-provider-cgroup.py':[
    ...COMMANDS.dmiCollectionRecovery,
    'node --test scripts/test-weather-component-progress-workflow.mjs',
  ],
  'scripts/test-copernicus-bounded-retry-4.0.289.py':COMMANDS.dmiCollectionRecovery,
  'scripts/test-dmi-bulk-supervised.py':COMMANDS.dmiCollectionRecovery,
  'scripts/test-dmi-supervisor-parent-loss.py':COMMANDS.dmiCollectionRecovery,
  'scripts/test-dmi-native-chain-continuity.py':[
    'python -B scripts/test-dmi-native-chain-continuity.py FirstTurnMarineCatalogueTests',
  ],
  'scripts/test-dmi-native-provenance.py':COMMANDS.dmiCollectionRecovery,
  [DKSS_RAW_H0_FIXTURE]:['node --test '+DKSS_RAW_H0_FIXTURE,DKSS_RAW_AUDIT_COMMAND],
  'scripts/test_dmi_wave_bootstrap_update_integration.py':[
    'python -B scripts/test_dmi_wave_bootstrap_update_integration.py',
  ],
  'scripts/test-ordinary-provider-cgroup.py':COMMANDS.dmiCollectionRecovery,
  'scripts/lib/weather_acquisition_plan.py':COMMANDS.dmiCollectionRecovery,
  'scripts/test-dmi-dkss-primary-mode.py':COMMANDS.dmiCollectionRecovery,
  'scripts/lib/account-erasure-outbox-native-fixture.mjs':[ACCOUNT_SCHEMA_SOURCE_TEST],
  'scripts/verify-account-assistant-schema.mjs':[ACCOUNT_SCHEMA_SOURCE_TEST],
  'scripts/verify-account-erasure-schema.mjs':[ACCOUNT_SCHEMA_SOURCE_TEST],
  'scripts/verify-code-only-migration-plan.mjs':[ACCOUNT_SCHEMA_SOURCE_TEST],
  'scripts/audit-cloudflare-trip-storage.mjs':['node scripts/test-hybrid-trip-storage-4.0.287.mjs'],
  'supabase/functions/_shared/account-inactivity-notice.js':[TRIP_LOG_SOURCE_TEST],
  'supabase/functions/_shared/account-lifecycle.js':[TRIP_LOG_SOURCE_TEST,...COMMANDS.ownerErasure],
  'supabase/functions/_shared/inactivity-notice-mail.mjs':[TRIP_LOG_SOURCE_TEST],
  'supabase/functions/trip-log/index.ts':[TRIP_LOG_SOURCE_TEST],
});

// Execution-only lookup for the normal source driver. The complete Git diff
// chooses existing natural owners; this is not a baseline or reuse receipt.
export function currentSourceTargets(relative){
  assert.equal(arguments.length,1);
  if(typeof relative!=='string'||!/^[A-Za-z0-9_.\/-]+$/.test(relative)
    ||relative.startsWith('/')||relative.split('/').some(part=>part==='.'||part==='..'))return null;
  if(Object.hasOwn(SOURCE_EXECUTION_TARGETS,relative))
    return freeze({path:relative,owners:[{area:'sourceExecution',commands:[...SOURCE_EXECUTION_TARGETS[relative]]}]});
  let areas=pathAreas.get(relative);
  if(ASSISTANT_SUCCESSOR_TESTS.has(relative))
    return freeze({path:relative,owners:[{area:'assistantSuccessor',commands:['node '+relative+' --after599-current']}]});
  if(['scripts/validate-source-once.mjs','scripts/source-critical-gate.mjs'].includes(relative))
    return freeze({path:relative,owners:[{area:'sourceDriver',commands:['node scripts/test-source-validation-once.mjs']}]});
  if(relative==='scripts/national584-source-evidence.mjs')areas=['sourceControls'];
  if(!areas&&/^docs\/(?:rdks|ai|handbook)\//.test(relative))areas=['documentation'];
  if(!areas&&['package.json','version.json','data/kystdata.json','data/zones.geojson',
    'docs/handbook/content.json','CHANGELOG.md','AGENTS.md'].includes(relative))areas=['core'];
  if(!areas&&/^scripts\/test-[A-Za-z0-9_.-]+\.mjs$/.test(relative))
    return freeze({path:relative,owners:[{area:'changedTest',commands:['node --test '+relative]}]});
  if(!areas&&/^js\/core\//.test(relative))areas=['runtimeAudit'];
  if(!areas&&/^js\/(?:services|ui)\//.test(relative))areas=['publicUI'];
  if(!areas&&/^js\/(?:map|jordrav)\//.test(relative))areas=['publicUI'];
  if(!areas&&/^knowledge\//.test(relative))areas=['assistantEdge'];
  if(!areas&&/^scripts\/fixtures\/rav-assistant-/.test(relative))areas=['assistantEdge'];
  if(!areas&&/^data\/admin\/ravscore-/.test(relative))areas=['core'];
  if(!areas&&/^scripts\/(?:assistant-later-h0-|build-assistant-later-h0-|check-assistant-later-h0-|run-frozen586-assistant-later-h0-|sync-ravscore-model-binding|integrated-cutover-readiness|read-authenticated-dmi-current-companions|reconcile-private-runtime-checkpoint)/.test(relative))areas=['runtimeAudit'];
  if(!areas&&/^scripts\/lib\/(?:assistant-later-h0-|checkpoint-cas-native-|established-native-current-origin|model-source-imports|authenticated-frozen586-)/.test(relative))areas=['runtimeAudit'];
  if(!areas&&/^scripts\/rollback-assets\//.test(relative))areas=['runtimeAudit'];
  if(!areas&&['scripts/lib/account-statistics-assistant-package-review.mjs',
    'scripts/lib/alternative-c-caller-test-input.mjs','scripts/lib/release-gate-test-plan.mjs'].includes(relative))areas=['historicalTests'];
  if(!areas&&relative==='scripts/source-impact-domain-inputs.mjs')areas=['sourceControls'];
  if(!areas&&relative==='.github/workflows/validate-copernicus-current-pilot.yml')areas=['actionVersions'];
  // SQL is executed by the existing separate native phase. This lookup never
  // represents the preflight as SQL execution or historical qualification.
  if(!areas&&/^supabase\/(?:migrations\/[A-Za-z0-9_.-]+\.sql|schema\.sql|INSTALL-[A-Za-z0-9_.-]+\.sql)$/.test(relative))areas=['core'];
  if(!areas&&/^supabase\/functions\/(?:_shared\/rav-assistant-[A-Za-z0-9_.-]+\.(?:ts|js)|rav-assistant\/[A-Za-z0-9_.-]+\.ts)$/.test(relative))areas=['assistantEdge'];
  if(!areas&&/\.(?:html|css)$/.test(relative))areas=['publicUI'];
  if(!areas||areas.some(area=>!COMMANDS[area]))return null;
  return freeze({path:relative,owners:areas.map(area=>{
    let commands=[...COMMANDS[area]];
    if(area==='sourceControls'){
      const test=relative.replace(/^scripts\/(?!test-)/,'scripts/test-');
      const matching=commands.filter(command=>command.split(' ').includes(test));
      if(matching.length)commands=matching;
      else if(relative==='scripts/national584-source-evidence.mjs')
        commands=commands.filter(command=>command.includes('test-native-postgres-evidence.mjs'));
    }
    return {area,commands};
  })});
}
const PAGES_OWNER_HELPERS=new Set(['scripts/github-pages-attempt-evidence.mjs',
  'scripts/protected-operational-reentry-evidence.mjs']);
const PAGES_FULLY_EXECUTED_TESTS=new Set(COMMANDS.pages.filter(command=>!command.startsWith(PAGES_DEPLOYMENT_COMMAND))
  .flatMap(command=>command.split(' ').filter(file=>file.endsWith('.mjs'))));
const PAGES_SCOPE_CONTROLS=new Set(['scripts/source-current-contract-plan.mjs','scripts/test-source-current-contracts.mjs']);
const PAGES_TRANSPORT_INPUTS=new Set(['scripts/lib/run-sealed-pages-deployment.mjs',
  'scripts/test-ordinary-pages-immediate-retry.mjs']);
const PAGES_PUBLIC_OBSERVER_CLI='scripts/deploy-ordinary-pages-with-immediate-retry.mjs';
export function isAdditivePagesPublicObserverChange(before,after){
  const anchor='    cancelAtDeadline: true, absoluteDeadlineMs: deadline, completionReserveMs: NORMAL_PAGES_COMPLETION_RESERVE_MS,\n';
  const addition='    readPublicTarget: readPublic,\n';
  return typeof before==='string'&&typeof after==='string'&&!before.includes('readPublicTarget')
    &&before.split(anchor).length===2&&after===before.replace(anchor,anchor+addition);
}
const HISTORICAL_UPDATER_PATHS=new Set(PATH_AREAS.historicalUpdaterOracles);
function historicalUpdaterCommandsForChangedInputs(changes){
  const files=changes.filter(row=>HISTORICAL_UPDATER_PATHS.has(row.path)).map(row=>row.path);
  const commands=COMMANDS.historicalUpdaterOracles;
  if(files.includes('scripts/lib/archived-weather-restart-updater-test-input.mjs'))return commands;
  return commands.filter((command,index)=>files.some(file=>index===0
    ?!['scripts/test-weather-update-entrypoint.mjs','scripts/test-weather-history-retention-4.0.209.mjs'].includes(file)
    :command.split(' ').includes(file)));
}
const historicalPaths=new Set(PATH_AREAS.historicalTests);
const pathAreas=new Map();
for(const [area,files]of Object.entries(PATH_AREAS))for(const file of files){
  if(!pathAreas.has(file))pathAreas.set(file,[]);pathAreas.get(file).push(area);
}


// Datavalg alene. Den normale Gitplan validerer fortsat hele inventaret,
// beskyttede input og installerens DDL, foer kommandoerne bruges.
export function pagesContractCommandsForChangedInputs(changes){
  const regular=row=>row.status==='M'&&row.beforeMode==='100644'&&row.afterMode==='100644';
  const transport=row=>PAGES_TRANSPORT_INPUTS.has(row.path)
    ||(row.path===PAGES_PUBLIC_OBSERVER_CLI&&row.pagesPublicObserverOnly===true);
  if(!Array.isArray(changes)||!changes.length
    ||changes.some(row=>!row||typeof row.path!=='string')
    ||new Set(changes.map(row=>row.path)).size!==changes.length)return COMMANDS.pages;
  if(changes.some(transport)){
    const documentation=row=>(pathAreas.get(row.path)?.every(area=>area==='documentation')
      &&!row.path.endsWith('.mjs'))||/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(row.path);
    if(changes.every(row=>regular(row)&&(transport(row)
      ||PAGES_SCOPE_CONTROLS.has(row.path)||documentation(row))))
      return freeze(COMMANDS.pages.filter(command=>!command.startsWith(PAGES_DEPLOYMENT_COMMAND)));
    return COMMANDS.pages;
  }
  if(!changes.some(row=>PAGES_OWNER_HELPERS.has(row.path)&&regular(row)))return COMMANDS.pages;
  for(const row of changes){
    if(PAGES_OWNER_HELPERS.has(row.path)||PAGES_FULLY_EXECUTED_TESTS.has(row.path)||PAGES_SCOPE_CONTROLS.has(row.path)){
      if(!regular(row))return COMMANDS.pages;
    }else if(!(pathAreas.get(row.path)?.every(area=>area==='documentation')
      ||/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(row.path)))return COMMANDS.pages;
  }
  return freeze(COMMANDS.pages.filter(command=>command!==PAGES_PUBLIC_VERIFICATION_COMMAND));
}

// Narrow control ownership still requires normal whole tests and independent review.
const SOURCE_CONTROL_PLANNER_INPUTS=new Set(['scripts/source-current-contract-plan.mjs',
  'scripts/test-source-current-contracts.mjs']);
const SOURCE_CONTROL_CADENCE_INPUTS=new Set(['scripts/check-weather-cadence-watchdog.mjs',
  'scripts/read-weather-cadence-github.mjs',
  'scripts/test-weather-cadence-watchdog.mjs']);
const SOURCE_CONTROL_CADENCE_COMMANDS=freeze([WEATHER_CADENCE_SOURCE_COMMAND]);
const SOURCE_CONTROL_PLANNER_COMMANDS=freeze([
  'node --test scripts/test-source-current-contracts.mjs',
  'node scripts/test-source-impact-workflow.mjs',
  'node scripts/test-weather-source-gate.mjs',
  WEATHER_CADENCE_SOURCE_COMMAND,
]);
export function sourceControlCommandsForChangedInputs(changes){
  if(!Array.isArray(changes)||!changes.length
    ||changes.some(row=>!row||typeof row.path!=='string')
    ||new Set(changes.map(row=>row.path)).size!==changes.length)return COMMANDS.sourceControls;
  const controls=changes.filter(row=>sourceControlPaths.has(row.path));
  if(!controls.length||controls.some(row=>row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
    return COMMANDS.sourceControls;
  if(controls.every(row=>SOURCE_CONTROL_CADENCE_INPUTS.has(row.path)))
    return SOURCE_CONTROL_CADENCE_COMMANDS;
  if(controls.every(row=>SOURCE_CONTROL_PLANNER_INPUTS.has(row.path)))
    return SOURCE_CONTROL_PLANNER_COMMANDS;
  return COMMANDS.sourceControls;
}

function publicDigests(analysis){
  return {
    postgresBefore:analysis.actualPostgresInput.before.inputSha256,
    postgresAfter:analysis.actualPostgresInput.after.inputSha256,
    CBefore:analysis.models.C.before.bundleSha256,CAfter:analysis.models.C.after.bundleSha256,
    IBefore:analysis.models.I.before.bundleSha256,IAfter:analysis.models.I.after.bundleSha256,
    TBefore:analysis.models.T.before.implementationSha256,TAfter:analysis.models.T.after.implementationSha256,
  };
}

// Only the added comparator checks can use the narrow route for the two
// existing fixtures. Changes elsewhere retain the regular FULL route.
function dkssRawAuditFixtureBase(file,source){
  const native=file===DKSS_RAW_NATIVE_FIXTURE;
  const start=native?'\n\n                # Reuse the actual ecCodes GRIB1 fixture.'
    :"test('offline DKSS audit input uses the normal admitted H0 row and exact native endpoints'";
  const end=native?'\n            finally:\n                eccodes.codes_release(gid)'
    :"test('normal original-wire identity uses exact Python round seven with measured IEEE parity'";
  const addition=source.indexOf(start);
  if(addition<0)return source;
  const remainder=source.indexOf(end,addition+start.length);
  if(remainder<0||source.indexOf(start,addition+start.length)>=0)return null;
  const withoutAudit=source.slice(0,addition)+source.slice(remainder);
  if(!native)return withoutAudit;
  const imported='            from lib.dkss_current_raw_audit import check_dkss_current_original\n\n';
  return withoutAudit.split(imported).length===2?withoutAudit.replace(imported,''):null;
}

// INSTALL-filen indeholder både DDL og håndbog. Kun en faktisk håndbogsændring
// må få docs-ruten. Hver sides payload matches mod dens EGEN Git-håndbog;
// hele resten sammenlignes. Ingen gamle eller nye godkendte blobpar.
function readCommittedText(ref,file,regular=false){
  const env={...Object.fromEntries(['PATH','Path','SystemRoot','WINDIR','TEMP','TMP']
    .filter(key=>typeof process.env[key]==='string').map(key=>[key,process.env[key]])),
    GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',
    GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',
    GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',
    GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'protocol.allow',GIT_CONFIG_VALUE_0:'never'};
  const read=(ref,file)=>{
    if(regular){
      const entry=execFileSync('git',['-C',ROOT,'ls-tree','-z',ref,'--',file],
        {env,timeout:10000,maxBuffer:262144,stdio:['pipe','pipe','pipe']}).toString('utf8');
      assert(Buffer.byteLength(entry)<=4096,'Bounded restore Git entry required');
      const match=/^100644 blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(entry);
      assert(match&&match[2]===file,'Existing regular restore input required');
    }
    const raw=execFileSync('git',['-C',ROOT,'cat-file','blob',ref+':'+file],
      {env,timeout:10000,maxBuffer:MAX_COMMITTED_TEXT_BYTES,stdio:['pipe','pipe','pipe']});
    assert(raw.length>0&&raw.length<=MAX_COMMITTED_TEXT_BYTES);
    const source=new TextDecoder('utf-8',{fatal:true}).decode(raw);
    if(regular)assert(Buffer.from(source).equals(raw),'Exact restore source bytes required');
    return source;
  };
  return read(ref,file);
}

function installerIsHandbookOnly(input){
  const project=ref=>{
    const sql=readCommittedText(ref,INSTALLER),book=JSON.parse(readCommittedText(ref,'docs/handbook/content.json'));
    const statement="insert into public.admin_documents(document_key,payload,updated_by) values('handbook','"
      +JSON.stringify(book).replaceAll("'","''")+"'::jsonb,null)";
    const parts=sql.split(statement);assert.equal(parts.length,2);
    return parts[0]+'<CURRENT_SOURCE_HANDBOOK_INSERT>'+parts[1];
  };
  return project(input.baselineCommit)===project(input.candidateCommit);
}

function normalizePagesSavedPairAdmission(source) {
  const name='      - name: Verify the exact saved pair before fresh weather after a closed Pages failure\n';
  const start=source.indexOf(name);
  if(start<0||source.indexOf(name,start+1)>=0)return {source,updated:false};
  const next=source.indexOf('\n      - ',start+name.length);
  const end=next<0?source.length:next;
  const step=source.slice(start,end);
  const actionLine='          RAVRADAR_PAGES_REPEAT_ACTION: ${{ steps.operational-action.outputs.action }}\n';
  const pairedInputs='          PAIRED_ROUTE_REQUIRED: ${{ steps.paired-checkpoint-route.outputs.required }}\n'
    +'          PAIRED_ROUTE_OUTCOME: ${{ steps.paired-checkpoint-route.outcome }}\n'
    +'          PAIRED_RECONCILE_OUTCOME: ${{ steps.paired-checkpoint-reconcile.outcome }}\n'
    +'          PAIRED_RECONCILE_PROVED: ${{ steps.paired-checkpoint-reconcile.outputs.paired }}\n';
  const oldGuard='          test "${{ steps.paired-checkpoint-route.outputs.required }}" != true\n';
  const newGuard='          case "$PAIRED_ROUTE_REQUIRED:$PAIRED_ROUTE_OUTCOME" in\n'
    +'            false:success|:skipped) ;;\n'
    +'            true:success) test "$PAIRED_RECONCILE_OUTCOME:$PAIRED_RECONCILE_PROVED" = success:true ;;\n'
    +'            *) exit 1 ;;\n'
    +'          esac\n';
  if(step.split(actionLine+pairedInputs).length!==2||step.split(newGuard).length!==2)return {source,updated:false};
  const restored=step.replace(actionLine+pairedInputs,actionLine).replace(newGuard,oldGuard);
  return {source:source.slice(0,start)+restored+source.slice(end),updated:true};
}

// Det brede vejrworkflow er ikke en Pages-ejendom. Kun den kendte
// læsevej for gemt vejr og de to GH_TOKEN-felter kan afgrænses her.
// Prædikatet kan prøves på syntetiske strenge, men giver ingen gateautoritet.
export function isPagesOnlyWeatherBuildChange(before,after){
  try{
    const project=(source,requireToken)=>{
      assert.equal(typeof source,'string');assert(Buffer.byteLength(source)<=4*1024*1024);
      assert(!source.includes('\r'));
      const unique=pattern=>{const found=[...source.matchAll(pattern)];assert.equal(found.length,1);return found[0].index;};
      const jobs=unique(/^jobs:\n/gm);
      const job=unique(/^  build-and-prepare:\n/gm);assert(job>jobs);
      const following=source.slice(job+'  build-and-prepare:\n'.length).search(/^  [A-Za-z0-9_-]+:\n/m);
      const jobEnd=following<0?source.length:job+'  build-and-prepare:\n'.length+following;
      const steps=unique(/^    steps:\n/gm);assert(steps>job&&steps<jobEnd);
      const edits=[],token='          GH_TOKEN: ${{ github.token }}\n';
      for(const name of [
        'Current-grid pre-activation - Backfill the exact active source into durable protected evidence',
        'Preserve durable incomplete current-grid publication before any Edge write',
      ]){
        const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
        const at=unique(new RegExp('^      - name: '+escaped+'\\n','gm'));
        assert(at>steps&&at<jobEnd);
        const next=source.slice(at+1).search(/^      - /m);
        const end=Math.min(next<0?jobEnd:at+1+next,jobEnd),step=source.slice(at,end);
        const envs=[...step.matchAll(/^        env:\n/gm)];assert.equal(envs.length,1);
        const envStart=envs[0].index+'        env:\n'.length;
        const field=step.slice(envStart).search(/^        \S/m);
        const env=step.slice(envStart,field<0?step.length:envStart+field);
        const lines=env.split('\n').filter(line=>line.trim());
        assert(lines.every(line=>/^          [A-Z_][A-Z0-9_]*: [^\r\n]+$/.test(line)));
        const tokens=lines.filter(line=>/^          GH_TOKEN:/.test(line));
        assert(tokens.length<2&&(!requireToken||tokens.length===1));
        if(tokens.length){
          assert.equal(tokens[0]+'\n',token);
          const offset=env.indexOf(token);assert(offset>=0&&env.indexOf(token,offset+1)<0);
          edits.push({offset:at+envStart+offset,length:token.length});
        }
      }
      let result=source;
      for(const edit of edits.sort((a,b)=>b.offset-a.offset))
        result=result.slice(0,edit.offset)+result.slice(edit.offset+edit.length);
      return result;
    };
    const previous=normalizePagesSavedPairAdmission(before);
    const candidate=normalizePagesSavedPairAdmission(after);
    return (!previous.updated||candidate.updated)
      &&project(previous.source,false)===project(candidate.source,true);
  }catch{return false;}
}


// Diagnostic support ownership only. Remove the two exact named steps on each
// side and preserve every other byte. The candidate is one fixed metadata CLI;
// its changed source/control still requires independent normal qualification.
export function isSupportOnlyWeatherBuildChange(before, after) {
  try {
    assert(typeof before === 'string' && typeof after === 'string' && before !== after);
    const take = source => {
      assert(!source.includes('\r') && Buffer.byteLength(source) <= 4 * 1024 * 1024);
      const build = '      - name: Build RavRadar support package\n';
      const upload = '      - name: Upload RavRadar support package\n';
      assert.equal(source.split(build).length, 2); assert.equal(source.split(upload).length, 2);
      const start = source.indexOf(build), middle = source.indexOf(upload);
      assert(start > source.indexOf('    steps:\n') && middle > start);
      assert.equal(source.indexOf('\n      - ', start + 1) + 1, middle);
      const next = source.indexOf('\n      - ', middle + 1);
      assert(next > middle);
      return { build: source.slice(start, middle), upload: source.slice(middle, next + 1),
        rest: source.slice(0, start) + source.slice(next + 1) };
    };
    const a = take(before), b = take(after);
    assert.equal(a.rest, b.rest); assert.equal(a.upload, b.upload);
    const fixed = [
      '      - name: Build RavRadar support package',
      '        continue-on-error: true', '        if: always()', '        run: |',
      '          rm -rf _support', '          mkdir -p _support/run-metadata',
      '          node scripts/write-support-run-metadata.mjs',
      '          (cd _support && zip -qr ../RavRadar-support-' + '$' + '{{ github.run_number }}.zip .)', '', '',
    ].join('\n');
    assert.equal(b.build, fixed);
    return true;
  } catch { return false; }
}

// Compose only the two existing owners. Restoring the predecessor support
// block must leave exactly the existing two-field Pages change; the second
// comparison independently proves the fixed metadata-only support change.
export function isPagesAndSupportOnlyWeatherBuildChange(before, after) {
  try {
    const take = source => {
      assert(typeof source === 'string' && !source.includes('\r')
        && Buffer.byteLength(source) <= 4 * 1024 * 1024);
      const build = '      - name: Build RavRadar support package\n';
      const upload = '      - name: Upload RavRadar support package\n';
      assert.equal(source.split(build).length, 2); assert.equal(source.split(upload).length, 2);
      const start = source.indexOf(build), end = source.indexOf(upload);
      assert(start >= 0 && end > start);
      assert.equal(source.indexOf('\n      - ', start + 1) + 1, end);
      return { start, end, block: source.slice(start, end) };
    };
    const a = take(before), b = take(after);
    const normalizedAfter = after.slice(0, b.start) + a.block + after.slice(b.end);
    return isPagesOnlyWeatherBuildChange(before, normalizedAfter)
      && isSupportOnlyWeatherBuildChange(normalizedAfter, after);
  } catch { return false; }
}

// Pure security-frame comparison only. The whole changed body still needs
// independent control review and its actual credential-free --self-test.
export function isBoundedLocalRestoreFixtureChange(before,after){
  try{
    const readFrame=source=>{
      assert(typeof source==='string'&&!source.includes('\r')&&!source.includes('\0')
        &&Buffer.byteLength(source)<=MAX_COMMITTED_TEXT_BYTES);
      const imports=source.indexOf(LOCAL_RESTORE_IMPORTS),dispatch=source.indexOf(LOCAL_RESTORE_DISPATCH);
      assert(imports>0&&dispatch>imports);
      assert.equal(source.indexOf(LOCAL_RESTORE_IMPORTS,imports+1),-1);
      assert.equal(source.indexOf(LOCAL_RESTORE_DISPATCH,dispatch+1),-1);
      return {imports:source.slice(0,imports),dispatch:source.slice(dispatch)};
    };
    const previous=readFrame(before),current=readFrame(after);
    if(previous.imports!==current.imports)return false;
    if(previous.dispatch===current.dispatch)return true;
    const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
    if(sha(previous.imports)!==LOCAL_RESTORE_IMPORTS_SHA256)return false;
    const matchesLegacyDispatch=frame=>{
      if(frame.includes('--run-archive-inventory')){
        assert.equal(frame.split(LOCAL_RESTORE_INVENTORY_DISPATCH).length,2);
        frame=frame.replace(LOCAL_RESTORE_INVENTORY_DISPATCH,'');
      }
      return sha(frame)===LOCAL_RESTORE_DISPATCH_SHA256;
    };
    return matchesLegacyDispatch(previous.dispatch)&&matchesLegacyDispatch(current.dispatch);
  }catch{return false;}
}

// Only the manual archive's outer queue may change with a reviewed fixture body.
// Raw UTF-8 equality preserves every other workflow byte and the inner trip lock.
export function isArchiveRestoreOuterQueueOnlyChange(before,after){
  if([before,after].some(source=>typeof source!=='string'||source.includes('\r')
    ||source.includes('\0')||Buffer.byteLength(source)>256*1024))return false;
  const oldLine="  group: ${{ inputs.restore_mode == 'archive' && 'ravradar-weather-production-v2' || 'ravradar-synthetic-standard-local-restore' }}\n";
  const newLine="  group: ${{ inputs.restore_mode == 'archive' && 'ravradar-isolated-archive-restore' || 'ravradar-synthetic-standard-local-restore' }}\n";
  if(before.split(oldLine).length!==2||before.includes(newLine)
    ||after.split(newLine).length!==2||after.includes(oldLine))return false;
  if(!before.includes('\nconcurrency:\n'+oldLine)||!after.includes('\nconcurrency:\n'+newLine))return false;
  return after.replace(newLine,oldLine)===before;
}


// Lukket ny inventory-rolle. Kun dens faste CLI, archive-familie og læsetrin
// føres tilbage til den gamle form; øvrige workflowbytes skal stadig matche.
const LOCAL_RESTORE_INVENTORY_STEP=[
  "      - name: Read only the authenticated archive vendor-target inventory without Docker or SQL",
  "        if: inputs.restore_mode == 'archive-inventory'",
  "        timeout-minutes: 23",
  "        env:",
  "          EXPECTED_HEAD_SHA: ${{ inputs.expected_head }}",
  "          RESTORE_ARCHIVE_INDEX_COMMITMENT: ${{ inputs.archive_index_commitment }}",
  "          RESTORE_ARCHIVE_CONFIRMATION: ${{ inputs.archive_confirmation }}",
  "          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}",
  "          RAVRADAR_R2_ACCOUNT_ID: ${{ secrets.RAVRADAR_R2_ACCOUNT_ID }}",
  "          RAVRADAR_R2_ACCESS_KEY_ID: ${{ secrets.RAVRADAR_R2_ACCESS_KEY_ID }}",
  "          RAVRADAR_R2_SECRET_ACCESS_KEY: ${{ secrets.RAVRADAR_R2_SECRET_ACCESS_KEY }}",
  "        run: node scripts/test-supabase-cli-local-restore.mjs --run-archive-inventory",
  ""
].join('\n');
const LOCAL_RESTORE_INVENTORY_WORKFLOW_EDITS=[
  [
    "        description: Synthetic by default; archive restores locally; archive-inventory reads only authenticated target metadata\n",
    "        description: Synthetic by default; archive restores only to an owned isolated local project\n"
  ],
  [
    "        description: Domain-separated commitment for an already authenticated archive index; archive modes only\n",
    "        description: Domain-separated commitment for an already authenticated archive index; archive mode only\n"
  ],
  [
    "        description: RESTORE-PRIVATE-ARCHIVE-IN-ISOLATED-LOCAL-POSTGRES; archive modes only\n",
    "        description: RESTORE-PRIVATE-ARCHIVE-IN-ISOLATED-LOCAL-POSTGRES; archive mode only\n"
  ],
  [
    "        options: [synthetic, archive, archive-inventory]\n",
    "        options: [synthetic, archive]\n"
  ],
  [
    "  group: ${{ (inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory') && 'ravradar-isolated-archive-restore' || 'ravradar-synthetic-standard-local-restore' }}\n",
    "  group: ${{ inputs.restore_mode == 'archive' && 'ravradar-isolated-archive-restore' || 'ravradar-synthetic-standard-local-restore' }}\n"
  ],
  [
    "      group: ${{ (inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory') && 'ravradar-trip-storage-production' || format('ravradar-synthetic-standard-local-restore-{0}', github.run_id) }}\n",
    "      group: ${{ inputs.restore_mode == 'archive' && 'ravradar-trip-storage-production' || format('ravradar-synthetic-standard-local-restore-{0}', github.run_id) }}\n"
  ],
  [
    "            archive|archive-inventory)\n",
    "            archive)\n"
  ],
  [
    "      - uses: supabase/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf\n        if: inputs.restore_mode != 'archive-inventory'\n",
    "      - uses: supabase/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf\n"
  ]
];
export function archiveRestoreWorkflowWithoutInventory(source){
  assert(typeof source==='string'&&!source.includes('\r')&&!source.includes('\0')&&Buffer.byteLength(source)<=256*1024);
  if(!source.includes('archive-inventory'))return source;
  assert.equal(source.split(LOCAL_RESTORE_INVENTORY_STEP).length,2);
  assert(source.endsWith(LOCAL_RESTORE_INVENTORY_STEP));
  let original=source.slice(0,-LOCAL_RESTORE_INVENTORY_STEP.length);
  for(const [inventory,previous]of LOCAL_RESTORE_INVENTORY_WORKFLOW_EDITS){
    assert.equal(original.split(inventory).length,2);
    original=original.replace(inventory,previous);
  }
  const inventoryIf="        if: inputs.restore_mode == 'archive' || inputs.restore_mode == 'archive-inventory'\n";
  assert.equal(original.split(inventoryIf).length,4);
  original=original.replaceAll(inventoryIf,"        if: inputs.restore_mode == 'archive'\n");
  assert(!original.includes('archive-inventory'));
  return original;
}
export function isArchiveRestoreWorkflowChange(before,after){
  try{
    const previous=archiveRestoreWorkflowWithoutInventory(before);
    const current=archiveRestoreWorkflowWithoutInventory(after);
    return previous===current||isArchiveRestoreOuterQueueOnlyChange(previous,current);
  }catch{return false;}
}

// Narrow scheduling ownership; source review and actual normal tests remain required.
const DMI_BUDGET_PATHS=new Set(['scripts/plan-dmi-recovery.py','scripts/lib/dmi_adaptive_recovery.py',
  'scripts/run-dmi-bulk-supervised.py','scripts/update-dmi-bulk.py',
  'scripts/test-plan-dmi-recovery.py','scripts/test-dmi-budget-rotation-4.0.189.mjs']);
function dmiText(s){assert(typeof s==='string'&&!s.includes('\r')&&Buffer.byteLength(s)<=4*1024*1024);return s;}
function dmiUnique(s,marker){assert.equal(s.split(marker).length,2);return s.indexOf(marker);}
function dmiStep(s,name){
  dmiText(s);const start=dmiUnique(s,'      - name: '+name+'\n');
  const job=dmiUnique(s,'  build-and-prepare:\n'),steps=dmiUnique(s,'    steps:\n');assert(job<steps&&steps<start);
  const next=s.indexOf('\n      - ',start+1);assert(next>start);return {start,end:next+1,body:s.slice(start,next+1)};
}
// Fixed normal wiring of the moved budget call, not a blob/cohort hash. Other
// workflow bodies and every acquisition/deploy/budget-limit field stay exact.
const DMI_MOVED_BUDGET_STEP="      - name: Choose DMI budget from retained five-component PART coverage\n        id: dmi-recovery-budget\n        if: inputs.completed_private_runtime != true && (steps.preflight.outputs.should_run == 'true' && steps.weather-source-handoff.outputs.reused != 'true')\n        shell: bash\n        env:\n          DMI_PLANNING_SNAPSHOT: ${{ steps.dmi-recovery-snapshot.outputs.cache_path }}\n          DMI_PART_CONTINUITY_DONOR_PATH: ${{ steps.restored-dmi-part-continuity-donor.outputs.path }}\n        run: |\n          set -euo pipefail\n          qualified_args=(--qualified-plan .cache/weather-qualified-acquisition-plan.json\n            --current-plan .cache/weather-current-acquisition-plan.json\n            --scalar-snapshot \"$DMI_PLANNING_SNAPSHOT\")\n          if test -n \"$DMI_PART_CONTINUITY_DONOR_PATH\"; then\n            qualified_args+=(--scalar-history \"$DMI_PART_CONTINUITY_DONOR_PATH\")\n          fi\n          python scripts/plan-dmi-recovery.py \\\n            --cache \"$DMI_PLANNING_SNAPSHOT\" \\\n            --parts data/live/coastal-parts-v2.json \\\n            --at \"$RAVRADAR_PRODUCTION_TARGET_HOUR\" \\\n            \"${qualified_args[@]}\" \\\n            --github-output \"$GITHUB_OUTPUT\"\n          printf 'cache_path=%s\\n' \"$DMI_PLANNING_SNAPSHOT\" >> \"$GITHUB_OUTPUT\"\n\n";
function restoreOwnedDmiBudgetSteps(before,after){
  const oldBudget=dmiStep(before,'Choose DMI budget from retained five-component PART coverage');
  const oldPlan=dmiStep(before,'Plan global current acquisition before DMI');
  const snapshot=dmiStep(after,'Prepare retained DMI planning snapshot');
  const plan=dmiStep(after,'Plan global current acquisition before DMI');
  const budget=dmiStep(after,'Choose DMI budget from retained five-component PART coverage');
  assert.equal(oldBudget.end,oldPlan.start);assert.equal(snapshot.end,plan.start);assert.equal(plan.end,budget.start);
  assert.equal(budget.body,DMI_MOVED_BUDGET_STEP);
  const callStart=dmiUnique(oldBudget.body,'          python scripts/plan-dmi-recovery.py \\\n');
  const printf="          printf 'cache_path=%s\\n' ",callEnd=dmiUnique(oldBudget.body,printf);assert(callStart<callEnd);
  const restored=snapshot.body.replace('      - name: Prepare retained DMI planning snapshot\n',
    '      - name: Choose DMI budget from retained five-component PART coverage\n')
    .replace('        id: dmi-recovery-snapshot\n','        id: dmi-recovery-budget\n');
  const insert=dmiUnique(restored,printf);
  assert.equal(restored.slice(0,insert)+oldBudget.body.slice(callStart,callEnd)+restored.slice(insert),oldBudget.body);
  assert.equal(plan.body.replaceAll('steps.dmi-recovery-snapshot.outputs.cache_path',
    'steps.dmi-recovery-budget.outputs.cache_path'),oldPlan.body);
  return after.slice(0,snapshot.start)+before.slice(oldBudget.start,oldPlan.end)+after.slice(budget.end);
}
export function dmiBudgetWeatherBuildAreas(before,after){
  try{assert(before!==after);if(isPrivateWeatherPublicationWorkflowChange(before,after))return ['weatherPublication'];
    const oldPublication=inversePrivateWeatherPublicationWorkflow(Buffer.from(before)).toString('utf8');
    const nextPublication=inversePrivateWeatherPublicationWorkflow(Buffer.from(after)).toString('utf8');
    const hadPublication=oldPublication!==before,hasPublication=nextPublication!==after;
    if(hadPublication||hasPublication){
      if(hadPublication&&!hasPublication)return null;
      // At most one recursion: both normal forms now contain only the old entry.
      const areas=dmiBudgetWeatherBuildAreas(oldPublication,nextPublication)
        ??(isPagesOnlyWeatherBuildChange(oldPublication,nextPublication)?['pages']
          :isSupportOnlyWeatherBuildChange(oldPublication,nextPublication)?['workflowSupport']
          :isPagesAndSupportOnlyWeatherBuildChange(oldPublication,nextPublication)?['pages','workflowSupport']:null);
      return areas?(hadPublication?areas:[...areas,'weatherPublication']):null;
    }
    const restored=restoreOwnedDmiBudgetSteps(before,after);
    if(restored===before)return ['dmiBudget'];
    if(isPagesOnlyWeatherBuildChange(before,restored))return ['pages','dmiBudget'];
    if(isSupportOnlyWeatherBuildChange(before,restored))return ['workflowSupport','dmiBudget'];
    if(isPagesAndSupportOnlyWeatherBuildChange(before,restored))return ['pages','workflowSupport','dmiBudget'];
    return null;
  }catch{return null;}
}
export function isDmiBudgetOnlyUpdaterChange(before,after){
  try{assert(before!==after);const project=s=>{
    dmiText(s);const imports=[...s.matchAll(/^from lib\.dmi_adaptive_recovery import ([^\n]+)\n/gm)];assert.equal(imports.length,1);
    assert(['EXTENDED_RUNTIME_SECONDS, next_adaptive_recovery',
      'extended_runtime_profile_selected, next_adaptive_recovery'].includes(imports[0][1]));
    const selected='    selected_runtime_budget = os.getenv("DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS")\n';
    const legacy='    extended_recovery = (os.getenv("DMI_BULK_ADAPTIVE_RECOVERY", "false").lower() == "true"\n';
    const start=dmiUnique(s,s.includes(selected)?selected:legacy),end=dmiUnique(s,'    if adaptive_recovery is not None:\n');
    assert(start<end&&end-start<8192&&start>s.indexOf('\ndef main()'));
    const body=s.slice(start,end);assert.equal(body.split('    adaptive_recovery = next_adaptive_recovery(\n').length,2);
    assert(body.split('\n').every(line=>!line||line.startsWith('    ')));
    return (s.slice(0,start)+'<DMI_SELECTED_PROFILE_REGISTRATION>\n'+s.slice(end))
      .replace(imports[0][0],'<DMI_ADAPTIVE_BUDGET_IMPORT>\n');
  };return project(before)===project(after);}catch{return false;}
}
export function isDmiBudgetOnlySupervisorChange(before,after){
  try{dmiText(before);dmiText(after);assert(before!==after);
    const addition='    # Preserve the actually selected envelope, not a rounded child remainder.\n'
      +'    # Overwrite caller input; this metadata neither resets nor extends deadline.\n'
      +'    environment["DMI_BULK_SUPERVISOR_TOTAL_RUNTIME_SECONDS"] = str(total_runtime)\n';
    const deadline='    deadline = time.monotonic() + total_runtime\n';dmiUnique(before,deadline);dmiUnique(after,deadline);
    assert.equal(after.split(addition).length,2);assert(after.includes(addition+deadline));
    return after.replace(addition,'')===before;
  }catch{return false;}
}

// Collection failure classification only. These anchored source edits restore
// the complete prior updater text; decoding, ledger, RAW, identity and deadlines
// are outside this owner. This is not a whole-blob/hash exception.
const DMI_COLLECTION_RECOVERY_EDITS=Object.freeze([
  [
    "DOWNLOAD_SESSION.headers.update({\"Accept\": \"application/x-grib, application/octet-stream, */*\"})\n\nPARSER_VERSION = 20\nPARAMETER_MAP_VERSION = 4\nGRID_LOOKUP_VERSION = 9\nWAVE_ASSET_ADMISSION_POLICY = \"per-part-atomic-owner-v2\"\n",
    "DOWNLOAD_SESSION.headers.update({\"Accept\": \"application/x-grib, application/octet-stream, */*\"})\n\nPARSER_VERSION = 20\nUNRECOGNIZED_PARAMETERS_CLASSIFICATION_REVISION = 1\nPARAMETER_MAP_VERSION = 4\nGRID_LOOKUP_VERSION = 9\nWAVE_ASSET_ADMISSION_POLICY = \"per-part-atomic-owner-v2\"\n"
  ],
  [
    "        entry[\"failureClass\"] = None\n        entry[\"blockedParserVersion\"] = None\n        entry[\"consecutiveFailures\"] = 0\n    return epoch(entry.get(\"nextEligibleAt\")) <= now_value\n\n\ndef wam_runtime_reserve(\n",
    "        entry[\"failureClass\"] = None\n        entry[\"blockedParserVersion\"] = None\n        entry[\"consecutiveFailures\"] = 0\n    classification_revision = entry.get(\"unrecognizedParametersClassificationRevision\", 0)\n    unrecognized_classification_obsolete = (\n        entry.get(\"failureClass\") == \"parser-blocked\"\n        and entry.get(\"lastError\") == (\n            \"GRIB downloaded but no required RavRadar parameters were recognized\"\n        )\n        and type(classification_revision) is int\n        and 0 <= classification_revision < UNRECOGNIZED_PARAMETERS_CLASSIFICATION_REVISION\n    )\n    # This only admits the next ordinary budgeted assessment. A read or an\n    # interrupted/empty turn must not claim that the new classifier was used.\n    return unrecognized_classification_obsolete or epoch(entry.get(\"nextEligibleAt\")) <= now_value\n\n\ndef wam_runtime_reserve(\n"
  ],
  [
    "                    } if bootstrap_operational_wam else {}),\n                    \"assetsSkippedBySupervisor\": 0,\n                    \"assetsSkippedPreviouslyProcessed\": 0,\n                    \"assetsDeferredValidRefresh\": 0,\n                    \"assetsBoundedRefreshAttempted\": 0,\n                    \"assetsBoundedRefreshCompleted\": 0,\n",
    "                    } if bootstrap_operational_wam else {}),\n                    \"assetsSkippedBySupervisor\": 0,\n                    \"assetsSkippedPreviouslyProcessed\": 0,\n                    \"assetsTraversedThisTurn\": 0,\n                    \"assetsDeferredValidRefresh\": 0,\n                    \"assetsBoundedRefreshAttempted\": 0,\n                    \"assetsBoundedRefreshCompleted\": 0,\n"
  ],
  [
    "                    regional_proxy_collection_completed = True\n                if not interrupted and bootstrap_operational_wam:\n                    run_info[\"assetsObserved\"] += 1\n                recognized.update(found)\n                run_info[\"recognizedParameters\"] = sorted(recognized)\n                result[\"diagnostics\"][\"messagesSeen\"] += messages_seen\n",
    "                    regional_proxy_collection_completed = True\n                if not interrupted and bootstrap_operational_wam:\n                    run_info[\"assetsObserved\"] += 1\n                run_info[\"assetsTraversedThisTurn\"] += 1\n                if (\n                    found\n                    and state.get(\"failureClass\") == \"parser-blocked\"\n                    and state.get(\"lastError\") == (\n                        \"GRIB downloaded but no required RavRadar parameters were recognized\"\n                    )\n                ):\n                    state[\"failureClass\"] = None\n                    state[\"blockedParserVersion\"] = None\n                    state[\"lastError\"] = None\n                    state[\"nextEligibleAt\"] = None\n                recognized.update(found)\n                run_info[\"recognizedParameters\"] = sorted(recognized)\n                result[\"diagnostics\"][\"messagesSeen\"] += messages_seen\n"
  ],
  [
    "                    result[\"runs\"][collection] = previous_run\n                else:\n                    result[\"runs\"].pop(collection, None)\n            elif not made_progress and collection_assets_complete and recognized >= required and run_info[\"assetsSkippedPreviouslyProcessed\"] == len(assets):\n                state[\"lastCheckedAt\"] = generated\n                state[\"referenceTime\"] = collection_reference_time\n",
    "                    result[\"runs\"][collection] = previous_run\n                else:\n                    result[\"runs\"].pop(collection, None)\n            elif (\n                collection_is_maintenance\n                and not recognized\n                and run_info[\"assetsTraversedThisTurn\"] == 0\n                and not budget_stop\n            ):\n                # No GRIB was traversed: unfinished critical work is outside\n                # this maintenance turn, not evidence of a parser failure.\n                state[\"lastCheckedAt\"] = generated\n                result[\"diagnostics\"][\"zeroProgressCollections\"].append(collection)\n                if previous_run:\n                    result[\"runs\"][collection] = previous_run\n                else:\n                    result[\"runs\"].pop(collection, None)\n            elif not made_progress and collection_assets_complete and recognized >= required and run_info[\"assetsSkippedPreviouslyProcessed\"] == len(assets):\n                state[\"lastCheckedAt\"] = generated\n                state[\"referenceTime\"] = collection_reference_time\n"
  ],
  [
    "            state[\"lastError\"] = message\n            state[\"failureClass\"] = failure_class\n            state[\"blockedParserVersion\"] = PARSER_VERSION if (parser_blocked or parser_exception) else None\n            state[\"nextEligibleAt\"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace(\"+00:00\", \"Z\")\n            result[\"diagnostics\"][\"errors\"].append({\n                \"collection\": collection,\n",
    "            state[\"lastError\"] = message\n            state[\"failureClass\"] = failure_class\n            state[\"blockedParserVersion\"] = PARSER_VERSION if (parser_blocked or parser_exception) else None\n            if (\n                failure_code == \"GRIB_PARAMETERS_UNRECOGNIZED\"\n                and run_info[\"assetsTraversedThisTurn\"] > 0\n                and not budget_stop\n            ):\n                state[\"unrecognizedParametersClassificationRevision\"] = (\n                    UNRECOGNIZED_PARAMETERS_CLASSIFICATION_REVISION\n                )\n            state[\"nextEligibleAt\"] = datetime.fromtimestamp(time.time() + delay_minutes * 60, timezone.utc).isoformat().replace(\"+00:00\", \"Z\")\n            result[\"diagnostics\"][\"errors\"].append({\n                \"collection\": collection,\n"
  ]
]);
const DMI_COLLECTION_RECOVERY_PATHS=new Set(['scripts/update-dmi-bulk.py','scripts/test-dmi-dkss-primary-mode.py']);
function restoreDmiCollectionRecoverySource(source){
  dmiText(source);let restored=source;
  for(const [prior,next]of DMI_COLLECTION_RECOVERY_EDITS){
    dmiUnique(restored,next);restored=restored.replace(next,prior);
  }
  return restored;
}
export function isDmiCollectionRecoveryOnlyUpdaterChange(before,after){
  try{dmiText(before);assert(before!==after);return restoreDmiCollectionRecoverySource(after)===before;}catch{return false;}
}
export function dmiCollectionRecoveryUpdaterAreas(before,after){
  try{dmiText(before);assert(before!==after);const restored=restoreDmiCollectionRecoverySource(after);
    if(restored===before)return ['dmiCollectionRecovery'];
    // Compose only the already closed budget-owner projection. Any remaining
    // updater difference still refuses this route, including decoder changes.
    if(isDmiBudgetOnlyUpdaterChange(before,restored))return ['dmiBudget','dmiCollectionRecovery'];
    return null;
  }catch{return null;}
}
export function isDmiCollectionRecoveryOnlyFixtureChange(before,after){
  try{dmiText(before);dmiText(after);assert(before!==after);
    const start='\ndef check_empty_critical_maintenance_is_not_a_parser_failure():\n';
    const end='\nMODEL_RUN = "2026-01-01T00:00:00Z"\n';
    const dispatch='\n\ncheck_empty_critical_maintenance_is_not_a_parser_failure()\n'
      +'if "--empty-maintenance-only" in sys.argv:\n    raise SystemExit(0)\n\n';
    const frame=(source,required)=>{
      const first=source.indexOf(start);if(first<0){assert(!required);return source;}
      assert.equal(source.indexOf(start,first+1),-1);const last=dmiUnique(source,end);assert(last>first);
      const owned=source.slice(first,last);assert(owned.length<32*1024&&owned.endsWith(dispatch));
      const body=owned.slice(start.length,-dispatch.length);assert(body.length>0);
      assert(body.split('\n').every(line=>!line||line.startsWith('    ')));
      return source.slice(0,first)+source.slice(last);
    };
    // Original imports, every old assertion and the fixed normal invocation
    // stay exact. Only this one new local regression body needs fresh review.
    return frame(before,false)===frame(after,true);
  }catch{return false;}
}

const DKSS_WATER_TREND_INPUTS = new Set([
  'scripts/update-dmi-bulk.py',
  'scripts/lib/weather_acquisition_plan.py',
  'scripts/test-dmi-dkss-primary-mode.py',
]);

// Read both committed sources and preserve every byte outside these actual
// planning call sites. A match selects the existing native test and requires
// independent review. It is not an exemption for the producer or its fixtures.
function withoutDkssWaterTrendFrames(source, file) {
  let text = dmiText(source);
  const indented = (frame, spaces) => frame.split('\n').every(line => !line || line.startsWith(' '.repeat(spaces)));
  const added = expected => frame => !frame || frame === expected;
  const erase = (left, right, maximum, accept = () => true) => {
    const start = dmiUnique(text, left) + left.length;
    const end = right ? text.indexOf(right, start) : text.length;
    assert(end >= start && end - start <= maximum);
    assert(accept(text.slice(start, end)));
    text = text.slice(0, start) + text.slice(end);
  };
  const eraseIn = (begin, end, callback) => {
    const from = dmiUnique(text, begin), to = dmiUnique(text, end);
    assert(to > from);
    const before = text.slice(0, from), after = text.slice(to);
    text = text.slice(from, to);
    callback();
    text = before + text + after;
  };

  if (file === 'scripts/lib/weather_acquisition_plan.py') {
    eraseIn('\ndef read_qualified_acquisition_plan(', '\ndef scalar_gap_components_at(', () => {
      erase('    return compiled\n\n', '', 1100, frame => !frame.trim()
        || /^\ndef qualified_scalar_gap_reasons_at\(\n(?:    [^\n]*\n)+\) -> tuple\[bool, int\]:\n(?:    [^\n]*\n|\n)+$/.test(frame));
    });
  } else if (file === 'scripts/test-dmi-dkss-primary-mode.py') {
    erase('const routing={zones:{[part.zoneId]:{enabled:true,requireAll:true,method:\'manual-weights\',stations:[{sourceKey:station.sourceKey,weight:1}]}}};\n',
      'const routed=route(Array.from({length:49}', 1100, frame => /^function route\([^\n]+\n$/.test(frame));
    erase('    sourceT:time(117),sourceSupport:time(120),currentPairs};\n}\n',
      '  early:time(4),late:time(96),optionalLate:time(95),currentQualified:', 1300);
    erase('    assert support_requirement["currentNativeDeficitCount"] == 0\n',
      '    cache = {ZONE_ID: cached_zone(early)}\n', 4800, frame => indented(frame, 4));
  } else {
    assert.equal(file, 'scripts/update-dmi-bulk.py');
    erase('    read_qualified_acquisition_plan, scalar_snapshot_paths, scalar_gap_components_at,\n',
      ')\nfrom lib.copernicus_current import (', 72, added('    qualified_scalar_gap_reasons_at,\n'));
    eraseIn('\ndef prioritize_marine_assets_for_current_gaps(', '\ndef prioritize_dkss_primary_assets(', () => {
      erase('    critical_cursor_valid_time: str | None = None,\n', ') -> list[dict[str, Any]]:', 300,
        added('    water_trend_gap_times: frozenset[str] = frozenset(),\n'
          +'    scoped_value_gap_counts: dict[str, tuple[int, int]] | None = None,\n'
          +'    pending_water_support: str | None = None,\n'));
      erase('            str(asset.get("assetIdentitySha256") or ""),\n        )\n\n', '', 3500,
        frame => indented(frame, 4) && (frame.trim() === 'return sorted(assets, key=priority)'
          || frame.startsWith('    ranked = sorted(') && frame.trimEnd().endsWith('    return ordered')));
    });
    eraseIn('\ndef prioritize_dkss_primary_assets(', '\ndef dkss_first_turn_order_diagnostic(', () => {
      erase('    critical_cursor_valid_time: str | None,\n', ') -> list[dict[str, Any]]:', 210,
        added('    pair_water_trends: bool = True,\n    pending_water_support: str | None = None,\n'));
      erase('        critical_cursor_valid_time=critical_cursor_valid_time,\n', '    )\n', 920, frame => indented(frame, 8));
    });
    erase('        "missingComponentKinds": sorted(missing_components),\n    }\n    if scalar_domain_qualified:\n',
      '        result.update({', 300, frame => indented(frame, 8));
    erase('            "retainedScalarGapPairCount": len(scoped_scalar_gap_pairs),\n',
      '            "criticalGapPairCount":', 245, added('            "retainedWaterTrendGap": water_trend_gap,\n'
        +'            "retainedScalarValueGapPairCount": value_gap_count,\n'));

    eraseIn('\n                assets = prioritize_dkss_primary_assets(',
      '\n                # Freeze the first actual collection queue.', () => {
      erase('                        if not collection_is_maintenance else None\n                    ),\n', '                )\n', 100,
        added('                    pair_water_trends=not collection_is_maintenance,\n'));
    });
    erase('                            remaining_assets = list(assets[asset_number:])\n',
      '                            regional_gap_pairs_by_time =', 960, frame => indented(frame, 28));
    eraseIn('\n                                prioritize_dkss_primary_assets(',
      '\n                            if collection_is_maintenance:\n                                assets[asset_number:] = rotate_native_refresh_assets(', () => {
      erase('                                        if not collection_is_maintenance else None\n                                    ),\n',
        '                                )\n', 250, added('                                    pair_water_trends=not collection_is_maintenance,\n'
          +'                                    pending_water_support=pending_water_support,\n'));
    });
  }
  return text;
}

export function isDkssWaterTrendPairOnlyChange(file, before, after) {
  try {
    if (before === after || !DKSS_WATER_TREND_INPUTS.has(file)) return false;
    return withoutDkssWaterTrendFrames(before, file) === withoutDkssWaterTrendFrames(after, file);
  } catch {
    return false;
  }
}

// The manual workflow also owns geometry and weather generation. Only the
// two recovery conditions below are within the Pages contract's test scope.
function manualWeatherRecoveryOnly(before, after) {
  const callerPrefix="    needs: operational-recovery-gate\n    if: ${{ !cancelled() && needs.operational-recovery-gate.result == 'success'";
  const callerAfter=callerPrefix+" && needs.operational-recovery-gate.outputs.closure_deferred == 'false' }}";
  const outcomeBefore='      - deploy-pages\n    if: always()\n';
  const outcomeAfter="      - deploy-pages\n    if: always() && needs.operational-recovery-gate.outputs.closure_deferred != 'true'\n";
  const callerBefore=callerPrefix+' }}';
  return before.split(callerBefore).length===2 && before.split(outcomeBefore).length===2
    && before.replace(callerBefore,callerAfter).replace(outcomeBefore,outcomeAfter)===after;
}

export function planSourceCurrentContractsFromGit(input){
  const out={schemaVersion:1,status:'PLANNED',selection:'CURRENT_CONTRACTS',commands:[],areas:{},
    resultScope:'CURRENT_CONTRACT_RESULTS_ONLY',historicalCompatibilityExecuted:false,
    controlQualificationRequired:false,requiredQualifications:[],reasonCodes:[],
    authority:'PLANNING_ONLY',baselineQualified:false,skipAuthorized:false,productionAuthority:false};
  const refuse=(reason,required=['FULL_SOURCE'])=>{
    out.status='REFUSED';out.selection='FULL';out.commands=[];out.areas={};
    out.reasonCodes=[reason];out.requiredQualifications=required;return freeze(out);
  };
  try{
    assert.equal(arguments.length,1);
    const analysis=analyzeSourceDomainInputs(input);
    if(analysis.analysis!=='COMPLETE')return refuse('CURRENT_INPUT_ANALYSIS_INCOMPLETE');
    out.identity=analysis.identity;out.inputProfile=analysis.profile;out.inputDigests=publicDigests(analysis);
    out.rawInventorySha256=analysis.completeGitDiff.rawInventorySha256;
    out.inventorySha256=out.rawInventorySha256;out.changedRows=analysis.completeGitDiff.changedRows;
    out.protectedInputs={postgresUnchanged:analysis.actualPostgresInput.unchanged,
      CUnchanged:analysis.models.C.unchanged,IUnchanged:analysis.models.I.unchanged,TUnchanged:analysis.models.T.unchanged};
    const required=[];
    if(!analysis.actualPostgresInput.unchanged)required.push('ACTUAL_POSTGRES');
    for(const family of ['C','I','T'])if(!analysis.models[family].unchanged)required.push('ACTUAL_MODEL_'+family);
    if(required.length)return refuse('CURRENT_PROTECTED_INPUT_CHANGED',required);
    if(!out.changedRows)return refuse('CURRENT_EMPTY_DIFF_REQUIRES_NO_NEW_SHORT_PROOF');
    const selected=new Map([['core',[]]]),unknown=[],changedInputs=[];
    for(const row of analysis.completeGitDiff.inventory){
      const bytes=Buffer.from(row.pathUtf8Hex,'hex');
      const file=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
      assert(Buffer.from(file).equals(bytes)&&/^[A-Za-z0-9_.\/-]+$/.test(file)
        &&!file.startsWith('/')&&!file.includes('//')&&!file.split('/').some(part=>part==='.'||part==='..'));
      if(!['A','M','D'].includes(row.status)
        ||![row.beforeMode,row.afterMode].every(mode=>['000000','100644','100755'].includes(mode)))
        return refuse('CURRENT_UNSUPPORTED_DIFF_ENTRY');
      const changed={path:file,status:row.status,beforeMode:row.beforeMode,afterMode:row.afterMode};
      if(file===PAGES_PUBLIC_OBSERVER_CLI&&row.status==='M'
        &&row.beforeMode==='100644'&&row.afterMode==='100644')
        changed.pagesPublicObserverOnly=isAdditivePagesPublicObserverChange(
          readCommittedText(input.baselineCommit,file,true),readCommittedText(input.candidateCommit,file,true));
      changedInputs.push(changed);
      // Kun den lukkede normale Node24-miljøtilføjelse kan kvalificeres her.
      // Andre PR-workflowændringer beholder den eksisterende FULL-grænse.
      if(file==='.github/workflows/validate-pull-request.yml'
        &&!isAdditiveOwnedCacheNativeWorkflowChange(
          readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)))
        return refuse('CURRENT_VALIDATION_WORKFLOW_REQUIRES_FULL');
      if(file==='.github/workflows/deploy-trip-storage.yml'
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'
          ||!isFixedAssistant1712WorkflowAddition(
            readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file))))
        return refuse('CURRENT_FIXED_ASSISTANT_DIAGNOSTIC_WORKFLOW_REQUIRES_FULL');
      if(pathAreas.get(file)?.includes('ownedCacheNative')
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_OWNED_CACHE_NATIVE_REQUIRES_EXISTING_REGULAR_SOURCE');
      if(file==='.github/actions/save-owned-dmi-grib/action.yml'){
        const before=readCommittedText(input.baselineCommit,file);
        const after=readCommittedText(input.candidateCommit,file);
        const archiveCapacityOutput='  archive_capacity_skipped:\n'
          +'    description: True only after the local RAW archive exceeded its configured budget before any cache write.\n';
        if(before.includes('  archive_capacity_skipped:\n')||!before.includes('  uploaded:\n')
          ||after!==before.replace('  uploaded:\n',archiveCapacityOutput+'  uploaded:\n'))
          return refuse('CURRENT_OWNED_CACHE_ACTION_METADATA_REQUIRES_FULL');
      }
      if(['scripts/admin-document-history-maintenance.mjs','scripts/test-admin-document-history-maintenance.mjs'].includes(file)
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_ADMIN_HISTORY_REQUIRES_EXISTING_REGULAR_SOURCE');
      if(HISTORICAL_UPDATER_PATHS.has(file)
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_HISTORICAL_UPDATER_REQUIRES_EXISTING_REGULAR_SOURCE');
      if(file===MANUAL_WEATHER && (row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'
        ||!manualWeatherRecoveryOnly(readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file))))
        return refuse('CURRENT_MANUAL_WEATHER_REQUIRES_FULL');
      if(WEATHER_OPERATION_PATHS.has(file)
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_WEATHER_OPERATION_REQUIRES_EXISTING_REGULAR_SOURCE');
      if(RELEASE_METADATA_PATHS.has(file)
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_RELEASE_METADATA_REQUIRES_EXISTING_REGULAR_SOURCE');
      if(WEATHER_PROGRESS_RECOVERY_PATHS.has(file)
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_WEATHER_PROGRESS_REQUIRES_EXISTING_REGULAR_SOURCE');
      const addsShareZoneBundle=file===SHARE_ZONE_BUNDLE_MODULE
        &&row.status==='A'&&row.beforeMode==='000000'&&row.afterMode==='100644';
      if(SMALL_USER_CONTRACT_PATHS.has(file)&&!addsShareZoneBundle
        &&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_SMALL_USER_CONTRACT_REQUIRES_EXISTING_REGULAR_SOURCE');
      if(DMI_BUDGET_PATHS.has(file)&&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_DMI_BUDGET_REQUIRES_EXISTING_REGULAR_SOURCE');
      const waterTrendPair=DKSS_WATER_TREND_INPUTS.has(file)&&row.status==='M'
        &&row.beforeMode==='100644'&&row.afterMode==='100644'&&isDkssWaterTrendPairOnlyChange(file,
          readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file));
      const recoveryAreas=file==='scripts/update-dmi-bulk.py'&&!waterTrendPair?dmiCollectionRecoveryUpdaterAreas(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)):null;
      const recoveryScope=waterTrendPair||Boolean(recoveryAreas)||(file==='scripts/test-dmi-dkss-primary-mode.py'
        &&isDmiCollectionRecoveryOnlyFixtureChange(readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)));
      if(DMI_COLLECTION_RECOVERY_PATHS.has(file)&&(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_DMI_RECOVERY_REQUIRES_EXISTING_REGULAR_SOURCE',['DMI_PRODUCER_CONTRACTS']);
      if(file==='scripts/test-dmi-dkss-primary-mode.py'&&!recoveryScope)
        return refuse('CURRENT_DMI_RECOVERY_FIXTURE_SCOPE_CHANGED',['DMI_PRODUCER_CONTRACTS']);
      if(file===DKSS_RAW_NATIVE_FIXTURE||file===DKSS_RAW_H0_FIXTURE){
        if(row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644')
          return refuse('CURRENT_DKSS_RAW_AUDIT_FIXTURE_REQUIRES_EXISTING_SOURCE');
        const before=dkssRawAuditFixtureBase(file,readCommittedText(input.baselineCommit,file));
        const after=dkssRawAuditFixtureBase(file,readCommittedText(input.candidateCommit,file));
        if(before===null||after!==before)return refuse('CURRENT_DKSS_RAW_AUDIT_FIXTURE_SCOPE_CHANGED');
      }
      if(file==='scripts/update-dmi-bulk.py'&&!recoveryScope&&!isDmiBudgetOnlyUpdaterChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)))
        return refuse('CURRENT_DMI_BUDGET_UPDATER_SCOPE_CHANGED',['DMI_PRODUCER_CONTRACTS']);
      if(file==='scripts/run-dmi-bulk-supervised.py'&&!isDmiBudgetOnlySupervisorChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)))
        return refuse('CURRENT_DMI_BUDGET_SUPERVISOR_SCOPE_CHANGED',['DMI_SUPERVISOR_CONTRACTS']);
      const dmiAreas=(file===WEATHER_BUILD||file==='.github/workflows/deploy-code-only-repair.yml')?dmiBudgetWeatherBuildAreas(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file)):null;
      const supportOnly=file===WEATHER_BUILD&&isSupportOnlyWeatherBuildChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file));
      const pagesAndSupportOnly=file===WEATHER_BUILD&&!supportOnly&&isPagesAndSupportOnlyWeatherBuildChange(
        readCommittedText(input.baselineCommit,file),readCommittedText(input.candidateCommit,file));
      const areas=(recoveryAreas??(recoveryScope?['dmiCollectionRecovery']:dmiAreas))??(supportOnly?['workflowSupport']:pagesAndSupportOnly?['pages','workflowSupport']:
        pathAreas.get(file)??(/^docs\/(?:rdks|ai|handbook)\/.+\.md$/.test(file)?['documentation']:null));
      if(!areas){unknown.push(file);continue;}
      for(const area of areas){if(!selected.has(area))selected.set(area,[]);selected.get(area).push(file);}
      if(HISTORICAL_UPDATER_PATHS.has(file)||WEATHER_OPERATION_PATHS.has(file)||sourceControlPaths.has(file)||historicalPaths.has(file)||areas.includes('compatibility')||areas.includes('assistantEdge')||areas.includes('assistantDiagnostic')||areas.includes('assistantDiagnostic1712')||areas.includes('accountActivityHookRead')||areas.includes('mailOwnerProbe')||areas.includes('currentInstalledCodeOnly')||areas.includes('workflowSupport')||areas.includes('weatherPublication')||areas.includes('dmiBudget')||areas.includes('dmiCollectionRecovery')||areas.includes('adminHistory')||areas.includes('sharing')||areas.includes('privateStudy')||areas.includes('releaseMetadata')||areas.includes('ownerErasure')||areas.includes('weatherProgressRecovery')||areas.includes('ownedCacheNative')||file.startsWith('scripts/test-'))
        out.controlQualificationRequired=true;
    }
    if(unknown.length){out.unclassifiedPaths=unknown.sort();return refuse('CURRENT_UNCLASSIFIED_PATH');}
    const restore=analysis.completeGitDiff.inventory.find(row=>
      Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===LOCAL_RESTORE_FIXTURE);
    const restoreWorkflow=analysis.completeGitDiff.inventory.find(row=>
      Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===LOCAL_RESTORE_WORKFLOW);
    if(restore||restoreWorkflow){
      if([restore,restoreWorkflow].filter(Boolean).some(row=>row.status!=='M'||row.beforeMode!=='100644'||row.afterMode!=='100644'))
        return refuse('CURRENT_RESTORE_FIXTURE_REQUIRES_EXISTING_REGULAR_SOURCE');
      const before=readCommittedText(input.baselineCommit,LOCAL_RESTORE_FIXTURE,true);
      const after=readCommittedText(input.candidateCommit,LOCAL_RESTORE_FIXTURE,true);
      if(!isBoundedLocalRestoreFixtureChange(before,after))
        return refuse('CURRENT_RESTORE_FIXTURE_SECURITY_FRAME_CHANGED');
      const beforeWorkflow=readCommittedText(input.baselineCommit,LOCAL_RESTORE_WORKFLOW,true);
      const afterWorkflow=readCommittedText(input.candidateCommit,LOCAL_RESTORE_WORKFLOW,true);
      if(!isArchiveRestoreWorkflowChange(beforeWorkflow,afterWorkflow))
        return refuse('CURRENT_RESTORE_FIXTURE_WORKFLOW_CHANGED');
      out.controlQualificationRequired=true;
    }
    if(analysis.completeGitDiff.inventory.some(row=>Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===WEATHER_BUILD)){
      const before=readCommittedText(input.baselineCommit,WEATHER_BUILD);
      const after=readCommittedText(input.candidateCommit,WEATHER_BUILD);
      if(!isPagesOnlyWeatherBuildChange(before,after)&&!isSupportOnlyWeatherBuildChange(before,after)
        &&!isPagesAndSupportOnlyWeatherBuildChange(before,after)&&!dmiBudgetWeatherBuildAreas(before,after))
        return refuse('CURRENT_WEATHER_BUILD_CHANGE_EXCEEDS_PAGES',['WEATHER_BUILD_CONTRACTS']);
    }
    if(analysis.completeGitDiff.inventory.some(row=>Buffer.from(row.pathUtf8Hex,'hex').toString('utf8')===INSTALLER)
      &&!installerIsHandbookOnly(input))return refuse('CURRENT_INSTALLER_CHANGE_EXCEEDS_HANDBOOK',['INSTALLATION_SQL']);
    // Kendte gamle kontrolfiler kan ændres uden at være V3-producenter. Deres
    // kontrolgennemgang er stadig obligatorisk, men gamle resultater arves ikke.
    if(!analysis.evidenceControls.native.unchanged||!analysis.evidenceControls.setup.unchanged
      ||!analysis.evidenceControls.plannerTrustChain.unchanged)out.controlQualificationRequired=true;
    for(const area of Object.keys(COMMANDS))if(selected.has(area))out.areas[area]={
      status:area==='historicalTests'?'NOT_EXECUTED':'SELECTED',executed:false,
      commands:area==='pages'?pagesContractCommandsForChangedInputs(changedInputs)
        :area==='sourceControls'?sourceControlCommandsForChangedInputs(changedInputs)
        :area==='historicalUpdaterOracles'?historicalUpdaterCommandsForChangedInputs(changedInputs):[...COMMANDS[area]],
      changedPaths:[...new Set(selected.get(area))].sort()};
    out.commands=[...new Set(Object.values(out.areas).flatMap(area=>area.commands))];
    assert(out.commands.length>0&&out.commands.every(command=>command===LOCAL_RESTORE_SELF_TEST||command===PAGES_OWNER_COMPLETION_COMMAND||command===PAGES_PUBLIC_VERIFICATION_COMMAND||command===OWNED_CACHE_NATIVE_COMMAND||/^node(?: --[a-z-]+)*(?: [A-Za-z0-9_./-]+\.mjs)+$/.test(command)));
    out.reasonCodes=['CURRENT_SCOPES_CLASSIFIED','UNCHANGED_ACTUAL_POSTGRES_AND_MODELS'];
    if(out.controlQualificationRequired)out.reasonCodes.push('INDEPENDENT_CONTROL_REVIEW_REQUIRED');
    return freeze(out);
  }catch{return refuse('CURRENT_PLAN_REFUSED');}
}
