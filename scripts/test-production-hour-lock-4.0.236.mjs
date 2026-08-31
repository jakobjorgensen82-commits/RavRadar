import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';
import { OPEN_METEO_FUTURE_HOURS, openMeteoPastHours, trimOpenMeteoForecast } from './lib/open-meteo-forecast-window.mjs';
import { readProductionWorkflowSources } from './lib/production-workflow-sources.mjs';

const approvedHour = '2026-08-19T11:00:00Z';
assert.equal(
  resolveProductionReferenceTime(approvedHour, new Date('2026-08-19T12:04:00Z')),
  '2026-08-19T11:00:00.000Z',
  'A run crossing the UTC hour boundary must keep the hour approved by preflight.'
);
assert.equal(
  resolveProductionReferenceTime('', new Date('2026-08-19T12:04:00Z')),
  '2026-08-19T12:04:00.000Z',
  'Local execution without a workflow-approved hour must keep its real build time.'
);
assert.throws(
  () => resolveProductionReferenceTime('2026-08-19T11:37:00Z'),
  /exact UTC hour/,
  'Only an exact preflight hour may freeze production time.'
);

assert.equal(openMeteoPastHours(approvedHour, new Date('2026-08-19T12:04:00Z')), 3, 'Fallback skal hente den laaste time efter et timeskifte.');
const fallbackRows = Array.from({ length: 123 }, (_, index) => ({ time: new Date(Date.parse('2026-08-19T10:00:00Z') + index * 3600000).toISOString(), value: index }));
const trimmedFallback = trimOpenMeteoForecast(fallbackRows, approvedHour);
assert.equal(trimmedFallback.length, OPEN_METEO_FUTURE_HOURS, 'Fallback skal bevare 120 timer efter bagudvinduet.');
assert.equal(trimmedFallback[0].time, '2026-08-19T11:00:00.000Z', 'Fallback skal begynde paa den laaste produktionstime.');

const [workflows, updater, liveBuilder] = await Promise.all([
  readProductionWorkflowSources(),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('scripts/build-live-current-pilot.py', 'utf8'),
]);
const { orchestrator, build } = workflows;

for (const marker of [
  'target_hour: ${{ steps.cache-state.outputs.target_hour }}',
]) {
  assert.ok(orchestrator.includes(marker), `Orkestratoren mangler timeslåsen: ${marker}`);
}
for (const marker of [
  'RAVRADAR_PRODUCTION_TARGET_HOUR: ${{ inputs.production_target_hour }}',
  'Bind production to resolved DMI current hour',
  'RAVRADAR_PRODUCTION_TARGET_HOUR=${{ steps.copernicus-targets.outputs.target_hour }}',
]) {
  assert.ok(build.includes(marker), `Build-workflowet mangler timeslåsen: ${marker}`);
}
const productionTargetCondition = "if: github.event_name != 'workflow_dispatch' || (inputs.geometry_v2_pilot != true && inputs.geometry_v2_national != true)";
assert.equal(
  orchestrator.split(productionTargetCondition).length - 1,
  2,
  'Både cachegendannelse og timeinspektion skal beregne target_hour for push, schedule og alle produktioner, men ikke de private geometri-dispatches.'
);
assert.match(
  orchestrator,
  /CHECK_CURRENT_HOUR: \$\{\{ github\.event_name == 'schedule' \|\| \(github\.event_name == 'workflow_dispatch' && inputs\.force != true/,
  'Timed schedule og almindelig ikke-forceret dispatch skal fortsat identificeres før den efterfølgende DMI-timeresolution.'
);
assert.ok(
  build.indexOf('Update DMI bulk model cache') < build.indexOf('Bind production to resolved DMI current hour') &&
    build.indexOf('Bind production to resolved DMI current hour') < build.indexOf('Build public seven-day current history and controlled live selection'),
  'Den endelige produktionstime skal bindes efter frisk DMI og før livefletning.'
);
assert.match(updater, /resolveProductionReferenceTime\(process\.env\.RAVRADAR_PRODUCTION_TARGET_HOUR, new Date\(buildGeneratedAt\)\)/);
assert.match(updater, /generatedAt: buildGeneratedAt, productionReferenceAt: generatedAt/);
assert.match(updater, /output\.datasetId = `rr-\$\{buildGeneratedAt/);
assert.match(updater, /buildWeatherHealth\(previousHealth, output, buildGeneratedAt\)/);
assert.match(updater, /forecastFromOpenMeteo\(feature, generatedAt\)/);
assert.match(updater, /past_hours: String\(fallbackPastHours\)/);
assert.match(liveBuilder, /default=os\.getenv\("RAVRADAR_PRODUCTION_TARGET_HOUR"\)/);

console.log('OK: produktionen låser først triggerens time og binder derefter sikkert til nærmeste verificerede DMI-strømtime.');
