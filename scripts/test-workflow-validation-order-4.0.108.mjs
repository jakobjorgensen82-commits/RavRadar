import fs from 'node:fs';

const path = '.github/workflows/update-and-deploy.yml';
const workflowDirectory = '.github/workflows';
const workflowFiles = fs.readdirSync(workflowDirectory)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();
const expectedWorkflowFiles = ['build-ravscore-historical-wave-pilot.yml', 'deploy-trip-storage.yml', 'extract-private-geodanmark-layer.yml', 'monitor-trip-storage.yml', 'preserve-copernicus-current-shadow.yml', 'retry-national-admin-roundtrip.yml', 'update-and-deploy.yml', 'validate-approved-public-coast.yml', 'validate-copernicus-current-pilot.yml', 'validate-local-part-system-candidate.yml', 'validate-pull-request.yml', 'validate-six-zone-recovery.yml'];
if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) {
  throw new Error(`Uventet workflowinventar: ${workflowFiles.join(', ') || '(tomt)'}. Kun produktionsworkflowet og de registrerede private, ikke-deployerende workflows må være aktive.`);
}
for (const privateName of expectedWorkflowFiles.filter(name => name !== 'update-and-deploy.yml')) {
  const privateWorkflow = fs.readFileSync(`${workflowDirectory}/${privateName}`, 'utf8');
  if (privateWorkflow.includes('pages: write') || privateWorkflow.includes('id-token: write') || privateWorkflow.includes('deploy-pages')) {
    throw new Error(`${privateName} må ikke kunne deploye Pages.`);
  }
}
const historicalWavePilot = fs.readFileSync(`${workflowDirectory}/build-ravscore-historical-wave-pilot.yml`, 'utf8').replace(/\r\n/g, '\n');
for (const marker of [
  'workflow_dispatch:',
  'permissions:\n  contents: read',
  'python scripts/test-ravscore-historical-wave-pilot.py',
  'python scripts/build-ravscore-historical-wave-pilot.py --year "$PILOT_YEAR"',
  'coordinateValuesStored',
  'rawNetcdfStored',
  'retention-days: 7',
]) {
  if (!historicalWavePilot.includes(marker)) throw new Error(`Den private historiske bølgepilot mangler ${marker}`);
}
if (/\b(?:push|pull_request|schedule|workflow_run):/.test(historicalWavePilot)) {
  throw new Error('Den historiske bølgepilot må kun kunne startes manuelt.');
}
if (/\.nc(?:\s|$)/m.test(historicalWavePilot)) {
  throw new Error('Den historiske bølgepilot må ikke uploade NetCDF-filer.');
}
const pullRequestValidation = fs.readFileSync(`${workflowDirectory}/validate-pull-request.yml`, 'utf8').replace(/\r\n/g, '\n');
for (const marker of [
  'pull_request:',
  'permissions:\n  contents: read',
  'npm run validate:source',
]) {
  if (!pullRequestValidation.includes(marker)) throw new Error(`PR-kildegaten mangler ${marker}`);
}
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sourceValidation = packageJson?.scripts?.['validate:source'] || '';
for (const marker of [
  'npm run validate:rdks',
  'npm run test:feedback-learning',
  'npm run test:observation-db-privacy',
  'npm run test:hybrid-trip-storage',
  'npm run test:adaptive-prediction',
  'npm run test:admin-feature-reachability',
  'npm run test:current-transport-history',
  'npm run test:ravscore-integrated',
  'npm run test:ravscore-rollback-oracle',
  'npm run test:production-hour-lock',
  'npm run test:dmi-acquisition',
  'npm run test:dmi-bulk-forecast-integration',
  'npm run test:live-current-pilot',
  'npm run test:water-source-production-chain',
  'npm run test:legacy-bootstrap-hydration',
  'npm run test:production-runtime-privacy',
  'npm run test:workflow-action-contracts',
  'python -m py_compile scripts/build-ravscore-historical-wave-pilot.py scripts/test-ravscore-historical-wave-pilot.py',
  'node --check scripts/audit-online-browser-playwright-4.0.237.mjs',
  'npm run release:gate',
]) {
  if (!sourceValidation.includes(marker)) throw new Error('validate:source mangler ' + marker);
}
const packageScripts = packageJson?.scripts || {};
for (const retiredName of [
  'hydrate:deployed-weather',
  'test:candidate-g-public-recovery',
  'test:ravscore-candidate-g-state-pipeline',
  'test:ravscore-national-shadow-contract',
]) {
  if (Object.hasOwn(packageScripts, retiredName)) {
    throw new Error(`Den pensionerede produktionskontrakt må ikke være et aktivt package-script: ${retiredName}`);
  }
}
if (!packageScripts['hydrate:legacy-candidate-g-bootstrap']?.includes('--legacy-candidate-g-bootstrap')) {
  throw new Error('Den eneste offentlige hydration-kommando skal være den eksplicitte engangsbootstrap for Candidate G.');
}
for (const [name, marker] of Object.entries({
  'test:protected-ravscore-checkpoint': 'test-protected-ravscore-continuation-checkpoint.mjs',
  'test:private-production-runtime': 'test-protected-private-production-runtime.mjs',
  'test:pages-artifact-privacy': 'test-pages-artifact-privacy.mjs',
  'test:legacy-bootstrap-hydration': 'test-hydrate-deployed-weather-fail-closed-4.0.272.mjs',
})) {
  if (!packageScripts[name]?.includes(marker)) throw new Error(`${name} mangler ${marker}`);
}
if (!packageScripts['test:ravscore-integrated']?.includes('npm run test:protected-ravscore-checkpoint')) {
  throw new Error('Den integrerede RavScore-testkæde skal inkludere protected checkpoint-kontrakten.');
}
if (!packageScripts.validate?.includes('npm run test:production-runtime-privacy')
  || !packageScripts.validate?.includes('npm run test:hydrated-atomic-dataset')) {
  throw new Error('Fuld validering skal håndhæve privat runtime-/Pages-beskyttelse og legacy-only hydration.');
}
if (/\b(?:push|schedule|workflow_dispatch):/.test(pullRequestValidation)) {
  throw new Error('PR-kildegaten maa kun kunne startes af pull_request.');
}
if (pullRequestValidation.includes('secrets.') || pullRequestValidation.includes('pages: write') || pullRequestValidation.includes('id-token: write') || pullRequestValidation.includes('deploy-pages')) {
  throw new Error('PR-kildegaten maa ikke bruge hemmeligheder eller kunne deploye.');
}
const copernicusPilot = fs.readFileSync(`${workflowDirectory}/validate-copernicus-current-pilot.yml`, 'utf8').replace(/\r\n/g, '\n');
for (const marker of [
  'workflow_dispatch:',
  'schedule:',
  '- cron: "6 * * * *"',
  'permissions:\n  contents: read',
  'COPERNICUSMARINE_SERVICE_USERNAME: ${{ secrets.COPERNICUSMARINE_SERVICE_USERNAME }}',
  'COPERNICUSMARINE_SERVICE_PASSWORD: ${{ secrets.COPERNICUSMARINE_SERVICE_PASSWORD }}',
  'python scripts/test-copernicus-current-pilot.py',
  'python scripts/test-copernicus-shadow-retention-4.0.232.py',
  'python scripts/test-current-regional-proxy-policy.py',
  'dmi-zone-cache-v1-${{ runner.os }}-',
  'python scripts/run-copernicus-current-pilot.py',
  'def raw_vector_present(value):',
  'data/diagnostics/copernicus-current-pilot.json',
  'retention-days: 7',
]) {
  if (!copernicusPilot.includes(marker)) throw new Error(`Den private Copernicus-pilot mangler ${marker}`);
}
if (/\b(?:push|pull_request):/.test(copernicusPilot)) throw new Error('Copernicus-piloten må kun kunne startes manuelt eller af sin private timeplan.');
const copernicusUpload = copernicusPilot.slice(copernicusPilot.indexOf('- name: Upload private support evidence'));
if (copernicusUpload.includes('.cache/')) throw new Error('Den rå Copernicus-cache må ikke uploades som supportartefakt.');
const copernicusKeepalive = fs.readFileSync(`${workflowDirectory}/preserve-copernicus-current-shadow.yml`, 'utf8');
for (const marker of ['actions/cache/restore@v6', 'copernicus-current-shadow-v1-', 'private-copernicus-current-pilot', 'workflow_run:', 'workflows: ["Update weather and deploy RavRadar"]', 'types: [requested, completed]', 'workflow_dispatch:', 'external_watchdog:', 'default: false', 'python3 scripts/check-copernicus-current-hour.py', 'target_hour: ${{ steps.cache-state.outputs.target_hour }}', 'inputs[sample_time]=${{ needs.preserve.outputs.target_hour }}', 'validate-copernicus-current-pilot.yml/dispatches', 'retry-failed-production:', 'production-watchdog:', "github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)", 'node scripts/check-production-watchdog.mjs']) {
  if (!copernicusKeepalive.includes(marker)) throw new Error(`Copernicus-keepalive mangler ${marker}`);
}
if (copernicusKeepalive.includes('actions/cache/save@v6') || copernicusKeepalive.includes('actions/upload-artifact')) {
  throw new Error('Copernicus-keepalive må hverken oprette en ny cachekopi eller eksportere rådata.');
}
const copernicusPreserveSection = copernicusKeepalive.slice(copernicusKeepalive.indexOf('  preserve:'), copernicusKeepalive.indexOf('  dispatch-pilot:'));
if (copernicusPreserveSection.includes('actions: write')) throw new Error('Kun det minimale Copernicus-dispatchjob må få Actions-skriveret.');
const text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
for (const marker of [
  'schedule:',
  '- cron: "14,29,44,59 * * * *"',
  'current-hour-readiness:',
  'python3 scripts/check-copernicus-current-hour.py --github-output "$GITHUB_OUTPUT"',
  'Targeted supplement pending',
  "github.event_name == 'workflow_dispatch' && inputs.force != true",
  'CHECK_CURRENT_HOUR',
  'target_hour: ${{ steps.cache-state.outputs.target_hour }}',
  'RAVRADAR_PRODUCTION_TARGET_HOUR: ${{ needs.current-hour-readiness.outputs.target_hour }}',
  "needs.current-hour-readiness.outputs.ready == 'true'",
  'Select exact-hour DMI gaps for targeted Copernicus supplement',
  'Bind production to resolved DMI current hour',
  '--nearest-dmi-hour',
  'Inspect targeted Copernicus coverage after fresh DMI',
  'Fill only exact-hour DMI gaps from Copernicus',
  'Save targeted private Copernicus supplement',
]) {
  if (!text.includes(marker)) throw new Error(`Den GitHub-ejede 15-minuttersproduktion mangler ${marker}`);
}
if (text.includes('cron-job.org')) throw new Error('Produktionsworkflowet må ikke længere afhænge af cron-job.org.');
const pushBlock = text.slice(text.indexOf('  push:'), text.indexOf('\n\npermissions:'));
for (const marker of [
  'branches: [main]',
  'paths-ignore:',
  "'docs/ai/**'",
  "'docs/rdks/**'",
  "'docs/research/**'",
  "'CHANGELOG.md'",
  "'CHANGELOG-*.md'",
  "'HANDBOOK-RAVRADAR.md'",
  "'AGENTS.md'",
  "'release/RELEASE-REPORT.json'",
  "'release/RELEASE-REPORT.md'",
]) {
  if (!pushBlock.includes(marker)) throw new Error('Dokumentationsskip mangler ' + marker);
}
for (const forbidden of ["'docs/**'", "'*.md'", "'data/**'", "'scripts/**'", "'.github/**'", "'*.html'"]) {
  if (pushBlock.includes(forbidden)) throw new Error('Dokumentationsskip er for bredt: ' + forbidden);
}
const positions = {
  privateRuntimeExpected: text.indexOf('name: Build current private-runtime restore expectation'),
  privateRuntimeRestore: text.indexOf('name: Restore newest compatible private runtime from protected storage'),
  privateRuntimeInspect: text.indexOf('name: Inspect private production runtime availability'),
  privateRuntimeVerify: text.indexOf('name: Verify and restore the private production runtime bundle'),
  privateRuntimeInstall: text.indexOf('name: Install only the allowlisted restored private runtime files'),
  continuationRestore: text.indexOf('name: Restore the latest compact schema-4 RavScore checkpoint'),
  protectedCheckpointRestore: text.indexOf('name: Restore protected compact RavScore checkpoint when cache is absent'),
  legacyBootstrapGate: text.indexOf('name: Resolve the one-time Candidate G bootstrap gate'),
  legacyBootstrapImport: text.indexOf('name: Import exact public Candidate G runtime only for first integrated bootstrap'),
  legacyNormalizationImport: text.indexOf('name: Import exact legacy Candidate G into an isolated normalization root'),
  legacySourceAttestation: text.indexOf('name: Seal privacy-safe local attestation of the legacy Candidate G source'),
  preflight: text.indexOf('name: Decide whether weather needs updating'),
  sourceGate: text.indexOf('name: Run fast source gate before expensive data refresh'),
  dmiBulk: text.indexOf('name: Update DMI bulk model cache'),
  targetedCopernicus: text.indexOf('name: Select exact-hour DMI gaps for targeted Copernicus supplement'),
  resolvedCurrentHour: text.indexOf('name: Bind production to resolved DMI current hour'),
  weather: text.indexOf('name: Update central weather cache'),
  provenance: text.indexOf('name: Attach scientific current provenance and exact DMI grid points'),
  runtime: text.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  publicAudit: text.indexOf('name: Audit actual integrated RavScore public runtime before deploy'),
  reference: text.indexOf('name: Generate and strictly validate production reference zones'),
  validate: text.indexOf('name: Validate full project after fresh weather and current provenance'),
  gate: text.indexOf('name: Run release governance gate after refreshed data validation'),
  validateData: text.indexOf('name: Validate updated weather cache'),
  continuationBuild: text.indexOf('name: Build compact schema-4 RavScore continuation checkpoint after final gates'),
  continuationSave: text.indexOf('name: Save compact schema-4 RavScore continuation checkpoint after final gates'),
  protectedCheckpointPublish: text.indexOf('name: Publish compact RavScore checkpoint to protected admin storage'),
  privateRuntimeSpec: text.indexOf('name: Build private production runtime bundle specification'),
  privateRuntimeCreate: text.indexOf('name: Create the next private production runtime bundle atomically'),
  privateRuntimeSave: text.indexOf('name: Publish bounded private runtime with one protected rollback generation'),
  privateRuntimeAnonAudit: text.indexOf('name: Prove the private runtime object is not anonymously readable'),
  artifact: text.indexOf('name: Build lean GitHub Pages artifact'),
  pagesPrivacyAudit: text.indexOf('name: Audit the complete Pages artifact for private runtime material'),
  pagesUpload: text.indexOf('name: Upload GitHub Pages artifact'),
};
for (const [name, pos] of Object.entries(positions)) {
  if (pos < 0) throw new Error(`Mangler workflowtrin: ${name}`);
}
const expected = [
  'privateRuntimeExpected',
  'privateRuntimeRestore',
  'privateRuntimeInspect',
  'privateRuntimeVerify',
  'privateRuntimeInstall',
  'continuationRestore',
  'protectedCheckpointRestore',
  'legacyBootstrapGate',
  'legacyBootstrapImport',
  'legacyNormalizationImport',
  'legacySourceAttestation',
  'preflight',
  'sourceGate',
  'dmiBulk',
  'targetedCopernicus',
  'resolvedCurrentHour',
  'weather',
  'provenance',
  'runtime',
  'publicAudit',
  'reference',
  'validate',
  'gate',
  'validateData',
  'continuationBuild',
  'continuationSave',
  'protectedCheckpointPublish',
  'privateRuntimeSpec',
  'privateRuntimeCreate',
  'privateRuntimeSave',
  'privateRuntimeAnonAudit',
  'artifact',
  'pagesPrivacyAudit',
  'pagesUpload',
];
for (let i = 1; i < expected.length; i += 1) {
  const before = expected[i - 1];
  const after = expected[i];
  if (!(positions[before] < positions[after])) {
    throw new Error(`Forkert rækkefølge: ${before} skal ligge før ${after}`);
  }
}
const tripStorageDeployment = fs.readFileSync(`${workflowDirectory}/deploy-trip-storage.yml`, 'utf8').replace(/\r\n/g, '\n');
for (const marker of [
  'workflow_dispatch:',
  'permissions:\n  contents: read',
  'storage_mode:',
  'SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
  'npm run validate:source',
  'Reverify exact main immediately before the first external write',
  'node scripts/prepare-cloudflare-trip-storage.mjs',
  'node scripts/audit-cloudflare-trip-storage.mjs',
  'wrangler@4.28.1 deploy',
  'node scripts/verify-cloudflare-trip-gateway.mjs',
  'node scripts/migrate-trip-storage-to-cloudflare.mjs',
  'TRIP_STORAGE_MODE=d1',
  'TRIP_STORAGE_MODE=supabase',
  'supabase functions deploy --project-ref "$SUPABASE_PROJECT_ID"',
  'node scripts/verify-trip-storage-edge.mjs',
]) {
  if (!tripStorageDeployment.includes(marker)) throw new Error(`Turlager-deploymentet mangler ${marker}`);
}
if (/\b(?:push|pull_request|schedule|workflow_run):/.test(tripStorageDeployment)) {
  throw new Error('Turlager-deploymentet må kun kunne startes manuelt fra main.');
}
if (tripStorageDeployment.includes('pages: write') || tripStorageDeployment.includes('id-token: write') || tripStorageDeployment.includes('deploy-pages')) {
  throw new Error('Turlager-deploymentet må ikke kunne deploye Pages.');
}
const lastMainReverification = tripStorageDeployment.lastIndexOf('Reverify exact main immediately before the first external write');
const firstBackendWrite = tripStorageDeployment.indexOf('supabase db push --linked)');
if (!(lastMainReverification > tripStorageDeployment.indexOf('supabase db push --linked --dry-run')
  && lastMainReverification < firstBackendWrite)) {
  throw new Error('Turlager-deploymentet skal genverificere exact main efter dry-run og før første eksterne write.');
}
const supabasePatConsumers = workflowFiles.filter((name) =>
  fs.readFileSync(`${workflowDirectory}/${name}`, 'utf8').includes('SUPABASE_ACCESS_TOKEN')
);
if (JSON.stringify(supabasePatConsumers) !== JSON.stringify(['deploy-trip-storage.yml'])) {
  throw new Error(`Supabase-PAT må kun bruges af det manuelle turlager-deployment, ikke af normal drift eller overvågning: ${supabasePatConsumers.join(', ') || '(ingen)'}`);
}
if (!tripStorageDeployment.includes("if: inputs.storage_mode == 'd1'") || tripStorageDeployment.includes('continue-on-error')) {
  throw new Error('D1-deploymentet skal være eksplicit og må ikke skjule fejl eller falde automatisk tilbage.');
}
if ((tripStorageDeployment.match(/node scripts\/migrate-trip-storage-to-cloudflare\.mjs/g) || []).length !== 2) {
  throw new Error('D1-cutover skal migrere både før og efter Edge-skiftet, så ingen ture efterlades i Supabase-vinduet.');
}
const tripStorageMonitor = fs.readFileSync(`${workflowDirectory}/monitor-trip-storage.yml`, 'utf8').replace(/\r\n/g, '\n');
for (const marker of ['workflow_dispatch:', 'schedule:', 'permissions:\n  contents: read', 'CLOUDFLARE_AUDIT_API_TOKEN', 'node scripts/audit-cloudflare-trip-storage.mjs']) {
  if (!tripStorageMonitor.includes(marker)) throw new Error(`Turlager-overvågningen mangler ${marker}`);
}
if (tripStorageMonitor.includes('pages: write') || tripStorageMonitor.includes('id-token: write') || tripStorageMonitor.includes('deploy-pages')) {
  throw new Error('Turlager-overvågningen må ikke kunne deploye Pages.');
}
const privateRuntimeRestoreSection = text.slice(positions.privateRuntimeExpected, positions.continuationRestore);
for (const marker of [
  'RAVRADAR_PRIVATE_RUNTIME_ROOT: /tmp/ravradar-private-production-runtime',
  'RAVRADAR_PRIVATE_RUNTIME_BUNDLE: /tmp/ravradar-private-production-runtime/bundle',
  'RAVRADAR_PRIVATE_RUNTIME_RESTORE: /tmp/ravradar-private-production-runtime/restored',
]) {
  if (!text.includes(marker)) throw new Error(`Workflowets private runtime-miljø mangler ${marker}`);
}
for (const marker of [
  'node scripts/private-production-runtime-workflow.mjs expected',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  '--output .cache/private-production-runtime-expected.json',
  'node scripts/protected-private-production-runtime.mjs',
  '--restore',
  'node scripts/private-production-runtime-bundle.mjs restore',
  '--private-root "$RAVRADAR_PRIVATE_RUNTIME_ROOT"',
  '--bundle "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE"',
  '--expected .cache/private-production-runtime-expected.json',
  '--output "$RAVRADAR_PRIVATE_RUNTIME_RESTORE"',
  'node scripts/private-production-runtime-workflow.mjs install',
  '--restored "$RAVRADAR_PRIVATE_RUNTIME_RESTORE"',
  '--repository-root "$GITHUB_WORKSPACE"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]) {
  if (!privateRuntimeRestoreSection.includes(marker)) throw new Error(`Private runtime-restore mangler ${marker}`);
}
if (privateRuntimeRestoreSection.includes('path: .cache/private-production-runtime')) {
  throw new Error('Det private produktionsbundle må ikke gendannes i repositoryets cachetræ.');
}
if (text.includes('private-production-runtime-v1-')
  || /actions\/cache\/(?:restore|save)@v6[\s\S]{0,240}path: \/tmp\/ravradar-private-production-runtime\/bundle/.test(text)) {
  throw new Error('Det fulde private runtimebundle må aldrig lagres i GitHub Actions cache.');
}

const continuationRestoreSection = text.slice(positions.continuationRestore, positions.legacyBootstrapGate);
for (const marker of [
  'uses: actions/cache/restore@v6',
  'path: .cache/ravscore-continuation-checkpoint',
  'ravscore-continuation-schema4-v2-',
  "if: steps.private-runtime-state.outputs.available != 'true'",
  "if: steps.private-runtime-state.outputs.available != 'true' && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == ''",
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--restore',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]) {
  if (!continuationRestoreSection.includes(marker)) throw new Error(`Protected schema-4 checkpoint-restore mangler ${marker}`);
}
if (continuationRestoreSection.includes('node scripts/ravscore-continuation-checkpoint.mjs')
  || continuationRestoreSection.includes('--target data/live/conditions.json')) {
  throw new Error('Checkpoint-restoren må ikke mutere conditions direkte; update-weather skal indlæse den validerede kompakte fil.');
}

const legacyBootstrapSection = text.slice(positions.legacyBootstrapGate, positions.preflight);
for (const marker of [
  'PRIVATE_RUNTIME_AVAILABLE: ${{ steps.private-runtime-state.outputs.available }}',
  'test -f .cache/ravscore-continuation-checkpoint/checkpoint.json',
  "if: steps.legacy-bootstrap.outputs.required == 'true'",
  'python scripts/hydrate-deployed-weather.py --legacy-candidate-g-bootstrap',
  'RAVRADAR_DEPLOYED_BASE_URL:',
]) {
  if (!legacyBootstrapSection.includes(marker)) throw new Error(`Engangsbootstrap-gaten mangler ${marker}`);
}
if ((text.match(/python scripts\/hydrate-deployed-weather\.py/g) || []).length !== 2
  || !legacyBootstrapSection.includes('--root "$RAVRADAR_LEGACY_SOURCE_ROOT"')
  || text.includes('name: Hydrate latest deployed weather state')) {
  throw new Error('Generisk offentlig hydration skal være pensioneret; kun bootstrap og den isolerede Candidate-kildenormalisering må findes.');
}

const publicAuditBlock = text.slice(positions.publicAudit, positions.reference);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/audit-ravscore-integrated-public-runtime.mjs',
  '--input data/live/conditions.json',
  '--output .geometry-v2-work/ravscore-integrated-public-runtime-audit.json',
]) {
  if (!publicAuditBlock.includes(marker)) {
    throw new Error(`Den faktiske integrerede public runtime-gate mangler ${marker}`);
  }
}
if (publicAuditBlock.includes('continue-on-error')) {
  throw new Error('Den faktiske integrerede public runtime-gate må ikke være vejledende.');
}
for (const forbidden of [
  'Inspect verified Candidate G continuation recovery',
  'restore-candidate-g-continuation.mjs',
  'Inspect failed-run Candidate G gap checkpoint recovery',
  'restore-candidate-g-gap-checkpoint.mjs',
  'candidate-g-continuation-checkpoint-v1-',
  'node scripts/candidate-g-continuation-checkpoint.mjs',
]) {
  if (text.includes(forbidden)) {
    throw new Error(`Den aktive produktionsvej må ikke bevare den historiske engangsrecovery: ${forbidden}`);
  }
}
for (const forbidden of [
  'ravscore_active_shadow',
  'ravscore-active-shadow:',
  'Candidate G public fallback',
  'candidate-g-public-recovery-fallback.mjs',
  'candidate-g-last-ready-public',
  'audit-ravscore-candidate-g-public-shadow.mjs',
  'Candidate G public shadow',
]) {
  if (text.includes(forbidden)) {
    throw new Error(`Den integrerede produktionsvej må ikke bevare Candidate G-publicering eller shadow: ${forbidden}`);
  }
}
const continuationSaveSection = text.slice(positions.continuationBuild, positions.privateRuntimeSpec);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success'",
  'node scripts/ravscore-continuation-checkpoint.mjs',
  '--save',
  '--source data/live/conditions.json',
  'uses: actions/cache/save@v6',
  'ravscore-continuation-schema4-v2-${{ github.run_id }}-${{ github.run_attempt }}',
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--publish',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]) {
  if (!continuationSaveSection.includes(marker)) throw new Error(`Schema-4 RavScore-checkpointbevaringen mangler ${marker}`);
}
if (continuationSaveSection.includes('continue-on-error')) {
  throw new Error('Protected checkpoint-publicering må ikke skjule fejl.');
}
const privateRuntimeCreateSection = text.slice(positions.privateRuntimeSpec, positions.artifact);
for (const marker of [
  'node scripts/private-production-runtime-workflow.mjs create-spec',
  '--repository-root "$GITHUB_WORKSPACE"',
  '--output .cache/private-production-runtime-create-spec.json',
  'node scripts/private-production-runtime-bundle.mjs create',
  '--private-root "$RAVRADAR_PRIVATE_RUNTIME_ROOT"',
  '--bundle "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE"',
  '--spec .cache/private-production-runtime-create-spec.json',
  'name: Reconfirm current main before protected private-runtime write',
  'node scripts/protected-private-production-runtime.mjs',
  '--publish',
  '--expected .cache/private-production-runtime-expected.json',
  '--source-head "$GITHUB_SHA"',
  'name: Prove the private runtime object is not anonymously readable',
  '--audit-anon',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]) {
  if (!privateRuntimeCreateSection.includes(marker)) throw new Error(`Private runtime-bevaring mangler ${marker}`);
}
const privateRuntimeCriticalSection = text.slice(positions.privateRuntimeSpec, positions.privateRuntimeSave);
const privateRuntimeSaveSection = text.slice(positions.privateRuntimeSave, text.indexOf('\n\n', positions.privateRuntimeSave));
if (privateRuntimeCriticalSection.includes('continue-on-error')
  || privateRuntimeSaveSection.includes('continue-on-error')
  || privateRuntimeCreateSection.includes('path: .cache/private-production-runtime')) {
  throw new Error('Det private runtimebundle skal bygges fail-closed uden for repositoryet.');
}
const beforeWeather = text.slice(0, positions.weather);
if (/run:\s+npm run validate(?:\n|$)/.test(beforeWeather) || beforeWeather.includes('npm run release:gate')) {
  throw new Error('Fuld validering/release gate må ikke køre før frisk vejr og u/v-proveniens er bygget.');
}
if (beforeWeather.includes('npm run build:current-provenance')) {
  throw new Error('Hydrerede data må ikke tvinges gennem strømaudit før frisk DMI-kørsel på tvungne/source runs.');
}
const sourceGateBlockEnd = text.indexOf('\n\n', positions.sourceGate);
const sourceGateBlock = text.slice(positions.sourceGate, sourceGateBlockEnd < 0 ? text.length : sourceGateBlockEnd);
if (!sourceGateBlock.includes("if: steps.preflight.outputs.should_run == 'true' && github.event_name != 'schedule'") || !sourceGateBlock.includes('run: npm run validate:source')) {
  throw new Error('Den hurtige kildekodegate skal køre før DMI på push/manuelle builds, mens planlagte same-source kørsler må genbruge PR-/pushbeviset.');
}

for (const step of ['validate', 'gate']) {
  const blockEnd = text.indexOf('\n\n', positions[step]);
  const block = text.slice(positions[step], blockEnd < 0 ? text.length : blockEnd);
  if (!block.includes("if: steps.preflight.outputs.should_run == 'true'")) {
    throw new Error(`${step} skal køre ved enhver reel produktionsopbygning.`);
  }
  if (block.includes('github.event_name') || block.includes('inputs.force')) {
    throw new Error(`${step} må ikke kunne springes over ud fra trigger eller force-input.`);
  }
}
if (!text.includes('uses: actions/cache/restore@v6') || !text.includes('uses: actions/cache/save@v6')) throw new Error('DMI GRIB-cachen skal både gendannes og gemmes med fremdrift.');
if (/uses: actions\/cache@v4[\s\S]{0,300}key: dmi-grib-v3-/.test(text)) throw new Error('Den uforanderlige ugentlige primærnøgle må ikke genindføres.');
if (!text.includes('${{ github.run_id }}-${{ github.run_attempt }}')) throw new Error('Den gemte DMI-cache skal have en unik nøgle pr. kørsel.');

if (!text.includes('build-and-prepare:') || !text.includes('deploy-pages:')) throw new Error('Data/build og Pages-deploy skal være separate jobs.');
if (!text.includes('geometry-v2-pilot:')) throw new Error('Workflow mangler det isolerede GeoDanmark geometry-v2 pilotjob.');
if (!text.includes("github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true)")) {
  throw new Error('Private GeoDanmark-dispatches skal udelukke det almindelige build- og deployjob.');
}
const geometryNationalSection = text.slice(text.indexOf('geometry-v2-national:'), text.indexOf('geometry-v2-pilot:'));
for (const marker of ['geometry_v2_national == true', 'python scripts/build-national-geometry-v2-plan.py', 'python scripts/fetch-geodanmark-national.py', 'python scripts/validate-geodanmark-national-source.py', 'python scripts/analyze-geodanmark-national.py', 'python scripts/fetch-national-water-exclusions.py', 'python scripts/analyze-national-coastal-topology.py', 'python scripts/validate-national-topology-audit.py', 'python scripts/build-national-coastal-parts.py', 'python scripts/validate-national-coastal-parts.py', 'python scripts/build-national-local-part-names.py', 'python scripts/validate-national-local-part-names.py', 'python scripts/build-national-local-part-points.py', 'python scripts/validate-national-local-part-points.py', 'python scripts/validate-national-local-part-dmi-grid.py', 'python scripts/build-national-weather-shadow-contract.py', 'python scripts/validate-national-multi-step-series.py', 'node scripts/validate-national-state-history.mjs', 'python scripts/validate-national-local-part-wind-series.py', 'node scripts/validate-national-shadow-score.mjs', 'Upload compact national geometry-v2 QA artifact', 'national-source-manifest.json', 'national-source-qa.json', 'national-source-qa.geojson', 'national-topology-audit.json', 'national-topology-audit.geojson', 'national-coastal-parts.json', 'national-coastal-parts.geojson', 'national-local-part-name-suggestions.json', 'national-local-part-point-pairs.json', 'national-local-part-dmi-grid.json', 'national-weather-shadow-contract.json', 'national-multi-step-series-validation.json', 'national-state-history-validation.json', 'national-local-part-wind-series.json', 'national-shadow-score-validation.json', 'Upload private national geometry-v2 source artifact']) {
  if (!geometryNationalSection.includes(marker)) throw new Error(`Nationalt GeoDanmark-job mangler ${marker}`);
}
if (geometryNationalSection.includes('pages: write') || geometryNationalSection.includes('id-token: write')) throw new Error('Det nationale GeoDanmark-job må ikke have Pages-skriverettigheder.');
const geometryPilotSection = text.slice(text.indexOf('geometry-v2-pilot:'), text.indexOf('deploy-pages:'));
for (const marker of [
  "github.event_name == 'workflow_dispatch' && inputs.geometry_v2_pilot == true",
  'DATAFORDELER_API_KEY: ${{ secrets.DATAFORDELER_API_KEY }}',
  'python scripts/sync-admin-config.py',
  'python scripts/apply-central-zone-reviews.py',
  'python scripts/fetch-geodanmark-pilot.py',
  'python scripts/analyze-geodanmark-pilot.py',
  'python scripts/audit-pilot-place-names.py',
  'python scripts/build-national-geometry-v2-plan.py',
  'python scripts/render-geodanmark-pilot-maps.py',
  'Upload private GeoDanmark pilot artifact',
  'include-hidden-files: true'
]) {
  if (!geometryPilotSection.includes(marker)) throw new Error(`GeoDanmark-pilotjob mangler ${marker}`);
}
if (geometryPilotSection.includes('pages: write') || geometryPilotSection.includes('id-token: write')) throw new Error('GeoDanmark-pilotjobbet må ikke have Pages-skriverettigheder.');
if (!text.includes('needs: build-and-prepare')) throw new Error('Deployjobbet skal afhænge af det færdige buildjob.');
const buildSection = text.slice(text.indexOf('build-and-prepare:'), text.indexOf('deploy-pages:'));
const deploySection = text.slice(text.indexOf('deploy-pages:'));
if (buildSection.includes('environment:\n      name: github-pages')) throw new Error('Det tunge buildjob må ikke holde github-pages-miljøet.');
if (!deploySection.includes('environment:\n      name: github-pages')) throw new Error('Kun deployjobbet skal eje github-pages-miljøet.');
if (!deploySection.includes('pages: write') || !deploySection.includes('id-token: write')) throw new Error('Deployjobbet mangler minimale Pages-rettigheder.');
if (buildSection.includes('pages: write') || buildSection.includes('id-token: write')) throw new Error('Buildjobbet må ikke have Pages-skriverettigheder.');
for (const protectedPilotPath of ["--exclude 'data/geometry-v2/'", "--exclude '.geometry-v2-work/'", "--exclude 'requirements-geometry.txt'"]) {
  if (!buildSection.includes(protectedPilotPath)) throw new Error(`Pages-artifact må ikke indeholde ${protectedPilotPath}`);
}
const pagesArtifactSection = text.slice(positions.artifact, positions.pagesPrivacyAudit);
if (!pagesArtifactSection.includes("--exclude 'data/live/'")) {
  throw new Error('Pages-artifactet skal ekskludere hele data/live før den minimale allowliste installeres.');
}
const expectedPagesLiveFiles = [
  'coastal-parts-v2.json',
  'manifest.json',
  'public-condition-details.json',
  'public-conditions.json',
];
const installedPagesLiveFiles = [...pagesArtifactSection.matchAll(
  /install -m 0644 "\$pages_source\/data\/live\/([^"\s]+)" "\$pages_destination\/data\/live\/([^"\s]+)"/g,
)].map((match) => {
  if (match[1] !== match[2]) throw new Error(`Pages-installationen omdøber en livefil: ${match[1]} -> ${match[2]}`);
  return match[1];
}).sort();
if (JSON.stringify(installedPagesLiveFiles) !== JSON.stringify(expectedPagesLiveFiles)) {
  throw new Error(`Pages-artifactets live-allowliste skal være præcis fire filer: ${installedPagesLiveFiles.join(', ') || '(ingen)'}`);
}
const pagesLiveWriteLines = pagesArtifactSection.split('\n')
  .map((line) => line.trim())
  .filter((line) => line.includes('$pages_destination/data/live'));
if (pagesLiveWriteLines.length !== 5
  || pagesLiveWriteLines[0] !== 'mkdir -p "$pages_destination/data/live"'
  || pagesLiveWriteLines.slice(1).some((line) => !line.startsWith('install -m 0644 "$pages_source/data/live/'))) {
  throw new Error('Pages-workflowet må kun oprette live-mappen og installere de fire allowlistede filer.');
}
const pagesPrivacyAuditSection = text.slice(positions.pagesPrivacyAudit, positions.pagesUpload);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/audit-pages-artifact-privacy.mjs',
  '--site _site',
  '--private-manifest "$RAVRADAR_PRIVATE_RUNTIME_BUNDLE/manifest.json"',
  '--require-private-manifest',
]) {
  if (!pagesPrivacyAuditSection.includes(marker)) throw new Error(`Pages-privacygaten mangler ${marker}`);
}
if (pagesPrivacyAuditSection.includes('continue-on-error')) {
  throw new Error('Pages-privacygaten skal være fail-closed før artifact-upload.');
}
if (!/concurrency:[\s\S]{0,500}cancel-in-progress: false/.test(text)) throw new Error('En ny kørsel må aldrig afbryde en operationel RavScore-transition.');
if (!text.includes("'ravradar-geometry-v2-national'") || !text.includes("'ravradar-geometry-v2-pilot'")) throw new Error('Private GeoDanmark-jobs skal have separate concurrency-grupper fra vejropdateringer.');

console.log('Workflowinventar, rækkefølge, deployisolering og progressiv DMI-cache består.');
