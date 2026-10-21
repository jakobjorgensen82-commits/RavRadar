// Small structural regression only; the existing normal stage test separately
// builds and audits the real complete 210/673/118 public projection.
import assert from 'node:assert/strict';
import {assertCandidateGRollbackNationalForecast} from './audit-candidate-g-rollback-public-runtime.mjs';
import {ravScoreModelBinding} from './rollback-assets/ravscore-model-contract.js';
const dates = ['2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'];
const expected = {schemaVersion:2, modelBinding:ravScoreModelBinding(), dates,
  modes:Object.fromEntries(['waders','beach'].map(mode => [mode, dates.map(date => ({date,
    rows:Array.from({length:20}, (_,index) => ({zoneId:'zone-'+index, score:80-index}))}))]))};
assertCandidateGRollbackNationalForecast(structuredClone(expected), expected);
for (const mutate of [
  value => { value.modes.waders[0].rows = value.modes.waders[0].rows.slice(0,5); },
  value => { value.modes.beach[4].rows.pop(); },
  value => { value.modes.waders[1].rows[0].score++; },
  value => { value.modes.beach[2].rows[1].zoneId = value.modes.beach[2].rows[0].zoneId; },
  value => { value.modes.waders[3].date = dates[0]; },
  value => { value.modes.beach.pop(); },
  value => { value.dates.pop(); },
  value => { value.modelBinding.modelBundleSha256 = '0'.repeat(64); },
]) {
  const changed = structuredClone(expected); mutate(changed);
  assert.throws(() => assertCandidateGRollbackNationalForecast(changed, expected));
}
// Honest canonical partial future days must not be filled with invented rows.
const partial = structuredClone(expected); partial.modes.beach[4].rows = [];
assertCandidateGRollbackNationalForecast(structuredClone(partial), partial);
console.log('Candidate G canonical five-day Top20 and whole-ranking mutation refusals: passed.');
