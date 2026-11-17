import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files=['js/ui/admin-dashboard.js','js/ui/admin-account-erasure.js','js/services/auth-service.js','js/services/admin-document-store.js','js/services/permissions-service.js'];
for (const file of files){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0) throw new Error(`${file} har syntaksfejl:\n${r.stderr||r.stdout}`);
}
const dashboard=await readFile('js/ui/admin-dashboard.js','utf8');
const permissionDeclarations=(dashboard.match(/const TAB_PERMISSIONS=/g)||[]).length;
if(permissionDeclarations!==1) throw new Error(`TAB_PERMISSIONS skal deklareres præcis én gang, fandt ${permissionDeclarations}`);
if(!dashboard.includes("button.addEventListener('click'")) throw new Error('Adminfanernes click-handler mangler');
if(!dashboard.includes('state.tab = button.dataset.tab')) throw new Error('Adminfanernes state-skift mangler');
console.log('Admin frontend: syntaks, fanebinding og rettighedsopsætning OK');

// Execute the normal owner UI model and its actual bindings; no Auth/provider calls.
const {strict:assert}=await import('node:assert');
const {runInNewContext}=await import('node:vm');
const {createOwnerAccountErasure,mountOwnerAccountErasure,checkedAccountErasureStatus}=await import('../js/ui/admin-account-erasure.js');
const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const OWNER=uid(1),TARGET=uid(2),OP=uid(100);
const status=(state='PREPARED',extra={})=>({operationId:OP,targetUserId:TARGET,mode:'MANUAL_OWNER',state,holdReason:null,
 pgStageCommitted:['PG_STAGED_AUTH_PENDING','AUTH_ATTEMPTED','AUTH_ABSENT_D1_PENDING','COMPLETE'].includes(state),pgRowsRemoved:0,
 authAbsent:['AUTH_ABSENT_D1_PENDING','COMPLETE'].includes(state),d1Acknowledged:state==='COMPLETE',d1DeletedCount:state==='COMPLETE'?0:null,complete:state==='COMPLETE',...extra});
const profile=(extra={})=>({id:TARGET,email:'fixture@example.invalid',display_name:'Syntetisk konto',role:'expert',user_permissions:[],...extra});
const list=rows=>({scope:'own-account-erasure-operations',rows,truncated:false});
function fixture({render=false}={}){
 const h={current:true,role:'owner',sequence:1000,calls:[],confirmations:[],updates:[],category:'ordinary',issues:[],confirm:true,
  handler:async(path,body)=>body.operation==='account-erasure-list'?list([]):path==='find'?{operationId:null,state:'NONE',complete:false}:status()};
 h.dependencies={ownerId:OWNER,current:()=>h.current,access:async()=>({profile:{id:OWNER,role:h.role,is_active:true},permissions:new Set(['full_admin'])}),
  request:async(path,body)=>{h.calls.push({path,body:structuredClone(body)});const value=await h.handler(path,body);return {response:{ok:true},body:value};},
  categories:async()=>({rows:[{id:TARGET,category:h.category,issues:h.issues}]}),uuid:()=>uid(++h.sequence),
  confirm:text=>{h.confirmations.push(text);return h.confirm;},changed:view=>h.updates.push(view)};
 h.host=render?new Host():null;h.model=render?mountOwnerAccountErasure(h.host,h.dependencies):createOwnerAccountErasure(h.dependencies);
 h.model.setProfiles([profile()]);return h;
}
const cases=[];const test=(name,run)=>cases.push({name,run});
test('server discovery resumes a profile-less pending UUID, with positive completion only',async()=>{
 const h=fixture();h.model.setProfiles([]);h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status('AUTH_ABSENT_D1_PENDING')]):body.operation==='account-erasure-status'?status('AUTH_ABSENT_D1_PENDING'):status('COMPLETE');
 assert.equal(await h.model.hydrate(),true);assert.equal(await h.model.resume(OP),true);
 assert.equal(h.model.snapshot().rows[0].status.complete,true);assert.ok(h.confirmations[0].includes(TARGET));
 assert.deepEqual(h.calls.map(call=>call.body.operation),['account-erasure-list','account-erasure-status','account-erasure-resume']);
 assert.deepEqual(Object.keys(h.calls.at(-1).body).sort(),['attemptId','confirmation','operation','operationId']);
});
test('unknown prepare retains operation UUID, blocks resume, and requires status readback',async()=>{
 const h=fixture();await h.model.hydrate();h.handler=async(path)=>path==='find'?{operationId:null,state:'NONE',complete:false}:Promise.reject(Error('lost response'));
 assert.equal(await h.model.prepare(TARGET),false);const op=h.model.snapshot().rows[0].operationId;
 assert.equal(await h.model.prepare(TARGET),false);assert.deepEqual(h.calls.filter(call=>call.body.operation==='account-erasure-prepare').map(call=>call.body.operationId),[op,op]);
 const calls=h.calls.length;assert.equal(await h.model.resume(op),false);assert.equal(h.calls.length,calls);
 h.handler=async()=>status('PREPARED',{operationId:op});await h.model.status(op);
 assert.equal(h.model.snapshot().rows[0].unknown,false);assert.equal(h.model.snapshot().rows[0].status.complete,false);
});
test('unknown resume preserves attempt; status never retries; new attempt requires new explicit confirmation',async()=>{
 const h=fixture();h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status()]):body.operation==='account-erasure-resume'?Promise.reject(Error('lost')):status();
 await h.model.hydrate();assert.equal(await h.model.resume(OP),false);const attempt=h.model.snapshot().rows[0].attemptId;
 assert.ok(attempt);assert.equal(h.model.snapshot().rows[0].unknown,true);assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-resume').length,1);
 await h.model.status(OP);assert.equal(h.model.snapshot().rows[0].attemptId,attempt);assert.equal(h.confirmations.length,1);
 await h.model.resume(OP);assert.notEqual(h.model.snapshot().rows[0].attemptId,attempt);assert.equal(h.confirmations.length,2);
 assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-resume').length,2);
});
test('cancelled permanent confirmation sends no write or attempt',async()=>{
 const h=fixture();h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status()]):status();await h.model.hydrate();h.confirm=false;
 await h.model.resume(OP);assert.equal(h.sequence,1000);assert.equal(h.calls.length,2);assert.match(h.confirmations[0],/Slet kontoen permanent/);assert.ok(h.confirmations[0].includes(TARGET));
});
test('active owner is mandatory even for full_admin; revoked owner data is cleared',async()=>{
 const h=fixture();h.role='expert';assert.equal(await h.model.hydrate(),false);assert.equal(h.calls.length,0);assert.equal(h.model.snapshot().denied,true);assert.equal(h.model.snapshot().profiles.length,0);
});
test('self, owner, permission-bearing, expert and unclassified targets cannot be prepared',async()=>{
 for(const target of [profile({id:OWNER}),profile({role:'owner'}),profile({user_permissions:[{permission_key:'full_admin',enabled:true}]})]){
  const h=fixture();await h.model.hydrate();h.model.setProfiles([target]);const before=h.calls.length;
  assert.equal(await h.model.prepare(target.id),false);assert.equal(h.calls.length,before);
 }
 for(const category of ['expert','owner','unknown']){
  const h=fixture();await h.model.hydrate();h.category=category;const before=h.calls.length;
  assert.equal(await h.model.prepare(TARGET),false);assert.equal(h.calls.length,before);
 }
 const h=fixture();await h.model.hydrate();h.issues=['ordinary-has-permissions'];assert.equal(await h.model.prepare(TARGET),false);
});
test('existing operation finder is used instead of duplicate prepare; requester HOLD is denied',async()=>{
 const h=fixture();await h.model.hydrate();h.handler=async()=>status('PG_STAGED_AUTH_PENDING');await h.model.prepare(TARGET);
 assert.equal(h.calls.at(-1).path,'find');assert.equal(h.model.snapshot().rows[0].operationId,OP);
 h.handler=async()=>({operationId:null,state:'HOLD_REQUESTER_CHANGED',complete:false});assert.equal(await h.model.prepare(TARGET),false);
 assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-prepare').length,0);
});
test('hard HOLD cannot resume, while post-PG Storage HOLD remains an explicit checked decision',async()=>{
 for(const [state,reason,expected] of [['HOLD_POLICY','PRIVILEGED_TARGET',0],['AUTH_ATTEMPTED','AUTH_GENERATION_CHANGED',0],['PG_STAGED_AUTH_PENDING','STORAGE_OWNERSHIP',1]]){
  const h=fixture();const value=status(state,{holdReason:reason});h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([value]):value;
  await h.model.hydrate();await h.model.resume(OP);assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-resume').length,expected);
 }
});
test('only a known immutable pre-PG HOLD releases the next explicit prepare UUID',async()=>{
 for(const state of ['HOLD_ACTIVITY_CHANGED','HOLD_POLICY']){
  const h=fixture();await h.model.hydrate();let existing=null;
  h.handler=async(path,body)=>path==='find'?existing||{operationId:null,state:'NONE',complete:false}
   :body.operation==='account-erasure-prepare'?status('PREPARED',{operationId:body.operationId})
   :body.operation==='account-erasure-resume'?status(state,{operationId:body.operationId,holdReason:state==='HOLD_POLICY'?'REFERENCE_POLICY':'ACTIVITY_CHANGED'})
   :status('PREPARED',{operationId:body.operationId});
  await h.model.prepare(TARGET);const first=h.model.snapshot().rows[0].operationId;await h.model.resume(first);
  assert.equal(h.model.snapshot().rows[0].status.state,state);const before=h.calls.length;
  await h.model.prepare(TARGET);const rows=h.model.snapshot().rows;
  assert.equal(rows.length,2);assert.equal(rows[0].operationId,first);assert.notEqual(rows[1].operationId,first);
  assert.deepEqual(h.calls.slice(before).map(call=>call.body.operation||call.path),['find','account-erasure-prepare']);
  assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-resume').length,1,'no implicit resume');
 }
 for(const [state,reason] of [['PREPARED',null],['PG_STAGED_AUTH_PENDING','STORAGE_OWNERSHIP']]){
  const h=fixture();await h.model.hydrate();let existing=null;
  h.handler=async(path,body)=>path==='find'?existing||{operationId:null,state:'NONE',complete:false}:status(state,{operationId:body.operationId,holdReason:reason});
  await h.model.prepare(TARGET);existing=h.model.snapshot().rows[0].status;await h.model.prepare(TARGET);
  assert.equal(h.model.snapshot().rows.length,1);assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-prepare').length,1);
 }
 const h=fixture();await h.model.hydrate();h.handler=async(path)=>path==='find'?{operationId:null,state:'NONE',complete:false}:Promise.reject(Error('unknown'));
 await h.model.prepare(TARGET);await h.model.prepare(TARGET);
 const attempts=h.calls.filter(call=>call.body.operation==='account-erasure-prepare');assert.equal(attempts[0].body.operationId,attempts[1].body.operationId);
});
test('unknown/noncanonical positive status cannot masquerade as completion',async()=>{
 for(const value of [status('COMPLETE',{authAbsent:false}),status('COMPLETE',{d1DeletedCount:null}),status('PREPARED',{authDeleted:true}),status('COMPLETE',{holdReason:'TARGET_MISSING'}),status('COMPLETE',{pgStageCommitted:false}),status('COMPLETE',{d1DeletedCount:-1})])assert.throws(()=>checkedAccountErasureStatus(value));
 const h=fixture();h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status()]):body.operation==='account-erasure-resume'?status('COMPLETE',{authAbsent:false}):status();
 await h.model.hydrate();assert.equal(await h.model.resume(OP),false);const row=h.model.snapshot().rows[0];assert.equal(row.unknown,true);assert.equal(row.status.complete,false);
});
test('response must remain bound to operation and target; missing list row never means complete',async()=>{
 const h=fixture();h.handler=async()=>list([status()]);await h.model.hydrate();h.handler=async()=>list([]);await h.model.hydrate();assert.equal(h.model.snapshot().rows[0].status.complete,false);
 h.handler=async()=>status('COMPLETE',{targetUserId:uid(99)});assert.equal(await h.model.status(OP),false);assert.equal(h.model.snapshot().rows[0].status.complete,false);
 h.handler=async()=>status('COMPLETE',{operationId:uid(99)});assert.equal(await h.model.status(OP),false);
});
test('bounded ordered keyset list discovers later pending records, including HOLDs',async()=>{
 const h=fixture();const first=Array.from({length:64},(_,i)=>status('HOLD_POLICY',{operationId:uid(100+i),holdReason:'REFERENCE_POLICY'}));
 h.handler=async()=>({...list(first),truncated:true});await h.model.hydrate();h.handler=async()=>list([status('PG_STAGED_AUTH_PENDING',{operationId:uid(164)})]);
 await h.model.hydrate(true);assert.equal(h.calls.at(-1).body.afterOperationId,uid(163));assert.equal(h.model.snapshot().rows.length,65);
 for(const body of [list([status(),status()]),list([status('COMPLETE')]),{...list([status()]),truncated:true},list([status('PREPARED',{authUserCreatedAt:'private'})])]){
  const x=fixture();x.handler=async()=>body;assert.equal(await x.model.hydrate(),false);assert.equal(x.model.snapshot().ready,false);
 }
});
test('logout/account switch and tab destruction ignore late successful writes',async()=>{
 for(const leave of ['logout','account-switch','tab']){
  const h=fixture();h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status()]):status();await h.model.hydrate();
  let resolve;h.handler=async(_,body)=>body.operation==='account-erasure-resume'?new Promise(done=>{resolve=done;}):status();const pending=h.model.resume(OP);
  while(!resolve)await new Promise(done=>setImmediate(done));const emissions=h.updates.length;if(leave!=='tab')h.current=false;h.model.destroy();resolve(status('COMPLETE'));
  assert.equal(await pending,false,leave);assert.equal(h.updates.length,emissions,leave);assert.equal(h.model.snapshot().rows.length,0,leave);
 }
});
test('identity change during confirmation prevents the write',async()=>{
 const h=fixture();h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status()]):status();await h.model.hydrate();
 h.confirmations.push=()=>{h.current=false;return 1;};await h.model.resume(OP);
 assert.equal(h.calls.filter(call=>call.body.operation==='account-erasure-resume').length,0);assert.equal(h.sequence,1000);
});
class Host{
 constructor(){this.nodes=new Map();this.isConnected=true;}
 set innerHTML(value){this.html=value;this.nodes=new Map();for(const match of value.matchAll(/data-erasure-([a-z]+)(?:="([^"]*)")?/g)){
  const key='[data-erasure-'+match[1]+']',node={dataset:{},value:'',disabled:false};node.dataset['erasure'+match[1][0].toUpperCase()+match[1].slice(1)]=match[2]||'';
  this.nodes.set(key,[...(this.nodes.get(key)||[]),node]);
 }}
 querySelector(key){return this.nodes.get(key)?.[0]||null;}
 querySelectorAll(key){return this.nodes.get(key)||[];}
}
test('normal DOM buttons dispatch list/status/confirmed resume and escape labels',async()=>{
 const h=fixture({render:true});h.model.setProfiles([profile({display_name:'<img src=x onerror=bad>'})]);
 assert.ok(!h.host.html.includes('<img src=x'));assert.ok(h.host.html.includes('&lt;img'));
 h.handler=async(_,body)=>body.operation==='account-erasure-list'?list([status('AUTH_ABSENT_D1_PENDING')]):body.operation==='account-erasure-resume'?status('COMPLETE'):status('AUTH_ABSENT_D1_PENDING');
 h.host.querySelector('[data-erasure-list]').onclick();while(h.model.snapshot().busy)await new Promise(done=>setImmediate(done));
 h.host.querySelector('[data-erasure-resume]').onclick();while(h.model.snapshot().busy)await new Promise(done=>setImmediate(done));
 assert.equal(h.model.snapshot().rows[0].status.complete,true);assert.ok(h.host.html.includes('bekræftet afsluttet i de aktive lagre'));assert.equal(h.host.querySelector('[data-erasure-resume]'),null);
});
test('actual dashboard wrapper hydrates server cases before profiles and cleans up on identity change',async()=>{
 const start=dashboard.indexOf('async function renderOwnerUsers(){'),end=dashboard.indexOf('async function renderUsers(){',start);assert.ok(start>=0&&end>start);
 const calls=[];let release,callback,dependencies,transport;const host={isConnected:true,remove(){this.isConnected=false;calls.push('remove');}};
 const context={state:{access:{profile:{role:'owner',is_active:true}},tab:'users',profiles:[]},adminViewEpoch:1,authIdentityEpoch:()=>1,currentSession:()=>({user:{id:OWNER}}),
  document:{createElement:()=>host},content:{before(){},set innerHTML(value){},insertAdjacentHTML(){}},myAccess(){},loadAdminAccountCategories(){},crypto:{randomUUID:()=>uid(900)},window:{confirm:()=>false},PUBLIC_CONFIG:{supabaseUrl:'https://fixture.invalid'},authorizedFetch:(...args)=>{transport=args;},
  mountOwnerAccountErasure:(_host,deps)=>{dependencies=deps;return{hydrate(){calls.push('list');return new Promise(done=>{release=done;});},setProfiles(){calls.push('profiles-ready');},destroy(){calls.push('destroy');}};},
  onAuthChange:fn=>{callback=fn;return()=>{};},renderUsers:async()=>{calls.push('profiles');},moduleGuide:()=>'',bindModuleGuide(){},disposeOwnerAccountErasure:null};
 const pending=runInNewContext(dashboard.slice(start,end)+'\nrenderOwnerUsers()',context);assert.deepEqual(calls,['list']);release();await pending;assert.deepEqual(calls,['list','profiles','profiles-ready']);
 await dependencies.request('trip-log',{operation:'account-erasure-status',operationId:OP});
 assert.equal(transport[0],'https://fixture.invalid/functions/v1/trip-log');assert.equal(transport[2].retry401,false);assert.equal(transport[2].expectedUserId,OWNER);assert.equal(transport[2].consumeJson,true);
 await dependencies.request('find',{p_target:TARGET});assert.equal(transport[0],'https://fixture.invalid/rest/v1/rpc/find_account_erasure_operation');
 context.currentSession=()=>null;callback();assert.deepEqual(calls.slice(-2),['destroy','remove']);
 calls.length=0;context.state.access.profile.role='expert';await runInNewContext(dashboard.slice(start,end)+'\nrenderOwnerUsers()',context);assert.deepEqual(calls,['profiles']);
});
for(const {name,run} of cases){await run();console.log('PASS owner UI: '+name);}
console.log(`Owner account-erasure UI: ${cases.length}/${cases.length} PASS; isolated contracts only, no live deletion`);
