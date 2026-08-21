import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');
const packageDoc = JSON.parse(await fs.readFile('package.json', 'utf8'));

const refreshStart = workflow.indexOf('- name: Refresh private Copernicus cache before DMI cache churn');
const dmiRestoreStart = workflow.indexOf('- name: Restore bounded DMI GRIB download cache');
const dmiUpdateStart = workflow.indexOf('- name: Update DMI bulk model cache');
const dmiSaveStart = workflow.indexOf('- name: Save progressed DMI GRIB download cache');
const postDmiRefreshStart = workflow.indexOf('- name: Refresh private Copernicus cache after DMI cache churn');
const targetSelectStart = workflow.indexOf('- name: Select exact-hour DMI gaps for targeted Copernicus supplement');
const targetInspectStart = workflow.indexOf('- name: Inspect targeted Copernicus coverage after fresh DMI');
const targetRunStart = workflow.indexOf('- name: Fill only exact-hour DMI gaps from Copernicus');
const targetSaveStart = workflow.indexOf('- name: Save targeted private Copernicus supplement');
const historyBuildStart = workflow.indexOf('- name: Build public seven-day current history and controlled live selection');

assert.ok(refreshStart >= 0, 'Production workflow must refresh the private Copernicus cache');
assert.ok(refreshStart < dmiRestoreStart && refreshStart < dmiSaveStart,
  'Private Copernicus cache must be touched before large DMI cache restore/save churn');
assert.ok(dmiUpdateStart < postDmiRefreshStart &&
  postDmiRefreshStart < targetSelectStart &&
  targetSelectStart < targetInspectStart &&
  targetInspectStart < targetRunStart &&
  targetRunStart < targetSaveStart &&
  targetSaveStart < historyBuildStart,
  'Production must derive and fill the targeted Copernicus supplement after DMI and before live current history');

const refreshBlock = workflow.slice(refreshStart, dmiRestoreStart);
assert.match(refreshBlock, /uses: actions\/cache\/restore@v6/);
assert.match(refreshBlock, /path: \.cache\/copernicus-current-shadow\.json/);
assert.match(refreshBlock, /copernicus-current-shadow-v1-/);
assert.match(refreshBlock, /cache-matched-key/);
assert.doesNotMatch(refreshBlock, /actions\/cache\/save|actions\/upload-artifact/);
assert.doesNotMatch(refreshBlock, /COPERNICUSMARINE_|uMps|vMps/);

const postDmiRefreshBlock = workflow.slice(postDmiRefreshStart, historyBuildStart);
assert.match(postDmiRefreshBlock, /uses: actions\/cache\/restore@v6/);
assert.match(postDmiRefreshBlock, /path: \.cache\/copernicus-current-shadow\.json/);
assert.match(postDmiRefreshBlock, /key: copernicus-current-shadow-v1-post-dmi-/);
assert.match(postDmiRefreshBlock, /build-copernicus-target-registry\.py/);
assert.match(postDmiRefreshBlock, /--at "\$RAVRADAR_PRODUCTION_TARGET_HOUR"/);
assert.match(postDmiRefreshBlock, /--targets \.cache\/copernicus-current-targets\.json/);
assert.match(postDmiRefreshBlock, /--authoritative-targets data\/live\/coastal-parts-v2\.json/);
assert.match(postDmiRefreshBlock, /uses: actions\/cache\/save@v6/);
assert.doesNotMatch(postDmiRefreshBlock, /actions\/upload-artifact|uMps|vMps/);

const supportStart = workflow.indexOf('- name: Build RavRadar support package');
const supportEnd = workflow.indexOf('- name: Sync protected admin data to Supabase');
const supportBlock = workflow.slice(supportStart, supportEnd);
assert.ok(supportStart > dmiSaveStart && supportEnd > supportStart);
assert.match(supportBlock, /--exclude '\.cache\/'/,
  'Support artifact must exclude the restored private Copernicus cache');

const pagesStart = workflow.indexOf('- name: Build lean GitHub Pages artifact');
const pagesEnd = workflow.indexOf('- name: Configure GitHub Pages');
assert.match(workflow.slice(pagesStart, pagesEnd), /--exclude '\.cache\/'/,
  'Pages artifact must exclude the restored private Copernicus cache');

assert.equal(
  packageDoc.scripts['test:copernicus-cache-preservation'],
  'node scripts/test-copernicus-cache-preservation-4.0.232.mjs',
);
assert.ok(
  packageDoc.scripts.validate.indexOf('test:copernicus-cache-preservation') <
    packageDoc.scripts.validate.indexOf('test:current-spatial-audit'),
  'Cache-preservation regression must run before the release-critical current audit',
);

console.log('OK: production refreshes the private Copernicus cache around DMI churn without exporting it.');
