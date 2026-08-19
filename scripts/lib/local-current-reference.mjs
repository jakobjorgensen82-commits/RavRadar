const finite = value => Number.isFinite(Number(value));

export function isCompleteLocalScoreRow(row, expectedPartCount) {
  const expected = Number(expectedPartCount);
  if (!Number.isFinite(Date.parse(row?.time ?? '')) || !Number.isFinite(expected) || expected < 1) return false;
  return ['waders', 'beach'].every(mode => {
    const value = row?.[mode];
    return value?.status !== 'uncertain'
      && finite(value?.score)
      && Number(value?.comparisonPartCount) === expected;
  });
}

export function selectNearestCompleteLocalScoreRow(rows, referenceAt, expectedPartCount) {
  const candidates = (rows ?? [])
    .filter(row => isCompleteLocalScoreRow(row, expectedPartCount))
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  if (!candidates.length) return null;
  const target = Date.parse(referenceAt ?? '');
  if (!Number.isFinite(target)) return candidates[0];
  return candidates.reduce((best, row) => {
    const distance = Math.abs(Date.parse(row.time) - target);
    const bestDistance = Math.abs(Date.parse(best.time) - target);
    return distance < bestDistance ? row : best;
  }, candidates[0]);
}
