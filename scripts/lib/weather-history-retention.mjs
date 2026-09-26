export const ACTIVE_HISTORY_HOURS = 24;
export const RESEARCH_HISTORY_HOURS = 72;

export function historySampleReferenceAt(conditions = {}) {
  return conditions?.productionReferenceAt ?? conditions?.generatedAt;
}

const atMs = sample => Date.parse(sample?.at ?? '');
const finite = value => typeof value === 'number' && Number.isFinite(value);

// A repeated run may produce a better value for one component but a hole in
// another at the same hour. Choose each physical component as a unit so a
// fresh partial vector cannot inherit an unrelated old direction/trend.
function mergeSameHour(previous, current) {
  const merged = { ...previous, ...current };
  for (const [fields, valid] of [
    [['windSpeedMps', 'windDirectionDeg'], row => finite(row.windSpeedMps)],
    [['waveHeightM', 'waveDirectionDeg', 'wavePeriodS'], row => finite(row.waveHeightM)],
    [['currentSpeedMps', 'currentDirectionDeg', 'currentAlignment', 'currentVerified'],
      row => row.currentVerified === true && finite(row.currentSpeedMps) && finite(row.currentDirectionDeg)],
    [['waterLevelCm', 'waterLevelTrendCm3h', 'waterLevelSource'], row => finite(row.waterLevelCm)],
    [['waterTemperatureC'], row => finite(row.waterTemperatureC)],
  ]) {
    const selected = valid(current) || !valid(previous) ? current : previous;
    for (const field of fields) {
      if (Object.hasOwn(selected, field)) merged[field] = selected[field];
      else delete merged[field];
    }
  }
  return merged;
}

function orderedUnique(samples = []) {
  const byTime = new Map();
  for (const sample of samples) {
    const timestamp = atMs(sample);
    if (!Number.isFinite(timestamp)) continue;
    byTime.set(sample.at, byTime.has(sample.at)
      ? mergeSameHour(byTime.get(sample.at), sample) : sample);
  }
  return [...byTime.values()].sort((a, b) => atMs(a) - atMs(b));
}

export function retainWeatherHistory(previousZone = {}, sample, generatedAt) {
  const now = Date.parse(generatedAt);
  if (!Number.isFinite(now)) throw new TypeError('generatedAt must be a valid timestamp');
  const previous = Array.isArray(previousZone.samples72h)
    ? previousZone.samples72h
    : (previousZone.samples24h ?? []);
  const researchCutoff = now - RESEARCH_HISTORY_HOURS * 3600000;
  const activeCutoff = now - ACTIVE_HISTORY_HOURS * 3600000;
  const samples72h = orderedUnique([...previous, sample]).filter(row => atMs(row) >= researchCutoff && atMs(row) <= now);
  const samples24h = samples72h.filter(row => atMs(row) >= activeCutoff);
  return { samples24h, samples72h };
}

export function attachVerifiedCurrentToSample(samples = [], current = {}, generatedAt) {
  const verified = current?.currentProvenance?.status === 'verified';
  return samples.map(sample => sample?.at !== generatedAt ? sample : {
    ...sample,
    currentVerified: verified,
    currentSpeedMps: current?.currentSpeedMps ?? null,
    currentDirectionDeg: current?.currentDirectionDeg ?? null
  });
}
