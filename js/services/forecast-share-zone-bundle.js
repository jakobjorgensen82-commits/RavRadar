import { FORECAST_SHARE_INDEX_MAX_BYTES, FORECAST_SHARE_ZONE_MAX_BYTES } from './forecast-share-projection.js?v=4.0.602';
import { assertForecastShareTrustMetadata, assertForecastShareTrustEntry } from './forecast-share-trust-index.js?v=4.0.602';

export const FORECAST_SHARE_ZONE_BUNDLE_DIRECTORY = 'forecast-share-zones';
export const FORECAST_SHARE_ZONE_BUNDLE_MAX_BYTES = FORECAST_SHARE_INDEX_MAX_BYTES + 2 * FORECAST_SHARE_ZONE_MAX_BYTES;
export const FORECAST_SHARE_ZONE_BUNDLE_MODULE = 'js/services/forecast-share-zone-bundle.js';

export function forecastShareZoneBundlePath(zoneId) {
  if (typeof zoneId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(zoneId)) {
    throw new Error('FORECAST_SHARE_BUNDLE_ZONE');
  }
  return FORECAST_SHARE_ZONE_BUNDLE_DIRECTORY + '/' + zoneId + '.json';
}

// Carry the exact already-verified zone bytes so its public hash remains the
// same across both readers. The normal artifact verifier binds this envelope
// to the complete published index independently of the sharing request.
export function buildForecastShareZoneBundle(trustIndex, entry, projectionText) {
  return { index: { ...trustIndex, zones: [entry] }, projectionText };
}

export function assertForecastShareZoneBundle(bundle, zoneId) {
  if (!bundle || typeof bundle !== 'object' || Array.isArray(bundle)
      || Object.keys(bundle).length !== 2 || !Object.hasOwn(bundle, 'index')
      || !Object.hasOwn(bundle, 'projectionText') || typeof bundle.projectionText !== 'string') {
    throw new Error('FORECAST_SHARE_BUNDLE_FIELDS');
  }
  const index = assertForecastShareTrustMetadata(bundle.index);
  if (!Array.isArray(index.zones) || index.zones.length !== 1) {
    throw new Error('FORECAST_SHARE_BUNDLE_INVENTORY');
  }
  const entry = assertForecastShareTrustEntry(index.zones[0]);
  if (entry.id !== zoneId) throw new Error('FORECAST_SHARE_BUNDLE_ZONE');
  return bundle;
}
