const DIRECTION_SAMPLES = 360;
const MAX_CORRECTION_POINTS = 19;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finite = value => typeof value === 'number' && Number.isFinite(value);
const finiteScore = value => finite(value) && value >= 0 && value <= 100;
const scoreQualityRank = result => result?.scoreQuality === 'FULL_HISTORY' ? 0
  : result?.scoreQuality === 'HISTORY_INCOMPLETE' ? 1
    : 2;

function normalizeDirection(value) {
  if (!finite(value)) return null;
  return ((value % 360) + 360) % 360;
}

function circularDistance(left, right) {
  const difference = Math.abs(left - right) % 360;
  return Math.min(difference, 360 - difference);
}

export function analyzeRankingDirections(rawDirections) {
  const directions = [...new Set((rawDirections || []).map(normalizeDirection).filter((value) => value !== null))];
  if (!directions.length) return null;
  let positiveAlignmentSum = 0;
  for (let currentDirection = 0; currentDirection < DIRECTION_SAMPLES; currentDirection += 1) {
    const bestDistance = Math.min(...directions.map((direction) => circularDistance(currentDirection, direction)));
    positiveAlignmentSum += Math.max(0, Math.cos((bestDistance * Math.PI) / 180));
  }
  return { uniqueDirectionCount: directions.length, meanPositiveAlignment: positiveAlignmentSum / DIRECTION_SAMPLES };
}

const oneDirectionAlignment = analyzeRankingDirections([0]).meanPositiveAlignment;

export function rankingSupportRatio(result, partCount) {
  if (!Number.isSafeInteger(partCount) || partCount < 1) return null;
  const coverage = result?.localCoverage || result;
  if (coverage?.status === 'whole-zone') return 1;
  if (coverage?.status === 'only-part') return 1 / partCount;
  const supportingParts = Array.isArray(coverage?.parts) ? coverage.parts.length : 0;
  if (supportingParts > 0) return clamp(supportingParts / partCount, 1 / partCount, 1);
  return Math.min(1, 2 / partCount);
}

export function calculateNationalRanking(result, parts) {
  const rawScore = result?.available === false || result?.scoreQuality === 'UNAVAILABLE'
    ? null
    : finiteScore(result?.score) ? result.score : null;
  const unchanged = { rankingScore: rawScore, correctionPoints: 0, applied: false, modelId: 'direction-broad-19-history-tie-v2' };
  if (rawScore === null || !Array.isArray(parts) || parts.length <= 1) return unchanged;

  const coverage = result?.localCoverage;
  const comparisonPartCount = coverage?.comparisonPartCount;
  if (!coverage?.status || comparisonPartCount !== parts.length) return unchanged;

  const directionAnalysis = analyzeRankingDirections(parts.map((part) => part?.onshoreDirectionDeg));
  if (!directionAnalysis) return unchanged;
  const opportunityIndex = directionAnalysis.meanPositiveAlignment / oneDirectionAlignment;
  const opportunityFactor = clamp((opportunityIndex - 1) / (Math.PI - 1), 0, 1);
  const supportRatio = rankingSupportRatio(result, parts.length);
  if (!finite(supportRatio)) return unchanged;
  const broadSupportFactor = supportRatio >= 0.5 ? 0 : supportRatio <= 0.25 ? 1 : (0.5 - supportRatio) / 0.25;
  const correctionPoints = MAX_CORRECTION_POINTS * opportunityFactor * (1 - supportRatio) * broadSupportFactor;
  return {
    rankingScore: rawScore - correctionPoints,
    correctionPoints,
    applied: correctionPoints > 0,
    modelId: 'direction-broad-19-history-tie-v2',
    opportunityIndex,
    supportRatio,
    uniqueDirectionCount: directionAnalysis.uniqueDirectionCount,
  };
}

export function addNationalRanking(row, parts) {
  const ranking = calculateNationalRanking(row?.result, parts);
  return { ...row, rankingScore: ranking.rankingScore, rankingDisplayScore: displayNationalRankingScore(ranking.rankingScore), rankingCorrection: ranking };
}

export function displayNationalRankingScore(value) {
  return finite(value) ? Math.round(clamp(value, 0, 100)) : null;
}

export function compareNationalRankingRows(left, right) {
  const rankingValue = row => finite(row?.rankingScore)
    && row?.result?.available !== false
    && row?.result?.scoreQuality !== 'UNAVAILABLE'
    ? row.rankingScore
    : row?.result?.available !== false
      && row?.result?.scoreQuality !== 'UNAVAILABLE'
      && finiteScore(row?.result?.score) ? row.result.score : null;
  const leftRanking = rankingValue(left);
  const rightRanking = rankingValue(right);
  if (leftRanking === null || rightRanking === null) {
    if (leftRanking === null && rightRanking !== null) return 1;
    if (rightRanking === null && leftRanking !== null) return -1;
    return 0;
  }
  const rankingDifference = rightRanking - leftRanking;
  if (rankingDifference !== 0) return rankingDifference;
  const rightScore = finiteScore(right?.result?.score) ? right.result.score : null;
  const leftScore = finiteScore(left?.result?.score) ? left.result.score : null;
  if (leftScore === null || rightScore === null) {
    if (leftScore === null && rightScore !== null) return 1;
    if (rightScore === null && leftScore !== null) return -1;
    return 0;
  }
  const scoreDifference = rightScore - leftScore;
  if (scoreDifference !== 0) return scoreDifference;
  return scoreQualityRank(left?.result) - scoreQualityRank(right?.result);
}
