import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const auth = await fs.readFile('js/services/auth-service.js', 'utf8');
const dashboard = await fs.readFile('js/ui/admin-dashboard.js', 'utf8');
const account = await fs.readFile('js/ui/account-panel.js', 'utf8');
const css = await fs.readFile('style.css', 'utf8');
const html = await fs.readFile('index.html', 'utf8');
const bootstrap = await fs.readFile('bootstrap.js', 'utf8');
const app = await fs.readFile('app.js', 'utf8');
const serviceWorker = await fs.readFile('service-worker.js', 'utf8');
for (const marker of ['DEFAULT_TIMEOUT_MS', 'AbortController', 'friendlyNetworkError']) {
  assert.ok(auth.includes(marker), `Mangler auth-beskyttelse: ${marker}`);
}
for (const marker of ['Prøv igen', 'Henter profil og rettigheder', 'Ingen nøgler eller Supabase-indstillinger er ændret']) {
  assert.ok(dashboard.includes(marker), `Mangler admin-fejltilstand: ${marker}`);
}

assert.match(account, /<button\b[^>]*value="magic"[^>]*\bformnovalidate\b/,
  'Loginlink må ikke blive blokeret af adgangskodens native minlength-validering.');
assert.doesNotMatch(account, /<form\b[^>]*id="authForm"[^>]*\bnovalidate\b/,
  'Den almindelige formular skal fortsat bruge browserens native validering.');
assert.doesNotMatch(account, /<button\b[^>]*value="(?:login|signup)"[^>]*\bformnovalidate\b/,
  'Login og oprettelse må ikke få loginlinkets valideringsundtagelse.');
assert.match(account, /<input\b[^>]*name="email"[^>]*type="email"[^>]*\brequired\b/);
assert.match(account, /<input\b[^>]*name="password"[^>]*minlength="6"/);

const secondary = css.match(/#accountDialog\s+#authForm\s+button:not\(\.primary-button\)\s*\{([^}]+)\}/)?.[1];
assert.ok(secondary, 'Sekundære konto-knapper skal have en eksplicit, afgrænset farveregel.');
assert.match(secondary, /(?:^|;)\s*color:\s*var\(--ink\)/);
assert.match(secondary, /-webkit-text-fill-color:\s*currentColor/);
assert.match(css, /#accountDialog\s+#authForm\s+button:focus-visible\s*\{[^}]*outline:/);
assert.match(css, /\.button-row\s+\.primary-button[^}]*color:\s*white/,
  'Primærknappen skal bevare hvid tekst på mørk baggrund.');

function luminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
const ink = css.match(/--ink:\s*(#[a-f\d]{6})/i)?.[1];
const surface = css.match(/--surface-soft:\s*(#[a-f\d]{6})/i)?.[1];
assert.ok(ink && surface);
const contrast = (luminance(surface) + 0.05) / (luminance(ink) + 0.05);
assert.ok(contrast >= 4.5, `Kontoknappernes tekstkontrast skal mindst være 4,5:1, fik ${contrast}.`);

// The existing cache-first worker must not reuse a previously cached UI file.
// Exercise its normal fetch listener with old keys present, without resetting caches.
const uiPaths = [
  html.match(/href="(style\.css\?[^"]+)"/)?.[1],
  html.match(/src="(bootstrap\.js\?[^"]+)"/)?.[1],
  bootstrap.match(/import\("\.\/(app\.js\?[^"]+)"\)/)?.[1],
  app.match(/from "\.\/(js\/ui\/account-panel\.js\?[^"]+)"/)?.[1],
];
const entries = new Map();
const fetched = [];
let fetchListener;
const origin = 'https://ravradar.example.invalid';
for (const relative of uiPaths) {
  assert.ok(relative?.includes('&ui=account-20261006'), 'Hele konto-/CSS-importkæden skal have den afgrænsede cachemarkør.');
  entries.set(new URL(relative.replace('&ui=account-20261006', ''), `${origin}/`).href, { old: true });
}
const workerScope = {
  URL, Response,
  self: { location: { origin }, addEventListener(name, listener) { if (name === 'fetch') fetchListener = listener; } },
  caches: { open: async () => ({
    match: async request => entries.get(request.url),
    put: (request, response) => entries.set(request.url, response),
  }) },
  fetch: async request => {
    fetched.push(request.url);
    return new Response('new account UI', { status: 200 });
  },
};
vm.runInNewContext(serviceWorker, workerScope);
for (const relative of uiPaths) {
  const request = { method: 'GET', mode: 'cors', url: new URL(relative, `${origin}/`).href };
  let responsePromise;
  fetchListener({ request, respondWith(response) { responsePromise = response; } });
  assert.equal(await (await responsePromise).text(), 'new account UI');
}
assert.equal(fetched.length, 4, 'Gamle præcis-key caches må ikke skjule de fire rettede UI-filer.');
assert.equal([...entries.values()].filter(value => value.old).length, 4, 'Tidligere cacheindhold skal bevares, ikke nulstilles.');

// Run the actual normal account renderer/submit listener, replacing only imports
// and browser/service boundaries. No real Auth request, mail or account is made.
function harness({ emailValid = true, failure = null } = {}) {
  let submit;
  let emailChecks = 0;
  const calls = [];
  const status = { textContent: '' };
  const form = {
    email: 'user@example.invalid', password: '',
    elements: { namedItem: name => {
      assert.equal(name, 'email');
      return { reportValidity: () => { emailChecks += 1; return emailValid; } };
    } },
    addEventListener: (name, listener) => { assert.equal(name, 'submit'); submit = listener; }
  };
  const content = {
    innerHTML: '',
    querySelector: selector => selector === '#authForm' ? form : selector === '#authStatus' ? status : null
  };
  const dialog = { open: false, querySelector: () => content, showModal() { this.open = true; } };
  const record = action => async (...args) => {
    calls.push([action, ...args]);
    if (failure) throw new Error(failure);
  };
  const scope = {
    currentSession: () => null, authEnabled: () => true, t: key => key,
    sendMagicLink: record('magic'), signInWithPassword: record('login'), signUpWithPassword: record('signup'),
    FormData: class { constructor(value) { this.form = value; } get(name) { return this.form[name]; } }
  };
  const body = account.replace(/^import[^\n]+\r?\n/gm, '').replace(/^export\s+/gm, '');
  vm.runInNewContext(`${body}\nthis.openAccountDialog = openAccountDialog;`, scope);
  scope.openAccountDialog(dialog);
  return {
    form, calls, status, content,
    emailChecks: () => emailChecks,
    async send(action) {
      let prevented = false;
      await submit({ currentTarget: form, submitter: { value: action }, preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    }
  };
}

let cases = 0;
for (const password of ['', 'x', '12345', 'a longer dummy password']) {
  const test = harness();
  test.form.email = ' user@example.invalid ';
  test.form.password = password;
  await test.send('magic');
  assert.deepEqual(test.calls, [['magic', 'user@example.invalid']], 'Loginlink sender kun e-mail, aldrig adgangskoden.');
  assert.equal(test.emailChecks(), 1);
  assert.equal(test.status.textContent, 'account.magicSent');
  cases += 1;
}
for (const action of ['magic', 'login', 'signup']) {
  for (const email of ['', 'not-an-email']) {
    const test = harness({ emailValid: false });
    test.form.email = email;
    test.form.password = 'valid dummy password';
    test.status.textContent = 'account.magicSent';
    await test.send(action);
    assert.equal(test.emailChecks(), 1);
    assert.deepEqual(test.calls, [], 'Ugyldig e-mail må ikke nå nogen auth-tjeneste.');
    assert.equal(test.status.textContent, '');
    cases += 1;
  }
}
for (const action of ['login', 'signup']) {
  for (const password of ['', 'x', '12345']) {
    const test = harness();
    test.form.password = password;
    await test.send(action);
    assert.deepEqual(test.calls, [], 'Login og oprettelse kræver fortsat mindst seks tegn.');
    assert.equal(test.status.textContent, 'account.passwordShort');
    cases += 1;
  }
  const test = harness();
  test.form.password = '123456';
  await test.send(action);
  assert.deepEqual(test.calls, [[action, 'user@example.invalid', '123456']]);
  if (action === 'signup') assert.equal(test.status.textContent, 'account.created');
  cases += 1;
}
const failed = harness({ failure: 'Test: prøv igen senere' });
await failed.send('magic');
assert.equal(failed.status.textContent, 'Test: prøv igen senere');
cases += 1;

// Exercise the normal imported auth module, not a rewritten implementation.
// Only browser storage and held synthetic HTTP responses are replaced.
const originalGlobals = new Map(['fetch', 'localStorage', 'location', 'history'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
const sessionA = { access_token: 'synthetic-a-token', refresh_token: 'synthetic-a-refresh', expires_at: 1, user: { id: 'synthetic-owner-a' } };
const sessionB = { access_token: 'synthetic-b-token', refresh_token: 'synthetic-b-refresh', expires_at: 9_999_999_999, user: { id: 'synthetic-owner-b' } };
let moduleSequence = 0, ownerCases = 0;
async function authHarness(initial, signedIn = sessionB, { holdLogout = false, holdLogin = false, callbackUser = null } = {}) {
  const stored = new Map([['ravradar-auth-session', JSON.stringify(initial)]]);
  const refreshes = [], users = [], changes = [], logouts = [], requests = [], logins = [];
  globalThis.location = { hash: '', pathname: '/', search: '', origin: 'https://example.invalid' };
  globalThis.history = { replaceState() {} };
  globalThis.localStorage = {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, String(value)),
    removeItem: key => stored.delete(key),
  };
  globalThis.fetch = async (input, options) => {
    const url = new URL(input);
    if (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'refresh_token') {
      return new Promise(resolve => refreshes.push({ resolve, token: JSON.parse(options.body).refresh_token }));
    }
    if (url.pathname.endsWith('/user')) return callbackUser
      ? Response.json(callbackUser)
      : new Promise(resolve => users.push({ resolve }));
    if (url.pathname.endsWith('/signup') || (url.pathname.endsWith('/token') && url.searchParams.get('grant_type') === 'password')) return holdLogin
      ? new Promise(resolve => logins.push({ resolve }))
      : Response.json(signedIn);
    if (url.pathname.endsWith('/logout')) return holdLogout
      ? new Promise(resolve => logouts.push({ resolve }))
      : Response.json({});
    if (url.origin === 'https://example.invalid' && url.pathname === '/synthetic-owner-operation')
      return new Promise(resolve => requests.push({ resolve, authorization: options.headers.Authorization }));
    throw new Error('Unexpected synthetic auth request');
  };
  const api = await import(`../js/services/auth-service.js?owner-race=${++moduleSequence}`);
  api.onAuthChange(value => changes.push(value));
  return { api, stored, refreshes, users, changes, logouts, requests, logins };
}
const outcome = promise => promise.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
try {
  for (const [action, status] of [['logout', 200], ['switch', 200], ['switch', 400]]) {
    const test = await authHarness(sessionA);
    const pending = outcome(test.api.requireFreshSession());
    assert.equal(test.refreshes.length, 1);
    if (action === 'logout') await test.api.signOut();
    else await test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const expected = test.api.currentSession();
    const saved = test.stored.get('ravradar-auth-session'), notifications = test.changes.length;
    test.refreshes[0].resolve(Response.json({ ...sessionA, expires_at: 9_999_999_999 }, { status }));
    const result = await pending;
    assert.equal(test.api.currentSession() === expected, true, `${action}: a late refresh must not replace the current session`);
    assert.equal(test.stored.get('ravradar-auth-session') === saved, true, `${action}: a late refresh must not rewrite stored credentials`);
    assert.equal(test.changes.length, notifications, 'A stale result must not emit a new auth state');
    assert.equal(result.ok, false, 'The stale caller must not report success for another session');
    if (status === 400) assert.equal(result.error.status, 400, 'Preserve the original auth rejection');
    ownerCases += 1;
  }
  for (const action of ['logout', 'switch']) {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999, user: {} });
    const pending = outcome(test.api.requireFreshSession());
    assert.equal(test.users.length, 1);
    if (action === 'logout') await test.api.signOut();
    else await test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const expected = test.api.currentSession(), saved = test.stored.get('ravradar-auth-session');
    test.users[0].resolve(Response.json(sessionA.user));
    assert.equal((await pending).ok, false, 'A stale user lookup must reject its original caller');
    assert.equal(test.api.currentSession() === expected, true, 'User hydration must not pair an old owner with the new token');
    assert.equal(test.stored.get('ravradar-auth-session') === saved, true);
    ownerCases += 1;
  }
  {
    const test = await authHarness(sessionA);
    const first = test.api.requireFreshSession(), second = test.api.requireFreshSession();
    assert.equal(test.refreshes.length, 1, 'Same-session callers still share one refresh');
    test.refreshes[0].resolve(Response.json({ access_token: 'synthetic-a-renewed', expires_at: 9_999_999_999, user: sessionA.user }));
    const results = await Promise.all([first, second]);
    assert.equal(results[0], results[1]);
    assert.equal(results[0].refresh_token, sessionA.refresh_token, 'Missing replacement refresh token uses the initiating session');
    assert.equal(test.changes.length, 1);
    ownerCases += 1;
  }
  {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999, user: {} });
    const pending = [test.api.requireFreshSession(), test.api.requireFreshSession()];
    for (const request of test.users) request.resolve(Response.json(sessionA.user));
    const results = await Promise.all(pending);
    assert.equal(results.every(result => result.user.id === sessionA.user.id && result.access_token === sessionA.access_token), true,
      'Concurrent legitimate hydration must remain usable');
    ownerCases += 1;
  }
  for (const status of [400, 500]) {
    const test = await authHarness(sessionA), before = test.api.currentSession();
    const pending = outcome(test.api.requireFreshSession());
    test.refreshes[0].resolve(Response.json({}, { status }));
    const result = await pending;
    assert.equal(result.ok, false);
    assert.equal(result.error.status, status);
    assert.equal(test.api.currentSession(), status === 400 ? null : before, 'Only rejection of the still-current credentials clears the session');
    ownerCases += 1;
  }
  {
    const test = await authHarness(sessionA, { ...sessionB, expires_at: 1 });
    const old = outcome(test.api.requireFreshSession());
    await test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const next = outcome(test.api.requireFreshSession()), expected = test.api.currentSession();
    test.refreshes[0].resolve(Response.json({ ...sessionA, expires_at: 9_999_999_999 }));
    assert.equal((await old).ok, false);
    assert.equal(test.api.currentSession(), expected);
    assert.equal(test.refreshes.length, 2, 'The new session must not inherit the old refresh promise');
    const concurrent = outcome(test.api.requireFreshSession());
    assert.equal(test.refreshes.length, 2, 'Old cleanup must not discard the new session\'s pending refresh');
    test.refreshes[1].resolve(Response.json(sessionB));
    assert.equal((await next).value.user.id, sessionB.user.id);
    assert.equal((await concurrent).value.user.id, sessionB.user.id);
    ownerCases += 1;
  }
  for (const [status, newLogin] of [[200, sessionB], [400, sessionB], [200, { ...sessionA, expires_at: 9_999_999_999 }]]) {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 }, newLogin, { holdLogout: true });
    const oldLogout = outcome(test.api.signOut());
    assert.equal(test.logouts.length, 1);
    await test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const expected = test.api.currentSession(), saved = test.stored.get('ravradar-auth-session'), notifications = test.changes.length;
    test.logouts[0].resolve(Response.json({}, { status }));
    assert.equal((await oldLogout).ok, false, 'A late logout must not report the newly logged-in account as logged out');
    assert.equal(test.api.currentSession(), expected, 'A late logout must not clear a new session');
    assert.equal(test.stored.get('ravradar-auth-session'), saved);
    assert.equal(test.changes.length, notifications);
    ownerCases += 1;
  }
  {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 }, sessionB, { holdLogout: true });
    const logout = outcome(test.api.signOut());
    const renewal = test.api.refreshSession({ force: true });
    test.refreshes[0].resolve(Response.json({ ...sessionA, access_token: 'synthetic-a-renewed', expires_at: 9_999_999_999 }));
    await renewal;
    test.logouts[0].resolve(Response.json({}));
    assert.equal((await logout).ok, true, 'An ordinary same-owner renewal must not prevent an already requested logout');
    assert.equal(test.api.currentSession(), null);
    ownerCases += 1;
  }
  for (const [action, status] of [['switch', 401], ['switch', 200], ['logout', 200]]) {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 });
    const pending = outcome(test.api.authorizedFetch('https://example.invalid/synthetic-owner-operation'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(test.requests.length, 1);
    assert.equal(test.requests[0].authorization, `Bearer ${sessionA.access_token}`);
    if (action === 'logout') await test.api.signOut();
    else await test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const expected = test.api.currentSession();
    test.requests[0].resolve(Response.json({ syntheticOwner: 'a' }, { status }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(test.requests.length, 1, 'An old response must not resend its payload under another account');
    assert.equal(test.refreshes.length, 0, 'An old 401 must not renew another account');
    const result = await pending;
    assert.equal(result.ok, false, 'A previous account response must not be handed to a new account or logged-out caller');
    assert.equal(test.api.currentSession(), expected);
    assert.equal(test.requests.length, 1, 'An old 401 must not resend its payload under another account');
    assert.equal(test.refreshes.length, 0, 'An old 401 must not renew another account');
    ownerCases += 1;
  }
  {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 });
    const pending = outcome(test.api.authorizedFetch('https://example.invalid/synthetic-owner-operation'));
    await new Promise(resolve => setImmediate(resolve));
    test.requests[0].resolve(Response.json({}, { status: 401 }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(test.refreshes.length, 1);
    test.refreshes[0].resolve(Response.json({ ...sessionA, access_token: 'synthetic-a-renewed', expires_at: 9_999_999_999 }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(test.requests.length, 2, 'A genuine same-owner 401 retains the single existing retry');
    assert.equal(test.requests[1].authorization, 'Bearer synthetic-a-renewed');
    test.requests[1].resolve(Response.json({ syntheticOwner: 'a' }));
    assert.equal((await pending).value.status, 200);
    ownerCases += 1;
  }
  {
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 });
    const pending = outcome(test.api.authorizedFetch('https://example.invalid/synthetic-owner-operation'));
    await new Promise(resolve => setImmediate(resolve));
    const renewal = test.api.refreshSession({ force: true });
    test.refreshes[0].resolve(Response.json({ ...sessionA, access_token: 'synthetic-a-renewed', expires_at: 9_999_999_999 }));
    await renewal;
    test.requests[0].resolve(Response.json({ syntheticOwner: 'a' }));
    assert.equal((await pending).value.status, 200, 'A legitimate same-owner token renewal does not discard an ordinary response');
    ownerCases += 1;
  }
  for (const status of [200, 401]) {
    const sameOwner = { ...sessionA, access_token: 'synthetic-a-new-login', expires_at: 9_999_999_999 };
    const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 }, sameOwner);
    const old = outcome(test.api.authorizedFetch('https://example.invalid/synthetic-owner-operation'));
    await new Promise(resolve => setImmediate(resolve));
    await test.api.signOut();
    await test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
    const expected = test.api.currentSession();
    test.requests[0].resolve(Response.json({ syntheticOwner: 'a' }, { status }));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(test.refreshes.length, 0, 'An old 401 must not renew an explicitly new login to the same owner');
    assert.equal(test.requests.length, 1, 'An old payload must not retry under a new login, even with the same owner ID');
    assert.equal((await old).ok, false, 'A pre-logout response must not be accepted by the new same-owner login');
    assert.equal(test.api.currentSession(), expected);
    ownerCases += 1;
  }
  for (const kind of ['signInWithPassword', 'signUpWithPassword']) {
    for (const later of ['login', 'logout']) {
      const test = await authHarness({ ...sessionA, expires_at: 9_999_999_999 }, sessionB, { holdLogin: true });
      const old = outcome(test.api[kind]('synthetic@example.invalid', 'synthetic-only'));
      assert.equal(test.logins.length, 1);
      if (later === 'logout') await test.api.signOut();
      else {
        const newest = test.api.signInWithPassword('synthetic@example.invalid', 'synthetic-only');
        test.logins[1].resolve(Response.json(sessionB));
        await newest;
      }
      const expected = test.api.currentSession(), saved = test.stored.get('ravradar-auth-session');
      const notifications = test.changes.length;
      test.logins[0].resolve(Response.json({ ...sessionA, expires_at: 9_999_999_999 }));
      assert.equal((await old).ok, false, 'A previous login/signup result must not override a later explicit auth choice');
      assert.equal(test.api.currentSession(), expected);
      assert.equal(test.stored.get('ravradar-auth-session'), saved);
      assert.equal(test.changes.length, notifications);
      ownerCases += 1;
    }
  }
  for (const operation of ['requireFreshSession', 'authorizedFetch']) {
    const test = await authHarness(sessionA, sessionB, { callbackUser: sessionB.user });
    // This normal callback is registered first on the SAME pending refresh.
    // It changes login identity between refresh settlement and the old
    // caller's continuation, without replacing requireFreshSession itself.
    const renewal = test.api.refreshSession();
    const switched = renewal.then(() => {
      globalThis.location.hash = '#access_token=synthetic-b-token&refresh_token=synthetic-b-refresh&expires_in=3600';
      return test.api.consumeAuthCallback();
    });
    const old = outcome(operation === 'requireFreshSession'
      ? test.api.requireFreshSession()
      : test.api.authorizedFetch('https://example.invalid/synthetic-owner-operation', {
        method: 'POST', body: 'synthetic-owner-a-payload',
      }));
    test.refreshes[0].resolve(Response.json({ ...sessionA, access_token: 'synthetic-a-renewed', expires_at: 9_999_999_999 }));
    await switched;
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(test.requests.length, 0, 'An account change during the initial refresh must prevent the original payload from reaching the new account');
    assert.equal((await old).ok, false, 'The original fresh-session caller must not return a different login identity after awaiting refresh');
    assert.equal(test.api.currentSession().user.id, sessionB.user.id);
    ownerCases += 1;
  }
} finally {
  for (const [key, descriptor] of originalGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
}

console.log(`OK: Auth-timeout/admin bevares; ${cases} normale konto-submit-scenarier, ${ownerCases} session-ejerskabsforløb og 4 normale cache-kald består offline, sekundær kontrast ${contrast.toFixed(2)}:1.`);
