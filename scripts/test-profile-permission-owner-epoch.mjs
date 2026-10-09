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
