import fs from 'node:fs/promises';

const app = await fs.readFile('app.js', 'utf8');
const i18n = await fs.readFile('js/i18n.js', 'utf8');
const dataService = await fs.readFile('js/services/data-service.js', 'utf8');
const serviceWorker = await fs.readFile('service-worker.js', 'utf8');
const manifest = JSON.parse(await fs.readFile('data/live/manifest.json', 'utf8'));
const conditions = JSON.parse(await fs.readFile('data/live/conditions.json', 'utf8'));

if (manifest.datasetId !== conditions.datasetId) throw new Error('datasetId mismatch');

for (const marker of ['loadDataManifest', 'refreshZoneStyles', "t('data.couldNotLoad')"]) {
  if (!app.includes(marker)) throw new Error(`startup mangler ${marker}`);
}

for (const marker of [
  "'data.couldNotLoad'",
  'Gamle prognoser vises ikke',
  'Alte Prognosen werden nicht angezeigt',
  'Old forecasts are not shown',
]) {
  if (!i18n.includes(marker)) throw new Error(`i18n mangler ${marker}`);
}

for (const marker of [
  'manifest.schemaVersion !== 4',
  'assertLoadedPayload(data, {',
  'kind: RAVSCORE_PUBLIC_STARTUP_KIND',
  'descriptor: manifest.ravScoreRuntime.startup',
  'datasetId: manifest.datasetId',
  'productionReferenceAt: manifest.productionReferenceAt ?? null',
  'modelBinding: manifest.ravScoreModelBinding',
  'sameRavScoreModelBinding',
  'expectedSha256: manifest.publicConditionsSha256',
  'expectedBytes: manifest.publicConditionsBytes',
  "'recoveryFallback' in manifest",
  "'emergencyFallback' in manifest",
]) {
  if (!dataService.includes(marker)) throw new Error(`atomisk schema-4-startup mangler ${marker}`);
}

if (!serviceWorker.includes("url.pathname.includes('/data/live/')")) {
  throw new Error('live data ikke network-first');
}

console.log('OK: progressiv frisk opstart, DA/DE/EN-fejltilstand og atomisk schema-4-datasæt.');
