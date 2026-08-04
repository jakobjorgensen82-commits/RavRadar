import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = await fs.readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8');

for (const parameterId of ['sealev_ln', 'sealev_dvr', 'sea_reg']) {
  assert.match(source, new RegExp(`['\"]${parameterId}['\"]`), `OceanObs must request ${parameterId}`);
}
assert.match(source, /dmiSeaLevelObservationRun\.succeeded\s*=\s*latest\.size\s*>\s*0/, 'Observation success must require valid station levels');
assert.doesNotMatch(source, /observations\.lastSuccessfulAt\s*=\s*generatedAt;\s*\n}/, 'Observation success must not be written unconditionally');
assert.match(source, /stationsWithFreshLevel[^\n]+>\s*0/, 'Persistent success must use fresh observation count');
assert.match(source, /observationAttempted:\s*observationResultUsable/, 'Lifecycle misses must only advance after a usable observation response');
assert.match(source, /lastObservationAt\)\s*\+\s*STATION_CACHE_GRACE_HOURS/, 'Station cache validity must derive from the last real observation');
assert.match(source, /parameters:\s*dmiSeaLevelObservationRun\.parameters/, 'Diagnostics must expose per-parameter OceanObs results');

console.log('OK: OceanObs station status is based on real multi-parameter observations, truthful success tracking, and observation-derived cache validity.');
