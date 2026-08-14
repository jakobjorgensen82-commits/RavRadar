const baseUrl = String(
  process.env.RAVRADAR_DEPLOYED_BASE_URL ||
  'https://jakobjorgensen82-commits.github.io/RavRadar'
).replace(/\/$/, '');

async function readJson(path) {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'RavRadar deployed zone/weather audit' }
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const [zones, conditions] = await Promise.all([
  readJson('data/zones.geojson'),
  readJson('data/live/public-conditions.json')
]);

if (zones?.type !== 'FeatureCollection' || !Array.isArray(zones.features)) {
  throw new Error('Deployet zones.geojson er ikke en FeatureCollection.');
}
if (!conditions?.zones || typeof conditions.zones !== 'object' || Array.isArray(conditions.zones)) {
  throw new Error('Deployet public-conditions.json mangler zones-objektet.');
}

const activeZoneIds = new Set(zones.features.map(feature => feature?.properties?.id).filter(Boolean));
const conditionZoneIds = new Set(Object.keys(conditions.zones));
const missing = [...activeZoneIds].filter(id => !conditionZoneIds.has(id)).sort();
const unknown = [...conditionZoneIds].filter(id => !activeZoneIds.has(id)).sort();

if (activeZoneIds.size !== zones.features.length) throw new Error('Deployet zoneregister har manglende eller dublerede ID\'er.');
if (missing.length || unknown.length) {
  throw new Error(
    `Deployet zone-/vejrdækning fejler: ${missing.length} mangler (${missing.slice(0, 5).join(', ') || 'ingen'}), ` +
    `${unknown.length} ukendte (${unknown.slice(0, 5).join(', ') || 'ingen'}).`
  );
}

console.log(JSON.stringify({
  ok: true,
  baseUrl,
  datasetId: conditions.datasetId || null,
  generatedAt: conditions.generatedAt || null,
  zoneCount: activeZoneIds.size,
  checkedZoneIds: ['DK-B04-12', 'DK-B04-13', 'DK-B04-14'].map(id => ({
    id,
    zone: activeZoneIds.has(id),
    weather: conditionZoneIds.has(id)
  }))
}, null, 2));
