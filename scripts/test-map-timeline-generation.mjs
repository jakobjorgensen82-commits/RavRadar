// Actual normal app-generation and Leaflet lifecycle regression. No network.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const app=read('app.js'),view=read('js/map/map-view.js');
const callerSource=app;
const fragment=(text,start,end)=>{
 const from=text.indexOf(start),to=text.indexOf(end,from+start.length);
 assert.ok(from>=0&&to>from,'Normal function boundary absent: '+start);return text.slice(from,to);
};
const {createMapForecastController}=await import('../js/services/map-forecast-view.js');
const {renderZones}=await import('../js/map/map-view.js');
const savedFetch=globalThis.fetch;
globalThis.fetch=()=>{throw Error('REAL_NETWORK_FORBIDDEN');};
let cases=0;
const h0='2026-10-17T01:00:00.000Z',h1='2026-10-17T02:00:00.000Z';
async function checkCaller({changed,referenceAt=h1,available=true}){
 const paints=[],initialScore={available:true,score:8,time:h0},freshScore={available:true,score:79,time:referenceAt};
 const conditions=(datasetId,time,score)=>({available:true,datasetId,publicRuntimeAvailability:{selectedReferenceAt:time,mode:'FRESH'},zones:{Z:{}},syntheticScore:score});
 const old=conditions('A',h0,initialScore),next=available?conditions(changed?'B':'A',referenceAt,freshScore):{available:false,zones:{}};
 const context={Map,Promise,console,performance:{mark(){}},activeManifest:{datasetId:'A'},conditionRuntimePromise:null,
  runtimeGeneration:0,pendingZoneDetails:new Map(),conditionDetailsPromise:null,conditionDetailsReady:false,coreViewReady:true,
  state:{conditions:old,currentScores:new Map([['waders:Z',initialScore]]),forecastGroups:new Map([['old',true]]),forecastRenderId:0,
   mode:'waders',selectedZone:null,zones:{features:[{properties:{id:'Z'}}]},zoneLayer:{destroy(){},selectZone(){}},flowArrows:{refresh(){},destroy(){}}},
  map:{invalidateSize(){}},mapScores:new Map(),selectedZonePartsVisible:false,
  localZoneScore:()=>context.state.conditions.syntheticScore||null,emergencySnapshotReferenceAt:()=>null,
  refreshPublicRuntimeGeneration:async()=>({changed,manifest:{datasetId:changed?'B':'A'},conditions:next,zones:null}),
  mapForecastTimeline:()=>{if(!context.state.conditions.available)throw Error('UNAVAILABLE');return{generation:changed?'B':'A',times:[referenceAt],liveTime:referenceAt};},
  refreshZoneStyles:(layer,scoreFor)=>paints.push(scoreFor('Z').score),renderSelectedZone(){},showSelectedZoneParts(){},
  updatePublicDataStatus(){},updateTripUi(){},scheduleConditionRuntimeGate(){},renderRanking(){},renderNationalForecast:async()=>false,
  yieldToBrowser:()=>new Promise(resolve=>setImmediate(resolve)),ensureConditionDetails:async()=>{},projectPublicCoastlines:value=>value,
  renderZones(){throw Error('Unexpected geometry replacement in caller fixture');},installFlowArrows:()=>({refresh(){}}),
 };
 context.mapForecast=createMapForecastController({loadHour:()=>{throw Error('NO_FORECAST_LOAD_EXPECTED');},onCommit:()=>{context.mapScores.clear();if(context.coreViewReady)context.refreshMapDisplay();}});
 context.coreViewReady=false;context.mapForecast.configure({generation:'A',times:[h0],live:{time:h0,conditions:old}});context.coreViewReady=true;
 const code=[fragment(callerSource,'function mapFrame()','function mapConditions()'),
  fragment(callerSource,'function mapScoreFor(zone)','function mapDisplayFor(zone)'),
  fragment(callerSource,'function configureMapTimeline()','let publicTripEvidenceRuntime'),
  fragment(callerSource,'function currentScoreFor(zone)','function nationalRankingRow(row)'),
  fragment(callerSource,'async function reevaluateConditionRuntime()','function setMode('),
  fragment(callerSource,'async function resumePublicView()','const handlePublicPageShow')].join('\n');
 vm.createContext(context);vm.runInContext(code,context,{filename:'ROOT-normal-map-generation-callers.js'});
 await context.reevaluateConditionRuntime();
 const selectionChanged=changed||referenceAt!==h0||!available;
 const expected=!available?null:selectionChanged?79:8;
 assert.equal(paints[0],expected,'The synchronous configure/onCommit paint must not use an old-generation cache');
 assert.ok(paints.every(value=>value===expected),'No yielded frame may pair a fresh committed label with stale colors');
 if(selectionChanged){assert.equal(context.state.forecastGroups.size,0);assert.ok(context.state.forecastRenderId>=1);}
 else assert.equal(context.state.conditions.syntheticScore,initialScore,'Same-hour refresh keeps already loaded live details');
 context.mapForecast.destroy();cases++;
}
await checkCaller({changed:true});
await checkCaller({changed:false});
await checkCaller({changed:false,referenceAt:h0});
await checkCaller({changed:false,available:false});
const savedL=globalThis.L;
try{
 const invalidBounds={isValid:()=>false};
 globalThis.L={geoJSON:()=>({getBounds:()=>invalidBounds}),layerGroup:()=>({cleared:false,addTo(map){map.layers.add(this);return this;},clearLayers(){this.cleared=true;}})};
 const map={layers:new Set(),panes:{},getZoom:()=>7,getPane(name){return this.panes[name];},createPane(name){return this.panes[name]={style:{}};},
  on(){},off(){},removeLayer(layer){this.layers.delete(layer);},hasLayer(layer){return this.layers.has(layer);}};
 const unrelated={};map.layers.add(unrelated);
 const oldLayer=renderZones(map,{features:[]},()=>null,()=>{}, {fitBounds:false});
 const freshLayer=renderZones(map,{features:[]},()=>null,()=>{}, {fitBounds:false});
 assert.equal(map.hasLayer(oldLayer.lineLayer),true);assert.equal(map.hasLayer(freshLayer.lineLayer),true);
 oldLayer.destroy();
 assert.equal(map.hasLayer(oldLayer.lineLayer),false,'Destroyed generation must remove its own normal Leaflet lineLayer');
 assert.equal(oldLayer.lineLayer.cleared,true);assert.equal(map.hasLayer(freshLayer.lineLayer),true);
 assert.equal(map.hasLayer(unrelated),true,'Do not clear other generations or unrelated map layers');
 freshLayer.destroy();assert.equal(map.layers.size,1);cases++;
}finally{globalThis.L=savedL;}



// Returning from a selected hour to Now hydrates the selected zone only via
// the existing normal detail reader; a future or unavailable frame never does.
const callbackSource=fragment(app,'function handleMapForecastCommit(frame)','function mapFrame()');
let detailReads=0,callbackPaints=0;
const commitContext={mapScores:new Map(),coreViewReady:true,state:{selectedZone:{id:'Z'}},
  refreshMapDisplay(){callbackPaints++;},ensureConditionDetails:async()=>{detailReads++;},console};
vm.createContext(commitContext);vm.runInContext(callbackSource,commitContext);
for(const frame of [{isNow:false},null])commitContext.handleMapForecastCommit(frame);
assert.equal(detailReads,0);commitContext.handleMapForecastCommit({isNow:true});await Promise.resolve();assert.equal(detailReads,1);
commitContext.state.selectedZone=null;commitContext.handleMapForecastCommit({isNow:true});assert.equal(detailReads,1);
commitContext.coreViewReady=false;const priorPaints=callbackPaints;commitContext.handleMapForecastCommit({isNow:true});assert.equal(callbackPaints,priorPaints);
assert.match(app,/onCommit:handleMapForecastCommit/);cases++;
globalThis.fetch=savedFetch;
console.log(JSON.stringify({status:'PASS_MAP_TIMELINE_NORMAL_GENERATION_AND_LIFECYCLE',cases,normalAppCallers:true,normalRenderZones:true,networkCalls:0}));
