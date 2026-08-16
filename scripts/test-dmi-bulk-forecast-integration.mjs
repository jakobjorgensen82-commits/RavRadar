import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('scripts/update-weather.mjs', 'utf8');

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
assert.match(bulk, /zone_registry_unchanged/);
assert.match(bulk, /and zone_registry_unchanged/,
  'fresh bulkcache må kun genbruges når zonepunkterne er uændrede');
assert.match(bulk, /"zoneRegistrySignature": current_zone_registry_signature/);
assert.match(bulk, /33: "wind-tail-u-10m"/,
  'DKSS GRIB parameter 33 skal materialiseres som en separat vindhale');
assert.match(bulk, /34: "wind-tail-v-10m"/,
  'DKSS GRIB parameter 34 skal materialiseres som en separat vindhale');
assert.match(source, /buildDmiForecastHourly\(\{ wind, windTail, waves, ocean/,
  'bulk-konverteringen skal sende HARMONIE og DKSS som adskilte vindserier');
assert.match(source, /provenance: \{ current: rowCurrentValid \? provenance\(row\)\.current : null, waterLevel: provenance\(row\)\.waterLevel/,
  'bulk-konverteringen skal føre komponentproveniens videre til interpolation');
assert.match(source, /function verifiedBulkCurrent/,
  'bulk-konverteringen skal afvise strøm uden semantik v3, aktuelt samplingpunkt, fælles lag og højst 5 km');
assert.match(source, /haversineKm\(expectedSamplingPoint, gridPoint\) > maximum \+ 0\.01/,
  'den faktiske koordinatafstand skal efterkontrolleres uafhængigt af cachemetadata');
assert.match(source, /const safeRecord = withOnlyVerifiedCurrent\(record, zonePoint\(feature\)\)/,
  'en gammel forecastcache må ikke føre udokumenteret strøm videre til scoring');
const directDmi = source.slice(source.indexOf('async function fromDmi('), source.indexOf('function mergeHourlyPreferDmi('));
assert.doesNotMatch(directDmi, /\['sea-mean-deviation', 'current-u'/,
  'ForecastEDR-positionstjenesten må ikke levere strøm uden fælles vandkolonne- og lagbevis');
assert.match(directDmi, /withoutCurrent\(createDmiForecastRecord\(/,
  'ForecastEDR-resultatet skal lukkes fail-closed for strøm før scoring');
assert.match(source, /item\.sources\?\.wave/,
  'den endelige merge må ikke erstatte bølgeproveniens med en generisk DMI-markør');
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
assert.match(bulk, /"samplingPoint": \[round\(float\(zone_config_by_id/,
  'hver offentlig bulkpost skal bindes til det aktuelle samplingpunkt');
assert.match(bulk, /"zones": initial_zone_records/,
  'aktive zoner må ikke forsvinde fra bulkcache når et direkte DMI-hit mangler');
assert.doesNotMatch(bulk, /result\["zones"\]\s*=\s*\{[^\n]*if v\.get\("hourly"\)/,
  'clean/summarize må ikke slette materialiserede zoner uden direkte DMI-hit');
assert.match(bulk, /merge_previous\(result, previous, active_output_ids\)/,
  'stale bulkposter uden for den aktuelle registrering må ikke genindføres fra tidligere cache');

console.log('DMI bulk → forecast integration regression test passed.');
