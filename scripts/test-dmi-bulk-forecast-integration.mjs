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
assert.match(source, /provenance: \{ current: provenance\(row\)\.current, waterLevel: provenance\(row\)\.waterLevel/,
  'bulk-konverteringen skal føre komponentproveniens videre til interpolation');
assert.match(source, /item\.sources\?\.wave/,
  'den endelige merge må ikke erstatte bølgeproveniens med en generisk DMI-markør');
assert.match(source, /timezone: 'GMT'/,
  'Open-Meteo fallback skal levere entydige UTC-tider');

assert.match(bulk, /active_output_ids = \{str\(zone\["id"\]\) for zone in zones if zone\.get\("id"\)\}/,
  'bulkcache skal materialisere den aktuelle zone-/kilderegistrering før DMI-felter flettes ind');
assert.match(bulk, /"zones": initial_zone_records/,
  'aktive zoner må ikke forsvinde fra bulkcache når et direkte DMI-hit mangler');
assert.doesNotMatch(bulk, /result\["zones"\]\s*=\s*\{[^\n]*if v\.get\("hourly"\)/,
  'clean/summarize må ikke slette materialiserede zoner uden direkte DMI-hit');
assert.match(bulk, /merge_previous\(result, previous, active_output_ids\)/,
  'stale bulkposter uden for den aktuelle registrering må ikke genindføres fra tidligere cache');

console.log('DMI bulk → forecast integration regression test passed.');
