import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const source = await fs.readFile('scripts/fetch-geodanmark-pilot.py', 'utf8');
const analysis = await fs.readFile('scripts/analyze-geodanmark-pilot.py', 'utf8');
const nameAudit = await fs.readFile('scripts/audit-pilot-place-names.py', 'utf8');
const waterExclusions = await fs.readFile('scripts/fetch-official-water-exclusions.py', 'utf8');
const coastalParts = await fs.readFile('scripts/assemble-geodanmark-coastal-parts.py', 'utf8');
const geographicReview = JSON.parse(await fs.readFile('data/geometry-v2/pilot-geographic-review.json', 'utf8'));
const blaavandDetail = await fs.readFile('scripts/build-blaavand-detail-proposal.py', 'utf8');
const blaavandOrtho = await fs.readFile('scripts/build-blaavand-ortho-review.py', 'utf8');
const blaavandDmiGrid = await fs.readFile('scripts/validate-blaavand-dmi-grid.py', 'utf8');
const blaavandWeatherShadow = await fs.readFile('scripts/build-blaavand-weather-shadow-contract.py', 'utf8');
const blaavandMultiStep = await fs.readFile('scripts/validate-blaavand-multi-step-series.py', 'utf8');
const blaavandStateHistory = await fs.readFile('scripts/validate-blaavand-state-history.mjs', 'utf8');
const blaavandUiReview = await fs.readFile('scripts/build-blaavand-score-neutral-ui-review.mjs', 'utf8');
const blaavandWeatherPolicy = JSON.parse(await fs.readFile('data/geometry-v2/blaavand-weather-shadow-policy.json', 'utf8'));
const blaavandPolicy = JSON.parse(await fs.readFile('data/geometry-v2/blaavand-detail-policy.json', 'utf8'));
const mapRenderer = await fs.readFile('scripts/render-geodanmark-pilot-maps.py', 'utf8');
const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');

for (const required of [
  'DATAFORDELER_API_KEY',
  'GetCapabilities',
  'GetFeature',
  'GeoDanmark Vektor WFS',
  'centralHydrationRequired',
  'FeatureType',
  '_current',
  'availableLayers',
  'required-layer-not-resolved',
  'startIndex',
  'sourceNumberMatched',
  'pageCount',
  'MAX_FEATURES_PER_LAYER_AREA',
  'not-exposed-by-source',
  'fetched-for-non-production-pilot'
]) assert.ok(source.includes(required), `GeoDanmark-fetch mangler ${required}`);

for (const forbidden of [
  'print(key)',
  'print(api_key',
  'apikey=',
  'apikey={',
  'DATAFORDELER_API_KEY='
]) assert.ok(!source.includes(forbidden), `GeoDanmark-fetch kan lække secret: ${forbidden}`);

assert.match(workflow, /geometry_v2_pilot:/);
assert.match(workflow, /DATAFORDELER_API_KEY:\s*\$\{\{ secrets\.DATAFORDELER_API_KEY \}\}/);
assert.match(workflow, /name: Run GeoDanmark geometry-v2 pilot/);
assert.match(workflow, /python scripts\/analyze-geodanmark-pilot\.py/);
assert.match(workflow, /python scripts\/audit-pilot-place-names\.py/);
assert.match(workflow, /python scripts\/fetch-official-water-exclusions\.py/);
assert.match(workflow, /python scripts\/assemble-geodanmark-coastal-parts\.py/);
assert.match(workflow, /python scripts\/build-blaavand-detail-proposal\.py/);
assert.match(workflow, /python scripts\/build-blaavand-ortho-review\.py/);
assert.match(workflow, /python scripts\/validate-blaavand-dmi-grid\.py/);
assert.match(workflow, /python scripts\/build-blaavand-weather-shadow-contract\.py/);
assert.match(workflow, /python scripts\/validate-blaavand-multi-step-series\.py/);
assert.match(workflow, /node scripts\/validate-blaavand-state-history\.mjs/);
assert.match(workflow, /node scripts\/build-blaavand-score-neutral-ui-review\.mjs/);
assert.match(workflow, /DMI_API_KEY:\s*\$\{\{ secrets\.DMI_API_KEY \}\}/);
assert.match(workflow, /python scripts\/render-geodanmark-pilot-maps\.py/);
assert.match(workflow, /--exclude 'data\/geometry-v2\/'/);
assert.match(workflow, /--exclude '\.geometry-v2-work\/'/);
assert.match(workflow, /include-hidden-files:\s*true/);

const python = process.env.PYTHON || (process.platform === 'win32' ? 'python.exe' : 'python3');
const layerTest = spawnSync(python, ['-c', [
  "import runpy",
  "m=runpy.run_path('scripts/fetch-geodanmark-pilot.py')",
  "f=m['find_layer']",
  "assert f(['gdk:kyst_current'], 'Kyst') == 'gdk:kyst_current'",
  "assert f(['gdk:kyst_hist', 'gdk:kyst_current'], 'Kyst') == 'gdk:kyst_current'",
  "assert f(['gdk:Kyst'], 'Kyst') == 'gdk:Kyst'",
  "assert f(['gdk:kystbeskyttelse_current'], 'Kyst') is None",
].join(';')], { encoding: 'utf8' });
assert.equal(layerTest.status, 0, `GeoDanmark-lagmatch fejlede: ${layerTest.stderr || layerTest.error || 'ukendt fejl'}`);
for (const marker of [
  'private-read-only-source-qa',
  'effective-pilot-zones.geojson',
  'productionGeometryChanged',
  'scoreChanged',
  'central-admin-coastline-requires-conflict-review',
  'sourceSegmentTriage',
  'semantic-boundary-review',
  'automaticProposalAllowed',
  'Havne og vandløb er registreret som reviewkontekst'
]) assert.ok(analysis.includes(marker), `GeoDanmark source-QA mangler ${marker}`);
for (const marker of [
  'private-read-only-name-and-migration-triage',
  'https://api.dataforsyningen.dk/steder',
  'automaticRenameAllowed',
  'proposedName',
  'semantic-relocation',
  'boundary-adjustment'
]) assert.ok(nameAudit.includes(marker), `Stednavne-/migrationstriage mangler ${marker}`);
for (const marker of [
  'private-read-only-official-water-exclusions',
  'format',
  'geojson',
  'excludedOfficialFarvandSubtypes',
  'automaticActivationAllowed'
]) assert.ok(waterExclusions.includes(marker), `Officiel farvandsmaske mangler ${marker}`);
for (const marker of [
  'private-read-only-coastal-part-proposals',
  'semantic-boundary-review',
  'automaticActivationAllowed',
  'weatherSamplingChanged',
  'productionGeometryChanged',
  'pilot-exclusion-policy.json',
  'Havn',
  'Vandloebsmidte',
  'riverMouthClusterM'
]) assert.ok(coastalParts.includes(marker), `Kystdelssamling mangler ${marker}`);
assert.ok(coastalParts.includes('official-water-exclusions.geojson'), 'Kystdelssamling skal anvende officielle fjord-/normasker');
assert.equal(Object.keys(geographicReview.zones).length, 9, 'Alle ni pilotzoner skal have geografisk reviewdom');
assert.equal(Object.values(geographicReview.zones).filter(zone => zone.nextStageAllowed).length, 1, 'Kun den eksplicit godkendte detailkandidat må gå videre');
assert.equal(geographicReview.automaticActivationAllowed, false);
assert.equal(blaavandPolicy.zoneId, 'DK-B03-13');
assert.equal(blaavandPolicy.parts.length, 2, 'Blåvand skal have to retningsmæssigt forskellige private kystdele');
assert.equal(blaavandPolicy.landwardOffsetM, 15);
for (const marker of [
  'private-read-only-blaavand-detail-proposal',
  'officialHeadlandName',
  'remove_headland_hairpin',
  'headlandHairpinControl',
  'verified-against-central-admin-land-witness',
  'private-groyne-hypothesis',
  'weatherSamplingChanged',
  'automaticActivationAllowed'
]) assert.ok(blaavandDetail.includes(marker), `Blåvand-detailkontrakten mangler ${marker}`);
for (const marker of [
  'https://wmts.datafordeler.dk/GeoDanmarkOrto/orto_foraar_webm/1.0.0/WMTS',
  'DATAFORDELER_API_KEY',
  'DFD_GoogleMapsCompatible',
  'private-manual-review-required',
  'automaticActivationAllowed',
  'credential og request-URL logges ikke'
]) assert.ok(blaavandOrtho.includes(marker), `Blåvand-ortofotokontrakten mangler ${marker}`);
for (const forbidden of ['print(key)', 'print(api_key', 'DATAFORDELER_API_KEY=']) {
  assert.ok(!blaavandOrtho.includes(forbidden), `Blåvand-ortofoto kan lække secret: ${forbidden}`);
}
assert.ok(blaavandOrtho.indexOf('if args.self_test:') < blaavandOrtho.indexOf('from PIL import'), 'Pillow må kun kræves i det faktiske private ortofototrin');
for (const marker of [
  'passed-private-grid-validation',
  'native DMI forecast-step GRIB',
  'sharedCurrentUvGridPoint',
  'independentWeatherSeriesValidated',
  'weatherSamplingChanged',
  'automaticActivationAllowed'
]) assert.ok(blaavandDmiGrid.includes(marker), `Blåvand DMI-gridkontrakten mangler ${marker}`);
for (const forbidden of ['print(API_KEY)', 'print(api_key)', 'DMI_API_KEY=']) {
  assert.ok(!blaavandDmiGrid.includes(forbidden), `Blåvand DMI-gridkontrol kan lække secret: ${forbidden}`);
}
assert.equal(blaavandWeatherPolicy.runtimePolicy.weatherSamplingEnabled, false);
assert.equal(blaavandWeatherPolicy.runtimePolicy.publicProjectionEnabled, false);
assert.equal(blaavandWeatherPolicy.scorePolicy.partScoreEnabled, false);
assert.equal(blaavandWeatherPolicy.mergePolicy.crossPartMergeAllowed, false);
for (const marker of [
  'private-shadow-contract-ready',
  'parentRuntimeTruth',
  'requiredHourlyProvenance',
  'scoreRemainsAuthoritative',
  'activationGatesRemaining',
  'automaticActivationAllowed'
]) assert.ok(blaavandWeatherShadow.includes(marker), `Blåvand weather-shadow-kontrakten mangler ${marker}`);
for (const marker of [
  'passed-private-multi-step-series-validation',
  'sharedCompleteNativeTimes',
  'crossPartMergeDetected',
  'rawWeatherValuesStored',
  'valueDigest',
  'automaticActivationAllowed'
]) assert.ok(blaavandMultiStep.includes(marker), `Blåvand flertidsseriegaten mangler ${marker}`);
for (const forbidden of ['print(API_KEY)', 'print(api_key)', 'DMI_API_KEY=']) {
  assert.ok(!blaavandMultiStep.includes(forbidden), `Blåvand flertidsseriegate kan lække secret: ${forbidden}`);
}
for (const marker of [
  'passed-private-state-history-isolation',
  'separateHistoryKeysValidated',
  'parentHistoryReuseDetected',
  'crossPartHistoryReadDetected',
  'rawReplayValuesStored',
  'scoreInfluenceObserved',
  'transientReplayInputDeleted'
]) assert.ok(blaavandStateHistory.includes(marker), `Blåvand state-/historikgaten mangler ${marker}`);
for (const marker of [
  'passed-private-score-neutral-ui-review',
  'existingRavScoreColorRetained',
  'partScoreColorsForbidden',
  'bestPartSelectionForbidden',
  'partInteractionForbidden',
  'productionBundleIncluded'
]) assert.ok(blaavandUiReview.includes(marker), `Blåvand score-neutral UI-gate mangler ${marker}`);
assert.ok(mapRenderer.indexOf('if args.self_test:') < mapRenderer.indexOf('from PIL import'), 'Pillow må kun kræves i det faktiske private rendertrin');
assert.ok(mapRenderer.includes('coastal-part-proposals.geojson'), 'Pilotkortet skal vise de private kystdelsforslag');
assert.ok(mapRenderer.includes('maps') && mapRenderer.includes('zones'), 'Pilotkortet skal generere zonevise reviewkort');
assert.ok(mapRenderer.includes('blaavand-detail-proposal.geojson') && mapRenderer.includes('DK-B03-13-detail.png'), 'Pilotkortet skal generere Blåvand-detailkort');
console.log('GeoDanmark pilotfetch-kontrakt: bestået.');
