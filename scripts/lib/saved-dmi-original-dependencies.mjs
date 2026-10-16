// Invocation-local metadata discovery only. No I/O, values, sampling receipt,
// source admission or restoration scope is provided by this module.
import { canonicalSavedDmiOriginalCapture } from './saved-dmi-original-capture.mjs';
import { dmiExpectedIdentityForPart, verifiedDmiNativeComponentSource,
  verifiedDmiForecastComponentSource, verifiedBulkCurrent } from './ravscore-production-adapters.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const canonical = value => JSON.stringify(value, (_key, item) => object(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const refuse = code => { const error = new Error(`SAVED_DMI_ORIGINAL_${code}`);
  error.originalPlanCode = `SAVED_DMI_ORIGINAL_${code}`; throw error; };
const dependencyDiscoveries = new WeakMap();
const derivedNativeFields = ['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours'];
const dependencyIdentityFields = ['collection', 'modelRun', 'validTime', 'itemId', 'assetIdentitySha256',
  'acquiredAt', 'itemCreatedAt', 'itemUpdatedAt'];
const assetMetadataKey = source => typeof source?.itemId === 'string'
  && /^[a-f0-9]{64}$/.test(source.assetIdentitySha256 ?? '')
  ? JSON.stringify([source.assetIdentitySha256, source.itemId.trim()]) : null;

function dependencyIdentity(source, byteFrame) {
  // Byte fields only frame the canonical helper; this projection NEVER becomes
  // a capture. All eight recorded identity fields, including microseconds and
  // absent revisions, must match an independently complete stored capture.
  const normalized = canonicalSavedDmiOriginalCapture({ ...byteFrame,
    collection: source.collection, modelRun: source.modelRun,
    validTime: source.validTime ?? source.nativeValidTime, itemId: source.itemId,
    assetIdentitySha256: source.assetIdentitySha256, acquiredAt: source.acquiredAt,
    itemCreatedAt: source.itemCreatedAt ?? null, itemUpdatedAt: source.itemUpdatedAt ?? null });
  return normalized ? canonical(Object.fromEntries(
    dependencyIdentityFields.map(key => [key, normalized[key]]))) : null;
}

/** Branded to these exact authenticated, unchanged document objects. Only
 * actual stored metadata is read; no captures/functions can be injected.
 */
export function createSavedDmiOriginalDependencyDiscovery({ protectedBulk, progressCandidate = null } = {}) {
  if (!object(protectedBulk?.zones) || progressCandidate !== null && !object(progressCandidate?.zones)) refuse('INPUTS_UNAVAILABLE');
  const indexes = new Map(), ownIndexes = new WeakMap(), captures = new WeakMap(), identities = new WeakMap();
  const captureOf = source => {
    if (!captures.has(source)) captures.set(source, canonicalSavedDmiOriginalCapture(source));
    return captures.get(source);
  };
  const identityOf = (source, frame) => {
    if (!identities.has(source)) identities.set(source, dependencyIdentity(source, frame));
    return identities.get(source);
  };
  const add = (byAsset, source) => {
    const key = assetMetadataKey(source);
    if (!key) return;
    const bucket = byAsset.get(key) ?? { sources: [], groups: null, frame: null };
    bucket.sources.push(source); byAsset.set(key, bucket);
    bucket.frame ??= captureOf(source);
  };
  const index = document => {
    if (indexes.has(document)) return indexes.get(document);
    const byAsset = new Map(); let partCount = 0;
    for (const [id, zone] of Object.entries(document.zones)) {
      if (!id.startsWith('PART::')) continue;
      if (++partCount > 673 || !object(zone) || !object(zone.hourly)
        || Object.keys(zone.hourly).length > 10_000) refuse('DONOR_INVALID');
      for (const row of Object.values(zone.hourly)) {
        const source = row?.sources?.current;
        if (!assetMetadataKey(source) || !object(source)
          || derivedNativeFields.some(field => Object.hasOwn(source, field))
          || zone.entityId !== id
          || !verifiedDmiNativeComponentSource(source, row.time, 'current', zone)
          || !verifiedBulkCurrent(document, zone, zone.samplingPoint, source, row.time, zone)) continue;
        // Eligibility is established ONCE per original row, not for every
        // selected PART endpoint that happens to name this global asset.
        add(byAsset, source);
      }
    }
    indexes.set(document, byAsset); return byAsset;
  };
  const ownIndex = (ownHourly, expected) => {
    let byPart = ownIndexes.get(ownHourly);
    if (!byPart) { byPart = new Map(); ownIndexes.set(ownHourly, byPart); }
    if (byPart.has(expected.entityId)) return byPart.get(expected.entityId);
    const byAsset = new Map();
    for (const row of ownHourly) {
      const source = row?.sources?.current;
      // An OWN exact-native-time forecast may supply its own top capture.
      // Neighbour/interpolated top metadata never supplies another endpoint.
      if (source?.temporalResolution !== 'native' || source.nativeSteps?.length !== 1
        || Date.parse(row.time) !== Date.parse(source.nativeValidTime)
        || !verifiedDmiForecastComponentSource(source, row.time, 'current', expected)) continue;
      add(byAsset, source);
    }
    byPart.set(expected.entityId, byAsset); return byAsset;
  };
  const group = (bucket, frame, identity) => {
    if (!bucket) return null;
    if (!bucket.groups) {
      bucket.groups = new Map();
      for (const source of bucket.sources) {
        const key = identityOf(source, frame);
        if (!key) continue;
        const value = bucket.groups.get(key) ?? { incomplete: false, captures: new Map() };
        const capture = captureOf(source);
        if (!capture) value.incomplete = true;
        else value.captures.set(canonical(capture), capture);
        bucket.groups.set(key, value);
      }
    }
    return bucket.groups.get(identity) ?? null;
  };
  const handle = Object.freeze({ kind: 'SAVED_DMI_ORIGINAL_DEPENDENCY_DISCOVERY' });
  dependencyDiscoveries.set(handle, { protectedBulk, progressCandidate, resolve({ document, part, row, ownHourly }) {
    const source = row.sources?.current, expected = dmiExpectedIdentityForPart(part);
    if (!verifiedDmiForecastComponentSource(source, row.time, 'current', expected)) return null;
    const metadata = index(document), own = ownIndex(ownHourly, expected), result = [];
    for (const step of source.nativeSteps) {
      const query = { collection: source.collection, modelRun: source.modelRun, ...step };
      const nativeBucket = metadata.get(assetMetadataKey(step)), ownBucket = own.get(assetMetadataKey(step));
      const frame = nativeBucket?.frame ?? ownBucket?.frame;
      if (!frame) return null;
      const identity = dependencyIdentity(query, frame);
      if (!identity) return null;
      const groups = [group(nativeBucket, frame, identity), group(ownBucket, frame, identity)].filter(Boolean);
      if (groups.some(value => value.incomplete)) return null;
      const matches = new Map(groups.flatMap(value => [...value.captures]));
      if (matches.size !== 1) return null;
      // Never expose memoized private capture objects to a later caller.
      result.push({ ...[...matches.values()][0] });
    }
    return result;
  } });
  return handle;
}

export function assertSavedDmiOriginalDependencyDiscoveryInputs(handle, { protectedBulk, progressCandidate = null } = {}) {
  const discovery = dependencyDiscoveries.get(handle);
  if (!discovery || discovery.protectedBulk !== protectedBulk || discovery.progressCandidate !== progressCandidate) refuse('INPUTS_UNAVAILABLE');
}

export function resolveSavedDmiOriginalDependencyCaptures(handle, { protectedBulk, progressCandidate = null,
  document, part, row, ownHourly = [] } = {}) {
  assertSavedDmiOriginalDependencyDiscoveryInputs(handle, { protectedBulk, progressCandidate });
  if (document !== protectedBulk && document !== progressCandidate || !Array.isArray(ownHourly)) refuse('INPUTS_UNAVAILABLE');
  return dependencyDiscoveries.get(handle).resolve({ document, part, row, ownHourly });
}
