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
export function inverseAlternativeCCaller(source,relative) {
  assert.equal(typeof source,'string');
  const row=SOURCE_INPUTS.find(item=>item.path===relative);
  assert(row,'ALTERNATIVE_C_TEST_INPUT_PATH');
  source=source.replaceAll('\r\n','\n');
  if(digest(source)===row.before.sha256) return source;
  if(relative==='scripts/plan-ravscore-current-history.mjs') source=inversePlannerFirstFailure(inversePlannerOriginalDependency(source));
  if(relative==='scripts/update-weather.mjs') source=inverseArchivedWeatherRestartUpdater(source);
  assert.equal(digest(source),row.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED');
  for(const [before,after] of [...row.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'ALTERNATIVE_C_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(digest(source),row.before.sha256,'ALTERNATIVE_C_TEST_INPUT_WHOLE_INVERSE');
  return source;
}
