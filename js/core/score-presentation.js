export const SCORE_PRESENTATION = Object.freeze({
  exceptionalMinimum: 90,
  levels: Object.freeze([
    Object.freeze({ minimum: 75, label: 'God', level: 'good' }),
    Object.freeze({ minimum: 55, label: 'Middel', level: 'fair' }),
    Object.freeze({ minimum: 35, label: 'Svag', level: 'weak' }),
    Object.freeze({ minimum: 0, label: 'Dårlig', level: 'poor' }),
  ]),
});

export function scoreRating(score) {
  if (score === null || score === undefined || score === '') {
    return { label: 'Ingen data', level: 'unavailable', exceptional: false };
  }
  const value = Number(score);
  if (!Number.isFinite(value)) {
    return { label: 'Ingen data', level: 'unavailable', exceptional: false };
  }
  const rating = SCORE_PRESENTATION.levels.find(item => value >= item.minimum)
    || SCORE_PRESENTATION.levels.at(-1);
  return { ...rating, exceptional: value >= SCORE_PRESENTATION.exceptionalMinimum };
}

export function exceptionalScoreMark(score, { symbol = '★' } = {}) {
  return scoreRating(score).exceptional ? symbol : '';
}
