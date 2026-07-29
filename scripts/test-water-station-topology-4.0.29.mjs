import assert from 'node:assert/strict';
import { recommendWaterStationBracket } from '../js/core/water-station-routing.js';
const haversineKm=(a,b)=>Math.hypot((a[0]-b[0])*60,(a[1]-b[1])*111);
const stations=[
 {stationId:'HALS2',name:'Hals II',point:[10.30,56.99],properties:{status:'Active'}},
 {stationId:'ALS',name:'Als Odde',point:[10.33,56.72],properties:{status:'Active'}},
 {stationId:'UDBY',name:'Udbyhøj Havn I',point:[10.31,56.58],properties:{status:'Active'}}
];
const result=recommendWaterStationBracket({zoneId:'DK-E-TEST',zoneName:'Øster Hurup og Als',point:[10.31,56.82],coastLine:[[10.31,56.70],[10.31,57.00]],stations,haversineKm});
assert.equal(result.completeBracket,true);
assert.deepEqual(new Set(result.stations.map(x=>x.stationId)),new Set(['HALS2','ALS']));
assert.ok(!result.stations.some(x=>x.stationId==='UDBY'));
const generic=recommendWaterStationBracket({zoneId:'GEN',zoneName:'Generisk kyst',point:[10,56],coastLine:[[10,55.8],[10,56.2]],stations:[{stationId:'N',name:'Nord',point:[10,56.1],properties:{status:'Active'}},{stationId:'S',name:'Syd',point:[10,55.9],properties:{status:'Active'}},{stationId:'S2',name:'Syd 2',point:[10,55.8],properties:{status:'Active'}}],haversineKm});
assert.equal(generic.completeBracket,true);
assert.deepEqual(new Set(generic.stations.map(x=>x.stationId)),new Set(['N','S']));
console.log('OK: topologisk vandstandsrouting vælger modsatte sider langs kysten.');
const fallbackAxis=recommendWaterStationBracket({zoneId:'FALLBACK',zoneName:'Kyst uden linje',point:[10,56],onshoreDirectionDeg:90,stations:[{stationId:'N',name:'Nord',point:[10,56.1],properties:{status:'Active',parameterId:['sea_reg']}},{stationId:'S',name:'Syd',point:[10,55.9],properties:{status:'Active',parameterId:['sea_reg']}}],haversineKm});
assert.equal(fallbackAxis.completeBracket,true);
assert.equal(fallbackAxis.axis.source,'onshore-direction-fallback');
const historicalFiltered=recommendWaterStationBracket({zoneId:'HIST',zoneName:'Historisk filter',point:[10,56],coastLine:[[10,55.8],[10,56.2]],stations:[{stationId:'OLD',name:'Historisk',point:[10,56.05],registryStatus:'historical',properties:{parameterId:['sea_reg']}},{stationId:'N',name:'Nord',point:[10,56.1],registryStatus:'active',properties:{parameterId:['sea_reg']}},{stationId:'S',name:'Syd',point:[10,55.9],registryStatus:'active',properties:{parameterId:['sea_reg']}}],haversineKm});
assert.ok(!historicalFiltered.candidates.some(x=>x.stationId==='OLD'));
console.log('OK: fallback-kystakse og historiske stationsfiltre virker.');
