import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

const buildWorkflow = read('.github/workflows/reusable-weather-build.yml');
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

// TEST ONLY: preserve the historical origin-only assertions below through
// exactly two reviewed source-segment inverses; all other actual bytes remain.
const actualCodeOnlyWorkflow = read('.github/workflows/deploy-code-only-repair.yml').replaceAll('\r\n', '\n');
function assistantSameH0OriginOnlyGuardView(source) {
  const hash = value => crypto.createHash('sha256').update(value).digest('hex');
  assert.equal(hash(source), "1d1a8efda07b8d86ccbec8fb6f58dcc02847d97244a94a61dfebc1232f61fa20", 'Only the whole reviewed current SAME_H0 workflow enters this test view');
  const finalBlock = "          if test \"${RAVRADAR_ASSISTANT_SAME_H0_PHASE:-}\" = 'before'; then\n            env -u SUPABASE_DB_PASSWORD node \"$GITHUB_WORKSPACE/scripts/assistant-same-h0-prewrite.mjs\" --slot final\n            supabase migration list --linked | tee \"$RUNNER_TEMP/code-only-assistant-same-h0-final-plan.txt\"\n            supabase db push --linked --dry-run --skip-vault 2>&1 | tee \"$RUNNER_TEMP/code-only-assistant-same-h0-final-dry-run.txt\"\n            node \"$GITHUB_WORKSPACE/scripts/verify-assistant-same-h0-plan.mjs\" \\\n              --phase before --migration-list \"$RUNNER_TEMP/code-only-assistant-same-h0-final-plan.txt\" \\\n              --dry-run \"$RUNNER_TEMP/code-only-assistant-same-h0-final-dry-run.txt\" \\\n              --migrations-directory \"$PWD/supabase/migrations\"\n          fi\n";
  const newGuard = "          if test \"${RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-}\" != 'installed' && test \"${RAVRADAR_ASSISTANT_SAME_H0_PHASE:-}\" != 'installed'; then\n";
  const oldGuard = "          if test \"${RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-}\" != 'installed'; then\n";
  assert.equal(source.split(finalBlock).length, 2, 'Exactly one fresh SAME_H0 final proof and dry run');
  assert.equal(source.split(newGuard).length, 2, 'Both installed phases jointly guard the sole apply');
  assert.equal((source.match(/supabase db push --linked/g) || []).length, 7, 'Current workflow has six exact dry runs and one apply');
  assert.equal((source.match(/supabase db push --linked --dry-run --skip-vault/g) || []).length, 6);
  assert.equal((source.match(/^\s*supabase db push --linked --skip-vault\s*$/gm) || []).length, 1);
  const step = name => {
    const marker = '      - name: ' + name + '\n';
    assert.equal(source.split(marker).length, 2, 'One actual named delivery step: ' + name);
    const at = source.indexOf(marker), next = source.indexOf('\n      - ', at + marker.length);
    return source.slice(at, next < 0 ? undefined : next);
  };
  const proof = step('Authenticate original140000 B/S and compare every prepared SAME_H0 byte before new binding');
  assert(proof.includes("if: env.RAVRADAR_ASSISTANT_SAME_H0_METADATA_ONLY == 'true' && steps.migrated-private-install.outcome == 'success'"));
  assert(proof.includes('node scripts/assistant-same-h0-prewrite.mjs --slot proof'));
  const selected = step('Select the sole pending SAME_H0 successor after actual original and no-loss proof');
  assert(selected.includes("if: env.RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN == 'true'"));
  assert(selected.includes('node scripts/verify-assistant-same-h0-plan.mjs --select'));
  assert(finalBlock.includes('env -u SUPABASE_DB_PASSWORD node'));
  assert(finalBlock.includes('assistant-same-h0-prewrite.mjs" --slot final'));
  assert(finalBlock.indexOf('--slot final') < finalBlock.indexOf('supabase migration list --linked'));
  assert(finalBlock.indexOf('supabase migration list --linked') < finalBlock.indexOf('supabase db push --linked --dry-run --skip-vault'));
  assert(finalBlock.indexOf('supabase db push --linked --dry-run --skip-vault') < finalBlock.indexOf('verify-assistant-same-h0-plan.mjs'));
  assert(finalBlock.includes('--phase before --migration-list "$RUNNER_TEMP/code-only-assistant-same-h0-final-plan.txt"'));
  assert(finalBlock.includes('--dry-run "$RUNNER_TEMP/code-only-assistant-same-h0-final-dry-run.txt"'));
  assert(source.indexOf(proof) < source.indexOf(selected));
  assert(source.indexOf(selected) < source.indexOf(finalBlock));
  assert(source.indexOf(finalBlock) < source.indexOf(newGuard));
  const readback = step('Read back migration and database binding');
  assert(readback.includes('node scripts/integrated-cutover-readiness.mjs verify-db'));
  assert(readback.includes('RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN=false node scripts/verify-assistant-same-h0-plan.mjs'));
  assert(readback.includes('--phase installed --migration-list "$RUNNER_TEMP/code-only-migrations-applied.txt"'));
  assert(readback.includes('echo "RAVRADAR_ASSISTANT_SAME_H0_PHASE=installed"'));
  const edges = step('Deploy exact rebound trip Edges without Worker or D1 replay');
  assert(edges.includes('test "$RAVRADAR_ASSISTANT_SAME_H0_PHASE" = "installed"'));
  assert(edges.includes('test "$RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN" = "false"'));
  assert(source.indexOf(newGuard) < source.indexOf(readback));
  assert(source.indexOf(readback) < source.indexOf(edges));
  const historicalView = source.replace(finalBlock, '').replace(newGuard, oldGuard);
  assert.equal(hash(historicalView), "2323179de0eac316d7f71ef8f7c239d7e5a601115b9ecb999a25fd2c789d7364", 'Whole exact origin-only guard view, not a loose count normalization');
  assert.equal(historicalView.replace("          if test \"${RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-}\" = 'before'; then\n", finalBlock + "          if test \"${RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-}\" = 'before'; then\n").replace(oldGuard, newGuard), source, 'Whole two-segment forward inverse');
  return historicalView;
}
const codeOnlyWorkflow = assistantSameH0OriginOnlyGuardView(actualCodeOnlyWorkflow);
for (const changed of [
  actualCodeOnlyWorkflow.replace('assistant-same-h0-prewrite.mjs" --slot final', 'assistant-same-h0-prewrite.mjs" --slot proof'),
  actualCodeOnlyWorkflow.replace('RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN=false node', 'RAVRADAR_ASSISTANT_SAME_H0_UPGRADE_OPT_IN=true node'),
  actualCodeOnlyWorkflow.replace("          if test \"${RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-}\" != 'installed' && test \"${RAVRADAR_ASSISTANT_SAME_H0_PHASE:-}\" != 'installed'; then\n", "          if test \"${RAVRADAR_ESTABLISHED_NATIVE_CURRENT_ORIGIN_PHASE:-}\" != 'installed'; then\n"),
  actualCodeOnlyWorkflow + '\n# UNREVIEWED DELIVERY CHANGE\n',
]) {
  assert.notEqual(changed, actualCodeOnlyWorkflow);
  assert.throws(() => assistantSameH0OriginOnlyGuardView(changed));
}
const codeOnlyTrigger = codeOnlyWorkflow.slice(
  codeOnlyWorkflow.indexOf('\non:'),
  codeOnlyWorkflow.indexOf('\npermissions:'),
);
assert.doesNotMatch(codeOnlyTrigger, /\n  (?:push|schedule|workflow_run|pull_request):/,
  'Code-only deploy må kun kunne startes manuelt.');
for (const publicWorkflow of [buildWorkflow, codeOnlyWorkflow]) {
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
