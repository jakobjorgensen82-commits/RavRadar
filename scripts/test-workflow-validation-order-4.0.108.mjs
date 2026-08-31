import assert from 'node:assert/strict';
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
const sourceGateRequirementMarkers = [
  '-r requirements-dmi.txt',
  '-r requirements-geometry.txt',
  '-r requirements-copernicus.txt',
];
const sourceGateWorkflowNames = workflowFiles.filter((name) => fs
  .readFileSync(`${workflowDirectory}/${name}`, 'utf8')
  .includes('npm run validate:source'));
assert.deepEqual(
  sourceGateWorkflowNames,
  ['deploy-trip-storage.yml', 'update-and-deploy.yml', 'validate-pull-request.yml'],
  'Alle workflows med validate:source skal være kendte og dækket af dependency-paritetsgaten.',
);
for (const workflowName of sourceGateWorkflowNames) {
  const workflow = fs.readFileSync(`${workflowDirectory}/${workflowName}`, 'utf8').replace(/\r\n/g, '\n');
  let searchFrom = 0;
  while (true) {
    const sourceGateRun = workflow.indexOf('npm run validate:source', searchFrom);
    if (sourceGateRun < 0) break;
    const sourceGateStep = workflow.lastIndexOf('\n      - name:', sourceGateRun);
    const dependencyStep = workflow.lastIndexOf('\n      - name:', sourceGateStep - 1);
    if (sourceGateStep < 0 || dependencyStep < 0) {
      throw new Error(`${workflowName}: validate:source mangler en umiddelbart forudgående dependency-step.`);
    }
    const dependencyBlock = workflow.slice(dependencyStep, sourceGateStep);
    const sourceGateBlockEnd = workflow.indexOf('\n\n', sourceGateStep);
    const sourceGateBlock = workflow.slice(sourceGateStep, sourceGateBlockEnd < 0 ? workflow.length : sourceGateBlockEnd);
    if (!dependencyBlock.includes('name: Install source-gate dependencies')) {
      throw new Error(`${workflowName}: validate:source skal umiddelbart følge Install source-gate dependencies.`);
    }
    for (const marker of sourceGateRequirementMarkers) {
      if (!dependencyBlock.includes(marker)) {
        throw new Error(`${workflowName}: sourcegaten mangler det ejede requirements-sæt ${marker}.`);
      }
    }
    const dependencyCondition = dependencyBlock.match(/^\s+if:\s+(.+)$/m)?.[1] || '';
    const sourceGateCondition = sourceGateBlock.match(/^\s+if:\s+(.+)$/m)?.[1] || '';
    if (dependencyCondition !== sourceGateCondition) {
      throw new Error(`${workflowName}: dependency-step og validate:source skal have samme if-betingelse.`);
    }
    searchFrom = sourceGateRun + 1;
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
  'fetch-depth: 0',
  'timeout-minutes: 45',
  '-r requirements-dmi.txt',
  '-r requirements-geometry.txt',
  '-r requirements-copernicus.txt',
  'npm run validate:source',
]) {
  if (!pullRequestValidation.includes(marker)) throw new Error(`PR-kildegaten mangler ${marker}`);
}
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sourceValidation = packageJson?.scripts?.['validate:source'] || '';
const workflowActionContracts = packageJson?.scripts?.['test:workflow-action-contracts'] || '';
if (!workflowActionContracts.includes('npm run test:dmi-marine-first-recovery')) {
  throw new Error('test:workflow-action-contracts mangler npm run test:dmi-marine-first-recovery');
}
if (!workflowActionContracts.includes('npm run test:production-workflow-outcome')
  || packageJson?.scripts?.['test:production-workflow-outcome'] !== 'node scripts/test-production-workflow-outcome.mjs') {
  throw new Error('Den maskinlæsbare produktionsslutstatus skal være registreret i workflow-kontraktsuiten.');
}
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
if (!packageScripts['test:candidate-g-operational-rollback']?.includes('scripts/test-ravscore-operational-pages-recovery.mjs')) {
  throw new Error('Den operationelle RavScore-suite skal inkludere exact-target Pages-recoveryhelperen.');
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
  'python scripts/run-copernicus-current-pilot-with-retry.py',
  'python scripts/check-copernicus-current-range.py',
  'copernicus-current-range-v2-',
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
for (const marker of ['actions/cache/restore@v6', 'copernicus-current-range-v2-', 'copernicus-current-shadow-v1-', 'private-copernicus-current-pilot', 'workflow_run:', 'workflows: ["Update weather and deploy RavRadar"]', 'types: [requested, completed]', 'workflow_dispatch:', 'external_watchdog:', 'default: false', 'Report cache keepalive without reading private payloads', 'retry-failed-production:', 'production-watchdog:', "github.event_name == 'schedule' || (github.event_name == 'workflow_dispatch' && inputs.external_watchdog == true)", "external_watchdog == true && '15' || '45'", '--maximum-silence-minutes "$MAXIMUM_SILENCE_MINUTES"', 'node scripts/check-production-watchdog.mjs']) {
  if (!copernicusKeepalive.includes(marker)) throw new Error(`Copernicus-keepalive mangler ${marker}`);
}
if (copernicusKeepalive.includes('actions/cache/save@v6') || copernicusKeepalive.includes('actions/upload-artifact')) {
  throw new Error('Copernicus-keepalive må hverken oprette en ny cachekopi eller eksportere rådata.');
}
const copernicusPreserveSection = copernicusKeepalive.slice(copernicusKeepalive.indexOf('  preserve:'), copernicusKeepalive.indexOf('  retry-failed-production:'));
if (copernicusPreserveSection.includes('actions: write')) throw new Error('Det payloadfri Copernicus-keepalivejob må ikke få Actions-skriveret.');
const text = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
const activeTripGateStart = text.indexOf('name: Verify active trip-storage Edge and D1 read contracts without creating data');
const protectedWritesStart = text.indexOf('name: Reconfirm current origin/main before protected writes and Pages artifact');
if (activeTripGateStart < 0 || protectedWritesStart <= activeTripGateStart) {
  throw new Error('Den aktive trip-storage Edge-/D1-læsegate mangler før beskyttede writes.');
}
const activeTripGate = text.slice(activeTripGateStart, protectedWritesStart);
for (const marker of [
  'node scripts/verify-trip-storage-edge.mjs',
  'node scripts/verify-cloudflare-trip-gateway.mjs',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'CLOUDFLARE_TRIP_GATEWAY_URL: ${{ secrets.CLOUDFLARE_TRIP_GATEWAY_URL }}',
  'TRIP_GATEWAY_SHARED_SECRET: ${{ secrets.TRIP_GATEWAY_SHARED_SECRET }}',
]) {
  if (!activeTripGate.includes(marker)) throw new Error(`Den aktive pre-write trip-storage-gate mangler ${marker}`);
}
const activeTripRun = activeTripGate.slice(0, activeTripGate.indexOf('env:'));
if (/\$\{\{\s*secrets\./.test(activeTripRun)) {
  throw new Error('Trip-storage-secrets må kun bindes via step-env og ikke interpoleres i run-scriptet.');
}
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
  'Require complete target/DMI-bound Copernicus current range before scoring',
  'python scripts/check-copernicus-current-range.py',
  '--registry .cache/copernicus-current-targets.json',
  '--dmi data/live/dmi-bulk-cache.json',
  '--targets data/live/coastal-parts-v2.json',
  '--at "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  '--require-complete',
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
  preflightCache: text.indexOf('name: Restore dataminimized weather preflight metadata'),
  publicPreflightManifest: text.indexOf('name: Fetch only the deployed public manifest for weather preflight'),
  preflight: text.indexOf('name: Decide whether weather needs updating before private runtime download'),
  privateRuntimeExpected: text.indexOf('name: Build current private-runtime restore expectation'),
  privateRuntimeRestore: text.indexOf('name: Restore newest compatible private runtime from protected storage'),
  privateRuntimeInspect: text.indexOf('name: Inspect private production runtime availability'),
  privateRuntimeVerify: text.indexOf('name: Verify and restore the private production runtime bundle'),
  privateRuntimeInstall: text.indexOf('name: Install only the allowlisted restored private runtime files'),
  continuationRestore: text.indexOf('name: Restore the latest atomic schema-6 and Candidate G rollback checkpoint'),
  protectedCheckpointRestore: text.indexOf('name: Restore protected atomic RavScore checkpoint when cache is absent'),
  legacyBootstrapGate: text.indexOf('name: Resolve the one-time Candidate G bootstrap gate'),
  legacyBootstrapImport: text.indexOf('name: Import exact public Candidate G runtime only for first integrated bootstrap'),
  legacyCutoverImport: text.indexOf('name: Import exact legacy Candidate G into an isolated first-cutover source root'),
  legacySourceFetch: text.indexOf('name: Fetch exact public Candidate G source commit for first cutover attestation'),
  legacySourceAttestation: text.indexOf('name: Seal privacy-safe local attestation of the legacy Candidate G source'),
  sourceGate: text.indexOf('name: Run fast source gate before expensive data refresh'),
  dmiBulk: text.indexOf('name: Update DMI bulk model cache'),
  targetedCopernicus: text.indexOf('name: Select exact-hour DMI gaps for targeted Copernicus supplement'),
  resolvedCurrentHour: text.indexOf('name: Bind production to resolved DMI current hour'),
  copernicusRangeGate: text.indexOf('name: Require complete target/DMI-bound Copernicus current range before scoring'),
  liveCurrentBuild: text.indexOf('name: Build public seven-day current history and controlled live selection'),
  weather: text.indexOf('name: Update central weather cache'),
  provenance: text.indexOf('name: Attach scientific current provenance and exact DMI grid points'),
  runtime: text.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  publicAudit: text.indexOf('name: Audit actual integrated RavScore public runtime before deploy'),
  reference: text.indexOf('name: Generate and strictly validate production reference zones'),
  validate: text.indexOf('name: Validate full project after fresh weather and current provenance'),
  gate: text.indexOf('name: Run release governance gate after refreshed data validation'),
  validateData: text.indexOf('name: Validate updated weather cache'),
  protectedWriteHeadCheck: text.indexOf('name: Reconfirm current origin/main before protected writes and Pages artifact'),
  pointPromotion: text.indexOf('name: Atomically promote the validated point candidate in central admin storage'),
  continuationBuild: text.indexOf('name: Build atomic schema-6 and Candidate G rollback checkpoint after final gates'),
  continuationSave: text.indexOf('name: Save atomic schema-6 and Candidate G rollback checkpoint after final gates'),
  protectedCheckpointPublish: text.indexOf('name: Publish atomic RavScore checkpoint to protected admin storage'),
  preflightStateBuild: text.indexOf('name: Build dataminimized weather preflight state after final gates'),
  preflightStateSave: text.indexOf('name: Save dataminimized weather preflight state'),
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
  'preflightCache',
  'publicPreflightManifest',
  'preflight',
  'continuationRestore',
  'protectedCheckpointRestore',
  'privateRuntimeExpected',
  'privateRuntimeRestore',
  'privateRuntimeInspect',
  'privateRuntimeVerify',
  'privateRuntimeInstall',
  'legacyBootstrapGate',
  'legacyBootstrapImport',
  'legacyCutoverImport',
  'legacySourceAttestation',
  'sourceGate',
  'dmiBulk',
  'targetedCopernicus',
  'resolvedCurrentHour',
  'copernicusRangeGate',
  'liveCurrentBuild',
  'weather',
  'provenance',
  'runtime',
  'publicAudit',
  'reference',
  'validate',
  'gate',
  'validateData',
  'protectedWriteHeadCheck',
  'pointPromotion',
  'continuationBuild',
  'continuationSave',
  'protectedCheckpointPublish',
  'preflightStateBuild',
  'preflightStateSave',
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
  'SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}',
  'npm run validate:source',
  'Validate exact source head before external writes',
  'Reconfirm current origin/main before the Candidate G database contract',
  'Atomically apply and verify the Candidate G trip-quality contract',
  'Reconfirm current origin/main before D1 schema and phase inspection',
  'node scripts/prepare-cloudflare-trip-storage.mjs',
  'node scripts/mark-cloudflare-trip-storage-activation.mjs',
  'node scripts/audit-cloudflare-trip-storage.mjs',
  'wrangler@4.28.1 deploy',
  'node scripts/verify-cloudflare-trip-gateway.mjs',
  'node scripts/migrate-trip-storage-to-cloudflare.mjs',
  'TRIP_STORAGE_MODE="maintenance:$maintenance_until"',
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
const exactSourceValidation = tripStorageDeployment.indexOf('name: Validate exact source head before external writes');
const tripQualityCas = tripStorageDeployment.indexOf('name: Reconfirm current origin/main before the Candidate G database contract');
const tripQualityWrite = tripStorageDeployment.indexOf('name: Atomically apply and verify the Candidate G trip-quality contract');
const d1SchemaCas = tripStorageDeployment.indexOf('name: Reconfirm current origin/main before D1 schema and phase inspection');
const d1SchemaWrite = tripStorageDeployment.indexOf('name: Prepare ten EU-restricted D1 shards, schema and durable phase');
if (!(exactSourceValidation < tripQualityCas && tripQualityCas < tripQualityWrite
  && tripQualityWrite < d1SchemaCas && d1SchemaCas < d1SchemaWrite)) {
  throw new Error('Turlager-deploymentet skal have en sen exact-main-CAS umiddelbart før både trip-quality-write og D1-schema-/fasewrite.');
}
for (const [name, section] of [
  ['trip quality', tripStorageDeployment.slice(tripQualityCas, tripQualityWrite)],
  ['D1 schema', tripStorageDeployment.slice(d1SchemaCas, d1SchemaWrite)],
]) {
  for (const marker of [
    'git fetch --no-tags --prune origin +refs/heads/main:refs/remotes/origin/main',
    'test "$(git rev-parse HEAD^{commit})" = "$EXPECTED_HEAD_SHA"',
    'test "$(git rev-parse origin/main^{commit})" = "$EXPECTED_HEAD_SHA"',
  ]) {
    if (!section.includes(marker)) throw new Error(`${name}-write mangler en umiddelbar exact-main-CAS-markør: ${marker}`);
  }
}
const supabasePatConsumers = workflowFiles.filter((name) =>
  fs.readFileSync(`${workflowDirectory}/${name}`, 'utf8').includes('SUPABASE_ACCESS_TOKEN')
);
if (JSON.stringify(supabasePatConsumers) !== JSON.stringify(['deploy-trip-storage.yml'])) {
  throw new Error(`Supabase-PAT må kun bruges af det manuelle turlager-deployment, ikke af normal drift eller overvågning: ${supabasePatConsumers.join(', ') || '(ingen)'}`);
}
if (tripStorageDeployment.includes('storage_mode:')
  || tripStorageDeployment.includes('inputs.storage_mode')
  || tripStorageDeployment.includes('kontrolleret Supabase-rollback')) {
  throw new Error('Efter den varige D1-grænse må workflowet ikke tilbyde en operativ Supabase-rollback.');
}
if (tripStorageDeployment.includes('wrangler versions deploy')
  || (tripStorageDeployment.match(/npx --yes wrangler@4\.28\.1 deploy/g) || []).length !== 2) {
  throw new Error('Worker-cutover skal bruge to idempotente standard-wrangler-deploys til 100% trafik og må ikke bruge gradual/split deployment.');
}
if ((tripStorageDeployment.match(/node scripts\/migrate-trip-storage-to-cloudflare\.mjs/g) || []).length !== 3) {
  throw new Error('D1-cutover skal synkronisere før og efter mode-skiftet samt kunne gentage reconciliation ved failure roll-forward.');
}
const prepareD1Position = tripStorageDeployment.indexOf('name: Prepare ten EU-restricted D1 shards, schema and durable phase');
const legacyIntentPosition = tripStorageDeployment.indexOf('name: Record fail-closed intent for the already-live legacy D1 installation');
const legacyMarkerPosition = tripStorageDeployment.indexOf('name: Persist the D1 boundary before quiescing the legacy installation');
const d1EdgePredeployIntentPosition = tripStorageDeployment.indexOf('name: Record current-run existing-D1 Edge predeployment intent');
const freshEdgePredeployIntentPosition = tripStorageDeployment.indexOf('name: Record current-run fresh-Supabase Edge predeployment intent');
const edgeDeployPosition = tripStorageDeployment.indexOf('name: Deploy exact maintenance-capable Edge functions while Worker and mode stay unchanged');
const preleaseD1AttestationPosition = tripStorageDeployment.indexOf('name: Attest both exact Edge boundaries in unchanged D1 mode before leasing maintenance');
const repairIntentPosition = tripStorageDeployment.indexOf('name: Record current-run D1 repair intent immediately before quiescence');
const maintenancePosition = tripStorageDeployment.indexOf('name: Enter fail-closed expiring maintenance for every existing D1 installation');
const bridgePosition = tripStorageDeployment.indexOf('name: Preserve the initial Supabase bridge only for a genuinely fresh D1 installation');
const maintenanceAttestationPosition = tripStorageDeployment.indexOf('name: Attest both Edge boundaries in fail-closed maintenance');
const bridgeAttestationPosition = tripStorageDeployment.indexOf('name: Attest both Edge boundaries in the genuinely fresh Supabase bridge');
const oldGenerationDrainPosition = tripStorageDeployment.indexOf('name: Drain every bounded request from the preceding Edge generation');
const deployWorkerPosition = tripStorageDeployment.indexOf('name: Install deploy and attest the private D1 gateway after Edge quiescence');
const firstMigrationPosition = tripStorageDeployment.indexOf('name: Idempotently synchronize existing Supabase trips into D1');
const d1IntentPosition = tripStorageDeployment.indexOf('name: Record local fail-closed intent before a genuinely fresh D1 marker');
const d1MarkerPosition = tripStorageDeployment.indexOf('name: Persist the point of no return immediately before fresh D1 activation');
const d1ModePosition = tripStorageDeployment.indexOf('name: Activate normal Cloudflare D1 mode after verified Worker readiness');
const preReconcileAttestationPosition = tripStorageDeployment.indexOf('name: Attest both Edge write and read boundaries in live D1 mode before final reconciliation');
const supabaseDrainPosition = tripStorageDeployment.indexOf('name: Drain the last bounded pre-D1 requests before final reconciliation');
const reconcilePosition = tripStorageDeployment.indexOf('name: Reconcile every trip written before both Edge boundaries attested D1');
const finalEdgeProbePosition = tripStorageDeployment.indexOf('name: Reverify both public Edge boundaries in live D1 mode');
for (const [name, position] of Object.entries({
  prepareD1Position,
    legacyIntentPosition,
    legacyMarkerPosition,
    d1EdgePredeployIntentPosition,
    freshEdgePredeployIntentPosition,
    edgeDeployPosition,
    preleaseD1AttestationPosition,
    repairIntentPosition,
    maintenancePosition,
    bridgePosition,
  maintenanceAttestationPosition,
  bridgeAttestationPosition,
  oldGenerationDrainPosition,
  deployWorkerPosition,
  firstMigrationPosition,
  d1IntentPosition,
  d1MarkerPosition,
  d1ModePosition,
  preReconcileAttestationPosition,
  supabaseDrainPosition,
  reconcilePosition,
  finalEdgeProbePosition,
})) {
  if (position < 0) throw new Error(`Turlager-deploymentet mangler den sikre cutoverfase ${name}.`);
}
if (!(prepareD1Position < legacyIntentPosition
  && legacyIntentPosition < legacyMarkerPosition
  && legacyMarkerPosition < d1EdgePredeployIntentPosition
  && d1EdgePredeployIntentPosition < freshEdgePredeployIntentPosition
  && freshEdgePredeployIntentPosition < edgeDeployPosition
  && edgeDeployPosition < preleaseD1AttestationPosition
  && preleaseD1AttestationPosition < repairIntentPosition
  && repairIntentPosition < maintenancePosition
  && prepareD1Position < bridgePosition
  && edgeDeployPosition < bridgePosition
  && edgeDeployPosition < maintenanceAttestationPosition
  && edgeDeployPosition < bridgeAttestationPosition
  && maintenanceAttestationPosition < oldGenerationDrainPosition
  && bridgeAttestationPosition < oldGenerationDrainPosition
  && oldGenerationDrainPosition < deployWorkerPosition
  && deployWorkerPosition < firstMigrationPosition
  && firstMigrationPosition < d1IntentPosition
  && d1IntentPosition < d1MarkerPosition
  && d1MarkerPosition < d1ModePosition
  && firstMigrationPosition < d1ModePosition
  && d1ModePosition < preReconcileAttestationPosition
  && preReconcileAttestationPosition < supabaseDrainPosition
  && supabaseDrainPosition < reconcilePosition
  && d1ModePosition < reconcilePosition
  && reconcilePosition < finalEdgeProbePosition)) {
  throw new Error('Turlager-cutover skal være legacy-marker → maintenance/new Edge-attestation/dræn → Worker → sync → frisk markør → D1-attestation/dræn → reconciliation → slutattestation.');
}
if ((tripStorageDeployment.match(/node scripts\/verify-trip-storage-edge\.mjs/g) || []).length !== 9) {
  throw new Error('Turlager-cutover skal attestere begge Edge-funktioner i normal- og begge fasebevidste failure-forløb.');
}
if (!tripStorageDeployment.includes('EXPECTED_TRIP_STORAGE_MODE: supabase')
  || !tripStorageDeployment.includes('EXPECTED_TRIP_STORAGE_MODE: maintenance')
  || !tripStorageDeployment.includes('EXPECTED_TRIP_STORAGE_MODE: d1')) {
  throw new Error('Turlager-cutover mangler eksplicit maintenance-/fresh-bridge-/D1-attestation.');
}
if (!tripStorageDeployment.includes('Restore Supabase only for a proven fresh pre-activation installation')
  || !tripStorageDeployment.includes("steps.prepare_d1.outcome == 'success'")
  || !tripStorageDeployment.includes("steps.prepare_d1.outputs.d1_activation_attempted != 'true'")
  || !tripStorageDeployment.includes("steps.prepare_d1.outputs.legacy_d1_detected != 'true'")
  || !tripStorageDeployment.includes("steps.fresh_edge_predeploy_intent.outputs.edge_predeploy_intent == 'true'")
  || !tripStorageDeployment.includes("steps.legacy_activation_intent.outputs.d1_activation_intent != 'true'")
  || !tripStorageDeployment.includes("steps.d1_repair_intent.outputs.d1_repair_intent != 'true'")
  || !tripStorageDeployment.includes("steps.activation_intent.outputs.d1_activation_intent != 'true'")
  || !tripStorageDeployment.includes('Redeploy exact Edge functions for the restored fresh Supabase bridge')
  || !tripStorageDeployment.includes('Persist or reconfirm the D1 boundary during failure roll-forward')
  || !tripStorageDeployment.includes("steps.legacy_activation_intent.outputs.d1_activation_intent == 'true'")
  || !tripStorageDeployment.includes("steps.d1_edge_predeploy_intent.outputs.edge_predeploy_intent == 'true'")
  || !tripStorageDeployment.includes("steps.d1_repair_intent.outputs.d1_repair_intent == 'true'")
  || !tripStorageDeployment.includes("steps.activation_intent.outputs.d1_activation_intent == 'true'")
  || !tripStorageDeployment.includes("steps.failure_d1_marker.outcome == 'success'")
  || !tripStorageDeployment.includes('Redeploy exact maintenance-capable Edge functions before failure maintenance')
  || !tripStorageDeployment.includes('Enter fail-closed expiring maintenance during D1 failure roll-forward')
  || !tripStorageDeployment.includes('Attest both Edge boundaries in failure roll-forward maintenance')
  || !tripStorageDeployment.includes('Reinstall and redeploy the exact Worker after failure Edge quiescence')
  || !tripStorageDeployment.includes('Preserve D1 after the point of no return and repair forward')
  || !tripStorageDeployment.includes('TRIP_STORAGE_MODE="maintenance:$maintenance_until"')
  || !tripStorageDeployment.includes('test "$remaining_seconds" -ge 600')) {
  throw new Error('Failure recovery skal skelne før/efter den varige D1-grænse og reparere fremad efter den.');
}
const failureRestorePosition = tripStorageDeployment.indexOf('name: Restore Supabase only for a proven fresh pre-activation installation');
const failureExactHeadPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main before any failure-recovery mutation');
const failureFreshEdgeCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main before restored fresh-Supabase Edge deployment');
const failureFreshEdgePosition = tripStorageDeployment.indexOf('name: Redeploy exact Edge functions for the restored fresh Supabase bridge');
const failureFreshAttestationPosition = tripStorageDeployment.indexOf('name: Attest the restored genuinely fresh Supabase bridge');
const failureMarkerCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main before failure roll-forward D1 phase persistence');
const failureMarkerPosition = tripStorageDeployment.indexOf('name: Persist or reconfirm the D1 boundary during failure roll-forward');
const failureMaintenanceEdgeCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main before maintenance-capable failure Edge predeployment');
const failureMaintenanceEdgePosition = tripStorageDeployment.indexOf('name: Redeploy exact maintenance-capable Edge functions before failure maintenance');
const failureMaintenanceCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main before failure roll-forward expiring maintenance');
const failureMaintenancePosition = tripStorageDeployment.indexOf('name: Enter fail-closed expiring maintenance during D1 failure roll-forward');
const failureMaintenanceAttestationPosition = tripStorageDeployment.indexOf('name: Attest both Edge boundaries in failure roll-forward maintenance');
const failureMaintenanceDrainPosition = tripStorageDeployment.indexOf('name: Drain the preceding Edge generation before failure Worker replacement');
const failureWorkerCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main immediately before failure Worker replacement');
const failureLeasePosition = tripStorageDeployment.indexOf('name: Require enough failure maintenance lease for bounded Worker replacement');
const failureWorkerPosition = tripStorageDeployment.indexOf('name: Reinstall and redeploy the exact Worker after failure Edge quiescence');
const failureD1EdgeCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main before failure D1 secret and Edge deployment');
const failureRollForwardPosition = tripStorageDeployment.indexOf('name: Preserve D1 after the point of no return and repair forward');
const failureEdgePosition = tripStorageDeployment.indexOf('name: Redeploy exact Edge functions during D1 failure roll-forward');
const failureD1AttestationPosition = tripStorageDeployment.indexOf('name: Attest both Edge boundaries in D1 mode before failure reconciliation');
if (!(finalEdgeProbePosition < failureExactHeadPosition
  && failureExactHeadPosition < failureRestorePosition
  && failureRestorePosition < failureFreshEdgeCasPosition
  && failureFreshEdgeCasPosition < failureFreshEdgePosition
  && failureFreshEdgePosition < failureFreshAttestationPosition
  && failureFreshAttestationPosition < failureMarkerCasPosition
  && failureMarkerCasPosition < failureMarkerPosition
  && failureMarkerPosition < failureMaintenanceEdgeCasPosition
  && failureMaintenanceEdgeCasPosition < failureMaintenanceEdgePosition
  && failureMaintenanceEdgePosition < failureMaintenanceCasPosition
  && failureMaintenanceCasPosition < failureMaintenancePosition
  && failureMaintenanceEdgePosition < failureMaintenanceAttestationPosition
  && failureMaintenancePosition < failureMaintenanceAttestationPosition
  && failureMaintenanceAttestationPosition < failureMaintenanceDrainPosition
  && failureMaintenanceDrainPosition < failureWorkerCasPosition
  && failureWorkerCasPosition < failureLeasePosition
  && failureLeasePosition < failureWorkerPosition
  && failureWorkerPosition < failureD1EdgeCasPosition
  && failureD1EdgeCasPosition < failureRollForwardPosition
  && failureRollForwardPosition < failureEdgePosition
  && failureEdgePosition < failureD1AttestationPosition)) {
  throw new Error('Fasebevidst failure recovery skal være fresh Supabase-repair eller marker → exact Edge → expiring maintenance-attestation/dræn → lease/CAS → Worker → D1/Edge-attestation.');
}
const failureRecovery = tripStorageDeployment.slice(failureExactHeadPosition);
if (!failureRecovery.includes('id: failure_exact_head')
  || !failureRecovery.includes('id: failure_fresh_edge_exact_head')
  || !failureRecovery.includes('id: failure_marker_exact_head')
  || !failureRecovery.includes('id: failure_maintenance_exact_head')
  || !failureRecovery.includes('id: failure_maintenance_edge_exact_head')
  || !failureRecovery.includes('id: failure_worker_exact_head')
  || !failureRecovery.includes('id: failure_d1_edge_exact_head')
  || !failureRecovery.includes('id: failure_reconcile_exact_head')) {
  throw new Error('Hver separat failure-recovery-skrivefamilie skal have sin egen sene exact-main CAS.');
}
const failureDrainPosition = tripStorageDeployment.indexOf('name: Drain bounded pre-D1 requests during failure roll-forward');
const failureReconcileCasPosition = tripStorageDeployment.indexOf('name: Reconfirm exact main immediately before failure roll-forward reconciliation');
const failureReconcilePosition = tripStorageDeployment.indexOf('name: Reconcile the Supabase source during failure roll-forward');
const failureFinalAttestationPosition = tripStorageDeployment.indexOf('name: Reattest both Edge boundaries after failure roll-forward');
const failureFinalWorkerPosition = tripStorageDeployment.indexOf('name: Reattest Worker after failure roll-forward');
if (!(failureD1AttestationPosition < failureDrainPosition
  && failureDrainPosition < failureReconcileCasPosition
  && failureReconcileCasPosition < failureReconcilePosition
  && failureReconcilePosition < failureFinalAttestationPosition
  && failureFinalAttestationPosition < failureFinalWorkerPosition)
  || !tripStorageDeployment.includes("steps.failure_reconcile_exact_head.outcome == 'success'")) {
  throw new Error('Failure-reconciliation skal ske efter D1-attestation/dræn, med frisk exact-main CAS og efterfølgende dobbelt slutattestation.');
}
if (!tripStorageDeployment.includes('continue-on-error: true')
  || tripStorageDeployment.slice(0, failureExactHeadPosition).includes('continue-on-error: true')) {
  throw new Error('Kun de eksplicitte failure-recovery-trin må fortsætte for at samle datasikker evidens.');
}
if ((tripStorageDeployment.match(/git fetch --no-tags --prune origin \+refs\/heads\/main:refs\/remotes\/origin\/main/g) || []).length < 16) {
  throw new Error('Turlager-deploymentet skal genbekræfte current main før hver beskyttet ekstern skrivefamilie.');
}

function recoveryRoute({
  exactHead = true,
  prepareOutcome = 'success',
  activationMarker = false,
  legacyD1 = false,
  legacyIntent = false,
  d1EdgeIntent = false,
  repairIntent = false,
  freshEdgeIntent = false,
  freshIntent = false,
} = {}) {
  if (!exactHead || prepareOutcome !== 'success') return 'no-mutation';
  if (legacyIntent || d1EdgeIntent || repairIntent || freshIntent) return 'd1-roll-forward';
  if (!activationMarker && !legacyD1 && freshEdgeIntent) return 'supabase';
  return 'no-mutation';
}
assert.equal(recoveryRoute({ prepareOutcome: 'failed', legacyD1: true }), 'no-mutation');
assert.equal(recoveryRoute({ activationMarker: false, legacyD1: false }), 'no-mutation');
assert.equal(recoveryRoute({ freshEdgeIntent: true }), 'supabase');
assert.equal(recoveryRoute({ activationMarker: true }), 'no-mutation');
assert.equal(recoveryRoute({ legacyD1: true }), 'no-mutation');
assert.equal(recoveryRoute({ legacyD1: true, legacyIntent: true }), 'd1-roll-forward');
assert.equal(recoveryRoute({ activationMarker: true, d1EdgeIntent: true }), 'd1-roll-forward');
assert.equal(recoveryRoute({ activationMarker: true, repairIntent: true }), 'd1-roll-forward');
assert.equal(recoveryRoute({ freshIntent: true }), 'd1-roll-forward');
assert.equal(recoveryRoute({
  legacyD1: true,
  legacyIntent: true,
  exactHead: false,
}), 'no-mutation');
const tripStorageMonitor = fs.readFileSync(`${workflowDirectory}/monitor-trip-storage.yml`, 'utf8').replace(/\r\n/g, '\n');
for (const marker of ['workflow_dispatch:', 'schedule:', 'permissions:\n  contents: read', 'CLOUDFLARE_AUDIT_API_TOKEN', 'node scripts/audit-cloudflare-trip-storage.mjs']) {
  if (!tripStorageMonitor.includes(marker)) throw new Error(`Turlager-overvågningen mangler ${marker}`);
}
if (tripStorageMonitor.includes('pages: write') || tripStorageMonitor.includes('id-token: write') || tripStorageMonitor.includes('deploy-pages')) {
  throw new Error('Turlager-overvågningen må ikke kunne deploye Pages.');
}
const lightweightPreflightSection = text.slice(positions.preflightCache, positions.continuationRestore);
for (const marker of [
  'uses: actions/cache/restore@v6',
  'path: .cache/weather-preflight-state',
  'weather-preflight-state-v1-${{ runner.os }}-',
  'name: Fetch only the deployed public manifest for weather preflight',
  '--max-filesize 131072',
  'node scripts/private-production-runtime-workflow.mjs materialize-preflight',
  '--state "$state"',
  '--public-manifest "$RAVRADAR_PREFLIGHT_WORK/public-manifest.json"',
  '--output-root "$input_root"',
  'cp scripts/check-weather-update.py "$input_root/scripts/check-weather-update.py"',
  '(cd "$input_root" && python scripts/check-weather-update.py)',
  'reason=verified-light-preflight-unavailable',
]) {
  if (!lightweightPreflightSection.includes(marker)) throw new Error(`Tidlig dataminimeret vejrpreflight mangler ${marker}`);
}
if (lightweightPreflightSection.includes('protected-private-production-runtime.mjs')
  || lightweightPreflightSection.includes('/tmp/ravradar-private-production-runtime/bundle')) {
  throw new Error('Den tidlige vejrpreflight må ikke hente eller inspicere det fulde private runtimebundle.');
}

const privateRuntimeRestoreSection = text.slice(positions.privateRuntimeExpected, positions.legacyBootstrapGate);
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
for (const step of [
  'privateRuntimeExpected',
  'privateRuntimeRestore',
  'privateRuntimeInspect',
  'privateRuntimeVerify',
  'privateRuntimeInstall',
]) {
  const start = positions[step];
  const end = text.indexOf('\n      - name:', start + 1);
  const block = text.slice(start, end < 0 ? text.length : end);
  if (!block.includes("if: steps.preflight.outputs.should_run == 'true'")) {
    throw new Error(`${step} må ikke køre før den lette preflight har krævet en reel build.`);
  }
}
if (privateRuntimeRestoreSection.includes('path: .cache/private-production-runtime')) {
  throw new Error('Det private produktionsbundle må ikke gendannes i repositoryets cachetræ.');
}
if (text.includes('private-production-runtime-v1-')
  || /actions\/cache\/(?:restore|save)@v6[\s\S]{0,240}path: \/tmp\/ravradar-private-production-runtime\/bundle/.test(text)) {
  throw new Error('Det fulde private runtimebundle må aldrig lagres i GitHub Actions cache.');
}

const continuationRestoreSection = text.slice(positions.continuationRestore, positions.privateRuntimeExpected);
for (const marker of [
  'uses: actions/cache/restore@v6',
  'path: .cache/ravscore-continuation-checkpoint',
  'ravscore-continuation-schema6-v2-',
  "if: steps.preflight.outputs.should_run == 'true'",
  "if: steps.preflight.outputs.should_run == 'true' && steps.ravscore-checkpoint-cache.outputs.cache-matched-key == ''",
  'node scripts/protected-ravscore-continuation-checkpoint.mjs',
  '--restore',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
]) {
  if (!continuationRestoreSection.includes(marker)) throw new Error(`Protected schema-6 checkpoint-restore mangler ${marker}`);
}
if (continuationRestoreSection.includes('node scripts/ravscore-continuation-checkpoint.mjs')
  || continuationRestoreSection.includes('--target data/live/conditions.json')) {
  throw new Error('Checkpoint-restoren må ikke mutere conditions direkte; update-weather skal indlæse den validerede kompakte fil.');
}

const legacyBootstrapSection = text.slice(positions.legacyBootstrapGate, positions.sourceGate);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
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
  throw new Error('Generisk offentlig hydration skal være pensioneret; kun første-cutover-bootstrap og den isolerede attesterede legacy-kilde må findes.');
}
if (!(positions.legacyCutoverImport < positions.legacySourceFetch
  && positions.legacySourceFetch < positions.legacySourceAttestation)) {
  throw new Error('Den eksakte Candidate G Git-kilde skal hentes efter isoleret public import og før lokal attestation.');
}
const legacyFetchCommand = 'git fetch --no-tags --depth=1 origin "$legacy_source_head"';
if (text.split(legacyFetchCommand).length - 1 !== 2
  || text.split('test "$(git rev-parse FETCH_HEAD)" = "$legacy_source_head"').length - 1 !== 2) {
  throw new Error('Både build-attestation og deploy-verifikation skal hente og bekræfte præcis den pinnede Candidate G-sourcecommit.');
}
const legacyDeployFetch = text.indexOf(
  'name: Fetch exact public Candidate G source commit for first cutover verification',
);
const legacyPublicVerification = text.indexOf(
  'name: Verify the complete currently public source model before begin CAS',
);
if (legacyDeployFetch < 0 || legacyPublicVerification < 0
  || legacyDeployFetch >= legacyPublicVerification) {
  throw new Error('Deployjobbet skal hente den pinnede Candidate G-kilde før offentlig byteverifikation og begin CAS.');
}
for (const forbidden of [
  'candidate-normalization',
  'normalization-begin',
  'normalization-complete',
  'integrated-normalization',
  'ravscore-integrated-after-normalization',
  'LEGACY_CANDIDATE_G_NORMALIZATION_PENDING',
]) {
  if (text.includes(forbidden)) throw new Error(`Den døde Candidate-normaliseringsomvej må ikke findes: ${forbidden}`);
}
for (const marker of [
  'legacy-candidate-g)',
  'test "$INITIAL_CUTOVER_REQUIRED" = "true"',
  'test "$LEGACY_SOURCE_REQUIRED" = "true"',
  'if [ "$GITHUB_EVENT_NAME" = "push" ]; then',
  'action="integrated-cutover"',
  'action="candidate-legacy-maintenance"',
  "steps.operational-action.outputs.action == 'candidate-legacy-maintenance'",
  'node scripts/verify-legacy-candidate-g-source.mjs attest',
  'node scripts/verify-legacy-candidate-g-source.mjs verify',
  '--attestation "$RAVRADAR_OPERATIONAL_HANDOFF/legacy-source-attestation.json"',
  'node scripts/ravscore-operational-activation.mjs return-begin',
  '"${source_attestation[@]}"',
  '--source-implementation-closure-sha256 "$source_closure_sha256"',
  '--requested-implementation-closure-sha256 "${{ steps.integrated-implementation.outputs.closure_sha256 }}"',
]) {
  if (!text.includes(marker)) throw new Error(`Direkte legacy→INITIAL_INTEGRATED_CUTOVER mangler ${marker}`);
}
for (const marker of [
  'candidate_g_gap_reconstruction_mode',
  'inspect-candidate-g-one-time-gap',
  'one-time-candidate-g-gap-reconstruction.mjs',
  '.cache/candidate-g-gap-reconstruction',
]) {
  if (text.includes(marker)) throw new Error(`Den opgivne DEC-0109-sti må ikke genåbnes i workflowet: ${marker}`);
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
  'Candidate G public fallback',
  'candidate-g-public-recovery-fallback.mjs',
  'candidate-g-last-ready-public',
]) {
  if (text.includes(forbidden)) {
    throw new Error(`Den integrerede produktionsvej må ikke bevare Candidate G-publicering eller shadow: ${forbidden}`);
  }
}
if (/ravscore_active_shadow|ravscore-active-shadow:|ravradar-active-ravscore-shadow/.test(text)) {
  throw new Error('Det pensionerede active-shadow-entrypoint må ikke genindføres ved siden af candidate-dry-run.');
}
const candidateRollbackStage = text.slice(
  text.indexOf('name: Seal Candidate G rollback or maintenance plan from the fresh private runtime'),
  text.indexOf('name: Seal integrated return, initial cutover or historical maintenance plan after backend and public gates'),
);
for (const marker of [
  "startsWith(steps.operational-action.outputs.action, 'candidate-')",
  'node scripts/prepare-candidate-g-operational-rollback.mjs',
  'node scripts/install-candidate-g-rollback-stage.mjs',
  'node scripts/audit-candidate-g-rollback-public-runtime.mjs',
  '--source-model "$source_model"',
  '--source-implementation-closure-sha256 "$source_closure_sha256"',
  '--requested-implementation-closure-sha256 "$requested_closure_sha256"',
  'source_model="candidate-g"',
  'source_model="historical-candidate-g"',
  'jq \'.activeModelBinding\' "$RAVRADAR_OPERATIONAL_WORK/current.json"',
  '--source-binding "$RAVRADAR_OPERATIONAL_WORK/source-binding.json"',
  'source_model="legacy-candidate-g"',
  'source_closure_sha256="${{ steps.legacy-source.outputs.implementation_closure_sha256 }}"',
]) {
  if (!candidateRollbackStage.includes(marker)) throw new Error(`Candidate-dry-run rollbackauditen mangler ${marker}`);
}
const operationalReadBlock = text.slice(
  text.indexOf('name: Read exact centrally active operational RavScore'),
  text.indexOf('name: Resolve one fail-closed operational model action'),
);
const bindingCurrentReadMarker =
  'binding_current=$(jq -r \'.bindingCurrent\' "$RAVRADAR_OPERATIONAL_WORK/current.json")';
if (!operationalReadBlock.includes(bindingCurrentReadMarker)
  || !text.includes('operational_binding_current: ${{ steps.operational-model.outputs.binding_current }}')) {
  throw new Error('Operational read/output mangler privacy-safe bindingCurrent.');
}
const operationalResolverBlock = text.slice(
  text.indexOf('name: Resolve one fail-closed operational model action'),
  text.indexOf('name: Set up Python preflight'),
);
for (const marker of [
  'BINDING_CURRENT: ${{ steps.operational-model.outputs.binding_current }}',
  'action="candidate-historical-maintenance"',
  'action="integrated-historical-maintenance"',
  'Historical integrated binding must be upgraded before Candidate G rollback planning.',
  '[[ "$ACTIVE_DEPLOYMENT_ID" =~ ^pages(-recovery)?-[0-9]+-[0-9]+$ ]]',
  'elif [ "$BINDING_CURRENT" = "true" ]; then',
  'test "$BINDING_CURRENT" = "false"',
]) {
  if (!operationalResolverBlock.includes(marker)) {
    throw new Error(`Historical H0→H1 actionresolver mangler ${marker}`);
  }
}
const initialCandidateResolver = operationalResolverBlock.slice(
  operationalResolverBlock.indexOf('if [ "$INITIAL_CUTOVER_REQUIRED" = "true" ]; then'),
  operationalResolverBlock.indexOf('if [ "$ROLLBACK_MODE" != "none" ]; then',
    operationalResolverBlock.indexOf('if [ "$INITIAL_CUTOVER_REQUIRED" = "true" ]; then')),
);
if (!(initialCandidateResolver.indexOf('if [ "$GITHUB_EVENT_NAME" = "push" ]; then')
  < initialCandidateResolver.indexOf('action="integrated-cutover"')
  && initialCandidateResolver.indexOf('action="integrated-cutover"')
    < initialCandidateResolver.indexOf('action="candidate-historical-maintenance"'))) {
  throw new Error('Historical Candidate H0 skal fortsat kunne gå direkte til current integrated ved exact push-cutover.');
}
const integratedHistoricalPlanBlock = text.slice(
  text.indexOf('name: Seal integrated return, initial cutover or historical maintenance plan after backend and public gates'),
  text.indexOf('name: Generate implementation and coverage audit'),
);
for (const marker of [
  "steps.operational-action.outputs.action == 'integrated-historical-maintenance'",
  'prepare_command="prepare-integrated-historical-maintenance"',
  'ravscore-operational-activation.mjs "$prepare_command"',
  '--source-implementation-closure-sha256 "$source_closure_sha256"',
  '--requested-implementation-closure-sha256 "${{ steps.integrated-implementation.outputs.closure_sha256 }}"',
]) {
  if (!integratedHistoricalPlanBlock.includes(marker)) {
    throw new Error(`Historical integrated immutable plan mangler ${marker}`);
  }
}
const candidateRefreshBegin = text.indexOf('name: Begin scheduled Candidate G refresh with exact central CAS');
const pagesDeploy = text.indexOf('name: Deploy to GitHub Pages', candidateRefreshBegin);
const candidateRefreshComplete = text.indexOf('name: Refresh already active Candidate G central evidence after public verification');
if (!(candidateRefreshBegin >= 0 && candidateRefreshBegin < pagesDeploy
  && pagesDeploy < candidateRefreshComplete)) {
  throw new Error('Candidate G scheduler-maintenance skal være refresh-begin → Pages → refresh-complete.');
}
const candidateRefreshBeginBlock = text.slice(candidateRefreshBegin,
  text.indexOf('\n      - name:', candidateRefreshBegin + 1));
for (const marker of [
  'ravscore-operational-activation.mjs refresh-begin',
  '--source-manifest "$RAVRADAR_OPERATIONAL_HANDOFF/source-manifest.json"',
  '--source-verification "$RAVRADAR_OPERATIONAL_HANDOFF/source-verification.json"',
  '--deployment-id "pages-${{ github.run_id }}-${{ github.run_attempt }}"',
]) {
  if (!candidateRefreshBeginBlock.includes(marker)) throw new Error(`Candidate G refresh-begin mangler ${marker}`);
}
const legacyRefreshBegin = text.indexOf('name: Begin legacy-to-current Candidate G refresh with exact central CAS');
const legacyRefreshComplete = text.indexOf('name: Complete legacy-to-current Candidate G refresh only after public verification');
if (!(legacyRefreshBegin >= 0 && legacyRefreshBegin < pagesDeploy
  && pagesDeploy < legacyRefreshComplete)) {
  throw new Error('Legacy Candidate G scheduler-maintenance skal være legacy-refresh-begin → Pages → legacy-refresh-complete.');
}
const legacyRefreshBeginBlock = text.slice(legacyRefreshBegin,
  text.indexOf('\n      - name:', legacyRefreshBegin + 1));
for (const marker of [
  'ravscore-operational-activation.mjs legacy-refresh-begin',
  '--source-manifest "$RAVRADAR_OPERATIONAL_HANDOFF/source-manifest.json"',
  '--source-attestation "$RAVRADAR_OPERATIONAL_HANDOFF/legacy-source-attestation.json"',
  '--source-verification "$RAVRADAR_OPERATIONAL_HANDOFF/source-verification.json"',
  '--deployment-id "pages-${{ github.run_id }}-${{ github.run_attempt }}"',
]) {
  if (!legacyRefreshBeginBlock.includes(marker)) throw new Error(`Legacy Candidate G refresh-begin mangler ${marker}`);
}
const legacyRefreshCompleteBlock = text.slice(legacyRefreshComplete,
  text.indexOf('\n      - name:', legacyRefreshComplete + 1));
for (const marker of [
  'ravscore-operational-activation.mjs legacy-refresh-complete',
  '--verification "$RAVRADAR_OPERATIONAL_HANDOFF/verification.json"',
  '--deployment-id "pages-${{ github.run_id }}-${{ github.run_attempt }}"',
]) {
  if (!legacyRefreshCompleteBlock.includes(marker)) throw new Error(`Legacy Candidate G refresh-complete mangler ${marker}`);
}
if (!text.includes("steps.candidate-legacy-refresh-begin.outcome == 'success'")) {
  throw new Error('En tvetydig legacy Candidate G refresh skal altid gå gennem offentlig identitetsreconciliation.');
}
const historicalCandidateBegin = text.indexOf(
  'name: Begin historical-to-current Candidate G maintenance with exact central CAS',
);
const historicalCandidateComplete = text.indexOf(
  'name: Complete historical-to-current Candidate G maintenance only after public verification',
);
if (!(historicalCandidateBegin >= 0 && historicalCandidateBegin < pagesDeploy
  && pagesDeploy < historicalCandidateComplete)) {
  throw new Error('Historical Candidate maintenance skal være planforseglet begin → Pages → exact-target complete.');
}
for (const [sectionStart, sectionEnd, markers, label] of [
  [
    historicalCandidateBegin,
    text.indexOf('\n      - name:', historicalCandidateBegin + 1),
    [
      "if: needs.build-and-prepare.outputs.operational_action == 'candidate-historical-maintenance'",
      'ravscore-operational-activation.mjs historical-refresh-begin',
      '--plan "$RAVRADAR_OPERATIONAL_HANDOFF/plan.json"',
      '--source-manifest "$RAVRADAR_OPERATIONAL_HANDOFF/source-manifest.json"',
      '--source-verification "$RAVRADAR_OPERATIONAL_HANDOFF/source-verification.json"',
    ],
    'Historical Candidate begin',
  ],
  [
    historicalCandidateComplete,
    text.indexOf('\n      - name:', historicalCandidateComplete + 1),
    [
      'ravscore-operational-activation.mjs historical-refresh-complete',
      '--plan "$RAVRADAR_OPERATIONAL_HANDOFF/plan.json"',
      '--verification "$RAVRADAR_OPERATIONAL_HANDOFF/verification.json"',
    ],
    'Historical Candidate complete',
  ],
]) {
  const section = text.slice(sectionStart, sectionEnd);
  for (const marker of markers) {
    if (!section.includes(marker)) throw new Error(`${label} mangler ${marker}`);
  }
}
const historicalIntegratedBegin = text.indexOf(
  'name: Begin historical-to-current integrated maintenance with exact central CAS',
);
const historicalIntegratedComplete = text.indexOf(
  'name: Complete historical-to-current integrated maintenance only after public verification',
);
if (!(historicalIntegratedBegin >= 0 && historicalIntegratedBegin < pagesDeploy
  && pagesDeploy < historicalIntegratedComplete)) {
  throw new Error('Historical integrated maintenance skal være planforseglet begin → Pages → exact-target complete.');
}
for (const [sectionStart, sectionEnd, markers, label] of [
  [
    historicalIntegratedBegin,
    text.indexOf('\n      - name:', historicalIntegratedBegin + 1),
    [
      'ravscore-operational-activation.mjs integrated-historical-maintenance-begin',
      '--plan "$RAVRADAR_OPERATIONAL_HANDOFF/plan.json"',
      '--source-manifest "$RAVRADAR_OPERATIONAL_HANDOFF/source-manifest.json"',
      '--source-verification "$RAVRADAR_OPERATIONAL_HANDOFF/source-verification.json"',
      '--audit "$RAVRADAR_OPERATIONAL_HANDOFF/public-audit.json"',
    ],
    'Historical integrated begin',
  ],
  [
    historicalIntegratedComplete,
    text.indexOf('\n      - name:', historicalIntegratedComplete + 1),
    [
      'ravscore-operational-activation.mjs integrated-historical-maintenance-complete',
      '--plan "$RAVRADAR_OPERATIONAL_HANDOFF/plan.json"',
      '--verification "$RAVRADAR_OPERATIONAL_HANDOFF/verification.json"',
      '--audit "$RAVRADAR_OPERATIONAL_HANDOFF/public-audit.json"',
    ],
    'Historical integrated complete',
  ],
]) {
  const section = text.slice(sectionStart, sectionEnd);
  for (const marker of markers) {
    if (!section.includes(marker)) throw new Error(`${label} mangler ${marker}`);
  }
}
const historicalSourceRestore = text.slice(
  text.indexOf('name: Restore the exact sealed active source implementation'),
  text.indexOf('name: Upload privacy-safe source evidence before any activation CAS'),
);
for (const marker of [
  "operational_action == 'candidate-historical-maintenance'",
  "operational_action == 'integrated-historical-maintenance'",
  'candidate-historical-maintenance) source_model="candidate-g"',
  'integrated-historical-maintenance) source_model="integrated"',
]) {
  if (!historicalSourceRestore.includes(marker)) {
    throw new Error(`Historical source restore/verification mangler ${marker}`);
  }
}
const failedTransitionReconcile = text.slice(
  text.indexOf('name: Reconcile an ambiguous failed transition from observed public identity'),
  text.indexOf('name: Seal exact verified deployment terminal'),
);
for (const marker of [
  "steps.candidate-historical-refresh-begin.outcome == 'success'",
  "steps.integrated-historical-maintenance-begin.outcome == 'success'",
  'source_args+=(--plan "$RAVRADAR_OPERATIONAL_HANDOFF/plan.json")',
  'completion_args=(',
  'if [ "$(jq -r \'.requestedModel\' "$RAVRADAR_OPERATIONAL_HANDOFF/failure-current.json")" = "integrated" ]; then',
  'elif [ "$model" = "candidate-g" ]',
  'ravscore-operational-activation.mjs reconcile',
  '--terminal-evidence "$RAVRADAR_OPERATIONAL_HANDOFF/terminal-evidence.json"',
]) {
  if (!failedTransitionReconcile.includes(marker)) {
    throw new Error(`Historical failure reconcile/abort mangler ${marker}`);
  }
}
const integratedCompletionArgs = failedTransitionReconcile.slice(
  failedTransitionReconcile.indexOf('if [ "$model" = "integrated" ]; then'),
  failedTransitionReconcile.indexOf('else\n              test "$model" = "candidate-g"'),
);
if (!integratedCompletionArgs.includes(
  '--plan "$RAVRADAR_OPERATIONAL_HANDOFF/plan.json"',
)) {
  throw new Error('Alle integrated targets, herunder direct H0 Candidate→H1, skal reconciles mod IntegratedReturnPlan.');
}
const integratedMaintenance = text.indexOf('name: Reseal ordinary integrated production without changing model identity');
if (!(integratedMaintenance > pagesDeploy)
  || !text.slice(integratedMaintenance, text.indexOf('\n      - name:', integratedMaintenance + 1))
    .includes('ravscore-operational-activation.mjs integrated-maintenance')) {
  throw new Error('Almindelig integreret produktion skal reseales efter Pages uden en femte transitionstype.');
}
for (const marker of [
  '--observations "$RAVRADAR_OPERATIONAL_WORK/activation-observations.json"',
  '--readiness "$RAVRADAR_OPERATIONAL_WORK/handoff/integrated-readiness.json"',
  '--audit "$RAVRADAR_OPERATIONAL_WORK/handoff/public-audit.json"',
  'ravscore-operational-pages-attempt-terminal-v1',
  'ravscore-operational-recovery-$attempt_run_id-$attempt_number',
  'deploy_step_conclusion',
  'candidate-execute|candidate-maintenance|candidate-historical-maintenance|candidate-legacy-maintenance)',
  'integrated|integrated-historical-maintenance|integrated-return|integrated-cutover)',
]) {
  if (!text.includes(marker)) throw new Error(`Durable source/target-reconciliation mangler ${marker}`);
}

const operationalRecoveryPositions = {
  reconcile: text.indexOf('\n  reconcile-operational-pending:'),
  writer: text.indexOf('\n  recover-operational-pages-target:'),
  finalizer: text.indexOf('\n  finalize-operational-pages-recovery:'),
  gate: text.indexOf('\n  operational-recovery-gate:'),
  currentHour: text.indexOf('\n  current-hour-readiness:'),
};
assert.deepEqual(
  Object.values(operationalRecoveryPositions).map((position) => position >= 0),
  [true, true, true, true, true],
  'Den todelte operationelle Pages-recoverykæde skal være komplet.',
);
assert.ok(
  operationalRecoveryPositions.reconcile < operationalRecoveryPositions.writer
    && operationalRecoveryPositions.writer < operationalRecoveryPositions.finalizer
    && operationalRecoveryPositions.finalizer < operationalRecoveryPositions.gate
    && operationalRecoveryPositions.gate < operationalRecoveryPositions.currentHour,
  'Recovery skal være classify → Pages-writer → non-Pages CAS-finalizer → terminal gate → current-hour.',
);
const operationalReconcileSection = text.slice(
  operationalRecoveryPositions.reconcile,
  operationalRecoveryPositions.writer,
);
const operationalWriterSection = text.slice(
  operationalRecoveryPositions.writer,
  operationalRecoveryPositions.finalizer,
);
const operationalFinalizerSection = text.slice(
  operationalRecoveryPositions.finalizer,
  operationalRecoveryPositions.gate,
);
const operationalRecoveryGateSection = text.slice(
  operationalRecoveryPositions.gate,
  operationalRecoveryPositions.currentHour,
);
const geometryExclusion = "if: github.ref == 'refs/heads/main' && (github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true))";
if (!operationalReconcileSection.includes(geometryExclusion)
  || operationalReconcileSection.includes('GEOMETRY_ONLY')) {
  throw new Error('Geometry-dispatches skal være helt udelukket fra reconcile/recovery-jobbet.');
}
for (const marker of [
  "needs.reconcile-operational-pending.result == 'success'",
  "needs.reconcile-operational-pending.outputs.recovery_action == 'EXACT_TARGET_REDEPLOY'",
  'pages: write',
  'id-token: write',
  'environment:\n      name: github-pages',
  'uses: actions/configure-pages@v6',
  'name: github-pages-recovery-${{ github.run_id }}-${{ github.run_attempt }}',
  'artifact_name: github-pages-recovery-${{ github.run_id }}-${{ github.run_attempt }}',
  'retention-days: 14',
  'name: ravscore-operational-recovery-handoff-${{ github.run_id }}-${{ github.run_attempt }}',
]) {
  if (!operationalWriterSection.includes(marker)) throw new Error(`Den isolerede Pages-writer mangler ${marker}`);
}
for (const forbidden of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ravscore-operational-activation.mjs']) {
  if (operationalWriterSection.includes(forbidden)) {
    throw new Error(`Pages-writeren må ikke have central state-adgang: ${forbidden}`);
  }
}
for (const marker of [
  'name: Finalize exact recovered target without Pages privileges',
  'name: ${{ needs.reconcile-operational-pending.outputs.recovery_bundle_name }}',
  'name: ravscore-operational-recovery-handoff-${{ github.run_id }}-${{ github.run_attempt }}',
  'SUPABASE_URL: ${{ secrets.SUPABASE_URL }}',
  'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
  'node scripts/ravscore-operational-pages-recovery.mjs',
  'node scripts/verify-ravscore-operational-pages-deployment.mjs',
  'node scripts/ravscore-operational-activation.mjs reconcile',
  '--deployment-id "pages-recovery-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"',
]) {
  if (!operationalFinalizerSection.includes(marker)) throw new Error(`Den centrale recovery-finalizer mangler ${marker}`);
}
for (const forbidden of ['pages: write', 'id-token: write', 'environment:\n      name: github-pages', 'pattern:', 'merge-multiple:']) {
  if (operationalFinalizerSection.includes(forbidden)) {
    throw new Error(`Den centrale finalizer må ikke have bred Pages/artifact-adgang: ${forbidden}`);
  }
}
for (const marker of [
  'if [ "$(jq -r \'.requestedModel\' "$RAVRADAR_OPERATIONAL_WORK/current-before-cas.json")" = "integrated" ]; then',
  'completion_args+=(--plan "$handoff/plan.json")',
]) {
  if (!operationalFinalizerSection.includes(marker)) {
    throw new Error(`Recovery-finalizer skal route direct Candidate H0→integrated efter requestedModel: ${marker}`);
  }
}
for (const marker of [
  '- finalize-operational-pages-recovery',
  'GEOMETRY_ONLY:',
  'test "$RECONCILE_RESULT" = "skipped"',
  'test "$EXACT_TARGET_RESULT" = "skipped"',
  'test "$FINALIZE_RESULT" = "skipped"',
  'test "$FINALIZE_RESULT" = "success"',
]) {
  if (!operationalRecoveryGateSection.includes(marker)) throw new Error(`Recovery-terminalgaten mangler ${marker}`);
}
if (!text.slice(operationalRecoveryPositions.currentHour).startsWith('\n  current-hour-readiness:\n')
  || !text.slice(operationalRecoveryPositions.currentHour, text.indexOf('\n  trip-storage-readiness:', operationalRecoveryPositions.currentHour))
    .includes('needs: operational-recovery-gate')) {
  throw new Error('Current-hour må ikke starte før recovery-finalizeren er terminalt grøn/skipped.');
}

function assertMarkersOrdered(section, markers, label) {
  let cursor = -1;
  for (const marker of markers) {
    const position = section.indexOf(marker, cursor + 1);
    if (position < 0 || position <= cursor) {
      throw new Error(`${label} mangler ordnet markør: ${marker}`);
    }
    cursor = position;
  }
}
for (const marker of [
  'actions/artifacts/$artifact_id/zip',
  'actions/runs/$attempt_run_id/attempts/$attempt_number',
  'actions/runs/$attempt_run_id/attempts/$attempt_number/jobs?per_page=100',
  '.run_attempt == $runAttempt',
  '[.jobs[]? | select(.name == "Deploy prepared Pages artifact"',
  '.steps[]? | select(.name == "Deploy to GitHub Pages")',
  'test "$deploy_job_count" -eq 1',
  'test "$deploy_step_count" -eq 1',
  '--artifact-seal "$artifact_seal"',
  '--artifact-evidence "$RAVRADAR_OPERATIONAL_WORK/artifact-evidence.json"',
  '--terminal-evidence "$RAVRADAR_OPERATIONAL_WORK/terminal-evidence-v2.json"',
  'EXACT_TARGET_REDEPLOY',
  'TARGET_RECONCILE',
  'SAFE_SOURCE_ABORT',
]) {
  if (!operationalReconcileSection.includes(marker)) throw new Error(`Recovery-classifierjobbet mangler ${marker}`);
}
for (const marker of [
  'if [ "$(jq -r \'.requestedModel\' "$RAVRADAR_OPERATIONAL_WORK/current.json")" = "integrated" ]; then',
  'completion_args+=(--plan "$RAVRADAR_OPERATIONAL_WORK/handoff/plan.json")',
]) {
  if (!operationalReconcileSection.includes(marker)) {
    throw new Error(`TARGET_RECONCILE skal route direct Candidate H0→integrated efter requestedModel: ${marker}`);
  }
}
assertMarkersOrdered(operationalReconcileSection, [
  'sealed_artifact_digest_raw=',
  'test "$artifact_digest_sha256" = "$sealed_artifact_digest_sha256"',
  'downloaded_zip_sha256=',
  'test "$downloaded_zip_sha256" = "$sealed_artifact_digest_sha256"',
  'test "$(unzip -Z1 "$RAVRADAR_OPERATIONAL_WORK/original-pages.zip" | wc -l)" -eq 1',
  'unzip -q "$RAVRADAR_OPERATIONAL_WORK/original-pages.zip"',
  'python3 - "$RAVRADAR_OPERATIONAL_WORK/artifact-archive/artifact.tar"',
  'tar --extract',
], 'Recovery-classifierens seal→REST→raw ZIP→sikker extraction');
assertMarkersOrdered(operationalWriterSection, [
  'downloaded_zip_sha256=',
  'sealed_artifact_digest_raw=',
  'test "$downloaded_zip_sha256" = "$sealed_artifact_digest_sha256"',
  'artifactSizeBytes | select(type == "number" and . > 0 and floor == .)',
  'test "$(unzip -Z1 "$bundle/original-pages.zip" | wc -l)" -eq 1',
  'unzip -q "$bundle/original-pages.zip"',
  'python3 - "$RAVRADAR_OPERATIONAL_WORK/artifact-archive/artifact.tar"',
  'tar --extract',
], 'Pages-writerens seal→raw ZIP→sikker extraction');
const pagesArtifactUploadPosition = text.indexOf('name: Upload GitHub Pages artifact');
const pagesArtifactSealPosition = text.indexOf('name: Resolve and seal the exact uploaded Pages artifact');
const handoffAfterSealPosition = text.indexOf('name: Upload privacy-safe operational handoff evidence after Pages artifact seal');
const firstActivationCasPosition = Math.min(...[
  'node scripts/ravscore-operational-activation.mjs begin',
  'node scripts/ravscore-operational-activation.mjs refresh-begin',
  'node scripts/ravscore-operational-activation.mjs legacy-refresh-begin',
  'node scripts/ravscore-operational-activation.mjs return-begin',
].map((marker) => text.indexOf(marker)).filter((position) => position >= 0));
if (!(pagesArtifactUploadPosition < pagesArtifactSealPosition
  && pagesArtifactSealPosition < handoffAfterSealPosition
  && handoffAfterSealPosition < firstActivationCasPosition)) {
  throw new Error('Pages artifact-id/digest/størrelse skal forsegles og handoffes før første activation CAS.');
}
const sourceRestoreSection = text.slice(
  text.indexOf('name: Restore the exact sealed active source implementation'),
  text.indexOf('\n      - name:', text.indexOf('name: Restore the exact sealed active source implementation') + 1),
);
for (const marker of [
  '^pages-([0-9]+)-([0-9]+)$',
  'ravscore-operational-handoff-$source_run_id-$source_attempt',
  '^pages-recovery-([0-9]+)-([0-9]+)$',
  'ravscore-operational-recovery-handoff-$source_run_id-$source_attempt',
  'gh run download "$source_run_id"',
  '--name "$source_handoff_name"',
]) {
  if (!sourceRestoreSection.includes(marker)) throw new Error(`Recovery-lineage kan ikke blive næste eksakte source: ${marker}`);
}
const recoveryConcurrencySection = text.slice(text.indexOf('\nconcurrency:'), text.indexOf('\njobs:'));
for (const marker of [
  "inputs.geometry_v2_national == true && 'ravradar-geometry-v2-national'",
  "inputs.geometry_v2_pilot == true && 'ravradar-geometry-v2-pilot'",
  "'ravradar-weather-production'",
  'cancel-in-progress: false',
]) {
  if (!recoveryConcurrencySection.includes(marker)) throw new Error(`Event×group-kontrakten mangler ${marker}`);
}
const recoveryEventMatrix = [
  { eventName: 'push', pilot: false, national: false, group: 'ravradar-weather-production', reconcile: true },
  { eventName: 'schedule', pilot: false, national: false, group: 'ravradar-weather-production', reconcile: true },
  { eventName: 'workflow_dispatch', pilot: false, national: false, group: 'ravradar-weather-production', reconcile: true },
  { eventName: 'workflow_dispatch', pilot: true, national: false, group: 'ravradar-geometry-v2-pilot', reconcile: false },
  { eventName: 'workflow_dispatch', pilot: false, national: true, group: 'ravradar-geometry-v2-national', reconcile: false },
];
for (const event of recoveryEventMatrix) {
  const geometryOnly = event.eventName === 'workflow_dispatch' && (event.pilot || event.national);
  const evaluatedGroup = event.eventName === 'workflow_dispatch' && event.national
    ? 'ravradar-geometry-v2-national'
    : event.eventName === 'workflow_dispatch' && event.pilot
      ? 'ravradar-geometry-v2-pilot'
      : 'ravradar-weather-production';
  const reconcileRuns = !geometryOnly;
  assert.equal(evaluatedGroup, event.group, `Forkert concurrency-gruppe for ${event.eventName}.`);
  assert.equal(reconcileRuns, event.reconcile, `Forkert reconcile-job-if for ${event.eventName}.`);
  if (geometryOnly) {
    assert.equal(reconcileRuns, false);
    assert.ok(operationalRecoveryGateSection.includes('test "$RECONCILE_RESULT" = "skipped"'));
    assert.ok(operationalRecoveryGateSection.includes('test "$EXACT_TARGET_RESULT" = "skipped"'));
    assert.ok(operationalRecoveryGateSection.includes('test "$FINALIZE_RESULT" = "skipped"'));
  }
}
const deploymentDecisionSection = text.slice(
  text.indexOf('name: Decide whether this sealed artifact may deploy'),
  text.indexOf('name: Upload privacy-safe operational handoff evidence'),
);
for (const marker of [
  'if [ "$action" = "candidate-dry-run" ]',
  'echo "should_deploy=false" >> "$GITHUB_OUTPUT"',
  'Candidate G dry-run completed without public or central activation.',
]) {
  if (!deploymentDecisionSection.includes(marker)) throw new Error(`Candidate-dry-run deploygaten mangler ${marker}`);
}
assert.equal(
  (text.match(/name: Atomically promote the validated point candidate in central admin storage/g) || []).length,
  1,
  'Det validerede punkt må kun promoveres én gang pr. produktionsbuild.',
);
assert.equal(
  (text.match(/run: python scripts\/promote-coastal-point-activation\.py/g) || []).length,
  1,
  'Pointpromoter-scriptet må kun kaldes én gang pr. produktionsbuild.',
);
for (const name of [
  'Atomically promote the validated point candidate in central admin storage',
  'Save atomic schema-6 and Candidate G rollback checkpoint after final gates',
  'Publish atomic RavScore checkpoint to protected admin storage',
]) {
  const start = text.indexOf(`name: ${name}`);
  const end = text.indexOf('\n      - name:', start + 1);
  const block = text.slice(start, end);
  if (!block.includes("steps.operational-action.outputs.action != 'candidate-dry-run'")) {
    throw new Error(`${name} skal være fail-closed under candidate-dry-run.`);
  }
}
const continuationSaveSection = text.slice(positions.continuationBuild, positions.privateRuntimeSpec);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success'",
  'node scripts/ravscore-continuation-checkpoint.mjs',
  '--save',
  '--source data/live/conditions.json',
  'uses: actions/cache/save@v6',
  'ravscore-continuation-schema6-v2-${{ github.run_id }}-${{ github.run_attempt }}',
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
const preflightStateSaveSection = text.slice(positions.preflightStateBuild, positions.privateRuntimeSpec);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true' && steps.weather.outcome == 'success' && steps.operational-action.outputs.action != 'candidate-dry-run'",
  'node scripts/private-production-runtime-workflow.mjs create-preflight',
  '--repository-root "$GITHUB_WORKSPACE"',
  '--output .cache/weather-preflight-state/state.json',
  'uses: actions/cache/save@v6',
  'path: .cache/weather-preflight-state',
  'weather-preflight-state-v1-${{ runner.os }}-${{ github.run_id }}-${{ github.run_attempt }}',
]) {
  if (!preflightStateSaveSection.includes(marker)) throw new Error(`Dataminimeret vejrpreflight-bevaring mangler ${marker}`);
}
if (preflightStateSaveSection.includes('continue-on-error')) {
  throw new Error('Dataminimeret vejrpreflight-state skal bygges og gemmes fail-closed efter slutgates.');
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
  "inputs.geometry_v2_pilot == true",
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
const deploySection = text.slice(text.indexOf('deploy-pages:'), text.indexOf('production-outcome:'));
const buildTimeoutMinutes = Number(buildSection.match(/^    timeout-minutes: (\d+)$/m)?.[1]);
const dmiBulkEnd = text.indexOf('\n      - name:', positions.dmiBulk + 1);
const dmiBulkSection = text.slice(
  positions.dmiBulk,
  dmiBulkEnd < 0 ? text.length : dmiBulkEnd,
);
const dmiStepTimeoutMinutes = Number(dmiBulkSection.match(/^        timeout-minutes: (\d+)$/m)?.[1]);
const bootstrapRuntimeSeconds = Number(
  dmiBulkSection.match(/DMI_BULK_MAX_RUNTIME_SECONDS:.*'([0-9]+)'\s*\|\|\s*'900'/)?.[1],
);
if (!Number.isFinite(buildTimeoutMinutes)
  || !Number.isFinite(dmiStepTimeoutMinutes)
  || !Number.isFinite(bootstrapRuntimeSeconds)) {
  throw new Error('WAM-bootstrap timeoutkontrakten kunne ikke aflæses entydigt.');
}
if (dmiStepTimeoutMinutes * 60 < bootstrapRuntimeSeconds + 300) {
  throw new Error('DMI-step-timeout skal rumme bootstrap-runtime plus mindst fem minutters sikker afslutningsmargin.');
}
if (buildTimeoutMinutes < dmiStepTimeoutMinutes + 30) {
  throw new Error('Buildjobbet skal rumme hele DMI-steppet plus mindst 30 minutter til forudgående og efterfølgende gates.');
}
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
const productionConcurrencySection = text.slice(text.indexOf('\nconcurrency:'), text.indexOf('\njobs:'));
if (!productionConcurrencySection.includes('cancel-in-progress: false')) throw new Error('En ny kørsel må aldrig afbryde en operationel RavScore-transition.');
if (!text.includes("'ravradar-geometry-v2-national'") || !text.includes("'ravradar-geometry-v2-pilot'")) throw new Error('Private GeoDanmark-jobs skal have separate concurrency-grupper fra vejropdateringer.');
if ((text.match(/cancel-in-progress:/g) || []).length !== 1) throw new Error('Workflowet skal have præcis én fælles, ikke-annullerende concurrencykontrakt.');

const deploymentPosition = text.indexOf('name: Deploy to GitHub Pages');
const publicVerificationPosition = text.indexOf('name: Verify deployed exact model, implementation and 210/673 artifact');
const failureReconciliationPosition = text.indexOf('name: Reconcile an ambiguous failed transition from observed public identity');
const deploymentTerminalPosition = text.indexOf('name: Seal exact verified deployment terminal');
const outcomeJobPosition = text.indexOf('\n  production-outcome:');
if (!(deploymentPosition < publicVerificationPosition
  && publicVerificationPosition < failureReconciliationPosition
  && failureReconciliationPosition < deploymentTerminalPosition
  && deploymentTerminalPosition < outcomeJobPosition)) {
  throw new Error('DEPLOYED-beviset skal ligge efter Pages, offentlig exact 210/673-verifikation og alle activation/reconciliation-trin.');
}
const deploymentTerminalSection = text.slice(deploymentTerminalPosition, outcomeJobPosition);
for (const marker of [
  'id: deployment-terminal',
  "if: success() && steps.deployment.outcome == 'success' && steps.public-verification.outcome == 'success'",
  'echo "deployed_verified=true" >> "$GITHUB_OUTPUT"',
]) {
  if (!deploymentTerminalSection.includes(marker)) throw new Error(`Deployment-terminalen mangler ${marker}`);
}

for (const marker of [
  'preflight_should_run: ${{ steps.preflight.outputs.should_run }}',
  'weather_outcome: ${{ steps.weather.outcome }}',
  'full_validation_outcome: ${{ steps.full-validation.outcome }}',
  'release_gate_outcome: ${{ steps.release-gate.outcome }}',
  'pages_build_outcome: ${{ steps.pages-build.outcome }}',
  'pages_privacy_outcome: ${{ steps.pages-privacy.outcome }}',
  'handoff_upload_outcome: ${{ steps.handoff-upload.outcome }}',
  'pages_configure_outcome: ${{ steps.pages-configure.outcome }}',
  'pages_upload_outcome: ${{ steps.pages-upload.outcome }}',
  'artifact_built: ${{ steps.pages-build.outputs.built }}',
  'id: full-validation',
  'id: release-gate',
  'id: pages-build',
  'id: pages-privacy',
  'id: handoff-upload',
  'id: pages-configure',
  'id: pages-upload',
  'echo "built=true" >> "$GITHUB_OUTPUT"',
]) {
  if (!buildSection.includes(marker)) throw new Error(`Buildets slutstatusbevis mangler ${marker}`);
}

const outcomeSection = text.slice(outcomeJobPosition);
for (const marker of [
  'name: Classify exact weather production outcome',
  'if: always()',
  'contents: read',
  'node scripts/production-workflow-outcome.mjs',
  '--output .workflow-outcome/production-outcome.json',
  '--github-output "$GITHUB_OUTPUT"',
  '--summary "$GITHUB_STEP_SUMMARY"',
  'name: ravradar-production-outcome-${{ github.run_id }}-${{ github.run_attempt }}',
  'path: .workflow-outcome/production-outcome.json',
  'if-no-files-found: error',
  "if: always() && steps.classify.outputs.status == 'FAILED'",
  'RAVRADAR_OUTCOME_JOB_RECOVERY_WRITER: ${{ needs.recover-operational-pages-target.result }}',
  'RAVRADAR_OUTCOME_JOB_RECOVERY_FINALIZER: ${{ needs.finalize-operational-pages-recovery.result }}',
  'RAVRADAR_OUTCOME_JOB_RECOVERY_GATE: ${{ needs.operational-recovery-gate.result }}',
  'RAVRADAR_OUTCOME_RECOVERY_ACTION: ${{ needs.reconcile-operational-pending.outputs.recovery_action }}',
  'RAVRADAR_OUTCOME_OPERATIONAL_ACTION: ${{ needs.build-and-prepare.outputs.operational_action }}',
  'exit 1',
]) {
  if (!outcomeSection.includes(marker)) throw new Error(`Produktionsslutstatusjobbet mangler ${marker}`);
}
const outcomeNeeds = [...outcomeSection.slice(
  outcomeSection.indexOf('    needs:'),
  outcomeSection.indexOf('    if: always()'),
).matchAll(/^      - ([a-z0-9-]+)$/gm)].map((match) => match[1]);
assert.deepEqual(outcomeNeeds, [
  'validate-dispatch',
  'reconcile-operational-pending',
  'recover-operational-pages-target',
  'finalize-operational-pages-recovery',
  'operational-recovery-gate',
  'current-hour-readiness',
  'trip-storage-readiness',
  'build-and-prepare',
  'geometry-v2-national',
  'geometry-v2-pilot',
  'deploy-pages',
]);
for (const forbidden of ['secrets.', 'SUPABASE_', 'data/live/', 'currentUMps', 'currentVMps', 'waterPoint', 'landPoint', 'coordinates']) {
  if (outcomeSection.includes(forbidden)) throw new Error(`Det payloadfri outcomejob må ikke indeholde ${forbidden}`);
}

console.log('Workflowinventar, rækkefølge, deployisolering og progressiv DMI-cache består.');
