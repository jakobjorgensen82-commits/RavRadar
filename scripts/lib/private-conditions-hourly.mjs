import crypto from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

// The private JSON document must remain below V8's single-string limit even
// when every weather component is present. These are lossless, individually
// bounded continuations of the two zone-hour arrays, not public projections.
const MAX_ZONES = 210;
const MAX_ROWS = 120;
const MAX_RAW_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_GZIP_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_RAW_TOTAL_BYTES = 768 * 1024 * 1024;
const MAX_GZIP_TOTAL_BYTES = 256 * 1024 * 1024;
const SHA256 = /^[a-f0-9]{64}$/;
const MARKER_KEYS = ['schemaVersion', 'kind', 'privacyClass', 'datasetId',
  'productionReferenceAt', 'zoneCount', 'rawBytes', 'gzipBytes', 'zones'];
const ENTRY_KEYS = ['rows', 'rawBytes', 'gzipBytes', 'rawSha256', 'gzipSha256', 'base64'];

function fail(code) { throw new Error(`PRIVATE_CONDITIONS_HOURLY_${code}`); }
function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exactKeys(value, keys) {
  return object(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function sameKeys(first, second) {
  return JSON.stringify(Object.keys(first).sort()) === JSON.stringify(Object.keys(second).sort());
}

function encodeRows(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_ROWS) fail('ROWS_INVALID');
  const raw = Buffer.from(JSON.stringify(rows), 'utf8');
  if (raw.length > MAX_RAW_ENTRY_BYTES) fail('RAW_ENTRY_LIMIT');
  const gzip = gzipSync(raw);
  if (gzip.length > MAX_GZIP_ENTRY_BYTES) fail('GZIP_ENTRY_LIMIT');
  return {
    rows: rows.length,
    rawBytes: raw.length,
    gzipBytes: gzip.length,
    rawSha256: sha256(raw),
    gzipSha256: sha256(gzip),
    base64: gzip.toString('base64'),
  };
}

function decodeRows(entry) {
  if (!exactKeys(entry, ENTRY_KEYS)
    || !Number.isSafeInteger(entry.rows) || entry.rows < 0 || entry.rows > MAX_ROWS
    || !Number.isSafeInteger(entry.rawBytes) || entry.rawBytes < 2
    || entry.rawBytes > MAX_RAW_ENTRY_BYTES
    || !Number.isSafeInteger(entry.gzipBytes) || entry.gzipBytes < 1
    || entry.gzipBytes > MAX_GZIP_ENTRY_BYTES
    || !SHA256.test(entry.rawSha256) || !SHA256.test(entry.gzipSha256)
    || typeof entry.base64 !== 'string'
    || entry.base64.length !== 4 * Math.ceil(entry.gzipBytes / 3)
    || !/^[A-Za-z0-9+/]*={0,2}$/.test(entry.base64)) fail('ENTRY_INVALID');
  const gzip = Buffer.from(entry.base64, 'base64');
  if (gzip.length !== entry.gzipBytes || gzip.toString('base64') !== entry.base64
    || sha256(gzip) !== entry.gzipSha256) fail('GZIP_HASH_MISMATCH');
  let raw;
  try { raw = gunzipSync(gzip, { maxOutputLength: entry.rawBytes }); }
  catch { fail('DECOMPRESSION_INVALID'); }
  if (raw.length !== entry.rawBytes || sha256(raw) !== entry.rawSha256) fail('RAW_HASH_MISMATCH');
  let rows;
  try { rows = JSON.parse(raw.toString('utf8')); } catch { fail('ROWS_PARSE_INVALID'); }
  if (!Array.isArray(rows) || rows.length !== entry.rows) fail('ROWS_COUNT_MISMATCH');
  return rows;
}

function markerOf(conditions) {
  if (!object(conditions)) fail('CONDITIONS_INVALID');
  if (!Object.hasOwn(conditions, 'privateZoneHourly')) return null;
  if (conditions.privateZoneHourly === null) fail('MARKER_INVALID');
  return conditions.privateZoneHourly;
}

export function packPrivateConditionsHourly(conditions) {
  if (markerOf(conditions) !== null) fail('ALREADY_PACKED');
  const weatherZones = conditions.zones;
  const scoreZones = conditions.coastalParts?.zones;
  if (!object(weatherZones) || !object(scoreZones)
    || !sameKeys(weatherZones, scoreZones)
    || Object.keys(weatherZones).length !== MAX_ZONES) fail('ZONE_INVENTORY_INVALID');
  const packedZones = {};
  const packedWeatherZones = {};
  const packedScoreZones = {};
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const zoneId of Object.keys(weatherZones)) {
    const weather = weatherZones[zoneId];
    const score = scoreZones[zoneId];
    if (!object(weather) || !object(weather.forecast) || !object(score)) fail('ZONE_INVALID');
    const forecastEntry = encodeRows(weather.forecast.hourly);
    const scoreEntry = encodeRows(score.hourly);
    rawBytes += forecastEntry.rawBytes + scoreEntry.rawBytes;
    gzipBytes += forecastEntry.gzipBytes + scoreEntry.gzipBytes;
    if (rawBytes > MAX_RAW_TOTAL_BYTES || gzipBytes > MAX_GZIP_TOTAL_BYTES) fail('TOTAL_LIMIT');
    packedZones[zoneId] = { forecast: forecastEntry, score: scoreEntry };
    const { hourly: _forecastHourly, ...forecast } = weather.forecast;
    const { hourly: _scoreHourly, ...scoreRetained } = score;
    packedWeatherZones[zoneId] = { ...weather, forecast };
    packedScoreZones[zoneId] = scoreRetained;
  }
  return {
    ...conditions,
    zones: packedWeatherZones,
    coastalParts: { ...conditions.coastalParts, zones: packedScoreZones },
    privateZoneHourly: {
      schemaVersion: 1,
      kind: 'PRIVATE_CONDITIONS_ZONE_HOURLY_GZIP',
      privacyClass: 'PRIVATE_PRODUCTION_RUNTIME',
      datasetId: conditions.datasetId,
      productionReferenceAt: conditions.productionReferenceAt,
      zoneCount: Object.keys(packedZones).length,
      rawBytes,
      gzipBytes,
      zones: packedZones,
    },
  };
}

function decodePrivateConditionsHourly(conditions, materialize) {
  const marker = markerOf(conditions);
  if (marker === null) return materialize ? conditions : false; // Authenticated v1 predecessor.
  if (!exactKeys(marker, MARKER_KEYS)
    || marker.schemaVersion !== 1
    || marker.kind !== 'PRIVATE_CONDITIONS_ZONE_HOURLY_GZIP'
    || marker.privacyClass !== 'PRIVATE_PRODUCTION_RUNTIME'
    || marker.datasetId !== conditions.datasetId
    || marker.productionReferenceAt !== conditions.productionReferenceAt
    || marker.zoneCount !== MAX_ZONES
    || !Number.isSafeInteger(marker.rawBytes) || marker.rawBytes < 1
    || marker.rawBytes > MAX_RAW_TOTAL_BYTES
    || !Number.isSafeInteger(marker.gzipBytes) || marker.gzipBytes < 1
    || marker.gzipBytes > MAX_GZIP_TOTAL_BYTES
    || !object(marker.zones) || !object(conditions.zones)
    || !object(conditions.coastalParts?.zones)
    || !sameKeys(marker.zones, conditions.zones)
    || !sameKeys(marker.zones, conditions.coastalParts.zones)
    || Object.keys(marker.zones).length !== MAX_ZONES) fail('MARKER_INVALID');
  const weatherZones = materialize ? {} : null;
  const scoreZones = materialize ? {} : null;
  let rawBytes = 0;
  let gzipBytes = 0;
  for (const zoneId of Object.keys(marker.zones)) {
    const item = marker.zones[zoneId];
    const weather = conditions.zones[zoneId];
    const score = conditions.coastalParts.zones[zoneId];
    if (!exactKeys(item, ['forecast', 'score'])
      || !object(weather?.forecast) || Object.hasOwn(weather.forecast, 'hourly')
      || !object(score) || Object.hasOwn(score, 'hourly')) fail('ZONE_INVALID');
    const forecastHourly = decodeRows(item.forecast);
    const scoreHourly = decodeRows(item.score);
    rawBytes += item.forecast.rawBytes + item.score.rawBytes;
    gzipBytes += item.forecast.gzipBytes + item.score.gzipBytes;
    if (rawBytes > MAX_RAW_TOTAL_BYTES || gzipBytes > MAX_GZIP_TOTAL_BYTES) fail('TOTAL_LIMIT');
    if (materialize) {
      weatherZones[zoneId] = { ...weather, forecast: { ...weather.forecast, hourly: forecastHourly } };
      scoreZones[zoneId] = { ...score, hourly: scoreHourly };
    }
  }
  if (rawBytes !== marker.rawBytes || gzipBytes !== marker.gzipBytes) fail('TOTAL_MISMATCH');
  if (!materialize) return true;
  const { privateZoneHourly: _packed, ...retained } = conditions;
  return { ...retained, zones: weatherZones,
    coastalParts: { ...conditions.coastalParts, zones: scoreZones } };
}

export function hydratePrivateConditionsHourly(conditions) {
  return decodePrivateConditionsHourly(conditions, true);
}

export function assertPrivateConditionsHourly(conditions) {
  return decodePrivateConditionsHourly(conditions, false);
}
