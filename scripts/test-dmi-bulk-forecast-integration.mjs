import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildDmiForecastHourly } from './lib/dmi-forecast-store.mjs';

const source = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
const productionAdapter = fs.readFileSync('scripts/lib/ravscore-production-adapters.mjs', 'utf8');
const bulkConverter = source.slice(
  source.indexOf('function bulkZoneToForecastRecord('),
  source.indexOf('function mergeBulkCacheIntoForecastStore('),
);
const integratedRuntime = source.slice(
  source.indexOf('function scoreCoastalPartsRuntime('),
  source.indexOf('function dmiCollections('),
);
const hourlyMerge = source.slice(
  source.indexOf('const ATOMIC_COMPONENT_TUPLE_KEYS'),
  source.indexOf('function componentSource('),
);
const fallbackMerge = source.slice(
  source.indexOf('function mergeDmiWithFallback('),
  source.indexOf('function componentForecastHorizonHours('),
);
const tupleSelectorSource = source.slice(
  source.indexOf('const ATOMIC_COMPONENT_TUPLE_KEYS'),
  source.indexOf('function mergeHourlyPreferDmi('),
);
const { selectAtomicComponentTuple } = Function(
  'ravScoreNumber',
  `${tupleSelectorSource}; return { selectAtomicComponentTuple };`,
)(value => typeof value === 'number' && Number.isFinite(value) ? value : null);
const atomicMergeSource = source.slice(
  source.indexOf('const ATOMIC_COMPONENT_TUPLE_KEYS'),
  source.indexOf('function componentForecastHorizonHours('),
);
const {
  mergeHourlyPreferDmi: mergeHourlyPreferDmiForTest,
  mergeDmiWithFallback: mergeDmiWithFallbackForTest,
} = Function(
  'ravScoreNumber',
  'normalizeForecastHourly',
  'verifiedDmiForecastComponentSource',
  'repairWaterLevelContinuity',
  'SHORT_DMI_WATER_GAP_HOURS',
  'WATER_LEVEL_JUMP_WARN_CM',
  'ACCEPTED_FORECAST_HOURS',
  `${atomicMergeSource}; return { mergeHourlyPreferDmi, mergeDmiWithFallback };`,
)(
  value => typeof value === 'number' && Number.isFinite(value) ? value : null,
  (rows, { limit = Number.MAX_SAFE_INTEGER } = {}) => (Array.isArray(rows) ? rows : [])
    .filter(row => row && typeof row.time === 'string')
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time))
    .slice(0, limit),
  sourceValue => sourceValue ?? null,
  () => ({ status: 'not-relevant-to-atomic-tuple-test' }),
  2,
  25,
  118,
);

assert.deepEqual(selectAtomicComponentTuple(
  { waveHeightM: 1, wavePeriodS: 6, waveDirectionDeg: null },
  { waveHeightM: 2, wavePeriodS: 8, waveDirectionDeg: 270 },
  'wave',
).values, { waveHeightM: 2, wavePeriodS: 8, waveDirectionDeg: 270 },
'a directionless active primary wave may not borrow direction; the complete retained tuple wins');
assert.deepEqual(selectAtomicComponentTuple(
  { windSpeedMps: 5, windDirectionDeg: null },
  { windSpeedMps: 9, windDirectionDeg: 180 },
  'wind',
).values, { windSpeedMps: 9, windDirectionDeg: 180 },
'an incomplete primary wind may not mix with the retained tuple');
assert.equal(selectAtomicComponentTuple(
  { currentSpeedMps: 0.2, currentDirectionDeg: 90 },
  { currentSpeedMps: 0.3, currentDirectionDeg: 180 },
  'current',
).retained, false,
'the legacy display contract may still use an atomic speed+direction current tuple without U/V');

const atomicTestTime = '2026-09-08T12:00:00.000Z';
const hourlyDomainValidated = mergeHourlyPreferDmiForTest([
  {
    time: atomicTestTime,
    windSpeedMps: -0.1,
    windDirectionDeg: 90,
    currentSpeedMps: 0.2,
    currentDirectionDeg: 360,
    sources: {
      wind: { provider: 'dmi', fallback: false },
      current: { provider: 'dmi', fallback: false },
    },
  },
], [
  {
    time: atomicTestTime,
    windSpeedMps: 5,
    windDirectionDeg: 180,
    currentSpeedMps: 0.3,
    currentDirectionDeg: 45,
    sources: {
      wind: { provider: 'retained', fallback: true },
      current: { provider: 'retained', fallback: true },
    },
  },
], { generatedAt: atomicTestTime })[0];
assert.deepEqual(
  [hourlyDomainValidated.windSpeedMps, hourlyDomainValidated.windDirectionDeg],
  [5, 180],
  'hourly retention must reject a negative primary wind speed and retain one complete valid tuple',
);
assert.deepEqual(
  [hourlyDomainValidated.currentSpeedMps, hourlyDomainValidated.currentDirectionDeg],
  [0.3, 45],
  'hourly retention must reject direction 360 and retain one complete valid current tuple',
);

const zoneDomainValidated = mergeDmiWithFallbackForTest({
  generatedAt: atomicTestTime,
  current: {
    windSpeedMps: 4,
    windDirectionDeg: -1,
    currentSpeedMps: -0.2,
    currentDirectionDeg: 90,
  },
}, {
  provider: 'open-meteo',
  generatedAt: atomicTestTime,
  current: {
    windSpeedMps: 7,
    windDirectionDeg: 270,
    currentSpeedMps: 0.4,
    currentDirectionDeg: 135,
  },
});
assert.deepEqual(
  [zoneDomainValidated.current.windSpeedMps, zoneDomainValidated.current.windDirectionDeg],
  [7, 270],
  'zone fallback must reject a negative wind direction and take the fallback tuple atomically',
);
assert.deepEqual(
  [zoneDomainValidated.current.currentSpeedMps, zoneDomainValidated.current.currentDirectionDeg],
  [0.4, 135],
  'zone fallback must reject a negative current speed and take the fallback tuple atomically',
);

const emptyHorizon = buildDmiForecastHourly({
  generatedAt: '2026-09-08T10:12:00.000Z',
  startAt: '2026-09-08T11:00:00.000Z',
  hours: 118,
}).hourly;
assert.equal(emptyHorizon.length, 118,
  'an empty primary input must still have an exact 118-hour domain');
assert.equal(emptyHorizon[0].time, '2026-09-08T11:00:00.000Z');
assert.equal(emptyHorizon.at(-1).time, '2026-09-13T08:00:00.000Z');
assert.ok(emptyHorizon.every(hour => hour.waveHeightM === null
  && hour.wavePeriodS === null && hour.waveDirectionDeg === null
  && hour.sources?.wave?.provider === 'missing'),
'the empty horizon must contain honest MISSING wave rows, never synthetic values');

assert.match(source, /mergeBulkCacheIntoForecastStore\(features, dmiBulkCache, nextDmiForecastStore, generatedAt\)/,
  'bulkcache skal flettes ind i nextDmiForecastStore før zoneopløsning');
assert.match(source, /resolveZone\(feature, generatedAt, previous, nextDmiForecastStore, nextDmiForecastStore/,
  'zoneopløsning skal læse den nyflettede store og må ikke falde tilbage til den gamle store');
assert.doesNotMatch(source, /resolveZone\(feature, generatedAt, previous, dmiForecastStore, nextDmiForecastStore, \{ allowLiveDmi: false \}\)/,
  'regression: gammel forecaststore må ikke overskrive frisk bulkcache');
assert.match(source, /conversionLossZones/);
assert.match(source, /bulkMarineCandidateZones/);
assert.match(source, /bulkCacheGeneratedAt/);

const bulk = fs.readFileSync('scripts/update-dmi-bulk.py', 'utf8');
const nativeProvenance = fs.readFileSync('scripts/lib/dmi_native_provenance.py', 'utf8');
assert.match(bulk, /zone_registry_unchanged/);
assert.match(bulk, /and zone_registry_unchanged/,
  'fresh bulkcache må kun genbruges når zonepunkterne er uændrede');
assert.match(bulk, /"zoneRegistrySignature": current_zone_registry_signature/);
assert.match(bulk, /def native_component_source[\s\S]*?"fallback": False/,
  'new native DMI cache rows must state the non-fallback provenance explicitly');
assert.match(bulk, /33: "wind-tail-u-10m"/,
  'DKSS GRIB parameter 33 skal materialiseres som en separat vindhale');
assert.match(bulk, /34: "wind-tail-v-10m"/,
  'DKSS GRIB parameter 34 skal materialiseres som en separat vindhale');
assert.match(source, /buildDmiForecastHourly\(\{ wind, windTail, waves, ocean/,
  'bulk-konverteringen skal sende HARMONIE og DKSS som adskilte vindserier');
assert.match(bulkConverter, /const waveHeight = ravScoreNumber\(row\['significant-wave-height'\]\);[\s\S]*?const wavePeriod = ravScoreNumber\(row\['dominant-wave-period'\]\);[\s\S]*?if \(!waveSource \|\| waveHeight === null \|\| wavePeriod === null\) return null;/,
  'bulk-konverteringen skal bevare den verificerede Hs+periode-mobiliseringstuple uden at kræve retning');
assert.match(bulkConverter, /const waveDirectionAttested = waveSource\.optionalFieldSet\.length === 1[\s\S]*?waveSource\.optionalFieldSet\[0\] === 'mean-wave-dir';[\s\S]*?const waveDirection = waveDirectionAttested[\s\S]*?ravScoreNumber\(row\['mean-wave-dir'\]\)[\s\S]*?: null;/,
  'bølgeretningen må kun følge med, når samme verificerede bølgekilde attesterer det valgfrie felt');
assert.doesNotMatch(bulkConverter, /\['significant-wave-height','mean-wave-dir','dominant-wave-period'\][\s\S]{0,120}?\.every/,
  'manglende valgfri bølgeretning må ikke længere slette Hs+periode');
assert.match(bulkConverter, /const waveAvailable = waves\.some\(item => ravScoreNumber\(item\['significant-wave-height'\]\) !== null[\s\S]*?ravScoreNumber\(item\['dominant-wave-period'\]\) !== null\);/,
  'wave completeness skal måle den obligatoriske mobiliseringstuple, ikke det valgfrie retningsfelt');
assert.match(bulkConverter, /provenance:\s*\{[\s\S]*?current:\s*rowCurrentValid \? provenance\(row\)\.current : null,[\s\S]*?waterLevel:\s*waterLevelSource/,
  'bulk-konverteringen skal føre komponentproveniens videre til interpolation');
assert.match(productionAdapter, /export function verifiedBulkCurrent/,
  'bulk-konverteringen skal afvise strøm uden semantik v3, aktuelt samplingpunkt, fælles lag og højst 5 km');
assert.match(productionAdapter, /haversineKm\(expectedSamplingPoint, gridPoint\) > maximum \+ 0\.01/,
  'den faktiske koordinatafstand skal efterkontrolleres uafhængigt af cachemetadata');
assert.match(source, /const safeRecord = withOnlyVerifiedCurrent\(record, zonePoint\(feature\)\)/,
  'en gammel forecastcache må ikke føre udokumenteret strøm videre til scoring');
const directDmi = source.slice(source.indexOf('async function fromDmi('), source.indexOf('function mergeHourlyPreferDmi('));
assert.doesNotMatch(directDmi, /\['sea-mean-deviation', 'current-u'/,
  'ForecastEDR-positionstjenesten må ikke levere strøm uden fælles vandkolonne- og lagbevis');
assert.match(directDmi, /withoutCurrent\(createDmiForecastRecord\(/,
  'ForecastEDR-resultatet skal lukkes fail-closed for strøm før scoring');
assert.match(hourlyMerge, /row\?\.sources\?\.\[component\][\s\S]*?wave: selectedWave\?\.attestation/,
  'den endelige merge skal føre den valgte bølgetuples egen verificerede proveniens videre');
assert.equal((source.match(/materializeMissingHorizon: true/g) ?? []).length, 2,
  'missing-horizon materialization is limited to Feggesund preflight and the primary integrated part runtime');
assert.match(integratedRuntime, /preflightFeggesundOperationalWaveReadiness\([\s\S]*?const nearestIndex/,
  'Feggesund readiness must be checked before the main scoring loop');
assert.ok(
  integratedRuntime.indexOf('preflightFeggesundOperationalWaveReadiness({')
    < integratedRuntime.indexOf('buildRavScoreProductionPartSeries({'),
  'the exact wave preflight must run before expensive RavScore production scoring',
);
assert.doesNotMatch(integratedRuntime, /if \(!dmiRecord\) continue;/,
  'a primary integrated part may never disappear silently when its bulk zone is absent');
assert.match(integratedRuntime, /materializeMissingHorizon: true,[\s\S]*?COASTAL_PART_HORIZON_MATERIALIZATION_INVARIANT/,
  'the primary runtime must materialize missing horizons and fail on an impossible null result');
const recoveryRuntime = integratedRuntime.slice(
  integratedRuntime.indexOf('// A promoted point has a deliberately new sampling context'),
  integratedRuntime.indexOf('const {\n        ravScoreState'),
);
assert.doesNotMatch(recoveryRuntime, /materializeMissingHorizon/,
  'deployed/progressive replay keeps its existing optional recovery behavior');
assert.match(integratedRuntime, /FEGGESUND_WAVE_RUNTIME_PREFLIGHT_MISMATCH/,
  'the final private proof must be hash-identical to the preflight proof');
assert.match(bulkConverter, /bulkZone\?\.collections/,
  'materializing an absent primary bulk zone must not dereference missing metadata');
assert.match(hourlyMerge, /selectAtomicComponentTuple\([\s\S]*?select\('wind'\)[\s\S]*?select\('wave'\)[\s\S]*?select\('current'\)/,
  'hourly retention must select wind, wave and current as atomic component tuples');
for (const mixedTuplePattern of [
  /item\.windSpeedMps \?\? fallback\.windSpeedMps/,
  /item\.waveDirectionDeg \?\? fallback\.waveDirectionDeg/,
  /item\.currentSpeedMps \?\? fallback\.currentSpeedMps/,
]) {
  assert.doesNotMatch(hourlyMerge, mixedTuplePattern,
    'hourly merge may not borrow one tuple field from another row/provider');
}
assert.match(hourlyMerge, /selectedCurrentVectorAvailable \? selectedCurrentU : null[\s\S]*?selectedCurrentVectorAvailable \? selectedCurrentV : null/,
  'U/V must be retained or rejected as a pair from the selected current row');
assert.match(fallbackMerge, /selectAtomicComponentTuple\([\s\S]*?atomicSelection\?\.values/,
  'the zone-level DMI/fallback merge must use the same atomic tuple selector');
const atmosphereReadiness = source.slice(
  source.indexOf('function recordHasAtmosphere('),
  source.indexOf('function waterLevelDiagnostic('),
);
assert.match(atmosphereReadiness, /atomicComponentForecastHorizonHours\(record, generatedAt, 'wave'\)/,
  'generic acquisition readiness must not false-green on wave height alone');
assert.match(source, /timezone: 'GMT'/,
  'Open-Meteo fallback skal levere entydige UTC-tider');
assert.doesNotMatch(source, /ocean_current_(?:velocity|direction)/,
  'Open-Meteos overfladestrøm må hverken hentes eller kunne bruges som reserve for aktiv strøm');
assert.match(source, /const result = withoutZoneCurrent\(await provider\(feature, generatedAt\)\)/,
  'alle eksterne fallbackresultater skal lukkes fail-closed for strøm før merge og scoring');
assert.match(source, /return withoutZoneCurrent\(\{ \.\.\.result, forecast, stale: false, fallback: true, attempts \}\)/,
  'fallbackprognosen skal også renses for tidligere eller indirekte strømfelter');

assert.match(bulk, /active_output_ids = \{[\s\S]*not zone\.get\("researchCurrent"\)[\s\S]*\}/,
  'bulkcache skal materialisere den aktuelle zone-/kilderegistrering før DMI-felter flettes ind');
assert.match(bulk, /\*\*\(sampling_identity\(zone_config_by_id\[zone_id\]\) or \{\}\)/,
  'hver offentlig bulkpost skal bindes til sin fulde aktuelle entity- og samplingidentitet');
assert.match(nativeProvenance, /"entityId": entity_id[\s\S]*?"parentZoneId": parent_zone_id[\s\S]*?"samplingContext": sampling_context[\s\S]*?"samplingPoint": \[round\(sampling_point\[0\], 7\), round\(sampling_point\[1\], 7\)\]/,
  'samplingidentiteten skal binde del, forældrezone og lokalt punkt sammen');
assert.match(bulk, /"zones": initial_zone_records/,
  'aktive zoner må ikke forsvinde fra bulkcache når et direkte DMI-hit mangler');
assert.doesNotMatch(bulk, /result\["zones"\]\s*=\s*\{[^\n]*if v\.get\("hourly"\)/,
  'clean/summarize må ikke slette materialiserede zoner uden direkte DMI-hit');
assert.match(bulk, /merge_previous\(result, previous, active_output_ids\)/,
  'stale bulkposter uden for den aktuelle registrering må ikke genindføres fra tidligere cache');

console.log('DMI bulk → forecast integration regression test passed.');
