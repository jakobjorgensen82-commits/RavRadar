// Read-only diagnostic of already admitted local public weather. This is not
// source admission, a native/provenance verifier, or a score/history validator.
import { RAVSCORE_PUBLIC_FORECAST_HOURS, assertRavScoreModelBinding } from '../../js/core/ravscore-model-contract.js';
import { hasValue } from './weather-component-needs.mjs';

const HOUR = 3_600_000;
const MODES = Object.freeze(['waders', 'beach']);
const COMPONENTS = Object.freeze(['wind', 'wave', 'current', 'waterLevel', 'waterTemperature']);
const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit',
});
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactHour = value => {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && ms % HOUR === 0 && new Date(ms).toISOString() === value ? ms : null;
};
const bindingValid = value => {
  try { assertRavScoreModelBinding(value, 'zone-mode weather coverage input'); return true; }
  catch { return false; }
};
const counter = expected => ({ expected, available: 0, missing: 0,
  unknown: expected === null ? null : 0, availablePercent: null });
const bucket = expected => Object.fromEntries([...COMPONENTS, 'allFive'].map(key => [key, counter(expected)]));
const modeBuckets = expected => Object.fromEntries(MODES.map(mode => [mode, bucket(expected)]));
const dateKey = ms => {
  const parts = Object.fromEntries(dateFormat.formatToParts(ms).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const finish = modes => {
  for (const group of Object.values(modes)) for (const value of Object.values(group)) {
    value.availablePercent = value.expected > 0 ? Number((value.available / value.expected * 100).toFixed(3)) : null;
  }
  return modes;
};

export function buildZoneModeWeatherCoverage({ conditions, zonesDocument } = {}) {
  const diagnostics = {
    invalidRegistry: 0, unexpectedSourceZones: 0, missingSourceZones: 0,
    malformedTimeRows: 0, offAxisRows: 0, duplicateHourCells: 0,
    missingHourCells: 0, missingModeCells: 0, invalidModeBindings: 0,
  };
  const active = zonesDocument?.type === 'FeatureCollection' && Array.isArray(zonesDocument.features)
    ? zonesDocument.features.filter(feature => feature?.properties?.zoneStatus === 'active') : null;
  const ids = active?.map(feature => feature.properties.id) ?? [];
  const registryKnown = active !== null && ids.length > 0
    && ids.every(id => typeof id === 'string' && id.length > 0 && id === id.trim())
    && new Set(ids).size === ids.length;
  const reference = exactHour(conditions?.productionReferenceAt);
  const source = conditions?.coastalParts;
  const modelKnown = source?.enabled === true && bindingValid(source?.modelBinding);
  const sourceZonesKnown = object(source?.zones);
  const idSet = new Set(ids);
  if (!registryKnown) diagnostics.invalidRegistry = 1;
  if (sourceZonesKnown && registryKnown) {
    diagnostics.unexpectedSourceZones = Object.keys(source.zones).filter(id => !idSet.has(id)).length;
  }
  const expected = registryKnown ? ids.length * RAVSCORE_PUBLIC_FORECAST_HOURS : null;
  const modes = modeBuckets(expected);
  const report = {
    schemaVersion: 1, contractId: 'local-zone-mode-weather-coverage-v1',
    scope: 'SELECTED_LOCAL_PART_WEATHER_PER_ZONE_HOUR_AND_SEARCH_MODE',
    admissionGrantedByThisReport: false, nativeOrProvenanceProofClaimed: false,
    scoreHistoryCompletenessClaimed: false,
    productionReferenceAt: reference === null ? null : conditions.productionReferenceAt,
    axis: { expectedHours: RAVSCORE_PUBLIC_FORECAST_HOURS, expectedZones: registryKnown ? ids.length : null,
      expectedZoneHoursPerMode: expected, firstHour: reference === null ? null : new Date(reference).toISOString(),
      lastHour: reference === null ? null : new Date(reference + (RAVSCORE_PUBLIC_FORECAST_HOURS - 1) * HOUR).toISOString(),
      clippedToClockOrExistingRows: false },
    checks: { registryKnown, exactReferenceKnown: reference !== null, modelKnown, sourceZonesKnown,
      sourceZoneSetCompatible: registryKnown && sourceZonesKnown && diagnostics.unexpectedSourceZones === 0 },
    modes, perLocalCalendarDay: [], timeZone: 'Europe/Copenhagen', diagnostics,
  };
  if (!registryKnown) return report;
  const days = new Map();
  const dayByTime = new Map();
  const times = Array.from({ length: RAVSCORE_PUBLIC_FORECAST_HOURS }, (_, index) =>
    reference === null ? null : reference + index * HOUR);
  if (reference !== null) for (const ms of times) {
    const date = dateKey(ms);
    const day = days.get(date) ?? { date, hourCount: 0, expectedZoneHoursPerMode: 0, modes: null };
    day.hourCount += 1; day.expectedZoneHoursPerMode += ids.length; days.set(date, day);
    dayByTime.set(ms, day);
  }
  for (const day of days.values()) day.modes = modeBuckets(day.expectedZoneHoursPerMode);
  const globallyKnown = reference !== null && modelKnown && sourceZonesKnown
    && diagnostics.unexpectedSourceZones === 0;
  const add = (mode, ms, states) => {
    const groups = [modes[mode]];
    if (ms !== null) groups.push(dayByTime.get(ms).modes[mode]);
    for (const group of groups) for (const key of [...COMPONENTS, 'allFive']) group[key][states[key]] += 1;
  };
  const unknown = Object.fromEntries([...COMPONENTS, 'allFive'].map(key => [key, 'unknown']));
  for (const id of ids) {
    const zone = globallyKnown ? source.zones[id] : null;
    const rows = zone?.hourly;
    const byTime = new Map();
    let malformedAxis = false;
    if (globallyKnown && !object(zone)) diagnostics.missingSourceZones += 1;
    if (Array.isArray(rows)) for (const row of rows) {
      const ms = exactHour(row?.time);
      if (ms === null) { diagnostics.malformedTimeRows += 1; malformedAxis = true; continue; }
      if (ms < reference || ms > times.at(-1)) { diagnostics.offAxisRows += 1; continue; }
      if (byTime.has(ms)) {
        if (byTime.get(ms) !== null) diagnostics.duplicateHourCells += 1;
        byTime.set(ms, null);
      } else byTime.set(ms, row);
    }
    for (const ms of times) {
      const row = globallyKnown && !malformedAxis ? byTime.get(ms) : null;
      if (globallyKnown && !malformedAxis && row === undefined) diagnostics.missingHourCells += 1;
      for (const mode of MODES) {
        const selected = row?.[mode];
        if (!object(selected) || selected.available !== true || !object(selected.weather)) {
          if (row) diagnostics.missingModeCells += 1;
          add(mode, ms, unknown); continue;
        }
        if (!bindingValid(selected.modelBinding)
          || (selected.weather.time !== undefined && selected.weather.time !== row.time)) {
          diagnostics.invalidModeBindings += 1; add(mode, ms, unknown); continue;
        }
        const states = Object.fromEntries(COMPONENTS.map(component =>
          [component, hasValue(selected.weather, component) ? 'available' : 'missing']));
        states.allFive = COMPONENTS.every(component => states[component] === 'available') ? 'available' : 'missing';
        add(mode, ms, states);
      }
    }
  }
  finish(modes);
  report.perLocalCalendarDay = [...days.values()].map(day => ({ ...day, modes: finish(day.modes) }));
  return report;
}
