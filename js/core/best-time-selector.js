import {
  RAVSCORE_BEST_TIME_POLICY,
  compareRavScoreBestTimeCandidates,
  ravScoreBestTimeSelectionReason,
} from './best-time-policy.js?v=4.0.314';
import { forecastDateKeyInTimeZone } from './forecast-calendar.js?v=4.0.314';

const timeMs = value => {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : null;
};
const finiteScore = value => typeof value === 'number' && Number.isFinite(value);

export function selectBestTimeForDay({
  day,
  mode,
  currentWeather = null,
  currentResult = null,
  now = new Date(),
  scoreForHour = hour => hour?.ravScoreResult ?? null,
}) {
  if (typeof scoreForHour !== 'function') {
    throw new Error('Best-time selection requires an integrated RavScore result provider');
  }
  const dayDate = day?.date || (day?.hours?.[0]?.time
    ? forecastDateKeyInTimeZone(day.hours[0].time)
    : null);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  const today = forecastDateKeyInTimeZone(nowMs);
  const candidates = [];

  for (const hour of day?.hours || []) {
    const hourMs = timeMs(hour.time);
    // På dagens kort vises kun nu og resten af dagen. Fortid må aldrig vælges.
    if (dayDate === today && hourMs !== null
      && hourMs < nowMs - RAVSCORE_BEST_TIME_POLICY.currentDayPastToleranceMinutes * 60_000) {
      continue;
    }
    const result = scoreForHour(hour);
    if (result?.available === true && finiteScore(result.score)) {
      candidates.push({ hour, result, source: 'forecast', isNow: false });
    }
  }

  if (dayDate === today && currentWeather && currentResult?.available === true
    && finiteScore(currentResult.score)) {
    const currentTime = currentWeather.time || now.toISOString();
    candidates.push({
      hour: { ...currentWeather, time: currentTime },
      result: currentResult,
      source: 'current',
      isNow: true
    });
  }

  candidates.sort((a, b) => compareRavScoreBestTimeCandidates(a, b, mode));
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
    selectionReason: ravScoreBestTimeSelectionReason(candidates, mode),
    candidates: candidates.map(item => ({
      time: item.hour?.time || null,
      score: item.result?.score ?? null,
      source: item.source,
      isNow: item.isNow
    }))
  };
}
