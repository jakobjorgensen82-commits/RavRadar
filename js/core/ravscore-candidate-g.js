import { createCandidateGCalculation } from './ravscore-candidate-g-calculation.js';
export { CANDIDATE_G_WEIGHTS, CANDIDATE_G_HISTORY_MIX, CANDIDATE_G_VARIANTS }
  from './ravscore-candidate-g-calculation.js';
export const CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA =
  'På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed';

export const evaluateRavScoreCandidateG = createCandidateGCalculation({
  outflowZeroExplanationDa: CANDIDATE_G_OUTFLOW_ZERO_EXPLANATION_DA,
}).evaluateRavScoreCandidateG;
