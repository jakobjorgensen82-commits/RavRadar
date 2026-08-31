import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectBestTimeForDay } from '../js/core/best-time-selector.js';
import {
  RAVSCORE_BEST_TIME_SELECTION_REASONS,
  bestTimeSelectionReasonI18nKey,
} from '../js/core/best-time-policy.js';

const now=new Date('2026-08-02T13:24:00.000Z');
const current={time:now.toISOString(),windSpeedMps:2,waveHeightM:.2,currentSpeedMps:.35,currentDirectionDeg:90,windDirectionDeg:270,waterLevelCm:5,waterLevelTrendCm3h:0};
const currentResult={available:true,score:81,modelId:'integrated-test'};
const poorLater={time:'2026-08-02T20:00:00.000Z',waterLevelCm:-20,waterLevelTrendCm3h:-5,ravScoreResult:{available:true,score:54,modelId:'integrated-test'}};
const selected=selectBestTimeForDay({day:{date:'2026-08-02',hours:[poorLater]},mode:'waders',currentWeather:current,currentResult,now});
assert.equal(selected.isNow,true,'En lavere score senere må ikke slå en højere aktuel RavScore');
assert.equal(selected.result.score,currentResult.score);
assert.equal(selected.selectionReason.code,RAVSCORE_BEST_TIME_SELECTION_REASONS.HIGHEST_SCORE);

const pastExcellent={...current,time:'2026-08-02T08:00:00.000Z',ravScoreResult:{available:true,score:99,modelId:'integrated-test'}};
const futureOkay={...current,time:'2026-08-02T16:00:00.000Z',ravScoreResult:{available:true,score:60,modelId:'integrated-test'}};
const selectedFuture=selectBestTimeForDay({day:{date:'2026-08-02',hours:[pastExcellent,futureOkay]},mode:'beach',currentWeather:null,currentResult:null,now});
assert.equal(selectedFuture.hour.time,futureOkay.time,'En fortidig prognosetime må ikke vælges som bedste tidspunkt resten af dagen');

const tieLow={...current,time:'2026-08-03T08:00:00.000Z',waterLevelCm:-15,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const tieHigh={...current,time:'2026-08-03T09:00:00.000Z',waterLevelCm:10,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const tie=selectBestTimeForDay({day:{date:'2026-08-03',hours:[tieHigh,tieLow]},mode:'waders',now});
assert.equal(tie.hour.time,tieLow.time,'Ved samme RavScore må lavere vandstand bruges som tie-breaker for waders');
assert.deepEqual(tie.selectionReason,{
  code:RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_LOWER_WATER,
  selectedScore:70,
  comparedScore:70,
  selectedWaterLevelCm:-15,
  comparedWaterLevelCm:10,
  semantics:'SEARCHABILITY_PRIORITY_NOT_MORE_AMBER_OR_SAFETY_ASSESSMENT',
},'Udvælgelsen skal returnere den eksakte og sikre begrundelse for lavere vand');
assert.equal(bestTimeSelectionReasonI18nKey(tie.selectionReason),'score.bestTimeReason.lowerWater');

const i18nSource=fs.readFileSync('js/i18n.js','utf8');
const infoPanelSource=fs.readFileSync('js/ui/info-panel.js','utf8');
const assistantSource=fs.readFileSync('js/services/rav-assistant.js','utf8');
assert.match(infoPanelSource,/data-best-time-selection-reason=/,
  'Femdøgnsvisningen skal vise og kode den eksakte udvælgelsesårsag');
assert.match(infoPanelSource,/bestTimeSelectionReasonI18nKey/,
  'Femdøgnsvisningen skal oversætte den returnerede årsag');
assert.match(assistantSource,/bestTimeSelectionReasonI18nKey\(best\.selectionReason\)/,
  'Spørg RavRadar skal bruge samme eksakte udvælgelsesårsag');
for(const pattern of [
  /lavere vandstand[\s\S]*Det betyder ikke mere rav[\s\S]*ikke en sikkerhedsvurdering/,
  /niedrigere Wasserstand[\s\S]*nicht mehr Bernstein[\s\S]*keine Sicherheitsbewertung/,
  /lower water level[\s\S]*does not mean more amber[\s\S]*not a safety assessment/,
]) assert.match(i18nSource,pattern,
  'DA/DE/EN skal forklare lavere vand som søgbarhed – ikke mere rav eller sikkerhed');

const lowerButRising={...current,time:'2026-08-03T10:00:00.000Z',waterLevelCm:10,waterLevelTrendCm3h:1,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const higherButFalling={...current,time:'2026-08-03T11:00:00.000Z',waterLevelCm:12,waterLevelTrendCm3h:-1,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const lexicalLevelTie=selectBestTimeForDay({day:{date:'2026-08-03',hours:[higherButFalling,lowerButRising]},mode:'waders',now});
assert.equal(lexicalLevelTie.hour.time,lowerButRising.time,'Lavere kendt vandstand skal afgøres før vandstandstrenden');
assert.equal(lexicalLevelTie.selectionReason.code,RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_LOWER_WATER);

const stableKnown={...current,time:'2026-08-03T12:00:00.000Z',waterLevelCm:10,waterLevelTrendCm3h:0,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const risingKnown={...current,time:'2026-08-03T13:00:00.000Z',waterLevelCm:10,waterLevelTrendCm3h:1,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const trendMissing={...current,time:'2026-08-03T07:00:00.000Z',waterLevelCm:10,waterLevelTrendCm3h:null,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const lexicalTrendTie=selectBestTimeForDay({day:{date:'2026-08-03',hours:[trendMissing,risingKnown,stableKnown]},mode:'waders',now});
assert.equal(lexicalTrendTie.hour.time,stableKnown.time,'Kendt ikke-stigende vand skal slå kendt stigende og manglende trend ved samme niveau');
assert.equal(lexicalTrendTie.selectionReason.code,RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_NON_RISING_TREND);

const knownLevel={...current,time:'2026-08-03T14:00:00.000Z',waterLevelCm:20,waterLevelTrendCm3h:0,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const missingLevel={...current,time:'2026-08-03T06:00:00.000Z',waterLevelCm:null,waterLevelTrendCm3h:-5,ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const missingCannotWin=selectBestTimeForDay({day:{date:'2026-08-03',hours:[missingLevel,knownLevel]},mode:'waders',now});
assert.equal(missingCannotWin.hour.time,knownLevel.time,'Manglende vandstand må ikke vinde tie-breaket over en kendt vandstand');
assert.equal(missingCannotWin.selectionReason.code,RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_KNOWN_WATER);

const beachTie=selectBestTimeForDay({day:{date:'2026-08-03',hours:[tieHigh,tieLow]},mode:'beach',now});
assert.equal(beachTie.hour.time,tieLow.time,'Ved samme strandscore vælges den tidligste time uden en opdigtet vandstandsregel');
assert.equal(beachTie.selectionReason.code,RAVSCORE_BEST_TIME_SELECTION_REASONS.EARLIEST);

const forgedStringScore={...current,time:'2026-08-03T05:00:00.000Z',ravScoreResult:{available:true,score:'99',modelId:'integrated-test'}};
const stringScoreCannotWin=selectBestTimeForDay({day:{date:'2026-08-03',hours:[forgedStringScore,tieHigh]},mode:'beach',now});
assert.equal(stringScoreCannotWin.hour.time,tieHigh.time,'En numerisk streng må ikke blive en offentlig RavScore-kandidat');

const stringWater={...current,time:'2026-08-03T04:00:00.000Z',waterLevelCm:'-99',ravScoreResult:{available:true,score:70,modelId:'integrated-test'}};
const stringWaterCannotWin=selectBestTimeForDay({day:{date:'2026-08-03',hours:[stringWater,tieHigh]},mode:'waders',now});
assert.equal(stringWaterCannotWin.hour.time,tieHigh.time,'En numerisk vandstandsstreng må ikke vinde waders-tie-breaket');

console.log('OK: Bedste tidspunkt bruger integreret RavScore, inkluderer nu, ignorerer fortid og følger fælles tie-break.');
