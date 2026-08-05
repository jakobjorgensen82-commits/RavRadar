import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { calculateRavScore } from '../js/core/score-engine.js';
import { evaluateTransportEvent } from '../js/core/coastal-process-model.js';
import { buildPublicConditions } from './public-conditions-lib.mjs';

const zone={id:'test-zone',name:'Testzone',coastType:'east',onshoreDirectionDeg:90,reefs:true,seagrass:true,shallowWater:true};
const weather={windSpeedMps:4,windDirectionDeg:270,waveHeightM:.35,currentSpeedMps:.28,currentDirectionDeg:90,waterLevelCm:12,waterLevelTrendCm3h:5};
const baselineHistory={maxWind24hMps:15,maxWave24hM:1.8,hoursSinceHighEnergy:9};
const shadowHistory={...baselineHistory,strongEventDurationHours:5,hoursSinceStrongEventEnd:8,inboundCurrentDurationHours:6,inboundCurrentMomentum:63,outboundCurrentDurationHours:0,outboundCurrentPressure:0,currentDirectionStability:.92,mobilisationPotential:84,nearshorePotential:79,eventPhase:'efterstorm/indtransport',stateModelMode:'shadow-v1'};
for(const mode of ['beach','waders']){
  const before=calculateRavScore({mode,zone,weather,history:baselineHistory});
  const after=calculateRavScore({mode,zone,weather,history:shadowHistory});
  assert.equal(after.score,before.score,`Skyggetilstand må ikke ændre ${mode}-score i 4.0.107`);
  assert.deepEqual(after.components,before.components,`Skyggetilstand må ikke ændre delscorer for ${mode}`);
  assert.equal(after.explanation.transportEvent.shadowState.eventPhase,'efterstorm/indtransport');
  assert.equal(after.explanation.transportEvent.shadowState.nearshorePotential,79);
}
const full={datasetId:'shadow-test',generatedAt:'2026-08-05T20:00:00.000Z',zones:{'test-zone':{provider:'dmi',providerLabel:'DMI',current:weather,history:shadowHistory,forecast:{provider:'dmi',hourly:[]}}}};
const publicDoc=buildPublicConditions(full);
assert.equal(publicDoc.zones['test-zone'].history.stateModelMode,'shadow-v1');
assert.equal(publicDoc.zones['test-zone'].history.inboundCurrentDurationHours,6);
assert.equal(publicDoc.zones['test-zone'].history.nearshorePotential,79);
const projectedBytes=Buffer.byteLength(JSON.stringify(publicDoc));
assert(projectedBytes<2500,'Skyggetilstandens kompakte offentlige felter må ikke skabe en stor payload.');

const updateSource=await fs.readFile('scripts/update-weather.mjs','utf8');
for(const token of ['currentAlignment','inboundCurrentDurationHours','inboundCurrentMomentum','outboundCurrentPressure','strongEventDurationHours','nearshorePotential','stateModelMode']){
  assert(updateSource.includes(token),`Historikpipelinen mangler ${token}`);
}
assert(!/strømbånd|current\s*band|general\s*current\s*band/i.test(updateSource),'Pipelinen må ikke bruge generelle strømbånd som fallback.');
console.log('4.0.107 skyggetilstandsmodel: score-neutralitet, kompakt public projection og DMI-baseret historik bestået.');
