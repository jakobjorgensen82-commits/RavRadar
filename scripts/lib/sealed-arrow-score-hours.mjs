// Diagnostic only: original saved scores, never recalculated weather or scores.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
const fail = code => { throw new Error('SEALED_ARROW_SCORE_' + code); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const time = value => {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(parsed) || parsed % 3600000) fail('SAVED_SCORE_TIME');
  return new Date(parsed).toISOString();
};
export function savedPrivateScoreRows(part) {
  if (Object.hasOwn(part, 'hourly')) {
    if (!Array.isArray(part.hourly) || part.hourly.length > 120) fail('SAVED_PRIVATE_ROWS');
    return part.hourly;
  }
  // The normal persisted representation retains current, NOT part.hourly.
  // Never substitute the zone winner or invent forecast rows from current.
  if (part.current == null) return [];
  if (!object(part.current)) fail('SAVED_PRIVATE_CURRENT');
  time(part.current.time);
  return [{ ...part.current, flowPoints: part.flowPoints }];
}
export async function readSavedPublicScoreRows({ conditions, payload, privateRoot, readers }) {
  const parts = conditions.coastalParts.parts;
  const rows = new Map(Object.keys(parts).map(id => [id, []]));
  const summary = { storage: 'NOT_PRESENT', hours: 0, rows: 0, absentPartHours: 0, partsWithRows: 0 };
  const marker = readers.privatePublicHourDeliveryMarker(conditions);
  if (!marker) {
    if (conditions.coastalParts.enabled === true) fail('SAVED_HOUR_PACK_MISSING');
    return { rows, summary }; // Explicitly empty non-enabled test/legacy runtime.
  }
  if (marker.datasetId !== conditions.datasetId
    || marker.productionReferenceAt !== conditions.productionReferenceAt
    || !isDeepStrictEqual(marker.modelBinding, conditions.coastalParts.modelBinding)) fail('SAVED_HOUR_IDENTITY');
  const parent = await fs.realpath(privateRoot), parentStat = await fs.lstat(privateRoot);
  if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) fail('SAVED_HOUR_SCRATCH_PARENT');
  const scratch = await fs.mkdtemp(path.join(parent, 'arrow-score-hours-'));
  const identity = await fs.lstat(scratch);
  try {
    // Reuse the exact ORIGINAL reader: complete pack, entry, gzip and raw
    // hashes and delivery/model/time envelopes, one bounded shard at a time.
    const restored = await readers.materializePrivatePublicHourDeliveryPack({
      packPath: path.join(payload, '.cache/public-hour-delivery.pack'), conditions, liveDirectory: scratch });
    const expectedIds = Object.keys(parts).sort();
    for (const entry of restored.manifest.entries) {
      const file = path.join(scratch, 'forecast', entry.file);
      if (path.dirname(file) !== path.join(scratch, 'forecast')) fail('SAVED_HOUR_PATH');
      const stat = await fs.lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.bytes
        || entry.bytes > 16 * 1024 * 1024) fail('SAVED_HOUR_BOUND');
      const raw = await fs.readFile(file);
      if (crypto.createHash('sha256').update(raw).digest('hex') !== entry.sha256) fail('SAVED_HOUR_HASH');
      const document = JSON.parse(raw.toString('utf8'));
      if (document.datasetId !== conditions.datasetId
        || document.productionReferenceAt !== conditions.productionReferenceAt
        || document.delivery?.key !== entry.time
        || !isDeepStrictEqual(Object.keys(document.coastalParts?.parts ?? {}).sort(), expectedIds)) fail('SAVED_HOUR_PARTS');
      for (const id of expectedIds) {
        const stored = document.coastalParts.parts[id];
        if (!object(stored) || stored.id !== id || stored.zoneId !== parts[id].zoneId) fail('SAVED_HOUR_PART');
        if (stored.current == null) { summary.absentPartHours++; continue; }
        if (time(stored.current.time) !== entry.time) fail('SAVED_HOUR_TIME');
        if (stored.current.weather?.time !== undefined && time(stored.current.weather.time) !== entry.time) fail('SAVED_HOUR_WEATHER_TIME');
        // Retain only the fields used by this comparison, not 118 full public
        // documents, mode explanations, private payloads or recalculated scores.
        rows.get(id).push({ time: entry.time, weather: stored.current.weather,
          flowPoints: stored.flowPoints,
          modeWeather: ['waders', 'beach'].map(mode => stored.current[mode]?.weather ?? null) });
        summary.rows++;
      }
      summary.hours++;
    }
    summary.storage = 'ORIGINAL_AUTHENTICATED_PUBLIC_HOUR_PACK';
    summary.partsWithRows = [...rows.values()].filter(value => value.length > 0).length;
    if (summary.hours !== marker.forecastHours
      || summary.rows + summary.absentPartHours !== summary.hours * expectedIds.length
      || conditions.coastalParts.enabled === true && summary.rows === 0) fail('SAVED_HOUR_COVERAGE');
    return { rows, summary };
  } finally {
    const current = await fs.lstat(scratch);
    if (!current.isDirectory() || current.isSymbolicLink() || current.dev !== identity.dev || current.ino !== identity.ino
      || path.dirname(scratch) !== parent || !path.basename(scratch).startsWith('arrow-score-hours-')) fail('SAVED_HOUR_SCRATCH_IDENTITY');
    await fs.rm(scratch, { recursive: true, force: false });
  }
}
