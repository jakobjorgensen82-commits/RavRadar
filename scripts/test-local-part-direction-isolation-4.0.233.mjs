import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { localPartRuntimeProperties } from './lib/local-part-runtime.mjs';
import { evaluateDirectionAnchors, angularDifference } from '../js/core/direction-anchors.js?v=4.0.233';
import { calculateRavScore } from '../js/core/score-engine.js?v=4.0.233';

const updateWeatherSource = await fs.readFile('scripts/update-weather.mjs', 'utf8');
assert.equal(
  (updateWeatherSource.match(/localPartRuntimeProperties\(parent\.properties, part,/g) ?? []).length,
  2,
  'Både delens vejfeature og scorezone skal bygges med den isolerede lokale retning'
);

const parent = {
  id: 'DK-B03-13',
  name: 'Blåvand og Hvidbjerg',
  coastType: 'west',
  shallowWater: true,
  reefs: true,
  directionAnchors: [
    { id: 'north-of-lighthouse', name: 'Nord for fyret', onshoreDirectionDeg: 118, weight: 1 },
    { id: 'south-of-lighthouse', name: 'Syd for fyret', onshoreDirectionDeg: 29, weight: 1 }
  ]
};
const northCoast = {
  partId: 'dk-b03-13-national-part-01-orientation-02',
  name: 'Havsande – nordkyst',
  waterPoint: [8.05, 55.56],
  landPoint: [8.06, 55.55],
  onshoreDirectionDeg: 117.3
};
const local = localPartRuntimeProperties(parent, northCoast, northCoast.partId);
assert.equal(local.directionAnchors.length, 1, 'En lokal kystdel må ikke arve moderzonens retningsankre');
assert.equal(local.directionAnchors[0].name, northCoast.name, 'Forklaringen skal bruge kystdelens autoritative navn');
assert.ok(angularDifference(local.directionAnchors[0].onshoreDirectionDeg, northCoast.onshoreDirectionDeg) < 0.001);
const evaluation = evaluateDirectionAnchors(local, 0);
assert.equal(evaluation.method, 'single-anchor');
assert.equal(evaluation.primaryAnchor.name, northCoast.name);
assert.ok(evaluation.primaryAnchor.differenceDeg > 110, 'Nordgående strøm må ikke bedømmes mod Syd for fyret');

const result = calculateRavScore({
  mode: 'waders',
  zone: local,
  weather: {
    windSpeedMps: 3.9,
    windDirectionDeg: 177,
    waveHeightM: 0.6,
    waterLevelCm: 58,
    waterLevelTrendCm3h: -9,
    currentSpeedMps: 0.3,
    currentDirectionDeg: 0
  },
  history: {}
});
assert.equal(result.explanation.transportDiagnostics.selectedDirectionAnchor.name, northCoast.name);
assert.equal(result.explanation.transportDiagnostics.currentClassification, 'offshore');
assert.ok(result.components.transport <= 42, 'Offshore-strøm skal udløse transportloftet for den lokale kystdel');

const contract = JSON.parse(await fs.readFile('data/live/coastal-parts-v2.json', 'utf8'));
const zones = JSON.parse(await fs.readFile('data/zones.geojson', 'utf8'));
const parentById = new Map(zones.features.map(feature => [feature.properties?.id, feature.properties]));
let checked = 0;
for (const [zoneId, parts] of Object.entries(contract.zones ?? {})) {
  const parentProperties = parentById.get(zoneId);
  assert.ok(parentProperties, `${zoneId}: moderzone mangler`);
  for (const part of parts) {
    const properties = localPartRuntimeProperties(parentProperties, part, part.partId);
    assert.equal(properties.directionAnchors.length, 1, `${part.partId}: skal have præcis ét lokalt retningsanker`);
    assert.equal(properties.directionAnchors[0].name, part.name, `${part.partId}: forkert navn i forklaringen`);
    assert.ok(angularDifference(properties.directionAnchors[0].onshoreDirectionDeg, part.onshoreDirectionDeg) < 0.001, `${part.partId}: score og godkendt punktpar bruger forskellig retning`);
    assert.deepEqual(properties.directionAnchors[0].dataPoint, part.waterPoint, `${part.partId}: forkert vandpunkt i scoreankeret`);
    assert.deepEqual(properties.directionAnchors[0].pinPoint, part.landPoint, `${part.partId}: forkert landpunkt i scoreankeret`);
    checked += 1;
  }
}
assert.equal(checked, 673, 'Den landsdækkende regression skal omfatte præcis 673 kystdele');
console.log(`OK: ${checked}/673 kystdele bruger kun eget land-/havpunkt, egen retning og eget navn i score og forklaring.`);
