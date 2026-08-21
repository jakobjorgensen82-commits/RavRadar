import assert from 'node:assert/strict';
import {buildDirectionalWeights,buildScenarioMatrix,normalizedSoftMaximum} from './calibrate-zone-ranking-opportunity-normalization.mjs';

const one=buildDirectionalWeights([90]);
assert.deepEqual(one,[{directionDeg:90,weight:1}]);
assert.equal(normalizedSoftMaximum([80],[1],10),80);

const duplicate=buildDirectionalWeights([0,0,90,180,270]);
assert.equal(duplicate.length,4,'Ens retninger må ikke tælle som flere lodder.');
assert.ok(Math.abs(duplicate.reduce((sum,row)=>sum+row.weight,0)-1)<1e-12);

const equal=normalizedSoftMaximum([80,80,80,80],[.25,.25,.25,.25],10);
assert.ok(Math.abs(equal-80)<1e-12,'Bred ensartet støtte skal bevare maksimum.');
const isolated=normalizedSoftMaximum([80,30,30,30],[.25,.25,.25,.25],10);
const supported=normalizedSoftMaximum([80,79,30,30],[.25,.25,.25,.25],10);
assert.ok(isolated<supported&&supported<80,'Flere stærke retninger skal beskytte placeringen gradvist.');

const scenarios=buildScenarioMatrix();
const train=new Set(scenarios.filter(row=>row.split==='train').map(row=>row.bearing));
const holdout=new Set(scenarios.filter(row=>row.split==='holdout').map(row=>row.bearing));
assert.equal([...train].some(value=>holdout.has(value)),false,'Holdout-retninger må ikke indgå i træningen.');
assert.equal(scenarios.length,18*8*2*2);

console.log('Zone-ranking opportunity normalization: OK');

