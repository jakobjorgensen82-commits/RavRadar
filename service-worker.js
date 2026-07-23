const CACHE = "ravradar-v2-6-11";
const STATIC = ["./", "./index.html", "./style.css?v=2.6.6", "./app.js?v=2.6.6", "./config.js", "./data/zones.geojson", "./data/model.json", "./js/core/score-engine.js", "./js/services/data-service.js", "./js/services/auth-service.js", "./js/services/trip-service.js", "./js/services/observation-service.js", "./js/map/map-view.js", "./js/ui/info-panel.js", "./js/ui/account-panel.js", "./js/ui/developer-panel.js"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/data/live/conditions.json")) { event.respondWith(fetch(event.request, { cache:"no-store" }).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response; }).catch(() => caches.match(event.request))); return; }
  if (event.request.method === "GET") event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); return response; })));
});
