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
  async fetch(input,options){const url=new URL(input);assert.equal(url.origin,config.supabaseUrl);assert.equal(options.headers.Authorization,'Bearer synthetic-original');requests++;
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
