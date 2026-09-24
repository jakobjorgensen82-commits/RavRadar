import {
  buildDmiForecastHourly,
  sameNativeIdentity,
  verifiedDmiForecastSource,
} from './dmi-forecast-store.mjs';

const MARINE_COMPONENTS = Object.freeze(['current', 'waterLevel', 'waterTemperature']);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const nativeSource = (row, component) => row?.provenance?.[component] ?? null;
const nativeTime = row => Date.parse(row?.step);

function completeNative(row, component) {
  if (component === 'current') return finite(row?.['current-u']) && finite(row?.['current-v']);
  if (component === 'waterLevel') return finite(row?.['sea-mean-deviation']);
  return finite(row?.['water-temperature']);
}

function completeHour(row, component) {
  if (component === 'current') return finite(row?.currentUMps) && finite(row?.currentVMps);
  if (component === 'waterLevel') return finite(row?.waterLevelCm);
  return finite(row?.waterTemperatureC);
}

function runOnlyRow(row, component) {
  return {
    step: row.step,
    'current-u': component === 'current' ? row['current-u'] : null,
    'current-v': component === 'current' ? row['current-v'] : null,
    'sea-mean-deviation': component === 'waterLevel' ? row['sea-mean-deviation'] : null,
    'water-temperature': component === 'waterTemperature' ? row['water-temperature'] : null,
    provenance: { [component]: nativeSource(row, component) },
  };
}

function copyComponent(row, candidate, component) {
  const fields = component === 'current'
    ? ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']
    : component === 'waterLevel'
      ? ['waterLevelCm', 'waterLevelModelCm', 'waterLevelBiasCm',
        'waterLevelObservationDifferenceCm', 'waterLevelTrendCm3h']
      : ['waterTemperatureC'];
  for (const field of fields) row[field] = candidate[field] ?? null;
  row.sources = { ...(row.sources ?? {}), [component]: candidate.sources[component] };
  if (component === 'current' && row.temporalResolution == null) {
    row.temporalResolution = candidate.temporalResolution;
  }
}

/**
 * The DKSS cache combines marine parameters by native hour, but those
 * parameters can have different native timestamps. Build each marine series
 * independently before filling only genuinely missing values in the weather
 * producer. The shared, model-bound forecast implementation is unchanged.
 */
export function buildDmiMarineComponentwiseHourly({ ocean = [], expectedIdentity, ...options } = {}) {
  if (!expectedIdentity || !Array.isArray(ocean)) {
    throw new Error('DMI marine componentwise build requires native rows and exact identity');
  }
  const built = buildDmiForecastHourly({ ...options, ocean });
  const hourly = built.hourly.map(row => ({ ...row, sources: { ...(row.sources ?? {}) } }));
  for (const component of MARINE_COMPONENTS) {
    const native = ocean.filter(row => completeNative(row, component));
    if (!native.length || hourly.every(row => completeHour(row, component))) continue;
    const componentHourly = buildDmiForecastHourly({
      ...options,
      ocean: native.map(row => runOnlyRow(row, component)),
    }).hourly;
    for (let index = 0; index < hourly.length; index += 1) {
      const row = hourly[index];
      const candidate = componentHourly[index];
      if (completeHour(row, component) || !completeHour(candidate, component)) continue;
      if (!verifiedDmiForecastSource(
        candidate.sources?.[component], component, row.time, expectedIdentity,
      )) continue;
      copyComponent(row, candidate, component);
    }
  }
  return { ...built, hourly };
}

/**
 * Weather-producer-only repair for a DMI model-run boundary. The shared
 * forecast/model adapter remains unchanged. Rebuild each already-verified
 * native run independently, then admit only a bounded, fully verified edge
 * from the two otherwise identical native sources adjacent to a missing hour.
 */
export function recoverDmiMarineRunSeamHours({
  hourly,
  ocean,
  generatedAt,
  startAt = generatedAt,
  sourceCadenceMinutes = 180,
  expectedIdentity,
} = {}) {
  if (!Array.isArray(hourly) || !Array.isArray(ocean) || !expectedIdentity) {
    throw new Error('DMI marine run-seam recovery requires exact hourly, native rows and identity');
  }
  const recovered = hourly.map(row => ({ ...row, sources: { ...(row.sources ?? {}) } }));
  const runForecasts = new Map();
  for (const component of MARINE_COMPONENTS) {
    const native = ocean.filter(row => completeNative(row, component)
      && nativeSource(row, component)?.modelRun
      && Number.isFinite(nativeTime(row)))
      .sort((left, right) => nativeTime(left) - nativeTime(right));
    if (native.length < 2) continue;
    for (let index = 0; index < recovered.length; index += 1) {
      const row = recovered[index];
      if (completeHour(row, component)) continue;
      const targetMs = Date.parse(row?.time);
      if (!Number.isFinite(targetMs)) continue;
      const before = native.findLast(item => nativeTime(item) < targetMs);
      const after = native.find(item => nativeTime(item) > targetMs);
      if (!before || !after) continue;
      const beforeSource = nativeSource(before, component);
      const afterSource = nativeSource(after, component);
      if (beforeSource.modelRun === afterSource.modelRun
        || !sameNativeIdentity(
          { ...beforeSource, modelRun: '__run_seam__' },
          { ...afterSource, modelRun: '__run_seam__' },
          component,
        )) continue;

      const candidates = [];
      for (const endpoint of [before, after]) {
        const source = nativeSource(endpoint, component);
        const key = `${component}|${source.modelRun}`;
        if (!runForecasts.has(key)) {
          const runRows = native.filter(item => nativeSource(item, component).modelRun === source.modelRun)
            .map(item => runOnlyRow(item, component));
          runForecasts.set(key, buildDmiForecastHourly({
            ocean: runRows, generatedAt, startAt, hours: recovered.length, sourceCadenceMinutes,
          }).hourly);
        }
        const candidate = runForecasts.get(key)[index];
        const proof = candidate?.sources?.[component];
        if (!completeHour(candidate, component)
          || proof?.temporalResolution !== 'nearest-edge'
          || proof?.nativeValidTimes?.length !== 1
          || Date.parse(proof.nativeValidTimes[0]) !== nativeTime(endpoint)
          || !verifiedDmiForecastSource(proof, component, row.time, expectedIdentity)) continue;
        candidates.push({ candidate, nativeDistanceMs: Math.abs(nativeTime(endpoint) - targetMs),
          modelRunMs: Date.parse(source.modelRun) });
      }
      candidates.sort((left, right) => left.nativeDistanceMs - right.nativeDistanceMs
        || right.modelRunMs - left.modelRunMs);
      if (candidates[0]) copyComponent(row, candidates[0].candidate, component);
    }
  }
  return recovered;
}
