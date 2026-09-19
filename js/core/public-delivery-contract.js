// Delivery-only contract. The existing full public artifact remains the semantic
// oracle; these packages never calculate weather or scores.
export const PUBLIC_DELIVERY_SCHEMA = 1;
export const PUBLIC_DELIVERY_MAX_BYTES = 16 * 1024 * 1024;
const HASH = /^[a-f0-9]{64}$/;
const HOUR_MS = 3600000;

export function createBoundedPublicMemory({ maxBytes = 32 * 1024 * 1024, maxFiles = 24 } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || !Number.isSafeInteger(maxFiles) || maxFiles < 1) {
    throw new Error('Public memory limits must be positive safe integers.');
  }
  const entries = new Map();
  let bytes = 0;
  return {
    get(key) {
      const entry = entries.get(key);
      if (entry) { entries.delete(key); entries.set(key, entry); }
      return entry;
    },
    remember(key, entry) {
      if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || entry.bytes > maxBytes) return;
      bytes -= entries.get(key)?.bytes ?? 0;
      entries.delete(key);
      entries.set(key, entry);
      bytes += entry.bytes;
      while (entries.size > maxFiles || bytes > maxBytes) {
        const oldest = entries.keys().next().value;
        bytes -= entries.get(oldest).bytes;
        entries.delete(oldest);
      }
    },
    clear() { entries.clear(); bytes = 0; },
    size() { return { files: entries.size, bytes }; },
  };
}

// Called only after the existing envelope, trust, model and availability
// validators. A cached display may avoid network I/O, never advance its clock.
export function reuseVerifiedPublicHour(conditions, manifest, availability) {
  if (conditions?.available !== true || conditions.emergencyDetailsDeferred
    || conditions.datasetId !== manifest.datasetId
    || conditions.generatedAt !== manifest.generatedAt
    || conditions.productionReferenceAt !== manifest.productionReferenceAt
    || conditions.publicRuntimeAvailability?.selectedReferenceAt !== availability.selectedReferenceAt
    || (manifest.detailDelivery && conditions.deliveryManifestIdentity !== publicDeliveryGeneration(manifest))) return null;
  return { ...conditions, publicRuntimeAvailability: availability };
}

export function publicDeliveryGeneration(manifest) {
  return JSON.stringify([manifest.datasetId, manifest.generatedAt, manifest.productionReferenceAt,
    manifest.publicConditionsSha256, manifest.publicConditionDetailsSha256,
    manifest.coastalPartsSha256, manifest.zoneRegistrySha256, manifest.detailDelivery ?? null]);
}

// The caller installs this result in one synchronous transaction. A failed or
// older candidate never installs only its manifest or geometry.
export async function refreshVerifiedPublicGeneration({ manifest, conditions, now }, {
  readManifest, loadConditions, loadZones, reevaluate,
}) {
  const fresh = await readManifest();
  const oldReference = Date.parse(manifest?.productionReferenceAt);
  const freshReference = Date.parse(fresh?.productionReferenceAt);
  const newer = fresh && (freshReference > oldReference || (freshReference === oldReference
    && Date.parse(fresh.generatedAt) >= Date.parse(manifest.generatedAt)));
  if (newer && publicDeliveryGeneration(fresh) !== publicDeliveryGeneration(manifest)) {
    try {
      const [nextConditions, zones] = await Promise.all([
        loadConditions({ manifest: fresh, now }), loadZones({ manifest: fresh }),
      ]);
      if (nextConditions.available) return { manifest: fresh, conditions: nextConditions, zones, changed: true };
    } catch { /* Preserve the verified generation when the candidate is incomplete. */ }
  }
  return { manifest, conditions: await reevaluate({ manifest, conditions, now }), zones: null, changed: false };
}

export function publicDeliveryEntries(manifest) {
  const delivery = manifest?.detailDelivery;
  if (delivery === undefined) return [];
  if (!delivery || delivery.schemaVersion !== PUBLIC_DELIVERY_SCHEMA
    || delivery.sourceDetailsSha256 !== manifest.publicConditionDetailsSha256
    || !HASH.test(delivery.sourceDetailsSha256)) throw new Error('Invalid public delivery source binding.');
  const hours = Object.entries(delivery.hours ?? {});
  const zones = Object.entries(delivery.zones ?? {});
  if (delivery.forecastHours !== 118 || hours.length !== delivery.forecastHours || zones.length !== manifest.zoneCount) {
    throw new Error('Incomplete public delivery inventory.');
  }
  const reference = Date.parse(manifest.productionReferenceAt);
  const entries = [
    ...hours.map(([key, descriptor], index) => {
      if (!Number.isFinite(reference) || key !== new Date(reference + index * HOUR_MS).toISOString()) {
        throw new Error('Non-exact public delivery time axis.');
      }
      return { ...descriptor, kind: 'hour', key };
    }),
    ...zones.map(([key, descriptor]) => {
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) throw new Error('Invalid public delivery zone identity.');
      return { ...descriptor, kind: 'zone', key };
    }),
  ];
  for (const entry of entries) {
    if (!HASH.test(entry.sha256 ?? '') || entry.path !== `./forecast/${entry.sha256}.json`
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 1 || entry.bytes > PUBLIC_DELIVERY_MAX_BYTES) {
      throw new Error('Invalid public delivery descriptor.');
    }
  }
  if (new Set(entries.map(entry => entry.path)).size !== entries.length) throw new Error('Duplicate public delivery file.');
  return entries;
}

export function assertPublicDeliveryDocument(document, manifest, entry) {
  const binding = document?.delivery;
  if (binding?.schemaVersion !== PUBLIC_DELIVERY_SCHEMA || binding.kind !== entry.kind
    || binding.key !== entry.key || binding.sourceDetailsSha256 !== manifest.publicConditionDetailsSha256
    || document.datasetId !== manifest.datasetId || document.generatedAt !== manifest.generatedAt
    || document.productionReferenceAt !== manifest.productionReferenceAt
    || JSON.stringify(binding.modelBinding) !== JSON.stringify(manifest.ravScoreModelBinding)) {
    throw new Error('Public delivery belongs to a different generation, model, source or selection.');
  }
  const zoneIds = Object.keys(document.zones ?? {});
  const scoreIds = Object.keys(document.coastalParts?.zones ?? {});
  const expected = entry.kind === 'zone' ? [entry.key] : Object.keys(manifest.detailDelivery.zones);
  if (JSON.stringify([...zoneIds].sort()) !== JSON.stringify([...expected].sort())
    || JSON.stringify([...scoreIds].sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error('Public delivery zone membership mismatch.');
  }
  const requiredTimes = entry.kind === 'hour' ? [entry.key] : Object.keys(manifest.detailDelivery.hours);
  for (const zoneId of zoneIds) {
    const zone = document.coastalParts.zones[zoneId];
    for (const field of [document.zones[zoneId]?.forecast?.hourly, zone.hourly]) {
      if (!Array.isArray(field) || field.length !== requiredTimes.length
        || field.some((row, index) => row?.time !== requiredTimes[index])) throw new Error('Public delivery row time mismatch.');
    }
    if (Object.values(document.coastalParts.parts ?? {}).filter(part => part.zoneId === zoneId).length !== zone.expectedPartCount) {
      throw new Error('Public delivery local coastal parts are incomplete.');
    }
  }
  const parts = document.coastalParts.parts ?? {};
  if (Object.keys(parts).some(id => !expected.includes(parts[id]?.zoneId))
    || (entry.kind === 'hour' && Object.keys(parts).length !== manifest.coastalPartCount)) {
    throw new Error('Public delivery coastal part membership mismatch.');
  }
  for (const part of Object.values(parts)) {
    if (part.current && entry.kind === 'hour' && (part.current.time !== entry.key
      || [part.current.weather, part.current.waders?.weather, part.current.beach?.weather]
        .some(weather => weather?.time !== undefined && weather.time !== entry.key))) {
      throw new Error('Public delivery contains stale local current data.');
    }
  }
  return document;
}

export function assertPublicDeliveryEquivalence(document, details) {
  if (document.datasetId !== details.datasetId || document.productionReferenceAt !== details.productionReferenceAt
    || document.generatedAt !== details.generatedAt) throw new Error('Delivery oracle generation mismatch.');
  const selected = document.delivery.kind === 'hour' ? document.delivery.key : null;
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  for (const id of Object.keys(document.zones)) {
    const filter = rows => rows.filter(row => !selected || row.time === selected);
    if (!details.zones[id] || !equal(document.zones[id].forecast.hourly, filter(details.zones[id].forecast.hourly))
      || !equal(document.coastalParts.zones[id].hourly, filter(details.coastalParts.zones[id].hourly))) {
      throw new Error('Delivery changed weather or computed zone scores.');
    }
  }
  for (const [id, part] of Object.entries(document.coastalParts.parts)) {
    const stripCurrent = ({ current: _current, flowPoints: _points, ...metadata }) => metadata;
    if (!details.coastalParts.parts[id] || !equal(stripCurrent(part), stripCurrent(details.coastalParts.parts[id]))) {
      throw new Error('Delivery changed coastal part identity, geometry or static metadata.');
    }
  }
  return true;
}
