import assert from 'node:assert/strict';
import { ACTIVE_HISTORY_HOURS, RESEARCH_HISTORY_HOURS, retainWeatherHistory } from './lib/weather-history-retention.mjs';
import { buildPublicConditions } from './public-conditions-lib.mjs';

const base = Date.parse('2026-08-15T12:00:00.000Z');
const at = hoursAgo => new Date(base - hoursAgo * 3600000).toISOString();
const previous = {
  samples24h: [{ at: at(80), windSpeedMps: 20 }, { at: at(23), windSpeedMps: 5 }],
  samples72h: [
    { at: at(80), windSpeedMps: 20 },
    { at: at(60), windSpeedMps: 18, waveHeightM: 2.1 },
    { at: at(23), windSpeedMps: 5 },
    { at: at(1), windSpeedMps: 4 }
  ]
};
const current = { at: at(0), windSpeedMps: 3, waveHeightM: .3 };
const retained = retainWeatherHistory(previous, current, at(0));
assert.equal(ACTIVE_HISTORY_HOURS, 24);
assert.equal(RESEARCH_HISTORY_HOURS, 72);
assert.deepEqual(retained.samples72h.map(row => row.at), [at(60), at(23), at(1), at(0)]);
assert.deepEqual(retained.samples24h.map(row => row.at), [at(23), at(1), at(0)]);
assert.equal(Math.max(...retained.samples24h.map(row => row.windSpeedMps)), 5, '72-timersstormen må ikke ændre den aktive 24-timersscore');
assert.equal(Math.max(...retained.samples72h.map(row => row.windSpeedMps)), 18, 'tre-døgnsvinduet skal bevare ældre mobiliseringsevidens');

const publicDoc = buildPublicConditions({
  datasetId: 'history-retention-test', generatedAt: at(0),
  zones: { Z: { current: {}, history: {}, samples24h: retained.samples24h, samples72h: retained.samples72h, forecast: { hourly: [] } } }
});
assert(!('samples24h' in publicDoc.zones.Z));
assert(!('samples72h' in publicDoc.zones.Z));
console.log('OK: 72-timers pipelinehistorik bevares separat, aktiv score bruger fortsat kun 24 timer, og rå historik udelades fra public projection.');
