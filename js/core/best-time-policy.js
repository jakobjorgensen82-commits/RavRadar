import { RAVSCORE_BEST_TIME_POLICY } from './ravscore-model-contract.js?v=4.0.306';

const finite = value => typeof value === 'number' && Number.isFinite(value);

const timeMilliseconds = value => {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
};

function wadersWaterTie(candidate) {
  const weather = candidate?.hour ?? candidate?.result?.localWeather ?? {};
  const levelKnown = finite(weather.waterLevelCm);
  const trendKnown = finite(weather.waterLevelTrendCm3h);
  const trend = trendKnown ? weather.waterLevelTrendCm3h : null;
  return {
    levelKnown,
    level: levelKnown ? weather.waterLevelCm : null,
    trendRank: !trendKnown ? 2 : trend <= 0 ? 0 : 1,
  };
}

export const RAVSCORE_BEST_TIME_SELECTION_REASONS = Object.freeze({
  ONLY_AVAILABLE: 'ONLY_AVAILABLE_RAVSCORE',
  HIGHEST_SCORE: 'HIGHEST_RAVSCORE',
  WADERS_KNOWN_WATER: 'WADERS_EQUAL_RAVSCORE_KNOWN_WATER_LEVEL',
  WADERS_LOWER_WATER: 'WADERS_EQUAL_RAVSCORE_LOWER_WATER_LEVEL',
  WADERS_NON_RISING_TREND: 'WADERS_EQUAL_RAVSCORE_NON_RISING_FORWARD_3H_WATER_CHANGE',
  EARLIEST: 'EQUAL_RAVSCORE_EARLIEST_TIME',
});

const WATER_SEARCHABILITY_SEMANTICS =
  'SEARCHABILITY_PRIORITY_NOT_MORE_AMBER_OR_SAFETY_ASSESSMENT';

export function ravScoreBestTimeSelectionReason(sortedCandidates, mode = 'beach') {
  if (!Array.isArray(sortedCandidates) || !sortedCandidates.length) return null;
  const selected = sortedCandidates[0];
  const compared = sortedCandidates[1] ?? null;
  const selectedScore = finite(selected?.result?.score) ? selected.result.score : null;
  const comparedScore = finite(compared?.result?.score) ? compared.result.score : null;
  if (!compared) return Object.freeze({
    code: RAVSCORE_BEST_TIME_SELECTION_REASONS.ONLY_AVAILABLE,
    selectedScore,
    comparedScore: null,
    semantics: 'ONLY_AVAILABLE_VALID_RAVSCORE_NOT_A_FIND_OR_SAFETY_GUARANTEE',
  });
  if (selectedScore !== comparedScore) return Object.freeze({
    code: RAVSCORE_BEST_TIME_SELECTION_REASONS.HIGHEST_SCORE,
    selectedScore,
    comparedScore,
    semantics: 'RAVSCORE_PRIORITY_NOT_A_FIND_OR_SAFETY_GUARANTEE',
  });
  if (mode === 'waders') {
    const selectedWater = wadersWaterTie(selected);
    const comparedWater = wadersWaterTie(compared);
    if (selectedWater.levelKnown !== comparedWater.levelKnown) return Object.freeze({
      code: RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_KNOWN_WATER,
      selectedScore,
      comparedScore,
      selectedWaterLevelCm: selectedWater.level,
      comparedWaterLevelCm: comparedWater.level,
      semantics: WATER_SEARCHABILITY_SEMANTICS,
    });
    if (selectedWater.levelKnown && selectedWater.level !== comparedWater.level) return Object.freeze({
      code: RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_LOWER_WATER,
      selectedScore,
      comparedScore,
      selectedWaterLevelCm: selectedWater.level,
      comparedWaterLevelCm: comparedWater.level,
      semantics: WATER_SEARCHABILITY_SEMANTICS,
    });
    if (selectedWater.trendRank !== comparedWater.trendRank) return Object.freeze({
      code: RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_NON_RISING_TREND,
      selectedScore,
      comparedScore,
      selectedWaterLevelCm: selectedWater.level,
      comparedWaterLevelCm: comparedWater.level,
      semantics: WATER_SEARCHABILITY_SEMANTICS,
    });
  }
  return Object.freeze({
    code: RAVSCORE_BEST_TIME_SELECTION_REASONS.EARLIEST,
    selectedScore,
    comparedScore,
    semantics: 'EARLIEST_TIME_PRIORITY_NOT_A_FIND_OR_SAFETY_GUARANTEE',
  });
}

export function bestTimeSelectionReasonI18nKey(reason) {
  const code = reason?.code;
  if (code === RAVSCORE_BEST_TIME_SELECTION_REASONS.ONLY_AVAILABLE) return 'score.bestTimeReason.onlyAvailable';
  if (code === RAVSCORE_BEST_TIME_SELECTION_REASONS.HIGHEST_SCORE) return 'score.bestTimeReason.highestScore';
  if (code === RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_KNOWN_WATER) return 'score.bestTimeReason.knownWater';
  if (code === RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_LOWER_WATER) return 'score.bestTimeReason.lowerWater';
  if (code === RAVSCORE_BEST_TIME_SELECTION_REASONS.WADERS_NON_RISING_TREND) return 'score.bestTimeReason.nonRisingTrend';
  return 'score.bestTimeReason.earliest';
}

export function compareRavScoreBestTimeCandidates(left, right, mode = 'beach') {
  const leftScore = finite(left?.result?.score) ? left.result.score : null;
  const rightScore = finite(right?.result?.score) ? right.result.score : null;
  if ((leftScore === null) !== (rightScore === null)) return leftScore === null ? 1 : -1;
  const scoreDelta = leftScore === null ? 0 : rightScore - leftScore;
  if (scoreDelta !== 0) return scoreDelta;
  if (mode === 'waders') {
    const leftWater = wadersWaterTie(left);
    const rightWater = wadersWaterTie(right);
    if (leftWater.levelKnown !== rightWater.levelKnown) {
      return leftWater.levelKnown ? -1 : 1;
    }
    if (leftWater.levelKnown && leftWater.level !== rightWater.level) {
      return leftWater.level - rightWater.level;
    }
    if (leftWater.trendRank !== rightWater.trendRank) {
      return leftWater.trendRank - rightWater.trendRank;
    }
  }
  return timeMilliseconds(left?.hour?.time ?? left?.result?.time)
    - timeMilliseconds(right?.hour?.time ?? right?.result?.time);
}

export { RAVSCORE_BEST_TIME_POLICY };
