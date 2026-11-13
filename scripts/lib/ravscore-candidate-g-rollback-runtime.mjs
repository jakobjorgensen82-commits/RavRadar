import { buildCandidateGRollbackPartScoreSeries as calculateCandidateSeries }
  from './ravscore-candidate-g-rollback-calculation.mjs';
import { CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA }
  from '../../js/core/ravscore-candidate-g.js';
export * from './ravscore-candidate-g-rollback-calculation.mjs';

export function buildCandidateGRollbackPartScoreSeries(options = {}) {
  return calculateCandidateSeries(options, {
    outflowZeroExplanationDa: CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA,
  });
}
