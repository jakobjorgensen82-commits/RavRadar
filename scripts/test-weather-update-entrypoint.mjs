import { inverseActiveFamilyRetentionCompanionTestInput, ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW,
  inverseAssistant590RetentionCompanionTestInput, ASSISTANT590_RETENTION_COMPANION_TEST_REVIEW,
  inverseAssistant591RetentionCompanionTestInput, ASSISTANT591_RETENTION_COMPANION_TEST_REVIEW,
} from './lib/alternative-c-caller-test-input.mjs';
import {inverseReviewedAccountStatisticsAssistantSourceScripts} from './lib/account-statistics-assistant-package-review.mjs';
import { inverseAlternativeCCaller, inverseAssistant587OriginalCompanionTestInput,
  ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW,
  inverseAssistant588OriginalCompanionTestInput, ASSISTANT588_ORIGINAL_COMPANION_TEST_REVIEW,
  inverseAssistant587OriginalRawBoundaryTestInput } from './lib/alternative-c-caller-test-input.mjs';
import { inverseWindTailCapacityUpdaterTestInput, WIND_TAIL_CAPACITY_UPDATER_TEST_REVIEW,
  inverseCurrentNativeOriginalProducerTestInput, CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW,
  inverseCurrentFamilyColdTargetTestInput }
  from './lib/archived-weather-restart-updater-test-input.mjs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeDmiForecastFileAtomic, isDmiForecastCheckpointStopUnproved } from './lib/dmi-forecast-file.mjs';
import { withFrozenNative0600TestSource } from './run-frozen-native0600-source-targets.mjs';
import { withFrozenEstablishedNativeCurrentOriginSourceTarget } from './run-frozen-established-native-current-origin-source-targets.mjs';

const producerPath = new URL('./update-weather.mjs', import.meta.url);
const sourceText = async file => {
  let source = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
  if (file instanceof URL && file.href === new URL('./lib/private-dmi-recovery-record.mjs', import.meta.url).href)
    source = inverseCurrentNativeOriginalProducerTestInput(source, 'scripts/lib/private-dmi-recovery-record.mjs');
  return file === producerPath ? inverseSavedCurrentForwardOriginalPlan(inverseAlternativeCCaller(source, 'scripts/update-weather.mjs')) : source;
};
const digest = value => crypto.createHash('sha256').update(value).digest('hex');

// Invert only the separately reviewed tuple import and archived-epoch orchestration before the
// older exact-source oracles. The complete genuine 903307 updater remains the
// immutable baseline; the actual epoch caller has its own normal-path tests.
// Additive exact inverse of the reviewed positive-origin CALLER integration.
// This is test source preservation, never an origin/native issuer. All older
// whole-source hashes and their mutation refusals below remain unchanged.
const establishedNativeCurrentUpdaterHunks = [
  {
    "before": "import { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';",
    "after": "import {\n  readEstablishedNativeCurrentOrigin,\n  buildEstablishedNativeCurrentOriginAttestation,\n} from './lib/established-native-current-origin.mjs';\nimport { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';"
  },
  {
    "before": "  stateEpochView = null,\n) {",
    "after": "  stateEpochView = null,\n  establishedNativeCurrentOrigin = null,\n) {"
  },
  {
    "before": "  const partRows = [];\n  const selectedDmiPartRecords = new Map();",
    "after": "  const partRows = [];\n  // Actual normal results stay private and retain their pipeline WeakMap\n  // identity. The finalizer checks their exact H0 pairs against output.\n  const establishedNativeCurrentPartResults = new Map();\n  const selectedDmiPartRecords = new Map();"
  },
  {
    "before": "        productionSeries = buildRavScoreProductionPartSeries({\n          requireNativeGridSampling: true,",
    "after": "        productionSeries = buildRavScoreProductionPartSeries({\n          establishedNativeCurrentOrigin,\n          requireNativeGridSampling: true,"
  },
  {
    "before": "        throw error;\n      }\n      const {\n        recovery,",
    "after": "        throw error;\n      }\n      if (establishedNativeCurrentOrigin !== null) {\n        if (establishedNativeCurrentPartResults.has(part.partId)) {\n          throw new Error('RAVSCORE_ESTABLISHED_NATIVE_CURRENT_RESULT_DUPLICATE');\n        }\n        establishedNativeCurrentPartResults.set(part.partId, productionSeries);\n      }\n      const {\n        recovery,"
  },
  {
    "before": "    selectedDmiPartRecords,\n    currentSourceDomainTransitions,",
    "after": "    selectedDmiPartRecords,\n    establishedNativeCurrentPartResults,\n    currentSourceDomainTransitions,"
  },
  {
    "before": "const coastalPartScoreBuild = coastalPartsContract.enabled\n",
    "after": "// Authenticate the installed immutable B/S and its working H0 pair before\n// scoring. This never derives origin from a caller flag, model hash or new\n// provider record, and does not rewrite the old conditions/GCM baseline.\nconst establishedNativeCurrentOrigin = coastalPartsContract.enabled\n  ? await readEstablishedNativeCurrentOrigin(coastalPartsContract)\n  : null;\nconst coastalPartScoreBuild = coastalPartsContract.enabled\n"
  },
  {
    "before": "    previous?.ravScoreCurrentSourceDomainTransitions ?? null,\n    stateEpochView,\n",
    "after": "    previous?.ravScoreCurrentSourceDomainTransitions ?? null,\n    stateEpochView,\n    establishedNativeCurrentOrigin,\n"
  },
  {
    "before": "// Byg først de offentlige, begrænsede timefiler fra den komplette beregning i\n",
    "after": "if (establishedNativeCurrentOrigin !== null) {\n  // Reissue explicitly from ALL actual successful normal part results and\n  // the final projected H0 pairs. Never copy/spread an old attestation or use\n  // the terminal forecast continuation in place of the current target pair.\n  output.privateEstablishedNativeCurrentOrigin =\n    await buildEstablishedNativeCurrentOriginAttestation(establishedNativeCurrentOrigin, {\n      centralContract: coastalPartsContract,\n      conditions: output,\n      partResults: coastalPartScoreBuild?.establishedNativeCurrentPartResults,\n    });\n}\n// Byg først de offentlige, begrænsede timefiler fra den komplette beregning i\n"
  }
];
// Exact diagnostic-only inverse before the unchanged historical callers.
const savedCurrentReplayUpdaterHunks = [
  {
    "before": "  buildEstablishedNativeCurrentOriginAttestation,\n} from './lib/established-native-current-origin.mjs';\nimport { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';\nimport {\n  buildNewestValidRavScoreRecoverySources,\n  summarizeIsolatedRavScoreWaveReplayConflicts,\n",
    "after": "  buildEstablishedNativeCurrentOriginAttestation,\n} from './lib/established-native-current-origin.mjs';\nimport { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';\nimport { summarizeSavedCurrentReplayGridFailure } from './lib/saved-current-replay-grid-audit.mjs';\nimport {\n  buildNewestValidRavScoreRecoverySources,\n  summarizeIsolatedRavScoreWaveReplayConflicts,\n"
  },
  {
    "before": "    throw new Error('Coastal-point activation-state injection contains a non-active part');\n  }\n  const expectedByZone = new Map();\n  const partRows = [];\n  // Actual normal results stay private and retain their pipeline WeakMap\n  // identity. The finalizer checks their exact H0 pairs against output.\n",
    "after": "    throw new Error('Coastal-point activation-state injection contains a non-active part');\n  }\n  const expectedByZone = new Map();\n  const savedCurrentReplayDiagnostic = process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n    ? { firstError: null, observedParts: 0, gridUnknownParts: 0 } : null;\n  try {\n  const partRows = [];\n  // Actual normal results stay private and retain their pipeline WeakMap\n  // identity. The finalizer checks their exact H0 pairs against output.\n"
  },
  {
    "before": "      });\n      let productionSeries;\n      try {\n        productionSeries = buildRavScoreProductionPartSeries({\n          establishedNativeCurrentOrigin,\n          requireNativeGridSampling: true,\n",
    "after": "      });\n      let productionSeries;\n      try {\n        if (savedCurrentReplayDiagnostic) savedCurrentReplayDiagnostic.observedParts++;\n        productionSeries = buildRavScoreProductionPartSeries({\n          establishedNativeCurrentOrigin,\n          requireNativeGridSampling: true,\n"
  },
  {
    "before": "            ),\n        });\n      } catch (error) {\n        if (error?.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY') {\n          // Diagnostic only: unchanged normal reconstruction and original throw.\n          // No private values, points, source identities or timestamps leave it.\n",
    "after": "            ),\n        });\n      } catch (error) {\n        if (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n          && error?.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' && error.samplingStatus === 'unknown') {\n          // Observation only of this ACTUAL normal call. Preserve first error,\n          // every source/guard, the whole old H0 pair and all numeric output.\n          try {\n            console.error('RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT ' + JSON.stringify(summarizeSavedCurrentReplayGridFailure({\n              error, part: { ...part, zoneId }, initialSelection, targetReferenceAt: generatedAt,\n              recoverySources, establishedNativeCurrentOrigin,\n            })));\n          } catch { console.error('RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT_UNAVAILABLE'); }\n          savedCurrentReplayDiagnostic.firstError ??= error;\n          savedCurrentReplayDiagnostic.gridUnknownParts++;\n          // Continue only this private diagnosis to the next normally built\n          // PART input. There is no fabricated result, state or retry. The\n          // SAME first error is rethrown before any output/finalizer below.\n          continue;\n        }\n        if (error?.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY') {\n          // Diagnostic only: unchanged normal reconstruction and original throw.\n          // No private values, points, source identities or timestamps leave it.\n"
  },
  {
    "before": "    }\n  }\n\n  // Aggregate fixed component labels only; never log a private part, hour,\n  // value or source identity when an unproved same-run refresh is retained.\n  console.log(`RAVSCORE_PROTECTED_SAME_RUN_DMI_RETAINED ${JSON.stringify(protectedSameRunDmiRetentions)}`);\n",
    "after": "    }\n  }\n\n  if (savedCurrentReplayDiagnostic?.firstError) throw savedCurrentReplayDiagnostic.firstError;\n\n  // Aggregate fixed component labels only; never log a private part, hour,\n  // value or source identity when an unproved same-run refresh is retained.\n  console.log(`RAVSCORE_PROTECTED_SAME_RUN_DMI_RETAINED ${JSON.stringify(protectedSameRunDmiRetentions)}`);\n"
  },
  {
    "before": "      ? null\n      : buildPrivateCandidateGWarmupRuntime(candidateGRollbackRuntime),\n  };\n}\n\n// Shared recovery record: collections\n",
    "after": "      ? null\n      : buildPrivateCandidateGWarmupRuntime(candidateGRollbackRuntime),\n  };\n  } catch (error) {\n    if (savedCurrentReplayDiagnostic?.firstError) {\n      console.error('RAVSCORE_SAVED_CURRENT_REPLAY_COLLECTION ' + JSON.stringify({\n        schemaVersion: 1, kind: 'SAVED_CURRENT_REPLAY_COLLECTION',\n        observedParts: savedCurrentReplayDiagnostic.observedParts,\n        gridUnknownParts: savedCurrentReplayDiagnostic.gridUnknownParts,\n        anotherGuardStoppedCollection: error !== savedCurrentReplayDiagnostic.firstError,\n        scope: 'NORMAL_CALLS_REACHED_BEFORE_FIRST_OTHER_STOP',\n        allPartsReached: savedCurrentReplayDiagnostic.observedParts === Number(contract?.partCount),\n        allRowsActuallyConsumed: false, minimalNecessaryOriginalsProved: false,\n        continuationIssued: false, publicationInvoked: false, productionAuthority: false,\n      }));\n      throw savedCurrentReplayDiagnostic.firstError;\n    }\n    throw error;\n  }\n}\n\n// Shared recovery record: collections\n"
  },
  {
    "before": "const establishedNativeCurrentOrigin = coastalPartsContract.enabled\n  ? await readEstablishedNativeCurrentOrigin(coastalPartsContract)\n  : null;\nconst coastalPartScoreBuild = coastalPartsContract.enabled\n  ? scoreCoastalPartsRuntime(\n    coastalPartsContract,\n",
    "after": "const establishedNativeCurrentOrigin = coastalPartsContract.enabled\n  ? await readEstablishedNativeCurrentOrigin(coastalPartsContract)\n  : null;\nif (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n  && establishedNativeCurrentOrigin === null) throw new Error('SAVED_CURRENT_REPLAY_ORIGIN_REQUIRED');\nconst coastalPartScoreBuild = coastalPartsContract.enabled\n  ? scoreCoastalPartsRuntime(\n    coastalPartsContract,\n"
  }
];
// Exact default-OFF private original-plan view, before every old oracle.
// This is only a source inverse: no origin, sampling, restore or publication grant.
const savedCurrentForwardOriginalPlanUpdaterHunks = [
  {
    "before": "} from './lib/established-native-current-origin.mjs';\nimport { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';\nimport { summarizeSavedCurrentReplayGridFailure } from './lib/saved-current-replay-grid-audit.mjs';\nimport {\n  buildNewestValidRavScoreRecoverySources,\n  summarizeIsolatedRavScoreWaveReplayConflicts,\n",
    "after": "} from './lib/established-native-current-origin.mjs';\nimport { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';\nimport { summarizeSavedCurrentReplayGridFailure } from './lib/saved-current-replay-grid-audit.mjs';\nimport { createSavedCurrentForwardOriginalPlan, persistSavedCurrentForwardOriginalPlan }\n  from './lib/saved-current-forward-original-plan.mjs';\nimport {\n  buildNewestValidRavScoreRecoverySources,\n  summarizeIsolatedRavScoreWaveReplayConflicts,\n"
  },
  {
    "before": "    throw new Error('Coastal-point activation-state injection contains a non-active part');\n  }\n  const expectedByZone = new Map();\n  const savedCurrentReplayDiagnostic = process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n    ? { firstError: null, observedParts: 0, gridUnknownParts: 0 } : null;\n  try {\n",
    "after": "    throw new Error('Coastal-point activation-state injection contains a non-active part');\n  }\n  const expectedByZone = new Map();\n  const savedCurrentForwardOriginalPlan = createSavedCurrentForwardOriginalPlan({\n    establishedNativeCurrentOrigin, targetReferenceAt: generatedAt, expectedPartCount: Number(contract?.partCount),\n  });\n  const savedCurrentReplayDiagnostic = process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n    ? { firstError: null, observedParts: 0, gridUnknownParts: 0 } : null;\n  try {\n"
  },
  {
    "before": "        },\n      });\n      let productionSeries;\n      try {\n        if (savedCurrentReplayDiagnostic) savedCurrentReplayDiagnostic.observedParts++;\n        productionSeries = buildRavScoreProductionPartSeries({\n",
    "after": "        },\n      });\n      let productionSeries;\n      savedCurrentForwardOriginalPlan?.observe({ part: { ...part, zoneId }, initialSelection,\n        targetReferenceAt: generatedAt, recoverySources, liveCurrentPilot });\n      try {\n        if (savedCurrentReplayDiagnostic) savedCurrentReplayDiagnostic.observedParts++;\n        productionSeries = buildRavScoreProductionPartSeries({\n"
  },
  {
    "before": "              { projection: 'candidate-g-legacy-quantized', requireNativeGridSampling: true, expectedHold },\n            ),\n        });\n      } catch (error) {\n        if (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n          && error?.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' && error.samplingStatus === 'unknown') {\n          // Observation only of this ACTUAL normal call. Preserve first error,\n          // every source/guard, the whole old H0 pair and all numeric output.\n          try {\n            console.error('RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT ' + JSON.stringify(summarizeSavedCurrentReplayGridFailure({\n              error, part: { ...part, zoneId }, initialSelection, targetReferenceAt: generatedAt,\n",
    "after": "              { projection: 'candidate-g-legacy-quantized', requireNativeGridSampling: true, expectedHold },\n            ),\n        });\n        savedCurrentForwardOriginalPlan?.passed(part.partId);\n      } catch (error) {\n        if (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n          && error?.code === 'DMI_GRID_SAMPLING_APPLICABILITY_REQUIRED' && error.samplingStatus === 'unknown') {\n          // Observation only of this ACTUAL normal call. Preserve first error,\n          // every source/guard, the whole old H0 pair and all numeric output.\n          if (!savedCurrentForwardOriginalPlan) {\n          try {\n            console.error('RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT ' + JSON.stringify(summarizeSavedCurrentReplayGridFailure({\n              error, part: { ...part, zoneId }, initialSelection, targetReferenceAt: generatedAt,\n"
  },
  {
    "before": "              }),\n            })));\n          } catch { console.error('RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT_UNAVAILABLE'); }\n          savedCurrentReplayDiagnostic.firstError ??= error;\n          savedCurrentReplayDiagnostic.gridUnknownParts++;\n          // Continue only this private diagnosis to the next normally built\n          // PART input. There is no fabricated result, state or retry. The\n          // SAME first error is rethrown before any output/finalizer below.\n",
    "after": "              }),\n            })));\n          } catch { console.error('RAVSCORE_SAVED_CURRENT_REPLAY_AUDIT_UNAVAILABLE'); }\n          }\n          savedCurrentReplayDiagnostic.firstError ??= error;\n          savedCurrentReplayDiagnostic.gridUnknownParts++;\n          savedCurrentForwardOriginalPlan?.refused(part.partId, error);\n          // Continue only this private diagnosis to the next normally built\n          // PART input. There is no fabricated result, state or retry. The\n          // SAME first error is rethrown before any output/finalizer below.\n"
  },
  {
    "before": "    }\n  }\n\n  if (savedCurrentReplayDiagnostic?.firstError) throw savedCurrentReplayDiagnostic.firstError;\n\n  // Aggregate fixed component labels only; never log a private part, hour,\n",
    "after": "    }\n  }\n\n  if (savedCurrentForwardOriginalPlan && !savedCurrentReplayDiagnostic?.firstError) {\n    throw new Error('SAVED_CURRENT_FORWARD_ORIGINAL_PLAN_NO_STOP');\n  }\n  if (savedCurrentReplayDiagnostic?.firstError)\n    savedCurrentForwardOriginalPlan?.seal(savedCurrentReplayDiagnostic.firstError, savedCurrentReplayDiagnostic);\n  if (savedCurrentReplayDiagnostic?.firstError) throw savedCurrentReplayDiagnostic.firstError;\n\n  // Aggregate fixed component labels only; never log a private part, hour,\n"
  },
  {
    "before": "  : null;\nif (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n  && establishedNativeCurrentOrigin === null) throw new Error('SAVED_CURRENT_REPLAY_ORIGIN_REQUIRED');\nconst coastalPartScoreBuild = coastalPartsContract.enabled\n  ? scoreCoastalPartsRuntime(\n    coastalPartsContract,\n    features,\n",
    "after": "  : null;\nif (process.env.RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC === '39066350748-1'\n  && establishedNativeCurrentOrigin === null) throw new Error('SAVED_CURRENT_REPLAY_ORIGIN_REQUIRED');\nlet coastalPartScoreBuild;\ntry {\ncoastalPartScoreBuild = coastalPartsContract.enabled\n  ? scoreCoastalPartsRuntime(\n    coastalPartsContract,\n    features,\n"
  },
  {
    "before": "    establishedNativeCurrentOrigin,\n  )\n  : null;\nif (coastalPartScoreBuild) {\n  nextDmiForecastStore.partContinuity = await packDmiPartContinuity(\n    coastalPartScoreBuild.selectedDmiPartRecords,\n",
    "after": "    establishedNativeCurrentOrigin,\n  )\n  : null;\n} catch (error) {\n  if (process.env.RAVRADAR_SAVED_CURRENT_FORWARD_ORIGINAL_PLAN) {\n    try { await persistSavedCurrentForwardOriginalPlan(error); }\n    catch { console.error('SAVED_CURRENT_FORWARD_ORIGINAL_PLAN_UNAVAILABLE'); }\n  }\n  throw error;\n}\nif (coastalPartScoreBuild) {\n  nextDmiForecastStore.partContinuity = await packDmiPartContinuity(\n    coastalPartScoreBuild.selectedDmiPartRecords,\n"
  }
];
function inverseSavedCurrentForwardOriginalPlan(source) {
  // Historical VM and Function callers supply their genuine SHA-256 dependency.
  // Keep the inverse pure; an isolated reader must not require ambient process.
  const whole = digest;
  const expected = '4e5b24d8f535c6074a6612b402157b8426b08ef20e507d9817b47d45bb32b034';
  if (whole(source) === expected) return source;
  for (const hunk of [...savedCurrentForwardOriginalPlanUpdaterHunks].reverse()) {
    assert.equal(source.split(hunk.after).length, 2, 'exact default-OFF original-plan updater hunk required');
    source = source.replace(hunk.after, () => hunk.before);
  }
  assert.equal(whole(source), expected, 'whole FFD updater before every old inverse');
  return source;
}
// Additive diagnostic input inverse; the whole153 and older oracles below stay unchanged.
const savedCurrentForwardGateHunk = {
  before: "              recoverySources, establishedNativeCurrentOrigin,\n            })));",
  after: "              recoverySources, establishedNativeCurrentOrigin,\n              fallbackSource: deployedRecoverySource, preferredSource: progressiveRecoverySource,\n              persistedHourly: persistedDmiPartRows.get(part.partId)?.hourly ?? [],\n              publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n                && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n              replayCandidate: (sourceRecords, publicHourly) => buildRavScoreRecoveryReplay({\n                part: { ...part, zoneId }, initialState: initialSelection.state,\n                targetReferenceAt: generatedAt, sourceRecords, publicHourly,\n                nativeCadenceHoldHours, requireNativeGridSampling: true, liveCurrentPilot,\n              }),\n            })));",
};
function inverseSavedCurrentForwardGate(source) {
  // Raw current input is whole-checked by the normal loader. Once projected,
  // historical mutations must reach their unchanged own layer and refusal.
  if (source.includes('savedCurrentForwardOriginalPlan')
    || source.includes('createSavedCurrentForwardOriginalPlan')) {
    source = inverseSavedCurrentForwardOriginalPlan(source);
  }
  assert.equal(source.split(savedCurrentForwardGateHunk.after).length, 2, 'exact forward gate diagnostic hunk required');
  return source.replace(savedCurrentForwardGateHunk.after, () => savedCurrentForwardGateHunk.before);
}
function inverseSavedCurrentReplayUpdater(source) {
  if (source.includes('fallbackSource: deployedRecoverySource, preferredSource: progressiveRecoverySource,'))
    source = inverseSavedCurrentForwardGate(source);
  for (const hunk of [...savedCurrentReplayUpdaterHunks].reverse()) {
    assert.equal(source.split(hunk.after).length, 2, 'each exact replay diagnostic hunk must occur once; exact reviewed positive-origin hunk context required');
    source = source.replace(hunk.after, () => hunk.before);
  }
  return source;
}
function inverseEstablishedNativeCurrentUpdater(source) {
  if (source.includes('RAVRADAR_SAVED_CURRENT_REPLAY_DIAGNOSTIC')) source = inverseSavedCurrentReplayUpdater(source);
  for (const hunk of [...establishedNativeCurrentUpdaterHunks].reverse()) {
    assert.equal(source.split(hunk.after).length, 2,
      'each exact reviewed positive-origin hunk must occur once');
    source = source.replace(hunk.after, () => hunk.before);
  }
  return source;
}

function inverseWeatherStateEpochIntegration(source) {
  source = inverseEstablishedNativeCurrentUpdater(source);
  // Remove only the diagnostic import/catch before every genuine historical oracle.
  // This issues no new product hash and preserves the original guard and throw.
  for (const diagnosticHunk of [
    "import { summarizeRavScoreInitialCurrentWindow } from './lib/ravscore-initial-current-window-audit.mjs';\n",
    "        if (error?.code === 'RAVSCORE_INITIAL_CURRENT_NEW_USE_NOT_READY') {\n          // Diagnostic only: unchanged normal reconstruction and original throw.\n          // No private values, points, source identities or timestamps leave it.\n          try {\n            const diagnosis = summarizeRavScoreInitialCurrentWindow({\n              part: { ...part, zoneId }, zone, initialSelection,\n              previousCandidateGContinuation, recoverySources,\n              liveCurrentPilot, nativeCadenceHoldHours,\n            });\n            console.error('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT ' + JSON.stringify(diagnosis));\n          } catch {\n            console.error('RAVSCORE_INITIAL_CURRENT_WINDOW_AUDIT_UNAVAILABLE');\n          }\n        }\n",
  ]) {
    assert.equal(source.split(diagnosticHunk).length, 2,
      'each exact reviewed current-window diagnostic hunk must occur once');
    source = source.replace(diagnosticHunk, '');
  }
  // Only the four reviewed scalar-orchestration hunks are removed before
  // every unchanged historical whole-source oracle below.
  const scalarHunks = [
    [
      "// The once-only epoch may retain independently verified scalar weather, never\n// OLD current or replay state. This pure adapter keeps the ordinary component\n// selector, exact PART identity and T+3 support; originals stay untouched.\nfunction weatherStateEpochScalarHourly(record, partId, componentInputs,\n  { generatedAt, startAt, expectedIdentity }) {\n  const scalar = componentInputs.weatherStateEpochScalarPartRecords?.get(partId);\n  if (!scalar) return record.hourly;\n  return mergeHourlyPreferDmi(record.hourly, withoutCurrent(scalar).hourly,\n    { generatedAt, startAt, expectedIdentity });\n}\n\nfunction preflightFeggesundOperationalWaveReadiness({",
      "function preflightFeggesundOperationalWaveReadiness({"
    ],
    [
      "    if (componentInputs.weatherStateEpochScalarPartRecords) {\n      dmiRecord.hourly = weatherStateEpochScalarHourly(dmiRecord, part.partId,\n        componentInputs, { generatedAt, startAt: forecastStartAt, expectedIdentity });\n    }\n    const operationalRecord = applyFeggesundOperationalWaveProxy(\n      dmiRecord,",
      "    const operationalRecord = applyFeggesundOperationalWaveProxy(\n      dmiRecord,"
    ],
    [
      "      if (componentInputs.weatherStateEpochScalarPartRecords) {\n        dmiRecord.hourly = weatherStateEpochScalarHourly(dmiRecord, part.partId,\n          componentInputs, { generatedAt, startAt: partForecastStartAt,\n            expectedIdentity: partDmiIdentity });\n      }\n      selectedDmiPartRecords.set(part.partId, dmiRecord);\n      const operationalDmiRecord = applyFeggesundOperationalWaveProxy(",
      "      selectedDmiPartRecords.set(part.partId, dmiRecord);\n      const operationalDmiRecord = applyFeggesundOperationalWaveProxy("
    ],
    [
      "  if (stateEpochView !== null) {\n    weatherComponents.inputs.weatherStateEpochScalarPartRecords = new Map(\n      [...planningRecords].map(([partId, record]) => {\n        const scalar = withoutCurrent(record);\n        for (const hour of scalar.hourly) {\n          delete hour.currentStateOnlyHold;\n          delete hour.currentCoastNormalSpeedMps;\n        }\n        return [partId, scalar];\n      }),\n    );\n  }\n  planningRecords.clear();\n  output.weatherEngine.componentFallback = weatherComponents.summary;",
      "  planningRecords.clear();\n  output.weatherEngine.componentFallback = weatherComponents.summary;"
    ]
  ];
  for (const [after, before] of scalarHunks) {
    assert.equal(source.split(after).length, 2, 'each exact reviewed epoch scalar hunk must occur once');
    source = source.replace(after, () => before);
  }
  const hunks = [
    ['  verifiedFeggesundNeighborSource,\n  ATOMIC_COMPONENT_TUPLE_KEYS,\n  atomicComponentTupleValues,\n',
      '  verifiedFeggesundNeighborSource,\n  atomicComponentTupleValues,\n'],
    ["import { assertWeatherStateEpochInputViewForTarget }\n"
      + "  from './lib/weather-state-epoch-input-view.mjs';\n", ''],
    ['  previousCurrentSourceDomainTransitions = null,\n  stateEpochView = null,\n) {\n'
      + '  // A separately authenticated, archived epoch omits OLD numerical state only\n'
      + '  // for this first calculation. The full original weather baseline remains\n'
      + '  // untouched in the caller and in the normal no-loss/persistence chain.\n'
      + '  // A flag or serialized PASS marker cannot authorize this input selection.\n'
      + '  if (stateEpochView !== null) {\n'
      + '    assertWeatherStateEpochInputViewForTarget(stateEpochView,\n'
      + '      { registry: contract, targetReferenceAt: generatedAt });\n'
      + '    previousCoastalParts = stateEpochView.scoringPreviousCoastalParts;\n'
      + '    previousCandidateGRollbackRuntime = stateEpochView.scoringCandidateRuntime;\n'
      + '    pointStateInjections = {};\n'
      + '    checkpointStates = stateEpochView.checkpointStates;\n'
      + '    checkpointCandidateGRollbackStates = stateEpochView.checkpointCandidateGRollbackStates;\n'
      + '    deployedBulkCache = stateEpochView.scoringDeployedBulkCache;\n'
      + '    historicalDmiBulkCache = stateEpochView.scoringHistoricalDmiBulkCache;\n'
      + '    persistedDmiPartRows = stateEpochView.scoringPersistedDmiPartRows;\n'
      + '    previousCurrentSourceDomainTransitions = null;\n'
      + '    if (historicalWaveInputTransition !== null) {\n'
      + "      throw new Error('WEATHER_STATE_EPOCH_TRANSITION_COLLISION');\n"
      + '    }\n  }\n'
      + '  const calculationBootstrapMode = stateEpochView !== null\n'
      + '    ? stateEpochView.candidateGBootstrapMode : RAVSCORE_EFFECTIVE_FIRST_CUTOVER_BOOTSTRAP_MODE;\n'
      + '  const calculationSourceValidated = stateEpochView !== null\n'
      + '    ? stateEpochView.candidateGSourceValidated : RAVSCORE_EFFECTIVE_FIRST_CUTOVER_SOURCE_VALIDATED;\n',
    '  previousCurrentSourceDomainTransitions = null,\n) {\n'],
    ['          candidateGBootstrapMode: calculationBootstrapMode,\n'
      + '          candidateGSourceValidated: calculationSourceValidated,\n',
    '          candidateGBootstrapMode: RAVSCORE_EFFECTIVE_FIRST_CUTOVER_BOOTSTRAP_MODE,\n'
      + '          candidateGSourceValidated: RAVSCORE_EFFECTIVE_FIRST_CUTOVER_SOURCE_VALIDATED,\n'],
    ['        ].includes(calculationBootstrapMode)\n',
      '        ].includes(RAVSCORE_EFFECTIVE_FIRST_CUTOVER_BOOTSTRAP_MODE)\n'],
    ['const previous = await readPrevious();\nconst dmiForecastStore = await readDmiForecastStore();\n',
      'const previous = await readPrevious();\n'
      + 'const coastalPointStateInjections = await readCoastalPointStateInjections();\n'
      + 'const dmiForecastStore = await readDmiForecastStore();\n'],
    ["if (!['true', 'false'].includes(process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP ?? 'false')) {\n"
      + "  throw new Error('WEATHER_STATE_EPOCH_MODE_INVALID');\n}\n"
      + "const stateEpochView = process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP === 'true'\n"
      + "  ? await (await import('./weather-state-epoch.mjs')).loadInstalledWeatherStateEpochInputView({\n"
      + '    targetReferenceAt: generatedAt, registry: coastalPartsContract,\n  }) : null;\n'
      + '// Pending/previous point staging remains archived and is not promoted into a\n'
      + '// deliberately new numerical epoch. Ordinary point activation is unchanged.\n'
      + 'const coastalPointStateInjections = stateEpochView !== null ? {}\n'
      + '  : await readCoastalPointStateInjections();\n', ''],
    ["if (process.env.RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION) {\n"
      + "  if (stateEpochView !== null) throw new Error('WEATHER_STATE_EPOCH_TRANSITION_COLLISION');\n",
    "if (process.env.RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION) {\n"],
    ['// The archived OLD checkpoint is preserved but never reattested/selected as\n'
      + '// NEW state. Ordinary followers have no epoch flag and load their real NEW S.\n'
      + 'const ravScoreCheckpoint = stateEpochView !== null ? {\n'
      + '  loaded: false, continuationAvailable: false, states: stateEpochView.checkpointStates,\n'
      + '  candidateGRollbackStates: stateEpochView.checkpointCandidateGRollbackStates,\n'
      + '} : await loadRavScoreContinuationCheckpointForTarget({\n',
    'const ravScoreCheckpoint = await loadRavScoreContinuationCheckpointForTarget({\n'],
    ['if (stateEpochView !== null && historicalWaveInputTransition !== null) {\n'
      + "  throw new Error('WEATHER_STATE_EPOCH_TRANSITION_COLLISION');\n}\n"
      + 'const previousPrivateCandidateGRuntime = stateEpochView !== null || historicalWaveInputTransition\n',
    'const previousPrivateCandidateGRuntime = historicalWaveInputTransition\n'],
    ['    previous?.ravScoreCurrentSourceDomainTransitions ?? null,\n    stateEpochView,\n',
      '    previous?.ravScoreCurrentSourceDomainTransitions ?? null,\n'],
  ];
  for (const [after, before] of hunks) {
    assert.equal(source.split(after).length, 2, 'each exact reviewed epoch hunk must occur once');
    source = source.replace(after, () => before);
  }
  assert.equal(digest(source), '62bbe6eb4325dcba05afb922028150a9bdf7c45f2ebd7a7e975d85f3941d6288',
    'epoch inverse must restore the complete genuine 903307 updater');
  return source;
}

// Test-only inverse of the NEW explicit OLD-original donor integration. Remove
// only these exact reviewed hunks before the older relocation inverse below;
// none of the genuine historical whole-source or module hashes is updated.
const legacyCurrentOriginalDonorBlock = [
  "if (process.env.RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION) {",
  "  const expectedLegacy = JSON.parse(process.env.RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION);",
  "  assertRavScoreModelBinding(expectedLegacy.modelBinding, 'Legacy current reconstruction binding');",
  "  const unchangedFileSha256 = async file => `sha256:${crypto.createHash('sha256')",
  "    .update(await fs.readFile(file)).digest('hex')}`;",
  "  // The separate pre-producer handshake, never a hash self-derived from the",
  "  // new donor. Candidate/active legitimately changed during DMI, whereas the",
  "  // original registry, deployed donor and persisted forecast must not have.",
  "  if (expectedLegacy.productionReferenceAt !== generatedAt",
  "    || expectedLegacy.historyDemandSha256 !== await unchangedFileSha256('.cache/ravscore-current-history-demand.json')",
  "    || expectedLegacy.registrySha256 !== await unchangedFileSha256('data/live/coastal-parts-v2.json')",
  "    || expectedLegacy.sourceHashes?.zones !== await unchangedFileSha256('data/zones.geojson')",
  "    || expectedLegacy.sourceHashes?.deployedBulk !== await unchangedFileSha256(DEPLOYED_DMI_BULK_CACHE_PATH)",
  "    || expectedLegacy.sourceHashes?.forecast !== await unchangedFileSha256('data/live/dmi-forecast-cache.json')) {",
  "    throw new Error('DMI_LEGACY_CURRENT_EXPECTED_INPUT_MISMATCH');",
  "  }",
  "  const reconstructed = await readDmiLegacyCurrentOriginals({ repositoryRoot: process.cwd(),",
  "    parts: activeParts, expected: expectedLegacy, required: true });",
  "  if (reconstructed && historicalDmiBulkCache) throw new Error('DMI_LEGACY_CURRENT_DONOR_COLLISION');",
  "  if (reconstructed) historicalDmiBulkCache = reconstructed;",
  "}",
  '',
].join('\n');
function inverseLegacyCurrentOriginalDonorIntegration(source) {
  const hunks = [
    ["  RAVSCORE_PUBLIC_FORECAST_HOURS,\n  assertRavScoreModelBinding,\n  ravScoreModelBinding,\n",
      "  RAVSCORE_PUBLIC_FORECAST_HOURS,\n  ravScoreModelBinding,\n"],
    ["import { readDmiLegacyCurrentOriginals } from './lib/dmi-legacy-current-originals.mjs';\n", ''],
    ['let historicalDmiBulkCache = process.env.DMI_PART_CONTINUITY_DONOR_PATH\n',
      'const historicalDmiBulkCache = process.env.DMI_PART_CONTINUITY_DONOR_PATH\n'],
    [legacyCurrentOriginalDonorBlock, ''],
  ];
  for (const [after, before] of hunks) {
    assert.equal(source.split(after).length, 2,
      'each exact new OLD-original donor integration hunk must occur once');
    source = source.replace(after, () => before);
  }
  return source;
}

// Test-only inverse of the reviewed pure-function relocation. Reconstitute the
// complete genuine updater before every existing immutable historical oracle;
// this never changes runtime admission, source priority or capture provenance.
async function inverseSharedRecoveryRecordExtraction(source, sharedSource = null) {
  source = inverseLegacyCurrentOriginalDonorIntegration(source);
  sharedSource ??= await sourceText(new URL('./lib/private-dmi-recovery-record.mjs', import.meta.url));
  // Undo only the reviewed export paired with the real updater import above.
  // Keep every immutable historical whole-source hash and body assertion.
  const tupleExport = '  verifiedFeggesundNeighborSource,\n  ATOMIC_COMPONENT_TUPLE_KEYS,\n  atomicComponentTupleValues,\n';
  assert.equal(sharedSource.split(tupleExport).length, 2, 'each exact reviewed tuple export must occur once');
  sharedSource = sharedSource.replace(tupleExport,
    '  verifiedFeggesundNeighborSource,\n  atomicComponentTupleValues,\n');
  assert.equal(digest(sharedSource),
    'a2855aeb1826f198b874dc7060a9293f177af3a9ecb8eeb956520af16fc3958e',
    'the complete reviewed shared module must remain exact, including imports');
  const sharedImport = "import {\n  ACCEPTED_FORECAST_HOURS,\n  SHORT_DMI_WATER_GAP_HOURS,\n  WATER_LEVEL_JUMP_WARN_CM,\n  CURRENT_VECTOR_SEMANTICS_VERSION,\n  num,\n  ravScoreNumber,\n  zonePoint,\n  samePoint,\n  withoutCurrent,\n  withOnlyVerifiedCurrent,\n  haversineKm,\n  dmiCollections,\n  bulkZoneToForecastRecord,\n  publicCurrentDecoderTransition,\n  buildPartDmiForecastWithProtectedRetention,\n  buildPrivateDmiRecoveryRecord,\n  verifiedFeggesundNeighborSource,\n  atomicComponentTupleValues,\n  selectAtomicComponentTuple,\n  exactPublicForecastTimes,\n  materializeExactPublicWeatherHorizon,\n  mergeHourlyPreferDmi,\n} from './lib/private-dmi-recovery-record.mjs';\n";
  assert.equal(source.split(sharedImport).length, 2, 'normal producer must import the exact shared API once');
  source = source.replace(sharedImport, '');
  for (const label of ["constants","vector","numbers","points","distance","records","collections","selection"]) {
    const first = '// BEGIN normal-record ' + label + '\n';
    const next = '// END normal-record ' + label + '\n';
    assert.equal(sharedSource.split(first).length, 2);
    assert.equal(sharedSource.split(next).length, 2);
    const from = sharedSource.indexOf(first) + first.length;
    const until = sharedSource.indexOf(next, from);
    assert.ok(until > from);
    const placeholder = '// Shared recovery record: ' + label;
    assert.equal(source.split(placeholder).length, 2, 'each relocated normal body must have one exact original location');
    source = source.replace(placeholder, () => sharedSource.slice(from, until).trimEnd());
  }
  assert.equal(digest(source),
    'b9aabf3a02e7daad10b67fb214a70055d1a01f78c12aa3aa9338d5f0f3c8197b',
    'relocation inverse must restore the complete genuine pre-extraction updater');
  return source;
}

// Invert only the reviewed current-grid delta, with exact whole 044d identity.
// This is an oracle adapter, not runtime admission or current-data proof.
function inverseCurrentGridIntegration(source) {
  // Invert ONLY the reviewed bounded private-recovery bridge before the
  // existing PUBLIC/role/current-grid inverses and their immutable oracles.
  const privateRecoveryHunks = [
    ["  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES,\n  RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS,\n  buildRavScoreRecoveryReplay,\n", "  RAVSCORE_FIRST_CUTOVER_BOOTSTRAP_MODES,\n  buildRavScoreRecoveryReplay,\n"],
    ["// Private recovery keeps the existing 121-row mapper and all of its admission\n// rules. Only the normal state-72h + history-51h bridge may need a second\n// window. Three final scalar support rows preserve the ordinary T+3 sanitizer;\n// they never extend replay or the public score/state horizon.\nfunction buildPrivateDmiRecoveryRecord(\n  feature, bulkCache, generatedAt,\n  { startAt, expectedIdentity, persistedHourly = [], historicalBulkCache = null,\n    protectPreviousDmi = false },\n) {\n  const startMs = Date.parse(startAt), endMs = Date.parse(generatedAt);\n  const span = (endMs - startMs) / 3_600_000;\n  if (!Number.isSafeInteger(span) || span < 0\n    || span > RAVSCORE_RECOVERY_REPLAY_MAXIMUM_AGE_HOURS + 51\n    || startMs % 3_600_000 !== 0 || endMs % 3_600_000 !== 0\n    || new Date(startMs).toISOString() !== startAt\n    || new Date(endMs).toISOString() !== generatedAt) {\n    throw new Error('DMI_PRIVATE_RECOVERY_WINDOW_INVALID');\n  }\n  const requiredHours = Math.max(DMI_FORECAST_HOURS, span + 1 + 3);\n  let first = null;\n  const hourly = [];\n  for (let offset = 0; offset < requiredHours; offset += DMI_FORECAST_HOURS) {\n    const windowStart = new Date(startMs + offset * 3_600_000).toISOString();\n    const record = protectPreviousDmi\n      ? buildPartDmiForecastWithProtectedRetention(feature, bulkCache, null, generatedAt, {\n        startAt: windowStart, expectedIdentity, persistedHourly, historicalBulkCache,\n        protectPreviousDmi: true,\n      })\n      : bulkZoneToForecastRecord(feature, bulkCache, generatedAt, null, {\n        startAt: windowStart, expectedIdentity,\n      });\n    if (!record) continue;\n    if (first === null) first = record;\n    const from = startMs + offset * 3_600_000;\n    const until = startMs + Math.min(requiredHours, offset + DMI_FORECAST_HOURS) * 3_600_000;\n    hourly.push(...record.hourly.filter(row => Date.parse(row.time) >= from\n      && Date.parse(row.time) < until));\n  }\n  if (first === null) return null;\n  return { ...first, hourly, validFrom: hourly[0].time,\n    validUntil: hourly.at(-1).time, horizonHours: hourly.length };\n}\n\nfunction verifiedFeggesundNeighborSource(hour, expectedIdentity) {", "function verifiedFeggesundNeighborSource(hour, expectedIdentity) {"],
    ["        const deployedDmiRecord = buildPrivateDmiRecoveryRecord(\n          feature,\n          deployedBulkCache,\n          generatedAt,\n", "        const deployedDmiRecord = buildPartDmiForecastWithProtectedRetention(\n          feature,\n          deployedBulkCache,\n          null,\n          generatedAt,\n"],
    ["      const progressiveDmiRecord = buildPrivateDmiRecoveryRecord(\n        feature,\n        bulkCache,\n        generatedAt,\n        { startAt: replayStartAt, expectedIdentity: partDmiIdentity },\n", "      const progressiveDmiRecord = bulkZoneToForecastRecord(\n        feature,\n        bulkCache,\n        generatedAt,\n        null,\n        { startAt: replayStartAt, expectedIdentity: partDmiIdentity },\n"],
  ];
  for (const [after, before] of privateRecoveryHunks) {
    assert.equal(source.split(after).length, 2,
      'each exact private recovery bridge delta must occur once');
    source = source.replace(after, () => before);
  }
  assert.equal(digest(source), 'd51e45eda06cb1a9511c597f0309669ca4c7ca7f84f560c91d35dc9060cfc440',
    'whole private recovery inverse must match genuine ebf before the PUBLIC inverse');
  // Invert only the reviewed PUBLIC same-original decoder preference first.
  const publicDecoderHunks = [
  [
    "        protectPreviousDmi: Boolean(expectedIdentity && protectPreviousDmi),\n        currentDecoderTransition,\n",
    "        protectPreviousDmi: Boolean(expectedIdentity && protectPreviousDmi),\n"
  ],
  [
    "    protectPreviousDmi = false, currentDecoderTransition = null } = {},\n) {\n  // Public records keep the exact production +0..+117 axis. Private replay\n",
    "    protectPreviousDmi = false } = {},\n) {\n  // Public records keep the exact production +0..+117 axis. Private replay\n"
  ],
  [
    "    if (component === 'current' && !protectPreviousDmi && currentDecoderTransition) {\n      if (currentDecoderTransition(selected.row, candidate.row)) { selected = admitted; continue; }\n      if (currentDecoderTransition(candidate.row, selected.row)) continue;\n    }\n    const previousSource = selected.attestation;\n",
    "    const previousSource = selected.attestation;\n"
  ],
  [
    "  { attest = () => true, protectPreviousDmi = false, currentDecoderTransition = null } = {},\n",
    "  { attest = () => true, protectPreviousDmi = false } = {},\n"
  ],
  [
    "        expectedIdentity: partDmiIdentity,\n        currentDecoderTransitionPart: { ...part, zoneId },\n        persistedHourly: initialSelection.source === 'POINT_ACTIVATION'\n",
    "        expectedIdentity: partDmiIdentity,\n        persistedHourly: initialSelection.source === 'POINT_ACTIVATION'\n"
  ],
  [
    "      generatedAt, startAt, expectedIdentity, protectPreviousDmi, currentDecoderTransition,\n",
    "      generatedAt, startAt, expectedIdentity, protectPreviousDmi,\n"
  ],
  [
    "    ? mergeHourlyPreferDmi(persistedHourly, historical.hourly, {\n      generatedAt, startAt, expectedIdentity, currentDecoderTransition,\n",
    "    ? mergeHourlyPreferDmi(persistedHourly, historical.hourly, {\n      generatedAt, startAt, expectedIdentity,\n"
  ],
  [
    "  const current = bulkZoneToForecastRecord(feature, activeBulkCache, generatedAt, retained, {\n    startAt, expectedIdentity, materializeMissingHorizon: true, currentDecoderTransition,\n",
    "  const current = bulkZoneToForecastRecord(feature, activeBulkCache, generatedAt, retained, {\n    startAt, expectedIdentity, materializeMissingHorizon: true,\n"
  ],
  [
    "    protectPreviousDmi = false, currentDecoderTransitionPart = null },\n) {\n  const currentDecoderTransition = !protectPreviousDmi && currentDecoderTransitionPart\n    ? publicCurrentDecoderTransition(currentDecoderTransitionPart,\n      [activeBulkCache, protectedBulkCache, historicalBulkCache]) : null;\n  const retained = protectedBulkCache\n",
    "    protectPreviousDmi = false },\n) {\n  const retained = protectedBulkCache\n"
  ],
  [
    "// PUBLIC-only same-original decoder preference. It changes no original and\n// obtains every endpoint from the caller's actual admitted native documents.\nfunction publicCurrentDecoderTransition(part, contexts) {\n  if (!part) return null;\n  const identity = dmiExpectedIdentityForPart(part);\n  if (!identity) return null;\n  const inspector = createProtectedDmiNativeCurrentInspector({ contexts: contexts.filter(Boolean) });\n  const instant = value => typeof value === 'string' && /(?:Z|[+-]\\d{2}:\\d{2})$/.test(value)\n    && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;\n  const capture = source => {\n    if (!source || !['dkss_idw', 'dkss_nsbs', 'dkss_lf'].includes(source.collection)\n      || !instant(source.acquiredAt)\n      || !Number.isSafeInteger(source.contentLengthBytes) || source.contentLengthBytes <= 0\n      || !/^[a-f0-9]{64}$/.test(source.contentSha256 ?? '')\n      || !/^[a-f0-9]{64}$/.test(source.assetIdentitySha256 ?? '')\n      || typeof source.itemId !== 'string' || !source.itemId.trim()\n      || (source.assetSizeBytes != null && source.assetSizeBytes !== source.contentLengthBytes)) return null;\n    const value = { collection: source.collection, itemId: source.itemId,\n      assetIdentitySha256: source.assetIdentitySha256, assetSizeBytes: source.assetSizeBytes ?? null,\n      contentLengthBytes: source.contentLengthBytes, contentSha256: source.contentSha256 };\n    for (const key of ['modelRun', 'nativeValidTime', 'itemCreatedAt', 'itemUpdatedAt']) {\n      value[key] = instant(source[key]);\n      if (value[key] === null && (key === 'modelRun' || key === 'nativeValidTime' || source[key] != null)) return null;\n    }\n    return value;\n  };\n  return (oldRow, freshRow) => {\n    const oldSource = oldRow?.sources?.current, freshSource = freshRow?.sources?.current;\n    if (oldRow?.time !== freshRow?.time\n      || !verifiedDmiForecastComponentSource(oldSource, oldRow?.time, 'current', identity)\n      || !verifiedDmiForecastComponentSource(freshSource, freshRow?.time, 'current', identity)\n      || oldSource.nativeGridSampling != null\n      || oldSource.nativeSteps.some(step => step.nativeGridSampling != null)\n      || inspectDmiForecastGridSampling(oldSource, 'current', oldRow.time, identity).status !== 'unknown'\n      || inspectDmiForecastGridSampling(freshSource, 'current', freshRow.time, identity).status !== 'coherent') return false;\n    const oldProof = inspector.inspectOriginals({ part, row: oldRow });\n    const freshProof = inspector.inspectOriginals({ part, row: freshRow });\n    if (!oldProof.ok || !freshProof.ok || oldProof.nativeRows.length !== freshProof.nativeRows.length) return false;\n    for (let index = 0; index < oldProof.nativeRows.length; index += 1) {\n      const old = oldProof.nativeRows[index].source, fresh = freshProof.nativeRows[index].source;\n      const oldCapture = capture(old), freshCapture = capture(fresh);\n      if (!oldCapture || !freshCapture || JSON.stringify(oldCapture) !== JSON.stringify(freshCapture)\n        || old.nativeGridSampling != null\n        || old.gridDefinitionSha256 !== fresh.gridDefinitionSha256\n        || fresh.nativeGridSampling?.coordinateInterpretation !== 'dmi-dkss-grib1-header-endpoints-v1') return false;\n    }\n    return true;\n  };\n}\n\nfunction buildPartDmiForecastWithProtectedRetention(\n",
    "function buildPartDmiForecastWithProtectedRetention(\n"
  ],
  [
    "    { generatedAt, startAt, expectedIdentity: dmiIdentity, currentDecoderTransition },\n",
    "    { generatedAt, startAt, expectedIdentity: dmiIdentity },\n"
  ],
  [
    "    materializeMissingHorizon = false,\n    currentDecoderTransition = null,\n",
    "    materializeMissingHorizon = false,\n"
  ],
  [
    "import { createProtectedDmiNativeCurrentInspector } from './lib/protected-dmi-native-current-proofs.mjs';\nimport { packDmiPartContinuity, unpackDmiPartContinuity } from './lib/dmi-part-continuity.mjs';\n",
    "import { packDmiPartContinuity, unpackDmiPartContinuity } from './lib/dmi-part-continuity.mjs';\n"
  ],
  [
    "  normalizeForecastHourly,\n  inspectDmiForecastGridSampling,\n",
    "  normalizeForecastHourly,\n"
  ]
];
  for (const [after, before] of publicDecoderHunks) {
    assert.equal(source.split(after).length, 2, 'each exact PUBLIC decoder delta must occur once');
    source = source.replace(after, before);
  }
  assert.equal(digest(source), 'b3b1a43b1913d7f75307f8c422e045b86eacdcf22bef954c7ad77574d49a401b',
    'whole PUBLIC decoder inverse must match genuine 584 before every existing inverse');
  // First invert ONLY the two reviewed role boundaries from PR603. The
  // historical current-grid inverse and its whole 044d oracle stay unchanged.
  const roleHunks = [
    ["    // This readiness ledger consumes waves only. Current qualification belongs\n    // to the actual score/replay consumers, not this independent wave preflight.\n    const hourly = verifiedIntegratedPartHourly(\n      operationalRecord,\n      bulkCache,\n      bulkId,\n      partWithZone,\n      { ...componentInputs, requireNativeGridSampling: false },\n    );\n    entries.push(...feggesundWaveProofEntriesForPart(","    const hourly = verifiedIntegratedPartHourly(\n      operationalRecord,\n      bulkCache,\n      bulkId,\n      partWithZone,\n      componentInputs,\n    );\n    entries.push(...feggesundWaveProofEntriesForPart("],
    ["      const hourly = routedWater.hourly;\n      // Only public current enters scoring here. Keep all T+3 scalar support\n      // rows for trend/continuity; replay and native holds have their own gates.\n      const publicCurrentStartMs = Date.parse(partForecastStartAt);\n      assertDmiPartHourlyGridSamplingApplicable(hourly.filter(hour => Date.parse(hour.time) >= publicCurrentStartMs\n        && Date.parse(hour.time) < publicCurrentStartMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000), bulkId,","      const hourly = assertDmiPartHourlyGridSamplingApplicable(routedWater.hourly, bulkId,"],
    ["      // This plan consumes only wind/wave/waterLevel/waterTemperature, not current.\n      // NEW current is assembled and strictly checked in the score caller.\n      return routed.hourly;","      return assertDmiPartHourlyGridSamplingApplicable(routed.hourly, `PART::${part.partId}`, part,\n        { assertRoutedWaterLevelApplicable: routed.assertRoutedWaterLevelApplicable, liveCurrentPilot });"],
  ];
  for (const [after, before] of roleHunks) {
    assert.equal(source.split(after).length, 2, 'exact contextual PR603 role delta must occur once');
    source = source.replace(after, () => before);
  }
  assert.equal(digest(source), 'cd6375926cfffca09bf753b8f4fe87e42aeecf113a900e233949a41ba1642f0b', 'whole role inverse must match genuine 9fe before the current-grid inverse');
  const hunks = [
    ["  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,\n} from './lib/private-weather-component-inventory.mjs';\nimport {\n  buildPrivatePublicHourDeliveryPack,\n  compactPrivateConditionsForPersistence,\n  installPrivateConditionsAndHourPack,\n} from './lib/public-hour-delivery-pack.mjs';\nimport {\n  selectLatestLocalScoreRowAtOrBefore,\n} from './lib/local-current-reference.mjs';\nimport { localPartRuntimeProperties } from './lib/local-part-runtime.mjs';\nimport {\n  readLiveCurrentPilot,\n  controlledLiveCurrentProofStatus,\n  latestVerifiedNativeCadenceSampleForPart,\n  nativeCadenceHoldHoursForPart,\n} from './lib/live-current-pilot.mjs';\nimport { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';\nimport { OPEN_METEO_FUTURE_HOURS, trimOpenMeteoForecast } from './lib/open-meteo-forecast-window.mjs';\nimport { buildOpenMeteoIndependentHourlyComponents, fetchOpenMeteoComponentResponses } from './lib/open-meteo-hourly-components.mjs';\nimport { OPEN_METEO_PART_COMPONENTS, OPEN_METEO_NATIVE_NEAREST_POLICIES, openMeteoComponentRequestParts, openMeteoComponentGridMatches } from './lib/open-meteo-part-bank.mjs';\nimport { preferQualifiedDmiComponentSource } from './lib/weather-component-selection.mjs';\nimport { prepareWeatherComponentRuntime, persistWeatherComponentSelections } from './lib/weather-component-runtime.mjs';\nimport { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';\nimport { recordSelectedWeatherComponents } from './lib/weather-component-selection-history.mjs';\n", "  PRIVATE_PUBLIC_HOUR_DELIVERY_PACK_FILE,\n} from './lib/private-weather-component-inventory.mjs';\nimport {\n  buildPrivatePublicHourDeliveryPack,\n  compactPrivateConditionsForPersistence,\n  installPrivateConditionsAndHourPack,\n} from './lib/public-hour-delivery-pack.mjs';\nimport {\n  selectLatestLocalScoreRowAtOrBefore,\n} from './lib/local-current-reference.mjs';\nimport { localPartRuntimeProperties } from './lib/local-part-runtime.mjs';\nimport {\n  controlledLiveCurrentProofStatus,\n  latestVerifiedNativeCadenceSampleForPart,\n  nativeCadenceHoldHoursForPart,\n} from './lib/live-current-pilot.mjs';\nimport { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';\nimport { OPEN_METEO_FUTURE_HOURS, trimOpenMeteoForecast } from './lib/open-meteo-forecast-window.mjs';\nimport { buildOpenMeteoIndependentHourlyComponents, fetchOpenMeteoComponentResponses } from './lib/open-meteo-hourly-components.mjs';\nimport { OPEN_METEO_PART_COMPONENTS, OPEN_METEO_NATIVE_NEAREST_POLICIES, openMeteoComponentRequestParts, openMeteoComponentGridMatches } from './lib/open-meteo-part-bank.mjs';\nimport { preferQualifiedDmiComponentSource } from './lib/weather-component-selection.mjs';\nimport { prepareWeatherComponentRuntime, persistWeatherComponentSelections } from './lib/weather-component-runtime.mjs';\nimport { safeWeatherComponentSummary } from './lib/weather-component-safe-summary.mjs';\nimport { recordSelectedWeatherComponents } from './lib/weather-component-selection-history.mjs';\n"],
    ["} from './lib/coastal-point-staging-contract.mjs';\nimport { loadRavScoreContinuationCheckpointForTarget } from './ravscore-continuation-checkpoint.mjs';\nimport {\n  RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION,\n  RAVSCORE_LOCAL_MARGIN_POINTS,\n  buildIntegratedPartPublicProjection,\n  buildIntegratedZoneHourlyProjection,\n  dmiExpectedIdentityForPart,\n  eligibleDmiForecastComponentSource as verifiedDmiForecastComponentSource,\n  eligibleDmiNativeComponentSource as verifiedDmiNativeComponentSource,\n  eligibleBulkCurrent as verifiedBulkCurrent,\n  verifiedIntegratedPartHourly,\n  assertDmiPartHourlyGridSamplingApplicable,\n} from './lib/ravscore-production-adapters.mjs';\nimport {\n  FEGGESUND_WAVE_DISPOSITIONS,\n  FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,\n  FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,\n  bindVerifiedFeggesundWaveSource,\n  buildFeggesundWaveCoverageProof,\n  buildFeggesundWaveInputProofEntry,\n  buildFeggesundWaveProxy,\n} from './lib/feggesund-wave-proxy.mjs';\nimport {\n  buildRavScoreProductionPartSeries,\n", "} from './lib/coastal-point-staging-contract.mjs';\nimport { loadRavScoreContinuationCheckpointForTarget } from './ravscore-continuation-checkpoint.mjs';\nimport {\n  RAVSCORE_CURRENT_VECTOR_SEMANTICS_VERSION,\n  RAVSCORE_LOCAL_MARGIN_POINTS,\n  buildIntegratedPartPublicProjection,\n  buildIntegratedZoneHourlyProjection,\n  dmiExpectedIdentityForPart,\n  eligibleDmiForecastComponentSource as verifiedDmiForecastComponentSource,\n  eligibleDmiNativeComponentSource as verifiedDmiNativeComponentSource,\n  eligibleBulkCurrent as verifiedBulkCurrent,\n  verifiedIntegratedPartHourly,\n} from './lib/ravscore-production-adapters.mjs';\nimport {\n  FEGGESUND_WAVE_DISPOSITIONS,\n  FEGGESUND_WAVE_PROXY_SOURCE_ZONE_IDS,\n  FEGGESUND_WAVE_PROXY_TARGET_ZONE_ID,\n  bindVerifiedFeggesundWaveSource,\n  buildFeggesundWaveCoverageProof,\n  buildFeggesundWaveInputProofEntry,\n  buildFeggesundWaveProxy,\n} from './lib/feggesund-wave-proxy.mjs';\nimport {\n  buildRavScoreProductionPartSeries,\n"],
    ["  isReconstructedTransportEvidence,\n} from '../js/core/ravscore-regime-memory.js';\n\nconst ZONES_PATH = 'data/zones.geojson';\nconst COASTAL_PARTS_SOURCE_PATH = 'data/geometry-v2/active-national-coastal-parts/manifest.json';\nconst OUTPUT_PATH = 'data/live/conditions.json';\nconst DMI_ROOT = 'https://opendataapi.dmi.dk/v1/forecastedr/collections';\nconst DMI_OCEAN_OBS_ROOT = 'https://opendataapi.dmi.dk/v2/oceanObs/collections';\nconst HEALTH_PATH = 'data/live/weather-health.json';\nconst DMI_FORECAST_STORE_PATH = 'data/live/dmi-forecast-cache.json';\nconst DMI_BULK_CACHE_PATH = process.env.DMI_BULK_CACHE_PATH || 'data/live/dmi-bulk-cache.json';\nconst DEPLOYED_DMI_BULK_CACHE_PATH = '.cache/deployed-dmi-bulk-cache.json';\nconst RUNTIME_DIAGNOSTICS_PATH = 'data/live/ravradar-runtime-diagnostics.json';\nconst CANDIDATE_G_MEASURED_WARMUP_STATUS = 'BUILDING_MEASURED_ONLY';\nconst CANDIDATE_G_MEASURED_WARMUP_EVIDENCE_POLICY = 'MEASURED_ONLY';\nconst WATER_STATION_ROUTING_PATH = 'data/water-level-station-routing.json';\nconst WATER_STATION_INVENTORY_PATH = 'data/live/dmi-water-stations.json';\nconst OFFICIAL_WATER_STATION_SUPPLEMENT_PATH = 'data/dmi-official-water-stations.json';\nconst WATER_STATION_ROUTING_AUDIT_PATH = 'data/live/water-station-routing-audit.json';\nconst WATER_STATION_NOTIFICATIONS_PATH = 'data/live/water-station-notifications.json';\nconst RAVSCORE_PROFILE_SELECTION_PATH = 'data/admin/ravscore-profile-selection.json';\nconst COASTAL_POINT_STATE_INJECTION_PATH = '.cache/coastal-point-staging/activation-state-injection.json';\nconst RAVSCORE_CONTINUATION_CHECKPOINT_PATH = '.cache/ravscore-continuation-checkpoint/checkpoint.json';\nconst ACCEPTED_FORECAST_HOURS = RAVSCORE_PUBLIC_FORECAST_HOURS;\n", "  isReconstructedTransportEvidence,\n} from '../js/core/ravscore-regime-memory.js';\n\nconst ZONES_PATH = 'data/zones.geojson';\nconst COASTAL_PARTS_SOURCE_PATH = 'data/geometry-v2/active-national-coastal-parts/manifest.json';\nconst OUTPUT_PATH = 'data/live/conditions.json';\nconst DMI_ROOT = 'https://opendataapi.dmi.dk/v1/forecastedr/collections';\nconst DMI_OCEAN_OBS_ROOT = 'https://opendataapi.dmi.dk/v2/oceanObs/collections';\nconst HEALTH_PATH = 'data/live/weather-health.json';\nconst DMI_FORECAST_STORE_PATH = 'data/live/dmi-forecast-cache.json';\nconst DMI_BULK_CACHE_PATH = process.env.DMI_BULK_CACHE_PATH || 'data/live/dmi-bulk-cache.json';\nconst DEPLOYED_DMI_BULK_CACHE_PATH = '.cache/deployed-dmi-bulk-cache.json';\nconst LIVE_CURRENT_PILOT_PATH = 'data/live/current-pilot-history.json';\nconst RUNTIME_DIAGNOSTICS_PATH = 'data/live/ravradar-runtime-diagnostics.json';\nconst CANDIDATE_G_MEASURED_WARMUP_STATUS = 'BUILDING_MEASURED_ONLY';\nconst CANDIDATE_G_MEASURED_WARMUP_EVIDENCE_POLICY = 'MEASURED_ONLY';\nconst WATER_STATION_ROUTING_PATH = 'data/water-level-station-routing.json';\nconst WATER_STATION_INVENTORY_PATH = 'data/live/dmi-water-stations.json';\nconst OFFICIAL_WATER_STATION_SUPPLEMENT_PATH = 'data/dmi-official-water-stations.json';\nconst WATER_STATION_ROUTING_AUDIT_PATH = 'data/live/water-station-routing-audit.json';\nconst WATER_STATION_NOTIFICATIONS_PATH = 'data/live/water-station-notifications.json';\nconst RAVSCORE_PROFILE_SELECTION_PATH = 'data/admin/ravscore-profile-selection.json';\nconst COASTAL_POINT_STATE_INJECTION_PATH = '.cache/coastal-point-staging/activation-state-injection.json';\nconst RAVSCORE_CONTINUATION_CHECKPOINT_PATH = '.cache/ravscore-continuation-checkpoint/checkpoint.json';\nconst ACCEPTED_FORECAST_HOURS = RAVSCORE_PUBLIC_FORECAST_HOURS;\n"],
    ["      throw new Error('The current DMI candidate is missing or invalid');\n    }\n    return null;\n  } catch (error) {\n    if (process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE === 'true'\n      && cachePath === DMI_BULK_CACHE_PATH) {\n      throw new Error('The current DMI candidate cannot be read', { cause: error });\n    }\n    return null;\n  }\n}\n\nfunction bulkZoneToForecastRecord(\n  feature,\n  bulkCache,\n  generatedAt,\n  previousRecord = null,\n  {\n    startAt = generatedAt,\n    expectedIdentity = null,\n    materializeMissingHorizon = false,\n  } = {},\n) {\n  const zoneId = feature.properties?.id;\n", "      throw new Error('The current DMI candidate is missing or invalid');\n    }\n    return null;\n  } catch (error) {\n    if (process.env.RAVRADAR_REQUIRE_PRIVATE_WEATHER_BASELINE === 'true'\n      && cachePath === DMI_BULK_CACHE_PATH) {\n      throw new Error('The current DMI candidate cannot be read', { cause: error });\n    }\n    return null;\n  }\n}\n\nasync function readLiveCurrentPilot() {\n  try {\n    const parsed = JSON.parse(await fs.readFile(LIVE_CURRENT_PILOT_PATH, 'utf8'));\n    return Number(parsed?.schemaVersion) === 1 && parsed?.controlledLivePilot === true ? parsed : null;\n  } catch {\n    return null;\n  }\n}\n\nfunction bulkZoneToForecastRecord(\n  feature,\n  bulkCache,\n  generatedAt,\n  previousRecord = null,\n  {\n    startAt = generatedAt,\n    expectedIdentity = null,\n    materializeMissingHorizon = false,\n  } = {},\n) {\n  const zoneId = feature.properties?.id;\n"],
    ["  previousCoastalParts = null,\n  previousCandidateGRollbackRuntime = null,\n  pointStateInjections = {},\n  checkpointStates = {},\n  checkpointCandidateGRollbackStates = {},\n  componentInputs = {},\n  historicalWaveInputTransition = null,\n  waterSourceRoutingContext = null,\n  persistedDmiPartRows = new Map(),\n  historicalDmiBulkCache = null,\n  previousCurrentSourceDomainTransitions = null,\n) {\n  // This NEW calculation, including its actual protected/progressive replay\n  // inputs, may not borrow corrected lookup proof from a newly parsed loser.\n  // Original readers/admission stay unchanged; unsupported originals are kept.\n  componentInputs = { ...componentInputs, requireNativeGridSampling: true };\n  const forceHistoricalWaveMeasuredColdReplay =\n    historicalWaveInputTransition !== null;\n  const previousEvidenceTrust = previousCoastalParts?.evidenceTrust ?? null;\n  if (!forceHistoricalWaveMeasuredColdReplay\n    && previousEvidenceTrust?.status === RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS) {\n    throw new Error('Integrated RavScore cutover refuses Candidate G source with active reconstructed evidence trust');\n  }\n  const parentById = new Map(parentFeatures.map(feature => [feature.properties?.id, feature]));\n  const activePartIds = new Set(Object.values(contract?.zones ?? {})\n    .flatMap(parts => Array.isArray(parts) ? parts.map(part => part?.partId).filter(Boolean) : []));\n  const previousTransitionParts = readOwnerCurrentTransitionArchive(\n    previousCurrentSourceDomainTransitions,\n", "  previousCoastalParts = null,\n  previousCandidateGRollbackRuntime = null,\n  pointStateInjections = {},\n  checkpointStates = {},\n  checkpointCandidateGRollbackStates = {},\n  componentInputs = {},\n  historicalWaveInputTransition = null,\n  waterSourceRoutingContext = null,\n  persistedDmiPartRows = new Map(),\n  historicalDmiBulkCache = null,\n  previousCurrentSourceDomainTransitions = null,\n) {\n  const forceHistoricalWaveMeasuredColdReplay =\n    historicalWaveInputTransition !== null;\n  const previousEvidenceTrust = previousCoastalParts?.evidenceTrust ?? null;\n  if (!forceHistoricalWaveMeasuredColdReplay\n    && previousEvidenceTrust?.status === RECONSTRUCTED_TRANSPORT_EVIDENCE_TRUST_STATUS) {\n    throw new Error('Integrated RavScore cutover refuses Candidate G source with active reconstructed evidence trust');\n  }\n  const parentById = new Map(parentFeatures.map(feature => [feature.properties?.id, feature]));\n  const activePartIds = new Set(Object.values(contract?.zones ?? {})\n    .flatMap(parts => Array.isArray(parts) ? parts.map(part => part?.partId).filter(Boolean) : []));\n  const previousTransitionParts = readOwnerCurrentTransitionArchive(\n    previousCurrentSourceDomainTransitions,\n"],
    ["      const record = mergeActiveNativeLiveCurrentPilotIntoRecord(operationalDmiRecord, { ...part, zoneId }, liveCurrentPilot, {\n        activeBulk: bulkCache, bulkId, productionReferenceAt: generatedAt,\n        primaryCurrentVerified: hour => Boolean(verifiedBulkCurrent(\n          bulkCache,\n          bulkCache?.zones?.[bulkId],\n          part.waterPoint,\n          hour?.sources?.current,\n          hour?.time,\n          partDmiIdentity,\n        )),\n      });\n      const verifiedHourly = verifiedIntegratedPartHourly(\n        record, bulkCache, bulkId, { ...part, zoneId },\n        { ...componentInputs, requireNativeGridSampling: false, liveCurrentPilot },\n      );\n      const routedWater = waterSourceRoutingContext\n        ? applyVerifiedWaterSourceRoutingToPartHourly({\n          part: { ...part, zoneId }, parentFeature: parent,\n          hourly: verifiedHourly, ...waterSourceRoutingContext,\n        }) : { hourly: verifiedHourly, diagnostic: null };\n      const hourly = assertDmiPartHourlyGridSamplingApplicable(routedWater.hourly, bulkId,\n        { ...part, zoneId }, { assertRoutedWaterLevelApplicable: routedWater.assertRoutedWaterLevelApplicable, liveCurrentPilot });\n      if (routedWater.diagnostic) furWaterRoutingTrace = routedWater.diagnostic;\n      if (componentInputs.componentSelectionHistory) {\n        recordSelectedWeatherComponents(componentInputs.componentSelectionHistory, { ...part, zoneId }, hourly);\n      }\n      const sourceAgeHour = hourly.find(hour => hour?.time === partForecastStartAt) ?? null;\n      const traced = RAVSCORE_CURRENT_TRACE_PART_IDS.has(part.partId);\n      const rawBulkRows = Array.isArray(bulkCache?.zones?.[bulkId]?.hourly)\n        ? bulkCache.zones[bulkId].hourly\n        : Object.values(bulkCache?.zones?.[bulkId]?.hourly ?? {});\n      const rawBulkHour = RAVSCORE_CURRENT_TRACE_PATH\n        ? rawBulkRows.find(hour => hour?.time === partForecastStartAt) ?? null\n        : null;\n", "      const record = mergeActiveNativeLiveCurrentPilotIntoRecord(operationalDmiRecord, { ...part, zoneId }, liveCurrentPilot, {\n        activeBulk: bulkCache, bulkId, productionReferenceAt: generatedAt,\n        primaryCurrentVerified: hour => Boolean(verifiedBulkCurrent(\n          bulkCache,\n          bulkCache?.zones?.[bulkId],\n          part.waterPoint,\n          hour?.sources?.current,\n          hour?.time,\n          partDmiIdentity,\n        )),\n      });\n      const verifiedHourly = verifiedIntegratedPartHourly(\n        record, bulkCache, bulkId, { ...part, zoneId }, componentInputs,\n      );\n      const routedWater = waterSourceRoutingContext\n        ? applyVerifiedWaterSourceRoutingToPartHourly({\n          part: { ...part, zoneId }, parentFeature: parent,\n          hourly: verifiedHourly, ...waterSourceRoutingContext,\n        }) : { hourly: verifiedHourly, diagnostic: null };\n      const hourly = routedWater.hourly;\n      if (routedWater.diagnostic) furWaterRoutingTrace = routedWater.diagnostic;\n      if (componentInputs.componentSelectionHistory) {\n        recordSelectedWeatherComponents(componentInputs.componentSelectionHistory, { ...part, zoneId }, hourly);\n      }\n      const sourceAgeHour = hourly.find(hour => hour?.time === partForecastStartAt) ?? null;\n      const traced = RAVSCORE_CURRENT_TRACE_PART_IDS.has(part.partId);\n      const rawBulkRows = Array.isArray(bulkCache?.zones?.[bulkId]?.hourly)\n        ? bulkCache.zones[bulkId].hourly\n        : Object.values(bulkCache?.zones?.[bulkId]?.hourly ?? {});\n      const rawBulkHour = RAVSCORE_CURRENT_TRACE_PATH\n        ? rawBulkRows.find(hour => hour?.time === partForecastStartAt) ?? null\n        : null;\n"],
    ["        feggesundWaveProofEntries.push(...feggesundWaveProofEntriesForPart(\n          hourly,\n          part.partId,\n          partForecastStartAt,\n          { part: { ...part, zoneId }, componentInputs },\n        ));\n      }\n      const nativeCadenceHoldHours = nativeCadenceHoldHoursForPart({ ...part, zoneId }, liveCurrentPilot);\n      const zone = localPartRuntimeProperties(parent.properties, part, part.partId);\n      const replayStartAt = ravScoreOwnerCurrentHistoryStartAt(\n        { ...part, zoneId }, initialSelection.state,\n        ravScoreRecoverySourceStartAt(initialSelection.state, generatedAt),\n        { requireNativeGridSampling: true },\n      );\n      let deployedRecoverySource = null;\n      const protectedCurrentContexts = [deployedBulkCache, historicalDmiBulkCache];\n      // A promoted point has a deliberately new sampling context; old deployed\n      // rows for the prior point must not enter its replay. Its private staged\n      // DMI history has already been promoted into the progressive cache.\n      if (initialSelection.source !== 'POINT_ACTIVATION'\n        && (deployedBulkCache || historicalDmiBulkCache\n          || persistedDmiPartRows.has(part.partId))) {\n        const deployedDmiRecord = buildPartDmiForecastWithProtectedRetention(\n          feature,\n          deployedBulkCache,\n", "        feggesundWaveProofEntries.push(...feggesundWaveProofEntriesForPart(\n          hourly,\n          part.partId,\n          partForecastStartAt,\n          { part: { ...part, zoneId }, componentInputs },\n        ));\n      }\n      const nativeCadenceHoldHours = nativeCadenceHoldHoursForPart({ ...part, zoneId }, liveCurrentPilot);\n      const zone = localPartRuntimeProperties(parent.properties, part, part.partId);\n      const replayStartAt = ravScoreOwnerCurrentHistoryStartAt(\n        { ...part, zoneId }, initialSelection.state,\n        ravScoreRecoverySourceStartAt(initialSelection.state, generatedAt),\n      );\n      let deployedRecoverySource = null;\n      const protectedCurrentContexts = [deployedBulkCache, historicalDmiBulkCache];\n      // A promoted point has a deliberately new sampling context; old deployed\n      // rows for the prior point must not enter its replay. Its private staged\n      // DMI history has already been promoted into the progressive cache.\n      if (initialSelection.source !== 'POINT_ACTIVATION'\n        && (deployedBulkCache || historicalDmiBulkCache\n          || persistedDmiPartRows.has(part.partId))) {\n        const deployedDmiRecord = buildPartDmiForecastWithProtectedRetention(\n          feature,\n          deployedBulkCache,\n"],
    ["              currentContexts: protectedCurrentContexts, bulkId, productionReferenceAt: generatedAt,\n              includePrivateNativeCadenceReferences: true,\n              primaryCurrentVerified: hour => Boolean(originalContextForProtectedDmiCurrent(\n                hour,\n                protectedCurrentContexts,\n                bulkId,\n                { ...part, zoneId },\n              )),\n            },\n          );\n          deployedRecoverySource = {\n            source: 'deployed-private-runtime',\n            nativeCurrentContexts: protectedCurrentContexts,\n            record: {\n              ...deployedRecord,\n              hourly: verifiedProtectedDmiPartHourly(\n                deployedRecord,\n                protectedCurrentContexts,\n                bulkId,\n                { ...part, zoneId },\n                { ...componentInputs, requireNativeGridSampling: false, liveCurrentPilot },\n              ),\n            },\n          };\n        }\n      }\n      const progressiveDmiRecord = bulkZoneToForecastRecord(\n        feature,\n        bulkCache,\n        generatedAt,\n        null,\n        { startAt: replayStartAt, expectedIdentity: partDmiIdentity },\n      );\n", "              currentContexts: protectedCurrentContexts, bulkId, productionReferenceAt: generatedAt,\n              includePrivateNativeCadenceReferences: true,\n              primaryCurrentVerified: hour => Boolean(originalContextForProtectedDmiCurrent(\n                hour,\n                protectedCurrentContexts,\n                bulkId,\n                { ...part, zoneId },\n              )),\n            },\n          );\n          deployedRecoverySource = {\n            source: 'deployed-private-runtime',\n            record: {\n              ...deployedRecord,\n              hourly: verifiedProtectedDmiPartHourly(\n                deployedRecord,\n                protectedCurrentContexts,\n                bulkId,\n                { ...part, zoneId },\n                componentInputs,\n              ),\n            },\n          };\n        }\n      }\n      const progressiveDmiRecord = bulkZoneToForecastRecord(\n        feature,\n        bulkCache,\n        generatedAt,\n        null,\n        { startAt: replayStartAt, expectedIdentity: partDmiIdentity },\n      );\n"],
    ["            primaryCurrentVerified: hour => Boolean(verifiedBulkCurrent(\n              bulkCache,\n              bulkCache?.zones?.[bulkId],\n              part.waterPoint,\n              hour?.sources?.current,\n              hour?.time,\n              partDmiIdentity,\n            )),\n          },\n        );\n        progressiveRecoverySource = {\n          source: 'progressive-private-dmi',\n          nativeCurrentContexts: [bulkCache],\n          record: {\n            ...progressiveRecord,\n            hourly: verifiedIntegratedPartHourly(\n              progressiveRecord,\n              bulkCache,\n              bulkId,\n              { ...part, zoneId },\n              { ...componentInputs, requireNativeGridSampling: false, liveCurrentPilot },\n            ),\n          },\n        };\n      }\n      const recoverySources = buildNewestValidRavScoreRecoverySources({\n        fallbackSource: deployedRecoverySource,\n        preferredSource: progressiveRecoverySource,\n        // The source above uses only the installed authenticated production\n        // generation and its admitted continuity donors, never the new run.\n        protectedPreviousSource: deployedRecoverySource,\n        productionReferenceAt: generatedAt,\n        part: { ...part, zoneId },\n        onProtectedSameRunDmiRetention: (component, valueClass) => {\n          protectedSameRunDmiRetentions[component][valueClass] += 1;\n        },\n      });\n      let productionSeries;\n      try {\n        productionSeries = buildRavScoreProductionPartSeries({\n          requireNativeGridSampling: true,\n          liveCurrentPilot,\n          assertRoutedWaterLevelApplicable: routedWater.assertRoutedWaterLevelApplicable,\n          part: { ...part, zoneId },\n          zone,\n          initialSelection,\n          previousCandidateGContinuation,\n          legacyCandidateGMigrationState,\n          candidateGRollbackMeasuredColdStart,\n          candidateGRollbackMeasuredWarmupContinuation,\n          targetReferenceAt: generatedAt,\n          recoverySources,\n          // T+118..T+120 were needed to derive the last public trends above,\n          // but must never extend the public score horizon or its state walk.\n          publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n            && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n          nativeCadenceHoldHours,\n          resolveNativeCadenceReferenceSample: (sourceValidTime, { expectedHold } = {}) =>\n            latestVerifiedNativeCadenceSampleForPart(\n              { ...part, zoneId },\n              liveCurrentPilot,\n              sourceValidTime,\n              { requireNativeGridSampling: true, expectedHold },\n            ),\n          resolveCandidateGNativeCadenceReferenceSample: (sourceValidTime, { expectedHold } = {}) =>\n            latestVerifiedNativeCadenceSampleForPart(\n              { ...part, zoneId },\n              liveCurrentPilot,\n              sourceValidTime,\n              { projection: 'candidate-g-legacy-quantized', requireNativeGridSampling: true, expectedHold },\n            ),\n        });\n      } catch (error) {\n        if (error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT'\n          && error?.message === 'RavScore recovery replay has a conflicting current component') {\n          // A failing cache build may have two differently projected, valid\n          // current histories. Diagnose with the unchanged replay validator,\n          // but emit only fixed categories and aggregate counts. In particular\n          // never log U/V, source IDs, points, hours or raw exception text.\n          try {\n            const diagnosis = summarizeRavScoreCurrentRecoveryConflicts({\n              sourceRecords: recoverySources,\n              startAt: replayStartAt,\n              targetAt: generatedAt,\n              replayCandidate: isolatedSources => buildRavScoreRecoveryReplay({\n                requireNativeGridSampling: true,\n                liveCurrentPilot,\n                part: { ...part, zoneId },\n                initialState: initialSelection.state,\n                targetReferenceAt: generatedAt,\n                sourceRecords: isolatedSources,\n                publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n                  && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n                nativeCadenceHoldHours,\n              }),\n            });\n            console.error(`RAVSCORE_RECOVERY_CURRENT_CONFLICT_PROOF ${JSON.stringify(diagnosis)}`);\n          } catch {\n            console.error('RAVSCORE_RECOVERY_CURRENT_CONFLICT_PROOF_UNAVAILABLE');\n", "            primaryCurrentVerified: hour => Boolean(verifiedBulkCurrent(\n              bulkCache,\n              bulkCache?.zones?.[bulkId],\n              part.waterPoint,\n              hour?.sources?.current,\n              hour?.time,\n              partDmiIdentity,\n            )),\n          },\n        );\n        progressiveRecoverySource = {\n          source: 'progressive-private-dmi',\n          record: {\n            ...progressiveRecord,\n            hourly: verifiedIntegratedPartHourly(\n              progressiveRecord,\n              bulkCache,\n              bulkId,\n              { ...part, zoneId },\n              componentInputs,\n            ),\n          },\n        };\n      }\n      const recoverySources = buildNewestValidRavScoreRecoverySources({\n        fallbackSource: deployedRecoverySource,\n        preferredSource: progressiveRecoverySource,\n        // The source above uses only the installed authenticated production\n        // generation and its admitted continuity donors, never the new run.\n        protectedPreviousSource: deployedRecoverySource,\n        productionReferenceAt: generatedAt,\n        part: { ...part, zoneId },\n        onProtectedSameRunDmiRetention: (component, valueClass) => {\n          protectedSameRunDmiRetentions[component][valueClass] += 1;\n        },\n      });\n      let productionSeries;\n      try {\n        productionSeries = buildRavScoreProductionPartSeries({\n          part: { ...part, zoneId },\n          zone,\n          initialSelection,\n          previousCandidateGContinuation,\n          legacyCandidateGMigrationState,\n          candidateGRollbackMeasuredColdStart,\n          candidateGRollbackMeasuredWarmupContinuation,\n          targetReferenceAt: generatedAt,\n          recoverySources,\n          // T+118..T+120 were needed to derive the last public trends above,\n          // but must never extend the public score horizon or its state walk.\n          publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n            && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n          nativeCadenceHoldHours,\n          resolveNativeCadenceReferenceSample: sourceValidTime =>\n            latestVerifiedNativeCadenceSampleForPart(\n              { ...part, zoneId },\n              liveCurrentPilot,\n              sourceValidTime,\n            ),\n          resolveCandidateGNativeCadenceReferenceSample: sourceValidTime =>\n            latestVerifiedNativeCadenceSampleForPart(\n              { ...part, zoneId },\n              liveCurrentPilot,\n              sourceValidTime,\n              { projection: 'candidate-g-legacy-quantized' },\n            ),\n        });\n      } catch (error) {\n        if (error?.code === 'RAVSCORE_RECOVERY_REPLAY_CONFLICT'\n          && error?.message === 'RavScore recovery replay has a conflicting current component') {\n          // A failing cache build may have two differently projected, valid\n          // current histories. Diagnose with the unchanged replay validator,\n          // but emit only fixed categories and aggregate counts. In particular\n          // never log U/V, source IDs, points, hours or raw exception text.\n          try {\n            const diagnosis = summarizeRavScoreCurrentRecoveryConflicts({\n              sourceRecords: recoverySources,\n              startAt: replayStartAt,\n              targetAt: generatedAt,\n              replayCandidate: isolatedSources => buildRavScoreRecoveryReplay({\n                part: { ...part, zoneId },\n                initialState: initialSelection.state,\n                targetReferenceAt: generatedAt,\n                sourceRecords: isolatedSources,\n                publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n                  && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n                nativeCadenceHoldHours,\n              }),\n            });\n            console.error(`RAVSCORE_RECOVERY_CURRENT_CONFLICT_PROOF ${JSON.stringify(diagnosis)}`);\n          } catch {\n            console.error('RAVSCORE_RECOVERY_CURRENT_CONFLICT_PROOF_UNAVAILABLE');\n"],
    ["            const diagnosis = summarizeRavScoreWaveRecoveryConflictCandidates({\n              sourceRecords: recoverySources,\n              part: { ...part, zoneId },\n              startAt: replayStartAt,\n              targetAt: generatedAt,\n            });\n            console.error(`RAVSCORE_RECOVERY_WAVE_CONFLICT_CANDIDATES ${JSON.stringify(diagnosis)}`);\n            const isolatedProof = summarizeIsolatedRavScoreWaveReplayConflicts({\n              sourceRecords: recoverySources,\n              startAt: replayStartAt,\n              targetAt: generatedAt,\n              replayCandidate: isolatedSources => buildRavScoreRecoveryReplay({\n                requireNativeGridSampling: true,\n                liveCurrentPilot,\n                part: { ...part, zoneId },\n                initialState: initialSelection.state,\n                targetReferenceAt: generatedAt,\n                sourceRecords: isolatedSources,\n                publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n                  && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n                nativeCadenceHoldHours,\n              }),\n            });\n            console.error(`RAVSCORE_RECOVERY_WAVE_ISOLATED_PROOFS ${JSON.stringify(isolatedProof)}`);\n          } catch {\n            console.error('RAVSCORE_RECOVERY_WAVE_CONFLICT_CANDIDATES_UNAVAILABLE');\n", "            const diagnosis = summarizeRavScoreWaveRecoveryConflictCandidates({\n              sourceRecords: recoverySources,\n              part: { ...part, zoneId },\n              startAt: replayStartAt,\n              targetAt: generatedAt,\n            });\n            console.error(`RAVSCORE_RECOVERY_WAVE_CONFLICT_CANDIDATES ${JSON.stringify(diagnosis)}`);\n            const isolatedProof = summarizeIsolatedRavScoreWaveReplayConflicts({\n              sourceRecords: recoverySources,\n              startAt: replayStartAt,\n              targetAt: generatedAt,\n              replayCandidate: isolatedSources => buildRavScoreRecoveryReplay({\n                part: { ...part, zoneId },\n                initialState: initialSelection.state,\n                targetReferenceAt: generatedAt,\n                sourceRecords: isolatedSources,\n                publicHourly: hourly.filter(hour => Date.parse(hour.time) >= targetMs\n                  && Date.parse(hour.time) < targetMs + RAVSCORE_PUBLIC_FORECAST_HOURS * 3_600_000),\n                nativeCadenceHoldHours,\n              }),\n            });\n            console.error(`RAVSCORE_RECOVERY_WAVE_ISOLATED_PROOFS ${JSON.stringify(isolatedProof)}`);\n          } catch {\n            console.error('RAVSCORE_RECOVERY_WAVE_CONFLICT_CANDIDATES_UNAVAILABLE');\n"],
    ["        ? scores.find(score => score?.time === partForecastStartAt) ?? null\n        : null;\n      if (RAVSCORE_CURRENT_TRACE_PATH) {\n        const publicContext = scoreTraceHour?.ravScoreModel?.publicContext ?? null;\n        const waders = scoreTraceHour?.ravScoreModel?.modes?.waders ?? null;\n        const beach = scoreTraceHour?.ravScoreModel?.modes?.beach ?? null;\n        const stateOnlyHold = sanitizedTraceHour?.currentStateOnlyHold ?? null;\n        const stateOnlyHoldReference = stateOnlyHold\n          ? latestVerifiedNativeCadenceSampleForPart(\n            { ...part, zoneId },\n            liveCurrentPilot,\n            stateOnlyHold.sourceValidTime,\n            { requireNativeGridSampling: true, expectedHold: stateOnlyHold },\n          )\n          : null;\n        const stateOnlyHoldReferenceInRecovery = stateOnlyHoldReference !== null\n          && recovery.hourly.some(hour => hour?.time === stateOnlyHold.sourceValidTime\n            && hour?.currentProvenance?.status === 'verified');\n        const stateOnlyHoldUnknownGapBeforeTarget = stateOnlyHoldReference !== null\n          && recovery.hourly.some(hour => {\n            const hourMs = Date.parse(hour?.time ?? '');\n            return Number.isFinite(hourMs)\n              && hourMs > Date.parse(stateOnlyHold.sourceValidTime)\n              && hourMs < targetMs\n              && hour?.currentProvenance?.status !== 'verified';\n", "        ? scores.find(score => score?.time === partForecastStartAt) ?? null\n        : null;\n      if (RAVSCORE_CURRENT_TRACE_PATH) {\n        const publicContext = scoreTraceHour?.ravScoreModel?.publicContext ?? null;\n        const waders = scoreTraceHour?.ravScoreModel?.modes?.waders ?? null;\n        const beach = scoreTraceHour?.ravScoreModel?.modes?.beach ?? null;\n        const stateOnlyHold = sanitizedTraceHour?.currentStateOnlyHold ?? null;\n        const stateOnlyHoldReference = stateOnlyHold\n          ? latestVerifiedNativeCadenceSampleForPart(\n            { ...part, zoneId },\n            liveCurrentPilot,\n            stateOnlyHold.sourceValidTime,\n          )\n          : null;\n        const stateOnlyHoldReferenceInRecovery = stateOnlyHoldReference !== null\n          && recovery.hourly.some(hour => hour?.time === stateOnlyHold.sourceValidTime\n            && hour?.currentProvenance?.status === 'verified');\n        const stateOnlyHoldUnknownGapBeforeTarget = stateOnlyHoldReference !== null\n          && recovery.hourly.some(hour => {\n            const hourMs = Date.parse(hour?.time ?? '');\n            return Number.isFinite(hourMs)\n              && hourMs > Date.parse(stateOnlyHold.sourceValidTime)\n              && hourMs < targetMs\n              && hour?.currentProvenance?.status !== 'verified';\n"],
    ["const coastCorridors = buildCoastCorridors(features);\nconst previous = await readPrevious();\nconst coastalPointStateInjections = await readCoastalPointStateInjections();\nconst dmiForecastStore = await readDmiForecastStore();\nconst dmiBulkCache = await readDmiBulkCache();\nconst deployedDmiBulkCache = await readDmiBulkCache(DEPLOYED_DMI_BULK_CACHE_PATH);\nconst historicalDmiBulkCache = process.env.DMI_PART_CONTINUITY_DONOR_PATH\n  ? await readDmiBulkCache(process.env.DMI_PART_CONTINUITY_DONOR_PATH)\n  : null;\nif (process.env.DMI_PART_CONTINUITY_DONOR_PATH && !historicalDmiBulkCache) {\n  throw new Error('DMI_PART_CONTINUITY_DONOR_INVALID');\n}\nconst liveCurrentPilot = await readLiveCurrentPilot(coastalPartsContract);\nconst buildGeneratedAt = new Date().toISOString();\nconst generatedAt = resolveProductionReferenceTime(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR, new Date(buildGeneratedAt));\nconst activeParts = Object.entries(coastalPartsContract.zones ?? {}).flatMap(([zoneId, zoneParts]) =>\n  zoneParts.map(part => ({ ...part, zoneId })));\nconst persistedDmiPartRows = await unpackDmiPartContinuity(\n  dmiForecastStore.partContinuity, activeParts, generatedAt,\n);\nconst ravScoreCheckpoint = await loadRavScoreContinuationCheckpointForTarget({\n  checkpointPath: RAVSCORE_CONTINUATION_CHECKPOINT_PATH,\n  targetReference: generatedAt,\n});\nconst activeZoneIds = features.map(feature => feature.properties?.id).filter(Boolean);\n", "const coastCorridors = buildCoastCorridors(features);\nconst previous = await readPrevious();\nconst coastalPointStateInjections = await readCoastalPointStateInjections();\nconst dmiForecastStore = await readDmiForecastStore();\nconst dmiBulkCache = await readDmiBulkCache();\nconst deployedDmiBulkCache = await readDmiBulkCache(DEPLOYED_DMI_BULK_CACHE_PATH);\nconst historicalDmiBulkCache = process.env.DMI_PART_CONTINUITY_DONOR_PATH\n  ? await readDmiBulkCache(process.env.DMI_PART_CONTINUITY_DONOR_PATH)\n  : null;\nif (process.env.DMI_PART_CONTINUITY_DONOR_PATH && !historicalDmiBulkCache) {\n  throw new Error('DMI_PART_CONTINUITY_DONOR_INVALID');\n}\nconst liveCurrentPilot = await readLiveCurrentPilot();\nconst buildGeneratedAt = new Date().toISOString();\nconst generatedAt = resolveProductionReferenceTime(process.env.RAVRADAR_PRODUCTION_TARGET_HOUR, new Date(buildGeneratedAt));\nconst activeParts = Object.entries(coastalPartsContract.zones ?? {}).flatMap(([zoneId, zoneParts]) =>\n  zoneParts.map(part => ({ ...part, zoneId })));\nconst persistedDmiPartRows = await unpackDmiPartContinuity(\n  dmiForecastStore.partContinuity, activeParts, generatedAt,\n);\nconst ravScoreCheckpoint = await loadRavScoreContinuationCheckpointForTarget({\n  checkpointPath: RAVSCORE_CONTINUATION_CHECKPOINT_PATH,\n  targetReference: generatedAt,\n});\nconst activeZoneIds = features.map(feature => feature.properties?.id).filter(Boolean);\n"],
    ["          ? null : historicalDmiBulkCache });\n    // Plan from the same DMI/proxy/component adapter as scoring. Current is\n    // handled by its existing independently verified closure, not this plan.\n    planningRecords.set(part.partId, applyFeggesundOperationalWaveProxy(dmiRecord, part, sourcesByTime));\n  }\n  weatherComponents = await prepareWeatherComponentRuntime({\n    privateCacheRoot: path.resolve('.cache'), parts, productionReferenceAt: generatedAt,\n    retentionStartAt: new Date(Date.parse(generatedAt) - RESEARCH_HISTORY_HOURS * 3_600_000).toISOString(),\n    retentionEndAt: new Date(Date.parse(generatedAt) + (OPEN_METEO_FUTURE_HOURS - 1) * 3_600_000).toISOString(),\n    openMeteoSpatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,\n    copernicusBudgetMs: COMPONENT_COPERNICUS_BUDGET_MS,\n    openMeteoBudgetMs: COMPONENT_OPEN_METEO_BUDGET_MS,\n    readVerifiedHourly: (part, inputs) => {\n      const routed = applyVerifiedWaterSourceRoutingToPartHourly({\n        part, parentFeature: parentById.get(part.zoneId),\n        hourly: verifiedIntegratedPartHourly(\n          planningRecords.get(part.partId), dmiBulkCache, `PART::${part.partId}`, part,\n          { ...inputs, requireNativeGridSampling: false, liveCurrentPilot }),\n        ...waterSourceRoutingContext,\n      });\n      return assertDmiPartHourlyGridSamplingApplicable(routed.hourly, `PART::${part.partId}`, part,\n        { assertRoutedWaterLevelApplicable: routed.assertRoutedWaterLevelApplicable, liveCurrentPilot });\n    },\n  });\n  planningRecords.clear();\n  output.weatherEngine.componentFallback = weatherComponents.summary;\n  // Acquisition evidence must survive a later score/replay failure. This\n  // projection contains fixed counters/codes, never private weather payloads.\n  console.log(JSON.stringify(safeWeatherComponentSummary(weatherComponents.summary)));\n  reportWeatherBuildStage('component-runtime-ready', {\n    remainingNeedCount: weatherComponents.summary?.remainingNeedCount ?? null,\n  });\n}\nconst coastalPartScoreBuild = coastalPartsContract.enabled\n  ? scoreCoastalPartsRuntime(\n", "          ? null : historicalDmiBulkCache });\n    // Plan from the same DMI/proxy/component adapter as scoring. Current is\n    // handled by its existing independently verified closure, not this plan.\n    planningRecords.set(part.partId, applyFeggesundOperationalWaveProxy(dmiRecord, part, sourcesByTime));\n  }\n  weatherComponents = await prepareWeatherComponentRuntime({\n    privateCacheRoot: path.resolve('.cache'), parts, productionReferenceAt: generatedAt,\n    retentionStartAt: new Date(Date.parse(generatedAt) - RESEARCH_HISTORY_HOURS * 3_600_000).toISOString(),\n    retentionEndAt: new Date(Date.parse(generatedAt) + (OPEN_METEO_FUTURE_HOURS - 1) * 3_600_000).toISOString(),\n    openMeteoSpatialPolicies: OPEN_METEO_NATIVE_NEAREST_POLICIES,\n    copernicusBudgetMs: COMPONENT_COPERNICUS_BUDGET_MS,\n    openMeteoBudgetMs: COMPONENT_OPEN_METEO_BUDGET_MS,\n    readVerifiedHourly: (part, inputs) => applyVerifiedWaterSourceRoutingToPartHourly({\n      part, parentFeature: parentById.get(part.zoneId),\n      hourly: verifiedIntegratedPartHourly(\n        planningRecords.get(part.partId), dmiBulkCache, `PART::${part.partId}`, part, inputs),\n      ...waterSourceRoutingContext,\n    }).hourly,\n  });\n  planningRecords.clear();\n  output.weatherEngine.componentFallback = weatherComponents.summary;\n  // Acquisition evidence must survive a later score/replay failure. This\n  // projection contains fixed counters/codes, never private weather payloads.\n  console.log(JSON.stringify(safeWeatherComponentSummary(weatherComponents.summary)));\n  reportWeatherBuildStage('component-runtime-ready', {\n    remainingNeedCount: weatherComponents.summary?.remainingNeedCount ?? null,\n  });\n}\nconst coastalPartScoreBuild = coastalPartsContract.enabled\n  ? scoreCoastalPartsRuntime(\n"],
  ];
  for (const [after, before] of hunks) {
    assert.equal(source.split(after).length, 2, 'exact contextual current-grid delta must occur once');
    source = source.replace(after, () => before);
  }
  assert.equal(digest(source), "49177c9ec984012dcccc71de88ed971d826499270ece2800abbafc3cb00ec1b0", 'whole updater must match genuine 044d before the existing transport inverse');
  return source;
}

function inverseOceanObsSettlement(source) {
  const invert = (after, before) => {
    assert.equal(source.split(after).length, 2, 'exact OceanObs delta must occur once');
    source = source.replace(after, before);
  };
  invert("import { assertWeatherTransportSettlement, isWeatherTransportStopUnproved, throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';",
    "import { assertWeatherTransportSettlement, throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';");
  invert('    const inputs = [dmiWaterStations(), dmiLatestSeaLevels(), waterStationRouting(), cachedStationLevels(new Date().toISOString())];\n'
    + '    let values;\n'
    + '    try { values = await Promise.all(inputs); }\n'
    + '    catch (firstError) {\n'
    + '      const settled = await Promise.allSettled(inputs);\n'
    + "      if (settled.some(result => result.status === 'rejected' && isWeatherTransportStopUnproved(result.reason))) {\n"
    + '        throwWeatherTransportStopUnproved(inputs, firstError);\n'
    + '      }\n'
    + '      throw firstError;\n'
    + '    }\n'
    + '    const [rawStations, freshLevels, routing, cachedLevels] = values;\n',
  '    const [rawStations, freshLevels, routing, cachedLevels] = await Promise.all([dmiWaterStations(), dmiLatestSeaLevels(), waterStationRouting(), cachedStationLevels(new Date().toISOString())]);\n');
  const observedCatch = '    return interpolateWaterLevelAlongCoast(point, coastPath, stations, levels, { haversineKm, requireBracket: true });\n  } catch (error) {\n';
  invert(observedCatch + '    if (isWeatherTransportStopUnproved(error)) throw error;\n    assertWeatherTransportSettlement();\n', observedCatch);
  const observation = '    const observation = await observedDmiWaterLevel(feature, coastCorridors);\n';
  invert(observation + '    assertWeatherTransportSettlement();\n', observation);
  invert('  });\n  assertWeatherTransportSettlement();\n  dmiPersistentRuntime.lastObservationAt = generatedAt;\n',
    '  });\n  dmiPersistentRuntime.lastObservationAt = generatedAt;\n');
  invert('const rawStationRegistry = await dmiWaterStations().catch(error => {\n'
    + '  if (isWeatherTransportStopUnproved(error)) throw error;\n  assertWeatherTransportSettlement();\n'
    + '  return readCachedWaterStations();\n});\n',
  'const rawStationRegistry = await dmiWaterStations().catch(() => readCachedWaterStations());\n');
  invert('const qualityLevels = dmiObservationSkipReason ? await cachedStationLevels(generatedAt) : await dmiLatestSeaLevels().catch(error => {\n'
    + '  if (isWeatherTransportStopUnproved(error)) throw error;\n  assertWeatherTransportSettlement();\n'
    + '  return new Map();\n});\n',
  'const qualityLevels = dmiObservationSkipReason ? await cachedStationLevels(generatedAt) : await dmiLatestSeaLevels().catch(() => new Map());\n');
  return source;
}

function inverseLegacyTransportSettlement(source) {
  source = inverseOceanObsSettlement(source);
  const transportImport = "import { assertWeatherTransportSettlement, throwWeatherTransportStopUnproved } from './lib/weather-transport-settlement.mjs';\n";
  assert.equal(source.split(transportImport).length, 2);
  source = source.replace(transportImport, '');
  const guards = /^[ \t]*assertWeatherTransportSettlement\(\);\n/gm;
  assert.equal([...source.matchAll(guards)].length, 12);
  source = source.replace(guards, '');
  const invert = (after, before) => {
    assert.equal(source.split(after).length, 2, 'exact transport delta must occur once');
    source = source.replace(after, before);
  };
  invert('    let response = null, bodySettled = false, cancellation = null;\n', '');
  invert('      response = await fetch(url, {\n', '      const response = await fetch(url, {\n');
  invert('      const text = await response.text();\n'
    + '      bodySettled = true; // Fulfilled body consumption, before JSON parsing.\n'
    + '      const data = JSON.parse(text);\n', '      const data = await response.json();\n');
  invert('      const firstFailure = { error }; // Never use error truthiness for ownership.\n'
    + '      if (response && !bodySettled) {\n'
    + '        try {\n'
    + '          cancellation = response.body?.cancel();\n'
    + '          await cancellation;\n'
    + '          bodySettled = true;\n'
    + '        } catch {\n'
    + '          controller.abort();\n'
    + '          throwWeatherTransportStopUnproved({ response, controller, cancellation }, firstFailure.error);\n'
    + '        }\n'
    + '      }\n', '');
  invert('    } finally {\n      controller.abort();\n      clearTimeout(timeout);\n',
    '    } finally {\n      clearTimeout(timeout);\n');
  invert('      if (dmi && (!response || bodySettled)) releaseDmiRequestSlot();\n',
    '      if (dmi) releaseDmiRequestSlot();\n');
  return source;
}

// Main 42eb83053cbcc878e51faac73e803846ee54234b has a top-level updater,
// not the isolated 519 restored SOURCE/session API. This checks the actual
// DMI queue body only; it is not SOURCE, original-B/S, history or whole-job proof.
test('positive native-origin caller preserves exact historical updater and refuses every missing hunk', async () => {
  const source = inverseSavedCurrentReplayUpdater(await sourceText(producerPath));
  assert.equal(digest(source), '608b795d382d96fed7435ffd9437f589f8771ea742ec65f75053d25059b9d25d');
  assert.equal(digest(inverseEstablishedNativeCurrentUpdater(source)),
    'c360d7c6370b6ff4078ce94e306478bd3f5e38fdda90d4006f3e4329c976458c');
  for (const hunk of establishedNativeCurrentUpdaterHunks) {
    assert.throws(() => inverseEstablishedNativeCurrentUpdater(
      source.replace(hunk.after, () => hunk.before)), /each exact reviewed positive-origin hunk/);
  }
});

test('reviewed epoch orchestration has an exact whole-source inverse to genuine 903307', async () => {
  const source = await sourceText(producerPath);
  const baseline = inverseWeatherStateEpochIntegration(source);
  assert.equal(Buffer.byteLength(baseline), 224231);
  assert.throws(() => inverseWeatherStateEpochIntegration(source.replace(
    '    checkpointStates = stateEpochView.checkpointStates;',
    '    checkpointStates = {};')), /each exact reviewed epoch hunk/);
  assert.throws(() => inverseWeatherStateEpochIntegration(source + '// unreviewed drift\n'),
    /complete genuine 903307 updater/);
  assert.throws(() => inverseWeatherStateEpochIntegration(source.replace(
    '  ATOMIC_COMPONENT_TUPLE_KEYS,\n', '  UNREVIEWED_TUPLE_KEYS,\n')), /each exact reviewed epoch hunk/);
});

test('main updater is byte-identical outside the checkpoint import and normal queue refusal', async () => {
  const source = inverseLegacyTransportSettlement(inverseCurrentGridIntegration(
    await inverseSharedRecoveryRecordExtraction(inverseWeatherStateEpochIntegration(await sourceText(producerPath)))));
  const currentImport = "import { readDmiForecastFile, writeDmiForecastFileAtomic, isDmiForecastCheckpointStopUnproved } from './lib/dmi-forecast-file.mjs';";
  const baselineImport = "import { readDmiForecastFile, writeDmiForecastFileAtomic } from './lib/dmi-forecast-file.mjs';";
  const refusal = "    // A live/uncertain checkpoint is not a provider miss. Preserve the actual\n    // writer refusal before any later zone, component, history or public write.\n    if (isDmiForecastCheckpointStopUnproved(error)) throw error;\n";
  assert.equal(source.split(currentImport).length, 2);
  assert.equal(source.split(refusal).length, 2);
  assert.equal(digest(source.replace(currentImport, baselineImport).replace(refusal, '')),
    'd6f2a49d1099eb2f3d024f54375af8e989d6636e7a0a0b47f0d9b75965fd0bff');
});

test('new OLD-original donor wiring is explicit, source-bound, no-op when absent, and collision-safe', async () => {
  const source = inverseWeatherStateEpochIntegration(await sourceText(producerPath));
  assert.equal(source.split(legacyCurrentOriginalDonorBlock).length, 2);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction('process', 'crypto', 'fs', 'generatedAt',
    'DEPLOYED_DMI_BULK_CACHE_PATH', 'activeParts', 'historicalDmiBulkCache',
    'assertRavScoreModelBinding', 'readDmiLegacyCurrentOriginals',
    legacyCurrentOriginalDonorBlock + 'return historicalDmiBulkCache;');
  const files = new Map([
    ['.cache/ravscore-current-history-demand.json', Buffer.from('demand')],
    ['data/live/coastal-parts-v2.json', Buffer.from('registry')],
    ['data/zones.geojson', Buffer.from('zones')],
    ['.cache/deployed-dmi-bulk-cache.json', Buffer.from('original-bulk')],
    ['data/live/dmi-forecast-cache.json', Buffer.from('original-forecast')],
  ]);
  const generatedAt = '2026-10-16T10:00:00.000Z', modelBinding = { exact: 'fixture' };
  const expected = { productionReferenceAt: generatedAt, modelBinding,
    historyDemandSha256: `sha256:${digest(files.get('.cache/ravscore-current-history-demand.json'))}`,
    registrySha256: `sha256:${digest(files.get('data/live/coastal-parts-v2.json'))}`,
    sourceHashes: Object.fromEntries([['zones', 'data/zones.geojson'],
      ['deployedBulk', '.cache/deployed-dmi-bulk-cache.json'],
      ['forecast', 'data/live/dmi-forecast-cache.json']]
      .map(([role, file]) => [role, `sha256:${digest(files.get(file))}`])),
    requestsSha256: `sha256:${'a'.repeat(64)}` };
  const part = { partId: 'fixture' }, donor = { zones: { genuine: 'fixture-only' } };
  const reads = [], calls = [];
  let reconstructed = donor;
  const run = (value, oldDonor = null) => execute({ env: value ? {
    RAVRADAR_DMI_LEGACY_CURRENT_EXPECTATION: JSON.stringify(value) } : {}, cwd: () => '/fixture' },
  crypto, { readFile: async file => { reads.push(file); assert.ok(files.has(file)); return files.get(file); } },
  generatedAt, '.cache/deployed-dmi-bulk-cache.json', [part], oldDonor,
  binding => assert.deepEqual(binding, modelBinding), async args => { calls.push(args); return reconstructed; });
  assert.equal(await run(null), null);
  assert.deepEqual(reads, []); assert.deepEqual(calls, []);
  assert.equal(await run(expected), donor);
  assert.deepEqual(reads, [...files.keys()]);
  assert.deepEqual(calls, [{ repositoryRoot: '/fixture', parts: [part], expected, required: true }]);
  await assert.rejects(run({ ...expected, productionReferenceAt: '2026-10-16T11:00:00.000Z' }),
    /DMI_LEGACY_CURRENT_EXPECTED_INPUT_MISMATCH/);
  assert.equal(calls.length, 1, 'invalid immutable input must fail before reading a new donor');
  const originalForecast = files.get('data/live/dmi-forecast-cache.json');
  files.set('data/live/dmi-forecast-cache.json', Buffer.from('changed-original'));
  await assert.rejects(run(expected), /DMI_LEGACY_CURRENT_EXPECTED_INPUT_MISMATCH/);
  files.set('data/live/dmi-forecast-cache.json', originalForecast);
  await assert.rejects(run(expected, { existing: true }), /DMI_LEGACY_CURRENT_DONOR_COLLISION/);
  reconstructed = null;
  const existing = { existing: true };
  assert.equal(await run(expected, existing), existing, 'empty requests preserve an existing historical donor');
  assert.throws(() => inverseLegacyCurrentOriginalDonorIntegration(
    source.replace('required: true });', 'required: false });')), /exact new OLD-original/);
});

test('shared normal DMI recovery module is import-safe, outside I71, and byte-exactly relocatable', async t => {
  const source = inverseWeatherStateEpochIntegration(await sourceText(producerPath));
  const shared = await sourceText(new URL('./lib/private-dmi-recovery-record.mjs', import.meta.url));
  t.mock.method(globalThis, 'fetch', () => { assert.fail('NETWORK_FORBIDDEN'); });
  const normal = await import('./lib/private-dmi-recovery-record.mjs');
  assert.equal(typeof normal.ATOMIC_COMPONENT_TUPLE_KEYS, 'object');
  for (const name of ['bulkZoneToForecastRecord', 'buildPartDmiForecastWithProtectedRetention',
    'buildPrivateDmiRecoveryRecord', 'mergeHourlyPreferDmi']) assert.equal(typeof normal[name], 'function');
  assert.doesNotMatch(shared, /from ['"]node:|\b(?:process\.|fetch\(|await\s)/);
  assert.doesNotMatch(shared, /from ['"].*update-weather/);
  const { GENERATED_RAVSCORE_MODEL_BUNDLE_MANIFEST: manifest } =
    await import('../js/core/ravscore-model-bundle.generated.js');
  for (const file of ['scripts/update-weather.mjs', 'scripts/lib/private-dmi-recovery-record.mjs']) {
    assert.equal(manifest.files.some(entry => entry.path === file), false,
      'normal orchestration extraction must not enter the unchanged model closure');
  }
  await inverseSharedRecoveryRecordExtraction(source, shared);
  await assert.rejects(inverseSharedRecoveryRecordExtraction(source,
    shared.replace('  ATOMIC_COMPONENT_TUPLE_KEYS,\n', '  UNREVIEWED_TUPLE_KEYS,\n')),
    /each exact reviewed tuple export/);
  await assert.rejects(inverseSharedRecoveryRecordExtraction(source,
    shared.replace('const SHORT_DMI_WATER_GAP_HOURS = 6;', 'const SHORT_DMI_WATER_GAP_HOURS = 7;')),
    /complete reviewed shared module/);
  await assert.rejects(inverseSharedRecoveryRecordExtraction(
    source.replace('// Shared recovery record: records', '// Shared recovery record: records-mutated'), shared),
    /complete genuine pre-extraction updater/);
});

// Exact TEST-ONLY outer inverse of the reviewed recordwise PART replacement.
// The genuine95 module and every older mechanical-extraction oracle stay fixed.
const RECORDWISE_PART_WRITER_REVIEW = Object.freeze({
  before: Object.freeze({ bytes: 28925, sha256: 'ac1cbf3909daad48e126a23c1c724e942344750c8856308c2e2a74d842a053a6' }),
  after: Object.freeze({ bytes: 29084, sha256: '75c10458973f5e3cdf2969b35c76698239e2baf696b4f0ff8fd4b466bdc3c536' }),
  hunks: Object.freeze([
    Object.freeze({
      before: "      if (key === 'waterSourceContinuity') {\n        // A qualified merged bank follows the same bounded recordwise path as\n        // an unchanged indexed bank, never a whole-bank metadata stringify.\n        if (!plain(value) || !Array.isArray(value.entries)) invalid('SHAPE_INVALID');\n        await append('\"waterSourceContinuity\":{');\n",
      after: "      if (key === 'waterSourceContinuity' || key === 'partContinuity' && plain(value)) {\n        // A qualified merged bank follows the same bounded recordwise path as\n        // an unchanged indexed bank, never a whole-bank metadata stringify.\n        if (!plain(value) || !Array.isArray(value.entries)) invalid('SHAPE_INVALID');\n        await append(JSON.stringify(key) + ':{');\n",
    }),
    Object.freeze({
      before: "              if (Buffer.byteLength(text) > MAX_WATER_SOURCE_ENTRY_BYTES) invalid('RECORD_SIZE_LIMIT');\n",
      after: "              if (Buffer.byteLength(text) > (key === 'waterSourceContinuity'\n                ? MAX_WATER_SOURCE_ENTRY_BYTES : MAX_CONTINUITY_ENTRY_BYTES)) invalid('RECORD_SIZE_LIMIT');\n",
    }),
    Object.freeze({
      before: "    if (index.continuity) {\n      await append(',\"partContinuity\":{');\n",
      after: "    if (index.continuity && !plain(metadata.partContinuity)) {\n      await append(',\"partContinuity\":{');\n",
    }),
  ]),
});
function inverseRecordwisePartWriter(source) {
  assert.equal(typeof source, 'string', 'whole recordwise PART writer text');
  const review = RECORDWISE_PART_WRITER_REVIEW;
  if (Buffer.byteLength(source) === review.before.bytes && digest(source) === review.before.sha256) return source;
  assert.equal(Buffer.byteLength(source), review.after.bytes, 'whole reviewed recordwise PART writer size');
  assert.equal(digest(source), review.after.sha256, 'whole reviewed recordwise PART writer SHA');
  for (const hunk of review.hunks) {
    assert.equal(source.split(hunk.after).length, 2, 'exact reviewed recordwise PART writer hunk');
    source = source.replace(hunk.after, () => hunk.before);
  }
  assert.equal(Buffer.byteLength(source), review.before.bytes, 'whole genuine95 recordwise writer size');
  assert.equal(digest(source), review.before.sha256, 'whole genuine95 recordwise writer SHA');
  return source;
}

test('main parser policy, public readers, serializer and record writer are preserved by mechanical extraction', async () => {
  const source = inverseRecordwisePartWriter(await sourceText(new URL('./lib/dmi-forecast-file.mjs', import.meta.url)));
  const branding = "// Actual in-process checkpoint state, not a cross-process owner or a receipt\n// that authorizes a replacement worker. Preserve an uncertain handle/stage.\nconst checkpointWriters = new Map(), checkpointStopErrors = new WeakSet();\nexport function isDmiForecastCheckpointStopUnproved(error) {\n  return checkpointStopErrors.has(error);\n}\n\n";
  assert.equal(source.split(branding).length, 2);
  let baseline = source.replace(branding, '');
  const header = 'async function inspectDmiForecastHandle(file, handle, stat, maximumRecordBytes) {\n';
  const coreStart = baseline.indexOf(header);
  const publicStart = baseline.indexOf('export async function inspectDmiForecastFile', coreStart);
  const publicEnd = baseline.indexOf('export async function readDmiForecastRecord', publicStart);
  assert.ok(coreStart > 0 && publicStart > coreStart && publicEnd > publicStart);
  const core = baseline.slice(coreStart + header.length, publicStart);
  assert.ok(core.endsWith('}\n\n'));
  const body = core.slice(0, -3);
  const checksAt = body.indexOf('  if (!equalStat(stat, await handle.stat()))');
  assert.ok(checksAt > 0);
  const call = '  let failed = false;\n  try {\n    return await inspectDmiForecastHandle(file, handle, stat, maximumRecordBytes);\n';
  const wrapper = baseline.slice(publicStart, publicEnd);
  assert.equal(wrapper.split(call).length, 2);
  // Inverse only the owned-handle extraction and its two-space indentation.
  // The resulting entire non-writer module must equal main42eb byte for byte.
  const original = wrapper.replace(call, body.slice(0, checksAt) + '  let failed = false;\n  try {\n'
    + body.slice(checksAt).replace(/^(?=.)/gm, '  '));
  baseline = baseline.slice(0, coreStart) + original + baseline.slice(publicEnd);
  const start = baseline.indexOf('export async function writeDmiForecastFileAtomic');
  const end = baseline.indexOf('// A record-at-a-time', start);
  assert.ok(start > 0 && end > start);
  assert.equal(digest(baseline.slice(0, start) + baseline.slice(end)),
    'ecf1e9813312af7244be828aa667b5753f543e8d052f8fda49dc4c562255826c');
});

test('recordwise PART writer has an exact outer inverse and refuses every changed reviewed hunk', async () => {
  const actual = await sourceText(new URL('./lib/dmi-forecast-file.mjs', import.meta.url));
  const original = inverseRecordwisePartWriter(actual);
  assert.equal(digest(original), RECORDWISE_PART_WRITER_REVIEW.before.sha256);
  assert.equal(inverseRecordwisePartWriter(original), original, 'The genuine95 source stays byte-identical');
  for (const hunk of RECORDWISE_PART_WRITER_REVIEW.hunks) {
    assert.equal(actual.split(hunk.after).length, 2);
    const changed = actual.replace(hunk.after, () => hunk.before);
    assert.notEqual(changed, actual);
    assert.throws(() => inverseRecordwisePartWriter(changed), /whole reviewed recordwise PART writer|exact reviewed recordwise PART writer/);
  }
  assert.throws(() => inverseRecordwisePartWriter(actual + '// unreviewed drift\n'), /whole reviewed recordwise PART writer/);
  assert.throws(() => inverseRecordwisePartWriter(null), /whole recordwise PART writer text/);
});

test('47 baseline commands plus genuine OLD, NEW native, epoch and pure diagnostic checks reach normal checkpoint integration exactly once', async () => {
  // These historical command literals belong to their genuine native0600
  // package. Keep every original assertion on that actual immutable source;
  // the current normal caller is checked separately below, not retagged OLD.
  const frozen = await withFrozenNative0600TestSource('native', async sourceRoot =>
    JSON.parse(await fs.readFile(path.join(sourceRoot, 'package.json'), 'utf8')).scripts);
  assert.equal(frozen.head, '60d999a68136c43acb4d3664bbd66eed47283bb2');
  assert.equal(frozen.tree, 'ead5743dd9098035b0de5f748de2009460506971');
  const scripts = frozen.result;
  const { expandSourceCommands } = await import('./validate-source-once.mjs');
  const commands = expandSourceCommands(scripts, 'validate:source:checks');
  const nativeCheck = 'node --test --test-concurrency 2 ' + [
    'scripts/test-native-sampling-identity-successor.mjs',
    'scripts/test-native-identity-normal-readiness.mjs',
    'scripts/test-native-identity-normal-routing.mjs',
    'scripts/test-owned-i71-native-identity-working.mjs',
    'scripts/test-native-identity-staging-working-copy.mjs',
    'scripts/test-native-identity-installed-migration-metadata.mjs',
    'scripts/test-native-identity-checkpoint-runtime.mjs',
    'scripts/test-native-identity-workflow.mjs',
  ].join(' ');
  const sourceChecks = ['node scripts/check-account-assistant-issued-source.mjs',
    'node scripts/check-native-identity-frozen-i71-source.mjs',
    'node scripts/build-native-sampling-identity-original-binding-successor.mjs --check',
    'node scripts/test-current-grid-prewrite-diagnostic.mjs',
    'node scripts/test-native-identity-frozen-i71-source.mjs', nativeCheck,
    scripts['test:weather-state-epoch']];
  for (const check of sourceChecks) assert.equal(commands.filter(command => command === check).length, 1);
  assert.equal(commands.includes('node scripts/build-account-assistant-binding-successor.mjs --check'), false);
  assert.equal(commands.includes('node scripts/build-current-grid-original-binding-successor.mjs --check'), false,
    'Issued220 must be checked only with its genuine frozen source, not rebuilt against NEW.');
  assert.equal(commands.filter(command => !sourceChecks.includes(command)).length, 47);
  const invoked = commands.flatMap(command => command.split(' '));
  assert.equal(invoked.filter(file => file === 'scripts/test-dmi-forecast-file.mjs').length, 1);
  assert.equal(invoked.filter(file => file === 'scripts/test-weather-update-entrypoint.mjs').length, 0);
  const grouped = await sourceText(new URL('./test-dmi-forecast-file.mjs', import.meta.url));
  assert.equal(grouped.split("await import('./test-weather-update-entrypoint.mjs');").length, 2);
});

test('current frozen routes and warmup checks reach normal checkpoint integration exactly once', async () => {
  const actualScripts = inverseReviewedAccountStatisticsAssistantSourceScripts(JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf8')).scripts);
  // Retain the entire genuine140000 command oracle on its real frozen input,
  // then separately qualify how the current source reaches those same targets.
  const scripts = await withFrozenEstablishedNativeCurrentOriginSourceTarget('builder', async sourceRoot =>
    JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'),'utf8')).scripts);
  const { expandSourceCommands } = await import('./validate-source-once.mjs');
  const commands = expandSourceCommands(scripts, 'validate:source:checks');
  for (const check of [
    'node scripts/check-account-assistant-issued-source.mjs',
    'node scripts/check-native-identity-frozen-i71-source.mjs',
    'node scripts/test-current-grid-prewrite-diagnostic.mjs',
    'node scripts/run-frozen-current-memory-warmup-source-targets.mjs builder',
    'node scripts/build-established-native-current-origin-successor.mjs --check',
    'node --test scripts/test-model-source-imports.mjs scripts/test-established-native-current-origin-successor.mjs scripts/test-established-native-current-origin-postgres-source.mjs scripts/test-code-only-public-coastal-registry-stage.mjs',
    'node scripts/test-established-native-current-origin-followers.mjs',
    'node scripts/run-frozen-native0600-source-targets.mjs native',
    'node scripts/run-frozen-native0600-source-targets.mjs epoch',
    'node scripts/run-frozen-native0600-source-targets.mjs install',
    'node scripts/run-frozen-native0600-source-targets.mjs readiness',
    ...expandSourceCommands(scripts, 'test:current-memory-warmup'),
  ]) assert.equal(commands.filter(command => command === check).length, 1,
    'Every current or genuine historical route must run exactly once.');
  assert.equal(commands.includes('node scripts/build-native-sampling-identity-original-binding-successor.mjs --check'), false,
    'The issued native0600 builder is checked only against its genuine immutable source.');
  assert.equal(commands.includes('node scripts/build-current-memory-warmup-successor.mjs --check'), false,
    'The issued0200 builder is checked only through its genuine frozen source, never current origin source.');
  const invoked = commands.flatMap(command => command.split(' '));
  for(const file of ['scripts/test-model-source-imports.mjs',
    'scripts/test-established-native-current-origin-successor.mjs',
    'scripts/test-established-native-current-origin-postgres-source.mjs',
    'scripts/test-code-only-public-coastal-registry-stage.mjs',
    'scripts/test-established-native-current-origin-followers.mjs'])
    assert.equal(invoked.filter(value => value === file).length, 1,
      'Every actual origin source/current/follower target must occur exactly once.');
  assert.equal(invoked.filter(file => file === 'scripts/test-dmi-forecast-file.mjs').length, 1);
  assert.equal(invoked.filter(file => file === 'scripts/test-weather-update-entrypoint.mjs').length, 0);
  const grouped = await sourceText(new URL('./test-dmi-forecast-file.mjs', import.meta.url));
  assert.equal(grouped.split("await import('./test-weather-update-entrypoint.mjs');").length, 2);
  const actualCommands=expandSourceCommands(actualScripts,'validate:source:checks');
  const historicalTargets={
    'model-imports':'scripts/test-model-source-imports.mjs',
    builder:'scripts/build-established-native-current-origin-successor.mjs',
    successor:'scripts/test-established-native-current-origin-successor.mjs',
    'postgres-source':'scripts/test-established-native-current-origin-postgres-source.mjs',
    followers:'scripts/test-established-native-current-origin-followers.mjs',
  };
  const inventory=JSON.parse(await fs.readFile(new URL('./lib/established-native-current-origin-source-target-inventory.json',import.meta.url),'utf8'));
  assert.deepEqual(inventory.targets,historicalTargets);
  for(const group of Object.keys(historicalTargets))
    assert.equal(actualCommands.filter(command=>command===
      'node scripts/run-frozen-established-native-current-origin-source-targets.mjs '+group).length,1,
    'Each unchanged historical assertion runs once in its genuine source host');
  for(const target of Object.values(historicalTargets))
    assert.equal(actualCommands.flatMap(command=>command.split(' ')).includes(target),false,
      'Old issued140000 targets must not run against an unqualified current source');
  for(const check of ['node --test scripts/test-last-mile-enclosure-current-model-imports.mjs scripts/test-code-only-public-coastal-registry-stage.mjs',
    'node scripts/check-account-assistant-issued-source.mjs','node scripts/check-native-identity-frozen-i71-source.mjs',
    'node scripts/test-current-grid-prewrite-diagnostic.mjs',
    'node scripts/run-frozen-native0600-source-targets.mjs native',
    'node scripts/run-frozen-native0600-source-targets.mjs epoch',
    'node scripts/run-frozen-native0600-source-targets.mjs install',
    'node scripts/run-frozen-native0600-source-targets.mjs readiness',
    ...expandSourceCommands(actualScripts,'test:last-mile-enclosure'),
    ...expandSourceCommands(actualScripts,'test:current-memory-warmup')])
    assert.equal(actualCommands.filter(command=>command===check).length,1);
  const actualInvoked=actualCommands.flatMap(command=>command.split(' '));
  assert.equal(actualInvoked.filter(file=>file==='scripts/test-dmi-forecast-file.mjs').length,1);
  assert.equal(actualInvoked.filter(file=>file==='scripts/test-weather-update-entrypoint.mjs').length,0);
});

test('actual DMI queue propagates an uncertain real checkpoint but preserves proved safe failure handling', async t => {
  const source = await sourceText(producerPath);
  const start = source.indexOf('for (const feature of targetFeatures) {');
  const end = source.indexOf('// DMI oceanObs hentes', start);
  assert.ok(start > 0 && end > start);
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  for (const fault of ['rename-noop', 'copy-instead-of-rename', 'write-close-noop',
    'scan-close-noop', 'scan-read-and-close-noop', 'safe-sync-failure',
    'changed-valid-bytes', 'scan-close-after-error', 'rename-before-error',
    'rename-then-error', 'parser-close-noop', 'parser-read-and-close-noop',
    'parser-close-after-error', 'parser-read-and-close-after-error']) await t.test(fault, async st => {
    const uncertain = ['rename-noop', 'copy-instead-of-rename', 'write-close-noop',
      'scan-close-noop', 'scan-read-and-close-noop', 'parser-close-noop', 'parser-read-and-close-noop'].includes(fault);
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-weather-checkpoint-queue-'));
    let closeRetained;
    st.after(async () => {
      if (closeRetained) await closeRetained();
      assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('rr-weather-checkpoint-queue-'));
      await fs.rm(folder, { recursive: true, force: true });
    });
    const file = path.join(folder, 'forecast.json');
    const document = { schemaVersion: 2, zones: {}, runtime: { nextZoneCursor: 0 } };
    const original = Buffer.from(JSON.stringify(document));
    await fs.writeFile(file, original);
    document.runtime.nextZoneCursor = 1;
    const sentinel = new Error('SYNTHETIC_DMI_CHECKPOINT_FAILURE');
    const open = fs.open.bind(fs), rename = fs.rename.bind(fs), copy = fs.copyFile.bind(fs);
    st.mock.method(fs, 'rename', async (from, to) => {
      if (fault === 'rename-noop') return;
      if (fault === 'copy-instead-of-rename') return copy(from, to);
      if (fault === 'rename-before-error') throw sentinel;
      await rename(from, to);
      if (fault === 'rename-then-error') throw sentinel;
    });
    let firstScan = true;
    st.mock.method(fs, 'open', async (target, ...args) => {
      const handle = await open(target, ...args);
      if (!String(target).startsWith(file + '.forecast-stage-')) return handle;
      if (args[0] === 'r' && fault.startsWith('parser-')) {
        const read = handle.read.bind(handle), close = handle.close.bind(handle);
        let parsing = false;
        st.mock.method(handle, 'read', async (buffer, offset, length, position) => {
          if (position === 0 && length === 256 * 1024) {
            parsing = true;
            if (fault.endsWith('noop')) closeRetained = close;
            if (fault.includes('read-and-close')) throw sentinel;
          }
          return read(buffer, offset, length, position);
        });
        st.mock.method(handle, 'close', async () => {
          if (!parsing) return close();
          if (fault.endsWith('noop')) return;
          await close();
          throw fault.includes('read-and-close') ? new Error('SYNTHETIC_SECONDARY_PARSER_CLOSE') : sentinel;
        });
      }
      if (args[0] === 'wx') {
        if (fault === 'safe-sync-failure') st.mock.method(handle, 'sync', async () => { throw sentinel; });
        if (fault === 'write-close-noop') {
          closeRetained = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => {});
        }
        if (fault === 'changed-valid-bytes') {
          const sync = handle.sync.bind(handle);
          st.mock.method(handle, 'sync', async () => {
            await sync();
            const before = await fs.readFile(target, 'utf8');
            const changed = before.replace('"nextZoneCursor":1', '"nextZoneCursor":2');
            assert.notEqual(changed, before);
            assert.equal(Buffer.byteLength(changed), Buffer.byteLength(before));
            await fs.writeFile(target, changed);
          });
        }
      } else if (args[0] === 'r' && firstScan) {
        firstScan = false;
        if (fault === 'scan-close-noop' || fault === 'scan-read-and-close-noop') {
          closeRetained = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => {});
          if (fault === 'scan-read-and-close-noop') st.mock.method(handle, 'read', async () => { throw sentinel; });
        } else if (fault === 'scan-close-after-error') {
          const close = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => { await close(); throw sentinel; });
        }
      }
      return handle;
    });
    const feature = { properties: { id: 'SYNTHETIC-ZONE' } }, next = { zones: {} };
    const output = { zones: { 'SYNTHETIC-ZONE': { attempts: [] } } };
    let checkpointCalls = 0, warnings = 0;
    const scope = {
      targetFeatures: [feature], stableFeatures: [feature], adaptiveLiveBudget: 1,
      liveDmiAssigned: 0, dmiRequestBudgetUsed: 0, DMI_REQUEST_BUDGET: 1,
      dmiRateLimitTriggered: false, dmiRateLimitedUntil: 0,
      dmiAcquisitionStats: { assignedZoneIds: [], attemptedZoneIds: [], cursorAdvancedForZoneIds: [], successfulZoneIds: [] },
      dmiPersistentRuntime: {}, nextDmiForecastStore: next, output, previous: {},
      generatedAt: '2026-09-30T00:00:00.000Z', acquisitionPhase: 'synthetic', edrSuccessStreak: 0,
      recordHasAtmosphere: () => false, recordHasMarine: () => true, historyFor: () => ({}),
      fromDmi: async () => ({ dmiForecast: { hourly: [] }, current: {} }),
      mergeDmiWithFallback: value => value,
      writeDmiForecastStoreCheckpoint: async () => { checkpointCalls++; return writeDmiForecastFileAtomic(file, document); },
      isDmiForecastCheckpointStopUnproved, console: { log() {}, warn() { warnings++; } },
    };
    // Execute the actual existing queue body with the real checkpoint writer.
    // No provider or score is run, and this is not a full updater success test.
    const run = new AsyncFunction(...Object.keys(scope), `${source.slice(start, end)}; return 'QUEUE_SETTLED';`);
    const operation = run(...Object.values(scope));
    if (uncertain) await assert.rejects(operation, error => {
      assert.equal(isDmiForecastCheckpointStopUnproved(error), true);
      if (fault === 'scan-read-and-close-noop' || fault === 'parser-read-and-close-noop') assert.equal(error, sentinel);
      return true;
    });
    else assert.equal(await operation, 'QUEUE_SETTLED');
    assert.equal(checkpointCalls, 1); assert.equal(warnings, uncertain ? 0 : 1);
    assert.equal(output.zones['SYNTHETIC-ZONE'].attempts.length, uncertain ? 0 : 1);
    if (!uncertain) assert.equal(output.zones['SYNTHETIC-ZONE'].attempts[0].message,
      fault === 'changed-valid-bytes' ? 'DMI_FORECAST_FILE_WRITE_CONTENT_CHANGED' : sentinel.message);
    if (fault === 'copy-instead-of-rename' || fault === 'rename-then-error') {
      assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), document);
    } else assert.deepEqual(await fs.readFile(file), original);
  });
});

test('actual normal checkpoint chain retains its first failure and permits only proved safe fresh reuse', async t => {
  const source = await sourceText(producerPath);
  const header = 'let dmiStoreWriteChain = Promise.resolve();';
  const start = source.indexOf(header);
  const end = source.indexOf('\nconst output = {', start);
  assert.equal(source.split(header).length, 2);
  assert.ok(start > 0 && end > start);
  // Use the exact normal closure, including its rejected Promise chain. A
  // direct writer retry is not evidence that this old caller can recover.
  const createCheckpoint = new Function('writeDmiForecastFileAtomic',
    'DMI_FORECAST_STORE_PATH', 'nextDmiForecastStore',
    `${source.slice(start, end)}\nreturn writeDmiForecastStoreCheckpoint;`);
  t.mock.method(globalThis, 'fetch', async () => { assert.fail('NETWORK_FORBIDDEN'); });
  for (const fault of ['proved-closed-sync-failure', 'unproved-sync-and-close']) await t.test(fault, async st => {
    const uncertain = fault === 'unproved-sync-and-close';
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'rr-weather-checkpoint-chain-'));
    let closeRetained;
    st.after(async () => {
      if (closeRetained) await closeRetained();
      assert.equal(path.dirname(folder), path.resolve(os.tmpdir()));
      assert.ok(path.basename(folder).startsWith('rr-weather-checkpoint-chain-'));
      await fs.rm(folder, { recursive: true, force: true });
    });
    const file = path.join(folder, 'forecast.json');
    const document = { schemaVersion: 2, zones: {}, runtime: { nextZoneCursor: 0 } };
    const original = Buffer.from(JSON.stringify(document));
    await fs.writeFile(file, original);
    document.runtime.nextZoneCursor = 1;
    const first = new Error('SYNTHETIC_CHECKPOINT_CHAIN_FIRST_FAILURE');
    const open = fs.open.bind(fs);
    let firstHandle, firstStage, stageOpens = 0, writerCalls = 0;
    st.mock.method(fs, 'open', async (target, ...args) => {
      const handle = await open(target, ...args);
      if (!String(target).startsWith(file + '.forecast-stage-')) return handle;
      stageOpens++;
      if (args[0] === 'wx' && !firstHandle) {
        firstHandle = handle; firstStage = target;
        st.mock.method(handle, 'sync', async () => { throw first; });
        if (uncertain) {
          closeRetained = handle.close.bind(handle);
          st.mock.method(handle, 'close', async () => {});
        }
      }
      return handle;
    });
    const countedWriter = (...args) => { writerCalls++; return writeDmiForecastFileAtomic(...args); };
    const checkpoint = createCheckpoint(countedWriter, file, document);
    await assert.rejects(checkpoint(), error => error === first);
    const opensAfterFirst = stageOpens;
    await assert.rejects(checkpoint(), error => error === first);
    assert.equal(writerCalls, 1, 'the rejected normal chain must not start its writer again');
    assert.equal(stageOpens, opensAfterFirst);
    assert.equal(opensAfterFirst, 1);
    assert.deepEqual(await fs.readFile(file), original);
    assert.equal(isDmiForecastCheckpointStopUnproved(first), uncertain);
    assert.equal(isDmiForecastCheckpointStopUnproved(new Error(first.message)), false);
    assert.equal(isDmiForecastCheckpointStopUnproved(first.message), false);
    assert.equal(isDmiForecastCheckpointStopUnproved({ message: first.message, code: 'DMI_FORECAST_FILE_WRITER_STOP_UNPROVED' }), false);

    const freshCheckpoint = createCheckpoint(countedWriter, file, document);
    if (uncertain) {
      assert.ok((await firstHandle.stat()).isFile());
      assert.ok((await fs.stat(firstStage)).isFile());
      await assert.rejects(writeDmiForecastFileAtomic(file, document), error => error === first);
      await assert.rejects(freshCheckpoint(), error => error === first);
      assert.equal(writerCalls, 2, 'fresh caller reaches the real writer refusal, not a replacement');
      assert.equal(stageOpens, opensAfterFirst, 'private refusal remains locked without a new file handle');
      assert.deepEqual(await fs.readFile(file), original);
      assert.ok((await firstHandle.stat()).isFile());
      assert.ok((await fs.stat(firstStage)).isFile());
    } else {
      await assert.rejects(firstHandle.stat(), { code: 'EBADF' });
      await assert.rejects(fs.stat(firstStage), { code: 'ENOENT' });
      await writeDmiForecastFileAtomic(file, document);
      assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), document);
      document.runtime.nextZoneCursor = 2;
      await freshCheckpoint();
      assert.equal(writerCalls, 2);
      assert.equal(stageOpens, opensAfterFirst + 4, 'both safe retries own one write and one shared scan/parser handle');
      assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), document);
      assert.deepEqual(await fs.readdir(folder), ['forecast.json']);
    }
  });
});

test('epoch scalar inverse rejects changed numeric/source routing before all immutable old oracles', async () => {
  const actual = await sourceText(producerPath);
  for (const [before, after] of [
    ['withoutCurrent(scalar).hourly', 'scalar.hourly'],
    ['if (componentInputs.weatherStateEpochScalarPartRecords)', 'if (true)'],
    ['delete hour.currentStateOnlyHold;', 'hour.currentStateOnlyHold = null;'],
    ['startAt: partForecastStartAt,\n            expectedIdentity: partDmiIdentity', 'startAt: partForecastStartAt,\n            expectedIdentity: null'],
  ]) {
    assert(actual.includes(before), 'Mutation must change the actual reviewed scalar route');
    assert.throws(() => inverseWeatherStateEpochIntegration(actual.replace(before, after)), /exact reviewed epoch scalar hunk/);
  }
});
// New caller admission is separate; no historical whole-source assertion is retagged.
test('390663 replay diagnostic has an exact whole updater inverse and refuses all missing diagnostic hunks', async () => {
  const actual = inverseSavedCurrentForwardGate(await sourceText(producerPath));
  assert.equal(digest(actual), 'a748c0fbc5e266ffbe69c21a8ff6953c05b6cee1c5245d798de82e2307002025');
  assert.equal(digest(inverseSavedCurrentReplayUpdater(actual)), '608b795d382d96fed7435ffd9437f589f8771ea742ec65f75053d25059b9d25d');
  for (const hunk of savedCurrentReplayUpdaterHunks) {
    assert.throws(() => inverseSavedCurrentReplayUpdater(actual.replace(hunk.after, () => hunk.before)),
      /each exact replay diagnostic hunk/);
  }
});

test('normal follower input keeps its whole140000 updater pin without repeating the673 chain', async () => {
  const follower = await sourceText(new URL('./test-established-native-current-origin-followers.mjs', import.meta.url));
  const begin = follower.indexOf('function normalOriginUpdaterTestInput(source, oracle) {');
  const end = follower.indexOf('\nconst P0 =', begin);
  assert(begin >= 0 && end > begin);
  const normalInput = new Function('assert', 'sha', follower.slice(begin, end)
    + '\nreturn normalOriginUpdaterTestInput;')(assert, digest);
  const actual = inverseSavedCurrentForwardGate(await sourceText(producerPath));
  const oracle = await sourceText(new URL('./test-weather-update-entrypoint.mjs', import.meta.url));
  assert.equal(digest(actual), 'a748c0fbc5e266ffbe69c21a8ff6953c05b6cee1c5245d798de82e2307002025');
  const old = normalInput(actual, oracle);
  assert.equal(old, inverseSavedCurrentReplayUpdater(actual));
  assert.equal(normalInput(old, oracle), old);
  assert.throws(() => normalInput(actual + '// unreviewed drift\n', oracle), /whole genuine140000/);
  for (const hunk of savedCurrentReplayUpdaterHunks)
    assert.throws(() => normalInput(actual.replace(hunk.after, () => hunk.before), oracle), /each exact replay diagnostic hunk/);
});

test('forward gate diagnostic input has a whole153 inverse before every unchanged historical updater oracle', async () => {
  const actual = await sourceText(producerPath);
  const check = source => {
    assert.equal(digest(source), '4e5b24d8f535c6074a6612b402157b8426b08ef20e507d9817b47d45bb32b034');
    assert.equal(digest(inverseSavedCurrentForwardGate(source)), 'a748c0fbc5e266ffbe69c21a8ff6953c05b6cee1c5245d798de82e2307002025');
    assert.equal(digest(inverseSavedCurrentReplayUpdater(source)), '608b795d382d96fed7435ffd9437f589f8771ea742ec65f75053d25059b9d25d');
  };
  check(actual);
  for (const [before, after] of [
    ['fallbackSource: deployedRecoverySource', 'fallbackSource: null'],
    ['persistedHourly: persistedDmiPartRows.get(part.partId)?.hourly ?? []', 'persistedHourly: []'],
    ['requireNativeGridSampling: true', 'requireNativeGridSampling: false'],
    ['buildRavScoreRecoveryReplay({', 'alternativeReplay({'],
  ]) {
    const changed = savedCurrentForwardGateHunk.after.replace(before, after);
    assert.notEqual(changed, savedCurrentForwardGateHunk.after);
    assert.throws(() => check(actual.replace(savedCurrentForwardGateHunk.after, () => changed)));
    assert.throws(() => inverseSavedCurrentForwardGate(actual.replace(savedCurrentForwardGateHunk.after, () => changed)), /exact forward gate/);
  }
  const follower = await sourceText(new URL('./test-established-native-current-origin-followers.mjs', import.meta.url));
  const begin = follower.indexOf('function normalOriginUpdaterTestInput(source, oracle) {');
  const end = follower.indexOf('\nconst P0 =', begin);
  assert(begin >= 0 && end > begin);
  const normalInput = new Function('assert', 'sha', follower.slice(begin, end)
    + '\nreturn normalOriginUpdaterTestInput;')(assert, digest);
  const oracle = await sourceText(new URL('./test-weather-update-entrypoint.mjs', import.meta.url));
  assert.equal(normalInput(actual, oracle), inverseSavedCurrentReplayUpdater(actual));
  assert.throws(() => normalInput(actual + '// unreviewed drift\n', oracle), /whole genuine140000/);
});

test('default-OFF original-plan caller preserves the whole FFD updater and all existing normal reader inverses', async () => {
  const actual = inverseAlternativeCCaller((await fs.readFile(producerPath, 'utf8')).replace(/\r\n/g, '\n'), 'scripts/update-weather.mjs');
  assert.equal(digest(actual), '06892b9200406b2529430a4227d18a36fc8438b334a1ff0c303f42b4503a0c6d', 'exact actual original-plan caller');
  const before = inverseSavedCurrentForwardOriginalPlan(actual);
  assert.equal(digest(before), '4e5b24d8f535c6074a6612b402157b8426b08ef20e507d9817b47d45bb32b034');
  assert.equal(inverseSavedCurrentForwardOriginalPlan(before), before, 'genuine old source stays unchanged');
  assert.equal(digest(inverseSavedCurrentReplayUpdater(actual)), '608b795d382d96fed7435ffd9437f589f8771ea742ec65f75053d25059b9d25d');
  for (const hunk of savedCurrentForwardOriginalPlanUpdaterHunks) {
    const changed = actual.replace(hunk.after, () => hunk.before);
    assert.notEqual(changed, actual, 'each missing-hunk mutation changes its own current baseline');
    assert.throws(() => inverseSavedCurrentForwardOriginalPlan(changed), /exact default-OFF original-plan|whole FFD updater/);
  }
  assert.throws(() => inverseSavedCurrentForwardOriginalPlan(actual + '// unreviewed drift\n'), /whole FFD updater/);
  const follower = await sourceText(new URL('./test-established-native-current-origin-followers.mjs', import.meta.url));
  const begin = follower.indexOf('function normalOriginUpdaterTestInput(source, oracle) {');
  const end = follower.indexOf('\nconst P0 =', begin);
  assert(begin >= 0 && end > begin);
  const normalInput = new Function('assert', 'sha', follower.slice(begin, end)
    + '\nreturn normalOriginUpdaterTestInput;')(assert, digest);
  const oracle = await sourceText(new URL('./test-weather-update-entrypoint.mjs', import.meta.url));
  assert.equal(normalInput(actual, oracle), inverseSavedCurrentReplayUpdater(actual), 'same actual normal follower reader, not another host');
});

test('native-original producer preserves exact whole archived inputs and rejects every changed delta', async () => {
  assert.deepEqual(CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW.rows.map(row => row.path),
    ['scripts/update-weather.mjs', 'scripts/lib/private-dmi-recovery-record.mjs']);
  for (const row of CURRENT_NATIVE_ORIGINAL_PRODUCER_TEST_REVIEW.rows) {
    const raw = (await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
    const actual = row.path === 'scripts/update-weather.mjs'
      ? inverseCurrentFamilyColdTargetTestInput(raw, row.path) : raw;
    assert.equal(Buffer.byteLength(actual), row.after.bytes, 'Exact native-original predecessor after only the reviewed cold-target inverse');
    assert.equal(digest(actual), row.after.sha256);
    const original = inverseCurrentNativeOriginalProducerTestInput(actual, row.path);
    assert.equal(digest(original), row.before.sha256);
    assert.equal(inverseCurrentNativeOriginalProducerTestInput(original, row.path), original);
    for (const edit of row.edits) {
      assert.equal(actual.slice(edit.offset, edit.offset + edit.after.length), edit.after);
      const changed = edit.after.length
        ? actual.slice(0, edit.offset) + (edit.after[0] === 'X' ? 'Y' : 'X') + actual.slice(edit.offset + 1)
        : actual.slice(0, edit.offset) + edit.before + actual.slice(edit.offset);
      assert.notEqual(changed, actual, 'Each mutation changes its exact real final delta');
      assert.throws(() => inverseCurrentNativeOriginalProducerTestInput(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    }
    assert.throws(() => inverseCurrentNativeOriginalProducerTestInput(actual + '// unreviewed drift\n', row.path),
      /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
    assert.throws(() => inverseCurrentNativeOriginalProducerTestInput(actual, 'scripts/unknown.mjs'),
      /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
  }
  assert.throws(() => inverseCurrentNativeOriginalProducerTestInput({}, 'scripts/update-weather.mjs'),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
});

test('actual native-original companion caller stays unprojected and declared in producer review', async () => {
  const actual = (await fs.readFile(producerPath, 'utf8')).replace(/\r\n/g, '\n');
  const read = "import { readCurrentPrivateRuntimeCompanions } from './read-authenticated-dmi-current-companions.mjs';";
  assert.equal(actual.split(read).length, 2, 'Actual updater imports the controller exactly once');
  assert.match(actual, /coastalPartsContract\.enabled\n  && coldInputs === null && stateEpochView === null\n  \? await readCurrentPrivateRuntimeCompanions\(generatedAt\) : \[\]/);
  assert.match(actual, /    archivedWeatherRestartView,\n    protectedNativeCurrentCompanionContexts,\n  \)/);
  assert.equal(actual.split('error.nativeOriginalProofCode = /^DMI_NATIVE_PROOF_[A-Z_]{1,80}$/.test(proof.code)').length, 2);
  const actualPlanner = (await fs.readFile(new URL('./plan-ravscore-current-history.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  assert.match(actualPlanner, /const \{ verified, conditions, originalConditions, originalConditionsSha256,\n    conditionsPath: file, conditionsSha256, verify \} =/);
  assert.match(actualPlanner, /await readAuthenticatedCurrentCompanions\(verified, originalConditions \?\? conditions\)/);
  const originalBoundaryPlanner = inverseAssistant587OriginalRawBoundaryTestInput(actualPlanner, 'scripts/plan-ravscore-current-history.mjs');
  assert.notEqual(originalBoundaryPlanner, actualPlanner, 'The actual original-B boundary is checked before older whole-source oracles');
  assert.match(originalBoundaryPlanner, /const \{ verified, conditions, originalConditions, conditionsPath: file, conditionsSha256, verify \} =/);
  assert.throws(() => inverseAssistant587OriginalRawBoundaryTestInput(actualPlanner + '\n', 'scripts/plan-ravscore-current-history.mjs'),
    /ALTERNATIVE_C_TEST_INPUT_CHANGED:ORIGINAL_RAW/);
  const planner = inverseAssistant587OriginalCompanionTestInput(originalBoundaryPlanner, 'scripts/plan-ravscore-current-history.mjs');
  assert.equal(planner.split("from './read-authenticated-dmi-current-companions.mjs';").length, 2);
  assert.match(planner, /await readCurrentPrivateRuntimeCompanionInput\(productionReferenceAt\)/);
  assert.match(planner, /await readAuthenticatedCurrentCompanions\(verified, conditions\)/);
  const actualHelper = (await fs.readFile(new URL('./read-authenticated-dmi-current-companions.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  assert.match(actualHelper, /await readAuthenticatedCurrentCompanions\(input\.verified, input\.originalConditions \?\? input\.conditions\);\n  await input\.verify\(\);/);
  const genuine588Helper = inverseActiveFamilyRetentionCompanionTestInput(actualHelper, 'scripts/read-authenticated-dmi-current-companions.mjs');
  const genuine587Helper = inverseAssistant588OriginalCompanionTestInput(genuine588Helper, 'scripts/read-authenticated-dmi-current-companions.mjs');
  const helper = inverseAssistant587OriginalCompanionTestInput(genuine587Helper, 'scripts/read-authenticated-dmi-current-companions.mjs');
  assert.match(helper, /await readAuthenticatedCurrentCompanions\(input\.verified, input\.conditions\);\n  await input\.verify\(\);/);
  assert.doesNotMatch(helper, /\.\/plan-ravscore-current-history|^await\s|^main\(/m);
  const { PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES, PRIVATE_RUNTIME_CONTRACT_FILES } =
    await import('./private-production-runtime-workflow.mjs');
  assert.equal(PRIVATE_RUNTIME_PRODUCER_SOURCE_FILES.filter(file =>
    file === 'scripts/read-authenticated-dmi-current-companions.mjs').length, 1);
  assert.deepEqual(PRIVATE_RUNTIME_CONTRACT_FILES.fullRuntimeContractSha256,
    ['scripts/lib/private-weather-storage-abi.json'], 'Controller review is not a storage-ABI retag');
});

test('assistant587 original companion inverse preserves both whole predecessors and rejects changed caller deltas', async () => {
  for (const row of ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW) {
    const rawActual = (await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
    const actual = row.path === 'scripts/plan-ravscore-current-history.mjs'
      ? inverseAssistant587OriginalRawBoundaryTestInput(rawActual, row.path)
      : inverseAssistant588OriginalCompanionTestInput(inverseActiveFamilyRetentionCompanionTestInput(rawActual, row.path), row.path);
    assert.equal(Buffer.byteLength(actual), row.after.bytes);
    assert.equal(digest(actual), row.after.sha256);
    const before = inverseAssistant587OriginalCompanionTestInput(actual, row.path);
    assert.equal(Buffer.byteLength(before), row.before.bytes);
    assert.equal(digest(before), row.before.sha256);
    assert.equal(inverseAssistant587OriginalCompanionTestInput(before, row.path), before);
    if (row.path === 'scripts/plan-ravscore-current-history.mjs') {
      assert.equal(inverseAlternativeCCaller(actual, row.path), inverseAlternativeCCaller(before, row.path));
    }
    for (const [old, current] of row.hunks) {
      assert.equal(actual.split(current).length, 2);
      for (const changed of [actual.replace(current, () => old),
        actual.replace(current, () => current + current), actual.replace(current, () => current + '/*UNREVIEWED*/')]) {
        assert.notEqual(changed, actual);
        assert.throws(() => inverseAssistant587OriginalCompanionTestInput(changed, row.path),
          /ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587/);
        if (row.path === 'scripts/plan-ravscore-current-history.mjs') {
          assert.throws(() => inverseAlternativeCCaller(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED/);
        }
      }
    }
    for (const changed of ['!' + actual.slice(1), actual + '\n']) {
      assert.throws(() => inverseAssistant587OriginalCompanionTestInput(changed, row.path),
        /ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT587/);
    }
  }
  assert.throws(() => inverseAssistant587OriginalCompanionTestInput({}, 'scripts/plan-ravscore-current-history.mjs'),
    /ASSISTANT587_TYPE/);
  assert.throws(() => inverseAssistant587OriginalCompanionTestInput('', 'scripts/unknown.mjs'), /ASSISTANT587_PATH/);
});

test('assistant588 companion route preserves genuine587 whole bytes and rejects every altered delta', async () => {
  const row = ASSISTANT588_ORIGINAL_COMPANION_TEST_REVIEW;
  const actual = inverseActiveFamilyRetentionCompanionTestInput(
    await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8'), row.path);
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(digest(actual), row.after.sha256);
  const before = inverseAssistant588OriginalCompanionTestInput(actual, row.path);
  assert.equal(Buffer.byteLength(before), row.before.bytes);
  assert.equal(digest(before), row.before.sha256);
  assert.equal(inverseAssistant588OriginalCompanionTestInput(before, row.path), before);
  const genuine587 = ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW.find(item => item.path === row.path);
  assert.deepEqual(row.before, genuine587.after, 'The outer view is the exact original587 caller, not a repin');
  assert.equal(Buffer.byteLength(inverseAssistant587OriginalCompanionTestInput(before, row.path)), genuine587.before.bytes);
  const { ISSUED_ASSISTANT_PUBLIC588_PROFILE } = await import('./lib/assistant-later-h0-successor-source.mjs');
  assert.equal(ISSUED_ASSISTANT_PUBLIC588_PROFILE.before.I,
    '5584d8e59f8d21785fd08b32f9beb22cf879cdb4892a11ede24eb862d9a0dca2');
  assert.equal(actual.split(ISSUED_ASSISTANT_PUBLIC588_PROFILE.before.I).length, 4, 'All three historical588 guards retain exactly their issued genuine587 predecessor');
  assert.match(actual, /import \{readAuthenticatedFrozen587Predecessor,assertAuthenticatedFrozen587Snapshot\}/);
  assert.equal(actual.split('assertAuthenticatedFrozen587Snapshot(await readAuthenticatedFrozen587Predecessor())').length, 3);
  assert.doesNotMatch(actual, /readAuthenticatedFrozen586Predecessor|assertAuthenticatedFrozen586Snapshot|6d8f7cca203b5f7ee5155f3c0cdb39403a02fd0eb30fecaca5070ef9f814a805/);
  for (const [old, current] of row.hunks) {
    assert.equal(actual.split(current).length, 2);
    for (const changed of [actual.replace(current, () => old),
      actual.replace(current, () => current + current), actual.replace(current, () => current + '/*UNREVIEWED*/')]) {
      assert.notEqual(changed, actual);
      assert.throws(() => inverseAssistant588OriginalCompanionTestInput(changed, row.path),
        /ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT588/);
    }
  }
  for (const changed of ['!' + actual.slice(1), actual + '\n'])
    assert.throws(() => inverseAssistant588OriginalCompanionTestInput(changed, row.path), /ASSISTANT588/);
  assert.throws(() => inverseAssistant588OriginalCompanionTestInput({}, row.path), /ASSISTANT588_TYPE/);
  assert.throws(() => inverseAssistant588OriginalCompanionTestInput(actual, 'scripts/unknown.mjs'), /ASSISTANT588_PATH/);
});

test('assistant590 retention companion uses its actual whole source before the historical745 inverse', async () => {
  const row = ASSISTANT590_RETENTION_COMPANION_TEST_REVIEW;
  const actual = inverseAssistant591RetentionCompanionTestInput(
    (await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n'), row.path);
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(digest(actual), row.after.sha256);
  const before = inverseAssistant590RetentionCompanionTestInput(actual, row.path);
  assert.equal(Buffer.byteLength(before), row.before.bytes);
  assert.equal(digest(before), row.before.sha256);
  assert.deepEqual(row.before, ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW.after,
    'The new outer inverse restores the complete unchanged745 reader');
  assert.equal(inverseAssistant590RetentionCompanionTestInput(before, row.path), before);
  const historical = inverseActiveFamilyRetentionCompanionTestInput(before, row.path);
  assert.equal(Buffer.byteLength(historical), ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW.before.bytes);
  assert.equal(digest(historical), ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW.before.sha256);
  for (const [old, current] of row.hunks) {
    assert.equal(actual.split(current).length, 2);
    for (const changed of [actual.replace(current, () => old),
      actual.replace(current, () => current + current),
      actual.replace(current, () => current + '/*UNREVIEWED*/')]) {
      assert.notEqual(changed, actual);
      assert.throws(() => inverseAssistant590RetentionCompanionTestInput(changed, row.path),
        /ALTERNATIVE_C_TEST_INPUT_CHANGED:ASSISTANT590_RETENTION/);
    }
  }
  for (const changed of ['!' + actual.slice(1), actual + '\n'])
    assert.throws(() => inverseAssistant590RetentionCompanionTestInput(changed, row.path), /ASSISTANT590_RETENTION/);
  assert.throws(() => inverseAssistant590RetentionCompanionTestInput({}, row.path), /ASSISTANT590_RETENTION_TYPE/);
  assert.throws(() => inverseAssistant590RetentionCompanionTestInput(actual, 'scripts/unknown.mjs'), /ASSISTANT590_RETENTION_PATH/);
  assert.throws(() => inverseAssistant590RetentionCompanionTestInput(actual, row.path, true), /ASSISTANT590_RETENTION_ARGUMENTS/);
});

test('active-family retention companion has an exact outer inverse before unchanged historical oracles', async () => {
  const row = ACTIVE_FAMILY_RETENTION_COMPANION_TEST_REVIEW;
  const actual = inverseAssistant590RetentionCompanionTestInput(
    (await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n'), row.path);
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(digest(actual), row.after.sha256);
  const before = inverseActiveFamilyRetentionCompanionTestInput(actual, row.path);
  assert.equal(Buffer.byteLength(before), row.before.bytes);
  assert.equal(digest(before), row.before.sha256);
  assert.deepEqual(row.before, ASSISTANT588_ORIGINAL_COMPANION_TEST_REVIEW.after,
    'The complete genuine588 source is restored without changing its historical oracle');
  assert.equal(inverseActiveFamilyRetentionCompanionTestInput(before, row.path), before);
  const genuine587 = inverseAssistant588OriginalCompanionTestInput(before, row.path);
  const original587Review = ASSISTANT587_ORIGINAL_COMPANION_TEST_REVIEW.find(item => item.path === row.path);
  assert.equal(digest(genuine587), original587Review.after.sha256);
  const genuine586 = inverseAssistant587OriginalCompanionTestInput(genuine587, row.path);
  assert.equal(Buffer.byteLength(genuine586), original587Review.before.bytes);
  assert.equal(digest(genuine586), original587Review.before.sha256);
  for (const [old, current] of row.hunks) {
    assert.equal(actual.split(current).length, 2);
    for (const changed of [actual.replace(current, () => old),
      actual.replace(current, () => current + current),
      actual.replace(current, () => current + '/*UNREVIEWED*/')]) {
      assert.notEqual(changed, actual);
      assert.throws(() => inverseActiveFamilyRetentionCompanionTestInput(changed, row.path),
        /ALTERNATIVE_C_TEST_INPUT_CHANGED:(?:ACTIVE_RETENTION|ASSISTANT590_RETENTION)/);
    }
  }
  for (const changed of ['!' + actual.slice(1), actual + '\n', '!' + before.slice(1), before + '\n'])
    assert.throws(() => inverseActiveFamilyRetentionCompanionTestInput(changed, row.path), /ALTERNATIVE_C_TEST_INPUT_CHANGED:(?:ACTIVE_RETENTION|ASSISTANT590_RETENTION)/);
  assert.throws(() => inverseActiveFamilyRetentionCompanionTestInput({}, row.path), /ACTIVE_RETENTION_TYPE/);
  assert.throws(() => inverseActiveFamilyRetentionCompanionTestInput(actual, 'scripts/unknown.mjs'), /ACTIVE_RETENTION_PATH/);
});


test('assistant591 retention companion uses actual592 whole source before unchanged591 and older inverses', async () => {
  const row = ASSISTANT591_RETENTION_COMPANION_TEST_REVIEW;
  const actual = (await fs.readFile(new URL('../' + row.path, import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(digest(actual), row.after.sha256);
  assert.match(actual, /sourcePhase==='assistant-public591-successor'\?Object.freeze/);
  assert.match(actual, /read:readAuthenticatedFrozen591Predecessor,snapshot:assertAuthenticatedFrozen591Snapshot/);
  const before = inverseAssistant591RetentionCompanionTestInput(actual, row.path);
  assert.equal(Buffer.byteLength(before), row.before.bytes);
  assert.equal(digest(before), row.before.sha256);
  assert.deepEqual(row.before, ASSISTANT590_RETENTION_COMPANION_TEST_REVIEW.after);
  assert.equal(inverseAssistant591RetentionCompanionTestInput(before, row.path), before);
  assert.equal(inverseAssistant590RetentionCompanionTestInput(actual, row.path),
    inverseAssistant590RetentionCompanionTestInput(before, row.path));
  assert.equal(inverseActiveFamilyRetentionCompanionTestInput(actual, row.path),
    inverseActiveFamilyRetentionCompanionTestInput(before, row.path));
  for (const [old, current] of row.hunks) {
    assert.equal(actual.split(current).length, 2);
    for (const changed of [actual.replace(current, () => old),
      actual.replace(current, () => current + current),
      actual.replace(current, () => current + '/*UNREVIEWED*/')])
      assert.throws(() => inverseAssistant591RetentionCompanionTestInput(changed, row.path), /ASSISTANT591_RETENTION/);
  }
  for (const changed of ['!' + actual.slice(1), actual + '\n'])
    assert.throws(() => inverseAssistant591RetentionCompanionTestInput(changed, row.path), /ASSISTANT591_RETENTION/);
  assert.throws(() => inverseAssistant591RetentionCompanionTestInput({}, row.path), /ASSISTANT591_RETENTION_TYPE/);
  assert.throws(() => inverseAssistant591RetentionCompanionTestInput(actual, 'scripts/unknown.mjs'), /ASSISTANT591_RETENTION_PATH/);
  assert.throws(() => inverseAssistant591RetentionCompanionTestInput(actual, row.path, true), /ASSISTANT591_RETENTION_ARGUMENTS/);
});

test('wind-tail default inverse preserves every old updater oracle and refuses other budget or source bytes', async () => {
  const actual = (await fs.readFile(producerPath, 'utf8')).replaceAll('\r\n', '\n');
  const row = WIND_TAIL_CAPACITY_UPDATER_TEST_REVIEW;
  assert.equal(Buffer.byteLength(actual), row.after.bytes);
  assert.equal(digest(actual), row.after.sha256);
  const before = inverseWindTailCapacityUpdaterTestInput(actual, row.path);
  assert.equal(Buffer.byteLength(before), row.before.bytes);
  assert.equal(digest(before), row.before.sha256);
  assert.equal(before, actual.replace(row.afterLine, row.beforeLine));
  assert.equal(inverseWindTailCapacityUpdaterTestInput(before, row.path), before);
  assert.equal(inverseAlternativeCCaller(actual, row.path), inverseAlternativeCCaller(before, row.path));
  assert.equal(inverseCurrentNativeOriginalProducerTestInput(actual, row.path), inverseCurrentNativeOriginalProducerTestInput(before, row.path));
  const expression = actual.match(/const COMPONENT_OPEN_METEO_BUDGET_MS = ([\s\S]*?);/)?.[1];
  assert.ok(expression);
  const evaluate = new Function('WEATHER_CACHE_ONLY', 'process', 'return ' + expression);
  assert.equal(evaluate(false, { env: {} }), 600000);
  assert.equal(evaluate(true, { env: {} }), 0);
  for (const explicit of ['0', '60000', '600000']) {
    assert.equal(evaluate(false, { env: { RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: explicit } }), Number(explicit));
    assert.equal(evaluate(true, { env: { RAVRADAR_COMPONENT_OPEN_METEO_BUDGET_MS: explicit } }), 0);
  }
  const mutations = [
    actual.replace(row.afterLine, row.afterLine.replace('600_000', '600_001')),
    actual.replace(row.afterLine, row.afterLine.replace('600_000', '60_000')),
    actual.replace(row.afterLine, row.afterLine.replace('600_000', '900_000')),
    actual.replace(row.afterLine, row.afterLine + '\n' + row.afterLine),
    actual.replace(row.afterLine, ''),
    actual.replace('const WEATHER_CACHE_ONLY =', 'const UNREVIEWED_WEATHER_CACHE_ONLY ='),
    actual + '\n// UNREVIEWED_TAIL_DEFAULT\n',
  ];
  for (const changed of mutations) {
    assert.notEqual(changed, actual);
    assert.equal(inverseWindTailCapacityUpdaterTestInput(changed, row.path), changed);
    assert.throws(() => inverseAlternativeCCaller(changed, row.path));
    assert.throws(() => inverseCurrentNativeOriginalProducerTestInput(changed, row.path));
  }
  for (const wrongPath of ['', 'scripts/unknown.mjs', 'toString']) assert.equal(inverseWindTailCapacityUpdaterTestInput(actual, wrongPath), actual);
  assert.throws(() => inverseWindTailCapacityUpdaterTestInput(actual), /UPDATER_ARGUMENTS/);
  assert.throws(() => inverseWindTailCapacityUpdaterTestInput(actual, row.path, true), /UPDATER_ARGUMENTS/);
  assert.throws(() => inverseWindTailCapacityUpdaterTestInput(null, row.path), /UPDATER_TYPE/);
});
