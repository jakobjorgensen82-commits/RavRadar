import fs from "node:fs";

const zones = JSON.parse(fs.readFileSync("data/zones.geojson", "utf8"));
const conditions = JSON.parse(fs.readFileSync("data/live/conditions.json", "utf8"));

if (zones.type !== "FeatureCollection" || !Array.isArray(zones.features)) throw new Error("Ugyldig zones.geojson");

const ids = new Set();
for (const feature of zones.features) {
  const properties = feature?.properties || {};
  const id = properties.id;
  if (!id || ids.has(id)) throw new Error(`Manglende eller dubleret zone-id: ${id}`);
  if (!properties.name || !properties.region) throw new Error(`${id}: navn eller region mangler`);
  if (!["east", "west", "limfjord"].includes(properties.coastType)) throw new Error(`${id}: ugyldig coastType`);
  if (!Number.isFinite(properties.onshoreDirectionDeg)) throw new Error(`${id}: onshoreDirectionDeg mangler`);
  if (!Array.isArray(properties.dataPoint) || properties.dataPoint.length !== 2 || !properties.dataPoint.every(Number.isFinite)) {
    throw new Error(`${id}: dataPoint skal være [længdegrad, breddegrad]`);
  }
  if (feature?.geometry?.type !== "Polygon") throw new Error(`${id}: kun Polygon understøttes endnu`);
  ids.add(id);
}

if (conditions.schemaVersion !== 3 || typeof conditions.zones !== "object" || conditions.zones === null || Array.isArray(conditions.zones)) {
  throw new Error(`Ugyldig conditions.json: forventede schemaVersion 3 og zones som objekt, fik schemaVersion ${conditions.schemaVersion}`);
}

for (const [conditionId, condition] of Object.entries(conditions.zones)) {
  if (!ids.has(conditionId)) throw new Error(`conditions.json indeholder ukendt zone: ${conditionId}`);
  if (!condition.current || !Number.isFinite(Number(condition.current.windSpeedMps))) throw new Error(`${conditionId}: vinddata mangler`);
  if (condition.samples24h && !Array.isArray(condition.samples24h)) throw new Error(`${conditionId}: samples24h skal være en liste`);
}

console.log(`OK: ${zones.features.length} zoner og ${Object.keys(conditions.zones).length} zoner med aktuelle data.`);
