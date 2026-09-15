import assert from 'node:assert/strict';
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

for (const file of ['index.html', 'about.html', 'admin.html', 'bootstrap.js', 'service-worker.js']) {
  assert.ok(read(file).includes(version), `${file} mangler cache-/releaseversion ${version}.`);
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

for (const page of ['index.html', 'about.html', 'admin.html']) {
  for (const match of read(page).matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const reference = match[1];
    if (/^(?:https?:|mailto:|tel:|data:|#)/i.test(reference)) continue;
    const local = reference.split(/[?#]/, 1)[0].replace(/^\.\//, '').replace(/^\//, '');
    if (!local) continue;
    assert.ok(fs.existsSync(path.join(root, local)), `${page} henviser til en manglende fil: ${reference}`);
  }
}

const buildWorkflow = read('.github/workflows/reusable-weather-build.yml');
assert.ok(buildWorkflow.includes('run: npm run validate'), 'Produktionsbyg mangler den fulde post-data-validering.');
assert.ok(buildWorkflow.includes('run: npm run release:gate'), 'Produktionsbyg mangler den fulde post-data-releasegate.');
const orchestrator = read('.github/workflows/update-and-deploy.yml');
assert.ok(orchestrator.includes('uses: ./.github/workflows/reusable-pages-deploy.yml'), 'Pages-deployet er ikke koblet til produktionsworkflowet.');
assert.ok(read('.github/workflows/validate-pull-request.yml').includes('run: npm run validate:source'), 'PR-kildegaten er ikke aktiv.');
assert.doesNotMatch(orchestrator, /\n  push:/, 'Normal vejrhentning må ikke starte automatisk ved merge.');

const codeOnlyWorkflow = read('.github/workflows/deploy-code-only-repair.yml');
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
  'code_only_repair: true',
  'uses: ./.github/workflows/reusable-pages-deploy.yml',
]) assert.ok(codeOnlyWorkflow.includes(marker), `Code-only-workflowet mangler ${marker}.`);
for (const marker of [
  'manifestBoundedPublicDetailsBytes',
  'fetch_public data/live/public-condition-details.json public-condition-details.json "$details_bytes"',
]) assert.ok(codeOnlyWorkflow.includes(marker),
  `Code-only-workflowets download mangler manifestbundet detailstørrelse: ${marker}`);
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
]) assert.ok(!codeOnlyWorkflow.includes(forbidden), `Code-only-workflowet må ikke indeholde ${forbidden}.`);
assert.equal(
  (codeOnlyWorkflow.match(/supabase db push --linked/g) || []).length,
  2,
  'Code-only-workflowet må kun have én dry-run og én apply af den afgrænsede migration.',
);
assert.ok(
  read('scripts/verify-code-only-migration-plan.mjs')
    .includes('20260915020000_private_runtime_storage_deny.sql'),
  'Code-only migrationsplanen er ikke bundet til den præcise successor.',
);

for (const file of [...browserSources, 'package.json', '.github/workflows/update-and-deploy.yml',
  '.github/workflows/reusable-weather-build.yml', '.github/workflows/reusable-pages-deploy.yml',
  '.github/workflows/deploy-code-only-repair.yml']) {
  assert.doesNotMatch(read(file), /^(?:<<<<<<<|=======|>>>>>>>)(?: |$)/m, `${file} indeholder uløste merge-markører.`);
}

console.log(`OK: ${browserSources.length} browserfiler, lokale sideaktiver, versionsbinding og post-data deploygates er intakte.`);
