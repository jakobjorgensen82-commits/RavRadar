import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('scripts/update-weather.mjs', 'utf8');
const helperStart = source.indexOf('function dmiRecordNeedsPublicFallback(');
const helperEnd = source.indexOf('\nfunction waterLevelDiagnostic(', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart,
  'update-weather skal have en eksplicit DMI-først fallback-vagt');

const context = vm.createContext({
  recordHasAtmosphere: (record, generatedAt) => Boolean(record?.atmosphere && generatedAt),
});
vm.runInContext(`${source.slice(helperStart, helperEnd)}\nglobalThis.run = dmiRecordNeedsPublicFallback;`, context);
assert.equal(context.run({ atmosphere: true }, '2026-09-20T11:00:00Z'), false,
  'en komplet DMI-atmosfære må ikke starte Open-Meteo igen');
assert.equal(context.run({ atmosphere: false }, '2026-09-20T11:00:00Z'), true,
  'en ufuldstændig DMI-atmosfære skal stadig kunne få fallback');

const healthyBranch = source.slice(
  source.indexOf('if (healthyCachedDmi) {'),
  source.indexOf('\n  if (allowLiveDmi)', source.indexOf('if (healthyCachedDmi) {')),
);
assert.match(healthyBranch, /dmiRecordNeedsPublicFallback\(existingRecord, generatedAt\)/,
  'healthy DMI-cachegrenen skal kun kalde fallback ved reelle atmosfæremangler');

const cachedBranch = source.slice(
  source.indexOf('const cachedDmi = zoneFromDmiForecastCache'),
  source.indexOf('\n  attempts.push\(\{ zoneId, provider:', source.indexOf('const cachedDmi = zoneFromDmiForecastCache')),
);
assert.match(cachedBranch, /dmiRecordNeedsPublicFallback\(dmiForecastStore\?\.zones\?\.\[zoneId\], generatedAt\)/,
  'cached DMI-grenen skal bruge samme DMI-først-vagt');

console.log('DMI-first fallback guard bestået.');
