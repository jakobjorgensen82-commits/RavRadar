const CACHE = "ravradar-v2-5-3";
const STATIC = ["./", "./index.html", "./style.css?v=2.5.3", "./app.js?v=2.5.3", "./data/zones.geojson", "./data/model.json"];

self.addEventListener("install", event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(STATIC)).then(() => self.skipWaiting())
));

self.addEventListener("activate", event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || Response.error();
  }
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const freshAsset = event.request.mode === "navigate" || /\.(?:js|css|html)$/.test(url.pathname);
  if (url.pathname.endsWith("/data/live/conditions.json") || freshAsset) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || networkFirst(event.request)));
});
