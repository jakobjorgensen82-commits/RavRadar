import fs from "node:fs";

const zones = JSON.parse(fs.readFileSync("data/zones.geojson", "utf8"));
const conditions = JSON.parse(fs.readFileSync("data/live/conditions.json", "utf8"));

if (zones.type !== "FeatureCollection" || !Array.isArray(zones.features)) {
  throw new Error("Ugyldig zones.geojson");
}

const ids = new Set();
for (const feature of zones.features) {
  const properties = feature?.properties || {};
  const id = properties.id;
  if (!id || ids.has(id)) throw new Error(`Manglende eller dubleret zone-id: ${id}`);
  if (!properties.name || !properties.region) throw new Error(`${id}: navn eller region mangler`);
  if (!["east", "west", "limfjord"].includes(properties.coastType)) throw new Error(`${id}: ugyldig coastType`);
  if (!Number.isFinite(properties.onshoreDirectionDeg)) throw new Error(`${id}: onshoreDirectionDeg mangler`);
  if (feature?.geometry?.type !== "Polygon") throw new Error(`${id}: kun Polygon understøttes endnu`);
  ids.add(id);
}

if (conditions.schemaVersion !== 1 || typeof conditions.zones !== "object" || Array.isArray(conditions.zones)) {
  throw new Error("Ugyldig conditions.json");
}

for (const conditionId of Object.keys(conditions.zones)) {
  if (!ids.has(conditionId)) throw new Error(`conditions.json indeholder ukendt zone: ${conditionId}`);
}

console.log(`OK: ${zones.features.length} zoner og ${Object.keys(conditions.zones).length} zoner med aktuelle data.`);
