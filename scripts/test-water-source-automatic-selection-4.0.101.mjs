import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { recommendWaterStationBracket } from '../js/core/water-station-routing.js';

const zones = JSON.parse(await fs.readFile('data/zones.geojson','utf8')).features;
const zone = zones.find(feature => feature.properties?.name === 'Tornby og Hirtshals');
assert.ok(zone, 'Tornby og Hirtshals skal findes i zoneregisteret.');

const hirtshals = {
  sourceKey: 'oceanobs:20043', stationId: '20043', name: 'Hirtshals Havn II',
  sourceType: 'observation-station', point: [9.9625,57.5951], registryStatus: 'active',
  sourceForecastStatus: 'receiving', sourceForecastHours: 118, routingEligible: true,
  properties: { status: 'Active', parameterId: ['sea_reg','sealev_dvr','sealev_ln'] }
};
const north = {
  sourceKey: 'test:north', stationId: 'test-north', name: 'Test nord', sourceType: 'forecast-point',
  point: [9.70,57.75], registryStatus: 'active-forecast-point', sourceForecastStatus: 'receiving',
  sourceForecastHours: 118, routingEligible: true, properties: { status: 'Active' }
};
const haversineKm=(a,b)=>{const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b[1]-a[1]),dLon=toRad(b[0]-a[0]);const q=Math.sin(dLat/2)**2+Math.cos(toRad(a[1]))*Math.cos(toRad(b[1]))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q));};
const args={zoneId:zone.properties.id,zoneName:zone.properties.name,point:zone.properties.dataPoint,coastLine:zone.properties.coastLine,onshoreDirectionDeg:zone.properties.onshoreDirectionDeg,haversineKm};

const one = recommendWaterStationBracket({...args,stations:[hirtshals]});
assert.equal(one.stations.length,1,'Automatikken skal vælge én brugbar nærliggende kilde frem for et tomt valg.');
assert.equal(one.stations[0].stationId,'20043','Hirtshals Havn II skal kunne vælges automatisk for Tornby og Hirtshals.');
assert.equal(one.stations[0].weight,1,'En enkelt automatisk kilde skal have vægt 100 %.');

const two = recommendWaterStationBracket({...args,stations:[hirtshals,north]});
assert.ok(two.stations.length >= 1,'Automatikken må ikke miste den brugbare Hirtshals-kilde, når flere kandidater findes.');
assert.ok(Math.abs(two.stations.reduce((sum,item)=>sum+item.weight,0)-1)<1e-9,'Automatiske afstandsvægte skal summere til 100 %.');

for (const file of ['js/ui/admin-dashboard.js','js/ui/admin-app.js']) {
  const source = await fs.readFile(file,'utf8');
  const functionBody = source.slice(source.indexOf('function automaticStationRecommendation'), source.indexOf('function renderWaterStations'));
  assert.match(functionBody,/return recommendWaterStationBracket\(/,'Admin skal genberegne automatisk valg fra aktuelle vandstandskilder.');
  assert.doesNotMatch(functionBody,/if\(audited\)/,'Et gammelt eller tomt auditdokument må ikke overstyre aktuelle brugbare kilder.');
}
console.log('OK: automatisk vandstandskildevalg bruger aktuelle kilder og bevarer afstandsvægtning.');
