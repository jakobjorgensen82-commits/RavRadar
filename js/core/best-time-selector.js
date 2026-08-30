import { calculateRavScore } from './score-engine.js?v=4.0.316';

const finite = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
const isoDay = value => String(value || '').slice(0, 10);
const timeMs = value => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
};

function wadersTieValue(candidate) {
  const level = finite(candidate.hour?.waterLevelCm) ? Number(candidate.hour.waterLevelCm) : Number.POSITIVE_INFINITY;
  const trend = finite(candidate.hour?.waterLevelTrendCm3h) ? Number(candidate.hour.waterLevelTrendCm3h) : 0;
  // Kun tie-breaker: lavere vand og faldende/stabil trend er lettere at jage i.
  return level + Math.max(0, trend) * 3;
}

function compareCandidates(a, b, mode) {
  const scoreDelta = Number(b.result.score) - Number(a.result.score);
  if (scoreDelta !== 0) return scoreDelta;
  if (mode === 'waders') {
    const waterDelta = wadersTieValue(a) - wadersTieValue(b);
    if (waterDelta !== 0) return waterDelta;
  }
  const aTime = timeMs(a.hour?.time) ?? Number.POSITIVE_INFINITY;
  const bTime = timeMs(b.hour?.time) ?? Number.POSITIVE_INFINITY;
  return aTime - bTime;
}

export function selectBestTimeForDay({
  day,
  zone,
  mode,
  history = {},
  currentWeather = null,
  currentResult = null,
  now = new Date(),
  adaptiveModel = null
}) {
  const dayDate = day?.date || isoDay(day?.hours?.[0]?.time);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const today = isoDay(currentWeather?.time || new Date(nowMs).toISOString());
  const candidates = [];

  for (const hour of day?.hours || []) {
    const hourMs = timeMs(hour.time);
    // På dagens kort vises kun nu og resten af dagen. Fortid må aldrig vælges.
    if (dayDate === today && hourMs !== null && hourMs < nowMs - 30 * 60 * 1000) continue;
    const result = calculateRavScore({ mode, zone, weather: hour, history, adaptiveModel });
    if (result.available) candidates.push({ hour, result, source: 'forecast', isNow: false });
  }

  if (dayDate === today && currentWeather && currentResult?.available) {
    const currentTime = currentWeather.time || now.toISOString();
    candidates.push({
      hour: { ...currentWeather, time: currentTime },
      result: currentResult,
      source: 'current',
      isNow: true
    });
  }

  candidates.sort((a, b) => compareCandidates(a, b, mode));
  if (!candidates.length) {
    return {
      hour: day?.hours?.[Math.floor((day?.hours?.length || 1) / 2)] || {},
      result: { available: false, score: null, level: 'unavailable', components: {} },
      recommended: false,
      isNow: false,
      source: 'none',
      candidates: []
    };
  }

  const best = candidates[0];
  return {
    ...best,
    recommended: true,
    candidates: candidates.map(item => ({
      time: item.hour?.time || null,
      score: item.result?.score ?? null,
      source: item.source,
      isNow: item.isNow
    }))
  };
}
