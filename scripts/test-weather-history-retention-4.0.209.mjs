import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { deriveCurrentTransportHistory } from './lib/current-transport-history.mjs';
import { inverseCurrentFamilyColdZoneHistoryTestInput, CURRENT_FAMILY_COLD_ZONE_HISTORY_TEST_REVIEW,
  inverseCurrentFamilyColdTargetTestInput, inverseArchivedWeatherRestartUpdater,
  inverseFinalizedWeatherOwnersTestInput }
  from './lib/archived-weather-restart-updater-test-input.mjs';
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

// The real updater's post-capability caller seam, not a shadow projection.
const updater = (await fs.readFile(new URL('./update-weather.mjs', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
const boundary = "  throw new Error('CURRENT_FAMILY_COLD_START_ACQUISITION_OUTPUT_PATH');\n}\n";
const capAt = updater.indexOf('const currentFamilyColdStart = coldRequested');
const start = updater.indexOf(boundary, capAt) + boundary.length;
const end = updater.indexOf("const stateEpochView = process.env.RAVRADAR_WEATHER_STATE_EPOCH_BOOTSTRAP", start);
assert(capAt >= 0 && start >= boundary.length && end >= start, 'Actual post-capability history seam exists');
assert(updater.slice(capAt, start).includes('await loadCurrentFamilyColdStartForTarget('));
assert(updater.slice(capAt, start).includes('currentFamilyColdStartScoreInputs(currentFamilyColdStart,'));
assert(end < updater.indexOf('await resolveZone(feature, generatedAt, previous,'));
const projection = updater.slice(start, end);
const withoutAt = updater.indexOf('function withoutHistoricCurrent(');
const withoutEnd = updater.indexOf('function historyFor(', withoutAt);
assert(withoutAt > 0 && withoutEnd > withoutAt);
const isolate = new Function('previous', 'currentFamilyColdStart',
  updater.slice(withoutAt, withoutEnd) + projection + '\nreturn previous;');
const oldCurrent = { at: at(1), windSpeedMps: 18, windDirectionDeg: 260,
  waveHeightM: 2.1, waveDirectionDeg: 140, wavePeriodS: 7,
  waterLevelCm: 12, waterLevelTrendCm3h: 3, waterLevelSource: 'dmi', waterTemperatureC: 14,
  currentSpeedMps: .4, currentDirectionDeg: 90, currentAlignment: .8, currentVerified: true,
  unrelated: { preserved: true } };
const oldRows24 = [oldCurrent], oldRows72 = [{ ...oldCurrent, at: at(60) }, oldCurrent];
const preservedForecast = { hourly: [{ time: at(0), windSpeedMps: 3 }] };
const original = { zones: {
  Z: { samples24h: oldRows24, samples72h: oldRows72, forecast: preservedForecast,
    currentVectorSemanticsVersion: 3, currentSamplingPoint: [10, 56], metadata: { kept: true } },
  absent: { other: [] }, shapes: { samples24h: null, samples72h: { unchanged: true } }, empty: { samples24h: [] },
} };
const originalBytes = JSON.stringify(original), ordinary = structuredClone(original);
const ordinaryRows = ordinary.zones.Z.samples24h;
assert.equal(isolate(ordinary, null), ordinary);
assert.equal(ordinary.zones.Z.samples24h, ordinaryRows, 'Ordinary array identity is untouched');
assert.equal(JSON.stringify(ordinary), originalBytes, 'Ordinary route is byte-equivalent');
const cold = { zones: { ...original.zones, Z: { ...original.zones.Z }, empty: { samples24h: [] } } };
const oldScalarArray = cold.zones.absent.other;
assert.equal(isolate(cold, Object.freeze({ syntheticActualLoaderResult: true })), cold);
const cleared = row => ({ ...row, currentSpeedMps: null, currentDirectionDeg: null,
  currentAlignment: null, currentVerified: false });
assert.deepEqual(cold.zones.Z.samples24h, oldRows24.map(cleared), 'Cold history cannot inherit OLD verified current');
assert.deepEqual(cold.zones.Z.samples72h, oldRows72.map(cleared), 'All 72h OLD current samples are isolated');
assert.notEqual(cold.zones.Z.samples24h, oldRows24);
assert.equal(cold.zones.Z.forecast, preservedForecast, 'Independent scalar forecast object is not rewritten');
assert.equal(cold.zones.absent.other, oldScalarArray);
assert(!Object.hasOwn(cold.zones.absent, 'samples24h') && !Object.hasOwn(cold.zones.absent, 'samples72h'));
assert.equal(cold.zones.shapes.samples24h, null);
assert.equal(cold.zones.shapes.samples72h, original.zones.shapes.samples72h);
assert.deepEqual(cold.zones.empty.samples24h, []);
assert.equal(JSON.stringify(original), originalBytes, 'OLD baseline rows/bytes are not mutated');
const newSample = { ...current, currentSpeedMps: null, currentDirectionDeg: null,
  currentAlignment: null, currentVerified: false };
const coldHistory = retainWeatherHistory(cold.zones.Z, newSample, at(0));
const ordinaryHistory = retainWeatherHistory(original.zones.Z, newSample, at(0));
assert.equal(deriveCurrentTransportHistory(coldHistory.samples24h).verifiedCurrentCoverageHours, 0);
assert(deriveCurrentTransportHistory(ordinaryHistory.samples24h).verifiedCurrentCoverageHours > 0);
for (const field of ['windSpeedMps', 'windDirectionDeg', 'waveHeightM', 'waveDirectionDeg', 'wavePeriodS',
  'waterLevelCm', 'waterLevelTrendCm3h', 'waterLevelSource', 'waterTemperatureC']) {
  assert.deepEqual(coldHistory.samples72h.map(row => row[field]), ordinaryHistory.samples72h.map(row => row[field]),
    'All scalar/storm evidence stays unchanged: ' + field);
}
assert.match(projection, /if \(currentFamilyColdStart !== null\)/);
assert.doesNotMatch(projection, /coldRequested|process\.env|coastalParts|checkpoint/);
// The test-only outer inverse must recover the exact whole reviewed source;
// every older whole-source oracle remains unchanged.
const previousUpdater = inverseCurrentFamilyColdZoneHistoryTestInput(updater, 'scripts/update-weather.mjs');
assert.equal(Buffer.byteLength(previousUpdater), CURRENT_FAMILY_COLD_ZONE_HISTORY_TEST_REVIEW.before.bytes);
assert.equal(inverseCurrentFamilyColdZoneHistoryTestInput(previousUpdater, 'scripts/update-weather.mjs'), previousUpdater);
const coldBefore = inverseCurrentFamilyColdTargetTestInput(previousUpdater, 'scripts/update-weather.mjs');
assert.equal(inverseCurrentFamilyColdTargetTestInput(updater, 'scripts/update-weather.mjs'), coldBefore);
assert.equal(inverseArchivedWeatherRestartUpdater(updater), inverseArchivedWeatherRestartUpdater(previousUpdater));
const coldOracleInput = inverseFinalizedWeatherOwnersTestInput(updater, 'scripts/update-weather.mjs');
for (const changed of [coldOracleInput + '// foreign drift\n', coldOracleInput.replace('zone[key] = withoutHistoricCurrent(zone[key])',
  'zone[key] = []'), coldOracleInput.replace('currentFamilyColdStart !== null) {\n  for (const zone',
  'coldRequested) {\n  for (const zone')]) {
  assert.throws(() => inverseCurrentFamilyColdZoneHistoryTestInput(changed, 'scripts/update-weather.mjs'),
    /COLD_ZONE_HISTORY/);
}
assert.throws(() => inverseCurrentFamilyColdZoneHistoryTestInput(updater, 'scripts/unknown.mjs'), /COLD_ZONE_HISTORY/);
assert.throws(() => inverseCurrentFamilyColdZoneHistoryTestInput(null, 'scripts/update-weather.mjs'), /COLD_ZONE_HISTORY/);
