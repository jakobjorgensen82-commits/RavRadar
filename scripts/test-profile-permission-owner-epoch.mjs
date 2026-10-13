import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Actual auth/profile and permissions implementations through the existing VM
// seam. Only module declarations and browser storage/HTTP/timers are supplied.
// These are client-result guards, not a hosted server-RLS or admin-access proof.
const body = name => fs.readFileSync(new URL(`../js/services/${name}.js`, import.meta.url), 'utf8')
  .replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '');
const authBody = body('auth-service'), permissionsBody = body('permissions-service');
const ownerA = '11111111-1111-4111-8111-111111111111';
const ownerB = '22222222-2222-4222-8222-222222222222';
const config = { supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'synthetic-public-key' };
const sessionFor = (owner = ownerA, token = 'synthetic-original') => ({
  access_token: token, refresh_token: 'synthetic-refresh', expires_at: 9_999_999_999, user: { id: owner },
});
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function scenario(caller, action, { hydrate = false } = {}) {
  const heldPath = caller === 'permissions' ? '/rest/v1/user_permissions' : '/rest/v1/profiles';
  const profile = { id: ownerA, role: caller === 'owner-access' ? 'owner' : 'expert', is_active: true };
  const initial = sessionFor();
  if (hydrate) initial.user = {};
  const stored = new Map([['ravradar-auth-session', JSON.stringify(initial)]]);
  const reached = deferred(), released = deferred();
  const timers = new Set(), operations = [], requests = [];
  let nextOwner = ownerA, refreshes = 0, hydrations = 0;
  const authScope = {
    PUBLIC_CONFIG: config, AbortController, DOMException,
    localStorage: {
      getItem: key => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, String(value)), removeItem: key => stored.delete(key),
    },
    setTimeout(callback, delay) {
      const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.add(timer); return timer;
    },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    async fetch(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, config.supabaseUrl, 'No external transport');
      if(url.pathname==='/rest/v1/rpc/record_account_activity'){assert.equal(options.method,'POST');assert.equal(options.body,'{}');return Response.json({}, {status:503});}
      if (url.pathname === '/auth/v1/user') { hydrations += 1; return Response.json({ id: ownerA }); }
      if (url.pathname === '/auth/v1/logout') return Response.json({});
      if (url.pathname === '/auth/v1/token') {
        if (url.searchParams.get('grant_type') === 'refresh_token') {
          refreshes += 1;
          return Response.json(sessionFor(ownerA, 'synthetic-renewed'));
        }
        assert.equal(url.searchParams.get('grant_type'), 'password');
        return Response.json(sessionFor(nextOwner, 'synthetic-new-login'));
      }
      assert.ok(['/rest/v1/profiles', '/rest/v1/user_permissions'].includes(url.pathname));
      assert.equal(options.headers.Authorization, 'Bearer synthetic-original');
      assert.equal(url.searchParams.get(url.pathname.endsWith('profiles') ? 'id' : 'user_id'), `eq.${ownerA}`);
      requests.push(url.pathname);
      return { ok: true, status: 200, async json() {
        if (url.pathname === heldPath) { reached.resolve(); await released.promise; }
        return url.pathname.endsWith('profiles') ? [structuredClone(profile)] : [{ permission_key: 'handbook_view' }];
      } };
    },
  };
  vm.runInNewContext(`${authBody}\nthis.api = { getCurrentProfile, getCurrentRole, authorizedFetch,
    currentSession, requireFreshSession, authIdentityEpoch, refreshSession, signOut, signInWithPassword };`, authScope,
  { filename: 'actual-auth-with-held-profile-http.js' });
  const auth = authScope.api;
  const permissionsScope = { ...auth, PUBLIC_CONFIG: config };
  vm.runInNewContext(`${permissionsBody}\nthis.myAccess = myAccess;`, permissionsScope,
    { filename: 'actual-permissions-with-actual-auth.js' });
  const track = promise => { operations.push(promise); return promise; };
  let result, chosen, saved;
  try {
    const pending = track((caller === 'profile' ? auth.getCurrentProfile() : permissionsScope.myAccess())
      .then(value => ({ ok: true, value }), error => ({ ok: false, error })));
    await Promise.race([reached.promise, pending.then(() => { throw new Error('Held private body was not reached'); })]);
    if (action === 'renewal') await track(auth.refreshSession({ force: true }));
    else {
      await track(auth.signOut());
      nextOwner = action === 'different-owner-login' ? ownerB : ownerA;
      await track(auth.signInWithPassword('synthetic@example.invalid', 'synthetic-only'));
    }
    chosen = auth.currentSession(); saved = stored.get('ravradar-auth-session');
    released.resolve();
    result = await pending;
  } finally {
    released.resolve();
    await Promise.allSettled(operations);
    const leaked = timers.size;
    for (const timer of timers) clearTimeout(timer);
    assert.equal(leaked, 0, 'Actual auth timeout guards must already be cleared');
  }
  assert.equal(auth.currentSession(), chosen, 'Late body may not replace the chosen session');
  assert.equal(stored.get('ravradar-auth-session'), saved);
  assert.equal(chosen.user.id, nextOwner);
  assert.equal(requests.length, caller === 'permissions' ? 2 : 1);
  assert.equal(refreshes, action === 'renewal' ? 1 : 0);
  assert.equal(hydrations, hydrate ? 1 : 0);
  assert.equal(auth.authIdentityEpoch(), action === 'renewal' ? 0 : 2);
  if (action === 'renewal') {
    assert.equal(result.ok, true, result.error?.message);
    if (caller === 'profile') assert.deepEqual(result.value, profile);
    else {
      assert.deepEqual(result.value.profile, profile);
      assert.equal(result.value.permissions.has(caller === 'owner-access' ? 'full_admin' : 'handbook_view'), true);
    }
  } else {
    assert.equal(result.ok, false,
      `${caller} returned an old private profile/permission result after ${action}`);
    assert.match(result.error.message, /Kontoen blev ændret/);
  }
}
test('actual initial user hydration still allows same-login permission renewal', () =>
  scenario('permissions', 'renewal', { hydrate: true }));

for (const caller of ['profile', 'owner-access', 'permissions']) {
  for (const action of ['renewal', 'same-owner-login', 'different-owner-login']) {
    test(`${caller}: held body ${action} preserves the original login intent`, () => scenario(caller, action));
  }
}

// listProfiles is a separate normal caller from getCurrentProfile/myAccess.
async function profilesListScenario(action,{hydrate=false,render=false}={}){
  const initial=sessionFor();if(hydrate)initial.user={};
  const bank=new Map([['ravradar-auth-session',JSON.stringify(initial)]]),timers=new Set(),operations=[];
  const reached=deferred(),release=deferred(),authRelease=deferred();
  const rows=[{id:ownerA,email:'synthetic-private-profile@example.invalid',role:'expert',is_active:true,user_permissions:[]}];
  let nextOwner=ownerA,holdAuth=false,requests=0,hydrations=0,refreshes=0;
  const scope={PUBLIC_CONFIG:config,AbortController,DOMException,localStorage:{getItem:k=>bank.get(k)??null,setItem:(k,v)=>bank.set(k,String(v)),removeItem:k=>bank.delete(k)},
    setTimeout(fn,ms){const timer=setTimeout(()=>{timers.delete(timer);fn();},ms);timers.add(timer);return timer;},clearTimeout(timer){clearTimeout(timer);timers.delete(timer);},
    async fetch(input,options){const url=new URL(input);assert.equal(url.origin,config.supabaseUrl);
      if(url.pathname==='/rest/v1/rpc/record_account_activity'){assert.equal(options.method,'POST');assert.equal(options.body,'{}');return Response.json({}, {status:503});}
      if(url.pathname==='/auth/v1/user'){hydrations++;return Response.json({id:ownerA});}
      if(url.pathname==='/auth/v1/logout'){if(holdAuth)await authRelease.promise;return Response.json({});}
      if(url.pathname==='/auth/v1/token'){
        if(url.searchParams.get('grant_type')==='refresh_token'){refreshes++;return Response.json(sessionFor(ownerA,'synthetic-renewed'));}
        assert.equal(url.searchParams.get('grant_type'),'password');if(holdAuth)await authRelease.promise;return Response.json(sessionFor(nextOwner,'synthetic-new-login'));
      }
      assert.equal(url.pathname,'/rest/v1/profiles');assert.equal(url.searchParams.get('order'),'email');assert.equal(options.headers.Authorization,'Bearer synthetic-original');requests++;
      return{ok:true,status:200,async json(){reached.resolve();await release.promise;return structuredClone(rows);}};
    }};
  vm.runInNewContext(`${authBody}\nthis.api={authIdentityEpoch,currentSession,requireFreshSession,authorizedFetch,getCurrentProfile,signOut,signInWithPassword,refreshSession};`,scope);
  const auth=scope.api,permissions={...auth,PUBLIC_CONFIG:config};
  vm.runInNewContext(`${permissionsBody}\nthis.listProfiles=listProfiles;this.PERMISSIONS=PERMISSIONS;this.EXPERT_PERMISSIONS=EXPERT_PERMISSIONS;`,permissions);
  const track=p=>{operations.push(p);return p;};
  const host={innerHTML:'',querySelectorAll:()=>[]},state={access:{profile:{role:'owner'},permissions:new Set()},profiles:[]};
  const view={state,content:{innerHTML:''},document:{querySelector:selector=>{assert.equal(selector,'#profilesList');return host;}},listProfiles:permissions.listProfiles,PERMISSIONS:permissions.PERMISSIONS,EXPERT_PERMISSIONS:permissions.EXPERT_PERMISSIONS,esc:String};
  if(render){const dashboard=fs.readFileSync(new URL('../js/ui/admin-dashboard.js',import.meta.url),'utf8');const start=dashboard.indexOf('async function renderUsers(){'),end=dashboard.indexOf('async function renderHandbook(){',start);assert.ok(start>=0&&end>start);vm.runInNewContext(dashboard.slice(start,end)+'\nthis.renderUsers=renderUsers;',view);}
  let result;
  try{
    const pending=track((render?view.renderUsers():permissions.listProfiles()).then(value=>({value}),error=>({error})));
    await Promise.race([reached.promise,pending.then(()=>{throw new Error('Normal profiles body was not reached');})]);
    if(action==='renewal')await track(auth.refreshSession({force:true}));
    else if(action==='logout')await track(auth.signOut());
    else if(action==='pending-login'||action==='pending-logout'){
      holdAuth=true;nextOwner=ownerB;
      track((action==='pending-login'?auth.signInWithPassword('synthetic@example.invalid','synthetic-only'):auth.signOut()).catch(error=>({error})));
    }else if(action!=='unchanged'){
      await track(auth.signOut());nextOwner=action==='different-owner-login'?ownerB:ownerA;
      await track(auth.signInWithPassword('synthetic@example.invalid','synthetic-only'));
    }
    const chosen=auth.currentSession(),saved=bank.get('ravradar-auth-session');
    release.resolve();result=await pending;
    assert.equal(auth.currentSession(),chosen);assert.equal(bank.get('ravradar-auth-session'),saved);
    if(action==='renewal'||action==='unchanged'){
      assert.equal(result.error,undefined);if(render){assert.match(host.innerHTML,/synthetic-private-profile@example.invalid/);assert.deepEqual(state.profiles,rows);}else assert.deepEqual(result.value,rows);
    }else if(render){assert.doesNotMatch(host.innerHTML,/synthetic-private-profile@example.invalid/);assert.deepEqual(state.profiles,[]);assert.match(host.innerHTML,/Kontoen blev ændret/);}
    else{assert.equal(result.value,undefined,'Old private profiles must not reach the caller after an identity choice');assert.match(result.error?.message||'',/Kontoen blev ændret/);}
  }finally{release.resolve();authRelease.resolve();await Promise.allSettled(operations);const leaked=timers.size;for(const timer of timers)clearTimeout(timer);assert.equal(leaked,0);}
  assert.equal(requests,1);assert.equal(hydrations,hydrate?1:0);assert.equal(refreshes,action==='renewal'?1:0);
}
for(const action of ['unchanged','renewal','logout','same-owner-login','different-owner-login','pending-login','pending-logout'])test('profiles-list: held body '+action,()=>profilesListScenario(action));
test('profiles-list: initial hydration and same-login renewal preserved',()=>profilesListScenario('renewal',{hydrate:true}));
test('profiles-list: actual normal admin renderer rejects late old profile body',()=>profilesListScenario('same-owner-login',{render:true}));
test('profiles-list: actual normal admin renderer retains legitimate renewal',()=>profilesListScenario('renewal',{render:true}));

// Reuse the same actual module bodies above, with only own synthetic transport,
// session storage and a virtual request clock. Never a profile/auth facade.
async function jsonConsumerScenario(caller,mode){
 const profile={id:ownerA,role:'expert',is_active:true},initial=sessionFor();
 const saved=new Map([['ravradar-auth-session',JSON.stringify(initial)]]),timers=new Map(),reached=deferred(),release=deferred();
 let now=0,id=0,reads=0,requests=0,settled=false,operation;
 const heldPath=caller==='permissions'?'/rest/v1/user_permissions':'/rest/v1/profiles';
 const scope={PUBLIC_CONFIG:config,AbortController,DOMException,
  localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,String(value)),removeItem:key=>saved.delete(key)},
  setTimeout(callback,ms){const timer=++id;timers.set(timer,{at:now+ms,callback});return timer;},clearTimeout:timer=>timers.delete(timer),
  async fetch(input,options){const url=new URL(input);assert.equal(url.origin,config.supabaseUrl);if(url.pathname==='/rest/v1/rpc/record_account_activity'){assert.equal(options.method,'POST');assert.equal(options.body,'{}');return Response.json({}, {status:503});}assert.equal(options.headers.Authorization,'Bearer synthetic-original');requests++;
   const selected=url.pathname===heldPath;assert.ok(['/rest/v1/profiles','/rest/v1/user_permissions'].includes(url.pathname));
   return{ok:!(mode==='http-error'&&selected),status:mode==='http-error'&&selected?503:200,async json(){
    if(selected){reads++;reached.resolve();await release.promise;if(mode==='malformed')throw new SyntaxError('SYNTHETIC_UNSAFE_BODY');if(mode==='null')return null;if(mode==='object')return {};if(mode==='empty')return [];}
    return url.pathname==='/rest/v1/profiles'?[structuredClone(profile)]:[{permission_key:'handbook_view'}];
   }};
  }};
 vm.runInNewContext(`${authBody}\nthis.api={getCurrentProfile,authorizedFetch,currentSession,requireFreshSession,authIdentityEpoch};`,scope);
 const access={...scope.api,PUBLIC_CONFIG:config};vm.runInNewContext(`${permissionsBody}\nthis.api={myAccess,listProfiles};`,access);
 const original=JSON.stringify([...saved]);
 try{
  const promise=caller==='profile'?scope.api.getCurrentProfile():caller==='list'?access.api.listProfiles():access.api.myAccess();
  operation=promise.then(value=>{settled=true;return{value};},error=>{settled=true;return{error};});
  if(mode==='http-error'){const outcome=await operation;assert.match(outcome.error.message,/503/);assert.equal(reads,0);return;}
  await reached.promise;await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,false);
  if(mode==='deadline'){
   now=12_001;for(const[timer,job]of[...timers])if(job.at<=now){timers.delete(timer);job.callback();}
   await new Promise(resolve=>setImmediate(resolve));assert.equal(settled,true,caller+' must finish rather than keep an unguarded JSON body pending');
   assert.match((await operation).error.message,/svarede ikke i tide/);
  }else{
   release.resolve();const outcome=await operation;
   if(['malformed','null','object'].includes(mode)){assert.ok(outcome.error,'Unknown JSON shape must not become empty successful access');assert.doesNotMatch(outcome.error.message,/SYNTHETIC_UNSAFE_BODY/);}
   else{assert.equal(outcome.error,undefined);if(mode==='empty'){if(caller==='profile')assert.equal(outcome.value,null);else if(caller==='list')assert.deepEqual(outcome.value,[]);else assert.equal(outcome.value.permissions.size,0);}
    else if(caller==='profile')assert.deepEqual(outcome.value,profile);else if(caller==='list')assert.deepEqual(outcome.value,[profile]);else assert.equal(outcome.value.permissions.has('handbook_view'),true);}
  }
  assert.equal(requests,caller==='permissions'?2:1,'No retry or extra identity lookup');
 }finally{release.resolve();if(operation)await operation;assert.equal(timers.size,0);assert.equal(JSON.stringify([...saved]),original);}
}
for(const caller of ['profile','list','permissions'])for(const mode of ['deadline','malformed','null','object','empty','ordinary','http-error'])
 test('profile JSON consumer: '+caller+' '+mode,()=>jsonConsumerScenario(caller,mode));

// The real role caller must not turn a contradictory profile receipt into a
// role. This uses actual auth/JSON consumption, not a profile/auth facade.
async function profileReadbackScenario(rows, expectedRole, { renewal = false } = {}) {
  const bank = new Map([['ravradar-auth-session', JSON.stringify(sessionFor())]]);
  const reached = deferred(), release = deferred(), timers = new Set(), operations = [];
  let profiles = 0, refreshes = 0;
  const scope = {
    PUBLIC_CONFIG: config, AbortController, DOMException,
    localStorage: {
      getItem: key => bank.get(key) ?? null,
      setItem: (key, value) => bank.set(key, String(value)), removeItem: key => bank.delete(key),
    },
    setTimeout(callback, delay) {
      const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
      timers.add(timer); return timer;
    },
    clearTimeout(timer) { clearTimeout(timer); timers.delete(timer); },
    async fetch(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, config.supabaseUrl, 'Only synthetic local HTTP responses');
      if(url.pathname==='/rest/v1/rpc/record_account_activity'){assert.equal(options.method,'POST');assert.equal(options.body,'{}');return Response.json({}, {status:503});}
      if (url.pathname === '/auth/v1/token') {
        assert.equal(url.searchParams.get('grant_type'), 'refresh_token');
        refreshes += 1;
        return Response.json(sessionFor(ownerA, 'synthetic-renewed'));
      }
      assert.equal(url.pathname, '/rest/v1/profiles');
      assert.equal(url.searchParams.get('id'), `eq.${ownerA}`);
      assert.equal(url.searchParams.get('limit'), '1');
      assert.equal(options.headers.Authorization, 'Bearer synthetic-original');
      profiles += 1;
      return { ok: true, status: 200, async json() {
        reached.resolve(); await release.promise; return structuredClone(rows);
      } };
    },
  };
  vm.runInNewContext(`${authBody}\nthis.api = { getCurrentRole, refreshSession, currentSession, authIdentityEpoch };`,
    scope, { filename: 'actual-auth-profile-readback.js' });
  const auth = scope.api;
  const pending = auth.getCurrentRole().then(value => ({ value }), error => ({ error }));
  operations.push(pending);
  try {
    await Promise.race([reached.promise, pending.then(() => { throw new Error('Actual profile body was not reached'); })]);
    if (renewal) {
      const renewing = auth.refreshSession({ force: true }); operations.push(renewing); await renewing;
    }
    const chosen = auth.currentSession(), stored = bank.get('ravradar-auth-session');
    release.resolve();
    const outcome = await pending;
    assert.equal(auth.currentSession(), chosen);
    assert.equal(bank.get('ravradar-auth-session'), stored);
    assert.equal(auth.currentSession().user.id, ownerA);
    assert.equal(auth.authIdentityEpoch(), 0, 'Same-login renewal must not become another login intent');
    if (expectedRole === undefined) {
      assert.equal(outcome.value, undefined, 'Malformed or another-owner receipt must not supply a role');
      assert.equal(outcome.error?.message, 'Brugerprofilen kunne ikke hentes sikkert.');
    } else {
      assert.equal(outcome.error, undefined);
      assert.equal(outcome.value, expectedRole);
    }
    assert.equal(profiles, 1);
    assert.equal(refreshes, renewal ? 1 : 0);
  } finally {
    release.resolve(); await Promise.allSettled(operations);
    const remaining = timers.size;
    for (const timer of timers) clearTimeout(timer);
    assert.equal(remaining, 0, 'Actual auth request guards must already be closed');
  }
}
for (const [label, rows] of [
  ['foreign owner', [{ id: ownerB, role: 'owner', is_active: true }]],
  ['missing owner id', [{ role: 'owner', is_active: true }]],
  ['null profile', [null]],
  ['array profile', [[]]],
  ['primitive profile', ['owner']],
  ['multiple rows', [{ id: ownerA, role: 'owner' }, { id: ownerA, role: 'owner' }]],
]) test('profile readback: reject ' + label, () => profileReadbackScenario(rows));
test('profile readback: empty remains no role', () => profileReadbackScenario([], null));
test('profile readback: one exact owner retains role', () =>
  profileReadbackScenario([{ id: ownerA, role: 'owner', is_active: true }], 'owner'));
test('profile readback: exact owner permits same-login renewal during JSON body', () =>
  profileReadbackScenario([{ id: ownerA, role: 'owner', is_active: true }], 'owner', { renewal: true }));

// STATISTICS-PREFERENCE normal account -> permissions -> actual auth chain.
// Only browser DOM/storage and fixed synthetic HTTP responses are supplied.
test('statistics preference: normal default ON, explicit OFF, owner-switch logout and late-result isolation', async()=>{
 const preferenceSource=body('permissions-service'),accountSource=fs.readFileSync(new URL('../js/ui/account-panel.js',import.meta.url),'utf8').replace(/^import[^\n]+\r?\n/gm,'').replace(/^export\s+/gm,'');
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 for(const mode of ['default-off-readback','switch-read','logout-write','http-failure','malformed-readback']){
  const originals=new Map([['pending','own-pending'],['outbox','own-outbox'],['backup','own-backup'],['tombstone','own-tombstone']]);
  const bank=new Map(originals);bank.set('ravradar-auth-session',JSON.stringify(sessionFor()));
  const values=new Map(),calls=[],held=[],timers=new Set();let loginOwner=ownerA;
  const authScope={PUBLIC_CONFIG:config,AbortController,DOMException,
   localStorage:{getItem:k=>bank.get(k)??null,setItem:(k,v)=>bank.set(k,String(v)),removeItem:k=>bank.delete(k)},
   setTimeout(fn,ms){const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);return id;},clearTimeout(id){clearTimeout(id);timers.delete(id);},
   async fetch(input,options){const url=new URL(input);assert.equal(url.origin,config.supabaseUrl);
    if(url.pathname==='/auth/v1/token')return Response.json(sessionFor(loginOwner,'token-'+loginOwner));
    if(url.pathname==='/auth/v1/logout')return Response.json({});
    if(url.pathname==='/rest/v1/rpc/record_account_activity')return Response.json({}, {status:503});
    assert.ok(['/rest/v1/rpc/get_own_statistics_preference','/rest/v1/rpc/enable_own_statistics_preference','/rest/v1/rpc/disable_own_statistics_preference'].includes(url.pathname));
    assert.equal(options.method,'POST');assert.equal(options.body,'{}','Browser cannot select another owner/time or submit trip data');
    const owner=options.headers.Authorization==='Bearer synthetic-original'?ownerA:options.headers.Authorization==='Bearer token-'+ownerB?ownerB:null;
    assert.ok(owner);const verb=url.pathname.split('/').at(-1).split('_')[0];calls.push({owner,verb});
    if(verb==='enable')values.set(owner,true);if(verb==='disable')values.set(owner,false);
    const value={enabled:values.has(owner)?values.get(owner):true,source:values.has(owner)?'stored':'default'};
    if(mode==='http-failure')return Response.json({}, {status:503});
    if(mode==='malformed-readback')return Response.json({enabled:false,source:'default'});
    if((mode==='switch-read'&&verb==='get')||(mode==='logout-write'&&verb==='disable'))
     return {ok:true,status:200,json:()=>new Promise(resolve=>held.push({resolve,value,owner}))};
    return Response.json(value);
   }};
  vm.runInNewContext(authBody+'\nthis.api={authIdentityEpoch,authorizedFetch,currentSession,requireFreshSession,getCurrentProfile,onAuthChange,signInWithPassword,signOut};',authScope);
  const auth=authScope.api,permissionScope={...auth,PUBLIC_CONFIG:config};
  vm.runInNewContext(preferenceSource+'\nthis.api={getOwnStatisticsPreference,setOwnStatisticsPreference};',permissionScope);
  let nodes=new Map();const events=new Map();
  const node=()=>({checked:false,disabled:true,indeterminate:false,isConnected:true,textContent:'',handlers:new Map(),addEventListener(n,f){this.handlers.set(n,f);}});
  const content={_html:'',get innerHTML(){return this._html;},set innerHTML(v){this._html=v;for(const n of nodes.values())n.isConnected=false;nodes=new Map();if(v.includes('id="accountStatisticsPreference"')){for(const id of['#accountStatisticsPreference','#accountStatisticsStatus'])nodes.set(id,node());}},querySelector:s=>nodes.get(s)??null};
  const dialog={open:false,querySelector:()=>content,showModal(){this.open=true;},addEventListener(n,f){if(!events.has(n))events.set(n,new Set());events.get(n).add(f);},removeEventListener(n,f){events.get(n)?.delete(f);},close(){this.open=false;for(const fn of [...events.get('close')??[]])fn();}};
  const ui={...auth,...permissionScope.api,authEnabled:()=>true,t:key=>key};
  vm.runInNewContext(accountSource+'\nthis.openAccountDialog=openAccountDialog;',ui);
  const open=()=>{ui.openAccountDialog(dialog);return nodes.get('#accountStatisticsPreference');};
  try{
   const input=open();assert.equal(input.disabled,true);assert.equal(input.indeterminate,true);await tick();
   if(mode==='switch-read'){
    assert.equal(held.length,1);loginOwner=ownerB;await auth.signInWithPassword('other@example.invalid','synthetic-only');
    assert.equal(input.disabled,true);assert.equal(input.indeterminate,true);
    values.set(ownerB,false);const next=open();await tick();assert.equal(held.length,2);
    held[0].resolve(held[0].value);await tick();assert.equal(next.indeterminate,true,'Old owner result never initializes new owner checkbox');
    held[1].resolve(held[1].value);await tick();assert.equal(next.checked,false);assert.equal(next.indeterminate,false);assert.equal(next.disabled,false);
    assert.equal(auth.currentSession().user.id,ownerB);
   }else if(mode==='http-failure'||mode==='malformed-readback'){
    assert.equal(input.disabled,true);assert.equal(input.indeterminate,true,'Unknown is not default ON or stored OFF');
    assert.equal(nodes.get('#accountStatisticsStatus').textContent,'account.statisticsUnavailable');assert.equal(values.size,0);
   }else{
    assert.equal(input.checked,true,'Only server-confirmed missing preference defaults ON');assert.equal(input.disabled,false);
    assert.equal(values.size,0,'Default read does not backfill/write a preference');
    input.checked=false;const pending=input.handlers.get('change')();await tick();
    if(mode==='logout-write'){
     assert.equal(held.length,1);await auth.signOut();assert.equal(input.disabled,true);assert.equal(input.indeterminate,true);
     held[0].resolve(held[0].value);await pending;assert.equal(auth.currentSession(),null);assert.equal(input.indeterminate,true);assert.equal(nodes.get('#accountStatisticsStatus').textContent,'');
    }else{
     await pending;assert.equal(input.checked,false);assert.equal(input.disabled,false);assert.equal(values.get(ownerA),false);
     dialog.close();const reopened=open();await tick();assert.equal(reopened.checked,false,'Explicit OFF survives normal server readback/reopen');
     assert.equal(reopened.indeterminate,false);assert.deepEqual(calls.map(x=>x.verb),['get','disable','get']);
    }
   }
   for(const[k,v]of originals)assert.equal(bank.get(k),v,'Trip/outbox/backup/tombstone inputs stay untouched');
  }finally{for(const h of held)h.resolve(h.value);await tick();dialog.close();assert.equal(timers.size,0);}
 }
 // Assert the actual combined installation section, never a private SQL draft.
 const migrationSql=fs.readFileSync(new URL('../supabase/migrations/20261013210000_account_assistant_original_bound_successor.sql',import.meta.url),'utf8').replace(/\r\n?/g,'\n');
 const sectionStart='create table public.account_statistics_preferences (';
 const sectionEnd='grant execute on function public.disable_own_statistics_preference() to authenticated;';
 assert.equal(migrationSql.split(sectionStart).length,2,'Exactly one installed preference definition');
 assert.equal(migrationSql.split(sectionEnd).length,2,'Exactly one installed preference grant');
 const sectionOffset=migrationSql.indexOf(sectionStart),sectionEndOffset=migrationSql.indexOf(sectionEnd,sectionOffset);
 assert.ok(sectionEndOffset>sectionOffset,'Complete actual preference section');
 const sql=migrationSql.slice(sectionOffset,sectionEndOffset+sectionEnd.length);
 for(const name of['get','enable','disable'])assert.match(sql,new RegExp('create function public\\.'+name+'_own_statistics_preference\\(\\)'));
 assert.equal((sql.match(/own_user_id uuid := auth\.uid\(\)/g)||[]).length,3);
 assert.match(sql,/revoke all on table public\.account_statistics_preferences from public, anon, authenticated/);
 assert.doesNotMatch(sql,/update public\.(profiles|observations)|delete from|insert into public\.observations/i);
});


// Actual account renderer -> observation/auth callers; synthetic browser and HTTP only.
// This protects already-rendered private history, not hosted RLS or data deletion.
test('account history: rendered and pending views follow their exact owner lifetime', async () => {
  const accountSource = fs.readFileSync(new URL('../js/ui/account-panel.js', import.meta.url), 'utf8')
    .replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '');
  const appSource = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const closeWiring = appSource.split(/\r?\n/).filter(line => line.startsWith('function enableDialogClose(dialog)'));
  const openWiring = appSource.split(/\r?\n/).filter(line => line.startsWith('document.querySelector("#accountButton").addEventListener'));
  assert.equal(closeWiring.length, 1); assert.equal(openWiring.length, 1);
  const observationSource = fs.readFileSync(new URL('../js/services/observation-service.js', import.meta.url), 'utf8')
    .replace(/^import\s[\s\S]*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  const tick = () => new Promise(resolve => setImmediate(resolve));
  for (const mode of ['logout', 'switch', 'same-owner-login', 'renewal', 'expired-session', 'close', 'cancel', 'back',
    'pending-logout', 'pending-close-reopen']) {
    const originals = new Map([
      ['ravradar-observations-v2', '[]'], ['ravradar-observation-outbox-v1', '[]'],
      ['own-backup-sentinel', 'unchanged'], ['own-erasure-sentinel', 'unchanged'],
    ]);
    const storage = new Map(originals);
    storage.set('ravradar-auth-session', JSON.stringify(sessionFor()));
    const held = deferred(), reached = deferred(), timers = new Set(), requests = [];
    let loginOwner = ownerA, nodes = new Map();
    const rows = [{ id: 'own-history-row', user_id: ownerA, observed_at: '2026-01-02T12:00:00Z',
      zone_name: 'OWN-HISTORY-A', found: true, hunt_mode: 'beach', search_minutes: 30 }];
    const originalRows = JSON.stringify(rows);
    const authScope = {
      PUBLIC_CONFIG: config, AbortController, DOMException,
      localStorage: { getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
      setTimeout(fn, ms) { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; },
      clearTimeout(id) { clearTimeout(id); timers.delete(id); },
      async fetch(input, options) {
        const url = new URL(input);
        assert.equal(url.origin, config.supabaseUrl, 'No external transport');
        requests.push(url.pathname);
        if (url.pathname === '/auth/v1/token') {
          if (mode === 'expired-session' && url.searchParams.get('grant_type') === 'refresh_token')
            return Response.json({ message: 'synthetic refresh refusal' }, { status: 401 });
          return Response.json(sessionFor(loginOwner, 'synthetic-renewed'));
        }
        if (url.pathname === '/auth/v1/logout') return Response.json({});
        if (url.pathname === '/rest/v1/rpc/record_account_activity') {
          assert.equal(options.body, '{}'); return Response.json({}, { status: 503 });
        }
        assert.equal(url.pathname, '/functions/v1/trip-log');
        assert.equal(options.method, 'POST'); assert.equal(options.body, '{"limit":100}');
        assert.equal(options.headers.Authorization, 'Bearer synthetic-original');
        return { ok: true, status: 200, async json() {
          reached.resolve();
          if (mode.startsWith('pending-')) await held.promise;
          return { rows };
        } };
      },
    };
    vm.runInNewContext(authBody + '\nthis.api={authEnabled,authIdentityEpoch,currentSession,onAuthChange,authorizedFetch,requireFreshSession,assertAuthIdentitySettled,refreshSession,signInWithPassword,signOut}; this.listenerCount=()=>listeners.size;', authScope);
    const auth = authScope.api;
    const observationScope = { ...auth, PUBLIC_CONFIG: config, localStorage: authScope.localStorage };
    vm.runInNewContext(observationSource + '\nthis.api={getOwnTripObservations,getLocalObservations};', observationScope);
    const events = new Map();
    const node = () => ({ isConnected: true, disabled: false, textContent: '', handlers: new Map(),
      addEventListener(name, fn) { this.handlers.set(name, fn); } });
    const content = { _html: '', get innerHTML() { return this._html; },
      set innerHTML(value) {
        this._html = value;
        for (const n of nodes.values()) n.isConnected = false;
        nodes = new Map([...value.matchAll(/id="([^"]+)"/g)].map(match => ['#' + match[1], node()]));
      }, querySelector: key => nodes.get(key) ?? null };
    const closeButton = node(), accountButton = node(); let detailsCalls = 0;
    const dialog = { open: false, querySelector: key => key === '.dialog-close' ? closeButton : content, showModal() { this.open = true; },
      addEventListener(name, fn) { if (!events.has(name)) events.set(name, new Set()); events.get(name).add(fn); },
      removeEventListener(name, fn) { events.get(name)?.delete(fn); },
      close() { this.open = false; for (const fn of [...events.get('close') ?? []]) fn(); },
      cancel() { for (const fn of [...events.get('cancel') ?? []]) fn(); this.close(); } };
    const ui = { ...auth, ...observationScope.api, t: key => key, accountDialog: dialog,
      document: { querySelector: key => { assert.equal(key, '#accountButton'); return accountButton; } },
      ensureConditionDetails: async () => { detailsCalls++; }, userDataContext: () => ({}),
      formatDateTime: () => 'synthetic-date', formatNumber: String,
      ravScoreModelBinding: () => ({}), RAVSCORE_CALIBRATION_ELIGIBLE: false,
      accountTripBindingStatus: () => 'historical',
      getOwnStatisticsPreference: async () => ({ enabled: false, source: 'stored' }),
      setOwnStatisticsPreference: async () => { throw new Error('No preference write in history fixture'); },
    };
    vm.runInNewContext(accountSource + '\nthis.openAccountDialog=openAccountDialog;', ui);
    vm.runInNewContext(closeWiring[0] + '\nenableDialogClose(accountDialog);\n' + openWiring[0], ui);
    const openNormally = () => accountButton.handlers.get('click')();
    try {
      await openNormally();
      assert.equal(detailsCalls, 1, 'The actual app account-button caller ran');
      nodes.get('#tripHistoryLink').handlers.get('click')({ preventDefault() {} });
      await reached.promise; await tick();
      const pending = mode.startsWith('pending-');
      if (!pending) assert.match(content.innerHTML, /OWN-HISTORY-A/, mode + ': actual history rendered');
      else assert.doesNotMatch(content.innerHTML, /OWN-HISTORY-A/);
      const before = content.innerHTML;
      if (mode === 'renewal') {
        await auth.refreshSession({ force: true });
        assert.equal(auth.authIdentityEpoch(), 0);
        assert.equal(content.innerHTML, before, 'Legitimate same-login renewal keeps the history');
      } else if (mode === 'expired-session') {
        await assert.rejects(auth.refreshSession({ force: true }));
        assert.equal(auth.currentSession(), null, 'Normal failed renewal clears the actual session');
        assert.doesNotMatch(content.innerHTML, /OWN-HISTORY-A/, 'Normal auth expiry removes already rendered history');
        assert.match(content.innerHTML, /account.optional/);
      } else if (mode === 'logout' || mode === 'pending-logout') {
        await auth.signOut();
        assert.doesNotMatch(content.innerHTML, /OWN-HISTORY-A/, 'Logout removes already visible private rows');
        assert.match(content.innerHTML, /account.optional/);
      } else if (mode === 'switch' || mode === 'same-owner-login') {
        loginOwner = mode === 'switch' ? ownerB : ownerA;
        await auth.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
        assert.equal(auth.currentSession().user.id, loginOwner);
        assert.equal(auth.authIdentityEpoch(), 1);
        assert.doesNotMatch(content.innerHTML, /OWN-HISTORY-A/, 'A new login does not retain the prior view');
        assert.match(content.innerHTML, /account.signedIn/);
      } else if (mode === 'cancel') dialog.cancel();
      else if (mode === 'back') nodes.get('#tripHistoryBack').handlers.get('click')();
      else { closeButton.handlers.get('click')(); if (mode === 'pending-close-reopen') await openNormally(); }
      if (pending) {
        const chosen = content.innerHTML;
        held.resolve(); await tick();
        assert.equal(content.innerHTML, chosen, 'A late body cannot repopulate a closed or replaced view');
      }
      if (mode !== 'renewal') assert.doesNotMatch(content.innerHTML, /OWN-HISTORY-A/);
      if (['close', 'cancel'].includes(mode)) assert.equal(content.innerHTML, '');
      if (mode === 'back') assert.match(content.innerHTML, /account.signedIn/);
      assert.equal(requests.filter(path => path === '/functions/v1/trip-log').length, 1,
        'Identity change or close does not silently fetch a second owner history');
      for (const [key, value] of originals) assert.equal(storage.get(key), value, 'Original private storage is unchanged');
      assert.equal(JSON.stringify(rows), originalRows, 'Synthetic original response remains unchanged');
    } finally {
      held.resolve(); await tick(); dialog.close();
      assert.equal(authScope.listenerCount(), 0, 'No owner listener survives dialog lifetime');
      assert.equal(events.get('close')?.size ?? 0, 0, 'No history/statistics close listener retained');
      assert.equal(events.get('cancel')?.size ?? 0, 0, 'No history/statistics cancel listener retained');
      assert.equal(events.get('click')?.size, 1, 'Existing app backdrop-close handler is preserved');
      const leaked = timers.size; for (const id of timers) clearTimeout(id);
      assert.equal(leaked, 0, 'Actual auth deadlines have settled');
    }
  }
});
