import assert from 'node:assert/strict';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
const store={};
globalThis.localStorage={getItem:key=>store[key]??null,setItem:(key,value)=>{store[key]=String(value);}};
const { ADAPTIVE_MODEL_KEY, loadAdaptiveModel }=await import('../js/core/adaptive-model.js?perf=4083');
const { calculateRavScore }=await import('../js/core/score-engine.js?perf=4083');
store[ADAPTIVE_MODEL_KEY]=JSON.stringify({schemaVersion:2,version:1,weights:{huntability:.4,transport:.35,release:.25},scoreAdjustment:0,zoneAdjustments:{},metricAdjustments:Array.from({length:1000},(_,i)=>({id:`r${i}`,field:'windSpeedMps',min:0,max:99,adjustment:1,payload:'x'.repeat(200)}))});
const model=loadAdaptiveModel();
assert.equal(loadAdaptiveModel(),model,'Uændret adaptiv model skal returneres fra samme cache');
const zones=JSON.parse(fs.readFileSync(new URL('../data/zones.geojson',import.meta.url))).features;
const conditions=JSON.parse(fs.readFileSync(new URL('../data/live/public-conditions.json',import.meta.url))).zones;
let count=0;const started=performance.now();
for(const feature of zones){const zone=feature.properties,condition=conditions[zone.id];if(!condition)continue;for(const weather of condition.forecast?.hourly||[]){calculateRavScore({mode:'waders',zone,weather,history:condition.history||{},adaptiveModel:model});count++;}}
const elapsed=performance.now()-started;
assert.ok(count>24000,`Forventede fuld landsprognose, fik ${count}`);
assert.ok(elapsed<2500,`Stor adaptiv model gjorde bulkberegningen for langsom: ${Math.round(elapsed)} ms`);
console.log(`Adaptiv model performance bestået: ${count} beregninger på ${Math.round(elapsed)} ms.`);
