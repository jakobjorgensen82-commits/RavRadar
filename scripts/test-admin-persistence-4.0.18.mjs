import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin = fs.readFileSync(new URL('../js/ui/admin-dashboard.js', import.meta.url), 'utf8');
const store = fs.readFileSync(new URL('../js/services/admin-document-store.js', import.meta.url), 'utf8');
const update = fs.readFileSync(new URL('./update-weather.mjs', import.meta.url), 'utf8');
const hydrate = fs.readFileSync(new URL('./hydrate-deployed-weather.py', import.meta.url), 'utf8');

assert.match(admin, /queueAdminDocumentSave\('water-level-station-routing'/);
assert.match(admin, /queueAdminDocumentSave\('direction-reviews'/);
assert.doesNotMatch(
  admin,
  /queueAdminDocumentSave\('rules'/,
  'Det pensionerede Regelværksted må ikke længere have en aktiv central gemmevej',
);
assert.match(store, /admin_documents/);
assert.match(store, /localStorage/);

// Stationsregisteret går nu gennem den persistente livscyklus, før det bruges.
assert.match(update, /const rawStationRegistry\s*=\s*await dmiWaterStations\(\)\.catch\(\(\)\s*=>\s*readCachedWaterStations\(\)\)/);
assert.match(update, /const forecastAwareRegistry\s*=\s*applyWaterSourceForecastStatus\(rawStationRegistry,/);
assert.match(update, /let stationLifecycle\s*=\s*await updateStationObservationLifecycle\(forecastAwareRegistry,/);
assert.match(update, /let stationRegistry\s*=\s*stationLifecycle\.stations/);
assert.match(update, /const routingAlerts\s*=\s*buildEffectiveRoutingCacheAlerts\(\{ document: stationLifecycle\.document, features, routing: activeWaterRouting, audit: stationRoutingAudit, output,/);
assert.match(update, /stationLifecycle\s*=\s*\{ \.\.\.stationLifecycle, document: routingAlerts\.document,/);
assert.match(update, /stationRegistry\s*=\s*stationLifecycle\.stations/);
assert.match(update, /output\.dataQuality\.stationLifecycle\s*=\s*stationLifecycle\.document\.summary/);
assert.match(update, /output\.dataQuality\.stationNotifications\s*=\s*stationLifecycle\.notifications/);

assert.match(hydrate, /dmi-water-stations\.json/);
assert.match(update, /const horizons=\[6,24,48,ACCEPTED_FORECAST_HOURS\]/);
console.log('OK: central adminlagring uden Regelværksted, stationslivscyklus, stationsregister-cache og udvidet diagnostik er koblet sammen.');

// Actual browser services under a synthetic transport/storage/clock. No hosted
// probe, provider operation, admin credential or production document is read.
import vm from 'node:vm';
import test from 'node:test';
const adminBodySource = name => fs.readFileSync(new URL(`../js/services/${name}.js`,import.meta.url),'utf8').replace(/^import[^\n]+\r?\n/gm,'').replace(/^export\s+/gm,'');
const adminBodySources=Object.fromEntries(['auth-service','admin-document-store','handbook-review-store','visitor-report-service'].map(name=>[name,adminBodySource(name)]));
function bodyDeferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return{promise,resolve};}
async function bodyConsumerCase(caller,mode){
 const owner='11111111-1111-4111-8111-111111111111',reviewId='33333333-3333-4333-8333-333333333333';
 const config={supabaseUrl:'https://example.invalid',supabasePublishableKey:'synthetic-public'};
 const session=token=>({access_token:token,refresh_token:'synthetic-refresh',expires_at:9_999_999_999,user:{id:owner}});
 const localKey='ravradar-admin-document:direction-reviews',original={synthetic:'original'},desired={synthetic:'desired'};
 const bank=new Map([['ravradar-auth-session',JSON.stringify(session('synthetic-token'))],[localKey,JSON.stringify(original)]]),timers=new Map(),calls=[],reached=bodyDeferred(),release=bodyDeferred(),authRelease=bodyDeferred(),operations=[];
 let now=0,nextTimer=0,settled=false,bodyReads=0,refreshes=0,posts=0,holdAuth=false;
 const errorPayload={code:'PGRST204',message:mode==='old-schema'?'Could not find client_payload column in schema cache':'synthetic diagnostic'};
 const errorText=mode==='raw-error'?'synthetic raw error':JSON.stringify(errorPayload);
 const isError=mode.startsWith('error')||['raw-error','rejected-text','logout','pending-login','renewal','old-schema','delete-archive','401'].includes(mode);
 const held=mode.includes('deadline')||['logout','pending-login','renewal'].includes(mode);
 const scope={PUBLIC_CONFIG:config,AbortController,DOMException,crypto:{randomUUID:()=>reviewId},console,
  localStorage:{get length(){return bank.size;},key:i=>[...bank.keys()][i],getItem:k=>bank.get(k)??null,setItem:(k,v)=>bank.set(k,String(v)),removeItem:k=>bank.delete(k)},
  setTimeout(fn,ms){const timer=++nextTimer;timers.set(timer,{at:now+ms,fn});return timer;},clearTimeout:id=>timers.delete(id),
  async fetch(input,options){
   const url=new URL(input);assert.equal(url.origin,config.supabaseUrl);const method=options.method||'GET';
   if(url.pathname==='/auth/v1/logout')return{ok:true,status:200,json:async()=>({})};
   if(url.pathname==='/auth/v1/token'){
    if(url.searchParams.get('grant_type')==='refresh_token'){refreshes++;return{ok:true,status:200,json:async()=>session('synthetic-renewed')};}
    assert.equal(url.searchParams.get('grant_type'),'password');if(holdAuth)await authRelease.promise;return{ok:true,status:200,json:async()=>session('synthetic-new-login')};
   }
   assert.equal(options.headers.Authorization,'Bearer '+(refreshes?'synthetic-renewed':'synthetic-token'));
   calls.push({path:url.pathname,method,body:options.body});if(method==='POST')posts++;
   if(mode==='401'&&calls.length===1)return{ok:false,status:401,json(){throw Error('First401 must not be consumed');},text(){throw Error('First401 must not be consumed');}};
   const write=method==='POST'||method==='PATCH'||method==='DELETE';
   const selected=caller==='admin-save'?method==='POST':caller==='handbook-submit'?method==='POST'&&posts===1:caller==='handbook-delete'?method==='DELETE':true;
   const failed=selected&&isError;
   const successRows=caller==='admin-save'||caller==='admin-read'||caller==='admin-load'||caller==='admin-health'?[{payload:desired,version:7,updated_at:'synthetic-time'}]:caller==='visitor'?{synthetic:'report'}:method==='DELETE'||caller==='handbook-delete'&&method==='GET'?[]:[{id:reviewId,status:method==='PATCH'?'rejected':'new',resolution_note:''}];
   async function consume(kind){
    bodyReads++;if(selected&&held){reached.resolve();await release.promise;}
    if(mode==='rejected-text'&&failed)throw new TypeError('synthetic body interrupted');
    if(!failed)return successRows;
    return kind==='text'?errorText:JSON.parse(errorText);
   }
   if(caller==='handbook-delete'&&method==='DELETE'&&!failed)return{ok:true,status:204,json(){throw Error('Successful DELETE must stay header-only');},text(){throw Error('Successful DELETE must stay header-only');}};
   return{ok:!failed,status:failed?400:200,json:()=>consume('json'),text:()=>consume('text')};
  }};
 vm.runInNewContext(adminBodySources['auth-service']+'\nthis.auth={authorizedFetch,currentSession,requireFreshSession,signOut,signInWithPassword,refreshSession};',scope);
 const shared={...scope,...scope.auth},adminScope={...shared},handbookScope={...shared},visitorScope={...shared};
 vm.runInNewContext(adminBodySources['admin-document-store']+'\nthis.api={readAdminDocumentNow,loadAdminDocument,saveAdminDocumentNow,adminStorageHealth,getAdminSaveStatuses};',adminScope);
 vm.runInNewContext(adminBodySources['handbook-review-store']+'\nthis.api={listHandbookReviews,submitHandbookReview,deleteOrArchiveProbe,listLocalHandbookDrafts};',handbookScope);
 vm.runInNewContext(adminBodySources['visitor-report-service']+'\nthis.api={loadVisitorReport};',visitorScope);
 const start=()=>caller==='admin-save'?adminScope.api.saveAdminDocumentNow('direction-reviews',desired):caller==='admin-read'?adminScope.api.readAdminDocumentNow('direction-reviews'):caller==='admin-load'?adminScope.api.loadAdminDocument('direction-reviews',null):caller==='admin-health'?adminScope.api.adminStorageHealth(['direction-reviews']):caller==='handbook'?handbookScope.api.listHandbookReviews():caller==='handbook-submit'?handbookScope.api.submitHandbookReview({sectionId:'synthetic',issue:'synthetic',proposal:'synthetic',reasoning:'synthetic'}):caller==='handbook-delete'?handbookScope.api.deleteOrArchiveProbe(reviewId):visitorScope.api.loadVisitorReport('2026-01-01','2026-01-02');
 let operation;
 try{
  operation=start().then(value=>{settled=true;return{value};},error=>{settled=true;return{error};});operations.push(operation);
  if(held){
   await Promise.race([reached.promise,operation.then(()=>{throw Error('Actual body was not reached');})]);await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
   if(mode.includes('deadline')){now=12_001;for(const[id,timer]of[...timers])if(timer.at<=now){timers.delete(id);timer.fn();}await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,true,caller+' body must finish under original deadline');}
   else if(mode==='logout')await scope.auth.signOut();
   else if(mode==='renewal')await scope.auth.refreshSession({force:true});
   else{holdAuth=true;operations.push(scope.auth.signInWithPassword('synthetic@example.invalid','synthetic-only').catch(error=>({error})));}
   if(!mode.includes('deadline'))release.resolve();
  }
  const result=await operation;
  const error=result.error||result.value?.error;
  const message=typeof error==='string'?error:error?.message;
  if(mode.includes('deadline')){
   if(caller==='admin-load'){assert.equal(JSON.stringify(result.value),JSON.stringify(original));assert.equal(adminScope.api.getAdminSaveStatuses()['direction-reviews'].central,false);}
   else if(caller==='admin-health'){assert.equal(result.value.ok,false);assert.match(result.value.documents['direction-reviews'].error,/svarede ikke i tide/);}
   else assert.match(message,/svarede ikke i tide/);
   assert.equal(calls.length,1,'No body timeout retries or later verification write');
  }else if(mode==='logout'||mode==='pending-login'){
   assert.match(message,/Kontoen blev ændret/);assert.doesNotMatch(message,/synthetic diagnostic/);
  }else if(isError&&!['old-schema','delete-archive'].includes(mode)){
   if(mode==='rejected-text'||mode==='raw-error'&&caller==='visitor')assert.match(message,/400/);
   else assert.match(message,/synthetic (diagnostic|raw error)/);
  }else{
   assert.equal(result.error,undefined);
   if(caller==='admin-save'){assert.equal(result.value.ok,true);assert.deepEqual(result.value.row.payload,desired);assert.equal(calls.length,2,'Fresh normal readback still required');}
   else if(caller==='handbook-submit'){assert.equal(result.value.central,true);assert.equal(calls.length,mode==='old-schema'?3:2);if(mode==='old-schema'){assert.ok(JSON.parse(calls[0].body).client_payload);assert.equal('client_payload'in JSON.parse(calls[1].body),false);assert.equal(JSON.parse(calls[0].body).id,JSON.parse(calls[1].body).id);}}
   else if(caller==='handbook-delete')assert.equal(result.value,mode==='delete-archive'?'archived':'deleted');
   else if(caller==='visitor')assert.deepEqual(result.value,{synthetic:'report'});
  }
  if(caller==='admin-save'){assert.equal(bank.get(localKey),JSON.stringify(desired),'Unknown remote result retains desired local bytes');if(error)assert.equal(adminScope.api.getAdminSaveStatuses()['direction-reviews'].central,false);}
  else assert.equal(bank.get(localKey),JSON.stringify(original));
  if(caller==='handbook-submit'&&error){const drafts=handbookScope.api.listLocalHandbookDrafts();assert.equal(drafts.length,1);assert.equal(drafts[0].id,reviewId);assert.equal(drafts[0].localOnly,true);}
  assert.equal(refreshes,['renewal','401'].includes(mode)?1:0);
 }finally{release.resolve();authRelease.resolve();await Promise.allSettled(operations);assert.equal(timers.size,0,'All own guards cleared');}
}
for(const caller of ['admin-save','handbook','visitor'])for(const mode of ['error-deadline','success-deadline','error','raw-error','rejected-text','logout','pending-login','renewal','ordinary','401'])test('admin body deadline: '+caller+' '+mode,()=>bodyConsumerCase(caller,mode));
for(const caller of ['admin-read','admin-load','admin-health'])test('admin body deadline: '+caller+' success-deadline',()=>bodyConsumerCase(caller,'success-deadline'));
for(const mode of ['old-schema','error-deadline','ordinary'])test('admin body deadline: handbook-submit '+mode,()=>bodyConsumerCase('handbook-submit',mode));
for(const mode of ['ordinary','delete-archive','error-deadline'])test('admin body deadline: handbook-delete '+mode,()=>bodyConsumerCase('handbook-delete',mode));

for(const mode of ['default','json-only-error','truthy-text','text-only-success','text-error'])test('admin body option: '+mode,async()=>{
 const bank=new Map([['ravradar-auth-session',JSON.stringify({access_token:'synthetic',expires_at:9_999_999_999,user:{id:'synthetic-owner'}})]]),timers=new Set();
 let reads=0;
 const response={ok:mode==='text-only-success',status:mode==='text-only-success'?204:400,json(){reads++;throw Error('No JSON read expected');},async text(){reads++;return'synthetic diagnostic';}};
 const scope={PUBLIC_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'synthetic'},AbortController,DOMException,localStorage:{getItem:k=>bank.get(k)??null},setTimeout(fn,ms){const timer=setTimeout(fn,ms);timers.add(timer);return timer;},clearTimeout(timer){clearTimeout(timer);timers.delete(timer);},fetch:async()=>response};
 vm.runInNewContext(adminBodySources['auth-service']+'\nthis.api={authorizedFetch};',scope);
 const options=mode==='json-only-error'?{consumeJson:true}:mode==='truthy-text'?{consumeErrorText:'true'}:mode.startsWith('text-')?{consumeErrorText:true}:{};
 try{
  const value=await scope.api.authorizedFetch('https://example.invalid/rest/v1/synthetic',{},options);
  if(mode==='default'||mode==='truthy-text')assert.equal(value,response,'Untouched Response returned without reading body');
  else{assert.equal(value.response,response);assert.equal(value.body,undefined);if(mode==='json-only-error')assert.equal('errorText'in value,false);else assert.equal(value.errorText,mode==='text-error'?'synthetic diagnostic':undefined);}
  assert.equal(reads,mode==='text-error'?1:0);
 }finally{assert.equal(timers.size,0);}
});

async function draftInterleavingCase(action){
 const key='ravradar-handbook-review-drafts-v1',A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',first='33333333-3333-4333-8333-333333333333',neighbor='44444444-4444-4444-8444-444444444444',newId='55555555-5555-4555-8555-555555555555';
 const row=id=>({id,handbookVersion:'synthetic',sectionId:'synthetic',issue:'synthetic '+id,proposal:'original local content',reasoning:'synthetic only',localOnly:true});
 const initial=[row(first),row(neighbor)],session=id=>({access_token:'synthetic-token-'+id,refresh_token:'synthetic-refresh',expires_at:9_999_999_999,user:{id}});
 const bank=new Map([[key,JSON.stringify(initial)],['ravradar-auth-session',JSON.stringify(session(A))]]),timers=new Set(),reached=bodyDeferred(),bothReached=bodyDeferred(),release=bodyDeferred(),calls=[],downloads=[],blobs=[],operations=[];
 const storageFailure=new Error('SYNTHETIC_FIRST_STORAGE_FAILURE');let nextOwner=A,armed=false,readsReached=0;
 const scope={PUBLIC_CONFIG:{supabaseUrl:'https://example.invalid',supabasePublishableKey:'synthetic-public'},AbortController,DOMException,Blob,crypto:{randomUUID:()=>newId},
  localStorage:{getItem(k){if(armed&&k===key&&action==='cleanup-read-error')throw storageFailure;return bank.get(k)??null;},setItem(k,v){if(armed&&k===key&&action==='cleanup-write-error')throw storageFailure;bank.set(k,String(v));},removeItem:k=>bank.delete(k)},
  setTimeout(fn,ms){if(ms===0){queueMicrotask(fn);return 0;}const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;},clearTimeout(id){clearTimeout(id);timers.delete(id);},
  URL:{createObjectURL(blob){blobs.push(blob);return'synthetic:blob';},revokeObjectURL(){}},document:{createElement(tag){assert.equal(tag,'a');const a={click(){downloads.push({href:a.href,name:a.download});}};return a;}},
  async fetch(input,options){const url=new URL(input);assert.equal(url.origin,'https://example.invalid');
   if(url.pathname==='/auth/v1/logout')return Response.json({});
   if(url.pathname==='/auth/v1/token')return Response.json(session(nextOwner));
   assert.equal(url.pathname,'/rest/v1/handbook_reviews');calls.push({method:options.method||'GET',body:options.body});
   if(options.method==='POST'){const payload=JSON.parse(options.body);assert.equal(payload.created_by,A);if(payload.id===newId)return{ok:false,status:503,text:async()=>'{"message":"synthetic unavailable"}',json:async()=>({message:'synthetic unavailable'})};assert.ok([first,neighbor].includes(payload.id));return Response.json([{id:payload.id,status:'new'}]);}
   const requested=url.searchParams.get('id')?.slice(3);assert.ok([first,neighbor].includes(requested));
   const consume=async(value)=>{reached.resolve();if(++readsReached===2)bothReached.resolve();await release.promise;return value;};
   return{ok:action!=='read-error',status:action==='read-error'?503:200,json:()=>consume([{id:requested,status:'new'}]),text:()=>consume('{"message":"synthetic read unavailable"}')};
  }};
 vm.runInNewContext(adminBodySources['auth-service']+'\nthis.auth={authorizedFetch,currentSession,requireFreshSession,signOut,signInWithPassword};',scope);
 const service={...scope,...scope.auth};vm.runInNewContext(adminBodySources['handbook-review-store']+'\nthis.api={retryLocalHandbookDraft,submitHandbookReview,deleteLocalHandbookDraft,listLocalHandbookDrafts,exportLocalHandbookDrafts};',service);
 const track=id=>{const op=service.api.retryLocalHandbookDraft(id).then(value=>({value}),error=>({error}));operations.push(op);return op;};
 try{
  const operation=track(first);await Promise.race([reached.promise,operation.then(()=>{throw Error('Normal readback body not reached');})]);
  if(action==='append'){const result=await service.api.submitHandbookReview({sectionId:'synthetic new',issue:'new local original',proposal:'keep this',reasoning:'synthetic'});assert.equal(result.central,false);assert.equal(result.review.id,newId);}
  if(action==='delete-neighbor')service.api.deleteLocalHandbookDraft(neighbor);
  if(action==='parallel-retries'){track(neighbor);await bothReached.promise;}
  if(action==='remove-all'){service.api.deleteLocalHandbookDraft(first);service.api.deleteLocalHandbookDraft(neighbor);}
  if(action.endsWith('relogin')){await scope.auth.signOut();nextOwner=action==='different-owner-relogin'?B:A;await scope.auth.signInWithPassword('synthetic@example.invalid','synthetic-only');}
  if(action==='cleanup-malformed')bank.set(key,'{synthetic invalid original');
  if(action==='cleanup-shape')bank.set(key,'{"synthetic":"non-array original"}');
  const latest=bank.get(key);armed=true;release.resolve();const result=await operation;await Promise.all(operations);
  if(action.endsWith('relogin')||action==='read-error'||action.startsWith('cleanup-')){
   assert.ok(result.error,'Failed or stale completion must preserve its current bank');assert.equal(bank.get(key),latest);
   if(action==='cleanup-read-error'||action==='cleanup-write-error')assert.equal(result.error,storageFailure,'Preserve first original storage error');
   if(action==='cleanup-malformed'||action==='cleanup-shape')assert.equal(result.error.message,'Lokale nødkladder kunne ikke læses sikkert.');
  }else{
   assert.equal(result.error,undefined);for(const op of operations)assert.equal((await op).error,undefined);
   const rows=JSON.parse(bank.get(key)),expected=JSON.parse(latest).filter(x=>x.id!==first&&(action!=='parallel-retries'||x.id!==neighbor));
   assert.equal(JSON.stringify(rows),JSON.stringify(expected),'Retry must change only its own old draft and preserve current neighbors');
   service.api.exportLocalHandbookDrafts();assert.equal(downloads.length,1);const exported=JSON.parse(await blobs[0].text());assert.equal(JSON.stringify(exported.reviews),JSON.stringify(expected),'Normal export retains originals without reviving deletions');
  }
  assert.equal(calls.filter(c=>c.method==='POST').length,['append','parallel-retries'].includes(action)?2:1);
 }finally{release.resolve();await Promise.allSettled(operations);assert.equal(timers.size,0);}
}
for(const action of ['append','delete-neighbor','ordinary','parallel-retries','remove-all','same-owner-relogin','different-owner-relogin','read-error','cleanup-read-error','cleanup-write-error','cleanup-malformed','cleanup-shape'])test('draft retry/export: '+action,()=>draftInterleavingCase(action));
