import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

const source = await fs.readFile('scripts/fetch-geodanmark-pilot.py', 'utf8');
const workflow = await fs.readFile('.github/workflows/update-and-deploy.yml', 'utf8');

for (const required of [
  'DATAFORDELER_API_KEY',
  'GetCapabilities',
  'GetFeature',
  'GeoDanmark Vektor WFS',
  'centralHydrationRequired',
  'FeatureType',
  '_current',
  'availableLayers',
  'required-layer-not-resolved',
  'startIndex',
  'sourceNumberMatched',
  'pageCount',
  'MAX_FEATURES_PER_LAYER_AREA',
  'not-exposed-by-source',
  'fetched-for-non-production-pilot'
]) assert.ok(source.includes(required), `GeoDanmark-fetch mangler ${required}`);

for (const forbidden of [
  'print(key)',
  'print(api_key',
  'apikey=',
  'apikey={',
  'DATAFORDELER_API_KEY='
]) assert.ok(!source.includes(forbidden), `GeoDanmark-fetch kan lække secret: ${forbidden}`);

assert.match(workflow, /geometry_v2_pilot:/);
assert.match(workflow, /DATAFORDELER_API_KEY:\s*\$\{\{ secrets\.DATAFORDELER_API_KEY \}\}/);
assert.match(workflow, /name: Run GeoDanmark geometry-v2 pilot/);
assert.match(workflow, /--exclude 'data\/geometry-v2\/'/);
assert.match(workflow, /--exclude '\.geometry-v2-work\/'/);
assert.match(workflow, /include-hidden-files:\s*true/);

const python = process.env.PYTHON || (process.platform === 'win32' ? 'python.exe' : 'python3');
const layerTest = spawnSync(python, ['-c', [
  "import runpy",
  "m=runpy.run_path('scripts/fetch-geodanmark-pilot.py')",
  "f=m['find_layer']",
  "assert f(['gdk:kyst_current'], 'Kyst') == 'gdk:kyst_current'",
  "assert f(['gdk:kyst_hist', 'gdk:kyst_current'], 'Kyst') == 'gdk:kyst_current'",
  "assert f(['gdk:Kyst'], 'Kyst') == 'gdk:Kyst'",
  "assert f(['gdk:kystbeskyttelse_current'], 'Kyst') is None",
].join(';')], { encoding: 'utf8' });
assert.equal(layerTest.status, 0, `GeoDanmark-lagmatch fejlede: ${layerTest.stderr || layerTest.error || 'ukendt fejl'}`);
console.log('GeoDanmark pilotfetch-kontrakt: bestået.');
