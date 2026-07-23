const ZONES_URL = "./data/zones.geojson";
const CONDITIONS_URL = "./data/live/conditions.json";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export async function loadZones() {
  const collection = await fetchJson(ZONES_URL);
  return {
    ...collection,
    features: (collection.features || []).filter(feature => feature?.properties?.zoneStatus !== "legacy")
  };
}

export async function loadConditions() {
  try {
    const data = await fetchJson(CONDITIONS_URL);
    return { ...data, available: true };
  } catch (error) {
    console.warn("Aktuelle forhold kunne ikke indlæses", error);
    return { available: false, generatedAt: null, zones: {} };
  }
}
