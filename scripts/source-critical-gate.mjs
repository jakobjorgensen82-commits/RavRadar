import { readHistoricalSourceCriticalWorkflowSources } from './lib/pages-closure-historical-test-input.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { inverseArchivedWeatherRestartWorkflow } from './lib/archived-weather-restart-workflow-review.mjs';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const version = packageJson.version;
assert.match(version, /^\d+\.\d+\.\d+$/, 'package.json mangler en gyldig version.');

for (const [file, field] of [
  ['version.json', 'version'],
  ['data/kystdata.json', 'version'],
  ['data/zones.geojson', 'version'],
  ['docs/handbook/content.json', 'handbookVersion'],
]) {
  assert.equal(JSON.parse(read(file))[field], version, `${file} følger ikke releaseversion ${version}.`);
}

for (const file of ['index.html', 'about.html', 'admin.html', 'jordrav.html', 'bootstrap.js', 'service-worker.js']) {
  assert.ok(read(file).includes(version), `${file} mangler cache-/releaseversion ${version}.`);
}
const appSource = read('app.js');
assert.ok(appSource.includes('function currentAppVersion()')
  && appSource.includes("document.querySelector('#appVersion')?.textContent"),
'Browseren skal læse appversionen fra den versionssynkroniserede side uden en gammel hardkodet fallback.');
for (const match of appSource.matchAll(/\b\d+\.\d+\.\d+\b/g)) {
  assert.equal(match[0], version, `app.js indeholder den forældede runtimeversion ${match[0]}.`);
}

function javascriptFiles(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = path.posix.join(directory.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) return javascriptFiles(relative);
    return entry.isFile() && /\.js$/i.test(entry.name) ? [relative] : [];
  });
}

const browserSources = ['app.js', 'bootstrap.js', 'config.js', 'service-worker.js', ...javascriptFiles('js')];
const syntaxFailures = [];
for (const file of browserSources) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) syntaxFailures.push(`${file}: ${(result.stderr || result.stdout || 'syntaksfejl').trim()}`);
}
assert.deepEqual(syntaxFailures, [], `Browserkoden indeholder syntaksfejl:\n${syntaxFailures.join('\n')}`);

for (const page of ['index.html', 'about.html', 'admin.html', 'jordrav.html']) {
  for (const match of read(page).matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    const local = reference.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!local) continue;
    assert.ok(fs.existsSync(path.join(root, local)), `${page} henviser til en manglende fil: ${reference}`);
  }
}

const actualBuildWorkflow = read('.github/workflows/reusable-weather-build.yml').replaceAll('\r\n', '\n');
const historicalWorkflowSources = readHistoricalSourceCriticalWorkflowSources();
const buildWorkflow = historicalWorkflowSources.build;
// The old whole oracle remains below. Independently inspect the REAL Source
// predicates; an old text view must never hide a missing publication gate.
{ // Source current predicates are mandatory, independent of historical input.
  const step = name => {
    const marker = '      - name: ' + name + '\n';
    assert.equal(actualBuildWorkflow.split(marker).length, 2, 'Unique actual Source gate ' + name);
    const start = actualBuildWorkflow.indexOf(marker);
    const next = actualBuildWorkflow.indexOf('\n      - name: ', start + marker.length);
    return actualBuildWorkflow.slice(start, next < 0 ? undefined : next);
  };
  const predicate = name => step(name).split('\n').find(line => line.startsWith('        if: '))?.slice(12);
  const savedPair = "steps.source-route.outputs.source_saved_pair == 'true' && steps.source-saved-pair-admission.outcome == 'success' && steps.source-saved-pair-target.outcome == 'success'";
  assert.equal(predicate('Validate critical production artifact after fresh weather and current provenance'),
    "(steps.operational-model.outputs.source_normal_producer == 'false' && (steps.preflight.outputs.should_run == 'true' && steps.operational-action.outputs.action != 'integrated-cutover'))"
    + ` || (${savedPair} && steps.production-reference-zones.outcome == 'success')`);
  assert.equal(predicate('Run release governance gate after refreshed data validation'),
    "(steps.operational-model.outputs.source_normal_producer == 'false' && (always() && steps.preflight.outputs.should_run == 'true' && steps.operational-action.outputs.action != 'integrated-cutover'))"
    + ` || (${savedPair} && steps.full-validation.outcome == 'success')`);
  assert.equal(predicate('Run the one explicit owned SOURCE ordinary route'),
    "steps.operational-model.outputs.source_normal_producer == 'true' && steps.source-route.outputs.source_saved_pair != 'true'");
  const route = step('Select actual route observations without legacy fallback');
  for (const marker of ["assert.equal(process.env.SOURCE_ACTION_OUTCOME,'success'",
    '"full_validation_outcome":"source_full_validation_outcome"',
    '"release_gate_outcome":"source_release_gate_outcome"',
    "assert.equal(outputs.preflight_should_run,'true'",
    "assert.equal(report.sourceHead,process.env.GITHUB_SHA",
    "assert.equal(report.privatePayloadIncluded,false"]) assert.ok(route.includes(marker), marker);
  const savedStart = route.indexOf("if(process.env.SOURCE_SAVED_PAIR==='true'){");
  const savedEnd = route.indexOf('}else if(selected===false){', savedStart);
  assert.ok(savedStart >= 0 && savedEnd > savedStart, 'The actual saved-pair route must be distinct');
  const savedRoute = route.slice(savedStart, savedEnd);
  for (const marker of [
    "assert.equal(selected,true,'SOURCE_SAVED_PAIR_NOT_SELECTED')",
    "assert.equal(process.env.SOURCE_ACTION_OUTCOME,'skipped','SOURCE_SAVED_PAIR_FRESH_ACTION')",
    "['ADMISSION','TARGET','NO_LOSS','DISPOSITION']",
    "'success','SOURCE_SAVED_PAIR_REQUIRED_'+k",
    "['CHECKPOINT_BUILD','CHECKPOINT_SAVE','CHECKPOINT_PUBLISH','B_PUBLISH']",
    "'skipped','SOURCE_SAVED_PAIR_UNEXPECTED_'+k",
    "assert.equal(outputs.full_validation_outcome,'success')",
    "assert.equal(outputs.release_gate_outcome,'success')",
    "assert.equal(process.env.SAVED_DISPOSITION_KIND,'SAVED_PAIR_READBACK_VERIFIED')",
  ]) assert.ok(savedRoute.includes(marker), marker);
  const pages = step('Build lean GitHub Pages artifact');
  assert.equal(predicate('Build lean GitHub Pages artifact'),
    "steps.weather-route-result.outputs.preflight_should_run == 'true'");
  const fields = pages.match(/if test "\$\{\{ (steps\.[a-z-]+\.outputs\.[a-z_]+) \}\}" != 'integrated-cutover'; then\n\s+if test "\$\{\{ (steps\.[a-z-]+\.outputs\.[a-z_]+) \}\}" != success \\\n\s+\|\| test "\$\{\{ (steps\.[a-z-]+\.outputs\.[a-z_]+) \}\}" != success; then/);
  assert.ok(fields, 'Actual Source Pages shell must retain both final success gates and its cutover branch');
  assert.deepEqual(fields.slice(1), ['steps.weather-route-result.outputs.operational_action',
    'steps.weather-route-result.outputs.full_validation_outcome',
    'steps.weather-route-result.outputs.release_gate_outcome']);
  assert.ok(pages.includes('PRODUCTION_PUBLICATION_REQUIRED_GATES_NOT_PASSED'));
  for (const action of ['integrated', 'integrated-historical-maintenance', 'integrated-return', 'integrated-cutover'])
    for (const full of ['', 'success', 'failure', 'cancelled', 'skipped'])
      for (const release of ['', 'success', 'failure', 'cancelled', 'skipped']) {
        const values = { [fields[1]]: action, [fields[2]]: full, [fields[3]]: release };
        const refused = values[fields[1]] !== 'integrated-cutover'
          && (values[fields[2]] !== 'success' || values[fields[3]] !== 'success');
        assert.equal(refused, action !== 'integrated-cutover' && !(full === 'success' && release === 'success'),
          'Both actual centrally mapped Source/ordinary results are required; cutover remains separate');
      }
}

const productionValidationSteps = packageJson.scripts['validate:production-artifact']
  ?.split(/\s*&&\s*/)
  .map(command => command.match(/^npm run ([\w:.-]+)$/)?.[1]);
assert.deepEqual(productionValidationSteps, [
  'validate:data',
  'validate:weather-health',
  'validate:coastlines',
  'validate:zone-plan',
  'test:data-quality',
  'test:forecast-integrity',
  'audit:zone-geometry',
  'test:score-presentation',
  'test:fresh-startup',
  'test:site-function-suite',
  'test:best-time-consistency',
  'test:public-runtime',
  'test:mobile-live-cache',
  'test:release-integrity-4.0.73',
  'test:public-runtime-pipeline',
  'test:progressive-public-conditions',
  'test:current-full-coverage-gate',
  'test:current-spatial-audit',
  'test:current-provenance-null-safety',
  'test:public-startup-order',
  'test:public-nonblocking-forecast',
  'test:current-provenance-vector-consistency',
  'test:flow-arrow-runtime',
  'test:map-zoom-refresh',
  'test:zone-admin-propagation',
  'test:zone-deletion-runtime',
  'test:admin-config-production',
  'test:state-reference-report',
  'test:current-transport-history',
  'test:dmi-vector-grid-integrity',
  'test:missing-weather-null-safety',
  'test:local-part-direction-isolation',
  'test:current-direction-audit',
  'test:water-source-production-chain',
  'test:water-station-active-routing-display',
  'test:hydrated-zone-pruning',
], 'Den kritiske produktionsgate må ikke vokse med historiske eller kildeinterne kontroller.');
assert.ok(buildWorkflow.includes('node scripts/run-validation-collection.mjs')
  && buildWorkflow.includes('--script validate:production-artifact')
  && buildWorkflow.includes('--output .geometry-v2-work/production-artifact-validation-report.json'),
'Produktionsbyg mangler samlet kritisk post-data-validering.');
assert.equal(packageJson.scripts['release:gate:production'],
  'node scripts/run-validation-collection.mjs --script validate:production-release --output .geometry-v2-work/production-release-validation-report.json',
  'Den afgrænsede produktionsartifact-gate mangler.');
assert.ok(buildWorkflow.includes('run: npm run release:gate:production'),
  'Produktionsbyg mangler post-data-governance uden den historiske testsuite.');
assert.ok(!buildWorkflow.includes('run: npm run release:gate\n'),
  'Normal produktion må ikke genkøre den brede historiske release-testsuite.');
assert.ok(buildWorkflow.includes("if: always() && steps.preflight.outputs.should_run == 'true' && steps.operational-action.outputs.action != 'integrated-cutover'"),
'Releasegaten skal stadig forsøges, når den samlede produktionsvalidering finder fejl.');
assert.ok(buildWorkflow.includes('name: Upload payload-free production validation reports')
  && buildWorkflow.includes('.geometry-v2-work/production-artifact-validation-report.json')
  && buildWorkflow.includes('.geometry-v2-work/production-release-validation-report.json'),
'Den payloadfri produktionsrapport mangler.');
const orchestrator = read('.github/workflows/update-and-deploy.yml');
assert.ok(orchestrator.includes('uses: ./.github/workflows/reusable-pages-deploy.yml'), 'Pages-deployet er ikke koblet til produktionsworkflowet.');
assert.ok(read('.github/workflows/validate-pull-request.yml').includes('run: npm run validate:source'), 'PR-kildegaten er ikke aktiv.');
assert.doesNotMatch(orchestrator, /\n  push:/, 'Normal vejrhentning må ikke starte automatisk ved merge.');

const actualCodeOnlyWorkflow = read('.github/workflows/deploy-code-only-repair.yml').replace(/\r\n/g, '\n');
// Source/CI only: qualify the exact reviewed new route first. Its complete
// inverse then preserves every existing code-only oracle below; arbitrary
// changed workflow bytes cannot obtain this historical source view.
for (const marker of [
  'code_only_repair: ${{ inputs.publish_newest_saved_weather != true && inputs.restart_archived_weather != true }}',
  'Select only the unconsumed last-mile archive restart',
  'Apply sole last-mile binding only after all new artifact checks',
  'Read back the actual installed last-mile contracts and unchanged schema2',
  'Require already-installed last-mile saved-weather contracts without replay',
  'Reconcile saved last-mile CURRENT B with central S before public projection',
]) assert.ok(actualCodeOnlyWorkflow.includes(marker), `Archive restart source contract is missing ${marker}.`);
for (const forbidden of ['DMI_API_KEY', 'COPERNICUSMARINE_SERVICE_USERNAME', 'COPERNICUSMARINE_SERVICE_PASSWORD'])
  assert.ok(!actualCodeOnlyWorkflow.includes(forbidden), `Provider-free restart must not contain ${forbidden}.`);
const codeOnlyWorkflow = inverseArchivedWeatherRestartWorkflow(historicalWorkflowSources.codeOnly);
const codeOnlyTrigger = actualCodeOnlyWorkflow.slice(
  actualCodeOnlyWorkflow.indexOf('\non:'),
  actualCodeOnlyWorkflow.indexOf('\npermissions:'),
);
assert.doesNotMatch(codeOnlyTrigger, /\n  (?:push|schedule|workflow_run|pull_request):/,
  'Code-only deploy må kun kunne startes manuelt.');
for (const publicWorkflow of [actualBuildWorkflow, actualCodeOnlyWorkflow]) {
  for (const excluded of [
    "--exclude 'data/kystdata.json'",
    "--exclude 'data/zone-plan.json'",
    "--exclude 'js/services/runtime-diagnostics-archive.js'",
  ]) {
    assert.ok(publicWorkflow.includes(excluded),
      `Pages-pakken mangler privacy-eksklusionen ${excluded}.`);
  }
  assert.ok(publicWorkflow.includes('--root _site')
    && publicWorkflow.includes('pages-public-closure.json')
    && publicWorkflow.includes('cmp -s'),
  'Pages-pakken skal bevises komplet mod sin forseglede browserclosure før upload.');
}
const adminDashboard = read('js/ui/admin-dashboard.js');
assert.ok(adminDashboard.includes(`../services/protected-runtime-envelope.js?v=${version}`),
  'Det offentlige admin-dashboard mangler den publicerbare runtime-envelope-decoder.');
assert.ok(!adminDashboard.includes('runtime-diagnostics-archive.js'),
  'Det offentlige admin-dashboard må ikke importere den udeladte diagnostics-sti.');
for (const marker of [
  'workflow_dispatch:',
  'DEPLOY-CODE-ONLY-REPAIR',
  'node scripts/weather-source-gate.mjs check',
  'steps.source-proof.outputs.required',
  'supabase/setup-cli@3c2f5e2ae34c34e428e8e206e2c4d21fa2d20fbf',
  'node scripts/verify-code-only-migration-plan.mjs',
  'supabase db push --linked --dry-run --skip-vault',
  'supabase db push --linked --skip-vault',
  'node scripts/integrated-cutover-readiness.mjs verify-db',
  'node scripts/prepare-code-only-public-runtime.mjs',
  'providerRequestsPerformed == false',
  'code_only_repair: ${{ inputs.publish_newest_saved_weather != true }}',
  'DEPLOY-SAVED-WEATHER-REPAIR',
  'saved-weather-continuation',
  'uses: ./.github/workflows/reusable-pages-deploy.yml',
]) assert.ok(codeOnlyWorkflow.includes(marker), `Code-only-workflowet mangler ${marker}.`);
const codeOnlyAcquisition = read('scripts/acquire-code-only-public-snapshot.mjs');
for (const marker of [
  'node scripts/acquire-code-only-public-snapshot.mjs acquire',
  'node scripts/acquire-code-only-public-snapshot.mjs assert-current',
]) assert.ok(codeOnlyWorkflow.includes(marker),
  `Code-only-workflowet mangler den normale afgrænsede læser: ${marker}`);
for (const marker of [
  "from './prepare-code-only-public-runtime.mjs'",
  "['data/live/public-condition-details.json', 'public-condition-details.json', null]",
  'manifestBoundedPublicDetailsBytes(manifest.publicConditionDetailsBytes)',
  'cap: cap ?? detailCap',
  "'--max-filesize', String(cap)",
]) assert.ok(codeOnlyAcquisition.includes(marker),
  `Code-only-læserens download mangler manifestbundet detailstørrelse: ${marker}`);
for (const forbidden of [
  'DMI_API_KEY',
  'COPERNICUSMARINE_SERVICE_USERNAME',
  'COPERNICUSMARINE_SERVICE_PASSWORD',
  'OPEN_METEO',
  'node scripts/update-weather.mjs',
  'python scripts/update-dmi-bulk.py',
  'npm run validate:source',
  'npm run validate',
  'npm run release:gate',
]) {
  assert.ok(!codeOnlyWorkflow.includes(forbidden), `Code-only-workflowet må ikke indeholde ${forbidden}.`);
  assert.ok(!codeOnlyAcquisition.includes(forbidden), `Code-only-læseren må ikke indeholde ${forbidden}.`);
}
assert.equal(
  (codeOnlyWorkflow.match(/supabase db push --linked/g) || []).length,
  6,
  'Code-only-workflowet må kun have de fem præcist afgrænsede dry-run-læsninger og én apply.',
);
assert.equal((codeOnlyWorkflow.match(/supabase db push --linked --dry-run --skip-vault/g) || []).length, 5,
  'Normal plan, historiske kontroller, ny assistentgenkontrol og installeret assistentplan skal være dry-run, ikke skrivninger.');
assert.equal((codeOnlyWorkflow.match(/^\s*supabase db push --linked --skip-vault\s*$/gm) || []).length, 1,
  'Der skal fortsat være præcis én database-apply.');
assert.match(codeOnlyWorkflow,
  /if test "\$\{RAVRADAR_ACCOUNT_ASSISTANT_PREWRITE_REQUIRED:-false\}" = "true"; then[\s\S]*?supabase migration list --linked[\s\S]*?supabase db push --linked --dry-run --skip-vault[\s\S]*?--account-assistant-prewrite-plan --require-prewrite-gate[\s\S]*?--expected-pending-version 20261013210000[\s\S]*?fi\s+if test "\$\{RAVRADAR_STATISTICS_REVISION_PHASE:-\}" = "before"; then[\s\S]*?supabase migration list --linked[\s\S]*?supabase db push --linked --dry-run --skip-vault[\s\S]*?verify-statistics-preference-revision-plan\.mjs[\s\S]*?--phase before[\s\S]*?fi\s+if test "\$\{RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-\}" = 'before'; then[\s\S]*?env -u SUPABASE_DB_PASSWORD node[\s\S]*?established-native-current-origin-prewrite\.mjs"[\s\S]*?--slot final[\s\S]*?supabase migration list --linked[\s\S]*?supabase db push --linked --dry-run --skip-vault[\s\S]*?verify-established-native-current-origin-plan\.mjs"[\s\S]*?--phase before[\s\S]*?fi\s+if test "\$\{RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-\}" != 'installed'; then\s+supabase db push --linked --skip-vault/,
  'Historiske gates bevares, og den nye assistentfase skal have frisk originalkontrol og egen eksakt plan før den ene apply.');
assert.match(codeOnlyWorkflow,
  /\(cd "\$\{\{ steps\.migration-view\.outputs\.workdir \}\}" && supabase db push --linked --dry-run --skip-vault\)[\s\S]*?RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_UPGRADE_OPT_IN=false node scripts\/verify-established-native-current-origin-plan\.mjs[\s\S]*?--phase installed[\s\S]*?node scripts\/verify-statistics-preference-revision-schema\.mjs/,
  'Den sidste dry-run skal bevise installeret ny assistentfase med opt-in false og efterfølgende uændret schema2-genlæsning.');
assert.ok(
  read('scripts/verify-code-only-migration-plan.mjs')
    .includes('LATEST_REQUIRED_CUTOVER_MIGRATION'),
  'Code-only migrationsplanen er ikke bundet til den præcise aktuelle migration.',
);

for (const file of [...browserSources, 'package.json', '.github/workflows/update-and-deploy.yml',
  '.github/workflows/reusable-weather-build.yml', '.github/workflows/reusable-pages-deploy.yml',
  '.github/workflows/deploy-code-only-repair.yml']) {
  assert.doesNotMatch(read(file), /^(?:<<<<<<<|=======|>>>>>>>)(?: |$)/m, `${file} indeholder uløste merge-markører.`);
}

await import('./test-jordrav.mjs');
console.log(`OK: ${browserSources.length} browserfiler, lokale sideaktiver, versionsbinding, jordravkontrakt og post-data deploygates er intakte.`);
