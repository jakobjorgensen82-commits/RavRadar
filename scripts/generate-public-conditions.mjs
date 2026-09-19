import fs from 'node:fs/promises';
import path from 'node:path';
import { writePublicRuntimeFromFull } from './public-conditions-lib.mjs';
import { PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE } from './lib/private-weather-component-inventory.mjs';
import { privatePublicHourDeliveryMarker } from './lib/public-hour-delivery-pack.mjs';
const input=JSON.parse(await fs.readFile('data/live/conditions.json','utf8'));
const {publicDocument,manifest}=await writePublicRuntimeFromFull(input, {
  hourDeliveryPackPath: privatePublicHourDeliveryMarker(input)
    ? path.resolve(PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath)
    : null,
});
console.log(`Skrev public-conditions.json med ${Object.keys(publicDocument.zones).length} zoner og manifest schema ${manifest.schemaVersion}.`);
