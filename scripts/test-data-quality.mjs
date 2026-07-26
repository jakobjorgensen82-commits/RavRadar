import assert from 'node:assert/strict';
import { buildDataQuality } from './lib/data-quality.mjs';

const good = buildDataQuality({
  generatedAt: new Date().toISOString(),
  weatherEngine: { dmiForecastCache: { zones: 1 } },
  zones: {
    DIRECT: { provider: 'dmi', waterLevel: { diagnostic: { observationMethod: 'direct-zone-station', observationStations: [{ stationId: 'A', side: 'inside-zone', distanceKm: 1, observationAgeMinutes: 5 }] } } },
    INTERP: { provider: 'dmi-cache', waterLevel: { diagnostic: { observationMethod: 'coast-bracket-2-stations', observationStations: [{ stationId: 'B', side: 'before', distanceKm: 10, observationAgeMinutes: 5 }, { stationId: 'C', side: 'after', distanceKm: 12, observationAgeMinutes: 5 }] } } }
  }
}, { stationsFetched: 3, stationsWithFreshLevel: 3 });
assert.equal(good.status, 'ok');
assert.equal(good.observations.directZones, 1);
assert.equal(good.observations.interpolatedZones, 1);
assert.equal(good.observations.uniqueStationsUsed, 3);

const bad = buildDataQuality({ zones: {
  BAD: { provider: 'open-meteo', waterLevel: { diagnostic: { observationMethod: 'coast-bracket-2-stations', observationStations: [{ stationId: 'X', side: 'before' }, { stationId: 'X', side: 'before' }] } } }
} });
assert.equal(bad.status, 'error');
assert.ok(bad.issues.some(issue => issue.code === 'DUPLICATE_STATION'));
assert.ok(bad.issues.some(issue => issue.code === 'INVALID_BRACKET'));
console.log('Automatisk DMI-data- og vandstandskvalitet bestået.');
