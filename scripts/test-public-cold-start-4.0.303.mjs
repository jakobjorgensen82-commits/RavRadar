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
const startMarker='  const manifest=await loadDataManifest();activeManifest=manifest;';
const endMarker='  conditionDetailsReady=conditions.detailsAvailable';
const startAt=app.indexOf(startMarker),endAt=app.indexOf(endMarker,startAt);
assert(startAt>=0&&endAt>startAt);
const initialStartup=app.slice(startAt,endAt);
for(const test of ['marked-valid','marked-invalid','legacy']){
  const calls=[];
  const startup=vm.createContext({
    state:{},activeManifest:null,activeLandingView:null,
    loadDataManifest:async()=>{calls.push('manifest');return {detailDelivery:test==='legacy'?{}:{mapHoursLandingSchema:1}};},
    loadPublicLandingView:async()=>{
      calls.push('compact');
      if(test==='marked-invalid')throw new Error('exact compact hour absent');
      return {zones:{verifiedRegistry:true}};
    },
    loadZones:async()=>{calls.push('zones');return {verifiedRegistry:true};},
    loadConditions:async()=>{calls.push('full');return {available:true};},
    projectPublicCoastlines:zones=>zones,renderZones:()=>({mapLayer:true}),map:{},
    performance:{mark(){}},dataStatus:{},t:key=>key,console:{warn(){}},
  });
  await vm.runInContext('(async()=>{'+initialStartup+'})()',startup);
  assert(startup.state.zones.verifiedRegistry && startup.state.zoneLayer.mapLayer);
  assert.deepEqual(calls,test==='marked-valid'?['manifest','compact']
    :test==='marked-invalid'?['manifest','compact','zones']:['manifest','zones','full']);
  assert.equal(startup.state.conditions.available,test==='legacy');
}
assert.match(worker, /self\.clients\.claim\(\)/, 'Service workeren skal fortsat kunne overtage den første åbne side uden manuel reload.');
assert.doesNotMatch(worker, /assets\/about\/(?:jakob-|ravjagt-med-boern-)/, 'Store Om-billeder må ikke hentes under første service-worker-installation.');
assert.equal(worker.includes('`./data/zones.geojson?v=${APP_VERSION}`'), false, 'Kortfilen må ikke hentes igen under første service-worker-installation.');

const index = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
const bootstrap = await fs.readFile(new URL('../bootstrap.js', import.meta.url), 'utf8');
const releaseVersion = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).version;
const previousCopySuffix = `?v=${releaseVersion}&copy=footer-20261005`;
const previousUiSuffix = `${previousCopySuffix}&ui=account-20261006`;
const previousShareSuffix = `${previousCopySuffix}&ui=forecast-share-20261024`;
const previousPanelSuffix = `${previousCopySuffix}&ui=zone-panels-20261027`;
const previousAssistantSuffix = `${previousPanelSuffix}&assistant=forecast-followup-20261101`;
const previousDomainSuffix = `${previousAssistantSuffix}&share=custom-domain-20261102`;
const previousTransportSuffix = `${previousDomainSuffix}&transport=public-json-bridge-20261103`;
const previousMapSuffix = `${previousTransportSuffix}&map=plain-map-v3-20261104`;
const suffix = `${previousMapSuffix}&assistant-topic=wind-followup-20261110`;
assert.ok(index.includes(`src="bootstrap.js${suffix}"`));
assert.ok(bootstrap.includes(`await import("./app.js${suffix}")`));
const admin = await fs.readFile(new URL('../admin.html', import.meta.url), 'utf8');
const dashboard = await fs.readFile(new URL('../js/ui/admin-dashboard.js', import.meta.url), 'utf8');
const adminDependencySuffix = `?v=${releaseVersion}&ui=admin-model-startup-20261101&map=plain-map-v3-20261104`;
const previousAdminEntrypointSuffix = `${adminDependencySuffix}&observations=local-scope-20261106`;
const adminStudySuffix = `?v=${releaseVersion}&study=frozen-replay-noise-20261106`;
const previousStudyEntrypointSuffix = `${previousAdminEntrypointSuffix}&study=frozen-replay-noise-20261106`;
const previousProbeEntrypointSuffix = `${previousStudyEntrypointSuffix}&probe=owner-notice-20261109`;
const previousVisitEntrypointSuffix = `${previousProbeEntrypointSuffix}&visits=scope-20261108`;
const adminEntrypointSuffix = previousVisitEntrypointSuffix
  .replace('ui=admin-model-startup-20261101', 'ui=admin-read-surfaces-20261112');
assert.ok(admin.includes(`src="js/ui/admin-dashboard.js${adminEntrypointSuffix}"`));
assert.ok(dashboard.includes(`../services/data-service.js${adminDependencySuffix}`));
assert.ok(dashboard.includes(`./admin-private-trip-study.js${adminStudySuffix}`));
const visitorReportSuffix = `?v=${releaseVersion}&report=scope-20261108`;
assert.ok(dashboard.includes(`../services/visitor-report-service.js${visitorReportSuffix}`));
const workerMapTag = worker.match(/const COMPACT_MAP = "([^"]+)";/)?.[1];
assert.ok(workerMapTag);
const workerAssets = worker.replaceAll('${APP_VERSION}', releaseVersion).replaceAll('${COMPACT_MAP}', workerMapTag);
assert.ok(workerAssets.includes(`./js/ui/admin-dashboard.js${adminEntrypointSuffix}`));
assert.ok(workerAssets.includes(`./js/services/visitor-report-service.js${visitorReportSuffix}`));
assert.ok(worker.replaceAll('${APP_VERSION}',releaseVersion).includes(`./js/ui/admin-private-trip-study.js${adminStudySuffix}`),
  'Offline-listen skal følge den præcise nye statistikimportadresse.');

// Exercise the existing worker with earlier same-version assets in cache.
// The mobile UI update must bypass version-only, footer-only and earlier
// account UI copies without deleting any or refetching its own cached asset.
const handlers = new Map();
const origin = 'https://ravradar.test';
const cached = new Map([
  [`${origin}/bootstrap.js?v=${releaseVersion}`, new Response('old-bootstrap')],
  [`${origin}/app.js?v=${releaseVersion}`, new Response('old-app')],
  [`${origin}/bootstrap.js${previousCopySuffix}`, new Response('footer-bootstrap')],
  [`${origin}/app.js${previousCopySuffix}`, new Response('footer-app')],
  [`${origin}/bootstrap.js${previousUiSuffix}`, new Response('account-bootstrap')],
  [`${origin}/app.js${previousUiSuffix}`, new Response('account-app')],
  [`${origin}/bootstrap.js${previousShareSuffix}`, new Response('share-bootstrap')],
  [`${origin}/app.js${previousShareSuffix}`, new Response('share-app')],
  [`${origin}/js/ui/admin-dashboard.js${adminDependencySuffix}`, new Response('old-admin')],
  [`${origin}/js/ui/admin-dashboard.js${previousAdminEntrypointSuffix}`, new Response('old-observations-admin')],
  [`${origin}/js/ui/admin-dashboard.js${previousStudyEntrypointSuffix}`, new Response('old-study-admin')],
  [`${origin}/js/ui/admin-dashboard.js${previousProbeEntrypointSuffix}`, new Response('old-probe-admin')],
  [`${origin}/js/ui/admin-dashboard.js${previousVisitEntrypointSuffix}`, new Response('old-visits-admin')],
  [`${origin}/js/ui/admin-private-trip-study.js?v=${releaseVersion}`, new Response('old-private-study')],
  [`${origin}/js/services/data-service.js${adminDependencySuffix}`, new Response('current-admin-data')],
]);
const previousDeliveredAssets = [
  [previousPanelSuffix, 'panel'], [previousAssistantSuffix, 'assistant'], [previousDomainSuffix, 'domain'],
  [previousTransportSuffix, 'transport'], [previousMapSuffix, 'map'],
];
for (const [oldSuffix, label] of previousDeliveredAssets) {
  for (const file of ['bootstrap.js', 'app.js']) cached.set(`${origin}/${file}${oldSuffix}`, new Response(`${label}-${file}`));
}
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
  assert.equal(await cached.get(`${origin}/${file}${previousUiSuffix}`).clone().text(),
    file === 'bootstrap.js' ? 'account-bootstrap' : 'account-app');
  assert.equal(await cached.get(`${origin}/${file}${previousShareSuffix}`).clone().text(),
    file === 'bootstrap.js' ? 'share-bootstrap' : 'share-app');
  for (const [oldSuffix, label] of previousDeliveredAssets) {
    assert.equal(await cached.get(`${origin}/${file}${oldSuffix}`).clone().text(), `${label}-${file}`,
      'Already delivered same-version panel/assistant/domain assets stay separate from the new transport cache key.');
  }
  handlers.get('fetch')({request,respondWith:value => {response=value;}});
  assert.equal(await (await response).text(), `new:${request.url}`,
    'The exact new UI asset must be reusable from its own cache key.');
}
assert.deepEqual(fetched,[`${origin}/bootstrap.js${suffix}`,`${origin}/app.js${suffix}`]);

// The admin-only copy update gets a new exact key; its unchanged data import
// must still reuse its existing key. Exercise the real service-worker handler.
const adminRequest={method:'GET',mode:'cors',url:`${origin}/js/ui/admin-dashboard.js${adminEntrypointSuffix}`};
for(let pass=0;pass<2;pass++){
  let response;
  handlers.get('fetch')({request:adminRequest,respondWith:value=>{response=value;}});
  assert.equal(await (await response).text(),`new:${adminRequest.url}`,
    'The new admin entry must bypass an old same-version URL and then reuse its own cached response.');
  assert.equal(await cached.get(`${origin}/js/ui/admin-dashboard.js${adminDependencySuffix}`).clone().text(),'old-admin',
    'An admin entry update must not delete an older cached asset.');
  assert.equal(await cached.get(`${origin}/js/ui/admin-dashboard.js${previousAdminEntrypointSuffix}`).clone().text(),'old-observations-admin',
    'Den tidligere leverede observationsadresse bevares som særskilt gammel kode.');
  assert.equal(await cached.get(`${origin}/js/ui/admin-dashboard.js${previousStudyEntrypointSuffix}`).clone().text(),'old-study-admin',
    'Prøvemailens adminadresse omgår den tidligere leverede studieadresse.');
  assert.equal(await cached.get(`${origin}/js/ui/admin-dashboard.js${previousProbeEntrypointSuffix}`).clone().text(),'old-probe-admin',
    'The joined admin address preserves an older probe-only entry.');
}
assert.equal(await cached.get(`${origin}/js/ui/admin-dashboard.js${previousVisitEntrypointSuffix}`).clone().text(),'old-visits-admin',
  'The previous delivered admin remains intact while the new UI URL gets fresh code.');
const adminDataRequest={method:'GET',mode:'cors',url:`${origin}/js/services/data-service.js${adminDependencySuffix}`};
let adminDataResponse;
handlers.get('fetch')({request:adminDataRequest,respondWith:value=>{adminDataResponse=value;}});
assert.equal(await (await adminDataResponse).text(),'current-admin-data',
  'The unchanged admin data-service address must remain reusable without a network request.');
assert.deepEqual(fetched,[`${origin}/bootstrap.js${suffix}`,`${origin}/app.js${suffix}`,adminRequest.url]);

// A fresh dashboard address must lead to a fresh child address, even when the
// old worker already cached both previous same-version modules.
const studyRequest={method:'GET',mode:'cors',url:`${origin}/js/ui/admin-private-trip-study.js${adminStudySuffix}`};
for(let pass=0;pass<2;pass++){
  let response;
  handlers.get('fetch')({request:studyRequest,respondWith:value=>{response=value;}});
  assert.equal(await (await response).text(),`new:${studyRequest.url}`);
  assert.equal(await cached.get(`${origin}/js/ui/admin-private-trip-study.js?v=${releaseVersion}`).clone().text(),'old-private-study',
    'Den nye statistikadresse må ikke genbruge eller slette den gamle v-only-kopi.');
}
assert.deepEqual(fetched,[`${origin}/bootstrap.js${suffix}`,`${origin}/app.js${suffix}`,adminRequest.url,studyRequest.url]);



const maskSha='a'.repeat(64);
const maskRequest={method:'GET',mode:'cors',url:`${origin}/data/map/current-arrow-land-mask.json?sha256=${maskSha}`};
for(let pass=0;pass<2;pass++) {
  let response;
  handlers.get('fetch')({request:maskRequest,respondWith:value=>{response=value;}});
  assert.equal(await (await response).text(),`new:${maskRequest.url}`);
}
assert.equal(fetched.filter(url=>url===maskRequest.url).length,1,
  'The immutable pinned coast mask must be reused without background refetch on every page.');
assert.ok(!worker.slice(worker.indexOf('const STATIC'),worker.indexOf("self.addEventListener('install'")).includes('current-arrow-land-mask.json'),
  'The large mask must not be added to service-worker installation prefetch.');

console.log('Public cold start 4.0.303: sekventiel start, én første visning og let service-worker-installation består.');
