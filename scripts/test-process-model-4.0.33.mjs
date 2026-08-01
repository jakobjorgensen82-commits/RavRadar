import assert from 'node:assert/strict';
import {evaluateTransportEvent,classifyCoastalZone} from '../js/core/coastal-process-model.js';
const e=evaluateTransportEvent({history:{maxWind24hMps:16,maxWave24hM:2,hoursSinceHighEnergy:10},weather:{currentSpeedMps:.3,waterLevelTrendCm3h:-9},zone:{coastType:'west',reefs:true,shallowWater:true,name:'Test Odde'}});
assert.ok(e.index>=70); assert.equal(e.phase,'efterstorm/transportfase'); assert.ok(classifyCoastalZone({name:'Test Fjord',coastType:'east'}).tags.includes('fjord-system'));
console.log('Kyst- og hændelsesmodellen består.');
const r=evaluateTransportEvent({history:{maxWind24hMps:5,maxWave24hM:.4,hoursSinceHighEnergy:120},weather:{waveHeightM:.55,currentSpeedMps:.3,waterLevelTrendCm3h:8},zone:{coastType:'east',reefs:true,shallowWater:true,seagrass:true,name:'Test Bugt'}});
assert.equal(r.dominantPathway,'nearshore-remobilisation');
assert.equal(r.phase,'genmobiliseringsfase');
assert.ok(r.index>=45,'Genmobiliseringssporet skal kunne være meningsfuldt uden ny storm');
