export const ACTIVE_HISTORY_HOURS = 24;
export const RESEARCH_HISTORY_HOURS = 72;

const atMs = sample => Date.parse(sample?.at ?? '');

function orderedUnique(samples = []) {
  const byTime = new Map();
  for (const sample of samples) {
    const timestamp = atMs(sample);
    if (!Number.isFinite(timestamp)) continue;
    byTime.set(sample.at, sample);
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
