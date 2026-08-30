import fs from 'node:fs/promises';
import { buildFlowArrowCandidates, installFlowArrows } from '../js/map/map-view.js';
import { buildPublicConditions, buildPublicConditionDetails } from './public-conditions-lib.mjs';
import { flowPointsFromForecastRecord } from './lib/flow-points-from-forecast-record.mjs';

const failures=[];
const need=(ok,message)=>{if(!ok)failures.push(message);};
const flowPoints={
  current:[10.1,56.1],wind:[10.2,56.2],
  sources:{current:'dmi-marine-grid',wind:'dmi-atmospheric-grid'}
};
const part=(zoneId,name,point,currentDirectionDeg,windDirectionDeg,overrides={})=>({
  zoneId,name,waterPoint:point,landPoint:[point[0]+.01,point[1]+.01],flowPoints,
  current:{time:'2026-08-15T12:00:00.000Z',weather:{currentDirectionDeg,windDirectionDeg}},...overrides
});
const full={
  datasetId:'rr-arrow-density-test',generatedAt:'2026-08-15T12:00:00.000Z',
  zones:{Z1:{provider:'dmi',flowPoints,current:{currentDirectionDeg:80,windDirectionDeg:260},forecast:{hourly:[]}}},
  coastalParts:{schemaVersion:1,enabled:true,expectedPartCount:3,scoredPartCount:3,parts:{
    P1:part('Z1','Del 1',[10,56],90,270,{flowPoints:{...flowPoints,sources:{current:'dmi-marine-grid',wind:'dmi-marine-wind-grid'}}}),
    P2:part('Z1','Del 2',[10.5,56.5],100,280,{flowPoints:{...flowPoints,sources:{current:'zone-marine-anchor',wind:'zone-marine-anchor'}}}),
    P3:part('Z1','Del 3',[11,57],110,290,{flowPoints:{current:[11.1,57.1],wind:[11.2,57.2],sources:{current:'dmi-marine-grid',wind:'dmi-atmospheric-grid'}}})
  },zones:{Z1:{expectedPartCount:3,scoredPartCount:3,hourly:[{time:'2026-08-15T12:00:00.000Z',waders:{status:'only-part',score:70,comparisonPartCount:3,winningPartId:'P1'},beach:{status:'only-part',score:70,comparisonPartCount:3,winningPartId:'P1'}}]}}}
};
const startup=buildPublicConditions(full),details=buildPublicConditionDetails(full);
need(Object.keys(startup.coastalParts.parts).join(',')==='P1','Startpakken skal kun bære det aktuelle vinderpunkts flowdata.');
need(startup.coastalParts.parts.P1.flowPoints?.sources?.current==='dmi-marine-grid','Startpakken taber den lokale strømpils DMI-proveniens.');
need(Object.keys(details.coastalParts.parts).length===3,'Detaljepakken skal bevare alle lokale kystdele.');
need(details.coastalParts.parts.P3.flowPoints?.wind?.[0]===11.2,'Detaljepakken taber lokale vindgitterpunkter.');

const features={type:'FeatureCollection',features:[{type:'Feature',geometry:null,properties:{id:'Z1',zoneStatus:'active',dataPoint:[9.9,55.9]}}]};
const zoneFor=id=>startup.zones[id];
const overview=buildFlowArrowCandidates(features,zoneFor,details.coastalParts,8);
const close=buildFlowArrowCandidates(features,zoneFor,details.coastalParts,10);
need(overview.length===2,'Landsoversigten skal bevare ét vind- og ét strømpunkt for hovedzonen.');
need(close.length===6,'Indzoomning skal tilføje de fire verificerede lokale DMI-pile og afvise den uverificerede lokale kopi.');
need(close.filter(row=>row.partId).every(row=>row.source.startsWith('dmi-')),'Lokale pile uden eksplicit DMI-gitterproveniens blev accepteret.');
need(close.some(row=>row.partId==='P3'&&row.type==='current'&&row.point[0]===11.1),'Et selvstændigt lokalt strømgridpunkt mangler ved indzoomning.');
need(close.some(row=>row.partId==='P1'&&row.type==='wind'&&row.source==='dmi-marine-wind-grid'),'En dokumenteret lokal DKSS-vindpil mangler ved indzoomning.');

const gridPoint=(longitude,latitude,extra={})=>({longitude,latitude,...extra});
const recordWithGrid=(gridPoints,extra={},hourly=[])=>({model:{completeness:{currentVectorSemanticsVersion:3,currentVectorSelection:'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',currentMaxDistanceKm:5,samplingPoint:[9,54],gridPoints,...extra}},hourly});
const recordWithCurrent=(sourceOverrides={},extra={})=>{
  const source={provider:'dmi',vectorSemanticsVersion:3,verticalLayer:'depthbelowsea:7',samplingPoint:[9,54],gridPoint:[9.03,54.02],distanceKm:3.2,vectorSelection:'nearest-shared-uv-column-across-dmi-collections-then-deepest-valid-layer',...sourceOverrides};
  return recordWithGrid({
    'current-u':gridPoint(source.gridPoint?.[0],source.gridPoint?.[1],{distanceKm:source.distanceKm,verticalLayer:source.verticalLayer}),
    'current-v':gridPoint(source.gridPoint?.[0],source.gridPoint?.[1],{distanceKm:source.distanceKm,verticalLayer:source.verticalLayer})
  },extra,[{time:'2026-08-15T12:00:00.000Z',currentUMps:0.1,currentVMps:0.2,sources:{current:source}}]);
};
const primary=flowPointsFromForecastRecord(recordWithGrid({
  'wind-u-10m':gridPoint(12.1,55.1),'wind-v-10m':gridPoint(12.1,55.1),
  'wind-tail-u-10m':gridPoint(12.2,55.2),'wind-tail-v-10m':gridPoint(12.2,55.2)
}),[9,54]);
need(primary.wind[0]===12.1&&primary.sources.wind==='dmi-atmospheric-grid','Det primære atmosfæriske DMI-vindpunkt skal foretrækkes, når det findes som eksakt U/V-par.');
const marine=flowPointsFromForecastRecord(recordWithGrid({
  'wind-tail-u-10m':gridPoint(13.2,56.2),'wind-tail-v-10m':gridPoint(13.2,56.2)
}),[9,54]);
need(marine.wind[0]===13.2&&marine.sources.wind==='dmi-marine-wind-grid','DKSS-vindhalens eksakte U/V-punkt skal bevares som lokal vindproveniens.');
const mismatch=flowPointsFromForecastRecord(recordWithGrid({
  'current-u':gridPoint(10,55),'current-v':gridPoint(10.01,55),
  'wind-tail-u-10m':gridPoint(11,56),'wind-tail-v-10m':gridPoint(11,56.01)
}),[9,54]);
need(mismatch.current[0]===9&&mismatch.sources.current==='zone-marine-anchor','Uens strøm-U/V-koordinater skal falde sikkert tilbage.');
need(mismatch.wind[0]===9&&mismatch.sources.wind==='zone-marine-anchor','Uens vind-U/V-koordinater skal falde sikkert tilbage.');
const verifiedCurrent=flowPointsFromForecastRecord(recordWithCurrent(),[9,54]);
need(verifiedCurrent.current[0]===9.03&&verifiedCurrent.sources.current==='dmi-marine-grid','En rumligt gyldig bundnaer U/V-celle inden for 5 km skal kunne vise pil.');
const timedRecord=recordWithCurrent();
timedRecord.hourly.push({time:'2026-08-15T15:00:00.000Z',currentUMps:0.2,currentVMps:0.1,sources:{current:{...timedRecord.hourly[0].sources.current,gridPoint:[9.04,54.02],distanceKm:3.3}}});
const timedCurrent=flowPointsFromForecastRecord(timedRecord,[9,54],'2026-08-15T15:00:00.000Z');
need(timedCurrent.current[0]===9.04,'Strømpilen skal stå i den valgte times egen dokumenterede DMI-celle.');
const absentExactTime=flowPointsFromForecastRecord(timedRecord,[9,54],'2026-08-15T14:00:00.000Z');
need(absentExactTime.current[0]===9&&absentExactTime.sources.current==='zone-marine-anchor','En pil må ikke låne den nærmeste times celle, når den valgte eksakte time mangler.');
const gapRecord=recordWithCurrent();
gapRecord.hourly.unshift({time:'2026-08-15T09:00:00.000Z',currentUMps:null,currentVMps:null,sources:{}});
const gapNow=flowPointsFromForecastRecord(gapRecord,[9,54],'2026-08-15T09:00:00.000Z');
const gapSelectedScore=flowPointsFromForecastRecord(gapRecord,[9,54],'2026-08-15T12:00:00.000Z');
need(gapNow.sources.current==='zone-marine-anchor'&&gapSelectedScore.sources.current==='dmi-marine-grid','En lokal pil skal bruge den viste scoretimes DMI-celle, selv om tidspunktet nu mangler strøm.');
const tooFarCurrent=flowPointsFromForecastRecord(recordWithCurrent({gridPoint:[9.06,54.05],distanceKm:5.01}),[9,54]);
need(tooFarCurrent.current[0]===9&&tooFarCurrent.sources.current==='zone-marine-anchor','En stroemcelle over 5 km maa ikke vises som verificeret DMI-pil.');
const unlayeredCurrent=flowPointsFromForecastRecord(recordWithCurrent({verticalLayer:null}),[9,54]);
need(unlayeredCurrent.current[0]===9&&unlayeredCurrent.sources.current==='zone-marine-anchor','Et stroempar uden faelles dokumenteret dybdelag maa ikke vises.');
const staleSamplingPoint=flowPointsFromForecastRecord(recordWithCurrent({}, {samplingPoint:[9.2,54.2]}),[9,54]);
need(staleSamplingPoint.current[0]===9&&staleSamplingPoint.sources.current==='zone-marine-anchor','En pil fra et tidligere administratorvandpunkt maa ikke genbruges.');

globalThis.L={
  latLng:(lat,lng)=>({lat,lng}),
  divIcon:options=>options,
  marker:(position,options)=>({options,addTo(layer){layer.markers.push(this);return this;}}),
  layerGroup:()=>({markers:[],ravFlowCounts:null,clearLayers(){this.markers=[];},addTo(map){map.visibleLayer=this;return this;}})
};
const makeMap=zoom=>({
  zoom,visibleLayer:null,panes:{},getZoom(){return this.zoom;},getPane(name){return this.panes[name]||null;},
  createPane(name){return(this.panes[name]={style:{}});},getBounds(){return{pad(){return this;},contains(){return true;}};},
  latLngToLayerPoint(latLng){const scale=1000;return{x:latLng.lng*scale,y:latLng.lat*scale,distanceTo(other){return Math.hypot(this.x-other.x,this.y-other.y);}};},
  hasLayer(layer){return this.visibleLayer===layer;},removeLayer(layer){if(this.visibleLayer===layer)this.visibleLayer=null;},on(){}
});
const overviewLayer=installFlowArrows(makeMap(8),features,zoneFor,()=>details.coastalParts);
const closeLayer=installFlowArrows(makeMap(10),features,zoneFor,()=>details.coastalParts);
need(overviewLayer.counts().wind===1&&overviewLayer.counts().current===1,'Det renderede landslag skal have én pil af hver type i den syntetiske zone.');
need(closeLayer.counts().wind===2&&closeLayer.counts().current===2,'Det renderede indzoomede lag skal vise flere fysisk adskilte DMI-pile.');

const updateWeather=await fs.readFile('scripts/update-weather.mjs','utf8');
const app=await fs.readFile('app.js','utf8');
need(updateWeather.includes('selectLatestLocalScoreRowAtOrBefore(hourly, generatedAt)')&&updateWeather.includes('row.scores.find(candidate => Date.parse(candidate.time) === Date.parse(currentReferenceAt))')&&updateWeather.includes('flowPointsFromForecastRecord(row.record, row.waterPoint, score?.time ?? generatedAt)'),'Produktionsbygningen låser ikke score og pile til zonens samme faktiske time.');
need(updateWeather.includes('function verifiedBulkCurrent')&&updateWeather.includes('verifiedBulkCurrent(bulkCache, bulkZone, point, rowCurrent)')&&updateWeather.includes('samePoint(source?.samplingPoint, expectedSamplingPoint)'),'Scorebygningen accepterer strøm uden hver times dokumenterede vandkolonne og dybdelag.');
need(updateWeather.includes('function withOnlyVerifiedCurrent')&&updateWeather.includes('const safeRecord = withOnlyVerifiedCurrent(record, zonePoint(feature));'),'Gamle prognosecacher kan stadig føre ikke-verificeret strøm til score eller pil.');
const directDmiBlock=updateWeather.slice(updateWeather.indexOf('async function fromDmi('),updateWeather.indexOf('function mergeHourlyPreferDmi('));
need(directDmiBlock.includes("['sea-mean-deviation', 'water-temperature']")&&!directDmiBlock.includes("['sea-mean-deviation', 'current-u'"),'Direkte ForecastEDR må ikke levere strøm uden dokumenteret fælles vandkolonne og dybdelag.');
need(directDmiBlock.includes('withoutCurrent(createDmiForecastRecord('),'Direkte ForecastEDR-strøm lukkes ikke fail-closed før scoring.');
need(app.includes('()=>state.conditions.coastalParts||null')&&app.includes('state.flowArrows?.refresh?.()'),'Pilelaget opdateres ikke med den fulde detaljepakke.');

if(failures.length){console.error('Zoomtæthed for kortpile fejlede:\n- '+failures.join('\n- '));process.exit(1);}
console.log('OK: Zoom viser flere selvstændige DMI-gitterpile uden kunstige kopier eller ændring af hovedzonens oversigt.');
