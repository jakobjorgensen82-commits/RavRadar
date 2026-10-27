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



// Every committed map hour keeps the selected zone's full forecast hydrated
// through the existing normal reader; null/unready/closed views never do.
const callbackSource=fragment(app,'function handleMapForecastCommit(frame)','function mapFrame()');
let detailReads=0,callbackPaints=0;
const commitContext={mapScores:new Map(),coreViewReady:true,state:{selectedZone:{id:'Z'}},
  refreshMapDisplay(){callbackPaints++;},ensureConditionDetails:async()=>{detailReads++;},console};
vm.createContext(commitContext);vm.runInContext(callbackSource,commitContext);
commitContext.handleMapForecastCommit({isNow:false});assert.equal(detailReads,1);
commitContext.handleMapForecastCommit(null);assert.equal(detailReads,1);
commitContext.handleMapForecastCommit({isNow:true});await Promise.resolve();assert.equal(detailReads,2);
commitContext.state.selectedZone=null;commitContext.handleMapForecastCommit({isNow:true});assert.equal(detailReads,2);
commitContext.coreViewReady=false;const priorPaints=callbackPaints;commitContext.handleMapForecastCommit({isNow:true});assert.equal(callbackPaints,priorPaints);
assert.match(app,/onCommit:handleMapForecastCommit/);cases++;
// Reuse the existing full-URL UI cache identity, without a model/version bump.
// An installed worker already caches these old581 URLs. Every changed asset
// in the HTML -> bootstrap -> app -> renderer chain must miss that old cache.
const html=read('index.html'),bootstrap=read('bootstrap.js'),sw=read('service-worker.js');
const root='https://ravradar.invalid/';
const cssUrl=html.match(/href="(style\.css\?[^\"]+)"/)?.[1];
const bootstrapUrl=html.match(/src="(bootstrap\.js\?[^\"]+)"/)?.[1];
const appUrl=bootstrap.match(/import\("([^\"]*app\.js\?[^\"]+)"\)/)?.[1];
const rendererUrl=app.match(/from '([^']*map-timeline\.js\?[^']+)'/)?.[1];
const infoPanelUrl=app.match(/from "([^"]*ui\/info-panel\.js\?[^"]+)"/)?.[1];
const version=JSON.parse(read('package.json')).version;
const oldKeys=new Map([
 `style.css?v=${version}&ui=account-20261006`,
 `bootstrap.js?v=${version}&copy=footer-20261005&ui=account-20261006`,
 `app.js?v=${version}&copy=footer-20261005&ui=account-20261006`,
 `js/ui/map-timeline.js?v=${version}`,
 // The actually delivered timeline keys must also miss after this caller fix.
 `bootstrap.js?v=${version}&copy=footer-20261005&ui=account-timeline-20261018`,
 `app.js?v=${version}&copy=footer-20261005&ui=account-timeline-20261018`,
 // The actually deployed590 callers and panel must also miss their old URLs.
 `bootstrap.js?v=${version}&copy=footer-20261005&ui=forecast-share-20261024`,
 `app.js?v=${version}&copy=footer-20261005&ui=forecast-share-20261024`,
 `js/ui/info-panel.js?v=${version}`,
].map(key=>[new URL(key,root).href,{old:true}]));
const fetched=[];
const cacheContext={CACHE:'synthetic-installed581',caches:{open:async()=>({
 match:async request=>oldKeys.get(request),put:(request,response)=>oldKeys.set(request,response),
})},fetch:async request=>{fetched.push(request);return{ok:true,clone:()=>({fresh:true})};}};
vm.createContext(cacheContext);
vm.runInContext(fragment(sw,'async function cacheFirst(request)','async function staleWhileRevalidate(request)'),cacheContext);
for(const value of [cssUrl,bootstrapUrl,appUrl,rendererUrl,infoPanelUrl]){
 assert.ok(value,'Changed UI asset must have an explicit URL');
 const url=new URL(value,root);
 assert.equal(url.searchParams.get('v'),version);
 const expectedUi=url.pathname.endsWith('/js/ui/map-timeline.js')?'timeline-days-20261018'
   :url.pathname.endsWith('/style.css')?'forecast-share-20261024':'zone-panels-20261027';
 assert.equal(url.searchParams.get('ui'),expectedUi);
 assert.equal(oldKeys.has(url.href),false,'A changed asset must not reuse an installed581 response');
 await cacheContext.cacheFirst(url.href);
 assert.equal(oldKeys.get(url.href).fresh,true);
}
assert.equal(fetched.length,5,'The actual worker cacheFirst fetches every changed UI asset exactly once');
assert.match(sw,/event\.request\.mode==='navigate'.*networkFirst\(event\.request\)/);cases++;

// The new feature also busts the actually retained586 data-service request.
// Run the real worker function again with an independent old586 cache; the
// original timeline/original-cache checks above remain in force.
const dataServiceUrl=app.match(/from "([^"]*services\/data-service\.js\?[^"]+)"/)?.[1];
const shareUiUrl=app.match(/from '([^']*ui\/forecast-share\.js\?[^']+)'/)?.[1];
const shareContractUrl=app.match(/from '([^']*services\/forecast-share-contract\.js\?[^']+)'/)?.[1];
const dataSource=read('js/services/data-service.js'),shareUiSource=read('js/ui/forecast-share.js');
const dataContractUrl=dataSource.match(/from '([^']*forecast-share-contract\.js\?[^']+)'/)?.[1];
const uiContractUrl=shareUiSource.match(/from '([^']*forecast-share-contract\.js\?[^']+)'/)?.[1];
assert.ok(dataServiceUrl&&shareUiUrl&&shareContractUrl&&dataContractUrl&&uiContractUrl);
const contractIdentity=new URL(shareContractUrl,root).href;
assert.equal(new URL(dataContractUrl,new URL(dataServiceUrl,root)).href,contractIdentity);
assert.equal(new URL(uiContractUrl,new URL(shareUiUrl,root)).href,contractIdentity,
  'App, data reader and UI must import the same full-URL contract module');
const retained586=new Map([
 'style.css?v='+version+'&ui=account-timeline-20261018',
 'bootstrap.js?v='+version+'&copy=footer-20261005&ui=account-timeline-now-20261018',
 'app.js?v='+version+'&copy=footer-20261005&ui=account-timeline-now-20261018',
 'js/services/data-service.js?v='+version,
].map(key=>[new URL(key,root).href,{old:true}]));
const shareFetches=[],shareCacheContext={CACHE:'synthetic-installed586',caches:{open:async()=>({
 match:async request=>retained586.get(request),put:(request,response)=>retained586.set(request,response),
})},fetch:async request=>{shareFetches.push(request);return{ok:true,clone:()=>({fresh:true})};}};
vm.createContext(shareCacheContext);
vm.runInContext(fragment(sw,'async function cacheFirst(request)','async function staleWhileRevalidate(request)'),shareCacheContext);
for(const value of [cssUrl,bootstrapUrl,appUrl,dataServiceUrl,shareUiUrl,shareContractUrl]){
 const url=new URL(value,root);
 assert.equal(url.searchParams.get('v'),version);
 assert.equal(url.searchParams.get('ui'),/\/(?:bootstrap|app)\.js$/.test(url.pathname)
   ?'zone-panels-20261027':'forecast-share-20261024');
 assert.equal(retained586.has(url.href),false,'No changed/new share leaf may reuse the retained586 response');
 await shareCacheContext.cacheFirst(url.href);await shareCacheContext.cacheFirst(url.href);
 assert.equal(retained586.get(url.href).fresh,true);
}
assert.equal(shareFetches.length,6,'Each full URL is fetched once, then normally reused');
assert.equal(new Set(shareFetches).size,6);cases++;

// A real mode handler counts intent even if the user returns to the initial
// mode. Programmatic bootstrap setMode remains outside the intent mechanism.
const modeHandler=app.match(/button\.addEventListener\("click",(\(\)=>\{noteForecastShareUserIntent\(\);setMode\(button\.dataset\.mode\);\})\)/)?.[1];
const startupOwner=app.match(/isStillRequested:(\(\)=>forecastShareUserIntent===0&&!state\.selectedZone)/)?.[1];
assert.ok(modeHandler&&startupOwner);
const intentModes=[],intentContext={forecastShareUserIntent:0,forecastShareControlCleanup:()=>{},
 state:{selectedZone:null},button:{dataset:{mode:'beach'}},setMode:mode=>intentModes.push(mode)};
vm.createContext(intentContext);
vm.runInContext(fragment(app,'function noteForecastShareUserIntent()','const mapTimelineHost'),intentContext);
const handler=vm.runInContext('('+modeHandler+')',intentContext),ownsStartup=vm.runInContext('('+startupOwner+')',intentContext);
assert.equal(ownsStartup(),true);
handler();intentContext.button.dataset.mode='waders';handler();
assert.deepEqual(intentModes,['beach','waders']);assert.equal(intentContext.forecastShareUserIntent,2);
assert.equal(ownsStartup(),false,'Returning to the same mode cannot resurrect the old startup link');
assert.doesNotMatch(fragment(app,'function setMode(mode','async function resumePublicView()'),/noteForecastShareUserIntent/);
cases++;

globalThis.fetch=savedFetch;
console.log(JSON.stringify({status:'PASS_MAP_TIMELINE_NORMAL_GENERATION_AND_LIFECYCLE',cases,normalAppCallers:true,normalRenderZones:true,networkCalls:0}));
