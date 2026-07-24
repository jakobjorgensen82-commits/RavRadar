const APP_VERSION = "3.0.0";
const CACHE_PREFIX = "ravradar-app-";
const CACHE = `${CACHE_PREFIX}${APP_VERSION.replaceAll('.', '-')}`;
const STATIC = [
  "./",
  "./index.html",
  "./admin.html",
  `./admin.css?v=${APP_VERSION}`,
  `./js/ui/admin-dashboard.js?v=${APP_VERSION}`,
  `./style.css?v=${APP_VERSION}`,
  `./bootstrap.js?v=${APP_VERSION}`,
  `./app.js?v=${APP_VERSION}`,
  "./config.js",
  "./manifest.webmanifest",
  "./version.json",
  "./data/zones.geojson",
  "./data/model.json",
  "./js/core/score-engine.js",
  "./js/core/rule-engine.js",
  "./js/core/adaptive-model.js",
  "./js/core/prediction-engine.js",
  "./js/services/rule-service.js",
  "./rules/national-rules.json",
  "./rules/local-rules.json",
  "./rules/experimental-rules.json",
  "./js/services/data-service.js",
  "./js/services/auth-service.js",
  "./js/services/trip-service.js",
  "./js/services/observation-service.js",
  "./js/services/learning-analysis.js",
  "./js/services/historical-analysis.js",
  "./js/services/storage-safety.js",
  "./js/map/map-view.js",
  "./js/ui/info-panel.js",
  "./js/ui/account-panel.js",
  "./js/ui/developer-panel.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(STATIC)));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/data/live/conditions.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // HTML skal være network-first, så en gammel appskal ikke låser brugeren fast.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  const isAppAsset = url.origin === self.location.origin && /\.(?:js|css|json|webmanifest)$/.test(url.pathname);
  if (isAppAsset) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
