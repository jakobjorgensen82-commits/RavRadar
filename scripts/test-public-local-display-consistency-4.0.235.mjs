import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildLocalZoneScore, selectLocalBestForDay } from '../js/core/local-zone-score.js';
import { buildPublicConditions, buildPublicConditionDetails } from './public-conditions-lib.mjs';
import { mergeConditionDetails } from '../js/services/data-service.js';

const generatedAt='2026-08-19T12:00:00.000Z';
const zoneCount=210;
const partCount=673;
const zones={};
const parts={};
const runtimeZones={};
let nextPart=0;

const weather=(zoneIndex,dayIndex,modeIndex)=>({
  windSpeedMps:3+modeIndex,
  windDirectionDeg:(zoneIndex*7+dayIndex*17+modeIndex*29)%360,
  waveHeightM:.4+dayIndex/10,
  waveDirectionDeg:(zoneIndex*11+dayIndex*13)%360,
  waterLevelCm:10+dayIndex,
  waterLevelTrendCm3h:dayIndex-2,
  currentSpeedMps:.1+modeIndex/10,
  currentDirectionDeg:(zoneIndex*19+dayIndex*23+modeIndex*31)%360,
  waterTemperatureC:12+zoneIndex/100+dayIndex/10,
  currentProvenance:{status:'verified',provider:'synthetic-safe-metadata'}
});

for(let zoneIndex=0;zoneIndex<zoneCount;zoneIndex+=1){
  const zoneId=`Z${String(zoneIndex).padStart(3,'0')}`;
  const count=zoneIndex<43?4:3;
  const ids=[];
  for(let localIndex=0;localIndex<count;localIndex+=1){
    const partId=`P${String(nextPart++).padStart(3,'0')}`;
    ids.push(partId);
    parts[partId]={zoneId,name:`Del ${partId}`,waterPoint:[10,56],landPoint:[10.01,56],onshoreDirectionDeg:90,current:null};
  }
  const hourly=[];
  for(let dayIndex=0;dayIndex<5;dayIndex+=1){
    const time=`2026-08-${String(19+dayIndex).padStart(2,'0')}T12:00:00.000Z`;
    const row={time};
    for(const [modeIndex,mode] of ['waders','beach'].entries()){
      const winningPartId=ids[(dayIndex+modeIndex)%ids.length];
      const localWeather=weather(zoneIndex,dayIndex,modeIndex);
      const score=60+dayIndex+modeIndex;
      row[mode]={
        status:'only-part',score,winningPartId,winningPartName:parts[winningPartId].name,
        scoreSpread:9,comparisonPartCount:count,
        components:{huntability:score-2,transport:score+1,release:score-1},
        componentReasons:{huntability:[`jagt-${zoneId}-${dayIndex}-${mode}`],transport:[`transport-${zoneId}-${dayIndex}-${mode}`],release:[`mobilisering-${zoneId}-${dayIndex}-${mode}`]},
        explanation:{formula:'lokal test',weights:{huntability:.4,transport:.35,release:.25},contributions:{huntability:24,transport:22,release:15},transportDiagnostics:{coastTransportExplanation:{summary:`kyst-${zoneId}-${dayIndex}-${mode}`,items:[]}}},
        weather:localWeather,
        parts:[{partId:winningPartId,name:parts[winningPartId].name,score}]
      };
      if(dayIndex===0){
        const current=parts[winningPartId].current||{time,weather:localWeather};
        current[mode]={score,components:row[mode].components,componentReasons:row[mode].componentReasons,explanation:row[mode].explanation};
        parts[winningPartId].current=current;
      }
    }
    hourly.push(row);
  }
  zones[zoneId]={expectedPartCount:count,scoredPartCount:count,hourly};
  runtimeZones[zoneId]={provider:'synthetic',current:{time:generatedAt,...weather(zoneIndex,0,0)},history:{},forecast:{provider:'synthetic',generatedAt,validUntil:hourly.at(-1).time,hourly:hourly.map(row=>({time:row.time,...weather(zoneIndex,Number(row.time.slice(8,10))-19,0)}))}};
}

assert.equal(nextPart,partCount,'Den landsdækkende regression skal dække præcis 673 lokale kystdele.');
const full={datasetId:'local-display-consistency',generatedAt,zones:runtimeZones,coastalParts:{schemaVersion:1,enabled:true,generatedAt,expectedPartCount:partCount,scoredPartCount:partCount,parts,zones}};
const merged=mergeConditionDetails({...buildPublicConditions(full),available:true},buildPublicConditionDetails(full));
let checkedTabs=0;
for(const [zoneId,zone] of Object.entries(merged.coastalParts.zones)){
  assert.equal(zone.scoredPartCount,zone.expectedPartCount,`${zoneId}: lokal deldækning er ikke komplet.`);
  assert.equal(zone.currentReferenceAt,generatedAt,`${zoneId}: aktuel lokal visning er ikke låst til zonens komplette fælles time.`);
  for(const mode of ['waders','beach']){
    for(const row of zone.hourly){
      const selected=selectLocalBestForDay({coastalParts:merged.coastalParts,zoneId,mode,date:row.time.slice(0,10),now:Date.parse(generatedAt)});
      const expected=row[mode];
      assert.equal(selected.result.localPartId,expected.winningPartId,`${zoneId}/${mode}/${row.time}: forkert lokal vinder.`);
      assert.equal(selected.result.score,expected.score,`${zoneId}/${mode}/${row.time}: score og vinderpost er skilt.`);
      assert.equal(selected.hour.currentDirectionDeg,expected.weather.currentDirectionDeg,`${zoneId}/${mode}/${row.time}: strømretningen kommer ikke fra vinderposten.`);
      assert.equal(selected.hour.windDirectionDeg,expected.weather.windDirectionDeg,`${zoneId}/${mode}/${row.time}: vindretningen kommer ikke fra vinderposten.`);
      assert.equal(selected.hour.waterTemperatureC,expected.weather.waterTemperatureC,`${zoneId}/${mode}/${row.time}: vandtemperaturen kommer ikke fra vinderposten.`);
      assert.equal(selected.result.componentReasons.transport[0],expected.componentReasons.transport[0],`${zoneId}/${mode}/${row.time}: transportforklaringen kommer ikke fra vinderposten.`);
      assert.equal(selected.result.explanation.transportDiagnostics.coastTransportExplanation.summary,expected.explanation.transportDiagnostics.coastTransportExplanation.summary,`${zoneId}/${mode}/${row.time}: kystforklaringen kommer ikke fra vinderposten.`);
      checkedTabs+=1;
    }
  }
}
assert.equal(checkedTabs,2100,'Regressionen skal kontrollere 210 zoner × 5 dage × 2 jagtformer.');

const first=buildLocalZoneScore({coastalParts:merged.coastalParts,zoneId:'Z000',mode:'waders',time:generatedAt});
assert.equal(first.localWeather.currentDirectionDeg,zones.Z000.hourly[0].waders.weather.currentDirectionDeg,'Den aktuelle visning blander hovedzonevejr ind i lokal score.');

const app=fs.readFileSync('app.js','utf8');
const ui=fs.readFileSync('js/ui/info-panel.js','utf8');
const producer=fs.readFileSync('scripts/update-weather.mjs','utf8');
assert.match(app,/display\.result,display\.weather/,'Zonepanelet får ikke score og vejr fra samme aktuelle kontekst.');
assert.match(app,/zoneReferenceAt\|\|state\.conditions\.productionReferenceAt\|\|state\.conditions\.generatedAt/,'Aktuel lokal score bruger ikke zonens komplette fælles current-reference.');
assert.match(app,/bestByDate/,'Zonepanelet genbruger ikke den nationale lokale dagsbeslutning.');
assert.match(ui,/bestByDate\?\.\[day\.date\]/,'Femdøgnspanelet bruger ikke den fælles lokale dagsbeslutning.');
assert.match(ui,/Viser hele området lige nu/,'Den samlede områdevisning er ikke tydeligt mærket for brugeren.');
assert.match(producer,/componentReasons:winner\.detail\?\.componentReasons/,'Producenten fører ikke vinderens forklaring med til prognosen.');
assert.match(producer,/waterTemperatureC:weather\.waterTemperatureC/,'Producenten fører ikke vinderens vandtemperatur med til prognosen.');
assert.match(producer,/selectNearestCompleteLocalScoreRow\(hourly, generatedAt, expectedPartCount\)/,'Producenten vælger ikke nærmeste komplette fælles time pr. zone.');

console.log(`OK: ${zoneCount} zoner, ${partCount} kystdele og ${checkedTabs} lokale femdøgnsvisninger bruger samme vinder, tidspunkt, score, vejr og forklaring.`);
