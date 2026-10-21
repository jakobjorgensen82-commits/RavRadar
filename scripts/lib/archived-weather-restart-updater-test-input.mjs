// TEST INPUT ONLY: whole D8 -> 8b archived-restart delta, never a production adapter.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const bytes=fs.readFileSync(new URL('./archived-weather-restart-updater-test-input.json',import.meta.url),'utf8').replaceAll('\r\n','\n');
assert.equal(sha(bytes),'8c2b48b2e89e01012bdc9c11ebf9bd171dcd46c84613ea8378f7db5bee370937',
  'ARCHIVED_RESTART_TEST_INPUT_REVIEW_CHANGED');
const review=JSON.parse(bytes);
// The memory-lifetime fix is unbound caller code. Preserve the whole genuine
// 954 updater before applying any unchanged archived/C/epoch source oracle.
export const WEATHER_EXPORT_MEMORY_UPDATER_REVIEW=Object.freeze({
  before:Object.freeze({sha256:'6978aaa62fd8126f460913ed9ee428e4cb6da8f146bcf4146d6ee69e170f88a6',bytes:243322}),
  after:Object.freeze({sha256:'b577603494b3f33f7f521b6132d56b025208ebf6296d6e9636d43349575ad901',bytes:243951}),
  hunks:Object.freeze([
    [
      "function reportWeatherBuildStage(stage, details = {}) {\n  const now = Date.now();\n  console.log(JSON.stringify({\n    kind: 'weather-build-stage',\n    stage,\n    stageSeconds: round((now - weatherBuildPreviousStageAt) / 1000, 3),\n    totalSeconds: round((now - weatherBuildStartedAt) / 1000, 3),\n    ...details,\n  }));\n  weatherBuildPreviousStageAt = now;\n}",
      "function reportWeatherBuildStage(stage, details = {}) {\n  const now = Date.now();\n  const memory = process.memoryUsage();\n  console.log(JSON.stringify({\n    kind: 'weather-build-stage',\n    stage,\n    stageSeconds: round((now - weatherBuildPreviousStageAt) / 1000, 3),\n    totalSeconds: round((now - weatherBuildStartedAt) / 1000, 3),\n    memoryBytes: {\n      rss: memory.rss, heapTotal: memory.heapTotal, heapUsed: memory.heapUsed,\n      external: memory.external, arrayBuffers: memory.arrayBuffers,\n    },\n    ...details,\n  }));\n  weatherBuildPreviousStageAt = now;\n}",
    ],
    [
      'const persistedDmiPartRows = archivedRestartInputs !== null ? archivedRestartInputs.persistedDmiPartRows',
      'let persistedDmiPartRows = archivedRestartInputs !== null ? archivedRestartInputs.persistedDmiPartRows',
    ],
    [
      "  nextDmiForecastStore.partContinuity = await packDmiPartContinuity(\n    coastalPartScoreBuild.selectedDmiPartRecords,\n    activeParts,\n    generatedAt,\n  );\n}",
      "  nextDmiForecastStore.partContinuity = await packDmiPartContinuity(\n    coastalPartScoreBuild.selectedDmiPartRecords,\n    activeParts,\n    generatedAt,\n  );\n  // The complete, hash-bound continuity pack now owns the persisted bytes.\n  // Retire only this caller's finished working references before finalization\n  // and public projection; never clear shared maps or mutate original rows.\n  coastalPartScoreBuild.selectedDmiPartRecords = null;\n  persistedDmiPartRows = null;\n}",
    ],
    [
      "      partResults: coastalPartScoreBuild?.establishedNativeCurrentPartResults,\n    });\n}\n// Byg først de offentlige, begrænsede timefiler fra den komplette beregning i",
      "      partResults: coastalPartScoreBuild?.establishedNativeCurrentPartResults,\n    });\n}\nreportWeatherBuildStage('current-origin-ready');\n// Byg først de offentlige, begrænsede timefiler fra den komplette beregning i",
    ],
    [
      '  const publicRuntime = await writePublicRuntimeFromFull(output);\n  publicHourPack = await buildPrivatePublicHourDeliveryPack({',
      "  const publicRuntime = await writePublicRuntimeFromFull(output);\n  reportWeatherBuildStage('public-runtime-ready');\n  publicHourPack = await buildPrivatePublicHourDeliveryPack({",
    ],
  ].map(Object.freeze)),
});
// TEST INPUT ONLY. Exact whole native-original producer delta before the
// existing archived/memory/epoch/relocation oracles. This never projects input
// for actual continuity/PUBLIC/native/B-S cases or grants runtime admission.
export const CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW = Object.freeze({
  "schemaVersion": 1,
  "kind": "TEST_ONLY_EXACT_NATIVE_ORIGINAL_PRODUCER_INVERSE",
  "rows": [
    {
      "path": "scripts/update-weather.mjs",
      "before": {
        "bytes": 243951,
        "sha256": "b577603494b3f33f7f521b6132d56b025208ebf6296d6e9636d43349575ad901"
      },
      "after": {
        "bytes": 250094,
        "sha256": "e4a3e26e3d010f6389bcba76ecf7ee0962852aeca17e06c3b5b6deed0bfb455d"
      },
      "historicalPassThrough": [
        {
          "bytes": 239377,
          "sha256": "039ac65c779fe3eb8dbc870c00b0af30b33f9333c7cd542492ee40595c6eac77"
        },
        {
          "bytes": 243322,
          "sha256": "6978aaa62fd8126f460913ed9ee428e4cb6da8f146bcf4146d6ee69e170f88a6"
        }
      ],
      "edits": [
        {
          "offset": 2671,
          "after": "import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';\nimport { readCurrentPrivateRuntimeCompanions } from './read-authenticated-dmi-current-companions.mjs';",
          "before": "import { readDmiBulkDocument } from './lib/dmi-bulk-storage.mjs';"
        },
        {
          "offset": 3330,
          "after": "import { createProtectedDmiNativeCurrentInspector, buildProtectedDmiNativeCurrentProofs } from './lib/protected-dmi-native-current-proofs.mjs';",
          "before": "import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';"
        },
        {
          "offset": 95690,
          "after": "// BEGIN normal PART native-original continuity\nfunction assertDmiPartNativeProofBankDomain(bank, part) {\n  if (bank === null) return;\n  if (!Array.isArray(bank?.contexts) || !Array.isArray(bank?.nativeRows)\n    || !Array.isArray(bank?.selections) || bank.selections.length > DMI_FORECAST_HOURS\n    || bank.nativeRows.length > 2 * bank.selections.length\n    || bank.contexts.length > bank.nativeRows.length\n    || bank.contexts.some(row => row?.value?.partId !== part.partId)\n    || bank.selections.some(row => row?.partId !== part.partId)) {\n    throw new Error('DMI_PART_NATIVE_ORIGINAL_BANK_DOMAIN_INVALID');\n  }\n}\nfunction selectedDirectDmiNativeRows(hourly) {\n  return hourly.filter(row => row?.currentStateOnlyHold == null\n    && row?.sources?.current?.provider === 'dmi'\n    && row.sources.current.vectorSemanticsVersion === 3\n    && ['currentUMps', 'currentVMps', 'currentSpeedMps', 'currentDirectionDeg']\n      .some(key => ravScoreNumber(row[key]) !== null));\n}\nfunction buildSelectedDmiPartNativeProofBank(part, record, contexts, previousBank = null) {\n  assertDmiPartNativeProofBankDomain(previousBank, part);\n  if (!Array.isArray(record?.hourly) || record.hourly.length !== DMI_FORECAST_HOURS) {\n    throw new Error('DMI_PART_NATIVE_ORIGINAL_RECORD_INVALID');\n  }\n  // One normal batch over the RAW selected record, before proxy/regional V4.\n  // previousBank is actual saved native/context evidence, never a PASS marker.\n  const selections = selectedDirectDmiNativeRows(record.hourly).map(row => ({ part, row }));\n  const bank = buildProtectedDmiNativeCurrentProofs({ selections,\n    contexts: contexts.filter(Boolean), previousBank });\n  return selections.length ? bank : null;\n}\nfunction assertSelectedDmiNativeOriginalsBeforeScore({ part, publicHourly, publicBank,\n  publicContexts, recoverySources, forwardStartAt, targetReferenceAt }) {\n  const targetMs = Date.parse(targetReferenceAt), fromMs = Date.parse(forwardStartAt);\n  if (!Number.isFinite(fromMs) || !Number.isFinite(targetMs) || fromMs > targetMs) {\n    throw new Error('DMI_PART_NATIVE_ORIGINAL_FORWARD_WINDOW_INVALID');\n  }\n  const inspectRows = (rows, contexts, bank) => {\n    assertDmiPartNativeProofBankDomain(bank, part);\n    const inspector = createProtectedDmiNativeCurrentInspector({ contexts: contexts.filter(Boolean), previousBank: bank });\n    for (const row of selectedDirectDmiNativeRows(rows)) {\n      const proof = inspector.inspect({ part, row });\n      if (!proof.ok) {\n        const error = new Error('DMI_PART_NATIVE_ORIGINAL_BEFORE_SCORE_UNPROVED');\n        error.nativeOriginalProofCode = /^DMI_NATIVE_PROOF_[A-Z_]{1,80}$/.test(proof.code)\n          ? proof.code : 'DMI_NATIVE_PROOF_INVALID';\n        throw error;\n      }\n    }\n  };\n  // Public rows are the exact <=118 input passed to production below, not raw\n  // losers. Historical rows are the actual priority-projected forward window.\n  inspectRows(publicHourly, publicContexts, publicBank);\n  for (const source of recoverySources) {\n    inspectRows(source.record.hourly.filter(row => Date.parse(row.time) > fromMs\n      && Date.parse(row.time) < targetMs), source.nativeCurrentContexts ?? [],\n    source.nativeCurrentOriginals?.bank ?? null);\n  }\n  // HOLD/V4/reserve admission stays with the unchanged normal pipeline. No\n  // bank is made from these rows or used to upgrade unknown grid sampling.\n}\n// END normal PART native-original continuity\n\nfunction scoreCoastalPartsRuntime(\n",
          "before": "function scoreCoastalPartsRuntime(\n"
        },
        {
          "offset": 99741,
          "after": "  archivedWeatherRestartView = null,\n  protectedCompanionContexts = [],\n) {\n  if (!Array.isArray(protectedCompanionContexts) || protectedCompanionContexts.length > 2) {\n    throw new Error('DMI_PART_NATIVE_ORIGINAL_COMPANION_BOUND');\n  }\n  // A separately authenticated, archived epoch",
          "before": "  archivedWeatherRestartView = null,\n) {\n  // A separately authenticated, archived epoch"
        },
        {
          "offset": 102695,
          "after": "  // Original companions of OLD B never cross an isolated first-active view.\n  if (stateEpochView !== null || coldInputs !== null) protectedCompanionContexts = [];\n  const calculationBootstrapMode = coldInputs?.candidateGBootstrapMode ?? (stateEpochView !== null",
          "before": "  const calculationBootstrapMode = coldInputs?.candidateGBootstrapMode ?? (stateEpochView !== null"
        },
        {
          "offset": 105493,
          "after": "  const selectedDmiPartRecords = new Map();\n  const selectedDmiPartNativeProofs = new Map();",
          "before": "  const selectedDmiPartRecords = new Map();"
        },
        {
          "offset": 113610,
          "after": "      const persistedNativeOriginals = initialSelection.source === 'POINT_ACTIVATION'\n        ? null : persistedDmiPartRows.get(part.partId)?.nativeCurrentOriginals ?? null;\n      const nativeOriginalContexts = (initialSelection.source === 'POINT_ACTIVATION'\n        ? [bulkCache] : [bulkCache, deployedBulkCache, historicalDmiBulkCache,\n          ...protectedCompanionContexts]).filter(Boolean);\n      const dmiRecord = buildPartDmiForecastWithProtectedRetention(feature, bulkCache,\n        initialSelection.source",
          "before": "      const dmiRecord = buildPartDmiForecastWithProtectedRetention(feature, bulkCache,\n        initialSelection.source"
        },
        {
          "offset": 114281,
          "after": "        currentDecoderTransitionPart: { ...part, zoneId },\n        nativeCurrentOriginals: persistedNativeOriginals,\n        protectedCompanionContexts: initialSelection.source === 'POINT_ACTIVATION'\n          ? [] : protectedCompanionContexts,\n        persistedHourly:",
          "before": "        currentDecoderTransitionPart: { ...part, zoneId },\n        persistedHourly:"
        },
        {
          "offset": 115179,
          "after": "      selectedDmiPartRecords.set(part.partId, dmiRecord);\n      const selectedDmiPartNativeBank = buildSelectedDmiPartNativeProofBank(\n        { ...part, zoneId }, dmiRecord, nativeOriginalContexts, persistedNativeOriginals?.bank ?? null,\n      );\n      selectedDmiPartNativeProofs.set(part.partId, selectedDmiPartNativeBank);\n      const operationalDmiRecord",
          "before": "      selectedDmiPartRecords.set(part.partId, dmiRecord);\n      const operationalDmiRecord"
        },
        {
          "offset": 121138,
          "after": "      const protectedCurrentContexts = [deployedBulkCache, historicalDmiBulkCache, ...protectedCompanionContexts];",
          "before": "      const protectedCurrentContexts = [deployedBulkCache, historicalDmiBulkCache];"
        },
        {
          "offset": 122014,
          "after": "            protectPreviousDmi: true,\n            nativeCurrentOriginals: persistedNativeOriginals, protectedCompanionContexts,\n          },\n        );",
          "before": "            protectPreviousDmi: true,\n          },\n        );"
        },
        {
          "offset": 122891,
          "after": "            nativeCurrentContexts: protectedCurrentContexts,\n            nativeCurrentOriginals: persistedNativeOriginals,\n            record: {",
          "before": "            nativeCurrentContexts: protectedCurrentContexts,\n            record: {"
        },
        {
          "offset": 126127,
          "after": "        assertSelectedDmiNativeOriginalsBeforeScore({\n          part: { ...part, zoneId }, publicBank: selectedDmiPartNativeBank,\n          publicContexts: nativeOriginalContexts, recoverySources,\n          forwardStartAt: initialSelection.state?.time ?? generatedAt,\n          targetReferenceAt: generatedAt,\n          publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n            && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n        });\n        productionSeries = buildRavScoreProductionPartSeries({",
          "before": "        productionSeries = buildRavScoreProductionPartSeries({"
        },
        {
          "offset": 150707,
          "after": "    selectedDmiPartRecords,\n    selectedDmiPartNativeProofs,\n    establishedNativeCurrentPartResults,",
          "before": "    selectedDmiPartRecords,\n    establishedNativeCurrentPartResults,"
        },
        {
          "offset": 240133,
          "after": "// OLD B native documents never cross an isolated first-active numeric view.\n// POINT_ACTIVATION also rejects them per PART inside scoreCoastalPartsRuntime.\n// Ordinary missing/changed B is an error, not a mutable working-file fallback.\nconst protectedNativeCurrentCompanionContexts = coastalPartsContract.enabled\n  && coldInputs === null && stateEpochView === null\n  ? await readCurrentPrivateRuntimeCompanions(generatedAt) : [];\nlet coastalPartScoreBuild;\ntry {\ncoastalPartScoreBuild = coastalPartsContract.enabled",
          "before": "let coastalPartScoreBuild;\ntry {\ncoastalPartScoreBuild = coastalPartsContract.enabled"
        },
        {
          "offset": 241413,
          "after": "    currentFamilyColdStart,\n    archivedWeatherRestartView,\n    protectedNativeCurrentCompanionContexts,\n  )",
          "before": "    currentFamilyColdStart,\n    archivedWeatherRestartView,\n  )"
        },
        {
          "offset": 241880,
          "after": "    coastalPartScoreBuild.selectedDmiPartRecords,\n    activeParts,\n    generatedAt,\n    { nativeCurrentProofsByPart: coastalPartScoreBuild.selectedDmiPartNativeProofs },\n  );",
          "before": "    coastalPartScoreBuild.selectedDmiPartRecords,\n    activeParts,\n    generatedAt,\n  );"
        },
        {
          "offset": 242287,
          "after": "  coastalPartScoreBuild.selectedDmiPartRecords = null;\n  coastalPartScoreBuild.selectedDmiPartNativeProofs = null;\n  persistedDmiPartRows = null;",
          "before": "  coastalPartScoreBuild.selectedDmiPartRecords = null;\n  persistedDmiPartRows = null;"
        }
      ]
    },
    {
      "path": "scripts/lib/private-dmi-recovery-record.mjs",
      "before": {
        "bytes": 38840,
        "sha256": "b9ac7f619cc418d7af79ecec4aad52e0e22294dcc6dcf2afb659daa88aa7f516"
      },
      "after": {
        "bytes": 39708,
        "sha256": "7a967fb362304bcaa0590fccc7bab19092a3bcee013aa9682ce0afc3cf3f7e1b"
      },
      "historicalPassThrough": [],
      "edits": [
        {
          "offset": 752,
          "after": "import { createProtectedDmiNativeCurrentInspector } from './protected-dmi-native-current-proofs.mjs';\nimport { nativeCurrentOriginalBankForPart } from './ravscore-recovery-source-priority.mjs';",
          "before": "import { createProtectedDmiNativeCurrentInspector } from './protected-dmi-native-current-proofs.mjs';"
        },
        {
          "offset": 16437,
          "after": "function publicCurrentDecoderTransition(part, contexts, nativeCurrentOriginals = null) {",
          "before": "function publicCurrentDecoderTransition(part, contexts) {"
        },
        {
          "offset": 16635,
          "after": "  // The unchanged saved wrapper is only per-PART native evidence, never a\n  // selection candidate, inferred original or new admission. Full indexBank\n  // validation and exact reprojection still happen inside the normal inspector.\n  const previousBank = nativeCurrentOriginalBankForPart({ nativeCurrentOriginals }, part);\n  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: contexts.filter(Boolean), previousBank });",
          "before": "  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: contexts.filter(Boolean) });"
        },
        {
          "offset": 20113,
          "after": "    protectPreviousDmi = false, currentDecoderTransitionPart = null,\n    nativeCurrentOriginals = null, protectedCompanionContexts = [] },\n) {\n  if (!Array.isArray(protectedCompanionContexts) || protectedCompanionContexts.length > 2) {\n    throw new Error('DMI_PART_NATIVE_ORIGINAL_COMPANION_BOUND');\n  }\n  const currentDecoderTransition",
          "before": "    protectPreviousDmi = false, currentDecoderTransitionPart = null },\n) {\n  const currentDecoderTransition"
        },
        {
          "offset": 20572,
          "after": "      [activeBulkCache, protectedBulkCache, historicalBulkCache, ...protectedCompanionContexts],\n      nativeCurrentOriginals) : null;",
          "before": "      [activeBulkCache, protectedBulkCache, historicalBulkCache]) : null;"
        },
        {
          "offset": 23023,
          "after": "    protectPreviousDmi = false, nativeCurrentOriginals = null, protectedCompanionContexts = [] },\n) {\n  const startMs",
          "before": "    protectPreviousDmi = false },\n) {\n  const startMs"
        },
        {
          "offset": 24064,
          "after": "        protectPreviousDmi: true, nativeCurrentOriginals, protectedCompanionContexts,\n      })",
          "before": "        protectPreviousDmi: true,\n      })"
        }
      ]
    }
  ]
});

export function inverseCurrentNativeOriginalProducerTestInput(source, relative) {
  assert.equal(arguments.length, 2, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_ARGUMENTS');
  assert.equal(typeof source, 'string', 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_TYPE');
  const row = CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW.rows.find(item => item.path === relative);
  assert(row, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_PATH');
  const size = Buffer.byteLength(source), whole = sha(source);
  if ([row.before, ...row.historicalPassThrough].some(value => value.bytes === size && value.sha256 === whole)) return source;
  assert.equal(size, row.after.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_AFTER_SIZE');
  assert.equal(whole, row.after.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_AFTER_WHOLE');
  // Offsets are exact UTF-16 source-string offsets on the fully pinned input,
  // not search patterns, a parser, EOL normalization or a generic inverse.
  for (const edit of [...row.edits].reverse()) {
    assert.equal(source.slice(edit.offset, edit.offset + edit.after.length), edit.after,
      'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_HUNK');
    source = source.slice(0, edit.offset) + edit.before + source.slice(edit.offset + edit.after.length);
  }
  assert.equal(Buffer.byteLength(source), row.before.bytes, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_BEFORE_SIZE');
  assert.equal(sha(source), row.before.sha256, 'ALTERNATIVE_C_TEST_INPUT_CHANGED:NATIVE_ORIGINAL_WHOLE_INVERSE');
  return source;
}

export function inverseWeatherExportMemoryUpdater(input) {
  assert.equal(typeof input,'string');
  let source=inverseCurrentNativeOriginalProducerTestInput(input.replaceAll('\r\n','\n'), 'scripts/update-weather.mjs');
  // Preserve the two already-admitted historical inputs byte-for-byte.
  if(sha(source)===review.before.sha256 || sha(source)===WEATHER_EXPORT_MEMORY_UPDATER_REVIEW.before.sha256) return source;
  const memoryReview=WEATHER_EXPORT_MEMORY_UPDATER_REVIEW;
  assert.equal(sha(source),memoryReview.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED:WEATHER_EXPORT_MEMORY_WHOLE');
  assert.equal(Buffer.byteLength(source),memoryReview.after.bytes);
  for(const [before,after] of [...memoryReview.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'WEATHER_EXPORT_MEMORY_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(sha(source),memoryReview.before.sha256,'WEATHER_EXPORT_MEMORY_TEST_INPUT_WHOLE_INVERSE');
  assert.equal(Buffer.byteLength(source),memoryReview.before.bytes);
  return source;
}
export function inverseArchivedWeatherRestartUpdater(input) {
  assert.equal(typeof input,'string');
  let source=inverseWeatherExportMemoryUpdater(input);
  if(sha(source)===review.before.sha256) return source;
  assert.equal(sha(source),review.after.sha256,'ALTERNATIVE_C_TEST_INPUT_CHANGED:ARCHIVED_RESTART_WHOLE');
  assert.equal(Buffer.byteLength(source),review.after.bytes);
  for(const [before,after] of [...review.hunks].reverse()) {
    assert.equal(source.split(after).length,2,'ARCHIVED_RESTART_TEST_INPUT_HUNK');
    source=source.replace(after,()=>before);
  }
  assert.equal(sha(source),review.before.sha256,'ARCHIVED_RESTART_TEST_INPUT_WHOLE_INVERSE');
  assert.equal(Buffer.byteLength(source),review.before.bytes);
  return source;
}
