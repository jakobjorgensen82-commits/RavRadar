// Selected-zone display only. Read the same authenticated PLAIN zone document for the complete view.
const metrics = [
  'windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'waterLevelCm',
  'currentSpeedMps', 'currentDirectionDeg', 'waterLevelTrendCm3h', 'waterTemperatureC',
];
const nonnegative = new Set(['windSpeedMps', 'waveHeightM', 'currentSpeedMps']);
const notice = 'FEGGESUND_NEIGHBOR_WAVE_PROXY';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value, keys) => object(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const previewFields = ['partName', 'historyCoverageHours', 'historyReasonCodes', 'weather'];

function weatherMetric(key, value) {
  return value === null || (Number.isFinite(value)
    && (!nonnegative.has(key) || value >= 0)
    && (!key.endsWith('DirectionDeg') || (value >= 0 && value <= 360)));
}

export function assertZonePreview(value, score) {
  const reasons = value?.historyReasonCodes;
  const coverage = value?.historyCoverageHours;
  const history = Array.isArray(reasons) && reasons.length <= 32
    && reasons.every(reason => typeof reason === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(reason))
    && new Set(reasons).size === reasons.length;
  const quality = score.scoreQuality;
  const coherent = quality === 'HISTORY_INCOMPLETE'
    ? Number.isFinite(coverage) && coverage >= 0 && coverage <= 48 && reasons?.length > 0
    : quality === 'FULL_HISTORY' ? coverage === 48 && reasons?.length === 0
      : coverage === null && reasons?.length === 0;
  const winner = score.possibleWinningParts.find(part => part.partId === score.winningPartId);
  if (!exact(value, previewFields) || !history || !coherent
    || (score.available ? value.partName !== winner?.name : value.partName !== null)) {
    throw new Error('MAP_HOUR_PANEL_PREVIEW');
  }
  if (value.weather === null) return value;
  if (!score.available || !exact(value.weather, [...metrics, 'waveInputNoticeId'])
    || !metrics.every(key => weatherMetric(key, value.weather[key]))
    || (value.weather.waveInputNoticeId !== null && value.weather.waveInputNoticeId !== notice)) {
    throw new Error('MAP_HOUR_PANEL_WEATHER');
  }
  return value;
}

// No actual fetch, competing cache, generation change, or product score calculation here.
export function visibleZonePreview(frame, { zoneId, mode }) {
  const entry = frame.zones[zoneId]?.[mode];
  if (!entry) throw new Error('MAP_HOUR_PANEL_SELECTION');
  const { preview, available, score, level, scoreQuality, scoreBounds } = entry;
  const result = { available, score, level, scoreQuality, scoreBounds,
    historyCoverageHours: preview.historyCoverageHours, historyReasonCodes: preview.historyReasonCodes,
    time: frame.time, localPartName: preview.partName };
  return {
    result,
    weather: preview.weather ? { ...preview.weather, time: frame.time } : { time: frame.time },
    displayContext: {
      scope: available ? (preview.weather ? 'local' : 'local-weather-missing') : 'local-unavailable',
      partName: preview.partName, time: frame.time,
    },
  };
}

export function requireExactZone(selection, zone, sameModelBinding) {
  const { frame, zoneId } = selection;
  const binding = zone?.delivery;
  const scoreRows = zone?.coastalParts?.zones?.[zoneId]?.hourly;
  const weatherRows = zone?.zones?.[zoneId]?.forecast?.hourly;
  if (binding?.kind !== 'zone' || binding.key !== zoneId || binding.sourceDetailsSha256 !== frame.sourceDetailsSha256
    || zone.datasetId !== frame.datasetId || zone.generatedAt !== frame.generatedAt
    || zone.productionReferenceAt !== frame.productionReferenceAt
    || !sameModelBinding(binding.modelBinding, frame.modelBinding)
    || !scoreRows?.some(row => row.time === frame.time) || !weatherRows?.some(row => row.time === frame.time)) {
    throw new Error('MAP_HOUR_PANEL_ZONE_BINDING');
  }
}
