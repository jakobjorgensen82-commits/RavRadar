import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {deriveCurrentTransportHistory,applyCurrentTransportToHistory,currentRegime} from './lib/current-transport-history.mjs';
import {calculateRavScore} from '../js/core/score-engine.js';
import {buildPublicConditions} from './public-conditions-lib.mjs';

const sample=(hour,alignment,speed=.25,verified=true)=>({at:`2026-08-06T${String(hour).padStart(2,'0')}:00:00.000Z`,currentAlignment:alignment,currentSpeedMps:speed,currentVerified:verified});

const interrupted=[sample(0,.65),sample(1,.65),sample(2,-.5),sample(3,-.5),sample(4,.65),sample(5,.65)];
const a=deriveCurrentTransportHistory(interrupted);
assert.equal(a.inboundCurrentDurationHours,4,'24-timersmålet skal bevare akkumulerede verificerede indtransporttimer.');
assert.equal(a.activeCurrentRegime,'inbound');
assert.equal(a.activeCurrentRegimeDurationHours,2,'Aktuelt forløb må nulstilles efter dokumenteret udtransport.');
assert.equal(a.activeCurrentRegimeSampleCount,2);

const missing=[sample(0,.8),sample(1,.8),sample(2,.8,.3,false),sample(3,.8,.3,false)];
const b=deriveCurrentTransportHistory(missing);
assert.equal(b.inboundCurrentDurationHours,2,'Ikke-verificerede strømprøver må ikke tælle som transport.');
assert.equal(b.activeCurrentRegime,'unavailable','Seneste ikke-verificerede prøve skal stoppe aktivt transportforløb uden at opfinde nulstrøm.');
assert.equal(b.activeCurrentRegimeDurationHours,0);
assert.equal(b.unverifiedCurrentSampleCount,2);

const neutral=[sample(0,.65),sample(1,.65),sample(2,0),sample(3,0)];
const c=deriveCurrentTransportHistory(neutral);
assert.equal(c.activeCurrentRegime,'neutral');
assert.equal(c.activeCurrentRegimeDurationHours,2);
assert.equal(currentRegime({currentVerified:false,currentAlignment:.9,currentSpeedMps:.4}),'unavailable');

const stable=[sample(0,.65),sample(1,.7),sample(2,.65),sample(3,.7)];
const unstable=[sample(0,.2),sample(1,1),sample(2,.25),sample(3,.9)];
assert.ok(deriveCurrentTransportHistory(stable).activeCurrentRegimeStability>deriveCurrentTransportHistory(unstable).activeCurrentRegimeStability);

const base={maxWind24hMps:12,maxWave24hM:1.3,strongEventDurationHours:2,hoursSinceStrongEventEnd:5,mobilisationPotential:55};
const history=applyCurrentTransportToHistory(base,stable);
assert.equal(history.stateModelMode,'shadow-v2');
assert.equal(history.activeCurrentRegime,'inbound');

const zone={id:'test',name:'Test',coastType:'east',reefs:true,seagrass:true,shallowWater:true,onshoreDirectionDeg:90};
const weather={windSpeedMps:4,windDirectionDeg:270,waveHeightM:.4,currentSpeedMps:.25,currentDirectionDeg:90,waterLevelCm:5,waterLevelTrendCm3h:2};
for(const mode of ['beach','waders']){
  const before=calculateRavScore({mode,zone,weather,history:base});
  const after=calculateRavScore({mode,zone,weather,history});
  assert.equal(after.score,before.score,`shadow-v2 må ikke ændre ${mode}-score`);
  assert.deepEqual(after.components,before.components,`shadow-v2 må ikke ændre ${mode}-delscorer`);
}
const publicDoc=buildPublicConditions({datasetId:'state-v2-test',generatedAt:'2026-08-06T03:00:00.000Z',zones:{test:{provider:'dmi',current:weather,history,forecast:{hourly:[]}}}});
assert.equal(publicDoc.zones.test.history.stateModelMode,'shadow-v2');
assert.equal(publicDoc.zones.test.history.activeCurrentRegimeDurationHours,4);
assert(!('samples24h' in publicDoc.zones.test),'Rå historik må ikke sendes til browseren.');
assert(Buffer.byteLength(JSON.stringify(publicDoc))<3000,'De nye felter skal forblive kompakte.');

const update=await fs.readFile('scripts/update-weather.mjs','utf8');
const provenance=await fs.readFile('scripts/enrich-current-provenance.mjs','utf8');
assert.match(update,/currentVerified: current\.currentProvenance\?\.status === 'verified'/);
assert.match(provenance,/applyCurrentTransportToHistory/);
assert(!/strømbånd|current\s*band|general\s*current\s*band/i.test(update));
console.log('4.0.115: verificeret DMI-historik, akkumuleret vs. aktivt forløb og score-neutral shadow-v2 består.');
