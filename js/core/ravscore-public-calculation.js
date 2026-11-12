import {
  RAVSCORE_CURRENT_SUPPLY_POLICY, RAVSCORE_MODEL_ID,
  RAVSCORE_MODEL_CONTRACT_SHA256, RAVSCORE_MODEL_BUNDLE_SHA256,
  RAVSCORE_WEIGHTS, assertRavScoreModelBinding,
} from './ravscore-numerical-contract.js';
const finite = value => typeof value === 'number' && Number.isFinite(value);
const clamp = value => Math.max(0, Math.min(100, Number(value)));

function exactScoreQualityContract(modelResult) {
  const quality = modelResult?.scoreQuality;
  const coverage = modelResult?.historyCoverageHours;
  const reasonCodes = modelResult?.historyReasonCodes;
  if (!finite(coverage)
    || coverage < 0
    || coverage > RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
    || !Array.isArray(reasonCodes)
    || reasonCodes.some(code => typeof code !== 'string'
      || !/^[A-Z][A-Z0-9_]{0,127}$/.test(code))
    || new Set(reasonCodes).size !== reasonCodes.length) return false;
  if (quality === 'FULL_HISTORY') {
    return typeof modelResult.calibrationEligible === 'boolean'
      && coverage === RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours
      && reasonCodes.length === 0
      && ['EXACT_POINT_SCORE', 'CONSERVATIVE_TAIL_RESET_POINT_SCORE']
        .includes(modelResult.scoreSemantics)
      && typeof modelResult.conservativeTailResetApplied === 'boolean'
      && modelResult.conservativeTailResetApplied
        === (modelResult.scoreSemantics === 'CONSERVATIVE_TAIL_RESET_POINT_SCORE');
  }
  if (quality === 'HISTORY_INCOMPLETE') {
    return modelResult.calibrationEligible === false
      && reasonCodes.length > 0
      && modelResult.scoreSemantics === 'CONSERVATIVE_ENCLOSING_LOWER_BOUND'
      && typeof modelResult.conservativeTailResetApplied === 'boolean';
  }
  return false;
}

const SCORE_BOUND_FIELDS = Object.freeze([
  'lower', 'upper', 'modelUncertaintyPoints', 'rawLower', 'rawUpper',
]);

function exactScoreBoundsContract(modelResult) {
  if (modelResult?.available !== true) return modelResult?.scoreBounds === null;
  const bounds = modelResult?.scoreBounds;
  if (!bounds || typeof bounds !== 'object' || Array.isArray(bounds)
    || JSON.stringify(Object.keys(bounds).sort())
      !== JSON.stringify([...SCORE_BOUND_FIELDS].sort())
    || !SCORE_BOUND_FIELDS.every(field => finite(bounds[field]))
    || bounds.lower < 0 || bounds.upper > 100 || bounds.lower > bounds.upper
    || bounds.rawLower < 0 || bounds.rawUpper > 100 || bounds.rawLower > bounds.rawUpper
    || Math.abs(bounds.modelUncertaintyPoints - (bounds.upper - bounds.lower)) > 1e-9
    || modelResult.score !== bounds.lower) return false;
  if (modelResult.scoreQuality === 'FULL_HISTORY') {
    return bounds.lower === bounds.upper && bounds.rawLower === bounds.rawUpper;
  }
  return modelResult.scoreQuality === 'HISTORY_INCOMPLETE';
}

export function calculateIntegratedLocalAvailability(modelResult, modelState) {
  const currentStatus = modelState?.currentMemoryStatus ?? 'MODEL_STATE_MISSING';
  const waveStatus = modelState?.waveMemoryStatus ?? 'MODEL_STATE_MISSING';
  const modelReady = modelResult?.available === true
    && finite(modelResult?.score)
    && modelResult?.modelId === RAVSCORE_MODEL_ID
    && modelResult?.modelContractSha256 === RAVSCORE_MODEL_CONTRACT_SHA256
    && modelResult?.modelBundleSha256 === RAVSCORE_MODEL_BUNDLE_SHA256;
  if (modelReady
    && exactScoreQualityContract(modelResult)
    && exactScoreBoundsContract(modelResult)) {
    return Object.freeze({
      available: true,
      code: modelResult.scoreQuality,
      messageDa: null,
    });
  }
  const code = modelReady
    ? 'INVALID_SCORE_QUALITY_CONTRACT'
    : typeof modelResult?.reason === 'string' && modelResult.reason
      ? modelResult.reason
      : modelState?.currentMemoryReady !== true ? currentStatus
        : modelState?.waveMemoryReady !== true ? waveStatus
          : 'DIRECT_SCORE_INPUT_MISSING';
  return Object.freeze({
    available: false,
    code,
    messageDa: null,
  });
}

export function calculateIntegratedPublicScoreValues(modelResult, { profile } = {}) {
  if (profile?.activeProfileId !== RAVSCORE_MODEL_ID) {
    throw new Error('Only the resolved integrated model may be projected publicly');
  }
  let exactBinding = false;
  try {
    exactBinding = assertRavScoreModelBinding(modelResult?.modelBinding);
  } catch {
    exactBinding = false;
  }
  if (!modelResult?.available || !finite(modelResult.score)
    || modelResult.modelVersion !== RAVSCORE_MODEL_ID
    || !exactBinding) {
    throw new Error('Integrated RavScore projection has an incompatible model binding');
  }
  const rawComponents = [
    modelResult.components?.huntability,
    modelResult.components?.transport,
    modelResult.components?.mobilisation,
  ];
  if (!rawComponents.every(finite)) {
    throw new Error('Integrated RavScore projection lacks a required public component');
  }
  const [huntability, transport, release] = rawComponents
    .map(value => Math.round(clamp(value)));
  const score = Math.round(clamp(modelResult.score));
  const weights = Object.freeze({
    huntability: RAVSCORE_WEIGHTS.huntability,
    transport: RAVSCORE_WEIGHTS.transport,
    release: RAVSCORE_WEIGHTS.mobilisation,
  });
  return { huntability, transport, release, score, weights };
}
