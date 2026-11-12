import {
  RAVSCORE_PRESENTATION_POLICY as NUMERICAL_PRESENTATION,
  RAVSCORE_MODEL_CONTRACT as NUMERICAL_CONTRACT,
} from './ravscore-numerical-contract.js';
export * from './ravscore-numerical-contract.js';

const labelsDa = Object.freeze({ good: 'God', fair: 'Middel', weak: 'Svag', poor: 'Dårlig' });
export const RAVSCORE_PRESENTATION_POLICY = Object.freeze({
  ...NUMERICAL_PRESENTATION,
  levels: Object.freeze(NUMERICAL_PRESENTATION.levels.map(({ minimum, level }) =>
    Object.freeze({ minimum, labelDa: labelsDa[level], level }))),
});
export const RAVSCORE_MODEL_CONTRACT = Object.freeze({
  ...NUMERICAL_CONTRACT,
  presentation: RAVSCORE_PRESENTATION_POLICY,
});
