import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDmiForecastHourly, normalizeForecastHourly } from './lib/dmi-forecast-store.mjs';
const generatedAt='2026-07-28T19:01:41Z';
const modelRun='2026-07-28T18:00:00.000Z';
const provenance=step=>({
 current:{
  provider:'dmi',collection:'dkss_idw',modelRun,nativeValidTime:step,
  gridPoint:[14.98,55.21],samplingPoint:[14.97,55.20],
  verticalLayer:'depthbelowsea:9',verticalLayerRankM:9,distanceKm:1.4,
  vectorSelection:'nearest-water-column-then-deepest-valid-layer',vectorSemanticsVersion:2
 },
 waterLevel:{provider:'dmi',collection:'dkss_idw',modelRun,nativeValidTime:step}
});
const ocean=[
 {step:'2026-07-28T18:00:00Z','sea-mean-deviation':0.1,'current-u':0.1,'current-v':0.0,provenance:provenance('2026-07-28T18:00:00.000Z')},
 {step:'2026-07-28T21:00:00Z','sea-mean-deviation':0.2,'current-u':0.2,'current-v':0.0,provenance:provenance('2026-07-28T21:00:00.000Z')}
];
const built=buildDmiForecastHourly({generatedAt,ocean,hours:120,sourceCadenceMinutes:180});
assert.equal(built.hourly[0].time,'2026-07-28T20:00:00.000Z');
assert.equal(new Set(built.hourly.map(x=>x.time)).size,120);
assert.ok(built.hourly[0].currentSpeedMps!==null,'marine interpolation must survive unrelated null component rows when current cell and layer identity match');
assert.equal(built.hourly[0].sources.current.verticalLayer,'depthbelowsea:9');
assert.deepEqual(built.hourly[0].sources.current.gridPoint,[14.98,55.21]);
const merged=normalizeForecastHourly([{time:'2026-07-28T20:01:00Z',waterLevelCm:10},{time:'2026-07-28T20:00:00Z',currentSpeedMps:.1}]);
assert.equal(merged.length,1);assert.equal(merged[0].time,'2026-07-28T20:00:00.000Z');assert.equal(merged[0].waterLevelCm,10);assert.equal(merged[0].currentSpeedMps,.1);
const update=fs.readFileSync(new URL('./update-weather.mjs',import.meta.url),'utf8');
assert.match(update,/manualStationInterpolation/);assert.match(update,/water-level-station-routing\.json/);assert.match(update,/rows\.filter\(row => \['sea-mean-deviation'/);
const admin=fs.readFileSync(new URL('../js/ui/admin-dashboard.js',import.meta.url),'utf8');assert.match(admin,/renderWaterStations/);assert.match(admin,/stationRoutingMap/);
console.log('Forecast-integritet og station-routing er valideret.');
