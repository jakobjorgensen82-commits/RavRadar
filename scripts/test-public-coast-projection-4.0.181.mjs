import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { projectPublicCoastlines } from '../js/map/public-coast-projection.js';

const source = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { id: 'Z1', name: 'Hovedzone', coastLine: [[10, 56], [10.2, 56.2]] }, geometry: null },
    { type: 'Feature', properties: { id: 'Z2', name: 'Fallback', coastLine: [[11, 56], [11.2, 56.2]] }, geometry: null }
  ],
  coastalParts: { zones: { Z1: [
    { partId: 'a', geometry: { type: 'LineString', coordinates: [[10, 56], [10.05, 56.05]] } },
    { partId: 'b', geometry: { type: 'MultiLineString', coordinates: [[[10.05, 56.05], [10.1, 56.1]], [[10.1, 56.1], [10.2, 56.2]]] } }
  ] } }
};

const projected = projectPublicCoastlines(source);
assert.equal(projected.features.length, 2, 'Hovedzoneantallet må ikke ændres');
assert.equal(projected.features[0].properties.id, 'Z1');
assert.equal(projected.features[0].properties.publicCoastLines.length, 3, 'Alle præcise fragmenter skal samles under hovedzonen');
assert.equal(projected.features[0].properties.name, 'Hovedzone', 'Underdele må ikke erstatte hovedzonens navn');
assert.equal(projected.features[1].properties.publicCoastLines, undefined, 'Zone uden præcise dele skal bevare gammel kyst som fallback');
assert.equal(source.features[0].properties.publicCoastLines, undefined, 'Kildesamlingen må ikke muteres');

const liveParts = JSON.parse(await fs.readFile('data/live/coastal-parts-v2.json', 'utf8'));
const liveFeatures = Object.keys(liveParts.zones).map(id => ({type:'Feature',properties:{id,name:id}}));
const liveProjected = projectPublicCoastlines({type:'FeatureCollection',features:liveFeatures,coastalParts:liveParts});
assert.equal(liveProjected.features.filter(feature => feature.properties.publicCoastLines?.length).length, liveParts.zoneCount);
assert.equal(liveParts.partCount, 643);
assert.equal(liveParts.zoneCount, 206);
assert.equal(liveProjected.features.reduce((sum,feature) => sum + (feature.properties.publicCoastLines?.length || 0),0), 2878);

console.log('Offentlig hovedzoneprojektion af præcise kystdele: bestået.');
