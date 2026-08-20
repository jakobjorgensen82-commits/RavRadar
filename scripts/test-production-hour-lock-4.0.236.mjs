import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';
import { OPEN_METEO_FUTURE_HOURS, openMeteoPastHours, trimOpenMeteoForecast } from './lib/open-meteo-forecast-window.mjs';

const approvedHour = '2026-08-19T11:00:00Z';
assert.equal(
  resolveProductionReferenceTime(approvedHour, new Date('2026-08-19T12:04:00Z')),
  '2026-08-19T11:00:00.000Z',
  'A run crossing the UTC hour boundary must keep the hour approved by preflight.'
);
assert.equal(
  resolveProductionReferenceTime('', new Date('2026-08-19T12:04:00Z')),
  '2026-08-19T12:04:00.000Z',
  'Push and forced runs without a timed approval must keep their real build time.'
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

const [workflow, updater, liveBuilder] = await Promise.all([
  fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8'),
  fs.readFile('scripts/update-weather.mjs', 'utf8'),
  fs.readFile('scripts/build-live-current-pilot.py', 'utf8'),
]);

for (const marker of [
  'target_hour: ${{ steps.cache-state.outputs.target_hour }}',
  'RAVRADAR_PRODUCTION_TARGET_HOUR: ${{ needs.current-hour-readiness.outputs.target_hour }}',
]) {
  assert.ok(workflow.includes(marker), `Workflowet mangler timeslåsen: ${marker}`);
}
assert.match(updater, /resolveProductionReferenceTime\(process\.env\.RAVRADAR_PRODUCTION_TARGET_HOUR, new Date\(buildGeneratedAt\)\)/);
assert.match(updater, /generatedAt: buildGeneratedAt, productionReferenceAt: generatedAt/);
assert.match(updater, /output\.datasetId = `rr-\$\{buildGeneratedAt/);
assert.match(updater, /buildWeatherHealth\(previousHealth, output, buildGeneratedAt\)/);
assert.match(updater, /forecastFromOpenMeteo\(feature, generatedAt\)/);
assert.match(updater, /past_hours: String\(fallbackPastHours\)/);
assert.match(liveBuilder, /default=os\.getenv\("RAVRADAR_PRODUCTION_TARGET_HOUR"\)/);

console.log('OK: en planlagt produktion forbliver bundet til den preflight-godkendte UTC-time.');
