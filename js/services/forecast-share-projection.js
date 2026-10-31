// Detached display-only projection of already computed public scores.
import { exactMapZoneScore } from './map-forecast-view.js?v=4.0.594';
import { assertRavScoreModelBinding } from '../core/ravscore-model-contract.js?v=4.0.594';

export const FORECAST_SHARE_DESCRIPTOR_PATH = './data/live/forecast-share.json';
export const FORECAST_SHARE_DESCRIPTOR_SCHEMA = 'ravradar-forecast-share-zone-index-v1';
export const FORECAST_SHARE_PROJECTION_SCHEMA = 'ravradar-forecast-share-projection-v1';
export const FORECAST_SHARE_MAX_BYTES = 2 * 1024 * 1024;
export const FORECAST_SHARE_INDEX_MAX_BYTES = 128 * 1024;
export const FORECAST_SHARE_ZONE_MAX_BYTES = 32 * 1024;
export const FORECAST_SHARE_ZONE_SCHEMA = 'ravradar-forecast-share-zone-v1';
const HOUR = 3600000, HOURS = 118, ZONES = 210;
const MODES = ['beach', 'waders'];
const QUALITIES = ['FULL_HISTORY', 'HISTORY_INCOMPLETE', 'UNAVAILABLE'];
const COVERAGES = [null, 'whole-zone', 'unavailable', 'several-parts', 'only-part', 'partial-zone', 'uncertain'];
const HASH = /^[a-f0-9]{64}$/;
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function need(ok, code) { if (!ok) throw new Error(code); }
function keys(value, expected) {
  need(value && !Array.isArray(value) && typeof value === 'object'
    && same(Object.keys(value).sort(), [...expected].sort()), 'FORECAST_SHARE_PROJECTION_FIELDS');
}
function generation(value, manifest) {
  need(value.datasetId === manifest.datasetId && value.generatedAt === manifest.generatedAt
    && value.productionReferenceAt === manifest.productionReferenceAt
    && same(value.modelBinding, manifest.ravScoreModelBinding), 'FORECAST_SHARE_PROJECTION_GENERATION');
  assertRavScoreModelBinding(value.modelBinding);
}
function sourceAxis(manifest) {
  need(manifest?.schemaVersion === 4 && manifest.complete === true && manifest.zoneCount === ZONES
    && manifest.coastalPartCount === 673 && HASH.test(manifest.publicConditionDetailsSha256 ?? '')
    && HASH.test(manifest.zoneRegistrySha256 ?? ''), 'FORECAST_SHARE_PROJECTION_MANIFEST');
  const start = Date.parse(manifest.productionReferenceAt);
  const times = Object.keys(manifest.detailDelivery?.hours ?? {});
  const ids = Object.keys(manifest.detailDelivery?.zones ?? {}).sort();
  need(Number.isFinite(start) && start % HOUR === 0 && times.length === HOURS && ids.length === ZONES
    && times.every((time,index) => time === new Date(start + index * HOUR).toISOString())
    && ids.every(id => /^[a-zA-Z0-9_-]+$/.test(id)), 'FORECAST_SHARE_PROJECTION_AXIS');
  assertRavScoreModelBinding(manifest.ravScoreModelBinding);
  return {times, ids};
}
export function assertForecastShareDescriptor(descriptor, manifest, manifestSha256) {
  const {ids} = sourceAxis(manifest);
  keys(descriptor, ['schemaVersion','manifestSha256','datasetId','generatedAt','productionReferenceAt','modelBinding','zoneCount','forecastHours','modeCount','zones']);
  need(descriptor.schemaVersion === FORECAST_SHARE_DESCRIPTOR_SCHEMA && HASH.test(manifestSha256 ?? '')
    && descriptor.manifestSha256 === manifestSha256 && descriptor.zoneCount === ZONES
    && descriptor.forecastHours === HOURS && descriptor.modeCount === MODES.length, 'FORECAST_SHARE_DESCRIPTOR_BINDING');
  generation(descriptor, manifest);
  need(Array.isArray(descriptor.zones) && descriptor.zones.length === ZONES, 'FORECAST_SHARE_DESCRIPTOR_INVENTORY');
  const paths = new Set();
  descriptor.zones.forEach((file,index) => {
    keys(file, ['id','path','sha256','bytes']);
    need(file.id === ids[index] && HASH.test(file.sha256 ?? '') && file.path === './share/' + file.sha256 + '.json'
      && !paths.has(file.path) && Number.isSafeInteger(file.bytes) && file.bytes > 0
      && file.bytes <= FORECAST_SHARE_ZONE_MAX_BYTES, 'FORECAST_SHARE_DESCRIPTOR_FILE');
    paths.add(file.path);
  });
  return descriptor;
}
export function assertForecastShareProjection(projection, descriptor, manifest) {
  const {times,ids} = sourceAxis(manifest);
  keys(projection, ['schemaVersion','datasetId','generatedAt','productionReferenceAt','sourceDetailsSha256','zoneRegistrySha256','modelBinding','axis','modes','qualities','coverageStatuses','zones']);
  generation(projection, manifest);
  need(projection.schemaVersion === FORECAST_SHARE_PROJECTION_SCHEMA
    && projection.sourceDetailsSha256 === manifest.publicConditionDetailsSha256
    && projection.zoneRegistrySha256 === manifest.zoneRegistrySha256
    && same(projection.modes, MODES) && same(projection.qualities, QUALITIES)
    && same(projection.coverageStatuses, COVERAGES), 'FORECAST_SHARE_PROJECTION_BINDING');
  keys(projection.axis, ['firstHour','count','stepMs']);
  need(projection.axis.firstHour === times[0] && projection.axis.count === HOURS
    && projection.axis.stepMs === HOUR && Array.isArray(projection.zones) && projection.zones.length === ZONES, 'FORECAST_SHARE_PROJECTION_INVENTORY');
  for (let zi=0; zi<ZONES; zi++) {
    assertZone(projection.zones[zi], ids[zi]);
  }
  need(descriptor.zones?.length === ZONES && descriptor.datasetId === projection.datasetId, 'FORECAST_SHARE_PROJECTION_DESCRIPTOR');
  return projection;
}

function assertZone(zone, id) {
    keys(zone,['id','name','rows']);
    need(zone.id === id && typeof zone.name === 'string' && zone.name.trim() === zone.name
      && zone.name.length > 0 && zone.name.length <= 160
      && Array.isArray(zone.rows) && zone.rows.length === HOURS, 'FORECAST_SHARE_PROJECTION_ZONE');
    for (const row of zone.rows) {
      need(Array.isArray(row) && row.length === MODES.length, 'FORECAST_SHARE_PROJECTION_ROW');
      for (const cell of row) {
        need(Array.isArray(cell) && cell.length === 4 && (cell[0] === 0 || cell[0] === 1)
          && Number.isInteger(cell[2]) && cell[2] >= 0 && cell[2] < QUALITIES.length
          && Number.isInteger(cell[3]) && cell[3] >= 0 && cell[3] < COVERAGES.length
          && (cell[0] === 0 ? cell[1] === null && cell[2] === 2
            : Number.isFinite(cell[1]) && cell[1] >= 0 && cell[1] <= 100 && cell[2] !== 2), 'FORECAST_SHARE_PROJECTION_CELL');
      }
    }
  return zone;
}
export function buildForecastShareZoneProjection(projection, zone) {
  const {zones, ...common} = projection;
  return {...common, schemaVersion: FORECAST_SHARE_ZONE_SCHEMA, zone};
}
export function assertForecastShareZoneProjection(payload, descriptor, manifest, entry) {
  const {times} = sourceAxis(manifest);
  keys(payload, ['schemaVersion','datasetId','generatedAt','productionReferenceAt','sourceDetailsSha256','zoneRegistrySha256','modelBinding','axis','modes','qualities','coverageStatuses','zone']);
  generation(payload, manifest);
  need(payload.schemaVersion === FORECAST_SHARE_ZONE_SCHEMA
    && payload.sourceDetailsSha256 === manifest.publicConditionDetailsSha256
    && payload.zoneRegistrySha256 === manifest.zoneRegistrySha256
    && same(payload.modes, MODES) && same(payload.qualities, QUALITIES)
    && same(payload.coverageStatuses, COVERAGES), 'FORECAST_SHARE_PROJECTION_BINDING');
  keys(payload.axis, ['firstHour','count','stepMs']);
  need(payload.axis.firstHour === times[0] && payload.axis.count === HOURS
    && payload.axis.stepMs === HOUR && descriptor.zones.includes(entry)
    && descriptor.datasetId === payload.datasetId, 'FORECAST_SHARE_PROJECTION_INVENTORY');
  assertZone(payload.zone, entry.id);
  return payload;
}
export function assembleForecastShareProjection(zonePayloads, descriptor, manifest) {
  need(Array.isArray(zonePayloads) && zonePayloads.length === ZONES, 'FORECAST_SHARE_PROJECTION_INVENTORY');
  const zones = zonePayloads.map((payload,index) =>
    assertForecastShareZoneProjection(payload,descriptor,manifest,descriptor.zones[index]).zone);
  const {zone, ...common} = zonePayloads[0];
  return assertForecastShareProjection({...common,schemaVersion:FORECAST_SHARE_PROJECTION_SCHEMA,zones},descriptor,manifest);
}
export function forecastShareZoneProjectionSelection(payload, selection) {
  return forecastShareProjectionSelection({...payload,zones:[payload.zone]},selection);
}

function selectedCell(projection, selection) {
  const index=(Date.parse(selection.time)-Date.parse(projection.axis.firstHour))/HOUR;
  const mode=MODES.indexOf(selection.mode);
  if (!Number.isInteger(index) || index < 0 || index >= HOURS || mode < 0) return null;
  const zone=projection.zones.find(item => item.id === selection.zoneId);
  if (!zone) return null;
  const cell=zone.rows[index][mode];
  return {zone,cell};
}
export function forecastShareProjectionSelection(projection, selection) {
  const selected=selectedCell(projection,selection);
  if (!selected) return null;
  const {zone,cell}=selected;
  return Object.freeze({selection,zoneName:zone.name,datasetId:projection.datasetId,generatedAt:projection.generatedAt,
    result:Object.freeze({time:selection.time,available:cell[0] === 1,score:cell[1],scoreQuality:QUALITIES[cell[2]],
      localCoverage:Object.freeze({status:COVERAGES[cell[3]]})})});
}
export function buildForecastShareProjection({manifest,details,registry}) {
  const {times,ids}=sourceAxis(manifest);
  need(details?.datasetId === manifest.datasetId && details.generatedAt === manifest.generatedAt
    && details.productionReferenceAt === manifest.productionReferenceAt
    && same(Object.keys(details.coastalParts?.zones ?? {}).sort(),ids), 'FORECAST_SHARE_PROJECTION_SOURCE');
  const active=(registry?.features ?? []).filter(item => item.properties?.zoneStatus === 'active');
  const names=new Map(active.map(item => [item.properties.id,item.properties.name]));
  need(active.length === ZONES && names.size === ZONES && same([...names.keys()].sort(),ids), 'FORECAST_SHARE_PROJECTION_REGISTRY');
  const zones=ids.map(id => ({id,name:names.get(id),rows:times.map(time => MODES.map(mode => {
    const result=exactMapZoneScore({conditions:{coastalParts:details.coastalParts,mapForecastTime:time},zoneId:id,time,mode});
    need(result?.time === time, 'FORECAST_SHARE_PROJECTION_SELECTION');
    const quality=QUALITIES.indexOf(result.scoreQuality),coverage=COVERAGES.indexOf(result.localCoverage?.status ?? null);
    need(quality >= 0 && coverage >= 0, 'FORECAST_SHARE_PROJECTION_SEMANTICS');
    return [result.available === true ? 1 : 0,result.available === true ? result.score : null,quality,coverage];
  }))}));
  return {schemaVersion:FORECAST_SHARE_PROJECTION_SCHEMA,datasetId:manifest.datasetId,generatedAt:manifest.generatedAt,
    productionReferenceAt:manifest.productionReferenceAt,sourceDetailsSha256:manifest.publicConditionDetailsSha256,
    zoneRegistrySha256:manifest.zoneRegistrySha256,modelBinding:manifest.ravScoreModelBinding,
    axis:{firstHour:times[0],count:HOURS,stepMs:HOUR},modes:[...MODES],qualities:[...QUALITIES],coverageStatuses:[...COVERAGES],zones};
}
export function assertForecastShareProjectionParity({projection,descriptor,manifest,details,registry}) {
  assertForecastShareProjection(projection,descriptor,manifest);
  const {times,ids}=sourceAxis(manifest);
  const active=(registry?.features ?? []).filter(item => item.properties?.zoneStatus === 'active');
  const names=new Map(active.map(item => [item.properties.id,item.properties.name]));
  need(active.length === ZONES && names.size === ZONES && same([...names.keys()].sort(),ids), 'FORECAST_SHARE_PARITY_REGISTRY');
  let comparisons=0;
  for (const zoneId of ids) for (const time of times) for (const mode of MODES) {
    const actual=forecastShareProjectionSelection(projection,{zoneId,time,mode});
    const normal=exactMapZoneScore({conditions:{coastalParts:details.coastalParts,mapForecastTime:time},zoneId,time,mode});
    const expected={time:normal?.time,available:normal?.available === true,score:normal?.available === true ? normal.score : null,
      scoreQuality:normal?.scoreQuality,localCoverage:{status:normal?.localCoverage?.status ?? null}};
    need(actual?.zoneName === names.get(zoneId) && same(actual?.result,expected), 'FORECAST_SHARE_PARITY_MISMATCH');
    comparisons++;
  }
  need(comparisons === ZONES * HOURS * MODES.length, 'FORECAST_SHARE_PARITY_INCOMPLETE');
  return Object.freeze({comparisons});
}
