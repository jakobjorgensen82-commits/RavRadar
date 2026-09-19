import { createHash } from 'node:crypto';

const KIND = 'RAVRADAR_PRIVATE_WEATHER_COMPONENT_SELECTION_HISTORY';
const COMPONENTS = new Set(['wind', 'wave', 'waterLevel', 'waterTemperature']);
const handles = new WeakMap();
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const encoded = value => JSON.stringify(canonical(value));
const hash = value => createHash('sha256').update(encoded(value)).digest('hex');
const same = (a, b) => encoded(a) === encoded(b);
const exactHour = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
  && Date.parse(value) % 3_600_000 === 0 && new Date(value).toISOString() === value;
const key = row => encoded([row.partId, row.time, row.component]);
const identity = part => {
  const parentZoneId = part?.zoneId ?? part?.parentZoneId ?? part?.sourceZoneId;
  const samplingPoint = part?.waterPoint;
  if (typeof part?.partId !== 'string' || !part.partId || typeof parentZoneId !== 'string' || !parentZoneId
    || !Array.isArray(samplingPoint) || samplingPoint.length !== 2
    || !samplingPoint.every(n => typeof n === 'number' && Number.isFinite(n))
    || Math.abs(samplingPoint[0]) > 180 || Math.abs(samplingPoint[1]) > 90) {
    throw new Error('WEATHER_SELECTION_HISTORY_PART_INVALID');
  }
  return { partId: part.partId, parentZoneId, samplingPoint: [...samplingPoint] };
};
const rowIdentity = row => ({ partId: row.partId, parentZoneId: row.parentZoneId, samplingPoint: row.samplingPoint });

// This ledger remembers a selection; it does not admit source data. Every
// candidate must still pass its provider's independent opaque bank admission.
export function createWeatherComponentSelectionHistory(previous, { parts, retentionStartAt, retentionEndAt } = {}) {
  if (!Array.isArray(parts) || !parts.length || !exactHour(retentionStartAt) || !exactHour(retentionEndAt)
    || retentionStartAt > retentionEndAt) throw new Error('WEATHER_SELECTION_HISTORY_DOMAIN_INVALID');
  const targets = new Map(parts.map(part => [part.partId, identity(part)]));
  if (targets.size !== parts.length) throw new Error('WEATHER_SELECTION_HISTORY_PART_DUPLICATE');
  const selected = new Map();
  if (previous !== null && previous !== undefined) {
    const { selectionSha256, ...content } = previous;
    if (previous.kind !== KIND || previous.schemaVersion !== 1 || selectionSha256 !== hash(content)
      || !Array.isArray(previous.records) || !exactHour(previous.retentionStartAt)
      || !exactHour(previous.retentionEndAt) || previous.retentionStartAt > previous.retentionEndAt) {
      throw new Error('WEATHER_SELECTION_HISTORY_INVALID');
    }
    const seen = new Set();
    for (const row of previous.records) {
      if (!exactHour(row?.time) || !COMPONENTS.has(row.component)
        || !['copernicus', 'open-meteo'].includes(row.provider)
        || typeof row.recordId !== 'string' || !/^(?:sha256:)?[0-9a-f]{64}$/.test(row.recordId)
        || !same(identity({ partId: row.partId, parentZoneId: row.parentZoneId, waterPoint: row.samplingPoint }), rowIdentity(row))
        || row.time < previous.retentionStartAt || row.time > previous.retentionEndAt || seen.has(key(row))) {
        throw new Error('WEATHER_SELECTION_HISTORY_ROW_INVALID');
      }
      seen.add(key(row));
      // A real central point/parent activation retires only the affected PART.
      if (same(targets.get(row.partId), rowIdentity(row))
        && row.time >= retentionStartAt && row.time <= retentionEndAt) selected.set(key(row), structuredClone(row));
    }
  }
  const handle = Object.freeze({});
  handles.set(handle, { selected, targets, retentionStartAt, retentionEndAt });
  return handle;
}

export function retainPreviouslySelectedReserve(candidates, history, { part, time, component } = {}) {
  const store = handles.get(history);
  if (!store) return candidates;
  const expected = identity(part);
  const previous = store.selected.get(key({ partId: part.partId, time, component }));
  if (!previous || !same(expected, rowIdentity(previous))) return candidates;
  return candidates.map(candidate => ({ ...candidate,
    // A newer admitted revision of that SAME provider may update the value.
    // This does not give another reserve provider general overwrite rights.
    previouslySelected: candidate?.source?.provider === previous.provider,
  }));
}

export function recordSelectedWeatherComponents(history, part, hourly) {
  const store = handles.get(history);
  const expected = identity(part);
  if (!store || !same(store.targets.get(part.partId), expected) || !Array.isArray(hourly)) {
    throw new Error('WEATHER_SELECTION_HISTORY_UPDATE_INVALID');
  }
  const seen = new Set();
  for (const row of hourly) {
    if (!exactHour(row?.time) || seen.has(row.time)) throw new Error('WEATHER_SELECTION_HISTORY_UPDATE_TIME_INVALID');
    seen.add(row.time);
    if (row.time < store.retentionStartAt || row.time > store.retentionEndAt) continue;
    for (const component of COMPONENTS) {
      const recordKey = key({ partId: part.partId, time: row.time, component });
      const source = row[`${component}Provenance`];
      if (source?.status !== 'verified' || !['copernicus', 'open-meteo'].includes(source.provider)) {
        // Qualified DMI retakes ownership. Local missing is not a reserve
        // selection either; the bank still retains its independently valid data.
        store.selected.delete(recordKey);
        continue;
      }
      const recordId = source.componentRecordId;
      if (source.sourceClass !== 'response-bound-official-component'
        || typeof recordId !== 'string' || !/^(?:sha256:)?[0-9a-f]{64}$/.test(recordId)
        || !same(source.samplingPoint, expected.samplingPoint)
        || source.entityId !== `PART::${part.partId}` || source.parentZoneId !== expected.parentZoneId) {
        throw new Error('WEATHER_SELECTION_HISTORY_SOURCE_INVALID');
      }
      store.selected.set(recordKey, { ...expected, time: row.time, component, provider: source.provider, recordId });
    }
  }
}

export function snapshotWeatherComponentSelectionHistory(history) {
  const store = handles.get(history);
  if (!store) throw new Error('WEATHER_SELECTION_HISTORY_HANDLE_INVALID');
  const content = { kind: KIND, schemaVersion: 1, retentionStartAt: store.retentionStartAt,
    retentionEndAt: store.retentionEndAt, records: [...store.selected.values()]
      .sort((a, b) => key(a).localeCompare(key(b))) };
  return structuredClone({ ...content, selectionSha256: hash(content) });
}
