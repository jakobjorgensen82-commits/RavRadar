#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const [workflow, updateWeather, privateWorkflow] = await Promise.all([
  fs.readFile('.github/workflows/reusable-weather-build.yml', 'utf8'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('scripts/private-production-runtime-workflow.mjs', 'utf8'),
]);

const describeAt = workflow.indexOf(
  'Describe the exact protected predecessor generation',
);
const prepareRestoreAt = workflow.indexOf(
  'Prepare exact old-reader restore for the measured wave transition',
);
const materializeReaderAt = workflow.indexOf(
  'Materialize the exact audited predecessor reader before old-reader secret use',
);
const protectedRestoreAt = workflow.indexOf(
  'Restore newest compatible private runtime from protected storage',
);
const installAt = workflow.indexOf(
  'Install only the allowlisted restored private runtime files',
);
const classifyAt = workflow.indexOf(
  'Classify the measured one-time historical wave-input transition',
);
const dmiAt = workflow.indexOf('Update DMI bulk model cache');
const weatherAt = workflow.indexOf('Update central weather cache');
assert.ok(describeAt > 0 && describeAt < prepareRestoreAt);
assert.ok(prepareRestoreAt < materializeReaderAt
  && materializeReaderAt < protectedRestoreAt
  && protectedRestoreAt < installAt);
assert.ok(classifyAt > installAt && classifyAt < dmiAt);
assert.ok(dmiAt < weatherAt);

const dmiSection = workflow.slice(dmiAt, workflow.indexOf(
  'Advance private point-candidate readiness',
  dmiAt,
));
for (const required of [
  'steps.historical-wave-transition.outputs.required',
  'DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_MODE',
  'DMI_BULK_PRIVATE_WAVE_BOOTSTRAP_TARGET_HOUR',
  "DMI_BULK_MAX_RUNTIME_SECONDS: ${{ (inputs.extended_provider_bootstrap == true || steps.historical-wave-transition.outputs.required == 'true') && '3600'",
  'DMI_BULK_FORCE_REFRESH:',
]) assert.ok(dmiSection.includes(required), `DMI transition wire-up lacks ${required}`);

const wamInspectAt = workflow.indexOf(
  'Inspect operational WAM handoff before state initialization',
);
const wamRequireAt = workflow.indexOf(
  'Require complete operational WAM after provider progress for state initialization',
);
assert.ok(wamInspectAt > dmiAt && wamRequireAt > wamInspectAt);
assert.ok(workflow.slice(wamInspectAt, wamRequireAt)
  .includes("steps.historical-wave-transition.outputs.required == 'true'"));
assert.ok(workflow.slice(wamRequireAt, weatherAt)
  .includes("steps.historical-wave-transition.outputs.required == 'true'"));
assert.ok(workflow.slice(weatherAt, workflow.indexOf(
  'Encrypt newly saved component progress',
  weatherAt,
)).includes('RAVSCORE_HISTORICAL_WAVE_TRANSITION_PATH:'));

for (const required of [
  'loadHistoricalWaveInputTransition',
  'historicalWaveMeasuredColdPipelineInitialization',
  'forceHistoricalWaveMeasuredColdReplay',
  'previousPrivateCandidateGRuntime = historicalWaveInputTransition',
  'historicalWaveInputTransition,\n  )',
]) assert.ok(updateWeather.includes(required), `Weather caller lacks ${required}`);
assert.ok(updateWeather.indexOf('await loadHistoricalWaveInputTransition({')
  < updateWeather.lastIndexOf('selectPreviousPrivateCandidateGRuntime(previous)'));

for (const required of [
  "'scripts/lib/historical-wave-input-transition.mjs'",
  "'scripts/classify-historical-wave-input-transition.mjs'",
  "'scripts/prepare-historical-wave-predecessor-restore.mjs'",
]) assert.ok(privateWorkflow.includes(required), `Private runtime closure lacks ${required}`);

console.log('Historical wave input transition wire-up: 8 focused contracts passed.');
