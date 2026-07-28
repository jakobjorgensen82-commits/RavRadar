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

console.log('DMI bulk → forecast integration regression test passed.');
