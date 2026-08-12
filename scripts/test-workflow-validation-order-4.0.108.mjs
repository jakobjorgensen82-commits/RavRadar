import fs from 'node:fs';

const path = '.github/workflows/update-and-deploy.yml';
const workflowDirectory = '.github/workflows';
const workflowFiles = fs.readdirSync(workflowDirectory)
  .filter((name) => /\.ya?ml$/i.test(name))
  .sort();
const expectedWorkflowFiles = ['extract-private-geodanmark-layer.yml', 'update-and-deploy.yml', 'validate-approved-public-coast.yml', 'validate-six-zone-recovery.yml'];
if (JSON.stringify(workflowFiles) !== JSON.stringify(expectedWorkflowFiles)) {
  throw new Error(`Uventet workflowinventar: ${workflowFiles.join(', ') || '(tomt)'}. Kun produktionsworkflowet og de to private, ikke-deployerende geometriworkflows må være aktive.`);
}
for (const privateName of expectedWorkflowFiles.filter(name => name !== 'update-and-deploy.yml')) {
  const privateWorkflow = fs.readFileSync(`${workflowDirectory}/${privateName}`, 'utf8');
  if (privateWorkflow.includes('pages: write') || privateWorkflow.includes('id-token: write') || privateWorkflow.includes('deploy-pages')) {
    throw new Error(`${privateName} må ikke kunne deploye Pages.`);
  }
}
const text = fs.readFileSync(path, 'utf8');
const positions = {
  hydrate: text.indexOf('name: Hydrate latest deployed weather state'),
  preflight: text.indexOf('name: Decide whether weather needs updating'),
  weather: text.indexOf('name: Update central weather cache'),
  provenance: text.indexOf('name: Attach scientific current provenance and exact DMI grid points'),
  runtime: text.indexOf('name: Rebuild deterministic public weather runtime before validation and deploy'),
  reference: text.indexOf('name: Generate and strictly validate production reference zones'),
  validate: text.indexOf('name: Validate full project after fresh weather and current provenance'),
  gate: text.indexOf('name: Run release governance gate after refreshed data validation'),
  artifact: text.indexOf('name: Build lean GitHub Pages artifact'),
};
for (const [name, pos] of Object.entries(positions)) {
  if (pos < 0) throw new Error(`Mangler workflowtrin: ${name}`);
}
const expected = ['hydrate','preflight','weather','provenance','runtime','reference','validate','gate','artifact'];
for (let i = 1; i < expected.length; i += 1) {
  const before = expected[i - 1];
  const after = expected[i];
  if (!(positions[before] < positions[after])) {
    throw new Error(`Forkert rækkefølge: ${before} skal ligge før ${after}`);
  }
}
const beforeWeather = text.slice(0, positions.weather);
if (beforeWeather.includes('npm run validate') || beforeWeather.includes('npm run release:gate')) {
  throw new Error('Validering/release gate må ikke køre før frisk vejr og u/v-proveniens er bygget.');
}
if (beforeWeather.includes('npm run build:current-provenance')) {
  throw new Error('Hydrerede data må ikke tvinges gennem strømaudit før frisk DMI-kørsel på tvungne/source runs.');
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
if (!text.includes('uses: actions/cache/restore@v4') || !text.includes('uses: actions/cache/save@v4')) throw new Error('DMI GRIB-cachen skal både gendannes og gemmes med fremdrift.');
if (/uses: actions\/cache@v4[\s\S]{0,300}key: dmi-grib-v3-/.test(text)) throw new Error('Den uforanderlige ugentlige primærnøgle må ikke genindføres.');
if (!text.includes('${{ github.run_id }}-${{ github.run_attempt }}')) throw new Error('Den gemte DMI-cache skal have en unik nøgle pr. kørsel.');

if (!text.includes('build-and-prepare:') || !text.includes('deploy-pages:')) throw new Error('Data/build og Pages-deploy skal være separate jobs.');
if (!text.includes('geometry-v2-pilot:')) throw new Error('Workflow mangler det isolerede GeoDanmark geometry-v2 pilotjob.');
if (!text.includes("if: github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true)")) {
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
if (!text.includes("cancel-in-progress: ${{ github.event_name == 'push'")) throw new Error('Push-release skal kunne prioritere sig foran en ældre almindelig vejropdatering.');
if (!text.includes("'ravradar-geometry-v2-national'") || !text.includes("'ravradar-geometry-v2-pilot'")) throw new Error('Private GeoDanmark-jobs skal have separate concurrency-grupper fra vejropdateringer.');
if (!text.includes('inputs.force == true || inputs.geometry_v2_pilot == true || inputs.geometry_v2_national == true')) throw new Error('Et nyere eksplicit geometri-job skal kunne erstatte sit ældre job uden at dele vejrkø.');

console.log('Workflowinventar, rækkefølge, deployisolering og progressiv DMI-cache består.');
