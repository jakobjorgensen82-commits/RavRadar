import { isDeepStrictEqual } from 'node:util';

import { ravScoreModelBinding as integratedModelBinding } from '../../js/core/ravscore-model-contract.js';
import {
  PRODUCTION_WORKFLOW_OUTCOME_SCHEMA,
  PRODUCTION_WORKFLOW_OUTCOME_STATUSES,
} from '../production-workflow-outcome.mjs';
import { PRODUCTION_WORKFLOW_SOURCES } from './production-workflow-sources.mjs';
import { ravScoreModelBinding as candidateGRollbackModelBinding } from '../rollback-assets/ravscore-model-contract.js';

export const RELEASE_CONTRACT_SCHEMA_VERSION = 'ravradar-release-contract-v1';
export const PRODUCTION_OUTCOME_SCHEMA_VERSION = PRODUCTION_WORKFLOW_OUTCOME_SCHEMA;
export const PRODUCTION_OUTCOME_TERMINALS = PRODUCTION_WORKFLOW_OUTCOME_STATUSES;

export const RELEASE_CONTRACT_DOCUMENTATION = Object.freeze({
  handbooks: Object.freeze({
    markdown: 'HANDBOOK-RAVRADAR.md',
    web: 'docs/handbook/content.json',
    installationCopy: 'supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql',
  }),
  producerConsumerMatrix:
    'docs/research/RAVSCORE_INTEGRATED_PRODUCER_CONSUMER_MATRIX_2026-08-29.md',
  decisionReferences: Object.freeze([
    Object.freeze({
      id: 'DEC-0102',
      path: 'docs/rdks/10_DECISIONS/DEC-0102-INTEGRATED-NEXT-GENERATION-RAVSCORE.md',
    }),
    Object.freeze({
      id: 'DEC-0110',
      path: 'docs/rdks/10_DECISIONS/DEC-0110-RAVSCORE-INTEGRATED-COASTAL-PROCESS-MODEL.md',
    }),
    Object.freeze({
      id: 'DEC-0112',
      path: 'docs/rdks/10_DECISIONS/DEC-0112-OPTIONAL-PUBLIC-FALLBACK-AND-HISTORY-INCOMPLETE-SCORING.md',
    }),
    Object.freeze({
      id: 'DEC-0113',
      path: 'docs/rdks/10_DECISIONS/DEC-0113-FIRST-CUTOVER-ATTESTED-MEASURED-COLD-START.md',
    }),
  ]),
});

const deepFreeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};

function assertReleaseVersion(releaseVersion) {
  if (!/^\d+\.\d+\.\d+$/.test(releaseVersion || '')) {
    throw new Error('Release contract requires a canonical semantic releaseVersion');
  }
}

function exactWorkflowSources(workflowSources) {
  const expectedKeys = ['build', 'deploy', 'orchestrator'];
  if (!workflowSources || typeof workflowSources !== 'object' || Array.isArray(workflowSources)) {
    throw new Error('Release contract workflow sources are missing');
  }
  const actualKeys = Object.keys(workflowSources).sort();
  if (!isDeepStrictEqual(actualKeys, expectedKeys)) {
    throw new Error('Release contract workflow sources have an incompatible exact key set');
  }
  for (const key of expectedKeys) {
    if (typeof workflowSources[key] !== 'string' || !workflowSources[key].startsWith('.github/workflows/')) {
      throw new Error(`Release contract workflow source ${key} is invalid`);
    }
  }
  return {
    orchestrator: workflowSources.orchestrator,
    build: workflowSources.build,
    deploy: workflowSources.deploy,
  };
}

export function buildReleaseContractMetadata({
  releaseVersion,
  workflowSources = PRODUCTION_WORKFLOW_SOURCES,
} = {}) {
  assertReleaseVersion(releaseVersion);
  return deepFreeze({
    schemaVersion: RELEASE_CONTRACT_SCHEMA_VERSION,
    releaseVersion,
    modelBindings: {
      integrated: { ...integratedModelBinding() },
      candidateGRollback: { ...candidateGRollbackModelBinding() },
    },
    publicManifestAuthority: {
      path: 'data/live/manifest.json',
      modelBindingJsonPointer: '/ravScoreModelBinding',
    },
    workflowRoles: exactWorkflowSources(workflowSources),
    productionOutcome: {
      schemaVersion: PRODUCTION_OUTCOME_SCHEMA_VERSION,
      terminals: [...PRODUCTION_OUTCOME_TERMINALS],
    },
    documentation: {
      handbooks: { ...RELEASE_CONTRACT_DOCUMENTATION.handbooks },
      producerConsumerMatrix: RELEASE_CONTRACT_DOCUMENTATION.producerConsumerMatrix,
      decisionReferences: RELEASE_CONTRACT_DOCUMENTATION.decisionReferences
        .map(reference => ({ ...reference })),
    },
    privatePayloadIncluded: false,
  });
}

export function assertReleaseContractMetadata(value, {
  releaseVersion,
  workflowSources = PRODUCTION_WORKFLOW_SOURCES,
} = {}) {
  const expected = buildReleaseContractMetadata({ releaseVersion, workflowSources });
  if (!isDeepStrictEqual(value, expected)) {
    throw new Error('Release contract metadata is stale or structurally incompatible');
  }
  return true;
}
