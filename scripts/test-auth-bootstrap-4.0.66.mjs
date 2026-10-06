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

console.log(`OK: Auth-timeout/admin bevares; ${cases} normale konto-submit-scenarier og 4 normale cache-kald består offline, sekundær kontrast ${contrast.toFixed(2)}:1.`);
