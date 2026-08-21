const DIRECTION_SAMPLES = 360;
const MAX_CORRECTION_POINTS = 19;

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const finite = (value) => Number.isFinite(Number(value));

function normalizeDirection(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return ((number % 360) + 360) % 360;
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
  const coverage = result?.localCoverage || result;
  if (coverage?.status === 'whole-zone') return 1;
  if (coverage?.status === 'only-part') return 1 / partCount;
  const supportingParts = Array.isArray(coverage?.parts) ? coverage.parts.length : 0;
  if (supportingParts > 0) return clamp(supportingParts / partCount, 1 / partCount, 1);
  return Math.min(1, 2 / partCount);
}

export function calculateNationalRanking(result, parts) {
  const rawScore = Number(result?.score);
  const unchanged = { rankingScore: rawScore, correctionPoints: 0, applied: false, modelId: 'direction-broad-19-v1' };
  if (!finite(rawScore) || !Array.isArray(parts) || parts.length <= 1) return unchanged;

  const coverage = result?.localCoverage;
  const comparisonPartCount = Number(coverage?.comparisonPartCount);
  if (!coverage?.status || comparisonPartCount !== parts.length) return unchanged;

  const directionAnalysis = analyzeRankingDirections(parts.map((part) => part?.onshoreDirectionDeg));
  if (!directionAnalysis) return unchanged;
  const opportunityIndex = directionAnalysis.meanPositiveAlignment / oneDirectionAlignment;
  const opportunityFactor = clamp((opportunityIndex - 1) / (Math.PI - 1), 0, 1);
  const supportRatio = rankingSupportRatio(result, parts.length);
  const broadSupportFactor = supportRatio >= 0.5 ? 0 : supportRatio <= 0.25 ? 1 : (0.5 - supportRatio) / 0.25;
  const correctionPoints = MAX_CORRECTION_POINTS * opportunityFactor * (1 - supportRatio) * broadSupportFactor;
  return {
    rankingScore: rawScore - correctionPoints,
    correctionPoints,
    applied: correctionPoints > 0,
    modelId: 'direction-broad-19-v1',
    opportunityIndex,
    supportRatio,
    uniqueDirectionCount: directionAnalysis.uniqueDirectionCount,
  };
}

export function addNationalRanking(row, parts) {
  const ranking = calculateNationalRanking(row?.result, parts);
  return { ...row, rankingScore: ranking.rankingScore, rankingCorrection: ranking };
}

export function compareNationalRankingRows(left, right) {
  return Number(right?.rankingScore ?? right?.result?.score) - Number(left?.rankingScore ?? left?.result?.score);
}
