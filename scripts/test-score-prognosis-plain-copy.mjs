import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';

const releaseVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version;
await import(`../js/ui/score-prognosis-copy.js?v=${releaseVersion}`);
const {setLanguage,t}=await import(`../js/i18n.js?v=${releaseVersion}`);
const {historyQualityWarning,showZoneInfo}=await import(`../js/ui/info-panel.js?v=${releaseVersion}`);

const bootstrap=fs.readFileSync('bootstrap.js','utf8');
const panel=fs.readFileSync('js/ui/info-panel.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const markerSource=app.match(/^function scoreQualityMarker\(result\) \{[\s\S]*?^\}/m)?.[0];
assert.ok(markerSource,'ranglistens faktiske historikmarkør skal findes');
const scoreQualityMarker=runInNewContext(`(${markerSource})`,{t});
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
      current:'0,02 m/s',lower:21,upper:98,span:77},language);
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
const waveHistoryOnly = {
  scoreQuality:'HISTORY_INCOMPLETE',
  scoreBounds:{lower:92,upper:92,modelUncertaintyPoints:0,
    rawLower:91.555052,rawUpper:91.588436},
  historyCoverageHours:48,
  historyReasonCodes:['WAVE_MOBILISATION_HISTORY_INCOMPLETE'],
};
for (const language of ['da','de','en']) {
  setLanguage(language);
  const compact=historyQualityWarning(waveHistoryOnly,{compact:true});
  assert.ok(compact.includes(t('score.historyIncomplete.short',{},language)),
    `${language}: historikadvarslen skal stadig vises i ranglisten`);
  assert.doesNotMatch(compact,/92[–-]92/,
    `${language}: et sammenfaldende vist interval må ikke fylde i ranglisten`);
  const rankingMarker=scoreQualityMarker(waveHistoryOnly);
  assert.ok(rankingMarker.includes(t('score.historyIncomplete.short',{},language)),
    `${language}: forsidens faktiske markør skal bevare historikadvarslen`);
  assert.doesNotMatch(rankingMarker,/92[–-]92/,
    `${language}: rangliste og landsprognose må ikke vise et sammenfaldende interval`);
  const detailed=historyQualityWarning(waveHistoryOnly);
  assert.ok(detailed.includes(t('score.historyIncomplete.waveBody',{},language)),
    `${language}: bølgehistorik skal forklares særskilt ved 48/48 strøm-timer`);
  assert.doesNotMatch(detailed,/92[–-]92/,
    `${language}: intervallet 92–92 må ikke vises`);
  assert.ok(!detailed.includes(t('score.historyIncomplete.coverage',{hours:48},language)),
    `${language}: 48/48 strøm-timer er ikke forklaringen på advarslen`);
  const meaningfulRange={...waveHistoryOnly,
    scoreBounds:{lower:71,upper:78,modelUncertaintyPoints:7,
      rawLower:70.6,rawUpper:78.1}};
  assert.ok(historyQualityWarning(meaningfulRange,{compact:true}).includes('71–78'),
    `${language}: et reelt scoreinterval skal fortsat vises`);
  assert.ok(scoreQualityMarker(meaningfulRange).includes('71–78'),
    `${language}: rangliste og landsprognose skal stadig vise et reelt interval`);
  for(const invalidBounds of [
    {lower:78,upper:71,modelUncertaintyPoints:7},
    {lower:null,upper:78,modelUncertaintyPoints:7},
    {lower:71,upper:NaN,modelUncertaintyPoints:7},
    {lower:71,upper:Infinity,modelUncertaintyPoints:7},
    {lower:71,upper:78,modelUncertaintyPoints:null},
  ]){
    const marker=scoreQualityMarker({...waveHistoryOnly,scoreBounds:invalidBounds});
    assert.ok(marker.includes(t('score.historyIncomplete.short',{},language)),
      `${language}: ugyldige grænser må ikke fjerne historikadvarslen`);
    assert.ok(!marker.includes(' · '),
      `${language}: ugyldige eller omvendte grænser må ikke vises som et interval`);
  }
}
const flagBackgrounds=['style.css','about.css','learn.css'].map(path => {
  const css=fs.readFileSync(path,'utf8');
  const background=css.match(/\.flag-en\s*\{\s*background:\s*([^;}]+)/)?.[1]
    ?.replace(/\s+/g,'');
  assert.ok(background,`${path}: engelsk flag mangler`);
  assert.ok(background.indexOf('#c8102e')<background.indexOf('#fff'),
    `${path}: rødt kors skal ligge foran hvidt i CSS-lagene`);
  assert.match(background,/#012169$/,
    `${path}: det blå grundfelt skal være synligt`);
  return background;
});
assert.equal(new Set(flagBackgrounds).size,1,
  'forside, Om og Grundbog skal bruge samme farvede flag');
console.log('Forståelig score- og prognosetekst i DA/DE/EN: OK');
