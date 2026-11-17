import {assertForecastShareDescriptor, FORECAST_SHARE_ZONE_MAX_BYTES} from './forecast-share-projection.js?v=4.0.602';
const HOUR=3600000, HOURS=118, ZONES=210, HASH=/^[a-f0-9]{64}$/;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function need(ok,code){if(!ok)throw new Error(code);}
function keys(value,expected){need(value&&!Array.isArray(value)&&typeof value==='object'
  &&same(Object.keys(value).sort(),[...expected].sort()),'FORECAST_SHARE_PROJECTION_FIELDS');}

// This is an artifact-verified projection, not a replacement schema4 manifest.
// Its master digest records provenance; a sharing GET does not re-read the
// master. Full source/inventory/parity admission remains in the normal builder,
// copy and independent site-audit path before the atomic Pages deployment.
export const FORECAST_SHARE_TRUST_PATH = './data/live/forecast-share-trust.json';
export const FORECAST_SHARE_TRUST_SCHEMA = 'ravradar-forecast-share-trust-index-v1';
const TRUST_METADATA_FIELDS = Object.freeze(["schemaVersion","complete","datasetId","generatedAt","productionReferenceAt","zoneCount","coastalPartCount","validUntil","conditionsPath","conditionDetailsPath","coastalPartsPath","zoneRegistryPath","publicConditionsSha256","publicConditionsBytes","publicConditionDetailsSha256","publicConditionDetailsBytes","coastalPartsSha256","coastalPartsBytes","zoneRegistrySha256","zoneRegistryBytes","zoneRegistryFeatureCount","zoneRegistryActiveCount","ravScoreModelBinding","ravScoreEvidenceTrust","weatherSourceAge","ravScoreProfile","ravScoreAvailability","ravScoreRuntime"]);
export function buildForecastShareTrustIndex(manifest, descriptor, expectedBinding = null) {
  assertForecastShareDescriptor(descriptor, manifest, descriptor.manifestSha256, expectedBinding);
  const index = {schemaVersion: FORECAST_SHARE_TRUST_SCHEMA,
    manifestSha256: descriptor.manifestSha256,
    publicMetadata: Object.fromEntries(TRUST_METADATA_FIELDS.map(key => [key, manifest[key]])),
    axis: {firstHour: manifest.productionReferenceAt, count: HOURS, stepMs: HOUR},
    zones: descriptor.zones.map(entry => ({...entry}))};
  return assertForecastShareTrustIndex(index);
}
export function assertForecastShareTrustIndex(index) {
  keys(index, ['schemaVersion','manifestSha256','publicMetadata','axis','zones']);
  need(index.schemaVersion === FORECAST_SHARE_TRUST_SCHEMA && HASH.test(index.manifestSha256 ?? ''),
    'FORECAST_SHARE_TRUST_BINDING');
  keys(index.publicMetadata, TRUST_METADATA_FIELDS);
  const metadata = index.publicMetadata;
  need(metadata.schemaVersion === 4 && metadata.complete === true && metadata.zoneCount === ZONES
    && metadata.coastalPartCount === 673, 'FORECAST_SHARE_TRUST_SOURCE');
  keys(index.axis, ['firstHour','count','stepMs']);
  const start = Date.parse(metadata.productionReferenceAt);
  need(Number.isFinite(start) && start % HOUR === 0
    && metadata.productionReferenceAt === new Date(start).toISOString()
    && index.axis.firstHour === metadata.productionReferenceAt
    && index.axis.count === HOURS && index.axis.stepMs === HOUR,
    'FORECAST_SHARE_TRUST_AXIS');
  need(Array.isArray(index.zones) && index.zones.length === ZONES, 'FORECAST_SHARE_TRUST_INVENTORY');
  let previous = ''; const paths = new Set();
  for (const entry of index.zones) {
    keys(entry, ['id','path','sha256','bytes']);
    need(typeof entry.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(entry.id)
      && entry.id > previous && HASH.test(entry.sha256 ?? '')
      && entry.path === './share/' + entry.sha256 + '.json' && !paths.has(entry.path)
      && Number.isSafeInteger(entry.bytes) && entry.bytes > 0
      && entry.bytes <= FORECAST_SHARE_ZONE_MAX_BYTES, 'FORECAST_SHARE_TRUST_FILE');
    previous = entry.id; paths.add(entry.path);
  }
  return index;
}
export function assertForecastShareTrustParity(index, manifest, descriptor, expectedBinding = null) {
  const expected = buildForecastShareTrustIndex(manifest, descriptor, expectedBinding);
  assertForecastShareTrustIndex(index);
  need(same(index, expected), 'FORECAST_SHARE_TRUST_SOURCE_PARITY');
  return index;
}
