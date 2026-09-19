// Exact UTC joins. Array position is never a timestamp or a three-hour interval.
const HOUR_MS = 3_600_000;
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const round = (value, digits) => value === null ? null : Number(value.toFixed(digits));
const FIELD_UNITS = Object.freeze({
  wind_speed_10m: 'm/s', wind_direction_10m: '°', temperature_2m: '°C',
  wave_height: 'm', wave_peak_period: 's', wave_direction: '°',
  sea_surface_temperature: '°C',
});

export function openMeteoUtcTime(value) {
  if (typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{3})?)?(?:Z|[+]00:00)?$/.test(value)) return null;
  const text = /(?:Z|[+]00:00)$/.test(value) ? value : `${value}Z`;
  const ms = Date.parse(text);
  if (!Number.isFinite(ms) || ms % HOUR_MS !== 0) return null;
  const canonical = new Date(ms).toISOString();
  // Date.parse normalises impossible calendar dates (and 24:00) silently.
  // The response must name this actual UTC hour, not a different normalised one.
  return canonical.slice(0, 16) === value.slice(0, 16) ? canonical : null;
}

export function openMeteoHourlyIndex(document) {
  const index = new Map();
  if (!document) return index;
  if (document.utc_offset_seconds !== undefined && document.utc_offset_seconds !== 0) {
    throw new Error('OPEN_METEO_NON_UTC_RESPONSE');
  }
  const times = document.hourly?.time;
  if (!Array.isArray(times)) throw new Error('OPEN_METEO_HOURLY_TIME_AXIS_MISSING');
  for (const [position, raw] of times.entries()) {
    const time = openMeteoUtcTime(raw);
    if (!time || index.has(time)) throw new Error('OPEN_METEO_HOURLY_TIME_AXIS_INVALID');
    index.set(time, position);
  }
  return index;
}

export function openMeteoValueAt(document, index, time, variable) {
  const position = index.get(time);
  const values = document?.hourly?.[variable];
  // Unit/request parameters are not proof of what the response returned.
  // Reject only the affected field, keeping independent valid components.
  return position === undefined || !Object.hasOwn(FIELD_UNITS, variable)
    || document?.hourly_units?.[variable] !== FIELD_UNITS[variable]
    || !Array.isArray(values) || values.length !== index.size
    ? null : finite(values[position]);
}

export function buildOpenMeteoHourlyComponents(weather, marine, { onInvalidField = () => {} } = {}) {
  const windIndex = openMeteoHourlyIndex(weather);
  const marineIndex = openMeteoHourlyIndex(marine);
  for (const [document, index, variables] of [
    [weather, windIndex, ['wind_speed_10m', 'wind_direction_10m', 'temperature_2m']],
    [marine, marineIndex, ['wave_height', 'wave_peak_period', 'wave_direction',
      'sea_surface_temperature']],
  ]) {
    if (!document) continue;
    for (const variable of variables) {
      const values = document.hourly?.[variable];
      if (document.hourly_units?.[variable] !== FIELD_UNITS[variable]) {
        onInvalidField(variable, 'OPEN_METEO_FIELD_UNIT_INVALID');
      } else if (!Array.isArray(values) || values.length !== index.size) {
        onInvalidField(variable, 'OPEN_METEO_FIELD_TIME_AXIS_MISMATCH');
      }
    }
  }
  const times = [...new Set([...windIndex.keys(), ...marineIndex.keys()])].sort();
  return times.map(time => {
    const wind = variable => openMeteoValueAt(weather, windIndex, time, variable);
    const sea = variable => openMeteoValueAt(marine, marineIndex, time, variable);
    const windSpeed = wind('wind_speed_10m');
    const windDirection = wind('wind_direction_10m');
    const windValid = windSpeed !== null && windSpeed >= 0
      && windDirection !== null && windDirection >= 0 && windDirection <= 360;
    const height = sea('wave_height');
    const period = sea('wave_peak_period');
    const direction = sea('wave_direction');
    const waveValid = height !== null && height >= 0 && period !== null && period >= 0
      && (height === 0 || period > 0)
      && (height === 0 && direction === null || direction !== null && direction >= 0 && direction <= 360);
    return {
      time,
      windSpeedMps: windValid ? round(windSpeed, 1) : null,
      windDirectionDeg: windValid ? Math.round(windDirection) % 360 : null,
      airTemperatureC: round(wind('temperature_2m'), 1),
      waveHeightM: waveValid ? round(height, 2) : null,
      waveDirectionDeg: waveValid && direction !== null ? Math.round(direction) % 360 : null,
      wavePeriodS: waveValid ? round(period, 1) : null,
      // Owner policy applies equally to new responses and old cached payloads.
      waterLevelCm: null,
      waterLevelReference: null,
      waterLevelTrendCm3h: null,
      currentSpeedMps: null,
      currentDirectionDeg: null,
      waterTemperatureC: round(sea('sea_surface_temperature'), 1),
    };
  });
}

// A bad marine response cannot discard an independently valid wind response.
// Transport and schema errors are reported independently to the caller.
export async function fetchIndependentOpenMeteoComponents({ weather, marine, onError = () => {} }) {
  // Factory/setup errors must not prevent the other component from starting.
  const results = await Promise.allSettled([
    Promise.resolve().then(weather), Promise.resolve().then(marine),
  ]);
  return results.map((result, index) => {
    const component = index === 0 ? 'weather' : 'marine';
    if (result.status === 'rejected') {
      onError(component, result.reason);
      return null;
    }
    try {
      openMeteoHourlyIndex(result.value);
      return result.value;
    } catch (error) {
      onError(component, error);
      return null;
    }
  });
}

const COMPONENT_FIELDS = Object.freeze({
  wind: ['windSpeedMps', 'windDirectionDeg', 'airTemperatureC'],
  wave: ['waveHeightM', 'wavePeriodS', 'waveDirectionDeg'],
  waterLevel: ['waterLevelCm', 'waterLevelReference', 'waterLevelTrendCm3h'],
  waterTemperature: ['waterTemperatureC'],
});
const COMPONENT_VARIABLES = Object.freeze({
  wind: ['wind_speed_10m', 'wind_direction_10m', 'temperature_2m'],
  wave: ['wave_height', 'wave_peak_period', 'wave_direction'],
  waterTemperature: ['sea_surface_temperature'],
});

// Each response belongs to one explicitly requested component/model. A stray
// field in a response cannot replace a field owned by another request. In
// particular, the wave tuple remains on one response's own time axis.
export function buildOpenMeteoIndependentHourlyComponents(responses, { onInvalidField = () => {} } = {}) {
  const byTime = new Map();
  for (const [component, fields] of Object.entries(COMPONENT_FIELDS)) {
    if (component === 'waterLevel') continue;
    const document = responses?.[component];
    if (!document) continue;
    const rows = buildOpenMeteoHourlyComponents(component === 'wind' ? document : null,
      component === 'wind' ? null : document, {
        onInvalidField: (field, code) => {
          if (COMPONENT_VARIABLES[component].includes(field)) onInvalidField(component, field, code);
        },
      });
    for (const row of rows) {
      const existing = byTime.get(row.time) ?? Object.fromEntries([
        ['time', row.time], ...Object.values(COMPONENT_FIELDS).flat().map(field => [field, null]),
        ['currentSpeedMps', null], ['currentDirectionDeg', null],
      ]);
      for (const field of fields) existing[field] = row[field];
      byTime.set(row.time, existing);
    }
  }
  return [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));
}

export async function fetchOpenMeteoComponentResponses(factories, { onError = () => {}, concurrency = 2 } = {}) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error('OPEN_METEO_COMPONENT_CONCURRENCY_INVALID');
  }
  const pending = Object.keys(COMPONENT_FIELDS).filter(component => component !== 'waterLevel'
    && typeof factories?.[component] === 'function');
  const responses = Object.fromEntries(Object.keys(COMPONENT_FIELDS).map(component => [component, null]));
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
    while (cursor < pending.length) {
      const component = pending[cursor++];
      try {
        const document = await factories[component]();
        openMeteoHourlyIndex(document);
        responses[component] = document;
      } catch (error) {
        onError(component, error);
      }
    }
  }));
  return responses;
}
