const APP_VERSION = "4.0.292";
const CACHE_PREFIX = "ravradar-app-";
const CACHE = `${CACHE_PREFIX}${APP_VERSION.replaceAll('.', '-')}`;
const STATIC = [
  "./","./index.html","./about.html","./learn.html","./admin.html",`./about.css?v=${APP_VERSION}`,`./learn.css?v=${APP_VERSION}`,`./admin.css?v=${APP_VERSION}`,`./js/i18n.js?v=${APP_VERSION}`,`./js/ui/about.js?v=${APP_VERSION}`,`./js/ui/about-i18n.js?v=${APP_VERSION}`,`./js/ui/learn-i18n.js?v=${APP_VERSION}`,`./js/ui/learn-i18n-de.js?v=${APP_VERSION}`,`./js/ui/learn-i18n-en.js?v=${APP_VERSION}`,`./js/ui/admin-dashboard.js?v=${APP_VERSION}`,`./style.css?v=${APP_VERSION}`,`./bootstrap.js?v=${APP_VERSION}`,`./app.js?v=${APP_VERSION}`,
  "./assets/about/jakob-480.webp","./assets/about/jakob-900.webp","./assets/about/ravjagt-med-boern-720.jpg","./assets/about/ravjagt-med-boern-1200.jpg","./assets/about/ravjagt-med-boern-1800.jpg",`./assets/about/qrcode.min.js?v=${APP_VERSION}`,
  "./config.js","./manifest.webmanifest","./version.json",`./data/zones.geojson?v=${APP_VERSION}`,"./data/model.json",
  "./js/core/score-engine.js","./js/core/adaptive-model.js","./js/core/prediction-engine.js",
  "./js/services/data-service.js","./js/services/zone-registry.js","./js/services/auth-service.js","./js/services/trip-service.js","./js/services/observation-service.js","./js/services/learning-analysis.js","./js/services/historical-analysis.js","./js/services/storage-safety.js",
  "./js/map/map-view.js","./js/ui/info-panel.js","./js/ui/account-panel.js","./js/ui/developer-panel.js"
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(STATIC.map(url=>cache.add(url)))));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
async function networkFirst(request){const cache=await caches.open(CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response.ok)cache.put(request,response.clone());return response;}catch(error){return (await cache.match(request))||(await cache.match('./index.html'))||Response.error();}}
async function liveNetworkOnly(request){try{return await fetch(request,{cache:'no-store'});}catch{return Response.error();}}
async function cacheFirst(request){const cache=await caches.open(CACHE);const cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)cache.put(request,response.clone());return response;}
async function staleWhileRevalidate(request){const cache=await caches.open(CACHE);const cached=await cache.match(request);const update=fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}).catch(()=>null);return cached||await update||Response.error();}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(networkFirst(event.request));return;}
  if(url.pathname.includes('/data/live/')){event.respondWith(liveNetworkOnly(event.request));return;}
  if(url.pathname.endsWith('/version.json')||url.pathname.includes('/data/diagnostics/')||url.pathname.endsWith('/data/zones.geojson')||url.pathname.endsWith('/data/zone-plan.json')){event.respondWith(networkFirst(event.request));return;}
  const versioned=url.searchParams.get('v')===APP_VERSION;
  if(versioned||/\.(?:png|svg|ico|webp|woff2)$/.test(url.pathname)){event.respondWith(cacheFirst(event.request));return;}
  if(/\.(?:js|css)$/.test(url.pathname)){event.respondWith(networkFirst(event.request));return;}
  if(/\.(?:json|geojson|webmanifest)$/.test(url.pathname)){event.respondWith(staleWhileRevalidate(event.request));return;}
  event.respondWith(cacheFirst(event.request));
});
