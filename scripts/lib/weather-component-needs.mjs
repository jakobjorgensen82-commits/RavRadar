import { RAVSCORE_PUBLIC_FORECAST_HOURS } from '../../js/core/ravscore-model-contract.js';
import { DMI_RESERVE_CHALLENGE_AGE_HOURS, responseBoundModelRun } from './weather-component-selection.mjs';

export const PLANNED_WEATHER_COMPONENTS = Object.freeze(['wind', 'wave', 'waterLevel', 'waterTemperature']);
export const RESERVE_WEATHER_COMPONENTS = Object.freeze(['wind', 'wave', 'waterTemperature']);
export const DMI_ONLY_WEATHER_COMPONENTS = Object.freeze(['waterLevel']);
const HOUR = 3_600_000;
const finite = value => typeof value === 'number' && Number.isFinite(value);
const hour = value => {
  const ms = typeof value === 'string' ? Date.parse(value) : NaN;
  if (!Number.isFinite(ms) || ms % HOUR !== 0 || new Date(ms).toISOString() !== value) {
    throw new Error('WEATHER_COMPONENT_PLAN_EXACT_HOUR_REQUIRED');
  }
  return ms;
};

export function hasValue(row, component) {
  if (!row) return false;
  if (component === 'wind') return finite(row.windSpeedMps) && row.windSpeedMps >= 0
    && finite(row.windDirectionDeg) && row.windDirectionDeg >= 0 && row.windDirectionDeg < 360;
  if (component === 'wave') return finite(row.waveHeightM) && row.waveHeightM >= 0
    && finite(row.wavePeriodS) && row.wavePeriodS >= 0 && (row.waveHeightM === 0 || row.wavePeriodS > 0)
    && (row.waveHeightM === 0 && row.waveDirectionDeg == null
      || finite(row.waveDirectionDeg) && row.waveDirectionDeg >= 0 && row.waveDirectionDeg < 360);
  if (component === 'current') return finite(row.currentSpeedMps) && row.currentSpeedMps >= 0
    && finite(row.currentDirectionDeg) && row.currentDirectionDeg >= 0
    && row.currentDirectionDeg < 360;
  return finite(row[component === 'waterLevel' ? 'waterLevelCm' : 'waterTemperatureC']);
}

// The callback is the production adapter, not a cache's self-declared status.
// This planner does not grant source admission or overwrite permission. It
// separates real missing work, optional aged-DMI challenges and DMI upgrades.
export function buildWeatherComponentNeeds({ parts, productionReferenceAt, readVerifiedHourly } = {}) {
  const reference = hour(productionReferenceAt);
  if (!Array.isArray(parts) || !parts.length || typeof readVerifiedHourly !== 'function') {
    throw new Error('WEATHER_COMPONENT_PLAN_INPUT_REQUIRED');
  }
  const needs = [], dmiUpgradeNeeds = [];
  const partIds = new Set();
  const summary = Object.fromEntries(PLANNED_WEATHER_COMPONENTS.map(component => [component,
    { required: parts.length * RAVSCORE_PUBLIC_FORECAST_HOURS, valid: 0, missing: 0,
      trendMissing: 0, dmi: 0, reserve: 0, agedDmiChallenges: 0 }]));
  for (const part of parts) {
    if (typeof part?.partId !== 'string' || !part.partId || partIds.has(part.partId)) {
      throw new Error('WEATHER_COMPONENT_PLAN_PART_DOMAIN_INVALID');
    }
    partIds.add(part.partId);
    const rows = readVerifiedHourly(part);
    if (!Array.isArray(rows)) throw new Error('WEATHER_COMPONENT_PLAN_VERIFIED_ROWS_REQUIRED');
    const byTime = new Map();
    for (const row of rows) {
      hour(row?.time);
      if (byTime.has(row.time)) throw new Error('WEATHER_COMPONENT_PLAN_DUPLICATE_HOUR');
      byTime.set(row.time, row);
    }
    for (let offset = 0; offset < RAVSCORE_PUBLIC_FORECAST_HOURS; offset += 1) {
      const validTime = new Date(reference + offset * HOUR).toISOString();
      const row = byTime.get(validTime);
      for (const component of PLANNED_WEATHER_COMPONENTS) {
        const key = { partId: part.partId, component, validTime };
        const stats = summary[component];
        const source = row?.[`${component}Provenance`];
        const complete = hasValue(row, component)
          && ['verified', 'verified-derived'].includes(source?.status)
          && (!DMI_ONLY_WEATHER_COMPONENTS.includes(component) || source.provider === 'dmi');
        const missingTrend = component === 'waterLevel' && !finite(row?.waterLevelTrendCm3h);
        if (complete) {
          stats.valid += 1;
          if (source.provider === 'dmi') stats.dmi += 1;
          else if (['copernicus', 'open-meteo'].includes(source.provider)) {
            stats.reserve += 1;
            dmiUpgradeNeeds.push(key);
          }
        } else stats.missing += 1;
        if (missingTrend) stats.trendMissing += 1;
        if (!complete || missingTrend) {
          needs.push({ ...key, purpose: 'GAP', gapReason: complete ? 'TREND_GAP' : 'VALUE_GAP' });
          continue;
        }
        const modelRun = RESERVE_WEATHER_COMPONENTS.includes(component) && source.provider === 'dmi'
          ? responseBoundModelRun(source) : null;
        if (modelRun !== null && reference - modelRun >= DMI_RESERVE_CHALLENGE_AGE_HOURS * HOUR) {
          needs.push({ ...key, purpose: 'AGED_DMI_CHALLENGE', protectedModelRun: new Date(modelRun).toISOString() });
          stats.agedDmiChallenges += 1;
        }
      }
    }
  }
  const required = new Set(needs.map(row => JSON.stringify([row.partId, row.component, row.validTime])));
  const support = new Map();
  for (const need of needs.filter(row => row.component === 'waterLevel')) {
    const validTime = new Date(hour(need.validTime) + 3 * HOUR).toISOString();
    const key = JSON.stringify([need.partId, 'waterLevel', validTime]);
    if (!required.has(key)) support.set(key, { partId: need.partId, component: 'waterLevel', validTime,
      purpose: 'PRIVATE_T_PLUS_3_SUPPORT' });
  }
  return { productionReferenceAt, needs, privateSupportNeeds: [...support.values()], dmiUpgradeNeeds,
    dmiOnlyNeeds: needs.filter(row => DMI_ONLY_WEATHER_COMPONENTS.includes(row.component)), summary };
}

export function openMeteoGapPairsFromWeatherNeeds(plan) {
  // OM's current response contract has no proved modelRun: never spend its
  // budget on an aged-DMI challenge it cannot be authorised to win.
  const rows = (plan?.needs ?? []).filter(row => row.purpose === 'GAP'
    && RESERVE_WEATHER_COMPONENTS.includes(row.component));
  const pairs = new Map(rows.map(({ partId, component, validTime }) => [
    JSON.stringify([partId, component, validTime]), { partId, component, validTime },
  ]));
  return [...pairs.values()];
}
