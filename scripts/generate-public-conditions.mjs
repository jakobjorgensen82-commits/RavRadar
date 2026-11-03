import fs from 'node:fs/promises';
import { writeForecastShareProjection } from './build-forecast-share-projection.mjs';
import path from 'node:path';
import { writePublicRuntimeFromFull } from './public-conditions-lib.mjs';
import { hydratePrivateConditionsHourly } from './lib/private-conditions-hourly.mjs';
import { PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { privatePublicHourDeliveryMarker } from './lib/public-hour-delivery-pack.mjs';
const emitMapHours = process.env.RAVRADAR_PLAIN_MAP_HOURS === 'true';
const encodeColdHours = process.env.RAVRADAR_PUBLIC_COLD_HOURS === 'true';
if (encodeColdHours && !emitMapHours) throw new Error('PUBLIC_COLD_HOURS_REQUIRES_LANDING');
const input=hydratePrivateConditionsHourly(JSON.parse(await fs.readFile('data/live/conditions.json','utf8')));
const producerResult=await writePublicRuntimeFromFull(input, {
  hourDeliveryPackPath: privatePublicHourDeliveryMarker(input)
    ? path.resolve(PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath)
    : null,
});
if (emitMapHours) {
  const { appendPublicMapHours } = await import('./lib/public-map-hour-projection.mjs');
  await appendPublicMapHours({ manifestPath: 'data/live/manifest.json', manifest: producerResult.manifest,
    zoneRegistryPath: 'data/zones.geojson', encodeColdHours });
}
if (process.env.RAVRADAR_PUBLIC_BULK_ARCHIVE === 'true') {
  const { appendPublicBulkArchive } = await import('./lib/public-bulk-details-archive.mjs');
  await appendPublicBulkArchive({ manifestPath: 'data/live/manifest.json', manifest: producerResult.manifest });
}
await writeForecastShareProjection({ repository: process.cwd(), producerResult });
const {publicDocument,manifest}=producerResult;
console.log(`Skrev public-conditions.json med ${Object.keys(publicDocument.zones).length} zoner og manifest schema ${manifest.schemaVersion}.`);
