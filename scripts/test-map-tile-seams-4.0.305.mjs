import assert from 'node:assert/strict';
import fs from 'node:fs';

const style = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const mapView = fs.readFileSync(new URL('../js/map/map-view.js', import.meta.url), 'utf8');

const seamRule = style.match(/\.leaflet-tile-pane\s+\.leaflet-tile\[style\*="width: 256px"\]\s*\{([^}]*)\}/);
assert.ok(seamRule, 'Flisesømsrettelsen skal være begrænset til Leaflets raster-tile-pane.');
assert.match(seamRule[1], /width:\s*256\.5px\s*!important/, 'Rasterfliserne skal overlappe vandret med højst et halvt pixel.');
assert.match(seamRule[1], /height:\s*256\.5px\s*!important/, 'Rasterfliserne skal overlappe lodret med højst et halvt pixel.');
assert.match(seamRule[1], /mix-blend-mode:\s*normal/, 'Leaflets additive Chromium-fallback skal neutraliseres, når fliserne overlapper.');
assert.doesNotMatch(seamRule[0], /flow-arrow|zoneCoastPane|zoneBoundaryPane|svg|canvas/, 'Rettelsen må ikke ramme pile, zoner eller andre kortlag.');

assert.match(mapView, /L\.tileLayer\("https:\/\/tile\.openstreetmap\.org/, 'Standardkortet skal fortsat bruge det eksisterende OSM-tilelag.');
assert.match(mapView, /L\.tileLayer\("https:\/\/services\.arcgisonline\.com/, 'Satellitkortet skal fortsat bruge det eksisterende tilelag.');
assert.match(mapView, /const geometryLayer = L\.geoJSON/, 'Den eksisterende skjulte geometri skal være urørt.');
assert.match(mapView, /export function installFlowArrows/, 'Det eksisterende pilelag skal være urørt.');

console.log('Kortflisesømme: 0,5 px raster-overlap er isoleret fra zoner, geometri og pile.');
