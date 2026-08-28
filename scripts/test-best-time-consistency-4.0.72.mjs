import assert from 'node:assert/strict';
import { selectBestTimeForDay } from '../js/core/best-time-selector.js';
import { calculateRavScore } from '../js/core/score-engine.js';

const zone={id:'TEST',name:'Testkyst',onshoreDirectionDeg:90,coastType:'open-sea',shallowWater:false,reefs:false,seagrass:false};
const history={maxWind24hMps:5,maxWave24hM:.4,hoursSinceHighEnergy:72};
const now=new Date('2026-08-02T13:24:00.000Z');
const current={time:now.toISOString(),windSpeedMps:2,waveHeightM:.2,currentSpeedMps:.35,currentDirectionDeg:90,windDirectionDeg:270,waterLevelCm:5,waterLevelTrendCm3h:0};
const currentResult=calculateRavScore({mode:'waders',zone,weather:current,history});
const poorLater={time:'2026-08-02T20:00:00.000Z',windSpeedMps:1,waveHeightM:.1,currentSpeedMps:.5,currentDirectionDeg:270,windDirectionDeg:270,waterLevelCm:-20,waterLevelTrendCm3h:-5};
const selected=selectBestTimeForDay({day:{date:'2026-08-02',hours:[poorLater]},zone,mode:'waders',history,currentWeather:current,currentResult,now});
assert.equal(selected.isNow,true,'En lavere score senere må ikke slå en højere aktuel RavScore');
assert.equal(selected.result.score,currentResult.score);

const pastExcellent={...current,time:'2026-08-02T08:00:00.000Z'};
const futureOkay={...current,time:'2026-08-02T16:00:00.000Z',currentSpeedMps:.25};
const selectedFuture=selectBestTimeForDay({day:{date:'2026-08-02',hours:[pastExcellent,futureOkay]},zone,mode:'beach',history,currentWeather:null,currentResult:null,now});
assert.equal(selectedFuture.hour.time,futureOkay.time,'En fortidig prognosetime må ikke vælges som bedste tidspunkt resten af dagen');

const tieLow={...current,time:'2026-08-03T08:00:00.000Z',waterLevelCm:-15};
const tieHigh={...current,time:'2026-08-03T09:00:00.000Z',waterLevelCm:10};
const tie=selectBestTimeForDay({day:{date:'2026-08-03',hours:[tieHigh,tieLow]},zone,mode:'waders',history,now});
assert.equal(tie.hour.time,tieLow.time,'Ved samme RavScore må lavere vandstand bruges som tie-breaker for waders');

console.log('OK: Bedste tidspunkt bruger højeste samlede RavScore, inkluderer lige nu og ignorerer fortid.');
