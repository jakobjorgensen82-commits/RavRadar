// TEST INPUT ONLY. Reverse precisely the new C caller hunks before old oracles.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { inverseArchivedWeatherRestartUpdater, inverseCurrentFamilyColdTargetTestInput,
  CURRENT_FAMILY_COLD_TARGET_TEST_REVIEW } from './archived-weather-restart-updater-test-input.mjs';
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
// TEST INPUT ONLY: exact CLI diagnostics inverse before unchanged old oracles.
const PLANNER_FIRST_FAILURE_REVIEW={
  "before": {
    "sha256": "f9c0f19126785fcaedde569643e368913edb6e25b8a51d32ac11a4f1584d3e20",
    "bytes": 52332
  },
  "after": {
    "sha256": "76f867902dbab4b462d3108e1e6ac992fe4c54203c4f7fbb93cfc9ff00d8eb7e",
    "bytes": 58585
  },
  "hunks": [
    [
      "import fs from 'node:fs/promises';\nimport path from 'node:path';\nimport os from 'node:os';\nimport { fileURLToPath } from 'node:url';\nimport { isDeepStrictEqual } from 'node:util';\nimport { assertRavScoreModelBinding, ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';\nimport { selectRavScoreProductionInitialState, ravScoreOwnerCurrentHistoryStartAt }\n  from './lib/ravscore-production-part-pipeline.mjs';\n",
      "import fs from 'node:fs/promises';\nimport path from 'node:path';\nimport os from 'node:os';\nimport { AssertionError } from 'node:assert';\nimport { fileURLToPath } from 'node:url';\nimport { isDeepStrictEqual, types } from 'node:util';\nimport { assertRavScoreModelBinding, ravScoreModelBinding } from '../js/core/ravscore-model-contract.js';\nimport { selectRavScoreProductionInitialState, ravScoreOwnerCurrentHistoryStartAt }\n  from './lib/ravscore-production-part-pipeline.mjs';\n"
    ],
    [
      "  currentFamilyColdStartRawRetention } from './current-family-cold-start.mjs';\n\nconst ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');\nconst HOUR = 3_600_000;\nconst SHA = /^sha256:[a-f0-9]{64}$/;\nconst hash = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;\n",
      "  currentFamilyColdStartRawRetention } from './current-family-cold-start.mjs';\n\nconst ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');\nconst BUILTIN_ERROR_STACK=Object.getOwnPropertyDescriptor(new Error(),'stack');\nconst BUILTIN_ERROR_PREPARE_STACK=Object.getOwnPropertyDescriptor(Error,'prepareStackTrace');\nconst CURRENT_HISTORY_FAILURE_PHASES=new Set(['INPUTS','BASELINE_FILES','PACKED_BASELINE','CHECKPOINT',\n  'DEMAND','COMMITTED_RAW_RETENTION','SAVE','UNKNOWN']);\nlet currentHistoryFailurePhase='INPUTS';\nconst HOUR = 3_600_000;\nconst SHA = /^sha256:[a-f0-9]{64}$/;\nconst hash = bytes => `sha256:${crypto.createHash('sha256').update(bytes).digest('hex')}`;\n"
    ],
    [
      "    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {\n    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');\n  }\n  const registry = await readFixed(SOURCE_PATHS.registry);\n  const baseline = await readFixed(SOURCE_PATHS.conditions, !baselineRequired);\n  const conditions = baseline?.json ?? { zones: {} };\n",
      "    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {\n    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');\n  }\n  currentHistoryFailurePhase='BASELINE_FILES';\n  const registry = await readFixed(SOURCE_PATHS.registry);\n  const baseline = await readFixed(SOURCE_PATHS.conditions, !baselineRequired);\n  const conditions = baseline?.json ?? { zones: {} };\n"
    ],
    [
      "  }\n  // The compact part states are not inside the compressed zone-hour arrays.\n  // Validate the existing lossless pack without materializing another hour copy.\n  assertPrivateConditionsHourly(conditions);\n  const epochView = epochRequested\n    ? await (await import('./weather-state-epoch.mjs')).loadInstalledWeatherStateEpochInputView({\n",
      "  }\n  // The compact part states are not inside the compressed zone-hour arrays.\n  // Validate the existing lossless pack without materializing another hour copy.\n  currentHistoryFailurePhase='PACKED_BASELINE';\n  assertPrivateConditionsHourly(conditions);\n  const epochView = epochRequested\n    ? await (await import('./weather-state-epoch.mjs')).loadInstalledWeatherStateEpochInputView({\n"
    ],
    [
      "    : activation ? assertCoastalPointActivationStateInjection(activation.json) : {};\n  // This is the SAME normal cache validator/compatible-reattest operation used\n  // by Weather. It may update only its usual cache checkpoint, never B/S.\n  const checkpoint = coldInputs !== null ? {\n    loaded: false, continuationAvailable: false, states: coldInputs.checkpointStates,\n    candidateGRollbackStates: coldInputs.checkpointCandidateGRollbackStates,\n",
      "    : activation ? assertCoastalPointActivationStateInjection(activation.json) : {};\n  // This is the SAME normal cache validator/compatible-reattest operation used\n  // by Weather. It may update only its usual cache checkpoint, never B/S.\n  currentHistoryFailurePhase='CHECKPOINT';\n  const checkpoint = coldInputs !== null ? {\n    loaded: false, continuationAvailable: false, states: coldInputs.checkpointStates,\n    candidateGRollbackStates: coldInputs.checkpointCandidateGRollbackStates,\n"
    ],
    [
      "  }\n  // The hash describes post-validation/normal-reattest cache bytes, not a new\n  // authentication token. The returned genuine states determine demand only.\n  const demand = buildRavScoreCurrentHistoryDemand({\n    registry: registry.json, conditions: coldInputs !== null\n      ? { ...conditions, coastalParts: coldInputs.previousCoastalParts }\n",
      "  }\n  // The hash describes post-validation/normal-reattest cache bytes, not a new\n  // authentication token. The returned genuine states determine demand only.\n  currentHistoryFailurePhase='DEMAND';\n  const demand = buildRavScoreCurrentHistoryDemand({\n    registry: registry.json, conditions: coldInputs !== null\n      ? { ...conditions, coastalParts: coldInputs.previousCoastalParts }\n"
    ],
    [
      "    demand.rawRetention = currentFamilyColdStartRawRetention(currentFamilyColdStart,\n      { registry: registry.json, targetReferenceAt: productionReferenceAt });\n  } else if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {\n    demand.schemaVersion = 2;\n    demand.rawRetention = await readCommittedRawCurrentRetention(registry.json, checkpointFile, productionReferenceAt);\n  }\n  // Existing private .cache only; no directory creation, original rewrite,\n  // provider operation, public artifact, checkpoint save or state promotion.\n  await fs.writeFile(path.join(ROOT, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH),\n    `${JSON.stringify(demand)}\\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });\n  console.log(JSON.stringify({ kind: demand.kind, partCount: demand.demands.length,\n    maximumSpanHours: Math.max(...demand.demands.map(row =>\n      (Date.parse(row.endAt) - Date.parse(row.startAt)) / HOUR)) }));\n}\nif (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {\n  main().catch(error => { console.error(error.code ?? 'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'); process.exitCode = 1; });\n}\n",
      "    demand.rawRetention = currentFamilyColdStartRawRetention(currentFamilyColdStart,\n      { registry: registry.json, targetReferenceAt: productionReferenceAt });\n  } else if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {\n    currentHistoryFailurePhase='COMMITTED_RAW_RETENTION';\n    demand.schemaVersion = 2;\n    demand.rawRetention = await readCommittedRawCurrentRetention(registry.json, checkpointFile, productionReferenceAt);\n  }\n  // Existing private .cache only; no directory creation, original rewrite,\n  // provider operation, public artifact, checkpoint save or state promotion.\n  currentHistoryFailurePhase='SAVE';\n  await fs.writeFile(path.join(ROOT, RAVSCORE_CURRENT_HISTORY_DEMAND_PATH),\n    `${JSON.stringify(demand)}\\n`, { encoding: 'utf8', flag: 'wx', mode: 0o600 });\n  console.log(JSON.stringify({ kind: demand.kind, partCount: demand.demands.length,\n    maximumSpanHours: Math.max(...demand.demands.map(row =>\n      (Date.parse(row.endAt) - Date.parse(row.startAt)) / HOUR)) }));\n}\n\n// CLI observation only. Never expose messages, assertion values or raw stacks,\n// and never change the original stop, state, inputs or selected sources.\nexport async function describeRavScoreCurrentHistoryFailure(error,phase='UNKNOWN') {\n  const result={kind:'RAVSCORE_CURRENT_HISTORY_FIRST_FAILURE',code:'RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED',\n    phase:CURRENT_HISTORY_FAILURE_PHASES.has(phase)?phase:'UNKNOWN',\n    exceptionType:'UNKNOWN',operator:null,frame:null,privatePayloadIncluded:false};\n  try{\n    if(types.isProxy(error)||!types.isNativeError(error))return result;\n    const prototype=Object.getPrototypeOf(error);\n    result.exceptionType=new Map([[Error.prototype,'ERROR'],[AssertionError.prototype,'ASSERTION_ERROR'],\n      [TypeError.prototype,'TYPE_ERROR'],[RangeError.prototype,'RANGE_ERROR'],[SyntaxError.prototype,'SYNTAX_ERROR'],\n      [ReferenceError.prototype,'REFERENCE_ERROR']]).get(prototype)??'UNKNOWN';\n    if(result.exceptionType==='UNKNOWN')return result;\n    const message=Object.getOwnPropertyDescriptor(error,'message');\n    const name=Object.getOwnPropertyDescriptor(error,'name')??Object.getOwnPropertyDescriptor(prototype,'name');\n    // Node22 can format its lazy data stack during descriptor collection too.\n    // Inspect only safe descriptors before either runtime can format anything.\n    if(!isDeepStrictEqual(Object.getOwnPropertyDescriptor(Error,'prepareStackTrace'),BUILTIN_ERROR_PREPARE_STACK)\n      ||!message||!Object.hasOwn(message,'value')||typeof message.value!=='string'\n      ||!name||!Object.hasOwn(name,'value')||typeof name.value!=='string')return result;\n    const own=Object.getOwnPropertyDescriptors(error),data=key=>own[key]&&Object.hasOwn(own[key],'value')?own[key].value:undefined;\n    const reasons=new Set(['ARGUMENTS_INVALID','BASELINE_INVALID','BASELINE_REQUIRED','CHECKPOINT_CHANGED','CHECKPOINT_INVALID',\n      'CURRENT_FAMILY_COLD_START_MODE_COLLISION','ENVELOPE_INVALID','ENVIRONMENT_INVALID','IDENTITY_INVALID',\n      'LEGACY_CAPTURE_UNAVAILABLE','LEGACY_CONTEXT_UNAVAILABLE','LEGACY_DEMAND_INVALID','LEGACY_DONOR_INVALID',\n      'LEGACY_EXISTING_ORIGINAL_UNAVAILABLE','LEGACY_HOLD_SUPPORT_UNAVAILABLE','LEGACY_INPUTS_INVALID',\n      'LEGACY_NEW_ENDPOINT_UNAVAILABLE','LEGACY_PLAN_BOUND','LEGACY_PROCESSING_CONTEXT_UNAVAILABLE','LEGACY_SELECTED_ENDPOINT_UNAVAILABLE',\n      'MODE_INVALID','NON_INTEGRATED_ROUTE','NONCANONICAL_TIME','RANGE_INVALID','REGISTRY_INVALID','REGISTRY_INVENTORY_MISMATCH',\n      'RETENTION_B_CHANGED','RETENTION_B_PATH','RETENTION_B_S_DIFFER','RETENTION_BOUND','RETENTION_CAPTURE_REQUIRED',\n      'RETENTION_COMMITTED_STATE_REQUIRED','RETENTION_DONOR_INVALID','RETENTION_INPUT_INVALID','RETENTION_INVENTORY',\n      'RETENTION_NATIVE_INVALID','RETENTION_NATIVE_REQUIRED','STATE_SOURCE_MISMATCH','STATE_TIME_INVALID','TARGET_REQUIRED']);\n    const code=data('code'),prefix='RAVSCORE_CURRENT_HISTORY_DEMAND_';\n    if(typeof code==='string'&&code.startsWith(prefix)&&reasons.has(code.slice(prefix.length)))result.code=code;\n    else if(['ERR_ASSERTION','ENOENT','EEXIST','EACCES','EPERM','EIO','ENOSPC','ENOMEM'].includes(code))result.code=code;\n    const operator=data('operator');\n    if(['strictEqual','deepStrictEqual','equal','deepEqual','ok','match','throws','rejects'].includes(operator))result.operator=operator;\n    let stack=data('stack');\n    // Node24 exposes the VM's own stack accessor rather than a data property.\n    // Never invoke a caller getter or a replaced formatter to recover a frame.\n    if(stack===undefined&&own.stack?.get===BUILTIN_ERROR_STACK?.get&&own.stack?.get!==undefined){\n      if(Reflect.ownKeys(own).some(key=>!Object.hasOwn(own[key],'value')\n        &&!(key==='stack'&&own.stack.get===BUILTIN_ERROR_STACK.get&&own.stack.set===BUILTIN_ERROR_STACK.set)))return result;\n      stack=Reflect.apply(BUILTIN_ERROR_STACK.get,error,[]);\n    }\n    if(typeof stack!=='string'||stack.length>2*1024*1024)return result;\n    for(const line of stack.split(/\\r?\\n/)){\n      const match=/^\\s+at (?:[^\\r\\n()]* \\()?((?:file:\\/\\/\\/)[^\\r\\n()]+):(\\d+):(\\d+)\\)?$/.exec(line);\n      if(!match)continue;\n      try{\n        const url=new URL(match[1]);if(url.host||url.search||url.hash)continue;\n        const file=fileURLToPath(url),relative=path.relative(ROOT,file).split(path.sep).join('/');\n        if(!/^(?:scripts|js\\/core)\\/[A-Za-z0-9_./-]+\\.(?:mjs|js)$/.test(relative)\n          ||relative.split('/').includes('..')||await fs.realpath(file)!==file)continue;\n        const before=await fs.lstat(file,{bigint:true});\n        if(!before.isFile()||before.isSymbolicLink()||before.nlink!==1n||before.size>2n*1024n*1024n)continue;\n        const body=await fs.readFile(file),after=await fs.lstat(file,{bigint:true});\n        if(!['dev','ino','size','mtimeNs','ctimeNs'].every(key=>before[key]===after[key])||BigInt(body.length)!==before.size)continue;\n        const at=Number(match[2]),column=Number(match[3]);\n        if(!Number.isSafeInteger(at)||at<1||at>body.toString('utf8').split(/\\r?\\n/).length\n          ||!Number.isSafeInteger(column)||column<1||column>100000)continue;\n        result.frame={module:relative,sha256:crypto.createHash('sha256').update(body).digest('hex'),line:at,column};break;\n      }catch{} // Unknown frame stays unknown; diagnostic I/O cannot replace the failure.\n    }\n  }catch{}\n  return result;\n}\nexport async function reportRavScoreCurrentHistoryFailure(error){\n  try{console.error(JSON.stringify(await describeRavScoreCurrentHistoryFailure(error,currentHistoryFailurePhase)));}\n  catch{try{console.error('RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED');}catch{}}\n  process.exitCode=1;\n}\nif (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {\n  main().catch(reportRavScoreCurrentHistoryFailure);\n}\n"
    ]
  ]
};
// TEST INPUT ONLY: preserve the exact earlier planner and all older oracles.
const PLANNER_ORIGINAL_DEPENDENCY_REVIEW={
  "before": {
    "sha256": "76f867902dbab4b462d3108e1e6ac992fe4c54203c4f7fbb93cfc9ff00d8eb7e",
    "bytes": 58585
  },
  "after": {
    "sha256": "b0027151541ac8fa3ae2ac99b1b0ef1bbfcd18e0e3be407d32b9704ecba552fb",
    "bytes": 59770
  },
  "hunks": [
    [
      "    const operator=data('operator');\n",
      "    const originalDependencyCode=data('originalDependencyCode');\n    const operator=data('operator');\n"
    ],
    [
      "        result.frame={module:relative,sha256:crypto.createHash('sha256').update(body).digest('hex'),line:at,column};break;\n",
      "        result.frame={module:relative,sha256:crypto.createHash('sha256').update(body).digest('hex'),line:at,column};\n        // This fixed diagnostic family is not replay/publication authority.\n        // A code attached to another error/frame is not its original failure.\n        const originalDependencyReasons=new Set(['CAPTURE_INCOMPLETE','HOLD_SUPPORT_REQUIRED',\n          'INITIAL_SELECTION_INVALID','INITIAL_STATE_INVALID','INPUT_BOUND','INPUT_INVALID','PLAN_BOUND',\n          'REGIONAL_SUPPORT_REQUIRED','SAMPLING_MISMATCH','SELECTED_CURRENT_INVALID',\n          'SELECTED_ENDPOINT_UNAVAILABLE','SOURCE_DOMAIN_EXCLUDED','WINDOW_INVALID']);\n        const originalPrefix='POST_H0_DMI_ORIGINAL_';\n        if(result.code==='RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'&&prototype===Error.prototype\n          &&typeof originalDependencyCode==='string'&&originalDependencyCode.startsWith(originalPrefix)\n          &&originalDependencyReasons.has(originalDependencyCode.slice(originalPrefix.length))\n          &&relative==='scripts/lib/post-h0-dmi-original-dependencies.mjs'\n          &&result.frame.sha256==='dcb3ff1d9caae7440e94201c391b0a9d0d6dbdc312d54281e1f47a7d017462da'\n          &&at===18)result.code=originalDependencyCode;\n        break;\n"
    ]
  ]
};
function inversePlannerOriginalDependency(source) {
  const review=PLANNER_ORIGINAL_DEPENDENCY_REVIEW;
  if([review.before.sha256,PLANNER_FIRST_FAILURE_REVIEW.before.sha256].includes(digest(source)))return source;
  assert.equal(digest(source),review.after.sha256,'PLANNER_ORIGINAL_DEPENDENCY_TEST_INPUT_CHANGED');
  assert.equal(Buffer.byteLength(source),review.after.bytes);
  for(const [before,after]of [...review.hunks].reverse()){
    assert.equal(source.split(after).length,2,'PLANNER_ORIGINAL_DEPENDENCY_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(digest(source),review.before.sha256,'PLANNER_ORIGINAL_DEPENDENCY_TEST_INPUT_WHOLE_INVERSE');
  assert.equal(Buffer.byteLength(source),review.before.bytes);
  return source;
}
function inversePlannerFirstFailure(source) {
  const review=PLANNER_FIRST_FAILURE_REVIEW;
  if(digest(source)===review.before.sha256) return source;
  assert.equal(digest(source),review.after.sha256,'PLANNER_FIRST_FAILURE_TEST_INPUT_CHANGED');
  assert.equal(Buffer.byteLength(source),review.after.bytes);
  for(const [before,after] of [...review.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'PLANNER_FIRST_FAILURE_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(digest(source),review.before.sha256,'PLANNER_FIRST_FAILURE_TEST_INPUT_WHOLE_INVERSE');
  assert.equal(Buffer.byteLength(source),review.before.bytes);
  return source;
}
// TEST INPUT ONLY: undo this exact diagnostic-only successor before old oracles.
const PLANNER_ENDPOINT_SUBREASON_REVIEW={
  "before": {
    "sha256": "b0027151541ac8fa3ae2ac99b1b0ef1bbfcd18e0e3be407d32b9704ecba552fb",
    "bytes": 59770
  },
  "after": {
    "sha256": "d462be0aaa0401fbf1d36f5a52b44d9dde2d31dd21d4a2b160ade406562c2276",
    "bytes": 60071
  },
  "hunks": [
    [
      "import { collectPostH0DmiOriginalDependencies } from './lib/post-h0-dmi-original-dependencies.mjs';",
      "import { collectPostH0DmiOriginalDependencies, POST_H0_DMI_ENDPOINT_DIAGNOSTICS } from './lib/post-h0-dmi-original-dependencies.mjs';"
    ],
    [
      "        const originalPrefix='POST_H0_DMI_ORIGINAL_';",
      "        const endpointDependencyReasons=new Set(POST_H0_DMI_ENDPOINT_DIAGNOSTICS);\n        const originalPrefix='POST_H0_DMI_ORIGINAL_';"
    ],
    [
      "          &&originalDependencyReasons.has(originalDependencyCode.slice(originalPrefix.length))",
      "          &&(originalDependencyReasons.has(originalDependencyCode.slice(originalPrefix.length))\n            ||endpointDependencyReasons.has(originalDependencyCode.slice(originalPrefix.length))\n              &&message.value==='POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_UNAVAILABLE')"
    ],
    [
      "          &&result.frame.sha256==='dcb3ff1d9caae7440e94201c391b0a9d0d6dbdc312d54281e1f47a7d017462da'",
      "          &&result.frame.sha256==='0db7833d68cad3c1ab60c86855bab6e90b1cbf40d8a2ad766da74609781ce6dc'"
    ]
  ]
};
function inversePlannerEndpointSubreason(source) {
  const review=PLANNER_ENDPOINT_SUBREASON_REVIEW;
  if(digest(source)===review.before.sha256)return source;
  assert.equal(digest(source),review.after.sha256,'PLANNER_ENDPOINT_SUBREASON_TEST_INPUT_CHANGED');
  assert.equal(Buffer.byteLength(source),review.after.bytes);
  for(const [before,after]of [...review.hunks].reverse()){
    assert.equal(source.split(after).length,2,'PLANNER_ENDPOINT_SUBREASON_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(digest(source),review.before.sha256,'PLANNER_ENDPOINT_SUBREASON_TEST_INPUT_WHOLE_INVERSE');
  assert.equal(Buffer.byteLength(source),review.before.bytes);
  return source;
}
// TEST INPUT ONLY: exact native-original consumer/source-controller inverse.
// Only historical source-oracle dispatch uses this; real core/B-S CLI inputs
// remain the actual unmodified source. No admission or runtime authority.
export const CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW = Object.freeze({
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_NATIVE_ORIGINAL_CONSUMER_INVERSE",
  "rows": [
    {
      "path": "scripts/plan-ravscore-current-history.mjs",
      "before": {
        "bytes": 60071,
        "sha256": "d462be0aaa0401fbf1d36f5a52b44d9dde2d31dd21d4a2b160ade406562c2276"
      },
      "after": {
        "bytes": 59484,
        "sha256": "e4d66bc22fb2c788ecf91d58ec2c96cf1eb910016fe64f3820c0b311f660872d"
      },
      "historicalPassThrough": [
        {
          "bytes": 52332,
          "sha256": "f9c0f19126785fcaedde569643e368913edb6e25b8a51d32ac11a4f1584d3e20"
        },
        {
          "bytes": 58585,
          "sha256": "76f867902dbab4b462d3108e1e6ac992fe4c54203c4f7fbb93cfc9ff00d8eb7e"
        },
        {
          "bytes": 59770,
          "sha256": "b0027151541ac8fa3ae2ac99b1b0ef1bbfcd18e0e3be407d32b9704ecba552fb"
        }
      ],
      "edits": [
        {
          "offset": 3066,
          "after": "import { readCurrentPrivateRuntimeCompanionInput, readAuthenticatedCurrentCompanions }\n  from './read-authenticated-dmi-current-companions.mjs';",
          "before": "import { verifyPrivateProductionRuntimeBundle } from './private-production-runtime-bundle.mjs';"
        },
        {
          "offset": 11615,
          "after": "  progressActive = null, historicalBulk = null, protectedCompanionContexts = [],\n  persistedHourlyByPart = new Map(), liveCurrentPilot = null, zones } = {}) {",
          "before": "  progressActive = null, historicalBulk = null, persistedHourlyByPart = new Map(), liveCurrentPilot = null, zones } = {}) {"
        },
        {
          "offset": 12470,
          "after": "    || !(persistedHourlyByPart instanceof Map) || !Array.isArray(protectedCompanionContexts)\n    || protectedCompanionContexts.length > 2) refuse('RETENTION_INPUT_INVALID');",
          "before": "    || !(persistedHourlyByPart instanceof Map)) refuse('RETENTION_INPUT_INVALID');"
        },
        {
          "offset": 13779,
          "after": "    const protectedContexts = [protectedBulk, historicalBulk];\n    const persisted = persistedHourlyByPart.get(part.partId);\n    const records = [];",
          "before": "    const protectedContexts = [protectedBulk, historicalBulk];\n    const records = [];"
        },
        {
          "offset": 14145,
          "after": "...(previous ? { persistedHourly: persisted?.hourly ?? [],",
          "before": "...(previous ? { persistedHourly: persistedHourlyByPart.get(part.partId)?.hourly ?? [],"
        },
        {
          "offset": 15269,
          "after": "      records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',\n        // Original B companions support only proof of the protected selection;\n        // they never become mapper inputs, new candidates or source priority.\n        nativeCurrentContexts: previous ? [...contexts, ...protectedCompanionContexts] : contexts,\n        ...(previous && persisted?.nativeCurrentOriginals != null\n          ? { nativeCurrentOriginals: persisted.nativeCurrentOriginals } : {}),\n        record: { ...record, hourly } });",
          "before": "      records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',\n        nativeCurrentContexts: contexts, record: { ...record, hourly } });"
        },
        {
          "offset": 18801,
          "after": "async function readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt) {\n  const { verified, conditions, conditionsPath: file, conditionsSha256, verify } =\n    await readCurrentPrivateRuntimeCompanionInput(productionReferenceAt);\n  if (!checkpointFile) refuse('RETENTION_B_CHANGED');\n",
          "before": "async function readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt) {\n  const privateRoot = process.env.RAVRADAR_PRIVATE_RUNTIME_ROOT;\n  const bundlePath = process.env.RAVRADAR_PRIVATE_RUNTIME_BUNDLE;\n  if (!path.isAbsolute(privateRoot ?? '') || !path.isAbsolute(bundlePath ?? '')\n    || path.dirname(bundlePath) !== privateRoot || !process.env.RUNNER_TEMP) refuse('RETENTION_B_PATH');\n  // Already authenticated CURRENT from the ordinary restore/reconcile, not a\n  // caller-supplied old manifest or newly calculated/local H0. No network here.\n  const descriptor = JSON.parse(await fs.readFile(path.join(process.env.RUNNER_TEMP,\n    'private-runtime-current-source.json'), 'utf8'));\n  const verify = () => verifyPrivateProductionRuntimeBundle({ privateRoot, bundlePath,\n    repositoryRoot: ROOT, expected: descriptor });\n  const verified = await verify();\n  if (verified.bundleContentSha256 !== descriptor.bundleContentSha256) refuse('RETENTION_B_CHANGED');\n  const file = path.join(bundlePath, 'payload/data/live/conditions.json');\n  const fileInfo = await fs.lstat(file);\n  if (!fileInfo.isFile() || fileInfo.isSymbolicLink() || fileInfo.size > 256 * 1024 * 1024) refuse('RETENTION_B_CHANGED');\n  const bytes = await fs.readFile(file);\n  const conditionsSha256 = hash(bytes).slice(7);\n  const listed = verified.files.find(row => row.relativePath === 'data/live/conditions.json');\n  if (!listed || listed.bytes !== bytes.length || listed.sha256 !== conditionsSha256 || !checkpointFile) refuse('RETENTION_B_CHANGED');\n  const conditions = JSON.parse(bytes.toString('utf8'));\n"
        },
        {
          "offset": 19642,
          "after": "  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, conditions);\n  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));",
          "before": "  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));"
        },
        {
          "offset": 21627,
          "after": "      historicalBulk, protectedCompanionContexts, persistedHourlyByPart, liveCurrentPilot, zones });",
          "before": "      historicalBulk, persistedHourlyByPart, liveCurrentPilot, zones });"
        },
        {
          "offset": 58763,
          "after": "&&result.frame.sha256==='a49ea641f76af721c43a13a091aa102e0904a3730803859d7c5f5e29e7c516bc'",
          "before": "&&result.frame.sha256==='0db7833d68cad3c1ab60c86855bab6e90b1cbf40d8a2ad766da74609781ce6dc'"
        }
      ]
    },
    {
      "path": "scripts/lib/post-h0-dmi-original-dependencies.mjs",
      "before": {
        "bytes": 15137,
        "sha256": "0db7833d68cad3c1ab60c86855bab6e90b1cbf40d8a2ad766da74609781ce6dc"
      },
      "after": {
        "bytes": 15554,
        "sha256": "a49ea641f76af721c43a13a091aa102e0904a3730803859d7c5f5e29e7c516bc"
      },
      "historicalPassThrough": [],
      "edits": [
        {
          "offset": 2895,
          "after": "import { nativeCurrentOriginalBankForPart } from './ravscore-recovery-source-priority.mjs';\n\nfunction data(value, array = false) {",
          "before": "function data(value, array = false) {"
        },
        {
          "offset": 9349,
          "after": "    checkContexts(contexts, expected);\n    let previousBank;\n    try { previousBank = nativeCurrentOriginalBankForPart(source, part); }\n    catch { fail('INPUT_INVALID'); }\n    if (previousBank !== null) plainTree(previousBank, 0, { nodes: 0, bytes: 0,\n      maximumNodes: LIMIT.donorRowsPerPart * 256, maximumBytes: LIMIT.candidateBytesPerPart });\n    const inspector = createProtectedDmiNativeCurrentInspector({ contexts, previousBank });",
          "before": "    checkContexts(contexts, expected);\n    const inspector = createProtectedDmiNativeCurrentInspector({ contexts });"
        }
      ]
    }
  ]
});
export function inverseCurrentNativeOriginalConsumerTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_TYPE');
  const row = CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW.rows.find(value => value.path === relative);
  assert(row, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_PATH');
  const whole = digest(source), bytes = Buffer.byteLength(source);
  if ([row.before, ...row.historicalPassThrough].some(value => value.sha256 === whole && value.bytes === bytes)) return source;
  assert.equal(bytes, row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_AFTER_SIZE');
  assert.equal(whole, row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_AFTER_WHOLE');
  for (const edit of [...row.edits].reverse()) {
    assert.equal(source.slice(edit.offset, edit.offset + edit.after.length), edit.after,
      'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_HUNK');
    source = source.slice(0, edit.offset) + edit.before + source.slice(edit.offset + edit.after.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_CONSUMER_WHOLE_INVERSE');
  return source;
}

export function inverseAlternativeCCaller(source,relative) {
  assert.equal(typeof source,'string');
  const row=SOURCE_INPUTS.find(item=>item.path===relative);
  assert(row,'ALTERNATIVE_C_TEST_INPUT_PATH');
  source=source.replaceAll('\r\n','\n');
  if(digest(source)===row.before.sha256) return source;
  if(relative==='scripts/plan-ravscore-current-history.mjs') source=inverseNationalCoherentWorkTestInput(source, relative);
  if(relative==='scripts/plan-ravscore-current-history.mjs') source=inverseCurrent586SharedProjectionExportTestInput(source, relative);
  if(relative==='scripts/plan-ravscore-current-history.mjs') source=inverseCurrent586IdentityRefinementTestInput(source, relative);
  if(relative==='scripts/plan-ravscore-current-history.mjs') source=inverseCurrent586EndpointDiagnosticTestInput(source, relative);
  if(relative==='scripts/plan-ravscore-current-history.mjs') source=inversePlannerFirstFailure(inversePlannerOriginalDependency(inversePlannerEndpointSubreason(inverseCurrentNativeOriginalConsumerTestInput(source, relative))));
  if(relative==='scripts/update-weather.mjs') source=inverseArchivedWeatherRestartUpdater(source);
  assert.equal(digest(source),row.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED');
  for(const [before,after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'ALTERNATIVE_C_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(digest(source),row.before.sha256,'ALTERNATIVE_C_TEST_INPUT_WHOLE_INVERSE');
  return source;
}

// Additive exact inverse for the observational CURRENT586 diagnostic only.
// All earlier native-original rows, whole pins and mutations remain unchanged.
export const CURRENT586_ENDPOINT_DIAGNOSTIC_TEST_REVIEW = Object.freeze({
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_CURRENT586_ENDPOINT_DIAGNOSTIC_INVERSE",
  "path": "scripts/plan-ravscore-current-history.mjs",
  "before": {
    "bytes": 59484,
    "sha256": "e4d66bc22fb2c788ecf91d58ec2c96cf1eb910016fe64f3820c0b311f660872d"
  },
  "after": {
    "bytes": 73142,
    "sha256": "17b038d863620cccb86fce96c49109c6dba9a6c2cfa9966d883c7c675716ff76"
  },
  "edits": [
    {
      "offset": 1825,
      "before": "import { buildNewestValidRavScoreRecoverySources } from './lib/ravscore-recovery-source-priority.mjs';\n",
      "after": "import { buildNewestValidRavScoreRecoverySources, nativeCurrentOriginalBankForPart } from './lib/ravscore-recovery-source-priority.mjs';\n"
    },
    {
      "offset": 2158,
      "before": "import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling } from './lib/dmi-forecast-store.mjs';\n",
      "after": "import { inspectDmiForecastGridSampling, inspectDmiNativeGridSampling, sameNativeIdentity } from './lib/dmi-forecast-store.mjs';\n"
    },
    {
      "offset": 11347,
      "before": "// Retention only: normal immutable-B verification and actual S parity happen\n// in the fixed caller below. This pure projection never authenticates/admit rows.\nexport function buildRavScoreRawCurrentRetention({ registry, conditions, checkpoint,\n  productionReferenceAt, boundary, protectedBulk, progressCandidate = null,\n  progressActive = null, historicalBulk = null, protectedCompanionContexts = [],\n  persistedHourlyByPart = new Map(), liveCurrentPilot = null, zones } = {}) {\n  const target = exactHour(productionReferenceAt), captures = new Map();\n",
      "after": "function assertCommittedRawRetentionInputs({ registry, conditions, checkpoint, boundary,\n  zones, persistedHourlyByPart, protectedCompanionContexts }) {\n"
    },
    {
      "offset": 12297,
      "before": "",
      "after": "}\n\n// One private per-PART source projection, shared by ordinary retention and the\n// fixed observational diagnostic. No callback, route override or proof admission.\nfunction projectCommittedRawRetentionPart({ part, expected, target, conditions, checkpoint, boundary,\n  zones, protectedBulk, progressCandidate, historicalBulk, protectedCompanionContexts,\n  persistedHourlyByPart, liveCurrentPilot }) {\n  const selected = selectRavScoreProductionInitialState({ part,\n    existingPart: conditions.coastalParts.parts[part.partId], targetReferenceAt: target });\n  // Never release an OLD point's dependencies by a local point/cold rewrite.\n  // A changed context must first use a separately reviewed normal transition.\n  if (selected.source !== 'EXISTING_INTEGRATED' || selected.state.time !== boundary.productionReferenceAt\n    || !isDeepStrictEqual(selected.state, checkpoint.states[part.partId])) {\n    refuse('RETENTION_COMMITTED_STATE_REQUIRED');\n  }\n  const startAt = ravScoreOwnerCurrentHistoryStartAt(part, selected.state,\n    ravScoreRecoverySourceStartAt(selected.state, target), { requireNativeGridSampling: true });\n  const feature = { properties: localPartRuntimeProperties(\n    zones.features.find(row => row?.properties?.id === part.zoneId)?.properties ?? {}, part, expected.entityId) };\n  const protectedContexts = [protectedBulk, historicalBulk];\n  const persisted = persistedHourlyByPart.get(part.partId);\n  const records = [];\n  for (const [document, previous] of [[protectedBulk, true], [progressCandidate, false]]) {\n    let record = buildPrivateDmiRecoveryRecord(feature, document, target, { startAt, expectedIdentity: expected,\n      ...(previous ? { persistedHourly: persisted?.hourly ?? [],\n        historicalBulkCache: historicalBulk, protectPreviousDmi: true } : {}) });\n    if (!record) { records.push(null); continue; }\n    const contexts = previous ? protectedContexts : [document];\n    record = mergeProtectedLiveCurrentPilotIntoRecord(record, part, liveCurrentPilot, {\n      currentContexts: contexts, bulkId: expected.entityId, productionReferenceAt: target,\n      includePrivateNativeCadenceReferences: true,\n      primaryCurrentVerified: hour => previous ? Boolean(originalContextForProtectedDmiCurrent(\n        hour, contexts, expected.entityId, part)) : Boolean(verifiedBulkCurrent(document,\n          document?.zones?.[expected.entityId], part.waterPoint, hour?.sources?.current, hour?.time, expected)),\n    });\n    const hourly = previous ? verifiedProtectedDmiPartHourly(record, contexts, expected.entityId, part,\n      { requireNativeGridSampling: false, liveCurrentPilot }) : verifiedIntegratedPartHourly(record,\n        document, expected.entityId, part, { requireNativeGridSampling: false, liveCurrentPilot });\n    records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',\n      // Original B companions support only proof of the protected selection;\n      // they never become mapper inputs, new candidates or source priority.\n      nativeCurrentContexts: previous ? [...contexts, ...protectedCompanionContexts] : contexts,\n      ...(previous && persisted?.nativeCurrentOriginals != null\n        ? { nativeCurrentOriginals: persisted.nativeCurrentOriginals } : {}),\n      record: { ...record, hourly } });\n  }\n  const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource: records[0],\n    preferredSource: records[1], protectedPreviousSource: records[0], productionReferenceAt: target, part });\n  return { selected, recoverySources };\n}\n\n// Retention only: normal immutable-B verification and actual S parity happen\n// in the fixed caller below. This pure projection never authenticates/admit rows.\nexport function buildRavScoreRawCurrentRetention({ registry, conditions, checkpoint,\n  productionReferenceAt, boundary, protectedBulk, progressCandidate = null,\n  progressActive = null, historicalBulk = null, protectedCompanionContexts = [],\n  persistedHourlyByPart = new Map(), liveCurrentPilot = null, zones } = {}) {\n  const target = exactHour(productionReferenceAt), captures = new Map();\n  assertCommittedRawRetentionInputs({ registry, conditions, checkpoint, boundary,\n    zones, persistedHourlyByPart, protectedCompanionContexts });\n"
    },
    {
      "offset": 16732,
      "before": "    const selected = selectRavScoreProductionInitialState({ part,\n      existingPart: conditions.coastalParts.parts[part.partId], targetReferenceAt: target });\n    // Never release an OLD point's dependencies by a local point/cold rewrite.\n    // A changed context must first use a separately reviewed normal transition.\n    if (selected.source !== 'EXISTING_INTEGRATED' || selected.state.time !== boundary.productionReferenceAt\n      || !isDeepStrictEqual(selected.state, checkpoint.states[part.partId])) {\n      refuse('RETENTION_COMMITTED_STATE_REQUIRED');\n    }\n",
      "after": "    const { selected, recoverySources } = projectCommittedRawRetentionPart({\n      part, expected, target, conditions, checkpoint, boundary, zones, protectedBulk, progressCandidate,\n      historicalBulk, protectedCompanionContexts, persistedHourlyByPart, liveCurrentPilot });\n"
    },
    {
      "offset": 17025,
      "before": "    const startAt = ravScoreOwnerCurrentHistoryStartAt(part, selected.state,\n      ravScoreRecoverySourceStartAt(selected.state, target), { requireNativeGridSampling: true });\n    const feature = { properties: localPartRuntimeProperties(\n      zones.features.find(row => row?.properties?.id === zoneId)?.properties ?? {}, part, expected.entityId) };\n    const protectedContexts = [protectedBulk, historicalBulk];\n    const persisted = persistedHourlyByPart.get(part.partId);\n    const records = [];\n    for (const [document, previous] of [[protectedBulk, true], [progressCandidate, false]]) {\n      let record = buildPrivateDmiRecoveryRecord(feature, document, target, { startAt, expectedIdentity: expected,\n        ...(previous ? { persistedHourly: persisted?.hourly ?? [],\n          historicalBulkCache: historicalBulk, protectPreviousDmi: true } : {}) });\n      if (!record) { records.push(null); continue; }\n      const contexts = previous ? protectedContexts : [document];\n      record = mergeProtectedLiveCurrentPilotIntoRecord(record, part, liveCurrentPilot, {\n        currentContexts: contexts, bulkId: expected.entityId, productionReferenceAt: target,\n        includePrivateNativeCadenceReferences: true,\n        primaryCurrentVerified: hour => previous ? Boolean(originalContextForProtectedDmiCurrent(\n          hour, contexts, expected.entityId, part)) : Boolean(verifiedBulkCurrent(document,\n            document?.zones?.[expected.entityId], part.waterPoint, hour?.sources?.current, hour?.time, expected)),\n      });\n      const hourly = previous ? verifiedProtectedDmiPartHourly(record, contexts, expected.entityId, part,\n        { requireNativeGridSampling: false, liveCurrentPilot }) : verifiedIntegratedPartHourly(record,\n          document, expected.entityId, part, { requireNativeGridSampling: false, liveCurrentPilot });\n      records.push({ source: previous ? 'deployed-private-runtime' : 'progressive-private-dmi',\n        // Original B companions support only proof of the protected selection;\n        // they never become mapper inputs, new candidates or source priority.\n        nativeCurrentContexts: previous ? [...contexts, ...protectedCompanionContexts] : contexts,\n        ...(previous && persisted?.nativeCurrentOriginals != null\n          ? { nativeCurrentOriginals: persisted.nativeCurrentOriginals } : {}),\n        record: { ...record, hourly } });\n    }\n    const recoverySources = buildNewestValidRavScoreRecoverySources({ fallbackSource: records[0],\n      preferredSource: records[1], protectedPreviousSource: records[0], productionReferenceAt: target, part });\n",
      "after": ""
    },
    {
      "offset": 19799,
      "before": "",
      "after": "// Fixed observational follow-up to the ordinary 39666991481/1 failure.\n// This entry cannot change the ordinary source projection or return evidence,\n// captures, selected rows, state, identities or an admission capability.\nexport function diagnoseCurrent586SelectedEndpoints(options = {}) {\n  const { registry, conditions, checkpoint, boundary, zones, protectedBulk,\n    progressCandidate = null, progressActive = null, historicalBulk = null,\n    protectedCompanionContexts = [], persistedHourlyByPart = new Map(), liveCurrentPilot = null } = options;\n  const target = exactHour(options.productionReferenceAt);\n  if (target !== '2026-10-21T20:00:00.000Z') refuse('FIXED_ENDPOINT_DIAGNOSTIC_SCOPE');\n  assertCommittedRawRetentionInputs({ registry, conditions, checkpoint, boundary,\n    zones, persistedHourlyByPart, protectedCompanionContexts });\n  if (!Number.isSafeInteger(registry.partCount) || registry.partCount < 1 || registry.partCount > 673) {\n    refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');\n  }\n  const roleNames = ['deployed-private-runtime', 'progressive-private-dmi'];\n  const scopeCounts = () => ({ selectionsProved: 0, selectionsRejected: 0,\n    nativeStepsRequested: 0, exactNativeStepsFound: 0, endpointProbeRejected: 0 });\n  const roleCounts = () => ({ partsPresent: 0, originalWrapperAbsent: 0,\n    originalBankExplicitNull: 0, originalBankPresent: 0, directForwardRows: 0,\n    unknownSamplingRows: 0, coherentSamplingRows: 0, invalidSamplingRows: 0,\n    firstNativeEndpointMissingParts: 0,\n    own: scopeCounts(), bank: scopeCounts(), companions: scopeCounts(), all: scopeCounts(),\n    contextMismatch: { timeNotObserved: 0, onlyDerivedNativeAtTime: 0,\n      nativeValidationRejected: 0, identityMismatch: 0, samplingPresenceMismatch: 0,\n      stepFieldsMismatch: 0, exactNativeObserved: 0 } });\n  const result = { schemaVersion: 1, kind: 'CURRENT586_SELECTED_ENDPOINT_DIAGNOSTIC',\n    fixedScope: 'CURRENT586_ENDPOINTS_39666991481_1',\n    geometryScope: 'AUTHENTICATED_ORIGINAL_B_PARTS_ONLY',\n    selectionScope: 'NORMAL_PRIORITY_PROJECTED_CANDIDATES_NOT_FINAL_REPLAY_UNION',\n    scope: 'FIRST_NORMAL_COLLECTOR_FAILURE_ONLY', visitedParts: 0, normalCollectorCompletedParts: 0, normalCollectorEndpointMissingParts: 0,\n    normalCollectorOtherRefusedParts: 0, firstMissingRoleNotLocatedParts: 0,\n    roles: Object.fromEntries(roleNames.map(role => [role, roleCounts()])),\n    sourcePriorityChanged: false, nativeAdmissionPerformed: false, rawVectorsIncluded: false,\n    identityIncluded: false, actualSParityProved: false, providerRequestsPerformed: false,\n    firstFailureCategory: 'NO_NORMAL_COLLECTOR_REFUSAL', firstFailureCode: null };\n  const begun = Date.now();\n  for (const [zoneId, entries] of Object.entries(registry.zones)) for (const entry of entries) {\n    if (Date.now() - begun > 600_000 || result.visitedParts >= 673) refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');\n    const part = { ...entry, zoneId }, expected = dmiExpectedIdentityForPart(part);\n    const { selected, recoverySources } = projectCommittedRawRetentionPart({\n      part, expected, target, conditions, checkpoint, boundary, zones, protectedBulk,\n      progressCandidate, historicalBulk, protectedCompanionContexts, persistedHourlyByPart, liveCurrentPilot });\n    result.visitedParts++;\n    let nativeEndpointMissing = false;\n    try {\n      // Exact unchanged normal collector; no evidence/admission is returned.\n      collectPostH0DmiOriginalDependencies({ part, initialSelection: selected,\n        targetReferenceAt: target, recoverySources, liveCurrentPilot });\n      result.normalCollectorCompletedParts++;\n      continue; // Observe only the first refusal, not a national proof matrix.\n    } catch (error) {\n      nativeEndpointMissing = error?.originalDependencyCode ===\n        'POST_H0_DMI_ORIGINAL_SELECTED_ENDPOINT_PROOF_NATIVE_ENDPOINT_MISSING';\n      result[nativeEndpointMissing ? 'normalCollectorEndpointMissingParts' : 'normalCollectorOtherRefusedParts']++;\n      result.firstFailureCategory = nativeEndpointMissing ? 'NATIVE_ENDPOINT_MISSING' : 'OTHER_NORMAL_COLLECTOR_REFUSAL';\n      const known = [...POST_H0_DMI_ENDPOINT_DIAGNOSTICS,\n        'INPUT_INVALID', 'INPUT_BOUND', 'WINDOW_INVALID', 'INITIAL_SELECTION_INVALID', 'INITIAL_STATE_INVALID',\n        'SAMPLING_MISMATCH', 'HOLD_SUPPORT_REQUIRED', 'SOURCE_DOMAIN_EXCLUDED', 'SELECTED_CURRENT_INVALID',\n        'REGIONAL_SUPPORT_REQUIRED', 'CAPTURE_INCOMPLETE', 'PLAN_BOUND'];\n      result.firstFailureCode = known.map(code => 'POST_H0_DMI_ORIGINAL_' + code).includes(error?.originalDependencyCode)\n        ? error.originalDependencyCode : 'OTHER_NORMAL_COLLECTOR_REFUSAL';\n      if (!nativeEndpointMissing) return result;\n    }\n    const allBanks = [];\n    for (const candidate of recoverySources) {\n      const bank = nativeCurrentOriginalBankForPart(candidate, part);\n      if (bank === null) continue;\n      // Validate each actual wrapper/bank independently; never merge evidence.\n      createProtectedDmiNativeCurrentInspector({ contexts: [], previousBank: bank });\n      if (!allBanks.some(value => isDeepStrictEqual(value, bank))) allBanks.push(bank);\n    }\n    if (allBanks.length > 1) {\n      result.allBankProbeStatus = 'REFUSED_MULTIPLE_DISTINCT_BANKS';\n      return result;\n    }\n    const allBank = allBanks[0] ?? null;\n    result.allBankProbeStatus = allBank === null ? 'NO_PROVIDED_BANK' : 'ONE_EXISTING_PROVIDED_BANK';\n    let firstMissingLocated = false;\n    for (const source of recoverySources) {\n      const count = result.roles[source.source];\n      if (!count) refuse('FIXED_ENDPOINT_DIAGNOSTIC_ROLE');\n      count.partsPresent++;\n      const bank = nativeCurrentOriginalBankForPart(source, part);\n      count[source.nativeCurrentOriginals == null ? 'originalWrapperAbsent'\n        : bank === null ? 'originalBankExplicitNull' : 'originalBankPresent']++;\n      const contexts = source.nativeCurrentContexts ?? [];\n      const allContexts = [...new Set([...contexts, protectedBulk, historicalBulk,\n        progressCandidate, progressActive, ...protectedCompanionContexts].filter(Boolean))];\n      const probes = {\n        own: createProtectedDmiNativeCurrentInspector({ contexts, previousBank: bank }),\n        bank: createProtectedDmiNativeCurrentInspector({ contexts: [], previousBank: bank }),\n        companions: createProtectedDmiNativeCurrentInspector({ contexts: protectedCompanionContexts }),\n        all: createProtectedDmiNativeCurrentInspector({ contexts: allContexts, previousBank: allBank }),\n      };\n      const candidatesAt = new Map();\n      const add = (row, document, zone) => {\n        if (!row || !Number.isFinite(Date.parse(row.time))) return;\n        const key = Date.parse(row.time), values = candidatesAt.get(key) ?? [];\n        if (values.length >= 10_000) refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');\n        // Match the normal inspector's contextFrom: copy only existing wire\n        // identity fields, never desired central values or the whole hourly zone.\n        const wireIdentity = object(zone) ? Object.fromEntries(Object.keys(expected)\n          .filter(key => Object.hasOwn(zone, key)).map(key => [key, zone[key]])) : null;\n        values.push({ row, document, zone, wireIdentity }); candidatesAt.set(key, values);\n      };\n      for (const document of allContexts) {\n        const zone = document?.zones?.[expected.entityId];\n        const rows = zone?.hourly;\n        if (!rows) continue;\n        if (!object(rows) || Object.keys(rows).length > 10_000) refuse('FIXED_ENDPOINT_DIAGNOSTIC_BOUND');\n        for (const row of Object.values(rows)) add(row, document, zone);\n      }\n      if (allBank) {\n        const contextById = new Map(allBank.contexts.map(value => [value.id, value.value]));\n        for (const value of allBank.nativeRows) {\n          const native = value.value, context = contextById.get(native.contextId);\n          add({ time: native.time, 'current-u': native.uMps, 'current-v': native.vMps,\n            sources: { current: native.source } }, context?.header, context?.zone);\n        }\n      }\n      for (const row of source.record.hourly) {\n        const at = Date.parse(row.time);\n        if (at <= Date.parse(selected.state.time) || at >= Date.parse(target)) continue;\n        const provenance = row.currentProvenance?.status === 'verified'\n          ? row.currentProvenance : row.sources?.current;\n        if (provenance?.provider !== 'dmi' || provenance.vectorSemanticsVersion === 4\n          || !['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']\n            .every(key => Number.isFinite(row[key]))) continue;\n        const direct = { part, row: { time: row.time, currentUMps: row.currentUMps,\n          currentVMps: row.currentVMps, sources: { current: row.sources?.current } } };\n        if (probes.own.inspect(direct).code !== 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING') continue;\n        count.directForwardRows++;\n        const sampling = inspectDmiForecastGridSampling(provenance, 'current', row.time, expected).status;\n        count[sampling === 'unknown' ? 'unknownSamplingRows'\n          : sampling === 'coherent' ? 'coherentSamplingRows' : 'invalidSamplingRows']++;\n        const original = row.sources?.current;\n        const selection = { part, row: { time: row.time, currentUMps: row.currentUMps,\n          currentVMps: row.currentVMps, sources: { current: original } } };\n        let ownMissing = false;\n        for (const [scope, inspector] of Object.entries(probes)) {\n          const proof = inspector.inspect(selection);\n          const endpoints = inspector.inspectEndpointOriginals(selection);\n          const observed = count[scope];\n          observed[proof.ok ? 'selectionsProved' : 'selectionsRejected']++;\n          observed.nativeStepsRequested += Array.isArray(original?.nativeSteps) ? original.nativeSteps.length : 0;\n          if (endpoints.ok) observed.exactNativeStepsFound += endpoints.endpoints.filter(Boolean).length;\n          else observed.endpointProbeRejected++;\n          if (scope === 'own' && proof.code === 'DMI_NATIVE_PROOF_NATIVE_ENDPOINT_MISSING') ownMissing = true;\n        }\n        if (nativeEndpointMissing && ownMissing && !firstMissingLocated) {\n          count.firstNativeEndpointMissingParts++; firstMissingLocated = true;\n        }\n        // Diagnostic stages are only observations of provided contexts/bank.\n        // Pure/native validator requirements are NOT relaxed to make a match.\n        for (const step of original?.nativeSteps ?? []) {\n          const candidates = candidatesAt.get(Date.parse(step.nativeValidTime)) ?? [];\n          const pure = candidates.filter(({ row: native }) =>\n            !['nativeSteps', 'nativeValidTimes', 'temporalResolution', 'forecastAgeHours']\n              .some(key => Object.hasOwn(native.sources?.current ?? {}, key)));\n          const eligible = pure.filter(({ row: native, document, zone }) =>\n            Number.isFinite(native['current-u']) && Number.isFinite(native['current-v'])\n            && verifiedDmiNativeComponentSource(native.sources?.current, native.time, 'current', expected)\n            && verifiedBulkCurrent(document, zone, part.waterPoint, native.sources.current, native.time, expected));\n          const identity = eligible.filter(({ row: native, wireIdentity }) =>\n            dmiOriginalWireIdentityMatchesCentralIdentity(wireIdentity, expected)\n            && sameNativeIdentity(native.sources.current, original, 'current'));\n          const presence = identity.filter(({ row: native }) =>\n            Object.hasOwn(step, 'nativeGridSampling') === Object.hasOwn(native.sources.current, 'nativeGridSampling'));\n          const exact = presence.filter(({ row: native }) => Object.entries(step).every(([key, value]) =>\n            key === 'nativeValidTime' ? Date.parse(native.sources.current[key]) === Date.parse(value)\n              : isDeepStrictEqual(native.sources.current[key], value)));\n          const category = !candidates.length ? 'timeNotObserved' : !pure.length ? 'onlyDerivedNativeAtTime'\n            : !eligible.length ? 'nativeValidationRejected' : !identity.length ? 'identityMismatch'\n            : !presence.length ? 'samplingPresenceMismatch' : !exact.length ? 'stepFieldsMismatch' : 'exactNativeObserved';\n          count.contextMismatch[category]++;\n        }\n        return result; // Exact first missing row/role only; no later source scan.\n      }\n    }\n    if (nativeEndpointMissing && !firstMissingLocated) result.firstMissingRoleNotLocatedParts++;\n    return result;\n  }\n  if (result.visitedParts !== registry.partCount || Object.keys(checkpoint.states).length !== result.visitedParts) refuse('RETENTION_INVENTORY');\n  return result;\n}\n\n"
    }
  ]
});

export function inverseCurrent586EndpointDiagnosticTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_TYPE');
  const old = CURRENT_NATIVE_ORIGINAL_CONSUMER_TEST_REVIEW.rows.find(row => row.path === relative);
  assert(old, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_PATH');
  const whole = digest(source), bytes = Buffer.byteLength(source);
  if ([old.before, old.after, ...old.historicalPassThrough].some(row => row.bytes === bytes && row.sha256 === whole)) return source;
  const row = CURRENT586_ENDPOINT_DIAGNOSTIC_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_PATH');
  assert.equal(bytes, row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_AFTER_SIZE');
  assert.equal(whole, row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_AFTER_WHOLE');
  for (const edit of [...row.edits].reverse()) {
    assert.equal(source.slice(edit.offset, edit.offset + edit.after.length), edit.after,
      'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_HUNK');
    source = source.slice(0, edit.offset) + edit.before + source.slice(edit.offset + edit.after.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ENDPOINT_DIAGNOSTIC_BEFORE_WHOLE');
  return source;
}

// Additive identity-counter inverse only; every previous table and pin is unchanged.
export const CURRENT586_IDENTITY_REFINEMENT_TEST_REVIEW = Object.freeze({
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_CURRENT586_IDENTITY_REFINEMENT_INVERSE",
  "path": "scripts/plan-ravscore-current-history.mjs",
  "before": {
    "bytes": 73142,
    "sha256": "17b038d863620cccb86fce96c49109c6dba9a6c2cfa9966d883c7c675716ff76"
  },
  "after": {
    "bytes": 77464,
    "sha256": "98317ea46e1760613b8fd908257eca1a87d46f494c3966eafcbe3be4d63d8c4d"
  },
  "edits": [
    {
      "offset": 19799,
      "before": "",
      "after": "// Fixed diagnostic-only identity decomposition. Detached probes are observations,\n// never source rows, endpoint evidence, admission or a replacement comparator.\nfunction current586IdentityDifferenceDetails(nativeSource, wireIdentity, forecastSource, expected) {\n  const native = structuredClone(nativeSource), forecast = structuredClone(forecastSource);\n  const groups = {\n    collectionFamily: ['collection', 'collectionFamily'], modelRun: ['modelRun'],\n    entity: ['component', 'componentKind', 'entityId', 'parentZoneId', 'entityType', 'samplingContext'],\n    gridDefinition: ['gridDefinitionSha256'], gridLocation: ['gridPoint'],\n    samplingLocation: ['samplingPoint'], distance: ['distanceKm'],\n    vector: ['vectorSelection', 'vectorSemanticsVersion'],\n    spatial: ['spatialSelection', 'spatialSemanticsVersion'],\n    layer: ['verticalLayer', 'verticalLayerRankM'], fieldSet: ['fieldSet'],\n  };\n  const nativeMismatch = !sameNativeIdentity(native, forecast, 'current'), nativeGroups = {};\n  for (const [group] of Object.entries(groups)) {\n    const probe = structuredClone(forecast);\n    // Isolate one actual field group; all other comparator inputs are exact\n    // detached native copies. Canonical tolerances remain in sameNativeIdentity.\n    for (const [other, fields] of Object.entries(groups)) if (other !== group) for (const key of fields) {\n      if (Object.hasOwn(native, key)) probe[key] = structuredClone(native[key]);\n      else delete probe[key];\n    }\n    nativeGroups[group] = !sameNativeIdentity(structuredClone(native), probe, 'current');\n  }\n  const wireShape = wireIdentity !== null && typeof wireIdentity === 'object'\n    && !Array.isArray(wireIdentity)\n    && Object.keys(wireIdentity).sort().join(',') === Object.keys(expected).sort().join(',');\n  const wire = wireShape ? structuredClone(wireIdentity) : null;\n  const wireMismatch = !dmiOriginalWireIdentityMatchesCentralIdentity(wire, expected);\n  const wireStringsMatch = wireShape && dmiOriginalWireIdentityMatchesCentralIdentity({\n    ...wire, samplingPoint: structuredClone(expected.samplingPoint) }, expected);\n  const wirePointMatches = wireShape && dmiOriginalWireIdentityMatchesCentralIdentity({\n    ...structuredClone(expected), samplingPoint: structuredClone(wire.samplingPoint) }, expected);\n  return {\n    wireMismatch, wireShapeMismatch: !wireShape,\n    wireStringMismatch: wireShape && !wireStringsMatch,\n    wirePointMismatch: wireShape && !wirePointMatches,\n    wireUnclassifiedMismatch: wireMismatch && wireShape && wireStringsMatch && wirePointMatches,\n    nativeMismatch, nativeGroups,\n    nativeUnclassifiedMismatch: nativeMismatch && !Object.values(nativeGroups).some(Boolean),\n  };\n}\n\n"
    },
    {
      "offset": 24249,
      "before": "      stepFieldsMismatch: 0, exactNativeObserved: 0 } });",
      "after": "      stepFieldsMismatch: 0, exactNativeObserved: 0 },\n    identityMismatchDetails: {\n      countingUnit: 'ELIGIBLE_CANDIDATE_OCCURRENCES_PER_ENDPOINT',\n      countsMayOverlap: true, uniqueOriginalsClaimed: false, singularCauseClaimed: false,\n      endpointSteps: 0, candidateOccurrences: 0,\n      wireMismatch: 0, wireShapeMismatch: 0, wireStringMismatch: 0, wirePointMismatch: 0,\n      wireUnclassifiedMismatch: 0, nativeMismatch: 0, nativeUnclassifiedMismatch: 0,\n      nativeGroups: { collectionFamily: 0, modelRun: 0, entity: 0, gridDefinition: 0,\n        gridLocation: 0, samplingLocation: 0, distance: 0, vector: 0, spatial: 0,\n        layer: 0, fieldSet: 0 },\n    } });"
    },
    {
      "offset": 35334,
      "before": "          count.contextMismatch[category]++;",
      "after": "          count.contextMismatch[category]++;\n          if (category === 'identityMismatch') {\n            const detail = count.identityMismatchDetails;\n            detail.endpointSteps++;\n            // One occurrence may fail several groups, and repeated provided\n            // contexts are not deduplicated into invented unique originals.\n            for (const candidate of eligible) {\n              const observedIdentity = current586IdentityDifferenceDetails(\n                candidate.row.sources.current, candidate.wireIdentity, original, expected);\n              detail.candidateOccurrences++;\n              for (const key of ['wireMismatch', 'wireShapeMismatch', 'wireStringMismatch',\n                'wirePointMismatch', 'wireUnclassifiedMismatch', 'nativeMismatch', 'nativeUnclassifiedMismatch'])\n                detail[key] += Number(observedIdentity[key]);\n              for (const [group, mismatch] of Object.entries(observedIdentity.nativeGroups))\n                detail.nativeGroups[group] += Number(mismatch);\n            }\n          }"
    }
  ]
});

export function inverseCurrent586IdentityRefinementTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:IDENTITY_REFINEMENT_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:IDENTITY_REFINEMENT_TYPE');
  const row = CURRENT586_IDENTITY_REFINEMENT_TEST_REVIEW;
  const whole = digest(source), bytes = Buffer.byteLength(source);
  if (relative !== row.path || whole !== row.after.sha256 || bytes !== row.after.bytes) {
    // Validate a known earlier whole source without removing any older layer.
    inverseCurrent586EndpointDiagnosticTestInput(source, relative);
    return source;
  }
  for (const edit of [...row.edits].reverse()) {
    assert.equal(source.slice(edit.offset, edit.offset + edit.after.length), edit.after,
      'ALTERNATIVE_C_TEST_INPUT_CHANGED:IDENTITY_REFINEMENT_HUNK');
    source = source.slice(0, edit.offset) + edit.before + source.slice(edit.offset + edit.after.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:IDENTITY_REFINEMENT_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:IDENTITY_REFINEMENT_BEFORE_WHOLE');
  return source;
}

// Additive exact inverse for the shared CURRENT projection exports only.
// Existing identity/diagnostic/native/666 tables and assertions remain exact.
export const CURRENT586_SHARED_PROJECTION_EXPORT_TEST_REVIEW = Object.freeze({
  schemaVersion: 1,
  kind: 'TEST_ONLY_EXACT_CURRENT586_SHARED_PROJECTION_EXPORT_INVERSE',
  path: 'scripts/plan-ravscore-current-history.mjs',
  before: { bytes: 77464, sha256: '98317ea46e1760613b8fd908257eca1a87d46f494c3966eafcbe3be4d63d8c4d' },
  after: { bytes: 77545, sha256: '6fc90ba1b688ae2567ff760513f62db3124352a313279d1425c0b7bca014d96b' },
  edits: [{ offset: 15829, before: '',
    after: 'export { assertCommittedRawRetentionInputs, projectCommittedRawRetentionPart };\n\n' }],
});

export function inverseCurrent586SharedProjectionExportTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:SHARED_EXPORT_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:SHARED_EXPORT_TYPE');
  const row = CURRENT586_SHARED_PROJECTION_EXPORT_TEST_REVIEW;
  const whole = digest(source), bytes = Buffer.byteLength(source);
  if (relative !== row.path || whole !== row.after.sha256 || bytes !== row.after.bytes) {
    // Validate an exact earlier source without removing its identity layer.
    // Unknown paths, bytes or mutations still reach the existing strict refusal.
    inverseCurrent586IdentityRefinementTestInput(source, relative);
    return source;
  }
  for (const edit of [...row.edits].reverse()) {
    assert.equal(source.slice(edit.offset, edit.offset + edit.after.length), edit.after,
      'ALTERNATIVE_C_TEST_INPUT_CHANGED:SHARED_EXPORT_HUNK');
    source = source.slice(0, edit.offset) + edit.before + source.slice(edit.offset + edit.after.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:SHARED_EXPORT_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:SHARED_EXPORT_BEFORE_WHOLE');
  return source;
}

// Additive exact inverse for the default-OFF national WORK preamble only.
// All earlier planner/frozen-original whole pins, edits and assertions remain.
export const NATIONAL_COHERENT_WORK_TEST_REVIEW = Object.freeze({
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_NATIONAL_COHERENT_CURRENT_WORK_INVERSE",
  "path": "scripts/plan-ravscore-current-history.mjs",
  "before": {
    "bytes": 77545,
    "sha256": "6fc90ba1b688ae2567ff760513f62db3124352a313279d1425c0b7bca014d96b"
  },
  "after": {
    "bytes": 80474,
    "sha256": "c2e17623e70bd297bad7b273f9f120c24affe7e4df67ee8207313d229c812a0d"
  },
  "edits": [
    {
      "offset": 36842,
      "before": "  return result;\n}\n\nasync function readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt) {\n  const { verified, conditions, conditionsPath: file, conditionsSha256, verify } =\n    await readCurrentPrivateRuntimeCompanionInput(productionReferenceAt);\n  if (!checkpointFile) refuse('RETENTION_B_CHANGED');\n",
      "after": "  return result;\n}\n\nasync function readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt,\n  prepareCachedNativeOriginals = false) {\n  const { verified, conditions, conditionsPath: file, conditionsSha256, verify } =\n    await readCurrentPrivateRuntimeCompanionInput(productionReferenceAt);\n  if (!checkpointFile) refuse('RETENTION_B_CHANGED');\n"
    },
    {
      "offset": 37687,
      "before": "  } finally { await fs.rm(work, { recursive: true }); }\n  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, conditions);\n  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));\n  const forecast = await inspectDmiForecastFile(path.join(ROOT, 'data/live/dmi-forecast-cache.json'));\n  const protectedBulk = await readDmiBulkDocument(path.join(ROOT, '.cache/deployed-dmi-bulk-cache.json'));\n  const candidate = await readDmiBulkDocument(path.join(ROOT, '.cache/dmi-candidate-progress.json'), { optional: true });\n",
      "after": "  } finally { await fs.rm(work, { recursive: true }); }\n  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, conditions);\n  const parts = Object.entries(registry.zones).flatMap(([zoneId, entries]) => entries.map(part => ({ ...part, zoneId })));\n  const preamble = prepareCachedNativeOriginals\n    ? await import('./prepare-cached-coherent-current-work.mjs') : null;\n  const workingInputs = preamble === null ? null : await preamble.snapshotCoherentCurrentWorkInputs();\n  const forecast = await inspectDmiForecastFile(path.join(ROOT, 'data/live/dmi-forecast-cache.json'));\n  const protectedBulk = await readDmiBulkDocument(path.join(ROOT, '.cache/deployed-dmi-bulk-cache.json'));\n  const candidate = await readDmiBulkDocument(path.join(ROOT, '.cache/dmi-candidate-progress.json'), { optional: true });\n"
    },
    {
      "offset": 38948,
      "before": "  const boundary = { datasetId: verified.datasetId, productionReferenceAt: verified.productionReferenceAt,\n    bundleContentSha256: verified.bundleContentSha256, checkpointGenerationSha256: checkpoint.generationSha256, conditionsSha256 };\n  const liveCurrentPilot = await readLiveCurrentPilot(registry), zones = (await readFixed('data/zones.geojson')).json;\n  const all = new Map(), byPart = new Map(parts.map(part => [part.partId, part]));\n  const collect = (part, persistedHourlyByPart) => {\n    const result = buildRavScoreRawCurrentRetention({\n",
      "after": "  const boundary = { datasetId: verified.datasetId, productionReferenceAt: verified.productionReferenceAt,\n    bundleContentSha256: verified.bundleContentSha256, checkpointGenerationSha256: checkpoint.generationSha256, conditionsSha256 };\n  const liveCurrentPilot = await readLiveCurrentPilot(registry), zones = (await readFixed('data/zones.geojson')).json;\n  if (preamble !== null) {\n    await preamble.assertCoherentCurrentWorkInputs(workingInputs);\n    const prepared = await preamble.prepareCachedCoherentCurrentWork({\n      registry, conditions, checkpoint, boundary, zones, productionReferenceAt,\n      protectedBulk, progressCandidate: candidate ?? active, progressActive: active,\n      historicalBulk, protectedCompanionContexts, liveCurrentPilot, forecast,\n      workingInputs, pythonExecutable: process.env.PYTHON ?? 'python' });\n    await verify(); // ORIGINAL authenticated B/S, never the derived work file.\n    await preamble.installPreparedCoherentCurrentWork(prepared);\n    // Re-enter the UNCHANGED normal reader/collector from the actual new bytes.\n    return readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt);\n  }\n  const all = new Map(), byPart = new Map(parts.map(part => [part.partId, part]));\n  const collect = (part, persistedHourlyByPart) => {\n    const result = buildRavScoreRawCurrentRetention({\n"
    },
    {
      "offset": 65001,
      "before": "\n\nasync function main() {\n  const retainCommittedRaw = process.argv.length === 3 && process.argv[2] === '--retain-committed-raw';\n  if (process.argv.length !== 2 && !retainCommittedRaw) refuse('ARGUMENTS_INVALID');\n  const productionReferenceAt = workflowTargetHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);\n  const baselineRequired = environmentBoolean('RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE');\n",
      "after": "\n\nasync function main() {\n  const prepareCachedNativeOriginals = process.argv.length === 4\n    && process.argv[2] === '--retain-committed-raw' && process.argv[3] === '--prepare-cached-native-originals';\n  const retainCommittedRaw = prepareCachedNativeOriginals\n    || process.argv.length === 3 && process.argv[2] === '--retain-committed-raw';\n  if (process.argv.length !== 2 && !retainCommittedRaw) refuse('ARGUMENTS_INVALID');\n  const productionReferenceAt = workflowTargetHour(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR);\n  const baselineRequired = environmentBoolean('RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE');\n"
    },
    {
      "offset": 65869,
      "before": "  const coldPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path];\n  const coldSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];\n  const coldRequested = coldPath !== undefined || coldSha256 !== undefined;\n  if (coldRequested && (!coldPath || !coldSha256 || epochRequested || checkpointOnly\n    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {\n    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');\n",
      "after": "  const coldPath = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.path];\n  const coldSha256 = process.env[CURRENT_FAMILY_COLD_START_CONTEXT_ENV.sha256];\n  const coldRequested = coldPath !== undefined || coldSha256 !== undefined;\n  // Explicit default-OFF ordinary work derivation only. No isolated/cold/\n  // checkpoint/quick view may borrow current B/native evidence through this.\n  if (prepareCachedNativeOriginals && (!baselineRequired || stateLessRecovery || epochRequested\n    || checkpointOnly || coldRequested || environmentBoolean('QUICK_CONFIRMATION'))) {\n    refuse('CACHED_NATIVE_ORIGINAL_MODE_COLLISION');\n  }\n  if (coldRequested && (!coldPath || !coldSha256 || epochRequested || checkpointOnly\n    || stateLessRecovery || !baselineRequired || !retainCommittedRaw)) {\n    refuse('CURRENT_FAMILY_COLD_START_MODE_COLLISION');\n"
    },
    {
      "offset": 71103,
      "before": "  } else if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {\n    currentHistoryFailurePhase='COMMITTED_RAW_RETENTION';\n    demand.schemaVersion = 2;\n    demand.rawRetention = await readCommittedRawCurrentRetention(registry.json, checkpointFile, productionReferenceAt);\n  }\n  // Existing private .cache only; no directory creation, original rewrite,\n  // provider operation, public artifact, checkpoint save or state promotion.\n",
      "after": "  } else if (retainCommittedRaw && !checkpointOnly && baselineRequired && epochView === null && !stateLessRecovery) {\n    currentHistoryFailurePhase='COMMITTED_RAW_RETENTION';\n    demand.schemaVersion = 2;\n    demand.rawRetention = await readCommittedRawCurrentRetention(registry.json, checkpointFile, productionReferenceAt,\n      prepareCachedNativeOriginals);\n  }\n  // Existing private .cache only; no directory creation, original rewrite,\n  // provider operation, public artifact, checkpoint save or state promotion.\n"
    },
    {
      "offset": 78451,
      "before": "          &&relative==='scripts/lib/post-h0-dmi-original-dependencies.mjs'\n          &&result.frame.sha256==='a49ea641f76af721c43a13a091aa102e0904a3730803859d7c5f5e29e7c516bc'\n          &&at===18)result.code=originalDependencyCode;\n        break;\n      }catch{} // Unknown frame stays unknown; diagnostic I/O cannot replace the failure.\n    }\n",
      "after": "          &&relative==='scripts/lib/post-h0-dmi-original-dependencies.mjs'\n          &&result.frame.sha256==='a49ea641f76af721c43a13a091aa102e0904a3730803859d7c5f5e29e7c516bc'\n          &&at===18)result.code=originalDependencyCode;\n        // Diagnostic-only closed work/decode/reprojection codes. The first\n        // qualified frame and original Error remain intact if classification fails.\n        try {\n          const coherentFrames=new Map([\n            ['scripts/prepare-cached-coherent-current-work.mjs','d35bceb88b65119ae3d942535a42b594e6de61de3f37397341cb1efc9222334e'],\n            ['scripts/lib/prove-cached-coherent-current-originals.mjs','2695904a5e5e63ea0f53ab0ba9801d55cf1ec1f6d5f72241da366c9967a13aff'],\n            ['scripts/lib/reproject-coherent-current-originals.mjs','1dea8a499b6d991db26411bc266b0e0e56be4b3b1ce34c85001a726304af71b3'],\n          ]);\n          if(result.code==='RAVSCORE_CURRENT_HISTORY_DEMAND_REFUSED'\n            &&result.phase==='COMMITTED_RAW_RETENTION'&&prototype===Error.prototype\n            &&coherentFrames.get(relative)===result.frame.sha256){\n            const {coherentCurrentWorkFailureCode}=await import('./prepare-cached-coherent-current-work.mjs');\n            const code=coherentCurrentWorkFailureCode(error);\n            if(code!=='COHERENT_CURRENT_CACHED_PROOF_UNCLASSIFIED')result.code=code;\n          }\n        }catch{} // An unknown classifier never hides/replaces the actual first frame.\n        break;\n      }catch{} // Unknown frame stays unknown; diagnostic I/O cannot replace the failure.\n    }\n"
    }
  ]
});

export function inverseNationalCoherentWorkTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIONAL_WORK_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIONAL_WORK_TYPE');
  source = source.replace(/\r\n/g, '\n');
  source = inverseCoherentRawTransportLifetimeTestInput(source, relative);
  source = inverseJointCoherentControllerTestInput(source, relative);
  const distinctFrames = COHERENT_DISTINCT_CAPTURE_FRAME_TEST_REVIEW;
  if (Buffer.byteLength(source) === distinctFrames.after.bytes && digest(source) === distinctFrames.after.sha256) {
    source = inverseCoherentDistinctCaptureFramesTestInput(source, relative);
  }
  const capacity = NATIONAL_COHERENT_CAPACITY_TEST_REVIEW;
  // Only remove the exact new layer; the unchanged V3 reader validates every OLD view below.
  if (Buffer.byteLength(source) === capacity.after.bytes && digest(source) === capacity.after.sha256) {
    source = inverseNationalCapacityTestInput(source, relative);
  }
  const row = NATIONAL_COHERENT_WORK_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIONAL_WORK_PATH');
  const whole = digest(source), bytes = Buffer.byteLength(source);
  if (whole !== row.after.sha256 || bytes !== row.after.bytes) {
    // The existing exact earlier oracle remains responsible for OLD sources;
    // it must reject unknown/current-source mutations, never accept a pattern.
    inverseCurrent586SharedProjectionExportTestInput(source, relative);
    return source;
  }
  for (const edit of [...row.edits].reverse()) {
    assert.equal(source.slice(edit.offset, edit.offset + edit.after.length), edit.after,
      'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIONAL_WORK_HUNK');
    source = source.slice(0, edit.offset) + edit.before + source.slice(edit.offset + edit.after.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIONAL_WORK_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIONAL_WORK_WHOLE_INVERSE');
  return source;
}

// New current frame pins only; every earlier table/assertion remains whole.
export const NATIONAL_COHERENT_CAPACITY_TEST_REVIEW = Object.freeze({
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_NATIONAL_CAPACITY_FRAME_INVERSE",
  "path": "scripts/plan-ravscore-current-history.mjs",
  "before": {
    "bytes": 80474,
    "sha256": "c2e17623e70bd297bad7b273f9f120c24affe7e4df67ee8207313d229c812a0d"
  },
  "after": {
    "bytes": 80474,
    "sha256": "3697edd3b15871520e66c7e3b134d04704507711b2d96251d64e814fbd7a856a"
  },
  "hunks": [
    [
      "d35bceb88b65119ae3d942535a42b594e6de61de3f37397341cb1efc9222334e",
      "8dca73ce782f1293cb154aaeab4e536cd839c16b21695695ccf9c2c055c471a7"
    ],
    [
      "2695904a5e5e63ea0f53ab0ba9801d55cf1ec1f6d5f72241da366c9967a13aff",
      "f613c4dbe9845bf0edcfbe471acf54fc71f0059b52a4c7433c0c11577a23bdd4"
    ]
  ]
});
export function inverseNationalCapacityTestInput(source, relative) {
  if(relative!=='scripts/plan-ravscore-current-history.mjs')return source;
  const raw=source.replace(/\r\n/g,'\n'),row=NATIONAL_COHERENT_CAPACITY_TEST_REVIEW;
  const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
  if(Buffer.byteLength(raw)===row.before.bytes&&digest(raw)===row.before.sha256)return raw;
  assert.equal(Buffer.byteLength(raw),row.after.bytes,'ALTERNATIVE_C_TEST_INPUT_CHANGED NATIONAL_CAPACITY_SIZE');
  assert.equal(digest(raw),row.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED NATIONAL_CAPACITY_AFTER_SHA');
  let original=raw;
  for(const[before,after]of row.hunks){
    assert.equal(original.split(after).length,2,'ALTERNATIVE_C_TEST_INPUT_CHANGED NATIONAL_CAPACITY_HUNK');
    original=original.replace(after,before);
  }
  assert.equal(Buffer.byteLength(original),row.before.bytes,'NATIONAL_CAPACITY_BEFORE_SIZE');
  assert.equal(digest(original),row.before.sha256,'NATIONAL_CAPACITY_BEFORE_SHA');
  return original;
}

export const COHERENT_DISTINCT_CAPTURE_FRAME_TEST_REVIEW = Object.freeze({
  path:'scripts/plan-ravscore-current-history.mjs',
  before:{bytes:80474,sha256:'3697edd3b15871520e66c7e3b134d04704507711b2d96251d64e814fbd7a856a'},
  after:{bytes:80474,sha256:'cd538b1108fd92455780cbf4d308c34216175e32e2ef834e8b224fb491e6cd61'},
  hunks:[
    ['f613c4dbe9845bf0edcfbe471acf54fc71f0059b52a4c7433c0c11577a23bdd4','eea3a889a2ae3140a406735b5e7fe4a174c62b7ee72ab425834c1baf2588e26f'],
    ['1dea8a499b6d991db26411bc266b0e0e56be4b3b1ce34c85001a726304af71b3','616d5fae83eefe561b52b0b5ecb8e0b0691beda356f8819d7bfab283cc77cb65'],
  ],
});
export function inverseCoherentDistinctCaptureFramesTestInput(source,relative){
  assert.equal(arguments.length,2,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_ARGUMENTS');
  assert.equal(typeof source,'string','ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_TYPE');
  const row=COHERENT_DISTINCT_CAPTURE_FRAME_TEST_REVIEW;
  assert.equal(relative,row.path,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_PATH');
  const raw=source.replace(/\r\n/g,'\n');
  if(Buffer.byteLength(raw)===row.before.bytes&&digest(raw)===row.before.sha256)return raw;
  assert.equal(Buffer.byteLength(raw),row.after.bytes,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_AFTER_SIZE');
  assert.equal(digest(raw),row.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_AFTER_SHA');
  let original=raw;
  for(const[before,after]of row.hunks){
    assert.equal(original.split(after).length,2,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_HUNK');
    original=original.replace(after,before);
  }
  assert.equal(Buffer.byteLength(original),row.before.bytes,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_BEFORE_SIZE');
  assert.equal(digest(original),row.before.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED:DISTINCT_CAPTURE_BEFORE_SHA');
  return original;
}

// Exact JOINT layer only: stage budget + explicit capture mode, before the
// unchanged distinct-capture/capacity/V3 and all older source-oracle layers.
export const JOINT_NATIONAL_COHERENT_CONTROLLER_TEST_REVIEW = Object.freeze([
  {
    "path": "scripts/prepare-cached-coherent-current-work.mjs",
    "before": {
      "bytes": 23918,
      "sha256": "8dca73ce782f1293cb154aaeab4e536cd839c16b21695695ccf9c2c055c471a7"
    },
    "after": {
      "bytes": 24716,
      "sha256": "338f6c7671ad76c8dadecb574e6974931cc08d9206af6a4541747c2cc3d0c574"
    },
    "stageBudgetHunkCount": 4,
    "reviewedStageOnly": {
      "bytes": 24446,
      "sha256": "187786c5424c8d461e6b219e7b412a7bf797e8bde0ada6bba3ca7e8460205f05"
    },
    "hunks": [
      [
        "  await writeDmiForecastRecords(STAGE, forecast, zones, { ...forecast.metadata, partContinuity: replacement });",
        "  await writeDmiForecastRecords(STAGE, forecast, zones, { ...forecast.metadata, partContinuity: replacement });\n  if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');"
      ],
      [
        "    if (!next || !equal(await readDmiForecastRecord(forecast, descriptor),\n      await readDmiForecastRecord(staged, next))) refuse('STAGE_CHANGED');",
        "    if (!next || !equal(await readDmiForecastRecord(forecast, descriptor),\n      await readDmiForecastRecord(staged, next))) refuse('STAGE_CHANGED');\n    if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');"
      ],
      [
        "    if (!equal(await readDmiForecastRecord(forecast, forecast.waterSourceContinuity.entries[i]),\n      await readDmiForecastRecord(staged, staged.waterSourceContinuity.entries[i]))) refuse('STAGE_CHANGED');",
        "    if (!equal(await readDmiForecastRecord(forecast, forecast.waterSourceContinuity.entries[i]),\n      await readDmiForecastRecord(staged, staged.waterSourceContinuity.entries[i]))) refuse('STAGE_CHANGED');\n    if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');"
      ],
      [
        "  const stageIdentity = await measuredFile(STAGE);",
        "  const stageIdentity = await measuredFile(STAGE);\n  // The SAME projection budget includes the awaited writer/readback and both\n  // final input/stage hashes. Expiry cannot issue an installable capability.\n  if (elapsedMilliseconds(projectionStarted) > 600_000) refuse('PROJECTION_RUNTIME_BOUND');"
      ],
      [
        "import { reprojectCommittedCoherentCurrentOriginals, validatedCommittedCoherentCurrentOriginals }",
        "import { reprojectCommittedCoherentCurrentOriginals, validatedCommittedCoherentCurrentOriginals,\n  COHERENT_DISTINCT_READ_CAPTURE_MODE }"
      ],
      [
        "  const decoded = await decodeCommittedCoherentOriginalRequests({ metadata, pythonExecutable: base.pythonExecutable });",
        "  const decoded = await decodeCommittedCoherentOriginalRequests({ metadata, pythonExecutable: base.pythonExecutable,\n    captureMode: metadata.privateRequests.length ? COHERENT_DISTINCT_READ_CAPTURE_MODE : null });"
      ],
      [
        "      decodedEnvelope: decoded.decodedEnvelope });",
        "      decodedEnvelope: decoded.decodedEnvelope, captureMode: decoded.captureMode ?? null });"
      ],
      [
        "    const projection = reprojectCommittedCoherentCurrentOriginals({ input, metadata: localMetadata, ...localDecoded });",
        "    const projection = reprojectCommittedCoherentCurrentOriginals({ input, metadata: localMetadata, ...localDecoded,\n      captureMode: localMetadata.privateRequests.length ? decoded.captureMode ?? null : null });"
      ]
    ]
  },
  {
    "path": "scripts/plan-ravscore-current-history.mjs",
    "before": {
      "bytes": 80474,
      "sha256": "cd538b1108fd92455780cbf4d308c34216175e32e2ef834e8b224fb491e6cd61"
    },
    "after": {
      "bytes": 80474,
      "sha256": "7b5196b8267406cde0035a2c99ba94e81219f976efa2af5c584bc12e57a3171b"
    },
    "hunks": [
      [
        "8dca73ce782f1293cb154aaeab4e536cd839c16b21695695ccf9c2c055c471a7",
        "338f6c7671ad76c8dadecb574e6974931cc08d9206af6a4541747c2cc3d0c574"
      ]
    ]
  }
]);
export function inverseJointCoherentControllerTestInput(source, relative) {
  if (typeof source !== 'string') return source;
  const row = JOINT_NATIONAL_COHERENT_CONTROLLER_TEST_REVIEW.find(row => row.path === relative);
  if (!row) return source;
  const raw = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(raw) !== row.after.bytes || digest(raw) !== row.after.sha256) return source;
  let original = raw;
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(original.split(after).length, 2, 'JOINT_COHERENT_CONTROLLER_HUNK');
    original = original.replace(after, before);
  }
  assert.equal(Buffer.byteLength(original), row.before.bytes, 'JOINT_COHERENT_CONTROLLER_BEFORE_SIZE');
  assert.equal(digest(original), row.before.sha256, 'JOINT_COHERENT_CONTROLLER_BEFORE_SHA');
  return original;
}

// Additive RAW-eviction lifetime layer only; every previous oracle is unchanged.
export const COHERENT_RAW_TRANSPORT_LIFETIME_TEST_REVIEW = Object.freeze([
  {
    "path": "scripts/prepare-cached-coherent-current-work.mjs",
    "before": {
      "bytes": 24716,
      "sha256": "338f6c7671ad76c8dadecb574e6974931cc08d9206af6a4541747c2cc3d0c574"
    },
    "after": {
      "bytes": 25838,
      "sha256": "1bdab356610e089958d1408f7d68acc1518005f27c1012116c05dd1c857cab9b"
    },
    "hunks": [
      [
        "function combineMetadata(metas, boundary, started, requestBudget) {",
        "// BEGIN validated coherent RAW transport retention\n// ONLY the already globally validated decoder objects enter here. These pins\n// protect exact measured bytes from eviction; they are never native admission.\nfunction validatedTransportRetentionCaptures(originals) {\n  const captures = new Map();\n  for (const original of originals?.values() ?? []) {\n    // Strict mode read the original capture itself. Explicit distinct-read\n    // mode retains its truthful measured transport, never the old acquisition.\n    const capture = original.transportCapture ?? original.capture;\n    const key = canonical(capture);\n    captures.set(key, Object.freeze({ ...capture }));\n    if (captures.size > 4096) refuse('RETENTION_CAPTURE_BOUND');\n  }\n  return Object.freeze([...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)\n    .map(([, capture]) => capture));\n}\n// END validated coherent RAW transport retention\n\nfunction combineMetadata(metas, boundary, started, requestBudget) {"
      ],
      [
        "      decodedEnvelope: decoded.decodedEnvelope, captureMode: decoded.captureMode ?? null });\n  await assertCoherentCurrentWorkInputs(workingInputs);",
        "      decodedEnvelope: decoded.decodedEnvelope, captureMode: decoded.captureMode ?? null });\n  const transportCaptures = validatedTransportRetentionCaptures(originals);\n  await assertCoherentCurrentWorkInputs(workingInputs);"
      ],
      [
        "  const entries = [], captureKeys = new Set();",
        "  const entries = [], captureKeys = new Set(transportCaptures.map(canonical));"
      ],
      [
        "  preparedStages.set(receipt, { workingInputs, stageIdentity, capacity: Object.freeze({ ...capacity }) });",
        "  preparedStages.set(receipt, { workingInputs, stageIdentity, capacity: Object.freeze({ ...capacity }), transportCaptures });"
      ],
      [
        "  capacityStage('installed', prepared.capacity);\n}",
        "  capacityStage('installed', prepared.capacity);\n  return prepared.transportCaptures; // Available only after successful owned install.\n}"
      ]
    ]
  },
  {
    "path": "scripts/plan-ravscore-current-history.mjs",
    "before": {
      "bytes": 80474,
      "sha256": "7b5196b8267406cde0035a2c99ba94e81219f976efa2af5c584bc12e57a3171b"
    },
    "after": {
      "bytes": 81845,
      "sha256": "e9a6480b0c95afe7cc689d8870255b93ebe33f51554a397a1eab36b830ed13c2"
    },
    "hunks": [
      [
        "// Fixed diagnostic-only identity decomposition.",
        "// RAW eviction protection only: the normal reader/collector has already\n// completed with authentic B/S. No capture here selects or admits a numeric row.\nexport function withInstalledCoherentRawTransportRetention(retention, transportCaptures) {\n  if (!object(retention) || retention.schemaVersion !== 1\n    || retention.kind !== 'COMMITTED_POST_H0_UNKNOWN_RAW_RETENTION'\n    || !Array.isArray(retention.captures) || !Array.isArray(transportCaptures)) refuse('RETENTION_CAPTURE_REQUIRED');\n  if (retention.captures.length > 4096 || transportCaptures.length > 4096) refuse('RETENTION_BOUND');\n  const captures = new Map();\n  for (const raw of [...retention.captures, ...transportCaptures]) {\n    const capture = canonicalSavedDmiOriginalCapture(raw);\n    if (!capture || !isDeepStrictEqual(capture, raw)) refuse('RETENTION_CAPTURE_REQUIRED');\n    captures.set(canonical(capture), capture);\n    if (captures.size > 4096) refuse('RETENTION_BOUND');\n  }\n  return { ...retention,\n    captures: [...captures].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, value]) => value) };\n}\n\n// Fixed diagnostic-only identity decomposition."
      ],
      [
        "    await preamble.installPreparedCoherentCurrentWork(prepared);\n    // Re-enter the UNCHANGED normal reader/collector from the actual new bytes.\n    return readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt);",
        "    const transportCaptures = await preamble.installPreparedCoherentCurrentWork(prepared);\n    // Re-enter the UNCHANGED normal reader/collector from the actual new bytes.\n    const retention = await readCommittedRawCurrentRetention(registry, checkpointFile, productionReferenceAt);\n    // Keep measured RAW alive until normal RAW-SAVE/new durable B/S. This union\n    // happens only after the complete recursive reader and BEFORE demand SAVE.\n    return withInstalledCoherentRawTransportRetention(retention, transportCaptures);"
      ],
      [
        "338f6c7671ad76c8dadecb574e6974931cc08d9206af6a4541747c2cc3d0c574",
        "1bdab356610e089958d1408f7d68acc1518005f27c1012116c05dd1c857cab9b"
      ]
    ]
  }
]);
export function inverseCoherentRawTransportLifetimeTestInput(source, relative) {
  if (typeof source !== 'string') return source;
  const boundary = ASSISTANT587_ORIGINAL_RAW_BOUNDARY_TEST_REVIEW;
  if (relative === boundary.path) {
    const raw = source.replace(/\r\n/g, '\n');
    if (Buffer.byteLength(raw) === boundary.after.bytes && digest(raw) === boundary.after.sha256) {
      source = inverseAssistant587OriginalRawBoundaryTestInput(raw, relative);
    }
  }
  const assistant = ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW.find(row => row.path === relative);
  if (assistant && relative === 'scripts/plan-ravscore-current-history.mjs') {
    const raw = source.replace(/\r\n/g, '\n');
    // Only the complete authenticated 587 image enters this outer inverse.
    // Unknown/mutated inputs still reach the unchanged strict OLD oracles.
    if (Buffer.byteLength(raw) === assistant.after.bytes && digest(raw) === assistant.after.sha256) {
      source = inverseAssistant587OriginalCompanionTestInput(raw, relative);
    }
  }
  const cold = CURRENT_FAMILY_COLD_TARGET_TEST_REVIEW.find(row => row.path === relative);
  if (cold && relative === 'scripts/plan-ravscore-current-history.mjs') {
    const raw = source.replace(/\r\n/g, '\n');
    if (Buffer.byteLength(raw) === cold.after.bytes && digest(raw) === cold.after.sha256) {
      source = inverseCurrentFamilyColdTargetTestInput(raw, relative);
    }
  }
  const row = COHERENT_RAW_TRANSPORT_LIFETIME_TEST_REVIEW.find(row => row.path === relative);
  if (!row) return source;
  const raw = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(raw) !== row.after.bytes || digest(raw) !== row.after.sha256) return source;
  let original = raw;
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(original.split(after).length, 2, 'COHERENT_RAW_TRANSPORT_LIFETIME_HUNK');
    original = original.replace(after, before);
  }
  assert.equal(Buffer.byteLength(original), row.before.bytes, 'COHERENT_RAW_TRANSPORT_LIFETIME_BEFORE_SIZE');
  assert.equal(digest(original), row.before.sha256, 'COHERENT_RAW_TRANSPORT_LIFETIME_BEFORE_SHA');
  return original;
}

// TEST INPUT ONLY: exact already-reviewed 587 ORIGINAL-B caller deltas.
// These whole images are reversed BEFORE unchanged historical P0 oracles.
// No runtime reader, original admission, source binding or model input changes.
export const ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW = Object.freeze([
  {
    "path": "scripts/plan-ravscore-current-history.mjs",
    "hunks": [
      [
        "  const { verified, conditions, conditionsPath: file, conditionsSha256, verify } =",
        "  const { verified, conditions, originalConditions, conditionsPath: file, conditionsSha256, verify } ="
      ],
      [
        "  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, conditions);",
        "  const protectedCompanionContexts = await readAuthenticatedCurrentCompanions(verified, originalConditions ?? conditions);"
      ]
    ],
    "before": {
      "bytes": 82258,
      "sha256": "877506b01f8ce4b081b230345345e2b909dd5d24768c08feedbfc8690f30d515"
    },
    "after": {
      "bytes": 82300,
      "sha256": "f30a148853388df570b9496783cf3624b7efee056e2a504978aed325d0ac2e7a"
    }
  },
  {
    "path": "scripts/read-authenticated-dmi-current-companions.mjs",
    "hunks": [
      [
        "  from './lib/private-weather-component-inventory.mjs';",
        "  from './lib/private-weather-component-inventory.mjs';\nimport {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';\nimport {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';\nimport {readAssistantLaterH0RetentionInput} from './assistant-later-h0-runtime-transition.mjs';"
      ],
      [
        "  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));",
        "  const descriptor = JSON.parse(descriptorBytes.toString('utf8'));\n  if(descriptor?.modelBinding?.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805'\n    &&ravScoreModelBinding().modelBundleSha256!==descriptor.modelBinding.modelBundleSha256){\n    const view=await readAssistantLaterH0RetentionInput(targetReferenceAt);\n    if(view.verified.bundleContentSha256!==descriptor.bundleContentSha256\n      ||!descriptorBytes.equals(await fs.readFile(descriptorPath)))refuse('RETENTION_B_CHANGED');\n    return view;\n  }"
      ],
      [
        "export async function readCurrentPrivateRuntimeCompanions(targetReferenceAt) {",
        "export async function readCurrentPrivateRuntimeCompanions(targetReferenceAt) {\n  // Called after the updater's genuine H0 origin check. Providers may already\n  // have changed unrelated WORKING weather; unpack only immutable original B.\n  if(ravScoreModelBinding().modelBundleSha256!=='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805'){\n    const descriptor=JSON.parse(await fs.readFile(path.join(process.env.RUNNER_TEMP,'private-runtime-current-source.json'),'utf8'));\n    if(descriptor?.modelBinding?.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805'){\n      const snapshot=assertAuthenticatedFrozen586Snapshot(await readAuthenticatedFrozen586Predecessor());\n      if(snapshot.descriptor.bundleContentSha256!==descriptor.bundleContentSha256)refuse('RETENTION_B_CHANGED');\n      const original=JSON.parse(await fs.readFile(snapshot.conditionsPath,'utf8'));\n      const contexts=await readAuthenticatedCurrentCompanions(snapshot.verified,original);\n      const fresh=assertAuthenticatedFrozen586Snapshot(await readAuthenticatedFrozen586Predecessor());\n      if(!isDeepStrictEqual(snapshot,fresh))refuse('RETENTION_B_CHANGED');return contexts;\n    }\n  }"
      ],
      [
        "  const contexts = await readAuthenticatedCurrentCompanions(input.verified, input.conditions);",
        "  const contexts = await readAuthenticatedCurrentCompanions(input.verified, input.originalConditions ?? input.conditions);"
      ]
    ],
    "before": {
      "bytes": 10252,
      "sha256": "64bbc369d074e2b6d04db6ddcdb7eac04c8ec7e3bd9f7f5c1c97f879d332c250"
    },
    "after": {
      "bytes": 12200,
      "sha256": "d4e90536a6b77c938482c34ee21164b1b7cf2bf576ca410f10375b5640540af5"
    }
  }
]);
export function inverseAssistant587OriginalCompanionTestInput(source, relative) {
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_TYPE');
  const row = ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW.find(row => row.path === relative);
  assert(row, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_PATH');
  source = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(source) === row.before.bytes && digest(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_SIZE');
  assert.equal(digest(source), row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_WHOLE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587_WHOLE_INVERSE');
  return source;
}

// TEST INPUT ONLY: whole original-B RAW boundary fix before ALL older oracles.
// The fd2b whole planner is recovered exactly; no product guard is normalized.
export const ASSISTANT587_ORIGINAL_RAW_BOUNDARY_TEST_REVIEW = Object.freeze({
  "path": "scripts/plan-ravscore-current-history.mjs",
  "before": {
    "bytes": 82300,
    "sha256": "f30a148853388df570b9496783cf3624b7efee056e2a504978aed325d0ac2e7a"
  },
  "after": {
    "bytes": 82634,
    "sha256": "62ae03e2627d92afceff607bbee91d69252b486f4a7b0a7b7d53cedeb5f05142"
  },
  "hunks": [
    [
      "  const { verified, conditions, originalConditions, conditionsPath: file, conditionsSha256, verify } =",
      "  const { verified, conditions, originalConditions, originalConditionsSha256,\n    conditionsPath: file, conditionsSha256, verify } ="
    ],
    [
      "  const boundary = { datasetId: verified.datasetId, productionReferenceAt: verified.productionReferenceAt,\n    bundleContentSha256: verified.bundleContentSha256, checkpointGenerationSha256: checkpoint.generationSha256, conditionsSha256 };",
      "  const rawConditionsSha256 = originalConditionsSha256 ?? conditionsSha256;\n  const originalEntry = verified.files.find(row => row.relativePath === 'data/live/conditions.json');\n  if (!originalEntry || originalEntry.sha256 !== rawConditionsSha256) refuse('RETENTION_B_CHANGED');\n  const boundary = { datasetId: verified.datasetId, productionReferenceAt: verified.productionReferenceAt,\n    bundleContentSha256: verified.bundleContentSha256, checkpointGenerationSha256: checkpoint.generationSha256,\n    conditionsSha256: rawConditionsSha256 };"
    ]
  ]
});
export function inverseAssistant587OriginalRawBoundaryTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_TYPE');
  const row = ASSISTANT587_ORIGINAL_RAW_BOUNDARY_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_PATH');
  source = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(source) === row.before.bytes && digest(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_SIZE');
  assert.equal(digest(source), row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_WHOLE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW_WHOLE_INVERSE');
  return source;
}

// TEST INPUT ONLY: the fixed public587 -> assistant588 companion route.
// Preserve the whole genuine587 caller before its unchanged historical oracles.
// This is not authentication, source admission or a runtime fallback.
export const ASSISTANT588_ORIGINAL_COMPANION_TEST_REVIEW = Object.freeze({
  "path": "scripts/read-authenticated-dmi-current-companions.mjs",
  "before": {
    "bytes": 12200,
    "sha256": "d4e90536a6b77c938482c34ee21164b1b7cf2bf576ca410f10375b5640540af5"
  },
  "after": {
    "bytes": 12200,
    "sha256": "5cbaa9abb7d96e49c2e8b83fa168733181621f0e7ad028d82e25dfaa395c8e14"
  },
  "hunks": [
    [
      "import {readAuthenticatedFrozen586Predecessor,assertAuthenticatedFrozen586Snapshot}",
      "import {readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot}"
    ],
    [
      "  if(descriptor?.modelBinding?.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805'\n    &&",
      "  if(descriptor?.modelBinding?.modelBundleSha256==='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2'\n    &&"
    ],
    [
      "  if(ravScoreModelBinding().modelBundleSha256!=='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805'){",
      "  if(ravScoreModelBinding().modelBundleSha256!=='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2'){"
    ],
    [
      "    if(descriptor?.modelBinding?.modelBundleSha256==='6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805'){",
      "    if(descriptor?.modelBinding?.modelBundleSha256==='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2'){"
    ],
    [
      "      const snapshot=assertAuthenticatedFrozen586Snapshot(await readAuthenticatedFrozen586Predecessor());",
      "      const snapshot=assertAuthenticatedFrozen587Snapshot(await readAuthenticatedFrozen587Predecessor());"
    ],
    [
      "      const fresh=assertAuthenticatedFrozen586Snapshot(await readAuthenticatedFrozen586Predecessor());",
      "      const fresh=assertAuthenticatedFrozen587Snapshot(await readAuthenticatedFrozen587Predecessor());"
    ]
  ]
});

export function inverseAssistant588OriginalCompanionTestInput(source, relative) {
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_TYPE');
  const row = ASSISTANT588_ORIGINAL_COMPANION_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_PATH');
  source = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(source) === row.before.bytes && digest(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_SIZE');
  assert.equal(digest(source), row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_WHOLE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588_WHOLE_INVERSE');
  return source;
}

// TEST INPUT ONLY: exact outer inverse of the active-family retention route.
// The whole genuine588 caller is restored before unchanged 588/587/586 oracles.
// This grants no authentication, runtime fallback or source admission.
export const ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW = Object.freeze({
  "path": "scripts/read-authenticated-dmi-current-companions.mjs",
  "before": {
    "bytes": 12200,
    "sha256": "5cbaa9abb7d96e49c2e8b83fa168733181621f0e7ad028d82e25dfaa395c8e14"
  },
  "after": {
    "bytes": 12536,
    "sha256": "7d34f89912e6bab865dde2bc7d58ac77ede17fda0b3e28acba05bd7584936116"
  },
  "hunks": [
    [
      "import {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';",
      "import {readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';\nimport {ACTIVE_ASSISTANT_SUCCESSOR as ACTIVE} from './lib/assistant-later-h0-successor-source.mjs';\nimport {ravScoreModelBinding} from '../js/core/ravscore-model-contract.js';"
    ],
    [
      "import {readAssistantLaterH0RetentionInput} from './assistant-later-h0-runtime-transition.mjs';",
      "import {readAssistantLaterH0RetentionInput} from './assistant-later-h0-runtime-transition.mjs';\nconst ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({\n  read:readAuthenticatedFrozen588Predecessor,snapshot:assertAuthenticatedFrozen588Snapshot,\n}):Object.freeze({\n  read:readAuthenticatedFrozen587Predecessor,snapshot:assertAuthenticatedFrozen587Snapshot,\n});"
    ],
    [
      "  if(descriptor?.modelBinding?.modelBundleSha256==='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2'\n    &&ravScoreModelBinding().modelBundleSha256!==descriptor.modelBinding.modelBundleSha256){",
      "  if(descriptor?.modelBinding?.modelBundleSha256===ACTIVE.before.I\n    &&ravScoreModelBinding().modelBundleSha256===ACTIVE.requireBinding().I){"
    ],
    [
      "  if(ravScoreModelBinding().modelBundleSha256!=='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2'){",
      "  if(ravScoreModelBinding().modelBundleSha256===ACTIVE.requireBinding().I){"
    ],
    [
      "    if(descriptor?.modelBinding?.modelBundleSha256==='5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2'){",
      "    if(descriptor?.modelBinding?.modelBundleSha256===ACTIVE.before.I){"
    ],
    [
      "      const snapshot=assertAuthenticatedFrozen587Snapshot(await readAuthenticatedFrozen587Predecessor());",
      "      const snapshot=ACTIVE_PREDECESSOR.snapshot(await ACTIVE_PREDECESSOR.read());"
    ],
    [
      "      const fresh=assertAuthenticatedFrozen587Snapshot(await readAuthenticatedFrozen587Predecessor());",
      "      const fresh=ACTIVE_PREDECESSOR.snapshot(await ACTIVE_PREDECESSOR.read());"
    ]
  ]
});

export function inverseActiveFamilyRetentionCompanionTestInput(source, relative) {
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_TYPE');
  const row = ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_PATH');
  source = inverseAssistant590RetentionCompanionTestInput(source, relative);
  source = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(source) === row.before.bytes && digest(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_SIZE');
  assert.equal(digest(source), row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_WHOLE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ACTIVE_RETENTION_WHOLE_INVERSE');
  return source;
}

// TEST INPUT ONLY: remove only the exact assistant590 predecessor route before the
// unchanged745 active-retention inverse. No runtime admission or fallback.
export const ASSISTANT590_RETENTION_COMPANION_TEST_REVIEW = Object.freeze({
  "path": "scripts/read-authenticated-dmi-current-companions.mjs",
  "before": {
    "bytes": 12536,
    "sha256": "7d34f89912e6bab865dde2bc7d58ac77ede17fda0b3e28acba05bd7584936116"
  },
  "after": {
    "bytes": 12840,
    "sha256": "13654b7e1af641622b85ebfcf756d70858c37993d4a1c0a8fd1a98b0904495b7"
  },
  "hunks": [
    [
      "import {readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';",
      "import {readAuthenticatedFrozen588Predecessor,assertAuthenticatedFrozen588Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';\nimport {readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';"
    ],
    [
      "const ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({",
      "const ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({\n  read:readAuthenticatedFrozen590Predecessor,snapshot:assertAuthenticatedFrozen590Snapshot,\n}):ACTIVE.sourcePhase==='assistant-public588-successor'?Object.freeze({"
    ]
  ]
});

export function inverseAssistant590RetentionCompanionTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_TYPE');
  const row = ASSISTANT590_RETENTION_COMPANION_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_PATH');
  source = source.replace(/\r\n/g, '\n');
  // Exact new592 outer view; all old591/588/587 whole oracles remain below.
  if (Buffer.byteLength(source) === ASSISTANT591_RETENTION_COMPANION_TEST_REVIEW.after.bytes)
    source = inverseAssistant591RetentionCompanionTestInput(source, relative);
  const old = ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW;
  for (const pin of [row.before, old.before])
    if (Buffer.byteLength(source) === pin.bytes && digest(source) === pin.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_SIZE');
  assert.equal(digest(source), row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_WHOLE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION_WHOLE_INVERSE');
  return source;
}

// TEST INPUT ONLY: exact actual592 outer inverse restores the entire issued591
// retention caller before unchanged590/745/historical whole-source checks.
// Neither this view nor its fixed hashes grant original/runtime admission.
export const ASSISTANT591_RETENTION_COMPANION_TEST_REVIEW = Object.freeze({
  "path": "scripts/read-authenticated-dmi-current-companions.mjs",
  "before": {
    "bytes": 12840,
    "sha256": "13654b7e1af641622b85ebfcf756d70858c37993d4a1c0a8fd1a98b0904495b7"
  },
  "after": {
    "bytes": 13144,
    "sha256": "dc9417c1039b2b1e6dce8dbf2d461fd8fa23ef00d6dc42ffb9d98e19f4997ef5"
  },
  "hunks": [
    [
      "import {readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';",
      "import {readAuthenticatedFrozen590Predecessor,assertAuthenticatedFrozen590Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';\nimport {readAuthenticatedFrozen591Predecessor,assertAuthenticatedFrozen591Snapshot}\n  from './lib/authenticated-frozen586-predecessor.mjs';"
    ],
    [
      "const ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({",
      "const ACTIVE_PREDECESSOR=ACTIVE.sourcePhase==='assistant-public591-successor'?Object.freeze({\n  read:readAuthenticatedFrozen591Predecessor,snapshot:assertAuthenticatedFrozen591Snapshot,\n}):ACTIVE.sourcePhase==='assistant-public590-successor'?Object.freeze({"
    ]
  ]
});
export function inverseAssistant591RetentionCompanionTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_TYPE');
  const row = ASSISTANT591_RETENTION_COMPANION_TEST_REVIEW;
  assert.equal(relative, row.path, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_PATH');
  source = source.replace(/\r\n/g, '\n');
  if (Buffer.byteLength(source) === row.before.bytes && digest(source) === row.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_SIZE');
  assert.equal(digest(source), row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_WHOLE');
  for (const [before, after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_HUNK');
    source = source.replace(after, () => before);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_BEFORE_SIZE');
  assert.equal(digest(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT591_RETENTION_WHOLE_INVERSE');
  return source;
}
