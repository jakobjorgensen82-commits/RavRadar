const APP_VERSION = '3.1.4';
const ZONE_REGISTRY_URL = `./data/zones.geojson?v=${APP_VERSION}`;
let registryPromise = null;

function normalize(collection) {
  const all = Array.isArray(collection?.features) ? collection.features : [];
  const active = all.filter(feature => feature?.properties?.zoneStatus !== 'legacy');
  const legacy = all.filter(feature => feature?.properties?.zoneStatus === 'legacy');
  const ids = new Set();
  const duplicates = [];
  for (const feature of all) {
    const id = feature?.properties?.id;
    if (!id) continue;
    if (ids.has(id)) duplicates.push(id);
    ids.add(id);
  }
  return {
    collection,
    all,
    active,
    legacy,
    counts: { registered: all.length, active: active.length, legacy: legacy.length },
    duplicates
  };
}

export async function loadZoneRegistry({ forceRefresh = false } = {}) {
  if (!registryPromise || forceRefresh) {
    registryPromise = fetch(ZONE_REGISTRY_URL, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error(`Zone Registry: HTTP ${response.status}`);
      const collection = await response.json();
      const registry = normalize(collection);
      if (!registry.counts.registered) throw new Error('Zone Registry indeholder ingen zoner');
      if (registry.duplicates.length) throw new Error(`Zone Registry har dublerede id'er: ${registry.duplicates.join(', ')}`);
      return registry;
    }).catch(error => {
      registryPromise = null;
      throw error;
    });
  }
  return registryPromise;
}

export async function loadActiveZoneCollection(options) {
  const registry = await loadZoneRegistry(options);
  return { ...registry.collection, features: registry.active };
}

export { ZONE_REGISTRY_URL };
