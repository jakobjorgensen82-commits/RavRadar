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
  current:{weather:{currentDirectionDeg,windDirectionDeg}},...overrides
});
const full={
  datasetId:'rr-arrow-density-test',generatedAt:'2026-08-15T12:00:00.000Z',
  zones:{Z1:{provider:'dmi',flowPoints,current:{currentDirectionDeg:80,windDirectionDeg:260},forecast:{hourly:[]}}},
  coastalParts:{schemaVersion:1,enabled:true,expectedPartCount:3,scoredPartCount:3,parts:{
    P1:part('Z1','Del 1',[10,56],90,270,{flowPoints:{...flowPoints,sources:{current:'dmi-marine-grid',wind:'dmi-marine-wind-grid'}}}),
    P2:part('Z1','Del 2',[10.5,56.5],100,280,{flowPoints:{...flowPoints,sources:{current:'zone-marine-anchor',wind:'zone-marine-anchor'}}}),
    P3:part('Z1','Del 3',[11,57],110,290,{flowPoints:{current:[11.1,57.1],wind:[11.2,57.2],sources:{current:'dmi-marine-grid',wind:'dmi-atmospheric-grid'}}})
  },zones:{Z1:{expectedPartCount:3,scoredPartCount:3,hourly:[{time:'2026-08-15T12:00:00.000Z',waders:{winningPartId:'P1'},beach:{winningPartId:'P1'}}]}}}
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

const gridPoint=(longitude,latitude)=>({longitude,latitude});
const recordWithGrid=gridPoints=>({model:{completeness:{gridPoints}}});
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
need(updateWeather.includes('const flowPoints = flowPointsFromForecastRecord(record, zonePoint(feature));')&&updateWeather.includes('flowPoints: row.flowPoints'),'Produktionsbygningen fører ikke de lokale gitterpunkter til runtimekontrakten.');
need(app.includes('()=>state.conditions.coastalParts||null')&&app.includes('state.flowArrows?.refresh?.()'),'Pilelaget opdateres ikke med den fulde detaljepakke.');

if(failures.length){console.error('Zoomtæthed for kortpile fejlede:\n- '+failures.join('\n- '));process.exit(1);}
console.log('OK: Zoom viser flere selvstændige DMI-gitterpile uden kunstige kopier eller ændring af hovedzonens oversigt.');
