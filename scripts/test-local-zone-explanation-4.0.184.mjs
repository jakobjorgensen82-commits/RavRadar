import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildLocalZoneScore,localCoverageSummary} from '../js/core/local-zone-score.js';

const exact={score:78,components:{huntability:72,transport:84,release:79},componentReasons:{huntability:['Rolige forhold.'],transport:['Strømmen fører materiale ind.'],release:['Materiale kan genmobiliseres.']},explanation:{weights:{huntability:.4,transport:.35,release:.25},contributions:{huntability:29,transport:29,release:20},transportDiagnostics:{currentClassification:'onshore'}}};
const coastalParts={enabled:true,generatedAt:'2026-08-12T08:00:00Z',parts:{p3:{zoneId:'Z',name:'Mullerup Klint',waterPoint:[11,55],landPoint:[10.99,55],onshoreDirectionDeg:270,current:{time:'2026-08-12T08:00:00Z',weather:{currentSpeedMps:.2,currentDirectionDeg:270},waders:exact}}},zones:{Z:{expectedPartCount:2,hourly:[{time:'2026-08-12T08:00:00Z',waders:{status:'only-part',score:78,winningPartId:'p3',winningPartName:'Mullerup Klint',scoreSpread:30,comparisonPartCount:2,components:exact.components,parts:[{partId:'p3',name:'Mullerup Klint',score:78}]}}]}}};
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
assert.match(app,/const local=localZoneScore\(zone\);const result=local\|\|\{available:false,score:null/,'Manglende lokal Candidate G-data skal lukke zonen lokalt uden at bruge hovedzonens gamle score.');
assert.match(app,/return selectLocalBestForDay\(\{coastalParts:state\.conditions\.coastalParts,zoneId:zone\.id,mode:state\.mode,date\}\);/,'En lokalt utilgængelig zone må ikke falde tilbage til en gammel femdøgnsscore.');
assert.doesNotMatch(app,/calculateRavScore|selectBestTimeForDay|scoreFor\(/,'Den offentlige app må ikke indeholde en vej tilbage til den gamle scoremotor.');
console.log('OK: Lokal zonescore viser korrekt kystdel, 7-point-grænse og lukker lokalt uden gammel fallback.');
