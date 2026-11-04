#!/usr/bin/env node
import fs from 'node:fs/promises';
import { copyForecastShareProjection } from './build-forecast-share-projection.mjs';
import { copyPublicDeliveryShards } from './copy-public-delivery-shards.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicDeliveryDocument } from '../js/core/public-delivery-contract.js';
import { publicDeliveryTransportEntries } from '../js/services/public-delivery-transport-binding.js';
import { readPublicDeliveryJsonFile } from './lib/public-delivery-json-transport.mjs';

export async function copyPagesPublicDelivery({ source, target }) {
  const manifest = JSON.parse(await fs.readFile(path.join(source, 'manifest.json'), 'utf8'));
  if (manifest.detailDelivery?.coldHoursSchema === undefined
      && manifest.detailDelivery?.mapHours === undefined
      && manifest.publicConditionDetailsArchive === undefined) {
    return copyPublicDeliveryShards({ source, target });
  }
  // Pages transports are verified around the existing logical public
  // document contract. They do not alter private projection compatibility.
  const entries = publicDeliveryTransportEntries(manifest);
  const strictPlain = manifest.detailDelivery?.coldHoursSchema === 1;
  if (entries.length) await fs.mkdir(path.join(target, 'forecast'), { recursive: true });
  for (const entry of entries) {
    const relative = entry.path.slice(2);
    const sourcePath = path.join(source, relative);
    const loaded = await readPublicDeliveryJsonFile(sourcePath, entry, strictPlain);
    assertPublicDeliveryDocument(loaded.value, manifest, entry);
    await fs.writeFile(path.join(target, relative), loaded.outerBytes);
  }
  let mapFiles = 0;
  if (manifest.detailDelivery?.mapHours !== undefined) {
    const { mapHourPagesInventory } = await import('./lib/public-map-hour-pages.mjs');
    const mapHours = await mapHourPagesInventory({ liveDirectory: source, manifest, fullEntries: entries });
    for (const entry of mapHours) {
      const relative = entry.path.slice(2);
      const sourcePath = path.join(source, relative);
      const stat = await fs.lstat(sourcePath);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.bytes) throw new Error('Invalid compact map file size/type.');
      const bytes = await fs.readFile(sourcePath);
      await entry.read(bytes);
      await fs.writeFile(path.join(target, relative), bytes);
      mapFiles++;
    }
  }
  const share = await copyForecastShareProjection({ source, target });
  if (manifest.publicConditionDetailsArchive !== undefined) {
    const { replaceStagedBulkWithArchive } = await import('./lib/public-bulk-details-archive.mjs');
    await replaceStagedBulkWithArchive({ source, target, manifest });
  }
  return { files: entries.length + mapFiles + share.files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const option = key => process.argv[process.argv.indexOf(key) + 1];
  if (!process.argv.includes('--source') || !process.argv.includes('--target')) throw new Error('Use --source and --target.');
  console.log(JSON.stringify(await copyPagesPublicDelivery({ source: option('--source'), target: option('--target') })));
}
