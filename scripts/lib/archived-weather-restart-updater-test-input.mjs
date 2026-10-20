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
export function inverseWeatherExportMemoryUpdater(input) {
  assert.equal(typeof input,'string');
  let source=input.replaceAll('\r\n','\n');
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
