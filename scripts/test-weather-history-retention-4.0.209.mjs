import assert from 'node:assert/strict';
import { ACTIVE_HISTORY_HOURS, RESEARCH_HISTORY_HOURS, attachVerifiedCurrentToSample, retainWeatherHistory } from './lib/weather-history-retention.mjs';
import { buildPublicConditions } from './public-conditions-lib.mjs';

const base = Date.parse('2026-08-15T12:00:00.000Z');
const at = hoursAgo => new Date(base - hoursAgo * 3600000).toISOString();
const previous = {
  samples24h: [{ at: at(80), windSpeedMps: 20 }, { at: at(23), windSpeedMps: 5 }],
  samples72h: [
    { at: at(80), windSpeedMps: 20 },
    { at: at(60), windSpeedMps: 18, waveHeightM: 2.1 },
    { at: at(23), windSpeedMps: 5 },
    { at: at(1), windSpeedMps: 4, currentVerified: false }
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
const sameHour = retainWeatherHistory({ samples72h: [{
  at: at(0), windSpeedMps: 5, windDirectionDeg: 180,
  waveHeightM: 0.7, waveDirectionDeg: 120, wavePeriodS: 5,
  currentSpeedMps: 0.2, currentDirectionDeg: 90, currentAlignment: 0.8, currentVerified: true,
  waterLevelCm: 12, waterLevelTrendCm3h: 3, waterLevelSource: 'dmi', waterTemperatureC: 14,
}] }, {
  at: at(0).replace('.000Z', 'Z'), windSpeedMps: 7, windDirectionDeg: null,
  waveHeightM: null, waveDirectionDeg: null, wavePeriodS: null,
  currentSpeedMps: null, currentDirectionDeg: null, currentAlignment: null, currentVerified: false,
  waterLevelCm: null, waterLevelTrendCm3h: null, waterLevelSource: null, waterTemperatureC: null,
}, at(0)).samples72h[0];
assert.equal(sameHour.windSpeedMps, 7, 'nyere gyldig vind skal vinde');
assert.equal(sameHour.windDirectionDeg, null, 'en ny vindhastighed må ikke få gammel retning påklistret');
assert.equal(sameHour.waveHeightM, 0.7, 'et nyt bølgehul må ikke slette gyldige gamle bølger');
assert.equal(sameHour.waveDirectionDeg, 120, 'bølgens retning skal følge samme gamle bølgekilde');
assert.equal(sameHour.currentSpeedMps, 0.2, 'uverificeret tom strøm må ikke slette verificeret historik');
assert.equal(sameHour.currentVerified, true);
assert.equal(sameHour.waterLevelCm, 12, 'vandstand og trend skal bevares samlet');
assert.equal(sameHour.waterLevelTrendCm3h, 3);
assert.equal(sameHour.waterTemperatureC, 14, 'nyt temperaturhul må ikke slette gyldig gammel temperatur');
const newerTemperature = retainWeatherHistory({ samples72h: [sameHour] }, {
  at: at(0), waterTemperatureC: 15,
}, at(0)).samples72h[0];
assert.equal(newerTemperature.waterTemperatureC, 15, 'nyere gyldig temperatur skal erstatte gammel temperatur');
assert.equal(newerTemperature.waveHeightM, 0.7, 'temperaturopdatering må ikke fjerne bølger');
const newerMarine = retainWeatherHistory({ samples72h: [sameHour] }, {
  at: at(0), waveHeightM: 1.1, waveDirectionDeg: null, wavePeriodS: null,
  currentSpeedMps: 0.3, currentDirectionDeg: 120, currentAlignment: 0.5, currentVerified: true,
  waterLevelCm: 20, waterLevelTrendCm3h: null, waterLevelSource: 'dmi',
}, at(0)).samples72h[0];
assert.equal(newerMarine.waveHeightM, 1.1, 'nyere gyldige bølger skal vinde');
assert.equal(newerMarine.waveDirectionDeg, null, 'ny bølgehøjde må ikke blandes med gammel retning');
assert.equal(newerMarine.currentSpeedMps, 0.3, 'nyere verificeret strøm skal vinde');
assert.equal(newerMarine.currentAlignment, 0.5);
assert.equal(newerMarine.waterLevelCm, 20, 'nyere gyldig vandstand skal vinde');
assert.equal(newerMarine.waterLevelTrendCm3h, null, 'ny vandstand må ikke arve gammel trend');
const verifiedCurrent={currentSpeedMps:.23,currentDirectionDeg:184,currentProvenance:{status:'verified'}};
const verified72=attachVerifiedCurrentToSample(retained.samples72h,verifiedCurrent,at(0).replace('.000Z', 'Z'));
const latest=verified72.find(row=>row.at===at(0));
assert.equal(latest.currentVerified,true,'den aktuelle DMI-prøve skal markeres verificeret i 72-timersvinduet');
assert.equal(latest.currentSpeedMps,.23);
assert.equal(verified72.find(row=>row.at===at(1)).currentVerified,false,'ældre uverificeret fortid må ikke omskrives');

const publicDoc = buildPublicConditions({
  datasetId: 'history-retention-test', generatedAt: at(0), productionReferenceAt: at(0),
  zones: { Z: { current: {}, history: {}, samples24h: retained.samples24h, samples72h: retained.samples72h, forecast: { hourly: [] } } }
});
assert(!('samples24h' in publicDoc.zones.Z));
assert(!('samples72h' in publicDoc.zones.Z));
console.log('OK: 72-timers pipelinehistorik bevares separat, aktiv score bruger fortsat kun 24 timer, og rå historik udelades fra public projection.');
