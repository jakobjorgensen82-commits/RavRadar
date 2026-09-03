import { RAVSCORE_PRESENTATION_POLICY } from './ravscore-model-contract.js?v=4.0.321';

export const SCORE_PRESENTATION = RAVSCORE_PRESENTATION_POLICY;

export function scoreRating(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) {
    return { label: 'Ingen data', level: 'unavailable', exceptional: false };
  }
  const rating = SCORE_PRESENTATION.levels.find(item => score >= item.minimum)
    ?? SCORE_PRESENTATION.levels.at(-1);
  return {
    label: rating.labelDa,
    level: rating.level,
    exceptional: score >= SCORE_PRESENTATION.exceptionalMinimum,
  };
}

export function exceptionalScoreMark(score, { symbol = '★' } = {}) {
  return scoreRating(score).exceptional ? symbol : '';
}
