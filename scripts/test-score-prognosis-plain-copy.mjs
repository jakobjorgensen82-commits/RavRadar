import assert from 'node:assert/strict';
import fs from 'node:fs';

import '../js/ui/score-prognosis-copy.js?v=4.0.486';
import { setLanguage, t } from '../js/i18n.js?v=4.0.486';
import { showZoneInfo } from '../js/ui/info-panel.js?v=4.0.486';

const bootstrap=fs.readFileSync('bootstrap.js','utf8');
const panel=fs.readFileSync('js/ui/info-panel.js','utf8');
const index=fs.readFileSync('index.html','utf8');
assert.ok(bootstrap.indexOf('score-prognosis-copy.js')<bootstrap.indexOf('initialiseI18n();'),
  'offentlig tekst skal registreres før første oversættelse');
assert.match(index,/data-i18n="score\.readBody"/);
assert.match(panel,/presentActiveRavScoreExplanation\(result/,
  'den bundne modelkontrol skal fortsat afgøre, om en scoreforklaring kan vises');
assert.match(panel,/score\.plainReason\.\$\{directionReason\}/,
  'strømretning skal beskrives ud fra den aktuelle diagnoses status');
assert.match(panel,/component-technical-reasons/,
  'den præcise tekniske begrundelse skal fortsat være tilgængelig');

const keys=[
  'score.readBody','score.transport','score.mobilisation',
  'score.transportDefinition','score.mobilisationDefinition',
  'score.historyIncomplete.body','score.historyIncomplete.range',
  'score.plainSummary','score.plainHistoryCurrent','score.plainHistoryWaves',
  'score.plainHistoryLimit','score.plainReason.inbound',
  'score.plainReason.outbound','score.plainReason.along',
  'score.plainReason.unknown','score.debug.reasonDetails',
];
for(const language of ['da','de','en']){
  for(const key of keys){
    const value=t(key,{score:25,transport:0,mobilisation:4,huntability:100,
      current:'0,02 m/s',lower:21,upper:98},language);
    assert.notEqual(value,key,`${language}: ${key} mangler`);
    assert.doesNotMatch(value,/\{[A-Za-z]+\}/,`${language}: ${key} har ufyldte parametre`);
  }
  assert.match(t('score.plainReason.inbound',{current:'0,02 m/s'},language),/0,02 m\/s/);
  assert.match(t('score.plainSummary',{score:21,transport:0,mobilisation:4,huntability:100},language),/21\/100/);
}
assert.doesNotMatch(t('score.readBody',{},'da'),/grid|modelbevis|mobiliseringsmulighed|surfzone/i);

const element={innerHTML:''};
const weather={windSpeedMps:4,waveHeightM:0.2,currentSpeedMps:0.02,
  currentDirectionDeg:237,waterLevelCm:50,waterTemperatureC:15.2};
const result={available:true,score:21,level:'poor',scoreQuality:'HISTORY_INCOMPLETE',
  scoreBounds:{lower:21,upper:98,modelUncertaintyPoints:77},historyCoverageHours:5,
  components:{huntability:100,transport:0,release:4},
  componentReasons:{transport:['Teknisk modelårsag: GRID_CURRENT_48H']},
  localWeather:weather,
  explanation:{weights:{huntability:0.2,transport:0.5,release:0.3},
    contributions:{huntability:20,transport:0,release:1},
    transportDiagnostics:{engine:'INTEGRATED_COASTAL_PROCESS',currentDirectionClass:'INBOUND'}},
};
showZoneInfo(element,{id:'TEST',name:'Testkyst',region:'Test'},result,weather,'waders');
assert.match(element.innerHTML,/Strømmen peger ind mod kysten lige nu/);
assert.match(element.innerHTML,/denne ene time kan ikke alene give en høj score/);
assert.match(element.innerHTML,/Den forsigtige score er 21/);
assert.match(element.innerHTML,/component-technical-reasons/);
assert.match(element.innerHTML,/GRID_CURRENT_48H/);
assert.match(element.innerHTML,/21<\/strong>/,
  'ordlyden må ikke ændre den viste numeriske score');
const languageStorage=new Map();
globalThis.localStorage={getItem:key=>languageStorage.get(key)||null,
  setItem:(key,value)=>languageStorage.set(key,value)};
setLanguage('de');
const germanElement={innerHTML:''};
showZoneInfo(germanElement,{id:'TEST',name:'Testkyst',region:'Test'},result,weather,'waders');
assert.match(germanElement.innerHTML,/Die Strömung zeigt jetzt zur Küste/);
assert.doesNotMatch(germanElement.innerHTML,/GRID_CURRENT_48H/,
  'danske råårsager må ikke vises som tysk forklaring');
setLanguage('en');
const englishElement={innerHTML:''};
showZoneInfo(englishElement,{id:'TEST',name:'Testkyst',region:'Test'},result,weather,'waders');
assert.match(englishElement.innerHTML,/The current points towards shore right now/);
assert.doesNotMatch(englishElement.innerHTML,/GRID_CURRENT_48H/,
  'danske råårsager må ikke vises som engelsk forklaring');
console.log('Forståelig score- og prognosetekst i DA/DE/EN: OK');
