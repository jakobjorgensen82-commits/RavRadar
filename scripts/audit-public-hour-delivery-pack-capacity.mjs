#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';

async function fetchBytes(url, maximumBytes) {
  const response = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`PUBLIC_HOUR_CAPACITY_HTTP_${response.status}`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new Error('PUBLIC_HOUR_CAPACITY_REMOTE_SIZE_LIMIT');
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maximumBytes) throw new Error('PUBLIC_HOUR_CAPACITY_REMOTE_SIZE_LIMIT');
  return bytes;
}

export async function auditPublicHourDeliveryPackCapacity({ baseUrl } = {}) {
  const normalizedBase = new URL(baseUrl).toString().replace(/\/$/, '');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-public-hour-capacity-'));
  try {
    const live = path.join(root, 'data', 'live');
    const forecast = path.join(live, 'forecast');
    await fs.mkdir(forecast, { recursive: true });
    const manifestBytes = await fetchBytes(`${normalizedBase}/data/live/manifest.json?capacity=${Date.now()}`, 1024 * 1024);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    const startupPath = String(manifest.conditionsPath ?? '').replace(/^\.\//, 'data/live/');
    const startupBytes = await fetchBytes(`${normalizedBase}/${startupPath}?capacity=${Date.now()}-startup`, 8 * 1024 * 1024);
    if (startupBytes.length !== manifest.publicConditionsBytes) {
      throw new Error('PUBLIC_HOUR_CAPACITY_STARTUP_SIZE_MISMATCH');
    }
    const startup = JSON.parse(startupBytes.toString('utf8'));
    const descriptors = Object.values(manifest?.detailDelivery?.hours ?? {});
    if (descriptors.length !== 118) throw new Error('PUBLIC_HOUR_CAPACITY_INVENTORY_INVALID');
    let cursor = 0;
    const workers = Array.from({ length: 8 }, async () => {
      while (cursor < descriptors.length) {
        const index = cursor;
        cursor += 1;
        const descriptor = descriptors[index];
        const remotePath = String(descriptor.path ?? '').replace(/^\.\//, 'data/live/');
        const bytes = await fetchBytes(`${normalizedBase}/${remotePath}?capacity=${Date.now()}-${index}`, 8 * 1024 * 1024);
        if (bytes.length !== descriptor.bytes) throw new Error('PUBLIC_HOUR_CAPACITY_FILE_SIZE_MISMATCH');
        await fs.writeFile(path.join(forecast, path.basename(remotePath)), bytes);
      }
    });
    await Promise.all(workers);
    const built = await buildPrivatePublicHourDeliveryPack({
      liveDirectory: live,
      publicManifest: manifest,
      startupNationalForecast: startup.nationalForecast,
      outputPath: path.join(root, '.cache', 'public-hour-delivery.pack'),
    });
    return {
      schemaVersion: 1,
      kind: 'PUBLIC_HOUR_DELIVERY_PACK_CAPACITY_AUDIT',
      datasetId: manifest.datasetId,
      forecastHours: descriptors.length,
      rawBytes: built.marker.rawBytes,
      packBytes: built.marker.packBytes,
      compressionRatio: Number((built.marker.packBytes / built.marker.rawBytes).toFixed(6)),
      privateArchiveAggregateMaximumBytes: 350_000_000,
      withinStandaloneArchiveBound: built.marker.packBytes < 350_000_000,
      publicPayloadIncluded: false,
    };
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseUrl = process.argv[2];
  if (!baseUrl) throw new Error('Usage: audit-public-hour-delivery-pack-capacity.mjs <base-url>');
  console.log(JSON.stringify(await auditPublicHourDeliveryPackCapacity({ baseUrl }), null, 2));
}
