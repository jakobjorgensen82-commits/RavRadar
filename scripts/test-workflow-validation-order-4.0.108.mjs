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
  'npm run test:production-hour-lock',
  'npm run test:dmi-acquisition',
  'npm run test:dmi-bulk-forecast-integration',
  'npm run test:live-current-pilot',
  'npm run test:water-source-production-chain',
  'npm run test:workflow-action-contracts',
  'python -m py_compile scripts/build-ravscore-historical-wave-pilot.py scripts/test-ravscore-historical-wave-pilot.py',
  'node --check scripts/audit-online-browser-playwright-4.0.237.mjs',
  'npm run release:gate',
]) {
  if (!sourceValidation.includes(marker)) throw new Error('validate:source mangler ' + marker);
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
for (const marker of ['actions/cache/restore@v6', 'copernicus-current-shadow-v1-', 'private-copernicus-current-pilot', 'workflow_run:', 'workflows: ["Update weather and deploy RavRadar"]', 'types: [requested]', 'python3 scripts/check-copernicus-current-hour.py', 'target_hour: ${{ steps.cache-state.outputs.target_hour }}', 'inputs[sample_time]=${{ needs.preserve.outputs.target_hour }}', 'validate-copernicus-current-pilot.yml/dispatches']) {
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
  hydrate: text.indexOf('name: Hydrate latest deployed weather state'),
  gapCheckpoint: text.indexOf('name: Inspect failed-run Candidate G gap checkpoint recovery'),
  preflight: text.indexOf('name: Decide whether weather needs updating'),
  sourceGate: text.indexOf('name: Run fast source gate before expensive data refresh'),
  fallbackStage: text.indexOf('name: Stage audited last verified Candidate G public fallback'),
  dmiBulk: text.indexOf('name: Update DMI bulk model cache'),
  targetedCopernicus: text.indexOf('name: Select exact-hour DMI gaps for targeted Copernicus supplement'),
  resolvedCurrentHour: text.indexOf('name: Bind production to resolved DMI current hour'),
  weather: text.indexOf('name: Update central weather cache'),
  provenance: text.indexOf('name: Attach scientific current provenance and exact DMI grid points'),
  runtime: text.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  publicAudit: text.indexOf('name: Audit actual Candidate G public runtime before deploy'),
  fallbackPublish: text.indexOf('name: Publish bounded Candidate G recovery fallback when current runtime is warming up'),
  reference: text.indexOf('name: Generate and strictly validate production reference zones'),
  validate: text.indexOf('name: Validate full project after fresh weather and current provenance'),
  gate: text.indexOf('name: Run release governance gate after refreshed data validation'),
  artifact: text.indexOf('name: Build lean GitHub Pages artifact'),
};
for (const [name, pos] of Object.entries(positions)) {
  if (pos < 0) throw new Error(`Mangler workflowtrin: ${name}`);
}
const expected = ['hydrate','preflight','sourceGate','fallbackStage','gapCheckpoint','dmiBulk','targetedCopernicus','resolvedCurrentHour','weather','provenance','runtime','publicAudit','fallbackPublish','reference','validate','gate','artifact'];
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
const publicAuditBlockEnd = text.indexOf('\n\n', positions.publicAudit);
const publicAuditBlock = text.slice(positions.publicAudit,
  publicAuditBlockEnd < 0 ? text.length : publicAuditBlockEnd);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/audit-ravscore-candidate-g-public-shadow.mjs',
  '--input data/live/conditions.json',
]) {
  if (!publicAuditBlock.includes(marker)) {
    throw new Error(`Den faktiske Candidate G public runtime-gate mangler ${marker}`);
  }
}
if (publicAuditBlock.includes('continue-on-error')) {
  throw new Error('Den faktiske Candidate G public runtime-gate må ikke være vejledende.');
}
const gapCheckpointSection = text.slice(positions.gapCheckpoint, positions.dmiBulk);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/restore-candidate-g-gap-checkpoint.mjs',
  '--target-reference "$RAVRADAR_PRODUCTION_TARGET_HOUR"',
  'uses: actions/download-artifact@v8',
  'run-id: ${{ steps.candidate-g-gap-checkpoint.outputs.source_run_id }}',
  'unzip -p .cache/candidate-g-gap-checkpoint-artifact/RavRadar-support-3633.zip',
  'project/data/live/conditions.json',
  'Restore only verified compact suffix from failed Candidate G run',
]) {
  if (!gapCheckpointSection.includes(marker)) throw new Error(`Candidate G-gapcheckpointet mangler ${marker}`);
}
const fallbackStageSection = text.slice(positions.fallbackStage, positions.dmiBulk);
for (const marker of [
  'uses: actions/cache/restore@v6',
  'candidate-g-last-ready-public-v1-',
  'node scripts/candidate-g-public-recovery-fallback.mjs',
  '--stage',
  '--github-output "$GITHUB_OUTPUT"',
  'uses: actions/cache/save@v6',
  "steps.candidate-g-public-fallback-stage.outputs.cache_refreshed == 'true'",
]) {
  if (!fallbackStageSection.includes(marker)) throw new Error(`Candidate G-nødgrundlaget mangler ${marker}`);
}
const fallbackPublishBlockEnd = text.indexOf('\n\n', positions.fallbackPublish);
const fallbackPublishBlock = text.slice(positions.fallbackPublish,
  fallbackPublishBlockEnd < 0 ? text.length : fallbackPublishBlockEnd);
for (const marker of [
  "if: steps.preflight.outputs.should_run == 'true'",
  'node scripts/candidate-g-public-recovery-fallback.mjs',
  '--publish',
  '--audit .geometry-v2-work/candidate-g-public-runtime-audit.json',
]) {
  if (!fallbackPublishBlock.includes(marker)) throw new Error(`Candidate G-nødpubliceringen mangler ${marker}`);
}
if (fallbackPublishBlock.includes('continue-on-error')) {
  throw new Error('Candidate G-nødpubliceringen må ikke skjule fejl.');
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
if (!text.includes("github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true && inputs.ravscore_active_shadow != true)")) {
  throw new Error('Private GeoDanmark- og RavScore-dispatches skal udelukke det almindelige build- og deployjob.');
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
if (!text.includes("cancel-in-progress: ${{ github.event_name == 'push'")) throw new Error('Push-release skal kunne prioritere sig foran en ældre almindelig vejropdatering.');
if (!text.includes("'ravradar-geometry-v2-national'") || !text.includes("'ravradar-geometry-v2-pilot'")) throw new Error('Private GeoDanmark-jobs skal have separate concurrency-grupper fra vejropdateringer.');
if (!text.includes('inputs.force == true || inputs.geometry_v2_pilot == true || inputs.geometry_v2_national == true')) throw new Error('Et nyere eksplicit geometri-job skal kunne erstatte sit ældre job uden at dele vejrkø.');

console.log('Workflowinventar, rækkefølge, deployisolering og progressiv DMI-cache består.');
