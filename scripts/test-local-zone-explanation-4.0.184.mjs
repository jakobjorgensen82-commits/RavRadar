import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildLocalZoneScore,localCoverageSummary,selectLocalBestForDay} from '../js/core/local-zone-score.js';
import {requireExactZone} from '../js/services/zone-hour-preview.js';
import {sameRavScoreModelBinding} from '../js/core/ravscore-public-runtime-contract.js';
import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';

const exact={score:78,components:{huntability:72,transport:84,release:79},componentReasons:{huntability:['Rolige forhold.'],transport:['Strømmen fører materiale ind.'],release:['Materiale kan genmobiliseres.']},explanation:{weights:{huntability:.4,transport:.35,release:.25},contributions:{huntability:29,transport:29,release:20},transportDiagnostics:{currentClassification:'onshore'}}};
const exactBounds={lower:78,upper:78,modelUncertaintyPoints:0,rawLower:78,rawUpper:78};
const coastalParts={enabled:true,generatedAt:'2026-08-12T08:00:00Z',parts:{p3:{zoneId:'Z',name:'Mullerup Klint',waterPoint:[11,55],landPoint:[10.99,55],onshoreDirectionDeg:270,current:{time:'2026-08-12T08:00:00Z',weather:{currentSpeedMps:.2,currentDirectionDeg:270},waders:exact}}},zones:{Z:{expectedPartCount:2,hourly:[{time:'2026-08-12T08:00:00Z',waders:{available:true,status:'only-part',score:78,scoreQuality:'FULL_HISTORY',calibrationEligible:true,scoreSemantics:'EXACT_POINT_SCORE',conservativeTailResetApplied:false,scoreBounds:exactBounds,historyCoverageHours:48,historyReasonCodes:[],winningPartId:'p3',winningPartName:'Mullerup Klint',winningPartUncertain:false,possibleWinningPartCount:1,possibleWinningParts:[{partId:'p3',name:'Mullerup Klint',score:78,scoreBounds:exactBounds}],scoreSpread:30,comparisonPartCount:2,components:exact.components,parts:[{partId:'p3',name:'Mullerup Klint',score:78}]}}]}}};
const result=buildLocalZoneScore({coastalParts,zoneId:'Z',mode:'waders',time:'2026-08-12T08:00:00Z'});
assert.equal(result.score,78);
assert.deepEqual(result.components,exact.components);
assert.deepEqual(result.componentReasons,exact.componentReasons);
assert.equal(result.explanation.transportDiagnostics.currentClassification,'onshore');
assert.equal(result.localWeather.currentDirectionDeg,270);
assert.equal(result.localZone.onshoreDirectionDeg,270);
assert.equal(result.localCoverageSummary.kind,'only-part');
assert.match(result.localCoverageSummary.text,/ikke nødvendigvis resten af zonen/);
for (const invalidScore of [null, undefined, '', '   ', '78', false, true, [], [78], {}]) {
  const invalidParts=structuredClone(coastalParts);
  invalidParts.zones.Z.hourly[0].waders.score=invalidScore;
  const unavailable=buildLocalZoneScore({coastalParts:invalidParts,zoneId:'Z',mode:'waders',time:'2026-08-12T08:00:00Z'});
  assert.equal(unavailable.available,false,'En manglende eller ikke-skalar lokal score skal lukke fail-closed.');
  assert.equal(unavailable.score,null);
}
for (const malformedCount of ['2', true, [2], {value:2}]) {
  const invalidParts=structuredClone(coastalParts);
  invalidParts.zones.Z.hourly[0].waders.comparisonPartCount=malformedCount;
  assert.equal(buildLocalZoneScore({coastalParts:invalidParts,zoneId:'Z',mode:'waders',time:'2026-08-12T08:00:00Z'}).available,false,
    `comparisonPartCount=${JSON.stringify(malformedCount)} skal lukke fail-closed`);
}
for (const [field, malformed] of [
  ['huntability','72'], ['transport',true], ['release',[79]],
]) {
  const invalidParts=structuredClone(coastalParts);
  invalidParts.zones.Z.hourly[0].waders.components[field]=malformed;
  assert.equal(buildLocalZoneScore({coastalParts:invalidParts,zoneId:'Z',mode:'waders',time:'2026-08-12T08:00:00Z'}).available,false,
    `component ${field} må ikke typekonverteres`);
}
const poisonedWeather=structuredClone(coastalParts);
poisonedWeather.zones.Z.hourly[0].waders.weather={windSpeedMps:'7.2',waveHeightM:false,currentSpeedMps:[.2],currentUMps:.4};
const sanitised=buildLocalZoneScore({coastalParts:poisonedWeather,zoneId:'Z',mode:'waders',time:'2026-08-12T08:00:00Z'});
assert.equal(sanitised.available,true);
assert.equal(sanitised.localWeather.windSpeedMps,null);
assert.equal(sanitised.localWeather.waveHeightM,null);
assert.equal(sanitised.localWeather.currentSpeedMps,null);
assert.equal(Object.hasOwn(sanitised.localWeather,'currentUMps'),false);
assert.equal(localCoverageSummary({status:'whole-zone',score:60,scoreSpread:7,comparisonPartCount:2}).kind,'whole-zone','Præcis 7 point skal fortsat gælde hele zonen.');
assert.equal(localCoverageSummary({status:'whole-zone',score:60,scoreSpread:0,comparisonPartCount:1}).kind,'single-part','En enkelt beregnet kystdel må ikke fremstilles som dokumentation for hele zonen.');
assert.equal(localCoverageSummary({status:'only-part',score:60,scoreSpread:8,comparisonPartCount:2,winningPartName:'A',parts:[{name:'A',score:60}]}).kind,'only-part','Opdeling starter først over 7 point.');
const several=localCoverageSummary({status:'several-parts',score:70,scoreSpread:20,comparisonPartCount:2,winningPartName:'A',parts:[{name:'A',score:70},{name:'B',score:66}]});
assert.match(several.text,/A \(70\), B \(66\)/);
const app=fs.readFileSync('app.js','utf8'),ui=fs.readFileSync('js/ui/info-panel.js','utf8'),weather=fs.readFileSync('scripts/update-weather.mjs','utf8');
assert.ok(app.includes('buildLocalZoneScore'),'Zone- og prognosevisning skal bruge den fælles lokale scoreresultatbygger.');
assert.ok(ui.includes('localCoveragePanel(result)'),'Zonepanelet skal vise den geografiske scoreforklaring før delscorerne.');
assert.ok((ui.match(/localCoveragePanel\(/g)||[]).length >= 3,'Både aktuel zone og åbnet femdøgnsprognose skal vise den geografiske scoreforklaring.');
assert.match(weather,/marginPoints: RAVSCORE_LOCAL_MARGIN_POINTS/,'Produktionsbygningen skal føre den fælles 7-point-regel ind i den integrerede zoneprojektion.');
const productionAdapter=fs.readFileSync('scripts/lib/ravscore-production-adapters.mjs','utf8');
assert.match(productionAdapter,/high - low <= marginPoints\s*\? 'whole-zone'/,'Den fælles zoneprojektion skal bevare 7-point-reglen.');
assert.match(productionAdapter,/componentReasons: winner\.detail\?\.componentReasons \?\? \{\}/,'Vinderens faglige forklaringer skal følge med til offentlig runtime.');
assert.match(productionAdapter,/const explanation = winner\.detail\?\.explanation \?\? \{\}/,'Hele den tekniske forklaring skal følge med til offentlig runtime.');
assert.match(app,/const local=localZoneScore\(zone,emergencySnapshotReferenceAt\(\)\);const result=local\|\|\{available:false,score:null/,'Den store detaljepakke skal kunne erstattes af den tidsmærkede, verificerede startscore uden at bruge en anden model.');
assert.match(app,/tripButton\.disabled=snapshotOnly[\s\S]{0,180}runtimeSnapshotText\('trip'\)/,'En ældre nødvisning må ikke kunne starte en tur som om scoretiden var aktuel.');
// Execute the current app selector and its real compact-zone binding guard.
// The PLAIN landing path and ordinary path must use their own local evidence;
// neither may recover a missing local score from an old national day score.
const appBody=(start,end)=>{
  const at=app.indexOf(start),until=app.indexOf(end,at);
  assert(at>=0&&until>at,'Den faktiske lokale selector og dens afhængigheder skal være til stede.');
  return app.slice(at,until);
};
const binding=ravScoreModelBinding(),time='2026-08-12T08:00:00Z';
const compactFrame={time,datasetId:'unit-local-zone',generatedAt:time,productionReferenceAt:time,
  sourceDetailsSha256:'a'.repeat(64),modelBinding:binding};
const compactDetails={...compactFrame,delivery:{kind:'zone',key:'Z',sourceDetailsSha256:compactFrame.sourceDetailsSha256,
  modelBinding:binding},coastalParts,zones:{Z:{forecast:{hourly:[{time}]}}}};
const localContext={state:{mode:'waders',conditions:{coastalParts,nationalForecast:{oldScore:99}}},
  activeLandingView:null,compactZoneDetail:null,runtimeGeneration:7,mapForecast:{committed:null},
  selectLocalBestForDay,requireExactZone,sameRavScoreModelBinding};
vm.createContext(localContext);
vm.runInContext(appBody('function mapFrame(){','function mapScoreFor(')
  +appBody('function compactZoneFor(','function mapDisplayFor(')
  +appBody('function bestForDay(','const yieldToBrowser')+'\nglobalThis.actualBestForDay=bestForDay;',localContext);
assert.equal(localContext.actualBestForDay({id:'Z'},'2026-08-12').result.score,78);
const unavailableLocal=structuredClone(coastalParts);
unavailableLocal.zones.Z.hourly[0].waders.available=false;
localContext.state.conditions.coastalParts=unavailableLocal;
assert.equal(localContext.actualBestForDay({id:'Z'},'2026-08-12'),null,'En utilgængelig lokal zone må ikke bruge gammel national score.');
localContext.activeLandingView={time,compact:compactFrame};
localContext.compactZoneDetail={runtimeGeneration:7,zoneId:'Z',details:compactDetails};
assert.equal(localContext.actualBestForDay({id:'Z'},'2026-08-12').result.score,78,'Landing skal bruge den faktisk bundne lokale zonefil.');
localContext.compactZoneDetail.runtimeGeneration=6;
assert.equal(localContext.actualBestForDay({id:'Z'},'2026-08-12'),null,'En gammel zonefil må ikke bruge landingens eller den almindelige zonescore som fallback.');
localContext.compactZoneDetail={runtimeGeneration:7,zoneId:'Z',details:{...compactDetails,datasetId:'old-generation'}};
assert.equal(localContext.actualBestForDay({id:'Z'},'2026-08-12'),null,'Forkert zonebinding må ikke genbruge en gammel lokal score.');
assert.doesNotMatch(app,/calculateRavScore|selectBestTimeForDay|scoreFor\(/,'Den offentlige app må ikke indeholde en vej tilbage til den gamle scoremotor.');
console.log('OK: Lokal zonescore viser korrekt kystdel, 7-point-grænse og tidsmærket samme-model nødvisning.');
