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
  loadAdminDocument:async(key,fallback,options)=>{const payload=key==='coastline-overrides'&&coastlineRead?await coastlineRead():key==='weather-health'?{status:'good'}:fallback;return options?.includeSource?{payload,source:'fallback'}:payload;},
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
 x.context.loadAdminDocument=(key,fallback,options)=>key==='weather-health'?health.promise:read(key,fallback,options);
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

async function ownerNoticeProbeOneClick(){
 const project='https://afqhhdrkjfjtpadntdzo.supabase.co';
 const providerId='10000000-0000-4000-8000-000000000001';
 function system({role='owner',testMode=false}={}){
  const x=normalCaller(),button={disabled:false,isConnected:true},status={textContent:''};
  const authListeners=new Set(),calls=[];
  x.context.state.tab='system';
  x.context.state.access={profile:{id:x.context.currentSession().user.id,is_active:true,role}};
  x.context.hasPermission=()=>true; // Even a full_admin may not send this owner's probe.
  x.context.location={origin:'https://ravradar.dk',pathname:'/admin.html'};
  x.context.PUBLIC_CONFIG={supabaseUrl:project,supabasePublishableKey:'synthetic-publishable'};
  x.context.SITE_TEST_MODE=testMode;
  x.context.AbortSignal=AbortSignal;
  x.context.requireFreshSession=async()=>x.context.currentSession();
  x.context.onAuthChange=listener=>{authListeners.add(listener);return()=>authListeners.delete(listener);};
  x.context.fetch=async(url,options)=>{
   assert.equal(url,project+'/functions/v1/inactivity-notice-owner-probe');
   assert.equal(options.method,'POST');
   assert.equal(options.body,undefined);
   assert.equal(options.redirect,'error');
   assert.equal(options.credentials,'omit');
   assert.equal(options.cache,'no-store');
   assert.equal(options.headers.apikey,'synthetic-publishable');
   assert.equal(options.headers.authorization,'Bearer synthetic-only');
   assert.equal(Object.keys(options.headers).sort().join(','),'apikey,authorization');
   calls.push(options);
   return reply.promise;
  };
  const reply=deferred();
  const grid={parentNode:x.content};
  x.content.isConnected=true;x.nodes.set('adminContent',x.content);
  x.nodes.set('adminSystemModelRead',{innerHTML:'',isConnected:true,parentNode:grid});
  x.nodes.set('exportDiag',{hidden:true,disabled:true,isConnected:true,addEventListener(_event,listener){this.onclick=listener;}});
  x.nodes.set('clearCaches',{});
  x.nodes.set('logoutAdmin',{});
  x.content.insertAdjacentHTML=(_where,html)=>{x.content.innerHTML+=html;};
  x.content.querySelector=selector=>selector==='#sendOwnerNoticeProbe'?button:status;
  const render=actualView(x,'renderSystem','\nfunction defaultVisitorPeriod(');
  render();
  return {x,button,status,reply,calls,render,authChanged(){
   x.switchIdentity();
   for(const listener of authListeners)listener();
  }};
 }

 for(const hidden of [system({role:'expert'}),system({testMode:true})]){
  assert(!hidden.x.content.innerHTML.includes('sendOwnerNoticeProbe'));
  assert.equal(hidden.button.onclick,undefined);
 }
 const owner=system();
 assert(owner.x.content.innerHTML.includes('Send én prøvemail'));
 assert.equal(owner.calls.length,0,'rendering must not invoke the probe');
 const sent=owner.button.onclick();
 await owner.button.onclick();
 assert.equal(owner.button.disabled,true);
 assert.equal(owner.calls.length,1);
 owner.reply.resolve(Response.json({state:'accepted',providerId}));
 await sent;
 assert(owner.status.textContent.includes(providerId));
 owner.authChanged();
 assert.equal(owner.status.textContent,'','owner change removes the private receipt');
 await owner.button.onclick();
 assert.equal(owner.calls.length,1);

 const preflight=system(),session=deferred();
 preflight.x.context.requireFreshSession=()=>session.promise;
 const pendingSession=preflight.button.onclick();
 preflight.authChanged();
 session.resolve(preflight.x.context.currentSession());
 await pendingSession;
 assert.equal(preflight.calls.length,0,'a changed owner cannot reach the request');

 const stale=system(),staleReceipt=deferred();
 const pendingReceipt=stale.button.onclick();
 await settle();
 stale.reply.resolve({status:200,json:()=>staleReceipt.promise});
 await settle();
 stale.authChanged();
 staleReceipt.resolve({state:'accepted',providerId});
 await pendingReceipt;
 assert.equal(stale.status.textContent,'');
 assert.equal(stale.calls.length,1);

 const rejected=system();
 const denied=rejected.button.onclick();
 rejected.reply.resolve(new Response('synthetic-provider-detail',{status:401}));
 await denied;
 assert.equal(rejected.status.textContent,'Afsendelsen kunne ikke bekræftes.');
 await rejected.button.onclick();
 assert.equal(rejected.calls.length,1,'a refused or ambiguous attempt is not retried');

 // Completing the public model must not restart an already in-flight owner probe.
 const late=system();late.x.nextPublic(false);
 late.x.context.resolveAdminActivePublicRavScore=()=>({labelDa:'synthetic completed model',statusDa:'synthetic verified',binding:{modelId:'synthetic',stateSchemaVersion:'synthetic'},diagnosticScoreProfile:{fixture:true}});
 late.x.context.render=()=>assert.fail('public completion cannot remount a mail-bearing System tab');
 late.x.context.download=()=>assert.fail('model completion may not export a report');
 const originalProbe=late.button.onclick,originalStatus=late.status;
 const inFlight=late.button.onclick();await settle();assert.equal(late.calls.length,1);
 const surface=late.x.nodes.get('adminSystemModelRead'),exportButton=late.x.nodes.get('exportDiag');
 if(late.x.content.innerHTML.includes('id="exportDiag"'))exportButton.onclick?.();assert.equal(exportButton.hidden,true);
 const publicTask=late.x.context.ops.publicRuntime();await settle();late.x.releasePublic();await publicTask;
 assert(surface.innerHTML.includes('synthetic completed model'),'System must receive its completed verified model');
 assert.equal(exportButton.hidden,false);assert.equal(exportButton.disabled,false);
 assert.equal(late.button.onclick,originalProbe);assert.equal(late.status,originalStatus);assert.equal(late.button.disabled,true);assert.equal(late.calls.length,1);
 late.reply.resolve(Response.json({state:'accepted',providerId}));await inFlight;
 await late.button.onclick();assert.equal(late.calls.length,1,'late model painting must preserve one-attempt mail ownership');

 // A real verification failure paints BLOCKED on the same model card. An
 // explicit normal retry resumes that card without recreating the mail probe.
 const failedModel=system();
 failedModel.x.context.resolveAdminActivePublicRavScore=()=>({labelDa:'synthetic retry model',statusDa:'synthetic verified',binding:{modelId:'synthetic',stateSchemaVersion:'synthetic'},diagnosticScoreProfile:{fixture:true}});
 failedModel.x.context.render=()=>assert.fail('failure/retry cannot remount a mail-bearing System tab');
 failedModel.x.context.download=()=>assert.fail('a failed model must not export diagnostics');
 const failedSurface=failedModel.x.nodes.get('adminSystemModelRead'),failedExport=failedModel.x.nodes.get('exportDiag'),failedProbe=failedModel.button.onclick;
 const pendingProbe=failedModel.button.onclick();await settle();assert.equal(failedModel.calls.length,1);
 const failedPublic=failedModel.x.context.ops.publicRuntime();await settle();failedModel.x.releasePublic();await failedPublic;
 assert(failedSurface.innerHTML.includes('BLOKERET'));assert(!failedSurface.innerHTML.includes('AFVENTER VERIFIKATION'));
 assert.equal(failedExport.hidden,true);assert.equal(failedExport.disabled,true);failedExport.onclick();
 assert.equal(failedModel.button.onclick,failedProbe);assert.equal(failedModel.button.disabled,true);assert.equal(failedModel.calls.length,1);
 failedModel.x.nextPublic(false);failedModel.x.context.ops.retry();await settle();
 assert(failedSurface.innerHTML.includes('AFVENTER VERIFIKATION'));assert.equal(failedExport.hidden,true);assert.equal(failedExport.disabled,true);
 failedModel.x.releasePublic();await settle();
 assert(failedSurface.innerHTML.includes('synthetic retry model'));assert.equal(failedExport.hidden,false);assert.equal(failedExport.disabled,false);
 assert.equal(failedModel.x.nodes.get('adminSystemModelRead'),failedSurface);assert.equal(failedModel.button.onclick,failedProbe);assert.equal(failedModel.button.disabled,true);assert.equal(failedModel.calls.length,1);
 failedModel.reply.resolve(Response.json({state:'accepted',providerId}));await pendingProbe;
 await failedModel.button.onclick();assert.equal(failedModel.calls.length,1);assert.equal(failedModel.x.stats().manifestReads,2);
}
await ownerNoticeProbeOneClick();
console.log('OK: Actual System owner action sends one fixed request and discards stale receipts.');

const serviceWorker=fs.readFileSync('service-worker.js','utf8');
const cacheSource=html.match(/src="(js\/ui\/admin-dashboard\.js\?[^"]+)"/)?.[1];
assert.ok(cacheSource?.endsWith('&probe=owner-notice-20261109&visits=scope-20261108'));
assert.equal(new URL(cacheSource,'https://synthetic.invalid/').searchParams.get('ui'),'admin-read-surfaces-20261112');
assert.ok(serviceWorker.includes('./'+cacheSource.replace('v='+pkg.version,'v=${APP_VERSION}')
  .replace('map=plain-map-v3-20261104','map=${COMPACT_MAP}')));
assert.match(serviceWorker,/const CACHE = [^\n]*-owner-notice-20261109/);


// A read-only tab opened during normal bootstrap must receive its completed
// inputs without a second request or a change to a human's current filter.
async function lateOpenWeatherTab({leave=false,identityChange=false,healthFirst=false}={}){
 const x=normalCaller({initialPublicReject:false}),health=deferred();
 const at='2026-11-11T00:00:00.000Z';x.manifest.generatedAt=at;x.conditions.generatedAt=at;
 const read=x.context.loadAdminDocument;
 x.context.loadAdminDocument=async(key,fallback,options)=>key==='weather-health'?health.promise:key==='runtime-diagnostics'?{fixture:true}:read(key,fallback,options);
 x.context.decodeRuntimeDiagnosticsEnvelope=async()=>({generatedAt:at,version:'4.0.593',acquisition:{requestsUsed:7}});
 for(const [key,value] of [['weatherZoneSearch',{value:'',oninput:null}],['weatherZoneRows',{innerHTML:''}],['downloadRuntime',{}],['moduleGuideBody',{hidden:true}]])x.nodes.set(key,value);
 x.context.publicSourceBadge=value=>String(value||'unknown');
 x.context.moduleGuide=()=>'<p>synthetic guide</p>';x.context.bindModuleGuide=()=>{};
 x.content.insertAdjacentHTML=()=>{x.nodes.get('moduleGuideBody').hidden=false;};
 const view=actualView(x,'renderWeather','\nfunction saveWaterRouting(');
 const task=x.context.ops.boot();await settle();x.context.state.tab='weather';view();
 assert(x.content.innerHTML.includes('Runtime kan ikke bekræftes'));
 x.nodes.get('weatherZoneSearch').value='one';
 if(leave)x.context.state.tab='waterStations';if(identityChange)x.switchIdentity();
 const measuredHealth={generatedAt:at,userData:{completeZones:2,totalZones:2,healthy:true}};
 if(healthFirst){health.resolve(measuredHealth);await settle();}
 x.releaseConnections();x.releasePublic();await settle();
 const before=x.content.innerHTML;
 health.resolve(measuredHealth);await task;
 if(leave||identityChange){assert.equal(x.content.innerHTML,before,'another tab or identity may not receive the old weather update');return;}
 assert(x.content.innerHTML.includes('7 forespørgsler registreret'),'completed normal runtime must update the already open Datakvalitet tab');
 assert(x.content.innerHTML.includes('2/2'),'completed normal health must update the same read-only tab');
 assert.equal(x.nodes.get('weatherZoneSearch').value,'one','normal late reads preserve the human weather filter');
 assert(x.nodes.get('weatherZoneRows').innerHTML.includes('<td>one</td>'));
 assert(!x.nodes.get('weatherZoneRows').innerHTML.includes('<td>two</td>'));
 assert.equal(x.nodes.get('moduleGuideBody').hidden,true,'a collapsed guide remains collapsed');
 assert.equal(x.stats().manifestReads,1,'late painting must not fetch the public package again');
}
await lateOpenWeatherTab();await lateOpenWeatherTab({healthFirst:true});await lateOpenWeatherTab({leave:true});await lateOpenWeatherTab({identityChange:true});
console.log('OK: The already open Datakvalitet tab receives normal late inputs and preserves its filter, identity and current tab without another read.');

// Failed normal review reads are unknown, whereas a successful empty read is zero.
async function handbookQueueReadFailure(){
 const x=normalCaller();x.context.state.tab='handbook';x.context.state.access={profile:{id:x.context.currentSession().user.id,is_active:true,role:'owner'}};
 x.context.allowed=()=>true;x.context.listLocalHandbookDrafts=()=>[];
 x.context.exportLocalHandbookDrafts=()=>{};x.content.querySelectorAll=()=>[];
 for(const id of ['jumpReviewQueue','jumpLocalDrafts','refreshReviewQueue'])x.nodes.set(id,{});
 x.context.loadAdminDocument=async()=>({title:'synthetic handbook',handbookVersion:'synthetic',sections:[]});
 x.context.listHandbookReviews=async()=>{throw Error('synthetic review read unavailable');};
 const start=admin.indexOf('async function renderHandbook(){'),end=admin.indexOf('\nasync function renderDocumentation(){',start);
 assert(start>=0&&end>start);runInNewContext(admin.slice(start,end)+'\nglobalThis.handbookView=renderHandbook;',x.context);
 await x.context.handbookView();
 assert(x.content.innerHTML.includes('Reviewkøen kunne ikke hentes: synthetic review read unavailable'));
 assert(x.content.innerHTML.includes('Reviewkø (ukendt)'),'a failed review read may not imply a zero queue');
 assert(x.content.innerHTML.includes('Reviewkøens indhold er ukendt.'));
 assert(!x.content.innerHTML.includes('Reviewkøen er tom.'));
 x.context.listHandbookReviews=async()=>[];await x.context.handbookView();
 assert(x.content.innerHTML.includes('Reviewkø (0)'));
 assert(x.content.innerHTML.includes('Reviewkøen er tom.'));
 const read=deferred();x.context.loadAdminDocument=()=>read.promise;
 const pending=x.context.handbookView();x.context.state.tab='coastlineEditor';x.content.innerHTML='synthetic pending editor';
 read.resolve({title:'late synthetic handbook',sections:[]});await pending;
 assert.equal(x.content.innerHTML,'synthetic pending editor','late normal handbook response must not replace another open editor');
 x.context.state.tab='handbook';const first=deferred(),second=deferred();let reads=0;
 x.context.loadAdminDocument=()=>++reads===1?first.promise:second.promise;
 const older=x.context.handbookView(),newer=x.context.handbookView();
 second.resolve({title:'newer synthetic handbook',sections:[]});await newer;
 const shown=x.content.innerHTML;assert(shown.includes('newer synthetic handbook'));
 first.resolve({title:'older synthetic handbook',sections:[]});await older;
 assert.equal(x.content.innerHTML,shown,'older normal handbook refresh must not replace the later view');
 const stale=deferred();x.context.loadAdminDocument=()=>stale.promise;
 const identityRead=x.context.handbookView();x.switchIdentity();x.content.innerHTML='synthetic identity sentinel';
 stale.resolve({title:'stale synthetic handbook',sections:[]});await identityRead;
 assert.equal(x.content.innerHTML,'synthetic identity sentinel','another identity may not complete the old handbook view');
}
await handbookQueueReadFailure();
console.log('OK: The actual handbook renderer distinguishes an unavailable review queue from a successfully empty queue.');

// Visit totals use Copenhagen calendar days on the existing SQL producer.
// The normal default may not stop one day early near local midnight or DST.
const periodStart=admin.indexOf('function defaultVisitorPeriod('),periodEnd=admin.indexOf('\nfunction renderVisitors(',periodStart);
assert(periodStart>=0&&periodEnd>periodStart);
for(const [now,from,to] of [
 ['2026-11-10T23:30:00.000Z','2026-10-13','2026-11-11'],
 ['2026-07-10T22:30:00.000Z','2026-06-12','2026-07-11'],
 ['2026-03-29T22:30:00.000Z','2026-03-01','2026-03-30'],
 ['2026-10-25T23:30:00.000Z','2026-09-27','2026-10-26'],
]){
 const FrozenDate=class extends Date{constructor(...args){super(...(args.length?args:[now]));}};
 const context={Date:FrozenDate,Intl};
 runInNewContext(admin.slice(periodStart,periodEnd)+'\nglobalThis.period=defaultVisitorPeriod();',context);
 assert.equal(context.period.to,to,'normal visit filter ends on current Copenhagen calendar day');
 assert.equal(context.period.from,from,'normal visit filter covers exactly thirty inclusive calendar days');
}
console.log('OK: The normal default visit period follows Copenhagen calendar days at winter/summer midnight and both DST changes.');

// Use the actual document reader and the normal priority water caller together.
// The transport below is synthetic; no admin document is read from a service.
async function routingReadOrigin(){
 const x=normalCaller({initialPublicReject:false}),memory=new Map();
 const centralRouting={schemaVersion:1,zones:{one:{enabled:true,stations:[],method:'manual-weights',requireAll:true}}};
 const projectRouting={schemaVersion:1,zones:{one:{enabled:false,stations:[],method:'inverse-distance',requireAll:false}}};
 let remoteMode='central',reads=0,projectAvailable=true;
 const storage={get length(){return memory.size;},key:i=>[...memory.keys()][i],getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)};
 const service={PUBLIC_CONFIG:{supabaseUrl:'https://synthetic.invalid',supabasePublishableKey:'synthetic-only'},
  currentSession:x.context.currentSession,requireFreshSession:async()=>{},localStorage:storage,console,
  authorizedFetch:async url=>{reads++;if(remoteMode==='failure')throw Error('synthetic central read failure');
   const key=new URL(url).searchParams.get('document_key').slice(3);
   const payload=key==='water-level-station-routing'?centralRouting:key==='dmi-water-stations'?{stations:[]}:null;
   return{response:{ok:true},body:remoteMode==='central'&&payload?[{payload,version:7,updated_at:'2026-11-11T00:00:00.000Z'}]:[]};},
 };
 runInNewContext(store.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')+'\nglobalThis.load=loadAdminDocument;',service);
 x.context.loadAdminDocument=service.load;
 x.context.getJson=async()=>{if(!projectAvailable)throw Error('synthetic unavailable project file');return projectRouting;};
 x.context.state.access={profile:{id:x.context.currentSession().user.id,is_active:true,role:'owner'}};
 runInNewContext('globalThis.priorityWater=loadPriorityWaterStationAdminData;globalThis.routingNotice=waterRoutingSourceNotice;',x.context);
 x.releasePublic();let before=reads;await x.context.priorityWater();
 assert.equal(reads-before,2,'origin metadata uses the same two document reads');
 assert.equal(x.context.state.waterRouting,centralRouting,'actual central routing values and identity are unchanged');
 assert.equal(x.context.state.waterRoutingSource,'central');assert.equal(x.context.state.waterStationsSource,'central');
 assert(x.context.routingNotice().includes('Begge dokumenter blev læst fra central lagring.'));
 assert(x.context.routingNotice().includes('Kortet viser valgene i denne visning.'));
 assert(x.context.routingNotice().includes('Den offentlige prognose bruger kun kilder med gyldige data for den enkelte time.'));
 remoteMode='failure';before=reads;await x.context.priorityWater();
 assert.equal(reads-before,2);assert.equal(JSON.stringify(x.context.state.waterRouting),JSON.stringify(centralRouting));
 assert.equal(x.context.state.waterRoutingSource,'local-cache');assert.equal(x.context.state.waterStationsSource,'empty-default');
 assert(x.context.routingNotice().includes('lokal kopi (fallback)'));
 assert(!x.context.routingNotice().includes('Begge dokumenter blev læst fra central lagring.'));
 // A successful empty response must not reuse an earlier central saved status.
 remoteMode='empty';memory.delete('ravradar-admin-document:water-level-station-routing');before=reads;
 await x.context.priorityWater();assert.equal(reads-before,2);
 assert.equal(x.context.state.waterRouting,projectRouting,'the same existing project fallback is retained');
 assert.equal(x.context.state.waterRoutingSource,'project-file');assert(x.context.routingNotice().includes('projektfil (fallback)'));
 projectAvailable=false;await x.context.priorityWater();
 assert.equal(JSON.stringify(x.context.state.waterRouting),JSON.stringify({schemaVersion:1,zones:{}}));
 assert.equal(x.context.state.waterRoutingSource,'empty-default');assert(x.context.routingNotice().includes('tom standard (fallback)'));
 // Existing callers still receive just their selected payload, without a wrapper.
 remoteMode='central';assert.equal(await service.load('water-level-station-routing',projectRouting),centralRouting);
 remoteMode='failure';assert.equal(JSON.stringify(await service.load('water-level-station-routing',projectRouting)),JSON.stringify(centralRouting));
 assert.equal(x.stats().manifestReads,1,'origin painting does not fetch a second public package');
 assert(admin.includes('content.innerHTML=waterRoutingSourceNotice()+'),'the normal station renderer mounts the reviewed origin notice');
}
await routingReadOrigin();
console.log('OK: Normal station loading preserves central/local/project/default values and reports their actual read origin without another request.');

// Only two renderers stop before usable controls: history filters and the
// local observation export. Exercise their actual common render/boot callers.
async function cleanEarlyReadView(tab,{leave=null,changeIdentity=false,replaceHost=false}={}){
 const x=normalCaller({initialPublicReject:false});let renders=0,probeDisposals=0,studyMounts=0;
 x.content.isConnected=true;x.nodes.set('adminContent',x.content);
 x.context.loadZoneRegistry=async()=>{const features=[{properties:{id:'one',name:'Synthetic one'}},{properties:{id:'two',name:'Synthetic two'}}];return{all:features,active:features,collection:{features},counts:{registered:2,active:2,legacy:0}};};
 x.nodes.set('moduleGuideBody',{hidden:false});x.nodes.set('toggleModuleGuide',{textContent:'Skjul guide',setAttribute(name,value){this[name]=value;}});
 x.content.insertAdjacentHTML=()=>{x.nodes.get('moduleGuideBody').hidden=false;};
 for(const name of ['renderDashboard','renderWeather','renderWaterStations','renderZones','renderAdminCoastlineEditor','renderDirectionAudit','renderVisitors','renderLearning','renderUsers','renderHandbook','renderDocumentation','renderSystem'])
  x.context[name]=()=>{x.content.innerHTML='synthetic '+x.context.state.tab+' controls';};
 Object.assign(x.context,{invalidateAdminTripCount(){},invalidateAdminUserCategories(){},disposeOwnerNoticeProbe:null,
  destroyCoastlineEditor(){},destroyDirectionMap(){},moduleGuide:()=>'<p>synthetic guide</p>',bindModuleGuide(){},
  mountPrivateTripStudyCard(){studyMounts++;},historicalSummary:()=>({count:0,excludedCount:0,finds:0,successRate:null,averages:{ravScore:null},allRows:[]}),
  resolveAdminActivePublicRavScore:()=>({statusDa:'synthetic verified model',labelDa:'synthetic model',binding:{},observationCalibrationEligible:true,kind:'integrated',scoreProfile:{activationState:'synthetic'}}),
 });
 for(const key of ['exportObs','historyDate','historyZone','historyResult','clearHistory','historyOutput'])x.nodes.set(key,{value:'',innerHTML:''});
 actualView(x,'renderObservations','\nasync function renderUsers(');actualView(x,'renderHistory','\nfunction renderLearning(');
 const from=admin.indexOf('function render(){'),to=admin.indexOf('\nfunction scoreAvailabilityCard(',from);
 assert(from>=0&&to>from);runInNewContext(admin.slice(from,to),x.context);
 const actualRender=x.context.render;x.context.render=()=>{renders++;return actualRender();};
 const task=x.context.ops.boot();await settle();x.context.state.tab=tab;x.context.render();
 assert.equal(renders,2);assert(!x.content.innerHTML.includes(tab==='history'?'id="historyDate"':'id="exportObs"'),'no usable controls exist in the blocked branch');
 x.nodes.get('moduleGuideBody').hidden=true;
 if(leave){x.context.state.tab=leave;x.context.render();x.context.disposeOwnerNoticeProbe=()=>{probeDisposals++;};}
 if(changeIdentity)x.switchIdentity();if(replaceHost)x.nodes.set('adminContent',{syntheticReplacement:true});
 const before=x.content.innerHTML,renderCount=renders,studyCount=studyMounts;
 x.releaseConnections();x.releasePublic();await task;
 if(leave||changeIdentity||replaceHost){assert.equal(x.content.innerHTML,before,'a changed view/identity/host may not be remounted');assert.equal(renders,renderCount);assert.equal(probeDisposals,0);assert.equal(studyMounts,studyCount);return;}
 assert.equal(renders,3,'exactly the same still-blocked read view is mounted after actual public verification');
 assert(x.content.innerHTML.includes(tab==='history'?'id="historyDate"':'id="exportObs"'));
 assert.equal(x.nodes.get('moduleGuideBody').hidden,true,'collapsed guide survives the clean read completion');
 assert.equal(x.nodes.get('toggleModuleGuide')['aria-expanded'],'false');
 if(tab==='history'){
  x.nodes.get('historyDate').value='2026-11-10';const painted=x.content.innerHTML;
  await x.context.ops.publicRuntime();
  assert.equal(renders,3,'later public completion must not remount an already usable view');
  assert.equal(x.nodes.get('historyDate').value,'2026-11-10','an existing human filter is preserved');assert.equal(x.content.innerHTML,painted);
 }
}
await cleanEarlyReadView('history');await cleanEarlyReadView('observations');
await cleanEarlyReadView('history',{changeIdentity:true});await cleanEarlyReadView('observations',{replaceHost:true});
for(const leave of ['system','learning','directionAudit'])await cleanEarlyReadView('history',{leave});
console.log('OK: Only unchanged clean history/observation blocks reopen after verified public completion; filters, report/probe controllers, editor views and changed identity/host are preserved.');


// A pending calibration model may share its view with an already active private
// report. Complete only that model surface through the normal bootstrap/render.
async function learningLateModelRead({changeIdentity=false,replaceModelHost=false,publicFailureThenRetry=false}={}){
 const x=normalCaller({initialPublicReject:publicFailureThenRetry});let renders=0,studyMounts=0,modelWrites=0,contentWrites=0;
 let markup='',modelMarkup='',modelHost=null,report=null;
 const open='<section id="adminLearningModelRead" class="admin-content">',close='</section>';
 Object.defineProperty(x.content,'innerHTML',{
  get(){if(!modelHost)return markup;const at=markup.indexOf(open)+open.length,end=markup.indexOf(close,at);return markup.slice(0,at)+modelMarkup+markup.slice(end);},
  set(value){contentWrites++;markup=String(value);const at=markup.indexOf(open);
   if(at<0){modelHost=null;x.nodes.delete('adminLearningModelRead');return;}
   const end=markup.indexOf(close,at+open.length);assert(end>=0);modelMarkup=markup.slice(at+open.length,end);
   modelHost={isConnected:true,parentNode:x.content};Object.defineProperty(modelHost,'innerHTML',{
    get:()=>modelMarkup,set(value){modelWrites++;modelMarkup=String(value);}});
   x.nodes.set('adminLearningModelRead',modelHost);
  },
 });
 x.content.isConnected=true;x.nodes.set('adminContent',x.content);
 x.nodes.set('moduleGuideBody',{hidden:false});x.nodes.set('toggleModuleGuide',{textContent:'Skjul guide',setAttribute(name,value){this[name]=value;}});
 x.content.insertAdjacentHTML=()=>{x.nodes.get('moduleGuideBody').hidden=false;};
 for(const name of ['renderDashboard','renderWeather','renderWaterStations','renderZones','renderAdminCoastlineEditor','renderDirectionAudit','renderObservations','renderHistory','renderVisitors','renderUsers','renderHandbook','renderDocumentation','renderSystem'])
  x.context[name]=()=>{x.content.innerHTML='synthetic '+x.context.state.tab+' controls';};
 Object.assign(x.context,{invalidateAdminTripCount(){},invalidateAdminUserCategories(){},disposeOwnerNoticeProbe:null,
  destroyCoastlineEditor(){},destroyDirectionMap(){},moduleGuide:()=>'<p>synthetic guide</p>',bindModuleGuide(){},
  analyzeObservations:()=>({sampleSize:0,zoneCount:0,noFindCount:0,modes:{}}),
  mountPrivateTripStudyCard(){studyMounts++;report={button:{disabled:true},download:{disabled:true},output:{innerHTML:'synthetic report remains'},inFlight:true};},
  resolveAdminActivePublicRavScore:()=>({statusDa:'synthetic verified model',labelDa:'synthetic model',binding:{},observationCalibrationEligible:true,kind:'integrated',scoreProfile:{activationState:'synthetic'}}),
 });
 actualView(x,'renderLearning','\nconst saveBadge=');
 const from=admin.indexOf('function render(){'),to=admin.indexOf('\nfunction scoreAvailabilityCard(',from);
 assert(from>=0&&to>from);runInNewContext(admin.slice(from,to),x.context);
 const actualRender=x.context.render;x.context.render=()=>{renders++;return actualRender();};
 const task=x.context.ops.boot();await settle();x.context.state.tab='learning';x.context.render();
 assert(x.content.innerHTML.includes('AFVENTER VERIFIKATION'));
 assert.equal(studyMounts,1);const originalReport=report,originalButton=report.button,originalOutput=report.output;
 x.nodes.get('moduleGuideBody').hidden=true;
 if(changeIdentity)x.switchIdentity();
 if(replaceModelHost)x.nodes.set('adminLearningModelRead',{isConnected:true,parentNode:x.content,innerHTML:'replacement'});
 const before=x.content.innerHTML,writes=contentWrites;
 x.releaseConnections();x.releasePublic();await task;
 if(publicFailureThenRetry){
  assert(x.content.innerHTML.includes('BLOKERET'),'an actual failed model read must stop saying pending');
  assert(!x.content.innerHTML.includes('AFVENTER VERIFIKATION'));assert.equal(studyMounts,1);assert.equal(report,originalReport);
  x.nextPublic(false);x.context.ops.retry();await settle();
  assert(x.content.innerHTML.includes('AFVENTER VERIFIKATION'),'normal retry paints the same pending model surface');
  x.releasePublic();await settle();
 }
 if(changeIdentity||replaceModelHost){assert.equal(x.content.innerHTML,before,'stale model surface stays untouched');assert.equal(modelWrites,0);}
 else{assert(!x.content.innerHTML.includes('AFVENTER VERIFIKATION'),'calibration model must receive the completed verified public read');assert(x.content.innerHTML.includes('synthetic model'));if(!publicFailureThenRetry)assert.equal(modelWrites,1);}
 assert.equal(contentWrites,writes,'completion cannot replace the whole report-bearing tab');
 assert.equal(renders,2);assert.equal(studyMounts,1);assert.equal(report,originalReport);assert.equal(report.button,originalButton);assert.equal(report.output,originalOutput);
 assert.equal(report.button.disabled,true);assert.equal(report.download.disabled,true);assert.equal(report.inFlight,true);assert.equal(report.output.innerHTML,'synthetic report remains');
 assert.equal(x.nodes.get('moduleGuideBody').hidden,true);assert.equal(x.stats().manifestReads,publicFailureThenRetry?2:1);
}
await learningLateModelRead();await learningLateModelRead({publicFailureThenRetry:true});await learningLateModelRead({changeIdentity:true});await learningLateModelRead({replaceModelHost:true});
console.log('OK: The verified late calibration model updates only its original read surface; an in-flight private report, controls, guide and changed identity/host survive unchanged.');


// The actual direction editor receives the completed bootstrap data once,
// before a person can create a draft; later reads cannot replace that draft.
async function directionLateBootstrap({leave=false,changeIdentity=false}={}){
 const x=normalCaller({initialPublicReject:false}),reviewRead=deferred();let markup='',surfaceMarkup='',surface=null,mounts=0,disposals=0,renders=0,config=null;
 const open='<section id="adminDirectionEditorRead" class="admin-content">',close='</section>';
 Object.defineProperty(x.content,'innerHTML',{
  get(){if(!surface)return markup;const at=markup.indexOf(open)+open.length,end=markup.indexOf(close,at);return markup.slice(0,at)+surfaceMarkup+markup.slice(end);},
  set(value){markup=String(value);const at=markup.indexOf(open);
   if(at<0){surface=null;x.nodes.delete('adminDirectionEditorRead');return;}
   const end=markup.indexOf(close,at+open.length);assert(end>=0);surfaceMarkup=markup.slice(at+open.length,end);
   surface={isConnected:true,parentNode:x.content,insertAdjacentHTML(_position,value){surfaceMarkup=String(value)+surfaceMarkup;}};
   Object.defineProperty(surface,'innerHTML',{get:()=>surfaceMarkup,set(value){surfaceMarkup=String(value);}});
   x.nodes.set('adminDirectionEditorRead',surface);
  },
 });
 x.content.isConnected=true;x.nodes.set('adminContent',x.content);
 x.nodes.set('moduleGuideBody',{hidden:false});x.nodes.set('toggleModuleGuide',{textContent:'Skjul guide',setAttribute(name,value){this[name]=value;}});
 x.content.insertAdjacentHTML=()=>{x.nodes.get('moduleGuideBody').hidden=false;};
 const features=[{properties:{id:'one',name:'Synthetic one',zoneStatus:'active'}}],parts={zones:{one:[{partId:'one-1'}]}},staging={available:true,entries:[{zoneId:'one',revision:'synthetic'}]};
 x.context.loadZoneRegistry=async()=>({all:features,active:features,collection:{features},counts:{registered:1,active:1,legacy:0}});
 x.context.loadZones=async()=>({coastalParts:parts});
 const load=x.context.loadAdminDocument;
 x.context.loadAdminDocument=async(key,...args)=>key==='direction-reviews'?reviewRead.promise:key==='coastal-point-staging-status'?staging:load(key,...args);
 for(const name of ['renderDashboard','renderWeather','renderWaterStations','renderZones','renderAdminCoastlineEditor','renderObservations','renderHistory','renderVisitors','renderLearning','renderUsers','renderHandbook','renderDocumentation','renderSystem'])
  x.context[name]=()=>{x.content.innerHTML='synthetic '+x.context.state.tab+' controls';};
 let draft=null;
 Object.assign(x.context,{invalidateAdminTripCount(){},invalidateAdminUserCategories(){},disposeOwnerNoticeProbe:null,
  destroyCoastlineEditor(){},destroyDirectionMap(){},destroyPartDirectionEditor:null,moduleGuide:()=>'<p>synthetic guide</p>',bindModuleGuide(){},
  createDirectionEditor(host,options){mounts++;config=options;draft={note:{value:'initial'},range:{value:0}};host.draftControls=draft;host.innerHTML='synthetic ready editor';return()=>{disposals++;};},
  directionReviews:()=>JSON.parse(x.context.localStorage.getItem('test-directions')||'{}'),
  saveDirectionReviewsNow:()=>assert.fail('bootstrap cannot save a direction'),saveDirectionReviews:()=>assert.fail('bootstrap cannot save a draft'),
 });
 actualView(x,'renderDirectionAudit','\nfunction renderObservations(');
 const from=admin.indexOf('function render(){'),to=admin.indexOf('\nfunction scoreAvailabilityCard(',from);
 assert(from>=0&&to>from);runInNewContext(admin.slice(from,to),x.context);
 const actualRender=x.context.render;x.context.render=()=>{renders++;return actualRender();};
 const task=x.context.ops.boot();await settle();x.context.state.tab='directionAudit';x.context.render();
 assert.equal(mounts,0,'the direction editor must not capture incomplete bootstrap arrays');
 x.nodes.get('moduleGuideBody').hidden=true;x.releaseConnections();x.releasePublic();await settle();
 assert.equal(mounts,0,'public completion alone is not the completed direction/review bootstrap');
 if(leave){x.context.state.tab='system';x.context.render();}if(changeIdentity)x.switchIdentity();
 reviewRead.resolve({zones:{one:{note:'loaded central review'}}});await task;
 if(leave||changeIdentity){assert.equal(mounts,0,'a changed view or identity cannot mount the deferred editor');return;}
 assert.equal(mounts,1);assert.equal(config.zones,features);assert.equal(config.coastalParts,parts);assert.equal(config.pointStagingStatus,staging);assert.equal(config.reviews.one.note,'loaded central review');
 assert.equal(x.nodes.get('moduleGuideBody').hidden,true);assert.equal(renders,2);assert.equal(disposals,0);assert.equal(x.events.filter(value=>value==='ravradar:admin-ready').length,1);
 draft.note.value='person draft';draft.range.value=123;const originalDraft=surface.draftControls;
 const before=x.content.innerHTML,originalConfig=config;await x.context.ops.publicRuntime();
 assert.equal(mounts,1);assert.equal(config,originalConfig);assert.equal(disposals,0);assert.equal(x.content.innerHTML,before);assert.equal(surface.draftControls,originalDraft);assert.equal(surface.draftControls.note.value,'person draft');assert.equal(surface.draftControls.range.value,123);assert.equal(x.stats().manifestReads,1);
}
await directionLateBootstrap();await directionLateBootstrap({leave:true});await directionLateBootstrap({changeIdentity:true});
console.log('OK: The existing admin-ready boundary mounts the deferred direction editor once with completed inputs and keeps later drafts, events, guide, view and identity unchanged.');
