// Fixed production inventory. Legacy generations remain exactly nine files.
// Component inputs and the derived public-hour continuation are independent,
// bounded, internally allowlisted private packs.
export const PRIVATE_RUNTIME_BASE_FILES = Object.freeze([
  { id: 'full-conditions', relativePath: 'data/live/conditions.json' },
  { id: 'dmi-forecast-cache', relativePath: 'data/live/dmi-forecast-cache.json' },
  { id: 'dmi-bulk-cache', relativePath: 'data/live/dmi-bulk-cache.json' },
  { id: 'copernicus-current-range-cache', relativePath: '.cache/copernicus-current-shadow.json' },
  { id: 'open-meteo-current-fallback', relativePath: '.cache/open-meteo-current-fallback.json' },
  { id: 'current-pilot-history', relativePath: 'data/live/current-pilot-history.json' },
  { id: 'weather-health', relativePath: 'data/live/weather-health.json' },
  { id: 'runtime-diagnostics', relativePath: 'data/live/ravradar-runtime-diagnostics.json' },
  { id: 'dmi-water-stations', relativePath: 'data/live/dmi-water-stations.json' },
].map(Object.freeze));
export const PRIVATE_WEATHER_COMPONENT_PACK_FILE = Object.freeze({
  id: 'weather-component-inputs', relativePath: '.cache/weather-component-inputs.pack',
});
export const PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE = Object.freeze({
  id: 'public-hour-delivery', relativePath: '.cache/public-hour-delivery.pack',
});
export const PRIVATE_WEATHER_COMPONENT_FILES = Object.freeze({
  openMeteoBank: '.cache/open-meteo-part-component-bank.json',
  copernicusBank: '.cache/copernicus-component-bank.json',
  copernicusProgress: '.cache/copernicus-component-bank.json.progress.json',
  fallbackCursor: '.cache/weather-component-fallback-cursor.json',
  selectedComponents: '.cache/weather-component-selection-history.json',
  // Existing acquisition progress is private for the same reason as the new
  // PART banks: it contains approved sampling identities and/or raw selected
  // values. Keep it inside the authenticated private pack instead of a
  // plaintext Actions cache readable by fork pull requests.
  dmiActive: '.cache/dmi-active-complete.json',
  dmiCandidate: '.cache/dmi-candidate-progress.json',
  currentFieldShadow: '.cache/current-field-shadow.json',
  copernicusCurrentShadow: '.cache/copernicus-current-shadow.json',
  copernicusCurrentSourceStage: '.cache/copernicus-current-source-stage.json',
  copernicusCurrentDonorBank: '.cache/copernicus-current-donor-bank.json',
  copernicusCurrentSegmentJournal: '.cache/copernicus-current-segment-journal.json',
  openMeteoCurrentFallback: '.cache/open-meteo-current-fallback.json',
  openMeteoCurrentDonorBank: '.cache/open-meteo-current-donor-bank.json',
  coastalPointDmi: '.cache/coastal-point-staging/dmi.json',
  coastalPointState: '.cache/coastal-point-staging/state.json',
  coastalPointStatus: '.cache/coastal-point-staging/status.json',
  coastalPointActivationState: '.cache/coastal-point-staging/activation-state-injection.json',
  coastalPointPendingPromotion: '.cache/coastal-point-staging/pending-promotion.json',
});
export function assertPrivateRuntimeInventory(files) {
  const actual = files.map(({ id, relativePath }) => `${id}:${relativePath}`).sort();
  const base = PRIVATE_RUNTIME_BASE_FILES.map(({ id, relativePath }) => `${id}:${relativePath}`).sort();
  const weather = `${PRIVATE_WEATHER_COMPONENT_PACK_FILE.id}:${PRIVATE_WEATHER_COMPONENT_PACK_FILE.relativePath}`;
  const publicHours = `${PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.id}:${PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE.relativePath}`;
  const allowed = [base, [...base, weather].sort(), [...base, publicHours].sort(),
    [...base, weather, publicHours].sort()];
  if (!allowed.some(expected => JSON.stringify(actual) === JSON.stringify(expected))) {
    throw new Error('Private runtime production inventory is incompatible');
  }
  // Preserve the historical boolean return value: callers use it to decide
  // whether the weather-component pack must be unpacked. The independently
  // validated public-hour pack is discovered by its exact descriptor.
  return actual.includes(weather);
}
export function privateWeatherComponentMarker(conditions) {
  if (!Object.hasOwn(conditions, 'weatherComponentInputs')) return null;
  const marker = conditions.weatherComponentInputs;
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)
    || Object.keys(marker).sort().join(',') !== 'copernicusBankSha256,kind,openMeteoBankSha256,schemaVersion,selectedComponentsSha256,sourceSelectionApplied'
    || marker.schemaVersion !== 1 || marker.kind !== 'PRIVATE_WEATHER_COMPONENT_INPUTS'
    || marker.sourceSelectionApplied !== true
    || !/^[0-9a-f]{64}$/.test(marker.selectedComponentsSha256)
    || !(marker.openMeteoBankSha256 === null || /^[0-9a-f]{64}$/.test(marker.openMeteoBankSha256))
    || !(marker.copernicusBankSha256 === null || /^sha256:[0-9a-f]{64}$/.test(marker.copernicusBankSha256))) {
    throw new Error('Private weather component input marker is invalid');
  }
  return structuredClone(marker);
}
