import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { resolveProductionReferenceTime } from './lib/production-reference-time.mjs';

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
assert.match(liveBuilder, /default=os\.getenv\("RAVRADAR_PRODUCTION_TARGET_HOUR"\)/);

console.log('OK: en planlagt produktion forbliver bundet til den preflight-godkendte UTC-time.');
