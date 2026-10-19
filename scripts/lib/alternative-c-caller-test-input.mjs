// TEST INPUT ONLY. Reverse precisely the new C caller hunks before old oracles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { inverseArchivedWeatherRestartUpdater } from './archived-weather-restart-updater-test-input.mjs';
const SOURCE_INPUTS=[
  {
    "path": "scripts/plan-ravscore-current-history.mjs",
    "before": {
      "sha256": "667b05b88a7cb3734507baccaa3bfa4e1fdd1214ea0ca076027dcbbae03d65d1",
      "bytes": 50463
    },
    "after": {
      "bytes": 52332,
      "sha256": "f9c0f19126785fcaedde569643e368913edb6e25b8a51d32ac11a4f1584d3e20"
    },
    "hunks": [
      [
        "import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';",
        "import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';\nimport { CURRENT_FAMILY_COLD_START_CONTEXT_ENV,\n  loadCurrentFamilyColdStartForTarget, currentFamilyColdStartScoreInputs,\n  currentFamilyColdStartRawRetention } from './current-family-cold-start.mjs';"
      ],
      [
        "  const checkpointOnly = environmentBoolean('CHECKPOINT_ONLY');",
        "  const checkpointOnly = environmentBoolean('CHECKPOINT_ONLY');\n  const coldPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path];\n  const coldSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];\n  const coldRequested = coldPath !== undefined || coldSha256 !== undefined;\n  if (coldRequested && (!coldPath || !coldSha256 || epochRequested || checkpointOnly\n    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {\n    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');\n  }"
      ],
      [
        "  const activation = await readFixed(SOURCE_PATHS.activation, true);\n  const activationPairs = epochView !== null ? {}",
        "  const currentFamilyColdStart = coldRequested\n    ? await loadCurrentFamilyColdStartForTarget({ contextPath: coldPath,\n      contextSha256: coldSha256, targetReferenceAt: productionReferenceAt }) : null;\n  const coldInputs = currentFamilyColdStart === null ? null\n    : currentFamilyColdStartScoreInputs(currentFamilyColdStart,\n      { registry: registry.json, targetReferenceAt: productionReferenceAt });\n  const activation = await readFixed(SOURCE_PATHS.activation, true);\n  const activationPairs = coldInputs !== null ? coldInputs.pointStateInjections\n    : epochView !== null ? {}"
      ],
      [
        "  const checkpoint = epochView !== null ? {",
        "  const checkpoint = coldInputs !== null ? {\n    loaded: false, continuationAvailable: false, states: coldInputs.checkpointStates,\n    candidateGRollbackStates: coldInputs.checkpointCandidateGRollbackStates,\n  } : epochView !== null ? {"
      ],
      [
        "  if (epochView === null && (checkpoint.loaded !== Boolean(checkpointFile)",
        "  if (epochView === null && coldInputs === null && (checkpoint.loaded !== Boolean(checkpointFile)"
      ],
      [
        "    registry: registry.json, conditions: epochView?.plannerConditions ?? conditions,",
        "    registry: registry.json, conditions: coldInputs !== null\n      ? { ...conditions, coastalParts: coldInputs.previousCoastalParts }\n      : epochView?.plannerConditions ?? conditions,"
      ],
      [
        "    stateLessRecovery: epochView?.stateLessRecovery ?? stateLessRecovery,",
        "    stateLessRecovery: coldInputs?.stateLessRecovery ?? epochView?.stateLessRecovery ?? stateLessRecovery,"
      ],
      [
        "  if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {",
        "  if (currentFamilyColdStart !== null) {\n    // This separate eviction policy is minted by the real archive capability;\n    // it never describes OLD committed S dependencies as an empty ordinary set.\n    demand.schemaVersion = 2;\n    demand.rawRetention = currentFamilyColdStartRawRetention(currentFamilyColdStart,\n      { registry: registry.json, targetReferenceAt: productionReferenceAt });\n  } else if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {"
      ]
    ]
  },
  {
    "path": "scripts/update-weather.mjs",
    "before": {
      "sha256": "06892b9200406b2529430a4227d18a36fc8438b334a1ff0c303f42b4503a0c6d",
      "bytes": 235913
    },
    "after": {
      "bytes": 239377,
      "sha256": "039ac65c779fe3eb8dbc870c00b0af30b33f9333c7cd542492ee40595c6eac77"
    },
    "hunks": [
      [
        "import { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';",
        "import { CURRENT_FAMILY_COLD_START_CONTEXT_ENV,\n  loadCurrentFamilyColdStartForTarget, currentFamilyColdStartScoreInputs,\n  currentFamilyColdStartAcquisitionChoices, currentFamilyColdStartScalarRecord }\n  from './current-family-cold-start.mjs';\nimport { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';"
      ],
      [
        "  establishedNativeCurrentOrigin = null,\n) {",
        "  establishedNativeCurrentOrigin = null,\n  currentFamilyColdStart = null,\n) {"
      ],
      [
        "  const calculationBootstrapMode = stateEpochView !== null\n    ? stateEpochView.candidateGBootstrapMode : RAVSCORE_EFFECTIVE_FIRST_CUTOVER_BOOTSTRAP_MODE;\n  const calculationSourceValidated = stateEpochView !== null\n    ? stateEpochView.candidateGSourceValidated : RAVSCORE_EFFECTIVE_FIRST_CUTOVER_SOURCE_VALIDATED;",
        "  const coldInputs = currentFamilyColdStart === null ? null\n    : currentFamilyColdStartScoreInputs(currentFamilyColdStart,\n      { registry: contract, targetReferenceAt: generatedAt });\n  if (coldInputs !== null) {\n    if (stateEpochView !== null || historicalWaveInputTransition !== null) {\n      throw new Error('CURRENT_FAMILY_COLD_START_TRANSITION_COLLISION');\n    }\n    previousCoastalParts = coldInputs.previousCoastalParts;\n    previousCandidateGRollbackRuntime = coldInputs.previousCandidateGRollbackRuntime;\n    pointStateInjections = coldInputs.pointStateInjections;\n    checkpointStates = coldInputs.checkpointStates;\n    checkpointCandidateGRollbackStates = coldInputs.checkpointCandidateGRollbackStates;\n    deployedBulkCache = coldInputs.deployedBulkCache;\n    historicalDmiBulkCache = coldInputs.historicalDmiBulkCache;\n    persistedDmiPartRows = coldInputs.persistedDmiPartRows;\n    previousCurrentSourceDomainTransitions = coldInputs.previousCurrentSourceDomainTransitions;\n    establishedNativeCurrentOrigin = coldInputs.establishedNativeCurrentOrigin;\n  }\n  const calculationBootstrapMode = coldInputs?.candidateGBootstrapMode ?? (stateEpochView !== null\n    ? stateEpochView.candidateGBootstrapMode : RAVSCORE_EFFECTIVE_FIRST_CUTOVER_BOOTSTRAP_MODE);\n  const calculationSourceValidated = coldInputs?.candidateGSourceValidated ?? (stateEpochView !== null\n    ? stateEpochView.candidateGSourceValidated : RAVSCORE_EFFECTIVE_FIRST_CUTOVER_SOURCE_VALIDATED);"
      ],
      [
        "const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));",
        "const coldPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path];\nconst coldSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];\nconst coldRequested = coldPath !== undefined || coldSha256 !== undefined;\nif (coldRequested && (!coldPath || !coldSha256\n  || ![undefined, 'false'].includes(process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP)\n  || ![undefined, 'false'].includes(process.env.CHECKPOINT_ONLY)\n  || process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE !== 'true'\n  || process.env.RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION\n  || RAVSCORE_HISTORICAL_WAVE_TRANSITION_PATH\n  || RAVSCORE_STATELESS_INTEGRATED_COLD_START_ALLOWED\n  || RAVSCORE_FIRST_CUTOVER_SOURCE_VALIDATED\n  || RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODE !== RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES.automatic)) {\n  throw new Error('CURRENT_FAMILY_COLD_START_MODE_COLLISION');\n}\nconst sleep = ms => new Promise(resolve => setTimeout(resolve, ms));"
      ],
      [
        "const stateEpochView = process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP === 'true'",
        "const currentFamilyColdStart = coldRequested\n  ? await loadCurrentFamilyColdStartForTarget({ contextPath: coldPath,\n    contextSha256: coldSha256, targetReferenceAt: generatedAt }) : null;\nconst coldInputs = currentFamilyColdStart === null ? null\n  : currentFamilyColdStartScoreInputs(currentFamilyColdStart,\n    { registry: coastalPartsContract, targetReferenceAt: generatedAt });\nif (currentFamilyColdStart !== null && path.resolve(DMI_BULK_CACHE_PATH)\n  !== currentFamilyColdStartAcquisitionChoices(currentFamilyColdStart).outputPath) {\n  throw new Error('CURRENT_FAMILY_COLD_START_ACQUISITION_OUTPUT_PATH');\n}\nconst stateEpochView = process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP === 'true'"
      ],
      [
        "const coastalPointStateInjections = stateEpochView !== null ? {}",
        "const coastalPointStateInjections = coldInputs !== null ? coldInputs.pointStateInjections\n  : stateEpochView !== null ? {}"
      ],
      [
        "const ravScoreCheckpoint = stateEpochView !== null ? {",
        "const ravScoreCheckpoint = coldInputs !== null ? {\n  loaded: false, continuationAvailable: false, states: coldInputs.checkpointStates,\n  candidateGRollbackStates: coldInputs.checkpointCandidateGRollbackStates,\n} : stateEpochView !== null ? {"
      ],
      [
        "if (stateEpochView !== null && historicalWaveInputTransition !== null) {",
        "if ((stateEpochView !== null || currentFamilyColdStart !== null) && historicalWaveInputTransition !== null) {"
      ],
      [
        "const previousPrivateCandidateGRuntime = stateEpochView !== null || historicalWaveInputTransition",
        "const previousPrivateCandidateGRuntime = coldInputs !== null || stateEpochView !== null || historicalWaveInputTransition"
      ],
      [
        "  if (stateEpochView !== null) {\n    weatherComponents.inputs.weatherStateEpochScalarPartRecords = new Map(",
        "  if (stateEpochView !== null || currentFamilyColdStart !== null) {\n    weatherComponents.inputs.weatherStateEpochScalarPartRecords = new Map("
      ],
      [
        "        const scalar = withoutCurrent(record);\n        for (const hour of scalar.hourly) {",
        "        const scalar = currentFamilyColdStart !== null\n          ? currentFamilyColdStartScalarRecord(currentFamilyColdStart, record) : withoutCurrent(record);\n        for (const hour of scalar.hourly) {"
      ],
      [
        "const establishedNativeCurrentOrigin = coastalPartsContract.enabled\n  ? await readEstablishedNativeCurrentOrigin(coastalPartsContract)\n  : null;",
        "const establishedNativeCurrentOrigin = coldInputs !== null\n  ? coldInputs.establishedNativeCurrentOrigin : coastalPartsContract.enabled\n    ? await readEstablishedNativeCurrentOrigin(coastalPartsContract) : null;"
      ],
      [
        "    stateEpochView,\n    establishedNativeCurrentOrigin,\n  )",
        "    stateEpochView,\n    establishedNativeCurrentOrigin,\n    currentFamilyColdStart,\n  )"
      ]
    ]
  }
];
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
export function inverseAlternativeCCaller(source,relative) {
  assert.equal(typeof source,'string');
  const row=SOURCE_INPUTS.find(item=>item.path===relative);
  assert(row,'ALTERNATIVE_C_TEST_INPUT_PATH');
  source=source.replaceAll('\r\n','\n');
  if(digest(source)===row.before.sha256) return source;
  if(relative==='scripts/update-weather.mjs') source=inverseArchivedWeatherRestartUpdater(source);
  assert.equal(digest(source),row.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED');
  for(const [before,after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'ALTERNATIVE_C_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(digest(source),row.before.sha256,'ALTERNATIVE_C_TEST_INPUT_WHOLE_INVERSE');
  return source;
}
