import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { plainMapHourEntries, readMapHour } from '../../js/services/plain-map-hour.js';
import { scoreRating } from '../../js/core/score-presentation.js';
import { sameRavScoreModelBinding } from '../../js/core/ravscore-public-runtime-contract.js';

export async function mapHourPagesInventory({ liveDirectory, manifest, fullEntries }) {
  if (manifest.detailDelivery?.mapHours === undefined) return [];
  const registryPath = path.join(liveDirectory, 'coastal-parts-v2.json');
  const stat = await fs.lstat(registryPath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== manifest.coastalPartsBytes
    || stat.size > 16 * 1024 * 1024) throw new Error('MAP_HOUR_PAGES_REGISTRY_SIZE');
  const registryBytes = await fs.readFile(registryPath);
  return mapHourInventoryFromRegistry({ registryBytes, manifest, fullEntries });
}

export async function readExactMapResponse(response, bytes) {
  if (!response.body || typeof response.body.getReader !== 'function') throw new Error('MAP_HOUR_PAGES_BODY');
  const reader = response.body.getReader();
  const payload = Buffer.allocUnsafe(bytes);
  let offset = 0;
  let ended = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        ended = true;
        break;
      }
      if (!(value instanceof Uint8Array) || offset + value.byteLength > bytes) {
        throw new Error('MAP_HOUR_PAGES_BODY_SIZE');
      }
      payload.set(value, offset);
      offset += value.byteLength;
    }
  } finally {
    try {
      if (!ended) await reader.cancel();
    } finally {
      reader.releaseLock();
    }
  }
  if (offset !== bytes) throw new Error('MAP_HOUR_PAGES_BODY_SIZE');
  return payload;
}

export function mapHourInventoryFromRegistry({ registryBytes, manifest, fullEntries }) {
  const descriptors = plainMapHourEntries(manifest, fullEntries);
  if (descriptors === null) return [];
  if (!(registryBytes instanceof Uint8Array) || registryBytes.length !== manifest.coastalPartsBytes
    || registryBytes.length > 16 * 1024 * 1024
    || createHash('sha256').update(registryBytes).digest('hex') !== manifest.coastalPartsSha256) {
    throw new Error('MAP_HOUR_PAGES_REGISTRY_SHA');
  }
  const registry = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(registryBytes));
  const zoneIds = fullEntries.filter(entry => entry.kind === 'zone').map(entry => entry.key);
  const partZones = Object.create(null);
  if (registry.zones === null || typeof registry.zones !== 'object'
    || Object.keys(registry.zones).length !== zoneIds.length) throw new Error('MAP_HOUR_PAGES_REGISTRY_ZONES');
  for (const zoneId of zoneIds) {
    const parts = registry.zones[zoneId];
    if (!Array.isArray(parts) || parts.length === 0) throw new Error('MAP_HOUR_PAGES_REGISTRY_PARTS');
    for (const part of parts) {
      if (part?.sourceZoneId !== zoneId || typeof part.partId !== 'string' || Object.hasOwn(partZones, part.partId)) {
        throw new Error('MAP_HOUR_PAGES_REGISTRY_PART_OWNER');
      }
      partZones[part.partId] = zoneId;
    }
  }
  if (Object.keys(partZones).length !== manifest.coastalPartCount) throw new Error('MAP_HOUR_PAGES_REGISTRY_COVERAGE');
  const scope = { zoneIds, partZones, sameModelBinding: sameRavScoreModelBinding, scoreRating };
  return fullEntries.filter(entry => entry.kind === 'hour').map(entry => {
    const descriptor = descriptors[entry.key];
    return { path: descriptor.path, bytes: descriptor.bytes,
      async read(bytes) {
        const frame = await readMapHour(bytes, { descriptor, manifest, entry, scope });
        if (frame.landing) {
          const { assertCompactLandingRankings } = await import('../../js/services/data-service.js');
          assertCompactLandingRankings(frame, manifest);
        }
        return frame;
      },
      readResponse: response => readExactMapResponse(response, descriptor.bytes) };
  });
}
