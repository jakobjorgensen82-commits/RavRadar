import { ravScoreModelBinding } from '../../js/core/ravscore-numerical-contract.js';
import { FEGGESUND_WAVE_PROXY_INPUT_SOURCE, FEGGESUND_WAVE_PROXY_NOTICE_ID }
  from './feggesund-wave-calculation.mjs';

export const RAVSCORE_LOCAL_MARGIN_POINTS = 7;
const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
const scoreQualityRank = value => value === 'FULL_HISTORY' ? 0
  : value === 'HISTORY_INCOMPLETE' ? 1
    : 2;
const SCORE_BOUND_FIELDS = Object.freeze([
  'lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper',
]);

function exactAvailableScoreContract(value) {
  const bounds = value?.scoreBounds;
  if (value?.available !== true
    || finite(value.score) === null
    || !bounds || typeof bounds !== 'object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())
      !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || SCORE_BOUND_FIELDS.some(field => finite(bounds[field]) === null)
    || bounds.lower < 0 || bounds.upper > 100 || bounds.lower > bounds.upper
    || bounds.rawLower < 0 || bounds.rawUpper > 100 || bounds.rawLower > bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints - (bounds.upper - bounds.lower)) > 1e-9
    || value.score !== bounds.lower
    || finite(value.historyCoverageHours) === null
    || value.historyCoverageHours < 0 || value.historyCoverageHours > 48
    || !Array.isArray(value.historyReasonCodes)
    || value.historyReasonCodes.some(code => typeof code !== 'string'
      || !/^[A-Z][A-Z0-9_]{0,127}$/.test(code))
    || new Set(value.historyReasonCodes).size !== value.historyReasonCodes.length
    || typeof value.conservativeTailResetApplied !== 'boolean') return false;
  if (value.scoreQuality === 'FULL_HISTORY') {
    return typeof value.calibrationEligible === 'boolean'
      && value.historyCoverageHours === 48
      && value.historyReasonCodes.length === 0
      && bounds.lower === bounds.upper
      && bounds.rawLower === bounds.rawUpper
      && ['EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE']
        .includes(value.scoreSemantics)
      && value.conservativeTailResetApplied
        === (value.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE');
  }
  return value.scoreQuality === 'HISTORY_INCOMPLETE'
    && value.calibrationEligible === false
    && value.historyReasonCodes.length > 0
    && value.scoreSemantics === 'CONSERVATIVE_ENCLOSING_LOWER_BOUND';
}

export function calculateIntegratedZoneHourlyProjection({
  rows,
  expectedPartCount,
  selectedMode,
  marginPoints = RAVSCORE_LOCAL_MARGIN_POINTS,
} = {}, projectionText = { invalidResult: '', missingInput: '', missingExpectedParts: '' }) {
  if (!Array.isArray(rows) || !Number.isInteger(expectedPartCount)
    || expectedPartCount < 1 || typeof selectedMode !== 'function'
    || finite(marginPoints) === null || marginPoints < 0) {
    throw new Error('Integrated zone projection requires rows, expected part count and mode selector');
  }
  if (!['invalidResult', 'missingInput', 'missingExpectedParts']
    .every(key => typeof projectionText[key] === 'string')) {
    throw new TypeError('Zone projection metadata must contain only text');
  }
  const partIds = rows.map(row => row?.partId);
  if (partIds.some(partId => typeof partId !== 'string' || partId.length === 0)
    || new Set(partIds).size !== partIds.length
    || rows.length > expectedPartCount) {
    throw new Error('Integrated zone projection requires unique expected coastal parts');
  }
  const times = [...new Set(rows.flatMap(row => (row.scores ?? []).map(score => score.time)))].sort();
  return times.map(time => {
    const result = { time };
    for (const mode of ['waders', 'beach']) {
      const evaluated = rows.map(row => {
        const scoreRow = row.scores.find(score => score.time === time);
        const detail = scoreRow ? selectedMode(scoreRow, mode) : null;
        return {
          partId: row.partId,
          name: row.name,
          score: detail?.score,
          detail,
          weather: scoreRow?.weather,
          scoreContractValid: exactAvailableScoreContract(detail),
        };
      });
      const available = evaluated.filter(row => row.scoreContractValid);
      const missingExpectedPartCount = Math.max(0, expectedPartCount - evaluated.length);
      const unavailableParts = evaluated.filter(row => !row.scoreContractValid).map(row => ({
        partId: row.partId,
        name: row.name,
        code: row.detail?.available === true
          ? 'INTEGRATED_RAVSCORE_QUALITY_INVALID'
          : row.detail?.unavailability?.code ?? 'INTEGRATED_RAVSCORE_MISSING',
        reason: row.detail?.available === true
          ? projectionText.invalidResult
          : row.detail?.unavailability?.messageDa
            ?? projectionText.missingInput,
      }));
      const reasons = [...new Set([
        ...unavailableParts.map(part => part.reason),
        ...(missingExpectedPartCount > 0
          ? [projectionText.missingExpectedParts]
          : []),
      ])];
      const partialCoverage = available.length < expectedPartCount;
      if (available.length === 0) {
        const unavailabilityCode = missingExpectedPartCount > 0
          ? 'INTEGRATED_RAVSCORE_PART_COVERAGE_INCOMPLETE'
          : 'INTEGRATED_RAVSCORE_LOCAL_DATA_INCOMPLETE';
        result[mode] = {
          modelBinding: ravScoreModelBinding(),
          status: 'unavailable',
          available: false,
          score: null,
          scoreBounds: null,
          scoreQuality: 'UNAVAILABLE',
          calibrationEligible: false,
          scoreSemantics: null,
          conservativeTailResetApplied: false,
          historyCoverageHours: null,
          historyReasonCodes: [],
          validPartCount: available.length,
          expectedPartCount,
          unavailableParts,
          reasons,
          unavailability: {
            available: false,
            code: unavailabilityCode,
            messageDa: reasons.join(' '),
            policy: 'integrated-model-local-fail-closed',
            validPartCount: available.length,
            expectedPartCount,
          },
        };
        continue;
      }
      available.sort((left, right) => right.score - left.score
        || scoreQualityRank(left.detail?.scoreQuality)
          - scoreQualityRank(right.detail?.scoreQuality)
        || left.partId.localeCompare(right.partId));
      const winner = available[0];
      const high = winner.score;
      const low = available.at(-1).score;
      const lower = Math.max(...available.map(row => row.detail.scoreBounds.lower));
      const upper = Math.max(...available.map(row => row.detail.scoreBounds.upper));
      const rawLower = Math.max(...available.map(row => row.detail.scoreBounds.rawLower));
      const rawUpper = Math.max(...available.map(row => row.detail.scoreBounds.rawUpper));
      const historyIncomplete = available.some(row =>
        row.detail.scoreQuality === 'HISTORY_INCOMPLETE');
      const calibrationInputLocked = available.some(row =>
        row.detail.calibrationEligible !== true);
      const historyCoverageHours = Math.min(...available
        .map(row => row.detail.historyCoverageHours));
      const historyReasonCodes = [...new Set(available
        .flatMap(row => row.detail.scoreQuality === 'HISTORY_INCOMPLETE'
          ? row.detail.historyReasonCodes : []))].sort();
      const conservativeTailResetApplied = historyIncomplete
        ? available.some(row => row.detail.conservativeTailResetApplied === true)
        : winner.detail.conservativeTailResetApplied === true;
      const possibleWinningParts = available
        .filter(row => row.detail.scoreBounds.upper >= lower)
        .sort((left, right) => left.partId.localeCompare(right.partId))
        .map(row => ({
          partId: row.partId,
          name: row.name,
          score: row.score,
          scoreBounds: { ...row.detail.scoreBounds },
        }));
      const winningPartUncertain = (historyIncomplete
        && possibleWinningParts.some(part => part.partId !== winner.partId))
        || partialCoverage;
      const near = available.filter(row => high - row.score <= marginPoints);
      const status = partialCoverage
        ? 'partial-zone'
        : high - low <= marginPoints
          ? 'whole-zone'
          : near.length === 1 ? 'only-part' : 'several-parts';
      const weather = winner.weather ?? {};
      const proxyWaveInputs = available
        .map(row => row.weather ?? {})
        .filter(candidate =>
          candidate.waveInputSource === FEGGESUND_WAVE_PROXY_INPUT_SOURCE
          && ['LOW', 'MODERATE', 'HIGH'].includes(candidate.waveInputUncertainty)
          && candidate.waveInputNoticeId === FEGGESUND_WAVE_PROXY_NOTICE_ID);
      const aggregateWaveInputQuality = proxyWaveInputs.length > 0
        ? {
          waveInputSource: FEGGESUND_WAVE_PROXY_INPUT_SOURCE,
          waveInputUncertainty: proxyWaveInputs
            .map(candidate => candidate.waveInputUncertainty)
            .sort((left, right) =>
              ['LOW', 'MODERATE', 'HIGH'].indexOf(right)
              - ['LOW', 'MODERATE', 'HIGH'].indexOf(left))[0],
          waveInputNoticeId: FEGGESUND_WAVE_PROXY_NOTICE_ID,
        }
        : {
          waveInputSource: weather.waveInputSource,
          waveInputUncertainty: weather.waveInputUncertainty,
          waveInputNoticeId: weather.waveInputNoticeId,
        };
      const explanation = winner.detail?.explanation ?? {};
      result[mode] = {
        modelBinding: ravScoreModelBinding(),
        available: true,
        status,
        score: lower,
        scoreBounds: {
          lower,
          upper,
          modelUncertaintyPoints: upper - lower,
          rawLower,
          rawUpper,
        },
        winningPartId: winner.partId,
        winningPartName: winner.name,
        winningPartUncertain,
        possibleWinningPartCount: possibleWinningParts.length,
        possibleWinningParts,
        scoreSpread: high - low,
        comparisonPartCount: available.length,
        scoreQuality: historyIncomplete ? 'HISTORY_INCOMPLETE' : 'FULL_HISTORY',
        calibrationEligible: !partialCoverage && !historyIncomplete && !calibrationInputLocked,
        scoreSemantics: historyIncomplete
          ? 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
          : conservativeTailResetApplied
            ? 'CONSERVATIVE_TAIL_RESET_POINT_SCORE'
            : 'EXACT_POINT_SCORE',
        conservativeTailResetApplied,
        historyCoverageHours,
        historyReasonCodes,
        ...(partialCoverage ? {
          validPartCount: available.length,
          expectedPartCount,
          unavailableParts,
          reasons,
        } : {}),
        components: winner.detail?.components ?? {},
        componentReasons: winner.detail?.componentReasons ?? {},
        explanation: {
          ...explanation,
          transportDiagnostics: {
            ...(explanation.transportDiagnostics ?? {}),
            coastTransportExplanation: explanation.transportDiagnostics?.coastTransportExplanation,
          },
        },
        weather: {
          windSpeedMps: weather.windSpeedMps,
          windDirectionDeg: weather.windDirectionDeg,
          waveHeightM: weather.waveHeightM,
          wavePeriodS: weather.wavePeriodS,
          waveDirectionDeg: weather.waveDirectionDeg,
          ...aggregateWaveInputQuality,
          waterLevelCm: weather.waterLevelCm,
          waterLevelTrendCm3h: weather.waterLevelTrendCm3h,
          currentSpeedMps: weather.currentSpeedMps,
          currentDirectionDeg: weather.currentDirectionDeg,
          waterTemperatureC: weather.waterTemperatureC,
          currentProvenance: weather.currentProvenance,
        },
        parts: status === 'whole-zone'
          ? []
          : near.map(({ partId, name, score, detail }) => ({
            partId,
            name,
            score,
            scoreQuality: detail.scoreQuality,
            scoreBounds: { ...detail.scoreBounds },
            historyCoverageHours: detail.historyCoverageHours,
            historyReasonCodes: [...detail.historyReasonCodes],
          })),
      };
    }
    return result;
  });
}
