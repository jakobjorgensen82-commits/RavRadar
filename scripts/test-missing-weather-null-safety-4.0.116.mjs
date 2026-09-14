import assert from 'node:assert/strict';
import { calculateRavScore } from '../js/core/score-engine.js';
import { evaluateRules } from '../js/core/rule-engine.js';
import { isCurrentForecastHour } from '../js/core/local-zone-score.js';
import { hasNumber as accountHasNumber } from '../js/ui/account-panel.js';
import { hasNumber as infoHasNumber, showZoneInfo } from '../js/ui/info-panel.js';

const zone={id:'TEST',name:'Testkyst',region:'Test',coastType:'east',onshoreDirectionDeg:270};
const missingWind=calculateRavScore({mode:'beach',zone,weather:{windSpeedMps:null,windDirectionDeg:null,waveHeightM:null,currentSpeedMps:.2,currentDirectionDeg:270,waterLevelTrendCm3h:0},history:{}});
assert.equal(missingWind.available,false,'Manglende vind må ikke blive til 0 m/s og en tilsyneladende gyldig score.');

const trueZeroWind=calculateRavScore({mode:'beach',zone,weather:{windSpeedMps:0,windDirectionDeg:0,waveHeightM:0,currentSpeedMps:.2,currentDirectionDeg:270,waterLevelTrendCm3h:0},history:{}});
assert.equal(trueZeroWind.available,true,'En ægte numerisk nulværdi skal fortsat være gyldig.');

const maxWindRule={id:'maxwind',version:1,status:'active',kind:'bonus',priority:1,geography:{scope:'national'},conditions:{maxWindSpeedMps:5},effect:{scoreAdjustment:5}};
assert.equal(evaluateRules({rules:[maxWindRule],zone,mode:'beach',weather:{windSpeedMps:null},history:{},baseScore:50}).matches.length,0,'Manglende vind må ikke opfylde max-vind-regler som om den var 0.');
assert.equal(evaluateRules({rules:[maxWindRule],zone,mode:'beach',weather:{windSpeedMps:0},history:{},baseScore:50}).matches.length,1,'Ægte 0 m/s skal kunne opfylde en max-vind-regel.');

const element={innerHTML:''};
showZoneInfo(element,zone,{available:true,score:50,level:'fair',label:'Middel',components:{huntability:50,transport:50,release:50},componentReasons:{huntability:[],transport:[],release:[]},explanation:{weights:{huntability:.4,transport:.35,release:.25},contributions:{huntability:20,transport:18,release:13},transportDiagnostics:{},transportEvent:{},coastalProfile:{}},reasons:[]},{windSpeedMps:null,windDirectionDeg:null,waveHeightM:null,waterLevelCm:10,currentSpeedMps:.1,currentDirectionDeg:90,waterTemperatureC:null,waterLevelTrendCm3h:0},'beach',{forecast:{hourly:[]},history:{}});
assert.match(element.innerHTML,/Vind[\s\S]*Mangler[\s\S]*Bølger[\s\S]*Mangler/,'UI skal vise Mangler, ikke 0,0, for null vind og bølger.');
assert.doesNotMatch(element.innerHTML,/Vind[\s\S]{0,250}0,0 m\/s/,'Manglende vind må ikke vises som 0,0 m/s.');
for (const hasNumber of [infoHasNumber, accountHasNumber]) {
  assert.equal(hasNumber(null), false, 'Null må ikke vises som et ægte numerisk nul.');
  assert.equal(hasNumber(false), false, 'Boolean false må ikke vises som et ægte numerisk nul.');
  assert.equal(hasNumber(0), true, 'Et ægte numerisk nul skal fortsat kunne vises.');
}
const currentHourNow = Date.parse('2026-09-14T10:30:00.000Z');
assert.equal(isCurrentForecastHour('2026-09-14T10:00:00.000Z', currentHourNow), true);
assert.equal(isCurrentForecastHour('2026-09-14T10:59:00.000Z', currentHourNow), false,
  'En fremtidig prognose i samme klokktime må ikke kaldes nu.');
assert.equal(isCurrentForecastHour('2026-09-14T09:59:00.000Z', currentHourNow), false,
  'En tidligere prognosetime må ikke kaldes nu.');

console.log('OK: manglende vind/bølger forbliver manglende, mens ægte nulværdier bevares.');
