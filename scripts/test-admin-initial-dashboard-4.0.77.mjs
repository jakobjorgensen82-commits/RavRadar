import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
const admin=fs.readFileSync('js/ui/admin-dashboard.js','utf8');
const site=fs.readFileSync('js/services/site-function-test-service.js','utf8');
const store=fs.readFileSync('js/services/admin-document-store.js','utf8');
const html=fs.readFileSync('admin.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
function ok(v,m){if(!v)throw new Error(m)}
ok(/render\(\);\r?\n }catch\(error\)/.test(admin),'Dashboard renderes ikke straks efter godkendt adgang.');
ok(admin.includes("document.body.dataset.adminReady='true'"),'Admin mangler entydig ready-markør.');
ok(admin.includes('SITE_TEST_MODE'),'Admin mangler særskilt testtilstand.');
ok(admin.includes('ravradar:test-permission-denied'),'Rettighedsafvisninger kan ikke opsamles af sitetesten.');
ok(site.includes("dataset?.adminReady==='true'"),'Sitetesten venter ikke på færdig admininitialisering.');
ok(site.includes("win.alert=message=>dialogs.push"),'Sitetesten opsamler ikke browserdialoger.');
ok(site.includes('Offentlig side, admin, service worker og version.json'),'Versionskontrollen bruger ikke de faktiske runtimekilder.');
ok(store.includes("keys=['water-level-station-routing','direction-reviews','coastline-overrides']"),'Den første lagerkontrol følger ikke de aktive centrale admindokumenter.');
ok(html.includes(pkg.version),`admin.html er ikke opdateret til ${pkg.version}.`);
console.log('OK: Oversigt renderes ved første åbning, og sitetesten venter på færdig admin uden popup-dialoger.');

// Execute the actual normal bootstrap/read/retry functions. All remote reads
// are deferred fixtures; neither storage writes nor another user's login exist.
const from=admin.indexOf('function loadVerifiedPublicRuntime(){');
const to=admin.indexOf('\nconst TAB_PERMISSIONS=');
assert(from>=0&&to>from);
const controller=admin.slice(from,to);
const initial=admin.match(/^const state=([^\r\n]+);$/m);
assert(initial);
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function settle(){for(let n=0;n<5;n++)await tick();}

function normalCaller({coastlineRead=null,initialPublicReject=true}={}){
 let epoch=1,owner='synthetic-owner',renders=0,counterMounts=0,manifestReads=0;
 let publicRead=deferred(),connectionRead=deferred(),storageRead=deferred();
 let rejectPublic=initialPublicReject,editorMounts=0,editorConfig=null;
 const content={innerHTML:''};
 const nodes=new Map();
 for(const id of ['adminConnectionState','adminConnectionDetail','adminStorageState','adminZoneCount','adminZoneDetail',
  'adminHealthState','adminDocumentStatusRows','adminModelStatus','adminScoreAvailability','retryAdminPublicRuntime','adminSupabaseHeader','retryAdminCoastlineDrafts']){
  nodes.set(id,{textContent:'',innerHTML:'',className:'',disabled:false,classList:{toggle(){}}});
 }
 const document={querySelector:selector=>nodes.get(selector.slice(1))||null,
  body:{dataset:{},classList:{add(){},remove(){}}}};
 const query=document.querySelector;document.querySelector=selector=>{
  if(selector==='#adminCoastlineWaiting'&&content.innerHTML.includes('id="adminCoastlineWaiting"'))return content;
  if(selector==='#adminZonesWaiting'&&content.innerHTML.includes('id="adminZonesWaiting"'))return{dataset:{registryState:content.innerHTML.match(/data-registry-state="([^"]+)"/)?.[1]}};
  return query(selector);
 };
 const manifest={fixture:'verified-manifest'},conditions={available:true,zones:{one:{},two:{}},ravScoreRuntime:{fixture:true}},
  modelStartup={available:true,fixture:'original-model-startup',ravScoreRuntime:{fixture:true}},
  zones={coastalParts:{zones:{one:{},two:{}}}};
 const memory=new Map(),events=[];
 const context={document,content,renderCoastlineEditor:(_content,config)=>{editorMounts++;editorConfig=config;content.innerHTML='synthetic-editor';},guard:()=>true,console:{error(){},warn(){}},Promise,Error,Date,JSON,Boolean,Object,Array,
  VERSION:'4.0.593',DIRECTION_REVIEW_KEY:'test-directions',COASTLINE_DRAFT_KEY:'test-coastline',WATER_ROUTING_KEY:'test-water',
  verifiedPublicRuntimePromise:null,
  authIdentityEpoch:()=>epoch,currentSession:()=>({access_token:'synthetic-only',user:{id:owner}}),authEnabled:()=>true,
  requireFreshSession:async()=>{},myAccess:async()=>({profile:{id:owner,is_active:true,role:'owner'},permissions:new Set()}),
  hasPermission:access=>access?.profile?.is_active===true&&access.profile.role==='owner',
  testConnection:()=>connectionRead.promise,adminStorageHealth:()=>storageRead.promise,
  loadDataManifest:async()=>{manifestReads++;return manifest;},
  loadConditions:async()=>{await publicRead.promise;if(rejectPublic)throw Error('synthetic public read rejection');return conditions;},
  loadPublicStartupSnapshot:async()=>{await publicRead.promise;if(rejectPublic)throw Error('synthetic original startup rejection');return modelStartup;},
  loadZones:async()=>zones,
  loadZoneRegistry:async()=>({all:[{},{}],active:[{},{}],legacy:[],collection:{features:[{},{}]},counts:{registered:2,active:2,legacy:0}}),
  loadAdminDocument:async(key,fallback)=>key==='coastline-overrides'&&coastlineRead?coastlineRead():key==='weather-health'?{status:'good'}:fallback,
  readAdminDocumentNow:async key=>{assert.equal(key,'coastline-overrides');return {payload:coastlineRead?await coastlineRead():{schemaVersion:4,overrides:{},partOwnership:{},disabledParts:{}}};},
  getJson:async()=>({schemaVersion:1,zones:{}}),decodeRuntimeDiagnosticsEnvelope:async()=>null,
  directionReviews:()=>({}),setLocalJsonSafely:()=>true,
  localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},
  resolveAdminActivePublicRavScore:input=>{assert.equal(input.manifest,manifest);assert.equal(input.conditions,modelStartup);return{statusDa:'synthetic verified model'};},
  scoreAvailabilityCard:()=>context.state.publicLoadStatus==='ready'?'synthetic-verified':'synthetic-unavailable',
  esc:value=>String(value??''),
  queueAdminDocumentSave:()=>assert.fail('bootstrap may not write central documents'),
  saveAdminDocumentNow:()=>assert.fail('bootstrap may not write central documents'),
  window:{dispatchEvent:event=>events.push(event.type)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},
  location:{replace:()=>assert.fail('synthetic owner must remain authenticated')},applyTabPermissions:()=>{},
 };
 context.render=()=>{renders++;counterMounts++;context.ops?.update?.();};
 runInNewContext(initial[0].replace('const state=','globalThis.state='),context);
 runInNewContext(controller+'\nglobalThis.ops={boot,activePublicRavScoreState,'
  +'update:typeof updateAdminOverviewReadiness==="function"?updateAdminOverviewReadiness:null,'
  +'view:typeof adminOverviewReadiness==="function"?adminOverviewReadiness:null,'
  +'connections:typeof refreshAdminOverviewConnections==="function"?refreshAdminOverviewConnections:null,'
  +'publicRuntime:typeof refreshAdminPublicRuntime==="function"?refreshAdminPublicRuntime:null,'
  +'retry:typeof retryAdminPublicRuntime==="function"?retryAdminPublicRuntime:null,'
  +'coastline:typeof refreshAdminCoastlineDrafts==="function"?refreshAdminCoastlineDrafts:null};',context);
 const editorStart=admin.indexOf('async function saveCoastlineChanges(');
 const editorEnd=admin.indexOf('\nfunction renderZones(',editorStart);
 assert(editorStart>=0&&editorEnd>editorStart);
 runInNewContext(admin.slice(editorStart,editorEnd)+'\nglobalThis.ops.editor=renderAdminCoastlineEditor;globalThis.ops.saveCoastline=saveCoastlineChanges;',context);
 return{context,nodes,events,manifest,conditions,modelStartup,content,
  editor:()=>({mounts:editorMounts,config:editorConfig}),
  allowFailedNormalSave:()=>{context.saveAdminDocumentNow=async()=>({ok:false,error:'synthetic central rejection'});},
  stats:()=>({renders,counterMounts,manifestReads}),
  releaseConnections:(ok=true)=>{connectionRead.resolve({ok});storageRead.resolve({ok,documents:{
   'water-level-station-routing':{ok,exists:true,version:1},'direction-reviews':{ok,exists:true,version:1},'coastline-overrides':{ok,exists:true,version:1}}});},
  releasePublic:()=>publicRead.resolve(),
  nextPublic:(reject=false)=>{publicRead=deferred();rejectPublic=reject;},
  nextConnections:()=>{connectionRead=deferred();storageRead=deferred();},
  switchIdentity:()=>{epoch++;owner='synthetic-other-owner';},
 };
}

const run=normalCaller(),boot=run.context.ops.boot();
await settle();
assert.equal(run.stats().renders,1,'normal authenticated bootstrap must reach its actual first render');
// First resolve independent protected reads, while the public package is pending.
run.releaseConnections();await settle();run.releasePublic();
let bootstrapError=null;try{await boot;}catch(error){bootstrapError=error;}
assert.equal(bootstrapError,null,'normal public read rejection must settle safely instead of stranding the first dashboard render');
assert.equal(run.context.state.publicLoadStatus,'failed');
assert.equal(run.nodes.get('adminConnectionState').textContent,'TILSLUTTET');
assert.equal(run.nodes.get('adminStorageState').textContent,'KLAR');
assert.equal(run.nodes.get('adminZoneCount').textContent,'—/2','a verified registry is independent of failed public weather');
assert.equal(run.context.ops.activePublicRavScoreState().ok,false,'failed public read may not advertise a READY model');
assert(run.nodes.get('adminModelStatus').innerHTML.includes('BLOKERET'));
assert.equal(run.context.document.body.dataset.adminReady,'true','failed data settles initialization; it is not a healthy-data claim');
assert.deepEqual(run.stats(),{renders:1,counterMounts:1,manifestReads:1});

// One real normal retry discards the failed locator and reuses one in-flight
// verification for both public overview and priority water-station callers.
run.nextPublic();run.context.ops.retry();await settle();
assert.equal(run.context.ops.view().connectionLabel,'TILSLUTTET');
assert.equal(run.context.ops.activePublicRavScoreState().ok,false);
assert.equal(run.context.state.publicLoadStatus,'pending');
run.releasePublic();await settle();
assert.equal(run.context.state.publicLoadStatus,'ready');
assert.equal(run.context.state.conditions,run.conditions,'overview retains the selected current-hour display');
assert.equal(run.context.state.publicModelStartup,run.modelStartup,'model validation keeps the separately verified original');
assert.notEqual(run.context.state.publicModelStartup,run.context.state.conditions);
assert.equal(run.nodes.get('adminZoneCount').textContent,'2/2');
assert.equal(run.context.state.waterStationsReady,true,'normal retry retains the verified public coastal prerequisite');
assert.equal(run.context.ops.activePublicRavScoreState().ok,true);
assert.deepEqual(run.stats(),{renders:1,counterMounts:1,manifestReads:2},'partial completion never remounts the ten-shard counter');

// Unknown is neutral before any measured result. A real connection/storage
// failure is distinct, and a later ordinary read may recover it.
const pending=normalCaller();
pending.context.state.access={profile:{id:'synthetic-owner',is_active:true,role:'owner'},permissions:new Set()};
assert.equal(pending.context.ops.view().connectionLabel,'AFVENTER');
assert.equal(pending.context.ops.view().storageLabel,'AFVENTER');
assert.equal(pending.context.ops.view().zoneLabel,'—/—');
assert(!pending.context.ops.view().documentRows.includes('✕ Fejl'));
const failedConnections=pending.context.ops.connections();pending.releaseConnections(false);await failedConnections;
assert.equal(pending.context.ops.view().connectionLabel,'IKKE BEKRÆFTET');
assert.equal(pending.context.ops.view().storageLabel,'IKKE BEKRÆFTET');
assert(pending.context.ops.view().documentRows.includes('✕ Fejl'));
pending.nextConnections();const recoveredConnections=pending.context.ops.connections();pending.releaseConnections();await recoveredConnections;
assert.equal(pending.context.ops.view().connectionLabel,'TILSLUTTET');

// A response arriving on another tab cannot replace a user's editing view.
const connectionBefore='navigation-sentinel';run.nodes.get('adminConnectionState').textContent=connectionBefore;
run.context.state.tab='users';run.nextConnections();const background=run.context.ops.connections();
run.releaseConnections();await background;
assert.equal(run.nodes.get('adminConnectionState').textContent,connectionBefore);
assert.equal(run.stats().renders,1);

// A later identity invalidates both pending protected results and pending
// public updates, even when the old responses themselves are valid.
run.context.state.tab='dashboard';run.nextConnections();const staleConnection=run.context.ops.connections();
run.nextPublic();run.context.ops.retry();await settle();
assert(run.nodes.get('adminModelStatus').innerHTML.includes('AFVENTER VERIFIKATION'),'a refresh of previously valid data is pending, not a new failure');
run.switchIdentity();
const priorConnection=run.context.state.connection,priorPublic=run.context.state.publicManifest;
run.nodes.get('adminConnectionState').textContent='identity-sentinel';
run.releaseConnections();run.releasePublic();await staleConnection;await settle();
assert.equal(run.context.state.connection,priorConnection);
assert.equal(run.context.state.publicManifest,priorPublic);
assert.equal(run.context.state.publicLoadStatus,'pending','a stale successful response may not publish READY');
assert.equal(run.nodes.get('adminConnectionState').textContent,'identity-sentinel');
assert.equal(run.stats().renders,1);

assert(admin.includes("document.querySelector('#retryAdminPublicRuntime').onclick=retryAdminPublicRuntime"));
for(const id of run.nodes.keys())if(id!=='adminSupabaseHeader'&&id!=='retryAdminCoastlineDrafts')assert(admin.includes('id="'+id+'"'),'normal markup must own '+id);
console.log('OK: Normal bootstrap isolates public failure, retries through the same verified caller, and rejects stale navigation/identity without remounting the trip counter.');

// Reproduce the normal late-preload loss, without a hosted read or write.
// The real editor wrapper hands its document to its real onSave callback.
const staleDraft={schemaVersion:4,overrides:{},partOwnership:{},disabledParts:{}};
let lateRead=deferred();const racing=normalCaller({coastlineRead:()=>lateRead.promise,initialPublicReject:false});
const racingBoot=racing.context.ops.boot();await settle();
racing.context.state.tab='coastlineEditor';racing.context.ops.editor();
if(racing.editor().mounts){
 racing.allowFailedNormalSave();
 const saved={schemaVersion:4,overrides:{},partOwnership:{syntheticPart:{targetZoneId:'synthetic-zone'}},disabledParts:{}};
 await racing.editor().config.onSave(saved,null);
 lateRead.resolve(staleDraft);racing.releaseConnections();racing.releasePublic();await racingBoot;
 assert.equal(racing.context.state.coastlineDrafts,saved,'late bootstrap must not replace a draft secured by the real normal save caller');
}

assert.equal(racing.editor().mounts,0,'the editor must not capture an uninitialized document while its central read is pending');
assert(racing.content.innerHTML.includes('Indlæser'));
// Both a verified public package and a verified registry are also required.
racing.releaseConnections();racing.releasePublic();await settle();
assert.equal(racing.context.state.publicLoadStatus,'ready');
assert.equal(racing.editor().mounts,0);
lateRead.reject(Error('synthetic central read rejection'));await racingBoot;
assert.equal(racing.context.state.coastlineDraftsStatus,'failed');
assert(racing.content.innerHTML.includes('kunne ikke læses'));
assert.equal(racing.context.localStorage.getItem('test-coastline'),null,'a failed read may not overwrite the existing local draft');
lateRead=deferred();racing.nodes.get('retryAdminCoastlineDrafts').onclick();await settle();
assert.equal(racing.context.state.coastlineDraftsStatus,'pending');
const currentDraft={schemaVersion:4,overrides:{},partOwnership:{},disabledParts:{}};
lateRead.resolve(currentDraft);await settle();
assert.equal(racing.context.state.coastlineDraftsStatus,'ready');
assert.equal(racing.editor().mounts,1,'the waiting placeholder becomes one initialized editor, never a remount of edited DOM');
assert.equal(racing.editor().config.document,currentDraft);
racing.allowFailedNormalSave();
const userDraft={schemaVersion:4,overrides:{},partOwnership:{syntheticPart:{targetZoneId:'synthetic-zone'}},disabledParts:{}};
const failedSave=await racing.editor().config.onSave(userDraft,null);assert.equal(failedSave.ok,false);
await racing.context.ops.coastline();await settle();
assert.equal(racing.context.state.coastlineDrafts,userDraft);
assert.deepEqual(JSON.parse(racing.context.localStorage.getItem('test-coastline')),userDraft);
assert.equal(racing.editor().mounts,1,'unrelated or repeated bootstrap completion cannot replace a user draft');
const staleRead=deferred(),staleEditor=normalCaller({coastlineRead:()=>staleRead.promise});
const staleEditorBoot=staleEditor.context.ops.boot();await settle();staleEditor.context.state.tab='coastlineEditor';staleEditor.context.ops.editor();
staleEditor.content.innerHTML='identity-editor-sentinel';staleEditor.switchIdentity();staleRead.resolve(currentDraft);
staleEditor.releaseConnections();staleEditor.releasePublic();await staleEditorBoot;
assert.equal(staleEditor.context.state.coastlineDraftsStatus,'pending');
assert.equal(staleEditor.context.localStorage.getItem('test-coastline'),null);
assert.equal(staleEditor.content.innerHTML,'identity-editor-sentinel');
assert.equal(staleEditor.editor().mounts,0);
console.log('OK: A first-opening coastline read gate prevents late preload draft loss; strict read failure is retryable and stale identity cannot mount or overwrite the editor.');

const unknownEditor=normalCaller({coastlineRead:async()=>null,initialPublicReject:false});
const unknownBoot=unknownEditor.context.ops.boot();unknownEditor.releaseConnections();unknownEditor.releasePublic();await unknownBoot;
unknownEditor.context.state.tab='coastlineEditor';unknownEditor.context.ops.editor();
assert.equal(unknownEditor.context.state.coastlineDraftsStatus,'failed','an absent central payload is unknown, never a verified editable draft');
assert.equal(unknownEditor.editor().mounts,0);
assert.equal(unknownEditor.context.localStorage.getItem('test-coastline'),null);

assert(admin.includes('id="retryAdminCoastlineDrafts"'),'the new editor retry owns its actual markup');

// Exercise the actual view renderers as well as the normal bootstrap. The
// controller-only render stub above cannot observe stale non-metric content.
function actualView(run,name,endMarker){
 const start=admin.indexOf('function '+name+'(){'),end=admin.indexOf(endMarker,start);
 assert(start>=0&&end>start,name+' actual source');
 runInNewContext(admin.slice(start,end)+'\nglobalThis.actualView='+name+';',run.context);
 return run.context.actualView;
}
async function lateAdministratorAlarm(){
 const x=normalCaller({initialPublicReject:false}),health=deferred();
 const read=x.context.loadAdminDocument;
 x.context.loadAdminDocument=(key,fallback)=>key==='weather-health'?health.promise:read(key,fallback);
 for(const key of ['openHandbookReview','retestSupabase','adminAlarmStatus'])x.nodes.set(key,{onclick:null,textContent:''});
 let renders=0,mounts=0;
 Object.assign(x.context,{invalidateAdminTripCount(){},adminTripCountCard:()=>'',mountAdminTripCount(){mounts++;},activeModelUnavailableCard:()=>'<p>model pending</p>'});
 const view=actualView(x,'renderDashboard','\nfunction publicSourceBadge(');
 x.context.render=()=>{renders++;view();};
 const task=x.context.ops.boot();await settle();
 assert(x.content.innerHTML.includes('Administratoralarm er endnu ikke bekræftet.'),'an unresolved first health read must remain neutral');
 assert(!x.content.innerHTML.includes('✓ Ingen ny administratoralarm nødvendig.'),'pending health cannot assert no alarm');
 health.resolve({status:'bad',alerts:{shouldNotifyAdministrator:true}});
 x.releaseConnections();x.releasePublic();await task;
 assert.equal(x.nodes.get('adminHealthState').textContent,'BAD');
 assert(x.nodes.get('adminAlarmStatus').textContent.includes('⚠️ DMI har været ustabilt'),'late real health updates the existing alarm card');
 assert.equal(renders,1,'late health must not remount dashboard or another open editor');assert.equal(mounts,1);
 x.context.state.health={status:'good',alerts:{shouldNotifyAdministrator:false}};x.context.ops.update();
 assert.equal(x.nodes.get('adminAlarmStatus').textContent,'✓ Ingen ny administratoralarm nødvendig.');
 x.context.state.health={status:'good'};x.context.ops.update();
 assert.equal(x.nodes.get('adminAlarmStatus').textContent,'Administratoralarm er endnu ikke bekræftet.','an absent alarm verdict is not a negative verdict');
}
async function lateFirstZoneView(){
 const x=normalCaller({initialPublicReject:false}),registry=deferred();
 x.context.loadZoneRegistry=()=>registry.promise;
 for(const key of ['zoneSearch','zoneType'])x.nodes.set(key,{value:'',oninput:null,onchange:null});
 x.nodes.set('zoneList',{innerHTML:'',dataset:{}});x.conditions.zones.one.provider='synthetic-provider';
 const view=actualView(x,'renderZones','\nfunction directionReviews(');
 const task=x.context.ops.boot();await settle();x.context.state.tab='zones';view();
 assert(x.content.innerHTML.includes('id="adminZonesWaiting"'),'the first zone view waits for the real registry');
 assert.equal(x.nodes.get('zoneList').innerHTML,'','unconfirmed input must not mount an empty register');
 const features=[{properties:{id:'one',name:'synthetic-zone-name',coastType:'test'}}];
 registry.resolve({all:features,active:features,legacy:[],collection:{features},counts:{registered:1,active:1,legacy:0}});
 await settle();assert(x.nodes.get('zoneList').innerHTML.includes('Afventer kontrol'),'unverified weather must stay neutral in the real zone table');
 assert(!x.nodes.get('zoneList').innerHTML.includes('synthetic-provider'));
 x.nodes.get('zoneSearch').value='synthetic-zone-name';x.nodes.get('zoneSearch').oninput();
 x.releaseConnections();x.releasePublic();await task;
 assert.equal(x.context.state.zoneRegistryStatus,'ready');
 assert.equal(x.nodes.get('zoneSearch').value,'synthetic-zone-name','late verified public weather preserves a human filter');
 assert(x.nodes.get('zoneList').innerHTML.includes('synthetic-zone-name'),'late normal registry completion paints the waiting active zone view');
 assert(x.nodes.get('zoneList').innerHTML.includes('synthetic-provider'),'the actual verified weather source follows normal public completion');
 x.nodes.get('zoneSearch').value='synthetic-no-match';x.nodes.get('zoneSearch').oninput();
 const filtered=x.nodes.get('zoneList').innerHTML;x.context.ops.update();
 assert.equal(x.nodes.get('zoneList').innerHTML,filtered,'later partial completion preserves an already open filter');
 assert(!filtered.includes('synthetic-zone-name'));
 const retrying=normalCaller({initialPublicReject:false}),firstRegistry=deferred(),secondRegistry=deferred();
 let registryReads=0;
 retrying.context.loadZoneRegistry=()=>++registryReads===1?firstRegistry.promise:secondRegistry.promise;
 for(const key of ['zoneSearch','zoneType'])retrying.nodes.set(key,{value:'',oninput:null,onchange:null});
 retrying.nodes.set('zoneList',{innerHTML:'',dataset:{}});retrying.nodes.set('retryAdminZones',{onclick:null});
 const retryView=actualView(retrying,'renderZones','\nfunction directionReviews(');
 const retryTask=retrying.context.ops.boot();await settle();retrying.context.state.tab='zones';retryView();
 firstRegistry.reject(new Error('synthetic unavailable registry'));retrying.releaseConnections();retrying.releasePublic();await retryTask;
 assert(retrying.content.innerHTML.includes('Zoneregisteret kunne ikke bekræftes.'));
 assert.equal(retrying.nodes.get('zoneList').innerHTML,'','a failed registry cannot mount data');
 retrying.nodes.get('retryAdminZones').onclick();await settle();
 assert(retrying.content.innerHTML.includes('Zoneregisteret hentes…'));
 secondRegistry.resolve({all:features,active:features,legacy:[],collection:{features},counts:{registered:1,active:1,legacy:0}});await settle();
 assert.equal(registryReads,2);assert.equal(retrying.context.state.zoneRegistryStatus,'ready');
 assert(retrying.nodes.get('zoneList').innerHTML.includes('synthetic-zone-name'),'ordinary zone retry uses the same guarded registry caller');
 const stale=normalCaller({initialPublicReject:false}),lateRegistry=deferred();
 stale.context.loadZoneRegistry=()=>lateRegistry.promise;
 const staleView=actualView(stale,'renderZones','\nfunction directionReviews(');
 const staleTask=stale.context.ops.boot();await settle();stale.context.state.tab='zones';staleView();stale.switchIdentity();
 lateRegistry.resolve({all:features,active:features,legacy:[],collection:{features},counts:{registered:1,active:1,legacy:0}});
 stale.releaseConnections();stale.releasePublic();await staleTask;
 assert.equal(stale.context.state.zoneRegistryStatus,'pending');
 assert(stale.content.innerHTML.includes('id="adminZonesWaiting"'),'another identity must not complete the old zone view');
}
const viewRaces=await Promise.allSettled([lateAdministratorAlarm(),lateFirstZoneView()]);
const raceNames=['late administrator alarm','late first zone view'];
for(let i=0;i<viewRaces.length;i++)if(viewRaces[i].status==='rejected')console.error('FAIL: '+raceNames[i]+': '+viewRaces[i].reason.message);
const raceFailures=viewRaces.filter(x=>x.status==='rejected');
if(raceFailures.length)throw new AggregateError(raceFailures.map(x=>x.reason),'actual normal admin view races');
console.log('OK: Actual first alarm and zone renderers accept late normal results without global rerender, stale identity or filter/draft loss.');
