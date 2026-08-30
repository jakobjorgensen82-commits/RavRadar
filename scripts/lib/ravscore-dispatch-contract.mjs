const BOOLEAN_VALUES = new Set(['true', 'false']);
const ROLLBACK_MODES = new Set(['none', 'dry-run', 'execute']);

function text(value) {
  return value === null || value === undefined ? '' : String(value);
}

function booleanText(value, name) {
  const normalized = text(value || 'false');
  if (!BOOLEAN_VALUES.has(normalized)) throw new Error(`${name} must be true or false`);
  return normalized;
}

function requireEmpty(value, message) {
  if (text(value) !== '') throw new Error(message);
}

export function validateRavScoreDispatchContract(input = {}, { githubRef = 'refs/heads/main' } = {}) {
  const force = booleanText(input.force, 'force');
  const geometryPilot = booleanText(input.geometryPilot, 'geometryPilot');
  const geometryNational = booleanText(input.geometryNational, 'geometryNational');
  const returnRequested = booleanText(input.returnRequested, 'returnRequested');
  const rollbackMode = text(input.rollbackMode || 'none');
  if (!ROLLBACK_MODES.has(rollbackMode)) throw new Error('Unsupported Candidate G rollback mode');

  const retiredReconstructionValues = [
    input.reconstructionMode,
    input.inspectionRunId,
    input.inspectionArtifactId,
    input.descriptorSha256,
    input.applyRunId,
    input.rollbackArtifactId,
  ].map(text).filter(Boolean);
  if (retiredReconstructionValues.length > 0) {
    throw new Error('Candidate G gap reconstruction dispatch is permanently retired');
  }

  const operations = [
    force === 'true' && 'force',
    geometryPilot === 'true' && 'geometry-pilot',
    geometryNational === 'true' && 'geometry-national',
    rollbackMode !== 'none' && 'candidate-rollback',
    returnRequested === 'true' && 'integrated-return',
  ].filter(Boolean);
  if (operations.length > 1) {
    throw new Error('Exactly one force, geometry, rollback or return operation may be dispatched');
  }

  if ((rollbackMode !== 'none' || returnRequested === 'true')
    && githubRef !== 'refs/heads/main') {
    throw new Error('RavScore transitions are allowed only on main');
  }

  if (rollbackMode === 'execute') {
    if (text(input.rollbackConfirmation) !== 'EXECUTE-CANDIDATE-G-ROLLBACK') {
      throw new Error('Candidate G execute confirmation is not exact');
    }
  } else {
    requireEmpty(input.rollbackConfirmation, 'Candidate G execute confirmation is accepted only by execute mode');
  }

  if (returnRequested === 'true') {
    if (text(input.returnConfirmation) !== 'EXECUTE-INTEGRATED-RAVSCORE-RETURN') {
      throw new Error('Integrated return confirmation is not exact');
    }
  } else {
    requireEmpty(input.returnConfirmation, 'Integrated return confirmation is accepted only by an integrated return');
  }

  return Object.freeze({ operation: operations[0] ?? 'normal', rollbackMode });
}
