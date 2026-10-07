import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { createServiceWorkerControllerChangeHandler } from '../js/core/public-page-resume.js';

function harness(initiallyControlled = false) {
  let controlled = initiallyControlled;
  let reloads = 0;
  const handler = createServiceWorkerControllerChangeHandler({
    isControlled: () => controlled,
    reload: () => { reloads += 1; }
  });
  return { handler, control: () => { controlled = true; }, reloads: () => reloads };
}

{
  const test = harness(false);
  assert.equal(test.handler(), 'uncontrolled');
  test.control();
  assert.equal(test.handler(), 'claimed-first-install');
  assert.equal(test.reloads(), 0, 'Første service-worker-overtagelse må ikke genindlæse en allerede startet side.');
  assert.equal(test.handler(), 'reloaded');
  assert.equal(test.handler(), 'ignored');
  assert.equal(test.reloads(), 1, 'En senere reel worker-opdatering må kun genindlæse én gang.');
}

{
  const test = harness(false);
  test.control();
  assert.equal(test.handler(), 'claimed-first-install');
  assert.equal(test.reloads(), 0, 'Den normale første controllerchange-hændelse efter claim må ikke genindlæse siden.');
}

{
  const test = harness(true);
  assert.equal(test.handler(), 'reloaded');
  assert.equal(test.reloads(), 1, 'En allerede styret side skal fortsat tage en reel opdatering i brug.');
}

const [app, worker] = await Promise.all([
  fs.readFile(new URL('../app.js', import.meta.url), 'utf8'),
  fs.readFile(new URL('../service-worker.js', import.meta.url), 'utf8')
]);

assert.doesNotMatch(app, /const manifestPromise=loadDataManifest\(\)/, 'Den afviste parallelle startgren må ikke være tilbage.');
assert.match(app, /const manifest=await loadDataManifest\(\)[\s\S]*projectPublicCoastlines\(await loadZones\(\{manifest\}\)\)[\s\S]*const conditions=await loadConditions\(\{manifest\}\)/, 'Starten skal være manifest-først, prioriteret og sekventiel.');
assert.match(worker, /self\.clients\.claim\(\)/, 'Service workeren skal fortsat kunne overtage den første åbne side uden manuel reload.');
assert.doesNotMatch(worker, /assets\/about\/(?:jakob-|ravjagt-med-boern-)/, 'Store Om-billeder må ikke hentes under første service-worker-installation.');
assert.equal(worker.includes('`./data/zones.geojson?v=${APP_VERSION}`'), false, 'Kortfilen må ikke hentes igen under første service-worker-installation.');

const index = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = await fs.readFile(new URL('../bootstrap.js', import.meta.url), 'utf8');
const releaseVersion = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
const previousCopySuffix = `?v=${releaseVersion}&copy=footer-20261005`;
const suffix = `${previousCopySuffix}&ui=account-20261006`;
assert.ok(index.includes(`src="bootstrap.js${suffix}"`));
assert.ok(bootstrap.includes(`await import("./app.js${suffix}")`));

// Exercise the existing worker with earlier same-version assets in cache.
// The account UI update must bypass both the version-only and footer-only
// copies without deleting either or refetching its own newly cached asset.
const handlers = new Map();
const origin = 'https://ravradar.test';
const cached = new Map([
  [`${origin}/bootstrap.js?v=${releaseVersion}`, new Response('old-bootstrap')],
  [`${origin}/app.js?v=${releaseVersion}`, new Response('old-app')],
  [`${origin}/bootstrap.js${previousCopySuffix}`, new Response('footer-bootstrap')],
  [`${origin}/app.js${previousCopySuffix}`, new Response('footer-app')],
]);
const fetched = [];
vm.runInNewContext(worker, {
  URL, Response,
  self: { location: {origin}, addEventListener: (event, handler) => handlers.set(event, handler) },
  caches: { open: async () => ({
    match: async request => cached.get(request.url),
    put: (request, response) => cached.set(request.url, response),
  }) },
  fetch: async request => { fetched.push(request.url); return new Response(`new:${request.url}`); },
});
for (const file of ['bootstrap.js', 'app.js']) {
  let response;
  const request = {method:'GET',mode:'cors',url:`${origin}/${file}${suffix}`};
  handlers.get('fetch')({request,respondWith:value => {response=value;}});
  assert.equal(await (await response).text(),`new:${request.url}`);
  assert.ok(cached.has(`${origin}/${file}?v=${releaseVersion}`), 'Do not delete unrelated existing caches.');
  assert.equal(await cached.get(`${origin}/${file}?v=${releaseVersion}`).clone().text(),
    file === 'bootstrap.js' ? 'old-bootstrap' : 'old-app');
  assert.equal(await cached.get(`${origin}/${file}${previousCopySuffix}`).clone().text(),
    file === 'bootstrap.js' ? 'footer-bootstrap' : 'footer-app');
  handlers.get('fetch')({request,respondWith:value => {response=value;}});
  assert.equal(await (await response).text(), `new:${request.url}`,
    'The exact new UI asset must be reusable from its own cache key.');
}
assert.deepEqual(fetched,[`${origin}/bootstrap.js${suffix}`,`${origin}/app.js${suffix}`]);

console.log('Public cold start 4.0.303: sekventiel start, én første visning og let service-worker-installation består.');
