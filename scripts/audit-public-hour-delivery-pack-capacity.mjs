#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPrivatePublicHourDeliveryPack } from './lib/public-hour-delivery-pack.mjs';
import { assertPublicDeliveryDocument } from '../js/core/public-delivery-contract.js';
import { publicDeliveryTransportEntries } from '../js/services/public-delivery-transport-binding.js';
import { readPublicDeliveryJsonBytes } from './lib/public-delivery-json-transport.mjs';
import { readExactMapResponse } from './lib/public-map-hour-pages.mjs';

async function fetchBytes(fetchImpl, url, maximumBytes, exact = false) {
  const response = await fetchImpl(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!response.ok) throw new Error(`PUBLIC_HOUR_CAPACITY_HTTP_${response.status}`);
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maximumBytes) {
    throw new Error('PUBLIC_HOUR_CAPACITY_REMOTE_SIZE_LIMIT');
  }
  if (exact) return readExactMapResponse(response, maximumBytes);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > maximumBytes) throw new Error('PUBLIC_HOUR_CAPACITY_REMOTE_SIZE_LIMIT');
  return bytes;
}

export async function auditPublicHourDeliveryPackCapacity({ baseUrl, fetchImpl = globalThis.fetch } = {}) {
  const normalizedBase = new URL(baseUrl).toString().replace(/\/$/, '');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-public-hour-capacity-'));
  try {
    const live = path.join(root, 'data', 'live');
    const forecast = path.join(live, 'forecast');
    await fs.mkdir(forecast, { recursive: true });
    const manifestBytes = await fetchBytes(fetchImpl, `${normalizedBase}/data/live/manifest.json?capacity=${Date.now()}`, 1024 * 1024);
    const manifest = JSON.parse(manifestBytes.toString('utf8'));
    if (manifest.conditionsPath !== './public-conditions.json') throw new Error('PUBLIC_HOUR_CAPACITY_STARTUP_PATH');
    const startupPath = 'data/live/public-conditions.json';
    const startupBytes = await fetchBytes(fetchImpl, `${normalizedBase}/${startupPath}?capacity=${Date.now()}-startup`, 8 * 1024 * 1024);
    if (startupBytes.length !== manifest.publicConditionsBytes
      || createHash('sha256').update(startupBytes).digest('hex') !== manifest.publicConditionsSha256) {
      throw new Error('PUBLIC_HOUR_CAPACITY_STARTUP_BINDING_MISMATCH');
    }
    const startup = JSON.parse(startupBytes.toString('utf8'));
    const descriptors = publicDeliveryTransportEntries(manifest).filter(entry => entry.kind === 'hour');
    if (descriptors.length !== 118) throw new Error('PUBLIC_HOUR_CAPACITY_INVENTORY_INVALID');
    const strictPlain = manifest.detailDelivery.coldHoursSchema === 1;
    const logicalHours = {};
    let cursor = 0, failure = null;
    const workers = Array.from({ length: 8 }, async () => {
      while (!failure && cursor < descriptors.length) {
        const index = cursor++;
        const entry = descriptors[index];
        const remotePath = 'data/live/' + entry.path.slice(2);
        try {
          const bytes = await fetchBytes(fetchImpl, normalizedBase + '/' + remotePath + '?capacity=' + Date.now() + '-' + index,
            entry.bytes, true);
          const logical = await readPublicDeliveryJsonBytes(bytes, entry, strictPlain, { includeLogicalPayload: true });
          assertPublicDeliveryDocument(logical.value, manifest, entry);
          const file = logical.logicalSha256 + '.json';
          await fs.writeFile(path.join(forecast, file), logical.logicalPayload, { flag: 'wx' });
          logicalHours[entry.key] = { path: './forecast/' + file, sha256: logical.logicalSha256, bytes: logical.logicalBytes };
        } catch (error) { failure ??= error; }
      }
    });
    await Promise.all(workers);
    if (failure) throw failure;
    // The private pack contract expects raw logical hour identities. Neither
    // the public compressed paths nor its additional display metadata belong here.
    const logicalManifest = {
      datasetId: manifest.datasetId,
      productionReferenceAt: manifest.productionReferenceAt,
      publicConditionDetailsSha256: manifest.publicConditionDetailsSha256,
      ravScoreModelBinding: manifest.ravScoreModelBinding,
      detailDelivery: {
        schemaVersion: manifest.detailDelivery.schemaVersion,
        sourceDetailsSha256: manifest.detailDelivery.sourceDetailsSha256,
        hours: Object.fromEntries(descriptors.map(({ key }) => [key, logicalHours[key]])),
      },
    };
    const built = await buildPrivatePublicHourDeliveryPack({
      liveDirectory: live,
      publicManifest: logicalManifest,
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
