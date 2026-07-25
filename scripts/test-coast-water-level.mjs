import assert from 'node:assert/strict';
import { interpolateWaterLevelAlongCoast } from './lib/dmi-forecast-store.mjs';
const path=[[0,0],[10,0]];
const stations=[
 {stationId:'LEFT',name:'Hals II',point:[2,0]},
 {stationId:'RIGHT',name:'Als Odde',point:[8,0]},
 {stationId:'WRONG',name:'Hadsund',point:[5,3]}
];
const levels=new Map([
 ['LEFT',{valueCm:10,observed:new Date().toISOString()}],
 ['RIGHT',{valueCm:30,observed:new Date().toISOString()}],
 ['WRONG',{valueCm:-50,observed:new Date().toISOString()}]
]);
const result=interpolateWaterLevelAlongCoast([5,0],path,stations,levels,{haversineKm:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),directStationKm:0.1,maxCorridorDistanceKm:1});
assert.equal(result.method,'coast-bracket-2-stations');
assert.deepEqual(result.stations.map(s=>s.stationId),['LEFT','RIGHT']);
assert.equal(result.valueCm,20);
const direct=interpolateWaterLevelAlongCoast([2.05,0],path,stations,levels,{haversineKm:(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),directStationKm:.1,maxCorridorDistanceKm:1});
assert.equal(direct.method,'direct-coast-station');
assert.equal(direct.valueCm,10);
console.log('Kystbaseret DMI-vandstandsinterpolation bestået.');
