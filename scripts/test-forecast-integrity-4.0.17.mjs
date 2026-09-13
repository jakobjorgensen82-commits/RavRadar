import assert from 'node:assert/strict';
import { buildDmiForecastHourly, normalizeForecastHourly } from './lib/dmi-forecast-store.mjs';
const generatedAt='2026-07-28T19:01:41Z';
const modelRun='2026-07-28T18:00:00.000Z';
const samplingPoint=[14.97,55.20];
const gridPoint=[14.98,55.21];
const distanceKm=1.2802568007023933;
const provenance=step=>({
 current:{
  provider:'dmi',fallback:false,collection:'dkss_idw',collectionFamily:'marine',
  component:'current',componentKind:'ocean-current-vector',fieldSet:['current-u','current-v'],optionalFieldSet:[],
  entityId:'PART::FORECAST-INTEGRITY',parentZoneId:'ZONE-FORECAST-INTEGRITY',entityType:'coastal-part',
  samplingContext:'coastal-part-water-point',samplingPoint,gridPoint,
  gridDefinitionSha256:'a'.repeat(64),distanceKm,
  spatialSelection:'nearest-shared-grid-cell-no-spatial-interpolation',spatialSemanticsVersion:1,
  modelRun,nativeValidTime:step,leadTimeHours:(Date.parse(step)-Date.parse(modelRun))/3600000,
  itemId:`current-${step}`,assetIdentitySha256:'b'.repeat(64),acquiredAt:generatedAt,
  verticalLayer:'depthbelowsea:9',verticalLayerRankM:9,
  vectorSelection:'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',vectorSemanticsVersion:3
 },
 waterLevel:{
  provider:'dmi',fallback:false,collection:'dkss_idw',collectionFamily:'marine',
  component:'waterLevel',componentKind:'marine-water-level-scalar',fieldSet:['sea-mean-deviation'],optionalFieldSet:[],
  entityId:'PART::FORECAST-INTEGRITY',parentZoneId:'ZONE-FORECAST-INTEGRITY',entityType:'coastal-part',
  samplingContext:'coastal-part-water-point',samplingPoint,gridPoint,
  gridDefinitionSha256:'a'.repeat(64),distanceKm,
  spatialSelection:'nearest-valid-grid-cell-no-spatial-interpolation',spatialSemanticsVersion:1,
  modelRun,nativeValidTime:step,leadTimeHours:(Date.parse(step)-Date.parse(modelRun))/3600000,
  itemId:`water-level-${step}`,assetIdentitySha256:'c'.repeat(64),acquiredAt:generatedAt
 }
});
const ocean=[
 {step:'2026-07-28T18:00:00Z','sea-mean-deviation':0.1,'current-u':0.1,'current-v':0.0,provenance:provenance('2026-07-28T18:00:00.000Z')},
 {step:'2026-07-28T21:00:00Z','sea-mean-deviation':0.2,'current-u':0.2,'current-v':0.0,provenance:provenance('2026-07-28T21:00:00.000Z')}
];
const built=buildDmiForecastHourly({generatedAt,ocean,hours:120,sourceCadenceMinutes:180});
assert.equal(built.hourly[0].time,'2026-07-28T20:00:00.000Z');
assert.equal(new Set(built.hourly.map(x=>x.time)).size,120);
assert.equal(built.hourly[0].currentUMps,0.16667,'marine interpolation must preserve the verified U component');
assert.equal(built.hourly[0].currentVMps,0,'marine interpolation must preserve the verified V component');
assert.equal(built.hourly[0].currentSpeedMps,0.17,'marine interpolation must derive the expected speed');
assert.equal(built.hourly[0].currentDirectionDeg,90,'marine interpolation must derive the expected toward direction');
assert.equal(built.hourly[0].sources.current.verticalLayer,'depthbelowsea:9');
assert.deepEqual(built.hourly[0].sources.current.gridPoint,[14.98,55.21]);
const incompleteProvenance=structuredClone(ocean);
delete incompleteProvenance[1].provenance.current.assetIdentitySha256;
const rejected=buildDmiForecastHourly({generatedAt,ocean:incompleteProvenance,hours:120,sourceCadenceMinutes:180});
assert.equal(rejected.hourly[0].currentSpeedMps,null,
 'marine interpolation must reject an endpoint without the complete DMI source identity');
const merged=normalizeForecastHourly([{time:'2026-07-28T20:01:00Z',waterLevelCm:10},{time:'2026-07-28T20:00:00Z',currentSpeedMps:.1}]);
assert.equal(merged.length,1);assert.equal(merged[0].time,'2026-07-28T20:00:00.000Z');assert.equal(merged[0].waterLevelCm,10);assert.equal(merged[0].currentSpeedMps,.1);
console.log('Forecast-integritet er valideret med fuld DMI-kildekontrakt.');
