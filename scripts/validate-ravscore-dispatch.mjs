import { validateRavScoreDispatchContract } from './lib/ravscore-dispatch-contract.mjs';

const result = validateRavScoreDispatchContract({
  force: process.env.FORCE,
  geometryPilot: process.env.GEOMETRY_PILOT,
  geometryNational: process.env.GEOMETRY_NATIONAL,
  rollbackMode: process.env.ROLLBACK_MODE,
  rollbackConfirmation: process.env.ROLLBACK_CONFIRMATION,
  returnRequested: process.env.RETURN_REQUESTED,
  returnConfirmation: process.env.RETURN_CONFIRMATION,
}, { githubRef: process.env.GITHUB_REF });

console.log(`Manual dispatch contract accepted: ${result.operation}.`);
