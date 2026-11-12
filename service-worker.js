const APP_VERSION = "4.0.598";
const CACHE_PREFIX = "ravradar-app-";
const PUBLIC_JSON_TRANSPORT = "public-json-bridge-20261103";
const COMPACT_MAP = "plain-map-v3-20261104";
const CACHE = `${CACHE_PREFIX}${APP_VERSION.replaceAll('.', '-')}-${PUBLIC_JSON_TRANSPORT}-${COMPACT_MAP}-owner-notice-20261109`;
const STATIC = [
  `./js/services/public-delivery-transport-binding.js?v=${APP_VERSION}&map=${COMPACT_MAP}`,
  `./js/services/plain-map-hour.js?v=${APP_VERSION}&map=${COMPACT_MAP}`,
  `./js/services/zone-hour-preview.js?v=${APP_VERSION}&map=${COMPACT_MAP}`,
  `./js/ui/info-panel.js?v=${APP_VERSION}&ui=zone-panels-20261027&map=${COMPACT_MAP}`,
  `./bootstrap.js?v=${APP_VERSION}&copy=footer-20261005&ui=zone-panels-20261027&assistant=forecast-followup-20261101&share=custom-domain-20261102&transport=${PUBLIC_JSON_TRANSPORT}&map=${COMPACT_MAP}&assistant-topic=wind-followup-20261110`,
  `./app.js?v=${APP_VERSION}&copy=footer-20261005&ui=zone-panels-20261027&assistant=forecast-followup-20261101&share=custom-domain-20261102&transport=${PUBLIC_JSON_TRANSPORT}&map=${COMPACT_MAP}&assistant-topic=wind-followup-20261110`,
  `./js/services/data-service.js?v=${APP_VERSION}&ui=forecast-share-20261024&share=custom-domain-20261102&transport=${PUBLIC_JSON_TRANSPORT}&map=${COMPACT_MAP}`,
  `./js/services/app-update-flow.js?v=${APP_VERSION}&transport=${PUBLIC_JSON_TRANSPORT}`,
  `./js/services/public-json-transport.js?v=${APP_VERSION}&transport=${PUBLIC_JSON_TRANSPORT}`,
  `./js/core/public-page-resume.js?v=${APP_VERSION}`,
  "./js/services/vendor/fflate-0.8.2/browser.js",
  "./","./index.html","./about.html","./learn.html","./admin.html",`./about.css?v=${APP_VERSION}`,`./learn.css?v=${APP_VERSION}`,`./admin.css?v=${APP_VERSION}`,`./js/i18n.js?v=${APP_VERSION}`,`./js/ui/about.js?v=${APP_VERSION}`,`./js/ui/about-i18n.js?v=${APP_VERSION}`,`./js/ui/learn-i18n.js?v=${APP_VERSION}`,`./js/ui/learn-i18n-de.js?v=${APP_VERSION}`,`./js/ui/learn-i18n-en.js?v=${APP_VERSION}`,`./js/ui/admin-dashboard.js?v=${APP_VERSION}`,`./style.css?v=${APP_VERSION}`,`./bootstrap.js?v=${APP_VERSION}`,`./app.js?v=${APP_VERSION}`,
  `./about.css?v=${APP_VERSION}&ui=about-explainer-20261025`,
  `./js/ui/about.js?v=${APP_VERSION}&ui=about-explainer-20261025`,
  `./js/ui/about-i18n.js?v=${APP_VERSION}&ui=about-explainer-20261025`,
  `./js/ui/about-explainer.js?v=${APP_VERSION}&ui=about-explainer-20261025`,
  `./js/ui/about-explainer-i18n.js?v=${APP_VERSION}&ui=about-explainer-20261025`,
  `./js/ui/admin-dashboard.js?v=${APP_VERSION}&ui=admin-read-surfaces-20261112&map=${COMPACT_MAP}&observations=local-scope-20261106&study=frozen-replay-noise-20261106&probe=owner-notice-20261109&visits=scope-20261108`,
  `./js/services/visitor-report-service.js?v=${APP_VERSION}&report=scope-20261108`,
  `./js/ui/admin-private-trip-study.js?v=${APP_VERSION}&study=frozen-replay-noise-20261106`,
  `./js/services/data-service.js?v=${APP_VERSION}&ui=admin-model-startup-20261101&map=${COMPACT_MAP}`,
  `./js/services/site-function-test-service.js?v=${APP_VERSION}&ui=admin-model-startup-20261101&map=${COMPACT_MAP}`,
  `./js/services/admin-trip-count.js?v=${APP_VERSION}&ui=admin-current-data-20261028`,
  `./js/services/admin-account-categories.js?v=${APP_VERSION}&ui=admin-current-data-20261028`,
  `./js/core/about-home-return.js?v=${APP_VERSION}`,
  `./assets/about/qrcode.min.js?v=${APP_VERSION}`,
  "./config.js","./manifest.webmanifest","./version.json",
  "./js/core/ravscore-model-contract.js","./js/core/score-presentation.js","./js/core/best-time-policy.js","./js/core/forecast-calendar.js","./js/core/local-zone-score.js","./js/core/ravscore-integrated-explanation-presenter.js",
  `./js/core/public-delivery-contract.js?v=${APP_VERSION}`,
  "./js/services/data-service.js","./js/services/zone-registry.js","./js/services/auth-service.js","./js/services/observation-service.js","./js/services/learning-analysis.js","./js/services/historical-analysis.js","./js/services/storage-safety.js",
  "./js/map/map-view.js","./js/ui/info-panel.js","./js/ui/account-panel.js","./js/ui/developer-panel.js"
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(STATIC.map(url=>cache.add(url)))));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
async function networkFirst(request){const cache=await caches.open(CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response.ok)cache.put(request,response.clone());return response;}catch(error){return (await cache.match(request))||(await cache.match('./index.html'))||Response.error();}}
function isContentAddressedLiveData(url){return Boolean(url.searchParams.get('dataset'))&&/^[a-f0-9]{64}$/i.test(url.searchParams.get('sha')||'');}
async function liveData(request){
  try{
    const url=new URL(request.url);
    // Manifestet og ikke-adresserede livefiler skal altid være aktuelle.
    // Dataset-id + SHA gør derimod en prognosefil uforanderlig og sikker at
    // genbruge, også efter browserlukning og på en ny sideindlæsning.
    return await fetch(request,{cache:isContentAddressedLiveData(url)?'force-cache':'no-store'});
  }catch{return Response.error();}
}
async function cacheFirst(request){const cache=await caches.open(CACHE);const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)cache.put(request,response.clone());return response;}
async function staleWhileRevalidate(request){const cache=await caches.open(CACHE);const cached=await cache.match(request);const update=fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}).catch(()=>null);return cached||await update||Response.error();}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request));return;}
  if(url.pathname.includes('/data/live/')){event.respondWith(liveData(event.request));return;}
  // Immutable display-only coast evidence: exact content key, no background
  // refetch or installation prefetch. The map still verifies its pinned SHA.
  if(url.pathname.endsWith('/data/map/current-arrow-land-mask.json')&&/^[a-f0-9]{64}$/.test(url.searchParams.get('sha256')||'')){event.respondWith(cacheFirst(event.request));return;}
  if(url.pathname.endsWith('/version.json')||url.pathname.includes('/data/diagnostics/')||url.pathname.endsWith('/data/zones.geojson')||url.pathname.endsWith('/data/zone-plan.json')){event.respondWith(networkFirst(event.request));return;}
  const versioned=url.searchParams.get('v')===APP_VERSION;
  if(versioned||/\.(?:png|svg|ico|webp|woff2)$/.test(url.pathname)){event.respondWith(cacheFirst(event.request));return;}
  if(/\.(?:js|css)$/.test(url.pathname)){event.respondWith(networkFirst(event.request));return;}
  if(/\.(?:json|geojson|webmanifest)$/.test(url.pathname)){event.respondWith(staleWhileRevalidate(event.request));return;}
  event.respondWith(cacheFirst(event.request));
});
